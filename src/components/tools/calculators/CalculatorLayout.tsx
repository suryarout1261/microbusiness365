import type { ReactNode } from 'react';

interface CalculatorLayoutProps {
  title: string;
  children: ReactNode;
  resultLabel?: string;
  resultValue?: string;
  resultSubtext?: string;
  resultDetails?: { label: string; value: string }[];
  chartBars?: { label: string; value: number; color?: string }[];
  onCalculate?: () => void;
  onReset?: () => void;
}

export default function CalculatorLayout({
  title,
  children,
  resultLabel = 'RESULT',
  resultValue = '',
  resultSubtext,
  resultDetails,
  chartBars,
  onCalculate,
  onReset,
}: CalculatorLayoutProps) {
  const maxBar =
    chartBars && chartBars.length > 0
      ? Math.max(...chartBars.map((b) => b.value), 0.001)
      : 0;

  const hasResult = true;

  return (
    <div className="w-full min-h-screen bg-[var(--color-surface)] text-[var(--color-text-primary)] flex flex-col overflow-x-hidden">

      {/* PAGE CONTENT */}
      <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 pt-24 sm:pt-28 pb-16">

        {/* CONTENT WIDTH ONLY */}
        <div className="w-full max-w-[1280px] mx-auto">

          {/* TITLE */}
          <div className="text-center mb-10">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-[var(--color-text-primary)] dark:text-white mb-3 bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
              {title}
            </h1>

            <p className="text-base sm:text-lg text-[var(--color-text-secondary)] dark:text-neutral-400">
              Quick, accurate calculations for your micro-business.
            </p>
          </div>

          {/* CALCULATOR INPUT CARD */}
          <div className="w-full max-w-[800px] mx-auto bg-white dark:bg-[#0a0a0a] rounded-3xl border border-gray-200 dark:border-neutral-800 p-6 sm:p-8 shadow-xl shadow-black/5 dark:shadow-none mb-8">

            <h2 className="text-xs font-extrabold uppercase tracking-[0.2em] text-[var(--color-text-secondary)] dark:text-neutral-400 mb-5">
              Inputs
            </h2>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                onCalculate?.();
              }}
              className="space-y-5"
              noValidate
            >
              {children}

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="submit"
                  className="w-full sm:flex-1 bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 hover:brightness-110 text-white font-bold py-3.5 px-6 rounded-xl transition-all active:scale-[0.98] shadow-lg shadow-indigo-500/25 text-base"
                >
                  Calculate
                </button>

                <button
                  type="button"
                  onClick={() => onReset?.()}
                  className="w-full sm:w-auto px-6 py-3.5 rounded-xl border border-gray-200 dark:border-neutral-700 text-[var(--color-text-secondary)] dark:text-neutral-300 font-semibold hover:bg-gray-50 dark:hover:bg-neutral-900 transition-colors text-base"
                >
                  Reset
                </button>
              </div>
            </form>
          </div>

          {/* RESULT */}
          {hasResult && (
            <section
              aria-label="Calculation result"
              className="w-full max-w-[800px] mx-auto rounded-3xl border-2 border-indigo-200 dark:border-indigo-800/60 bg-gradient-to-br from-indigo-50/90 to-violet-50/90 dark:from-indigo-950/50 dark:to-violet-950/30 p-6 sm:p-8 md:p-10 text-center shadow-2xl shadow-indigo-500/10 mb-8"
            >
              <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400 mb-3">
                {resultLabel}
              </p>

              {/* RESPONSIVE MAIN VALUE */}
              <p
                className="font-black text-indigo-700 dark:text-indigo-200 leading-none tracking-tight mb-4 break-all"
                style={{
                  fontSize: 'clamp(2.5rem, 7vw, 6rem)',
                }}
              >
                {resultValue}
              </p>

              {resultSubtext && (
                <p className="text-base sm:text-lg font-medium text-indigo-600 dark:text-indigo-300 mb-6">
                  {resultSubtext}
                </p>
              )}

              {/* DYNAMIC RESULT GRID */}
              {resultDetails && resultDetails.length > 0 && (
                <div
                  className="
                    grid
                    grid-cols-[repeat(auto-fit,minmax(min(100%,220px),1fr))]
                    gap-3 sm:gap-4
                    text-left
                  "
                >
                  {resultDetails.map((d, i) => (
                    <div
                      key={i}
                      className="min-w-0 bg-white/70 dark:bg-neutral-900/70 rounded-xl p-4 border border-indigo-200/50 dark:border-indigo-800/40"
                    >
                      <p className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-500 dark:text-indigo-300 mb-1">
                        {d.label}
                      </p>

                      <p className="text-lg sm:text-xl font-extrabold text-indigo-900 dark:text-indigo-100 break-words">
                        {d.value}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* BREAKDOWN */}
          {chartBars && chartBars.length > 0 && (
            <div className="w-full max-w-[800px] mx-auto rounded-3xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-[#0a0a0a] p-6 md:p-8 shadow-sm mb-8">
              <h3 className="font-extrabold text-sm mb-6 text-[var(--color-text-secondary)] dark:text-neutral-400 uppercase tracking-[0.15em]">
                Breakdown
              </h3>

              <div className="space-y-6">
                {chartBars.map((bar, i) => (
                  <div key={i}>
                    <div className="flex flex-col sm:flex-row sm:justify-between gap-1 text-base mb-2 font-bold">
                      <span className="text-[var(--color-text-primary)] dark:text-neutral-200">
                        {bar.label}
                      </span>

                      <span className="text-[var(--color-text-secondary)] dark:text-neutral-400">
                        ₹
                        {bar.value.toLocaleString('en-IN', {
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>

                    <div className="h-5 rounded-full bg-gray-200 dark:bg-neutral-800 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700 ease-out shadow-sm"
                        style={{
                          width: `${(bar.value / maxBar) * 100}%`,
                          backgroundColor: bar.color ?? '#6366f1',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </main>

    </div>
  );
}