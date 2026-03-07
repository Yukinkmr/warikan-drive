"""add time_type to routes

Revision ID: 20260307_0002
Revises: 20260307_0001
Create Date: 2026-03-07 14:30:00
"""

from alembic import op
import sqlalchemy as sa


revision = "20260307_0002"
down_revision = "20260307_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "routes",
        sa.Column("time_type", sa.String(length=20), nullable=False, server_default="DEPARTURE"),
    )


def downgrade() -> None:
    op.drop_column("routes", "time_type")
