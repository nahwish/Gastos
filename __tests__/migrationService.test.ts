import { runMigrations } from '@/database/migrations/migrationService';

describe('migrationService', () => {
  let mockDb: {
    execAsync: jest.Mock;
    getFirstAsync: jest.Mock;
    runAsync: jest.Mock;
  };

  beforeEach(() => {
    mockDb = {
      execAsync: jest.fn().mockResolvedValue(undefined),
      getFirstAsync: jest.fn().mockResolvedValue(null),
      runAsync: jest.fn().mockResolvedValue({ lastInsertRowId: 1, changes: 1 }),
    };
  });

  it('debería crear la tabla _migrations si no existe', async () => {
    await runMigrations(mockDb);

    expect(mockDb.execAsync).toHaveBeenCalledWith(
      expect.stringContaining('CREATE TABLE IF NOT EXISTS _migrations'),
    );
  });

  it('debería ejecutar todas las migraciones pendientes', async () => {
    // Ninguna migración aplicada aún
    mockDb.getFirstAsync.mockResolvedValue(null);

    await runMigrations(mockDb);

    // Debe haber registrado cada migración
    expect(mockDb.runAsync).toHaveBeenCalledWith(
      'INSERT INTO _migrations (id, applied_at) VALUES (?, ?)',
      expect.arrayContaining(['001_add_expense_type', expect.any(String)]),
    );
    expect(mockDb.runAsync).toHaveBeenCalledWith(
      'INSERT INTO _migrations (id, applied_at) VALUES (?, ?)',
      expect.arrayContaining(['002_create_monthly_config', expect.any(String)]),
    );
    expect(mockDb.runAsync).toHaveBeenCalledWith(
      'INSERT INTO _migrations (id, applied_at) VALUES (?, ?)',
      expect.arrayContaining(['003_create_reimbursements', expect.any(String)]),
    );
    expect(mockDb.runAsync).toHaveBeenCalledWith(
      'INSERT INTO _migrations (id, applied_at) VALUES (?, ?)',
      expect.arrayContaining(['004_add_discount_fields', expect.any(String)]),
    );
    expect(mockDb.runAsync).toHaveBeenCalledWith(
      'INSERT INTO _migrations (id, applied_at) VALUES (?, ?)',
      expect.arrayContaining(['005_custom_categories', expect.any(String)]),
    );
  });

  it('debería omitir migraciones ya aplicadas', async () => {
    // Simular que la primera migración ya fue aplicada
    mockDb.getFirstAsync.mockImplementation((_sql: string, params: any[]) => {
      if (params[0] === '001_add_expense_type') {
        return Promise.resolve({ id: '001_add_expense_type' });
      }
      return Promise.resolve(null);
    });

    await runMigrations(mockDb);

    // La migración 001 no debe registrarse de nuevo
    const insertCalls = (mockDb.runAsync as jest.Mock).mock.calls.filter((call) =>
      call[0].includes('INSERT INTO _migrations'),
    );
    const appliedIds = insertCalls.map((call) => call[1][0]);
    expect(appliedIds).not.toContain('001_add_expense_type');
    expect(appliedIds).toContain('002_create_monthly_config');
  });

  it('debería ser idempotente: ejecutarla dos veces no duplica migraciones', async () => {
    const applied = new Set<string>();

    mockDb.getFirstAsync.mockImplementation((_sql: string, params: any[]) => {
      if (applied.has(params[0])) {
        return Promise.resolve({ id: params[0] });
      }
      return Promise.resolve(null);
    });

    mockDb.runAsync.mockImplementation((_sql: string, params: any[]) => {
      if (_sql.includes('INSERT INTO _migrations')) {
        applied.add(params[0]);
      }
      return Promise.resolve({ lastInsertRowId: 1, changes: 1 });
    });

    await runMigrations(mockDb);
    const firstRunCount = applied.size;

    await runMigrations(mockDb);
    const secondRunCount = applied.size;

    expect(firstRunCount).toBe(secondRunCount);
  });

  it('debería ejecutar la migración 001 que agrega expense_type', async () => {
    mockDb.getFirstAsync.mockResolvedValue(null);

    await runMigrations(mockDb);

    expect(mockDb.execAsync).toHaveBeenCalledWith(
      expect.stringContaining('expense_type'),
    );
  });

  it('debería ejecutar la migración 002 que crea monthly_config', async () => {
    mockDb.getFirstAsync.mockResolvedValue(null);

    await runMigrations(mockDb);

    expect(mockDb.execAsync).toHaveBeenCalledWith(
      expect.stringContaining('monthly_config'),
    );
  });

  it('debería ejecutar la migración 003 que crea reimbursements', async () => {
    mockDb.getFirstAsync.mockResolvedValue(null);

    await runMigrations(mockDb);

    expect(mockDb.execAsync).toHaveBeenCalledWith(
      expect.stringContaining('reimbursements'),
    );
  });
});
