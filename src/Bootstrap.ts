export interface GameSession {
  start(): void;
  dispose(): void;
}

export interface GameModule {
  Game: new (container: HTMLElement) => GameSession;
}

export interface BootstrapElements {
  container: HTMLElement;
  status: HTMLElement;
  fallbackTitle: HTMLElement;
  pixelTitle: HTMLCanvasElement;
  buttons: HTMLButtonElement[];
}

/** 异步加载大型游戏模块，同时管理首屏加载、成功和失败状态。 */
export async function bootstrapGame(
  elements: BootstrapElements,
  loadGame: () => Promise<GameModule>,
): Promise<GameSession> {
  const { container, status, fallbackTitle, pixelTitle, buttons } = elements;
  for (const button of buttons) button.disabled = true;
  status.hidden = false;
  status.classList.remove('error');
  status.textContent = '正在载入地牢…';

  try {
    const { Game } = await loadGame();
    const game = new Game(container);
    game.start();
    fallbackTitle.hidden = true;
    pixelTitle.hidden = false;
    status.hidden = true;
    for (const button of buttons) button.disabled = false;
    return game;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    status.textContent = `载入失败：${message}。请刷新页面后重试。`;
    status.classList.add('error');
    throw err;
  }
}
