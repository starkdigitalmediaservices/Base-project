"""Refresh-token cookie helpers. The cookie is httpOnly and scoped to the auth endpoints."""

from datetime import datetime

from fastapi import Response

from app.core.config import settings


def set_refresh_cookie(response: Response, token: str, expires_at: datetime) -> None:
    response.set_cookie(
        key=settings.refresh_cookie_name,
        value=token,
        expires=expires_at,
        path=settings.refresh_cookie_path,
        domain=settings.refresh_cookie_domain,
        secure=settings.refresh_cookie_secure,
        httponly=True,
        samesite=settings.refresh_cookie_samesite,
    )


def clear_refresh_cookie(response: Response) -> None:
    response.delete_cookie(
        key=settings.refresh_cookie_name,
        path=settings.refresh_cookie_path,
        domain=settings.refresh_cookie_domain,
        secure=settings.refresh_cookie_secure,
        httponly=True,
        samesite=settings.refresh_cookie_samesite,
    )
