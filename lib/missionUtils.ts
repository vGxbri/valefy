import { createClient } from '@/utils/supabase/client';

const supabase = createClient();

// Función helper para obtener progreso actual según el tipo de misión
const obtenerProgresoActualPorTipo = (estadisticas: any, tipo: string, tierUuid?: string): number => {
  switch (tipo) {
    case 'caja_abierta':
      return estadisticas.cajasAbiertas;
    case 'skin_eliminada':
      return estadisticas.skinsEliminadas;
    case 'mejora_realizada':
      return estadisticas.mejorasRealizadas;
    case 'conseguir_skin':
      return estadisticas.skinsConseguidas;
    case 'completar_misiones':
      return estadisticas.misionesCompletadas;
    case 'aniversario':
      return estadisticas.diasDesdeRegistro;
    case 'conseguir_skin_tier':
      return tierUuid ? (estadisticas.skinsPorTier[tierUuid] || 0) : 0;
    default:
      return 0;
  }
};

// Función para inicializar misiones para un usuario
export async function inicializarMisionesUsuario(userId: string) {
  try {
    // Verificar si el usuario ya tiene misiones inicializadas
    const { count: misionesExistentes } = await supabase
      .from("misiones_usuario")
      .select("*", { count: "exact", head: true })
      .eq("usuario_id", userId);

    if (misionesExistentes && misionesExistentes > 0) {      
      // Sincronizar misiones nuevas que puedan haberse añadido
      await sincronizarMisionesNuevas(userId);
      const resultadoBienvenida = await procesarMisionRegistro(userId);
      
      return { 
        success: true, 
        message: `Usuario ya tenía misiones inicializadas (${misionesExistentes})`,
        misionesExistentes,
        bienvenidaProcesada: resultadoBienvenida.success
      };
    }

    // Obtener todas las misiones activas
    const { data: misiones, error: misionesError } = await supabase
      .from("misiones")
      .select("*")
      .eq("activa", true)
      .order("orden");

    if (misionesError) {
      console.error("Error al obtener misiones:", misionesError);
      return { success: false, error: misionesError };
    }

    if (!misiones || misiones.length === 0) {
      return { success: true, message: "No hay misiones activas" };
    }

    // Crear progreso inicial para cada misión (solo las que debe tener disponibles inicialmente)
    const misionesParaInicializar = await obtenerMisionesDisponiblesParaUsuario(userId, misiones);
    
    // Obtener estadísticas para calcular progreso real
    const estadisticas = await obtenerEstadisticasUsuario(userId);
    
    const misionesUsuario = misionesParaInicializar.map(mision => {
      const objetivoDefault = mision.condicion?.cantidad || 1;
      const tipo = mision.condicion?.tipo;
      const tierUuid = mision.condicion?.tier_uuid;
      
      // Calcular progreso real basado en estadísticas
      let progresoActual = 0;
      if (tipo && ['caja_abierta', 'skin_eliminada', 'mejora_realizada', 'conseguir_skin', 'completar_misiones', 'aniversario', 'conseguir_skin_tier'].includes(tipo)) {
        progresoActual = obtenerProgresoActualPorTipo(estadisticas, tipo, tierUuid);
        progresoActual = Math.min(progresoActual, objetivoDefault);
      }
      
      return {
        usuario_id: userId,
        mision_id: mision.id,
        progreso: { actual: progresoActual, objetivo: objetivoDefault },
        completada: false
      };
    });

    // Insertar todas las misiones de una vez
    if (misionesUsuario.length > 0) {
      const { error: insertError } = await supabase
        .from("misiones_usuario")
        .insert(misionesUsuario);

      if (insertError) {
        console.error("Error al insertar misiones de usuario:", insertError);
        return { success: false, error: insertError };
      }
    }

    // Procesar automáticamente la misión de bienvenida
    const resultadoBienvenida = await procesarMisionRegistro(userId);
    if (resultadoBienvenida.success) {
    } else {
      console.warn("⚠️ Error al procesar misión de bienvenida:", resultadoBienvenida.error);
    }

    return { 
      success: true, 
      message: `${misionesUsuario.length} misiones inicializadas correctamente`,
      misionesCreadas: misionesUsuario.length,
      bienvenidaProcesada: resultadoBienvenida.success
    };
  } catch (error) {
    console.error("Error al inicializar misiones:", error);
    return { success: false, error };
  }
}

// Función para sincronizar misiones nuevas que se hayan añadido al sistema
async function sincronizarMisionesNuevas(userId: string) {
  try {
    // Obtener todas las misiones activas del sistema
    const { data: misionesActivas, error: misionesError } = await supabase
      .from("misiones")
      .select("*")
      .eq("activa", true);

    if (misionesError || !misionesActivas) return;

    // Obtener misiones que ya tiene el usuario
    const { data: misionesUsuario, error: usuarioError } = await supabase
      .from("misiones_usuario")
      .select("mision_id")
      .eq("usuario_id", userId);

    if (usuarioError) return;

    const misionesQueYaTiene = new Set(misionesUsuario?.map(m => m.mision_id) || []);
    
    // Encontrar misiones que debería tener pero no tiene
    const misionesDisponibles = await obtenerMisionesDisponiblesParaUsuario(userId, misionesActivas);
    const misionesParaAñadir = misionesDisponibles.filter(mision => !misionesQueYaTiene.has(mision.id));

    if (misionesParaAñadir.length > 0) {
      // Obtener estadísticas para calcular progreso real
      const estadisticas = await obtenerEstadisticasUsuario(userId);
      
      const nuevasMisiones = misionesParaAñadir.map(mision => {
        const objetivoDefault = mision.condicion?.cantidad || 1;
        const tipo = mision.condicion?.tipo;
        const tierUuid = mision.condicion?.tier_uuid;
        
        // Calcular progreso real basado en estadísticas
        let progresoActual = 0;
        if (tipo && ['caja_abierta', 'skin_eliminada', 'mejora_realizada', 'conseguir_skin', 'completar_misiones', 'aniversario', 'conseguir_skin_tier'].includes(tipo)) {
          progresoActual = obtenerProgresoActualPorTipo(estadisticas, tipo, tierUuid);
          // Limitar el progreso al objetivo para evitar excesos
          progresoActual = Math.min(progresoActual, objetivoDefault);
        }
        
        return {
          usuario_id: userId,
          mision_id: mision.id,
          progreso: { actual: progresoActual, objetivo: objetivoDefault },
          completada: false
        };
      });

      await supabase
        .from("misiones_usuario")
        .insert(nuevasMisiones);
    }
  } catch (error) {
    console.error("Error al sincronizar misiones nuevas:", error);
  }
}

