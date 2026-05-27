# LicitAI

Sistema de coleta, armazenamento e consulta de licitações públicas brasileiras a partir do **PNCP** (Portal Nacional de Contratações Públicas), com suporte a busca por texto completo, filtros avançados e embeddings vetoriais para busca semântica por IA.

Desenvolvido como Trabalho de Conclusão de Curso (TCC) na **UNEB**.

---

## Arquitetura

![Diagrama de Arquitetura](tees-docs/diagrama_arquitetura.png)

O sistema é composto por cinco camadas principais:

| Camada | Tecnologia | Responsabilidade |
|---|---|---|
| **Crawler / ETL** | Python + `requests` | Coleta periódica via API pública do PNCP |
| **Banco de Dados** | PostgreSQL + pgvector | Armazenamento relacional e busca vetorial |
| **Back-End** | FastAPI | API REST para consultas SQL e vetoriais |
| **IA Generativa** | LangChain + LLM | Geração de embeddings e interpretação de queries em linguagem natural |
| **Front-End / BI** | Next.js + Power BI | Interface de busca e painel analítico |

---

## Modelo de Dados

![Diagrama Entidade-Relacionamento](tees-docs/diagrama_entidade_relacionamento.png)

As entidades centrais são:

- **`licitacao`** — registro de cada contratação pública, com `search_vector` (full-text search em português) e relacionamento 1-para-1 com `embedding` (vetor de 1536 dimensões).
- **`item_licitacao`** — itens individuais de cada licitação.
- **`orgao` / `unidade`** — hierarquia dos órgãos contratantes.
- **`modalidade`** — classificação da modalidade de contratação (Pregão, Dispensa, etc.).
- **`coleta`** — registro de cada execução do crawler, com status e metadados do intervalo coletado.

---

## Casos de Uso

![Diagrama de Casos de Uso](tees-docs/diagrama_casos_de_uso.png)

- **Usuário público** — busca por texto, linguagem natural, filtros por UF/modalidade/período e painel analítico.
- **Administrador** — dispara coletas, configura parâmetros, monitora logs e exporta CSV para BI.

---

## Stack

- **Python 3.13**
- **FastAPI** + **Uvicorn** — API REST assíncrona
- **SQLAlchemy 2** — ORM e queries SQL
- **PostgreSQL** + **pgvector** — banco relacional com extensão de vetores
- **requests** — cliente HTTP para a API do PNCP
- **pytest** — testes automatizados

---

## Estrutura do Projeto

```
.
├── api/
│   ├── routes.py        # endpoints FastAPI
│   └── schemas.py       # modelos Pydantic de entrada/saída
├── crawler/
│   ├── client.py        # cliente HTTP para o PNCP (com retry/backoff)
│   └── etl.py           # pipeline de extração, transformação e carga
├── db/
│   ├── models.py        # modelos SQLAlchemy
│   └── session.py       # configuração da sessão de banco
├── tests/               # suite de testes (pytest)
├── cli.py               # interface de linha de comando para o crawler
├── requirements.txt
└── tees-docs/           # diagramas e documentação do projeto
```

---

## Configuração

### Stack

- **Python 3.12** + **uv** (gerenciador de pacotes e ambientes)
- **SQLAlchemy 2** (ORM)
- **PostgreSQL 17** + **pgvector** (busca vetorial e full-text)
- **Dynaconf** (configuração por ambiente)
- **Docker Compose** (banco local)

### Requisitos

- [uv](https://docs.astral.sh/uv/getting-started/installation/)
- Docker

### Setup

```bash
# instala dependências e cria o .venv
uv sync

# sobe o postgres local (porta 5438)
docker compose up -d
```

### Ambientes

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

### Criando o banco

```bash
# development (padrão)
uv run python -m licitai.db

# production
LICITAI_ENV=production uv run python -m licitai.db
```

Isso executa `CREATE EXTENSION IF NOT EXISTS vector` e `create_all` com todos os models.

### Estrutura

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

### Dependências de desenvolvimento

```bash
# instala grupo dev (ipython + pytest)
uv sync --group dev

# shell interativo com o pacote disponível
uv run ipython
```

## Uso

### Crawler (CLI)

Inicializa o banco e coleta licitações publicadas em um intervalo de datas:

```bash
python cli.py --init-db --data-inicio 2024-01-01 --data-fim 2024-01-31
```

Filtros opcionais:

```bash
# Apenas licitações da Bahia, modalidade Pregão (código 8)
python cli.py --data-inicio 2024-01-01 --data-fim 2024-01-31 --uf BA --modalidades 8
```

### API REST

```bash
uvicorn api.routes:app --reload
```

Endpoints principais:

| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/coletas` | Dispara nova coleta em background |
| `GET` | `/coletas` | Lista coletas recentes |
| `GET` | `/licitacoes` | Busca licitações com filtros (`q`, `uf`, `modalidade`, datas) |
| `GET` | `/licitacoes/{numero_controle_pncp}` | Detalhes de uma licitação |
| `GET` | `/modalidades` | Lista modalidades disponíveis |
| `GET` | `/estados` | Lista estados com contagem de licitações |

Documentação interativa disponível em `http://localhost:8000/docs`.

### Testes

```bash
pytest
```
