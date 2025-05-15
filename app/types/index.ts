export type RarityId =
  | "consumer_grade"
  | "industrial_grade"
  | "mil_spec"
  | "restricted"
  | "classified"
  | "covert"
  | "exceedingly_rare";

export type BaseRarity =
  | "common"
  | "uncommon"
  | "rare"
  | "mythical"
  | "legendary"
  | "ancient"
  | "exceedingly_rare";

export type WearCategory =
  | "Factory New"
  | "Minimal Wear"
  | "Field-Tested"
  | "Well-Worn"
  | "Battle-Scarred"
  | "Default";

export interface Price {
  wear_category: WearCategory;
  amount: number;
}

export interface Skin {
  id: string;
  name: string;
  image: string;
  rarity_id: RarityId;
  wear_category?: WearCategory;
  prices: Price[];
  paint_index: number | null;
}

export interface Crate {
  id: string;
  name: string;
  image: string;
  type: string;
  price: number;
  skins: Skin[];
}
