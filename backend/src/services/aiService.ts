import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const geminiApiKey = process.env.GEMINI_API_KEY?.trim();
const genAI = geminiApiKey ? new GoogleGenerativeAI(geminiApiKey) : null;

export interface ParsedExpense {
  amount: number;
  currency: string;
  category: string;
  description: string;
  merchant: string | null;
}

const SYSTEM_PROMPT = `You are an expense parser. Extract expense information from natural language input.

RULES:
1. Extract the amount as a number (no currency symbols)
2. Default currency is INR unless explicitly mentioned (USD, EUR, etc.)
3. Categorize into EXACTLY one of: Food & Dining, Transport, Shopping, Entertainment, Bills & Utilities, Health, Travel, Other
4. Description should be a clean short summary
5. Merchant is the company/store name if mentioned, null otherwise

RESPOND ONLY WITH VALID JSON, no markdown, no backticks:
{"amount": <number>, "currency": "<string>", "category": "<string>", "description": "<string>", "merchant": "<string or null>"}

If you cannot extract an amount, respond:
{"error": "Could not parse expense. Please include an amount.", "amount": null}`;

function categorize(text: string): string {
  const lowerText = text.toLowerCase();

  if (/(uber|ola|taxi|metro|bus|fuel|petrol|parking|train|flight|airport|cab)/.test(lowerText)) {
    return 'Transport';
  }

  if (/(netflix|spotify|movie|cinema|game|concert|entertainment)/.test(lowerText)) {
    return 'Entertainment';
  }

  if (/(electricity|water|internet|wifi|phone|bill|bills|utility)/.test(lowerText)) {
    return 'Bills & Utilities';
  }

  if (/(medicine|doctor|pharmacy|clinic|health|gym)/.test(lowerText)) {
    return 'Health';
  }

  if (/(hotel|trip|travel|flight|tour|vacation|holiday)/.test(lowerText)) {
    return 'Travel';
  }

  if (/(amazon|flipkart|shopping|shoes|shirt|clothes|mall|store|buy|bought)/.test(lowerText)) {
    return 'Shopping';
  }

  if (/(restaurant|cafe|coffee|lunch|dinner|breakfast|food|meal|grocer|grocery|restaurant|taj)/.test(lowerText)) {
    return 'Food & Dining';
  }

  return 'Other';
}

function buildFallbackExpense(text: string): ParsedExpense | null {
  const amountMatch = text.match(/(?:₹|rs\.?|inr\s*|rupees?\s*)?(\d{1,3}(?:,\d{3})*(?:\.\d+)?|\d+(?:\.\d+)?)/i);

  if (!amountMatch) {
    return null;
  }

  const amount = Number(amountMatch[1].replace(/,/g, ''));

  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  const cleanedText = text
    .replace(/(?:₹|rs\.?|inr|rupees?)/gi, '')
    .replace(amountMatch[0], '')
    .replace(/\s+/g, ' ')
    .trim();

  const description = cleanedText.length > 0 ? cleanedText : text.trim();
  const merchantMatch = text.match(/\b(?:at|from)\s+([A-Z][\w&.-]*(?:\s+[A-Z][\w&.-]*)*)/);
  const merchant = merchantMatch?.[1]?.trim() ?? null;

  return {
    amount,
    currency: 'INR',
    category: categorize(text),
    description,
    merchant,
  };
}

export async function parseExpense(text: string): Promise<ParsedExpense | null> {
  if (!text || text.trim().length === 0) {
    return null;
  }

  try {
    if (!genAI) {
      return buildFallbackExpense(text);
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const result = await model.generateContent(`${SYSTEM_PROMPT}\n\nInput: "${text}"`);
    const raw = result.response.text().trim();

    const cleaned = raw.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    if (parsed.error || parsed.amount === null) {
      return null;
    }

    return {
      amount: parsed.amount,
      currency: parsed.currency || 'INR',
      category: parsed.category || 'Other',
      description: parsed.description,
      merchant: parsed.merchant || null,
    };
  } catch (error) {
    const fallback = buildFallbackExpense(text);

    if (fallback) {
      return fallback;
    }

    throw error;
  }
}