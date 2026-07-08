"""Провайдер Telegram (Bot API).

Приём: Telegram шлёт Update на наш вебхук. Мы достаём из него сообщение и
приводим к NormalizedMessage. Секретность вебхука обеспечивается
заголовком X-Telegram-Bot-Api-Secret-Token (проверяется на уровне API).
"""
import httpx

from .base import ChannelProvider, NormalizedMessage

TELEGRAM_API = "https://api.telegram.org"


class TelegramProvider(ChannelProvider):
    def parse_incoming(self, raw_payload: dict) -> list[NormalizedMessage]:
        message = raw_payload.get("message") or raw_payload.get("edited_message")
        if not message:
            return []

        chat = message.get("chat", {})
        from_user = message.get("from", {})
        text = message.get("text", "") or message.get("caption", "")

        name_parts = [from_user.get("first_name", ""), from_user.get("last_name", "")]
        contact_name = " ".join(p for p in name_parts if p).strip()
        username = from_user.get("username")

        # Вложения: сохраняем ссылки/идентификаторы. Реальную выкачку файла
        # и загрузку в S3 делаем в воркере (здесь только метаданные).
        attachments: list[dict] = []
        if "photo" in message:
            largest = message["photo"][-1]
            attachments.append({"type": "photo", "file_id": largest.get("file_id")})
        if "document" in message:
            doc = message["document"]
            attachments.append({"type": "document", "file_id": doc.get("file_id"), "name": doc.get("file_name")})

        source_hint = ""
        if username:
            source_hint = f"@{username}"

        return [
            NormalizedMessage(
                external_contact_id=str(chat.get("id")),
                contact_name=contact_name or (f"@{username}" if username else "Клиент"),
                text=text,
                external_message_id=str(message.get("message_id")),
                attachments=attachments,
                source_hint=source_hint,
            )
        ]

    async def send_message(self, external_contact_id: str, text: str) -> str | None:
        # Фаза 2. Токен бота лежит в self.credentials["bot_token"].
        token = self.credentials.get("bot_token")
        if not token:
            raise RuntimeError("Не задан bot_token для Telegram-канала")
        url = f"{TELEGRAM_API}/bot{token}/sendMessage"
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(url, json={"chat_id": external_contact_id, "text": text})
            resp.raise_for_status()
            data = resp.json()
            return str(data.get("result", {}).get("message_id"))

    # --- Подключение бота ---
    async def get_me(self) -> dict:
        """Проверяет токен бота: возвращает данные бота (id, username) или бросает ошибку."""
        token = self.credentials.get("bot_token")
        if not token:
            raise RuntimeError("Не задан bot_token для Telegram-канала")
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(f"{TELEGRAM_API}/bot{token}/getMe")
            resp.raise_for_status()
            return resp.json().get("result", {})

    async def set_webhook(self, webhook_url: str, secret_token: str | None = None) -> bool:
        """Говорит Telegram слать апдейты на наш вебхук. Вызывается при активации канала."""
        token = self.credentials.get("bot_token")
        if not token:
            raise RuntimeError("Не задан bot_token для Telegram-канала")
        payload: dict = {"url": webhook_url, "allowed_updates": ["message", "edited_message"]}
        if secret_token:
            payload["secret_token"] = secret_token
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(f"{TELEGRAM_API}/bot{token}/setWebhook", json=payload)
            resp.raise_for_status()
            return bool(resp.json().get("ok"))

    async def delete_webhook(self) -> bool:
        token = self.credentials.get("bot_token")
        if not token:
            raise RuntimeError("Не задан bot_token для Telegram-канала")
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(f"{TELEGRAM_API}/bot{token}/deleteWebhook")
            resp.raise_for_status()
            return bool(resp.json().get("ok"))
