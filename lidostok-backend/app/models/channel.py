"""Подключённый канал клиента (Telegram / Email / VK / ...)."""
import uuid
from enum import StrEnum
from typing import Any

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from ..crypto import decrypt_json, encrypt_json
from .base import Base, TimestampMixin, UUIDMixin


class ChannelType(StrEnum):
    TELEGRAM = "telegram"
    EMAIL = "email"          # реализация: IMAP сейчас, OAuth-провайдеры позже
    VK = "vk"
    WHATSAPP = "whatsapp"    # Фаза 2
    INSTAGRAM = "instagram"  # Фаза 3


class ChannelStatus(StrEnum):
    PENDING = "pending"      # заведён, но ещё не подключён
    ACTIVE = "active"
    ERROR = "error"
    DISABLED = "disabled"


class Channel(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "channels"

    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id", ondelete="CASCADE"), index=True)
    type: Mapped[str] = mapped_column(String(32))
    title: Mapped[str] = mapped_column(String(255), default="")
    status: Mapped[str] = mapped_column(String(32), default=ChannelStatus.PENDING)

    # Секретный ключ маршрутизации вебхука: по нему входящее сообщение
    # сопоставляется с нужным тенантом и каналом. Уникален, невосстановим из URL.
    routing_key: Mapped[str] = mapped_column(String(64), unique=True, index=True)

    # Credentials канала (токен бота, пароль IMAP, ключ VK) — ТОЛЬКО зашифрованно.
    credentials_encrypted: Mapped[str] = mapped_column(Text, default="")

    # Служебное состояние провайдера (например, last_uid для IMAP-поллинга почты).
    state: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    # --- Удобные обёртки над шифрованием ---
    def set_credentials(self, data: dict[str, Any]) -> None:
        self.credentials_encrypted = encrypt_json(data)

    def get_credentials(self) -> dict[str, Any]:
        if not self.credentials_encrypted:
            return {}
        return decrypt_json(self.credentials_encrypted)
