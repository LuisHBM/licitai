import logging
import time

import requests

from crawler.schemas import PaginaContratacoes, PaginaItens

logger = logging.getLogger(__name__)

BASE_URL = "https://pncp.gov.br/api/consulta"
PAGE_SIZE = 50

_BACKOFF = [5, 15, 30, 60, 120]


def _get(path: str, params: dict, timeout: int = 90) -> dict:
    url = BASE_URL + path
    for attempt, backoff in enumerate(_BACKOFF, 1):
        try:
            resp = requests.get(url, params=params, timeout=timeout)
            if resp.status_code == 429:
                wait = int(resp.headers.get("Retry-After", backoff))
                logger.warning("Rate limit (429). Aguardando %ds...", wait)
                time.sleep(wait)
                continue
            resp.raise_for_status()
            return resp.json()
        except requests.HTTPError as exc:
            if exc.response is not None and exc.response.status_code < 500:
                raise
            logger.warning(
                "Tentativa %d/%d falhou (%s). Aguardando %ds...",
                attempt, len(_BACKOFF), exc, backoff,
            )
        except requests.RequestException as exc:
            logger.warning(
                "Tentativa %d/%d falhou (%s). Aguardando %ds...",
                attempt, len(_BACKOFF), exc, backoff,
            )

        if attempt == len(_BACKOFF):
            raise RuntimeError(f"Todas as tentativas esgotadas para {url}")
        time.sleep(backoff)

    raise RuntimeError(f"Todas as tentativas esgotadas para {url}")


def fetch_contratacoes_page(
    data_inicial: str,
    data_final: str,
    modalidade: int,
    pagina: int,
    uf: str | None = None,
) -> PaginaContratacoes:
    params: dict = {
        "dataInicial": data_inicial,
        "dataFinal": data_final,
        "codigoModalidadeContratacao": modalidade,
        "pagina": pagina,
        "tamanhoPagina": PAGE_SIZE,
    }
    if uf:
        params["uf"] = uf
    return PaginaContratacoes.model_validate(_get("/v1/contratacoes/publicacao", params))


def fetch_itens_page(cnpj: str, ano: int, sequencial: str, pagina: int) -> PaginaItens:
    path = f"/v1/orgaos/{cnpj}/compras/{ano}/{sequencial}/itens"
    return PaginaItens.model_validate(_get(path, {"pagina": pagina, "tamanhoPagina": PAGE_SIZE}))
