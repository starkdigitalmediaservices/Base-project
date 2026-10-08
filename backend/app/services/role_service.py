"""Role administration use cases."""

from sqlalchemy.orm import Session

from app.core.exceptions import BadRequestError, ConflictError, NotFoundError
from app.core.permissions import SYSTEM_ROLES
from app.models import Role, User
from app.repositories.role_repository import RoleRepository
from app.schemas.pagination import Page, PageParams
from app.schemas.role import RoleCreate, RoleListQuery, RoleRead, RoleUpdate
from app.services.audit_service import AuditAction, AuditService
from app.utils.request import ClientInfo


def _to_read(role: Role, user_count: int) -> RoleRead:
    return RoleRead(
        id=role.id,
        name=role.name,
        description=role.description,
        is_system=role.name in SYSTEM_ROLES,
        user_count=user_count,
        created_at=role.created_at,
        updated_at=role.updated_at,
    )


def _name_taken() -> ConflictError:
    message = "A role with this name already exists."
    return ConflictError(
        message,
        details=[
            {"field": "name", "loc": ["body", "name"], "message": message, "type": "duplicate"}
        ],
    )


class RoleService:
    def __init__(self, session: Session) -> None:
        self.session = session
        self.roles = RoleRepository(session)
        self.audit = AuditService(session)

    def list_roles(self, query: RoleListQuery, params: PageParams) -> Page[RoleRead]:
        rows, total = self.roles.list_page(query, params)
        return Page[RoleRead].create(
            [_to_read(role, count) for role, count in rows], total=total, params=params
        )

    def get_role(self, role_id: int) -> RoleRead:
        row = self.roles.get_with_user_count(role_id)
        if row is None:
            raise NotFoundError("Role not found.")
        role, user_count = row
        return _to_read(role, user_count)

    def create_role(self, data: RoleCreate, *, actor: User, client: ClientInfo) -> RoleRead:
        if self.roles.name_exists(data.name):
            raise _name_taken()
        role = self.roles.add(Role(name=data.name, description=data.description))
        self.audit.record(
            AuditAction.ROLE_CREATED,
            actor_id=actor.id,
            resource_type="role",
            resource_id=role.id,
            metadata={"name": role.name},
            client=client,
        )
        self.session.commit()
        return _to_read(role, 0)

    def update_role(
        self, role_id: int, data: RoleUpdate, *, actor: User, client: ClientInfo
    ) -> RoleRead:
        role = self._get(role_id)
        changes = data.model_dump(exclude_unset=True)

        if data.name is not None and data.name != role.name:
            if role.name in SYSTEM_ROLES:
                raise BadRequestError("System roles cannot be renamed.")
            if self.roles.name_exists(data.name, exclude_id=role.id):
                raise _name_taken()
            role.name = data.name
        if "description" in changes:
            role.description = data.description

        self.audit.record(
            AuditAction.ROLE_UPDATED,
            actor_id=actor.id,
            resource_type="role",
            resource_id=role.id,
            metadata={"fields": sorted(changes)},
            client=client,
        )
        self.session.commit()
        return self.get_role(role.id)

    def delete_role(self, role_id: int, *, actor: User, client: ClientInfo) -> None:
        role = self._get(role_id)
        if role.name in SYSTEM_ROLES:
            raise BadRequestError("System roles cannot be deleted.")
        if self.roles.has_users(role.id):
            raise ConflictError("This role is assigned to users. Reassign them first.")
        self.roles.delete(role)
        self.audit.record(
            AuditAction.ROLE_DELETED,
            actor_id=actor.id,
            resource_type="role",
            resource_id=role_id,
            metadata={"name": role.name},
            client=client,
        )
        self.session.commit()

    def _get(self, role_id: int) -> Role:
        role = self.roles.get(role_id)
        if role is None:
            raise NotFoundError("Role not found.")
        return role
