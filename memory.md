# Project Memory

Append-only change history and decision log for this repository.

- **Every AI tool and developer must read this file completely before changing code**
  (see `rules.md` §1).
- After every meaningful change, append a new entry **at the end** using the format in
  `rules.md` §12.
- Never delete or rewrite earlier entries. Corrections go in a new entry that references the
  old one.

---

## 2026-10-07 12:41 — Create the full-stack base project (initial foundation)

### Purpose

Create a reusable, production-oriented React + FastAPI + PostgreSQL foundation that future
applications start from. It contains no business modules. It provides authentication,
role-based authorization, user/role administration, audit logging, backend pagination, a design
system, reusable components, and the documentation and rules that govern future AI-assisted
changes.

### Summary of changes

- **Root**
  - Added `rules.md` (mandatory rules), `memory.md` (this log), and `README.md` (full
    documentation).
  - Added `AGENTS.md` and `CLAUDE.md`, pointer files that make AI tools read `rules.md` and
    `memory.md`.
  - Added `docker-compose.yml` (optional PostgreSQL 18), `.env.example`, and `.gitignore`.
- **Backend** (`backend/`): FastAPI app with a layered structure: routes → services →
  repositories → models, with schemas and core modules alongside.
  - Versioned API under `/api/v1`:
    - `health` and `health/ready`.
    - `auth`: login, refresh, logout, `me` (GET and PATCH), and `me/password`.
    - `users`: list, create, get, and update.
    - `roles`: list, create, get, update, and delete.
    - `audit-logs`: list.
  - JWT access tokens. Opaque refresh tokens are kept in an httpOnly cookie, stored as hashes,
    and rotated on every use with reuse detection.
  - Argon2id password hashing.
  - Central role → permission policy, enforced through a `require_permission` dependency.
  - Consistent error envelope, request IDs, structured logging, and security headers.
  - CORS restricted to configured origins.
  - Database-level pagination helpers with deterministic ordering.
  - Alembic migrations: tables and indexes, plus an idempotent seed of the system roles.
  - Management command: `seed` (admin from env plus optional demo users) and `purge-tokens`.
  - 91 pytest tests run against real PostgreSQL.
- **Frontend** (`frontend/`): React 19 + TypeScript + Vite 8 + Bootstrap 5.3 / React-Bootstrap.
  - Design tokens with light, dark, and system themes, plus a theme switcher.
  - Bootstrap mapped onto the tokens via CSS variables. No inline CSS, enforced by ESLint.
  - Responsive app shell:
    - Header, collapsible sidebar that becomes an offcanvas on mobile, breadcrumbs, page header
      with actions, and footer.
  - Reusable UI, form, and feedback components, plus a component library page (`/components`).
  - Generic server-paginated `DataTable`:
    - Search, column filters, and sort.
    - Selection and bulk actions.
    - Row actions and page-size selector.
    - Loading, empty, and error states, and CSV export of the current page.
  - Pages: login, dashboard, users admin, roles admin, account (profile and password), not
    found, and unauthorized.
  - Routing: public-only, protected, and permission-guarded routes, with permission-aware
    navigation.
  - Centralized fetch API client:
    - In-memory access token.
    - Silent session restore on load.
    - Single-flight refresh, serialized across tabs with the Web Locks API.
    - 401 → refresh → retry once.
    - Typed `ApiError`.
  - TanStack Query for server state; React Hook Form + Zod for forms, with backend validation
    errors mapped onto fields.
  - 45 Vitest tests.

### Files added

- Root:
  - `rules.md`, `memory.md`, `README.md`, `AGENTS.md`, `CLAUDE.md`.
  - `docker-compose.yml`, `.env.example`, `.gitignore`.
  - Local, untracked: `.env`, which uses `POSTGRES_PORT=5434` because this machine already runs
    PostgreSQL 12 on 5432.
