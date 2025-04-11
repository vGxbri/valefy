"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Stepper, { Step } from '@/components/landing/premade/Stepper';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  // Prevenir scroll cuando el modal está abierto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay con blur */}
          <motion.div 
            className="fixed inset-0 bg-background/60 backdrop-blur-md z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          
          {/* Modal content */}
          <motion.div 
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
          >
            <div 
              className="bg-background border border-white/10 rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-white">Crear cuenta</h2>
                  <button 
                    onClick={onClose}
                    className="text-white/70 hover:text-white transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                </div>
                
                <Stepper
                  initialStep={1}
                  onStepChange={(step) => {
                    console.log(`Paso actual: ${step}`);
                  }}
                  onFinalStepCompleted={() => {
                    console.log("Registro completado");
                    // Aquí podrías implementar la lógica para crear la cuenta
                    setTimeout(() => {
                      onClose();
                    }, 1000);
                  }}
                  backButtonText="Anterior"
                  nextButtonText="Siguiente"
                  stepCircleContainerClassName="bg-background border-primary/20"
                  contentClassName="text-white"
                  nextButtonProps={{
                    className: "duration-350 flex items-center justify-center rounded-full bg-primary py-1.5 px-3.5 font-medium tracking-tight text-white transition hover:bg-primary/90 active:bg-primary/80"
                  }}
                  backButtonProps={{
                    className: "duration-350 rounded px-2 py-1 transition text-white/70 hover:text-white"
                  }}
                >
                  <Step>
                    <h2 className="text-lg font-medium mb-4">Bienvenido a Valefy</h2>
                    <p className="text-white/80 mb-4">Crea tu cuenta para empezar a disfrutar de nuestro simulador de cajas de Valorant.</p>
                  </Step>
                  <Step>
                    <h2 className="text-lg font-medium mb-4">Información personal</h2>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-white/80 mb-1">Nombre de usuario</label>
                        <input 
                          type="text" 
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary"
                          placeholder="Tu nombre en Valefy"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-white/80 mb-1">Email</label>
                        <input 
                          type="email" 
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary"
                          placeholder="tu@email.com"
                        />
                      </div>
                    </div>
                  </Step>
                  <Step>
                    <h2 className="text-lg font-medium mb-4">Cuenta de Valorant</h2>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-white/80 mb-1">ID de Riot</label>
                        <input 
                          type="text" 
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary"
                          placeholder="Nombre#TAG"
                        />
                      </div>
                    </div>
                  </Step>
                  <Step>
                    <h2 className="text-lg font-medium mb-4">¡Todo listo!</h2>
                    <p className="text-white/80 mb-4">Tu cuenta ha sido creada correctamente. Ahora puedes empezar a usar Valefy.</p>
                  </Step>
                </Stepper>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}