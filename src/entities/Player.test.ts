import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { Grid, Tile } from '../dungeon/types';
import type { Input } from '../engine/Input';
import { Enemy } from './Enemy';
import { Player } from './Player';
import { GRUNT } from './enemyTypes';

function setup(blocked: boolean): { player: Player; enemy: Enemy } {
  const grid = Grid.filled(5, 3, Tile.Floor);
  if (blocked) grid.set(2, 1, Tile.Wall);

  const camera = new THREE.PerspectiveCamera(70, 1, 0.1, 100);
  const input = {
    isLocked: true,
    mouseDown: true,
    key: () => false,
  } as unknown as Input;
  const player = new Player(camera, input);
  player.enterFloor(grid, { x: 5.9, z: 4 });

  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.8, 1.4));
  mesh.position.set(10.1, 0.9, 4);
  mesh.updateMatrixWorld(true);
  camera.lookAt(mesh.position);
  camera.updateMatrixWorld(true);

  const enemy = {
    alive: true,
    mesh,
    type: GRUNT,
    get cell() {
      return { x: 3, y: 1 };
    },
  } as unknown as Enemy;
  return { player, enemy };
}

describe('Player target visibility', () => {
  it('不会隔着墙缝高亮敌人', () => {
    const { player, enemy } = setup(true);
    expect(player.peekTarget([enemy])).toBeNull();
  });

  it('不会隔着墙缝攻击敌人', () => {
    const { player, enemy } = setup(true);
    expect(player.tryAttack([enemy])).toEqual({ fired: true, enemy: null, point: null });
  });

  it('视线畅通时仍可高亮并攻击敌人', () => {
    const { player, enemy } = setup(false);
    expect(player.peekTarget([enemy])).toBe(enemy);
    expect(player.tryAttack([enemy]).enemy).toBe(enemy);
  });
});