// Función para determinar qué misiones debe tener disponibles un usuario
async function obtenerMisionesDisponiblesParaUsuario(userId: string, misiones: any[]) {
  const misionesDisponibles = [];
  
  // Obtener estadísticas actuales del usuario desde los logs
  const estadisticas = await obtenerEstadisticasUsuario(userId);
  
  // Obtener misiones ya completadas por el usuario con más detalle
  const { data: misionesCompletadas } = await supabase
    .from("misiones_usuario")
    .select(`
      mision_id,
      mision:misiones!inner(
        condicion
      )
    `)
    .eq("usuario_id", userId)
    .eq("completada", true);
  
  // Agrupar misiones completadas por tipo para facilitar búsqueda
  const misionesCompletadasPorTipo: Record<string, number[]> = {};
  const misionesCompletadasPorTierTipo: Record<string, Record<string, number[]>> = {};
  
  if (misionesCompletadas) {
    for (const misionCompleta of misionesCompletadas) {
      const mision = misionCompleta.mision as any;
      const condicion = mision.condicion;
      const tipo = condicion.tipo;
      const cantidad = condicion.cantidad;
      
      if (!misionesCompletadasPorTipo[tipo]) {
        misionesCompletadasPorTipo[tipo] = [];
      }
      misionesCompletadasPorTipo[tipo].push(cantidad);
      
      // Para misiones por tier, también agrupar por tier específico
      if (tipo === 'conseguir_skin_tier' && condicion.tier_uuid) {
        if (!misionesCompletadasPorTierTipo[tipo]) {
          misionesCompletadasPorTierTipo[tipo] = {};
        }
        if (!misionesCompletadasPorTierTipo[tipo][condicion.tier_uuid]) {
          misionesCompletadasPorTierTipo[tipo][condicion.tier_uuid] = [];
        }
        misionesCompletadasPorTierTipo[tipo][condicion.tier_uuid].push(cantidad);
      }
    }
  }
  
  // Agrupar misiones por tipo y tier para facilitar verificación de progresión
  const misionesPorTipo: Record<string, any[]> = {};
  for (const mision of misiones) {
    const tipo = mision.condicion?.tipo;
    if (tipo) {
      // Para misiones de tier, usar una clave única que incluya el tier
      const claveTipo = tipo === 'conseguir_skin_tier' 
        ? `${tipo}_${mision.condicion.tier_uuid}` 
        : tipo;
      
      if (!misionesPorTipo[claveTipo]) {
        misionesPorTipo[claveTipo] = [];
      }
      misionesPorTipo[claveTipo].push(mision);
    }
  }
  
  // Procesar cada tipo de misión por separado
  const tiposProgresivos = ['caja_abierta', 'skin_eliminada', 'mejora_realizada', 'conseguir_skin', 'completar_misiones', 'aniversario'];
  
  for (const mision of misiones) {
    const condicion = mision.condicion;
    const tipo = condicion.tipo;
    
    // Misiones que siempre están disponibles (únicas y no progresivas)
    if (['registro', 'login'].includes(tipo)) {
      misionesDisponibles.push(mision);
      continue;
    }
    
    // Misiones multi-apertura (siempre disponibles pero no repetibles)
    if (tipo === 'abrir_multiples') {
      misionesDisponibles.push(mision);
      continue;
    }
    
    // Para misiones progresivas, verificar si es la siguiente que debería estar disponible
    if (tiposProgresivos.includes(tipo)) {
      const claveTipo = tipo;
      const misionesDelTipo = misionesPorTipo[claveTipo] || [];
      
      const esLaSiguiente = esMisionProgresivaSiguiente(mision, estadisticas, misionesCompletadasPorTipo, misionesDelTipo);
      
      if (esLaSiguiente) {
        misionesDisponibles.push(mision);
      }
    }
    
    // Para misiones de conseguir skins por tier (progresivas por cada tier)
    if (tipo === 'conseguir_skin_tier') {
      const claveTipo = `${tipo}_${condicion.tier_uuid}`;
      const misionesDelTipo = misionesPorTipo[claveTipo] || [];
      
      const esLaSiguiente = esMisionProgresivaSiguientePorTier(mision, estadisticas, misionesCompletadasPorTierTipo, misionesDelTipo);
      
      if (esLaSiguiente) {
        misionesDisponibles.push(mision);
      }
    }
  }
  
  return misionesDisponibles;
}

