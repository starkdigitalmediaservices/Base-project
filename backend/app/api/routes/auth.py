from typing import Annotated

from fastapi import APIRouter, Cookie, Response, status

from app.api.cookies import clear_refresh_cookie, set_refresh_cookie
from app.api.dependencies import ClientInfoDep, CurrentUserDep, DbSession
from app.core.config import settings
from app.schemas.auth import LoginRequest, TokenResponse
from app.schemas.common import error_responses
from app.schemas.user import CurrentUser, PasswordChange, ProfileUpdate
from app.services.auth_service import AuthResult, AuthService
from app.services.serializers import to_current_user

router = APIRouter()

RefreshCookie = Annotated[
    str | None,
    Cookie(
        alias=settings.refresh_cookie_name,
        include_in_schema=False,
    ),
]


def _token_response(response: Response, result: AuthResult) -> TokenResponse:
    set_refresh_cookie(response, result.refresh_token, result.refresh_expires_at)
    response.headers["Cache-Control"] = "no-store"
    return TokenResponse(
        access_token=result.access_token,
        expires_in=result.expires_in,
        user=to_current_user(result.user),
    )


@router.post(
    "/login",
    summary="Log in with email and password",
    response_model=TokenResponse,
    responses=error_responses(401, 403, 422),
)
def login(
    body: LoginRequest, response: Response, db: DbSession, client: ClientInfoDep
) -> TokenResponse:
    """Returns a short-lived access token and sets the refresh token as an httpOnly cookie."""
    result = AuthService(db).login(email=body.email, password=body.password, client=client)
    return _token_response(response, result)


@router.post(
    "/refresh",
    summary="Exchange the refresh cookie for a new access token",
    response_model=TokenResponse,
    responses=error_responses(401),
)
def refresh(
    response: Response, db: DbSession, client: ClientInfoDep, refresh_token: RefreshCookie = None
) -> TokenResponse:
    """Rotates the refresh token (single use). Replaying an old token revokes all sessions."""
    result = AuthService(db).refresh(raw_token=refresh_token, client=client)
    return _token_response(response, result)


@router.post(
    "/logout",
    summary="Log out and revoke the refresh token",
    status_code=status.HTTP_204_NO_CONTENT,
)
def logout(
    response: Response, db: DbSession, client: ClientInfoDep, refresh_token: RefreshCookie = None
) -> None:
    """Idempotent. The access token remains valid until it expires (keep it short-lived)."""
    AuthService(db).logout(raw_token=refresh_token, client=client)
    clear_refresh_cookie(response)


@router.get(
    "/me",
    summary="Get the current user",
    response_model=CurrentUser,
    responses=error_responses(401, 403),
)
def get_me(user: CurrentUserDep) -> CurrentUser:
    return to_current_user(user)


@router.patch(
    "/me",
    summary="Update the current user's profile",
    response_model=CurrentUser,
    responses=error_responses(401, 403, 422),
)
def update_me(
    body: ProfileUpdate, user: CurrentUserDep, db: DbSession, client: ClientInfoDep
) -> CurrentUser:
    updated = AuthService(db).update_profile(user, body, client=client)
    return to_current_user(updated)


@router.post(
    "/me/password",
    summary="Change the current user's password",
    status_code=status.HTTP_204_NO_CONTENT,
    responses=error_responses(400, 401, 403, 422),
)
def change_password(
    body: PasswordChange,
    user: CurrentUserDep,
    db: DbSession,
    client: ClientInfoDep,
    refresh_token: RefreshCookie = None,
) -> None:
    """Revokes every other session of the user; the current session stays signed in."""
    AuthService(db).change_password(user, body, current_refresh_token=refresh_token, client=client)
