import os
from pathlib import Path
from uuid import UUID

from fastapi import APIRouter, Depends, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app import crud
from app.database import get_db
from app.schemas import ReceiptOut

# Two routers: one nested under /expenses, one standalone under /receipts
expense_router = APIRouter()
receipts_router = APIRouter()


def _upload_dir() -> Path:
    return Path(os.environ.get("UPLOAD_DIR", "/app/uploads"))


def _max_size_mb() -> int:
    return int(os.environ.get("MAX_UPLOAD_SIZE_MB", "10"))


@expense_router.post(
    "/{expense_id}/receipts/",
    response_model=ReceiptOut,
    status_code=status.HTTP_201_CREATED,
)
async def upload_receipt(
    expense_id: UUID,
    file: UploadFile,
    db: AsyncSession = Depends(get_db),
):
    content = await file.read()
    return await crud.create_receipt(
        db,
        expense_id=expense_id,
        content=content,
        original_filename=file.filename or "upload",
        mime_type=file.content_type or "",
        upload_dir=_upload_dir(),
        max_size_mb=_max_size_mb(),
    )


@expense_router.get("/{expense_id}/receipts/", response_model=list[ReceiptOut])
async def list_receipts(
    expense_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    return await crud.get_receipts_for_expense(db, expense_id)


@receipts_router.get("/{receipt_id}/file")
async def download_receipt(
    receipt_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    receipt = await crud.get_receipt(db, receipt_id)
    file_path = _upload_dir() / receipt.storage_path
    return FileResponse(
        path=str(file_path),
        media_type=receipt.mime_type,
        filename=receipt.original_filename,
        content_disposition_type="inline",
    )


@receipts_router.delete("/{receipt_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_receipt(
    receipt_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    await crud.delete_receipt(db, receipt_id, _upload_dir())
