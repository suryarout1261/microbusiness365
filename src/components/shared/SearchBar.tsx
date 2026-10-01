import { useState, useRef, useEffect } from 'react';
import { UTILITIES, type Utility } from '../../data/utilities';

export default function SearchBar({ onSearch }: { onSearch?: (q: string) => void }) {
  const [q, setQ] = useState('');
  const [focus, setFocus] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  const query = q.trim().toLowerCase();
  const suggestions: Utility[] = query
    ? UTILITIES.filter(
        (u) =>
          u.name.toLowerCase().includes(query) ||
          u.desc.toLowerCase().includes(query) ||
          u.slug.toLowerCase().includes(query) ||
          u.category.toLowerCase().includes(query)
      )
    : UTILITIES;

  useEffect(() => {
    setSelectedIndex(-1);
  }, [q]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!focus || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Escape') {
      setFocus(false);
    }
  };

  const handle = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch) {
      onSearch(q);
      return;
    }

    if (suggestions.length > 0) {
      const target = selectedIndex >= 0 ? suggestions[selectedIndex] : suggestions[0];
      window.location.href = `/tools/${target.slug}`;
    } else if (q.trim()) {
      const el = document.getElementById('tools');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        window.location.href = '/tools';
      }
    }
  };

  return (
    <form onSubmit={handle} className="w-full max-w-xl mx-auto relative text-left" role="search" aria-label="Site search" id="search-form">
      <div className="relative z-30">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
        </span>
        <input
          ref={inputRef}
          type="text"
          id="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => setFocus(true)}
          onBlur={() => setTimeout(() => setFocus(false), 220)}
          onKeyDown={handleKeyDown}
          placeholder="Search calculators, generators, guides…"
          className="w-full pl-11 pr-24 py-3.5 rounded-2xl bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 text-sm text-gray-900 dark:text-white placeholder:text-neutral-400 shadow-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-transparent transition-all"
          aria-label="Search calculators, generators, guides"
          autoComplete="off"
        />
        <button
          type="submit"
          aria-label="Search calculators"
          className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-xs font-bold hover:brightness-110 active:scale-95 transition-all shadow-sm cursor-pointer"
        >
          Search
        </button>
      </div>

      {focus && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-[#0e0e12] border border-gray-200 dark:border-neutral-800 rounded-2xl shadow-2xl shadow-black/30 overflow-hidden z-[100] max-h-[60vh] sm:max-h-[380px] flex flex-col">
          <div className="px-4 py-2 border-b border-gray-100 dark:border-neutral-800/60 bg-gray-50/70 dark:bg-neutral-900/50 flex items-center justify-between text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 shrink-0">
            <span>{query ? `Matching Tools (${suggestions.length})` : 'All Business Tools (15)'}</span>
            <span className="text-[10px] text-indigo-600 dark:text-indigo-400">Tap to open</span>
          </div>

          <ul className="divide-y divide-gray-100 dark:divide-neutral-800/60 overflow-y-auto flex-1">
            {suggestions.map((s, idx) => (
              <li key={s.slug}>
                <a
                  href={`/tools/${s.slug}`}
                  className={`flex items-center justify-between p-3 sm:px-4 sm:py-3 transition-colors ${
                    selectedIndex === idx
                      ? 'bg-indigo-50 dark:bg-indigo-900/30'
                      : 'hover:bg-gray-50 dark:hover:bg-neutral-800/60'
                  }`}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    window.location.href = `/tools/${s.slug}`;
                  }}
                >
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    <span className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-sm shrink-0">
                      {s.category === 'calculator' ? '🧮' : '📄'}
                    </span>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">{s.name}</div>
                      <div className="text-xs text-neutral-500 dark:text-neutral-400 truncate">{s.desc}</div>
                    </div>
                  </div>
                  <span className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                    s.category === 'calculator'
                      ? 'bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-300'
                      : 'bg-fuchsia-50 dark:bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-300'
                  }`}>
                    {s.category}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {focus && query && suggestions.length === 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 p-4 bg-white dark:bg-[#0e0e12] border border-gray-200 dark:border-neutral-800 rounded-2xl shadow-2xl text-center text-xs text-neutral-500 dark:text-neutral-400 z-[100]">
          No tools found matching &ldquo;{q}&rdquo;. Try &ldquo;GST&rdquo;, &ldquo;Invoice&rdquo;, or &ldquo;Profit&rdquo;.
        </div>
      )}
    </form>
  );
}
