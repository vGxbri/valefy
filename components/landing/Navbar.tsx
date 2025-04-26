// components/landing/Navbar.tsx
'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import AuthModal from '../AuthModal'

const navLinks = [
  { name: 'Inicio', href: '#inicio' },
  { name: 'Funcionamiento', href: '#funcionamiento' },
  { name: 'FAQ', href: '#faq' },
  { name: 'Contacto', href: '#contacto' },
]

export default function Navbar() {
  const [isVisible, setIsVisible] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)
  const [isScrolled, setIsScrolled] = useState(false)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  // Añadir estado para controlar la vista inicial del modal
  const [authModalView, setAuthModalView] = useState<'login' | 'register'>('login');

  const controlNavbar = () => {
    if (typeof window !== 'undefined') {
      // Control de visibilidad basado en dirección de scroll
      if (window.scrollY > lastScrollY && window.scrollY > 100) {
        setIsVisible(false)
      } else {
        setIsVisible(true)
      }
      
      // Control de fondo basado en posición de scroll
      if (window.scrollY > 20) {
        setIsScrolled(true)
      } else {
        setIsScrolled(false)
      }
      
      setLastScrollY(window.scrollY)
    }
  }

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.addEventListener('scroll', controlNavbar)
      return () => window.removeEventListener('scroll', controlNavbar)
    }
  }, [lastScrollY])

  // Función para abrir el modal con una vista específica
  const openAuthModal = (view: 'login' | 'register') => {
    setAuthModalView(view);
    setIsAuthModalOpen(true);
  };

  return (
    <>
      {/* Pasar initialView y el estado de apertura al AuthModal */}
      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
        initialView={authModalView} 
      />
      <motion.nav
      initial={{ y: 0 }}
      animate={{ y: isVisible ? 0 : -100 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className={`fixed top-4 left-0 right-0 mx-auto w-[95%] max-w-7xl z-50 ${
        isScrolled ? 'bg-background/80' : 'bg-background/40'
      } ${isAuthModalOpen ? 'backdrop-blur-lg' : 'backdrop-blur-md'} border border-white/5 rounded-3xl shadow-lg transition-all duration-300`}
      >
      <div className="px-6 py-3 flex justify-between items-center">
        {/* Contenedor del Logo (flex: 1 para ocupar espacio) */}
        <div className="flex-1 flex justify-start">
          <Link href="/" className="flex items-center gap-1 pt-1">
            <Image
              alt="Valefy Logo"
              className="object-contain"
              height={20}
              src="/logo-valefy.png"
              width={90}
            />
          </Link>
        </div>

        {/* Enlaces de navegación - solo visibles en desktop (centrados) */}
        <div className="hidden md:flex space-x-6 justify-center">
          {navLinks.map((link) => (
            <a
              key={link.name}
              href={link.href}
              className="text-white/80 hover:text-primary font-medium transition-colors duration-200"
            >
              {link.name}
            </a>
          ))}
        </div>

        {/* Contenedor del Botón de acción (flex: 1 para ocupar espacio) */}
        <div className="flex-1 flex justify-end">
          <button 
            className="relative bg-primary text-white font-medium text-[15px] px-4 py-[0.35em] pl-5 h-[2.5em] rounded-[0.9em] flex items-center overflow-hidden cursor-pointer shadow-[inset_0_0_1.6em_-0.6em_#0A141D] group"
            // Llamar a openAuthModal con 'login'
            onClick={() => openAuthModal('login')}
          >
            <span className="mr-8">Iniciar Sesión</span>
            <div className="absolute right-[0.3em] bg-white h-[1.9em] w-[1.9em] rounded-[0.7em] flex items-center justify-center transition-all duration-300 group-hover:w-[calc(100%-0.6em)] shadow-[0.1em_0.1em_0.6em_0.2em_#d2d2d4] active:scale-95">
              <svg
                className="w-[1em] transition-transform duration-300 text-[#7b52b9] group-hover:translate-x-[0.1em]"
                height="24"
                viewBox="0 0 24 24"
                width="24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M0 0h24v24H0z" fill="none" />
                <path
                  d="M16.172 11l-5.364-5.364 1.414-1.414L20 12l-7.778 7.778-1.414-1.414L16.172 13H4v-2z"
                  fill="currentColor"
                />
              </svg>
            </div>
          </button>
        </div>
      </div>
    </motion.nav>
    </>
  )
}