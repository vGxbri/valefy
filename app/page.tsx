"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react"; // Importar useSession
import { useRouter } from "next/navigation"; // Importar useRouter
import { Accordion, AccordionItem } from "@heroui/react";

import Aurora from "../components/landing/premade/Aurora";
import AuthModal from "../components/AuthModal";

import { ImageCarousel } from "@/components/landing/ImageCarousel";
import { Timeline } from "@/components/landing/Timeline";
import { getWeaponSkins, getRandomSkins } from "@/lib/valorantApi";
import { timelineData } from "@/components/landing/ProcessData";
import Navbar from "@/components/landing/Navbar";
// Fix: Update the import path for Footer
import Footer from "@/components/Footer";

export default function LandingPage() {
  const { data: session, status } = useSession(); // Obtener estado de la sesión
  const router = useRouter(); // Obtener el router
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  // Añadir estado para controlar la vista inicial del modal
  const [authModalView, setAuthModalView] = useState<"login" | "register">(
    "register",
  );
  const [carouselImages1, setCarouselImages1] = useState<string[]>([]);
  const [carouselImages2, setCarouselImages2] = useState<string[]>([]);

  // Cargar datos al montar el componente
  useEffect(() => {
    async function loadData() {
      try {
        // Obtenemos todas las skins y filtramos las que no tienen icono o son "random favorite"
        const allSkins = (await getWeaponSkins()).filter(
          (skin) =>
            skin.displayIcon &&
            !skin.displayName.toLowerCase().includes("random favorite skin"),
        );

        // Obtenemos skins aleatorias para el grid
        const randomGridSkins = getRandomSkins(allSkins, 6);

        // Obtenemos skins aleatorias para los carruseles (diferentes a las del grid)
        const randomCarouselSkins1 = getRandomSkins(allSkins, 8);
        const randomCarouselSkins2 = getRandomSkins(allSkins, 8);

        // Extraemos solo las URLs de los iconos para el carrusel
        setCarouselImages1(
          randomCarouselSkins1.map((skin) => skin.displayIcon),
        );
        setCarouselImages2(
          randomCarouselSkins2.map((skin) => skin.displayIcon),
        );
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
          <div className="container mx-auto max-w-7xl px-6 flex items-center justify-center relative h-full mt-60">
            {/* Título y botón centrados */}
            <div className="flex flex-col items-center justify-center text-center max-w-3xl">
              <h1 className="inline-block mb-6 text-wrap">
                <span className="tracking-tight inline font-bold text-[5rem] !important leading-none">
                  Tu nuevo{" "}
                </span>
                <span className="tracking-tight inline font-bold text-[5rem] !important leading-none text-primary text-shadow-lg">
                  mejor simulador{" "}
                </span>
                <span className="tracking-tight inline font-bold text-[5rem] !important leading-none">
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
          <div className="w-full overflow-hidden mt-44 relative">
            {/* Separador visual superior */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-alternative/50 to-transparent" />

            <div className="mt-4 mb-4">
              <ImageCarousel
                direction="left"
                images={carouselImages1}
                speed={10}
              />
              <ImageCarousel
                direction="right"
                images={carouselImages2}
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
              className="gap-4"
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
                        duration: 0.4,
                      },
                      opacity: {
                        duration: 0.4,
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
                aria-label="¿Qué es Valefy?"
                classNames={{
                  base: "border border-white/10 bg-background/40 backdrop-blur-md rounded-xl mb-4",
                  title: "text-white font-medium",
                  trigger: "px-5 py-4 data-[hover=true]:bg-white/5 rounded-xl",
                  indicator: "text-primary",
                  content: "px-5 pb-4 text-white/80",
                }}
                title="¿Qué es Valefy?"
              >
                <div className="text-white/80">
                  <p>
                    Valefy es un simulador de cajas de Valorant que te permite
                    experimentar la emoción de abrir cajas y obtener skins sin
                    gastar dinero real. Nuestra plataforma ofrece una
                    experiencia auténtica y divertida para los fans del juego.
                  </p>
                </div>
              </AccordionItem>

              <AccordionItem
                key="2"
                aria-label="¿Cómo funciona el simulador?"
                classNames={{
                  base: "border border-white/10 bg-background/40 backdrop-blur-md rounded-xl mb-4",
                  title: "text-white font-medium",
                  trigger: "px-5 py-4 data-[hover=true]:bg-white/5 rounded-xl",
                  indicator: "text-primary",
                  content: "px-5 pb-4 text-white/80",
                }}
                title="¿Cómo funciona el simulador?"
              >
                <div className="text-white/80">
                  <p>
                    Nuestro simulador utiliza los mismos porcentajes y mecánicas
                    que el juego original. Puedes abrir cajas, coleccionar skins
                    y disfrutar de la experiencia sin riesgos. Además, ofrecemos
                    estadísticas detalladas sobre tus aperturas.
                  </p>
                </div>
              </AccordionItem>

              <AccordionItem
                key="3"
                aria-label="¿Es gratis usar Valefy?"
                classNames={{
                  base: "border border-white/10 bg-background/40 backdrop-blur-md rounded-xl mb-4",
                  title: "text-white font-medium",
                  trigger: "px-5 py-4 data-[hover=true]:bg-white/5 rounded-xl",
                  indicator: "text-primary",
                  content: "px-5 pb-4 text-white/80",
                }}
                title="¿Es gratis usar Valefy?"
              >
                <div className="text-white/80">
                  <p>
                    ¡Sí! Valefy es completamente gratuito. Ofrecemos una
                    experiencia premium sin costo alguno. En el futuro,
                    podríamos añadir características opcionales de pago, pero la
                    funcionalidad principal siempre será gratuita.
                  </p>
                </div>
              </AccordionItem>

              <AccordionItem
                key="4"
                aria-label="¿Las skins obtenidas se pueden usar en Valorant?"
                classNames={{
                  base: "border border-white/10 bg-background/40 backdrop-blur-md rounded-xl mb-4",
                  title: "text-white font-medium",
                  trigger: "px-5 py-4 data-[hover=true]:bg-white/5 rounded-xl",
                  indicator: "text-primary",
                  content: "px-5 pb-4 text-white/80",
                }}
                title="¿Las skins obtenidas se pueden usar en Valorant?"
              >
                <div className="text-white/80">
                  <p>
                    No, las skins obtenidas en Valefy son solo para el
                    simulador. No están conectadas con tu cuenta real de
                    Valorant ni pueden transferirse al juego. Valefy es una
                    experiencia independiente no afiliada con Riot Games.
                  </p>
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
