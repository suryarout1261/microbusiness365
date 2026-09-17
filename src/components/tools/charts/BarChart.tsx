interface BarData {
  label: string;
  value: number;
  color?: string;
}

interface BarChartProps {
  data: BarData[];
  title?: string;
  unit?: string;
}

export default function BarChart({ data, title, unit = '' }: BarChartProps) {
  if (!data || data.length === 0) return null;
  const maxVal = Math.max(...data.map((d) => Math.abs(d.value)), 0.001);

  return (
    <div class="rounded-2xl border border-[var(--color-border)] dark:border-neutral-800 bg-[var(--color-surface-raised)] dark:bg-neutral-950 p-5 mt-6">
      {title && <h3 class="font-semibold text-sm mb-4 text-[var(--color-text-secondary)] dark:text-neutral-400 uppercase tracking-wider">{title}</h3>}
      <div class="flex items-end gap-3 h-40">
        {data.map((d, i) => {
          const height = (Math.abs(d.value) / maxVal) * 100;
          return (
            <div key={i} class="flex-1 flex flex-col items-center gap-2 h-full justify-end">
              <span class="text-xs font-medium text-[var(--color-text-secondary)] dark:text-neutral-400">{d.value.toLocaleString()}</span>
              <div
                class="w-full rounded-t-lg transition-all duration-700 ease-out"
                style={{
                  height: `${height}%`,
                  backgroundColor: d.color ?? '#6366f1',
                  minHeight: '4px',
                }}
              />
              <span class="text-[10px] text-[var(--color-text-muted)] dark:text-neutral-500 truncate w-full text-center">{d.label}</span>
            </div>
          );
        })}
      </div>
      {unit && <p class="text-xs text-[var(--color-text-muted)] mt-2 text-center">{unit}</p>}
    </div>
  );
}
