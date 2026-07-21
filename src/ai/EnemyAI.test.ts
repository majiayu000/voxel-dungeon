import * as THREE from 'three';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Stats } from '../combat/Stats';
import { Grid, Tile } from '../dungeon/types';
import type { Enemy } from '../entities/Enemy';
import { GRUNT } from '../entities/enemyTypes';
import type { Player } from '../entities/Player';
import { EnemyAI, type AiContext } from './EnemyAI';

const pathfinding = vi.hoisted(() => ({
  findPath: vi.fn(),
  hasLineOfSight: vi.fn(),
}));

vi.mock('../dungeon/Pathfinding', () => pathfinding);

const STATS: Stats = {
  maxHp: 100,
  attack: 10,
  armor: 3,
  critChance: 0,
  moveSpeed: 0,
  level: 1,
  xp: 0,
};

function setupAi(): { ai: EnemyAI; grid: Grid; player: Player; ctx: AiContext } {
  const mesh = new THREE.Mesh();
  mesh.position.set(0, 0.9, 0);
  const enemy = {
    id: 0,
    mesh,
    stats: { ...STATS },
    type: GRUNT,
  } as unknown as Enemy;
  const player = {
    position: new THREE.Vector3(12, 1.7, 0),
    stats: { ...STATS },
    takeDamage: vi.fn(),
  } as unknown as Player;
  return {
    ai: new EnemyAI(enemy),
    grid: Grid.filled(8, 8, Tile.Floor),
    player,
    ctx: { spawnProjectile: vi.fn() },
  };
}

describe('EnemyAI scheduling', () => {
  beforeEach(() => {
    pathfinding.findPath.mockReset().mockReturnValue([
      { x: 1, y: 0 },
      { x: 2, y: 0 },
    ]);
    pathfinding.hasLineOfSight.mockReset().mockReturnValue(true);
  });

  it('一秒内不会按 60Hz 重复计算视线', () => {
    const { ai, grid, player, ctx } = setupAi();
    for (let i = 0; i < 60; i++) ai.update(1 / 60, grid, player, () => 0.5, ctx);

    expect(pathfinding.hasLineOfSight.mock.calls.length).toBeGreaterThanOrEqual(7);
    expect(pathfinding.hasLineOfSight.mock.calls.length).toBeLessThanOrEqual(10);
  });

  it('玩家目标格不变时不会定时重复运行 A*', () => {
    const { ai, grid, player, ctx } = setupAi();
    for (let i = 0; i < 120; i++) ai.update(1 / 60, grid, player, () => 0.5, ctx);
    expect(pathfinding.findPath).toHaveBeenCalledOnce();
  });

  it('玩家进入新格子后立即重新规划路径', () => {
    const { ai, grid, player, ctx } = setupAi();
    ai.update(1 / 60, grid, player, () => 0.5, ctx);
    player.position.x = 16;
    ai.update(0.13, grid, player, () => 0.5, ctx);

    expect(pathfinding.findPath).toHaveBeenCalledTimes(2);
  });
});
