"use server";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import bcryptjs from "bcryptjs";

import { signIn } from "@/app/auth";
import { procesarMisionLogin } from "@/lib/missionUtils";

// Inicializar el cliente de Supabase con las variables de entorno
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Faltan las variables de entorno de Supabase");
}

const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    console.log("Login attempt for:", email);

    if (!email || !password) {
      return NextResponse.json(
        { error: "Correo y contraseña son obligatorios" },
        { status: 400 },
      );
    }

    // Verificar si el usuario existe primero
    const { data: user, error: userError } = await supabase
      .from("usuarios")
      .select("id, correo, nombre_usuario, password, oauth")
      .eq("correo", email)
      .single();

    if (userError) {
      console.error("Error al buscar usuario:", userError);

      return NextResponse.json(
        { error: "Credenciales inválidas" },
        { status: 401 },
      );
    }

    if (!user) {
      console.log("Usuario no encontrado:", email);

      return NextResponse.json(
        { error: "Credenciales inválidas" },
        { status: 401 },
      );
    }

    // Verificar si es una cuenta OAuth sin contraseña
    if (!user.password && user.oauth) {
      console.log("Intento de login con credenciales en cuenta OAuth:", email);

      return NextResponse.json(
        { 
          error: "Esta cuenta fue creada con Google/Discord. Por favor, inicia sesión usando el mismo método.",
          type: "oauth_account"
        },
        { status: 400 },
      );
    }

    // Verificar la contraseña manualmente primero
    const isPasswordValid = await bcryptjs.compare(password, user.password);

    if (!isPasswordValid) {
      console.log("Contraseña incorrecta para:", email);

      return NextResponse.json(
        { error: "Credenciales inválidas" },
        { status: 401 },
      );
    }

    // Usar directamente el signIn de NextAuth
    try {
      const result = await signIn("credentials", {
        redirect: false,
        email: email,
        password: password,
      });

      if (result?.error) {
        console.error("Error de autenticación NextAuth:", result.error);

        return NextResponse.json({ error: result.error }, { status: 401 });
      }

      console.log("Inicio de sesión exitoso para:", email);

      // 🎯 PROCESAR MISIÓN DE LOGIN
      try {
        await procesarMisionLogin(user.id);
        console.log("✅ Misión de login procesada para:", user.id);
      } catch (missionError) {
        console.warn("⚠️ Error al procesar misión de login:", missionError);
        // No fallar el login por errores de misiones
      }

      return NextResponse.json(
        {
          success: true,
          user: {
            id: user.id,
            email: user.correo,
            nombre: user.nombre_usuario,
          },
        },
        { status: 200 },
      );
    } catch (authError: any) {
      console.error("Error en signIn de NextAuth:", authError);

      return NextResponse.json(
        {
          error:
            "Error de autenticación: " + (authError.message || "Desconocido"),
          details: authError,
        },
        { status: 500 },
      );
    }
  } catch (error: any) {
    console.error("Error en el inicio de sesión:", error);

    return NextResponse.json(
      {
        error: "Error en el servidor durante el inicio de sesión",
        details: error.message,
      },
      { status: 500 },
    );
  }
}
