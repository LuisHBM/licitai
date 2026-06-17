# Camada Analítica (Star Schema / OLAP) — Sprint V

Esta camada implementa a etapa analítica do projeto: faz o **ETL** das tabelas
operacionais para um **modelo dimensional (esquema estrela)**, expõe os dados em
**CSV** para a ferramenta OLAP (Power BI) e alimenta o **painel analítico** do
front-end via API REST.

## 1. Conceito: por que um modelo dimensional?

O banco operacional (`licitacao`, `unidade`, `orgao`, `modalidade`, …) é
**normalizado** — ótimo para gravar dados sem redundância, ruim para análise
(exige muitos JOINs e varre tabelas grandes a cada agregação).

O modelo dimensional inverte a prioridade: é **desnormalizado** e otimizado para
*consultar e somar*. Tem uma **tabela fato** no centro (os números) cercada por
**dimensões** (os eixos de análise: quando, onde, qual modalidade, qual órgão).

```
                       dim_tempo
                           |
    dim_orgao  ----  fato_licitacao  ----  dim_modalidade
                           |
                        dim_uf
```

| Conceito | Tabela | Papel |
|---|---|---|
| Fato | `fato_licitacao` | 1 linha por licitação; guarda as **métricas** |
| Dimensão tempo | `dim_tempo` | ano, trimestre, mês, quadriênio (janela CAPES) |
| Dimensão órgão | `dim_orgao` | órgão + unidade achatados (razão social, esfera, poder, município) |
| Dimensão modalidade | `dim_modalidade` | Pregão, Dispensa, Inexigibilidade… |
| Dimensão UF | `dim_uf` | UF, nome, região |

**Métricas (aditivas) do fato:** `valor_estimado`, `valor_homologado`,
`economia` (estimado − homologado), `qtd_itens`, e a contagem de linhas. Podem
ser somadas em qualquer combinação de dimensões.

> **Mapeamento com o enunciado:** o doc usa o exemplo de pesquisadores
> (fato = produção científica, dim Pesquisador, dim Quadrienal-Ano). Aqui o
> fato é a **licitação**, a dim "Pesquisador" vira **dim_orgao**, e a dim
> "Quadrienal-Ano" está em **dim_tempo** (coluna `quadrienal` + `ano`).

## 2. Arquivos

| Arquivo | Responsabilidade |
|---|---|
| `backend/db/models.py` | Modelos SQLAlchemy das dimensões e do fato |
| `backend/alembic/versions/0003_star_schema.py` | Migration que cria as tabelas |
| `backend/analytics/star_schema.py` | ETL (`rebuild_star_schema`), consultas do painel e geração de CSV |
| `backend/api/routes.py` | Endpoints `/analitico/*` |
| `frontend/app/painel/page.tsx` | Painel que consome os endpoints |

## 3. Como rodar

```bash
# 1. Aplicar a migration do star schema
cd backend
DATABASE_URL=postgresql://... python -m alembic upgrade head

# 2. Popular o modelo dimensional a partir das tabelas operacionais
#    (rode após cada coleta do crawler)
curl -X POST http://localhost:8000/analitico/rebuild
```

O `rebuild` faz **full-refresh**: limpa e repopula todas as dimensões e o fato.
É idempotente — pode rodar quantas vezes quiser.

## 4. Endpoints

### JSON (alimentam o painel Next.js)

| Método | Rota | Retorno |
|---|---|---|
| `POST` | `/analitico/rebuild` | Reconstrói o star schema; retorna contagens |
| `GET` | `/analitico/resumo?dias=365` | Cards: total, valor total/médio, abertas |
| `GET` | `/analitico/por-modalidade` | `[{name, value}]` |
| `GET` | `/analitico/por-mes` | `[{mes, ano_mes, total}]` |
| `GET` | `/analitico/top-orgaos?limite=10` | `[{name, value}]` |
| `GET` | `/analitico/por-uf` | `[{name, federal, estadual, municipal, outros}]` |

O parâmetro opcional `dias` filtra os últimos N dias (relativo a hoje).

### CSV (consumidos pelo Power BI)

```
GET /analitico/csv/dim_tempo
GET /analitico/csv/dim_modalidade
GET /analitico/csv/dim_uf
GET /analitico/csv/dim_orgao
GET /analitico/csv/fato_licitacao
```

Cada um devolve `text/csv` com `Content-Disposition: attachment` (download
direto). O nome da tabela é validado contra uma whitelist (sem injeção de SQL).

## 5. Conectando ao Power BI

O Power BI vai montar **o mesmo modelo estrela** que o banco, relacionando o
fato às dimensões. Dois caminhos:

### Opção A — Importar os CSVs (entrega oficial da Sprint V)

1. **Obter os arquivos** (com a API rodando):
   ```bash
   for t in dim_tempo dim_modalidade dim_uf dim_orgao fato_licitacao; do
     curl -s "http://localhost:8000/analitico/csv/$t" -o "$t.csv"
   done
   ```
2. No Power BI Desktop: **Página Inicial → Obter Dados → Texto/CSV** e importe
   os 5 arquivos (um a um). Em cada um, confira o tipo das colunas (datas,
   números) na janela de prévia.
3. **Modelo (ícone de tabelas na lateral)** — crie as relações arrastando:
   - `fato_licitacao[id_tempo]` → `dim_tempo[id_tempo]`
   - `fato_licitacao[id_dim_modalidade]` → `dim_modalidade[id_dim_modalidade]`
   - `fato_licitacao[id_dim_orgao]` → `dim_orgao[id_dim_orgao]`
   - `fato_licitacao[uf]` → `dim_uf[uf]`

   Todas são **1 (dimensão) → N (fato)**, direção de filtro **simples**. O
   resultado visual é uma estrela.
4. **Medidas (DAX)** sobre o fato, ex.:
   ```DAX
   Total Licitações  = COUNTROWS(fato_licitacao)
   Valor Estimado    = SUM(fato_licitacao[valor_estimado])
   Valor Homologado  = SUM(fato_licitacao[valor_homologado])
   Economia          = SUM(fato_licitacao[economia])
   Ticket Médio      = DIVIDE([Valor Estimado], [Total Licitações])
   ```
5. **Visuais**: gráfico de barras `Valor Estimado` por `dim_modalidade[nome]`,
   linha de `Total Licitações` por `dim_tempo[ano_mes]`, mapa/barras por
   `dim_uf[uf]`/`regiao`, e segmentação (slicer) por `dim_tempo[quadrienal]`.

### Opção B — Conectar direto no PostgreSQL (dados ao vivo)

**Obter Dados → Banco de dados PostgreSQL**, apontar para o banco e selecionar
as 5 tabelas do star schema. As relações e medidas são iguais à Opção A. Útil
para dashboard que atualiza sozinho; a Opção A (CSV) é a que o enunciado pede
como artefato.

## 6. Fluxo completo

```
PNCP → crawler/ETL → tabelas operacionais → POST /analitico/rebuild
        → star schema (dim_* + fato_licitacao)
            ├── GET /analitico/*  → painel Next.js (ao vivo)
            └── GET /analitico/csv/* → Power BI (.pbix, entrega Sprint V)
```
