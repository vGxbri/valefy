"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RiSearch2Line } from "react-icons/ri";
import { X, Filter, Sparkles } from 'lucide-react';
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import InfoModal from "./InfoModal";
import { 
  getWeaponSkins as fetchAllApiSkinsFromValorantApi,
  getBestDisplayIcon,
  getWeaponType,
  getWeaponSpecificStyles,
  filterSkinsByBundleWithIcon,
  Skin as ValorantApiSkin
} from "@/lib/valorantApi";
import { extractBundleName } from '@/lib/utils';

// Definición del ContentTier de Supabase (ya existente y correcta)
type SupabaseContentTier = {
  id: string; // Supabase content_tier ID (UUID)
  nombre: string;
  color: string;
  uuid_api: string; // Valorant API tier UUID
  grado: string;
};

// Definición de Skin para la página de Mejoras (actualizada sin cantidad)
type Skin = {
  id: string; // ID único (DB row ID para esta página)
  skin_id?: string; // Valorant API skin UUID  
  nombre: string;
  bundleName?: string;
  content_tier_id: string; // Valorant API tier UUID
  uuid: string; // Valorant API skin UUID
  imagen_url: string;
  content_tier?: SupabaseContentTier;
  selected?: boolean;
  // Agregamos campos para manejar conteo de skins duplicadas
  count?: number;
  inventoryIds?: string[]; // IDs de las filas en la DB para esta skin
};

// Tipo para los items del inventario del usuario desde la DB (actualizado)
interface InventoryItemFromDB {
  id: string; // ID de la fila en inventario_usuario
  skin_id: string; // Valorant API skin UUID
  skin_nombre: string | null; // Nombre de la skin (fallback)
  fecha_obtencion: string; // Fecha de obtención
}

