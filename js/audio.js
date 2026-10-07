'use strict';
// =====================================================================
//  Sound: NES-style synth on Web Audio.
//  Pulse channels are band-limited square waves, the noise channel is
//  1-bit sample-and-hold noise clocked at different rates (like the
//  2A03's noise period register). Timings and pitches follow the
//  original Battle City / Tank 1990 effects.
// =====================================================================

const Sound = {
  ctx: null,
  master: null,
  muted: false,
  noiseCache: {},
  waves: {},
  engine: null,
  engineState: 0,
  engineHoldUntil: 0,

  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.applyVolume();
      this.master.connect(this.ctx.destination);
      this.waves.p50 = this.pulseWave(0.5);
      this.waves.p25 = this.pulseWave(0.25);
      this.waves.p12 = this.pulseWave(0.125);
      this.initEngine();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  },

  toggleMute() {
    this.muted = !this.muted;
    this.applyVolume();
    return this.muted;
  },

  applyVolume() {
    if (!this.master) return;
    const vol = typeof Config !== 'undefined' && Config.values.volume !== undefined ? Config.values.volume / 100 : 1;
    this.master.gain.value = this.muted ? 0 : 0.3 * vol;
    if (this.engine) this.applyEngine();
  },

  midi(n) { return 440 * Math.pow(2, (n - 69) / 12); },

  pulseWave(duty) {
    const n = 64, re = new Float32Array(n), im = new Float32Array(n);
    for (let k = 1; k < n; k++) re[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty);
    return this.ctx.createPeriodicWave(re, im);
  },

  // 1-bit noise held for sampleRate/rate samples (NES noise channel look-alike)
  noiseBuffer(rate) {
    const key = Math.round(rate);
    if (this.noiseCache[key]) return this.noiseCache[key];
    const sr = this.ctx.sampleRate, len = sr;
    const buf = this.ctx.createBuffer(1, len, sr), d = buf.getChannelData(0);
    const hold = Math.max(1, sr / rate);
    let reg = 1, v = 1, acc = 0;
    for (let i = 0; i < len; i++) {
      acc += 1;
      if (acc >= hold) {
        acc -= hold;
        const bit = (reg ^ (reg >> 1)) & 1; // 15-bit LFSR, as on the 2A03
        reg = (reg >> 1) | (bit << 14);
        v = (reg & 1) ? 1 : -1;
      }
      d[i] = v;
    }
    this.noiseCache[key] = buf;
    return buf;
  },

  // pulse note with NES-like volume decay
  note(midi, start, dur, opts = {}) {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain();
    const vol = opts.vol ?? 0.2, wave = opts.wave || 'p50';
    if (wave === 'tri') o.type = 'triangle'; else o.setPeriodicWave(this.waves[wave]);
    o.frequency.setValueAtTime(typeof midi === 'number' && midi < 200 ? this.midi(midi) : midi, start);
    if (opts.slideTo) o.frequency.exponentialRampToValueAtTime(opts.slideTo, start + dur);
    const end = start + dur;
    g.gain.setValueAtTime(vol, start);
    if (opts.flat) g.gain.setValueAtTime(vol, end - 0.008);
    else g.gain.exponentialRampToValueAtTime(Math.max(0.0005, vol * (opts.decayTo ?? 0.2)), end - 0.004);
    g.gain.linearRampToValueAtTime(0, end);
    o.connect(g); g.connect(this.master);
    o.start(start); o.stop(end + 0.01);
  },

  // burst of noise; env: [[time, gain], ...] relative to start
  noise(rate, start, env, rateEnd) {
    const c = this.ctx, s = c.createBufferSource(), g = c.createGain();
    s.buffer = this.noiseBuffer(rate);
    s.loop = true;
    if (rateEnd) {
      const dur = env[env.length - 1][0];
      s.playbackRate.setValueAtTime(1, start);
      s.playbackRate.exponentialRampToValueAtTime(rateEnd / rate, start + dur);
    }
    g.gain.setValueAtTime(env[0][1], start);
    for (let i = 1; i < env.length; i++) g.gain.linearRampToValueAtTime(env[i][1], start + env[i][0]);
    s.connect(g); g.connect(this.master);
    const end = start + env[env.length - 1][0];
    s.start(start, Math.random() * 0.5);
    s.stop(end + 0.01);
  },

  seq(notes, step, t0, opts) {
    let t = t0;
    for (const n of notes) {
      if (n) this.note(n, t, step, opts);
      t += step;
    }
    return t;
  },

  play(name) {
    if (!this.ctx || this.muted || this.master.gain.value === 0) return;
    const t = this.ctx.currentTime + 0.005;
    switch (name) {
      case 'start': this.stageStart(t); break;
      case 'gameover': this.gameOver(t); break;

      case 'shot': // short flat low noise thump
        this.noise(6800, t, [[0, 0.5], [0.085, 0.45], [0.1, 0]]);
        break;
      case 'brick': // deep crunch
        this.noise(1500, t, [[0, 0.55], [0.06, 0.45], [0.075, 0]]);
        break;
      case 'steel': // shell bounces off steel / the field edge: C6 -> C7 ting
        this.note(84, t, 0.04, { vol: 0.09, flat: true });
        this.note(96, t + 0.04, 0.045, { vol: 0.09, decayTo: 0.4 });
        break;
      case 'armor': // armored enemy absorbs a hit
        this.note(84, t, 0.035, { vol: 0.1, flat: true, wave: 'p25' });
        this.note(91, t + 0.035, 0.05, { vol: 0.1, decayTo: 0.3, wave: 'p25' });
        this.noise(9000, t, [[0, 0.15], [0.05, 0]]);
        break;
      case 'explode': // enemy tank
        this.noise(1150, t, [[0, 0.55], [0.26, 0.45], [0.3, 0]]);
        break;
      case 'playerDie':
      case 'baseDie': // big explosion
        this.noise(3400, t, [[0, 0.6], [0.12, 0.6], [0.45, 0.35], [0.52, 0]], 1800);
        break;
      case 'tick': // score tally click
        this.noise(13000, t, [[0, 0.5], [0.02, 0.15], [0.04, 0]]);
        break;
      case 'pause':
        this.seq([72, 74, 76, 84, 86, 88], 0.064, t, { vol: 0.16, decayTo: 0.55 });
        this.note(79, t + 0.384, 0.2, { vol: 0.16, decayTo: 0.12 });
        break;
      case 'puAppear': {
        // quick warbling run, then A4 B4 C5
        const run = [64, 63, 63, 68, 67, 68, 83, 80, 69, 71, 66, 67, 67, 68];
        run.forEach((n, i) => this.note(n, t + i * 0.016, 0.016, { vol: 0.12, flat: true, wave: 'p25' }));
        this.seq([69, 71, 72], 0.064, t + 0.27, { vol: 0.16, decayTo: 0.15 });
        break;
      }
      case 'pickup':
        this.seq([67, 72, 76, 79, 66, 71, 75, 78, 72, 76, 79, 84, 88], 0.05, t, { vol: 0.15, decayTo: 0.45 });
        break;
      case 'enemyPickup':
        this.seq([79, 75, 72, 67, 63], 0.05, t, { vol: 0.14, decayTo: 0.45, wave: 'p25' });
        break;
      case 'life':
        this.seq([76, 79, 84, 88, 0, 76, 79, 84, 88, 91], 0.055, t, { vol: 0.15, decayTo: 0.5 });
        break;
      case 'levelUp': // promotion fanfare
        this.seq([67, 72, 76, 79, 0, 79, 84], 0.07, t, { vol: 0.15, decayTo: 0.55 });
        this.seq([60, 64, 67, 72, 0, 72, 76], 0.07, t, { vol: 0.08, decayTo: 0.5, wave: 'p25' });
        break;
      case 'bonus':
        this.seq([72, 76, 79, 84, 79, 84, 88], 0.07, t, { vol: 0.15, decayTo: 0.45 });
        break;
      case 'skid': // sliding on ice
        this.noise(16000, t, [[0, 0.1], [0.2, 0.06], [0.24, 0]]);
        break;
      case 'bossWarn': // siren
        for (let i = 0; i < 3; i++) {
          this.note(81, t + i * 0.24, 0.12, { vol: 0.15, flat: true, wave: 'p25' });
          this.note(76, t + i * 0.24 + 0.12, 0.12, { vol: 0.15, flat: true, wave: 'p25' });
        }
        break;
      case 'charge':
        this.noise(700, t, [[0, 0.35], [0.12, 0]]);
        break;
      case 'laser':
        this.note(2200, t, 0.35, { vol: 0.12, slideTo: 300, flat: true, wave: 'p12' });
        this.noise(12000, t, [[0, 0.2], [0.35, 0]]);
        break;
      case 'burrow':
        this.noise(500, t, [[0, 0.45], [0.4, 0.3], [0.55, 0]], 300);
        break;
      case 'teleport':
        this.seq([72, 79, 84, 91, 96], 0.035, t, { vol: 0.12, decayTo: 0.4, wave: 'p25' });
        break;
      case 'bossDie':
        this.noise(2000, t, [[0, 0.7], [0.5, 0.6], [1.6, 0]], 120);
        this.seq([72, 67, 64, 60, 55, 48], 0.12, t + 0.2, { vol: 0.15, decayTo: 0.5 });
        break;
      case 'select':
        this.noise(13000, t, [[0, 0.35], [0.03, 0]]);
        break;
      case 'build':
        this.noise(4000, t, [[0, 0.35], [0.04, 0]]);
        break;
    }
  },

  // Stage start fanfare: triplet runs climbing through Cm, Eb, F, Ab-Bb, ending on C major.
  stageStart(t0) {
    const G = 0.4, S = G / 3;
    const lead = [[72, 74, 75], [72, 74, 75], [75, 77, 79], [75, 77, 79], [77, 79, 81], [77, 79, 81], [80, 82, 84], [80, 82, 84]];
    const chords = [[55, 48], [55, 48], [58, 51], [58, 51], [60, 53], [60, 53], [63, 56], [65, 58]];
    const fullHarmony = [false, true, false, true, false, true, true, true];
    for (let g = 0; g < 8; g++) {
      for (let k = 0; k < 3; k++) {
        const t = t0 + g * G + k * S;
        this.note(lead[g][k], t, S * 0.95, { vol: 0.22, decayTo: 0.25 });
        if (k === 0 || fullHarmony[g]) {
          this.note(chords[g][0], t, S * 0.95, { vol: 0.1, decayTo: 0.2 });
          this.note(chords[g][1], t, S * 0.95, { vol: 0.3, wave: 'tri', flat: true });
        }
      }
    }
    const end = t0 + 8 * G;
    this.note(84, end, 0.16, { vol: 0.17, decayTo: 0.15 });
    this.note(64, end, 0.16, { vol: 0.1, decayTo: 0.2 });
    this.note(55, end, 0.16, { vol: 0.3, wave: 'tri', flat: true });
    [0.4, 0.54, 0.67, 0.8].forEach((dt, i) => {
      const len = i === 3 ? 0.16 : 0.12;
      this.note(84, end + dt, len, { vol: 0.17, decayTo: 0.15 });
      this.note(64, end + dt, len, { vol: 0.1, decayTo: 0.2 });
      this.note(55, end + dt, len, { vol: 0.3, wave: 'tri', flat: true });
    });
    // the engine stays quiet while the fanfare plays, as in the original
    this.engineHoldUntil = t0 + 4.3;
    this.applyEngine();
  },

  gameOver(t0) {
    const stab = (t, top, len, decay) => {
      this.note(top, t, len, { vol: 0.15, decayTo: decay });
      this.note(67, t, len, { vol: 0.1, decayTo: decay });
      this.note(63, t, len, { vol: 0.15, wave: 'tri', decayTo: 0.5 });
    };
    stab(t0 + 0.04, 72, 0.1, 0.4);
    stab(t0 + 0.14, 70, 0.12, 0.4);
    stab(t0 + 0.26, 72, 0.2, 0.3);
    const run = [[0.64, 63, 79, 0.14], [0.78, 62, 77, 0.12], [0.9, 61, 76, 0.05], [0.95, 59, 75, 0.13]];
    for (const [dt, lo, hi, len] of run) {
      this.note(lo, t0 + dt, len, { vol: 0.2, wave: 'p25', decayTo: 0.4 });
      this.note(hi, t0 + dt, len, { vol: 0.08, decayTo: 0.4 });
    }
    [1.08, 1.2, 1.33, 1.47].forEach((dt, i) => {
      const len = i === 3 ? 0.2 : 0.12;
      this.note(60, t0 + dt, len, { vol: 0.22, wave: 'p25', decayTo: i === 3 ? 0.05 : 0.35 });
      this.note(72, t0 + dt, len, { vol: 0.06, decayTo: 0.3 });
      this.note(54, t0 + dt, len, { vol: 0.2, wave: 'tri', flat: true });
    });
  },

  // ---------------------------------------------------------------- engine
  // Two-tone pulse rumble: a slow low throb when idle, a faster higher buzz when moving.
  initEngine() {
    const c = this.ctx;
    const o = c.createOscillator(), g = c.createGain(), lfo = c.createOscillator(), lg = c.createGain();
    o.setPeriodicWave(this.waves.p25);
    o.frequency.value = 55;
    lfo.type = 'square';
    lfo.frequency.value = 15;
    lg.gain.value = 6;
    lfo.connect(lg); lg.connect(o.frequency);
    g.gain.value = 0;
    o.connect(g); g.connect(this.master);
    o.start(); lfo.start();
    this.engine = { o, g, lfo, lg };
  },

  // 0 = off, 1 = idle, 2 = moving
  setEngine(state) {
    if (state === this.engineState) return;
    this.engineState = state;
    this.applyEngine();
  },

  applyEngine() {
    if (!this.engine) return;
    const t = this.ctx.currentTime, e = this.engine;
    const state = typeof Config !== 'undefined' && Config.values.engineSound === 'OFF' ? 0 : this.engineState;
    e.g.gain.cancelScheduledValues(t);
    if (state === 0) { e.g.gain.setTargetAtTime(0, t, 0.01); return; }
    const vol = state === 1 ? 0.06 : 0.07;
    const from = Math.max(t, this.engineHoldUntil);
    if (from > t) e.g.gain.setTargetAtTime(0, t, 0.01);
    e.g.gain.setTargetAtTime(vol, from, 0.01);
    e.o.frequency.setTargetAtTime(state === 2 ? 98 : 49, t, 0.01);
    e.lg.gain.setTargetAtTime(state === 2 ? 10 : 7, t, 0.01);
    e.lfo.frequency.setTargetAtTime(state === 2 ? 30 : 15, t, 0.01);
  },
};
