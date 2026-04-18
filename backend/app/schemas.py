"""
Pydantic request/response schemas for the HSATracker API.

All schemas that are returned from the API use ConfigDict(from_attributes=True)
so SQLAlchemy ORM objects can be passed directly to Pydantic for serialisation.

Decimal fields (amounts, balances) are serialised by FastAPI as strings to
preserve precision — never as floats. The frontend always treats money values
as strings and parses them with parseFloat() only for display.
"""

from __future__ import annotations

import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, field_validator

from app.constants import (
    CONTRIBUTION_LIMITS,
    ContributionSource,
    CoverageType,
    HsaCategory,
    PaymentMethod,
    ReimbursementStatus,
    ThemeChoice,
)

# Pre-computed bounds used in tax_year validators below
_MIN_TAX_YEAR = min(CONTRIBUTION_LIMITS)
_MAX_TAX_YEAR = max(CONTRIBUTION_LIMITS)


# ---------------------------------------------------------------------------
# Receipts (nested in ExpenseOut)
# ---------------------------------------------------------------------------

class ReceiptOut(BaseModel):
    """Read-only receipt metadata returned from the API.

    filename and storage_path are intentionally omitted to avoid leaking
    the internal file layout. Clients access files via GET /receipts/{id}/file.
    """
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    expense_id: UUID
    original_filename: str
    mime_type: str
    file_size: int          # bytes
    created_at: datetime.datetime


# ---------------------------------------------------------------------------
# Reimbursements
# ---------------------------------------------------------------------------

class ReimbursementSummary(BaseModel):
    """Nested inside ExpenseOut — lightweight view of reimbursement status."""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    status: str
    reimbursed_date: datetime.date | None
    reimbursed_amount: Decimal | None


class ReimbursementCreate(BaseModel):
    """Create a reimbursement record for an out-of-pocket expense.

    The backend validates that the linked expense exists and has
    payment_method='out_of_pocket', and that no reimbursement already exists
    for it. Status is always initialised to 'pending'.
    """
    expense_id: UUID
    notes: str | None = None


class ReimbursementUpdate(BaseModel):
    """Partial update for a reimbursement — all fields optional.

    Typical usage: set status='reimbursed' along with reimbursed_date
    and reimbursed_amount once the HSA custodian has transferred funds.
    """
    status: ReimbursementStatus | None = None
    reimbursed_date: datetime.date | None = None
    reimbursed_amount: Decimal | None = None
    notes: str | None = None


class ExpenseSummary(BaseModel):
    """Nested inside ReimbursementOut — lightweight view of the linked expense."""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    date: datetime.date
    provider_name: str
    amount: Decimal


class ReimbursementOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    expense_id: UUID
    expense: ExpenseSummary  # eagerly loaded — avoids a second round-trip
    status: str
    reimbursed_date: datetime.date | None
    reimbursed_amount: Decimal | None
    notes: str | None
    created_at: datetime.datetime
    updated_at: datetime.datetime


class PaginatedReimbursements(BaseModel):
    """List response that also surfaces aggregate totals for the UI summary cards.

    Totals (pending_amount, reimbursed_amount_ytd) always reflect the full
    filtered result set regardless of which page is requested, so the summary
    cards stay accurate across all pages.
    """
    items: list[ReimbursementOut]
    total: int
    page: int
    pages: int
    pending_amount: Decimal         # sum of expense.amount for ALL pending records in filter
    reimbursed_amount_ytd: Decimal  # sum of reimbursed_amount for ALL reimbursed records in filter


# ---------------------------------------------------------------------------
# Expenses
# ---------------------------------------------------------------------------

class ExpenseCreate(BaseModel):
    date: datetime.date
    provider_name: str
    description: str
    amount: Decimal
    category: HsaCategory
    payment_method: PaymentMethod
    notes: str | None = None


class ExpenseUpdate(BaseModel):
    """Partial update — only supplied fields are written.

    Protected fields (id, created_at, updated_at) are excluded from the CRUD
    allowlist and will be silently ignored even if sent by the client.
    """
    date: datetime.date | None = None
    provider_name: str | None = None
    description: str | None = None
    amount: Decimal | None = None
    category: HsaCategory | None = None
    payment_method: PaymentMethod | None = None
    notes: str | None = None


