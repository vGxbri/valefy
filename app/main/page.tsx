// app/main/page.tsx
import Image from "next/image";

export default function MainPage() {
  return (
    <div className="flex flex-col gap-8 p-8 md:p-12 lg:p-16 min-h-screen bg-gradient-to-br from-background/80 to-backgroundAlt/60">
      {/* Header de bienvenida */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-white drop-shadow-lg mb-2">
            ¡Bienvenido a <span className="text-red-500">Valefy</span>!
          </h1>
          <p className="text-lg md:text-xl text-white/70 max-w-xl">
            Gestiona tu inventario, realiza intercambios y mantente al tanto de todas tus notificaciones en un solo lugar.
          </p>
        </div>
        <Image
          src="/logo-valefy.png"
          alt="Valefy Logo"
          width={120}
          height={120}
          className="drop-shadow-xl rounded-2xl bg-white/10 p-2"
        />
      </div>

      {/* Tarjetas de acceso rápido */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Inventario */}
        <a
          href="/main/inventario"
          className="group bg-gradient-to-br from-white/5 to-red-500/10 border border-red-500/20 rounded-2xl p-8 flex flex-col items-center shadow-lg hover:scale-105 hover:shadow-red-500/30 transition-all duration-300"
        >
          <Image
            src="/inventario-icon.png"
            alt="Inventario"
            width={48}
            height={48}
            className="mb-4"
          />
          <h2 className="text-2xl font-bold text-white mb-2 group-hover:text-red-400 transition-colors">
            Inventario
          </h2>
          <p className="text-white/70 text-center">
            Consulta y administra todos tus ítems de manera sencilla y visual.
          </p>
        </a>
        {/* Trade */}
        <a
          href="/main/trade"
          className="group bg-gradient-to-br from-white/5 to-red-500/10 border border-red-500/20 rounded-2xl p-8 flex flex-col items-center shadow-lg hover:scale-105 hover:shadow-red-500/30 transition-all duration-300"
        >
          <Image
            src="/trade-icon.png"
            alt="Trade"
            width={48}
            height={48}
            className="mb-4"
          />
          <h2 className="text-2xl font-bold text-white mb-2 group-hover:text-red-400 transition-colors">
            Trade
          </h2>
          <p className="text-white/70 text-center">
            Intercambia ítems con otros usuarios de forma rápida y segura.
          </p>
        </a>
        {/* Notificaciones */}
        <a
          href="#notificaciones"
          className="group bg-gradient-to-br from-white/5 to-red-500/10 border border-red-500/20 rounded-2xl p-8 flex flex-col items-center shadow-lg hover:scale-105 hover:shadow-red-500/30 transition-all duration-300"
        >
          <Image
            src="/notificaciones-icon.png"
            alt="Notificaciones"
            width={48}
            height={48}
            className="mb-4"
          />
          <h2 className="text-2xl font-bold text-white mb-2 group-hover:text-red-400 transition-colors">
            Notificaciones
          </h2>
          <p className="text-white/70 text-center">
            Mantente informado sobre alertas, propuestas y novedades.
          </p>
        </a>
      </div>

      {/* Sección de novedades o tips */}
      <div className="mt-8 bg-gradient-to-r from-red-500/10 to-white/5 border border-red-500/20 rounded-2xl p-6 shadow-inner flex flex-col md:flex-row items-center gap-6">
        <Image
          src="/tips-icon.png"
          alt="Tips"
          width={56}
          height={56}
          className="drop-shadow-lg"
        />
        <div>
          <h3 className="text-xl font-bold text-white mb-1">¿Nuevo en Valefy?</h3>
          <p className="text-white/70">
            Explora el inventario, realiza tu primer intercambio y personaliza tu perfil para sacar el máximo provecho de la plataforma.
          </p>
        </div>
      </div>
    </div>
  );
}