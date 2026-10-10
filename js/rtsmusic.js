'use strict';
// =====================================================================
//  DESERT DOMINION's in-game soundtrack, in all three MUSIC STYLEs (chiptune: SONGS, rock: ROCK_SONGS, synthwave:
//  SYNTH_SONGS). Strategy-game music in the manner of the early-90s AdLib and Sound Blaster cards: desert modes
//  (phrygian dominant, harmonic minor and major, double harmonic, Hungarian minor), pulsing bass ostinatos,
//  hand-drum grooves, brooding drones, heroic or menacing leads. Every melody here is written for this game.
//    rtsPeace1   DUSK OVER KHARRA      D harmonic minor, 76 bpm: building at sundown; lonely, slow, a long arc
//    rtsPeace2   THE GLIMMER FIELDS    E phrygian dominant, 84 bpm: the harvesters' working pulse, a maqsum beat
//    rtsPeace3   CARAVAN OF STARS      B double harmonic, 6/8, 88 bpm: night in the deep desert, a camel's gait
//    rtsBattle1  STEEL ON SAND         A phrygian dominant, 138 bpm: a charge, a b2 ostinato under a war cry
//    rtsBattle2  THE BURNING FRONT     F# harmonic minor, 152 bpm: galloping, syncopated stabs
//    rtsBattle3  SEVEN DUNES           G phrygian, 7/8, 132 bpm: odd-metered dread
//    rtsAquila   BANNERS OF AQUILA     Bb harmonic major, 108 bpm: noble, a march with a horn call
//    rtsDrakon   THE IRON RAM          D phrygian, 96 bpm: brutal, a grinding 16th bass, anvils
//    rtsSerpens  SERPENT'S BARGAIN     A Hungarian minor, swung, 104 bpm: sly, slithering, staccato
//  The peace tunes are long (32-48 bars in chiptune, 2-2.5 minutes in rock and synthwave) so building and
//  harvesting don't wear them out; battle tunes are 16-bar themes in longer rock and synthwave forms.
//  Chiptune extras (song.rtsM, played on top of music.js's band for these songs only): a bass ostinato written in
//  scale steps from the chord (instead of the groove's r/t/f/o; bv its volume), hand drums (D doum, d a soft one,
//  T tek, t a soft one, r a tek roll, M an anvil), and a drone (the chord's root and fifth held, quietly) for the
//  peace tunes.
//  Formats: music.js (chiptune), rock.js and synthwave.js explain theirs. Rock and synthwave borrow the chiptune
//  melodies ('@rtsPeace1') so a tune is the same tune in every style; each adds a section of its own (RTS_M_C).
// =====================================================================

const rtsMBars = (...bars) => bars.join('');

// the desert modes (semitones), for the rock and synthwave scale tables too
const RTS_M_SCALES = {
  rtsMhijaz: [0, 1, 4, 5, 7, 8, 10],    // phrygian dominant
  rtsMdblh: [0, 1, 4, 5, 7, 8, 11],     // double harmonic
  rtsMhung: [0, 2, 3, 6, 7, 8, 11],     // Hungarian minor
  rtsMharmaj: [0, 2, 4, 5, 7, 8, 11],   // harmonic major
};
Object.assign(ROCK_SCALES, RTS_M_SCALES);
Object.assign(SYNTH_SCALES, RTS_M_SCALES);

