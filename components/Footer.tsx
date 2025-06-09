"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { ChevronRight, Mail, MessageCircle, ExternalLink } from "lucide-react";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  // Animación para los enlaces
  const linkAnimation = {
    initial: { opacity: 0.6, x: -5 },
    hover: { opacity: 1, x: 0, color: "#FC4E5B" },
    transition: { duration: 0.2 }
  };

  // Social media links with proper URLs
  const socialLinks = [
    {
      name: "Twitter",
      href: "https://twitter.com/valefy",
      icon: (
        <svg fill="currentColor" height="20" viewBox="0 0 24 24" width="20">
          <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z" />
        </svg>
      ),
    },
    {
      name: "Facebook",
      href: "https://facebook.com/valefy",
      icon: (
        <svg fill="currentColor" height="20" viewBox="0 0 24 24" width="20">
          <path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z" />
        </svg>
      ),
    },
    {
      name: "Instagram",
      href: "https://instagram.com/valefy",
      icon: (
        <svg fill="currentColor" height="20" viewBox="0 0 24 24" width="20">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
        </svg>
      ),
    },
  ];

  // Navigation links
  const navLinks = [
    { name: "Inicio", href: "/" },
    { name: "Características", href: "/#caracteristicas" },
    { name: "Cómo funciona", href: "/#como-funciona" },
    { name: "FAQ", href: "/#faq" },
  ];

  // Legal links
  const legalLinks = [
    { name: "Términos de servicio", href: "/terminos" },
    { name: "Política de privacidad", href: "/privacidad" },
    { name: "Cookies", href: "/cookies" },
  ];

  return (
    <motion.footer
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="relative py-12 sm:py-16 overflow-hidden"
    >
      {/* Elementos decorativos de fondo */}
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-70" />
      <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl opacity-50" />
      <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl opacity-50" />
      
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 relative z-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-8 sm:gap-10 mb-12 sm:mb-16">
          {/* Logo y descripción */}
          <div className="sm:col-span-2 lg:col-span-5 space-y-4 sm:space-y-6">
            <Link 
              className="inline-block transform transition-transform duration-300 hover:scale-105" 
              href="/"
            >
              <Image
                alt="Valefy Logo"
                className="object-contain drop-shadow-glow h-8 sm:h-9 w-auto"
                height={35}
                src="/logo-valefy.png"
                width={140}
              />
            </Link>
            
            <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
              El mejor simulador de cajas de Valorant. Experimenta la emoción
              sin gastar dinero real.
            </p>
            
            <div className="flex space-x-3 sm:space-x-5 mt-4 sm:mt-6">
              {socialLinks.map((link) => (
                <motion.a
                  key={link.name}
                  aria-label={link.name}
                  initial="initial"
                  whileHover="hover"
                  className="text-slate-400 hover:text-primary p-1.5 sm:p-2 bg-slate-800/50 rounded-lg border border-slate-700/50 hover:border-primary/30 transition-all duration-300"
                  href={link.href}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  <div className="w-4 h-4 sm:w-5 sm:h-5">
                    {React.cloneElement(link.icon, { 
                      width: "100%", 
                      height: "100%" 
                    })}
                  </div>
                </motion.a>
              ))}
            </div>
          </div>

          {/* Enlaces de navegación */}
          <div className="lg:col-span-2">
            <h4 className="text-white font-semibold mb-3 sm:mb-5 text-base sm:text-lg">Enlaces</h4>
            <ul className="space-y-2 sm:space-y-3">
              {navLinks.map((link) => (
                <li key={link.name}>
                  <motion.div
                    initial="initial"
                    whileHover="hover"
                  >
                    <Link
                      className="text-slate-400 hover:text-primary transition-colors flex items-center group text-sm sm:text-base"
                      href={link.href}
                    >
                      <ChevronRight className="h-3 w-0 sm:h-4 opacity-0 group-hover:w-3 sm:group-hover:w-4 group-hover:opacity-100 transition-all duration-300 text-primary" />
                      <motion.span variants={linkAnimation}>{link.name}</motion.span>
                    </Link>
                  </motion.div>
                </li>
              ))}
            </ul>
          </div>

          {/* Enlaces legales */}
          <div className="lg:col-span-2">
            <h4 className="text-white font-semibold mb-3 sm:mb-5 text-base sm:text-lg">Legal</h4>
            <ul className="space-y-2 sm:space-y-3">
              {legalLinks.map((link) => (
                <li key={link.name}>
                  <motion.div
                    initial="initial"
                    whileHover="hover"
                  >
                    <Link
                      className="text-slate-400 hover:text-primary transition-colors flex items-center group text-sm sm:text-base"
                      href={link.href}
                    >
                      <ChevronRight className="h-3 w-0 sm:h-4 opacity-0 group-hover:w-3 sm:group-hover:w-4 group-hover:opacity-100 transition-all duration-300 text-primary" />
                      <motion.span variants={linkAnimation}>{link.name}</motion.span>
                    </Link>
                  </motion.div>
                </li>
              ))}
            </ul>
          </div>

          {/* Contacto */}
          <div className="sm:col-span-2 lg:col-span-3">
            <h4 className="text-white font-semibold mb-3 sm:mb-5 text-base sm:text-lg">Contacto</h4>
            <ul className="space-y-3 sm:space-y-4">
              <li>
                <a 
                  href="mailto:soporte@valefy.com" 
                  className="text-slate-400 hover:text-primary transition-colors flex items-center gap-2 sm:gap-3 group text-sm sm:text-base"
                >
                  <div className="p-1.5 sm:p-2 bg-slate-800/70 rounded-lg border border-slate-700/50 group-hover:border-primary/30 group-hover:bg-primary/10 transition-all duration-300 flex-shrink-0">
                    <Mail className="h-3 w-3 sm:h-4 sm:w-4 text-primary/80" />
                  </div>
                  <span className="truncate">soporte@valefy.com</span>
                </a>
              </li>
              <li>
                <a 
                  href="https://discord.gg/valefy" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-slate-400 hover:text-primary transition-colors flex items-center gap-2 sm:gap-3 group text-sm sm:text-base"
                >
                  <div className="p-1.5 sm:p-2 bg-slate-800/70 rounded-lg border border-slate-700/50 group-hover:border-primary/30 group-hover:bg-primary/10 transition-all duration-300 flex-shrink-0">
                    <MessageCircle className="h-3 w-3 sm:h-4 sm:w-4 text-primary/80" />
                  </div>
                  <span className="truncate">Discord: Valefy</span>
                  <ExternalLink className="h-2 w-2 sm:h-3 sm:w-3 opacity-0 group-hover:opacity-70 transition-opacity duration-300 flex-shrink-0" />
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Barra de copyright */}
        <div className="pt-6 sm:pt-8 border-t border-slate-800/80 text-center">
          <p className="text-slate-500 text-xs sm:text-sm leading-relaxed">
            © {currentYear} Valefy. Todos los derechos reservados. Valefy no
            está afiliado con Riot Games.
          </p>
        </div>
      </div>
    </motion.footer>
  );
}
