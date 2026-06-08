'use client';

import Link from 'next/link';
import { Header } from '@/components/header';
import { Badge } from '@/components/badge';
import { ExternalLink, Copy } from 'lucide-react';
import { toast } from 'sonner';

const MOCK_ITENS = [
  { num: 1, descricao: 'Notebook Intel Core i7, 16GB RAM', quantidade: 50, unidade: 'UN', valor: 'R$ 4.500,00' },
  { num: 2, descricao: 'Monitor LED 24 polegadas Full HD', quantidade: 50, unidade: 'UN', valor: 'R$ 850,00' },
  { num: 3, descricao: 'Teclado USB ABNT2', quantidade: 50, unidade: 'UN', valor: 'R$ 120,00' },
  { num: 4, descricao: 'Mouse óptico USB', quantidade: 50, unidade: 'UN', valor: 'R$ 45,00' },
  { num: 5, descricao: 'Estabilizador 500VA', quantidade: 50, unidade: 'UN', valor: 'R$ 180,00' },
];

export default function DetalhePage() {
  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Link copiado para a área de transferência');
  };

  return (
    <div className="min-h-screen bg-white">
      <Header />

      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* Breadcrumb */}
        <nav className="text-[13px] text-[#6B7280] mb-8">
          <Link href="/" className="hover:text-[#2E6DA4]">Busca</Link>
          {' > '}
          <Link href="/resultados?q=computadores&mode=semantica" className="hover:text-[#2E6DA4]">
            Resultados
          </Link>
          {' > '}
          <span className="text-[#111827]">Detalhe</span>
        </nav>

        <div className="flex gap-8">
          {/* Main content */}
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-4">
              <Badge variant="modalidade">Pregão Eletrônico</Badge>
              <Badge variant="situacao" situacao="divulgada">Divulgada</Badge>
            </div>

            <h1 className="text-[24px] text-[#111827] font-medium mb-8">
              Aquisição de equipamentos de informática para modernização do parque tecnológico
            </h1>

            {/* General info */}
            <div className="bg-[#F5F7FA] rounded-lg p-6 mb-8">
              <h2 className="text-[18px] text-[#111827] font-medium mb-6">Informações gerais</h2>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <div className="text-[13px] text-[#6B7280] mb-1">Órgão contratante</div>
                  <div className="text-[16px] text-[#111827]">
                    Secretaria de Administração do Estado da Bahia
                  </div>
                </div>
                <div>
                  <div className="text-[13px] text-[#6B7280] mb-1">Unidade administrativa</div>
                  <div className="text-[16px] text-[#111827]">
                    Diretoria de Tecnologia da Informação
                  </div>
                </div>
                <div>
                  <div className="text-[13px] text-[#6B7280] mb-1">Município / UF</div>
                  <div className="text-[16px] text-[#111827]">Salvador, BA</div>
                </div>
                <div>
                  <div className="text-[13px] text-[#6B7280] mb-1">Número do processo</div>
                  <div className="text-[16px] text-[#111827] font-mono">2026/0001234-5</div>
                </div>
              </div>
            </div>

            {/* Dates */}
            <div className="bg-white border border-[#E2E8F0] rounded-lg p-6 mb-8">
              <h2 className="text-[18px] text-[#111827] font-medium mb-6">Datas</h2>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="text-[13px] text-[#6B7280] mb-1">Publicação</div>
                  <div className="text-[16px] text-[#111827]">12/05/2026</div>
                </div>
                <div className="w-12 border-t-2 border-dashed border-[#E2E8F0]" />
                <div className="flex-1">
                  <div className="text-[13px] text-[#6B7280] mb-1">Abertura de propostas</div>
                  <div className="text-[16px] text-[#111827]">25/05/2026</div>
                </div>
                <div className="w-12 border-t-2 border-dashed border-[#E2E8F0]" />
                <div className="flex-1">
                  <div className="text-[13px] text-[#6B7280] mb-1">Encerramento</div>
                  <div className="text-[16px] text-[#111827]">30/05/2026</div>
                </div>
              </div>
            </div>

            {/* Object */}
            <div className="bg-white border border-[#E2E8F0] rounded-lg p-6 mb-8">
              <h2 className="text-[18px] text-[#111827] font-medium mb-4">Objeto e descrição</h2>
              <p className="text-[16px] text-[#111827] leading-relaxed">
                Aquisição de equipamentos de informática, incluindo notebooks, monitores, teclados,
                mouses e estabilizadores, destinados à modernização do parque tecnológico da
                Secretaria de Administração do Estado da Bahia, visando atender às demandas
                operacionais e melhorar a qualidade dos serviços prestados à população. Os
                equipamentos deverão atender às especificações técnicas mínimas estabelecidas no
                Termo de Referência.
              </p>
            </div>

            {/* Items table */}
            <div className="bg-white border border-[#E2E8F0] rounded-lg p-6">
              <h2 className="text-[18px] text-[#111827] font-medium mb-4">Itens da licitação</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead className="bg-[#F5F7FA]">
                    <tr>
                      {['Nº', 'Descrição', 'Quantidade', 'Unidade', 'Valor unitário'].map((col) => (
                        <th key={col} className="px-4 py-3 text-left text-[#111827] font-medium">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    {MOCK_ITENS.map((item) => (
                      <tr key={item.num}>
                        <td className="px-4 py-3 text-[#111827]">{item.num}</td>
                        <td className="px-4 py-3 text-[#111827]">{item.descricao}</td>
                        <td className="px-4 py-3 text-[#111827]">{item.quantidade}</td>
                        <td className="px-4 py-3 text-[#111827]">{item.unidade}</td>
                        <td className="px-4 py-3 text-[#111827]">{item.valor}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button className="mt-4 text-[13px] text-[#2E6DA4] hover:underline">
                Ver todos os itens
              </button>
            </div>
          </div>

          {/* Sticky sidebar */}
          <aside className="w-[400px] flex-shrink-0">
            <div className="sticky top-8 bg-white border border-[#E2E8F0] rounded-lg p-6 space-y-6">
              <div>
                <div className="text-[13px] text-[#6B7280] mb-2">Valor estimado total</div>
                <div className="text-[24px] text-[#1A3A5C] font-medium">R$ 2.450.000,00</div>
              </div>

              <div className="border-t border-[#E2E8F0] pt-6">
                <div className="text-[13px] text-[#6B7280] mb-2">Valor homologado</div>
                <div className="text-[16px] text-[#111827]">Não disponível</div>
              </div>

              <div className="border-t border-[#E2E8F0] pt-6">
                <div className="text-[13px] text-[#6B7280] mb-2">Amparo legal</div>
                <div className="text-[16px] text-[#111827]">Lei nº 14.133/2021</div>
              </div>

              <a
                href="https://pncp.gov.br"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-[#1A3A5C] text-white rounded-lg hover:bg-[#2E6DA4] transition-colors text-[16px] font-medium"
              >
                Acessar no PNCP
                <ExternalLink className="w-4 h-4" />
              </a>

              <div className="border-t border-[#E2E8F0] pt-6">
                <div className="text-[13px] text-[#6B7280] mb-2">Número de controle PNCP</div>
                <div className="text-[13px] text-[#111827] font-mono bg-[#F5F7FA] px-3 py-2 rounded">
                  BA-2026-00001234-5
                </div>
              </div>

              <button
                onClick={handleCopyLink}
                className="flex items-center justify-center gap-2 w-full px-4 py-3 border border-[#1A3A5C] text-[#1A3A5C] rounded-lg hover:bg-[#F5F7FA] transition-colors text-[16px]"
              >
                <Copy className="w-4 h-4" />
                Copiar link desta licitação
              </button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
