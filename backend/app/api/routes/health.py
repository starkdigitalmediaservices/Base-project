from fastapi import APIRouter, status
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app.api.dependencies import DbSession
from app.core.logging import get_logger
from app.schemas.health import HealthResponse, ReadinessResponse

router = APIRouter()
logger = get_logger(__name__)


@router.get("", summary="Liveness probe", response_model=HealthResponse)
def health() -> HealthResponse:
    """Returns 200 while the process is running. Does not touch dependencies."""
    return HealthResponse()


@router.get(
    "/ready",
    summary="Readiness probe",
    response_model=ReadinessResponse,
    responses={503: {"model": ReadinessResponse, "description": "Database unavailable"}},
)
def readiness(db: DbSession) -> ReadinessResponse | JSONResponse:
    """Returns 200 when the database answers `SELECT 1`, otherwise 503."""
    try:
        db.execute(text("SELECT 1"))
    except SQLAlchemyError:
        logger.warning("Readiness check failed: database unavailable")
        body = ReadinessResponse(status="not_ready", database="unavailable")
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, content=body.model_dump()
        )
    return ReadinessResponse(status="ready", database="ok")
