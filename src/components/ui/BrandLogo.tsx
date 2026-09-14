interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg';
}

export default function BrandLogo({ size = 'md' }: BrandLogoProps) {
  const dims = { sm: 'h-7 w-7 text-sm', md: 'h-9 w-9 text-base', lg: 'h-12 w-12 text-lg' }[size];
  const text = { sm: 'text-base', md: 'text-lg', lg: 'text-2xl' }[size];
  return (
    <span className="inline-flex items-center gap-2">
      <span className={`inline-flex items-center justify-center rounded-[8px] bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 text-white font-bold ${dims}`}>
        M
      </span>
      <span className={`font-bold tracking-tight ${text} text-gray-900 dark:text-white`}>
        Micro Business<span className="text-indigo-600 dark:text-indigo-400"> 365</span>
      </span>
    </span>
  );
}
