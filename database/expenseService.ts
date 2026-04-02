import db from './db';
import { getCurrentUserId } from './authService';

export interface Expense {
  id?: number;
  user_id?: number;
  amount: number;
  description: string;
  category: string;
  date: string;
}

export const addExpense = async (expense: Omit<Expense, 'id' | 'user_id'>): Promise<number> => {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('No user logged in');
  
  const result = await db.runAsync(
    'INSERT INTO expenses (user_id, amount, description, category, date) VALUES (?, ?, ?, ?, ?)',
    [userId, expense.amount, expense.description, expense.category, expense.date]
  );
  return result.lastInsertRowId;
};

export const getAllExpenses = async (): Promise<Expense[]> => {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('No user logged in');
  
  const result = await db.getAllAsync(
    'SELECT * FROM expenses WHERE user_id = ? ORDER BY date DESC',
    [userId]
  ) as Expense[];
  return result;
};

export const getExpensesByMonth = async (year: number, month: number): Promise<Expense[]> => {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('No user logged in');
  
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = `${year}-${String(month).padStart(2, '0')}-31`;
  
  const result = await db.getAllAsync(
    'SELECT * FROM expenses WHERE user_id = ? AND date BETWEEN ? AND ? ORDER BY date DESC',
    [userId, startDate, endDate]
  ) as Expense[];
  return result;
};

export const getExpensesByCategory = async (category: string): Promise<Expense[]> => {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('No user logged in');
  
  const result = await db.getAllAsync(
    'SELECT * FROM expenses WHERE user_id = ? AND category = ? ORDER BY date DESC',
    [userId, category]
  ) as Expense[];
  return result;
};

export const updateExpense = async (id: number, expense: Omit<Expense, 'id' | 'user_id'>): Promise<void> => {
  await db.runAsync(
    'UPDATE expenses SET amount = ?, description = ?, category = ?, date = ? WHERE id = ?',
    [expense.amount, expense.description, expense.category, expense.date, id]
  );
};

export const deleteExpense = async (id: number): Promise<void> => {
  await db.runAsync('DELETE FROM expenses WHERE id = ?', [id]);
};

export const getTotalByCategory = async (): Promise<{category: string, total: number}[]> => {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('No user logged in');
  
  const result = await db.getAllAsync(
    'SELECT category, SUM(amount) as total FROM expenses WHERE user_id = ? GROUP BY category ORDER BY total DESC',
    [userId]
  ) as {category: string, total: number}[];
  return result;
};

export const getMonthlyTotal = async (year: number, month: number): Promise<number> => {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('No user logged in');
  
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = `${year}-${String(month).padStart(2, '0')}-31`;
  
  const result = await db.getFirstAsync(
    'SELECT SUM(amount) as total FROM expenses WHERE user_id = ? AND date BETWEEN ? AND ?',
    [userId, startDate, endDate]
  ) as {total: number} | null;
  return result?.total || 0;
};
