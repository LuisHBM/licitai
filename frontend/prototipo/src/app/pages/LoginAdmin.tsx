import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Search, Eye, EyeOff } from 'lucide-react';

export function LoginAdmin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    navigate('/admin');
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA] flex items-center justify-center px-4">
      <div className="w-full max-w-[400px] bg-white border border-[#E2E8F0] rounded-lg p-8">
        <div className="flex items-center justify-center gap-2 mb-8">
          <Search className="w-8 h-8 text-[#1A3A5C]" />
          <span className="text-[24px] text-[#1A3A5C] font-medium">LicitAI</span>
        </div>

        <h1 className="text-[24px] text-[#111827] font-medium text-center mb-8">
          Acesso administrativo
        </h1>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-[13px] text-[#111827] font-medium mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 bg-[#F5F7FA] border border-[#E2E8F0] rounded text-[16px] text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#2E6DA4]"
              placeholder="admin@licitai.gov.br"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-[13px] text-[#111827] font-medium mb-2">
              Senha
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 bg-[#F5F7FA] border border-[#E2E8F0] rounded text-[16px] text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#2E6DA4]"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-[#111827]"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="w-full px-4 py-3 bg-[#1A3A5C] text-white rounded hover:bg-[#2E6DA4] transition-colors font-medium text-[16px]"
          >
            Entrar
          </button>
        </form>

        <p className="text-[13px] text-[#6B7280] text-center mt-6">
          Acesso restrito a administradores do sistema
        </p>
      </div>
    </div>
  );
}
