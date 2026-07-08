"""Сидинг тарифов по умолчанию из plans.py в таблицу tariffs.

Используется CLI (`manage.py seed-tariffs`) и стартовым сидингом в main.py.
Идемпотентен: существующие тарифы не трогает.
"""
from sqlalchemy import select

from .database import SessionLocal
from .models import Tariff
from .plans import PLAN_DEFS


async def seed_tariffs() -> int:
    async with SessionLocal() as db:
        created = 0
        for plan, d in PLAN_DEFS.items():
            if await db.scalar(select(Tariff).where(Tariff.plan == plan.value)):
                continue
            db.add(Tariff(
                plan=plan.value, title=d.title, price_month=d.price_month,
                trial_days=d.trial_days, max_channels=d.max_channels,
                max_leads_per_month=d.max_leads_per_month, analytics=d.analytics,
                manager_control=d.manager_control, priority_support=d.priority_support,
                onboarding=d.onboarding, storage_months=d.storage_months,
            ))
            created += 1
        await db.commit()
        return created