class ExpenseOut(BaseModel):
    """Full expense representation returned from the API.

    Includes nested reimbursement (or null) and receipts list so the frontend
    can render everything without additional round-trips.
    """
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    date: datetime.date
    provider_name: str
    description: str
    amount: Decimal
    category: str
    payment_method: str
    notes: str | None
    reimbursement: ReimbursementSummary | None
    receipts: list[ReceiptOut]
    created_at: datetime.datetime
    updated_at: datetime.datetime


class PaginatedExpenses(BaseModel):
    items: list[ExpenseOut]
    total: int


# ---------------------------------------------------------------------------
# Contributions
# ---------------------------------------------------------------------------

class ContributionCreate(BaseModel):
    date: datetime.date   # actual deposit date
    amount: Decimal
    source: ContributionSource
    tax_year: int         # the tax year this deposit counts toward (may differ from date.year)
    notes: str | None = None

    @field_validator('tax_year')
    @classmethod
    def validate_tax_year(cls, v: int) -> int:
        """Reject years outside the CONTRIBUTION_LIMITS table to prevent typos."""
        if v not in CONTRIBUTION_LIMITS:
            raise ValueError(
                f'tax_year must be between {_MIN_TAX_YEAR} and {_MAX_TAX_YEAR}'
            )
        return v


class ContributionUpdate(BaseModel):
    date: datetime.date | None = None
    amount: Decimal | None = None
    source: ContributionSource | None = None
    tax_year: int | None = None
    notes: str | None = None

    @field_validator('tax_year')
    @classmethod
    def validate_tax_year(cls, v: int | None) -> int | None:
        """Reject years outside the CONTRIBUTION_LIMITS table to prevent typos."""
        if v is not None and v not in CONTRIBUTION_LIMITS:
            raise ValueError(
                f'tax_year must be between {_MIN_TAX_YEAR} and {_MAX_TAX_YEAR}'
            )
        return v


class ContributionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    date: datetime.date
    amount: Decimal
    source: str
    tax_year: int
    notes: str | None
    created_at: datetime.datetime
    updated_at: datetime.datetime


class PaginatedContributions(BaseModel):
    """Contributions list with IRS annual limits baked in.

    The router looks up limits from CONTRIBUTION_LIMITS (constants.py) and
    computes remaining headroom so the frontend can render the limit bar
    without a separate request.
    """
    items: list[ContributionOut]
    total_contributed: Decimal
    tax_year: int
    limit_individual: Decimal
    limit_family: Decimal
    remaining_individual: Decimal  # clamped to 0 if over the limit
    remaining_family: Decimal      # clamped to 0 if over the limit


# ---------------------------------------------------------------------------
# Account Balance
# ---------------------------------------------------------------------------

class BalanceCreate(BaseModel):
    balance: Decimal     # current account value as shown by the HSA custodian
    as_of_date: datetime.date
    notes: str | None = None


class BalanceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    balance: Decimal
    as_of_date: datetime.date
    notes: str | None
    created_at: datetime.datetime


class BalanceList(BaseModel):
    """All balance snapshots plus the most recent one surfaced for quick access."""
    items: list[BalanceOut]
    latest: BalanceOut | None  # None when no snapshots have been recorded yet


# ---------------------------------------------------------------------------
# Summary (dashboard)
# ---------------------------------------------------------------------------

class SummaryOut(BaseModel):
    """Aggregated yearly statistics for the dashboard.

    All values are scoped to the requested tax year. Computed in a single
    crud.get_summary() call to minimise round-trips.
    """
    year: int
    total_expenses: Decimal
    hsa_paid_expenses: Decimal
    out_of_pocket_expenses: Decimal
    pending_reimbursement: Decimal  # total awaiting repayment
    reimbursed_ytd: Decimal         # total already repaid this year
    total_contributed: Decimal
    limit_individual: Decimal
    limit_family: Decimal
    remaining_individual: Decimal
    remaining_family: Decimal
    latest_balance: Decimal | None       # None until the first balance snapshot is entered
    latest_balance_date: datetime.date | None


# ---------------------------------------------------------------------------
# App Settings (singleton)
# ---------------------------------------------------------------------------

class AppSettingsOut(BaseModel):
    """Persistent application preferences returned from GET /settings."""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    coverage_type: CoverageType
    catch_up_eligible: bool
    theme: ThemeChoice
    updated_at: datetime.datetime


class AppSettingsUpdate(BaseModel):
    """Fields that can be changed via PATCH /settings. All optional."""
    coverage_type: CoverageType | None = None
    catch_up_eligible: bool | None = None
    theme: ThemeChoice | None = None
