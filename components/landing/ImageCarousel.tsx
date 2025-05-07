"use client";

import { useRef, useEffect } from "react";
import Image from "next/image";

interface ImageCarouselProps {
  images: string[];
  speed?: number;
  direction?: "left" | "right";
}

// Definimos las keyframes como estilos globales en un archivo CSS separado
// y los importamos en el componente
export function ImageCarousel({
  images,
  speed = 30, // segundos que tarda en completar un ciclo
  direction = "left", // dirección por defecto
}: ImageCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Duplicamos las imágenes para crear un efecto infinito
  const duplicatedImages = [...images, ...images];

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
        className="absolute left-0 top-0 bottom-0 w-24 z-10 pointer-events-none"
        style={{
          background: "linear-gradient(to right, #0A141D 0%, transparent 100%)",
        }}
      />
      <div
        className="absolute right-0 top-0 bottom-0 w-24 z-10 pointer-events-none"
        style={{
          background: "linear-gradient(to left, #0A141D 0%, transparent 100%)",
        }}
      />

      <div
        ref={scrollRef}
        className="flex gap-4 py-2"
        style={{
          animation: `${direction === "left" ? "scrollLeft" : "scrollRight"} ${speed}s linear infinite`,
          width: "fit-content",
        }}
      >
        {duplicatedImages.map((img, index) => (
          <div
            key={index}
            className="relative w-64 h-40 flex-shrink-0 rounded-lg overflow-hidden transform transition-all duration-300"
          >
            <div className="absolute inset-0 flex items-center justify-center w-full h-full">
              <Image
                fill
                alt={`Slide ${(index % images.length) + 1}`}
                className="object-contain transform-gpu p-1 scale-90"
                priority={index < images.length}
                sizes="256px"
                src={img}
                style={{
                  filter: "drop-shadow(0 0 8px rgba(255, 255, 255, 0.2))",
                }}
                unoptimized={img.startsWith("http")}
              />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 transition-opacity duration-300" />
          </div>
        ))}
      </div>
    </div>
  );
}
