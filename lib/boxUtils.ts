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
 * Añade una skin al inventario del usuario o actualiza su cantidad si ya existe.
 * @param userId ID del usuario
 * @param skinFromApi Objeto de la skin tal como viene de la API (debe contener uuid y displayName)
 * @param supabase Cliente de Supabase
 * @returns Un objeto con {success: boolean, error?: any, operationType: 'added' | 'updated' | 'error'}
 */
export async function addSkinToInventory(
  userId: string,
  skinFromApi: { uuid: string; displayName: string; contentTierUuid?: string },
  supabase: SupabaseClient,
): Promise<{ success: boolean; error?: any; operationType: "added" | "updated" | "error" }> {
  try {
    // Verificar si la skin (basada en skinFromApi.uuid) ya existe en el inventario del usuario
    const { data: existingInventoryItem, error: fetchError } = await supabase
      .from("inventario_usuario")
      .select("id, cantidad") // Seleccionar id y cantidad actual
      .eq("usuario_id", userId)
      .eq("skin_id", skinFromApi.uuid) // skin_id en la DB es el UUID de la API
      .maybeSingle();

    if (fetchError) {
      console.error("Error al verificar el inventario:", fetchError);
      return { success: false, error: fetchError, operationType: "error" };
    }

    if (existingInventoryItem) {
      // La skin ya existe, actualizar cantidad
      const newQuantity = (existingInventoryItem.cantidad || 0) + 1;
      const { error: updateError } = await supabase
        .from("inventario_usuario")
        .update({ cantidad: newQuantity, fecha_obtencion: new Date().toISOString() })
        .eq("id", existingInventoryItem.id);

      if (updateError) {
        console.error("Error al actualizar la cantidad en el inventario:", updateError);
        return { success: false, error: updateError, operationType: "error" };
      }
      console.log(
        `Cantidad de skin '${skinFromApi.displayName}' actualizada a ${newQuantity} para el usuario ${userId}`,
      );
      return { success: true, operationType: "updated" };
    } else {
      // La skin no existe, añadirla con cantidad 1
      const { error: insertError } = await supabase
        .from("inventario_usuario")
        .insert({
          usuario_id: userId,
          skin_id: skinFromApi.uuid,
          skin_nombre: skinFromApi.displayName,
          fecha_obtencion: new Date().toISOString(),
          cantidad: 1,
          // metodo_adquisicion puede ser añadido aquí si se pasa
        });

      if (insertError) {
        console.error("Error al guardar nueva skin en el inventario:", insertError);
        return { success: false, error: insertError, operationType: "error" };
      }
      console.log(
        `Skin '${skinFromApi.displayName}' añadida al inventario del usuario ${userId} con cantidad 1`,
      );
      return { success: true, operationType: "added" };
    }
  } catch (error) {
    console.error("Error general en addSkinToInventory:", error);
    return { success: false, error, operationType: "error" };
  }
}

/**
 * Selecciona una skin aleatoria basada en las probabilidades de los tiers
 * @param skins Array de skins disponibles
 * @param probabilidades Array de probabilidades por tier
 * @returns La skin seleccionada aleatoriamente
 */
export function selectRandomSkinByProbability(
  skins: Skin[],
  probabilidades: TierProbabilidad[],
): Skin | null {
  if (!skins.length || !probabilidades.length) {
    return null;
  }

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
    const tierSkins = skins.filter(
      (skin) => skin.content_tier_id === selectedTier,
    );

    // Si no hay skins en el tier seleccionado, usar cualquier skin
    const availableSkins = tierSkins.length > 0 ? tierSkins : skins;

    // Seleccionar una skin aleatoria del tier
    const randomIndex = Math.floor(Math.random() * availableSkins.length);

    return availableSkins[randomIndex] || null;
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
  inventoryOperationType: "added" | "updated" | "error";
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

    // Añadir al inventario o actualizar cantidad
    // La variable inventorySuccess ya no existe, usamos operationType para determinar éxito
    const { operationType, error: inventoryError } =
      await addSkinToInventory(userId, skinApiRepresentation, supabase);

    return {
      selectedSkin: selectedSkinFromPool,
      transactionSuccess,
      inventoryOperationType: operationType, // operationType puede ser 'added', 'updated', o 'error'
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
 * @returns Objeto con nombre y color del tier
 */
export async function getTierData(
  supabase: SupabaseClient,
  tierApiUuid: string | null,
): Promise<{ nombre: string; color: string } | null> {
  if (!tierApiUuid) return null;

  try {
    const { data, error } = await supabase
      .from("content_tiers")
      .select("nombre, color")
      .eq("uuid_api", tierApiUuid)
      .maybeSingle();

    if (error) {
      console.warn("Error al obtener datos del tier por uuid_api:", error);
      return null;
    }
    
    if (data) {
      return { nombre: data.nombre, color: data.color };
    }
    console.warn(`No se encontraron datos del tier para uuid_api: ${tierApiUuid}`);
    return null;

  } catch (error) {
    console.error("Excepción al obtener datos del tier:", error);
    return null;
  }
}
