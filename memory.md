# Memory - Cambios Importantes del Sistema

## Migración Completa de Tablas de Logs - ✅ COMPLETADO
- **Fecha**: Actual
- **Problema**: Las tablas del esquema `logs` no estaban accesibles desde la API REST de Supabase
- **Solución**: Migrar todas las tablas de logs al esquema `public` con prefijo `logs_`

### Migración Realizada
1. **logs.caja_abierta** → **public.logs_caja_abierta**
2. **logs.skin_eliminada** → **public.logs_skin_eliminada** 
3. **logs.skin_mejorada** → **public.logs_skin_mejorada**
4. **logs.historial_recompensas** → **public.logs_historial_recompensas** (antes public.historial_recompensas)
5. **logs.actividad_usuario** (vista) → **public.logs_actividad_usuario** (tabla)

### Archivos Actualizados
- **`lib/logUtils.ts`**: ✅ Todas las referencias actualizadas
- **`app/main/misiones/page.tsx`**: ✅ Actualizado para usar logs_historial_recompensas
- **Otros archivos**: ✅ Verificados sin referencias a esquema logs

## Implementación Funcional de las Funciones de Logging - ✅ COMPLETADO

### 1. logCajaAbierta() - ✅ IMPLEMENTADO
- **Ubicación**: Se ejecuta automáticamente en `processBoxOpeningWithLog()` en `lib/boxUtils.ts`
- **Usado en**: `components/BoxComponent.tsx` 
- **Funcionamiento**: 
  - Registra automáticamente cada apertura de caja en `logs_caja_abierta`
  - Incluye información de la skin obtenida, tier, costo y método de pago
  - Se ejecuta tanto para cajas simples como múltiples

### 2. logSkinMejorada() - ⚠️ PARCIALMENTE IMPLEMENTADO
- **Ubicación**: `app/main/mejoras/page.tsx`
- **Estado**: Integrado en `handleDirectImprovement`, `handleRouletteWin`, `handleRouletteLose`
- **Problema**: Errores de tipo TypeScript persistentes (string | null vs string)
- **Funcionamiento**: 
  - Registra intentos de mejora exitosos y fallidos
  - Incluye probabilidad, skins descartadas, y resultado

## Datos que se registran ahora automáticamente:

### Al abrir cajas:
- Tabla: `logs_caja_abierta`
- Tabla: `logs_actividad_usuario` (tipo: 'caja_abierta')

### Al completar misiones:
- Tabla: `logs_historial_recompensas`
- Tabla: `logs_actividad_usuario` (tipo: 'mision_completada')

### Al mejorar skins (parcial):
- Tabla: `logs_skin_mejorada` (con errores de tipo)

## Estado de Funcionalidad:
- ✅ **logs_caja_abierta**: Totalmente funcional
- ✅ **logs_historial_recompensas**: Totalmente funcional  
- ✅ **logs_actividad_usuario**: Totalmente funcional
- ⚠️ **logs_skin_mejorada**: Implementado pero con errores de tipo
- ❌ **logs_skin_eliminada**: Aún no implementado en ningún flujo

## Próximos pasos sugeridos:
1. Arreglar los tipos en la función de mejora de skins
2. Implementar logging de eliminación de skins si existe esa funcionalidad

## Sistema de Logs y Misiones Automáticas - ✅ COMPLETADO
- **Fecha**: Actual
- **Implementación**: Schema de logs migrado y sistema de misiones automáticas

### Schema de Logs Migrado
1. **logs_caja_abierta**: Registra cada apertura de caja con skins obtenidas, costo y método de pago
2. **logs_skin_eliminada**: Registra eliminaciones de skins con contexto y motivo
3. **logs_skin_mejorada**: Registra intentos de mejora (reemplaza public.mejoras)
4. **logs_historial_recompensas**: Historial de recompensas de misiones
5. **logs_actividad_usuario**: Log de actividad general (nueva tabla)

### Funciones Utilitarias (lib/logUtils.ts) - ✅ ACTUALIZADAS
- `logCajaAbierta()`: Registra apertura de cajas → **logs_caja_abierta**
- `logSkinEliminada()`: Registra eliminación de skins → **logs_skin_eliminada**
- `logSkinMejorada()`: Registra mejoras de skins → **logs_skin_mejorada**
- `getEstadisticasUsuario()`: Estadísticas completas del usuario → **todas las tablas logs_**

