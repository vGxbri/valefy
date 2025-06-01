# 📋 Manual del Sistema de Misiones - Valefy

## 🎯 **Cómo Funciona el Sistema**

### **Estructura de la Base de Datos**

#### **Tabla `misiones`**
```sql
- id: UUID único de la misión
- nombre: Nombre descriptivo de la misión
- descripcion: Descripción para mostrar al usuario
- recompensa_vp: Puntos VP que otorga al completarse
- tipo: 'diaria' | 'semanal' | 'unica' | 'repetible'
- categoria: Agrupa misiones relacionadas
- condicion: JSONB con reglas para completar la misión
- activa: Boolean - si está disponible
- orden: Número para ordenar en la UI
- icono: Nombre del icono a mostrar
```

#### **Tabla `misiones_usuario`**
```sql
- id: UUID único del progreso
- usuario_id: ID del usuario
- mision_id: ID de la misión
- completada: Boolean - si ya se reclamó la recompensa
- fecha_completada: Timestamp de cuándo se completó
- progreso: JSONB {"actual": number, "objetivo": number}
```

### **Campo `condicion` - Explicación Detallada**

El campo `condicion` es un JSONB que define QUÉ debe hacer el usuario para completar la misión:

```json
{
  "tipo": "tipo_de_actividad",
  "cantidad": número_objetivo,
  "opciones_adicionales": "..."
}
```

#### **Tipos de Condición Soportados:**

1. **Login Diario**
```json
{
  "tipo": "login",
  "cantidad": 1
}
```

2. **Abrir Cajas (Individual)**
```json
{
  "tipo": "caja_abierta",
  "cantidad": 10
}
```

3. **Multi-Apertura (5 cajas a la vez)**
```json
{
  "tipo": "abrir_multiples", 
  "cantidad": 5,
  "minimo_por_sesion": 5
}
```

4. **Eliminar Skins**
```json
{
  "tipo": "skin_eliminada",
  "cantidad": 3
}
```

5. **Mejoras de Skins**
```json
{
  "tipo": "mejora_realizada",
  "cantidad": 1
}
```

## 🚀 **Cómo Añadir Nuevas Misiones**

### **1. Crear la Misión en la Base de Datos**

```sql
INSERT INTO misiones (
  nombre, 
  descripcion, 
  recompensa_vp, 
  tipo, 
  categoria, 
  condicion, 
  activa, 
  orden, 
  icono
) VALUES (
  'Nombre de la Misión',
  'Descripción para el usuario',
  100,  -- VP de recompensa
  'repetible',  -- tipo: diaria/semanal/unica/repetible
  'cajas',  -- categoría para agrupar
  '{"tipo": "caja_abierta", "cantidad": 5}',  -- condición JSONB
  true,  -- activa
  30,  -- orden de visualización
  'Gift'  -- icono (debe existir en ICONOS_MAP)
);
```

### **2. Iconos Disponibles**

Los iconos están definidos en `ICONOS_MAP` en el archivo de misiones:
- `LogIn` - Para login
- `Package` - Para cajas
- `Gift` - Para recompensas
- `Shirt` - Para skins
- `UserPlus` - Para registro
- `TrendingUp` - Para mejoras
- `CircleOff` - Para eliminación
- `Trophy` - Para logros
- `Crown` - Para especiales

### **3. Categorías Recomendadas**
- `diarias` - Misiones diarias
- `cajas` - Relacionadas con apertura de cajas
- `skins` - Relacionadas con conseguir skins
- `inventario` - Gestión de inventario
- `mejoras` - Sistema de mejoras
- `cuenta` - Progreso general

## 🔧 **Funciones del Sistema**

### **Funciones Principales (en `lib/missionUtils.ts`)**

1. **`inicializarMisionesUsuario(userId)`**
   - Crea el progreso inicial para todas las misiones activas
   - Se ejecuta cuando un usuario se registra

2. **`procesarMisionLogin(userId)`**
   - Maneja el login diario con reset a las 9 AM
   - Permite reclamar cada día a partir de las 9 AM

3. **`procesarMisionMultiApertura(userId, cantidadCajas)`**
   - Detecta cuando se abren 5+ cajas a la vez
   - Solo cuenta si se cumplen los criterios

4. **`resetearMisionesRepetibles(userId)`**
   - Reset automático de misiones repetibles completadas

5. **`verificarMisionesDisponibles(userId)`**
   - Verifica cuántas misiones están listas para reclamar

## 📝 **Ejemplos de Uso**

### **Login Diario Automático**
```typescript
// En tu componente o API route
import { procesarMisionLogin } from '@/lib/missionUtils';

// Al hacer login
const resultado = await procesarMisionLogin(session.user.id);
```

### **Multi-Apertura de Cajas**
```typescript
// Cuando el usuario abre múltiples cajas
import { procesarMisionMultiApertura } from '@/lib/missionUtils';

// Si el usuario abre 5 cajas a la vez
const resultado = await procesarMisionMultiApertura(userId, 5);
if (resultado.listoParaReclamar) {
  // Mostrar notificación de misión completada
}
```

### **Progreso de Actividades**
```typescript
// Para actividades generales
import { actualizarProgresoMision } from '@/lib/missionUtils';

// Cuando se abre una caja
await actualizarProgresoMision(userId, 'caja_abierta', 1);

// Cuando se elimina una skin
await actualizarProgresoMision(userId, 'skin_eliminada', 1);
```

## 🕘 **Sistema de Tiempo para Misiones Diarias**

### **Reset a las 9 AM**
- Las misiones diarias se pueden reclamar de nuevo cada día a las 9 AM
- Si es antes de las 9 AM, se considera el día anterior
- Permite perfecta sincronización con tu horario

### **Ejemplo de Misión Semanal**
```sql
INSERT INTO misiones (...) VALUES (
  'Apertura Semanal',
  'Abre 20 cajas esta semana',
  500,
  'semanal',
  'cajas',
  '{"tipo": "caja_abierta", "cantidad": 20, "periodo": "semanal"}',
  true,
  40,
  'Calendar'
);
```

## 🔄 **Tipos de Misión**

1. **`diaria`**: Se resetea cada día a las 9 AM
2. **`semanal`**: Se resetea cada lunes a las 9 AM  
3. **`unica`**: Solo se puede completar una vez
4. **`repetible`**: Se puede hacer múltiples veces, se resetea al completarse

## 📊 **Mejores Prácticas**

### **Recompensas Balanceadas**
- Diarias: 25-50 VP
- Semanales: 100-200 VP  
- Únicas importantes: 200+ VP
- Repetibles: 50-150 VP

### **Progressión Lógica**
- Ordena las misiones por dificultad
- Las primeras misiones deben ser fáciles
- Incrementa dificultad gradualmente

### **Categorización Clara**
- Agrupa misiones similares en la misma categoría
- Usa iconos consistentes por categoría
- Mantén descripciones claras y motivadoras 