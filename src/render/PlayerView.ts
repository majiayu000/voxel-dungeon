import * as THREE from 'three';

/**
 * 第一人称武器视角模型：挂在相机下的一把剑，攻击时挥砍、平时轻微浮动。
 * 纯视觉，由 World 在攻击命中/挥出时触发 swing()。
 */
export class PlayerView {
  private readonly weapon = new THREE.Group();
  private swingT = 0;
  private idleT = 0;
  private readonly swingDur = 0.22;

  constructor(camera: THREE.Camera) {
    const steel = new THREE.MeshStandardMaterial({ color: 0xcfd4dd, roughness: 0.3, metalness: 0.6 });
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.14, 1.15), steel);
    blade.position.set(0, 0, -0.6);
    const guard = new THREE.Mesh(
      new THREE.BoxGeometry(0.36, 0.1, 0.12),
      new THREE.MeshStandardMaterial({ color: 0x8a6d2f, roughness: 0.6 }),
    );
    const handle = new THREE.Mesh(
      new THREE.BoxGeometry(0.09, 0.09, 0.32),
      new THREE.MeshStandardMaterial({ color: 0x3a2a1a, roughness: 0.8 }),
    );
    handle.position.set(0, 0, 0.18);
    this.weapon.add(blade, guard, handle);

    this.weapon.position.set(0.42, -0.42, -0.7);
    this.weapon.rotation.set(0.25, -0.25, 0.35);
    camera.add(this.weapon);
  }

  swing(): void {
    this.swingT = this.swingDur;
  }

  update(dt: number): void {
    this.idleT += dt;
    if (this.swingT > 0) {
      this.swingT = Math.max(0, this.swingT - dt);
      const p = 1 - this.swingT / this.swingDur; // 0 → 1
      const arc = Math.sin(p * Math.PI);
      this.weapon.rotation.x = 0.25 - arc * 1.2;
      this.weapon.position.z = -0.7 - arc * 0.18;
      this.weapon.position.y = -0.42 + arc * 0.05;
    } else {
      // 待机轻微浮动
      const bob = Math.sin(this.idleT * 2) * 0.012;
      this.weapon.rotation.x = 0.25;
      this.weapon.position.y = -0.42 + bob;
      this.weapon.position.z = -0.7;
    }
  }
}
