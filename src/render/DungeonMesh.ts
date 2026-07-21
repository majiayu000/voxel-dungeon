import * as THREE from 'three';
import type { Rng } from '../core/Rng';
import { Grid, Tile, TILE, WALL_HEIGHT } from '../dungeon/types';
import { getFloorTexture, getWallTexture } from './Textures';

/**
 * 用 InstancedMesh 批量渲染地牢：地板、墙体、天花板各一层实例。
 * 仅渲染与可行走格相邻的墙（可见墙）；per-instance 颜色做明暗变化（与纹理相乘）。
 * 纹理为程序化像素石砖。纯视觉，不参与逻辑判定（碰撞/寻路/视线都走网格）。
 */
export class DungeonMesh {
  readonly group = new THREE.Group();

  constructor(grid: Grid, rng: Rng = Math.random) {
    let floorCount = 0;
    let wallCount = 0;
    for (let y = 0; y < grid.height; y++) {
      for (let x = 0; x < grid.width; x++) {
        const t = grid.get(x, y);
        if (t === Tile.Wall) {
          if (hasFloorNeighbor(grid, x, y)) wallCount++;
        } else {
          floorCount++;
        }
      }
    }

    const wallMat = new THREE.MeshStandardMaterial({ map: getWallTexture(), roughness: 0.95 });
    const floorMat = new THREE.MeshStandardMaterial({ map: getFloorTexture(), roughness: 0.98 });
    const ceilMat = new THREE.MeshStandardMaterial({ map: getFloorTexture(), roughness: 1 });

    const floors = new THREE.InstancedMesh(new THREE.BoxGeometry(TILE, 0.2, TILE), floorMat, floorCount);
    const walls = new THREE.InstancedMesh(new THREE.BoxGeometry(TILE, WALL_HEIGHT, TILE), wallMat, wallCount);
    const ceiling = new THREE.InstancedMesh(new THREE.BoxGeometry(TILE, 0.2, TILE), ceilMat, floorCount);
    floors.receiveShadow = true;
    walls.castShadow = true;
    walls.receiveShadow = true;
    ceiling.receiveShadow = true;

    const m = new THREE.Matrix4();
    const color = new THREE.Color();
    let fi = 0;
    let wi = 0;
    let ci = 0;
    for (let y = 0; y < grid.height; y++) {
      for (let x = 0; x < grid.width; x++) {
        const t = grid.get(x, y);
        const wx = x * TILE;
        const wz = y * TILE;
        if (t === Tile.Wall) {
          if (!hasFloorNeighbor(grid, x, y)) continue;
          m.makeTranslation(wx, WALL_HEIGHT / 2, wz);
          walls.setMatrixAt(wi, m);
          const s = 0.85 + rng() * 0.15; // 近白，让纹理显色，仅做明暗变化
          walls.setColorAt(wi, color.setRGB(s, s, s));
          wi++;
        } else {
          // 地板
          m.makeTranslation(wx, -0.1, wz);
          floors.setMatrixAt(fi, m);
          if (t === Tile.Stairs) {
            floors.setColorAt(fi, color.setRGB(0.45, 1.0, 0.6)); // 绿楼梯
          } else {
            const s = 0.82 + rng() * 0.18;
            floors.setColorAt(fi, color.setRGB(s, s, s));
          }
          fi++;

          // 天花板（封住可行走上空，营造地牢压迫感）
          m.makeTranslation(wx, WALL_HEIGHT + 0.1, wz);
          ceiling.setMatrixAt(ci, m);
          const cs = 0.4 + rng() * 0.15;
          ceiling.setColorAt(ci, color.setRGB(cs, cs, cs));
          ci++;
        }
      }
    }

    for (const mesh of [floors, walls, ceiling]) {
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
    this.group.add(floors, walls, ceiling);
  }

  dispose(): void {
    // 释放几何与材质；纹理为共享单例，不在此释放。
    this.group.traverse((o) => {
      if (o instanceof THREE.InstancedMesh) {
        o.geometry.dispose();
        (o.material as THREE.Material).dispose();
      }
    });
    this.group.clear();
  }
}

function hasFloorNeighbor(grid: Grid, x: number, y: number): boolean {
  return (
    grid.isWalkable(x + 1, y) ||
    grid.isWalkable(x - 1, y) ||
    grid.isWalkable(x, y + 1) ||
    grid.isWalkable(x, y - 1)
  );
}
