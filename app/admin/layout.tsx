'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Verificar si el usuario tiene permisos de administrador
  useEffect(() => {
    if (status === 'loading') return;

    // Si no hay sesión o el usuario no es administrador, redirigir a la página principal
    if (!session) {
      router.push('/');
    }
    
    // Aquí podrías agregar una verificación adicional para comprobar si el usuario es administrador
    // Por ahora, permitimos a cualquier usuario autenticado acceder a la página de administración para pruebas
  }, [session, status, router]);

  // Mostrar pantalla de carga mientras se verifica la sesión
  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Barra de navegación de administración */}
      <div className="bg-background/60 backdrop-blur-md border-b border-white/10 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <h1 className="text-xl font-bold text-white">Valefy Admin</h1>
          </div>
          <div>
            <button
              onClick={() => router.push('/main')}
              className="text-white/70 hover:text-white transition-colors"
            >
              Volver a la aplicación
            </button>
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      <main>{children}</main>
    </div>
  );
}
