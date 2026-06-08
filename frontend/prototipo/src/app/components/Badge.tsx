interface BadgeProps {
  children: React.ReactNode;
  variant: 'modalidade' | 'situacao';
  situacao?: 'divulgada' | 'suspensa' | 'revogada';
}

export function Badge({ children, variant, situacao }: BadgeProps) {
  if (variant === 'modalidade') {
    return (
      <span className="inline-block px-3 py-1 bg-[#1A3A5C] text-white text-[13px] rounded">
        {children}
      </span>
    );
  }

  const colors = {
    divulgada: 'bg-green-600 text-white',
    suspensa: 'bg-yellow-500 text-white',
    revogada: 'bg-red-600 text-white',
  };

  return (
    <span className={`inline-block px-3 py-1 text-[13px] rounded ${colors[situacao || 'divulgada']}`}>
      {children}
    </span>
  );
}
