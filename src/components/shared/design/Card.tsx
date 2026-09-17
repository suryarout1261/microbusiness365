export default function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-[var(--color-surface-raised)] dark:bg-[#121212] border border-[var(--color-border)] dark:border-neutral-800 rounded-2xl p-5 shadow-sm transition-colors ${className}`}>
      {children}
    </div>
  );
}
