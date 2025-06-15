import { NextResponse } from "next/server";
import { createClient } from '@/utils/supabase/client';
import { verificarYCrearMisionesProgresivas } from '@/lib/missionUtils';

export async function POST(request: Request) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: "userId es requerido" },
        { status: 400 }
      );
    }

    const supabase = createClient();
    
    // Verificar que el usuario existe
    const { data: usuario, error: userError } = await supabase
      .from("usuarios")
      .select("id")
      .eq("id", userId)
      .single();

    if (userError || !usuario) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      );
    }

    // Esto creará automáticamente las nuevas misiones que deberían estar disponibles
    await verificarYCrearMisionesProgresivas(userId);

    // Obtener todas las misiones del usuario (incluyendo las recién creadas)
    const { data: misionesUsuario, error: misionesError } = await supabase
      .from("misiones_usuario")
      .select(`
        id,
        usuario_id,
        mision_id,
        completada,
        fecha_completada,
        progreso,
        mision:misiones!inner(
          id,
          nombre,
          descripcion,
          recompensa_vp,
          tipo,
          categoria,
          condicion,
          activa,
          orden,
          icono,
          fecha_creacion
        )
      `)
      .eq("usuario_id", userId)
      .eq("mision.activa", true)
      .order("mision(orden)");

    if (misionesError) {
      console.error("Error al obtener misiones del usuario:", misionesError);
      return NextResponse.json(
        { error: "Error al obtener misiones" },
        { status: 500 }
      );
    }

    // Transformar los datos para que coincidan con la estructura esperada
    const misionesFormateadas = (misionesUsuario || []).map(misionUsuario => ({
      id: misionUsuario.id,
      usuario_id: misionUsuario.usuario_id,
      mision_id: misionUsuario.mision_id,
      completada: misionUsuario.completada,
      fecha_completada: misionUsuario.fecha_completada,
      progreso: misionUsuario.progreso,
      mision: misionUsuario.mision
    }));

    return NextResponse.json({
      success: true,
      misiones: misionesFormateadas
    });
  } catch (error) {
    console.error("Error en obtener misiones usuario:", error);
    return NextResponse.json(
      { error: "Error en el servidor" },
      { status: 500 }
    );
  }
} 