// lib/valorantApi.ts
export interface Skin {
  uuid: string;
  displayName: string;
  displayIcon: string;
  contentTierUuid: string | null;
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

export function getRandomSkins(skins: Skin[], count: number): Skin[] {
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
    "Sovereign Guardian",
  ];

  // Filtramos las skins que contienen "standard" o "Sovereign Marshal" en su nombre
  // Y también excluimos las que tienen exactamente el nombre de un arma
  const filteredSkins = skins.filter(
    (skin) =>
      !skin.displayName.toLowerCase().includes("standard") &&
      skin.displayName !== "Sovereign Marshal" &&
      !bannedWeaponNames.includes(skin.displayName),
  );

  // Agrupamos las skins por tipo de arma (extrayendo el nombre del arma de displayName)
  const skinsByWeaponType = new Map<string, Skin[]>();

  filteredSkins.forEach((skin) => {
    // Extraemos el tipo de arma del nombre (generalmente es la primera palabra)
    const weaponType = skin.displayName.split(" ")[0];

    if (!skinsByWeaponType.has(weaponType)) {
      skinsByWeaponType.set(weaponType, []);
    }

    skinsByWeaponType.get(weaponType)?.push(skin);
  });

  // Creamos un array con todas las categorías de armas
  const weaponTypes = Array.from(skinsByWeaponType.keys());

  // Resultado final
  const result: Skin[] = [];

  // Seleccionamos skins de diferentes tipos de armas de manera alternada
  while (result.length < count && weaponTypes.length > 0) {
    // Elegimos un tipo de arma al azar
    const randomTypeIndex = Math.floor(Math.random() * weaponTypes.length);
    const weaponType = weaponTypes[randomTypeIndex];

    // Obtenemos las skins disponibles para este tipo
    const availableSkins = skinsByWeaponType.get(weaponType) || [];

    if (availableSkins.length > 0) {
      // Elegimos una skin al azar de este tipo
      const randomSkinIndex = Math.floor(Math.random() * availableSkins.length);
      const selectedSkin = availableSkins[randomSkinIndex];

      // Añadimos la skin al resultado
      result.push(selectedSkin);

      // Eliminamos la skin seleccionada para no repetirla
      availableSkins.splice(randomSkinIndex, 1);

      // Si ya no quedan skins de este tipo, eliminamos el tipo
      if (availableSkins.length === 0) {
        weaponTypes.splice(randomTypeIndex, 1);
      } else {
        // Actualizamos el mapa con las skins restantes
        skinsByWeaponType.set(weaponType, availableSkins);
      }
    } else {
      // Si no hay skins disponibles para este tipo, lo eliminamos
      weaponTypes.splice(randomTypeIndex, 1);
    }
  }

  // Si no hemos conseguido suficientes skins, completamos con skins aleatorias
  if (result.length < count) {
    const remainingSkins = filteredSkins.filter(
      (skin) => !result.includes(skin),
    );
    const additionalSkins = remainingSkins
      .sort(() => Math.random() - 0.5)
      .slice(0, count - result.length);

    result.push(...additionalSkins);
  }

  return result;
}
