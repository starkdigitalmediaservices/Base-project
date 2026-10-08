# Project Rules (mandatory)

These rules apply to **every** change in this repository, in both `frontend/` and `backend/`,
whether made by a human or by an AI development tool (Claude, Cursor, Antigravity, Copilot, or any
other assistant). If a rule and a request conflict, follow §11 (Ambiguity and conflicts).

---

## 1. Mandatory AI workflow

Before writing or modifying any code, an AI tool **must**:

1. Inspect the project directory (at least the root, `frontend/src/`, and `backend/app/`).
2. Read this `rules.md` **completely**.
3. Read `memory.md` **completely**: it is the project's decision log.
4. Follow every applicable rule and preserve existing architectural decisions recorded in
   `memory.md`. Do not silently reverse a recorded decision.
5. Write down major assumptions **before** implementing them (in the response to the user, and
   in the `memory.md` entry under "Architectural and design decisions").

After every prompt that causes a meaningful change (code, configuration, dependencies, schema,
documentation that changes behavior), the AI tool **must**:

1. Run the relevant checks (§9) for every part it touched and fix failures.
2. Append a new entry to `memory.md` using the format in §12, including the check results.
3. Never delete or rewrite earlier `memory.md` entries unless the user explicitly asks.
   Corrections go in a new entry that references the old one.

Trivial changes (typo in a comment, formatting only) do not need a memory entry.

---

## 2. Project purpose and root structure

This is a **reusable full-stack foundation**, not a business application. It provides
authentication, role-based authorization, user/role administration, audit logging, a design
system, reusable UI components, and backend pagination that new projects build on.

```text
project-root/
├── frontend/          React + TypeScript + Vite + Bootstrap
├── backend/           FastAPI + SQLAlchemy 2 + Alembic + PostgreSQL
├── rules.md           This file (mandatory rules)
├── memory.md          Append-only change history and decision log
├── README.md          Setup and developer documentation
├── run.sh             Local runner: start | stop | restart | status | logs (backend + frontend)
└── .gitignore
```

- Do **not** add business-specific modules to the foundation itself. When a project built on
  this base adds business features, follow §4.6 (frontend) and §5.6 (backend).
- Do **not** create an `integrations/` directory until the first AI model or external service is
  introduced (see §10).

---

## 3. Technology standards

| Area | Standard |
| --- | --- |
| Frontend runtime | Node.js 24 LTS (`frontend/.nvmrc`), npm with committed `package-lock.json` |
| Frontend | React 19, TypeScript (strict), Vite, React Router, TanStack Query, React Hook Form + Zod |
| UI | Bootstrap 5.3 (precompiled CSS) + React-Bootstrap, CSS variables, CSS Modules |
| Frontend quality | ESLint (flat config, typescript-eslint), Prettier, Vitest + Testing Library |
| Backend runtime | Python 3.11+ (code must stay 3.11-compatible) in the project virtual environment `backend/.venv`, installed from the pinned `requirements*.txt` (exported from the committed `uv.lock`) |
| Backend | FastAPI, Pydantic v2, pydantic-settings, SQLAlchemy 2.x (typed `Mapped[]` style), Alembic, psycopg 3 |
| Security | pwdlib (Argon2id) for passwords, PyJWT for access tokens, opaque hashed refresh tokens |
| Backend quality | Ruff (lint + format), mypy (strict), pytest |
| Database | PostgreSQL as a normal local installation (14+ recommended), configured only through `DATABASE_URL` in `backend/.env` |

Rules:

- Use only stable, non-deprecated APIs. Check the installed package's actual API before using it.
- Add a dependency only when it removes real complexity; prefer the platform and existing deps.
  Record every added/removed/upgraded dependency in `memory.md` with the reason.
- Pin through lockfiles (`package-lock.json`, `uv.lock` + the exported `requirements*.txt`); never
  delete a lockfile to "fix" an install. After changing Python dependencies, regenerate
  `uv.lock` and both requirements files in the same change (commands in README → "Dependencies").
- **No Docker.** The project runs with a local PostgreSQL, the backend `.venv`, Node.js, and
  `run.sh`. Do not add Dockerfiles, compose files, or Docker-only instructions unless the user
  explicitly asks; record that decision in `memory.md`.
