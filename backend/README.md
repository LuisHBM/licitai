## Stack

- **Python 3.12** + **uv** (gerenciador de pacotes e ambientes)
- **FastAPI** + **Uvicorn** (API REST)
- **SQLAlchemy 2** (ORM)
- **PostgreSQL 17** + **pgvector** (busca vetorial e full-text)
- **Dynaconf** (configuração por ambiente)
- **Pydantic v2** (validação de dados e schemas)
- **Playwright** (headless Chrome para bypass do WAF F5 do PNCP)
- **Docker Compose** (banco local + container da API)

## Requisitos

- [uv](https://docs.astral.sh/uv/getting-started/installation/)
- Docker

## Setup

```bash
# instala dependências e cria o .venv
uv sync --group dev

# copia o modelo de segredos e preenche com os valores locais
cp .secrets.toml .secrets.local.toml

# instala o Chrome para o Playwright (necessário para o crawler)
uv run playwright install chrome --with-deps

# sobe o postgres local (porta 5438)
docker compose up -d
```

## Configuração

A configuração é gerenciada pelo **Dynaconf** com três arquivos em camadas:

| Arquivo | Git | Conteúdo |
|---|---|---|
| `settings.toml` | ✅ sim | configurações não-sensíveis por ambiente (portas, pool, echo) |
| `.secrets.toml` | ✅ sim | modelo com as chaves vazias — documenta o que precisa ser preenchido |
| `.secrets.local.toml` | 🚫 não | valores reais de cada máquina/ambiente |

O ambiente é controlado pela variável `ENV_FOR_DYNACONF`:

| Valor | Banco | Como ativar |
|---|---|---|
| `development` (padrão) | Docker local — porta 5438 | não precisa setar nada |
| `production` | Supabase | `ENV_FOR_DYNACONF=production` |

Variáveis de ambiente com prefixo `LICITAI_` sobrescrevem qualquer valor dos arquivos TOML (ex: `LICITAI_DB_HOST`, `LICITAI_DB_PASSWORD`).

## Estrutura

```
backend/
├── api/
│   ├── routes.py          # endpoints FastAPI
│   └── schemas.py         # modelos Pydantic de request/response
├── crawler/
│   ├── challenge.py       # bypass do WAF F5 via Playwright (headless Chrome)
│   ├── client.py          # chamadas à API do PNCP
│   ├── etl.py             # pipeline de extração e carga (dia a dia)
│   └── schemas.py         # modelos Pydantic do payload da API PNCP
├── db/
│   ├── models.py          # modelos SQLAlchemy
│   └── session.py         # engine e sessão
├── tests/
│   ├── conftest.py        # fixtures compartilhadas
│   ├── unit/              # testes sem dependências externas
│   └── integration/       # testes com banco SQLite em memória
├── cli.py                 # CLI do crawler
├── config.py              # inicialização do Dynaconf
├── settings.toml          # configurações por ambiente
├── .secrets.toml          # modelo de segredos (valores vazios)
├── docker-compose.yml     # postgres + pgvector local
└── pyproject.toml         # dependências e metadados do projeto
```

## Banco de dados

```bash
# inicializa tabelas e extensões (development)
python cli.py --init-db --data-inicio 2024-01-01 --data-fim 2024-01-01

# production
ENV_FOR_DYNACONF=production python cli.py --init-db --data-inicio 2024-01-01 --data-fim 2024-01-01
```

## Crawler (CLI)

O crawler usa Playwright para contornar o WAF F5 BIG-IP do PNCP, que bloqueia requisições HTTP diretas. Na primeira execução do processo, o Chrome é iniciado em background e reutilizado nas páginas seguintes.

O ETL itera dia a dia dentro do intervalo solicitado: erros em um dia ou página não abortam a coleta — apenas pulam para o próximo.

```bash
# coleta licitações de um intervalo de datas (todas as modalidades)
python cli.py --data-inicio 2024-01-01 --data-fim 2024-01-31

# filtros opcionais: UF e modalidade específica
python cli.py --data-inicio 2024-01-01 --data-fim 2024-01-31 --uf BA --modalidades 6 8

# sobrescreve o banco via flag
python cli.py --data-inicio 2024-01-01 --data-fim 2024-01-31 --db-url postgresql://user:pass@host/db
```

A coleta também pode ser disparada pela API via `POST /coletas` (executa em background).

## Executando via Docker

O container inclui o Chrome necessário para o crawler. Para subir tudo:

```bash
docker compose up -d
```

Para subir só o banco local e rodar a API no host:

```bash
docker compose up -d db
uvicorn api.routes:app --reload
```

## API REST

Documentação interativa: `http://localhost:8000/docs`

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/licitacoes` | Busca paginada com filtros (`q`, `uf`, `modalidade`, datas, `situacao_id`) |
| `GET` | `/licitacoes/filtros` | Contagens por modalidade, UF e situação para os filtros ativos |
| `GET` | `/licitacoes/{numero_controle_pncp}` | Detalhes de uma licitação |
| `GET` | `/modalidades` | Lista de modalidades |
| `GET` | `/estados` | Estados com contagem de licitações |
| `POST` | `/coletas` | Dispara coleta em background |
| `GET` | `/coletas` | Lista coletas recentes |
| `GET` | `/coletas/{id}` | Detalhe de uma coleta |

## Testes

```bash
# todos os testes
pytest

# só unitários (sem banco, roda em ~0.2s)
pytest -m unit

# só integração (banco SQLite em memória)
pytest -m integration
```
