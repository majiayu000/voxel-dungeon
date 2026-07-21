// 地牢生成：随机放置互不重叠的房间，按顺序用 L 形走廊串联，天然保证全连通。
// 纯逻辑，不依赖 three.js，可单测。
import { type Rng, randInt } from '../core/Rng';
import { Grid, Tile, cellCenter, type Cell, type Room } from './types';

export interface DungeonConfig {
  width: number;
  height: number;
  minRoom: number;
  maxRoom: number;
  maxRooms: number;
  rng?: Rng;
}

export interface DungeonLevel {
  grid: Grid;
  rooms: Room[];
  start: Cell;
  stairs: Cell;
}

/** 两房间是否重叠（含 pad 格缓冲区，避免房间贴在一起）。 */
function roomsOverlap(a: Room, b: Room, pad: number): boolean {
  return (
    a.x - pad < b.x + b.w &&
    b.x - pad < a.x + a.w &&
    a.y - pad < b.y + b.h &&
    b.y - pad < a.y + a.h
  );
}

function carveRoom(grid: Grid, room: Room): void {
  for (let y = room.y; y < room.y + room.h; y++) {
    for (let x = room.x; x < room.x + room.w; x++) {
      grid.set(x, y, Tile.Floor);
    }
  }
}

/** L 形走廊：从 a 到 b，随机先横后竖或先竖后横。 */
function carveCorridor(grid: Grid, a: Cell, b: Cell, rng: Rng): void {
  let x = a.x;
  let y = a.y;
  const horizFirst = rng() < 0.5;
  const stepX = () => {
    while (x !== b.x) {
      x += Math.sign(b.x - x);
      grid.set(x, y, Tile.Floor);
    }
  };
  const stepY = () => {
    while (y !== b.y) {
      y += Math.sign(b.y - y);
      grid.set(x, y, Tile.Floor);
    }
  };
  if (horizFirst) {
    stepX();
    stepY();
  } else {
    stepY();
    stepX();
  }
}

export function generateDungeon(cfg: DungeonConfig): DungeonLevel {
  const rng = cfg.rng ?? Math.random;
  const grid = Grid.filled(cfg.width, cfg.height, Tile.Wall);
  const rooms: Room[] = [];

  const maxAttempts = cfg.maxRooms * 30;
  for (let attempt = 0; rooms.length < cfg.maxRooms && attempt < maxAttempts; attempt++) {
    const w = randInt(rng, cfg.minRoom, cfg.maxRoom);
    const h = randInt(rng, cfg.minRoom, cfg.maxRoom);
    const x = randInt(rng, 1, cfg.width - w - 2);
    const y = randInt(rng, 1, cfg.height - h - 2);
    const room: Room = { x, y, w, h };
    if (rooms.some((r) => roomsOverlap(r, room, 1))) continue;
    carveRoom(grid, room);
    rooms.push(room);
  }

  // 依次连接相邻房间 → 生成树，保证所有房间连通。
  for (let i = 1; i < rooms.length; i++) {
    carveCorridor(grid, cellCenter(rooms[i - 1]), cellCenter(rooms[i]), rng);
  }

  const start = cellCenter(rooms[0]);
  const stairs = cellCenter(rooms[rooms.length - 1]);
  grid.set(stairs.x, stairs.y, Tile.Stairs);

  return { grid, rooms, start, stairs };
}
