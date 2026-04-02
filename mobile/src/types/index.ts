export const EXPENSE_CATEGORIES = [
  'Food & Dining',
  'Transport',
  'Shopping',
  'Entertainment',
  'Bills & Utilities',
  'Health',
  'Travel',
  'Other',
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];
export type ExpenseSyncStatus = 'synced' | 'pending-create' | 'pending-update';

export interface Expense {
  id: number;
  amount: number;
  currency: string;
  category: ExpenseCategory;
  description: string;
  merchant: string | null;
  original_input: string;
  created_at: string;
  updated_at: string;
  syncStatus?: ExpenseSyncStatus;
}

export interface ExpenseWritePayload {
  amount: number;
  currency: string;
  category: ExpenseCategory;
  description: string;
  merchant: string | null;
  original_input: string;
}

export interface ExpenseSnapshot {
  expenses: Expense[];
  pendingCount: number;
  isOffline: boolean;
  lastSyncError: string | null;
}

export interface ExpenseMutationResult extends ExpenseSnapshot {
  expense?: Expense;
  deferred: boolean;
}

export const CATEGORY_EMOJIS: Record<string, string> = {
  'Food & Dining': '🍔',
  Transport: '🚗',
  Shopping: '🛒',
  Entertainment: '📺',
  'Bills & Utilities': '📄',
  Health: '💊',
  Travel: '✈️',
  Other: '📦'
};
