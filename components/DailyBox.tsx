'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { Skin as ValorantSkin, getWeaponSkins, filterQualitySkins, getRandomSkins, filterSkinsByBundleWithIcon } from '@/lib/valorantApi';
import { formatSkinForApp } from '@/lib/skinUtils';

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

// Nota: Ahora usamos la función getRandomSkins importada desde valorantApi.ts

// Función para obtener los datos del tier desde la base de datos
async function getTierData(supabase: any, tierUuid: string | null): Promise<{nombre: string, color: string}> {
  if (!tierUuid) return { nombre: 'Select Edition', color: '#5a9fe2' };
  
  try {
    const { data } = await supabase
      .from('content_tiers')
      .select('nombre, color')
      .eq('uuid', tierUuid)
      .maybeSingle();
    
    if (data) {
      return { nombre: data.nombre, color: data.color };
    }
  } catch (error) {
    // Silenciar error
  }
  
  // Valores por defecto si no se encuentra en la base de datos
  return { nombre: 'Select Edition', color: '#5a9fe2' };
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

  const [userInventory, setUserInventory] = useState<string[]>([]);
  const [dailyOpened, setDailyOpened] = useState(false);

  // Crear cliente de Supabase
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Cargar datos de la caja diaria
  useEffect(() => {
    let isSubscribed = true; // Para evitar actualizaciones si el componente se desmonta
    let timeoutId: NodeJS.Timeout | null = null;
    
    async function loadDailyBox() {
      try {
        if (isSubscribed) setIsLoading(true);
        
        // Establecer un timeout para evitar carga infinita
        timeoutId = setTimeout(() => {
          if (isSubscribed && isLoading) {
            console.error('Timeout al cargar la caja diaria');
            setError('Tiempo de espera agotado. Por favor, recarga la página.');
            setIsLoading(false);
          }
        }, 15000); // 15 segundos de timeout
        
        // Obtener la caja diaria
        const { data: cajasData, error: cajasError } = await supabase
          .from('cajas')
          .select('id, nombre, fecha_actualizacion')
          .eq('es_diaria', true)
          .limit(1);
        
        if (!isSubscribed) return; // Verificar si el componente sigue montado
        
        if (cajasError) {
          console.error('Error al obtener la caja diaria:', cajasError);
          setError('Error al obtener la caja diaria: ' + cajasError.message);
          setIsLoading(false);
          return;
        }
        
        let cajaIdLocal: string | null = null;

        if (!cajasData || cajasData.length === 0) {
          console.log('No se encontró la caja diaria, intentando crearla...');
          // Si no hay caja diaria, intentar crearla mediante la función RPC
          const { data: nuevaCajaId, error: nuevaCajaError } = await supabase.rpc('forzar_actualizacion_caja_diaria');
          
          if (!isSubscribed) return;
          
          if (nuevaCajaError) {
            console.error('Error al crear la caja diaria:', nuevaCajaError);
            setError('Error al crear la caja diaria: ' + nuevaCajaError.message);
            setIsLoading(false);
            return;
          }
          
          // Obtener el ID de la caja recién creada
          const { data: nuevaCajaData, error: nuevaCajaDataError } = await supabase
            .from('cajas')
            .select('id')
            .eq('es_diaria', true)
            .limit(1);
            
          if (!isSubscribed) return;
          
          if (nuevaCajaDataError) {
            console.error('Error al obtener la caja recién creada:', nuevaCajaDataError);
            setError('Error al obtener la caja recién creada: ' + nuevaCajaDataError.message);
            setIsLoading(false);
            return;
          }
          
          if (!nuevaCajaData || nuevaCajaData.length === 0) {
            console.error('No se pudo crear la caja diaria');
            setError('No se pudo crear la caja diaria');
            setIsLoading(false);
            return;
          }
          
          cajaIdLocal = nuevaCajaData[0].id;
          if (isSubscribed) setCajaId(cajaIdLocal);
        } else {
          cajaIdLocal = cajasData[0].id;
          if (isSubscribed) setCajaId(cajaIdLocal);
        }
        
        // Validar que cajaIdLocal no sea null antes de consultas dependientes
        if (!cajaIdLocal) {
          console.error('La caja diaria no está disponible');
          if (isSubscribed) {
            setError('La caja diaria no está disponible.');
            setIsLoading(false);
          }
          return;
        }

        // Obtener la próxima actualización
        const { data: configData, error: configError } = await supabase
          .from('caja_diaria_config')
          .select('proxima_actualizacion')
          .eq('caja_id', cajaIdLocal)
          .limit(1);
        
        if (!isSubscribed) return;
        
        if (configError) {
          console.error('Error al obtener la configuración de la caja diaria:', configError);
          // No interrumpimos el flujo por este error, solo lo registramos
        } else if (configData && configData.length > 0) {
          if (isSubscribed) setNextUpdate(configData[0].proxima_actualizacion);
        }
        
        // Verificar si hay skins en la caja
        const { data: cajaSkins, error: cajasSkinsError } = await supabase
          .from('cajas_skins')
          .select('skin_id, content_tier_id')
          .eq('caja_id', cajaIdLocal);
          
        if (!isSubscribed) return;
        
        if (cajasSkinsError) {
          console.error('Error al obtener las skins de la caja:', cajasSkinsError);
          setError('Error al cargar las skins de la caja: ' + cajasSkinsError.message);
          setIsLoading(false);
          return;
        }
        
        // Si no hay skins en la caja, obtenerlas de la API de Valorant y guardarlas
        if (!cajaSkins || cajaSkins.length === 0) {
          try {
            console.log('No hay skins en la caja diaria, obteniendo de la API de Valorant...');
            const valorantSkins = await getWeaponSkins();
            
            if (!isSubscribed) return;
            
            // Filtrar las skins usando la función centralizada
            // Solo skins que pertenecen a bundles con imagen de portada
            const filteredSkins = await filterSkinsByBundleWithIcon(valorantSkins);
            
            if (!isSubscribed) return;
            
            // Asegurarse de tener suficientes skins para la selección
            if (filteredSkins.length < 20) {
              console.warn(`Solo se encontraron ${filteredSkins.length} skins válidas, menos de las 20 requeridas.`);
            }
            
            // Seleccionar exactamente 20 skins aleatorias para la caja diaria
            const shuffled = [...filteredSkins].sort(() => 0.5 - Math.random());
            const randomSkins = shuffled.slice(0, Math.min(20, shuffled.length));
            
            console.log(`Seleccionadas ${randomSkins.length} skins para la caja diaria.`);
            
            // Formatear las skins para que coincidan con nuestro tipo Skin
            const formattedSkins: Skin[] = [];
            
            // Procesar cada skin y obtener sus datos de tier
            for (const skin of randomSkins) {
              if (!isSubscribed) return;
              
              // Obtener los datos del tier desde la base de datos
              const tierData = await getTierData(supabase, skin.contentTierUuid);
              
              // Usar la función de utilidad para formatear la skin
              formattedSkins.push(formatSkinForApp(skin, tierData));
            }
            
            if (!isSubscribed) return;
            
            // Primero, eliminar todas las skins anteriores de esta caja
            try {
              console.log('Eliminando skins anteriores de la caja diaria...');
              const { error: deleteError } = await supabase
                .from('cajas_skins')
                .delete()
                .eq('caja_id', cajaIdLocal);
              
              if (deleteError) {
                console.error('Error al eliminar skins anteriores:', deleteError);
              }
            } catch (deleteErr) {
              console.error('Error al eliminar skins anteriores:', deleteErr);
              // Capturamos el error pero continuamos
            }
            
            if (!isSubscribed) return;
            
            // Guardar las nuevas skins en la base de datos (máximo 10 para evitar demasiadas)
            const skinsToSave = formattedSkins.slice(0, 10);
            console.log(`Guardando ${skinsToSave.length} skins en la base de datos...`);
            
            const insertPromises = [];
            
            for (const skin of skinsToSave) {
              if (!isSubscribed) return;
              
              // Obtener el ID y nombre del content tier
              const { data: tierData } = await supabase
                .from('content_tiers')
                .select('id, nombre')
                .eq('uuid', skin.content_tier_id)
                .limit(1);
                
              if (!isSubscribed) return;
                
              const contentTierId = tierData && tierData.length > 0 ? tierData[0].id : null;
              const tierNombre = tierData && tierData.length > 0 ? tierData[0].nombre : null;
              
              // Insertar la skin en la tabla cajas_skins
              const insertPromise = supabase
                .from('cajas_skins')
                .insert({
                  id: crypto.randomUUID(), // Generamos un UUID aleatorio para el id
                  caja_id: cajaIdLocal,
                  skin_id: skin.id,
                  skin_nombre: skin.nombre, // Guardar también el nombre de la skin
                  content_tier_id: contentTierId,
                  tier_nombre: tierNombre // Guardar el nombre del tier
                });
                
              insertPromises.push(insertPromise);
            }
            
            // Esperar a que todas las inserciones terminen
            await Promise.all(insertPromises);
            
            if (isSubscribed) {
              console.log('Skins guardadas correctamente en la base de datos');
              setSkins(formattedSkins);
            }
          } catch (error) {
            console.error('Error al cargar las skins:', error);
            if (isSubscribed) {
              setError('Error al cargar las skins. Por favor, intenta de nuevo más tarde.');
              setIsLoading(false);
            }
            return;
          }
        } else {
          // Si ya hay skins en la caja, obtener sus detalles de la API de Valorant
          try {
            const valorantSkins = await getWeaponSkins();
            
            // Mapear las skins de la caja con los datos de la API
            const cajaSkinsIds = cajaSkins.map(s => s.skin_id);
            const cajaSkinsData = valorantSkins.filter(s => cajaSkinsIds.includes(s.uuid));
            
            // Formatear las skins
            const formattedSkins: Skin[] = [];
            
            // Procesar cada skin y obtener sus datos de tier
            for (const skin of cajaSkinsData) {
              // Obtener los datos del tier desde la base de datos
              const tierData = await getTierData(supabase, skin.contentTierUuid);
              
              // Usar la función de utilidad para formatear la skin
              formattedSkins.push(formatSkinForApp(skin, tierData));
            }
            
            setSkins(formattedSkins);
          } catch (error) {
            console.error('Error al obtener detalles de skins:', error);
            setError('Error al cargar los detalles de las skins.');
            setIsLoading(false);
            return;
          }
        }
        
        // Usar las funciones definidas fuera del bloque
        
        // Crear probabilidades predefinidas para los tiers (según los requisitos específicos)
        const defaultProbabilities = [
          {
            id: '1',
            caja_id: cajaIdLocal || '',
            content_tier_id: '411e4a55-4e59-7757-41f0-86a53f101bb5', // Ultra (rank 4)
            probabilidad: 0.01, // 1%
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
            probabilidad: 0.005, // 0.5%
            cantidad_skins: 1,
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
            probabilidad: 0.085, // 8.5%
            cantidad_skins: 2,
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
            probabilidad: 0.25, // 25%
            cantidad_skins: 4,
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
            probabilidad: 0.65, // 65%
            cantidad_skins: 12,
            content_tier: {
              id: '12683d76-48d7-84a3-4e09-6985794f0445',
              nombre: 'Select Edition',
              descripcion: 'Skins comunes',
              color: '#5a9fe2', // Azul
              uuid: '12683d76-48d7-84a3-4e09-6985794f0445'
            }
          }
        ];
        
        // Verificar que la suma de probabilidades sea 1
        const totalProbability = defaultProbabilities.reduce((sum, prob) => sum + prob.probabilidad, 0);
        if (Math.abs(totalProbability - 1) > 0.001) {
          console.warn(`La suma de probabilidades (${totalProbability}) no es exactamente 1. Esto podría causar problemas.`);
        }
        
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

  // Función para abrir la caja diaria
  const openBox = async () => {
    if (!skins.length || isOpening || !cajaId || dailyOpened) return;
    
    setIsOpening(true);
    
    try {
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
      
      // Si no hay skins en el tier seleccionado, usar cualquier skin
      const availableSkins = tierSkins.length > 0 ? tierSkins : skins;
      
      // Seleccionar una skin aleatoria del tier
      const randomIndex = Math.floor(Math.random() * availableSkins.length);
      const selectedSkin = availableSkins[randomIndex];
      
      // Registrar la transacción en la base de datos
      if (selectedSkin) {
        try {
          const { data: userData } = await supabase.auth.getUser();
          
          if (userData && userData.user) {
            // Registrar la transacción
            const { error: transactionError } = await supabase
              .from('transacciones')
              .insert({
                usuario_id: userData.user.id,
                caja_id: cajaId,
                skin_id: selectedSkin.id,
                fecha: new Date().toISOString()
              });
              
            if (transactionError) {
              console.error('Error al registrar la transacción:', transactionError);
            }
            
            // Registrar la skin en el inventario del usuario
            // Primero verificar si ya existe en el inventario
            const { data: existingItem } = await supabase
              .from('inventario_usuario')
              .select('*')
              .eq('usuario_id', userData.user.id)
              .eq('skin_id', selectedSkin.id)
              .maybeSingle();
            
            // Solo insertar si no existe
            if (!existingItem) {
              await supabase
                .from('inventario_usuario')
                .insert({
                  usuario_id: userData.user.id,
                  skin_id: selectedSkin.id
                });
            }
              
            // Actualizar el inventario local
            setUserInventory(prev => [...prev, selectedSkin.id]);
          } else {
            // Usuario no autenticado, usar ID de prueba
            const userId = 'usuario-prueba';
            
            // Registrar la transacción
            const { error: transactionError } = await supabase
              .from('transacciones')
              .insert({
                usuario_id: userId,
                caja_id: cajaId,
                skin_id: selectedSkin.id,
                fecha: new Date().toISOString()
              });
              
            if (transactionError) {
              console.error('Error al registrar la transacción:', transactionError);
            }
          }
        } catch (authError) {
          console.error('Error al obtener usuario:', authError);
          // Continuar con la apertura aunque falle la autenticación
        }
      }
      
      // Simular tiempo de apertura
      setTimeout(() => {
        setResultSkin(selectedSkin);
        setIsOpening(false);
        setDailyOpened(true);
      }, 2000);
    } catch (error) {
      console.error('Error al abrir la caja:', error);
      setIsOpening(false);
      setError('Error al abrir la caja. Por favor, intenta de nuevo.');
    }
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
                <div className="space-y-3">
                  {probabilidades
                    .sort((a, b) => b.probabilidad - a.probabilidad)
                    .map((prob) => {
                      // Calcular el ancho de la barra de progreso basado en la probabilidad
                      const barWidth = `${Math.max(prob.probabilidad * 100, 0.5)}%`;
                      return (
                        <div key={prob.id} className="space-y-1">
                          <div className="flex justify-between items-center">
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
                          {/* Barra de progreso para visualizar la probabilidad */}
                          <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <div 
                              className="h-full rounded-full" 
                              style={{ 
                                width: barWidth, 
                                backgroundColor: prob.content_tier?.color || '#fff',
                                transition: 'width 0.5s ease-in-out'
                              }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}