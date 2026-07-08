"""Приём входящих событий каналов (вебхуки).

Схема безопасности:
- В URL передаётся routing_key канала (секретный, не угадывается).
- Дополнительно Telegram шлёт secret_token в заголовке — сверяем.
- Отвечаем быстро (2xx), тяжёлую обработку кладём в очередь arq.
"""
from arq import create_pool
from arq.connections import RedisSettings
from fastapi import APIRouter, Header, HTTPException, Request
from sqlalchemy import select

from ..config import settings
from ..deps import DbSession
from ..models import Channel, ChannelStatus, ChannelType

router = APIRouter(prefix="/api/webhooks", tags=["webhooks"])


async def _enqueue(channel_id: str, raw_payload: dict) -> None:
    redis = await create_pool(RedisSettings.from_dsn(settings.redis_url))
    await redis.enqueue_job("handle_incoming", channel_id, raw_payload)
    await redis.close()


async def _find_active_channel(db: DbSession, routing_key: str, channel_type: str) -> Channel:
    result = await db.execute(
        select(Channel).where(Channel.routing_key == routing_key, Channel.type == channel_type)
    )
    channel = result.scalar_one_or_none()
    if channel is None or channel.status != ChannelStatus.ACTIVE:
        raise HTTPException(status_code=404, detail="Канал не найден или неактивен")
    return channel


@router.post("/telegram/{routing_key}")
async def telegram_webhook(
    routing_key: str,
    request: Request,
    db: DbSession,
    x_telegram_bot_api_secret_token: str | None = Header(default=None),
):
    channel = await _find_active_channel(db, routing_key, ChannelType.TELEGRAM)

    # Проверка секретного токена вебхука (защита от подделки запросов)
    expected = channel.get_credentials().get("webhook_secret")
    if expected and x_telegram_bot_api_secret_token != expected:
        raise HTTPException(status_code=403, detail="Неверный secret token")

    payload = await request.json()
    await _enqueue(str(channel.id), payload)
    return {"ok": True}


@router.post("/vk/{routing_key}")
async def vk_webhook(routing_key: str, request: Request, db: DbSession):
    channel = await _find_active_channel(db, routing_key, ChannelType.VK)
    payload = await request.json()
    creds = channel.get_credentials()

    # VK требует подтверждения адреса строкой confirmation_token
    if payload.get("type") == "confirmation":
        return creds.get("confirmation_token", "")

    # Проверка секретного ключа сообщества
    if creds.get("secret_key") and payload.get("secret") != creds["secret_key"]:
        raise HTTPException(status_code=403, detail="Неверный secret")

    await _enqueue(str(channel.id), payload)
    return "ok"
