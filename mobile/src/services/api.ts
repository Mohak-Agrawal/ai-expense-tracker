import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { Expense, ExpenseWritePayload } from '../types/index';

const TIMEOUT_MS = 10000;

function readExpoHost(): string | null {
  const manifestHostUri = Constants.expoConfig?.hostUri;

  if (manifestHostUri) {
    return manifestHostUri.split(':')[0] ?? null;
  }

  const expoClientHostUri = (Constants as Constants & {
    manifest2?: { extra?: { expoClient?: { hostUri?: string } } };
    manifest?: { debuggerHost?: string };
  }).manifest2?.extra?.expoClient?.hostUri;

  if (expoClientHostUri) {
    return expoClientHostUri.split(':')[0] ?? null;
  }

  const debuggerHost = (Constants as Constants & {
    manifest?: { debuggerHost?: string };
  }).manifest?.debuggerHost;

  if (debuggerHost) {
    return debuggerHost.split(':')[0] ?? null;
  }

  return null;
}

function resolveBaseUrl(): string {
  const envBaseUrl = process.env.EXPO_PUBLIC_API_URL?.trim();

  if (envBaseUrl) {
    return envBaseUrl.replace(/\/$/, '');
  }

  if (Platform.OS === 'web') {
    return 'http://localhost:3000';
  }

  const expoHost = readExpoHost();

  if (expoHost && expoHost !== 'localhost' && expoHost !== '127.0.0.1') {
    return `http://${expoHost}:3000`;
  }

  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:3000';
  }

  return 'http://localhost:3000';
}

const BASE_URL = resolveBaseUrl();

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
    return new ApiError(`No connection to the server at ${BASE_URL}. Changes will sync when you are back online.`, 'NETWORK');
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
