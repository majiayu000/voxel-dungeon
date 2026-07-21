import * as THREE from 'three';

interface Burst {
  points: THREE.Points;
  velocities: Float32Array;
  life: number;
  maxLife: number;
}

/**
 * 轻量粒子特效：命中火花、死亡爆裂。每次爆发一个 THREE.Points，
 * 受重力影响并随生命淡出，到期自动移除并释放资源。
 */
export class Effects {
  private bursts: Burst[] = [];

  constructor(private scene: THREE.Scene) {}

  spawn(pos: THREE.Vector3, color: number, count: number, speed: number, life: number): void {
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = pos.x;
      positions[i * 3 + 1] = pos.y;
      positions[i * 3 + 2] = pos.z;
      // 随机球面方向
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const s = speed * (0.4 + Math.random() * 0.6);
      velocities[i * 3] = Math.sin(phi) * Math.cos(theta) * s;
      velocities[i * 3 + 1] = Math.cos(phi) * s;
      velocities[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * s;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color,
      size: 0.18,
      transparent: true,
      opacity: 1,
      depthWrite: false,
    });
    const points = new THREE.Points(geo, mat);
    this.scene.add(points);
    this.bursts.push({ points, velocities, life, maxLife: life });
  }

  update(dt: number): void {
    this.bursts = this.bursts.filter((b) => {
      b.life -= dt;
      if (b.life <= 0) {
        this.dispose(b);
        return false;
      }
      const attr = b.points.geometry.getAttribute('position') as THREE.BufferAttribute;
      const arr = attr.array as Float32Array;
      for (let i = 0; i < arr.length; i += 3) {
        b.velocities[i + 1] -= 9.8 * dt; // 重力
        arr[i] += b.velocities[i] * dt;
        arr[i + 1] += b.velocities[i + 1] * dt;
        arr[i + 2] += b.velocities[i + 2] * dt;
      }
      attr.needsUpdate = true;
      (b.points.material as THREE.PointsMaterial).opacity = b.life / b.maxLife;
      return true;
    });
  }

  private dispose(b: Burst): void {
    this.scene.remove(b.points);
    b.points.geometry.dispose();
    (b.points.material as THREE.Material).dispose();
  }

  clear(): void {
    for (const b of this.bursts) this.dispose(b);
    this.bursts = [];
  }
}
