"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useSession } from "next-auth/react";

import { Button } from "@/components/ui/button";
import { getWeaponSkins, filterSkinsByIds } from "@/lib/valorantApi";
import { formatSkinForApp } from "@/lib/skinUtils";
import {
  Skin,
  TierProbabilidad,
  processBoxOpening,
  selectRandomSkinByProbability,
  getTierData,
} from "@/lib/boxUtils";

interface ContentTier {
  id: string;
  nombre: string;
  descripcion: string;
  color: string;
  uuid: string;
}

export interface BoxCaja {
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

interface BoxComponentProps {
  caja: BoxCaja | null;
  isLoading: boolean;
  error: string | null;
  isAdmin?: boolean;
  onAdminAction?: () => Promise<void>;
  isUpdating?: boolean;
  updateMessage?: string | null;
  setShowAdminPanel?: (show: boolean) => void;
  showAdminPanel?: boolean;
  cajaSkins?: Skin[];
  probabilidades?: TierProbabilidad[];
  supabase: any | null;
}

export default function BoxComponent({
  caja,
  isLoading,
  error,
  isAdmin = false,
  onAdminAction,
  isUpdating = false,
  updateMessage = null,
  setShowAdminPanel,
  showAdminPanel = false,
  cajaSkins: initialCajaSkins = [],
  probabilidades: initialProbabilidades = [],
  supabase,
}: BoxComponentProps) {
  // Sesión del usuario
  const { data: session, status } = useSession();
  const isAuthenticated = status === "authenticated" && !!session?.user;

  // Estados
  const [cajaSkins, setCajaSkins] = useState<Skin[]>(initialCajaSkins);
  const [probabilidades, setProbabilidades] = useState<TierProbabilidad[]>(
    initialProbabilidades,
  );
  const [showProbabilities, setShowProbabilities] = useState(false);
  const [isOpening, setIsOpening] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinItems, setSpinItems] = useState<Skin[]>([]);
  const [highlightItem, setHighlightItem] = useState<number | null>(null);
  const [nextUpdate, setNextUpdate] = useState<string | null>(null);
  const [resultSkin, setResultSkin] = useState<Skin | null>(null);
  const [userInventory, setUserInventory] = useState<string[]>([]);
  const [dailyOpened, setDailyOpened] = useState(false);
  const [resultSkinForSpin, setResultSkinForSpin] = useState<Skin | null>(null);

  // Referencias
  const spinnerRef = useRef<HTMLDivElement>(null);

  // Efecto para cargar los skins de la caja si no se proporcionaron inicialmente
  useEffect(() => {
    if (caja?.id && initialCajaSkins.length === 0) {
      loadCajaSkins();
    }
  }, [caja]);

  // Efecto para cargar las probabilidades si no se proporcionaron inicialmente
  useEffect(() => {
    if (caja?.id && initialProbabilidades.length === 0) {
      loadProbabilidades();
    }
  }, [caja]);

  // Efecto para formatear el tiempo restante para la próxima actualización (solo para caja diaria)
  useEffect(() => {
    if (caja?.es_diaria && caja.fecha_actualizacion) {
      const intervalId = setInterval(() => {
        const nextUpdateTime = formatTimeRemaining(caja.fecha_actualizacion!);

        setNextUpdate(nextUpdateTime);
      }, 1000);

      return () => clearInterval(intervalId);
    }
  }, [caja]);

  // Efecto para verificar si el usuario ya abrió la caja diaria hoy
  useEffect(() => {
    if (caja?.es_diaria && isAuthenticated && session?.user?.id) {
      checkDailyOpened();
    }
  }, [caja, isAuthenticated, session]);

