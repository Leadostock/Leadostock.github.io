"""Arq-воркер: обрабатывает задачи из очереди Redis + периодический опрос почты.

Запуск:  arq app.worker.arq_worker.WorkerSettings
"""
import uuid

from arq import cron
from arq.connections import RedisSettings

from ..config import settings
from ..database import SessionLocal
from .email_poller import poll_email_channels
from .processing import process_incoming


async def handle_incoming(ctx: dict, channel_id: str, raw_payload: dict) -> None:
    """Задача очереди: обработать одно входящее событие канала."""
    async with SessionLocal() as db:
        await process_incoming(db, uuid.UUID(channel_id), raw_payload)


class WorkerSettings:
    functions = [handle_incoming]
    # Опрос почты в :00 и :30 каждой минуты (~каждые 30 секунд).
    cron_jobs = [cron(poll_email_channels, second={0, 30}, run_at_startup=True)]
    redis_settings = RedisSettings.from_dsn(settings.redis_url)
