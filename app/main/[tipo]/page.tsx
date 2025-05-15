"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

import { Button } from "@/components/ui/button";
import {
  getWeaponSkins,
  filterQualitySkins,
  filterSkinsByIds,
} from "@/lib/valorantApi";
import { extraerTipoCaja } from "@/lib/boxUtils";
import BoxComponent, { BoxCaja } from "@/components/BoxComponent";

// Singleton para el cliente de Supabase
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

// Tipos de cajas disponibles
type TipoCaja = string; // Ahora puede ser cualquier string, no solo 'premium', 'diaria' o 'ultra'

// Función para crear datos por defecto mientras se cargan los datos reales
const crearCajaDefault = (tipo: TipoCaja): BoxCaja => {
  // Valores por defecto genéricos que se usarán para cualquier tipo de caja
  return {
    id: `${tipo}-default`,
    nombre: `Caja ${tipo.charAt(0).toUpperCase() + tipo.slice(1)}`,
    precio: 1000, // Precio por defecto
    imagen_url: "/img/caja-default.png", // Imagen por defecto
    descripcion: "Cargando descripción...",
    ruta: `/main/${tipo}`,
    esta_disponible: true,
  };
};

// Función para obtener todas las cajas disponibles de la base de datos
const obtenerCajasDisponibles = async (supabase: any): Promise<string[]> => {
  try {
    const { data } = await supabase
      .from("cajas")
      .select("nombre, es_diaria, ruta")
      .eq("esta_disponible", true);

    if (data && data.length > 0) {
      return data.map((caja: any) => {
        // Si la caja tiene una ruta guardada, extraer el tipo de la ruta
        if (caja.ruta && caja.ruta.startsWith("/main/")) {
          // Extraer el tipo de la ruta: /main/[tipo] -> tipo
          return caja.ruta.split("/").pop();
        }

        // Si no tiene ruta, usar la función centralizada para extraer el tipo
        return extraerTipoCaja(caja.nombre, caja.es_diaria);
      });
    }
  } catch (error) {
    console.error("Error al obtener cajas disponibles:", error);
  }

  // Si hay un error o no hay datos, devolver los tipos básicos
  return ["premium", "diaria", "ultra"];
};

// Ya no necesitamos dynamic import para DailyBox, usamos BoxComponent para todos los tipos de cajas

