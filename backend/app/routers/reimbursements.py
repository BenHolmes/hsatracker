from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app import crud
from app.database import get_db
from app.schemas import (
    PaginatedReimbursements,
    ReimbursementCreate,
    ReimbursementOut,
    ReimbursementUpdate,
)

router = APIRouter()


@router.get("/", response_model=PaginatedReimbursements)
async def list_reimbursements(
    status: str | None = Query(None),
    year: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    items, total, pending_amount, reimbursed_amount_ytd = await crud.get_reimbursements(
        db, status_filter=status, year=year
    )
    return PaginatedReimbursements(
        items=items,
        total=total,
        pending_amount=pending_amount,
        reimbursed_amount_ytd=reimbursed_amount_ytd,
    )


@router.post("/", response_model=ReimbursementOut, status_code=status.HTTP_201_CREATED)
async def create_reimbursement(
    data: ReimbursementCreate,
    db: AsyncSession = Depends(get_db),
):
    return await crud.create_reimbursement(db, data)


@router.patch("/{reimbursement_id}", response_model=ReimbursementOut)
async def update_reimbursement(
    reimbursement_id: UUID,
    data: ReimbursementUpdate,
    db: AsyncSession = Depends(get_db),
):
    return await crud.update_reimbursement(db, reimbursement_id, data)


@router.delete("/{reimbursement_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_reimbursement(
    reimbursement_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    await crud.delete_reimbursement(db, reimbursement_id)
