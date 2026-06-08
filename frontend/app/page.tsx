'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/header';
import { SlidersHorizontal } from 'lucide-react';

const QUICK_FILTERS = [
  'Pregão Eletrônico',
  'Obras',
  'Tecnologia da Informação',
  'Dispensa de Licitação',
];

const UFS = [
  { value: 'BA', label: 'Bahia' },
  { value: 'SP', label: 'São Paulo' },
  { value: 'RJ', label: 'Rio de Janeiro' },
  { value: 'MG', label: 'Minas Gerais' },
  { value: 'RS', label: 'Rio Grande do Sul' },
  { value: 'PR', label: 'Paraná' },
  { value: 'SC', label: 'Santa Catarina' },
  { value: 'GO', label: 'Goiás' },
  { value: 'DF', label: 'Distrito Federal' },
];

export default function HomePage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSemanticActive, setIsSemanticActive] = useState(true);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const handleSearch = () => {
    if (!searchQuery.trim()) return;
    const mode = isSemanticActive ? 'semantica' : 'textual';
    router.push(`/resultados?q=${encodeURIComponent(searchQuery.trim())}&mode=${mode}`);
  };

  return (
    <div className="min-h-screen bg-white">
      <Header />

      <main className="max-w-5xl mx-auto px-8 py-24">
        <div className="text-center mb-12">
          <h1 className="text-[24px] text-[#111827] font-medium">
            Encontre licitações públicas com inteligência
          </h1>
        </div>

        <div className="mb-8">
          <div className="flex gap-3 mb-3">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Ex: computadores na Bahia acima de R$ 1 milhão"
              className="flex-1 h-14 px-6 bg-[#F5F7FA] border border-[#E2E8F0] rounded-lg text-[16px] text-[#111827] placeholder:text-[#6B7280] focus:outline-none focus:ring-2 focus:ring-[#2E6DA4]"
            />
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
              onClick={handleSearch}
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
                  <select className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded text-[13px] text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#2E6DA4]">
                    <option value="">Todos os estados</option>
                    {UFS.map((uf) => (
                      <option key={uf.value} value={uf.value}>{uf.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[13px] text-[#111827] font-medium mb-2">
                    Modalidade
                  </label>
                  <select className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded text-[13px] text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#2E6DA4]">
                    <option value="">Todas</option>
                    <option value="pregao">Pregão Eletrônico</option>
                    <option value="dispensa">Dispensa</option>
                    <option value="concorrencia">Concorrência</option>
                    <option value="inexigibilidade">Inexigibilidade</option>
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
          Dados extraídos do PNCP — Portal Nacional de Contratações Públicas
        </div>
      </footer>
    </div>
  );
}
