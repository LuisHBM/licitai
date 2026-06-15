"""initial schema

Revision ID: 0001
Revises:
Create Date: 2026-06-14
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    op.create_table(
        "estado",
        sa.Column("uf", sa.String(2), primary_key=True),
        sa.Column("nome", sa.String(), nullable=False),
    )

    op.create_table(
        "administrador",
        sa.Column("id_administrador", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("nome", sa.String()),
        sa.Column("email", sa.String(), unique=True),
        sa.Column("senha_hash", sa.String()),
        sa.Column("criado_em", sa.DateTime(timezone=True)),
    )

    op.create_table(
        "coleta",
        sa.Column("id_coleta", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "id_administrador",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("administrador.id_administrador"),
            nullable=True,
        ),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("modalidade_filtro", sa.Integer(), nullable=True),
        sa.Column("uf_filtro", sa.String(2), nullable=True),
        sa.Column("data_inicio_coleta", sa.Date(), nullable=False),
        sa.Column("data_fim_coleta", sa.Date(), nullable=False),
        sa.Column("total_registros", sa.Integer(), default=0),
        sa.Column("executado_em", sa.DateTime(timezone=True)),
    )

    op.create_table(
        "orgao",
        sa.Column("id_orgao", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("cnpj", sa.String(14), nullable=False),
        sa.Column("razao_social", sa.String()),
        sa.Column("esfera", sa.String(1)),
        sa.Column("poder", sa.String(1)),
        sa.UniqueConstraint("cnpj", name="uq_orgao_cnpj"),
    )
    op.create_index("ix_orgao_cnpj", "orgao", ["cnpj"])

    op.create_table(
        "modalidade",
        sa.Column("id_modalidade", sa.Integer(), primary_key=True, autoincrement=False),
        sa.Column("codigo", sa.Integer(), nullable=False),
        sa.Column("nome", sa.String(), nullable=False),
    )

    op.create_table(
        "unidade",
        sa.Column("id_unidade", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "id_orgao",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("orgao.id_orgao"),
            nullable=False,
        ),
        sa.Column("codigo_unidade", sa.String(), nullable=False),
        sa.Column("nome_unidade", sa.String()),
        sa.Column("municipio", sa.String()),
        sa.Column("codigo_ibge", sa.String()),
        sa.Column("uf", sa.String(2)),
        sa.UniqueConstraint("id_orgao", "codigo_unidade", name="uq_unidade_orgao_codigo"),
    )
    op.create_index("ix_unidade_uf", "unidade", ["uf"])

    op.create_table(
        "licitacao",
        sa.Column("id_licitacao", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "id_coleta",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("coleta.id_coleta"),
            nullable=False,
        ),
        sa.Column(
            "id_unidade",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("unidade.id_unidade"),
            nullable=False,
        ),
        sa.Column(
            "id_modalidade",
            sa.Integer(),
            sa.ForeignKey("modalidade.id_modalidade"),
            nullable=False,
        ),
        sa.Column("numero_controle_pncp", sa.String(), nullable=False),
        sa.Column("numero_compra", sa.String()),
        sa.Column("ano_compra", sa.Integer()),
        sa.Column("sequencial_compra", sa.String()),
        sa.Column("objeto_compra", sa.Text()),
        sa.Column("valor_total_estimado", sa.Numeric(18, 2)),
        sa.Column("valor_total_homologado", sa.Numeric(18, 2)),
        sa.Column("situacao_id", sa.Integer()),
        sa.Column("situacao_nome", sa.String()),
        sa.Column("modo_disputa_id", sa.Integer()),
        sa.Column("modo_disputa_nome", sa.String()),
        sa.Column("srp", sa.Boolean()),
        sa.Column("search_vector", sa.Text()),  # TSVECTOR via trigger
        sa.Column("data_publicacao_pncp", sa.Date()),
        sa.Column("data_abertura_proposta", sa.DateTime()),
        sa.Column("data_encerramento_proposta", sa.DateTime()),
        sa.Column("data_inclusao", sa.DateTime()),
        sa.Column("data_atualizacao", sa.DateTime()),
        sa.UniqueConstraint("numero_controle_pncp", name="uq_licitacao_numero_controle"),
    )
    op.create_index("ix_licitacao_numero_controle_pncp", "licitacao", ["numero_controle_pncp"])
    op.create_index("ix_licitacao_data_pub", "licitacao", ["data_publicacao_pncp"])
    op.create_index("ix_licitacao_modalidade", "licitacao", ["id_modalidade"])
    op.create_index("ix_licitacao_situacao", "licitacao", ["situacao_id"])

    op.create_table(
        "item_licitacao",
        sa.Column("id_item", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "id_licitacao",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("licitacao.id_licitacao", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("numero_item", sa.Integer(), nullable=False),
        sa.Column("descricao", sa.Text()),
        sa.Column("unidade_fornecimento", sa.String()),
        sa.Column("quantidade", sa.Numeric(18, 4)),
        sa.Column("valor_unitario_estimado", sa.Numeric(18, 2)),
        sa.Column("situacao", sa.String()),
        sa.UniqueConstraint("id_licitacao", "numero_item", name="uq_item_licitacao_num"),
    )

    op.create_table(
        "embedding",
        sa.Column("id_embedding", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "id_licitacao",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("licitacao.id_licitacao"),
            nullable=False,
            unique=True,
        ),
        sa.Column("vetor", sa.Text()),  # vector(3072) via raw SQL below
        sa.Column("modelo", sa.String()),
        sa.Column("criado_em", sa.DateTime(timezone=True)),
    )
    # Replace placeholder TEXT column with the real pgvector type.
    op.execute("ALTER TABLE embedding ALTER COLUMN vetor TYPE vector(3072) USING NULL::vector(3072)")

    # Convert licitacao.search_vector to TSVECTOR, then create GIN index and trigger.
    op.execute("ALTER TABLE licitacao ALTER COLUMN search_vector TYPE tsvector USING NULL::tsvector")
    op.execute(
        "CREATE INDEX ix_licitacao_search_vector ON licitacao USING gin(search_vector)"
    )
    op.execute("""
        CREATE OR REPLACE FUNCTION fn_licitacao_search_vector()
        RETURNS TRIGGER AS $$
        DECLARE
            v_nome_unidade text;
            v_razao_social  text;
        BEGIN
            SELECT u.nome_unidade, o.razao_social
              INTO v_nome_unidade, v_razao_social
              FROM unidade u
              JOIN orgao o ON o.id_orgao = u.id_orgao
             WHERE u.id_unidade = NEW.id_unidade;

            NEW.search_vector :=
                setweight(to_tsvector('portuguese', coalesce(NEW.objeto_compra, '')), 'A') ||
                setweight(to_tsvector('portuguese', coalesce(v_nome_unidade,  '')), 'B') ||
                setweight(to_tsvector('portuguese', coalesce(v_razao_social,  '')), 'B');

            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql
    """)
    op.execute("""
        CREATE OR REPLACE TRIGGER trig_licitacao_search_vector
        BEFORE INSERT OR UPDATE OF objeto_compra, id_unidade ON licitacao
        FOR EACH ROW EXECUTE FUNCTION fn_licitacao_search_vector()
    """)


def downgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS trig_licitacao_search_vector ON licitacao")
    op.execute("DROP FUNCTION IF EXISTS fn_licitacao_search_vector")
    op.drop_table("embedding")
    op.drop_table("item_licitacao")
    op.drop_table("licitacao")
    op.drop_table("unidade")
    op.drop_table("modalidade")
    op.drop_table("orgao")
    op.drop_table("coleta")
    op.drop_table("administrador")
    op.drop_table("estado")
