// lib/boxUtils.ts
import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Extrae el tipo de caja a partir del nombre de la caja de manera consistente
 * @param nombre Nombre de la caja
 * @param esDiaria Indica si la caja es diaria
 * @returns El tipo de caja normalizado para usar en URLs
 */
export function extraerTipoCaja(nombre: string, esDiaria?: boolean): string {
  // Si es la caja diaria, siempre devolver 'diaria'
  if (esDiaria) {
    return "diaria";
  }

  // Para otras cajas, procesar el nombre
  let tipoCaja = "";

  // Extraer el nombre después de "Caja " si existe
  if (nombre.toLowerCase().startsWith("caja ")) {
    tipoCaja = nombre.substring(5).toLowerCase();
  } else {
    tipoCaja = nombre.toLowerCase();
  }

  // Normalizar caracteres especiales
  tipoCaja = tipoCaja
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Eliminar acentos
    .replace(/[^a-z0-9\s-]/g, "") // Solo permitir letras, números, espacios y guiones
    .trim();

  // Convertir espacios a guiones y eliminar guiones duplicados
  return tipoCaja.replace(/\s+/g, "-").replace(/-+/g, "-");
}

// Tipos comunes
export type ContentTier = {
  id: string;
  nombre: string;
  color: string;
  uuid_api: string;
  grado?: number;
};

export type Skin = {
  id: string;
  nombre: string;
  bundleName?: string;
  content_tier_id: string;
  uuid: string;
  imagen_url: string;
  content_tier?: ContentTier;
};

export type TierProbabilidad = {
  id: string;
  caja_id: string;
  content_tier_id: string;
  probabilidad: number;
  cantidad_skins: number;
  content_tier?: ContentTier;
};

/**
 * Registra una transacción cuando un usuario abre una caja
 * @param userId ID del usuario
 * @param cajaId ID de la caja
 * @param skinId ID de la skin obtenida
 * @param supabase Cliente de Supabase
 * @returns Un objeto con {success: boolean, error?: any}
 */
export async function recordTransaction(
  userId: string,
  cajaId: string,
  skinId: string,
  supabase: SupabaseClient,
): Promise<{ success: boolean; error?: any }> {
  try {
    const { error } = await supabase.from("transacciones").insert({
      usuario_id: userId,
      caja_id: cajaId,
      skin_id: skinId,
      fecha: new Date().toISOString(),
    });

    if (error) {
      console.error("Error al registrar la transacción:", error);

      return { success: false, error };
    }

    return { success: true };
  } catch (error) {
    console.error("Error al registrar la transacción:", error);

    return { success: false, error };
  }
}

/**
 * Verifica si una skin ya existe en el inventario del usuario
 * @param userId ID del usuario
 * @param skinId ID de la skin
 * @param supabase Cliente de Supabase
 * @returns true si la skin ya está en el inventario, false si no
 */
export async function isSkinInInventory(
  userId: string,
  skinId: string,
  supabase: SupabaseClient,
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from("inventario_usuario")
      .select("*")
      .eq("usuario_id", userId)
      .eq("skin_id", skinId)
      .maybeSingle();

    if (error) {
      console.error("Error al verificar el inventario:", error);

      return false;
    }

    return !!data; // Retorna true si data existe, false si es null
  } catch (error) {
    console.error("Error al verificar el inventario:", error);

    return false;
  }
}

/**
 * Añade una skin al inventario del usuario como una nueva fila.
 * @param userId ID del usuario
 * @param skinFromApi Objeto de la skin tal como viene de la API (debe contener uuid y displayName)
 * @param supabase Cliente de Supabase
 * @returns Un objeto con {success: boolean, error?: any, operationType: 'added' | 'error'}
 */
export async function addSkinToInventory(
  userId: string,
  skinFromApi: { uuid: string; displayName: string; contentTierUuid?: string },
  supabase: SupabaseClient,
): Promise<{ success: boolean; error?: any; operationType: "added" | "error" }> {
  try {
    // Siempre insertar una nueva fila para cada skin obtenida
    const { error: insertError } = await supabase
      .from("inventario_usuario")
      .insert({
        usuario_id: userId,
        skin_id: skinFromApi.uuid,
        skin_nombre: skinFromApi.displayName,
        fecha_obtencion: new Date().toISOString(),
        // metodo_adquisicion puede ser añadido aquí si se pasa
      });

    if (insertError) {
      console.error("Error al guardar nueva skin en el inventario:", insertError);
      return { success: false, error: insertError, operationType: "error" };
    }
    
    console.log(
      `Skin '${skinFromApi.displayName}' añadida al inventario del usuario ${userId}`,
    );
    return { success: true, operationType: "added" };
  } catch (error) {
    console.error("Error general en addSkinToInventory:", error);
    return { success: false, error, operationType: "error" };
  }
}

/**
 * Selecciona una skin aleatoria basada en las probabilidades individuales de cada skin
 * @param skins Array de skins disponibles
 * @param probabilidades Array de probabilidades por tier
 * @param showLogs Si mostrar logs detallados (por defecto false)
 * @returns La skin seleccionada aleatoriamente
 */
