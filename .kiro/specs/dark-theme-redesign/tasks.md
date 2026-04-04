# Plan de Implementación: Dark Theme Redesign

## Overview

Migración visual de "Gastos App" a un tema oscuro tipo dashboard financiero, estructurada en dos fases. La Fase 1 cubre la migración visual completa y las migraciones de base de datos. La Fase 2 incorpora los nuevos conceptos de datos (sueldo, reintegros, tipo de gasto, objetivo de ahorro).

---

## Tareas

### FASE 1 — Visual + Migración

- [x] 1. Crear sistema de tema oscuro global
  - [x] 1.1 Crear `theme/darkTheme.ts` con el objeto `DarkTheme`
    - Definir todos los tokens de color: `bgPrimary: '#0F172A'`, `bgCard: '#1E293B'`, `bgCardSecondary: '#0F172A'`, `textPrimary: '#F8FAFC'`, `textSecondary: '#94A3B8'`, `accentGreen: '#10B981'`, `accentYellow: '#F59E0B'`, `border: '#334155'`, `errorText: '#FCA5A5'`, `deleteButtonBg: '#7F1D1D'`
    - Definir gradientes: `disponibleReal: ['#7C3AED', '#EC4899']`, `conGastosFuturos: ['#1D4ED8', '#06B6D4']`
    - Definir `fontWeights`: `regular: '400'`, `semibold: '600'`, `bold: '700'`
    - Exportar tipo `DarkThemeType`
    - _Requirements: 1.1, 1.5_

  - [ ]* 1.2 Escribir unit test para `DarkTheme`
    - Verificar que el objeto contiene todos los tokens de color requeridos con sus valores exactos
    - _Requirements: 1.1_

- [x] 2. Instalar dependencia y crear componentes visuales
  - [x] 2.1 Instalar `expo-linear-gradient`
    - Ejecutar `npx expo install expo-linear-gradient` (el usuario debe correr este comando manualmente)
    - Crear `components/GradientCard.tsx` con la interfaz `GradientCardProps` definida en el diseño
    - Renderizar `LinearGradient` con `borderRadius: 20`, `padding: 20`
    - Mostrar `label` arriba y `amount` grande abajo con `toLocaleString('es-AR')` y prefijo `$`
    - Aplicar color `#FCA5A5` al monto cuando `isNegative === true`, blanco en caso contrario
    - Mostrar `subtitle` en blanco semitransparente si se provee
    - _Requirements: 3.1, 3.2, 3.3, 3.6, 3.7_

  - [ ]* 2.2 Escribir property test para `GradientCard` — Property 1 y Property 2
    - **Property 1: Formato de moneda es-AR** — `formatCurrency(amount)` retorna string que comienza con `$` para cualquier número
    - **Property 2: Color de monto negativo** — `getAmountColor(amount)` retorna `#FCA5A5` para cualquier valor negativo y `#FFFFFF` para no negativos
    - **Validates: Requirements 3.5, 3.6, 3.7**

  - [x] 2.3 Crear `components/SummaryCard.tsx`
    - Implementar interfaz `SummaryCardProps`: `label`, `amount`, `percentage?`, `percentageLabel?`, `accentColor?`, `placeholder?`, `style?`
    - Fondo `#1E293B`, label pequeño arriba, monto grande en centro, porcentaje en texto secundario abajo
    - Mostrar `placeholder` en lugar del monto cuando se provee
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 5.4_

  - [x] 2.4 Crear `components/ProgressBar.tsx`
    - Implementar interfaz `ProgressBarProps`: `progress` (0.0–1.0), `fillColor?` (default `#F59E0B`), `backgroundColor?` (default `#334155`), `height?` (default 8), `style?`
    - Implementar con `View` anidados: contenedor con `backgroundColor` y `borderRadius`, hijo con `width: \`${progress * 100}%\``
    - _Requirements: 6.1, 6.2, 6.3_

  - [ ]* 2.5 Escribir property test para `ProgressBar` — Property 4
    - **Property 4: Invariante de rango del progreso de ahorro** — `calculateSavingsProgress(disponibleReal, savingsGoal)` siempre retorna valor en `[0.0, 1.0]` para cualquier `disponibleReal` y `savingsGoal > 0`
    - **Validates: Requirements 6.2, 6.6**

