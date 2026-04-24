"""
Receipt upload, download, and deletion endpoints.

Two routers are defined here and mounted separately in main.py:
  - expense_router: nested under /expenses/{id}/receipts for upload and listing
  - receipts_router: standalone under /receipts/{id} for file download and deletion

This split keeps the REST structure intuitive — receipts are created in the
context of an expense, but accessed/deleted directly by their own ID.
"""

import os
from pathlib import Path
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app import crud
from app.database import get_db
from app.schemas import ReceiptOut

expense_router  = APIRouter()
receipts_router = APIRouter()


def _upload_dir() -> Path:
    """Returns the directory where receipt files are stored on disk.

    Defaults to /app/uploads, which is bind-mounted from ./data/uploads on
    the host so files persist across container restarts and are easy to back up.
    """
    return Path(os.environ.get("UPLOAD_DIR", "/app/uploads"))


def _max_size_mb() -> int:
    """Returns the maximum allowed upload size in megabytes (default 10)."""
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
    """Upload a receipt file and attach it to an expense.

    Validates MIME type allowlist, file magic bytes, and size limit before
    writing to disk. The file is renamed to a UUID on disk to avoid collisions;
    the original filename is preserved in the database for display.
    """
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
    """Return all receipt metadata for an expense, ordered by upload time."""
    return await crud.get_receipts_for_expense(db, expense_id)


@receipts_router.get("/{receipt_id}/file")
async def download_receipt(
    receipt_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Stream a receipt file back to the browser.

    Uses content_disposition_type='inline' so images and PDFs render
    directly in the browser rather than triggering a download.
    Returns 404 if the DB record exists but the file is missing from disk
    (e.g. after a volume was wiped).
    """
    receipt = await crud.get_receipt(db, receipt_id)
    upload_dir = _upload_dir()
    file_path = upload_dir / receipt.storage_path
    # Path-traversal guard: ensure the resolved path stays inside upload_dir
    try:
        file_path.resolve().relative_to(upload_dir.resolve())
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid file path"
        )
    if not file_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Receipt file not found on disk",
        )
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
    """Delete a receipt record and its file from disk.

    The DB row is deleted first; the file deletion happens after commit so a
    DB failure doesn't leave orphaned records. A missing file is not treated
    as an error since the important thing is that the DB record is gone.
    """
    await crud.delete_receipt(db, receipt_id, _upload_dir())
