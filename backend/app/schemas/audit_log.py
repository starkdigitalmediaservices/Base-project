from datetime import datetime
from typing import Any, Self

from pydantic import Field, model_validator

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
    # ISO 8601 timestamps, e.g. "2026-10-01T00:00:00Z" (inclusive bounds).
    from_date: datetime | None = Field(
        default=None, description="Include entries at or after this timestamp (UTC)."
    )
    to_date: datetime | None = Field(
        default=None, description="Include entries at or before this timestamp (UTC)."
    )

    @model_validator(mode="after")
    def _validate_date_range(self) -> Self:
        if self.from_date and self.to_date and self.from_date > self.to_date:
            raise ValueError("from_date must be before or equal to to_date")
        return self
