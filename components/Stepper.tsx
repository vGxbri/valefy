import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PasswordInput from '@/components/landing/premade/PasswordInput';

interface StepperProps {
  onComplete: () => void;
  onClose?: () => void; // Add close handler prop
}

export default function Stepper({ onComplete, onClose }: StepperProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    agreeTerms: false
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Constantes para validación de contraseña
  const PASSWORD_REQUIREMENTS = [
    { regex: /.{6,}/, text: 'Al menos 6 caracteres' },
    { regex: /[0-9]/, text: 'Al menos 1 número' },
    { regex: /[a-z]/, text: 'Al menos 1 letra minúscula' },
    { regex: /[A-Z]/, text: 'Al menos 1 letra mayúscula' },
    { regex: /[!-\/:-@[-`{-~]/, text: 'Al menos 1 carácter especial' },
  ];

  // Prevent body scrolling when component mounts
  useEffect(() => {
    // Save the current overflow style
    const originalStyle = window.getComputedStyle(document.body).overflow;
    // Prevent scrolling on mount
    document.body.style.overflow = 'hidden';
    // Re-enable scrolling on unmount
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, []);

  const steps = [
    {
      title: '¡Vamos a crear tu cuenta!',
      description: '1. Elige el correo con el que te registrarás.'
    },
    {
      description: '2. Elige tu nombre de usuario.'
    },
    {
    },
    {
      description: '4. Confirma tu contraseña.'
    }
    // Puedes añadir más pasos aquí en el futuro
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const validateStep = () => {
    const newErrors: Record<string, string> = {};
    
    if (currentStep === 0) {
      // --- Start of Edit: Restored specific email error messages ---
      if (!formData.email) {
        newErrors.email = 'El email es obligatorio'; // Changed from ''
      } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
        newErrors.email = 'Email inválido'; // Changed from ''
      }
      // --- End of Edit ---
    } if (currentStep === 1) {
      if (!formData.username) {
        newErrors.username = 'El nombre de usuario es obligatorio';
      } else if (formData.username.length < 3) {
        newErrors.username = 'El nombre debe tener al menos 3 caracteres';
      }
    } else if (currentStep === 2) {
      // Validamos la contraseña pero sin mostrar errores al usuario
      const passwordValid = PASSWORD_REQUIREMENTS.every(req => req.regex.test(formData.password));
      if (!passwordValid) {
        newErrors.password = 'La contraseña no cumple con los requisitos';
      }
    } else if (currentStep === 3) {
      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Las contraseñas no coinciden';
      }
      
      if (!formData.agreeTerms) {
        newErrors.agreeTerms = 'Debes aceptar los términos y condiciones';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const registerUser = async () => {
    try {
      setIsSubmitting(true);
      
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          username: formData.username,
          password: formData.password
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        // Si hay un error del servidor, mostramos el mensaje
        setErrors({ submit: data.error || 'Error al crear el usuario' });
        setIsSubmitting(false);
        return false;
      }
      
      // Registro exitoso
      setIsSubmitting(false);
      return true;
    } catch (error) {
      console.error('Error al registrar usuario:', error);
      setErrors({ submit: 'Error de conexión al servidor' });
      setIsSubmitting(false);
      return false;
    }
  };

  // Función para verificar si el correo ya existe en la base de datos
  const checkEmailExists = async (email: string) => {
    try {
      setIsSubmitting(true);
      
      const response = await fetch('/api/auth/check-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      setIsSubmitting(false);
      
      // Si la respuesta no es exitosa (código 400), significa que el correo ya existe
      if (!response.ok) {
        return { exists: true, message: data.error };
      }
      
      // Si la respuesta es exitosa, el correo no existe
      return { exists: false, message: '' };
    } catch (error) {
      console.error('Error al verificar el correo:', error);
      setIsSubmitting(false);
      return { exists: true, message: 'Error de conexión al servidor' };
    }
  };

  const nextStep = async () => {
    if (validateStep()) {
      // Si estamos en el paso del correo electrónico, verificamos si ya existe
      if (currentStep === 0) {
        const { exists, message } = await checkEmailExists(formData.email);
        
        if (exists) {
          setErrors({ email: message || 'Este correo electrónico ya está registrado' });
          return;
        }
      }
      
      if (currentStep < steps.length - 1) {
        setCurrentStep(currentStep + 1);
      } else {
        // En el último paso, intentamos registrar al usuario
        const success = await registerUser();
        if (success) {
          // Solo llamamos a onComplete si el registro fue exitoso
          onComplete();
        }
      }
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };
  
  return (
    <div className="w-full max-w-md mx-auto">
      <div className="my-8">
        <div className="flex items-center">
          {steps.map((step, index) => (
            <React.Fragment key={index}>
              <div className="flex flex-col items-center z-10">
                <div 
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                    index < currentStep 
                      ? 'bg-primary text-white' 
                      : index === currentStep 
                        ? 'bg-primary/20 text-primary border border-primary' 
                        : 'bg-white/10 text-white/40'
                  }`}
                >
                  {index < currentStep ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    index + 1
                  )}
                </div>
              </div>
              
              {index < steps.length - 1 && (
                <div className="flex-1 h-8 flex items-center relative mx-1"> {/* Adjusted container for centering */}
                  {/* Background line */}
                  <div className="h-[2px] bg-white/20 w-full absolute left-0 right-0"></div> 
                  {/* Progress line */}
                  {currentStep > index && (
                    <motion.div 
                      className="h-[2px] bg-primary absolute left-0 right-0" // Use left/right-0 for full width within relative parent
                      initial={{ width: '0%' }}
                      animate={{ width: '100%' }}
                      transition={{ duration: 0.5, ease: "easeInOut" }}
                    />
                  )}
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
          className="mb-6"
        >
          <h2 className="text-2xl font-bold text-white ">{steps[currentStep].title}</h2>
          {steps[currentStep].title && (
            <div className="h-[2px] my-4 bg-gradient-to-r from-transparent via-alternative/50 to-transparent" />
          )}
          <p className="text-sm mt-8 mb-2 text-alternative/70">{steps[currentStep].description}</p>

          {currentStep === 0 && (
            <div className="space-y-4">
              <div>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  // Added styling similar to other inputs
                  className={`w-full px-4 py-2 bg-white/5 border ${errors.email ? 'border-red-500' : 'border-white/10'} rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-white`}
                  placeholder="tu@email.com" 
                  required // Added required attribute for HTML5 validation (optional)
                />
                {errors.email && 
                  <div className="mt-2 flex items-center space-x-2 p-2 bg-primary/10 border border-primary/20 rounded-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-primary flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <p className="text-xs text-red-500">
                      {errors.email}
                    </p>
                  </div>
                }
              </div>
            </div>
          )}

          {currentStep === 1 && (
            <div className="space-y-2">
              <div>
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2 bg-white/5 border ${errors.username ? 'border-red-500' : 'border-white/10'} rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-white`}
                  placeholder="Tu nombre de usuario"
                />
                {errors.username && 
                  <div className="mt-2 flex items-center space-x-2 p-2 bg-primary/10 border border-primary/20 rounded-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-primary flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <p className="text-xs text-red-500">
                      {errors.username}
                    </p>
                  </div>
                }
              </div>
              <div className="flex items-center space-x-2 p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-amber-500 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <p className="text-xs text-amber-500">
                  Tu nombre de usuario no podrá cambiarse después.
                </p>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-4">
              <PasswordInput
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                error={errors.password}
              />
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-4">
              <div>
                <div className="relative">
                  <input
                    type="password"
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2 bg-white/5 border ${errors.confirmPassword ? 'border-red-500' : 'border-white/10'} rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-white`}
                  />
                </div>
                {errors.confirmPassword && 
                  <div className="mt-2 flex items-center space-x-2 p-2 bg-primary/10 border border-primary/20 rounded-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-primary flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <p className="text-xs text-red-500">
                      {errors.confirmPassword}
                    </p>
                  </div>
                }
              </div>
              <div className="flex items-start mt-4">
                <div className="text-sm">
                <label htmlFor="agreeTerms" className="flex flex-row items-center gap-2.5 text-white">
                  <input 
                    id="agreeTerms" 
                    name="agreeTerms" 
                    type="checkbox" 
                    checked={formData.agreeTerms}
                    onChange={handleInputChange}
                    className="peer hidden" 
                  />
                  <div className="h-5 w-5 flex rounded-md border border-[#a2a1a833] bg-white/5 peer-checked:bg-alternative transition">
                    <svg fill="none" viewBox="0 0 24 24" className="w-5 h-5 stroke-[#212121]" xmlns="http://www.w3.org/2000/svg">
                      <path d="M4 12.6111L8.92308 17.5L20 6.5" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  Acepto los términos y condiciones
                </label>
                </div>
              </div>
              {errors.agreeTerms && 
                <div className="mt-2 flex items-center space-x-2 p-2 bg-primary/10 border border-primary/20 rounded-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-primary flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <p className="text-xs text-red-500">
                    {errors.agreeTerms}
                  </p>
                </div>
              }
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <div className="flex justify-between mt-8">
        <button 
          onClick={prevStep}
          className={`relative inline-flex h-12 w-12 items-center justify-center rounded-[0.9em] bg-transparent transition-colors hover:bg-primary ${
            currentStep === 0 ? 'opacity-50 cursor-not-allowed' : ''
          }`}
          disabled={currentStep === 0}>
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-neutral-600 rotate-180">
              <path d="M8.14645 3.14645C8.34171 2.95118 8.65829 2.95118 8.85355 3.14645L12.8536 7.14645C13.0488 7.34171 13.0488 7.65829 12.8536 7.85355L8.85355 11.8536C8.65829 12.0488 8.34171 12.0488 8.14645 11.8536C7.95118 11.6583 7.95118 11.3417 8.14645 11.1464L11.2929 8H2.5C2.22386 8 2 7.77614 2 7.5C2 7.22386 2.22386 7 2.5 7H11.2929L8.14645 3.85355C7.95118 3.65829 7.95118 3.34171 8.14645 3.14645Z" fill="#FFFFFF" fillRule="evenodd" clipRule="evenodd"></path>
            </svg>
        </button>

        <button
          onClick={nextStep}
          disabled={isSubmitting}
          className={`group relative inline-flex h-12 items-center justify-center overflow-hidden rounded-[0.9em] bg-primary px-6 font-medium text-neutral-200 ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}>
            <span>{isSubmitting ? 'Procesando...' : 'Continuar'}</span>
            {!isSubmitting && (
              <div className="w-0 translate-x-[100%] pl-0 opacity-0 transition-all duration-200 group-hover:w-5 group-hover:translate-x-0 group-hover:pl-1 group-hover:opacity-100"><svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-5 w-5"><path d="M8.14645 3.14645C8.34171 2.95118 8.65829 2.95118 8.85355 3.14645L12.8536 7.14645C13.0488 7.34171 13.0488 7.65829 12.8536 7.85355L8.85355 11.8536C8.65829 12.0488 8.34171 12.0488 8.14645 11.8536C7.95118 11.6583 7.95118 11.3417 8.14645 11.1464L11.2929 8H2.5C2.22386 8 2 7.77614 2 7.5C2 7.22386 2.22386 7 2.5 7H11.2929L8.14645 3.85355C7.95118 3.65829 7.95118 3.34171 8.14645 3.14645Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path></svg></div>
            )}
        </button>
      </div>
    </div>
  );
}