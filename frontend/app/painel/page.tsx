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
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Header } from '@/components/header';
import {
  getPainel,
  getModalidades,
  getEstados,
  formatValor,
  formatValorCompact,
  REGIOES,
  ESFERAS,
  type PainelData,
  type PainelMes,
  type PainelFiltros,
  type Modalidade,
  type EstadoOut,
} from '@/lib/api';

const PERIODOS: Record<string, number | null> = {
  '30': 30,
  '90': 90,
  '365': 365,
  todos: null,
};

// Paleta para as séries empilhadas do gráfico cruzado.
const CORES_SERIE = ['#1A3A5C', '#2E6DA4', '#6B9BD1', '#A9C4E0', '#94A3B8'];

const selectClass =
  'px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded text-[13px] text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#2E6DA4]';

export default function PainelPage() {
  const [period, setPeriod] = useState('365');
  const [modalidade, setModalidade] = useState<number | null>(null);
  const [uf, setUf] = useState<string | null>(null);
  const [regiao, setRegiao] = useState<string | null>(null);
  const [esfera, setEsfera] = useState<string | null>(null);

  const [modalidades, setModalidades] = useState<Modalidade[]>([]);
  const [estados, setEstados] = useState<EstadoOut[]>([]);

  const [data, setData] = useState<PainelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  // Opções dos slicers que dependem do banco: carregadas uma vez.
  useEffect(() => {
    getModalidades().then(setModalidades).catch(() => {});
    getEstados().then(setEstados).catch(() => {});
  }, []);

  useEffect(() => {
    let ativo = true;
    setLoading(true);
    setErro(null);
    const filtros: PainelFiltros = { dias: PERIODOS[period], modalidade, uf, regiao, esfera };
    getPainel(filtros)
      .then((d) => ativo && setData(d))
      .catch((e) => ativo && setErro(String(e)))
      .finally(() => ativo && setLoading(false));
    return () => {
      ativo = false;
    };
  }, [period, modalidade, uf, regiao, esfera]);

  const filtroAtivo = modalidade != null || uf != null || regiao != null || esfera != null;
  const limparFiltros = () => {
    setModalidade(null);
    setUf(null);
    setRegiao(null);
    setEsfera(null);
  };

  // "2025-06" → "Jun/25" para o eixo do gráfico mensal não perder o ano.
  const serieMensal = (data?.mes ?? []).map((p: PainelMes) => ({
    ...p,
    rotulo: `${p.mes}/${p.ano_mes.slice(2, 4)}`,
  }));

  const cards = data
    ? [
        { label: 'Total de licitações', value: data.resumo.total.toLocaleString('pt-BR'), full: null },
        {
          label: 'Valor total estimado',
          value: formatValorCompact(data.resumo.valor_total_estimado),
          full: formatValor(data.resumo.valor_total_estimado),
        },
        {
          label: 'Economia (estim. − homolog.)',
          value: formatValorCompact(data.resumo.economia_total),
          full: formatValor(data.resumo.economia_total),
        },
        {
          label: 'Média por licitação',
          value: formatValorCompact(data.resumo.valor_medio),
          full: formatValor(data.resumo.valor_medio),
        },
        { label: 'Divulgadas (abertas)', value: data.resumo.abertas.toLocaleString('pt-BR'), full: null },
      ]
    : [];

  return (
    <div className="min-h-screen bg-white">
      <Header />

      <div className="max-w-7xl mx-auto px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-[24px] text-[#111827] font-medium">Painel analítico</h1>
          <select value={period} onChange={(e) => setPeriod(e.target.value)} className={selectClass}>
            <option value="30">Últimos 30 dias</option>
            <option value="90">Últimos 90 dias</option>
            <option value="365">Último ano</option>
            <option value="todos">Todo o período</option>
          </select>
        </div>

        {/* Slicers — cortam todos os gráficos ao mesmo tempo */}
        <div className="flex flex-wrap items-center gap-3 mb-8 p-4 bg-[#F5F7FA] rounded-lg">
          <span className="text-[13px] text-[#6B7280]">Filtrar por:</span>

          <select
            value={modalidade ?? ''}
            onChange={(e) => setModalidade(e.target.value ? Number(e.target.value) : null)}
            className={selectClass}
          >
            <option value="">Todas as modalidades</option>
            {modalidades.map((m) => (
              <option key={m.id_modalidade} value={m.id_modalidade}>
                {m.nome}
              </option>
            ))}
          </select>

          <select value={uf ?? ''} onChange={(e) => setUf(e.target.value || null)} className={selectClass}>
            <option value="">Todas as UFs</option>
            {estados.map((e) => (
              <option key={e.uf} value={e.uf}>
                {e.uf} — {e.nome}
              </option>
            ))}
          </select>

          <select value={regiao ?? ''} onChange={(e) => setRegiao(e.target.value || null)} className={selectClass}>
            <option value="">Todas as regiões</option>
            {REGIOES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>

          <select value={esfera ?? ''} onChange={(e) => setEsfera(e.target.value || null)} className={selectClass}>
            <option value="">Todas as esferas</option>
            {ESFERAS.map((es) => (
              <option key={es.value} value={es.value}>
                {es.label}
              </option>
            ))}
          </select>

          {filtroAtivo && (
            <button
              onClick={limparFiltros}
              className="px-3 py-2 text-[13px] text-[#2E6DA4] hover:underline"
            >
              Limpar filtros
            </button>
          )}
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
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
              {cards.map((card) => (
                <div key={card.label} className="bg-[#F5F7FA] rounded-lg p-6">
                  <div className="text-[13px] text-[#6B7280] mb-2">{card.label}</div>
                  <div
                    className="text-[22px] text-[#1A3A5C] font-medium"
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
                  <LineChart data={serieMensal}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="rotulo" stroke="#6B7280" style={{ fontSize: '13px' }} minTickGap={20} />
                    <YAxis stroke="#6B7280" style={{ fontSize: '13px' }} allowDecimals={false} />
                    <Tooltip />
                    <Line type="linear" dataKey="total" stroke="#2E6DA4" strokeWidth={2} dot={{ r: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white border border-[#E2E8F0] rounded-lg p-6">
                <h2 className="text-[18px] text-[#111827] font-medium mb-6">
                  Economia por modalidade
                </h2>
                {data.economia.length === 0 ? (
                  <div className="h-[280px] flex items-center justify-center text-[13px] text-[#6B7280]">
                    Sem licitações homologadas no recorte atual.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={data.economia} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                      <XAxis
                        type="number"
                        stroke="#6B7280"
                        style={{ fontSize: '13px' }}
                        tickFormatter={(v) => formatValorCompact(v)}
                      />
                      <YAxis
                        dataKey="name"
                        type="category"
                        width={150}
                        stroke="#6B7280"
                        style={{ fontSize: '13px' }}
                      />
                      <Tooltip formatter={(v: number) => formatValor(v)} />
                      <Bar dataKey="value" fill="#1A8A5C" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              <div className="bg-white border border-[#E2E8F0] rounded-lg p-6">
                <h2 className="text-[18px] text-[#111827] font-medium mb-6">
                  Volume por região × modalidade
                </h2>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={data.cruzado.dados}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="regiao" stroke="#6B7280" style={{ fontSize: '13px' }} />
                    <YAxis stroke="#6B7280" style={{ fontSize: '13px' }} allowDecimals={false} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    {data.cruzado.series.map((serie, i) => (
                      <Bar
                        key={serie}
                        dataKey={serie}
                        stackId="a"
                        fill={CORES_SERIE[i % CORES_SERIE.length]}
                      />
                    ))}
                  </BarChart>
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
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
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
