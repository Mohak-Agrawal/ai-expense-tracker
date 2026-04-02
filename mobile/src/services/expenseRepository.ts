import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  addExpense,
  createExpenseFromPayload,
  deleteExpense,
  getExpenses,
  isRecoverableApiError,
  updateExpense,
} from './api';
import { enqueuePendingMutation, remapPendingMutationIds, type PendingExpenseMutation } from './offlineQueue';
import { buildOptimisticExpense, buildOriginalInput, parseLocalExpenseInput } from '../utils/localExpenseParser';
import type { Expense, ExpenseMutationResult, ExpenseSnapshot, ExpenseWritePayload } from '../types';

const STORAGE_KEYS = {
  expenses: 'expense-cache-v2',
  queue: 'expense-queue-v2',
} as const;

function sortExpenses(expenses: Expense[]): Expense[] {
  return [...expenses].sort((left, right) => {
    const leftTime = new Date(left.updated_at || left.created_at).getTime();
    const rightTime = new Date(right.updated_at || right.created_at).getTime();
    return rightTime - leftTime;
  });
}

function withPendingState(expenses: Expense[], queue: PendingExpenseMutation[]): Expense[] {
  const pendingCreates = new Set(
    queue.filter((item) => item.kind === 'create').map((item) => item.clientId),
  );
  const pendingUpdates = new Set(
    queue.filter((item) => item.kind === 'update').map((item) => item.expenseId),
  );

  return sortExpenses(expenses).map((expense) => {
    if (pendingCreates.has(expense.id)) {
      return { ...expense, syncStatus: 'pending-create' as const };
    }

    if (pendingUpdates.has(expense.id)) {
      return { ...expense, syncStatus: 'pending-update' as const };
    }

    return { ...expense, syncStatus: 'synced' as const };
  });
}

function toSnapshot(
  expenses: Expense[],
  queue: PendingExpenseMutation[],
  isOffline = false,
  lastSyncError: string | null = null,
): ExpenseSnapshot {
  return {
    expenses: withPendingState(expenses, queue),
    pendingCount: queue.length,
    isOffline,
    lastSyncError,
  };
}

function replaceExpense(expenses: Expense[], nextExpense: Expense): Expense[] {
  const nextExpenses = expenses.filter((expense) => expense.id !== nextExpense.id);
  return sortExpenses([nextExpense, ...nextExpenses]);
}

function replaceExpenseId(expenses: Expense[], previousId: number, nextExpense: Expense): Expense[] {
  const nextExpenses = expenses.filter((expense) => expense.id !== previousId && expense.id !== nextExpense.id);
  return sortExpenses([nextExpense, ...nextExpenses]);
}

function removeExpense(expenses: Expense[], expenseId: number): Expense[] {
  return expenses.filter((expense) => expense.id !== expenseId);
}

function nextTempExpenseId(expenses: Expense[]): number {
  const smallestExistingId = expenses.reduce((smallest, expense) => Math.min(smallest, expense.id), 0);
  return smallestExistingId <= 0 ? smallestExistingId - 1 : -1;
}

async function readJson<T>(storageKey: string, fallbackValue: T): Promise<T> {
  const rawValue = await AsyncStorage.getItem(storageKey);

  if (!rawValue) {
    return fallbackValue;
  }

  try {
    return JSON.parse(rawValue) as T;
  } catch {
    return fallbackValue;
  }
}

async function readState() {
  const [expenses, queue] = await Promise.all([
    readJson<Expense[]>(STORAGE_KEYS.expenses, []),
    readJson<PendingExpenseMutation[]>(STORAGE_KEYS.queue, []),
  ]);

  return { expenses, queue };
}

async function writeState(expenses: Expense[], queue: PendingExpenseMutation[]) {
  await Promise.all([
    AsyncStorage.setItem(STORAGE_KEYS.expenses, JSON.stringify(sortExpenses(expenses))),
    AsyncStorage.setItem(STORAGE_KEYS.queue, JSON.stringify(queue)),
  ]);
}

async function syncPendingMutations(expenses: Expense[], queue: PendingExpenseMutation[]) {
  let nextExpenses = [...expenses];
  let nextQueue = [...queue];

  for (let index = 0; index < nextQueue.length;) {
    const mutation = nextQueue[index];

    try {
      if (mutation.kind === 'create') {
        const createdExpense = await createExpenseFromPayload(mutation.expense);
        nextExpenses = replaceExpenseId(nextExpenses, mutation.clientId, createdExpense);
        nextQueue.splice(index, 1);
        nextQueue = remapPendingMutationIds(nextQueue, mutation.clientId, createdExpense.id);
        continue;
      }

      if (mutation.kind === 'update') {
        const updatedExpense = await updateExpense(mutation.expenseId, mutation.expense);
        nextExpenses = replaceExpense(nextExpenses, updatedExpense);
        nextQueue.splice(index, 1);
        continue;
      }

      await deleteExpense(mutation.expenseId);
      nextExpenses = removeExpense(nextExpenses, mutation.expenseId);
      nextQueue.splice(index, 1);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Could not sync offline changes.';

      if (isRecoverableApiError(error)) {
        await writeState(nextExpenses, nextQueue);
        return { expenses: nextExpenses, queue: nextQueue, isOffline: true, lastSyncError: errorMessage };
      }

      await writeState(nextExpenses, nextQueue);
      return { expenses: nextExpenses, queue: nextQueue, isOffline: false, lastSyncError: errorMessage };
    }
  }

  await writeState(nextExpenses, nextQueue);
  return { expenses: nextExpenses, queue: nextQueue, isOffline: false, lastSyncError: null };
}