// the section the rock and synthwave versions add (a chorus, or a bridge on the bells): 8 bars each
const RTS_M_C = {
  rtsPeace1: rtsMBars('9-------7---5---', '6---7---9---A---', '8-------6---4---', '1---2---4---6---',
    '7-------5---3---', '5---6---7---A---', '8---6---5---4---', '6-------........'),
  rtsPeace2: rtsMBars('7---7-8-7---5---', '3---5---7---A---', '8-------7-------', '5---3---1-------',
    '6---8---A---8---', 'B---A---8-------', '7---9---8---7---', '4---1---0-------'),
  rtsPeace3: rtsMBars('8-----9-A---', '9-----8-----', '7---9-B-----', 'A-----9-----',
    'A---9-8-7---', '8-----5-----', '5---4-3-1---', '2-----0-----'),
  rtsBattle1: rtsMBars('A---A-8-7---5---', '8---7---4---2---', '7---7-9-A---8-7-', '9-------7-------',
    '6---8---A---8---', '8---B---C---A---', '9-7-8-5-7-8-9-B-', '7---------------'),
  rtsBattle2: rtsMBars('3---3-4-5---3---', '7---5---4---3---', '5---5-6-7---5---', '9---7---6---5---',
    'A---9---7---5---', '3---5---8---A---', 'B---A---7---6---', '8-------4-------'),
  rtsBattle3: rtsMBars('9---7---9-A-9-', '7-----5-------', '8---A---C-A-8-', '7-----8-------',
    'A---9---7---5-', '7-8-9-A-B-----', 'B---A---9---8-', '7-------------'),
  rtsAquila: rtsMBars('7-------9---B---', 'A-------8---7---', '9---7---4---6---', '8-------6-------',
    '7---9---C---9---', 'A---C---A---8---', '8---B---8---6---', '7---------------'),
  rtsDrakon: rtsMBars('7---7---7-8-7---', '5---4---2-1-0---', '8---8---8-9-8---', '5---3---1-------',
    '9---7---5---7---', '9---A---9---6---', '8---7---6---3---', '1-------0-------'),
  rtsSerpens: rtsMBars('9.7.5...9.7.5...', '4.5.7.8.9---7...', '6.4.2...6.4.2...', '3.4.6.7.9---6...',
    '7.6.7.9.A.8.7.4.', '7---4---3-4-----', '6.7.8.6.4.3.5.6.', '8-------4-------'),
};
// the C sections' chords
const RTS_M_CH = {
  rtsPeace1: [5, 5, 4, 4, 3, 3, 4, 4], rtsPeace2: [3, 3, 1, 1, 6, 6, 0, 0], rtsPeace3: [1, 1, 0, 0, 3, 3, 1, 0],
  rtsBattle1: [3, 1, 0, 0, 6, 1, 0, 0], rtsBattle2: [3, 3, 5, 5, 3, 3, 4, 4], rtsBattle3: [5, 5, 1, 1, 3, 3, 0, 0],
  rtsAquila: [0, 3, 0, 4, 0, 3, 4, 0], rtsDrakon: [0, 0, 1, 1, 5, 5, 6, 1], rtsSerpens: [5, 5, 2, 2, 0, 0, 4, 4],
};

// ------------------------------------------------------------------ chiptune
// the grooves' drums only: these songs' bass is their own ostinato (song.rtsM.bass)
Object.assign(GROOVES, {
  rtsMdusk: { drums: '........h.......', bass: '' },
  rtsMfield: { drums: '......h.....h...', bass: '' },
  rtsMcamel: { drums: '......h.....', bass: '' },            // 6/8
  rtsMcharge: { drums: 'k.hks.hhk.hks.h.', bass: '' },
  rtsMgallop: { drums: 'k.kkh.kks.kkh.kk', bass: '' },
  rtsModd: { drums: 'k.h.s.k.h.s.hh', bass: '' },            // 7/8
  rtsMbanner: { drums: 'k...s..sk.k.s.ss', bass: '' },
  rtsMgrind: { drums: 'k.kks..kk.kks.ko', bass: '' },
  rtsMslink: { drums: '...hs..h..h.s..h', bass: '' },
});

