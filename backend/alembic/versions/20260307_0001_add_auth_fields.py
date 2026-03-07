"""add auth fields to users

Revision ID: 20260307_0001
Revises:
Create Date: 2026-03-07 12:35:00
"""

from alembic import op
import sqlalchemy as sa


revision = "20260307_0001"
down_revision = None
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
        sa.text(
            "SELECT 1 FROM pg_constraint WHERE conname = :name"
        ),
        {"name": name},
    )
    return r.scalar() is not None


def upgrade() -> None:
    conn = op.get_bind()
    if not _column_exists(conn, "users", "email"):
        op.add_column("users", sa.Column("email", sa.String(length=255), nullable=True))
    if not _column_exists(conn, "users", "password_hash"):
        op.add_column("users", sa.Column("password_hash", sa.String(length=255), nullable=True))
    if not _constraint_exists(conn, "uq_users_email"):
        op.create_unique_constraint("uq_users_email", "users", ["email"])


def downgrade() -> None:
    op.drop_constraint("uq_users_email", "users", type_="unique")
    op.drop_column("users", "password_hash")
    op.drop_column("users", "email")
