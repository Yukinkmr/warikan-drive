"""change is_include_split default to false

Revision ID: 20260308_0005
Revises: 20260307_0004
Create Date: 2026-03-08
"""

from alembic import op

revision = "20260308_0005"
down_revision = "20260307_0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE routes ALTER COLUMN is_include_split SET DEFAULT false"
    )


def downgrade() -> None:
    op.execute(
        "ALTER TABLE routes ALTER COLUMN is_include_split SET DEFAULT true"
    )
