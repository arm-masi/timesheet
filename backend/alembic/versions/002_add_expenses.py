"""Add expense reports and items tables

Revision ID: 002
Revises: 001
Create Date: 2025-01-02 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Drop old single-table if exists
    op.execute("DROP TABLE IF EXISTS expenses CASCADE")
    op.execute("DROP TYPE IF EXISTS expensetype CASCADE")
    op.execute("DROP TYPE IF EXISTS expensestatus CASCADE")

    expense_type = sa.Enum("viaggio", "autostrada", "soggiorno", "parcheggio", "pasti", "altro", name="expensetype")
    expense_status = sa.Enum("in_attesa", "approvato", "rifiutato", name="expensestatus")

    op.create_table(
        "expense_reports",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False, index=True),
        sa.Column("date_from", sa.Date(), nullable=False),
        sa.Column("date_to", sa.Date(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("total_expenses", sa.Float(), default=0, nullable=False),
        sa.Column("total_km_reimbursement", sa.Float(), default=0, nullable=False),
        sa.Column("grand_total", sa.Float(), default=0, nullable=False),
        sa.Column("receipt_filename", sa.String(500), nullable=True),
        sa.Column("receipt_path", sa.String(1000), nullable=True),
        sa.Column("status", expense_status, default="in_attesa", nullable=False),
        sa.Column("reviewed_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "expense_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("report_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("expense_reports.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("expense_type", expense_type, nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("amount", sa.Float(), nullable=False),
        sa.Column("km", sa.Float(), nullable=True),
        sa.Column("cost_per_km", sa.Float(), nullable=True),
        sa.Column("km_total", sa.Float(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("expense_items")
    op.drop_table("expense_reports")
    op.execute("DROP TYPE IF EXISTS expensetype")
    op.execute("DROP TYPE IF EXISTS expensestatus")
