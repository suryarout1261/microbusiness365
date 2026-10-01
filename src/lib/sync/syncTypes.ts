export type SyncStatus = 'offline' | 'syncing' | 'synced' | 'error';

export interface SyncState {
  status: SyncStatus;
  lastSyncedAt: string | null;
  pendingCount: number;
  errorMessage: string | null;
  isOnline: boolean;
}

export interface LocalDataSummary {
  hasData: boolean;
  customersCount: number;
  productsCount: number;
  salesCount: number;
  purchasesCount: number;
  invoicesCount: number;
  quotationsCount: number;
  expensesCount: number;
  paymentsCount: number;
  totalRecords: number;
}
