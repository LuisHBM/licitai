import logging
from datetime import date
from functools import lru_cache
from uuid import UUID

from fastapi import BackgroundTasks, Depends, FastAPI, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from db import Session as DBSession
from db.models import Coleta, Estado, Licitacao, Modalidade, Orgao, Unidade
from api.schemas import (
    ColetaAceita,
    ColetaOut,
    ColetaSolicitacao,
    EstadoOut,
    FacetModalidade,
    FacetSituacao,
    FacetUF,
    FiltrosOut,
    LicitacaoDetalhe,
    LicitacaoResumo,
    ModalidadeOut,
    PaginatedLicitacoes,
)

logger = logging.getLogger(__name__)

app = FastAPI(title="LicitAI", version="0.1.0")


def get_session():
    with DBSession() as session:
        yield session


def _executar_coleta(
    data_inicio: date,
    data_fim: date,
    modalidades: list[int],
    uf: str | None,
) -> None:
    from crawler.etl import crawl

    try:
        with DBSession() as session:
            crawl(
                data_inicio=data_inicio,
                data_fim=data_fim,
                modalidades=modalidades,
                uf=uf,
                session=session,
            )
    except Exception as exc:
        logger.error("Coleta em background falhou: %s", exc)


@app.post("/coletas", status_code=202, response_model=ColetaAceita)
def iniciar_coleta(body: ColetaSolicitacao, background_tasks: BackgroundTasks):
    if body.data_inicio > body.data_fim:
        raise HTTPException(422, detail="data_inicio deve ser <= data_fim")
    background_tasks.add_task(
        _executar_coleta, body.data_inicio, body.data_fim, body.modalidades, body.uf
    )
    return ColetaAceita(
        mensagem="Coleta iniciada em background",
        data_inicio=body.data_inicio,
        data_fim=body.data_fim,
        modalidades=body.modalidades,
        uf=body.uf,
    )


@app.get("/coletas", response_model=list[ColetaOut])
def list_coletas(session: Session = Depends(get_session)):
    return (
        session.query(Coleta)
        .order_by(Coleta.executado_em.desc())
        .limit(50)
        .all()
    )


@app.get("/coletas/{id_coleta}", response_model=ColetaOut)
def get_coleta(id_coleta: UUID, session: Session = Depends(get_session)):
    coleta = session.query(Coleta).filter_by(id_coleta=id_coleta).first()
    if not coleta:
        raise HTTPException(status_code=404, detail="Coleta não encontrada")
    return coleta


@app.get("/modalidades", response_model=list[ModalidadeOut])
def list_modalidades(session: Session = Depends(get_session)):
    return _cached_modalidades(session)


@lru_cache(maxsize=1)
def _cached_modalidades(session):
    return session.query(Modalidade).order_by(Modalidade.id_modalidade).all()


@app.get("/estados", response_model=list[EstadoOut])
def list_estados(session: Session = Depends(get_session)):
    return _cached_estados(session)


@lru_cache(maxsize=1)
def _cached_estados(session):
    contagens = dict(
        session.query(Unidade.uf, func.count(Licitacao.id_licitacao))
        .join(Licitacao, Licitacao.id_unidade == Unidade.id_unidade)
        .group_by(Unidade.uf)
        .all()
    )
    estados = session.query(Estado).order_by(Estado.uf).all()
    return [
        EstadoOut(uf=e.uf, nome=e.nome, total=contagens.get(e.uf, 0)) for e in estados
    ]


def _aplicar_filtros(query, *, q, uf, modalidade, data_inicio, data_fim, situacao_id):
    if q:
        query = query.filter(
            Licitacao.search_vector.op("@@")(func.plainto_tsquery("portuguese", q))
        )
    if uf:
        query = query.filter(Unidade.uf == uf.upper())
    if modalidade:
        query = query.filter(Licitacao.id_modalidade == modalidade)
    if data_inicio:
        query = query.filter(Licitacao.data_publicacao_pncp >= data_inicio)
    if data_fim:
        query = query.filter(Licitacao.data_publicacao_pncp <= data_fim)
    if situacao_id is not None:
        query = query.filter(Licitacao.situacao_id == situacao_id)
    return query