- `backend/` (80 files, excluding the venv and caches):
  - Config and tooling: `pyproject.toml`, `uv.lock`, `requirements.txt`,
    `requirements-dev.txt`, `alembic.ini`, `.python-version`, `.env.example`.
  - Local, untracked: `.env`.
  - `app/main.py`.
  - `app/api/`: `dependencies.py`, `cookies.py`, `router.py`, and `routes/` (`health.py`,
    `auth.py`, `users.py`, `roles.py`, `audit_logs.py`).
  - `app/core/`: `config.py`, `security.py`, `permissions.py`, `logging.py`, `exceptions.py`,
    `middleware.py`.
  - `app/db/`: `base.py`, `session.py`, and `migrations/` (`env.py`, `script.py.mako`,
    `versions/20261007_0637_057b46243912_create_foundation_tables.py`,
    `versions/20261007_0637_8f3d8b11361c_seed_system_roles.py`).
  - `app/models/`: `role.py`, `user.py`, `refresh_token.py`, `audit_log.py`.
  - `app/schemas/`: `common.py`, `pagination.py`, `auth.py`, `user.py`, `role.py`,
    `audit_log.py`, `health.py`.
  - `app/repositories/`: `base.py`, `user_repository.py`, `role_repository.py`,
    `refresh_token_repository.py`, `audit_log_repository.py`.
  - `app/services/`: `auth_service.py`, `user_service.py`, `role_service.py`,
    `audit_service.py`, `serializers.py`.
  - `app/utils/`: `sql.py`, `request.py`, `time.py`.
  - `app/scripts/manage.py`.
  - `tests/conftest.py`.
  - `tests/unit/`: `test_security.py`, `test_permissions.py`, `test_pagination.py`,
    `test_config.py`.
  - `tests/integration/`: `test_health.py`, `test_auth.py`, `test_users.py`, `test_roles.py`,
    `test_audit_logs.py`, `test_pagination_sql.py`, `test_migrations.py`.
- `frontend/` (170 files, excluding `node_modules` and `dist`):
  - Config and tooling: `package.json`, `package-lock.json`, `.nvmrc`, `.env.example`,
    `index.html`, `vite.config.ts`, `vitest.config.ts`, `tsconfig*.json`, `eslint.config.js`,
    `.prettierrc.json`, `.prettierignore`, `.gitignore`.
  - `public/theme-init.js`, `public/favicon.svg`.
  - `src/`: `assets/`, `components/{ui,forms,data-table,feedback}/`,
    `features/{auth,users,roles,account,dashboard,showcase}/`, `hooks/`,
    `layouts/{AppLayout,AuthLayout}/`, `layouts/navigation.ts`, `pages/`, `routes/`,
    `services/`, `store/`, `theme/` (`tokens.css`, `bootstrap-overrides.css`,
    `ThemeProvider`, `ThemeSwitcher`), `types/`, `utils/`, `styles/`, `test/`, `App.tsx`,
    `main.tsx`.
  - Tests: `DataTable.test.tsx`, `useDataTableState.test.ts`, `LoginForm.test.tsx`,
    `guards.test.tsx`, `apiClient.test.ts`, `ThemeProvider.test.tsx`, `formErrors.test.ts`,
    `pagination.test.ts`.

### Files modified

None. This is the initial creation; the directory was empty.

### Architectural and design decisions

**Assumptions recorded before implementation**

- Sync SQLAlchemy with psycopg 3, not async. FastAPI runs sync endpoints in a threadpool.
  This is simpler and well supported for typical CRUD foundations; async can be adopted per
  module later.
- Refresh tokens use httpOnly cookies, not storage. The frontend uses the Vite dev proxy
  (`/api` → `:8000`), so the API and cookie are same-origin in development.
- A permission map keyed by role name, not role checks scattered in routes. "Role-aware"
  navigation on the frontend uses the `permissions` returned by `/auth/me`.

**Backend**

- Layering:
  - Routes are thin.
  - Services own business rules, `commit()`, and audit logging.
  - Repositories own every query and never commit.
  - Pydantic schemas validate input (`extra="forbid"`) and shape output.
- Authorization is defined only in `app/core/permissions.py`:
  - `admin` has all permissions.
  - `manager` has `users:read` and `roles:read`.
  - `user` has none.
  - Routes use `require_permission(...)`.
  - Roles created through the API grant nothing until added to the map.
- Each user has one role via `users.role_id` (FK `ON DELETE RESTRICT`). There is no
  `user_roles` table. System roles (`admin`, `manager`, `user`) are seeded by migration
  `8f3d8b11361c` with `ON CONFLICT DO NOTHING`, and the API cannot rename or delete them.
- Tokens:
  - Access tokens are HS256 JWTs (15 min) with `sub`, `role`, `type=access`, `iss`, `iat`,
    `nbf`, `exp`, and `jti`.
  - Refresh tokens are `secrets.token_urlsafe(48)` values. Only an HMAC-SHA256 hash is stored,
    keyed with `JWT_SECRET_KEY`, so rotating the secret invalidates all sessions.
  - The refresh cookie is httpOnly, `SameSite=Lax`, and limited to `Path=/api/v1/auth`.
