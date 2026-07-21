import * as THREE from 'three';
import { hasLineOfSight } from '../dungeon/Pathfinding';
import { worldToCell } from '../dungeon/types';
import type { Enemy } from '../entities/Enemy';
import { ATTACK_RANGE } from '../entities/Player';
import type { World } from '../game/World';

const MAX_DIST = 45; // 超过此距离不显示
const FLASH_TIME = 0.18; // 受击闪白时长（秒）
const ELITE_GOLD = '#ffd24a';

interface BarFx {
  prevHp: number;
  flash: number;
}

/**
 * 怪物头顶信息牌 + 目标高亮：全屏 2D 覆盖层，把敌人 3D 位置投影到屏幕绘制。
 * 信息牌：种类名 + 等级 + 血条（随距离缩放、血量变色、受击闪白）+ 血量数字；
 * 精英怪金框★标识；瞄准时脚下出现脉冲光圈（可攻击距离内更亮）。
 */
export class EnemyBars {
  private canvas: HTMLCanvasElement | null;
  private ctx: CanvasRenderingContext2D | null = null;
  private readonly fx = new Map<number, BarFx>();
  private readonly proj = new THREE.Vector3();
  private readonly foot = new THREE.Vector3();
  private readonly camDir = new THREE.Vector3();
  private readonly toEnemy = new THREE.Vector3();
  private cssW = innerWidth;
  private cssH = innerHeight;
  private elapsed = 0;

  constructor() {
    this.canvas = document.getElementById('enemy-bars') as HTMLCanvasElement | null;
    if (this.canvas) {
      this.ctx = this.canvas.getContext('2d');
      this.resize();
      addEventListener('resize', () => this.resize());
    }
    if (!this.ctx) {
      throw new Error('无法初始化 #enemy-bars 画布');
    }
  }

