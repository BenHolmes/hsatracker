import uuid as _uuid
from decimal import Decimal
from pathlib import Path
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import Select, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.constants import ALLOWED_RECEIPT_MIME_TYPES, CONTRIBUTION_LIMITS
from app.models import AccountBalance, Contribution, Expense, Receipt, Reimbursement

# Explicit allowlists of columns that PATCH endpoints may modify.
# Prevents id / created_at / updated_at from ever being overwritten via setattr.
_EXPENSE_MUTABLE = frozenset({
    "date", "provider_name", "description", "amount",
    "category", "payment_method", "notes",
})
_REIMBURSEMENT_MUTABLE = frozenset({
    "status", "reimbursed_date", "reimbursed_amount", "notes",
})
_CONTRIBUTION_MUTABLE = frozenset({
    "date", "amount", "source", "tax_year", "notes",
})
from app.schemas import (
    BalanceCreate,
    ContributionCreate,
    ContributionUpdate,
    ExpenseCreate,
    ExpenseUpdate,
    ReimbursementCreate,
    ReimbursementUpdate,
)


# ---------------------------------------------------------------------------
# Expenses
# ---------------------------------------------------------------------------

def build_expenses_query(
    year: int | None = None,
    category: str | None = None,
    payment_method: str | None = None,
) -> Select:
    """Return a filterable Select statement for use with fastapi-pagination's paginate()."""
    query = (
        select(Expense)
        .options(selectinload(Expense.reimbursement), selectinload(Expense.receipts))
        .order_by(Expense.date.desc(), Expense.created_at.desc())
    )
    if year is not None:
        query = query.where(func.extract("year", Expense.date) == year)
    if category is not None:
        query = query.where(Expense.category == category)
    if payment_method is not None:
        query = query.where(Expense.payment_method == payment_method)
    return query


async def get_expense(db: AsyncSession, expense_id: UUID) -> Expense:
    result = await db.execute(
        select(Expense)
        .options(selectinload(Expense.reimbursement), selectinload(Expense.receipts))
        .where(Expense.id == expense_id)
    )
    expense = result.scalar_one_or_none()
    if expense is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expense not found")
    return expense


async def create_expense(db: AsyncSession, data: ExpenseCreate) -> Expense:
    expense = Expense(**data.model_dump())
    db.add(expense)
    await db.commit()
    await db.refresh(expense)
    # Reload with relationships
    return await get_expense(db, expense.id)


async def update_expense(db: AsyncSession, expense_id: UUID, data: ExpenseUpdate) -> Expense:
    expense = await get_expense(db, expense_id)
    for field, value in data.model_dump(exclude_unset=True).items():
        if field in _EXPENSE_MUTABLE:
            setattr(expense, field, value)
    await db.commit()
    await db.refresh(expense)
    return await get_expense(db, expense_id)


async def delete_expense(db: AsyncSession, expense_id: UUID) -> None:
    expense = await get_expense(db, expense_id)
    await db.delete(expense)
    await db.commit()


# ---------------------------------------------------------------------------
# Reimbursements
# ---------------------------------------------------------------------------

async def get_reimbursements(
    db: AsyncSession,
    status_filter: str | None = None,
    year: int | None = None,
) -> tuple[list[Reimbursement], int, Decimal, Decimal]:
    query = (
        select(Reimbursement)
        .options(selectinload(Reimbursement.expense))
        .order_by(Reimbursement.created_at.desc())
    )

    if status_filter is not None:
        query = query.where(Reimbursement.status == status_filter)
    if year is not None:
        query = query.join(Expense).where(func.extract("year", Expense.date) == year)

    items = (await db.execute(query)).scalars().all()
    total = len(items)

    pending_amount = sum(
        (r.expense.amount for r in items if r.status == "pending"),
        Decimal("0.00"),
    )
    reimbursed_amount_ytd = sum(
        (r.reimbursed_amount for r in items if r.status == "reimbursed" and r.reimbursed_amount),
        Decimal("0.00"),
    )

    return list(items), total, pending_amount, reimbursed_amount_ytd


async def get_reimbursement(db: AsyncSession, reimbursement_id: UUID) -> Reimbursement:
    result = await db.execute(
        select(Reimbursement)
        .options(selectinload(Reimbursement.expense))
        .where(Reimbursement.id == reimbursement_id)
    )
    reimbursement = result.scalar_one_or_none()
    if reimbursement is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reimbursement not found")
    return reimbursement


