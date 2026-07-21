import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../core/Rng';
import { amountFor, RARITY_MUL, rollDrop, rollEliteDrop, rollRarity, type PickupKind, type Rarity } from './Loot';

const ALL_KINDS: PickupKind[] = ['health', 'gold', 'attack', 'armor', 'maxhp'];
const ALL_RARITIES: Rarity[] = ['common', 'uncommon', 'rare', 'epic'];

describe('rollDrop', () => {
  it('约有 30% 概率不掉落', () => {
    const rng = mulberry32(1234);
    let nulls = 0;
    const n = 4000;
    for (let i = 0; i < n; i++) if (rollDrop(1, rng) === null) nulls++;
    const ratio = nulls / n;
    expect(ratio).toBeGreaterThan(0.22);
    expect(ratio).toBeLessThan(0.38);
  });

  it('掉落物种类/稀有度合法且数量为正', () => {
    const rng = mulberry32(7);
    for (let i = 0; i < 500; i++) {
      const drop = rollDrop(3, rng);
      if (!drop) continue;
      expect(ALL_KINDS).toContain(drop.kind);
      expect(ALL_RARITIES).toContain(drop.rarity);
      expect(drop.amount).toBeGreaterThan(0);
    }
  });

  it('同种子结果一致', () => {
    const a = Array.from({ length: 20 }, (_, i) => rollDrop(2, mulberry32(i)));
    const b = Array.from({ length: 20 }, (_, i) => rollDrop(2, mulberry32(i)));
    expect(a).toEqual(b);
  });
});

describe('rollRarity', () => {
  it('第 1 层不会出 epic', () => {
    for (let i = 0; i < 1000; i++) {
      expect(rollRarity(1, mulberry32(i))).not.toBe('epic');
    }
  });

  it('第 5 层可以出 epic', () => {
    let sawEpic = false;
    for (let i = 0; i < 2000 && !sawEpic; i++) {
      if (rollRarity(5, mulberry32(i)) === 'epic') sawEpic = true;
    }
    expect(sawEpic).toBe(true);
  });

  it('楼层越高，非常见掉落占比越高', () => {
    const nonCommon = (floor: number) => {
      let c = 0;
      const n = 2000;
      for (let i = 0; i < n; i++) if (rollRarity(floor, mulberry32(i)) !== 'common') c++;
      return c / n;
    };
    expect(nonCommon(8)).toBeGreaterThan(nonCommon(1));
  });

  it('稀有度倍率递增', () => {
    expect(RARITY_MUL.uncommon).toBeGreaterThan(RARITY_MUL.common);
    expect(RARITY_MUL.rare).toBeGreaterThan(RARITY_MUL.uncommon);
    expect(RARITY_MUL.epic).toBeGreaterThan(RARITY_MUL.rare);
  });
});

describe('rollEliteDrop', () => {
  it('必定掉落且稀有度为 rare 或 epic', () => {
    for (let i = 0; i < 500; i++) {
      const drop = rollEliteDrop(3, mulberry32(i));
      expect(drop).not.toBeNull();
      expect(['rare', 'epic']).toContain(drop.rarity);
      expect(drop.amount).toBeGreaterThan(0);
      expect(ALL_KINDS).toContain(drop.kind);
    }
  });
});

describe('amountFor', () => {
  it('金币随楼层增加', () => {
    const low = amountFor('gold', 1, mulberry32(1));
    const high = amountFor('gold', 10, mulberry32(1));
    expect(high).toBeGreaterThan(low);
  });

  it('所有种类数量为正', () => {
    for (const kind of ALL_KINDS) {
      expect(amountFor(kind, 1, mulberry32(5))).toBeGreaterThan(0);
      expect(amountFor(kind, 8, mulberry32(5))).toBeGreaterThan(0);
    }
  });
});
