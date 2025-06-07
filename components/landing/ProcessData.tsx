import React from "react";

// Pasos del proceso con contenido real y funcional
export const processSteps = [
  {
    title: "Regístrate y comienza con 1000 VP gratis",
    description:
      "Únete a Valefy y recibe inmediatamente 1000 VP de bienvenida más una caja diaria gratuita. Accede al sistema completo de misiones que te recompensa con VP adicional por tu actividad.",
    icon: "🎯",
    color: "from-primary to-secondary",
    delay: "0ms",
    image: "/images/register.jpg",
    features: [
      "1000 VP instantáneos al completar tu registro",
      "Caja diaria gratuita que se renueva cada 24 horas",
      "Sistema de misiones con recompensas de 25-500 VP",
      "Acceso completo sin restricciones ni pagos",
    ],
  },
  {
    title: "Abre cajas con probabilidades oficiales de Valorant",
    description:
      "Experimenta la auténtica emoción de abrir cajas con las mismas probabilidades que Valorant oficial. Más de 1000 skins reales de la API de Riot Games con animaciones de spinner realistas.",
    icon: "📦",
    color: "from-primary to-secondary", 
    delay: "300ms",
    image: "/images/open-box.jpg",
    features: [
      "3 tipos de cajas: Diaria (gratis), Premium (100-500 VP), Ultra (1000+ VP)",
      "Probabilidades exactas: 55.17% Select, 26.91% Deluxe, 15.93% Premium, 1.99% Ultra",
      "Spinner con 160+ skins aleatorias por animación",
      "Sistema de apertura múltiple (hasta 5 cajas simultáneas)",
    ],
  },
  {
    title: "Gestiona tu colección y progresa en misiones",
    description:
      "Organiza tu inventario de skins, completa misiones diarias y semanales, y revisa estadísticas detalladas de tus aperturas. Sistema completo de progresión con recompensas constantes.",
    icon: "📊",
    color: "from-primary to-secondary",
    delay: "450ms", 
    image: "/images/compete.jpg",
    features: [
      "Inventario filtrable por tiers, armas y colecciones",
      "15+ misiones disponibles con renovación automática",
      "Estadísticas completas: VP gastados, cajas abiertas, suerte vs probabilidades",
      "Sistema de logros y seguimiento de progreso personal",
    ],
  },
];