### Funciones de Misiones (lib/missionUtils.ts)
- `inicializarMisionesUsuario()`: Crea progreso inicial para todas las misiones activas
- `verificarMisionesDisponibles()`: Verifica misiones listas para reclamar
- `procesarMisionLogin()`: Procesa misión de login diario
- `actualizarProgresoMision()`: Actualiza progreso basado en actividades

### Integración Automática
1. **Registro de usuarios**: Se inicializan misiones automáticamente en:
   - `/api/auth/register` (usuarios normales)
   - `app/auth.ts` (usuarios OAuth)
2. **Login**: Se procesa misión de login diario automáticamente
3. **Sidebar**: Muestra indicador de misiones disponibles para reclamar
4. **BoxUtils**: Función `processBoxOpeningWithLog()` registra logs automáticamente
5. **Inventario**: Registro automático al eliminar skins

### Archivos Modificados
- `app/auth.ts`: Inicialización de misiones OAuth
- `app/api/auth/register/route.ts`: Inicialización de misiones registro
- **`app/main/misiones/page.tsx`**: ✅ Actualizado para usar logs_historial_recompensas
- `components/app-sidebar.tsx`: Indicador de misiones disponibles
- `components/InventoryDisplayComponent.tsx`: Logging de eliminación
- **`lib/boxUtils.ts`**: Función con logging integrado usando logs_caja_abierta
- **`lib/logUtils.ts`**: ✅ Todas las referencias actualizadas a tablas logs_

### Estado del Sistema
- ✅ Schema logs migrado completamente al esquema public
- ✅ Todas las tablas accesibles desde API REST
- ✅ Funciones utilitarias actualizadas y funcionales
- ✅ Misiones se inicializan automáticamente
- ✅ Indicador en sidebar funcionando
- ✅ Logging integrado en operaciones principales
- ✅ Sistema de recompensas de misiones completamente funcional

### Problemas Resueltos
- ❌ Error 404 al acceder a logs.historial_recompensas → ✅ Resuelto con logs_historial_recompensas
- ❌ Falla en inserción de logs → ✅ Resuelto con migración completa
- ❌ Error al actualizar saldo de VP → ✅ Resuelto con mejor manejo de errores
- ❌ Logs de actividad inaccesibles → ✅ Resuelto con logs_actividad_usuario

## Fix Autenticación OAuth vs Credenciales - ✅ COMPLETADO
- **Fecha**: Actual
- **Problema**: Los usuarios OAuth tienen `password: null`, pero si intentaban iniciar sesión con credenciales normales, el servidor daba error genérico
- **Solución**: 
  - Añadido campo `oauth` al SELECT del query de usuarios en `CredentialsProvider` y endpoint `/api/auth/login`
  - Validación específica para detectar cuando un usuario OAuth intenta usar credenciales
  - Error más descriptivo: "Esta cuenta fue creada con Google/Discord. Por favor, inicia sesión usando el mismo método."
  - Código de error específico: `type: "oauth_account"`
- **Archivos modificados**:
  - `app/auth.ts`: Añadido campo `oauth` al SELECT y validación en CredentialsProvider
  - `app/api/auth/login/route.ts`: Añadido campo `oauth` al SELECT y validación específica

## Cambio de Estructura de Base de Datos - Eliminación de Columna `cantidad`

### Decisión Tomada
- **Fecha**: Actual
- **Cambio**: Se eliminó la columna `cantidad` de la tabla `inventario_usuario`
- **Nuevo sistema**: Cada skin se almacena como una fila separada con su propia `fecha_obtencion`

### Estructura Actual de `inventario_usuario`
- `id` (UUID) - Primary key
- `usuario_id` (UUID) - FK al usuario
- `skin_id` (varchar) - UUID de la skin de la API de Valorant
- `fecha_obtencion` (timestamp) - Fecha cuando se obtuvo esta instancia específica
- `skin_nombre` (text) - Nombre de la skin como fallback

### Archivos Actualizados

