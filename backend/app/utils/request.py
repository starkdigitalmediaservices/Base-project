from dataclasses import dataclass

from fastapi import Request

_MAX_USER_AGENT_LENGTH = 512


@dataclass(frozen=True, slots=True)
class ClientInfo:
    """Request metadata recorded with sessions and audit logs."""

    ip_address: str | None = None
    user_agent: str | None = None


def client_info_from_request(request: Request) -> ClientInfo:
    # Behind a reverse proxy, run uvicorn with --proxy-headers and --forwarded-allow-ips so
    # `request.client` reflects the real client address.
    user_agent = request.headers.get("user-agent")
    return ClientInfo(
        ip_address=request.client.host if request.client else None,
        user_agent=user_agent[:_MAX_USER_AGENT_LENGTH] if user_agent else None,
    )
