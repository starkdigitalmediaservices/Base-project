from datetime import datetime

from sqlalchemy import delete, select, update
from sqlalchemy.orm import Session, joinedload

from app.models import RefreshToken, User


class RefreshTokenRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def get_by_hash_for_update(self, token_hash: str) -> RefreshToken | None:
        """Row-locks the token so two concurrent refreshes cannot both rotate it."""
        stmt = (
            select(RefreshToken)
            .options(joinedload(RefreshToken.user).joinedload(User.role))
            .where(RefreshToken.token_hash == token_hash)
            .with_for_update(of=RefreshToken)
        )
        return self.session.scalar(stmt)

    def get_by_hash(self, token_hash: str) -> RefreshToken | None:
        return self.session.scalar(
            select(RefreshToken).where(RefreshToken.token_hash == token_hash)
        )

    def add(self, token: RefreshToken) -> RefreshToken:
        self.session.add(token)
        self.session.flush()
        return token

    def revoke_all_for_user(
        self, user_id: int, *, now: datetime, except_token_id: int | None = None
    ) -> int:
        stmt = (
            update(RefreshToken)
            .where(RefreshToken.user_id == user_id, RefreshToken.revoked_at.is_(None))
            .values(revoked_at=now)
        )
        if except_token_id is not None:
            stmt = stmt.where(RefreshToken.id != except_token_id)
        result = self.session.execute(stmt)
        return int(getattr(result, "rowcount", 0) or 0)

    def delete_expired(self, *, before: datetime) -> int:
        result = self.session.execute(delete(RefreshToken).where(RefreshToken.expires_at < before))
        return int(getattr(result, "rowcount", 0) or 0)
