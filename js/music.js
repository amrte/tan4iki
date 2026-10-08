'use strict';
// =====================================================================
//  Music: a little NES band (two pulse leads, a triangle bass, noise drums) playing a soundtrack for every game
//  mode, in a version for every skill. The mode gives the tune: its melody, key, rhythm and groove. The skill
//  gives the mood:
//    I'M TOO YOUNG TO DIE  major, unhurried, a soft round lead, light drums
//    HEY, NOT TOO ROUGH    mixolydian, a bit quicker, a harmony line underneath
//    HURT ME PLENTY        dorian, full drums
//    ULTRA-VIOLENCE        harmonic minor, faster, a thin lead over racing arpeggios, busier drums
//    NIGHTMARE!            phrygian dominant, fastest, a shadow voice a tritone below, double kicks and crashes
//  It plays during the stages (after the start jingle) and on the mode's intro screen; pausing pauses it.
//  Settings -> GAME -> MUSIC and MUSIC VOLUME.
// =====================================================================

// melodies: one character per 16th step: 0-9 scale degrees (A, B, C = 10-12; z, y, x = -1, -2, -3), '-' hold, '.' rest
// prog: the chord (scale degree) under each bar; groove: drums and bass; swing: shuffle feel
const SONGS = {
  classic: { name: 'MARCH OF THE EAGLE', root: 60, bpm: 120, groove: 'march', prog: [0, 4, 3, 0],
    mel: '4---4-5-4-2-0---' + '1---1-2-1-z-y---' + '4---4-5-7---5-4-' + '2-4-2-1-0-------' },
  custom: { name: 'BUILDER\'S BOUNCE', root: 67, bpm: 118, groove: 'bouncy', prog: [0, 1, 2, 0],
    mel: '0.4.2.4.0.4.2.4.' + '1.5.3.5.1.5.3.5.' + '2.6.4.6.3.7.5.7.' + '4.3.2.1.0-.-0...' },
  survival: { name: 'THE LAST STAND', root: 62, bpm: 138, groove: 'drive', prog: [0, 0, 5, 4],
    mel: '0.0.2.0.3-2-0...' + '0.0.2.0.4-3-2...' + '5.5.4.5.6-5-4-3-' + '2-3-4-2-0-------' },
  timeattack: { name: 'AGAINST THE CLOCK', root: 64, bpm: 156, groove: 'gallop', prog: [0, 1, 2, 4],
    mel: '024.024.0247-5-4' + '135.135.1357-6-5' + '246.246.2468-7-6' + '7-6-5-4-3-2-1-0-' },
  bigmaps: { name: 'WIDE FRONT', root: 65, bpm: 104, groove: 'epic', prog: [0, 3, 5, 4],
    mel: '0-------4-------' + '3-------2---1---' + '0-------4---5---' + '7-----------6-4-' },
  sides: { name: 'TURNED AROUND', root: 67, bpm: 128, groove: 'odd', prog: [0, 0, 5, 4], steps: 14,
    mel: '0-2-4-0-2-4-5-' + '4-2-0-4-2-0-z-' + '0-2-4-6-5-4-2-' + '1-2-3-1-0-----' },
  corridor: { name: 'THE CLIMB', root: 57, bpm: 132, groove: 'climb', prog: [0, 1, 2, 4],
    mel: '0.2.4.7.2.4.7.9.' + '1.3.5.8.3.5.8.A.' + '2.4.6.9.4.6.9.B.' + '4-3-4-5-7-------' },
  race: { name: 'KILL RACE SHUFFLE', root: 58, bpm: 150, groove: 'shuffle', prog: [0, 0, 3, 4], swing: 0.62,
    mel: '0-2-4-2-5-4-2-0-' + '0-2-4-2-6-5-4-2-' + '3-5-7-5-4-2-0-2-' + '4-4-5-6-7---.---' },
  eagles: { name: 'EAGLE DUEL', root: 62, bpm: 136, groove: 'duel', prog: [0, 0, 5, 4],
    mel: '0--0--4-3--2--1-' + '0--0--4-5--4--2-' + '7--7--5-6--5--4-' + '3-2-1-z-0-------' },
  dm: { name: 'NO MERCY', root: 64, bpm: 152, groove: 'aggro', prog: [0, 0, 5, 4],
    mel: '0.0.0.3.0.0.4.3.' + '0.0.0.3.0.0.5.4.' + '7.7.6.5.4.4.3.2.' + '1.1.2.3.4---z---' },
  ctf: { name: 'BRING IT HOME', root: 60, bpm: 124, groove: 'fanfare', prog: [0, 3, 0, 4],
    mel: '0-4-7---7-9-7---' + '5-4-3-4-5-------' + '4-5-7-4-3-4-2-0-' + '1-2-3-1-4-------' },
  cpu: { name: 'MACHINE WAR', root: 57, bpm: 140, groove: 'robot', prog: [0, 3, 5, 4],
    mel: '0707070704040404' + '3A3A3A3A29292929' + '5C5C5C5C4B4B4B4B' + '0-0-z-z-0-------' },
};

