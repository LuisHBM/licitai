import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router';
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
} from 'lucide-react';

const UFS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

const MOCK_LOGS_INITIAL = `[2026-05-20 14:25:46] INFO  Sistema inicializado — LicitAI Collector v2.4.1
[2026-05-20 14:25:46] INFO  Conectando à API PNCP...
[2026-05-20 14:25:47] INFO  Conexão estabelecida — latência 42ms
[2026-05-20 14:25:47] INFO  Iniciando coleta: modalidade=Todas, UF=BA, período=01/05-20/05
[2026-05-20 14:25:48] INFO  Buscando página 1 de 124...
[2026-05-20 14:26:02] INFO  Buscando página 25 de 124...
[2026-05-20 14:26:18] INFO  Buscando página 50 de 124...
[2026-05-20 14:26:35] INFO  Buscando página 75 de 124...
[2026-05-20 14:26:51] INFO  Buscando página 100 de 124...
[2026-05-20 14:27:08] INFO  Buscando página 124 de 124...
[2026-05-20 14:27:10] INFO  Indexando 1.234 registros no banco vetorial...
[2026-05-20 14:27:14] INFO  Embeddings gerados via modelo text-embedding-3-small
[2026-05-20 14:27:15] INFO  Índice FAISS atualizado com sucesso
[2026-05-20 14:27:15] INFO  Limpeza de cache concluída
[2026-05-20 14:27:16] INFO  Coleta finalizada — 1.234 registros em 1m 29s
[2026-05-20 08:15:22] INFO  Coleta agendada iniciada automaticamente
[2026-05-20 08:15:23] INFO  Modalidade=Pregão Eletrônico, UF=Todas
[2026-05-20 08:15:23] WARN  API PNCP retornou status 429 — aguardando 5s
[2026-05-20 08:15:28] INFO  Retentativa bem-sucedida
[2026-05-19 22:45:01] ERROR Timeout ao conectar à API PNCP após 3 tentativas`.trim();

const COLLECTING_LOG_LINES = [
  'INFO  Iniciando nova coleta...',
  'INFO  Conectando à API PNCP...',
  'INFO  Conexão estabelecida — latência 38ms',
  'INFO  Buscando página 1 de 87...',
  'INFO  Buscando página 22 de 87...',
  'INFO  Buscando página 44 de 87...',
  'INFO  Buscando página 65 de 87...',
  'INFO  Buscando página 87 de 87...',
  'INFO  Indexando registros no banco vetorial...',
  'INFO  Coleta finalizada com sucesso.',
];

type ColetaStatus = 'concluida' | 'andamento' | 'erro';

interface Coleta {
  id: number;
  dataHora: string;
  modalidade: string;
  uf: string;
  periodo: string;
  registros: number | null;
  status: ColetaStatus;
}

const MOCK_COLETAS_INITIAL: Coleta[] = [
  { id: 1, dataHora: '20/05/2026 14:25', modalidade: 'Todas', uf: 'BA', periodo: '01/05 - 20/05', registros: 1234, status: 'concluida' },
  { id: 2, dataHora: '20/05/2026 08:15', modalidade: 'Pregão Eletrônico', uf: 'Todas', periodo: '01/05 - 20/05', registros: 5678, status: 'concluida' },
  { id: 3, dataHora: '19/05/2026 22:45', modalidade: 'Todas', uf: 'SP', periodo: '01/05 - 19/05', registros: null, status: 'erro' },
  { id: 4, dataHora: '17/05/2026 16:30', modalidade: 'Dispensa', uf: 'RJ', periodo: '01/05 - 17/05', registros: 892, status: 'concluida' },
  { id: 5, dataHora: '15/05/2026 09:00', modalidade: 'Concorrência', uf: 'MG', periodo: '01/05 - 15/05', registros: 347, status: 'concluida' },
];

