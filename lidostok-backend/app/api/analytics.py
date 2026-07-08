"""API аналитики. Доступна только на тарифах с правом analytics (Premium+).

В MVP считаем то, что уже есть в данных:
- количество лидов за текущий месяц;
- распределение лидов по каналам (источникам);
- нагрузка на менеджеров (сколько диалогов назначено каждому).

«Время первого ответа» появится, когда заработает отправка из инбокса (Фаза 2),
и заполнится Conversation.first_response_at.
"""
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException
from sqlalchemy import func, select

from ..deps import CurrentUser, DbSession, tenant_id_of
from ..models import Channel, Conversation, Lead, Tenant, User
from ..entitlements import effective_entitlements

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


async def _ensure_analytics(db: DbSession, user) -> None:
    tenant = await db.get(Tenant, tenant_id_of(user))
    ent = await effective_entitlements(db, tenant.plan)
    if not ent.analytics:
        raise HTTPException(status_code=402, detail="Аналитика доступна на тарифе Премиум и выше")


@router.get("/overview")
async def overview(user: CurrentUser, db: DbSession):
    await _ensure_analytics(db, user)
    tid = tenant_id_of(user)

    month_start = datetime.now(timezone.utc).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    leads_month = await db.scalar(
        select(func.count(Lead.id)).where(Lead.tenant_id == tid, Lead.created_at >= month_start)
    )
    leads_total = await db.scalar(select(func.count(Lead.id)).where(Lead.tenant_id == tid))

    # Лиды по каналам
    by_channel_rows = await db.execute(
        select(Channel.type, func.count(Conversation.id))
        .join(Conversation, Conversation.channel_id == Channel.id)
        .where(Conversation.tenant_id == tid)
        .group_by(Channel.type)
    )
    by_channel = {row[0]: row[1] for row in by_channel_rows.all()}

    # Нагрузка на менеджеров
    by_manager_rows = await db.execute(
        select(User.name, func.count(Conversation.id))
        .join(Conversation, Conversation.assigned_manager_id == User.id)
        .where(Conversation.tenant_id == tid)
        .group_by(User.name)
    )
    by_manager = {row[0] or "—": row[1] for row in by_manager_rows.all()}

    return {
        "leads_this_month": int(leads_month or 0),
        "leads_total": int(leads_total or 0),
        "leads_by_channel": by_channel,
        "conversations_by_manager": by_manager,
    }
