"""Шифрование чувствительных данных (токены/пароли каналов) на уровне приложения.

Используется AES-256-GCM: аутентифицированное шифрование, каждый шифротекст
содержит случайный nonce. В БД токены каналов хранятся ТОЛЬКО в зашифрованном виде.

В продакшене мастер-ключ должен приходить из KMS (Yandex KMS / VK Cloud KMS),
а не из .env — так требует 152-ФЗ и здравый смысл.
"""
import base64
import json
import os
from typing import Any

from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from .config import settings


def _load_key() -> bytes:
    raw = settings.credentials_encryption_key
    if not raw:
        raise RuntimeError(
            "Не задан credentials_encryption_key. Сгенерируйте: "
            'python -c "import os,base64;print(base64.b64encode(os.urandom(32)).decode())"'
        )
    key = base64.b64decode(raw)
    if len(key) != 32:
        raise RuntimeError("credentials_encryption_key должен быть 32 байта (AES-256).")
    return key


def encrypt_json(data: dict[str, Any]) -> str:
    """Шифрует словарь (credentials канала) и возвращает base64-строку для хранения в БД."""
    key = _load_key()
    aes = AESGCM(key)
    nonce = os.urandom(12)
    plaintext = json.dumps(data, ensure_ascii=False).encode("utf-8")
    ciphertext = aes.encrypt(nonce, plaintext, None)
    return base64.b64encode(nonce + ciphertext).decode("ascii")


def decrypt_json(token: str) -> dict[str, Any]:
    """Расшифровывает строку из БД обратно в словарь credentials."""
    key = _load_key()
    aes = AESGCM(key)
    blob = base64.b64decode(token)
    nonce, ciphertext = blob[:12], blob[12:]
    plaintext = aes.decrypt(nonce, ciphertext, None)
    return json.loads(plaintext.decode("utf-8"))
