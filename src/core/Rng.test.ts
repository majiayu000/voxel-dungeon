import { describe, expect, it } from 'vitest';
import { mulberry32, randInt, randRange, weightedPick } from './Rng';

describe('mulberry32', () => {
  it('同一种子产生相同序列（可复现）', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    for (let i = 0; i < 100; i++) expect(a()).toBe(b());
  });

  it('输出落在 [0,1)', () => {
    const rng = mulberry32(7);
    for (let i = 0; i < 1000; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('不同种子序列不同', () => {
    const a = mulberry32(1);
    const b = mulberry32(2);
    const same = Array.from({ length: 10 }, () => a() === b());
    expect(same.some((v) => !v)).toBe(true);
  });
});

describe('randInt / randRange', () => {
  it('randInt 落在闭区间内', () => {
    const rng = mulberry32(99);
    for (let i = 0; i < 1000; i++) {
      const v = randInt(rng, 3, 8);
      expect(v).toBeGreaterThanOrEqual(3);
      expect(v).toBeLessThanOrEqual(8);
      expect(Number.isInteger(v)).toBe(true);
    }
  });

  it('randRange 落在半开区间内', () => {
    const rng = mulberry32(123);
    for (let i = 0; i < 1000; i++) {
      const v = randRange(rng, -2, 5);
      expect(v).toBeGreaterThanOrEqual(-2);
      expect(v).toBeLessThan(5);
    }
  });
});

describe('weightedPick', () => {
  it('权重为 0 的项不会被选中', () => {
    const rng = mulberry32(5);
    for (let i = 0; i < 200; i++) {
      expect(weightedPick(rng, ['a', 'b', 'c'], [0, 1, 0])).toBe('b');
    }
  });

  it('高权重项占比更高', () => {
    const rng = mulberry32(2024);
    let heavy = 0;
    const n = 5000;
    for (let i = 0; i < n; i++) {
      if (weightedPick(rng, ['light', 'heavy'], [1, 9]) === 'heavy') heavy++;
    }
    expect(heavy / n).toBeGreaterThan(0.8);
  });
});
