import { useState } from 'react';
import Input from '../ui/Input';
import Button from '../ui/Button';

interface HeaderProps {
  currentPath?: string;
}

export default function Header({ currentPath = '/' }: HeaderProps) {
  const [search, setSearch] = useState('');

  return (
    <header className="flex items-center justify-between px-6 py-3 border-b border-[var(--color-border)] bg-[var(--color-surface-overlay)] backdrop-blur-md sticky top-0 z-10">
      <div className="flex items-center gap-3 text-sm text-[var(--color-text-secondary)]">
        <span>MicroBusiness365</span>
        <span>/</span>
        <span className="capitalize text-[var(--color-text-primary)]">{currentPath.replace('/', '').replace('-', ' ') || 'Overview'}</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="relative w-64 hidden md:block">
          <Input
            id="search"
            placeholder="Search..."
            value={search}
            onChange={setSearch}
            className="bg-[var(--color-surface)] border-[var(--color-border)] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]"
          />
        </div>
        <Button variant="primary" size="sm">New</Button>
      </div>
    </header>
  );
}