  // Cargar los skins de la caja
  const loadCajaSkins = async () => {
    if (!caja?.id || !supabase) return;

    try {
      // Obtener los IDs de las skins asociadas a esta caja
      const { data: skinIdsData, error: skinIdsError } = await supabase
        .from("cajas_skins")
        .select("skin_id")
        .eq("caja_id", caja.id);

      if (skinIdsError) {
        console.error("Error al obtener skins de la caja:", skinIdsError);

        return;
      }

      if (!skinIdsData || skinIdsData.length === 0) {
        console.log("No hay skins asociadas a esta caja");

        return;
      }

      // Extraer los IDs de las skins
      const skinIds = skinIdsData.map((item: any) => item.skin_id);

      // Obtener todas las skins de la API de Valorant
      const allSkins = await getWeaponSkins();

      // Filtrar por los IDs específicos de esta caja
      const matchingSkins = filterSkinsByIds(allSkins, skinIds);

      if (matchingSkins.length > 0) {
        // Formatear las skins para la aplicación
        const formattedSkins: Skin[] = [];

        for (const skin of matchingSkins) {
          // Obtener datos del tier de la skin
          const tierData = supabase
            ? await getTierData(supabase, skin.contentTierUuid)
            : null;

          // Usar la función de utilidad para formatear la skin
          formattedSkins.push(formatSkinForApp(skin, tierData));
        }

        setCajaSkins(formattedSkins);
      }
    } catch (error) {
      console.error("Error al cargar las skins:", error);
    }
  };

