from typing import TYPE_CHECKING

from sqlalchemy import Index, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.user import User


class Role(TimestampMixin, Base):
    __tablename__ = "roles"
    __table_args__ = (
        # Role names are looked up on every permission check and must be unique.
        Index("ix_roles_name", "name", unique=True),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(50), nullable=False)
    description: Mapped[str | None] = mapped_column(String(255))

    # `raise_on_sql` forces callers to eager-load explicitly, which prevents N+1 queries.
    users: Mapped[list["User"]] = relationship(back_populates="role", lazy="raise_on_sql")

    def __repr__(self) -> str:
        return f"Role(id={self.id!r}, name={self.name!r})"
