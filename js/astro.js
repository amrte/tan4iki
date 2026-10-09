'use strict';
// =====================================================================
//  ASTRO TANKS: a tribute to the 1979 arcade rock-blaster, with tanks. Your tank floats in open space on a screen that
//  wraps round at its edges, turning and thrusting with inertia; rocks split big -> medium -> small, flying saucers
//  shoot back, the low two-note pulse speeds up as the rocks thin out. And what the original never had: crystals to
//  pick up, the HANGAR between waves to spend them (astroup.js), pickups, and a mini boss every fifth wave
//  (astroboss.js: ASTRO_BOSSES; until it's loaded a stand-in of our own, THE MOTHER ROCK).
//    - LEFT/RIGHT turn (smoothly, the turn builds up over a few frames so taps aim finely), UP thrusts, DOWN brakes
//      hard, FIRE shoots (tap for the quick rate, hold for auto-fire at the base rate), B jumps (classic hyperspace:
//      a random spot, a little risky; a WARP DRIVE picks a safe spot), holding B drops a BOMB when you carry one.
//      Touch: the d-pad points the way to face (the tank turns there), pushed far out it thrusts.
//    - rocks: stone, iron (takes hits), ice (splits in three), crystal (pays well), magma (bursts into fire).
//    - 1-2 players together in the same field; each has lives, score, crystals and an upgraded tank of their own.
//  The world is Game.astro (A) and doubles as Game.stage while you play; its API is what the bosses build against.
// =====================================================================

const ASTRO = {
  shipR: 6,             // the tank's body for hits (its sprite is 16 px; a little forgiving)
  turn: 0.074, turnAcc: 0.018,   // rad/frame at full turn, how fast the turn builds
  thrust: 0.072, top: 3.0, drag: 0.993, brake: 0.9,
  shotSpeed: 4.6, shotLife: 43, cool: 7, hold: 13, maxShots: 4,
  inv: 150,             // after a respawn: blinking, can't be hit
  respawn: 110,         // from a wreck to the next tank (when the middle is clear)
  rockR: [15, 9, 5],    // big, medium, small
  rockScore: [20, 50, 100],
  extraEvery: 10000,
  gemLife: 720, pickupLife: 660, puTime: 600, slowTime: 480,
  warn: 180,            // the boss warning
  bombHold: 18,         // frames B is held to drop a bomb
  clearTime: 130, overTime: 210,
};
const ASTRO_STORE = 'tank1990_astro';
const ASTRO_ROCK_FRAMES = 24;
// the rocks: hits each size takes, score and crystals multipliers, pieces when split, colours (hi, light, mid, dark, outline, accents)
const ASTRO_KINDS = {
  stone: { hp: [1, 1, 1], score: 1, gems: 1, kids: 2, pal: ['#E8DCC4', '#B4A48C', '#84745C', '#54443C', '#1C140C'] },
  iron: { hp: [4, 3, 2], score: 2, gems: 1.4, kids: 2, pal: ['#F0F4F8', '#A8B4C0', '#6C7884', '#3C4450', '#0C1014', '#F8D030'] },
  ice: { hp: [1, 1, 1], score: 1, gems: 1, kids: 3, pal: ['#FFFFFF', '#C8F0FC', '#80CCF0', '#3C88C8', '#0C2848'] },
  crystal: { hp: [2, 2, 1], score: 1.5, gems: 3, kids: 2, pal: ['#D8C8F8', '#9C84D8', '#6C50A8', '#3C2870', '#140C28', '#58F8F8', '#F878F8', '#FFFFFF'] },
  magma: { hp: [2, 1, 1], score: 2, gems: 1.2, kids: 2, pal: ['#948480', '#645450', '#40342C', '#28201C', '#0C0808', '#F83800', '#F89800', '#F8E858'] },
};
const ASTRO_KIND_NEWS = { crystal: 'CRYSTAL ROCKS PAY WELL', iron: 'IRON ROCKS TAKE HITS', ice: 'ICE SPLITS IN THREE', magma: 'MAGMA BURSTS INTO FIRE' };
// pickups: the game's own power-up icons
const ASTRO_PICKUPS = {
  shield: { pu: 'HELMET', name: 'SHIELD!', w: 3, col: '#58F8F8' },
  rapid: { pu: 'RAPID', name: 'RAPID FIRE!', w: 3, col: '#F8D030' },
  triple: { pu: 'SPREAD', name: 'TRIPLE SHOT!', w: 3, col: '#F89800' },
  slow: { pu: 'CLOCK', name: 'TIME SLOW!', w: 2, col: '#C878F8' },
  bomb: { pu: 'GRENADE', name: '+1 BOMB', w: 2, col: '#F83800' },
  life: { pu: 'TANK', name: '1 UP!', w: 0.35, col: '#58D854' },
};

const astroWrapV = (v, m) => ((v % m) + m) % m;
const astroRand = (a, b) => a + Math.random() * (b - a);
function astroAngDiff(a, b) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}
function astroHash(a, b, s) {
  let h = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263) + (s | 0)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function astroPick(weights) {
  let sum = 0;
  for (const k in weights) sum += weights[k];
  let r = Math.random() * sum;
  for (const k in weights) { r -= weights[k]; if (r <= 0) return k; }
  return Object.keys(weights)[0];
}

// ================================================================= sound
// short synth sounds of our own (through the game's Sound), and the heartbeat (MUSIC's astroBeat when it's loaded)
const AstroSfx = {
  ok() { return !!(Sound.ctx && !Sound.muted && Sound.master && Sound.master.gain.value > 0); },
  play(name, k) {
    if (!this.ok()) return;
    const t = Sound.ctx.currentTime + 0.005, S = Sound;
    try {
      switch (name) {
        case 'fire': S.note(1500, t, 0.07, { wave: 'p25', vol: 0.06, slideTo: 340 }); break;
        case 'fireBig': S.note(900, t, 0.09, { wave: 'p50', vol: 0.07, slideTo: 200 }); S.noise(5000, t, [[0, 0.12], [0.05, 0]]); break;
        case 'rock0': S.noise(700, t, [[0, 0.5], [0.12, 0.35], [0.38, 0]], 250); break;
        case 'rock1': S.noise(1300, t, [[0, 0.42], [0.08, 0.3], [0.24, 0]], 500); break;
        case 'rock2': S.noise(2600, t, [[0, 0.32], [0.05, 0.2], [0.13, 0]]); break;
        case 'clang': S.note(1760, t, 0.06, { wave: 'p12', vol: 0.07 }); S.note(2637, t + 0.01, 0.08, { wave: 'p12', vol: 0.04 }); break;
        case 'thrust': S.noise(500, t, [[0, 0.07], [0.07, 0.05], [0.09, 0]]); break;
        case 'beat': S.note(k ? 31 : 33, t, 0.11, { wave: 'tri', vol: 0.32, decayTo: 0.4 }); S.noise(300, t, [[0, 0.08], [0.05, 0]]); break;
        case 'saucer': S.note(k ? 82 : 79, t, 0.06, { wave: 'p25', vol: 0.025, slideTo: k ? 1100 : 900 }); break;
        case 'saucerS': S.note(k ? 94 : 91, t, 0.05, { wave: 'p25', vol: 0.025 }); break;
        case 'eshot': S.note(700, t, 0.08, { wave: 'p50', vol: 0.035, slideTo: 300 }); break;
        case 'gem': S.note(k ? 100 : 96, t, 0.05, { wave: 'p12', vol: 0.045 }); break;
        case 'warp': S.note(54, t, 0.22, { wave: 'p50', vol: 0.07, slideTo: 1800 }); S.noise(9000, t, [[0, 0.03], [0.2, 0]]); break;
        case 'arrive': S.note(1800, t, 0.16, { wave: 'p25', vol: 0.05, slideTo: 300 }); break;
        case 'bomb': S.noise(260, t, [[0, 0.7], [0.3, 0.5], [0.9, 0]], 90); S.note(45, t, 0.6, { wave: 'tri', vol: 0.3, slideTo: 40 }); break;
        case 'shieldHit': S.note(2200, t, 0.08, { wave: 'p12', vol: 0.05, slideTo: 3300 }); break;
        case 'charge': S.note(60 + k, t, 0.04, { wave: 'p25', vol: 0.03 }); break;
        case 'drone': S.note(2400, t, 0.04, { wave: 'p12', vol: 0.025, slideTo: 1200 }); break;
      }
    } catch (e) { /* audio not ready */ }
  },
  beat(k) {
    if (typeof astroBeat === 'function') { try { astroBeat(k); return; } catch (e) { /* fall back */ } }
    this.play('beat', k);
  },
};

// ================================================================= controls
// every held direction at once (Input.player gives only the newest one, and a tank turns while it thrusts)
const astroTouch = { on: false, ang: 0, mag: 0 };
(() => {
  const el = typeof document !== 'undefined' && document.getElementById('dpad');
  if (!el) return;
  let id = null;
  const upd = e => {
    const r = el.getBoundingClientRect(), dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
    astroTouch.mag = Math.hypot(dx, dy) / Math.max(1, r.width / 2);
    astroTouch.ang = Math.atan2(dx, -dy);
    astroTouch.on = astroTouch.mag > 0.2;
  };
  el.addEventListener('pointerdown', e => { id = e.pointerId; upd(e); });
  el.addEventListener('pointermove', e => { if (e.pointerId === id) upd(e); });
  const end = e => { if (e.pointerId === id) { id = null; astroTouch.on = false; } };
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);
})();

function astroCtl(i) {
  const r = Input.remote[i];
  if (r) { const d = r.d === undefined ? -1 : r.d; return { u: d === 0, rt: d === 1, d: d === 2, l: d === 3, fire: !!r.f, fireP: !!r.firePressed, alt: !!r.a, altP: !!r.altPressed }; }
  const K = Input.keys(), n = Input.localCount() === 1 ? 1 : Input.numPlayers;
  const map = Keymap.inputMap(i) || (n >= 3 ? KEYS_MULTI[i] : n === 2 ? (i === 0 ? K.p1 : K.p2) : K.solo);
  const held = d => map[d].some(c => !TOUCH_CODES.has(c) && Input.down.has(c));
  const pl = Input.player(i);
  const o = { u: held(0), rt: held(1), d: held(2), l: held(3), fire: pl.fire, fireP: pl.firePressed, alt: pl.alt, altP: pl.altPressed };
  for (const p of Input.padsFor(i)) { o.u = o.u || p[0]; o.rt = o.rt || p[1]; o.d = o.d || p[2]; o.l = o.l || p[3]; }
  if (astroTouch.on && map[0].includes('TUp')) { o.steer = astroTouch.ang; o.u = o.u || astroTouch.mag > 0.62; }
  return o;
}

// ================================================================= pixel art: rocks
const ASTRO_SHAPES = new Map(), ASTRO_ART = new Map();
// a rock's outline (radius at 32 angles, as a share of R) and its craters, gems, seams: in its own turning frame
function astroShape(R, v) {
  const key = R + ':' + v;
  let s = ASTRO_SHAPES.get(key);
  if (s) return s;
  const rng = seeded(0x51ED27 + R * 7919 + v * 104729), N = 32, prof = [];
  const ph = [rng() * 6.28, rng() * 6.28, rng() * 6.28], am = [0.07 + rng() * 0.08, 0.05 + rng() * 0.06, 0.03 + rng() * 0.04];
  for (let k = 0; k < N; k++) {
    const a = k / N * Math.PI * 2;
    prof.push(0.9 + am[0] * Math.sin(2 * a + ph[0]) + am[1] * Math.sin(3 * a + ph[1]) + am[2] * Math.sin(5 * a + ph[2]) + (rng() - 0.5) * 0.05);
  }
  const craters = [], nc = R >= 20 ? 6 : R >= 12 ? 3 + (rng() * 2 | 0) : R >= 8 ? 2 : 1;
  for (let k = 0; k < nc; k++) {
    const a = rng() * Math.PI * 2, d = rng() * 0.55 * R;
    craters.push({ x: Math.cos(a) * d, y: Math.sin(a) * d, r: Math.max(1.4, (0.14 + rng() * 0.14) * R) });
  }
  const gems = [], ng = R >= 12 ? 4 : R >= 8 ? 3 : 1;
  for (let k = 0; k < ng; k++) {
    const a = rng() * Math.PI * 2, d = rng() * 0.6 * R;
    gems.push({ x: Math.cos(a) * d, y: Math.sin(a) * d, s: Math.max(1.6, R * (0.16 + rng() * 0.1)), c: k % 2 });
  }
  s = { R, prof, craters, gems, seam: rng() * Math.PI, seed: (rng() * 1e9) | 0, m: [rng() * 6, rng() * 6, rng() * 6] };
  ASTRO_SHAPES.set(key, s);
  return s;
}
function astroProf(sh, a) {
  const N = sh.prof.length, f = (((a / (Math.PI * 2)) % 1) + 1) % 1 * N, i = Math.floor(f), t = f - i;
  return sh.prof[i % N] * (1 - t) + sh.prof[(i + 1) % N] * t;
}
// one turning frame of a rock, lit from the top left (the light stays put while the rock turns)
// mode: 0 plain, 1 white (hit flash), 2 the other glow (magma's cracks pulse)
function astroRockArt(kind, R, v, f, mode) {
  const key = kind + R + ':' + v + ':' + f + ':' + mode;
  let c = ASTRO_ART.get(key);
  if (c) return c;
  const sh = astroShape(R, v), K = ASTRO_KINDS[kind] || ASTRO_KINDS.stone, pal = K.pal;
  const rot = f / ASTRO_ROCK_FRAMES * Math.PI * 2, cr = Math.cos(rot), sr = Math.sin(rot);
  const D = Math.ceil(R * 1.12) * 2 + 2, h = D / 2, g = new Uint8Array(D * D);
  for (let y = 0; y < D; y++) for (let x = 0; x < D; x++) {
    const dx = x + 0.5 - h, dy = y + 0.5 - h, r = Math.hypot(dx, dy);
    const lx = dx * cr + dy * sr, ly = -dx * sr + dy * cr;
    if (r > R * astroProf(sh, Math.atan2(ly, lx))) continue;
    const nx = dx / R, ny = dy / R, nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
    let L = -0.5 * nx - 0.62 * ny + 0.62 * nz + (astroHash(Math.floor(lx + 60), Math.floor(ly + 60), sh.seed) - 0.5) * 0.24;
    for (const q of sh.craters) {
      const ex = lx - q.x, ey = ly - q.y, d = Math.hypot(ex, ey);
      if (d < q.r) {
        // the crater's far wall catches the light, its near wall is in shadow
        const sx = ex * cr - ey * sr, sy = ex * sr + ey * cr;
        L += d > q.r - 1.3 ? ((sx * 0.5 + sy * 0.62) > 0 ? 0.32 : -0.3) : -0.28;
      }
    }
    let ix = L > 0.66 ? 1 : L > 0.34 ? 2 : L > 0.0 ? 3 : 4;
    // a dithered seam between the bands
    if (ix < 4 && ((x + y) & 1) && [0.66, 0.34, 0.0][ix - 1] - L > -0.06) ix++;
    if (kind === 'iron') {
      const u = lx * Math.cos(sh.seam) + ly * Math.sin(sh.seam), w = -lx * Math.sin(sh.seam) + ly * Math.cos(sh.seam);
      const m = ((u % 6) + 6) % 6;
      if (m < 1) ix = 4;
      else if (m < 2 && (((Math.floor(w) % 4) + 4) % 4) === 0) ix = 6;   // rivets
    } else if (kind === 'crystal') {
      // gems set in the rock: a bright core, the facet facing the light in colour, the other in shadow
      for (const q of sh.gems) {
        const ex = lx - q.x, ey = ly - q.y, m = Math.abs(ex) + Math.abs(ey);
        if (m >= q.s) continue;
        const sx = ex * cr - ey * sr, sy = ex * sr + ey * cr;
        ix = m < q.s * 0.35 ? 8 : sx + sy < 0 ? (q.c ? 6 : 7) : 3;
      }
    } else if (kind === 'magma') {
      const n = Math.sin(lx * 0.55 + sh.m[0]) + Math.sin(ly * 0.6 + sh.m[1]) + Math.sin((lx + ly) * 0.4 + sh.m[2]);
      const a = Math.abs(n);
      if (a < 0.2) ix = mode === 2 ? 8 : 7;
      else if (a < 0.42) ix = mode === 2 ? 7 : 6;
    } else if (kind === 'ice') {
      if (L > 0.15 && Math.abs(((lx - ly + 40) % 9) - 4.5) < 0.6) ix = 1;
    }
    g[y * D + x] = ix;
  }
  c = makeCanvas(D, D);
  const x2 = c.getContext('2d'), cols = [null, pal[0], pal[1], pal[2], pal[3], pal[4], pal[5] || pal[0], pal[6] || pal[0], pal[7] || pal[0]];
  for (let y = 0; y < D; y++) for (let x = 0; x < D; x++) {
    let v = g[y * D + x];
    if (!v) continue;
    const edge = !x || !y || x === D - 1 || y === D - 1 || !g[y * D + x - 1] || !g[y * D + x + 1] || !g[(y - 1) * D + x] || !g[(y + 1) * D + x];
    if (edge) v = 5;
    x2.fillStyle = mode === 1 ? (edge ? '#BCBCBC' : '#FFFFFF') : cols[v];
    x2.fillRect(x, y, 1, 1);
  }
  ASTRO_ART.set(key, c);
  return c;
}

