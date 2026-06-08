'use client';

import { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/components/header';
import { FilterChip } from '@/components/filter-chip';
import { formatValorBRL } from '@/lib/utils';
import {
  Search,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Calendar,
  Building2,
  ArrowUpDown,
  X,
  Sparkles,
} from 'lucide-react';

const MODALIDADES = ['Pregão Eletrônico', 'Dispensa', 'Concorrência', 'Inexigibilidade'];
const SITUACOES = ['Divulgada', 'Suspensa', 'Revogada'];
const UFS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];
const SORT_OPTIONS = [
  { value: 'relevancia', label: 'Relevância' },
  { value: 'data_desc', label: 'Mais recentes' },
  { value: 'valor_desc', label: 'Maior valor' },
  { value: 'valor_asc', label: 'Menor valor' },
];

const TITULOS = [
  'Aquisição de equipamentos de informática para modernização do parque tecnológico',
  'Contratação de serviços de desenvolvimento de software e manutenção de sistemas',
  'Fornecimento de material de consumo para manutenção predial e serviços gerais',
  'Locação de veículos automotores para atendimento às demandas administrativas',
  'Contratação de empresa especializada em serviços de limpeza e conservação',
  'Aquisição de mobiliário corporativo para reforma das instalações administrativas',
  'Prestação de serviços de segurança patrimonial armada e desarmada',
  'Contratação de solução de videoconferência e comunicação unificada',
  'Aquisição de equipamentos médico-hospitalares para unidades de saúde',
  'Construção de unidade de pronto atendimento — UPA 24 horas',
  'Reforma e adequação de instalações elétricas e hidráulicas prediais',
  'Contratação de serviços de auditoria contábil e financeira',
];
const ORGAOS = [
  'Secretaria de Administração do Estado da Bahia',
  'Ministério da Saúde — Departamento de Logística',
  'Prefeitura Municipal de Salvador',
  'Tribunal Regional Federal da 1ª Região',
  'Universidade Federal da Bahia — UFBA',
  'DATAPREV — Empresa de Tecnologia e Informações',
];
const CIDADES = [
  { cidade: 'Salvador', uf: 'BA' },
  { cidade: 'São Paulo', uf: 'SP' },
  { cidade: 'Brasília', uf: 'DF' },
  { cidade: 'Belo Horizonte', uf: 'MG' },
  { cidade: 'Curitiba', uf: 'PR' },
  { cidade: 'Porto Alegre', uf: 'RS' },
];
const MODS = ['Pregão Eletrônico', 'Dispensa', 'Concorrência', 'Inexigibilidade'];
const SITS = ['divulgada', 'divulgada', 'divulgada', 'suspensa', 'revogada'] as const;

type Situacao = (typeof SITS)[number];

interface Licitacao {
  id: string;
  modalidade: string;
  situacao: Situacao;
  titulo: string;
  orgao: string;
  cidade: string;
  uf: string;
  dataPublicacao: string;
  valorEstimado: number;
  similaridade: number;
}

function buildMockData(): Licitacao[] {
  return Array.from({ length: 42 }, (_, i) => ({
    id: `licit-${i + 1}`,
    modalidade: MODS[i % MODS.length],
    situacao: SITS[i % SITS.length],
    titulo: TITULOS[i % TITULOS.length],
    orgao: ORGAOS[i % ORGAOS.length],
    ...CIDADES[i % CIDADES.length],
    dataPublicacao: `${String((i % 28) + 1).padStart(2, '0')}/05/2026`,
    valorEstimado: 450000 + i * 137500,
    similaridade: Math.max(55, 97 - i * 2),
  }));
}

const ALL_LICITACOES = buildMockData();
const PER_PAGE = 8;

const SITUACAO_COLORS: Record<Situacao, string> = {
  divulgada: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  suspensa: 'bg-amber-50 text-amber-700 border-amber-200',
  revogada: 'bg-red-50 text-red-700 border-red-200',
};

