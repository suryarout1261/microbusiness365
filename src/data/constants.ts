import type { Feature } from '../types';

export const SITE_NAME = 'MicroBusiness365';

export const HERO_HEADLINE = 'Simple tools for small businesses.';

export const HERO_SUBLINE =
  'Manage sales, inventory, customers, expenses, and invoices — all in one place. No sign-in, no ads, no hassle.';

export const FEATURES: Feature[] = [
  {
    id: 'sales',
    title: 'Sales',
    description: 'Track every sale in one place without complicated setups.',
  },
  {
    id: 'inventory',
    title: 'Inventory',
    description: 'Keep tabs on stock levels with zero learning curve.',
  },
  {
    id: 'customers',
    title: 'Customers',
    description: 'Organize your contacts and relationships simply.',
  },
  {
    id: 'expenses',
    title: 'Expenses',
    description: 'Log costs quickly and stay on top of your money.',
  },
  {
    id: 'invoices',
    title: 'Invoices',
    description: 'Create and send invoices with just a few clicks.',
  },
];
