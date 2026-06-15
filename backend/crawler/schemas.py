from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal, InvalidOperation
from typing import Annotated

from pydantic import BaseModel, BeforeValidator, ConfigDict


def _to_date(v: object) -> date | None:
    if not v:
        return None
    try:
        return date.fromisoformat(str(v)[:10])
    except ValueError:
        return None


def _to_datetime(v: object) -> datetime | None:
    if not v:
        return None
    try:
        return datetime.fromisoformat(str(v)[:19])
    except ValueError:
        return None


def _to_decimal(v: object) -> Decimal | None:
    if v is None:
        return None
    try:
        return Decimal(str(v))
    except InvalidOperation:
        return None


def _to_str(v: object) -> str | None:
    if v is None:
        return None
    return str(v)


def _normalize_cnpj(v: object) -> str:
    return str(v).replace(".", "").replace("/", "").replace("-", "")


PNCPDate = Annotated[date | None, BeforeValidator(_to_date)]
PNCPDatetime = Annotated[datetime | None, BeforeValidator(_to_datetime)]
PNCPDecimal = Annotated[Decimal | None, BeforeValidator(_to_decimal)]
PNCPStr = Annotated[str | None, BeforeValidator(_to_str)]


class OrgaoEntidade(BaseModel):
    model_config = ConfigDict(extra="ignore")

    cnpj: Annotated[str, BeforeValidator(_normalize_cnpj)]
    razaoSocial: str | None = None
    esferaId: str | None = None
    poderId: str | None = None


class UnidadeOrgao(BaseModel):
    model_config = ConfigDict(extra="ignore")

    codigoUnidade: PNCPStr = None
    nomeUnidade: str | None = None
    municipioNome: str | None = None
    codigoIbge: PNCPStr = None
    ufSigla: str | None = None


class Contratacao(BaseModel):
    model_config = ConfigDict(extra="ignore")

    numeroControlePNCP: str
    modalidadeId: int | None = None
    modalidadeNome: str | None = None
    modoDisputaId: int | None = None
    modoDisputaNome: str | None = None
    orgaoEntidade: OrgaoEntidade
    unidadeOrgao: UnidadeOrgao
    numeroCompra: PNCPStr = None
    anoCompra: int | None = None
    sequencialCompra: PNCPStr = None
    objetoCompra: str | None = None
    valorTotalEstimado: PNCPDecimal = None
    valorTotalHomologado: PNCPDecimal = None
    situacaoCompraId: int | None = None
    situacaoCompraNome: str | None = None
    srp: bool | None = None
    dataPublicacaoPncp: PNCPDate = None
    dataAberturaProposta: PNCPDatetime = None
    dataEncerramentoProposta: PNCPDatetime = None
    dataInclusao: PNCPDatetime = None
    dataAtualizacao: PNCPDatetime = None


class PaginaContratacoes(BaseModel):
    model_config = ConfigDict(extra="ignore")

    totalPaginas: int = 0
    totalRegistros: int = 0
    numeroPagina: int = 0
    paginasRestantes: int = 0
    empty: bool = False
    data: list[Contratacao] = []


class ItemContratacao(BaseModel):
    model_config = ConfigDict(extra="ignore")

    numeroItem: int
    descricao: str | None = None
    unidadeFornecimento: str | None = None
    quantidade: PNCPDecimal = None
    valorUnitarioEstimado: PNCPDecimal = None
    situacao: str | None = None


class PaginaItens(BaseModel):
    model_config = ConfigDict(extra="ignore")

    totalPaginas: int = 0
    totalRegistros: int = 0
    data: list[ItemContratacao] = []
