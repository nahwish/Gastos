import {
  calculateSavingsProgress,
  calculateTotalWithReimbursements,
  formatCurrency,
  formatMonthYear,
} from '@/shared/types/database';

describe('calculateSavingsProgress', () => {
  it('debería retornar 0 si savingsGoal es null', () => {
    expect(calculateSavingsProgress(5000, null)).toBe(0);
  });

  it('debería retornar 0 si savingsGoal es 0', () => {
    expect(calculateSavingsProgress(5000, 0)).toBe(0);
  });

  it('debería retornar 0 si savingsGoal es negativo', () => {
    expect(calculateSavingsProgress(5000, -100)).toBe(0);
  });

  it('debería retornar la fracción correcta cuando disponibleReal es menor que savingsGoal', () => {
    expect(calculateSavingsProgress(5000, 10000)).toBe(0.5);
  });

  it('debería retornar 1 cuando disponibleReal iguala savingsGoal', () => {
    expect(calculateSavingsProgress(10000, 10000)).toBe(1.0);
  });

  it('debería clampear a 1 cuando disponibleReal supera savingsGoal', () => {
    expect(calculateSavingsProgress(15000, 10000)).toBe(1.0);
  });

  it('debería retornar 0 cuando disponibleReal es 0', () => {
    expect(calculateSavingsProgress(0, 10000)).toBe(0);
  });

  it('debería retornar 0 cuando disponibleReal es negativo', () => {
    expect(calculateSavingsProgress(-500, 10000)).toBe(0);
  });

  it('el resultado siempre debe estar en el rango [0, 1]', () => {
    const cases: [number, number | null][] = [
      [0, 100],
      [50, 100],
      [100, 100],
      [200, 100],
      [-50, 100],
      [0, null],
      [0, 0],
    ];
    for (const [disponible, goal] of cases) {
      const result = calculateSavingsProgress(disponible, goal);
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(1);
    }
  });
});

describe('calculateTotalWithReimbursements', () => {
  it('debería sumar disponibleReal y reimbursementsTotal', () => {
    expect(calculateTotalWithReimbursements(10000, 500)).toBe(10500);
  });

  it('debería manejar reimbursementsTotal de 0', () => {
    expect(calculateTotalWithReimbursements(10000, 0)).toBe(10000);
  });

  it('debería manejar disponibleReal negativo', () => {
    expect(calculateTotalWithReimbursements(-1000, 200)).toBe(-800);
  });

  it('debería manejar ambos valores en 0', () => {
    expect(calculateTotalWithReimbursements(0, 0)).toBe(0);
  });
});

describe('formatCurrency', () => {
  it('debería formatear un número positivo como moneda es-AR', () => {
    const result = formatCurrency(1500);
    expect(result).toMatch(/^\$/);
    expect(result).toContain('1');
    expect(result).toContain('500');
  });

  it('debería retornar "$0" para NaN', () => {
    expect(formatCurrency(NaN)).toBe('$0');
  });

  it('debería retornar "$0" para undefined', () => {
    expect(formatCurrency(undefined as any)).toBe('$0');
  });

  it('debería retornar "$0" para null', () => {
    expect(formatCurrency(null as any)).toBe('$0');
  });

  it('debería formatear 0 correctamente', () => {
    const result = formatCurrency(0);
    expect(result).toMatch(/^\$0$/);
  });

  it('debería formatear un número negativo', () => {
    const result = formatCurrency(-500);
    expect(result).toMatch(/^\$/);
  });
});

describe('formatMonthYear', () => {
  it('debería retornar el mes capitalizado y el año', () => {
    const date = new Date(2026, 3, 1); // Abril 2026
    const result = formatMonthYear(date);
    expect(result).toMatch(/^[A-ZÁÉÍÓÚ]/); // Empieza con mayúscula
    expect(result).toContain('2026');
  });

  it('el primer carácter debe ser mayúscula', () => {
    const months = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
    for (const month of months) {
      const date = new Date(2025, month, 1);
      const result = formatMonthYear(date);
      expect(result[0]).toBe(result[0].toUpperCase());
    }
  });

  it('debería incluir el año como número de 4 dígitos', () => {
    const date = new Date(2024, 0, 15);
    const result = formatMonthYear(date);
    expect(result).toContain('2024');
  });

  it('el resultado debería contener mes y año separados por espacio', () => {
    const date = new Date(2026, 3, 1);
    const result = formatMonthYear(date);
    const parts = result.split(' ');
    expect(parts.length).toBe(2);
    expect(parts[1]).toBe('2026');
  });
});
