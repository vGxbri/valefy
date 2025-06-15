import { createClient } from '@/utils/supabase/client';

const supabase = createClient();

// Interfaz para log de caja abierta
export interface CajaAbiertaLog {
  usuario_id: string;
  caja_id: string;
  skins_conseguidas: Array<{
    skin_id: string;
    skin_nombre: string;
    tier_id: string;
    tier_nombre: string;
    tier_color: string;
  }>;
  costo: number;
  metodo_pago?: string;
}

// Interfaz para log de skin eliminada
export interface SkinEliminadaLog {
  usuario_id: string;
  skins_eliminadas: Array<{
    skin_id: string;
    skin_nombre: string;
    inventario_id: string;
  }>;
  motivo?: string;
  contexto?: any;
}

// Interfaz para log de skin mejorada
export interface SkinMejoradaLog {
  usuario_id: string;
  exitoso: boolean;
  probabilidad_calculada: number;
  skin_objetivo_id?: string;
  skin_objetivo_nombre: string;
  skins_descartadas: Array<{
    skin_id: string;
    skin_nombre: string;
    inventario_id: string;
  }>;
  tier_objetivo_id?: string;
  cantidad_skins_usadas: number;
}

// Función para registrar apertura de caja
export async function logCajaAbierta(data: CajaAbiertaLog) {
  try {
    const { error } = await supabase
      .from('logs_caja_abierta')
      .insert([data]);

    if (error) {
      console.error('Error al registrar log de caja abierta:', error);
      return { success: false, error };
    }

    return { success: true };
  } catch (error) {
    console.error('Error al registrar log de caja abierta:', error);
    return { success: false, error };
  }
}

// Función para registrar eliminación de skins
export async function logSkinEliminada(data: SkinEliminadaLog) {
  try {
    const { error } = await supabase
      .from('logs_skin_eliminada')
      .insert([data]);

    if (error) {
      console.error('Error al registrar log de skin eliminada:', error);
      return { success: false, error };
    }

    return { success: true };
  } catch (error) {
    console.error('Error al registrar log de skin eliminada:', error);
    return { success: false, error };
  }
}

// Función para registrar mejora de skins
export async function logSkinMejorada(data: SkinMejoradaLog) {
  try {
    const { error } = await supabase
      .from('logs_skin_mejorada')
      .insert([data]);

    if (error) {
      console.error('Error al registrar log de skin mejorada:', error);
      return { success: false, error };
    }

    return { success: true };
  } catch (error) {
    console.error('Error al registrar log de skin mejorada:', error);
    return { success: false, error };
  }
}

// Función para obtener estadísticas de un usuario
export async function getEstadisticasUsuario(userId: string) {
  try {
    // Cajas abiertas
    const { count: cajasAbiertas } = await supabase
      .from('logs_caja_abierta')
      .select('*', { count: 'exact', head: true })
      .eq('usuario_id', userId);

    // Skins obtenidas
    const { data: cajasData } = await supabase
      .from('logs_caja_abierta')
      .select('skins_conseguidas')
      .eq('usuario_id', userId);

    const totalSkinsObtenidas = cajasData?.reduce((total, caja) => {
      return total + (caja.skins_conseguidas?.length || 0);
    }, 0) || 0;

    // VP total gastado en cajas
    const { data: costoData } = await supabase
      .from('logs_caja_abierta')
      .select('costo')
      .eq('usuario_id', userId);

    const totalVPGastado = costoData?.reduce((total, caja) => {
      return total + (caja.costo || 0);
    }, 0) || 0;

    // VP total ganado en misiones
    const { data: recompensasData } = await supabase
      .from('logs_historial_recompensas')
      .select('vp_otorgados')
      .eq('usuario_id', userId);

    const totalVPGanado = recompensasData?.reduce((total, recompensa) => {
      return total + (recompensa.vp_otorgados || 0);
    }, 0) || 0;

    // Skins eliminadas
    const { data: eliminadasData } = await supabase
      .from('logs_skin_eliminada')
      .select('skins_eliminadas')
      .eq('usuario_id', userId);

    const totalSkinsEliminadas = eliminadasData?.reduce((total, log) => {
      return total + (log.skins_eliminadas?.length || 0);
    }, 0) || 0;

    // Intentos de mejora
    const { count: intentosMejora } = await supabase
      .from('logs_skin_mejorada')
      .select('*', { count: 'exact', head: true })
      .eq('usuario_id', userId);

    // Mejoras exitosas
    const { count: mejorasExitosas } = await supabase
      .from('logs_skin_mejorada')
      .select('*', { count: 'exact', head: true })
      .eq('usuario_id', userId)
      .eq('exitoso', true);

    return {
      success: true,
      data: {
        cajasAbiertas: cajasAbiertas || 0,
        totalSkinsObtenidas,
        totalVPGastado,
        totalVPGanado,
        totalSkinsEliminadas,
        intentosMejora: intentosMejora || 0,
        mejorasExitosas: mejorasExitosas || 0,
        tasaExitoMejoras: intentosMejora ? ((mejorasExitosas || 0) / intentosMejora * 100).toFixed(1) : '0'
      }
    };
  } catch (error) {
    console.error('Error al obtener estadísticas del usuario:', error);
    return { success: false, error };
  }
} 