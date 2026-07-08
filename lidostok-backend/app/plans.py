"""Тарифы Лидостока: матрица, цены, скидки, надбавки и цены конструктора.

Здесь — ДЕФОЛТНЫЕ значения (в коде). При работе приложение читает эффективные
значения через app/entitlements.py: если в таблице БД `tariffs` есть строка по
тарифу, берутся её значения (их правит админ через панель), иначе — эти дефолты.

Тарифы:
- FREE       — пробный, 14 дней. 2 канала, 250 лидов/мес. Потом оплата или блок.
- BUSINESS   — «Бизнес», 2 990 ₽/мес. 2 канала, 1 000 лидов/мес.
- PREMIUM    — «Премиум», 7 990 ₽/мес. 7 каналов, 3 000 лидов/мес, аналитика, контроль менеджеров.
- ENTERPRISE — «Корпоративный», по договору. Каналы и лиды без лимита, приоритетная поддержка.

Подключение «под ключ» входит во ВСЕ тарифы — это наше главное преимущество.
"""
from dataclasses import dataclass
from enum import StrEnum

UNLIMITED = None  # None = без ограничения


class Plan(StrEnum):
    FREE = "free"
    BUSINESS = "business"
    PREMIUM = "premium"
    ENTERPRISE = "enterprise"


@dataclass(frozen=True)
class PlanDef:
    key: str
    title: str
    price_month: int | None           # None = по договору
    trial_days: int                   # 0 = не пробный
    max_channels: int | None          # None = без лимита
    max_leads_per_month: int | None   # None = без лимита
    analytics: bool                   # аналитика и воронка
    manager_control: bool             # контроль менеджеров
    priority_support: bool
    onboarding: bool                  # подключение «под ключ»
    storage_months: int | None        # хранение переписок; None = без лимита


PLAN_DEFS: dict[Plan, PlanDef] = {
    Plan.FREE: PlanDef(
        key="free", title="Бесплатный", price_month=0, trial_days=14,
        max_channels=2, max_leads_per_month=250,
        analytics=False, manager_control=False, priority_support=False,
        onboarding=True, storage_months=3,
    ),
    Plan.BUSINESS: PlanDef(
        key="business", title="Бизнес", price_month=2990, trial_days=0,
        max_channels=2, max_leads_per_month=1000,
        analytics=False, manager_control=False, priority_support=False,
        onboarding=True, storage_months=3,
    ),
    Plan.PREMIUM: PlanDef(
        key="premium", title="Премиум", price_month=7990, trial_days=0,
        max_channels=7, max_leads_per_month=3000,
        analytics=True, manager_control=True, priority_support=False,
        onboarding=True, storage_months=12,
    ),
    Plan.ENTERPRISE: PlanDef(
        key="enterprise", title="Корпоративный", price_month=None, trial_days=0,
        max_channels=UNLIMITED, max_leads_per_month=UNLIMITED,
        analytics=True, manager_control=True, priority_support=True,
        onboarding=True, storage_months=UNLIMITED,
    ),
}

# Скидки за период оплаты (доля). Применяются к Бизнесу и Премиуму.
PERIOD_DISCOUNTS: dict[int, float] = {1: 0.0, 3: 0.10, 6: 0.15, 12: 0.30}

# Надбавка за Meta-каналы (Instagram / WhatsApp) — отдельный блок под тарифами.
# addon_month — как добавка к действующему тарифу; standalone_month — только Meta.
META_ADDON = {"addon_month": 500, "standalone_month": 1990}  # standalone уточнить

# Цены конструктора подписки (от 3 000 ₽). Всё в ₽/мес, кроме onboarding (разово).
CONSTRUCTOR_PRICES = {
    "base_month": 3000,          # стартовый пакет (уровень Бизнес: 2 канала, инбокс)
    "extra_channel": 1000,       # каждый дополнительный канал
    "meta_channel": 500,         # надбавка за Meta-канал (Instagram/WhatsApp)
    "leads_package": 500,        # за пакет лидов сверх базового
    "analytics": 1000,           # модуль «Аналитика и воронка»
    "manager_control": 500,      # контроль менеджеров
    "storage_months": {1: 0, 3: 500, 6: 1000, 12: 1500},
    "priority_support": 500,     # email — бесплатно, приоритет — доплата
    "crm_integration": 0,        # входит без доплаты
    "onboarding": 2000,          # настройка «под ключ» (разовый платёж)
}


def entitlements_for(plan) -> PlanDef:
    """Дефолтные права по тарифу (из кода). Для эффективных — app/entitlements.py."""
    return PLAN_DEFS[Plan(plan)]


def price_for(plan, months: int = 1) -> int | None:
    """Итоговая цена за период с учётом скидки. None = по договору."""
    pd = PLAN_DEFS[Plan(plan)]
    if pd.price_month is None:
        return None
    discount = PERIOD_DISCOUNTS.get(months, 0.0)
    return round(pd.price_month * months * (1 - discount))
