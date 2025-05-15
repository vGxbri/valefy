'use client';

import { ERROR_MESSAGES, ODDS_TO_RARITY, SKIN_WEAR_AND_FLOAT, SLIDER_SIZE, WON_SKIN_INDEX } from '../constants';
import type { BaseRarity, Crate, RarityId, Skin, WearCategory } from '../types';

type Odds = Record<string, number>;

class CrateServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CrateServiceError';
  }
}

function gunSkinFilter(skin: Skin): boolean {
  return !skin.rarity_id.includes('exceedingly_rare') && skin.paint_index !== null;
}

function knivesAndGlovesSkinFilter(skin: Skin): boolean {
  return skin.rarity_id.includes('exceedingly_rare') || skin.name.toLowerCase().includes('knife') || skin.name.toLowerCase().includes('gloves');
}

function getWinningSkin(crate: Crate, odds: Odds) {
  const wonSkin = getRandomSkinByOdds(crate, odds);
  return { ...wonSkin, wear_category: getSkinWearCategory(wonSkin) };
}

function openCrate(crate: Crate, odds: Odds) {
  if (!crate.skins) throw new CrateServiceError(ERROR_MESSAGES.CRATE_HAS_NO_SKINS);

  const wonSkin = getWinningSkin(crate, odds);
  const sliderSkins = getSkinsForSlider(crate, SLIDER_SIZE, odds, wonSkin);

  if (!sliderSkins.length || !wonSkin) throw new CrateServiceError(ERROR_MESSAGES.NO_SKINS_GENERATED);

  sliderSkins[WON_SKIN_INDEX] = wonSkin;
  return { sliderSkins, wonSkin, wonSkinIndex: WON_SKIN_INDEX };
}

function getRandomSkinByOdds(crate: Crate, odds: Odds): Skin {
  const skins = crate.skins;
  if (!skins?.length) throw new CrateServiceError(ERROR_MESSAGES.CRATE_HAS_NO_SKINS);

  const oddsToUse = { ...odds };

  if (crate.type === 'Souvenir' || crate.type.includes('Capsule')) {
    delete oddsToUse.exceedingly_rare;
  }

  const skinsByCategory: Record<string, Skin[]> = {};

  Object.keys(ODDS_TO_RARITY).forEach((category) => {
    skinsByCategory[category] = [];
  });

  for (const skin of skins) {
    for (const [category, rarities] of Object.entries(ODDS_TO_RARITY)) {
      if (rarities.includes(skin.rarity_id)) {
        skinsByCategory[category].push(skin);
        break;
      }
    }
  }

  if (skinsByCategory.exceedingly_rare.length === 0 && oddsToUse.exceedingly_rare) {
    const knivesAndGloves = skins.filter(knivesAndGlovesSkinFilter);
    skinsByCategory.exceedingly_rare = knivesAndGloves;
  }

  const availableCategories = Object.entries(skinsByCategory)
    .filter(([_, categorySkins]) => categorySkins.length > 0)
    .map(([category]) => category);

  const filteredOdds: Odds = {};
  let totalOdds = 0;

  for (const category of availableCategories) {
    if (oddsToUse[category]) {
      filteredOdds[category] = oddsToUse[category];
      totalOdds += oddsToUse[category];
    }
  }

  if (totalOdds === 0) {
    availableCategories.forEach((category) => {
      filteredOdds[category] = 1 / availableCategories.length;
    });
    totalOdds = 1;
  }

  const random = Math.random();
  let cumulativeProbability = 0;
  let selectedCategory = availableCategories[0];

  for (const [category, probability] of Object.entries(filteredOdds)) {
    cumulativeProbability += probability / totalOdds;

    if (random <= cumulativeProbability) {
      selectedCategory = category;
      break;
    }
  }

  const eligibleSkins = skinsByCategory[selectedCategory];

  if (selectedCategory === 'exceedingly_rare') {
    return { ...eligibleSkins[Math.floor(Math.random() * eligibleSkins.length)], rarity_id: 'exceedingly_rare' };
  }

  const gunSkins = eligibleSkins.filter(gunSkinFilter);

  if (gunSkins.length > 0) {
    return gunSkins[Math.floor(Math.random() * gunSkins.length)];
  }

  if (eligibleSkins.length > 0) {
    return eligibleSkins[Math.floor(Math.random() * eligibleSkins.length)];
  }

  return skins[Math.floor(Math.random() * skins.length)];
}

