import db from '@/database/client';

/**
 * Returns the total reimbursements for a user in a given month/year.
 * Validates: Requirements 5.1, 5.3
 */
export async function getMonthlyReimbursements(
  userId: number,
  year: number,
  month: number,
): Promise<number> {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  const result = await db.getFirstAsync(
    'SELECT SUM(amount) as total FROM reimbursements WHERE user_id = ? AND date BETWEEN ? AND ?',
    [userId, startDate, endDate],
  );

  if (!result || result.total == null) return 0;
  return result.total;
}
