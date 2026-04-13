from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import expenses, reimbursements

app = FastAPI(title="HSATracker API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(expenses.router, prefix="/api/v1/expenses", tags=["expenses"])
app.include_router(reimbursements.router, prefix="/api/v1/reimbursements", tags=["reimbursements"])


@app.get("/api/v1/health")
async def health() -> dict:
    return {"status": "ok"}
