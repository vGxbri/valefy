"use client";

import { useRef, useEffect } from "react";
import Image from "next/image";
import { Skin } from "@/lib/boxUtils";
import { getWeaponType, getWeaponSpecificStyles } from "@/lib/valorantApi";

interface SpinnerAnimationProps {
  isSpinning: boolean;
  spinItems: Skin[];
  onAnimationComplete: () => void;
  orientation?: "horizontal" | "vertical";
  animationDuration?: number;
  itemSize?: number;
  customContainerClass?: string;
}

const ITEM_WIDTH_CAROUSEL = 260;
const ITEM_HEIGHT_CAROUSEL = 160;

export default function SpinnerAnimation({
  isSpinning,
  spinItems,
  onAnimationComplete,
  orientation = "horizontal",
  animationDuration = 12000, // 12000 por defecto
  itemSize = 240,
  customContainerClass,
}: SpinnerAnimationProps) {
  const spinnerRef = useRef<HTMLDivElement>(null);
  const animationStartedRef = useRef(false); // Evitar que se reinicie la animación
  const onAnimationCompleteRef = useRef(onAnimationComplete); // Almacenar la función callback
  const timerRef = useRef<NodeJS.Timeout | null>(null); // Almacenar el timer

  // Actualizar la referencia de la función callback cuando cambie
  useEffect(() => {
    onAnimationCompleteRef.current = onAnimationComplete;
  }, [onAnimationComplete]);

  // Resetear animationStarted al montar el componente
  useEffect(() => {
    animationStartedRef.current = false;
  }, []); // Solo al montar

  // Función para animar la ruleta con un efecto de frenado más realista
  const animateSpinner = (finalPosition: number) => {
    if (!spinnerRef.current) return;

    const spinnerElement = spinnerRef.current;

    // Reset any existing animations and transitions
    spinnerElement.style.animation = 'none';
    if (orientation === "horizontal") {
      spinnerElement.style.transform = 'translateX(0px)';
    } else {
      spinnerElement.style.transform = 'translateY(0px)';
    }
    spinnerElement.style.transition = 'none';
    
    // Force reflow to apply the reset styles immediately
    void spinnerElement.offsetWidth;

    // Set up the transition with a cubic-bezier for a very long fast spin and quick stop
    spinnerElement.style.transition = `transform ${animationDuration}ms cubic-bezier(0.12, 0.99, 0.62, 1)`;
    
    // Apply the final transform that will be animated
    if (orientation === "horizontal") {
      spinnerElement.style.transform = `translateX(-${finalPosition}px)`;
    } else {
      spinnerElement.style.transform = `translateY(-${finalPosition}px)`;
    }
  };

  // useEffect for handling the animation logic
  useEffect(() => {    
    // Solo proceder si debe girar, no ha comenzado, y tiene items
    if (isSpinning && !animationStartedRef.current && spinItems.length > 0) {
      // Verificar que el elemento DOM esté disponible
      if (!spinnerRef.current || !spinnerRef.current.parentElement) {
        return;
      }

      animationStartedRef.current = true; // Marcar inmediatamente que ha comenzado
      
      const viewportElement = spinnerRef.current.parentElement;
      const winningItemIndexInSpinItems = Math.floor(spinItems.length / 2);
      
      let itemDimension, viewportDimension, offsetToCenter, finalPosition;
      
      if (orientation === "horizontal") {
        itemDimension = ITEM_WIDTH_CAROUSEL;
        viewportDimension = viewportElement.offsetWidth;
        offsetToCenter = (viewportDimension - itemDimension) / 2;
        finalPosition = winningItemIndexInSpinItems * itemDimension - offsetToCenter;
      } else {
        itemDimension = ITEM_HEIGHT_CAROUSEL;
        viewportDimension = viewportElement.offsetHeight;
        offsetToCenter = (viewportDimension - itemDimension) / 2;
        finalPosition = winningItemIndexInSpinItems * itemDimension - offsetToCenter;
      }

      // Call the animateSpinner function
      animateSpinner(finalPosition);

      const postSpinDelay = 1000;

      const timer = setTimeout(() => {
        onAnimationCompleteRef.current();
        animationStartedRef.current = false; // Resetear para futuras animaciones
        timerRef.current = null; // Limpiar la referencia del timer
      }, animationDuration + postSpinDelay);

      timerRef.current = timer; // Almacenar la referencia del timer

      // NO retornar función de cleanup aquí para evitar cancelaciones prematuras
      // La limpieza se hará solo cuando el componente se desmonte o isSpinning cambie a false
    }
    
    // Solo resetear si isSpinning se vuelve false
    if (!isSpinning && animationStartedRef.current) {
      animationStartedRef.current = false;
      // Limpiar timer si existe
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [isSpinning]); // Solo depender de isSpinning

  // useEffect adicional para detectar cuando los spinItems están listos
  useEffect(() => {
    
    // Si debe girar, no ha comenzado, y ahora tiene items, intentar iniciar
    if (isSpinning && !animationStartedRef.current && spinItems.length > 0) {
      // Verificar que el elemento DOM esté disponible
      if (!spinnerRef.current || !spinnerRef.current.parentElement) {
        return;
      }

      animationStartedRef.current = true;
      
      const viewportElement = spinnerRef.current.parentElement;
      const winningItemIndexInSpinItems = Math.floor(spinItems.length / 2);
      
      let itemDimension, viewportDimension, offsetToCenter, finalPosition;
      
      if (orientation === "horizontal") {
        itemDimension = ITEM_WIDTH_CAROUSEL;
        viewportDimension = viewportElement.offsetWidth;
        offsetToCenter = (viewportDimension - itemDimension) / 2;
        finalPosition = winningItemIndexInSpinItems * itemDimension - offsetToCenter;
      } else {
        itemDimension = ITEM_HEIGHT_CAROUSEL;
        viewportDimension = viewportElement.offsetHeight;
        offsetToCenter = (viewportDimension - itemDimension) / 2;
        finalPosition = winningItemIndexInSpinItems * itemDimension - offsetToCenter;
      }

      animateSpinner(finalPosition);

      const postSpinDelay = 1000;
      const timer = setTimeout(() => {
        onAnimationCompleteRef.current();
        animationStartedRef.current = false;
        timerRef.current = null;
      }, animationDuration + postSpinDelay);

      timerRef.current = timer;
    }
  }, [spinItems.length, isSpinning, orientation, animationDuration]);

  // useEffect separado para cleanup cuando el componente se desmonte
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (spinnerRef.current) {
        spinnerRef.current.style.transition = 'none';
      }
      // Resetear animationStarted para el próximo montaje
      animationStartedRef.current = false;
    };
  }, []); // Solo ejecutar al montar/desmontar

  const defaultContainerClass = orientation === "horizontal" 
    ? "mx-auto overflow-hidden relative rounded-lg shadow-2xl backdrop-blur-lg bg-gradient-to-r from-transparent via-black/50 to-transparent w-full"
    : "mx-auto overflow-hidden relative rounded-lg shadow-2xl backdrop-blur-lg bg-gradient-to-b from-transparent via-black/50 to-transparent w-full";

  const containerClass = customContainerClass 
    ? `${customContainerClass} overflow-hidden relative rounded-xl shadow-lg`
    : defaultContainerClass;

  const spinnerClass = orientation === "horizontal" 
    ? "flex items-center" 
    : "flex flex-col items-center";

  const containerStyle = customContainerClass
    ? {} // No aplicar estilos predeterminados si hay clase personalizada
    : orientation === "horizontal" 
      ? { height: "280px" }
      : { width: "200px", height: "400px" };

  const spinnerStyle = orientation === "horizontal"
    ? {
        width: `${spinItems.length * ITEM_WIDTH_CAROUSEL}px`,
        height: "100%",
      }
    : {
        height: `${spinItems.length * ITEM_HEIGHT_CAROUSEL}px`,
        width: "100%",
      };

  const itemStyle = orientation === "horizontal"
    ? { width: `${ITEM_WIDTH_CAROUSEL}px` }
    : { height: `${ITEM_HEIGHT_CAROUSEL}px`, width: "100%" };

  return (
    <div className="text-center mb-8 relative max-w-6xl mx-auto">
      <div className={orientation === "horizontal" ? "w-full py-6 relative" : "w-full relative flex justify-center h-full"}>
        <div
          className={containerClass}
          style={containerStyle}
        >
          {/* Efecto de resplandor en los bordes */}
          <div className="absolute inset-0 pointer-events-none">
            {orientation === "horizontal" ? (
              <>
                <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-primary/80 to-transparent"></div>
                <div className="absolute bottom-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-primary/80 to-transparent"></div>
              </>
            ) : (
              <>
                <div className="absolute left-0 top-0 h-full w-[2px] bg-gradient-to-b from-transparent via-primary/80 to-transparent"></div>
                <div className="absolute right-0 top-0 h-full w-[2px] bg-gradient-to-b from-transparent via-primary/80 to-transparent"></div>
              </>
            )}
          </div>
          
          <div
            ref={spinnerRef}
            className={spinnerClass}
            style={spinnerStyle}
          >
            {spinItems.map((skin, index) => {
              // Determinar el tipo de arma y obtener los estilos específicos
              const weaponType = getWeaponType(skin.nombre);
              const weaponStyles = getWeaponSpecificStyles(weaponType);

              // Ajustar el escalado basado en la orientación - aumentado para imágenes más grandes
              const baseScale = orientation === "vertical" ? weaponStyles.baseScale * 1.0 : weaponStyles.baseScale;
              const imageTransformStyle: React.CSSProperties = {
                transform: `scale(${baseScale})${weaponStyles.hasRotation ? ' rotate(12deg)' : ''}`,
              };

              // Ajustar el tamaño del item basado en la orientación
              const adjustedItemSize = orientation === "vertical" ? Math.min(itemSize, 130) : itemSize;

              return (
                <div
                  key={`${skin.id}-${index}`}
                  className="p-2 flex-shrink-0 flex flex-col justify-center items-center text-center transition-all"
                  style={itemStyle}
                >
                  <div 
                    className={`relative rounded-xl overflow-hidden flex items-center justify-center group`}
                    style={{ 
                      width: orientation === "vertical" ? "190px" : `${adjustedItemSize}px`, 
                      height: orientation === "vertical" ? "120px" : `${adjustedItemSize}px` 
                    }}
                  >
                    {skin.content_tier?.uuid_api && skin.content_tier.uuid_api !== 'default' && (
                      <Image
                        src={`/skins-bg/${skin.content_tier.uuid_api}.png`}
                        alt={`Fondo para ${skin.content_tier.nombre}`}
                        layout="fill"
                        objectFit="contain" // O "cover" si prefieres que llene y recorte
                        className="absolute inset-0 z-0 p-4 opacity-60 transform"
                        style={{
                          scale: orientation === "vertical" ? "2.1" : "1.3",
                        }}
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        priority={index < 10}
                      />
                    )}
                    {skin.imagen_url && (
                      <Image
                        alt={skin.nombre}
                        className="object-contain drop-shadow-lg p-2 relative z-10 transform transition-transform duration-300"
                        style={imageTransformStyle}
                        height={orientation === "vertical" ? 300 : adjustedItemSize - 20}
                        src={skin.imagen_url}
                        width={orientation === "vertical" ? 300 : adjustedItemSize - 20}
                        priority={index < 10}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Marcador central */}
          <div className={`absolute pointer-events-none z-10 flex items-center justify-center ${
            orientation === "horizontal" 
              ? "top-0 left-1/2 h-full transform -translate-x-1/2" 
              : "left-0 top-1/2 w-full transform -translate-y-1/2"
          }`}>
            <div className={`bg-gradient-to-b from-transparent via-primary to-transparent opacity-75 ${
              orientation === "horizontal" ? "w-[3px] h-full" : "h-[3px] w-full"
            }`}></div>
          </div>
        </div>
      </div>
    </div>
  );
}