Object.assign(SONGS, {
  // D harmonic minor: a hijaz-like turn (A Bb A G F E) answered by the leading note; a yearning middle, the turn again
  rtsPeace1: { name: 'DUSK OVER KHARRA', root: 62, bpm: 76, groove: 'rtsMdusk', scale: [0, 2, 3, 5, 7, 8, 11],
    prog: [0, 0, 5, 4, 0, 0, 3, 4, 0, 0, 5, 4, 3, 4, 0, 0, 3, 3, 0, 0, 5, 5, 4, 4, 0, 0, 5, 4, 3, 4, 0, 0],
    mel: rtsMBars('4-----5-4-------', '3---2---1---2---', '5-----6-5-------', '4---3---1-------',
      '4-----5-4---7---', '6---5---4-------', '3---5---4---3---', '2---1---z-------',
      '4-----5-4-------', '3---2---1---2---', '5---6---7---9---', '8-------6-------',
      '7---5---3---5---', '4---3---1---6---', '4---2---1---z---', '0---------------',
      '7-------8---7---', '5-------3-------', '4---5---7---9---', '8-------7-------',
      '9-------A---9---', '7---6---5-------', '6---7---6---4---', '1-------........',
      '4-----5-4-------', '3---2---1---2---', '5-----6-5-------', '4---3---1-------',
      '3---2---3---5---', '4-------6-------', '4---2---1---z---', '0---------------'),
    rtsM: { bass: '0--0--7-0--0--4-', perc: 'D.....t.d..t..t.', drone: 1 } },
  // E phrygian dominant over the harvesters' pulse (E E E E F E D E) and a maqsum on the hand drums
  rtsPeace2: { name: 'THE GLIMMER FIELDS', root: 64, bpm: 84, groove: 'rtsMfield', scale: [0, 1, 4, 5, 7, 8, 10],
    prog: [0, 0, 1, 0, 3, 3, 1, 0, 0, 0, 1, 0, 6, 6, 1, 0, 3, 3, 0, 0, 6, 6, 4, 4, 1, 1, 0, 0, 0, 0, 1, 0, 3, 6, 1, 0],
    mel: rtsMBars('0---2---3---4---', '5---4-----3-2---', '1-------3---1---', '2---1---0-------',
      '3---5---8---7---', '6---4---3---5---', '1---3---2---1---', '0-------........',
      '7---6---5---4---', '5---4---2---4---', '3-----1-3---5---', '4-------2-------',
      '6---8---6---5---', '3-------1-------', '1---2---1---z---', '0---------------',
      '7-----8-7-------', 'A---9---8---7---', '9-------7-------', '4---5---7---9---',
      '8-------A---8---', '6---5---6---9---', '7---6---4---6---', '4-------1-------',
      '3...3.1.3...5...', '4...3...1-------', '2...2.0.2...4...', '3...2...0-------',
      '0---2---3---4---', '5---4-----3-2---', '1-------3---1---', '2---1---0-------',
      '3---5---7---8---', 'A---8---6---5---', '3---2---1---z---', '0---------------'),
    rtsM: { bass: '0.0.7.0.1.0.z.0.', perc: 'D.T.t.T.D.t.T.t.' } },
  // B double harmonic in 6/8: a slow caravan under the stars, the drone and the doum keeping the gait
  rtsPeace3: { name: 'CARAVAN OF STARS', root: 59, bpm: 88, groove: 'rtsMcamel', steps: 12, scale: [0, 1, 4, 5, 7, 8, 11],
    prog: [0, 0, 1, 0, 3, 3, 1, 0, 0, 0, 1, 0, 5, 3, 1, 0, 3, 3, 0, 0, 1, 1, 0, 0, 3, 3, 0, 0, 1, 1, 0, 0,
      5, 5, 3, 3, 1, 1, 0, 0, 0, 0, 1, 0, 3, 3, 1, 0],
    mel: rtsMBars('4-----5-4---', '2-----1-----', '1---2-3-----', '2-----0-----',
      '3-----5-4-3-', '2---3-4-----', '1-----3-1---', '0-----------',
      '4-----5-4---', '7-----6-----', '5---4-3-----', '4-----2-----',
      '5-----7-9---', '7---5-3-----', '1---2-1-z---', '0-----------',
      '7-----8-7---', '5-----3-----', '6-----7-----', '9-----7-----',
      '8---9-A-----', '9-----8-----', '7---6-5-4---', '2-----------',
      '7-----8-7---', 'A-----8-----', '9---7-6-----', '7-----4-----',
      '8-----A-8---', '7---6-5-----', '4---5-4-2---', '0-----------',
      '5.....7.....', '9-----------', '8.....7.....', '5-----3-----',
      '1.....3.....', '5---4-3-----', '2-----1-----', '0-----------',
      '4-----5-4---', '2-----1-----', '1---2-3-----', '4-----5-----',
      '7-----5-4-3-', '2---3-4-----', '1-----2-1---', '0-----------'),
    rtsM: { bass: '0-----4--7--', perc: 'D...t.d.T...', drone: 1 } },
  // A phrygian dominant: a war cry on the high A, over a b2 ostinato
  rtsBattle1: { name: 'STEEL ON SAND', root: 57, bpm: 138, groove: 'rtsMcharge', scale: [0, 1, 4, 5, 7, 8, 10],
    prog: [0, 0, 1, 0, 3, 3, 1, 0, 3, 3, 0, 0, 6, 6, 1, 0],
    mel: rtsMBars('7-7-7-5-7-8-7---', '5-4-2-1-2-------', '8-8-8-6-8-A-8---', '7-6-5-4-7-------',
      '3---5---8---A---', '8---7---5---3---', '1-2-3-5-4-5-2-1-', '2-------0-------',
      '7---8---A---8---', '7-5-3-5-7-------', '9---8---7---6---', '7-----------....',
      '6---6-7-8---5---', 'A---8---6---5---', '4-5-3-2-1-2-1-z-', '0-------....7-8-'),
    rtsM: { bass: '0.0.7.0.1.0.7.z.', perc: '..t...T...t.T.t.' } },
  // F# harmonic minor: a gallop, repeated-note stabs climbing to the leading note
  rtsBattle2: { name: 'THE BURNING FRONT', root: 54, bpm: 152, groove: 'rtsMgallop', scale: [0, 2, 3, 5, 7, 8, 11],
    prog: [0, 0, 5, 4, 0, 0, 5, 4, 3, 3, 0, 0, 5, 5, 4, 4],
    mel: rtsMBars('4..4..3.4-6-7---', '7..7..6.4-------', '5..5..4.5-7-9---', '8-------6-------',
      '4..4..3.4-6-7---', '9..9..8.7-------', 'A-9-7-5-7-A-8-7-', '6-------4-------',
      '3-5-7-5-4-5-7-A-', '9-------7-------', '2-4-7-4-3-4-7-9-', '8-------7-------',
      '5-7-9-7-6-9-8-B-', 'A-------9-------', '8-9-8-6-3-5-8-6-', '4-------....6---'),
    rtsM: { bass: '0.000.000.000.z.', bv: 0.16 } },
  // G phrygian in 7/8 (2+2+3): restless, the b2 always pulling down
  rtsBattle3: { name: 'SEVEN DUNES', root: 55, bpm: 132, groove: 'rtsModd', steps: 14, scale: [0, 1, 3, 5, 7, 8, 10],
    prog: [0, 0, 1, 0, 6, 6, 1, 0, 3, 3, 5, 5, 1, 1, 0, 0],
    mel: rtsMBars('7---8-7-5---4-', '3-4-5---4-----', '1---3-5-8---7-', '7-------------',
      '6---8-6-5---3-', '2-3-4---6-----', '5-4-3-1-3-2-5-', '4---------0---',
      'A---9-8-7---5-', '7---8-9-A-----', 'C---A-9-7-----', '9---8-7-5-----',
      '8-8-8-6-8---A-', '9-8-7-5-8-----', '7-5-4-3-1-0-z-', '0-----------..'),
    rtsM: { bass: '0.0.0.1.0.0.z.', perc: '..t...t...t.t.' } },
  // Bb harmonic major: a horn call (fourth, fifth, octave), the noble minor iv, a march
  rtsAquila: { name: 'BANNERS OF AQUILA', root: 58, bpm: 108, groove: 'rtsMbanner', scale: [0, 2, 4, 5, 7, 8, 11],
    prog: [0, 0, 3, 0, 0, 5, 4, 4, 0, 0, 3, 0, 5, 3, 4, 0, 3, 3, 0, 0, 5, 5, 4, 4],
    mel: rtsMBars('0---0-4-7-------', '7---6-7-9---7---', '3-----5-7---5---', '4-------2-------',
      '0---0-4-7-------', '9---8-9-A---9---', '8---6---4---6---', '8-------........',
      '0---0-4-7-------', '7---6-7-9---B---', 'A---C---A---7---', '9-------7-------',
      '4---7---A---9---', '8---7---5---3---', '4---6---9---6---', '7---------------',
      '3-3-3-5-7---5---', '3-------A-------', '9-9-9-7-4---8---', '9-------B-------',
      'C---B---A---9---', 'A---8---7---5---', '6---9---B---8---', '6-------4-------'),
    rtsM: { bass: '0...4...0.0.4...', perc: '....r.......r...' } },
  // D phrygian, low and heavy: few notes, hammered; a grinding 16th bass and anvils
  rtsDrakon: { name: 'THE IRON RAM', root: 50, bpm: 96, groove: 'rtsMgrind', scale: [0, 1, 3, 5, 7, 8, 10],
    prog: [0, 0, 1, 0, 0, 0, 5, 1, 3, 3, 1, 1, 0, 0, 6, 1],
    mel: rtsMBars('0---0---1-0-----', '0---0---z-0-----', '1---1---3-1-----', '0-----1-2---1---',
      '7---7---8-7-----', '7---7---6-5-4---', '5---4---5---7---', '8-------7-------',
      '3.3.3.3.5---3---', '7---5---3---1---', '1.1.1.1.3---5---', '8---7---5---3---',
      '7.7.7.7.8---7---', 'A---8---7---3---', '6---8---A---8---', '8---7---1---0---'),
    rtsM: { bass: '0001000z00010070', perc: '....M.......M..M' } },
  // A Hungarian minor, swung: staccato, the raised fourth and seventh slithering round the fifth and the root
  rtsSerpens: { name: 'SERPENT\'S BARGAIN', root: 57, bpm: 104, groove: 'rtsMslink', swing: 0.6, scale: [0, 2, 3, 6, 7, 8, 11],
    prog: [0, 0, 5, 4, 0, 0, 2, 4, 5, 5, 0, 0, 5, 5, 4, 4],
    mel: rtsMBars('4.3.4...7.6.7...', '5.4.3.4.2---0...', '5.5.7.5.A---7...', '6.5.4.3.4-------',
      '4.3.4...7.6.7...', 'A.9.7.6.7---4...', '2.4.6.9.B---9...', 'A.9.8.6.4-------',
      '5---7.8.9---8.7.', '5-----3.4-------', '7.....6.7.9.A.B.', 'A-9-6-----......',
      '9.8.7.5.7.8.9.C.', 'B---A-9-8---7...', '6.7.6.4.3.4.6.4.', '4---3-4-6-------'),
    rtsM: { bass: '0..0..4.3.4.6.4.', perc: 'D.D...T.D...T.t.' } },
});

