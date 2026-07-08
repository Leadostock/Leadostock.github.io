"""API тарифов.

- Публичный GET /api/tariffs — матрица тарифов + скидки + Meta-надбавка + цены
  конструктора (для лендинга и калькулятора).
- Админский GET/PATCH /api/admin/tariffs — просмотр и правка тарифов (суперадмин).
  PATCH делает upsert строки в таблице `tariffs`, изменения применяются сразу.
"""
from pydantic import BaseModel
from sqlalchemy import select

from .. import plans
from ..deps import DbSession, SuperAdmin
from ..entitlements import all_effective, effective_entitlements
from ..models import Tariff
from ..plans import Plan

from fastapi import APIRouter, HTTPException

public_router = APIRouter(prefix="/api/tariffs", tags=["tariffs"])
admin_router = APIRouter(prefix="/api/admin/tariffs", tags=["admin"])


def _ent_dict(plan_key: str, e) -> dict:
    return {
        "plan": plan_key, "title": e.title, "price_month": e.price_month,
        "trial_days": e.trial_days, "max_channels": e.max_channels,
        "max_leads_per_month": e.max_leads_per_month, "analytics": e.analytics,
        "manager_control": e.manager_control, "priority_support": e.priority_support,
        "onboarding": e.onboarding, "storage_months": e.storage_months,
    }


@public_router.get("")
async def public_tariffs(db: DbSession):
    effective = await all_effective(db)
    return {
        "plans": [_ent_dict(k, e) for k, e in effective.items()],
        "period_discounts": plans.PERIOD_DISCOUNTS,
        "meta_addon": plans.META_ADDON,
        "constructor": plans.CONSTRUCTOR_PRICES,
    }


class TariffUpdate(BaseModel):
    title: str | None = None
    price_month: int | None = None
    trial_days: int | None = None
    max_channels: int | None = None
    max_leads_per_month: int | None = None
    analytics: bool | None = None
    manager_control: bool | None = None
    priority_support: bool | None = None
    onboarding: bool | None = None
    storage_months: int | None = None


@admin_router.get("")
async def admin_list(admin: SuperAdmin, db: DbSession):
    effective = await all_effective(db)
    return [_ent_dict(k, e) for k, e in effective.items()]


@admin_router.patch("/{plan}")
async def admin_update(plan: str, payload: TariffUpdate, admin: SuperAdmin, db: DbSession):
    try:
        p = Plan(plan)
    except ValueError:
        raise HTTPException(status_code=404, detail="Неизвестный тариф")

    result = await db.execute(select(Tariff).where(Tariff.plan == p.value))
    row = result.scalar_one_or_none()

    if row is None:
        # первая правка — создаём строку из дефолтов, затем накатываем изменения
        base = await effective_entitlements(db, p.value)
        row = Tariff(
            plan=p.value, title=base.title, price_month=base.price_month,
            trial_days=base.trial_days, max_channels=base.max_channels,
            max_leads_per_month=base.max_leads_per_month, analytics=base.analytics,
            manager_control=base.manager_control, priority_support=base.priority_support,
            onboarding=base.onboarding, storage_months=base.storage_months,
        )
        db.add(row)

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(row, field, value)

    await db.commit()
    await db.refresh(row)
    return _ent_dict(p.value, await effective_entitlements(db, p.value))
