"""Seed the system roles (admin, manager, user).

Idempotent: existing rows are left untouched. Permissions for these roles are defined in
app/core/permissions.py, not in the database. The first admin USER is created by
`python -m app.scripts.manage seed` (credentials come from environment variables).

Revision ID: 8f3d8b11361c
Revises: 057b46243912
Create Date: 2026-10-07 06:37:18.332112+00:00

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "8f3d8b11361c"
down_revision: str | None = "057b46243912"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


SYSTEM_ROLES = (
    ("admin", "Full access to every administrative feature."),
    ("manager", "Can view users and roles."),
    ("user", "Standard account with access to its own profile."),
)


def upgrade() -> None:
    roles = sa.table("roles", sa.column("name", sa.String), sa.column("description", sa.String))
    for name, description in SYSTEM_ROLES:
        op.execute(
            postgresql.insert(roles)
            .values(name=name, description=description)
            .on_conflict_do_nothing(index_elements=["name"])
        )


def downgrade() -> None:
    # Fails (by design, FK RESTRICT) if users are still assigned to these roles.
    roles = sa.table("roles", sa.column("name", sa.String))
    op.execute(roles.delete().where(roles.c.name.in_([name for name, _ in SYSTEM_ROLES])))