// ================================================================= pixel art: the tank, turned
// The tank is the game's tank sprite as a little model (the same treads with their links, hull, ring turret and
// barrel, in the player's three colours, lit from the left as the sprite is), so it can be drawn at any of 64 angles
// with clean edges: each pixel takes the commonest of 9 samples of the model. What's bought on it (astroup.js:
// astroTankLook) adds parts to the model.
const ASTRO_SHIP_ART = new Map();
const ASTRO_INK = { 4: '#F8F8F8', 5: '#BCBCBC', 6: '#6C6C6C', 7: '#F8D030', 8: '#000000', 9: '#58F8F8', 10: '#F87800', 11: '#F83800', 12: '#3C3C3C', 13: '#B8F8F8', 14: '#C878F8' };
// the bare tank: lx, ly in sprite pixels from its middle (facing up, -y), frame 0/1 moves the tread links.
// Dark treads with light links (the left one catches the light), a bevelled hull, the ring turret, the barrel.
function astroTankBase(lx, ly, frame, heavy) {
  const ax = Math.abs(lx), tw = heavy ? 7.5 : 6.5;
  if (ax < 0.5 && ly >= -7 && ly < -2 && !heavy) return 1;
  if (ax >= 3.5 && ax <= tw && ly >= -5 && ly <= 6.5) {
    const link = (((ly + 5 + (frame ? 1.5 : 0)) % 3) + 3) % 3 < 1;
    if (link) return lx < 0 ? 1 : 2;
    return ax > tw - 1 && lx < 0 ? 2 : 3;
  }
  if (ax <= 3.2 && ly >= -3 && ly <= 5.5) {
    const ty = ly - 0.5, r = Math.hypot(lx, ty);
    if (r <= 2.7) return r > 1.9 ? 3 : lx + ty > 0.6 ? 2 : 1;
    if (lx < -2.3 || ly < -2.2) return 1;
    if (lx > 2.3 || ly > 4.6) return 3;
    if (ly > 3 && ((Math.floor(lx + 10) & 1) === 0)) return 3;
    return 2;
  }
  return 0;
}
function astroSeg(px, py, x0, y0, x1, y1) {
  const dx = x1 - x0, dy = y1 - y0, t = Math.max(0, Math.min(1, ((px - x0) * dx + (py - y0) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(px - x0 - dx * t, py - y0 - dy * t);
}
function astroPlainLook(frame) { return { key: 'plain' + frame, f: (x, y) => astroTankBase(x, y, frame, false) }; }
// s: the ship (its plates and bombs show; null in the hangar), pal: the player's colours, ang: radians
function astroShipImg(kit, s, pal, frame, ang) {
  const look = typeof astroTankLook === 'function' ? astroTankLook(kit, s, frame) : astroPlainLook(frame);
  const ai = ((Math.round(ang / (Math.PI * 2) * 64) % 64) + 64) % 64, key = look.key + pal + ':' + ai;
  let c = ASTRO_SHIP_ART.get(key);
  if (c) return c;
  const n = 30, h = 15, a = ai / 64 * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
  const P = Object.assign([], PALS[pal] || PALS.p1, ASTRO_INK), cnt = new Uint8Array(16);
  c = makeCanvas(n, n);
  const x2 = c.getContext('2d');
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    cnt.fill(0);
    for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) {
      const dx = x + (i + 0.5) / 3 - h - 0.5, dy = y + (j + 0.5) / 3 - h - 0.5;
      cnt[look.f(dx * ca + dy * sa, -dx * sa + dy * ca) | 0]++;
    }
    let v = 0, bc = cnt[0] >= 5 ? 99 : 0;
    for (let k = 1; k < 16; k++) if (cnt[k] > bc) { bc = cnt[k]; v = k; }
    if (v && P[v]) { x2.fillStyle = P[v]; x2.fillRect(x, y, 1, 1); }
  }
  if (ASTRO_SHIP_ART.size > 4000) ASTRO_SHIP_ART.clear();
  ASTRO_SHIP_ART.set(key, c);
  return c;
}

// ================================================================= pixel art: saucers, crystals, the sky
const ASTRO_SAUCER_ART = new Map();
function astroSaucerArt(small, f) {
  const key = (small ? 's' : 'b') + f;
  let c = ASTRO_SAUCER_ART.get(key);
  if (c) return c;
  const w = small ? 14 : 24, h = small ? 8 : 12;
  c = makeCanvas(w, h);
  const x = c.getContext('2d'), R = (col, a, b, ww, hh = 1) => { x.fillStyle = col; x.fillRect(a, b, ww, hh); };
  const body = small ? ['#F8B8A8', '#E04830', '#882010'] : ['#E8E8E8', '#A8A8B8', '#585868'];
  const glass = small ? ['#F8F8F8', '#F8D030'] : ['#F8F8F8', '#58D8F8'];
  if (small) {
    R(glass[1], 5, 0, 4, 1); R(glass[1], 4, 1, 6, 1); R(glass[0], 5, 1, 1, 1);
    R('#101010', 3, 2, 8, 1); R(body[0], 1, 3, 12, 1); R(body[1], 0, 4, 14, 2); R(body[2], 2, 6, 10, 1); R('#101010', 4, 7, 6, 1);
    for (let k = 0; k < 4; k++) R((k + f) % 4 === 0 ? '#F8F858' : '#600000', 2 + k * 3, 4, 1, 1);
  } else {
    R(glass[1], 9, 0, 6, 1); R(glass[1], 8, 1, 8, 1); R(glass[1], 7, 2, 10, 1); R(glass[0], 9, 1, 2, 1); R('#2878A8', 7, 3, 10, 1);
    R(body[0], 3, 4, 18, 1); R(body[0], 1, 5, 22, 1); R(body[1], 0, 6, 24, 2); R(body[2], 1, 8, 22, 1); R(body[2], 4, 9, 16, 1); R('#202028', 7, 10, 10, 1); R('#202028', 9, 11, 6, 1);
    const lc = ['#F83800', '#F8D030', '#58F858', '#58D8F8'];
    for (let k = 0; k < 6; k++) R((k + f) % 3 === 0 ? lc[(k + f) % 4] : '#383848', 2 + k * 4, 6, 2, 1);
  }
  ASTRO_SAUCER_ART.set(key, c);
  return c;
}
function astroGemArt(big, f) {
  const key = 'gem' + (big ? 1 : 0) + f;
  let c = ASTRO_SAUCER_ART.get(key);
  if (c) return c;
  const rows = big ? ['...1...', '..112..', '.11223.', '1122233', '.12233.', '..233..', '...3...'] : ['..1..', '.112.', '11223', '.123.', '..3..'];
  const pal = big ? [null, '#FFFFFF', '#F878F8', '#B020B0'] : [null, '#FFFFFF', '#58F8F8', '#0088A8'];
  c = makeCanvas(rows[0].length, rows.length);
  const x = c.getContext('2d');
  rows.forEach((r, j) => { for (let i = 0; i < r.length; i++) if (r[i] !== '.') { x.fillStyle = f && r[i] === '2' && (i + j) % 2 ? pal[1] : pal[+r[i]]; x.fillRect(i, j, 1, 1); } });
  ASTRO_SAUCER_ART.set(key, c);
  return c;
}
// deep space: a faint dithered nebula and stars (made once per field size)
const ASTRO_SKY = { key: '', c: null, tw: [] };
function astroSky(W, H) {
  const key = W + 'x' + H;
  if (ASTRO_SKY.key === key) return ASTRO_SKY;
  const c = makeCanvas(W, H), x = c.getContext('2d'), R = seeded(1979);
  x.fillStyle = '#000000'; x.fillRect(0, 0, W, H);
  const blobs = [];
  for (let k = 0; k < 3; k++) blobs.push({ x: R() * W, y: R() * H, r: 60 + R() * 70, c: ['#06061C', '#10061A', '#04100F'][k] });
  for (let y = 0; y < H; y++) for (let xx = 0; xx < W; xx++) {
    for (const b of blobs) {
      // soft edges: a checker, thinning out (a few pixels of it) towards the rim
      const d = Math.min(Math.hypot(xx - b.x, y - b.y), Math.hypot(xx - b.x - W, y - b.y), Math.hypot(xx - b.x, y - b.y - H), Math.hypot(xx - b.x + W, y - b.y), Math.hypot(xx - b.x, y - b.y + H)) / b.r;
      const n = d + (astroHash(xx >> 3, y >> 3, 77) - 0.5) * 0.25;
      if (n < 0.45 || (n < 0.7 && ((xx + y) & 1)) || (n < 0.85 && !(xx & 1) && !(y & 1) && ((xx + y) & 2))) { x.fillStyle = b.c; x.fillRect(xx, y, 1, 1); break; }
    }
  }
  const n = Math.round(W * H / 500);
  for (let k = 0; k < n; k++) {
    const b = R();
    x.fillStyle = b < 0.6 ? '#3C3C5C' : b < 0.9 ? '#7C7C9C' : '#C8C8E8';
    x.fillRect((R() * W) | 0, (R() * H) | 0, 1, 1);
  }
  ASTRO_SKY.tw = [];
  for (let k = 0; k < Math.round(n / 6); k++) ASTRO_SKY.tw.push({ x: (R() * W) | 0, y: (R() * H) | 0, ph: (R() * 120) | 0, big: R() < 0.3 });
  ASTRO_SKY.key = key; ASTRO_SKY.c = c;
  return ASTRO_SKY;
}

// ================================================================= the waves
function astroWavePlan(w, W, H) {
  const area = Math.max(0.75, Math.min(1.6, (W * H) / (288 * 240))), boss = w % 5 === 0;
  let big = boss ? 1 + Math.min(3, Math.floor(w / 10)) : Math.round((2.2 + w * 0.55) * Math.sqrt(area));
  big = Math.max(2, Math.min(10, big));
  const med = boss ? 1 : w >= 7 ? Math.min(5, Math.floor((w - 5) / 2)) : 0;
  const weights = { stone: 10 };
  if (w >= 2) weights.crystal = 1.6;
  if (w >= 3) weights.iron = Math.min(4, 1.6 + (w - 3) * 0.4);
  if (w >= 4) weights.ice = Math.min(3.5, 1.6 + (w - 4) * 0.3);
  if (w >= 6) weights.magma = Math.min(3.5, 1.4 + (w - 6) * 0.35);
  const sk = Config.skill(), speed = Math.min(2.1, 1 + 0.075 * (w - 1)) * (0.5 + 0.5 * (sk.speed || 1));
  return { big, med, weights, speed, boss };
}
// the bosses in order (ASTRO_BOSSES from astroboss.js, or the stand-in)
function astroWaveBosses() {
  if (typeof ASTRO_BOSSES !== 'undefined' && Array.isArray(ASTRO_BOSSES) && ASTRO_BOSSES.length) return ASTRO_BOSSES.slice().sort((a, b) => (a.wave || 0) - (b.wave || 0));
  return [{ key: 'motherRock', name: 'THE MOTHER ROCK', wave: 5, make: astroStandInBoss }];
}

// the stand-in boss: a huge magma rock with a core that throws rings of fire and calves small rocks
function astroStandInBoss(A) {
  const s = A.ships()[0], hp = 70 + 50 * A.loop;
  const b = {
    name: 'THE MOTHER ROCK', r: 25, hp, maxHp: hp, dying: false, dead: false, t: 0, flash: 0, rot: 0, dieT: 0,
    x: s ? astroWrapV(s.x + A.W / 2, A.W) : A.W / 2, y: s ? astroWrapV(s.y + A.H / 2, A.H) : A.H / 4,
    vx: astroRand(-0.35, 0.35), vy: astroRand(-0.35, 0.35),
    update(A) {
      this.t++;
      if (this.flash > 0) this.flash--;
      if (this.dying) {
        if (++this.dieT % 8 === 0) A.boom(this.x + astroRand(-20, 20), this.y + astroRand(-20, 20), 1 + (this.dieT % 24 === 0 ? 1 : 0));
        if (this.dieT >= 90) { A.boom(this.x, this.y, 3); this.dead = true; }
        return;
      }
      this.x = astroWrapV(this.x + this.vx, A.W); this.y = astroWrapV(this.y + this.vy, A.H);
      this.rot += 0.004;
      const rage = this.hp < this.maxHp / 2 ? 1 : 0, ring = Math.max(64, 130 - 20 * A.loop - 34 * rage);
      if (this.t % ring === 0) {
        const n = 8 + 2 * A.loop + 4 * rage, a0 = this.t * 0.05;
        for (let k = 0; k < n; k++) { const a = a0 + k / n * Math.PI * 2; A.enemyShot(this.x + Math.sin(a) * 22, this.y - Math.cos(a) * 22, Math.sin(a) * 1.3, -Math.cos(a) * 1.3, { r: 2, life: 120, col: '#F89800' }); }
      }
      if (this.t % (260 - 60 * rage) === 130 && A.rocks.length < 12) {
        const a = Math.random() * Math.PI * 2;
        A.spawnRock(this.x + Math.sin(a) * 26, this.y - Math.cos(a) * 26, 2, Math.sin(a) * 1.2, -Math.cos(a) * 1.2, { kind: 'magma' });
      }
    },
    draw(ctx, A) {
      const f = ((Math.floor(this.rot / (Math.PI * 2) * ASTRO_ROCK_FRAMES) % ASTRO_ROCK_FRAMES) + ASTRO_ROCK_FRAMES) % ASTRO_ROCK_FRAMES;
      const img = astroRockArt('magma', 25, 1, f, this.flash > 0 && (this.flash & 2) ? 1 : (A.clock >> 3) & 1 ? 2 : 0);
      A.wrapDraw(this.x, this.y, 30, (x, y) => {
        if (this.dying && (this.dieT >> 1) & 1) return;
        ctx.drawImage(img, Math.round(x - img.width / 2), Math.round(y - img.height / 2));
        // the core, glowing through
        const p = (A.clock >> 2) & 3;
        ctx.fillStyle = ['#F8E858', '#F89800', '#F83800', '#F89800'][p];
        ctx.fillRect(Math.round(x) - 2, Math.round(y) - 2, 4, 4);
      });
    },
    hit(x, y, r, dmg) {
      if (this.dying) return false;
      if (A.near(x, y, this.x, this.y).d > this.r + r) return false;
      this.hp -= dmg; this.flash = 6;
      if (Math.random() < 0.12) A.drop(x, y, 'crystal');
      if (this.hp <= 0) { this.hp = 0; this.dying = true; A.shake(30); }
      return true;
    },
    touches(x, y, r) { return !this.dying && A.near(x, y, this.x, this.y).d < this.r * 0.85 + r; },
  };
  return b;
}

// ================================================================= the world
class AstroWorld {
  constructor(game) {
    this.astro = true; this.G = game;
    this.W = VIEW_W; this.H = VIEW_H;
    this.over = false; this.result = null;
    this.wave = 0; this.loop = 0; this.frame = 0; this.t = 0; this.clock = 0;
    this.phase = 'play'; this.boss = null; this.bossDef = null; this.bossBeaten = false;
    this.rocks = []; this.saucers = []; this.shots = []; this.eshots = []; this.parts = []; this.fx = []; this.pops = []; this.gems = []; this.pickups = []; this.waves = [];
    this.fleet = [];
    this.shakeT = 0; this.shakeMag = 0; this.flashT = 0; this.flashCol = '#FFFFFF'; this.slowT = 0;
    this.beatT = 60; this.beatK = 0; this.vid = 0; this.bombId = 0;
    this.banner = null; this.news = '';
    this.seen = {};
    const rec = STORE.get(ASTRO_STORE, {}) || {};
    this.hi = rec.hi | 0; this.bestWave = rec.wave | 0;
  }

  get P() { return this.G.players; }

  // ------------------------------------------------------------ the API (contract)
  ships() { return this.fleet.filter(s => s && !s.dead && !s.jumpT); }
  near(ax, ay, bx, by) {
    let dx = bx - ax, dy = by - ay;
    if (dx > this.W / 2) dx -= this.W; else if (dx < -this.W / 2) dx += this.W;
    if (dy > this.H / 2) dy -= this.H; else if (dy < -this.H / 2) dy += this.H;
    return { dx, dy, d: Math.hypot(dx, dy) };
  }
  spawnRock(x, y, size, vx, vy, opts) {
    size = Math.max(0, Math.min(2, size | 0));
    const kind = opts && ASTRO_KINDS[opts.kind] ? opts.kind : 'stone', K = ASTRO_KINDS[kind];
    const r = {
      x: astroWrapV(x, this.W), y: astroWrapV(y, this.H), vx: vx || 0, vy: vy || 0, size, kind, hp: K.hp[size] + (K.hp[size] > 1 ? this.loop : 0), r: ASTRO.rockR[size],
      v: (Math.random() * 6) | 0, rot: Math.random() * Math.PI * 2, spin: astroRand(0.008, 0.03) * (Math.random() < 0.5 ? -1 : 1) * (1 + size * 0.5), flash: 0, bomb: 0,
    };
    this.rocks.push(r);
    return r;
  }
  enemyShot(x, y, vx, vy, opts) {
    const o = opts || {};
    const e = { x: astroWrapV(x, this.W), y: astroWrapV(y, this.H), vx, vy, r: o.r || 2, life: o.life || 90, col: o.col || '#F85898', dmg: o.dmg || 1, homing: o.homing || 0, t: 0 };
    this.eshots.push(e);
    return e;
  }
  spawnSaucer(x, y, small) {
    const dir = x < this.W / 2 ? 1 : -1, sp = small ? 1.45 : 1.0;
    const s = {
      x, y: astroWrapV(y, this.H), vx: dir * sp * (0.9 + Math.min(0.5, this.wave * 0.03)), vy: 0, small: !!small, r: small ? 5 : 9, hp: small ? 1 : this.wave >= 7 ? 3 : 2,
      fireT: small ? 50 : 70, turnT: 40 + rnd(40), anim: 0, flash: 0, gone: 0,
    };
    s.vy = (Math.random() < 0.5 ? -1 : 1) * Math.abs(s.vx) * 0.5;
    this.saucers.push(s);
    return s;
  }
  hurtShip(s, dmg) { return this.hitShip(s, dmg || 1, null); }
  boom(x, y, size) {
    size = Math.max(0, Math.min(3, size | 0));
    const n = [10, 20, 34, 60][size], sp = [1.2, 1.8, 2.4, 3.2][size];
    for (let k = 0; k < n; k++) {
      const a = Math.random() * Math.PI * 2, v = Math.random() * sp;
      this.part(x, y, Math.sin(a) * v, -Math.cos(a) * v, 14 + rnd(18 + size * 8), ['#FFFFFF', '#F8E858', '#F89800', '#F83800', '#A01800'][rnd(5)], Math.random() < 0.3 ? 2 : 1);
    }
    if (size >= 1) this.fx.push({ x, y, frames: size >= 2 ? BIG_EXPLOSION() : Sprites.smallExp, i: 0, t: 0, step: 4 });
    if (size >= 2) this.ring(x, y, size >= 3 ? 70 : 34, '#F8E858');
    if (size >= 2) this.shake(size >= 3 ? 26 : 12);
    Sound.play(size >= 2 ? 'explode' : 'brick');
  }
  shake(n) { this.shakeT = Math.max(this.shakeT, n | 0); this.shakeMag = Math.min(5, Math.max(this.shakeMag, 1 + n / 8)); }
  flash(n, col) { this.flashT = Math.max(this.flashT, n | 0); this.flashCol = col || '#FFFFFF'; }
  popup(x, y, text, col) { this.pops.push({ x, y, text: String(text), col: col || '#FFFFFF', t: 0 }); }
  addScore(p, n) {
    const list = p < 0 ? this.P.filter(q => !q.out) : [this.P[p]];
    for (const q of list) {
      if (!q) continue;
      q.score += n;
      while (q.score >= (q.astroNext || ASTRO.extraEvery)) {
        q.astroNext = (q.astroNext || ASTRO.extraEvery) + ASTRO.extraEvery;
        if (!Config.infiniteLives()) q.lives++;
        const s = this.fleet[q.i];
        if (s && !s.dead) this.popup(s.x, s.y - 12, '1 UP!', '#58D854');
        Sound.play('life');
      }
    }
  }
  drop(x, y, kind) {
    if (kind === 'crystal' || kind === 'gem') { this.gem(x, y, 1); return; }
    if (kind === 'bigCrystal') { this.gem(x, y, 5); return; }
    const k = ASTRO_PICKUPS[kind] ? kind : astroPick(Object.fromEntries(Object.entries(ASTRO_PICKUPS).map(([n, d]) => [n, d.w])));
    const a = Math.random() * Math.PI * 2;
    this.pickups.push({ x: astroWrapV(x, this.W), y: astroWrapV(y, this.H), vx: Math.sin(a) * 0.25, vy: -Math.cos(a) * 0.25, k, life: ASTRO.pickupLife });
  }

  // ------------------------------------------------------------ little helpers
  part(x, y, vx, vy, life, col, sz, drag) {
    if (this.parts.length > 700) this.parts.shift();
    this.parts.push({ x, y, vx, vy, life, max: life, col, sz: sz || 1, drag: drag || 0.97 });
  }
  ring(x, y, r, col) { this.waves.push({ x, y, r: 2, max: r, col, t: 0 }); }
  gem(x, y, v) {
    const a = Math.random() * Math.PI * 2, sp = astroRand(0.3, 1.1);
    this.gems.push({ x: astroWrapV(x, this.W), y: astroWrapV(y, this.H), vx: Math.sin(a) * sp, vy: -Math.cos(a) * sp, v, life: ASTRO.gemLife + rnd(60), ph: rnd(40) });
  }
  wrapDraw(x, y, r, fn) {
    const W = this.W, H = this.H, xs = [x], ys = [y];
    if (x < r) xs.push(x + W); else if (x > W - r) xs.push(x - W);
    if (y < r) ys.push(y + H); else if (y > H - r) ys.push(y - H);
    for (const xx of xs) for (const yy of ys) fn(xx, yy);
  }
  stats(i) { const p = this.P[i]; return typeof astroStats === 'function' ? astroStats(p.astro) : astroBaseStats(); }
  spawnPoint(i) {
    const n = this.P.length;
    return { x: this.W / 2 + (n > 1 ? (i ? 22 : -22) : 0), y: this.H / 2 };
  }
  // nothing about to hit a tank appearing here
  safeAt(x, y, rad) {
    for (const r of this.rocks) if (this.near(x, y, r.x, r.y).d < rad + r.r + Math.hypot(r.vx, r.vy) * 30) return false;
    for (const s of this.saucers) if (this.near(x, y, s.x, s.y).d < rad + 30) return false;
    for (const e of this.eshots) if (this.near(x, y, e.x, e.y).d < rad) return false;
    if (this.boss && !this.boss.dying && this.boss.touches && this.boss.touches(x, y, rad)) return false;
    return true;
  }
  // the safest of a few spots (for a warp)
  safestSpot() {
    let best = null, bd = -1;
    for (let k = 0; k < 28; k++) {
      const x = astroRand(20, this.W - 20), y = astroRand(20, this.H - 20);
      let d = 999;
      for (const r of this.rocks) d = Math.min(d, this.near(x, y, r.x, r.y).d - r.r);
      for (const s of this.saucers) d = Math.min(d, this.near(x, y, s.x, s.y).d - 20);
      for (const e of this.eshots) d = Math.min(d, this.near(x, y, e.x, e.y).d);
      if (this.boss && !this.boss.dying) d = Math.min(d, this.near(x, y, this.boss.x, this.boss.y).d - (this.boss.r || 20));
      if (d > bd) { bd = d; best = { x, y }; }
    }
    return best;
  }

  // ------------------------------------------------------------ waves
  newShip(i, inv) {
    const p = this.P[i], sp = this.spawnPoint(i), st = this.stats(i);
    const s = {
      p: i, x: sp.x, y: sp.y, vx: 0, vy: 0, ang: 0, av: 0, r: ASTRO.shipR, inv: inv || ASTRO.inv, dead: false, respawnT: 0, jumpT: 0, dest: null,
      since: 99, buf: 0, anim: 0, thrust: false, plates: st.plates, shieldUp: st.regen > 0, regenT: 0, holdB: 0, warpCool: 0,
      pu: { shield: 0, rapid: 0, triple: 0 }, droneA: 0, droneT: [20, 40], exT: 0, hurtT: 0,
    };
    p.astro.bombs = Math.max(p.astro.bombs | 0, st.bombs);
    return s;
  }

  startWave(w) {
    this.wave = w; this.frame = 0; this.t = 0;
    this.boss = null; this.bossDef = null; this.bossBeaten = false; this.bossNext = null;
    this.shots = []; this.eshots = []; this.saucers = []; this.gems = []; this.pickups = []; this.waves = []; this.rocks = []; this.pops = [];
    this.slowT = 0; this.perfect = true;
    // RESTART ROUND goes back to here
    this.roundSave = JSON.parse(JSON.stringify(this.P.map(p => ({ score: p.score, lives: p.lives, out: p.out, astro: p.astro, astroNext: p.astroNext }))));
    this.fleet = this.P.map((p, i) => (p.out ? null : this.newShip(i, 90)));
    const plan = astroWavePlan(w, this.W, this.H);
    this.plan = plan;
    const kinds = [];
    for (let k = 0; k < plan.big + plan.med; k++) kinds.push(astroPick(plan.weights));
    // the first wave a kind turns up in: one for sure, and a word about it
    this.news = '';
    for (const k of Object.keys(plan.weights)) if (k !== 'stone' && !this.seen[k] && !plan.boss) { kinds[0] = k; this.seen[k] = true; this.news = ASTRO_KIND_NEWS[k]; break; }
    kinds.forEach((kind, k) => {
      const size = k < plan.big ? 0 : 1;
      let x = 0, y = 0;
      for (let tries = 0; tries < 30; tries++) {
        // round the edges, away from the tanks
        if (Math.random() < 0.5) { x = Math.random() * this.W; y = Math.random() < 0.5 ? astroRand(0, 24) : astroRand(this.H - 24, this.H); }
        else { y = Math.random() * this.H; x = Math.random() < 0.5 ? astroRand(0, 24) : astroRand(this.W - 24, this.W); }
        if (this.fleet.every(s => !s || this.near(x, y, s.x, s.y).d > 80)) break;
      }
      const a = Math.random() * Math.PI * 2, sp = astroRand(0.3, 0.55) * plan.speed * (size ? 1.4 : 1);
      this.spawnRock(x, y, size, Math.sin(a) * sp, -Math.cos(a) * sp, { kind });
    });
    this.mass0 = Math.max(1, this.rockMass());
    const sk = Config.skill();
    this.saucerT = w >= 2 ? Math.max(360, 940 - w * 40) / Math.sqrt(sk.spawn || 1) : 1e9;
    if (plan.boss) {
      const L = astroWaveBosses(), k = w / 5 - 1;
      this.bossDef = L[k % L.length];
      this.loop = Math.floor(k / L.length);
      this.phase = 'warn';
      this.banner = null;
      // made now (where it will come in shows during the warning), let loose when the warning ends
      this.bossNext = null;
      try { this.bossNext = this.bossDef.make(this); } catch (e) { console.error(e); }
      if (!this.bossNext) this.bossNext = astroStandInBoss(this);
      if (!this.bossNext.name) this.bossNext.name = this.bossDef.name;
      Sound.play('bossWarn');
    } else {
      this.loop = Math.floor((w - 1) / 15);
      this.phase = 'play';
      this.banner = { text: 'WAVE ' + w, sub: this.news || (w === 2 ? 'SAUCERS ON THE WAY' : ''), t: 0 };
    }
    this.beatT = 50;
  }

  // RESTART ROUND (pause menu): the wave from its start, as things stood then
  restartWave() {
    const sv = this.roundSave;
    if (!sv) return;
    this.P.forEach((p, i) => Object.assign(p, JSON.parse(JSON.stringify(sv[i]))));
    this.over = false; this.overDone = false; this.clearDone = false;
    this.parts = []; this.fx = [];
    this.startWave(this.wave);
  }

  rockMass() { let m = 0; for (const r of this.rocks) m += [4, 2, 1][r.size]; return m; }

  // ------------------------------------------------------------ a frame
  update() {
    this.t++; this.frame++; this.clock++;
    const slow = this.slowT > 0;
    if (slow) this.slowT--;
    const ts = slow ? 0.45 : 1;
    if (this.phase === 'warn' && this.t >= ASTRO.warn) this.bossArrives();
    this.updateShips();
    this.updateShots();
    this.updateRocks(ts);
    this.updateSaucers(ts);
    this.updateBoss(slow);
    this.updateEshots(ts);
    this.collide();
    this.updateLoot();
    this.updateFx();
    this.heartbeat();
    if (this.phase === 'play' && this.wave >= 2 && !this.boss && this.saucers.length < (this.wave >= 12 ? 3 : this.wave >= 6 ? 2 : 1)) {
      this.saucerT -= this.rocks.length <= 3 && this.frame > 1500 ? 3 : 1;   // the field nearly clear and you dawdle: they come sooner
      if (this.saucerT <= 0) this.newSaucer();
    }
    // the wave cleared
    if (this.phase === 'play' && !this.rocks.length && !this.saucers.length && !this.boss && !(this.plan && this.plan.boss && !this.bossBeaten)) {
      this.phase = 'clear'; this.t = 0;
      const bonus = 250 * this.wave;
      this.addScore(-1, bonus);
      this.banner = { text: 'WAVE ' + this.wave + ' CLEAR', sub: 'BONUS ' + bonus + (this.perfect ? '  PERFECT +5' : ''), t: 0, clear: true };
      if (this.perfect) for (const p of this.P) if (!p.out) p.astro.gems += 5;
      Sound.play('bonus');
    }
    if (this.phase === 'clear' && this.t >= ASTRO.clearTime && (!this.gems.length || this.t > ASTRO.clearTime + 240)) this.clearDone = true;
    // everyone out: game over
    if (this.phase !== 'over' && this.P.every(p => p.out) && this.fleet.every(s => !s || s.dead)) {
      this.phase = 'over'; this.t = 0; this.over = true;
      Sound.setEngine(0);
      this.record();
    }
    if (this.phase === 'over' && this.t >= ASTRO.overTime) this.overDone = true;
    if (this.banner && ++this.banner.t > 150) this.banner = null;
    if (this.shakeT > 0 && --this.shakeT === 0) this.shakeMag = 0;
    if (this.flashT > 0) this.flashT--;
  }

  // the best score and wave, kept
  record() {
    const score = this.P.reduce((a, p) => a + p.score, 0), rec = STORE.get(ASTRO_STORE, {}) || {};
    this.newBest = score > (rec.hi | 0);
    this.newWave = this.wave > (rec.wave | 0);
    rec.hi = Math.max(rec.hi | 0, score); rec.wave = Math.max(rec.wave | 0, this.wave);
    STORE.set(ASTRO_STORE, rec);
    this.hi = rec.hi; this.bestWave = rec.wave;
  }

  bossArrives() {
    const b = this.bossNext || astroStandInBoss(this);
    this.bossNext = null;
    this.boss = b;
    this.phase = 'play'; this.t = 0;
    this.flash(6, '#F8F8F8'); this.shake(20);
    this.ring(b.x, b.y, (b.r || 24) * 2.5, '#F83800');
  }

  updateBoss(slow) {
    const b = this.boss;
    if (!b) return;
    if (!slow || (this.clock & 1)) { try { b.update(this); } catch (e) { console.error(e); b.dead = true; } }
    if (b.dead) {
      this.boss = null; this.bossBeaten = true;
      const pts = 2500 * (this.loop + 1) * (this.bossDef ? 1 + Math.floor((this.wave / 5 - 1) % 3) * 0.5 : 1);
      this.addScore(-1, Math.round(pts));
      this.popup(b.x, b.y, String(Math.round(pts)), '#F8D030');
      for (let k = 0; k < 6 + 2 * this.loop; k++) this.gem(b.x + astroRand(-16, 16), b.y + astroRand(-16, 16), 5);
      for (let k = 0; k < 10; k++) this.gem(b.x + astroRand(-16, 16), b.y + astroRand(-16, 16), 1);
      this.drop(b.x, b.y);
      this.boom(b.x, b.y, 3);
      this.flash(10, '#FFFFFF');
      Sound.play('bossDie');
      for (const s of this.saucers) s.hp = 0;
    }
  }

  // ------------------------------------------------------------ the tanks
  updateShips() {
    this.fleet.forEach((s, i) => {
      if (!s) return;
      const p = this.P[i];
      if (s.dead) {
        if (p.out || this.phase === 'over') return;
        s.respawnT--;
        const sp = this.spawnPoint(i);
        if (s.respawnT <= 0 && (this.safeAt(sp.x, sp.y, 44) || s.respawnT < -300)) {
          this.fleet[i] = this.newShip(i);
          this.ring(sp.x, sp.y, 20, '#58F8F8');
          AstroSfx.play('arrive');
        }
        return;
      }
      if (s.jumpT > 0) {
        if (--s.jumpT === 0) this.arrive(s);
        return;
      }
      const st = this.stats(i), kit = p.astro;
      const c = this.phase === 'over' ? {} : astroCtl(i);
      // turning: the turn builds over a few frames, so a tap nudges and a hold swings round
      let want = 0;
      if (c.steer !== undefined) want = Math.max(-1, Math.min(1, astroAngDiff(s.ang, c.steer) / (st.turn * 4))) * st.turn;
      else want = ((c.rt ? 1 : 0) - (c.l ? 1 : 0)) * st.turn;
      const acc = want === 0 ? st.turnAcc * 2.5 : st.turnAcc;
      s.av += Math.max(-acc, Math.min(acc, want - s.av));
      s.ang = astroWrapV(s.ang + s.av, Math.PI * 2);
      // thrust, brakes
      s.thrust = !!c.u;
      const sx = Math.sin(s.ang), sy = -Math.cos(s.ang);
      if (c.u) {
        s.vx += sx * st.thrust; s.vy += sy * st.thrust;
        if ((this.clock & 1) === 0) {
          const bx = s.x - sx * 9, by = s.y - sy * 9;
          this.part(bx + astroRand(-1.5, 1.5), by + astroRand(-1.5, 1.5), -sx * astroRand(0.8, 1.6) + s.vx * 0.5, -sy * astroRand(0.8, 1.6) + s.vy * 0.5, 10 + rnd(10),
            st.engineLv >= 2 ? ['#B8F8F8', '#58D8F8', '#3C7CFC', '#5C5C7C'][rnd(4)] : ['#F8E858', '#F89800', '#F83800', '#5C5C5C'][rnd(4)], 1, 0.93);
        }
        if (++s.exT % 6 === 0) AstroSfx.play('thrust');
      }
      if (c.d) {
        s.vx *= st.brake; s.vy *= st.brake;
        if (st.reverse && Math.hypot(s.vx, s.vy) < 0.4) { s.vx -= sx * st.thrust * 0.5; s.vy -= sy * st.thrust * 0.5; }
        if ((this.clock & 3) === 0 && Math.hypot(s.vx, s.vy) > 0.3) this.part(s.x + sx * 8, s.y + sy * 8, sx * 0.5, sy * 0.5, 8, '#ADADAD', 1);
      }
      s.vx *= ASTRO.drag; s.vy *= ASTRO.drag;
      const v = Math.hypot(s.vx, s.vy);
      if (v > st.top) { s.vx *= st.top / v; s.vy *= st.top / v; }
      s.x = astroWrapV(s.x + s.vx, this.W); s.y = astroWrapV(s.y + s.vy, this.H);
      if (c.u || Math.abs(s.av) > 0.01) s.anim++;
      // the gun: a tap fires at the quick rate, holding at the base rate (with a short buffer for taps)
      s.since++;
      if (c.fireP) s.buf = 8;
      if (s.buf > 0) s.buf--;
      const rapid = s.pu.rapid > 0, cool = rapid ? Math.max(3, st.cool >> 1) : st.cool, hold = rapid ? Math.max(4, st.hold >> 1) : st.hold;
      const maxV = st.maxShots + (rapid ? 3 : 0);
      if (this.phase !== 'over' && ((s.buf > 0 && s.since >= cool) || (c.fire && s.since >= hold)) && this.volleys(i) < maxV) { this.fire(s, st); s.since = 0; s.buf = 0; }
      // B: a jump, or held: a bomb (when there's one in the rack)
      if (c.altP) {
        s.holdB = 1;
        if (!(kit.bombs > 0)) { this.jump(s, st); s.holdB = 0; }
      } else if (c.alt && s.holdB > 0) {
        s.holdB++;
        if (s.holdB % 4 === 0) AstroSfx.play('charge', s.holdB);
        if (s.holdB >= ASTRO.bombHold) { this.bomb(s); s.holdB = 0; }
      } else if (!c.alt && s.holdB > 0) { this.jump(s, st); s.holdB = 0; }
      // timers
      if (s.inv > 0) s.inv--;
      if (s.hurtT > 0) s.hurtT--;
      if (s.warpCool > 0) s.warpCool--;
      for (const k in s.pu) if (s.pu[k] > 0) s.pu[k]--;
      if (st.regen > 0 && !s.shieldUp && ++s.regenT >= st.regen) { s.shieldUp = true; s.regenT = 0; AstroSfx.play('shieldHit'); this.popup(s.x, s.y - 12, 'SHIELD UP', '#58F8F8'); }
      // drones
      if (st.drones > 0) {
        s.droneA += 0.05;
        for (let k = 0; k < st.drones; k++) {
          if (--s.droneT[k] > 0) continue;
          const a = s.droneA + k * Math.PI, dx = s.x + Math.sin(a) * 15, dy = s.y - Math.cos(a) * 15, tg = this.targetNear(dx, dy, 130);
          if (!tg) { s.droneT[k] = 10; continue; }
          const n = this.near(dx, dy, tg.x, tg.y), sp = 4.2;
          this.shots.push({ x: dx, y: dy, vx: n.dx / n.d * sp, vy: n.dy / n.d * sp, life: 34, p: i, vid: -1, pierce: 0, hom: 0, dmg: 1, r: 1.5, drone: true });
          s.droneT[k] = Math.max(22, 44 - st.drones * 6);
          AstroSfx.play('drone');
        }
      }
    });
  }

  volleys(i) { const set = new Set(); for (const o of this.shots) if (o.p === i && o.vid >= 0) set.add(o.vid); return set.size; }

  fire(s, st) {
    const a = s.ang, vid = ++this.vid, list = [];
    const pat = [[[0, 0]], [[-3, 0], [3, 0]], [[0, 0], [-2, -0.13], [2, 0.13]], [[-3, 0], [3, 0], [-4, -0.18], [4, 0.18]]][Math.min(3, st.guns)];
    for (const q of pat) list.push([q[0], q[1], 10]);
    if (s.pu.triple > 0) list.push([-3, -0.3, 9], [3, 0.3, 9]);
    if (st.rear === 1) list.push([0, Math.PI, -9]);
    if (st.rear >= 2) list.push([-2, Math.PI - 0.22, -9], [2, Math.PI + 0.22, -9]);
    const px = Math.cos(a), py = Math.sin(a);   // sideways
    for (const [lo, ao, nose] of list) {
      const d = a + ao, dx = Math.sin(d), dy = -Math.cos(d);
      const x = s.x + Math.sin(a) * nose + px * lo, y = s.y - Math.cos(a) * nose + py * lo;
      this.shots.push({ x, y, vx: dx * st.shotSpeed + s.vx, vy: dy * st.shotSpeed + s.vy, life: st.shotLife, p: s.p, vid, pierce: st.pierce, hom: st.homing, dmg: 1, r: 1.5, hits: null });
      this.part(x, y, dx * 0.6 + s.vx, dy * 0.6 + s.vy, 4, '#FFFFFF', 2, 0.8);
    }
    s.vx -= Math.sin(a) * 0.03; s.vy += Math.cos(a) * 0.03;   // a little kick back
    AstroSfx.play(st.guns >= 2 ? 'fireBig' : 'fire');
  }

  // the nearest thing worth shooting (homing shells, drones)
  targetNear(x, y, range, dirX, dirY) {
    let best = null, bd = range;
    const look = o => {
      const n = this.near(x, y, o.x, o.y);
      if (n.d >= bd) return;
      if (dirX !== undefined && (n.dx * dirX + n.dy * dirY) / (n.d || 1) < 0.35) return;
      bd = n.d; best = o;
    };
    for (const r of this.rocks) look(r);
    for (const s of this.saucers) look(s);
    if (this.boss && !this.boss.dying && this.phase !== 'warn') look(this.boss);
    return best;
  }

  jump(s, st) {
    if (s.warpCool > 0 || this.phase === 'over') return;
    const lv = st.warp;
    for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2; this.part(s.x + Math.sin(a) * 10, s.y - Math.cos(a) * 10, -Math.sin(a) * 0.7, Math.cos(a) * 0.7, 12, lv ? '#C878F8' : '#58F8F8', 1, 0.9); }
    s.dest = lv ? this.safestSpot() : { x: Math.random() * this.W, y: Math.random() * this.H };
    s.jumpT = lv ? 12 : 18;
    s.warpCool = [45, 150, 90][Math.min(2, lv)];
    if (lv) { s.vx *= 0.3; s.vy *= 0.3; }
    s.holdB = 0;
    AstroSfx.play('warp');
  }
  arrive(s) {
    const lv = this.stats(s.p).warp;
    s.x = s.dest.x; s.y = s.dest.y; s.dest = null;
    if (lv) s.inv = Math.max(s.inv, 50);
    for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2; this.part(s.x, s.y, Math.sin(a) * 1.4, -Math.cos(a) * 1.4, 12, lv ? '#C878F8' : '#58F8F8', 1, 0.9); }
    if (lv >= 2) this.blast(s.x, s.y, 46, s.p, 2);
    AstroSfx.play('arrive');
  }
  // a shockwave: what's inside takes dmg (warp drive's arrival)
  blast(x, y, rad, p, dmg) {
    this.ring(x, y, rad, '#C878F8');
    for (const r of this.rocks.slice()) if (!r.dead && this.near(x, y, r.x, r.y).d < rad + r.r) this.hitRock(r, dmg, p, null);
    for (const sa of this.saucers) if (this.near(x, y, sa.x, sa.y).d < rad + sa.r) this.hitSaucer(sa, dmg, p);
    this.eshots = this.eshots.filter(e => this.near(x, y, e.x, e.y).d > rad);
  }
  // a BOMB: a ring that sweeps the whole screen
  bomb(s) {
    const kit = this.P[s.p].astro;
    if (!(kit.bombs > 0)) return;
    kit.bombs--;
    const id = ++this.bombId;
    this.waves.push({ x: s.x, y: s.y, r: 4, max: Math.hypot(this.W, this.H) * 0.6, col: '#FFFFFF', t: 0, bomb: id, p: s.p, speed: 7 });
    this.flash(8, '#F8F8F8'); this.shake(24);
    this.eshots = [];
    s.inv = Math.max(s.inv, 40);
    AstroSfx.play('bomb');
    this.popup(s.x, s.y - 14, 'BOMB!', '#F83800');
  }

  // hit a tank: the bubble, the shield, then a plate, then the tank
  hitShip(s, dmg, from) {
    if (!s || s.dead || s.jumpT || s.inv > 0 || this.phase === 'over') return false;
    if (s.pu.shield > 0) { AstroSfx.play('shieldHit'); return false; }
    this.perfect = false;
    if (s.shieldUp) {
      s.shieldUp = false; s.regenT = 0; s.inv = 40;
      AstroSfx.play('shieldHit');
      this.ring(s.x, s.y, 16, '#58F8F8');
      return true;
    }
    if (s.plates > 0) {
      s.plates = Math.max(0, s.plates - Math.max(1, dmg | 0));
      s.inv = 60; s.hurtT = 20;
      Sound.play('armor');
      this.shake(8);
      for (let k = 0; k < 8; k++) this.part(s.x, s.y, astroRand(-1.5, 1.5), astroRand(-1.5, 1.5), 20, ['#BCBCBC', '#6C6C6C', '#F8F8F8'][rnd(3)], 2);
      this.popup(s.x, s.y - 12, s.plates ? 'PLATE LOST' : 'LAST PLATE!', '#ADADAD');
      Input.rumble(s.p, 0.5, 150);
      return true;
    }
    this.killShip(s);
    return true;
  }
  killShip(s) {
    const p = this.P[s.p];
    s.dead = true; s.respawnT = ASTRO.respawn;
    this.boom(s.x, s.y, 2);
    // the tank in pieces
    const pal = PALS[Config.playerPal(s.p)] || PALS.p1;
    for (let k = 0; k < 14; k++) { const a = Math.random() * Math.PI * 2, v = astroRand(0.4, 1.8); this.part(s.x, s.y, Math.sin(a) * v + s.vx * 0.5, -Math.cos(a) * v + s.vy * 0.5, 40 + rnd(30), pal[1 + rnd(3)], 2, 0.985); }
    this.flash(4, '#F83800'); this.shake(22);
    Sound.play('playerDie');
    Input.rumble(s.p, 0.9, 400);
    if (Config.infiniteLives()) return;
    if (p.lives > 0) p.lives--;
    else p.out = true;
  }

  // ------------------------------------------------------------ shells
  updateShots() {
    for (const o of this.shots) {
      if (o.hom > 0) {
        const sp = Math.hypot(o.vx, o.vy) || 1, tg = this.targetNear(o.x, o.y, 110, o.vx / sp, o.vy / sp);
        if (tg) {
          const n = this.near(o.x, o.y, tg.x, tg.y), a = Math.atan2(o.vx, -o.vy), b = Math.atan2(n.dx, -n.dy), d = astroAngDiff(a, b);
          const na = a + Math.max(-o.hom, Math.min(o.hom, d));
          o.vx = Math.sin(na) * sp; o.vy = -Math.cos(na) * sp;
        }
      }
      o.x = astroWrapV(o.x + o.vx, this.W); o.y = astroWrapV(o.y + o.vy, this.H);
      o.life--;
    }
    this.shots = this.shots.filter(o => o.life > 0);
  }
  updateEshots(ts) {
    const ships = this.ships();
    for (const e of this.eshots) {
      e.t++;
      if (e.homing > 0 && ships.length) {
        let best = null, bd = 1e9;
        for (const s of ships) { const n = this.near(e.x, e.y, s.x, s.y); if (n.d < bd) { bd = n.d; best = n; } }
        const sp = Math.hypot(e.vx, e.vy) || 1, a = Math.atan2(e.vx, -e.vy), b = Math.atan2(best.dx, -best.dy), na = a + Math.max(-e.homing, Math.min(e.homing, astroAngDiff(a, b)));
        e.vx = Math.sin(na) * sp; e.vy = -Math.cos(na) * sp;
      }
      e.x = astroWrapV(e.x + e.vx * ts, this.W); e.y = astroWrapV(e.y + e.vy * ts, this.H);
      e.life -= ts;
    }
    this.eshots = this.eshots.filter(e => e.life > 0);
  }

  // ------------------------------------------------------------ rocks
  updateRocks(ts) {
    for (const r of this.rocks) {
      r.x = astroWrapV(r.x + r.vx * ts, this.W); r.y = astroWrapV(r.y + r.vy * ts, this.H);
      r.rot += r.spin * ts;
      if (r.flash > 0) r.flash--;
    }
  }
  hitRock(r, dmg, p, shot) {
    if (r.dead) return true;
    r.hp -= dmg;
    if (r.hp > 0) {
      r.flash = 5;
      AstroSfx.play('clang');
      for (let k = 0; k < 4; k++) this.part(shot ? shot.x : r.x, shot ? shot.y : r.y, astroRand(-1.2, 1.2), astroRand(-1.2, 1.2), 8, '#F8E858', 1);
      // knocked a little by the shell
      if (shot) { r.vx += shot.vx * 0.03 / (3 - r.size); r.vy += shot.vy * 0.03 / (3 - r.size); }
      return false;
    }
    this.breakRock(r, p, shot);
    return true;
  }
  breakRock(r, p, shot, noKids) {
    r.dead = true;
    const K = ASTRO_KINDS[r.kind], sz = r.size;
    if (p >= 0) {
      const pts = Math.round(ASTRO.rockScore[sz] * K.score);
      this.addScore(p, pts);
      if (pts >= 100 || sz === 0) this.popup(r.x, r.y, String(pts), '#F8F8F8');
    }
    // crystals, and now and then a pickup
    const salv = p >= 0 ? this.stats(p).salvage : 1, exp = [2, 1.1, 0.5][sz] * K.gems * salv;
    let n = Math.floor(exp) + (Math.random() < exp - Math.floor(exp) ? 1 : 0);
    if (r.kind === 'crystal' && sz === 0) { this.gem(r.x, r.y, 5); n = Math.max(0, n - 4); }
    for (let k = 0; k < n; k++) this.gem(r.x + astroRand(-r.r / 2, r.r / 2), r.y + astroRand(-r.r / 2, r.r / 2), 1);
    if (Math.random() < [0.07, 0.045, 0.03][sz]) this.drop(r.x, r.y);
    // the pieces
    if (sz < 2 && !noKids) {
      const kids = K.kids, base = Math.atan2(r.vx, -r.vy), sp0 = Math.max(0.35, Math.hypot(r.vx, r.vy));
      for (let k = 0; k < kids; k++) {
        const a = base + (k - (kids - 1) / 2) * astroRand(0.7, 1.3) + astroRand(-0.4, 0.4);
        const sp = Math.min(2.6, sp0 * astroRand(1.15, 1.5) + 0.15 * this.plan.speed);
        let vx = Math.sin(a) * sp, vy = -Math.cos(a) * sp;
        if (shot) { const sv = Math.hypot(shot.vx, shot.vy) || 1; vx += shot.vx / sv * 0.25; vy += shot.vy / sv * 0.25; }
        const c = this.spawnRock(r.x + Math.sin(a) * r.r * 0.4, r.y - Math.cos(a) * r.r * 0.4, sz + 1, vx, vy, { kind: r.kind });
        c.bomb = r.bomb;
      }
    }
    // magma: bursts into fire
    if (r.kind === 'magma') {
      const n = [8, 6, 4][sz], a0 = Math.random() * 6.28;
      for (let k = 0; k < n; k++) { const a = a0 + k / n * Math.PI * 2, sp = 1.1 + Math.random() * 0.4; this.enemyShot(r.x, r.y, Math.sin(a) * sp, -Math.cos(a) * sp, { r: 2, life: 34 + sz * 4, col: '#F89800' }); }
    }
    // debris in the rock's colours, a ring for the big ones
    const pal = K.pal, nd = [22, 14, 8][sz];
    for (let k = 0; k < nd; k++) {
      const a = Math.random() * Math.PI * 2, v = Math.random() * [1.6, 1.3, 1.0][sz];
      this.part(r.x + Math.sin(a) * r.r * 0.5, r.y - Math.cos(a) * r.r * 0.5, Math.sin(a) * v + r.vx * 0.5, -Math.cos(a) * v + r.vy * 0.5, 16 + rnd(22),
        r.kind === 'magma' && Math.random() < 0.5 ? pal[5 + rnd(3)] : r.kind === 'crystal' && Math.random() < 0.4 ? pal[5 + rnd(3)] : pal[rnd(4)], Math.random() < 0.4 ? 2 : 1, 0.96);
    }
    for (let k = 0; k < 5; k++) this.part(r.x, r.y, astroRand(-2, 2), astroRand(-2, 2), 6, '#FFFFFF', 1, 0.85);
    if (sz === 0) { this.ring(r.x, r.y, 22, '#ADADAD'); this.shake(5); }
    else if (sz === 1) this.shake(2);
    AstroSfx.play('rock' + sz);
  }

  // ------------------------------------------------------------ saucers
  newSaucer() {
    const w = this.wave, sk = Config.skill(), score = Math.max(...this.P.map(p => p.score));
    const small = Math.random() < (w < 4 ? 0.1 : Math.min(0.75, 0.15 + (w - 4) * 0.08) + (score > 10000 ? 0.15 : 0));
    this.spawnSaucer(Math.random() < 0.5 ? -12 : this.W + 12, astroRand(20, this.H - 20), small);
    this.saucerT = (Math.max(420, 1350 - w * 70) + rnd(300)) / Math.sqrt(sk.spawn || 1);
  }
  updateSaucers(ts) {
    const sk = Config.skill(), w = this.wave;
    this.saucers = this.saucers.filter(s => (s.hp > 0 ? !s.gone : this.saucerDown(s)));
    for (const s of this.saucers) {
      s.anim++;
      if (s.flash > 0) s.flash--;
      s.x += s.vx * ts; s.y = astroWrapV(s.y + s.vy * ts, this.H);
      if ((s.turnT -= ts) <= 0) { s.turnT = 40 + rnd(60); s.vy = [-1, 0, 1][rnd(3)] * Math.abs(s.vx) * 0.6; }
      if (s.x < -16 || s.x > this.W + 16) { if ((s.vx < 0 && s.x < -16) || (s.vx > 0 && s.x > this.W + 16)) s.gone = 1; }
      if (s.anim % (s.small ? 9 : 14) === 0) AstroSfx.play(s.small ? 'saucerS' : 'saucer', (s.anim / 9) & 1);
      if (this.phase === 'over') continue;
      if ((s.fireT -= ts) <= 0) {
        const sp = Math.min(2.8, (2.0 + w * 0.03) * (sk.shell || 1));
        let a = Math.random() * Math.PI * 2;
        const tg = this.ships();
        if (s.small && tg.length) {
          let best = null, bd = 1e9;
          for (const t of tg) { const n = this.near(s.x, s.y, t.x, t.y); if (n.d < bd) { bd = n.d; best = { n, t }; } }
          // lead the target a little, with an error that shrinks with the waves
          const tt = best.n.d / sp, dx = best.n.dx + best.t.vx * tt * 0.6, dy = best.n.dy + best.t.vy * tt * 0.6;
          const err = Math.max(0.04, 0.42 - w * 0.03) * (1.4 - 0.4 * Math.min(1.5, sk.aggr || 1));
          a = Math.atan2(dx, -dy) + astroRand(-err, err);
        } else if (tg.length && Math.random() < 0.3) {
          const n = this.near(s.x, s.y, tg[0].x, tg[0].y);
          a = Math.atan2(n.dx, -n.dy) + astroRand(-0.6, 0.6);
        }
        this.enemyShot(s.x, s.y, Math.sin(a) * sp, -Math.cos(a) * sp, { r: 1.5, life: 80, col: s.small ? '#F8F858' : '#F85898' });
        AstroSfx.play('eshot');
        s.fireT = (s.small ? Math.max(34, 66 - w * 2.5) : Math.max(50, 90 - w * 2)) / Math.sqrt(sk.fire || 1);
      }
    }
  }
  hitSaucer(s, dmg, p) {
    if (s.hp <= 0) return;
    s.hp -= dmg; s.flash = 4;
    if (s.hp <= 0) { s.killer = p; AstroSfx.play('clang'); }
    else AstroSfx.play('clang');
  }
  saucerDown(s) {
    const pts = s.small ? 1000 : 200;
    if (s.killer >= 0) { this.addScore(s.killer, pts); this.popup(s.x, s.y, String(pts), s.small ? '#F8D030' : '#FFFFFF'); }
    for (let k = 0; k < (s.small ? 5 : 3); k++) this.gem(s.x, s.y, 1);
    if (Math.random() < (s.small ? 0.5 : 0.3)) this.drop(s.x, s.y);
    this.boom(s.x, s.y, 2);
    return false;
  }

  // ------------------------------------------------------------ who hits what
  collide() {
    const ships = this.ships();
    // player shells
    for (const o of this.shots) {
      if (o.life <= 0) continue;
      for (const r of this.rocks) {
        if (r.dead || (o.hits && o.hits.includes(r))) continue;
        if (this.near(o.x, o.y, r.x, r.y).d > r.r * 0.92 + o.r) continue;
        const broke = this.hitRock(r, o.dmg, o.p, o);
        if (o.pierce > 0 && broke) { o.pierce--; (o.hits || (o.hits = [])).push(r); continue; }
        o.life = 0; break;
      }
      if (o.life <= 0) continue;
      for (const s of this.saucers) {
        if (s.hp <= 0 || this.near(o.x, o.y, s.x, s.y).d > s.r + o.r) continue;
        this.hitSaucer(s, o.dmg, o.p); o.life = 0; break;
      }
      if (o.life <= 0) continue;
      const b = this.boss;
      if (b && !b.dying && b.hit) {
        let hit = false;
        try { hit = b.hit(o.x, o.y, o.r, o.dmg); } catch (e) { console.error(e); }
        if (hit) {
          o.life = 0;
          for (let k = 0; k < 3; k++) this.part(o.x, o.y, astroRand(-1, 1), astroRand(-1, 1), 6, '#F8E858', 1);
          if (this.P[o.p]) this.addScore(o.p, 10);
        }
      }
    }
    this.rocks = this.rocks.filter(r => !r.dead);
    this.shots = this.shots.filter(o => o.life > 0);
    // the tanks against rocks, saucers, the boss, enemy shots
    for (const s of ships) {
      if (s.dead) continue;
      const bubble = s.pu.shield > 0;
      for (const r of this.rocks) {
        if (r.dead) continue;
        const n = this.near(s.x, s.y, r.x, r.y);
        if (n.d > r.r * 0.85 + s.r) continue;
        if (bubble) { this.hitRock(r, 9, s.p, null); this.bounce(s, n, 1.2); AstroSfx.play('shieldHit'); continue; }
        if (s.inv > 0) continue;
        if (this.hitShip(s, 1, r)) { if (!s.dead) this.bounce(s, n, 1.5); this.hitRock(r, 2, s.p, null); }
        if (s.dead) break;
      }
      if (s.dead) continue;
      for (const sa of this.saucers) {
        if (sa.hp <= 0) continue;
        const n = this.near(s.x, s.y, sa.x, sa.y);
        if (n.d > sa.r + s.r) continue;
        if (bubble || s.inv <= 0) { this.hitSaucer(sa, 3, s.p); if (!bubble) this.hitShip(s, 1, sa); }
      }
      const b = this.boss;
      if (!s.dead && b && !b.dying && b.touches) {
        let t = false;
        try { t = b.touches(s.x, s.y, s.r); } catch (e) { t = false; }
        if (t) {
          const n = this.near(b.x, b.y, s.x, s.y), d = n.d || 1;
          s.vx += n.dx / d * 1.6; s.vy += n.dy / d * 1.6;
          if (!bubble) this.hitShip(s, 1, b);
        }
      }
      if (s.dead) continue;
      for (const e of this.eshots) {
        if (e.life <= 0 || this.near(s.x, s.y, e.x, e.y).d > s.r + e.r - 0.5) continue;
        if (bubble) { e.life = 0; AstroSfx.play('shieldHit'); continue; }
        if (s.inv > 0) continue;
        e.life = 0;
        this.hitShip(s, e.dmg, e);
        if (s.dead) break;
      }
    }
    this.rocks = this.rocks.filter(r => !r.dead);
    this.eshots = this.eshots.filter(e => e.life > 0);
  }
  bounce(s, n, k) {
    const d = n.d || 1;
    s.vx = -n.dx / d * k + s.vx * 0.3; s.vy = -n.dy / d * k + s.vy * 0.3;
  }

  // ------------------------------------------------------------ crystals and pickups
  updateLoot() {
    const ships = this.ships(), clear = this.phase === 'clear' && this.t > 30;
    for (const g of this.gems) {
      g.vx *= 0.975; g.vy *= 0.975; g.life--;
      let best = null, bd = 1e9;
      for (const s of ships) {
        const n = this.near(g.x, g.y, s.x, s.y);
        if (n.d < bd) { bd = n.d; best = { n, s }; }
      }
      if (best) {
        const mag = clear ? 999 : Math.max(16, this.stats(best.s.p).magnet), n = best.n;
        if (n.d < mag) {
          const pull = clear ? 0.35 : 0.08 + 0.12 * (1 - n.d / mag);
          g.vx += n.dx / (n.d || 1) * pull; g.vy += n.dy / (n.d || 1) * pull;
          const sp = Math.hypot(g.vx, g.vy), mx = clear ? 5 : 3.5;
          if (sp > mx) { g.vx *= mx / sp; g.vy *= mx / sp; }
          if (clear) g.life = Math.max(g.life, 60);
        }
        if (n.d < best.s.r + 6) {
          g.life = -1;
          const p = this.P[best.s.p];
          p.astro.gems += g.v;
          AstroSfx.play('gem', g.v > 1 ? 1 : this.clock & 1);
          this.part(g.x, g.y, 0, -0.5, 10, g.v > 1 ? '#F878F8' : '#58F8F8', 1, 0.9);
          if (g.v > 1) this.popup(g.x, g.y - 6, '+' + g.v, '#F878F8');
        }
      } else if (clear) g.life = Math.min(g.life, 1);   // nobody to take it
      g.x = astroWrapV(g.x + g.vx, this.W); g.y = astroWrapV(g.y + g.vy, this.H);
    }
    this.gems = this.gems.filter(g => g.life > 0);
    for (const u of this.pickups) {
      if (clear && ships.length) {
        const n = this.near(u.x, u.y, ships[0].x, ships[0].y), d = n.d || 1;
        u.vx = n.dx / d * 3; u.vy = n.dy / d * 3; u.life = Math.max(u.life, 30);
      }
      u.x = astroWrapV(u.x + u.vx, this.W); u.y = astroWrapV(u.y + u.vy, this.H);
      u.life--;
      for (const s of ships) {
        if (this.near(u.x, u.y, s.x, s.y).d > s.r + 8) continue;
        u.life = 0;
        this.takePickup(s, u.k);
        break;
      }
    }
    this.pickups = this.pickups.filter(u => u.life > 0);
  }
  takePickup(s, k) {
    const d = ASTRO_PICKUPS[k], p = this.P[s.p];
    if (k === 'shield') s.pu.shield = ASTRO.puTime;
    else if (k === 'rapid') s.pu.rapid = ASTRO.puTime;
    else if (k === 'triple') s.pu.triple = ASTRO.puTime;
    else if (k === 'slow') this.slowT = ASTRO.slowTime;
    else if (k === 'bomb') p.astro.bombs = Math.min(9, (p.astro.bombs | 0) + 1);
    else if (k === 'life') { if (!Config.infiniteLives()) p.lives++; Sound.play('life'); }
    this.popup(s.x, s.y - 12, d.name, d.col);
    this.ring(s.x, s.y, 18, d.col);
    Sound.play('pickup');
  }

  // ------------------------------------------------------------ particles, rings, the pulse
  updateFx() {
    for (const q of this.parts) { q.x += q.vx; q.y += q.vy; q.vx *= q.drag; q.vy *= q.drag; q.life--; }
    this.parts = this.parts.filter(q => q.life > 0);
    for (const f of this.fx) if (++f.t >= f.step) { f.t = 0; f.i++; }
    this.fx = this.fx.filter(f => f.i < f.frames.length);
    for (const p of this.pops) p.t++;
    this.pops = this.pops.filter(p => p.t < 50);
    for (const w of this.waves) {
      w.t++;
      w.r += w.speed || Math.max(1, (w.max - w.r) * 0.18);
      if (w.bomb) {
        // the bomb's ring: everything it passes over
        for (const r of this.rocks) {
          if (r.dead || r.bomb === w.bomb) continue;
          if (this.near(w.x, w.y, r.x, r.y).d >= w.r + r.r) continue;
          // the big ones split (their pieces are spared by this ring), the rest are gone for good
          r.bomb = w.bomb;
          if (r.size === 0) this.hitRock(r, 3, w.p, null); else this.breakRock(r, w.p, null, true);
        }
        for (const s of this.saucers) if (s.hp > 0 && this.near(w.x, w.y, s.x, s.y).d < w.r) this.hitSaucer(s, 9, w.p);
        const b = this.boss;
        if (b && !b.dying && !w.hitBoss && b.hit && this.near(w.x, w.y, b.x, b.y).d < w.r + (b.r || 20)) {
          w.hitBoss = true;
          try { b.hit(b.x, b.y, (b.r || 20) + 4, Math.max(4, Math.round((b.maxHp || 40) * 0.08))); } catch (e) { console.error(e); }
        }
        this.rocks = this.rocks.filter(r => !r.dead);
      }
    }
    this.waves = this.waves.filter(w => w.r < w.max);
  }
  heartbeat() {
    if (this.phase !== 'play' || this.over) return;
    if (--this.beatT > 0) return;
    const frac = this.rocks.length ? Math.min(1, this.rockMass() / this.mass0) : 0.35;
    this.beatT = Math.round(14 + 44 * frac);
    AstroSfx.beat(this.beatK);
    this.beatK ^= 1;
    this.pulse = 6;
  }

  // ------------------------------------------------------------ drawing
  render(ctx) {
    ctx.fillStyle = COL.bg;
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
    ctx.save();
    ctx.translate(FX, FY);
    ctx.beginPath(); ctx.rect(0, 0, this.W, this.H); ctx.clip();
    const sky = astroSky(this.W, this.H);
    let ox = 0, oy = 0;
    if (this.shakeT > 0) { ox = Math.round(astroRand(-1, 1) * this.shakeMag); oy = Math.round(astroRand(-1, 1) * this.shakeMag); }
    ctx.drawImage(sky.c, 0, 0);
    ctx.save();
    ctx.translate(ox, oy);
    if (ox || oy) { ctx.drawImage(sky.c, ox > 0 ? -this.W : this.W, 0); ctx.drawImage(sky.c, 0, oy > 0 ? -this.H : this.H); }
    for (const s of sky.tw) {
      const ph = (this.clock + s.ph) % 120;
      if (ph < 30) { ctx.fillStyle = ph < 10 || ph > 20 ? '#9C9CBC' : '#FFFFFF'; ctx.fillRect(s.x, s.y, 1, 1); if (s.big && ph >= 10 && ph <= 20) { ctx.fillRect(s.x - 1, s.y, 3, 1); ctx.fillRect(s.x, s.y - 1, 1, 3); } }
    }
    this.drawWorld(ctx);
    ctx.restore();
    this.drawOverlay(ctx);
    if (this.flashT > 0) { ctx.globalAlpha = Math.min(0.7, this.flashT / 10); ctx.fillStyle = this.flashCol; ctx.fillRect(0, 0, this.W, this.H); ctx.globalAlpha = 1; }
    ctx.restore();
    this.drawBorder(ctx);
  }

  drawWorld(ctx) {
    const clk = this.clock;
    // crystals and pickups
    for (const g of this.gems) {
      if (g.life < 120 && (g.life >> 2) & 1) continue;
      const img = astroGemArt(g.v > 1, ((clk + g.ph) >> 3) & 1);
      this.wrapDraw(g.x, g.y, 4, (x, y) => ctx.drawImage(img, Math.round(x - img.width / 2), Math.round(y - img.height / 2)));
    }
    for (const u of this.pickups) {
      if (u.life < 150 && (u.life >> 3) & 1) continue;
      const img = Sprites.powerups[PU[ASTRO_PICKUPS[u.k].pu]];
      this.wrapDraw(u.x, u.y, 9, (x, y) => ctx.drawImage(img, Math.round(x) - 8, Math.round(y) - 8));
    }
    // rocks
    for (const r of this.rocks) {
      const f = ((Math.floor(r.rot / (Math.PI * 2) * ASTRO_ROCK_FRAMES) % ASTRO_ROCK_FRAMES) + ASTRO_ROCK_FRAMES) % ASTRO_ROCK_FRAMES;
      const img = astroRockArt(r.kind, r.r, r.v, f, r.flash > 0 ? 1 : r.kind === 'magma' && ((clk + r.v * 7) >> 4) & 1 ? 2 : 0);
      this.wrapDraw(r.x, r.y, r.r + 2, (x, y) => ctx.drawImage(img, Math.round(x - img.width / 2), Math.round(y - img.height / 2)));
    }
    // saucers
    for (const s of this.saucers) {
      const img = s.flash > 0 && (s.flash & 2) ? Sprites.outline(astroSaucerArt(s.small, 0), '#FFFFFF') : astroSaucerArt(s.small, (s.anim >> 3) % 4);
      this.wrapDraw(s.x, s.y, 14, (x, y) => ctx.drawImage(img, Math.round(x - img.width / 2), Math.round(y - img.height / 2)));
    }
    // the boss (it draws its own wrapped copies); while it's on its way, where it will be
    if (this.boss) { try { this.boss.draw(ctx, this); } catch (e) { console.error(e); this.boss.dead = true; } }
    // the tanks
    this.fleet.forEach(s => { if (s) this.drawShip(ctx, s); });
    // shells
    for (const o of this.shots) {
      const st = this.stats(o.p), col = o.drone ? '#BCBCBC' : st.pierce ? '#58F8F8' : st.homing ? '#F878F8' : '#F8F8F8';
      ctx.fillStyle = col;
      ctx.fillRect(Math.round(o.x) - 1, Math.round(o.y) - 1, 2, 2);
      ctx.fillStyle = o.drone ? '#6C6C6C' : '#F8D030';
      ctx.fillRect(Math.round(o.x - o.vx * 0.5), Math.round(o.y - o.vy * 0.5), 1, 1);
    }
    for (const e of this.eshots) {
      const r = Math.max(1, Math.round(e.r)), x = Math.round(e.x), y = Math.round(e.y);
      ctx.fillStyle = (e.t >> 2) & 1 ? '#FFFFFF' : e.col;
      ctx.fillRect(x - r + 1, y - r, r * 2 - 2 > 0 ? r * 2 - 2 : 1, r * 2);
      ctx.fillRect(x - r, y - r + 1, r * 2, r * 2 - 2 > 0 ? r * 2 - 2 : 1);
      if (r >= 2) { ctx.fillStyle = '#FFFFFF'; ctx.fillRect(x - 1, y - 1, 1, 1); }
    }
    // rings, sparks, debris, the NES explosions
    for (const w of this.waves) {
      const n = Math.max(12, Math.round(w.r * 2.2)), col = w.bomb ? ((w.t >> 1) & 1 ? '#FFFFFF' : '#F8D030') : w.col;
      ctx.fillStyle = col;
      for (let k = 0; k < n; k++) { const a = k / n * Math.PI * 2; ctx.fillRect(Math.round(w.x + Math.sin(a) * w.r), Math.round(w.y - Math.cos(a) * w.r), w.bomb ? 2 : 1, w.bomb ? 2 : 1); }
    }
    for (const q of this.parts) {
      if (q.life < q.max * 0.3 && (q.life & 1)) continue;
      ctx.fillStyle = q.col;
      const sz = q.sz > 1 && q.life < q.max * 0.5 ? 1 : q.sz;
      ctx.fillRect(Math.round(astroWrapV(q.x, this.W)), Math.round(astroWrapV(q.y, this.H)), sz, sz);
    }
    for (const f of this.fx) { const img = f.frames[f.i]; ctx.drawImage(img, Math.round(f.x - img.width / 2), Math.round(f.y - img.height / 2)); }
    for (const p of this.pops) {
      if (p.t > 38 && (p.t & 2)) continue;
      const y = Math.round(p.y - p.t * 0.4);
      if (/^[0-9+]+$/.test(p.text) && p.text.length <= 5) { const img = Sprites.mini(p.text.replace('+', '')); ctx.drawImage(img, Math.round(p.x - img.width / 2), y); }
      else Font.drawCenter(ctx, p.text, p.x, y, p.col);
    }
  }

  drawShip(ctx, s) {
    const p = this.P[s.p];
    if (s.dead) {
      // the next tank on its way
      if (!p.out && this.phase !== 'over' && s.respawnT < 40 && (this.clock >> 2) & 1) {
        const sp = this.spawnPoint(s.p);
        ctx.fillStyle = '#58F8F8';
        for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2 + this.clock * 0.1; ctx.fillRect(Math.round(sp.x + Math.sin(a) * 10), Math.round(sp.y - Math.cos(a) * 10), 1, 1); }
      }
      return;
    }
    if (s.jumpT) return;
    if (s.inv > 0 && s.inv < ASTRO.inv - 10 && ((s.inv >> 2) & 1) && !s.hurtT) return;
    const st = this.stats(s.p), pal = Config.playerPal(s.p), img = astroShipImg(p.astro, s, pal, (s.anim >> 2) & 1, s.ang);
    const sx = Math.sin(s.ang), sy = -Math.cos(s.ang), clk = this.clock;
    this.wrapDraw(s.x, s.y, 16, (x, y) => {
      // the exhaust flame
      if (s.thrust) {
        const len = 3 + st.engineLv + ((clk >> 1) & 1) * 2 + rnd(2), blue = st.engineLv >= 2;
        const cols = blue ? ['#FFFFFF', '#B8F8F8', '#58D8F8', '#3C7CFC'] : ['#FFFFFF', '#F8E858', '#F89800', '#F83800'];
        for (let k = 0; k < len; k++) {
          const d = 9 + k, c = cols[Math.min(3, Math.floor(k * 4 / len))], w = k < len / 2 ? 2 : 1;
          ctx.fillStyle = c;
          ctx.fillRect(Math.round(x - sx * d - (w - 1) * 0.5), Math.round(y - sy * d - (w - 1) * 0.5), w, w);
        }
      }
      ctx.drawImage(img, Math.round(x) - (img.width >> 1), Math.round(y) - (img.height >> 1));
      if (s.hurtT > 0 && (s.hurtT & 2)) ctx.drawImage(Sprites.outline(img, '#F8F8F8'), Math.round(x) - (img.width >> 1) - 1, Math.round(y) - (img.height >> 1) - 1);
      // the bubble (pickup), the shield generator's charge, the drones, a bomb charging
      if (s.pu.shield > 0 && (s.pu.shield > 120 || (clk >> 2) & 1)) ctx.drawImage(Sprites.shield[(clk >> 1) & 1], Math.round(x) - 8, Math.round(y) - 8);
      if (s.shieldUp) {
        ctx.fillStyle = (clk >> 3) & 1 ? '#58F8F8' : '#3C88C8';
        for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2 + clk * 0.06; ctx.fillRect(Math.round(x + Math.sin(a) * 12), Math.round(y - Math.cos(a) * 12), 1, 1); }
      }
      for (let k = 0; k < st.drones; k++) {
        const a = s.droneA + k * Math.PI, dx = Math.round(x + Math.sin(a) * 15), dy = Math.round(y - Math.cos(a) * 15);
        ctx.fillStyle = '#6C6C6C'; ctx.fillRect(dx - 2, dy - 1, 4, 3); ctx.fillRect(dx - 1, dy - 2, 2, 5);
        ctx.fillStyle = '#BCBCBC'; ctx.fillRect(dx - 1, dy - 1, 2, 2);
        ctx.fillStyle = (clk >> 3) & 1 ? '#F83800' : '#58F858'; ctx.fillRect(dx, dy, 1, 1);
      }
      if (s.holdB > 4) {
        const n = Math.min(12, Math.round(s.holdB / ASTRO.bombHold * 12));
        ctx.fillStyle = '#F83800';
        for (let k = 0; k < n; k++) { const a = k / 12 * Math.PI * 2; ctx.fillRect(Math.round(x + Math.sin(a) * 14), Math.round(y - Math.cos(a) * 14), 2, 2); }
      }
    });
    // two players: whose is whose
    if (this.P.length > 1 && this.frame < 180) Font.drawCenter(ctx, ROMAN[s.p], s.x, s.y - 20, (PALS[pal] || PALS.p1)[1]);
  }

  // banners, the warning, the boss bar, game over (over the field, not shaken)
  drawOverlay(ctx) {
    const W = this.W, H = this.H, clk = this.clock;
    if (this.slowT > 0) {
      ctx.fillStyle = (this.slowT > 90 || (clk >> 3) & 1) ? '#C878F8' : '#5C2C8C';
      ctx.fillRect(0, 0, W, 1); ctx.fillRect(0, H - 1, W, 1); ctx.fillRect(0, 0, 1, H); ctx.fillRect(W - 1, 0, 1, H);
    }
    if (this.phase === 'warn') {
      const t = this.t;
      // hazard stripes, the word, the name
      for (const y of [H / 2 - 30, H / 2 + 22]) {
        ctx.fillStyle = '#000000'; ctx.fillRect(0, y, W, 8);
        ctx.fillStyle = '#F8B800';
        for (let x = -16 + ((t >> 1) % 16); x < W; x += 16) for (let k = 0; k < 8; k++) ctx.fillRect(x + k, y + k, 8, 1);
      }
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, H / 2 - 20, W, 40);
      if ((t >> 3) & 1 || t > ASTRO.warn - 30) Font.big(ctx, 'WARNING', (W - Font.bigWidth('WARNING', 3)) >> 1, H / 2 - 16, 3, '#F83800');
      const name = (this.bossDef && this.bossDef.name) || 'BOSS';
      Font.drawCenter(ctx, name.slice(0, Math.floor(W / 8)), W / 2, H / 2 + 9, (t >> 2) & 1 ? '#F8F8F8' : '#F8B800');
      if (this.loop > 0) Font.drawCenter(ctx, 'MK ' + ROMAN[Math.min(3, this.loop)], W / 2, H / 2 + 34, '#F8B800');
    }
    // where the boss comes in, while the warning runs; an arrow when it's off the field
    const bn0 = this.bossNext;
    if (this.phase === 'warn' && bn0 && (clk >> 2) & 1) {
      const r = Math.max(10, (bn0.r || 20) * (1 + (ASTRO.warn - this.t) / ASTRO.warn)), n = Math.round(r * 2);
      ctx.fillStyle = '#F83800';
      for (let k = 0; k < n; k++) { const a = k / n * Math.PI * 2; this.wrapDraw(bn0.x + Math.sin(a) * r, bn0.y - Math.cos(a) * r, 0, (x, y) => ctx.fillRect(Math.round(x), Math.round(y), 1, 1)); }
    }
    const b = this.boss;
    if (b && !b.dying && (b.x < -4 || b.y < -4 || b.x > W + 4 || b.y > H + 4) && (clk >> 3) & 1) {
      const ax = Math.max(6, Math.min(W - 6, b.x)), ay = Math.max(22, Math.min(H - 6, b.y)), a = Math.atan2(b.x - ax, -(b.y - ay));
      ctx.fillStyle = '#F83800';
      for (let k = 0; k < 5; k++) for (let j = -k; j <= k; j++) ctx.fillRect(Math.round(ax + Math.sin(a) * (2 - k) + Math.cos(a) * j * 0.8), Math.round(ay - Math.cos(a) * (2 - k) + Math.sin(a) * j * 0.8), 1, 1);
    }
    if (b && b.maxHp) {
      const w = Math.min(W - 24, 170), x = (W - w) >> 1, frac = Math.max(0, Math.min(1, b.hp / b.maxHp));
      Font.drawCenter(ctx, String(b.name || '').slice(0, Math.floor(W / 8)), W / 2 + 1, 4, '#000000');
      Font.drawCenter(ctx, String(b.name || '').slice(0, Math.floor(W / 8)), W / 2, 3, '#F8F8F8');
      ctx.fillStyle = '#000000'; ctx.fillRect(x - 1, 12, w + 2, 6);
      ctx.fillStyle = '#3C1C1C'; ctx.fillRect(x, 13, w, 4);
      ctx.fillStyle = frac < 0.25 && (clk >> 2) & 1 ? '#F8F8F8' : frac < 0.5 ? '#F87800' : '#F83800';
      ctx.fillRect(x, 13, Math.round(w * frac), 4);
      ctx.fillStyle = '#F8B8A8'; ctx.fillRect(x, 13, Math.round(w * frac), 1);
    }
    const bn = this.banner;
    if (bn) {
      const y = Math.round(H * 0.3), big = Font.bigWidth(bn.text, 2) <= W - 8;
      if (bn.t > 120 && (bn.t >> 2) & 1) { /* fading out */ } else {
        if (big) Font.big(ctx, bn.text, (W - Font.bigWidth(bn.text, 2)) >> 1, y, 2, bn.clear ? '#58D854' : Sprites.bricks(ctx));
        else Font.drawCenter(ctx, bn.text, W / 2, y + 4, '#F8F8F8');
        if (bn.sub) Font.drawCenter(ctx, bn.sub.slice(0, Math.floor(W / 8)), W / 2, y + 20, bn.clear ? '#F8D030' : '#58F8F8');
      }
    }
    if (this.phase === 'over') {
      const t = this.t, y = Math.max(0, Math.round(H / 2 - 14 - Math.max(0, 40 - t) * 2));
      Font.big(ctx, 'GAME', (W - Font.bigWidth('GAME', 3)) >> 1, y - 12, 3, Sprites.bricks(ctx));
      Font.big(ctx, 'OVER', (W - Font.bigWidth('OVER', 3)) >> 1, y + 14, 3, Sprites.bricks(ctx));
    }
    // the next tank waits for the middle to clear
    this.fleet.forEach((s, i) => {
      if (s && s.dead && !this.P[i].out && this.phase !== 'over' && s.respawnT <= 0 && (clk >> 4) & 1) Font.drawCenter(ctx, this.P.length > 1 ? ROMAN[i] + ' WAITING' : 'WAITING', W / 2, H - 14 - i * 10, '#ADADAD');
    });
  }

  // round the field: the scores and the wave above, the keys below, each player's tank, crystals, bombs at the side
  drawBorder(ctx) {
    const P = this.P, H = HUD_X, two = P.length > 1;
    const sc = n => String(Math.min(9999999, n)).padStart(6, '0');
    Font.draw(ctx, (two ? 'I ' : '') + sc(P[0].score), FX, 0, COL.black);
    if (two) Font.drawRight(ctx, 'II ' + sc(P[1].score), FX + VIEW_W, 0, COL.black);
    const mid = 'WAVE ' + this.wave + (VIEW_W >= (two ? 360 : 260) ? '  HI ' + sc(Math.max(this.hi, P.reduce((a, p) => a + p.score, 0))) : '');
    Font.drawCenter(ctx, mid, FX + VIEW_W / 2 + (two ? 0 : 24), 0, '#3C3C3C');
    const keys = VIEW_W >= 300 ? 'FIRE:SHOOT  B:JUMP  HOLD B:BOMB  DOWN:BRAKE' : VIEW_W >= 232 ? 'FIRE:SHOOT B:JUMP HOLD B:BOMB' : 'B:JUMP HOLD B:BOMB';
    Font.drawCenter(ctx, keys, FX + VIEW_W / 2, FY + VIEW_H, '#3C3C3C');
    Stage.prototype.renderSkillTag.call(null, ctx, H);
    P.forEach((p, i) => {
      const y = 24 + i * 70, kit = p.astro, s = this.fleet[i];
      ctx.drawImage(Sprites.playerIcon(Config.playerPal(i)), H, y);
      Font.draw(ctx, Config.infiniteLives() ? '~' : String(Math.min(99, p.lives)), H + 9, y, p.out ? '#7C7C7C' : COL.black);
      ctx.drawImage(astroGemArt(true, 0), H + 1, y + 11);
      const g = String(Math.min(999, kit.gems | 0));
      ctx.drawImage(Sprites.mini(g), H + 22 - g.length * 5, y + 11);
      // bombs in the rack, plates on the tank
      for (let k = 0; k < Math.min(4, kit.bombs | 0); k++) { ctx.fillStyle = '#000000'; ctx.fillRect(H + k * 6, y + 21, 5, 5); ctx.fillStyle = '#F83800'; ctx.fillRect(H + k * 6 + 1, y + 22, 3, 3); }
      if ((kit.bombs | 0) > 4) Font.draw(ctx, '+', H + 18, y + 20, COL.black);
      if (s) for (let k = 0; k < s.plates; k++) { ctx.fillStyle = '#3C3C3C'; ctx.fillRect(H + k * 6, y + 29, 5, 3); ctx.fillStyle = '#BCBCBC'; ctx.fillRect(H + k * 6, y + 29, 5, 1); }
      if (s && s.shieldUp) { ctx.fillStyle = '#005860'; ctx.fillRect(H, y + 35, 22, 2); }
      // pickups running
      if (s) ['shield', 'rapid', 'triple'].forEach((k, j) => {
        if (s.pu[k] > 0 && (s.pu[k] > 120 || (this.clock >> 3) & 1)) { ctx.fillStyle = ASTRO_PICKUPS[k].col; ctx.fillRect(H + j * 8, y + 40, 6, 6); ctx.fillStyle = '#000000'; ctx.fillRect(H + j * 8, y + 46, Math.round(6 * s.pu[k] / ASTRO.puTime), 1); }
      });
    });
  }
}