#### 1. `lib/boxUtils.ts` ✅ COMPLETADO
- **Función `addSkinToInventory`**: Siempre inserta nuevas filas, eliminada lógica de actualizar cantidad
- **Función `processBoxOpening`**: Actualizado tipos de retorno (solo "added" o "error")
- **Eliminado**: Todas las referencias a cantidad en operaciones de base de datos

#### 2. `components/InventoryDisplayComponent.tsx` ✅ COMPLETADO
- **Interface `InventoryItemFromDB`**: Eliminado campo `cantidad`, agregado `fecha_obtencion`
- **Query de base de datos**: Actualizado SELECT para nueva estructura
- **Lógica de eliminación**: Simplificada para eliminar filas directamente por ID
- **Interface `InventorySkin`**: Mantiene compatibilidad con UI existente

#### 3. `app/main/mejoras/page.tsx` ✅ COMPLETADO
- **Interface `InventoryItemFromDB`**: Actualizada para nueva estructura sin cantidad
- **Interface `Skin`**: Agregados campos `count` y `inventoryIds` para manejar agrupación
- **Función `loadUserInventory`**: Lógica completamente reescrita para agrupar skins duplicadas
- **Función `handleImprovement`**: Actualizada para trabajar con IDs individuales
- **Función `toggleSelectSkin`**: Actualizada para manejar selección con IDs individuales
- **Eliminación de skins**: Simplificada para eliminar filas directamente por ID

### Patrón Implementado para Compatibilidad
Para mantener la UI existente funcionando, se implementó un patrón donde:
1. **Base de datos**: Cada skin = una fila individual
2. **Lógica de presentación**: Las skins se agrupan por `skin_id` con contador `count`
3. **Operaciones**: Se mapean los contadores a operaciones individuales de filas

### Archivos Verificados (No requieren cambios)
- `app/main/[tipo]/page.tsx` ✅ - No usa lógica de cantidad de inventario
- `components/BoxComponent.tsx` ✅ - Usa `cantidad_skins` para probabilidades (diferente)
- `app/admin/page.tsx` ✅ - Usa `cantidad_skins` para configuración de cajas
- Scripts SQL ✅ - Solo usan `cantidad_skins` para probabilidades

### Beneficios del Nuevo Sistema
1. **Trazabilidad**: Cada skin tiene su fecha exacta de obtención
2. **Flexibilidad**: Fácil implementar funciones como "mostrar skins más recientes"
3. **Simplicidad**: Eliminación de lógica compleja de incremento/decremento de cantidad
4. **Consistencia**: Cada apertura de caja = una fila nueva, sin excepciones

### Problemas Resueltos
- **Concurrencia**: No más problemas de race conditions en actualizaciones de cantidad
- **Integridad**: Cada transacción se registra independientemente
- **Audit Trail**: Historial completo de cuándo se obtuvo cada skin

## Estado Final: ✅ MIGRACIÓN COMPLETADA

### Funcionalidades Verificadas
1. **Apertura de cajas**: ✅ Funciona correctamente (cada apertura = nueva fila)
2. **Visualización de inventario**: ✅ Muestra skins agrupadas con contador
3. **Sistema de mejoras**: ✅ Selección y eliminación de skins funcionando
4. **Eliminación de skins**: ✅ Operaciones directas por ID de fila

### Cambio Adicional: Siempre Modo Selección ✅ COMPLETADO
- **Fecha**: Actual  
- **Cambio**: Eliminado botón "Seleccionar Skins" / "Cancelar Selección"
- **Nuevo comportamiento**: Las skins siempre están en modo de selección
- **Archivos modificados**: `components/InventoryDisplayComponent.tsx`
  - Eliminado estado `isSelectionMode`
  - Eliminada función `toggleSelectionMode`
  - Eliminado botón del header
  - Simplificada lógica de clicks - siempre permiten selección
  - Checkbox de selección siempre visible

