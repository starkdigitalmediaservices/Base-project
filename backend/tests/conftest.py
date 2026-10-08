"""Shared pytest fixtures.

Integration tests run against a real PostgreSQL test database (default "<POSTGRES_DB>_test",
override with TEST_DATABASE_URL). The schema is rebuilt from Alembic migrations once per test
session, and every test runs inside a transaction that is rolled back afterwards.
"""

import os

# Must be set before the application settings are imported.
os.environ["APP_ENV"] = "test"
os.environ["REFRESH_COOKIE_SECURE"] = "false"
os.environ["LOG_LEVEL"] = "WARNING"
os.environ["ENABLE_DOCS"] = "true"
# Tests use their own database via dependency overrides; skip the app's startup check.
os.environ["DATABASE_STARTUP_CHECK"] = "false"

from collections.abc import Callable, Iterator
from pathlib import Path

import pytest
from alembic import command
from alembic.config import Config
from app.api.dependencies import get_db
from app.core.config import settings
from app.core.permissions import RoleName
from app.core.security import hash_password
from app.main import app
from app.models import Role, User
from fastapi.testclient import TestClient
from sqlalchemy import Engine, MetaData, create_engine, make_url, select, text
from sqlalchemy.orm import Session

BACKEND_DIR = Path(__file__).resolve().parents[1]
DEFAULT_PASSWORD = "Str0ng-Passw0rd!"
_PASSWORD_HASH = hash_password(DEFAULT_PASSWORD)  # hashed once; argon2 is slow on purpose


def _test_database_url() -> str:
    if settings.test_database_url:
        return settings.test_database_url
    url = make_url(settings.sqlalchemy_database_url)
    return url.set(database=f"{url.database}_test").render_as_string(hide_password=False)


def _ensure_database(url: str) -> None:
    target = make_url(url)
    admin_engine = create_engine(target.set(database="postgres"), isolation_level="AUTOCOMMIT")
    try:
        with admin_engine.connect() as conn:
            exists = conn.scalar(
                text("SELECT 1 FROM pg_database WHERE datname = :name"),
                {"name": target.database},
            )
            if not exists:
                conn.execute(text(f'CREATE DATABASE "{target.database}"'))
    finally:
        admin_engine.dispose()


def run_migrations(url: str, revision: str = "head", *, downgrade: bool = False) -> None:
    config = Config(str(BACKEND_DIR / "alembic.ini"))
    config.set_main_option("sqlalchemy.url", url.replace("%", "%%"))
    config.attributes["configure_logger"] = False
    if downgrade:
        command.downgrade(config, revision)
    else:
        command.upgrade(config, revision)


@pytest.fixture(scope="session")
def database_url() -> str:
    return _test_database_url()


@pytest.fixture(scope="session")
def engine(database_url: str) -> Iterator[Engine]:
    _ensure_database(database_url)
    engine = create_engine(database_url)
    with engine.begin() as conn:  # start every run from an empty schema
        # Reflect + drop works for any table owner on every PostgreSQL version (dropping the
        # `public` schema needs superuser rights before PostgreSQL 15).
        existing = MetaData()
        existing.reflect(bind=conn)
        existing.drop_all(bind=conn)
    run_migrations(database_url)
    yield engine
    engine.dispose()


@pytest.fixture
def db_session(engine: Engine) -> Iterator[Session]:
    """A session whose commits become SAVEPOINT releases inside a rolled-back transaction."""
    connection = engine.connect()
    transaction = connection.begin()
    session = Session(
        bind=connection,
        join_transaction_mode="create_savepoint",
        autoflush=False,
        expire_on_commit=False,
    )
    try:
        yield session
    finally:
        session.close()
        transaction.rollback()
        connection.close()


@pytest.fixture
def client(db_session: Session) -> Iterator[TestClient]:
    def _override_get_db() -> Iterator[Session]:
        yield db_session

    app.dependency_overrides[get_db] = _override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def roles(db_session: Session) -> dict[str, Role]:
    return {role.name: role for role in db_session.scalars(select(Role))}


UserFactory = Callable[..., User]


@pytest.fixture
def make_user(db_session: Session, roles: dict[str, Role]) -> UserFactory:
    counter = {"n": 0}

    def _make(
        *,
        role: str = RoleName.USER,
        email: str | None = None,
        name: str | None = None,
        is_active: bool = True,
    ) -> User:
        counter["n"] += 1
        user = User(
            name=name or f"Test User {counter['n']:03d}",
            email=(email or f"user{counter['n']:03d}@example.com").lower(),
            password_hash=_PASSWORD_HASH,
            is_active=is_active,
            role=roles[role],
        )
        db_session.add(user)
        db_session.flush()
        return user

    return _make


def login(client: TestClient, email: str, password: str = DEFAULT_PASSWORD) -> str:
    response = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert response.status_code == 200, response.text
    return str(response.json()["access_token"])


def auth_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def admin(make_user: UserFactory) -> User:
    return make_user(role=RoleName.ADMIN, email="admin.test@example.com", name="Admin Test")


@pytest.fixture
def admin_headers(client: TestClient, admin: User) -> dict[str, str]:
    return auth_headers(login(client, admin.email))
