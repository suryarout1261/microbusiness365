import { db, type SyncQueueItem } from '../db';
import { getSupabaseClient } from '../supabase/client';
import { authStore } from '../auth/authStore';
import { syncStore } from './syncStore';
import type { LocalDataSummary } from './syncTypes';

// Helpers to map Dexie (camelCase) to Supabase (snake_case)
function mapToCloud(table: string, entity: any, businessId: string) {
  const base = {
    id: entity.id,
    business_id: businessId,
    created_at: entity.createdAt || new Date().toISOString(),
    updated_at: entity.updatedAt || entity.createdAt || new Date().toISOString(),
  };

  switch (table) {
    case 'customers':
      return {
        ...base,
        name: entity.name,
        phone: entity.phone || null,
        email: entity.email || null,
        address: entity.address || null,
        gstin: entity.gstin || null,
        notes: entity.notes || null,
        opening_balance: entity.openingBalance || 0,
        credit_limit: entity.creditLimit || 0,
      };
    case 'suppliers':
      return {
        ...base,
        name: entity.name,
        phone: entity.phone || null,
        email: entity.email || null,
        address: entity.address || null,
        gstin: entity.gstin || null,
        notes: entity.notes || null,
        opening_balance: entity.openingBalance || 0,
        credit_limit: entity.creditLimit || 0,
        supply_types: entity.supplyTypes || null,
      };
    case 'categories':
      return {
        ...base,
        name: entity.name,
        type: entity.type,
        color: entity.color || null,
      };
    case 'products':
      return {
        ...base,
        name: entity.name,
        sku: entity.sku || null,
        barcode: entity.barcode || null,
        category_id: entity.categoryId || null,
        type: entity.type || 'physical',
        unit: entity.unit || 'pcs',
        purchase_price: entity.purchasePrice || 0,
        selling_price: entity.sellingPrice || 0,
        tax_rate: entity.taxRate || 18,
        current_stock: entity.currentStock || 0,
        minimum_stock: entity.minimumStock || 5,
        supplier_id: entity.supplierId || null,
        description: entity.description || null,
        active: entity.active !== false,
      };
    case 'stockMovements':
      return {
        ...base,
        product_id: entity.productId,
        type: entity.type,
        quantity: entity.quantity,
        reason: entity.reason || null,
        reference_type: entity.referenceType || null,
        reference_id: entity.referenceId || null,
        date: entity.date || null,
      };
    case 'sales':
      return {
        ...base,
        sale_number: entity.saleNumber,
        customer_id: entity.customerId || null,
        date: entity.date || null,
        subtotal: entity.subtotal || 0,
        discount: entity.discount || 0,
        tax: entity.tax || 0,
        total: entity.total || 0,
        amount_paid: entity.amountPaid || 0,
        amount_due: entity.amountDue || 0,
        payment_status: entity.paymentStatus || 'pending',
        payment_method: entity.paymentMethod || 'cash',
        notes: entity.notes || null,
      };
    case 'saleItems':
      return {
        id: entity.id,
        business_id: businessId,
        sale_id: entity.saleId,
        product_id: entity.productId || null,
        product_name_snapshot: entity.productNameSnapshot || null,
        quantity: entity.quantity || 1,
        unit_price: entity.unitPrice || 0,
        discount: entity.discount || 0,
        tax_rate: entity.taxRate || 18,
        tax_amount: entity.taxAmount || 0,
        total: entity.total || 0,
        cost_price_snapshot: entity.costPriceSnapshot || null,
        created_at: entity.createdAt || new Date().toISOString(),
        updated_at: entity.createdAt || new Date().toISOString(),
      };
    case 'purchases':
      return {
        ...base,
        purchase_number: entity.purchaseNumber,
        supplier_id: entity.supplierId || null,
        date: entity.date || null,
        subtotal: entity.subtotal || 0,
        discount: entity.discount || 0,
        tax: entity.tax || 0,
        total: entity.total || 0,
        amount_paid: entity.amountPaid || 0,
        amount_due: entity.amountDue || 0,
        payment_status: entity.paymentStatus || 'pending',
        notes: entity.notes || null,
      };
    case 'purchaseItems':
      return {
        id: entity.id,
        business_id: businessId,
        purchase_id: entity.purchaseId,
        product_id: entity.productId || null,
        product_name_snapshot: entity.productNameSnapshot || null,
        quantity: entity.quantity || 1,
        unit_price: entity.unitPrice || 0,
        discount: entity.discount || 0,
        tax_rate: entity.taxRate || 18,
        total: entity.total || 0,
        created_at: entity.createdAt || new Date().toISOString(),
        updated_at: entity.createdAt || new Date().toISOString(),
      };
    case 'invoices':
      return {
        ...base,
        invoice_number: entity.invoiceNumber || entity.invoiceNo || 'INV',
        invoice_no: entity.invoiceNo || entity.invoiceNumber || 'INV',
        sale_id: entity.saleId || null,
        customer_id: entity.customerId || null,
        customer_name: entity.customerName || null,
        customer_address: entity.customerAddress || null,
        customer_gstin: entity.customerGstin || null,
        date: entity.date || null,
        due_date: entity.dueDate || null,
        subtotal: entity.subtotal || 0,
        tax: entity.tax || 0,
        total: entity.total || 0,
        paid_amount: entity.paidAmount || 0,
        due_amount: entity.dueAmount !== undefined ? entity.dueAmount : entity.total || 0,
        status: entity.status || 'pending',
        notes: entity.notes || null,
        items: entity.items ? JSON.parse(JSON.stringify(entity.items)) : null,
      };
    case 'quotations':
      return {
        ...base,
        quotation_number: entity.quotationNumber,
        customer_id: entity.customerId || null,
        date: entity.date || null,
        valid_until: entity.validUntil || null,
        subtotal: entity.subtotal || 0,
        tax: entity.tax || 0,
        total: entity.total || 0,
        status: entity.status || 'draft',
        notes: entity.notes || null,
      };
    case 'quotationItems':
      return {
        id: entity.id,
        business_id: businessId,
        quotation_id: entity.quotationId,
        product_id: entity.productId || null,
        product_name_snapshot: entity.productNameSnapshot || null,
        quantity: entity.quantity || 1,
        unit_price: entity.unitPrice || 0,
        discount: entity.discount || 0,
        total: entity.total || 0,
        created_at: entity.createdAt || new Date().toISOString(),
        updated_at: entity.createdAt || new Date().toISOString(),
      };
    case 'expenses':
      return {
        ...base,
        expense_number: entity.expenseNumber,
        category: entity.category,
        description: entity.description || null,
        amount: entity.amount || 0,
        date: entity.date || null,
        payment_method: entity.paymentMethod || null,
        notes: entity.notes || null,
      };
    case 'payments':
      return {
        ...base,
        payment_number: entity.paymentNumber || null,
        reference_type: entity.referenceType,
        reference_id: entity.referenceId || null,
        customer_id: entity.customerId || null,
        supplier_id: entity.supplierId || null,
        amount: entity.amount || 0,
        date: entity.date || null,
        method: entity.method || 'cash',
        notes: entity.notes || null,
        direction: entity.direction,
      };
    default:
      return { ...base, ...entity };
  }
}

