export interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  className?: string;
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  onClick,
  className = '',
}: ButtonProps) {
  const base =
    'inline-flex items-center justify-center rounded-[6px] font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2';

  const variants = {
    primary:
      'bg-white text-black hover:bg-neutral-200 active:scale-[0.98]',
    secondary:
      'bg-neutral-900 text-white border border-neutral-700 hover:bg-neutral-800 hover:border-neutral-600',
    ghost:
      'text-neutral-300 hover:text-white hover:bg-neutral-900/50',
  };

  const sizes = {
    sm: 'text-xs px-3 py-1.5 gap-1.5',
    md: 'text-sm px-4 py-2 gap-2',
    lg: 'text-base px-5 py-2.5 gap-2.5',
  };

  return (
    <button
      onClick={onClick}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {children}
    </button>
  );
}
