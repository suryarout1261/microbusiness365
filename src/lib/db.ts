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

export interface Product {
  id: string; name: string; sku?: string; barcode?: string; category?: string;
  type: 'physical' | 'service'; unit: string; purchasePrice: number; sellingPrice: number;
  taxRate: number; currentStock: number; minimumStock: number; supplierId?: string;
  description?: string; active: boolean; createdAt: string; updatedAt: string;
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
  products!: Table<Product>;
  sales!: Table<Sale>;
  saleItems!: Table<SaleItem>;
  expenses!: Table<Expense>;
  payments!: Table<Payment>;

  constructor() {
    super('MicroBusiness365');
    this.version(1).stores({
      business: 'id, createdAt',
      customers: 'id, name, phone, createdAt',
      products: 'id, name, sku, category, active, supplierId, createdAt',
      sales: 'id, saleNumber, customerId, date, paymentStatus, createdAt',
      saleItems: 'id, saleId, productId',
      expenses: 'id, expenseNumber, category, date, createdAt',
      payments: 'id, referenceType, referenceId, customerId, supplierId, date, direction',
    });
  }
}

export const db = new MicroDB();
