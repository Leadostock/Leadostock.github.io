"""Точка входа FastAPI.

Запуск (разработка):  uvicorn app.main:app --reload
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api import admin, analytics, auth, channels, conversations, leads, tariffs, webhooks
from .config import settings
from .seed import seed_tariffs


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Мягкий сидинг тарифов при старте: если БД недоступна — не роняем приложение.
    try:
        n = await seed_tariffs()
        if n:
            print(f"[startup] Засеяно тарифов: {n}")
    except Exception as e:  # noqa: BLE001
        print(f"[startup] Сидинг тарифов пропущен (БД не готова?): {e}")
    yield


app = FastAPI(title=settings.app_name, debug=settings.debug, lifespan=lifespan)

# CORS для веб-фронтенда (Next.js). В продакшене указать конкретный домен.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(webhooks.router)
app.include_router(channels.router)
app.include_router(conversations.router)
app.include_router(analytics.router)
app.include_router(admin.router)
app.include_router(leads.router)
app.include_router(tariffs.public_router)
app.include_router(tariffs.admin_router)


@app.get("/health")
async def health():
    return {"status": "ok", "app": settings.app_name}
