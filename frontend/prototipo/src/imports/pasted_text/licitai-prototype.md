Crie um protótipo de média fidelidade para o sistema LicitAI, 
uma plataforma web de busca inteligente de licitações públicas 
brasileiras. O sistema possui dois perfis: Usuário Público (acesso 
à busca e ao painel analítico) e Administrador (gestão da coleta 
de dados).

== IDENTIDADE VISUAL ==

Paleta restrita a 3 cores:
- Primária: azul (#1A3A5C) — botões principais, header, destaques
- Secundária: cinza claro (#F5F7FA) — backgrounds de seção
- Acento: azul médio (#2E6DA4) — links, badges, indicadores ativos
- Neutros: branco (#FFFFFF) para cards, #E2E8F0 para bordas, 
  #6B7280 para texto secundário, #111827 para texto principal

Tipografia: Inter ou equivalente sans-serif.
Tamanhos: 24px títulos de página, 18px subtítulos de seção, 
16px corpo, 13px labels e metadados.

Estilo geral: clean, flat, sem sombras exageradas. Cards com 
borda 1px sólida, border-radius 8px. Espaçamento generoso 
(padding mínimo de 24px nos containers).

== PRINCÍPIOS DE IHC A SEGUIR ==

1. Lei de Hick: reduzir opções visíveis na tela inicial ao mínimo 
   necessário. A busca é o centro absoluto da home.

2. Lei de Fitts: botões de ação primária grandes (mínimo 44px 
   altura), especialmente o botão "Buscar".

3. Gestalt — proximidade e agrupamento: agrupar visualmente 
   filtros relacionados (localização, valor, modalidade) em um 
   painel lateral coeso, separado da área de resultados.

4. Visibilidade do status do sistema (Nielsen #1): indicadores 
   claros de loading, número de resultados encontrados, tipo de 
   busca ativa (textual vs semântica).

5. Correspondência com o mundo real (Nielsen #2): usar linguagem 
   do usuário — "Pregão Eletrônico" em vez de "modalidade 6", 
   "Valor estimado" em vez de "valorTotalEstimado".

6. Controle e liberdade (Nielsen #3): botão "Limpar filtros" 
   sempre visível quando filtros estiverem ativos.

7. Reconhecimento em vez de recordação (Nielsen #6): mostrar 
   os filtros ativos como chips/tags removíveis acima dos 
   resultados para que o usuário veja o que está aplicado.

8. Flexibilidade (Nielsen #7): toggle entre modo de busca 
   Textual e Semântica visível e acessível, mas não intrusivo.

== TELAS A CRIAR ==

--- TELA 1: Home / Busca (Usuário Público) ---

Header fixo:
- Logo "LicitAI" à esquerda (ícone de lupa + texto)
- Nav com links: Buscar | Painel Analítico
- Sem login (usuário público não se autentica)

Área central (hero):
- Título: "Encontre licitações públicas com inteligência"
- Subtítulo pequeno: "Busca textual e semântica em tempo real 
  sobre dados do PNCP"
- Campo de busca largo (100% da largura do container, 56px 
  altura), placeholder: "Ex: computadores na Bahia acima de 
  R$ 1 milhão"
- Toggle discreto abaixo do campo com dois modos: 
  [Textual] [Semântica] — pill toggle, modo Semântica marcado 
  por padrão
- Botão "Buscar" azul primário, à direita do campo
- Sugestões rápidas como chips clicáveis abaixo: 
  "Pregão Eletrônico", "Obras", "Tecnologia da Informação", 
  "Dispensa de Licitação"

Seção abaixo (sem busca ativa):
- 3 cards informativos horizontais mostrando: total de 
  licitações indexadas, valor total indexado, última atualização
- Sem mais conteúdo. Manter a tela limpa.

Footer simples: "Dados extraídos do PNCP — Portal Nacional de 
Contratações Públicas"

--- TELA 2: Resultados de Busca (Usuário Público) ---

Header igual à Home.

Barra de contexto abaixo do header:
- Texto: '42 licitações encontradas para "computadores Bahia"'
- Toggle Textual/Semântica (mesmo da Home, mantém estado)
- Botão "Limpar filtros" visível somente se filtros ativos

Layout em duas colunas:

Coluna esquerda (280px) — Painel de filtros:
- Título "Filtros" com botão "Limpar tudo" à direita
- Filtro Estado (UF): dropdown com estados brasileiros
- Filtro Modalidade: checkboxes com as principais 
  (Pregão Eletrônico, Dispensa, Concorrência, Inexigibilidade)
- Filtro Valor estimado: dois campos numéricos (Mínimo / Máximo)
- Filtro Período de publicação: date range picker (De / Até)
- Filtro Situação: checkboxes (Divulgada, Suspensa, Revogada)
- Cada grupo de filtro separado por linha divisória fina

Coluna direita — Lista de resultados:
- Chips de filtros ativos removíveis acima da lista
  Ex: [BA ×] [Pregão Eletrônico ×] [Acima de R$ 1mi ×]
- Cards de resultado empilhados verticalmente, cada card com:
  * Badge de modalidade (cor sólida, texto branco) — canto 
    superior esquerdo. Ex: [Pregão Eletrônico]
  * Badge de situação — canto superior direito. 
    Ex: [Divulgada] em verde, [Suspensa] em amarelo
  * Título: objeto da licitação (2 linhas máximo, truncar)
  * Linha de metadados: ícone de localização + "Salvador, BA" 
    | ícone de calendário + "Publicado em 12/05/2026" 
    | ícone de prédio + nome do órgão (truncado)
  * Valor estimado em destaque: "R$ 2.450.000,00" (tamanho 18px, 
    azul primário)
  * Score de relevância semântica (só no modo Semântica): 
    barra de progresso fina + "92% de similaridade"
  * Botão "Ver detalhes" à direita, estilo ghost (borda, 
    sem preenchimento)
- Paginação simples no rodapé: setas + número de página

--- TELA 3: Detalhe da Licitação (Usuário Público) ---

Header igual.

Breadcrumb: Busca > Resultados > Detalhe

Área principal em duas colunas:

Coluna esquerda (65%):
- Badge de modalidade + Badge de situação (mesmos do card)
- Título grande: objeto da licitação completo
- Seção "Informações gerais" com grid 2x2:
  * Órgão contratante
  * Unidade administrativa
  * Município / UF
  * Número do processo
- Seção "Datas" com timeline horizontal simples:
  * Publicação → Abertura de propostas → Encerramento
- Seção "Objeto e descrição": texto completo da licitação
- Seção "Itens da licitação": tabela com colunas 
  Nº | Descrição | Quantidade | Unidade | Valor unitário
  Máximo 10 itens visíveis, botão "Ver todos os itens"

Coluna direita (35%) — card fixo (sticky):
- Valor estimado total em destaque
- Valor homologado (se disponível)
- Amparo legal
- Link externo "Acessar no PNCP" — botão primário azul, 
  ícone de link externo
- Número de controle PNCP (estilo código, fonte mono)
- Linha divisória
- Botão "Copiar link desta licitação" — estilo ghost

--- TELA 4: Painel Analítico (Usuário Público) ---

Header igual.

Título da página: "Painel analítico"
Seletor de período no topo direito: [Últimos 30 dias ▾]

Row de 4 cards métricos (igual largura):
- Total de licitações indexadas | número grande
- Valor total estimado | número grande
- Média por licitação | número grande
- Licitações com propostas abertas | número grande

Seção de gráficos em grid 2x2:
- Gráfico 1: barras horizontais "Licitações por modalidade"
- Gráfico 2: linha temporal "Publicações por mês"
- Gráfico 3: barras horizontais "Top 10 órgãos por volume"
- Gráfico 4: barras empilhadas "Distribuição por UF"

Nota: usar placeholders cinzas para os gráficos (média 
fidelidade), com título e eixos visíveis mas dados fictícios.

--- TELA 5: Login do Administrador ---

Tela centralizada, sem header de navegação.

Card central (400px largura):
- Logo LicitAI no topo do card
- Título: "Acesso administrativo"
- Campo Email
- Campo Senha (com ícone mostrar/ocultar)
- Botão "Entrar" — azul primário, largura total
- Texto abaixo: "Acesso restrito a administradores do sistema"

--- TELA 6: Painel do Administrador ---

Header com logo + nav: Coletas | Logs | Exportar | Sair

Título: "Painel administrativo"

Seção "Status do sistema" — 3 cards métricos:
- Última coleta: data e hora
- Total de licitações na base
- Status da API PNCP: [Operacional] em verde / [Instável] 
  em amarelo

Seção "Executar nova coleta":
- Formulário inline (não modal):
  * Dropdown "Modalidade" (todas ou específica)
  * Dropdown "UF" (todas ou específica)
  * Date picker "Data inicial" e "Data final"
  * Botão "Iniciar coleta" — azul primário
  * Checkbox "Agendar coleta diária automática"

Seção "Histórico de coletas" — tabela:
Colunas: Data/Hora | Modalidade | UF | Período | 
Registros | Status
Status com badges: [Concluída] verde | [Em andamento] azul 
com spinner | [Erro] vermelho
Ação: ícone de olho para ver logs da coleta

Seção "Logs do sistema":
- Área de texto estilo terminal (fundo #1E1E1E, texto #D4D4D4, 
  fonte mono 13px)
- Últimas 20 linhas de log visíveis
- Botão "Exportar logs" à direita

Seção "Exportar dados para BI":
- Descrição: "Gera arquivos CSV com o modelo dimensional 
  para importação no Power BI"
- Botões individuais: [Exportar fato_licitacao] 
  [Exportar dim_orgao] [Exportar dim_tempo] 
  [Exportar dim_modalidade]
- Botão principal: "Exportar todos (ZIP)"

== FLUXO DE NAVEGAÇÃO ==

Conectar as telas com os seguintes fluxos:

1. Home → digitar busca → clicar Buscar → Resultados
2. Resultados → clicar "Ver detalhes" → Detalhe da Licitação
3. Detalhe → clicar Breadcrumb "Resultados" → volta Resultados
4. Header "Painel Analítico" → Painel Analítico
5. (URL separada) Login Admin → Painel Administrador
6. Painel Admin → clicar "Iniciar coleta" → feedback inline 
   de progresso

== O QUE NÃO FAZER ==

- Não usar mais de 3 cores principais (evitar poluição visual)
- Não colocar banners, ilustrações decorativas ou ícones 
  excessivos
- Não usar modais para ações simples — preferir inline
- Não esconder filtros atrás de um botão "Mostrar filtros" 
  no desktop — mantê-los sempre visíveis na sidebar
- Não usar fonte abaixo de 13px em nenhum elemento
- Não usar bordas arredondadas maiores que 12px
- Sidebar de filtros não deve ter scroll interno — 
  organizar de forma que caiba na viewport

== FORMATO ESPERADO ==

- Viewport desktop: 1440px largura
- Criar também versão mobile (375px) das Telas 1 e 2
- Componentes reutilizáveis: Header, Card de resultado, 
  Badge de modalidade, Badge de situação, Chip de filtro ativo
- Usar Auto Layout do Figma em todos os componentes
- Espaçamento base: múltiplos de 8px (8, 16, 24, 32, 48)