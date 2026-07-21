import { byId } from './dom';

/**
 * 受击红屏：玩家受伤时屏幕边缘泛起红色并快速淡出。
 * 通过重置 CSS transition 实现“立即出现→渐隐”。
 */
export class DamageFlash {
  private readonly el: HTMLElement;

  constructor() {
    this.el = byId('damage-flash');
  }

  setVisible(visible: boolean): void {
    this.el.classList.toggle('hidden', !visible);
  }

  /** intensity 0~1，按受伤比例缩放红屏强度。 */
  flash(intensity = 1): void {
    const peak = Math.min(0.85, 0.25 + intensity * 0.5);
    this.el.style.transition = 'none';
    this.el.style.opacity = String(peak);
    void this.el.offsetWidth; // 强制回流，让上面的瞬时生效
    this.el.style.transition = 'opacity 0.45s ease-out';
    this.el.style.opacity = '0';
  }
}
