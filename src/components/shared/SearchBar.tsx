import { useState } from 'react';
import { UTILITIES } from '../../data/utilities';

export default function SearchBar({ onSearch }: { onSearch?: (q: string) => void }) {
  const [q, setQ] = useState('');
  const [focus, setFocus] = useState(false);

  const suggestions = q.trim()
    ? UTILITIES.filter((u) => u.name.toLowerCase().includes(q.toLowerCase()) || u.desc.toLowerCase().includes(q.toLowerCase()))
    : [];

  const handle = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch) onSearch(q);
    if (!onSearch && q.trim()) {
      const el = document.getElementById('tools');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <form onSubmit={handle} className="w-full max-w-xl mx-auto relative" role="search" aria-label="Site search" id="search-form">
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" aria-hidden="true"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg></span>
        <input
          type="text"
          id="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => setFocus(true)}
          onBlur={() => setTimeout(() => setFocus(false), 150)}
          placeholder="Search calculators, generators, guides…"
          className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 text-sm text-gray-900 dark:text-white placeholder:text-neutral-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-transparent transition-all"
          aria-label="Search"
          autoComplete="off"
        />
        <button type="submit" aria-label="Search" className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors">Search</button>
      </div>

      {focus && suggestions.length > 0 && (
        <ul className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-[#0a0a0a] border border-gray-200 dark:border-neutral-800 rounded-2xl shadow-2xl shadow-black/10 overflow-hidden z-50">
          {suggestions.map((s) => (
            <li key={s.slug}>
              <a href={`/tools/${s.slug}`} className="block px-4 py-3 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors" onMouseDown={(e) => e.preventDefault()}>
                <div className="text-sm font-medium text-gray-900 dark:text-white">{s.name}</div>
                <div className="text-xs text-neutral-500 dark:text-neutral-400">{s.desc}</div>
              </a>
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}
