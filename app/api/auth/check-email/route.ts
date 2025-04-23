import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Inicializar el cliente de Supabase con las variables de entorno
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Faltan las variables de entorno de Supabase');
}

const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    // Validar que el correo esté presente
    if (!email) {
      return NextResponse.json(
        { error: 'El correo electrónico es obligatorio' },
        { status: 400 }
      );
    }

    // Verificar si el correo ya existe
    const { data: existingEmail } = await supabase
      .from('usuarios')
      .select('id')
      .eq('correo', email)
      .single();

    if (existingEmail) {
      return NextResponse.json(
        { error: 'Este correo electrónico ya está registrado' },
        { status: 400 }
      );
    }

    // Si el correo no existe, devolvemos una respuesta exitosa
    return NextResponse.json(
      { success: true, message: 'Correo disponible' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error al verificar el correo:', error);
    return NextResponse.json(
      { error: 'Error en el servidor' },
      { status: 500 }
    );
  }
}