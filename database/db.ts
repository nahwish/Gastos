import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { runMigrations } from './migrationService';

let db: any;

if (Platform.OS === 'web') {
  // Implementación para web usando AsyncStorage
  db = {
    execAsync: async (sql: string) => {
      const tables = await AsyncStorage.getItem('_db_tables');
      if (!tables) {
        await AsyncStorage.setItem('_db_tables', JSON.stringify({ users: [], expenses: [], categories: [] }));
      }
      return null;
    },
    runAsync: async (sql: string, params: any[] = []) => {
      let tables = JSON.parse(await AsyncStorage.getItem('_db_tables') || '{"users": [], "expenses": [], "categories": []}');
      
      // Asegurar que siempre existan los arrays
      if (!tables.users) tables.users = [];
      if (!tables.expenses) tables.expenses = [];
      if (!tables.categories) tables.categories = [];
      
      if (sql.includes('INSERT INTO users')) {
        const [username, email, password] = params;
        const id = (tables.users.length > 0 ? Math.max(...tables.users.map((u: any) => u.id)) : 0) + 1;
        tables.users.push({ id, username, email, password, created_at: new Date().toISOString() });
        await AsyncStorage.setItem('_db_tables', JSON.stringify(tables));
        return { lastInsertRowId: id, changes: 1 };
      } else if (sql.includes('INSERT INTO expenses')) {
        const [user_id, amount, description, category, date] = params;
        const id = (tables.expenses.length > 0 ? Math.max(...tables.expenses.map((e: any) => e.id)) : 0) + 1;
        tables.expenses.push({ id, user_id, amount, description, category, date, created_at: new Date().toISOString() });
        await AsyncStorage.setItem('_db_tables', JSON.stringify(tables));
        return { lastInsertRowId: id, changes: 1 };
      } else if (sql.includes('INSERT INTO categories') || sql.includes('INSERT OR IGNORE INTO categories')) {
        const [name, icon, color] = params;
        if (!tables.categories.find((c: any) => c.name === name)) {
          const id = (tables.categories.length > 0 ? Math.max(...tables.categories.map((c: any) => c.id)) : 0) + 1;
          tables.categories.push({ id, name, icon, color });
          await AsyncStorage.setItem('_db_tables', JSON.stringify(tables));
        }
        return { lastInsertRowId: 1, changes: 1 };
      } else if (sql.includes('DELETE')) {
        const idMatch = sql.match(/WHERE id = ?/);
        if (idMatch && params[0]) {
          tables.expenses = tables.expenses.filter((e: any) => e.id !== params[0]);
          await AsyncStorage.setItem('_db_tables', JSON.stringify(tables));
        }
        return { changes: 1 };
      } else if (sql.includes('UPDATE')) {
        const id = params[params.length - 1];
        const index = tables.expenses.findIndex((e: any) => e.id === id);
        if (index !== -1) {
          tables.expenses[index] = { ...tables.expenses[index], amount: params[0], description: params[1], category: params[2], date: params[3] };
          await AsyncStorage.setItem('_db_tables', JSON.stringify(tables));
        }
        return { changes: 1 };
      }
      return { lastInsertRowId: 1, changes: 1 };
    },
    getAllAsync: async (sql: string, params: any[] = []) => {
      let tables = JSON.parse(await AsyncStorage.getItem('_db_tables') || '{"users": [], "expenses": [], "categories": []}');
      
      // Asegurar que siempre existan los arrays
      if (!tables.users) tables.users = [];
      if (!tables.expenses) tables.expenses = [];
      if (!tables.categories) tables.categories = [];
      
      if (sql.includes('SELECT * FROM users')) {
        return tables.users;
      } else if (sql.includes('SELECT * FROM expenses')) {
        if (sql.includes('WHERE user_id')) {
          let filtered = tables.expenses.filter((e: any) => e.user_id === params[0]);
          if (sql.includes('ORDER BY date DESC')) {
            return [...filtered].sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
          }
          return filtered;
        }
        if (sql.includes('WHERE category')) {
          return tables.expenses.filter((e: any) => e.category === params[0]);
        }
        if (sql.includes('WHERE date BETWEEN')) {
          return tables.expenses.filter((e: any) => e.date >= params[0] && e.date <= params[1]);
        }
        if (sql.includes('ORDER BY date DESC')) {
          return [...tables.expenses].sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
        }
        return tables.expenses;
      } else if (sql.includes('SELECT category, SUM')) {
        const userId = params[0];
        const grouped: any = {};
        tables.expenses.filter((e: any) => e.user_id === userId).forEach((e: any) => {
          if (!grouped[e.category]) grouped[e.category] = 0;
          grouped[e.category] += e.amount;
        });
        return Object.entries(grouped).map(([category, total]: any) => ({ category, total })).sort((a: any, b: any) => b.total - a.total);
      } else if (sql.includes('SELECT * FROM categories')) {
        return tables.categories;
      }
      return tables.expenses;
    },
    getFirstAsync: async (sql: string, params: any[] = []) => {
      let tables = JSON.parse(await AsyncStorage.getItem('_db_tables') || '{"users": [], "expenses": [], "categories": []}');
      
      // Asegurar que siempre existan los arrays
      if (!tables.users) tables.users = [];
      if (!tables.expenses) tables.expenses = [];
      if (!tables.categories) tables.categories = [];
      
      if (sql.includes('SELECT * FROM users WHERE')) {
        if (sql.includes('OR')) {
          // Búsqueda por username O email
          return tables.users.find((u: any) => u.username === params[0] || u.email === params[1]) || null;
        } else if (sql.includes('email')) {
          return tables.users.find((u: any) => u.email === params[0]) || null;
        } else if (sql.includes('username')) {
          return tables.users.find((u: any) => u.username === params[0]) || null;
        }
      } else if (sql.includes('SELECT SUM(amount)')) {
        const userId = params[0];
        const startDate = params[1];
        const endDate = params[2];
        const total = tables.expenses
          .filter((e: any) => e.user_id === userId && e.date >= startDate && e.date <= endDate)
          .reduce((sum: number, e: any) => sum + e.amount, 0);
        return { total };
      }
      return null;
    },
    withTransactionAsync: async (callback: () => Promise<void>) => await callback(),
  };
} else {
  db = SQLite.openDatabaseSync('gastos.db');
}

export const initDatabase = async () => {
  try {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS expenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        amount REAL NOT NULL,
        description TEXT NOT NULL,
        category TEXT NOT NULL,
        date TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
      
      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        icon TEXT,
        color TEXT
      );
    `);

    // Insertar categorías por defecto si no existen
    const categories = [
      { name: 'Alimentación', icon: '���', color: '#FF6B6B' },
      { name: 'Transporte', icon: '���', color: '#4ECDC4' },
      { name: 'Entretenimiento', icon: '��', color: '#FFE66D' },
      { name: 'Salud', icon: '⚕️', color: '#95E1D3' },
      { name: 'Hogar', icon: '���', color: '#F38181' },
      { name: 'Otros', icon: '���', color: '#AA96DA' },
    ];

    for (const cat of categories) {
      await db.runAsync(
        'INSERT OR IGNORE INTO categories (name, icon, color) VALUES (?, ?, ?)',
        [cat.name, cat.icon, cat.color]
      );
    }

    // Run migrations after base tables are created
    try {
      await runMigrations(db);
    } catch (migrationError) {
      console.error('Error running migrations:', migrationError);
    }

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
  }
};

export default db;
