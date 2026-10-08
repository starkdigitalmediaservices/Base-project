# Base Project — React + FastAPI + PostgreSQL foundation

A reusable, production-oriented full-stack starting point. It contains **no business modules**.
It provides the foundation every new application needs:

- **Backend:** FastAPI with JWT access tokens, rotating refresh tokens in httpOnly cookies, and
  role-based permissions. It also has user and role administration, audit logs, database-level
  pagination, Alembic migrations, structured logging, and a consistent error format.
- **Frontend:** React and TypeScript on Vite and Bootstrap. It includes a light/dark design
  system, a responsive app shell, a reusable component library and style guide, forms that show
  backend validation errors, and a server-paginated data table. It also has protected,
  permission-aware routing and a centralized API client.
- **Rules for AI tools:** [`rules.md`](rules.md) holds the mandatory rules.
  [`memory.md`](memory.md) is the append-only decision log. AI tools must read both before
  changing anything.

> ⚠️ Demo content (dashboard numbers, sample data in the style guide) is labeled as demo data in
> the UI. The authentication is real (FastAPI + PostgreSQL), but review the
> [security checklist](#production-checklist) before going to production.

---

## Contents

1. [Root structure](#root-structure)
2. [Technology stack and versions](#technology-stack-and-versions)
3. [Prerequisites](#prerequisites)
4. [Quick start](#quick-start)
5. [Running with run.sh](#running-with-runsh)
6. [Environment setup](#environment-setup)
7. [PostgreSQL setup](#postgresql-setup)
8. [Backend: manual commands](#backend-manual-commands)
9. [Frontend: manual commands](#frontend-manual-commands)
10. [Quality commands (test, lint, format, build)](#quality-commands)
11. [API documentation](#api-documentation)
12. [Authentication flow](#authentication-flow)
13. [Authorization (roles and permissions)](#authorization)
14. [Pagination](#pagination)
15. [Database design and indexes](#database-design-and-indexes)
16. [Theme customization](#theme-customization)
17. [Adding frontend components and pages](#adding-frontend-components-and-pages)
18. [Adding backend features](#adding-backend-features)
19. [Working with AI tools: rules.md and memory.md](#working-with-ai-tools)
20. [Building business modules on this base](#building-business-modules-on-this-base)
21. [Production checklist](#production-checklist)
22. [Troubleshooting](#troubleshooting)

---

## Root structure

```text
project-root/
├── frontend/                 React + TypeScript + Vite + Bootstrap (see "Frontend")
├── backend/                  FastAPI + SQLAlchemy 2 + Alembic + PostgreSQL (see "Backend")
├── rules.md                  Mandatory development rules for humans and AI tools
├── memory.md                 Append-only change history / decision log
├── AGENTS.md, CLAUDE.md      Pointers that make AI tools read rules.md and memory.md
├── README.md                 This file
├── run.sh                    Starts/stops backend + frontend locally (see "Running with run.sh")
├── .run/                     run.sh state: pid files and logs (git-ignored, created on demand)
└── .gitignore
```

No Docker is used anywhere. The backend runs in a Python virtual environment
(`backend/.venv`), the frontend with Node.js, and the database is a normally installed
PostgreSQL.

### Backend layout

```text
backend/
├── app/
│   ├── api/
│   │   ├── routes/           health, auth, users, roles, audit_logs (thin HTTP handlers)
│   │   ├── dependencies.py   DB session, current user, require_permission, pagination params
│   │   ├── cookies.py        refresh-token cookie helpers
│   │   └── router.py         /api/v1 router registration + OpenAPI tags
│   ├── core/
│   │   ├── config.py         all settings (pydantic-settings, env vars)
│   │   ├── security.py       Argon2 hashing, JWT, refresh-token generation/hashing
│   │   ├── permissions.py    role → permission policy (single source of truth)
│   │   ├── logging.py        structured JSON / console logging with request IDs
│   │   ├── exceptions.py     AppError hierarchy + global error envelope handlers
│   │   └── middleware.py     request ID, access log, security headers
│   ├── db/
│   │   ├── base.py           DeclarativeBase, naming convention, timestamp mixins
│   │   ├── session.py        engine + session factory
│   │   └── migrations/       Alembic env + versions/
│   ├── models/               Role, User, RefreshToken, AuditLog
│   ├── schemas/              Pydantic request/response models, Page[T]
│   ├── repositories/         SQL queries only (incl. base.py pagination helpers)
│   ├── services/             business logic + transactions + audit logging
│   ├── utils/                SQL helpers (LIKE escaping, stable ordering), time, request info
│   ├── scripts/manage.py     seed / purge-tokens commands
│   └── main.py               app factory (`uvicorn app.main:app`)
├── tests/                    unit/ and integration/ (real PostgreSQL)
├── alembic.ini
├── pyproject.toml            deps + Ruff + mypy + pytest config
├── uv.lock                   locked dependency graph (maintainers regenerate requirements*.txt from it)
├── requirements*.txt         pinned dependencies installed into .venv (dev = runtime + tools)
├── .venv/                    virtual environment (git-ignored, created by run.sh)
└── .env.example
```

### Frontend layout

```text
frontend/
├── public/                   theme-init.js (applies the saved theme before first paint), favicon
├── src/
│   ├── assets/               images bundled by Vite
│   ├── components/
│   │   ├── ui/               AppButton, Icon, AppCard, PageHeader, Breadcrumbs, StatusBadge, Avatar,
│   │   │                     ResponsiveImage, LoadingSpinner, Skeleton, Empty/Error/Success/WarningState,
│   │   │                     AppModal, ConfirmDialog, PaginationControls, PageSizeSelect
│   │   ├── forms/            TextField, SelectField, TextAreaField, Checkbox/SwitchField, RadioGroupField,
│   │   │                     DateField, FileField, SearchInput, FormErrorAlert
│   │   ├── data-table/       DataTable (+ toolbar, footer, row actions), useDataTableState, toPageQuery
│   │   └── feedback/         ToastProvider / useToast
│   ├── features/             auth, users, roles, account, dashboard, showcase (api hooks, forms, columns)
│   ├── hooks/                usePaginatedQuery, useDebouncedCallback, useDisclosure, useFormModal, …
│   ├── layouts/              AppLayout (header, collapsible sidebar/offcanvas, footer), AuthLayout,
│   │                         navigation.ts (sidebar items + permissions)
│   ├── pages/                Login, Dashboard, ComponentShowcase, Users, Roles, Account, NotFound, Unauthorized
│   ├── routes/               paths.ts (ROUTES), router.tsx, lazyPages.tsx, guards (RequireAuth,
│   │                         RequirePermission, PublicOnlyRoute), RouteErrorPage
│   ├── services/             apiClient (fetch wrapper, token, refresh/retry), ApiError, sessionStore,
│   │                         auth/users/roles services, queryClient, queryKeys
│   ├── store/                SidebarProvider (UI state)
│   ├── theme/                tokens.css, bootstrap-overrides.css, ThemeProvider, ThemeSwitcher
│   ├── types/                API types (Page<T>, CurrentUser, Role, error envelope, …)
│   ├── utils/                env, queryString, format, csv, pagination, formErrors, clsx
│   ├── styles/               global.css
│   ├── test/                 Vitest setup and test utilities
│   ├── App.tsx
│   └── main.tsx
├── .env.example, .nvmrc
├── package.json / package-lock.json
├── tsconfig*.json, vite.config.ts, vitest.config.ts, eslint.config.js, .prettierrc.json
```

---

## Technology stack and versions

Versions are the latest stable releases as of **2026-10-07**, locked in `frontend/package-lock.json`
and `backend/uv.lock`.

| Layer | Technology | Version |
| --- | --- | --- |
| Runtime | Node.js (LTS) / npm | 24.x (`.nvmrc`; `engines` ≥ 22.22) / 11.x |
| Frontend | React / React DOM | 19.3 |
| | Vite / @vitejs/plugin-react | 8.3 / 6.1 |
| | TypeScript | 6.0.3 (see note) |
| | React Router | 8.4 |
| | TanStack Query | 5.104 |
| | Bootstrap / React-Bootstrap / Bootstrap Icons | 5.3.8 / 2.10.10 / 1.13.1 |
| | React Hook Form / Zod / @hookform/resolvers | 7.89 / 4.6 / 5.9 |
| | ESLint / typescript-eslint / Prettier | 10.12 / 8.71.1 / 3.9.9 |
| | Vitest / Testing Library (React) / jsdom | 5.0.3 / 16.3.3 / 29.1.1 |
| Runtime | Python | ≥ 3.11 (verified on 3.11.7) |
| Backend | FastAPI / Starlette / Uvicorn | 0.142.2 / 1.7.0 / 0.54.0 |
| | SQLAlchemy / Alembic | 2.1.3 / 1.20.0 |
| | Pydantic / pydantic-settings | 2.13.5 / 2.15.0 |
| | psycopg (binary) | 3.3.6 |
| | pwdlib (Argon2id) / PyJWT | 0.3.1 / 2.15.1 |
| | pytest / Ruff / mypy | 9.1.1 / 0.16.10 / 2.4.0 |
| Database | PostgreSQL (local installation) | 14+ recommended (verified on 12.22 and 18) |

> **TypeScript note:** TypeScript 7 (the native Go port) is the newest release, but
> typescript-eslint 8.71 supports only `<6.1`. The project therefore uses TypeScript 6.0 so that
> type-aware linting works. Upgrade once typescript-eslint supports TS 7.
>
> **Other pins:** jsdom stays on 29.x because jsdom 30 needs Node ≥ 24.15.
> `eslint-plugin-jsx-a11y` is not installed because its peer range stops at ESLint 9. Accessibility
> is covered by the component conventions and tests; add the plugin once it supports ESLint 10.
>
> **Vite note:** Vite speeds up development and builds; it does not by itself guarantee
> compatibility with future React versions. The code uses only stable React APIs, so React
> upgrades stay small.

---

## Prerequisites

| Tool | Version | Notes |
| --- | --- | --- |
| Node.js + npm (or pnpm) | Node ≥ 22.22; **24 LTS** recommended (`frontend/.nvmrc`) | If the default `node` is older, `run.sh` activates nvm and `.nvmrc` itself |
| Python | ≥ 3.11 with the `venv` module | Only used to create `backend/.venv`. No global packages are needed. `run.sh` also finds pyenv/uv interpreters, or set `PYTHON=/path/to/python3.12` |
| PostgreSQL | 14+ recommended (verified on 12.22 and 18) | A normal local installation, or any reachable server ([setup](#postgresql-setup)) |
| bash, curl | — | `run.sh` targets Linux and macOS. On Windows, use WSL. |

**Docker is not used or required.**

---

## Quick start

```bash
# 1. PostgreSQL (installed and running): create the user and database once
sudo -u postgres psql -c "CREATE ROLE base_project WITH LOGIN PASSWORD 'choose-a-password' CREATEDB;"
sudo -u postgres psql -c "CREATE DATABASE base_project OWNER base_project;"

# 2. Backend configuration
cp backend/.env.example backend/.env
#   then edit backend/.env:
#   DATABASE_URL=postgresql://base_project:choose-a-password@localhost:5432/base_project
#   JWT_SECRET_KEY=<python3 -c "import secrets; print(secrets.token_urlsafe(64))">
#   FIRST_ADMIN_EMAIL / FIRST_ADMIN_PASSWORD

# 3. Start everything (works from any directory: /path/to/project/run.sh start)
./run.sh start
```

Open <http://localhost:5173> and sign in with `FIRST_ADMIN_EMAIL` / `FIRST_ADMIN_PASSWORD`.
Press **Ctrl+C** to stop both services.

To get demo accounts for trying role-aware navigation and pagination, run
`backend/.venv/bin/python -m app.scripts.manage seed --demo-users 45` from `backend/`. It
creates `manager@example.com`, `user@example.com`, and 45 users that share the admin password
(development only).

---

## Running with run.sh

| Command | What it does |
| --- | --- |
| `./run.sh start` | Prepares everything, starts backend + frontend, then streams both logs. **Ctrl+C stops both.** |
| `./run.sh start --detach` | Same, but returns once both are up. They keep running in the background. |
| `./run.sh stop` | Stops both, including all child processes. Works from any terminal. |
| `./run.sh restart [--detach]` | `stop`, then `start`. |
| `./run.sh status` | Shows PID, URL, and health of each service. Exit code 0 = healthy, 1 = running but unhealthy, 3 = stopped. |
| `./run.sh logs [backend\|frontend] [-n 200]` | Follows the logs: both, prefixed, or one of them. |

What `start` does, in order. It stops with a clear message at the first problem.

1. **Checks prerequisites:**
   - Node.js ≥ 22.22. If the default `node` is too old, it activates nvm with `frontend/.nvmrc`.
   - npm (or pnpm).
   - Python ≥ 3.11 with `venv`.
   - PostgreSQL client tools (a warning only).
   - `backend/.env` with `DATABASE_URL`. If the file is missing, it is created from
     `.env.example` and the script stops so you can fill it in. `frontend/.env` is created from
     its example if missing.
2. **Backend environment:**
   - Creates `backend/.venv` if it is missing. It is recreated if it is broken or older than 3.11.
   - Installs `backend/requirements-dev.txt` with the venv's own pip. This only happens when the
     file or the Python version changed; a hash is kept in `.venv/.requirements.sha256`.
3. **Frontend environment:** runs `npm ci` (or `pnpm install`) only when `package-lock.json` or
   the Node version changed (`node_modules/.deps.sha256`).
4. **Database:**
   - Verifies that PostgreSQL is reachable with `DATABASE_URL`, using
     `python -m app.scripts.manage check-db`.
   - Applies migrations (`alembic upgrade head`).
   - Ensures the first admin user from `FIRST_ADMIN_*` exists (idempotent).
5. **Starts the services:**
   - Refuses to start if a port is already taken.
   - Starts uvicorn (`--reload`) and Vite as separate processes, each in its own process group.
     The Vite proxy is pointed at the chosen backend port.
   - Waits until `GET /api/v1/health/ready` and the Vite server answer.
   - If either one crashes or times out, it prints the end of its log, stops whatever was started,
     and exits with status 1.
6. **Prints the URLs.**

| Service | URL |
| --- | --- |
| Frontend | <http://localhost:5173> |
| Backend API | <http://localhost:8000/api/v1> |
| API docs | <http://localhost:8000/docs> |

Run-time files live in `.run/` at the project root (git-ignored). PID and URL files are kept for
`stop`/`status`. Logs are in `.run/logs/backend.log` and `frontend.log`; the previous run's logs
are kept as `*.log.1`.

Optional environment overrides: `BACKEND_HOST`, `BACKEND_PORT` (8000), `BACKEND_RELOAD` (1),
`FRONTEND_HOST`, `FRONTEND_PORT` (5173), `PYTHON`, `STARTUP_TIMEOUT` (60 s), and
`STOP_TIMEOUT` (10 s). Example: `BACKEND_PORT=8001 FRONTEND_PORT=5174 ./run.sh start`.

---

## Environment setup

| File | Used by | Purpose |
| --- | --- | --- |
| `backend/.env` | FastAPI, Alembic, pytest, manage script, run.sh | Database URL, JWT, cookies, CORS, pagination, logging, seed admin |
| `frontend/.env` | Vite | `VITE_API_BASE_URL`, `VITE_API_PROXY_TARGET`, `VITE_APP_NAME`, `VITE_API_TIMEOUT_MS` |

Copy each `.env.example` to `.env`. **Never commit `.env` files.** `.gitignore` already excludes
them. The backend always reads `backend/.env`, regardless of the current directory. Real
environment variables take precedence over the file. Important backend variables:

| Variable | Default | Notes |
| --- | --- | --- |
| `DATABASE_URL` | — (**required**) | `postgresql://USER:PASSWORD@HOST:PORT/DBNAME`. `postgresql+psycopg://` is also accepted. URL-encode special characters in the password (`@` → `%40`). |
| `DATABASE_CONNECT_TIMEOUT` | 5 | Seconds to wait for PostgreSQL. |
| `DATABASE_STARTUP_CHECK` | `true` | The API refuses to start with a clear error when PostgreSQL is unreachable. |
| `JWT_SECRET_KEY` | placeholder | **Required in production** (≥ 32 chars, startup fails otherwise). Generate: `python3 -c "import secrets; print(secrets.token_urlsafe(64))"` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | 15 | Access-token lifetime. |
| `REFRESH_TOKEN_EXPIRE_DAYS` | 7 | Refresh-token lifetime. |
| `REFRESH_COOKIE_SECURE` | `true` (code) / `false` (example) | `false` only for local HTTP; enforced `true` in production. |
| `CORS_ORIGINS` | `http://localhost:5173` | Comma-separated explicit origins. `*` is rejected. |
| `PAGINATION_DEFAULT_PAGE_SIZE` / `PAGINATION_MAX_PAGE_SIZE` | 10 / 100 | Applies to every list endpoint. |
| `LOG_FORMAT` / `LOG_LEVEL` | `json` / `INFO` | Use `console` locally. |
| `FIRST_ADMIN_EMAIL` / `FIRST_ADMIN_PASSWORD` | — | Used by `manage seed` (and `run.sh start`). A placeholder or short password is refused in production. |
| `TEST_DATABASE_URL` | `<DBNAME>_test` on the same server | Database used by pytest (auto-created when the user has `CREATEDB`). |

---

## PostgreSQL setup

PostgreSQL runs as a **normal local installation**. The project never installs, starts, or
manages it. Any reachable PostgreSQL server works the same way through `DATABASE_URL`, including
managed services such as RDS, Cloud SQL, or Azure.

### 1. Install and start PostgreSQL

| OS | Commands |
| --- | --- |
| Ubuntu / Debian | `sudo apt install postgresql` then `sudo systemctl enable --now postgresql` |
| Fedora / RHEL | `sudo dnf install postgresql-server` then `sudo postgresql-setup --initdb` then `sudo systemctl enable --now postgresql` |
| macOS (Homebrew) | `brew install postgresql@17` then `brew services start postgresql@17` |
| Windows | Installer from <https://www.postgresql.org/download/>. Run this project inside WSL. |

Check that it is running: `pg_isready -h localhost -p 5432` → `accepting connections`.

### 2. Create the database user and database (once)

Open a superuser shell. On Linux that is `sudo -u postgres psql`; on macOS/Homebrew it is
`psql postgres`. Then run:

```sql
CREATE ROLE base_project WITH LOGIN PASSWORD 'choose-a-password' CREATEDB;
CREATE DATABASE base_project OWNER base_project;
\q
```

- `CREATEDB` is only needed so the test suite can create `base_project_test` automatically.
  Without it, also run `CREATE DATABASE base_project_test OWNER base_project;` and drop
  `CREATEDB`.
- `DATABASE_URL` connects over TCP (`localhost`) with a password. The default `pg_hba.conf` on
  Debian/Ubuntu/macOS allows that. On RHEL/Fedora, change `ident` to `scram-sha-256` on the
  `host` lines in `pg_hba.conf`, then run `sudo systemctl reload postgresql`.
- To change the password later: `ALTER ROLE base_project WITH PASSWORD 'new-password';`

### 3. Point the backend at it

In `backend/.env`:

```dotenv
DATABASE_URL=postgresql://base_project:choose-a-password@localhost:5432/base_project
```

Check the connection with `cd backend && .venv/bin/python -m app.scripts.manage check-db`.

### 4. Create the tables

`./run.sh start` applies migrations automatically. To run them manually, use
`cd backend && .venv/bin/alembic upgrade head`. That command also seeds the `admin`, `manager`,
and `user` roles.

### When PostgreSQL is unavailable

Nothing starts against a missing database. `run.sh` stops before launching anything. The API
itself, when started any other way, refuses to start (`DATABASE_STARTUP_CHECK=true`) with a
message like:

```text
CRITICAL app.main: Startup aborted: PostgreSQL is unavailable.
Cannot connect to PostgreSQL at postgresql://base_project@localhost:5432/base_project.
  Reason: connection failed: connection to server at "127.0.0.1", port 5432 failed: Connection refused
  Check that:
    1. PostgreSQL is installed and running (Linux: `sudo systemctl start postgresql`, macOS: `brew services start postgresql`).
    2. The database and user exist (README.md → "PostgreSQL setup").
    3. DATABASE_URL in …/backend/.env has the right host, port, user, and password.
```

The password is never printed. If the database goes away while the API is running,
`GET /api/v1/health/ready` returns **503** and requests fail with the standard error envelope.

---

## Backend: manual commands

`run.sh` handles setup and startup. To work on the backend directly, run these from `backend/`.
Everything runs from the project's own virtual environment; no global Python packages are used.

```bash
python3.12 -m venv .venv                                 # any Python >= 3.11 (skip if run.sh created it)
.venv/bin/python -m pip install -r requirements-dev.txt  # runtime + dev tools (requirements.txt = runtime only)
source .venv/bin/activate                                # optional: puts the venv's tools on PATH
```

### Run

```bash
uvicorn app.main:app --reload --port 8000
# behind a reverse proxy in production:
uvicorn app.main:app --host 0.0.0.0 --port 8000 --proxy-headers --forwarded-allow-ips="<proxy ip>"
```

Health endpoints: `GET /api/v1/health` (liveness) and `GET /api/v1/health/ready` (database check;
503 when the database is down).

### Migrations and seed

```bash
alembic upgrade head                          # apply all migrations (also seeds system roles)
alembic current                               # show current revision
alembic history                               # list revisions
alembic revision --autogenerate -m "add x"    # create a migration from model changes (review it!)
alembic downgrade -1                          # roll back one revision

python -m app.scripts.manage check-db         # is PostgreSQL reachable with DATABASE_URL?
python -m app.scripts.manage seed             # create the first admin from FIRST_ADMIN_* (idempotent)
python -m app.scripts.manage seed --demo-users 45   # + manager@/user@example.com and 45 demo users (dev only)
python -m app.scripts.manage purge-tokens     # delete expired refresh tokens (schedule daily)
```

The system roles `admin`, `manager`, and `user` are inserted by migration `8f3d8b11361c`
(idempotent, `ON CONFLICT DO NOTHING`). No user or password is hard-coded anywhere.

### Dependencies

Dependencies are declared in `pyproject.toml` and locked in `uv.lock`. The pinned
`requirements.txt` (runtime) and `requirements-dev.txt` (runtime + tools) are exported from that
lock, and `run.sh` and pip install from them. After adding or upgrading a dependency in
`pyproject.toml`, regenerate the lock and both files. The maintainer tool for this is
[uv](https://docs.astral.sh/uv/); it is not needed to run the project.

```bash
uv lock
uv export --frozen --no-hashes --no-emit-project --no-dev --format requirements-txt -o requirements.txt
uv export --frozen --no-hashes --no-emit-project --format requirements-txt -o requirements-dev.txt
```

The next `./run.sh start` notices the changed file and reinstalls into `.venv`.

---

## Frontend: manual commands

`run.sh` installs dependencies and starts Vite for you. To work on the frontend directly, run
these commands from `frontend/` with Node 24 (`nvm use`):

```bash
cp .env.example .env   # or .env.local
npm ci                 # install exactly what package-lock.json specifies
npm run dev            # Vite dev server on http://localhost:5173
npm run build          # type-check + production build into dist/
npm run preview        # serve the production build on http://localhost:4173 (same /api proxy)
npm run check          # lint + format check + typecheck + tests + build
```

App routes: `/login`, `/dashboard`, `/components` (component library / style guide),
`/admin/users` (`users:read`), `/admin/roles` (`roles:read`), `/account` (profile and
password), `/unauthorized`, and a catch-all not-found page.

In development the browser calls `VITE_API_BASE_URL=/api/v1`. The Vite dev server proxies `/api`
to `VITE_API_PROXY_TARGET` (default `http://localhost:8000`), so the API and the refresh cookie
are same-origin and need no CORS. In production, either serve the frontend and API from the
same domain, with `/api` routed to FastAPI (recommended), or set `VITE_API_BASE_URL` to the API's
absolute URL and add the frontend origin to `CORS_ORIGINS`.

---

## Quality commands

Backend commands run from `backend/` with the virtual environment activated
(`source .venv/bin/activate`), or prefixed with `.venv/bin/`. Frontend commands run from
`frontend/`.

| Purpose | Backend (`backend/`) | Frontend (`frontend/`) |
| --- | --- | --- |
| Format | `ruff format .` | `npm run format` |
| Format check | `ruff format --check .` | `npm run format:check` |
| Lint | `ruff check .` (`--fix` to autofix) | `npm run lint` |
| Type check | `mypy app tests` | `npm run typecheck` |
| Tests | `pytest` (`--cov` for coverage) | `npm test` (`npm run test:watch`) |
| Build | — | `npm run build` |
| Everything | — | `npm run check` |
| `run.sh` | `shellcheck run.sh` (if installed) | |

Backend tests need a reachable PostgreSQL. They use `TEST_DATABASE_URL`, or `<DBNAME>_test` on the
same server, rebuild that schema from the Alembic migrations, and run each test in a rolled-back
transaction. Your development database is never touched.

---

## API documentation

With `ENABLE_DOCS=true` (default):

- Swagger UI: <http://localhost:8000/docs>. Click **Authorize** and paste the `access_token` from
  `POST /api/v1/auth/login`.
- ReDoc: <http://localhost:8000/redoc>
- OpenAPI JSON: <http://localhost:8000/api/v1/openapi.json>

| Method | Path | Permission | Description |
| --- | --- | --- | --- |
| GET | `/api/v1/health` | public | Liveness |
| GET | `/api/v1/health/ready` | public | Readiness (DB) |
| POST | `/api/v1/auth/login` | public | Email + password → access token + refresh cookie |
| POST | `/api/v1/auth/refresh` | refresh cookie | Rotate refresh token, new access token |
| POST | `/api/v1/auth/logout` | — | Revoke refresh token, clear cookie (idempotent) |
| GET / PATCH | `/api/v1/auth/me` | authenticated | Current user (+ permissions) / update own name |
| POST | `/api/v1/auth/me/password` | authenticated | Change own password (revokes other sessions) |
| GET / POST | `/api/v1/users` | `users:read` / `users:write` | Paginated list (search, role, status, sort) / create |
| GET / PATCH | `/api/v1/users/{id}` | `users:read` / `users:write` | Read / update (role, status, password reset) |
| GET / POST | `/api/v1/roles` | `roles:read` / `roles:write` | Paginated list with `user_count` / create |
| GET / PATCH / DELETE | `/api/v1/roles/{id}` | `roles:read` / `roles:write` | Read / update / delete (system roles protected) |
| GET | `/api/v1/audit-logs` | `audit_logs:read` | Paginated audit trail (filters: action, actor, resource) |

### Error format

Every non-2xx response has the same shape:

```json
{
  "error": {
    "code": "validation_error",
    "message": "One or more fields are invalid.",
    "details": [
      { "field": "email", "loc": ["body", "email"], "message": "value is not a valid email address", "type": "value_error" }
    ],
    "request_id": "3f2c…"
  }
}
```

Codes: `bad_request` (400), `unauthorized` / `invalid_credentials` / `invalid_token` /
`token_expired` / `invalid_refresh_token` (401), `forbidden` / `inactive_user` (403), `not_found`
(404), `conflict` (409), `validation_error` (422), `internal_error` (500, generic message only),
`service_unavailable` (503). Every response carries an `X-Request-ID` header that matches the
server logs.

---

## Authentication flow

```text
Browser (React)                                   FastAPI
───────────────                                   ───────
POST /auth/login {email,password}  ─────────────▶ verify Argon2 hash, check is_active
                                   ◀───────────── 200 {access_token (JWT, 15 min), user+permissions}
                                                  Set-Cookie: refresh_token=<random>; HttpOnly;
                                                  SameSite=Lax; Path=/api/v1/auth  (DB stores HMAC hash)
access token kept in memory only
GET /users  Authorization: Bearer <JWT>  ───────▶ decode JWT → load user + role → check permission
… 401 token_expired ◀────────────────────────────
POST /auth/refresh (cookie sent automatically) ─▶ lock token row, verify not revoked/expired,
                                                  revoke it, issue a NEW refresh token (rotation)
                                   ◀───────────── 200 {new access_token} + new cookie
retry original request once
page reload → POST /auth/refresh restores the session silently
POST /auth/logout ──────────────────────────────▶ revoke token, clear cookie → 204
```

Security properties:

- Passwords are hashed with Argon2id. Unknown emails still go through a dummy password check, so
  response timing does not reveal which accounts exist.
- The access token lives only in JavaScript memory. The refresh token is an **httpOnly** cookie
  that JavaScript cannot read. Only its keyed hash is stored in `refresh_tokens`.
- Client side, refresh is single-flight within a tab, and serialized **across tabs** with the
  Web Locks API (`navigator.locks`). Each tab therefore presents the newest cookie, so concurrent
  rotations do not log users out. On a 401 the client refreshes once and retries the request
  once. If the refresh fails, it returns to `/login` and explains that the session expired.
- **Rotation with reuse detection:** each refresh token works once. If someone replays a revoked
  token more than `REFRESH_TOKEN_REUSE_GRACE_SECONDS` (10 s) after it was rotated, the server
  treats it as stolen and revokes **all** of that user's sessions. Inside the grace window, the
  replay just gets a 401, which covers two tabs refreshing at the same moment.
- Deactivating a user, resetting their password, or the user changing their own password revokes
  their other sessions. Access tokens of inactive users are rejected immediately, because the
  user is loaded on every request.
- Logout revokes the refresh token. An already-issued access token stays valid until it expires
  (at most 15 minutes), so keep access tokens short-lived.
- Login, logout, failed logins, token reuse, password changes, and admin changes are written to
  `audit_logs`.

---

## Authorization

Each user has **one** role (`users.role_id`). The role name maps to permissions in
`backend/app/core/permissions.py`. That file is the only place where authorization rules are
defined:

| Role | Permissions |
| --- | --- |
| `admin` | `users:read`, `users:write`, `roles:read`, `roles:write`, `audit_logs:read` |
| `manager` | `users:read`, `roles:read` |
| `user` | none (own profile only) |

Routes declare what they need: `Depends(require_permission(Permission.USERS_WRITE))`. Missing
permission → **403**; missing/invalid token → **401**. `GET /auth/me` returns the user's
`permissions`, and the frontend uses them to show or hide navigation and guard routes. That is UX
only: the backend always enforces the rule. Roles created through the API grant no permissions
until a developer adds them to `ROLE_PERMISSIONS`.

---

## Pagination

Every list endpoint paginates **inside PostgreSQL**:

```http
GET /api/v1/users?page=2&page_size=10&search=ann&role_id=3&is_active=true&sort_by=name&sort_order=asc
```

```json
{
  "items": [ { "id": 12, "name": "Ann", "email": "ann@example.com", "is_active": true,
               "role": { "id": 3, "name": "user" }, "created_at": "…", "updated_at": "…" } ],
  "page": 2,
  "page_size": 10,
  "total": 47,
  "total_pages": 5
}
```

- `page ≥ 1` (default 1). `page_size` 1–100 (default **10**, max configurable). Invalid values
  → 422.
- Filters, search (`ILIKE`, wildcards escaped), and sorting (whitelisted fields) are part of the
  SQL query, applied **before** `LIMIT/OFFSET`. Sorting is deterministic: the column plus `id` as
  a tiebreaker. Default order is `created_at DESC, id DESC`.
- Each request runs two statements: `SELECT count(*)` over the filtered set and the page query
  (`… ORDER BY … LIMIT :n OFFSET :m`). The role is joined in the page query, so there are no N+1
  queries. List views never select `password_hash`. A page past the end returns `items: []`
  without running the page query.
- `tests/integration/test_pagination_sql.py` captures the SQL that is executed. It asserts that
  `WHERE` → `ORDER BY` → `LIMIT` → `OFFSET` are in one statement and that PostgreSQL returned only
  `page_size` rows.
- The frontend `DataTable` requests one page at a time and renders `total` / `total_pages`.
- Backend pagination cannot remove network latency. It does prevent oversized responses, memory
  spikes, and unnecessary database load. For very deep pages on huge tables, switch that endpoint
  to keyset (cursor) pagination.

---

## Database design and indexes

```text
roles (1) ────────< users (N)              each user has exactly ONE role (users.role_id)
  id PK                id PK               NO user_roles table
  name UNIQUE          role_id FK → roles.id (ON DELETE RESTRICT)
  description          name, email UNIQUE (lower-cased), password_hash, is_active
  created_at           created_at, updated_at
  updated_at
                     users (1) ──< refresh_tokens (N)   token_hash UNIQUE, expires_at, revoked_at,
                                                       user_agent, ip_address (ON DELETE CASCADE)
                     users (1) ──< audit_logs (N)       actor_user_id (ON DELETE SET NULL), action,
                                                       resource_type/id, metadata JSONB, ip, user agent
```

| Index | Columns | Why |
| --- | --- | --- |
| `ix_roles_name` (unique) | `roles(name)` | Unique role names; lookups by name |
| `ix_users_email` (unique) | `users(email)` | Login lookup + uniqueness (emails stored lower-case) |
| `ix_users_role_id_created_at_id` | `users(role_id, created_at, id)` | FK index for `role_id` **and** "filter by role, newest first" with no sort step |
| `ix_users_created_at_id` | `users(created_at, id)` | Default list order `created_at DESC, id DESC` (backward scan) |
| `ix_users_name_id` | `users(name, id)` | List sorted by name |
| `ix_refresh_tokens_token_hash` (unique) | `refresh_tokens(token_hash)` | Every refresh/logout lookup |
| `ix_refresh_tokens_user_id` | `refresh_tokens(user_id)` | FK; "revoke all sessions of user" |
| `ix_refresh_tokens_expires_at` | `refresh_tokens(expires_at)` | `purge-tokens` cleanup job |
| `ix_audit_logs_created_at_id` | `audit_logs(created_at, id)` | Default audit list order |
| `ix_audit_logs_actor_user_id_created_at` | `audit_logs(actor_user_id, created_at)` | FK; activity of a user |
| `ix_audit_logs_resource_type_resource_id_created_at` | `audit_logs(resource_type, resource_id, created_at)` | History of one resource |

These indexes are intentionally **not** created: `users.is_active` (a low-cardinality boolean)
and `audit_logs.action` (write-heavy table, rare filter). Substring search (`ILIKE '%x%'`) also has
no index, because it cannot use a B-tree. When search becomes slow, add a `pg_trgm` GIN index
through a migration. The query plans reviewed on 200 000 rows are recorded in `memory.md`.

`app_settings` and `notifications` tables are deliberately not created; see `rules.md` §5.4.

---

## Theme customization

All design values live in **`frontend/src/theme/tokens.css`**: colors for light and dark mode,
fonts, font sizes, line heights, spacing, radii, shadows, transitions, and z-indexes.
`frontend/src/theme/bootstrap-overrides.css` maps Bootstrap's CSS variables and variant classes
(`.btn-primary`, alerts, badges, form focus rings, links, …) to those tokens. Hover and active
shades are derived with `color-mix()`.

To rebrand, edit the token values only. For example:

```css
/* frontend/src/theme/tokens.css */
:root,
[data-bs-theme='light'] {
  --app-color-primary: #0f766e;   /* every primary button, link, focus ring, badge… updates */
  --app-color-accent: #c026d3;
}
[data-bs-theme='dark'] {
  --app-color-primary: #2dd4bf;
}
```

- The theme switcher in the header offers **light / dark / system**. The choice is stored in
  `localStorage` (`app.theme`) and applied as `data-bs-theme` on `<html>`.
  `public/theme-init.js` applies it before React renders, so the page does not flash the wrong
  theme. Keep its storage key in sync with `src/theme/themeStorage.ts`.
- Component CSS Modules use only `var(--app-…)` tokens or Bootstrap utilities. Color literals are
  allowed only in `tokens.css`.
- Inline styles are banned and enforced by ESLint (`no-restricted-syntax` on JSX `style`). The
  only inline styles at runtime are positioning styles that React-Bootstrap/Popper set on
  modals, tooltips, and popovers. That is library behavior, not authored code.
- The component library page (`/components`) shows every component and its states in both
  themes.

---

## Adding frontend components and pages

**Reusable component**

1. Check `src/components/` and the style guide first. Extend an existing component if possible.
2. Create `src/components/ui/MyWidget.tsx` and, if needed, `MyWidget.module.css` (tokens only).
3. Type the props (`interface MyWidgetProps`). Use semantic HTML and labels/ARIA. Support keyboard
   use. Handle disabled, loading, and error states.
4. Export it from the folder's `index.ts`, add a demo to the style guide, and add a test.

**Page / route / navigation item**

1. Put API types in `src/types/` (or the feature folder). Add a service in `src/services/` whose
   functions call `apiClient` (for lists: `list(params, signal)` returning `Page<T>`). Put query
   and mutation hooks in `src/features/<feature>/`.
2. Create `src/pages/XPage.tsx` (named export, starting with `<PageHeader>`) and register it lazily
   in `src/routes/lazyPages.tsx`.
3. Add the path to `ROUTES` (`src/routes/paths.ts`). Add a child route under the `AppLayout`
   route in `src/routes/router.tsx` with `handle: crumb('X')` for breadcrumbs. Wrap it in
   `<RequirePermission permission={PERMISSIONS.X}>` if needed.
4. Add `{ label, to, icon, permission? }` to `NAV_SECTIONS` in `src/layouts/navigation.ts`. Items
   the user lacks permission for are hidden.

**Paginated table**

```tsx
// page component (see src/pages/RolesPage.tsx for a complete example)
const controller = useDataTableState({ initialSort: { sortBy: 'name', sortOrder: 'asc' } });
const params = { ...toPageQuery(controller.state) /* + typed filters */ };
const query = usePaginatedQuery(['things', 'list'], params, thingsService.list); // one page per request

<DataTable controller={controller} columns={columns} data={query.data}
           isLoading={query.isPending} isFetching={query.isFetching} error={query.error} />
```

Column `sortKey` and `filter.key` must equal the API's query parameter names. The table requests
one page at a time. It resets to page 1 when search, filters, sort, or page size change. It shows
loading, empty, and error-with-retry states. `responsiveMode="stack"` turns rows into cards on
small screens.

**Forms**: use React Hook Form + Zod with the shared field components. Call
`applyApiValidationErrors(error, setError)` in the mutation's `onError` so backend 422/409
`details[].field` errors appear on the matching fields.

---

## Adding backend features

Example: a `projects` module.

1. **Model**: `app/models/project.py` with typed `Mapped[]` columns, `TimestampMixin`, a FK
   index, and indexes for its list query (comment why). Export it in `app/models/__init__.py`.
2. **Migration**: `alembic revision --autogenerate -m "create projects"` (venv active), then
   review the file (names, indexes, downgrade) and run `alembic upgrade head`.
3. **Schemas**: `app/schemas/project.py` with `ProjectCreate/Update` (`InputSchema`,
   `extra="forbid"`), `ProjectRead`, `ProjectListQuery`, and a `ProjectSortField` enum.
4. **Repository**: `app/repositories/project_repository.py`. Build the filtered `select()`, then
   `count_rows()` + `apply_page()` + `ordering(..., tiebreaker=Project.id)`, and eager-load
   relations.
5. **Service**: `app/services/project_service.py` holds business rules, `AppError` subclasses,
   `AuditService.record(...)`, and `session.commit()`.
6. **Permissions**: add `PROJECTS_READ/WRITE` to `Permission` and grant them in
   `ROLE_PERMISSIONS`.
7. **Routes**: `app/api/routes/projects.py`. Keep them thin. Use `PageParamsDep`,
   `Annotated[ProjectListQuery, Query()]`, `require_permission(...)`, `response_model`,
   `summary`, and `error_responses(...)`. Register them in `app/api/router.py` with a tag.
8. **Tests**: add integration tests for permissions, validation, pagination, and the business
   rules, then run all quality commands.

---

## Working with AI tools

- [`rules.md`](rules.md) contains the mandatory rules for every human and AI change: stack,
  layering, no inline CSS, pagination, indexing, security, testing, the future `integrations/`
  layout, conflict handling, and the `memory.md` entry format.
- [`memory.md`](memory.md) is the append-only history of what changed, why, which decisions were
  made, and what was verified.
- `AGENTS.md` (read by Cursor, Codex, Antigravity and similar tools) and `CLAUDE.md` (read by Claude
  Code) point every AI tool to those two files.

Required workflow for any AI tool:

1. Inspect the project directory.
2. Read `rules.md` and `memory.md` **completely**.
3. State major assumptions before implementing them, and follow existing decisions.
4. Implement, then run formatting, linting, type checks, tests, and the build for the touched areas.
5. Append a new `memory.md` entry, including the validation results. Never delete old entries.

When starting a session with an AI tool, a good first prompt is: *"Read rules.md and memory.md
completely, then …"*.

---

## Building business modules on this base

- Keep generic foundation code (`core/`, `api/dependencies.py`, `repositories/base.py`, shared
  components) generic. Business modules depend on it, never the other way around.
- Each module gets its own model, migration, schemas, repository, service, routes, permissions,
  and tests (backend). On the frontend it gets a feature folder plus routes and navigation.
- Every list endpoint follows the pagination rules; every write goes through a service that
  validates, audits, and commits.
- Third-party services and AI models go into a root-level `integrations/` directory with
  client/adapter isolation (see `rules.md` §10). Create it when the first integration arrives.
- Possible next steps: a background job runner (for `purge-tokens`, emails, exports),
  rate limiting on `/auth/login`, password reset by email (an integration), a streaming CSV export
  endpoint, a `pg_trgm` search index, OpenTelemetry tracing, deployment packaging (for example
  systemd units behind a reverse proxy), and CI that runs every quality command.

---

## Production checklist

- [ ] `APP_ENV=production`, a strong unique `JWT_SECRET_KEY` (startup enforces ≥ 32 chars).
- [ ] HTTPS everywhere; `REFRESH_COOKIE_SECURE=true` (enforced); consider `SameSite=strict` when
      frontend and API share a site.
- [ ] `CORS_ORIGINS` lists only the real frontend origin(s).
- [ ] `ENABLE_DOCS=false` if the API is not public. `LOG_FORMAT=json`.
- [ ] Database user with least privilege; backups; run `alembic upgrade head` in deployment.
- [ ] Strong `FIRST_ADMIN_PASSWORD` (seed refuses placeholders in production). Rotate it after the
      first login.
- [ ] Rate limiting / lockout for login (not included in the base). Schedule
      `manage purge-tokens`.
- [ ] Run uvicorn behind a reverse proxy with `--proxy-headers --forwarded-allow-ips` so audit IPs
      are correct.

---

## Troubleshooting

| Problem | Fix |
| --- | --- |
| `run.sh`: `Node.js >= 22.22 is required` | Install Node 24 LTS (`nvm install 24`). With nvm installed, `run.sh` switches versions on its own. |
| `run.sh`: `Python >= 3.11 … was not found` | Install Python 3.11+ with venv (`sudo apt install python3.12 python3.12-venv`, `brew install python@3.12`, or pyenv), or run `PYTHON=/path/to/python3.12 ./run.sh start`. |
| `run.sh`: `PostgreSQL is not available` (`Connection refused`) | Start PostgreSQL (`sudo systemctl start postgresql` / `brew services start postgresql@17`) and check the host/port in `DATABASE_URL`. |
| `password authentication failed for user` | Wrong password in `DATABASE_URL`, or special characters not URL-encoded. Reset it with `ALTER ROLE … PASSWORD …`. |
| `database "base_project" does not exist` / `role … does not exist` | Create them ([PostgreSQL setup](#postgresql-setup), step 2). |
| `Ident authentication failed` (RHEL/Fedora) | Switch the `host` lines in `pg_hba.conf` to `scram-sha-256` and reload PostgreSQL. |
| `Port 8000 is already in use` | Stop the other process, or run `BACKEND_PORT=8001 ./run.sh start` (the Vite proxy follows automatically). |
| `The backend failed to start` / `exited during startup` | The last log lines are printed. Full log: `./run.sh logs backend`. |
| `status` shows a stale state after a crash or reboot | `./run.sh stop` cleans up pid files; then `./run.sh start`. |
| Tests: `permission denied to create database` | Grant `CREATEDB`, or create `<db>_test` manually, or set `TEST_DATABASE_URL`. |
| Login works but a reload logs you out | The refresh cookie was not stored. On plain HTTP outside `localhost`, set `REFRESH_COOKIE_SECURE=false` (development only). Make sure requests go through the Vite proxy or a same-site origin. |
| Startup fails: `JWT_SECRET_KEY must be set…` | Expected in production. Set a random secret of at least 32 characters. |
