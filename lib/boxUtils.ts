// lib/boxUtils.ts
import { SupabaseClient } from "@supabase/supabase-js";
import { logCajaAbierta, type CajaAbiertaLog } from "./logUtils";

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
  isNewSkin?: boolean; // Indica si es una skin nueva para el usuario
};

export type TierProbabilidad = {
  id: string;
  caja_id: string;
  content_tier_id: string;
  probabilidad: number;
  cantidad_skins: number;
  content_tier?: ContentTier;
};

// Cache para probabilidades pre-calculadas
const probabilityCache = new Map<string, { skin: Skin; probability: number; tierName: string }[]>();
const CACHE_EXPIRY = 60000; // 1 minuto
const cacheTimestamps = new Map<string, number>();

/**
 * Pre-calcula las probabilidades para un conjunto de skins y tiers
 * @param skins Array de skins disponibles
 * @param probabilidades Array de probabilidades por tier
 * @returns Array de objetos con skin y probabilidad individual
 */
function precalculateProbabilities(
  skins: Skin[],
  probabilidades: TierProbabilidad[]
): { skin: Skin; probability: number; tierName: string }[] {
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

  return skinProbabilities;
}

/**
 * Selecciona una skin aleatoria basada en probabilidades con caché optimizado
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
    // Crear clave de caché basada en los IDs de skins y tiers
    const cacheKey = `${skins.map(s => s.id).sort().join(',')}|${probabilidades.map(p => p.id).sort().join(',')}`;
    const now = Date.now();
    
    // Verificar si tenemos datos en caché y si no han expirado
    let skinProbabilities = probabilityCache.get(cacheKey);
    const cacheTime = cacheTimestamps.get(cacheKey);
    
    if (!skinProbabilities || !cacheTime || (now - cacheTime) > CACHE_EXPIRY) {
      // Pre-calcular y cachear las probabilidades
      skinProbabilities = precalculateProbabilities(skins, probabilidades);
      probabilityCache.set(cacheKey, skinProbabilities);
      cacheTimestamps.set(cacheKey, now);
    }

    if (skinProbabilities.length === 0) {
      return null;
    }

    // Calcular la suma total para normalización (solo una vez)
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
 * Optimización para generar múltiples skins aleatorias de una vez
 * @param skins Array de skins disponibles
 * @param probabilidades Array de probabilidades por tier
 * @param count Número de skins a generar
 * @returns Array de skins seleccionadas
 */
export function selectMultipleRandomSkins(
  skins: Skin[],
  probabilidades: TierProbabilidad[],
  count: number
): Skin[] {
  if (!skins.length || !probabilidades.length || count <= 0) {
    return [];
  }

  const results: Skin[] = [];
  
  // Pre-calcular las probabilidades una sola vez
  const cacheKey = `${skins.map(s => s.id).sort().join(',')}|${probabilidades.map(p => p.id).sort().join(',')}`;
  let skinProbabilities = probabilityCache.get(cacheKey);
  
  if (!skinProbabilities) {
    skinProbabilities = precalculateProbabilities(skins, probabilidades);
    probabilityCache.set(cacheKey, skinProbabilities);
    cacheTimestamps.set(cacheKey, Date.now());
  }

  if (skinProbabilities.length === 0) {
    return [];
  }

  const totalProbability = skinProbabilities.reduce((sum, item) => sum + item.probability, 0);

  // Generar múltiples selecciones de una vez
  for (let i = 0; i < count; i++) {
    const randomNum = Math.random();
    let accumulatedProbability = 0;

    for (const item of skinProbabilities) {
      const normalizedProbability = item.probability / totalProbability;
      accumulatedProbability += normalizedProbability;
      
      if (randomNum <= accumulatedProbability) {
        // NO modificar el ID aquí, mantener el original
        results.push({ ...item.skin });
        break;
      }
    }
  }

  return results;
}

/**
 * Versión especial para generar items del spinner con IDs únicos
 * @param skins Array de skins disponibles
 * @param probabilidades Array de probabilidades por tier
 * @param count Número de skins a generar
 * @param idPrefix Prefijo para los IDs únicos
 * @returns Array de skins con IDs únicos para el spinner
 */
