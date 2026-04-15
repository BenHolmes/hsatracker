# HSATracker

A self-hosted, privacy-first HSA expense tracker. All data stays on your machine — no subscriptions, no third-party servers, no data mining.

Built as a local alternative to Shoebox.io and TrackHSA.com.

[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20A%20Coffee-ffdd00?style=flat&logo=buy-me-a-coffee&logoColor=black)](https://buymeacoffee.com/benholmes)

---

## Features

- **Expense tracking** — log HSA-eligible expenses with category, payment method, provider, and receipts
- **Receipt storage** — attach JPG, PNG, or PDF receipts; files stored on your host filesystem
- **Reimbursement tracking** — track out-of-pocket expenses through pending → reimbursed lifecycle
- **Contribution tracking** — record HSA deposits by source (self / employer / other) with IRS annual limit bars
- **Balance snapshots** — manually record your HSA balance over time
- **Dashboard** — yearly summary cards: balance, total expenses, reimbursement totals, contribution progress
- **Pagination & filters** — filter expenses by year, category, and payment method; paginated at 50/page

**Stack:** React 19 + TypeScript + Vite · FastAPI · PostgreSQL · Docker Compose

---

## Quick Start

```bash
# 1. Clone
git clone https://github.com/yourname/hsatracker.git
cd hsatracker

# 2. Configure
cp .env.example .env
# Edit .env — at minimum set a strong POSTGRES_PASSWORD

# 3. Start
docker compose up --build -d

# 4. Open
open http://localhost:3000
```

Database migrations run automatically on startup. The `./data/uploads/` directory is created on first upload.

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `POSTGRES_DB` | `hsatracker` | PostgreSQL database name |
| `POSTGRES_USER` | `hsatracker` | PostgreSQL username |
| `POSTGRES_PASSWORD` | `changeme` | PostgreSQL password — **change this** |
| `PORT` | `3000` | Host port the frontend is exposed on |
| `UPLOAD_DIR` | `/app/uploads` | Path inside the backend container for receipt files |
| `MAX_UPLOAD_SIZE_MB` | `10` | Maximum receipt file size in MB |
| `ALLOWED_ORIGINS` | `http://localhost:5173,http://localhost:3000` | Comma-separated list of allowed CORS origins |

---

## Data & Backups

All data lives in two places:

| What | Where |
|---|---|
| Database | Docker named volume `postgres_data` |
| Receipt files | `./data/uploads/` on the host (bind mount) |

**Backup:**
```bash
# Database
docker exec hsatracker-db-1 pg_dump -U hsatracker hsatracker > backup.sql

# Receipt files
cp -r ./data/uploads ./backups/uploads-$(date +%Y%m%d)
```

**Restore:**
```bash
docker exec -i hsatracker-db-1 psql -U hsatracker hsatracker < backup.sql
```

---

## API

### Endpoints

| Resource | Endpoints |
|---|---|
| Expenses | `GET/POST /api/v1/expenses/` · `GET/PATCH/DELETE /api/v1/expenses/{id}` |
| Receipts | `POST/GET /api/v1/expenses/{id}/receipts/` · `GET/DELETE /api/v1/receipts/{id}/file` |
| Reimbursements | `GET/POST /api/v1/reimbursements/` · `PATCH/DELETE /api/v1/reimbursements/{id}` |
| Contributions | `GET/POST /api/v1/contributions/` · `PATCH/DELETE /api/v1/contributions/{id}` |
| Balance | `GET/POST /api/v1/balance/` · `DELETE /api/v1/balance/{id}` |
| Summary | `GET /api/v1/summary/` |

---

## Development

```bash
# Start the database and backend
cp .env.example .env
docker compose up db backend --build -d

# Start the frontend dev server (hot reload)
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

The Vite dev server proxies `/api` to `http://localhost:8000`, so the frontend talks to the Docker backend directly.

---

## Project Structure

```
hsatracker/
├── docker-compose.yml
├── .env.example
├── data/uploads/          # receipt files (created on first upload)
├── backend/
│   ├── Dockerfile
│   ├── pyproject.toml
│   ├── alembic/           # database migrations
│   └── app/
│       ├── main.py
│       ├── models.py      # SQLAlchemy ORM models
│       ├── schemas.py     # Pydantic request/response schemas
│       ├── crud.py        # database query functions
│       ├── constants.py   # HSA categories, IRS contribution limits
│       └── routers/       # one file per resource
└── frontend/
    ├── Dockerfile
    ├── nginx.conf
    └── src/
        ├── api/           # Axios API functions
        ├── components/    # reusable UI components
        ├── pages/         # top-level page components
        ├── lib/           # formatters, constants
        └── types/         # TypeScript interfaces
```

---

## IRS Contribution Limits (built-in)

| Year | Individual | Family |
|---|---|---|
| 2024 | $4,150 | $8,300 |
| 2025 | $4,300 | $8,550 |
| 2026 | $4,400 | $8,750 |

Limits for years not in the table fall back to the most recent known year.