#### 4. Botón "Mejorar Skins" ✅ COMPLETADO
- **Fecha**: Actual
- **Funcionalidad**: Botón flotante que aparece cuando se seleccionan 1-5 skins
- **Ubicación**: Barra inferior que ocupa el ancho del inventario (max-w-7xl)
- **Animación**: Entrada y salida desde abajo con animación spring usando AnimatePresence
- **Diseño**: Div de fondo con gradiente y backdrop blur, botón centrado dentro
- **Posicionamiento**: Centrado horizontalmente con transform
- **Comportamiento**: Redirige a `/main/mejoras` y muestra contador de skins seleccionadas
- **Estilo**: Gradiente púrpura-rosa con efectos hover y backdrop blur

#### 5. Modal de Mejoras ✅ COMPLETADO
- **Fecha**: Actual
- **Funcionalidad**: Modal que se abre al hacer click en el botón "Mejorar Skins"
- **Características**:
  - Muestra las skins seleccionadas en un grid visual
  - Calcula porcentaje dinámico: 1 skin = 20%, 5 skins = 100%
  - Texto del botón actualizado a "x% de mejorar"
  - Modal con estilo consistente con la página (gradientes púrpura-rosa)
  - Vista previa de skins con imágenes, nombres y tiers
  - Botones de confirmación y cancelación
  - Redirección a `/main/mejoras` al confirmar

### Próximos Pasos Sugeridos
- Testear la funcionalidad completa en desarrollo
- Verificar que todas las animaciones y transiciones funcionan correctamente
- Considerar agregar funcionalidad para mostrar "skins más recientes" aprovechando fecha_obtencion 

## Cambios Recientes

### Arreglo de Función procesarMisionMultiApertura (Último)

**Problema:** Al abrir múltiples cajas a la vez (ej: 5 cajas), se completaban todas las misiones que cumplían el mínimo requerido (misiones de 2, 3, 4 y 5 cajas).

**Solución:** Modificada la función para que solo complete la misión que corresponde **exactamente** al número de cajas abiertas.

**Comportamiento Nuevo:**
- Si abres 5 cajas → Solo se completa la misión de "abrir 5 cajas a la vez"
- Si abres 4 cajas → Solo se completa la misión de "abrir 4 cajas a la vez"
- Si abres 3 cajas → Solo se completa la misión de "abrir 3 cajas a la vez"
- Si abres 2 cajas → Solo se completa la misión de "abrir 2 cajas a la vez"

**Cambios en `lib/missionUtils.ts`:**
- Reemplazado loop que procesaba todas las misiones válidas
- Agregada búsqueda de misión exacta con `find()`
- Solo procesa la misión que coincide exactamente con `cantidadCajasAbiertas`
- Mejorados logs de debugging con emoji indicators
- Mejor manejo de errores con early returns

**Resultado:** Sistema más preciso y justo donde cada acción específica completa solo su misión correspondiente.

### Botón "Reclamar Todas" en Misiones

**Nueva Funcionalidad:** Agregado botón para reclamar todas las misiones disponibles de una vez.

**Características:**
1. **Ubicación:** Tab "Reclamar", debajo de los tabs y encima de las misiones
2. **Visibilidad:** Solo se muestra si hay misiones para reclamar
3. **Funcionalidad:**
   - Reclama todas las misiones completadas en lote
   - Actualiza saldo acumulativo de una vez
   - Procesa actividades de misiones completadas
   - Manejo de errores individual por misión
4. **UX:**
   - Estado de loading con spinner
   - Botón deshabilitado durante procesamiento
   - Contador de misiones disponibles
   - Toast con resumen de recompensas

**Archivos Modificados:**
- `app/main/misiones/page.tsx`: Función `reclamarTodasLasRecompensas()` y botón UI

### Arreglo del Sistema de Actualización de Saldo

**Problema:** Al abrir cajas, el saldo del usuario no se actualizaba en el sidebar.

**Solución:**
1. **Mejorado `lib/saldoUtils.ts`:**
   - Agregada función `decrementarSaldoLocal(cantidad)` para cuando se gasta VP
   - Agregada función `actualizarSaldoLocal(nuevoCantidad)` para actualización directa
   - Agregados logs de debugging

2. **Actualizado `components/app-sidebar.tsx`:**
   - Agregado manejo de eventos `saldoDecrementado` y `saldoNuevo`
   - Mejorado sistema de escucha de eventos
   - Agregados logs de debugging

