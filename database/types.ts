// database/types.ts
// Fase 2 interfaces and pure calculation functions

export interface MonthlyConfig {
  id?: number;
  user_id: number;
  year: number;
  month: number;
  salary: number | null;
  savings_goal: number | null;
}

export interface Reimbursement {
  id?: number;
  user_id: number;
  amount: number;
  description: string;
  date: string;
}

// Valores derivados calculados en pantalla
export interface DerivedFinancials {
  disponibleReal: number;           // salary - monthlyTotal
  conGastosFuturos: number;         // disponibleReal - futureExpenses
  savingsProgress: number;          // min(disponibleReal / savingsGoal, 1.0)
  totalWithReimbursements: number;  // disponibleReal + reimbursementsTotal
}

/**
 * Calculates savings progress as a value clamped to [0, 1].
 * Returns 0 if savingsGoal is null or <= 0.
 * Validates: Requirements 6.2, 6.6
 */
export function calculateSavingsProgress(
  disponibleReal: number,
  savingsGoal: number | null
): number {
  if (savingsGoal === null || savingsGoal <= 0) return 0;
  return Math.min(Math.max(disponibleReal / savingsGoal, 0), 1.0);
}

/**
 * Returns disponibleReal + reimbursementsTotal.
 * Validates: Requirements 5.3
 */
export function calculateTotalWithReimbursements(
  disponibleReal: number,
  reimbursementsTotal: number
): number {
  return disponibleReal + reimbursementsTotal;
}

/**
 * Formats a number as currency with es-AR locale (e.g. "$1.500").
 * Returns '$0' if amount is NaN or undefined.
 * Validates: Requirements 3.6
 */
export function formatCurrency(amount: number): string {
  if (amount === undefined || amount === null || isNaN(amount)) return '$0';
  return '$' + amount.toLocaleString('es-AR');
}

/**
 * Formats a Date as "Mes YYYY" in Spanish with capitalized month name (e.g. "Abril 2026").
 * Validates: Requirements 2.2
 */
export function formatMonthYear(date: Date): string {
  const raw = date.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
  // toLocaleDateString may return "abril de 2026" — extract month and year
  const month = date.toLocaleDateString('es-AR', { month: 'long' });
  const year = date.getFullYear();
  const capitalized = month.charAt(0).toUpperCase() + month.slice(1);
  return `${capitalized} ${year}`;
}
