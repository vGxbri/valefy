import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";
import { signIn } from "next-auth/react";
import { FaGoogle, FaDiscord } from "react-icons/fa";
import { useRouter } from "next/navigation";

import Stepper from "./Stepper";
interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialView?: "login" | "register";
}

export default function AuthModal({
  isOpen,
  onClose,
  initialView = "login",
}: AuthModalProps) {
  const [isRegistered, setIsRegistered] = useState(false);
  const [isLoginView, setIsLoginView] = useState(initialView === "login");
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();

  const handleLoginSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        body: formData,
      });
      const result = await response.json();

      if (result.error) {
        setError(result.error);

        return false;
      }

      // Iniciar sesión con next-auth
      const signInResult = await signIn("credentials", {
        email: formData.get("email"),
        password: formData.get("password"),
        redirect: false,
      });

      if (signInResult?.error) {
        setError("Error al iniciar sesión: " + signInResult.error);

        return false;
      }

      // Cerrar el modal y redirigir
      onClose();
      router.replace("/main");

      return true;
    } catch (err) {
      setError("Ocurrió un error inesperado. Inténtalo de nuevo.");
      console.error("Login error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Efecto para resetear la vista cuando el modal se abre
  useEffect(() => {
    if (isOpen) {
      setIsLoginView(initialView === "login");
      setIsRegistered(false); // Asegurarse de resetear el estado de registro
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }

    return () => {
      if (typeof window !== "undefined") {
        document.body.style.overflow = "auto";
      }
    };
  }, [isOpen, initialView]); // Depender de isOpen e initialView

  const handleComplete = () => {
    setIsRegistered(true);
    setTimeout(() => {
      onClose();
      router.push("/main");
      // Reset state after closing
      setTimeout(() => setIsRegistered(false), 500);
    }, 3000);
  };

  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  };

  const modalVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 20 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 30,
      },
    },
    exit: {
      opacity: 0,
      scale: 0.95,
      y: 20,
      transition: {
        duration: 0.2,
      },
    },
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          animate="visible"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-lg"
          exit="hidden"
          initial="hidden"
          variants={backdropVariants}
        >
          <motion.div
            className="relative w-full max-w-xs sm:max-w-sm md:max-w-md bg-background border border-white/10 rounded-2xl shadow-xl overflow-hidden"
            variants={modalVariants}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              aria-label="Cerrar"
              className="absolute top-3 sm:top-4 right-3 sm:right-4 p-1.5 sm:p-2 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors z-20" // Adjusted positioning and styling
              onClick={onClose}
            >
              <svg
                className="h-4 w-4 sm:h-5 sm:w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M6 18L18 6M6 6l12 12"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                />
              </svg>
            </button>

            {/* Elementos decorativos */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-primary/50 to-transparent" />
            <div className="absolute top-0 right-0 w-24 sm:w-32 h-24 sm:h-32 bg-primary/10 rounded-full filter blur-3xl -translate-y-1/2 translate-x-1/2 opacity-50" />
            <div className="absolute bottom-0 left-0 w-24 sm:w-32 h-24 sm:h-32 bg-primary/10 rounded-full filter blur-3xl translate-y-1/2 -translate-x-1/2 opacity-50" />

            <div className="p-6 sm:p-8 md:p-12 relative z-10">
              {isRegistered ? (
                <motion.div
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center justify-center py-6 sm:py-8 md:py-10"
                  initial={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-primary/20 rounded-full flex items-center justify-center mb-4 sm:mb-6">
                    <svg
                      className="h-8 w-8 sm:h-10 sm:w-10 text-primary"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M5 13l4 4L19 7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                      />
                    </svg>
                  </div>
                  <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-white mb-2">
                    ¡Registro completado!
                  </h2>
                  <p className="text-white/70 text-center text-sm sm:text-base">
                    Tu cuenta ha sido creada exitosamente. Serás redirigido
                    automáticamente.
                  </p>
                </motion.div>
              ) : (
                <>
                  {isLoginView ? (
                    <form onSubmit={handleLoginSubmit}>
                      <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-white">
                        ¡Bienvenido de nuevo!
                      </h2>
                      <div className="h-[2px] my-3 sm:my-4 bg-gradient-to-r from-transparent via-alternative/50 to-transparent" />
                      <div className="space-y-3 sm:space-y-4">
                        <div className="mt-4 sm:mt-6">
                          <input
                            required
                            className="w-full px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-white"
                            disabled={isLoading}
                            name="email"
                            placeholder="tu@email.com"
                            type="email"
                          />
                        </div>
                        <div className="relative">
                          <input
                            required
                            className="w-full px-3 sm:px-4 py-2 sm:py-2.5 pr-8 sm:pr-10 text-sm sm:text-base bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-white"
                            disabled={isLoading}
                            name="password"
                            placeholder="Contraseña"
                            type={isVisible ? "text" : "password"}
                          />
                          <button
                            aria-label={
                              isVisible
                                ? "Ocultar contraseña"
                                : "Mostrar contraseña"
                            }
                            className="absolute inset-y-0 right-0 outline-none flex items-center justify-center w-8 sm:w-10 text-white/50 hover:text-white"
                            disabled={isLoading}
                            type="button"
                            onClick={() => setIsVisible((prev) => !prev)}
                          >
                            {isVisible ? (
                              <EyeOff size={16} className="sm:w-4 sm:h-4" />
                            ) : (
                              <Eye size={16} className="sm:w-4 sm:h-4" />
                            )}
                          </button>
                        </div>
                        {error && (
                          <div className="mt-2 flex items-center space-x-2 p-2 sm:p-3 bg-primary/10 border border-primary/20 rounded-lg justify-center">
                            <svg
                              className="h-3 w-3 sm:h-4 sm:w-4 text-primary flex-shrink-0"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                clipRule="evenodd"
                                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                                fillRule="evenodd"
                              />
                            </svg>
                            <p className="text-xs text-red-500 text-center">
                              {error}
                            </p>
                          </div>
                        )}

                        {/* Botón de inicio de sesión */}
                        <button
                          className="w-full bg-primary text-white py-2 sm:py-2.5 rounded-2xl font-medium h-10 sm:h-12 text-sm sm:text-base rounded-[0.9em] bg-primary/40 border-1 border-primary px-4 sm:px-6 font-medium text-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={isLoading}
                          type="submit"
                        >
                          {isLoading ? (
                            <div className="flex items-center justify-center">
                              <svg
                                className="animate-spin -ml-1 mr-2 sm:mr-3 h-4 w-4 sm:h-5 sm:w-5 text-white"
                                fill="none"
                                viewBox="0 0 24 24"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <circle
                                  className="opacity-25"
                                  cx="12"
                                  cy="12"
                                  r="10"
                                  stroke="currentColor"
                                  strokeWidth="4"
                                />
                                <path
                                  className="opacity-75"
                                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                  fill="currentColor"
                                />
                              </svg>
                              <span className="text-xs sm:text-sm">Iniciando sesión...</span>
                            </div>
                          ) : (
                            "Iniciar Sesión"
                          )}
                        </button>

                        {/* Separador y botones de OAuth */}
                        <div className="relative my-4 sm:my-6">
                          <div
                            aria-hidden="true"
                            className="absolute inset-0 flex items-center"
                          >
                            <div className="w-full border-t border-white/10" />
                          </div>
                          <div className="relative flex justify-center text-xs sm:text-sm">
                            <span className="px-2 bg-background text-white/50">
                              O continúa con
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
                          <button
                            className="flex items-center justify-center w-full px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors text-white"
                            disabled={isLoading}
                            type="button"
                            onClick={() =>
                              signIn("google", { callbackUrl: "/main" })
                            } // Llamada a signIn con 'google' y callbackUrl
                          >
                            <FaGoogle className="mr-1 sm:mr-2 text-sm sm:text-base" /> 
                            <span className="hidden sm:inline">Google</span>
                            <span className="sm:hidden">Google</span>
                          </button>
                          <button
                            className="flex items-center justify-center w-full px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors text-white"
                            disabled={isLoading}
                            type="button"
                            onClick={() =>
                              signIn("discord", { callbackUrl: "/main" })
                            } // Llamada a signIn con 'discord' y callbackUrl
                          >
                            <FaDiscord className="mr-1 sm:mr-2 text-sm sm:text-base" /> 
                            <span className="hidden sm:inline">Discord</span>
                            <span className="sm:hidden">Discord</span>
                          </button>
                        </div>

                        <p className="mt-4 sm:mt-6 text-center text-xs sm:text-sm text-white/50">
                          ¿No tienes cuenta?{" "}
                          <button
                            className="font-medium text-primary hover:underline"
                            disabled={isLoading}
                            type="button"
                            onClick={() => setIsLoginView(false)}
                          >
                            Regístrate
                          </button>
                        </p>
                      </div>
                    </form>
                  ) : (
                    <Stepper onClose={onClose} onComplete={handleComplete} />
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
