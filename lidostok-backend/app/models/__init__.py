"""Экспорт всех моделей (нужно, чтобы Alembic видел метаданные)."""
from .base import Base
from .channel import Channel, ChannelStatus, ChannelType
from .conversation import (
    Conversation,
    ConversationStatus,
    Event,
    Lead,
    LeadStatus,
    Message,
    MessageDirection,
)
from .tariff import Tariff
from .tenant import Tenant, User, UserRole

__all__ = [
    "Base",
    "Tenant",
    "Tariff",
    "User",
    "UserRole",
    "Channel",
    "ChannelType",
    "ChannelStatus",
    "Conversation",
    "ConversationStatus",
    "Message",
    "MessageDirection",
    "Lead",
    "LeadStatus",
    "Event",
]
