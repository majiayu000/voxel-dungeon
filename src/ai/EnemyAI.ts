import * as THREE from 'three';
import { computeHit } from '../combat/Damage';
import type { Rng } from '../core/Rng';
import { type Cell, type Grid, cellToWorld, worldToCell } from '../dungeon/types';
import { findPath, hasLineOfSight } from '../dungeon/Pathfinding';
import type { Enemy } from '../entities/Enemy';
import type { Player } from '../entities/Player';

export type AIState = 'idle' | 'chase' | 'attack';

/** AI 与世界的交互通道：远程敌人通过它生成投射物。 */
export interface AiContext {
  spawnProjectile: (from: THREE.Vector3, damage: number, color: number) => void;
}

const SIGHT_RANGE = 26;
const ATTACK_RANGE = 2.3;
const RANGED_RANGE = 16;
const RANGED_MIN = 4.5; // 比这更近就后退拉开距离
const ATTACK_COOLDOWN = 1.0;
const RANGED_COOLDOWN = 1.8;
const REPATH_INTERVAL = 0.5;

/**
 * 敌人 AI 状态机：idle → chase（A* 追击）→ attack。
 * 近战贴脸攻击；远程在射程内投射、过近则后退、过远则靠近。视线由网格判定。
 */
export class EnemyAI {
  state: AIState = 'idle';
  private path: Cell[] = [];
  private repath = 0;
  private cooldown = 0;

  constructor(private enemy: Enemy) {}

  update(dt: number, grid: Grid, player: Player, rng: Rng, ctx: AiContext): void {
    this.cooldown -= dt;
    const ep = this.enemy.mesh.position;
    const pp = player.position;
    const dx = pp.x - ep.x;
    const dz = pp.z - ep.z;
    const dist = Math.hypot(dx, dz);

    const enemyCell = worldToCell(ep.x, ep.z);
    const playerCell = worldToCell(pp.x, pp.z);
    const canSee = dist <= SIGHT_RANGE && hasLineOfSight(grid, enemyCell, playerCell);

    if (!canSee) {
      this.state = 'idle';
      this.path = [];
      return;
    }

    if (this.enemy.type.ranged) {
      this.updateRanged(dt, grid, player, rng, ctx, dist, enemyCell, playerCell);
    } else {
      this.updateMelee(dt, grid, player, rng, dist, enemyCell, playerCell);
    }
  }

  private updateMelee(
    dt: number,
    grid: Grid,
    player: Player,
    rng: Rng,
    dist: number,
    enemyCell: Cell,
    playerCell: Cell,
  ): void {
    if (dist <= ATTACK_RANGE) {
      this.state = 'attack';
      this.faceToward(player.position);
      if (this.cooldown <= 0) {
        this.cooldown = ATTACK_COOLDOWN;
        const hit = computeHit({
          base: this.enemy.stats.attack,
          armor: player.stats.armor,
          critChance: this.enemy.stats.critChance,
          rng,
        });
        player.takeDamage(hit.damage);
      }
      return;
    }
    this.chase(dt, grid, enemyCell, playerCell);
  }

  private updateRanged(
    dt: number,
    grid: Grid,
    player: Player,
    rng: Rng,
    ctx: AiContext,
    dist: number,
    enemyCell: Cell,
    playerCell: Cell,
  ): void {
    this.faceToward(player.position);

    if (dist <= RANGED_RANGE && dist >= RANGED_MIN) {
      this.state = 'attack';
      if (this.cooldown <= 0) {
        this.cooldown = RANGED_COOLDOWN;
        const hit = computeHit({
          base: this.enemy.stats.attack,
          armor: player.stats.armor,
          critChance: this.enemy.stats.critChance,
          rng,
        });
        const from = this.enemy.mesh.position.clone();
        from.y = 1.4;
        ctx.spawnProjectile(from, hit.damage, this.enemy.type.color);
      }
      return;
    }

    if (dist < RANGED_MIN) {
      this.retreat(dt, grid, player);
      return;
    }
    this.chase(dt, grid, enemyCell, playerCell);
  }

  private chase(dt: number, grid: Grid, enemyCell: Cell, playerCell: Cell): void {
    this.state = 'chase';
    this.repath -= dt;
    if (this.repath <= 0 || this.path.length === 0) {
      this.repath = REPATH_INTERVAL;
      this.path = findPath(grid, enemyCell, playerCell) ?? [];
    }
    this.followPath(dt);
  }

  /** 直线远离玩家（可走才走），拉开射击距离。 */
  private retreat(dt: number, grid: Grid, player: Player): void {
    this.state = 'chase';
    const ep = this.enemy.mesh.position;
    const pp = player.position;
    let ax = ep.x - pp.x;
    let az = ep.z - pp.z;
    const len = Math.hypot(ax, az) || 1;
    ax /= len;
    az /= len;
    const step = this.enemy.stats.moveSpeed * dt;
    const nx = ep.x + ax * step;
    const nz = ep.z + az * step;
    if (this.walkable(grid, nx, nz)) {
      ep.x = nx;
      ep.z = nz;
    }
  }

  private followPath(dt: number): void {
    if (this.path.length === 0) return;
    const next = cellToWorld(this.path[0]);
    const ep = this.enemy.mesh.position;
    const dx = next.x - ep.x;
    const dz = next.z - ep.z;
    const d = Math.hypot(dx, dz);
    const step = this.enemy.stats.moveSpeed * dt;
    if (d <= step || d < 0.05) {
      ep.x = next.x;
      ep.z = next.z;
      this.path.shift();
    } else {
      ep.x += (dx / d) * step;
      ep.z += (dz / d) * step;
      this.faceDir(dx, dz);
    }
  }

  private walkable(grid: Grid, x: number, z: number): boolean {
    const c = worldToCell(x, z);
    return grid.isWalkable(c.x, c.y);
  }

  private faceToward(target: THREE.Vector3): void {
    const ep = this.enemy.mesh.position;
    this.faceDir(target.x - ep.x, target.z - ep.z);
  }

  private faceDir(dx: number, dz: number): void {
    this.enemy.mesh.rotation.y = Math.atan2(dx, dz);
  }
}
