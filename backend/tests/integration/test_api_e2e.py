"""
Testes E2E passando pela API HTTP com SQLite em memória.
Substituem o uso manual do Swagger.
"""
from datetime import date
from unittest.mock import patch

import pytest

from tests.conftest import make_licitacao

_ALIENACAO_VEICULO = "ALIENAÇÃO DE VEÍCULOS E ITENS INSERVÍVEIS DO MUNICÍPIO DE CASTRO ALVES-BA"
_ALIENACAO_IMOVEL = "Alienação de bem imóvel de propriedade do CREMEB"
_ALIENACAO_MERCADORIA = "Alienação de mercadorias apreendidas pela Receita Federal"
_LEILAO_ONLINE = "LEILÃO NA MODALIDADE ON LINE, tipo maior lance"

_FAKE_VETOR = [0.1] * 3072


@pytest.fixture(autouse=True)
def _seed(db_session):
    make_licitacao(db_session, objeto_compra=_ALIENACAO_VEICULO, uf="BA", modalidade=6,
                   valor_total_estimado=788000, data_publicacao_pncp=date(2026, 5, 11))
    make_licitacao(db_session, objeto_compra=_ALIENACAO_IMOVEL, uf="BA", modalidade=6,
                   valor_total_estimado=13665000, data_publicacao_pncp=date(2026, 5, 7))
    make_licitacao(db_session, objeto_compra=_ALIENACAO_MERCADORIA, uf="BA", modalidade=8,
                   valor_total_estimado=832000, data_publicacao_pncp=date(2026, 5, 5))
    make_licitacao(db_session, objeto_compra=_LEILAO_ONLINE, uf="SP", modalidade=6,
                   valor_total_estimado=651450, data_publicacao_pncp=date(2026, 5, 11))


class TestBuscaTextualE2E:
    def test_sem_filtro_retorna_todos(self, client):
        resp = client.post("/busca/textual", json={"q": ""})
        assert resp.status_code == 200
        assert resp.json()["total"] == 4

    def test_filtro_uf_ba(self, client):
        resp = client.post("/busca/textual", json={"q": "", "uf": "BA"})
        assert resp.status_code == 200
        body = resp.json()
        assert body["total"] == 3
        for item in body["resultados"]:
            assert item["uf"] == "BA"

    def test_filtro_uf_sp(self, client):
        resp = client.post("/busca/textual", json={"q": "", "uf": "SP"})
        assert resp.status_code == 200
        assert resp.json()["total"] == 1

    def test_filtro_modalidade_dispensa(self, client):
        resp = client.post("/busca/textual", json={"q": "", "modalidade": 8})
        assert resp.status_code == 200
        assert resp.json()["total"] == 1
        assert resp.json()["resultados"][0]["objeto_compra"] == _ALIENACAO_MERCADORIA

    def test_paginacao_pagina_1(self, client):
        resp = client.post("/busca/textual", json={"q": "", "pagina": 1, "tamanho": 2})
        assert resp.status_code == 200
        body = resp.json()
        assert body["total"] == 4
        assert len(body["resultados"]) == 2

    def test_paginacao_pagina_2(self, client):
        resp = client.post("/busca/textual", json={"q": "", "pagina": 2, "tamanho": 2})
        assert resp.status_code == 200
        body = resp.json()
        assert len(body["resultados"]) == 2

    def test_uf_inexistente_retorna_vazio(self, client):
        resp = client.post("/busca/textual", json={"q": "", "uf": "ZZ"})
        assert resp.status_code == 200
        assert resp.json()["total"] == 0

    def test_campos_na_resposta(self, client):
        resp = client.post("/busca/textual", json={"q": ""})
        item = resp.json()["resultados"][0]
        for campo in ["id_licitacao", "numero_controle_pncp", "objeto_compra",
                      "uf", "modalidade_nome", "valor_total_estimado", "data_publicacao_pncp"]:
            assert campo in item


class TestBuscaSemanticaE2E:
    def test_retorna_resultados_mockados(self, client, db_session):
        lics = db_session.execute(
            __import__("sqlalchemy").text("SELECT id_licitacao FROM licitacao")
        ).fetchall()

        with (
            patch("api.routes.gerar_embedding_query", return_value=_FAKE_VETOR),
            patch("api.routes._buscar_por_vetor") as mock_buscar,
        ):
            from api.routes import _base_query
            from db.models import Licitacao
            rows = _base_query(db_session).all()
            mock_buscar.return_value = rows

            resp = client.post("/busca/semantica", json={"q": "venda de bens públicos"})

        assert resp.status_code == 200
        assert len(resp.json()) == 4

    def test_limite_respeitado(self, client, db_session):
        with (
            patch("api.routes.gerar_embedding_query", return_value=_FAKE_VETOR),
            patch("api.routes._buscar_por_vetor") as mock_buscar,
        ):
            from api.routes import _base_query
            mock_buscar.return_value = _base_query(db_session).limit(2).all()

            resp = client.post("/busca/semantica", json={"q": "licitação", "limite": 2})

        assert resp.status_code == 200
        assert len(resp.json()) <= 2

    def test_embedding_gerado_com_query_original(self, client, db_session):
        with (
            patch("api.routes.gerar_embedding_query", return_value=_FAKE_VETOR) as mock_emb,
            patch("api.routes._buscar_por_vetor", return_value=[]),
        ):
            client.post("/busca/semantica", json={"q": "alienação de veículos"})
            mock_emb.assert_called_once_with("alienação de veículos")


