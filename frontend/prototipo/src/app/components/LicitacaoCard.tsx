import { MapPin, Calendar, Building2 } from 'lucide-react';
import { Badge } from './Badge';
import { Link } from 'react-router';

interface LicitacaoCardProps {
  id: string;
  modalidade: string;
  situacao: 'divulgada' | 'suspensa' | 'revogada';
  titulo: string;
  cidade: string;
  uf: string;
  dataPublicacao: string;
  orgao: string;
  valorEstimado: string;
  similaridade?: number;
  showSimilaridade?: boolean;
}

export function LicitacaoCard({
  id,
  modalidade,
  situacao,
  titulo,
  cidade,
  uf,
  dataPublicacao,
  orgao,
  valorEstimado,
  similaridade,
  showSimilaridade = false,
}: LicitacaoCardProps) {
  return (
    <div className="bg-white border border-[#E2E8F0] rounded-lg p-6 hover:border-[#2E6DA4] transition-colors">
      <div className="flex items-start justify-between mb-4">
        <Badge variant="modalidade">{modalidade}</Badge>
        <Badge variant="situacao" situacao={situacao}>{situacao.charAt(0).toUpperCase() + situacao.slice(1)}</Badge>
      </div>

      <h3 className="text-[16px] text-[#111827] mb-3 line-clamp-2 leading-normal">
        {titulo}
      </h3>

      <div className="flex flex-wrap items-center gap-4 mb-4 text-[13px] text-[#6B7280]">
        <span className="flex items-center gap-1">
          <MapPin className="w-4 h-4" />
          {cidade}, {uf}
        </span>
        <span className="flex items-center gap-1">
          <Calendar className="w-4 h-4" />
          Publicado em {dataPublicacao}
        </span>
        <span className="flex items-center gap-1 truncate">
          <Building2 className="w-4 h-4" />
          {orgao}
        </span>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-[18px] text-[#1A3A5C] font-medium">
          {valorEstimado}
        </span>
        <Link
          to={`/licitacao/${id}`}
          className="px-4 py-2 border border-[#1A3A5C] text-[#1A3A5C] rounded hover:bg-[#F5F7FA] transition-colors text-[16px]"
        >
          Ver detalhes
        </Link>
      </div>

      {showSimilaridade && similaridade !== undefined && (
        <div className="mt-4 pt-4 border-t border-[#E2E8F0]">
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-[#F5F7FA] rounded-full h-2 overflow-hidden">
              <div
                className="bg-[#2E6DA4] h-full rounded-full"
                style={{ width: `${similaridade}%` }}
              />
            </div>
            <span className="text-[13px] text-[#6B7280]">{similaridade}% de similaridade</span>
          </div>
        </div>
      )}
    </div>
  );
}
