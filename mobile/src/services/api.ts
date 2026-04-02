import { Expense } from '../types/index';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
const TIMEOUT_MS = 10000;

async function fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Request timed out. Check your connection.');
    }
    throw error;
  }
}

export async function addExpense(input: string): Promise<Expense> {
  const response = await fetchWithTimeout(`${BASE_URL}/api/expenses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input }),
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.error || 'Failed to add expense.');
  }

  return data.expense as Expense;
}

export async function getExpenses(): Promise<Expense[]> {
  const response = await fetchWithTimeout(`${BASE_URL}/api/expenses`);
  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.error || 'Failed to fetch expenses.');
  }

  return data.expenses as Expense[];
}

export async function deleteExpense(id: number): Promise<void> {
  console.log('[api.deleteExpense] request start', { id, url: `${BASE_URL}/api/expenses/${id}` });

  const response = await fetchWithTimeout(`${BASE_URL}/api/expenses/${id}`, {
    method: 'DELETE',
  });

  const data = await response.json();

  console.log('[api.deleteExpense] response', {
    id,
    status: response.status,
    ok: response.ok,
    body: data,
  });

  if (!response.ok || !data.success) {
    console.error('[api.deleteExpense] request failed', {
      id,
      status: response.status,
      body: data,
    });
    throw new Error(data.error || 'Failed to delete expense.');
  }

  console.log('[api.deleteExpense] request success', { id });
}
