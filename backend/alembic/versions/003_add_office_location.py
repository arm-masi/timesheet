"""Add office_location to users table

Revision ID: 003
Revises: 002
Create Date: 2025-01-03 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "003"
down_revision: Union[str, None] = "002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    office_location_enum = sa.Enum(
        "milano_fara", "napoli_immacolata", "napoli_mascagni",
        name="officelocation",
    )
    office_location_enum.create(op.get_bind(), checkfirst=True)
    op.add_column(
        "users",
        sa.Column("office_location", office_location_enum, nullable=True),
    )


def downgrade() -> None:
    op.drop_column("users", "office_location")
    op.execute("DROP TYPE IF EXISTS officelocation")
