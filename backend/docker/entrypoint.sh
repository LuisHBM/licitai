#!/bin/sh
set -e
python -c "import db; db.enable_pgvector(); db.create_tables()"
exec uvicorn api.routes:app --host 0.0.0.0 --port "${PORT:-8000}"