- Never rely on globally installed Python packages. Backend tools (uvicorn, alembic, pytest,
  ruff, mypy) always run from `backend/.venv`.
- Keep `run.sh` working whenever setup steps change: new required tools, services, env
  variables, or migration/seed steps must be added to it and to the README in the same change.
  `run.sh` must stay free of hard-coded absolute paths and must pass `shellcheck`.
- Major upgrades (React, Vite, FastAPI, SQLAlchemy, Pydantic, Bootstrap, TypeScript) need their own
  memory entry describing the migration and verification.

---

## 4. Frontend rules

### 4.1 Bootstrap and responsive design

- Use Bootstrap / React-Bootstrap components and utilities for layout, grid, spacing, and common
  widgets before writing custom CSS.
- Every screen must work on mobile (< 576px), tablet (≥ 768px), desktop (≥ 992px), and large
  screens (≥ 1400px). Use Bootstrap breakpoints; do not invent new ones.
- Tables must scroll horizontally or reflow on small screens. Never cause page-level horizontal
  scrolling.

### 4.2 No inline CSS — separate, organized CSS

- **No inline CSS.** No `style={...}` props, no `style="..."` attributes, no inline `<style>` or
  `<script>` blocks in `index.html`. ESLint enforces the JSX rule; do not disable it.
- Global styles live in `frontend/src/styles/` and `frontend/src/theme/`. Component styles live
  next to the component as `ComponentName.module.css`.
- Never hard-code colors, font sizes, spacing, radii, shadows, or z-indexes in component CSS.
  Use the design tokens (`var(--app-…)`) or Bootstrap variables/utilities.
- Hex/RGB color literals are allowed **only** in `frontend/src/theme/tokens.css`.

### 4.3 Theme and component reuse

- `frontend/src/theme/tokens.css` is the single source of truth for colors (light and dark),
  typography, spacing, radii, shadows, and transitions. Changing a token must restyle the app.
- `frontend/src/theme/bootstrap-overrides.css` maps Bootstrap's CSS variables and variant classes
  to the tokens. Extend it there instead of overriding Bootstrap inside components.
- The theme switcher (light / dark / system) sets `data-bs-theme` on `<html>`. New components must
  look correct in both themes.
- **Reuse before duplication.** Check `src/components/` (and the component showcase page) before
  creating a component. Extend an existing component with a typed prop rather than copying it.
- Components are small, focused, typed (`interface …Props`), and accessible: semantic HTML,
  labels for every control, `aria-*` where needed, full keyboard support, visible
  `:focus-visible` styles, and WCAG AA contrast.
- Every data view must handle **loading, empty, error, and success** states using the shared
  components (skeletons/spinners, `EmptyState`, `ErrorState`, toasts/alerts).

### 4.4 Routing

- Routes are defined centrally in `frontend/src/routes/`. Pages live in `frontend/src/pages/`
  (or inside a feature folder) and are lazy-loaded where sensible.
- Use the provided guards: public-only routes (login), protected routes (authenticated), and
  permission-guarded routes. Navigation items declare the permission they need and are hidden when
  the user lacks it. **Frontend guards are UX only; the backend enforces authorization.**

### 4.5 API and state conventions

- All HTTP calls go through the API client in `frontend/src/services/`. Never call `fetch`
  directly from components and never hard-code backend URLs; use `VITE_API_BASE_URL`.
