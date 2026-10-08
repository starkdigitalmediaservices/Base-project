from typing import TYPE_CHECKING, Any

from sqlalchemy import BigInteger, ForeignKey, Index, String, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, CreatedAtMixin

if TYPE_CHECKING:
    from app.models.user import User


class AuditLog(CreatedAtMixin, Base):
    """Append-only record of security-relevant and data-changing actions."""

    __tablename__ = "audit_logs"
    __table_args__ = (
        # Default list ordering: created_at DESC, id DESC.
        Index("ix_audit_logs_created_at_id", "created_at", "id"),
        # FK index; also serves "activity of user X, newest first".
        Index("ix_audit_logs_actor_user_id_created_at", "actor_user_id", "created_at"),
        # "History of resource X, newest first".
        Index(
            "ix_audit_logs_resource_type_resource_id_created_at",
            "resource_type",
            "resource_id",
            "created_at",
        ),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    actor_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    action: Mapped[str] = mapped_column(String(100), nullable=False)
    resource_type: Mapped[str | None] = mapped_column(String(100))
    resource_id: Mapped[str | None] = mapped_column(String(100))
    # `metadata` is reserved by SQLAlchemy's declarative API, hence the attribute name.
    event_metadata: Mapped[dict[str, Any]] = mapped_column(
        "metadata", JSONB, nullable=False, server_default=text("'{}'::jsonb"), default=dict
    )
    ip_address: Mapped[str | None] = mapped_column(String(45))
    user_agent: Mapped[str | None] = mapped_column(String(512))

    actor: Mapped["User | None"] = relationship(lazy="raise_on_sql")
