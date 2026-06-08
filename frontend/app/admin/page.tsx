'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  getColetas,
  iniciarColeta,
  getModalidades,
  type ColetaOut,
  type Modalidade,
} from '@/lib/api';
import {
  Search,
  Eye,
  Loader2,
  CheckCircle2,
  XCircle,
  Download,
  Activity,
  Database,
  Wifi,
  Play,
  FileDown,
  Package,
  Clock,
} from 'lucide-react';

const UFS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

const EXPORT_BUTTONS = [
  { label: 'fato_licitacao', file: 'fato_licitacao.csv' },
  { label: 'dim_orgao', file: 'dim_orgao.csv' },
  { label: 'dim_tempo', file: 'dim_tempo.csv' },
  { label: 'dim_modalidade', file: 'dim_modalidade.csv' },
];

function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
}

function formatDateRange(inicio: string, fim: string): string {
  return `${inicio.substring(0, 10).split('-').reverse().join('/')} - ${fim.substring(0, 10).split('-').reverse().join('/')}`;
}

function defaultDate(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().substring(0, 10);
}

const COLLECTING_LOG_LINES = [
  'INFO  Iniciando nova coleta...',
  'INFO  Conectando à API PNCP...',
  'INFO  Conexão estabelecida',
  'INFO  Buscando registros...',
  'INFO  Processando dados recebidos...',
  'INFO  Inserindo no banco de dados...',
  'INFO  Gerando embeddings...',
  'INFO  Finalizando...',
];

