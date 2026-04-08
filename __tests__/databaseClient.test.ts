/**
 * Tests for the web implementation of the database client (client.ts).
 * When Platform.OS = 'web' (as set in jest.setup.js), the client uses
 * AsyncStorage as a backing store instead of SQLite.
 */

// We need the REAL client — do NOT mock it in this test file.
// Use jest.isolateModules to get a fresh instance per test group.

import AsyncStorage from '@react-native-async-storage/async-storage';

// Helper: reset AsyncStorage between tests
const resetStorage = async () => {
  (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
  (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
};

// Helper: seed AsyncStorage with tables data
const seedStorage = async (data: object) => {
  (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(data));
};

describe('database client (web implementation)', () => {
  let db: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    // Load the actual client (not mocked)
    jest.isolateModules(() => {
      db = require('@/database/client').default;
    });
  });

  describe('execAsync', () => {
    it('debería inicializar las tablas si no existen', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      await db.execAsync('CREATE TABLE IF NOT EXISTS users ...');

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '_db_tables',
        expect.stringContaining('users'),
      );
    });

    it('no debería reinicializar si ya existen las tablas', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify({ users: [{ id: 1, username: 'test' }], expenses: [], categories: [] }),
      );

      await db.execAsync('CREATE TABLE IF NOT EXISTS users ...');

      expect(AsyncStorage.setItem).not.toHaveBeenCalled();
    });
  });

  describe('runAsync — INSERT INTO users', () => {
    it('debería insertar un usuario nuevo con id autoincremental', async () => {
      await seedStorage({ users: [], expenses: [], categories: [] });

      (AsyncStorage.getItem as jest.Mock)
        .mockResolvedValueOnce(JSON.stringify({ users: [], expenses: [], categories: [] }))
        .mockResolvedValue(null);

      const result = await db.runAsync('INSERT INTO users (username, email, password) VALUES (?, ?, ?)', [
        'alice',
        'alice@example.com',
        'hash',
      ]);

      expect(result.lastInsertRowId).toBe(1);
      expect(result.changes).toBe(1);
    });

    it('debería asignar id incrementando el máximo existente', async () => {
      const existingData = {
        users: [{ id: 5, username: 'existing', email: 'e@e.com', password: 'h' }],
        expenses: [],
        categories: [],
      };
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(existingData));

      const result = await db.runAsync('INSERT INTO users (username, email, password) VALUES (?, ?, ?)', [
        'bob',
        'bob@example.com',
        'hash2',
      ]);

      expect(result.lastInsertRowId).toBe(6);
    });
  });

  describe('runAsync — INSERT INTO expenses', () => {
    it('debería insertar un gasto correctamente', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify({ users: [], expenses: [], categories: [] }),
      );

      const result = await db.runAsync(
        'INSERT INTO expenses (user_id, amount, description, category, date) VALUES (?, ?, ?, ?, ?)',
        [1, 100, 'Almuerzo', 'Alimentación', '2024-01-10'],
      );

      expect(result.lastInsertRowId).toBe(1);
    });
  });

  describe('runAsync — INSERT INTO categories', () => {
    it('debería insertar una categoría nueva', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify({ users: [], expenses: [], categories: [] }),
      );

      const result = await db.runAsync(
        'INSERT INTO categories (name, icon, color) VALUES (?, ?, ?)',
        ['Alimentación', '🍔', '#FF6B6B'],
      );

      expect(result.lastInsertRowId).toBe(1);
    });

    it('no debería duplicar una categoría existente (INSERT OR IGNORE)', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify({
          users: [],
          expenses: [],
          categories: [{ id: 1, name: 'Alimentación', icon: '🍔', color: '#FF6B6B' }],
        }),
      );

      const result = await db.runAsync(
        'INSERT OR IGNORE INTO categories (name, icon, color) VALUES (?, ?, ?)',
        ['Alimentación', '🍔', '#FF6B6B'],
      );

      expect(result.lastInsertRowId).toBe(1);
      // setItem not called for the insert — category already exists
      const setItemCalls = (AsyncStorage.setItem as jest.Mock).mock.calls.filter(
        (call) => call[0] === '_db_tables',
      );
      expect(setItemCalls.length).toBe(0);
    });
  });

  describe('runAsync — DELETE', () => {
    it('debería eliminar un gasto por id', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify({
          users: [],
          expenses: [
            { id: 1, user_id: 1, amount: 100, description: 'Comida', category: 'Alimentación', date: '2024-01-01' },
            { id: 2, user_id: 1, amount: 50, description: 'Taxi', category: 'Transporte', date: '2024-01-02' },
          ],
          categories: [],
        }),
      );

      const result = await db.runAsync('DELETE FROM expenses WHERE id = ?', [1]);

      expect(result.changes).toBe(1);
    });
  });

  describe('runAsync — UPDATE', () => {
    it('debería actualizar un gasto existente', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify({
          users: [],
          expenses: [
            { id: 1, user_id: 1, amount: 100, description: 'Viejo', category: 'Otros', date: '2024-01-01' },
          ],
          categories: [],
        }),
      );

      const result = await db.runAsync(
        'UPDATE expenses SET amount = ?, description = ?, category = ?, date = ? WHERE id = ?',
        [200, 'Nuevo', 'Alimentación', '2024-01-05', 1],
      );

      expect(result.changes).toBe(1);
    });

    it('debería no fallar si el gasto no existe', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify({ users: [], expenses: [], categories: [] }),
      );

      const result = await db.runAsync(
        'UPDATE expenses SET amount = ?, description = ?, category = ?, date = ? WHERE id = ?',
        [200, 'Nuevo', 'Alimentación', '2024-01-05', 99],
      );

      expect(result.changes).toBe(1);
    });
  });

  describe('getAllAsync — SELECT * FROM users', () => {
    it('debería retornar todos los usuarios', async () => {
      const users = [
        { id: 1, username: 'alice', email: 'alice@example.com' },
        { id: 2, username: 'bob', email: 'bob@example.com' },
      ];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify({ users, expenses: [], categories: [] }),
      );

      const result = await db.getAllAsync('SELECT * FROM users', []);

      expect(result).toEqual(users);
    });
  });

  describe('getAllAsync — SELECT * FROM expenses', () => {
    it('debería filtrar por user_id y ordenar por fecha descendente', async () => {
      const expenses = [
        { id: 1, user_id: 1, amount: 100, date: '2024-01-01' },
        { id: 2, user_id: 1, amount: 50, date: '2024-01-20' },
        { id: 3, user_id: 2, amount: 200, date: '2024-01-10' },
      ];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify({ users: [], expenses, categories: [] }),
      );

      const result = await db.getAllAsync(
        'SELECT * FROM expenses WHERE user_id = ? ORDER BY date DESC',
        [1],
      );

      expect(result).toHaveLength(2);
      expect(result[0].date).toBe('2024-01-20'); // More recent first
    });

    it('debería filtrar por user_id sin ORDER BY', async () => {
      const expenses = [
        { id: 1, user_id: 1, amount: 100, date: '2024-01-01' },
        { id: 2, user_id: 2, amount: 50, date: '2024-01-20' },
      ];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify({ users: [], expenses, categories: [] }),
      );

      const result = await db.getAllAsync('SELECT * FROM expenses WHERE user_id = ?', [1]);

      expect(result).toHaveLength(1);
      expect(result[0].user_id).toBe(1);
    });

    it('debería retornar todos los expenses sin filtro y ordenar por fecha', async () => {
      const expenses = [
        { id: 1, user_id: 1, amount: 100, date: '2024-01-01' },
        { id: 2, user_id: 1, amount: 50, date: '2024-01-20' },
      ];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify({ users: [], expenses, categories: [] }),
      );

      const result = await db.getAllAsync('SELECT * FROM expenses ORDER BY date DESC', []);

      expect(result).toHaveLength(2);
      expect(result[0].date).toBe('2024-01-20');
    });

    it('debería filtrar por categoría', async () => {
      const expenses = [
        { id: 1, user_id: 1, amount: 100, category: 'Alimentación', date: '2024-01-01' },
        { id: 2, user_id: 1, amount: 50, category: 'Transporte', date: '2024-01-20' },
      ];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify({ users: [], expenses, categories: [] }),
      );

      const result = await db.getAllAsync(
        'SELECT * FROM expenses WHERE category = ?',
        ['Alimentación'],
      );

      expect(result).toHaveLength(1);
      expect(result[0].category).toBe('Alimentación');
    });

    it('debería filtrar por rango de fechas (WHERE date BETWEEN)', async () => {
      const expenses = [
        { id: 1, user_id: 1, amount: 100, date: '2024-01-10' },
        { id: 2, user_id: 1, amount: 50, date: '2024-02-01' },
        { id: 3, user_id: 1, amount: 75, date: '2024-01-25' },
      ];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify({ users: [], expenses, categories: [] }),
      );

      const result = await db.getAllAsync(
        'SELECT * FROM expenses WHERE date BETWEEN ? AND ?',
        ['2024-01-01', '2024-01-31'],
      );

      expect(result).toHaveLength(2);
    });
  });

  describe('getAllAsync — SELECT category, SUM', () => {
    it('debería agrupar gastos por categoría del usuario', async () => {
      const expenses = [
        { id: 1, user_id: 1, amount: 100, category: 'Alimentación', date: '2024-01-01' },
        { id: 2, user_id: 1, amount: 50, category: 'Alimentación', date: '2024-01-02' },
        { id: 3, user_id: 1, amount: 200, category: 'Transporte', date: '2024-01-03' },
        { id: 4, user_id: 2, amount: 300, category: 'Alimentación', date: '2024-01-04' },
      ];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify({ users: [], expenses, categories: [] }),
      );

      const result = await db.getAllAsync(
        'SELECT category, SUM(amount) as total FROM expenses WHERE user_id = ? GROUP BY category',
        [1],
      );

      // Sorted by total desc: Transporte(200) > Alimentación(150)
      expect(result[0].category).toBe('Transporte');
      expect(result[0].total).toBe(200);
      expect(result[1].category).toBe('Alimentación');
      expect(result[1].total).toBe(150);
    });
  });

  describe('getAllAsync — SELECT * FROM categories', () => {
    it('debería retornar todas las categorías', async () => {
      const categories = [
        { id: 1, name: 'Alimentación', icon: '🍔', color: '#FF6B6B' },
        { id: 2, name: 'Transporte', icon: '🚗', color: '#4ECDC4' },
      ];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify({ users: [], expenses: [], categories }),
      );

      const result = await db.getAllAsync('SELECT * FROM categories ORDER BY id ASC', []);

      expect(result).toEqual(categories);
    });
  });

  describe('getFirstAsync — SELECT * FROM users WHERE', () => {
    it('debería buscar usuario por username OR email', async () => {
      const users = [{ id: 1, username: 'alice', email: 'alice@example.com' }];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify({ users, expenses: [], categories: [] }),
      );

      const result = await db.getFirstAsync(
        'SELECT * FROM users WHERE username = ? OR email = ?',
        ['alice', 'other@example.com'],
      );

      expect(result).not.toBeNull();
      expect(result.username).toBe('alice');
    });

    it('debería retornar null si no encuentra usuario por OR', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify({ users: [], expenses: [], categories: [] }),
      );

      const result = await db.getFirstAsync(
        'SELECT * FROM users WHERE username = ? OR email = ?',
        ['nonexistent', 'no@example.com'],
      );

      expect(result).toBeNull();
    });

    it('debería buscar usuario por email', async () => {
      const users = [{ id: 1, username: 'alice', email: 'alice@example.com' }];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify({ users, expenses: [], categories: [] }),
      );

      const result = await db.getFirstAsync('SELECT * FROM users WHERE email = ?', [
        'alice@example.com',
      ]);

      expect(result).not.toBeNull();
      expect(result.email).toBe('alice@example.com');
    });

    it('debería buscar usuario por username', async () => {
      const users = [{ id: 1, username: 'alice', email: 'alice@example.com' }];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify({ users, expenses: [], categories: [] }),
      );

      const result = await db.getFirstAsync('SELECT * FROM users WHERE username = ?', ['alice']);

      expect(result).not.toBeNull();
      expect(result.username).toBe('alice');
    });
  });

  describe('getFirstAsync — SELECT SUM(amount)', () => {
    it('debería calcular el total de gastos del usuario en un rango de fechas', async () => {
      const expenses = [
        { id: 1, user_id: 1, amount: 100, date: '2024-01-10' },
        { id: 2, user_id: 1, amount: 200, date: '2024-01-20' },
        { id: 3, user_id: 2, amount: 500, date: '2024-01-15' },
      ];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify({ users: [], expenses, categories: [] }),
      );

      const result = await db.getFirstAsync(
        'SELECT SUM(amount) as total FROM expenses WHERE user_id = ? AND date BETWEEN ? AND ?',
        [1, '2024-01-01', '2024-01-31'],
      );

      expect(result).not.toBeNull();
      expect(result.total).toBe(300);
    });

    it('debería retornar total 0 si no hay gastos en el rango', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify({ users: [], expenses: [], categories: [] }),
      );

      const result = await db.getFirstAsync(
        'SELECT SUM(amount) as total FROM expenses WHERE user_id = ? AND date BETWEEN ? AND ?',
        [1, '2024-01-01', '2024-01-31'],
      );

      expect(result).not.toBeNull();
      expect(result.total).toBe(0);
    });
  });

  describe('getFirstAsync — fallback', () => {
    it('debería retornar null para consultas SQL no reconocidas', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify({ users: [], expenses: [], categories: [] }),
      );

      const result = await db.getFirstAsync('SELECT * FROM unknown_table WHERE id = ?', [1]);

      expect(result).toBeNull();
    });
  });

  describe('withTransactionAsync', () => {
    it('debería ejecutar el callback recibido', async () => {
      const callback = jest.fn().mockResolvedValue(undefined);

      await db.withTransactionAsync(callback);

      expect(callback).toHaveBeenCalled();
    });
  });
});