// Función para verificar si una misión progresiva es la siguiente disponible
function esMisionProgresivaSiguiente(mision: any, estadisticas: any, misionesCompletadasPorTipo: Record<string, number[]>, misionesDelMismoTipo: any[]): boolean {
  const condicion = mision.condicion;
  const cantidadObjetivo = condicion.cantidad;
  const tipo = condicion.tipo;
  
  let estadisticaActual = 0;
  
  switch (tipo) {
    case 'caja_abierta':
      estadisticaActual = estadisticas.cajasAbiertas;
      break;
    case 'skin_eliminada':
      estadisticaActual = estadisticas.skinsEliminadas;
      break;
    case 'mejora_realizada':
      estadisticaActual = estadisticas.mejorasRealizadas;
      break;
    case 'conseguir_skin':
      estadisticaActual = estadisticas.skinsConseguidas;
      break;
    case 'completar_misiones':
      estadisticaActual = estadisticas.misionesCompletadas;
      break;
    case 'aniversario':
      estadisticaActual = estadisticas.diasDesdeRegistro;
      break;
    default:
      return false;
  }
  
  // Obtener todas las cantidades completadas para este tipo (ordenadas)
  const cantidadesCompletadas = (misionesCompletadasPorTipo[tipo] || []).sort((a, b) => a - b);
  
  // Si ya completó esta cantidad específica, no mostrarla
  if (cantidadesCompletadas.includes(cantidadObjetivo)) {
    return false;
  }
  
  // Obtener todas las cantidades objetivo de misiones del mismo tipo (ordenadas)
  const todasLasCantidades = misionesDelMismoTipo
    .map(m => m.condicion.cantidad)
    .sort((a, b) => a - b);
  
  if (cantidadesCompletadas.length === 0) {
    // Si no ha completado ninguna, mostrar solo la primera (menor cantidad)
    const primeraCantidad = Math.min(...todasLasCantidades);
    const resultado = cantidadObjetivo === primeraCantidad;
    return resultado;
  } else {
    // Si ya completó algunas, mostrar solo la siguiente inmediata
    const ultimaCantidadCompletada = Math.max(...cantidadesCompletadas);
    const siguienteCantidad = todasLasCantidades.find(cantidad => cantidad > ultimaCantidadCompletada);
    
    return cantidadObjetivo === siguienteCantidad;
  }
}

// Función específica para misiones de conseguir skins por tier (progresivas por cada tier)
function esMisionProgresivaSiguientePorTier(mision: any, estadisticas: any, misionesCompletadasPorTierTipo: Record<string, Record<string, number[]>>, misionesDelMismoTipo: any[]): boolean {
  const condicion = mision.condicion;
  const cantidadObjetivo = condicion.cantidad;
  const tipo = condicion.tipo;
  const tierUuid = condicion.tier_uuid;
  
  const estadisticaActual = estadisticas.skinsPorTier[tierUuid] || 0;
  
  // Obtener cantidades completadas específicamente para este tier
  const cantidadesCompletadas = (misionesCompletadasPorTierTipo[tipo]?.[tierUuid] || []).sort((a, b) => a - b);
  
  // Si ya completó esta cantidad específica, no mostrarla
  if (cantidadesCompletadas.includes(cantidadObjetivo)) {
    return false;
  }
  
  // Obtener todas las cantidades objetivo de misiones del mismo tier (ordenadas)
  const todasLasCantidades = misionesDelMismoTipo
    .filter(m => m.condicion.tier_uuid === tierUuid)
    .map(m => m.condicion.cantidad)
    .sort((a, b) => a - b);
  
  // Solo mostrar la siguiente misión en la secuencia para este tier
  if (cantidadesCompletadas.length === 0) {
    // Si no ha completado ninguna de este tier, mostrar solo la primera
    const primeraCantidad = Math.min(...todasLasCantidades);
    return cantidadObjetivo === primeraCantidad;
  } else {
    // Si ya completó algunas de este tier, mostrar solo la siguiente inmediata
    const ultimaCantidadCompletada = Math.max(...cantidadesCompletadas);
    const siguienteCantidad = todasLasCantidades.find(cantidad => cantidad > ultimaCantidadCompletada);
    
    return cantidadObjetivo === siguienteCantidad;
  }
}