- [x] 3. Implementar servicio de migraciones de base de datos
  - [x] 3.1 Crear `database/migrationService.ts`
    - Definir interfaz `Migration { id: string; up: (db: any) => Promise<void> }`
    - Crear tabla de control `_migrations (id TEXT PRIMARY KEY, applied_at TEXT)` si no existe
    - Implementar migración `001_add_expense_type`: `ALTER TABLE expenses ADD COLUMN IF NOT EXISTS expense_type TEXT DEFAULT 'individual'`
    - Implementar migración `002_create_monthly_config`: crear tabla `monthly_config` con columnas `id`, `user_id`, `year`, `month`, `salary`, `savings_goal`, `created_at` y constraint `UNIQUE(user_id, year, month)`
    - Implementar migración `003_create_reimbursements`: crear tabla `reimbursements` con columnas `id`, `user_id`, `amount`, `description`, `date`, `created_at`
    - Exportar función `runMigrations(db)`: para cada migración, verificar en `_migrations` si ya fue aplicada; si no, ejecutar y registrar; si ya fue aplicada, omitir sin error
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

  - [ ]* 3.2 Escribir property test para `migrationService` — Property 6 y Property 7
    - **Property 6: Preservación de datos en migración** — después de `runMigrations`, los campos `id`, `user_id`, `amount`, `description`, `category`, `date` de cada registro preexistente son idénticos
    - **Property 7: Idempotencia de migraciones** — ejecutar `runMigrations` dos veces produce el mismo esquema y datos que ejecutarlo una vez
    - **Validates: Requirements 9.4, 9.5, 9.6**

- [x] 4. Integrar migraciones en la inicialización de la base de datos
  - [x] 4.1 Actualizar `database/db.ts` para llamar `runMigrations` en `initDatabase`
    - Importar `runMigrations` desde `./migrationService`
    - Llamar `await runMigrations(db)` después de crear las tablas base (`users`, `expenses`, `categories`)
    - Mantener el manejo de errores existente: si `runMigrations` falla, loguear el error sin crashear la app
    - _Requirements: 9.4, 9.5_

- [x] 5. Checkpoint — Verificar migraciones y componentes base
  - Asegurar que todos los tests pasan, preguntar al usuario si hay dudas antes de continuar con el rediseño de pantallas.

