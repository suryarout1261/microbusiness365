export default function SearchBar() {
  return (
    <div className="w-full max-w-xl mx-auto">
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" aria-hidden="true"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg></span>
        <input
          type="text"
          id="search"
          placeholder="Search calculators, generators, guides…"
          className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 text-sm text-gray-900 dark:text-white placeholder:text-neutral-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-transparent transition-all"
        />
      </div>
    </div>
  );
}
