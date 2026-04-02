import type { ExpenseWritePayload } from '../types';

export type PendingExpenseMutation =
  | { kind: 'create'; clientId: number; expense: ExpenseWritePayload }
  | { kind: 'update'; expenseId: number; expense: ExpenseWritePayload }
  | { kind: 'delete'; expenseId: number };

export function enqueuePendingMutation(
  queue: PendingExpenseMutation[],
  mutation: PendingExpenseMutation,
): PendingExpenseMutation[] {
  const nextQueue = [...queue];

  if (mutation.kind === 'create') {
    return [...nextQueue, mutation];
  }

  if (mutation.kind === 'update') {
    const createIndex = nextQueue.findIndex(
      (item) => item.kind === 'create' && item.clientId === mutation.expenseId,
    );

    if (createIndex >= 0) {
      const existingCreate = nextQueue[createIndex] as Extract<PendingExpenseMutation, { kind: 'create' }>;
      nextQueue[createIndex] = {
        ...existingCreate,
        expense: mutation.expense,
      };

      return nextQueue;
    }

    const updateIndex = nextQueue.findIndex(
      (item) => item.kind === 'update' && item.expenseId === mutation.expenseId,
    );

    if (updateIndex >= 0) {
      nextQueue[updateIndex] = mutation;
      return nextQueue;
    }

    const hasDelete = nextQueue.some(
      (item) => item.kind === 'delete' && item.expenseId === mutation.expenseId,
    );

    if (hasDelete) {
      return nextQueue;
    }

    return [...nextQueue, mutation];
  }

  const createIndex = nextQueue.findIndex(
    (item) => item.kind === 'create' && item.clientId === mutation.expenseId,
  );

  if (createIndex >= 0) {
    nextQueue.splice(createIndex, 1);
    return nextQueue;
  }

  const withoutUpdates = nextQueue.filter(
    (item) => !(item.kind === 'update' && item.expenseId === mutation.expenseId),
  );

  if (withoutUpdates.some((item) => item.kind === 'delete' && item.expenseId === mutation.expenseId)) {
    return withoutUpdates;
  }

  return [...withoutUpdates, mutation];
}

export function remapPendingMutationIds(
  queue: PendingExpenseMutation[],
  previousId: number,
  nextId: number,
): PendingExpenseMutation[] {
  return queue.map((item) => {
    if (item.kind === 'update' && item.expenseId === previousId) {
      return { ...item, expenseId: nextId };
    }

    if (item.kind === 'delete' && item.expenseId === previousId) {
      return { ...item, expenseId: nextId };
    }

    return item;
  });
}