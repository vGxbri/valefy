"use client";

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { RiSearch2Line } from "react-icons/ri";
import { X, Filter, Trash2, ChevronDown, RefreshCw, XCircle, AlertTriangle } from 'lucide-react';
import { 
  Modal, 
  ModalContent, 
  ModalHeader, 
  ModalBody, 
  ModalFooter, 
  useDisclosure,
  Button as HerouiButton
} from "@heroui/react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'; // Added
import { getWeaponSkins as fetchAllWeaponSkinsFromApi, getBestDisplayIcon, getContentTiers as fetchAllContentTiersFromApi, Skin as ValorantApiSkin, ContentTier as ValorantApiContentTier } from "@/lib/valorantApi";
import { motion } from "framer-motion";

// Componente de carga para el inventario
const InventoryLoading = ({ className = "" }: { className?: string }) => (
  <div className={`w-full flex flex-col items-center justify-center py-12 ${className}`}>
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mb-4" />
  </div>
);

// Componente para mostrar cuando el inventario está vacío
const EmptyInventory = ({ className = "" }: { className?: string }) => (
  <div className={`w-full text-center p-8 bg-card/10 backdrop-blur-sm rounded-lg border border-border/30 ${className}`}>
    <h3 className="text-xl font-semibold mb-2">Tu inventario está vacío</h3>
    <p className="text-muted-foreground mb-6">Aún no tienes skins en tu inventario. Abre cajas para conseguir skins.</p>
    <Link href="/main">
      <Button variant="default" className="bg-primary text-primary-foreground hover:bg-primary/90">
        Ir a las cajas
      </Button>
    </Link>
  </div>
);

export interface InventorySkin {
  id: string; // Supabase row ID for the inventory item
  skin_id: string; // Valorant API skin UUID (from inventario_usuario.skin_id)
  skinName: string;
  bundleName: string;
  skinIcon: string;
  contentTier: {
    id: string; // Tier ID, debe ser 'id'
    nombre: string;
    color: string;
  };
  dateAcquired: Date;
  metodoAdquisicion?: string;
  cantidad: number; // Added cantidad
  uniqueCardId?: string; // Added for displaying duplicates
}

interface InventoryItemFromDB {
  id: string;
  skin_id: string;
  fecha_obtencion: string;
  cantidad: number; // Added cantidad
}

interface InventoryDisplayProps {
  supabase: any; // Supabase client instance
  userId: string;
}

