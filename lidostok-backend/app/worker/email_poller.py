"""Периодический опрос активных email-каналов (cron-задача arq).

Каждый запуск: пройтись по активным каналам типа email, забрать новые письма,
для каждого поставить задачу handle_incoming (тот же путь обработки, что и вебхуки).
Позиция чтения (last_uid) сохраняется в Channel.state.
"""
from sqlalchemy import select

from ..channels.registry import get_provider
from ..database import SessionLocal
from ..models import Channel, ChannelStatus, ChannelType


async def poll_email_channels(ctx: dict) -> None:
    redis = ctx["redis"]  # arq кладёт сюда пул Redis для постановки задач
    async with SessionLocal() as db:
        result = await db.execute(
            select(Channel).where(
                Channel.type == ChannelType.EMAIL,
                Channel.status == ChannelStatus.ACTIVE,
            )
        )
        channels = result.scalars().all()

        for channel in channels:
            provider = get_provider(channel.type, channel.get_credentials())
            try:
                new_state, payloads = await provider.poll(channel.state)
            except Exception as exc:  # ошибка подключения к ящику — помечаем канал
                channel.status = ChannelStatus.ERROR
                channel.state = {**(channel.state or {}), "last_error": str(exc)[:300]}
                await db.commit()
                continue

            for payload in payloads:
                await redis.enqueue_job("handle_incoming", str(channel.id), payload)

            channel.state = new_state  # переприсваиваем, чтобы SQLAlchemy заметил изменение
            await db.commit()
