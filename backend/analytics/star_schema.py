"""Camada analítica / OLAP — star schema das licitações.

Este módulo é a "Camada de Orquestração" da etapa analítica (Sprint V): faz o
ETL das tabelas operacionais (licitacao, unidade, orgao, modalidade) para um
modelo dimensional (esquema estrela) e expõe consultas agregadas + exportação
em CSV para consumo no Power BI.

Modelo estrela:

                       dim_tempo
                           |
    dim_orgao  ----  fato_licitacao  ----  dim_modalidade
                           |
                        dim_uf

O fato tem grão de uma linha por licitação, com métricas aditivas
(valor_estimado, valor_homologado, economia, qtd_itens) que podem ser somadas
ao longo de qualquer combinação de dimensões.
"""
from __future__ import annotations

import csv
import io
from dataclasses import dataclass
from typing import Iterator

from sqlalchemy import text
from sqlalchemy.orm import Session

# ── mapeamento de região por UF (atributo da dim_uf) ────────────────────────
_REGIAO = {
    "AC": "Norte", "AP": "Norte", "AM": "Norte", "PA": "Norte", "RO": "Norte",
    "RR": "Norte", "TO": "Norte",
    "AL": "Nordeste", "BA": "Nordeste", "CE": "Nordeste", "MA": "Nordeste",
    "PB": "Nordeste", "PE": "Nordeste", "PI": "Nordeste", "RN": "Nordeste",
    "SE": "Nordeste",
    "DF": "Centro-Oeste", "GO": "Centro-Oeste", "MT": "Centro-Oeste",
    "MS": "Centro-Oeste",
    "ES": "Sudeste", "MG": "Sudeste", "RJ": "Sudeste", "SP": "Sudeste",
    "PR": "Sul", "RS": "Sul", "SC": "Sul",
}


# ─────────────────────────────────────────────────────────────────────────────
# ETL — reconstrução completa (full refresh) do modelo dimensional
# ─────────────────────────────────────────────────────────────────────────────
def rebuild_star_schema(session: Session) -> dict[str, int]:
    """Reconstrói todas as dimensões e o fato a partir das tabelas operacionais.

    Estratégia full-refresh: limpa o star schema e repopula. Simples, idempotente
    e adequado ao volume de um projeto acadêmico. Retorna a contagem de linhas
    inseridas por tabela.
    """
    # Ordem segura para FKs: limpa o fato e as dimensões de uma vez.
    session.execute(text(
        "TRUNCATE TABLE fato_licitacao, dim_tempo, dim_orgao, "
        "dim_modalidade, dim_uf RESTART IDENTITY CASCADE"
    ))

    _carregar_dim_tempo(session)
    _carregar_dim_modalidade(session)
    _carregar_dim_uf(session)
    _carregar_dim_orgao(session)
    _carregar_fato(session)

    session.commit()

    contagens = {}
    for tabela in ("dim_tempo", "dim_modalidade", "dim_uf", "dim_orgao", "fato_licitacao"):
        contagens[tabela] = session.execute(
            text(f"SELECT count(*) FROM {tabela}")
        ).scalar_one()
    return contagens


def _carregar_dim_tempo(session: Session) -> None:
    # Uma linha por data de publicação distinta. quadrienal = janela CAPES de
    # 4 anos alinhada a 2021 (..., 2017-2020, 2021-2024, 2025-2028, ...).
    session.execute(text("""
        INSERT INTO dim_tempo
            (id_tempo, data, ano, trimestre, mes, nome_mes, mes_abrev, ano_mes, quadrienal)
        SELECT
            to_char(d, 'YYYYMMDD')::int                          AS id_tempo,
            d                                                    AS data,
            extract(year  FROM d)::int                           AS ano,
            extract(quarter FROM d)::int                         AS trimestre,
            extract(month FROM d)::int                           AS mes,
            (ARRAY['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho',
                   'Agosto','Setembro','Outubro','Novembro','Dezembro']
             )[extract(month FROM d)::int]                        AS nome_mes,
            (ARRAY['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
             )[extract(month FROM d)::int]                        AS mes_abrev,
            to_char(d, 'YYYY-MM')                                 AS ano_mes,
            (g.qstart::text || '-' || (g.qstart + 3)::text)       AS quadrienal
        FROM (
            SELECT DISTINCT data_publicacao_pncp AS d
            FROM licitacao
            WHERE data_publicacao_pncp IS NOT NULL
        ) src
        CROSS JOIN LATERAL (
            SELECT (floor((extract(year FROM src.d) - 1) / 4.0) * 4 + 1)::int AS qstart
        ) g
    """))


