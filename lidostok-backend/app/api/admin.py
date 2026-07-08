"""API системного администратора Лидостока.

Позволяет из панели редактировать данные клиентов прямо в базе, не заходя в неё:
список всех компаний со статистикой, создание, изменение (тариф, статус, название),
удаление. Доступ — только для суперадмина (User.is_superadmin).
"""
import uuid

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlalchemy import func, select

from ..deps import DbSession, SuperAdmin
from ..models import Channel, Conversation, Lead, Tenant, User
from ..plans import Plan

router = APIRouter(prefix="/api/admin", tags=["admin"])


class TenantOut(BaseModel):
    id: str
    name: str
    plan: str
    is_active: bool
    users: int
    channels: int
    leads: int


class TenantCreate(BaseModel):
    name: str
    plan: Plan = Plan.FREE


class TenantUpdate(BaseModel):
    name: str | None = None
    plan: Plan | None = None
    is_active: bool | None = None


async def _tenant_stats(db: DbSession, tenant_id: uuid.UUID) -> tuple[int, int, int]:
    users = await db.scalar(select(func.count(User.id)).where(User.tenant_id == tenant_id))
    channels = await db.scalar(select(func.count(Channel.id)).where(Channel.tenant_id == tenant_id))
    leads = await db.scalar(select(func.count(Lead.id)).where(Lead.tenant_id == tenant_id))
    return int(users or 0), int(channels or 0), int(leads or 0)


async def _to_out(db: DbSession, t: Tenant) -> TenantOut:
    users, channels, leads = await _tenant_stats(db, t.id)
    return TenantOut(
        id=str(t.id), name=t.name, plan=t.plan, is_active=t.is_active,
        users=users, channels=channels, leads=leads,
    )


@router.get("/overview")
async def overview(admin: SuperAdmin, db: DbSession):
    total = await db.scalar(select(func.count(Tenant.id)))
    active = await db.scalar(select(func.count(Tenant.id)).where(Tenant.is_active.is_(True)))
    leads = await db.scalar(select(func.count(Lead.id)))
    channels = await db.scalar(select(func.count(Channel.id)))
    return {
        "clients": int(total or 0),
        "active": int(active or 0),
        "leads": int(leads or 0),
        "channels": int(channels or 0),
    }


@router.get("/tenants", response_model=list[TenantOut])
async def list_tenants(admin: SuperAdmin, db: DbSession):
    result = await db.execute(select(Tenant).order_by(Tenant.created_at.desc()))
    tenants = result.scalars().all()
    return [await _to_out(db, t) for t in tenants]


@router.post("/tenants", response_model=TenantOut, status_code=201)
async def create_tenant(payload: TenantCreate, admin: SuperAdmin, db: DbSession):
    tenant = Tenant(name=payload.name, plan=payload.plan)
    db.add(tenant)
    await db.commit()
    await db.refresh(tenant)
    return await _to_out(db, tenant)


@router.patch("/tenants/{tenant_id}", response_model=TenantOut)
async def update_tenant(tenant_id: uuid.UUID, payload: TenantUpdate, admin: SuperAdmin, db: DbSession):
    tenant = await db.get(Tenant, tenant_id)
    if tenant is None:
        raise HTTPException(status_code=404, detail="Компания не найдена")
    if payload.name is not None:
        tenant.name = payload.name
    if payload.plan is not None:
        tenant.plan = payload.plan
    if payload.is_active is not None:
        tenant.is_active = payload.is_active
    await db.commit()
    await db.refresh(tenant)
    return await _to_out(db, tenant)


@router.delete("/tenants/{tenant_id}")
async def delete_tenant(tenant_id: uuid.UUID, admin: SuperAdmin, db: DbSession):
    tenant = await db.get(Tenant, tenant_id)
    if tenant is None:
        raise HTTPException(status_code=404, detail="Компания не найдена")
    await db.delete(tenant)  # каскад удалит связанные строки (ondelete=CASCADE)
    await db.commit()
    return {"ok": True, "deleted": str(tenant_id)}
