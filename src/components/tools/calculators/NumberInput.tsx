interface NumberInputProps {
  id: string;
  label: string;
  value: string;
  onChange: (id: string, value: string) => void;
  placeholder?: string;
  min?: number | string;
  step?: string;
  required?: boolean;
}

export default function NumberInput({ id, label, value, onChange, placeholder, min, step = '0.01', required }: NumberInputProps) {
  return (
    <div>
      <label for={id} class="block text-sm font-medium text-[var(--color-text-secondary)] dark:text-neutral-400 mb-1">{label}</label>
      <input
        id={id}
        type="number"
        step={step}
        min={min}
        value={value}
        onChange={(e) => onChange(id, e.target.value)}
        placeholder={placeholder}
        required={required}
        class="w-full bg-[var(--color-surface)] border border-[var(--color-border)] dark:border-neutral-800 rounded-xl px-4 py-3 text-sm text-[var(--color-text-primary)] dark:text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all"
      />
    </div>
  );
}
