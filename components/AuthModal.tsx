import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Stepper from './Stepper';
import { Eye, EyeOff } from 'lucide-react';
import { loginUser } from '@/app/api/auth/login/route';
import { signIn } from 'next-auth/react'; // Importar signIn
import { FaGoogle, FaDiscord } from 'react-icons/fa'; // Importar iconos
import { useRouter } from 'next/navigation'; // Añadir import
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
  const router = useRouter();

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
        router.push('/main'); // Redirigir a /app/main
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
      router.push('/main'); // Redirigir a /main
      // Reset state after closing
      setTimeout(() => setIsRegistered(false), 500);
    }, 3000); // Reducir el tiempo de espera
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

                        {/* Botón de inicio de sesión */}
                        <button 
                          type="submit" // Cambiar a type="submit"
                          className="w-full bg-primary text-white py-2 rounded-2xl font-medium h-12 rounded-[0.9em] bg-primary/40 border-1 border-primary px-6 font-medium text-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={isLoading} // Deshabilitar mientras carga
                        >
                          {isLoading ? (
                            <div className="flex items-center justify-center">
                              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Iniciando sesión...
                            </div>
                          ) : (
                            'Iniciar Sesión'
                          )}
                        </button>

                        {/* Separador y botones de OAuth */}
                        <div className="relative my-6">
                          <div className="absolute inset-0 flex items-center" aria-hidden="true">
                            <div className="w-full border-t border-white/10"></div>
                          </div>
                          <div className="relative flex justify-center text-sm">
                            <span className="px-2 bg-background text-white/50">O continúa con</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <button
                            type="button"
                            onClick={() => signIn('google', { callbackUrl: '/main' })} // Llamada a signIn con 'google' y callbackUrl
                            className="flex items-center justify-center w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors text-white"
                            disabled={isLoading}
                          >
                            <FaGoogle className="mr-2" /> Google
                          </button>
                          <button
                            type="button"
                            onClick={() => signIn('discord', { callbackUrl: '/main' })} // Llamada a signIn con 'discord' y callbackUrl
                            className="flex items-center justify-center w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors text-white"
                            disabled={isLoading}
                          >
                            <FaDiscord className="mr-2" /> Discord
                          </button>
                        </div>

                        <p className="mt-6 text-center text-sm text-white/50">
                          ¿No tienes cuenta?{' '}
                          <button 
                            type="button" 
                            onClick={() => setIsLoginView(false)} 
                            className="font-medium text-primary hover:underline"
                            disabled={isLoading}
                          >
                            Regístrate
                          </button>
                        </p>
                      </div>
                    </form>
                  ) : (
                    <Stepper onComplete={handleComplete} onClose={onClose} />
                  )}
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