- [x] 6. Rediseñar `screens/HomeScreen.tsx` con tema oscuro (Fase 1)
  - [x] 6.1 Aplicar fondo oscuro y rediseñar header
    - Cambiar `backgroundColor` del contenedor raíz a `#0F172A`
    - Reemplazar header actual por: título "Mis Finanzas" (fontSize 28, fontWeight '700', color `#F8FAFC`), mes/año en formato "Mes YYYY" con color `#94A3B8`, botón logout discreto con color `#94A3B8` (sin fondo rojo)
    - Mantener diálogo de confirmación de logout con fondo `#1E293B` y texto claro
    - _Requirements: 1.2, 2.1, 2.2, 2.3, 2.4_

  - [x] 6.2 Agregar fila de GradientCards
    - Renderizar dos `GradientCard` en `flexDirection: 'row'` con `gap: 12`, cada una con `flex: 1`
    - GradientCard izquierda: gradiente `['#7C3AED', '#EC4899']`, label "Disponible Real", amount = `0 - monthlyTotal` (placeholder Fase 1), subtitle "Configurar sueldo" (placeholder Fase 1), `isNegative` cuando el valor sea negativo
    - GradientCard derecha: gradiente `['#1D4ED8', '#06B6D4']`, label "Con Gastos Futuros", amount = mismo valor que izquierda (placeholder `0` para gastos futuros en Fase 1)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

  - [x] 6.3 Agregar sección "Gastos del Mes" con SummaryCards
    - Título "Gastos del Mes" con color `#F8FAFC`
    - Tres `SummaryCard` en fila: "Compartido" con `placeholder="(próximamente)"` y amount `0`, "Individual" con `placeholder="(próximamente)"` y amount `0`, "Total" con el total mensual real
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x] 6.4 Agregar secciones "Reintegros" y "Objetivo de Ahorro"
    - Sección "Reintegros": `SummaryCard` con amount `0`, subtitle "Próximamente", accentColor `#10B981`
    - Sección "Objetivo de Ahorro": mostrar texto "Configurar objetivo" (placeholder Fase 1) en lugar de `ProgressBar`
    - _Requirements: 5.1, 5.2, 5.4, 6.1, 6.4_

  - [x] 6.5 Agregar sección "Sueldo del mes" y adaptar sección de categorías
    - Sección "Sueldo del mes": mostrar botón "Configurar sueldo" (placeholder Fase 1)
    - Adaptar lista de categorías existente al tema oscuro: fondo de tarjeta `#1E293B`, textos con colores del `DarkTheme`, bordes `#334155`
    - Mantener FAB verde y `AddExpenseModal` sin cambios funcionales
    - _Requirements: 1.2, 7.1, 7.2, 10.1, 10.2, 10.5_

  - [ ]* 6.6 Escribir property test para `HomeScreen` — Property 9
    - **Property 9: Formato de fecha de header** — `formatMonthYear(date)` retorna string con formato "Mes YYYY" en español (primera letra mayúscula) para cualquier `Date` válida
    - **Validates: Requirements 2.2**

- [x] 7. Rediseñar `screens/ExpensesListScreen.tsx` con tema oscuro
  - [x] 7.1 Aplicar tema oscuro a contenedor y tarjetas de gasto
    - Cambiar `backgroundColor` del contenedor raíz a `#0F172A`
    - Cambiar `backgroundColor` de cada tarjeta de gasto a `#1E293B`
    - Aplicar color `#F8FAFC` a textos de descripción, categoría y monto
    - Aplicar color `#94A3B8` a la fecha del gasto
    - _Requirements: 1.3, 8.1, 8.2, 8.3_

  - [x] 7.2 Aplicar tema oscuro a botón eliminar y modales
    - Cambiar botón "Eliminar" a `backgroundColor: '#7F1D1D'`, texto `#FCA5A5`
    - Cambiar modales de confirmación y exportación a `backgroundColor: '#1E293B'`, `borderColor: '#334155'`, textos con colores del `DarkTheme`
    - Mantener toda la funcionalidad de exportación CSV y eliminación con confirmación sin cambios
    - _Requirements: 8.4, 8.5, 10.3, 10.4, 10.6_

- [x] 8. Checkpoint — Verificar Fase 1 completa
  - Asegurar que todos los tests pasan y que la navegación entre HomeScreen y ExpensesListScreen mantiene el fondo `#0F172A` sin parpadeo. Preguntar al usuario si hay dudas antes de continuar con Fase 2.

---

### FASE 2 — Nuevos datos

- [x] 9. Crear capa de tipos e interfaces TypeScript
  - [x] 9.1 Crear `database/types.ts` con interfaces de Fase 2
    - Definir `MonthlyConfig { id?, user_id, year, month, salary: number | null, savings_goal: number | null }`
    - Definir `Reimbursement { id?, user_id, amount, description, date }`
    - Definir `DerivedFinancials { disponibleReal, conGastosFuturos, savingsProgress, totalWithReimbursements }`
    - Exportar funciones puras de cálculo: `calculateSavingsProgress(disponibleReal, savingsGoal)` con `min(disponibleReal / savingsGoal, 1.0)` y clamp a `[0, 1]`, `calculateTotalWithReimbursements(disponibleReal, reimbursementsTotal)`, `formatCurrency(amount)`, `formatMonthYear(date)`
    - _Requirements: 6.2, 6.6, 5.3, 3.6, 2.2_

  - [ ]* 9.2 Escribir property tests para funciones puras de `types.ts` — Property 10
    - **Property 10: Suma de reintegros al disponible real** — `calculateTotalWithReimbursements(disponibleReal, reimbursementsTotal)` retorna exactamente `disponibleReal + reimbursementsTotal` para cualquier par de valores
    - **Validates: Requirements 5.3**

