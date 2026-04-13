"""Initial schema

Revision ID: 0001
Revises:
Create Date: 2026-04-13 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # expenses
    op.create_table(
        "expenses",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("provider_name", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("amount", sa.Numeric(10, 2), nullable=False),
        sa.Column("category", sa.Text(), nullable=False),
        sa.Column("payment_method", sa.Text(), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.CheckConstraint("amount > 0", name="ck_expenses_amount_positive"),
        sa.CheckConstraint(
            "payment_method IN ('out_of_pocket', 'hsa')",
            name="ck_expenses_payment_method",
        ),
    )
    op.create_index("idx_expenses_date", "expenses", ["date"])
    op.create_index("idx_expenses_payment_method", "expenses", ["payment_method"])

    # reimbursements
    op.create_table(
        "reimbursements",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("expense_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("status", sa.Text(), nullable=False, server_default="pending"),
        sa.Column("reimbursed_date", sa.Date(), nullable=True),
        sa.Column("reimbursed_amount", sa.Numeric(10, 2), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(
            ["expense_id"], ["expenses.id"], ondelete="CASCADE"
        ),
        sa.UniqueConstraint("expense_id", name="uq_reimbursements_expense_id"),
        sa.CheckConstraint(
            "status IN ('pending', 'reimbursed')", name="ck_reimbursements_status"
        ),
        sa.CheckConstraint(
            "reimbursed_amount > 0 OR reimbursed_amount IS NULL",
            name="ck_reimbursements_amount_positive",
        ),
    )
    op.create_index("idx_reimbursements_expense_id", "reimbursements", ["expense_id"])
    op.create_index("idx_reimbursements_status", "reimbursements", ["status"])

    # contributions
    op.create_table(
        "contributions",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("amount", sa.Numeric(10, 2), nullable=False),
        sa.Column("source", sa.Text(), nullable=False, server_default="self"),
        sa.Column("tax_year", sa.Integer(), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.CheckConstraint("amount > 0", name="ck_contributions_amount_positive"),
        sa.CheckConstraint(
            "source IN ('self', 'employer', 'other')", name="ck_contributions_source"
        ),
    )
    op.create_index("idx_contributions_tax_year", "contributions", ["tax_year"])

    # account_balance
    op.create_table(
        "account_balance",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("balance", sa.Numeric(10, 2), nullable=False),
        sa.Column("as_of_date", sa.Date(), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "idx_account_balance_as_of_date", "account_balance", ["as_of_date"]
    )

    # receipts
    op.create_table(
        "receipts",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("expense_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("filename", sa.Text(), nullable=False),
        sa.Column("original_filename", sa.Text(), nullable=False),
        sa.Column("mime_type", sa.Text(), nullable=False),
        sa.Column("file_size", sa.Integer(), nullable=False),
        sa.Column("storage_path", sa.Text(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(
            ["expense_id"], ["expenses.id"], ondelete="CASCADE"
        ),
    )
    op.create_index("idx_receipts_expense_id", "receipts", ["expense_id"])


def downgrade() -> None:
    op.drop_table("receipts")
    op.drop_table("account_balance")
    op.drop_table("contributions")
    op.drop_table("reimbursements")
    op.drop_table("expenses")
