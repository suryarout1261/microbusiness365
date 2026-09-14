import { SITE_NAME } from '../../data/constants';

export default function Header() {
  return (
    <header class="w-full border-b border-gray-100">
      <div class="mx-auto max-w-5xl px-6 py-4 flex items-center justify-between">
        <span class="text-lg font-semibold tracking-tight text-gray-900">
          {SITE_NAME}
        </span>
        <nav>
          <a
            href="#features"
            class="text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            Features
          </a>
        </nav>
      </div>
    </header>
  );
}
