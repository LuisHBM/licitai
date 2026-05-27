import sys, os, json
sys.path.insert(0, os.path.dirname(__file__))
from crawler.challenge import fetch_json

data = fetch_json(
    "/v1/contratacoes/publicacao",
    {"dataInicial": "20250102", "dataFinal": "20250102", "codigoModalidadeContratacao": 6, "pagina": 1, "tamanhoPagina": 10},
)
print(json.dumps(data["data"][0], ensure_ascii=False, indent=2))
