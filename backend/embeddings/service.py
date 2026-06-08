import logging
from uuid import UUID

from langchain_google_genai import GoogleGenerativeAIEmbeddings
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session

from config import settings
from db.models import Embedding, Licitacao

logger = logging.getLogger(__name__)

EMBEDDING_MODEL = "models/gemini-embedding-001"
EMBEDDING_DIM = 3072
BATCH_SIZE = 100


def _embeddings() -> GoogleGenerativeAIEmbeddings:
    return GoogleGenerativeAIEmbeddings(
        model=EMBEDDING_MODEL,
        google_api_key=settings.google_api_key,
    )


def gerar_embedding_query(texto: str) -> list[float]:
    return _embeddings().embed_query(texto)


def indexar_licitacoes(session: Session, limite: int | None = None) -> int:
    """Gera e persiste embeddings para licitações que ainda não têm."""
    subq = select(Embedding.id_licitacao)
    query = (
        session.query(Licitacao)
        .filter(Licitacao.objeto_compra.isnot(None))
        .filter(~Licitacao.id_licitacao.in_(subq))
    )
    if limite:
        query = query.limit(limite)

    licitacoes = query.all()
    logger.info("Indexando %d licitações...", len(licitacoes))

    emb = _embeddings()
    indexadas = 0

    for i in range(0, len(licitacoes), BATCH_SIZE):
        batch = licitacoes[i : i + BATCH_SIZE]
        textos = [lic.objeto_compra for lic in batch]
        vetores = emb.embed_documents(textos)

        for lic, vetor in zip(batch, vetores):
            stmt = pg_insert(Embedding.__table__).values(
                id_licitacao=lic.id_licitacao,
                vetor=vetor,
                modelo=EMBEDDING_MODEL,
            ).on_conflict_do_update(
                index_elements=["id_licitacao"],
                set_={"vetor": vetor, "modelo": EMBEDDING_MODEL},
            )
            session.execute(stmt)

        session.commit()
        indexadas += len(batch)
        logger.info("  %d/%d indexadas", indexadas, len(licitacoes))

    return indexadas
