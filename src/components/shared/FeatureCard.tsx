import type { Feature } from '../../types';

interface FeatureCardProps {
  feature: Feature;
}

export default function FeatureCard({ feature }: FeatureCardProps) {
  return (
    <div class="rounded-xl border border-gray-100 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
      <h3 class="text-base font-semibold text-gray-900">{feature.title}</h3>
      <p class="mt-2 text-sm text-gray-500 leading-relaxed">
        {feature.description}
      </p>
    </div>
  );
}
