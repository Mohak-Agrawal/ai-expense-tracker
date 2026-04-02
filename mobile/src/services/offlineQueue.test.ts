import { describe, expect, it } from 'vitest';
import { enqueuePendingMutation, remapPendingMutationIds } from './offlineQueue';

describe('offlineQueue', () => {
  it('merges updates into a queued create for local-only expenses', () => {
    const queue = enqueuePendingMutation([], {
      kind: 'create',
      clientId: -1,
      expense: {
        amount: 220,
        currency: 'INR',
        category: 'Food & Dining',
        description: 'Coffee',
        merchant: 'Blue Tokai',
        original_input: 'Coffee 220',
      },
    });

    const mergedQueue = enqueuePendingMutation(queue, {
      kind: 'update',
      expenseId: -1,
      expense: {
        amount: 250,
        currency: 'INR',
        category: 'Food & Dining',
        description: 'Coffee and snack',
        merchant: 'Blue Tokai',
        original_input: 'Coffee and snack 250 INR',
      },
    });

    expect(mergedQueue).toHaveLength(1);
    expect(mergedQueue[0]).toMatchObject({
      kind: 'create',
      clientId: -1,
      expense: {
        amount: 250,
        description: 'Coffee and snack',
      },
    });
  });

  it('drops a queued create when the local-only expense is deleted', () => {
    const queue = enqueuePendingMutation([], {
      kind: 'create',
      clientId: -1,
      expense: {
        amount: 999,
        currency: 'INR',
        category: 'Shopping',
        description: 'T-shirt',
        merchant: null,
        original_input: 'T-shirt 999',
      },
    });

    const nextQueue = enqueuePendingMutation(queue, { kind: 'delete', expenseId: -1 });

    expect(nextQueue).toEqual([]);
  });

  it('remaps deferred updates after a local create receives a server id', () => {
    const queue = remapPendingMutationIds([
      { kind: 'update', expenseId: -3, expense: {
        amount: 100,
        currency: 'INR',
        category: 'Transport',
        description: 'Metro ride',
        merchant: null,
        original_input: 'Metro ride 100 INR',
      } },
      { kind: 'delete', expenseId: -3 },
    ], -3, 42);

    expect(queue).toEqual([
      {
        kind: 'update',
        expenseId: 42,
        expense: {
          amount: 100,
          currency: 'INR',
          category: 'Transport',
          description: 'Metro ride',
          merchant: null,
          original_input: 'Metro ride 100 INR',
        },
      },
      { kind: 'delete', expenseId: 42 },
    ]);
  });
});