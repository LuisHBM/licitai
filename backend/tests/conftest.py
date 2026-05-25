import uuid
from datetime import date

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from db.models import Base, Coleta, Estado, Licitacao, Modalidade, Orgao, Unidade

_TABLES = [
    "estado",
    "administrador",
    "coleta",
    "orgao",
    "unidade",
    "modalidade",
    "licitacao",
    "item_licitacao",
]


@pytest.fixture(scope="function")
def engine():
    eng = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(eng, tables=[Base.metadata.tables[t] for t in _TABLES])
    yield eng
    eng.dispose()


@pytest.fixture(scope="function")
def db_session(engine):
    SessionLocal = sessionmaker(bind=engine)
    session = SessionLocal()
    session.add_all(
        [
            Modalidade(id_modalidade=6, codigo=6, nome="Pregão - Eletrônico"),
            Modalidade(id_modalidade=8, codigo=8, nome="Dispensa de Licitação"),
            Estado(uf="BA", nome="Bahia"),
            Estado(uf="SP", nome="São Paulo"),
        ]
    )
    session.commit()
    yield session
    session.close()


@pytest.fixture(scope="function")
def client(db_session):
    from api.routes import _cached_estados, _cached_modalidades, app, get_session

    _cached_modalidades.cache_clear()
    _cached_estados.cache_clear()

    def override_get_session():
        yield db_session

    app.dependency_overrides[get_session] = override_get_session

    with TestClient(app) as c:
        yield c

    app.dependency_overrides.clear()
    _cached_modalidades.cache_clear()
    _cached_estados.cache_clear()


def make_licitacao(session, **kwargs) -> Licitacao:
    cnpj = kwargs.get("cnpj", f"{uuid.uuid4().int % 10**14:014d}")
    orgao = session.query(Orgao).filter_by(cnpj=cnpj).first()
    if not orgao:
        orgao = Orgao(cnpj=cnpj, razao_social="Órgão Teste")
        session.add(orgao)
        session.flush()

    unidade = Unidade(
        id_orgao=orgao.id_orgao,
        codigo_unidade=kwargs.get("codigo_unidade", f"u-{uuid.uuid4().hex[:4]}"),
        nome_unidade="Unidade Teste",
        municipio="Salvador",
        uf=kwargs.get("uf", "BA"),
    )
    session.add(unidade)
    session.flush()

    coleta = Coleta(
        status="concluido",
        modalidade_filtro=kwargs.get("modalidade", 6),
        data_inicio_coleta=date(2025, 1, 1),
        data_fim_coleta=date(2025, 1, 7),
        total_registros=1,
    )
    session.add(coleta)
    session.flush()

    lic = Licitacao(
        id_coleta=coleta.id_coleta,
        id_unidade=unidade.id_unidade,
        id_modalidade=kwargs.get("modalidade", 6),
        numero_controle_pncp=kwargs.get(
            "numero_controle_pncp", f"{cnpj}-2025-{uuid.uuid4().hex[:6]}"
        ),
        objeto_compra=kwargs.get("objeto_compra", "Aquisição de material de escritório"),
        valor_total_estimado=kwargs.get("valor_total_estimado", 50000.00),
        data_publicacao_pncp=kwargs.get("data_publicacao_pncp", date(2025, 1, 2)),
        situacao_id=kwargs.get("situacao_id", 1),
        srp=False,
    )
    session.add(lic)
    session.commit()
    return lic
