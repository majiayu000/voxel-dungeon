import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../core/Rng';
import { addXp, basePlayerStats, enemyStats, xpToNext } from './Stats';

describe('xpToNext', () => {
  it('随等级递增', () => {
    expect(xpToNext(1)).toBe(20);
    expect(xpToNext(2)).toBe(35);
    expect(xpToNext(3)).toBeGreaterThan(xpToNext(2));
  });
});

describe('addXp', () => {
  it('经验不足不升级', () => {
    const s = basePlayerStats();
    const { stats, leveledUp } = addXp(s, 5);
    expect(leveledUp).toBe(false);
    expect(stats.level).toBe(1);
    expect(stats.xp).toBe(5);
  });

  it('经验足够升一级并提升属性', () => {
    const s = basePlayerStats();
    const { stats, leveledUp } = addXp(s, 20); // xpToNext(1)=20
    expect(leveledUp).toBe(true);
    expect(stats.level).toBe(2);
    expect(stats.xp).toBe(0);
    expect(stats.maxHp).toBe(115);
    expect(stats.attack).toBe(22);
  });

  it('可以连升多级', () => {
    const s = basePlayerStats();
    const { stats } = addXp(s, 1000);
    expect(stats.level).toBeGreaterThan(3);
  });

  it('不修改入参（不可变）', () => {
    const s = basePlayerStats();
    addXp(s, 100);
    expect(s.level).toBe(1);
    expect(s.xp).toBe(0);
  });
});

describe('enemyStats', () => {
  it('随楼层成长', () => {
    const weak = enemyStats(1, mulberry32(1));
    const strong = enemyStats(6, mulberry32(1));
    expect(strong.maxHp).toBeGreaterThan(weak.maxHp);
    expect(strong.attack).toBeGreaterThan(weak.attack);
    expect(strong.xp).toBeGreaterThan(weak.xp);
  });

  it('同种子结果一致', () => {
    expect(enemyStats(3, mulberry32(9))).toEqual(enemyStats(3, mulberry32(9)));
  });
});
