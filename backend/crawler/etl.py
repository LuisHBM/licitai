import logging
import time
import uuid
from datetime import date, datetime
from decimal import Decimal, InvalidOperation

from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session

from crawler import client as pncp_client
from db.models import Coleta, Licitacao, Orgao, Unidade

logger = logging.getLogger(__name__)

PAGE_DELAY = 1.0


def _parse_date(value) -> date | None:
    if not value:
        return None
    try:
        return date.fromisoformat(str(value)[:10])
    except ValueError:
        return None


def _parse_dt(value) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(str(value)[:19])
    except ValueError:
        return None


def _parse_decimal(value) -> Decimal | None:
    if value is None:
        return None
    try:
        return Decimal(str(value))
    except InvalidOperation:
        return None


def _get_or_create_orgao(session: Session, orgao_data: dict, cache: dict) -> uuid.UUID:
    cnpj = orgao_data.get("cnpj", "").replace(".", "").replace("/", "").replace("-", "")
    if not cnpj:
        raise ValueError("Órgão sem CNPJ")

    if cnpj in cache:
        return cache[cnpj]

    orgao = session.query(Orgao).filter_by(cnpj=cnpj).first()
    if not orgao:
        orgao = Orgao(
            cnpj=cnpj,
            razao_social=orgao_data.get("razaoSocial"),
            esfera=orgao_data.get("esferaId"),
            poder=orgao_data.get("poderId"),
        )
        session.add(orgao)
        session.flush()
    else:
        orgao.razao_social = orgao_data.get("razaoSocial") or orgao.razao_social
        orgao.esfera = orgao_data.get("esferaId") or orgao.esfera
        orgao.poder = orgao_data.get("poderId") or orgao.poder

    cache[cnpj] = orgao.id_orgao
    return orgao.id_orgao


def _get_or_create_unidade(
    session: Session,
    unidade_data: dict,
    id_orgao: uuid.UUID,
    cache: dict,
) -> uuid.UUID:
    codigo = unidade_data.get("codigoUnidade", "")
    key = (id_orgao, codigo)

    if key in cache:
        return cache[key]

    unidade = (
        session.query(Unidade)
        .filter_by(id_orgao=id_orgao, codigo_unidade=codigo)
        .first()
    )
    if not unidade:
        unidade = Unidade(
            id_orgao=id_orgao,
            codigo_unidade=codigo,
            nome_unidade=unidade_data.get("nomeUnidade"),
            municipio=unidade_data.get("municipioNome"),
            codigo_ibge=unidade_data.get("codigoIbge"),
            uf=unidade_data.get("ufSigla"),
        )
        session.add(unidade)
        session.flush()
    else:
        unidade.nome_unidade = unidade_data.get("nomeUnidade") or unidade.nome_unidade
        unidade.municipio = unidade_data.get("municipioNome") or unidade.municipio
        unidade.codigo_ibge = unidade_data.get("codigoIbge") or unidade.codigo_ibge
        unidade.uf = unidade_data.get("ufSigla") or unidade.uf

    cache[key] = unidade.id_unidade
    return unidade.id_unidade


