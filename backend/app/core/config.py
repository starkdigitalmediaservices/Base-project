"""Application settings loaded from environment variables and `backend/.env`.

Every tunable value lives here. Never read `os.environ` elsewhere in the application.
Real environment variables take precedence over values in the `.env` file.
"""

from enum import StrEnum
from functools import lru_cache
from pathlib import Path
from typing import Annotated, Literal, Self

from pydantic import Field, SecretStr, field_validator, model_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict

# backend/.env, resolved from this file so it is found regardless of the current directory.
BACKEND_DIR = Path(__file__).resolve().parents[2]
ENV_FILE = BACKEND_DIR / ".env"

_DRIVER_SCHEME = "postgresql+psycopg://"
_PLAIN_SCHEMES = ("postgresql://", "postgres://")

INSECURE_DEFAULT_SECRET = "change-me-to-a-long-random-secret-at-least-32-chars"  # noqa: S105


class Environment(StrEnum):
    DEVELOPMENT = "development"
    TEST = "test"
    PRODUCTION = "production"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=ENV_FILE,
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    # --- Application -------------------------------------------------------
    app_name: str = "Base Project API"
    app_version: str = "0.1.0"
    app_env: Environment = Environment.DEVELOPMENT
    api_v1_prefix: str = "/api/v1"
    enable_docs: bool = True

    # --- Database (a locally installed PostgreSQL; see README "PostgreSQL setup") ---------
    # postgresql://USER:PASSWORD@HOST:PORT/DBNAME — "postgresql+psycopg://" is also accepted.
    database_url: str | None = None
    # Used only by the test suite; defaults to "<database>_test" on the same server.
    test_database_url: str | None = None
    database_echo: bool = False
    database_pool_size: int = Field(default=5, ge=1)
    database_max_overflow: int = Field(default=10, ge=0)
    # Seconds to wait for PostgreSQL before failing (startup check and new connections).
    database_connect_timeout: int = Field(default=5, ge=1, le=60)
    # Fail fast at startup with a clear message when PostgreSQL is unreachable.
    database_startup_check: bool = True

    # --- Security / JWT ----------------------------------------------------
    jwt_secret_key: SecretStr = SecretStr(INSECURE_DEFAULT_SECRET)
    jwt_algorithm: Literal["HS256", "HS384", "HS512"] = "HS256"
    jwt_issuer: str = "base-project"
    access_token_expire_minutes: int = Field(default=15, ge=1, le=24 * 60)
    refresh_token_expire_days: int = Field(default=7, ge=1, le=90)
    # A rotated token presented again within this window is treated as a benign concurrent
    # refresh (e.g. two tabs) instead of token theft. Outside it, all user sessions are revoked.
    refresh_token_reuse_grace_seconds: int = Field(default=10, ge=0, le=300)

    refresh_cookie_name: str = "refresh_token"
    refresh_cookie_secure: bool = True
    refresh_cookie_samesite: Literal["lax", "strict", "none"] = "lax"
    refresh_cookie_domain: str | None = None

    # --- CORS --------------------------------------------------------------
    # Comma-separated list in the environment, e.g. "http://localhost:5173,https://app.example.com"
    cors_origins: Annotated[list[str], NoDecode] = Field(
        default_factory=lambda: ["http://localhost:5173"]
    )

    # --- Pagination --------------------------------------------------------
    pagination_default_page_size: int = Field(default=10, ge=1)
    pagination_max_page_size: int = Field(default=100, ge=1)

    # --- Logging -----------------------------------------------------------
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"] = "INFO"
    log_format: Literal["json", "console"] = "json"

    # --- Seed data ---------------------------------------------------------
    first_admin_name: str = "Administrator"
    first_admin_email: str | None = None
    first_admin_password: SecretStr | None = None

    @field_validator("cors_origins", mode="before")
    @classmethod
    def _split_cors_origins(cls, value: object) -> object:
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value

    @field_validator(
        "database_url",
        "test_database_url",
        "refresh_cookie_domain",
        "first_admin_email",
        mode="before",
    )
    @classmethod
    def _empty_string_is_none(cls, value: object) -> object:
        if isinstance(value, str) and not value.strip():
            return None
        return value

    @field_validator("database_url", "test_database_url", mode="after")
    @classmethod
    def _use_psycopg_driver(cls, value: str | None) -> str | None:
        """Accept plain libpq-style URLs and point them at the psycopg 3 driver."""
        if value is None:
            return None
        for scheme in _PLAIN_SCHEMES:
            if value.startswith(scheme):
                return _DRIVER_SCHEME + value.removeprefix(scheme)
        if not value.startswith(_DRIVER_SCHEME):
            raise ValueError(
                "DATABASE_URL must start with postgresql:// (or postgresql+psycopg://)"
            )
        return value

    @model_validator(mode="after")
    def _validate_security(self) -> Self:
        if self.database_url is None:
            raise ValueError(
                f"DATABASE_URL is not set. Add it to {ENV_FILE} (copy backend/.env.example), e.g. "
                "DATABASE_URL=postgresql://base_project:PASSWORD@localhost:5432/base_project"
            )
        if self.pagination_default_page_size > self.pagination_max_page_size:
            raise ValueError("PAGINATION_DEFAULT_PAGE_SIZE must be <= PAGINATION_MAX_PAGE_SIZE")
        if "*" in self.cors_origins:
            raise ValueError(
                "CORS_ORIGINS must list explicit origins; '*' is not allowed with credentials"
            )
        if self.refresh_cookie_samesite == "none" and not self.refresh_cookie_secure:
            raise ValueError("REFRESH_COOKIE_SAMESITE=none requires REFRESH_COOKIE_SECURE=true")
        if self.is_production:
            secret = self.jwt_secret_key.get_secret_value()
            if secret == INSECURE_DEFAULT_SECRET or len(secret) < 32:
                raise ValueError(
                    "JWT_SECRET_KEY must be set to a random value of at least 32 characters "
                    "in production"
                )
            if not self.refresh_cookie_secure:
                raise ValueError("REFRESH_COOKIE_SECURE must be true in production")
        return self

    @property
    def is_production(self) -> bool:
        return self.app_env == Environment.PRODUCTION

    @property
    def sqlalchemy_database_url(self) -> str:
        if self.database_url is None:  # unreachable: enforced by the model validator
            raise RuntimeError("DATABASE_URL is not set")
        return self.database_url

    @property
    def refresh_cookie_path(self) -> str:
        """The refresh cookie is only ever sent to the auth endpoints."""
        return f"{self.api_v1_prefix}/auth"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
