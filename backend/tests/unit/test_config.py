from typing import Any

import pytest
from app.core.config import INSECURE_DEFAULT_SECRET, Settings
from pydantic import ValidationError
from sqlalchemy import make_url

TEST_URL = "postgresql://app:secret@db.internal:6543/appdb"


def _settings(**overrides: Any) -> Settings:
    overrides.setdefault("database_url", TEST_URL)
    return Settings(_env_file=None, **overrides)


def test_cors_origins_are_split_from_comma_separated_string() -> None:
    settings = _settings(cors_origins="http://a.test, http://b.test")
    assert settings.cors_origins == ["http://a.test", "http://b.test"]


def test_wildcard_cors_origin_is_rejected() -> None:
    with pytest.raises(ValidationError):
        _settings(cors_origins="*")


def test_production_rejects_insecure_secret() -> None:
    with pytest.raises(ValidationError):
        _settings(app_env="production", jwt_secret_key=INSECURE_DEFAULT_SECRET)


def test_production_requires_secure_cookie() -> None:
    with pytest.raises(ValidationError):
        _settings(app_env="production", jwt_secret_key="x" * 40, refresh_cookie_secure=False)


def test_default_page_size_cannot_exceed_maximum() -> None:
    with pytest.raises(ValidationError):
        _settings(pagination_default_page_size=200, pagination_max_page_size=100)


def test_plain_postgresql_url_uses_psycopg_driver() -> None:
    url = make_url(_settings().sqlalchemy_database_url)
    assert url.drivername == "postgresql+psycopg"
    assert (url.host, url.port, url.database, url.username) == ("db.internal", 6543, "appdb", "app")
    assert url.password == "secret"


def test_short_scheme_and_explicit_driver_are_accepted() -> None:
    short = _settings(database_url="postgres://u:p@localhost/db").sqlalchemy_database_url
    assert short == "postgresql+psycopg://u:p@localhost/db"
    explicit = _settings(database_url="postgresql+psycopg://u:p@localhost/db")
    assert explicit.sqlalchemy_database_url == "postgresql+psycopg://u:p@localhost/db"


def test_url_encoded_password_round_trips() -> None:
    url = make_url(
        _settings(database_url="postgresql://u:p%40ss%20word@h/db").sqlalchemy_database_url
    )
    assert url.password == "p@ss word"


def test_missing_database_url_has_a_clear_error() -> None:
    with pytest.raises(ValidationError, match="DATABASE_URL is not set"):
        _settings(database_url=None)


def test_non_postgresql_url_is_rejected() -> None:
    with pytest.raises(ValidationError, match="postgresql://"):
        _settings(database_url="mysql://u:p@localhost/db")


def test_pagination_defaults() -> None:
    settings = _settings()
    assert settings.pagination_default_page_size == 10
    assert settings.pagination_max_page_size == 100