- Rotation:
  - Every refresh revokes the presented token and issues a new one, under a row lock
    (`SELECT … FOR UPDATE`).
  - Replaying a revoked token more than `REFRESH_TOKEN_REUSE_GRACE_SECONDS` (10 s) after its
    revocation revokes **all** of the user's sessions and writes an audit entry. Inside the
    window it is just a 401, which tolerates concurrent refreshes.
- Session revocation:
  - Deactivating a user or resetting their password revokes all of their sessions.
  - Changing one's own password revokes all other sessions and keeps the current one.
- Login checks a dummy Argon2 hash for unknown emails to avoid user enumeration through timing.
  An inactive account gets 403 `inactive_user`. An access token belonging to a deactivated
  user is rejected (403) on its next request, because the user is loaded on every request.
- Error envelope: `{"error": {code, message, details[{field, loc, message, type}], request_id}}`
  for all errors, including FastAPI 422 validation and Starlette HTTP errors. A 500 returns a
  generic message and the stack trace goes only to the log.
- Pagination (`app/repositories/base.py`):
  - `count_rows()` runs `count(*)` over the filtered statement.
  - `apply_page()` adds `ORDER BY … LIMIT … OFFSET` to the same SQL statement as the filters.
  - A page past the end skips the page query.
  - Sorting is whitelisted through enums, with `id` as a tiebreaker.
  - Defaults: page size 10, max 100 (configurable). Default order is `created_at DESC, id DESC`
    for users and audit logs, and `name ASC, id ASC` for roles.
- No N+1 queries:
  - Relationships use `lazy="raise_on_sql"`.
  - Lists `joinedload` their relations and use `load_only` columns, so `password_hash` is
    never selected.
  - Role `user_count` comes from a correlated subquery in the same statement.
- `eager_defaults=True` on the timestamp mixins: `created_at`/`updated_at` come back via
  `RETURNING`, with no extra SELECT.
- Indexes and their reasons are documented on the models and in the README:
  - `ix_roles_name` (unique) and `ix_users_email` (unique; emails stored lower-case).
  - `ix_users_role_id_created_at_id`: FK index plus "filter by role, newest first".
  - `ix_users_created_at_id` (default sort) and `ix_users_name_id` (name sort).
  - `refresh_tokens`: token_hash (unique), user_id, expires_at.
  - `audit_logs`: (created_at, id), (actor_user_id, created_at), and
    (resource_type, resource_id, created_at).
  - Deliberately **not** indexed:
    - `users.is_active` (low cardinality).
    - `audit_logs.action` (write-heavy table, rare filter).
    - `ILIKE` substring search, which needs `pg_trgm`. Documented as a future migration.
- `app_settings` and `notifications` tables were **not** created because no current feature
  needs them. Their intended use is documented in `rules.md` §5.4.
- Settings:
  - The production startup guard rejects the placeholder or a short `JWT_SECRET_KEY`,
    `REFRESH_COOKIE_SECURE=false`, and `CORS_ORIGINS=*`.
  - `.env.example` sets `REFRESH_COOKIE_SECURE=false` for local HTTP development only. The
    code default is `true`.
- The seed admin comes from `FIRST_ADMIN_EMAIL` / `FIRST_ADMIN_PASSWORD`. Nothing is
  hard-coded, and placeholder or short passwords are refused in production. Demo users
  (`--demo-users N`) are development-only and share the admin password.
- Tests:
  - They run on a separate `<db>_test` database, auto-created and rebuilt from the Alembic
    migrations each session.
  - Each test runs in a rolled-back transaction (`join_transaction_mode="create_savepoint"`).
  - `test_migrations.py` asserts that models and migrations do not drift, that the required
    indexes exist, that every FK is indexed, and that there is no `user_roles` table.
- Dependency management: uv with `uv.lock`, and `requirements*.txt` exported from it as a pip
  fallback.
- Ruff handles both lint and format (Black-compatible). mypy runs in strict mode with the
  pydantic plugin.

**Frontend**

- Bootstrap is used precompiled; there is no Sass.
  - `src/theme/tokens.css` is the only place with color literals. It also holds typography,
    spacing, radii, shadows, transitions, and z-index values.
  - `bootstrap-overrides.css` maps Bootstrap 5.3 variables and variant classes onto the tokens,
    deriving hover and active shades with `color-mix()`.
  - The theme is stored in `localStorage` under `app.theme`. `public/theme-init.js` applies it
    before first paint, with no inline script.
- No inline CSS:
  - ESLint `no-restricted-syntax` rejects JSX `style`.
  - Component styles are CSS Modules that use tokens only.
  - The production `index.html` has no inline scripts or styles.