// Map Postgres snake_case table name to Dexie table property
function getDexieTable(tableName: string) {
  switch (tableName) {
    case 'stock_movements':
      return db.stockMovements;
    case 'sale_items':
      return db.saleItems;
    case 'purchase_items':
      return db.purchaseItems;
    case 'quotation_items':
      return db.quotationItems;
    case 'customers':
      return db.customers;
    case 'suppliers':
      return db.suppliers;
    case 'categories':
      return db.categories;
    case 'products':
      return db.products;
    case 'sales':
      return db.sales;
    case 'purchases':
      return db.purchases;
    case 'invoices':
      return db.invoices;
    case 'quotations':
      return db.quotations;
    case 'expenses':
      return db.expenses;
    case 'payments':
      return db.payments;
    default:
      return (db as any)[tableName];
  }
}

// Map Postgres row back to Dexie local object
function mapToLocal(tableName: string, row: any) {
  const base = {
    id: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };

  switch (tableName) {
    case 'customers':
      return {
        ...base,
        name: row.name,
        phone: row.phone || '',
        email: row.email || '',
        address: row.address || '',
        gstin: row.gstin || '',
        notes: row.notes || '',
        openingBalance: Number(row.opening_balance) || 0,
        creditLimit: Number(row.credit_limit) || 0,
      };
    case 'suppliers':
      return {
        ...base,
        name: row.name,
        phone: row.phone || '',
        email: row.email || '',
        address: row.address || '',
        gstin: row.gstin || '',
        notes: row.notes || '',
        openingBalance: Number(row.opening_balance) || 0,
        creditLimit: Number(row.credit_limit) || 0,
        supplyTypes: row.supply_types || [],
      };
    case 'categories':
      return {
        ...base,
        name: row.name,
        type: row.type,
        color: row.color,
      };
    case 'products':
      return {
        ...base,
        name: row.name,
        sku: row.sku || '',
        barcode: row.barcode || '',
        categoryId: row.category_id,
        type: row.type || 'physical',
        unit: row.unit || 'pcs',
        purchasePrice: Number(row.purchase_price) || 0,
        sellingPrice: Number(row.selling_price) || 0,
        taxRate: Number(row.tax_rate) || 18,
        currentStock: Number(row.current_stock) || 0,
        minimumStock: Number(row.minimum_stock) || 5,
        supplierId: row.supplier_id,
        description: row.description || '',
        active: row.active !== false,
      };
    case 'stock_movements':
      return {
        ...base,
        productId: row.product_id,
        type: row.type,
        quantity: Number(row.quantity) || 0,
        reason: row.reason || '',
        referenceType: row.reference_type,
        referenceId: row.reference_id,
        date: row.date || row.created_at,
      };
    case 'sales':
      return {
        ...base,
        saleNumber: row.sale_number,
        customerId: row.customer_id,
        date: row.date || row.created_at,
        subtotal: Number(row.subtotal) || 0,
        discount: Number(row.discount) || 0,
        tax: Number(row.tax) || 0,
        total: Number(row.total) || 0,
        amountPaid: Number(row.amount_paid) || 0,
        amountDue: Number(row.amount_due) || 0,
        paymentStatus: row.payment_status || 'pending',
        paymentMethod: row.payment_method || 'cash',
        notes: row.notes || '',
      };
    case 'sale_items':
      return {
        id: row.id,
        saleId: row.sale_id,
        productId: row.product_id,
        productNameSnapshot: row.product_name_snapshot,
        quantity: Number(row.quantity) || 1,
        unitPrice: Number(row.unit_price) || 0,
        discount: Number(row.discount) || 0,
        taxRate: Number(row.tax_rate) || 18,
        taxAmount: Number(row.tax_amount) || 0,
        total: Number(row.total) || 0,
        costPriceSnapshot: row.cost_price_snapshot ? Number(row.cost_price_snapshot) : undefined,
        createdAt: row.created_at,
      };
    case 'purchases':
      return {
        ...base,
        purchaseNumber: row.purchase_number,
        supplierId: row.supplier_id,
        date: row.date || row.created_at,
        subtotal: Number(row.subtotal) || 0,
        discount: Number(row.discount) || 0,
        tax: Number(row.tax) || 0,
        total: Number(row.total) || 0,
        amountPaid: Number(row.amount_paid) || 0,
        amountDue: Number(row.amount_due) || 0,
        paymentStatus: row.payment_status || 'pending',
        notes: row.notes || '',
      };
    case 'purchase_items':
      return {
        id: row.id,
        purchaseId: row.purchase_id,
        productId: row.product_id,
        productNameSnapshot: row.product_name_snapshot,
        quantity: Number(row.quantity) || 1,
        unitPrice: Number(row.unit_price) || 0,
        discount: Number(row.discount) || 0,
        taxRate: Number(row.tax_rate) || 18,
        total: Number(row.total) || 0,
        createdAt: row.created_at,
      };
    case 'invoices':
      return {
        ...base,
        invoiceNumber: row.invoice_number,
        invoiceNo: row.invoice_no || row.invoice_number,
        saleId: row.sale_id,
        customerId: row.customer_id,
        customerName: row.customer_name,
        customerAddress: row.customer_address,
        customerGstin: row.customer_gstin,
        date: row.date || row.created_at,
        dueDate: row.due_date,
        subtotal: Number(row.subtotal) || 0,
        tax: Number(row.tax) || 0,
        total: Number(row.total) || 0,
        paidAmount: Number(row.paid_amount) || 0,
        dueAmount: Number(row.due_amount) !== undefined ? Number(row.due_amount) : Number(row.total) || 0,
        status: row.status,
        notes: row.notes || '',
        items: row.items || [],
      };
    case 'quotations':
      return {
        ...base,
        quotationNumber: row.quotation_number,
        customerId: row.customer_id,
        date: row.date || row.created_at,
        validUntil: row.valid_until,
        subtotal: Number(row.subtotal) || 0,
        tax: Number(row.tax) || 0,
        total: Number(row.total) || 0,
        status: row.status,
        notes: row.notes || '',
      };
    case 'quotation_items':
      return {
        id: row.id,
        quotationId: row.quotation_id,
        productId: row.product_id,
        productNameSnapshot: row.product_name_snapshot,
        quantity: Number(row.quantity) || 1,
        unitPrice: Number(row.unit_price) || 0,
        discount: Number(row.discount) || 0,
        total: Number(row.total) || 0,
        createdAt: row.created_at,
      };
    case 'expenses':
      return {
        ...base,
        expenseNumber: row.expense_number,
        category: row.category,
        description: row.description || '',
        amount: Number(row.amount) || 0,
        date: row.date || row.created_at,
        paymentMethod: row.payment_method,
        notes: row.notes || '',
      };
    case 'payments':
      return {
        ...base,
        paymentNumber: row.payment_number,
        referenceType: row.reference_type,
        referenceId: row.reference_id,
        customerId: row.customer_id,
        supplierId: row.supplier_id,
        amount: Number(row.amount) || 0,
        date: row.date || row.created_at,
        method: row.method,
        notes: row.notes || '',
        direction: row.direction,
      };
    default:
      return { ...base, ...row };
  }
}