// drums (k kick, s snare, h hat, o open hat) and bass (r root, t third, f fifth, s sixth, o octave, - hold, . rest)
const GROOVES = {
  march: { drums: 'k...h...s...h...', bass: 'r---f---r---f---' },
  bouncy: { drums: 'k.h.s.hk.kh.s.h.', bass: 'r.f.o.f.r.f.o.f.' },
  drive: { drums: 'k.h.s.h.k.hks.h.', bass: 'r.r.r.r.r.r.r.r.' },
  gallop: { drums: 'k.hkk.hks.hkk.hs', bass: 'r.rrr.rrr.rrr.rr' },
  epic: { drums: 'k...h...s...h...', bass: 'r-------f-------' },
  odd: { drums: 'k..h..s..h.s.h', bass: 'r..r..f..r.f..' },
  climb: { drums: 'k.h.k.h.s.h.k.hh', bass: 'r.f.o.f.r.f.o.f.' },
  shuffle: { drums: 'k.h.s.hhk.h.s.hh', bass: 'r-t-f-s-o-s-f-t-' },
  duel: { drums: 'k..k..s.k.k..s..', bass: 'r..r..r.r.f..f..' },
  aggro: { drums: 'k.k.s.k.k.ksk.s.', bass: 'r.r.o.r.r.r.o.r.' },
  fanfare: { drums: 'k...s...k.k.s...', bass: 'r---f---r-f-o---' },
  robot: { drums: 'k.k.s...k.k.s.k.', bass: 'rororororororoor' },
};

// what each skill does to the tune
const MUSIC_SKILLS = [
  { scale: [0, 2, 4, 5, 7, 9, 11], tempo: 0.8, lead: 'p50', drums: 0, second: 'none', bass: 0 },
  { scale: [0, 2, 4, 5, 7, 9, 10], tempo: 0.9, lead: 'p25', drums: 1, second: 'harmony', bass: 0 },
  { scale: [0, 2, 3, 5, 7, 9, 10], tempo: 1, lead: 'p25', drums: 2, second: 'harmony', bass: -12 },
  { scale: [0, 2, 3, 5, 7, 8, 11], tempo: 1.1, lead: 'p12', drums: 3, second: 'arp', bass: -12 },
  { scale: [0, 1, 4, 5, 7, 8, 10], tempo: 1.22, lead: 'p12', drums: 4, second: 'shadow', bass: -12 },
];

const MEL_DEG = c => (c >= '0' && c <= '9' ? +c : { A: 10, B: 11, C: 12, z: -1, y: -2, x: -3 }[c]);

