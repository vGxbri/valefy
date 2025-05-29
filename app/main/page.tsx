"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { motion } from "framer-motion";
import Image from "next/image";
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
  categoria_titulo?: string;
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
              const categoria = caja.categoria_titulo?.toUpperCase() || 
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
            const ordenCategorias = ["principal", "alumno"];
            const categoriasOrdenadas = Array.from(categoriasEncontradas).sort((a, b) => {
              const lowerA = a.toLowerCase();
              const lowerB = b.toLowerCase();
              const indexA = ordenCategorias.indexOf(lowerA);
              const indexB = ordenCategorias.indexOf(lowerB);
              
              // Si ambas están en ordenCategorias, usar ese orden
              if (indexA !== -1 && indexB !== -1) {
                return indexA - indexB;
              }
              // Si solo A está, A va primero
              if (indexA !== -1) {
                return -1;
              }
              // Si solo B está, B va primero
              if (indexB !== -1) {
                return 1;
              }
              // Si ninguna está, orden alfabético como fallback (o mantener orden original)
              return lowerA.localeCompare(lowerB);
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
    <>      
      <div className="body-main-page flex flex-col gap-8 px-4 sm:px-8 md:px-12 lg:px-16 pt-12 pb-12 min-h-screen bg-background w-full max-w-full flex-1">        
        {/* Sección de Cajas */}
        <div className="w-full">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-bold text-foreground flex items-center font-[Raleway] font-semibold italic tracking-widest">
              / CAJAS
            </h2>
          </div>

          <div className="w-full overflow-hidden relative p-8">
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
                    
                    // Filtrar cajas disponibles para esta categoría
                    const cajasDisponiblesEnCategoria = cajasPorCategoria[categoria]?.filter(caja => caja.esta_disponible) || [];

                    // No renderizar la sección de categoría si no hay cajas disponibles
                    if (cajasDisponiblesEnCategoria.length === 0) {
                      return null;
                    }
                    
                    return (
                      <motion.div 
                        key={categoria} 
                        className="mb-10 rounded-2xl"
                        variants={itemVariants}
                      >
                        
                        <div className="relative">
                          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-alternative/50 to-transparent" />
                        </div>
                        <div className={`mb-6 pt-10 text-center`}>
                          <h3 className="font-bold inline-block
                                        text-3xl font-bold text-foreground font-[Raleway] font-semibold italic tracking-widest
                                        [text-shadow:_0px_0px_20px_rgba(255,255,255,0.35)] bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                            · {categoriaInfo.nombre} ·
                          </h3>
                        </div>

                        {/* Banner para la categoría "alumno" - Condición mejorada */}
                        {(categoria.toLowerCase().includes('alumno') || categoriaInfo.nombre.toLowerCase().includes('alumno')) && (
                          <div className="flex flex-row justify-between items-center my-8 mx-auto w-5/6 p-6 rounded-lg bg-gradient-to-br from-primary/20 to-secondary/20 shadow-2xl border border-primary/40 backdrop-blur-sm">
                            <div className="flex flex-col items-start w-1/2">
                              <h4 className="font-[Raleway] text-2xl font-semibold text-white mb-2 tracking-wide [text-shadow:_0px_0px_18px_rgba(255,255,255,0.5)]">
                                ¡NOVEDAD EXCLUSIVA!
                              </h4>
                              <p className="text-foreground/90 text-lg leading-relaxed font-light text-pretty">
                                Descubre nuestras cajas <span className="font-semibold bg-gradient-to-r from-primary/100 to-primary/80 bg-clip-text text-transparent">especialmente seleccionadas</span> por nuestros alumnos.
                              </p>
                            </div>
                            <div className="flex flex-col items-end w-1/2 absolute bottom-0 right-10">
                              <Image src="/jett_1.png" alt="Alumno" objectFit="contain" width={300} height={300} />
                            </div>
                          </div>
                        )}
                        
                        <div className="flex flex-wrap justify-center items-center w-full gap-2">
                          {cajasDisponiblesEnCategoria.map((caja) => {
                            // Usar la función centralizada para extraer el tipo de caja
                            const tipoCaja = extraerTipoCaja(caja.nombre, caja.es_diaria);

                            // Casos especiales para rutas
                            let rutaEspecial = null;

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
                              <>
                                <Link
                                  key={caja.id}
                                  className="w-full sm:w-1/2 md:w-1/3 lg:w-1/4 xl:w-[22%]"
                                  href={rutaDinamica}
                                >
                                  <StripeCard
                                    disabled={!caja.esta_disponible}
                                    imageUrl={caja.imagen_url}
                                    title={caja.nombre}
                                  />
                                </Link>
                                
                              </>
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
              <div className="relative mb-6 mt-10">
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-alternative/50 to-transparent" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
