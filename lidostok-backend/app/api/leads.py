"""API лидов для кабинета клиента.

Список лидов с фильтрами (статус, месяц, диапазон дат), сортировкой (новые сверху)
и экспортом в CSV за месяц. Всё строго в рамках своего тенанта (изоляция).
"""
import csv
import io
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy import select

from ..deps import CurrentUser, DbSession, tenant_id_of
from ..models import Conversation, Lead

router = APIRouter(prefix="/api/leads", tags=["leads"])


class LeadOut(BaseModel):
    id: str
    who: str
    source: str
    want: str
    contact: str
    status: str
    created_at: str


def _month_bounds(month: str) -> tuple[datetime, datetime]:
    """'2026-07' -> (начало июля, начало августа) в UTC."""
    year, mon = (int(x) for x in month.split("-"))
    start = datetime(year, mon, 1, tzinfo=timezone.utc)
    end = datetime(year + (mon == 12), (mon % 12) + 1, 1, tzinfo=timezone.utc)
    return start, end


def _apply_filters(stmt, tenant_id, status, month, date_from, date_to):
    stmt = stmt.where(Lead.tenant_id == tenant_id)
    if status and status != "all":
        stmt = stmt.where(Lead.status == status)
    if month and month != "all":
        start, end = _month_bounds(month)
        stmt = stmt.where(Lead.created_at >= start, Lead.created_at < end)
    if date_from:
        stmt = stmt.where(Lead.created_at >= datetime.fromisoformat(date_from))
    if date_to:
        stmt = stmt.where(Lead.created_at <= datetime.fromisoformat(date_to))
    return stmt


@router.get("", response_model=list[LeadOut])
async def list_leads(
    user: CurrentUser,
    db: DbSession,
    status: str | None = Query(None, description="new|qualified|rejected|all"),
    month: str | None = Query(None, description="Месяц в формате YYYY-MM"),
    date_from: str | None = None,
    date_to: str | None = None,
):
    stmt = _apply_filters(select(Lead), tenant_id_of(user), status, month, date_from, date_to)
    stmt = stmt.order_by(Lead.created_at.desc())  # новые сверху
    result = await db.execute(stmt)
    leads = result.scalars().all()
    return [
        LeadOut(
            id=str(l.id), who=l.who, source=l.source, want=l.want,
            contact=l.contact, status=l.status, created_at=l.created_at.isoformat(),
        )
        for l in leads
    ]


@router.get("/export")
async def export_leads(
    user: CurrentUser,
    db: DbSession,
    month: str | None = Query(None, description="Месяц YYYY-MM; без него — все"),
    status: str | None = None,
):
    stmt = _apply_filters(select(Lead), tenant_id_of(user), status, month, None, None)
    stmt = stmt.order_by(Lead.created_at.desc())
    result = await db.execute(stmt)
    leads = result.scalars().all()

    buffer = io.StringIO()
    buffer.write("\ufeff")  # BOM, чтобы Excel корректно открыл кириллицу
    writer = csv.writer(buffer, delimiter=";")
    writer.writerow(["Дата", "Кто", "Откуда", "Чего хочет", "Контакт", "Статус"])
    for l in leads:
        writer.writerow([
            l.created_at.strftime("%d.%m.%Y"), l.who, l.source, l.want, l.contact, l.status,
        ])
    buffer.seek(0)

    filename = f"leads_{month or 'all'}.csv"
    return StreamingResponse(
        iter([buffer.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
