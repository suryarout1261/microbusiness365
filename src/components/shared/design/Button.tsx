export default function Button({ children, onClick, variant = 'primary', type = 'button', className = '', disabled = false }: { children: React.ReactNode; onClick?: () => void; variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; type?: 'button' | 'submit'; className?: string; disabled?: boolean }) {
  const base = 'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 disabled:opacity-50';
  const styles = {
    primary: 'bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 text-white shadow-lg shadow-indigo-500/20 hover:brightness-110',
    secondary: 'bg-[var(--color-surface-overlay)] dark:bg-neutral-800 text-[var(--color-text-primary)] border border-[var(--color-border)] dark:border-neutral-700 hover:bg-gray-50 dark:hover:bg-neutral-700',
    ghost: 'text-[var(--color-text-secondary)] dark:text-neutral-300 hover:text-[var(--color-text-primary)] dark:hover:text-white hover:bg-gray-100 dark:hover:bg-neutral-800',
    danger: 'bg-rose-600 text-white hover:bg-rose-700 shadow-md shadow-rose-500/20',
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${styles[variant]} ${className}`}>
      {children}
    </button>
  );
}
