// WebAudio synth SFX + music. No assets, no network. Lazy init on user gesture.
export class AudioEngine {
  constructor() {
    this.ctx = null; this.master = null; this.musicOn = true; this.muted = false;
    this._step = 0; this._musicTimer = null;
  }
  ensure() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.35;
      this.master.connect(this.ctx.destination);
      this.startMusic();
    } catch (e) { this.ctx = null; }
  }
  _tone(freq, dur, type, vol, slideTo) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator(); const g = this.ctx.createGain();
    o.type = type || 'square'; o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
    g.gain.setValueAtTime(vol || 0.2, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur + 0.02);
  }
  _noise(dur, vol, freq) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    let s = 12345;
    for (let i = 0; i < len; i++) { s = (s * 16807) % 2147483647; d[i] = ((s / 1073741824) - 1) * 0.5; }
    const src = this.ctx.createBufferSource(); src.buffer = buf;
    const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq || 1200;
    const g = this.ctx.createGain(); g.gain.setValueAtTime(vol || 0.2, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f); f.connect(g); g.connect(this.master); src.start(t);
  }
  shoot() { this._noise(0.12, 0.35, 2500); this._tone(180, 0.1, 'square', 0.18, 60); }
  pickup() { this._tone(660, 0.12, 'sine', 0.25); this._tone(990, 0.18, 'sine', 0.22); }
  cash() { this._tone(880, 0.09, 'triangle', 0.25); setTimeout(() => this._tone(1320, 0.14, 'triangle', 0.25), 90); }
  siren() { this._tone(720, 0.35, 'sine', 0.12, 980); }
  crash() { this._noise(0.3, 0.4, 700); }
  buy() { this._tone(523, 0.1, 'triangle', 0.25); setTimeout(() => this._tone(784, 0.12, 'triangle', 0.25), 100); setTimeout(() => this._tone(1046, 0.2, 'triangle', 0.25), 200); }
  mission() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this._tone(f, 0.16, 'triangle', 0.25), i * 110)); }
  startMusic() {
    if (!this.ctx || this._musicTimer) return;
    // Ember synthwave bassline, seeded note pattern (fixed array, no RNG).
    const bass = [55, 55, 65.41, 49, 55, 55, 82.41, 73.42];
    const arp = [220, 261.63, 329.63, 440, 329.63, 261.63];
    this._musicTimer = setInterval(() => {
      if (!this.musicOn || this.muted || !this.ctx) return;
      const b = bass[this._step % bass.length];
      this._tone(b, 0.42, 'sawtooth', 0.07);
      if (this._step % 2 === 0) this._tone(arp[this._step % arp.length], 0.2, 'square', 0.035);
      this._step++;
    }, 240);
  }
  toggleMusic() { this.musicOn = !this.musicOn; return this.musicOn; }
  toggleMute() { this.muted = !this.muted; if (this.master) this.master.gain.value = this.muted ? 0 : 0.35; return !this.muted; }
}
