from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from licitai.config import settings


def _build_url() -> str:
    s = settings
    return (
        f"postgresql+psycopg2://{s.db_user}:{s.db_password}"
        f"@{s.db_host}:{s.db_port}/{s.db_name}"
    )


engine = create_engine(
    _build_url(),
    pool_size=settings.db_pool_size,
    max_overflow=settings.db_max_overflow,
    echo=settings.db_echo,
)

SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)


def get_session():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


def create_database():
    from licitai.models import Base

    with engine.begin() as conn:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))

    Base.metadata.create_all(engine)
    print("Banco criado com sucesso.")


if __name__ == "__main__":
    create_database()
