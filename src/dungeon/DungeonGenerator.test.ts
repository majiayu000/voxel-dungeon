import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../core/Rng';
import { generateDungeon, type DungeonConfig } from './DungeonGenerator';
import { Grid, Tile, cellCenter, type Cell } from './types';

const baseConfig: DungeonConfig = {
  width: 40,
  height: 40,
  minRoom: 4,
  maxRoom: 8,
  maxRooms: 10,
};

function floodReachable(grid: Grid, from: Cell): Set<number> {
  const seen = new Set<number>([grid.idx(from.x, from.y)]);
  const stack: Cell[] = [from];
  while (stack.length) {
    const c = stack.pop()!;
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const nx = c.x + dx;
      const ny = c.y + dy;
      if (!grid.isWalkable(nx, ny)) continue;
      const id = grid.idx(nx, ny);
      if (seen.has(id)) continue;
      seen.add(id);
      stack.push({ x: nx, y: ny });
    }
  }
  return seen;
}

describe('generateDungeon', () => {
  it('同一种子结果完全一致（确定性）', () => {
    const a = generateDungeon({ ...baseConfig, rng: mulberry32(1) });
    const b = generateDungeon({ ...baseConfig, rng: mulberry32(1) });
    expect(a.rooms).toEqual(b.rooms);
    expect(a.start).toEqual(b.start);
    expect(a.stairs).toEqual(b.stairs);
    expect(a.grid.cells).toEqual(b.grid.cells);
  });

  it('生成多个房间且全部被挖成地板', () => {
    const level = generateDungeon({ ...baseConfig, rng: mulberry32(11) });
    expect(level.rooms.length).toBeGreaterThanOrEqual(3);
    for (const room of level.rooms) {
      for (let y = room.y; y < room.y + room.h; y++) {
        for (let x = room.x; x < room.x + room.w; x++) {
          expect(level.grid.get(x, y)).not.toBe(Tile.Wall);
        }
      }
    }
  });

  it('房间两两不重叠（含 1 格缓冲）', () => {
    const level = generateDungeon({ ...baseConfig, rng: mulberry32(22) });
    const rooms = level.rooms;
    for (let i = 0; i < rooms.length; i++) {
      for (let j = i + 1; j < rooms.length; j++) {
        const a = rooms[i];
        const b = rooms[j];
        const overlap =
          a.x - 1 < b.x + b.w &&
          b.x - 1 < a.x + a.w &&
          a.y - 1 < b.y + b.h &&
          b.y - 1 < a.y + a.h;
        expect(overlap).toBe(false);
      }
    }
  });

  it('从起点可达所有房间中心与楼梯（全连通）', () => {
    for (const seed of [3, 17, 88, 456, 9999]) {
      const level = generateDungeon({ ...baseConfig, rng: mulberry32(seed) });
      const reach = floodReachable(level.grid, level.start);
      expect(reach.has(level.grid.idx(level.stairs.x, level.stairs.y))).toBe(true);
      for (const room of level.rooms) {
        const c = cellCenter(room);
        expect(reach.has(level.grid.idx(c.x, c.y))).toBe(true);
      }
    }
  });

  it('楼梯瓦片被正确标记', () => {
    const level = generateDungeon({ ...baseConfig, rng: mulberry32(7) });
    expect(level.grid.get(level.stairs.x, level.stairs.y)).toBe(Tile.Stairs);
  });
});