export default function InventoryDisplayComponent({ supabase, userId }: InventoryDisplayProps) {
  const [userSkins, setUserSkins] = useState<InventorySkin[]>([]);
  const [allApiSkinsState, setAllApiSkinsState] = useState<ValorantApiSkin[] | null>(null); // Renamed to avoid conflict if passed as prop
  const [allApiContentTiersState, setAllApiContentTiersState] = useState<ValorantApiContentTier[] | null>(null); // Renamed
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [filterTier, setFilterTier] = useState<string | null>(null);
  const [sortOption, setSortOption] = useState<string>("newest");

  const [showWelcome, setShowWelcome] = useState<boolean>(true); // Assuming welcome message is part of display
  const [isSelectionMode, setIsSelectionMode] = useState<boolean>(true);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isInitialLoadAnimationPending, setIsInitialLoadAnimationPending] = useState(true);
  const { isOpen: isDeleteModalOpen, onOpen: onDeleteModalOpen, onOpenChange: onDeleteModalOpenChange, onClose: onDeleteModalClose } = useDisclosure(); // Para el modal de eliminación

  // Resetear la página cuando cambia el término de búsqueda o filtros
  useEffect(() => {
    // setCurrentPage(1); // Eliminado - ya no hay paginación
  }, [searchTerm, filterTier, sortOption]);

  const extractBundleName = (skinName: string): string => {
    const parts = skinName.split(' ');
    if (parts.length > 1 && parts[0].toLowerCase() !== "standard" && parts[0].toLowerCase() !== "estándar") {
      // Attempt to join parts that form a bundle name, heuristic approach
      let bundleName = parts[0];
      for (let i = 1; i < parts.length -1; i++) { // stop before the last word (potential weapon name)
        if (parts[i][0] === parts[i][0].toUpperCase()) { // typically bundle names are proper case
          bundleName += ` ${parts[i]}`;
        } else {
          break;
        }
      }
      return bundleName;
    }
    return ''; // Return empty if no clear bundle or it's standard
  };

  const getTierColor = (tierName: string): string => {
    const tier = allApiContentTiersState?.find(t => t.displayName.toLowerCase() === tierName.toLowerCase() || t.uuid.toLowerCase() === tierName.toLowerCase());
    if (tier) {
      return `#${tier.highlightColor}` || '#FFFFFF'; // Default to white if highlightColor is missing
    }
    // Fallback colors for common tier names if API data is not yet available or doesn't match
    switch (tierName?.toLowerCase()) {
      case 'select edition': return '#5B9BD5'; // Azul claro
      case 'deluxe edition': return '#58C097'; // Verde
      case 'premium edition': return '#EE8331'; // Naranja/Rojo
      case 'ultra edition': return '#FAD550'; // Amarillo/Dorado
      case 'exclusive edition': return '#E5B0EA'; // Rosa/Púrpura
      default: return '#FFFFFF'; // Blanco por defecto
    }
  };

  const fetchUserInventory = useCallback(async () => {
    let isMounted = true;
    setLoading(true);
    setError(null);
    try {
      let currentApiSkins = allApiSkinsState;
      let currentApiContentTiers = allApiContentTiersState;

      if (!currentApiSkins) {
        currentApiSkins = await fetchAllWeaponSkinsFromApi();
        if (isMounted) setAllApiSkinsState(currentApiSkins);
      }
      if (!currentApiContentTiers) {
        currentApiContentTiers = await fetchAllContentTiersFromApi();
        console.warn("[InventoryDebug] currentApiContentTiers from API:", currentApiContentTiers); // Log después de fetch
        if (isMounted) setAllApiContentTiersState(currentApiContentTiers);
      } else {
        console.warn("[InventoryDebug] currentApiContentTiers from state:", currentApiContentTiers); // Log si ya estaba en estado
      }

      if (!currentApiSkins || !currentApiContentTiers || currentApiContentTiers.length === 0) { // Añadida comprobación de longitud
        console.error("[InventoryDebug] Essential API data missing or empty. Skins:", currentApiSkins, "Tiers:", currentApiContentTiers);
        throw new Error("Failed to load essential Valorant API data or data is empty.");
      }

      const skinsMap = new Map(currentApiSkins.map(s => [s.uuid, s]));
      const tiersMap = new Map(currentApiContentTiers.map(t => [t.uuid, t])); // Usar t.uuid como clave
      console.warn("[InventoryDebug] tiersMap created:", tiersMap); 
      console.warn("[InventoryDebug] tiersMap keys:", Array.from(tiersMap.keys()));

      const { data: inventoryData, error: inventoryError } = await supabase
        .from('inventario_usuario')
        .select('id, skin_id, fecha_obtencion, cantidad')
        .eq('usuario_id', userId);

      if (inventoryError) {
        throw inventoryError;
      }
      if (!inventoryData) {
        setUserSkins([]);
        return;
      }
      
      const mappedSkinsFromDB: InventorySkin[] = inventoryData.map((item: InventoryItemFromDB) => {
        const apiSkin = item.skin_id ? skinsMap.get(item.skin_id) : null;
        let skinName = apiSkin?.displayName || "Unknown Skin";
        let skinIcon = apiSkin ? getBestDisplayIcon(apiSkin) : '/images/placeholder_icon.webp';
        let apiTier = apiSkin?.contentTierUuid ? tiersMap.get(apiSkin.contentTierUuid) : null;
        
        if (!apiTier && apiSkin?.contentTierUuid) {
          console.warn(`[InventoryDebug] Tier no encontrado en tiersMap: Skin '${apiSkin.displayName}' tiene contentTierUuid '${apiSkin.contentTierUuid}'. Este UUID no está en tu tabla content_tiers. Keys en tiersMap:`, Array.from(tiersMap.keys()));
        }
        if (!apiSkin?.contentTierUuid) {
          console.warn(`[InventoryDebug] Skin sin contentTierUuid: '${apiSkin?.displayName}'`);
        }

        return {
          id: item.id, 
          skin_id: item.skin_id,
          skinName: skinName,
          bundleName: apiSkin ? extractBundleName(apiSkin.displayName) : "Unknown Bundle",
          skinIcon: skinIcon,
          contentTier: {
            id: apiTier?.uuid || 'default', // Usar apiTier.uuid
            nombre: apiTier?.displayName || 'Standard',
            color: (apiTier && apiTier.highlightColor) ? `#${apiTier.highlightColor.substring(0, 6)}` : '#FFFFFF',
          },
          dateAcquired: new Date(item.fecha_obtencion),
          cantidad: item.cantidad || 1, 
        };
      });

      const mappedSkins: InventorySkin[] = mappedSkinsFromDB.filter((skin: InventorySkin) => {
        // Verificación robusta del tipo de skin.skinIcon
        if (typeof skin.skinIcon !== 'string') {
          console.error("[InventoryDisplay] Error en el filtro: skin.skinIcon no es un string.", 
            {
              skin_id: skin.skin_id,
              skinName: skin.skinName,
              skinIconValue: skin.skinIcon,
              typeOfSkinIcon: typeof skin.skinIcon
            }
          );
          return false; // Excluir este skin problemático
        }
        // El filtro original
        return skin.skinIcon && !skin.skinIcon.includes('StandardAnimation'); 
      });
      
      if (isMounted) {
        setUserSkins(mappedSkins);
        setLoading(false);
        setIsInitialLoadAnimationPending(false);
      }

    } catch (err: unknown) {
      let message = 'Intenta de nuevo más tarde';
      if (err instanceof Error) {
        message = err.message;
      }
      if (isMounted) setError(`Error al cargar tu inventario: ${message}`);
    } finally {
      if (isMounted) setLoading(false);
    }
  }, [userId, supabase, allApiSkinsState, allApiContentTiersState]); // Quitado isInitialLoadAnimationPending de aquí

  useEffect(() => {
    if (userId && supabase) {
      fetchUserInventory();
    }
  }, [userId, supabase, fetchUserInventory]);

  useEffect(() => {
    // Manejar la lógica de isInitialLoadAnimationPending aquí, después de que los datos se cargan y el estado se actualiza.
    if (!loading && userSkins.length > 0 && isInitialLoadAnimationPending) {
      const animationTime = (Math.min(userSkins.length, 18) * 50) + 500; // Tiempo estimado para la animación
      const timer = setTimeout(() => {
        setIsInitialLoadAnimationPending(false);
      }, animationTime);
      return () => clearTimeout(timer); // Limpiar el timer si el componente se desmonta o las dependencias cambian
    }
  }, [loading, userSkins, isInitialLoadAnimationPending]);

  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    setSelectedItems(new Set()); // Clear selection when toggling mode
  };

  const toggleItemSelection = (uniqueCardId: string) => {
    setSelectedItems(prevSelected => {
      const newSelected = new Set(prevSelected);
      if (newSelected.has(uniqueCardId)) {
        newSelected.delete(uniqueCardId);
      } else {
        newSelected.add(uniqueCardId);
      }
      return newSelected;
    });
  };

  const handleDeleteSelected = () => { // No necesita ser async ya que solo abre el modal
    if (selectedItems.size === 0) return;
    onDeleteModalOpen();
  };

  const confirmDeleteSelected = async () => {
    if (selectedItems.size === 0) {
      onDeleteModalClose();
      return;
    }
    console.log("Deleting items with uniqueCardIds:", Array.from(selectedItems));

    const itemsToUpdate = new Map<string, number>();

    selectedItems.forEach(uniqueCardId => {
      const originalId = uniqueCardId.substring(0, uniqueCardId.lastIndexOf('-'));
      itemsToUpdate.set(originalId, (itemsToUpdate.get(originalId) || 0) + 1);
    });

    const dbPromises: Promise<any>[] = [];
    let anyError = false;

    const updateOperations = Array.from(itemsToUpdate.entries());

    for (const [originalId, countToDelete] of updateOperations) {
      const { data: currentSkinData, error: fetchError } = await supabase
        .from('inventario_usuario')
        .select('cantidad')
        .eq('id', originalId)
        .single();

      if (fetchError || !currentSkinData) {
        console.error(`Error fetching skin ${originalId} for deletion:`, fetchError);
        setError(`Error al obtener datos de la skin ${originalId} para eliminar.`);
        anyError = true;
        continue;
      }

      const currentQuantity = currentSkinData.cantidad;
      const newQuantity = currentQuantity - countToDelete;

      if (newQuantity <= 0) {
        dbPromises.push(
          supabase.from('inventario_usuario').delete().eq('id', originalId)
        );
      } else {
        dbPromises.push(
          supabase.from('inventario_usuario').update({ cantidad: newQuantity }).eq('id', originalId)
        );
      }
    }

    try {
      const results = await Promise.all(dbPromises.map(p => p.then((res: { error: any; data?: any }) => {
        if (res.error) throw res.error;
        return res;
      })));
      console.log("DB operations results:", results);
      if (!anyError) {
        await fetchUserInventory();
        setSelectedItems(new Set());
        // setIsSelectionMode(false); // Opcional: decidir si salir del modo selección
        setError(null);
      }
    } catch (deleteError: any) {
      console.error("Error during bulk delete/update operation:", deleteError);
      setError("Error al eliminar/actualizar skins: " + (deleteError.message || 'Error desconocido'));
    }
    onDeleteModalClose();
  };

  const calculateTierStats = () => {
    const stats: { [key: string]: { count: number; color: string } } = {};
    userSkins.forEach(skin => {
      const tierName = skin.contentTier.nombre;
      const tierColor = skin.contentTier.color;
      if (stats[tierName]) {
        stats[tierName].count++;
      } else {
        stats[tierName] = { count: 1, color: tierColor };
      }
    });
    return Object.entries(stats).map(([tierName, data]) => ({
      id: tierName, // Assuming tierName is unique enough for an ID
      nombre: tierName,
      count: data.count,
      color: data.color,
      percentage: userSkins.length > 0 ? (data.count / userSkins.length) * 100 : 0,
    }));
  };

  // Filtrar y ordenar skins
  const processedSkins = userSkins
    .filter(skin => {
      const searchTermLower = searchTerm.toLowerCase();
      const nameMatch = skin.skinName.toLowerCase().includes(searchTermLower);
      const bundleMatch = skin.bundleName?.toLowerCase().includes(searchTermLower);
      const tierMatch = filterTier ? skin.contentTier.id === filterTier : true; // Usar skin.contentTier.id
      return (nameMatch || bundleMatch) && tierMatch;
    })
    .sort((a, b) => {
      switch (sortOption) {
        case 'newest':
          return b.dateAcquired.getTime() - a.dateAcquired.getTime();
        case 'oldest':
          return a.dateAcquired.getTime() - b.dateAcquired.getTime();
        case 'name_asc':
          return a.skinName.localeCompare(b.skinName);
        case 'name_desc':
          return b.skinName.localeCompare(a.skinName);
        // TODO: Add sorting by tier rarity if needed
        default:
          return 0;
      }
    });

  // Expandir skins por cantidad para la visualización
  const expandedSkins = processedSkins.flatMap(skin =>
    Array.from({ length: skin.cantidad }, (_, index) => ({
      ...skin,
      uniqueCardId: `${skin.id}-${index}` // skin.id es el Supabase row ID
    }))
  );

  const tierStats = calculateTierStats();

  const sortOptionsConfig = [
    { value: "newest", label: "Más Recientes" },
    { value: "oldest", label: "Más Antiguos" },
    { value: "name_asc", label: "Nombre (A-Z)" },
    { value: "name_desc", label: "Nombre (Z-A)" },
  ];

  if (loading && userSkins.length === 0) {
    return <InventoryLoading className="min-h-screen" />;
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 pt-12 pb-12 min-h-screen bg-background text-white">
      
      {/* Header and Filters */}
      <div className="mb-8 sticky top-0 z-30 bg-background/80 backdrop-blur-md py-4 rounded-b-xl shadow-lg">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <h1 className="text-3xl font-bold text-white font-[Raleway] font-semibold italic tracking-widest">
            / INVENTARIO
          </h1>
            <div className="flex items-center gap-2">
              <Button onClick={fetchUserInventory} variant="outline" size="sm" className="border-slate-700 hover:bg-slate-700 rounded-xl">
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
              <Button onClick={toggleSelectionMode} variant={isSelectionMode ? "default" : "outline"} size="sm" className={`${isSelectionMode ? 'rounded-xl bg-gradient-to-r from-red-500/20 to-red-600/20 text-white shadow-lg shadow-red-900/20 border border-red-500/20 hover:bg-gradient-to-r' : 'border-slate-700 hover:bg-slate-700 rounded-xl hover:bg-white/5 hover:text-white'}`}>
                {isSelectionMode ? "Cancelar Selección" : "Seleccionar Skins"}
              </Button>
            </div>
          </div>
          <div className="mt-6 flex flex-col md:flex-row gap-4 items-center">
            <div className="relative w-full md:flex-grow group">
              <div className="relative flex items-center rounded-xl border-2 border-slate-700 focus-within:border-primary bg-slate-800/50 backdrop-blur-sm text-sm focus-within:outline-none focus-within:ring-0 transition-all duration-300">
                <span className="pl-3 pr-2 flex items-center pointer-events-none">
                  <RiSearch2Line className="w-5 h-5 text-white/50 group-focus-within:text-primary transition-colors duration-300" />
                </span>
                <input
                  type="text"
                  placeholder="Buscar por nombre o bundle..."
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
            <div className="flex gap-4 w-full md:w-auto">
              {allApiContentTiersState && (
                <Select value={filterTier || ''} onValueChange={(value: string) => setFilterTier(value === 'all' ? null : value)}>
                  <SelectTrigger className="w-full md:w-[180px] bg-slate-800 border-2 border-slate-700 text-white rounded-xl hover:border-slate-600 focus:ring-1 focus:ring-primary focus:border-primary transition-colors duration-150">
                    <Filter className="h-4 w-4 mr-2 inline-block opacity-70" />
                    <SelectValue placeholder="Filtrar Rareza" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 text-white rounded-md shadow-lg border-slate-700">
                    <SelectItem value="all" className="hover:bg-slate-700 rounded-md">Todas las Rarezas</SelectItem>
                    {allApiContentTiersState.map(tier => (
                      <SelectItem 
                        key={tier.uuid}
                        value={tier.uuid}
                        className="hover:bg-slate-700 rounded-md active:bg-slate-700"
                        style={{ color: (tier.highlightColor && tier.highlightColor.length >= 6) ? `#${tier.highlightColor.substring(0, 6)}` : 'white' }}
                      >
                        {tier.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Select value={sortOption} onValueChange={(value: string) => setSortOption(value)}>
                <SelectTrigger className="w-full md:w-auto bg-slate-800 border-2 border-slate-700 text-white rounded-xl hover:border-slate-600 focus:ring-1 focus:ring-primary focus:border-primary transition-colors duration-150">
                  <SelectValue placeholder="Ordenar por:">
                    {sortOptionsConfig.find(opt => opt.value === sortOption)?.label || "Ordenar por..."}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-slate-800 text-white rounded-md shadow-lg border-slate-700">
                  {sortOptionsConfig.map(option => (
                    <SelectItem 
                      key={option.value} 
                      value={option.value} 
                      className="hover:bg-slate-700 rounded-md"
                    >
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {isSelectionMode && selectedItems.size > 0 && (
        <div className="sticky top-36 z-20 mb-6">
          <div className="container mx-auto px-4">
            <div className="bg-slate-800/80 backdrop-blur-md p-4 rounded-lg shadow-md flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-4">
              <p className="text-white text-sm sm:text-base">{selectedItems.size} skin(s) seleccionada(s)</p>
              <div className="flex gap-2 sm:gap-3">
                <Button 
                  onClick={() => {
                    const allVisibleCardIds = new Set(expandedSkins.map(s => s.uniqueCardId!));
                    const currentSelectedArray = Array.from(selectedItems);
                    let allCurrentlyVisibleAreSelected = expandedSkins.length > 0 && expandedSkins.every(s => selectedItems.has(s.uniqueCardId!));

                    if (allCurrentlyVisibleAreSelected) {
                      // Deseleccionar todas las visibles
                      setSelectedItems(prevSelected => {
                        const newSelected = new Set(prevSelected);
                        allVisibleCardIds.forEach(id => newSelected.delete(id));
                        return newSelected;
                      });
                    } else {
                      // Seleccionar todas las visibles
                      setSelectedItems(prevSelected => new Set([...Array.from(prevSelected), ...Array.from(allVisibleCardIds)]));
                    }
                  }}
                  variant="outline"
                  size="sm"
                  className="rounded-xl border-slate-600 hover:bg-slate-700 text-slate-300 text-xs px-3 py-1.5 h-auto"
                >
                  { expandedSkins.length > 0 && expandedSkins.every(s => selectedItems.has(s.uniqueCardId!)) ? "Deseleccionar Todas" : "Seleccionar Todas" }
                </Button>
                <Button 
                  onClick={handleDeleteSelected} 
                  variant="destructive" 
                  size="sm" 
                  className='rounded-xl bg-gradient-to-r from-red-500/20 to-red-600/20 text-white shadow-lg shadow-red-900/20 border border-red-500/20 hover:bg-gradient-to-r active:scale-95 active:shadow-inner text-xs px-3 py-1.5 h-auto'
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Eliminar {selectedItems.size > 0 ? selectedItems.size : ''} skin(s)
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {loading && userSkins.length === 0 && <InventoryLoading className="mt-10" />}
      {!loading && error && <p className="text-red-400 text-center mt-10"><XCircle className="inline mr-2" />{error}</p>}
      {!loading && !error && userSkins.length === 0 && <EmptyInventory className="mt-10"/>}

      {expandedSkins.length > 0 && (
        <div className="container mx-auto px-4">
          <motion.div 
            key={`${searchTerm}-${filterTier || 'all'}`}
            layout 
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6 pb-10"
          >
            {expandedSkins.map((skin, index) => {
              let cardStyle: React.CSSProperties = {}; // Estilo por defecto

              if (!selectedItems.has(skin.uniqueCardId!) && skin.contentTier.color && skin.contentTier.color !== '#FFFFFF') {
                const tierColorHex = skin.contentTier.color; // Formato #RRGGBB
                const r = parseInt(tierColorHex.slice(1, 3), 16);
                const g = parseInt(tierColorHex.slice(3, 5), 16);
                const b = parseInt(tierColorHex.slice(5, 7), 16);
                
                cardStyle = {
                  backgroundImage: `linear-gradient(to top, rgba(${r},${g},${b},0.10) 0%, rgba(${r},${g},${b},0.15) 35%, rgba(17, 24, 39, 0.85) 80%, #0A0E16 100%)`,
                };
              }

              return (
                <motion.div
                  key={skin.uniqueCardId}
                  layoutId={skin.uniqueCardId}
                  layout
                  initial={isInitialLoadAnimationPending ? { opacity: 0, y: 20 } : { opacity: 0 }}
                  animate={isInitialLoadAnimationPending ? { opacity: 1, y: 0 } : { opacity: 1 }}
                  exit={isInitialLoadAnimationPending ? { opacity: 0, y: -20 } : { opacity: 0 }}
                  transition={{ 
                    duration: isInitialLoadAnimationPending ? 0.2 : 0.15, 
                    delay: isInitialLoadAnimationPending && index < 18 ? index * 0.05 : 0 
                  }}
                  onClick={() => { if (isSelectionMode && skin.uniqueCardId) { toggleItemSelection(skin.uniqueCardId); } }}
                  className={`group relative flex flex-col aspect-[3/4] overflow-hidden rounded-xl border bg-gradient-to-b from-gray-900 to-black transition-all duration-300
                    ${selectedItems.has(skin.uniqueCardId!) 
                      ? 'border-primary scale-105 shadow-lg shadow-primary/40' 
                      : 'border-gray-800/70 hover:shadow-[0px_2px_46px_-4px_rgba(255,_255,_255,_0.15)]'}
                    ${isSelectionMode ? 'cursor-pointer' : 'cursor-default'}`}
                  style={cardStyle}
                >
                  {/* Imagen de fondo dinámica basada en contentTier.id */}
                  {skin.contentTier.id && skin.contentTier.id !== 'default' && (
                    <Image 
                      src={`/skins-bg/${skin.contentTier.id}.png`} // Usar skin.contentTier.id
                      // src={`/skins-bg/prueba-bg.png`}
                      alt={`Fondo para ${skin.contentTier.nombre}`}
                      layout="fill"
                      objectFit="contain" // O "cover" si prefieres que llene y recorte
                      className="absolute inset-0 z-0 p-4 opacity-20 transform scale-125 rotate-12"
                      priority={index < 10} // Priorizar las primeras imágenes
                      // onError para manejar casos donde la imagen no exista
                      onError={(e) => {
                        // Opcional: Cambiar a una imagen de fallback o aplicar un estilo
                        // e.currentTarget.src = '/skins-bg/default-bg.png';
                        // O simplemente ocultarla si no hay fallback
                        e.currentTarget.style.display = 'none';
                        console.warn(`No se encontró la imagen de fondo para el tier: /skins-bg/${skin.contentTier.id}.png`); // Usar skin.contentTier.id
                      }}
                    />
                  )}
                  <Image
                    src={skin.skinIcon || '/images/placeholder_icon.webp'}
                    alt={skin.skinName}
                    fill
                    sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                    className="object-contain p-4 group-hover:scale-105 rotate-12	 transition-transform duration-300 z-10"
                    priority={index < 12} // Prioritize loading first 12 images
                  />
                  <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent z-10">
                    <h3 className="font-semibold text-primary" title={skin.skinName}>{skin.skinName}</h3>
                    {skin.contentTier.nombre && 
                      <p 
                        className="text-sm text-slate-300 truncate" 
                        title={skin.contentTier.nombre} 
                      >
                        {skin.contentTier.nombre}
                      </p>
                    }
                  </div>
                  {isSelectionMode && (
                    <div className={`absolute top-2 left-2 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${selectedItems.has(skin.uniqueCardId!) ? 'bg-primary border-white' : 'bg-slate-700/80 border-slate-600 hover:bg-slate-600/80'}`}>
                      {selectedItems.has(skin.uniqueCardId!)}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      )}

      {/* Modal de Confirmación de Eliminación */}
      <Modal
        hideCloseButton
        backdrop="blur"
        isOpen={isDeleteModalOpen}
        onOpenChange={onDeleteModalOpenChange} // Este se encarga de cerrar con ESC o click fuera
        classNames={{
          body: "py-6 px-8 flex flex-col items-center gap-5",
          backdrop: "bg-black/70 backdrop-blur-md",
          base: "border border-white/10 bg-gradient-to-b from-backgroundAlt to-background text-white rounded-2xl shadow-[0_10px_50px_-12px_rgba(0,0,0,0.4)] overflow-hidden",
          header:
            "w-full border-b border-white/10 pb-4 flex flex-col items-center gap-3",
          footer:
            "w-full border-t border-white/10 pt-4 flex justify-end gap-3",
        }}
        radius="lg"
      >
        <ModalContent>
          {/* El (onClose) de ModalContent es para el botón X interno si se habilita, pero usamos onDeleteModalClose del hook useDisclosure para el botón Cancelar */}
          <>
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 via-red-500/50 to-transparent" />
            <ModalHeader className="flex flex-col items-center gap-2 relative z-10">
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-red-500/20 to-red-600/30 border border-red-500/30 mt-2 shadow-lg shadow-red-900/10 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-transparent to-black/20 opacity-50" />
                <AlertTriangle className="h-8 w-8 text-red-400 drop-shadow-md relative z-10" />
              </div>
              <span className="text-2xl font-bold text-white drop-shadow-sm">
                ¿Eliminar Skins?
              </span>
            </ModalHeader>
            <ModalBody className="relative z-10">
              <p className="text-white/80 text-center text-base">
                ¿Estás seguro de que deseas eliminar {selectedItems.size} skin(s) seleccionada(s)?
              </p>
            </ModalBody>
            <ModalFooter className="relative z-10">
              <HerouiButton
                className="!text-white/70 hover:!bg-white/10 active:!bg-white/20 transition-all duration-200 rounded-xl border border-transparent hover:border-white/10 active:scale-95"
                variant="light"
                onPress={onDeleteModalClose}
              >
                Cancelar
              </HerouiButton>
              <HerouiButton
                className="bg-red-600/20 hover:bg-red-600/30 text-white border border-red-500/20 hover:border-red-500/30 font-semibold px-6 rounded-xl transition-colors duration-300 shadow-lg shadow-red-900/20 active:scale-95 active:shadow-inner"
                onPress={confirmDeleteSelected}
              >
                Eliminar
              </HerouiButton>
            </ModalFooter>
          </>
        </ModalContent>
      </Modal>
    </div>
  );
}

