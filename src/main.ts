/// <reference types="vite/client" />
import { Game } from './game/Game';

const container = document.getElementById('app');
if (!container) throw new Error('缺少 #app 容器');

try {
  const game = new Game(container);
  game.start();
  // 开发热更新时释放旧实例，避免 WebGL 上下文累积耗尽（曾导致黑屏、视角无法移动）。
  import.meta.hot?.dispose(() => game.dispose());
} catch (err) {
  const msg = err instanceof Error ? err.message : String(err);
  container.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100vh;color:#e8e8f0;font-size:18px;text-align:center;padding:24px;line-height:1.9">${msg}<br/><span style="font-size:14px;color:#8888a0">按 Cmd/Ctrl+Shift+R 硬刷新</span></div>`;
  throw err;
}
