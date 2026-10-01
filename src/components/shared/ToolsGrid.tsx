import { useState } from 'react';
import { UTILITIES } from '../../data/utilities';

export default function ToolsGrid() {
  const [cat, setCat] = useState<'all' | 'calculator' | 'generator'>('all');
  const filtered = UTILITIES.filter((u) => cat === 'all' || u.category === cat);

  return (
    <section id="tools" className="bg-gray-50 dark:bg-[#0c0c0f] py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-3">Free tools that actually help</h2>
          <p className="text-gray-500 dark:text-neutral-400 max-w-xl mx-auto">Calculators and one-page generators your business will use every week. No login, instant results, mobile-friendly.</p>
        </div>
        <div className="flex items-center justify-center gap-2 mb-8">
          {(['all', 'calculator', 'generator'] as const).map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={`px-5 py-2 rounded-full text-xs font-semibold capitalize border transition-all ${
                cat === c
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-500/20'
                  : 'bg-white dark:bg-neutral-900 text-gray-600 dark:text-neutral-300 border-gray-200 dark:border-neutral-800 hover:border-indigo-400'
              }`}
            >
              {c === 'all' ? 'All (15)' : c === 'calculator' ? 'Calculators (12)' : 'Generators (3)'}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((u) => (
            <a key={u.slug} href={`/tools/${u.slug}`} className="group rounded-2xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow-lg hover:shadow-indigo-500/5 transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-sm">
                  {u.category === 'calculator' ? '🧮' : '📄'}
                </span>
                <span className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full ${u.category === 'calculator' ? 'bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-300' : 'bg-fuchsia-50 dark:bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-300'}`}>{u.category}</span>
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{u.name}</h3>
              <p className="text-sm text-gray-500 dark:text-neutral-400">{u.desc}</p>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
