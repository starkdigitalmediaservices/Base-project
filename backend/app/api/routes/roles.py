from typing import Annotated

from fastapi import APIRouter, Depends, Path, Query, status

from app.api.dependencies import ClientInfoDep, DbSession, PageParamsDep, require_permission
from app.core.permissions import Permission
from app.models import User
from app.schemas.common import error_responses
from app.schemas.pagination import Page
from app.schemas.role import RoleCreate, RoleListQuery, RoleRead, RoleUpdate
from app.services.role_service import RoleService

router = APIRouter()

CanReadRoles = Annotated[User, Depends(require_permission(Permission.ROLES_READ))]
CanWriteRoles = Annotated[User, Depends(require_permission(Permission.ROLES_WRITE))]
RoleId = Annotated[int, Path(gt=0)]


@router.get(
    "",
    summary="List roles (paginated)",
    response_model=Page[RoleRead],
    responses=error_responses(401, 403, 422),
)
def list_roles(
    _: CanReadRoles,
    db: DbSession,
    page: PageParamsDep,
    filters: Annotated[RoleListQuery, Query()],
) -> Page[RoleRead]:
    """Default order: `name ASC, id ASC`. Includes the number of users per role."""
    return RoleService(db).list_roles(filters, page)


@router.post(
    "",
    summary="Create a role",
    response_model=RoleRead,
    status_code=status.HTTP_201_CREATED,
    responses=error_responses(401, 403, 409, 422),
)
def create_role(
    body: RoleCreate, actor: CanWriteRoles, db: DbSession, client: ClientInfoDep
) -> RoleRead:
    """New roles grant no permissions until added to `app/core/permissions.py`."""
    return RoleService(db).create_role(body, actor=actor, client=client)


@router.get(
    "/{role_id}",
    summary="Get a role",
    response_model=RoleRead,
    responses=error_responses(401, 403, 404),
)
def get_role(role_id: RoleId, _: CanReadRoles, db: DbSession) -> RoleRead:
    return RoleService(db).get_role(role_id)


@router.patch(
    "/{role_id}",
    summary="Update a role",
    response_model=RoleRead,
    responses=error_responses(400, 401, 403, 404, 409, 422),
)
def update_role(
    role_id: RoleId,
    body: RoleUpdate,
    actor: CanWriteRoles,
    db: DbSession,
    client: ClientInfoDep,
) -> RoleRead:
    return RoleService(db).update_role(role_id, body, actor=actor, client=client)


@router.delete(
    "/{role_id}",
    summary="Delete a role",
    status_code=status.HTTP_204_NO_CONTENT,
    responses=error_responses(400, 401, 403, 404, 409),
)
def delete_role(
    role_id: RoleId, actor: CanWriteRoles, db: DbSession, client: ClientInfoDep
) -> None:
    """System roles and roles still assigned to users cannot be deleted."""
    RoleService(db).delete_role(role_id, actor=actor, client=client)
