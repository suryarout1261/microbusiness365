import { blockDecimalKey, blockNegativeKey, sanitizeInteger, sanitizeAmount } from '../../../lib/utils';

interface NumberInputProps {
  id: string;
  label: string;
  value: string;
  onChange: (id: string, value: string) => void;
  placeholder?: string;
  min?: number | string;
  max?: number | string;
  step?: string;
  required?: boolean;
  type?: string;
  integerOnly?: boolean;
  disabled?: boolean;
}

export default function NumberInput({
  id,
  label,
  value,
  onChange,
  placeholder,
  min,
  max,
  step = '0.01',
  required,
  type = 'number',
  integerOnly = false,
  disabled = false,
}: NumberInputProps) {
  const actualStep = integerOnly ? '1' : step;
  const actualPlaceholder = type === 'date' && !placeholder ? 'dd-mm-yyyy' : placeholder;
  const isNonNegative = min !== undefined && Number(min) >= 0;

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-[var(--color-text-secondary)] dark:text-neutral-400 mb-1">
        {label}
      </label>
      <input
        id={id}
        type={type}
        step={type === 'number' ? actualStep : undefined}
        min={type === 'number' ? min : undefined}
        max={type === 'number' ? max : undefined}
        value={value}
        disabled={disabled}
        onKeyDown={(e) => {
          if (type === 'number') {
            if (integerOnly) {
              blockDecimalKey(e);
            } else if (isNonNegative) {
              blockNegativeKey(e);
            }
          }
        }}
        onChange={(e) => {
          const val = e.target.value;
          if (type === 'number') {
            if (integerOnly) {
              onChange(id, sanitizeInteger(val));
            } else if (isNonNegative) {
              onChange(id, sanitizeAmount(val));
            } else {
              onChange(id, val);
            }
          } else {
            onChange(id, val);
          }
        }}
        placeholder={actualPlaceholder}
        required={required}
        className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] dark:border-neutral-800 rounded-xl px-4 py-3 text-sm text-[var(--color-text-primary)] dark:text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all disabled:opacity-50"
      />
    </div>
  );
}
