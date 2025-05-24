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
}

const ITEM_WIDTH_CAROUSEL = 260;
const ITEM_HEIGHT_CAROUSEL = 180;

export default function SpinnerAnimation({
  isSpinning,
  spinItems,
  onAnimationComplete,
  orientation = "horizontal",
  animationDuration = 100000000000, // 12000 por defecto
  itemSize = 240,
}: SpinnerAnimationProps) {
  const spinnerRef = useRef<HTMLDivElement>(null);

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
    spinnerElement.style.transition = `transform ${animationDuration}ms cubic-bezier(0.12, 0.99, 0.62, 1.01)`;
    
    // Apply the final transform that will be animated
    if (orientation === "horizontal") {
      spinnerElement.style.transform = `translateX(-${finalPosition}px)`;
    } else {
      spinnerElement.style.transform = `translateY(-${finalPosition}px)`;
    }
  };

  // useEffect for handling the animation logic
  useEffect(() => {
    if (
      isSpinning &&
      spinItems.length > 0 &&
      spinnerRef.current &&
      spinnerRef.current.parentElement
    ) {
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
        onAnimationComplete();
      }, animationDuration + postSpinDelay);

      return () => {
        clearTimeout(timer);
        // Clean up the transition if the component unmounts or effect re-runs mid-animation
        if (spinnerRef.current) {
          spinnerRef.current.style.transition = 'none';
        }
      };
    }
  }, [isSpinning, spinItems, orientation, animationDuration, onAnimationComplete]);

  const containerClass = orientation === "horizontal" 
    ? "mx-auto overflow-hidden relative rounded-lg shadow-2xl backdrop-blur-lg bg-gradient-to-r from-transparent via-black/50 to-transparent w-full"
    : "mx-auto overflow-hidden relative rounded-lg shadow-2xl backdrop-blur-lg bg-gradient-to-b from-transparent via-black/50 to-transparent w-full";

  const spinnerClass = orientation === "horizontal" 
    ? "flex items-center" 
    : "flex flex-col items-center";

  const containerStyle = orientation === "horizontal" 
    ? { height: "240px" }
    : { width: "240px", height: "300px" };

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
    : { height: `${ITEM_HEIGHT_CAROUSEL}px` };
  return (
    <div className="w-full text-center mb-8 relative">
      <div className={orientation === "horizontal" ? "w-full py-6 relative" : "w-full py-4 relative flex justify-center"}>
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

              // Crear el estilo inline para las transformaciones
              const imageTransformStyle: React.CSSProperties = {
                transform: `scale(${weaponStyles.baseScale})${weaponStyles.hasRotation ? ' rotate(12deg)' : ''}`,
              };

              return (
                <div
                  key={`${skin.id}-${index}`}
                  className="p-2 flex-shrink-0 flex flex-col justify-center items-center text-center transition-all"
                  style={itemStyle}
                >
                  <div 
                    className={`relative rounded-xl overflow-hidden flex items-center justify-center group`}
                    style={{ width: `${itemSize}px`, height: `${itemSize}px` }}
                  >
                    {skin.content_tier?.uuid_api && skin.content_tier.uuid_api !== 'default' && (
                      <Image
                        src={`/skins-bg/${skin.content_tier.uuid_api}.png`}
                        alt=""
                        fill
                        className="absolute inset-0 z-0 p-1 opacity-30 transform scale-110 rotate-12 object-contain"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        priority={index < 10}
                      />
                    )}
                    {skin.imagen_url && (
                      <Image
                        alt={skin.nombre}
                        className="object-contain drop-shadow-lg p-1 relative z-10 transform transition-transform duration-300"
                        style={imageTransformStyle}
                        height={itemSize - 20}
                        src={skin.imagen_url}
                        width={itemSize - 20}
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