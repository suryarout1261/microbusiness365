import FeatureCard from './FeatureCard';
import { FEATURES } from '../../data/constants';

export default function Features() {
  return (
    <section id="features" class="w-full py-16 bg-gray-50">
      <div class="mx-auto max-w-5xl px-6">
        <h2 class="text-2xl font-bold tracking-tight text-gray-900 text-center mb-10">
          Everything you need
        </h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((feature) => (
            <FeatureCard key={feature.id} feature={feature} />
          ))}
        </div>
      </div>
    </section>
  );
}