- State:
  - TanStack Query holds server state (no retry on 4xx, up to 2 retries otherwise, keeps the
    previous page while the next loads).
  - A small auth context holds the session; the access token is in memory only.
  - UI contexts hold the sidebar and toast state.
  - React Hook Form + Zod hold form state.
  - There is no global store library.
- The access token is never persisted. On load the client calls `POST /auth/refresh` to restore
  the session.
- Refresh behavior:
  - Single-flight within a tab, and serialized across tabs with `navigator.locks`.
  - The cross-tab lock was added by the integrator after the frontend build, so concurrent tabs
    never present the same single-use token.
- `DataTable` requests exactly one page (`page`, `page_size`, filters, `sort_by`/`sort_order`).
  It resets to page 1 when search, filters, sort, or page size change, and debounces search by
  300 ms.
- Routes: `/login`, `/dashboard`, `/components`, `/admin/users`, `/admin/roles`, `/account`,
  `/unauthorized`, and a not-found catch-all. Pages are lazy-loaded. `NAV_SECTIONS` items
  declare a `permission`.
- Demo and mock behavior is clearly labeled in the UI:
  - Dashboard metrics are static ("Demo data").
  - The style-guide validation demo fakes a 422.
  - Bulk deactivate sends one PATCH per user and is labeled "(demo)".
  - CSV export covers the current page only.

**Tooling and versions** (latest stable on 2026-10-07)

- TypeScript is pinned to 6.0.3, not 7.0.2, because the typescript-eslint 8.71 peer range is
  `<6.1`.
- jsdom is pinned to 29.1.1 because jsdom 30 needs Node ≥ 24.15 and this machine has 24.12.
- `eslint-plugin-jsx-a11y` is skipped because its peer range ends at ESLint 9.
- Starlette 1.7 deprecates `httpx` in its TestClient, so the backend dev dependency is
  `httpx2`.
- PostgreSQL image `postgres:18-alpine`. The volume is mounted at `/var/lib/postgresql`, as the
  PostgreSQL 18+ image layout requires. The port is bound to `127.0.0.1`.
- `docker-compose.yml` follows the Compose Specification (no `version:` key) and needs Compose
  v2+. This machine only has legacy `docker-compose` 1.25, so verification used a standalone
  Compose v5.6.0 binary run from a temporary directory, not installed system-wide.

### Dependencies changed

**Backend runtime** (`uv.lock`):

- fastapi 0.142.2, starlette 1.7.0, uvicorn[standard] 0.54.0.
- sqlalchemy 2.1.3, alembic 1.20.0, psycopg[binary] 3.3.6.
- pydantic[email] 2.13.5, pydantic-settings 2.15.0.
- pwdlib[argon2] 0.3.1 (argon2-cffi 25.1.0), pyjwt 2.15.1.

**Backend dev**:

- pytest 9.1.1, pytest-cov 7.1.0, httpx2 2.13.1, ruff 0.16.10, mypy 2.4.0.

**Frontend runtime** (`package-lock.json`):

- react / react-dom 19.3.0, react-router 8.4.0, @tanstack/react-query 5.104.1.
- bootstrap 5.3.8, react-bootstrap 2.10.10, bootstrap-icons 1.13.1.
- react-hook-form 7.89.0, zod 4.6.5, @hookform/resolvers 5.9.1.

**Frontend dev**:

- vite 8.3.3, @vitejs/plugin-react 6.1.2, typescript 6.0.3.
- eslint 10.12.0, @eslint/js 10.0.1, typescript-eslint 8.71.1, eslint-plugin-react-hooks
  7.1.1, eslint-plugin-react-refresh 0.5.7, eslint-config-prettier 10.1.8, globals 17.13.0.
- prettier 3.9.9.
- vitest 5.0.3, jsdom 29.1.1, @testing-library/react 16.3.3, @testing-library/dom 10.4.2,
  @testing-library/jest-dom 7.0.1, @testing-library/user-event 14.6.7.
- @types/react and @types/react-dom 19.3.0, @types/node 24.19.1.

**Runtimes**: Node 24.12.0 (`.nvmrc` 24), Python 3.11.7 (`requires-python >= 3.11`),
PostgreSQL 18.

### Validation performed

**Install**

- `uv sync` on Python 3.11.7: OK.
- `pip install -r requirements-dev.txt` in a clean 3.11 venv: OK, and the unit tests pass there.
- `npm install` / `npm ci`: OK, 0 vulnerabilities.

**PostgreSQL**

- `docker compose up -d postgres` (Compose v5.6.0): healthy on `127.0.0.1:5434`.
- `GET /api/v1/health/ready` → `{"status":"ready","database":"ok"}`.

