import { getMonthlyReimbursements } from '@/database/repositories/reimbursementRepository';

jest.mock('@/database/client', () => ({
  __esModule: true,
  default: {
    getFirstAsync: jest.fn(),
  },
}));

describe('reimbursementRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getMonthlyReimbursements', () => {
    it('debería retornar el total de reintegros del mes', async () => {
      const db = require('@/database/client').default;
      (db.getFirstAsync as jest.Mock).mockResolvedValueOnce({ total: 2500 });

      const result = await getMonthlyReimbursements(1, 2026, 4);

      expect(result).toBe(2500);
      expect(db.getFirstAsync).toHaveBeenCalledWith(
        'SELECT SUM(amount) as total FROM reimbursements WHERE user_id = ? AND date BETWEEN ? AND ?',
        [1, '2026-04-01', '2026-04-30'],
      );
    });

    it('debería retornar 0 cuando no hay reintegros', async () => {
      const db = require('@/database/client').default;
      (db.getFirstAsync as jest.Mock).mockResolvedValueOnce(null);

      const result = await getMonthlyReimbursements(1, 2026, 4);

      expect(result).toBe(0);
    });

    it('debería retornar 0 cuando el total es null', async () => {
      const db = require('@/database/client').default;
      (db.getFirstAsync as jest.Mock).mockResolvedValueOnce({ total: null });

      const result = await getMonthlyReimbursements(1, 2026, 4);

      expect(result).toBe(0);
    });

    it('debería calcular fechas correctamente para diciembre (mes con 31 días)', async () => {
      const db = require('@/database/client').default;
      (db.getFirstAsync as jest.Mock).mockResolvedValueOnce({ total: 0 });

      await getMonthlyReimbursements(1, 2025, 12);

      expect(db.getFirstAsync).toHaveBeenCalledWith(
        expect.any(String),
        [1, '2025-12-01', '2025-12-31'],
      );
    });

    it('debería calcular fechas correctamente para febrero en año bisiesto', async () => {
      const db = require('@/database/client').default;
      (db.getFirstAsync as jest.Mock).mockResolvedValueOnce({ total: 0 });

      await getMonthlyReimbursements(1, 2024, 2);

      expect(db.getFirstAsync).toHaveBeenCalledWith(
        expect.any(String),
        [1, '2024-02-01', '2024-02-29'],
      );
    });

    it('debería calcular fechas correctamente para febrero en año no bisiesto', async () => {
      const db = require('@/database/client').default;
      (db.getFirstAsync as jest.Mock).mockResolvedValueOnce({ total: 0 });

      await getMonthlyReimbursements(1, 2025, 2);

      expect(db.getFirstAsync).toHaveBeenCalledWith(
        expect.any(String),
        [1, '2025-02-01', '2025-02-28'],
      );
    });

    it('debería usar el userId proporcionado en la consulta', async () => {
      const db = require('@/database/client').default;
      (db.getFirstAsync as jest.Mock).mockResolvedValueOnce({ total: 100 });

      await getMonthlyReimbursements(42, 2026, 1);

      expect(db.getFirstAsync).toHaveBeenCalledWith(expect.any(String), [
        42,
        expect.any(String),
        expect.any(String),
      ]);
    });
  });
});
