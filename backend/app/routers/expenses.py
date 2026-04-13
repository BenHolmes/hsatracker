from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app import crud
from app.database import get_db
from app.schemas import ExpenseCreate, ExpenseOut, ExpenseUpdate, PaginatedExpenses

router = APIRouter()


@router.get("/", response_model=PaginatedExpenses)
async def list_expenses(
    year: int | None = Query(None),
    category: str | None = Query(None),
    payment_method: str | None = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    items, total = await crud.get_expenses(
        db, year=year, category=category, payment_method=payment_method,
        limit=limit, offset=offset,
    )
    return PaginatedExpenses(items=items, total=total)


@router.post("/", response_model=ExpenseOut, status_code=status.HTTP_201_CREATED)
async def create_expense(
    data: ExpenseCreate,
    db: AsyncSession = Depends(get_db),
):
    return await crud.create_expense(db, data)


@router.get("/{expense_id}", response_model=ExpenseOut)
async def get_expense(
    expense_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    return await crud.get_expense(db, expense_id)


@router.patch("/{expense_id}", response_model=ExpenseOut)
async def update_expense(
    expense_id: UUID,
    data: ExpenseUpdate,
    db: AsyncSession = Depends(get_db),
):
    return await crud.update_expense(db, expense_id, data)


@router.delete("/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_expense(
    expense_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    await crud.delete_expense(db, expense_id)
