"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface CircularRouletteProps {
  successPercentage: number;
  isSpinning: boolean;
  onSpinComplete: (success: boolean) => void;
  children?: React.ReactNode;
}

export default function CircularRoulette({
  successPercentage,
  isSpinning,
  onSpinComplete,
  children
}: CircularRouletteProps) {
  const [currentRotation, setCurrentRotation] = useState(0);
  const [finalRotation, setFinalRotation] = useState(0);
  const [hasResult, setHasResult] = useState(false);
  const [isAnimationComplete, setIsAnimationComplete] = useState(false);
  const rouletteRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isSpinning && !hasResult) {
      // Generar rotación aleatoria (múltiples vueltas + posición final)
      const baseRotations = 1800 + Math.random() * 1800; // Entre 5 y 10 vueltas completas
      
      // Generar un ángulo final COMPLETAMENTE ALEATORIO (sin considerar probabilidad)
      const finalAngle = Math.random() * 360;
      
      const totalRotation = baseRotations + finalAngle;
      setFinalRotation(totalRotation);
      setHasResult(true);
      setIsAnimationComplete(false);
      
      // Esperar a que termine la animación (6 segundos) + 3 segundos adicionales de pausa
      setTimeout(() => {
        setIsAnimationComplete(true);
        
        // Calcular el resultado basándose SOLO en donde cayó visualmente
        const normalizedRotation = (totalRotation % 360);
        const successAngle = (successPercentage / 100) * 360;
        
        // El área de éxito va de 0 a successAngle (desde la parte superior en sentido horario)
        const visualResult = normalizedRotation <= successAngle;
        
        console.log('🎯 Debug:', {
          totalRotation: totalRotation.toFixed(2),
          normalizedRotation: normalizedRotation.toFixed(2),
          successAngle: successAngle.toFixed(2),
          inGreenArea: normalizedRotation <= successAngle,
          result: visualResult ? 'VERDE (Gana)' : 'ROJO (Pierde)'
        });
        
        // Usar SOLO el resultado visual (donde realmente cayó)
        onSpinComplete(visualResult);
        setHasResult(false);
      }, 9000); // 6 segundos de animación + 3 segundos de pausa = 9 segundos total
    }
  }, [isSpinning, successPercentage, hasResult, onSpinComplete]);

  // Crear los segmentos de la ruleta
  const createSegments = () => {
    const segments = [];
    const successAngle = (successPercentage / 100) * 360;
    
    // Segmento de éxito (verde)
    segments.push(
      <path
        key="success"
        d={`M 180 180 L 180 30 A 150 150 0 ${successAngle > 180 ? 1 : 0} 1 ${
          180 + 150 * Math.sin((successAngle * Math.PI) / 180)
        } ${
          180 - 150 * Math.cos((successAngle * Math.PI) / 180)
        } Z`}
        fill="url(#successGradient)"
        stroke="rgba(255,255,255,0.2)"
        strokeWidth="1.5"
      />
    );
    
    // Segmento de fallo (rojo)
    segments.push(
      <path
        key="fail"
        d={`M 180 180 L ${
          180 + 150 * Math.sin((successAngle * Math.PI) / 180)
        } ${
          180 - 150 * Math.cos((successAngle * Math.PI) / 180)
        } A 150 150 0 ${360 - successAngle > 180 ? 1 : 0} 1 180 30 Z`}
        fill="url(#failGradient)"
        stroke="rgba(255,255,255,0.2)"
        strokeWidth="1.5"
      />
    );
    
    return segments;
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-6">
      {/* Ruleta circular */}
      <div className="relative">
        {/* Flecha indicadora fija */}
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-2 z-20">
          <div className="w-0 h-0 border-l-4 border-r-4 border-b-8 border-l-transparent border-r-transparent border-b-white filter drop-shadow-lg"></div>
        </div>
        
        {/* Contenedor de la ruleta */}
        <motion.div
          ref={rouletteRef}
          className="relative"
          style={{ width: '360px', height: '360px', transformOrigin: "center" }}
          animate={{ rotate: isSpinning ? -finalRotation : (isAnimationComplete ? -finalRotation : 0) }}
          transition={{
            duration: isSpinning ? 6 : 0,
            ease: [0.25, 0.1, 0.25, 1], // Curva que empieza rápido y frena gradualmente
          }}
        >
          {/* SVG de la ruleta */}
          <svg
            width="360"
            height="360"
            viewBox="0 0 360 360"
            className="absolute inset-0"
          >
            {/* Definir gradientes */}
            <defs>
              <radialGradient id="successGradient" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.9" />
                <stop offset="70%" stopColor="#059669" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#047857" stopOpacity="0.7" />
              </radialGradient>
              <radialGradient id="failGradient" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#ef4444" stopOpacity="0.9" />
                <stop offset="70%" stopColor="#dc2626" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#b91c1c" stopOpacity="0.7" />
              </radialGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="4.5" result="coloredBlur"/>
                <feMerge> 
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
            
            {/* Círculo base */}
            <circle
              cx="180"
              cy="180"
              r="150"
              fill="rgba(30, 41, 59, 0.8)"
              stroke="rgba(255,255,255,0.3)"
              strokeWidth="3"
            />
            
            {/* Segmentos de la ruleta */}
            {createSegments()}
            
            {/* Círculo central */}
            <circle
              cx="180"
              cy="180"
              r="135"
              fill="rgba(15, 23, 42, 0.9)"
              stroke="rgba(255,255,255,0.4)"
              strokeWidth="3"
              filter="url(#glow)"
            />
          </svg>
        </motion.div>
        
        {/* Contenido central (porcentaje) - FIJO, no gira */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className="text-center">
            <div className="text-3xl font-bold text-white filter drop-shadow-lg">
              {successPercentage}%
            </div>
            <div className="text-xs text-white/80 font-medium">
              ÉXITO
            </div>
          </div>
        </div>
        
        {/* Borde exterior decorativo */}
        <div className="absolute inset-0 rounded-full border-4 border-white/20 shadow-2xl"></div>
      </div>
      {children}
    </div>
  );
} 