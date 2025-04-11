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
            // Fix: Add role and keyboard event handler
            role="presentation"
            onKeyDown={(e) => {
              if (e.key === 'Escape') onClose();
            }}
          />
          
          {/* Modal content */}
          <motion.div 
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            // Fix: Add role for accessibility
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
          >
            <div 
              className="bg-background border border-white/10 rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-auto"
              onClick={(e) => e.stopPropagation()}
              // Fix: Add role and keyboard event handler
              role="presentation"
              onKeyDown={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 id="modal-title" className="text-xl font-bold text-white">Crear cuenta</h2>
                  <button 
                    onClick={onClose}
                    className="text-white/70 hover:text-white transition-colors"
                    aria-label="Cerrar"
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
                  }}
                >
                  <Step>
                    <div className="space-y-4 py-4">
                      <div>
                        {/* Fix: Associate label with input using htmlFor and id */}
                        <label htmlFor="username" className="block text-sm font-medium text-white/90 mb-1">
                          Nombre de usuario
                        </label>
                        <input
                          id="username"
                          type="text"
                          className="w-full px-3 py-2 bg-background/50 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                          placeholder="Tu nombre de usuario"
                        />
                      </div>
                      
                      <div>
                        {/* Fix: Associate label with input using htmlFor and id */}
                        <label htmlFor="email" className="block text-sm font-medium text-white/90 mb-1">
                          Correo electrónico
                        </label>
                        <input
                          id="email"
                          type="email"
                          className="w-full px-3 py-2 bg-background/50 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                          placeholder="tu@email.com"
                        />
                      </div>
                    </div>
                  </Step>
                  
                  <Step>
                    <div className="space-y-4 py-4">
                      <div>
                        {/* Fix: Associate label with input using htmlFor and id */}
                        <label htmlFor="password" className="block text-sm font-medium text-white/90 mb-1">
                          Contraseña
                        </label>
                        <input
                          id="password"
                          type="password"
                          className="w-full px-3 py-2 bg-background/50 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                          placeholder="Tu contraseña"
                        />
                      </div>
                      
                      <div>
                        {/* Fix: Associate label with input using htmlFor and id */}
                        <label htmlFor="confirm-password" className="block text-sm font-medium text-white/90 mb-1">
                          Confirmar contraseña
                        </label>
                        <input
                          id="confirm-password"
                          type="password"
                          className="w-full px-3 py-2 bg-background/50 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                          placeholder="Confirma tu contraseña"
                        />
                      </div>
                    </div>
                  </Step>
                  
                  <Step>
                    <div className="py-4 text-center">
                      <div className="mb-4 inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/20 text-primary">
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                          <polyline points="22 4 12 14.01 9 11.01"></polyline>
                        </svg>
                      </div>
                      <h3 className="text-xl font-medium text-white mb-2">¡Registro completado!</h3>
                      <p className="text-white/70">Tu cuenta ha sido creada exitosamente. Ahora puedes comenzar a usar Valefy.</p>
                    </div>
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