from datetime import datetime
from enum import StrEnum
from typing import Annotated

from pydantic import BeforeValidator, Field, StringConstraints

from app.schemas.common import AppSchema, InputSchema, SearchTerm
from app.schemas.pagination import SortOrder


def _normalize_role_name(value: object) -> object:
    return value.strip().lower() if isinstance(value, str) else value


# Normalized BEFORE the pattern check so "Auditor" is accepted as "auditor".
RoleNameStr = Annotated[
    str,
    BeforeValidator(_normalize_role_name),
    StringConstraints(pattern=r"^[a-z][a-z0-9_]{1,49}$"),
]
RoleDescription = Annotated[str, StringConstraints(strip_whitespace=True, max_length=255)]


class RoleSummary(AppSchema):
    id: int
    name: str


class RoleRead(AppSchema):
    id: int
    name: str
    description: str | None
    is_system: bool = Field(description="Seeded roles cannot be renamed or deleted.")
    user_count: int = Field(ge=0)
    created_at: datetime
    updated_at: datetime


class RoleCreate(InputSchema):
    name: RoleNameStr
    description: RoleDescription | None = None


class RoleUpdate(InputSchema):
    name: RoleNameStr | None = None
    description: RoleDescription | None = None


class RoleSortField(StrEnum):
    NAME = "name"
    CREATED_AT = "created_at"


class RoleListQuery(AppSchema):
    search: SearchTerm | None = Field(default=None, description="Matches role name.")
    sort_by: RoleSortField = RoleSortField.NAME
    sort_order: SortOrder = SortOrder.ASC