// hand drums and the anvil, on the chiptune band's output
function rtsMHit(kind, t, sd) {
  const c = Sound.ctx, out = Music.gain;
  const thump = (f0, f1, len, vol) => {
    const o = c.createOscillator(), g = c.createGain();
    g.gain.value = 0;   // silent until it starts (a gain node is 1 until its first event: a click on the sample before)
    o.type = 'triangle';
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + len);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + len);
    o.connect(g); g.connect(out); o.start(t); o.stop(t + len + 0.01);
  };
  const tick = (rate, len, vol, at) => {
    const s = c.createBufferSource(), g = c.createGain();
    g.gain.value = 0;
    s.buffer = Sound.noiseBuffer(rate); s.loop = true;
    g.gain.setValueAtTime(vol, at); g.gain.exponentialRampToValueAtTime(0.001, at + len);
    s.connect(g); g.connect(out); s.start(at, Math.random() * 0.5); s.stop(at + len + 0.01);
  };
  const ping = (hz, len, vol) => {
    const o = c.createOscillator(), g = c.createGain();
    g.gain.value = 0;
    o.setPeriodicWave(Sound.waves.p12); o.frequency.setValueAtTime(hz, t);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + len);
    o.connect(g); g.connect(out); o.start(t); o.stop(t + len + 0.01);
  };
  if (kind === 'D') { thump(200, 70, 0.24, 0.34); tick(2400, 0.02, 0.1, t); }
  else if (kind === 'd') thump(170, 75, 0.16, 0.26);
  else if (kind === 'T') tick(10000, 0.05, 0.17, t);
  else if (kind === 't') tick(14000, 0.03, 0.09, t);
  else if (kind === 'r') { tick(11000, 0.03, 0.12, t); tick(11000, 0.03, 0.09, t + sd * 0.5); }
  else if (kind === 'M') { ping(1180, 0.16, 0.05); ping(1735, 0.11, 0.035); tick(5000, 0.05, 0.13, t); }
}

