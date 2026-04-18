"""
Contribution CRUD endpoints.

The list endpoint enriches the raw DB rows with IRS annual contribution
limits and computes remaining headroom so the frontend can render the
limit bar without a separate request.
"""

from __future__ import annotations

import datetime
from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app import crud
from app.constants import CONTRIBUTION_LIMITS
from app.database import get_db
from app.schemas import ContributionCreate, ContributionOut, ContributionUpdate, PaginatedContributions

_CATCH_UP_AMOUNT = Decimal("1000.00")

router = APIRouter()


@router.get("/", response_model=PaginatedContributions)
async def list_contributions(
    tax_year: int = Query(default_factory=lambda: datetime.date.today().year),
    db: AsyncSession = Depends(get_db),
):
    """Return all contributions for a tax year with IRS limit data.

    Falls back to the most recent known year's limits when tax_year is not
    yet in the CONTRIBUTION_LIMITS table (e.g. a future year).
    """
    items, total_contributed = await crud.get_contributions(db, tax_year)
    app_settings = await crud.get_settings(db)

    # Fall back to the latest year in the table if the requested year is unknown
    limits = CONTRIBUTION_LIMITS.get(tax_year, CONTRIBUTION_LIMITS[max(CONTRIBUTION_LIMITS)])
    limit_individual = Decimal(limits[0])
    limit_family = Decimal(limits[1])

    # IRS allows an additional $1,000 catch-up contribution for account holders
    # who are age 55 or older.
    if app_settings.catch_up_eligible:
        limit_individual += _CATCH_UP_AMOUNT
        limit_family += _CATCH_UP_AMOUNT

    return PaginatedContributions(
        items=items,
        total_contributed=total_contributed,
        tax_year=tax_year,
        limit_individual=limit_individual,
        limit_family=limit_family,
        # Clamp to 0 so the UI never shows a negative "remaining" value
        remaining_individual=max(limit_individual - total_contributed, Decimal("0.00")),
        remaining_family=max(limit_family - total_contributed, Decimal("0.00")),
    )


@router.post("/", response_model=ContributionOut, status_code=status.HTTP_201_CREATED)
async def create_contribution(
    data: ContributionCreate,
    db: AsyncSession = Depends(get_db),
):
    """Record a new HSA contribution."""
    return await crud.create_contribution(db, data)


@router.get("/years", response_model=list[int])
async def list_contribution_years(db: AsyncSession = Depends(get_db)):
    """Return distinct tax years present in the contributions table, newest first."""
    return await crud.get_contribution_years(db)


@router.patch("/{contribution_id}", response_model=ContributionOut)
async def update_contribution(
    contribution_id: UUID,
    data: ContributionUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Partially update a contribution record."""
    return await crud.update_contribution(db, contribution_id, data)


@router.delete("/{contribution_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_contribution(
    contribution_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Delete a contribution record."""
    await crud.delete_contribution(db, contribution_id)
