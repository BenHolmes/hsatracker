"""
HSATracker FastAPI application entry point.

Mounts all API routers under /api/v1 and configures CORS for local
development (Vite dev server on :5173) and production (Nginx on :3000).

Receipts use two separate routers because the endpoints are split across
two URL namespaces:
  - POST/GET /api/v1/expenses/{id}/receipts  → expense_router
  - GET/DELETE /api/v1/receipts/{id}/...     → receipts_router
Both are defined in routers/receipts.py and mounted here with different prefixes.
"""

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi_pagination import add_pagination

from app.routers import balance, contributions, expenses, reimbursements, summary
from app.routers.receipts import expense_router as receipts_expense_router
from app.routers.receipts import receipts_router

app = FastAPI(title="HSATracker API", version="1.0.0")

# CORS origins are loaded from the environment so deployments on custom domains
# work without code changes. The default covers both the Vite dev server and
# the production Nginx container.
_raw_origins = os.environ.get(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,http://localhost:3000",
)
_allowed_origins = [o.strip() for o in _raw_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(expenses.router,       prefix="/api/v1/expenses",       tags=["expenses"])
app.include_router(reimbursements.router, prefix="/api/v1/reimbursements",  tags=["reimbursements"])
app.include_router(contributions.router,  prefix="/api/v1/contributions",   tags=["contributions"])
app.include_router(balance.router,        prefix="/api/v1/balance",         tags=["balance"])
app.include_router(summary.router,        prefix="/api/v1/summary",         tags=["summary"])
# Receipt endpoints split across two prefixes (see module docstring above)
app.include_router(receipts_expense_router, prefix="/api/v1/expenses", tags=["receipts"])
app.include_router(receipts_router,         prefix="/api/v1/receipts", tags=["receipts"])

# Registers fastapi-pagination's Page/CustomizedPage response middleware
add_pagination(app)


@app.get("/api/v1/health")
async def health() -> dict:
    """Liveness check used by Docker Compose and load balancers."""
    return {"status": "ok"}
