export default function SearchBar() {
  return (
    <div className="w-full max-w-xl mx-auto">
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400">🔍</span>
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
