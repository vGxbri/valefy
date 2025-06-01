import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/auth';
import { 
  actualizarProgresoMision, 
  procesarMisionMultiApertura, 
  procesarMisionRegistro
} from '@/lib/missionUtils';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const { tipoActividad, cantidad = 1, datosAdicionales } = await request.json();

    let resultado: any = {};

    switch (tipoActividad) {
      case 'caja_abierta':
        // Procesar apertura normal
        resultado = await actualizarProgresoMision(session.user.id, 'caja_abierta', cantidad);
        
        // Si se abrieron 5+ cajas, procesar multi-apertura
        if (cantidad >= 5) {
          const multiResultado = await procesarMisionMultiApertura(session.user.id, cantidad);
          resultado.multiApertura = multiResultado;
        }
        break;

      case 'skin_eliminada':
        resultado = await actualizarProgresoMision(session.user.id, 'skin_eliminada', cantidad);
        break;

      case 'mejora_realizada':
        resultado = await actualizarProgresoMision(session.user.id, 'mejora_realizada', cantidad);
        break;

      case 'registro_completado':
        resultado = await procesarMisionRegistro(session.user.id);
        break;

      default:
        return NextResponse.json(
          { success: false, error: 'Tipo de actividad no reconocido' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      resultado,
      mensaje: `Actividad ${tipoActividad} procesada correctamente`
    });

  } catch (error) {
    console.error('Error al procesar actividad de misión:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 