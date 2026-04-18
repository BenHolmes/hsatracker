"""
SQLAlchemy ORM models for the HSATracker database.

All monetary columns use NUMERIC(10,2) — never floats — to avoid rounding
errors in financial calculations. UUIDs are generated in Python (not the DB)
so IDs are available before the INSERT is flushed.
"""

import uuid

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase, relationship


class Base(DeclarativeBase):
    pass


class Expense(Base):
    """A single HSA-eligible medical expense.

    Each expense is either paid directly from the HSA card ('hsa') or paid
    out-of-pocket ('out_of_pocket'). Out-of-pocket expenses can optionally
    have a linked Reimbursement record tracking repayment from the HSA.
    """

    __tablename__ = "expenses"

    id = sa.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    date = sa.Column(sa.Date, nullable=False)
    provider_name = sa.Column(sa.Text, nullable=False)
    description = sa.Column(sa.Text, nullable=False)
    amount = sa.Column(sa.Numeric(10, 2), nullable=False)
    category = sa.Column(sa.Text, nullable=False)       # HsaCategory enum value
    payment_method = sa.Column(sa.Text, nullable=False) # 'out_of_pocket' or 'hsa'
    notes = sa.Column(sa.Text, nullable=True)
    created_at = sa.Column(
        sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
    )
    updated_at = sa.Column(
        sa.DateTime(timezone=True),
        server_default=sa.func.now(),
        onupdate=sa.func.now(),  # automatically refreshed on every UPDATE
        nullable=False,
    )

    __table_args__ = (
        sa.CheckConstraint("amount > 0", name="ck_expenses_amount_positive"),
        sa.CheckConstraint(
            "payment_method IN ('out_of_pocket', 'hsa')",
            name="ck_expenses_payment_method",
        ),
    )

    # uselist=False makes this a one-to-one relationship (each expense has at
    # most one reimbursement record). cascade ensures deletion propagates.
    reimbursement = relationship(
        "Reimbursement",
        back_populates="expense",
        uselist=False,
        cascade="all, delete-orphan",
    )
    receipts = relationship(
        "Receipt", back_populates="expense", cascade="all, delete-orphan"
    )


class Reimbursement(Base):
    """Tracks the repayment status of a single out-of-pocket expense.

    A reimbursement starts in 'pending' status when the user decides to seek
    repayment from their HSA. It moves to 'reimbursed' once the HSA custodian
    has transferred funds back. reimbursed_amount supports partial repayment.
    """

    __tablename__ = "reimbursements"

    id = sa.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    expense_id = sa.Column(
        UUID(as_uuid=True),
        sa.ForeignKey("expenses.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,  # enforces the one-to-one relationship at the DB level
    )
    status = sa.Column(sa.Text, nullable=False, default="pending")
    reimbursed_date = sa.Column(sa.Date, nullable=True)
    reimbursed_amount = sa.Column(sa.Numeric(10, 2), nullable=True)  # supports partial reimbursement
    notes = sa.Column(sa.Text, nullable=True)
    created_at = sa.Column(
        sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
    )
    updated_at = sa.Column(
        sa.DateTime(timezone=True),
        server_default=sa.func.now(),
        onupdate=sa.func.now(),
        nullable=False,
    )

    __table_args__ = (
        sa.CheckConstraint(
            "status IN ('pending', 'reimbursed')", name="ck_reimbursements_status"
        ),
        sa.CheckConstraint(
            "reimbursed_amount > 0 OR reimbursed_amount IS NULL",
            name="ck_reimbursements_amount_positive",
        ),
    )

    expense = relationship("Expense", back_populates="reimbursement")


class Contribution(Base):
    """A single HSA deposit from any source (employee, employer, or other).

    tax_year is stored explicitly rather than derived from date because
    contributions made in January–April can apply to the prior tax year,
    which is a common IRS allowance.
    """

    __tablename__ = "contributions"

    id = sa.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    date = sa.Column(sa.Date, nullable=False)           # actual deposit date
    amount = sa.Column(sa.Numeric(10, 2), nullable=False)
    source = sa.Column(sa.Text, nullable=False, default="self")  # 'self', 'employer', 'other'
    tax_year = sa.Column(sa.Integer, nullable=False)    # the year this contribution counts toward
    notes = sa.Column(sa.Text, nullable=True)
    created_at = sa.Column(
        sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
    )
    updated_at = sa.Column(
        sa.DateTime(timezone=True),
        server_default=sa.func.now(),
        onupdate=sa.func.now(),
        nullable=False,
    )

    __table_args__ = (
        sa.CheckConstraint("amount > 0", name="ck_contributions_amount_positive"),
        sa.CheckConstraint(
            "source IN ('self', 'employer', 'other')", name="ck_contributions_source"
        ),
    )


class AccountBalance(Base):
    """A point-in-time snapshot of the HSA account balance.

    Balances are user-entered rather than computed because HSA custodians
    apply investment returns, fees, and interest that the app cannot know
    about. Users periodically enter the balance shown on their custodian's
    website.
    """

    __tablename__ = "account_balance"

    id = sa.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    balance = sa.Column(sa.Numeric(10, 2), nullable=False)
    as_of_date = sa.Column(sa.Date, nullable=False)
    notes = sa.Column(sa.Text, nullable=True)
    created_at = sa.Column(
        sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
    )


class AppSettings(Base):
    """Singleton application preferences row.

    There is exactly one row in this table (id = SETTINGS_SINGLETON_ID).
    Use crud.get_settings() which upserts the row on first access so callers
    never have to handle the empty-table case.
    """

    __tablename__ = "app_settings"

    id = sa.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    coverage_type = sa.Column(sa.Text, nullable=False, default="individual")
    catch_up_eligible = sa.Column(sa.Boolean, nullable=False, default=False)
    updated_at = sa.Column(
        sa.DateTime(timezone=True),
        server_default=sa.func.now(),
        onupdate=sa.func.now(),
        nullable=False,
    )

    __table_args__ = (
        sa.CheckConstraint(
            "coverage_type IN ('individual', 'family')",
            name="ck_app_settings_coverage_type",
        ),
    )


class Receipt(Base):
    """A receipt file attached to an expense.

    Files are stored on the local filesystem (bind-mounted at /app/uploads)
    and renamed to a UUID-based filename on upload to avoid collisions.
    The original filename is preserved for display purposes.

    filename and storage_path are intentionally excluded from the API response
    (ReceiptOut schema) to avoid leaking internal file layout to clients.
    """

    __tablename__ = "receipts"

    id = sa.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    expense_id = sa.Column(
        UUID(as_uuid=True),
        sa.ForeignKey("expenses.id", ondelete="CASCADE"),
        nullable=False,
    )
    filename = sa.Column(sa.Text, nullable=False)           # UUID-based name on disk
    original_filename = sa.Column(sa.Text, nullable=False)  # user's original filename
    mime_type = sa.Column(sa.Text, nullable=False)
    file_size = sa.Column(sa.Integer, nullable=False)       # bytes
    storage_path = sa.Column(sa.Text, nullable=False)       # relative path within upload_dir
    created_at = sa.Column(
        sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
    )

    expense = relationship("Expense", back_populates="receipts")
