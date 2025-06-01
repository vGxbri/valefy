# 🔗 Integración del Sistema de Misiones - Ejemplos

## 📦 **1. Integración en Apertura de Cajas**

### **API Route para Abrir Cajas**
```typescript
// app/api/abrir-caja/route.ts
import { procesarMisionMultiApertura, actualizarProgresoMision } from '@/lib/missionUtils';

export async function POST(request: Request) {
  const { userId, cajaId, cantidad } = await request.json();
  
  try {
    // ... lógica de apertura de cajas ...
    
    // DESPUÉS de abrir las cajas exitosamente:
    
    // 1. Actualizar progreso de misiones normales de apertura
    await actualizarProgresoMision(userId, 'caja_abierta', cantidad);
    
    // 2. Si se abrieron 5+ cajas, procesar misión de multi-apertura
    if (cantidad >= 5) {
      const resultadoMulti = await procesarMisionMultiApertura(userId, cantidad);
      if (resultadoMulti.listoParaReclamar) {
        // Añadir notificación de misión completada
        notificaciones.push({
          tipo: 'mision_completada',
          titulo: '¡Misión Completada!',
          mensaje: 'Multi-Apertura lista para reclamar'
        });
      }
    }
    
    return Response.json({ 
      success: true, 
      skins: skinsObtenidas,
      notificaciones 
    });
  } catch (error) {
    return Response.json({ success: false, error });
  }
}
```

## 🔄 **2. Sistema de Reset Automático**

### **Cron Job o Scheduled Function**
```typescript
// app/api/reset-misiones/route.ts
import { resetearMisionesRepetibles } from '@/lib/missionUtils';

export async function POST() {
  try {
    // Obtener todos los usuarios activos
    const { data: usuarios } = await supabase
      .from('usuarios')
      .select('id');
    
    let reseteadas = 0;
    
    for (const usuario of usuarios || []) {
      const resultado = await resetearMisionesRepetibles(usuario.id);
      if (resultado.success) {
        reseteadas++;
      }
    }
    
    return Response.json({ 
      success: true, 
      mensaje: `Misiones reseteadas para ${reseteadas} usuarios` 
    });
  } catch (error) {
    return Response.json({ success: false, error });
  }
}
```

## 🎯 **3. Notificaciones en el Sidebar**

### **Actualizar AppSidebar**
```typescript
// components/app-sidebar.tsx (añadir al useEffect existente)

useEffect(() => {
  const verificarYProcesarMisiones = async () => {
    if (status === "authenticated" && session?.user?.id) {
      try {
        // Procesar misión de login
        await procesarMisionLogin(session.user.id);
        
        // Verificar misiones disponibles
        const resultado = await verificarMisionesDisponibles(session.user.id);
        if (resultado.success) {
          setMisionesDisponibles(resultado.cantidad);
          
          // 🆕 NUEVO: Notificar si hay misiones disponibles
          if (resultado.cantidad > 0) {
            setNotifications(prev => [
              ...prev.filter(n => n.id !== 'misiones-disponibles'), // Remover notificación anterior
              {
                id: 'misiones-disponibles',
                title: '¡Misiones Disponibles!',
                description: `Tienes ${resultado.cantidad} misión(es) lista(s) para reclamar`,
                time: 'Ahora',
                type: 'mision'
              }
            ]);
          }
        }
      } catch (error) {
        console.error("Error al verificar misiones:", error);
      }
    }
  };

  verificarYProcesarMisiones();
}, [session, status]);
```

## 🗑️ **4. Integración con Eliminación de Skins**

### **API Route para Eliminar Skins**
```typescript
// app/api/eliminar-skin/route.ts
import { actualizarProgresoMision } from '@/lib/missionUtils';

export async function DELETE(request: Request) {
  const { userId, skinIds } = await request.json();
  
  try {
    // ... lógica de eliminación de skins ...
    
    // DESPUÉS de eliminar exitosamente:
    const cantidadEliminadas = skinIds.length;
    await actualizarProgresoMision(userId, 'skin_eliminada', cantidadEliminadas);
    
    return Response.json({ 
      success: true, 
      eliminadas: cantidadEliminadas 
    });
  } catch (error) {
    return Response.json({ success: false, error });
  }
}
```

## ⚡ **5. Integración con Sistema de Mejoras**

