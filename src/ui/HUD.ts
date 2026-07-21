import { xpToNext } from '../combat/Stats';
import type { Player } from '../entities/Player';
import { byId } from './dom';

/** 像素爱心点阵（7×7）。 */
const HEART = ['.XX.XX.', 'XXXXXXX', 'XXXXXXX', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...'];
const HW = 7;
const HH = 7;
const HP_PX = 4; // 每个“像素”的显示尺寸
const HEART_GAP = 3;
const HEART_COUNT = 10; // 固定 10 颗心，每颗 = 最大生命/10

type HeartMode = 'full' | 'half' | 'empty';

/**
 * HUD：“我的世界”风格——像素红心血量 + 绿色经验条 + 层数/击杀/金币。
 * 全部 canvas 绘制（nearest 像素感），只读游戏状态。
 */
export class HUD {
  private readonly root: HTMLElement;
  private readonly heartsCtx: CanvasRenderingContext2D;
  private readonly xpCtx: CanvasRenderingContext2D;
  private readonly stats: HTMLElement;
  private readonly right: HTMLElement;

  constructor() {
    this.root = byId('hud');
    const hearts = byId('hud-hearts') as HTMLCanvasElement;
    const xp = byId('hud-xp') as HTMLCanvasElement;
    const hc = hearts.getContext('2d');
    const xc = xp.getContext('2d');
    if (!hc || !xc) throw new Error('无法创建 HUD 2D 上下文');
    this.heartsCtx = hc;
    this.xpCtx = xc;
    this.stats = byId('hud-stats');
    this.right = byId('hud-right');
    this.right.style.whiteSpace = 'pre-line';
  }

  update(player: Player, floor: number, enemyCount: number): void {
    this.drawHearts(player.hp / player.stats.maxHp);
    this.drawXp(player.stats.level, player.stats.xp / xpToNext(player.stats.level));
    const dash = player.dashCooldownRemaining <= 0 ? '就绪' : `${player.dashCooldownRemaining.toFixed(1)}s`;
    this.stats.textContent = `攻击 ${player.stats.attack} · 护甲 ${player.stats.armor} · 闪避 ${dash}`;
    this.right.textContent = [`第 ${floor} 层`, `击杀 ${player.kills}`, `金币 ${player.gold}`, `剩余敌人 ${enemyCount}`].join('\n');
  }

  private drawHearts(ratio: number): void {
    const ctx = this.heartsCtx;
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    for (let i = 0; i < HEART_COUNT; i++) {
      const fill = ratio * HEART_COUNT - i;
      const mode: HeartMode = fill >= 1 ? 'full' : fill > 0 ? 'half' : 'empty';
      this.drawHeart(ctx, i * (HW * HP_PX + HEART_GAP) + 2, 4, mode);
    }
  }

  private drawHeart(ctx: CanvasRenderingContext2D, ox: number, oy: number, mode: HeartMode): void {
    for (let r = 0; r < HH; r++) {
      for (let c = 0; c < HW; c++) {
        if (HEART[r][c] !== 'X') continue;
        ctx.fillStyle = this.heartColor(mode, r, c);
        ctx.fillRect(ox + c * HP_PX, oy + r * HP_PX, HP_PX, HP_PX);
      }
    }
  }

  private heartColor(mode: HeartMode, r: number, c: number): string {
    if (mode === 'empty') return '#39393f';
    const filledSide = mode === 'full' || c < HW / 2; // half：左半红、右半灰
    if (!filledSide) return '#39393f';
    if (r <= 1) return '#ff7a7a'; // 顶部高光
    if (r <= 3) return '#e62b2b';
    return '#a81a1a'; // 底部暗红
  }

  private drawXp(level: number, ratio: number): void {
    const ctx = this.xpCtx;
    const W = ctx.canvas.width;
    ctx.clearRect(0, 0, W, ctx.canvas.height);

    // 等级数字（绿字黑描边）
    ctx.font = '700 15px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(0,0,0,0.9)';
    ctx.strokeText(String(level), W / 2, 14);
    ctx.fillStyle = '#7fe94a';
    ctx.fillText(String(level), W / 2, 14);

    // 经验条
    const barX = 20;
    const barW = W - 40;
    const barY = 20;
    const barH = 9;
    ctx.fillStyle = '#12121a';
    ctx.fillRect(barX, barY, barW, barH);
    const fw = Math.max(0, Math.min(1, ratio)) * barW;
    ctx.fillStyle = '#7fe94a';
    ctx.fillRect(barX, barY, fw, barH);
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.fillRect(barX, barY, fw, 2); // 顶部高光
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.strokeRect(barX, barY, barW, barH);
  }

  setVisible(visible: boolean): void {
    this.root.classList.toggle('hidden', !visible);
  }
}
