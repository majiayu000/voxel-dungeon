const MIN_RATIO = 1;
const MAX_RATIO = 2;
const STEP = 0.25;
const SLOW_FRAME = 1 / 45;
const FAST_FRAME = 1 / 55;
const SLOW_SECONDS = 1.5;
const FAST_SECONDS = 3;

/**
 * 根据持续帧耗逐级调整渲染像素比。短暂尖峰不会触发降级，恢复比降级更慢，
 * 避免画质在临界帧率附近频繁跳动。
 */
export class AdaptivePixelRatio {
  readonly maximum: number;
  current: number;
  private slowTime = 0;
  private fastTime = 0;

  constructor(maximum: number, initial = maximum) {
    this.maximum = Math.max(MIN_RATIO, Math.min(MAX_RATIO, maximum));
    this.current = Math.max(MIN_RATIO, Math.min(this.maximum, initial));
  }

  /** 输入一帧耗时（秒）；仅在像素比发生变化时返回新值。 */
  sample(frameSeconds: number): number | null {
    if (!Number.isFinite(frameSeconds) || frameSeconds <= 0) return null;
    const elapsed = Math.min(frameSeconds, 0.1);

    if (frameSeconds >= SLOW_FRAME) {
      this.slowTime += elapsed;
      this.fastTime = 0;
    } else if (frameSeconds <= FAST_FRAME) {
      this.fastTime += elapsed;
      this.slowTime = 0;
    } else {
      this.slowTime = 0;
      this.fastTime = 0;
    }

    if (this.slowTime >= SLOW_SECONDS && this.current > MIN_RATIO) {
      this.current = Math.max(MIN_RATIO, this.current - STEP);
      this.slowTime = 0;
      return this.current;
    }
    if (this.fastTime >= FAST_SECONDS && this.current < this.maximum) {
      this.current = Math.min(this.maximum, this.current + STEP);
      this.fastTime = 0;
      return this.current;
    }
    return null;
  }
}
