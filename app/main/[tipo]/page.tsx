"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { motion } from "framer-motion";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import StripeCard from "@/components/StripeCard";
import {
  getWeaponSkins,
  filterSkinsByIds,
  Skin as ValorantSkin,
  getWeaponType, 
  getWeaponSpecificStyles
} from "@/lib/valorantApi";
import { extraerTipoCaja, getTierData, Skin } from "@/lib/boxUtils";
import BoxComponent, { BoxCaja } from "@/components/BoxComponent";
import { formatSkinForApp } from "@/lib/skinUtils";

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
  const [cajaSkins, setCajaSkins] = useState<Skin[]>([]);
  const [probabilidades, setProbabilidades] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Estados para panel de administración
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateMessage, setUpdateMessage] = useState<string | null>(null);

  // Estado para navegación entre cajas
  const [cajasRelacionadas, setCajasRelacionadas] = useState<BoxCaja[]>([]);

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

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        // 0. Cargar todos los content_tiers de Supabase para mapeo por ID de Supabase
        let tiersMapBySupabaseId = new Map();
        try {
          const { data: allTiersFromSupabase, error: allTiersError } = await supabase
            .from("content_tiers")
            .select("id, uuid_api, nombre, color"); // Necesitamos id (PK), uuid_api, nombre, color

          if (allTiersError) {
            console.error("Error al cargar todos los tiers para mapeo por ID de Supabase:", allTiersError);
          } else if (allTiersFromSupabase) {
            tiersMapBySupabaseId = new Map(allTiersFromSupabase.map(t => 
              [t.id, { uuid_api: t.uuid_api, nombre: t.nombre, color: t.color, supabase_pk_id: t.id }]
            ));
          }
        } catch (e) {
            console.error("Excepción al cargar todos los tiers para mapeo por ID de Supabase:", e);
        }

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

        // Cargar cajas relacionadas de la misma categoría
        if (cajaData && cajaData.categoria) {
          try {
            const { data: relacionadas } = await supabase
              .from("cajas")
              .select("id, nombre, precio, imagen_url, ruta, esta_disponible, es_diaria, fecha_actualizacion, categoria")
              .eq("categoria", cajaData.categoria)
              .neq("id", cajaData.id)
              .eq("esta_disponible", true)
              .limit(4);
              
            if (relacionadas && relacionadas.length > 0) {
              // Convertir explícitamente cada elemento al tipo BoxCaja
              const cajasConvertidas: BoxCaja[] = relacionadas.map(caja => ({
                id: String(caja.id || ''),
                nombre: String(caja.nombre || ''),
                precio: Number(caja.precio || 0),
                imagen_url: String(caja.imagen_url || ''),
                ruta: String(caja.ruta || ''),
                esta_disponible: Boolean(caja.esta_disponible !== undefined ? caja.esta_disponible : true),
                es_diaria: Boolean(caja.es_diaria),
                categoria: caja.categoria ? String(caja.categoria) : undefined,
                fecha_actualizacion: caja.fecha_actualizacion ? String(caja.fecha_actualizacion) : undefined
              }));
              setCajasRelacionadas(cajasConvertidas);
            }
          } catch (err) {
            console.error("Error al cargar cajas relacionadas:", err);
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

            if (!skinIdsData || skinIdsData.length === 0) {
              // Si no hay skins asociadas, la caja estará vacía
              setCajaSkins([]); // Asegurar que cajaSkins es un array vacío
              // No es necesario obtener todas las skins si no hay IDs
            } else {
              // Extraer los IDs de las skins
              const skinIds = skinIdsData.map((item: any) => item.skin_id);

              // Obtener todas las skins de la API de Valorant
              const allSkinsFromApi = await getWeaponSkins();

              // Filtrar por los IDs específicos de esta caja
              let rawSkinsForBox = filterSkinsByIds(allSkinsFromApi, skinIds);

              // Formatear las skins para la aplicación
              const formattedSkins: Skin[] = [];
              if (supabase) {
                for (const rawSkin of rawSkinsForBox) { // rawSkin is ValorantSkin
                  const tierData = await getTierData(supabase, rawSkin.contentTierUuid);
                  formattedSkins.push(formatSkinForApp(rawSkin, tierData));
                }
              }
              setCajaSkins(formattedSkins);
            }

            // Obtener las probabilidades de la caja
            if (cajaData.id) {
              console.log(`[Prob Dbg] Fetching probabilities for caja_id: ${cajaData.id}, Caja Nombre: ${cajaData.nombre}`);
              const { data: probData, error: probQueryError } = await supabase
                .from("tier_probabilidades")
                .select(
                  `
                  id,
                  caja_id,
                  probabilidad,
                  cantidad_skins,
                  content_tier:content_tier_id (
                    id, 
                    nombre,
                    color,
                    uuid_api,
                    grado
                  )
                  `
                )
                .eq("caja_id", cajaData.id);

              if (probQueryError) {
                console.error(`[Prob Dbg] Error fetching probabilities for caja_id ${cajaData.id}:`, probQueryError);
                setProbabilidades([]); // Set empty on error
              } else if (probData) {
                console.log(`[Prob Dbg] Received probData for ${cajaData.nombre}:`, JSON.parse(JSON.stringify(probData)));
                const mappedProbs = probData.map((item: any, index: number) => {
                  console.log(`[Prob Dbg] Mapping item ${index} for ${cajaData.nombre}:`, JSON.parse(JSON.stringify(item)));
                  const hasContentTierData = item.content_tier && item.content_tier.uuid_api && item.content_tier.nombre && item.content_tier.color;
                  
                  const tierInfo = hasContentTierData ? {
                    id: item.content_tier.uuid_api,       
                    nombre: item.content_tier.nombre,
                    color: item.content_tier.color,
                    uuid_api: item.content_tier.uuid_api,  
                    supabase_pk_id: item.content_tier.id,
                    grado: item.content_tier.grado
                  } : { 
                    id: "unknown-tier-" + String(item.id || index), // Use item.id as part of fallback id
                    nombre: "Desconocido",
                    color: "#FFFFFF",
                    uuid_api: "unknown-tier-" + String(item.id || index),
                    supabase_pk_id: String(item.content_tier_id || item.id || index), // Fallback if content_tier_id is also missing
                    grado: 0
                  };

                  if (!hasContentTierData) {
                    console.warn(`[Prob Dbg] Tier details missing or incomplete for item ${index} in ${cajaData.nombre}. Fallback used. Original item.content_tier:`, item.content_tier);
                  }

                  return {
                    id: String(item.id),
                    caja_id: String(item.caja_id),
                    probabilidad: Number(item.probabilidad),
                    cantidad_skins: Number(item.cantidad_skins),
                    content_tier: tierInfo,
                  };
                });
                console.log(`[Prob Dbg] Mapped probabilities for ${cajaData.nombre}:`, JSON.parse(JSON.stringify(mappedProbs)));
                setProbabilidades(mappedProbs);
              } else {
                console.log(`[Prob Dbg] No probData (null or empty array) received for ${cajaData.nombre}. Setting empty probabilities.`);
                setProbabilidades([]); 
              }
            } else {
                console.warn(`[Prob Dbg] No cajaData.id found when trying to fetch probabilities. Current tipoValidado: ${tipoValidado}`);
                setProbabilidades([]); 
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

      const allSkinsFromValorantApi = await getWeaponSkins();
      const { filterSkinsByBundleWithIcon } = await import("@/lib/valorantApi");
      const filteredSkinsForSelection = await filterSkinsByBundleWithIcon(allSkinsFromValorantApi);

      // Obtener las probabilidades de la caja. prob.content_tier_id es el ID (PK de Supabase) del tier.
      const { data: probabilidadesData, error: probError } = await supabase
        .from("tier_probabilidades")
        .select("content_tier_id, cantidad_skins") 
        .eq("caja_id", caja.id);

      if (probError) throw probError;
      if (!probabilidadesData) throw new Error("No se encontraron probabilidades para la caja");

      // Obtener todos los content_tiers de Supabase para mapear id (PK) a uuid_api y nombre.
      let supabaseIdToTierDataMap = new Map<string, { uuid_api: string; nombre: string }>();
      const { data: allTiersFromSupabase } = await supabase
        .from("content_tiers")
        .select("id, uuid_api, nombre");
      
      if (allTiersFromSupabase) {
        allTiersFromSupabase.forEach((tier: any) => {
          if (tier && tier.id && tier.uuid_api && tier.nombre) {
            supabaseIdToTierDataMap.set(tier.id, { uuid_api: tier.uuid_api, nombre: tier.nombre });
          }
        });
      }

      const skinsBySupabaseTierId = new Map<string, { skins: ValorantSkin[]; cantidad: number }>();

      probabilidadesData.forEach((prob: any) => {
        const supabaseTierId = String(prob.content_tier_id); // Este es el ID (PK de Supabase)
        if (!supabaseTierId) {
            console.warn("Probabilidad con content_tier_id (PK) vacío.", prob);
            return;
        }

        const tierData = supabaseIdToTierDataMap.get(supabaseTierId);
        if (!tierData || !tierData.uuid_api) {
          console.warn(`No se encontró uuid_api para el tier con ID (PK) de Supabase: ${supabaseTierId}`);
          skinsBySupabaseTierId.set(supabaseTierId, { skins: [], cantidad: prob.cantidad_skins });
          return;
        }
        
        const valorantApiTierUuid = tierData.uuid_api;
        const tierSkins = filteredSkinsForSelection.filter(
          (skin) => skin.contentTierUuid === valorantApiTierUuid 
        );

        console.log(
          `Tier (Supabase PK: ${supabaseTierId}, API UUID: ${valorantApiTierUuid}): ${tierSkins.length} skins encontradas en pool.`
        );
        skinsBySupabaseTierId.set(supabaseTierId, { skins: tierSkins, cantidad: prob.cantidad_skins });
      });

      interface SelectedSkinForUpdate { 
        skin_id: string; 
        content_tier_id: string; // Este será el ID (PK de Supabase) del tier
        skin_nombre: string;
      }
      const newSelectedSkinsForBox: SelectedSkinForUpdate[] = [];

      console.log("=== SELECCIONANDO SKINS POR TIER (forceUpdateDailyBox) ===");

      skinsBySupabaseTierId.forEach(({ skins, cantidad }, supabaseTierId_key) => {
        const supabaseTierId = String(supabaseTierId_key);
        const tierData = supabaseIdToTierDataMap.get(supabaseTierId);
        const tierName = tierData?.nombre || `Desconocido (ID: ${supabaseTierId})`;

        console.log(`Tier: ${tierName}`);
        console.log(`  - Skins disponibles en pool: ${skins.length}`);
        console.log(`  - Cantidad requerida: ${cantidad}`);

        if (skins.length === 0) {
          console.warn(`  - ADVERTENCIA: No hay skins disponibles para el tier ${tierName}`);
          return;
        }

        if (skins.length < cantidad) {
          console.warn(
            `  - ADVERTENCIA: No hay suficientes skins para el tier ${tierName}. Disponibles: ${skins.length}, Requeridas: ${cantidad}. Se seleccionarán todas las disponibles.`
          );
        }

        const shuffledSkins = [...skins].sort(() => Math.random() - 0.5);
        const skinsToPush = shuffledSkins.slice(0, Math.min(cantidad, shuffledSkins.length));

        console.log(`  - Skins seleccionadas para este tier: ${skinsToPush.length}`);

        skinsToPush.forEach((skin) => {
          newSelectedSkinsForBox.push({
            skin_id: skin.uuid,             
            content_tier_id: supabaseTierId,   // Usar el ID (PK de Supabase) del tier
            skin_nombre: skin.displayName,
          });
          console.log(`    * ${skin.displayName}`);
        });
      });

      const { error: updateError } = await supabase.rpc(
        "actualizar_skins_caja_diaria",
        { skins_json: newSelectedSkinsForBox } 
      );

      if (updateError) throw updateError;

      setUpdateMessage("¡Caja diaria actualizada con éxito! Recargando...");

      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error: any) {
      console.error("Error al actualizar la caja diaria:", error);
      setUpdateMessage(
        `Error: ${error.message || "No se pudo actualizar la caja diaria"}`
      );
    } finally {
      setIsUpdating(false);
    }
  };

  // Animaciones de entrada
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        when: "beforeChildren",
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: { duration: 0.5 }
    }
  };

  return (
    <motion.div 
      className="flex flex-col gap-8 pl-16 md:pr-12 lg:pr-16 pt-12 pb-12 min-h-screen bg-background w-full max-w-full flex-1"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <motion.div className="w-full" variants={itemVariants}>
        {/* Navegación superior con breadcrumbs y botones */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div className="flex flex-col">
            <div className="flex items-center gap-2 text-white/60 text-sm mb-2">
              <Link href="/main" className="hover:text-primary transition-colors">Inicio</Link>
              <span>•</span>
              <Link href="/main" className="hover:text-primary transition-colors">Cajas</Link>
              <span>•</span>
              <span className="text-primary">{isLoading ? "Cargando..." : caja?.nombre || tipoValidado}</span>
            </div>
            <h2 className="text-3xl font-bold text-foreground flex items-center font-[Raleway] font-semibold italic tracking-widest">
              {isLoading
                ? "/ CARGANDO..."
                : error
                  ? "/ ERROR"
                  : `/ ${caja?.nombre?.toUpperCase() || `CAJA ${tipoValidado.toUpperCase()}`}`}
            </h2>
          </div>

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
          <motion.div 
            className="w-full bg-black/30 backdrop-blur-sm border border-white/10 rounded-lg p-4 mb-4"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
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
          </motion.div>
        )}

        {/* Contenedor principal con efecto de fondo mejorado */}
        <motion.div 
          className="w-full rounded-3xl bg-gradient-to-br from-primary/10 via-backgroundAlt/30 to-secondary/5 backdrop-blur-sm border border-border/30 p-6 shadow-xl overflow-hidden relative"
          variants={itemVariants}
        >
          {/* Efectos de fondo mejorados */}
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/10 rounded-full blur-3xl opacity-30" />
          <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-secondary/10 rounded-full blur-3xl opacity-30" />
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full h-full bg-gradient-radial from-primary/5 to-transparent opacity-50" />

          {/* Contenido de la caja */}
          <div className="relative z-10 flex flex-col items-center justify-center min-h-[400px] w-full">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mb-4" />
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center p-8 bg-black/40 rounded-xl border border-red-500/20 max-w-lg mx-auto">
                <div className="w-16 h-16 flex items-center justify-center bg-red-500/10 rounded-full mb-4">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-red-500">
                    <path d="M12 8V12M12 16H12.01M21.0001 12C21.0001 16.9706 16.9707 21 12.0001 21C7.02949 21 3.00012 16.9706 3.00012 12C3.00012 7.02944 7.02949 3 12.0001 3C16.9707 3 21.0001 7.02944 21.0001 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <p className="text-red-500 mb-4">{error}</p>
                <Button
                  className="bg-slate-800 hover:bg-slate-700 text-white px-6"
                  onClick={() => window.location.reload()}
                >
                  Reintentar
                </Button>
              </div>
            ) : (
              <div className="w-full">
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
                  renderInfoSections={false}
                />
              </div>
            )}
          </div>

          {/* New Section for Probabilities and All Skins (Side-by-Side) */}
          {!isLoading && !error && caja && (
            <motion.div 
              className="w-full"
              variants={itemVariants}
            >
              <div className="relative mb-12 mt-8">
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-alternative/50 to-transparent" />
              </div>
              {/* Probabilities section will be removed */}

              {/* Right Column: All Skins in the Box - Now takes full width and is centered */}
              {cajaSkins && cajaSkins.length > 0 && (
                <div className="w-full max-w-4xl mx-auto mb-12">
                  <div className={`mb-6 pt-2 text-center`}>
                    <h3 className="font-bold inline-block mt-10
                                  text-3xl font-bold text-foreground font-[Raleway] font-semibold italic tracking-widest
                                  [text-shadow:_0px_0px_20px_rgba(255,255,255,0.35)] bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                      · CONTENIDO DE LA CAJA ·
                    </h3>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                    {(() => {
                      // Ordenar las skins usando los grados de la base de datos
                      const sortedSkins = [...cajaSkins].sort((a, b) => {
                        // Usar el grado numérico del content_tier para ordenar
                        const gradeA = a.content_tier?.grado || 0;
                        const gradeB = b.content_tier?.grado || 0;
                        
                        // Ordenar de mayor a menor grado (más raro primero)
                        return Number(gradeB) - Number(gradeA);
                      });

                      return sortedSkins.map((skin) => {
                        // Calcular el estilo de la card basado en el tier
                        let cardStyle: React.CSSProperties = {};
                        
                        if (skin.content_tier?.color && skin.content_tier.color !== '#FFFFFF') {
                          const tierColorHex = skin.content_tier.color;
                          if (/^#([0-9A-F]{3}){1,2}$/i.test(tierColorHex)) {
                            let r, g, b;
                            if (tierColorHex.length === 4) {
                              r = parseInt(tierColorHex[1] + tierColorHex[1], 16);
                              g = parseInt(tierColorHex[2] + tierColorHex[2], 16);
                              b = parseInt(tierColorHex[3] + tierColorHex[3], 16);
                            } else {
                              r = parseInt(tierColorHex.slice(1, 3), 16);
                              g = parseInt(tierColorHex.slice(3, 5), 16);
                              b = parseInt(tierColorHex.slice(5, 7), 16);
                            }
                            cardStyle.backgroundImage = `linear-gradient(to top, rgba(${r},${g},${b},0.12) 0%, rgba(${r},${g},${b},0.18) 35%, rgba(17, 24, 39, 0.85) 80%, #0A0E16 100%)`;
                          }
                        }

                        // Determinar el tipo de arma y obtener los estilos específicos
                        const weaponType = getWeaponType(skin.nombre);
                        const weaponStyles = getWeaponSpecificStyles(weaponType);

                        // Crear el estilo inline para las transformaciones
                        const imageTransformStyle: React.CSSProperties = {
                          transform: `scale(${weaponStyles.baseScale})${weaponStyles.hasRotation ? ' rotate(12deg)' : ''}`,
                        };

                        return (
                          <div 
                            key={skin.id} 
                            className="group relative flex flex-col aspect-[4/5] overflow-hidden rounded-lg border bg-gradient-to-b from-gray-900 to-black transition-all duration-300 border-gray-800/70 hover:shadow-[0px_2px_46px_-4px_rgba(255,_255,_255,_0.15)] hover:scale-[1.02]"
                            style={cardStyle}
                          >
                            {/* Imagen de fondo dinámica basada en content_tier.uuid_api */}
                            {skin.content_tier?.uuid_api && skin.content_tier.uuid_api !== 'default' && (
                              <Image 
                                src={`/skins-bg/${skin.content_tier.uuid_api}.png`}
                                alt={`Fondo para ${skin.content_tier.nombre}`}
                                fill
                                className="absolute inset-0 z-0 p-3 opacity-20 transform scale-125 rotate-12 object-contain"
                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                              />
                            )}
                            
                            {/* Imagen principal de la skin */}
                            {skin.imagen_url && (
                              <Image 
                                src={skin.imagen_url} 
                                alt={skin.nombre} 
                                fill
                                className="object-contain p-3 group-hover:scale-105 transition-transform duration-300 z-10"
                                style={imageTransformStyle}
                              />
                            )}
                            
                            {/* Información de la skin en la parte inferior */}
                            <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent z-10">
                              <h4 
                                className="text-xs font-semibold text-white truncate" 
                                style={{color: skin.content_tier?.color || 'white'}}
                                title={skin.nombre}
                              >
                                {skin.nombre}
                              </h4>
                              {skin.content_tier?.nombre && (
                                <p className="text-[10px] text-slate-400 truncate" title={skin.content_tier.nombre}>
                                  {skin.content_tier.nombre}
                                </p>
                              )}
                            </div>
                            
                            {/* Barra de color del tier en la parte inferior */}
                            <div 
                              className="absolute bottom-0 left-0 w-full h-1 z-20" 
                              style={{backgroundColor: skin.content_tier?.color || 'rgba(255,255,255,0.1)'}}
                            />
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </motion.div>

        {/* Sección de cajas relacionadas */}
        {cajasRelacionadas.length > 0 && (
          <motion.div 
            className="mt-8" 
            variants={itemVariants}
          >
            <h3 className="text-2xl font-bold text-foreground mb-4 font-[Raleway] italic tracking-wide">
              / CAJAS RELACIONADAS
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {cajasRelacionadas.map((cajaRelacionada) => {
                const tipoCajaRel = extraerTipoCaja(cajaRelacionada.nombre, cajaRelacionada.es_diaria);
                const rutaCajaRel = `/main/${tipoCajaRel}`;
                
                return (
                  <Link
                    key={cajaRelacionada.id}
                    className="block transform transition-all duration-200 hover:scale-[1.02]"
                    href={rutaCajaRel}
                  >
                    <StripeCard
                      disabled={!cajaRelacionada.esta_disponible}
                      imageUrl={cajaRelacionada.imagen_url}
                      title={cajaRelacionada.nombre}
                    />
                  </Link>
                );
              })}
            </div>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}
