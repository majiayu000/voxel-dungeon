/// <reference types="vite/client" />
import { bootstrapGame, type GameSession } from './Bootstrap';
import { byId } from './ui/dom';

let activeGame: GameSession | null = null;
let disposed = false;

const loading = bootstrapGame(
  {
    container: byId('app'),
    status: byId('loading-status'),
    fallbackTitle: byId('loading-title'),
    pixelTitle: byId('title-logo') as HTMLCanvasElement,
    buttons: [byId('start-btn'), byId('continue-btn')] as HTMLButtonElement[],
  },
  () => import('./game/Game'),
);

void loading
  .then((game) => {
    if (disposed) game.dispose();
    else activeGame = game;
  })
  .catch((err: unknown) => console.error('游戏启动失败', err));

// 开发热更新时释放旧实例，避免 WebGL 上下文累积耗尽（曾导致黑屏、视角无法移动）。
import.meta.hot?.dispose(() => {
  disposed = true;
  activeGame?.dispose();
  activeGame = null;
});