// Función para obtener estadísticas actuales del usuario
async function obtenerEstadisticasUsuario(userId: string) {
  try {
    // Obtener cajas abiertas desde logs
    const { count: cajasAbiertas } = await supabase
      .from("logs_caja_abierta")
      .select("*", { count: "exact", head: true })
      .eq("usuario_id", userId);

    // Obtener skins eliminadas desde logs
    const { data: logsEliminadas } = await supabase
      .from("logs_skin_eliminada")
      .select("skins_eliminadas")
      .eq("usuario_id", userId);
    
    const skinsEliminadas = logsEliminadas?.reduce((total, log) => {
      return total + (Array.isArray(log.skins_eliminadas) ? log.skins_eliminadas.length : 1);
    }, 0) || 0;

    // Obtener mejoras realizadas desde logs
    const { count: mejorasRealizadas } = await supabase
      .from("logs_skin_mejorada")
      .select("*", { count: "exact", head: true })
      .eq("usuario_id", userId)
      .eq("exitoso", true);

    // Obtener skins conseguidas desde logs de cajas
    const { data: logsCajas } = await supabase
      .from("logs_caja_abierta")
      .select("skins_conseguidas")
      .eq("usuario_id", userId);
    
    const skinsTotales = logsCajas?.reduce((total, log) => {
      return total + (Array.isArray(log.skins_conseguidas) ? log.skins_conseguidas.length : 1);
    }, 0) || 0;

    // Obtener skins conseguidas desde logs de mejoras exitosas
    const { data: logsMejoras } = await supabase
      .from("logs_skin_mejorada")
      .select("skin_objetivo_id")
      .eq("usuario_id", userId)
      .eq("exitoso", true);
    
    const skinsConseguidas = skinsTotales + (logsMejoras?.length || 0);

    // Obtener skins por tier desde logs
    const skinsPorTier: Record<string, number> = {};
    
    // Desde logs de cajas
    if (logsCajas) {
      for (const log of logsCajas) {
        if (Array.isArray(log.skins_conseguidas)) {
          for (const skin of log.skins_conseguidas) {
            if (skin.content_tier?.uuid_api) {
              skinsPorTier[skin.content_tier.uuid_api] = (skinsPorTier[skin.content_tier.uuid_api] || 0) + 1;
            }
          }
        }
      }
    }

    // Obtener misiones completadas
    const { count: misionesCompletadas } = await supabase
      .from("logs_historial_recompensas")
      .select("*", { count: "exact", head: true })
      .eq("usuario_id", userId);

    // Obtener días desde el registro
    const diasDesdeRegistro = await obtenerDiasDesdeRegistro(userId);

    return {
      cajasAbiertas: cajasAbiertas || 0,
      skinsEliminadas,
      mejorasRealizadas: mejorasRealizadas || 0,
      skinsConseguidas,
      skinsPorTier,
      misionesCompletadas: misionesCompletadas || 0,
      diasDesdeRegistro
    };
  } catch (error) {
    console.error("Error al obtener estadísticas:", error);
    return {
      cajasAbiertas: 0,
      skinsEliminadas: 0,
      mejorasRealizadas: 0,
      skinsConseguidas: 0,
      skinsPorTier: {},
      misionesCompletadas: 0,
      diasDesdeRegistro: 0
    };
  }
}

// Función para calcular días desde el registro del usuario
async function obtenerDiasDesdeRegistro(userId: string): Promise<number> {
  try {
    // Intentar obtener la fecha de creación del usuario desde la tabla usuarios
    const { data: usuario, error } = await supabase
      .from("usuarios")
      .select("created_at")
      .eq("id", userId)
      .single();

    if (error || !usuario?.created_at) {
      // Si no hay created_at en usuarios, usar la fecha del primer log como fallback
      const { data: primerLog, error: logError } = await supabase
        .from("logs_caja_abierta")
        .select("created_at")
        .eq("usuario_id", userId)
        .order("created_at", { ascending: true })
        .limit(1)
        .single();

      if (logError || !primerLog?.created_at) {
        // Si no hay logs, asumir que es un usuario nuevo
        return 0;
      }

      // Calcular días desde el primer log
      const fechaRegistro = new Date(primerLog.created_at);
      const fechaActual = new Date();
      const diferenciaTiempo = fechaActual.getTime() - fechaRegistro.getTime();
      const diasDiferencia = Math.floor(diferenciaTiempo / (1000 * 3600 * 24));
      
      return Math.max(0, diasDiferencia);
    }

    // Calcular días desde created_at
    const fechaRegistro = new Date(usuario.created_at);
    const fechaActual = new Date();
    const diferenciaTiempo = fechaActual.getTime() - fechaRegistro.getTime();
    const diasDiferencia = Math.floor(diferenciaTiempo / (1000 * 3600 * 24));
    
    return Math.max(0, diasDiferencia);
  } catch (error) {
    console.error("Error al calcular días desde registro:", error);
    return 0;
  }
}

// Función para verificar si hay misiones disponibles para reclamar
export async function verificarMisionesDisponibles(userId: string): Promise<{
  success: boolean;
  tieneMisionesDisponibles: boolean;
  cantidad: number;
  error?: any;
}> {
  try {
    const { data: misionesUsuario, error } = await supabase
      .from("misiones_usuario")
      .select(`
        id,
        completada,
        progreso,
        mision:misiones!inner(
          id,
          nombre,
          activa
        )
      `)
      .eq("usuario_id", userId)
      .eq("mision.activa", true)
      .eq("completada", false);

    if (error) {
      console.error("Error al verificar misiones disponibles:", error);
      return { success: false, tieneMisionesDisponibles: false, cantidad: 0, error };
    }

    // Contar misiones que están listas para reclamar
    const misionesListasParaReclamar = (misionesUsuario || []).filter(misionUsuario => {
      const progreso = misionUsuario.progreso || { actual: 0, objetivo: 1 };
      return progreso.actual >= progreso.objetivo;
    });

    return {
      success: true,
      tieneMisionesDisponibles: misionesListasParaReclamar.length > 0,
      cantidad: misionesListasParaReclamar.length
    };
  } catch (error) {
    console.error("Error al verificar misiones disponibles:", error);
    return { success: false, tieneMisionesDisponibles: false, cantidad: 0, error };
  }
}