// one 16th of a DESERT DOMINION chiptune song's extras: the bass ostinato, hand drums, the drone
function rtsMChipStep(tr, i, t) {
  const X = tr.song.rtsM, n = tr.steps, bar = Math.floor(i / n), s = i % n, chord = tr.song.prog[bar], sd = tr.stepDur;
  const root = tr.song.root;
  if (X.bass) {
    const b = X.bass[s % X.bass.length], deg = MEL_DEG(b);
    if (deg !== undefined) {
      let len = 1;
      while (s + len < n && X.bass[(s + len) % X.bass.length] === '-') len++;
      // the chord's root in the bass's octave (E1..Eb2 an octave up: 40..51); the ostinato keeps its shape around it
      const r = Music.pitch(chord, root - 24);
      let sh = 0;
      while (r + sh > 51) sh -= 12;
      while (r + sh < 40) sh += 12;
      Music.note(Music.pitch(chord + deg, root - 24) + sh, t, sd * len * 0.9, 'tri', X.bv || 0.22, true);
    }
  }
  if (X.perc) {
    const p = X.perc[s % X.perc.length];
    if (p && p !== '.') rtsMHit(p, t, sd);
  }
  // the drone: the chord's root and fifth, under the lead, held through the bar
  if (X.drone && s === 0) {
    const r = Music.pitch(chord, root - 12);
    const sh = r >= 57 ? -12 : r < 45 ? 12 : 0;
    Music.note(r + sh, t, sd * n, 'p50', 0.035);
    Music.note(Music.pitch(chord + 4, root - 12) + sh, t, sd * n, 'p50', 0.025);
  }
}
{
  const _play = Music.playStep;
  Music.playStep = function (i, t, pass = 0) {
    _play.call(this, i, t, pass);
    const tr = this.track;
    if (tr && !tr.rock && !tr.synth && tr.song && tr.song.rtsM) rtsMChipStep(tr, i, t);
  };
}

