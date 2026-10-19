"""Add pg_trgm GIN indexes for ILIKE substring search on users.name and users.email.

Without this migration ILIKE '%term%' causes a sequential scan (verified at 200k rows: 434ms).
With GIN + trgm the same query uses an index scan.

NOTE: CREATE INDEX CONCURRENTLY cannot run inside a transaction (Alembic default). The indexes
here use a standard non-concurrent build, which is fine during a maintenance window or fresh
install.  For zero-downtime deployment on large tables, run the two CREATE INDEX commands
manually outside this migration:
    CREATE EXTENSION IF NOT EXISTS pg_trgm;
    CREATE INDEX CONCURRENTLY ix_users_name_trgm  ON users USING GIN (name  gin_trgm_ops);
    CREATE INDEX CONCURRENTLY ix_users_email_trgm ON users USING GIN (email gin_trgm_ops);

Revision ID: a1b2c3d4e5f6
Revises: 8f3d8b11361c
Create Date: 2026-10-19 10:30:00.000000+00:00

"""

from collections.abc import Sequence

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "a1b2c3d4e5f6"
down_revision: str | None = "8f3d8b11361c"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    # Enable the pg_trgm extension (idempotent; requires superuser or pg_extension privilege).
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")

    # GIN trigram index on users.name — supports ILIKE '%term%' queries for name search.
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_users_name_trgm "
        "ON users USING GIN (name gin_trgm_ops)"
    )

    # GIN trigram index on users.email — supports ILIKE '%term%' queries for email search.
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_users_email_trgm "
        "ON users USING GIN (email gin_trgm_ops)"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_users_email_trgm")
    op.execute("DROP INDEX IF EXISTS ix_users_name_trgm")
    # Do not drop the pg_trgm extension — other schemas may rely on it.
