import { Search } from 'lucide-react';
import { Link, useLocation } from 'react-router';

interface HeaderProps {
  variant?: 'public' | 'admin';
}

export function Header({ variant = 'public' }: HeaderProps) {
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  if (variant === 'admin') {
    return (
      <header className="bg-[#1A3A5C] text-white px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Search className="w-6 h-6" />
          <span className="font-medium text-xl">LicitAI</span>
        </div>
        <nav className="flex items-center gap-8">
          <Link
            to="/admin"
            className={`hover:text-[#F5F7FA] transition-colors ${isActive('/admin') ? 'text-white' : 'text-white/80'}`}
          >
            Coletas
          </Link>
          <Link
            to="/admin"
            className="text-white/80 hover:text-[#F5F7FA] transition-colors"
          >
            Logs
          </Link>
          <Link
            to="/admin"
            className="text-white/80 hover:text-[#F5F7FA] transition-colors"
          >
            Exportar
          </Link>
          <Link
            to="/"
            className="text-white/80 hover:text-[#F5F7FA] transition-colors"
          >
            Sair
          </Link>
        </nav>
      </header>
    );
  }

  return (
    <header className="bg-[#1A3A5C] text-white px-8 py-4 flex items-center justify-between">
      <Link to="/" className="flex items-center gap-2">
        <Search className="w-6 h-6" />
        <span className="font-medium text-xl">LicitAI</span>
      </Link>
      <nav className="flex items-center gap-8">
        <Link
          to="/"
          className={`hover:text-[#F5F7FA] transition-colors ${isActive('/') ? 'text-white' : 'text-white/80'}`}
        >
          Buscar
        </Link>
        <Link
          to="/painel"
          className={`hover:text-[#F5F7FA] transition-colors ${isActive('/painel') ? 'text-white' : 'text-white/80'}`}
        >
          Painel Analítico
        </Link>
      </nav>
    </header>
  );
}