// Función para procesar misión de login
export async function procesarMisionLogin(userId: string) {
  try {
    // Verificar que el usuario existe en la tabla usuarios
    const { data: usuarioExiste, error: checkUserError } = await supabase
      .from("usuarios")
      .select("id")
      .eq("id", userId)
      .single();

    if (checkUserError || !usuarioExiste) {
      return { success: false, error: "Usuario no encontrado en tabla usuarios" };
    }

    // Buscar misión de login diario
    const { data: misionLogin, error } = await supabase
      .from("misiones")
      .select("id, condicion")
      .eq("nombre", "Login Diario")
      .eq("activa", true)
      .single();

    if (!misionLogin || error) {
      return { success: false, error: "Misión no encontrada" };
    }

    // Verificar si ya se completó hoy (considerando las 9 AM como reset)
    const ahora = new Date();
    const horaReset = 9; // 9 AM
    
    // Si son menos de las 9 AM, consideramos que aún es el día anterior
    let fechaObjetivo = new Date(ahora);
    if (ahora.getHours() < horaReset) {
      fechaObjetivo.setDate(fechaObjetivo.getDate() - 1);
    }
    
    // Crear fecha de inicio del día objetivo a las 9 AM
    const inicioDelDia = new Date(fechaObjetivo);
    inicioDelDia.setHours(horaReset, 0, 0, 0);
    
    // Verificar si ya se completó después de las 9 AM de hoy
    const { data: completadaHoy } = await supabase
      .from("misiones_usuario")
      .select("*")
      .eq("usuario_id", userId)
      .eq("mision_id", misionLogin.id)
      .gte("fecha_completada", inicioDelDia.toISOString())
      .single();

    if (completadaHoy) {
      return { success: true, message: "Ya completada hoy" };
    }

    // Buscar progreso de la misión (resetear si es necesario)
    let { data: progresoMision, error: progresoError } = await supabase
      .from("misiones_usuario")
      .select("*")
      .eq("usuario_id", userId)
      .eq("mision_id", misionLogin.id)
      .single();

    if (progresoError && progresoError.code === 'PGRST116') {
      const objetivoDefault = misionLogin.condicion?.cantidad || 1;
      const { data: nuevoProgreso, error: insertError } = await supabase
        .from("misiones_usuario")
        .insert({
          usuario_id: userId,
          mision_id: misionLogin.id,
          progreso: { actual: 1, objetivo: objetivoDefault },
          completada: false
        })
        .select()
        .single();

      if (insertError) {
        console.error("Error al crear progreso de login:", insertError);
        return { success: false, error: insertError };
      }
      progresoMision = nuevoProgreso;
    } else if (progresoMision) {
      // Reset para misiones diarias - resetear si ya estaba completada
      const actualizaciones: any = {
        progreso: { actual: 1, objetivo: 1 }
      };
      
      // Si estaba completada, resetearla para poder reclamar de nuevo
      if (progresoMision.completada) {
        actualizaciones.completada = false;
        actualizaciones.fecha_completada = null;
      }
      
      const { error: updateError } = await supabase
        .from("misiones_usuario")
        .update(actualizaciones)
        .eq("id", progresoMision.id);

      if (updateError) {
        console.error("Error al actualizar progreso de login:", updateError);
        return { success: false, error: updateError };
      }
    }

    return { success: true, message: "Misión de login procesada" };
  } catch (error) {
    console.error("Error al procesar misión login:", error);
    return { success: false, error };
  }
}

// Función principal para actualizar progreso de misiones
export async function actualizarProgresoMision(
  userId: string,
  tipoActividad: 'caja_abierta' | 'skin_eliminada' | 'mejora_realizada' | 'registro_completado' | 'skin_conseguida' | 'mision_completada',
  cantidad: number = 1,
  datosAdicionales?: any
) {
  try {    
    // Actualizar misiones relacionadas con esta actividad
    await actualizarMisionesEspecificas(userId, tipoActividad, cantidad, datosAdicionales);
    
    // Verificar y crear nuevas misiones progresivas que ahora estén disponibles
    await verificarYCrearMisionesProgresivas(userId);
    
    // Verificar misiones de aniversario
    await verificarMisionesAniversario(userId);
    
    return { success: true, message: "Progreso actualizado correctamente" };
  } catch (error) {
    console.error("Error al actualizar progreso de misiones:", error);
    return { success: false, error };
  }
}

// Función para actualizar misiones específicas según el tipo de actividad
async function actualizarMisionesEspecificas(userId: string, tipoActividad: string, cantidad: number, datosAdicionales?: any) {
  const tiposCondicion = obtenerTiposCondicionPorActividad(tipoActividad);
  
  for (const tipoCondicion of tiposCondicion) {
    const { data: misionesRelacionadas, error } = await supabase
      .from("misiones_usuario")
      .select(`
        id,
        progreso,
        completada,
        mision:misiones!inner(
          id,
          nombre,
          tipo,
          condicion
        )
      `)
      .eq("usuario_id", userId)
      .eq("completada", false);

    if (error || !misionesRelacionadas) continue;

    for (const misionUsuario of misionesRelacionadas) {
      const mision = misionUsuario.mision as any;
      const condicion = mision.condicion;
      
      // Verificar si esta misión aplica para la actividad actual
      if (!aplicaMisionParaActividad(condicion, tipoCondicion, datosAdicionales)) {
        continue;
      }

      await actualizarProgresoMisionIndividual(misionUsuario, cantidad, mision);
    }
  }
}

// Función para obtener tipos de condición según la actividad
function obtenerTiposCondicionPorActividad(tipoActividad: string): string[] {
  const mapeo: Record<string, string[]> = {
    'caja_abierta': ['caja_abierta'],
    'skin_eliminada': ['skin_eliminada'],
    'mejora_realizada': ['mejora_realizada'],
    'skin_conseguida': ['conseguir_skin', 'conseguir_skin_tier'],
    'mision_completada': ['completar_misiones']
  };
  
  return mapeo[tipoActividad] || [];
}

