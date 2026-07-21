// 网格 A* 寻路（4 方向）。纯函数，不依赖 three.js，可单测。
import type { Grid } from './types';
import type { Cell } from './types';

function heuristic(a: Cell, b: Cell): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

const NEIGHBORS: ReadonlyArray<readonly [number, number]> = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

/**
 * 从 start 到 goal 的 A* 路径。
 * 返回不含起点、含终点的格子序列；起点即终点时返回 []；无路可走返回 null。
 */
export function findPath(grid: Grid, start: Cell, goal: Cell): Cell[] | null {
  if (!grid.isWalkable(start.x, start.y) || !grid.isWalkable(goal.x, goal.y)) {
    return null;
  }
  if (start.x === goal.x && start.y === goal.y) return [];

  const open: Cell[] = [start];
  const cameFrom = new Map<number, number>();
  const gScore = new Map<number, number>([[grid.idx(start.x, start.y), 0]]);
  const fScore = new Map<number, number>([[grid.idx(start.x, start.y), heuristic(start, goal)]]);

  while (open.length > 0) {
    // 取 f 最小的节点（网格规模小，线性查找足够）。
    let best = 0;
    let bestF = Infinity;
    for (let i = 0; i < open.length; i++) {
      const f = fScore.get(grid.idx(open[i].x, open[i].y)) ?? Infinity;
      if (f < bestF) {
        bestF = f;
        best = i;
      }
    }
    const current = open.splice(best, 1)[0];
    if (current.x === goal.x && current.y === goal.y) {
      return reconstruct(grid, cameFrom, current);
    }

    const curIdx = grid.idx(current.x, current.y);
    const curG = gScore.get(curIdx) ?? Infinity;
    for (const [dx, dy] of NEIGHBORS) {
      const nx = current.x + dx;
      const ny = current.y + dy;
      if (!grid.isWalkable(nx, ny)) continue;
      const nIdx = grid.idx(nx, ny);
      const tentative = curG + 1;
      if (tentative < (gScore.get(nIdx) ?? Infinity)) {
        cameFrom.set(nIdx, curIdx);
        gScore.set(nIdx, tentative);
        fScore.set(nIdx, tentative + heuristic({ x: nx, y: ny }, goal));
        if (!open.some((c) => c.x === nx && c.y === ny)) {
          open.push({ x: nx, y: ny });
        }
      }
    }
  }
  return null;
}

function reconstruct(grid: Grid, cameFrom: Map<number, number>, goal: Cell): Cell[] {
  const path: Cell[] = [goal];
  let cur = grid.idx(goal.x, goal.y);
  while (cameFrom.has(cur)) {
    cur = cameFrom.get(cur)!;
    path.push({ x: cur % grid.width, y: Math.floor(cur / grid.width) });
  }
  path.pop(); // 去掉起点
  return path.reverse();
}

/**
 * 网格视线判定（Bresenham 直线）：从 a 到 b 的连线每一格都可走才算看得见。
 * 墙会挡住视线。用于敌人 AI 的发现/追击判定。
 */
export function hasLineOfSight(grid: Grid, a: Cell, b: Cell): boolean {
  let x0 = a.x;
  let y0 = a.y;
  const x1 = b.x;
  const y1 = b.y;
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;

  for (;;) {
    if (!grid.isWalkable(x0, y0)) return false;
    if (x0 === x1 && y0 === y1) return true;
    const e2 = 2 * err;
    let nextX = x0;
    let nextY = y0;
    if (e2 > -dy) {
      err -= dy;
      nextX += sx;
    }
    if (e2 < dx) {
      err += dx;
      nextY += sy;
    }
    // 对角跨格时，两侧正交格都必须畅通，避免从墙角缝隙穿透视线。
    if (
      nextX !== x0 &&
      nextY !== y0 &&
      (!grid.isWalkable(nextX, y0) || !grid.isWalkable(x0, nextY))
    ) {
      return false;
    }
    x0 = nextX;
    y0 = nextY;
  }
}
