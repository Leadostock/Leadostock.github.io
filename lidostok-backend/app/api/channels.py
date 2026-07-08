"""API управления каналами (для владельца/админа тенанта и админки «под ключ»).

Позволяет: создать канал, задать зашифрованные credentials, активировать
(для Telegram — установить вебхук), посмотреть список, вручную опросить почту
для теста. Учитывает лимит каналов по тарифу.
"""
import secrets
import uuid

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func, select

from ..config import settings
from ..channels.registry import get_provider
from ..deps import CurrentUser, DbSession, require_role, tenant_id_of
from ..models import Channel, ChannelStatus, ChannelType, Tenant, UserRole
from ..entitlements import effective_entitlements

router = APIRouter(prefix="/api/channels", tags=["channels"])

# Создавать/активировать каналы могут только владелец и админ тенанта
owner_or_admin = require_role(UserRole.OWNER, UserRole.ADMIN)


class ChannelCreate(BaseModel):
    type: ChannelType
    title: str = ""
    credentials: dict  # {bot_token:...} | {imap_host,login,password,...} | {group_id,secret_key,...}


class ChannelOut(BaseModel):
    id: str
    type: str
    title: str
    status: str
    webhook_url: str | None = None


def _webhook_url(channel: Channel) -> str | None:
    if channel.type == ChannelType.TELEGRAM:
        return f"{settings.public_base_url}/api/webhooks/telegram/{channel.routing_key}"
    if channel.type == ChannelType.VK:
        return f"{settings.public_base_url}/api/webhooks/vk/{channel.routing_key}"
    return None  # email принимается поллингом, вебхук не нужен


@router.get("", response_model=list[ChannelOut])
async def list_channels(user: CurrentUser, db: DbSession):
    result = await db.execute(select(Channel).where(Channel.tenant_id == tenant_id_of(user)))
    channels = result.scalars().all()
    return [
        ChannelOut(id=str(c.id), type=c.type, title=c.title, status=c.status, webhook_url=_webhook_url(c))
        for c in channels
    ]


@router.post("", response_model=ChannelOut, status_code=201)
async def create_channel(payload: ChannelCreate, user: CurrentUser, db: DbSession, _=Depends(owner_or_admin)):
    tenant = await db.get(Tenant, tenant_id_of(user))
    ent = await effective_entitlements(db, tenant.plan)

    # Лимит каналов по тарифу (Free = 2)
    if ent.max_channels is not None:
        count_result = await db.execute(
            select(func.count(Channel.id)).where(
                Channel.tenant_id == tenant.id, Channel.status != ChannelStatus.DISABLED
            )
        )
        active_count = int(count_result.scalar() or 0)
        if active_count >= ent.max_channels:
            raise HTTPException(
                status_code=402,
                detail=f"Достигнут лимит каналов для тарифа ({ent.max_channels}). Обновите тариф.",
            )

    channel = Channel(
        tenant_id=tenant.id,
        type=payload.type,
        title=payload.title or payload.type,
        status=ChannelStatus.PENDING,
        routing_key=secrets.token_urlsafe(24),
    )

    creds = dict(payload.credentials)
    # Для Telegram генерируем секрет вебхука, если не задан
    if payload.type == ChannelType.TELEGRAM and "webhook_secret" not in creds:
        creds["webhook_secret"] = secrets.token_urlsafe(24)
    channel.set_credentials(creds)

    db.add(channel)
    await db.commit()
    await db.refresh(channel)
    return ChannelOut(
        id=str(channel.id), type=channel.type, title=channel.title,
        status=channel.status, webhook_url=_webhook_url(channel),
    )


async def _owned_channel(db: DbSession, user, channel_id: uuid.UUID) -> Channel:
    result = await db.execute(
        select(Channel).where(Channel.id == channel_id, Channel.tenant_id == tenant_id_of(user))
    )
    channel = result.scalar_one_or_none()
    if channel is None:
        raise HTTPException(status_code=404, detail="Канал не найден")
    return channel


@router.post("/{channel_id}/activate", response_model=ChannelOut)
async def activate_channel(channel_id: uuid.UUID, user: CurrentUser, db: DbSession, _=Depends(owner_or_admin)):
    channel = await _owned_channel(db, user, channel_id)
    creds = channel.get_credentials()

    # Для Telegram при активации регистрируем вебхук в Telegram
    if channel.type == ChannelType.TELEGRAM:
        token = creds.get("bot_token")
        if not token:
            raise HTTPException(status_code=400, detail="Не задан bot_token")
        url = _webhook_url(channel)
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(
                f"https://api.telegram.org/bot{token}/setWebhook",
                json={"url": url, "secret_token": creds.get("webhook_secret")},
            )
        if resp.status_code != 200 or not resp.json().get("ok"):
            raise HTTPException(status_code=400, detail=f"Telegram не принял вебхук: {resp.text}")

    channel.status = ChannelStatus.ACTIVE
    await db.commit()
    await db.refresh(channel)
    return ChannelOut(
        id=str(channel.id), type=channel.type, title=channel.title,
        status=channel.status, webhook_url=_webhook_url(channel),
    )


@router.post("/{channel_id}/poll")
async def poll_now(channel_id: uuid.UUID, user: CurrentUser, db: DbSession, _=Depends(owner_or_admin)):
    """Ручной опрос почтового канала — для проверки подключения без ожидания cron."""
    from arq import create_pool
    from arq.connections import RedisSettings

    channel = await _owned_channel(db, user, channel_id)
    if channel.type != ChannelType.EMAIL:
        raise HTTPException(status_code=400, detail="Ручной опрос доступен только для email")

    provider = get_provider(channel.type, channel.get_credentials())
    try:
        new_state, payloads = await provider.poll(channel.state)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Ошибка подключения к ящику: {exc}")

    redis = await create_pool(RedisSettings.from_dsn(settings.redis_url))
    for payload in payloads:
        await redis.enqueue_job("handle_incoming", str(channel.id), payload)
    await redis.close()

    channel.state = new_state
    await db.commit()
    return {"ok": True, "new_messages": len(payloads)}
