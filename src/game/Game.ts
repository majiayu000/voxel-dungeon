import * as THREE from 'three';
import { GameAudio } from '../audio/Audio';
import { Engine } from '../engine/Engine';
import { Input } from '../engine/Input';
import {
  clearSuspend,
  loadMeta,
  loadSuspend,
  saveMeta,
  saveSuspend,
  type Meta,
} from '../meta/Save';
import { Lighting } from '../render/Lighting';
import { DamageFlash } from '../ui/DamageFlash';
import { DamageNumbers } from '../ui/DamageNumbers';
import { byId } from '../ui/dom';
import { EnemyBars } from '../ui/EnemyBars';
import { HUD } from '../ui/HUD';
import { Minimap } from '../ui/Minimap';
import { renderPixelTitle } from '../ui/PixelTitle';
import { Shake } from './Shake';
import { World } from './World';

export type GameState = 'menu' | 'playing' | 'paused' | 'dead';

/**
 * 游戏总控（组合根）：装配引擎/输入/光照/世界/全部 UI 层（HUD/小地图/敌人信息牌/
 * 飘伤/红屏）/音效/存档，驱动状态机与主循环。
 * 状态：菜单 → 游玩 →（暂停 / 死亡结算→重开）。支持续玩与跨局 meta 进度。
 */
export class Game {
  private engine: Engine;
  private input: Input;
  private world: World;
  private hud: HUD;
  private minimap: Minimap;
  private enemyBars: EnemyBars;
  private damageNumbers: DamageNumbers;
  private damageFlash: DamageFlash;
  private audio: GameAudio;
  private meta: Meta;

  private state: GameState = 'menu';
  private prevHp = 100;
  private lockRetries = 0;
  private readonly shake = new Shake();
  private readonly lastShake = new THREE.Vector3();
  private hitstop = 0;
  private hitMarkerTimer: ReturnType<typeof setTimeout> | null = null;

  private readonly menuEl: HTMLElement;
  private readonly pauseEl: HTMLElement;
  private readonly deathEl: HTMLElement;
  private readonly crosshairEl: HTMLElement;
  private readonly deathSummaryEl: HTMLElement;
  private readonly continueEl: HTMLElement;
  private readonly menuMetaEl: HTMLElement;

  constructor(container: HTMLElement) {
    this.engine = new Engine(container);
    this.input = new Input(this.engine.camera, this.engine.renderer.domElement);
    this.audio = new GameAudio();
    new Lighting(this.engine.scene, this.engine.camera);
    this.world = new World(this.engine, this.input, this.audio);
    this.hud = new HUD();
    this.minimap = new Minimap();
    this.enemyBars = new EnemyBars();
    this.damageNumbers = new DamageNumbers();
    this.damageFlash = new DamageFlash();
    this.meta = loadMeta();

    this.world.onFloorBuilt = () => saveSuspend(this.world.snapshot());
    // 命中反馈：飘字 + 震屏 +（暴击）顿帧
    this.world.onDamage = (pos, amount, crit) => {
      this.damageNumbers.spawn(pos, amount, crit);
      this.shake.add(crit ? 0.42 : 0.15);
      if (crit) this.hitstop = 0.07;
      this.showHitMarker(crit);
    };

    this.menuEl = byId('menu');
    this.pauseEl = byId('pause');
    this.deathEl = byId('death');
    this.crosshairEl = byId('crosshair');
    this.deathSummaryEl = byId('death-summary');
    this.continueEl = byId('continue-btn');
    this.menuMetaEl = byId('menu-meta');

    // 渲染“我的世界”风格像素标题
    renderPixelTitle('地牢探险', byId('title-logo') as HTMLCanvasElement);

    byId('start-btn').addEventListener('click', () => this.startNewRun());
    this.continueEl.addEventListener('click', () => this.continueRun());
    byId('restart-btn').addEventListener('click', () => this.startNewRun());
    // 点击暂停蒙层任意处即恢复（含“继续”按钮，冒泡触发）
    this.pauseEl.addEventListener('click', () => this.requestLock());
    // 兜底：游玩中若指针意外解锁，点画面即可重新锁定
    this.engine.renderer.domElement.addEventListener('click', () => {
      if (!this.input.isLocked && this.state === 'playing') this.requestLock();
    });
    addEventListener('keydown', this.onGlobalKeyDown);

    // 锁定被浏览器拒绝（常因退出后 ~1.25s 冷却期）→ 自动重试
    this.input.onLockError = () => {
      if (this.lockRetries > 0) {
        this.lockRetries--;
        setTimeout(() => this.doLock(), 650);
      }
    };

    this.input.onLockChange = (locked) => {
      if (locked) {
        this.setState('playing');
      } else if (this.state === 'playing') {
        this.setState('paused');
      }
    };

    this.engine.onLogic = (dt) => this.update(dt);
  }

  start(): void {
    this.setState('menu');
  }

  /** 释放引擎与输入（开发热更新时调用，避免 WebGL 上下文泄漏）。 */
  dispose(): void {
    if (this.hitMarkerTimer) clearTimeout(this.hitMarkerTimer);
    removeEventListener('keydown', this.onGlobalKeyDown);
    this.input.dispose();
    this.engine.dispose();
  }

