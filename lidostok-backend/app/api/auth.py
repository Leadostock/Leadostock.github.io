"""Регистрация тенанта (с владельцем) и вход."""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr
from sqlalchemy import select

from ..deps import CurrentUser, DbSession
from ..models import Tenant, User, UserRole
from ..plans import Plan
from ..security import create_access_token, hash_password, verify_password

router = APIRouter(prefix="/api/auth", tags=["auth"])


class RegisterRequest(BaseModel):
    company_name: str
    name: str
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class MeResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str
    tenant_id: str
    plan: str


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(payload: RegisterRequest, db: DbSession):
    existing = await db.execute(select(User).where(User.email == payload.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Пользователь с таким email уже существует")

    tenant = Tenant(name=payload.company_name, plan=Plan.FREE)
    db.add(tenant)
    await db.flush()

    user = User(
        tenant_id=tenant.id,
        email=payload.email,
        password_hash=hash_password(payload.password),
        name=payload.name,
        role=UserRole.OWNER,
    )
    db.add(user)
    await db.commit()

    return TokenResponse(access_token=create_access_token(str(user.id), str(tenant.id)))


@router.post("/login", response_model=TokenResponse)
async def login(form: OAuth2PasswordRequestForm = Depends(), db: DbSession = None):
    result = await db.execute(select(User).where(User.email == form.username))
    user = result.scalar_one_or_none()
    if not user or not verify_password(form.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Неверный email или пароль")
    return TokenResponse(access_token=create_access_token(str(user.id), str(user.tenant_id)))


@router.get("/me", response_model=MeResponse)
async def me(user: CurrentUser, db: DbSession):
    tenant = await db.get(Tenant, user.tenant_id)
    return MeResponse(
        id=str(user.id),
        email=user.email,
        name=user.name,
        role=user.role,
        tenant_id=str(user.tenant_id),
        plan=tenant.plan,
    )
