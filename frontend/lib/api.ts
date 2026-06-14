const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

// ── tipos ──────────────────────────────────────────────────────────────────

export interface Modalidade {
  id_modalidade: number;
  nome: string;
}

export interface LicitacaoResumo {
  id_licitacao: string;
  numero_controle_pncp: string;
  objeto_compra: string | null;
  valor_total_estimado: string | null;
  data_publicacao_pncp: string | null;
  situacao_id: number | null;
  uf: string | null;
  modalidade_nome: string | null;
}

export interface PaginatedLicitacoes {
  total: number;
  pagina: number;
  tamanho: number;
  resultados: LicitacaoResumo[];
}

export interface LicitacaoDetalhe {
  id_licitacao: string;
  numero_controle_pncp: string;
  numero_compra: string | null;
  ano_compra: number | null;
  objeto_compra: string | null;
  valor_total_estimado: string | null;
  valor_total_homologado: string | null;
  situacao_id: number | null;
  srp: boolean | null;
  data_publicacao_pncp: string | null;
  data_abertura_proposta: string | null;
  data_encerramento_proposta: string | null;
  uf: string | null;
  municipio: string | null;
  orgao_cnpj: string | null;
  orgao_razao_social: string | null;
  modalidade_nome: string | null;
}

export interface EstadoOut {
  uf: string;
  nome: string;
  total: number;
}

export interface ColetaOut {
  id_coleta: string;
  status: string;
  modalidade_filtro: number | null;
  uf_filtro: string | null;
  data_inicio_coleta: string;
  data_fim_coleta: string;
  total_registros: number;
  executado_em: string | null;
}

export interface ColetaSolicitacao {
  data_inicio: string;
  data_fim: string;
  modalidades: number[];
  uf: string | null;
}

// ── helpers ────────────────────────────────────────────────────────────────

export const SITUACAO_LABEL: Record<number, string> = {
  1: 'Divulgada',
  2: 'Encerrada',
  3: 'Revogada',
  4: 'Anulada',
  5: 'Suspensa',
  6: 'Deserta',
  7: 'Fracassada',
};

export const SITUACAO_COLOR: Record<number, string> = {
  1: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  2: 'bg-gray-50 text-gray-600 border-gray-200',
  3: 'bg-red-50 text-red-700 border-red-200',
  4: 'bg-red-50 text-red-700 border-red-200',
  5: 'bg-amber-50 text-amber-700 border-amber-200',
  6: 'bg-gray-50 text-gray-600 border-gray-200',
  7: 'bg-red-50 text-red-700 border-red-200',
};

export interface FacetModalidade {
  id_modalidade: number;
  nome: string;
  total: number;
}

export interface FacetUF {
  uf: string;
  nome: string;
  total: number;
}

export interface FacetSituacao {
  situacao_id: number;
  total: number;
}

export interface FiltrosOut {
  total: number;
  modalidades: FacetModalidade[];
  ufs: FacetUF[];
  situacoes: FacetSituacao[];
}

export function formatData(iso: string | null): string {
  if (!iso) return 'Sem data';
  const [year, month, day] = iso.substring(0, 10).split('-');
  return `${day}/${month}/${year}`;
}

export function formatValor(valor: string | number | null): string {
  if (valor === null || valor === undefined) return 'Não informado';
  const n = typeof valor === 'string' ? parseFloat(valor) : valor;
  if (isNaN(n)) return 'Não informado';
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// ── funções de API ─────────────────────────────────────────────────────────

async function get<T>(path: string, params?: Record<string, string | number | null | undefined>): Promise<T> {
  const url = new URL(path, API_URL);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v != null && v !== '') url.searchParams.set(k, String(v));
    }
  }
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

export async function getModalidades(): Promise<Modalidade[]> {
  return get('/modalidades');
}

export async function getEstados(): Promise<EstadoOut[]> {
  return get('/estados');
}

export async function getFiltros(params: {
  q?: string;
  uf?: string;
  modalidade?: number | null;
  situacao_id?: number | null;
  data_inicio?: string;
  data_fim?: string;
}): Promise<FiltrosOut> {
  return get('/licitacoes/filtros', {
    q: params.q || undefined,
    uf: params.uf || undefined,
    modalidade: params.modalidade ?? undefined,
    situacao_id: params.situacao_id ?? undefined,
    data_inicio: params.data_inicio || undefined,
    data_fim: params.data_fim || undefined,
  });
}

export async function buscarTextual(params: {
  q?: string;
  uf?: string;
  modalidade?: number | null;
  situacao_id?: number | null;
  data_inicio?: string;
  data_fim?: string;
  pagina?: number;
  tamanho?: number;
}): Promise<PaginatedLicitacoes> {
  return get('/licitacoes', {
    q: params.q || undefined,
    uf: params.uf || undefined,
    modalidade: params.modalidade ?? undefined,
    situacao_id: params.situacao_id ?? undefined,
    data_inicio: params.data_inicio || undefined,
    data_fim: params.data_fim || undefined,
    pagina: params.pagina ?? 1,
    tamanho: params.tamanho ?? 8,
  });
}

export async function buscarSemantica(params: {
  q: string;
  uf?: string;
  modalidade?: number | null;
  limite?: number;
}): Promise<LicitacaoResumo[]> {
  return post('/busca/semantica', {
    q: params.q,
    uf: params.uf || undefined,
    modalidade: params.modalidade || undefined,
    limite: params.limite ?? 50,
  });
}

export async function getLicitacao(numeroPncp: string): Promise<LicitacaoDetalhe> {
  return get(`/licitacoes/${encodeURIComponent(numeroPncp)}`);
}

export async function getColetas(): Promise<ColetaOut[]> {
  return get('/coletas');
}

export async function iniciarColeta(body: ColetaSolicitacao): Promise<void> {
  await post('/coletas', body);
}
