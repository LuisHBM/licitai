import { X } from 'lucide-react';

interface FilterChipProps {
  label: string;
  onRemove: () => void;
}

export function FilterChip({ label, onRemove }: FilterChipProps) {
  return (
    <span className="inline-flex items-center gap-2 px-3 py-1 bg-[#F5F7FA] border border-[#E2E8F0] rounded text-[13px] text-[#111827]">
      {label}
      <button
        onClick={onRemove}
        className="hover:text-[#1A3A5C] transition-colors"
        aria-label="Remover filtro"
      >
        <X className="w-3 h-3" />
      </button>
    </span>
  );
}
