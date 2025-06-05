"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";

import { Button } from "@/components/ui/button";
import { getWeaponSkins, filterSkinsByIds, getWeaponSpecificStyles, getWeaponType } from "@/lib/valorantApi";
import { formatSkinForApp } from "@/lib/skinUtils";
import SpinnerAnimation from "@/components/SpinnerAnimation";
import {
  Skin,
  TierProbabilidad,
  processBoxOpening,
  selectRandomSkinByProbability,
  getTierData,
  processBoxOpeningWithLog,
  selectMultipleRandomSkins,
  selectMultipleRandomSkinsForSpinner,
  processMultipleBoxOpeningOptimized,
  processSingleBoxOpeningOptimized,
} from "@/lib/boxUtils";
import {
  procesarSkinConseguida
} from "@/lib/missionUtils";
import { decrementarSaldoLocal } from "@/lib/saldoUtils";

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

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.bg-gradient-radial {
  background: radial-gradient(circle, var(--tw-gradient-stops));
}

/* Ocultar scrollbars en navegadores webkit */
::-webkit-scrollbar {
  display: none;
}

/* Ocultar scrollbars en Firefox */
* {
  scrollbar-width: none;
  -ms-overflow-style: none;
}

/* Asegurar que las animaciones hover no generen overflow */
.hover-safe {
  overflow: hidden;
  backface-visibility: hidden;
  transform: translateZ(0);
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
  const [isPreparingBox, setIsPreparingBox] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinItems, setSpinItems] = useState<Skin[]>([]);
  const [nextUpdate, setNextUpdate] = useState<string | null>(null);
  const [resultSkin, setResultSkin] = useState<Skin | null>(null);
  const [dailyOpened, setDailyOpened] = useState(false);
  const [resultSkinForSpin, setResultSkinForSpin] = useState<Skin | null>(null);

  // Estados para múltiples cajas
  const [isMultipleMode, setIsMultipleMode] = useState(false);
  const [numberOfBoxes, setNumberOfBoxes] = useState(1);
  const [previousNumberOfBoxes, setPreviousNumberOfBoxes] = useState(1);
  const [multipleResults, setMultipleResults] = useState<Skin[]>([]);
  const [multipleSpinItems, setMultipleSpinItems] = useState<Skin[][]>([]);
  const [completedSpinners, setCompletedSpinners] = useState<boolean[]>([]);

  // Contador de renders para debugging
  const renderCountRef = useRef(0);
  renderCountRef.current += 1;

  // Log específico para monitorear cambios en multipleResults
  useEffect(() => {
    if (multipleResults.length === 0) {
    }
  }, [multipleResults]);

  // Referencias
  const spinnerRef = useRef<HTMLDivElement>(null);

  // Constante para el ancho de los ítems del carrusel
  const ITEM_WIDTH_CAROUSEL = 240; // Reducido de 260 a 180 para menos espacio

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

  // Función para generar items aleatorios para la ruleta - OPTIMIZADA con caché
  const generateSpinItems = useMemo(() => {
    return (selectedSkin: Skin) => {
      if (!cajaSkins || cajaSkins.length === 0) return [];

      // Generar items para la ruleta de forma optimizada
      const baseItems: Skin[] = [];

      // Usar la función optimizada específica para el spinner que SÍ modifica los IDs
      const randomItemsBefore = selectMultipleRandomSkinsForSpinner(cajaSkins, probabilidades, 80, 'before');
      const randomItemsAfter = selectMultipleRandomSkinsForSpinner(cajaSkins, probabilidades, 80, 'after');

      // Añadir los items antes de la skin ganadora
      baseItems.push(...randomItemsBefore);

      // En la posición central añadimos la skin ganadora
      baseItems.push({ ...selectedSkin, id: `winner-${selectedSkin.id}` });

      // Completamos con items después
      baseItems.push(...randomItemsAfter);

      // Crear una copia al inicio y al final para que parezca infinito
      return [...baseItems.slice(0, 10), ...baseItems, ...baseItems.slice(0, 10)];
    };
  }, [cajaSkins, probabilidades]); // Solo recalcular si cambian las skins o probabilidades

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

  // Función para abrir una o múltiples cajas - OPTIMIZADA
  const openBox = async () => {
    if (
      !caja ||
      !caja.esta_disponible ||
      isOpening ||
      isSpinning ||
      isPreparingBox ||
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
    setIsPreparingBox(true);

    try {
      if (!supabase) {
        throw new Error("Error al conectar con la base de datos");
      }

      if (probabilidades.length === 0) {
        console.error("No se encontraron probabilidades para esta caja");
        setIsOpening(false);
        setIsPreparingBox(false);
        return;
      }

      if (isAuthenticated && session?.user?.id) {
        const userId = session.user.id;

        if (isMultipleMode && numberOfBoxes > 1) {
          // Modo múltiples cajas - USAR FUNCIÓN OPTIMIZADA
          const openingResult = await processMultipleBoxOpeningOptimized(
            userId,
            caja.id,
            cajaSkins as any,
            probabilidades as any,
            supabase,
            caja.precio,
            numberOfBoxes
          );

          if (openingResult.success && openingResult.results.length > 0) {
            // Generar items de spinner para cada resultado
            const spinItemsArray = openingResult.results.map(result => 
              generateSpinItems(result)
            );
            
            // 🎯 DISPARAR EVENTO PARA ACTUALIZAR SIDEBAR - VP (ya se hizo en la función optimizada)
            if (caja.precio > 0) {
              decrementarSaldoLocal(caja.precio * numberOfBoxes);
            }
            
            setMultipleResults(openingResult.results);
            setMultipleSpinItems(spinItemsArray);
            setCompletedSpinners(Array(numberOfBoxes).fill(false));
            setIsPreparingBox(false); // Desactivar el spinner de preparación
            setIsSpinning(true);
          } else {
            console.error("Error al abrir cajas múltiples:", openingResult.error);
            setIsOpening(false);
            setIsPreparingBox(false);
          }
        } else {
          // Modo caja única - USAR FUNCIÓN OPTIMIZADA
          const openingResult = await processSingleBoxOpeningOptimized(
            userId,
            caja.id,
            cajaSkins as any,
            probabilidades as any,
            supabase,
            caja.precio
          );

          if (openingResult.success && openingResult.selectedSkin) {
            // 🎯 DISPARAR EVENTO PARA ACTUALIZAR SIDEBAR - VP (ya se hizo en la función optimizada)
            if (caja.precio > 0) {
              decrementarSaldoLocal(caja.precio);
            }
            
            const items = generateSpinItems(openingResult.selectedSkin);
            setResultSkinForSpin(openingResult.selectedSkin);
            setSpinItems(items);
            setIsPreparingBox(false); // Desactivar el spinner de preparación
            setIsSpinning(true);
          } else {
            console.error("Error al seleccionar skin:", openingResult.error);
            setIsOpening(false);
            setIsPreparingBox(false);
          }
        }
      } else {
        console.error("Error al abrir la caja, el usuario no está autenticado");
        setIsOpening(false);
        setIsPreparingBox(false);
      }
    } catch (error: any) {
      console.error("Error al abrir la caja:", error);
      setIsOpening(false);
      setIsPreparingBox(false);
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
      const postSpinDelay = 800; // Reducido para transiciones más fluidas

      const timer = setTimeout(() => {
        // Usar la función handleSpinnerComplete para consistencia
        handleSpinnerComplete();
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

  // Función para manejar la finalización de las animaciones del spinner
  const handleSpinnerComplete = (spinnerIndex?: number) => {
    if (isMultipleMode && numberOfBoxes > 1 && spinnerIndex !== undefined) {
      // Modo múltiples cajas - escalonado
      setCompletedSpinners(prev => {
        const newCompleted = [...prev];
        newCompleted[spinnerIndex] = true;
        
        // Verificar si todas han terminado
        const allCompleted = newCompleted.every((completed, idx) => idx >= numberOfBoxes || completed);
        
        if (allCompleted) {
          // Todas han terminado, aplicar transición suave
          setTimeout(() => {
            setIsSpinning(false);
            setIsOpening(false);
            if (caja && caja.es_diaria) {
              setDailyOpened(true);
            }
          }, 800); // Tiempo optimizado para transición más fluida
        }
        
        return newCompleted;
      });
    } else {
      // Modo caja única - transición mejorada
      setTimeout(() => {
        setResultSkin(resultSkinForSpin);
        setIsSpinning(false);
        setResultSkinForSpin(null);
        if (caja && caja.es_diaria) {
          setDailyOpened(true);
        }
        setIsOpening(false);
      }, 400); // Pequeña pausa para transición más suave
    }
  };

  // Función para resetear todo cuando se cierra el resultado
  const resetResults = () => {
    setResultSkin(null);
    setMultipleResults([]);
    setMultipleSpinItems([]);
    setCompletedSpinners([]);
    setIsOpening(false);
    setIsPreparingBox(false);
  };

  // useEffect para actualizar previousNumberOfBoxes después de las animaciones
  useEffect(() => {
    const timer = setTimeout(() => {
      setPreviousNumberOfBoxes(numberOfBoxes);
    }, 500); // Después de que terminen las animaciones

    return () => clearTimeout(timer);
  }, [numberOfBoxes]);

  // Función para separar la última palabra del nombre
  const formatNameWithLastWordSeparate = (name: string) => {
    const words = name.trim().split(' ');
    if (words.length <= 1) return { firstPart: '', lastWord: name };
    
    const lastWord = words[words.length - 1];
    const firstPart = words.slice(0, -1).join(' ');
    
    return { firstPart, lastWord };
  };

  // Si está cargando, mostrar spinner de carga
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] w-full bg-gradient-to-b from-slate-900/60 to-black/60 rounded-xl shadow-inner p-10">
        <div className="relative animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary mb-4">
          <div className="absolute inset-0 rounded-full border border-slate-700 opacity-20"></div>
        </div>
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

  // Estados de renderizado - transiciones mejoradas
  const showMultipleResults = multipleResults.length > 0 && !isSpinning && !isOpening && !isPreparingBox;
  const showSingleResult = !!resultSkin && !isSpinning && !isOpening && !isPreparingBox;
  const showSpinners = isSpinning;
  const showPreparingSpinner = isPreparingBox && !isSpinning;
  const showInitialView = !isSpinning && !showSingleResult && !showMultipleResults && !isOpening && !isPreparingBox;

  return (
    <div className="w-full flex flex-col items-center justify-center py-10">
      {/* Contenedor con altura fija para evitar saltos */}
      <div className="w-full h-[650px] flex items-center justify-center">
        <AnimatePresence mode="wait">
        {/* Resultado de caja única */}
        {showSingleResult && (
          <motion.div
            key="single-result"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.7, ease: "easeOut", delay: 0.2 }}
            className="w-full h-full flex items-center justify-center"
          >
            <div className="w-full flex flex-col items-center justify-center">
              <div className="flex justify-center items-center px-2 md:px-4 overflow-hidden mb-8">
                <div className="flex justify-center items-center">
                  <motion.div 
                    className="flex-shrink-0"
                    initial={{ opacity: 0, y: 30, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ 
                      delay: 0.3, 
                      duration: 0.5, 
                      ease: "easeOut" 
                    }}
                  >
                    <motion.div 
                      className="w-[320px] md:w-[400px] h-[500px] md:h-[600px] rounded-2xl overflow-hidden relative hover-safe"
                      whileHover={{ scale: 1.02 }}
                      transition={{ duration: 0.3 }}
                      style={{
                        background: resultSkin.content_tier ? 
                          `radial-gradient(circle at center, ${resultSkin.content_tier.color}15 0%, ${resultSkin.content_tier.color}08 50%, transparent 100%)` : 
                          'radial-gradient(circle at center, rgba(255,255,255,0.05) 0%, transparent 70%)',
                        willChange: 'transform'
                      }}
                    >
                      {/* Tag de NUEVA en esquina superior derecha */}
                      {resultSkin.isNewSkin && (
                        <motion.div
                          initial={{ scale: 1, opacity: 0, x: 0, y: 0 }}
                          animate={{ scale: 1, opacity: 1, x: 0, y: 0 }}
                          transition={{ delay: 1.2, duration: 0.4, type: "spring", stiffness: 300 }}
                          className="absolute top-2 right-2 mt-2 mr-2 z-20 px-2 py-1 rounded-xl text-xs font-bold 
                                     bg-gradient-to-r from-red-500/20 to-red-600/20 text-white-300 shadow-lg 
                                     shadow-red-900/20 border border-red-500/20 backdrop-blur-sm hover:bg-gradient-to-r 
                                     hover:from-red-500/30 hover:to-red-600/30 active:scale-95 transition-all duration-200"
                        >
                          ✨ NUEVA
                        </motion.div>
                      )}
                      {/* Fondo de la tier */}
                      {resultSkin.content_tier?.id && resultSkin.content_tier.id !== 'standard' && (
                        <div className="absolute inset-0 z-0 flex items-center justify-center">
                          <Image
                            src={`/skins-bg/${resultSkin.content_tier.id}.png`}
                            alt={`Fondo para ${resultSkin.content_tier.nombre}`}
                            width={300}
                            height={300}
                            className="scale-125 rotate-12 opacity-40 mb-24"
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                          />
                        </div>
                      )}
                      
                      {/* Contenido principal */}
                      <div className="relative z-10 h-full flex flex-col items-center justify-center p-4">
                        <motion.div 
                          className="relative w-[260px] md:w-[320px] h-[260px] md:h-[320px] mb-4"
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ delay: 0.5, duration: 0.4, ease: "easeOut" }}
                        >
                          {resultSkin.imagen_url && (
                            <Image
                              alt={resultSkin.nombre}
                              className="object-contain drop-shadow-lg p-2 relative z-10 transform transition-transform duration-300"
                              fill
                              src={resultSkin.imagen_url}
                              style={{
                                animation: 'float 4s infinite ease-in-out',
                                filter: 'drop-shadow(0 0 20px rgba(255,255,255,0.3))',
                              }}
                            />
                          )}
                        </motion.div>
                        
                        <motion.div
                          className="text-center space-y-3"
                          initial={{ y: 20, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          transition={{ delay: 0.7, duration: 0.4 }}
                        >
                          {(() => {
                            const { firstPart, lastWord } = formatNameWithLastWordSeparate(resultSkin.nombre);
                            return (
                              <h3 className="text-sm md:text-lg font-bold text-white leading-tight px-2">
                                {firstPart && <span className="block">{firstPart}</span>}
                                <span className="block">{lastWord}</span>
                              </h3>
                            );
                          })()}
                          {resultSkin.content_tier && (
                            <div
                              className="px-3 md:px-4 py-2 rounded-full text-xs md:text-sm font-bold shadow-2xl border-2 mx-auto inline-block"
                              style={{
                                backgroundColor: `${resultSkin.content_tier?.color}25`,
                                color: resultSkin.content_tier?.color,
                                borderColor: resultSkin.content_tier?.color,
                                boxShadow: `0 0 25px ${resultSkin.content_tier?.color}50, inset 0 0 15px ${resultSkin.content_tier?.color}20`
                              }}
                            >
                              {resultSkin.content_tier?.nombre}
                            </div>
                          )}
                        </motion.div>
                      </div>
                      
                      {/* Efecto de brillo */}
                      <div 
                        className="absolute inset-0 rounded-2xl pointer-events-none"
                        style={{
                          background: `radial-gradient(circle at 50% 30%, ${resultSkin.content_tier?.color || '#ffffff'}20 0%, transparent 60%)`,
                          animation: 'pulse 2s infinite'
                        }}
                      />
                    </motion.div>
                  </motion.div>
                </div>
              </div>
              
              {/* Botón para abrir más cajas */}
              <motion.div 
                className="text-center"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1, duration: 0.5 }}
              >
                <Button
                  onClick={resetResults}
                  className="rounded-xl bg-gradient-to-r from-red-500/20 to-red-600/20 text-white shadow-lg shadow-red-900/20 border border-red-500/20 hover:bg-gradient-to-r hover:from-red-500/30 hover:to-red-600/30 active:scale-95 transition-all duration-200 px-8 py-3 text-lg font-medium"
                >
                  Abrir de nuevo
                </Button>
              </motion.div>
            </div>
          </motion.div>
        )}

        {/* Resultados múltiples */}
        {showMultipleResults && (
          <motion.div
            key="multiple-results"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.7, ease: "easeOut", delay: 0.2 }}
            className="w-full h-full flex items-center justify-center"
          >
            <div className="w-full flex flex-col items-center justify-center">
              <div className="flex justify-center items-center px-2 md:px-4 overflow-hidden mb-8">
              <div className={`flex justify-center items-center ${
                numberOfBoxes === 1 ? 'gap-0' :
                numberOfBoxes === 2 ? 'gap-4 md:gap-8' :
                numberOfBoxes === 3 ? 'gap-3 md:gap-6' :
                numberOfBoxes === 4 ? 'gap-2 md:gap-4' :
                'gap-1 md:gap-3'
              }`}>
                {multipleResults.map((result, index) => {
                  // Calcular tamaños responsivos según número de cajas - Ajustados para evitar scroll
                  const getSizes = () => {
                    switch(numberOfBoxes) {
                      case 1: return { w: 'w-[320px] md:w-[400px]', h: 'h-[500px] md:h-[600px]', imgW: 'w-[260px] md:w-[320px]', imgH: 'h-[260px] md:h-[320px]' };
                      case 2: return { w: 'w-[280px] md:w-[340px]', h: 'h-[450px] md:h-[520px]', imgW: 'w-[220px] md:w-[270px]', imgH: 'h-[220px] md:h-[270px]' };
                      case 3: return { w: 'w-[240px] md:w-[290px]', h: 'h-[400px] md:h-[460px]', imgW: 'w-[180px] md:w-[230px]', imgH: 'h-[180px] md:h-[230px]' };
                      case 4: return { w: 'w-[200px] md:w-[240px]', h: 'h-[360px] md:h-[410px]', imgW: 'w-[150px] md:w-[190px]', imgH: 'h-[150px] md:h-[190px]' };
                      case 5: return { w: 'w-[170px] md:w-[200px]', h: 'h-[320px] md:h-[370px]', imgW: 'w-[120px] md:w-[150px]', imgH: 'h-[120px] md:h-[150px]' };
                      default: return { w: 'w-[320px] md:w-[400px]', h: 'h-[500px] md:h-[600px]', imgW: 'w-[260px] md:w-[320px]', imgH: 'h-[260px] md:h-[320px]' };
                    }
                  };
                  const sizes = getSizes();

                  return (
                  <motion.div 
                    key={`result-${index}`}
                    className="flex-shrink-0"
                    initial={{ opacity: 0, y: 30, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ 
                      delay: index * 0.1 + 0.3, 
                      duration: 0.5, 
                      ease: "easeOut" 
                    }}
                  >
                    <motion.div 
                      className={`${sizes.w} ${sizes.h} rounded-2xl overflow-hidden relative hover-safe`}
                      whileHover={{ scale: 1.02 }}
                      transition={{ duration: 0.3 }}
                      style={{
                        background: result.content_tier ? 
                          `radial-gradient(circle at center, ${result.content_tier.color}15 0%, ${result.content_tier.color}08 50%, transparent 100%)` : 
                          'radial-gradient(circle at center, rgba(255,255,255,0.05) 0%, transparent 70%)',
                        willChange: 'transform'
                      }}
                    >
                      {/* Tag de NUEVA en esquina superior derecha */}
                      {result.isNewSkin && (
                        <motion.div
                          initial={{ scale: 1, opacity: 0, x: 0, y: 0 }}
                          animate={{ scale: 1, opacity: 1, x: 0, y: 0 }}
                          transition={{ delay: index * 0.1 + 1.2, duration: 0.4, type: "spring", stiffness: 300 }}
                          className="absolute top-2 right-2 z-20 mt-2 mr-2 px-2 py-1 rounded-xl text-xs font-bold 
                                     bg-gradient-to-r from-red-500/20 to-red-600/20 text-white-300 shadow-lg 
                                     shadow-red-900/20 border border-red-500/20 backdrop-blur-sm
                                     active:scale-95 transition-all duration-200"
                        >
                          ✨ NUEVA
                        </motion.div>
                      )}
                      {/* Fondo de la tier */}
                      {result.content_tier?.uuid_api && result.content_tier.uuid_api !== 'default' && (
                        <div className="absolute inset-0 z-0 flex items-center justify-center">
                          <Image
                            src={`/skins-bg/${result.content_tier.uuid_api}.png`}
                            alt={`Fondo para ${result.content_tier.nombre}`}
                            width={300}
                            height={300}
                            className="scale-125 rotate-12 opacity-40 mb-24"
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                            priority={index < 10}
                          />
                        </div>
                      )}
                      
                      {/* Contenido principal */}
                      <div className="relative z-10 h-full flex flex-col items-center justify-center p-4">
                        <motion.div 
                          className={`relative ${sizes.imgW} ${sizes.imgH} mb-4`}
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ delay: index * 0.1 + 0.5, duration: 0.4, ease: "easeOut" }}
                        >
                          {result.imagen_url && (
                            <Image
                              alt={result.nombre}
                              className="object-contain drop-shadow-lg p-2 relative z-10 transform transition-transform duration-300"
                              fill
                              src={result.imagen_url}
                              style={{
                                animation: 'float 4s infinite ease-in-out',
                                filter: 'drop-shadow(0 0 20px rgba(255,255,255,0.3))',
                              }}
                            />
                          )}
                        </motion.div>
                        
                        <motion.div
                          className="text-center space-y-3"
                          initial={{ y: 20, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          transition={{ delay: index * 0.1 + 0.7, duration: 0.4 }}
                        >
                          {(() => {
                            const { firstPart, lastWord } = formatNameWithLastWordSeparate(result.nombre);
                            return (
                              <h3 className="text-sm md:text-lg font-bold text-white leading-tight px-2">
                                {firstPart && <span className="block">{firstPart}</span>}
                                <span className="block">{lastWord}</span>
                              </h3>
                            );
                          })()}
                          {result.content_tier && (
                            <div
                              className="px-3 md:px-4 py-2 rounded-full text-xs md:text-sm font-bold shadow-2xl border-2 mx-auto inline-block"
                              style={{
                                backgroundColor: `${result.content_tier?.color}25`,
                                color: result.content_tier?.color,
                                borderColor: result.content_tier?.color,
                                boxShadow: `0 0 25px ${result.content_tier?.color}50, inset 0 0 15px ${result.content_tier?.color}20`
                              }}
                            >
                              {result.content_tier?.nombre}
                            </div>
                          )}
                        </motion.div>
                      </div>
                      
                      {/* Efecto de brillo */}
                      <div 
                        className="absolute inset-0 rounded-2xl pointer-events-none"
                        style={{
                          background: `radial-gradient(circle at 50% 30%, ${result.content_tier?.color || '#ffffff'}20 0%, transparent 60%)`,
                          animation: 'pulse 2s infinite'
                        }}
                      />
                    </motion.div>
                  </motion.div>
                  );
                })}
              </div>
            </div>
            
            {/* Botón para abrir más cajas */}
            <motion.div 
              className="text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: multipleResults.length * 0.1 + 1, duration: 0.5 }}
            >
              <Button
                onClick={resetResults}
                className="rounded-xl bg-gradient-to-r from-red-500/20 to-red-600/20 text-white shadow-lg shadow-red-900/20 border border-red-500/20 hover:bg-gradient-to-r hover:from-red-500/30 hover:to-red-600/30 active:scale-95 transition-all duration-200 px-8 py-3 text-lg font-medium"
              >
                Abrir de nuevo
              </Button>
            </motion.div>
            </div>
          </motion.div>
        )}

        {/* Spinners */}
        {showSpinners && (
          <motion.div
            key="spinners"
            initial={{ opacity: 0, scale: 0.9, y: 0 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 1, y: 0 }}
            transition={{ 
              duration: 0.5, 
              ease: "easeInOut",
              exit: { duration: 0.6, ease: "easeIn" }
            }}
            className="w-full h-full flex items-center justify-center"
          >
            {isMultipleMode && numberOfBoxes > 1 ? (
              // Vista múltiples cajas - Layout horizontal
              <div className="w-full mb-8">
                <div className="flex justify-center items-center px-2 md:px-4 overflow-hidden">
                  <div className={`flex justify-center items-center ${
                    numberOfBoxes === 1 ? 'gap-0' :
                    numberOfBoxes === 2 ? 'gap-4 md:gap-8' :
                    numberOfBoxes === 3 ? 'gap-3 md:gap-6' :
                    numberOfBoxes === 4 ? 'gap-2 md:gap-4' :
                    'gap-1 md:gap-3'
                  }`}>
                    {Array.from({ length: numberOfBoxes }).map((_, index) => {
                      // Calcular duración escalonada: 12s, 13s, 14s, etc.
                      const animationDuration = 12000 + (index * 1000);
                      
                      // Calcular tamaños responsivos según número de cajas - Ajustados para evitar scroll
                      const getSizes = () => {
                        switch(numberOfBoxes) {
                          case 1: return { w: 'w-[320px] md:w-[400px]', h: 'h-[500px] md:h-[600px]', itemSize: 200 };
                          case 2: return { w: 'w-[280px] md:w-[340px]', h: 'h-[450px] md:h-[520px]', itemSize: 170 };
                          case 3: return { w: 'w-[240px] md:w-[290px]', h: 'h-[400px] md:h-[460px]', itemSize: 150 };
                          case 4: return { w: 'w-[200px] md:w-[240px]', h: 'h-[360px] md:h-[410px]', itemSize: 130 };
                          case 5: return { w: 'w-[170px] md:w-[200px]', h: 'h-[320px] md:h-[370px]', itemSize: 110 };
                          default: return { w: 'w-[320px] md:w-[400px]', h: 'h-[500px] md:h-[600px]', itemSize: 200 };
                        }
                      };
                      const sizes = getSizes();
                      
                      return (
                        <motion.div 
                          key={`spinner-${index}`} 
                          className="flex-shrink-0"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1, duration: 0.4 }}
                        >
                          {multipleSpinItems[index] ? (
                            // Spinner activo - Sin div contenedor extra
                            <SpinnerAnimation
                              isSpinning={true}
                              spinItems={multipleSpinItems[index]}
                              onAnimationComplete={() => handleSpinnerComplete(index)}
                              orientation="vertical"
                              itemSize={sizes.itemSize}
                              animationDuration={animationDuration}
                              customContainerClass={`${sizes.w} ${sizes.h}`}
                            />
                          ) : (
                            // Estado inicial - preparando
                            <div className={`${sizes.w} ${sizes.h} rounded-xl bg-slate-800/30 border border-slate-700/30 flex items-center justify-center opacity-50 backdrop-blur-sm shadow-xl`}>
                              <div className="text-white/60 text-center">
                                <div className="w-12 md:w-16 h-12 md:h-16 border-2 border-white/20 rounded-xl mb-4 md:mb-6 mx-auto flex items-center justify-center bg-slate-700/20">
                                  <span className="text-2xl md:text-4xl">📦</span>
                                </div>
                                <p className="text-sm md:text-base font-medium">Preparando...</p>
                              </div>
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              // Vista caja única - Spinner más grande
              <div className="w-full mx-auto">
                <SpinnerAnimation
                  isSpinning={true}
                  spinItems={spinItems}
                  onAnimationComplete={handleSpinnerComplete}
                  orientation="horizontal"
                />
              </div>
            )}
          </motion.div>
        )}

        {/* Vista de preparación - Spinner de carga antes de mostrar los spinners */}
        {showPreparingSpinner && (
          <motion.div 
            key="preparing-spinner"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="w-full h-full flex items-center justify-center"
          >
            <div className="flex flex-col items-center justify-center space-y-6">
              {/* Spinner principal mejorado */}
              <div className="relative">
                <div className="animate-spin rounded-full h-16 w-16 border-t-3 border-b-3 border-primary">
                  <div className="absolute inset-0 rounded-full border border-slate-700 opacity-20"></div>
                </div>
                {/* Efecto de pulso interno */}
                <div className="absolute inset-2 rounded-full bg-primary/20 animate-pulse"></div>
              </div>
              
              {/* Texto dinámico basado en el modo */}
              <div className="text-center space-y-2">
                <h3 className="text-lg font-semibold text-white">
                  {isMultipleMode && numberOfBoxes > 1 
                    ? `Procesando ${numberOfBoxes} cajas...` 
                    : 'Preparando caja...'}
                </h3>
                <p className="text-sm text-white/60">
                  {isMultipleMode && numberOfBoxes > 1 
                    ? 'Esto puede tomar unos segundos' 
                    : 'Seleccionando tu premio'}
                </p>
              </div>

              {/* Indicador de progreso opcional para múltiples cajas */}
              {isMultipleMode && numberOfBoxes > 1 && (
                <div className="w-64 bg-slate-800/50 rounded-full h-2 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-1000 ease-out animate-pulse"
                    style={{ width: '60%' }}
                  />
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Vista inicial */}
        {showInitialView && (
          <motion.div 
            key="initial-view"
            initial={{ opacity: 0, scale: 1, y: 5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 1, y: 0 }}
            transition={{ 
              duration: 0.6, 
              ease: "easeInOut",
              exit: { duration: 0.4, ease: "easeIn" }
            }}
            className="w-full h-full flex items-center justify-center"
          >
            {/* Vista principal de la caja mejorada */}
            <div className="flex flex-col items-center w-full max-w-7xl mx-auto">
              {caja && (
                <div className="w-full text-center relative z-0">
                  {/* Efectos de resplandor mejorados detrás de la caja */}
                  <div className="absolute -z-10 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] rounded-full opacity-15 blur-3xl bg-gradient-radial from-primary/40 to-transparent"></div>
                  <div className="absolute -z-10 left-1/3 top-1/3 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full opacity-10 blur-2xl bg-gradient-radial from-amber-300/30 to-transparent"></div>
                  
                  {/* Título estilizado */}
                  <h1 className="text-4xl md:text-5xl font-bold font-[Raleway] font-bold italic tracking-widest uppercase mb-12 
                                 [text-shadow:_0px_0px_20px_rgba(255,255,255,0.1)] bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                    · {caja.nombre} ·
                  </h1>

                  {/* Solo las cajas seleccionadas en línea horizontal */}
                  <div className="flex justify-center items-center gap-2 md:gap-6 mb-8 px-2 md:px-4 overflow-hidden">
                    <div className="flex gap-0 min-w-max">
                      <AnimatePresence mode="popLayout">
                        {Array.from({ length: numberOfBoxes }).map((_, index) => {
                          // Determinar si esta caja es nueva (apareció al incrementar numberOfBoxes)
                          const isNewBox = index >= previousNumberOfBoxes;
                          
                          return (
                            <motion.div 
                              key={`box-${index}`}
                              layoutId={`box-${index}`}
                              className="flex flex-col items-center flex-shrink-0"
                              layout
                              initial={isNewBox ? { opacity: 0, y: -50, scale: 0.8 } : { opacity: 1, scale: 1 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: -30, scale: 0.8 }}
                              transition={{ 
                                duration: 0.4, 
                                ease: "easeOut",
                                delay: isNewBox ? (index - previousNumberOfBoxes) * 0.08 : 0,
                                layout: { duration: 0.3, ease: "easeInOut" }
                              }}
                            >
                              {/* Imagen de la caja */}
                              <motion.div 
                                className="relative group"
                                transition={{ duration: 0.2 }}
                              >
                                <div className="absolute -inset-1 rounded-xl blur opacity-30 transition duration-500"></div>
                                <div className="relative p-1 rounded-xl overflow-hidden">
                                  {caja.imagen_url && (
                                    <Image
                                      alt={caja.nombre}
                                      className="relative z-20 object-contain transform transition-transform duration-300"
                                      height={
                                        numberOfBoxes === 4 ? 240 : 
                                        numberOfBoxes === 5 ? 200 : 
                                        300
                                      }
                                      width={
                                        numberOfBoxes === 4 ? 240 : 
                                        numberOfBoxes === 5 ? 200 : 
                                        300
                                      }
                                      src={caja.imagen_url || "/free_cage.png"}
                                    />
                                  )}
                                </div>
                              </motion.div>
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>
                    </div>
                  </div>

                  {/* Selector de multiplicador estilizado */}
                  <div className="mb-8 flex flex-col items-center gap-4">
                    <div className="flex items-center gap-0 border-2 rounded-2xl border-primary/20">
                      {[1, 2, 3, 4, 5].map((num) => (
                        <button
                          key={num}
                          onClick={() => {
                            setNumberOfBoxes(num);
                            setIsMultipleMode(num > 1);
                          }}
                          className={`relative w-10 h-10 md:w-12 md:h-12 transition-all duration-300 font-bold text-sm md:text-base ${
                            numberOfBoxes === num
                              ? 'bg-gradient-to-r from-red-500/20 to-red-600/20 text-white shadow-lg shadow-primary/40'
                              : 'bg-gray-800/50 text-white/70 hover:bg-gray-700/60 backdrop-blur-sm'
                              } ${
                                num === 1 
                                ? 'rounded-tl-xl rounded-bl-xl'
                                : num === 5
                                ? 'rounded-tr-xl rounded-br-xl'
                                : ''
                          }`}
                        >
                          <span className="relative z-10">x{num}</span>
                          {numberOfBoxes === num && (
                            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20 blur"></div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Botón principal estilizado */}
                  <div className="flex justify-center">
                    <Button
                      className={`px-8 md:px-12 py-4 md:py-5 text-lg md:text-xl font-medium rounded-2xl bg-gradient-to-r from-red-500/20 to-red-600/20
                                  text-white hover:bg-gradient-to-r hover:from-red-500/30 hover:to-red-600/30
                                  active:scale-95 transition-all duration-300 min-w-[200px] md:min-w-[280px] shadow-2xl shadow-red-900/20
                                  border-2 border-red-500/20 hover:border-red-500/60
                                  ${(!isOpening && !isSpinning && !isPreparingBox && (!caja.es_diaria || !dailyOpened) && caja.esta_disponible) 
                                    ? 'hover:shadow-primary/50 hover:-translate-y-1' 
                                    : 'opacity-60 cursor-not-allowed'}`}
                      disabled={isOpening || isSpinning || isPreparingBox || (caja.es_diaria && dailyOpened) || !caja.esta_disponible}
                      onClick={openBox}
                    >
                      {isOpening || isSpinning || isPreparingBox ? (
                        <span className="flex items-center justify-center gap-3">
                          <span className="animate-spin h-5 w-5 border-2 border-white/30 border-t-white rounded-full"></span>
                          {isPreparingBox ? 'Preparando...' : 'Cargando...'}
                        </span>
                      ) : caja.es_diaria && dailyOpened ? (
                        "YA ABIERTA HOY"
                      ) : !caja.esta_disponible ? (
                        "PRÓXIMAMENTE"
                      ) : numberOfBoxes && caja.precio > 0 ? (
                        <>
                          ABRIR POR
                          <span className="text-primary">{(caja.precio * numberOfBoxes)}VP</span>
                        </>
                      ) : numberOfBoxes > 1 && caja.precio > 0 ? (
                        <>
                          ABRIR POR
                          <span className="text-primary">{(caja.precio * numberOfBoxes)}VP</span>
                        </>
                      ) : (
                        `ABRIR GRATIS`
                      )}
                    </Button>
                  </div>

                  {/* Timer para caja diaria */}
                  {caja.es_diaria && nextUpdate && (
                    <div className="mt-8 text-white/90 bg-gradient-to-r from-slate-800/70 to-slate-900/70 border border-slate-700/70 rounded-xl py-3 px-6 shadow-lg inline-block backdrop-blur-sm">
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
                </div>
              )}
              {!caja && <p>Cargando información de la caja...</p>}
            </div>
          </motion.div>
        )}
        </AnimatePresence>
      </div>
    </div>
  );
}