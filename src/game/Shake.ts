import * as THREE from 'three';

/**
 * 相机震动：脉冲式叠加 + 指数衰减。
 * 用法：命中/受伤时 add(强度)；每帧 compute(dt) 取偏移并衰减。
 */
export class Shake {
  private amplitude = 0;
  private readonly offset = new THREE.Vector3();

  /** 叠加一次震动强度（有上限，避免叠加失控）。 */
  add(impulse: number): void {
    this.amplitude = Math.min(1.1, this.amplitude + impulse);
  }

  reset(): void {
    this.amplitude = 0;
    this.offset.set(0, 0, 0);
  }

  /** 计算本帧偏移量并衰减振幅。 */
  compute(dt: number): THREE.Vector3 {
    this.amplitude *= Math.exp(-dt * 11);
    if (this.amplitude < 0.001) this.amplitude = 0;
    const a = this.amplitude;
    this.offset.set(
      (Math.random() * 2 - 1) * a,
      (Math.random() * 2 - 1) * a * 0.6,
      (Math.random() * 2 - 1) * a,
    );
    return this.offset;
  }
}
