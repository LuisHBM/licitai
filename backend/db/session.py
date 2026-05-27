from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from config import settings
from db.models import Base, Estado, Modalidade


def _database_url() -> str:
    if url := settings.get("DATABASE_URL"):
        return url
    host, port, name, user = settings.DB_HOST, settings.get("DB_PORT", 5432), settings.DB_NAME, settings.DB_USER
    if not all([host, name, user]):
        raise RuntimeError("Set DATABASE_URL or LICITAI_DB_HOST, LICITAI_DB_NAME, LICITAI_DB_USER.")
    password = settings.get("DB_PASSWORD", "")
    credentials = f"{user}:{password}" if password else str(user)
    return f"postgresql://{credentials}@{host}:{port}/{name}"


engine = create_engine(
    _database_url(),
    pool_pre_ping=True,
    echo=settings.get("DB_ECHO", False),
    pool_size=int(settings.get("DB_POOL_SIZE", 5)),
    max_overflow=int(settings.get("DB_MAX_OVERFLOW", 10)),
)
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
        DECLARE
            v_nome_unidade text;
            v_razao_social  text;
        BEGIN
            SELECT u.nome_unidade, o.razao_social
              INTO v_nome_unidade, v_razao_social
              FROM unidade u
              JOIN orgao o ON o.id_orgao = u.id_orgao
             WHERE u.id_unidade = NEW.id_unidade;

            NEW.search_vector :=
                setweight(to_tsvector('portuguese', coalesce(NEW.objeto_compra, '')), 'A') ||
                setweight(to_tsvector('portuguese', coalesce(v_nome_unidade,  '')), 'B') ||
                setweight(to_tsvector('portuguese', coalesce(v_razao_social,  '')), 'B');

            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
    """))
    conn.execute(text("""
        CREATE OR REPLACE TRIGGER trig_licitacao_search_vector
        BEFORE INSERT OR UPDATE OF objeto_compra, id_unidade ON licitacao
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
