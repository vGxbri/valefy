"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react"; // Importar useSession
import { useRouter } from "next/navigation"; // Importar useRouter
import {
  Accordion,
  AccordionContainer,
  AccordionHeader,
  AccordionItem,
  AccordionPanel,
  AccordionWrapper,
} from '@/components/landing/premade/accordion';


import Aurora from "../components/landing/premade/Aurora";
import AuthModal from "../components/AuthModal";

import { ImageCarousel } from "@/components/landing/ImageCarousel";
import { Timeline } from "@/components/landing/Timeline";
import { getWeaponSkins, getRandomSkins, filterSkinsByBundleWithIcon, getBestDisplayIcon, getContentTiers } from "@/lib/valorantApi";
import { timelineData } from "@/components/landing/ProcessData";
import Navbar from "@/components/landing/Navbar";
// Fix: Update the import path for Footer
import Footer from "@/components/Footer";

// Interfaz para las skins con información del tier
interface SkinWithTier {
  skinIcon: string;
  skinName: string;
  contentTier: {
    id: string;
    nombre: string;
    color: string;
  };
}

export default function LandingPage() {
  const { data: session, status } = useSession(); // Obtener estado de la sesión
  const router = useRouter(); // Obtener el router
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  // Añadir estado para controlar la vista inicial del modal
  const [authModalView, setAuthModalView] = useState<"login" | "register">(
    "register",
  );
  const [carouselSkins1, setCarouselSkins1] = useState<SkinWithTier[]>([]);
  const [carouselSkins2, setCarouselSkins2] = useState<SkinWithTier[]>([]);

  // Cargar datos al montar el componente
  useEffect(() => {
    async function loadData() {
      try {
        // Obtenemos todas las skins y tiers
        const [allSkins, allTiers] = await Promise.all([
          getWeaponSkins(),
          getContentTiers()
        ]);

        // Aplicamos exactamente el mismo filtro que usa el catálogo y admin
        const filteredSkins = await filterSkinsByBundleWithIcon(allSkins);

        // Crear un mapa de tiers para búsquedas rápidas
        const tierMap = new Map(allTiers.map(tier => [tier.uuid, tier]));

        // Hacemos selección aleatoria manual y obtenemos información del tier
        const shuffled1 = [...filteredSkins].sort(() => 0.5 - Math.random());
        const shuffled2 = [...filteredSkins].sort(() => 0.5 - Math.random());
        
        const randomCarouselSkins1 = shuffled1.slice(0, Math.min(8, shuffled1.length));
        const randomCarouselSkins2 = shuffled2.slice(0, Math.min(8, shuffled2.length));

        // Convertir a formato con información del tier
        const processSkinsWithTier = (skins: typeof randomCarouselSkins1): SkinWithTier[] => {
          return skins
            .map((skin) => {
              const skinIcon = getBestDisplayIcon(skin);
              if (!skinIcon) return null;

              const tier = skin.contentTierUuid ? tierMap.get(skin.contentTierUuid) : null;
              
              return {
                skinIcon,
                skinName: skin.displayName,
                contentTier: {
                  id: skin.contentTierUuid || 'default',
                  nombre: tier?.displayName || 'Standard',
                  color: tier?.highlightColor ? `#${tier.highlightColor.substring(0, 6)}` : '#FFFFFF',
                }
              };
            })
            .filter((skin): skin is SkinWithTier => skin !== null);
        };

        setCarouselSkins1(processSkinsWithTier(randomCarouselSkins1));
        setCarouselSkins2(processSkinsWithTier(randomCarouselSkins2));
      } catch (error) {
        console.error("Error al cargar datos:", error);
      }
    }

    // Cargar datos independientemente del estado de autenticación, ya que el middleware maneja la redirección
    loadData();
  }, []); // Eliminar status y router de las dependencias

  // Función para abrir el modal con una vista específica
  const openAuthModal = (view: "login" | "register") => {
    setAuthModalView(view);
    setIsAuthModalOpen(true);
  };

  return (
    <section className="bg-background">
      <div className="">
        <Navbar />
        {/* Contenedor principal con altura fija */}
        <div className="relative overflow-hidden" id="inicio">
          {/* Contenedor del Aurora con altura y posición explícitas */}
          <div className="absolute inset-0 w-full" style={{ height: "100vh" }}>
            <Aurora
              amplitude={0.8}
              blend={0.8}
              colorStops={["#FC4E5B", "#FFFFFF", "#FC4E5B"]}
              speed={0.8}
            />
          </div>

          {/* Contenedor centrado para el título */}
          <div className="container mx-auto max-w-7xl px-4 sm:px-6 flex items-center justify-center relative h-full mt-32 sm:mt-48 md:mt-56 lg:mt-64">
            {/* Título y botón centrados */}
            <div className="flex flex-col items-center justify-center text-center max-w-xs sm:max-w-lg md:max-w-2xl lg:max-w-3xl">
              <h1 className="inline-block mb-4 sm:mb-6 text-wrap">
                <span className="tracking-tight inline font-bold text-3xl sm:text-4xl md:text-5xl lg:text-[5.4rem] !important leading-none">
                  Tu nuevo{" "}
                </span>
                <span className="tracking-tight inline font-bold text-3xl sm:text-4xl md:text-5xl lg:text-[5.4rem] !important leading-none text-primary text-shadow-lg">
                  mejor simulador{" "}
                </span>
                <span className="tracking-tight inline font-bold text-3xl sm:text-4xl md:text-5xl lg:text-[5.4rem] !important leading-none">
                  de cajas de Valorant
                </span>
              </h1>

              <button
                className="relative bg-primary text-white font-medium text-sm sm:text-base md:text-[17px] px-3 sm:px-4 py-[0.35em] pl-4 sm:pl-5 h-[2.5em] sm:h-[2.8em] rounded-[0.8em] sm:rounded-[0.9em] flex items-center overflow-hidden cursor-pointer shadow-[inset_0_0_1.6em_-0.6em_#0A141D] group"
                // Llamar a openAuthModal con 'register'
                onClick={() => openAuthModal("register")}
              >
                <span className="mr-8 sm:mr-10">Unirme ahora</span>
                <div className="absolute right-[0.3em] bg-white h-[1.9em] sm:h-[2.2em] w-[1.9em] sm:w-[2.2em] rounded-[0.6em] sm:rounded-[0.7em] flex items-center justify-center transition-all duration-300 group-hover:w-[calc(100%-0.6em)] shadow-[0.1em_0.1em_0.6em_0.2em_#d2d2d4] active:scale-95">
                  <svg
                    className="w-[0.9em] sm:w-[1.1em] transition-transform duration-300 text-[#7b52b9] group-hover:translate-x-[0.1em]"
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

          {/* Carruseles con skins aleatorias */}
          <div className="w-full overflow-hidden mt-32 sm:mt-40 md:mt-48 lg:mt-56 relative">
            {/* Separador visual superior */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-alternative/50 to-transparent" />

            <div className="mt-6 sm:mt-8 mb-3 sm:mb-4">
              <ImageCarousel
                direction="left"
                skins={carouselSkins1}
                speed={10}
              />
              <div className="my-0" />
              <ImageCarousel
                direction="right"
                skins={carouselSkins2}
                speed={10}
              />
            </div>

            {/* Separador visual inferior */}
            <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-alternative/50 to-transparent" />
          </div>
        </div>

        {/* Sección de Timeline */}
        <div
          className="py-8 sm:py-12 md:py-16"
          id="funcionamiento"
        >
          <div className="container mx-auto max-w-7xl px-4 sm:px-6 mb-6 sm:mb-8 md:mb-10" />

          <Timeline data={timelineData} />
        </div>

        {/* Sección de Preguntas Frecuentes */}
        <div
          className="py-8 sm:py-12 md:py-16 relative"
          id="faq"
        >
          {/* Separador visual superior */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-alternative/50 to-transparent" />

          <div className="container mx-auto max-w-6xl px-4 sm:px-6">
            <div className="text-center mb-8 sm:mb-10 md:mb-12">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4 text-white">
                Preguntas <span className="text-primary">Frecuentes</span>
              </h2>
              <p className="text-white/70 max-w-2xl mx-auto text-sm sm:text-base">
                Todo lo que necesitas saber sobre nosotros.
              </p>
            </div>
            <AccordionContainer className="md:grid-cols-2 grid-cols-1 gap-4 sm:gap-6">
              <AccordionWrapper>
                <Accordion>
                  <AccordionItem value="item-1">
                    <AccordionHeader className="text-sm sm:text-base 2xl:text-base">
                      ¿Cómo obtengo VP para abrir cajas?
                    </AccordionHeader>

                    <AccordionPanel className="text-sm sm:text-base 2xl:text-base">
                      <div className="space-y-3">
                        <p className="leading-relaxed text-white/90">
                          En Valefy obtienes VP (Valorant Points) de múltiples formas completamente gratuitas:
                        </p>
                        <ul className="space-y-2 ml-4">
                          <li className="flex items-start gap-2">
                            <span className="text-primary text-sm mt-1 flex-shrink-0">·</span>
                            <span><strong className="text-white">2000 VP de bienvenida:</strong> Al registrarte recibes VP inmediatamente para empezar.</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-primary text-sm mt-1 flex-shrink-0">·</span>
                            <span><strong className="text-white">Misiones diarias:</strong> Login diario (50 VP), abrir cajas (25-100 VP), conseguir skins específicas (100-250 VP).</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-primary text-sm mt-1 flex-shrink-0">·</span>
                            <span><strong className="text-white">Misiones especiales:</strong> Conseguir skins Ultra Edition (250 VP), eliminar duplicados (75 VP).</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-primary text-sm mt-1 flex-shrink-0">·</span>
                            <span><strong className="text-white">Renovación automática:</strong> Más de 15 misiones disponibles que se renuevan constantemente.</span>
                          </li>
                        </ul>
                      </div>
                    </AccordionPanel>
                  </AccordionItem>

                  <AccordionItem value="item-2">
                    <AccordionHeader className="text-sm sm:text-base 2xl:text-base">
                      ¿Qué tipos de cajas están disponibles y cuánto cuestan?
                    </AccordionHeader>

                    <AccordionPanel className="text-sm sm:text-base 2xl:text-base">
                      <div className="space-y-4">
                        <p className="leading-relaxed text-white/90">
                          Ofrecemos tres tipos de cajas con precios y probabilidades diferentes:
                        </p>
                        <div className="grid gap-3">
                          <div className="bg-gradient-to-r from-green-500/10 to-green-600/10 rounded-lg p-3 sm:p-4 border border-green-500/20">
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-2">
                              <h4 className="text-green-400 font-semibold text-sm sm:text-base">Caja Diaria</h4>
                              <span className="text-green-400 font-bold text-sm sm:text-base">GRATIS</span>
                            </div>
                            <p className="text-xs sm:text-sm text-white/80 mb-2">Se renueva automáticamente cada 24 horas</p>
                            <div className="text-xs text-white/70">
                              Probabilidades estándar: 55.17% Select, 26.91% Deluxe, 15.93% Premium, 1.99% Ultra
                            </div>
                          </div>
                          <div className="bg-gradient-to-r from-blue-500/10 to-blue-600/10 rounded-lg p-3 sm:p-4 border border-blue-500/20">
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-2">
                              <h4 className="text-blue-400 font-semibold text-sm sm:text-base">Caja Premium</h4>
                              <span className="text-blue-400 font-bold text-sm sm:text-base">100-500 VP</span>
                            </div>
                            <p className="text-xs sm:text-sm text-white/80 mb-2">Mejores probabilidades para tiers altos</p>
                            <div className="text-xs text-white/70">
                              Bonificación +15% para Premium y Ultra Edition
                            </div>
                          </div>
                          <div className="bg-gradient-to-r from-purple-500/10 to-purple-600/10 rounded-lg p-3 sm:p-4 border border-purple-500/20">
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-2">
                              <h4 className="text-purple-400 font-semibold text-sm sm:text-base">Caja Ultra</h4>
                              <span className="text-purple-400 font-bold text-sm sm:text-base">2000+ VP</span>
                            </div>
                            <p className="text-xs sm:text-sm text-white/80 mb-2">Máximas probabilidades y garantías</p>
                            <div className="text-xs text-white/70">
                              Garantía de tier Premium o superior + bonificación +25%
                            </div>
                          </div>
                        </div>
                      </div>
                    </AccordionPanel>
                  </AccordionItem>

                  <AccordionItem value="item-3">
                    <AccordionHeader className="text-sm sm:text-base 2xl:text-base">
                      ¿Las probabilidades son exactas a Valorant oficial?
                    </AccordionHeader>

                    <AccordionPanel className="text-sm sm:text-base 2xl:text-base">
                      <div className="space-y-4">
                        <p className="leading-relaxed text-white/90">
                          <strong>¡Absolutamente sí!</strong> Hemos replicado exactamente el sistema de probabilidades de Riot Games:
                        </p>
                        <div className="bg-gradient-to-r from-primary/10 to-purple-500/10 rounded-lg p-4 sm:p-5 border border-primary/20">
                          <h5 className="text-white font-semibold mb-3 text-center text-sm sm:text-base">Probabilidades Oficiales</h5>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                            <div className="flex justify-between items-center p-2 rounded bg-white/5">
                              <span className="text-gray-300 text-xs sm:text-sm">Select Edition</span>
                              <span className="text-white font-mono text-xs sm:text-sm font-bold">55.17%</span>
                            </div>
                            <div className="flex justify-between items-center p-2 rounded bg-white/5">
                              <span className="text-green-400 text-xs sm:text-sm">Deluxe Edition</span>
                              <span className="text-white font-mono text-xs sm:text-sm font-bold">26.91%</span>
                            </div>
                            <div className="flex justify-between items-center p-2 rounded bg-white/5">
                              <span className="text-blue-400 text-xs sm:text-sm">Premium Edition</span>
                              <span className="text-white font-mono text-xs sm:text-sm font-bold">15.93%</span>
                            </div>
                            <div className="flex justify-between items-center p-2 rounded bg-white/5">
                              <span className="text-purple-400 text-xs sm:text-sm">Ultra Edition</span>
                              <span className="text-white font-mono text-xs sm:text-sm font-bold">1.99%</span>
                            </div>
                          </div>
                        </div>
                        <div className="bg-primary/5 rounded-lg p-3 border border-primary/10">
                          <p className="text-primary text-xs sm:text-sm font-medium flex items-center gap-2">
                            <span>✓</span>
                            Usamos la API oficial de Riot Games para obtener todas las skins y sus clasificaciones
                          </p>
                        </div>
                      </div>
                    </AccordionPanel>
                  </AccordionItem>
                </Accordion>
              </AccordionWrapper>

              <AccordionWrapper>
                <Accordion>
                  <AccordionItem value="item-4">
                    <AccordionHeader className="text-sm sm:text-base 2xl:text-base">
                      ¿Puedo usar las skins en Valorant real?
                    </AccordionHeader>

                    <AccordionPanel className="text-sm sm:text-base 2xl:text-base">
                      <div className="space-y-4">
                        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 sm:p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-amber-400 text-base sm:text-lg">⚠️</span>
                            <span className="text-amber-200 font-medium text-sm sm:text-base">Importante:</span>
                          </div>
                          <p className="leading-relaxed text-white/90">
                            <strong>No</strong>, las skins obtenidas en Valefy son exclusivamente para el simulador. 
                            No están conectadas con tu cuenta de Valorant ni pueden transferirse al juego oficial.
                          </p>
                        </div>
                        <div className="space-y-3">
                          <p className="text-white/90 leading-relaxed">
                            Valefy es una <strong>experiencia independiente</strong> creada por fans para fans del juego, no está afiliada con Riot Games.
                          </p>
                        </div>
                      </div>
                    </AccordionPanel>
                  </AccordionItem>

                  <AccordionItem value="item-5">
                    <AccordionHeader className="text-sm sm:text-base 2xl:text-base">
                      ¿Qué estadísticas y características incluye?
                    </AccordionHeader>

                    <AccordionPanel className="text-sm sm:text-base 2xl:text-base">
                      <div className="space-y-4">
                        <p className="leading-relaxed text-white/90">
                          Valefy incluye un sistema completo de seguimiento y estadísticas en tiempo real:
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 rounded-lg p-3 sm:p-4 border border-blue-500/20">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-blue-400 text-xs sm:text-sm">📊</span>
                              <div className="text-blue-400 text-xs sm:text-sm font-medium">Estadísticas Detalladas</div>
                            </div>
                            <ul className="text-xs text-white/80 space-y-1">
                              <li>• Total de cajas abiertas</li>
                              <li>• VP gastados vs ganados</li>
                              <li>• Distribución por tiers</li>
                              <li>• Probabilidad personal vs esperada</li>
                            </ul>
                          </div>
                          <div className="bg-gradient-to-br from-green-500/10 to-green-600/10 rounded-lg p-3 sm:p-4 border border-green-500/20">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-green-400 text-xs sm:text-sm">📦</span>
                              <div className="text-green-400 text-xs sm:text-sm font-medium">Gestión de Inventario</div>
                            </div>
                            <ul className="text-xs text-white/80 space-y-1">
                              <li>• Filtrado por tier, arma, bundle</li>
                              <li>• Eliminación de duplicados</li>
                              <li>• Indicador de skins nuevas</li>
                              <li>• Búsqueda avanzada</li>
                            </ul>
                          </div>
                          <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 rounded-lg p-3 sm:p-4 border border-purple-500/20">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-purple-400 text-xs sm:text-sm">🎯</span>
                              <div className="text-purple-400 text-xs sm:text-sm font-medium">Sistema de Misiones</div>
                            </div>
                            <ul className="text-xs text-white/80 space-y-1">
                              <li>• 15+ misiones activas simultáneas</li>
                              <li>• Renovación automática diaria</li>
                              <li>• Progreso en tiempo real</li>
                              <li>• Recompensas de 25-500 VP</li>
                            </ul>
                          </div>
                          <div className="bg-gradient-to-br from-red-500/10 to-red-600/10 rounded-lg p-3 sm:p-4 border border-red-500/20">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-red-400 text-xs sm:text-sm">⚡</span>
                              <div className="text-red-400 text-xs sm:text-sm font-medium">Características Técnicas</div>
                            </div>
                            <ul className="text-xs text-white/80 space-y-1">
                              <li>• Apertura múltiple (hasta 5 cajas)</li>
                              <li>• Animaciones realistas de 12s</li>
                              <li>• 1000+ skins de la API oficial</li>
                              <li>• Guardado automático en tiempo real</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </AccordionPanel>
                  </AccordionItem>

                  <AccordionItem value="item-6">
                    <AccordionHeader className="text-sm sm:text-base 2xl:text-base">
                      ¿Es completamente gratis? ¿Hay límites o pagos ocultos?
                    </AccordionHeader>

                    <AccordionPanel className="text-sm sm:text-base 2xl:text-base">
                      <div className="space-y-4">
                        <div className="bg-gradient-to-r from-green-500/10 to-green-600/10 rounded-lg p-3 sm:p-4 border border-green-500/20 text-center">
                          <div className="text-xl sm:text-2xl font-bold text-green-400 mb-1">100% GRATUITO</div>
                          <p className="text-green-300 text-xs sm:text-sm">Sin pagos, sin límites, sin trucos</p>
                        </div>
                        
                        <div className="space-y-3">
                          <p className="text-white/90 leading-relaxed">
                            <strong>Valefy es completamente gratuito</strong> y siempre lo será. No hay costos ocultos ni limitaciones.
                          </p>
                          <p className="text-white/90 leading-relaxed">
                            <strong>Nuestro objetivo:</strong> Proporcionar una experiencia auténtica y divertida sin barreras económicas.
                          </p>
                        </div>
                      </div>
                    </AccordionPanel>
                  </AccordionItem>
                </Accordion>
              </AccordionWrapper>
            </AccordionContainer>
          </div>
        </div>

        {/* Añadimos el Footer */}
        <Footer />
      </div>

      {/* Modal de autenticación - Pasar initialView */}
      <AuthModal
        initialView={authModalView}
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </section>
  );
}