export function selectMultipleRandomSkinsForSpinner(
  skins: Skin[],
  probabilidades: TierProbabilidad[],
  count: number,
  idPrefix: string = 'spin'
): Skin[] {
  if (!skins.length || !probabilidades.length || count <= 0) {
    return [];
  }

  const results: Skin[] = [];
  
  // Pre-calcular las probabilidades una sola vez
  const cacheKey = `${skins.map(s => s.id).sort().join(',')}|${probabilidades.map(p => p.id).sort().join(',')}`;
  let skinProbabilities = probabilityCache.get(cacheKey);
  
  if (!skinProbabilities) {
    skinProbabilities = precalculateProbabilities(skins, probabilidades);
    probabilityCache.set(cacheKey, skinProbabilities);
    cacheTimestamps.set(cacheKey, Date.now());
  }

  if (skinProbabilities.length === 0) {
    return [];
  }

  const totalProbability = skinProbabilities.reduce((sum, item) => sum + item.probability, 0);

  // Generar múltiples selecciones de una vez
  for (let i = 0; i < count; i++) {
    const randomNum = Math.random();
    let accumulatedProbability = 0;

    for (const item of skinProbabilities) {
      const normalizedProbability = item.probability / totalProbability;
      accumulatedProbability += normalizedProbability;
      
      if (randomNum <= accumulatedProbability) {
        // SÍ modificar el ID aquí para el spinner
        results.push({ ...item.skin, id: `${idPrefix}-${item.skin.id}-${i}` });
        break;
      }
    }
  }

  return results;
}

/**
 * Añade una skin al inventario del usuario como una nueva fila.
 * @param userId ID del usuario
 * @param skinFromApi Objeto de la skin tal como viene de la API (debe contener uuid y displayName)
 * @param metodoAdquisicion Método de adquisición (por defecto 'caja_abierta')
 * @param supabase Cliente de Supabase
 * @returns Un objeto con {success: boolean, error?: any, operationType: 'added' | 'error'}
 */
