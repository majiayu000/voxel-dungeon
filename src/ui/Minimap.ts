import { TILE, Tile } from '../dungeon/types';
import type { World } from '../game/World';
import { byId } from './dom';

/**
 * 俯视小地图：canvas 2D 绘制当前层地板/楼梯、拾取物、敌人与玩家朝向。
 * 只读游戏状态，不拼 HTML。
 */
export class Minimap {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;

  constructor() {
    this.canvas = byId('minimap') as HTMLCanvasElement;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('无法创建小地图 2D 上下文');
    this.ctx = ctx;
  }

  update(world: World): void {
    const grid = world.level.grid;
    const s = this.canvas.width / grid.width;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // 地板与楼梯（墙留作深色底）
    for (let y = 0; y < grid.height; y++) {
      for (let x = 0; x < grid.width; x++) {
        const t = grid.get(x, y);
        if (t === Tile.Wall) continue;
        ctx.fillStyle = t === Tile.Stairs ? '#3fae5a' : '#33334a';
        ctx.fillRect(x * s, y * s, s + 0.5, s + 0.5);
      }
    }

    // 拾取物
    ctx.fillStyle = '#ffd24a';
    for (const p of world.pickups) this.dot(p.mesh.position.x / TILE, p.mesh.position.z / TILE, s, 1.6);

    // 敌人
    ctx.fillStyle = '#e24545';
    for (const e of world.enemies) this.dot(e.mesh.position.x / TILE, e.mesh.position.z / TILE, s, 2);

    // 玩家 + 朝向
    const px = world.player.position.x / TILE;
    const pz = world.player.position.z / TILE;
    ctx.fillStyle = '#ffffff';
    this.dot(px, pz, s, 2.6);
    const a = world.player.facingAngle();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(px * s, pz * s);
    ctx.lineTo(px * s + Math.sin(a) * s * 2.2, pz * s + Math.cos(a) * s * 2.2);
    ctx.stroke();
  }

  private dot(cx: number, cy: number, s: number, r: number): void {
    this.ctx.beginPath();
    this.ctx.arc(cx * s, cy * s, r, 0, Math.PI * 2);
    this.ctx.fill();
  }

  setVisible(visible: boolean): void {
    this.canvas.classList.toggle('hidden', !visible);
  }
}
