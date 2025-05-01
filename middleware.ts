import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from '@/app/auth';

export async function middleware(req: NextRequest) {
  try {
    const session = await auth();
    const { pathname } = req.nextUrl;

    // Lista de rutas públicas que no requieren autenticación
    const publicRoutes = ['/'];
    const isPublicRoute = publicRoutes.includes(pathname);

    // Rutas que requieren verificación de sesión
    const protectedRoutes = ['/main'];
    const isProtectedRoute = protectedRoutes.includes(pathname);

    // Si el usuario está autenticado
    if (session?.user) {
      // Si intenta acceder a una ruta pública estando autenticado
      if (isPublicRoute) {
        return NextResponse.redirect(new URL('/main', req.url));
      }
      // Usuario autenticado accediendo a rutas protegidas
      return NextResponse.next();
    }

    // Si el usuario NO está autenticado
    if (!session?.user && isProtectedRoute) {
      // Redirigir a la página principal solo si intenta acceder a rutas protegidas
      return NextResponse.redirect(new URL('/', req.url));
    }

    // Permitir acceso a rutas públicas sin autenticación
    return NextResponse.next();
  } catch (error) {
    console.error('Error en middleware:', error);
    // En caso de error, redirigir a la página principal
    return NextResponse.redirect(new URL('/', req.url));
  }
}

// Configuración del matcher para especificar en qué rutas se ejecutará el middleware
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - logo-valefy.png (logo file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|logo-valefy.png).*)',
    // Incluir explícitamente la ruta raíz para asegurar que sea manejada
    '/',
  ],
};