// Función para verificar si una misión aplica para una actividad
function aplicaMisionParaActividad(condicion: any, tipoCondicion: string, datosAdicionales?: any): boolean {
  if (condicion.tipo !== tipoCondicion) return false;
  
  // Para misiones por tier, verificar que sea el tier correcto
  if (tipoCondicion === 'conseguir_skin_tier') {
    // Solo aplicar si se proporciona el tierUuid Y coincide con el de la misión
    return !!(datosAdicionales?.tierUuid && condicion.tier_uuid === datosAdicionales.tierUuid);
  }
  
  return true;
}

// Función para actualizar el progreso de una misión individual
async function actualizarProgresoMisionIndividual(misionUsuario: any, cantidad: number, mision: any) {
  const progresoActual = misionUsuario.progreso || { actual: 0, objetivo: 1 };
  const objetivo = mision.condicion.cantidad || 1;
  
  let nuevoProgreso = progresoActual.actual + cantidad;
  
  // Para misiones únicas, el progreso máximo es el objetivo
  if (mision.tipo === 'unica') {
    nuevoProgreso = Math.min(nuevoProgreso, objetivo);
  }

  const { error: updateError } = await supabase
    .from("misiones_usuario")
    .update({
      progreso: { 
        actual: nuevoProgreso, 
        objetivo: objetivo
      }
    })
    .eq("id", misionUsuario.id);

  if (updateError) {
    console.error(`Error al actualizar misión ${mision.nombre}:`, updateError);
  }
}

// Función para verificar y crear nuevas misiones progresivas disponibles
export async function verificarYCrearMisionesProgresivas(userId: string) {
  try {
    const estadisticas = await obtenerEstadisticasUsuario(userId);
    
    // Obtener todas las misiones activas que el usuario no tiene
    const { data: todasLasMisiones, error: misionesError } = await supabase
      .from("misiones")
      .select("*")
      .eq("activa", true);

    if (misionesError || !todasLasMisiones) return;

    const { data: misionesUsuario, error: usuarioError } = await supabase
      .from("misiones_usuario")
      .select("mision_id")
      .eq("usuario_id", userId);

    if (usuarioError) return;

    // Obtener misiones ya completadas por el usuario con más detalle
    const { data: misionesCompletadas, error: completadasError } = await supabase
      .from("misiones_usuario")
      .select(`
        mision_id,
        mision:misiones!inner(
          condicion
        )
      `)
      .eq("usuario_id", userId)
      .eq("completada", true);

    if (completadasError) return;

    // Agrupar misiones completadas por tipo y por tier
    const misionesCompletadasPorTipo: Record<string, number[]> = {};
    const misionesCompletadasPorTierTipo: Record<string, Record<string, number[]>> = {};
    
    if (misionesCompletadas) {
      for (const misionCompleta of misionesCompletadas) {
        const mision = misionCompleta.mision as any;
        const condicion = mision.condicion;
        const tipo = condicion.tipo;
        const cantidad = condicion.cantidad;
        
        if (!misionesCompletadasPorTipo[tipo]) {
          misionesCompletadasPorTipo[tipo] = [];
        }
        misionesCompletadasPorTipo[tipo].push(cantidad);
        
        // Para misiones por tier, también agrupar por tier específico
        if (tipo === 'conseguir_skin_tier' && condicion.tier_uuid) {
          if (!misionesCompletadasPorTierTipo[tipo]) {
            misionesCompletadasPorTierTipo[tipo] = {};
          }
          if (!misionesCompletadasPorTierTipo[tipo][condicion.tier_uuid]) {
            misionesCompletadasPorTierTipo[tipo][condicion.tier_uuid] = [];
          }
          misionesCompletadasPorTierTipo[tipo][condicion.tier_uuid].push(cantidad);
        }
      }
    }

    const misionesQueYaTiene = new Set(misionesUsuario?.map(m => m.mision_id) || []);
    
    // Encontrar misiones progresivas que ahora debería tener disponibles
    const nuevasMisionesDisponibles = [];
    
    // Agrupar misiones por tipo para verificación
    const misionesPorTipo: Record<string, any[]> = {};
    for (const mision of todasLasMisiones) {
      const tipo = mision.condicion?.tipo;
      if (tipo) {
        const claveTipo = tipo === 'conseguir_skin_tier' 
          ? `${tipo}_${mision.condicion.tier_uuid}` 
          : tipo;
        
        if (!misionesPorTipo[claveTipo]) {
          misionesPorTipo[claveTipo] = [];
        }
        misionesPorTipo[claveTipo].push(mision);
      }
    }
    
    const tiposProgresivos = ['caja_abierta', 'skin_eliminada', 'mejora_realizada', 'conseguir_skin', 'completar_misiones', 'aniversario'];
    
    for (const mision of todasLasMisiones) {
      if (misionesQueYaTiene.has(mision.id)) continue;
      
      const condicion = mision.condicion;
      const tipo = condicion.tipo;
      const objetivo = condicion.cantidad || 1;
      
      // Misiones multi-apertura (siempre disponibles y no repetibles)
      if (tipo === 'abrir_multiples') {
        nuevasMisionesDisponibles.push({
          usuario_id: userId,
          mision_id: mision.id,
          progreso: { actual: 0, objetivo: objetivo },
          completada: false
        });
        continue;
      }
      
      // Verificar misiones progresivas normales
      if (tiposProgresivos.includes(tipo)) {
        const claveTipo = tipo;
        const misionesDelTipo = misionesPorTipo[claveTipo] || [];
        
        if (esMisionProgresivaSiguiente(mision, estadisticas, misionesCompletadasPorTipo, misionesDelTipo)) {
          const progresoActual = obtenerProgresoActualPorTipo(estadisticas, tipo);
          const progresoLimitado = Math.min(progresoActual, objetivo);
          
          nuevasMisionesDisponibles.push({
            usuario_id: userId,
            mision_id: mision.id,
            progreso: { actual: progresoLimitado, objetivo: objetivo },
            completada: false
          });
        }
      }
      
      // Verificar misiones progresivas por tier
      if (tipo === 'conseguir_skin_tier') {
        const claveTipo = `${tipo}_${condicion.tier_uuid}`;
        const misionesDelTipo = misionesPorTipo[claveTipo] || [];
        
        if (esMisionProgresivaSiguientePorTier(mision, estadisticas, misionesCompletadasPorTierTipo, misionesDelTipo)) {
          const progresoActual = obtenerProgresoActualPorTipo(estadisticas, tipo, condicion.tier_uuid);
          const progresoLimitado = Math.min(progresoActual, objetivo);
          
          nuevasMisionesDisponibles.push({
            usuario_id: userId,
            mision_id: mision.id,
            progreso: { actual: progresoLimitado, objetivo: objetivo },
            completada: false
          });
        }
      }
    }

    if (nuevasMisionesDisponibles.length > 0) {
      await supabase
        .from("misiones_usuario")
        .insert(nuevasMisionesDisponibles);
      }
  } catch (error) {
    console.error("Error al verificar misiones progresivas:", error);
  }
}

