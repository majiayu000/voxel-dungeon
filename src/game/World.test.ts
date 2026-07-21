import { describe, expect, it, vi } from 'vitest';
import type { Stats } from '../combat/Stats';
import type { SuspendState } from '../meta/Save';
import { enemyCountForFloor, World } from './World';

describe('enemyCountForFloor', () => {
  it('前期逐层增加，后期最多生成 24 个敌人', () => {
    expect(enemyCountForFloor(1)).toBe(4);
    expect(enemyCountForFloor(10)).toBe(13);
    expect(enemyCountForFloor(100)).toBe(24);
  });
});

describe('World resume', () => {
  it('楼层建成回调看到的是已恢复的玩家状态', () => {
    const state: SuspendState = {
      seed: 12345,
      floor: 4,
      hp: 42,
      gold: 99,
      kills: 7,
      stats: {
        maxHp: 145,
        attack: 31,
        armor: 8,
        critChance: 0.2,
        moveSpeed: 6,
        level: 4,
        xp: 12,
      },
    };
    const initialStats: Stats = {
      maxHp: 100,
      attack: 18,
      armor: 5,
      critChance: 0.1,
      moveSpeed: 6,
      level: 1,
      xp: 0,
    };
    const player = {
      hp: initialStats.maxHp,
      gold: 0,
      kills: 0,
      stats: initialStats,
      restore: vi.fn((stats: Stats, hp: number, gold: number, kills: number) => {
        player.stats = { ...stats };
        player.hp = hp;
        player.gold = gold;
        player.kills = kills;
      }),
    };
    const world = Object.create(World.prototype) as World;
    let checkpoint: SuspendState | null = null;

    Object.assign(world, { player, floor: 0 });
    world.onFloorBuilt = () => {
      checkpoint = world.snapshot();
    };
    vi.spyOn(world, 'buildFloor').mockImplementation((floor) => {
      world.floor = floor;
      world.onFloorBuilt(floor);
    });

    world.resume(state);

    expect(checkpoint).toEqual(state);
  });
});
