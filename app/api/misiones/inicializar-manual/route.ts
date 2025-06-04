import { NextResponse } from "next/server";
import { inicializarMisionesUsuario, procesarMisionRegistro } from "@/lib/missionUtils";
import { createClient } from '@/utils/supabase/client';

export async function POST(request: Request) {
  try {
    const { userId, corregirBienvenida, inicializarMultiApertura } = await request.json();

    // 🎯 NUEVO: Opción para inicializar misiones de multi-apertura para todos los usuarios
    if (inicializarMultiApertura === "todos") {      
      const supabase = createClient();
      
      // Obtener todas las misiones de multi-apertura
      const { data: misionesMultiApertura, error: misionesError } = await supabase
        .from("misiones")
        .select("id, nombre, condicion")
        .eq("activa", true)
        .contains("condicion", { tipo: "abrir_multiples" });

      if (misionesError) {
        return NextResponse.json({
          success: false,
          error: "Error al buscar misiones de multi-apertura",
          details: misionesError
        });
      }

      if (!misionesMultiApertura || misionesMultiApertura.length === 0) {
        return NextResponse.json({
          success: false,
          error: "No se encontraron misiones de multi-apertura activas"
        });
      }

      // Obtener todos los usuarios
      const { data: usuarios, error: usuariosError } = await supabase
        .from("usuarios")
        .select("id");

      if (usuariosError) {
        return NextResponse.json({
          success: false,
          error: "Error al obtener usuarios",
          details: usuariosError
        });
      }

      let usuariosActualizados = 0;
      let misionesCreadas = 0;
      
      for (const usuario of usuarios || []) {
        // Verificar qué misiones de multi-apertura ya tiene este usuario
        const { data: misionesExistentes } = await supabase
          .from("misiones_usuario")
          .select("mision_id")
          .eq("usuario_id", usuario.id)
          .in("mision_id", misionesMultiApertura.map(m => m.id));

        const misionesQueYaTiene = new Set(misionesExistentes?.map(m => m.mision_id) || []);
        
        // Crear las misiones de multi-apertura que no tiene
        const misionesParaCrear = misionesMultiApertura
          .filter(mision => !misionesQueYaTiene.has(mision.id))
          .map(mision => ({
            usuario_id: usuario.id,
            mision_id: mision.id,
            progreso: { actual: 0, objetivo: mision.condicion.cantidad || 1 },
            completada: false
          }));

        if (misionesParaCrear.length > 0) {
          const { error: insertError } = await supabase
            .from("misiones_usuario")
            .insert(misionesParaCrear);

          if (!insertError) {
            usuariosActualizados++;
            misionesCreadas += misionesParaCrear.length;
          } else {
            console.error(`❌ Error al crear misiones para usuario ${usuario.id}:`, insertError);
          }
        }
      }
      
      return NextResponse.json({
        success: true,
        message: `Misiones de multi-apertura inicializadas para ${usuariosActualizados} usuarios`,
        usuariosActualizados,
        misionesCreadas,
        totalUsuarios: usuarios?.length || 0,
        totalMisionesMultiApertura: misionesMultiApertura.length
      });
    }

    // 🎯 NUEVO: Opción para corregir misiones de bienvenida rotas
    if (corregirBienvenida === "todos") {
      
      const supabase = createClient();
      
      // Buscar todas las misiones de bienvenida con progreso incorrecto
      const { data: misionesBienvenidaRotas, error } = await supabase
        .from("misiones_usuario")
        .select(`
          id,
          usuario_id,
          progreso,
          mision:misiones!inner(nombre)
        `)
        .eq("mision.nombre", "Bienvenido")
        .eq("completada", false);

      if (error) {
        return NextResponse.json({
          success: false,
          error: "Error al buscar misiones de bienvenida",
          details: error
        });
      }

      let corregidas = 0;
      
      for (const mision of misionesBienvenidaRotas || []) {
        const progreso = mision.progreso || { actual: 0, objetivo: 1 };
        
        // Si el progreso actual es 0, corregirlo
        if (progreso.actual === 0) {
          const resultado = await procesarMisionRegistro(mision.usuario_id);
          if (resultado.success) {
            corregidas++;
          }
        }
      }
      
      return NextResponse.json({
        success: true,
        message: `${corregidas} misiones de bienvenida corregidas`,
        totalEncontradas: misionesBienvenidaRotas?.length || 0,
        corregidas
      });
    }

    if (!userId) {
      return NextResponse.json(
        { error: "userId es requerido" },
        { status: 400 }
      );
    }

    
    const resultado = await inicializarMisionesUsuario(userId);
    
    return NextResponse.json({
      success: resultado.success,
      message: resultado.message,
      details: resultado
    });
  } catch (error) {
    console.error("Error en inicialización manual:", error);
    return NextResponse.json(
      { error: "Error en el servidor" },
      { status: 500 }
    );
  }
} 