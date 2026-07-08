"""API инбокса: список диалогов, сообщения диалога, карточка лида, смена статуса.

ВАЖНО: каждый запрос фильтруется по tenant_id текущего пользователя.
"""
import uuid

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlalchemy import select

from ..deps import CurrentUser, DbSession, tenant_id_of
from ..models import Conversation, Lead, Message

router = APIRouter(prefix="/api/conversations", tags=["conversations"])


class ConversationOut(BaseModel):
    id: str
    channel_id: str
    contact_name: str
    status: str
    last_message_at: str | None


class MessageOut(BaseModel):
    id: str
    direction: str
    text: str
    created_at: str


class LeadOut(BaseModel):
    who: str
    source: str
    want: str
    contact: str
    status: str


@router.get("", response_model=list[ConversationOut])
async def list_conversations(user: CurrentUser, db: DbSession, status: str | None = None):
    stmt = select(Conversation).where(Conversation.tenant_id == tenant_id_of(user))
    if status:
        stmt = stmt.where(Conversation.status == status)
    stmt = stmt.order_by(Conversation.last_message_at.desc().nullslast())
    result = await db.execute(stmt)
    convs = result.scalars().all()
    return [
        ConversationOut(
            id=str(c.id),
            channel_id=str(c.channel_id),
            contact_name=c.contact_name,
            status=c.status,
            last_message_at=c.last_message_at.isoformat() if c.last_message_at else None,
        )
        for c in convs
    ]


async def _owned_conversation(db: DbSession, user, conversation_id: uuid.UUID) -> Conversation:
    result = await db.execute(
        select(Conversation).where(
            Conversation.id == conversation_id,
            Conversation.tenant_id == tenant_id_of(user),  # изоляция тенанта
        )
    )
    conv = result.scalar_one_or_none()
    if conv is None:
        raise HTTPException(status_code=404, detail="Диалог не найден")
    return conv


@router.get("/{conversation_id}/messages", response_model=list[MessageOut])
async def get_messages(conversation_id: uuid.UUID, user: CurrentUser, db: DbSession):
    await _owned_conversation(db, user, conversation_id)
    result = await db.execute(
        select(Message).where(Message.conversation_id == conversation_id).order_by(Message.created_at)
    )
    return [
        MessageOut(id=str(m.id), direction=m.direction, text=m.text, created_at=m.created_at.isoformat())
        for m in result.scalars().all()
    ]


@router.get("/{conversation_id}/lead", response_model=LeadOut)
async def get_lead(conversation_id: uuid.UUID, user: CurrentUser, db: DbSession):
    await _owned_conversation(db, user, conversation_id)
    result = await db.execute(select(Lead).where(Lead.conversation_id == conversation_id))
    lead = result.scalar_one_or_none()
    if lead is None:
        raise HTTPException(status_code=404, detail="Карточка лида не найдена")
    return LeadOut(who=lead.who, source=lead.source, want=lead.want, contact=lead.contact, status=lead.status)


class StatusUpdate(BaseModel):
    status: str


@router.patch("/{conversation_id}/status")
async def update_status(conversation_id: uuid.UUID, payload: StatusUpdate, user: CurrentUser, db: DbSession):
    conv = await _owned_conversation(db, user, conversation_id)
    conv.status = payload.status
    await db.commit()
    return {"ok": True, "status": conv.status}
