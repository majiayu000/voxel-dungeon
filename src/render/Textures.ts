import * as THREE from 'three';

/**
 * 程序化像素纹理：低分辨率 canvas + NearestFilter → “我的世界”式像素石头，零资源。
 * 纹理为静态单例，跨楼层共享（不随地牢重建）。
 */

let wallTex: THREE.CanvasTexture | null = null;
let floorTex: THREE.CanvasTexture | null = null;

function makeCanvas(size: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('无法创建纹理 2D 上下文');
  return [canvas, ctx];
}

function finalize(canvas: HTMLCanvasElement): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter; // 放大不模糊 → 像素感
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** 错缝石砖墙。 */
export function getWallTexture(): THREE.CanvasTexture {
  if (wallTex) return wallTex;
  const size = 32;
  const [canvas, ctx] = makeCanvas(size);
  ctx.fillStyle = '#48484e'; // 灰浆（深缝）
  ctx.fillRect(0, 0, size, size);

  const bh = 8;
  const bw = 16;
  for (let r = 0; r * bh < size; r++) {
    const off = r % 2 === 1 ? bw / 2 : 0;
    for (let bx = -bw + off; bx < size; bx += bw) {
      const g = 116 + Math.floor(Math.random() * 26);
      ctx.fillStyle = `rgb(${g},${g},${g + 5})`;
      ctx.fillRect(bx + 1, r * bh + 1, bw - 2, bh - 2); // 留 1px 灰浆
      for (let n = 0; n < 7; n++) {
        const nx = bx + 1 + Math.floor(Math.random() * (bw - 2));
        const ny = r * bh + 1 + Math.floor(Math.random() * (bh - 2));
        const d = Math.floor(Math.random() * 40) - 20;
        const v = Math.max(0, Math.min(255, g + d));
        ctx.fillStyle = `rgb(${v},${v},${v + 5})`;
        ctx.fillRect(nx, ny, 1, 1);
      }
    }
  }
  wallTex = finalize(canvas);
  return wallTex;
}

/** 大块石板地（也用作天花板）。 */
export function getFloorTexture(): THREE.CanvasTexture {
  if (floorTex) return floorTex;
  const size = 32;
  const [canvas, ctx] = makeCanvas(size);
  ctx.fillStyle = '#2f2f35'; // 缝隙
  ctx.fillRect(0, 0, size, size);

  const ts = 16;
  for (let ty = 0; ty < size; ty += ts) {
    for (let tx = 0; tx < size; tx += ts) {
      const g = 92 + Math.floor(Math.random() * 22);
      ctx.fillStyle = `rgb(${g},${g},${g + 4})`;
      ctx.fillRect(tx + 1, ty + 1, ts - 2, ts - 2);
      for (let n = 0; n < 16; n++) {
        const nx = tx + 1 + Math.floor(Math.random() * (ts - 2));
        const ny = ty + 1 + Math.floor(Math.random() * (ts - 2));
        const d = Math.floor(Math.random() * 34) - 17;
        const v = Math.max(0, Math.min(255, g + d));
        ctx.fillStyle = `rgb(${v},${v},${v + 4})`;
        ctx.fillRect(nx, ny, 1, 1);
      }
      // 一道裂纹
      if (Math.random() < 0.5) {
        ctx.fillStyle = 'rgba(0,0,0,0.28)';
        let cx = tx + 2 + Math.floor(Math.random() * (ts - 4));
        let cy = ty + 2;
        for (let s = 0; s < ts - 4; s++) {
          ctx.fillRect(cx, cy, 1, 1);
          cy++;
          if (Math.random() < 0.4) cx += Math.random() < 0.5 ? -1 : 1;
        }
      }
    }
  }
  floorTex = finalize(canvas);
  return floorTex;
}