function getRandomSkinRarityForCrateByOdds(crate: Crate, _odds: Odds): string {
  const odds = { ..._odds };

  if (crate.type === 'Souvenir' || crate.type.includes('Capsule')) {
    delete odds.exceedingly_rare;
  }

  if (!Object.keys(odds).length) {
    throw new Error('No valid odds provided');
  }

  const availableRarities = new Set(crate.skins.map((skin) => skin.rarity_id));

  const validBuckets = Object.entries(odds).filter(([bucket]) => {
    if (bucket === 'exceedingly_rare' && odds.exceedingly_rare) {
      return true;
    }

    const mappedRarities = ODDS_TO_RARITY[bucket as BaseRarity];
    return mappedRarities.some((rarity) => availableRarities.has(rarity as RarityId));
  });

  if (!validBuckets.length) {
    throw new Error('No valid rarities found for odds configuration');
  }

  const totalProbability = validBuckets.reduce((sum, [, probability]) => sum + probability, 0);

  const random = Math.random();

  let cumulativeProbability = 0;
  let selectedBucket: string | null = null;

  for (const [bucket, probability] of validBuckets) {
    const normalizedProbability = probability / totalProbability;
    cumulativeProbability += normalizedProbability;

    if (random <= cumulativeProbability) {
      selectedBucket = bucket;
      break;
    }
  }

  if (!selectedBucket) {
    selectedBucket = 'rare';
  }

  if (selectedBucket === 'exceedingly_rare') {
    return 'exceedingly_rare';
  }

  const rarityOptions = ODDS_TO_RARITY[selectedBucket as BaseRarity].filter((rarity) =>
    availableRarities.has(rarity as RarityId),
  );

  if (rarityOptions.length) {
    return rarityOptions[Math.floor(Math.random() * rarityOptions.length)];
  }

  const rareRarities = ODDS_TO_RARITY.rare.filter((rarity) => availableRarities.has(rarity as RarityId));

  return rareRarities[Math.floor(Math.random() * rareRarities.length)];
}

function getSkinsForSlider(crate: Crate, count: number, odds: Odds, wonSkin: Skin): Skin[] {
  const crateSkins = crate.skins;
  if (!crateSkins?.length) throw new CrateServiceError(ERROR_MESSAGES.CRATE_HAS_NO_SKINS);

  const randomSkins: Skin[] = [];
  let previousSkinId: string | undefined;

  while (randomSkins.length < count) {
    const index = randomSkins.length;

    const randomSkin = (function selectSkin(_prevId: string | undefined, index: number): Skin {
      const randomRarity = getRandomSkinRarityForCrateByOdds(crate, odds);
      const candidate = crateSkins[Math.floor(Math.random() * crateSkins.length)];

      if (
        candidate.id === _prevId ||
        !gunSkinFilter(candidate) ||
        candidate.rarity_id !== randomRarity ||
        ((index === WON_SKIN_INDEX - 1 || index === WON_SKIN_INDEX + 1) && candidate.id === wonSkin.id)
      ) {
        return selectSkin(_prevId, index);
      }

      return candidate;
    })(previousSkinId, index);

    previousSkinId = randomSkin.id;
    randomSkins.push(randomSkin);
  }

  return randomSkins;
}

function getSkinWearCategory(skin: Skin): WearCategory {
  if (skin.paint_index === null) {
    return 'Default';
  }

  let cumulative = 0;
  const diceRoll = Math.random();

  const validWearEntries = Object.entries(SKIN_WEAR_AND_FLOAT).filter(([wearKey]) =>
    skin.prices.find((price) => price.wear_category === wearKey),
  );

  for (const [wearKey, { odds }] of validWearEntries) {
    cumulative += odds;

    if (diceRoll <= cumulative) {
      return wearKey as keyof typeof SKIN_WEAR_AND_FLOAT;
    }
  }

  if (validWearEntries.length > 0) {
    return validWearEntries[validWearEntries.length - 1][0] as keyof typeof SKIN_WEAR_AND_FLOAT;
  }

  const keys = Object.keys(SKIN_WEAR_AND_FLOAT) as Array<keyof typeof SKIN_WEAR_AND_FLOAT>;
  return keys[keys.length - 1];
}

export const crateOpeningService = {
  openCrate,
  getRandomSkinByOdds,
  getSkinWearCategory,
  getSkinsForSlider,
  getWinningSkin,
  gunSkinFilter,
  knivesAndGlovesSkinFilter,
}; 