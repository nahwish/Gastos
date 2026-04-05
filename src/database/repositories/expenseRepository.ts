import db from '@/database/client';
import { getCurrentUserId } from '@/database/repositories/userRepository';

export interface Expense {
  id?: number;
  user_id?: number;
  amount: number;
  description: string;
  category: string;
  date: string;
  expense_type?: 'individual' | 'compartido';
  discount_amount?: number;
  discount_type?: 'fixed' | 'percentage';
}

export const addExpense = async (expense: Omit<Expense, 'id' | 'user_id'>): Promise<number> => {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('No user logged in');

  const expenseType = expense.expense_type ?? 'individual';
  const discountAmount = expense.discount_amount ?? 0;
  const discountType = expense.discount_type ?? 'fixed';

  const result = await db.runAsync(
    'INSERT INTO expenses (user_id, amount, description, category, date, expense_type, discount_amount, discount_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [userId, expense.amount, expense.description, expense.category, expense.date, expenseType, discountAmount, discountType],
  );
  return result.lastInsertRowId;
};

export const getAllExpenses = async (): Promise<Expense[]> => {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('No user logged in');

  const result = (await db.getAllAsync(
    'SELECT id, user_id, amount, description, category, date, expense_type, discount_amount, discount_type FROM expenses WHERE user_id = ? ORDER BY date DESC',
    [userId],
  )) as Expense[];
  return result;
};

export const getExpensesByMonth = async (year: number, month: number): Promise<Expense[]> => {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('No user logged in');

  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = `${year}-${String(month).padStart(2, '0')}-31`;

  const result = (await db.getAllAsync(
    'SELECT id, user_id, amount, description, category, date, expense_type, discount_amount, discount_type FROM expenses WHERE user_id = ? AND date BETWEEN ? AND ? ORDER BY date DESC',
    [userId, startDate, endDate],
  )) as Expense[];
  return result;
};

export const getExpensesByCategory = async (category: string): Promise<Expense[]> => {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('No user logged in');

  const result = (await db.getAllAsync(
    'SELECT * FROM expenses WHERE user_id = ? AND category = ? ORDER BY date DESC',
    [userId, category],
  )) as Expense[];
  return result;
};

export const updateExpense = async (
  id: number,
  expense: Omit<Expense, 'id' | 'user_id'>,
): Promise<void> => {
  await db.runAsync(
    'UPDATE expenses SET amount = ?, description = ?, category = ?, date = ? WHERE id = ?',
    [expense.amount, expense.description, expense.category, expense.date, id],
  );
};

export const deleteExpense = async (id: number): Promise<void> => {
  await db.runAsync('DELETE FROM expenses WHERE id = ?', [id]);
};

export const getTotalByCategory = async (): Promise<{ category: string; total: number }[]> => {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('No user logged in');

  const result = (await db.getAllAsync(
    'SELECT category, SUM(amount) as total FROM expenses WHERE user_id = ? GROUP BY category ORDER BY total DESC',
    [userId],
  )) as { category: string; total: number }[];
  return result;
};

export const getMonthlyTotal = async (year: number, month: number): Promise<number> => {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('No user logged in');

  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = `${year}-${String(month).padStart(2, '0')}-31`;

  const result = (await db.getFirstAsync(
    'SELECT SUM(amount) as total FROM expenses WHERE user_id = ? AND date BETWEEN ? AND ?',
    [userId, startDate, endDate],
  )) as { total: number } | null;
  return result?.total || 0;
};

export interface Category {
  id: number;
  name: string;
  icon: string;
  color: string;
  user_id?: number | null;
  is_default?: number;
}

export const getCategories = async (userId?: number): Promise<Category[]> => {
  if (userId) {
    const result = (await db.getAllAsync(
      'SELECT * FROM categories WHERE is_default = 1 OR user_id = ? ORDER BY is_default DESC, id ASC',
      [userId],
    )) as Category[];
    return result;
  }
  const result = (await db.getAllAsync(
    'SELECT * FROM categories ORDER BY id ASC',
    [],
  )) as Category[];
  return result;
};

export const addCategory = async (
  name: string,
  icon: string,
  color: string,
  userId: number,
): Promise<Category> => {
  const result = await db.runAsync(
    'INSERT INTO categories (name, icon, color, user_id, is_default) VALUES (?, ?, ?, ?, 0)',
    [name, icon, color, userId],
  );
  return { id: result.lastInsertRowId, name, icon, color, user_id: userId, is_default: 0 };
};

export const getTotalByExpenseType = async (
  year: number,
  month: number,
): Promise<{ shared: number; individual: number }> => {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('No user logged in');

  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = `${year}-${String(month).padStart(2, '0')}-31`;

  try {
    const rows = (await db.getAllAsync(
      `SELECT COALESCE(expense_type, 'individual') as expense_type, SUM(amount) as total
       FROM expenses
       WHERE user_id = ? AND date BETWEEN ? AND ?
       GROUP BY COALESCE(expense_type, 'individual')`,
      [userId, startDate, endDate],
    )) as { expense_type: string; total: number }[];

    let shared = 0;
    let individual = 0;
    for (const row of rows) {
      if (row.expense_type === 'compartido') {
        shared = row.total;
      } else {
        individual = row.total;
      }
    }
    return { shared, individual };
  } catch {
    // Column doesn't exist yet (pre-migration) — fall back to monthly total
    const monthlyTotal = await getMonthlyTotal(year, month);
    return { shared: 0, individual: monthlyTotal };
  }
};

export const getFutureExpenses = async (year: number, month: number): Promise<number> => {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('No user logged in');

  const today = new Date().toISOString().split('T')[0];
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = `${year}-${String(month).padStart(2, '0')}-31`;

  const result = (await db.getFirstAsync(
    `SELECT SUM(amount) as total FROM expenses
     WHERE user_id = ? AND date > ? AND date BETWEEN ? AND ?`,
    [userId, today, startDate, endDate],
  )) as { total: number } | null;

  return result?.total || 0;
};