  private resize(): void {
    if (!this.canvas || !this.ctx) return;
    const dpr = Math.min(devicePixelRatio, 2);
    this.cssW = innerWidth;
    this.cssH = innerHeight;
    this.canvas.width = this.cssW * dpr;
    this.canvas.height = this.cssH * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  update(dt: number, world: World, camera: THREE.Camera, target: Enemy | null): void {
    if (!this.ctx) return;
    const ctx = this.ctx;
    this.elapsed += dt;
    ctx.clearRect(0, 0, this.cssW, this.cssH);

    const grid = world.level.grid;
    const playerCell = worldToCell(world.player.position.x, world.player.position.z);
    camera.getWorldDirection(this.camDir);

    const seen = new Set<number>();
    for (const e of world.enemies) {
      if (!e.alive) continue;
      seen.add(e.id);

      const pos = e.mesh.position;
      this.toEnemy.set(pos.x, pos.y, pos.z).sub(camera.position);
      const dist = this.toEnemy.length();
      if (dist > MAX_DIST) continue;
      if (this.camDir.dot(this.toEnemy) <= 0) continue; // 相机背面

      const isTarget = target?.id === e.id;

      // 目标脚下脉冲光圈
      if (isTarget) this.drawTargetRing(pos, dist, camera);

      // 头顶锚点
      const topY = pos.y + 0.9 * e.type.scale * (e.elite ? 1.18 : 1) + 0.55;
      this.proj.set(pos.x, topY, pos.z).project(camera);
      if (this.proj.z > 1 || this.proj.z < -1) continue;
      const sx = (this.proj.x * 0.5 + 0.5) * this.cssW;
      const sy = (0.5 - this.proj.y * 0.5) * this.cssH;

      // 受击闪白状态
      let fx = this.fx.get(e.id);
      if (!fx) {
        fx = { prevHp: e.hp, flash: 0 };
        this.fx.set(e.id, fx);
      }
      if (e.hp < fx.prevHp) fx.flash = FLASH_TIME;
      fx.prevHp = e.hp;
      fx.flash = Math.max(0, fx.flash - dt);

      const los = hasLineOfSight(grid, worldToCell(pos.x, pos.z), playerCell);
      this.drawPlate(sx, sy, dist, e, fx.flash, los, isTarget);
    }

    for (const id of this.fx.keys()) if (!seen.has(id)) this.fx.delete(id);
  }

  private drawTargetRing(pos: THREE.Vector3, dist: number, camera: THREE.Camera): void {
    const ctx = this.ctx;
    if (!ctx) return;
    this.foot.set(pos.x, 0.05, pos.z).project(camera);
    if (this.foot.z > 1 || this.foot.z < -1) return;
    const fx = (this.foot.x * 0.5 + 0.5) * this.cssW;
    const fy = (0.5 - this.foot.y * 0.5) * this.cssH;

    const inRange = dist <= ATTACK_RANGE;
    const rw = Math.min(74, Math.max(22, 320 / dist));
    const pulse = 0.55 + 0.45 * Math.sin(this.elapsed * 7);

    ctx.globalAlpha = (inRange ? 0.95 : 0.4) * pulse;
    ctx.strokeStyle = inRange ? '#ffffff' : 'rgba(255,255,255,0.55)';
    ctx.lineWidth = inRange ? 2.5 : 1.5;
    ctx.beginPath();
    ctx.ellipse(fx, fy, rw / 2, rw * 0.19, 0, 0, Math.PI * 2);
    ctx.stroke();
    if (inRange) {
      ctx.globalAlpha = 0.25 * pulse;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(fx, fy, rw / 2, rw * 0.19, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  private drawPlate(
    x: number,
    y: number,
    dist: number,
    e: Enemy,
    flash: number,
    los: boolean,
    isTarget: boolean,
  ): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const ratio = Math.max(0, e.hp / e.stats.maxHp);
    const base = Math.min(96, Math.max(28, 380 / dist));
    const w = base * (isTarget ? 1.15 : 1) * (e.elite ? 1.1 : 1);
    const h = Math.max(4, w * 0.085);
    const left = x - w / 2;
    const typeHex = '#' + e.type.color.toString(16).padStart(6, '0');
    const frameColor = e.elite ? ELITE_GOLD : typeHex;

    ctx.globalAlpha = los ? 1 : 0.3;
    ctx.textAlign = 'center';

    // 名称 + 等级（精英金色★）
    if (w >= 40) {
      const nameSize = Math.round(Math.min(14, w * 0.15) * (e.elite ? 1.12 : 1));
      ctx.font = `600 ${nameSize}px "PingFang SC", "Microsoft YaHei", sans-serif`;
      ctx.shadowColor = 'rgba(0,0,0,0.95)';
      ctx.shadowBlur = 4;
      ctx.fillStyle = e.elite ? ELITE_GOLD : typeHex;
      ctx.fillText(`${e.elite ? '★ ' : ''}${e.type.label} · Lv${e.stats.level}`, x, y - 6);
      ctx.shadowBlur = 0;
    }

    // 血条底
    ctx.fillStyle = 'rgba(8, 8, 14, 0.78)';
    ctx.fillRect(left - 1, y - 1, w + 2, h + 2);

    // 血量填充（绿→红）
    ctx.fillStyle = `hsl(${ratio * 115}, 75%, 52%)`;
    ctx.fillRect(left, y, w * ratio, h);

    // 受击闪白
    if (flash > 0) {
      ctx.fillStyle = `rgba(255,255,255,${(flash / FLASH_TIME) * 0.85})`;
      ctx.fillRect(left, y, w, h);
    }

    // 描边（精英金框加粗 + 目标高亮外圈）
    ctx.strokeStyle = frameColor;
    ctx.lineWidth = e.elite ? 2 : 1;
    ctx.strokeRect(left - 1.5, y - 1.5, w + 3, h + 3);
    if (isTarget) {
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth = 1;
      ctx.strokeRect(left - 3.5, y - 3.5, w + 7, h + 7);
    }

    // 血量数字（足够近才显示）
    if (w >= 56) {
      ctx.font = '10px "PingFang SC", "Microsoft YaHei", sans-serif';
      ctx.fillStyle = 'rgba(235,235,245,0.85)';
      ctx.shadowColor = 'rgba(0,0,0,0.9)';
      ctx.shadowBlur = 3;
      ctx.fillText(`${Math.ceil(e.hp)} / ${e.stats.maxHp}`, x, y + h + 11);
      ctx.shadowBlur = 0;
    }

    ctx.globalAlpha = 1;
  }

  setVisible(visible: boolean): void {
    this.canvas?.classList.toggle('hidden', !visible);
  }
}
