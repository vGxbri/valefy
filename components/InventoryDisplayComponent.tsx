"use client";

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { RiSearch2Line } from "react-icons/ri";
import { X, Filter, Trash2, ChevronDown, RefreshCw, Search, XCircle } from 'lucide-react';
import { Pagination } from "@heroui/pagination";
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, DropdownSection } from "@nextui-org/dropdown";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'; // Added
import { getWeaponSkins as fetchAllWeaponSkinsFromApi, getBestDisplayIcon, getContentTiers as fetchAllContentTiersFromApi, Skin as ValorantApiSkin, ContentTier as ValorantApiContentTier } from "@/lib/valorantApi";
import { motion } from "framer-motion";

// Componente de carga para el inventario
const InventoryLoading = ({ className = "" }: { className?: string }) => (
  <div className={`w-full flex flex-col items-center justify-center py-12 ${className}`}>
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mb-4" />
    <p className="text-muted-foreground">Cargando tu inventario...</p>
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
    id: string; // Tier UUID
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
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [filterTier, setFilterTier] = useState<string | null>(null);
  const [sortOption, setSortOption] = useState<string>("newest");
  const skinsPerPage = 12;

  const [showWelcome, setShowWelcome] = useState<boolean>(true); // Assuming welcome message is part of display
  const [isSelectionMode, setIsSelectionMode] = useState<boolean>(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  // Resetear la página cuando cambia el término de búsqueda o filtros
  useEffect(() => {
    setCurrentPage(1);
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
        if (isMounted) setAllApiContentTiersState(currentApiContentTiers);
      }

      if (!currentApiSkins || !currentApiContentTiers) {
        throw new Error("Failed to load essential Valorant API data.");
      }

      const skinsMap = new Map(currentApiSkins.map(s => [s.uuid, s]));
      const tiersMap = new Map(currentApiContentTiers.map(t => [t.uuid, t]));

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
        
        return {
          id: item.id, // Supabase row ID
          skin_id: item.skin_id,
          skinName: skinName,
          bundleName: apiSkin ? extractBundleName(apiSkin.displayName) : "Unknown Bundle",
          skinIcon: skinIcon,
          contentTier: {
            id: apiTier?.uuid || 'default',
            nombre: apiTier?.displayName || 'Standard',
            color: apiTier ? `#${apiTier.highlightColor}` : '#FFFFFF',
          },
          dateAcquired: new Date(item.fecha_obtencion),
          cantidad: item.cantidad || 1, // Added cantidad, default to 1 if null/undefined
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
      
      if (isMounted) setUserSkins(mappedSkins);

    } catch (err: unknown) {
      let message = 'Intenta de nuevo más tarde';
      if (err instanceof Error) {
        message = err.message;
      }
      if (isMounted) setError(`Error al cargar tu inventario: ${message}`);
    } finally {
      if (isMounted) setLoading(false);
    }
  }, [userId, supabase, allApiSkinsState, allApiContentTiersState]); // Added dependencies

  useEffect(() => {
    if (userId && supabase) {
      fetchUserInventory();
    }
  }, [userId, supabase, fetchUserInventory]); // fetchUserInventory is now a dependency

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

  const handleDeleteSelected = async () => {
    if (selectedItems.size === 0) return;
    console.log("Deleting items with uniqueCardIds:", Array.from(selectedItems));

    const itemsToUpdate = new Map<string, number>(); // original_inventory_id -> count to decrement

    selectedItems.forEach(uniqueCardId => {
      const originalId = uniqueCardId.substring(0, uniqueCardId.lastIndexOf('-'));
      itemsToUpdate.set(originalId, (itemsToUpdate.get(originalId) || 0) + 1);
    });

    const dbPromises: Promise<any>[] = []; // Initialize with type
    let anyError = false;

    // itemsToUpdate.forEach(async (countToDelete, originalId) => { // This would make the loop body async, promises might not be pushed correctly before Promise.all
    // Instead, build an array of arguments for async operations first, then loop through them
    const updateOperations = Array.from(itemsToUpdate.entries());

    for (const [originalId, countToDelete] of updateOperations) {
      // The following is an async operation, so it needs to be handled carefully in a loop if we intend to run them in parallel with Promise.all later
      // However, the current logic fetches one by one, then pushes a promise to dbPromises.
      // This part is kept sequential to fetch currentQuantity before deciding to update or delete.
      const { data: currentSkinData, error: fetchError } = await supabase
        .from('inventario_usuario')
        .select('cantidad')
        .eq('id', originalId)
        .single();

      if (fetchError || !currentSkinData) {
        console.error(`Error fetching skin ${originalId} for deletion:`, fetchError);
        setError(`Error al obtener datos de la skin ${originalId} para eliminar.`);
        anyError = true;
        continue; // Skip to next item in itemsToUpdate if fetch fails
      }

      const currentQuantity = currentSkinData.cantidad;
      const newQuantity = currentQuantity - countToDelete;

      if (newQuantity <= 0) {
        dbPromises.push(
          supabase.from('inventario_usuario').delete().eq('id', originalId)
        );
      } else {
        dbPromises.push(
          supabase.from('inventario_usuario').update({ cantidad: newQuantity, fecha_modificacion: new Date().toISOString() }).eq('id', originalId)
        );
      }
    }
    // }); // End of forEach attempt, replaced by for...of Array.from()

    try {
      const results = await Promise.all(dbPromises.map(p => p.then((res: { error: any; data?: any }) => { // Explicit type for res
        if (res.error) throw res.error;
        return res;
      })));
      console.log("DB operations results:", results);
      // Refresh data only if no errors during DB ops and no prior errors
      if (!anyError) {
        await fetchUserInventory(); // Re-fetch the updated inventory
        setSelectedItems(new Set());
        setIsSelectionMode(false);
        setError(null); // Clear any previous general error
      }
    } catch (deleteError: any) {
      console.error("Error during bulk delete/update operation:", deleteError);
      setError("Error al eliminar/actualizar skins: " + (deleteError.message || 'Error desconocido'));
      // Optionally, re-fetch even on error to reflect partial success, though this can be complex
      // await fetchUserInventory(); 
    }
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
      const tierMatch = filterTier ? skin.contentTier.id === filterTier : true;
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

  const paginatedSkins = expandedSkins.slice(
    (currentPage - 1) * skinsPerPage,
    currentPage * skinsPerPage
  );
  const totalPages = Math.ceil(expandedSkins.length / skinsPerPage);

  const tierStats = calculateTierStats();


  if (loading && userSkins.length === 0) {
    return <InventoryLoading className="min-h-screen" />;
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 pt-12 pb-12 min-h-screen bg-background text-white">
      
      {/* Header and Filters */}
      <div className="mb-8 sticky top-0 z-10 bg-background/80 backdrop-blur-md py-4 rounded-b-xl shadow-lg">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <h1 className="text-3xl font-bold text-white font-[Raleway] font-semibold italic tracking-widest">
            / INVENTARIO
          </h1>
            <div className="flex items-center gap-2">
              <Button onClick={fetchUserInventory} variant="outline" size="sm" className="border-slate-700 hover:bg-slate-700">
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
              <Button onClick={toggleSelectionMode} variant={isSelectionMode ? "default" : "outline"} size="sm" className={`${isSelectionMode ? 'bg-primary hover:bg-primary/90' : 'border-slate-700 hover:bg-slate-700'}`}>
                {isSelectionMode ? "Cancelar Selección" : "Seleccionar Items"}
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
                  <SelectTrigger className="w-full md:w-[180px] bg-slate-800 border-slate-700 text-white rounded-lg focus:ring-1 focus:ring-primary">
                    <Filter className="h-4 w-4 mr-2 inline-block opacity-70" />
                    <SelectValue placeholder="Filtrar Rareza" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700 text-white">
                    <SelectItem value="all" className="hover:bg-slate-700">Todas las Rarezas</SelectItem>
                    {allApiContentTiersState.map(tier => (
                      <SelectItem key={tier.uuid} value={tier.uuid} className="hover:bg-slate-700" style={{ color: `#${tier.highlightColor}` || 'white' }}>
                        {tier.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Dropdown>
                <DropdownTrigger>
                  <Button variant="outline" className="w-full md:w-auto border-slate-700 hover:bg-slate-700">
                    Ordenar por: {sortOption}
                    <ChevronDown className="h-4 w-4 ml-2 opacity-70" />
                  </Button>
                </DropdownTrigger>
                <DropdownMenu aria-label="Sort options" onAction={(key) => setSortOption(key as string)} className="bg-slate-800 border-slate-700 text-white">
                  <DropdownItem key="newest">Más Recientes</DropdownItem>
                  <DropdownItem key="oldest">Más Antiguos</DropdownItem>
                  <DropdownItem key="name_asc">Nombre (A-Z)</DropdownItem>
                  <DropdownItem key="name_desc">Nombre (Z-A)</DropdownItem>
                </DropdownMenu>
              </Dropdown>
            </div>
          </div>
        </div>
      </div>

      {isSelectionMode && selectedItems.size > 0 && (
        <div className="mb-6 p-4 bg-slate-800 rounded-lg shadow-md flex justify-between items-center sticky top-32 z-10">
          <p className="text-white">{selectedItems.size} items seleccionados</p>
          <Button onClick={handleDeleteSelected} variant="destructive" size="sm">
            <Trash2 className="h-4 w-4 mr-2" /> Eliminar Seleccionados
          </Button>
        </div>
      )}

      {loading && userSkins.length === 0 && <InventoryLoading className="mt-10" />}
      {!loading && error && <p className="text-red-400 text-center mt-10"><XCircle className="inline mr-2" />{error}</p>}
      {!loading && !error && paginatedSkins.length === 0 && userSkins.length > 0 && (
         <p className="text-center text-slate-400 mt-10">No se encontraron skins con los filtros actuales.</p>
      )}
      {!loading && !error && userSkins.length === 0 && <EmptyInventory className="mt-10"/>}

      {paginatedSkins.length > 0 && (
        <motion.div 
          layout 
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6 pb-10"
        >
          {paginatedSkins.map((skin, index) => (
            <motion.div
              key={skin.uniqueCardId}
              layoutId={skin.uniqueCardId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2, delay: index * 0.05 }}
              onClick={() => { if (isSelectionMode && skin.uniqueCardId) { toggleItemSelection(skin.uniqueCardId); } }}
              className={`group relative flex flex-col aspect-[3/4] overflow-hidden rounded-xl border bg-gradient-to-b from-gray-900 to-black transition-all duration-300
                ${selectedItems.has(skin.uniqueCardId!) 
                  ? 'border-primary scale-105 shadow-lg shadow-primary/40' 
                  : 'border-gray-800/70 hover:shadow-[0px_2px_46px_-4px_rgba(255,_255,_255,_0.15)]'}`}
              style={{ '--tier-color': skin.contentTier.color || '#FFFFFF' } as React.CSSProperties}
            >
              <Image
                src={skin.skinIcon || '/images/placeholder_icon.webp'}
                alt={skin.skinName}
                fill
                sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                className="object-contain p-4 group-hover:scale-105 transition-transform duration-300 z-10"
                priority={index < skinsPerPage / 2} // Prioritize loading images visible on initial load
              />
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent z-20">
                <h3 className="font-semibold text-primary" title={skin.skinName}>{skin.skinName}</h3>
                {skin.bundleName && <p className="text-sm text-slate-300 truncate" title={skin.bundleName}>{skin.bundleName}</p>}
              </div>
              {isSelectionMode && (
                <div className={`absolute top-2 left-2 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${selectedItems.has(skin.uniqueCardId!) ? 'bg-primary border-white' : 'bg-slate-700/80 border-slate-600 hover:bg-slate-600/80'}`}>
                  {selectedItems.has(skin.uniqueCardId!) && <X className="h-3 w-3 text-white stroke-2" />}
                </div>
              )}
            </motion.div>
          ))}
        </motion.div>
      )}

      {totalPages > 1 && (
        <div className="mt-8 flex justify-center">
          <Pagination
            showControls
            initialPage={currentPage}
            total={totalPages}
            onChange={(page) => setCurrentPage(page)}
          />
        </div>
      )}
    </div>
  );
}

