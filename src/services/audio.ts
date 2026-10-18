// Sons gerados por código (Web Audio) - secção 8. Trocáveis por ficheiros: se o
// assets/manifest.json tiver "src" para um som, usa o ficheiro em vez do som gerado.
export type Sfx =
  | 'tap'
  | 'slot'
  | 'deliver'
  | 'pieceDone'
  | 'combo'
  | 'win'
  | 'lose'
  | 'coins'
  | 'chest'
  | 'button'
  | 'error'
  | 'pop';

type Wave = OscillatorType;

export class AudioService {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private files = new Map<string, AudioBuffer>();
  private musicTimer: ReturnType<typeof setInterval> | null = null;
  private nextNote = 0;
  private step = 0;
  soundOn = true;
  musicOn = true;

  /** Tem de ser chamado num toque do utilizador (regra dos browsers/Android). */
  unlock(): void {
    if (!this.ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.6;
      this.master.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.18;
      this.musicGain.connect(this.master);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    if (this.musicOn) this.startMusic();
  }

  suspend(): void {
    if (this.ctx && this.ctx.state === 'running') void this.ctx.suspend();
  }
  resume(): void {
    if (this.ctx && this.ctx.state === 'suspended') void this.ctx.resume();
  }

  /** Carrega ficheiros de som indicados no manifesto (opcional). */
  async loadFiles(entries: Record<string, string>): Promise<void> {
    if (!this.ctx) return;
    for (const [key, url] of Object.entries(entries)) {
      try {
        const buf = await (await fetch(url)).arrayBuffer();
        this.files.set(key, await this.ctx.decodeAudioData(buf));
      } catch {
        console.warn('[audio] não carregou', key);
      }
    }
    if (this.files.has('music') && this.musicOn) {
      this.stopMusic();
      this.startMusic();
    }
  }

  setSound(on: boolean): void {
    this.soundOn = on;
  }
  setMusic(on: boolean): void {
    this.musicOn = on;
    if (on) this.startMusic();
    else this.stopMusic();
  }

  play(name: Sfx, level = 0): void {
    if (!this.soundOn || !this.ctx || !this.master) return;
    const file = this.files.get(`sfx_${name}`);
    if (file) {
      const src = this.ctx.createBufferSource();
      src.buffer = file;
      src.playbackRate.value = 1 + level * 0.06;
      src.connect(this.master);
      src.start();
      return;
    }
    const t = this.ctx.currentTime;
    switch (name) {
      case 'tap':
        this.tone(660, t, 0.06, 'triangle', 0.25);
        break;
      case 'button':
        this.tone(520, t, 0.05, 'triangle', 0.2);
        this.tone(780, t + 0.03, 0.06, 'triangle', 0.15);
        break;
      case 'slot':
        this.tone(440, t, 0.08, 'sine', 0.3, 660);
        break;
      case 'deliver':
        // tom sobe com o combo / número de entregas seguidas
        this.tone(700 * Math.pow(2, Math.min(level, 24) / 24), t, 0.05, 'sine', 0.12);
        break;
      case 'pop':
        this.tone(900, t, 0.07, 'square', 0.08, 300);
        break;
      case 'pieceDone':
        this.tone(523, t, 0.09, 'triangle', 0.3);
        this.tone(784, t + 0.07, 0.12, 'triangle', 0.3);
        break;
      case 'combo': {
        const base = 523 * Math.pow(2, Math.min(level, 6) / 6);
        [0, 4, 7, 12].forEach((s, i) => this.tone(base * Math.pow(2, s / 12), t + i * 0.06, 0.12, 'triangle', 0.25));
        break;
      }
      case 'win':
        [0, 4, 7, 12, 16].forEach((s, i) => this.tone(523 * Math.pow(2, s / 12), t + i * 0.1, 0.25, 'triangle', 0.3));
        break;
      case 'lose':
        [7, 4, 0, -5].forEach((s, i) => this.tone(392 * Math.pow(2, s / 12), t + i * 0.14, 0.25, 'sine', 0.25));
        break;
      case 'coins':
        for (let i = 0; i < 4; i++) this.tone(1200 + i * 150, t + i * 0.05, 0.06, 'square', 0.06);
        break;
      case 'chest':
        this.tone(200, t, 0.2, 'sawtooth', 0.08, 400);
        [0, 4, 7, 12].forEach((s, i) => this.tone(659 * Math.pow(2, s / 12), t + 0.2 + i * 0.07, 0.2, 'triangle', 0.25));
        break;
      case 'error':
        this.tone(200, t, 0.12, 'square', 0.12, 150);
        break;
    }
  }

  private tone(freq: number, at: number, dur: number, type: Wave, vol: number, slideTo?: number, out?: AudioNode): void {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, at);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, at + dur);
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(vol, at + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    o.connect(g);
    g.connect(out ?? this.master!);
    o.start(at);
    o.stop(at + dur + 0.02);
  }

  // ------------------------------------------------------------- música calma de jardim

  private musicSrc: AudioBufferSourceNode | null = null;

  private startMusic(): void {
    if (!this.ctx || this.musicTimer || this.musicSrc || !this.musicOn) return;
    const file = this.files.get('music');
    if (file && this.musicGain) {
      // música a partir de ficheiro (manifest.json), em ciclo
      this.musicSrc = this.ctx.createBufferSource();
      this.musicSrc.buffer = file;
      this.musicSrc.loop = true;
      this.musicSrc.connect(this.musicGain);
      this.musicSrc.start();
      return;
    }
    this.nextNote = this.ctx.currentTime + 0.1;
    this.musicTimer = setInterval(() => this.schedule(), 200);
  }

  private stopMusic(): void {
    if (this.musicTimer) clearInterval(this.musicTimer);
    this.musicTimer = null;
    this.musicSrc?.stop();
    this.musicSrc = null;
  }

  private schedule(): void {
    if (!this.ctx || !this.musicGain) return;
    const beat = 0.42;
    // Pentatónica em Dó: dedilhado suave + baixo, ciclo de 32 tempos
    const scale = [0, 2, 4, 7, 9, 12, 14, 16];
    const chords = [0, 9, 5, 7];
    while (this.nextNote < this.ctx.currentTime + 0.6) {
      const bar = Math.floor(this.step / 8) % 4;
      const root = 261.63 * Math.pow(2, chords[bar] / 12);
      const pos = this.step % 8;
      if (pos === 0) this.tone(root / 2, this.nextNote, beat * 3.5, 'sine', 0.35, undefined, this.musicGain);
      const pattern = [0, 2, 4, 2, 5, 4, 3, 1];
      const note = scale[(pattern[pos] + bar) % scale.length];
      if (pos % 2 === 0 || (this.step * 7) % 5 < 3) {
        this.tone(root * Math.pow(2, note / 12), this.nextNote, beat * 0.9, 'triangle', 0.18, undefined, this.musicGain);
      }
      this.nextNote += beat;
      this.step++;
    }
  }
}
