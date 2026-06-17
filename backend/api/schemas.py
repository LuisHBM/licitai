from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, field_validator


class ModalidadeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id_modalidade: int
    nome: str


class EstadoOut(BaseModel):
    uf: str
    nome: str
    total: int


class LicitacaoResumo(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id_licitacao: UUID
    numero_controle_pncp: str
    objeto_compra: str | None
    valor_total_estimado: Decimal | None
    data_publicacao_pncp: date | None
    situacao_id: int | None
    uf: str | None
    modalidade_nome: str | None


class LicitacaoDetalhe(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id_licitacao: UUID
    numero_controle_pncp: str
    numero_compra: str | None
    ano_compra: int | None
    objeto_compra: str | None
    valor_total_estimado: Decimal | None
    valor_total_homologado: Decimal | None
    situacao_id: int | None
    srp: bool | None
    data_publicacao_pncp: date | None
    data_abertura_proposta: datetime | None
    data_encerramento_proposta: datetime | None
    uf: str | None
    municipio: str | None
    orgao_cnpj: str | None
    orgao_razao_social: str | None
    modalidade_nome: str | None


class PaginatedLicitacoes(BaseModel):
    total: int
    pagina: int
    tamanho: int
    resultados: list[LicitacaoResumo]


class FacetModalidade(BaseModel):
    id_modalidade: int
    nome: str
    total: int


class FacetUF(BaseModel):
    uf: str
    nome: str
    total: int


class FacetSituacao(BaseModel):
    situacao_id: int
    total: int


class FiltrosOut(BaseModel):
    total: int
    modalidades: list[FacetModalidade]
    ufs: list[FacetUF]
    situacoes: list[FacetSituacao]


class ColetaSolicitacao(BaseModel):
    data_inicio: date
    data_fim: date
    modalidades: list[int] = list(range(1, 14))
    uf: str | None = None

    @field_validator("modalidades")
    @classmethod
    def modalidades_validas(cls, v):
        invalidas = [m for m in v if not 1 <= m <= 13]
        if invalidas:
            raise ValueError(f"Modalidades inválidas (1-13): {invalidas}")
        return v

    @field_validator("uf")
    @classmethod
    def uf_valida(cls, v):
        if v is not None and len(v) != 2:
            raise ValueError("UF deve ter exatamente 2 caracteres")
        return v.upper() if v else v


class ColetaAceita(BaseModel):
    mensagem: str
    data_inicio: date
    data_fim: date
    modalidades: list[int]
    uf: str | None


class BuscaTextualRequest(BaseModel):
    q: str
    uf: str | None = None
    modalidade: int | None = None
    data_inicio: date | None = None
    data_fim: date | None = None
    situacao_id: int | None = None
    valor_min: Decimal | None = None
    valor_max: Decimal | None = None
    pagina: int = 1
    tamanho: int = 20


class BuscaSemanticaRequest(BaseModel):
    q: str
    uf: str | None = None
    modalidade: int | None = None
    limite: int = 20



class ColetaOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id_coleta: UUID
    status: str
    modalidade_filtro: int | None
    uf_filtro: str | None
    data_inicio_coleta: date
    data_fim_coleta: date
    total_registros: int
    executado_em: datetime | None


# ── camada analítica (star schema / OLAP) ────────────────────────────────────


class RebuildResult(BaseModel):
    mensagem: str
    contagens: dict[str, int]


class PainelResumo(BaseModel):
    total: int
    valor_total_estimado: float
    valor_medio: float
    economia_total: float
    abertas: int


class PainelPonto(BaseModel):
    name: str
    value: int


class PainelValor(BaseModel):
    """Ponto cujo valor é monetário (ex: economia em reais)."""
    name: str
    value: float


class PainelMes(BaseModel):
    mes: str
    ano_mes: str
    total: int


class PainelUF(BaseModel):
    name: str
    federal: int
    estadual: int
    municipal: int
    outros: int


class PainelCruzado(BaseModel):
    """Cruzamento de duas dimensões para bar chart empilhado: `series` lista os
    nomes das séries e cada item de `dados` tem a categoria + uma contagem por série."""
    series: list[str]
    dados: list[dict[str, object]]
