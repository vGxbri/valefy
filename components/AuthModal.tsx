import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Stepper from './Stepper';
import { Eye, EyeOff } from 'lucide-react';
import { loginUser } from '@/app/api/auth/login/login'; // Importar la acción del servidor

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialView?: 'login' | 'register';
}

export default function AuthModal({ isOpen, onClose, initialView = 'login' }: AuthModalProps) {
  const [isRegistered, setIsRegistered] = useState(false);
  const [isLoginView, setIsLoginView] = useState(initialView === 'login');
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false); // Estado de carga
  const [error, setError] = useState<string | null>(null); // Estado de error

  // Definición de handleLoginSubmit dentro del componente
  const handleLoginSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);

    try {
      const result = await loginUser(formData);
      if (result.error) {
        setError(result.error);
      } else {
        // Login exitoso
        onClose(); // Cerrar el modal
        // Opcional: Redirigir o actualizar estado global de autenticación
      }
    } catch (err) {
      setError('Ocurrió un error inesperado. Inténtalo de nuevo.');
      console.error('Login error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Efecto para resetear la vista cuando el modal se abre
  useEffect(() => {
    if (isOpen) {
      setIsLoginView(initialView === 'login');
      setIsRegistered(false); // Asegurarse de resetear el estado de registro
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }

    return () => {
      if (typeof window !== 'undefined') {
        document.body.style.overflow = 'auto';
      }
    };
  }, [isOpen, initialView]); // Depender de isOpen e initialView

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
                    <form onSubmit={handleLoginSubmit}> 
                      <h2 className="text-2xl font-bold text-white ">¡Bienvenido de nuevo!</h2>
                      <div className="h-[2px] my-4 bg-gradient-to-r from-transparent via-alternative/50 to-transparent" />
                      <div className="space-y-4">
                        <div className="mt-6">
                          <input
                            type="email"
                            name="email" // Añadir name para FormData
                            required // Añadir validación básica
                            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-white"
                            placeholder="tu@email.com"
                            disabled={isLoading} // Deshabilitar mientras carga
                          />
                        </div>
                        <div className="relative">
                          <input
                            type={isVisible ? 'text' : 'password'}
                            name="password" // Añadir name para FormData
                            required // Añadir validación básica
                            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-white pr-10"
                            placeholder="Contraseña"
                            disabled={isLoading} // Deshabilitar mientras carga
                          />
                          <button
                            type="button"
                            onClick={() => setIsVisible((prev) => !prev)}
                            aria-label={isVisible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                            className="absolute inset-y-0 right-0 outline-none flex items-center justify-center w-10 text-white/50 hover:text-white"
                            disabled={isLoading} // Deshabilitar mientras carga
                          >
                            {isVisible ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                        {error && (
                          <div className="mt-2 flex items-center space-x-2 p-2 bg-primary/10 border border-primary/20 rounded-lg justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-primary flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                            </svg>
                            <p className="text-xs text-red-500 text-center">{error}</p>
                          </div>
                        )}

                        {/*}
                        <button 
                          type="submit" // Cambiar a type="submit"
                          className="w-full bg-primary text-white py-2 rounded-2xl font-medium h-12 rounded-[0.9em] bg-primary/40 border-1 border-primary px-6 font-medium text-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed" // Estilos para deshabilitado
                          disabled={isLoading} // Deshabilitar mientras carga
                        >
                          {isLoading ? 'Iniciando...' : 'Iniciar Sesión'}
                        </button>
                        {*/}
                        <button
                          type="submit"
                          disabled={isLoading}
                          className={`w-full group relative inline-flex h-12 items-center justify-center overflow-hidden rounded-[0.9em] px-6 ${isLoading ? 'opacity-70 cursor-not-allowed bg-primary/40 border-1 border-primary' : 'bg-primary/40 border-1 border-primary'} text-white transition-all duration-300 before:absolute before:inset-0 before:rounded-[0.9em] before:p-[1.5px] before:-z-10 before:content-['']`}
                        >
                            {isLoading ? (
                                <div className="flex items-center">
                                  <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                                  <span>Procesando</span>
                                </div>
                            ) : (
                              <>
                                <span className="font-medium">Iniciar sesión</span>
                                <div className="w-0 translate-x-[100%] pl-0 opacity-0 transition-all duration-200 group-hover:w-5 group-hover:translate-x-0 group-hover:pl-1 group-hover:opacity-100">
                                  <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-5 w-5">
                                    <path d="M8.14645 3.14645C8.34171 2.95118 8.65829 2.95118 8.85355 3.14645L12.8536 7.14645C13.0488 7.34171 13.0488 7.65829 12.8536 7.85355L8.85355 11.8536C8.65829 12.0488 8.34171 12.0488 8.14645 11.8536C7.95118 11.6583 7.95118 11.3417 8.14645 11.1464L11.2929 8H2.5C2.22386 8 2 7.77614 2 7.5C2 7.22386 2.22386 7 2.5 7H11.2929L8.14645 3.85355C7.95118 3.65829 7.95118 3.34171 8.14645 3.14645Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
                                  </svg>
                                </div>
                              </>
                            )}
                        </button>



                      </div>
                    </form>
                  ) : (
                    <Stepper onComplete={handleComplete} />
                  )}
                  
                  <div className="mt-6 text-center">
                    {!isLoginView ? (
                      <>
                        <div className="h-[2px] mt-6 mb-4 bg-gradient-to-r from-transparent via-alternative/50 to-transparent" />
                        <p className="text-white/60">
                          ¿Ya tienes una cuenta?{' '}
                          <button 
                            onClick={() => {
                              setIsLoginView(true);
                              setIsRegistered(false);
                              setError(null); // Limpiar error al cambiar de vista
                            }}
                            className="text-primary hover:[text-shadow:_0px_0px_12px_rgba(252,78,91,1)] transition-[text-shadow] duration-150"
                            disabled={isLoading}
                          >
                            Inicia sesión
                          </button>
                        </p>
                      </>
                    ) : (
                      <p className="text-white/60">
                        ¿No tienes cuenta?{' '}
                        <button 
                          onClick={() => {
                            setIsLoginView(false);
                            setIsRegistered(false);
                            setError(null); // Limpiar error al cambiar de vista
                          }}
                          className="text-primary hover:[text-shadow:_0px_0px_12px_rgba(252,78,91,1)] transition-[text-shadow] duration-150"
                          disabled={isLoading}
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
