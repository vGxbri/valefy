'use client';

import { useEffect, useState } from 'react';
import Image from "next/image";
import StripeCard from "@/components/StripeCard";
import DailyBox from "@/components/DailyBox";
import { Skin, getWeaponSkins } from '@/lib/valorantApi';
import { Raleway, Roboto } from "next/font/google";

interface Caja {
  id: string;
  nombre: string;
  precio: number;
}

export default function MainPage() {
  const [cajas, setCajas] = useState<Caja[]>([]);
  const [activeTab, setActiveTab] = useState('daily');

  useEffect(() => {
    const fetchCajas = async () => {
      try {
        const response = await fetch('/api/cajas');
        const data = await response.json();
        if (data.cajas) {
          setCajas(data.cajas);
        }
      } catch (error) {
        console.error('Error al cargar las cajas:', error);
      }
    };

    fetchCajas();
  }, []);
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

      {/* Sección de Cajas */}
      <div className="w-full">
        <h2 className="text-3xl font-bold text-foreground mb-4 flex items-center font-[Raleway] font-semibold italic tracking-widest">
          / CAJAS
        </h2>
        
        <div className="flex justify-between items-center mb-6">
          <div className="flex border-b border-white/10">
            <button
              className={`px-4 py-2 text-sm font-medium ${
                activeTab === 'daily'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-white/70 hover:text-white'
              }`}
              onClick={() => setActiveTab('daily')}
            >
              Caja Diaria
            </button>
            <button
              className={`px-4 py-2 text-sm font-medium ${
                activeTab === 'premium'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-white/70 hover:text-white'
              }`}
              onClick={() => setActiveTab('premium')}
            >
              Cajas Premium
            </button>
          </div>
          
          <button
            onClick={() => window.location.href = '/admin'}
            className="px-3 py-1 text-sm bg-background/40 hover:bg-background/60 text-white/70 hover:text-white border border-white/10 rounded-md transition-colors"
            title="Panel de administración para pruebas"
          >
            Admin (Pruebas)
          </button>
        </div>
        
        <div className="w-full rounded-3xl bg-gradient-to-br from-primary/10 via-backgroundAlt/30 to-secondary/5 backdrop-blur-sm border border-border/30 p-6 shadow-xl overflow-hidden relative">
          {/* Efecto de fondo */}
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/10 rounded-full blur-3xl opacity-30"></div>
          <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-secondary/10 rounded-full blur-3xl opacity-30"></div>
          
          {/* Contenido según la pestaña activa */}
          <div className="relative z-10">
            {activeTab === 'daily' ? (
              <DailyBox />
            ) : (
              <div className="flex flex-col items-center justify-center min-h-[400px] w-full">
                <p className="text-white/80">Las cajas premium estarán disponibles próximamente</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}