export function ResultadosContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialQuery = searchParams.get('q') ?? '';
  const initialMode = searchParams.get('mode') ?? 'semantica';

  const [inputValue, setInputValue] = useState(initialQuery);
  const [query, setQuery] = useState(initialQuery);
  const [isSemanticActive, setIsSemanticActive] = useState(initialMode === 'semantica');
  const [sortBy, setSortBy] = useState('relevancia');
  const [currentPage, setCurrentPage] = useState(1);

  const [ufFilter, setUfFilter] = useState('');
  const [modalidadeFilters, setModalidadeFilters] = useState<string[]>([]);
  const [situacaoFilters, setSituacaoFilters] = useState<string[]>([]);
  const [valorMin, setValorMin] = useState('');
  const [valorMax, setValorMax] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  const hasActiveFilters =
    !!ufFilter ||
    modalidadeFilters.length > 0 ||
    situacaoFilters.length > 0 ||
    !!valorMin ||
    !!valorMax ||
    !!dataInicio ||
    !!dataFim;

  const clearAllFilters = () => {
    setUfFilter('');
    setModalidadeFilters([]);
    setSituacaoFilters([]);
    setValorMin('');
    setValorMax('');
    setDataInicio('');
    setDataFim('');
    setCurrentPage(1);
  };

  const toggleModalidade = (m: string) =>
    setModalidadeFilters((prev) =>
      prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]
    );

  const toggleSituacao = (s: string) =>
    setSituacaoFilters((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );

  const handleSearch = () => {
    if (!inputValue.trim()) return;
    const q = inputValue.trim();
    setQuery(q);
    setCurrentPage(1);
    router.push(`/resultados?q=${encodeURIComponent(q)}&mode=${isSemanticActive ? 'semantica' : 'textual'}`);
  };

  const filtered = ALL_LICITACOES.filter((l) => {
    if (ufFilter && l.uf !== ufFilter) return false;
    if (modalidadeFilters.length > 0 && !modalidadeFilters.includes(l.modalidade)) return false;
    if (
      situacaoFilters.length > 0 &&
      !situacaoFilters.map((s) => s.toLowerCase()).includes(l.situacao)
    )
      return false;
    if (valorMin && l.valorEstimado < Number(valorMin)) return false;
    if (valorMax && l.valorEstimado > Number(valorMax)) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'data_desc') return b.id.localeCompare(a.id);
    if (sortBy === 'valor_desc') return b.valorEstimado - a.valorEstimado;
    if (sortBy === 'valor_asc') return a.valorEstimado - b.valorEstimado;
    return b.similaridade - a.similaridade;
  });

  const totalPages = Math.max(1, Math.ceil(sorted.length / PER_PAGE));
  const pageItems = sorted.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);

  const goToPage = (p: number) => {
    setCurrentPage(Math.max(1, Math.min(totalPages, p)));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const pageNumbers = (() => {
    const pages: (number | '...')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  })();

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      <Header />

      {/* Search refinement strip */}
      <div className="bg-[#1A3A5C] px-8 py-4">
        <div className="max-w-7xl mx-auto flex gap-3 items-center">
          <div className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280]" />
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Refinar busca..."
                className="w-full h-11 pl-10 pr-4 bg-white border border-white/20 rounded-lg text-[15px] text-[#111827] placeholder:text-[#6B7280] focus:outline-none focus:ring-2 focus:ring-white/40"
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={!inputValue.trim()}
              className="px-5 h-11 bg-white text-[#1A3A5C] rounded-lg font-medium text-[15px] hover:bg-[#F5F7FA] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Buscar
            </button>
          </div>

          <div className="flex items-center gap-2 ml-4">
            <button
              onClick={() => setIsSemanticActive((v) => !v)}
              role="switch"
              aria-checked={isSemanticActive}
              aria-label="Toggle busca semântica"
              className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${
                isSemanticActive ? 'bg-[#2E6DA4]' : 'bg-white/30'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                  isSemanticActive ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
            <span className="text-[13px] text-white/90 flex items-center gap-1 whitespace-nowrap">
              <Sparkles className="w-3.5 h-3.5" />
              Busca semântica
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* Results meta bar */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-[15px] text-[#111827]">
              <span className="font-medium text-[#1A3A5C]">{filtered.length} licitações</span>{' '}
              encontradas
              {query && (
                <>
                  {' '}para <span className="font-medium">"{query}"</span>
                </>
              )}
            </p>
            {hasActiveFilters && (
              <p className="text-[13px] text-[#6B7280] mt-0.5">Com filtros aplicados</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-4 h-4 text-[#6B7280]" />
            <select
              value={sortBy}
              onChange={(e) => { setSortBy(e.target.value); setCurrentPage(1); }}
              className="h-9 px-3 bg-white border border-[#E2E8F0] rounded text-[13px] text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#2E6DA4] cursor-pointer"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Active filter chips */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2 mb-5">
            {ufFilter && (
              <FilterChip label={`UF: ${ufFilter}`} onRemove={() => { setUfFilter(''); setCurrentPage(1); }} />
            )}
            {modalidadeFilters.map((m) => (
              <FilterChip key={m} label={m} onRemove={() => { toggleModalidade(m); setCurrentPage(1); }} />
            ))}
            {situacaoFilters.map((s) => (
              <FilterChip key={s} label={s} onRemove={() => { toggleSituacao(s); setCurrentPage(1); }} />
            ))}
            {valorMin && (
              <FilterChip
                label={`Mín: R$ ${Number(valorMin).toLocaleString('pt-BR')}`}
                onRemove={() => { setValorMin(''); setCurrentPage(1); }}
              />
            )}
            {valorMax && (
              <FilterChip
                label={`Máx: R$ ${Number(valorMax).toLocaleString('pt-BR')}`}
                onRemove={() => { setValorMax(''); setCurrentPage(1); }}
              />
            )}
            <button
              onClick={clearAllFilters}
              className="flex items-center gap-1 text-[13px] text-[#6B7280] hover:text-[#111827] transition-colors ml-1"
            >
              <X className="w-3.5 h-3.5" /> Limpar filtros
            </button>
          </div>
        )}

        <div className="flex gap-6">
          {/* Sidebar filters */}
          <aside className="w-64 flex-shrink-0">
            <div className="bg-white border border-[#E2E8F0] rounded-lg overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-[#E2E8F0]">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-[#1A3A5C]" />
                  <h2 className="text-[15px] text-[#111827] font-medium">Filtros</h2>
                </div>
                {hasActiveFilters && (
                  <button onClick={clearAllFilters} className="text-[12px] text-[#2E6DA4] hover:underline">
                    Limpar
                  </button>
                )}
              </div>

              <div className="divide-y divide-[#E2E8F0]">
                {/* UF */}
                <div className="px-5 py-4">
                  <label className="block text-[12px] font-medium text-[#6B7280] uppercase tracking-wide mb-2">
                    Estado (UF)
                  </label>
                  <select
                    value={ufFilter}
                    onChange={(e) => { setUfFilter(e.target.value); setCurrentPage(1); }}
                    className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded text-[13px] text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#2E6DA4]"
                  >
                    <option value="">Todos os estados</option>
                    {UFS.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
                  </select>
                </div>

                {/* Modalidade */}
                <div className="px-5 py-4">
                  <label className="block text-[12px] font-medium text-[#6B7280] uppercase tracking-wide mb-3">
                    Modalidade
                  </label>
                  <div className="space-y-2">
                    {MODALIDADES.map((m) => (
                      <label key={m} className="flex items-center gap-2 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={modalidadeFilters.includes(m)}
                          onChange={() => { toggleModalidade(m); setCurrentPage(1); }}
                          className="w-4 h-4 rounded border-[#E2E8F0] accent-[#1A3A5C]"
                        />
                        <span className="text-[13px] text-[#111827] group-hover:text-[#1A3A5C] transition-colors">
                          {m}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Situação */}
                <div className="px-5 py-4">
                  <label className="block text-[12px] font-medium text-[#6B7280] uppercase tracking-wide mb-3">
                    Situação
                  </label>
                  <div className="space-y-2">
                    {SITUACOES.map((s) => (
                      <label key={s} className="flex items-center gap-2 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={situacaoFilters.includes(s)}
                          onChange={() => { toggleSituacao(s); setCurrentPage(1); }}
                          className="w-4 h-4 rounded border-[#E2E8F0] accent-[#1A3A5C]"
                        />
                        <span className="text-[13px] text-[#111827] group-hover:text-[#1A3A5C] transition-colors">
                          {s}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Valor */}
                <div className="px-5 py-4">
                  <label className="block text-[12px] font-medium text-[#6B7280] uppercase tracking-wide mb-3">
                    Valor estimado (R$)
                  </label>
                  <div className="space-y-2">
                    <input
                      type="number"
                      value={valorMin}
                      onChange={(e) => { setValorMin(e.target.value); setCurrentPage(1); }}
                      placeholder="Mínimo"
                      className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded text-[13px] text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#2E6DA4]"
                    />
                    <input
                      type="number"
                      value={valorMax}
                      onChange={(e) => { setValorMax(e.target.value); setCurrentPage(1); }}
                      placeholder="Máximo"
                      className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded text-[13px] text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#2E6DA4]"
                    />
                  </div>
                </div>

                {/* Data publicação */}
                <div className="px-5 py-4">
                  <label className="block text-[12px] font-medium text-[#6B7280] uppercase tracking-wide mb-3">
                    Publicação
                  </label>
                  <div className="space-y-2">
                    <input
                      type="date"
                      value={dataInicio}
                      onChange={(e) => { setDataInicio(e.target.value); setCurrentPage(1); }}
                      className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded text-[13px] text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#2E6DA4]"
                    />
                    <input
                      type="date"
                      value={dataFim}
                      onChange={(e) => { setDataFim(e.target.value); setCurrentPage(1); }}
                      className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded text-[13px] text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#2E6DA4]"
                    />
                  </div>
                </div>
              </div>
            </div>
          </aside>

          {/* Results list */}
          <div className="flex-1 min-w-0">
            {pageItems.length === 0 ? (
              <div className="bg-white border border-[#E2E8F0] rounded-lg py-20 text-center">
                <Search className="w-10 h-10 text-[#E2E8F0] mx-auto mb-4" />
                <p className="text-[16px] text-[#111827] font-medium mb-1">
                  Nenhuma licitação encontrada
                </p>
                <p className="text-[13px] text-[#6B7280] mb-4">
                  Tente outros termos ou remova alguns filtros.
                </p>
                <button
                  onClick={clearAllFilters}
                  className="px-4 py-2 text-[13px] text-[#2E6DA4] border border-[#2E6DA4] rounded hover:bg-[#F5F7FA] transition-colors"
                >
                  Limpar filtros
                </button>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {pageItems.map((lic) => (
                    <div
                      key={lic.id}
                      className="bg-white border border-[#E2E8F0] rounded-lg p-5 hover:border-[#2E6DA4] hover:shadow-sm transition-all group"
                    >
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2.5 py-0.5 bg-[#F5F7FA] text-[#1A3A5C] text-[12px] font-medium rounded border border-[#E2E8F0]">
                            {lic.modalidade}
                          </span>
                          <span
                            className={`px-2.5 py-0.5 text-[12px] font-medium rounded border capitalize ${SITUACAO_COLORS[lic.situacao]}`}
                          >
                            {lic.situacao}
                          </span>
                        </div>
                        {isSemanticActive && (
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <Sparkles className="w-3.5 h-3.5 text-[#2E6DA4]" />
                            <span className="text-[12px] font-medium text-[#2E6DA4]">
                              {lic.similaridade}%
                            </span>
                          </div>
                        )}
                      </div>

                      <h3 className="text-[15px] text-[#111827] font-medium leading-snug mb-3 line-clamp-2 group-hover:text-[#1A3A5C] transition-colors">
                        {lic.titulo}
                      </h3>

                      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 mb-4 text-[13px] text-[#6B7280]">
                        <span className="flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 flex-shrink-0" />
                          <span className="truncate max-w-[280px]">{lic.orgao}</span>
                        </span>
                        <span className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                          {lic.cidade}, {lic.uf}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                          {lic.dataPublicacao}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[11px] text-[#6B7280] mb-0.5">Valor estimado</p>
                          <p className="text-[17px] text-[#1A3A5C] font-medium">
                            {formatValorBRL(lic.valorEstimado)}
                          </p>
                        </div>
                        <Link
                          href={`/licitacao/${lic.id}`}
                          className="px-4 py-2 bg-[#1A3A5C] text-white text-[13px] font-medium rounded hover:bg-[#2E6DA4] transition-colors"
                        >
                          Ver detalhes
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between mt-8">
                  <p className="text-[13px] text-[#6B7280]">
                    Exibindo {(currentPage - 1) * PER_PAGE + 1}–
                    {Math.min(currentPage * PER_PAGE, filtered.length)} de {filtered.length}
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => goToPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      aria-label="Página anterior"
                      className="w-9 h-9 flex items-center justify-center rounded border border-[#E2E8F0] bg-white text-[#6B7280] hover:bg-[#F5F7FA] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    {pageNumbers.map((p, i) =>
                      p === '...' ? (
                        <span
                          key={`ellipsis-${i}`}
                          className="w-9 h-9 flex items-center justify-center text-[13px] text-[#6B7280]"
                        >
                          …
                        </span>
                      ) : (
                        <button
                          key={p}
                          onClick={() => goToPage(p)}
                          className={`w-9 h-9 flex items-center justify-center rounded border text-[13px] transition-colors ${
                            currentPage === p
                              ? 'bg-[#1A3A5C] border-[#1A3A5C] text-white font-medium'
                              : 'bg-white border-[#E2E8F0] text-[#111827] hover:bg-[#F5F7FA]'
                          }`}
                        >
                          {p}
                        </button>
                      )
                    )}
                    <button
                      onClick={() => goToPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      aria-label="Próxima página"
                      className="w-9 h-9 flex items-center justify-center rounded border border-[#E2E8F0] bg-white text-[#6B7280] hover:bg-[#F5F7FA] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
