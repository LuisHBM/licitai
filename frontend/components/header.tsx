'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Search } from 'lucide-react';

interface HeaderProps {
  variant?: 'public' | 'admin';
}

export function Header({ variant = 'public' }: HeaderProps) {
  const pathname = usePathname();
  const isActive = (path: string) => pathname === path;

  if (variant === 'admin') {
    return (
      <header className="bg-[#1A3A5C] text-white px-8 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Search className="w-6 h-6" />
          <span className="font-medium text-xl">LicitAI</span>
        </Link>
        <nav className="flex items-center gap-8">
          <a href="#coletas" className="text-white/80 hover:text-white transition-colors text-[15px]">
            Coletas
          </a>
          <a href="#logs" className="text-white/80 hover:text-white transition-colors text-[15px]">
            Logs
          </a>
          <a href="#exportar" className="text-white/80 hover:text-white transition-colors text-[15px]">
            Exportar
          </a>
          <Link href="/" className="text-white/80 hover:text-white transition-colors text-[15px]">
            Sair
          </Link>
        </nav>
      </header>
    );
  }

  return (
    <header className="bg-[#1A3A5C] text-white px-8 py-4 flex items-center justify-between">
      <Link href="/" className="flex items-center gap-2">
        <Search className="w-6 h-6" />
        <span className="font-medium text-xl">LicitAI</span>
      </Link>
      <nav className="flex items-center gap-8">
        <Link
          href="/"
          className={`hover:text-[#F5F7FA] transition-colors ${isActive('/') ? 'text-white' : 'text-white/80'}`}
        >
          Buscar
        </Link>
        <Link
          href="/painel"
          className={`hover:text-[#F5F7FA] transition-colors ${isActive('/painel') ? 'text-white' : 'text-white/80'}`}
        >
          Painel Analítico
        </Link>
      </nav>
    </header>
  );
}
