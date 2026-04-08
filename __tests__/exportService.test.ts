import { exportExpenses } from '@/features/expenses/services/exportService';
import type { ExportOptions } from '@/features/expenses/services/exportService';
import type { Expense } from '@/database/repositories/expenseRepository';

// ─── DOM global mocks for node environment ────────────────────────────────────

const mockClick = jest.fn();
const mockAppendChild = jest.fn();
const mockRemoveChild = jest.fn();
const mockCreateObjectURL = jest.fn(() => 'blob:mock-url');
const mockRevokeObjectURL = jest.fn();

let capturedBlobParts: any[] = [];

beforeAll(() => {
  // Mock Blob
  (global as any).Blob = jest.fn().mockImplementation((parts: any[], _options: any) => {
    capturedBlobParts = parts;
    return { size: 100, type: 'text/csv' };
  });

  // Mock URL
  (global as any).URL = {
    createObjectURL: mockCreateObjectURL,
    revokeObjectURL: mockRevokeObjectURL,
  };

  // Mock document
  const mockAnchor = {
    href: '',
    download: '',
    click: mockClick,
  };
  (global as any).document = {
    createElement: jest.fn(() => mockAnchor),
    body: {
      appendChild: mockAppendChild,
      removeChild: mockRemoveChild,
    },
  };
});

