# licitai

Plataforma de análise e busca de licitações públicas brasileiras via PNCP.

## Stack

- **Python 3.12** + **uv** (gerenciador de pacotes e ambientes)
- **SQLAlchemy 2** (ORM)
- **PostgreSQL 17** + **pgvector** (busca vetorial e full-text)
- **Dynaconf** (configuração por ambiente)
- **Docker Compose** (banco local)

## Requisitos

- [uv](https://docs.astral.sh/uv/getting-started/installation/)
- Docker

## Setup

```bash
# instala dependências e cria o .venv
uv sync

# sobe o postgres local (porta 5438)
docker compose up -d
```

## Ambientes

O ambiente é controlado pela variável `LICITAI_ENV`. Os valores possíveis são `development` (padrão) e `production`.

| Ambiente      | Banco                          | Como ativar                      |
|---------------|--------------------------------|----------------------------------|
| `development` | Docker local (porta 5438)      | padrão — não precisa setar nada  |
| `production`  | Supabase                       | `LICITAI_ENV=production`         |

Os arquivos de segredo seguem a seguinte convenção:

| Arquivo | Vai pro git? | Uso |
|---|---|---|
| `.secrets.toml` | sim | modelo com as chaves vazias — serve de documentação |
| `.secrets.local.toml` | **não** | valores reais, por máquina |

Copie o modelo e preencha:

```bash
cp .secrets.toml .secrets.local.toml
```

```toml
[development]
db_password = "..."
llm_api_key = "..."

[production]
db_password = "..."
llm_api_key = "..."
```

## Criando o banco

```bash
# development (padrão)
uv run python -m licitai.db

# production
LICITAI_ENV=production uv run python -m licitai.db
```

Isso executa `CREATE EXTENSION IF NOT EXISTS vector` e `create_all` com todos os models.

## Estrutura

```
licitai/
├── licitai/
│   ├── config.py      # dynaconf — lê settings.toml, .secrets.toml e .secrets.local.toml
│   ├── db.py          # engine, SessionLocal, create_database()
│   └── models.py      # tabelas SQLAlchemy (Licitacao, Orgao, Embedding…)
├── settings.toml      # configurações por ambiente (sem segredos)
├── .secrets.toml      # modelo de segredos — vai pro git, valores vazios
├── .secrets.local.toml  # segredos reais — não vai pro git
├── docker-compose.yml # postgres + pgvector local
└── pyproject.toml     # dependências e build
```

## Dependências de desenvolvimento

```bash
# instala grupo dev (ipython + pytest)
uv sync --group dev

# shell interativo com o pacote disponível
uv run ipython
```
