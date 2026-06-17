import uuid
from datetime import datetime, timezone

from pgvector.sqlalchemy import Vector
from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID, TSVECTOR
from sqlalchemy.orm import DeclarativeBase, relationship
from sqlalchemy.types import TypeDecorator


class _TSVECTORCompat(TypeDecorator):
    """TSVECTOR em PostgreSQL, TEXT em outros dialetos (ex: SQLite nos testes)."""

    impl = Text
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql":
            return dialect.type_descriptor(TSVECTOR())
        return dialect.type_descriptor(Text())


class Base(DeclarativeBase):
    pass


class Estado(Base):
    __tablename__ = "estado"

    uf = Column(String(2), primary_key=True)
    nome = Column(String, nullable=False)


class Administrador(Base):
    __tablename__ = "administrador"

    id_administrador = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nome = Column(String)
    email = Column(String, unique=True)
    senha_hash = Column(String)
    criado_em = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    coletas = relationship("Coleta", back_populates="administrador")


class Coleta(Base):
    __tablename__ = "coleta"

    id_coleta = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    id_administrador = Column(
        UUID(as_uuid=True), ForeignKey("administrador.id_administrador"), nullable=True
    )
    status = Column(String, nullable=False)  # em_andamento | concluido | erro
    modalidade_filtro = Column(Integer, nullable=True)
    uf_filtro = Column(String(2), nullable=True)
    data_inicio_coleta = Column(Date, nullable=False)
    data_fim_coleta = Column(Date, nullable=False)
    total_registros = Column(Integer, default=0)
    log = Column(Text, nullable=True)
    executado_em = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    administrador = relationship("Administrador", back_populates="coletas")
    licitacoes = relationship("Licitacao", back_populates="coleta")


class Orgao(Base):
    __tablename__ = "orgao"

    id_orgao = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    cnpj = Column(String(14), unique=True, nullable=False, index=True)
    razao_social = Column(String)
    esfera = Column(String(1))
    poder = Column(String(1))

    unidades = relationship("Unidade", back_populates="orgao")


class Unidade(Base):
    __tablename__ = "unidade"

    id_unidade = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    id_orgao = Column(UUID(as_uuid=True), ForeignKey("orgao.id_orgao"), nullable=False)
    codigo_unidade = Column(String, nullable=False)
    nome_unidade = Column(String)
    municipio = Column(String)
    codigo_ibge = Column(String)
    uf = Column(String(2))

    orgao = relationship("Orgao", back_populates="unidades")
    licitacoes = relationship("Licitacao", back_populates="unidade")

    __table_args__ = (
        UniqueConstraint("id_orgao", "codigo_unidade", name="uq_unidade_orgao_codigo"),
    )


class Modalidade(Base):
    __tablename__ = "modalidade"

    id_modalidade = Column(Integer, primary_key=True, autoincrement=False)
    codigo = Column(Integer, nullable=False)
    nome = Column(String, nullable=False)

    licitacoes = relationship("Licitacao", back_populates="modalidade")


class Licitacao(Base):
    __tablename__ = "licitacao"

    id_licitacao = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    id_coleta = Column(
        UUID(as_uuid=True), ForeignKey("coleta.id_coleta"), nullable=False
    )
    id_unidade = Column(
        UUID(as_uuid=True), ForeignKey("unidade.id_unidade"), nullable=False
    )
    id_modalidade = Column(
        Integer, ForeignKey("modalidade.id_modalidade"), nullable=False
    )
    numero_controle_pncp = Column(String, unique=True, nullable=False, index=True)
    numero_compra = Column(String)
    ano_compra = Column(Integer)
    sequencial_compra = Column(String)
    objeto_compra = Column(Text)
    valor_total_estimado = Column(Numeric(18, 2))
    valor_total_homologado = Column(Numeric(18, 2))
    situacao_id = Column(Integer)
    situacao_nome = Column(String)
    modo_disputa_id = Column(Integer)
    modo_disputa_nome = Column(String)
    srp = Column(Boolean)
    search_vector = Column(_TSVECTORCompat)
    data_publicacao_pncp = Column(Date)
    data_abertura_proposta = Column(DateTime)
    data_encerramento_proposta = Column(DateTime)
    data_inclusao = Column(DateTime)
    data_atualizacao = Column(DateTime)

    coleta = relationship("Coleta", back_populates="licitacoes")
    unidade = relationship("Unidade", back_populates="licitacoes")
    modalidade = relationship("Modalidade", back_populates="licitacoes")
    itens = relationship(
        "ItemLicitacao", back_populates="licitacao", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("ix_licitacao_search_vector", "search_vector", postgresql_using="gin"),
        Index("ix_licitacao_data_pub", "data_publicacao_pncp"),
    )


