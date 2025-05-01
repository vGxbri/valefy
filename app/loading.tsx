'use client';

import React, { useEffect, useState } from 'react';

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
      setIsVisible(true);
      setIsExiting(false);
      
      // Garantizar un tiempo mínimo de visualización
      minLoadingTimer = setTimeout(() => {
        handleExit();
      }, 2000); // Tiempo mínimo de visualización
    };

    const handleExit = () => {
      setIsExiting(true);
      exitTimer = setTimeout(() => {
        setIsVisible(false);
        if (onTransitionComplete) {
          onTransitionComplete();
        }
      }, 1500); // Duración de la transición de salida
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
            transition-all duration-1500 ease-in-out
            ${isExiting ? 'opacity-0 scale-95 transform translate-y-4' : 'opacity-100 scale-100 transform translate-y-0'}
          `}
        >
          <div className={`text-center transition-all duration-1500 ease-in-out ${isExiting ? 'opacity-0 transform -translate-y-4' : 'opacity-100 transform translate-y-0'}`}>
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-white mx-auto mb-4"></div>
            <h2 className="text-2xl font-semibold text-white mb-2 animate-fade-in">Cargando Valefy</h2>
            <p className="text-white/80 animate-fade-in-delayed">Preparando tu experiencia personalizada...</p>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .animate-fade-in {
          animation: fadeIn 1s ease-out forwards;
        }

        .animate-fade-in-delayed {
          animation: fadeIn 1s ease-out 0.5s forwards;
          opacity: 0;
        }
      `}</style>
    </>
  );
}