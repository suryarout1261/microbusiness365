import Dexie, { type Table } from 'dexie';

export interface Business {
  id: string; name: string; businessType: string; ownerName: string;
  phone: string; email: string; address: string; city: string; state: string;
  country: string; pincode: string; gstin?: string; currency: string;
  taxSettings: string; logo?: string; createdAt: string; updatedAt: string;
}

export interface Customer {
  id: string; name: string; phone?: string; email?: string; address?: string;
  gstin?: string; notes?: string; openingBalance: number; creditLimit?: number;
  createdAt: string; updatedAt: string;
}

export interface Supplier {
  id: string; name: string; phone?: string; email?: string; address?: string;
  gstin?: string; notes?: string; openingBalance: number; creditLimit?: number;
  createdAt: string; updatedAt: string;
}

export interface Category {
  id: string; name: string; type: 'product' | 'expense' | 'income'; color?: string;
  createdAt: string;
}

export interface Product {
  id: string; name: string; sku?: string; barcode?: string; categoryId?: string;
  type: 'physical' | 'service'; unit: string; purchasePrice: number; sellingPrice: number;
  taxRate: number; currentStock: number; minimumStock: number; supplierId?: string;
  description?: string; active: boolean; createdAt: string; updatedAt: string;
}

export interface StockMovement {
  id: string; productId: string; type: 'in' | 'out' | 'adjust'; quantity: number;
  reason: string; referenceType?: 'sale' | 'purchase'; referenceId?: string; date: string;
  createdAt: string;
}

export interface Sale {
  id: string; saleNumber: string; customerId?: string; date: string; subtotal: number;
  discount: number; tax: number; total: number; amountPaid: number; amountDue: number;
  paymentStatus: 'paid' | 'partial' | 'pending'; paymentMethod?: string; notes?: string;
  createdAt: string; updatedAt: string;
}

export interface SaleItem {
  id: string; saleId: string; productId: string; productNameSnapshot: string;
  quantity: number; unitPrice: number; discount: number; taxRate: number;
  taxAmount: number; total: number; costPriceSnapshot?: number;
}

export interface Purchase {
  id: string; purchaseNumber: string; supplierId?: string; date: string; subtotal: number;
  discount: number; tax: number; total: number; amountPaid: number; amountDue: number;
  paymentStatus: 'paid' | 'partial' | 'pending'; notes?: string; createdAt: string; updatedAt: string;
}

export interface PurchaseItem {
  id: string; purchaseId: string; productId: string; productNameSnapshot: string;
  quantity: number; unitPrice: number; discount: number; taxRate: number;
  total: number; createdAt: string;
}

export interface Invoice {
  id: string; invoiceNumber: string; saleId?: string; customerId?: string; date: string;
  subtotal: number; tax: number; total: number; status: 'draft' | 'sent' | 'paid' | 'overdue';
  notes?: string; createdAt: string;
}

export interface Quotation {
  id: string; quotationNumber: string; customerId?: string; date: string; validUntil?: string;
  subtotal: number; tax: number; total: number; status: 'draft' | 'sent' | 'accepted' | 'rejected';
  notes?: string; createdAt: string;
}

export interface QuotationItem {
  id: string; quotationId: string; productId: string; productNameSnapshot: string;
  quantity: number; unitPrice: number; discount: number; total: number; createdAt: string;
}

export interface Expense {
  id: string; expenseNumber: string; category: string; description: string;
  amount: number; date: string; paymentMethod?: string; notes?: string; createdAt: string;
}

export interface Payment {
  id: string; referenceType: 'sale' | 'purchase'; referenceId: string;
  customerId?: string; supplierId?: string; amount: number; date: string;
  method: string; notes?: string; direction: 'in' | 'out'; createdAt: string;
}

class MicroDB extends Dexie {
  business!: Table<Business>;
  customers!: Table<Customer>;
  suppliers!: Table<Supplier>;
  categories!: Table<Category>;
  products!: Table<Product>;
  stockMovements!: Table<StockMovement>;
  sales!: Table<Sale>;
  saleItems!: Table<SaleItem>;
  purchases!: Table<Purchase>;
  purchaseItems!: Table<PurchaseItem>;
  invoices!: Table<Invoice>;
  quotations!: Table<Quotation>;
  quotationItems!: Table<QuotationItem>;
  expenses!: Table<Expense>;
  payments!: Table<Payment>;

  constructor() {
    super('MicroBusiness365');
    this.version(3).stores({
      business: 'id, createdAt',
      customers: 'id, name, phone, createdAt',
      suppliers: 'id, name, phone, createdAt',
      categories: 'id, type, name',
      products: 'id, name, sku, categoryId, active, supplierId, createdAt',
      stockMovements: 'id, productId, type, referenceType, referenceId, date',
      sales: 'id, saleNumber, customerId, date, paymentStatus, createdAt',
      saleItems: 'id, saleId, productId',
      purchases: 'id, purchaseNumber, supplierId, date, paymentStatus, createdAt',
      purchaseItems: 'id, purchaseId, productId',
      invoices: 'id, invoiceNumber, saleId, customerId, status, createdAt',
      quotations: 'id, quotationNumber, customerId, status, createdAt',
      quotationItems: 'id, quotationId, productId',
      expenses: 'id, expenseNumber, category, date, createdAt',
      payments: 'id, referenceType, referenceId, customerId, supplierId, date, direction',
    });
  }
}

export const db = new MicroDB();
// Repository helpers for interconnections
export async function recalcCustomerBalance(id: string) {
  const c = await db.customers.get(id); if (!c) return;
  const sales = await db.sales.where('customerId').equals(id).toArray();
  const paymentsIn = await db.payments.where({ customerId: id, direction: 'in' }).toArray();
  const owed = sales.reduce((s, x) => s + (x.amountDue > 0 ? x.amountDue : 0), 0);
  const paid = paymentsIn.reduce((s, x) => s + x.amount, 0);
  await db.customers.update(id, { updatedAt: new Date().toISOString() });
}
export async function recalcSupplierBalance(id: string) {
  const s = await db.suppliers.get(id); if (!s) return;
  const purchases = await db.purchases.where('supplierId').equals(id).toArray();
  const paymentsOut = await db.payments.where({ supplierId: id, direction: 'out' }).toArray();
  const owed = purchases.reduce((sum, p) => sum + (p.amountDue > 0 ? p.amountDue : 0), 0);
  await db.suppliers.update(id, { updatedAt: new Date().toISOString() });
}
