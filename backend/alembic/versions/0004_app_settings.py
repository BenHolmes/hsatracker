"""Add app_settings singleton table for persistent application preferences.

Revision ID: 0004
Revises: 0003
Create Date: 2026-04-17
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

# revision identifiers, used by Alembic.
revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None

# Fixed UUID for the singleton row — always the same so migrations are idempotent.
_SINGLETON_ID = "00000000-0000-0000-0000-000000000001"


def upgrade() -> None:
    op.create_table(
        "app_settings",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "coverage_type",
            sa.Text,
            nullable=False,
            server_default="individual",
        ),
        sa.Column(
            "catch_up_eligible",
            sa.Boolean,
            nullable=False,
            server_default="false",
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.CheckConstraint(
            "coverage_type IN ('individual', 'family')",
            name="ck_app_settings_coverage_type",
        ),
    )

    # Insert the default singleton row so GET /settings always returns something.
    op.execute(
        f"INSERT INTO app_settings (id, coverage_type, catch_up_eligible) "
        f"VALUES ('{_SINGLETON_ID}', 'individual', false) "
        f"ON CONFLICT (id) DO NOTHING"
    )


def downgrade() -> None:
    op.drop_table("app_settings")