export async function addSkinToInventory(
  userId: string,
  skinFromApi: { uuid: string; displayName: string; contentTierUuid?: string },
  supabase: SupabaseClient,
): Promise<{ success: boolean; error?: any; operationType: "added" | "error" }> {
  try {
    // Verificar si el userId es válido
    if (!userId || userId.trim() === '') {
      console.error("Error: userId inválido o vacío");
      return { success: false, error: "Usuario ID inválido", operationType: "error" };
    }

    // Verificar si el usuario existe en la base de datos
    const { data: userData, error: userCheckError } = await supabase
      .from("usuarios")
      .select("id, nombre_usuario, correo")
      .eq("id", userId)
      .single();

    if (userCheckError || !userData) {
      console.error("Error: Usuario no encontrado en la base de datos:", {
        userId,
        error: userCheckError
      });
      return { success: false, error: "Usuario no encontrado en la base de datos", operationType: "error" };
    }

    // Siempre insertar una nueva fila para cada skin obtenida
    const { error: insertError } = await supabase
      .from("inventario_usuario")
      .insert({
        usuario_id: userId,
        skin_id: skinFromApi.uuid,
        skin_nombre: skinFromApi.displayName,
        fecha_obtencion: new Date().toISOString(),
      });

    if (insertError) {
      console.error("Error al guardar nueva skin en el inventario:", insertError);
      return { success: false, error: insertError, operationType: "error" };
    }
  
    return { success: true, operationType: "added" };
  } catch (error) {
    console.error("Error general en addSkinToInventory:", error);
    return { success: false, error, operationType: "error" };
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
  inventoryOperationType: "added" | "error";
  error?: any;
}> {
  try {
    // Seleccionar skin aleatoria según probabilidades
    const selectedSkinFromPool = selectRandomSkinByProbability(skins, probabilidades);

    if (!selectedSkinFromPool) {
      return {
        selectedSkin: null,
        inventoryOperationType: "error",
        error: "No se pudo seleccionar una skin del pool",
      };
    }

    // Verificar si el usuario ya tiene esta skin antes de añadirla
    const { data: existingSkins, error: checkError } = await supabase
      .from("inventario_usuario")
      .select("id")
      .eq("usuario_id", userId)
      .eq("skin_id", selectedSkinFromPool.id)
      .limit(1);

    if (checkError) {
      console.warn("Error al verificar si la skin es nueva:", checkError);
    }

    // Determinar si es una skin nueva (no tiene entradas previas en el inventario)
    const isNewSkin = !existingSkins || existingSkins.length === 0;

    // Asumimos que selectedSkinFromPool.id es el API UUID de la skin
    // y selectedSkinFromPool.nombre es el displayName.
    const skinApiRepresentation = {
        uuid: selectedSkinFromPool.id, 
        displayName: selectedSkinFromPool.nombre,
        contentTierUuid: selectedSkinFromPool.content_tier?.uuid_api
    };

    // Añadir al inventario (siempre una nueva fila)
    const { operationType, error: inventoryError } =
      await addSkinToInventory(userId, skinApiRepresentation, supabase);

    // Crear una copia de la skin con la información de si es nueva
    const selectedSkinWithNewFlag: Skin = {
      ...selectedSkinFromPool,
      isNewSkin: isNewSkin
    };

    return {
      selectedSkin: selectedSkinWithNewFlag,
      inventoryOperationType: operationType,
      error: inventoryError,
    };
  } catch (error) {
    console.error("Error al procesar la apertura de la caja:", error);
    return {
      selectedSkin: null,
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

/**
 * Procesa la apertura completa de una caja con logging
 * @param userId ID del usuario
 * @param cajaId ID de la caja
 * @param skins Array de skins disponibles
 * @param probabilidades Array de probabilidades por tier
 * @param supabase Cliente de Supabase
 * @param costoCaja Costo en VP de la caja
 * @param metodoPago Método de pago utilizado
 * @returns Un objeto con la skin seleccionada y el resultado de la operación
 */
export async function processBoxOpeningWithLog(
  userId: string,
  cajaId: string,
  skins: Skin[],
  probabilidades: TierProbabilidad[],
  supabase: SupabaseClient,
  costoCaja: number,
  metodoPago: string = 'vp',
): Promise<{
  selectedSkin: Skin | null;
  inventoryOperationType: "added" | "error";
  error?: any;
  saldoInsuficiente?: boolean;
}> {
  try {
    // 💰 VERIFICAR Y DESCONTAR SALDO SI LA CAJA TIENE COSTO
    if (costoCaja > 0) {
      // Obtener saldo actual del usuario
      const { data: usuario, error: saldoError } = await supabase
        .from("usuarios")
        .select("saldo")
        .eq("id", userId)
        .single();

      if (saldoError) {
        console.error("Error al obtener saldo del usuario:", saldoError);
        return {
          selectedSkin: null,
          inventoryOperationType: "error",
          error: "Error al verificar saldo del usuario"
        };
      }

      const saldoActual = usuario?.saldo || 0;
      
      // Verificar si tiene suficiente saldo
      if (saldoActual < costoCaja) {
        return {
          selectedSkin: null,
          inventoryOperationType: "error",
          error: "Saldo insuficiente",
          saldoInsuficiente: true
        };
      }

      // Descontar el costo de la caja
      const { error: updateSaldoError } = await supabase
        .from("usuarios")
        .update({ saldo: saldoActual - costoCaja })
        .eq("id", userId);

      if (updateSaldoError) {
        console.error("Error al actualizar saldo del usuario:", updateSaldoError);
        return {
          selectedSkin: null,
          inventoryOperationType: "error",
          error: "Error al procesar el pago"
        };
      }

      // 🎯 DISPARAR EVENTO PARA ACTUALIZAR SIDEBAR - VP (después de gastar VP)
      // Solo disparar si estamos en el navegador
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('saldoActualizado'));
      }
    }

    // Procesar apertura de caja normalmente
    const result = await processBoxOpening(userId, cajaId, skins, probabilidades, supabase);
    
    // Si fue exitoso, registrar el log
    if (result.selectedSkin && result.inventoryOperationType === "added") {
      const tierData = await getTierData(supabase, result.selectedSkin.content_tier?.uuid_api || null);
      
      const logData: CajaAbiertaLog = {
        usuario_id: userId,
        caja_id: cajaId,
        skins_conseguidas: [{
          skin_id: result.selectedSkin.id,
          skin_nombre: result.selectedSkin.nombre,
          tier_id: result.selectedSkin.content_tier?.uuid_api || 'unknown',
          tier_nombre: tierData?.nombre || 'Unknown',
          tier_color: tierData?.color || '#FFFFFF'
        }],
        costo: costoCaja,
        metodo_pago: metodoPago
      };
      
      // Registrar el log (no interrumpir el flujo si falla)
      const logResult = await logCajaAbierta(logData);
      if (!logResult.success) {
        console.warn('Error al registrar log de caja abierta:', logResult.error);
      }

      // 🎯 PROCESAR MISIONES AUTOMÁTICAMENTE
      try {
        // 1. Misión de apertura de caja individual
        const misionResponse = await fetch('/api/misiones/procesar-actividad', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tipoActividad: 'caja_abierta',
            cantidad: 1
          })
        });

        if (!misionResponse.ok) {
          console.warn('Error al procesar misión de caja abierta:', await misionResponse.text());
        } else {
          // 🎯 DISPARAR EVENTO PARA ACTUALIZAR SIDEBAR - MISIONES
          // Solo disparar si estamos en el navegador
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('misionesActualizadas'));
          }
        }
        
      } catch (missionError) {
        // No interrumpir el flujo si hay error en las misiones
        console.warn('Error al procesar misiones automáticamente:', missionError);
      }
    }
    
    return result;
  } catch (error) {
    console.error("Error al procesar la apertura de la caja con logging:", error);
    return {
      selectedSkin: null,
      inventoryOperationType: "error",
      error,
    };
  }
}

