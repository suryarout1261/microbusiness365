import { useState } from 'react';
import Input from '../ui/Input';
import Button from '../ui/Button';

interface HeaderProps {
  currentPath?: string;
}

export default function Header({ currentPath = '/' }: HeaderProps) {
  const [search, setSearch] = useState('');

  return (
    <header className="flex items-center justify-between px-6 py-3 border-b border-neutral-800 bg-neutral-900/60 backdrop-blur-md sticky top-0 z-10">
      <div className="flex items-center gap-3 text-sm text-neutral-400">
        <span>MicroBusiness365</span>
        <span>/</span>
        <span className="capitalize text-neutral-300">{currentPath.replace('/', '').replace('-', ' ') || 'Overview'}</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="relative w-64 hidden md:block">
          <Input
            id="search"
            placeholder="Search..."
            value={search}
            onChange={setSearch}
            className="bg-neutral-950 border-neutral-700 text-sm"
          />
        </div>
        <Button variant="primary" size="sm">New</Button>
      </div>
    </header>
  );
}
