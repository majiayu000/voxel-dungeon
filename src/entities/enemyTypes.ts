// 敌人类型配置：纯数据 + 按楼层选取逻辑，可单测。
import type { Rng } from '../core/Rng';
import { randInt } from '../core/Rng';

export interface EnemyType {
  id: string;
  label: string; // 中文名（用于头顶 UI）
  color: number;
  scale: number; // 模型尺寸倍率
  hpMul: number;
  attackMul: number;
  speedMul: number;
  xpMul: number;
  ranged: boolean;
}

export const GRUNT: EnemyType = {
  id: 'grunt',
  label: '小鬼',
  color: 0xb23b3b,
  scale: 1.0,
  hpMul: 1.0,
  attackMul: 1.0,
  speedMul: 1.0,
  xpMul: 1.0,
  ranged: false,
};

export const SWARMER: EnemyType = {
  id: 'swarmer',
  label: '疾行者',
  color: 0xc77b2f,
  scale: 0.7,
  hpMul: 0.6,
  attackMul: 0.7,
  speedMul: 1.7,
  xpMul: 0.8,
  ranged: false,
};

export const BRUTE: EnemyType = {
  id: 'brute',
  label: '巨兽',
  color: 0x6b3fa0,
  scale: 1.5,
  hpMul: 2.1,
  attackMul: 1.6,
  speedMul: 0.7,
  xpMul: 1.8,
  ranged: false,
};

export const CASTER: EnemyType = {
  id: 'caster',
  label: '法师',
  color: 0x2f8fb2,
  scale: 1.0,
  hpMul: 0.9,
  attackMul: 1.2,
  speedMul: 0.9,
  xpMul: 1.4,
  ranged: true,
};

/** 按楼层解锁敌人种类：越深越多强敌。 */
export function pickEnemyType(floor: number, rng: Rng): EnemyType {
  const pool: EnemyType[] = [GRUNT, SWARMER];
  if (floor >= 2) pool.push(BRUTE);
  if (floor >= 3) pool.push(CASTER);
  return pool[randInt(rng, 0, pool.length - 1)];
}
