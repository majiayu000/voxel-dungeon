import * as THREE from 'three';
import type { Rng } from '../core/Rng';
import { type Room, TILE } from '../dungeon/types';

const MAX_LIGHTS = 5; // 真实点光源上限，控制开销

interface Torch {
  light: THREE.PointLight;
  base: number;
  phase: number;
}

/**
 * 火把：在每个房间墙角放一支发光火把，其中前若干支附带真实点光源并做闪烁，
 * 营造地牢暖光氛围。火焰用 emissive 发光体，不全部投影以控开销。
 */
export class Torches {
  readonly group = new THREE.Group();
  private torches: Torch[] = [];
  private t = 0;

  constructor(rooms: Room[], rng: Rng) {
    const flameGeo = new THREE.ConeGeometry(0.28, 0.6, 6);
    const poleGeo = new THREE.CylinderGeometry(0.06, 0.06, 1.2, 6);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x2a2018, roughness: 0.9 });

    rooms.forEach((room, i) => {
      const wx = room.x * TILE;
      const wz = room.y * TILE;

      const pole = new THREE.Mesh(poleGeo, poleMat);
      pole.position.set(wx, 1.9, wz);
      const flame = new THREE.Mesh(
        flameGeo,
        new THREE.MeshStandardMaterial({
          color: 0xffa640,
          emissive: 0xff7a1a,
          emissiveIntensity: 1.6,
          roughness: 0.5,
        }),
      );
      flame.position.set(wx, 2.7, wz);
      this.group.add(pole, flame);

      if (i < MAX_LIGHTS) {
        const base = 22 + rng() * 8;
        const light = new THREE.PointLight(0xff8a3a, base, 18, 2);
        light.position.set(wx, 2.7, wz);
        this.group.add(light);
        this.torches.push({ light, base, phase: rng() * Math.PI * 2 });
      }
    });
  }

  update(dt: number): void {
    this.t += dt;
    for (const torch of this.torches) {
      const flicker = 0.82 + 0.18 * Math.sin(this.t * 11 + torch.phase) + 0.05 * Math.sin(this.t * 23 + torch.phase);
      torch.light.intensity = torch.base * flicker;
    }
  }

  dispose(): void {
    this.group.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.geometry.dispose();
        (o.material as THREE.Material).dispose();
      }
    });
    this.group.clear();
    this.torches = [];
  }
}
