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
      case 'flame': // flamer jet
        this.noise(5000, t, [[0, 0.13], [0.5, 0.1], [0.65, 0]]);
        break;
      case 'mortar': // a shell lobbed into the air
        this.note(43, t, 0.08, { vol: 0.2, decayTo: 0.1 });
        this.noise(9000, t, [[0, 0.1], [0.08, 0]]);
        break;
      case 'heal': // medic repair
        this.seq([79, 84, 91], 0.045, t, { vol: 0.08, decayTo: 0.4, wave: 'p25' });
        break;
      case 'mark': // spotter has you
        this.seq([88, 0, 88], 0.05, t, { vol: 0.09, flat: true, wave: 'p25' });
        break;
      case 'split': // splitter breaks in two
        this.seq([67, 60], 0.06, t, { vol: 0.12, decayTo: 0.3 });
        break;
      case 'claude': { // Claude's happy chirps: a random little tune each time
        const tunes = [[84, 88, 91], [91, 86], [79, 84, 79, 88], [88, 0, 88, 93], [76, 83, 88, 95], [93, 88, 84, 81]];
        const tune = tunes[Math.floor(Math.random() * tunes.length)];
        this.seq(tune, 0.05 + Math.random() * 0.03, t, { vol: 0.09, decayTo: 0.5, wave: Math.random() < 0.5 ? 'p25' : 'p12' });
        break;
      }
      case 'zap': // tesla coil
        this.noise(20000, t, [[0, 0.12], [0.04, 0.02], [0.06, 0.12], [0.14, 0]]);
        this.note(96, t, 0.12, { vol: 0.06, slideTo: 400, wave: 'p12' });
        break;
      case 'chomp': // the snake swallows a tank
        this.note(40, t, 0.12, { vol: 0.2, slideTo: 28 });
        this.noise(2000, t + 0.05, [[0, 0.15], [0.2, 0]]);
        this.seq([0, 0, 0, 45, 0, 43], 0.06, t, { vol: 0.12, decayTo: 0.3 });
        break;
      case 'nom': // munch munch
        this.seq([52, 0, 52], 0.05, t, { vol: 0.16, decayTo: 0.3 });
        this.noise(3000, t, [[0, 0.08], [0.05, 0], [0.1, 0.08], [0.15, 0]]);
        break;
      case 'claudeBye':
        this.seq([88, 84, 79, 76, 72], 0.06, t, { vol: 0.09, decayTo: 0.5, wave: 'p25' });
        break;
      case 'plane': // a plane roars over
        this.noise(2600, t, [[0, 0], [0.4, 0.12], [1.1, 0.12], [1.6, 0]], 7000);
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
      case 'bossPhase': // a boss enters a new phase: a crunch and a falling wail
        this.noise(1500, t, [[0, 0.6], [0.3, 0.3], [0.6, 0]], 200);
        this.note(76, t, 0.5, { vol: 0.14, slideTo: 300, wave: 'p25' });
        this.note(64, t + 0.1, 0.5, { vol: 0.1, slideTo: 150, wave: 'p25' });
        break;
      case 'slipper': // a slipper whizzing through the air
        this.noise(6000, t, [[0, 0.12], [0.15, 0.04], [0.2, 0]], 2000);
        break;
      case 'splash': // a bucket of water
        this.noise(3000, t, [[0, 0.35], [0.1, 0.25], [0.45, 0]], 600);
        break;
      case 'grawlix': // a grumbling old voice: #@%*!
        this.seq([52, 50, 55, 49, 53], 0.06, t, { vol: 0.12, wave: 'p25', decayTo: 0.5 });
        break;
      case 'rotor': // helicopter blades
        for (let i = 0; i < 4; i++) this.noise(900, t + i * 0.1, [[0, 0.22], [0.05, 0]], 400);
        break;
      case 'whistle': // a train's two-tone whistle
        this.note(81, t, 0.5, { vol: 0.11, flat: true, wave: 'p25' });
        this.note(85, t, 0.5, { vol: 0.08, flat: true, wave: 'p12' });
        this.note(81, t + 0.6, 0.35, { vol: 0.11, decayTo: 0.4, wave: 'p25' });
        break;
      case 'ufo': // the saucer's warble
        this.note(88, t, 0.25, { vol: 0.05, slideTo: 1600, wave: 'p12' });
        this.note(93, t + 0.25, 0.25, { vol: 0.05, slideTo: 1200, wave: 'p12' });
        break;
      case 'beam': // the tractor beam powers up
        this.note(48, t, 1.2, { vol: 0.1, slideTo: 900, wave: 'tri' });
        this.seq([72, 76, 79, 84, 79, 76], 0.1, t + 0.4, { vol: 0.06, wave: 'p12', decayTo: 0.5 });
        break;
      case 'laser':
        this.note(2200, t, 0.35, { vol: 0.12, slideTo: 300, flat: true, wave: 'p12' });
        this.noise(12000, t, [[0, 0.2], [0.35, 0]]);
        break;
      // tank weapons with a voice of their own
      case 'mg': // machine-gun rattle
        this.noise(11000, t, [[0, 0.3], [0.025, 0.05], [0.04, 0]]);
        this.note(52, t, 0.035, { vol: 0.12, flat: true, wave: 'p25' });
        break;
      case 'missile': // rocket leaves the rack: hiss rising
        this.noise(3000, t, [[0, 0.3], [0.25, 0.12], [0.35, 0]], 9000);
        this.note(45, t, 0.08, { vol: 0.12, slideTo: 60, wave: 'p25' });
        break;
      // GALAXY guns
      case 'gxBlaster': // the classic pew
        this.note(1500, t, 0.07, { vol: 0.1, slideTo: 520, wave: 'p25' });
        break;
      case 'gxSpread': // a wide, buzzy fan
        this.note(1100, t, 0.09, { vol: 0.08, slideTo: 260, wave: 'p12' });
        this.note(1400, t, 0.06, { vol: 0.05, slideTo: 700, wave: 'p50' });
        this.noise(15000, t, [[0, 0.1], [0.05, 0]]);
        break;
      case 'gxPlasma': // a fat throbbing blob
        this.note(110, t, 0.22, { vol: 0.18, slideTo: 330, wave: 'tri', decayTo: 0.4 });
        this.note(220, t, 0.16, { vol: 0.05, slideTo: 90, wave: 'p50' });
        break;
      case 'gxLaser': // a steady hum while the beam is on (called every 8 frames)
        this.note(1320, t, 0.14, { vol: 0.028, flat: true, wave: 'p12' });
        this.note(663, t, 0.14, { vol: 0.024, flat: true, wave: 'p25' });
        break;
      case 'gxLightning': // crackle
        this.noise(18000, t, [[0, 0.16], [0.03, 0.03], [0.05, 0.14], [0.1, 0]]);
        this.note(1800, t, 0.08, { vol: 0.04, slideTo: 3200, wave: 'p12' });
        break;
      case 'gxMissile': // swarm of rockets: a rising hiss
        this.noise(2500, t, [[0, 0.18], [0.2, 0.06], [0.26, 0]], 8000);
        break;
      case 'gxDrone': // wingman tick
        this.note(2400, t, 0.03, { vol: 0.05, slideTo: 1500, wave: 'p12' });
        break;
      case 'gxHit': // a shot plinks off an enemy
        this.note(88, t, 0.03, { vol: 0.05, flat: true, wave: 'p12' });
        break;
      case 'gxPop': // a small ship bursts
        this.noise(2600, t, [[0, 0.3], [0.1, 0.12], [0.16, 0]], 900);
        break;
      // GALAXY's later sectors (galaxy2.js)
      case 'honk': // a flying taxi's horn
        this.note(64, t, 0.12, { vol: 0.08, flat: true, wave: 'p25' }); this.note(68, t, 0.12, { vol: 0.06, flat: true, wave: 'p50' });
        break;
      case 'moo':
        this.note(52, t, 0.45, { vol: 0.16, slideTo: 130, wave: 'p25', decayTo: 0.5 });
        break;
      // GALAXY's sectors 12-13 (galaxy3.js)
      case 'gx3Line': // a line clears: a bright ring up
        this.seq([72, 79, 84, 88], 0.04, t, { vol: 0.11, wave: 'p25', decayTo: 0.5 }); this.noise(9000, t, [[0, 0.12], [0.25, 0]]);
        break;
      case 'gx3Tetris': // four lines at once
        this.seq([72, 76, 79, 84, 79, 84, 88, 91], 0.045, t, { vol: 0.12, wave: 'p25', decayTo: 0.5 }); this.noise(6000, t, [[0, 0.25], [0.4, 0]]);
        break;
      case 'gx3Drop': // a hard drop: a thud
        this.note(55, t, 0.12, { vol: 0.2, slideTo: 40, wave: 'tri' }); this.noise(1200, t, [[0, 0.3], [0.08, 0]]);
        break;
      case 'gx3Turn': // a piece turns: a click
        this.note(1760, t, 0.025, { vol: 0.05, wave: 'p12', flat: true });
        break;
      case 'gx3Rise': // garbage coming up
        this.note(43, t, 0.3, { vol: 0.14, slideTo: 120, wave: 'p50' });
        break;
      case 'gx3Aim': // an I piece takes aim
        this.note(1200, t, 0.15, { vol: 0.04, slideTo: 2400, wave: 'p12' });
        break;
      case 'gx3Level': // level up
        this.seq([67, 72, 76, 79, 84], 0.06, t, { vol: 0.13, decayTo: 0.5 });
        break;
      case 'gx3Type': // typing
        this.noise(14000, t, [[0, 0.1], [0.02, 0]]); this.noise(14000, t + 0.06, [[0, 0.08], [0.02, 0]]); this.noise(14000, t + 0.1, [[0, 0.1], [0.02, 0]]);
        break;
      case 'gx3Burst': // a chat bubble pops
        this.note(1600, t, 0.08, { vol: 0.08, slideTo: 400, wave: 'p25' }); this.noise(5000, t, [[0, 0.15], [0.06, 0]]);
        break;
      case 'gx3Ding': // a notification
        this.seq([88, 84], 0.07, t, { vol: 0.08, wave: 'p50', decayTo: 0.4 });
        break;
      case 'gx3Grab': // fingers flexing
        this.note(300, t, 0.2, { vol: 0.07, slideTo: 150, wave: 'p25' }); this.noise(3000, t, [[0, 0.06], [0.15, 0]]);
        break;
      case 'gx3Glitch': // a glitch: stuttering noise and a broken blip
        this.noise(20000, t, [[0, 0.2], [0.03, 0], [0.05, 0.2], [0.08, 0], [0.12, 0.15], [0.16, 0]]); this.seq([96, 0, 91, 98], 0.03, t, { vol: 0.05, wave: 'p12', flat: true });
        break;
      case 'gx3Slap': // the big hand lands
        this.noise(900, t, [[0, 0.5], [0.2, 0.15], [0.35, 0]], 300); this.note(60, t, 0.2, { vol: 0.15, slideTo: 35, wave: 'tri' });
        break;
      case 'gx3Regen': // regenerating: a rising hum
        this.note(220, t, 0.5, { vol: 0.06, slideTo: 880, wave: 'p25', flat: true });
        break;
      case 'gx3Chat': // a chatbot's cheerful blips
        this.seq([79 + rnd(5), 84, 81 + rnd(4)], 0.04, t, { vol: 0.06, wave: 'p50', flat: true });
        break;
      case 'march0': case 'march1': case 'march2': case 'march3': // the invaders' four-note footsteps
        this.note([45, 43, 41, 40][+name[5]], t, 0.07, { vol: 0.22, wave: 'tri', flat: true });
        break;
      case 'ack': // martian chatter
        this.seq([84, 79, 86, 77], 0.04, t, { vol: 0.06, wave: 'p12', flat: true });
        break;
      case 'yodel':
        this.seq([67, 76, 67, 79, 67, 84], 0.09, t, { vol: 0.12, wave: 'p25', decayTo: 0.6 });
        break;
      case 'mph': // the time car revs up
        this.note(40, t, 0.7, { vol: 0.14, slideTo: 600, wave: 'p25', flat: true });
        this.noise(4000, t, [[0, 0.06], [0.6, 0.14], [0.7, 0]], 9000);
        break;
      case 'adapt': // the cube adapts: a low hum
        this.note(36, t, 0.6, { vol: 0.16, wave: 'tri', flat: true }); this.note(43, t, 0.6, { vol: 0.07, wave: 'p50', decayTo: 0.4 });
        break;
      case 'cityBlast': // the city killer's beam
        this.noise(800, t, [[0, 0.6], [0.6, 0.5], [1.1, 0]], 150);
        this.note(55, t, 0.9, { vol: 0.15, slideTo: 50, wave: 'p50' });
        break;
      case 'talk': // a villain on the main screen
        this.seq([60, 55, 62, 57, 59], 0.05, t, { vol: 0.07, wave: 'p12', flat: true });
        break;
      case 'ray': // a martian ray gun
        this.note(2000, t, 0.1, { vol: 0.05, slideTo: 3200, wave: 'p12' });
        break;
      // GALAXY, how it feels (galaxy_feel.js)
      case 'gxSwap': // weapons swap: a quick two-step blip
        this.seq([79, 86], 0.035, t, { vol: 0.09, wave: 'p25', decayTo: 0.5 });
        break;
      case 'gxEmpty': // nothing to swap to, no bombs: a dry click
        this.note(220, t, 0.03, { vol: 0.07, wave: 'p12', flat: true });
        break;
      case 'gxHiss': // overheated: steam
        this.noise(12000, t, [[0, 0.16], [0.18, 0.08], [0.3, 0]], 6000);
        break;
      case 'gxCharged': // the charge is full: a bright ping
        this.note(2637, t, 0.18, { vol: 0.07, wave: 'p50', decayTo: 0.3 });
        this.note(3520, t + 0.05, 0.14, { vol: 0.04, wave: 'p25', decayTo: 0.3 });
        break;
      case 'gxBlast': // the charge blast: a deep whoosh
        this.note(600, t, 0.35, { vol: 0.18, slideTo: 70, wave: 'p50', decayTo: 0.4 });
        this.noise(3000, t, [[0, 0.4], [0.3, 0.15], [0.45, 0]], 400);
        break;
      case 'gxGraze': // a shot brushes past: a tiny tick
        this.note(3200, t, 0.02, { vol: 0.04, wave: 'p12', flat: true });
        break;
      case 'gxComboLost': // the chain breaks: a falling blip
        this.seq([76, 71, 64], 0.05, t, { vol: 0.08, wave: 'p25', decayTo: 0.5 });
        break;
      case 'burrow':
        this.noise(500, t, [[0, 0.45], [0.4, 0.3], [0.55, 0]], 300);
        break;
      case 'gxPerkIn': // GALAXY: perk capsules drift in
        this.seq([79, 0, 84, 0, 91], 0.06, t, { vol: 0.07, wave: 'p12', decayTo: 0.4 });
        break;
      case 'gxPerk': // a perk taken: a bright run up
        this.seq([72, 76, 79, 84, 88], 0.045, t, { vol: 0.12, wave: 'p25', decayTo: 0.5 });
        this.note(96, t + 0.23, 0.18, { vol: 0.06, wave: 'p12', decayTo: 0.3 });
        break;
      case 'gxSos': // an escape pod's distress call
        this.seq([88, 0, 88, 0, 88, 0, 0, 84, 84, 84], 0.05, t, { vol: 0.06, wave: 'p50', flat: true });
        break;
      case 'gxSosTick': // holding on to a pod
        this.note(76, t, 0.05, { vol: 0.06, wave: 'tri', flat: true });
        break;
      case 'teleport':
        this.seq([72, 79, 84, 91, 96], 0.035, t, { vol: 0.12, decayTo: 0.4, wave: 'p25' });
        break;
      case 'gxTractor': // the captor's tractor beam: a wobbling hum
        this.note(330, t, 0.45, { vol: 0.07, slideTo: 440, wave: 'p25', flat: true });
        this.note(349, t + 0.05, 0.4, { vol: 0.05, slideTo: 262, wave: 'tri', flat: true });
        break;
      case 'gxCaptured': // your ship is taken
        this.seq([76, 72, 69, 64, 60, 57], 0.1, t, { vol: 0.13, wave: 'p25', decayTo: 0.5 });
        break;
      case 'gxRescue': // your ship is free
        this.seq([67, 72, 76, 79, 84], 0.06, t, { vol: 0.13, decayTo: 0.5 });
        break;
      case 'gxChallenge': // the challenge stage's jingle
        this.seq([72, 76, 79, 72, 76, 79, 84, 0, 83, 84], 0.08, t, { vol: 0.12, wave: 'p25', decayTo: 0.45 });
        this.seq([48, 0, 55, 0, 48, 0, 55, 0, 60], 0.08, t, { vol: 0.16, wave: 'tri' });
        break;
      case 'gxPerfect': // 40 out of 40
        this.seq([72, 76, 79, 84, 79, 84, 88, 91, 96], 0.07, t, { vol: 0.14, decayTo: 0.5 });
        this.seq([60, 64, 67, 72, 67, 72, 76, 79, 84], 0.07, t, { vol: 0.08, wave: 'p25', decayTo: 0.5 });
        break;
      case 'gxMedal': // a wave medal
        this.seq([84, 88, 91, 96], 0.05, t, { vol: 0.1, wave: 'p12', decayTo: 0.5 });
        break;
      case 'bossDie':
        this.noise(2000, t, [[0, 0.7], [0.5, 0.6], [1.6, 0]], 120);
        this.seq([72, 67, 64, 60, 55, 48], 0.12, t + 0.2, { vol: 0.15, decayTo: 0.5 });
        break;
      // the terrain types (biomes.js)
      case 'lava': // a tank sinks into lava: a hiss and a low gulp
        this.noise(9000, t, [[0, 0.4], [0.4, 0.25], [0.7, 0]], 3000);
        this.note(45, t, 0.5, { vol: 0.14, slideTo: 40, wave: 'tri' });
        break;
      case 'vent': // a fire vent erupts: a rising roar
        this.noise(700, t, [[0, 0.1], [0.15, 0.45], [0.7, 0]], 1800);
        break;
      case 'rumble': // the volcano spits bombs
        this.noise(300, t, [[0, 0.5], [0.8, 0.4], [1.2, 0]], 150);
        break;
      case 'gas': // swamp gas lit: a hiss
        this.noise(14000, t, [[0, 0.05], [0.25, 0.25], [0.4, 0]], 9000);
        break;
      case 'barrel': // a barrel or a pocket of gas goes up: a deep boom
        this.noise(900, t, [[0, 0.7], [0.3, 0.5], [0.6, 0]], 250);
        this.note(60, t, 0.35, { vol: 0.18, slideTo: 35, wave: 'tri' });
        break;
      case 'crate': // wood splinters
        this.noise(3000, t, [[0, 0.5], [0.03, 0.2], [0.09, 0]]);
        this.noise(1200, t + 0.05, [[0, 0.3], [0.05, 0]]);
        break;
      case 'deflect': // a shell glances off a deflector
        this.note(1800, t, 0.06, { vol: 0.06, slideTo: 2600, wave: 'p12' });
        break;
      case 'sink': // glug
        this.seq([45, 40, 36], 0.07, t, { vol: 0.15, wave: 'tri', decayTo: 0.4 });
        break;
      case 'gator': // jaws open: a rattle
        this.seq([50, 0, 50, 0, 53], 0.04, t, { vol: 0.12, wave: 'p25', flat: true });
        break;
      case 'salvo': // three rockets away
        for (let k = 0; k < 3; k++) this.noise(5000, t + k * 0.09, [[0, 0.3], [0.12, 0]], 1500);
        break;
      case 'manhole': // a manhole cover clanks
        this.note(55, t, 0.05, { vol: 0.12, wave: 'p25', flat: true });
        this.note(50, t + 0.08, 0.12, { vol: 0.1, wave: 'p25', decayTo: 0.3 });
        break;
      case 'blackout': // the power goes: a falling hum
        this.note(220, t, 0.6, { vol: 0.1, slideTo: 55, wave: 'p50' });
        break;
      // the maze's own enemies (mazefoes.js)
      case 'mfStep1': // the minotaur's footfall, far off: a dull thud
        this.note(36, t, 0.12, { vol: 0.07, slideTo: 40, wave: 'tri' });
        break;
      case 'mfStep2': // nearer
        this.note(38, t, 0.14, { vol: 0.13, slideTo: 38, wave: 'tri' });
        this.noise(400, t, [[0, 0.12], [0.08, 0]]);
        break;
      case 'mfStep3': // right there: the ground shakes
        this.note(40, t, 0.18, { vol: 0.2, slideTo: 35, wave: 'tri' });
        this.noise(300, t, [[0, 0.3], [0.14, 0]], 150);
        break;
      case 'mfGrunt': // a snort
        this.noise(1800, t, [[0, 0.05], [0.06, 0.3], [0.22, 0]], 600);
        this.note(45, t, 0.2, { vol: 0.1, slideTo: 80, wave: 'p25' });
        break;
      case 'mfRoar': // a bellow
        this.noise(900, t, [[0, 0.1], [0.15, 0.45], [0.8, 0.3], [1.1, 0]], 300);
        this.note(50, t, 0.9, { vol: 0.12, slideTo: 70, wave: 'p25', decayTo: 0.5 });
        this.note(43, t + 0.05, 0.9, { vol: 0.1, slideTo: 55, wave: 'p50', decayTo: 0.5 });
        break;
      case 'mfCharge': // it charges: hooves drumming
        for (let k = 0; k < 6; k++) this.noise(500, t + k * 0.07, [[0, 0.3], [0.05, 0]], 250);
        this.note(40, t, 0.45, { vol: 0.12, slideTo: 90, wave: 'tri' });
        break;
      case 'mfQuake': // a stomp, or a head against a wall: a deep boom
        this.noise(250, t, [[0, 0.8], [0.5, 0.5], [1, 0]], 80);
        this.note(33, t, 0.6, { vol: 0.25, slideTo: 30, wave: 'tri' });
        break;
      case 'mfTurn': // a sentry swings round: a servo whine
        this.note(600, t, 0.12, { vol: 0.04, slideTo: 900, wave: 'p12' });
        break;
      case 'mfAim': // a sentry takes aim: rising beeps
        this.seq([84, 0, 88, 0, 91], 0.05, t, { vol: 0.06, flat: true, wave: 'p25' });
        break;
      case 'mfTurret': // twin shells away
        this.noise(5000, t, [[0, 0.45], [0.06, 0.3], [0.09, 0]]);
        this.noise(5000, t + 0.04, [[0, 0.35], [0.06, 0.2], [0.09, 0]]);
        break;
      case 'mfCrack': // something stirs in the wall
        this.noise(2500, t, [[0, 0.1], [0.03, 0], [0.08, 0.12], [0.1, 0], [0.16, 0.15], [0.19, 0]]);
        break;
      case 'mfBurst': // out of the wall: bricks fly
        this.noise(1500, t, [[0, 0.6], [0.1, 0.4], [0.2, 0]]);
        this.seq([62, 0, 70], 0.04, t + 0.05, { vol: 0.1, wave: 'p12', decayTo: 0.3 });
        break;
      case 'mfHide': // back into the wall: a scuttle
        this.noise(8000, t, [[0, 0.1], [0.04, 0.02], [0.08, 0.1], [0.12, 0.02], [0.16, 0.08], [0.2, 0]]);
        break;
      case 'mfSteal': // a key gone: a sly little run
        this.seq([76, 79, 83, 88, 0, 72], 0.045, t, { vol: 0.1, wave: 'p12', decayTo: 0.4 });
        break;
      case 'mfMirror': // a mirror wakes: a shimmer
        this.seq([96, 91, 98, 93, 100], 0.035, t, { vol: 0.05, wave: 'p12', flat: true });
        break;
      case 'mfHiss': // a mosslump's fuse: a long rising hiss
        this.noise(15000, t, [[0, 0.02], [0.4, 0.14], [1.4, 0.3], [1.5, 0]], 11000);
        break;
      case 'mfBoom': // and then it goes: a crump of bricks and earth
        this.noise(700, t, [[0, 0.8], [0.25, 0.55], [0.7, 0]], 160);
        this.note(40, t, 0.4, { vol: 0.2, slideTo: 32, wave: 'tri' });
      // the maze's world (maze2.js)
      case 'mzKey': // a key: a bright little run up
        this.seq([76, 79, 83, 88, 91], 0.045, t, { vol: 0.13, wave: 'p25', decayTo: 0.5 });
        break;
      case 'mzGate': // a gate grinds open
        this.noise(1800, t, [[0, 0.25], [0.35, 0.2], [0.45, 0]], 700);
        this.note(45, t, 0.4, { vol: 0.12, slideTo: 140, wave: 'p50' });
        this.note(76, t + 0.4, 0.15, { vol: 0.1, wave: 'p25' });
        break;
      case 'mzLocked': // locked: a dull clunk
        this.note(40, t, 0.12, { vol: 0.25, wave: 'tri', flat: true });
        this.noise(700, t, [[0, 0.3], [0.06, 0]]);
        break;
      case 'mzCell': // a power cell: a hum rising to a ping
        this.note(200, t, 0.25, { vol: 0.1, slideTo: 900, wave: 'p50' });
        this.note(88, t + 0.25, 0.3, { vol: 0.12, wave: 'p12', decayTo: 0.05 });
        break;
      case 'mzSeal': // the exit unseals: a fanfare
        this.seq([67, 71, 74, 79, 0, 83, 86], 0.08, t, { vol: 0.13, wave: 'p25', decayTo: 0.4 });
        break;
      case 'mzPlate': // a pressure plate goes down: click and thunk
        this.noise(9000, t, [[0, 0.3], [0.02, 0]]);
        this.note(48, t + 0.03, 0.1, { vol: 0.2, wave: 'tri' });
        break;
      case 'mzDoor': // a heavy steel door rolls
        this.noise(600, t, [[0, 0.35], [0.25, 0.25], [0.35, 0]], 300);
        this.note(36, t + 0.3, 0.12, { vol: 0.25, wave: 'tri', flat: true });
        break;
      case 'mzTick': // a door's (or the collapse's) clock
        this.noise(12000, t, [[0, 0.25], [0.015, 0]]);
        this.note(96, t, 0.02, { vol: 0.05, wave: 'p12', flat: true });
        break;
      case 'mzRumble': // a wall about to move, the maze shaking
        this.noise(400, t, [[0, 0], [0.1, 0.35], [0.5, 0.3], [0.7, 0]], 200);
        break;
      case 'mzWall': // a wall slides home: grind and slam
        this.noise(1200, t, [[0, 0.3], [0.2, 0.25], [0.25, 0]], 500);
        this.note(33, t + 0.22, 0.15, { vol: 0.3, wave: 'tri', flat: true });
        break;
      case 'mzCrack': // the floor cracks under you
        for (let k = 0; k < 4; k++) this.noise(5000 - k * 800, t + k * 0.05, [[0, 0.25], [0.02, 0]]);
        break;
      case 'mzCollapse': // stone gives way
        this.noise(500, t, [[0, 0.6], [0.4, 0.35], [0.8, 0]], 150);
        this.note(30, t, 0.3, { vol: 0.25, wave: 'tri' });
        break;
      case 'mzCaveIn': // the ceiling comes down
        this.noise(300, t, [[0, 0.8], [0.8, 0.5], [1.4, 0]], 90);
        this.note(40, t, 0.9, { vol: 0.3, slideTo: 25, wave: 'tri' });
        break;
      case 'mzAlarm': // the maze starts to collapse: a two-tone siren, three times
        for (let k = 0; k < 3; k++) { this.note(81, t + k * 0.3, 0.15, { vol: 0.1, wave: 'p25', flat: true }); this.note(76, t + k * 0.3 + 0.15, 0.15, { vol: 0.1, wave: 'p25', flat: true }); }
        break;
      case 'mzFuel': // lamp fuel: a glug and a bright ping
        this.seq([45, 40], 0.06, t, { vol: 0.15, wave: 'tri' });
        this.note(84, t + 0.13, 0.2, { vol: 0.1, wave: 'p12', decayTo: 0.1 });
        break;
      case 'mzScroll': // a map unrolls: a rustle and a chime
        this.noise(15000, t, [[0, 0.15], [0.15, 0.1], [0.2, 0]]);
        this.seq([72, 79, 84], 0.07, t + 0.15, { vol: 0.1, wave: 'p25', decayTo: 0.3 });
        break;
      case 'mzMark': // a marker: chalk on stone
        this.noise(14000, t, [[0, 0.2], [0.06, 0.12], [0.08, 0]]);
        this.note(79, t + 0.08, 0.05, { vol: 0.08, wave: 'p12' });
        break;
      case 'mzTorch': // a torch catches: whoomph
        this.noise(3000, t, [[0, 0], [0.05, 0.3], [0.3, 0]], 8000);
        break;
      case 'mzVault': // the vault: the lock gives, gold inside
        this.seq([60, 0, 60, 0, 64], 0.05, t, { vol: 0.15, wave: 'p50', flat: true });
        this.seq([72, 76, 79, 84, 88, 91], 0.06, t + 0.3, { vol: 0.12, wave: 'p25', decayTo: 0.5 });
        break;
      case 'mzSecret': // the secret exit: a sly little tune
        this.seq([71, 70, 67, 62, 63, 71, 75, 79, 83], 0.07, t, { vol: 0.12, decayTo: 0.5 });
      // sides2.js: ANY SIDE's twists
      case 'sdAlarm': // a new front: a two-tone klaxon, twice
        for (let i = 0; i < 2; i++) {
          this.note(69, t + i * 0.3, 0.15, { vol: 0.13, flat: true, wave: 'p25' });
          this.note(64, t + i * 0.3 + 0.15, 0.15, { vol: 0.13, flat: true, wave: 'p25' });
        }
        break;
      case 'sdTruck': // the truck starts up: a rumbling engine and a horn
        this.noise(700, t, [[0, 0.3], [0.3, 0.25], [0.5, 0]], 1100);
        this.note(57, t + 0.45, 0.14, { vol: 0.12, flat: true, wave: 'p50' });
        this.note(57, t + 0.62, 0.22, { vol: 0.12, decayTo: 0.5, wave: 'p50' });
        break;
      case 'sdHorn': // waiting for a tank to get out of the way
        this.note(55, t, 0.12, { vol: 0.11, flat: true, wave: 'p50' });
        this.note(55, t + 0.16, 0.12, { vol: 0.11, flat: true, wave: 'p50' });
        break;
      case 'sdWind': // a gust: a hiss that swells and falls
        this.noise(9000, t, [[0, 0], [0.25, 0.12], [0.7, 0.05], [0.9, 0]], 4000);
        break;
      case 'sdPlace': // a sandbag or a turret goes down: a thud
        this.noise(1200, t, [[0, 0.45], [0.05, 0.2], [0.09, 0]]);
        this.note(45, t, 0.08, { vol: 0.2, wave: 'tri', slideTo: 60 });
        break;
      case 'sdGo': // placing over: a short bugle
        this.seq([67, 72, 76], 0.06, t, { vol: 0.12, decayTo: 0.5 });
        break;
      case 'sdBuild': // the new fort goes up: bricks and a rising run
        for (let i = 0; i < 4; i++) this.noise(4000, t + i * 0.07, [[0, 0.3], [0.04, 0]]);
        this.seq([60, 64, 67, 72, 76], 0.06, t + 0.1, { vol: 0.12, decayTo: 0.5, wave: 'p25' });
        break;
      case 'sdStreak': // all four sides: a fanfare
        this.seq([72, 0, 72, 76, 79, 0, 84, 84], 0.08, t, { vol: 0.15, decayTo: 0.5 });
        this.seq([60, 0, 60, 64, 67, 0, 72, 72], 0.08, t, { vol: 0.08, decayTo: 0.5, wave: 'p25' });
      // corridor2.js: the climb
      case 'crRise': // the hazard close below: a low rumble
        this.noise(500, t, [[0, 0.3], [0.2, 0.2], [0.45, 0]], 250);
        this.note(38, t, 0.4, { vol: 0.14, wave: 'tri', slideTo: 45 });
        break;
      case 'crDepot': // patched up: two spanner clanks and a bright run up
        this.noise(6000, t, [[0, 0.3], [0.03, 0]]);
        this.noise(6000, t + 0.09, [[0, 0.25], [0.03, 0]]);
        this.seq([67, 71, 74, 79, 83], 0.06, t + 0.18, { vol: 0.12, decayTo: 0.5, wave: 'p25' });
        break;
      case 'crGate': // a heavy gate grinds open
        this.noise(800, t, [[0, 0.45], [0.5, 0.3], [0.8, 0]], 300);
        this.note(43, t, 0.7, { vol: 0.14, wave: 'p25', flat: true });
        this.seq([55, 59, 62, 67], 0.1, t + 0.5, { vol: 0.1, decayTo: 0.4 });
        break;
      case 'crCombo': // the climb combo goes up
        this.seq([76, 83], 0.05, t, { vol: 0.1, wave: 'p25', flat: true });
        break;
      case 'crComboLost': // ... and it's gone
        this.note(76, t, 0.25, { vol: 0.09, slideTo: 220, wave: 'p25' });
        break;
      case 'crMedal': // a medal: a little fanfare
        this.seq([72, 76, 79, 84, 0, 84], 0.09, t, { vol: 0.13, decayTo: 0.5 });
        this.seq([48, 52, 55, 60], 0.135, t, { vol: 0.25, wave: 'tri', flat: true });
        break;
      case 'crFall': // off the edge: a falling whistle
        this.note(1400, t, 0.8, { vol: 0.09, slideTo: 140, wave: 'p12' });
        break;
      case 'crBand': // a new band of the climb: a chime
        this.seq([79, 84, 88], 0.12, t, { vol: 0.1, wave: 'p25', decayTo: 0.3 });
        break;
      case 'crRecord': // past your best
        this.seq([84, 88, 91, 96], 0.06, t, { vol: 0.11, wave: 'p25', decayTo: 0.5 });
      // ENDLESS WORLD (world.js)
      case 'wdAlarm': // a village under attack: its bell rings, high-low
        for (let k = 0; k < 4; k++) {
          this.note(k & 1 ? 81 : 86, t + k * 0.16, 0.15, { vol: 0.11, wave: 'p25', decayTo: 0.2 });
          this.note(k & 1 ? 69 : 74, t + k * 0.16, 0.15, { vol: 0.07, wave: 'tri', decayTo: 0.3 });
        }
        break;
      case 'wdSaved': // a village saved: a little fanfare
        this.seq([67, 72, 76, 0, 72, 76, 79, 0, 84], 0.08, t, { vol: 0.15, decayTo: 0.45 });
        this.seq([55, 0, 60, 0, 64, 0, 67], 0.1, t, { vol: 0.08, wave: 'tri', decayTo: 0.6 });
        break;
      case 'wdLost': // a village burns: falling, then a rumble
        this.seq([76, 72, 69, 64, 60, 57], 0.09, t, { vol: 0.12, wave: 'p25', decayTo: 0.5 });
        this.noise(800, t + 0.3, [[0, 0.4], [0.5, 0.25], [0.8, 0]], 300);
        break;
      case 'wdChest': // a chest opens: coins jingle up
        this.seq([84, 88, 91, 96, 91, 96, 100], 0.04, t, { vol: 0.1, wave: 'p12', decayTo: 0.4 });
        this.noise(14000, t, [[0, 0.12], [0.05, 0], [0.08, 0.1], [0.12, 0]]);
        break;
      case 'wdDawn': // sunrise: a bird's call
        this.note(86, t, 0.08, { vol: 0.06, wave: 'p12', slideTo: 1760 });
        this.note(93, t + 0.1, 0.06, { vol: 0.05, wave: 'p12', slideTo: 1319 });
        this.seq([79, 84, 88], 0.12, t + 0.25, { vol: 0.07, wave: 'tri', decayTo: 0.6 });
        break;
      case 'wdNight': // nightfall: an owl, low and soft
        this.note(64, t, 0.2, { vol: 0.07, wave: 'tri', slideTo: 294, decayTo: 0.4 });
        this.note(64, t + 0.32, 0.35, { vol: 0.07, wave: 'tri', slideTo: 262, decayTo: 0.3 });
        break;
      case 'wdVault': // a vault blown open: a deep boom, then grinding stone
        this.noise(300, t, [[0, 0.8], [0.4, 0.5], [0.9, 0]], 120);
        this.note(36, t, 0.7, { vol: 0.2, wave: 'tri', slideTo: 30 });
        this.noise(2500, t + 0.5, [[0, 0.15], [0.3, 0.1], [0.5, 0]]);
        break;
      // COUNTER-STRIKE (cs.js)
      case 'csBeep': // the bomb's beep: short and high
        this.note(95, t, 0.05, { vol: 0.09, flat: true, wave: 'p25' });
        break;
      case 'csArm': // starting to plant or defuse: a click and a little whir
        this.noise(9000, t, [[0, 0.25], [0.02, 0]]);
        this.note(72, t + 0.03, 0.12, { vol: 0.06, slideTo: 79, wave: 'p12' });
        break;
      case 'csPlanted': // the bomb has been planted: two falling alarm tones
        this.seq([88, 81, 88, 81], 0.14, t, { vol: 0.12, flat: true, wave: 'p25' });
        break;
      case 'csDefuse': // wire cutting, a tick at a time
        this.noise(7000, t, [[0, 0.18], [0.025, 0]]);
        break;
      case 'csDefused': // the bomb's dead: a falling bleep and a sigh of relief
        this.note(91, t, 0.12, { vol: 0.1, flat: true });
        this.note(79, t + 0.12, 0.3, { vol: 0.1, decayTo: 0.1, slideTo: 72 });
        break;
      case 'csBoom': // the bomb goes off: a long, deep blast
        this.noise(600, t, [[0, 0.9], [0.4, 0.75], [1.2, 0.35], [1.6, 0]], 140);
        this.note(36, t, 0.9, { vol: 0.25, slideTo: 24, wave: 'tri' });
        break;
      case 'csWinT': // the terrorists win the round: a rough minor fanfare
        this.seq([62, 65, 69, 74, 0, 72, 74], 0.09, t, { vol: 0.13, decayTo: 0.4, wave: 'p25' });
        this.seq([50, 0, 53, 0, 57], 0.18, t, { vol: 0.25, wave: 'tri', flat: true });
        break;
      case 'csWinCT': // the counter-terrorists win: a bright major one
        this.seq([67, 71, 74, 79, 0, 78, 79], 0.09, t, { vol: 0.13, decayTo: 0.4 });
        this.seq([55, 0, 59, 0, 62], 0.18, t, { vol: 0.25, wave: 'tri', flat: true });
        break;
      case 'csWin': // a match of bots is over
        this.seq([72, 76, 79, 84], 0.1, t, { vol: 0.12, decayTo: 0.4 });
        break;
      case 'csRound': // a new round: the radio crackles
        this.noise(5000, t, [[0, 0.12], [0.08, 0.05], [0.12, 0.14], [0.2, 0]]);
        this.seq([76, 0, 76], 0.06, t + 0.2, { vol: 0.08, flat: true, wave: 'p12' });
        break;
      case 'csGo': // go go go! three rising blips
        this.seq([72, 76, 84], 0.07, t, { vol: 0.13, decayTo: 0.5, wave: 'p25' });
        break;
      case 'csBuy': // the till: a ching
        this.note(96, t, 0.03, { vol: 0.08, flat: true });
        this.note(100, t + 0.03, 0.14, { vol: 0.08, decayTo: 0.1 });
        this.noise(11000, t, [[0, 0.12], [0.03, 0]]);
        break;
      case 'csPick': // the bomb picked up
        this.seq([67, 74], 0.05, t, { vol: 0.12, decayTo: 0.4, wave: 'p25' });
        break;
      case 'csFlash': // a flashbang: a sharp bang, then a high ring in the ears
        this.noise(2600, t, [[0, 0.55], [0.08, 0.1], [0.25, 0]]);
        this.note(3520, t + 0.02, 1.4, { wave: 'p25', vol: 0.05, decayTo: 0.1 });
        break;
      case 'csSmoke': // a smoke grenade pops and hisses
        this.noise(1800, t, [[0, 0.3], [0.04, 0.05]]);
        this.noise(12000, t + 0.04, [[0, 0.12], [0.6, 0.08], [0.9, 0]], 6000);
        break;
      case 'select':
        this.noise(13000, t, [[0, 0.35], [0.03, 0]]);
        break;
      case 'build':
        this.noise(4000, t, [[0, 0.35], [0.04, 0]]);
        break;
      // secrets.js: question blocks and hidden power-ups
      case 'coin': // the classic two-note coin
        this.note(83, t, 0.07, { vol: 0.14, flat: true });
        this.note(88, t + 0.07, 0.4, { vol: 0.14, decayTo: 0.05 });
        break;
      case 'bump': // a shell knocks a block
        this.note(55, t, 0.09, { vol: 0.3, wave: 'tri', slideTo: 70, flat: true });
        this.noise(900, t, [[0, 0.25], [0.05, 0]]);
        break;
      case 'mushroom': // something grows out of the block
        this.seq([60, 64, 67, 72, 64, 67, 72, 76, 67, 72, 76, 79], 0.035, t, { vol: 0.12, decayTo: 0.5, wave: 'p25' });
        break;
      case 'secret': // found it
        this.seq([79, 78, 75, 69, 68, 76, 80, 84], 0.075, t, { vol: 0.12, decayTo: 0.5 });
        break;
      case 'boing': // the mushroom bounces a shell away
        this.note(60, t, 0.16, { vol: 0.15, wave: 'p25', slideTo: 700, flat: true });
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
