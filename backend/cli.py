import argparse
import logging
import os
import sys
from datetime import date

ALL_MODALIDADES = list(range(1, 14))


def _setup_logging() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )


def _parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Crawler PNCP → PostgreSQL")
    p.add_argument("--data-inicio", required=True, help="Data inicial (YYYY-MM-DD)")
    p.add_argument("--data-fim", required=True, help="Data final (YYYY-MM-DD)")
    p.add_argument(
        "--modalidades",
        nargs="+",
        type=int,
        default=ALL_MODALIDADES,
        metavar="COD",
        help=f"Códigos de modalidade (default: todas {ALL_MODALIDADES})",
    )
    p.add_argument("--uf", default=None, help="Filtrar por UF (ex: BA, SP)")
    p.add_argument(
        "--db-url",
        default=os.environ.get("DATABASE_URL"),
        help="URL do banco (default: var DATABASE_URL)",
    )
    p.add_argument(
        "--init-db",
        action="store_true",
        help="Cria tabelas e extensões antes de coletar",
    )
    p.add_argument(
        "--page-delay",
        type=float,
        default=1.0,
        help="Delay em segundos entre páginas (default: 1.0)",
    )
    return p.parse_args()


def main() -> None:
    _setup_logging()
    args = _parse_args()

    try:
        data_inicio = date.fromisoformat(args.data_inicio)
        data_fim = date.fromisoformat(args.data_fim)
    except ValueError as exc:
        print(f"Erro de data: {exc}", file=sys.stderr)
        sys.exit(1)

    if data_inicio > data_fim:
        print("--data-inicio deve ser <= --data-fim", file=sys.stderr)
        sys.exit(1)

    if args.db_url:
        os.environ["DATABASE_URL"] = args.db_url

    import crawler.etl as etl
    import crawler.client as client
    import db

    client.PAGE_SIZE = 50
    etl.PAGE_DELAY = args.page_delay

    if args.init_db:
        logging.getLogger(__name__).info("Inicializando banco de dados...")
        db.enable_pgvector()
        db.create_tables()

    with db.Session() as session:
        etl.crawl(
            data_inicio=data_inicio,
            data_fim=data_fim,
            modalidades=args.modalidades,
            uf=args.uf,
            session=session,
        )


if __name__ == "__main__":
    main()
