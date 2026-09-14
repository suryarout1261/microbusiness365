import { db, type Customer, type Product, type Sale, type Expense } from './db';

export const customerRepo = {
  add: (c: Customer) => db.customers.put(c),
  update: (c: Customer) => db.customers.put(c),
  delete: (id: string) => db.customers.delete(id),
  get: (id: string) => db.customers.get(id),
  list: () => db.customers.toArray(),
  search: (q: string) => db.customers.where('name').startsWithIgnoreCase(q).toArray(),
};

export const productRepo = {
  add: (p: Product) => db.products.put(p),
  update: (p: Product) => db.products.put(p),
  delete: (id: string) => db.products.delete(id),
  get: (id: string) => db.products.get(id),
  list: () => db.products.where('active').equals(1).toArray(),
  byCategory: (cat: string) => db.products.where('category').equals(cat).toArray(),
};

export const saleRepo = {
  add: (s: Sale) => db.sales.put(s),
  get: (id: string) => db.sales.get(id),
  list: () => db.sales.orderBy('date').reverse().limit(50).toArray(),
};

export const expenseRepo = {
  add: (e: Expense) => db.expenses.put(e),
  list: () => db.expenses.orderBy('date').reverse().limit(50).toArray(),
};
