from typing import TYPE_CHECKING

from sqlalchemy import Boolean, ForeignKey, Index, String, true
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.refresh_token import RefreshToken
    from app.models.role import Role


class User(TimestampMixin, Base):
    """An account. Each user has exactly ONE role via `role_id` (there is no `user_roles` table)."""

    __tablename__ = "users"
    __table_args__ = (
        # Login lookups and the uniqueness rule. Emails are stored lower-cased.
        Index("ix_users_email", "email", unique=True),
        # Leading `role_id` serves FK lookups (e.g. "does any user use this role?") AND the
        # admin list query "filter by role, newest first" without a separate sort step.
        Index("ix_users_role_id_created_at_id", "role_id", "created_at", "id"),
        # Default list ordering: created_at DESC, id DESC (scanned backwards).
        Index("ix_users_created_at_id", "created_at", "id"),
        # The list endpoint allows sorting by name.
        Index("ix_users_name_id", "name", "id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    role_id: Mapped[int] = mapped_column(
        ForeignKey("roles.id", ondelete="RESTRICT"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    email: Mapped[str] = mapped_column(String(320), nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default=true()
    )

    role: Mapped["Role"] = relationship(back_populates="users", lazy="raise_on_sql")
    refresh_tokens: Mapped[list["RefreshToken"]] = relationship(
        back_populates="user", lazy="raise_on_sql", passive_deletes=True
    )

    def __repr__(self) -> str:
        return f"User(id={self.id!r}, email={self.email!r})"
