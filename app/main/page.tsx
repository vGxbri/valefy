'use client';

import { useEffect, useState } from 'react';
import Image from "next/image";
import StripeCard from "@/components/StripeCard";
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

interface Caja {
  id: string;
  nombre: string;
  precio: number;
  imagen_url: string;
  descripcion: string;
  ruta: string;
  esta_disponible: boolean;
  es_diaria?: boolean;
  fecha_actualizacion?: string;
}

// Cliente de Supabase singleton
let supabaseClient: ReturnType<typeof createClient> | null = null;

const getSupabaseClient = () => {
  if (typeof window === 'undefined') {
    return null;
  }
  
  if (!supabaseClient) {
    supabaseClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  
  return supabaseClient;
};

export default function MainPage() {
  const [cajas, setCajas] = useState<Caja[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [nextUpdate, setNextUpdate] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    
    const fetchCajas = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const supabase = getSupabaseClient();
        
        if (!supabase) {
          throw new Error('No se pudo conectar con la base de datos');
        }
        
        // Obtener cajas desde Supabase
        const { data: cajasData, error: cajasError } = await supabase
          .from('cajas')
          .select('*')
          .order('precio', { ascending: true });
          
        if (cajasError) {
          throw cajasError;
        }
        
        if (isMounted) {
          if (cajasData && cajasData.length > 0) {
            setCajas(cajasData);
            
            // Buscar la caja diaria para mostrar su próxima actualización
            const cajaDiaria = cajasData.find(caja => caja.es_diaria);
            if (cajaDiaria && cajaDiaria.fecha_actualizacion) {
              const fechaActualizacion = new Date(cajaDiaria.fecha_actualizacion);
              // Establecer la hora a las 9:00 AM del día siguiente
              fechaActualizacion.setDate(fechaActualizacion.getDate() + 1);
              fechaActualizacion.setHours(9, 0, 0, 0);
              setNextUpdate(fechaActualizacion.toISOString());
            }
          } else {
            throw new Error('No se encontraron cajas en la base de datos');
          }
        }
      } catch (error: any) {
        console.error('Error al cargar las cajas:', error);
        
        if (isMounted) {
          setError('Error al cargar las cajas. Por favor, intenta de nuevo más tarde.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    
    fetchCajas();
    
    // Cleanup al desmontar el componente
    return () => {
      isMounted = false;
    };
  }, []);

  // Función para formatear la fecha de próxima actualización
  const formatNextUpdate = () => {
    if (!nextUpdate) return null;
    
    const fecha = new Date(nextUpdate);
    return fecha.toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  return (
    <div className="flex flex-col gap-8 pl-16 md:pr-12 lg:pr-16 pt-12 pb-12 min-h-screen bg-background w-full max-w-full flex-1">
      {/* Sección de Cajas */}
      <div className="w-full">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold text-foreground flex items-center font-[Raleway] font-semibold italic tracking-widest">
            / CAJAS
          </h2>
          
          <button
            onClick={() => window.location.href = '/admin'}
            className="px-3 py-1 text-sm bg-background/40 hover:bg-background/60 text-white/70 hover:text-white border border-white/10 rounded-md transition-colors"
            title="Panel de administración para pruebas"
          >
            Admin (Pruebas)
          </button>
        </div>
        
        {nextUpdate && (
          <div className="mb-4 text-sm text-white/60 flex items-center">
            <span className="mr-2">Próxima actualización de la caja diaria:</span>
            <span className="font-semibold text-primary">{formatNextUpdate()}</span>
          </div>
        )}
        
        <div className="w-full rounded-3xl bg-gradient-to-br from-primary/10 via-backgroundAlt/30 to-secondary/5 backdrop-blur-sm border border-border/30 p-6 shadow-xl overflow-hidden relative">
          {/* Efecto de fondo */}
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/10 rounded-full blur-3xl opacity-30"></div>
          <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-secondary/10 rounded-full blur-3xl opacity-30"></div>
          
          {/* Contenedor de tarjetas de cajas */}
          <div className="relative z-10">
            {isLoading ? (
              <div className="flex justify-center items-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <p className="text-red-400 mb-4">{error}</p>
                <button 
                  onClick={() => window.location.reload()} 
                  className="px-4 py-2 bg-primary/20 hover:bg-primary/30 rounded-md transition-colors"
                >
                  Reintentar
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {cajas.map((caja) => {
                  // Extraer el tipo de caja del nombre (por ejemplo, "Caja Premium" -> "premium")
                  const tipoCaja = caja.nombre.split(' ')[1]?.toLowerCase() || 'diaria';
                  // Construir la ruta dinámica
                  const rutaDinamica = `/main/${tipoCaja}`;
                  
                  return (
                    <Link href={rutaDinamica} key={caja.id} className="block transform transition-all duration-200 hover:scale-[1.02]">
                      <StripeCard
                        imageUrl={caja.imagen_url}
                        title={caja.nombre}
                        btnText={caja.precio === 0 ? "Abrir gratis" : `${caja.precio} VP`}
                        disabled={!caja.esta_disponible}
                        badge={caja.es_diaria ? "Diaria" : undefined}
                      />
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}