import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Stepper from './Stepper';
import { Eye, EyeOff } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [isRegistered, setIsRegistered] = useState(false);
  const [isLoginView, setIsLoginView] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (isOpen) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = 'auto';
      }
    }
    
    return () => {
      if (typeof window !== 'undefined') {
        document.body.style.overflow = 'auto';
      }
    };
  }, [isOpen, isLoginView]);
  
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);

  const handleComplete = () => {
    setIsRegistered(true);
    setTimeout(() => {
      onClose();
      // Reset state after closing
      setTimeout(() => setIsRegistered(false), 500);
    }, 5000);
  };

  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 }
  };

  const modalVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 20 },
    visible: { 
      opacity: 1, 
      scale: 1, 
      y: 0,
      transition: { 
        type: 'spring',
        stiffness: 300,
        damping: 30
      }
    },
    exit: { 
      opacity: 0, 
      scale: 0.95, 
      y: 20,
      transition: { 
        duration: 0.2
      }
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-lg"
          initial="hidden"
          animate="visible"
          exit="hidden"
          variants={backdropVariants}
          // Se eliminó onClick={onClose} para evitar que el modal se cierre al hacer clic fuera
        >
          {/* Removed close button from here */}

          <motion.div
            className="relative w-full max-w-md bg-background border border-white/10 rounded-2xl shadow-xl overflow-hidden"
            variants={modalVariants}
            onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside the modal
          >
            {/* Moved close button inside the modal content area */}
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors z-20" // Adjusted positioning and styling
              aria-label="Cerrar"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Decorative elements */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-primary/50 to-transparent"></div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full filter blur-3xl -translate-y-1/2 translate-x-1/2 opacity-50"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-primary/10 rounded-full filter blur-3xl translate-y-1/2 -translate-x-1/2 opacity-50"></div>

            <div className="p-12 relative z-10">
              {isRegistered ? (
                <motion.div 
                  className="flex flex-col items-center justify-center py-10"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mb-6">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-2">¡Registro completado!</h2>
                  <p className="text-white/70 text-center">
                    Tu cuenta ha sido creada exitosamente. Serás redirigido automáticamente.
                  </p>
                </motion.div>
              ) : (
                <>
                  {isLoginView ? (
                    <> 
                      <h2 className="text-2xl font-bold text-white ">¡Bienvenido de nuevo!</h2>
                      <div className="h-[2px] my-4 bg-gradient-to-r from-transparent via-alternative/50 to-transparent" />
                      <div className="space-y-4">
                        <div className="mt-6">
                          <input
                            type="email"
                            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-white"
                            placeholder="tu@email.com"
                          />
                        </div>
                        <div className="relative">
                          <input
                            type={isVisible ? 'text' : 'password'}
                            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-white pr-10"
                            placeholder="Contraseña"
                          />
                          <button
                            type="button"
                            onClick={() => setIsVisible((prev) => !prev)}
                            aria-label={isVisible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                            className="absolute inset-y-0 right-0 outline-none flex items-center justify-center w-10 text-white/50 hover:text-white"
                          >
                            {isVisible ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                        <button className="w-full bg-primary text-white py-2 rounded-2xl font-medium h-12 rounded-[0.9em] bg-primary/40 border-1 border-primary px-6 font-medium text-neutral-200">
                          Iniciar Sesión
                        </button>
                      </div>
                    </>
                  ) : (
                    <Stepper onComplete={handleComplete} />
                  )}
                  
                  <div className="mt-6 text-center">
                    {!isLoginView ? (
                      <p className="text-white/60">
                        <div className="h-[2px] mt-6 mb-4 bg-gradient-to-r from-transparent via-alternative/50 to-transparent" />
                        ¿Ya tienes una cuenta?{' '}
                        <button 
                          onClick={() => setIsLoginView(true)}
                          className="text-primary hover:underline"
                        >
                          Inicia sesión
                        </button>
                      </p>
                    ) : (
                      <p className="text-white/60">
                        ¿No tienes cuenta?{' '}
                        <button 
                          onClick={() => setIsLoginView(false)}
                          className="text-primary hover:underline"
                        >
                          Regístrate
                        </button>
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
