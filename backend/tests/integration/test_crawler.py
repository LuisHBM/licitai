import uuid
from datetime import date
from unittest.mock import patch

import pytest
from sqlalchemy.dialects.sqlite import insert as sqlite_insert

import pytest

from crawler.etl import _get_or_create_orgao, _get_or_create_unidade, crawl
from crawler.schemas import Contratacao, OrgaoEntidade, PaginaContratacoes, UnidadeOrgao
from db.models import Coleta, Licitacao, Orgao, Unidade

_ORGAO_DATA = {
    "cnpj": "12345678000195",
    "razaoSocial": "Ministério Teste",
    "esferaId": "F",
    "poderId": "E",
}

_UNIDADE_DATA = {
    "codigoUnidade": "001",
    "nomeUnidade": "Unidade Central",
    "municipioNome": "Salvador",
    "codigoIbge": "2927408",
    "ufSigla": "BA",
}

_CONTRATACAO = {
    "numeroControlePNCP": "12345678000195-2025-000001",
    "numeroCompra": "001/2025",
    "anoCompra": 2025,
    "sequencialCompra": "000001",
    "objetoCompra": "Aquisição de material de escritório",
    "valorTotalEstimado": 50000.00,
    "valorTotalHomologado": None,
    "situacaoCompraId": 1,
    "srp": False,
    "dataPublicacaoPncp": "2025-01-02",
    "dataAberturaProposta": "2025-01-10T09:00:00",
    "dataEncerramentoProposta": "2025-01-20T18:00:00",
    "dataInclusao": "2025-01-02T10:00:00",
    "dataAtualizacao": "2025-01-02T10:00:00",
    "modalidadeId": 6,
    "orgaoEntidade": _ORGAO_DATA,
    "unidadeOrgao": _UNIDADE_DATA,
}

_FAKE_PAGE = PaginaContratacoes.model_validate(
    {"totalRegistros": 1, "totalPaginas": 1, "data": [_CONTRATACAO]}
)
_EMPTY_PAGE = PaginaContratacoes(totalRegistros=0, totalPaginas=0, data=[])


@pytest.mark.integration
class TestGetOrCreateOrgao:
    def test_cria_orgao_novo(self, db_session):
        cache = {}
        id_orgao = _get_or_create_orgao(db_session, OrgaoEntidade.model_validate(_ORGAO_DATA), cache)

        orgao = db_session.query(Orgao).filter_by(cnpj="12345678000195").first()
        assert orgao is not None
        assert orgao.razao_social == "Ministério Teste"
        assert orgao.id_orgao == id_orgao

    def test_retorna_orgao_existente(self, db_session):
        cache = {}
        orgao = OrgaoEntidade.model_validate(_ORGAO_DATA)
        id1 = _get_or_create_orgao(db_session, orgao, cache)
        id2 = _get_or_create_orgao(db_session, orgao, cache)

        assert id1 == id2
        assert db_session.query(Orgao).count() == 1

    def test_usa_cache(self, db_session):
        cache = {}
        orgao = OrgaoEntidade.model_validate(_ORGAO_DATA)
        _get_or_create_orgao(db_session, orgao, cache)
        assert "12345678000195" in cache

        with patch.object(db_session, "query") as mock_query:
            _get_or_create_orgao(db_session, orgao, cache)
            mock_query.assert_not_called()

    def test_cnpj_sem_formatacao(self, db_session):
        orgao = OrgaoEntidade.model_validate({**_ORGAO_DATA, "cnpj": "12.345.678/0001-95"})
        cache = {}
        _get_or_create_orgao(db_session, orgao, cache)

        assert db_session.query(Orgao).filter_by(cnpj="12345678000195").first() is not None

    def test_cnpj_vazio_levanta_erro(self, db_session):
        with pytest.raises(ValueError, match="CNPJ"):
            _get_or_create_orgao(db_session, OrgaoEntidade(cnpj=""), {})


@pytest.mark.integration
class TestGetOrCreateUnidade:
    def test_cria_unidade_nova(self, db_session):
        orgao = Orgao(cnpj="99999999000191", razao_social="Orgão X")
        db_session.add(orgao)
        db_session.flush()

        cache = {}
        id_unidade = _get_or_create_unidade(db_session, UnidadeOrgao.model_validate(_UNIDADE_DATA), orgao.id_orgao, cache)

        unidade = db_session.query(Unidade).filter_by(id_unidade=id_unidade).first()
        assert unidade is not None
        assert unidade.nome_unidade == "Unidade Central"
        assert unidade.uf == "BA"

    def test_retorna_unidade_existente(self, db_session):
        orgao = Orgao(cnpj="88888888000188", razao_social="Orgão Y")
        db_session.add(orgao)
        db_session.flush()

        unidade = UnidadeOrgao.model_validate(_UNIDADE_DATA)
        cache = {}
        id1 = _get_or_create_unidade(db_session, unidade, orgao.id_orgao, cache)
        id2 = _get_or_create_unidade(db_session, unidade, orgao.id_orgao, cache)

        assert id1 == id2
        assert db_session.query(Unidade).count() == 1


