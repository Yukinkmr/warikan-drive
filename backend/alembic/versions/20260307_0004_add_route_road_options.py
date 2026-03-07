"""add route road options

Revision ID: 20260307_0004
Revises: 20260307_0003
Create Date: 2026-03-07 22:10:00
"""

from alembic import op
import sqlalchemy as sa


revision = "20260307_0004"
down_revision = "20260307_0003"
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


def upgrade() -> None:
    conn = op.get_bind()
    if not _column_exists(conn, "routes", "use_highways"):
        op.add_column(
            "routes",
            sa.Column("use_highways", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        )
    if not _column_exists(conn, "routes", "use_tolls"):
        op.add_column(
            "routes",
            sa.Column("use_tolls", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        )


def downgrade() -> None:
    op.drop_column("routes", "use_tolls")
    op.drop_column("routes", "use_highways")
