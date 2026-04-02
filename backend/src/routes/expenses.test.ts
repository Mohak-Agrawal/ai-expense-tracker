import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../services/aiService', () => ({
  parseExpense: vi.fn(),
}));

import { createApp } from '../app';
import { resetDbConnection } from '../database/db';
import { parseExpense } from '../services/aiService';

const mockedParseExpense = vi.mocked(parseExpense);

describe('expense routes', () => {
  let dbPath: string;

  beforeEach(() => {
    dbPath = path.join(os.tmpdir(), `expense-test-${Date.now()}-${Math.random()}.db`);
    process.env.EXPENSE_DB_PATH = dbPath;
    resetDbConnection();
    mockedParseExpense.mockReset();
  });

  afterEach(() => {
    resetDbConnection();
    delete process.env.EXPENSE_DB_PATH;

    for (const suffix of ['', '-shm', '-wal']) {
      fs.rmSync(`${dbPath}${suffix}`, { force: true });
    }
  });

  it('creates an expense from natural language input', async () => {
    mockedParseExpense.mockResolvedValue({
      amount: 450,
      currency: 'INR',
      category: 'Transport',
      description: 'Uber to airport',
      merchant: 'Uber',
    });

    const response = await request(createApp())
      .post('/api/expenses')
      .send({ input: 'Uber to airport 450' });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.expense).toMatchObject({
      amount: 450,
      category: 'Transport',
      merchant: 'Uber',
      original_input: 'Uber to airport 450',
    });
  });

  it('creates and updates a structured expense payload', async () => {
    const app = createApp();
    const createResponse = await request(app)
      .post('/api/expenses')
      .send({
        amount: 1250,
        currency: 'INR',
        category: 'Shopping',
        description: 'Running shoes',
        merchant: 'Nike',
        original_input: 'Running shoes 1250',
      });

    const expenseId = createResponse.body.expense.id;
    const updateResponse = await request(app)
      .put(`/api/expenses/${expenseId}`)
      .send({
        amount: 1100,
        currency: 'INR',
        category: 'Shopping',
        description: 'Running shoes sale price',
        merchant: 'Nike',
        original_input: 'Running shoes sale price 1100',
      });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.expense).toMatchObject({
      id: expenseId,
      amount: 1100,
      description: 'Running shoes sale price',
      original_input: 'Running shoes sale price 1100',
    });
  });

  it('rejects invalid update payloads', async () => {
    const response = await request(createApp())
      .put('/api/expenses/12')
      .send({
        amount: 0,
        currency: 'rupees',
        category: 'Invalid',
        description: '',
        merchant: null,
        original_input: '',
      });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ success: false, error: 'Amount must be a number greater than 0' });
  });
});