def _carregar_dim_modalidade(session: Session) -> None:
    session.execute(text("""
        INSERT INTO dim_modalidade (id_dim_modalidade, nome)
        SELECT id_modalidade, nome FROM modalidade
    """))


def _carregar_dim_uf(session: Session) -> None:
    estados = session.execute(text("SELECT uf, nome FROM estado")).all()
    if not estados:
        return
    session.execute(
        text("INSERT INTO dim_uf (uf, nome, regiao) VALUES (:uf, :nome, :regiao)"),
        [
            {"uf": uf, "nome": nome, "regiao": _REGIAO.get(uf, "Não classificada")}
            for uf, nome in estados
        ],
    )


def _carregar_dim_orgao(session: Session) -> None:
    # Achata órgão + unidade. id_dim_orgao = id_unidade (grão da licitação).
    session.execute(text("""
        INSERT INTO dim_orgao
            (id_dim_orgao, cnpj, razao_social, esfera, poder,
             nome_unidade, municipio, codigo_ibge, uf)
        SELECT
            u.id_unidade, o.cnpj, o.razao_social, o.esfera, o.poder,
            u.nome_unidade, u.municipio, u.codigo_ibge, u.uf
        FROM unidade u
        JOIN orgao o ON o.id_orgao = u.id_orgao
    """))


def _carregar_fato(session: Session) -> None:
    session.execute(text("""
        INSERT INTO fato_licitacao
            (id_fato, id_tempo, id_dim_orgao, id_dim_modalidade, uf,
             numero_controle_pncp, situacao_id, situacao_nome, modo_disputa_nome,
             srp, ano_compra, valor_estimado, valor_homologado, economia, qtd_itens)
        SELECT
            l.id_licitacao,
            CASE WHEN l.data_publicacao_pncp IS NOT NULL
                 THEN to_char(l.data_publicacao_pncp, 'YYYYMMDD')::int END,
            l.id_unidade,
            l.id_modalidade,
            u.uf,
            l.numero_controle_pncp,
            l.situacao_id,
            l.situacao_nome,
            l.modo_disputa_nome,
            l.srp,
            l.ano_compra,
            l.valor_total_estimado,
            l.valor_total_homologado,
            CASE WHEN l.valor_total_homologado IS NOT NULL
                 THEN l.valor_total_estimado - l.valor_total_homologado END,
            (SELECT count(*) FROM item_licitacao i WHERE i.id_licitacao = l.id_licitacao)
        FROM licitacao l
        JOIN unidade u ON u.id_unidade = l.id_unidade
    """))


# ─────────────────────────────────────────────────────────────────────────────
# Consultas agregadas (OLAP) — alimentam o painel analítico do front-end
# ─────────────────────────────────────────────────────────────────────────────
# Bloco FROM padrão: todo fato já vem ligado às quatro dimensões, então qualquer
# slicer (período, modalidade, uf, região, esfera) é só mais uma condição WHERE.
# É exatamente o "slice & dice" do modelo estrela — o JOIN foi pago no ETL.
_FROM = """
    FROM fato_licitacao f
    LEFT JOIN dim_tempo      t ON t.id_tempo = f.id_tempo
    LEFT JOIN dim_orgao      o ON o.id_dim_orgao = f.id_dim_orgao
    LEFT JOIN dim_uf        du ON du.uf = f.uf
    LEFT JOIN dim_modalidade m ON m.id_dim_modalidade = f.id_dim_modalidade
"""


@dataclass
class Filtros:
    """Slicers aplicáveis a qualquer consulta do painel. Todos opcionais."""
    dias: int | None = None
    modalidade: int | None = None
    uf: str | None = None
    regiao: str | None = None
    esfera: str | None = None


