import os

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from db.models import Base, Estado, Modalidade

DATABASE_URL = os.environ.get(
    "DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/licitai"
)

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
Session = sessionmaker(bind=engine)

_MODALIDADES = [
    (1, "Leilão - Eletrônico"),
    (2, "Diálogo Competitivo"),
    (3, "Concurso"),
    (4, "Concorrência - Eletrônica"),
    (5, "Concorrência - Presencial"),
    (6, "Pregão - Eletrônico"),
    (7, "Pregão - Presencial"),
    (8, "Dispensa de Licitação"),
    (9, "Inexigibilidade"),
    (10, "Manifestação de Interesse"),
    (11, "Pré-qualificação"),
    (12, "Credenciamento"),
    (13, "Leilão - Presencial"),
]


def create_tables() -> None:
    Base.metadata.create_all(engine)
    with Session() as session:
        _seed_modalidades(session)
        _seed_estados(session)
        session.commit()
    with engine.connect() as conn:
        _create_search_trigger(conn)
        _create_extra_indexes(conn)
        conn.commit()


def _create_search_trigger(conn) -> None:
    conn.execute(text("""
        CREATE OR REPLACE FUNCTION fn_licitacao_search_vector()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.search_vector := to_tsvector('portuguese', coalesce(NEW.objeto_compra, ''));
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
    """))
    conn.execute(text("""
        CREATE OR REPLACE TRIGGER trig_licitacao_search_vector
        BEFORE INSERT OR UPDATE OF objeto_compra ON licitacao
        FOR EACH ROW EXECUTE FUNCTION fn_licitacao_search_vector();
    """))


def _create_extra_indexes(conn) -> None:
    conn.execute(text("""
        CREATE INDEX IF NOT EXISTS ix_unidade_uf
        ON unidade (uf);
    """))
    conn.execute(text("""
        CREATE INDEX IF NOT EXISTS ix_licitacao_modalidade
        ON licitacao (id_modalidade);
    """))
    conn.execute(text("""
        CREATE INDEX IF NOT EXISTS ix_licitacao_situacao
        ON licitacao (situacao_id);
    """))


_ESTADOS = [
    ("AC", "Acre"),
    ("AL", "Alagoas"),
    ("AP", "Amapá"),
    ("AM", "Amazonas"),
    ("BA", "Bahia"),
    ("CE", "Ceará"),
    ("DF", "Distrito Federal"),
    ("ES", "Espírito Santo"),
    ("GO", "Goiás"),
    ("MA", "Maranhão"),
    ("MT", "Mato Grosso"),
    ("MS", "Mato Grosso do Sul"),
    ("MG", "Minas Gerais"),
    ("PA", "Pará"),
    ("PB", "Paraíba"),
    ("PR", "Paraná"),
    ("PE", "Pernambuco"),
    ("PI", "Piauí"),
    ("RJ", "Rio de Janeiro"),
    ("RN", "Rio Grande do Norte"),
    ("RS", "Rio Grande do Sul"),
    ("RO", "Rondônia"),
    ("RR", "Roraima"),
    ("SC", "Santa Catarina"),
    ("SP", "São Paulo"),
    ("SE", "Sergipe"),
    ("TO", "Tocantins"),
]


def _seed_estados(session) -> None:
    existing = {e.uf for e in session.query(Estado.uf)}
    for uf, nome in _ESTADOS:
        if uf not in existing:
            session.add(Estado(uf=uf, nome=nome))


def _seed_modalidades(session) -> None:
    existing = {m.id_modalidade for m in session.query(Modalidade.id_modalidade)}
    for codigo, nome in _MODALIDADES:
        if codigo not in existing:
            session.add(Modalidade(id_modalidade=codigo, codigo=codigo, nome=nome))


def enable_pgvector() -> None:
    with engine.connect() as conn:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        conn.commit()