beforeEach(() => {
  jest.clearAllMocks();
  capturedBlobParts = [];
});

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockExpenses: Expense[] = [
  {
    id: 1,
    user_id: 1,
    amount: 100,
    description: 'Almuerzo',
    category: 'Alimentación',
    date: '2024-01-15',
  },
  {
    id: 2,
    user_id: 1,
    amount: 50,
    description: 'Colectivo',
    category: 'Transporte',
    date: '2024-01-20',
  },
  {
    id: 3,
    user_id: 1,
    amount: 200,
    description: 'Cena, especial',
    category: 'Entretenimiento',
    date: '2024-02-10',
  },
];

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('exportExpenses', () => {
  describe('filtro "all"', () => {
    it('debería exportar todos los gastos sin filtro', async () => {
      const options: ExportOptions = {
        format: 'csv',
        filter: { type: 'all' },
      };

      await exportExpenses(mockExpenses, options);

      expect(mockCreateObjectURL).toHaveBeenCalled();
      expect(mockClick).toHaveBeenCalled();
      expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
    });

    it('debería incluir todos los gastos en el CSV', async () => {
      const options: ExportOptions = {
        format: 'csv',
        filter: { type: 'all' },
      };

      await exportExpenses(mockExpenses, options);

      const content = capturedBlobParts.join('');
      expect(content).toContain('Almuerzo');
      expect(content).toContain('Colectivo');
      expect(content).toContain('"Cena, especial"'); // description with comma gets escaped
    });

    it('debería incluir los encabezados correctos en el CSV', async () => {
      const options: ExportOptions = {
        format: 'csv',
        filter: { type: 'all' },
      };

      await exportExpenses(mockExpenses, options);

      const content = capturedBlobParts.join('');
      // Remove BOM if present before checking header
      const withoutBOM = content.startsWith('\uFEFF') ? content.slice(1) : content;
      const firstLine = withoutBOM.split('\n')[0];
      expect(firstLine).toBe('ID,Fecha,Descripción,Categoría,Monto');
    });

    it('el nombre de archivo generado debe contener "completo"', async () => {
      let downloadAttr = '';
      const mockAnchor = {
        href: '',
        set download(v: string) {
          downloadAttr = v;
        },
        get download() {
          return downloadAttr;
        },
        click: mockClick,
      };
      (global as any).document.createElement = jest.fn(() => mockAnchor);

      const options: ExportOptions = {
        format: 'csv',
        filter: { type: 'all' },
      };

      await exportExpenses(mockExpenses, options);

      expect(downloadAttr).toMatch(/gastos_completo_\d{4}-\d{2}-\d{2}\.csv/);
    });
  });

  describe('filtro "month"', () => {
    it('debería filtrar solo los gastos del mes indicado', async () => {
      const options: ExportOptions = {
        format: 'csv',
        filter: { type: 'month', year: 2024, month: 1 },
      };

      await exportExpenses(mockExpenses, options);

      const content = capturedBlobParts.join('');
      expect(content).toContain('Almuerzo');
      expect(content).toContain('Colectivo');
      expect(content).not.toContain('Cena'); // February expense excluded
    });

    it('debería generar nombre de archivo con año y mes', async () => {
      let downloadAttr = '';
      const mockAnchor = {
        href: '',
        set download(v: string) {
          downloadAttr = v;
        },
        get download() {
          return downloadAttr;
        },
        click: mockClick,
      };
      (global as any).document.createElement = jest.fn(() => mockAnchor);

      const options: ExportOptions = {
        format: 'csv',
        filter: { type: 'month', year: 2024, month: 1 },
      };

      await exportExpenses(mockExpenses, options);

      expect(downloadAttr).toMatch(/gastos_2024_01_\d{4}-\d{2}-\d{2}\.csv/);
    });

    it('debería lanzar error si no hay gastos en el mes', async () => {
      const options: ExportOptions = {
        format: 'csv',
        filter: { type: 'month', year: 2024, month: 3 },
      };

      await expect(exportExpenses(mockExpenses, options)).rejects.toThrow(
        'No hay gastos para exportar con el filtro seleccionado',
      );
    });
  });

  describe('lista de gastos vacía', () => {
    it('debería lanzar error si la lista de gastos está vacía', async () => {
      const options: ExportOptions = {
        format: 'csv',
        filter: { type: 'all' },
      };

      await expect(exportExpenses([], options)).rejects.toThrow(
        'No hay gastos para exportar con el filtro seleccionado',
      );
    });
  });

  describe('nombre de archivo personalizado', () => {
    it('debería usar el nombre de archivo provisto', async () => {
      let downloadAttr = '';
      const mockAnchor = {
        href: '',
        set download(v: string) {
          downloadAttr = v;
        },
        get download() {
          return downloadAttr;
        },
        click: mockClick,
      };
      (global as any).document.createElement = jest.fn(() => mockAnchor);

      const options: ExportOptions = {
        format: 'csv',
        filter: { type: 'all' },
        filename: 'mi_reporte_personalizado.csv',
      };

      await exportExpenses(mockExpenses, options);

      expect(downloadAttr).toBe('mi_reporte_personalizado.csv');
    });
  });

  describe('CSV — RFC 4180 escaping', () => {
    it('debería escapar comas en la descripción', async () => {
      const options: ExportOptions = {
        format: 'csv',
        filter: { type: 'all' },
      };

      await exportExpenses(mockExpenses, options);

      const content = capturedBlobParts.join('');
      expect(content).toContain('"Cena, especial"');
    });

    it('debería escapar comillas dobles en la descripción', async () => {
      const expensesWithQuotes: Expense[] = [
        {
          id: 10,
          user_id: 1,
          amount: 300,
          description: 'Comida "especial"',
          category: 'Alimentación',
          date: '2024-01-10',
        },
      ];

      const options: ExportOptions = {
        format: 'csv',
        filter: { type: 'all' },
      };

      await exportExpenses(expensesWithQuotes, options);

      const content = capturedBlobParts.join('');
      expect(content).toContain('"Comida ""especial"""');
    });

    it('debería escapar saltos de línea en la descripción', async () => {
      const expensesWithNewline: Expense[] = [
        {
          id: 11,
          user_id: 1,
          amount: 100,
          description: 'Línea1\nLínea2',
          category: 'Otros',
          date: '2024-01-10',
        },
      ];

      const options: ExportOptions = {
        format: 'csv',
        filter: { type: 'all' },
      };

      await exportExpenses(expensesWithNewline, options);

      const content = capturedBlobParts.join('');
      expect(content).toContain('"Línea1\nLínea2"');
    });

    it('debería incluir el BOM UTF-8 al principio del archivo', async () => {
      const options: ExportOptions = {
        format: 'csv',
        filter: { type: 'all' },
      };

      await exportExpenses(mockExpenses, options);

      // The Blob constructor receives [BOM + content] as parts
      expect((global as any).Blob).toHaveBeenCalledWith(
        [expect.stringContaining('\uFEFF')],
        expect.objectContaining({ type: expect.stringContaining('text/csv') }),
      );
    });
  });

  describe('entrega en mobile (Share API)', () => {
    it('debería llamar a Share.share en plataforma android', async () => {
      const reactNative = require('react-native');
      reactNative.Platform.OS = 'android';

      const options: ExportOptions = {
        format: 'csv',
        filter: { type: 'all' },
      };

      await exportExpenses(mockExpenses, options);

      expect(reactNative.Share.share).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.any(String),
          title: expect.any(String),
        }),
      );

      // Restore
      reactNative.Platform.OS = 'web';
    });

    it('no debería llamar a document ni Blob en plataforma mobile', async () => {
      const reactNative = require('react-native');
      reactNative.Platform.OS = 'ios';

      (global as any).Blob.mockClear();

      const options: ExportOptions = {
        format: 'csv',
        filter: { type: 'all' },
      };

      await exportExpenses(mockExpenses, options);

      expect((global as any).Blob).not.toHaveBeenCalled();

      // Restore
      reactNative.Platform.OS = 'web';
    });
  });
});
