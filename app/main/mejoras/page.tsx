"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import Link from "next/link";
import { Pagination } from "@/components/ui/pagination";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import InfoModal from "./InfoModal";
import { 
  getWeaponSkins as fetchAllApiSkinsFromValorantApi,
  getBestDisplayIcon,
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
  id: string; // Valorant API skin UUID
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
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedSkins, setSelectedSkins] = useState<Skin[]>([]);
  const [targetSkin, setTargetSkin] = useState<Skin | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  const [allApiSkins, setAllApiSkins] = useState<ValorantApiSkin[] | null>(null);
  const [allSupabaseTiers, setAllSupabaseTiers] = useState<SupabaseContentTier[] | null>(null);

  const [improvementProbability, setImprovementProbability] = useState(0);

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
    return userInventory.filter(
      (skin) =>
        skin.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (skin.content_tier?.nombre || "")
          .toLowerCase()
          .includes(searchTerm.toLowerCase())
    );
  }, [userInventory, searchTerm]);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredInventory.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredInventory.length / itemsPerPage);

  const bestSelectedSkin = useMemo(() => {
    if (selectedSkins.length === 0) return null;
    return [...selectedSkins].sort((a, b) => {
      const gradeA = a.content_tier?.grado ? parseInt(a.content_tier.grado) : 0;
      const gradeB = b.content_tier?.grado ? parseInt(b.content_tier.grado) : 0;
      return gradeB - gradeA;
    })[0];
  }, [selectedSkins]);

  const calculateImprovementProbability = useCallback(() => {
    if (selectedSkins.length === 0 || !targetSkin) return 0;
    const totalGrades = selectedSkins.reduce((sum, skin) => {
      const grade = skin.content_tier?.grado ? parseInt(skin.content_tier.grado) : 0;
      return sum + grade;
    }, 0);
    const targetGrade = targetSkin.content_tier?.grado ? parseInt(targetSkin.content_tier.grado) : 0;
    let probability = 10 + (selectedSkins.length * 5) + (totalGrades * 10);
    const maxSelectedGrade = bestSelectedSkin?.content_tier?.grado ? parseInt(bestSelectedSkin.content_tier.grado) : 0;
    if (targetGrade > maxSelectedGrade) {
      probability -= ((targetGrade - maxSelectedGrade) * 20);
    }
    return Math.min(Math.max(probability, 0), 95);
  }, [selectedSkins, targetSkin, bestSelectedSkin]);

  const loadUserInventory = useCallback(async () => {
    if (!userId) {
      setUserInventory([]); 
      setIsLoading(false);
      // También reseteamos skins seleccionadas y objetivo si el usuario cambia o cierra sesión
      setSelectedSkins([]);
      setTargetSkin(null);
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
      
      // Agrupar skins duplicadas y contar cuántas de cada una tiene el usuario
      const skinGroupsMap = new Map<string, {
        skin: Skin,
        inventoryIds: string[],
        count: number
      }>();

      inventoryData.forEach((item: InventoryItemFromDB) => {
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

        const skinId = item.skin_id;
        
        if (skinGroupsMap.has(skinId)) {
          // Si ya existe esta skin, incrementar el contador y agregar el ID
          const existing = skinGroupsMap.get(skinId)!;
          existing.count += 1;
          existing.inventoryIds.push(item.id);
        } else {
          // Si es nueva, crear entrada
          const newSkin: Skin = {
            id: skinId, // Valorant API Skin UUID
            nombre: skinName,
            bundleName: bundleName,
            content_tier_id: valorantApiTierUuid,
            uuid: skinId, // Valorant API Skin UUID
            imagen_url: imageUrl,
            content_tier: contentTierForSkin,
            selected: false,
            count: 1,
            inventoryIds: [item.id],
          };
          
          skinGroupsMap.set(skinId, {
            skin: newSkin,
            inventoryIds: [item.id],
            count: 1
          });
        }
      });

      // Convertir el mapa a array y filtrar skins sin imagen válida
      const mappedSkins: Skin[] = Array.from(skinGroupsMap.values())
        .map(group => ({
          ...group.skin,
          count: group.count,
          inventoryIds: group.inventoryIds
        }))
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
        // Si no hay userId (ej. cierre de sesión), limpiar el inventario mostrado
        setUserInventory([]);
        setSelectedSkins([]);
        setTargetSkin(null);
        setIsLoading(false); // Asegurarse que el estado de carga se desactiva
    }
  }, [userId, loadUserInventory]);

  useEffect(() => {
    const probability = calculateImprovementProbability();
    setImprovementProbability(probability);
  }, [selectedSkins, targetSkin, calculateImprovementProbability]);


  const toggleSelectSkin = (skinToToggle: Skin) => {
    const isCurrentlySelected = selectedSkins.some(s => s.id === skinToToggle.id);
    if (isCurrentlySelected) {
      // Deseleccionar la skin
      setSelectedSkins(prev => prev.filter(s => s.id !== skinToToggle.id));
    } else {
      // Seleccionar la skin
      const fullSkinData = userInventory.find(s => s.id === skinToToggle.id);
      if (fullSkinData && fullSkinData.inventoryIds && fullSkinData.inventoryIds.length > 0) {
        // Crear una copia de la skin con solo un inventoryId para la selección
        const skinForSelection: Skin = {
          ...fullSkinData,
          inventoryIds: [fullSkinData.inventoryIds[0]], // Solo tomar el primer ID
          count: 1 // Esta selección representa una sola skin
        };
        setSelectedSkins(prev => [...prev, skinForSelection]);
      }
    }
    // Actualizar el estado 'selected' en userInventory para UI
    setUserInventory(prev => 
        prev.map(s => s.id === skinToToggle.id ? { ...s, selected: !isCurrentlySelected } : s)
    );
  };


  const handleSelectTargetSkin = (skin: Skin) => {
    // Para skin objetivo, usamos las skins del inventario como posibles candidatas
    const fullTargetSkinData = userInventory.find(s => s.id === skin.id);
    if (fullTargetSkinData) {
        setTargetSkin(fullTargetSkinData.id === targetSkin?.id ? null : fullTargetSkinData);
    }
  };

  const handleImprovement = async () => {
    if (!userId) {
      toast.error("Por favor, inicia sesión para realizar mejoras.");
      return;
    }
    if (!targetSkin || selectedSkins.length === 0) {
      toast.error("Selecciona al menos una skin para descartar y una skin objetivo");
      return;
    }

    setIsProcessing(true);
    
    try {
      const skinsDescartadasData = selectedSkins.map(skin => ({
        id: skin.id,
        nombre: skin.nombre,
        content_tier_id: skin.content_tier_id,
        content_tier_nombre: skin.content_tier?.nombre || "Desconocido",
        grado: skin.content_tier?.grado || "0"
      }));

      const randomValue = Math.random() * 100;
      const isSuccessful = randomValue <= improvementProbability;
      
      const { error: mejoraError } = await supabase
        .from("mejoras")
        .insert({
          usuario_id: userId,
          fecha: new Date().toISOString(),
          exitoso: isSuccessful,
          probabilidad_calculada: improvementProbability,
          skin_objetivo_id: targetSkin.id,
          skin_objetivo_nombre: targetSkin.nombre,
          skins_descartadas: skinsDescartadasData
        });

      if (mejoraError) throw mejoraError;

      // Eliminar las skins seleccionadas del inventario
      // En el nuevo sistema, cada skin seleccionada significa eliminar una fila de la DB
      for (const skin of selectedSkins) {
        // Usar el primer ID disponible de los inventoryIds para esta skin
        if (skin.inventoryIds && skin.inventoryIds.length > 0) {
          const inventoryIdToDelete = skin.inventoryIds[0]; // Tomar el primer ID
          
          const { error: deleteError } = await supabase
            .from("inventario_usuario")
            .delete()
            .eq("id", inventoryIdToDelete);
            
          if (deleteError) {
            console.warn(`Error deleting inventory item ${inventoryIdToDelete}: ${deleteError.message}`);
          }
        }
      }

      if (isSuccessful) {
        // En el nuevo sistema, siempre insertamos una nueva fila para la skin objetivo
        const { error: insertError } = await supabase
          .from("inventario_usuario")
          .insert({
            usuario_id: userId,
            skin_id: targetSkin.id,
            skin_nombre: targetSkin.nombre,
            fecha_obtencion: new Date().toISOString()
          });
          
        if (insertError) {
          console.error(`Error inserting target skin ${targetSkin.id}:`, insertError);
          throw insertError;
        }
        
        toast.success("¡Mejora exitosa! Has conseguido la skin objetivo");
      } else {
        toast.error("La mejora ha fallado. Las skins seleccionadas se han perdido");
      }
      
      setSelectedSkins([]);
      setTargetSkin(null);
      await loadUserInventory();
    } catch (error: any) {
      console.error("Error en el proceso de mejora:", error);
      toast.error(`Error en la mejora: ${error.message || "Error desconocido"}`);
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoadingSession) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 to-slate-800 text-white p-4">
        <Spinner size="lg" />
        <p className="text-lg text-gray-300 mt-4">Cargando sesión...</p>
      </div>
    );
  }

  if (!userId) {
    // ... (pantalla de no autenticado sin cambios)
  }

  return (
    <div className="flex flex-col gap-8 pl-16 md:pr-12 lg:pr-16 pt-12 pb-12 min-h-screen bg-background w-full max-w-full flex-1 relative">
      <h1 className="text-3xl font-bold text-white font-[Raleway] font-semibold italic tracking-widest">
        / MEJORAS
      </h1>
      
      <InfoModal />

      {/* Primera fila: Skin elegida, ruleta de probabilidad, skin objetivo */}
      <div className="w-full flex flex-col md:flex-row gap-6 mb-8">
        {/* Skin elegida (mejor skin seleccionada) */}
        <div className="w-full md:w-1/3 bg-neutral-900 rounded-lg p-4 flex flex-col items-center min-h-[20rem]">
          <h2 className="text-xl font-semibold text-white mb-4">Skin a descartar</h2>
          {bestSelectedSkin ? (
            <div className="w-full flex flex-col items-center text-center">
              <div 
                className="relative w-full h-64 rounded-lg overflow-hidden mb-2"
                style={{
                  backgroundColor: bestSelectedSkin.content_tier?.color || "#1a1a1a",
                  boxShadow: `0 0 15px ${bestSelectedSkin.content_tier?.color || "#1a1a1a"}40`
                }}
              >
                {bestSelectedSkin.imagen_url && bestSelectedSkin.imagen_url !== "/images/placeholder_icon.webp" ? (
                  <Image
                    src={bestSelectedSkin.imagen_url}
                    alt={bestSelectedSkin.nombre}
                    fill
                    className="object-contain p-2"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-500">Imagen no disponible</div>
                )}
              </div>
              <h3 className="text-lg font-medium text-white truncate max-w-full px-2">{bestSelectedSkin.nombre}</h3>
              <p className="text-sm text-gray-400">
                {bestSelectedSkin.content_tier?.nombre || "Tier Desconocido"}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                ({selectedSkins.length} {selectedSkins.length === 1 ? "seleccionada" : "seleccionadas"})
              </p>
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-neutral-800 rounded-lg">
              <p className="text-gray-400">Selecciona skins de tu inventario</p>
            </div>
          )}
        </div>

        {/* Ruleta de probabilidad */}
        <div className="w-full md:w-1/3 bg-neutral-900 rounded-lg p-4 flex flex-col items-center min-h-[20rem]">
          <h2 className="text-xl font-semibold text-white mb-4">Probabilidad de mejora</h2>
          <div className="w-full flex-grow flex flex-col items-center justify-center">
            <div 
              className="w-48 h-48 rounded-full flex items-center justify-center mb-4 border-4 transition-all duration-500"
              style={{
                borderColor: improvementProbability > 70 ? "#4ade80" : improvementProbability > 40 ? "#facc15" : "#ef4444",
                background: `conic-gradient(${improvementProbability > 70 ? "#4ade80" : improvementProbability > 40 ? "#facc15" : "#ef4444"} ${improvementProbability}%, transparent ${improvementProbability}%)`
              }}
            >
              <span className="text-4xl font-bold text-white">
                {Math.round(improvementProbability)}%
              </span>
            </div>
            <p className="text-sm text-gray-400 text-center max-w-xs">
              {selectedSkins.length === 0 || !targetSkin
                ? "Selecciona skins y un objetivo"
                : improvementProbability < 30 
                  ? "Probabilidad baja. Considera añadir más skins o de mejor calidad."
                  : improvementProbability < 70 
                    ? "Probabilidad moderada. ¡Podrías tener suerte!"
                    : "¡Buena probabilidad! Tus chances de éxito son altas."}
            </p>
          </div>
        </div>

        {/* Skin objetivo */}
        <div className="w-full md:w-1/3 bg-neutral-900 rounded-lg p-4 flex flex-col items-center min-h-[20rem]">
          <h2 className="text-xl font-semibold text-white mb-4">Skin objetivo</h2>
          {targetSkin ? (
            <div className="w-full flex flex-col items-center text-center">
              <div 
                className="relative w-full h-64 rounded-lg overflow-hidden mb-2"
                style={{
                  backgroundColor: targetSkin.content_tier?.color || "#1a1a1a",
                  boxShadow: `0 0 15px ${targetSkin.content_tier?.color || "#1a1a1a"}40`
                }}
              >
                {targetSkin.imagen_url && targetSkin.imagen_url !== "/images/placeholder_icon.webp" ? (
                  <Image
                    src={targetSkin.imagen_url}
                    alt={targetSkin.nombre}
                    fill
                    className="object-contain p-2"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-500">Imagen no disponible</div>
                )}
              </div>
              <h3 className="text-lg font-medium text-white truncate max-w-full px-2">{targetSkin.nombre}</h3>
              <p className="text-sm text-gray-400">
                {targetSkin.content_tier?.nombre || "Tier Desconocido"}
              </p>
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-neutral-800 rounded-lg">
              <p className="text-gray-400">Selecciona una skin objetivo de la lista de abajo</p>
            </div>
          )}
        </div>
      </div>

      {/* Botón para realizar la mejora */}
      <div className="w-full flex justify-center mb-8">
        <Button 
          onClick={handleImprovement}
          disabled={selectedSkins.length === 0 || !targetSkin || isProcessing}
          className="px-8 py-6 text-lg font-semibold min-w-[200px]"
          variant={selectedSkins.length === 0 || !targetSkin ? "secondary" : "default"}
        >
          {isProcessing ? (
            <>
              <Spinner size="sm" className="mr-2" /> Procesando...
            </>
          ) : (
            "Realizar mejora"
          )}
        </Button>
      </div>

      {/* Segunda fila: Inventario y selección de skin */}
      <div className="w-full flex flex-col lg:flex-row gap-6">
        {/* Inventario del usuario */}
        <div className="w-full lg:w-1/2 bg-neutral-900 rounded-lg p-4">
          <h2 className="text-xl font-semibold text-white mb-4">Mi inventario (Skins a descartar)</h2>
          <div className="mb-4">
            <Input 
              placeholder="Buscar en mi inventario..." 
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1);}}
              className="bg-neutral-800 border-neutral-700"
            />
          </div>

          {isLoading && userInventory.length === 0 ? (
            <div className="w-full flex justify-center py-12"><Spinner size="lg" /></div>
          ) : !isLoading && currentItems.length === 0 ? (
            <div className="w-full p-8 text-center">
              <p className="text-gray-400">
                {userInventory.length === 0 ? "No hay skins en tu inventario." : "No se encontraron skins que coincidan."}
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {currentItems.map((skin) => (
                  <div 
                    key={`inventory-${skin.id}-${skin.uuid}`}
                    className={`
                      relative rounded-lg overflow-hidden cursor-pointer transition-all border-2
                      ${skin.selected ? 'ring-2 ring-primary ring-offset-2 ring-offset-background border-primary' : 'border-transparent hover:border-neutral-700'}
                    `}
                    onClick={() => toggleSelectSkin(skin)}
                    style={{
                      background: `linear-gradient(to bottom, ${skin.content_tier?.color || '#1a1a1a'}20, #18181b 70%)`,
                      boxShadow: skin.selected && skin.content_tier?.color ? `0 0 10px ${skin.content_tier.color}60` : 'none'
                    }}
                  >
                    <div className="relative aspect-[4/3] w-full">
                      {skin.imagen_url && skin.imagen_url !== "/images/placeholder_icon.webp" ? (
                        <Image
                          src={skin.imagen_url}
                          alt={skin.nombre}
                          fill
                          className="object-contain p-2 transition-transform group-hover:scale-105"
                        />
                      ) : (
                         <div className="w-full h-full flex items-center justify-center text-gray-600 text-xs p-1">No img</div>
                      )}
                    </div>
                    <div className="p-2 text-center">
                      <h3 className="text-sm font-medium text-white truncate" title={skin.nombre}>{skin.nombre}</h3>
                      <p className="text-xs text-gray-400 truncate" title={skin.content_tier?.nombre || "Tier Desconocido"}>
                        {skin.content_tier?.nombre || "Tier Desconocido"} (x{skin.count})
                      </p>
                    </div>
                    {skin.selected && (
                      <div className="absolute top-2 right-2 bg-primary text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                        ✓
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {totalPages > 1 && (
                <div className="flex justify-center mt-6">
                  <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                </div>
              )}
            </>
          )}
        </div>

        {/* Selección de skin a obtener */}
        <div className="w-full lg:w-1/2 bg-neutral-900 rounded-lg p-4">
          <h2 className="text-xl font-semibold text-white mb-4">Skin a obtener (Selecciona tu objetivo)</h2>
           {/* Aquí podrías tener otro input de búsqueda si la lista de skins objetivo es muy grande */}
          {isLoading && userInventory.length === 0 ? ( // Podrías tener un loader separado para skins objetivo si vienen de otra fuente
            <div className="w-full flex justify-center py-12"><Spinner size="lg" /></div>
          ) : userInventory.length === 0 ? (
             <div className="w-full p-8 text-center"><p className="text-gray-400">No hay skins disponibles para seleccionar como objetivo.</p></div>
          ) : (
            // Por ahora, mostramos una subsección del inventario como skins objetivo
            // Idealmente, aquí se mostrarían TODAS las skins posibles, no solo las del inventario.
            // Esto es una simplificación temporal.
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-h-[600px] overflow-y-auto pr-2">
              {userInventory.filter(skin => skin.content_tier?.grado && parseInt(skin.content_tier.grado) >=1 ) // Ejemplo: solo mostrar skins con grado
                .sort((a,b) => (parseInt(b.content_tier?.grado || "0") - parseInt(a.content_tier?.grado || "0")) || a.nombre.localeCompare(b.nombre))
                .map((skin) => (
                <div 
                  key={`target-${skin.id}-${skin.uuid}`}
                  className={`
                    relative rounded-lg overflow-hidden cursor-pointer transition-all border-2
                    ${targetSkin?.id === skin.id ? 'ring-2 ring-green-500 ring-offset-2 ring-offset-background border-green-500' : 'border-transparent hover:border-neutral-700'}
                  `}
                  onClick={() => handleSelectTargetSkin(skin)}
                  style={{
                    background: `linear-gradient(to bottom, ${skin.content_tier?.color || '#1a1a1a'}20, #18181b 70%)`,
                    boxShadow: targetSkin?.id === skin.id && skin.content_tier?.color ? `0 0 10px ${skin.content_tier.color}60` : 'none'
                  }}
                >
                  <div className="relative aspect-[4/3] w-full">
                    {skin.imagen_url && skin.imagen_url !== "/images/placeholder_icon.webp" ? (
                      <Image
                        src={skin.imagen_url}
                        alt={skin.nombre}
                        fill
                        className="object-contain p-2 transition-transform group-hover:scale-105"
                      />
                    ) : (
                         <div className="w-full h-full flex items-center justify-center text-gray-600 text-xs p-1">No img</div>
                    )}
                  </div>
                  <div className="p-2 text-center">
                    <h3 className="text-sm font-medium text-white truncate" title={skin.nombre}>{skin.nombre}</h3>
                    <p className="text-xs text-gray-400 truncate" title={skin.content_tier?.nombre || "Tier Desconocido"}>
                      {skin.content_tier?.nombre || "Tier Desconocido"}
                    </p>
                  </div>
                  {targetSkin?.id === skin.id && (
                    <div className="absolute top-2 right-2 bg-green-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                      ✓
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