### **API Route para Mejoras**
```typescript
// app/api/mejorar-skin/route.ts
import { actualizarProgresoMision } from '@/lib/missionUtils';

export async function POST(request: Request) {
  const { userId, skinId, exitoso } = await request.json();
  
  try {
    // ... lógica de mejora ...
    
    // Si la mejora fue exitosa
    if (exitoso) {
      await actualizarProgresoMision(userId, 'mejora_realizada', 1);
    }
    
    return Response.json({ success: true, exitoso });
  } catch (error) {
    return Response.json({ success: false, error });
  }
}
```

## 🕘 **6. Sistema de Reset Diario (Vercel Cron)**

### **vercel.json**
```json
{
  "crons": [
    {
      "path": "/api/reset-diario",
      "schedule": "0 9 * * *"
    }
  ]
}
```

### **API Route para Reset Diario**
```typescript
// app/api/reset-diario/route.ts
export async function GET() {
  try {
    // Reset de misiones diarias a las 9 AM
    const { data: usuarios } = await supabase
      .from('usuarios')
      .select('id');
    
    for (const usuario of usuarios || []) {
      // El sistema ya maneja automáticamente el reset en procesarMisionLogin
      // Pero podríamos añadir lógica adicional aquí si es necesario
    }
    
    return Response.json({ success: true, timestamp: new Date().toISOString() });
  } catch (error) {
    return Response.json({ success: false, error });
  }
}
```

## 🎮 **7. Componente de Progreso en Tiempo Real**

### **Hook personalizado para misiones**
```typescript
// hooks/useMisiones.ts
import { useState, useEffect } from 'react';
import { verificarMisionesDisponibles } from '@/lib/missionUtils';

export function useMisiones(userId: string | undefined) {
  const [misionesDisponibles, setMisionesDisponibles] = useState(0);
  const [loading, setLoading] = useState(false);
  
  const actualizarMisiones = async () => {
    if (!userId) return;
    
    setLoading(true);
    try {
      const resultado = await verificarMisionesDisponibles(userId);
      if (resultado.success) {
        setMisionesDisponibles(resultado.cantidad);
      }
    } catch (error) {
      console.error('Error al actualizar misiones:', error);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    actualizarMisiones();
  }, [userId]);
  
  return { misionesDisponibles, loading, actualizarMisiones };
}
```

## 🏆 **8. Badge de Misiones en la UI**

### **Componente de Badge**
```typescript
// components/MisionBadge.tsx
import { Bell } from 'lucide-react';

interface MisionBadgeProps {
  cantidad: number;
}

export function MisionBadge({ cantidad }: MisionBadgeProps) {
  if (cantidad === 0) return null;
  
  return (
    <div className="relative">
      <Bell className="h-5 w-5 text-primary/80 animate-pulse" />
      <span className="absolute -top-1 -right-1 inline-flex items-center justify-center h-4 w-4 rounded-full bg-red-500 text-[10px] text-white font-bold animate-bounce">
        {cantidad}
      </span>
    </div>
  );
}
```

## 📱 **9. Toast Notifications**

### **Usar con Sonner**
```typescript
// utils/notifications.ts
import { toast } from 'sonner';

export function mostrarNotificacionMision(tipo: 'completada' | 'disponible', datos: any) {
  if (tipo === 'completada') {
    toast.success('¡Misión Completada!', {
      description: `${datos.nombre} - +${datos.recompensa} VP`,
      duration: 5000,
    });
  } else if (tipo === 'disponible') {
    toast.info('Misión Lista', {
      description: `${datos.nombre} está lista para reclamar`,
      duration: 3000,
    });
  }
}
```

## 🔄 **10. Actualización Automática del Saldo**

### **Después de reclamar recompensas**
```typescript
// En tu página de misiones, después de reclamar:

const reclamarRecompensa = async (misionUsuario: MisionUsuario) => {
  // ... lógica existente ...
  
  // Actualizar hook de misiones
  if (actualizarMisiones) {
    await actualizarMisiones();
  }
  
  // Actualizar saldo en el sidebar
  // (El saldo se actualiza automáticamente en cargarSaldo)
};
```

## ⚙️ **Configuración Recomendada**

1. **Ejecutar `procesarMisionLogin`** en cada inicio de sesión
2. **Llamar funciones de progreso** después de cada actividad relevante
3. **Verificar misiones disponibles** periódicamente (cada 30 segundos)
4. **Reset automático** de misiones repetibles al completarse
5. **Notificaciones en tiempo real** cuando se completen misiones 