// Datos para el Timeline con contenido funcional y específico
export const timelineData = processSteps.map((step, index) => ({
  title: step.title,
  content: (
    <>
      {/* Paso 1: Registro - Proceso detallado */}
      {index === 0 && (
        <div className="bg-gradient-to-br from-background/95 to-background/80 backdrop-blur-sm p-8 rounded-2xl border border-white/10 shadow-xl transition-all duration-500 hover:shadow-primary/10">
          <div className="flex flex-col gap-6">
            <div className="flex items-start gap-6">
              <div className="text-5xl bg-primary/15 p-4 rounded-2xl shadow-lg">
                {step.icon}
              </div>
              <div className="flex-1">
                <h4 className="text-2xl font-bold text-white mb-3">
                  Proceso de registro simplificado
                </h4>
                <p className="text-white/80 leading-relaxed mb-4">
                  Crea tu cuenta en menos de 30 segundos usando tu email o conectando con Google/Discord. 
                  El sistema automáticamente te otorga 1000 VP y activa tus misiones de bienvenida.
                </p>
                <div className="flex items-center gap-3 px-4 py-2 bg-primary/10 rounded-lg border border-primary/20">
                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                  <span className="text-primary font-medium">Recompensa inmediata garantizada</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {step.features.map((feature, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 p-4 rounded-xl bg-white/5 hover:bg-primary/5 transition-all duration-300 border border-white/5 hover:border-primary/20"
                >
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                    {idx + 1}
                  </div>
                  <p className="text-white/90 text-sm font-medium">{feature}</p>
                </div>
              ))}
            </div>

            <div className="border-t border-white/10 pt-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 text-center p-4 rounded-xl bg-gradient-to-r from-green-500/10 to-green-600/10 border border-green-500/20">
                  <div className="text-2xl font-bold text-green-400">1000 VP</div>
                  <div className="text-green-300 text-sm">Bono de bienvenida</div>
                </div>
                <div className="flex-1 text-center p-4 rounded-xl bg-gradient-to-r from-blue-500/10 to-blue-600/10 border border-blue-500/20">
                  <div className="text-2xl font-bold text-blue-400">0€</div>
                  <div className="text-blue-300 text-sm">Completamente gratis</div>
                </div>
                <div className="flex-1 text-center p-4 rounded-xl bg-gradient-to-r from-purple-500/10 to-purple-600/10 border border-purple-500/20">
                  <div className="text-2xl font-bold text-purple-400">24h</div>
                  <div className="text-purple-300 text-sm">Caja diaria renovable</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Paso 2: Apertura de cajas - Sistema detallado */}
      {index === 1 && (
        <div className="relative bg-background/90 backdrop-blur-sm overflow-hidden rounded-2xl border border-white/10 shadow-xl transition-all duration-500 group hover:shadow-primary/10">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-secondary to-primary bg-[length:200%_100%] animate-pulse"></div>

          <div className="p-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="text-5xl bg-primary/15 p-4 rounded-2xl shadow-lg group-hover:scale-105 transition-transform">
                  {step.icon}
                </div>
                <div>
                  <h4 className="text-2xl font-bold text-white mb-2">Sistema de cajas autêntico</h4>
                  <p className="text-primary font-medium">Probabilidades oficiales de Riot Games</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-white">1000+</div>
                <div className="text-white/60 text-sm">Skins disponibles</div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              <div className="bg-gradient-to-br from-green-500/10 to-green-600/10 rounded-xl p-5 border border-green-500/20">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                    <span className="text-green-400 text-lg">🎁</span>
                  </div>
                  <div>
                    <h5 className="text-white font-semibold">Caja Diaria</h5>
                    <p className="text-green-400 text-sm font-medium">Gratis cada 24h</p>
                  </div>
                </div>
                <div className="space-y-2 text-sm text-white/80">
                  <div className="flex justify-between">
                    <span>Select (Blanco)</span>
                    <span className="text-green-400">55.17%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Deluxe (Verde)</span>
                    <span className="text-green-400">26.91%</span>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 rounded-xl p-5 border border-blue-500/20">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                    <span className="text-blue-400 text-lg">💎</span>
                  </div>
                  <div>
                    <h5 className="text-white font-semibold">Caja Premium</h5>
                    <p className="text-blue-400 text-sm font-medium">100-500 VP</p>
                  </div>
                </div>
                <div className="space-y-2 text-sm text-white/80">
                  <div className="flex justify-between">
                    <span>Premium (Azul)</span>
                    <span className="text-blue-400">15.93%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Ultra (Morado)</span>
                    <span className="text-blue-400">1.99%</span>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 rounded-xl p-5 border border-purple-500/20">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                    <span className="text-purple-400 text-lg">👑</span>
                  </div>
                  <div>
                    <h5 className="text-white font-semibold">Caja Ultra</h5>
                    <p className="text-purple-400 text-sm font-medium">1000+ VP</p>
                  </div>
                </div>
                <div className="space-y-2 text-sm text-white/80">
                  <div className="flex justify-between">
                    <span>Probabilidades mejoradas</span>
                    <span className="text-purple-400">+25%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Garantía tier alto</span>
                    <span className="text-purple-400">✓</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white/5 rounded-xl p-5 border border-white/10">
              <h5 className="text-white font-semibold mb-3 flex items-center gap-2">
                <span className="text-primary">⚡</span>
                Características técnicas del sistema
              </h5>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="text-center">
                  <div className="text-white font-medium">160+</div>
                  <div className="text-white/60">Items por spinner</div>
                </div>
                <div className="text-center">
                  <div className="text-white font-medium">12s</div>
                  <div className="text-white/60">Duración animación</div>
                </div>
                <div className="text-center">
                  <div className="text-white font-medium">1-5</div>
                  <div className="text-white/60">Cajas simultáneas</div>
                </div>
                <div className="text-center">
                  <div className="text-white font-medium">100%</div>
                  <div className="text-white/60">Precisión API Riot</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Paso 3: Gestión y progresión - Sistema completo */}
      {index === 2 && (
        <div className="bg-background/90 backdrop-blur-sm rounded-2xl border border-white/10 shadow-xl transition-all duration-500">
          <div className="flex border-b border-white/10">
            <div className="px-6 py-4 bg-primary/10 text-white rounded-tl-2xl border-r border-white/10">
              <span className="font-semibold">Inventario</span>
            </div>
            <div className="px-6 py-4 text-white/60 hover:text-white/80 transition-colors border-r border-white/10">
              <span>Misiones</span>
            </div>
            <div className="px-6 py-4 text-white/60 hover:text-white/80 transition-colors">
              <span>Estadísticas</span>
            </div>
          </div>

          <div className="p-8">
            <div className="flex flex-col lg:flex-row gap-8">
              <div className="lg:w-2/3">
                <div className="flex items-center gap-4 mb-6">
                  <div className="text-4xl bg-primary/15 p-3 rounded-xl">
                    {step.icon}
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-white mb-2">Sistema de progresión completo</h4>
                    <p className="text-white/80 leading-relaxed">
                      Gestiona tu colección, completa misiones y analiza tu progreso con herramientas avanzadas de seguimiento y organización.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  {step.features.map((feature, idx) => (
                    <div key={idx} className="flex items-start gap-4 p-4 rounded-xl bg-white/5 hover:bg-primary/5 transition-all duration-300">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                        {idx + 1}
                      </div>
                      <div className="flex-1">
                        <p className="text-white/90 font-medium mb-1">{feature}</p>
                        <div className="w-full h-1 bg-white/10 rounded-full">
                          <div
                            className="h-1 bg-gradient-to-r from-primary to-secondary rounded-full transition-all duration-1000"
                            style={{ width: `${((idx + 1) / step.features.length) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="lg:w-1/3">
                <div className="space-y-4">
                  <div className="bg-gradient-to-br from-primary/10 to-secondary/10 rounded-xl p-5 border border-primary/20">
                    <h5 className="text-white font-semibold mb-3 flex items-center gap-2">
                      <span className="text-primary">🎯</span>
                      Misiones disponibles
                    </h5>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-white/80 text-sm">Login Diario</span>
                        <span className="text-primary font-medium text-sm">50 VP</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-white/80 text-sm">Abrir 5 Cajas</span>
                        <span className="text-primary font-medium text-sm">100 VP</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-white/80 text-sm">Skin Ultra Edition</span>
                        <span className="text-primary font-medium text-sm">250 VP</span>
                      </div>
                      <div className="text-center pt-2 border-t border-white/10">
                        <span className="text-white/60 text-xs">+12 misiones más disponibles</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-green-500/10 to-blue-500/10 rounded-xl p-5 border border-green-500/20">
                    <h5 className="text-white font-semibold mb-3 flex items-center gap-2">
                      <span className="text-green-400">📈</span>
                      Tu progreso
                    </h5>
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-white/80 text-sm">Cajas abiertas</span>
                          <span className="text-white font-medium text-sm">47</span>
                        </div>
                        <div className="w-full h-2 bg-white/10 rounded-full">
                          <div className="h-2 bg-gradient-to-r from-green-400 to-blue-400 rounded-full" style={{width: '47%'}}></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-white/80 text-sm">Skins únicas</span>
                          <span className="text-white font-medium text-sm">23</span>
                        </div>
                        <div className="w-full h-2 bg-white/10 rounded-full">
                          <div className="h-2 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full" style={{width: '23%'}}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-white/10 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-6 text-sm text-white/60">
                <span className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  Sistema en tiempo real
                </span>
                <span className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  Guardado automático
                </span>
              </div>
              <div className="flex space-x-1">
                {processSteps.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1 w-8 rounded-full transition-all duration-300 ${i <= index ? "bg-primary" : "bg-white/20"}`}
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
