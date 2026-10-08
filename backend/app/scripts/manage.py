"""Management commands.

    python -m app.scripts.manage seed                    # ensure roles + first admin user
    python -m app.scripts.manage seed --demo-users 45    # also create demo accounts (dev only)
    python -m app.scripts.manage purge-tokens            # delete expired refresh tokens
    python -m app.scripts.manage check-db                # verify PostgreSQL is reachable

The commands are idempotent and safe to re-run. Credentials always come from the environment
(FIRST_ADMIN_EMAIL / FIRST_ADMIN_PASSWORD); nothing is hard-coded.
"""

import argparse
import sys
from datetime import timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.logging import configure_logging, get_logger
from app.core.permissions import RoleName
from app.core.security import hash_password
from app.db.session import (
    DatabaseUnavailableError,
    SessionLocal,
    check_database_connection,
    describe_database,
    engine,
)
from app.models import Role, User
from app.services.auth_service import AuthService
from app.utils.time import utcnow

logger = get_logger("app.manage")

_PLACEHOLDER_PASSWORDS = {"change-me-admin-password"}
_FIRST_NAMES = ["Aarav", "Diya", "Kabir", "Meera", "Rohan", "Sara", "Vihaan", "Anaya", "Ishan"]
_LAST_NAMES = ["Sharma", "Patel", "Iyer", "Khan", "Das", "Mehta", "Rao", "Nair", "Joshi"]


def _ensure_roles(session: Session) -> dict[str, Role]:
    roles = {role.name: role for role in session.scalars(select(Role))}
    missing = [name for name in RoleName if name.value not in roles]
    if missing:
        raise SystemExit(
            f"Missing system roles {missing}. Run `alembic upgrade head` before seeding."
        )
    return roles


def _ensure_admin(session: Session, roles: dict[str, Role]) -> None:
    email = (settings.first_admin_email or "").strip().lower()
    password = (
        settings.first_admin_password.get_secret_value() if settings.first_admin_password else ""
    )
    if not email or not password:
        logger.warning("FIRST_ADMIN_EMAIL / FIRST_ADMIN_PASSWORD not set; skipping admin user")
        return
    if settings.is_production and (password in _PLACEHOLDER_PASSWORDS or len(password) < 12):
        raise SystemExit("Refusing to create a production admin with a placeholder/short password.")

    if session.scalar(select(User).where(User.email == email)) is not None:
        logger.info("Admin user already exists", extra={"email": email})
        return
    session.add(
        User(
            name=settings.first_admin_name,
            email=email,
            password_hash=hash_password(password),
            role=roles[RoleName.ADMIN],
        )
    )
    session.commit()
    logger.info("Created admin user", extra={"email": email})


def _seed_demo_users(session: Session, roles: dict[str, Role], count: int) -> None:
    if settings.is_production:
        raise SystemExit("Demo users cannot be created when APP_ENV=production.")
    password = (
        settings.first_admin_password.get_secret_value() if settings.first_admin_password else ""
    )
    if not password:
        raise SystemExit("Set FIRST_ADMIN_PASSWORD; demo users share it (development only).")

    password_hash = hash_password(password)  # hashed once and shared to keep seeding fast
    existing = set(session.scalars(select(User.email)))
    now = utcnow()
    accounts = [
        ("Demo Manager", "manager@example.com", RoleName.MANAGER, True),
        ("Demo User", "user@example.com", RoleName.USER, True),
    ]
    for index in range(1, count + 1):
        first = _FIRST_NAMES[index % len(_FIRST_NAMES)]
        last = _LAST_NAMES[(index // len(_FIRST_NAMES)) % len(_LAST_NAMES)]
        role = RoleName.MANAGER if index % 7 == 0 else RoleName.USER
        accounts.append(
            (f"{first} {last} {index:03d}", f"demo{index:03d}@example.com", role, index % 5 != 0)
        )

    created = 0
    for offset, (name, email, role_name, is_active) in enumerate(accounts):
        if email in existing:
            continue
        user = User(
            name=name,
            email=email,
            password_hash=password_hash,
            role=roles[role_name],
            is_active=is_active,
        )
        user.created_at = now - timedelta(minutes=offset)
        session.add(user)
        created += 1
    session.commit()
    logger.info("Demo users seeded", extra={"created_count": created})


def seed(demo_users: int) -> None:
    with SessionLocal() as session:
        roles = _ensure_roles(session)
        _ensure_admin(session, roles)
        if demo_users > 0:
            _seed_demo_users(session, roles, demo_users)


def purge_tokens() -> None:
    with SessionLocal() as session:
        deleted = AuthService(session).purge_expired_tokens()
    logger.info("Expired refresh tokens purged", extra={"deleted_count": deleted})


def check_db() -> int:
    try:
        check_database_connection()
    except DatabaseUnavailableError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1
    print(f"PostgreSQL is reachable at {describe_database(engine)}")
    return 0


def main(argv: list[str] | None = None) -> int:
    configure_logging(settings.log_level, settings.log_format)
    parser = argparse.ArgumentParser(prog="python -m app.scripts.manage")
    commands = parser.add_subparsers(dest="command", required=True)

    seed_cmd = commands.add_parser("seed", help="Ensure system roles exist and create the admin.")
    seed_cmd.add_argument(
        "--demo-users",
        type=int,
        default=0,
        metavar="N",
        help="Also create manager@example.com, user@example.com and N demo users (dev only).",
    )
    commands.add_parser("purge-tokens", help="Delete expired refresh tokens.")
    commands.add_parser(
        "check-db", help="Exit non-zero with a clear message if PostgreSQL is down."
    )

    args = parser.parse_args(argv)
    if args.command == "seed":
        seed(max(0, args.demo_users))
    elif args.command == "purge-tokens":
        purge_tokens()
    elif args.command == "check-db":
        return check_db()
    return 0


if __name__ == "__main__":
    sys.exit(main())
