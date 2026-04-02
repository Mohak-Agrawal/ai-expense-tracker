import { describe, expect, it } from 'vitest';
import { buildOriginalInput, parseLocalExpenseInput } from './localExpenseParser';

describe('localExpenseParser', () => {
  it('parses amount, category, and merchant from plain input', () => {
    const payload = parseLocalExpenseInput('Uber to airport 450');

    expect(payload).toMatchObject({
      amount: 450,
      currency: 'INR',
      category: 'Transport',
      merchant: 'Uber',
    });
  });

  it('returns null when no amount exists', () => {
    expect(parseLocalExpenseInput('coffee with team')).toBeNull();
  });

  it('builds a stable original input string for edited expenses', () => {
    expect(buildOriginalInput({
      amount: 860,
      currency: 'INR',
      description: 'Client lunch',
      merchant: 'Taj',
    })).toBe('Client lunch at Taj 860 INR');
  });
});