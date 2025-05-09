import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Crear cliente de Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    // Llamar a la función de actualización de la caja diaria
    const { data, error } = await supabase.rpc('forzar_actualizacion_caja_diaria');
    
    if (error) {
      console.error('Error al actualizar la caja diaria:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Caja diaria actualizada correctamente',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error inesperado:', error);
    return NextResponse.json({ error: error.message || 'Error desconocido' }, { status: 500 });
  }
}
