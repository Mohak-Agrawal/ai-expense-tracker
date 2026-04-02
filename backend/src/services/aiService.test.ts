import { describe, expect, it, vi, beforeEach } from 'vitest';

const generateContent = vi.fn();

vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
    getGenerativeModel: () => ({
      generateContent,
    }),
  })),
}));

describe('parseExpense', () => {
  beforeEach(() => {
    vi.resetModules();
    generateContent.mockReset();
  });

  it('normalizes coffee-like AI results back to Food & Dining', async () => {
    process.env.GEMINI_API_KEY = 'test-key';
    generateContent.mockResolvedValue({
      response: {
        text: () => JSON.stringify({
          amount: 180,
          currency: 'INR',
          category: 'Other',
          description: 'coffee',
          merchant: null,
        }),
      },
    });

    const { parseExpense } = await import('./aiService');
    const parsed = await parseExpense('coffee 180');

    expect(parsed).toMatchObject({
      amount: 180,
      category: 'Food & Dining',
      description: 'coffee',
    });
  });

  it('maps common AI category variants to canonical categories', async () => {
    process.env.GEMINI_API_KEY = 'test-key';
    generateContent.mockResolvedValue({
      response: {
        text: () => JSON.stringify({
          amount: 850,
          currency: 'INR',
          category: 'Food and Dining',
          description: 'client lunch',
          merchant: 'Taj',
        }),
      },
    });

    const { parseExpense } = await import('./aiService');
    const parsed = await parseExpense('client lunch at Taj 850');

    expect(parsed?.category).toBe('Food & Dining');
  });

  it('falls back to food heuristics for burger-like meals when AI says Other', async () => {
    process.env.GEMINI_API_KEY = 'test-key';
    generateContent.mockResolvedValue({
      response: {
        text: () => JSON.stringify({
          amount: 200,
          currency: 'INR',
          category: 'Other',
          description: 'burger',
          merchant: null,
        }),
      },
    });

    const { parseExpense } = await import('./aiService');
    const parsed = await parseExpense('burger 200');

    expect(parsed?.category).toBe('Food & Dining');
  });
});