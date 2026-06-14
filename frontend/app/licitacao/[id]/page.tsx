'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/components/header';
import { Badge } from '@/components/badge';
import { getLicitacao, type LicitacaoDetalhe, SITUACAO_LABEL, formatData, formatValor } from '@/lib/api';
import { ExternalLink, Copy, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

function getSituacao(id: number | null) {
  if (id === null) return null;
  return SITUACAO_LABEL[id] ?? `${id}`;
}

function getSituacaoBadge(id: number | null): 'divulgada' | 'suspensa' | 'revogada' {
  if (id === 1) return 'divulgada';
  if (id === 5) return 'suspensa';
  return 'revogada';
}

function pncpUrl(numero: string): string {
  return `https://pncp.gov.br/app/editais/${numero.replace(/[^0-9A-Za-z-]/g, '')}`;
}

export default function DetalhePage() {
  const params = useParams();
  const numeroPncp = decodeURIComponent(params.id as string);

  const [licitacao, setLicitacao] = useState<LicitacaoDetalhe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getLicitacao(numeroPncp)
      .then(setLicitacao)
      .catch(() => setError('Licitação não encontrada ou API indisponível.'))
      .finally(() => setLoading(false));
  }, [numeroPncp]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Link copiado para a área de transferência');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="flex items-center justify-center py-40">
          <Loader2 className="w-10 h-10 text-[#2E6DA4] animate-spin" />
        </div>
      </div>
    );
  }

  if (error || !licitacao) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="max-w-7xl mx-auto px-8 py-20 text-center">
          <AlertCircle className="w-12 h-12 text-red-300 mx-auto mb-4" />
          <p className="text-[18px] text-[#111827] font-medium mb-2">Licitação não encontrada</p>
          <p className="text-[14px] text-[#6B7280] mb-6">{error}</p>
          <Link href="/resultados" className="px-5 py-2.5 bg-[#1A3A5C] text-white rounded hover:bg-[#2E6DA4] transition-colors text-[14px] font-medium">
            Voltar aos resultados
          </Link>
        </div>
      </div>
    );
  }

  const situacaoLabel = getSituacao(licitacao.situacao_id);
  const situacaoBadge = getSituacaoBadge(licitacao.situacao_id);

  return (
    <div className="min-h-screen bg-white">
      <Header />

      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* Breadcrumb */}
        <nav className="text-[13px] text-[#6B7280] mb-8">
          <Link href="/" className="hover:text-[#2E6DA4]">Busca</Link>
          {' > '}
          <Link href="/resultados" className="hover:text-[#2E6DA4]">Resultados</Link>
          {' > '}
          <span className="text-[#111827]">Detalhe</span>
        </nav>

        <div className="flex gap-8">
          {/* Main content */}
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-4">
              {licitacao.modalidade_nome && (
                <Badge variant="modalidade">{licitacao.modalidade_nome}</Badge>
              )}
              {situacaoLabel && (
                <Badge variant="situacao" situacao={situacaoBadge}>{situacaoLabel}</Badge>
              )}
            </div>

            <h1 className="text-[24px] text-[#111827] font-medium mb-8">
              {licitacao.objeto_compra ?? '(sem descrição)'}
            </h1>

            {/* General info */}
            <div className="bg-[#F5F7FA] rounded-lg p-6 mb-8">
              <h2 className="text-[18px] text-[#111827] font-medium mb-6">Informações gerais</h2>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <div className="text-[13px] text-[#6B7280] mb-1">Órgão contratante</div>
                  <div className="text-[16px] text-[#111827]">{licitacao.orgao_razao_social ?? '—'}</div>
                </div>
                <div>
                  <div className="text-[13px] text-[#6B7280] mb-1">CNPJ</div>
                  <div className="text-[16px] text-[#111827] font-mono">{licitacao.orgao_cnpj ?? '—'}</div>
                </div>
                <div>
                  <div className="text-[13px] text-[#6B7280] mb-1">Município / UF</div>
                  <div className="text-[16px] text-[#111827]">
                    {[licitacao.municipio, licitacao.uf].filter(Boolean).join(', ') || '—'}
                  </div>
                </div>
                <div>
                  <div className="text-[13px] text-[#6B7280] mb-1">Número da compra</div>
                  <div className="text-[16px] text-[#111827] font-mono">
                    {licitacao.numero_compra ? `${licitacao.numero_compra}/${licitacao.ano_compra}` : '—'}
                  </div>
                </div>
              </div>
            </div>

            {/* Dates */}
            <div className="bg-white border border-[#E2E8F0] rounded-lg p-6 mb-8">
              <h2 className="text-[18px] text-[#111827] font-medium mb-6">Datas</h2>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="text-[13px] text-[#6B7280] mb-1">Publicação</div>
                  <div className="text-[16px] text-[#111827]">{formatData(licitacao.data_publicacao_pncp)}</div>
                </div>
                <div className="w-12 border-t-2 border-dashed border-[#E2E8F0]" />
                <div className="flex-1">
                  <div className="text-[13px] text-[#6B7280] mb-1">Abertura de propostas</div>
                  <div className="text-[16px] text-[#111827]">{formatData(licitacao.data_abertura_proposta)}</div>
                </div>
                <div className="w-12 border-t-2 border-dashed border-[#E2E8F0]" />
                <div className="flex-1">
                  <div className="text-[13px] text-[#6B7280] mb-1">Encerramento</div>
                  <div className="text-[16px] text-[#111827]">{formatData(licitacao.data_encerramento_proposta)}</div>
                </div>
              </div>
            </div>

            <div className="bg-white border border-[#E2E8F0] rounded-lg p-6">
              <h2 className="text-[18px] text-[#111827] font-medium mb-4">Itens da licitação</h2>
              <div className="text-[14px] text-[#6B7280]">Não há itens adicionais disponíveis para este edital.</div>
            </div>
          </div>

          {/* Sticky sidebar */}
          <aside className="w-[400px] flex-shrink-0">
            <div className="sticky top-8 bg-white border border-[#E2E8F0] rounded-lg p-6 space-y-6">
              <div>
                <div className="text-[13px] text-[#6B7280] mb-2">Valor estimado total</div>
                <div className="text-[24px] text-[#1A3A5C] font-medium">{formatValor(licitacao.valor_total_estimado)}</div>
              </div>

              <div className="border-t border-[#E2E8F0] pt-6">
                <div className="text-[13px] text-[#6B7280] mb-2">Valor homologado</div>
                <div className="text-[16px] text-[#111827]">
                  {licitacao.valor_total_homologado ? formatValor(licitacao.valor_total_homologado) : 'Não disponível'}
                </div>
              </div>

              {licitacao.srp !== null && (
                <div className="border-t border-[#E2E8F0] pt-6">
                  <div className="text-[13px] text-[#6B7280] mb-2">Sistema de Registro de Preços</div>
                  <div className="text-[16px] text-[#111827]">{licitacao.srp ? 'Sim' : 'Não'}</div>
                </div>
              )}

              <a
                href={pncpUrl(licitacao.numero_controle_pncp)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-[#1A3A5C] text-white rounded-lg hover:bg-[#2E6DA4] transition-colors text-[16px] font-medium"
              >
                Acessar no PNCP
                <ExternalLink className="w-4 h-4" />
              </a>

              <div className="border-t border-[#E2E8F0] pt-6">
                <div className="text-[13px] text-[#6B7280] mb-2">Número de controle PNCP</div>
                <div className="text-[13px] text-[#111827] font-mono bg-[#F5F7FA] px-3 py-2 rounded break-all">
                  {licitacao.numero_controle_pncp}
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
