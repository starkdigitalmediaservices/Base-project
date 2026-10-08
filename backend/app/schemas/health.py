from typing import Literal

from app.schemas.common import AppSchema


class HealthResponse(AppSchema):
    status: Literal["ok"] = "ok"


class ReadinessResponse(AppSchema):
    status: Literal["ready", "not_ready"]
    database: Literal["ok", "unavailable"]
