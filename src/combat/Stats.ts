// 属性与成长：纯逻辑，可单测。玩家基础属性、升级、敌人随楼层成长。
import type { Rng } from '../core/Rng';

export interface Stats {
  maxHp: number;
  attack: number;
  armor: number;
  critChance: number;
  moveSpeed: number;
  level: number;
  xp: number;
}

export function basePlayerStats(): Stats {
  return {
    maxHp: 100,
    attack: 18,
    armor: 5,
    critChance: 0.1,
    moveSpeed: 6,
    level: 1,
    xp: 0,
  };
}

/** 升到下一级所需经验。 */
export function xpToNext(level: number): number {
  return 20 + (level - 1) * 15;
}

/**
 * 获得经验并结算升级（可能连升多级）。返回新属性对象（不修改入参）。
 */
export function addXp(stats: Stats, amount: number): { stats: Stats; leveledUp: boolean } {
  let { level, xp, maxHp, attack } = stats;
  xp += amount;
  let leveledUp = false;
  while (xp >= xpToNext(level)) {
    xp -= xpToNext(level);
    level += 1;
    maxHp += 15;
    attack += 4;
    leveledUp = true;
  }
  return { stats: { ...stats, level, xp, maxHp, attack }, leveledUp };
}

/**
 * 敌人属性随楼层线性成长，带少量随机扰动。
 */
export function enemyStats(floor: number, rng: Rng): Stats {
  const jitter = 0.9 + rng() * 0.2; // 0.9~1.1
  return {
    maxHp: Math.round((30 + floor * 12) * jitter),
    attack: Math.round((8 + floor * 3) * jitter),
    armor: Math.floor(floor * 1.5),
    critChance: 0.05,
    moveSpeed: 3 + Math.min(floor * 0.15, 2),
    level: floor,
    xp: 8 + floor * 4,
  };
}
