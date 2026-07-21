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

describe('Player dash', () => {
  function setupDash(): {
    player: Player;
    camera: THREE.PerspectiveCamera;
    pressDash: () => void;
  } {
    const grid = Grid.filled(8, 8, Tile.Floor);
    const camera = new THREE.PerspectiveCamera(70, 1, 0.1, 100);
    let dashPressed = false;
    const input = {
      isLocked: true,
      mouseDown: true,
      key: (code: string) => code === 'KeyD',
      consumePress: (code: string) => {
        if (code !== 'Space' || !dashPressed) return false;
        dashPressed = false;
        return true;
      },
    } as unknown as Input;
    const player = new Player(camera, input);
    player.enterFloor(grid, { x: 12, z: 12 });
    return {
      player,
      camera,
      pressDash: () => {
        dashPressed = true;
      },
    };
  }

  it('按下 Space 后沿移动方向闪避并进入冷却', () => {
    const { player, camera, pressDash } = setupDash();
    const startX = camera.position.x;
    pressDash();

    expect(player.update(1 / 60)).toBe(true);
    expect(camera.position.x).toBeGreaterThan(startX);
    expect(player.isDashing).toBe(true);
    expect(player.dashCooldownRemaining).toBeGreaterThan(1);
  });

  it('闪避期间无法攻击且免疫伤害', () => {
    const { player, pressDash } = setupDash();
    pressDash();
    player.update(1 / 60);
    const hpBefore = player.hp;

    player.takeDamage(25);

    expect(player.hp).toBe(hpBefore);
    expect(player.tryAttack([]).fired).toBe(false);
  });

  it('闪避结束后恢复受伤与攻击', () => {
    const { player, pressDash } = setupDash();
    pressDash();
    player.update(1 / 60);
    player.update(0.3);

    player.takeDamage(25);

    expect(player.hp).toBe(player.stats.maxHp - 25);
    expect(player.tryAttack([]).fired).toBe(true);
    expect(player.isDashing).toBe(false);
  });

  it('冷却期间不能连续触发闪避', () => {
    const { player, pressDash } = setupDash();
    pressDash();
    expect(player.update(1 / 60)).toBe(true);
    player.update(0.3);
    pressDash();

    expect(player.update(1 / 60)).toBe(false);
    expect(player.update(2)).toBe(false);
  });
});
