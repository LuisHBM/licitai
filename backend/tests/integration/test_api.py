from datetime import date

import pytest

from db.models import Coleta
from tests.conftest import make_licitacao


@pytest.mark.integration
class TestModalidades:
    def test_retorna_lista(self, client):
        resp = client.get("/modalidades")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 2
        assert data[0]["id_modalidade"] == 6
        assert data[0]["nome"] == "Pregão - Eletrônico"

    def test_ordenado_por_codigo(self, client):
        resp = client.get("/modalidades")
        ids = [m["id_modalidade"] for m in resp.json()]
        assert ids == sorted(ids)


@pytest.mark.integration
class TestEstados:
    def test_retorna_todos_estados_seeded(self, client):
        resp = client.get("/estados")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 2

    def test_retorna_nome_e_uf(self, client):
        resp = client.get("/estados")
        ba = next(e for e in resp.json() if e["uf"] == "BA")
        assert ba["nome"] == "Bahia"

    def test_total_zero_sem_licitacoes(self, client):
        resp = client.get("/estados")
        for estado in resp.json():
            assert estado["total"] == 0

    def test_total_atualizado_com_licitacoes(self, client, db_session):
        make_licitacao(db_session, uf="BA")

        resp = client.get("/estados")
        ba = next(e for e in resp.json() if e["uf"] == "BA")
        assert ba["total"] == 1


@pytest.mark.integration
class TestSearchLicitacoes:
    def test_sem_resultados(self, client):
        resp = client.get("/licitacoes")
        assert resp.status_code == 200
        body = resp.json()
        assert body["total"] == 0
        assert body["resultados"] == []

    def test_retorna_licitacao_criada(self, client, db_session):
        make_licitacao(db_session, objeto_compra="Compra de cadeiras ergonômicas")

        resp = client.get("/licitacoes")
        body = resp.json()
        assert body["total"] == 1
        assert body["resultados"][0]["objeto_compra"] == "Compra de cadeiras ergonômicas"

    def test_filtro_por_uf(self, client, db_session):
        make_licitacao(db_session, uf="BA")
        make_licitacao(db_session, uf="SP")

        resp = client.get("/licitacoes?uf=BA")
        body = resp.json()
        assert body["total"] == 1
        assert body["resultados"][0]["uf"] == "BA"

    def test_filtro_por_uf_case_insensitive(self, client, db_session):
        make_licitacao(db_session, uf="BA")

        resp = client.get("/licitacoes?uf=ba")
        assert resp.json()["total"] == 1

    def test_filtro_por_modalidade(self, client, db_session):
        make_licitacao(db_session, modalidade=6)
        make_licitacao(db_session, modalidade=8)

        resp = client.get("/licitacoes?modalidade=6")
        assert resp.json()["total"] == 1

    def test_filtro_por_data_inicio(self, client, db_session):
        make_licitacao(db_session, data_publicacao_pncp=date(2025, 1, 1))
        make_licitacao(db_session, data_publicacao_pncp=date(2025, 3, 1))

        resp = client.get("/licitacoes?data_inicio=2025-02-01")
        assert resp.json()["total"] == 1

    def test_filtro_por_data_fim(self, client, db_session):
        make_licitacao(db_session, data_publicacao_pncp=date(2025, 1, 1))
        make_licitacao(db_session, data_publicacao_pncp=date(2025, 3, 1))

        resp = client.get("/licitacoes?data_fim=2025-01-31")
        assert resp.json()["total"] == 1

    def test_paginacao(self, client, db_session):
        for _ in range(5):
            make_licitacao(db_session)

        resp = client.get("/licitacoes?pagina=1&tamanho=2")
        body = resp.json()
        assert body["total"] == 5
        assert len(body["resultados"]) == 2
        assert body["pagina"] == 1

    def test_tamanho_maximo_100(self, client):
        resp = client.get("/licitacoes?tamanho=200")
        assert resp.status_code == 422

    def test_pagina_minima_1(self, client):
        resp = client.get("/licitacoes?pagina=0")
        assert resp.status_code == 422

    def test_campos_retornados(self, client, db_session):
        make_licitacao(db_session, valor_total_estimado=99999.99)

        item = client.get("/licitacoes").json()["resultados"][0]
        assert "id_licitacao" in item
        assert "numero_controle_pncp" in item
        assert "objeto_compra" in item
        assert "valor_total_estimado" in item
        assert "uf" in item
        assert "modalidade_nome" in item