// Función para verificar misiones de aniversario
async function verificarMisionesAniversario(userId: string) {
  try {
    // Obtener fecha de creación del usuario
    const { data: usuario, error } = await supabase
      .from("usuarios")
      .select("id")
      .eq("id", userId)
      .single();

    if (error || !usuario) return;
    
    // Obtener misiones de aniversario que no tiene el usuario
    const { data: misionesAniversario, error: misionesError } = await supabase
      .from("misiones")
      .select("*")
      .eq("activa", true)
      .like("condicion", '%aniversario%');

    if (misionesError || !misionesAniversario) return;
    
  } catch (error) {
    console.error("Error al verificar misiones de aniversario:", error);
  }
}

// Función específica para procesar la misión de registro (Bienvenido)
export async function procesarMisionRegistro(userId: string) {
  try {
    // Buscar misión de bienvenida
    const { data: misionBienvenida, error } = await supabase
      .from("misiones")
      .select("id, condicion, recompensa_vp")
      .eq("nombre", "Bienvenido")
      .eq("activa", true)
      .single();

    if (!misionBienvenida || error) {
      return { success: false, error: "Misión no encontrada" };
    }

    // Verificar si ya existe progreso para esta misión
    const { data: progresoExistente, error: checkError } = await supabase
      .from("misiones_usuario")
      .select("*")
      .eq("usuario_id", userId)
      .eq("mision_id", misionBienvenida.id)
      .single();

    if (progresoExistente && !checkError) {
      // Verificar si el progreso ya está completo
      const progreso = progresoExistente.progreso || { actual: 0, objetivo: 1 };
      
      if (progreso.actual >= progreso.objetivo) {
        return { success: true, message: "Misión de registro ya procesada y completada" };
      }
      
      // Si existe pero no está completa, actualizar el progreso
      const { error: updateError } = await supabase
        .from("misiones_usuario")
        .update({
          progreso: { actual: 1, objetivo: 1 }
        })
        .eq("id", progresoExistente.id);

      if (updateError) {
        console.error("Error al actualizar progreso de bienvenida:", updateError);
        return { success: false, error: updateError };
      }
      
      return { 
        success: true, 
        message: "Misión de bienvenida actualizada y lista para reclamar",
        listoParaReclamar: true
      };
    }

    // Crear progreso completado inmediatamente para registro
    const { data: nuevoProgreso, error: insertError } = await supabase
      .from("misiones_usuario")
      .insert({
        usuario_id: userId,
        mision_id: misionBienvenida.id,
        progreso: { actual: 1, objetivo: 1 },
        completada: false
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error al crear progreso de registro:", insertError);
      return { success: false, error: insertError };
    }
    
    return { 
      success: true, 
      message: "Misión de bienvenida creada y lista para reclamar",
      listoParaReclamar: true
    };
  } catch (error) {
    console.error("Error al procesar misión de registro:", error);
    return { success: false, error };
  }
}

// Función para procesar misión de multi-apertura
export async function procesarMisionMultiApertura(userId: string, cantidadCajasAbiertas: number) {
  try {    
    // Buscar todas las misiones de multi-apertura que aplican
    const { data: misionesMulti, error } = await supabase
      .from("misiones")
      .select("id, nombre, condicion, recompensa_vp, tipo")
      .eq("activa", true)
      .contains("condicion", { tipo: "abrir_multiples" });

    if (error) {
      console.error("Error al obtener misiones de multi-apertura:", error);
      return { success: false, error: error };
    }

    if (!misionesMulti || misionesMulti.length === 0) {
      return { success: true, message: "No hay misiones de multi-apertura activas" };
    }

    let misionesActualizadas = 0;

    // Buscar la misión que corresponde EXACTAMENTE al número de cajas abiertas
    const misionExacta = misionesMulti.find(mision => {
      const condicion = mision.condicion;
      const cantidadRequerida = condicion.minimo_por_sesion || condicion.cantidad || 2;
      return cantidadRequerida === cantidadCajasAbiertas;
    });

    // Si no hay una misión exacta para esta cantidad, no procesar ninguna
    if (!misionExacta) {
      return { 
        success: true, 
        message: `No hay misión específica para abrir exactamente ${cantidadCajasAbiertas} cajas`,
        cantidadCajasAbiertas,
        misionesEvaluadas: misionesMulti.length,
        misionesActualizadas: 0
      };
    }

    // Procesar solo la misión exacta
    const condicion = misionExacta.condicion;
    const cantidadRequerida = condicion.minimo_por_sesion || condicion.cantidad || 2;

    // Buscar progreso de la misión
    let { data: progresoMision, error: progresoError } = await supabase
      .from("misiones_usuario")
      .select("*")
      .eq("usuario_id", userId)
      .eq("mision_id", misionExacta.id)
      .single();

    if (progresoError && progresoError.code === 'PGRST116') {
      // Crear progreso si no existe
      const objetivoDefault = condicion.cantidad || 1;
      const { data: nuevoProgreso, error: insertError } = await supabase
        .from("misiones_usuario")
        .insert({
          usuario_id: userId,
          mision_id: misionExacta.id,
          progreso: { actual: objetivoDefault, objetivo: objetivoDefault },
          completada: false
        })
        .select()
        .single();

      if (insertError) {
        console.error("Error al crear progreso de multi-apertura:", insertError);
        return { success: false, error: insertError };
      }
      
      misionesActualizadas++;
      
    } else if (progresoMision) {
      
      // Si la misión es repetible y ya está completada, resetearla para que pueda reclamarse de nuevo
      if (misionExacta.tipo === 'repetible' && progresoMision.completada) {
        const objetivoDefault = condicion.cantidad || 1;
        
        const { error: resetError } = await supabase
          .from("misiones_usuario")
          .update({
            progreso: { actual: objetivoDefault, objetivo: objetivoDefault },
            completada: false,
            fecha_completada: null
          })
          .eq("id", progresoMision.id);

        if (!resetError) {
          misionesActualizadas++;
        } else {
          console.error("Error al resetear misión repetible:", resetError);
          return { success: false, error: resetError };
        }
        
      } else if (!progresoMision.completada) {
        // Si existe pero no está completada, completarla ahora
        const objetivoDefault = condicion.cantidad || 1;
        const progresoActual = progresoMision.progreso?.actual || 0;
        
        // Solo actualizar si no está ya en el objetivo
        if (progresoActual < objetivoDefault) {
          const { error: updateError } = await supabase
            .from("misiones_usuario")
            .update({
              progreso: { 
                actual: objetivoDefault, 
                objetivo: objetivoDefault 
              }
            })
            .eq("id", progresoMision.id);

          if (!updateError) {
            misionesActualizadas++;
          } else {
            console.error("Error al actualizar progreso:", updateError);
            return { success: false, error: updateError };
          }
        }
      }
    } else {
      console.error(`Error inesperado al obtener progreso de misión ${misionExacta.nombre}:`, progresoError);
      return { success: false, error: progresoError };
    }

    return { 
      success: true, 
      message: `Misión de abrir exactamente ${cantidadCajasAbiertas} cajas procesada`,
      misionesActualizadas,
      cantidadCajasAbiertas,
      misionProcesada: misionExacta.nombre,
      misionesEvaluadas: misionesMulti.length
    };
  } catch (error) {
    console.error("Error al procesar misiones de multi-apertura:", error);
    return { success: false, error };
  }
}

// Función para procesar cuando se consigue una skin (desde logs)
export async function procesarSkinConseguida(userId: string, skinData: any) {
  try {
    // Actualizar misión general de conseguir skins (solo las de tipo 'conseguir_skin', no las de tier)
    await actualizarProgresoMision(userId, 'skin_conseguida', 1);
    
    // Si tiene información del tier, actualizar misión específica del tier
    if (skinData.content_tier?.uuid_api) {
      await actualizarProgresoMision(userId, 'skin_conseguida', 1, {
        tierUuid: skinData.content_tier.uuid_api
      });
    }
    
    return { success: true };
  } catch (error) {
    console.error("Error al procesar skin conseguida:", error);
    return { success: false, error };
  }
}
// Función para resetear misiones repetibles completadas
export async function resetearMisionesRepetibles(userId: string) {
  try {
    // Buscar misiones repetibles que estén completadas
    const { data: misionesRepetibles, error: misionesError } = await supabase
      .from("misiones_usuario")
      .select(`
        id,
        completada,
        fecha_completada,
        mision:misiones!inner(
          id,
          nombre,
          tipo,
          activa,
          condicion
        )
      `)
      .eq("usuario_id", userId)
      .eq("mision.tipo", "repetible")
      .eq("mision.activa", true)
      .eq("completada", true);

    if (misionesError) {
      console.error("Error al buscar misiones repetibles:", misionesError);
      return { success: false, error: misionesError };
    }

    if (!misionesRepetibles || misionesRepetibles.length === 0) {
      return { success: true, message: "No hay misiones repetibles para resetear" };
    }

    // Resetear cada misión repetible completada
    for (const misionUsuario of misionesRepetibles) {
      const mision = misionUsuario.mision as any;
      const objetivoDefault = mision.condicion?.cantidad || 1;
      
      const { error: resetError } = await supabase
        .from("misiones_usuario")
        .update({
          completada: false,
          fecha_completada: null,
          progreso: { actual: 0, objetivo: objetivoDefault }
        })
        .eq("id", misionUsuario.id);

      if (resetError) {
        console.error(`Error al resetear misión ${mision.nombre}:`, resetError);
      }
    }

    return { 
      success: true, 
      message: `${misionesRepetibles.length} misiones repetibles reseteadas` 
    };
  } catch (error) {
    console.error("Error al resetear misiones repetibles:", error);
    return { success: false, error };
  }
}
