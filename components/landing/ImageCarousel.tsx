"use client";

import { useRef, useEffect } from "react";
import Image from "next/image";
import { getWeaponType } from "@/lib/valorantApi";
import { getWeaponSpecificStyles } from "@/lib/valorantApi";

interface SkinWithTier {
  skinIcon: string;
  skinName: string;
  contentTier: {
    id: string;
    nombre: string;
    color: string;
  };
}

interface ImageCarouselProps {
  images?: string[]; // Para compatibilidad hacia atrás
  skins?: SkinWithTier[]; // Nueva prop para skins con tier
  speed?: number;
  direction?: "left" | "right";
}

// Definimos las keyframes como estilos globales en un archivo CSS separado
// y los importamos en el componente
export function ImageCarousel({
  images = [],
  skins = [],
  speed = 30, // segundos que tarda en completar un ciclo
  direction = "left", // dirección por defecto
}: ImageCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Usar skins si está disponible, sino usar images para compatibilidad
  const itemsToShow = skins.length > 0 ? skins : images.map(img => ({ skinIcon: img, skinName: '', contentTier: { id: 'default', nombre: 'Standard', color: '#FFFFFF' } }));
  
  // Duplicamos los elementos para crear un efecto infinito
  const duplicatedItems = [...itemsToShow, ...itemsToShow];

  useEffect(() => {
    const scrollContainer = scrollRef.current;

    if (!scrollContainer) return;

    // Calculamos la velocidad basada en el ancho total
    const duration = speed; // segundos para completar un ciclo

    // Aplicamos la animación con CSS
    scrollContainer.style.animationDuration = `${duration}s`;

    // Definimos las keyframes dinámicamente
    const styleSheet = document.createElement("style");

    styleSheet.textContent = `
      @keyframes scrollLeft {
        0% { transform: translateX(0); }
        100% { transform: translateX(-50%); }
      }
      @keyframes scrollRight {
        0% { transform: translateX(-50%); }
        100% { transform: translateX(0); }
      }
    `;
    document.head.appendChild(styleSheet);

    // Reiniciamos la posición cuando termina la animación
    const handleAnimationEnd = () => {
      scrollContainer.style.animation = "none";
      scrollContainer.offsetHeight; // Trigger reflow
      const animationName = direction === "left" ? "scrollLeft" : "scrollRight";

      scrollContainer.style.animation = `${animationName} ${duration}s linear infinite`;
    };

    scrollContainer.addEventListener("animationend", handleAnimationEnd);

    return () => {
      scrollContainer.removeEventListener("animationend", handleAnimationEnd);
      document.head.removeChild(styleSheet);
    };
  }, [speed, direction]);

  return (
    <div className="w-full overflow-hidden relative">
      <div
        className="absolute left-0 top-0 bottom-0 w-16 sm:w-20 md:w-24 z-10 pointer-events-none"
        style={{
          background: "linear-gradient(to right, #0A141D 0%, transparent 100%)",
        }}
      />
      <div
        className="absolute right-0 top-0 bottom-0 w-16 sm:w-20 md:w-24 z-10 pointer-events-none"
        style={{
          background: "linear-gradient(to left, #0A141D 0%, transparent 100%)",
        }}
      />

      <div
        ref={scrollRef}
        className="flex gap-0 py-0"
        style={{
          animation: `${direction === "left" ? "scrollLeft" : "scrollRight"} ${speed}s linear infinite`,
          width: "fit-content",
        }}
      >
        {duplicatedItems.map((item, index) => {
          // Calcular el gradiente de fondo basado en el tier
          // Determinar el tipo de arma y obtener los estilos específicos
          const weaponType = getWeaponType(item.skinName);
          const weaponStyles = getWeaponSpecificStyles(weaponType);

          // Crear el estilo inline para las transformaciones
          const imageTransformStyle: React.CSSProperties = {
            transform: `scale(${weaponStyles.baseScale})${weaponStyles.hasRotation ? ' rotate(12deg)' : ''}`,
          };

          return (
            <div
              key={index}
              className="relative w-48 h-32 sm:w-56 sm:h-36 md:w-64 md:h-40 flex-shrink-0 rounded-lg overflow-hidden transform transition-all duration-300"
            >
              {/* Imagen de fondo del tier */}
              {item.contentTier.id && item.contentTier.id !== 'default' && (
                <Image
                  src={`/skins-bg/${item.contentTier.id}.png`}
                  alt={`Fondo para ${item.contentTier.nombre}`}
                  fill
                  className="absolute inset-0 z-0 p-3 sm:p-4 opacity-60 transform scale-150 rotate-12 object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              )}
              
              {/* Imagen principal de la skin */}
              <div className="absolute inset-0 flex items-center justify-center w-full h-full z-10">
                <Image
                  fill
                  alt={`Slide ${(index % itemsToShow.length) + 1}`}
                  className="object-contain p-3 sm:p-4 group-hover:scale-105 transition-transform duration-300 z-10"
                  priority={index < itemsToShow.length}
                  sizes="(max-width: 640px) 192px, (max-width: 768px) 224px, 256px"
                  src={item.skinIcon}
                  style={{
                    filter: "drop-shadow(0 0 8px rgba(255, 255, 255, 0.2))",
                    ...imageTransformStyle
                  }}
                  unoptimized={item.skinIcon.startsWith("http")}
                />
              </div>
              
              {/* Gradiente de superposición */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 transition-opacity duration-300 z-20" />
            </div>
          );
        })}
      </div>
    </div>
  );
}
