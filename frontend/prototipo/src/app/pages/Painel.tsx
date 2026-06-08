import { Header } from '../components/Header';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export function Painel() {
  const modalidadeData = [
    { name: 'Pregão Eletrônico', value: 45000 },
    { name: 'Dispensa', value: 28000 },
    { name: 'Concorrência', value: 12000 },
    { name: 'Inexigibilidade', value: 8500 },
  ];

  const publicacoesData = [
    { mes: 'Jan', total: 8500 },
    { mes: 'Fev', total: 9200 },
    { mes: 'Mar', total: 11000 },
    { mes: 'Abr', total: 10500 },
    { mes: 'Mai', total: 12300 },
  ];

  const orgaosData = [
    { name: 'Min. da Saúde', value: 15000 },
    { name: 'Min. da Educação', value: 13500 },
    { name: 'Min. da Infraestrutura', value: 11200 },
    { name: 'Min. da Defesa', value: 9800 },
    { name: 'Min. da Ciência e Tecnologia', value: 8900 },
  ];

  const ufData = [
    { name: 'SP', federal: 12000, estadual: 8500, municipal: 5200 },
    { name: 'RJ', federal: 9500, estadual: 6800, municipal: 4100 },
    { name: 'MG', federal: 8200, estadual: 5900, municipal: 3600 },
    { name: 'BA', federal: 7100, estadual: 5200, municipal: 3100 },
    { name: 'RS', federal: 6800, estadual: 4800, municipal: 2900 },
  ];

  return (
    <div className="min-h-screen bg-white">
      <Header />

      <div className="max-w-7xl mx-auto px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-[24px] text-[#111827] font-medium">Painel analítico</h1>
          <select className="px-4 py-2 bg-[#F5F7FA] border border-[#E2E8F0] rounded text-[13px] text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#2E6DA4]">
            <option>Últimos 30 dias</option>
            <option>Últimos 90 dias</option>
            <option>Último ano</option>
          </select>
        </div>

        <div className="grid grid-cols-4 gap-6 mb-8">
          <div className="bg-[#F5F7FA] rounded-lg p-6">
            <div className="text-[13px] text-[#6B7280] mb-2">Total de licitações indexadas</div>
            <div className="text-[24px] text-[#1A3A5C] font-medium">1.234.567</div>
          </div>
          <div className="bg-[#F5F7FA] rounded-lg p-6">
            <div className="text-[13px] text-[#6B7280] mb-2">Valor total estimado</div>
            <div className="text-[24px] text-[#1A3A5C] font-medium">R$ 45,2 bi</div>
          </div>
          <div className="bg-[#F5F7FA] rounded-lg p-6">
            <div className="text-[13px] text-[#6B7280] mb-2">Média por licitação</div>
            <div className="text-[24px] text-[#1A3A5C] font-medium">R$ 36.623</div>
          </div>
          <div className="bg-[#F5F7FA] rounded-lg p-6">
            <div className="text-[13px] text-[#6B7280] mb-2">Licitações com propostas abertas</div>
            <div className="text-[24px] text-[#1A3A5C] font-medium">4.582</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8">
          <div className="bg-white border border-[#E2E8F0] rounded-lg p-6">
            <h2 className="text-[18px] text-[#111827] font-medium mb-6">Licitações por modalidade</h2>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={modalidadeData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis type="number" stroke="#6B7280" style={{ fontSize: '13px' }} />
                <YAxis dataKey="name" type="category" width={150} stroke="#6B7280" style={{ fontSize: '13px' }} />
                <Tooltip />
                <Bar dataKey="value" fill="#1A3A5C" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white border border-[#E2E8F0] rounded-lg p-6">
            <h2 className="text-[18px] text-[#111827] font-medium mb-6">Publicações por mês</h2>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={publicacoesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="mes" stroke="#6B7280" style={{ fontSize: '13px' }} />
                <YAxis stroke="#6B7280" style={{ fontSize: '13px' }} />
                <Tooltip />
                <Line type="monotone" dataKey="total" stroke="#2E6DA4" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white border border-[#E2E8F0] rounded-lg p-6">
            <h2 className="text-[18px] text-[#111827] font-medium mb-6">Top 10 órgãos por volume</h2>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={orgaosData.slice(0, 5)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis type="number" stroke="#6B7280" style={{ fontSize: '13px' }} />
                <YAxis dataKey="name" type="category" width={180} stroke="#6B7280" style={{ fontSize: '13px' }} />
                <Tooltip />
                <Bar dataKey="value" fill="#2E6DA4" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white border border-[#E2E8F0] rounded-lg p-6">
            <h2 className="text-[18px] text-[#111827] font-medium mb-6">Distribuição por UF</h2>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={ufData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="name" stroke="#6B7280" style={{ fontSize: '13px' }} />
                <YAxis stroke="#6B7280" style={{ fontSize: '13px' }} />
                <Tooltip />
                <Bar dataKey="federal" stackId="a" fill="#1A3A5C" />
                <Bar dataKey="estadual" stackId="a" fill="#2E6DA4" />
                <Bar dataKey="municipal" stackId="a" fill="#6B7280" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