**Migrations**

- `alembic upgrade head`: OK.
- Round trip on a throwaway database (upgrade head → downgrade base → upgrade head): OK.
- `alembic check`: "No new upgrade operations detected".
- `\di`: all 12 named indexes present.

**Seed**

- Roles `admin`, `manager`, `user` present after the migration.
- `manage seed --demo-users 45` run twice: idempotent. Result: 48 users (1 admin, 7 managers,
  40 users).
- `manage purge-tokens`: OK.

**Backend checks**

- `ruff format --check .`: 69 files already formatted.
- `ruff check .`: all checks passed.
- `mypy app tests` (strict): no issues in 69 files.
- `pytest`: **91 passed**. Coverage includes:
  - Security primitives, config guards, and the permission map.
  - Pagination maths and LIMIT/OFFSET SQL compilation.
  - Login (success, wrong password, unknown email, inactive, validation, audited).
  - `me`, refresh rotation, reuse detection inside and outside the grace window, expired
    refresh, logout plus replay, profile update, and password change (wrong current password;
    other sessions revoked, current one kept).
  - Users and roles permissions (401/403), default page size 10, max 100 (422 at 101 and at 0),
    and an out-of-range page.
  - Filters, search with literal `%`, sorting, duplicate email (409 on the field),
    self-deactivate and self-demote (400), and system-role protection.
  - The audit list.
  - Migration drift and indexes.

**Pagination proofs** (`test_pagination_sql.py`)

- The captured page query contains `WHERE … ORDER BY users.created_at DESC, users.id DESC
  LIMIT … OFFSET …` with LIMIT=7 and OFFSET=7 bound.
- PostgreSQL returned exactly 7 rows, and `password_hash` is not selected.
- Filters and sort come before LIMIT/OFFSET in one statement.
- The number of queries stays the same (count + page) for page sizes 5 and 25, so there is no
  N+1.
- Role `user_count` is computed in one statement.

**Query plans** (`EXPLAIN ANALYZE`, 200 000 users inserted in a rolled-back transaction):

| Query | Plan | Time |
| --- | --- | --- |
| Default list, LIMIT 10 OFFSET 20 | Index Scan Backward using `ix_users_created_at_id` | 0.04 ms |
| `role_id = 2` + default sort | Index Only Scan Backward using `ix_users_role_id_created_at_id` | 0.10 ms |
| Sort by name | Index Only Scan using `ix_users_name_id` | 0.07 ms |
| Login lookup | Index Scan using `ix_users_email` | 0.05 ms |
| `ILIKE '%…%'` search | Parallel Seq Scan, as expected | 434 ms |

The search result is why `pg_trgm` is the documented next step once user tables are large.

**Live API (curl)**

- Login: 200, httpOnly cookie with `Path=/api/v1/auth`.
- Wrong password: 401 `invalid_credentials`.
- Invalid body: 422 with field details.
- `/users?page_size=3`: `{page:1,page_size:3,total:48,total_pages:16}`.
- `page_size=101`: 422.
- Roles list includes `user_count`.
- Refresh: 200, rotated.
- Replay of the old token within the grace window: 401 only, and the current token still works.
- Logout: 204, and a following refresh returns 401.
- `/auth/me` without a token: 401 with `WWW-Authenticate: Bearer`.
- `/audit-logs` lists events.
- `/docs`, `/redoc`, `/api/v1/openapi.json`: 200.

**Frontend checks**

- `npm run check`: exit 0.
  - eslint: 0 problems.
  - prettier: all files formatted.
  - `tsc -b`: OK.
  - vitest: **45 passed** in 8 files.
  - vite build: OK.
- `grep` finds 0 `style=` occurrences in `src`/`index.html`, and no color literals outside
  `tokens.css`.

**Browser** (headless Chrome against the Vite dev server and the production `vite preview`)

- Screenshots of login, dashboard, users, roles, components, and account at 375, 768, 1280,
  and 1600 px.
- No horizontal page overflow on any page after the fixes below.
- Dark theme verified. The theme switcher persists the choice across a reload.
- Login form: client validation shown on the fields; the wrong-password error is shown.
- Session restored after a reload via the refresh cookie.
- Mobile offcanvas sidebar opens and closes with Escape.
- Production build network log (one request per interaction):
  - `users?page=1&page_size=10` → page 2 → `page_size=25` (resets to page 1) → sort
    `name asc/desc` → debounced `search=sharma` → `role_id=2`.
