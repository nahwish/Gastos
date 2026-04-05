import { Platform, Share } from 'react-native';
import type { Expense } from '@/database/repositories/expenseRepository';

// ─── Tipos públicos ────────────────────────────────────────────────────────────
//
// ExportFormat es una unión de strings literal.
// Hoy solo existe 'csv', pero agregar 'excel' o 'pdf' en el futuro
// es tan simple como añadir | 'excel' | 'pdf' aquí y un nuevo case en el switch.

export type ExportFormat = 'csv'; // Fase 2: | 'excel'   Fase 3: | 'pdf'

export interface ExportFilter {
  type: 'all' | 'month';
  year?: number;
  month?: number;
}

export interface ExportOptions {
  format: ExportFormat;
  filter: ExportFilter;
  filename?: string; // Si no se provee, se genera automáticamente
}

// ─── CSV Builder ───────────────────────────────────────────────────────────────
//
// Implementa el estándar RFC 4180:
// - Celdas con comas, comillas o saltos de línea van entre comillas dobles.
// - Las comillas internas se escapan duplicándolas ("" dentro de "...").
// Esto permite que cualquier descripción con texto libre no rompa el archivo.

const escapeCSVCell = (value: string | number | undefined): string => {
  const str = String(value ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

const buildCSV = (expenses: Expense[]): string => {
  const headers = ['ID', 'Fecha', 'Descripción', 'Categoría', 'Monto'];

  const rows = expenses.map((e) => [
    escapeCSVCell(e.id),
    escapeCSVCell(e.date),
    escapeCSVCell(e.description),
    escapeCSVCell(e.category),
    escapeCSVCell(e.amount),
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
};

// ─── Mecanismo de entrega por plataforma ──────────────────────────────────────
//
// Web: crea un Blob (archivo en memoria), genera una URL temporal y simula
//      un click en un link invisible para disparar la descarga del navegador.
//      El BOM (U+FEFF) al inicio del archivo hace que Excel lo abra con
//      UTF-8 correctamente (sin esto, los caracteres como ñ, á, ü se rompen).
//
// Mobile: usa la API nativa Share de React Native, que abre el selector de
//         apps del sistema (WhatsApp, Mail, Google Drive, Archivos, etc.).
//         No requiere ninguna dependencia adicional.

const downloadOnWeb = (content: string, filename: string, mimeType: string): void => {
  const BOM = '\uFEFF'; // Necesario para que Excel interprete UTF-8 correctamente
  const blob = new Blob([BOM + content], { type: `${mimeType};charset=utf-8;` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const shareOnMobile = async (content: string, filename: string): Promise<void> => {
  await Share.share({
    message: content,
    title: filename,
  });
};

// ─── API pública ──────────────────────────────────────────────────────────────
//
// Esta es la única función que el resto de la app necesita conocer.
// Toda la lógica de formato y entrega está encapsulada aquí adentro.
//
// Para agregar Excel en el futuro:
//   1. Instalar: npm install xlsx
//   2. Crear buildExcel(expenses): Buffer
//   3. Agregar case 'excel' en el switch de abajo
//   4. En downloadOnWeb: usar writeFile de xlsx + pasar el buffer como Blob
//   5. El resto de la app no cambia nada

export const exportExpenses = async (
  expenses: Expense[],
  options: ExportOptions,
): Promise<void> => {
  const { format, filter, filename } = options;

  // 1. Aplicar filtro
  let filtered = [...expenses];

  if (filter.type === 'month' && filter.year != null && filter.month != null) {
    const prefix = `${filter.year}-${String(filter.month).padStart(2, '0')}`;
    filtered = expenses.filter((e) => e.date.startsWith(prefix));
  }

  if (filtered.length === 0) {
    throw new Error('No hay gastos para exportar con el filtro seleccionado');
  }

  // 2. Generar contenido según formato
  let content: string;
  let mimeType: string;
  let ext: string;

  switch (format) {
    case 'csv':
    default:
      content = buildCSV(filtered);
      mimeType = 'text/csv';
      ext = 'csv';
      break;
    // Fase 2: case 'excel': { content = buildExcel(filtered); mimeType = '...'; ext = 'xlsx'; break; }
    // Fase 3: case 'pdf':   { content = buildPDF(filtered);   mimeType = '...'; ext = 'pdf';  break; }
  }

  // 3. Construir nombre de archivo si no fue provisto
  const today = new Date().toISOString().split('T')[0];
  const suffix =
    filter.type === 'month'
      ? `${filter.year}_${String(filter.month).padStart(2, '0')}`
      : 'completo';
  const finalFilename = filename ?? `gastos_${suffix}_${today}.${ext}`;

  // 4. Entregar según plataforma
  if (Platform.OS === 'web') {
    downloadOnWeb(content, finalFilename, mimeType);
  } else {
    await shareOnMobile(content, finalFilename);
  }
};
