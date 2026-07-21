import type * as THREE from 'three';
import type { AiContext } from '../ai/EnemyAI';
import { GameAudio } from '../audio/Audio';
import { computeHit } from '../combat/Damage';
import { rollDrop, rollEliteDrop } from '../combat/Loot';
import { mulberry32, randInt, type Rng } from '../core/Rng';
import { generateDungeon, type DungeonConfig, type DungeonLevel } from '../dungeon/DungeonGenerator';
import { type Cell, cellToWorld } from '../dungeon/types';
import type { Engine } from '../engine/Engine';
import type { Input } from '../engine/Input';
import { Enemy } from '../entities/Enemy';
import { pickEnemyType } from '../entities/enemyTypes';
import { Pickup } from '../entities/Pickup';
import { Player } from '../entities/Player';
import { Projectile } from '../entities/Projectile';
import type { SuspendState } from '../meta/Save';
import { DungeonMesh } from '../render/DungeonMesh';
import { Effects } from '../render/Effects';
import { PlayerView } from '../render/PlayerView';
import { Torches } from '../render/Torches';

const MAX_ENEMIES = 24;

export function enemyCountForFloor(floor: number): number {
  return Math.min(3 + Math.max(1, Math.floor(floor)), MAX_ENEMIES);
}

/**
 * 当前关卡世界：地牢 + 渲染 + 玩家 + 敌人 + 投射物 + 掉落物 + 特效 + 武器视角 + 音效。
 * 负责按楼层重建地牢、生成敌人（含精英）、结算战斗/掉落/成长、楼梯下探、存档与清理。
 */
export class World {
  level!: DungeonLevel;
  player: Player;
  floor = 0;
  enemies: Enemy[] = [];
  pickups: Pickup[] = [];
  projectiles: Projectile[] = [];
  readonly effects: Effects;
  readonly playerView: PlayerView;

  /** 每层建成后回调（用于 suspend 存档）。 */
  onFloorBuilt: (floor: number) => void = () => {};
  /** 命中敌人回调（用于飘伤害数字等 UI）。 */
  onDamage: (pos: THREE.Vector3, amount: number, crit: boolean) => void = () => {};

  /** AI 与世界的交互通道：远程敌人在此生成投射物。 */
  private readonly aiCtx: AiContext = {
    spawnProjectile: (from, damage, color) => {
      const target = this.player.position.clone();
      this.projectiles.push(new Projectile(this.engine.scene, this.level.grid, from, target, damage, color));
    },
  };

  private mesh: DungeonMesh | null = null;
  private torches: Torches | null = null;
  private rng: Rng = Math.random;
  private runSeed = 0;
  private stairsPrev = false;

  constructor(
    private engine: Engine,
    input: Input,
    private audio: GameAudio,
  ) {
    this.player = new Player(engine.camera, input);
    this.effects = new Effects(engine.scene);
    this.playerView = new PlayerView(engine.camera);
  }

  /** 开启新一局：重置玩家，从第 1 层开始。 */
  newRun(seed: number): void {
    this.runSeed = seed;
    this.rng = mulberry32(seed ^ 0x5bd1e995);
    this.player.reset();
    this.buildFloor(1);
  }

  /** 从 suspend 状态恢复：重建到指定层并还原玩家。 */
  resume(state: SuspendState): void {
    this.runSeed = state.seed;
    this.rng = mulberry32(state.seed ^ 0x5bd1e995);
    this.player.restore(state.stats, state.hp, state.gold, state.kills);
    this.buildFloor(state.floor);
  }

  /** 导出当前局状态用于存档。 */
  snapshot(): SuspendState {
    return {
      seed: this.runSeed,
      floor: this.floor,
      hp: this.player.hp,
      gold: this.player.gold,
      kills: this.player.kills,
      stats: { ...this.player.stats },
    };
  }

  /** 当前准星瞄准的敌人（用于 UI 目标高亮）。 */
  peekTarget(): Enemy | null {
    return this.player.peekTarget(this.enemies);
  }

  buildFloor(floor: number): void {
    this.clearEntities();
    this.floor = floor;
    const seed = this.runSeed + floor * 7919;

    const cfg: DungeonConfig = {
      width: 40,
      height: 40,
      minRoom: 4,
      maxRoom: 8,
      maxRooms: Math.min(6 + floor, 14),
      rng: mulberry32(seed),
    };
    this.level = generateDungeon(cfg);

    this.mesh = new DungeonMesh(this.level.grid, mulberry32(seed ^ 0x9e3779b9));
    this.engine.scene.add(this.mesh.group);

    this.torches = new Torches(this.level.rooms, mulberry32(seed ^ 0x2545f491));
    this.engine.scene.add(this.torches.group);

    this.spawnEnemies(enemyCountForFloor(floor), mulberry32(seed ^ 0x1b873593));
    this.player.enterFloor(this.level.grid, cellToWorld(this.level.start));
    this.stairsPrev = this.player.onStairs();
    this.onFloorBuilt(floor);
  }

