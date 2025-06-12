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
          {/* Contenedor del Aurora con altura y posición explícitas - Solo visible en pantallas XL+ (1280px+) */}
          <div className="absolute inset-0 w-full hidden xl:block" style={{ height: "calc(100vh + 100px)" }}>
            <Aurora
              amplitude={0.8}
              blend={0.8}
              colorStops={["#FC4E5B", "#FFFFFF", "#FC4E5B"]}
              speed={0.8}
            />
          </div>

          {/* Fondo alternativo para dispositivos menores a 1280px */}
          <div className="absolute inset-0 w-full xl:hidden bg-gradient-to-br from-background via-backgroundAlt/30 to-background" style={{ height: "calc(100vh + 100px)" }} />

          {/* Contenedor centrado para el título */}
          <div className="container mx-auto max-w-7xl px-4 sm:px-6 flex items-center justify-center relative mt-28 sm:mt-36 md:mt-36 lg:mt-48 xl:mt-48 2xl:mt-56">
            {/* Título y botón centrados */}
            <div className="flex flex-col items-center justify-center text-center max-w-xs sm:max-w-lg md:max-w-2xl lg:max-w-3xl px-2 sm:px-0">
              <h1 className="mb-4 sm:mb-4 md:mb-4 lg:mb-6 xl:mb-8 sm:space-y-[-0.8rem] md:space-y-[-1rem] lg:space-y-[-1.5rem] xl:space-y-[-1.5rem]">
                {/* Primera línea */}
                <div className="tracking-tight font-bold text-[2rem] sm:text-[3rem] md:text-[3.6rem] lg:text-[4.8rem] xl:text-[5.4rem] leading-tight">
                  Tu nuevo{" "}
                  <span className="text-primary text-shadow-lg">mejor</span>
                </div>
                {/* Segunda línea */}
                <div className="tracking-tight font-bold text-[2rem] sm:text-[3rem] md:text-[3.6rem] lg:text-[4.8rem] xl:text-[5.4rem] leading-tight">
                  <span className="text-primary text-shadow-lg">simulador</span> de cajas
                </div>
                {/* Tercera línea */}
                <div className="tracking-tight font-bold text-[2rem] sm:text-[3rem] md:text-[3.6rem] lg:text-[4.8rem] xl:text-[5.4rem] leading-tight">
                  de Valorant
                </div>
              </h1>

              <button
                className="relative bg-primary text-white font-medium text-sm sm:text-base md:text-[17px] px-3 sm:px-6 py-[0.35em] sm:py-[0.4em] pl-4 sm:pl-6 h-[2.3em] sm:h-[3em] md:h-[2.8em] rounded-[0.8em] sm:rounded-[1em] md:rounded-[0.9em] flex items-center overflow-hidden cursor-pointer shadow-[inset_0_0_1.6em_-0.6em_#0A141D] group w-full max-w-[150px] sm:max-w-none sm:w-auto"
                // Llamar a openAuthModal con 'register'
                onClick={() => openAuthModal("register")}
              >
                <span className="mr-6 sm:mr-10">Unirme ahora</span>
                <div className="absolute right-[0.3em] bg-white h-[1.7em] sm:h-[2.4em] md:h-[2.2em] w-[1.7em] sm:w-[2.4em] md:w-[2.2em] rounded-[0.6em] sm:rounded-[0.8em] md:rounded-[0.7em] flex items-center justify-center transition-all duration-300 group-hover:w-[calc(100%-0.6em)] shadow-[0.1em_0.1em_0.6em_0.2em_#d2d2d4] active:scale-95">
                    <svg className="w-[0.9em] sm:w-[1.1em] transition-transform duration-300 text-[#7b52b9] group-hover:translate-x-[0.1em]"
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
          <div className="w-full overflow-hidden mt-16 sm:mt-20 md:mt-24 lg:mt-32 xl:mt-40 relative">
            {/* Separador visual superior */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-alternative/50 to-transparent" />

            <div className="mt-4 sm:mt-6 md:mt-8 mb-3 sm:mb-4">
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
          className="py-8 sm:py-12 md:py-16 lg:py-20 xl:py-24"
          id="funcionamiento"
        >
          <div className="container mx-auto max-w-7xl px-4 sm:px-6 mb-6 sm:mb-8 md:mb-10 lg:mb-12" />

          <Timeline data={timelineData} />
        </div>

        {/* Sección de Preguntas Frecuentes */}
        <div
          className="py-8 sm:py-12 md:py-16 lg:py-20 xl:py-24 relative"
          id="faq"
        >
          {/* Separador visual superior */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-alternative/50 to-transparent" />

          <div className="container mx-auto max-w-6xl px-4 sm:px-6">
            <div className="text-center mb-8 sm:mb-10 md:mb-12 lg:mb-14 xl:mb-16">
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-3 sm:mb-4 md:mb-5 lg:mb-6 text-white">
                Preguntas <span className="text-primary">Frecuentes</span>
              </h2>
              <p className="text-white/70 max-w-2xl mx-auto text-sm sm:text-base md:text-lg lg:text-xl px-4 sm:px-0">
                Todo lo que necesitas saber sobre nosotros.
              </p>
            </div>
            <AccordionContainer className="lg:grid-cols-2 grid-cols-1 gap-4 sm:gap-6 md:gap-8 lg:gap-10">
              <AccordionWrapper>
                <Accordion>
                  <AccordionItem value="item-1">
                    <AccordionHeader className="text-base sm:text-lg md:text-base lg:text-lg 2xl:text-base">
                      ¿Cómo obtengo VP para abrir cajas?
                    </AccordionHeader>

                    <AccordionPanel className="text-sm sm:text-base md:text-sm lg:text-base 2xl:text-base">
                      <div className="space-y-3 sm:space-y-4">
                        <p className="leading-relaxed text-white/90">
                          En Valefy obtienes VP (Valorant Points) de múltiples formas completamente gratuitas:
                        </p>
                        <ul className="space-y-3 sm:space-y-2 ml-4">
                          <li className="flex items-start gap-2">
                            <span className="text-primary text-sm mt-1 flex-shrink-0">·</span>
                            <span><strong className="text-white">2000 VP de bienvenida:</strong> Al registrarte recibes VP inmediatamente para empezar.</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-primary text-sm mt-1 flex-shrink-0">·</span>
                            <span><strong className="text-white">Misiones:</strong> Actualmente existen más de 100 misiones que puedes completar para obtener VP.</span>
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
                    <AccordionHeader className="text-base sm:text-lg md:text-base lg:text-lg 2xl:text-base">
                      ¿Cómo se mantiene Valefy?
                    </AccordionHeader>

                    <AccordionPanel className="text-sm sm:text-base md:text-sm lg:text-base 2xl:text-base">
                      <div className="space-y-4">
                        <div className="space-y-3 sm:space-y-1">
                          <p className="text-white/90 leading-relaxed">
                            Valefy es una aplicación sin ánimo de lucro y un proyecto de TFG.
                          </p>
                          <p className="text-white/90 leading-relaxed">
                            También aceptamos <strong>donaciones voluntarias</strong> de usuarios que deseen apoyar el desarrollo y mantenimiento del simulador. ¡Cada contribución ayuda a mantener Valefy funcionando y mejorando!
                          </p>
                        </div>
                      </div>
                    </AccordionPanel>
                  </AccordionItem>

                  <AccordionItem value="item-3">
                    <AccordionHeader className="text-base sm:text-lg md:text-base lg:text-lg 2xl:text-base">
                      ¿Planeáis añadir más características en el futuro?
                    </AccordionHeader>

                    <AccordionPanel className="text-sm sm:text-base md:text-sm lg:text-base 2xl:text-base">
                      <div className="space-y-3 sm:space-y-1">
                        <div className="flex items-center gap-2 mb-3 sm:mb-2">
                          <span className="font-bold text-base sm:text-lg md:text-base">¡Estamos explorando opciones!</span>
                        </div>
                        <p className="leading-relaxed text-white/90">
                          Actualmente, Valefy es un proyecto de TFG y estamos enfocados en la estabilidad y optimización de 
                          las características existentes. Si bien tenemos muchas ideas para el futuro, como batallas de cajas, tradeo,
                          aún no podemos confirmar su implementación ni asegurar su mantenimiento a largo plazo. 
                          ¡Agradecemos tu paciencia y apoyo!
                        </p>
                      </div>
                    </AccordionPanel>
                  </AccordionItem>
                </Accordion>
              </AccordionWrapper>

              <AccordionWrapper>
                <Accordion>
                  <AccordionItem value="item-4">
                    <AccordionHeader className="text-base sm:text-lg md:text-base lg:text-lg 2xl:text-base">
                      ¿Puedo usar las skins en Valorant real?
                    </AccordionHeader>

                    <AccordionPanel className="text-sm sm:text-base md:text-sm lg:text-base 2xl:text-base">
                      <div className="space-y-4">
                        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 sm:p-3 md:p-4">
                          <div className="flex items-center gap-2 mb-3 sm:mb-2">
                            <span className="text-amber-400 text-lg sm:text-base md:text-lg">⚠️</span>
                            <span className="text-amber-200 font-medium text-base sm:text-sm md:text-base">Importante:</span>
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
                    <AccordionHeader className="text-base sm:text-lg md:text-base lg:text-lg 2xl:text-base">
                      ¿Qué hago si encuentro un error o bug en la aplicación?
                    </AccordionHeader>

                    <AccordionPanel className="text-sm sm:text-base md:text-sm lg:text-base 2xl:text-base">
                      <div className="space-y-4">
                        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 sm:p-3 md:p-4">
                          <div className="flex items-center gap-2 mb-3 sm:mb-2">
                            <span className="text-amber-400 text-lg sm:text-base md:text-lg">💡</span>
                            <span className="text-amber-200 font-medium text-base sm:text-sm md:text-base">¡Tu ayuda es valiosa!</span>
                          </div>
                          <p className="leading-relaxed text-white/90">
                            Si encuentras algún error, bug o tienes sugerencias para mejorar Valefy, por favor, no dudes en ponerte en contacto con nosotros. Puedes hacerlo a través de nuestro correo electrónico de soporte o nuestras redes sociales.
                          </p>
                        </div>
                      </div>
                    </AccordionPanel>
                  </AccordionItem>

                  <AccordionItem value="item-6">
                    <AccordionHeader className="text-base sm:text-lg md:text-base lg:text-lg 2xl:text-base">
                      ¿Es completamente gratis? ¿Hay límites o pagos ocultos?
                    </AccordionHeader>

                    <AccordionPanel className="text-sm sm:text-base md:text-sm lg:text-base 2xl:text-base">
                      <div className="space-y-4">
                        <div className="bg-gradient-to-r from-green-500/10 to-green-600/10 rounded-lg p-4 sm:p-3 md:p-4 border border-green-500/20 text-center">
                          <div className="text-xl sm:text-2xl font-bold text-green-400 mb-2 sm:mb-1">100% GRATUITO</div>
                          <p className="text-green-300 text-sm sm:text-xs md:text-sm">Sin pagos, sin límites, sin trucos</p>
                        </div>
                        
                        <div className="space-y-3 sm:space-y-1">
                          <p className="text-white/90 leading-relaxed">
                            <strong>Valefy es completamente gratuito</strong> y siempre lo será. No hay costos ocultos ni limitaciones.
                          </p>
                          <p className="text-white/90 leading-relaxed">
                            Nuestro objetivo es proporcionar una experiencia auténtica y divertida sin barreras económicas.
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
