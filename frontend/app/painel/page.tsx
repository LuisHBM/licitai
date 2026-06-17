'use client';

import { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Header } from '@/components/header';
import { getPainel, formatValor, formatValorCompact, type PainelData } from '@/lib/api';

const PERIODOS: Record<string, number | null> = {
  '30': 30,
  '90': 90,
  '365': 365,
  todos: null,
};

export default function PainelPage() {
  const [period, setPeriod] = useState('365');
  const [data, setData] = useState<PainelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    setLoading(true);
    setErro(null);
    getPainel(PERIODOS[period])
      .then((d) => ativo && setData(d))
      .catch((e) => ativo && setErro(String(e)))
      .finally(() => ativo && setLoading(false));
    return () => {
      ativo = false;
    };
  }, [period]);

  const cards = data
    ? [
        { label: 'Total de licitações indexadas', value: data.resumo.total.toLocaleString('pt-BR'), full: null },
        {
          label: 'Valor total estimado',
          value: formatValorCompact(data.resumo.valor_total_estimado),
          full: formatValor(data.resumo.valor_total_estimado),
        },
        {
          label: 'Média por licitação',
          value: formatValorCompact(data.resumo.valor_medio),
          full: formatValor(data.resumo.valor_medio),
        },
        { label: 'Licitações divulgadas (abertas)', value: data.resumo.abertas.toLocaleString('pt-BR'), full: null },
      ]
    : [];

  return (
    <div className="min-h-screen bg-white">
      <Header />

      <div className="max-w-7xl mx-auto px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-[24px] text-[#111827] font-medium">Painel analítico</h1>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-4 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded text-[13px] text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#2E6DA4]"
          >
            <option value="30">Últimos 30 dias</option>
            <option value="90">Últimos 90 dias</option>
            <option value="365">Último ano</option>
            <option value="todos">Todo o período</option>
          </select>
        </div>

        {erro && (
          <div className="mb-8 rounded-lg border border-red-200 bg-red-50 p-4 text-[13px] text-red-700">
            Não foi possível carregar os dados analíticos: {erro}
          </div>
        )}

        {loading && !data ? (
          <div className="py-24 text-center text-[14px] text-[#6B7280]">Carregando…</div>
        ) : data ? (
          <>
            {/* Metric cards */}
            <div className="grid grid-cols-4 gap-6 mb-8">
              {cards.map((card) => (
                <div key={card.label} className="bg-[#F5F7FA] rounded-lg p-6">
                  <div className="text-[13px] text-[#6B7280] mb-2">{card.label}</div>
                  <div
                    className="text-[24px] text-[#1A3A5C] font-medium"
                    title={card.full ?? undefined}
                  >
                    {card.value}
                  </div>
                </div>
              ))}
            </div>

            {/* Charts */}
            <div className="grid grid-cols-2 gap-8">
              <div className="bg-white border border-[#E2E8F0] rounded-lg p-6">
                <h2 className="text-[18px] text-[#111827] font-medium mb-6">
                  Licitações por modalidade
                </h2>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={data.modalidade} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis type="number" stroke="#6B7280" style={{ fontSize: '13px' }} />
                    <YAxis
                      dataKey="name"
                      type="category"
                      width={150}
                      stroke="#6B7280"
                      style={{ fontSize: '13px' }}
                    />
                    <Tooltip />
                    <Bar dataKey="value" fill="#1A3A5C" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white border border-[#E2E8F0] rounded-lg p-6">
                <h2 className="text-[18px] text-[#111827] font-medium mb-6">Publicações por mês</h2>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={data.mes}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="mes" stroke="#6B7280" style={{ fontSize: '13px' }} />
                    <YAxis stroke="#6B7280" style={{ fontSize: '13px' }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="total" stroke="#2E6DA4" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white border border-[#E2E8F0] rounded-lg p-6">
                <h2 className="text-[18px] text-[#111827] font-medium mb-6">
                  Top 10 órgãos por volume
                </h2>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={data.orgaos} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis type="number" stroke="#6B7280" style={{ fontSize: '13px' }} />
                    <YAxis
                      dataKey="name"
                      type="category"
                      width={180}
                      stroke="#6B7280"
                      style={{ fontSize: '13px' }}
                    />
                    <Tooltip />
                    <Bar dataKey="value" fill="#2E6DA4" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white border border-[#E2E8F0] rounded-lg p-6">
                <h2 className="text-[18px] text-[#111827] font-medium mb-6">Distribuição por UF</h2>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={data.uf}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="name" stroke="#6B7280" style={{ fontSize: '13px' }} />
                    <YAxis stroke="#6B7280" style={{ fontSize: '13px' }} />
                    <Tooltip />
                    <Bar dataKey="federal" stackId="a" fill="#1A3A5C" name="Federal" />
                    <Bar dataKey="estadual" stackId="a" fill="#2E6DA4" name="Estadual" />
                    <Bar dataKey="municipal" stackId="a" fill="#6B7280" name="Municipal" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
