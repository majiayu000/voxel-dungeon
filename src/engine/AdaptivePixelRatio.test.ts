import { describe, expect, it } from 'vitest';
import { AdaptivePixelRatio } from './AdaptivePixelRatio';

describe('AdaptivePixelRatio', () => {
  it('持续低帧率时逐级降低像素比但不低于 1', () => {
    const quality = new AdaptivePixelRatio(2);
    let changed: number | null = null;
    for (let i = 0; i < 500; i++) changed = quality.sample(0.03) ?? changed;

    expect(changed).toBe(1);
    expect(quality.current).toBe(1);
  });

  it('持续流畅时逐级恢复但不超过设备上限', () => {
    const quality = new AdaptivePixelRatio(2, 1);
    let changed: number | null = null;
    for (let i = 0; i < 800; i++) changed = quality.sample(0.016) ?? changed;

    expect(changed).toBe(2);
    expect(quality.current).toBe(2);
  });

  it('短暂尖峰不会立刻改变像素比', () => {
    const quality = new AdaptivePixelRatio(2);
    for (let i = 0; i < 20; i++) expect(quality.sample(0.03)).toBeNull();
    expect(quality.current).toBe(2);
  });
});
