import { NextResponse } from "next/server";
import { inicializarMisionesUsuario } from "@/lib/missionUtils";

export async function POST(request: Request) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: "userId es requerido" },
        { status: 400 }
      );
    }

    console.log(`🔧 Inicializando misiones manualmente para usuario: ${userId}`);
    
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