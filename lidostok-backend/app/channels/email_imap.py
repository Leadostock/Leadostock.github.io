"""Провайдер Email через IMAP (приём) — полная реализация для MVP.

credentials:
    {
        "imap_host": "imap.yandex.ru",
        "imap_port": 993,
        "login": "sales@company.ru",
        "password": "пароль-приложения",   # НЕ основной пароль ящика!
        "smtp_host": "smtp.yandex.ru",      # для Фазы 2 (отправка)
        "smtp_port": 465
    }

Приём почты — это не вебхук, а периодический опрос (поллинг). Воркер по расписанию
(cron в arq) заходит в ящик по IMAP, забирает новые письма и приводит их к
NormalizedMessage. Позиция чтения (last_uid) хранится в Channel.state, поэтому:
  - старые письма при первом подключении НЕ импортируются как лиды;
  - одно письмо не обрабатывается дважды;
  - флаги в ящике клиента не трогаются (не помечаем письма прочитанными).

ПЕРЕХОД НА OAUTH ПОТОМ: создаётся EmailOAuthProvider(ChannelProvider) с той же
parse_incoming() и poll(), но авторизацией XOAUTH2 вместо пароля. Остальная
система (воркер, инбокс, модель Message) не меняется.
"""
import asyncio
import base64
import email
import imaplib
from email.header import decode_header
from email.utils import parseaddr

from .base import ChannelProvider, NormalizedMessage


def _decode(value: str | None) -> str:
    if not value:
        return ""
    out = []
    for text, enc in decode_header(value):
        if isinstance(text, bytes):
            out.append(text.decode(enc or "utf-8", errors="replace"))
        else:
            out.append(text)
    return "".join(out)


class EmailImapProvider(ChannelProvider):
    # -------- Приём: превращаем одно сырое письмо в нормализованное сообщение --------
    def parse_incoming(self, raw_payload: dict) -> list[NormalizedMessage]:
        raw = raw_payload.get("raw_email")
        if raw is None and raw_payload.get("raw_email_b64"):
            raw = base64.b64decode(raw_payload["raw_email_b64"])
        if not raw:
            return []
        if isinstance(raw, str):
            raw = raw.encode("utf-8", errors="replace")

        msg = email.message_from_bytes(raw)
        from_name, from_addr = parseaddr(msg.get("From", ""))
        subject = _decode(msg.get("Subject"))
        body = self._extract_body(msg)

        return [
            NormalizedMessage(
                external_contact_id=(from_addr or "unknown").lower(),
                contact_name=_decode(from_name) or from_addr or "Клиент",
                text=(f"Тема: {subject}\n\n{body}".strip() if subject else body),
                external_message_id=msg.get("Message-ID"),
                source_hint=(f"Email · тема «{subject}»" if subject else "Email"),
            )
        ]

    @staticmethod
    def _extract_body(msg) -> str:
        if msg.is_multipart():
            for part in msg.walk():
                disp = str(part.get("Content-Disposition", ""))
                if part.get_content_type() == "text/plain" and "attachment" not in disp:
                    payload = part.get_payload(decode=True)
                    if payload:
                        charset = part.get_content_charset() or "utf-8"
                        return payload.decode(charset, errors="replace").strip()
            # если plain нет — берём первый text/html как есть (грубо)
            for part in msg.walk():
                if part.get_content_type() == "text/html":
                    payload = part.get_payload(decode=True)
                    if payload:
                        charset = part.get_content_charset() or "utf-8"
                        return payload.decode(charset, errors="replace").strip()
            return ""
        payload = msg.get_payload(decode=True)
        if payload:
            charset = msg.get_content_charset() or "utf-8"
            return payload.decode(charset, errors="replace").strip()
        return ""

    # -------- Приём: опрос ящика по IMAP --------
    async def poll(self, state: dict | None) -> tuple[dict, list[dict]]:
        """Забирает новые письма. Возвращает (новое_состояние, список_payload'ов).

        Каждый payload = {"raw_email_b64": ...} — то же, что приходит в parse_incoming.
        Блокирующий imaplib выполняется в отдельном потоке, чтобы не тормозить loop.
        """
        return await asyncio.to_thread(self._poll_blocking, state or {})

    def _poll_blocking(self, state: dict) -> tuple[dict, list[dict]]:
        host = self.credentials["imap_host"]
        port = int(self.credentials.get("imap_port", 993))
        login = self.credentials["login"]
        password = self.credentials["password"]
        mailbox = self.credentials.get("mailbox", "INBOX")
        last_uid = state.get("last_uid")

        conn = imaplib.IMAP4_SSL(host, port)
        try:
            conn.login(login, password)
            conn.select(mailbox)

            # Первый запуск: запоминаем текущий максимум UID и НИЧЕГО не импортируем
            # (иначе весь исторический ящик превратится в лиды).
            if last_uid is None:
                typ, data = conn.uid("search", None, "ALL")
                uids = data[0].split() if data and data[0] else []
                max_uid = int(uids[-1]) if uids else 0
                return {"last_uid": max_uid}, []

            # Обычный запуск: письма с UID больше сохранённого
            typ, data = conn.uid("search", None, f"UID {last_uid + 1}:*")
            raw_uids = data[0].split() if data and data[0] else []

            payloads: list[dict] = []
            new_last = last_uid
            for raw_uid in raw_uids:
                uid = int(raw_uid)
                if uid <= last_uid:
                    continue  # IMAP-квирк: 'UID n:*' может вернуть и последнее письмо
                typ, msg_data = conn.uid("fetch", str(uid), "(RFC822)")
                if not msg_data or not msg_data[0]:
                    continue
                raw_email = msg_data[0][1]
                payloads.append({"raw_email_b64": base64.b64encode(raw_email).decode("ascii")})
                new_last = max(new_last, uid)

            return {"last_uid": new_last}, payloads
        finally:
            try:
                conn.logout()
            except Exception:
                pass

    # -------- Отправка (Фаза 2) --------
    async def send_message(self, external_contact_id: str, text: str) -> str | None:
        raise NotImplementedError("Отправка email — Фаза 2 (через SMTP)")
