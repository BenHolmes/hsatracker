import uuid

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase, relationship


class Base(DeclarativeBase):
    pass


class Expense(Base):
    __tablename__ = "expenses"

    id = sa.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    date = sa.Column(sa.Date, nullable=False)
    provider_name = sa.Column(sa.Text, nullable=False)
    description = sa.Column(sa.Text, nullable=False)
    amount = sa.Column(sa.Numeric(10, 2), nullable=False)
    category = sa.Column(sa.Text, nullable=False)
    payment_method = sa.Column(sa.Text, nullable=False)
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
        sa.CheckConstraint("amount > 0", name="ck_expenses_amount_positive"),
        sa.CheckConstraint(
            "payment_method IN ('out_of_pocket', 'hsa')",
            name="ck_expenses_payment_method",
        ),
    )

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
    __tablename__ = "reimbursements"

    id = sa.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    expense_id = sa.Column(
        UUID(as_uuid=True),
        sa.ForeignKey("expenses.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    status = sa.Column(sa.Text, nullable=False, default="pending")
    reimbursed_date = sa.Column(sa.Date, nullable=True)
    reimbursed_amount = sa.Column(sa.Numeric(10, 2), nullable=True)
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
    __tablename__ = "contributions"

    id = sa.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    date = sa.Column(sa.Date, nullable=False)
    amount = sa.Column(sa.Numeric(10, 2), nullable=False)
    source = sa.Column(sa.Text, nullable=False, default="self")
    tax_year = sa.Column(sa.Integer, nullable=False)
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
    __tablename__ = "account_balance"

    id = sa.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    balance = sa.Column(sa.Numeric(10, 2), nullable=False)
    as_of_date = sa.Column(sa.Date, nullable=False)
    notes = sa.Column(sa.Text, nullable=True)
    created_at = sa.Column(
        sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
    )


class Receipt(Base):
    __tablename__ = "receipts"

    id = sa.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    expense_id = sa.Column(
        UUID(as_uuid=True),
        sa.ForeignKey("expenses.id", ondelete="CASCADE"),
        nullable=False,
    )
    filename = sa.Column(sa.Text, nullable=False)
    original_filename = sa.Column(sa.Text, nullable=False)
    mime_type = sa.Column(sa.Text, nullable=False)
    file_size = sa.Column(sa.Integer, nullable=False)
    storage_path = sa.Column(sa.Text, nullable=False)
    created_at = sa.Column(
        sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
    )

    expense = relationship("Expense", back_populates="receipts")
