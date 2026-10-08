"""Schema guarantees: migrations match the models and required indexes exist."""

from alembic.autogenerate import compare_metadata
from alembic.migration import MigrationContext
from app.db.base import Base
from sqlalchemy import Engine, inspect, text


def test_models_and_migrations_are_in_sync(engine: Engine) -> None:
    with engine.connect() as conn:
        context = MigrationContext.configure(conn, opts={"compare_type": True})
        diff = compare_metadata(context, Base.metadata)
    assert diff == [], f"Models differ from migrations; create a new Alembic revision: {diff}"


def test_there_is_no_user_roles_table(engine: Engine) -> None:
    tables = set(inspect(engine).get_table_names())
    assert {"roles", "users", "refresh_tokens", "audit_logs"} <= tables
    assert "user_roles" not in tables


def test_required_indexes_exist(engine: Engine) -> None:
    with engine.connect() as conn:
        rows = conn.execute(
            text("SELECT indexname, indexdef FROM pg_indexes WHERE schemaname = 'public'")
        ).all()
    indexes: dict[str, str] = {row[0]: row[1] for row in rows}

    assert "UNIQUE" in indexes["ix_roles_name"]
    assert "UNIQUE" in indexes["ix_users_email"]
    assert "(role_id, created_at, id)" in indexes["ix_users_role_id_created_at_id"]
    assert "(created_at, id)" in indexes["ix_users_created_at_id"]
    assert "UNIQUE" in indexes["ix_refresh_tokens_token_hash"]
    assert "(user_id)" in indexes["ix_refresh_tokens_user_id"]
    assert "(actor_user_id, created_at)" in indexes["ix_audit_logs_actor_user_id_created_at"]


def test_every_foreign_key_is_indexed(engine: Engine) -> None:
    inspector = inspect(engine)
    for table in inspector.get_table_names():
        leading_columns = {tuple(ix["column_names"][:1]) for ix in inspector.get_indexes(table)}
        for fk in inspector.get_foreign_keys(table):
            first = tuple(fk["constrained_columns"][:1])
            assert first in leading_columns, f"{table}.{first} foreign key has no index"
