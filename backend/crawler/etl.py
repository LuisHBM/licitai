import logging
import time
import uuid
from datetime import timedelta

from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session

from crawler import client as pncp_client
from crawler.schemas import Contratacao, OrgaoEntidade, UnidadeOrgao
from db.models import Coleta, Licitacao, Orgao, Unidade

logger = logging.getLogger(__name__)

PAGE_DELAY = 1.0


def _get_or_create_orgao(session: Session, orgao: OrgaoEntidade, cache: dict) -> uuid.UUID:
    if not orgao.cnpj:
        raise ValueError("Órgão sem CNPJ")

    if orgao.cnpj in cache:
        return cache[orgao.cnpj]

    obj = session.query(Orgao).filter_by(cnpj=orgao.cnpj).first()
    if not obj:
        obj = Orgao(cnpj=orgao.cnpj, razao_social=orgao.razaoSocial, esfera=orgao.esferaId, poder=orgao.poderId)
        session.add(obj)
        session.flush()
    else:
        obj.razao_social = orgao.razaoSocial or obj.razao_social
        obj.esfera = orgao.esferaId or obj.esfera
        obj.poder = orgao.poderId or obj.poder

    cache[orgao.cnpj] = obj.id_orgao
    return obj.id_orgao


def _get_or_create_unidade(
    session: Session, unidade: UnidadeOrgao, id_orgao: uuid.UUID, cache: dict
) -> uuid.UUID:
    key = (id_orgao, unidade.codigoUnidade)
    if key in cache:
        return cache[key]

    obj = session.query(Unidade).filter_by(id_orgao=id_orgao, codigo_unidade=unidade.codigoUnidade).first()
    if not obj:
        obj = Unidade(
            id_orgao=id_orgao,
            codigo_unidade=unidade.codigoUnidade,
            nome_unidade=unidade.nomeUnidade,
            municipio=unidade.municipioNome,
            codigo_ibge=unidade.codigoIbge,
            uf=unidade.ufSigla,
        )
        session.add(obj)
        session.flush()
    else:
        obj.nome_unidade = unidade.nomeUnidade or obj.nome_unidade
        obj.municipio = unidade.municipioNome or obj.municipio
        obj.codigo_ibge = unidade.codigoIbge or obj.codigo_ibge
        obj.uf = unidade.ufSigla or obj.uf

    cache[key] = obj.id_unidade
    return obj.id_unidade


def _upsert_licitacao(
    session: Session, rec: Contratacao, id_coleta: uuid.UUID, id_unidade: uuid.UUID
) -> uuid.UUID:
    existing = session.query(Licitacao.id_licitacao).filter_by(numero_controle_pncp=rec.numeroControlePNCP).first()
    id_licitacao = existing[0] if existing else uuid.uuid4()

    values = {
        "id_licitacao": id_licitacao,
        "id_coleta": id_coleta,
        "id_unidade": id_unidade,
        "id_modalidade": rec.modalidadeId,
        "numero_controle_pncp": rec.numeroControlePNCP,
        "numero_compra": rec.numeroCompra,
        "ano_compra": rec.anoCompra,
        "sequencial_compra": rec.sequencialCompra,
        "objeto_compra": rec.objetoCompra,
        "valor_total_estimado": rec.valorTotalEstimado,
        "valor_total_homologado": rec.valorTotalHomologado,
        "situacao_id": rec.situacaoCompraId,
        "srp": rec.srp,
        "data_publicacao_pncp": rec.dataPublicacaoPncp,
        "data_abertura_proposta": rec.dataAberturaProposta,
        "data_encerramento_proposta": rec.dataEncerramentoProposta,
        "data_inclusao": rec.dataInclusao,
        "data_atualizacao": rec.dataAtualizacao,
    }

    stmt = pg_insert(Licitacao.__table__).values(**values)
    stmt = stmt.on_conflict_do_update(
        index_elements=["numero_controle_pncp"],
        set_={k: stmt.excluded[k] for k in values if k != "id_licitacao"},
    )
    session.execute(stmt)
    return id_licitacao


def _dias(data_inicio, data_fim):
    dia = data_inicio
    while dia <= data_fim:
        yield dia
        dia += timedelta(days=1)


def crawl(
    data_inicio, data_fim, modalidades: list[int], uf: str | None, session: Session
) -> None:
    orgao_cache: dict = {}
    unidade_cache: dict = {}

    for modalidade in modalidades:
        logger.info("Coletando modalidade %d (%s → %s)...", modalidade, data_inicio, data_fim)

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

        total_saved = 0

        for dia in _dias(data_inicio, data_fim):
            dia_str = dia.strftime("%Y%m%d")

            try:
                first_page = pncp_client.fetch_contratacoes_page(dia_str, dia_str, modalidade, pagina=1, uf=uf)
            except Exception as exc:
                logger.error("  Dia %s falhou: %s. Pulando para o próximo...", dia_str, exc)
                continue

            logger.info("  Dia %s — %d registros em %d páginas", dia_str, first_page.totalRegistros, first_page.totalPaginas)

            for page_num in range(1, first_page.totalPaginas + 1):
                try:
                    if page_num == 1:
                        page = first_page
                    else:
                        time.sleep(PAGE_DELAY)
                        page = pncp_client.fetch_contratacoes_page(dia_str, dia_str, modalidade, pagina=page_num, uf=uf)
                except Exception as exc:
                    logger.error("  Dia %s página %d/%d falhou: %s. Continuando...", dia_str, page_num, first_page.totalPaginas, exc)
                    continue

                for rec in page.data:
                    if rec.modalidadeId is None:
                        logger.debug("Registro %s sem modalidade, pulando.", rec.numeroControlePNCP)
                        continue
                    try:
                        id_orgao = _get_or_create_orgao(session, rec.orgaoEntidade, orgao_cache)
                        id_unidade = _get_or_create_unidade(session, rec.unidadeOrgao, id_orgao, unidade_cache)
                        _upsert_licitacao(session, rec, coleta.id_coleta, id_unidade)
                        total_saved += 1
                    except Exception as exc:
                        logger.error("Erro ao salvar licitação %s: %s", rec.numeroControlePNCP, exc)
                        session.rollback()
                        session.add(coleta)

                session.commit()

        coleta.status = "concluido"
        coleta.total_registros = total_saved
        session.commit()
        logger.info("  Modalidade %d concluída: %d registros salvos.", modalidade, total_saved)