export default function CajaPage() {
  const params = useParams();
  const router = useRouter();
  const tipoParam =
    typeof params.tipo === "string" ? params.tipo : params.tipo?.[0] || "";

  // Estados para manejar los tipos de cajas disponibles
  const [tiposDisponibles, setTiposDisponibles] = useState<string[]>([
    "premium",
    "diaria",
    "ultra",
  ]);
  const [tipoValidado, setTipoValidado] = useState<TipoCaja>(
    tipoParam || "premium",
  );

  // Estados principales
  const [caja, setCaja] = useState<BoxCaja | null>(
    crearCajaDefault(tipoValidado),
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [cajaSkins, setCajaSkins] = useState<any[]>([]);
  const [probabilidades, setProbabilidades] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Estados para panel de administración
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateMessage, setUpdateMessage] = useState<string | null>(null);

  // Obtener el cliente de Supabase
  const supabase = getSupabaseClient();

  // Efecto para cargar los tipos de cajas disponibles
  useEffect(() => {
    const cargarTiposDisponibles = async () => {
      if (!supabase) return;

      try {
        // Normalizar el tipo del parámetro para comparación
        const tipoParamNormalizado = tipoParam
          .trim()
          .toLowerCase()
          .replace(/\s+/g, "-");

        // Obtener todas las cajas disponibles directamente de la base de datos
        const { data: cajasDisponibles } = await supabase
          .from("cajas")
          .select("id, nombre, es_diaria")
          .eq("esta_disponible", true);

        console.log(
          "Cajas disponibles en la base de datos:",
          cajasDisponibles?.map((c: any) => c.nombre),
        );

        // Extraer los tipos normalizados para el estado
        const tiposExtraidos =
          cajasDisponibles?.map((caja: any) =>
            extraerTipoCaja(caja.nombre, caja.es_diaria),
          ) || [];

        setTiposDisponibles(tiposExtraidos);

        // Crear un mapa de tipos normalizados a nombres completos de cajas
        const tipoACaja = new Map<string, any>();

        if (cajasDisponibles && cajasDisponibles.length > 0) {
          cajasDisponibles.forEach((caja: any) => {
            // Extraer el tipo normalizado para cada caja
            const tipoNormalizado = extraerTipoCaja(
              caja.nombre,
              caja.es_diaria,
            );

            tipoACaja.set(tipoNormalizado, caja);
            console.log(
              `Caja '${caja.nombre}' mapeada a tipo '${tipoNormalizado}'`,
            );
          });
        }

        // Verificar si el tipo solicitado existe directamente
        if (tipoParamNormalizado && tipoACaja.has(tipoParamNormalizado)) {
          setTipoValidado(tipoParamNormalizado);
          console.log(
            `Tipo de caja válido (coincidencia directa): ${tipoParamNormalizado}`,
          );

          return;
        }

        // Buscar coincidencias parciales si no hay coincidencia exacta
        let mejorCoincidencia: string | null = null;
        let maxPuntuacion = 0;

        tipoACaja.forEach((caja, tipo) => {
          // Evitar confundir 'diaria' con otros tipos que contengan 'd'
          if (tipo === "diaria" && tipoParamNormalizado !== "diaria") {
            return;
          }

          // Calcular puntuación de coincidencia
          let puntuacion = 0;

          // Coincidencia exacta tiene la mayor puntuación
          if (tipo === tipoParamNormalizado) {
            puntuacion = 100;
          }
          // Coincidencia de prefijo
          else if (
            tipo.startsWith(tipoParamNormalizado) ||
            tipoParamNormalizado.startsWith(tipo)
          ) {
            puntuacion = 75;
          }
          // Coincidencia de contiene
          else if (
            tipo.includes(tipoParamNormalizado) ||
            tipoParamNormalizado.includes(tipo)
          ) {
            puntuacion = 50;
          }

          // Si encontramos una mejor coincidencia, actualizarla
          if (puntuacion > maxPuntuacion) {
            maxPuntuacion = puntuacion;
            mejorCoincidencia = tipo;
          }
        });

        // Si encontramos alguna coincidencia
        if (mejorCoincidencia && maxPuntuacion > 0) {
          setTipoValidado(mejorCoincidencia);
          console.log(
            `Tipo de caja válido (coincidencia parcial): ${mejorCoincidencia}`,
          );
        } else {
          // Si no hay coincidencia, usar el primer tipo disponible
          let tipoDefault = "premium";

          if (tipoACaja.size > 0) {
            // Obtener la primera clave del Map de forma segura
            const primeraKey = Array.from(tipoACaja.keys())[0];

            tipoDefault = primeraKey || "premium";
          } else if (tiposExtraidos.includes("premium")) {
            tipoDefault = "premium";
          } else if (tiposExtraidos.includes("diaria")) {
            tipoDefault = "diaria";
          } else if (tiposExtraidos.length > 0) {
            tipoDefault = tiposExtraidos[0];
          }

          setTipoValidado(tipoDefault);
          console.log(
            `Tipo de caja inválido: ${tipoParamNormalizado}, redirigiendo a: ${tipoDefault}`,
          );

          // Si estamos en el cliente y el tipo no es válido, redirigir
          if (
            typeof window !== "undefined" &&
            tipoParamNormalizado !== tipoDefault
          ) {
            router.replace(`/main/${tipoDefault}`);
          }
        }
      } catch (error) {
        console.error("Error al cargar tipos de cajas:", error);
        // En caso de error, usar un valor por defecto
        setTipoValidado("premium");
      }
    };

    cargarTiposDisponibles();
  }, [tipoParam, router, supabase]);

  // Efecto para cargar los datos de la caja y sus skins
  useEffect(() => {
    let isMounted = true;

    const fetchCaja = async () => {
      if (!supabase) return;

      try {
        setIsLoading(true);
        setError(null);

        // Crear un AbortController para manejar timeout
        const controller = new AbortController();
        // Timeout de 5 segundos
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        // Normalizar el tipo para búsqueda (reemplazar guiones por espacios)
        const tipoNormalizado = tipoValidado.replace(/-/g, " ");

        // Estrategias de búsqueda para encontrar la caja
        let cajaData: any = null;
        let cajaError = null;

        // Estrategia 1: Buscar por es_diaria si el tipo es 'diaria'
        if (tipoValidado === "diaria") {
          const resultadoDiaria = await supabase
            .from("cajas")
            .select("*")
            .eq("es_diaria", true)
            .maybeSingle();

          if (resultadoDiaria.data) {
            cajaData = resultadoDiaria.data;
          }
        }

        // Si no encontramos la caja diaria o no estamos buscando la diaria
        if (!cajaData) {
          // Estrategia 2: Buscar con formato "Caja Tipo" (ej: "Caja Premium")
          const tipoCapitalizado =
            tipoNormalizado.charAt(0).toUpperCase() + tipoNormalizado.slice(1);
          const resultado1 = await supabase
            .from("cajas")
            .select("*")
            .eq("nombre", `Caja ${tipoCapitalizado}`)
            .maybeSingle();

          if (resultado1.data) {
            cajaData = resultado1.data;
          } else {
            // Estrategia 3: Buscar solo con el tipo capitalizado (ej: "Premium")
            const resultado2 = await supabase
              .from("cajas")
              .select("*")
              .eq("nombre", tipoCapitalizado)
              .maybeSingle();

            if (resultado2.data) {
              cajaData = resultado2.data;
            } else {
              // Estrategia 4: Buscar con ILIKE para encontrar coincidencias parciales
              const resultado3 = await supabase
                .from("cajas")
                .select("*")
                .ilike("nombre", `%${tipoNormalizado}%`)
                .maybeSingle();

              if (resultado3.data) {
                cajaData = resultado3.data;
              } else {
                // Estrategia 5: Última oportunidad - buscar cualquier coincidencia
                const resultado4 = await supabase
                  .from("cajas")
                  .select("*")
                  .limit(1);

                if (resultado4.data && resultado4.data.length > 0) {
                  cajaData = resultado4.data[0];
                  console.warn(
                    `No se encontró la caja '${tipoValidado}', usando la primera caja disponible.`,
                  );
                } else {
                  cajaError =
                    resultado1.error ||
                    resultado2.error ||
                    resultado3.error ||
                    resultado4.error;
                }
              }
            }
          }
        }

        // Si encontramos la caja
        if (cajaData) {
          // Obtener las skins asociadas a esta caja
          try {
            const { data: skinIdsData } = await supabase
              .from("cajas_skins")
              .select("skin_id")
              .eq("caja_id", cajaData.id);

            if (skinIdsData && skinIdsData.length > 0) {
              const skinIds = skinIdsData.map((item: any) => item.skin_id);

              // Obtener todas las skins de la API de Valorant
              const allSkins = await getWeaponSkins();

              // Filtrar por los IDs específicos de esta caja
              const matchingSkins = filterSkinsByIds(
                filterQualitySkins(allSkins),
                skinIds,
              );

              if (matchingSkins.length > 0) {
                // Convertir al formato interno
                const formattedSkins = matchingSkins.map((skin) => ({
                  id: skin.uuid,
                  nombre: skin.displayName,
                  bundleName: skin.displayName.split(" ")[0],
                  content_tier_id: skin.contentTierUuid || "",
                  uuid: skin.uuid,
                  imagen_url: skin.displayIcon || "",
                }));

                setCajaSkins(formattedSkins);
              }
            }

            // Obtener las probabilidades de la caja
            if (cajaData.id) {
              const { data: probData } = await supabase
                .from("tier_probabilidades")
                .select(
                  `
                  id,
                  caja_id,
                  content_tier_id,
                  probabilidad,
                  cantidad_skins,
                  content_tier:content_tier_id (
                    id,
                    nombre,
                    descripcion,
                    color,
                    uuid
                  )
                `,
                )
                .eq("caja_id", cajaData.id);

              if (probData) {
                // Mapeo seguro para las probabilidades
                const mappedProbs = probData.map((item: any) => ({
                  id: String(item.id),
                  caja_id: String(item.caja_id),
                  content_tier_id: String(item.content_tier_id),
                  probabilidad: Number(item.probabilidad),
                  cantidad_skins: Number(item.cantidad_skins),
                  content_tier:
                    item.content_tier &&
                    typeof item.content_tier === "object" &&
                    !("code" in item.content_tier)
                      ? {
                          id: String(item.content_tier.id),
                          nombre: String(item.content_tier.nombre),
                          descripcion: String(
                            item.content_tier.descripcion || "",
                          ),
                          color: String(item.content_tier.color),
                          uuid: String(item.content_tier.uuid),
                        }
                      : undefined,
                }));

                setProbabilidades(mappedProbs);
              }
            }
          } catch (skinError) {
            console.error("Error al cargar skins o probabilidades:", skinError);
          }
        }

        // Limpiar el timeout
        clearTimeout(timeoutId);

        if (isMounted) {
          if (cajaData) {
            setCaja(cajaData);
          } else {
            setCaja(crearCajaDefault(tipoValidado));
            if (cajaError) {
              console.warn(
                `No se encontró la caja '${tipoValidado}' en la base de datos:`,
                cajaError,
              );
            }
          }
          setIsLoading(false);
        }
      } catch (error: any) {
        console.error(`Error al cargar la caja ${tipoValidado}:`, error);

        if (isMounted) {
          if (error.name === "AbortError") {
            setError("Tiempo de espera agotado. Mostrando datos locales.");
          } else {
            setError(
              `No se pudo conectar con el servidor. Mostrando datos locales.`,
            );
          }

          // Usar datos por defecto en caso de error
          setCaja(crearCajaDefault(tipoValidado));
          setIsLoading(false);

          // Esperar un momento y luego ocultar el mensaje de error
          setTimeout(() => {
            if (isMounted) {
              setError(null);
            }
          }, 3000);
        }
      }
    };

    fetchCaja();

    // Limpieza al desmontar
    return () => {
      isMounted = false;
    };
  }, [tipoValidado, supabase]);

  // Función para forzar la actualización de la caja diaria
  const forceUpdateDailyBox = async () => {
    if (isUpdating || !supabase) return;

    try {
      setIsUpdating(true);
      setUpdateMessage(null);

      if (!caja?.id) throw new Error("No se encontró la caja diaria");

      // Obtener todas las skins disponibles
      const allSkins = await getWeaponSkins();

      // Importar y usar la función centralizada de filtrado de skins
      // Esta función garantiza que solo se incluyan skins que pertenecen a bundles con imagen
      const { filterSkinsByBundleWithIcon } = await import("@/lib/valorantApi");
      // Esperar a que se resuelva la promesa de filterSkinsByBundleWithIcon
      const filteredSkins = await filterSkinsByBundleWithIcon(allSkins);

      // Obtener las probabilidades de la caja diaria
      const { data: probabilidades, error: probError } = await supabase
        .from("tier_probabilidades")
        .select("content_tier_id, cantidad_skins")
        .eq("caja_id", caja.id);

      if (probError) throw probError;
      if (!probabilidades)
        throw new Error("No se encontraron probabilidades para la caja");

      // Obtener la relación entre content_tier_id y uuid de la API de Valorant
      const { data: contentTiers, error: contentTiersError } = await supabase
        .from("content_tiers")
        .select("id, uuid");

      if (contentTiersError) throw contentTiersError;
      if (!contentTiers) throw new Error("No se encontraron los content tiers");

      // Crear un mapa para relacionar los IDs internos con los UUIDs de la API
      const tierIdToUuid = new Map<string, string>();

      // Usar una interfaz para tipar correctamente los datos
      interface ContentTier {
        id: string;
        uuid: string;
      }

      // Convertir los datos a un tipo seguro
      const typedContentTiers = contentTiers as ContentTier[];

      typedContentTiers.forEach((tier) => {
        tierIdToUuid.set(tier.id, tier.uuid);
      });

      interface TierProbabilidad {
        content_tier_id: string;
        cantidad_skins: number;
      }

      // Preparar las skins por tier usando las skins filtradas
      const skinsByTier = new Map<string, { skins: any[]; cantidad: number }>();

      (probabilidades as TierProbabilidad[]).forEach((prob) => {
        // Obtener el UUID correspondiente al ID interno
        const tierUuid = tierIdToUuid.get(prob.content_tier_id);

        if (tierUuid) {
          // Filtrar las skins por el UUID de la API
          const tierSkins = filteredSkins.filter(
            (skin) => skin.contentTierUuid === tierUuid,
          );

          console.log(
            `Tier ${prob.content_tier_id} (UUID: ${tierUuid}): ${tierSkins.length} skins encontradas`,
          );

          skinsByTier.set(prob.content_tier_id, {
            skins: tierSkins,
            cantidad: prob.cantidad_skins,
          });
        }
      });

      // Seleccionar skins aleatorias por cada tier
      interface SelectedSkin {
        skin_id: string;
        content_tier_id: string;
        skin_nombre: string;
      }

      const selectedSkins: SelectedSkin[] = [];

      // Obtener los nombres de los tiers para los logs
      const tierNames = new Map<string, string>();

      // Obtener todos los nombres de tiers de una sola vez
      const { data: allTiers } = await supabase
        .from("content_tiers")
        .select("id, nombre");

      if (allTiers) {
        allTiers.forEach((tier: any) => {
          tierNames.set(tier.id, tier.nombre);
        });
      }

      console.log("=== SELECCIONANDO SKINS POR TIER ===");

      skinsByTier.forEach(({ skins, cantidad }, tierId) => {
        const tierName = tierNames.get(tierId) || "Desconocido";

        console.log(`Tier: ${tierName} (ID: ${tierId})`);
        console.log(`  - Skins disponibles: ${skins.length}`);
        console.log(`  - Cantidad requerida: ${cantidad}`);

        if (skins.length === 0) {
          console.warn(
            `  - ADVERTENCIA: No hay skins disponibles para el tier ${tierName}`,
          );

          return;
        }

        if (skins.length < cantidad) {
          console.warn(
            `  - ADVERTENCIA: No hay suficientes skins para el tier ${tierName}. Disponibles: ${skins.length}, Requeridas: ${cantidad}`,
          );
        }

        const shuffled = [...skins].sort(() => Math.random() - 0.5);
        const selected = shuffled.slice(0, Math.min(cantidad, shuffled.length));

        console.log(`  - Skins seleccionadas: ${selected.length}`);

        selected.forEach((skin) => {
          selectedSkins.push({
            skin_id: skin.uuid,
            content_tier_id: tierId,
            skin_nombre: skin.displayName,
          });
          console.log(`    * ${skin.displayName}`);
        });
      });

      // Actualizar la caja con las nuevas skins
      const { error: updateError } = await supabase.rpc(
        "actualizar_skins_caja_diaria",
        { skins_json: selectedSkins },
      );

      if (updateError) throw updateError;

      setUpdateMessage("¡Caja diaria actualizada con éxito! Recargando...");

      // Recargar la página después de 2 segundos
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error: any) {
      console.error("Error al actualizar la caja diaria:", error);
      setUpdateMessage(
        `Error: ${error.message || "No se pudo actualizar la caja diaria"}`,
      );
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="flex flex-col gap-8 pl-16 md:pr-12 lg:pr-16 pt-12 pb-12 min-h-screen bg-background w-full max-w-full flex-1">
      <div className="w-full">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold text-foreground flex items-center font-[Raleway] font-semibold italic tracking-widest">
            {isLoading
              ? "/ CARGANDO..."
              : error
                ? "/ ERROR"
                : `/ ${caja?.nombre?.toUpperCase() || `CAJA ${tipoValidado.toUpperCase()}`}`}
          </h2>

          <div className="flex items-center gap-2">
            {tipoValidado.includes("diaria") && (
              <Button
                className="mr-2"
                size="sm"
                variant="outline"
                onClick={() => setShowAdminPanel(!showAdminPanel)}
              >
                {showAdminPanel ? "Ocultar Admin" : "Admin"}
              </Button>
            )}
            <Link href="/main">
              <Button
                className="flex items-center gap-1"
                size="sm"
                variant="outline"
              >
                <ChevronLeft size={16} />
                Volver
              </Button>
            </Link>
          </div>
        </div>

        {/* Panel de administración para la caja diaria */}
        {tipoValidado.includes("diaria") && showAdminPanel && (
          <div className="w-full bg-black/30 backdrop-blur-sm border border-white/10 rounded-lg p-4 mb-4">
            <h3 className="text-lg font-medium text-white mb-3">
              Panel de Administración - Caja Diaria
            </h3>
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <Button
                className="flex items-center gap-2"
                disabled={isUpdating}
                variant="destructive"
                onClick={forceUpdateDailyBox}
              >
                {isUpdating ? (
                  <>
                    <span className="animate-spin h-4 w-4 border-t-2 border-b-2 border-white rounded-full" />
                    Actualizando...
                  </>
                ) : (
                  "Forzar actualización de caja diaria"
                )}
              </Button>

              {updateMessage && (
                <p
                  className={
                    updateMessage.includes("Error")
                      ? "text-red-400"
                      : "text-green-400"
                  }
                >
                  {updateMessage}
                </p>
              )}
            </div>
            <p className="text-white/60 text-sm mt-2">
              Nota: Esta función es solo para pruebas. En producción, la caja se
              actualizará automáticamente a las 9:00 AM.
            </p>
          </div>
        )}

        <div className="w-full rounded-3xl bg-gradient-to-br from-primary/10 via-backgroundAlt/30 to-secondary/5 backdrop-blur-sm border border-border/30 p-6 shadow-xl overflow-hidden relative">
          {/* Efecto de fondo */}
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/10 rounded-full blur-3xl opacity-30" />
          <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-secondary/10 rounded-full blur-3xl opacity-30" />

          {/* Contenido de la caja */}
          <div className="relative z-10 flex flex-col items-center justify-center min-h-[400px] w-full">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary" />
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center">
                <p className="text-red-500">{error}</p>
                <Button
                  className="mt-4"
                  onClick={() => window.location.reload()}
                >
                  Reintentar
                </Button>
              </div>
            ) : (
              <BoxComponent
                caja={caja}
                cajaSkins={cajaSkins}
                error={null}
                isAdmin={tipoValidado.includes("diaria")}
                isLoading={false}
                isUpdating={isUpdating}
                probabilidades={probabilidades}
                setShowAdminPanel={setShowAdminPanel}
                showAdminPanel={showAdminPanel}
                supabase={supabase}
                updateMessage={updateMessage}
                onAdminAction={
                  tipoValidado.includes("diaria")
                    ? forceUpdateDailyBox
                    : undefined
                }
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
