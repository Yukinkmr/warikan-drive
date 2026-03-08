"""add display_name to members

Revision ID: 20260308_0005
Revises: 20260307_0004
Create Date: 2026-03-08 12:30:00
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20260308_0005"
down_revision = "20260307_0004"
branch_labels = None
depends_on = None


def _column_exists(conn, table: str, column: str) -> bool:
    result = conn.execute(
        sa.text(
            "SELECT 1 FROM information_schema.columns "
            "WHERE table_schema = 'public' AND table_name = :table AND column_name = :column"
        ),
        {"table": table, "column": column},
    )
    return result.scalar() is not None


def _column_nullable(conn, table: str, column: str) -> bool:
    result = conn.execute(
        sa.text(
            "SELECT is_nullable FROM information_schema.columns "
            "WHERE table_schema = 'public' AND table_name = :table AND column_name = :column"
        ),
        {"table": table, "column": column},
    ).scalar()
    return result == "YES"


def upgrade() -> None:
    conn = op.get_bind()

    if not _column_exists(conn, "members", "display_name"):
        op.add_column(
            "members",
            sa.Column("display_name", sa.String(length=80), nullable=True, server_default=""),
        )

    conn.execute(
        sa.text(
            "UPDATE members AS m "
            "SET display_name = COALESCE(NULLIF(BTRIM(u.name), ''), m.display_name) "
            "FROM users AS u "
            "WHERE m.user_id = u.id"
        )
    )
    conn.execute(
        sa.text(
            "UPDATE members SET display_name = 'メンバー' "
            "WHERE display_name IS NULL OR BTRIM(display_name) = ''"
        )
    )
    op.alter_column("members", "display_name", server_default=None, nullable=False)

    if not _column_nullable(conn, "members", "user_id"):
        op.alter_column(
            "members",
            "user_id",
            existing_type=postgresql.UUID(as_uuid=True),
            nullable=True,
        )


def downgrade() -> None:
    op.alter_column(
        "members",
        "user_id",
        existing_type=postgresql.UUID(as_uuid=True),
        nullable=False,
    )
    op.drop_column("members", "display_name")
