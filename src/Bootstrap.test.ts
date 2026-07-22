import { describe, expect, it, vi } from 'vitest';
import { bootstrapGame, type BootstrapElements } from './Bootstrap';

function elements(): BootstrapElements {
  return {
    container: {} as HTMLElement,
    status: {
      hidden: false,
      textContent: '',
      classList: { add: vi.fn(), remove: vi.fn() },
    } as unknown as HTMLElement,
    fallbackTitle: { hidden: false } as HTMLElement,
    pixelTitle: { hidden: true } as HTMLCanvasElement,
    buttons: [
      { disabled: false } as HTMLButtonElement,
      { disabled: false } as HTMLButtonElement,
    ],
  };
}

describe('bootstrapGame', () => {
  it('游戏模块完成后启动游戏、隐藏加载提示并启用按钮', async () => {
    const ui = elements();
    const start = vi.fn();
    const dispose = vi.fn();
    const Game = class {
      constructor(container: HTMLElement) {
        expect(container).toBe(ui.container);
      }
      start = start;
      dispose = dispose;
    };

    const game = await bootstrapGame(ui, async () => ({ Game }));

    expect(start).toHaveBeenCalledOnce();
    expect(ui.status.hidden).toBe(true);
    expect(ui.fallbackTitle.hidden).toBe(true);
    expect(ui.pixelTitle.hidden).toBe(false);
    expect(ui.buttons.every((button: HTMLButtonElement) => !button.disabled)).toBe(true);
    expect(game.dispose).toBe(dispose);
  });

  it('加载失败时保留禁用状态并显示可读错误', async () => {
    const ui = elements();
    const error = new Error('网络不可用');

    await expect(bootstrapGame(ui, async () => Promise.reject(error))).rejects.toBe(error);

    expect(ui.status.hidden).toBe(false);
    expect(ui.status.textContent).toContain('网络不可用');
    expect(ui.buttons.every((button: HTMLButtonElement) => button.disabled)).toBe(true);
    expect(ui.status.classList.add).toHaveBeenCalledWith('error');
  });
});
