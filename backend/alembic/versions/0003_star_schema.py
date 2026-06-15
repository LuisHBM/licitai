"""star schema: dimensões e fato para a camada analítica (OLAP)

Revision ID: 0003
Revises: 0002
Create Date: 2026-06-15
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0003"
down_revision: Union[str, None] = "0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "dim_tempo",
        sa.Column("id_tempo", sa.Integer(), primary_key=True, autoincrement=False),
        sa.Column("data", sa.Date(), nullable=False),
        sa.Column("ano", sa.Integer(), nullable=False),
        sa.Column("trimestre", sa.Integer(), nullable=False),
        sa.Column("mes", sa.Integer(), nullable=False),
        sa.Column("nome_mes", sa.String(), nullable=False),
        sa.Column("mes_abrev", sa.String(), nullable=False),
        sa.Column("ano_mes", sa.String(), nullable=False),
        sa.Column("quadrienal", sa.String(), nullable=False),
    )

    op.create_table(
        "dim_modalidade",
        sa.Column("id_dim_modalidade", sa.Integer(), primary_key=True, autoincrement=False),
        sa.Column("nome", sa.String(), nullable=False),
    )

    op.create_table(
        "dim_uf",
        sa.Column("uf", sa.String(2), primary_key=True),
        sa.Column("nome", sa.String(), nullable=False),
        sa.Column("regiao", sa.String(), nullable=False),
    )

    op.create_table(
        "dim_orgao",
        sa.Column("id_dim_orgao", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("cnpj", sa.String(14)),
        sa.Column("razao_social", sa.String()),
        sa.Column("esfera", sa.String(1)),
        sa.Column("poder", sa.String(1)),
        sa.Column("nome_unidade", sa.String()),
        sa.Column("municipio", sa.String()),
        sa.Column("codigo_ibge", sa.String()),
        sa.Column("uf", sa.String(2)),
    )

    op.create_table(
        "fato_licitacao",
        sa.Column("id_fato", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("id_tempo", sa.Integer(), sa.ForeignKey("dim_tempo.id_tempo"), nullable=True),
        sa.Column(
            "id_dim_orgao",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("dim_orgao.id_dim_orgao"),
            nullable=True,
        ),
        sa.Column(
            "id_dim_modalidade",
            sa.Integer(),
            sa.ForeignKey("dim_modalidade.id_dim_modalidade"),
            nullable=True,
        ),
        sa.Column("uf", sa.String(2), sa.ForeignKey("dim_uf.uf"), nullable=True),
        sa.Column("numero_controle_pncp", sa.String()),
        sa.Column("situacao_id", sa.Integer()),
        sa.Column("situacao_nome", sa.String()),
        sa.Column("modo_disputa_nome", sa.String()),
        sa.Column("srp", sa.Boolean()),
        sa.Column("ano_compra", sa.Integer()),
        sa.Column("valor_estimado", sa.Numeric(18, 2)),
        sa.Column("valor_homologado", sa.Numeric(18, 2)),
        sa.Column("economia", sa.Numeric(18, 2)),
        sa.Column("qtd_itens", sa.Integer()),
    )
    op.create_index("ix_fato_tempo", "fato_licitacao", ["id_tempo"])
    op.create_index("ix_fato_modalidade", "fato_licitacao", ["id_dim_modalidade"])
    op.create_index("ix_fato_uf", "fato_licitacao", ["uf"])
    op.create_index("ix_fato_orgao", "fato_licitacao", ["id_dim_orgao"])


def downgrade() -> None:
    op.drop_table("fato_licitacao")
    op.drop_table("dim_orgao")
    op.drop_table("dim_uf")
    op.drop_table("dim_modalidade")
    op.drop_table("dim_tempo")
