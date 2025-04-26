'use server';

import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

// Inicializar el cliente de Supabase con las variables de entorno
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Faltan las variables de entorno de Supabase');
}

const supabase = createClient(supabaseUrl, supabaseKey);

export async function loginUser(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { success: false, error: 'Correo y contraseña son obligatorios' };
  }

  try {
    // Buscar al usuario por correo electrónico
    const { data: user, error: userError } = await supabase
      .from('usuarios')
      .select('id, correo, password, nombre_usuario') // Seleccionar los campos necesarios
      .eq('correo', email)
      .single();

    if (userError || !user) {
      console.error('Error buscando usuario o usuario no encontrado:', userError);
      return { success: false, error: 'Credenciales inválidas' }; // Mensaje genérico por seguridad
    }

    // Verificar la contraseña
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return { success: false, error: 'Credenciales inválidas' }; // Mensaje genérico por seguridad
    }

    // Inicio de sesión exitoso (aquí podrías manejar la sesión, ej. con cookies o JWT)
    console.log('Inicio de sesión exitoso para:', user.correo);
    // Devolver datos relevantes del usuario (sin la contraseña)
    return { success: true, user: { id: user.id, email: user.correo, username: user.nombre_usuario } };

  } catch (error) {
    console.error('Error en el inicio de sesión:', error);
    return { success: false, error: 'Error en el servidor durante el inicio de sesión' };
  }
}