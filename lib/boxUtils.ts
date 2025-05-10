// lib/boxUtils.ts
import { SupabaseClient } from '@supabase/supabase-js';

// Tipos comunes
export type ContentTier = {
  id: string;
  nombre: string;
  descripcion?: string;
  color: string;
  uuid: string;
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
  supabase: SupabaseClient
): Promise<{success: boolean, error?: any}> {
  try {
    const { error } = await supabase
      .from('transacciones')
      .insert({
        usuario_id: userId,
        caja_id: cajaId,
        skin_id: skinId,
        fecha: new Date().toISOString()
      });
      
    if (error) {
      console.error('Error al registrar la transacción:', error);
      return { success: false, error };
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error al registrar la transacción:', error);
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
  supabase: SupabaseClient
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('inventario_usuario')
      .select('*')
      .eq('usuario_id', userId)
      .eq('skin_id', skinId)
      .maybeSingle();
      
    if (error) {
      console.error('Error al verificar el inventario:', error);
      return false;
    }
    
    return !!data; // Retorna true si data existe, false si es null
  } catch (error) {
    console.error('Error al verificar el inventario:', error);
    return false;
  }
}

/**
 * Añade una skin al inventario del usuario
 * @param userId ID del usuario
 * @param skin Objeto de la skin
 * @param supabase Cliente de Supabase
 * @returns Un objeto con {success: boolean, error?: any, alreadyExists?: boolean}
 */
export async function addSkinToInventory(
  userId: string, 
  skin: Skin, 
  supabase: SupabaseClient
): Promise<{success: boolean, error?: any, alreadyExists?: boolean}> {
  try {
    // Primero verificar si ya existe
    const exists = await isSkinInInventory(userId, skin.id, supabase);
    
    if (exists) {
      console.log(`La skin '${skin.nombre}' ya está en el inventario del usuario ${userId}`);
      return { success: true, alreadyExists: true };
    }
    
    // Si no existe, añadirla
    const { error } = await supabase
      .from('inventario_usuario')
      .insert({
        usuario_id: userId,
        skin_id: skin.id,
        skin_nombre: skin.nombre,
        fecha_obtencion: new Date().toISOString()
      });
      
    if (error) {
      console.error('Error al guardar en el inventario:', error);
      return { success: false, error };
    }
    
    console.log(`Skin '${skin.nombre}' añadida al inventario del usuario ${userId}`);
    return { success: true };
  } catch (error) {
    console.error('Error al guardar en el inventario:', error);
    return { success: false, error };
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
  probabilidades: TierProbabilidad[]
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
    const tierSkins = skins.filter(skin => skin.content_tier_id === selectedTier);
    
    // Si no hay skins en el tier seleccionado, usar cualquier skin
    const availableSkins = tierSkins.length > 0 ? tierSkins : skins;
    
    // Seleccionar una skin aleatoria del tier
    const randomIndex = Math.floor(Math.random() * availableSkins.length);
    return availableSkins[randomIndex] || null;
  } catch (error) {
    console.error('Error al seleccionar skin aleatoria:', error);
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
  supabase: SupabaseClient
): Promise<{
  selectedSkin: Skin | null,
  transactionSuccess: boolean,
  inventorySuccess: boolean,
  alreadyInInventory: boolean,
  error?: any
}> {
  try {
    // Seleccionar skin aleatoria según probabilidades
    const selectedSkin = selectRandomSkinByProbability(skins, probabilidades);
    
    if (!selectedSkin) {
      return {
        selectedSkin: null,
        transactionSuccess: false,
        inventorySuccess: false,
        alreadyInInventory: false,
        error: 'No se pudo seleccionar una skin'
      };
    }
    
    // Registrar la transacción
    const { success: transactionSuccess, error: transactionError } = 
      await recordTransaction(userId, cajaId, selectedSkin.id, supabase);
    
    // Añadir al inventario
    const { success: inventorySuccess, alreadyExists, error: inventoryError } = 
      await addSkinToInventory(userId, selectedSkin, supabase);
    
    return {
      selectedSkin,
      transactionSuccess,
      inventorySuccess,
      alreadyInInventory: !!alreadyExists,
      error: transactionError || inventoryError
    };
  } catch (error) {
    console.error('Error al procesar la apertura de la caja:', error);
    return {
      selectedSkin: null,
      transactionSuccess: false,
      inventorySuccess: false,
      alreadyInInventory: false,
      error
    };
  }
}

/**
 * Obtiene los datos de tier para una skin desde la base de datos
 * @param supabase Cliente de Supabase
 * @param tierUuid UUID del tier
 * @returns Objeto con nombre y color del tier
 */
export async function getTierData(
  supabase: SupabaseClient, 
  tierUuid: string | null
): Promise<{nombre: string, color: string}> {
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
    console.warn('Error al obtener datos del tier:', error);
  }
  
  // Valores por defecto si no se encuentra en la base de datos
  return { nombre: 'Select Edition', color: '#5a9fe2' };
}
