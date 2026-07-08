"""Эффективные права тарифа.

Правило: если в таблице `tariffs` есть строка по тарифу (её правит админ) — берём её,
иначе — дефолты из plans.py. Через этот резолвер работают лимиты каналов, лимиты
лидов и доступ к аналитике, поэтому изменения тарифа админом применяются сразу.
"""
from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .models import Tariff
from .plans import PLAN_DEFS, Plan


@dataclass(frozen=True)
class Entitlements:
    title: str
    price_month: int | None
    trial_days: int
    max_channels: int | None
    max_leads_per_month: int | None
    analytics: bool
    manager_control: bool
    priority_support: bool
    onboarding: bool
    storage_months: int | None


def _from_default(plan: Plan) -> Entitlements:
    d = PLAN_DEFS[plan]
    return Entitlements(
        title=d.title, price_month=d.price_month, trial_days=d.trial_days,
        max_channels=d.max_channels, max_leads_per_month=d.max_leads_per_month,
        analytics=d.analytics, manager_control=d.manager_control,
        priority_support=d.priority_support, onboarding=d.onboarding,
        storage_months=d.storage_months,
    )


def _from_row(row: Tariff) -> Entitlements:
    return Entitlements(
        title=row.title, price_month=row.price_month, trial_days=row.trial_days,
        max_channels=row.max_channels, max_leads_per_month=row.max_leads_per_month,
        analytics=row.analytics, manager_control=row.manager_control,
        priority_support=row.priority_support, onboarding=row.onboarding,
        storage_months=row.storage_months,
    )


async def effective_entitlements(db: AsyncSession, plan: str) -> Entitlements:
    p = Plan(plan)
    result = await db.execute(select(Tariff).where(Tariff.plan == p.value))
    row = result.scalar_one_or_none()
    return _from_row(row) if row else _from_default(p)


async def all_effective(db: AsyncSession) -> dict[str, Entitlements]:
    return {p.value: await effective_entitlements(db, p.value) for p in Plan}
