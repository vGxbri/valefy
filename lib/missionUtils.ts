import { createClient } from '@/utils/supabase/client';

const supabase = createClient();

// Función para inicializar misiones para un usuario
export async function inicializarMisionesUsuario(userId: string) {
  try {
    console.log(`🎯 Inicializando misiones para usuario: ${userId}`);

    // Verificar si el usuario ya tiene misiones inicializadas
    const { count: misionesExistentes } = await supabase
      .from("misiones_usuario")
      .select("*", { count: "exact", head: true })
      .eq("usuario_id", userId);

    if (misionesExistentes && misionesExistentes > 0) {
      console.log(`⚠️ Usuario ${userId} ya tiene ${misionesExistentes} misiones inicializadas`);
      
      // Sincronizar misiones nuevas que puedan haberse añadido
      await sincronizarMisionesNuevas(userId);
      
      // Aún así, procesar la misión de bienvenida por si no se procesó
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
      console.log("No hay misiones activas para inicializar");
      return { success: true, message: "No hay misiones activas" };
    }

    console.log(`📋 Encontradas ${misiones.length} misiones activas`);

    // Crear progreso inicial para cada misión (solo las que debe tener disponibles inicialmente)
    const misionesParaInicializar = await obtenerMisionesDisponiblesParaUsuario(userId, misiones);
    
    const misionesUsuario = misionesParaInicializar.map(mision => {
      const objetivoDefault = mision.condicion?.cantidad || 1;
      
      return {
        usuario_id: userId,
        mision_id: mision.id,
        progreso: { actual: 0, objetivo: objetivoDefault },
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

    console.log(`✅ ${misionesUsuario.length} misiones inicializadas para el usuario`);

    // 🎯 PROCESAR AUTOMÁTICAMENTE LA MISIÓN DE BIENVENIDA
    const resultadoBienvenida = await procesarMisionRegistro(userId);
    if (resultadoBienvenida.success) {
      console.log("✅ Misión de bienvenida procesada automáticamente");
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
      const nuevasMisiones = misionesParaAñadir.map(mision => ({
        usuario_id: userId,
        mision_id: mision.id,
        progreso: { actual: 0, objetivo: mision.condicion?.cantidad || 1 },
        completada: false
      }));

      await supabase
        .from("misiones_usuario")
        .insert(nuevasMisiones);

      console.log(`🔄 Sincronizadas ${misionesParaAñadir.length} misiones nuevas para usuario ${userId}`);
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
  
  // Obtener misiones ya completadas por el usuario
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
    }
  }
  
  // Agrupar misiones por tipo para facilitar verificación de progresión
  const misionesPorTipo: Record<string, any[]> = {};
  for (const mision of misiones) {
    const tipo = mision.condicion?.tipo;
    if (tipo) {
      if (!misionesPorTipo[tipo]) {
        misionesPorTipo[tipo] = [];
      }
      misionesPorTipo[tipo].push(mision);
    }
  }
  
  for (const mision of misiones) {
    const condicion = mision.condicion;
    
    // Misiones que siempre están disponibles
    if (['registro', 'login'].includes(condicion.tipo)) {
      misionesDisponibles.push(mision);
      continue;
    }
    
    // Misiones multi-apertura (siempre disponibles pero no repetibles)
    if (condicion.tipo === 'abrir_multiples') {
      misionesDisponibles.push(mision);
      continue;
    }
    
    // Misiones de aniversario (siempre disponibles)
    if (condicion.tipo === 'aniversario') {
      misionesDisponibles.push(mision);
      continue;
    }
    
    // Para misiones progresivas, verificar si es la siguiente que debería estar disponible
    const misionesDelMismoTipo = misionesPorTipo[condicion.tipo] || [];
    if (esMisionProgresivaSiguienteDisponible(mision, estadisticas, misionesCompletadasPorTipo, misionesDelMismoTipo)) {
      misionesDisponibles.push(mision);
    }
  }
  
  return misionesDisponibles;
}

// Función para verificar si una misión progresiva es la siguiente disponible
function esMisionProgresivaSiguienteDisponible(mision: any, estadisticas: any, misionesCompletadasPorTipo: Record<string, number[]>, misionesDelMismoTipo: any[]): boolean {
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
    case 'conseguir_skin_tier':
      estadisticaActual = estadisticas.skinsPorTier[condicion.tier_uuid] || 0;
      break;
    case 'completar_misiones':
      estadisticaActual = estadisticas.misionesCompletadas;
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
  
  // Si no ha alcanzado el objetivo, no puede completarla aún
  if (estadisticaActual < cantidadObjetivo) {
    return false;
  }
  
  // Obtener todas las cantidades objetivo de misiones del mismo tipo (ordenadas)
  const todasLasCantidades = misionesDelMismoTipo
    .filter(m => m.condicion.tipo === tipo && (tipo !== 'conseguir_skin_tier' || m.condicion.tier_uuid === condicion.tier_uuid))
    .map(m => m.condicion.cantidad)
    .sort((a, b) => a - b);
  
  // Verificar progresión estricta
  if (cantidadesCompletadas.length === 0) {
    // Si no ha completado ninguna, debe ser la primera en la secuencia (la de menor cantidad)
    const primeraCantidad = Math.min(...todasLasCantidades);
    return cantidadObjetivo === primeraCantidad;
  }
  
  // Encontrar la mayor cantidad ya completada
  const ultimaCantidadCompletada = Math.max(...cantidadesCompletadas);
  
  // Esta misión debe ser exactamente la siguiente en la secuencia
  const siguienteCantidadEnSecuencia = todasLasCantidades.find(cantidad => 
    cantidad > ultimaCantidadCompletada && !cantidadesCompletadas.includes(cantidad)
  );
  
  // Solo está disponible si es exactamente la siguiente en la secuencia
  return cantidadObjetivo === siguienteCantidadEnSecuencia;
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

    return {
      cajasAbiertas: cajasAbiertas || 0,
      skinsEliminadas,
      mejorasRealizadas: mejorasRealizadas || 0,
      skinsConseguidas,
      skinsPorTier,
      misionesCompletadas: misionesCompletadas || 0
    };
  } catch (error) {
    console.error("Error al obtener estadísticas:", error);
    return {
      cajasAbiertas: 0,
      skinsEliminadas: 0,
      mejorasRealizadas: 0,
      skinsConseguidas: 0,
      skinsPorTier: {},
      misionesCompletadas: 0
    };
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
    // Buscar misión de login diario
    const { data: misionLogin, error } = await supabase
      .from("misiones")
      .select("id, condicion")
      .eq("nombre", "Login Diario")
      .eq("activa", true)
      .single();

    if (!misionLogin || error) {
      console.log("No se encontró misión de Login Diario activa");
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
      // Crear progreso si no existe
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
    console.log(`🎯 Actualizando progreso: ${tipoActividad} (${cantidad}) para usuario ${userId}`);
    
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
  if (tipoCondicion === 'conseguir_skin_tier' && datosAdicionales?.tierUuid) {
    return condicion.tier_uuid === datosAdicionales.tierUuid;
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
  } else {
    console.log(`✅ Progreso actualizado: ${mision.nombre} (${nuevoProgreso}/${objetivo})`);
  }
}

// Función para verificar y crear nuevas misiones progresivas disponibles
async function verificarYCrearMisionesProgresivas(userId: string) {
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

    // Obtener misiones ya completadas por el usuario para verificar progresión
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

    // Agrupar misiones completadas por tipo
    const misionesCompletadasPorTipo: Record<string, number[]> = {};
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
      }
    }

    const misionesQueYaTiene = new Set(misionesUsuario?.map(m => m.mision_id) || []);
    
    // Encontrar misiones progresivas que ahora debería tener disponibles
    const nuevasMisionesDisponibles = [];
    
    for (const mision of todasLasMisiones) {
      if (misionesQueYaTiene.has(mision.id)) continue;
      
      if (esMisionProgresivaSiguienteDisponible(mision, estadisticas, misionesCompletadasPorTipo, todasLasMisiones)) {
        nuevasMisionesDisponibles.push({
          usuario_id: userId,
          mision_id: mision.id,
          progreso: { actual: 0, objetivo: mision.condicion?.cantidad || 1 },
          completada: false
        });
      }
    }

    if (nuevasMisionesDisponibles.length > 0) {
      await supabase
        .from("misiones_usuario")
        .insert(nuevasMisionesDisponibles);
      
      console.log(`🎯 Creadas ${nuevasMisionesDisponibles.length} nuevas misiones progresivas`);
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

    // Calcular días desde el registro (esto debería estar en una columna created_at real)
    // Por ahora, usaremos una lógica simplificada
    
    // Obtener misiones de aniversario que no tiene el usuario
    const { data: misionesAniversario, error: misionesError } = await supabase
      .from("misiones")
      .select("*")
      .eq("activa", true)
      .like("condicion", '%aniversario%');

    if (misionesError || !misionesAniversario) return;

    // Aquí implementarías la lógica para verificar fechas de aniversario
    // Por simplicidad, omitiremos esta implementación por ahora
    
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
      console.log("No se encontró misión de Bienvenida activa");
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
      console.log("Misión de bienvenida ya existe para este usuario");
      return { success: true, message: "Misión de registro ya procesada" };
    }

    // Crear progreso completado inmediatamente para registro
    const { data: nuevoProgreso, error: insertError } = await supabase
      .from("misiones_usuario")
      .insert({
        usuario_id: userId,
        mision_id: misionBienvenida.id,
        progreso: { actual: 1, objetivo: 1 },
        completada: false // Listo para reclamar pero no reclamado
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error al crear progreso de registro:", insertError);
      return { success: false, error: insertError };
    }
    
    console.log("✅ Misión de bienvenida creada y lista para reclamar");
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
    console.log(`🎯 Procesando multi-apertura: ${cantidadCajasAbiertas} cajas`);
    
    // Buscar todas las misiones de multi-apertura que aplican
    const { data: misionesMulti, error } = await supabase
      .from("misiones")
      .select("id, nombre, condicion, recompensa_vp")
      .eq("activa", true)
      .like("condicion", '%abrir_multiples%');

    if (error || !misionesMulti) {
      console.log("No se encontraron misiones de Multi-Apertura activas");
      return { success: false, error: "Misiones no encontradas" };
    }

    let misionesActualizadas = 0;

    for (const misionMulti of misionesMulti) {
      const condicion = misionMulti.condicion;
      const cantidadRequerida = condicion.minimo_por_sesion || condicion.cantidad;
      
      // Solo procesar si se cumple el mínimo requerido
      if (cantidadCajasAbiertas < cantidadRequerida) {
        continue;
      }

      // Buscar progreso de la misión
      let { data: progresoMision, error: progresoError } = await supabase
        .from("misiones_usuario")
        .select("*")
        .eq("usuario_id", userId)
        .eq("mision_id", misionMulti.id)
        .single();

      if (progresoError && progresoError.code === 'PGRST116') {
        // Crear progreso si no existe - completar inmediatamente para multi-apertura
        const objetivoDefault = condicion.cantidad || 1;
        const { data: nuevoProgreso, error: insertError } = await supabase
          .from("misiones_usuario")
          .insert({
            usuario_id: userId,
            mision_id: misionMulti.id,
            progreso: { actual: objetivoDefault, objetivo: objetivoDefault },
            completada: false // Listo para reclamar
          })
          .select()
          .single();

        if (insertError) {
          console.error("Error al crear progreso de multi-apertura:", insertError);
          continue;
        }
        
        misionesActualizadas++;
        console.log(`✅ Nueva misión multi-apertura completada: ${misionMulti.nombre}`);
      } else if (progresoMision && !progresoMision.completada) {
        // Si existe pero no está completada, completarla ahora (no repetible)
        const objetivoDefault = condicion.cantidad || 1;
        
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
          console.log(`✅ Multi-apertura completada: ${misionMulti.nombre}`);
        }
      }
      // Si ya está completada, no hacer nada (no repetible)
    }

    return { 
      success: true, 
      message: `${misionesActualizadas} misiones de multi-apertura procesadas`,
      misionesActualizadas
    };
  } catch (error) {
    console.error("Error al procesar misiones de multi-apertura:", error);
    return { success: false, error };
  }
}

// Función para procesar cuando se consigue una skin (desde logs)
export async function procesarSkinConseguida(userId: string, skinData: any) {
  try {
    // Actualizar misión general de conseguir skins
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