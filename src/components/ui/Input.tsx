export interface InputProps {
  id?: string;
  type?: string;
  placeholder?: string;
  value?: string;
  onChange?: (v: string) => void;
  className?: string;
}

export default function Input({
  id,
  type = 'text',
  placeholder,
  value,
  onChange,
  className = '',
}: InputProps) {
  return (
    <input
      id={id}
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      className={`w-full bg-neutral-900 border border-neutral-800 rounded-[6px] px-3 py-2 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-neutral-600 transition-colors ${className}`}
    />
  );
}
