import { describe, expect, it, vi } from 'vitest';
import { Engine } from './Engine';

describe('Engine render lifecycle', () => {
  it('重复 start/stop 不重复注册动画循环，并在恢复时清空积压时间', () => {
    const setAnimationLoop = vi.fn();
    const frame = vi.fn();
    const engine = Object.create(Engine.prototype) as Engine;
    Object.assign(engine, {
      renderer: { setAnimationLoop },
      frame,
      running: false,
      acc: 3,
      last: 42,
    });

    engine.start();
    engine.start();
    engine.stop();
    engine.stop();

    expect(setAnimationLoop).toHaveBeenNthCalledWith(1, frame);
    expect(setAnimationLoop).toHaveBeenNthCalledWith(2, null);
    expect(setAnimationLoop).toHaveBeenCalledTimes(2);
    expect((engine as unknown as { acc: number }).acc).toBe(0);
    expect((engine as unknown as { last: number }).last).toBe(0);
  });

  it('renderOnce 只渲染当前场景一次', () => {
    const render = vi.fn();
    const scene = {};
    const camera = {};
    const engine = Object.create(Engine.prototype) as Engine;
    Object.assign(engine, { renderer: { render }, scene, camera });

    engine.renderOnce();

    expect(render).toHaveBeenCalledOnce();
    expect(render).toHaveBeenCalledWith(scene, camera);
  });
});
