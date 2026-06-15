import logging

from crawler import challenge
from crawler.schemas import PaginaContratacoes, PaginaItens

logger = logging.getLogger(__name__)

PAGE_SIZE = 50  # PNCP rejeita valores acima de 50 apesar do manual dizer 500


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
    return PaginaContratacoes.model_validate(challenge.fetch_json("/v1/contratacoes/publicacao", params))


def fetch_itens_page(cnpj: str, ano: int, sequencial: str, pagina: int) -> PaginaItens:
    path = f"/v1/orgaos/{cnpj}/compras/{ano}/{sequencial}/itens"
    return PaginaItens.model_validate(challenge.fetch_json(path, {"pagina": pagina, "tamanhoPagina": PAGE_SIZE}))