const Music = {
  gain: null, track: null, timer: null, nextT: 0, step: 0, paused: false, key: '',

  // the track for a mode and a skill (0-4)
  build(mode, skill) {
    const song = SONGS[mode] || SONGS.classic, sk = MUSIC_SKILLS[skill] || MUSIC_SKILLS[2], gr = GROOVES[song.groove];
    const steps = song.steps || 16;
    return { song, sk, gr, steps, total: steps * song.prog.length, stepDur: 60 / (song.bpm * sk.tempo) / 4, key: mode + '/' + skill };
  },

  // the skill index the music follows (AUTO: the level it's at)
  skillLevel() {
    const s = Config.get('skill');
    return s === AUTO_SKILL ? Math.max(0, Math.min(4, Math.round(AutoSkill.rating))) : s;
  },

  ready() {
    if (!Sound.ctx) return false;
    if (!this.gain) { this.gain = Sound.ctx.createGain(); this.gain.connect(Sound.master); }
    this.applyVolume();
    return true;
  },

  applyVolume() {
    if (this.gain) this.gain.gain.value = Config.on('music') ? (Config.get('musicVol') / 100) * 0.7 : 0;
  },

  // keep playing what should be playing (called every frame): a mode's track, or nothing
  want(mode, skill, paused) {
    if (!mode || !Config.on('music')) { this.stop(); return; }
    const key = mode + '/' + skill;
    if (key !== this.key) this.start(mode, skill);
    this.paused = !!paused;
  },

  start(mode, skill) {
    // the same tune in another skill's version (AUTO moved, or SKILL changed in the pause menu) carries on from where it was
    const same = this.track && this.track.key.split('/')[0] === mode, step = this.step;
    this.stop();
    if (!this.ready()) return;
    this.track = this.build(mode, skill);
    this.key = this.track.key;
    this.step = same ? step : 0;
    this.nextT = Sound.ctx.currentTime + 0.08;
    this.timer = setInterval(() => this.tick(), 25);
  },

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null; this.track = null; this.key = '';
  },

  tick() {
    const c = Sound.ctx, tr = this.track;
    if (!c || !tr) return;
    if (this.paused || Sound.muted) { this.nextT = c.currentTime + 0.05; return; }
    if (this.nextT < c.currentTime) this.nextT = c.currentTime + 0.02;   // fell behind (tab in the background)
    while (this.nextT < c.currentTime + 0.12) {
      const swing = tr.song.swing && (this.step & 1) ? 2 - 2 * tr.song.swing : tr.song.swing ? 2 * tr.song.swing : 1;
      this.playStep(this.step % tr.total, this.nextT, Math.floor(this.step / tr.total));
      this.nextT += tr.stepDur * swing;
      this.step++;
    }
  },

  // degree -> midi note in the track's key and scale
  pitch(deg, base) {
    const sc = this.track.sk.scale, o = Math.floor(deg / 7), d = ((deg % 7) + 7) % 7;
    return base + sc[d] + 12 * o;
  },

  // pass: how many times round the tune so far. Four passes make a cycle: the tune, the tune again with a fill,
  // an answer (the melody a third higher in the middle bars), and the tune an octave up on a thin lead
  playStep(i, t, pass = 0) {
    const { song, sk, gr, steps, stepDur } = this.track, bar = Math.floor(i / steps), s = i % steps, chord = song.prog[bar];
    const part = pass % 4, last = bar === song.prog.length - 1;
    // lead: the melody (a note lasts while '-' follows it)
    const ch = song.mel[i];
    if (ch !== '.' && ch !== '-') {
      const deg = MEL_DEG(ch) + (part === 2 && (bar === 1 || bar === 2) ? 2 : 0) + (part === 3 ? 7 : 0);
      let len = 1;
      while (song.mel[(i + len) % song.mel.length] === '-' && len < 16) len++;
      const n = this.pitch(deg, song.root), dur = stepDur * len * 0.95;
      this.note(n, t, dur, part === 3 ? 'p12' : sk.lead, part === 3 ? 0.12 : 0.16);
      // the second pulse: a harmony a third below, racing arpeggios, or a tritone shadow
      if (sk.second === 'harmony') this.note(this.pitch(deg - 2, song.root), t, dur, 'p50', 0.06);
      if (sk.second === 'shadow') this.note(n - 6, t, dur, 'p25', 0.05);
    }
    if (sk.second === 'arp' || sk.second === 'shadow') {
      const tones = [0, 2, 4, 7];
      this.note(this.pitch(chord + tones[s % 4], song.root - 12), t, stepDur * 0.8, 'p12', 0.045);
    }
    // bass on the triangle
    const b = gr.bass[s];
    if (b && b !== '.' && b !== '-') {
      let len = 1;
      while (gr.bass[s + len] === '-') len++;
      const off = { r: 0, t: 2, f: 4, s: 5, o: 7 }[b];
      let n = this.pitch(chord + off, song.root - 24 + sk.bass + 12);
      while (n > 55) n -= 12;   // keep the triangle down where a bass belongs
      this.note(n, t, stepDur * len * 0.9, 'tri', 0.22, true);
    }
    // drums, busier on harder skills
    let d = gr.drums[s] || '.';
    if (sk.drums === 0 && d === 's') d = 'h';
    if (sk.drums >= 3 && d === '.' && s % 2 === 1) d = 'h';
    if (sk.drums >= 4 && d === '.' && s % 4 === 2) d = 'k';
    if (sk.drums >= 4 && s === 0 && bar % 2 === 0) this.drum('o', t);
    if (sk.drums === 0 && d === 'h' && s % 4) d = '.';
    // a snare fill into the next pass (on the second and fourth time round; busier on harder skills)
    if (last && (part === 1 || part === 3) && s >= steps - (sk.drums >= 3 ? 8 : 4) && (sk.drums >= 2 || s % 2 === 0)) d = 's';
    if (d !== '.') this.drum(d, t);
  },

  note(midi, t, dur, wave, vol, flat) {
    const c = Sound.ctx, o = c.createOscillator(), g = c.createGain(), end = t + Math.max(0.03, dur);
    if (wave === 'tri') o.type = 'triangle'; else o.setPeriodicWave(Sound.waves[wave]);
    o.frequency.setValueAtTime(Sound.midi(midi), t);
    g.gain.setValueAtTime(vol, t);
    if (flat) g.gain.setValueAtTime(vol, end - 0.01);
    else g.gain.exponentialRampToValueAtTime(vol * 0.35, end - 0.005);
    g.gain.linearRampToValueAtTime(0, end);
    o.connect(g); g.connect(this.gain);
    o.start(t); o.stop(end + 0.01);
  },

  drum(kind, t) {
    const c = Sound.ctx, s = c.createBufferSource(), g = c.createGain();
    const [rate, vol, len] = { k: [900, 0.5, 0.09], s: [5200, 0.32, 0.12], h: [16000, 0.12, 0.03], o: [12000, 0.18, 0.25] }[kind];
    s.buffer = Sound.noiseBuffer(rate);
    s.loop = true;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + len);
    s.connect(g); g.connect(this.gain);
    s.start(t, Math.random() * 0.5); s.stop(t + len + 0.01);
    if (kind === 'k') {   // a kick has a low thump under the noise
      const o = c.createOscillator(), og = c.createGain();
      o.type = 'triangle';
      o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.1);
      og.gain.setValueAtTime(0.5, t); og.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      o.connect(og); og.connect(this.gain);
      o.start(t); o.stop(t + 0.13);
    }
  },
};
