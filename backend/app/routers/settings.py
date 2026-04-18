"""
Application settings endpoints.

GET  /  — return the singleton preferences row (creates defaults on first call)
PATCH /  — partially update preferences; only coverage_type and catch_up_eligible
           may be changed; id / updated_at are managed by the server.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends

from app import crud
from app.database import get_db
from app.schemas import AppSettingsOut, AppSettingsUpdate
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter()


@router.get("/", response_model=AppSettingsOut)
async def get_settings(db: AsyncSession = Depends(get_db)):
    """Return the current application preferences."""
    return await crud.get_settings(db)


@router.patch("/", response_model=AppSettingsOut)
async def update_settings(
    data: AppSettingsUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Partially update application preferences."""
    return await crud.update_settings(db, data)