- [x] 10. Crear `database/monthlyConfigService.ts`
  - [x] 10.1 Implementar `getMonthlyConfig(userId, year, month): Promise<MonthlyConfig | null>`
    - Query: `SELECT * FROM monthly_config WHERE user_id = ? AND year = ? AND month = ?`
    - Retornar `null` si no existe registro
    - _Requirements: 7.1, 7.2, 7.3_

  - [x] 10.2 Implementar `saveMonthlyConfig(config: MonthlyConfig): Promise<void>`
    - Query: `INSERT OR REPLACE INTO monthly_config (user_id, year, month, salary, savings_goal) VALUES (?, ?, ?, ?, ?)`
    - _Requirements: 7.4_

  - [ ]* 10.3 Escribir property test para `monthlyConfigService` — Property 5
    - **Property 5: Round-trip de persistencia de sueldo** — guardar un sueldo con `saveMonthlyConfig` y leerlo con `getMonthlyConfig` retorna el mismo valor para cualquier número positivo
    - **Validates: Requirements 7.4**

- [x] 11. Crear `database/reimbursementService.ts`
  - [x] 11.1 Implementar `getMonthlyReimbursements(userId, year, month): Promise<number>`
    - Query: `SELECT SUM(amount) as total FROM reimbursements WHERE user_id = ? AND date BETWEEN ? AND ?`
    - Retornar `0` si no hay registros
    - _Requirements: 5.1, 5.3_

- [x] 12. Actualizar `database/expenseService.ts` con nuevas funciones
  - [x] 12.1 Agregar `getTotalByExpenseType(year, month): Promise<{shared: number, individual: number}>`
    - Query: `SELECT expense_type, SUM(amount) as total FROM expenses WHERE user_id = ? AND date BETWEEN ? AND ? GROUP BY expense_type`
    - Usar `COALESCE(expense_type, 'individual')` para compatibilidad con registros previos a la migración
    - Retornar `{ shared: 0, individual: monthlyTotal }` si la columna no existe aún
    - _Requirements: 4.2, 4.3, 4.6_

  - [x] 12.2 Agregar `getFutureExpenses(year, month): Promise<number>`
    - Query: `SELECT SUM(amount) as total FROM expenses WHERE user_id = ? AND date > ? AND date BETWEEN ? AND ?` (fecha > hoy, dentro del mes)
    - Retornar `0` si no hay gastos futuros
    - _Requirements: 3.3_

  - [ ]* 12.3 Escribir property test para `expenseService` — Property 3 y Property 8
    - **Property 3: Invariante de completitud de tipos de gasto** — `shared + individual` de `getTotalByExpenseType` es igual al total mensual para cualquier conjunto de gastos
    - **Property 8: Actualización del total mensual al agregar gasto** — después de `addExpense(amount)`, `getMonthlyTotal` retorna el valor anterior más `amount`
    - **Validates: Requirements 4.2, 4.3, 4.6, 10.5**

- [x] 13. Checkpoint — Verificar servicios de Fase 2
  - Asegurar que todos los tests de servicios pasan antes de conectar datos en la pantalla. Preguntar al usuario si hay dudas.

