"""Engine, session factory, and the PostgreSQL availability check.

Request handlers get sessions via `app.api.dependencies.get_db`.
"""

from collections.abc import Iterator

from sqlalchemy import Engine, create_engine, text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import ENV_FILE, settings

engine = create_engine(
    settings.sqlalchemy_database_url,
    echo=settings.database_echo,
    pool_pre_ping=True,
    pool_size=settings.database_pool_size,
    max_overflow=settings.database_max_overflow,
    connect_args={"connect_timeout": settings.database_connect_timeout},
)

SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def get_session() -> Iterator[Session]:
    with SessionLocal() as session:
        yield session


class DatabaseUnavailableError(RuntimeError):
    """PostgreSQL could not be reached with the configured DATABASE_URL."""


def describe_database(target: Engine) -> str:
    """Where the app connects, without the password (safe to print and log)."""
    url = target.url
    return (
        f"postgresql://{url.username}@{url.host or 'localhost'}:{url.port or 5432}/{url.database}"
    )


def check_database_connection(target: Engine | None = None) -> None:
    """Run `SELECT 1`; raise `DatabaseUnavailableError` with an actionable message on failure."""
    target = target or engine
    try:
        with target.connect() as connection:
            connection.execute(text("SELECT 1"))
    except SQLAlchemyError as exc:
        reason = str(getattr(exc, "orig", None) or exc).strip().splitlines()[0]
        raise DatabaseUnavailableError(
            f"Cannot connect to PostgreSQL at {describe_database(target)}.\n"
            f"  Reason: {reason}\n"
            "  Check that:\n"
            "    1. PostgreSQL is installed and running "
            "(Linux: `sudo systemctl start postgresql`, macOS: `brew services start postgresql`).\n"
            '    2. The database and user exist (README.md → "PostgreSQL setup").\n'
            f"    3. DATABASE_URL in {ENV_FILE} has the right host, port, user, and password."
        ) from exc