def _upsert_licitacao(
    session: Session,
    rec: dict,
    id_coleta: uuid.UUID,
    id_unidade: uuid.UUID,
    id_modalidade: int,
) -> uuid.UUID:
    numero_controle = rec.get("numeroControlePNCP", "")

    ano = rec.get("anoCompra") or 0
    sequencial = str(rec.get("sequencialCompra") or "")

    values = {
        "id_coleta": id_coleta,
        "id_unidade": id_unidade,
        "id_modalidade": id_modalidade,
        "numero_controle_pncp": numero_controle,
        "numero_compra": rec.get("numeroCompra"),
        "ano_compra": ano or None,
        "sequencial_compra": sequencial or None,
        "objeto_compra": rec.get("objetoCompra"),
        "valor_total_estimado": _parse_decimal(rec.get("valorTotalEstimado")),
        "valor_total_homologado": _parse_decimal(rec.get("valorTotalHomologado")),
        "situacao_id": rec.get("situacaoCompraId"),
        "srp": rec.get("srp"),
        "data_publicacao_pncp": _parse_date(rec.get("dataPublicacaoPncp")),
        "data_abertura_proposta": _parse_dt(rec.get("dataAberturaProposta")),
        "data_encerramento_proposta": _parse_dt(rec.get("dataEncerramentoProposta")),
        "data_inclusao": _parse_dt(rec.get("dataInclusao")),
        "data_atualizacao": _parse_dt(rec.get("dataAtualizacao")),
    }

    existing = (
        session.query(Licitacao.id_licitacao)
        .filter_by(numero_controle_pncp=numero_controle)
        .first()
    )
    id_licitacao = existing[0] if existing else uuid.uuid4()
    values["id_licitacao"] = id_licitacao

    stmt = pg_insert(Licitacao.__table__).values(**values)
    update_cols = {k: stmt.excluded[k] for k in values if k != "id_licitacao"}
    stmt = stmt.on_conflict_do_update(
        index_elements=["numero_controle_pncp"],
        set_=update_cols,
    )
    session.execute(stmt)

    return id_licitacao


def crawl(
    data_inicio: date,
    data_fim: date,
    modalidades: list[int],
    uf: str | None,
    session: Session,
) -> None:
    data_ini_str = data_inicio.strftime("%Y%m%d")
    data_fim_str = data_fim.strftime("%Y%m%d")

    orgao_cache: dict = {}
    unidade_cache: dict = {}

    for modalidade in modalidades:
        logger.info(
            "Coletando modalidade %d (%s → %s)...",
            modalidade,
            data_ini_str,
            data_fim_str,
        )

        coleta = Coleta(
            status="em_andamento",
            modalidade_filtro=modalidade,
            uf_filtro=uf,
            data_inicio_coleta=data_inicio,
            data_fim_coleta=data_fim,
            total_registros=0,
        )
        session.add(coleta)
        session.flush()
        id_coleta = coleta.id_coleta

        total_saved = 0
        try:
            first_page = pncp_client.fetch_contratacoes_page(
                data_ini_str, data_fim_str, modalidade, pagina=1, uf=uf
            )
            total_pages = first_page.get("totalPaginas") or 0
            total_registros = first_page.get("totalRegistros") or 0
            logger.info("  %d registros em %d páginas", total_registros, total_pages)

            for page_num in range(1, total_pages + 1):
                if page_num == 1:
                    page_data = first_page
                else:
                    time.sleep(PAGE_DELAY)
                    page_data = pncp_client.fetch_contratacoes_page(
                        data_ini_str, data_fim_str, modalidade, pagina=page_num, uf=uf
                    )

                registros = page_data.get("data") or []
                logger.info(
                    "  Página %d/%d — %d registros",
                    page_num,
                    total_pages,
                    len(registros),
                )

                for rec in registros:
                    orgao_data = rec.get("orgaoEntidade") or {}
                    unidade_data = rec.get("unidadeOrgao") or {}

                    try:
                        id_orgao = _get_or_create_orgao(
                            session, orgao_data, orgao_cache
                        )
                        id_unidade = _get_or_create_unidade(
                            session, unidade_data, id_orgao, unidade_cache
                        )
                        id_modalidade = (
                            rec.get("codigoModalidadeContratacao") or modalidade
                        )
                        _upsert_licitacao(
                            session, rec, id_coleta, id_unidade, id_modalidade
                        )
                        total_saved += 1
                    except Exception as exc:
                        logger.error(
                            "Erro ao salvar licitação %s: %s",
                            rec.get("numeroControlePNCP"),
                            exc,
                        )
                        session.rollback()
                        session.add(coleta)

                session.commit()

            coleta.status = "concluido"
            coleta.total_registros = total_saved
            session.commit()
            logger.info(
                "  Modalidade %d concluída: %d registros salvos.",
                modalidade,
                total_saved,
            )

        except Exception as exc:
            logger.error("Falha na modalidade %d: %s", modalidade, exc)
            coleta.status = "erro"
            coleta.total_registros = total_saved
            session.commit()
            raise
