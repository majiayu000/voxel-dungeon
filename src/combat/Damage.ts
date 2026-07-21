// 伤害计算：纯逻辑，可单测。暴击、护甲减伤、伤害浮动。
import type { Rng } from '../core/Rng';

/** 护甲减伤常数：减伤比例 = armor / (armor + K)。 */
const ARMOR_K = 50;

export interface HitInput {
  base: number; // 基础攻击力
  armor: number; // 目标护甲
  critChance: number; // 暴击率 0..1
  variance?: number; // 伤害浮动比例，默认 0.15（±15%）
  rng?: Rng;
}

export interface HitResult {
  damage: number;
  crit: boolean;
}

export function applyArmor(damage: number, armor: number): number {
  return damage * (1 - armor / (armor + ARMOR_K));
}

export function computeHit(input: HitInput): HitResult {
  const rng = input.rng ?? Math.random;
  const variance = input.variance ?? 0.15;

  const crit = rng() < input.critChance;
  let dmg = input.base * (crit ? 2 : 1);
  dmg *= 1 - variance + rng() * variance * 2; // [1-v, 1+v]
  dmg = applyArmor(dmg, input.armor);

  return { damage: Math.max(1, Math.round(dmg)), crit };
}
