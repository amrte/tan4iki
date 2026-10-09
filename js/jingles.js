'use strict';
// =====================================================================
//  The stage-start fanfare (the tune before every round: triplet runs climbing through C minor, E flat, F, A flat -
//  B flat, ending on C major) in the MUSIC STYLE chosen: ROCK (twin lead guitars, chugging power chords, bass, drums
//  with a fill) or SYNTHWAVE (a saw lead, pads, a pumping octave bass, gated drums, a bell on the last hits);
//  CHIPTUNE plays the original (audio.js). Same notes, same 4.2 seconds, so it lines up with the round as before.
//  Each style has an instrument rack of its own for this, wired to the sound effects (so the music's are untouched).
// =====================================================================

// the fanfare as audio.js plays it: 8 groups of 3 (0.4 s a group), then the C major hits
const JG = {
  G: 0.4,
  lead: [[72, 74, 75], [72, 74, 75], [75, 77, 79], [75, 77, 79], [77, 79, 81], [77, 79, 81], [80, 82, 84], [80, 82, 84]],
  root: [48, 48, 51, 51, 53, 53, 56, 58],
  full: [false, true, false, true, false, true, true, true],
  // the chords under it (the synth pads): C minor, E flat, F, A flat, B flat
  triad: { 48: [60, 63, 67], 51: [63, 67, 70], 53: [65, 69, 72], 56: [68, 72, 75], 58: [70, 74, 77] },
  hits: [0, 0.4, 0.54, 0.67, 0.8],
};

const JingleRock = Object.assign(Object.create(Rock), { ctx: null, out: null });
const JingleSynth = Object.assign(Object.create(Synth), { ctx: null, out: null, trim: null });

function jingleRock(t0) {
  const R = JingleRock, G = JG.G, S = G / 3;
  R.setup(Sound.master);
  R.hit('c', t0);
  for (let g = 0; g < 8; g++) {
    const root = JG.root[g];
    for (let k = 0; k < 3; k++) {
      const t = t0 + g * G + k * S, m = JG.lead[g][k];
      // twin leads, an octave apart; chugs on the root under them, a ringing chord where the original harmonises
      R.leadNote(m, t, S * 0.95, 0, 0.9);
      R.leadNote(m - 12, t, S * 0.95, 1, 0.55);
      if (k === 0 && JG.full[g]) R.power(root, t, S * 0.95, false, 0.9); else R.power(root, t, S, true, k === 0 ? 1.3 : 1);
      R.bassNote(root - 12, t, S * 0.9);
      // drums: kick on the beat, snare on the off groups, hats on the triplets, a tom fill into the end
      if (g === 7) R.hit(['T', 'T', 't'][k], t);
      else { if (k === 0) R.hit(g & 1 ? 'S' : 'K', t); R.hit('h', t); }
    }
  }
  // C major, hit five times, the last one ringing
  const end = t0 + 8 * G;
  JG.hits.forEach((dt, i) => {
    const t = end + dt, len = i === 4 ? 0.9 : i === 0 ? 0.16 : 0.12;
    R.power(48, t, len, false, 1);
    R.bassNote(36, t, len);
    R.leadNote(84, t, len, 0, 0.9); R.leadNote(76, t, len, 1, 0.6);
    R.hit('K', t); if (i === 0 || i === 4) R.hit('c', t);
    if (i > 0 && i < 4) R.hit('S', t);
  });
}

function jingleSynth(t0) {
  const Y = JingleSynth, G = JG.G, S = G / 3;
  Y.setup(Sound.master);
  Y.depth = 0.45; Y.lastLead = null;
  for (let g = 0; g < 8; g++) {
    const root = JG.root[g];
    // a pad chord every group, a kick (and the pump) on its first triplet
    Y.pad(JG.triad[root], t0 + g * G, G * 0.98, 0.04);
    for (let k = 0; k < 3; k++) {
      const t = t0 + g * G + k * S, m = JG.lead[g][k];
      Y.leadNote(m, t, S * 0.95, 0.16, false, 0);
      Y.arpNote(m + 12, t + S / 2, S * 0.4, 0.05);
      Y.bassNote(root - 12 + (k === 1 ? 12 : 0), t, S * 0.9, 0.2, false);
      if (g === 7) Y.hit(['T', 'T', 't'][k], t);
      else { if (k === 0) { Y.hit(g & 1 ? 'X' : 'K', t); if (!(g & 1)) Y.pump(t); } Y.hit('h', t); }
    }
  }
  const end = t0 + 8 * G;
  JG.hits.forEach((dt, i) => {
    const t = end + dt, len = i === 4 ? 1.1 : 0.13;
    Y.stab([60, 64, 67, 72], t, len);
    Y.bassNote(36, t, len, 0.22, false);
    Y.leadNote(84, t, len, 0.15, false, 1);
    Y.hit(i === 4 ? 'Z' : 'K', t); Y.pump(t);
    if (i === 4) { Y.hit('c', t); Y.bell(84, t, 0.8, 0.09); Y.bell(79, t + 0.05, 0.8, 0.06); }
  });
}

(() => {
  const start = Sound.stageStart;
  Sound.stageStart = function (t0) {
    const style = typeof Config !== 'undefined' ? Config.get('musicStyle') : 'CHIPTUNE';
    if (style !== 'ROCK' && style !== 'SYNTHWAVE') return start.call(this, t0);
    if (style === 'ROCK') jingleRock(t0); else jingleSynth(t0);
    // the engine stays quiet while the fanfare plays, as in the original
    this.engineHoldUntil = t0 + 4.3;
    this.applyEngine();
  };
})();
