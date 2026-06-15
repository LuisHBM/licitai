import os
import sys
from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

# Make sure the backend root is on sys.path so our modules are importable.
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from db.models import Base  # noqa: E402 — must be after sys.path fix

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def _get_url() -> str:
    url = os.environ.get("DATABASE_URL")
    if url:
        return url
    # Fall back to dynaconf settings (same logic as db/session.py).
    from config import settings
    host = settings.get("DB_HOST")
    port = settings.get("DB_PORT", 5432)
    name = settings.get("DB_NAME")
    user = settings.get("DB_USER")
    password = settings.get("DB_PASSWORD", "")
    credentials = f"{user}:{password}" if password else str(user)
    return f"postgresql://{credentials}@{host}:{port}/{name}"


def run_migrations_offline() -> None:
    url = _get_url()
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    cfg = config.get_section(config.config_ini_section, {})
    cfg["sqlalchemy.url"] = _get_url()
    connectable = engine_from_config(
        cfg,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
