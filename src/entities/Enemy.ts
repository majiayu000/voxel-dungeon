import * as THREE from 'three';
import { EnemyAI, type AiContext } from '../ai/EnemyAI';
import { enemyStats, type Stats } from '../combat/Stats';
import type { Rng } from '../core/Rng';
import { type Cell, type Grid, cellToWorld, worldToCell } from '../dungeon/types';
import { GRUNT, type EnemyType } from './enemyTypes';
import type { Player } from './Player';

let nextId = 0;

/** 精英怪倍率：更强、更大、更多经验。 */
const ELITE = { hp: 2.2, attack: 1.4, speed: 0.9, xp: 2.0, scale: 1.18 };

export interface EnemyOptions {
  grid: Grid;
  spawn: Cell;
  floor: number;
  rng: Rng;
  type?: EnemyType;
  elite?: boolean;
}

/**
 * 敌人：带血量的网格实体，由 EnemyAI 驱动。
 * mesh（身体 box）是射线命中框；按类型用几何拼出差异化外观（角/刺/护肩/法师帽+法球），
 * 精英加金冠。纯几何零资源。
 */
export class Enemy {
  readonly id = nextId++;
  readonly type: EnemyType;
  readonly elite: boolean;
  readonly mesh: THREE.Mesh;
  stats: Stats;
  hp: number;
  alive = true;

  private readonly grid: Grid;
  private readonly ai: EnemyAI;
  private readonly baseColor: THREE.Color;

  constructor(
    private scene: THREE.Scene,
    opts: EnemyOptions,
  ) {
    this.type = opts.type ?? GRUNT;
    this.elite = opts.elite ?? false;
    this.grid = opts.grid;

    const base = enemyStats(opts.floor, opts.rng);
    const eHp = this.elite ? ELITE.hp : 1;
    const eAtk = this.elite ? ELITE.attack : 1;
    const eSpd = this.elite ? ELITE.speed : 1;
    const eXp = this.elite ? ELITE.xp : 1;
    this.stats = {
      ...base,
      maxHp: Math.round(base.maxHp * this.type.hpMul * eHp),
      attack: Math.round(base.attack * this.type.attackMul * eAtk),
      moveSpeed: base.moveSpeed * this.type.speedMul * eSpd,
      xp: Math.round(base.xp * this.type.xpMul * eXp),
    };
    this.hp = this.stats.maxHp;

    this.baseColor = new THREE.Color(this.type.color);
    const s = this.type.scale * (this.elite ? ELITE.scale : 1);
    const mat = new THREE.MeshStandardMaterial({ color: this.baseColor.clone(), roughness: 0.7 });
    this.mesh = new THREE.Mesh(new THREE.BoxGeometry(1.4 * s, 1.8 * s, 1.4 * s), mat);
    this.mesh.castShadow = true;
    const w = cellToWorld(opts.spawn);
    this.mesh.position.set(w.x, 0.9 * s, w.z);
    scene.add(this.mesh);

    this.buildVisual(s);
    this.ai = new EnemyAI(this);
  }

  /** 按类型拼装外观（局部坐标，+z 为正面）。身体本体留作射线命中框。 */
  private buildVisual(s: number): void {
    const dark = new THREE.MeshStandardMaterial({ color: 0x2a2a30, roughness: 0.85 });
    const add = (
      geo: THREE.BufferGeometry,
      mat: THREE.Material,
      x: number,
      y: number,
      z: number,
      rx = 0,
      ry = 0,
    ) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x * s, y * s, z * s);
      m.rotation.set(rx, ry, 0);
      m.scale.setScalar(s);
      m.castShadow = true;
      this.mesh.add(m);
    };

    // 发光眼睛（全体，+z 正面）
    const eyeMat = new THREE.MeshStandardMaterial({
      color: 0xffe08a,
      emissive: 0xffcc44,
      emissiveIntensity: 1.5,
    });
    const eyeGeo = new THREE.BoxGeometry(0.16, 0.12, 0.06);
    add(eyeGeo, eyeMat, -0.3, 0.45, 0.71);
    add(eyeGeo, eyeMat, 0.3, 0.45, 0.71);

    switch (this.type.id) {
      case 'grunt': {
        const horn = new THREE.ConeGeometry(0.13, 0.42, 5);
        add(horn, dark, -0.35, 1.05, 0);
        add(horn, dark, 0.35, 1.05, 0);
        break;
      }
      case 'swarmer': {
        const spike = new THREE.ConeGeometry(0.24, 0.75, 6);
        add(spike, dark, 0, 0.1, 0.78, Math.PI / 2); // 朝前的尖刺
        break;
      }
      case 'brute': {
        const shoulder = new THREE.BoxGeometry(0.6, 0.55, 0.75);
        add(shoulder, dark, -0.98, 0.55, 0);
        add(shoulder, dark, 0.98, 0.55, 0);
        break;
      }
      case 'caster': {
        const hat = new THREE.ConeGeometry(0.5, 0.85, 4);
        add(hat, new THREE.MeshStandardMaterial({ color: this.type.color, roughness: 0.7 }), 0, 1.28, 0, 0, Math.PI / 4);
        const orb = new THREE.Mesh(
          new THREE.SphereGeometry(0.24, 12, 12),
          new THREE.MeshStandardMaterial({ color: this.type.color, emissive: this.type.color, emissiveIntensity: 1.3 }),
        );
        orb.position.set(0.68 * s, 0.1 * s, 0.55 * s);
        orb.castShadow = true;
        this.mesh.add(orb);
        break;
      }
    }

    if (this.elite) {
      const crown = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.2, 0.5),
        new THREE.MeshStandardMaterial({ color: 0xffd24a, emissive: 0x5a4a10, roughness: 0.5 }),
      );
      crown.position.set(0, 1.02 * s, 0);
      this.mesh.add(crown);
    }
  }

  get cell(): Cell {
    return worldToCell(this.mesh.position.x, this.mesh.position.z);
  }

  update(dt: number, player: Player, rng: Rng, ctx: AiContext): void {
    if (!this.alive) return;
    this.ai.update(dt, this.grid, player, rng, ctx);
  }

  /** 返回是否死亡。命中时短暂闪白反馈。 */
  takeDamage(dmg: number): boolean {
    this.hp -= dmg;
    const mat = this.mesh.material as THREE.MeshStandardMaterial;
    mat.color.setRGB(1, 1, 1);
    setTimeout(() => mat.color.copy(this.baseColor), 60);
    if (this.hp <= 0) {
      this.hp = 0;
      this.alive = false;
      return true;
    }
    return false;
  }

  dispose(): void {
    this.scene.remove(this.mesh);
    this.mesh.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.geometry.dispose();
        const mat = o.material as THREE.Material | THREE.Material[];
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
        else mat.dispose();
      }
    });
  }
}
