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
import { Shadow } from "ogl";

// Estilos globales para animaciones
const globalStyles = `
@keyframes pulse {
  0%, 100% {
    opacity: 0.6;
  }
  50% {
    opacity: 0.2;
  }
}

@keyframes glow {
  0%, 100% {
    box-shadow: 0 0 12px rgba(252, 78, 91, 0.4);
  }
  50% {
    box-shadow: 0 0 24px rgba(252, 78, 91, 0.6);
  }
}

@keyframes float {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-8px);
  }
}

@keyframes spin3D {
  0% {
    transform: rotateY(0deg) scale(1);
  }
  50% {
    transform: rotateY(180deg) scale(1.05);
  }
  100% {
    transform: rotateY(360deg) scale(1);
  }
}
`;

interface ContentTier {
  id: string;
  nombre: string;
  color: string;
  uuid_api: string;
  grado?: number;
}

export interface BoxCaja {
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
  renderInfoSections?: boolean;
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
  renderInfoSections = true,
}: BoxComponentProps) {
  // Sesión del usuario
  const { data: session, status } = useSession();
  const isAuthenticated = status === "authenticated" && !!session?.user;

  // Estados
  const [cajaSkins, setCajaSkins] = useState<Skin[]>(initialCajaSkins);
  const [probabilidades, setProbabilidades] = useState<TierProbabilidad[]>(
    initialProbabilidades,
  );
  const [isOpening, setIsOpening] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinItems, setSpinItems] = useState<Skin[]>([]);
  const [nextUpdate, setNextUpdate] = useState<string | null>(null);
  const [resultSkin, setResultSkin] = useState<Skin | null>(null);
  const [dailyOpened, setDailyOpened] = useState(false);
  const [resultSkinForSpin, setResultSkinForSpin] = useState<Skin | null>(null);

  // Referencias
  const spinnerRef = useRef<HTMLDivElement>(null);

  // Constante para el ancho de los ítems del carrusel
  const ITEM_WIDTH_CAROUSEL = 260; // Aumentado de 180 a 280

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

  // Inyectar estilos globales para animaciones
  useEffect(() => {
    // Solo inyectar los estilos una vez
    if (!document.getElementById('box-component-styles')) {
      const styleEl = document.createElement('style');
      styleEl.id = 'box-component-styles';
      styleEl.innerHTML = globalStyles;
      document.head.appendChild(styleEl);
      
      // Limpieza al desmontar el componente
      return () => {
        const styleElement = document.getElementById('box-component-styles');
        if (styleElement) {
          styleElement.remove();
        }
      };
    }
  }, []);

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
            color,
            uuid_api
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
                color: String(item.content_tier.color),
                uuid_api: String(item.content_tier.uuid_api),
              }
            : undefined,
      }));

      setProbabilidades(mapped);
    } catch (err) {
      console.error("Error inesperado al obtener probabilidades:", err);
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
    for (let i = 0; i < 80; i++) {
      const randomSkin = selectRandomSkinByProbability(
        cajaSkins,
        probabilidades,
      );

      if (randomSkin)
        baseItems.push({ ...randomSkin, id: `${randomSkin.id}-${i}` });
    }

    // En la posición central añadimos la skin ganadora
    const winnerPosition = 80;

    baseItems.push({ ...selectedSkin, id: `winner-${selectedSkin.id}` });

    // Completamos con 25 items más
    for (let i = 0; i < 80; i++) {
      const randomSkin = selectRandomSkinByProbability(
        cajaSkins,
        probabilidades,
      );

      if (randomSkin)
        baseItems.push({ ...randomSkin, id: `${randomSkin.id}-${i + 80}` });
    }

    // Crear una copia al inicio y al final para que parezca infinito
    return [...baseItems.slice(0, 10), ...baseItems, ...baseItems.slice(0, 10)];
  };

  // Función para animar la ruleta con un efecto de frenado más realista
  const animateSpinner = (finalPosition: number) => {
    if (!spinnerRef.current) return;

    const duration = 12000; // 12 segundos de duración
    const spinnerElement = spinnerRef.current;

    // Reset any existing animations and transitions
    spinnerElement.style.animation = 'none';
    spinnerElement.style.transform = 'translateX(0px)'; // Reset position before transition
    spinnerElement.style.transition = 'none'; // Clear any existing transition
    
    // Force reflow to apply the reset styles immediately
    void spinnerElement.offsetWidth;

    // Set up the transition with a cubic-bezier for a very long fast spin and quick stop
    spinnerElement.style.transition = `transform ${duration}ms cubic-bezier(0.12, 0.99, 0.62, 1.01)`;
    
    // Apply the final transform that will be animated
    spinnerElement.style.transform = `translateX(-${finalPosition}px)`;
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
      const itemWidth = ITEM_WIDTH_CAROUSEL; // Usar la constante
      const offsetToCenterItemInViewport = (viewportWidth - itemWidth) / 2;
      const finalPosition = winningItemIndexInSpinItems * itemWidth - offsetToCenterItemInViewport;

      // Call the simplified animateSpinner
      animateSpinner(finalPosition);

      const animationDuration = 12000; // Match the transition duration (changed to 12s)
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

      return () => {
        clearTimeout(timer);
        // It's also good practice to clean up the transition if the component unmounts or effect re-runs mid-animation
        if (spinnerRef.current) {
          spinnerRef.current.style.transition = 'none';
        }
      };
    }
  }, [isSpinning, spinItems, resultSkinForSpin, caja]);

  // Si está cargando, mostrar spinner de carga
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] w-full bg-gradient-to-b from-slate-900/60 to-black/60 rounded-xl shadow-inner p-10">
        <div className="relative animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary mb-4">
          <div className="absolute inset-0 rounded-full border border-slate-700 opacity-20"></div>
        </div>
        <p className="text-white/80 font-medium mt-4 animate-pulse">Cargando la caja...</p>
      </div>
    );
  }

  // Si hay error, mostrar mensaje de error
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] w-full bg-gradient-to-b from-slate-900/60 to-black/60 rounded-xl shadow-inner p-10">
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6 max-w-md mx-auto shadow-lg">
          <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-red-500">
              <path d="M12 8V12M12 16H12.01M7.8 21H16.2C17.8802 21 18.7202 21 19.362 20.673C19.9265 20.3854 20.3854 19.9265 20.673 19.362C21 18.7202 21 17.8802 21 16.2V7.8C21 6.11984 21 5.27976 20.673 4.63803C20.3854 4.07354 19.9265 3.6146 19.362 3.32698C18.7202 3 17.8802 3 16.2 3H7.8C6.11984 3 5.27976 3 4.63803 3.32698C4.07354 3.6146 3.6146 4.07354 3.32698 4.63803C3 5.27976 3 6.11984 3 7.8V16.2C3 17.8802 3.32698 19.362C3.6146 19.9265 4.07354 20.3854 4.63803 20.673C5.27976 21 6.11984 21 7.8 21Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <p className="text-red-500 text-center font-medium mb-4">{error}</p>
          <Button 
            className="w-full bg-slate-800 hover:bg-slate-700 text-white py-2 rounded-lg transition-all flex items-center justify-center gap-2 border border-slate-700"
            onClick={() => window.location.reload()}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="animate-spin">
              <path d="M21.8883 13.5C21.1645 18.3113 17.013 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C16.1006 2 19.6248 4.46819 21.1679 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M17 8H21.4C21.7314 8 22 7.73137 22 7.4V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  // Si no hay caja, mostrar mensaje
  if (!caja) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] w-full bg-gradient-to-b from-slate-900/60 to-black/60 rounded-xl shadow-inner p-10">
        <div className="w-16 h-16 bg-slate-800/70 rounded-full flex items-center justify-center mb-4 shadow-inner">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-slate-400">
            <path d="M20 8.5V13.5M20 21V17.5M12 21H16.5M16.5 21V3.5C16.5 3.10218 16.342 2.72064 16.0607 2.43934C15.7794 2.15804 15.3978 2 15 2H6C5.60218 2 5.22064 2.15804 4.93934 2.43934C4.65804 2.72064 4.5 3.10218 4.5 3.5V21.5C4.5 21.8978 4.65804 22.2794 4.93934 22.5607C5.22064 22.842 5.60218 23 6 23H14.5M16.5 21H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M8 6.5H13M8 10.5H13M8 14.5H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <p className="text-white/60 text-center max-w-md">No se encontró la caja solicitada. Por favor, intenta acceder a otra página o contacta con soporte si crees que es un error.</p>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col items-center justify-center py-10">
      {resultSkin ? (
        // Resultado de apertura de caja mejorado
        <div className="p-8 md:p-10 rounded-xl max-w-md w-full text-center bg-gradient-to-br from-slate-800/80 via-slate-900/90 to-black/80 shadow-2xl border border-slate-700/50 backdrop-blur-md flex flex-col items-center">
          {resultSkin.imagen_url && (
            <div className="mt-12 mb-20 flex items-center justify-center relative">
              <div 
                className="relative w-[240px] h-[240px] rounded-xl overflow-hidden flex items-center justify-center group"
                // style={itemCardStyle}
              >
                {resultSkin.content_tier?.id && resultSkin.content_tier.id !== 'standard' && (
                  <Image
                    src={`/skins-bg/${resultSkin.content_tier.id}.png`}
                    alt="" // Decorative
                    layout="fill"
                    objectFit="contain"
                    className="absolute inset-0 z-10 p-2 opacity-40 transform scale-150 rotate-12"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                )}
                {resultSkin.imagen_url && (
                  <Image
                    alt={resultSkin.nombre}
                    className="object-contain drop-shadow-lg p-2 relative z-10" 
                    style={{animation: 'float 3s infinite ease-in-out', rotate: '12deg'}}
                    height={250}
                    src={resultSkin.imagen_url}
                    width={250}
                  />
                )}
                
              </div>
              <Image
                  alt={resultSkin.nombre}
                  src={`/skins-bg-result/${resultSkin.content_tier?.id}.png`}
                  className="object-contain drop-shadow-lg relative mt-10 ml-2 scale-[2] opacity-80"
                  layout="fill"
                  objectFit="contain"
                />
            </div>
          )}
          <p className="text-2xl font-semibold text-white mb-3 capitalize tracking-wide">
            {resultSkin.nombre}
          </p>
          {resultSkin.content_tier && (
            <div className="mb-6">
              <div
                className="px-5 py-2 rounded-full text-sm font-medium shadow-md border border-opacity-50"
                style={{
                  backgroundColor: `${resultSkin.content_tier.color}20`, // Lighter background with opacity
                  color: resultSkin.content_tier.color,
                  borderColor: resultSkin.content_tier.color,
                  boxShadow: `0 0 15px ${resultSkin.content_tier.color}40` // Glow effect
                }}
              >
                {resultSkin.content_tier.nombre}
              </div>
            </div>
          )}
          <Button
            onClick={() => {
              setResultSkin(null);
              setIsOpening(false); // Ensure isOpening is reset when going back
            }}
            className="rounded-xl bg-gradient-to-r from-red-500/20 to-red-600/20 text-white shadow-lg shadow-red-900/20 border border-red-500/20 hover:bg-gradient-to-r hover:from-red-500/30 hover:to-red-600/30 active:scale-95 transition-all duration-200"
          >
            Abrir de nuevo
          </Button>
        </div>
      ) : (
        // Vista principal de la caja mejorada
        <div className="flex flex-col items-center w-full max-w-6xl mx-auto">
          {caja && (
            <div className="w-full text-center relative z-0">
              {/* Efectos de resplandor mejorados detrás de la caja */}
              <div className="absolute -z-10 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] rounded-full opacity-20 blur-3xl bg-gradient-radial from-primary/50 to-transparent"></div>
              <div className="absolute -z-10 left-1/3 top-1/3 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[200px] rounded-full opacity-10 blur-2xl bg-gradient-radial from-amber-300/50 to-transparent"></div>
              
              <h1 className="text-4xl font-semibold capitalize text-foreground text-center">
                {caja.nombre}
              </h1>
              <div className="h-1 w-1/4 bg-gradient-to-r from-primary/60 to-secondary/60 rounded-full mx-auto mt-4" />

              {isSpinning ? (
                // Vista giratoria mejorada
                <div className="w-full text-center mb-8 relative">
                  <div className="w-full py-6 relative">
                    <div
                      className="mx-auto overflow-hidden relative rounded-lg shadow-2xl backdrop-blur-lg bg-gradient-to-r from-transparent via-black/50 to-transparent w-full"
                      style={{
                        height: "240px",
                      }}
                    >

                      {/* Efecto de resplandor en los bordes (solo superior e inferior) */}
                      <div className="absolute inset-0 pointer-events-none">
                        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-primary/80 to-transparent"></div>
                        <div className="absolute bottom-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-primary/80 to-transparent"></div>
                      </div>
                      
                      <div
                        ref={spinnerRef}
                        className="flex items-center"
                        style={{
                          width: "`${spinItems.length * ITEM_WIDTH_CAROUSEL}px`", // Usar la constante
                          height: "100%",
                        }}
                      >
                        {spinItems.map((skin, index) => {
                          /** 
                          let itemCardStyle: React.CSSProperties = {
                            borderWidth: '1px',
                            borderColor: 'rgba(55, 65, 81, 0.5)' // slate-700/50
                          };

                          if (skin.content_tier?.color && skin.content_tier.color !== '#FFFFFF' && skin.content_tier.color.startsWith('#')) {
                            const tierColorHex = skin.content_tier.color;
                            if (/^#([0-9A-F]{3}){1,2}([0-9A-F]{2})?$/i.test(tierColorHex)) {
                              let r, g, b;
                              if (tierColorHex.length === 4 || tierColorHex.length === 5) {
                                r = parseInt(tierColorHex[1] + tierColorHex[1], 16);
                                g = parseInt(tierColorHex[2] + tierColorHex[2], 16);
                                b = parseInt(tierColorHex[3] + tierColorHex[3], 16);
                              } else {
                                r = parseInt(tierColorHex.slice(1, 3), 16);
                                g = parseInt(tierColorHex.slice(3, 5), 16);
                                b = parseInt(tierColorHex.slice(5, 7), 16);
                              }
                              itemCardStyle.backgroundImage = `linear-gradient(to top, rgba(${r},${g},${b},0.12) 0%, rgba(${r},${g},${b},0.18) 35%, rgba(10, 14, 22, 0.88) 70%, #0A0E16 100%)`;
                            } else {
                              itemCardStyle.backgroundImage = `linear-gradient(to bottom, rgba(20, 28, 42, 0.85), rgba(10, 14, 22, 0.92))`;
                            }
                          } else {
                            itemCardStyle.backgroundImage = `linear-gradient(to bottom, rgba(20, 28, 42, 0.85), rgba(10, 14, 22, 0.92))`;
                          }
                          */

                          return (
                            <div
                              key={`${skin.id}-${index}`}
                              className="p-2 flex-shrink-0 h-full flex flex-col justify-center items-center text-center transition-all"
                              style={{ width: `${ITEM_WIDTH_CAROUSEL}px` }}
                            >
                              <div 
                                className="relative w-[240px] h-[240px] rounded-xl overflow-hidden flex items-center justify-center group"
                                // style={itemCardStyle}
                              >
                                {skin.content_tier?.id && skin.content_tier.id !== 'standard' && (
                                  <Image
                                    src={`/skins-bg/${skin.content_tier.id}.png`}
                                    alt="" // Decorative
                                    layout="fill"
                                    objectFit="contain"
                                    className="absolute inset-0 z-0 p-2 opacity-40 transform scale-125 rotate-12"
                                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                    priority={index < 10} // Prioritize first few images
                                  />
                                )}
                                {skin.imagen_url && (
                                  <Image
                                    alt={skin.nombre}
                                    className="object-contain drop-shadow-lg p-2 relative z-10 transform transition-transform duration-300 group-hover:scale-105 rotate-12"
                                    height={220}
                                    src={skin.imagen_url}
                                    width={220}
                                    priority={index < 10}
                                  />
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      
                      {/* Marcador central mejorado */}
                      <div className="absolute top-0 left-1/2 h-full transform -translate-x-1/2 pointer-events-none z-10 flex items-center justify-center">
                        <div className="w-[3px] h-full bg-gradient-to-b from-transparent via-primary to-transparent opacity-75"></div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                // Vista inicial de la caja mejorada
                <div className="my-8 flex items-center justify-center relative">
                  <div className="">
                    <Image src="/cajas/left-arrow.png" alt="Caja" width={150} height={150} 
                    style={{
                      filter: 'drop-shadow(0 0 20px rgba(255, 255, 255, 0.2))',
                    }}
                    />
                  </div>
                  {caja.imagen_url && (
                    <div className="relative group">
                      <div className="absolute -inset-1 rounded-xl blur opacity-40 transition duration-500"></div>
                      <div className="relative  p-1 rounded-xl overflow-hidden">
                        <Image
                          alt={caja.nombre}
                          className="relative z-20 object-contain p-2 transform transition-transform duration-700"
                          height={350}
                          src={caja.imagen_url || "/free_cage.png"}
                          width={350}
                        />
                      </div>
                    </div>
                  )}
                  <div className="">
                    <Image src="/cajas/right-arrow.png" alt="Caja" width={150} height={150}
                     style={{
                      filter: 'drop-shadow(0 0 20px rgba(255, 255, 255, 0.2))',
                    }}
                    />
                  </div>
                </div>
              )}
              
              {caja.es_diaria && nextUpdate && (
                <div className="mb-8 text-white/90 bg-gradient-to-r from-slate-800/70 to-slate-900/70 border border-slate-700/70 rounded-lg py-3 px-5 shadow-lg inline-block">
                  <p className="flex items-center gap-2 font-medium">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-primary">
                      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/>
                      <path d="M12 6v6l4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                    <span className="text-sm opacity-80">Próxima actualización:</span>
                    <span className="text-primary font-bold">{nextUpdate}</span>
                  </p>
                </div>
              )}

              {/* Botones principales */}
              <div className="flex flex-wrap gap-4 mt-8 mb-8 justify-center">
                <Button
                  className={`px-6 py-5 text-lg rounded-xl bg-gradient-to-r from-red-500/20 to-red-600/20 shadow-lg shadow-red-900/20
                              text-white hover:bg-gradient-to-r hover:from-red-500/30 hover:to-red-600/30 
                              active:scale-95 transition-all duration-300 min-w-[180px] border border-red-500/20 
                              
                    ${(!isOpening && !isSpinning && (!caja.es_diaria || !dailyOpened) && caja.esta_disponible) 
                      ? 'hover:shadow-primary/30' 
                      : 'opacity-80 cursor-not-allowed'}`}
                  disabled={isOpening || isSpinning || (caja.es_diaria && dailyOpened) || !caja.esta_disponible}
                  onClick={openBox}
                >
                  {isOpening || isSpinning ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="animate-spin h-4 w-4 border-2 border-white/20 border-t-white rounded-full"></span>
                      {isSpinning ? "Girando..." : "Abriendo..."}
                    </span>
                  ) : caja.es_diaria && dailyOpened ? (
                    "Ya abierta hoy"
                  ) : !caja.esta_disponible ? (
                    "Próximamente"
                  ) : (
                    `Abrir por ${caja.precio} VP`
                  )}
                </Button>
              </div>
            </div>
          )}
          {!caja && <p>Cargando información de la caja...</p>}
        </div>
      )}
    </div>
  );
}
