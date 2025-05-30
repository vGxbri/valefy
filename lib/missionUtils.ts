import { createClient } from '@/utils/supabase/client';

const supabase = createClient();

// Función para inicializar misiones para un usuario
export async function inicializarMisionesUsuario(userId: string) {
  try {
    // Obtener todas las misiones activas
    const { data: misionesActivas, error: misionesError } = await supabase
      .from("misiones")
      .select("*")
      .eq("activa", true);

    if (misionesError) {
      console.error("Error al obtener misiones activas:", misionesError);
      return { success: false, error: misionesError };
    }

    if (!misionesActivas || misionesActivas.length === 0) {
      return { success: true, message: "No hay misiones activas" };
    }

    // Para cada misión activa, verificar si el usuario ya tiene progreso
    for (const mision of misionesActivas) {
      const { data: progresoExistente, error: checkError } = await supabase
        .from("misiones_usuario")
        .select("id")
        .eq("usuario_id", userId)
        .eq("mision_id", mision.id)
        .single();

      // Si no existe progreso para esta misión, crearlo
      if (checkError && checkError.code === 'PGRST116') {
        const objetivoDefault = mision.condicion?.cantidad || 1;
        
        const { error: insertError } = await supabase
          .from("misiones_usuario")
          .insert({
            usuario_id: userId,
            mision_id: mision.id,
            progreso: { actual: 0, objetivo: objetivoDefault },
            completada: false
          });

        if (insertError) {
          console.error(`Error al crear progreso para misión ${mision.nombre}:`, insertError);
        }
      }
    }

    return { success: true, message: "Misiones inicializadas correctamente" };
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

    // Verificar si ya se completó hoy
    const hoy = new Date().toISOString().split('T')[0];
    const { data: completadaHoy } = await supabase
      .from("misiones_usuario")
      .select("*")
      .eq("usuario_id", userId)
      .eq("mision_id", misionLogin.id)
      .gte("fecha_completada", hoy)
      .single();

    if (completadaHoy) {
      return { success: true, message: "Ya completada hoy" };
    }

    // Buscar o crear progreso de la misión
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
      // Actualizar progreso existente
      const { error: updateError } = await supabase
        .from("misiones_usuario")
        .update({
          progreso: { actual: 1, objetivo: 1 }
        })
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
  tipoActividad: 'caja_abierta' | 'skin_eliminada' | 'mejora_realizada' | 'registro_completado',
  cantidad: number = 1
) {
  try {
    // Mapear tipo de actividad a categoría de misión
    const categoriaMap: Record<string, string> = {
      'caja_abierta': 'apertura_cajas',
      'skin_eliminada': 'gestion_inventario',
      'mejora_realizada': 'mejoras',
      'registro_completado': 'progreso'
    };

    const categoria = categoriaMap[tipoActividad];
    if (!categoria) {
      console.warn(`Tipo de actividad no reconocido: ${tipoActividad}`);
      return { success: false, error: "Tipo de actividad no reconocido" };
    }

    // Buscar misiones activas de esta categoría que no estén completadas
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
          condicion
        )
      `)
      .eq("usuario_id", userId)
      .eq("mision.categoria", categoria)
      .eq("mision.activa", true)
      .eq("completada", false);

    if (error) {
      console.error("Error al buscar misiones relacionadas:", error);
      return { success: false, error };
    }

    if (!misionesRelacionadas || misionesRelacionadas.length === 0) {
      return { success: true, message: "No hay misiones relacionadas activas" };
    }

    // Actualizar progreso de cada misión relacionada
    for (const misionUsuario of misionesRelacionadas) {
      const progresoActual = misionUsuario.progreso || { actual: 0, objetivo: 1 };
      const nuevoProgreso = Math.min(
        progresoActual.actual + cantidad,
        progresoActual.objetivo
      );

      const { error: updateError } = await supabase
        .from("misiones_usuario")
        .update({
          progreso: { 
            actual: nuevoProgreso, 
            objetivo: progresoActual.objetivo 
          }
        })
        .eq("id", misionUsuario.id);

      if (updateError) {
        console.error(`Error al actualizar misión:`, updateError);
      }
    }

    return { success: true, message: "Progreso actualizado" };
  } catch (error) {
    console.error("Error al actualizar progreso de misiones:", error);
    return { success: false, error };
  }
} 