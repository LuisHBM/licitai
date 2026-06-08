from datetime import date
from unittest.mock import MagicMock, patch

import pytest

from tests.conftest import make_licitacao

_ALIENACAO_VEICULO = "ALIENAÇÃO DE VEÍCULOS E ITENS INSERVÍVEIS DE PROPRIEDADE DO MUNICÍPIO DE CASTRO ALVES-BA"
_ALIENACAO_IMOVEL = "Alienação de bem imóvel de propriedade do CREMEB"
_ALIENACAO_MERCADORIA = "Alienação de mercadorias apreendidas pela Receita Federal"
_LEILAO_ONLINE = "LEILÃO NA MODALIDADE ON LINE, tipo maior lance"

_FAKE_VETOR = [0.1] * 3072


@pytest.mark.unit
class TestBuscaTextual:
    def test_endpoint_existe(self, client):
        resp = client.post("/busca/textual", json={"q": ""})
        assert resp.status_code == 200

    def test_retorna_422_sem_q(self, client):
        resp = client.post("/busca/textual", json={})
        assert resp.status_code == 422

    def test_retorna_licitacao_sem_filtro_fts(self, client, db_session):
        make_licitacao(db_session, objeto_compra=_ALIENACAO_VEICULO)
        resp = client.post("/busca/textual", json={"q": ""})
        assert resp.status_code == 200
        body = resp.json()
        assert body["total"] == 1
        assert body["resultados"][0]["objeto_compra"] == _ALIENACAO_VEICULO

    def test_filtro_por_uf(self, client, db_session):
        make_licitacao(db_session, uf="BA", objeto_compra=_ALIENACAO_VEICULO)
        make_licitacao(db_session, uf="SP", objeto_compra=_ALIENACAO_IMOVEL)
        resp = client.post("/busca/textual", json={"q": "", "uf": "BA"})
        assert resp.status_code == 200
        assert resp.json()["total"] == 1
        assert resp.json()["resultados"][0]["uf"] == "BA"

    def test_filtro_por_modalidade(self, client, db_session):
        make_licitacao(db_session, modalidade=6, objeto_compra=_ALIENACAO_VEICULO)
        make_licitacao(db_session, modalidade=8, objeto_compra=_ALIENACAO_MERCADORIA)
        resp = client.post("/busca/textual", json={"q": "", "modalidade": 6})
        assert resp.status_code == 200
        assert resp.json()["total"] == 1

    def test_paginacao(self, client, db_session):
        objetos = [_ALIENACAO_VEICULO, _ALIENACAO_IMOVEL, _ALIENACAO_MERCADORIA, _LEILAO_ONLINE]
        for obj in objetos:
            make_licitacao(db_session, objeto_compra=obj)
        resp = client.post("/busca/textual", json={"q": "", "pagina": 1, "tamanho": 2})
        assert resp.status_code == 200
        body = resp.json()
        assert body["pagina"] == 1
        assert body["tamanho"] == 2
        assert len(body["resultados"]) == 2
        assert body["total"] == 4

    def test_campos_retornados(self, client, db_session):
        make_licitacao(db_session, objeto_compra=_ALIENACAO_VEICULO, valor_total_estimado=788000.00)
        resp = client.post("/busca/textual", json={"q": ""})
        item = resp.json()["resultados"][0]
        for campo in ["id_licitacao", "numero_controle_pncp", "objeto_compra", "uf", "modalidade_nome"]:
            assert campo in item


@pytest.mark.unit
class TestBuscaSemantica:
    def test_retorna_422_sem_q(self, client):
        resp = client.post("/busca/semantica", json={})
        assert resp.status_code == 422

    def test_chama_embedding_e_retorna_resultados(self, client, db_session):
        lic1 = make_licitacao(db_session, objeto_compra=_ALIENACAO_VEICULO, uf="BA")
        lic2 = make_licitacao(db_session, objeto_compra=_ALIENACAO_IMOVEL, uf="BA")

        with (
            patch("api.routes.gerar_embedding_query", return_value=_FAKE_VETOR) as mock_emb,
            patch("api.routes._buscar_por_vetor") as mock_buscar,
        ):
            mock_buscar.return_value = [
                _row_from_licitacao(db_session, lic1),
                _row_from_licitacao(db_session, lic2),
            ]
            resp = client.post("/busca/semantica", json={"q": "venda de carros usados"})

        assert resp.status_code == 200
        mock_emb.assert_called_once_with("venda de carros usados")
        assert len(resp.json()) == 2

    def test_filtros_repassados_ao_buscar(self, client, db_session):
        make_licitacao(db_session, objeto_compra=_ALIENACAO_VEICULO)

        with (
            patch("api.routes.gerar_embedding_query", return_value=_FAKE_VETOR),
            patch("api.routes._buscar_por_vetor", return_value=[]) as mock_buscar,
        ):
            client.post("/busca/semantica", json={"q": "leilão", "uf": "BA", "modalidade": 6, "limite": 5})
            _, kwargs = mock_buscar.call_args
            assert kwargs["uf"] == "BA"
            assert kwargs["modalidade"] == 6
            assert kwargs["limite"] == 5




def _row_from_licitacao(session, lic):
    from api.routes import _base_query
    from db.models import Licitacao
    return _base_query(session).filter(Licitacao.id_licitacao == lic.id_licitacao).first()