// Queue local modification into Dexie syncQueue
export async function queueLocalChange(
  table: string,
  entityId: string,
  action: 'insert' | 'update' | 'delete',
  payload: any
) {
  try {
    const item: SyncQueueItem = {
      id: crypto.randomUUID(),
      table,
      entityId,
      action,
      payload,
      status: 'pending',
      retries: 0,
      createdAt: new Date().toISOString(),
    };
    await db.syncQueue.put(item);
    const count = await db.syncQueue.count();
    syncStore.setPendingCount(count);

    // If online and authenticated, trigger sync in background
    const auth = authStore.getState();
    if (auth.isAuthenticated && auth.business?.id && navigator.onLine) {
      triggerBackgroundSync();
    }
  } catch (err) {
    console.warn('Failed to queue local change in Dexie:', err);
  }
}

// Push local queued changes to Supabase
let isSyncing = false;

export async function pushLocalChanges(businessId: string): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client || !navigator.onLine) return false;

  const queueItems = await db.syncQueue.where('status').equals('pending').toArray();
  if (queueItems.length === 0) return true;

  syncStore.setStatus('syncing');

  for (const item of queueItems) {
    try {
      const dbTable = item.table.replace(/([A-Z])/g, '_$1').toLowerCase(); // camelCase -> snake_case
      if (item.action === 'delete') {
        const { error } = await client
          .from(dbTable as any)
          .delete()
          .eq('id', item.entityId)
          .eq('business_id', businessId);

        if (error) throw error;
      } else {
        const cloudPayload = mapToCloud(item.table, item.payload, businessId);
        const { error } = await client
          .from(dbTable as any)
          .upsert(cloudPayload as any, { onConflict: 'id' });

        if (error) throw error;
      }

      await db.syncQueue.delete(item.id);
    } catch (err: any) {
      console.warn(`Sync queue item ${item.id} error:`, err);
      await db.syncQueue.update(item.id, {
        status: 'failed',
        retries: item.retries + 1,
        error: err?.message || 'Sync failed',
      });
    }
  }

  const remaining = await db.syncQueue.where('status').equals('pending').count();
  syncStore.setPendingCount(remaining);
  return remaining === 0;
}

