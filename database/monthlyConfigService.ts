import db from './db';
import { MonthlyConfig } from './types';

/**
 * Retrieves the monthly config for a given user, year, and month.
 * Returns null if no record exists.
 * Validates: Requirements 7.1, 7.2, 7.3
 */
export const getMonthlyConfig = async (
  userId: number,
  year: number,
  month: number
): Promise<MonthlyConfig | null> => {
  const result = await db.getFirstAsync(
    'SELECT * FROM monthly_config WHERE user_id = ? AND year = ? AND month = ?',
    [userId, year, month]
  ) as MonthlyConfig | null;

  if (!result) return null;
  return result;
};

/**
 * Inserts or replaces a monthly config record.
 * Validates: Requirements 7.4
 */
export const saveMonthlyConfig = async (config: MonthlyConfig): Promise<void> => {
  await db.runAsync(
    'INSERT OR REPLACE INTO monthly_config (user_id, year, month, salary, savings_goal) VALUES (?, ?, ?, ?, ?)',
    [config.user_id, config.year, config.month, config.salary, config.savings_goal]
  );
};
