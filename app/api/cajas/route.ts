import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// Inicializar el cliente de Supabase con las variables de entorno
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Faltan las variables de entorno de Supabase");
}

const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET() {
  try {
    // Obtener todas las cajas de la base de datos
    const { data: cajas, error } = await supabase
      .from("cajas")
      .select("*");

    if (error) {
      console.error("Error al obtener las cajas:", error);
      return NextResponse.json(
        { error: "Error al obtener las cajas" },
        { status: 500 }
      );
    }

    return NextResponse.json({ cajas }, { status: 200 });
  } catch (error) {
    console.error("Error en el servidor:", error);
    return NextResponse.json(
      { error: "Error en el servidor" },
      { status: 500 }
    );
  }
}