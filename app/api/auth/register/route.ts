import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { User } from "@/types/database";
import { v4 as uuidv4 } from "uuid";

// Inicializar el cliente de Supabase con las variables de entorno
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Faltan las variables de entorno de Supabase");
}

const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: Request) {
  try {
    const { email, username, password } = await request.json();

    // Validar que todos los campos requeridos estén presentes
    if (!email || !username || !password) {
      return NextResponse.json(
        { error: "Todos los campos son obligatorios" },
        { status: 400 },
      );
    }

    // Verificar si el correo ya existe
    const { data: existingEmail } = await supabase
      .from("usuarios")
      .select("id")
      .eq("correo", email)
      .single();

    if (existingEmail) {
      return NextResponse.json(
        { error: "Este correo electrónico ya está registrado" },
        { status: 400 },
      );
    }

    // Verificar si el nombre de usuario ya existe
    const { data: existingUsername } = await supabase
      .from("usuarios")
      .select("id")
      .eq("nombre_usuario", username)
      .single();

    // Hashear la contraseña antes de guardarla
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Crear el usuario en la tabla usuarios con UUID
    const { data, error } = await supabase
      .from("usuarios")
      .insert<User>([
        {
          id: uuidv4(),
          nombre_usuario: username,
          correo: email,
          password: hashedPassword,
          saldo: 0, // Saldo inicial
        },
      ])
      .select();

    if (error) {
      console.error("Error al crear usuario:", error);

      return NextResponse.json(
        { error: "Error al crear el usuario" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, user: data[0] }, { status: 201 });
  } catch (error) {
    console.error("Error en el registro:", error);

    return NextResponse.json(
      { error: "Error en el servidor" },
      { status: 500 },
    );
  }
}
