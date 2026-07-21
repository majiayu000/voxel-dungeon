import { describe, expect, it } from 'vitest';
import { mulberry32, type Rng } from '../core/Rng';
import { applyArmor, computeHit } from './Damage';

/** 按给定序列依次返回的受控 rng，便于精确断言。 */
function seq(values: number[]): Rng {
  let i = 0;
  return () => values[i++ % values.length];
}

describe('applyArmor', () => {
  it('护甲 0 不减伤', () => {
    expect(applyArmor(100, 0)).toBe(100);
  });
  it('护甲等于 K 时减半', () => {
    expect(applyArmor(100, 50)).toBeCloseTo(50, 5);
  });
  it('护甲越高减伤越多但永不为负', () => {
    expect(applyArmor(100, 500)).toBeGreaterThan(0);
    expect(applyArmor(100, 500)).toBeLessThan(applyArmor(100, 50));
  });
});

describe('computeHit', () => {
  it('暴击使基础伤害翻倍', () => {
    // 第 1 次 rng=0.1 < critChance 0.5 → 暴击；第 2 次=0.5 → 浮动系数 1
    const r = computeHit({ base: 20, armor: 0, critChance: 0.5, variance: 0.15, rng: seq([0.1, 0.5]) });
    expect(r.crit).toBe(true);
    expect(r.damage).toBe(40);
  });

  it('未暴击按基础伤害', () => {
    const r = computeHit({ base: 20, armor: 0, critChance: 0.5, variance: 0.15, rng: seq([0.9, 0.5]) });
    expect(r.crit).toBe(false);
    expect(r.damage).toBe(20);
  });

  it('护甲降低最终伤害', () => {
    const noArmor = computeHit({ base: 30, armor: 0, critChance: 0, variance: 0, rng: seq([0.99, 0.5]) });
    const withArmor = computeHit({ base: 30, armor: 50, critChance: 0, variance: 0, rng: seq([0.99, 0.5]) });
    expect(withArmor.damage).toBeLessThan(noArmor.damage);
  });

  it('伤害最低为 1', () => {
    const r = computeHit({ base: 1, armor: 10000, critChance: 0, variance: 0.5, rng: seq([0.99, 0]) });
    expect(r.damage).toBe(1);
  });

  it('浮动范围受 variance 约束', () => {
    const rng = mulberry32(77);
    for (let i = 0; i < 500; i++) {
      const r = computeHit({ base: 100, armor: 0, critChance: 0, variance: 0.15, rng });
      expect(r.damage).toBeGreaterThanOrEqual(85);
      expect(r.damage).toBeLessThanOrEqual(115);
    }
  });
});