- [x] 14. Conectar datos reales en `HomeScreen` (reemplazar placeholders de Fase 1)
  - [x] 14.1 Cargar `MonthlyConfig` y calcular `DerivedFinancials`
    - En `loadData`, llamar `getMonthlyConfig(userId, year, month)` y `getMonthlyReimbursements(userId, year, month)`
    - Calcular `disponibleReal = (salary ?? 0) - monthlyTotal`
    - Calcular `conGastosFuturos = disponibleReal - futureExpenses`
    - Calcular `savingsProgress = calculateSavingsProgress(disponibleReal, savingsGoal)`
    - Calcular `totalWithReimbursements = calculateTotalWithReimbursements(disponibleReal, reimbursementsTotal)`
    - _Requirements: 3.2, 3.3, 3.4, 3.5, 6.2, 7.1_

  - [x] 14.2 Conectar GradientCards con datos reales
    - GradientCard izquierda: amount = `disponibleReal`, subtitle = sueldo configurado o "Configurar sueldo", `isNegative` cuando `disponibleReal < 0`
    - GradientCard derecha: amount = `conGastosFuturos`
    - _Requirements: 3.2, 3.3, 3.4, 3.5, 3.7_

  - [x] 14.3 Conectar SummaryCards con datos reales
    - Llamar `getTotalByExpenseType(year, month)` en `loadData`
    - SummaryCard "Compartido": amount = `shared`, percentage = `(shared / monthlyTotal) * 100`
    - SummaryCard "Individual": amount = `individual`, percentage = `(individual / monthlyTotal) * 100`
    - SummaryCard "Total": amount = `monthlyTotal`, percentage = sueldo configurado ? `(monthlyTotal / salary) * 100` : undefined
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x] 14.4 Conectar sección "Reintegros" y "Objetivo de Ahorro" con datos reales
    - Sección "Reintegros": amount = `reimbursementsTotal`, mostrar `totalWithReimbursements` como subtítulo
    - Sección "Objetivo de Ahorro": si `savingsGoal` está configurado, renderizar `ProgressBar` con `progress = savingsProgress`; si `savingsProgress >= 1.0`, mostrar "¡Objetivo alcanzado!"; si no está configurado, mostrar botón "Configurar objetivo"
    - _Requirements: 5.1, 5.3, 6.1, 6.2, 6.3, 6.4, 6.5_

  - [x] 14.5 Conectar sección "Sueldo del mes" con datos reales
    - Si sueldo configurado: mostrar monto de sueldo y `totalWithReimbursements`
    - Si no configurado: mostrar botón "Configurar sueldo" que abre modal de configuración
    - Al volver al foco de la pantalla, recalcular todos los valores derivados
    - _Requirements: 7.1, 7.2, 7.3_

- [x] 15. Agregar modal de configuración de sueldo y objetivo de ahorro
  - [x] 15.1 Crear `components/SalaryConfigModal.tsx`
    - Modal con fondo `#1E293B`, campos de entrada para "Sueldo mensual" y "Objetivo de ahorro"
    - Validar que los valores sean números positivos
    - Al guardar, llamar `saveMonthlyConfig` y cerrar el modal
    - _Requirements: 7.2, 7.3, 7.4_

  - [x] 15.2 Integrar `SalaryConfigModal` en `HomeScreen`
    - Abrir el modal al presionar "Configurar sueldo" o "Configurar objetivo"
    - Al cerrar con guardado exitoso, llamar `loadData` para recalcular y actualizar todos los valores en pantalla
    - _Requirements: 7.2, 7.3_

- [x] 16. Checkpoint final — Verificar Fase 2 completa
  - Asegurar que todos los tests pasan y que el flujo completo funciona: configurar sueldo → ver disponible real → agregar gasto → ver actualización del total. Preguntar al usuario si hay dudas.

---

## Notas

- Las tareas marcadas con `*` son opcionales y pueden omitirse para un MVP más rápido
- Cada tarea referencia los requisitos específicos para trazabilidad
- Los checkpoints garantizan validación incremental entre fases
- Los property tests usan `fast-check` (instalar con `npm install --save-dev fast-check`)
- Los tests de integración de migraciones requieren una instancia de SQLite en memoria para el entorno de test
