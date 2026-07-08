"""Зависимости FastAPI.

САМОЕ ВАЖНОЕ в multi-tenant SaaS — изоляция данных между тенантами.
Принцип: текущий пользователь всегда несёт свой tenant_id, и КАЖДЫЙ запрос
к данным фильтруется по нему. Ниже — базовые зависимости, на которые
опираются все защищённые эндпоинты.
"""
import uuid
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .database import get_db
from .models import User
from .security import decode_access_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

DbSession = Annotated[AsyncSession, Depends(get_db)]


async def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    db: DbSession,
) -> User:
    creds_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Не удалось проверить учётные данные",
        headers={"WWW-Authenticate": "Bearer"},
    )
    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        raise creds_error

    result = await db.execute(select(User).where(User.id == uuid.UUID(payload["sub"])))
    user = result.scalar_one_or_none()
    if user is None or not user.is_active:
        raise creds_error
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


def require_role(*roles: str):
    """Фабрика зависимостей для ограничения доступа по роли."""
    async def checker(user: CurrentUser) -> User:
        if user.role not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Недостаточно прав")
        return user
    return checker


async def require_superadmin(user: CurrentUser) -> User:
    """Доступ только для системного администратора Лидостока (все клиенты)."""
    if not user.is_superadmin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Только для администратора системы")
    return user


SuperAdmin = Annotated[User, Depends(require_superadmin)]


def tenant_id_of(user: User) -> uuid.UUID:
    """Единая точка получения tenant_id. Используйте её во ВСЕХ запросах к данным:

        stmt = select(Conversation).where(Conversation.tenant_id == tenant_id_of(user))

    Никогда не отдавайте данные без фильтра по tenant_id — это утечка между клиентами.
    """
    return user.tenant_id
