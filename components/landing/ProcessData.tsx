import React from "react";
import { Rocket, Gift, Star } from 'lucide-react';

// Pasos del proceso completamente renovados
export const processSteps = [
  {
    title: "Regístrate y comienza tu aventura",
    description:
      "Únete a Valefy en segundos y sumérgete en el mundo de las skins de Valorant. Recibe tu bono de bienvenida y comienza a explorar todas las posibilidades que tenemos para ti.",
    icon: <Rocket className="w-10 h-10" />,
    color: "from-primary to-secondary",
    delay: "0ms",
    image: "/images/register.jpg",
    features: [
      "Registro rápido con Google, Discord o email",
      "2000 VP de bienvenida instantáneos",
      "Acceso inmediato a todas las funciones",
      "Tu primera caja diaria esperándote",
    ],
  },
  {
    title: "Abre cajas y descubre nuestro catálogo",
    description:
      "Explora nuestro extenso catálogo de más de 1000 skins oficiales de Valorant. Abre cajas con un spinner dinámico y descubre desde skins básicas hasta las Ultra Edition más codiciadas, todo en un entorno de simulación realista.",
    icon: <Gift className="w-10 h-10" />,
    color: "from-primary to-secondary", 
    delay: "300ms",
    image: "/images/open-box.jpg",
    features: [
      "Más de 1000 skins oficiales de la API de Riot",
      "Cajas diarias gratuitas renovables cada 24h",
      "Spinner dinámico con animaciones inmersivas",
      "Apertura múltiple de cajas (hasta 5 simultáneas)",
    ],
  },
  {
    title: "Mejora skins y progresa en las misiones",
    description:
      "Potencia tus skins favoritas, completa misiones emocionantes y desbloquea nuevas formas de conseguir VP. Tu progreso se guarda automáticamente y siempre tendrás nuevos objetivos que alcanzar.",
    icon: <Star className="w-10 h-10" />,
    color: "from-primary to-secondary",
    delay: "450ms", 
    image: "/images/compete.jpg",
    features: [
      "Sistema de mejoras único para potenciar skins",
      "15+ misiones activas con recompensas constantes",
      "Progreso guardado automáticamente en tiempo real",
      "Desafíos especiales y eventos temporales",
    ],
  },
];

