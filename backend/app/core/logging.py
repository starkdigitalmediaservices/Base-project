"""Structured logging configuration.

Rules:
- Never log passwords, tokens, cookies, Authorization headers, or request bodies.
- Pass contextual values through `extra={...}`; they become JSON fields.
"""

import json
import logging
import sys
from contextvars import ContextVar
from datetime import UTC, datetime
from typing import Any

request_id_ctx: ContextVar[str | None] = ContextVar("request_id", default=None)

# Attributes present on every LogRecord; anything else came from `extra=`.
_RESERVED_ATTRS = frozenset(vars(logging.makeLogRecord({})).keys()) | {"message", "asctime"}
_SENSITIVE_KEYS = frozenset(
    {
        "password",
        "password_hash",
        "token",
        "access_token",
        "refresh_token",
        "authorization",
        "cookie",
    }
)


class RequestIdFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = request_id_ctx.get()
        return True


def _extra_fields(record: logging.LogRecord) -> dict[str, Any]:
    return {
        key: ("[REDACTED]" if key.lower() in _SENSITIVE_KEYS else value)
        for key, value in vars(record).items()
        if key not in _RESERVED_ATTRS
    }


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, Any] = {
            "timestamp": datetime.fromtimestamp(record.created, tz=UTC).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            **_extra_fields(record),
        }
        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)
        return json.dumps(payload, default=str)


class ConsoleFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        timestamp = datetime.fromtimestamp(record.created, tz=UTC).strftime("%H:%M:%S")
        extras = " ".join(f"{k}={v}" for k, v in _extra_fields(record).items() if v is not None)
        line = f"{timestamp} {record.levelname:<8} {record.name}: {record.getMessage()}"
        if extras:
            line = f"{line} | {extras}"
        if record.exc_info:
            line = f"{line}\n{self.formatException(record.exc_info)}"
        return line


def configure_logging(level: str = "INFO", fmt: str = "json") -> None:
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JsonFormatter() if fmt == "json" else ConsoleFormatter())
    handler.addFilter(RequestIdFilter())

    root = logging.getLogger()
    root.handlers.clear()
    root.addHandler(handler)
    root.setLevel(level)

    # Uvicorn's access log duplicates our request log middleware; route the rest through root.
    for name in ("uvicorn", "uvicorn.error"):
        logging.getLogger(name).handlers.clear()
        logging.getLogger(name).propagate = True
    logging.getLogger("uvicorn.access").disabled = True


def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(name)