@pytest.mark.integration
class TestCrawl:
    @patch("crawler.etl._upsert_licitacao")
    @patch("crawler.client.fetch_contratacoes_page")
    def test_cria_coleta_concluida(self, mock_fetch, mock_upsert, db_session):
        mock_fetch.return_value = _FAKE_PAGE
        mock_upsert.return_value = uuid.uuid4()

        crawl(
            data_inicio=date(2025, 1, 1),
            data_fim=date(2025, 1, 1),
            modalidades=[6],
            uf="BA",
            session=db_session,
        )

        coleta = db_session.query(Coleta).first()
        assert coleta.status == "concluido"
        assert coleta.total_registros == 1
        assert coleta.modalidade_filtro == 6
        assert coleta.uf_filtro == "BA"

    @patch("crawler.etl._upsert_licitacao")
    @patch("crawler.client.fetch_contratacoes_page")
    def test_cria_orgao_e_unidade(self, mock_fetch, mock_upsert, db_session):
        mock_fetch.return_value = _FAKE_PAGE
        mock_upsert.return_value = uuid.uuid4()

        crawl(
            data_inicio=date(2025, 1, 1),
            data_fim=date(2025, 1, 7),
            modalidades=[6],
            uf=None,
            session=db_session,
        )

        assert db_session.query(Orgao).filter_by(cnpj="12345678000195").first() is not None
        assert db_session.query(Unidade).filter_by(codigo_unidade="001").first() is not None

    @patch("crawler.etl._upsert_licitacao")
    @patch("crawler.client.fetch_contratacoes_page")
    def test_sem_registros_na_api(self, mock_fetch, mock_upsert, db_session):
        mock_fetch.return_value = _EMPTY_PAGE

        crawl(
            data_inicio=date(2025, 1, 1),
            data_fim=date(2025, 1, 7),
            modalidades=[6],
            uf=None,
            session=db_session,
        )

        coleta = db_session.query(Coleta).first()
        assert coleta.status == "concluido"
        assert coleta.total_registros == 0
        mock_upsert.assert_not_called()

    @patch("crawler.etl._upsert_licitacao")
    @patch("crawler.client.fetch_contratacoes_page")
    def test_erro_na_api_pula_dia_e_conclui(self, mock_fetch, mock_upsert, db_session):
        mock_fetch.side_effect = RuntimeError("API fora do ar")

        crawl(
            data_inicio=date(2025, 1, 1),
            data_fim=date(2025, 1, 7),
            modalidades=[6],
            uf=None,
            session=db_session,
        )

        coleta = db_session.query(Coleta).first()
        assert coleta.status == "concluido"
        assert coleta.total_registros == 0
        mock_upsert.assert_not_called()

    @patch("crawler.etl._upsert_licitacao")
    @patch("crawler.client.fetch_contratacoes_page")
    def test_multiplas_modalidades_geram_coletas_separadas(
        self, mock_fetch, mock_upsert, db_session
    ):
        mock_fetch.return_value = _FAKE_PAGE
        mock_upsert.return_value = uuid.uuid4()

        crawl(
            data_inicio=date(2025, 1, 1),
            data_fim=date(2025, 1, 7),
            modalidades=[6, 8],
            uf=None,
            session=db_session,
        )

        coletas = db_session.query(Coleta).all()
        assert len(coletas) == 2
        assert {c.modalidade_filtro for c in coletas} == {6, 8}


@pytest.mark.integration
class TestUpsertLicitacao:
    @patch("crawler.etl.pg_insert", new=sqlite_insert)
    def test_insere_nova_licitacao(self, db_session):
        from crawler.etl import _upsert_licitacao

        orgao = Orgao(cnpj="77777777000177", razao_social="Orgão Z")
        db_session.add(orgao)
        db_session.flush()
        unidade = Unidade(
            id_orgao=orgao.id_orgao, codigo_unidade="Z01", nome_unidade="Unidade Z", uf="BA"
        )
        db_session.add(unidade)
        coleta = Coleta(
            status="em_andamento",
            data_inicio_coleta=date(2025, 1, 1),
            data_fim_coleta=date(2025, 1, 7),
        )
        db_session.add(coleta)
        db_session.flush()

        rec = Contratacao.model_validate(_CONTRATACAO)
        id_lic = _upsert_licitacao(db_session, rec, coleta.id_coleta, unidade.id_unidade)
        db_session.commit()

        lic = db_session.query(Licitacao).filter_by(id_licitacao=id_lic).first()
        assert lic is not None
        assert lic.numero_controle_pncp == "12345678000195-2025-000001"
        assert lic.objeto_compra == "Aquisição de material de escritório"
