"""licitacao: add modo_disputa and situacao_nome columns

Revision ID: 0002
Revises: 0001
Create Date: 2026-06-14
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE licitacao ADD COLUMN IF NOT EXISTS situacao_nome VARCHAR")
    op.execute("ALTER TABLE licitacao ADD COLUMN IF NOT EXISTS modo_disputa_id INTEGER")
    op.execute("ALTER TABLE licitacao ADD COLUMN IF NOT EXISTS modo_disputa_nome VARCHAR")


def downgrade() -> None:
    op.drop_column("licitacao", "modo_disputa_nome")
    op.drop_column("licitacao", "modo_disputa_id")
    op.drop_column("licitacao", "situacao_nome")
