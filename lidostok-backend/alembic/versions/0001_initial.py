"""Начальная схема: тенанты, пользователи, тарифы, каналы, диалоги, сообщения, лиды, события.

Revision ID: 0001_initial
Revises:
Create Date: 2026-01-01
"""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None

UUID = postgresql.UUID(as_uuid=True)
NOW = sa.text("now()")



def upgrade() -> None:
    op.create_table(
        "tenants",
        sa.Column("id", UUID, primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("plan", sa.String(32), nullable=False, server_default="free"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=NOW, nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=NOW, nullable=False),
    )

    op.create_table(
        "tariffs",
        sa.Column("id", UUID, primary_key=True),
        sa.Column("plan", sa.String(32), nullable=False),
        sa.Column("title", sa.String(64), nullable=False),
        sa.Column("price_month", sa.Integer(), nullable=True),
        sa.Column("trial_days", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("max_channels", sa.Integer(), nullable=True),
        sa.Column("max_leads_per_month", sa.Integer(), nullable=True),
        sa.Column("analytics", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("manager_control", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("priority_support", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("onboarding", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("storage_months", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=NOW, nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=NOW, nullable=False),
    )
    op.create_index("ix_tariffs_plan", "tariffs", ["plan"], unique=True)

    op.create_table(
        "users",
        sa.Column("id", UUID, primary_key=True),
        sa.Column("tenant_id", UUID, sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("name", sa.String(255), nullable=False, server_default=""),
        sa.Column("role", sa.String(32), nullable=False, server_default="manager"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("is_superadmin", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=NOW, nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=NOW, nullable=False),
    )
    op.create_index("ix_users_tenant_id", "users", ["tenant_id"])
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    op.create_table(
        "channels",
        sa.Column("id", UUID, primary_key=True),
        sa.Column("tenant_id", UUID, sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("type", sa.String(32), nullable=False),
        sa.Column("title", sa.String(255), nullable=False, server_default=""),
        sa.Column("status", sa.String(32), nullable=False, server_default="pending"),
        sa.Column("routing_key", sa.String(64), nullable=False),
        sa.Column("credentials_encrypted", sa.Text(), nullable=False, server_default=""),
        sa.Column("state", postgresql.JSONB(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=NOW, nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=NOW, nullable=False),
    )
    op.create_index("ix_channels_tenant_id", "channels", ["tenant_id"])
    op.create_index("ix_channels_routing_key", "channels", ["routing_key"], unique=True)

    op.create_table(
        "conversations",
        sa.Column("id", UUID, primary_key=True),
        sa.Column("tenant_id", UUID, sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("channel_id", UUID, sa.ForeignKey("channels.id", ondelete="CASCADE"), nullable=False),
        sa.Column("external_contact_id", sa.String(255), nullable=False),
        sa.Column("contact_name", sa.String(255), nullable=False, server_default=""),
        sa.Column("status", sa.String(32), nullable=False, server_default="new"),
        sa.Column("assigned_manager_id", UUID, sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("first_message_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_message_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("first_response_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=NOW, nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=NOW, nullable=False),
        sa.UniqueConstraint("channel_id", "external_contact_id", name="uq_conv_channel_contact"),
    )
    op.create_index("ix_conversations_tenant_id", "conversations", ["tenant_id"])
    op.create_index("ix_conversations_channel_id", "conversations", ["channel_id"])
    op.create_index("ix_conversations_external_contact_id", "conversations", ["external_contact_id"])

    op.create_table(
        "messages",
        sa.Column("id", UUID, primary_key=True),
        sa.Column("conversation_id", UUID, sa.ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("channel_id", UUID, sa.ForeignKey("channels.id", ondelete="CASCADE"), nullable=False),
        sa.Column("direction", sa.String(8), nullable=False, server_default="in"),
        sa.Column("text", sa.Text(), nullable=False, server_default=""),
        sa.Column("attachments", postgresql.JSONB(), nullable=True),
        sa.Column("external_message_id", sa.String(255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=NOW, nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=NOW, nullable=False),
        sa.UniqueConstraint("channel_id", "external_message_id", name="uq_msg_channel_external"),
    )
    op.create_index("ix_messages_conversation_id", "messages", ["conversation_id"])
    op.create_index("ix_messages_channel_id", "messages", ["channel_id"])

    op.create_table(
        "leads",
        sa.Column("id", UUID, primary_key=True),
        sa.Column("tenant_id", UUID, sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("conversation_id", UUID, sa.ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("who", sa.String(255), nullable=False, server_default=""),
        sa.Column("source", sa.String(255), nullable=False, server_default=""),
        sa.Column("want", sa.Text(), nullable=False, server_default=""),
        sa.Column("contact", sa.String(255), nullable=False, server_default=""),
        sa.Column("status", sa.String(32), nullable=False, server_default="new"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=NOW, nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=NOW, nullable=False),
    )
    op.create_index("ix_leads_tenant_id", "leads", ["tenant_id"])
    op.create_index("ix_leads_conversation_id", "leads", ["conversation_id"])

    op.create_table(
        "events",
        sa.Column("id", UUID, primary_key=True),
        sa.Column("tenant_id", UUID, sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("type", sa.String(64), nullable=False),
        sa.Column("payload", postgresql.JSONB(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=NOW, nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=NOW, nullable=False),
    )
    op.create_index("ix_events_tenant_id", "events", ["tenant_id"])
    op.create_index("ix_events_type", "events", ["type"])


def downgrade() -> None:
    for t in ["events", "leads", "messages", "conversations", "channels", "users", "tariffs", "tenants"]:
        op.drop_table(t)