// Pull remote changes from Supabase and merge into Dexie
export async function pullRemoteChanges(businessId: string): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client || !navigator.onLine) return false;

  const tables = [
    'customers',
    'suppliers',
    'categories',
    'products',
    'stock_movements',
    'sales',
    'sale_items',
    'purchases',
    'purchase_items',
    'invoices',
    'quotations',
    'quotation_items',
    'expenses',
    'payments',
  ];

  try {
    for (const tbl of tables) {
      const { data, error } = await client
        .from(tbl as any)
        .select('*')
        .eq('business_id', businessId);

      if (error) {
        console.warn(`Error pulling ${tbl}:`, error);
        continue;
      }

      if (data && data.length > 0) {
        const targetTable = getDexieTable(tbl);
        if (targetTable) {
          for (const row of data) {
            const localObj = mapToLocal(tbl, row);
            await targetTable.put(localObj);
          }
        }
      }
    }

    const now = new Date().toISOString();
    await db.syncMeta.put({ key: 'last_synced_at', value: now, updatedAt: now });
    syncStore.setLastSynced(now);
    return true;
  } catch (err: any) {
    console.error('Failed to pull remote changes:', err);
    syncStore.setStatus('error', err?.message || 'Failed to pull cloud changes');
    return false;
  }
}