def _where(f: Filtros) -> tuple[str, dict]:
    """Monta a cláusula WHERE a partir dos slicers preenchidos."""
    cond: list[str] = []
    params: dict = {}
    if f.dias:
        cond.append("t.data >= CURRENT_DATE - make_interval(days => :dias)")
        params["dias"] = f.dias
    if f.modalidade:
        cond.append("f.id_dim_modalidade = :modalidade")
        params["modalidade"] = f.modalidade
    if f.uf:
        cond.append("f.uf = :uf")
        params["uf"] = f.uf.upper()
    if f.regiao:
        cond.append("du.regiao = :regiao")
        params["regiao"] = f.regiao
    if f.esfera:
        cond.append("o.esfera = :esfera")
        params["esfera"] = f.esfera
    where = ("WHERE " + " AND ".join(cond)) if cond else ""
    return where, params


def painel_resumo(session: Session, filtros: Filtros | None = None) -> dict:
    where, params = _where(filtros or Filtros())
    row = session.execute(text(f"""
        SELECT
            count(*)                                              AS total,
            coalesce(sum(f.valor_estimado), 0)                    AS valor_total,
            coalesce(avg(f.valor_estimado), 0)                    AS valor_medio,
            coalesce(sum(f.economia), 0)                          AS economia_total,
            count(*) FILTER (WHERE f.situacao_id = 1)             AS abertas
        {_FROM}
        {where}
    """), params).one()
    return {
        "total": int(row.total),
        "valor_total_estimado": float(row.valor_total),
        "valor_medio": float(row.valor_medio),
        "economia_total": float(row.economia_total),
        "abertas": int(row.abertas),
    }


def painel_por_modalidade(session: Session, filtros: Filtros | None = None) -> list[dict]:
    where, params = _where(filtros or Filtros())
    rows = session.execute(text(f"""
        SELECT m.nome AS name, count(*) AS value
        {_FROM}
        {where}
        GROUP BY m.nome
        HAVING m.nome IS NOT NULL
        ORDER BY value DESC
    """), params).all()
    return [{"name": r.name, "value": int(r.value)} for r in rows]


def painel_economia_por_modalidade(session: Session, filtros: Filtros | None = None) -> list[dict]:
    """Economia (estimado − homologado) somada por modalidade. Só licitações
    homologadas têm economia; as demais são ignoradas pelo sum()."""
    where, params = _where(filtros or Filtros())
    rows = session.execute(text(f"""
        SELECT m.nome AS name, coalesce(sum(f.economia), 0) AS value
        {_FROM}
        {where}
        GROUP BY m.nome
        HAVING m.nome IS NOT NULL AND coalesce(sum(f.economia), 0) <> 0
        ORDER BY value DESC
    """), params).all()
    return [{"name": r.name, "value": float(r.value)} for r in rows]


def painel_por_mes(session: Session, filtros: Filtros | None = None) -> list[dict]:
    where, params = _where(filtros or Filtros())
    rows = session.execute(text(f"""
        SELECT t.ano_mes, min(t.mes_abrev) AS mes, count(*) AS total
        {_FROM}
        {where}
        GROUP BY t.ano_mes
        HAVING t.ano_mes IS NOT NULL
        ORDER BY t.ano_mes
    """), params).all()
    return [{"mes": r.mes, "ano_mes": r.ano_mes, "total": int(r.total)} for r in rows]


def painel_top_orgaos(session: Session, filtros: Filtros | None = None, limite: int = 10) -> list[dict]:
    where, params = _where(filtros or Filtros())
    params = {**params, "limite": limite}
    rows = session.execute(text(f"""
        SELECT o.razao_social AS name, count(*) AS value
        {_FROM}
        {where}
        GROUP BY o.razao_social
        ORDER BY value DESC
        LIMIT :limite
    """), params).all()
    return [{"name": r.name or "Não informado", "value": int(r.value)} for r in rows]


def painel_por_uf(session: Session, filtros: Filtros | None = None) -> list[dict]:
    """Contagem por UF dividida por esfera (federal/estadual/municipal)."""
    where, params = _where(filtros or Filtros())
    rows = session.execute(text(f"""
        SELECT
            f.uf AS name,
            count(*) FILTER (WHERE o.esfera = 'F') AS federal,
            count(*) FILTER (WHERE o.esfera = 'E') AS estadual,
            count(*) FILTER (WHERE o.esfera = 'M') AS municipal,
            count(*) FILTER (WHERE o.esfera IS NULL OR o.esfera NOT IN ('F','E','M')) AS outros,
            count(*) AS total
        {_FROM}
        {where}
        GROUP BY f.uf
        ORDER BY total DESC
    """), params).all()
    return [
        {
            "name": r.name,
            "federal": int(r.federal),
            "estadual": int(r.estadual),
            "municipal": int(r.municipal),
            "outros": int(r.outros),
        }
        for r in rows
    ]


