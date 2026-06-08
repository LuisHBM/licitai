'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/components/header';
import { FilterChip } from '@/components/filter-chip';
import {
  buscarTextual,
  buscarSemantica,
  getModalidades,
  type Modalidade,
  type LicitacaoResumo,
  SITUACAO_LABEL,
  SITUACAO_COLOR,
  formatData,
  formatValor,
} from '@/lib/api';
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
  Loader2,
  AlertCircle,
} from 'lucide-react';

const UFS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

const SITUACOES = [
  { id: 1, label: 'Divulgada' },
  { id: 5, label: 'Suspensa' },
  { id: 3, label: 'Revogada' },
];

const SORT_OPTIONS = [
  { value: 'relevancia', label: 'Relevância' },
  { value: 'data_desc', label: 'Mais recentes' },
];

const PER_PAGE = 8;

export function ResultadosContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialQuery = searchParams.get('q') ?? '';
  const initialMode = searchParams.get('mode') ?? 'semantica';

  const [inputValue, setInputValue] = useState(initialQuery);
  const [query, setQuery] = useState(initialQuery);
  const [isSemanticActive, setIsSemanticActive] = useState(initialMode === 'semantica');
  const [currentPage, setCurrentPage] = useState(1);

  const [ufFilter, setUfFilter] = useState('');
  const [modalidadeFilter, setModalidadeFilter] = useState<number | null>(null);
  const [situacaoFilter, setSituacaoFilter] = useState<number | null>(null);
  const [valorMin, setValorMin] = useState('');
  const [valorMax, setValorMax] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  const [modalidades, setModalidades] = useState<Modalidade[]>([]);
  const [resultados, setResultados] = useState<LicitacaoResumo[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getModalidades().then(setModalidades).catch(() => {});
  }, []);

  const hasActiveFilters = !!ufFilter || modalidadeFilter !== null || situacaoFilter !== null || !!valorMin || !!valorMax || !!dataInicio || !!dataFim;

  const clearAllFilters = () => {
    setUfFilter('');
    setModalidadeFilter(null);
    setSituacaoFilter(null);
    setValorMin('');
    setValorMax('');
    setDataInicio('');
    setDataFim('');
    setCurrentPage(1);
  };

  const fetchResultados = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (isSemanticActive && query) {
        const rows = await buscarSemantica({
          q: query,
          uf: ufFilter || undefined,
          modalidade: modalidadeFilter,
          limite: 100,
        });
        let filtered = rows;
        if (valorMin) filtered = filtered.filter((r) => parseFloat(r.valor_total_estimado ?? '0') >= Number(valorMin));
        if (valorMax) filtered = filtered.filter((r) => parseFloat(r.valor_total_estimado ?? '0') <= Number(valorMax));
        setTotal(filtered.length);
        setTotalPages(Math.max(1, Math.ceil(filtered.length / PER_PAGE)));
        setResultados(filtered.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE));
      } else {
        const data = await buscarTextual({
          q: query || undefined,
          uf: ufFilter || undefined,
          modalidade: modalidadeFilter,
          situacao_id: situacaoFilter,
          data_inicio: dataInicio || undefined,
          data_fim: dataFim || undefined,
          pagina: currentPage,
          tamanho: PER_PAGE,
        });
        let filtered = data.resultados;
        if (valorMin) filtered = filtered.filter((r) => parseFloat(r.valor_total_estimado ?? '0') >= Number(valorMin));
        if (valorMax) filtered = filtered.filter((r) => parseFloat(r.valor_total_estimado ?? '0') <= Number(valorMax));
        setTotal(data.total);
        setTotalPages(Math.max(1, Math.ceil(data.total / PER_PAGE)));
        setResultados(filtered);
      }
    } catch (e) {
      setError('Não foi possível conectar à API. Verifique se o backend está rodando.');
      setResultados([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [query, isSemanticActive, ufFilter, modalidadeFilter, situacaoFilter, valorMin, valorMax, dataInicio, dataFim, currentPage]);

  useEffect(() => {
    fetchResultados();
  }, [fetchResultados]);

  const handleSearch = () => {
    if (!inputValue.trim()) return;
    const q = inputValue.trim();
    setQuery(q);
    setCurrentPage(1);
    router.push(`/resultados?q=${encodeURIComponent(q)}&mode=${isSemanticActive ? 'semantica' : 'textual'}`);
  };

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
      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) pages.push(i);
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
              onClick={() => { setIsSemanticActive((v) => !v); setCurrentPage(1); }}
              role="switch"
              aria-checked={isSemanticActive}
              aria-label="Toggle busca semântica"
              className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${isSemanticActive ? 'bg-[#2E6DA4]' : 'bg-white/30'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${isSemanticActive ? 'translate-x-5' : 'translate-x-0'}`} />
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
              {loading ? (
                <span className="text-[#6B7280]">Buscando...</span>
              ) : (
                <>
                  <span className="font-medium text-[#1A3A5C]">{total} licitações</span> encontradas
                  {query && <> para <span className="font-medium">"{query}"</span></>}
                </>
              )}
            </p>
            {hasActiveFilters && <p className="text-[13px] text-[#6B7280] mt-0.5">Com filtros aplicados</p>}
          </div>
          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-4 h-4 text-[#6B7280]" />
            <select
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
            {ufFilter && <FilterChip label={`UF: ${ufFilter}`} onRemove={() => { setUfFilter(''); setCurrentPage(1); }} />}
            {modalidadeFilter !== null && (
              <FilterChip
                label={modalidades.find((m) => m.id_modalidade === modalidadeFilter)?.nome ?? `Modalidade ${modalidadeFilter}`}
                onRemove={() => { setModalidadeFilter(null); setCurrentPage(1); }}
              />
            )}
            {situacaoFilter !== null && (
              <FilterChip
                label={SITUACAO_LABEL[situacaoFilter] ?? `Situação ${situacaoFilter}`}
                onRemove={() => { setSituacaoFilter(null); setCurrentPage(1); }}
              />
            )}
            {valorMin && <FilterChip label={`Mín: R$ ${Number(valorMin).toLocaleString('pt-BR')}`} onRemove={() => { setValorMin(''); setCurrentPage(1); }} />}
            {valorMax && <FilterChip label={`Máx: R$ ${Number(valorMax).toLocaleString('pt-BR')}`} onRemove={() => { setValorMax(''); setCurrentPage(1); }} />}
            <button onClick={clearAllFilters} className="flex items-center gap-1 text-[13px] text-[#6B7280] hover:text-[#111827] transition-colors ml-1">
              <X className="w-3.5 h-3.5" /> Limpar filtros
            </button>
          </div>
        )}

        <div className="flex gap-6">
          {/* Sidebar */}
          <aside className="w-64 flex-shrink-0">
            <div className="bg-white border border-[#E2E8F0] rounded-lg overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-[#E2E8F0]">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-[#1A3A5C]" />
                  <h2 className="text-[15px] text-[#111827] font-medium">Filtros</h2>
                </div>
                {hasActiveFilters && (
                  <button onClick={clearAllFilters} className="text-[12px] text-[#2E6DA4] hover:underline">Limpar</button>
                )}
              </div>

              <div className="divide-y divide-[#E2E8F0]">
                {/* UF */}
                <div className="px-5 py-4">
                  <label className="block text-[12px] font-medium text-[#6B7280] uppercase tracking-wide mb-2">Estado (UF)</label>
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
                  <label className="block text-[12px] font-medium text-[#6B7280] uppercase tracking-wide mb-3">Modalidade</label>
                  <div className="space-y-2">
                    {modalidades.map((m) => (
                      <label key={m.id_modalidade} className="flex items-center gap-2 cursor-pointer group">
                        <input
                          type="radio"
                          name="modalidade"
                          checked={modalidadeFilter === m.id_modalidade}
                          onChange={() => { setModalidadeFilter(m.id_modalidade); setCurrentPage(1); }}
                          className="w-4 h-4 border-[#E2E8F0] accent-[#1A3A5C]"
                        />
                        <span className="text-[13px] text-[#111827] group-hover:text-[#1A3A5C] transition-colors">{m.nome}</span>
                      </label>
                    ))}
                    {modalidadeFilter !== null && (
                      <button onClick={() => { setModalidadeFilter(null); setCurrentPage(1); }} className="text-[12px] text-[#2E6DA4] hover:underline mt-1">
                        Limpar modalidade
                      </button>
                    )}
                  </div>
                </div>

                {/* Situação */}
                <div className="px-5 py-4">
                  <label className="block text-[12px] font-medium text-[#6B7280] uppercase tracking-wide mb-3">Situação</label>
                  <div className="space-y-2">
                    {SITUACOES.map((s) => (
                      <label key={s.id} className="flex items-center gap-2 cursor-pointer group">
                        <input
                          type="radio"
                          name="situacao"
                          checked={situacaoFilter === s.id}
                          onChange={() => { setSituacaoFilter(s.id); setCurrentPage(1); }}
                          className="w-4 h-4 border-[#E2E8F0] accent-[#1A3A5C]"
                        />
                        <span className="text-[13px] text-[#111827] group-hover:text-[#1A3A5C] transition-colors">{s.label}</span>
                      </label>
                    ))}
                    {situacaoFilter !== null && (
                      <button onClick={() => { setSituacaoFilter(null); setCurrentPage(1); }} className="text-[12px] text-[#2E6DA4] hover:underline mt-1">
                        Limpar situação
                      </button>
                    )}
                  </div>
                </div>

                {/* Valor */}
                <div className="px-5 py-4">
                  <label className="block text-[12px] font-medium text-[#6B7280] uppercase tracking-wide mb-3">Valor estimado (R$)</label>
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
                  <label className="block text-[12px] font-medium text-[#6B7280] uppercase tracking-wide mb-3">Publicação</label>
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

          {/* Results */}
          <div className="flex-1 min-w-0">
            {loading ? (
              <div className="bg-white border border-[#E2E8F0] rounded-lg py-20 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-[#2E6DA4] animate-spin" />
              </div>
            ) : error ? (
              <div className="bg-white border border-[#E2E8F0] rounded-lg py-20 text-center">
                <AlertCircle className="w-10 h-10 text-red-300 mx-auto mb-4" />
                <p className="text-[15px] text-[#111827] font-medium mb-1">Erro ao carregar resultados</p>
                <p className="text-[13px] text-[#6B7280] mb-4">{error}</p>
                <button onClick={fetchResultados} className="px-4 py-2 text-[13px] text-[#2E6DA4] border border-[#2E6DA4] rounded hover:bg-[#F5F7FA] transition-colors">
                  Tentar novamente
                </button>
              </div>
            ) : resultados.length === 0 ? (
              <div className="bg-white border border-[#E2E8F0] rounded-lg py-20 text-center">
                <Search className="w-10 h-10 text-[#E2E8F0] mx-auto mb-4" />
                <p className="text-[16px] text-[#111827] font-medium mb-1">Nenhuma licitação encontrada</p>
                <p className="text-[13px] text-[#6B7280] mb-4">Tente outros termos ou remova alguns filtros.</p>
                <button onClick={clearAllFilters} className="px-4 py-2 text-[13px] text-[#2E6DA4] border border-[#2E6DA4] rounded hover:bg-[#F5F7FA] transition-colors">
                  Limpar filtros
                </button>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {resultados.map((lic) => {
                    const situacaoLabel = lic.situacao_id != null ? (SITUACAO_LABEL[lic.situacao_id] ?? `${lic.situacao_id}`) : '—';
                    const situacaoCls = lic.situacao_id != null ? (SITUACAO_COLOR[lic.situacao_id] ?? 'bg-gray-50 text-gray-600 border-gray-200') : '';
                    return (
                      <div key={lic.id_licitacao} className="bg-white border border-[#E2E8F0] rounded-lg p-5 hover:border-[#2E6DA4] hover:shadow-sm transition-all group">
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <div className="flex flex-wrap items-center gap-2">
                            {lic.modalidade_nome && (
                              <span className="px-2.5 py-0.5 bg-[#F5F7FA] text-[#1A3A5C] text-[12px] font-medium rounded border border-[#E2E8F0]">
                                {lic.modalidade_nome}
                              </span>
                            )}
                            {lic.situacao_id != null && (
                              <span className={`px-2.5 py-0.5 text-[12px] font-medium rounded border ${situacaoCls}`}>
                                {situacaoLabel}
                              </span>
                            )}
                          </div>
                          {isSemanticActive && (
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <Sparkles className="w-3.5 h-3.5 text-[#2E6DA4]" />
                              <span className="text-[12px] font-medium text-[#2E6DA4]">IA</span>
                            </div>
                          )}
                        </div>

                        <h3 className="text-[15px] text-[#111827] font-medium leading-snug mb-3 line-clamp-2 group-hover:text-[#1A3A5C] transition-colors">
                          {lic.objeto_compra ?? '(sem descrição)'}
                        </h3>

                        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 mb-4 text-[13px] text-[#6B7280]">
                          {lic.uf && (
                            <span className="flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                              {lic.uf}
                            </span>
                          )}
                          {lic.data_publicacao_pncp && (
                            <span className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                              {formatData(lic.data_publicacao_pncp)}
                            </span>
                          )}
                          <span className="flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 flex-shrink-0" />
                            <span className="truncate max-w-[240px] font-mono text-[11px]">{lic.numero_controle_pncp}</span>
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-[11px] text-[#6B7280] mb-0.5">Valor estimado</p>
                            <p className="text-[17px] text-[#1A3A5C] font-medium">{formatValor(lic.valor_total_estimado)}</p>
                          </div>
                          <Link
                            href={`/licitacao/${encodeURIComponent(lic.numero_controle_pncp)}`}
                            className="px-4 py-2 bg-[#1A3A5C] text-white text-[13px] font-medium rounded hover:bg-[#2E6DA4] transition-colors"
                          >
                            Ver detalhes
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-8">
                    <p className="text-[13px] text-[#6B7280]">
                      Exibindo {(currentPage - 1) * PER_PAGE + 1}–{Math.min(currentPage * PER_PAGE, total)} de {total}
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
                          <span key={`el-${i}`} className="w-9 h-9 flex items-center justify-center text-[13px] text-[#6B7280]">…</span>
                        ) : (
                          <button
                            key={p}
                            onClick={() => goToPage(p)}
                            className={`w-9 h-9 flex items-center justify-center rounded border text-[13px] transition-colors ${currentPage === p ? 'bg-[#1A3A5C] border-[#1A3A5C] text-white font-medium' : 'bg-white border-[#E2E8F0] text-[#111827] hover:bg-[#F5F7FA]'}`}
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
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