async def create_reimbursement(db: AsyncSession, data: ReimbursementCreate) -> Reimbursement:
    # Validate expense exists and is out-of-pocket
    expense = await db.get(Expense, data.expense_id)
    if expense is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expense not found")
    if expense.payment_method != "out_of_pocket":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only out-of-pocket expenses can be reimbursed",
        )

    # Validate no existing reimbursement for this expense
    existing = await db.execute(
        select(Reimbursement).where(Reimbursement.expense_id == data.expense_id)
    )
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A reimbursement record already exists for this expense",
        )

    reimbursement = Reimbursement(
        expense_id=data.expense_id,
        status="pending",
        notes=data.notes,
    )
    db.add(reimbursement)
    await db.commit()
    await db.refresh(reimbursement)
    return await get_reimbursement(db, reimbursement.id)


async def update_reimbursement(
    db: AsyncSession, reimbursement_id: UUID, data: ReimbursementUpdate
) -> Reimbursement:
    reimbursement = await get_reimbursement(db, reimbursement_id)
    for field, value in data.model_dump(exclude_unset=True).items():
        if field in _REIMBURSEMENT_MUTABLE:
            setattr(reimbursement, field, value)
    await db.commit()
    await db.refresh(reimbursement)
    return await get_reimbursement(db, reimbursement_id)


async def delete_reimbursement(db: AsyncSession, reimbursement_id: UUID) -> None:
    reimbursement = await get_reimbursement(db, reimbursement_id)
    await db.delete(reimbursement)
    await db.commit()


# ---------------------------------------------------------------------------
# Receipts
# ---------------------------------------------------------------------------

_MIME_TO_EXT = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "application/pdf": ".pdf",
}


async def create_receipt(
    db: AsyncSession,
    expense_id: UUID,
    content: bytes,
    original_filename: str,
    mime_type: str,
    upload_dir: Path,
    max_size_mb: int,
) -> Receipt:
    if mime_type not in ALLOWED_RECEIPT_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type '{mime_type}'. Allowed: jpeg, png, pdf",
        )
    max_bytes = max_size_mb * 1024 * 1024
    if len(content) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File exceeds maximum size of {max_size_mb}MB",
        )

    # Validate expense exists
    expense = await db.get(Expense, expense_id)
    if expense is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expense not found")

    ext = _MIME_TO_EXT[mime_type]
    filename = f"{_uuid.uuid4()}{ext}"
    storage_path = filename

    upload_dir.mkdir(parents=True, exist_ok=True)
    (upload_dir / filename).write_bytes(content)

    receipt = Receipt(
        expense_id=expense_id,
        filename=filename,
        original_filename=original_filename,
        mime_type=mime_type,
        file_size=len(content),
        storage_path=storage_path,
    )
    db.add(receipt)
    await db.commit()
    await db.refresh(receipt)
    return receipt


async def get_receipts_for_expense(db: AsyncSession, expense_id: UUID) -> list[Receipt]:
    # Validate expense exists
    expense = await db.get(Expense, expense_id)
    if expense is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expense not found")
    result = await db.execute(
        select(Receipt).where(Receipt.expense_id == expense_id).order_by(Receipt.created_at)
    )
    return list(result.scalars().all())


async def get_receipt(db: AsyncSession, receipt_id: UUID) -> Receipt:
    receipt = await db.get(Receipt, receipt_id)
    if receipt is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Receipt not found")
    return receipt


async def delete_receipt(db: AsyncSession, receipt_id: UUID, upload_dir: Path) -> None:
    receipt = await get_receipt(db, receipt_id)
    file_path = upload_dir / receipt.storage_path
    await db.delete(receipt)
    await db.commit()
    # Delete file after DB commit — missing file is not an error
    try:
        file_path.unlink()
    except FileNotFoundError:
        pass


# ---------------------------------------------------------------------------
# Contributions
# ---------------------------------------------------------------------------

async def get_contributions(
    db: AsyncSession, tax_year: int
) -> tuple[list[Contribution], Decimal]:
    result = await db.execute(
        select(Contribution)
        .where(Contribution.tax_year == tax_year)
        .order_by(Contribution.date.desc())
    )
    items = list(result.scalars().all())
    total = sum((c.amount for c in items), Decimal("0.00"))
    return items, total


async def get_contribution(db: AsyncSession, contribution_id: UUID) -> Contribution:
    obj = await db.get(Contribution, contribution_id)
    if obj is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contribution not found")
    return obj


