import { Router, Request, Response } from 'express';
import { parseExpense } from '../services/aiService';
import { createExpense, deleteExpense, getAllExpenses, updateExpense } from '../database/db';
import { AppError, asyncHandler } from '../errors';
import {
  parseExpenseId,
  validateExpensePayload,
  validateExpenseTextInput,
  validateExpenseUpdatePayload,
} from '../validation/expenseValidators';

const router = Router();

// POST /api/expenses
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const input = validateExpenseTextInput(req.body);

  if (input) {
    const parsed = await parseExpense(input);

    if (!parsed) {
      throw new AppError('Could not parse expense. Please include an amount.', 400);
    }

    const expense = createExpense(validateExpensePayload({ ...parsed, original_input: input }));
    res.status(201).json({ success: true, expense });
    return;
  }

  const payload = validateExpensePayload(req.body);
  const expense = createExpense(payload);
  res.status(201).json({ success: true, expense });
}));

// GET /api/expenses
router.get('/', (_req: Request, res: Response) => {
  const expenses = getAllExpenses();
  return res.json({ success: true, expenses });
});

// PUT /api/expenses/:id
router.put('/:id', (req: Request, res: Response) => {
  const id = parseExpenseId(req.params.id);
  const payload = validateExpenseUpdatePayload(req.body);
  const expense = updateExpense(id, payload);

  if (!expense) {
    throw new AppError('Expense not found', 404);
  }

  return res.json({ success: true, expense });
});

// DELETE /api/expenses/:id
router.delete('/:id', (req: Request, res: Response) => {
  const id = parseExpenseId(req.params.id);

  const deleted = deleteExpense(id);
  if (!deleted) {
    throw new AppError('Expense not found', 404);
  }

  return res.json({ success: true, message: 'Expense deleted successfully' });
});

export default router;