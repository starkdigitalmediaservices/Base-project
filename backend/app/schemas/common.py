"""Shared schema building blocks."""

from typing import Annotated, Any

from pydantic import AfterValidator, BaseModel, ConfigDict, EmailStr, Field, StringConstraints


class AppSchema(BaseModel):
    """Base for all API schemas. Reads ORM objects and rejects unknown fields on input."""

    model_config = ConfigDict(from_attributes=True)


class InputSchema(AppSchema):
    model_config = ConfigDict(from_attributes=True, extra="forbid")


def _lowercase(value: str) -> str:
    return value.lower()


NormalizedEmail = Annotated[EmailStr, AfterValidator(_lowercase)]
PersonName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=150)]
# Passwords are never stripped or transformed.
Password = Annotated[str, Field(min_length=8, max_length=128)]
SearchTerm = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)]


class MessageResponse(AppSchema):
    message: str


class ErrorDetail(AppSchema):
    field: str | None = Field(description="Dot-joined field path without the location prefix.")
    loc: list[str | int]
    message: str
    type: str


class ErrorBody(AppSchema):
    code: str = Field(examples=["not_found"])
    message: str = Field(examples=["The requested resource was not found."])
    details: list[ErrorDetail] | None = None
    request_id: str | None = None


class ErrorResponse(AppSchema):
    error: ErrorBody


_ERROR_DESCRIPTIONS = {
    400: "Bad request",
    401: "Not authenticated or token invalid/expired",
    403: "Authenticated but not allowed",
    404: "Resource not found",
    409: "Conflict with existing data",
    422: "Validation error",
    503: "Service unavailable",
}


def error_responses(*status_codes: int) -> dict[int | str, dict[str, Any]]:
    """OpenAPI `responses=` entries documenting the shared error envelope."""
    return {
        code: {"model": ErrorResponse, "description": _ERROR_DESCRIPTIONS.get(code, "Error")}
        for code in status_codes
    }