export function selectRandomSkinByProbability(
  skins: Skin[],
  probabilidades: TierProbabilidad[],
  showLogs: boolean = false,
): Skin | null {
  if (!skins.length || !probabilidades.length) {
    return null;
  }

  try {
    // Crear un array con cada skin y su probabilidad individual
    const skinProbabilities: { skin: Skin; probability: number; tierName: string }[] = [];

    // Para cada tier, calcular la probabilidad individual de cada skin
    for (const tierProb of probabilidades) {
      // Encontrar todas las skins de este tier usando uuid_api
      const skinsInTier = skins.filter(skin => 
        skin.content_tier_id === tierProb.content_tier?.uuid_api
      );
      
      if (skinsInTier.length > 0) {
        // Dividir la probabilidad del tier entre todas las skins de ese tier
        const individualProbability = tierProb.probabilidad / skinsInTier.length;
        
        // Agregar cada skin con su probabilidad individual
        for (const skin of skinsInTier) {
          skinProbabilities.push({
            skin,
            probability: individualProbability,
            tierName: tierProb.content_tier?.nombre || 'Unknown'
          });
        }
      }
    }

    if (skinProbabilities.length === 0) {
      return null;
    }

    // Calcular la suma total para normalización
    const totalProbability = skinProbabilities.reduce((sum, item) => sum + item.probability, 0);

    // Generar número aleatorio
    const randomNum = Math.random();
    let accumulatedProbability = 0;

    // Seleccionar skin basada en probabilidades individuales
    for (const item of skinProbabilities) {
      const normalizedProbability = item.probability / totalProbability;
      accumulatedProbability += normalizedProbability;
      
      if (randomNum <= accumulatedProbability) {
        return item.skin;
      }
    }

    // Fallback: devolver la última skin si algo salió mal
    return skinProbabilities[skinProbabilities.length - 1]?.skin || null;
  } catch (error) {
    console.error("Error al seleccionar skin aleatoria:", error);
    return null;
  }
}

/**
 * Procesa la apertura completa de una caja
 * @param userId ID del usuario
 * @param cajaId ID de la caja
 * @param skins Array de skins disponibles
 * @param probabilidades Array de probabilidades por tier
 * @param supabase Cliente de Supabase
 * @returns Un objeto con la skin seleccionada y el resultado de la operación
 */
export async function processBoxOpening(
  userId: string,
  cajaId: string,
  skins: Skin[],
  probabilidades: TierProbabilidad[],
  supabase: SupabaseClient,
): Promise<{
  selectedSkin: Skin | null;
  transactionSuccess: boolean;
  inventoryOperationType: "added" | "error";
  error?: any;
}> {
  try {
    // Seleccionar skin aleatoria según probabilidades
    const selectedSkinFromPool = selectRandomSkinByProbability(skins, probabilidades);

    if (!selectedSkinFromPool) {
      return {
        selectedSkin: null,
        transactionSuccess: false,
        inventoryOperationType: "error",
        error: "No se pudo seleccionar una skin del pool",
      };
    }

    // Asumimos que selectedSkinFromPool.id es el API UUID de la skin
    // y selectedSkinFromPool.nombre es el displayName.
    const skinApiRepresentation = {
        uuid: selectedSkinFromPool.id, 
        displayName: selectedSkinFromPool.nombre,
        contentTierUuid: selectedSkinFromPool.content_tier?.uuid_api
    };

    // Registrar la transacción (usa selectedSkinFromPool.id, que es el API UUID)
    const { success: transactionSuccess, error: transactionError } =
      await recordTransaction(userId, cajaId, selectedSkinFromPool.id, supabase);

    // Añadir al inventario (siempre una nueva fila)
    const { operationType, error: inventoryError } =
      await addSkinToInventory(userId, skinApiRepresentation, supabase);

    return {
      selectedSkin: selectedSkinFromPool,
      transactionSuccess,
      inventoryOperationType: operationType,
      error: transactionError || inventoryError,
    };
  } catch (error) {
    console.error("Error al procesar la apertura de la caja:", error);
    return {
      selectedSkin: null,
      transactionSuccess: false,
      inventoryOperationType: "error",
      error,
    };
  }
}

/**
 * Obtiene los datos de tier para una skin desde la base de datos
 * @param supabase Cliente de Supabase
 * @param tierApiUuid UUID del tier
 * @returns Objeto con nombre, color y grado del tier
 */
export async function getTierData(
  supabase: SupabaseClient,
  tierApiUuid: string | null,
): Promise<{ nombre: string; color: string; grado?: number } | null> {
  if (!tierApiUuid) return null;

  try {
    const { data, error } = await supabase
      .from("content_tiers")
      .select("nombre, color, grado")
      .eq("uuid_api", tierApiUuid)
      .maybeSingle();

    if (error) {
      console.warn("Error al obtener datos del tier por uuid_api:", error);
      return null;
    }
    
    if (data) {
      return { 
        nombre: data.nombre, 
        color: data.color,
        grado: data.grado
      };
    }
    console.warn(`No se encontraron datos del tier para uuid_api: ${tierApiUuid}`);
    return null;

  } catch (error) {
    console.error("Excepción al obtener datos del tier:", error);
    return null;
  }
}
