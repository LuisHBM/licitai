"""Vocabulário de autocomplete — sugestões a partir do texto das licitações.

Em vez de IA, o autocomplete é servido por um vocabulário pré-computado: uma
varredura única dos `objeto_compra` extrai palavras e frases curtas reais (com
acento, não os radicais do tsvector) e guarda cada termo com sua frequência na
tabela `sugestao_termo`. O endpoint só faz um LIKE indexado nessa tabela — rápido
o bastante para responder a cada tecla.

Nada de stopword list na mão: o que é "palavra vazia" é decidido pela própria
base. Toda palavra que aparece em mais de `_STOP_DOC_RATIO` dos objetos é genérica
demais para servir de busca (vale tanto para gramática — "de", "para" — quanto
para o boilerplate de edital — "empresa", "especializada") e é descartada. Os
"stopwords" são, portanto, derivados do banco a cada rebuild.
"""
from __future__ import annotations

import re
from collections import Counter

from sqlalchemy import text
from sqlalchemy.orm import Session

_TOKEN_RE = re.compile(r"[a-zà-ÿ]+")

# Palavra presente em mais que esta fração dos objetos é tratada como stopword
# (genérica demais). Derivado da base, não é lista fixa.
_STOP_DOC_RATIO = 0.12

_MIN_FREQ_PALAVRA = 8      # palavra precisa aparecer ao menos N vezes
_MIN_FREQ_FRASE = 10       # frase idem (mais alta: frases são mais raras)
_MIN_LEN_PALAVRA = 4       # sugestão de palavra solta
_MIN_LEN_BORDA = 3         # palavra de conteúdo na borda de uma frase


def _tokens(texto: str) -> list[str]:
    return _TOKEN_RE.findall(texto.lower())


def rebuild_sugestoes(session: Session) -> dict[str, int]:
    """Reconstrói o vocabulário de autocomplete a partir dos objetos das
    licitações. Full-refresh, idempotente — roda junto do rebuild do star schema.

    Uma passada só coleta: frequência de cada palavra, em quantos documentos ela
    aparece (para derivar os stopwords) e a contagem de cada bigrama/trigrama.
    """
    rows = session.execute(
        text("SELECT objeto_compra FROM licitacao WHERE objeto_compra IS NOT NULL")
    )

    freq: Counter[str] = Counter()       # ocorrências totais da palavra
    doc_freq: Counter[str] = Counter()   # documentos distintos em que aparece
    ngramas: Counter[str] = Counter()    # bigramas + trigramas
    n_docs = 0

    for (objeto,) in rows:
        n_docs += 1
        toks = _tokens(objeto)
        for t in toks:
            freq[t] += 1
        for t in set(toks):
            doc_freq[t] += 1
        for n in (2, 3):
            for i in range(len(toks) - n + 1):
                ngramas[" ".join(toks[i : i + n])] += 1

    # Stopwords saem da base: o que está em quase todo objeto é genérico demais.
    limite_doc = n_docs * _STOP_DOC_RATIO
    stop = {t for t, c in doc_freq.items() if c > limite_doc}

    termos: dict[str, int] = {}

    # Palavras soltas: conteúdo (não-stopword) e suficientemente frequentes.
    for t, f in freq.items():
        if len(t) >= _MIN_LEN_PALAVRA and f >= _MIN_FREQ_PALAVRA and t not in stop:
            termos[t] = f

    # Frases: bordas precisam ser palavras de conteúdo; o miolo é livre (é onde
    # ficam os conectores "de/da/e", que são stopwords e portanto nunca nas bordas).
    for fr, f in ngramas.items():
        if f < _MIN_FREQ_FRASE:
            continue
        toks = fr.split(" ")
        ini, fim = toks[0], toks[-1]
        if (
            ini not in stop and fim not in stop
            and len(ini) >= _MIN_LEN_BORDA and len(fim) >= _MIN_LEN_BORDA
        ):
            termos[fr] = f

    session.execute(text("TRUNCATE TABLE sugestao_termo"))
    if termos:
        # execute_values manda tudo em poucos round-trips; executemany faria um
        # por linha (~milhares de idas ao banco remoto, lento demais).
        from psycopg2.extras import execute_values

        raw = session.connection().connection  # conexão psycopg2 da sessão
        with raw.cursor() as cur:
            execute_values(
                cur,
                "INSERT INTO sugestao_termo (termo, freq) VALUES %s",
                list(termos.items()),
                page_size=2000,
            )
    session.commit()
    return {"termos": len(termos), "documentos": n_docs, "stopwords": len(stop)}


def buscar_sugestoes(session: Session, q: str, limite: int = 8) -> list[str]:
    """Autocomplete: termos que começam com `q` (prioridade) ou contêm uma palavra
    iniciada por `q`, ordenados por frequência."""
    # Só letras: o vocabulário também é só letras, e evita curingas de LIKE.
    q = " ".join(_tokens(q or ""))
    if len(q) < 2:
        return []
    rows = session.execute(
        text(
            """
            SELECT termo FROM sugestao_termo
            WHERE termo LIKE :pref OR termo LIKE :meio
            ORDER BY (termo LIKE :pref) DESC, freq DESC
            LIMIT :lim
            """
        ),
        {"pref": f"{q}%", "meio": f"% {q}%", "lim": limite},
    ).all()
    return [r.termo for r in rows]
