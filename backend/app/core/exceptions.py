"""Domain exceptions and the global handlers that turn them into a consistent error envelope.

Every non-2xx response has the shape::

    {"error": {"code": str, "message": str, "details": list | None, "request_id": str | None}}

Services raise `AppError` subclasses; routes never build error responses by hand.
"""

from collections.abc import Sequence
from http import HTTPStatus
from typing import Any, ClassVar

from fastapi import FastAPI, Request, status
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.logging import get_logger, request_id_ctx

logger = get_logger(__name__)

_LOCATION_PREFIXES = frozenset({"body", "query", "path", "header", "cookie"})


class AppError(Exception):
    status_code: int = status.HTTP_400_BAD_REQUEST
    code: str = "bad_request"
    message: str = "The request could not be processed."
    headers: ClassVar[dict[str, str] | None] = None

    def __init__(
        self,
        message: str | None = None,
        *,
        code: str | None = None,
        details: list[dict[str, Any]] | None = None,
    ) -> None:
        self.message = message or self.message
        self.code = code or self.code
        self.details = details
        super().__init__(self.message)


class BadRequestError(AppError):
    pass


class UnauthorizedError(AppError):
    status_code = status.HTTP_401_UNAUTHORIZED
    code = "unauthorized"
    message = "Authentication is required."
    headers: ClassVar[dict[str, str] | None] = {"WWW-Authenticate": "Bearer"}


class ForbiddenError(AppError):
    status_code = status.HTTP_403_FORBIDDEN
    code = "forbidden"
    message = "You do not have permission to perform this action."


class NotFoundError(AppError):
    status_code = status.HTTP_404_NOT_FOUND
    code = "not_found"
    message = "The requested resource was not found."


class ConflictError(AppError):
    status_code = status.HTTP_409_CONFLICT
    code = "conflict"
    message = "The request conflicts with the current state of the resource."


class ServiceUnavailableError(AppError):
    status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    code = "service_unavailable"
    message = "The service is temporarily unavailable."


def error_body(
    code: str, message: str, details: Sequence[dict[str, Any]] | None = None
) -> dict[str, Any]:
    return {
        "error": {
            "code": code,
            "message": message,
            "details": list(details) if details is not None else None,
            "request_id": request_id_ctx.get(),
        }
    }


def _validation_details(errors: Sequence[Any]) -> list[dict[str, Any]]:
    details: list[dict[str, Any]] = []
    for err in errors:
        loc = list(err.get("loc", ()))
        field_parts = loc[1:] if loc and loc[0] in _LOCATION_PREFIXES else loc
        details.append(
            {
                "field": ".".join(str(part) for part in field_parts) or None,
                "loc": loc,
                "message": err.get("msg", "Invalid value."),
                "type": err.get("type", "value_error"),
            }
        )
    return details


async def _app_error_handler(_: Request, exc: Exception) -> JSONResponse:
    assert isinstance(exc, AppError)  # noqa: S101 - narrowing for the type checker
    return JSONResponse(
        status_code=exc.status_code,
        content=jsonable_encoder(error_body(exc.code, exc.message, exc.details)),
        headers=exc.headers,
    )


async def _validation_error_handler(_: Request, exc: Exception) -> JSONResponse:
    assert isinstance(exc, RequestValidationError)  # noqa: S101
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        content=jsonable_encoder(
            error_body(
                "validation_error",
                "One or more fields are invalid.",
                _validation_details(exc.errors()),
            )
        ),
    )


_HTTP_CODES = {
    400: "bad_request",
    401: "unauthorized",
    403: "forbidden",
    404: "not_found",
    405: "method_not_allowed",
    409: "conflict",
    429: "too_many_requests",
}


async def _http_exception_handler(_: Request, exc: Exception) -> JSONResponse:
    assert isinstance(exc, StarletteHTTPException)  # noqa: S101
    code = _HTTP_CODES.get(exc.status_code, "http_error")
    message = exc.detail if isinstance(exc.detail, str) else HTTPStatus(exc.status_code).phrase
    return JSONResponse(
        status_code=exc.status_code,
        content=error_body(code, message),
        headers=getattr(exc, "headers", None),
    )


async def _unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    # Full details go to the log only; the client receives a generic message.
    logger.exception(
        "Unhandled exception", extra={"path": request.url.path, "method": request.method}
    )
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=error_body("internal_error", "An unexpected error occurred."),
    )


def register_exception_handlers(app: FastAPI) -> None:
    app.add_exception_handler(AppError, _app_error_handler)
    app.add_exception_handler(RequestValidationError, _validation_error_handler)
    app.add_exception_handler(StarletteHTTPException, _http_exception_handler)
    app.add_exception_handler(Exception, _unhandled_exception_handler)