// ------------------------------------------------------------------ rock
Object.assign(ROCK_DRUMS, {
  rtsMdirge: 'K.h.h.T.S.h.h.t.',     // half time, the toms for hand drums
  rtsMmaqsum: 'K.T...T.K...S.t.',
  rtsMcaravan: 'K...T.K.S.t.',       // 6/8
  rtsMsiege: 'K.hKS.hTK.hKS.TT',
  rtsModd: 'K.h.S.K.h.S.hK',         // 7/8
  rtsMmarch: 'K..sS.s.K.KsS.ss',
  rtsMgrind: 'K.KSK.K.K.KSK.SS',
  rtsMslink: 'K..hS.hTK.h.S.th',
});
Object.assign(ROCK_SONGS, {
  // doom-slow: ringing chords and single notes, the tune on a lead guitar, a twin-guitar bridge
  rtsPeace1: { name: 'DESERT DIRGE', root: 38, bpm: 76, scale: 'harm', form: 'IVCI', parts: {
    I: { ch: [0, 0, 5, 4], riff: '0---4---7---4---', dr: 'half' },
    V: { lead: '@rtsPeace1', riff: 'X-----------x.x.', dr: 'rtsMdirge' },
    C: { ch: RTS_M_CH.rtsPeace1, riff: 'p.p.p.p.X-------', dr: 'rtsMdirge', harm: 2, lead: RTS_M_C.rtsPeace1 } } },
  // the harvesters' pulse as a single-note riff, a maqsum on the toms
  rtsPeace2: { name: 'HARVEST OF FIRE', root: 40, bpm: 84, scale: 'rtsMhijaz', form: 'IVCI', parts: {
    I: { ch: [0, 0, 1, 0], riff: '0.0.0.0.1.0.z.0.', dr: 'rtsMmaqsum' },
    V: { lead: '@rtsPeace2', riff: 'X-----x.0.0.1.0.', dr: 'rtsMmaqsum' },
    C: { ch: RTS_M_CH.rtsPeace2, riff: 'X-------X---x.x.', dr: 'half', harm: 2, lead: RTS_M_C.rtsPeace2 } } },
  // 6/8, the caravan in F# (a fourth under the chiptune's B)
  rtsPeace3: { name: 'NIGHT CARAVAN', root: 42, bpm: 88, steps: 12, scale: 'rtsMdblh', form: 'IVCI', parts: {
    I: { ch: [0, 0, 1, 0], riff: '0-----4---7-', dr: 'rtsMcaravan' },
    V: { lead: '@rtsPeace3', riff: 'X-----x.x.x.', dr: 'rtsMcaravan' },
    C: { ch: RTS_M_CH.rtsPeace3, riff: 'X-----X-----', dr: 'rtsMcaravan', harm: 2, lead: RTS_M_C.rtsPeace3 } } },
  rtsBattle1: { name: 'SAND AND STEEL', root: 40, bpm: 138, scale: 'rtsMhijaz', form: 'IVCVCSC', parts: {
    I: { ch: [0, 0, 1, 0], riff: 'p.p.1.p.p.p.z.p.', dr: 'rtsMsiege' },
    V: { lead: '@rtsBattle1', riff: 'p.ppp.1.p.ppX-x.', dr: 'rtsMsiege' },
    C: { ch: RTS_M_CH.rtsBattle1, riff: 'X---X---X-x.X---', dr: 'double', harm: 2, lead: RTS_M_C.rtsBattle1 },
    S: { ch: [0, 1, 6, 0], riff: 'p.p.1.p.p.p.z.p.', dr: 'double', solo: true } } },
  rtsBattle2: { name: 'BURNING FRONT', root: 42, bpm: 152, scale: 'harm', form: 'IVCVCSC', parts: {
    I: { ch: [0, 0, 5, 4], riff: 'P.pp1.ppP.pp6.4.', dr: 'gallop' },
    V: { lead: '@rtsBattle2', riff: 'p.ppp.ppX-x.p.pp', dr: 'gallop' },
    C: { ch: RTS_M_CH.rtsBattle2, riff: 'X-------X---X-x-', dr: 'double', harm: 2, lead: RTS_M_C.rtsBattle2 },
    S: { ch: [0, 5, 3, 4], riff: 'pppppppppppppppp', dr: 'double', solo: true } } },
  rtsBattle3: { name: 'SEVEN DUNES OF WAR', root: 38, bpm: 132, steps: 14, scale: 'phryg', form: 'IVCVCSC', parts: {
    I: { ch: [0, 0, 1, 0], riff: 'p.p.1.p.p.z.p.', dr: 'rtsModd' },
    V: { lead: '@rtsBattle3', riff: 'X---p.p.X-p.1.', dr: 'rtsModd' },
    C: { ch: RTS_M_CH.rtsBattle3, riff: 'X-----X-----x.', dr: 'rtsModd', harm: 2, lead: RTS_M_C.rtsBattle3 },
    S: { ch: [0, 1, 5, 0], riff: 'p.pp.pp.pp.pp.', dr: 'rtsModd', solo: true } } },
  // in F (a fourth under the chiptune's Bb): the horn call on twin guitars, a snare-roll march
  rtsAquila: { name: 'WINGS OF AQUILA', root: 41, bpm: 112, scale: 'rtsMharmaj', form: 'IVCVC', parts: {
    I: { ch: [0, 3, 0, 4], riff: 'X-.xX-.xX-x.X---', dr: 'rtsMmarch', harm: 2,
      lead: rtsMBars('0---0-4-7-------', 'A-------8---7---', '9---7---4---6---', '8-------6-------') },
    V: { lead: '@rtsAquila', riff: 'X---x.x.X---x.x.', dr: 'rtsMmarch' },
    C: { ch: RTS_M_CH.rtsAquila, riff: 'X-------X---X-x-', dr: 'rock', harm: 2, lead: RTS_M_C.rtsAquila } } },
  rtsDrakon: { name: 'RAM SKULL GRINDER', root: 38, bpm: 96, scale: 'phryg', form: 'IVCBVC', parts: {
    I: { ch: [0, 0, 1, 0], riff: 'Pp.pPp.1Pp.pP.1.', dr: 'rtsMgrind' },
    V: { lead: '@rtsDrakon', riff: 'Pp.pPp.1Pp.pP.1.', dr: 'rtsMgrind' },
    C: { ch: RTS_M_CH.rtsDrakon, riff: 'X-------X---X---', dr: 'half', harm: 2, lead: RTS_M_C.rtsDrakon },
    B: { ch: [0, 0, 1, 0], riff: 'P..PP..P1-0-X---', dr: 'half' } } },
  // in E (a fourth under the chiptune's A): the slithering bass line doubled on a guitar, swung
  rtsSerpens: { name: 'VENOM AND GOLD', root: 40, bpm: 104, swing: 0.6, scale: 'rtsMhung', form: 'IVCVCS', parts: {
    I: { ch: [0, 0, 4, 0], riff: 'X--0..4.3.4.6.4.', dr: 'rtsMslink' },
    V: { lead: '@rtsSerpens', riff: 'X--0..4.3.4.6.4.', dr: 'rtsMslink' },
    C: { ch: RTS_M_CH.rtsSerpens, riff: 'X--x..x.X--x..x.', dr: 'rtsMslink', harm: 2, lead: RTS_M_C.rtsSerpens },
    S: { ch: [0, 5, 2, 4], riff: 'x.x..x.xx.x..x.x', dr: 'rtsMslink', solo: true } } },
});

