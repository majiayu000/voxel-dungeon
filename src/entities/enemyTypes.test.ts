import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../core/Rng';
import { BRUTE, CASTER, GRUNT, SWARMER, pickEnemyType } from './enemyTypes';

function idsForFloor(floor: number, n = 400): Set<string> {
  const seen = new Set<string>();
  for (let i = 0; i < n; i++) seen.add(pickEnemyType(floor, mulberry32(i)).id);
  return seen;
}

describe('pickEnemyType', () => {
  it('第 1 层只有 grunt/swarmer', () => {
    const ids = idsForFloor(1);
    expect(ids).toEqual(new Set(['grunt', 'swarmer']));
  });

  it('第 2 层解锁 brute，但没有 caster', () => {
    const ids = idsForFloor(2);
    expect(ids.has('brute')).toBe(true);
    expect(ids.has('caster')).toBe(false);
  });

  it('第 3 层解锁 caster', () => {
    const ids = idsForFloor(3);
    expect(ids.has('caster')).toBe(true);
  });
});

describe('敌人类型数据', () => {
  it('倍率均为正', () => {
    for (const t of [GRUNT, SWARMER, BRUTE, CASTER]) {
      expect(t.hpMul).toBeGreaterThan(0);
      expect(t.attackMul).toBeGreaterThan(0);
      expect(t.speedMul).toBeGreaterThan(0);
      expect(t.scale).toBeGreaterThan(0);
    }
  });

  it('只有 caster 是远程', () => {
    expect(CASTER.ranged).toBe(true);
    expect(GRUNT.ranged).toBe(false);
    expect(SWARMER.ranged).toBe(false);
    expect(BRUTE.ranged).toBe(false);
  });
});
