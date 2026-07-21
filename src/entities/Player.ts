import * as THREE from 'three';
import { addXp, basePlayerStats, type Stats } from '../combat/Stats';
import { type Grid, Tile, worldToCell } from '../dungeon/types';
import type { Input } from '../engine/Input';
import type { Enemy } from './Enemy';

const EYE_HEIGHT = 1.7;
const RADIUS = 0.9; // 碰撞半径
export const ATTACK_RANGE = 4.6;
const ATTACK_COOLDOWN = 0.42;
const AIM_RANGE = 30; // 目标高亮探测距离（比攻击距离远）
const MELEE_CONE_DOT = 0.78; // 近战辅助锥（约 39°半角）：朝向前方的敌人也能砍中

/** 一次攻击尝试的结果：是否挥出、命中的敌人、命中点。 */
export interface AttackResult {
  fired: boolean;
  enemy: Enemy | null;
  point: THREE.Vector3 | null;
}

/**
 * 玩家：第一人称移动 + 网格碰撞（轴分离贴墙滑动）+ 射线近战攻击 + 成长。
 * 相机位置即玩家位置。移动/碰撞走网格，攻击命中走 three 射线。
 */
export class Player {
  stats: Stats = basePlayerStats();
  hp = this.stats.maxHp;
  alive = true;
  gold = 0;
  kills = 0;

  private grid: Grid | null = null;
  private forward = new THREE.Vector3();
  private right = new THREE.Vector3();
  private readonly up = new THREE.Vector3(0, 1, 0);
  private move = new THREE.Vector3();
  private readonly toEnemy = new THREE.Vector3();
  private readonly raycaster = new THREE.Raycaster();
  private readonly screenCenter = new THREE.Vector2(0, 0);
  private attackCooldown = 0;

  constructor(
    private camera: THREE.PerspectiveCamera,
    private input: Input,
  ) {
    this.raycaster.far = ATTACK_RANGE;
  }

  get position(): THREE.Vector3 {
    return this.camera.position;
  }

  /** 新一局：重置属性、生命与局内统计。 */
  reset(): void {
    this.stats = basePlayerStats();
    this.hp = this.stats.maxHp;
    this.alive = true;
    this.gold = 0;
    this.kills = 0;
    this.attackCooldown = 0;
  }

  /** 从存档还原属性与局内统计。 */
  restore(stats: Stats, hp: number, gold: number, kills: number): void {
    this.stats = { ...stats };
    this.hp = Math.min(hp, this.stats.maxHp);
    this.gold = gold;
    this.kills = kills;
    this.alive = true;
    this.attackCooldown = 0;
  }

  /** 进入某一层：绑定网格并传送到出生点。 */
  enterFloor(grid: Grid, spawn: { x: number; z: number }): void {
    this.grid = grid;
    this.camera.position.set(spawn.x, EYE_HEIGHT, spawn.z);
  }

  update(dt: number): void {
    this.attackCooldown -= dt;
    if (!this.grid || !this.input.isLocked) return;

    this.camera.getWorldDirection(this.forward);
    this.forward.y = 0;
    if (this.forward.lengthSq() < 1e-6) this.forward.set(0, 0, -1);
    this.forward.normalize();
    this.right.crossVectors(this.forward, this.up).normalize();

    this.move.set(0, 0, 0);
    if (this.input.key('KeyW')) this.move.add(this.forward);
    if (this.input.key('KeyS')) this.move.sub(this.forward);
    if (this.input.key('KeyD')) this.move.add(this.right);
    if (this.input.key('KeyA')) this.move.sub(this.right);
    if (this.move.lengthSq() === 0) return;

    this.move.normalize().multiplyScalar(this.stats.moveSpeed * dt);
    this.tryMove(this.move.x, this.move.z);
  }

