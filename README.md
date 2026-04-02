# Gastos App

Aplicación móvil para el registro y control de gastos personales, desarrollada con React Native y Expo. Permite a cada usuario llevar un historial de sus gastos, organizarlos por categoría, y ver un resumen mensual de su situación financiera.

---

## Índice

1. [¿Qué hace esta aplicación?](#1-qué-hace-esta-aplicación)
2. [Tecnologías utilizadas](#2-tecnologías-utilizadas)
3. [Estructura del proyecto](#3-estructura-del-proyecto)
4. [Arquitectura de la aplicación](#4-arquitectura-de-la-aplicación)
5. [Base de datos y almacenamiento](#5-base-de-datos-y-almacenamiento)
6. [Sistema de autenticación](#6-sistema-de-autenticación)
7. [Pantallas de la aplicación](#7-pantallas-de-la-aplicación)
8. [Exportación de datos](#8-exportación-de-datos)
9. [Cómo ejecutar el proyecto](#9-cómo-ejecutar-el-proyecto)
10. [Tests automatizados](#10-tests-automatizados)
11. [Consideraciones de seguridad](#11-consideraciones-de-seguridad)

---

## 1. ¿Qué hace esta aplicación?

Gastos App es una herramienta de finanzas personales que permite:

- **Registrar gastos** con monto, descripción, categoría y fecha.
- **Visualizar un resumen mensual** con el total gastado y el desglose por categoría.
- **Consultar el historial** completo de gastos y eliminar registros.
- **Gestionar usuarios**: cada persona tiene su propia cuenta; los datos de un usuario no son visibles para otro.
- **Funcionar en múltiples plataformas**: la aplicación corre en Android, iOS y en navegadores web sin cambios de código.

---

## 2. Tecnologías utilizadas

A continuación se explica qué es cada tecnología y por qué se usa en este proyecto.

| Tecnología | Versión | ¿Para qué sirve? |
|---|---|---|
| **React Native** | 0.81.5 | Framework para construir apps móviles nativas usando JavaScript. El código se escribe una sola vez y corre en Android e iOS. |
| **Expo** | ~54.0.33 | Herramienta que simplifica el desarrollo con React Native: permite compilar, probar y publicar la app con comandos simples. |
| **TypeScript** | ~5.9.2 | Es JavaScript con tipado estricto. Permite detectar errores de programación antes de ejecutar la app, haciendo el código más robusto. |
| **expo-sqlite** | ^16.0.10 | Base de datos local que vive dentro del dispositivo. No necesita conexión a internet ni servidores externos. |
| **AsyncStorage** | ^1.23.1 | Sistema de almacenamiento clave-valor para guardar la sesión del usuario y como motor alternativo de base de datos en la versión web. |
| **React Navigation** | ^7.x | Biblioteca que maneja la navegación entre pantallas (equivalente al sistema de "páginas" en una web). |
| **NativeWind + Tailwind CSS** | ^4.2.1 / ^3.4.19 | Sistema de estilos visuales. Permite dar forma y color a los componentes usando clases predefinidas. |
| **Jest** | ^30.2.0 | Framework de tests automatizados. Permite verificar que el código funciona correctamente sin ejecutar la app manualmente. |

---

## 3. Estructura del proyecto

```
gastos-app/
│
├── App.tsx                    # Punto de entrada: configuración de navegación y autenticación
├── index.ts                   # Archivo raíz que Expo carga al iniciar
├── package.json               # Lista de dependencias y scripts del proyecto
├── tsconfig.json              # Configuración de TypeScript
├── babel.config.js            # Configuración del compilador de JavaScript
├── tailwind.config.js         # Configuración del sistema de estilos
│
├── database/                  # Capa de datos: acceso a la base de datos
│   ├── db.ts                  # Inicialización y configuración de SQLite (+ fallback para web)
│   ├── authService.ts         # Lógica de registro, login, logout y sesión de usuario
│   └── expenseService.ts      # Operaciones CRUD sobre gastos
│
├── screens/                   # Pantallas visibles de la aplicación
│   ├── LoginScreen.tsx        # Pantalla de inicio de sesión y registro
│   ├── HomeScreen.tsx         # Dashboard principal con resumen mensual
│   ├── ExpensesListScreen.tsx # Lista completa de gastos con opción de borrar
│   └── AddExpenseScreen.tsx   # Formulario para agregar un nuevo gasto
│
├── utils/
│   └── AuthContext.tsx        # Estado global de autenticación compartido entre pantallas
│
├── __tests__/                 # Tests automatizados
│   ├── authService.test.ts    # Tests del servicio de autenticación
│   └── expenseService.test.ts # Tests del servicio de gastos
│
└── assets/                    # Imágenes, íconos y recursos estáticos
```

---

## 4. Arquitectura de la aplicación

La aplicación sigue el patrón de **separación de responsabilidades**: cada parte del código tiene una tarea bien definida y no interfiere con las demás. Esto facilita detectar errores y agregar nuevas funciones sin romper lo que ya funciona.

```
┌────────────────────────────────────────────────┐
│                  PANTALLAS (UI)                │
│  LoginScreen  HomeScreen  ListScreen  AddScreen│
│         ↕ leen y llaman a funciones de         │
├────────────────────────────────────────────────┤
│             SERVICIOS (Lógica de negocio)      │
│         authService.ts   expenseService.ts     │
│                  ↕ consultan a                 │
├────────────────────────────────────────────────┤
│              BASE DE DATOS (db.ts)             │
│     SQLite (Android/iOS)  AsyncStorage (Web)  │
└────────────────────────────────────────────────┘
                        ↕
              Estado global compartido
                (AuthContext.tsx)
            sesión del usuario actual
```

### Flujo de navegación

Cuando la app inicia, verifica si hay una sesión activa guardada:

```
App abre
   └─► ¿Hay sesión guardada?
           ├─ SÍ → AppStack (Home + Lista de gastos)
           └─ NO → AuthStack (Pantalla de Login/Registro)
```

---

## 5. Base de datos y almacenamiento

### Estructura de las tablas

**Tabla `users` — Usuarios registrados**

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | INTEGER | Identificador único, autoincremental |
| `username` | TEXT | Nombre de usuario |
| `email` | TEXT | Correo electrónico (único) |
| `password` | TEXT | Contraseña hasheada (nunca se guarda en texto plano) |
| `created_at` | DATETIME | Fecha de creación de la cuenta |

**Tabla `expenses` — Gastos registrados**

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | INTEGER | Identificador único, autoincremental |
| `user_id` | INTEGER | Referencia al usuario dueño del gasto |
| `amount` | REAL | Monto del gasto (número decimal) |
| `description` | TEXT | Descripción breve del gasto |
| `category` | TEXT | Categoría (Alimentación, Transporte, etc.) |
| `date` | TEXT | Fecha del gasto en formato `YYYY-MM-DD` |
| `created_at` | DATETIME | Fecha en que se registró |

### Compatibilidad multiplataforma

La app usa **SQLite** en dispositivos móviles (Android e iOS), una base de datos estándar que funciona directamente en el dispositivo sin internet. Para la versión **web** (navegador), SQLite no está disponible, por lo que `db.ts` incluye una implementación alternativa que replica el mismo comportamiento usando **AsyncStorage**. El resto del código no necesita saber qué motor se está usando.

---

## 6. Sistema de autenticación

### Registro de usuario

1. El usuario completa el formulario con nombre, email y contraseña.
2. Se verifica que no exista otro usuario con el mismo email o nombre de usuario.
3. La contraseña se convierte en un **hash** antes de guardarse. Un hash es una transformación matemática de un solo sentido: si alguien accede a la base de datos, no puede recuperar la contraseña original.
4. Se guarda el usuario en la base de datos.

### Inicio de sesión

1. Se busca el usuario por email.
2. Se comparan los hashes de la contraseña (nunca se comparan contraseñas en texto plano).
3. Si coinciden, se guarda el ID y los datos del usuario en **AsyncStorage** para mantener la sesión activa entre aperturas de la app.

### Cierre de sesión

Se eliminan los datos de sesión de AsyncStorage. La próxima vez que la app abra, detectará que no hay sesión y redirigirá al Login.

> **Nota:** El algoritmo de hash actual es adecuado para desarrollo y aprendizaje, pero para publicar la app en producción debería reemplazarse por un algoritmo estándar como **bcrypt** o **Argon2**.

---

## 7. Pantallas de la aplicación

### LoginScreen — Inicio de sesión y registro

Pantalla de entrada a la app. Permite al usuario alternar entre el formulario de login y el de registro. Incluye validaciones de campos vacíos, longitud mínima de contraseña (6 caracteres) y verificación de coincidencia de contraseñas.

### HomeScreen — Panel principal

Muestra:
- Saludo personalizado con el nombre del usuario.
- Total de gastos del mes actual.
- Desglose de gastos agrupados por categoría.
- Botón de acceso rápido a la carga de gastos.
- Opción de cerrar sesión con confirmación.

Los datos se recargan automáticamente cada vez que la pantalla vuelve al foco (por ejemplo, al regresar desde la pantalla de agregar gasto).

### ExpensesListScreen — Lista de gastos

Lista todos los gastos del usuario ordenados por fecha (más recientes primero). Cada tarjeta muestra la descripción, categoría, monto y fecha. Permite eliminar gastos con una confirmación previa.

### AddExpenseScreen — Agregar gasto

Formulario con tres campos:
- **Monto**: campo numérico.
- **Descripción**: texto libre.
- **Categoría**: selector visual mediante botones. Opciones disponibles: Alimentación, Transporte, Entretenimiento, Salud, Hogar, Otros.

La fecha se asigna automáticamente al día actual.

---

## 8. Exportación de datos

### Arquitectura de la capa de exportación

La exportación está diseñada como una **capa de adaptadores**: hay una única función pública (`exportExpenses`) que recibe los datos y las opciones, y delega el trabajo a un *builder* específico según el formato pedido. Agregar un nuevo formato en el futuro solo requiere agregar un nuevo builder y un `case` en el switch, sin tocar nada de la UI ni de los servicios de base de datos.

```
ExpensesListScreen
       │ llama a
       ▼
exportExpenses(expenses, options)   ← única API pública
       │
       ├─ format: 'csv'   → buildCSV()    ← Fase 1 ✅ implementado
       ├─ format: 'excel' → buildExcel()  ← Fase 2 (pendiente)
       └─ format: 'pdf'   → buildPDF()    ← Fase 3 (pendiente)
                │
                ├─ Platform.OS === 'web'    → Blob + link de descarga
                └─ Platform.OS === 'mobile' → Share (selector nativo del SO)
```

El archivo que implementa esta lógica es [utils/exportService.ts](utils/exportService.ts).

---

### Fase 1 — CSV (implementada)

**Sin dependencias externas.** El formato CSV (valores separados por comas) es el denominador común de todos los programas de hojas de cálculo (Microsoft Excel, Google Sheets, LibreOffice Calc, Numbers).

#### Características técnicas

- **Escaping RFC 4180**: las celdas que contienen comas, comillas o saltos de línea se envuelven en comillas dobles. Las comillas internas se duplican (`"` → `""`). Esto protege cualquier descripción de texto libre escrita por el usuario.
- **BOM UTF-8** (`\uFEFF`): se añade al inicio del archivo para que Excel en Windows interprete correctamente caracteres como `ñ`, `á`, `ü` sin necesidad de importación manual.
- **Nombre de archivo automático**: se genera en el formato `gastos_YYYY_MM_FECHA.csv` o `gastos_completo_FECHA.csv` según el filtro elegido.

#### Columnas exportadas (extensibles)

| Columna | Fuente |
|---|---|
| ID | `expense.id` |
| Fecha | `expense.date` (formato `YYYY-MM-DD`) |
| Descripción | `expense.description` |
| Categoría | `expense.category` |
| Monto | `expense.amount` |

> Para agregar más columnas en el futuro (ej: tipo, notas, moneda), solo hay que modificar el array `headers` y el array de `rows` dentro de `buildCSV()` en `utils/exportService.ts`. El resto de la app no cambia.

#### Filtros disponibles

- **Este mes**: exporta solo los gastos del mes y año en curso.
- **Todo el historial**: exporta todos los registros del usuario.

#### Cómo funciona en cada plataforma

**Web (navegador):**
```
exportExpenses() genera el CSV como string
       ↓
Se crea un Blob (archivo en memoria del navegador)
       ↓
Se genera una URL temporal con URL.createObjectURL()
       ↓
Se simula un click en un <a download="..."> invisible
       ↓
El navegador descarga el archivo automáticamente
       ↓
Se libera la URL temporal con URL.revokeObjectURL()
```

**Mobile (Android / iOS):**
```
exportExpenses() genera el CSV como string
       ↓
Se llama a Share.share() (API nativa de React Native)
       ↓
El sistema operativo abre el selector de apps:
WhatsApp, Gmail, Google Drive, Archivos, etc.
```

---

### Fase 2 — Excel `.xlsx` (planificada)

**Dependencia necesaria:** [`xlsx` (SheetJS)](https://www.npmjs.com/package/xlsx)

```bash
npm install xlsx
```

**Qué agrega sobre el CSV:**
- Múltiples hojas en un mismo archivo.
- Formato visual: colores, anchos de columna, encabezados en negrita.
- Fórmulas nativas de Excel (ej: `=SUM(E2:E100)`).
- Posibilidad de incluir gráficos en el futuro.

**Estructura de hojas propuesta:**

| Hoja | Contenido |
|---|---|
| `Detalle` | Una fila por gasto (igual que el CSV actual) |
| `Por categoría` | Suma total agrupada por categoría |
| `Por mes` | Evolución mensual (total gastado por mes) |

**Cómo se integra sin romper nada:**

```typescript
// En utils/exportService.ts — solo se agrega este bloque:
case 'excel': {
  const workbook = buildExcel(filtered);  // nueva función a crear
  content = XLSX.write(workbook, { type: 'binary', bookType: 'xlsx' });
  mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  ext = 'xlsx';
  break;
}
```

En la UI de `ExpensesListScreen`, solo se agrega un nuevo botón de opción en el modal. Todo lo demás permanece igual.

---

### Fase 3 — PDF (planificada)

**Caso de uso:** reportes de cierre mensual para imprimir o compartir por mail, con diseño visual (logo, colores, tablas formateadas).

**Estrategia recomendada:**
- **Web**: generar HTML en memoria y llamar a `window.print()` con una hoja de estilos CSS de impresión (`@media print`). Sin dependencias.
- **Mobile**: usar [`expo-print`](https://docs.expo.dev/versions/latest/sdk/print/) para generar un PDF real desde HTML.

```bash
# Solo necesario para mobile:
npx expo install expo-print expo-sharing
```

> El PDF es el formato más costoso de implementar bien pero el más atractivo para el usuario final. Se recomienda implementarlo después de que la Fase 2 esté estable.

---

## 9. Cómo ejecutar el proyecto

### Requisitos previos

- [Node.js](https://nodejs.org/) versión 18 o superior.
- [npm](https://www.npmjs.com/) versión 9 o superior.
- [Expo Go](https://expo.dev/go) instalado en el celular (para probar en dispositivo físico), o un emulador de Android/iOS configurado.

### Pasos

```bash
# 1. Clonar o descargar el proyecto y posicionarse en la carpeta
cd gastos-app

# 2. Instalar las dependencias
npm install

# 3. Iniciar el servidor de desarrollo
npm start
```

Después de `npm start`, se abrirá una ventana en el navegador con un código QR. Escanearlo con la app **Expo Go** en el celular para ver la app en tiempo real.

### Plataformas específicas

```bash
npm run android   # Emulador Android o dispositivo conectado por USB
npm run ios       # Simulador iOS (solo disponible en macOS)
npm run web       # Navegador web
```

---

## 10. Tests automatizados

Los tests verifican que la lógica del código funciona correctamente sin necesidad de ejecutar la app manualmente. Se ubican en la carpeta `__tests__/`.

```bash
npm test                  # Ejecuta todos los tests una vez
npm run test:watch        # Re-ejecuta los tests al detectar cambios en el código
npm run test:coverage     # Ejecuta los tests y genera un reporte de cobertura
```

### Estado actual de los tests

| Suite | Tests | Estado |
|---|---|---|
| `authService.test.ts` | 9 tests | ✅ Todos pasan |
| `expenseService.test.ts` | 10 tests | ✅ Todos pasan |
| **Total** | **19 tests** | **✅ 19/19** |

### ¿Qué es la cobertura de tests?

La cobertura indica qué porcentaje del código está siendo ejercitado por los tests. El proyecto tiene configurado un mínimo del **50%** en todas las métricas. Los tests usan **mocks** (simulaciones de la base de datos) para no depender de datos reales ni de hardware durante las pruebas.

---

## 11. Consideraciones de seguridad

| Aspecto | Implementación actual | Mejora recomendada para producción |
|---|---|---|
| **Contraseñas** | Hash simple (base64 + checksum) | Usar `bcrypt` o `Argon2` |
| **Sesión** | ID de usuario en AsyncStorage | Usar JWT con tiempo de expiración |
| **Aislamiento de datos** | Filtro por `user_id` en cada consulta SQL | Validar también en un servidor si se agrega backend |
| **Validación de campos** | Validación básica en pantallas | Agregar sanitización más estricta contra inyección SQL |

---

## Próximas mejoras sugeridas

- [ ] Edición de gastos existentes
- [ ] Filtros por fecha y categoría en la lista
- [ ] Gráficos de evolución mensual
- [ ] Exportación de datos (CSV / PDF)
- [ ] Modo oscuro
- [ ] Soporte para múltiples monedas

---

*Versión de la documentación: 1.0 — Última actualización: Abril 2026*
