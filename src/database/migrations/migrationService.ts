export interface Migration {
  id: string;
  up: (db: any) => Promise<void>;
}

const migrations: Migration[] = [
  {
    id: '001_add_expense_type',
    up: async (db: any) => {
      await db.execAsync(
        `ALTER TABLE expenses ADD COLUMN IF NOT EXISTS expense_type TEXT DEFAULT 'individual';`,
      );
    },
  },
  {
    id: '002_create_monthly_config',
    up: async (db: any) => {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS monthly_config (
          id          INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id     INTEGER NOT NULL,
          year        INTEGER NOT NULL,
          month       INTEGER NOT NULL,
          salary      REAL,
          savings_goal REAL,
          created_at  TEXT DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, year, month),
          FOREIGN KEY (user_id) REFERENCES users(id)
        );
      `);
    },
  },
  {
    id: '003_create_reimbursements',
    up: async (db: any) => {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS reimbursements (
          id          INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id     INTEGER NOT NULL,
          amount      REAL NOT NULL,
          description TEXT,
          date        TEXT NOT NULL,
          created_at  TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id)
        );
      `);
    },
  },
];

export const runMigrations = async (db: any): Promise<void> => {
  // Create migration control table if it doesn't exist
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id         TEXT PRIMARY KEY,
      applied_at TEXT
    );
  `);

  for (const migration of migrations) {
    const existing = await db.getFirstAsync('SELECT id FROM _migrations WHERE id = ?', [
      migration.id,
    ]);

    if (existing) {
      // Already applied, skip
      continue;
    }

    await migration.up(db);

    await db.runAsync('INSERT INTO _migrations (id, applied_at) VALUES (?, ?)', [
      migration.id,
      new Date().toISOString(),
    ]);
  }
};
