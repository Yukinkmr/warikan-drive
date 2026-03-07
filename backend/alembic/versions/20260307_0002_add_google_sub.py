"""add google_sub to users

Revision ID: 20260307_0002
Revises: 20260307_0001
Create Date: 2026-03-07 15:30:00
"""

from alembic import op
import sqlalchemy as sa


revision = "20260307_0002"
down_revision = "20260307_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    # 冪等: 列が既にあればスキップ（本番で手動/SQLで追加済みの場合対応）
    has_col = conn.execute(
        sa.text(
            "SELECT 1 FROM information_schema.columns "
            "WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'google_sub'"
        )
    ).scalar()
    if not has_col:
        op.add_column("users", sa.Column("google_sub", sa.String(length=255), nullable=True))
    # 冪等: 制約が既にあればスキップ
    has_uq = conn.execute(
        sa.text(
            "SELECT 1 FROM pg_constraint c "
            "JOIN pg_class t ON c.conrelid = t.oid "
            "WHERE t.relname = 'users' AND c.conname = 'uq_users_google_sub'"
        )
    ).scalar()
    if not has_uq:
        op.create_unique_constraint("uq_users_google_sub", "users", ["google_sub"])


def downgrade() -> None:
    op.drop_constraint("uq_users_google_sub", "users", type_="unique")
    op.drop_column("users", "google_sub")