@app.get("/licitacoes/filtros", response_model=FiltrosOut)
def filtros_licitacoes(
    q: str | None = Query(default=None),
    uf: str | None = Query(default=None),
    modalidade: int | None = Query(default=None),
    data_inicio: date | None = Query(default=None),
    data_fim: date | None = Query(default=None),
    situacao_id: int | None = Query(default=None),
    session: Session = Depends(get_session),
):
    kw = dict(q=q, uf=uf, modalidade=modalidade, data_inicio=data_inicio, data_fim=data_fim, situacao_id=situacao_id)

    def _base(cols):
        return (
            session.query(*cols)
            .join(Unidade, Licitacao.id_unidade == Unidade.id_unidade)
            .join(Modalidade, Licitacao.id_modalidade == Modalidade.id_modalidade)
        )

    total = _aplicar_filtros(_base([func.count(Licitacao.id_licitacao)]), **kw).scalar()

    # cada faceta exclui o próprio filtro para mostrar todas as opções disponíveis
    modalidades = (
        _aplicar_filtros(_base([Modalidade.id_modalidade, Modalidade.nome, func.count(Licitacao.id_licitacao).label("total")]), **{**kw, "modalidade": None})
        .group_by(Modalidade.id_modalidade, Modalidade.nome)
        .having(func.count(Licitacao.id_licitacao) > 0)
        .order_by(func.count(Licitacao.id_licitacao).desc())
        .all()
    )

    ufs = (
        _aplicar_filtros(
            session.query(Unidade.uf, Estado.nome, func.count(Licitacao.id_licitacao).label("total"))
            .join(Licitacao, Licitacao.id_unidade == Unidade.id_unidade)
            .join(Modalidade, Licitacao.id_modalidade == Modalidade.id_modalidade)
            .join(Estado, Estado.uf == Unidade.uf),
            **{**kw, "uf": None},
        )
        .group_by(Unidade.uf, Estado.nome)
        .having(func.count(Licitacao.id_licitacao) > 0)
        .order_by(func.count(Licitacao.id_licitacao).desc())
        .all()
    )

    situacoes = (
        _aplicar_filtros(_base([Licitacao.situacao_id, func.count(Licitacao.id_licitacao).label("total")]), **{**kw, "situacao_id": None})
        .filter(Licitacao.situacao_id.isnot(None))
        .group_by(Licitacao.situacao_id)
        .order_by(Licitacao.situacao_id)
        .all()
    )

    return FiltrosOut(
        total=total,
        modalidades=[FacetModalidade(id_modalidade=r.id_modalidade, nome=r.nome, total=r.total) for r in modalidades],
        ufs=[FacetUF(uf=r.uf, nome=r.nome, total=r.total) for r in ufs],
        situacoes=[FacetSituacao(situacao_id=r.situacao_id, total=r.total) for r in situacoes],
    )


@app.get("/licitacoes", response_model=PaginatedLicitacoes)
def search_licitacoes(
    q: str | None = Query(default=None, description="Busca no objeto da compra"),
    uf: str | None = Query(default=None, description="Sigla do estado (ex: BA, SP)"),
    modalidade: int | None = Query(default=None, description="Código da modalidade"),
    data_inicio: date | None = Query(default=None),
    data_fim: date | None = Query(default=None),
    situacao_id: int | None = Query(default=None),
    pagina: int = Query(default=1, ge=1),
    tamanho: int = Query(default=20, ge=1, le=100),
    session: Session = Depends(get_session),
):
    query = _aplicar_filtros(
        session.query(
            Licitacao,
            Unidade.uf,
            Unidade.municipio,
            Orgao.cnpj.label("orgao_cnpj"),
            Orgao.razao_social.label("orgao_razao_social"),
            Modalidade.nome.label("modalidade_nome"),
        )
        .join(Unidade, Licitacao.id_unidade == Unidade.id_unidade)
        .join(Orgao, Unidade.id_orgao == Orgao.id_orgao)
        .join(Modalidade, Licitacao.id_modalidade == Modalidade.id_modalidade),
        q=q, uf=uf, modalidade=modalidade, data_inicio=data_inicio, data_fim=data_fim, situacao_id=situacao_id,
    )

    total = query.count()
    rows = (
        query.order_by(Licitacao.data_publicacao_pncp.desc())
        .offset((pagina - 1) * tamanho)
        .limit(tamanho)
        .all()
    )

    resultados = [
        LicitacaoResumo(
            id_licitacao=lic.id_licitacao,
            numero_controle_pncp=lic.numero_controle_pncp,
            objeto_compra=lic.objeto_compra,
            valor_total_estimado=lic.valor_total_estimado,
            data_publicacao_pncp=lic.data_publicacao_pncp,
            situacao_id=lic.situacao_id,
            uf=uf,
            modalidade_nome=modalidade_nome,
        )
        for lic, uf, _municipio, _cnpj, _razao, modalidade_nome in rows
    ]

    return PaginatedLicitacoes(
        total=total, pagina=pagina, tamanho=tamanho, resultados=resultados
    )


@app.get("/licitacoes/{numero_controle_pncp}", response_model=LicitacaoDetalhe)
def get_licitacao(
    numero_controle_pncp: str,
    session: Session = Depends(get_session),
):
    row = (
        session.query(
            Licitacao,
            Unidade.uf,
            Unidade.municipio,
            Orgao.cnpj.label("orgao_cnpj"),
            Orgao.razao_social.label("orgao_razao_social"),
            Modalidade.nome.label("modalidade_nome"),
        )
        .join(Unidade, Licitacao.id_unidade == Unidade.id_unidade)
        .join(Orgao, Unidade.id_orgao == Orgao.id_orgao)
        .join(Modalidade, Licitacao.id_modalidade == Modalidade.id_modalidade)
        .filter(Licitacao.numero_controle_pncp == numero_controle_pncp)
        .first()
    )

    if not row:
        raise HTTPException(status_code=404, detail="Licitação não encontrada")

    lic, uf, municipio, orgao_cnpj, orgao_razao_social, modalidade_nome = row
    return LicitacaoDetalhe(
        id_licitacao=lic.id_licitacao,
        numero_controle_pncp=lic.numero_controle_pncp,
        numero_compra=lic.numero_compra,
        ano_compra=lic.ano_compra,
        objeto_compra=lic.objeto_compra,
        valor_total_estimado=lic.valor_total_estimado,
        valor_total_homologado=lic.valor_total_homologado,
        situacao_id=lic.situacao_id,
        srp=lic.srp,
        data_publicacao_pncp=lic.data_publicacao_pncp,
        data_abertura_proposta=lic.data_abertura_proposta,
        data_encerramento_proposta=lic.data_encerramento_proposta,
        uf=uf,
        municipio=municipio,
        orgao_cnpj=orgao_cnpj,
        orgao_razao_social=orgao_razao_social,
        modalidade_nome=modalidade_nome,
    )
