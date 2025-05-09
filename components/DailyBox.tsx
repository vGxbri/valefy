'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { Skin as ValorantSkin, getWeaponSkins } from '@/lib/valorantApi';

// Definir tipos para las skins y tiers
type ContentTier = {
  id: string;
  nombre: string;
  descripcion: string;
  color: string;
  uuid: string;
};

type Skin = {
  id: string;
  nombre: string;
  bundleName?: string;
  content_tier_id: string;
  uuid: string;
  imagen_url: string;
  content_tier?: ContentTier;
};

type TierProbabilidad = {
  id: string;
  caja_id: string;
  content_tier_id: string;
  probabilidad: number;
  cantidad_skins: number;
  content_tier?: ContentTier;
};

// Función para obtener skins aleatorias
function getRandomSkins(skins: ValorantSkin[], count: number): ValorantSkin[] {
  const shuffled = [...skins].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

// Función para obtener el nombre del tier basado en el UUID
function getTierName(tierUuid: string | null): string {
  if (!tierUuid) return 'Select Edition';
  // Mapeo de UUIDs conocidos a nombres (según la API oficial de Valorant)
  const tierMap: {[key: string]: string} = {
    '0cebb8be-46d7-c12a-d306-e9907bfc5a25': 'Deluxe Edition',
    'e046854e-406c-37f4-6607-19a9ba8426fc': 'Exclusive Edition',
    '60bca009-4182-7998-dee7-b8a2558dc369': 'Premium Edition',
    '12683d76-48d7-84a3-4e09-6985794f0445': 'Select Edition',
    '411e4a55-4e59-7757-41f0-86a53f101bb5': 'Ultra Edition'
  };
  return tierMap[tierUuid] || 'Select Edition';
}

// Función para obtener el color del tier basado en el UUID
function getTierColor(tierUuid: string | null): string {
  if (!tierUuid) return '#5a9fe2';
  // Mapeo de UUIDs conocidos a colores (basados en los highlightColor de la API)
  const colorMap: {[key: string]: string} = {
    '0cebb8be-46d7-c12a-d306-e9907bfc5a25': '#009587', // Deluxe - Verde
    'e046854e-406c-37f4-6607-19a9ba8426fc': '#f5955b', // Exclusive - Naranja
    '60bca009-4182-7998-dee7-b8a2558dc369': '#d1548d', // Premium - Rosa
    '12683d76-48d7-84a3-4e09-6985794f0445': '#5a9fe2', // Select - Azul
    '411e4a55-4e59-7757-41f0-86a53f101bb5': '#fad663'  // Ultra - Amarillo
  };
  return colorMap[tierUuid] || '#7E8DAA';
}

export default function DailyBox() {
  const [isLoading, setIsLoading] = useState(true);
  const [cajaId, setCajaId] = useState<string | null>(null);
  const [skins, setSkins] = useState<Skin[]>([]);
  const [probabilidades, setProbabilidades] = useState<TierProbabilidad[]>([]);
  const [showProbabilities, setShowProbabilities] = useState(false);
  const [isOpening, setIsOpening] = useState(false);
  const [resultSkin, setResultSkin] = useState<Skin | null>(null);
  const [nextUpdate, setNextUpdate] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Crear cliente de Supabase
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Cargar datos de la caja diaria
  useEffect(() => {
    let isSubscribed = true; // Para evitar actualizaciones si el componente se desmonta
    async function loadDailyBox() {
      try {
        setIsLoading(true);
        
        // Obtener la caja diaria
        const { data: cajasData, error: cajasError } = await supabase
          .from('cajas')
          .select('id, nombre, fecha_actualizacion')
          .eq('es_diaria', true)
          .limit(1);
        
        if (cajasError) throw cajasError;
        
        let cajaIdLocal: string | null = null;

        if (!cajasData || cajasData.length === 0) {
          // Si no hay caja diaria, intentar crearla
          const { data: nuevaCajaId, error: nuevaCajaError } = await supabase.rpc('crear_caja_diaria');
          
          
          if (nuevaCajaError) throw nuevaCajaError;
          
          if (!nuevaCajaId) {
            setError('No se pudo crear la caja diaria');
            setIsLoading(false);
            return;
          }
          
          // Asegurarse de que el ID sea un string válido
          cajaIdLocal = String(nuevaCajaId);
          
          setCajaId(cajaIdLocal);
        } else {
          cajaIdLocal = String(cajasData[0].id);
          
          setCajaId(cajaIdLocal);
        }
        
        // Validar que cajaIdLocal no sea null antes de consultas dependientes
        if (!cajaIdLocal) {
          setError('La caja diaria no está disponible.');
          setIsLoading(false);
          return;
        }

        // Obtener la próxima actualización
        const { data: configData, error: configError } = await supabase
          .from('caja_diaria_config')
          .select('proxima_actualizacion')
          .eq('caja_id', cajaIdLocal)
          .limit(1);
        
        if (configError) throw configError;
        
        if (configData && configData.length > 0) {
          setNextUpdate(configData[0].proxima_actualizacion);
        }
        
        // Obtener skins desde la API de Valorant
        try {
          const valorantSkins = await getWeaponSkins();
          
          // Filtrar skins según los mismos criterios del catálogo
          const filteredSkins = valorantSkins.filter(skin => 
            skin.themeUuid && // Solo skins que pertenecen a un bundle/tema
            skin.displayIcon && // Solo skins con icono
            !skin.displayName.toLowerCase().includes('standard') && // Excluir skins estándar
            skin.displayName.split(' ').length > 1 // Excluir nombres de armas simples
          );
          
          // Seleccionar 20 skins aleatorias para la caja diaria
          const randomSkins = getRandomSkins(filteredSkins, 20);
          
          // Formatear las skins para que coincidan con nuestro tipo Skin
          const formattedSkins = randomSkins.map((skin: ValorantSkin) => ({
            id: skin.uuid,
            nombre: skin.displayName,
            bundleName: skin.displayName.split(' ')[0],
            content_tier_id: skin.contentTierUuid || '',
            uuid: skin.uuid,
            imagen_url: skin.displayIcon,
            content_tier: {
              id: skin.contentTierUuid || '',
              nombre: getTierName(skin.contentTierUuid),
              descripcion: '',
              color: getTierColor(skin.contentTierUuid),
              uuid: skin.contentTierUuid || ''
            }
          }));
          
          setSkins(formattedSkins);
        } catch (error) {
          console.error('Error al obtener skins de Valorant:', error);
          setError('Error al cargar las skins. Por favor, intenta de nuevo más tarde.');
          setIsLoading(false);
          return;
        }
        
        // Usar las funciones definidas fuera del bloque
        
        // Crear probabilidades predefinidas para los tiers (según la API oficial de Valorant)
        const defaultProbabilities = [
          {
            id: '1',
            caja_id: cajaIdLocal || '',
            content_tier_id: '411e4a55-4e59-7757-41f0-86a53f101bb5', // Ultra (rank 4)
            probabilidad: 0.05, // 5%
            cantidad_skins: 1,
            content_tier: {
              id: '411e4a55-4e59-7757-41f0-86a53f101bb5',
              nombre: 'Ultra Edition',
              descripcion: 'Las skins más raras y exclusivas',
              color: '#fad663', // Amarillo
              uuid: '411e4a55-4e59-7757-41f0-86a53f101bb5'
            }
          },
          {
            id: '2',
            caja_id: cajaIdLocal || '',
            content_tier_id: 'e046854e-406c-37f4-6607-19a9ba8426fc', // Exclusive (rank 3)
            probabilidad: 0.10, // 10%
            cantidad_skins: 2,
            content_tier: {
              id: 'e046854e-406c-37f4-6607-19a9ba8426fc',
              nombre: 'Exclusive Edition',
              descripcion: 'Skins exclusivas de alta calidad',
              color: '#f5955b', // Naranja
              uuid: 'e046854e-406c-37f4-6607-19a9ba8426fc'
            }
          },
          {
            id: '3',
            caja_id: cajaIdLocal || '',
            content_tier_id: '60bca009-4182-7998-dee7-b8a2558dc369', // Premium (rank 2)
            probabilidad: 0.15, // 15%
            cantidad_skins: 3,
            content_tier: {
              id: '60bca009-4182-7998-dee7-b8a2558dc369',
              nombre: 'Premium Edition',
              descripcion: 'Skins de alta calidad',
              color: '#d1548d', // Rosa
              uuid: '60bca009-4182-7998-dee7-b8a2558dc369'
            }
          },
          {
            id: '4',
            caja_id: cajaIdLocal || '',
            content_tier_id: '0cebb8be-46d7-c12a-d306-e9907bfc5a25', // Deluxe (rank 1)
            probabilidad: 0.30, // 30%
            cantidad_skins: 5,
            content_tier: {
              id: '0cebb8be-46d7-c12a-d306-e9907bfc5a25',
              nombre: 'Deluxe Edition',
              descripcion: 'Skins de buena calidad',
              color: '#009587', // Verde
              uuid: '0cebb8be-46d7-c12a-d306-e9907bfc5a25'
            }
          },
          {
            id: '5',
            caja_id: cajaIdLocal || '',
            content_tier_id: '12683d76-48d7-84a3-4e09-6985794f0445', // Select (rank 0)
            probabilidad: 0.40, // 40%
            cantidad_skins: 9,
            content_tier: {
              id: '12683d76-48d7-84a3-4e09-6985794f0445',
              nombre: 'Select Edition',
              descripcion: 'Skins comunes',
              color: '#5a9fe2', // Azul
              uuid: '12683d76-48d7-84a3-4e09-6985794f0445'
            }
          }
        ];
        
        setProbabilidades(defaultProbabilities);
        
      } catch (error: any) {
        console.error('Error al cargar la caja diaria:', error);
        // Si el error es de recursos insuficientes, esperar antes de reintentar
        if (error?.message?.includes('ERR_INSUFFICIENT_RESOURCES')) {
          setError('Demasiadas peticiones. Esperando antes de reintentar...');
          setTimeout(() => {
            if (isSubscribed) {
              loadDailyBox();
            }
          }, 5000); // Esperar 5 segundos antes de reintentar
          return;
        }
        setError(error.message || 'Error al cargar la caja diaria');
      } finally {
        setIsLoading(false);
      }
    }

    loadDailyBox();

    // Cleanup function
    return () => {
      isSubscribed = false;
    };
  }, []); // Array de dependencias vacío para evitar bucle infinito

  // Función para abrir la caja
  const openBox = () => {
    if (!skins.length || isOpening) return;
    
    // ...
    
    // Generar un número aleatorio entre 0 y 1
    const randomNum = Math.random();
    let accumulatedProbability = 0;
    let selectedTier: string | null = null;
    
    // Determinar el tier según la probabilidad
    for (const prob of probabilidades) {
      accumulatedProbability += prob.probabilidad;
      if (randomNum <= accumulatedProbability) {
        selectedTier = prob.content_tier_id;
        break;
      }
    }
    
    // Si por alguna razón no se seleccionó un tier, usar el último
    if (!selectedTier && probabilidades.length > 0) {
      selectedTier = probabilidades[probabilidades.length - 1].content_tier_id;
    }
    
    // Filtrar skins del tier seleccionado
    const tierSkins = skins.filter(skin => skin.content_tier_id === selectedTier);
    
    // Seleccionar una skin aleatoria del tier
    const randomIndex = Math.floor(Math.random() * tierSkins.length);
    const selectedSkin = tierSkins[randomIndex] || skins[0];
    
    // Simular tiempo de apertura
    setTimeout(() => {
      setResultSkin(selectedSkin);
      setIsOpening(false);
      
      // Registrar la transacción (esto se implementaría en una fase posterior)
      // registerTransaction(selectedSkin);
    }, 2000);
  };

  // Formatear el tiempo restante para la próxima actualización
  const formatTimeRemaining = () => {
    if (!nextUpdate) return 'Actualización pendiente';
    
    const now = new Date();
    const updateTime = new Date(nextUpdate);
    const diffMs = updateTime.getTime() - now.getTime();
    
    if (diffMs <= 0) return 'Actualización pendiente';
    
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m`;
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] w-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        <p className="mt-4 text-white/80">Cargando caja diaria...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] w-full">
        <p className="text-red-500">{error}</p>
        <Button 
          className="mt-4"
          onClick={() => window.location.reload()}
        >
          Reintentar
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center w-full max-w-4xl mx-auto">
      <div className="w-full bg-background/40 backdrop-blur-md border border-white/10 rounded-xl p-6 mb-8">
        <div className="flex flex-col md:flex-row items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Caja Diaria Gratuita</h2>
            <p className="text-white/80">Abre una caja gratis cada día y obtén skins increíbles</p>
          </div>
          <div className="mt-4 md:mt-0 flex flex-col items-end">
            <p className="text-white/60 text-sm">Próxima actualización en:</p>
            <p className="text-white font-medium">{formatTimeRemaining()}</p>
          </div>
        </div>
        
        {resultSkin ? (
          <div className="flex flex-col items-center justify-center p-6 bg-black/30 rounded-lg border border-white/5">
            <h3 className="text-xl font-medium mb-2" style={{ color: resultSkin.content_tier?.color || '#fff' }}>
              ¡Has obtenido!
            </h3>
            <div className="relative w-64 h-64 mb-4">
              {resultSkin.imagen_url && (
                <Image 
                  src={resultSkin.imagen_url} 
                  alt={resultSkin.nombre}
                  fill
                  className="object-contain"
                />
              )}
            </div>
            <h4 className="text-2xl font-bold mb-1" style={{ color: resultSkin.content_tier?.color || '#fff' }}>
              {resultSkin.nombre}
            </h4>
            <p className="text-white/80 mb-4">{resultSkin.content_tier?.nombre || 'Skin'}</p>
            <Button 
              onClick={() => setResultSkin(null)}
              className="mt-2"
            >
              Volver
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <div className="relative w-72 h-72 mb-6 transition-all duration-300 transform hover:scale-105">
              {isOpening ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary"></div>
                </div>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Image 
                    src="/free_cage.png" 
                    alt="Caja Diaria"
                    width={200}
                    height={200}
                    className="object-contain"
                  />
                </div>
              )}
            </div>
            
            <div className="flex gap-4 mb-6">
              <Button
                onClick={openBox}
                disabled={isOpening}
                className="px-8 py-6 text-lg"
              >
                Abrir Caja
              </Button>
              
              <Button
                variant="outline"
                onClick={() => setShowProbabilities(!showProbabilities)}
                className="px-4 py-6"
                title="Ver probabilidades"
              >
                {showProbabilities ? 'Ocultar probabilidades' : 'Ver probabilidades'}
              </Button>
            </div>
            
            {showProbabilities && (
              <div className="w-full bg-black/20 rounded-lg p-4 border border-white/10">
                <h3 className="text-lg font-medium text-white mb-3">Probabilidades de obtención</h3>
                <div className="space-y-2">
                  {probabilidades
                    .sort((a, b) => b.probabilidad - a.probabilidad)
                    .map((prob) => (
                      <div key={prob.id} className="flex justify-between items-center">
                        <div className="flex items-center">
                          <div 
                            className="w-3 h-3 rounded-full mr-2" 
                            style={{ backgroundColor: prob.content_tier?.color || '#fff' }}
                          ></div>
                          <span className="text-white/90">{prob.content_tier?.nombre || 'Desconocido'}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-white/70">{prob.cantidad_skins} skins</span>
                          <span className="text-white font-medium">{(prob.probabilidad * 100).toFixed(1)}%</span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
