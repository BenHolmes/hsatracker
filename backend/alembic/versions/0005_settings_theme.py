"""Add theme column to app_settings for persistent appearance preference.

Revision ID: 0005
Revises: 0004
Create Date: 2026-04-18
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0005"
down_revision = "0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "app_settings",
        sa.Column("theme", sa.Text, nullable=False, server_default="system"),
    )
    op.create_check_constraint(
        "ck_app_settings_theme",
        "app_settings",
        "theme IN ('system', 'light', 'dark')",
    )


def downgrade() -> None:
    op.drop_constraint("ck_app_settings_theme", "app_settings")
    op.drop_column("app_settings", "theme")