export default function MejorasPage() {
  const { data: nextAuthSession, status: nextAuthStatus } = useSession();
  const supabase = createClientComponentClient();
  
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState<boolean>(true);

  const [userInventory, setUserInventory] = useState<Skin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSkins, setSelectedSkins] = useState<Skin[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTier, setFilterTier] = useState<string>("");
  const maxSelectedSkins = 5;

  const [allApiSkins, setAllApiSkins] = useState<ValorantApiSkin[] | null>(null);
  const [allSupabaseTiers, setAllSupabaseTiers] = useState<SupabaseContentTier[] | null>(null);
  
  // Estados para el modal de resultado
  const [showResultModal, setShowResultModal] = useState(false);
  const [rewardSkin, setRewardSkin] = useState<ValorantApiSkin | null>(null);

  useEffect(() => {
    if (nextAuthStatus === "loading") {
      setIsLoadingSession(true);
      setUserId(null);
    } else if (nextAuthStatus === "unauthenticated") {
      setIsLoadingSession(false);
      setUserId(null);
    } else if (nextAuthStatus === "authenticated") {
      if (nextAuthSession?.user?.id) {
        setUserId(nextAuthSession.user.id as string);
      } else {
        console.warn("[MejorasPage] Next-Auth authenticated, but no user ID found in session:", nextAuthSession);
        setUserId(null);
      }
      setIsLoadingSession(false);
    }
  }, [nextAuthSession, nextAuthStatus]);

  const filteredInventory = useMemo(() => {
    return userInventory.filter((skin) => {
      const searchMatch = skin.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (skin.content_tier?.nombre || "").toLowerCase().includes(searchTerm.toLowerCase());
      
      const tierMatch = filterTier ? skin.content_tier?.uuid_api === filterTier : true;
      
      return searchMatch && tierMatch;
    });
  }, [userInventory, searchTerm, filterTier]);

  // Calcular porcentaje de éxito basado en skins seleccionadas
  const successPercentage = useMemo(() => {
    const basePercentage = 0;
    const perSkinBonus = 20;
    return Math.min(basePercentage + (selectedSkins.length * perSkinBonus), 100);
  }, [selectedSkins.length]);

  const bestSelectedSkin = useMemo(() => {
    if (selectedSkins.length === 0) return null;
    return [...selectedSkins].sort((a, b) => {
      const gradeA = a.content_tier?.grado ? parseInt(a.content_tier.grado) : 0;
      const gradeB = b.content_tier?.grado ? parseInt(b.content_tier.grado) : 0;
      return gradeB - gradeA;
    })[0];
  }, [selectedSkins]);



  const loadUserInventory = useCallback(async () => {
    if (!userId) {
      setUserInventory([]); 
      setIsLoading(false);
      // También reseteamos skins seleccionadas si el usuario cambia o cierra sesión
      setSelectedSkins([]);
      return;
    }
    setIsLoading(true);
    try {
      let currentApiSkins = allApiSkins;
      if (!currentApiSkins) {
        currentApiSkins = await fetchAllApiSkinsFromValorantApi();
        setAllApiSkins(currentApiSkins);
      }

      let currentSupabaseTiers = allSupabaseTiers;
      if (!currentSupabaseTiers) {
        const { data: tiersData, error: tiersError } = await supabase
          .from("content_tiers")
          .select("id, nombre, color, uuid_api, grado");
        if (tiersError) throw tiersError;
        currentSupabaseTiers = tiersData as SupabaseContentTier[];
        setAllSupabaseTiers(currentSupabaseTiers);
      }
      
      if (!currentApiSkins || !currentSupabaseTiers) {
        toast.error("Error al cargar datos esenciales de skins o tiers.");
        setIsLoading(false);
        return;
      }

      const apiSkinsMap = new Map(currentApiSkins.map(s => [s.uuid, s]));
      const supabaseTiersMap = new Map(currentSupabaseTiers.map(t => [t.uuid_api, t]));

      const { data: inventoryData, error: inventoryError } = await supabase
        .from("inventario_usuario")
        .select("id, skin_id, skin_nombre, fecha_obtencion")
        .eq("usuario_id", userId);

      if (inventoryError) throw inventoryError;
            if (!inventoryData) {
        setUserInventory([]);
        setIsLoading(false);
        return;
      }
      
      // Crear una skin individual por cada entrada en la base de datos
      const mappedSkins: Skin[] = inventoryData.map((item: InventoryItemFromDB) => {
        const apiSkinDetails = apiSkinsMap.get(item.skin_id);
        let skinName = item.skin_nombre || "Skin Desconocida";
        let imageUrl = "/images/placeholder_icon.webp"; // Default placeholder
        let contentTierForSkin: SupabaseContentTier | undefined = undefined;
        let valorantApiTierUuid = "";
        let bundleName: string | undefined = undefined;

        if (apiSkinDetails) {
          skinName = apiSkinDetails.displayName;
          imageUrl = getBestDisplayIcon(apiSkinDetails) || imageUrl;
          valorantApiTierUuid = apiSkinDetails.contentTierUuid || "";
          if (valorantApiTierUuid) {
            contentTierForSkin = supabaseTiersMap.get(valorantApiTierUuid);
          }
          bundleName = extractBundleName(apiSkinDetails.displayName);
        }

        return {
          id: item.id, // Usar el ID de la fila de la DB como ID único
          skin_id: item.skin_id, // Valorant API Skin UUID
          nombre: skinName,
          bundleName: bundleName,
          content_tier_id: valorantApiTierUuid,
          uuid: item.skin_id, // Valorant API Skin UUID
          imagen_url: imageUrl,
          content_tier: contentTierForSkin,
          selected: false,
          count: 1, // Cada entrada individual tiene count 1
          inventoryIds: [item.id], // Solo este ID específico
        };
      })
      .filter(skin => skin.imagen_url && !skin.imagen_url.includes('StandardAnimation'));

      setUserInventory(mappedSkins);

    } catch (error: any) {
      console.error("Error al cargar inventario para mejoras:", error);
      toast.error(`Error al cargar el inventario: ${error.message || "Error desconocido"}`);
    } finally {
      setIsLoading(false);
    }
  }, [userId, supabase, allApiSkins, allSupabaseTiers]);

  useEffect(() => {
    if (userId) { 
        loadUserInventory();
    } else {
        setUserInventory([]);
        setSelectedSkins([]);
        setIsLoading(false);
    }
  }, [userId, loadUserInventory]);

  // Establecer filtro por defecto al tier más bajo cuando se cargan los datos
  useEffect(() => {
    if (allSupabaseTiers && allSupabaseTiers.length > 0 && !filterTier) {
      const availableTiers = allSupabaseTiers.filter(tier => 
        tier.nombre.toLowerCase() !== 'ultra edition' && 
        tier.nombre.toLowerCase() !== 'exclusive edition'
      );
      const lowestTier = availableTiers
        .sort((a, b) => parseInt(a.grado) - parseInt(b.grado))[0];
      setFilterTier(lowestTier.uuid_api);
    }
  }, [allSupabaseTiers, filterTier]);

  // Limpiar skins seleccionadas cuando cambie el filtro de tier
  useEffect(() => {
    if (selectedSkins.length > 0) {
      setSelectedSkins([]);
      // También actualizar el estado 'selected' en userInventory
      setUserInventory(prev => 
        prev.map(skin => ({ ...skin, selected: false }))
      );
    }
  }, [filterTier]);


  const toggleSelectSkin = (skinToToggle: Skin) => {
    const isCurrentlySelected = selectedSkins.some(s => s.id === skinToToggle.id);
    
    if (isCurrentlySelected) {
      // Deseleccionar la skin
      setSelectedSkins(prev => prev.filter(s => s.id !== skinToToggle.id));
    } else {
      // Verificar límite de 5 skins
      if (selectedSkins.length >= maxSelectedSkins) {
        toast.error(`Solo puedes seleccionar hasta ${maxSelectedSkins} skins`);
        return;
      }
      
      // Verificar que la skin sea del mismo tier que las ya seleccionadas
      if (selectedSkins.length > 0) {
        const firstSelectedTier = selectedSkins[0].content_tier?.uuid_api;
        const newSkinTier = skinToToggle.content_tier?.uuid_api;
        
        if (firstSelectedTier !== newSkinTier) {
          const firstSelectedTierName = selectedSkins[0].content_tier?.nombre || "tier desconocido";
          toast.error(`Solo puedes seleccionar skins del mismo tier (${firstSelectedTierName})`);
          return;
        }
      }
      
      // Seleccionar la skin
      setSelectedSkins(prev => [...prev, skinToToggle]);
    }
    
    // Actualizar el estado 'selected' en userInventory para UI
    setUserInventory(prev => 
        prev.map(s => s.id === skinToToggle.id ? { ...s, selected: !isCurrentlySelected } : s)
    );
  };




  // Función para obtener una skin aleatoria filtrada
  const getRandomRewardSkin = async (): Promise<ValorantApiSkin | null> => {
    try {
      let currentApiSkins = allApiSkins;
      if (!currentApiSkins) {
        currentApiSkins = await fetchAllApiSkinsFromValorantApi();
        setAllApiSkins(currentApiSkins);
      }
      
      // Aplicar los mismos filtros que en el catálogo (bundles con icono)
      const filteredSkins = await filterSkinsByBundleWithIcon(currentApiSkins);
      
      if (filteredSkins.length === 0) {
        console.error("No hay skins filtradas disponibles");
        return null;
      }
      
      // Seleccionar una skin aleatoria
      const randomIndex = Math.floor(Math.random() * filteredSkins.length);
      return filteredSkins[randomIndex];
    } catch (error) {
      console.error("Error al obtener skin aleatoria:", error);
      return null;
    }
  };

  const handleImprovement = async () => {
    if (selectedSkins.length !== 5) {
      toast.error("Debes seleccionar exactamente 5 skins para realizar la mejora");
      return;
    }

    try {
      // Obtener una skin aleatoria
      const randomSkin = await getRandomRewardSkin();
      
      if (!randomSkin) {
        toast.error("Error al obtener la skin premiada");
        return;
      }
      
      // Mostrar el modal con la skin premiada
      setRewardSkin(randomSkin);
      setShowResultModal(true);
      
    } catch (error) {
      console.error("Error en handleImprovement:", error);
      toast.error("Error al procesar la mejora");
    }
  };

  if (isLoadingSession) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-white p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mb-4" />
        <p className="text-lg text-gray-300 mt-4">Cargando sesión...</p>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-white p-4">
        <h1 className="text-2xl font-bold mb-4">Inicia sesión para acceder a las mejoras</h1>
        <Link href="/auth/signin">
          <Button>Iniciar sesión</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 pt-12 pb-12 min-h-screen bg-background text-white">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white font-[Raleway] font-semibold italic tracking-widest">
          / MEJORAS
        </h1>
        <InfoModal />
      </div>

      {/* Sección Superior: Skins Seleccionadas */}
      <div className="mb-8">
        <div className="bg-gradient-to-b from-slate-900/60 to-black/60 rounded-xl shadow-inner p-6 border border-slate-700/30">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Skins Seleccionadas</h2>
              <p className="text-slate-400">Selecciona hasta {maxSelectedSkins} skins para mejorar</p>
              {selectedSkins.length > 0 && (
                <p className="text-sm text-primary mt-1">
                  Tier actual: {selectedSkins[0].content_tier?.nombre || "Desconocido"}
                </p>
              )}
            </div>
            <div className="flex flex-col items-end mt-4 md:mt-0">
              <div className="text-right mb-4">
                <div className="text-3xl font-bold text-primary">{successPercentage}%</div>
                <div className="text-sm text-slate-400">Probabilidad de éxito</div>
              </div>
              
              <Button variant="default" className="rounded-xl bg-gradient-to-r from-red-500/20 to-red-600/20 text-white shadow-lg shadow-red-900/20 border border-red-500/20 hover:bg-gradient-to-r hover:from-red-500/30 hover:to-red-600/30 active:scale-95 transition-all duration-200"
              disabled={selectedSkins.length === 0}
              onClick={handleImprovement}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Mejorar ({selectedSkins.length}/5)
              </Button>
            </div>
          </div>

          {/* Grid de skins seleccionadas - Grid fijo de 5 posiciones */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 min-h-[200px]">
            {Array.from({ length: maxSelectedSkins }).map((_, index) => {
              const skin = selectedSkins[index];
              
              if (skin) {
                // Posición ocupada con skin
                const weaponType = getWeaponType(skin.nombre);
                const weaponStyles = getWeaponSpecificStyles(weaponType);
                const imageTransformStyle: React.CSSProperties = {
                  transform: `scale(${weaponStyles.baseScale})${weaponStyles.hasRotation ? ' rotate(12deg)' : ''}`,
                };

                return (
                  <motion.div
                    key={`slot-${index}-${skin.id}`}
                    initial={{ opacity: 0, scale: 1, y: 0 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="relative group flex flex-col aspect-[3/4] overflow-hidden rounded-xl border bg-gradient-to-b from-gray-900 to-black transition-all duration-150 border-primary/50 shadow-lg shadow-primary/20"
                    style={{
                      backgroundImage: skin.content_tier ? 
                        `linear-gradient(to top, rgba(${parseInt(skin.content_tier.color.slice(1,3), 16)},${parseInt(skin.content_tier.color.slice(3,5), 16)},${parseInt(skin.content_tier.color.slice(5,7), 16)},0.10) 0%, rgba(${parseInt(skin.content_tier.color.slice(1,3), 16)},${parseInt(skin.content_tier.color.slice(3,5), 16)},${parseInt(skin.content_tier.color.slice(5,7), 16)},0.15) 35%, rgba(17, 24, 39, 0.85) 80%, #0A0E16 100%)` : 
                        undefined
                    }}
                  >
                    {/* Botón de eliminar */}
                    <button
                      onClick={() => toggleSelectSkin(skin)}
                      className="absolute top-2 right-2 z-10 w-6 h-6 bg-red-500/80 hover:bg-red-500 rounded-full flex items-center justify-center transition-colors"
                    >
                      <X className="w-4 h-4 text-white" />
                    </button>

                    {/* Imagen de fondo del tier */}
                    {skin.content_tier?.id && skin.content_tier.id !== 'default' && (
                      <Image 
                        src={`/skins-bg/${skin.content_tier.id}.png`}
                        alt={`Fondo para ${skin.content_tier.nombre}`}
                        fill
                        className="absolute inset-0 z-0 p-4 opacity-20 transform scale-125 rotate-12"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                    )}

                    {/* Imagen de la skin */}
                    <Image
                      src={skin.imagen_url || '/images/placeholder_icon.webp'}
                      alt={skin.nombre}
                      fill
                      sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 20vw"
                      className="object-contain p-4 group-hover:scale-105 transition-transform duration-300 z-10"
                      style={imageTransformStyle}
                    />

                    {/* Información de la skin */}
                    <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent z-10">
                      <h3 className="font-medium text-primary text-sm truncate" title={skin.nombre}>
                        {skin.nombre}
                      </h3>
                      {skin.content_tier?.nombre && (
                        <p className="text-xs text-slate-300 truncate" title={skin.content_tier.nombre}>
                          {skin.content_tier.nombre}
                        </p>
                      )}
                    </div>
                  </motion.div>
                );
              } else {
                // Posición vacía
                return (
                  <div
                    key={`empty-slot-${index}`}
                    className="flex flex-col aspect-[3/4] overflow-hidden rounded-xl border-2 border-dashed border-slate-600 bg-slate-800/30 transition-all duration-150 items-center justify-center"
                  >
                    <div className="text-slate-500 text-center">
                      <div className="w-12 h-12 border-2 border-slate-600 border-dashed rounded-xl mb-2 mx-auto"></div>
                      <p className="text-xs">Slot {index + 1}</p>
                    </div>
                  </div>
                );
              }
            })}
          </div>
        </div>
      </div>

      {/* Sección Inferior: Inventario */}
      <div className="bg-gradient-to-b from-slate-900/60 to-black/60 rounded-xl shadow-inner p-6 border border-slate-700/30">
        {/* Header del inventario */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <h2 className="text-2xl font-bold text-white">Tu Inventario</h2>
          
          {/* Filtros */}
          <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
            {/* Búsqueda */}
            <div className="relative w-full md:w-64 group">
              <div className="relative flex items-center rounded-xl border-2 border-slate-700 focus-within:border-primary bg-slate-800/50 backdrop-blur-sm text-sm focus-within:outline-none focus-within:ring-0 transition-all duration-300">
                <span className="pl-3 pr-2 flex items-center pointer-events-none">
                  <RiSearch2Line className="w-5 h-5 text-white/50 group-focus-within:text-primary transition-colors duration-300" />
                </span>
                <input
                  type="text"
                  placeholder="Buscar skins..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1 py-2.5 bg-transparent appearance-none focus:outline-none text-white placeholder:text-muted-foreground/70 pr-10"
                />
                {searchTerm && (
                  <button
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                    onClick={() => setSearchTerm("")}
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Filtro de rareza */}
             {allSupabaseTiers && (
               <Select value={filterTier} onValueChange={setFilterTier}>
                 <SelectTrigger className="w-full md:w-48 bg-slate-800 border-2 border-slate-700 text-white rounded-xl hover:border-slate-600 focus:ring-1 focus:ring-primary focus:border-primary transition-colors duration-150">
                   <Filter className="h-4 w-4 mr-2 inline-block opacity-70" />
                   <SelectValue placeholder="Filtrar Rareza" />
                 </SelectTrigger>
                 <SelectContent className="bg-slate-800 text-white rounded-md shadow-lg border-slate-700">
                   {allSupabaseTiers
                     .filter(tier => 
                       tier.nombre.toLowerCase() !== 'ultra edition'                     
                      )
                     .sort((a, b) => parseInt(a.grado) - parseInt(b.grado))
                     .map(tier => (
                     <SelectItem 
                       key={tier.uuid_api}
                       value={tier.uuid_api}
                       className="hover:bg-slate-700 rounded-md active:bg-slate-700"
                       style={{ color: tier.color }}
                     >
                       {tier.nombre}
                     </SelectItem>
                   ))}
                 </SelectContent>
               </Select>
             )}
          </div>
        </div>

        {/* Grid del inventario */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary" />
          </div>
        ) : filteredInventory.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-400 text-lg">
              {userInventory.length === 0 ? "No hay skins en tu inventario" : "No se encontraron skins"}
            </p>
          </div>
        ) : (
          <motion.div 
            key={`${searchTerm}-${filterTier || 'all'}`}
            layout 
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
          >
            {filteredInventory.map((skin, index) => {
              const isSelected = selectedSkins.some(s => s.id === skin.id);
              const weaponType = getWeaponType(skin.nombre);
              const weaponStyles = getWeaponSpecificStyles(weaponType);
              const imageTransformStyle: React.CSSProperties = {
                transform: `scale(${weaponStyles.baseScale})${weaponStyles.hasRotation ? ' rotate(12deg)' : ''}`,
              };

                             // Verificar si esta skin puede ser seleccionada (mismo tier que las ya seleccionadas)
               const canBeSelected = selectedSkins.length === 0 || 
                 selectedSkins[0].content_tier?.uuid_api === skin.content_tier?.uuid_api;

               return (
                 <motion.div
                   key={skin.id}
                   layout
                   initial={{ opacity: 0 }}
                   animate={{ opacity: 1 }}
                   exit={{ opacity: 0 }}
                   transition={{ duration: 0.15, delay: index * 0.02 }}
                   onClick={() => toggleSelectSkin(skin)}
                   className={`group relative flex flex-col aspect-[3/4] overflow-hidden rounded-xl border bg-gradient-to-b from-gray-900 to-black transition-all duration-150 cursor-pointer
                     ${isSelected 
                       ? 'border-primary scale-105 shadow-lg shadow-primary/40' 
                       : canBeSelected
                         ? 'border-gray-800/70 hover:shadow-[0px_2px_46px_-4px_rgba(255,_255,_255,_0.10)]'
                         : 'border-gray-600/30 opacity-50 cursor-not-allowed hover:opacity-60'}
                   `}
                  style={{
                    backgroundImage: !isSelected && skin.content_tier ? 
                      `linear-gradient(to top, rgba(${parseInt(skin.content_tier.color.slice(1,3), 16)},${parseInt(skin.content_tier.color.slice(3,5), 16)},${parseInt(skin.content_tier.color.slice(5,7), 16)},0.10) 0%, rgba(${parseInt(skin.content_tier.color.slice(1,3), 16)},${parseInt(skin.content_tier.color.slice(3,5), 16)},${parseInt(skin.content_tier.color.slice(5,7), 16)},0.15) 35%, rgba(17, 24, 39, 0.85) 80%, #0A0E16 100%)` : 
                      undefined
                  }}
                >
                  {/* Imagen de fondo del tier */}
                  {skin.content_tier?.id && skin.content_tier.id !== 'default' && (
                    <Image 
                      src={`/skins-bg/${skin.content_tier.id}.png`}
                      alt={`Fondo para ${skin.content_tier.nombre}`}
                      fill
                      className="absolute inset-0 z-0 p-4 opacity-20 transform scale-125 rotate-12"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  )}

                  {/* Imagen de la skin */}
                  <Image
                    src={skin.imagen_url || '/images/placeholder_icon.webp'}
                    alt={skin.nombre}
                    fill
                    sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                    className="object-contain p-4 group-hover:scale-105 transition-transform duration-300 z-10"
                    style={imageTransformStyle}
                  />

                  {/* Información de la skin */}
                  <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent z-10">
                    <h3 className="font-semibold text-primary" title={skin.nombre}>{skin.nombre}</h3>
                    {skin.content_tier?.nombre && (
                      <p className="text-sm text-slate-300 truncate" title={skin.content_tier.nombre}>
                        {skin.content_tier.nombre}
                      </p>
                    )}
                  </div>

                  {/* Indicador de selección */}
                  <div className={`absolute top-2 left-2 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-primary border-white' : 'bg-slate-700/80 border-slate-600 hover:bg-slate-600/80'}`}>
                    {isSelected && <div className="w-2 h-2 bg-white rounded-full"></div>}
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>

      {/* Modal de Resultado */}
      <AnimatePresence>
        {showResultModal && rewardSkin && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4"
            onClick={() => {
              setShowResultModal(false);
              setRewardSkin(null);
            }}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: -20 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="bg-gradient-to-b from-slate-900 to-black rounded-2xl p-8 max-w-md w-full border border-slate-700 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header del modal */}
              <div className="text-center mb-6">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, duration: 0.4, type: "spring", stiffness: 200 }}
                  className="w-16 h-16 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-yellow-500/30"
                >
                  <Sparkles className="w-8 h-8 text-black" />
                </motion.div>
                <motion.h2
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.4 }}
                  className="text-2xl font-bold text-white mb-2"
                >
                  ¡Skin Premiada!
                </motion.h2>
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, duration: 0.4 }}
                  className="text-slate-400"
                >
                  Has obtenido una nueva skin
                </motion.p>
              </div>

              {/* Skin premiada */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.5, ease: "easeOut" }}
                className="relative w-full h-64 bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl overflow-hidden mb-6 border border-slate-600"
              >
                {/* Imagen de la skin */}
                <div className="relative w-full h-full flex items-center justify-center p-4">
                  {getBestDisplayIcon(rewardSkin) && (
                    <Image
                      src={getBestDisplayIcon(rewardSkin) || ''}
                      alt={rewardSkin.displayName}
                      fill
                      className="object-contain p-4"
                      style={{
                        filter: 'drop-shadow(0 0 20px rgba(255,255,255,0.3))',
                      }}
                    />
                  )}
                </div>

                {/* Efecto de brillo */}
                <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white/5 to-transparent opacity-50" />
              </motion.div>

              {/* Información de la skin */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.4 }}
                className="text-center mb-6"
              >
                <h3 className="text-xl font-bold text-white mb-2">
                  {rewardSkin.displayName}
                </h3>
                <p className="text-slate-400 text-sm">
                  {rewardSkin.displayName.split(' ')[0]} Collection
                </p>
              </motion.div>

              {/* Botón de cerrar */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7, duration: 0.4 }}
                className="flex justify-center"
              >
                <Button
                  onClick={() => {
                    setShowResultModal(false);
                    setRewardSkin(null);
                  }}
                  className="rounded-xl bg-gradient-to-r from-red-500/20 to-red-600/20 text-white shadow-lg shadow-red-900/20 border border-red-500/20 hover:bg-gradient-to-r hover:from-red-500/30 hover:to-red-600/30 active:scale-95 transition-all duration-200 px-8 py-3"
                >
                  ¡Excelente!
                </Button>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
