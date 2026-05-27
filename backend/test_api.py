import argparse
import sys
import os
import time
from datetime import date

sys.path.insert(0, os.path.dirname(__file__))

from crawler import challenge


def _get(path: str, params: dict, timeout: int = 60) -> dict | None:
    print(f"\nGET https://pncp.gov.br/api/consulta{path}")
    print(f"Params: {params}")
    t0 = time.perf_counter()
    try:
        data = challenge.fetch_json(path, params, timeout=timeout)
        elapsed = time.perf_counter() - t0
        print(f"OK | Tempo: {elapsed:.2f}s")
        return data
    except RuntimeError as e:
        elapsed = time.perf_counter() - t0
        print(f"ERRO ({elapsed:.2f}s): {e}")
        return None


def run_contratacoes(data: date, modalidade: int, uf: str | None, pagina: int, pagina_size: int) -> None:
    params = {
        "dataInicial": data.strftime("%Y%m%d"),
        "dataFinal": data.strftime("%Y%m%d"),
        "codigoModalidadeContratacao": modalidade,
        "pagina": pagina,
        "tamanhoPagina": pagina_size,
    }
    if uf:
        params["uf"] = uf

    data_resp = _get("/v1/contratacoes/publicacao", params)
    if data_resp is None:
        return

    total_reg = data_resp.get("totalRegistros", 0)
    total_pag = data_resp.get("totalPaginas", 0)
    registros = data_resp.get("data") or []

    print(f"\nTotal registros: {total_reg}")
    print(f"Total páginas:   {total_pag}")
    print(f"Registros nesta página: {len(registros)}")

    if registros:
        print("\n--- Primeiros 3 registros ---")
        for r in registros[:3]:
            print(f"  numeroControlePNCP : {r.get('numeroControlePNCP')}")
            print(f"  objetoCompra       : {str(r.get('objetoCompra', ''))[:80]}...")
            print(f"  valorTotalEstimado : {r.get('valorTotalEstimado')}")
            print(f"  dataPublicacaoPncp : {r.get('dataPublicacaoPncp')}")
            orgao = r.get("orgaoEntidade") or {}
            print(f"  orgao              : {orgao.get('cnpj')} — {orgao.get('razaoSocial', '')[:50]}")
            print()


def run_itens(cnpj: str, ano: int, sequencial: str, pagina: int, pagina_size: int) -> None:
    path = f"/v1/orgaos/{cnpj}/compras/{ano}/{sequencial}/itens"
    data_resp = _get(path, {"pagina": pagina, "tamanhoPagina": pagina_size})
    if data_resp is None:
        return

    registros = data_resp.get("data") or []
    print(f"\nTotal registros: {data_resp.get('totalRegistros', 0)}")
    print(f"Registros nesta página: {len(registros)}")

    if registros:
        print("\n--- Primeiros 3 itens ---")
        for item in registros[:3]:
            print(f"  numeroItem            : {item.get('numeroItem')}")
            print(f"  descricao             : {str(item.get('descricao', ''))[:80]}")
            print(f"  quantidade            : {item.get('quantidade')}")
            print(f"  valorUnitarioEstimado : {item.get('valorUnitarioEstimado')}")
            print()


def main() -> None:
    p = argparse.ArgumentParser(description="Smoke test da API PNCP")
    p.add_argument("--data", default="2025-06-01", help="Data (YYYY-MM-DD), default: 2025-06-01")
    p.add_argument("--modalidade", type=int, default=6, help="Código da modalidade (default: 6 = Pregão)")
    p.add_argument("--uf", default=None)
    p.add_argument("--pagina", type=int, default=1)
    p.add_argument("--pagina-size", type=int, default=10)
    p.add_argument("--itens", nargs=3, metavar=("CNPJ", "ANO", "SEQUENCIAL"))
    args = p.parse_args()

    if args.itens:
        cnpj, ano, seq = args.itens
        run_itens(cnpj, int(ano), seq, args.pagina, args.pagina_size)
    else:
        run_contratacoes(date.fromisoformat(args.data), args.modalidade, args.uf, args.pagina, args.pagina_size)


if __name__ == "__main__":
    main()
