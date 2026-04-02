import { Router, Request, Response } from 'express';
import { parseExpense } from '../services/aiService';
import { createExpense, getAllExpenses, deleteExpense } from '../database/db';

const router = Router();

// POST /api/expenses
router.post('/', async (req: Request, res: Response) => {
  const { input } = req.body;
  if (!input || typeof input !== 'string') {
    return res.status(400).json({ success: false, error: 'Input text is required' });
  }

  try {
    const parsed = await parseExpense(input);
    if (!parsed) {
      return res.status(400).json({ success: false, error: 'Could not parse expense. Please include an amount.' });
    }

    const expense = createExpense({ ...parsed, original_input: input });
    return res.status(201).json({ success: true, expense });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

// GET /api/expenses
router.get('/', (_req: Request, res: Response) => {
  try {
    const expenses = getAllExpenses();
    return res.json({ success: true, expenses });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

// DELETE /api/expenses/:id
router.delete('/:id', (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ success: false, error: 'Invalid ID' });

  const deleted = deleteExpense(id);
  if (!deleted) return res.status(404).json({ success: false, error: 'Expense not found' });

  return res.json({ success: true, message: 'Expense deleted successfully' });
});

export default router;