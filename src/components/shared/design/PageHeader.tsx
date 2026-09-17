export default function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h1 className="text-[32px] font-extrabold leading-tight tracking-tight text-[var(--color-text-primary)] dark:text-white mb-2">{title}</h1>
      {subtitle && <p className="text-base text-[var(--color-text-secondary)] dark:text-neutral-400 leading-relaxed">{subtitle}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