# Quantas modalidades viram série própria no gráfico cruzado; o resto agrega
# em "Outras" para o empilhamento não virar sopa de letrinhas.
_TOP_MODALIDADES_CRUZADO = 4


def painel_cruzado_regiao_modalidade(session: Session, filtros: Filtros | None = None) -> dict:
    """Cruza duas dimensões: volume por região (eixo) × modalidade (séries).

    Demonstra o poder do star schema — uma única agregação cortada por dois
    eixos. Retorna as séries (top modalidades + "Outras") e uma linha por região
    com a contagem de cada série, pronta para um bar chart empilhado.
    """
    where, params = _where(filtros or Filtros())

    # 1) Top modalidades no recorte atual viram séries nomeadas.
    top = session.execute(text(f"""
        SELECT m.nome AS nome, count(*) AS total
        {_FROM}
        {where}
        GROUP BY m.nome
        HAVING m.nome IS NOT NULL
        ORDER BY total DESC
        LIMIT :top
    """), {**params, "top": _TOP_MODALIDADES_CRUZADO}).all()
    series = [r.nome for r in top]
    if not series:
        return {"series": [], "dados": []}

    # 2) Conta por região, dobrando o que não está no top em "Outras".
    rows = session.execute(text(f"""
        SELECT
            coalesce(du.regiao, 'Não classificada') AS regiao,
            CASE WHEN m.nome = ANY(:series) THEN m.nome ELSE 'Outras' END AS modalidade,
            count(*) AS total
        {_FROM}
        {where}
        GROUP BY 1, 2
    """), {**params, "series": series}).all()

    tem_outras = any(r.modalidade == "Outras" for r in rows)
    colunas = series + (["Outras"] if tem_outras else [])

    por_regiao: dict[str, dict] = {}
    for r in rows:
        linha = por_regiao.setdefault(r.regiao, {"regiao": r.regiao, **{c: 0 for c in colunas}})
        linha[r.modalidade] = int(r.total)

    dados = sorted(por_regiao.values(), key=lambda d: sum(d[c] for c in colunas), reverse=True)
    return {"series": colunas, "dados": dados}


# ─────────────────────────────────────────────────────────────────────────────
# Exportação CSV — arquivos consumidos pela ferramenta OLAP (Power BI)
# ─────────────────────────────────────────────────────────────────────────────
# Whitelist de consultas exportáveis: nada de nome de tabela vindo do usuário
# direto no SQL.
CSV_TABELAS: dict[str, str] = {
    "dim_tempo": """
        SELECT id_tempo, data, ano, trimestre, mes, nome_mes, mes_abrev,
               ano_mes, quadrienal
        FROM dim_tempo ORDER BY id_tempo
    """,
    "dim_modalidade": """
        SELECT id_dim_modalidade, nome FROM dim_modalidade ORDER BY id_dim_modalidade
    """,
    "dim_uf": """
        SELECT uf, nome, regiao FROM dim_uf ORDER BY uf
    """,
    "dim_orgao": """
        SELECT id_dim_orgao, cnpj, razao_social, esfera, poder,
               nome_unidade, municipio, codigo_ibge, uf
        FROM dim_orgao ORDER BY razao_social
    """,
    "fato_licitacao": """
        SELECT id_fato, id_tempo, id_dim_orgao, id_dim_modalidade, uf,
               numero_controle_pncp, situacao_id, situacao_nome, modo_disputa_nome,
               srp, ano_compra, valor_estimado, valor_homologado, economia, qtd_itens
        FROM fato_licitacao
    """,
}


def gerar_csv(session: Session, tabela: str) -> Iterator[str]:
    """Gera o CSV de uma tabela do star schema, linha a linha (streaming)."""
    if tabela not in CSV_TABELAS:
        raise KeyError(tabela)

    result = session.execute(text(CSV_TABELAS[tabela]))
    colunas = list(result.keys())

    buffer = io.StringIO()
    writer = csv.writer(buffer)

    writer.writerow(colunas)
    yield buffer.getvalue()
    buffer.seek(0)
    buffer.truncate(0)

    for row in result:
        writer.writerow(["" if v is None else v for v in row])
        yield buffer.getvalue()
        buffer.seek(0)
        buffer.truncate(0)