async def create_contribution(db: AsyncSession, data: ContributionCreate) -> Contribution:
    obj = Contribution(**data.model_dump())
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


async def update_contribution(
    db: AsyncSession, contribution_id: UUID, data: ContributionUpdate
) -> Contribution:
    obj = await get_contribution(db, contribution_id)
    for field, value in data.model_dump(exclude_unset=True).items():
        if field in _CONTRIBUTION_MUTABLE:
            setattr(obj, field, value)
    await db.commit()
    await db.refresh(obj)
    return obj


async def delete_contribution(db: AsyncSession, contribution_id: UUID) -> None:
    obj = await get_contribution(db, contribution_id)
    await db.delete(obj)
    await db.commit()


# ---------------------------------------------------------------------------
# Account Balance
# ---------------------------------------------------------------------------

async def get_balances(db: AsyncSession) -> tuple[list[AccountBalance], AccountBalance | None]:
    result = await db.execute(
        select(AccountBalance).order_by(AccountBalance.as_of_date.desc())
    )
    items = list(result.scalars().all())
    latest = items[0] if items else None
    return items, latest


async def get_balance(db: AsyncSession, balance_id: UUID) -> AccountBalance:
    obj = await db.get(AccountBalance, balance_id)
    if obj is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Balance not found")
    return obj


async def create_balance(db: AsyncSession, data: BalanceCreate) -> AccountBalance:
    obj = AccountBalance(**data.model_dump())
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


async def delete_balance(db: AsyncSession, balance_id: UUID) -> None:
    obj = await get_balance(db, balance_id)
    await db.delete(obj)
    await db.commit()


# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------

async def get_summary(db: AsyncSession, year: int) -> dict:
    # Expenses
    expenses_result = await db.execute(
        select(Expense).where(func.extract("year", Expense.date) == year)
    )
    expenses = list(expenses_result.scalars().all())

    total_expenses = sum((e.amount for e in expenses), Decimal("0.00"))
    hsa_paid = sum((e.amount for e in expenses if e.payment_method == "hsa"), Decimal("0.00"))
    out_of_pocket = sum(
        (e.amount for e in expenses if e.payment_method == "out_of_pocket"), Decimal("0.00")
    )

    # Reimbursements (for expenses in this year)
    expense_ids = [e.id for e in expenses]
    pending_amount = Decimal("0.00")
    reimbursed_ytd = Decimal("0.00")
    if expense_ids:
        reimb_result = await db.execute(
            select(Reimbursement).where(Reimbursement.expense_id.in_(expense_ids))
        )
        reimbursements = list(reimb_result.scalars().all())
        expense_map = {e.id: e for e in expenses}
        pending_amount = sum(
            (expense_map[r.expense_id].amount for r in reimbursements if r.status == "pending"),
            Decimal("0.00"),
        )
        reimbursed_ytd = sum(
            (r.reimbursed_amount for r in reimbursements
             if r.status == "reimbursed" and r.reimbursed_amount),
            Decimal("0.00"),
        )

    # Contributions
    contrib_result = await db.execute(
        select(Contribution).where(Contribution.tax_year == year)
    )
    contributions = list(contrib_result.scalars().all())
    total_contributed = sum((c.amount for c in contributions), Decimal("0.00"))

    limits = CONTRIBUTION_LIMITS.get(year, CONTRIBUTION_LIMITS[max(CONTRIBUTION_LIMITS)])
    limit_individual = Decimal(limits[0])
    limit_family = Decimal(limits[1])

    # Latest balance
    balance_result = await db.execute(
        select(AccountBalance).order_by(AccountBalance.as_of_date.desc()).limit(1)
    )
    latest_balance_obj = balance_result.scalar_one_or_none()

    return {
        "year": year,
        "total_expenses": total_expenses,
        "hsa_paid_expenses": hsa_paid,
        "out_of_pocket_expenses": out_of_pocket,
        "pending_reimbursement": pending_amount,
        "reimbursed_ytd": reimbursed_ytd,
        "total_contributed": total_contributed,
        "limit_individual": limit_individual,
        "limit_family": limit_family,
        "remaining_individual": max(limit_individual - total_contributed, Decimal("0.00")),
        "remaining_family": max(limit_family - total_contributed, Decimal("0.00")),
        "latest_balance": latest_balance_obj.balance if latest_balance_obj else None,
        "latest_balance_date": latest_balance_obj.as_of_date if latest_balance_obj else None,
    }
