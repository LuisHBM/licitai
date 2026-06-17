"""sugestoes de autocomplete: vocabulário (palavras + frases curtas) dos objetos

Revision ID: 0005
Revises: 0004
Create Date: 2026-06-17
"""
from typing import Sequence, Union

from alembic import op

revision: str = "0005"
down_revision: Union[str, None] = "0004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # pg_trgm habilita LIKE infix indexado ('%termo%'), não só prefixo.
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")
    op.execute(
        """
        CREATE TABLE sugestao_termo (
            termo text PRIMARY KEY,
            freq  integer NOT NULL
        )
        """
    )
    op.execute(
        "CREATE INDEX ix_sugestao_termo_trgm "
        "ON sugestao_termo USING gin (termo gin_trgm_ops)"
    )


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS sugestao_termo")
    # pg_trgm é deixada instalada: pode haver outros índices dependendo dela.
