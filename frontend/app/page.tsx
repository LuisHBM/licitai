'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/header';
import { SlidersHorizontal } from 'lucide-react';
import { getEstados, getModalidades, getSugestoes, type EstadoOut, type Modalidade } from '@/lib/api';

const QUICK_FILTERS = [
  'Pregão Eletrônico',
  'Obras',
  'Tecnologia da Informação',
  'Dispensa de Licitação',
];

export default function HomePage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSemanticActive, setIsSemanticActive] = useState(true);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const [ufFilter, setUfFilter] = useState('');
  const [modalidadeFilter, setModalidadeFilter] = useState('');

  const [estados, setEstados] = useState<EstadoOut[]>([]);
  const [modalidades, setModalidades] = useState<Modalidade[]>([]);

  // Autocomplete: vocabulário das licitações, com debounce.
  const [sugestoes, setSugestoes] = useState<string[]>([]);
  const [showSugestoes, setShowSugestoes] = useState(false);
  const [sugAtiva, setSugAtiva] = useState(-1);
  const ignorarBusca = useRef(false); // pula o fetch logo após escolher uma sugestão

  useEffect(() => {
    getEstados().then(setEstados).catch(() => {});
    getModalidades().then(setModalidades).catch(() => {});
  }, []);

  useEffect(() => {
    if (ignorarBusca.current) {
      ignorarBusca.current = false;
      return;
    }
    const q = searchQuery.trim();
    if (q.length < 2) {
      setSugestoes([]);
      setShowSugestoes(false);
      return;
    }
    const id = setTimeout(() => {
      getSugestoes(q)
        .then((s) => {
          setSugestoes(s);
          setShowSugestoes(s.length > 0);
          setSugAtiva(-1);
        })
        .catch(() => {});
    }, 220);
    return () => clearTimeout(id);
  }, [searchQuery]);

  const handleSearch = (termo?: string) => {
    const q = (termo ?? searchQuery).trim();
    if (!q) return;
    setShowSugestoes(false);
    const mode = isSemanticActive ? 'semantica' : 'textual';
    const params = new URLSearchParams({ q, mode });
    if (ufFilter) params.set('uf', ufFilter);
    if (modalidadeFilter) params.set('modalidade', modalidadeFilter);
    router.push(`/resultados?${params.toString()}`);
  };

  const escolherSugestao = (s: string) => {
    ignorarBusca.current = true;
    setSearchQuery(s);
    setShowSugestoes(false);
    setSugAtiva(-1);
    handleSearch(s);
  };

  const onKeyDownBusca = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showSugestoes && sugestoes.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSugAtiva((i) => Math.min(i + 1, sugestoes.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSugAtiva((i) => Math.max(i - 1, -1));
        return;
      }
      if (e.key === 'Escape') {
        setShowSugestoes(false);
        return;
      }
      if (e.key === 'Enter' && sugAtiva >= 0) {
        e.preventDefault();
        escolherSugestao(sugestoes[sugAtiva]);
        return;
      }
    }
    if (e.key === 'Enter') handleSearch();
  };

  return (
    <div className="min-h-screen bg-white">
      <Header />

      <main className="max-w-5xl mx-auto px-8 py-24">
        <div className="text-center mb-12">
          <h1 className="text-[24px] text-[#111827] font-medium">
            Busque licitações públicas
          </h1>
        </div>

        <div className="mb-8">
          <div className="flex gap-3 mb-3">
            <div className="relative flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={onKeyDownBusca}
                onFocus={() => sugestoes.length > 0 && setShowSugestoes(true)}
                onBlur={() => setTimeout(() => setShowSugestoes(false), 120)}
                placeholder="Ex: computadores na Bahia acima de R$ 1 milhão"
                className="w-full h-14 px-6 bg-[#F5F7FA] border border-[#E2E8F0] rounded-lg text-[16px] text-[#111827] placeholder:text-[#6B7280] focus:outline-none focus:ring-2 focus:ring-[#2E6DA4]"
              />
              {showSugestoes && sugestoes.length > 0 && (
                <ul className="absolute z-10 left-0 right-0 mt-1 bg-white border border-[#E2E8F0] rounded-lg shadow-lg overflow-hidden">
                  {sugestoes.map((s, i) => (
                    <li
                      key={s}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        escolherSugestao(s);
                      }}
                      onMouseEnter={() => setSugAtiva(i)}
                      className={`px-6 py-2.5 text-[15px] cursor-pointer ${
                        i === sugAtiva ? 'bg-[#F5F7FA] text-[#1A3A5C]' : 'text-[#111827]'
                      }`}
                    >
                      {s}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <button
              onClick={() => setShowAdvancedFilters((v) => !v)}
              className={`px-4 h-14 border rounded-lg transition-colors flex items-center gap-2 ${
                showAdvancedFilters
                  ? 'bg-[#1A3A5C] text-white border-[#1A3A5C]'
                  : 'bg-white text-[#111827] border-[#E2E8F0] hover:bg-[#F5F7FA]'
              }`}
              title="Busca avançada"
            >
              <SlidersHorizontal className="w-5 h-5" />
              <span className="text-[16px] font-medium">Avançada</span>
            </button>
            <button
              onClick={() => handleSearch()}
              className="px-8 h-14 bg-[#1A3A5C] text-white rounded-lg hover:bg-[#2E6DA4] transition-colors font-medium text-[16px]"
            >
              Buscar
            </button>
          </div>

          <div className="flex items-center gap-3 mb-4">
            <span className="text-[13px] text-[#6B7280]">Busca semântica:</span>
            <button
              onClick={() => setIsSemanticActive((v) => !v)}
              role="switch"
              aria-checked={isSemanticActive}
              aria-label="Toggle busca semântica"
              className={`relative w-12 h-6 rounded-full transition-colors ${
                isSemanticActive ? 'bg-[#2E6DA4]' : 'bg-[#E2E8F0]'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                  isSemanticActive ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
            <span className="text-[13px] text-[#111827] font-medium">
              {isSemanticActive ? 'Ativada' : 'Desativada'}
            </span>
          </div>

          {showAdvancedFilters && (
            <div className="bg-[#F5F7FA] border border-[#E2E8F0] rounded-lg p-6 mb-4">
              <h3 className="text-[16px] text-[#111827] font-medium mb-4">Filtros avançados</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[13px] text-[#111827] font-medium mb-2">
                    Estado (UF)
                  </label>
                  <select
                    value={ufFilter}
                    onChange={(e) => setUfFilter(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded text-[13px] text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#2E6DA4]"
                  >
                    <option value="">Todos os estados</option>
                    {estados.map((e) => (
                      <option key={e.uf} value={e.uf}>{e.uf}, {e.nome}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[13px] text-[#111827] font-medium mb-2">
                    Modalidade
                  </label>
                  <select
                    value={modalidadeFilter}
                    onChange={(e) => setModalidadeFilter(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded text-[13px] text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#2E6DA4]"
                  >
                    <option value="">Todas</option>
                    {modalidades.map((m) => (
                      <option key={m.id_modalidade} value={m.id_modalidade}>{m.nome}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[13px] text-[#111827] font-medium mb-2">
                    Valor mínimo (R$)
                  </label>
                  <input
                    type="number"
                    placeholder="0,00"
                    className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded text-[13px] text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#2E6DA4]"
                  />
                </div>
                <div>
                  <label className="block text-[13px] text-[#111827] font-medium mb-2">
                    Valor máximo (R$)
                  </label>
                  <input
                    type="number"
                    placeholder="0,00"
                    className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded text-[13px] text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#2E6DA4]"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {QUICK_FILTERS.map((filter) => (
              <button
                key={filter}
                onClick={() => {
                  setSearchQuery(filter);
                  setIsSemanticActive(true);
                }}
                className="px-4 py-2 bg-white border border-[#E2E8F0] rounded text-[13px] text-[#6B7280] hover:border-[#2E6DA4] hover:text-[#2E6DA4] transition-colors"
              >
                {filter}
              </button>
            ))}
          </div>
        </div>
      </main>

      <footer className="border-t border-[#E2E8F0] py-6 mt-24">
        <div className="max-w-5xl mx-auto px-8 text-center text-[13px] text-[#6B7280]">
          Dados do PNCP (Portal Nacional de Contratações Públicas)
        </div>
      </footer>
    </div>
  );
}