  private startNewRun(): void {
    this.audio.unlock();
    clearSuspend();
    this.world.newRun(randomSeed());
    this.resetRunFx();
    this.requestLock();
  }

  private continueRun(): void {
    const snapshot = loadSuspend();
    if (!snapshot) return;
    this.audio.unlock();
    clearSuspend();
    this.world.resume(snapshot);
    this.resetRunFx();
    this.requestLock();
  }

  /** 开新局时重置局内反馈状态（震动/顿帧/血量基准）。 */
  private resetRunFx(): void {
    this.prevHp = this.world.player.hp;
    this.hitstop = 0;
    this.shake.reset();
    this.lastShake.set(0, 0, 0);
    if (this.hitMarkerTimer) clearTimeout(this.hitMarkerTimer);
    this.hitMarkerTimer = null;
    this.crosshairEl.classList.remove('hit', 'crit');
  }

  /** 请求锁定，失败时由 onLockError 触发重试（熬过浏览器冷却期）。 */
  private requestLock(): void {
    this.lockRetries = 5;
    this.doLock();
  }

  private doLock(): void {
    if (this.input.isLocked) return;
    this.input.lock();
  }

  private readonly onGlobalKeyDown = (event: KeyboardEvent): void => {
    this.handleGlobalKeyDown(event);
  };

  private handleGlobalKeyDown(event: KeyboardEvent): void {
    if (event.code === 'KeyM') this.audio.enabled = !this.audio.enabled;
    if (this.state === 'paused' && event.code === 'Enter') {
      event.preventDefault();
      this.requestLock();
    }
  }

  private showHitMarker(crit: boolean): void {
    if (this.hitMarkerTimer) clearTimeout(this.hitMarkerTimer);
    this.crosshairEl.classList.remove('hit', 'crit');
    void this.crosshairEl.offsetWidth;
    this.crosshairEl.classList.add('hit');
    if (crit) this.crosshairEl.classList.add('crit');
    this.hitMarkerTimer = setTimeout(() => {
      this.crosshairEl.classList.remove('hit', 'crit');
      this.hitMarkerTimer = null;
    }, 130);
  }

  private setState(s: GameState): void {
    this.state = s;
    this.menuEl.classList.toggle('hidden', s !== 'menu');
    this.pauseEl.classList.toggle('hidden', s !== 'paused');
    this.deathEl.classList.toggle('hidden', s !== 'dead');
    this.crosshairEl.classList.toggle('hidden', s !== 'playing');
    this.hud.setVisible(s === 'playing');
    this.minimap.setVisible(s === 'playing');
    this.enemyBars.setVisible(s === 'playing');
    this.damageNumbers.setVisible(s === 'playing');
    this.damageFlash.setVisible(s === 'playing');
    if (s === 'playing') {
      this.engine.start();
    } else {
      this.engine.stop();
      this.engine.renderOnce();
    }
    if (s === 'menu') this.refreshMenu();
  }

  private refreshMenu(): void {
    this.continueEl.classList.toggle('hidden', loadSuspend() === null);
    this.menuMetaEl.textContent = `最高 第${this.meta.bestFloor}层 · 累计金币 ${this.meta.totalGold} · 总击杀 ${this.meta.totalKills} · 局数 ${this.meta.runs}`;
  }

  private update(dt: number): void {
    if (this.state !== 'playing') return;

    // 去掉上一帧震动，恢复真实机位（逻辑/射线用真实位置）
    this.engine.camera.position.sub(this.lastShake);

    if (this.hitstop > 0) {
      // 顿帧：暴击瞬间短暂冻结世界，仅保持震动与渲染
      this.hitstop -= dt;
    } else {
      this.world.update(dt);

      const player = this.world.player;
      if (player.hp < this.prevHp) {
        this.damageFlash.flash((this.prevHp - player.hp) / 40);
        this.shake.add(0.3);
      }
      this.prevHp = player.hp;

      this.hud.update(player, this.world.floor, this.world.enemies.length);
      this.minimap.update(this.world);
      this.enemyBars.update(dt, this.world, this.engine.camera, this.world.peekTarget());
      this.damageNumbers.update(dt, this.engine.camera);

      if (!player.alive) {
        this.die();
        return;
      }
    }

    // 应用本帧震动
    const off = this.shake.compute(dt);
    this.engine.camera.position.add(off);
    this.lastShake.copy(off);
  }

  private die(): void {
    const p = this.world.player;
    this.meta = {
      bestFloor: Math.max(this.meta.bestFloor, this.world.floor),
      totalGold: this.meta.totalGold + p.gold,
      totalKills: this.meta.totalKills + p.kills,
      runs: this.meta.runs + 1,
    };
    saveMeta(this.meta);
    clearSuspend();

    this.audio.gameOver();
    this.deathSummaryEl.textContent = `本局：第 ${this.world.floor} 层 · 击杀 ${p.kills} · 金币 ${p.gold} · 等级 ${p.stats.level}`;
    this.setState('dead');
    this.input.controls.unlock();
  }
}

function randomSeed(): number {
  return Math.floor(Math.random() * 1e9);
}
