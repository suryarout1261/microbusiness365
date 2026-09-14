import { HERO_HEADLINE, HERO_SUBLINE } from '../../data/constants';

export default function Hero() {
  return (
    <section class="w-full py-20 md:py-28 text-center">
      <div class="mx-auto max-w-3xl px-6">
        <h1 class="text-4xl md:text-5xl font-bold tracking-tight text-gray-900 leading-tight">
          {HERO_HEADLINE}
        </h1>
        <p class="mt-5 text-lg text-gray-500 leading-relaxed">
          {HERO_SUBLINE}
        </p>
      </div>
    </section>
  );
}
