#!/bin/sh
set -e

python -c "import db; db.enable_pgvector()"

# Se o banco já foi criado pelo create_all antigo (tabelas existem mas não há
# alembic_version), marca como baseline 0001 para que o upgrade só aplique
# as migrations novas (ex: 0002 em diante).
python - <<'EOF'
from sqlalchemy import inspect, text
from db.session import engine

with engine.connect() as conn:
    insp = inspect(conn)
    has_version = insp.has_table("alembic_version")
    has_tables  = insp.has_table("licitacao")

if has_tables and not has_version:
    import subprocess, sys
    print("Banco existente sem alembic_version detectado — marcando baseline 0001...", flush=True)
    subprocess.run(["alembic", "stamp", "0001"], check=True)
EOF

alembic upgrade head
python -c "from db.session import Session, _seed_modalidades, _seed_estados; s = Session(); _seed_modalidades(s); _seed_estados(s); s.commit(); s.close()"

exec uvicorn api.routes:app --host 0.0.0.0 --port "${PORT:-8000}"
