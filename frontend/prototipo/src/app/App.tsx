import { BrowserRouter, Routes, Route } from 'react-router';
import { Toaster } from 'sonner';
import { Home } from './pages/Home';
import { Resultados } from './pages/Resultados';
import { Detalhe } from './pages/Detalhe';
import { Painel } from './pages/Painel';
import { LoginAdmin } from './pages/LoginAdmin';
import { PainelAdmin } from './pages/PainelAdmin';

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/resultados" element={<Resultados />} />
        <Route path="/licitacao/:id" element={<Detalhe />} />
        <Route path="/painel" element={<Painel />} />
        <Route path="/login-admin" element={<LoginAdmin />} />
        <Route path="/admin" element={<PainelAdmin />} />
      </Routes>
    </BrowserRouter>
  );
}