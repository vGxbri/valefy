"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { motion } from "framer-motion";

import StripeCard from "@/components/StripeCard";
import { extraerTipoCaja } from "@/lib/boxUtils";

interface Caja {
  id: string;
  nombre: string;
  precio: number;
  imagen_url: string;
  ruta: string;
  esta_disponible: boolean;
  es_diaria?: boolean;
  fecha_actualizacion?: string;
  categoria?: string;
}

// Cliente de Supabase singleton
let supabaseClient: ReturnType<typeof createClient> | null = null;

const getSupabaseClient = () => {
  if (typeof window === "undefined") {
    return null;
  }

  if (!supabaseClient) {
    supabaseClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
  }

  return supabaseClient;
};

// Función para actualizar la ruta de una caja en la base de datos
const updateCajaRuta = async (cajaId: string, ruta: string) => {
  try {
    const supabase = getSupabaseClient();

    if (!supabase) return;

    const { error } = await supabase
      .from("cajas")
      .update({ ruta })
      .eq("id", cajaId);

    if (error) {
      console.error("Error al actualizar ruta de caja:", error);
    }
  } catch (err) {
    console.error("Error en updateCajaRuta:", err);
  }
};

// Categorías predeterminadas y sus colores
const CATEGORIAS_DEFAULT = {
  "premium": { nombre: "Premium", color: "from-amber-500/20 to-amber-600/20" },
  "ultra": { nombre: "Ultra", color: "from-purple-500/20 to-purple-600/20" },
  "especial": { nombre: "Especial", color: "from-emerald-500/20 to-emerald-600/20" },
  "diaria": { nombre: "Diaria", color: "from-blue-500/20 to-blue-600/20" },
  "gratis": { nombre: "Gratis", color: "from-green-500/20 to-green-600/20" },
};