  // Cargar las probabilidades de la caja
  const loadProbabilidades = async () => {
    if (!caja?.id || !supabase) return;

    try {
      const { data, error } = await supabase
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
        .eq("caja_id", caja.id);

      if (error) {
        if (error.message) {
          console.error(
            "Error al obtener probabilidades:",
            error.message,
            error,
          );
        } else {
          console.error(
            "Error al obtener probabilidades:",
            JSON.stringify(error),
          );
        }

        return;
      }

      // Mapeo defensivo para asegurar el tipo correcto
      const mapped = (data || []).map((item: any) => ({
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
                descripcion: String(item.content_tier.descripcion),
                color: String(item.content_tier.color),
                uuid: String(item.content_tier.uuid),
              }
            : undefined,
      }));

      setProbabilidades(mapped);
    } catch (err) {
      console.error("Error inesperado al obtener probabilidades:", err);
    }
  };

  // Verificar si el usuario ya abrió la caja diaria hoy
  const checkDailyOpened = async () => {
    if (!caja?.es_diaria || !isAuthenticated || !session?.user?.id || !supabase)
      return;

    try {
      const { data, error } = await supabase
        .from("transacciones")
        .select("id")
        .eq("user_id", session.user.id)
        .eq("caja_id", caja.id)
        .gte(
          "created_at",
          new Date(new Date().setHours(0, 0, 0, 0)).toISOString(),
        )
        .limit(1);

      if (error) {
        console.error("Error al verificar transacciones diarias:", error);

        return;
      }

      setDailyOpened(data && data.length > 0);
    } catch (error) {
      console.error(
        "Error al verificar si la caja diaria ya fue abierta:",
        error,
      );
    }
  };

  // Formatear el tiempo restante para la próxima actualización
  const formatTimeRemaining = (fechaActualizacion: string): string => {
    if (!fechaActualizacion) return "Desconocido";

    // Convertir la fecha a objeto Date
    const updateDate = new Date(fechaActualizacion);

    // Obtener el tiempo restante en segundos
    const now = new Date();
    const diffMs = updateDate.getTime() - now.getTime();
    const diffSec = Math.floor(diffMs / 1000);

    if (diffSec <= 0) return "Disponible ahora";

    // Calcular horas, minutos y segundos
    const hours = Math.floor(diffSec / 3600);
    const minutes = Math.floor((diffSec % 3600) / 60);
    const seconds = diffSec % 60;

    return `${hours}h ${minutes}m ${seconds}s`;
  };

  // Función para generar items aleatorios para la ruleta
  const generateSpinItems = (selectedSkin: Skin) => {
    if (!cajaSkins || cajaSkins.length === 0) return [];

    // Generar items para la ruleta, insertamos suficientes items para darle dinamismo
    const baseItems: Skin[] = [];

    // Distribuimos los items según la probabilidad real
    // Primero añadimos 25 items aleatorios para la primera mitad
    for (let i = 0; i < 25; i++) {
      const randomSkin = selectRandomSkinByProbability(
        cajaSkins,
        probabilidades,
      );

      if (randomSkin)
        baseItems.push({ ...randomSkin, id: `${randomSkin.id}-${i}` });
    }

    // En la posición central añadimos la skin ganadora
    const winnerPosition = 25;

    baseItems.push({ ...selectedSkin, id: `winner-${selectedSkin.id}` });

    // Completamos con 25 items más
    for (let i = 0; i < 25; i++) {
      const randomSkin = selectRandomSkinByProbability(
        cajaSkins,
        probabilidades,
      );

      if (randomSkin)
        baseItems.push({ ...randomSkin, id: `${randomSkin.id}-${i + 25}` });
    }

    // Crear una copia al inicio y al final para que parezca infinito
    return [...baseItems.slice(0, 10), ...baseItems, ...baseItems.slice(0, 10)];
  };

  // Función para animar la ruleta con un efecto de frenado más realista
  const animateSpinner = (finalPosition: number) => {
    if (!spinnerRef.current) return;

    // Duración de la animación en ms (8 segundos)
    const duration = 8000;
    // Usar el ancho de item consistente con el JSX
    const itemWidth = 150; // Changed from 180 to 150
    const containerWidth =
      typeof window !== "undefined" ? window.innerWidth : 800; // This is used for offset calculation
    const winningPosition = Math.floor(spinItems.length / 2); // Recalculate or ensure spinItems is available if used directly
    // The finalPosition is already calculated and passed, so no need to recalculate offset logic here if finalPosition is correct

    // Aplicar la curva de bezier cúbica para una animación de frenado más realista
    // Empezamos muy rápido y frenamos gradualmente al final
    spinnerRef.current.style.transition = `transform ${duration}ms cubic-bezier(0.17, 0.67, 0.24, 0.99)`;
    spinnerRef.current.style.transform = `translateX(-${finalPosition}px)`;
  };

  // Función para abrir la caja con animación mejorada
  const openBox = async () => {
    if (
      !caja ||
      !caja.esta_disponible ||
      isOpening ||
      isSpinning ||
      (caja.es_diaria && dailyOpened)
    ) {
      if (caja && caja.es_diaria && dailyOpened)
        console.log("La caja diaria ya fue abierta hoy");
      return;
    }

    if (cajaSkins.length === 0) {
      console.error("No hay skins disponibles en esta caja");

      return;
    }

    setIsOpening(true);

    try {
      if (!supabase) {
        throw new Error("Error al conectar con la base de datos");
      }

      if (probabilidades.length === 0) {
        console.error("No se encontraron probabilidades para esta caja");
        setIsOpening(false);

        return;
      }

      if (isAuthenticated && session?.user?.id) {
        const userId = session.user.id;

        const openingResult = await processBoxOpening(
          userId,
          caja.id,
          cajaSkins as any,
          probabilidades as any,
          supabase,
        );

        if (openingResult.selectedSkin) {
          const items = generateSpinItems(openingResult.selectedSkin as Skin);

          setResultSkinForSpin(openingResult.selectedSkin as Skin);
          setSpinItems(items);
          setIsSpinning(true);
        } else {
          console.error("Error al seleccionar skin:", openingResult.error);
          setIsOpening(false);
        }
      } else {
        console.error("Error al abrir la caja, el usuario no está autenticado");
        setIsOpening(false);
      }
    } catch (error: any) {
      console.error("Error al abrir la caja:", error);
      setIsOpening(false);
    }
  };

  // useEffect for handling the animation logic
  useEffect(() => {
    if (
      isSpinning &&
      spinItems.length > 0 &&
      resultSkinForSpin &&
      spinnerRef.current &&
      spinnerRef.current.parentElement
    ) {
      const viewportElement = spinnerRef.current.parentElement;
      const viewportWidth = viewportElement.offsetWidth;

      const winningItemIndexInSpinItems = Math.floor(spinItems.length / 2);
      const itemWidth = 150;

      const offsetToCenterItemInViewport = (viewportWidth - itemWidth) / 2;
      const finalPosition =
        winningItemIndexInSpinItems * itemWidth - offsetToCenterItemInViewport;

      animateSpinner(finalPosition);

      const animationDuration = 8000;
      const postSpinDelay = 1000;

      const timer = setTimeout(() => {
        setResultSkin(resultSkinForSpin);
        setIsSpinning(false);
        setResultSkinForSpin(null);

        if (caja && caja.es_diaria) {
          setDailyOpened(true);
        }
        setIsOpening(false);
      }, animationDuration + postSpinDelay);

      return () => clearTimeout(timer);
    }
  }, [isSpinning, spinItems, resultSkinForSpin, caja]); // Dependencies for the effect

  // Si está cargando, mostrar spinner de carga
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] w-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary" />
      </div>
    );
  }

  // Si hay error, mostrar mensaje de error
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] w-full">
        <p className="text-red-500">{error}</p>
        <Button className="mt-4" onClick={() => window.location.reload()}>
          Reintentar
        </Button>
      </div>
    );
  }

  // Si no hay caja, mostrar mensaje
  if (!caja) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] w-full">
        <p className="text-white/60">No se encontró la caja solicitada</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {resultSkin ? (
        // Simplified Result View
        <div className="p-8 rounded-xl max-w-md w-full text-center">
          <h3 className="text-3xl font-bold text-white mb-2">
            ¡Recompensa obtenida!
          </h3>
          {resultSkin.imagen_url && (
            <div className="my-6 flex justify-center">
              <Image
                alt={resultSkin.nombre}
                className="object-contain"
                height={200}
                src={resultSkin.imagen_url}
                width={200}
              />
            </div>
          )}
          <p className="text-xl font-semibold text-white mb-2">
            {resultSkin.nombre}
          </p>
          {resultSkin.content_tier && (
            <div className="flex justify-center mb-4">
              <div
                className="px-4 py-2 rounded-full text-sm font-medium inline-block"
                style={{
                  backgroundColor: `${resultSkin.content_tier.color}20`,
                  color: resultSkin.content_tier.color,
                }}
              >
                {resultSkin.content_tier.nombre}
              </div>
            </div>
          )}
          <Button
            className="mt-4 px-5 py-2"
            onClick={() => setResultSkin(null)}
          >
            Volver
          </Button>
        </div>
      ) : (
        // Simplified Box View (will contain further nesting for spinning/initial)
        <div className="flex flex-col items-center w-full">
          {caja && (
            <div className="text-center">
              <h3 className="text-2xl font-bold text-primary mb-4">
                {caja.nombre}
              </h3>

              {isSpinning ? (
                // Simplified Spinning View
                <div className="w-full text-center mb-8 relative">
                  {" "}
                  {/* Added relative positioning for the marker */}
                  <div
                    className="mx-auto overflow-hidden relative" // Viewport for spinner
                    style={{
                      width: "clamp(300px, 80vw, 750px)", // Responsive viewport width: min 300px, 80% of viewport width, max 750px
                      height: "180px", // Height of the viewport
                    }}
                  >
                    <div
                      ref={spinnerRef}
                      className="flex items-center" // Flex container for items, items vertically centered
                      style={{
                        width: `${spinItems.length * 150}px`, // Total width of all items
                        height: "100%", // Takes full height of viewport
                      }}
                    >
                      {spinItems.map((skin, index) => (
                        <div
                          key={`${skin.id}-${index}`}
                          className="p-2 flex-shrink-0 w-[150px] h-full flex flex-col justify-center items-center text-center" // Item styling
                        >
                          {skin.imagen_url && (
                            <Image
                              alt={skin.nombre}
                              className="object-contain mx-auto"
                              height={100} // Adjusted for better fit
                              src={skin.imagen_url}
                              width={100} // Adjusted for better fit if item width is 150px with padding
                            />
                          )}
                          <p className="text-sm text-white truncate mt-1 w-full">
                            {skin.nombre}
                          </p>
                        </div>
                      ))}
                    </div>
                    {/* Central Marker Line - Placed inside viewport for positioning simplicity relative to it */}
                    <div
                      className="absolute top-0 left-1/2 w-0.5 h-full bg-primary transform -translate-x-1/2 pointer-events-none z-10"
                      // style={{ height: '180px' }} // Height matches viewport, done by h-full
                    />
                  </div>
                  <p className="text-lg text-white/70 mt-4">
                    La caja está girando...
                  </p>
                </div>
              ) : (
                // Simplified Initial Box Display View
                <div className="mb-6">
                  {caja.imagen_url && (
                    <Image
                      alt={caja.nombre}
                      className="object-contain"
                      height={230}
                      src={caja.imagen_url || "/free_cage.png"}
                      width={230}
                    />
                  )}
                </div>
              )}

              {caja.descripcion && (
                <p className="text-white/80 max-w-md mb-6 mx-auto">
                  {caja.descripcion}
                </p>
              )}
              {caja.es_diaria && nextUpdate && (
                <div className="mb-6 text-white/70">
                  <p>
                    Próxima actualización:{" "}
                    <span className="text-primary">{nextUpdate}</span>
                  </p>
                </div>
              )}

              <div className="flex gap-4 mb-6 justify-center">
                <Button
                  className="px-8 py-3 text-lg"
                  disabled={
                    isOpening ||
                    isSpinning ||
                    (caja.es_diaria && dailyOpened) ||
                    !caja.esta_disponible
                  }
                  onClick={openBox}
                >
                  {/* Button text logic */}
                  {isOpening || isSpinning
                    ? isSpinning
                      ? "Girando..."
                      : "Abriendo..."
                    : caja.es_diaria
                      ? dailyOpened
                        ? "Ya abierta hoy"
                        : "Abrir Caja"
                      : caja.esta_disponible
                        ? `Abrir por ${caja.precio} VP`
                        : "Próximamente"}
                </Button>
                <Button
                  className="px-4 py-3"
                  variant="outline"
                  onClick={() => setShowProbabilities(!showProbabilities)}
                >
                  {showProbabilities
                    ? "Ocultar probabilidades"
                    : "Ver probabilidades"}
                </Button>
              </div>

              {showProbabilities && probabilidades && (
                <div className="w-full bg-black/20 rounded-lg p-4 border border-white/10 max-w-md mx-auto mt-4">
                  <h4 className="text-lg font-medium text-white mb-3">
                    Probabilidades de obtención
                  </h4>
                  <div className="space-y-2">
                    {probabilidades
                      .sort((a, b) => b.probabilidad - a.probabilidad)
                      .map((prob) => (
                        <div key={prob.id} className="text-left">
                          <div className="flex justify-between items-center">
                            <span className="text-white/90 flex items-center">
                              {prob.content_tier?.color && (
                                <div
                                  className="w-3 h-3 rounded-full mr-2"
                                  style={{
                                    backgroundColor: prob.content_tier.color,
                                  }}
                                />
                              )}
                              {prob.content_tier?.nombre || "Desconocido"}
                            </span>
                            <span className="text-white font-medium">
                              {(prob.probabilidad * 100).toFixed(1)}%
                            </span>
                          </div>
                          {/* Simplified progress bar */}
                          <div className="w-full h-1.5 bg-white/10 rounded-full mt-1">
                            <div
                              className="h-full rounded-full"
                              style={{
                                backgroundColor:
                                  prob.content_tier?.color || "#fff",
                                width: `${Math.max(prob.probabilidad * 100, 0.5)}%`,
                              }}
                            />
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}
          {!caja && <p>Cargando información de la caja...</p>}{" "}
          {/* Should ideally not be reached due to early returns */}
        </div>
      )}
    </div>
  );
}
