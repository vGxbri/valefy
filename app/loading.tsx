'use client';

import React, { useEffect, useState } from 'react';
import "@/styles/loading.css";

interface LoadingProps {
  children?: React.ReactNode;
  onTransitionComplete?: () => void;
}

export default function Loading({ children, onTransitionComplete }: LoadingProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    let minLoadingTimer: NodeJS.Timeout;
    let exitTimer: NodeJS.Timeout;

    const startLoading = () => {
      setIsExiting(false);
      // Garantizar un tiempo mínimo de visualización
      minLoadingTimer = setTimeout(() => {
        handleExit();
      }, 3000); // 3 segundos de loading
    };

    const handleExit = () => {
      setIsExiting(true);
      exitTimer = setTimeout(() => {
        if (onTransitionComplete) {
          onTransitionComplete();
        }
      }, 2000); // 2 segundos de animación de salida
    };

    startLoading();

    return () => {
      clearTimeout(minLoadingTimer);
      clearTimeout(exitTimer);
    };
  }, [onTransitionComplete]);


  return (
    <>
      {children || (
        <div 
          className={`
            fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br 
            from-primary/90 via-primary/60 to-secondary/80 backdrop-blur-sm
            transition-all duration-2000 ease-in-out
            ${isExiting ? 'opacity-0 scale-95 transform translate-y-4' : 'opacity-100 scale-100 transform translate-y-0'}
          `}
        >
          <div className={`text-center transition-all duration-2000 ease-in-out ${isExiting ? 'opacity-0 transform -translate-y-4' : 'opacity-100 transform translate-y-0'}`}>
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-white mx-auto mb-4"></div>
            <h2 className="text-2xl font-semibold text-white mb-2 animate-fade-in">Cargando Valefy</h2>
            <p className="text-white/80 animate-fade-in-delayed">Preparando tu experiencia personalizada...</p>
          </div>
        </div>
      )}
    </>
  );
}
