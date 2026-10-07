'use strict';
// =====================================================================
//  Sound: tiny chiptune synth on Web Audio (square / triangle / noise)
// =====================================================================

const Sound = {
  ctx: null,
  master: null,
  noiseBuf: null,
  muted: false,
  engine: null,
  engineState: 0,

  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.28;
      this.master.connect(this.ctx.destination);
      const len = this.ctx.sampleRate;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      // NES-ish noise: sample-and-hold random values
      let v = 0;
      for (let i = 0; i < len; i++) { if (i % 6 === 0) v = Math.random() * 2 - 1; d[i] = v; }
      this.initEngine();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  },

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.28;
    return this.muted;
  },

  midi(n) { return 440 * Math.pow(2, (n - 69) / 12); },

  tone(freq, start, dur, type = 'square', vol = 0.3, slideTo = null) {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, start);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, start + dur);
    g.gain.setValueAtTime(vol, start);
    g.gain.setValueAtTime(vol, start + dur * 0.7);
    g.gain.linearRampToValueAtTime(0.0001, start + dur);
    o.connect(g); g.connect(this.master);
    o.start(start); o.stop(start + dur + 0.02);
  },

  noise(start, dur, vol = 0.4, freq = 3000, endFreq = null, q = 0.7) {
    const c = this.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = this.noiseBuf;
    s.loop = true;
    f.type = 'lowpass';
    f.frequency.setValueAtTime(freq, start);
    if (endFreq) f.frequency.exponentialRampToValueAtTime(endFreq, start + dur);
    f.Q.value = q;
    g.gain.setValueAtTime(vol, start);
    g.gain.exponentialRampToValueAtTime(0.001, start + dur);
    s.connect(f); f.connect(g); g.connect(this.master);
    s.start(start, Math.random() * 0.5); s.stop(start + dur + 0.02);
  },

  seq(notes, step, type, vol, t0) {
    let t = t0;
    for (const [n, len] of notes) {
      if (n > 0) this.tone(this.midi(n), t, step * len * 0.95, type, vol);
      t += step * len;
    }
    return t;
  },

  play(name) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime + 0.01;
    switch (name) {
      case 'start': {
        const step = 0.095;
        this.seq([[67, 1], [72, 1], [76, 1], [79, 2], [76, 1], [79, 3], [77, 1], [81, 1], [84, 1], [86, 2], [84, 1], [88, 4]], step, 'square', 0.18, t);
        this.seq([[64, 1], [67, 1], [72, 1], [76, 2], [72, 1], [76, 3], [74, 1], [77, 1], [81, 1], [83, 2], [79, 1], [84, 4]], step, 'square', 0.1, t);
        this.seq([[48, 3], [55, 3], [52, 3], [53, 3], [55, 3], [48, 4]], step, 'triangle', 0.35, t);
        break;
      }
      case 'shot':
        this.tone(1400, t, 0.06, 'square', 0.18, 300);
        this.noise(t, 0.08, 0.15, 6000, 1500);
        break;
      case 'brick':
        this.noise(t, 0.12, 0.45, 2200, 400);
        break;
      case 'steel':
        this.tone(1800, t, 0.05, 'square', 0.15, 1500);
        this.tone(900, t + 0.02, 0.05, 'triangle', 0.25);
        break;
      case 'armor':
        this.tone(500, t, 0.08, 'square', 0.2, 180);
        this.noise(t, 0.08, 0.2, 5000, 2000);
        break;
      case 'explode':
        this.noise(t, 0.6, 0.65, 1800, 120, 1);
        this.tone(140, t, 0.3, 'triangle', 0.4, 40);
        break;
      case 'playerDie':
        this.noise(t, 1.0, 0.75, 2500, 80, 1);
        this.tone(220, t, 0.5, 'square', 0.15, 50);
        break;
      case 'baseDie':
        this.noise(t, 1.4, 0.8, 1500, 60, 1);
        this.tone(110, t, 1.0, 'triangle', 0.5, 30);
        break;
      case 'puAppear':
        this.seq([[84, 1], [88, 1], [91, 1], [96, 1], [91, 1], [96, 2]], 0.045, 'triangle', 0.4, t);
        break;
      case 'pickup':
        this.seq([[72, 1], [76, 1], [79, 1], [84, 1], [76, 1], [79, 1], [84, 1], [88, 2]], 0.04, 'square', 0.17, t);
        break;
      case 'enemyPickup':
        this.seq([[79, 1], [75, 1], [72, 1], [67, 1], [63, 2]], 0.05, 'square', 0.17, t);
        break;
      case 'life':
        this.seq([[76, 1], [79, 1], [84, 1], [88, 2], [0, 1], [76, 1], [79, 1], [84, 1], [88, 3]], 0.06, 'square', 0.18, t);
        break;
      case 'pause':
        this.seq([[84, 1], [79, 1], [84, 1], [79, 1], [84, 2]], 0.06, 'square', 0.16, t);
        break;
      case 'tick':
        this.tone(1320, t, 0.035, 'square', 0.15);
        break;
      case 'bonus':
        this.seq([[72, 1], [76, 1], [79, 1], [84, 2], [79, 1], [84, 3]], 0.07, 'square', 0.18, t);
        break;
      case 'gameover': {
        const step = 0.16;
        this.seq([[72, 1], [71, 1], [69, 1], [67, 2], [64, 1], [62, 1], [60, 4]], step, 'square', 0.18, t);
        this.seq([[48, 3], [43, 3], [36, 5]], step, 'triangle', 0.4, t);
        break;
      }
      case 'skid':
        this.noise(t, 0.25, 0.12, 7000, 3000, 3);
        break;
      case 'freeze':
        this.seq([[96, 1], [91, 1], [96, 1], [91, 1]], 0.04, 'triangle', 0.3, t);
        break;
      case 'select':
        this.tone(880, t, 0.04, 'square', 0.14);
        break;
      case 'build':
        this.noise(t, 0.05, 0.3, 4000, 1000);
        break;
    }
  },

  initEngine() {
    const c = this.ctx;
    const o = c.createOscillator(), g = c.createGain(), lfo = c.createOscillator(), lg = c.createGain();
    o.type = 'square';
    o.frequency.value = 55;
    lfo.type = 'square';
    lfo.frequency.value = 14;
    lg.gain.value = 6;
    lfo.connect(lg); lg.connect(o.frequency);
    g.gain.value = 0;
    o.connect(g); g.connect(this.master);
    o.start(); lfo.start();
    this.engine = { o, g, lfo };
  },

  // 0 = off, 1 = idle, 2 = moving
  setEngine(state) {
    if (!this.engine || state === this.engineState) return;
    this.engineState = state;
    const t = this.ctx.currentTime, e = this.engine;
    e.g.gain.cancelScheduledValues(t);
    e.g.gain.setTargetAtTime(state === 0 ? 0 : (state === 1 ? 0.035 : 0.05), t, 0.02);
    e.o.frequency.setTargetAtTime(state === 2 ? 82 : 52, t, 0.02);
    e.lfo.frequency.setTargetAtTime(state === 2 ? 22 : 12, t, 0.02);
  },
};
