"""Фабрика провайдеров: по типу канала возвращает нужную реализацию.

Добавление нового канала = одна строка в PROVIDERS + класс-реализация.
"""
from ..models.channel import ChannelType
from .base import ChannelProvider, NormalizedMessage
from .email_imap import EmailImapProvider
from .telegram import TelegramProvider


class VkProvider(ChannelProvider):
    """Скелет VK Callback API. Событие message_new приходит на вебхук.

    credentials: {"group_id": ..., "confirmation_token": ..., "secret_key": ..., "access_token": ...}
    """

    def parse_incoming(self, raw_payload: dict) -> list[NormalizedMessage]:
        if raw_payload.get("type") != "message_new":
            return []
        obj = raw_payload.get("object", {}).get("message", {})
        from_id = obj.get("from_id")
        text = obj.get("text", "")
        return [
            NormalizedMessage(
                external_contact_id=str(from_id),
                contact_name=f"VK id{from_id}",  # имя дотягивается через users.get (TODO)
                text=text,
                external_message_id=str(obj.get("id")),
                source_hint="VK",
            )
        ]

    async def send_message(self, external_contact_id: str, text: str) -> str | None:
        raise NotImplementedError("Отправка VK — Фаза 2")


PROVIDERS: dict[str, type[ChannelProvider]] = {
    ChannelType.TELEGRAM: TelegramProvider,
    ChannelType.EMAIL: EmailImapProvider,  # позже можно выбирать IMAP vs OAuth по credentials
    ChannelType.VK: VkProvider,
    # ChannelType.WHATSAPP: WhatsAppProvider,   # Фаза 2
    # ChannelType.INSTAGRAM: InstagramProvider, # Фаза 3
}


def get_provider(channel_type: str, credentials: dict) -> ChannelProvider:
    provider_cls = PROVIDERS.get(channel_type)
    if not provider_cls:
        raise ValueError(f"Нет провайдера для канала: {channel_type}")
    return provider_cls(credentials)