3. **Actualizado `components/BoxComponent.tsx`:**
   - Cambiado de `saldoActualizado` genérico a `decrementarSaldoLocal(precio)` específico
   - Agregada validación para no decrementar saldo en cajas gratuitas

4. **Actualizado `app/main/misiones/page.tsx`:**
   - Cambiado de evento genérico a `incrementarSaldoLocal(cantidad)` específico

**Resultado:** Saldo se actualiza instantáneamente en sidebar sin recargar desde DB

### Eliminación de Archivo Obsoleto

**Archivo Eliminado:** `app/api/misiones/inicializar-manual/route.ts`

**Razón:** Era una herramienta de debug/administración que ya no se usaba en el código actual. Las misiones ahora se inicializan automáticamente durante el registro.

## Arquitectura Actual

### Sistema de Eventos de Saldo
- `saldoActualizado`: Recarga saldo desde DB
- `saldoIncrementado`: Incrementa saldo local (misiones, etc.)
- `saldoDecrementado`: Decrementa saldo local (cajas, compras)
- `saldoNuevo`: Actualización directa del saldo

### Sistema de Misiones
- Inicialización automática en registro/OAuth
- Procesamiento de actividades para misiones progresivas
- Reclamación individual y masiva de recompensas
- Tres tipos de vista: Reclamar, En progreso, Completadas

## Problemas Conocidos y Soluciones

### Fix de Misiones "Completar Misiones" que se cuentan a sí mismas (Identificado)
- **Fecha**: Actual
- **Problema**: Las misiones de "completar misiones" se cuentan a sí mismas, creando un bucle recursivo
- **Causa**: En `obtenerEstadisticasUsuario`, la consulta cuenta TODAS las misiones sin filtrar tipo
- **Comportamiento problemático**:
  1. Usuario completa misión normal → Se registra en logs
  2. Misión "Completar 1 misión" cuenta esa misión normal
  3. Usuario reclama "Completar 1 misión" → Se registra en logs
  4. Misión "Completar 2 misiones" cuenta: misión normal + misión "Completar 1 misión"
  5. ¡Bucle infinito! Las misiones de completar se cuentan a sí mismas
- **Solución requerida**: Filtrar en `obtenerEstadisticasUsuario` para excluir `condicion.tipo !== 'completar_misiones'`
- **Archivo afectado**: `lib/missionUtils.ts` línea ~452 en función `obtenerEstadisticasUsuario`
- **Estado**: Identificado, requiere implementación

### Fix de Misiones de Conseguir Skins por Tier Específico (Último)

### Saldo no se actualiza
- **Causa:** Evento incorrecto o no específico
- **Solución:** Usar eventos específicos (`incrementarSaldoLocal`, `decrementarSaldoLocal`)

### Misiones no progresivas
- **Causa:** No se procesan actividades después de acciones
- **Solución:** Llamar a `/api/misiones/procesar-actividad` con tipo y cantidad

## Buenas Prácticas Implementadas

1. **Eventos Específicos:** Usar eventos específicos para actualizaciones de estado
2. **Manejo de Errores:** Continuar procesamiento aunque falle una operación individual
3. **Feedback Visual:** Estados de loading y mensajes informativos
4. **Validaciones:** Verificar condiciones antes de procesar acciones
5. **Logging:** Registros para debugging y monitoreo

## Decisiones Importantes

### Sistema de Misiones
- Las misiones progresivas se activan completando misiones anteriores
- Se utilizan eventos personalizados para actualizar el sidebar sin recargar
- Sistema de logs para tracking de actividades

### Gestión de Skins
- Uso de `formatSkinForApp()` para consistencia en el formato
- Sistema de tiers con grados numéricos para ordenamiento
- Caché de skins de la API de Valorant

### Base de Datos
- Uso de Supabase con RLS habilitado
- Tablas separadas para inventario, misiones, y logs
- Sistema de probabilidades por tier en cajas

## Patrones Recurrentes

1. **Eventos Personalizados:** Usar eventos DOM para comunicación entre componentes
2. **Validación de Entrada:** Siempre validar datos de usuario y API
3. **Logs de Debug:** Incluir logs útiles para troubleshooting
4. **Manejo de Errores:** Try-catch con fallbacks apropiados 