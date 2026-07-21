// 种子化随机数：供地牢生成、战斗、掉落等模块共用，保证可复现、可单测。
export type Rng = () => number;

/** mulberry32：小而快的种子 PRNG，返回 [0,1) 的浮点数。 */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** [min, max] 闭区间内的随机整数。 */
export function randInt(rng: Rng, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

/** [min, max) 区间内的随机浮点数。 */
export function randRange(rng: Rng, min: number, max: number): number {
  return min + rng() * (max - min);
}

/** 按权重从数组中选一个。weights 与 items 等长，权重为非负数。 */
export function weightedPick<T>(rng: Rng, items: readonly T[], weights: readonly number[]): T {
  const total = weights.reduce((s, w) => s + w, 0);
  let roll = rng() * total;
  for (let i = 0; i < items.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return items[i];
  }
  return items[items.length - 1];
}
