import pytest
from app.core.config import settings
from app.db import session as db
from app.main import app
from fastapi.testclient import TestClient
from sqlalchemy import create_engine


def _unreachable_engine():  # nothing listens on port 1
    return create_engine(
        "postgresql+psycopg://someone:top-secret@127.0.0.1:1/missing_db",
        connect_args={"connect_timeout": 2},
    )


def test_unreachable_database_raises_actionable_error() -> None:
    engine = _unreachable_engine()
    with pytest.raises(db.DatabaseUnavailableError) as exc:
        db.check_database_connection(engine)
    message = str(exc.value)
    assert "Cannot connect to PostgreSQL at postgresql://someone@127.0.0.1:1/missing_db" in message
    assert "DATABASE_URL" in message
    assert "top-secret" not in message  # never leak the password
    engine.dispose()


def test_app_refuses_to_start_without_database(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "database_startup_check", True)
    monkeypatch.setattr(db, "engine", _unreachable_engine())
    with pytest.raises(db.DatabaseUnavailableError), TestClient(app):
        pass