  /** 近战攻击：屏幕中心发射线，返回挥击结果（是否挥出 / 命中敌人 / 命中点）。 */
  tryAttack(enemies: Enemy[]): AttackResult {
    if (this.attackCooldown > 0 || !this.input.isLocked || !this.input.mouseDown) {
      return { fired: false, enemy: null, point: null };
    }
    this.attackCooldown = ATTACK_COOLDOWN;

    // 1) 精确命中：屏幕中心射线打中敌人模型
    this.raycaster.setFromCamera(this.screenCenter, this.camera);
    const hits = this.raycaster.intersectObjects(
      enemies.map((e) => e.mesh),
      false,
    );
    if (hits.length > 0) {
      const enemy = enemies.find((e) => e.mesh === hits[0].object) ?? null;
      if (enemy) return { fired: true, enemy, point: hits[0].point.clone() };
    }

    // 2) 近战辅助：攻击距离内、处于视角前方锥体中的最近敌人也算命中（近战手感）
    this.camera.getWorldDirection(this.forward);
    let best: Enemy | null = null;
    let bestDist = Infinity;
    for (const e of enemies) {
      if (!e.alive) continue;
      this.toEnemy.copy(e.mesh.position).sub(this.camera.position);
      const dist = this.toEnemy.length();
      if (dist > ATTACK_RANGE) continue;
      this.toEnemy.normalize();
      if (this.forward.dot(this.toEnemy) < MELEE_CONE_DOT) continue;
      if (dist < bestDist) {
        bestDist = dist;
        best = e;
      }
    }
    if (best) {
      const point = best.mesh.position.clone();
      point.y += 0.9 * best.type.scale;
      return { fired: true, enemy: best, point };
    }

    return { fired: true, enemy: null, point: null };
  }

  /** 瞄准探测：返回准星指向的最近敌人（不触发攻击、不进冷却），用于目标高亮。 */
  peekTarget(enemies: Enemy[]): Enemy | null {
    if (!this.input.isLocked) return null;
    const prevFar = this.raycaster.far;
    this.raycaster.far = AIM_RANGE;
    this.raycaster.setFromCamera(this.screenCenter, this.camera);
    const meshes = enemies.map((e) => e.mesh);
    const hits = this.raycaster.intersectObjects(meshes, false);
    this.raycaster.far = prevFar;
    if (hits.length === 0) return null;
    return enemies.find((e) => e.mesh === hits[0].object) ?? null;
  }

  /** 视角朝向（绕 Y 轴弧度），供小地图绘制。 */
  facingAngle(): number {
    this.camera.getWorldDirection(this.forward);
    return Math.atan2(this.forward.x, this.forward.z);
  }

  takeDamage(dmg: number): void {
    if (!this.alive) return;
    this.hp -= dmg;
    if (this.hp <= 0) {
      this.hp = 0;
      this.alive = false;
    }
  }

  heal(amount: number): void {
    this.hp = Math.min(this.stats.maxHp, this.hp + amount);
  }

  addGold(amount: number): void {
    this.gold += amount;
  }

  /** 永久属性增益（拾取物）。maxHp 同时抬升当前血量。 */
  buff(stat: 'attack' | 'armor' | 'maxhp', amount: number): void {
    if (stat === 'maxhp') {
      this.stats.maxHp += amount;
      this.hp += amount;
    } else {
      this.stats[stat] += amount;
    }
  }

  /** 获得经验，可能升级（升级回满血）。返回是否升级。 */
  gainXp(amount: number): boolean {
    const result = addXp(this.stats, amount);
    this.stats = result.stats;
    if (result.leveledUp) this.hp = this.stats.maxHp;
    return result.leveledUp;
  }

  /** 站在楼梯格上？ */
  onStairs(): boolean {
    if (!this.grid) return false;
    const c = worldToCell(this.position.x, this.position.z);
    return this.grid.get(c.x, c.y) === Tile.Stairs;
  }

  private tryMove(dx: number, dz: number): void {
    const p = this.camera.position;
    if (this.isFree(p.x + dx, p.z)) p.x += dx;
    if (this.isFree(p.x, p.z + dz)) p.z += dz;
  }

  private isFree(x: number, z: number): boolean {
    const r = RADIUS;
    return (
      this.walkable(x, z) &&
      this.walkable(x + r, z) &&
      this.walkable(x - r, z) &&
      this.walkable(x, z + r) &&
      this.walkable(x, z - r)
    );
  }

  private walkable(x: number, z: number): boolean {
    if (!this.grid) return false;
    const c = worldToCell(x, z);
    return this.grid.isWalkable(c.x, c.y);
  }
}
