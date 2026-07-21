import * as THREE from 'three';
import type { PickupKind, Rarity } from '../combat/Loot';
import type { Player } from './Player';

const COLORS: Record<PickupKind, number> = {
  health: 0x37d67a,
  gold: 0xffd24a,
  attack: 0xff8b3d,
  armor: 0x4a9bff,
  maxhp: 0xff5db1,
};

/** 稀有度 → 模型尺寸 / 发光强度，越高越醒目。 */
const RARITY_SCALE: Record<Rarity, number> = {
  common: 1,
  uncommon: 1.15,
  rare: 1.3,
  epic: 1.55,
};
const RARITY_GLOW: Record<Rarity, number> = {
  common: 0.5,
  uncommon: 0.8,
  rare: 1.15,
  epic: 1.6,
};

const COLLECT_RANGE = 2.0;

/**
 * 地面拾取物：发光漂浮多面体，玩家靠近自动拾取并生效。稀有度越高越大越亮。
 */
export class Pickup {
  readonly mesh: THREE.Mesh;
  alive = true;
  private t = 0;

  constructor(
    private scene: THREE.Scene,
    readonly kind: PickupKind,
    readonly amount: number,
    readonly rarity: Rarity,
    pos: { x: number; z: number },
  ) {
    const color = COLORS[kind];
    const mat = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: RARITY_GLOW[rarity],
      roughness: 0.4,
    });
    this.mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(0.45, 0), mat);
    this.mesh.scale.setScalar(RARITY_SCALE[rarity]);
    this.mesh.position.set(pos.x, 0.9, pos.z);
    scene.add(this.mesh);
  }

  update(dt: number, player: Player): void {
    this.t += dt;
    this.mesh.rotation.y += dt * 2;
    this.mesh.position.y = 0.9 + Math.sin(this.t * 3) * 0.15;

    const dx = player.position.x - this.mesh.position.x;
    const dz = player.position.z - this.mesh.position.z;
    if (Math.hypot(dx, dz) <= COLLECT_RANGE) {
      this.apply(player);
      this.alive = false;
    }
  }

  private apply(player: Player): void {
    switch (this.kind) {
      case 'health':
        player.heal(this.amount);
        break;
      case 'gold':
        player.addGold(this.amount);
        break;
      case 'attack':
        player.buff('attack', this.amount);
        break;
      case 'armor':
        player.buff('armor', this.amount);
        break;
      case 'maxhp':
        player.buff('maxhp', this.amount);
        break;
    }
  }

  dispose(): void {
    this.scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}