export function PainelAdmin() {
  const [coletas, setColetas] = useState<Coleta[]>(MOCK_COLETAS_INITIAL);
  const [isCollecting, setIsCollecting] = useState(false);
  const [collectProgress, setCollectProgress] = useState(0);
  const [logs, setLogs] = useState(MOCK_LOGS_INITIAL);
  const [agendarDiario, setAgendarDiario] = useState(false);
  const [modalidade, setModalidade] = useState('Todas');
  const [uf, setUf] = useState('Todas');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [apiStatus] = useState<'operacional' | 'instavel'>('operacional');
  const [exportingIndex, setExportingIndex] = useState<number | null>(null);
  const [exportingAll, setExportingAll] = useState(false);
  const logsRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    if (logsRef.current) {
      logsRef.current.scrollTop = logsRef.current.scrollHeight;
    }
  }, [logs]);

  const now = () => {
    const d = new Date();
    return `${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  };

  const handleStartColeta = () => {
    if (isCollecting) return;
    setIsCollecting(true);
    setCollectProgress(0);

    const novaColeta: Coleta = {
      id: Date.now(),
      dataHora: now(),
      modalidade,
      uf,
      periodo: dataInicio && dataFim ? `${dataInicio} - ${dataFim}` : 'Período atual',
      registros: null,
      status: 'andamento',
    };
    setColetas((prev) => [novaColeta, ...prev]);

    let step = 0;
    const total = COLLECTING_LOG_LINES.length;

    const tick = () => {
      if (step >= total) {
        setIsCollecting(false);
        setCollectProgress(100);
        const registros = Math.floor(Math.random() * 3000) + 500;
        setColetas((prev) =>
          prev.map((c) =>
            c.id === novaColeta.id ? { ...c, status: 'concluida', registros } : c
          )
        );
        setTimeout(() => setCollectProgress(0), 2000);
        return;
      }
      const line = COLLECTING_LOG_LINES[step];
      const ts = new Date().toISOString().replace('T', ' ').substring(0, 19);
      setLogs((prev) => `${prev}\n[${ts}] ${line}`);
      setCollectProgress(Math.round(((step + 1) / total) * 100));
      step++;
      setTimeout(tick, 600 + Math.random() * 400);
    };

    setTimeout(tick, 300);
  };

  const handleExportSingle = (index: number) => {
    setExportingIndex(index);
    setTimeout(() => setExportingIndex(null), 1500);
  };

  const handleExportAll = () => {
    setExportingAll(true);
    setTimeout(() => setExportingAll(false), 2000);
  };

  const exportButtons = [
    { label: 'fato_licitacao', file: 'fato_licitacao.csv' },
    { label: 'dim_orgao', file: 'dim_orgao.csv' },
    { label: 'dim_tempo', file: 'dim_tempo.csv' },
    { label: 'dim_modalidade', file: 'dim_modalidade.csv' },
  ];

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      {/* Admin header */}
      <header className="bg-[#1A3A5C] text-white px-8 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <Search className="w-6 h-6" />
          <span className="font-medium text-[20px]">LicitAI</span>
        </Link>
        <nav className="flex items-center gap-8">
          {['#coletas', '#logs', '#exportar'].map((href, i) => (
            <a
              key={href}
              href={href}
              className="text-white/80 hover:text-white transition-colors text-[15px]"
            >
              {['Coletas', 'Logs', 'Exportar'][i]}
            </a>
          ))}
          <Link to="/" className="text-white/80 hover:text-white transition-colors text-[15px]">
            Sair
          </Link>
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
            <p className="text-[20px] text-[#111827] font-medium">20/05/2026</p>
            <p className="text-[13px] text-[#6B7280] mt-0.5">às 14h25</p>
          </div>

          <div className="bg-white border border-[#E2E8F0] rounded-lg p-6">
            <div className="flex items-center gap-2 text-[13px] text-[#6B7280] mb-3">
              <Database className="w-4 h-4" />
              Total na base
            </div>
            <p className="text-[20px] text-[#111827] font-medium">1.234.567</p>
            <p className="text-[13px] text-[#6B7280] mt-0.5">licitações indexadas</p>
          </div>

          <div className="bg-white border border-[#E2E8F0] rounded-lg p-6">
            <div className="flex items-center gap-2 text-[13px] text-[#6B7280] mb-3">
              <Wifi className="w-4 h-4" />
              Status da API PNCP
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                  apiStatus === 'operacional' ? 'bg-emerald-500' : 'bg-amber-400'
                }`}
              />
              <span
                className={`text-[20px] font-medium ${
                  apiStatus === 'operacional' ? 'text-emerald-600' : 'text-amber-600'
                }`}
              >
                {apiStatus === 'operacional' ? 'Operacional' : 'Instável'}
              </span>
            </div>
          </div>
        </div>

        {/* Nova coleta */}
        <section id="coletas" className="bg-white border border-[#E2E8F0] rounded-lg p-6 mb-6">
          <h2 className="text-[17px] text-[#111827] font-medium mb-5">Executar nova coleta</h2>

          <div className="grid grid-cols-4 gap-4 mb-5">
            <div>
              <label className="block text-[13px] text-[#111827] font-medium mb-1.5">Modalidade</label>
              <select
                value={modalidade}
                onChange={(e) => setModalidade(e.target.value)}
                className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded text-[13px] text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#2E6DA4]"
              >
                <option>Todas</option>
                <option>Pregão Eletrônico</option>
                <option>Dispensa</option>
                <option>Concorrência</option>
                <option>Inexigibilidade</option>
              </select>
            </div>

            <div>
              <label className="block text-[13px] text-[#111827] font-medium mb-1.5">Estado (UF)</label>
              <select
                value={uf}
                onChange={(e) => setUf(e.target.value)}
                className="w-full px-3 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded text-[13px] text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#2E6DA4]"
              >
                <option>Todas</option>
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
              disabled={isCollecting}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#1A3A5C] text-white rounded hover:bg-[#2E6DA4] transition-colors font-medium text-[15px] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isCollecting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              {isCollecting ? 'Coletando...' : 'Iniciar coleta'}
            </button>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={agendarDiario}
                onChange={(e) => setAgendarDiario(e.target.checked)}
                className="w-4 h-4 rounded border-[#E2E8F0] text-[#1A3A5C] focus:ring-[#2E6DA4]"
              />
              <span className="text-[13px] text-[#111827]">Agendar coleta diária automática</span>
            </label>
          </div>

          {/* Inline progress feedback */}
          {isCollecting && (
            <div className="mt-4 pt-4 border-t border-[#E2E8F0]">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[13px] text-[#6B7280]">Progresso da coleta</span>
                <span className="text-[13px] font-medium text-[#1A3A5C]">{collectProgress}%</span>
              </div>
              <div className="w-full bg-[#F5F7FA] rounded-full h-2 overflow-hidden">
                <div
                  className="bg-[#2E6DA4] h-full rounded-full transition-all duration-300"
                  style={{ width: `${collectProgress}%` }}
                />
              </div>
            </div>
          )}
        </section>

        {/* Histórico de coletas */}
        <section className="bg-white border border-[#E2E8F0] rounded-lg mb-6 overflow-hidden">
          <div className="px-6 py-4 border-b border-[#E2E8F0]">
            <h2 className="text-[17px] text-[#111827] font-medium">Histórico de coletas</h2>
          </div>

          <div className="overflow-x-auto">
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
                  <tr key={c.id} className="hover:bg-[#F5F7FA] transition-colors">
                    <td className="px-5 py-3.5 text-[#111827] whitespace-nowrap">{c.dataHora}</td>
                    <td className="px-5 py-3.5 text-[#111827]">{c.modalidade}</td>
                    <td className="px-5 py-3.5 text-[#111827]">{c.uf}</td>
                    <td className="px-5 py-3.5 text-[#111827] whitespace-nowrap">{c.periodo}</td>
                    <td className="px-5 py-3.5 text-[#111827]">
                      {c.registros !== null ? c.registros.toLocaleString('pt-BR') : '—'}
                    </td>
                    <td className="px-5 py-3.5">
                      {c.status === 'concluida' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[12px] font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Concluída
                        </span>
                      )}
                      {c.status === 'andamento' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded text-[12px] font-medium">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Em andamento
                        </span>
                      )}
                      {c.status === 'erro' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-50 text-red-700 border border-red-200 rounded text-[12px] font-medium">
                          <XCircle className="w-3.5 h-3.5" />
                          Erro
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <button
                        className="text-[#6B7280] hover:text-[#1A3A5C] transition-colors"
                        title="Ver logs desta coleta"
                        onClick={() => {
                          document.getElementById('logs')?.scrollIntoView({ behavior: 'smooth' });
                        }}
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Logs */}
        <section id="logs" className="bg-white border border-[#E2E8F0] rounded-lg mb-6 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0]">
            <h2 className="text-[17px] text-[#111827] font-medium">Logs do sistema</h2>
            <button className="flex items-center gap-2 px-4 py-2 border border-[#E2E8F0] text-[#111827] rounded hover:bg-[#F5F7FA] transition-colors text-[13px]">
              <Download className="w-4 h-4" />
              Exportar logs
            </button>
          </div>
          <div className="p-4 bg-[#1E1E1E]">
            <pre
              ref={logsRef}
              className="text-[#D4D4D4] font-mono text-[13px] leading-relaxed whitespace-pre-wrap max-h-72 overflow-y-auto"
            >
              {logs}
            </pre>
          </div>
        </section>

        {/* Exportar BI */}
        <section id="exportar" className="bg-white border border-[#E2E8F0] rounded-lg p-6">
          <h2 className="text-[17px] text-[#111827] font-medium mb-1">Exportar dados para BI</h2>
          <p className="text-[13px] text-[#6B7280] mb-6">
            Gera arquivos CSV com o modelo dimensional para importação no Power BI
          </p>

          <div className="flex flex-wrap gap-3 mb-5">
            {exportButtons.map((btn, i) => (
              <button
                key={btn.file}
                onClick={() => handleExportSingle(i)}
                disabled={exportingIndex === i}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#F5F7FA] border border-[#E2E8F0] text-[#111827] rounded hover:border-[#2E6DA4] hover:text-[#1A3A5C] transition-colors text-[13px] font-medium disabled:opacity-60"
              >
                {exportingIndex === i ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <FileDown className="w-3.5 h-3.5" />
                )}
                {btn.label}
              </button>
            ))}
          </div>

          <button
            onClick={handleExportAll}
            disabled={exportingAll}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#1A3A5C] text-white rounded hover:bg-[#2E6DA4] transition-colors font-medium text-[15px] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {exportingAll ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Package className="w-4 h-4" />
            )}
            {exportingAll ? 'Gerando ZIP...' : 'Exportar todos (ZIP)'}
          </button>
        </section>
      </div>
    </div>
  );
}
