// 持久化：跨局 meta 进度 + 单槽 suspend 续玩。localStorage，带版本号与读写防护。
import type { Stats } from '../combat/Stats';

const META_KEY = 'dungeon.meta.v1';
const SUSPEND_KEY = 'dungeon.suspend.v1';

export interface Meta {
  bestFloor: number;
  totalGold: number;
  totalKills: number;
  runs: number;
}

export interface SuspendState {
  seed: number;
  floor: number;
  hp: number;
  gold: number;
  kills: number;
  stats: Stats;
}

export function defaultMeta(): Meta {
  return { bestFloor: 0, totalGold: 0, totalKills: 0, runs: 0 };
}

export function loadMeta(): Meta {
  try {
    const raw = localStorage.getItem(META_KEY);
    if (!raw) return defaultMeta();
    return { ...defaultMeta(), ...(JSON.parse(raw) as Partial<Meta>) };
  } catch {
    return defaultMeta();
  }
}

export function saveMeta(meta: Meta): void {
  try {
    localStorage.setItem(META_KEY, JSON.stringify(meta));
  } catch {
    // 存储不可用（隐私模式等）：meta 为可选便利功能，静默不持久化。
  }
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isValidStats(value: unknown): value is Stats {
  if (value === null || typeof value !== 'object') return false;
  const s = value as Record<string, unknown>;
  return (
    isFiniteNumber(s.maxHp) &&
    isFiniteNumber(s.attack) &&
    isFiniteNumber(s.armor) &&
    isFiniteNumber(s.critChance) &&
    isFiniteNumber(s.moveSpeed) &&
    isFiniteNumber(s.level) &&
    isFiniteNumber(s.xp)
  );
}

function isValidSuspendState(value: unknown): value is SuspendState {
  if (value === null || typeof value !== 'object') return false;
  const state = value as Record<string, unknown>;
  return (
    isFiniteNumber(state.seed) &&
    isFiniteNumber(state.floor) &&
    isFiniteNumber(state.hp) &&
    isFiniteNumber(state.gold) &&
    isFiniteNumber(state.kills) &&
    isValidStats(state.stats)
  );
}

export function loadSuspend(): SuspendState | null {
  try {
    const raw = localStorage.getItem(SUSPEND_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isValidSuspendState(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveSuspend(state: SuspendState): void {
  try {
    localStorage.setItem(SUSPEND_KEY, JSON.stringify(state));
  } catch {
    // 同上：可选功能。
  }
}

export function clearSuspend(): void {
  try {
    localStorage.removeItem(SUSPEND_KEY);
  } catch {
    // ignore
  }
}
