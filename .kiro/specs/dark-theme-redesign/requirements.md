# Documento de Requisitos

## Introducción

Rediseño visual de la app "Gastos App" (React Native + Expo) adoptando un tema oscuro tipo dashboard financiero. El objetivo es migrar la UI de HomeScreen y ExpensesListScreen a una nueva estética dark navy con tarjetas de gradiente, manteniendo toda la funcionalidad existente intacta. El rediseño se estructura en dos fases: primero la migración visual con datos existentes y placeholders, luego la incorporación incremental de nuevos conceptos de datos (sueldo, reintegros, ahorro).

## Glosario

- **App**: La aplicación React Native "Gastos App"
- **HomeScreen**: Pantalla principal que muestra el resumen financiero del mes
- **ExpensesListScreen**: Pantalla que lista todos los gastos registrados
- **Theme**: Sistema de tokens de color y tipografía que define la apariencia visual
- **DarkTheme**: Paleta de colores oscuros centrada en `#0F172A` (dark navy) como fondo base
- **GradientCard**: Componente de tarjeta con fondo degradado usando `expo-linear-gradient`
- **SummaryCard**: Tarjeta oscura secundaria que muestra un subtotal con porcentaje
- **ProgressBar**: Barra de progreso horizontal con color de acento amarillo/naranja
- **Sueldo**: Ingreso mensual configurado por el usuario, usado como referencia para calcular disponible y porcentajes
- **DisponibleReal**: Sueldo menos total de gastos del mes
- **GastosFuturos**: Gastos registrados con fecha posterior a hoy dentro del mes en curso
- **Reintegro**: Monto que el usuario espera recuperar (ej: promociones, reembolsos)
- **ObjetivoAhorro**: Meta de ahorro mensual configurada por el usuario
- **TipoGasto**: Clasificación de un gasto como "compartido" o "individual"
- **MigrationService**: Módulo responsable de ejecutar migraciones de esquema de base de datos de forma no destructiva

---

## Requisitos

### Requisito 1: Sistema de tema oscuro global

**User Story:** Como usuario, quiero que la app tenga un tema oscuro consistente, para que la experiencia visual sea moderna y cómoda en condiciones de poca luz.

#### Criterios de Aceptación

1. THE App SHALL definir un objeto `DarkTheme` con los siguientes tokens de color: fondo primario `#0F172A`, fondo de tarjeta `#1E293B`, fondo de tarjeta secundaria `#0F172A`, texto primario `#F8FAFC`, texto secundario `#94A3B8`, acento verde `#10B981`, acento amarillo `#F59E0B`, borde sutil `#334155`.
2. THE HomeScreen SHALL aplicar el color de fondo `#0F172A` a su contenedor raíz.
3. THE ExpensesListScreen SHALL aplicar el color de fondo `#0F172A` a su contenedor raíz.
4. WHEN el usuario navega entre HomeScreen y ExpensesListScreen, THE App SHALL mantener el mismo fondo oscuro `#0F172A` sin parpadeo de color blanco entre transiciones.
5. THE App SHALL usar la fuente del sistema con pesos `400`, `600` y `700` para jerarquía tipográfica en todas las pantallas rediseñadas.

---

### Requisito 2: Header rediseñado en HomeScreen

**User Story:** Como usuario, quiero ver un header claro con el título de la app y el mes actual, para orientarme rápidamente en el contexto temporal.

#### Criterios de Aceptación

1. THE HomeScreen SHALL mostrar el texto "Mis Finanzas" como título principal del header con tamaño de fuente 28 y peso `700`.
2. THE HomeScreen SHALL mostrar el mes y año actuales en formato "Mes YYYY" (ej: "Abril 2026") debajo del título, con color `#94A3B8`.
3. THE HomeScreen SHALL mostrar un botón de cierre de sesión en el extremo derecho del header con estilo discreto (sin fondo rojo prominente), usando el color `#94A3B8`.
4. IF el usuario presiona el botón de cierre de sesión, THEN THE HomeScreen SHALL mostrar un diálogo de confirmación con fondo oscuro `#1E293B` y texto claro.

---

### Requisito 3: Tarjetas superiores con gradiente

**User Story:** Como usuario, quiero ver dos tarjetas destacadas en la parte superior del dashboard, para conocer de un vistazo mi situación financiera real y proyectada.

#### Criterios de Aceptación

