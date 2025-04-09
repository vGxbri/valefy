import Image from "next/image";
import { title, subtitle } from "@/components/primitives";
import { ImageCarousel } from "@/components/landing/ImageCarousel";
import Aurora from './ui/Aurora';
import {Button} from "@heroui/react";
import { Timeline } from "@/components/landing/Timeline";

import { getWeaponSkins } from "@/lib/valorantApi";
import { getRandomSkins } from "@/lib/valorantApi";

// Pasos del proceso
// Reemplaza la sección de processSteps con esto:

// Pasos del proceso con contenido enriquecido
const processSteps = [
  {
    title: "Regístrate / Inicia Sesión",
    description: "Rápido y fácil, sin complicaciones. Usa tu cuenta de Riot Games o crea una nueva cuenta en Valefy.",
    icon: "🔐",
    color: "from-primary to-secondary",
    delay: "0ms",
    image: "/images/register.jpg", // Añade imágenes representativas
    features: [
      "Registro con un solo clic usando tu cuenta de Riot",
      "Verificación de correo electrónico instantánea",
      "Proceso de registro seguro y encriptado",
      "Recuperación de contraseña sencilla"
    ]
  },
  {
    title: "Explora y Abre Cajas",
    description: "¡Siente la emoción de descubrir tu skin con nuestra animación de apertura! Cada caja tiene una experiencia única de desbloqueo.",
    icon: "✨",
    color: "from-primary to-secondary",
    delay: "300ms",
    image: "/images/open-box.jpg",
    features: [
      "Amplia variedad de cajas temáticas",
      "Animaciones espectaculares de apertura",
      "Efectos de sonido inmersivos",
      "Celebraciones especiales para skins raras",
      "Compartir resultados en redes sociales"
    ]
  },
  {
    title: "Retira tu Skin o Usa tu Saldo",
    description: "Añade la skin a tu inventario de Valorant a través de nuestro sistema de intercambio seguro o usa el valor para seguir abriendo cajas.",
    icon: "🎮",
    color: "from-primary to-secondary",
    delay: "450ms",
    image: "/images/claim-skin.jpg",
    features: [
      "Transferencia segura a tu cuenta de Valorant",
      "Sistema de intercambio verificado por Riot",
      "Historial detallado de transacciones",
      "Opciones flexibles de uso de saldo"
    ]
  },
];

