import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { basePlayerStats } from '../combat/Stats';
import { clearSuspend, loadSuspend, saveSuspend, type SuspendState } from './Save';

const SUSPEND_KEY = 'dungeon.suspend.v1';

function validSuspend(overrides: Partial<SuspendState> = {}): SuspendState {
  return {
    seed: 42,
    floor: 3,
    hp: 80,
    gold: 10,
    kills: 2,
    stats: basePlayerStats(),
    ...overrides,
  };
}

describe('loadSuspend', () => {
  const memory = new Map<string, string>();

  beforeEach(() => {
    memory.clear();
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        getItem: (key: string) => memory.get(key) ?? null,
        setItem: (key: string, value: string) => {
          memory.set(key, value);
        },
        removeItem: (key: string) => {
          memory.delete(key);
        },
      },
    });
  });

  afterEach(() => {
    Reflect.deleteProperty(globalThis, 'localStorage');
  });

  it('返回合法 suspend 存档', () => {
    const state = validSuspend();
    saveSuspend(state);
    expect(loadSuspend()).toEqual(state);
  });

  it('损坏 JSON 返回 null', () => {
    memory.set(SUSPEND_KEY, '{not-json');
    expect(loadSuspend()).toBeNull();
  });

  it('缺少字段返回 null', () => {
    memory.set(SUSPEND_KEY, JSON.stringify({ seed: 1, floor: 2, hp: 10 }));
    expect(loadSuspend()).toBeNull();
  });

  it('stats 残缺返回 null', () => {
    memory.set(
      SUSPEND_KEY,
      JSON.stringify({
        seed: 1,
        floor: 2,
        hp: 10,
        gold: 0,
        kills: 0,
        stats: { maxHp: 100, attack: 18 },
      }),
    );
    expect(loadSuspend()).toBeNull();
  });

  it('非有限数字返回 null', () => {
    memory.set(SUSPEND_KEY, JSON.stringify(validSuspend({ hp: Number.NaN })));
    expect(loadSuspend()).toBeNull();
  });

  it('clearSuspend 后返回 null', () => {
    saveSuspend(validSuspend());
    clearSuspend();
    expect(loadSuspend()).toBeNull();
  });
});