// a ship's numbers without astroup.js (it replaces this with astroStats)
function astroBaseStats() {
  return { guns: 0, cool: ASTRO.cool, hold: ASTRO.hold, maxShots: ASTRO.maxShots, shotSpeed: ASTRO.shotSpeed, shotLife: ASTRO.shotLife, pierce: 0, rear: 0, homing: 0,
    thrust: ASTRO.thrust, top: ASTRO.top, engineLv: 0, turn: ASTRO.turn, turnAcc: ASTRO.turnAcc, brake: ASTRO.brake, reverse: false, plates: 0, regen: 0, magnet: 0,
    bombs: 0, warp: 0, drones: 0, salvage: 1 };
}

// ================================================================= into the game
// the game's own screens of this mode (the hangar adds itself in astroup.js): [update, draw, mouse/touch]
const ASTRO_SCREENS = { astroOver: ['updateAstroOver', 'renderAstroOver', 'astroOverPointer'] };

Object.assign(Game, {
  // the field: the window's shape, at least 15 rows high (rocks need room)
  astroLayout() {
    const wrap = document.getElementById('wrap'), aspect = wrap && wrap.clientHeight ? wrap.clientWidth / wrap.clientHeight : 16 / 10;
    let [vc, vr] = this.desiredField();
    const rows = Math.max(15, Math.min(24, vr | 0));
    let cols = Math.max(vc | 0, Math.round((aspect * (rows * 16 + 16) - 48) / 16));
    cols = Math.max(18, Math.min(40, cols));
    setFieldSize(cols, rows);
  },

  // ASTRO TANKS picked on the title: the first wave
  astroEnter() {
    const n = Math.max(1, Math.min(2, (this.players || []).filter(p => !p.bot).length || 1));
    this.astroStart(n);
  },

  astroStart(n) {
    this.mode = 'astro';
    if (!this.players || this.players.length !== n || this.players.some(p => p.bot)) { this.players = []; for (let i = 0; i < n; i++) this.players.push(newPlayer(i)); }
    if (Net.role !== 'host') Input.remote = {};
    Input.numPlayers = n; this.twoP = n > 1;
    const sk = Config.skill(), extra = Math.max(0, Math.min(2, (sk.lives | 0) - 1));
    for (const p of this.players) {
      p.score = 0; p.out = false; p.lives = 2 + extra; p.astroNext = ASTRO.extraEvery;
      p.astro = typeof astroNewKit === 'function' ? astroNewKit() : { up: {}, gems: 0, bombs: 0 };
    }
    this.astroLayout();
    const A = new AstroWorld(this);
    this.astro = A; this.stage = A;
    A.startWave(1);
    this.paused = false; this.pauseCtl = false;
    this.openH = SCREEN_H / 2;
    this.setState('play');
    Sound.play('start');
    return A;
  },

  // back from the hangar: the next wave
  astroNextWave() {
    const A = this.astro;
    if (!A) { this.toTitle(); return; }
    this.stage = A;
    A.startWave(A.wave + 1);
    this.paused = false; this.pauseCtl = false;
    this.openH = SCREEN_H / 2;
    this.setState('play');
  },

  astroGameOver() {
    const A = this.astro;
    this.astroRes = {
      wave: A.wave, scores: this.players.map(p => p.score), total: this.players.reduce((a, p) => a + p.score, 0),
      hi: A.hi, bestWave: A.bestWave, newBest: !!A.newBest, newWave: !!A.newWave,
    };
    if (this.players.some(p => p.score > this.hi)) this.saveHi();
    if (typeof AutoSkill !== 'undefined' && AutoSkill.event) AutoSkill.event('gameOver');
    Sound.play(A.newBest ? 'bonus' : 'gameover');
    this.setState('astroOver');
  },

  updateAstroOver() {
    if (this.t > 40 && (Input.menu().ok || Input.menu().back || this.t > 1800)) { this.stage = null; this.astro = null; this.toTitle(); this.titleY = 0; }
  },
  astroOverPointer() { if (this.t > 40) { this.stage = null; this.astro = null; this.toTitle(); this.titleY = 0; } },
  renderAstroOver(ctx) {
    const r = this.astroRes || { wave: 0, scores: [0], total: 0, hi: 0, bestWave: 0 }, t = this.t;
    ctx.fillStyle = COL.black; ctx.fillRect(0, 0, SW, SH);
    const sky = ASTRO_SKY.c;
    if (sky) { ctx.save(); ctx.translate(-menuOX(), -menuOY()); ctx.globalAlpha = 0.6; ctx.drawImage(sky, 0, 0, SCREEN_W, SCREEN_H); ctx.restore(); }
    Font.big(ctx, 'GAME OVER', (SW - Font.bigWidth('GAME OVER', 3)) >> 1, 14, 3, Sprites.bricks(ctx));
    Font.drawCenter(ctx, 'ASTRO TANKS', SW / 2, 44, COL.lgrey);
    Font.drawCenter(ctx, 'REACHED WAVE ' + r.wave, SW / 2, 64, '#58F8F8');
    r.scores.forEach((s, i) => {
      const y = 86 + i * 14;
      ctx.drawImage(Sprites.playerIcon(Config.playerPal(i)), 52, y);
      Font.draw(ctx, r.scores.length > 1 ? ROMAN[i] + '-PLAYER' : 'SCORE', 64, y, COL.white);
      Font.drawRight(ctx, String(s), 204, y, COL.gold);
    });
    let y = 86 + r.scores.length * 14 + 4;
    if (r.scores.length > 1) { Font.draw(ctx, 'TEAM', 64, y, COL.lgrey); Font.drawRight(ctx, String(r.total), 204, y, COL.white); y += 14; }
    y += 8;
    Font.draw(ctx, 'BEST SCORE', 52, y, COL.lgrey); Font.drawRight(ctx, String(r.hi), 204, y, COL.white);
    Font.draw(ctx, 'BEST WAVE', 52, y + 12, COL.lgrey); Font.drawRight(ctx, String(r.bestWave), 204, y + 12, COL.white);
    if ((r.newBest || r.newWave) && (t >> 4) & 1) Font.drawCenter(ctx, r.newBest ? 'NEW HIGH SCORE!' : 'NEW BEST WAVE!', SW / 2, y + 32, '#F8D030');
    if (t > 40 && (t >> 5) & 1) Font.drawCenter(ctx, 'PRESS ENTER', SW / 2, 206, COL.red);
  },
});

