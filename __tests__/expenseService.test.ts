import {
  addExpense,
  getAllExpenses,
  deleteExpense,
  getMonthlyTotal,
  getTotalByCategory,
  getTotalByExpenseType,
  getFutureExpenses,
  getCategories,
  addCategory,
  getExpensesByMonth,
  getExpensesByCategory,
  updateExpense,
} from '@/database/repositories/expenseRepository';

jest.mock('@/database/client', () => ({
  __esModule: true,
  default: {
    runAsync: jest.fn(),
    getAllAsync: jest.fn(),
    getFirstAsync: jest.fn(),
  },
}));

jest.mock('@/database/repositories/userRepository', () => ({
  getCurrentUserId: jest.fn(() => Promise.resolve(1)),
}));

describe('ExpenseService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('addExpense', () => {
    it('debería agregar un gasto correctamente con defaults', async () => {
      const db = require('@/database/client').default;

      (db.runAsync as jest.Mock).mockResolvedValueOnce({ lastInsertRowId: 1, changes: 1 });

      const expense = {
        amount: 100,
        description: 'Comida',
        category: 'Alimentación',
        date: '2024-01-01',
      };

      const result = await addExpense(expense);

      expect(result).toBe(1);
      expect(db.runAsync).toHaveBeenCalledWith(
        'INSERT INTO expenses (user_id, amount, description, category, date, expense_type, discount_amount, discount_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [1, 100, 'Comida', 'Alimentación', '2024-01-01', 'individual', 0, 'fixed']
      );
    });

    it('debería agregar un gasto compartido con descuento', async () => {
      const db = require('@/database/client').default;

      (db.runAsync as jest.Mock).mockResolvedValueOnce({ lastInsertRowId: 2, changes: 1 });

      const expense = {
        amount: 500,
        description: 'Cena',
        category: 'Alimentación',
        date: '2024-01-15',
        expense_type: 'compartido' as const,
        discount_amount: 10,
        discount_type: 'percentage' as const,
      };

      const result = await addExpense(expense);

      expect(result).toBe(2);
      expect(db.runAsync).toHaveBeenCalledWith(
        'INSERT INTO expenses (user_id, amount, description, category, date, expense_type, discount_amount, discount_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [1, 500, 'Cena', 'Alimentación', '2024-01-15', 'compartido', 10, 'percentage']
      );
    });

    it('debería rechazar si no hay usuario autenticado', async () => {
      const authService = require('@/database/repositories/userRepository');
      (authService.getCurrentUserId as jest.Mock).mockResolvedValueOnce(null);

      const expense = {
        amount: 100,
        description: 'Comida',
        category: 'Alimentación',
        date: '2024-01-01',
      };

      await expect(addExpense(expense)).rejects.toThrow('No user logged in');
    });
  });

  describe('getAllExpenses', () => {
    it('debería obtener todos los gastos del usuario', async () => {
      const db = require('@/database/client').default;

      const expenses = [
        { id: 1, user_id: 1, amount: 100, description: 'Comida', category: 'Alimentación', date: '2024-01-01' },
        { id: 2, user_id: 1, amount: 50, description: 'Transporte', category: 'Transporte', date: '2024-01-02' },
      ];

      (db.getAllAsync as jest.Mock).mockResolvedValueOnce(expenses);

      const result = await getAllExpenses();

      expect(result).toEqual(expenses);
      expect(db.getAllAsync).toHaveBeenCalledWith(
        'SELECT id, user_id, amount, description, category, date, expense_type, discount_amount, discount_type FROM expenses WHERE user_id = ? ORDER BY date DESC',
        [1]
      );
    });

    it('debería retornar array vacío si no hay gastos', async () => {
      const db = require('@/database/client').default;

      (db.getAllAsync as jest.Mock).mockResolvedValueOnce([]);

      const result = await getAllExpenses();

      expect(result).toEqual([]);
    });
  });

  describe('deleteExpense', () => {
    it('debería eliminar un gasto', async () => {
      const db = require('@/database/client').default;

      (db.runAsync as jest.Mock).mockResolvedValueOnce({ changes: 1 });

      await deleteExpense(1);

      expect(db.runAsync).toHaveBeenCalledWith('DELETE FROM expenses WHERE id = ?', [1]);
    });
  });

  describe('getMonthlyTotal', () => {
    it('debería calcular el total mensual', async () => {
      const db = require('@/database/client').default;

      (db.getFirstAsync as jest.Mock).mockResolvedValueOnce({ total: 500 });

      const result = await getMonthlyTotal(2024, 1);

      expect(result).toBe(500);
      expect(db.getFirstAsync).toHaveBeenCalledWith(
        'SELECT SUM(amount) as total FROM expenses WHERE user_id = ? AND date BETWEEN ? AND ?',
        [1, '2024-01-01', '2024-01-31']
      );
    });

    it('debería retornar 0 si no hay gastos en el mes', async () => {
      const db = require('@/database/client').default;

      (db.getFirstAsync as jest.Mock).mockResolvedValueOnce(null);

      const result = await getMonthlyTotal(2024, 1);

      expect(result).toBe(0);
    });
  });

  describe('getTotalByCategory', () => {
    it('debería agrupar gastos por categoría', async () => {
      const db = require('@/database/client').default;

      const totals = [
        { category: 'Alimentación', total: 300 },
        { category: 'Transporte', total: 150 },
      ];

      (db.getAllAsync as jest.Mock).mockResolvedValueOnce(totals);

      const result = await getTotalByCategory();

      expect(result).toEqual(totals);
      expect(db.getAllAsync).toHaveBeenCalledWith(
        'SELECT category, SUM(amount) as total FROM expenses WHERE user_id = ? GROUP BY category ORDER BY total DESC',
        [1]
      );
    });
  });

  describe('getTotalByExpenseType', () => {
    it('debería retornar totales separados por tipo de gasto', async () => {
      const db = require('@/database/client').default;

      (db.getAllAsync as jest.Mock).mockResolvedValueOnce([
        { expense_type: 'compartido', total: 200 },
        { expense_type: 'individual', total: 300 },
      ]);

      const result = await getTotalByExpenseType(2024, 1);

      expect(result).toEqual({ shared: 200, individual: 300 });
      expect(db.getAllAsync).toHaveBeenCalledWith(
        expect.stringContaining('COALESCE(expense_type'),
        [1, '2024-01-01', '2024-01-31']
      );
    });

    it('debería retornar shared=0 cuando no hay gastos compartidos', async () => {
      const db = require('@/database/client').default;

      (db.getAllAsync as jest.Mock).mockResolvedValueOnce([
        { expense_type: 'individual', total: 500 },
      ]);

      const result = await getTotalByExpenseType(2024, 1);

      expect(result).toEqual({ shared: 0, individual: 500 });
    });

    it('debería retornar { shared: 0, individual: monthlyTotal } si la columna no existe', async () => {
      const db = require('@/database/client').default;

      (db.getAllAsync as jest.Mock).mockRejectedValueOnce(new Error('no such column: expense_type'));
      (db.getFirstAsync as jest.Mock).mockResolvedValueOnce({ total: 400 });

      const result = await getTotalByExpenseType(2024, 1);

      expect(result).toEqual({ shared: 0, individual: 400 });
    });
  });

  describe('getFutureExpenses', () => {
    it('debería retornar el total de gastos futuros del mes', async () => {
      const db = require('@/database/client').default;

      (db.getFirstAsync as jest.Mock).mockResolvedValueOnce({ total: 150 });

      const result = await getFutureExpenses(2024, 12);

      expect(result).toBe(150);
      expect(db.getFirstAsync).toHaveBeenCalledWith(
        expect.stringContaining('date > ?'),
        expect.arrayContaining([1, '2024-12-01', '2024-12-31'])
      );
    });

    it('debería retornar 0 si no hay gastos futuros', async () => {
      const db = require('@/database/client').default;

      (db.getFirstAsync as jest.Mock).mockResolvedValueOnce(null);

      const result = await getFutureExpenses(2024, 1);

      expect(result).toBe(0);
    });
  });

  describe('getCategories', () => {
    it('debería retornar todas las categorías sin filtro de usuario', async () => {
      const db = require('@/database/client').default;

      const categories = [
        { id: 1, name: 'Alimentación', icon: '🍔', color: '#FF6B6B' },
        { id: 2, name: 'Transporte', icon: '🚗', color: '#4ECDC4' },
      ];

      (db.getAllAsync as jest.Mock).mockResolvedValueOnce(categories);

      const result = await getCategories();

      expect(result).toEqual(categories);
      expect(db.getAllAsync).toHaveBeenCalledWith(
        'SELECT * FROM categories ORDER BY id ASC',
        []
      );
    });

    it('debería filtrar categorías por usuario cuando se pasa userId', async () => {
      const db = require('@/database/client').default;

      const categories = [
        { id: 1, name: 'Alimentación', icon: '🍔', color: '#FF6B6B', is_default: 1, user_id: null },
        { id: 7, name: 'Mascota', icon: '🐾', color: '#00B894', is_default: 0, user_id: 1 },
      ];

      (db.getAllAsync as jest.Mock).mockResolvedValueOnce(categories);

      const result = await getCategories(1);

      expect(result).toEqual(categories);
      expect(db.getAllAsync).toHaveBeenCalledWith(
        'SELECT * FROM categories WHERE is_default = 1 OR user_id = ? ORDER BY is_default DESC, id ASC',
        [1]
      );
    });
  });

  describe('addCategory', () => {
    it('debería crear una categoría custom para el usuario', async () => {
      const db = require('@/database/client').default;

      (db.runAsync as jest.Mock).mockResolvedValueOnce({ lastInsertRowId: 7, changes: 1 });

      const result = await addCategory('Mascota', '🐾', '#00B894', 1);

      expect(result).toEqual({
        id: 7,
        name: 'Mascota',
        icon: '🐾',
        color: '#00B894',
        user_id: 1,
        is_default: 0,
      });
      expect(db.runAsync).toHaveBeenCalledWith(
        'INSERT INTO categories (name, icon, color, user_id, is_default) VALUES (?, ?, ?, ?, 0)',
        ['Mascota', '🐾', '#00B894', 1]
      );
    });
  });

  describe('getExpensesByMonth', () => {
    it('debería obtener gastos del mes indicado', async () => {
      const db = require('@/database/client').default;

      const expenses = [
        { id: 1, user_id: 1, amount: 100, description: 'Comida', category: 'Alimentación', date: '2024-03-10' },
      ];

      (db.getAllAsync as jest.Mock).mockResolvedValueOnce(expenses);

      const result = await getExpensesByMonth(2024, 3);

      expect(result).toEqual(expenses);
      expect(db.getAllAsync).toHaveBeenCalledWith(
        expect.stringContaining('date BETWEEN'),
        [1, '2024-03-01', '2024-03-31'],
      );
    });

    it('debería retornar array vacío si no hay gastos en el mes', async () => {
      const db = require('@/database/client').default;

      (db.getAllAsync as jest.Mock).mockResolvedValueOnce([]);

      const result = await getExpensesByMonth(2024, 6);

      expect(result).toEqual([]);
    });

    it('debería rechazar si no hay usuario autenticado', async () => {
      const authService = require('@/database/repositories/userRepository');
      (authService.getCurrentUserId as jest.Mock).mockResolvedValueOnce(null);

      await expect(getExpensesByMonth(2024, 1)).rejects.toThrow('No user logged in');
    });
  });

  describe('getExpensesByCategory', () => {
    it('debería obtener gastos de una categoría específica', async () => {
      const db = require('@/database/client').default;

      const expenses = [
        { id: 1, user_id: 1, amount: 200, description: 'Nafta', category: 'Transporte', date: '2024-01-05' },
      ];

      (db.getAllAsync as jest.Mock).mockResolvedValueOnce(expenses);

      const result = await getExpensesByCategory('Transporte');

      expect(result).toEqual(expenses);
      expect(db.getAllAsync).toHaveBeenCalledWith(
        expect.stringContaining('category = ?'),
        [1, 'Transporte'],
      );
    });

    it('debería retornar array vacío si no hay gastos en la categoría', async () => {
      const db = require('@/database/client').default;

      (db.getAllAsync as jest.Mock).mockResolvedValueOnce([]);

      const result = await getExpensesByCategory('Salud');

      expect(result).toEqual([]);
    });

    it('debería rechazar si no hay usuario autenticado', async () => {
      const authService = require('@/database/repositories/userRepository');
      (authService.getCurrentUserId as jest.Mock).mockResolvedValueOnce(null);

      await expect(getExpensesByCategory('Alimentación')).rejects.toThrow('No user logged in');
    });
  });

  describe('updateExpense', () => {
    it('debería actualizar un gasto existente', async () => {
      const db = require('@/database/client').default;

      (db.runAsync as jest.Mock).mockResolvedValueOnce({ changes: 1 });

      await updateExpense(1, {
        amount: 150,
        description: 'Almuerzo actualizado',
        category: 'Alimentación',
        date: '2024-01-10',
      });

      expect(db.runAsync).toHaveBeenCalledWith(
        'UPDATE expenses SET amount = ?, description = ?, category = ?, date = ? WHERE id = ?',
        [150, 'Almuerzo actualizado', 'Alimentación', '2024-01-10', 1],
      );
    });
  });

  describe('getAllExpenses — sin usuario autenticado', () => {
    it('debería rechazar si no hay usuario autenticado', async () => {
      const authService = require('@/database/repositories/userRepository');
      (authService.getCurrentUserId as jest.Mock).mockResolvedValueOnce(null);

      await expect(getAllExpenses()).rejects.toThrow('No user logged in');
    });
  });

  describe('getTotalByCategory — sin usuario autenticado', () => {
    it('debería rechazar si no hay usuario autenticado', async () => {
      const authService = require('@/database/repositories/userRepository');
      (authService.getCurrentUserId as jest.Mock).mockResolvedValueOnce(null);

      await expect(getTotalByCategory()).rejects.toThrow('No user logged in');
    });
  });

  describe('getTotalByExpenseType — sin usuario autenticado', () => {
    it('debería rechazar si no hay usuario autenticado', async () => {
      const authService = require('@/database/repositories/userRepository');
      (authService.getCurrentUserId as jest.Mock).mockResolvedValueOnce(null);

      await expect(getTotalByExpenseType(2024, 1)).rejects.toThrow('No user logged in');
    });
  });

  describe('getFutureExpenses — sin usuario autenticado', () => {
    it('debería rechazar si no hay usuario autenticado', async () => {
      const authService = require('@/database/repositories/userRepository');
      (authService.getCurrentUserId as jest.Mock).mockResolvedValueOnce(null);

      await expect(getFutureExpenses(2024, 1)).rejects.toThrow('No user logged in');
    });
  });
});
