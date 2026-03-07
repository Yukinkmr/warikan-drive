"""add time_type to routes

Revision ID: 20260307_0003
Revises: 20260307_0002
Create Date: 2026-03-07 18:00:00
"""

from alembic import op
import sqlalchemy as sa


revision = "20260307_0003"
down_revision = "20260307_0002"
branch_labels = None
depends_on = None


def _column_exists(conn, table: str, column: str) -> bool:
    r = conn.execute(
        sa.text(
            "SELECT 1 FROM information_schema.columns "
            "WHERE table_schema = 'public' AND table_name = :t AND column_name = :c"
        ),
        {"t": table, "c": column},
    )
    return r.scalar() is not None


def _constraint_exists(conn, name: str) -> bool:
    r = conn.execute(
        sa.text("SELECT 1 FROM pg_constraint WHERE conname = :name"),
        {"name": name},
    )
    return r.scalar() is not None


def upgrade() -> None:
    conn = op.get_bind()
    if not _column_exists(conn, "routes", "time_type"):
        op.add_column(
            "routes",
            sa.Column("time_type", sa.String(length=20), nullable=True),
        )
    if not _constraint_exists(conn, "chk_routes_time_type"):
        op.create_check_constraint(
            "chk_routes_time_type",
            "routes",
            "time_type IS NULL OR time_type IN ('DEPARTURE', 'ARRIVAL')",
        )


def downgrade() -> None:
    op.drop_constraint("chk_routes_time_type", "routes", type_="check")
    op.drop_column("routes", "time_type")
