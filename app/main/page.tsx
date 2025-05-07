// app/main/page.tsx
import Image from "next/image";
import StripeCard from "@/components/StripeCard"; // Importar StripeCard
import { Raleway, Roboto } from "next/font/google";

export default function MainPage() {
  return (
    <div className="flex flex-col gap-8 pl-16 md:pr-12 lg:pr-16 pt-12 pb-12 min-h-screen bg-background w-full max-w-full flex-1" >
      
      {/*
      <div className="w-full h-32 bg-primary/5 border border-red-500/20 rounded-2xl flex items-center justify-between overflow-hidden px-8 max-w-full">
        <div className="text-white text-2xl font-bold">
          ¡Bienvenido a Valefy!
        </div>
        <div className="h-full flex items-center">
          <Image
            src="/jett_1.png"
            alt="Jett"
            width={256}
            height={256}
            quality={100}
            className="h-full w-auto object-contain"
            priority
          />
        </div>
      </div>
      */}

      {/* Sección de Cajas Gratuitas */}
      <div>
        <h2 className="text-3xl font-bold text-foreground mb-4 flex items-center font-[Raleway] font-semibold italic tracking-widest">
            / CAJAS GRATUITAS
        </h2>
        <div className="w-full rounded-3xl bg-gradient-to-br from-primary/10 via-backgroundAlt/30 to-secondary/5 backdrop-blur-sm border border-border/30 p-6 shadow-xl overflow-hidden relative">
          {/* Efecto de fondo */}
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/10 rounded-full blur-3xl opacity-30"></div>
          <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-secondary/10 rounded-full blur-3xl opacity-30"></div>
          {/* Estructura de dos columnas */}
          <div className="flex flex-col md:flex-row gap-8 relative z-10">
            {/* Primera columna: Título y descripción */}
            
            {/* Segunda columna: Contenedor de tarjetas */}
            <div className="md:w-3/4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="w-full">
                <StripeCard
                  imageUrl="/free_cage.png"
                  title="Caja Diaria"
                  link=""
                  btnText="Reclamar ahora"
                />
              </div>
              <div className="w-full">
                <StripeCard
                  imageUrl="/free_cage.png"
                  title="Caja Semanal"
                  link=""
                  btnText="Reclamar ahora"
                />
              </div>
              <div className="w-full">
                <StripeCard
                  imageUrl="/free_cage.png"
                  title="Caja Especial"
                  link=""
                  btnText="Próximamente"
                  disabled={true}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}