@pytest.mark.integration
class TestGetLicitacao:
    def test_retorna_detalhe(self, client, db_session):
        lic = make_licitacao(db_session, objeto_compra="Obra de infraestrutura")

        resp = client.get(f"/licitacoes/{lic.numero_controle_pncp}")
        assert resp.status_code == 200
        body = resp.json()
        assert body["objeto_compra"] == "Obra de infraestrutura"
        assert body["numero_controle_pncp"] == lic.numero_controle_pncp

    def test_retorna_campos_completos(self, client, db_session):
        lic = make_licitacao(db_session)

        body = client.get(f"/licitacoes/{lic.numero_controle_pncp}").json()
        for campo in [
            "id_licitacao",
            "numero_controle_pncp",
            "objeto_compra",
            "valor_total_estimado",
            "uf",
            "municipio",
            "orgao_cnpj",
            "orgao_razao_social",
            "modalidade_nome",
        ]:
            assert campo in body

    def test_nao_encontrado_retorna_404(self, client):
        resp = client.get("/licitacoes/INEXISTENTE-0000-000000")
        assert resp.status_code == 404


@pytest.mark.integration
class TestColetas:
    def test_iniciar_coleta_retorna_202(self, client, mocker):
        mocker.patch("api.routes._executar_coleta")
        resp = client.post(
            "/coletas",
            json={"data_inicio": "2025-01-01", "data_fim": "2025-01-07", "modalidades": [6]},
        )
        assert resp.status_code == 202
        body = resp.json()
        assert body["mensagem"] == "Coleta iniciada em background"
        assert body["modalidades"] == [6]

    def test_executar_coleta_chamada_em_background(self, client, mocker):
        mock = mocker.patch("api.routes._executar_coleta")
        client.post(
            "/coletas",
            json={"data_inicio": "2025-01-01", "data_fim": "2025-01-07", "modalidades": [6], "uf": "BA"},
        )
        mock.assert_called_once()
        args = mock.call_args
        assert args.args[2] == [6]
        assert args.args[3] == "BA"

    def test_data_inicio_apos_data_fim_retorna_422(self, client, mocker):
        mocker.patch("api.routes._executar_coleta")
        resp = client.post(
            "/coletas",
            json={"data_inicio": "2025-01-31", "data_fim": "2025-01-01", "modalidades": [6]},
        )
        assert resp.status_code == 422

    def test_modalidade_invalida_retorna_422(self, client):
        resp = client.post(
            "/coletas",
            json={"data_inicio": "2025-01-01", "data_fim": "2025-01-07", "modalidades": [99]},
        )
        assert resp.status_code == 422

    def test_uf_invalida_retorna_422(self, client):
        resp = client.post(
            "/coletas",
            json={"data_inicio": "2025-01-01", "data_fim": "2025-01-07", "modalidades": [6], "uf": "BAA"},
        )
        assert resp.status_code == 422

    def test_listar_coletas_vazio(self, client):
        resp = client.get("/coletas")
        assert resp.status_code == 200
        assert resp.json() == []

    def test_listar_coletas_com_registros(self, client, db_session):
        make_licitacao(db_session)
        resp = client.get("/coletas")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        assert data[0]["status"] == "concluido"

    def test_detalhe_coleta(self, client, db_session):
        make_licitacao(db_session)
        coleta = db_session.query(Coleta).first()
        resp = client.get(f"/coletas/{coleta.id_coleta}")
        assert resp.status_code == 200
        assert resp.json()["id_coleta"] == str(coleta.id_coleta)

    def test_coleta_nao_encontrada_retorna_404(self, client):
        resp = client.get("/coletas/00000000-0000-0000-0000-000000000000")
        assert resp.status_code == 404
