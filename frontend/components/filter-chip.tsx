import { X } from 'lucide-react';

interface FilterChipProps {
  label: string;
  onRemove: () => void;
}

export function FilterChip({ label, onRemove }: FilterChipProps) {
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#1A3A5C] text-white text-[13px] font-medium rounded-full">
      {label}
      <button
        onClick={onRemove}
        aria-label={`Remover filtro ${label}`}
        className="hover:opacity-70 transition-opacity"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </span>
  );
}
