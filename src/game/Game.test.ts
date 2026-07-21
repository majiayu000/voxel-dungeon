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
});