- Backend 409 duplicate email shown on the email field of the create-user modal.
- `manager@example.com` sees Users and Roles but no "Create user" button.
- `user@example.com` does not see the admin navigation, and `/admin/users` sends them to
  `/unauthorized`.

**Fixes made during verification**

1. The DataTable scroll container lacked `position: relative`. Bootstrap's absolutely
   positioned `.visually-hidden` header label escaped it and widened the page by 122 px on
   mobile (roles page).
2. `RadioGroupField` passed `defaultValue` to every radio input (React warning). It now maps to
   `defaultChecked`.
3. An empty selection bar showed above the table on desktop in stack mode. It is now hidden
   from md up when nothing is selected.
4. Added the Web Locks cross-tab refresh serialization, with a test.
5. Added the `/api` proxy to `vite preview`.

### Known issues

- Duplicate GET requests appear only in development, caused by React StrictMode double
  mounting. The production build sends exactly one request per change.
- React-Bootstrap and Popper set runtime inline positioning styles on modals, tooltips, and
  popovers. This is library behavior, not authored CSS. The dev-only React Refresh preamble is
  an inline script; the production HTML has none.
- Exact `count(*)` and deep `OFFSET` get slower on very large tables. Use keyset pagination
  for such endpoints when needed.
- `ILIKE` substring search does a sequential scan, which is fine for small tables. Add
  `pg_trgm` later.
- There is no rate limiting or account lockout on `/auth/login`.
- The role select loads at most 100 roles (`page_size=100`). If more roles are expected, use a
  searchable async select.
- Bulk deactivate is a client-side loop of PATCH requests, labeled demo. Add a backend bulk
  endpoint for real use.
- This machine has only legacy `docker-compose` 1.25, which cannot read the Compose
  Specification file. Install Compose v2+ (`docker compose`).
- Local PostgreSQL 12 already occupies port 5432 here, so the local `.env` files use 5434.

### Pending tasks

- Optional next steps for projects built on this base:
  - Login rate limiting.
  - Password reset by email (via `integrations/`).
  - Background job runner for `purge-tokens`.
  - Streaming CSV export endpoint.
  - `pg_trgm` search index.
  - CI pipeline running every quality command.
  - Dockerfiles for deployment.
  - OpenTelemetry tracing.
  - `eslint-plugin-jsx-a11y` once it supports ESLint 10.
  - TypeScript 7 once typescript-eslint supports it.

---

## 2026-10-07 13:17 — Remove Docker; local PostgreSQL + backend .venv + root `run.sh`

### Purpose

The user asked to remove Docker completely.

- The backend must run from a Python virtual environment.
- PostgreSQL must be a normal local installation, configured with `DATABASE_URL` in
  `backend/.env`, with a clear startup error when it is unavailable.
- A root `./run.sh` (`start | stop | restart | status | logs`) must prepare and run the backend
  and frontend together.

### Summary of changes

- **Docker removed.**
  - Deleted `docker-compose.yml`, the root `.env.example`, and the local root `.env` (which was
    only used by Compose).
  - Removed every Docker instruction from `README.md` and `rules.md`.
  - Removed the Docker artifacts that the previous entry created on this machine: the container
    `base_project_postgres`, the volume `base-project_postgres_data`, the network
    `base-project_default`, and the image `postgres:18-alpine`. The user's other containers were
    not touched.
- **Database configuration.**
  - `DATABASE_URL` in `backend/.env` is now the single, required database setting. The
    `POSTGRES_*` settings were removed.
  - `postgresql://` and `postgres://` URLs are converted to `postgresql+psycopg://`
    automatically.
  - A missing or invalid URL gives a clear validation message.
  - Settings read `backend/.env` through an absolute path derived from the code, so they work
    from any current directory.
- **Clear error when PostgreSQL is unavailable.** `app/db/session.py` has
  `check_database_connection()` and `DatabaseUnavailableError`, with an actionable message that
  never prints the password.
  - The API lifespan runs this check at startup (`DATABASE_STARTUP_CHECK=true`) and refuses to
    start with the message. The re-raise uses `from None` so the driver's traceback chain does not
    bury it.
  - New `python -m app.scripts.manage check-db` command.
  - New `DATABASE_CONNECT_TIMEOUT` setting (default 5 s), used as psycopg's `connect_timeout`.