1. THE HomeScreen SHALL renderizar dos GradientCard en fila horizontal en la parte superior del contenido, cada una ocupando aproximadamente el 48% del ancho disponible.
2. THE GradientCard izquierda SHALL usar un gradiente de `#7C3AED` a `#EC4899` (púrpura a rosa) y mostrar la etiqueta "Disponible Real" con el valor de DisponibleReal calculado.
3. THE GradientCard derecha SHALL usar un gradiente de `#1D4ED8` a `#06B6D4` (azul a cyan) y mostrar la etiqueta "Con Gastos Futuros" con el valor de DisponibleReal menos GastosFuturos.
4. WHILE el Sueldo no esté configurado, THE HomeScreen SHALL mostrar en la GradientCard izquierda el subtexto "Configurar sueldo" en lugar del monto de referencia.
5. WHEN el Sueldo está configurado, THE HomeScreen SHALL mostrar en la GradientCard izquierda el subtexto "de $ {Sueldo}" con color blanco semitransparente.
6. THE GradientCard SHALL mostrar los montos en formato de número con separador de miles usando locale `es-AR` (ej: `$150.000`).
7. IF el valor de DisponibleReal es negativo, THEN THE GradientCard izquierda SHALL mostrar el monto en color `#FCA5A5` (rojo claro) para indicar déficit.

---

### Requisito 4: Sección "Gastos del Mes" con sub-tarjetas

**User Story:** Como usuario, quiero ver un desglose de mis gastos del mes en categorías compartidos/individuales, para entender la distribución de mis gastos.

#### Criterios de Aceptación

1. THE HomeScreen SHALL mostrar una sección titulada "Gastos del Mes" con tres SummaryCard: "Compartido", "Individual" y "Total".
2. THE SummaryCard "Compartido" SHALL mostrar la suma de todos los gastos del mes con TipoGasto igual a "compartido" y su porcentaje respecto al total mensual.
3. THE SummaryCard "Individual" SHALL mostrar la suma de todos los gastos del mes con TipoGasto igual a "individual" y su porcentaje respecto al total mensual.
4. THE SummaryCard "Total" SHALL mostrar la suma de todos los gastos del mes y, WHEN el Sueldo está configurado, SHALL mostrar el porcentaje que representa respecto al Sueldo.
5. WHILE el campo TipoGasto no esté disponible en la base de datos (Fase 1), THE HomeScreen SHALL mostrar el total mensual existente en la SummaryCard "Total" y las SummaryCard "Compartido" e "Individual" SHALL mostrar `$0` con etiqueta "(próximamente)".
6. FOR ALL meses con gastos registrados, la suma de gastos "Compartido" más gastos "Individual" SHALL ser igual al total de gastos del mes (invariante de completitud).

---

### Requisito 5: Sección "Reintegros"

**User Story:** Como usuario, quiero ver el total de reintegros esperados del mes, para considerar ese dinero en mi balance real.

#### Criterios de Aceptación

1. THE HomeScreen SHALL mostrar una sección "Reintegros" con el monto total de reintegros del mes y un subtítulo descriptivo.
2. WHILE los Reintegros no estén implementados en la base de datos (Fase 1), THE HomeScreen SHALL mostrar `$0` y el subtítulo "Próximamente" en la sección de Reintegros.
3. WHEN los Reintegros estén disponibles, THE HomeScreen SHALL sumar los reintegros al DisponibleReal para calcular el "Total con reintegros".
4. THE SummaryCard de Reintegros SHALL usar el color de acento `#10B981` (verde) para el monto.

---

### Requisito 6: Sección "Objetivo de Ahorro"

**User Story:** Como usuario, quiero ver mi progreso hacia mi objetivo de ahorro mensual, para mantenerme motivado y en control.

#### Criterios de Aceptación

1. THE HomeScreen SHALL mostrar una sección "Objetivo de ahorro" con una ProgressBar y el monto objetivo configurado.
2. THE ProgressBar SHALL calcular el progreso como `min(DisponibleReal / ObjetivoAhorro, 1.0)` y mostrar ese valor como porcentaje de llenado.
3. THE ProgressBar SHALL usar el color `#F59E0B` (amarillo/naranja) como color de relleno sobre un fondo `#334155`.
4. WHILE el ObjetivoAhorro no esté configurado, THE HomeScreen SHALL mostrar el texto "Configurar objetivo" en lugar de la ProgressBar.
5. IF el DisponibleReal supera el ObjetivoAhorro, THEN THE ProgressBar SHALL mostrarse completamente llena (100%) y el texto SHALL indicar "¡Objetivo alcanzado!".
6. FOR ALL valores de DisponibleReal y ObjetivoAhorro positivos, el valor de progreso de la ProgressBar SHALL estar en el rango `[0.0, 1.0]` (invariante de rango).

