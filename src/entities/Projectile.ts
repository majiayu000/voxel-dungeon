import * as THREE from 'three';
import { type Grid, worldToCell } from '../dungeon/types';
import type { Player } from './Player';

const SPEED = 13;
const HIT_RANGE = 1.1;
const LIFE = 3;

/**
 * 敌人投射物：朝玩家飞行，撞墙或命中玩家消失。
 */
export class Projectile {
  readonly mesh: THREE.Mesh;
  readonly color: number;
  alive = true;
  private readonly vel = new THREE.Vector3();
  private life = LIFE;

  constructor(
    private scene: THREE.Scene,
    private grid: Grid,
    from: THREE.Vector3,
    target: THREE.Vector3,
    private damage: number,
    color: number,
  ) {
    this.color = color;
    this.mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.28, 10, 10),
      new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.9 }),
    );
    this.mesh.position.copy(from);

    const dir = new THREE.Vector3(target.x - from.x, 0, target.z - from.z).normalize();
    this.vel.copy(dir).multiplyScalar(SPEED);
    this.vel.y = (target.y - from.y) * 0.25; // 略微瞄向玩家高度
    scene.add(this.mesh);
  }

  update(dt: number, player: Player): void {
    this.life -= dt;
    if (this.life <= 0) {
      this.alive = false;
      return;
    }
    this.mesh.position.addScaledVector(this.vel, dt);

    // 撞墙消失
    const c = worldToCell(this.mesh.position.x, this.mesh.position.z);
    if (!this.grid.isWalkable(c.x, c.y)) {
      this.alive = false;
      return;
    }

    // 命中玩家
    const dx = player.position.x - this.mesh.position.x;
    const dy = player.position.y - this.mesh.position.y;
    const dz = player.position.z - this.mesh.position.z;
    if (Math.hypot(dx, dy, dz) <= HIT_RANGE) {
      player.takeDamage(this.damage);
      this.alive = false;
    }
  }

  dispose(): void {
    this.scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}
