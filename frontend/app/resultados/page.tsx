import { Suspense } from 'react';
import { ResultadosContent } from './resultados-content';

export default function ResultadosPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F5F7FA]" />}>
      <ResultadosContent />
    </Suspense>
  );
}
