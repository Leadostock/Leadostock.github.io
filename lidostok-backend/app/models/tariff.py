"""Редактируемые тарифы (переопределяют дефолты из plans.py).

Одна строка = один тариф. Если строки нет — используются значения из кода.
Админ правит эти строки через панель (/api/admin/tariffs), изменения применяются
сразу, без правки кода и передеплоя.
"""
from sqlalchemy import Boolean, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base, TimestampMixin, UUIDMixin


class Tariff(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "tariffs"

    plan: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    title: Mapped[str] = mapped_column(String(64))
    price_month: Mapped[int | None] = mapped_column(Integer, nullable=True)   # None = по договору
    trial_days: Mapped[int] = mapped_column(Integer, default=0)
    max_channels: Mapped[int | None] = mapped_column(Integer, nullable=True)  # None = без лимита
    max_leads_per_month: Mapped[int | None] = mapped_column(Integer, nullable=True)
    analytics: Mapped[bool] = mapped_column(Boolean, default=False)
    manager_control: Mapped[bool] = mapped_column(Boolean, default=False)
    priority_support: Mapped[bool] = mapped_column(Boolean, default=False)
    onboarding: Mapped[bool] = mapped_column(Boolean, default=True)
    storage_months: Mapped[int | None] = mapped_column(Integer, nullable=True)
