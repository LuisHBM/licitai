"""
Testes de integração ponta a ponta — crawler real contra PNCP + PostgreSQL real.

O crawler chama a API do PNCP de verdade (via Playwright/challenge.fetch_json).
Os testes verificam que o pipeline completo funciona: coleta → parsing → upsert → tsvector.

Rodar localmente:
    docker compose -f backend/docker/docker-compose.yml up -d postgres
    DATABASE_URL=postgresql://postgres:licitai@localhost:5438/licitai_test \\
        uv run pytest tests/test_integration.py -v

Via compose:
    docker compose -f backend/docker/docker-compose.yml --profile test run --rm tests
"""
import os
from datetime import date

import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from crawler.etl import crawl
from db.models import Base, Coleta, ItemLicitacao, Licitacao, Modalidade, Orgao, Unidade
from db.session import _create_search_trigger

DATABASE_URL = os.environ.get(
    "DATABASE_URL", "postgresql://postgres:licitai@localhost:5438/licitai_test"
)

# Data curta e passada — garante resultado determinístico sem sobrecarregar o PNCP
_DATA = date(2025, 3, 10)
_MODALIDADE = 6   # Pregão Eletrônico — modalidade mais comum
_UF = "BA"        # recorte pequeno para o teste ser rápido


@pytest.fixture(scope="module")
def pg_engine():
    if not DATABASE_URL.startswith("postgresql"):
        pytest.skip("Integração requer PostgreSQL")

    try:
        engine = create_engine(DATABASE_URL, pool_pre_ping=True)
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception as exc:
        pytest.skip(f"PostgreSQL inacessível: {exc}")

    Base.metadata.drop_all(engine)
    with engine.connect() as conn:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        conn.commit()
    Base.metadata.create_all(engine)
    with engine.connect() as conn:
        _create_search_trigger(conn)
        conn.commit()

    yield engine
    Base.metadata.drop_all(engine)
    engine.dispose()


@pytest.fixture(scope="module")
def pg_session(pg_engine):
    """Sessão com modalidades seedadas e crawl real já executado."""
    Session = sessionmaker(bind=pg_engine)
    session = Session()

    session.add_all([
        Modalidade(id_modalidade=6,  codigo=6,  nome="Pregão - Eletrônico"),
        Modalidade(id_modalidade=8,  codigo=8,  nome="Dispensa de Licitação"),
    ])
    session.commit()

    crawl(data_inicio=_DATA, data_fim=_DATA, modalidades=[_MODALIDADE], uf=_UF, session=session)

    yield session
    session.close()


# ---------------------------------------------------------------------------
# Coleta
# ---------------------------------------------------------------------------

class TestColeta:
    def test_coleta_criada(self, pg_session):
        coleta = pg_session.query(Coleta).first()
        assert coleta is not None

    def test_coleta_status_concluido(self, pg_session):
        coleta = pg_session.query(Coleta).first()
        assert coleta.status == "concluido"

    def test_coleta_registrou_total(self, pg_session):
        coleta = pg_session.query(Coleta).first()
        assert coleta.total_registros > 0

    def test_coleta_parametros_corretos(self, pg_session):
        coleta = pg_session.query(Coleta).first()
        assert coleta.modalidade_filtro == _MODALIDADE
        assert coleta.uf_filtro == _UF
        assert coleta.data_inicio_coleta == _DATA
        assert coleta.data_fim_coleta == _DATA


# ---------------------------------------------------------------------------
# Persistência
# ---------------------------------------------------------------------------

class TestPersistencia:
    def test_licitacoes_persistidas(self, pg_session):
        count = pg_session.query(Licitacao).count()
        assert count > 0

    def test_orgaos_persistidos(self, pg_session):
        assert pg_session.query(Orgao).count() > 0

    def test_unidades_persistidas(self, pg_session):
        assert pg_session.query(Unidade).count() > 0

    def test_total_coleta_bate_com_registros(self, pg_session):
        coleta = pg_session.query(Coleta).first()
        count = pg_session.query(Licitacao).filter_by(id_coleta=coleta.id_coleta).count()
        assert coleta.total_registros == count


# ---------------------------------------------------------------------------
# Integridade dos dados
# ---------------------------------------------------------------------------

class TestIntegridade:
    def test_numero_controle_pncp_nao_nulo(self, pg_session):
        nulos = pg_session.query(Licitacao).filter(Licitacao.numero_controle_pncp == None).count()
        assert nulos == 0

    def test_cnpj_normalizado_sem_mascara(self, pg_session):
        orgaos = pg_session.query(Orgao).all()
        for orgao in orgaos:
            assert "." not in orgao.cnpj
            assert "/" not in orgao.cnpj
            assert "-" not in orgao.cnpj

    def test_campos_obrigatorios_preenchidos(self, pg_session):
        licitacoes = pg_session.query(Licitacao).limit(10).all()
        for lic in licitacoes:
            assert lic.id_unidade is not None
            assert lic.id_modalidade is not None
            assert lic.id_coleta is not None

    def test_sem_licitacoes_duplicadas(self, pg_session):
        from sqlalchemy import func
        duplicatas = (
            pg_session.query(Licitacao.numero_controle_pncp, func.count())
            .group_by(Licitacao.numero_controle_pncp)
            .having(func.count() > 1)
            .count()
        )
        assert duplicatas == 0

    def test_upsert_nao_duplica_ao_rodar_novamente(self, pg_session):
        count_antes = pg_session.query(Licitacao).count()
        crawl(data_inicio=_DATA, data_fim=_DATA, modalidades=[_MODALIDADE], uf=_UF, session=pg_session)
        count_depois = pg_session.query(Licitacao).count()
        assert count_depois == count_antes


# ---------------------------------------------------------------------------
# Full-text search
# ---------------------------------------------------------------------------

class TestFullTextSearch:
    def test_search_vector_populado(self, pg_session):
        sem_vetor = pg_session.query(Licitacao).filter(Licitacao.search_vector == None).count()
        assert sem_vetor == 0

    def test_fts_retorna_resultados(self, pg_session):
        count = pg_session.execute(
            text("""
                SELECT count(*) FROM licitacao
                WHERE search_vector @@ plainto_tsquery('portuguese', 'contratação')
                   OR search_vector @@ plainto_tsquery('portuguese', 'aquisição')
                   OR search_vector @@ plainto_tsquery('portuguese', 'serviços')
            """)
        ).scalar()
        assert count > 0

    def test_fts_busca_por_termo_do_objeto(self, pg_session):
        amostra = pg_session.query(Licitacao).filter(
            Licitacao.objeto_compra != None
        ).first()
        if not amostra:
            pytest.skip("Nenhuma licitação com objeto_compra")

        primeiro_termo = amostra.objeto_compra.split()[0]

        count = pg_session.execute(
            text("SELECT count(*) FROM licitacao WHERE search_vector @@ plainto_tsquery('portuguese', :termo)"),
            {"termo": primeiro_termo},
        ).scalar()
        assert count >= 1
