import { AppError } from '../errors';
import type { ExpenseInput, ExpenseUpdateInput } from '../database/db';

const EXPENSE_CATEGORIES = [
  'Food & Dining',
  'Transport',
  'Shopping',
  'Entertainment',
  'Bills & Utilities',
  'Health',
  'Travel',
  'Other',
] as const;

function asNonEmptyString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new AppError(`${fieldName} is required`, 400);
  }

  return value.trim();
}

function asAmount(value: unknown): number {
  const amount = typeof value === 'number' ? value : Number(value);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new AppError('Amount must be a number greater than 0', 400);
  }

  return Number(amount.toFixed(2));
}

function asCurrency(value: unknown): string {
  const currency = asNonEmptyString(value, 'Currency').toUpperCase();

  if (!/^[A-Z]{3}$/.test(currency)) {
    throw new AppError('Currency must be a 3-letter code', 400);
  }

  return currency;
}

function asCategory(value: unknown): ExpenseInput['category'] {
  const category = asNonEmptyString(value, 'Category');

  if (!EXPENSE_CATEGORIES.includes(category as ExpenseInput['category'])) {
    throw new AppError('Category is invalid', 400);
  }

  return category as ExpenseInput['category'];
}

function asMerchant(value: unknown): string | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  if (typeof value !== 'string') {
    throw new AppError('Merchant must be a string', 400);
  }

  const merchant = value.trim();
  return merchant.length > 0 ? merchant : null;
}

export function parseExpenseId(value: unknown): number {
  const id = Number(value);

  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError('Invalid expense ID', 400);
  }

  return id;
}

export function validateExpenseTextInput(body: unknown): string | null {
  if (!body || typeof body !== 'object') {
    return null;
  }

  const { input } = body as { input?: unknown };

  if (typeof input !== 'string') {
    return null;
  }

  const trimmedInput = input.trim();
  return trimmedInput.length > 0 ? trimmedInput : null;
}

export function validateExpensePayload(body: unknown): ExpenseInput {
  if (!body || typeof body !== 'object') {
    throw new AppError('Expense payload is required', 400);
  }

  const payload = body as Record<string, unknown>;

  return {
    amount: asAmount(payload.amount),
    currency: asCurrency(payload.currency ?? 'INR'),
    category: asCategory(payload.category),
    description: asNonEmptyString(payload.description, 'Description'),
    merchant: asMerchant(payload.merchant),
    original_input: asNonEmptyString(payload.original_input, 'Original input'),
  };
}

export function validateExpenseUpdatePayload(body: unknown): ExpenseUpdateInput {
  return validateExpensePayload(body);
}

export { EXPENSE_CATEGORIES };