"use client";

import { ReactNode, useEffect } from "react"; // Añadir useEffect
import { useSession } from 'next-auth/react'; // Importar useSession
import { useRouter } from 'next/navigation'; // Importar useRouter
import { Navbar } from "@/components/Navbar"; // Importar la nueva Navbar
import { BellIcon, UserCircleIcon } from "@heroicons/react/24/outline"; // Iconos para la barra superior
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"

interface MainLayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession(); // Obtener estado de la sesión
  const router = useRouter(); // Obtener el router

  useEffect(() => {
    // Si no está autenticado y la carga ha terminado, redirigir a la landing
    if (status === 'unauthenticated') {
      router.push('/');
    }
  }, [status, router]); // Añadir status y router a las dependencias

  // Si está cargando o no está autenticado, no renderizar el contenido principal aún
  if (status === 'loading' || status === 'unauthenticated') {
    // Puedes mostrar un spinner de carga aquí si lo deseas
    return <div>Cargando...</div>; // O null, o un componente de carga
  }

  // Si está autenticado, renderizar el layout
  return (
    <SidebarProvider>
      <AppSidebar />
      <main>
        {children}
      </main>
    </SidebarProvider>
  );
}
