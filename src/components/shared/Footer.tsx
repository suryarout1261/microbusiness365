import { SITE_NAME } from '../../data/constants';

export default function Footer() {
  return (
    <footer class="w-full border-t border-gray-100 py-8">
      <div class="mx-auto max-w-5xl px-6 text-center">
        <p class="text-sm text-gray-400">
          © {new Date().getFullYear()} {SITE_NAME}. Built for small businesses.
        </p>
      </div>
    </footer>
  );
}
