import { describe, expect, it } from 'vitest';
import { findPath, hasLineOfSight } from './Pathfinding';
import { Grid, Tile } from './types';

function emptyGrid(w: number, h: number): Grid {
  return Grid.filled(w, h, Tile.Floor);
}

describe('findPath', () => {
  it('空旷网格走直线（曼哈顿距离）', () => {
    const grid = emptyGrid(10, 10);
    const path = findPath(grid, { x: 0, y: 0 }, { x: 3, y: 0 })!;
    expect(path).toEqual([
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 3, y: 0 },
    ]);
  });

  it('起点即终点返回空路径', () => {
    const grid = emptyGrid(5, 5);
    expect(findPath(grid, { x: 2, y: 2 }, { x: 2, y: 2 })).toEqual([]);
  });

  it('遇墙会绕行', () => {
    const grid = emptyGrid(5, 5);
    // 在 (1,0..2) 立一道墙，只留 (1,3) 通过。
    grid.set(1, 0, Tile.Wall);
    grid.set(1, 1, Tile.Wall);
    grid.set(1, 2, Tile.Wall);
    const path = findPath(grid, { x: 0, y: 1 }, { x: 2, y: 1 })!;
    expect(path).not.toBeNull();
    // 路径必须经过 y=3 的缺口。
    expect(path.some((c) => c.y === 3)).toBe(true);
    // 路径连续：相邻步只移动一格。
    let prev = { x: 0, y: 1 };
    for (const c of path) {
      expect(Math.abs(c.x - prev.x) + Math.abs(c.y - prev.y)).toBe(1);
      prev = c;
    }
    expect(prev).toEqual({ x: 2, y: 1 });
  });

  it('完全被墙围住返回 null', () => {
    const grid = emptyGrid(5, 5);
    grid.set(1, 0, Tile.Wall);
    grid.set(1, 1, Tile.Wall);
    grid.set(1, 2, Tile.Wall);
    grid.set(0, 1, Tile.Wall);
    // 起点 (0,0) 只有右(1,0墙)和下(0,1墙)，被困死。
    expect(findPath(grid, { x: 0, y: 0 }, { x: 4, y: 4 })).toBeNull();
  });

  it('起点或终点是墙时返回 null', () => {
    const grid = emptyGrid(5, 5);
    grid.set(2, 2, Tile.Wall);
    expect(findPath(grid, { x: 2, y: 2 }, { x: 0, y: 0 })).toBeNull();
    expect(findPath(grid, { x: 0, y: 0 }, { x: 2, y: 2 })).toBeNull();
  });
});

describe('hasLineOfSight', () => {
  it('无障碍直线可见', () => {
    const grid = emptyGrid(8, 8);
    expect(hasLineOfSight(grid, { x: 0, y: 0 }, { x: 5, y: 0 })).toBe(true);
    expect(hasLineOfSight(grid, { x: 0, y: 0 }, { x: 5, y: 3 })).toBe(true);
  });

  it('相邻格可见', () => {
    const grid = emptyGrid(5, 5);
    expect(hasLineOfSight(grid, { x: 1, y: 1 }, { x: 2, y: 1 })).toBe(true);
  });

  it('墙挡住视线', () => {
    const grid = emptyGrid(8, 8);
    grid.set(3, 0, Tile.Wall);
    expect(hasLineOfSight(grid, { x: 0, y: 0 }, { x: 6, y: 0 })).toBe(false);
  });

  it('斜线被墙挡住', () => {
    const grid = emptyGrid(8, 8);
    grid.set(2, 2, Tile.Wall);
    expect(hasLineOfSight(grid, { x: 0, y: 0 }, { x: 4, y: 4 })).toBe(false);
  });
});
