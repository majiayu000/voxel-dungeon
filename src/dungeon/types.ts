// 地牢网格的共享类型与世界坐标约定。纯逻辑，不依赖 three.js。

/** 网格瓦片类型。 */
export enum Tile {
  Wall = 0,
  Floor = 1,
  Stairs = 2,
}

/** 网格坐标（x=列，y=行）。 */
export interface Cell {
  x: number;
  y: number;
}

/** 房间：左上角 + 宽高（单位：格）。 */
export interface Room {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** 每格对应的世界单位尺寸。 */
export const TILE = 4;
/** 墙体高度（世界单位）。 */
export const WALL_HEIGHT = 4;

export function cellCenter(room: Room): Cell {
  return { x: Math.floor(room.x + room.w / 2), y: Math.floor(room.y + room.h / 2) };
}

/** 网格坐标 → 世界坐标（x, z），y 轴朝上由渲染层处理。 */
export function cellToWorld(c: Cell): { x: number; z: number } {
  return { x: c.x * TILE, z: c.y * TILE };
}

/** 世界坐标 → 网格坐标（取最近格心）。 */
export function worldToCell(x: number, z: number): Cell {
  return { x: Math.round(x / TILE), y: Math.round(z / TILE) };
}

/** 行主序网格。 */
export class Grid {
  constructor(
    readonly width: number,
    readonly height: number,
    readonly cells: Tile[],
  ) {}

  static filled(width: number, height: number, tile: Tile): Grid {
    return new Grid(width, height, new Array(width * height).fill(tile));
  }

  idx(x: number, y: number): number {
    return y * this.width + x;
  }

  inBounds(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.width && y < this.height;
  }

  get(x: number, y: number): Tile {
    return this.cells[this.idx(x, y)];
  }

  set(x: number, y: number, tile: Tile): void {
    this.cells[this.idx(x, y)] = tile;
  }

  /** 可行走：地板或楼梯。 */
  isWalkable(x: number, y: number): boolean {
    if (!this.inBounds(x, y)) return false;
    const t = this.get(x, y);
    return t === Tile.Floor || t === Tile.Stairs;
  }
}