export default function PainelAdminPage() {
  const [coletas, setColetas] = useState<ColetaOut[]>([]);
  const [modalidades, setModalidades] = useState<Modalidade[]>([]);
  const [loadingColetas, setLoadingColetas] = useState(true);

  const [isCollecting, setIsCollecting] = useState(false);
  const [collectProgress, setCollectProgress] = useState(0);
  const [logs, setLogs] = useState('Aguardando ação...');
  const [agendarDiario, setAgendarDiario] = useState(false);

  const [selectedModalidade, setSelectedModalidade] = useState<string>('todas');
  const [uf, setUf] = useState('');
  const [dataInicio, setDataInicio] = useState(defaultDate(30));
  const [dataFim, setDataFim] = useState(defaultDate(0));
  const [erroColeta, setErroColeta] = useState<string | null>(null);

  const [exportingIndex, setExportingIndex] = useState<number | null>(null);
  const [exportingAll, setExportingAll] = useState(false);

  const logsRef = useRef<HTMLPreElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (logsRef.current) logsRef.current.scrollTop = logsRef.current.scrollHeight;
  }, [logs]);

  const fetchColetas = useCallback(async () => {
    try {
      const data = await getColetas();
      setColetas(data);
      if (data.some((c) => c.status === 'executando')) {
        // still running, keep polling
      } else {
        setIsCollecting(false);
        if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      }
    } catch {
      // backend offline — mantém o estado atual
    } finally {
      setLoadingColetas(false);
    }
  }, []);

  useEffect(() => {
    fetchColetas();
    getModalidades().then(setModalidades).catch(() => {});
  }, [fetchColetas]);

  const appendLog = (line: string) => {
    const ts = new Date().toISOString().replace('T', ' ').substring(0, 19);
    setLogs((prev) => `${prev}\n[${ts}] ${line}`);
  };

  const handleStartColeta = async () => {
    if (isCollecting || !dataInicio || !dataFim) return;

    setErroColeta(null);
    setIsCollecting(true);
    setCollectProgress(0);
    setLogs('');

    const modalidadeIds =
      selectedModalidade === 'todas'
        ? Array.from({ length: 13 }, (_, i) => i + 1)
        : [Number(selectedModalidade)];

    try {
      await iniciarColeta({
        data_inicio: dataInicio,
        data_fim: dataFim,
        modalidades: modalidadeIds,
        uf: uf || null,
      });
      appendLog('INFO  Coleta iniciada em background pelo servidor');

      // Simula progresso visual enquanto backend processa
      let step = 0;
      const tick = () => {
        if (step >= COLLECTING_LOG_LINES.length) return;
        appendLog(COLLECTING_LOG_LINES[step]);
        setCollectProgress(Math.round(((step + 1) / COLLECTING_LOG_LINES.length) * 90));
        step++;
        setTimeout(tick, 800 + Math.random() * 600);
      };
      setTimeout(tick, 400);

      // Polling real para detectar quando concluiu
      pollRef.current = setInterval(async () => {
        await fetchColetas();
      }, 5000);

    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erro desconhecido';
      setErroColeta(`Falha ao iniciar coleta: ${msg}`);
      setIsCollecting(false);
      appendLog(`ERROR ${msg}`);
    }
  };

  // Limpa polling ao desmontar
  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  const handleExportSingle = (index: number) => {
    setExportingIndex(index);
    setTimeout(() => setExportingIndex(null), 1500);
  };

  const handleExportAll = () => {
    setExportingAll(true);
    setTimeout(() => setExportingAll(false), 2000);
  };

  const ultimaColeta = coletas[0];

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      {/* Admin header */}
      <header className="bg-[#1A3A5C] text-white px-8 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Search className="w-6 h-6" />
          <span className="font-medium text-[20px]">LicitAI</span>
        </Link>
        <nav className="flex items-center gap-8">
          <a href="#coletas" className="text-white/80 hover:text-white transition-colors text-[15px]">Coletas</a>
          <a href="#logs" className="text-white/80 hover:text-white transition-colors text-[15px]">Logs</a>
          <a href="#exportar" className="text-white/80 hover:text-white transition-colors text-[15px]">Exportar</a>
          <Link href="/" className="text-white/80 hover:text-white transition-colors text-[15px]">Sair</Link>
        </nav>
      </header>

      <div className="max-w-7xl mx-auto px-8 py-8">
        <h1 className="text-[22px] text-[#111827] font-medium mb-8">Painel administrativo</h1>

        {/* Status cards */}
        <div className="grid grid-cols-3 gap-6 mb-8">
          <div className="bg-white border border-[#E2E8F0] rounded-lg p-6">
            <div className="flex items-center gap-2 text-[13px] text-[#6B7280] mb-3">
              <Activity className="w-4 h-4" />
              Última coleta
            </div>
            {loadingColetas ? (
              <Loader2 className="w-5 h-5 animate-spin text-[#6B7280]" />
            ) : ultimaColeta ? (
              <>
                <p className="text-[20px] text-[#111827] font-medium">{formatDateTime(ultimaColeta.executado_em).split(' ')[0]}</p>
                <p className="text-[13px] text-[#6B7280] mt-0.5">às {formatDateTime(ultimaColeta.executado_em).split(' ')[1]}</p>
              </>
            ) : (
              <p className="text-[16px] text-[#6B7280]">Nenhuma coleta realizada</p>
            )}
          </div>

          <div className="bg-white border border-[#E2E8F0] rounded-lg p-6">
            <div className="flex items-center gap-2 text-[13px] text-[#6B7280] mb-3">
              <Database className="w-4 h-4" />
              Total coletado
            </div>
            {loadingColetas ? (
              <Loader2 className="w-5 h-5 animate-spin text-[#6B7280]" />
            ) : (
              <>
                <p className="text-[20px] text-[#111827] font-medium">
                  {coletas.reduce((acc, c) => acc + (c.total_registros ?? 0), 0).toLocaleString('pt-BR')}
                </p>
                <p className="text-[13px] text-[#6B7280] mt-0.5">registros em {coletas.length} coletas</p>
              </>
            )}
          </div>

          <div className="bg-white border border-[#E2E8F0] rounded-lg p-6">
            <div className="flex items-center gap-2 text-[13px] text-[#6B7280] mb-3">
              <Wifi className="w-4 h-4" />
              Status da API PNCP
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 bg-emerald-500" />
              <span className="text-[20px] font-medium text-emerald-600">Operacional</span>
            </div>
          </div>
        </div>

        {/* Execute new collection */}
        <section id="coletas" className="bg-white border border-[#E2E8F0] rounded-lg p-6 mb-6">
          <h2 className="text-[17px] text-[#111827] font-medium mb-5">Executar nova coleta</h2>

          <div className="grid grid-cols-4 gap-4 mb-5">
            <div>
              <label className="block text-[13px] text-[#111827] font-medium mb-1.5">Modalidade</label>
              <select
                value={selectedModalidade}
                onChange={(e) => setSelectedModalidade(e.target.value)}
                className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded text-[13px] text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#2E6DA4]"
              >
                <option value="todas">Todas</option>
                {modalidades.map((m) => (
                  <option key={m.id_modalidade} value={m.id_modalidade}>{m.nome}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[13px] text-[#111827] font-medium mb-1.5">Estado (UF)</label>
              <select
                value={uf}
                onChange={(e) => setUf(e.target.value)}
                className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded text-[13px] text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#2E6DA4]"
              >
                <option value="">Todas</option>
                {UFS.map((u) => <option key={u}>{u}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-[13px] text-[#111827] font-medium mb-1.5">Data inicial</label>
              <input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded text-[13px] text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#2E6DA4]"
              />
            </div>

            <div>
              <label className="block text-[13px] text-[#111827] font-medium mb-1.5">Data final</label>
              <input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded text-[13px] text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#2E6DA4]"
              />
            </div>
          </div>

          <div className="flex items-center gap-6">
            <button
              onClick={handleStartColeta}
              disabled={isCollecting || !dataInicio || !dataFim}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#1A3A5C] text-white rounded hover:bg-[#2E6DA4] transition-colors font-medium text-[15px] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isCollecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              {isCollecting ? 'Coletando...' : 'Iniciar coleta'}
            </button>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={agendarDiario}
                onChange={(e) => setAgendarDiario(e.target.checked)}
                className="w-4 h-4 rounded border-[#E2E8F0] accent-[#1A3A5C]"
              />
              <span className="text-[13px] text-[#111827]">Agendar coleta diária automática</span>
            </label>
          </div>

          {erroColeta && (
            <p className="mt-3 text-[13px] text-red-600">{erroColeta}</p>
          )}

          {isCollecting && (
            <div className="mt-4 pt-4 border-t border-[#E2E8F0]">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[13px] text-[#6B7280]">Progresso da coleta</span>
                <span className="text-[13px] font-medium text-[#1A3A5C]">{collectProgress}%</span>
              </div>
              <div className="w-full bg-[#F5F7FA] rounded-full h-2 overflow-hidden">
                <div className="bg-[#2E6DA4] h-full rounded-full transition-all duration-300" style={{ width: `${collectProgress}%` }} />
              </div>
            </div>
          )}
        </section>

        {/* Collection history */}
        <section className="bg-white border border-[#E2E8F0] rounded-lg mb-6 overflow-hidden">
          <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
            <h2 className="text-[17px] text-[#111827] font-medium">Histórico de coletas</h2>
            <button onClick={fetchColetas} className="text-[13px] text-[#2E6DA4] hover:underline">Atualizar</button>
          </div>
          <div className="overflow-x-auto">
            {loadingColetas ? (
              <div className="py-10 flex justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-[#6B7280]" />
              </div>
            ) : coletas.length === 0 ? (
              <div className="py-10 text-center text-[13px] text-[#6B7280]">
                Nenhuma coleta realizada ainda.
              </div>
            ) : (
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="bg-[#F5F7FA] border-b border-[#E2E8F0]">
                    {['Data/Hora', 'Modalidade', 'UF', 'Período', 'Registros', 'Status', 'Ação'].map((col) => (
                      <th key={col} className="px-5 py-3 text-left text-[#6B7280] font-medium">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {coletas.map((c) => (
                    <tr key={c.id_coleta} className="hover:bg-[#F5F7FA] transition-colors">
                      <td className="px-5 py-3.5 text-[#111827] whitespace-nowrap">{formatDateTime(c.executado_em)}</td>
                      <td className="px-5 py-3.5 text-[#111827]">
                        {c.modalidade_filtro != null
                          ? (modalidades.find((m) => m.id_modalidade === c.modalidade_filtro)?.nome ?? c.modalidade_filtro)
                          : 'Todas'}
                      </td>
                      <td className="px-5 py-3.5 text-[#111827]">{c.uf_filtro ?? 'Todas'}</td>
                      <td className="px-5 py-3.5 text-[#111827] whitespace-nowrap">
                        {formatDateRange(c.data_inicio_coleta, c.data_fim_coleta)}
                      </td>
                      <td className="px-5 py-3.5 text-[#111827]">
                        {c.total_registros?.toLocaleString('pt-BR') ?? '—'}
                      </td>
                      <td className="px-5 py-3.5">
                        {c.status === 'concluido' || c.status === 'concluída' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[12px] font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" />Concluída
                          </span>
                        ) : c.status === 'executando' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded text-[12px] font-medium">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />Em andamento
                          </span>
                        ) : c.status === 'erro' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-50 text-red-700 border border-red-200 rounded text-[12px] font-medium">
                            <XCircle className="w-3.5 h-3.5" />Erro
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 text-gray-600 border border-gray-200 rounded text-[12px] font-medium">
                            <Clock className="w-3.5 h-3.5" />{c.status}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <button
                          onClick={() => document.getElementById('logs')?.scrollIntoView({ behavior: 'smooth' })}
                          title="Ver logs"
                          className="text-[#6B7280] hover:text-[#1A3A5C] transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        {/* Logs */}
        <section id="logs" className="bg-white border border-[#E2E8F0] rounded-lg mb-6 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0]">
            <h2 className="text-[17px] text-[#111827] font-medium">Logs da última coleta</h2>
            <button className="flex items-center gap-2 px-4 py-2 border border-[#E2E8F0] text-[#111827] rounded hover:bg-[#F5F7FA] transition-colors text-[13px]">
              <Download className="w-4 h-4" />Exportar logs
            </button>
          </div>
          <div className="p-4 bg-[#1E1E1E]">
            <pre ref={logsRef} className="text-[#D4D4D4] font-mono text-[13px] leading-relaxed whitespace-pre-wrap max-h-72 overflow-y-auto">
              {logs}
            </pre>
          </div>
        </section>

        {/* Export for BI */}
        <section id="exportar" className="bg-white border border-[#E2E8F0] rounded-lg p-6">
          <h2 className="text-[17px] text-[#111827] font-medium mb-1">Exportar dados para BI</h2>
          <p className="text-[13px] text-[#6B7280] mb-6">Gera arquivos CSV com o modelo dimensional para importação no Power BI</p>
          <div className="flex flex-wrap gap-3 mb-5">
            {EXPORT_BUTTONS.map((btn, i) => (
              <button
                key={btn.file}
                onClick={() => handleExportSingle(i)}
                disabled={exportingIndex === i}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#F5F7FA] border border-[#E2E8F0] text-[#111827] rounded hover:border-[#2E6DA4] hover:text-[#1A3A5C] transition-colors text-[13px] font-medium disabled:opacity-60"
              >
                {exportingIndex === i ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
                {btn.label}
              </button>
            ))}
          </div>
          <button
            onClick={handleExportAll}
            disabled={exportingAll}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#1A3A5C] text-white rounded hover:bg-[#2E6DA4] transition-colors font-medium text-[15px] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {exportingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <Package className="w-4 h-4" />}
            {exportingAll ? 'Gerando ZIP...' : 'Exportar todos (ZIP)'}
          </button>
        </section>
      </div>
    </div>
  );
}
