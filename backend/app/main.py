"""FastAPI application factory and ASGI entrypoint (`uvicorn app.main:app`)."""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import OPENAPI_TAGS, api_router
from app.core.config import settings
from app.core.exceptions import register_exception_handlers
from app.core.logging import configure_logging, get_logger
from app.core.middleware import REQUEST_ID_HEADER, RequestContextMiddleware

logger = get_logger(__name__)


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
    yield
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
