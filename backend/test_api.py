"""
Testa a API do PNCP diretamente, sem banco de dados.

Uso:
    python test_api.py
    python test_api.py --data 2025-01-10 --modalidade 8 --uf SP --pagina-size 20
    python test_api.py --itens 05816630000152 2025 0019004
"""

import argparse
import json
import time
from datetime import date

import requests

BASE_URL = "https://pncp.gov.br/api/consulta"


def _get(path: str, params: dict, timeout: int = 60) -> dict:
    url = BASE_URL + path
    print(f"\nGET {url}")
    print(f"Params: {json.dumps(params, ensure_ascii=False)}")
    t0 = time.perf_counter()
    resp = requests.get(url, params=params, timeout=timeout)
    elapsed = time.perf_counter() - t0
    print(f"Status: {resp.status_code} | Tempo: {elapsed:.2f}s")
    resp.raise_for_status()
    return resp.json()


def test_contratacoes(data: date, modalidade: int, uf: str | None, pagina: int, pagina_size: int) -> None:
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
            print(f"  orgao cnpj         : {orgao.get('cnpj')} — {orgao.get('razaoSocial', '')[:50]}")
            print()


def test_itens(cnpj: str, ano: int, sequencial: str, pagina: int, pagina_size: int) -> None:
    path = f"/v1/orgaos/{cnpj}/compras/{ano}/{sequencial}/itens"
    params = {"pagina": pagina, "tamanhoPagina": pagina_size}

    data_resp = _get(path, params)

    total_reg = data_resp.get("totalRegistros", 0)
    total_pag = data_resp.get("totalPaginas", 0)
    registros = data_resp.get("data") or []

    print(f"\nTotal registros: {total_reg}")
    print(f"Total páginas:   {total_pag}")
    print(f"Registros nesta página: {len(registros)}")

    if registros:
        print("\n--- Primeiros 3 itens ---")
        for item in registros[:3]:
            print(f"  numeroItem             : {item.get('numeroItem')}")
            print(f"  descricao              : {str(item.get('descricao', ''))[:80]}")
            print(f"  quantidade             : {item.get('quantidade')}")
            print(f"  valorUnitarioEstimado  : {item.get('valorUnitarioEstimado')}")
            print(f"  unidadeFornecimento    : {item.get('unidadeFornecimento')}")
            print()


def main() -> None:
    p = argparse.ArgumentParser(description="Testa a API PNCP")
    p.add_argument("--data", default=str(date.today()), help="Data (YYYY-MM-DD), default: hoje")
    p.add_argument("--modalidade", type=int, default=6, help="Código da modalidade (default: 6 = Pregão)")
    p.add_argument("--uf", default=None, help="UF (opcional, ex: BA)")
    p.add_argument("--pagina", type=int, default=1)
    p.add_argument("--pagina-size", type=int, default=10)
    p.add_argument("--itens", nargs=3, metavar=("CNPJ", "ANO", "SEQUENCIAL"),
                   help="Testa o endpoint de itens. Ex: --itens 05816630000152 2025 0019004")
    args = p.parse_args()

    if args.itens:
        cnpj, ano, seq = args.itens
        test_itens(cnpj, int(ano), seq, args.pagina, args.pagina_size)
    else:
        test_contratacoes(
            date.fromisoformat(args.data),
            args.modalidade,
            args.uf,
            args.pagina,
            args.pagina_size,
        )


if __name__ == "__main__":
    main()
