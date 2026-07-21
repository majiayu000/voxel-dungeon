import { describe, expect, it, vi } from 'vitest';
import { Game } from './Game';

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

    expect(startEngine).toHaveBeenCalledOnce();
    expect(startNewRun).not.toHaveBeenCalled();
    expect(setState).toHaveBeenCalledWith('menu');
  });
});
