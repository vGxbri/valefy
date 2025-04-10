"use client";

import { ReactNode, useState } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { Link } from "@heroui/react";

interface MainLayoutProps {
  children: ReactNode;
}

const navigationItems = [
  { name: "Principal", href: "/main" },
  { name: "Inventario", href: "/main/inventario" },
  { name: "Catálogo", href: "/main/catalogo" },
  { name: "Intercambios", href: "/main/trade" },
];

export default function MainLayout({ children }: MainLayoutProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Barra de navegación flotante */}
      <header className="fixed top-4 left-1/2 transform -translate-x-1/2 w-[95%] max-w-7xl z-50">
        <div className="bg-background/80 backdrop-blur-md border border-white/5 rounded-3xl shadow-lg">
          <div className="flex items-center justify-between px-6 h-16">
            {/* Logo */}
            <Link className="flex items-center gap-1 pt-1" href="/">
              <Image
                alt="Valefy Logo"
                className="object-contain"
                height={20}
                src="/logo-valefy.png"
                width={90}
              />
            </Link>

            {/* Navegación central - solo visible en desktop */}
            <nav className="hidden md:flex items-center">
              <ul className="flex space-x-4">
                {navigationItems.map((item) => (
                  <li key={item.name}>
                    <Link
                      isBlock
                      className={clsx(
                        "flex items-center px-3 py-2 rounded-2xl transition-all",
                        pathname === item.href
                          ? "bg-primary text-white"
                          : "text-text/80 hover:bg-primary/10 hover:text-text",
                      )}
                      color="foreground"
                      href={item.href}
                    >
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            {/* Botón de hamburguesa - solo visible en móvil */}
            <button
              aria-label="Toggle menu"
              className="md:hidden p-2 rounded-lg hover:bg-primary/10 transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <div className="w-6 flex flex-col gap-1.5">
                <span
                  className={`block h-0.5 w-full bg-white transition-transform duration-300 ${mobileMenuOpen ? "rotate-45 translate-y-2" : ""}`}
                />
                <span
                  className={`block h-0.5 w-full bg-white transition-opacity duration-300 ${mobileMenuOpen ? "opacity-0" : "opacity-100"}`}
                />
                <span
                  className={`block h-0.5 w-full bg-white transition-transform duration-300 ${mobileMenuOpen ? "-rotate-45 -translate-y-2" : ""}`}
                />
              </div>
            </button>

            {/* Perfil */}
            <div className="flex items-center">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                  👤
                </div>
                <div className="hidden md:block">
                  <p className="text-sm font-medium text-text">Usuario</p>
                </div>
              </div>
            </div>
          </div>

          {/* Menú móvil desplegable */}
          <div
            className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${mobileMenuOpen ? "max-h-60 opacity-100" : "max-h-0 opacity-0"}`}
          >
            <nav className="px-4 py-3">
              <ul className="flex flex-col space-y-2">
                {navigationItems.map((item) => (
                  <li key={item.name}>
                    <Link
                      className={clsx(
                        "flex items-center px-4 py-2 rounded-xl transition-all",
                        pathname === item.href
                          ? "bg-primary text-white font-medium"
                          : "text-text/80 hover:bg-primary/10 hover:text-text",
                      )}
                      href={item.href}
                    >
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>
      </header>

      {/* Espacio para que el contenido no quede debajo de la barra de navegación */}
      <div className="pt-24" />

      {/* Contenido principal */}
      <main className="flex-1 p-6">
        {/* Contenido de la página */}
        {children}
      </main>
    </div>
  );
}