---

### Requisito 7: Sección "Sueldo del mes"

**User Story:** Como usuario, quiero configurar mi sueldo mensual, para que la app pueda calcular el disponible real y los porcentajes de gasto.

#### Criterios de Aceptación

1. THE HomeScreen SHALL mostrar una sección "Sueldo del mes" con el monto de Sueldo configurado y el "Total con reintegros" (Sueldo + Reintegros).
2. WHILE el Sueldo no esté configurado, THE HomeScreen SHALL mostrar un botón "Configurar sueldo" que navegue a una pantalla o modal de configuración.
3. WHEN el usuario guarda un nuevo valor de Sueldo, THE HomeScreen SHALL recalcular y actualizar DisponibleReal, los porcentajes de SummaryCard y el progreso de ObjetivoAhorro sin requerir reinicio de la app.
4. THE App SHALL persistir el Sueldo en la base de datos asociado al usuario autenticado.

---

### Requisito 8: Tema oscuro en ExpensesListScreen

**User Story:** Como usuario, quiero que la lista de gastos también tenga el tema oscuro, para una experiencia visual consistente en toda la app.

#### Criterios de Aceptación

1. THE ExpensesListScreen SHALL aplicar el fondo `#0F172A` y usar tarjetas de gasto con fondo `#1E293B`.
2. THE ExpensesListScreen SHALL mostrar el texto de descripción, categoría y monto con el color de texto primario `#F8FAFC`.
3. THE ExpensesListScreen SHALL mostrar la fecha del gasto con el color de texto secundario `#94A3B8`.
4. THE ExpensesListScreen SHALL mostrar el botón "Eliminar" con fondo `#7F1D1D` y texto `#FCA5A5` para mantener la semántica destructiva en el tema oscuro.
5. THE ExpensesListScreen SHALL mostrar los modales de confirmación y exportación con fondo `#1E293B` y bordes `#334155`.

---

### Requisito 9: Migración de base de datos no destructiva

**User Story:** Como desarrollador, quiero que los cambios de esquema de base de datos no eliminen datos existentes, para que los usuarios no pierdan su historial de gastos durante la actualización.

#### Criterios de Aceptación

1. THE MigrationService SHALL agregar la columna `expense_type` (TEXT, valores: `'compartido'` | `'individual'`, default `'individual'`) a la tabla `expenses` usando `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`.
2. THE MigrationService SHALL crear una tabla `monthly_config` con columnas: `id`, `user_id`, `year`, `month`, `salary` (REAL), `savings_goal` (REAL), `created_at`.
3. THE MigrationService SHALL crear una tabla `reimbursements` con columnas: `id`, `user_id`, `amount` (REAL), `description` (TEXT), `date` (TEXT), `created_at`.
4. WHEN el MigrationService ejecuta las migraciones, THE App SHALL preservar todos los registros existentes en la tabla `expenses` sin modificar sus valores.
5. IF una migración ya fue aplicada previamente, THEN THE MigrationService SHALL omitirla sin lanzar error (operaciones idempotentes).
6. FOR ALL registros en `expenses` previos a la migración, los valores de `id`, `user_id`, `amount`, `description`, `category` y `date` SHALL ser idénticos después de ejecutar la migración (invariante de preservación de datos).

---

### Requisito 10: Compatibilidad con funcionalidad existente

**User Story:** Como usuario, quiero que todas las funciones actuales (agregar, eliminar, exportar gastos) sigan funcionando tras el rediseño, para no perder capacidades que ya uso.

#### Criterios de Aceptación

1. THE HomeScreen SHALL mantener el botón flotante (FAB) para agregar gastos con el modal `AddExpenseModal` funcional tras el rediseño.
2. THE HomeScreen SHALL mantener la navegación a ExpensesListScreen por categoría tras el rediseño.
3. THE ExpensesListScreen SHALL mantener la funcionalidad de exportación CSV tras el rediseño.
4. THE ExpensesListScreen SHALL mantener la funcionalidad de eliminación de gastos con confirmación tras el rediseño.
5. WHEN el usuario agrega un nuevo gasto, THE HomeScreen SHALL reflejar el nuevo total mensual al volver al foco de la pantalla.
6. FOR ALL gastos existentes en la base de datos antes del rediseño, THE ExpensesListScreen SHALL mostrarlos correctamente con el nuevo tema oscuro (invariante de compatibilidad de datos).
