import React from "react";

// Pasos del proceso con contenido enriquecido
export const processSteps = [
  {
    title: "Regístrate y recibe VP gratis",
    description:
      "Crea tu cuenta en Valefy y comienza con VP gratis para abrir tus primeras cajas. Accede inmediatamente a cajas diarias gratuitas y misiones que te dan más VP.",
    icon: "🎮",
    color: "from-primary to-secondary",
    delay: "0ms",
    image: "/images/register.jpg",
    features: [
      "1000 VP de bienvenida al registrarte",
      "Caja diaria gratuita cada 24 horas",
      "Acceso a todas las funciones sin pago",
      "Sistema de misiones con recompensas en VP",
    ],
  },
  {
    title: "Abre cajas con animaciones realistas",
    description:
      "Experimenta la auténtica emoción de abrir cajas de Valorant con animaciones idénticas al juego. Cada caja incluye un spinner realista y efectos visuales impresionantes.",
    icon: "📦",
    color: "from-primary to-secondary",
    delay: "300ms",
    image: "/images/open-box.jpg",
    features: [
      "Cajas Diarias, Premium y Ultra disponibles",
      "Probabilidades idénticas a Valorant oficial",
      "Animación de spinner con 160+ items aleatorios",
      "Más de 1000 skins reales de la API de Valorant",
    ],
  },
  {
    title: "Gestiona tu inventario y estadísticas",
    description:
      "Colecciona skins, revisa tu historial de aperturas y analiza tus estadísticas. Ve qué tan afortunado has sido comparado con las probabilidades oficiales.",
    icon: "📊",
    color: "from-primary to-secondary",
    delay: "450ms",
    image: "/images/compete.jpg",
    features: [
      "Inventario organizado por tiers y armas",
      "Estadísticas detalladas de aperturas",
      "Historial completo con fecha y hora",
      "Indicador de skins nuevas vs duplicadas",
    ],
  },
];

// Datos para el Timeline con contenido enriquecido y diferenciado
export const timelineData = processSteps.map((step, index) => ({
  title: step.title,
  content: (
    <>
      {/* Paso 1: Registro - Diseño de tarjeta con gradiente */}
      {index === 0 && (
        <div className="bg-gradient-to-br from-background/90 to-background/70 backdrop-blur-sm p-8 rounded-2xl border-l-4 border-primary shadow-lg transition-all duration-500 hover:shadow-primary/20">
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-4">
              <div className="text-5xl bg-primary/10 p-4 rounded-full">
                {step.icon}
              </div>
              <div>
                <h4 className="text-2xl font-bold text-white mb-2">
                  {step.title}
                </h4>
                <p className="text-white/70 leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>

            <div className="relative w-full h-64 md:h-80 rounded-xl overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-primary/30 to-background/90 mix-blend-overlay z-10" />
              <div className="absolute inset-0 flex items-center justify-center bg-background/40 text-white text-opacity-80 text-lg z-20">
                Imagen ilustrativa del proceso
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {step.features.map((feature, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-primary/5 transition-colors duration-300"
                >
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
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-alternative to-primary bg-[length:200%_100%] animate-gradient" />

          <div className="p-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="text-5xl bg-primary/10 p-4 rounded-xl animate-pulse">
                  {step.icon}
                </div>
                <h4 className="text-2xl font-bold text-white">{step.title}</h4>
              </div>
              <div className="px-3 py-1 rounded-full bg-primary/20 text-primary text-sm">
                Experiencia inmersiva
              </div>
            </div>

            <p className="text-white/70 leading-relaxed mb-6">
              {step.description}
            </p>

            <div className="relative w-full h-64 rounded-xl overflow-hidden mb-6 group-hover:scale-[1.02] transition-transform duration-500">
              <div className="absolute inset-0 bg-gradient-to-b from-primary/30 to-background/90 mix-blend-overlay z-10" />
              <div className="absolute inset-0 flex items-center justify-center bg-background/40 text-white text-opacity-80 text-lg z-20">
                Animación de apertura
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              {step.features.map((feature, idx) => (
                <div
                  key={idx}
                  className="relative overflow-hidden p-4 rounded-lg bg-white/5 hover:bg-primary/5 transition-colors duration-300"
                >
                  <div className="absolute top-0 right-0 w-12 h-12 -translate-y-6 translate-x-6 bg-primary/20 rounded-full" />
                  <div className="relative z-10">
                    <div className="text-primary mb-2 text-lg">
                      Característica {idx + 1}
                    </div>
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
                    className={`h-1 w-6 rounded-full ${i <= index ? "bg-primary" : "bg-white/10"}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Paso 3: Compartir y competir - Diseño de tarjeta social */}
      {index === 2 && (
        <div className="bg-background/80 backdrop-blur-sm rounded-2xl border border-white/10 shadow-lg transition-all duration-500">
          <div className="flex border-b border-white/10">
            <div className="px-6 py-3 bg-primary text-white rounded-tl-2xl">
              {step.title}
            </div>
            <div className="px-6 py-3 text-white/60 hover:text-white/80 transition-colors">
              Comunidad
            </div>
            <div className="px-6 py-3 text-white/60 hover:text-white/80 transition-colors">
              Rankings
            </div>
          </div>

          <div className="p-8">
            <div className="flex flex-col md:flex-row gap-8">
              <div className="md:w-1/2">
                <div className="flex items-center gap-4 mb-4">
                  <div className="text-4xl bg-primary/10 p-3 rounded-xl">
                    {step.icon}
                  </div>
                  <p className="text-white/70 leading-relaxed">
                    {step.description}
                  </p>
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
                          <div
                            className="h-1 bg-primary rounded-full"
                            style={{ width: `${(idx + 1) * 25}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="md:w-1/2">
                <div className="relative w-full h-64 rounded-xl overflow-hidden mb-6 border border-white/10">
                  <div className="absolute inset-0 bg-gradient-to-b from-primary/30 to-background/90 mix-blend-overlay z-10" />
                  <div className="absolute inset-0 flex items-center justify-center bg-background/40 text-white text-opacity-80 text-lg z-20">
                    Ranking y comunidad
                  </div>
                </div>

                <div className="flex gap-4">
                  <button className="flex-1 bg-primary text-white px-4 py-3 rounded-xl transition-all duration-300 hover:bg-primary/80">
                    Compartir logros
                  </button>
                  <button className="flex-1 bg-white/10 text-white px-4 py-3 rounded-xl transition-all duration-300 hover:bg-white/20">
                    Ver ranking
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-white/5 flex justify-between items-center">
              <span className="text-xs text-primary/70">
                ¡Sigue disfrutando de Valefy!
              </span>
              <div className="flex space-x-1">
                {processSteps.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1 w-6 rounded-full ${i <= index ? "bg-primary" : "bg-white/10"}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  ),
}));
