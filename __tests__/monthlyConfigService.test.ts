import {
  getMonthlyConfig,
  saveMonthlyConfig,
} from '../database/monthlyConfigService';
import { MonthlyConfig } from '../database/types';

jest.mock('../database/db', () => ({
  __esModule: true,
  default: {
    runAsync: jest.fn(),
    getFirstAsync: jest.fn(),
  },
}));

describe('monthlyConfigService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getMonthlyConfig', () => {
    it('debería retornar la configuración mensual cuando existe', async () => {
      const db = require('../database/db').default;
      const mockConfig: MonthlyConfig = {
        id: 1,
        user_id: 1,
        year: 2026,
        month: 4,
        salary: 150000,
        savings_goal: 30000,
      };

      (db.getFirstAsync as jest.Mock).mockResolvedValueOnce(mockConfig);

      const result = await getMonthlyConfig(1, 2026, 4);

      expect(result).toEqual(mockConfig);
      expect(db.getFirstAsync).toHaveBeenCalledWith(
        'SELECT * FROM monthly_config WHERE user_id = ? AND year = ? AND month = ?',
        [1, 2026, 4]
      );
    });

    it('debería retornar null cuando no existe registro', async () => {
      const db = require('../database/db').default;

      (db.getFirstAsync as jest.Mock).mockResolvedValueOnce(null);

      const result = await getMonthlyConfig(1, 2026, 4);

      expect(result).toBeNull();
    });

    it('debería retornar null cuando el resultado es undefined (mock web)', async () => {
      const db = require('../database/db').default;

      (db.getFirstAsync as jest.Mock).mockResolvedValueOnce(undefined);

      const result = await getMonthlyConfig(1, 2026, 4);

      expect(result).toBeNull();
    });

    it('debería consultar con los parámetros correctos', async () => {
      const db = require('../database/db').default;

      (db.getFirstAsync as jest.Mock).mockResolvedValueOnce(null);

      await getMonthlyConfig(42, 2025, 12);

      expect(db.getFirstAsync).toHaveBeenCalledWith(
        'SELECT * FROM monthly_config WHERE user_id = ? AND year = ? AND month = ?',
        [42, 2025, 12]
      );
    });

    it('debería retornar config con salary y savings_goal nulos', async () => {
      const db = require('../database/db').default;
      const mockConfig: MonthlyConfig = {
        id: 2,
        user_id: 1,
        year: 2026,
        month: 5,
        salary: null,
        savings_goal: null,
      };

      (db.getFirstAsync as jest.Mock).mockResolvedValueOnce(mockConfig);

      const result = await getMonthlyConfig(1, 2026, 5);

      expect(result).toEqual(mockConfig);
      expect(result?.salary).toBeNull();
      expect(result?.savings_goal).toBeNull();
    });
  });

  describe('saveMonthlyConfig', () => {
    it('debería guardar la configuración mensual correctamente', async () => {
      const db = require('../database/db').default;

      (db.runAsync as jest.Mock).mockResolvedValueOnce({ lastInsertRowId: 1, changes: 1 });

      const config: MonthlyConfig = {
        user_id: 1,
        year: 2026,
        month: 4,
        salary: 150000,
        savings_goal: 30000,
      };

      await saveMonthlyConfig(config);

      expect(db.runAsync).toHaveBeenCalledWith(
        'INSERT OR REPLACE INTO monthly_config (user_id, year, month, salary, savings_goal) VALUES (?, ?, ?, ?, ?)',
        [1, 2026, 4, 150000, 30000]
      );
    });

    it('debería guardar config con salary y savings_goal nulos', async () => {
      const db = require('../database/db').default;

      (db.runAsync as jest.Mock).mockResolvedValueOnce({ lastInsertRowId: 2, changes: 1 });

      const config: MonthlyConfig = {
        user_id: 1,
        year: 2026,
        month: 6,
        salary: null,
        savings_goal: null,
      };

      await saveMonthlyConfig(config);

      expect(db.runAsync).toHaveBeenCalledWith(
        'INSERT OR REPLACE INTO monthly_config (user_id, year, month, salary, savings_goal) VALUES (?, ?, ?, ?, ?)',
        [1, 2026, 6, null, null]
      );
    });

    it('debería usar INSERT OR REPLACE para actualizar registros existentes', async () => {
      const db = require('../database/db').default;

      (db.runAsync as jest.Mock).mockResolvedValue({ lastInsertRowId: 1, changes: 1 });

      const config: MonthlyConfig = {
        user_id: 1,
        year: 2026,
        month: 4,
        salary: 200000,
        savings_goal: 50000,
      };

      await saveMonthlyConfig(config);

      const sql = (db.runAsync as jest.Mock).mock.calls[0][0] as string;
      expect(sql).toContain('INSERT OR REPLACE');
    });
  });
});