// Full Bidirectional Sync
export async function syncAll(): Promise<void> {
  if (isSyncing) return;
  const auth = authStore.getState();
  if (!auth.isAuthenticated || !auth.business?.id) return;

  if (!navigator.onLine) {
    syncStore.setStatus('offline');
    return;
  }

  isSyncing = true;
  syncStore.setStatus('syncing');

  try {
    const pushOk = await pushLocalChanges(auth.business.id);
    const pullOk = await pullRemoteChanges(auth.business.id);

    if (pushOk && pullOk) {
      syncStore.setStatus('synced');
    } else {
      syncStore.setStatus('error', 'Partial synchronization failure.');
    }
  } catch (err: any) {
    console.error('syncAll failed:', err);
    syncStore.setStatus('error', err?.message || 'Synchronization failed.');
  } finally {
    isSyncing = false;
  }
}

let syncTimeout: any = null;
export function triggerBackgroundSync() {
  if (syncTimeout) clearTimeout(syncTimeout);
  syncTimeout = setTimeout(() => {
    syncAll();
  }, 1000);
}

// Detect existing local Dexie records
export async function detectLocalData(): Promise<LocalDataSummary> {
  const [c, p, s, pur, inv, q, exp, pay] = await Promise.all([
    db.customers.count(),
    db.products.count(),
    db.sales.count(),
    db.purchases.count(),
    db.invoices.count(),
    db.quotations.count(),
    db.expenses.count(),
    db.payments.count(),
  ]);

  const total = c + p + s + pur + inv + q + exp + pay;
  return {
    hasData: total > 0,
    customersCount: c,
    productsCount: p,
    salesCount: s,
    purchasesCount: pur,
    invoicesCount: inv,
    quotationsCount: q,
    expensesCount: exp,
    paymentsCount: pay,
    totalRecords: total,
  };
}

