// 程序化音效：纯 WebAudio 合成，零外部资源。
// AudioContext 需用户手势解锁（浏览器自动播放策略），首次点击时调用 unlock()。
export class GameAudio {
  private ctx: AudioContext | null = null;
  enabled = true;

  /** 在用户手势中调用，创建/恢复 AudioContext。 */
  unlock(): void {
    if (!this.ctx) {
      try {
        this.ctx = new AudioContext();
      } catch {
        this.ctx = null; // 无音频环境则静默禁用
        return;
      }
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  private tone(
    freq: number,
    dur: number,
    type: OscillatorType = 'square',
    vol = 0.2,
    slideTo?: number,
  ): void {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t + dur);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain).connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + dur);
  }

  private noise(dur: number, vol: number): void {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime;
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, t);
    src.buffer = buffer;
    src.connect(gain).connect(this.ctx.destination);
    src.start(t);
  }

  swing(): void {
    this.tone(240, 0.09, 'square', 0.1, 110);
  }

  dash(): void {
    this.noise(0.12, 0.1);
    this.tone(180, 0.12, 'sine', 0.12, 420);
  }

  hit(crit = false): void {
    this.tone(crit ? 200 : 150, 0.1, 'sawtooth', 0.22, 60);
    this.noise(0.08, 0.15);
  }

  enemyDeath(): void {
    this.tone(320, 0.25, 'sawtooth', 0.22, 50);
    this.noise(0.18, 0.12);
  }

  playerHurt(): void {
    this.tone(110, 0.18, 'square', 0.25, 55);
  }

  pickup(): void {
    this.tone(660, 0.09, 'sine', 0.18, 990);
  }

  levelUp(): void {
    this.tone(523, 0.1, 'square', 0.18);
    setTimeout(() => this.tone(659, 0.1, 'square', 0.18), 90);
    setTimeout(() => this.tone(784, 0.16, 'square', 0.18), 180);
  }

  descend(): void {
    this.tone(400, 0.4, 'sine', 0.2, 90);
  }

  gameOver(): void {
    this.tone(392, 0.3, 'triangle', 0.22, 330);
    setTimeout(() => this.tone(330, 0.3, 'triangle', 0.22, 262), 220);
    setTimeout(() => this.tone(262, 0.5, 'triangle', 0.22, 130), 440);
  }
}
