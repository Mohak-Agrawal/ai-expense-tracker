import Database from 'better-sqlite3';
import path from 'path';

let db: Database.Database | null = null;
let activeDbPath: string | null = null;

function getDbPath(): string {
  return process.env.EXPENSE_DB_PATH?.trim() || path.join(__dirname, '../../expenses.db');
}

export function getDb(): Database.Database {
  const dbPath = getDbPath();

  if (!db || activeDbPath !== dbPath) {
    if (db) {
      db.close();
    }

    db = new Database(dbPath);
    activeDbPath = dbPath;
    db.pragma('journal_mode = WAL');
    initializeDb(db);
  }
  return db;
}

export function resetDbConnection(): void {
  if (db) {
    db.close();
  }

  db = null;
  activeDbPath = null;
}

function initializeDb(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      amount DECIMAL(10,2) NOT NULL,
      currency VARCHAR(3) DEFAULT 'INR',
      category VARCHAR(50) NOT NULL,
      description TEXT NOT NULL,
      merchant VARCHAR(100),
      original_input TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const columns = db.prepare('PRAGMA table_info(expenses)').all() as Array<{ name: string }>;
  const hasUpdatedAt = columns.some((column) => column.name === 'updated_at');

  if (!hasUpdatedAt) {
    db.exec('ALTER TABLE expenses ADD COLUMN updated_at TIMESTAMP');
    db.exec('UPDATE expenses SET updated_at = COALESCE(updated_at, created_at, CURRENT_TIMESTAMP)');
  }
}

export type ExpenseCategory =
  | 'Food & Dining'
  | 'Transport'
  | 'Shopping'
  | 'Entertainment'
  | 'Bills & Utilities'
  | 'Health'
  | 'Travel'
  | 'Other';

export interface Expense {
  id: number;
  amount: number;
  currency: string;
  category: ExpenseCategory;
  description: string;
  merchant: string | null;
  original_input: string;
  created_at: string;
  updated_at: string;
}

export interface ExpenseInput {
  amount: number;
  currency: string;
  category: ExpenseCategory;
  description: string;
  merchant: string | null;
  original_input: string;
}

export interface ExpenseUpdateInput extends ExpenseInput {}

export function createExpense(input: ExpenseInput): Expense {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO expenses (amount, currency, category, description, merchant, original_input)
    VALUES (@amount, @currency, @category, @description, @merchant, @original_input)
  `);
  const result = stmt.run(input);
  return getExpenseById(result.lastInsertRowid as number)!;
}

export function getExpenseById(id: number): Expense | undefined {
  const db = getDb();
  return db.prepare('SELECT * FROM expenses WHERE id = ?').get(id) as Expense | undefined;
}

export function getAllExpenses(): Expense[] {
  const db = getDb();
  return db.prepare('SELECT * FROM expenses ORDER BY datetime(updated_at) DESC, id DESC').all() as Expense[];
}

export function updateExpense(id: number, input: ExpenseUpdateInput): Expense | undefined {
  const db = getDb();
  const result = db.prepare(`
    UPDATE expenses
    SET amount = @amount,
        currency = @currency,
        category = @category,
        description = @description,
        merchant = @merchant,
        original_input = @original_input,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = @id
  `).run({ id, ...input });

  if (result.changes === 0) {
    return undefined;
  }

  return getExpenseById(id);
}

export function deleteExpense(id: number): boolean {
  const db = getDb();
  const result = db.prepare('DELETE FROM expenses WHERE id = ?').run(id);
  return result.changes > 0;
}
