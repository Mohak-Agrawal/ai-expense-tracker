import type { Expense, ExpenseCategory, ExpenseWritePayload } from '../types';

const CATEGORY_RULES: { category: ExpenseCategory; pattern: RegExp }[] = [
  { category: 'Transport', pattern: /(uber|ola|taxi|metro|bus|fuel|petrol|parking|train|cab)/i },
  { category: 'Entertainment', pattern: /(netflix|spotify|movie|cinema|game|concert|streaming)/i },
  { category: 'Bills & Utilities', pattern: /(electricity|water|internet|wifi|phone|bill|utility)/i },
  { category: 'Health', pattern: /(medicine|doctor|pharmacy|clinic|health|gym)/i },
  { category: 'Travel', pattern: /(hotel|trip|travel|flight|tour|vacation|holiday|airport)/i },
  { category: 'Shopping', pattern: /(amazon|flipkart|shopping|shoes|shirt|clothes|mall|store|bought)/i },
  { category: 'Food & Dining', pattern: /(restaurant|cafe|coffee|lunch|dinner|breakfast|food|meal|grocer|grocery)/i },
];

function detectCurrency(input: string): string {
  if (/(usd|\$)/i.test(input)) {
    return 'USD';
  }

  if (/(eur|€)/i.test(input)) {
    return 'EUR';
  }

  if (/(gbp|£)/i.test(input)) {
    return 'GBP';
  }

  return 'INR';
}

function detectCategory(input: string): ExpenseCategory {
  const match = CATEGORY_RULES.find((rule) => rule.pattern.test(input));
  return match?.category ?? 'Other';
}

function detectMerchant(input: string): string | null {
  const merchantFromPreposition = input.match(/\b(?:at|from)\s+([A-Za-z][\w&.-]*(?:\s+[A-Za-z][\w&.-]*)*)/i)?.[1];

  if (merchantFromPreposition?.trim()) {
    return merchantFromPreposition.trim();
  }

  const merchantFromKnownBrand = input.match(/\b(Uber|Ola|Netflix|Spotify|Amazon|Flipkart|Swiggy|Zomato)\b/i)?.[1];
  return merchantFromKnownBrand?.trim() ?? null;
}

export function buildOriginalInput(payload: Pick<ExpenseWritePayload, 'amount' | 'currency' | 'description' | 'merchant'>): string {
  const merchantPart = payload.merchant ? ` at ${payload.merchant}` : '';
  return `${payload.description}${merchantPart} ${payload.amount} ${payload.currency}`.trim();
}

export function parseLocalExpenseInput(input: string): ExpenseWritePayload | null {
  const trimmedInput = input.trim();

  if (trimmedInput.length === 0) {
    return null;
  }

  const amountMatch = trimmedInput.match(/(?:₹|rs\.?|inr\s*|rupees?\s*|\$|usd\s*|€|eur\s*|£|gbp\s*)?(\d{1,3}(?:,\d{3})*(?:\.\d+)?|\d+(?:\.\d+)?)/i);

  if (!amountMatch) {
    return null;
  }

  const amount = Number(amountMatch[1].replace(/,/g, ''));

  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  const description = trimmedInput
    .replace(amountMatch[0], '')
    .replace(/(?:₹|rs\.?|inr|rupees?|\$|usd|€|eur|£|gbp)/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  const normalizedDescription = description.length > 0 ? description : trimmedInput;

  return {
    amount: Number(amount.toFixed(2)),
    currency: detectCurrency(trimmedInput),
    category: detectCategory(trimmedInput),
    description: normalizedDescription,
    merchant: detectMerchant(trimmedInput),
    original_input: trimmedInput,
  };
}

export function buildOptimisticExpense(payload: ExpenseWritePayload, id: number, existing?: Expense): Expense {
  const timestamp = new Date().toISOString();

  return {
    id,
    amount: payload.amount,
    currency: payload.currency,
    category: payload.category,
    description: payload.description,
    merchant: payload.merchant,
    original_input: payload.original_input,
    created_at: existing?.created_at ?? timestamp,
    updated_at: timestamp,
  };
}