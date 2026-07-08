"""Абстракция канала.

Каждый канал (Telegram, Email-IMAP, Email-OAuth, VK, WhatsApp, ...) реализует
общий интерфейс и умеет превращать своё «сырое» входящее событие в единый
NormalizedMessage. Благодаря этому вся остальная система (очередь, воркер,
инбокс, аналитика) не знает деталей конкретного канала.

Именно это делает переход Email IMAP -> Email OAuth дешёвым: OAuth — это просто
ещё одна реализация EmailProvider, а нормализованный формат и обработка не меняются.
"""
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime, timezone


@dataclass
class NormalizedMessage:
    """Единый внутренний формат входящего сообщения из любого канала."""
    external_contact_id: str          # id отправителя во внешней системе
    contact_name: str                 # отображаемое имя
    text: str                         # текст сообщения
    external_message_id: str | None = None
    attachments: list[dict] = field(default_factory=list)  # [{type,url,name}, ...]
    source_hint: str = ""             # напр. «реклама "Скидка 20%"», UTM, тема письма
    received_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


class ChannelProvider(ABC):
    """Базовый класс провайдера канала.

    credentials — уже расшифрованный словарь (из Channel.get_credentials()).
    """

    def __init__(self, credentials: dict):
        self.credentials = credentials

    @abstractmethod
    def parse_incoming(self, raw_payload: dict) -> list[NormalizedMessage]:
        """Превращает сырое событие (тело вебхука / письмо) в нормализованные сообщения.

        Возвращает список, потому что одно событие иногда содержит несколько
        сообщений (например, пачка новых писем при опросе IMAP).
        """
        raise NotImplementedError

    @abstractmethod
    async def send_message(self, external_contact_id: str, text: str) -> str | None:
        """Отправка ответа обратно в канал (Фаза 2). Возвращает external_message_id.

        В MVP не используется — приём важнее. Реализации могут пока бросать
        NotImplementedError.
        """
        raise NotImplementedError
