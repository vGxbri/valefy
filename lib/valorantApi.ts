// lib/valorantApi.ts
export interface Chroma {
  uuid: string;
  displayName: string;
  displayIcon: string | null;
  // Puedes agregar más campos si los necesitas
}

export interface Skin {
  uuid: string;
  displayName: string;
  displayIcon: string;
  contentTierUuid: string | null;
  themeUuid?: string; // UUID del tema/bundle al que pertenece la skin
  chromas?: Chroma[]; // Añadimos chromas opcional
}

interface SkinsResponse {
  status: number;
  data: Skin[];
}

export const getWeaponSkins = async (): Promise<Skin[]> => {
  const res = await fetch("https://valorant-api.com/v1/weapons/skins");

  if (!res.ok) {
    throw new Error("Error al obtener las skins");
  }

  const json: SkinsResponse = await res.json();

  return json.data;
};

export function getRandomSkins(skins: Skin[], count: number): Chroma[] {
  // Lista de nombres de armas a excluir
  const bannedWeaponNames = [
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

  // Filtramos las skins que contienen "standard" en su nombre o que tienen exactamente el nombre de un arma
  const filteredSkins = skins.filter(
    (skin) =>
      !skin.displayName.toLowerCase().includes("standard") &&
      !bannedWeaponNames.includes(skin.displayName),
  );

  // Extraemos todos los chromas válidos (con displayIcon no nulo) de las skins filtradas
  const allChromas: (Chroma & { weaponType: string })[] = filteredSkins.flatMap((skin) =>
    (skin.chromas || [])
      .filter((chroma) => chroma.displayIcon)
      .map((chroma) => ({ ...chroma, weaponType: skin.displayName.split(" ")[0] }))
  );

  // Agrupamos los chromas por tipo de arma
  const chromasByWeaponType = new Map<string, (Chroma & { weaponType: string })[]>();
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
      const randomChromaIndex = Math.floor(Math.random() * availableChromas.length);
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
    const remainingChromas = allChromas.filter((chroma) => !result.includes(chroma));
    const additionalChromas = remainingChromas
      .sort(() => Math.random() - 0.5)
      .slice(0, count - result.length);
    result.push(...additionalChromas);
  }

  // Retornamos solo los chromas (sin el campo weaponType extra)
  return result.map(({ weaponType, ...chroma }) => chroma);
}