  update(dt: number): void {
    if (this.player.update(dt)) {
      this.audio.dash();
      this.playerView.dash();
    }
    this.playerView.update(dt);
    this.effects.update(dt);
    this.torches?.update(dt);

    // 玩家攻击结算 + 特效 + 音效
    const atk = this.player.tryAttack(this.enemies);
    if (atk.fired) {
      this.audio.swing();
      this.playerView.swing();
      if (atk.enemy && atk.point) {
        const hit = computeHit({
          base: this.player.stats.attack,
          armor: atk.enemy.stats.armor,
          critChance: this.player.stats.critChance,
          rng: this.rng,
        });
        this.audio.hit(hit.crit);
        this.onDamage(atk.point, hit.damage, hit.crit);
        this.effects.spawn(atk.point, hit.crit ? 0xffe08a : 0xff6b5b, hit.crit ? 16 : 8, 4, 0.4);
        if (atk.enemy.takeDamage(hit.damage)) {
          this.audio.enemyDeath();
          const center = atk.enemy.mesh.position.clone();
          center.y = 1;
          this.effects.spawn(center, 0xb23b3b, 24, 6, 0.7);
          this.onEnemyKilled(atk.enemy);
        }
      }
    }

    // 敌人 AI + 投射物（统计玩家受伤以播音效）
    const hpBefore = this.player.hp;
    for (const e of this.enemies) e.update(dt, this.player, this.rng, this.aiCtx);
    for (const pr of this.projectiles) pr.update(dt, this.player);
    if (this.player.hp < hpBefore) this.audio.playerHurt();

    this.projectiles = this.projectiles.filter((pr) => {
      if (!pr.alive) {
        this.effects.spawn(pr.mesh.position, pr.color, 6, 3, 0.3);
        pr.dispose();
        return false;
      }
      return true;
    });

    // 拾取物收集
    for (const p of this.pickups) p.update(dt, this.player);
    if (this.pickups.some((p) => !p.alive)) this.audio.pickup();
    this.pickups = this.pickups.filter((p) => {
      if (!p.alive) {
        p.dispose();
        return false;
      }
      return true;
    });

    // 清理死亡敌人
    this.enemies = this.enemies.filter((e) => {
      if (!e.alive) {
        e.dispose();
        return false;
      }
      return true;
    });

    // 楼梯下探（边沿触发）
    const onStairs = this.player.onStairs();
    if (onStairs && !this.stairsPrev) {
      this.audio.descend();
      this.buildFloor(this.floor + 1);
      return;
    }
    this.stairsPrev = onStairs;
  }

  private onEnemyKilled(enemy: Enemy): void {
    this.player.kills += 1;
    if (this.player.gainXp(enemy.stats.xp)) this.audio.levelUp();
    const drop = enemy.elite ? rollEliteDrop(this.floor, this.rng) : rollDrop(this.floor, this.rng);
    if (drop) {
      const pos = { x: enemy.mesh.position.x, z: enemy.mesh.position.z };
      this.pickups.push(new Pickup(this.engine.scene, drop.kind, drop.amount, drop.rarity, pos));
    }
  }

  private spawnEnemies(count: number, rng: Rng): void {
    const rooms = this.level.rooms;
    const pool = rooms.length > 1 ? rooms.slice(1) : rooms;
    const eliteChance = Math.min(0.06 + this.floor * 0.02, 0.28);
    for (let i = 0; i < count; i++) {
      const room = pool[randInt(rng, 0, pool.length - 1)];
      const cell: Cell = {
        x: randInt(rng, room.x, room.x + room.w - 1),
        y: randInt(rng, room.y, room.y + room.h - 1),
      };
      this.enemies.push(
        new Enemy(this.engine.scene, {
          grid: this.level.grid,
          spawn: cell,
          floor: this.floor,
          rng,
          type: pickEnemyType(this.floor, rng),
          elite: rng() < eliteChance,
        }),
      );
    }
  }

  private clearEntities(): void {
    for (const e of this.enemies) e.dispose();
    for (const p of this.pickups) p.dispose();
    for (const pr of this.projectiles) pr.dispose();
    this.enemies = [];
    this.pickups = [];
    this.projectiles = [];
    this.effects.clear();
    if (this.torches) {
      this.engine.scene.remove(this.torches.group);
      this.torches.dispose();
      this.torches = null;
    }
    if (this.mesh) {
      this.engine.scene.remove(this.mesh.group);
      this.mesh.dispose();
      this.mesh = null;
    }
  }
}
