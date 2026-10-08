"""FastAPI dependencies: database session, pagination, client info, authentication, authorization.

Usage in a route::

    @router.get("", dependencies=[Depends(require_permission(Permission.USERS_READ))])
    def list_users(db: DbSession, page: PageParamsDep, ...): ...
"""

from collections.abc import Callable, Iterator
from typing import Annotated

from fastapi import Depends, Query, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.exceptions import ForbiddenError, UnauthorizedError
from app.core.permissions import Permission, role_has_permission
from app.core.security import decode_access_token
from app.db.session import get_session
from app.models import User
from app.repositories.user_repository import UserRepository
from app.schemas.pagination import PageParams
from app.utils.request import ClientInfo, client_info_from_request


# --- Database ------------------------------------------------------------------------
def get_db() -> Iterator[Session]:
    yield from get_session()


DbSession = Annotated[Session, Depends(get_db)]


# --- Pagination ----------------------------------------------------------------------
def pagination_params(
    page: Annotated[int, Query(ge=1, description="1-based page number.")] = 1,
    page_size: Annotated[
        int,
        Query(
            ge=1,
            le=settings.pagination_max_page_size,
            description=f"Rows per page (max {settings.pagination_max_page_size}).",
        ),
    ] = settings.pagination_default_page_size,
) -> PageParams:
    return PageParams(page=page, page_size=page_size)


PageParamsDep = Annotated[PageParams, Depends(pagination_params)]


# --- Request metadata ----------------------------------------------------------------
def get_client_info(request: Request) -> ClientInfo:
    return client_info_from_request(request)


ClientInfoDep = Annotated[ClientInfo, Depends(get_client_info)]


# --- Authentication ------------------------------------------------------------------
_bearer_scheme = HTTPBearer(
    auto_error=False,
    description="Paste the `access_token` returned by `POST /api/v1/auth/login`.",
)


def get_current_user(
    db: DbSession,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer_scheme)],
) -> User:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise UnauthorizedError()
    payload = decode_access_token(credentials.credentials)

    user = UserRepository(db).get(payload.user_id)  # role is eager-loaded
    if user is None:
        raise UnauthorizedError("The access token is invalid.", code="invalid_token")
    if not user.is_active:
        raise ForbiddenError("This account is disabled.", code="inactive_user")
    return user


CurrentUserDep = Annotated[User, Depends(get_current_user)]


# --- Authorization -------------------------------------------------------------------
def require_permission(*permissions: Permission) -> Callable[[User], User]:
    """Dependency factory: the current user's role must grant ALL listed permissions.

    The role → permission policy lives in `app.core.permissions`; never compare role names
    inside route functions.
    """

    def dependency(user: CurrentUserDep) -> User:
        missing = [p for p in permissions if not role_has_permission(user.role.name, p)]
        if missing:
            raise ForbiddenError()
        return user

    return dependency
