// lib/valorantApi.ts
export interface Chroma {
  uuid: string;
  displayName: string;
  displayIcon: string | null;
  // Puedes agregar más campos si los necesitas
}

export interface SkinLevel {
  uuid: string;
  displayName: string;
  levelItem: string | null;
  displayIcon: string | null;
  streamedVideo: string | null;
  assetPath: string;
}

export interface Skin {
  uuid: string;
  displayName: string;
  displayIcon: string | null; // Cambiado a null porque puede fallar
  contentTierUuid: string | null;
  themeUuid?: string; // UUID del tema/bundle al que pertenece la skin
  chromas?: Chroma[]; // Añadimos chromas opcional
  levels?: SkinLevel[]; // Añadimos el array de niveles
}

interface SkinsResponse {
  status: number;
  data: Skin[];
}

export interface ContentTier {
  uuid: string;
  displayName: string;
  devName: string;
  rank: number;
  juiceValue: number;
  juiceCost: number;
  highlightColor: string;
  displayIcon: string;
  assetPath: string;
}

interface ContentTiersResponse {
  status: number;
  data: ContentTier[];
}

// Lista de nombres de armas a excluir (constante reutilizable)
export const BANNED_WEAPON_NAMES = [
  "Classic",
  "Shorty",
  "Frenzy",
  "Ghost",
  "Sheriff",
  "Stinger",
  "Spectre",
  "Bucky",
  "Judge",
  "Bulldog",
  "Guardian",
  "Phantom",
  "Vandal",
  "Marshal",
  "Operator",
  "Ares",
  "Odin",
  "Outlaw",
  "Melee",
];

/**
 * Determina el tipo de arma basándose en el nombre de la skin
 * @param skinName El nombre de la skin
 * @returns El tipo de arma detectado
 */
export const getWeaponType = (skinName: string): 'classic' | 'frenzy' | 'sheriff' | 'melee' | 'standard' => {
  if (skinName.endsWith(' Classic')) {
    return 'classic';
  }
  if (skinName.endsWith(' Frenzy')) {
    return 'frenzy';
  }
  if (skinName.endsWith(' Sheriff')) {
    return 'sheriff';
  }
  
  // Para cuchillos: si NO termina con ninguno de los nombres de armas básicas, es un cuchillo/melee
  const endsWithBannedWeapon = BANNED_WEAPON_NAMES.some(weaponName => 
    skinName.endsWith(` ${weaponName}`)
  );
  
  if (!endsWithBannedWeapon) {
    return 'melee';
  }
  
  return 'standard';
};

/**
 * Obtiene las configuraciones específicas para cada tipo de arma
 * @param weaponType El tipo de arma
 * @returns Un objeto con la configuración de escala y rotación
 */
export const getWeaponSpecificStyles = (weaponType: ReturnType<typeof getWeaponType>) => {
  switch (weaponType) {
    case 'classic':
      return {
        baseScale: 0.7, // 30% más pequeña (100% - 30% = 70%)
        hasRotation: true
      };
    case 'frenzy':
      return {
        baseScale: 0.65, // 40% más pequeña (100% - 40% = 60%)
        hasRotation: true
      };
    case 'sheriff':
      return {
        baseScale: 0.85, // 25% más pequeña (100% - 25% = 75%)
        hasRotation: true
      };
    case 'melee':
      return {
        baseScale: 1, // Sin escala adicional
        hasRotation: false // Sin rotación para cuchillos
      };
    default:
      return {
        baseScale: 1,
        hasRotation: true
      };
  }
};

export const getWeaponSkins = async (): Promise<Skin[]> => {
  const res = await fetch("https://valorant-api.com/v1/weapons/skins");

  if (!res.ok) {
    throw new Error("Error al obtener las skins");
  }

  const json: SkinsResponse = await res.json();

  return json.data;
};

export const getContentTiers = async (): Promise<ContentTier[]> => {
  const res = await fetch("https://valorant-api.com/v1/contenttiers");

  if (!res.ok) {
    throw new Error("Error al obtener los niveles de contenido (content tiers)");
  }

  const json: ContentTiersResponse = await res.json();
  return json.data;
};

/**
 * Obtiene el mejor displayIcon disponible para una skin
 * @param skin La skin de la que obtener el icono
 * @returns La URL del icono o null si no hay ninguno disponible
 */
export const getBestDisplayIcon = (skin: Skin): string | null => {
  // SIEMPRE usamos el icono del primer nivel si existe
  if (skin.levels && skin.levels.length > 0 && skin.levels[0].displayIcon) {
    return skin.levels[0].displayIcon;
  }

  // SOLO si no hay niveles o el primer nivel no tiene icono, usamos el icono principal
  // Esto debería ocurrir muy raramente
  if (skin.displayIcon) {
    console.warn(
      `Usando displayIcon principal para ${skin.displayName} porque no tiene levels[0].displayIcon`,
    );

    return skin.displayIcon;
  }

  // Si no hay ningún icono disponible
  return null;
};

/**
 * Filtra las skins según criterios de calidad consistentes en toda la aplicación
 * @param skins Array de skins a filtrar
 * @returns Array de skins filtradas
 */
export const filterQualitySkins = (skins: Skin[]): Skin[] => {
  return skins.filter(
    (skin) =>
      skin.themeUuid && // Solo skins que pertenecen a un bundle/tema
      getBestDisplayIcon(skin) !== null && // Verificar que tenga un icono disponible
      !skin.displayName.toLowerCase().includes("standard") && // Excluir skins estándar
      skin.displayName.split(" ").length > 1 && // Excluir nombres de armas simples
      !BANNED_WEAPON_NAMES.includes(skin.displayName), // Excluir nombres de armas básicas
  );
};

