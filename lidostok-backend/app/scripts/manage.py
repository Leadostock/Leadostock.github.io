"""Управляющий CLI Лидостока — «настроить всё».

Запуск:  python -m app.scripts.manage <команда> [аргументы]

Команды:
  init-db                         создать все таблицы (быстрый старт без alembic)
  seed-tariffs                    засеять тарифы по умолчанию в таблицу tariffs
  create-admin <email> <пароль>   создать системного администратора (+ его тенант)
  set-webhook <channel_id>        сообщить Telegram адрес вебхука для канала
  info                            показать текущие настройки подключения

Рекомендуемый первый запуск (с Docker-базой из docker-compose):
  python -m app.scripts.manage init-db
  python -m app.scripts.manage seed-tariffs
  python -m app.scripts.manage create-admin admin@lidostok.ru СильныйПароль123
"""
import asyncio
import sys

from sqlalchemy import select

from ..config import settings
from ..database import SessionLocal, engine
from ..entitlements import effective_entitlements
from ..models import Base, Channel, Tariff, Tenant, User
from ..plans import PLAN_DEFS, Plan
from ..security import hash_password


async def init_db() -> None:
    """Создаёт все таблицы по моделям (альтернатива `alembic upgrade head`)."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("✓ Таблицы созданы.")


async def seed_tariffs_cmd() -> None:
    """Заносит тарифы по умолчанию (из plans.py) в таблицу tariffs, если их там нет."""
    from ..seed import seed_tariffs
    created = await seed_tariffs()
    print(f"✓ Тарифы засеяны (добавлено новых: {created}).")


async def create_admin(email: str, password: str) -> None:
    """Создаёт системного администратора и технический тенант для него."""
    async with SessionLocal() as db:
        exists = await db.scalar(select(User).where(User.email == email))
        if exists:
            print(f"✗ Пользователь {email} уже существует.")
            return
        tenant = Tenant(name="Администрация Лидосток", plan=Plan.ENTERPRISE.value)
        db.add(tenant)
        await db.flush()
        db.add(User(
            tenant_id=tenant.id, email=email, password_hash=hash_password(password),
            name="Администратор системы", role="owner", is_superadmin=True,
        ))
        await db.commit()
    print(f"✓ Суперадмин создан: {email}")


async def set_webhook(channel_id: str) -> None:
    """Регистрирует вебхук Telegram для канала (по его id)."""
    from ..channels.registry import get_provider

    async with SessionLocal() as db:
        channel = await db.get(Channel, channel_id)
        if channel is None:
            print("✗ Канал не найден.")
            return
        if channel.type != "telegram":
            print("✗ Установка вебхука поддержана только для Telegram.")
            return
        provider = get_provider(channel.type, channel.get_credentials())
        webhook_url = f"{settings.public_base_url}/api/webhooks/telegram/{channel.routing_key}"
        me = await provider.get_me()
        ok = await provider.set_webhook(webhook_url, secret_token=channel.get_credentials().get("webhook_secret"))
    print(f"  Бот: @{me.get('username')} (id {me.get('id')})")
    print(f"  Вебхук: {webhook_url}")
    print("✓ Вебхук установлен." if ok else "✗ Telegram не подтвердил установку.")


def info() -> None:
    print(f"  App:          {settings.app_name}")
    print(f"  DATABASE_URL: {settings.database_url}")
    print(f"  REDIS_URL:    {settings.redis_url}")
    print(f"  BASE_URL:     {settings.public_base_url}")
    print(f"  Ключ шифрования задан: {'да' if settings.credentials_encryption_key else 'НЕТ — задайте в .env'}")


def main() -> None:
    args = sys.argv[1:]
    if not args:
        print(__doc__)
        return
    cmd, rest = args[0], args[1:]
    if cmd == "init-db":
        asyncio.run(init_db())
    elif cmd == "seed-tariffs":
        asyncio.run(seed_tariffs_cmd())
    elif cmd == "create-admin":
        if len(rest) < 2:
            print("Использование: create-admin <email> <пароль>")
            return
        asyncio.run(create_admin(rest[0], rest[1]))
    elif cmd == "set-webhook":
        if len(rest) < 1:
            print("Использование: set-webhook <channel_id>")
            return
        asyncio.run(set_webhook(rest[0]))
    elif cmd == "info":
        info()
    else:
        print(f"Неизвестная команда: {cmd}")
        print(__doc__)


if __name__ == "__main__":
    main()
