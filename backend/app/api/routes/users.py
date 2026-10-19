from typing import Annotated

from fastapi import APIRouter, Depends, Path, Query, status

from app.api.dependencies import ClientInfoDep, DbSession, PageParamsDep, require_permission
from app.core.permissions import Permission
from app.models import User
from app.schemas.common import error_responses
from app.schemas.pagination import Page
from app.schemas.user import (
    UserBulkStatusResult,
    UserBulkStatusUpdate,
    UserCreate,
    UserListQuery,
    UserRead,
    UserUpdate,
)
from app.services.user_service import UserService

router = APIRouter()

CanReadUsers = Annotated[User, Depends(require_permission(Permission.USERS_READ))]
CanWriteUsers = Annotated[User, Depends(require_permission(Permission.USERS_WRITE))]
UserId = Annotated[int, Path(gt=0)]


@router.get(
    "",
    summary="List users (paginated)",
    response_model=Page[UserRead],
    responses=error_responses(401, 403, 422),
)
def list_users(
    _: CanReadUsers,
    db: DbSession,
    page: PageParamsDep,
    filters: Annotated[UserListQuery, Query()],
) -> Page[UserRead]:
    """Filtering, sorting, and pagination all run in PostgreSQL (LIMIT/OFFSET).

    Default order: `created_at DESC, id DESC`. Default page size: 10.
    """
    return UserService(db).list_users(filters, page)


@router.post(
    "",
    summary="Create a user",
    response_model=UserRead,
    status_code=status.HTTP_201_CREATED,
    responses=error_responses(400, 401, 403, 409, 422),
)
def create_user(
    body: UserCreate, actor: CanWriteUsers, db: DbSession, client: ClientInfoDep
) -> UserRead:
    user = UserService(db).create_user(body, actor=actor, client=client)
    return UserRead.model_validate(user)


# NOTE: literal sub-paths (/bulk-status) must be defined BEFORE parameterised paths
# (/{user_id}) so FastAPI/Starlette does not greedily match "bulk-status" as a user_id.
@router.patch(
    "/bulk-status",
    summary="Bulk activate or deactivate users",
    response_model=UserBulkStatusResult,
    responses=error_responses(400, 401, 403, 422),
)
def bulk_update_status(
    body: UserBulkStatusUpdate, actor: CanWriteUsers, db: DbSession, client: ClientInfoDep
) -> UserBulkStatusResult:
    """Activate or deactivate up to 100 users in a single request.

    The actor's own account is always skipped. Users already in the target state are skipped.
    """
    return UserService(db).bulk_update_status(body, actor=actor, client=client)


@router.get(
    "/{user_id}",
    summary="Get a user",
    response_model=UserRead,
    responses=error_responses(401, 403, 404),
)
def get_user(user_id: UserId, _: CanReadUsers, db: DbSession) -> UserRead:
    return UserRead.model_validate(UserService(db).get_user(user_id))


@router.patch(
    "/{user_id}",
    summary="Update a user",
    response_model=UserRead,
    responses=error_responses(400, 401, 403, 404, 409, 422),
)
def update_user(
    user_id: UserId,
    body: UserUpdate,
    actor: CanWriteUsers,
    db: DbSession,
    client: ClientInfoDep,
) -> UserRead:
    """Deactivating a user or resetting their password revokes all of their sessions."""
    user = UserService(db).update_user(user_id, body, actor=actor, client=client)
    return UserRead.model_validate(user)


@router.delete(
    "/{user_id}",
    summary="Delete a user",
    status_code=status.HTTP_204_NO_CONTENT,
    responses=error_responses(400, 401, 403, 404),
)
def delete_user(
    user_id: UserId, actor: CanWriteUsers, db: DbSession, client: ClientInfoDep
) -> None:
    """Permanently deletes the user and revokes all their sessions. Cannot delete yourself."""
    UserService(db).delete_user(user_id, actor=actor, client=client)