/**
 * Versión optimizada de procesamiento de apertura de cajas múltiples
 * @param userId ID del usuario
 * @param cajaId ID de la caja
 * @param skins Array de skins disponibles
 * @param probabilidades Array de probabilidades por tier
 * @param supabase Cliente de Supabase
 * @param costoCaja Costo en VP de la caja
 * @param numberOfBoxes Número de cajas a abrir
 * @returns Resultados de todas las cajas procesadas
 */
export async function processMultipleBoxOpeningOptimized(
  userId: string,
  cajaId: string,
  skins: Skin[],
  probabilidades: TierProbabilidad[],
  supabase: SupabaseClient,
  costoCaja: number,
  numberOfBoxes: number,
): Promise<{
  results: Skin[];
  success: boolean;
  error?: any;
  saldoInsuficiente?: boolean;
}> {
  try {
    const costoTotal = costoCaja * numberOfBoxes;

    // 💰 VERIFICAR Y DESCONTAR SALDO TOTAL DE UNA VEZ
    if (costoTotal > 0) {
      const { data: usuario, error: saldoError } = await supabase
        .from("usuarios")
        .select("saldo")
        .eq("id", userId)
        .single();

      if (saldoError) {
        return {
          results: [],
          success: false,
          error: "Error al verificar saldo del usuario"
        };
      }

      const saldoActual = usuario?.saldo || 0;
      
      if (saldoActual < costoTotal) {
        return {
          results: [],
          success: false,
          error: "Saldo insuficiente",
          saldoInsuficiente: true
        };
      }

      // Descontar el costo total de una vez
      const { error: updateSaldoError } = await supabase
        .from("usuarios")
        .update({ saldo: saldoActual - costoTotal })
        .eq("id", userId);

      if (updateSaldoError) {
        return {
          results: [],
          success: false,
          error: "Error al procesar el pago"
        };
      }

      // 🎯 DISPARAR EVENTO PARA ACTUALIZAR SIDEBAR - VP
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('saldoActualizado'));
      }
    }

    // 🎲 GENERAR TODAS LAS SKINS DE UNA VEZ USANDO LA FUNCIÓN OPTIMIZADA
    const selectedSkins = selectMultipleRandomSkins(skins, probabilidades, numberOfBoxes);
    
    if (selectedSkins.length !== numberOfBoxes) {
      return {
        results: [],
        success: false,
        error: "Error al seleccionar skins"
      };
    }

    // 📦 PREPARAR DATOS PARA INSERCIÓN MASIVA EN INVENTARIO
    const inventoryInserts = selectedSkins.map((skin, index) => ({
      usuario_id: userId,
      skin_id: skin.uuid,
      skin_nombre: skin.nombre,
      fecha_obtencion: new Date().toISOString(),
    }));

    // 💾 INSERTAR TODAS LAS SKINS EN EL INVENTARIO DE UNA VEZ
    const { error: inventoryError } = await supabase
      .from("inventario_usuario")
      .insert(inventoryInserts);

    if (inventoryError) {
      console.error("Error al guardar skins en inventario:", inventoryError);
      // Si falla el inventario, revertir el saldo solo si había costo
      if (costoTotal > 0) {
        // Obtener el saldo actual nuevamente para la reversión
        const { data: usuarioRevert } = await supabase
          .from("usuarios")
          .select("saldo")
          .eq("id", userId)
          .single();
        
        if (usuarioRevert) {
          await supabase
            .from("usuarios")
            .update({ saldo: usuarioRevert.saldo + costoTotal })
            .eq("id", userId);
        }
      }
      return {
        results: [],
        success: false,
        error: "Error al guardar en inventario"
      };
    }

    // 🏷️ MARCAR SKINS NUEVAS (verificación rápida por lotes)
    const skinUuids = selectedSkins.map(s => s.uuid);
    const { data: existingSkins } = await supabase
      .from("inventario_usuario")
      .select("skin_id")
      .eq("usuario_id", userId)
      .in("skin_id", skinUuids)
      .neq("fecha_obtencion", new Date().toISOString());

    const existingSkinIds = new Set(existingSkins?.map(es => es.skin_id) || []);
    
    const finalResults = selectedSkins.map(skin => ({
      ...skin,
      isNewSkin: !existingSkinIds.has(skin.uuid)
    }));

    // 🚀 DIFERIR OPERACIONES NO CRÍTICAS PARA DESPUÉS
    // No bloquear la UI con estas operaciones
    setTimeout(async () => {
      try {
        // Logging diferido
        const tierDataPromises = selectedSkins.map(skin => 
          getTierData(supabase, skin.content_tier?.uuid_api || null)
        );
        const tierDataResults = await Promise.all(tierDataPromises);

        const logData: CajaAbiertaLog = {
          usuario_id: userId,
          caja_id: cajaId,
          skins_conseguidas: selectedSkins.map((skin, index) => ({
            skin_id: skin.uuid,
            skin_nombre: skin.nombre,
            tier_id: skin.content_tier?.uuid_api || 'unknown',
            tier_nombre: tierDataResults[index]?.nombre || 'Unknown',
            tier_color: tierDataResults[index]?.color || '#FFFFFF'
          })),
          costo: costoTotal,
          metodo_pago: 'vp'
        };
        
        await logCajaAbierta(logData);

        // Misiones diferidas
        const misionResponse = await fetch('/api/misiones/procesar-actividad', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tipoActividad: 'caja_abierta',
            cantidad: numberOfBoxes
          })
        });

        if (misionResponse.ok && typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('misionesActualizadas'));
        }

        // Procesar misiones de skin conseguida diferidas
        for (const skin of selectedSkins) {
          try {
            const { procesarSkinConseguida } = await import('./missionUtils');
            await procesarSkinConseguida(userId, skin);
          } catch (e) {
            console.warn('Error al procesar misión de skin conseguida:', e);
          }
        }

      } catch (error) {
        console.warn('Error en operaciones diferidas:', error);
      }
    }, 100); // Diferir por 100ms

    return {
      results: finalResults,
      success: true
    };

  } catch (error) {
    console.error("Error en processMultipleBoxOpeningOptimized:", error);
    return {
      results: [],
      success: false,
      error
    };
  }
}

/**
 * Versión optimizada para apertura de caja única
 */
export async function processSingleBoxOpeningOptimized(
  userId: string,
  cajaId: string,
  skins: Skin[],
  probabilidades: TierProbabilidad[],
  supabase: SupabaseClient,
  costoCaja: number,
): Promise<{
  selectedSkin: Skin | null;
  success: boolean;
  error?: any;
  saldoInsuficiente?: boolean;
}> {
  const result = await processMultipleBoxOpeningOptimized(
    userId, cajaId, skins, probabilidades, supabase, costoCaja, 1
  );
  
  return {
    selectedSkin: result.results[0] || null,
    success: result.success,
    error: result.error,
    saldoInsuficiente: result.saldoInsuficiente
  };
}
