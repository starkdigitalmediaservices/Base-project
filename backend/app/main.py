"""FastAPI application factory and ASGI entrypoint (`uvicorn app.main:app`)."""

import asyncio
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager, suppress

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import OPENAPI_TAGS, api_router
from app.core.config import settings
from app.core.exceptions import register_exception_handlers
from app.core.logging import configure_logging, get_logger
from app.core.middleware import REQUEST_ID_HEADER, RequestContextMiddleware

logger = get_logger(__name__)

# How often (seconds) the background task purges expired refresh tokens.
_TOKEN_PURGE_INTERVAL_SECONDS = 3600  # 1 hour


async def _purge_expired_tokens_loop() -> None:
    """Background coroutine: purges expired refresh tokens every hour."""
    from app.db.session import get_session
    from app.services.auth_service import AuthService

    while True:
        try:
            await asyncio.sleep(_TOKEN_PURGE_INTERVAL_SECONDS)
            # Use a short-lived session, just like a CLI command would.
            session_gen = get_session()
            session = next(session_gen)
            try:
                deleted = AuthService(session).purge_expired_tokens()
                if deleted:
                    logger.info("purge_expired_tokens", extra={"deleted": deleted})
            finally:
                with suppress(StopIteration):
                    next(session_gen)
        except asyncio.CancelledError:
            break
        except Exception:
            logger.exception("purge_expired_tokens task failed; will retry next cycle")


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    from app.db import session as db  # imported lazily so tests can configure the engine first

    logger.info(
        "application starting",
        extra={"app_env": settings.app_env.value, "version": settings.app_version},
    )
    if settings.database_startup_check:
        try:
            db.check_database_connection()
        except db.DatabaseUnavailableError as exc:
            # Fail fast with an actionable message instead of erroring on the first request.
            logger.critical("Startup aborted: PostgreSQL is unavailable.\n%s", exc)
            # `from None` keeps the driver's long traceback chain out of the console.
            raise db.DatabaseUnavailableError(
                "PostgreSQL is unavailable; see the message above."
            ) from None
        logger.info("database connection ok", extra={"database": db.describe_database(db.engine)})

    # Start the background token-purge task (runs every hour while the server is up).
    purge_task = asyncio.create_task(_purge_expired_tokens_loop())
    logger.info(
        "background token-purge task started", extra={"interval_s": _TOKEN_PURGE_INTERVAL_SECONDS}
    )

    yield

    purge_task.cancel()
    with suppress(asyncio.CancelledError):
        await purge_task
    db.engine.dispose()
    logger.info("application stopped")


def create_app() -> FastAPI:
    configure_logging(settings.log_level, settings.log_format)

    docs_enabled = settings.enable_docs
    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        description="Reusable FastAPI + PostgreSQL foundation. All endpoints live under "
        f"`{settings.api_v1_prefix}`.",
        openapi_tags=OPENAPI_TAGS,
        openapi_url=f"{settings.api_v1_prefix}/openapi.json" if docs_enabled else None,
        docs_url="/docs" if docs_enabled else None,
        redoc_url="/redoc" if docs_enabled else None,
        lifespan=lifespan,
    )

    # Middleware order: the last added runs first. CORS must wrap everything.
    app.add_middleware(RequestContextMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", REQUEST_ID_HEADER],
        expose_headers=[REQUEST_ID_HEADER],
        max_age=600,
    )

    register_exception_handlers(app)
    app.include_router(api_router, prefix=settings.api_v1_prefix)
    return app


app = create_app()
