"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { createClient } from '@/utils/supabase/client';
import InventoryDisplayComponent from "../../../components/InventoryDisplayComponent";
import { Button } from "@/components/ui/button";

export default function Page() {
  const { data: nextAuthSession, status: nextAuthStatus } = useSession();
  
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState<boolean>(true);

  const supabase = createClient(); // Supabase client still needed for InventoryDisplayComponent

  useEffect(() => {
    console.log("[InventarioPage] Next-Auth status:", nextAuthStatus);
    if (nextAuthStatus === "loading") {
      setIsLoadingSession(true);
      setUserId(null);
    } else if (nextAuthStatus === "unauthenticated") {
      setIsLoadingSession(false);
      setUserId(null);
      console.log("[InventarioPage] User is unauthenticated via Next-Auth.");
    } else if (nextAuthStatus === "authenticated") {
      if (nextAuthSession?.user?.id) {
        console.log("[InventarioPage] Authenticated via Next-Auth. User ID:", nextAuthSession.user.id);
        setUserId(nextAuthSession.user.id as string); // Ensure it's string
      } else {
        console.warn("[InventarioPage] Next-Auth authenticated, but no user ID found in session:", nextAuthSession);
        setUserId(null);
      }
      setIsLoadingSession(false);
    }
  }, [nextAuthSession, nextAuthStatus]);

  if (isLoadingSession) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 to-slate-800 text-white p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mb-4"></div>
        <p className="text-lg text-gray-300">Cargando sesión...</p>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 to-slate-800 text-white p-4">
        <div className="bg-gray-800/70 border border-gray-700/50 p-8 rounded-lg shadow-xl max-w-md text-center">
          <h2 className="text-2xl font-semibold mb-2">Acceso Requerido</h2>
          <p className="mb-6 text-gray-300">Por favor, inicia sesión para acceder a tu inventario.</p>
          <Link href="/login">
            <Button variant="default" className="bg-primary text-primary-foreground hover:bg-primary/90">
              Iniciar Sesión
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return <InventoryDisplayComponent supabase={supabase} userId={userId} />;
}
