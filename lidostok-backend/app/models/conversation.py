"""Диалоги, сообщения, карточки лидов и события аналитики."""
import uuid
from datetime import datetime
from enum import StrEnum

from sqlalchemy import DateTime, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base, TimestampMixin, UUIDMixin


class ConversationStatus(StrEnum):
    NEW = "new"
    IN_PROGRESS = "in_progress"
    DONE = "done"


class Conversation(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "conversations"
    # Один диалог на пару (канал, внешний контакт)
    __table_args__ = (UniqueConstraint("channel_id", "external_contact_id", name="uq_conv_channel_contact"),)

    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id", ondelete="CASCADE"), index=True)
    channel_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("channels.id", ondelete="CASCADE"), index=True)

    external_contact_id: Mapped[str] = mapped_column(String(255), index=True)
    contact_name: Mapped[str] = mapped_column(String(255), default="")

    status: Mapped[str] = mapped_column(String(32), default=ConversationStatus.NEW)
    assigned_manager_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    first_message_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_message_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    # Момент первого ответа менеджера — нужен для метрики «время первого ответа»
    first_response_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class MessageDirection(StrEnum):
    IN = "in"    # от клиента
    OUT = "out"  # от менеджера (Фаза 2)


class Message(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "messages"
    __table_args__ = (
        # Идемпотентность: одно и то же внешнее сообщение не создаёт дубли
        UniqueConstraint("channel_id", "external_message_id", name="uq_msg_channel_external"),
    )

    conversation_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("conversations.id", ondelete="CASCADE"), index=True)
    channel_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("channels.id", ondelete="CASCADE"), index=True)

    direction: Mapped[str] = mapped_column(String(8), default=MessageDirection.IN)
    text: Mapped[str] = mapped_column(Text, default="")
    attachments: Mapped[list | None] = mapped_column(JSONB, nullable=True)  # список ссылок на файлы в S3
    external_message_id: Mapped[str | None] = mapped_column(String(255), nullable=True)


class LeadStatus(StrEnum):
    NEW = "new"
    QUALIFIED = "qualified"
    REJECTED = "rejected"


class Lead(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "leads"

    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id", ondelete="CASCADE"), index=True)
    conversation_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("conversations.id", ondelete="CASCADE"), index=True)

    # Структурированная карточка: Кто / Откуда / Чего хочет / Контакт
    who: Mapped[str] = mapped_column(String(255), default="")
    source: Mapped[str] = mapped_column(String(255), default="")
    want: Mapped[str] = mapped_column(Text, default="")
    contact: Mapped[str] = mapped_column(String(255), default="")

    status: Mapped[str] = mapped_column(String(32), default=LeadStatus.NEW)


class Event(Base, UUIDMixin, TimestampMixin):
    """Сырьё для аналитики (лид создан, назначен менеджер, дан первый ответ и т.д.)."""
    __tablename__ = "events"

    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id", ondelete="CASCADE"), index=True)
    type: Mapped[str] = mapped_column(String(64), index=True)
    payload: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
