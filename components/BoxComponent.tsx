"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";

import { Button } from "@/components/ui/button";
import { getWeaponSkins, filterSkinsByIds } from "@/lib/valorantApi";
import { formatSkinForApp } from "@/lib/skinUtils";
import SpinnerAnimation from "@/components/SpinnerAnimation";
import {
  Skin,
  TierProbabilidad,
  getTierData,
  selectMultipleRandomSkinsForSpinner,
  processMultipleBoxOpeningOptimized,
  processSingleBoxOpeningOptimized,
} from "@/lib/boxUtils";
import { decrementarSaldoLocal } from "@/lib/saldoUtils";

// Estilos CSS para animaciones del componente
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

/* Ocultar scrollbars */
::-webkit-scrollbar {
  display: none;
}

* {
  scrollbar-width: none;
  -ms-overflow-style: none;
}

/* Optimización para animaciones hover */
.hover-safe {
  overflow: hidden;
  backface-visibility: hidden;
  transform: translateZ(0);
}
`;

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
  cajaSkins: initialCajaSkins = [],
  probabilidades: initialProbabilidades = [],
  supabase,
}: BoxComponentProps) {
  const { data: session, status } = useSession();
  const isAuthenticated = status === "authenticated" && !!session?.user;

  // Estados principales
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

  // Estados para apertura múltiple
  const [isMultipleMode, setIsMultipleMode] = useState(false);
  const [numberOfBoxes, setNumberOfBoxes] = useState(1);
  const [previousNumberOfBoxes, setPreviousNumberOfBoxes] = useState(1);
  const [multipleResults, setMultipleResults] = useState<Skin[]>([]);
  const [multipleSpinItems, setMultipleSpinItems] = useState<Skin[][]>([]);
  const [completedSpinners, setCompletedSpinners] = useState<boolean[]>([]);

  const renderCountRef = useRef(0);
  renderCountRef.current += 1;

  useEffect(() => {
    if (multipleResults.length === 0) {
    }
  }, [multipleResults]);

  const spinnerRef = useRef<HTMLDivElement>(null);
  const ITEM_WIDTH_CAROUSEL = 240;

  // Cargar skins de la caja si no se proporcionaron inicialmente
  useEffect(() => {
    if (caja?.id && initialCajaSkins.length === 0) {
      loadCajaSkins();
    }
  }, [caja]);

  // Cargar probabilidades si no se proporcionaron inicialmente
  useEffect(() => {
    if (caja?.id && initialProbabilidades.length === 0) {
      loadProbabilidades();
    }
  }, [caja]);

  // Timer para caja diaria
  useEffect(() => {
    if (caja?.es_diaria && caja.fecha_actualizacion) {
      const intervalId = setInterval(() => {
        const nextUpdateTime = formatTimeRemaining(caja.fecha_actualizacion!);
        setNextUpdate(nextUpdateTime);
      }, 1000);

      return () => clearInterval(intervalId);
    }
  }, [caja]);

  // Inyectar estilos CSS
  useEffect(() => {
    if (!document.getElementById('box-component-styles')) {
      const styleEl = document.createElement('style');
      styleEl.id = 'box-component-styles';
      styleEl.innerHTML = globalStyles;
      document.head.appendChild(styleEl);
      
      return () => {
        const styleElement = document.getElementById('box-component-styles');
        if (styleElement) {
          styleElement.remove();
        }
      };
    }
  }, []);

  const loadCajaSkins = async () => {
    if (!caja?.id || !supabase) return;

    try {
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

      const skinIds = skinIdsData.map((item: any) => item.skin_id);
      const allSkins = await getWeaponSkins();
      const matchingSkins = filterSkinsByIds(allSkins, skinIds);

      if (matchingSkins.length > 0) {
        const formattedSkins: Skin[] = [];

        for (const skin of matchingSkins) {
          const tierData = supabase
            ? await getTierData(supabase, skin.contentTierUuid)
            : null;

          formattedSkins.push(formatSkinForApp(skin, tierData));
        }

        setCajaSkins(formattedSkins);
      }
    } catch (error) {
      console.error("Error al cargar las skins:", error);
    }
  };

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

  const formatTimeRemaining = (fechaActualizacion: string): string => {
    if (!fechaActualizacion) return "Desconocido";

    const updateDate = new Date(fechaActualizacion);
    const now = new Date();
    const diffMs = updateDate.getTime() - now.getTime();
    const diffSec = Math.floor(diffMs / 1000);

    if (diffSec <= 0) return "Disponible ahora";

    const hours = Math.floor(diffSec / 3600);
    const minutes = Math.floor((diffSec % 3600) / 60);
    const seconds = diffSec % 60;

    return `${hours}h ${minutes}m ${seconds}s`;
  };

  // Generar items para la ruleta
  const generateSpinItems = useMemo(() => {
    return (selectedSkin: Skin) => {
      if (!cajaSkins || cajaSkins.length === 0) return [];

      const baseItems: Skin[] = [];
      const randomItemsBefore = selectMultipleRandomSkinsForSpinner(cajaSkins, probabilidades, 80, 'before');
      const randomItemsAfter = selectMultipleRandomSkinsForSpinner(cajaSkins, probabilidades, 80, 'after');

      baseItems.push(...randomItemsBefore);
      baseItems.push({ ...selectedSkin, id: `winner-${selectedSkin.id}` });
      baseItems.push(...randomItemsAfter);

      return [...baseItems.slice(0, 10), ...baseItems, ...baseItems.slice(0, 10)];
    };
  }, [cajaSkins, probabilidades]);

  // Animar la ruleta
  const animateSpinner = (finalPosition: number) => {
    if (!spinnerRef.current) return;

    const duration = 12000;
    const spinnerElement = spinnerRef.current;

    spinnerElement.style.animation = 'none';
    spinnerElement.style.transform = 'translateX(0px)';
    spinnerElement.style.transition = 'none';
    
    void spinnerElement.offsetWidth;

    spinnerElement.style.transition = `transform ${duration}ms cubic-bezier(0.12, 0.99, 0.62, 1.01)`;
    spinnerElement.style.transform = `translateX(-${finalPosition}px)`;
  };

  // Abrir caja(s)
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
          // Apertura múltiple
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
            const spinItemsArray = openingResult.results.map(result => 
              generateSpinItems(result)
            );
            
            if (caja.precio > 0) {
              decrementarSaldoLocal(caja.precio * numberOfBoxes);
            }
            
            setMultipleResults(openingResult.results);
            setMultipleSpinItems(spinItemsArray);
            setCompletedSpinners(Array(numberOfBoxes).fill(false));
            setIsPreparingBox(false);
            setIsSpinning(true);
          } else {
            console.error("Error al abrir cajas múltiples:", openingResult.error);
            setIsOpening(false);
            setIsPreparingBox(false);
          }
        } else {
          // Apertura única
          const openingResult = await processSingleBoxOpeningOptimized(
            userId,
            caja.id,
            cajaSkins as any,
            probabilidades as any,
            supabase,
            caja.precio
          );

          if (openingResult.success && openingResult.selectedSkin) {
            if (caja.precio > 0) {
              decrementarSaldoLocal(caja.precio);
            }
            
            const items = generateSpinItems(openingResult.selectedSkin);
            setResultSkinForSpin(openingResult.selectedSkin);
            setSpinItems(items);
            setIsPreparingBox(false);
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

  // Manejar animación de la ruleta
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
      const itemWidth = ITEM_WIDTH_CAROUSEL;
      const offsetToCenterItemInViewport = (viewportWidth - itemWidth) / 2;
      const finalPosition = winningItemIndexInSpinItems * itemWidth - offsetToCenterItemInViewport;

      animateSpinner(finalPosition);

      const animationDuration = 12000;
      const postSpinDelay = 800;

      const timer = setTimeout(() => {
        handleSpinnerComplete();
      }, animationDuration + postSpinDelay);

      return () => {
        clearTimeout(timer);
        if (spinnerRef.current) {
          spinnerRef.current.style.transition = 'none';
        }
      };
    }
  }, [isSpinning, spinItems, resultSkinForSpin, caja]);

  const handleSpinnerComplete = (spinnerIndex?: number) => {
    if (isMultipleMode && numberOfBoxes > 1 && spinnerIndex !== undefined) {
      setCompletedSpinners(prev => {
        const newCompleted = [...prev];
        newCompleted[spinnerIndex] = true;
        
        const allCompleted = newCompleted.every((completed, idx) => idx >= numberOfBoxes || completed);
        
        if (allCompleted) {
          setTimeout(() => {
            setIsSpinning(false);
            setIsOpening(false);
            if (caja && caja.es_diaria) {
              setDailyOpened(true);
            }
          }, 800);
        }
        
        return newCompleted;
      });
    } else {
      setTimeout(() => {
        setResultSkin(resultSkinForSpin);
        setIsSpinning(false);
        setResultSkinForSpin(null);
        if (caja && caja.es_diaria) {
          setDailyOpened(true);
        }
        setIsOpening(false);
      }, 400);
    }
  };

  const resetResults = () => {
    setResultSkin(null);
    setMultipleResults([]);
    setMultipleSpinItems([]);
    setCompletedSpinners([]);
    setIsOpening(false);
    setIsPreparingBox(false);
  };

  // Actualizar número anterior de cajas después de animaciones
  useEffect(() => {
    const timer = setTimeout(() => {
      setPreviousNumberOfBoxes(numberOfBoxes);
    }, 500);

    return () => clearTimeout(timer);
  }, [numberOfBoxes]);

  // Forzar 1 caja en móvil
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 640) {
        if (numberOfBoxes > 1) {
          setNumberOfBoxes(1);
          setIsMultipleMode(false);
        }
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [numberOfBoxes]);

  // Separar última palabra del nombre para mejor formato
  const formatNameWithLastWordSeparate = (name: string) => {
    const words = name.trim().split(' ');
    if (words.length <= 1) return { firstPart: '', lastWord: name };
    
    const lastWord = words[words.length - 1];
    const firstPart = words.slice(0, -1).join(' ');
    
    return { firstPart, lastWord };
  };
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] w-full bg-gradient-to-b from-slate-900/60 to-black/60 rounded-xl shadow-inner p-10">
        <div className="relative animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary mb-4">
          <div className="absolute inset-0 rounded-full border border-slate-700 opacity-20"></div>
        </div>
      </div>
    );
  }


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

  // Estados de renderizado
  const showMultipleResults = multipleResults.length > 0 && !isSpinning && !isOpening && !isPreparingBox;
  const showSingleResult = !!resultSkin && !isSpinning && !isOpening && !isPreparingBox;
  const showSpinners = isSpinning;
  const showPreparingSpinner = isPreparingBox && !isSpinning;
  const showInitialView = !isSpinning && !showSingleResult && !showMultipleResults && !isOpening && !isPreparingBox;

  return (
    <div className="w-full flex flex-col items-center justify-center py-10">
      <div className="w-full h-[650px] flex items-center justify-center">
        <AnimatePresence mode="wait">
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
              <div className="flex justify-center items-center px-2 md:px-4 overflow-x-auto mb-8 w-full">
              <div className={`flex justify-center items-center ${
                numberOfBoxes === 1 ? 'gap-0' :
                numberOfBoxes === 2 ? 'gap-2 sm:gap-4 md:gap-8' :
                numberOfBoxes === 3 ? 'gap-1 sm:gap-3 md:gap-6' :
                numberOfBoxes === 4 ? 'gap-1 sm:gap-2 md:gap-4' :
                'gap-1 md:gap-3'
              } min-w-max`}>
                {multipleResults.map((result, index) => {
                  const getSizes = () => {
                    switch(numberOfBoxes) {
                      case 1: return { 
                        w: 'w-[280px] sm:w-[320px] md:w-[400px]', 
                        h: 'h-[450px] sm:h-[500px] md:h-[600px]', 
                        imgW: 'w-[220px] sm:w-[260px] md:w-[320px]', 
                        imgH: 'h-[220px] sm:h-[260px] md:h-[320px]' 
                      };
                      case 2: return { 
                        w: 'w-[160px] sm:w-[200px] md:w-[280px] lg:w-[340px]', 
                        h: 'h-[320px] sm:h-[380px] md:h-[450px] lg:h-[520px]', 
                        imgW: 'w-[120px] sm:w-[150px] md:w-[220px] lg:w-[270px]', 
                        imgH: 'h-[120px] sm:h-[150px] md:h-[220px] lg:h-[270px]' 
                      };
                      case 3: return { 
                        w: 'w-[110px] sm:w-[140px] md:w-[190px] lg:w-[240px] xl:w-[290px]', 
                        h: 'h-[280px] sm:h-[320px] md:h-[360px] lg:h-[400px] xl:h-[460px]', 
                        imgW: 'w-[80px] sm:w-[100px] md:w-[140px] lg:w-[180px] xl:w-[230px]', 
                        imgH: 'h-[80px] sm:h-[100px] md:h-[140px] lg:h-[180px] xl:h-[230px]' 
                      };
                      case 4: return { 
                        w: 'w-[85px] sm:w-[110px] md:w-[140px] lg:w-[170px] xl:w-[200px] 2xl:w-[240px]', 
                        h: 'h-[250px] sm:h-[280px] md:h-[320px] lg:h-[360px] xl:h-[390px] 2xl:h-[410px]', 
                        imgW: 'w-[60px] sm:w-[80px] md:w-[100px] lg:w-[120px] xl:w-[150px] 2xl:w-[190px]', 
                        imgH: 'h-[60px] sm:h-[80px] md:h-[100px] lg:h-[120px] xl:h-[150px] 2xl:h-[190px]' 
                      };
                      case 5: return { 
                        w: 'w-[70px] sm:w-[85px] md:w-[110px] lg:w-[140px] xl:w-[170px] 2xl:w-[200px]', 
                        h: 'h-[220px] sm:h-[250px] md:h-[280px] lg:h-[310px] xl:h-[340px] 2xl:h-[370px]', 
                        imgW: 'w-[50px] sm:w-[60px] md:w-[80px] lg:w-[100px] xl:w-[120px] 2xl:w-[150px]', 
                        imgH: 'h-[50px] sm:h-[60px] md:h-[80px] lg:h-[100px] xl:h-[120px] 2xl:h-[150px]' 
                      };
                      default: return { 
                        w: 'w-[280px] sm:w-[320px] md:w-[400px]', 
                        h: 'h-[450px] sm:h-[500px] md:h-[600px]', 
                        imgW: 'w-[220px] sm:w-[260px] md:w-[320px]', 
                        imgH: 'h-[220px] sm:h-[260px] md:h-[320px]' 
                      };
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
                      {result.isNewSkin && (
                        <motion.div
                          initial={{ scale: 1, opacity: 0, x: 0, y: 0 }}
                          animate={{ scale: 1, opacity: 1, x: 0, y: 0 }}
                          transition={{ delay: index * 0.1 + 1.2, duration: 0.4, type: "spring", stiffness: 300 }}
                          className="absolute top-1 right-1 sm:top-2 sm:right-2 z-20 px-1 py-0.5 sm:px-2 sm:py-1 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-bold 
                                     bg-gradient-to-r from-red-500/20 to-red-600/20 text-white-300 shadow-lg 
                                     shadow-red-900/20 border border-red-500/20 backdrop-blur-sm
                                     active:scale-95 transition-all duration-200"
                        >
                          ✨ NUEVA
                        </motion.div>
                      )}
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
                      
                      <div className="relative z-10 h-full flex flex-col items-center justify-center p-2 sm:p-4">
                        <motion.div 
                          className={`relative ${sizes.imgW} ${sizes.imgH} mb-2 sm:mb-4`}
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ delay: index * 0.1 + 0.5, duration: 0.4, ease: "easeOut" }}
                        >
                          {result.imagen_url && (
                            <Image
                              alt={result.nombre}
                              className="object-contain drop-shadow-lg p-1 sm:p-2 relative z-10 transform transition-transform duration-300"
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
                          className="text-center space-y-1 sm:space-y-3"
                          initial={{ y: 20, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          transition={{ delay: index * 0.1 + 0.7, duration: 0.4 }}
                        >
                          {(() => {
                            const { firstPart, lastWord } = formatNameWithLastWordSeparate(result.nombre);
                            return (
                              <h3 className={`font-bold text-white leading-tight px-1 sm:px-2 ${
                                numberOfBoxes >= 4 ? 'text-[10px] sm:text-xs md:text-sm' : 
                                numberOfBoxes === 3 ? 'text-xs sm:text-sm md:text-base' :
                                'text-sm md:text-lg'
                              }`}>
                                {firstPart && <span className="block">{firstPart}</span>}
                                <span className="block">{lastWord}</span>
                              </h3>
                            );
                          })()}
                          {result.content_tier && (
                            <div
                              className={`rounded-full font-bold shadow-2xl border-2 mx-auto inline-block ${
                                numberOfBoxes >= 4 ? 'px-1 py-0.5 text-[8px] sm:text-[10px] md:text-xs' :
                                numberOfBoxes === 3 ? 'px-2 py-1 text-[10px] sm:text-xs md:text-sm' :
                                'px-3 md:px-4 py-2 text-xs md:text-sm'
                              }`}
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
            

            <motion.div 
              className="text-center px-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: multipleResults.length * 0.1 + 1, duration: 0.5 }}
            >
              <Button
                onClick={resetResults}
                className="rounded-xl bg-gradient-to-r from-red-500/20 to-red-600/20 text-white shadow-lg shadow-red-900/20 border border-red-500/20 hover:bg-gradient-to-r hover:from-red-500/30 hover:to-red-600/30 active:scale-95 transition-all duration-200 px-6 sm:px-8 py-3 text-base sm:text-lg font-medium"
              >
                Abrir de nuevo
              </Button>
            </motion.div>
                      </div>
          </motion.div>
        )}

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
              <div className="w-full mb-8">
                <div className="flex justify-center items-center px-2 md:px-4 overflow-x-auto w-full">
                  <div className={`flex justify-center items-center ${
                    numberOfBoxes === 1 ? 'gap-0' :
                    numberOfBoxes === 2 ? 'gap-2 sm:gap-4 md:gap-8' :
                    numberOfBoxes === 3 ? 'gap-1 sm:gap-3 md:gap-6' :
                    numberOfBoxes === 4 ? 'gap-1 sm:gap-2 md:gap-4' :
                    'gap-1 md:gap-3'
                  } min-w-max`}>
                    {Array.from({ length: numberOfBoxes }).map((_, index) => {
                      const animationDuration = 12000 + (index * 1000);
                      const getSizes = () => {
                        switch(numberOfBoxes) {
                          case 1: return { 
                            w: 'w-[280px] sm:w-[320px] md:w-[400px]', 
                            h: 'h-[450px] sm:h-[500px] md:h-[600px]', 
                            itemSize: 180 
                          };
                          case 2: return { 
                            w: 'w-[160px] sm:w-[200px] md:w-[280px] lg:w-[340px]', 
                            h: 'h-[320px] sm:h-[380px] md:h-[450px] lg:h-[520px]', 
                            itemSize: 130 
                          };
                          case 3: return { 
                            w: 'w-[110px] sm:w-[140px] md:w-[190px] lg:w-[240px] xl:w-[290px]', 
                            h: 'h-[280px] sm:h-[320px] md:h-[360px] lg:h-[400px] xl:h-[460px]', 
                            itemSize: 100 
                          };
                          case 4: return { 
                            w: 'w-[85px] sm:w-[110px] md:w-[140px] lg:w-[170px] xl:w-[200px] 2xl:w-[240px]', 
                            h: 'h-[250px] sm:h-[280px] md:h-[320px] lg:h-[360px] xl:h-[390px] 2xl:h-[410px]', 
                            itemSize: 80 
                          };
                          case 5: return { 
                            w: 'w-[70px] sm:w-[85px] md:w-[110px] lg:w-[140px] xl:w-[170px] 2xl:w-[200px]', 
                            h: 'h-[220px] sm:h-[250px] md:h-[280px] lg:h-[310px] xl:h-[340px] 2xl:h-[370px]', 
                            itemSize: 65
                          };
                          default: return { 
                            w: 'w-[280px] sm:w-[320px] md:w-[400px]', 
                            h: 'h-[450px] sm:h-[500px] md:h-[600px]', 
                            itemSize: 180 
                          };
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
                            <div className={`${sizes.w} ${sizes.h} rounded-xl bg-slate-800/30 border border-slate-700/30 flex items-center justify-center opacity-50 backdrop-blur-sm shadow-xl`}>
                              <div className="text-white/60 text-center">
                                <div className={`border-2 border-white/20 rounded-xl mx-auto flex items-center justify-center bg-slate-700/20 ${
                                  numberOfBoxes >= 4 ? 'w-8 h-8 mb-2' : 'w-12 h-12 mb-4'
                                }`}>
                                  <span className={numberOfBoxes >= 4 ? 'text-lg' : 'text-2xl md:text-4xl'}>📦</span>
                      </div>
                                <p className={`font-medium ${
                                  numberOfBoxes >= 4 ? 'text-[10px] sm:text-xs' : 
                                  numberOfBoxes === 3 ? 'text-xs sm:text-sm' : 
                                  'text-sm md:text-base'
                                }`}>Preparando...</p>
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
              <div className="w-full mx-auto px-2 sm:px-4">
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

        {showPreparingSpinner && (
          <motion.div 
            key="preparing-spinner"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="w-full h-full flex items-center justify-center"
          >
            <div className="flex flex-col items-center justify-center space-y-4 sm:space-y-6 px-4">
              <div className="relative">
                <div className="animate-spin rounded-full h-12 w-12 sm:h-16 sm:w-16 border-t-3 border-b-3 border-primary">
                  <div className="absolute inset-0 rounded-full border border-slate-700 opacity-20"></div>
                        </div>
                <div className="absolute inset-2 rounded-full bg-primary/20 animate-pulse"></div>
                      </div>
                      
              <div className="text-center space-y-2">
                <h3 className="text-base sm:text-lg font-semibold text-white">
                  {isMultipleMode && numberOfBoxes > 1 
                    ? `Procesando ${numberOfBoxes} cajas...` 
                    : 'Preparando caja...'}
                </h3>
                <p className="text-xs sm:text-sm text-white/60">
                  {isMultipleMode && numberOfBoxes > 1 
                    ? 'Esto puede tomar unos segundos' 
                    : 'Seleccionando tu premio'}
                </p>
                    </div>

              {isMultipleMode && numberOfBoxes > 1 && (
                <div className="w-48 sm:w-64 bg-slate-800/50 rounded-full h-2 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-1000 ease-out animate-pulse"
                    style={{ width: '60%' }}
                  />
                </div>
              )}
                </div>
          </motion.div>
        )}

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
            <div className="flex flex-col items-center w-full max-w-7xl mx-auto px-4">
              {caja && (
                <div className="w-full text-center relative z-0">
                  <div className="absolute -z-10 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] sm:w-[800px] h-[400px] sm:h-[600px] rounded-full opacity-15 blur-3xl bg-gradient-radial from-primary/40 to-transparent"></div>
                  <div className="absolute -z-10 left-1/3 top-1/3 -translate-x-1/2 -translate-y-1/2 w-[300px] sm:w-[400px] h-[300px] sm:h-[400px] rounded-full opacity-10 blur-2xl bg-gradient-radial from-amber-300/30 to-transparent"></div>
                  
                  <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold font-[Raleway] font-bold italic tracking-widest uppercase mb-8 sm:mb-12 
                                 [text-shadow:_0px_0px_20px_rgba(255,255,255,0.1)] bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                    · {caja.nombre} ·
                  </h1>


                  <div className="flex justify-center items-center gap-1 sm:gap-2 md:gap-6 mb-6 sm:mb-8 px-2 md:px-4 overflow-x-auto">
                    <div className="flex gap-0 min-w-max">
                      <AnimatePresence mode="popLayout">
                        {Array.from({ length: numberOfBoxes }).map((_, index) => {
                          const isNewBox = index >= previousNumberOfBoxes;
                          const getInitialBoxSizes = () => {
                            switch(numberOfBoxes) {
                              case 1: return { w: 280, h: 280 };
                              case 2: return { w: 220, h: 220 };
                              case 3: return { w: 180, h: 180 };
                              case 4: return { w: 150, h: 150 };
                              case 5: return { w: 120, h: 120 };
                              default: return { w: 280, h: 280 };
                            }
                          };
                          const { w: boxWidth, h: boxHeight } = getInitialBoxSizes();
                          
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
                                      height={boxHeight}
                                      width={boxWidth}
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


                  <div className="mb-6 sm:mb-8 flex flex-col items-center gap-4">
                    <div className="hidden sm:flex items-center gap-0 border-2 rounded-2xl border-primary/20">
                      {[1, 2, 3, 4, 5].map((num) => (
                        <button
                          key={num}
                          onClick={() => {
                            setNumberOfBoxes(num);
                            setIsMultipleMode(num > 1);
                          }}
                          className={`relative w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 transition-all duration-300 font-bold text-xs sm:text-sm md:text-base ${
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


                  <div className="flex justify-center px-4">
                <Button
                      className={`px-6 sm:px-8 md:px-12 py-3 sm:py-4 md:py-5 text-base sm:text-lg md:text-xl font-medium rounded-2xl bg-gradient-to-r from-red-500/20 to-red-600/20
                                  text-white hover:bg-gradient-to-r hover:from-red-500/30 hover:to-red-600/30
                                  active:scale-95 transition-all duration-300 min-w-[180px] sm:min-w-[200px] md:min-w-[280px] shadow-2xl shadow-red-900/20
                                  border-2 border-red-500/20 hover:border-red-500/60
                                  ${(!isOpening && !isSpinning && !isPreparingBox && (!caja.es_diaria || !dailyOpened) && caja.esta_disponible) 
                                    ? 'hover:shadow-primary/50 hover:-translate-y-1' 
                                    : 'opacity-60 cursor-not-allowed'}`}
                      disabled={isOpening || isSpinning || isPreparingBox || (caja.es_diaria && dailyOpened) || !caja.esta_disponible}
                  onClick={openBox}
                >
                      {isOpening || isSpinning || isPreparingBox ? (
                        <span className="flex items-center justify-center gap-3">
                          <span className="animate-spin h-4 w-4 sm:h-5 sm:w-5 border-2 border-white/30 border-t-white rounded-full"></span>
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

    
                  {caja.es_diaria && nextUpdate && (
                    <div className="mt-6 sm:mt-8 text-white/90 bg-gradient-to-r from-slate-800/70 to-slate-900/70 border border-slate-700/70 rounded-xl py-3 px-4 sm:px-6 shadow-lg inline-block backdrop-blur-sm">
                      <p className="flex items-center gap-2 font-medium text-sm sm:text-base">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-primary flex-shrink-0">
                          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/>
                          <path d="M12 6v6l4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                        <span className="text-xs sm:text-sm opacity-80">Próxima actualización:</span>
                        <span className="text-primary font-bold text-xs sm:text-sm">{nextUpdate}</span>
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