// Datos para el Timeline con contenido enriquecido y diferenciado
const timelineData = processSteps.map((step, index) => ({
  title: step.title,
  content: (
    <>
      {/* Paso 1: Registro - Diseño de tarjeta con gradiente */}
      {index === 0 && (
        <div className="bg-gradient-to-br from-background/90 to-background/70 backdrop-blur-sm p-8 rounded-2xl border-l-4 border-primary shadow-lg transition-all duration-500 hover:shadow-primary/20">
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-4">
              <div className="text-5xl bg-primary/10 p-4 rounded-full">{step.icon}</div>
              <div>
                <h4 className="text-2xl font-bold text-white mb-2">{step.title}</h4>
                <p className="text-white/70 leading-relaxed">{step.description}</p>
              </div>
            </div>
            
            <div className="relative w-full h-64 md:h-80 rounded-xl overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-primary/30 to-background/90 mix-blend-overlay z-10"></div>
              <div className="absolute inset-0 flex items-center justify-center bg-background/40 text-white text-opacity-80 text-lg z-20">
                Imagen ilustrativa del proceso
              </div>
            </div>
            
            <div className="grid grid-cols-1 gap-3">
              {step.features.map((feature, idx) => (
                <div key={idx} className="flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-primary/5 transition-colors duration-300">
                  <div className="text-primary">✓</div>
                  <p className="text-white/80">{feature}</p>
                </div>
              ))}
            </div>
            
            <button className="w-full bg-primary/20 hover:bg-primary/30 text-white px-6 py-3 rounded-xl transition-all duration-300 border border-primary/30 hover:border-primary/50 mt-4">
              Crear cuenta
            </button>
          </div>
        </div>
      )}
      
      {/* Paso 2: Abrir caja - Diseño de tarjeta con animación */}
      {index === 1 && (
        <div className="relative bg-background/80 backdrop-blur-sm overflow-hidden rounded-2xl border border-white/10 shadow-lg transition-all duration-500 group">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-alternative to-primary bg-[length:200%_100%] animate-gradient"></div>
          
          <div className="p-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="text-5xl bg-primary/10 p-4 rounded-xl animate-pulse">{step.icon}</div>
                <h4 className="text-2xl font-bold text-white">{step.title}</h4>
              </div>
              <div className="px-3 py-1 rounded-full bg-primary/20 text-primary text-sm">
                Experiencia inmersiva
              </div>
            </div>
            
            <p className="text-white/70 leading-relaxed mb-6">{step.description}</p>
            
            <div className="relative w-full h-64 rounded-xl overflow-hidden mb-6 group-hover:scale-[1.02] transition-transform duration-500">
              <div className="absolute inset-0 bg-gradient-to-b from-primary/30 to-background/90 mix-blend-overlay z-10"></div>
              <div className="absolute inset-0 flex items-center justify-center bg-background/40 text-white text-opacity-80 text-lg z-20">
                Animación de apertura
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              {step.features.map((feature, idx) => (
                <div key={idx} className="relative overflow-hidden p-4 rounded-lg bg-white/5 hover:bg-primary/5 transition-colors duration-300">
                  <div className="absolute top-0 right-0 w-12 h-12 -translate-y-6 translate-x-6 bg-primary/20 rounded-full"></div>
                  <div className="relative z-10">
                    <div className="text-primary mb-2 text-lg">Característica {idx + 1}</div>
                    <p className="text-white/80">{feature}</p>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="flex justify-between items-center pt-4 border-t border-white/5">
              <button className="bg-gradient-to-r from-primary to-secondary text-white px-6 py-3 rounded-xl transition-all duration-300 hover:shadow-lg hover:shadow-primary/20">
                Probar ahora
              </button>
              <div className="flex space-x-1">
                {processSteps.map((_, i) => (
                  <div 
                    key={i} 
                    className={`h-1 w-6 rounded-full ${i <= index ? 'bg-primary' : 'bg-white/10'}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Paso 3: Retirar skin - Diseño de tarjeta con pestañas */}
      {index === 2 && (
        <div className="bg-background/80 backdrop-blur-sm rounded-2xl border border-white/10 shadow-lg transition-all duration-500">
          <div className="flex border-b border-white/10">
            <div className="px-6 py-3 bg-primary text-white rounded-tl-2xl">
              {step.title}
            </div>
            <div className="px-6 py-3 text-white/60 hover:text-white/80 transition-colors">
              Historial
            </div>
            <div className="px-6 py-3 text-white/60 hover:text-white/80 transition-colors">
              Ayuda
            </div>
          </div>
          
          <div className="p-8">
            <div className="flex flex-col md:flex-row gap-8">
              <div className="md:w-1/2">
                <div className="flex items-center gap-4 mb-4">
                  <div className="text-4xl bg-primary/10 p-3 rounded-xl">{step.icon}</div>
                  <p className="text-white/70 leading-relaxed">{step.description}</p>
                </div>
                
                <div className="space-y-3 mt-6">
                  {step.features.map((feature, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                        {idx + 1}
                      </div>
                      <div>
                        <p className="text-white/80">{feature}</p>
                        <div className="w-full h-1 bg-white/5 rounded-full mt-2">
                          <div className="h-1 bg-primary rounded-full" style={{ width: `${(idx + 1) * 25}%` }}></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="md:w-1/2">
                <div className="relative w-full h-64 rounded-xl overflow-hidden mb-6 border border-white/10">
                  <div className="absolute inset-0 bg-gradient-to-b from-primary/30 to-background/90 mix-blend-overlay z-10"></div>
                  <div className="absolute inset-0 flex items-center justify-center bg-background/40 text-white text-opacity-80 text-lg z-20">
                    Sistema de intercambio
                  </div>
                </div>
                
                <div className="flex gap-4">
                  <button className="flex-1 bg-primary text-white px-4 py-3 rounded-xl transition-all duration-300 hover:bg-primary/80">
                    Retirar skin
                  </button>
                  <button className="flex-1 bg-white/10 text-white px-4 py-3 rounded-xl transition-all duration-300 hover:bg-white/20">
                    Usar saldo
                  </button>
                </div>
              </div>
            </div>
            
            <div className="mt-6 pt-4 border-t border-white/5 flex justify-between items-center">
              <span className="text-xs text-primary/70">Paso final</span>
              <div className="flex space-x-1">
                {processSteps.map((_, i) => (
                  <div 
                    key={i} 
                    className={`h-1 w-6 rounded-full ${i <= index ? 'bg-primary' : 'bg-white/10'}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}));

export default async function LandingPage() {
  // Obtenemos todas las skins y filtramos las que no tienen icono o son "random favorite"
  const allSkins = (await getWeaponSkins()).filter(
    (skin) =>
      skin.displayIcon &&
      !skin.displayName.toLowerCase().includes("random favorite skin")
  );
  
  // Obtenemos skins aleatorias para el grid
  const randomGridSkins = getRandomSkins(allSkins, 6);
  
  // Obtenemos skins aleatorias para los carruseles (diferentes a las del grid)
  const randomCarouselSkins1 = getRandomSkins(allSkins, 8);
  const randomCarouselSkins2 = getRandomSkins(allSkins, 8);
  
  // Extraemos solo las URLs de los iconos para el carrusel
  const carouselImages1 = randomCarouselSkins1.map(skin => skin.displayIcon);
  const carouselImages2 = randomCarouselSkins2.map(skin => skin.displayIcon);

  return (
    <section className="bg-background">
      <div className="">
        {/* Contenedor principal con altura fija */}
        <div className="relative overflow-hidden">
          {/* Contenedor del Aurora con altura y posición explícitas */}
          <div className="absolute inset-0 w-full" style={{ height: '100vh' }}>
            <Aurora
              colorStops={["#FC4E5B", "#FFFFFF", "#FC4E5B"]}
              blend={0.8}
              amplitude={0.8}
              speed={0.8}
            />
          </div>
          
          {/* Contenedor centrado para el título */}
          <div className="container mx-auto max-w-7xl px-6 flex items-center justify-center relative h-full mt-60">
            {/* Título y botón centrados */}
            <div className="flex flex-col items-center justify-center text-center max-w-3xl">
              <h1 className="inline-block mb-6 text-wrap">
                <span className="tracking-tight inline font-bold text-[5rem] !important leading-none">Tu nuevo </span>
                <span className="tracking-tight inline font-bold text-[5rem] !important leading-none text-primary text-shadow-lg">mejor simulador </span>
                <span className="tracking-tight inline font-bold text-[5rem] !important leading-none">de cajas de Valorant</span>
              </h1>
              
              <button
                className="relative bg-primary text-white font-medium text-[17px] px-4 py-[0.35em] pl-5 h-[2.8em] rounded-[0.9em] flex items-center overflow-hidden cursor-pointer shadow-[inset_0_0_1.6em_-0.6em_#0A141D] group"
              >
                <span className="mr-10">Unirme ahora</span>
                <div
                  className="absolute right-[0.3em] bg-white h-[2.2em] w-[2.2em] rounded-[0.7em] flex items-center justify-center transition-all duration-300 group-hover:w-[calc(100%-0.6em)] shadow-[0.1em_0.1em_0.6em_0.2em_#d2d2d4] active:scale-95"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    width="24"
                    height="24"
                    className="w-[1.1em] transition-transform duration-300 text-[#7b52b9] group-hover:translate-x-[0.1em]"
                  >
                    <path fill="none" d="M0 0h24v24H0z"></path>
                    <path
                      fill="currentColor"
                      d="M16.172 11l-5.364-5.364 1.414-1.414L20 12l-7.778 7.778-1.414-1.414L16.172 13H4v-2z"
                    ></path>
                  </svg>
                </div>
              </button>
            </div>
          </div>
        {/* Carruseles con skins aleatorias */}
        <div className="w-full overflow-hidden mt-40 relative">
          {/* Separador visual superior */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-alternative/50 to-transparent"></div>
          
          <div className="mt-4 mb-4">
            <ImageCarousel 
              images={carouselImages1} 
              speed={10}
              direction="left"
            />
            <ImageCarousel 
              images={carouselImages2} 
              speed={10}
              direction="right"
            />
          </div>
          
          {/* Separador visual inferior */}
          <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-alternative/50 to-transparent"></div>
        </div>

        </div>
        
        
        
        {/* Sección de Timeline */}
        <div className="py-16 bg-gradient-to-b from-background to-background/90">
          <div className="container mx-auto max-w-7xl px-6 mb-10">
          </div>
          
          <Timeline data={timelineData} />
        </div>
      </div>
    </section>
  );
}