// Datos para el Timeline con contenido completamente nuevo
export const timelineData = processSteps.map((step, index) => ({
  title: step.title,
  content: (
    <>
      {/* Paso 1: Registro y aventura */}
      {index === 0 && (
        <div className="bg-backgroundAlt/10 border border-white/10 rounded-xl sm:rounded-2xl backdrop-blur-xl shadow-[0_0_45px_-5px_rgba(0,0,0,0.3)] transition-all duration-300 hover:shadow-[0_0_55px_-5px_rgba(0,0,0,0.4)] p-4 sm:p-6 md:p-8">
          <div className="flex flex-col gap-4 sm:gap-6">
            <div className="flex items-start gap-4 sm:gap-6">
              <div className="text-3xl sm:text-4xl md:text-5xl bg-primary/15 p-2 sm:p-3 md:p-4 rounded-xl sm:rounded-2xl shadow-lg">
                {step.icon}
              </div>
              <div className="flex-1">
                <h4 className="text-lg sm:text-xl md:text-2xl font-bold text-white mb-2 sm:mb-3">
                  Tu aventura comienza aquí
                </h4>
                <p className="text-white/80 leading-relaxed mb-3 sm:mb-4 text-sm sm:text-base">
                  Crear tu cuenta en Valefy es el primer paso hacia una experiencia única con las skins de Valorant. 
                  En menos de un minuto estarás explorando nuestro mundo lleno de posibilidades.
                </p>
                <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 bg-primary/10 rounded-lg border border-primary/20">
                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                  <span className="font-medium text-sm sm:text-base">¡Te damos la bienvenida con 2000 VP!</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              {step.features.map((feature, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 rounded-lg sm:rounded-xl bg-white/5 hover:bg-primary/5 transition-all duration-300 border border-white/5 hover:border-primary/20"
                >
                  <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gradient-to-r from-primary to-secondary flex items-center justify-center text-white font-bold text-xs sm:text-sm">
                    ✓
                  </div>
                  <p className="text-white/90 text-xs sm:text-sm font-medium">{feature}</p>
                </div>
              ))}
            </div>

            <div className="border-t border-white/10 pt-4 sm:pt-6">
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <div className="flex-1 text-center p-3 sm:p-4 rounded-lg sm:rounded-xl border border-primary/20 bg-primary/10">
                  <div className="text-xl sm:text-2xl font-bold text-primary">2000 VP</div>
                  <div className="text-xs sm:text-sm">Regalo de bienvenida</div>
                </div>
                <div className="flex-1 text-center p-3 sm:p-4 rounded-lg sm:rounded-xl border border-primary/20 bg-primary/10">
                  <div className="text-xl sm:text-2xl font-bold text-primary">30s</div>
                  <div className="text-xs sm:text-sm">Registro ultra rápido</div>
                </div>
                <div className="flex-1 text-center p-3 sm:p-4 rounded-lg sm:rounded-xl border border-primary/20 bg-primary/10">
                  <div className="text-xl sm:text-2xl font-bold text-primary">∞</div>
                  <div className="text-xs sm:text-sm">Acceso sin límites</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Paso 2: Cajas y catálogo */}
      {index === 1 && (
        <div className="bg-backgroundAlt/10 border border-white/10 rounded-xl sm:rounded-2xl backdrop-blur-xl shadow-[0_0_45px_-5px_rgba(0,0,0,0.3)] transition-all duration-300 hover:shadow-[0_0_55px_-5px_rgba(0,0,0,0.4)]">
          <div className="p-4 sm:p-6 md:p-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6 gap-4">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="text-3xl sm:text-4xl md:text-5xl bg-primary/15 p-2 sm:p-3 md:p-4 rounded-xl sm:rounded-2xl shadow-lg transition-transform">
                  {step.icon}
                </div>
                <div>
                  <h4 className="text-lg sm:text-xl md:text-2xl font-bold text-white">Explora todo el catálogo de Valorant</h4>
                  <p className="text-primary font-medium text-sm sm:text-base">Más de 1000 skins oficiales esperándote</p>
                </div>
              </div>
              <div className="text-center sm:text-right">
                <div className="text-2xl sm:text-3xl font-bold text-white">1000+</div>
                <div className="text-white/60 text-xs sm:text-sm">Skins disponibles</div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-4 sm:mb-6">
              <div className="rounded-lg sm:rounded-xl p-4 sm:p-5 border border-primary/20 bg-primary/10">
                <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                    <span className="text-primary text-base sm:text-lg">📦</span>
                  </div>
                  <div>
                    <h5 className="text-white font-semibold text-sm sm:text-base">Caja Diaria</h5>
                    <p className="text-primary/90 text-xs sm:text-sm font-medium">Gratis cada 24h</p>
                  </div>
                </div>
                <div className="space-y-1 text-xs sm:text-sm text-white/80">
                  <div>• Renovación automática</div>
                  <div>• Sin límite de uso</div>
                  <div>• Todas las raridades disponibles</div>
                </div>
              </div>

              <div className="rounded-lg sm:rounded-xl p-4 sm:p-5 border border-primary/20 bg-primary/10">
                <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                    <span className="text-primary text-base sm:text-lg">🔍</span>
                  </div>
                  <div>
                    <h5 className="text-white font-semibold text-sm sm:text-base">Explorar Catálogo</h5>
                    <p className="text-primary/90 text-xs sm:text-sm font-medium">Navegación intuitiva</p>
                  </div>
                </div>
                <div className="space-y-1 text-xs sm:text-sm text-white/80">
                  <div>• Filtros por rareza y arma</div>
                  <div>• Búsqueda instantánea</div>
                  <div>• Búsqueda por nombre</div>
                </div>
              </div>

              <div className="rounded-lg sm:rounded-xl p-4 sm:p-5 border border-primary/20 bg-primary/10">
                <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                    <span className="text-primary text-base sm:text-lg">✨</span>
                  </div>
                  <div>
                    <h5 className="text-white font-semibold text-sm sm:text-base">Skins Especiales</h5>
                    <p className="text-primary/90 text-xs sm:text-sm font-medium">Ultra raras</p>
                  </div>
                </div>
                <div className="space-y-1 text-xs sm:text-sm text-white/80">
                  <div>• Bundle Elderflame</div>
                  <div>• Ediciones limitadas</div>
                  <div>• Exclusivas de eventos</div>
                </div>
              </div>
            </div>

            <div className="bg-white/5 rounded-lg sm:rounded-xl p-4 sm:p-5 border border-white/10">
              <h5 className="text-white font-semibold mb-2 sm:mb-3 flex items-center gap-2 text-sm sm:text-base">
                <span className="text-primary">🎯</span>
                Spinners animados y realistas
              </h5>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 text-xs sm:text-sm">
                <div className="text-center">
                  <div className="text-white font-medium">12s</div>
                  <div className="text-white/60">Animación completa</div>
                </div>
                <div className="text-center">
                  <div className="text-white font-medium">160+</div>
                  <div className="text-white/60">Skins en ruleta</div>
                </div>
                <div className="text-center">
                  <div className="text-white font-medium">5x</div>
                  <div className="text-white/60">Apertura múltiple</div>
                </div>
                <div className="text-center">
                  <div className="text-white font-medium">100%</div>
                  <div className="text-white/60">Simulación precisa</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Paso 3: Mejoras y misiones */}
      {index === 2 && (
        <div className="bg-backgroundAlt/10 border border-white/10 rounded-xl sm:rounded-2xl backdrop-blur-xl shadow-[0_0_45px_-5px_rgba(0,0,0,0.3)] transition-all duration-300 hover:shadow-[0_0_55px_-5px_rgba(0,0,0,0.4)]">
          <div className="p-4 sm:p-6 md:p-8">
            <div className="flex gap-4 sm:gap-6 md:gap-8">
              <div className="flex-1">
                <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
                  <div className="text-3xl sm:text-4xl bg-primary/15 p-2 sm:p-3 rounded-lg sm:rounded-xl">
                    {step.icon}
                  </div>
                  <div>
                    <h4 className="text-lg sm:text-xl font-bold text-white mb-1 sm:mb-2">Potencia tus skins favoritas</h4>
                    <p className="text-white/80 leading-relaxed text-sm sm:text-base">
                      No solo coleccionas skins, sino que las mejoras y las conviertes en algo único. 
                      Nuestro sistema de mejoras te permite personalizar y potenciar cada skin que obtienes.
                    </p>
                  </div>
                </div>

                <div className="space-y-3 sm:space-y-4">
                  {step.features.map((feature, idx) => (
                    <div key={idx} className="flex items-start gap-3 sm:gap-4 p-3 sm:p-4 border border-primary/20 bg-primary/10 rounded-lg sm:rounded-xl hover:bg-primary/5 transition-all duration-300">
                      <div className="flex-shrink-0 w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gradient-to-r from-primary to-secondary flex items-center justify-center text-white font-bold text-xs sm:text-sm">
                        ✓
                      </div>
                      <div className="flex-1">
                        <p className="text-white/90 font-medium mb-1 text-xs sm:text-sm">{feature}</p>
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


            </div>

            <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-white/10 flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-4">
              <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-6 text-xs sm:text-sm text-white/60">
                <span className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                  Mejoras en tiempo real
                </span>
                <span className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                  Progreso sincronizado
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  ),
}));
