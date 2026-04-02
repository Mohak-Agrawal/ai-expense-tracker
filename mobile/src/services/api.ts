import { Expense, ExpenseWritePayload } from '../types/index';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
const TIMEOUT_MS = 10000;

type ApiErrorCode = 'NETWORK' | 'TIMEOUT' | 'SERVER' | 'INVALID_RESPONSE';

export class ApiError extends Error {
  code: ApiErrorCode;

  constructor(message: string, code: ApiErrorCode) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
  }
}

function normalizeApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  if (error instanceof Error && error.name === 'AbortError') {
    return new ApiError('Request timed out. Check your connection.', 'TIMEOUT');
  }

  if (error instanceof Error && /network request failed/i.test(error.message)) {
    return new ApiError('No connection to the server. Changes will sync when you are back online.', 'NETWORK');
  }

  if (error instanceof Error) {
    return new ApiError(error.message, 'NETWORK');
  }

  return new ApiError('Unexpected network error.', 'NETWORK');
}

async function parseApiResponse(response: Response) {
  try {
    return await response.json();
  } catch {
    throw new ApiError('The server returned an invalid response.', 'INVALID_RESPONSE');
  }
}

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
  } catch (error: unknown) {
    clearTimeout(timeoutId);
    throw normalizeApiError(error);
  }
}

export async function addExpense(input: string): Promise<Expense> {
  const response = await fetchWithTimeout(`${BASE_URL}/api/expenses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input }),
  });

  const data = await parseApiResponse(response);

  if (!response.ok || !data.success) {
    throw new ApiError(data.error || 'Failed to add expense.', 'SERVER');
  }

  return data.expense as Expense;
}

export async function createExpenseFromPayload(payload: ExpenseWritePayload): Promise<Expense> {
  const response = await fetchWithTimeout(`${BASE_URL}/api/expenses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await parseApiResponse(response);

  if (!response.ok || !data.success) {
    throw new ApiError(data.error || 'Failed to save expense.', 'SERVER');
  }

  return data.expense as Expense;
}

export async function getExpenses(): Promise<Expense[]> {
  const response = await fetchWithTimeout(`${BASE_URL}/api/expenses`);
  const data = await parseApiResponse(response);

  if (!response.ok || !data.success) {
    throw new ApiError(data.error || 'Failed to fetch expenses.', 'SERVER');
  }

  return data.expenses as Expense[];
}

export async function updateExpense(id: number, payload: ExpenseWritePayload): Promise<Expense> {
  const response = await fetchWithTimeout(`${BASE_URL}/api/expenses/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await parseApiResponse(response);

  if (!response.ok || !data.success) {
    throw new ApiError(data.error || 'Failed to update expense.', 'SERVER');
  }

  return data.expense as Expense;
}

export async function deleteExpense(id: number): Promise<void> {
  const response = await fetchWithTimeout(`${BASE_URL}/api/expenses/${id}`, {
    method: 'DELETE',
  });

  const data = await parseApiResponse(response);

  if (!response.ok || !data.success) {
    throw new ApiError(data.error || 'Failed to delete expense.', 'SERVER');
  }
}

export function isRecoverableApiError(error: unknown): boolean {
  return error instanceof ApiError && (error.code === 'NETWORK' || error.code === 'TIMEOUT');
}