- **Root `run.sh`** (bash, shellcheck-clean, no absolute paths, resolves the project root from
  its own location).
  - `start [--detach]`:
    1. Checks prerequisites: Node ≥ 22.22 (activates nvm with `frontend/.nvmrc` when the default
       node is older), npm or pnpm, Python ≥ 3.11 (`PYTHON`, `python3.x`, pyenv versions,
       `uv python find`), PostgreSQL client tools (warning only), and `backend/.env` with
       `DATABASE_URL`.
    2. Creates `backend/.venv` if it is missing, or recreates it if it is broken or older than
       3.11.
    3. Installs `requirements-dev.txt` with the venv's pip. This is skipped when the hash of the
       file and the Python version is unchanged.
    4. Runs `npm ci` / `pnpm install`, skipped when the hash of the lockfile and the Node version
       is unchanged.
    5. Checks the database with `manage check-db`.
    6. Runs `alembic upgrade head`, then `manage seed` (idempotent first admin).
    7. Refuses to start if a port is busy.
    8. Starts uvicorn (`--reload --reload-dir app`) and Vite, each in its own session/process
       group via `setsid` (falls back to `set -m` + `nohup` on macOS).
    9. Waits for `/api/v1/health/ready` and the Vite server.
    10. Detects crashes and timeouts: prints the end of the log, stops anything already started,
        and exits 1.
    11. Prints the URLs.
  - In the foreground, `start` streams prefixed logs, and Ctrl+C / TERM / HUP stops both
    services cleanly. It also exits if `./run.sh stop` is run elsewhere.
  - `stop` sends TERM to each process group, waits up to `STOP_TIMEOUT`, then KILL.
  - `status` shows PID, URL, and health. Exit codes: 0 healthy, 1 unhealthy, 3 stopped.
  - `logs [backend|frontend] [-n N]` follows the logs.
  - State lives in `.run/` (pid/url files plus `logs/*.log`, previous run kept as `*.log.1`),
    which is git-ignored.
- **Tests.**
  - `conftest.py` resets the test schema by reflecting and dropping tables instead of
    `DROP SCHEMA public`, which a non-superuser cannot do on PostgreSQL < 15.
  - `conftest.py` sets `DATABASE_STARTUP_CHECK=false`.
  - New tests for URL normalization, missing and invalid URLs, the unreachable-database message
    (password not leaked), and the app refusing to start.
- **Documentation.**
  - `README.md` rewritten for this setup: prerequisites, quick start, "Running with run.sh",
    environment table, PostgreSQL setup (install per OS, `CREATE ROLE/DATABASE`, `pg_hba`
    notes, URL encoding, behavior when unavailable), venv-based manual backend commands, how to
    manage dependencies, and troubleshooting.
  - `rules.md` updated: a "No Docker" rule, no global Python packages, keep `run.sh` in sync
    (shellcheck-clean), and venv-based check commands.

### Files added

- `run.sh` (executable)
- `backend/tests/unit/test_database_check.py`

### Files modified

- `backend/app/core/config.py`, `backend/app/db/session.py`, `backend/app/main.py`,
  `backend/app/scripts/manage.py`
- `backend/tests/conftest.py`, `backend/tests/unit/test_config.py`
- `backend/.env.example`, and the local untracked `backend/.env`
- `README.md`, `rules.md`, `.gitignore`

Files deleted: `docker-compose.yml`, `.env.example` (root), and the local untracked `.env`
(root). `backend/.venv` and `frontend/node_modules` were deleted and recreated by `run.sh` as
part of the test.

### Architectural and design decisions

- Docker is removed entirely. This supersedes the Docker Compose decision in the 2026-10-07 12:41
  entry. The project runs with a local PostgreSQL, `backend/.venv`, Node.js, and `run.sh`.
- `DATABASE_URL` is the only database setting, which keeps one source of truth now that there is
  no Compose file to keep `POSTGRES_*` in sync with.
- Backend dependencies are installed into `.venv` from the pinned `requirements-dev.txt` with the
  venv's own pip, so uv is not needed to run the project. `pyproject.toml` + `uv.lock` remain the
  source for declaring and locking dependencies; uv is an optional maintainer tool for
  regenerating `uv.lock` and `requirements*.txt`.
- The API fails fast at startup when PostgreSQL is unreachable, instead of failing on the first
  request. `/health/ready` still reports 503 if the database disappears later. Tests disable the
  startup check because they use their own database through dependency overrides.
- `run.sh` design:
  - Each service runs in its own process group, so signals reach uvicorn's reloader and workers
    and Vite's children.
  - Liveness checks the process group **or** the leader PID. This fixes a launch race found
    during testing: just after the fork, the group does not exist until the child calls
    `setsid()`.
  - Backend startup failure is also detected from the log (`Traceback`,
    `Application startup failed`, …), because `uvicorn --reload` keeps its supervisor alive when
    the app crashes.