/**
 * Filtra skins por IDs específicos
 * @param allSkins Todas las skins disponibles
 * @param skinIds Array de IDs de skins a incluir
 * @returns Array de skins que coinciden con los IDs proporcionados
 */
export const filterSkinsByIds = (
  allSkins: Skin[],
  skinIds: string[],
): Skin[] => {
  return allSkins.filter((skin) => skinIds.includes(skin.uuid));
};

/**
 * Obtiene un número específico de skins aleatorias del conjunto proporcionado
 * @param skins Array de skins para seleccionar aleatoriamente
 * @param count Número de skins a seleccionar
 * @returns Array de skins seleccionadas aleatoriamente
 */
export function getRandomSkins(skins: Skin[], count: number): Skin[] {
  // Primero aplicamos el filtro de calidad
  const filteredSkins = filterQualitySkins(skins);

  // Luego seleccionamos aleatoriamente
  const shuffled = [...filteredSkins].sort(() => 0.5 - Math.random());

  return shuffled.slice(0, Math.min(count, shuffled.length));
}

/**
 * Filtra skins que pertenecen a bundles con imagen de portada
 * @param skins Array de skins a filtrar
 * @returns Promise con array de skins filtradas
 */
export const filterSkinsByBundleWithIcon = async (
  skins: Skin[],
): Promise<Skin[]> => {
  // Obtener los bundles para verificar cuáles tienen imagen de portada
  const bundlesResponse = await fetch("https://valorant-api.com/v1/bundles");
  const bundlesData = await bundlesResponse.json();
  const bundles = bundlesData.data;

  // Crear un mapa de bundles para búsquedas rápidas
  interface Bundle {
    uuid: string;
    displayName: string;
    displayIcon: string;
  }

  const bundleMap = new Map<string, Bundle>();

  bundles.forEach((bundle: Bundle) => {
    bundleMap.set(bundle.displayName.toLowerCase(), bundle);
  });

  // Filtrar las skins:
  // 1. Solo las que tienen themeUuid
  // 2. Solo las que pertenecen a un bundle con imagen de portada
  return skins.filter((skin) => {
    if (!skin.themeUuid) return false;

    const bundleName = skin.displayName.split(" ")[0];
    const bundle = bundleMap.get(bundleName.toLowerCase());

    // Verificar que el bundle tenga imagen de portada
    return bundle && bundle.displayIcon;
  });
};

/**
 * Obtiene chromas aleatorios con diversidad de tipos de armas
 * @param skins Array de skins para extraer chromas
 * @param count Número de chromas a seleccionar
 * @returns Array de chromas seleccionados aleatoriamente
 */
export function getRandomChromas(skins: Skin[], count: number): Chroma[] {
  // Filtramos las skins según criterios de calidad
  const filteredSkins = skins.filter(
    (skin) =>
      !skin.displayName.toLowerCase().includes("standard") &&
      !BANNED_WEAPON_NAMES.includes(skin.displayName) &&
      getBestDisplayIcon(skin) !== null, // Asegurarnos de que tenga un icono disponible
  );

  // Extraemos todos los chromas válidos (con displayIcon no nulo) de las skins filtradas
  const allChromas: (Chroma & { weaponType: string })[] = filteredSkins.flatMap(
    (skin) =>
      (skin.chromas || [])
        .filter((chroma) => chroma.displayIcon)
        .map((chroma) => ({
          ...chroma,
          weaponType: skin.displayName.split(" ")[0],
        })),
  );

  // Agrupamos los chromas por tipo de arma
  const chromasByWeaponType = new Map<
    string,
    (Chroma & { weaponType: string })[]
  >();

  allChromas.forEach((chroma) => {
    if (!chromasByWeaponType.has(chroma.weaponType)) {
      chromasByWeaponType.set(chroma.weaponType, []);
    }
    chromasByWeaponType.get(chroma.weaponType)?.push(chroma);
  });

  const weaponTypes = Array.from(chromasByWeaponType.keys());
  const result: (Chroma & { weaponType: string })[] = [];

  // Seleccionamos chromas de diferentes tipos de armas de manera alternada
  while (result.length < count && weaponTypes.length > 0) {
    const randomTypeIndex = Math.floor(Math.random() * weaponTypes.length);
    const weaponType = weaponTypes[randomTypeIndex];
    const availableChromas = chromasByWeaponType.get(weaponType) || [];

    if (availableChromas.length > 0) {
      const randomChromaIndex = Math.floor(
        Math.random() * availableChromas.length,
      );
      const selectedChroma = availableChromas[randomChromaIndex];

      result.push(selectedChroma);
      availableChromas.splice(randomChromaIndex, 1);
      if (availableChromas.length === 0) {
        weaponTypes.splice(randomTypeIndex, 1);
      } else {
        chromasByWeaponType.set(weaponType, availableChromas);
      }
    } else {
      weaponTypes.splice(randomTypeIndex, 1);
    }
  }

  // Si no hemos conseguido suficientes chromas, completamos con chromas aleatorios
  if (result.length < count) {
    const remainingChromas = allChromas.filter(
      (chroma) => !result.includes(chroma),
    );
    const additionalChromas = remainingChromas
      .sort(() => Math.random() - 0.5)
      .slice(0, count - result.length);

    result.push(...additionalChromas);
  }

  // Retornamos solo los chromas (sin el campo weaponType extra)
  return result.map(({ weaponType, ...chroma }) => chroma);
}