export default function MainPage() {
  const [cajas, setCajas] = useState<Caja[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [nextUpdate, setNextUpdate] = useState<string | null>(null);
  const [cajasPorCategoria, setCajasPorCategoria] = useState<Record<string, Caja[]>>({});
  const [categorias, setCategorias] = useState<string[]>([]);

  useEffect(() => {
    let isMounted = true;

    const fetchCajas = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const supabase = getSupabaseClient();

        if (!supabase) {
          throw new Error("No se pudo conectar con la base de datos");
        }

        // Obtener cajas desde Supabase
        const { data: cajasData, error: cajasError } = await supabase
          .from("cajas")
          .select("*")
          .order("precio", { ascending: true })
          .returns<Caja[]>();

        if (cajasError) {
          throw cajasError;
        }

        if (isMounted) {
          if (cajasData && cajasData.length > 0) {
            // Agrupar cajas por categoría
            const agrupadas: Record<string, Caja[]> = {};
            const categoriasEncontradas = new Set<string>();
            
            // Procesar cada caja
            cajasData.forEach(caja => {
              // Determinar categoría para la caja
              const categoria = caja.categoria?.toLowerCase() || 
                                (caja.es_diaria ? "diaria" : 
                                 caja.precio === 0 ? "gratis" : "premium");
              
              // Añadir a la lista de categorías
              categoriasEncontradas.add(categoria);
              
              // Añadir a la lista agrupada
              if (!agrupadas[categoria]) {
                agrupadas[categoria] = [];
              }
              agrupadas[categoria].push(caja);
            });
            
            // Ordenar las categorías para mostrarlas en un orden predeterminado
            const ordenCategorias = ["diaria", "gratis", "premium", "ultra", "especial"];
            const categoriasOrdenadas = Array.from(categoriasEncontradas).sort((a, b) => {
              const indexA = ordenCategorias.indexOf(a);
              const indexB = ordenCategorias.indexOf(b);
              return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
            });
            
            setCajas(cajasData);
            setCajasPorCategoria(agrupadas);
            setCategorias(categoriasOrdenadas);

            // Buscar la caja diaria para mostrar su próxima actualización
            const cajaDiaria = cajasData.find((caja) => caja.es_diaria);

            if (cajaDiaria && cajaDiaria.fecha_actualizacion) {
              const fechaActualizacion = new Date(
                cajaDiaria.fecha_actualizacion,
              );

              // Establecer la hora a las 9:00 AM del día siguiente
              fechaActualizacion.setDate(fechaActualizacion.getDate() + 1);
              fechaActualizacion.setHours(9, 0, 0, 0);
              setNextUpdate(fechaActualizacion.toISOString());
            }
          } else {
            throw new Error("No se encontraron cajas en la base de datos");
          }
        }
      } catch (error: any) {
        console.error("Error al cargar las cajas:", error);

        if (isMounted) {
          setError(
            "Error al cargar las cajas. Por favor, intenta de nuevo más tarde.",
          );
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

    return fecha.toLocaleString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Obtener el nombre y color de la categoría
  const getCategoriaInfo = (categoria: string) => {
    const categoriaLower = categoria.toLowerCase();
    return CATEGORIAS_DEFAULT[categoriaLower as keyof typeof CATEGORIAS_DEFAULT] || 
           { nombre: categoria.charAt(0).toUpperCase() + categoria.slice(1), color: "from-gray-500/20 to-gray-600/20" };
  };

  // Animación de aparición escalonada para las categorías
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="flex flex-col gap-8 pl-16 md:pr-12 lg:pr-16 pt-12 pb-12 min-h-screen bg-background w-full max-w-full flex-1">
      {/* Sección de Cajas */}
      <div className="w-full">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold text-foreground flex items-center font-[Raleway] font-semibold italic tracking-widest">
            / CAJAS
          </h2>

          <div className="flex items-center gap-4">
            {nextUpdate && (
              <div className="hidden md:flex items-center px-4 py-2 bg-primary/10 rounded-lg border border-primary/20">
                <span className="text-xs text-white/70 mr-2">Próxima actualización:</span>
                <span className="text-sm font-medium text-primary">{formatNextUpdate()}</span>
              </div>
            )}
            <button
              className="px-3 py-1 text-sm bg-background/40 hover:bg-background/60 text-white/70 hover:text-white border border-white/10 rounded-md transition-colors"
              title="Panel de administración para pruebas"
              onClick={() => (window.location.href = "/admin")}
            >
              Admin
            </button>
          </div>
        </div>

        <div className="w-full rounded-3xl bg-gradient-to-br from-primary/10 via-backgroundAlt/30 to-secondary/5 backdrop-blur-sm border border-border/30 p-6 shadow-xl overflow-hidden relative">
          {/* Efecto de fondo */}
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/10 rounded-full blur-3xl opacity-30" />
          <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-secondary/10 rounded-full blur-3xl opacity-30" />

          {/* Contenedor de tarjetas de cajas */}
          <div className="relative z-10">
            {isLoading ? (
              <div className="flex justify-center items-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary" />
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <p className="text-red-400 mb-4">{error}</p>
                <button
                  className="px-4 py-2 bg-primary/20 hover:bg-primary/30 rounded-md transition-colors"
                  onClick={() => window.location.reload()}
                >
                  Reintentar
                </button>
              </div>
            ) : (
              <motion.div 
                className="space-y-12"
                initial="hidden"
                animate="show"
                variants={containerVariants}
              >
                {categorias.map((categoria, index) => {
                  const categoriaInfo = getCategoriaInfo(categoria);
                  
                  return (
                    <motion.div 
                      key={categoria} 
                      className="mb-10"
                      variants={itemVariants}
                    >
                      <div className={`p-4 rounded-xl mb-4 bg-gradient-to-r ${categoriaInfo.color} border-l-4 border-primary/50`}>
                        <h3 className="text-xl font-bold text-white flex items-center">
                          <span className="mr-2">{categoriaInfo.nombre}</span>
                          {categoria.toLowerCase() === 'diaria' && (
                            <span className="text-xs bg-primary/80 text-white px-2 py-0.5 rounded-full">
                              ¡Actualiza cada día!
                            </span>
                          )}
                        </h3>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {cajasPorCategoria[categoria]?.map((caja) => {
                          // Usar la función centralizada para extraer el tipo de caja
                          const tipoCaja = extraerTipoCaja(caja.nombre, caja.es_diaria);

                          // Casos especiales para rutas
                          let rutaEspecial = null;

                          // Caso especial para Caja de Darío
                          if (caja.nombre === "Caja de Darío") {
                            rutaEspecial = "/main/dario";
                            console.log(
                              "Ruta especial para Caja de Darío:",
                              rutaEspecial,
                            );
                          }

                          // Construir la ruta dinámica (usar ruta especial si existe)
                          const rutaDinamica = rutaEspecial || `/main/${tipoCaja}`;

                          // Guardar la ruta en la base de datos para futuras referencias
                          if (caja.ruta !== rutaDinamica) {
                            console.log(
                              `Actualizando ruta para ${caja.nombre}: ${rutaDinamica}`,
                            );
                            // No bloqueamos la renderización con await
                            updateCajaRuta(caja.id, rutaDinamica);
                          }

                          return (
                            <Link
                              key={caja.id}
                              className="block transform transition-all duration-200 hover:scale-[1.02]"
                              href={rutaDinamica}
                            >
                              <StripeCard
                                badge={caja.es_diaria ? "Diaria" : undefined}
                                btnText={
                                  caja.precio === 0
                                    ? "Abrir gratis"
                                    : `${caja.precio} VP`
                                }
                                disabled={!caja.esta_disponible}
                                imageUrl={caja.imagen_url}
                                title={caja.nombre}
                              />
                            </Link>
                          );
                        })}
                      </div>
                    </motion.div>
                  );
                })}
                
                {categorias.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-white/50">No hay cajas disponibles</p>
                  </div>
                )}
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