class ItemLicitacao(Base):
    __tablename__ = "item_licitacao"

    id_item = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    id_licitacao = Column(
        UUID(as_uuid=True),
        ForeignKey("licitacao.id_licitacao", ondelete="CASCADE"),
        nullable=False,
    )
    numero_item = Column(Integer, nullable=False)
    descricao = Column(Text)
    unidade_fornecimento = Column(String)
    quantidade = Column(Numeric(18, 4))
    valor_unitario_estimado = Column(Numeric(18, 2))
    situacao = Column(String)

    licitacao = relationship("Licitacao", back_populates="itens")

    __table_args__ = (
        UniqueConstraint("id_licitacao", "numero_item", name="uq_item_licitacao_num"),
    )


class Embedding(Base):
    __tablename__ = "embedding"

    id_embedding = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    id_licitacao = Column(
        UUID(as_uuid=True),
        ForeignKey("licitacao.id_licitacao"),
        unique=True,
        nullable=False,
    )
    vetor = Column(Vector(3072))
    modelo = Column(String)
    criado_em = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    licitacao = relationship("Licitacao")


# ─────────────────────────────────────────────────────────────────────────────
# Modelo dimensional (star schema) — alimenta a camada analítica / OLAP.
# Tabelas populadas pelo ETL em analytics/star_schema.py a partir das tabelas
# operacionais acima. Grão do fato: uma linha por licitação.
# ─────────────────────────────────────────────────────────────────────────────


class DimTempo(Base):
    """Dimensão de tempo, derivada de licitacao.data_publicacao_pncp."""

    __tablename__ = "dim_tempo"

    id_tempo = Column(Integer, primary_key=True, autoincrement=False)  # YYYYMMDD
    data = Column(Date, nullable=False)
    ano = Column(Integer, nullable=False)
    trimestre = Column(Integer, nullable=False)
    mes = Column(Integer, nullable=False)
    nome_mes = Column(String, nullable=False)        # "Janeiro"
    mes_abrev = Column(String, nullable=False)        # "Jan"
    ano_mes = Column(String, nullable=False)          # "2026-01"
    quadrienal = Column(String, nullable=False)       # "2025-2028"

    fatos = relationship("FatoLicitacao", back_populates="tempo")


class DimModalidade(Base):
    """Dimensão de modalidade de contratação."""

    __tablename__ = "dim_modalidade"

    id_dim_modalidade = Column(Integer, primary_key=True, autoincrement=False)
    nome = Column(String, nullable=False)

    fatos = relationship("FatoLicitacao", back_populates="modalidade")


class DimUf(Base):
    """Dimensão geográfica por unidade federativa."""

    __tablename__ = "dim_uf"

    uf = Column(String(2), primary_key=True)
    nome = Column(String, nullable=False)
    regiao = Column(String, nullable=False)

    fatos = relationship("FatoLicitacao", back_populates="estado")


class DimOrgao(Base):
    """Dimensão de órgão contratante (órgão + unidade achatados)."""

    __tablename__ = "dim_orgao"

    id_dim_orgao = Column(UUID(as_uuid=True), primary_key=True)  # = id_unidade
    cnpj = Column(String(14))
    razao_social = Column(String)
    esfera = Column(String(1))
    poder = Column(String(1))
    nome_unidade = Column(String)
    municipio = Column(String)
    codigo_ibge = Column(String)
    uf = Column(String(2))

    fatos = relationship("FatoLicitacao", back_populates="orgao")


class FatoLicitacao(Base):
    """Tabela fato. Grão: uma licitação. Métricas: valores e contagens."""

    __tablename__ = "fato_licitacao"

    id_fato = Column(UUID(as_uuid=True), primary_key=True)  # = id_licitacao
    id_tempo = Column(Integer, ForeignKey("dim_tempo.id_tempo"), nullable=True)
    id_dim_orgao = Column(
        UUID(as_uuid=True), ForeignKey("dim_orgao.id_dim_orgao"), nullable=True
    )
    id_dim_modalidade = Column(
        Integer, ForeignKey("dim_modalidade.id_dim_modalidade"), nullable=True
    )
    uf = Column(String(2), ForeignKey("dim_uf.uf"), nullable=True)

    # dimensões degeneradas (atributos que vivem no próprio fato)
    numero_controle_pncp = Column(String)
    situacao_id = Column(Integer)
    situacao_nome = Column(String)
    modo_disputa_nome = Column(String)
    srp = Column(Boolean)
    ano_compra = Column(Integer)

    # métricas (aditivas)
    valor_estimado = Column(Numeric(18, 2))
    valor_homologado = Column(Numeric(18, 2))
    economia = Column(Numeric(18, 2))
    qtd_itens = Column(Integer, default=0)

    tempo = relationship("DimTempo", back_populates="fatos")
    orgao = relationship("DimOrgao", back_populates="fatos")
    modalidade = relationship("DimModalidade", back_populates="fatos")
    estado = relationship("DimUf", back_populates="fatos")

    __table_args__ = (
        Index("ix_fato_tempo", "id_tempo"),
        Index("ix_fato_modalidade", "id_dim_modalidade"),
        Index("ix_fato_uf", "uf"),
        Index("ix_fato_orgao", "id_dim_orgao"),
    )
