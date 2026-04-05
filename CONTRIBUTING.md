# Gastos App — Guía de Contribución y Arquitectura

> Documento de referencia para cualquier persona que trabaje en este proyecto.
> Aquí se definen las reglas, patrones, librerías aprobadas y decisiones arquitectónicas que rigen el desarrollo.

---

## Tabla de Contenidos

1. [Visión del Producto](#1-visión-del-producto)
2. [Stack Tecnológico](#2-stack-tecnológico)
3. [Estructura del Proyecto](#3-estructura-del-proyecto)
4. [Patrones de Diseño](#4-patrones-de-diseño)
5. [Manejo de Estado](#5-manejo-de-estado)
6. [Manejo de Datos y Persistencia](#6-manejo-de-datos-y-persistencia)
7. [Convenciones de Código](#7-convenciones-de-código)
8. [Imports y Path Aliases](#8-imports-y-path-aliases)
9. [Sistema de Theming](#9-sistema-de-theming)
10. [Testing](#10-testing)
11. [Tooling y Calidad](#11-tooling-y-calidad)
12. [Seguridad](#12-seguridad)
13. [Git y Workflow](#13-git-y-workflow)
14. [Librerías Aprobadas](#14-librerías-aprobadas)
15. [Roadmap Técnico](#15-roadmap-técnico)
16. [Decisiones Arquitectónicas (ADR)](#16-decisiones-arquitectónicas-adr)
17. [Checklist para Nuevas Features](#17-checklist-para-nuevas-features)

---

## 1. Visión del Producto

**Gastos App** es una aplicación móvil de finanzas personales diseñada para:

- Registrar gastos diarios organizados por categoría (comida, servicios, salidas, transporte, etc.).
- Visualizar un resumen mensual del estado financiero: sueldo, gastos, ahorro y disponible.
- Mantener un historial completo de todos los gastos de un individuo a lo largo del tiempo.
- Exportar datos a CSV para análisis externo.

### Visión a Futuro

La aplicación está diseñada para escalar hacia:

- **Gastos compartidos**: dos personas podrán vincularse para ver gastos en común (ej: pareja que vive junta).
- **Cruces de datos**: comparar los gastos individuales vs. compartidos dentro de un mismo hogar.
- **Categorización inteligente**: sugerencias automáticas de categoría basadas en la descripción.
- **Backend remoto**: migración gradual de SQLite local a una API REST con base de datos centralizada.
- **Notificaciones y alertas**: avisos cuando se supere un límite de gasto o se acerque al objetivo de ahorro.

> **Principio rector**: cada decisión técnica debe facilitar, no bloquear, la evolución del producto hacia estas metas.

---

## 2. Stack Tecnológico

| Capa | Tecnología | Versión | Rol |
|------|-----------|---------|-----|
| **Runtime** | React Native | 0.81.5 | Framework UI multiplataforma (iOS, Android, Web) |
| **Plataforma** | Expo | ~54.0.33 | Toolchain de build, dev server, OTA updates |
| **Lenguaje** | TypeScript | ~5.9.2 | Tipado estricto obligatorio (`strict: true`) |
| **Navegación** | React Navigation | ^7.x | Stack + Bottom Tabs |
| **DB Local** | expo-sqlite | ^16.0.10 | Persistencia SQL en dispositivo |
| **Storage KV** | AsyncStorage | ^1.23.1 | Sesiones + fallback web para SQLite |
| **Linting** | ESLint | ^8.57.1 | Análisis estático de código |
| **Formatting** | Prettier | ^3.8.1 | Formato automático consistente |
| **Git Hooks** | Husky + lint-staged | ^9.x / ^16.x | Calidad garantizada antes de cada commit |
| **Testing** | Jest | ^30.2.0 | Tests unitarios y de integración |
| **Build** | EAS Build | CLI ≥ 16.32 | Compilación nativa para distribución |

---

## 3. Estructura del Proyecto

```
src/
├── app/                         # Entry point y configuración global
│   └── App.tsx                  # Root component: providers + navigation
│
├── features/                    # Módulos de dominio (cada feature es autónoma)
│   ├── auth/
│   │   ├── screens/             # LoginScreen.tsx
│   │   └── services/            # AuthContext.tsx
│   ├── expenses/
│   │   ├── screens/             # HomeScreen, ExpensesListScreen, AddExpenseScreen
│   │   ├── components/          # AddExpenseModal
│   │   └── services/            # exportService.ts
│   └── config/
│       └── components/          # SalaryConfigModal
│
├── shared/                      # Código reutilizable entre features
│   ├── components/              # GradientCard, ProgressBar, SummaryCard
│   ├── theme/                   # darkTheme.ts (design tokens)
│   └── types/                   # database.ts (interfaces globales)
│
└── database/                    # Capa de persistencia
    ├── client.ts                # Conexión SQLite + polyfill web (AsyncStorage)
    ├── migrations/              # Migraciones de esquema (idempotentes)
    │   └── migrationService.ts
    └── repositories/            # Patrón Repository (queries SQL aisladas)
        ├── userRepository.ts
        ├── expenseRepository.ts
        ├── configRepository.ts
        └── reimbursementRepository.ts
```

### Reglas de Estructura

| Regla | Detalle |
|-------|---------|
| **Feature = carpeta autónoma** | Cada feature contiene sus propios `screens/`, `components/`, `services/`, `hooks/` y `types.ts`. |
| **Shared = usado por 2+ features** | Un componente o utilidad solo va a `shared/` si lo necesitan al menos dos features distintas. |
| **No hay archivos sueltos en `src/`** | Todo archivo pertenece a una carpeta con propósito claro. |
| **Un componente por archivo** | Cada `.tsx` exporta un solo componente React. |
| **Repositories = solo SQL** | Los archivos en `repositories/` solo ejecutan queries. La lógica de negocio va en services o hooks de la feature. |

---

## 4. Patrones de Diseño

### 4.1 Repository Pattern (datos)

Toda interacción con la base de datos pasa por un **repository**. Las pantallas y hooks nunca escriben SQL directamente.

```
Screen → Hook (futuro) → Repository → SQLite
```

**Ubicación**: `src/database/repositories/`

**Beneficio**: cuando migremos a una API remota, solo se reemplaza el repository sin tocar la UI.

### 4.2 Feature Modules (estructura)

El código se agrupa por **funcionalidad de negocio**, no por tipo técnico. Un módulo `expenses/` contiene todo lo que necesita esa funcionalidad: pantallas, componentes privados, servicios y tipos.

```
✅ src/features/expenses/screens/HomeScreen.tsx
✅ src/features/expenses/components/AddExpenseModal.tsx

❌ src/screens/HomeScreen.tsx        (agrupado por tipo técnico)
❌ src/components/AddExpenseModal.tsx (no indica a qué feature pertenece)
```

### 4.3 Provider Pattern (estado global)

El estado global se gestiona con React Context + Provider. Cada contexto vive dentro de la feature que lo define.

```
✅ src/features/auth/services/AuthContext.tsx   (auth es dueño de su estado)
❌ src/contexts/AuthContext.tsx                  (carpeta genérica sin dueño)
```

### 4.4 Data Hooks (próximamente)

Toda lógica asíncrona de carga de datos se extraerá a hooks custom:

```typescript
// Patrón objetivo:
const { expenses, isLoading, error, refetch } = useExpenses(month, year);
```

**Regla**: los screens solo renderizan. Los hooks manejan la lógica de datos.

---

## 5. Manejo de Estado

### Estado actual

| Tipo | Herramienta | Uso |
|------|------------|-----|
| **Estado local** | `useState` | Formularios, toggles, UI efímera |
| **Estado global** | React Context (`AuthContext`) | Sesión del usuario autenticado |
| **Estado persistente** | expo-sqlite + AsyncStorage | Gastos, config mensual, usuarios |

### Reglas

1. **Empezar con estado local** (`useState`). Solo escalar a Context si el estado se necesita en screens que no son padre-hijo directo.
2. **No instalar Zustand/Redux** hasta que haya más de 3 contextos concurrentes. Context API es suficiente para el scope actual.
3. **Derivar, no duplicar**: si un valor se puede calcular a partir de otros (ej: `disponibleReal = salary - totalExpenses`), se calcula con una función pura. No se almacena como estado separado.
4. **Funciones puras de cálculo** van en `shared/types/` o en la feature correspondiente, no en componentes.

### Escenario futuro: gastos compartidos

Cuando se implemente la funcionalidad de gastos compartidos, se evaluará:
- Un nuevo Context (`SharedExpensesContext`) dentro de `features/shared-expenses/`.
- Si la complejidad crece, migrar a **Zustand** (librería ligera, sin boilerplate).

---

## 6. Manejo de Datos y Persistencia

### Base de datos local

- **Mobile (Android/iOS)**: `expo-sqlite` — base de datos SQLite embebida en el dispositivo.
- **Web**: polyfill con `AsyncStorage` que simula la API de SQLite usando JSON en localStorage.

### Tablas actuales

| Tabla | Propósito |
|-------|----------|
| `users` | Registro de usuarios locales (id, username, email, password hash) |
| `expenses` | Gastos individuales (amount, description, category, date, expense_type) |
| `categories` | Categorías predefinidas con icono y color |
| `monthly_config` | Sueldo y objetivo de ahorro por mes/usuario |
| `reimbursements` | Reintegros recibidos por el usuario |
| `_migrations` | Control de migraciones aplicadas |

### Migraciones

- El sistema de migraciones es **idempotente**: cada migración verifica si ya fue aplicada antes de ejecutarse.
- Las migraciones son **solo hacia adelante** (no hay rollback).
- Cada migración se registra en la tabla `_migrations` con un ID único y timestamp.
- **Nunca borrar columnas ni tablas existentes** sin una migración de datos previa.

### Queries parametrizadas

**Obligatorio**: toda query que reciba datos del usuario debe usar parámetros (`?`) para prevenir SQL injection.

```typescript
// ✅ Correcto
db.runAsync('INSERT INTO expenses (amount, description) VALUES (?, ?)', [amount, description]);

// ❌ Incorrecto — vulnerable a SQL injection
db.runAsync(`INSERT INTO expenses (amount, description) VALUES (${amount}, '${description}')`);
```

### Preparación para backend

La arquitectura Repository está diseñada para que la fuente de datos sea intercambiable:

```
Hoy:     Screen → Repository → SQLite local
Futuro:  Screen → Repository → API REST → PostgreSQL remoto
```

Cuando llegue el momento, solo se reemplaza la implementación interna del repository sin tocar screens ni hooks.

---

## 7. Convenciones de Código

### Naming

| Elemento | Convención | Ejemplo |
|----------|-----------|---------|
| Archivos de componente | PascalCase | `GradientCard.tsx` |
| Archivos de servicio/util | camelCase | `exportService.ts` |
| Archivos de tipos | camelCase | `types.ts`, `database.ts` |
| Componentes React | PascalCase | `export default function HomeScreen()` |
| Funciones y variables | camelCase | `getMonthlyTotal()`, `isLoading` |
| Constantes globales | UPPER_SNAKE_CASE | `MAX_EXPENSE_AMOUNT` |
| Interfaces y Types | PascalCase | `Expense`, `MonthlyConfig` |
| Custom Hooks | `use` + PascalCase | `useExpenses`, `useAuth` |
| Enums | PascalCase | `ExpenseType.Shared` |

### Idioma

| Contexto | Idioma | Ejemplo |
|----------|--------|---------|
| Variables, funciones, tipos, commits | **Inglés** | `getMonthlyTotal()`, `isLoading` |
| Textos visibles en la UI | **Español** | `"Agregar gasto"`, `"Inicio"` |
| Comentarios de código | **Español** (aceptable en inglés) | `// Valida que el usuario esté logueado` |
| Nombres de tablas y columnas SQL | **Inglés** | `expenses`, `created_at` |

### TypeScript

1. **`strict: true`** siempre habilitado. No desactivar ninguna regla strict.
2. **Prohibido `any`**. Usar `unknown` + type guards cuando el tipo no es conocido.
3. **Preferir `type` sobre `interface`** para tipos simples. Usar `interface` cuando se necesite extensión.
4. **Usar `type imports`** cuando solo se importa un tipo: `import type { Expense } from '...'`.

```typescript
// ✅ Correcto
function processData(input: unknown): string {
  if (typeof input === 'string') return input;
  throw new Error('Expected string');
}

// ❌ Incorrecto
function processData(input: any): string {
  return input;
}
```

---

## 8. Imports y Path Aliases

### Alias configurado

```
@/ → ./src/
```

**Obligatorio**: usar `@/` para todos los imports dentro de `src/`. No usar rutas relativas como `../../shared/`.

```typescript
// ✅ Correcto
import { DarkTheme } from '@/shared/theme/darkTheme';
import { useAuth } from '@/features/auth/services/AuthContext';

// ❌ Incorrecto
import { DarkTheme } from '../../shared/theme/darkTheme';
```

### Orden de imports (enforced por ESLint)

```typescript
// 1. React y React Native
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';

// 2. Librerías externas
import { NavigationContainer } from '@react-navigation/native';

// 3. Imports internos con @/
import { DarkTheme } from '@/shared/theme/darkTheme';
import { useAuth } from '@/features/auth/services/AuthContext';

// 4. Imports relativos (solo dentro de la misma feature)
import { formatAmount } from './utils';
```

### Regla de barrel exports

**No crear `index.ts` que re-exportan todo**. Preferir imports directos al archivo específico para facilitar tree-shaking y claridad.

```typescript
// ✅ Import directo
import { GradientCard } from '@/shared/components/GradientCard';

// ❌ Barrel export
import { GradientCard } from '@/shared/components';
```

---

## 9. Sistema de Theming

### Tokens de diseño

Todos los valores visuales provienen del tema definido en `src/shared/theme/darkTheme.ts`:

```typescript
import { DarkTheme } from '@/shared/theme/darkTheme';

// Acceso a colores
DarkTheme.colors.bgPrimary      // '#0F172A'
DarkTheme.colors.accentGreen    // '#10B981'

// Acceso a gradientes
DarkTheme.gradients.disponibleReal  // ['#7C3AED', '#EC4899']
```

### Reglas de estilo

1. **Cero colores hardcodeados** en componentes. Todo color debe venir de `DarkTheme.colors` o `DarkTheme.gradients`.
2. **Usar `StyleSheet.create()`** siempre. No pasar objetos inline a `style={}`.
3. **Escala de spacing** estándar: `4, 8, 12, 16, 20, 24, 32, 40, 48`.
4. **Escala tipográfica**: `xs(11), sm(13), base(15), lg(17), xl(20), 2xl(24), 3xl(30), 4xl(36)`.

```typescript
// ✅ Correcto
const styles = StyleSheet.create({
  container: {
    backgroundColor: DarkTheme.colors.bgPrimary,
    padding: 16,
  },
});

// ❌ Incorrecto — color hardcodeado + inline style
<View style={{ backgroundColor: '#0F172A', padding: 16 }}>
```

### Futuro: Light Theme

El sistema está preparado para soportar un toggle light/dark. Cuando se implemente:
- Se creará `lightTheme.ts` con la misma estructura que `darkTheme.ts`.
- Se creará un `ThemeProvider` con Context que exponga el tema activo.
- Los componentes accederán al tema via `useTheme()` hook.

---

## 10. Testing

### Configuración

- **Framework**: Jest ^30.2.0 con `babel-jest` como transformer.
- **Entorno**: `node` (tests de lógica, no de renderizado por ahora).
- **Cobertura mínima**: 50% (branches, functions, lines, statements). Objetivo: **70%**.
- **Alias**: Jest resuelve `@/` via `moduleNameMapper`.

### Estructura de tests

```
__tests__/
├── authService.test.ts           # Tests del repository de usuarios
├── expenseService.test.ts        # Tests del repository de gastos
└── monthlyConfigService.test.ts  # Tests del repository de configuración
```

### Patrones de testing

1. **Cada test es independiente**: `beforeEach(() => jest.clearAllMocks())`.
2. **Mocks a nivel de módulo**: la base de datos se mockea con `jest.mock('@/database/client')`.
3. **Tests en español** (nombres descriptivos): `it('debería agregar un gasto correctamente')`.
4. **Cubrir happy path + error paths + edge cases**.

```typescript
describe('ExpenseRepository', () => {
  beforeEach(() => jest.clearAllMocks());

  it('debería agregar un gasto correctamente', async () => {
    // Arrange
    const db = require('@/database/client').default;
    db.runAsync.mockResolvedValueOnce({ lastInsertRowId: 1 });

    // Act
    const result = await addExpense({ amount: 100, description: 'Café' });

    // Assert
    expect(result).toBeDefined();
    expect(db.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT'),
      expect.arrayContaining([100, 'Café']),
    );
  });
});
```

### Scripts disponibles

```bash
npm test              # Ejecutar todos los tests
npm run test:watch    # Modo watch (re-ejecuta al guardar)
npm run test:coverage # Generar reporte de cobertura
```

---

## 11. Tooling y Calidad

### Herramientas activas

| Herramienta | Propósito | Configuración |
|-------------|----------|---------------|
| **ESLint** | Detectar errores y malas prácticas | `.eslintrc.js` |
| **Prettier** | Formato automático consistente | `.prettierrc` |
| **Husky** | Ejecutar checks en git hooks | `.husky/pre-commit` |
| **lint-staged** | Lint + format solo archivos staged | `package.json > lint-staged` |
| **TypeScript** | Type-checking estricto | `tsconfig.json` |

### Reglas ESLint destacadas

| Regla | Nivel | Razón |
|-------|-------|-------|
| `no-explicit-any` | warn | Migrar gradualmente a tipos correctos |
| `react-hooks/rules-of-hooks` | error | Prevenir bugs críticos con hooks |
| `react-hooks/exhaustive-deps` | warn | Detectar dependencias faltantes en efectos |
| `no-console` | warn (allow error/warn) | Evitar logs en producción |
| `react-native/no-color-literals` | warn | Forzar uso del tema |
| `react-native/no-inline-styles` | warn | Forzar uso de StyleSheet |
| `import/order` | warn | Imports ordenados automáticamente |

### Configuración Prettier

```json
{
  "singleQuote": true,
  "trailingComma": "all",
  "semi": true,
  "printWidth": 100,
  "tabWidth": 2
}
```

### Scripts disponibles

```bash
npm run lint          # Verificar errores de lint
npm run lint:fix      # Corregir errores automáticamente
npm run format        # Formatear todos los archivos
npm run format:check  # Verificar formato sin modificar
npm run typecheck     # Verificar tipos TypeScript
```

### Pre-commit automático

Cada `git commit` ejecuta automáticamente:
1. **ESLint --fix** sobre archivos staged `.ts/.tsx`
2. **Prettier --write** sobre los mismos archivos

Si alguno falla, el commit se bloquea hasta que se corrija.

---

## 12. Seguridad

### Reglas obligatorias

1. **Queries SQL parametrizadas**: toda query con datos de usuario usa `?` placeholders. Sin excepciones.
2. **Validación de inputs**: todo dato de formulario se valida antes de enviarse al repository.
3. **Sin datos sensibles en código**: no commitear API keys, passwords ni tokens. Usar variables de entorno.
4. **Password hashing**: actualmente usa `btoa` + checksum (pendiente migrar a `expo-crypto` con SHA-256 + salt).
5. **Longitud de inputs limitada**: los formularios deben definir `maxLength` en los campos de texto.

### Pendiente

- [ ] Migrar password hashing a `expo-crypto` (`digestStringAsync` SHA-256 + salt aleatorio).
- [ ] Implementar `config/env.ts` para variables de entorno tipadas.
- [ ] Agregar `ErrorBoundary` para capturar crashes de UI.

---

## 13. Git y Workflow

### Ramas

| Rama | Propósito |
|------|----------|
| `master` | Código estable, listo para producción |
| `feature/*` | Nuevas funcionalidades |
| `fix/*` | Corrección de bugs |
| `refactor/*` | Mejoras técnicas sin cambio funcional |

### Commits

Formato: **tipo + descripción concisa en español o inglés**.

```
feat: agregar modal de gastos compartidos
fix: corregir cálculo de ahorro mensual
refactor: extraer useExpenses hook del HomeScreen
chore: actualizar dependencias de Expo
test: agregar tests para reimbursementRepository
```

### Pull Requests

1. Cada PR debe pasar: `lint`, `typecheck`, `test`.
2. Incluir descripción de qué se cambió y por qué.
3. No mezclar features distintas en un mismo PR.
4. Mínimo 1 aprobación antes de merge.

---

## 14. Librerías Aprobadas

### Instaladas y en uso

| Librería | Uso |
|----------|-----|
| `expo` | Plataforma de desarrollo |
| `expo-sqlite` | Base de datos local |
| `@react-native-async-storage/async-storage` | Storage clave-valor + fallback web |
| `@react-navigation/native`, `stack`, `bottom-tabs` | Navegación |
| `react-native-gesture-handler` | Gestos (dependencia de navigation) |
| `react-native-safe-area-context` | Safe area (dependencia de navigation) |
| `react-native-screens` | Screens nativas (dependencia de navigation) |
| `expo-linear-gradient` | Gradientes en tarjetas |
| `expo-status-bar` | Control de status bar |

### Aprobadas para uso futuro (instalar cuando se necesiten)

| Librería | Cuándo usarla |
|----------|---------------|
| `expo-crypto` | Cuando se migre el hashing de passwords |
| `zustand` | Si se superan 3 contextos concurrentes |
| `react-hook-form` + `zod` | Si hay más de 5 formularios |
| `@testing-library/react-native` | Para tests de renderizado de componentes |
| `expo-localization` + `i18n-js` | Si se implementa multi-idioma |
| `expo-file-system` + `expo-sharing` | Para exportación de archivos en mobile |
| `sentry-expo` | Para logging de errores en producción |

### Librerías prohibidas (no instalar)

| Librería | Razón |
|----------|-------|
| `redux` / `@reduxjs/toolkit` | Demasiado boilerplate para este scope. Usar Context o Zustand. |
| `axios` | `fetch` nativo es suficiente. No agregar dependencias innecesarias. |
| `moment.js` | Deprecado y pesado. Usar `Intl.DateTimeFormat` o `date-fns` si hace falta. |
| `styled-components` | Ya hay un sistema de tema con StyleSheet. No mezclar paradigmas. |
| `expo-font` | No se usan fuentes custom. Solo sistema default hasta que el diseño lo requiera. |

---

## 15. Roadmap Técnico

Orden de prioridad para mejoras técnicas pendientes:

### Corto plazo (próximos sprints)

- [ ] **Seguridad**: Migrar password hashing a `expo-crypto`.
- [ ] **Theming unificado**: Eliminar colores hardcodeados de LoginScreen y AddExpenseScreen. Todo via `DarkTheme`.
- [ ] **Data Hooks**: Extraer `useExpenses()` y `useMonthlyConfig()` del HomeScreen.
- [ ] **Error Handling**: Crear `ErrorBoundary` + custom error classes (`AuthError`, `DatabaseError`).
- [ ] **Coverage**: Subir umbral de tests a 70%. Agregar tests para `reimbursementRepository` y `exportService`.

### Mediano plazo

- [ ] **Gastos compartidos**: Nuevo feature module `features/shared-expenses/`.
- [ ] **Light Theme**: Crear `lightTheme.ts` + `ThemeProvider` con toggle.
- [ ] **CI/CD**: GitHub Actions pipeline (lint → typecheck → test).
- [ ] **Validación de forms**: Centralizar con helpers tipados.

### Largo plazo

- [ ] **Backend API**: Reemplazar repositories locales por HTTP client.
- [ ] **i18n**: Internacionalización del UI.
- [ ] **Push notifications**: Alertas de presupuesto.

---

## 16. Decisiones Arquitectónicas (ADR)

Registro de decisiones técnicas importantes y su justificación.

### ADR-001: Feature Modules sobre Type-based Folders

**Decisión**: Organizar código por feature (`auth/`, `expenses/`, `config/`) en lugar de por tipo (`screens/`, `components/`, `services/`).

**Razón**: A medida que la app crece, la organización por tipo genera carpetas con 20+ archivos sin relación entre sí. La organización por feature mantiene el código relacionado junto, facilita la navegación y permite que equipos trabajen en features independientes sin conflictos.

---

### ADR-002: Repository Pattern para Persistencia

**Decisión**: Aislar toda interacción SQL en repositories dedicados.

**Razón**: Prepara la app para una futura migración a API REST. Los screens y hooks solo conocen la interfaz del repository, no su implementación interna. Cambiar de SQLite a HTTP solo requiere reescribir el repository.

---

### ADR-003: Context API sobre State Management Libraries

**Decisión**: Usar React Context + useState para estado global. No instalar Zustand, Redux ni MobX.

**Razón**: La app actualmente solo tiene un contexto global (`AuthContext`). Las librerías de state management agregan complejidad y dependencias innecesarias para este scope. Se reevaluará cuando haya más de 3 contextos concurrentes.

---

### ADR-004: No Barrel Exports

**Decisión**: Importar directamente desde el archivo fuente. No crear `index.ts` que re-exportan.

**Razón**: Los barrel exports dificultan el tree-shaking, crean dependencias circulares, y hacen que los IDE resuelvan imports de forma impredecible. El import directo es explícito y optimizable.

---

### ADR-005: SQLite Local como Primera Fuente de Verdad

**Decisión**: La app funciona 100% offline con SQLite local. No hay dependencia de servidor.

**Razón**: Para una app de gastos personales, la latencia cero y el funcionamiento offline son prioritarios. Cuando se agregue backend, será como sincronización, no como reemplazo.

---

## 17. Checklist para Nuevas Features

Antes de considerar una feature "terminada", verificar:

- [ ] Archivos ubicados en la feature correcta (`features/<nombre>/`).
- [ ] Todos los imports usan `@/` aliases.
- [ ] Colores y spacing provienen del tema (`DarkTheme`). Cero valores hardcodeados.
- [ ] Componentes usan `StyleSheet.create()`, no estilos inline.
- [ ] Queries SQL usan parámetros (`?`). Sin interpolación de strings.
- [ ] Inputs de formulario tienen validación y `maxLength`.
- [ ] Al menos 1 archivo de test que cubra happy path y error path.
- [ ] `npm run lint` pasa sin errores.
- [ ] `npm run typecheck` pasa sin errores.
- [ ] `npm test` pasa con cobertura ≥ 50%.
- [ ] El código fue formateado con Prettier.

---

> **Última actualización**: Abril 2026 — Reestructuración a feature modules + Repository Pattern + Tooling (ESLint, Prettier, Husky).
