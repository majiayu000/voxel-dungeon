import * as THREE from 'three';

const LIFE = 0.9; // 漂浮时长（秒）

interface FloatNum {
  pos: THREE.Vector3;
  text: string;
  crit: boolean;
  life: number;
  vy: number;
  jitterX: number;
}

/**
 * 飘伤害数字：命中点冒出，上浮淡出；暴击更大更亮带弹出感。
 * 全屏 2D 覆盖层，把 3D 位置投影到屏幕绘制。
 */
export class DamageNumbers {
  private canvas: HTMLCanvasElement | null;
  private ctx: CanvasRenderingContext2D | null = null;
  private items: FloatNum[] = [];
  private readonly proj = new THREE.Vector3();
  private readonly camDir = new THREE.Vector3();
  private readonly toPos = new THREE.Vector3();
  private cssW = innerWidth;
  private cssH = innerHeight;

  constructor() {
    this.canvas = document.getElementById('damage-numbers') as HTMLCanvasElement | null;
    if (this.canvas) {
      this.ctx = this.canvas.getContext('2d');
      this.resize();
      addEventListener('resize', () => this.resize());
    }
    if (!this.ctx) throw new Error('无法初始化 #damage-numbers 画布');
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

  spawn(worldPos: THREE.Vector3, amount: number, crit: boolean): void {
    if (!this.ctx) return;
    this.items.push({
      pos: worldPos.clone(),
      text: String(Math.round(amount)),
      crit,
      life: LIFE,
      vy: crit ? 2.4 : 1.7,
      jitterX: (Math.random() - 0.5) * 0.7,
    });
  }

  update(dt: number, camera: THREE.Camera): void {
    if (!this.ctx) return;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.cssW, this.cssH);
    camera.getWorldDirection(this.camDir);

    this.items = this.items.filter((it) => {
      it.life -= dt;
      if (it.life <= 0) return false;
      it.pos.y += it.vy * dt;
      it.pos.x += it.jitterX * dt;
      it.vy *= 1 - 1.2 * dt; // 上浮减速

      this.toPos.copy(it.pos).sub(camera.position);
      if (this.camDir.dot(this.toPos) <= 0) return false; // 相机背面
      const dist = this.toPos.length();

      this.proj.copy(it.pos).project(camera);
      if (this.proj.z > 1 || this.proj.z < -1) return false;
      const sx = (this.proj.x * 0.5 + 0.5) * this.cssW;
      const sy = (0.5 - this.proj.y * 0.5) * this.cssH;

      const t = 1 - it.life / LIFE; // 0 → 1
      const fadeIn = Math.min(1, t * 8); // 开头快速淡入
      const alpha = fadeIn * (it.life / LIFE);
      // 暴击开头放大（弹出感）
      const pop = it.crit ? 1 + Math.max(0, 0.35 - t) * 2.2 : 1;
      const size = Math.min(46, Math.max(15, 320 / dist)) * pop;

      ctx.globalAlpha = alpha;
      ctx.textAlign = 'center';
      ctx.font = `${it.crit ? '800' : '700'} ${Math.round(size)}px "PingFang SC", "Microsoft YaHei", sans-serif`;
      ctx.shadowColor = 'rgba(0,0,0,0.95)';
      ctx.shadowBlur = 5;
      ctx.fillStyle = it.crit ? '#ffd24a' : '#ffffff';
      ctx.fillText(it.text, sx, sy);
      if (it.crit) {
        ctx.font = `600 ${Math.round(size * 0.42)}px "PingFang SC", "Microsoft YaHei", sans-serif`;
        ctx.fillStyle = '#ff9b3d';
        ctx.fillText('暴击!', sx, sy - size * 0.85);
      }
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
      return true;
    });
  }

  setVisible(visible: boolean): void {
    this.canvas?.classList.toggle('hidden', !visible);
  }
}