- Request/response types live in `frontend/src/types/` (or the feature's `types.ts`) and mirror the
  backend schemas.
- **Server state** → TanStack Query. **Session/auth state** → the auth context. **UI state**
  (sidebar, theme, toasts) → small dedicated contexts or local state. **Form state** → React Hook
  Form + Zod. Do not add a global store library without a recorded decision.
- The access token is kept in memory only. Never store tokens in `localStorage`/`sessionStorage`.
- Display backend validation errors on the matching form fields (`details[].field`).
- Paginated views request **one page at a time** using `page`/`page_size` and render the
  `total`/`total_pages` metadata from the API. Never fetch all rows to paginate in the browser.

### 4.6 Adding business features (frontend)

Create a feature folder `frontend/src/features/<feature>/` containing its `api.ts` (service
calls), `hooks.ts` (query/mutation hooks), `types.ts`, components, and pages. Register routes and
navigation centrally. Reuse `DataTable`, form components, and layout components.

---

## 5. Backend rules

### 5.1 Layering (keep routes thin)

| Layer | Location | Responsibility |
| --- | --- | --- |
| Routes | `app/api/routes/` | HTTP only: parse input, declare dependencies/permissions, call a service, return a schema |
| Dependencies | `app/api/dependencies.py` | DB session, current user, permission checks, pagination params |
| Services | `app/services/` | Business rules, transactions (`commit`), audit logging |
| Repositories | `app/repositories/` | All database queries (SQLAlchemy). No business rules, no commits |
| Models | `app/models/` | SQLAlchemy ORM tables, indexes, relationships |
| Schemas | `app/schemas/` | Pydantic request/response validation and serialization |
| Core | `app/core/` | Config, security primitives, permissions policy, logging, exceptions, middleware |

- Routes never contain SQL or business logic. Services never build HTTP responses.
- Raise `AppError` subclasses (`app/core/exceptions.py`) for expected failures; never return
  ad-hoc error dicts. All errors use the envelope
  `{"error": {"code", "message", "details", "request_id"}}`.
- Use dependency injection (`DbSession`, `CurrentUserDep`, `require_permission(...)`,
  `PageParamsDep`) instead of creating sessions or reading tokens manually.
- All settings come from `app/core/config.py` (environment variables). Never read `os.environ`
  elsewhere and never hard-code secrets, URLs, or credentials.

### 5.2 API design

- All endpoints are versioned under `/api/v1`. Breaking changes require a new version prefix.
- Every route declares `summary`, `response_model`, a tag, and documented error responses
  (`error_responses(...)`). Request bodies are Pydantic models with `extra="forbid"`.
- Status codes: 200 read/update, 201 create, 204 no content, 400 business-rule violation,
  401 not authenticated, 403 not permitted, 404 not found, 409 conflict, 422 validation,
  500 unexpected (generic message only), 503 dependency unavailable.
- CORS origins come from `CORS_ORIGINS`; `*` is rejected because credentials are allowed.

### 5.3 PostgreSQL, SQLAlchemy, and Alembic

- Use SQLAlchemy 2.x typed declarative models (`Mapped[...]`, `mapped_column`). Use ORM/Core
  expressions only — never build SQL with string formatting. Raw `text()` is allowed only with
  bound parameters.
- Relationships default to `lazy="raise_on_sql"`; load related data explicitly with
  `joinedload`/`selectinload`. This prevents N+1 queries.
- Timestamps are `timestamptz` (`DateTime(timezone=True)`) and generated by the database.
  Use `app.utils.time.utcnow()`; never use naive datetimes.
- **Every schema or index change requires an Alembic migration** in
  `backend/app/db/migrations/versions/`. Generate with
  `alembic revision --autogenerate -m "..."` (from `backend/` with `.venv` active), then review
  and edit it by hand.
  Never edit a migration that has been applied to a shared database; add a new one.
- Migrations must have a working `downgrade()` where feasible. Data migrations must be idempotent.
- `tests/integration/test_migrations.py` fails if models and migrations drift. Keep it green.
- Never call `Base.metadata.create_all()` in application code.

### 5.4 Foundation tables (exact)

| Table | Purpose |
| --- | --- |
| `roles` | `id`, `name` (unique, non-null), `description`, `created_at`, `updated_at` |
| `users` | `id`, `role_id` → `roles.id`, `name`, `email` (unique, lower-cased), `password_hash`, `is_active`, `created_at`, `updated_at` |
| `refresh_tokens` | Hashed refresh tokens: `user_id`, `token_hash`, `expires_at`, `revoked_at`, `user_agent`, `ip_address`, `created_at` |
| `audit_logs` | `actor_user_id` (nullable), `action`, `resource_type`, `resource_id`, `metadata` (JSONB), `ip_address`, `user_agent`, `created_at` |

- **Each user has exactly one role through `users.role_id`. There is no `user_roles` table** and
  one must not be added without an explicit, recorded architectural decision.
- System roles `admin`, `manager`, `user` are seeded by migration and cannot be renamed or deleted
  through the API.
- `app_settings` and `notifications` tables are intentionally **not** created. Add them only when
  a real feature needs them (with a migration and a memory entry). Intended use of a future
  `app_settings` table: small, admin-editable key/value runtime configuration (e.g. maintenance
  banner text) — never secrets.

### 5.5 Mandatory pagination rules

Every endpoint that returns a list **must** paginate in PostgreSQL:

- Default page size **10**; maximum page size **100** (`PAGINATION_DEFAULT_PAGE_SIZE`,
  `PAGINATION_MAX_PAGE_SIZE`). Use the `PageParamsDep` dependency, which validates `page >= 1` and
  `1 <= page_size <= max` (422 otherwise).
- **Never** fetch every row and slice in Python or in the UI. Use the helpers in
  `app/repositories/base.py`: `count_rows()` for the total and `apply_page()` for
  `ORDER BY … LIMIT … OFFSET` in the same SQL statement as the filters.
- Apply **filters, search, and sorting before pagination** (they are part of the SQL query).
- Sorting must be **stable and deterministic**: the requested column plus a unique tiebreaker
  (`app.utils.sql.ordering(..., tiebreaker=Model.id)`). Default: `created_at DESC, id DESC`.
- Sort fields are whitelisted with an enum; never pass a client string into `order_by`.
- Respond with `Page[T]`: `{"items": [...], "page", "page_size", "total", "total_pages"}`.
- Select only needed columns for list views (`load_only`), never `password_hash`.
- Avoid N+1 queries: join/eager-load related data in the page query.
- Escape user search input for `LIKE/ILIKE` with `app.utils.sql.contains_pattern()`.
- Add tests proving LIMIT/OFFSET are in the SQL and only one page of rows is returned (see
  `tests/integration/test_pagination_sql.py`).
- For very large or append-only tables where deep `OFFSET` becomes slow, use keyset (cursor)
  pagination and record the decision. Backend pagination cannot remove network latency, but it
  prevents oversized responses and unnecessary database load.

### 5.6 Adding business features (backend)

Add, in order: model (`app/models/`, export it in `app/models/__init__.py`) → Alembic migration →
schemas → repository → service → routes (register in `app/api/router.py`) → permissions in
`app/core/permissions.py` → tests. Business modules must reuse the auth dependencies, pagination
helpers, error classes, and audit service.

---

## 6. Database indexing rules

- Index based on **actual query patterns**, not guesses. Every non-obvious index must have a comment
  on the model explaining which query it serves.
- Required: unique index on `roles.name`, unique index on `users.email`, an index whose leading
  column is `users.role_id`, and an index for **every foreign key**
  (`test_every_foreign_key_is_indexed` enforces this).
- Index columns used in frequent filters, sorts, and lookups. Prefer composite indexes that match
  a repeated `WHERE … ORDER BY …` pattern (e.g. `(role_id, created_at, id)`).
- Do **not** index low-cardinality booleans (e.g. `is_active`) on their own, and do not add
  indexes "just in case" — each one slows writes.
- Substring search (`ILIKE '%term%'`) cannot use B-tree indexes. When a table grows large enough
  for search to matter, add a `pg_trgm` GIN index in a migration and record it.
- Review `EXPLAIN (ANALYZE)` for important list endpoints after adding or changing queries, and
  record notable findings in `memory.md`.
- Every index change goes through an Alembic migration.

---

## 7. Authentication, authorization, and security

- Passwords are hashed with Argon2id (pwdlib). Never store, log, or return plaintext passwords or
  password hashes.
- Access tokens: short-lived JWTs (default 15 min) sent as `Authorization: Bearer`. Refresh tokens:
  random opaque values in an **httpOnly** cookie scoped to `/api/v1/auth`; only an HMAC-SHA256
  hash is stored. Refresh tokens rotate on every use; replaying an old one outside the grace
  window revokes all of the user's sessions.
- Authorization is defined **only** in `app/core/permissions.py` (role name → permissions) and
  enforced with `require_permission(...)`. Never compare role names inside routes or services.
- `JWT_SECRET_KEY` must be ≥ 32 random characters in production (startup fails otherwise), and
  `REFRESH_COOKIE_SECURE=true` is enforced in production.
- No secrets in source control. Only `.env.example` files with placeholders are committed.
- Validate all input at the API boundary (Pydantic) and on the client (Zod) — the client check is
  for UX only.
- Error responses must not leak stack traces, SQL, secrets, or internal identifiers. Unexpected
  errors return a generic message plus `request_id`; details go to the server log.
- Logs are structured (JSON in production) and must never contain passwords, tokens, cookies,
  Authorization headers, or request bodies.
- Security-relevant actions (login success/failure, logout, token reuse, password change, user and
  role changes) are recorded with `AuditService`.

---

## 8. Code quality

- Small, focused modules and functions; no oversized files. Split a file when it mixes concerns.
- Type-safe code: TypeScript `strict`, no `any` without a justified comment; Python fully typed and
  passing `mypy --strict`.
- Match the surrounding code style, naming, and comment density. Comments explain *why*.
- No dead code, commented-out code, or unused dependencies.

---

## 9. Testing, linting, formatting, and build requirements

Run the checks for every area you changed. All must pass before a change is considered done.

**Backend** (from `backend/`, with `source .venv/bin/activate` or prefixed with `.venv/bin/`):

```bash
ruff format --check .            # formatting (use `ruff format .` to fix)
ruff check .                     # linting
mypy app tests                   # type checking
pytest                           # unit + integration tests (needs PostgreSQL)
```

**run.sh** (from the root): `shellcheck run.sh` when it changes, and smoke-test
`./run.sh start --detach`, `./run.sh status`, `./run.sh stop`.

**Frontend** (from `frontend/`):

```bash
npm run format:check             # Prettier (use `npm run format` to fix)
npm run lint                     # ESLint (includes the no-inline-style rule)
npm run typecheck                # TypeScript
npm test                         # Vitest
npm run build                    # production build
```

Test expectations: services, repositories, routes, validation, authentication, authorization,
and pagination on the backend; components, forms, guards, the API client, and the data table on
the frontend. New features add tests; bug fixes add a regression test.

---

## 10. Future integrations (AI models and external utilities)

Do not create the `integrations/` directory now. Whenever AI models or external utilities are
introduced later — such as email, file storage, payments, notifications, analytics, or
third-party APIs — organize them in a root-level `integrations/` directory:

- Isolate each provider behind a **client** (raw API calls) and an **adapter** that implements a
  provider-neutral interface used by the application. Keep provider-specific code out of generic
  business logic, services, and UI components.
- Store credentials **only** in environment variables (documented in `.env.example` files with
  placeholders).
- Include for each integration: request/response **schemas**, **prompts** where relevant
  (versioned files, not inline strings), **timeouts**, **retries** with backoff, **error
  handling** that maps provider errors to application errors, **logging** without sensitive data,
  **usage limits**/rate limiting and cost controls, **tests** (with the provider mocked), and
  **documentation** (README per integration).
- Suggested layout:

  ```text
  integrations/
  ├── README.md
  ├── <capability>/            e.g. email/, storage/, llm/, payments/
  │   ├── interface.py         provider-neutral protocol used by the app
  │   ├── <provider>/          e.g. smtp/, s3/, anthropic/
  │   │   ├── client.py
  │   │   ├── adapter.py
  │   │   ├── schemas.py
  │   │   └── prompts/         (AI only)
  │   └── tests/
  ```

- Record every integration decision (provider choice, limits, data sent to third parties) in
  `memory.md`.

---

## 11. Ambiguity and architectural conflicts

1. Prefer the existing pattern in the codebase and the decisions in `memory.md`.
2. If a request conflicts with these rules, **do not silently break the rule**. Explain the
   conflict, propose a compliant alternative, and ask the user. If the user explicitly accepts an
   exception, implement it and record the exception and its reason in `memory.md`.
3. When requirements are ambiguous and a reasonable default exists, choose the simplest secure
   option, state the assumption, and record it in `memory.md`.
4. Never weaken security (auth, validation, secrets handling, CORS) to make something work.
5. If these rules themselves need to change, update `rules.md` in the same change and record why.

---

## 12. Mandatory `memory.md` entry format

Append new entries at the **end** of `memory.md` (chronological order). Use local time in
`YYYY-MM-DD HH:MM` format and fill every section (write "None" when empty):

```markdown
## YYYY-MM-DD HH:MM — Change title

### Purpose

### Summary of changes

### Files added

### Files modified

### Architectural and design decisions

### Dependencies changed

### Validation performed

### Known issues

### Pending tasks
```

"Validation performed" lists the exact commands run and their results (e.g. `pytest: 91 passed`).
