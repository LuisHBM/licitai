import { cn } from '@/lib/utils';

interface BadgeProps {
  variant: 'modalidade' | 'situacao';
  situacao?: 'divulgada' | 'suspensa' | 'revogada';
  children: React.ReactNode;
  className?: string;
}

const situacaoStyles = {
  divulgada: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  suspensa: 'bg-amber-50 text-amber-700 border-amber-200',
  revogada: 'bg-red-50 text-red-700 border-red-200',
};

export function Badge({ variant, situacao, children, className }: BadgeProps) {
  if (variant === 'situacao' && situacao) {
    return (
      <span
        className={cn(
          'inline-flex items-center px-2.5 py-0.5 text-[12px] font-medium rounded border capitalize',
          situacaoStyles[situacao],
          className
        )}
      >
        {children}
      </span>
    );
  }

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 bg-[#F5F7FA] text-[#1A3A5C] text-[12px] font-medium rounded border border-[#E2E8F0]',
        className
      )}
    >
      {children}
    </span>
  );
}
