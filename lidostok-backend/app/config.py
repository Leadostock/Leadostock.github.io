"""Конфигурация приложения. Все секреты читаются из окружения (.env)."""
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # --- База данных ---
    # Пример: postgresql+asyncpg://user:pass@localhost:5432/lidostok
    database_url: str = "postgresql+asyncpg://lidostok:lidostok@localhost:5432/lidostok"

    # --- Redis / очередь Arq ---
    redis_url: str = "redis://localhost:6379/0"

    # --- Аутентификация ---
    jwt_secret: str = "CHANGE_ME_В_ПРОДАКШЕНЕ"  # длинная случайная строка
    jwt_algorithm: str = "HS256"
    access_token_ttl_minutes: int = 60 * 24  # 1 сутки

    # --- Шифрование credentials каналов ---
    # 32 байта в base64. Сгенерировать: python -c "import os,base64;print(base64.b64encode(os.urandom(32)).decode())"
    # В продакшене ключ хранить в KMS (Yandex KMS / VK Cloud), а не в .env.
    credentials_encryption_key: str = ""

    # --- Прочее ---
    app_name: str = "Лидосток"
    debug: bool = True
    # Секрет, которым мы подписываем URL вебхуков (Telegram secret_token и т.п.)
    webhook_secret: str = "CHANGE_ME"
    # Публичный адрес бэкенда — нужен, чтобы сообщать его каналам как URL вебхука.
    # Пример: https://api.lidostok.ru . Локально для тестов Telegram — адрес туннеля (ngrok и т.п.).
    public_base_url: str = "http://localhost:8000"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
