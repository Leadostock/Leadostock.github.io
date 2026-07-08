"""Обработка входящего сообщения: upsert диалога -> сохранение сообщения ->
создание/обновление карточки лида -> запись события аналитики.

Эта функция вызывается из очереди (arq), а не из вебхука напрямую — чтобы
вебхук отвечал каналу мгновенно.
"""
import uuid
from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..channels.registry import get_provider
from ..models import (
    Channel,
    Conversation,
    ConversationStatus,
    Event,
    Lead,
    Message,
    MessageDirection,
    Tenant,
)
from ..entitlements import effective_entitlements


async def _leads_this_month(db: AsyncSession, tenant_id: uuid.UUID) -> int:
    start = datetime.now(timezone.utc).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    result = await db.execute(
        select(func.count(Lead.id)).where(Lead.tenant_id == tenant_id, Lead.created_at >= start)
    )
    return int(result.scalar() or 0)


async def process_incoming(db: AsyncSession, channel_id: uuid.UUID, raw_payload: dict) -> None:
    channel = await db.get(Channel, channel_id)
    if channel is None:
        return

    provider = get_provider(channel.type, channel.get_credentials())
    normalized_messages = provider.parse_incoming(raw_payload)

    for nm in normalized_messages:
        # 1. Найти или создать диалог (idempotent по паре канал+контакт)
        conv = await _get_or_create_conversation(db, channel, nm)

        # 2. Идемпотентно сохранить сообщение
        if nm.external_message_id:
            exists = await db.execute(
                select(Message.id).where(
                    Message.channel_id == channel.id,
                    Message.external_message_id == nm.external_message_id,
                )
            )
            if exists.scalar_one_or_none():
                continue  # это сообщение уже обработано (повторная доставка)

        message = Message(
            conversation_id=conv.id,
            channel_id=channel.id,
            direction=MessageDirection.IN,
            text=nm.text,
            attachments=nm.attachments or None,
            external_message_id=nm.external_message_id,
        )
        db.add(message)

        now = datetime.now(timezone.utc)
        if conv.first_message_at is None:
            conv.first_message_at = now
        conv.last_message_at = now

        # 3. Создать карточку лида (если её ещё нет) с учётом лимита тарифа
        await _maybe_create_lead(db, channel.tenant_id, conv, nm)

    await db.commit()


async def _get_or_create_conversation(db: AsyncSession, channel: Channel, nm) -> Conversation:
    result = await db.execute(
        select(Conversation).where(
            Conversation.channel_id == channel.id,
            Conversation.external_contact_id == nm.external_contact_id,
        )
    )
    conv = result.scalar_one_or_none()
    if conv:
        return conv

    conv = Conversation(
        tenant_id=channel.tenant_id,
        channel_id=channel.id,
        external_contact_id=nm.external_contact_id,
        contact_name=nm.contact_name,
        status=ConversationStatus.NEW,
    )
    db.add(conv)
    await db.flush()  # чтобы получить conv.id
    return conv


async def _maybe_create_lead(db: AsyncSession, tenant_id: uuid.UUID, conv: Conversation, nm) -> None:
    # У диалога одна карточка лида — не плодим дубли
    existing = await db.execute(select(Lead.id).where(Lead.conversation_id == conv.id))
    if existing.scalar_one_or_none():
        return

    tenant = await db.get(Tenant, tenant_id)
    ent = await effective_entitlements(db, tenant.plan)

    # Ограничение Free-тарифа: не больше N лидов в месяц
    if ent.max_leads_per_month is not None:
        used = await _leads_this_month(db, tenant_id)
        if used >= ent.max_leads_per_month:
            # Лимит исчерпан. Сообщение сохранили, но карточку не создаём.
            db.add(Event(tenant_id=tenant_id, type="lead_limit_reached", payload={"limit": ent.max_leads_per_month}))
            return

    lead = Lead(
        tenant_id=tenant_id,
        conversation_id=conv.id,
        who=nm.contact_name,
        source=nm.source_hint,
        want=nm.text[:500],
        contact=nm.source_hint,
    )
    db.add(lead)
    db.add(Event(tenant_id=tenant_id, type="lead_created", payload={"conversation_id": str(conv.id)}))
