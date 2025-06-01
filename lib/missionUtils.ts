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

    // Crear progreso inicial para cada misión
    const misionesUsuario = misiones.map(mision => {
      const objetivoDefault = mision.condicion?.cantidad || 1;
      
      return {
        usuario_id: userId,
        mision_id: mision.id,
        progreso: { actual: 0, objetivo: objetivoDefault },
        completada: false
      };
    });

    // Insertar todas las misiones de una vez
    const { error: insertError } = await supabase
      .from("misiones_usuario")
      .insert(misionesUsuario);

    if (insertError) {
      console.error("Error al insertar misiones de usuario:", insertError);
      return { success: false, error: insertError };
    }

    console.log(`✅ ${misiones.length} misiones inicializadas para el usuario`);

    // 🎯 PROCESAR AUTOMÁTICAMENTE LA MISIÓN DE BIENVENIDA
    const resultadoBienvenida = await procesarMisionRegistro(userId);
    if (resultadoBienvenida.success) {
      console.log("✅ Misión de bienvenida procesada automáticamente");
    } else {
      console.warn("⚠️ Error al procesar misión de bienvenida:", resultadoBienvenida.error);
    }

    return { 
      success: true, 
      message: `${misiones.length} misiones inicializadas correctamente`,
      misionesCreadas: misiones.length,
      bienvenidaProcesada: resultadoBienvenida.success
    };
  } catch (error) {
    console.error("Error al inicializar misiones:", error);
    return { success: false, error };
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

// Función para actualizar progreso de misiones basadas en actividades
export async function actualizarProgresoMision(
  userId: string,
  tipoActividad: 'caja_abierta' | 'skin_eliminada' | 'mejora_realizada' | 'registro_completado' | 'skin_conseguida',
  cantidad: number = 1
) {
  try {
    // Mapear tipo de actividad a categoría de misión
    const categoriaMap: Record<string, string[]> = {
      'caja_abierta': ['cajas'],
      'skin_eliminada': ['inventario'],
      'mejora_realizada': ['mejoras'],
      'registro_completado': ['cuenta'],
      'skin_conseguida': ['skins']
    };

    const categorias = categoriaMap[tipoActividad];
    if (!categorias) {
      console.warn(`Tipo de actividad no reconocido: ${tipoActividad}`);
      return { success: false, error: "Tipo de actividad no reconocido" };
    }

    // Buscar misiones activas de estas categorías que no estén completadas
    const { data: misionesRelacionadas, error } = await supabase
      .from("misiones_usuario")
      .select(`
        id,
        progreso,
        completada,
        mision:misiones!inner(
          id,
          nombre,
          categoria,
          activa,
          condicion,
          tipo
        )
      `)
      .eq("usuario_id", userId)
      .in("mision.categoria", categorias)
      .eq("mision.activa", true)
      .eq("completada", false);

    if (error) {
      console.error("Error al buscar misiones relacionadas:", error);
      return { success: false, error };
    }

    if (!misionesRelacionadas || misionesRelacionadas.length === 0) {
      return { success: true, message: "No hay misiones relacionadas activas" };
    }

    let misionesActualizadas = 0;

    // Actualizar progreso de cada misión relacionada
    for (const misionUsuario of misionesRelacionadas) {
      const mision = misionUsuario.mision as any;
      const condicion = mision.condicion;
      
      // Verificar si esta misión específica aplica para este tipo de actividad
      const aplicaMision = 
        (tipoActividad === 'caja_abierta' && ['abrir_caja', 'caja_abierta'].includes(condicion.tipo)) ||
        (tipoActividad === 'skin_eliminada' && condicion.tipo === 'skin_eliminada') ||
        (tipoActividad === 'mejora_realizada' && condicion.tipo === 'mejora_realizada') ||
        (tipoActividad === 'registro_completado' && condicion.tipo === 'registro') ||
        (tipoActividad === 'skin_conseguida' && condicion.tipo === 'conseguir_skin');

      if (!aplicaMision) {
        continue;
      }

      const progresoActual = misionUsuario.progreso || { actual: 0, objetivo: 1 };
      const objetivo = condicion.cantidad || 1;
      
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
        misionesActualizadas++;
        console.log(`✅ Progreso actualizado: ${mision.nombre} (${nuevoProgreso}/${objetivo})`);
      }
    }

    return { 
      success: true, 
      message: `${misionesActualizadas} misiones actualizadas`,
      misionesActualizadas 
    };
  } catch (error) {
    console.error("Error al actualizar progreso de misiones:", error);
    return { success: false, error };
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
    // Solo procesar si se abrieron 5 o más cajas a la vez
    if (cantidadCajasAbiertas < 5) {
      return { success: true, message: "No cumple criterio de multi-apertura" };
    }

    // Buscar misión de multi-apertura activa
    const { data: misionMulti, error } = await supabase
      .from("misiones")
      .select("id, condicion, recompensa_vp")
      .eq("nombre", "Multi-Apertura")
      .eq("activa", true)
      .single();

    if (!misionMulti || error) {
      console.log("No se encontró misión de Multi-Apertura activa");
      return { success: false, error: "Misión no encontrada" };
    }

    // Buscar o crear progreso de la misión
    let { data: progresoMision, error: progresoError } = await supabase
      .from("misiones_usuario")
      .select("*")
      .eq("usuario_id", userId)
      .eq("mision_id", misionMulti.id)
      .single();

    if (progresoError && progresoError.code === 'PGRST116') {
      // Crear progreso si no existe
      const objetivoDefault = misionMulti.condicion?.cantidad || 5;
      const { data: nuevoProgreso, error: insertError } = await supabase
        .from("misiones_usuario")
        .insert({
          usuario_id: userId,
          mision_id: misionMulti.id,
          progreso: { actual: 1, objetivo: objetivoDefault },
          completada: false
        })
        .select()
        .single();

      if (insertError) {
        console.error("Error al crear progreso de multi-apertura:", insertError);
        return { success: false, error: insertError };
      }
      
      return { success: true, message: "Progreso de multi-apertura creado", progreso: nuevoProgreso };
    } else if (progresoMision && !progresoMision.completada) {
      // Para misiones repetibles, incrementar el progreso
      const progresoActual = progresoMision.progreso || { actual: 0, objetivo: 5 };
      const nuevoProgreso = progresoActual.actual + 1;

      const { error: updateError } = await supabase
        .from("misiones_usuario")
        .update({
          progreso: { 
            actual: nuevoProgreso, 
            objetivo: progresoActual.objetivo 
          }
        })
        .eq("id", progresoMision.id);

      if (updateError) {
        console.error("Error al actualizar progreso de multi-apertura:", updateError);
        return { success: false, error: updateError };
      }

      return { 
        success: true, 
        message: "Progreso de multi-apertura actualizado",
        listoParaReclamar: nuevoProgreso >= progresoActual.objetivo
      };
    }

    return { success: true, message: "Misión ya completada o no aplicable" };
  } catch (error) {
    console.error("Error al procesar misión de multi-apertura:", error);
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