export async function loadExpenseSnapshot(): Promise<ExpenseSnapshot> {
  let { expenses, queue } = await readState();
  let lastSyncError: string | null = null;

  if (queue.length > 0) {
    const syncResult = await syncPendingMutations(expenses, queue);
    expenses = syncResult.expenses;
    queue = syncResult.queue;
    lastSyncError = syncResult.lastSyncError;

    if (syncResult.isOffline) {
      return toSnapshot(expenses, queue, true, lastSyncError);
    }
  }

  try {
    const freshExpenses = await getExpenses();
    expenses = freshExpenses;
    await writeState(expenses, queue);
    return toSnapshot(expenses, queue, false, lastSyncError);
  } catch (error) {
    if (isRecoverableApiError(error)) {
      return toSnapshot(expenses, queue, true, (error as Error).message);
    }

    throw error;
  }
}

export async function createExpenseEntry(input: string): Promise<ExpenseMutationResult> {
  const state = await readState();

  try {
    const createdExpense = await addExpense(input);
    const expenses = replaceExpense(state.expenses, createdExpense);
    await writeState(expenses, state.queue);

    return {
      ...toSnapshot(expenses, state.queue),
      expense: createdExpense,
      deferred: false,
    };
  } catch (error) {
    if (!isRecoverableApiError(error)) {
      throw error;
    }

    const payload = parseLocalExpenseInput(input);

    if (!payload) {
      throw new Error('Could not parse this expense while offline. Include an amount to save it locally.');
    }

    const tempId = nextTempExpenseId(state.expenses);
    const optimisticExpense = buildOptimisticExpense(payload, tempId);
    const queue = enqueuePendingMutation(state.queue, {
      kind: 'create',
      clientId: tempId,
      expense: payload,
    });
    const expenses = replaceExpense(state.expenses, optimisticExpense);
    await writeState(expenses, queue);

    return {
      ...toSnapshot(expenses, queue, true, (error as Error).message),
      expense: optimisticExpense,
      deferred: true,
    };
  }
}

export async function updateExpenseEntry(
  expense: Expense,
  changes: Omit<ExpenseWritePayload, 'original_input'> & { original_input?: string },
): Promise<ExpenseMutationResult> {
  const state = await readState();
  const payload: ExpenseWritePayload = {
    ...changes,
    original_input: changes.original_input?.trim() || buildOriginalInput(changes),
  };

  if (expense.id < 0) {
    const optimisticExpense = buildOptimisticExpense(payload, expense.id, expense);
    const queue = enqueuePendingMutation(state.queue, {
      kind: 'update',
      expenseId: expense.id,
      expense: payload,
    });
    const expenses = replaceExpense(state.expenses, optimisticExpense);
    await writeState(expenses, queue);

    return {
      ...toSnapshot(expenses, queue, true, 'Will sync when the connection is back.'),
      expense: optimisticExpense,
      deferred: true,
    };
  }

  try {
    const updatedExpense = await updateExpense(expense.id, payload);
    const expenses = replaceExpense(state.expenses, updatedExpense);
    await writeState(expenses, state.queue);

    return {
      ...toSnapshot(expenses, state.queue),
      expense: updatedExpense,
      deferred: false,
    };
  } catch (error) {
    if (!isRecoverableApiError(error)) {
      throw error;
    }

    const optimisticExpense = buildOptimisticExpense(payload, expense.id, expense);
    const queue = enqueuePendingMutation(state.queue, {
      kind: 'update',
      expenseId: expense.id,
      expense: payload,
    });
    const expenses = replaceExpense(state.expenses, optimisticExpense);
    await writeState(expenses, queue);

    return {
      ...toSnapshot(expenses, queue, true, (error as Error).message),
      expense: optimisticExpense,
      deferred: true,
    };
  }
}

export async function deleteExpenseEntry(expense: Expense): Promise<ExpenseMutationResult> {
  const state = await readState();

  if (expense.id < 0) {
    const queue = enqueuePendingMutation(state.queue, {
      kind: 'delete',
      expenseId: expense.id,
    });
    const expenses = removeExpense(state.expenses, expense.id);
    await writeState(expenses, queue);

    return {
      ...toSnapshot(expenses, queue, true, null),
      deferred: true,
    };
  }

  try {
    await deleteExpense(expense.id);
    const expenses = removeExpense(state.expenses, expense.id);
    await writeState(expenses, state.queue);

    return {
      ...toSnapshot(expenses, state.queue),
      deferred: false,
    };
  } catch (error) {
    if (!isRecoverableApiError(error)) {
      throw error;
    }

    const queue = enqueuePendingMutation(state.queue, {
      kind: 'delete',
      expenseId: expense.id,
    });
    const expenses = removeExpense(state.expenses, expense.id);
    await writeState(expenses, queue);

    return {
      ...toSnapshot(expenses, queue, true, (error as Error).message),
      deferred: true,
    };
  }
}