// ================================================================= hooks into the game
(() => {
  const G = Game;
  const startGame = G.startGame;
  G.startGame = function (n) {
    if (Config.get('gameMode') === 'astro' && n > 2) { this.toast('ASTRO TANKS: 1-2 PLAYERS'); Sound.play('steel'); return; }
    return startGame.apply(this, arguments);
  };
  // the curtain (after the mode's title screen) hands over to the first wave
  const newGame = G.newGame;
  G.newGame = function () {
    newGame.apply(this, arguments);
    if (this.mode === 'astro' && this.curtain) this.curtain.astro = true;
  };
  const updateCurtain = G.updateCurtain;
  G.updateCurtain = function () {
    const c = this.curtain;
    if (c && c.astro && c.phase === 'show') { c.astro = false; this.astroEnter(); return; }
    updateCurtain.call(this);
  };
  const renderCurtain = G.renderCurtain;
  G.renderCurtain = function (ctx) {
    const c = this.curtain;
    if (c && c.astro && c.phase === 'show') { ctx.fillStyle = COL.bg; ctx.fillRect(0, 0, SCREEN_W, SCREEN_H); return; }
    renderCurtain.call(this, ctx);
  };
  // a wave cleared: the hangar; everyone out: game over (once the frame is done)
  const updatePlay = G.updatePlay;
  G.updatePlay = function () {
    updatePlay.apply(this, arguments);
    const A = this.stage;
    if (this.state !== 'play' || !A || !A.astro || this.paused) return;
    if (A.overDone) { A.overDone = false; this.astroGameOver(); }
    else if (A.clearDone) {
      A.clearDone = false;
      if (typeof this.astroToHangar === 'function') this.astroToHangar(); else this.astroNextWave();
    }
  };
  // RESTART ROUND: the wave from its start
  const restartRound = G.restartRound;
  G.restartRound = function () {
    if (this.mode === 'astro' && this.stage && this.stage.astro) { this.paused = false; this.stage.restartWave(); this.openH = SCREEN_H / 2; Sound.play('start'); return; }
    restartRound.apply(this, arguments);
  };
  // QUIT keeps the best score and wave
  const pauseAction = G.pauseAction;
  G.pauseAction = function (a) {
    if (a === 'QUIT' && this.mode === 'astro' && this.stage && this.stage.astro && !this.stage.over) this.stage.record();
    return pauseAction.apply(this, arguments);
  };
  // the mode's screens in the game's dispatch
  const update = G.update, renderState = G.renderState, pointer = G.pointer;
  G.update = function () {
    const f = ASTRO_SCREENS[this.state];
    if (f && Net.role !== 'client') { this.t++; this[f[0]](); return; }
    return update.apply(this, arguments);
  };
  G.renderState = function (ctx) {
    const f = ASTRO_SCREENS[this.state];
    if (f) { this[f[1]](ctx); return; }
    return renderState.apply(this, arguments);
  };
  G.pointer = function (x, y) {
    const f = ASTRO_SCREENS[this.state];
    if (f) { Sound.unlock(); if (f[2]) this[f[2]](x - menuOX(), y - menuOY()); return; }
    return pointer.apply(this, arguments);
  };
  // the music: the waves' tunes (more intense later on), the boss's, the hangar's; MUSIC's songs when they're loaded
  const has = k => typeof SONGS !== 'undefined' && !!SONGS[k];
  const pick = (...ks) => ks.find(has) || null;
  const musicFrame = G.musicFrame;
  G.musicFrame = function () {
    const s = this.state, A = this.stage;
    if (s === 'astroHangar') { Music.want(pick('astroShop', 'rallyShop'), Music.skillLevel(), false); return; }
    if (s === 'astroOver') { Music.want(null, Music.skillLevel(), false); return; }
    if (s !== 'play' || !A || !A.astro) return musicFrame.apply(this, arguments);
    let song = null;
    if (A.phase === 'warn') song = A.t > 30 ? pick('bossWarn') : null;
    else if (A.boss) song = pick('astroBoss', 'galaxyBoss');
    else if (A.phase === 'play' || A.phase === 'clear') song = Math.floor((A.wave - 1) / 5) % 2 ? pick('astro2', 'galaxy2', 'galaxy') : pick('astro', 'galaxy');
    const tuning = this.paused && ['MUSIC', 'MUSIC VOL'].includes(pauseMenu()[this.pauseIdx]);
    Music.want(song, Music.skillLevel(), this.paused && !tuning);
  };
})();
