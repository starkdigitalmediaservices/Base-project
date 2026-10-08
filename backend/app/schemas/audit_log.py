from datetime import datetime
from typing import Any

from pydantic import Field

from app.schemas.common import AppSchema


class AuditActor(AppSchema):
    id: int
    name: str
    email: str


class AuditLogRead(AppSchema):
    id: int
    actor: AuditActor | None
    action: str
    resource_type: str | None
    resource_id: str | None
    metadata: dict[str, Any] = Field(validation_alias="event_metadata")
    ip_address: str | None
    user_agent: str | None
    created_at: datetime


class AuditLogListQuery(AppSchema):
    action: str | None = Field(default=None, max_length=100)
    actor_user_id: int | None = Field(default=None, gt=0)
    resource_type: str | None = Field(default=None, max_length=100)
    resource_id: str | None = Field(default=None, max_length=100)
