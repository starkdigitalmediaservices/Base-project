from typing import Literal

from pydantic import Field

from app.schemas.common import AppSchema, InputSchema, NormalizedEmail
from app.schemas.user import CurrentUser


class LoginRequest(InputSchema):
    email: NormalizedEmail
    password: str = Field(min_length=1, max_length=128)


class TokenResponse(AppSchema):
    """Returned by login and refresh. The refresh token is set as an httpOnly cookie, never here."""

    access_token: str
    token_type: Literal["bearer"] = "bearer"  # noqa: S105 - token scheme, not a secret
    expires_in: int = Field(description="Access-token lifetime in seconds.")
    user: CurrentUser
