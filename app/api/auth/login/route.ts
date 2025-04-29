'use server';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { signIn } from '@/app/auth';

// Inicializar el cliente de Supabase con las variables de entorno
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Faltan las variables de entorno de Supabase');
}

const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return NextResponse.json({ error: 'Correo y contraseña son obligatorios' }, { status: 400 });
  }

  try {
    // Buscar al usuario por correo electrónico
    const { data: user, error: userError } = await supabase
      .from('usuarios')
      .select('id, correo, password, nombre_usuario')
      .eq('correo', email)
      .single();

    if (userError || !user) {
      console.error('Error buscando usuario o usuario no encontrado:', userError);
      return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
    }

    // Verificar la contraseña
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
    }

    // Usar signIn de NextAuth para establecer la sesión
    const result = await signIn('credentials', {
      redirect: false,
      email: user.correo,
      id: user.id.toString(),
      username: user.nombre_usuario,
      callbackUrl: '/'
    });

    if (result?.error) {
      return NextResponse.json({ error: 'Error al establecer la sesión' }, { status: 401 });
    }

    console.log('Inicio de sesión exitoso para:', user.correo);
    return NextResponse.json({ 
      user: { 
        id: user.id, 
        email: user.correo, 
        username: user.nombre_usuario 
      },
      success: true
    }, { status: 200 });

  } catch (error) {
    console.error('Error en el inicio de sesión:', error);
    return NextResponse.json({ error: 'Error en el servidor durante el inicio de sesión' }, { status: 500 });
  }
}