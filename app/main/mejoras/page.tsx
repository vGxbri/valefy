"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Filter, Sparkles, ArrowDownWideNarrow, CircleFadingArrowUp } from 'lucide-react';
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { 
  getWeaponSkins as fetchAllApiSkinsFromValorantApi,
  getBestDisplayIcon,
  getWeaponType,
  getWeaponSpecificStyles,
  filterSkinsByBundleWithIcon,
  Skin as ValorantApiSkin
} from "@/lib/valorantApi";
import { extractBundleName } from '@/lib/utils';
import CircularRoulette from "@/components/CircularRoulette";
import { createClient } from '@/utils/supabase/client';
import { logSkinMejorada, type SkinMejoradaLog } from '@/lib/logUtils';

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
  fecha_obtencion?: string; // Fecha de obtención para ordenamiento
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
  const [sortOrder, setSortOrder] = useState<string>("skin"); // "skin", "newest", "oldest"
  const maxSelectedSkins = 5;

  const [allApiSkins, setAllApiSkins] = useState<ValorantApiSkin[] | null>(null);
  const [allSupabaseTiers, setAllSupabaseTiers] = useState<SupabaseContentTier[] | null>(null);

  // Estados para el modal de resultado
  const [showResultModal, setShowResultModal] = useState(false);
  const [rewardSkin, setRewardSkin] = useState<ValorantApiSkin | null>(null);
  const [isNewSkin, setIsNewSkin] = useState<boolean>(false);

  // Estados para el modal de ruleta
  const [showRouletteModal, setShowRouletteModal] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [rouletteResult, setRouletteResult] = useState<'win' | 'lose' | null>(null);

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
    let filtered = userInventory.filter((skin) => {
      const searchMatch = skin.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (skin.content_tier?.nombre || "").toLowerCase().includes(searchTerm.toLowerCase());
      
      const tierMatch = filterTier ? skin.content_tier?.uuid_api === filterTier : true;
      
      return searchMatch && tierMatch;
    });

    // Aplicar ordenamiento
    switch (sortOrder) {
      case "skin":
        // Ordenar por duplicados (más cantidad primero)
        const skinCounts = new Map<string, number>();
        
        // Contar cuántas veces aparece cada skin_id
        filtered.forEach(skin => {
          const count = skinCounts.get(skin.skin_id || skin.uuid) || 0;
          skinCounts.set(skin.skin_id || skin.uuid, count + 1);
        });
        
        // Ordenar por cantidad (mayor a menor) y luego alfabéticamente
        filtered.sort((a, b) => {
          const countA = skinCounts.get(a.skin_id || a.uuid) || 0;
          const countB = skinCounts.get(b.skin_id || b.uuid) || 0;
          
          if (countA !== countB) {
            return countB - countA; // Mayor cantidad primero
          }
          
          return a.nombre.localeCompare(b.nombre); // Alfabético como desempate
        });
        break;
      case "newest":
        // Más recientes primero (fecha más nueva primero)
        filtered.sort((a, b) => {
          const dateA = new Date(a.fecha_obtencion || 0).getTime();
          const dateB = new Date(b.fecha_obtencion || 0).getTime();
          return dateB - dateA;
        });
        break;
      case "oldest":
        // Más antiguas primero (fecha más vieja primero)
        filtered.sort((a, b) => {
          const dateA = new Date(a.fecha_obtencion || 0).getTime();
          const dateB = new Date(b.fecha_obtencion || 0).getTime();
          return dateA - dateB;
        });
        break;
      default:
        break;
    }

    return filtered;
  }, [userInventory, searchTerm, filterTier, sortOrder]);

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
          fecha_obtencion: item.fecha_obtencion, // Incluir fecha de obtención
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
        tier.nombre.toLowerCase() !== 'ultra edition'
      );
      // Buscar el tier con grado más bajo (Select Edition = grado 1)
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

  // Función para obtener una skin aleatoria de tier superior
  const getRandomRewardSkin = async (): Promise<ValorantApiSkin | null> => {
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
      
      if (!currentApiSkins || !currentSupabaseTiers || selectedSkins.length === 0) {
        console.error("Datos insuficientes para generar skin de tier superior");
        return null;
      }

      // Obtener el tier de las skins seleccionadas
      const selectedTier = selectedSkins[0].content_tier;
      if (!selectedTier) {
        console.error("No se pudo determinar el tier de las skins seleccionadas");
        return null;
      }

      const selectedTierGrade = parseInt(selectedTier.grado);

      // Buscar el tier inmediatamente superior (siguiente grado)
      const nextTierGrade = selectedTierGrade + 1;
      const superiorTiers = currentSupabaseTiers.filter(tier => {
        const tierGrade = parseInt(tier.grado);
        const isUltraEdition = tier.nombre.toLowerCase() === 'ultra edition';
        
        // Si estamos mejorando desde Exclusive Edition, permitir Ultra Edition
        if (isUltraEdition && tierGrade === nextTierGrade) {
          return true;
        }
        
        // Para otros casos, buscar exactamente el siguiente grado y excluir Exclusive/Ultra
        return tierGrade === nextTierGrade && !isUltraEdition;
      });

      if (superiorTiers.length === 0) {
        console.error("No hay tiers superiores disponibles");
        return null;
      }

      // Aplicar filtros básicos (bundles con icono)
      const filteredSkins = await filterSkinsByBundleWithIcon(currentApiSkins);
      
      // Filtrar skins que sean de tiers superiores
      const superiorTierUuids = superiorTiers.map(tier => tier.uuid_api);
      const superiorSkins = filteredSkins.filter(skin => 
        skin.contentTierUuid && superiorTierUuids.includes(skin.contentTierUuid)
      );
      
      if (superiorSkins.length === 0) {
        console.error("No hay skins de tier superior disponibles");
        return null;
      }
      
      // Seleccionar una skin aleatoria de tier superior
      const randomIndex = Math.floor(Math.random() * superiorSkins.length);
      return superiorSkins[randomIndex];
    } catch (error) {
      console.error("Error al obtener skin de tier superior:", error);
      return null;
    }
  };

  const handleImprovement = async () => {
    if (selectedSkins.length === 0) {
      toast.error("Debes seleccionar al menos 1 skin para realizar la mejora");
      return;
    }

    if (selectedSkins.length > 5) {
      toast.error("Solo puedes seleccionar hasta 5 skins");
      return;
    }

    if (!userId) {
      toast.error("Error: Usuario no identificado");
      return;
    }

    // Si son 5 skins, hacer la mejora directamente (100% éxito)
    if (selectedSkins.length === 5) {
      return handleDirectImprovement();
    }

    // Si son 1-4 skins, abrir modal de ruleta
    setShowRouletteModal(true);
    setRouletteResult(null);
    setIsSpinning(false);
  };

  const handleDirectImprovement = async () => {
    if (!userId) {
      toast.error("Error: Usuario no identificado");
      return;
    }

    try {
      // Obtener una skin aleatoria de tier superior
      const randomSkin = await getRandomRewardSkin();
      
      if (!randomSkin) {
        toast.error("Error al obtener la skin premiada");
        return;
      }

      // Verificar si la skin es nueva para el usuario (antes de añadirla)
      const { data: existingSkins, error: checkError } = await supabase
          .from("inventario_usuario")
        .select("id")
          .eq("usuario_id", userId)
        .eq("skin_id", randomSkin.uuid)
        .limit(1);

      if (checkError) {
        console.warn("Error al verificar si la skin es nueva:", checkError);
      }

      // Determinar si es una skin nueva (no tiene entradas previas en el inventario)
      const skinIsNew = !existingSkins || existingSkins.length === 0;

      // Eliminar las skins seleccionadas del inventario
      const selectedInventoryIds = selectedSkins.flatMap(skin => skin.inventoryIds || []);
      
      const { error: deleteError } = await supabase
              .from("inventario_usuario")
              .delete()
        .in("id", selectedInventoryIds);

      if (deleteError) {
        console.error("Error al eliminar skins seleccionadas:", deleteError);
        toast.error("Error al procesar las skins seleccionadas");
        return;
      }

      // Agregar la nueva skin al inventario
      const { error: insertError } = await supabase
        .from("inventario_usuario")
        .insert({
          usuario_id: userId,
          skin_id: randomSkin.uuid,
          skin_nombre: randomSkin.displayName,
          fecha_obtencion: new Date().toISOString()
        });

      if (insertError) {
        console.error("Error al agregar nueva skin:", insertError);
        toast.error("Error al agregar la nueva skin al inventario");
        return;
      }

      // Actualizar el estado local: eliminar skins seleccionadas
      setUserInventory(prev => 
        prev.filter(skin => !selectedInventoryIds.includes(skin.id))
      );

      // Limpiar selección
      setSelectedSkins([]);

      // Mostrar el modal con la skin premiada
      setRewardSkin(randomSkin);
      setIsNewSkin(skinIsNew);
      setShowResultModal(true);

      // 🎯 OBTENER EL ID DE SUPABASE DEL TIER PARA EL LOG
      let tierObjetivoId: string | undefined = undefined;
      if (randomSkin.contentTierUuid && allSupabaseTiers) {
        const tierEncontrado = allSupabaseTiers.find(tier => tier.uuid_api === randomSkin.contentTierUuid);
        tierObjetivoId = tierEncontrado?.id;
      }

      // Registrar el log de mejora exitosa
      const logData: SkinMejoradaLog = {
        usuario_id: userId as string,
        exitoso: true,
        probabilidad_calculada: 100.0, // 5 skins = 100% de éxito
        skin_objetivo_id: randomSkin.uuid || undefined,
        skin_objetivo_nombre: randomSkin.displayName,
        skins_descartadas: selectedSkins.map(skin => ({
          skin_id: skin.skin_id || skin.uuid,
          skin_nombre: skin.nombre,
          inventario_id: skin.inventoryIds?.[0] || skin.id
        })),
        tier_objetivo_id: tierObjetivoId, // 🎯 USAR ID DE SUPABASE
        cantidad_skins_usadas: selectedSkins.length
      };

      const logResult = await logSkinMejorada(logData);
      if (!logResult.success) {
        console.warn('Error al registrar log de mejora exitosa:', logResult.error);
      }

      // 🎯 PROCESAR MISIÓN DE MEJORA
      try {
        const misionResponse = await fetch('/api/misiones/procesar-actividad', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tipoActividad: 'mejora_realizada',
            cantidad: 1
          })
        });

        if (!misionResponse.ok) {
          console.warn('Error al procesar misión de mejora:', await misionResponse.text());
        } else {
          // 🎯 DISPARAR EVENTO PARA ACTUALIZAR SIDEBAR - MISIONES
          window.dispatchEvent(new CustomEvent('misionesActualizadas'));
        }
      } catch (missionError) {
        console.warn('Error al procesar misión de mejora:', missionError);
      }

      toast.success("¡Mejora realizada exitosamente!");
      
    } catch (error) {
      console.error("Error en handleDirectImprovement:", error);
      toast.error("Error al procesar la mejora");
    }
  };

  const handleRouletteConfirm = async () => {
    setIsSpinning(true);
    setRouletteResult(null);

    // Si hay menos de 5 skins, CircularRoulette manejará el resultado
    if (selectedSkins.length < 5) {
      return; // CircularRoulette se encarga del resto a través de onSpinComplete
    }

    // Para 5 skins (caso original, aunque no debería llegar aquí)
    // Simular el tiempo de la ruleta
    setTimeout(async () => {
      const success = Math.random() * 100 < successPercentage;
      setRouletteResult(success ? 'win' : 'lose');
      setIsSpinning(false);

      if (success) {
        // Si gana, hacer la mejora con recompensa
        setTimeout(async () => {
          setShowRouletteModal(false);
          await handleRouletteWin();
        }, 2000);
      } else {
        // Si pierde, solo eliminar las skins
        setTimeout(async () => {
          await handleRouletteLose();
        }, 2000);
      }
    }, 3000); // 3 segundos de ruleta girando
  };

  const handleRouletteWin = async () => {
    if (!userId) {
      toast.error("Error: Usuario no identificado");
      return;
    }

    try {
      // Obtener una skin aleatoria de tier superior
      const randomSkin = await getRandomRewardSkin();
      
      if (!randomSkin) {
        toast.error("Error al obtener la skin premiada");
        return;
      }

      // Verificar si la skin es nueva para el usuario
      const { data: existingSkins, error: checkError } = await supabase
          .from("inventario_usuario")
        .select("id")
          .eq("usuario_id", userId)
        .eq("skin_id", randomSkin.uuid)
        .limit(1);

      if (checkError) {
        console.warn("Error al verificar si la skin es nueva:", checkError);
      }

      const skinIsNew = !existingSkins || existingSkins.length === 0;

      // Eliminar las skins seleccionadas
      const selectedInventoryIds = selectedSkins.flatMap(skin => skin.inventoryIds || []);
      
      const { error: deleteError } = await supabase
            .from("inventario_usuario")
        .delete()
        .in("id", selectedInventoryIds);

      if (deleteError) {
        console.error("Error al eliminar skins:", deleteError);
        toast.error("Error al procesar las skins");
        return;
      }

      // Agregar la nueva skin
      const { error: insertError } = await supabase
            .from("inventario_usuario")
            .insert({
              usuario_id: userId,
          skin_id: randomSkin.uuid,
          skin_nombre: randomSkin.displayName,
          fecha_obtencion: new Date().toISOString()
        });

      if (insertError) {
        console.error("Error al agregar nueva skin:", insertError);
        toast.error("Error al agregar la nueva skin");
        return;
      }

      // Actualizar estado local
      setUserInventory(prev => 
        prev.filter(skin => !selectedInventoryIds.includes(skin.id))
      );
      setSelectedSkins([]);

      // Mostrar resultado
      setRewardSkin(randomSkin);
      setIsNewSkin(skinIsNew);
      setShowResultModal(true);

      // 🎯 OBTENER EL ID DE SUPABASE DEL TIER PARA EL LOG
      let tierObjetivoId: string | undefined = undefined;
      if (randomSkin.contentTierUuid && allSupabaseTiers) {
        const tierEncontrado = allSupabaseTiers.find(tier => tier.uuid_api === randomSkin.contentTierUuid);
        tierObjetivoId = tierEncontrado?.id;
      }

      // Registrar el log de mejora exitosa
      const logData: SkinMejoradaLog = {
        usuario_id: userId as string,
        exitoso: true,
        probabilidad_calculada: successPercentage,
        skin_objetivo_id: randomSkin.uuid || undefined,
        skin_objetivo_nombre: randomSkin.displayName,
        skins_descartadas: selectedSkins.map(skin => ({
          skin_id: skin.skin_id || skin.uuid,
          skin_nombre: skin.nombre,
          inventario_id: skin.inventoryIds?.[0] || skin.id
        })),
        tier_objetivo_id: tierObjetivoId, // 🎯 USAR ID DE SUPABASE
        cantidad_skins_usadas: selectedSkins.length
      };

      const logResult = await logSkinMejorada(logData);
      if (!logResult.success) {
        console.warn('Error al registrar log de mejora exitosa:', logResult.error);
      }

      // 🎯 PROCESAR MISIÓN DE MEJORA
      try {
        const misionResponse = await fetch('/api/misiones/procesar-actividad', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tipoActividad: 'mejora_realizada',
            cantidad: 1
          })
        });

        if (!misionResponse.ok) {
          console.warn('Error al procesar misión de mejora:', await misionResponse.text());
        } else {
          // 🎯 DISPARAR EVENTO PARA ACTUALIZAR SIDEBAR - MISIONES
          window.dispatchEvent(new CustomEvent('misionesActualizadas'));
        }
      } catch (missionError) {
        console.warn('Error al procesar misión de mejora:', missionError);
      }

      setTimeout(() => {
        loadUserInventory();
      }, 1000);

      toast.success("¡Has ganado la mejora!");
    } catch (error) {
      console.error("Error en handleRouletteWin:", error);
      toast.error("Error al procesar la victoria");
    }
  };

  const handleRouletteLose = async () => {
    if (!userId) {
      toast.error("Error: Usuario no identificado");
      return;
    }

    try {
      // Solo eliminar las skins seleccionadas sin dar recompensa
      const selectedInventoryIds = selectedSkins.flatMap(skin => skin.inventoryIds || []);
      
      const { error: deleteError } = await supabase
        .from("inventario_usuario")
        .delete()
        .in("id", selectedInventoryIds);

      if (deleteError) {
        console.error("Error al eliminar skins:", deleteError);
        toast.error("Error al procesar las skins");
        return;
      }

      // Actualizar estado local
      setUserInventory(prev => 
        prev.filter(skin => !selectedInventoryIds.includes(skin.id))
      );
      setSelectedSkins([]);

      // Cerrar modal y mostrar mensaje
      setShowRouletteModal(false);
      toast.error("La mejora ha fallado. Has perdido las skins seleccionadas.");

      // Registrar el log de mejora fallida
      const logData: SkinMejoradaLog = {
        usuario_id: userId as string,
        exitoso: false,
        probabilidad_calculada: successPercentage,
        skin_objetivo_nombre: 'Mejora fallida',
        skins_descartadas: selectedSkins.map(skin => ({
          skin_id: skin.skin_id || skin.uuid,
          skin_nombre: skin.nombre,
          inventario_id: skin.inventoryIds?.[0] || skin.id
        })),
        cantidad_skins_usadas: selectedSkins.length
      };

      const logResult = await logSkinMejorada(logData);
      if (!logResult.success) {
        console.warn('Error al registrar log de mejora fallida:', logResult.error);
      }

      setTimeout(() => {
        loadUserInventory();
      }, 1000);
    } catch (error) {
      console.error("Error en handleRouletteLose:", error);
      toast.error("Error al procesar la derrota");
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
      <div className="mb-6 sm:mb-8">
      <h1 className="text-2xl sm:text-3xl font-bold text-white font-[Raleway] font-semibold italic tracking-widest">
        / MEJORAR
      </h1>
      </div>

      {/* Sección Superior: Skins Seleccionadas */}
      <div className="mb-6 sm:mb-8">
        <div className="bg-backgroundAlt/10 border border-white/10 rounded-2xl backdrop-blur-xl shadow-[0_0_45px_-5px_rgba(0,0,0,0.3)] transition-all duration-300 hover:shadow-[0_0_55px_-5px_rgba(0,0,0,0.4)] p-4 sm:p-6">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-4 sm:mb-6 gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">Skins Seleccionadas</h2>
              <p className="text-slate-400 text-sm sm:text-base">Selecciona hasta {maxSelectedSkins} skins para mejorar</p>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 w-full lg:w-auto">
              <div className="text-left sm:text-right">
                <div className="text-2xl sm:text-3xl font-bold text-red-500">{successPercentage}%</div>
                <div className="text-xs sm:text-sm text-slate-400">Probabilidad de éxito</div>
            </div>
              
              <Button variant="default" className="rounded-xl bg-gradient-to-r from-red-500/20 to-red-600/20 text-white shadow-lg shadow-red-900/20 border border-red-500/20 hover:bg-gradient-to-r hover:from-red-500/30 hover:to-red-600/30 active:scale-95 transition-all duration-200 w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base"
              disabled={selectedSkins.length === 0}
              onClick={handleImprovement}
              >
                <CircleFadingArrowUp className="w-4 h-4" />
                {selectedSkins.length === 5 ? 'Mejorar (5/5)' : `Mejorar (${selectedSkins.length}/5)`}
              </Button>
            </div>
        </div>

          {/* Grid de skins seleccionadas - Grid responsive */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 min-h-[180px] sm:min-h-[200px]">
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
                                        {/* Overlay de eliminación al hacer hover */}
                    <button 
                      className="absolute inset-0 bg-black/60 opacity-0 hover:opacity-100 transition-opacity duration-200 z-20 flex items-center justify-center cursor-pointer rounded-xl border-none"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelectSkin(skin);
                      }}
                      aria-label={`Deseleccionar ${skin.nombre}`}
                      type="button"
                    >
                      <X className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-white" />
                    </button>
                    {/* Imagen de fondo del tier */}
                    {skin.content_tier?.uuid_api && skin.content_tier.uuid_api !== 'default' && (
                      <Image 
                        src={`/skins-bg/${skin.content_tier.uuid_api}.png`}
                        alt={`Fondo para ${skin.content_tier.nombre}`}
                        layout="fill"
                        objectFit="contain" // O "cover" si prefieres que llene y recorte
                        className="absolute inset-0 z-0 p-2 sm:p-3 md:p-4 opacity-60 transform scale-125 rotate-12"
                        priority={index < 10}
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          console.warn(`No se encontró la imagen de fondo para el tier: /skins-bg/${skin.content_tier?.uuid_api}.png`);
                        }}
                      />
                    )}

                    {/* Imagen de la skin */}
                  <Image
                      src={skin.imagen_url || '/images/placeholder_icon.webp'}
                      alt={skin.nombre}
                      fill
                      sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
                      className="object-contain p-2 sm:p-3 md:p-4 group-hover:scale-105 transition-transform duration-300 z-10"
                      style={imageTransformStyle}
                    />

                    {/* Información de la skin */}
                    <div className="absolute bottom-0 left-0 right-0 p-2 sm:p-3 bg-gradient-to-t from-black/80 to-transparent z-10">
                      <h3 className="font-medium text-primary text-xs sm:text-sm truncate" title={skin.nombre}>
                        {skin.nombre}
                      </h3>
                      {skin.content_tier?.nombre && (
                        <p className="text-[10px] sm:text-xs text-slate-300 truncate" title={skin.content_tier.nombre}>
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
                      <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 border-2 border-slate-600 border-dashed rounded-xl mb-1 sm:mb-2 mx-auto"></div>
                      <p className="text-[10px] sm:text-xs">Slot {index + 1}</p>
            </div>
            </div>
                );
              }
            })}
          </div>
        </div>
      </div>

      {/* Sección Inferior: Inventario */}
      <div className="bg-backgroundAlt/10 border border-white/10 rounded-2xl backdrop-blur-xl shadow-[0_0_45px_-5px_rgba(0,0,0,0.3)] transition-all duration-300 hover:shadow-[0_0_55px_-5px_rgba(0,0,0,0.4)] p-4 sm:p-6">
        {/* Header del inventario */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-4 sm:mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-white">Tu Inventario</h2>
          
          {/* Filtros */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full lg:w-auto">
          {/* Filtro de ordenamiento */}
            <Select value={sortOrder} onValueChange={setSortOrder}>
              <SelectTrigger className="w-full sm:w-48 bg-slate-800 border-2 border-slate-700 text-white rounded-xl hover:border-slate-600 focus:ring-1 focus:ring-primary focus:border-primary transition-colors duration-150 text-sm sm:text-base">
                <ArrowDownWideNarrow className="h-4 w-4 mr-2 inline-block opacity-70" />
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 text-white rounded-md shadow-lg border-slate-700">
                <SelectItem 
                  value="skin"
                  className="hover:bg-slate-700 rounded-md active:bg-slate-700"
                >
                  Duplicados
                </SelectItem>
                <SelectItem 
                  value="newest"
                  className="hover:bg-slate-700 rounded-md active:bg-slate-700"
                >
                  Más Recientes
                </SelectItem>
                <SelectItem 
                  value="oldest"
                  className="hover:bg-slate-700 rounded-md active:bg-slate-700"
                >
                  Más Antiguas
                </SelectItem>
              </SelectContent>
            </Select>
          {/* Filtro de rareza */}
            {allSupabaseTiers && (
              <Select value={filterTier} onValueChange={setFilterTier}>
                <SelectTrigger className="w-full sm:w-48 bg-slate-800 border-2 border-slate-700 text-white rounded-xl hover:border-slate-600 focus:ring-1 focus:ring-primary focus:border-primary transition-colors duration-150 text-sm sm:text-base">
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
            <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-t-2 border-b-2 border-primary" />
          </div>
        ) : filteredInventory.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-400 text-base sm:text-lg">
              {userInventory.length === 0 ? "No hay skins en tu inventario" : "No se encontraron skins"}
              </p>
            </div>
          ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
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
                 <button
                   key={skin.id}
                   onClick={() => toggleSelectSkin(skin)}
                   disabled={!canBeSelected}
                   aria-label={`${isSelected ? 'Deseleccionar' : 'Seleccionar'} ${skin.nombre} - ${skin.content_tier?.nombre || 'Sin tier'}`}
                   type="button"
                   className={`group relative flex flex-col aspect-[3/4] overflow-hidden rounded-xl border bg-gradient-to-b from-gray-900 to-black transition-all duration-150 cursor-pointer
                     ${isSelected 
                       ? 'border-primary shadow-lg shadow-primary/40 grayscale scale-95' 
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
                    {skin.content_tier?.uuid_api && skin.content_tier.uuid_api !== 'default' && (
                        <Image
                        src={`/skins-bg/${skin.content_tier.uuid_api}.png`}
                        alt={`Fondo para ${skin.content_tier.nombre}`}
                        layout="fill"
                        objectFit="contain" // O "cover" si prefieres que llene y recorte
                        className="absolute inset-0 z-0 p-2 sm:p-3 md:p-4 opacity-60 transform scale-125 rotate-12"
                        priority={index < 10}
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          console.warn(`No se encontró la imagen de fondo para el tier: /skins-bg/${skin.content_tier?.uuid_api}.png`);
                        }}
                      />
                    )}

                  {/* Imagen de la skin */}
                  <Image
                    src={skin.imagen_url || '/images/placeholder_icon.webp'}
                          alt={skin.nombre}
                          fill
                    sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, (max-width: 1280px) 20vw, 16vw"
                    className="object-contain p-2 sm:p-3 md:p-4 group-hover:scale-105 transition-transform duration-300 z-10"
                    style={imageTransformStyle}
                  />

                  {/* Información de la skin */}
                  <div className="absolute bottom-0 left-0 right-0 p-2 sm:p-3 md:p-4 bg-gradient-to-t from-black/80 to-transparent z-10">
                    <h3 className="font-semibold text-primary text-xs sm:text-sm leading-tight" title={skin.nombre}>{skin.nombre}</h3>
                    {skin.content_tier?.nombre && (
                      <p className="text-[10px] sm:text-xs text-slate-300 truncate" title={skin.content_tier.nombre}>
                        {skin.content_tier.nombre}
                      </p>
                      )}
                    </div>

                  {/* Indicador de selección */}
                  <div className={`absolute top-1.5 sm:top-2 left-1.5 sm:left-2 w-4 h-4 sm:w-5 sm:h-5 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-primary border-white' : 'bg-slate-700/80 border-slate-600 hover:bg-slate-600/80'}`}>
                    {isSelected && <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-white rounded-full"></div>}
                    </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de Ruleta */}
      <AnimatePresence>
        {showRouletteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4"
            onClick={(e) => {
              if (!isSpinning && rouletteResult === null) {
                setShowRouletteModal(false);
              }
            }}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: -20 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="p-6 sm:p-8 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header del modal */}
              <div className="text-center mb-4 sm:mb-6">
                <motion.h3
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.4 }}
                  className="font-bold inline-block mt-6 sm:mt-10 text-2xl sm:text-3xl font-bold text-foreground font-[Raleway] font-semibold 
                             italic tracking-widest [text-shadow:_0px_0px_20px_rgba(255,255,255,0.35)] 
                             bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent"
                >
                  · MEJORAR ·
                </motion.h3>
              </div>

              {/* Ruleta Visual */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.5, ease: "easeOut" }}
                className="mb-4 sm:mb-6"
              >
                {selectedSkins.length < 5 ? (
                  // Nueva ruleta circular para menos de 5 skins
                  <CircularRoulette
                    successPercentage={successPercentage}
                    isSpinning={isSpinning}
                    onSpinComplete={(success) => {
                      setRouletteResult(success ? 'win' : 'lose');
                      setIsSpinning(false);

                      if (success) {
                        // Si gana, hacer la mejora con recompensa
                        setTimeout(async () => {
                          setShowRouletteModal(false);
                          await handleRouletteWin();
                        }, 2000);
                      } else {
                        // Si pierde, solo eliminar las skins
                        setTimeout(async () => {
                          await handleRouletteLose();
                        }, 2000);
                      }
                    }}
                  />
                ) : (
                  // Ruleta original para 5 skins (no debería mostrarse, pero por seguridad)
                  <div className="relative w-full h-32 sm:h-40 bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl overflow-hidden border border-slate-600 flex items-center justify-center">
                    {/* Barra de porcentaje */}
                    <div className="w-4/5 h-6 sm:h-8 bg-gray-700 rounded-full overflow-hidden relative">
                      <motion.div
                        className="h-full bg-gradient-to-r from-red-500 to-green-500 rounded-full relative"
                        style={{ width: `${successPercentage}%` }}
                        animate={isSpinning ? { 
                          x: ['-100%', '200%', '-100%'],
                          transition: { 
                            duration: 2,
                            repeat: Infinity,
                            ease: "linear"
                          }
                        } : {}}
                      />
                      {/* Indicador central */}
                      <div className="absolute top-0 left-1/2 w-1 h-full bg-white shadow-lg transform -translate-x-1/2" />
                      
                      {/* Texto del porcentaje */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-white font-bold text-sm sm:text-lg">{successPercentage}%</span>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>

              {/* Botones */}
              {!isSpinning && rouletteResult === null && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7, duration: 0.4 }}
                  className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4"
                >
                  <Button
                    onClick={() => setShowRouletteModal(false)}
                    variant="outline"
                    className="rounded-xl border-slate-600 hover:bg-slate-700 text-slate-300 px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base order-2 sm:order-1"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleRouletteConfirm}
                    className="rounded-xl bg-gradient-to-r from-red-500/20 to-red-600/20 text-white shadow-lg shadow-red-900/20 border border-red-500/20 hover:bg-gradient-to-r hover:from-red-500/30 hover:to-red-600/30 active:scale-95 transition-all duration-200 px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base order-1 sm:order-2"
                  >
                    {selectedSkins.length < 5 ? 'Girar Ruleta' : 'Confirmar Mejora'}
                  </Button>
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
                setIsNewSkin(false);
              }}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="p-6 sm:p-8 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header del modal */}
              <div className="text-center mb-4 sm:mb-6">
                <motion.h3
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.4 }}
                  className="font-bold inline-block text-2xl sm:text-3xl font-bold text-foreground font-[Raleway] font-semibold 
                             italic tracking-widest [text-shadow:_0px_0px_20px_rgba(255,255,255,0.35)] 
                             bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent"
                >
                  · SKIN MEJORADA ·
                </motion.h3>
                
                {/* Tag de NUEVA debajo de SKIN MEJORADA */}
                {isNewSkin && (
                  <motion.div
                    initial={{ scale: 1, opacity: 0, x: 0, y: 0 }}
                    animate={{ scale: 1, opacity: 1, x: 0, y: 0 }}
                    transition={{ delay: 0.4, duration: 0.4, type: "spring", stiffness: 300 }}
                    className="inline-block mt-3 sm:mt-4 px-3 py-1 rounded-xl text-sm font-bold 
                               bg-gradient-to-r from-red-500/20 to-red-600/20 text-white shadow-lg 
                               shadow-red-900/20 border border-red-500/20 backdrop-blur-sm
                               active:scale-95 transition-all duration-200"
                  >
                    ✨ NUEVA
                  </motion.div>
                )}
              </div>
              
              {/* Skin premiada */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.5, ease: "easeOut" }}
                className="relative w-full h-48 sm:h-56 md:h-64 overflow-hidden mb-4 sm:mb-6"
              >
                {/* Imagen de la skin */}
                <div className="relative w-full h-full flex items-center justify-center p-3 sm:p-4">
                    <Image 
                      src={`/skins-bg/${rewardSkin.contentTierUuid}.png`}
                      alt={`Fondo para ${rewardSkin.contentTierUuid}`}
                      layout="fill"
                      objectFit="contain"
                      className="absolute inset-0 z-0 p-3 sm:p-4 opacity-80 transform scale-125 rotate-12"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        console.warn(`No se encontró la imagen de fondo para el tier: /skins-bg/${rewardSkin.contentTierUuid}.png`); // Usar skin.contentTier.id
                      }}
                    />
                  {getBestDisplayIcon(rewardSkin) && (() => {
                    // Determinar el tipo de arma y obtener los estilos específicos
                    const weaponType = getWeaponType(rewardSkin.displayName);
                    const weaponStyles = getWeaponSpecificStyles(weaponType);
                    // Crear el estilo inline para las transformaciones
                    const imageTransformStyle: React.CSSProperties = {
                      transform: `scale(${weaponStyles.baseScale})${weaponStyles.hasRotation ? ' rotate(12deg)' : ''}`,
                    };
                    
                    return (
                      <Image
                        src={getBestDisplayIcon(rewardSkin) || ''}
                        alt={rewardSkin.displayName}
                        fill
                        className="object-contain p-3 sm:p-4 group-hover:scale-105 transition-transform duration-300 z-10"
                        style={imageTransformStyle}
                        priority={true}
                      />
                    );
                  })()}
                </div>

              
              </motion.div>

              {/* Información de la skin */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.4 }}
                className="text-center mb-4 sm:mb-6"
              >
                <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-white mb-2 leading-tight">
                  {rewardSkin.displayName}
                </h3>
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
                    setIsNewSkin(false);
                  }}
                  className="rounded-xl bg-gradient-to-r from-red-500/20 to-red-600/20 text-white shadow-lg shadow-red-900/20 border border-red-500/20 hover:bg-gradient-to-r hover:from-red-500/30 hover:to-red-600/30 active:scale-95 transition-all duration-200 px-6 sm:px-8 py-2 sm:py-3 text-sm sm:text-base"
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
