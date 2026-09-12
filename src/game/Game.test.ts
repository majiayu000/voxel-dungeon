import { describe, expect, it, vi } from 'vitest';
import { Game, type GameState } from './Game';

describe('Game startup', () => {
  it('进入菜单时保留已有局并等待玩家选择', () => {
    const startEngine = vi.fn();
    const startNewRun = vi.fn();
    const setState = vi.fn();
    const game = Object.create(Game.prototype) as Game;

    Object.assign(game, {
      engine: { start: startEngine },
      world: { newRun: startNewRun },
      setState,
    });

    game.start();

    expect(startEngine).not.toHaveBeenCalled();
    expect(startNewRun).not.toHaveBeenCalled();
    expect(setState).toHaveBeenCalledWith('menu');
  });

  it('仅在游玩状态连续渲染，暂停时只刷新一帧', () => {
    const start = vi.fn();
    const stop = vi.fn();
    const renderOnce = vi.fn();
    const element = { classList: { toggle: vi.fn() } };
    const visibility = { setVisible: vi.fn() };
    const game = Object.create(Game.prototype) as Game;
    Object.assign(game, {
      engine: { start, stop, renderOnce },
      menuEl: element,
      pauseEl: element,
      deathEl: element,
      crosshairEl: element,
      hud: visibility,
      minimap: visibility,
      enemyBars: visibility,
      damageNumbers: visibility,
      damageFlash: visibility,
    });
    const stateful = game as unknown as { setState(state: GameState): void };

    stateful.setState('playing');
    expect(start).toHaveBeenCalledOnce();
    expect(stop).not.toHaveBeenCalled();

    stateful.setState('paused');
    expect(stop).toHaveBeenCalledOnce();
    expect(renderOnce).toHaveBeenCalledOnce();
  });

  it('暂停时按 Enter 可以请求恢复指针锁定', () => {
    const requestLock = vi.fn();
    const preventDefault = vi.fn();
    const game = Object.create(Game.prototype) as Game;
    Object.assign(game, { state: 'paused', requestLock, audio: { enabled: true } });
    const keyboard = game as unknown as {
      handleGlobalKeyDown(event: KeyboardEvent): void;
    };

    keyboard.handleGlobalKeyDown({ code: 'Enter', preventDefault } as unknown as KeyboardEvent);

    expect(preventDefault).toHaveBeenCalledOnce();
    expect(requestLock).toHaveBeenCalledOnce();
  });

  it('dispose 清理锁重试定时器与 DOM 监听，并阻止后续 doLock', () => {
    vi.useFakeTimers();
    const previousClearTimeout = globalThis.clearTimeout;
    const previousRemove = globalThis.removeEventListener;
    const clearTimeoutFn = vi.fn((id?: ReturnType<typeof setTimeout>) => {
      previousClearTimeout(id as never);
    });
    const removeEventListener = vi.fn();
    globalThis.clearTimeout = clearTimeoutFn as typeof clearTimeout;
    globalThis.removeEventListener = removeEventListener as typeof removeEventListener;

    const startBtn = { removeEventListener: vi.fn() };
    const continueEl = { removeEventListener: vi.fn() };
    const restartBtn = { removeEventListener: vi.fn() };
    const pauseEl = { removeEventListener: vi.fn() };
    const canvas = { removeEventListener: vi.fn() };
    const inputDispose = vi.fn();
    const engineDispose = vi.fn();
    const lock = vi.fn();
    const onGlobalKeyDown = vi.fn();
    const game = Object.create(Game.prototype) as Game;
    Object.assign(game, {
      disposed: false,
      lockRetries: 3,
      lockRetryTimer: setTimeout(() => {}, 1000),
      hitMarkerTimer: setTimeout(() => {}, 1000),
      startBtnEl: startBtn,
      continueEl,
      restartBtnEl: restartBtn,
      pauseEl,
      onStartClick: vi.fn(),
      onContinueClick: vi.fn(),
      onRestartClick: vi.fn(),
      onPauseClick: vi.fn(),
      onCanvasClick: vi.fn(),
      onGlobalKeyDown,
      input: { dispose: inputDispose, isLocked: false, lock },
      engine: { dispose: engineDispose, renderer: { domElement: canvas } },
    });

    try {
      game.dispose();

      expect(clearTimeoutFn).toHaveBeenCalled();
      expect(startBtn.removeEventListener).toHaveBeenCalledWith('click', expect.any(Function));
      expect(continueEl.removeEventListener).toHaveBeenCalledWith('click', expect.any(Function));
      expect(restartBtn.removeEventListener).toHaveBeenCalledWith('click', expect.any(Function));
      expect(pauseEl.removeEventListener).toHaveBeenCalledWith('click', expect.any(Function));
      expect(canvas.removeEventListener).toHaveBeenCalledWith('click', expect.any(Function));
      expect(removeEventListener).toHaveBeenCalledWith('keydown', onGlobalKeyDown);
      expect(inputDispose).toHaveBeenCalledOnce();
      expect(engineDispose).toHaveBeenCalledOnce();
      expect((game as unknown as { disposed: boolean }).disposed).toBe(true);
      expect((game as unknown as { lockRetries: number }).lockRetries).toBe(0);
      expect((game as unknown as { lockRetryTimer: unknown }).lockRetryTimer).toBeNull();

      (game as unknown as { doLock(): void }).doLock();
      expect(lock).not.toHaveBeenCalled();
    } finally {
      globalThis.clearTimeout = previousClearTimeout;
      globalThis.removeEventListener = previousRemove;
      vi.useRealTimers();
    }
  });
});
