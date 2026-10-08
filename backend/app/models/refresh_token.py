from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import BigInteger, DateTime, ForeignKey, Index, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, CreatedAtMixin

if TYPE_CHECKING:
    from app.models.user import User


class RefreshToken(CreatedAtMixin, Base):
    """Server-side record of an issued refresh token.

    Only an HMAC-SHA256 hash of the token is stored; the raw value exists solely in the
    client's httpOnly cookie. Tokens are rotated on every refresh and revoked on logout.
    """

    __tablename__ = "refresh_tokens"
    __table_args__ = (
        # Every refresh/logout looks a token up by its hash.
        Index("ix_refresh_tokens_token_hash", "token_hash", unique=True),
        # FK index; also used to revoke all of a user's sessions.
        Index("ix_refresh_tokens_user_id", "user_id"),
        # Used by the expired-token purge job (`manage purge-tokens`).
        Index("ix_refresh_tokens_expires_at", "expires_at"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    token_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    user_agent: Mapped[str | None] = mapped_column(String(512))
    ip_address: Mapped[str | None] = mapped_column(String(45))

    user: Mapped["User"] = relationship(back_populates="refresh_tokens", lazy="raise_on_sql")

    @property
    def is_revoked(self) -> bool:
        return self.revoked_at is not None
