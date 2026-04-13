from decimal import Decimal
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import Expense, Reimbursement
from app.schemas import ExpenseCreate, ExpenseUpdate, ReimbursementCreate, ReimbursementUpdate


# ---------------------------------------------------------------------------
# Expenses
# ---------------------------------------------------------------------------

async def get_expenses(
    db: AsyncSession,
    year: int | None = None,
    category: str | None = None,
    payment_method: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> tuple[list[Expense], int]:
    query = (
        select(Expense)
        .options(selectinload(Expense.reimbursement), selectinload(Expense.receipts))
        .order_by(Expense.date.desc(), Expense.created_at.desc())
    )
    count_query = select(func.count()).select_from(Expense)

    if year is not None:
        query = query.where(func.extract("year", Expense.date) == year)
        count_query = count_query.where(func.extract("year", Expense.date) == year)
    if category is not None:
        query = query.where(Expense.category == category)
        count_query = count_query.where(Expense.category == category)
    if payment_method is not None:
        query = query.where(Expense.payment_method == payment_method)
        count_query = count_query.where(Expense.payment_method == payment_method)

    total = (await db.execute(count_query)).scalar_one()
    items = (await db.execute(query.limit(limit).offset(offset))).scalars().all()
    return list(items), total


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
    updates = data.model_dump(exclude_unset=True)
    for field, value in updates.items():
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
    updates = data.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(reimbursement, field, value)
    await db.commit()
    await db.refresh(reimbursement)
    return await get_reimbursement(db, reimbursement_id)


async def delete_reimbursement(db: AsyncSession, reimbursement_id: UUID) -> None:
    reimbursement = await get_reimbursement(db, reimbursement_id)
    await db.delete(reimbursement)
    await db.commit()