// ------------------------------------------------------------------ synthwave
Object.assign(SYNTH_DRUMS, {
  rtsMsoft: 'K.....h.K..t..h.',
  rtsMmaqsum: 'K.t...t.K...C.h.',
  rtsMcaravan: 'K...h.K.C.h.',       // 6/8
  rtsMsiege: 'K.hKX.hKK.hTX.hT',
  rtsMmarch: 'K..hX.hhK.KhX.hX',
  rtsMslink: 'K..hX.hoK.h.X..h',
});
Object.assign(SYNTH_SONGS, {
  // a desert sunset: slow pads, a tresillo bass, the bridge on the FM bell
  rtsPeace1: { name: 'AMBER HORIZON', root: 38, bpm: 76, scale: 'harm', att: 0.8, form: 'IVBI', parts: {
    I: { ch: [0, 0, 5, 4], arp: '0.2.1.3.', bs: 'r-------r-------', dr: 'hats', f: [400, 1400], rise: 1 },
    V: { lead: '@rtsPeace1', bs: 'r..r..o.r..r..f.', arp: '0..1..2.', dr: 'rtsMsoft', f: 1600 },
    B: { ch: RTS_M_CH.rtsPeace1, bell: RTS_M_C.rtsPeace1, bs: 'r---------------', f: 1100, rise: 1 } } },
  rtsPeace2: { name: 'GLIMMER GRID', root: 40, bpm: 84, scale: 'rtsMhijaz', pump: 0.3, form: 'IVBI', parts: {
    I: { ch: [0, 0, 1, 0], bs: 'r.r.r.r.r.r.o.r.', arp: '0.1.2.1.', dr: 'kicks', f: [500, 1600], rise: 1 },
    V: { lead: '@rtsPeace2', bs: 'r.r.o.r.', arp: '0.2.1.2.', dr: 'rtsMmaqsum', f: 1800 },
    B: { ch: RTS_M_CH.rtsPeace2, bell: RTS_M_C.rtsPeace2, bs: 'r.......r.......', arp: '0...2...', dr: 'hats', f: 1200 } } },
  rtsPeace3: { name: 'STARLIT DUNES', root: 47, lo: -12, bpm: 88, steps: 12, scale: 'rtsMdblh', att: 0.7, form: 'IVBI', parts: {
    I: { ch: [0, 0, 1, 0], arp: '0.1.2.3.2.1.', bs: 'r-----------', dr: 'hats', f: [400, 1300] },
    V: { lead: '@rtsPeace3', arp: '0.2.1.3.2.1.', bs: 'r-----o-----', dr: 'rtsMcaravan', f: 1500 },
    B: { ch: RTS_M_CH.rtsPeace3, bell: RTS_M_C.rtsPeace3, bs: 'r-----------', f: 1000, rise: 1 } } },
  rtsBattle1: { name: 'NEON SANDSTORM', root: 45, lo: -12, bpm: 132, scale: 'rtsMhijaz', dirt: 1, pump: 0.3, form: 'IVCVCLC', parts: {
    I: { ch: [0, 0, 1, 0], bs: 'rrorrror', dr: 'kicks', f: [500, 1800], rise: 1 },
    V: { lead: '@rtsBattle1', bs: 'rrorrror', arp: '0102', dr: 'rtsMsiege', f: 2000 },
    C: { ch: RTS_M_CH.rtsBattle1, bs: 'ro', arp: '0123', dr: 'four', f: 2600, harm: 2, lead: RTS_M_C.rtsBattle1 },
    L: { ch: [0, 1, 6, 0], bs: 'ro', arp: '0123', dr: 'four', solo: 1 } } },
  rtsBattle2: { name: 'HEAT MIRAGE', root: 42, lo: -12, bpm: 140, scale: 'harm', dirt: 1, pump: 0.3, form: 'IVCVCLC', parts: {
    I: { ch: [0, 0, 5, 4], bs: 'r.rrr.rrr.rrr.rr', dr: 'kicks', f: [500, 2000], rise: 1 },
    V: { lead: '@rtsBattle2', bs: 'r.rrr.rrr.rro.oo', arp: '0.1.2.1.', dr: 'drive', f: 2200 },
    C: { ch: RTS_M_CH.rtsBattle2, bs: 'ro', arp: '0123', dr: 'four', f: 2800, harm: 2, lead: RTS_M_C.rtsBattle2 },
    L: { ch: [0, 5, 3, 4], bs: 'ro', arp: '0123', dr: 'four', solo: 1 } } },
  rtsBattle3: { name: 'SEVENFOLD STORM', root: 43, lo: -12, bpm: 126, steps: 14, scale: 'phryg', dirt: 1, pump: 0.3, form: 'IVCVCLC', parts: {
    I: { ch: [0, 0, 1, 0], bs: 'r.r.r.r.r.r.o.', dr: 'kicks', f: [500, 1800], rise: 1 },
    V: { lead: '@rtsBattle3', bs: 'r.r.r.r.r.r.o.', arp: '01230123012301', dr: 'odd14', f: 2000 },
    C: { ch: RTS_M_CH.rtsBattle3, bs: 'ro', arp: '0123', dr: 'odd14', f: 2600, harm: 2, lead: RTS_M_C.rtsBattle3 },
    L: { ch: [0, 1, 5, 0], bs: 'ro', arp: '0123', dr: 'odd14', solo: 1 } } },
  // brass stabs for the horn call
  rtsAquila: { name: 'AZURE TALONS', root: 46, lo: -12, bpm: 108, scale: 'rtsMharmaj', form: 'IVCVC', parts: {
    I: { ch: [0, 3, 0, 4], pad: 'S...S..SS...S...', bs: 'r.o.', dr: 'rtsMmarch', f: [800, 2200], rise: 1 },
    V: { lead: '@rtsAquila', bs: 'r.o.', arp: '0123', dr: 'rtsMmarch', f: 2200 },
    C: { ch: RTS_M_CH.rtsAquila, pad: 'S..S..S.S..S..S.', bs: 'ro', dr: 'four', f: 2800, harm: 2, lead: RTS_M_C.rtsAquila } } },
  // darksynth: a driven bass, half-time slams
  rtsDrakon: { name: 'FURNACE OF DRAKON', root: 38, bpm: 92, scale: 'phryg', dirt: 1, pump: 0.35, f: 1200, form: 'IVCBVC', parts: {
    I: { ch: [0, 0, 1, 0], pad: 'S..S..S.S.......', bs: 'R..R..R.R...R.R.', dr: 'halfd', f: 900, rise: 1 },
    V: { lead: '@rtsDrakon', bs: 'rrrorrrrrrrorrrr', dr: 'push', f: 1400 },
    C: { ch: RTS_M_CH.rtsDrakon, bs: 'rrorrror', arp: '0102', dr: 'push', f: 2000, harm: 2, lead: RTS_M_C.rtsDrakon },
    B: { ch: [0, 0, 1, 0], pad: 'S.S...S.S.S...S.', bs: 'R.R...R.R---R-R-', dr: 'halfd', f: 800,
      bell: rtsMBars('7---8---7-------', '5---4---1-------') } } },
  // a square lead, swung
  rtsSerpens: { name: 'EMERALD COIL', root: 45, lo: -12, bpm: 100, swing: 0.6, scale: 'rtsMhung', sq: 1, pump: 0.3, form: 'IVCVCL', parts: {
    I: { ch: [0, 0, 4, 0], bs: 'r..r..f.o..f..r.', arp: '0.1.2.1.', dr: 'hats', f: [600, 1600], rise: 1 },
    V: { lead: '@rtsSerpens', bs: 'r..r..f.o..f..r.', arp: '0.2.1.3.', dr: 'rtsMslink', f: 1800 },
    C: { ch: RTS_M_CH.rtsSerpens, bs: 'r.o.', arp: '0123', dr: 'beat', f: 2400, harm: 2, lead: RTS_M_C.rtsSerpens },
    L: { ch: [0, 5, 2, 4], bs: 'r.o.', arp: '0123', dr: 'rtsMslink', solo: 1 } } },
});
