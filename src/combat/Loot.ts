// 掉落系统：纯逻辑，可单测。敌人死亡时按权重掉落带稀有度的拾取物。
import { type Rng, randInt, weightedPick } from '../core/Rng';

export type PickupKind = 'health' | 'gold' | 'attack' | 'armor' | 'maxhp';
export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic';

export interface Drop {
  kind: PickupKind;
  amount: number;
  rarity: Rarity;
}

/** 掉落物权重：金币最常见，属性稀有。 */
const KINDS: PickupKind[] = ['health', 'gold', 'attack', 'armor', 'maxhp'];
const KIND_WEIGHTS = [30, 45, 9, 8, 8];

/** 稀有度对数量的倍率。 */
export const RARITY_MUL: Record<Rarity, number> = {
  common: 1,
  uncommon: 1.4,
  rare: 1.9,
  epic: 2.6,
};

const RARITIES: Rarity[] = ['common', 'uncommon', 'rare', 'epic'];

/** 不掉落任何物品的概率。 */
const NO_DROP_CHANCE = 0.3;

/** 按楼层掷稀有度：越深越容易出高稀有度，epic 仅 3 层起。 */
export function rollRarity(floor: number, rng: Rng): Rarity {
  const weights = [
    100, // common
    20 + floor * 3, // uncommon
    4 + floor * 1.5, // rare
    floor >= 3 ? floor * 0.7 : 0, // epic
  ];
  return weightedPick(rng, RARITIES, weights);
}

/** 敌人死亡时掷一次掉落：可能为空（30% 不掉）。 */
export function rollDrop(floor: number, rng: Rng): Drop | null {
  if (rng() < NO_DROP_CHANCE) return null;
  const kind = weightedPick(rng, KINDS, KIND_WEIGHTS);
  const rarity = rollRarity(floor, rng);
  const amount = Math.max(1, Math.round(amountFor(kind, floor, rng) * RARITY_MUL[rarity]));
  return { kind, amount, rarity };
}

/** 精英怪掉落：必定掉落，且稀有度保底 rare/epic，更偏向属性类。 */
export function rollEliteDrop(floor: number, rng: Rng): Drop {
  const kind = weightedPick(rng, KINDS, [20, 30, 18, 16, 16]);
  const rarity: Rarity = rng() < 0.5 ? 'rare' : 'epic';
  const amount = Math.max(1, Math.round(amountFor(kind, floor, rng) * RARITY_MUL[rarity]));
  return { kind, amount, rarity };
}

export function amountFor(kind: PickupKind, floor: number, rng: Rng): number {
  switch (kind) {
    case 'health':
      return 20 + randInt(rng, 0, 15);
    case 'gold':
      return 5 + floor * 2 + randInt(rng, 0, 8);
    case 'attack':
      return 2 + Math.floor(floor / 2);
    case 'armor':
      return 1 + Math.floor(floor / 3);
    case 'maxhp':
      return 10 + randInt(rng, 0, 10);
  }
}
