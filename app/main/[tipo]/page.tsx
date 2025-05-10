'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@supabase/supabase-js';
import dynamic from 'next/dynamic';
import { getWeaponSkins, type Skin as ValorantSkin, filterQualitySkins, filterSkinsByIds } from '@/lib/valorantApi';
import { formatSkinForApp } from '@/lib/skinUtils';
import { motion } from 'framer-motion';

// Singleton para el cliente de Supabase
let supabaseClient: ReturnType<typeof createClient> | null = null;

const getSupabaseClient = () => {
  if (typeof window === 'undefined') {
    return null;
  }
  
  if (!supabaseClient) {
    supabaseClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  
  return supabaseClient;
};

// Definir tipos para las skins y tiers (igual que en DailyBox.tsx)
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

interface Caja {
  id: string;
  nombre: string;
  precio: number;
  imagen_url: string;
  descripcion: string;
  ruta: string;
  esta_disponible: boolean;
  es_diaria?: boolean;
  fecha_actualizacion?: string;
}

// Tipos de cajas disponibles
type TipoCaja = string; // Ahora puede ser cualquier string, no solo 'premium', 'diaria' o 'ultra'

// Función para crear datos por defecto mientras se cargan los datos reales
const crearCajaDefault = (tipo: TipoCaja): Caja => {
  // Valores por defecto genéricos que se usarán para cualquier tipo de caja
  return {
    id: `${tipo}-default`,
    nombre: `Caja ${tipo.charAt(0).toUpperCase() + tipo.slice(1)}`,
    precio: 1000, // Precio por defecto
    imagen_url: '/img/caja-default.png', // Imagen por defecto
    descripcion: 'Cargando descripción...',
    ruta: `/main/${tipo}`,
    esta_disponible: true
  };
};

// Función para obtener todas las cajas disponibles de la base de datos
const obtenerCajasDisponibles = async (supabase: any): Promise<string[]> => {
  try {
    const { data } = await supabase
      .from('cajas')
      .select('nombre')
      .eq('esta_disponible', true);
    
    if (data && data.length > 0) {
      // Extraer los nombres y convertirlos a formato de ruta (lowercase)
      return data.map((caja: any) => {
        // Extraer el nombre después de "Caja " si existe
        const nombreSinPrefijo = caja.nombre.startsWith('Caja ') 
          ? caja.nombre.substring(5).toLowerCase() 
          : caja.nombre.toLowerCase();
        return nombreSinPrefijo;
      });
    }
  } catch (error) {
    console.error('Error al obtener cajas disponibles:', error);
  }
  
  // Si hay un error o no hay datos, devolver los tipos básicos
  return ['premium', 'diaria', 'ultra'];
};

// Definimos la animación personalizada para el rebote lento
const bounceKeyframes = {
  '0%, 100%': { transform: 'translateY(0)' },
  '50%': { transform: 'translateY(-20px)' },
};

export default function CajaPage() {
  const params = useParams();
  const router = useRouter();
  const tipoParam = typeof params.tipo === 'string' ? params.tipo : params.tipo?.[0] || '';
  
  // Estados para manejar los tipos de cajas disponibles
  const [tiposDisponibles, setTiposDisponibles] = useState<string[]>(['premium', 'diaria', 'ultra']);
  const [tipoValidado, setTipoValidado] = useState<TipoCaja>(tipoParam || 'premium');
  
  // Estados principales
  const [caja, setCaja] = useState<Caja | null>(crearCajaDefault(tipoValidado));
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isOpening, setIsOpening] = useState<boolean>(false);
  
  // Efecto para cargar los tipos de cajas disponibles
  useEffect(() => {
    const cargarTiposDisponibles = async () => {
      const supabase = getSupabaseClient();
      if (!supabase) return;
      
      const tipos = await obtenerCajasDisponibles(supabase);
      setTiposDisponibles(tipos);
      
      // Validar que el tipo de caja solicitado esté disponible
      if (tipoParam && tipos.includes(tipoParam)) {
        setTipoValidado(tipoParam);
      } else {
        // Si el tipo no es válido, usar 'premium' o el primer tipo disponible
        const tipoDefault = tipos.includes('premium') ? 'premium' : tipos[0];
        setTipoValidado(tipoDefault);
        
        // Si estamos en el cliente y el tipo no es válido, redirigir
        if (typeof window !== 'undefined' && tipoParam !== tipoDefault) {
          router.replace(`/main/${tipoDefault}`);
        }
      }
    };
    
    cargarTiposDisponibles();
  }, [tipoParam]);
  const [reward, setReward] = useState<Skin | null>(null);
  const [showReward, setShowReward] = useState<boolean>(false);
  const [cajaSkins, setCajaSkins] = useState<Skin[]>([]);

  useEffect(() => {
    let isMounted = true;
    
    const fetchCaja = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Obtener el cliente de Supabase
        const supabase = getSupabaseClient();
        
        if (!supabase) {
          throw new Error('No se pudo conectar con la base de datos');
        }
        
        // Crear un AbortController para manejar timeout
        const controller = new AbortController();
        // Timeout de 5 segundos
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        // Obtener la caja desde Supabase
        let cajaData: any = null;
        let cajaError = null;
        
        // Primero intentamos con el formato "Caja Tipo" (ej: "Caja Premium")
        const resultado1 = await supabase
          .from('cajas')
          .select('*')
          .eq('nombre', `Caja ${tipoValidado.charAt(0).toUpperCase() + tipoValidado.slice(1)}`)
          .maybeSingle();
          
        if (resultado1.data) {
          cajaData = resultado1.data;
        } else {
          // Si no funciona, intentamos con solo el tipo (ej: "Premium")
          const resultado2 = await supabase
            .from('cajas')
            .select('*')
            .eq('nombre', `${tipoValidado.charAt(0).toUpperCase() + tipoValidado.slice(1)}`)
            .maybeSingle();
            
          if (resultado2.data) {
            cajaData = resultado2.data;
          } else {
            // Si aún no funciona, intentamos buscar por tipo en cualquier parte del nombre
            const resultado3 = await supabase
              .from('cajas')
              .select('*')
              .ilike('nombre', `%${tipoValidado}%`)
              .maybeSingle();
              
            if (resultado3.data) {
              cajaData = resultado3.data;
            } else {
              cajaError = resultado1.error || resultado2.error || resultado3.error;
            }
          }
        }
        
        // Si encontramos la caja, cargar las skins asociadas
        if (cajaData) {
          // Obtener las skins asociadas a esta caja desde la tabla cajas_skins
          try {
            // Primero, obtener solo los IDs de las skins asociadas a esta caja
            const { data: skinIdsData, error: skinIdsError } = await supabase
              .from('cajas_skins')
              .select('skin_id')
              .eq('caja_id', cajaData.id);
            
            if (skinIdsError) {
              // Continuamos con la caja sin skins, sin mostrar error al usuario
            } else if (!skinIdsData || skinIdsData.length === 0) {
              // Si es la caja diaria y no tiene skins, intentamos actualizarla
              if (tipoValidado === 'diaria' && !isUpdating) {
                setTimeout(() => forceUpdateDailyBox(), 500);
              }
            } else {
              // Extraer los IDs de las skins con comprobación de seguridad
              const skinIds = skinIdsData ? skinIdsData.map((item: any) => item.skin_id) : [];
              
              try {
                // Obtener todas las skins de la API de Valorant
                const allSkins = await getWeaponSkins();
                
                // Primero aplicar el filtro de calidad a todas las skins
                const qualitySkins = filterQualitySkins(allSkins);
                
                // Extraer los IDs de las skins con comprobación de seguridad
                const skinIds = skinIdsData ? skinIdsData.map((item: any) => item.skin_id) : [];
                
                // Luego filtrar por los IDs específicos de esta caja
                const matchingSkins = filterSkinsByIds(qualitySkins, skinIds);
                
                if (matchingSkins.length > 0) {
                  // Obtener datos de tier para cada skin
                  const formattedSkins: Skin[] = [];
                  
                  for (const skin of matchingSkins) {
                    // Usar valores por defecto para el tier si no tenemos datos específicos
                    const tierData = { 
                      nombre: 'Desconocido', 
                      color: '#5a9fe2' // Azul por defecto
                    };
                    
                    // Usar la función de utilidad para formatear la skin
                    formattedSkins.push(formatSkinForApp(skin, tierData));
                  }
                
                  setCajaSkins(formattedSkins);
                  
                  // Opcionalmente, si necesitas los content_tiers, puedes cargarlos en una consulta separada
                  // Pero por ahora, simplemente usamos los datos básicos de las skins
                }
              } catch (apiError) {
                // Continuamos sin mostrar error al usuario
              }
            }
          } catch (error) {
            // Capturamos el error pero continuamos sin interrumpir la experiencia
          }
        }
        
        // Limpiar el timeout
        clearTimeout(timeoutId);
        
        if (cajaError) {
          console.warn(`No se encontró la caja '${tipoValidado}' en la base de datos:`, cajaError);
          // No lanzamos error, simplemente continuamos con los datos por defecto
        }
        
        if (isMounted) {
          if (cajaData) {
            // Convertir primero a unknown y luego a Caja para evitar el error de TypeScript
            // Esta es una forma segura de hacer la conversión cuando estamos seguros de la estructura
            const cajaTyped = cajaData as unknown as Caja;
            setCaja(cajaTyped);
          } else {
            // Usar los datos por defecto para esta caja
            setCaja(crearCajaDefault(tipoValidado));
          }
        }
      } catch (error: any) {
        console.error(`Error al cargar la caja ${tipoValidado}:`, error);
        
        if (isMounted) {
          if (error.name === 'AbortError') {
            console.error('Timeout al cargar la caja:', error);
            setError('Tiempo de espera agotado. Mostrando datos locales.');
          } else {
            console.error(`Error al cargar la caja ${tipoValidado}:`, error);
            setError(`No se pudo conectar con el servidor. Mostrando datos locales.`);
          }
          
          // Esperar un momento y luego ocultar el mensaje de error
          setTimeout(() => {
            if (isMounted) {
              setError(null);
            }
          }, 3000);
          // Usar datos por defecto en caso de error
          setCaja(crearCajaDefault(tipoValidado));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    
    fetchCaja();
    
    // Cleanup al desmontar el componente
    return () => {
      isMounted = false;
    };
  }, [tipoValidado]);

  // Función para manejar la apertura de la caja
  const handleOpenBox = (caja: Caja) => {
    if (!caja.esta_disponible || isOpening) return;
    
    // Si no hay skins disponibles, mostrar error
    if (cajaSkins.length === 0) {
      setError('No hay skins disponibles en esta caja');
      setTimeout(() => setError(null), 3000);
      return;
    }
    
    setIsOpening(true);
    
    // Simular el proceso de apertura (en una app real, esto sería una llamada a la API)
    setTimeout(() => {
      // Seleccionar una skin aleatoria de las disponibles en la caja
      const randomIndex = Math.floor(Math.random() * cajaSkins.length);
      const randomSkin = cajaSkins[randomIndex];
      
      // Mostrar la recompensa
      setReward(randomSkin);
      setShowReward(true);
      setIsOpening(false);
      
      // En una app real, aquí actualizaríamos el inventario del usuario
      // Por ejemplo, con una llamada a Supabase:
      /*
      const supabase = getSupabaseClient();
      if (supabase) {
        supabase.from('inventario_usuario').insert({
          user_id: 'id_del_usuario_actual',
          skin_id: randomSkin.id,
          fecha_obtencion: new Date().toISOString()
        });
      }
      */
    }, 2000); // Simular 2 segundos de animación de apertura
  };

  // Importar el componente DailyBox para la caja diaria
  const DailyBox = dynamic(() => import('@/components/DailyBox'), {
    loading: () => ( 
      <div className="flex flex-col items-center justify-center min-h-[400px] w-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    ),
    ssr: false
  });

  // Estado para el panel de administración (solo para la caja diaria)
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateMessage, setUpdateMessage] = useState<string | null>(null);

  // Función para forzar la actualización de la caja diaria
  const forceUpdateDailyBox = async () => {
    if (isUpdating) return;
    
    try {
      setIsUpdating(true);
      setUpdateMessage(null);
      
      const supabase = getSupabaseClient();
      
      if (!supabase) {
        throw new Error('No se pudo conectar con la base de datos');
      }
      
      // Obtener todas las skins disponibles
      const allSkins = await getWeaponSkins();
      
      if (!caja?.id) throw new Error('No se encontró la caja diaria');

      // Lista de nombres de armas a excluir
      const bannedWeaponNames = [
        "Classic", "Shorty", "Frenzy", "Ghost", "Sheriff",
        "Stinger", "Spectre", "Bucky", "Judge", "Bulldog",
        "Guardian", "Phantom", "Vandal", "Marshal", "Operator",
        "Ares", "Odin", "Outlaw", "Melee"
      ];

      // Variable para almacenar las skins filtradas
      let filteredSkins: ValorantSkin[] = [];

      // Obtener información de bundles como en el catálogo
      try {
        const bundlesResponse = await fetch('https://valorant-api.com/v1/bundles');
        const bundlesData = await bundlesResponse.json();
        const bundles: any[] = bundlesData.data;

        // Crear un mapa de bundles para búsqueda rápida
        const bundleMap = new Map<string, any>();
        bundles.forEach((bundle: any) => {
          bundleMap.set(bundle.displayName.toLowerCase(), bundle);
        });

        // Filtramos las skins que contienen "standard" en su nombre o que tienen exactamente el nombre de un arma
        // También filtramos para incluir solo skins que pertenecen a un bundle (tienen themeUuid)
        // Y aseguramos que tengan displayIcon válido para mostrar
        // Además, verificamos si el bundle tiene imagen (como en el catálogo)
        filteredSkins = allSkins.filter((skin: ValorantSkin) => {
          if (!skin.themeUuid || !skin.displayIcon || 
              skin.displayName.toLowerCase().includes("standard") || 
              bannedWeaponNames.includes(skin.displayName)) {
            return false;
          }
          
          // Verificar si el bundle tiene imagen (como en el catálogo)
          const bundleName = skin.displayName.split(' ')[0];
          const bundle = bundleMap.get(bundleName.toLowerCase());
          return bundle && bundle.displayIcon;
        });
      } catch (error) {
        console.error('Error al obtener información de bundles:', error);
        
        // Filtrado básico como fallback en caso de error
        filteredSkins = allSkins.filter(
          (skin: ValorantSkin) =>
            !skin.displayName.toLowerCase().includes("standard") &&
            !bannedWeaponNames.includes(skin.displayName) &&
            skin.themeUuid && // Solo incluir skins que pertenecen a un bundle
            skin.displayIcon // Asegurar que tienen una imagen para mostrar
        );
      }

      // Obtener las probabilidades de la caja diaria
      const { data: probabilidades, error: probError } = await supabase
        .from('tier_probabilidades')
        .select('content_tier_id, cantidad_skins')
        .eq('caja_id', caja.id);
      
      if (probError) throw probError;
      if (!probabilidades) throw new Error('No se encontraron probabilidades para la caja');
      
      // Obtener la relación entre content_tier_id y uuid de la API de Valorant
      const { data: contentTiers, error: contentTiersError } = await supabase
        .from('content_tiers')
        .select('id, uuid');
        
      if (contentTiersError) throw contentTiersError;
      if (!contentTiers) throw new Error('No se encontraron los content tiers');
      
      // Crear un mapa para relacionar los IDs internos con los UUIDs de la API
      const tierIdToUuid = new Map<string, string>();
      
      // Usar una interfaz para tipar correctamente los datos
      interface ContentTier {
        id: string;
        uuid: string;
      }
      
      // Convertir los datos a un tipo seguro
      const typedContentTiers = contentTiers as ContentTier[];
      
      typedContentTiers.forEach(tier => {
        tierIdToUuid.set(tier.id, tier.uuid);
      });
      
      interface TierProbabilidad {
        content_tier_id: string;
        cantidad_skins: number;
      }

      // Preparar las skins por tier usando las skins filtradas
      const skinsByTier = new Map<string, { skins: ValorantSkin[], cantidad: number }>();
      (probabilidades as TierProbabilidad[]).forEach((prob) => {
        // Obtener el UUID correspondiente al ID interno
        const tierUuid = tierIdToUuid.get(prob.content_tier_id);
        
        if (tierUuid) {
          // Filtrar las skins por el UUID de la API
          const tierSkins = filteredSkins.filter(skin => skin.contentTierUuid === tierUuid);
          
          console.log(`Tier ${prob.content_tier_id} (UUID: ${tierUuid}): ${tierSkins.length} skins encontradas`);
          
          skinsByTier.set(prob.content_tier_id, {
            skins: tierSkins,
            cantidad: prob.cantidad_skins
          });
        }
      });
      
      // Seleccionar skins aleatorias por cada tier
      interface SelectedSkin {
        skin_id: string;
        content_tier_id: string;
        skin_nombre: string; // Añadimos el nombre de la skin
      }
      
      const selectedSkins: SelectedSkin[] = [];
      
      // Obtener los nombres de los tiers para los logs
      const tierNames = new Map<string, string>();
      
      // Obtener todos los nombres de tiers de una sola vez
      const { data: allTiers } = await supabase
        .from('content_tiers')
        .select('id, nombre');
        
      if (allTiers) {
        allTiers.forEach((tier: any) => {
          tierNames.set(tier.id, tier.nombre);
        });
      }
      
      console.log('=== SELECCIONANDO SKINS POR TIER ===');
      
      skinsByTier.forEach(({ skins, cantidad }, tierId) => {
        const tierName = tierNames.get(tierId) || 'Desconocido';
        console.log(`Tier: ${tierName} (ID: ${tierId})`);
        console.log(`  - Skins disponibles: ${skins.length}`);
        console.log(`  - Cantidad requerida: ${cantidad}`);
        
        if (skins.length === 0) {
          console.warn(`  - ADVERTENCIA: No hay skins disponibles para el tier ${tierName}`);
          return;
        }
        
        if (skins.length < cantidad) {
          console.warn(`  - ADVERTENCIA: No hay suficientes skins para el tier ${tierName}. Disponibles: ${skins.length}, Requeridas: ${cantidad}`);
        }
        
        const shuffled = [...skins].sort(() => Math.random() - 0.5);
        const selected = shuffled.slice(0, Math.min(cantidad, shuffled.length));
        
        console.log(`  - Skins seleccionadas: ${selected.length}`);
        
        selected.forEach(skin => {
          selectedSkins.push({
            skin_id: skin.uuid,
            content_tier_id: tierId,
            skin_nombre: skin.displayName // Incluimos el nombre de la skin
          });
          console.log(`    * ${skin.displayName}`);
        });
      });
      
      // Actualizar la caja con las nuevas skins
      const { error: updateError } = await supabase.rpc(
        'actualizar_skins_caja_diaria',
        { skins_json: selectedSkins }
      );
      
      if (updateError) throw updateError;
      
      setUpdateMessage('¡Caja diaria actualizada con éxito! Recargando...');
      
      // Recargar la página después de 2 segundos
      setTimeout(() => {
        window.location.reload();
      }, 2000);
      
    } catch (error: any) {
      console.error('Error al actualizar la caja diaria:', error);
      setUpdateMessage(`Error: ${error.message || 'No se pudo actualizar la caja diaria'}`);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="flex flex-col gap-8 pl-16 md:pr-12 lg:pr-16 pt-12 pb-12 min-h-screen bg-background w-full max-w-full flex-1">
      <div className="w-full">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold text-foreground flex items-center font-[Raleway] font-semibold italic tracking-widest">
            {isLoading ? '/ CARGANDO...' : error ? '/ ERROR' : `/ ${caja?.nombre?.toUpperCase() || `CAJA ${tipoValidado.toUpperCase()}`}`}
          </h2>
          
          <div className="flex items-center gap-2">
            {tipoValidado.includes('diaria') && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowAdminPanel(!showAdminPanel)}
                className="mr-2"
              >
                {showAdminPanel ? 'Ocultar Admin' : 'Admin'}
              </Button>
            )}
            <Link href="/main">
              <Button variant="outline" size="sm" className="flex items-center gap-1">
                <ChevronLeft size={16} />
                Volver
              </Button>
            </Link>
          </div>
        </div>
        
        {/* Panel de administración para la caja diaria */}
        {tipoValidado.includes('diaria') && showAdminPanel && (
          <div className="w-full bg-black/30 backdrop-blur-sm border border-white/10 rounded-lg p-4 mb-4">
            <h3 className="text-lg font-medium text-white mb-3">Panel de Administración - Caja Diaria</h3>
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <Button 
                onClick={forceUpdateDailyBox}
                disabled={isUpdating}
                variant="destructive"
                className="flex items-center gap-2"
              >
                {isUpdating ? (
                  <>
                    <span className="animate-spin h-4 w-4 border-t-2 border-b-2 border-white rounded-full"></span>
                    Actualizando...
                  </>
                ) : (
                  'Forzar actualización de caja diaria'
                )}
              </Button>
              
              {updateMessage && (
                <p className={updateMessage.includes('Error') ? 'text-red-400' : 'text-green-400'}>
                  {updateMessage}
                </p>
              )}
            </div>
            <p className="text-white/60 text-sm mt-2">
              Nota: Esta función es solo para pruebas. En producción, la caja se actualizará automáticamente a las 9:00 AM.  
            </p>
          </div>
        )}
        
        <div className="w-full rounded-3xl bg-gradient-to-br from-primary/10 via-backgroundAlt/30 to-secondary/5 backdrop-blur-sm border border-border/30 p-6 shadow-xl overflow-hidden relative">
          {/* Efecto de fondo */}
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/10 rounded-full blur-3xl opacity-30"></div>
          <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-secondary/10 rounded-full blur-3xl opacity-30"></div>
          
          {/* Contenido de la caja */}
          <div className="relative z-10 flex flex-col items-center justify-center min-h-[400px] w-full">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center">
                <p className="text-red-500">{error}</p>
                <Button 
                  className="mt-4"
                  onClick={() => window.location.reload()}
                >
                  Reintentar
                </Button>
              </div>
            ) : tipoValidado.includes('diaria') ? (
              <>
                <div className="w-full flex justify-end mb-4">
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    onClick={() => setShowAdminPanel(!showAdminPanel)}
                    className="flex items-center gap-1"
                  >
                    {showAdminPanel ? '✖ Ocultar panel' : '⚙️ Administrar caja'}
                  </Button>
                </div>
                <DailyBox />
              </>
            ) : caja ? (
              <>
                <div className="relative w-72 h-72 mb-6 transition-all duration-300 transform hover:scale-105">
                  {caja.imagen_url && (
                    <Image 
                      src={caja.imagen_url} 
                      alt={caja.nombre}
                      width={200}
                      height={200}
                      className="object-contain"
                    />
                  )}
                </div>
                <h3 className="text-2xl font-bold text-primary mb-4">{caja.nombre}</h3>
                <p className="text-white/80 text-center max-w-md mb-6">
                  {caja.descripcion}
                </p>
                <Button
                  disabled={!caja.esta_disponible || isOpening}
                  className={`px-8 py-6 text-lg ${!caja.esta_disponible || isOpening ? 'opacity-70' : ''}`}
                  onClick={() => handleOpenBox(caja)}
                >
                  {isOpening ? (
                    <span className="flex items-center">
                      <span className="animate-spin h-5 w-5 mr-2 border-t-2 border-b-2 border-white rounded-full"></span>
                      Abriendo...
                    </span>
                  ) : (
                    caja.esta_disponible ? `Abrir por ${caja.precio} VP` : 'Próximamente'
                  )}
                </Button>
                
                {/* Modal de recompensa */}
                {showReward && reward && (
                  <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
                    <div className="bg-backgroundAlt p-8 rounded-xl max-w-md w-full text-center relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-secondary/20 opacity-50"></div>
                      <div className="relative z-10">
                        <h3 className="text-2xl font-bold text-primary mb-2">¡Recompensa obtenida!</h3>
                        <div className="my-6 p-4 flex justify-center">
                          {reward.imagen_url && (
                            <div className="relative w-48 h-48 animate-bounce-slow">
                              <Image
                                src={reward.imagen_url}
                                alt={reward.nombre}
                                width={200}
                                height={200}
                                className="object-contain"
                              />
                            </div>
                          )}
                        </div>
                        <p className="text-xl font-semibold text-white mb-4">{reward.nombre}</p>
                        {reward.content_tier && (
                          <div 
                            className="px-3 py-1 rounded-full text-sm font-medium mb-4 inline-block" 
                            style={{ backgroundColor: reward.content_tier.color + '40', color: reward.content_tier.color }}
                          >
                            {reward.content_tier.nombre}
                          </div>
                        )}
                        <Button
                          onClick={() => setShowReward(false)}
                          className="px-6 py-2"
                        >
                          Aceptar
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
