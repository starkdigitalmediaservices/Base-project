from datetime import datetime
from enum import StrEnum

from pydantic import Field

from app.schemas.common import (
    AppSchema,
    InputSchema,
    NormalizedEmail,
    Password,
    PersonName,
    SearchTerm,
)
from app.schemas.pagination import SortOrder
from app.schemas.role import RoleSummary


class UserRead(AppSchema):
    """Public representation of a user. Never includes the password hash."""

    id: int
    name: str
    email: str
    is_active: bool
    role: RoleSummary
    created_at: datetime
    updated_at: datetime


class CurrentUser(UserRead):
    permissions: list[str] = Field(description="Permissions granted by the user's role.")


class UserCreate(InputSchema):
    name: PersonName
    email: NormalizedEmail
    password: Password
    role_id: int = Field(gt=0)
    is_active: bool = True


class UserUpdate(InputSchema):
    name: PersonName | None = None
    email: NormalizedEmail | None = None
    password: Password | None = None
    role_id: int | None = Field(default=None, gt=0)
    is_active: bool | None = None


class ProfileUpdate(InputSchema):
    name: PersonName


class PasswordChange(InputSchema):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: Password


class UserSortField(StrEnum):
    CREATED_AT = "created_at"
    NAME = "name"
    EMAIL = "email"


class UserListQuery(AppSchema):
    search: SearchTerm | None = Field(default=None, description="Matches name or email.")
    role_id: int | None = Field(default=None, gt=0)
    is_active: bool | None = None
    sort_by: UserSortField = UserSortField.CREATED_AT
    sort_order: SortOrder = SortOrder.DESC
