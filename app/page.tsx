"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react"; // Importar useSession
import { useRouter } from "next/navigation"; // Importar useRouter
import { Accordion, AccordionItem } from "@heroui/react";

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
          <div className="container mx-auto max-w-7xl px-6 flex items-center justify-center relative h-full mt-64">
            {/* Título y botón centrados */}
            <div className="flex flex-col items-center justify-center text-center max-w-3xl">
              <h1 className="inline-block mb-6 text-wrap">
                <span className="tracking-tight inline font-bold text-[5.4rem] !important leading-none">
                  Tu nuevo{" "}
                </span>
                <span className="tracking-tight inline font-bold text-[5.4rem] !important leading-none text-primary text-shadow-lg">
                  mejor simulador{" "}
                </span>
                <span className="tracking-tight inline font-bold text-[5.4rem] !important leading-none">
                  de cajas de Valorant
                </span>
              </h1>

              <button
                className="relative bg-primary text-white font-medium text-[17px] px-4 py-[0.35em] pl-5 h-[2.8em] rounded-[0.9em] flex items-center overflow-hidden cursor-pointer shadow-[inset_0_0_1.6em_-0.6em_#0A141D] group"
                // Llamar a openAuthModal con 'register'
                onClick={() => openAuthModal("register")}
              >
                <span className="mr-10">Unirme ahora</span>
                <div className="absolute right-[0.3em] bg-white h-[2.2em] w-[2.2em] rounded-[0.7em] flex items-center justify-center transition-all duration-300 group-hover:w-[calc(100%-0.6em)] shadow-[0.1em_0.1em_0.6em_0.2em_#d2d2d4] active:scale-95">
                  <svg
                    className="w-[1.1em] transition-transform duration-300 text-[#7b52b9] group-hover:translate-x-[0.1em]"
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
          <div className="w-full overflow-hidden mt-56 relative">
            {/* Separador visual superior */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-alternative/50 to-transparent" />

            <div className="mt-8 mb-4">
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
          className="py-16 bg-gradient-to-b from-background to-background/90"
          id="funcionamiento"
        >
          <div className="container mx-auto max-w-7xl px-6 mb-10" />

          <Timeline data={timelineData} />
        </div>

        {/* Sección de Preguntas Frecuentes */}
        <div
          className="py-16 bg-gradient-to-b from-background/90 to-background/95 relative"
          id="faq"
        >
          {/* Separador visual superior */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-alternative/50 to-transparent" />

          <div className="container mx-auto max-w-4xl px-6">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold mb-4 text-white">
                Preguntas <span className="text-primary">Frecuentes</span>
              </h2>
              <p className="text-white/70 max-w-2xl mx-auto">
                Todo lo que necesitas saber sobre nuestro simulador de cajas
              </p>
            </div>

            <Accordion
              className="gap-6"
              motionProps={{
                variants: {
                  enter: {
                    y: 0,
                    opacity: 1,
                    height: "auto",
                    transition: {
                      height: {
                        type: "spring",
                        stiffness: 500,
                        damping: 30,
                        duration: 0.5,
                      },
                      opacity: {
                        duration: 0.5,
                      },
                    },
                  },
                  exit: {
                    y: -10,
                    opacity: 0,
                    height: 0,
                    transition: {
                      height: {
                        duration: 0.3,
                      },
                      opacity: {
                        duration: 0.3,
                      },
                    },
                  },
                },
              }}
              variant="light"
            >
              <AccordionItem
                key="1"
                aria-label="¿Cómo obtengo VP para abrir cajas?"
                classNames={{
                  base: "border border-white/20 bg-gradient-to-br from-background/60 via-background/40 to-background/60 backdrop-blur-xl rounded-2xl mb-6 shadow-2xl shadow-primary/5 hover:shadow-primary/10 transition-all duration-500 hover:border-primary/30",
                  title: "text-white font-semibold text-lg",
                  trigger: "px-6 py-5 data-[hover=true]:bg-white/5 rounded-2xl transition-all duration-300",
                  indicator: "text-primary text-xl",
                  content: "px-6 pb-6 text-white/80 text-base leading-relaxed",
                }}
                title="🎯 ¿Cómo obtengo VP para abrir cajas?"
              >
                <div className="text-white/80 space-y-3">
                  <p className="leading-relaxed">
                    En Valefy obtienes VP (Valorant Points) de múltiples formas:
                  </p>
                  <ul className="space-y-2 ml-4">
                    <li className="flex items-start gap-2">
                      <span className="text-primary text-sm mt-1">▪</span>
                      <span><strong className="text-white">Misiones diarias:</strong> Completa objetivos como abrir cajas, conseguir skins de ciertos tiers</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary text-sm mt-1">▪</span>
                      <span><strong className="text-white">Cajas diarias gratis:</strong> Obtén VP directamente al abrir tus cajas gratuitas</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary text-sm mt-1">▪</span>
                      <span><strong className="text-white">Eventos especiales:</strong> Participa en eventos temporales con recompensas adicionales</span>
                    </li>
                  </ul>
                </div>
              </AccordionItem>

              <AccordionItem
                key="2"
                aria-label="¿Qué tipos de cajas están disponibles?"
                classNames={{
                  base: "border border-white/20 bg-gradient-to-br from-background/60 via-background/40 to-background/60 backdrop-blur-xl rounded-2xl mb-6 shadow-2xl shadow-primary/5 hover:shadow-primary/10 transition-all duration-500 hover:border-primary/30",
                  title: "text-white font-semibold text-lg",
                  trigger: "px-6 py-5 data-[hover=true]:bg-white/5 rounded-2xl transition-all duration-300",
                  indicator: "text-primary text-xl",
                  content: "px-6 pb-6 text-white/80 text-base leading-relaxed",
                }}
                title="📦 ¿Qué tipos de cajas están disponibles?"
              >
                <div className="text-white/80 space-y-4">
                  <p className="leading-relaxed">
                    Ofrecemos tres tipos de cajas con diferentes probabilidades y costos:
                  </p>
                  <div className="grid gap-3">
                    <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                      <h4 className="text-green-400 font-semibold">Cajas Diarias (Gratis)</h4>
                      <p className="text-sm text-white/70">Una caja gratis cada día con probabilidades estándar</p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                      <h4 className="text-blue-400 font-semibold">Cajas Premium (100-500 VP)</h4>
                      <p className="text-sm text-white/70">Mejores probabilidades de conseguir skins raras</p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                      <h4 className="text-purple-400 font-semibold">Cajas Ultra (1000+ VP)</h4>
                      <p className="text-sm text-white/70">Las mejores probabilidades para skins legendarias</p>
                    </div>
                  </div>
                </div>
              </AccordionItem>

              <AccordionItem
                key="3"
                aria-label="¿Las probabilidades son las mismas que en Valorant?"
                classNames={{
                  base: "border border-white/20 bg-gradient-to-br from-background/60 via-background/40 to-background/60 backdrop-blur-xl rounded-2xl mb-6 shadow-2xl shadow-primary/5 hover:shadow-primary/10 transition-all duration-500 hover:border-primary/30",
                  title: "text-white font-semibold text-lg",
                  trigger: "px-6 py-5 data-[hover=true]:bg-white/5 rounded-2xl transition-all duration-300",
                  indicator: "text-primary text-xl",
                  content: "px-6 pb-6 text-white/80 text-base leading-relaxed",
                }}
                title="🎲 ¿Las probabilidades son las mismas que en Valorant?"
              >
                <div className="text-white/80 space-y-3">
                  <p className="leading-relaxed">
                    ¡Sí! Hemos replicado fielmente el sistema de probabilidades de Valorant:
                  </p>
                  <div className="bg-gradient-to-r from-primary/10 to-purple-500/10 rounded-lg p-4 border border-primary/20">
                    <ul className="space-y-2">
                      <li className="flex justify-between">
                        <span className="text-gray-300">Select (Blanco)</span>
                        <span className="text-white font-mono">55.17%</span>
                      </li>
                      <li className="flex justify-between">
                        <span className="text-green-400">Deluxe (Verde)</span>
                        <span className="text-white font-mono">26.91%</span>
                      </li>
                      <li className="flex justify-between">
                        <span className="text-blue-400">Premium (Azul)</span>
                        <span className="text-white font-mono">15.93%</span>
                      </li>
                      <li className="flex justify-between">
                        <span className="text-purple-400">Ultra (Morado)</span>
                        <span className="text-white font-mono">1.99%</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </AccordionItem>

              <AccordionItem
                key="4"
                aria-label="¿Puedo usar las skins en el juego real?"
                classNames={{
                  base: "border border-white/20 bg-gradient-to-br from-background/60 via-background/40 to-background/60 backdrop-blur-xl rounded-2xl mb-6 shadow-2xl shadow-primary/5 hover:shadow-primary/10 transition-all duration-500 hover:border-primary/30",
                  title: "text-white font-semibold text-lg",
                  trigger: "px-6 py-5 data-[hover=true]:bg-white/5 rounded-2xl transition-all duration-300",
                  indicator: "text-primary text-xl",
                  content: "px-6 pb-6 text-white/80 text-base leading-relaxed",
                }}
                title="🎮 ¿Puedo usar las skins en el juego real?"
              >
                <div className="text-white/80 space-y-3">
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
                    <p className="text-amber-200 font-medium mb-2">⚠️ Importante:</p>
                    <p className="leading-relaxed">
                      <strong>No</strong>, las skins obtenidas en Valefy son exclusivamente para el simulador. 
                      No están conectadas con tu cuenta de Valorant ni pueden transferirse al juego.
                    </p>
                  </div>
                  <p className="text-sm text-white/60 leading-relaxed">
                    Valefy es una experiencia independiente creada por fans para fans. 
                    No estamos afiliados con Riot Games. El objetivo es disfrutar de la 
                    emoción de abrir cajas sin riesgo financiero.
                  </p>
                </div>
              </AccordionItem>

              <AccordionItem
                key="5"
                aria-label="¿Hay estadísticas de mis aperturas?"
                classNames={{
                  base: "border border-white/20 bg-gradient-to-br from-background/60 via-background/40 to-background/60 backdrop-blur-xl rounded-2xl mb-6 shadow-2xl shadow-primary/5 hover:shadow-primary/10 transition-all duration-500 hover:border-primary/30",
                  title: "text-white font-semibold text-lg",
                  trigger: "px-6 py-5 data-[hover=true]:bg-white/5 rounded-2xl transition-all duration-300",
                  indicator: "text-primary text-xl",
                  content: "px-6 pb-6 text-white/80 text-base leading-relaxed",
                }}
                title="📊 ¿Hay estadísticas de mis aperturas?"
              >
                <div className="text-white/80 space-y-3">
                  <p className="leading-relaxed">
                    ¡Por supuesto! Valefy incluye un sistema completo de estadísticas:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                      <div className="text-primary text-sm font-medium">📈 Historial</div>
                      <div className="text-xs text-white/70">Todas tus aperturas registradas</div>
                    </div>
                    <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                      <div className="text-primary text-sm font-medium">🎯 Probabilidades</div>
                      <div className="text-xs text-white/70">Tu suerte personal vs esperada</div>
                    </div>
                    <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                      <div className="text-primary text-sm font-medium">💰 VP gastados</div>
                      <div className="text-xs text-white/70">Total invertido en cajas</div>
                    </div>
                    <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                      <div className="text-primary text-sm font-medium">🏆 Logros</div>
                      <div className="text-xs text-white/70">Desbloquea achievements</div>
                    </div>
                  </div>
                </div>
              </AccordionItem>
            </Accordion>
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