// Migrate all local Dexie data to Supabase business
export async function migrateLocalDataToCloud(
  businessId: string,
  onProgress?: (step: string, percent: number) => void
): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase is not configured.');

  try {
    onProgress?.('Migrating categories & products...', 15);
    const cats = await db.categories.toArray();
    for (const item of cats) {
      await client.from('categories').upsert(mapToCloud('categories', item, businessId) as any);
    }

    const prods = await db.products.toArray();
    for (const item of prods) {
      await client.from('products').upsert(mapToCloud('products', item, businessId) as any);
    }

    onProgress?.('Migrating customers & suppliers...', 35);
    const custs = await db.customers.toArray();
    for (const item of custs) {
      await client.from('customers').upsert(mapToCloud('customers', item, businessId) as any);
    }

    const supps = await db.suppliers.toArray();
    for (const item of supps) {
      await client.from('suppliers').upsert(mapToCloud('suppliers', item, businessId) as any);
    }

    onProgress?.('Migrating sales & invoices...', 60);
    const sales = await db.sales.toArray();
    for (const item of sales) {
      await client.from('sales').upsert(mapToCloud('sales', item, businessId) as any);
    }

    const saleItems = await db.saleItems.toArray();
    for (const item of saleItems) {
      await client.from('sale_items').upsert(mapToCloud('saleItems', item, businessId) as any);
    }

    const invs = await db.invoices.toArray();
    for (const item of invs) {
      await client.from('invoices').upsert(mapToCloud('invoices', item, businessId) as any);
    }

    onProgress?.('Migrating purchases & expenses...', 80);
    const purchases = await db.purchases.toArray();
    for (const item of purchases) {
      await client.from('purchases').upsert(mapToCloud('purchases', item, businessId) as any);
    }

    const purchaseItems = await db.purchaseItems.toArray();
    for (const item of purchaseItems) {
      await client.from('purchase_items').upsert(mapToCloud('purchaseItems', item, businessId) as any);
    }

    const exps = await db.expenses.toArray();
    for (const item of exps) {
      await client.from('expenses').upsert(mapToCloud('expenses', item, businessId) as any);
    }

    const quots = await db.quotations.toArray();
    for (const item of quots) {
      await client.from('quotations').upsert(mapToCloud('quotations', item, businessId) as any);
    }

    const quotItems = await db.quotationItems.toArray();
    for (const item of quotItems) {
      await client.from('quotation_items').upsert(mapToCloud('quotationItems', item, businessId) as any);
    }

    const pays = await db.payments.toArray();
    for (const item of pays) {
      await client.from('payments').upsert(mapToCloud('payments', item, businessId) as any);
    }

    const movements = await db.stockMovements.toArray();
    for (const item of movements) {
      await client.from('stock_movements').upsert(mapToCloud('stockMovements', item, businessId) as any);
    }

    onProgress?.('Migration complete!', 100);
    const now = new Date().toISOString();
    await db.syncMeta.put({ key: 'last_migrated_at', value: now, updatedAt: now });
    await db.syncMeta.put({ key: 'last_synced_at', value: now, updatedAt: now });
    syncStore.setLastSynced(now);
    return true;
  } catch (err) {
    console.error('Migration failed:', err);
    throw err;
  }
}

// Global network listeners
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    syncStore.setOnline(true);
    triggerBackgroundSync();
  });

  window.addEventListener('offline', () => {
    syncStore.setOnline(false);
  });

  window.addEventListener('focus', () => {
    if (navigator.onLine) {
      triggerBackgroundSync();
    }
  });

  // Periodic sync every 60s
  setInterval(() => {
    if (navigator.onLine && authStore.getState().isAuthenticated) {
      triggerBackgroundSync();
    }
  }, 60000);
}