- `run.sh start` creates `frontend/.env` from its example automatically, since it holds no
  secrets. If `backend/.env` is missing, `run.sh` creates it from the example and **stops**,
  because `DATABASE_URL` and the secrets must be set deliberately.
- A missing database user or database is **not** created by `run.sh`: that needs PostgreSQL
  superuser rights. The steps are documented instead.
- `run.sh start` seeds only the first admin (idempotent). Demo users stay an explicit manual
  command.
- The local `backend/.env` on this machine was set to
  `postgresql://base_project:<generated password>@localhost:5432/base_project`, pointing at the
  installed PostgreSQL 12 cluster. The role and database must be created once with `sudo`; see
  Pending tasks.

### Dependencies changed

None. `requirements*.txt` and `uv.lock` are unchanged; `docker`/Compose is no longer used.

### Validation performed

**Backend checks**

- `ruff format --check .`: 70 files formatted.
- `ruff check .`: all checks passed.
- `mypy app tests`: no issues in 70 files.
- `pytest` against a local PostgreSQL **12.22** with a non-superuser owner (role created with
  `CREATE ROLE … LOGIN PASSWORD … CREATEDB` exactly as documented): **97 passed**.

**Frontend checks**

- `npm run check` after `run.sh` reinstalled `node_modules`: lint, format, and typecheck OK;
  **45 tests passed**; build OK.

**run.sh**

- `shellcheck` 0.11.0: clean.
- Verified against a throwaway PostgreSQL 12 cluster started with the installed
  `initdb`/`pg_ctl` (TCP 127.0.0.1:5440, no Docker, no sudo), selected with a `DATABASE_URL`
  environment override. The cluster has since been deleted.
- Fresh setup from `/tmp`, with `backend/.venv` and `frontend/node_modules` deleted and the
  default `node` 18 and `python3` 3.8 on PATH:
  - It selected Node 24.12.0 via nvm and Python 3.11.7 via pyenv.
  - It created the venv, installed both sides' dependencies, checked the DB, migrated, seeded the
    admin, and started both services. Exit 0, about 58 s.
- `status`: both running and healthy, exit 0. After `stop`: both stopped, exit 3.
- `logs`, `logs backend -n 2`: OK.
- Login through the Vite proxy (`POST localhost:5173/api/v1/auth/login`): 200.
- Process groups: uvicorn's reloader and both multiprocessing children share one group, and Vite
  has its own.
- `stop` left zero processes in either group and freed the ports.
- Foreground `start`, then SIGINT to its process group (the same as Ctrl+C): both services
  stopped and run.sh exited 0.
- Foreground `start`, then `./run.sh stop` from another shell: the foreground session printed
  "stopped from another terminal" and exited 0.
- `restart --detach`: new PIDs, and dependencies reported as up to date (no reinstall).
- Failure detection, tested in a copy of the project under the scratchpad (which also proves it
  works from any location):

| Scenario | Result |
| --- | --- |
| Backend crashes on import | "The backend failed to start" with the traceback tail; exit 1; nothing left running |
| Frontend crashes at startup (invalid `vite.config.ts`) | Error tail shown; the already-started backend was stopped too; exit 1 |
| Port 8000 busy | "Port 8000 is already in use…"; exit 1 |
| PostgreSQL down | The clear `check-db` message; exit 1 |
| `backend/.env` missing | Created from the example, with instructions; exit 1 |
| `DATABASE_URL` empty | Clear message; exit 1 |

**Backend alone**

- `uvicorn` started directly without a database prints the CRITICAL "Startup aborted:
  PostgreSQL is unavailable" message, a short traceback, and "Application startup failed.
  Exiting.".

**Real configuration**

- Against the installed PostgreSQL 12 on :5432, `./run.sh start` stops at the Database step with
  `password authentication failed for user "base_project"`. This is expected: the role does not
  exist yet (Pending tasks).

### Known issues

- On this machine, the `base_project` role and database still have to be created in the
  system PostgreSQL 12 cluster. That requires `sudo`, which could not be run non-interactively.
- PostgreSQL 12 is end-of-life. It works and passes all tests, but 14+ is recommended.
- `run.sh` targets Linux and macOS. On Windows, use WSL.

### Pending tasks

- **User action (once):** create the database user and database. Use the password stored in
  `DATABASE_URL` in `backend/.env`:
  `sudo -u postgres psql -c "CREATE ROLE base_project WITH LOGIN PASSWORD '<password from backend/.env>' CREATEDB;" -c "CREATE DATABASE base_project OWNER base_project;"`
  Then run `./run.sh start`.
