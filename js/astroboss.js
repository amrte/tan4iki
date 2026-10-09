'use strict';
// =====================================================================
//  ASTRO TANKS' mini bosses (ASTRO_BOSSES; astro.js runs them): three, at waves 5, 10 and 15, and again harder each
//  time round (A.loop 1, 2 ...) at 20, 25, 30 ...
//    CINDER COLOSSUS  a rolling asteroid of molten rock in iron armour: shoot the plates off to reach the core; it
//                     charges, sheds rocks, vents magma through the gaps, regrows a crust, then cracks open and sprays
//    VOID MATRIARCH   a mothership: shield pylons to knock out first, a turning ring of turrets firing patterns, small
//                     saucers out of its bay, a sweeping tractor beam that hurts a tank that stays in it
//    COMET WYRM       a serpent of rock and iron that wraps round the field: only its head and its burning tail can be
//                     hurt (the head double while its jaws are open); rock segments break off; it lunges and coils
//  Each boss is an object (make(A) returns it) as the contract says: name x y r hp maxHp dying dead update(A)
//  draw(ctx, A) hit(x, y, r, dmg) touches(x, y, r). It only calls A's listed methods. Drawn in pixels: sprites made
//  once into small canvases, turned copies made as they're needed (nearest-neighbour, so they stay sharp).
// =====================================================================

// the lead's knobs: boss health, how often they fire, how fast they move (1 = as designed)
const ASTRO_BOSS_TUNE = { hp: 1, shots: 1, speed: 1 };
const ASTRO_BOSS_TAU = Math.PI * 2;
const ASTRO_BOSS_ENTER = 80;          // frames the boss takes to warp in (it can't hurt or be hurt meanwhile)

// ------------------------------------------------------------------ helpers
function astroBossCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function astroBossRng(seed) { let s = (seed >>> 0) || 1; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }
// smooth value noise in 0..1
function astroBossNoise(seed) {
  const r = astroBossRng(seed), g = new Float32Array(1024);
  for (let i = 0; i < 1024; i++) g[i] = r();
  const at = (i, j) => g[((i * 71 + j * 977) % 1024 + 1024) % 1024];
  return (x, y) => {
    const i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j, sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const a = at(i, j) + (at(i + 1, j) - at(i, j)) * sx, b = at(i, j + 1) + (at(i + 1, j + 1) - at(i, j + 1)) * sx;
    return a + (b - a) * sy;
  };
}
const astroBossRGB = new Map();
function astroBossCol(col) {
  let v = astroBossRGB.get(col);
  if (!v) { const h = col.slice(1); v = [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), h.length >= 8 ? parseInt(h.slice(6, 8), 16) : 255]; astroBossRGB.set(col, v); }
  return v;
}
// a w x h sprite, each pixel from f(x, y) -> '#RRGGBB' / '#RRGGBBAA' or null
function astroBossPaint(w, h, f) {
  const cv = astroBossCanvas(w, h), c = cv.getContext('2d'), img = c.createImageData(w, h), d = img.data;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const col = f(x, y);
    if (!col) continue;
    const v = astroBossCol(col), o = (y * w + x) * 4;
    d[o] = v[0]; d[o + 1] = v[1]; d[o + 2] = v[2]; d[o + 3] = v[3];
  }
  c.putImageData(img, 0, 0);
  return cv;
}
// the same sprite as a white silhouette (hit flash)
function astroBossWhite(src) {
  const c = astroBossCanvas(src.width, src.height), x = c.getContext('2d');
  x.drawImage(src, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = '#F8F8F8'; x.fillRect(0, 0, c.width, c.height);
  return c;
}
// turned copies of a sprite drawn pointing up (angle 0 = up, clockwise), nearest-neighbour, made as asked and kept
function astroBossRotor(src, steps = 64) {
  const W = src.width, H = src.height, sd = src.getContext('2d').getImageData(0, 0, W, H).data, R = Math.ceil(Math.hypot(W, H)) + 2;
  const cache = new Map();
  const make = (k, white) => {
    const ang = k / steps * ASTRO_BOSS_TAU, cs = Math.cos(ang), sn = Math.sin(ang);
    const c = astroBossCanvas(R, R), x = c.getContext('2d'), out = x.createImageData(R, R), od = out.data;
    for (let y = 0; y < R; y++) for (let i = 0; i < R; i++) {
      const rx = i + 0.5 - R / 2, ry = y + 0.5 - R / 2, sx = Math.floor(rx * cs + ry * sn + W / 2), sy = Math.floor(-rx * sn + ry * cs + H / 2);
      if (sx < 0 || sy < 0 || sx >= W || sy >= H) continue;
      const s = (sy * W + sx) * 4;
      if (sd[s + 3] < 100) continue;
      const o = (y * R + i) * 4;
      if (white) { od[o] = 248; od[o + 1] = 248; od[o + 2] = 248; } else { od[o] = sd[s]; od[o + 1] = sd[s + 1]; od[o + 2] = sd[s + 2]; }
      od[o + 3] = sd[s + 3];
    }
    x.putImageData(out, 0, 0);
    return c;
  };
  return {
    R,
    get(ang, white) {
      const k = ((Math.round(ang / ASTRO_BOSS_TAU * steps) % steps) + steps) % steps, key = k * 2 + (white ? 1 : 0);
      let c = cache.get(key);
      if (!c) { c = make(k, white); cache.set(key, c); }
      return c;
    },
    draw(ctx, x, y, ang, white) { ctx.drawImage(this.get(ang, white), Math.round(x - R / 2), Math.round(y - R / 2)); },
  };
}
// art made once (all loops share it)
const ASTRO_BOSS_ART = {};
function astroBossArt(key, make) { return ASTRO_BOSS_ART[key] || (ASTRO_BOSS_ART[key] = make()); }

function astroBossMod(v, m) { return ((v % m) + m) % m; }
function astroBossAngDiff(a, b) { return astroBossMod(b - a + Math.PI, ASTRO_BOSS_TAU) - Math.PI; }
function astroBossAngTo(dx, dy) { return Math.atan2(dx, -dy); }
// call fn(x, y) for the copy at (x, y) and the wrapped copies of something of radius r near an edge
function astroBossCopies(A, x, y, r, fn) {
  const xs = [x], ys = [y];
  if (x - r < 0) xs.push(x + A.W); if (x + r > A.W) xs.push(x - A.W);
  if (y - r < 0) ys.push(y + A.H); if (y + r > A.H) ys.push(y - A.H);
  for (const cx of xs) for (const cy of ys) fn(cx, cy);
}
// the nearest ship from (x, y), across the wrap: { s, dx, dy, d } or null
function astroBossTarget(A, x, y) {
  let best = null;
  for (const s of A.ships()) { const n = A.near(x, y, s.x, s.y); if (!best || n.d < best.d) best = { s, dx: n.dx, dy: n.dy, d: n.d }; }
  return best;
}
// a place for the boss to come in: as far from the ships as the field allows
function astroBossSpot(A) {
  const ships = A.ships();
  if (!ships.length) return { x: A.W / 2, y: A.H / 2 };
  let best = null, bd = -1;
  for (let i = 0; i < 6; i++) for (let j = 0; j < 4; j++) {
    const x = A.W * (i + 0.5) / 6, y = A.H * (j + 0.5) / 4;
    let m = 1e9;
    for (const s of ships) m = Math.min(m, A.near(x, y, s.x, s.y).d);
    if (m > bd) { bd = m; best = { x, y }; }
  }
  return best;
}
// an enemy shot / a rock at a wrapped position
function astroBossShot(A, x, y, ang, spd, opts) { A.enemyShot(astroBossMod(x, A.W), astroBossMod(y, A.H), Math.sin(ang) * spd, -Math.cos(ang) * spd, opts); }
function astroBossRock(A, x, y, size, ang, spd, kind) { return A.spawnRock(astroBossMod(x, A.W), astroBossMod(y, A.H), size, Math.sin(ang) * spd, -Math.cos(ang) * spd, { kind }); }
// how much harder this time round
function astroBossLoop(A) {
  const L = Math.max(0, A.loop | 0);
  return { L, hp: (1 + 0.5 * L) * ASTRO_BOSS_TUNE.hp, spd: Math.min(1.45, 1 + 0.12 * L) * ASTRO_BOSS_TUNE.speed, rate: (1 + 0.3 * L) * ASTRO_BOSS_TUNE.shots };
}
// dots along a line from (x, y) at ang (a telegraph: where it's going to go), wrapped
function astroBossDash(ctx, A, x, y, ang, len, col, t, gap = 7) {
  const dx = Math.sin(ang), dy = -Math.cos(ang);
  ctx.fillStyle = col;
  for (let s = 10 + (t % gap); s < len; s += gap) ctx.fillRect(Math.round(astroBossMod(x + dx * s, A.W)) - 1, Math.round(astroBossMod(y + dy * s, A.H)) - 1, 2, 2);
}
// a dotted ring, wrapped
function astroBossRing(ctx, A, x, y, r, col, t = 0, every = 1) {
  const n = Math.max(8, Math.round(r * ASTRO_BOSS_TAU / 3));
  ctx.fillStyle = col;
  for (let k = 0; k < n; k++) {
    if ((k + t) % every) continue;
    const a = k / n * ASTRO_BOSS_TAU;
    ctx.fillRect(Math.round(astroBossMod(x + Math.sin(a) * r, A.W)), Math.round(astroBossMod(y - Math.cos(a) * r, A.H)), 1, 1);
  }
}
// sparks, dust and debris of the boss's own (wrapped, short-lived)
function astroBossFx() {
  return {
    list: [],
    add(x, y, vx, vy, life, col, sz = 1, drag = 0.95) { if (this.list.length < 300) this.list.push({ x, y, vx, vy, life, col, sz, drag }); },
    burst(x, y, n, cols, spd = 1.5, life = 24, sz = 1) {
      for (let k = 0; k < n; k++) {
        const a = Math.random() * ASTRO_BOSS_TAU, s = spd * (0.3 + Math.random() * 0.7);
        this.add(x, y, Math.sin(a) * s, -Math.cos(a) * s, Math.round(life * (0.5 + Math.random() * 0.5)), cols[k % cols.length], sz);
      }
    },
    update() {
      for (const p of this.list) { p.x += p.vx; p.y += p.vy; p.vx *= p.drag; p.vy *= p.drag; p.life--; }
      if (this.list.some(p => p.life <= 0)) this.list = this.list.filter(p => p.life > 0);
    },
    draw(ctx, A) {
      for (const p of this.list) {
        ctx.fillStyle = p.col;
        ctx.fillRect(Math.round(astroBossMod(p.x, A.W) - p.sz / 2), Math.round(astroBossMod(p.y, A.H) - p.sz / 2), p.sz, p.sz);
      }
    },
  };
}
// what all three share
function astroBossBase(A, def, r, hp) {
  const k = astroBossLoop(A), at = astroBossSpot(A), max = Math.max(1, Math.round(hp * k.hp));
  return {
    key: def.key, name: def.name + (k.L ? ' ' + ['', 'II', 'III', 'IV', 'V'][Math.min(4, k.L)] : ''),
    x: at.x, y: at.y, r, hp: max, maxHp: max, dying: false, dead: false,
    A, k, t: 0, enter: ASTRO_BOSS_ENTER, phase: 1, trans: 0, fl: 0, dt: 0, fx: astroBossFx(),
  };
}
// the boss itself takes damage: flash, phases (at 2/3 and 1/3 of its health), death
function astroBossDamage(b, dmg) {
  if (b.dying || b.dead) return;
  b.hp = Math.max(0, b.hp - dmg); b.fl = 6;
  if (b.hp <= 0) { b.dying = true; b.dt = 0; b.trans = 0; return; }
  const f = b.hp / b.maxHp, ph = f > 2 / 3 ? 1 : f > 1 / 3 ? 2 : 3;
  if (ph > b.phase) { b.phase = ph; b.trans = 75; b.onPhase(ph); }
}
// once a frame: if something else took its health (a bomb straight off hp), its phases and its death still come
function astroBossCheck(b) {
  if (b.dying || b.dead || b.enter > 0) return;
  if (!(b.hp > 0)) { b.hp = 0; b.dying = true; b.dt = 0; b.trans = 0; return; }
  const f = b.hp / b.maxHp, ph = f > 2 / 3 ? 1 : f > 1 / 3 ? 2 : 3;
  if (ph > b.phase) { b.phase = ph; b.trans = 75; b.onPhase(ph); }
}
// a shot that bounces off armour: sparks, no damage
function astroBossClank(b, x, y) { b.fx.burst(x, y, 3, ['#F8F8F8', '#BCBCBC', '#F8D878'], 1.4, 10); }
// crystals scattered round (x, y)
function astroBossDrops(A, x, y, n, r) {
  for (let k = 0; k < n; k++) { const a = k / n * ASTRO_BOSS_TAU + Math.random() * 0.5; A.drop(astroBossMod(x + Math.sin(a) * r, A.W), astroBossMod(y - Math.cos(a) * r, A.H), 'crystal'); }
}
// the warp-in: rings closing in on the spot, the boss flickering into being
function astroBossWarpIn(ctx, A, b) {
  const p = b.enter / ASTRO_BOSS_ENTER;
  for (let k = 0; k < 3; k++) {
    const r = b.r * (0.6 + ((p * 3 + k / 3) % 1) * 2.2);
    astroBossRing(ctx, A, b.x, b.y, r, k === 0 ? '#F8F8F8' : k === 1 ? '#3CBCFC' : '#6844FC', b.t >> 1, 2);
  }
  return b.enter > ASTRO_BOSS_ENTER * 0.45 ? (b.t & 4) === 0 : (b.t & 2) === 0;   // draw the body this frame?
}
// the end of every death: the big blast, the flash, the loot
function astroBossFinale(b, A, n) {
  A.boom(b.x, b.y, 3); A.flash(16, '#F8F8F8'); A.shake(45);
  astroBossDrops(A, b.x, b.y, n, b.r * 0.7);
  A.drop(b.x, b.y);
  b.dead = true;
}

// =====================================================================
//  1. CINDER COLOSSUS: an asteroid of molten rock in eight iron plates
// =====================================================================
function astroBossGolemArt() {
  return astroBossArt('golem', () => {
    const S = 64, C = 32, n = astroBossNoise(7), n2 = astroBossNoise(19), n3 = astroBossNoise(31);
    const polar = (x, y) => { const dx = x + 0.5 - C, dy = y + 0.5 - C; return [Math.hypot(dx, dy), Math.atan2(dx, -dy)]; };
    const hub = (x, y, d) => {
      if (d > 10) return '#101010';
      const v = n3(x / 2.5, y / 2.5) + ((x + y) & 1) * 0.06, cr = Math.hypot(x + 0.5 - C - 2, y + 0.5 - C + 2);
      if (cr < 3) return cr < 2 ? '#383838' : '#7C7C7C';
      return v > 0.66 ? '#BCBCBC' : v > 0.4 ? '#7C7C7C' : '#585858';
    };
    // under the plates: lava, the stone hub in the middle
    const lava = astroBossPaint(S, S, (x, y) => {
      const [d] = polar(x, y);
      if (d > 26.5) return null;
      if (d < 11) return hub(x, y, d);
      const v = n(x / 5, y / 5) * 0.7 + n2(x / 2, y / 2) * 0.3 + ((x + y) & 1) * 0.04;
      return v > 0.72 ? '#F8D878' : v > 0.56 ? '#F8B800' : v > 0.4 ? '#F83800' : v > 0.3 ? '#A81000' : '#581000';
    });
    // the last phase: the cooled shell cracked all over, the core an eye of fire
    const rr = astroBossRng(5), seeds = [];
    for (let k = 0; k < 11; k++) { const a = rr() * ASTRO_BOSS_TAU, d = 6 + rr() * 22; seeds.push([C + Math.sin(a) * d, C - Math.cos(a) * d]); }
    const crack = (x, y) => {
      let d1 = 1e9, d2 = 1e9;
      for (const [sx, sy] of seeds) { const d = Math.hypot(x + 0.5 - sx, y + 0.5 - sy); if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d; }
      return d2 - d1;
    };
    const shellCol = (x, y, glowOnly) => {
      const [d] = polar(x, y);
      if (d > 27.5) return null;
      if (d < 7.5) { if (glowOnly) return d < 4 ? '#F8F8F8' : null; return d < 2.5 ? '#F8F8F8' : d < 5 ? '#F8D878' : d < 6.5 ? '#F8B800' : '#F83800'; }
      const c = crack(x, y) + n2(x / 3, y / 3) * 0.8;
      if (c < 1.3) return glowOnly ? '#F8F8F8' : c < 0.7 ? '#F8D878' : '#F8B800';
      if (glowOnly) return null;
      if (d > 26.5) return '#101010';
      if (c < 2.4) return (x + y) & 1 ? '#A81000' : '#581000';
      const v = n3(x / 3, y / 3) + ((x + y) & 1) * 0.05;
      return v > 0.62 ? '#7C7C7C' : v > 0.4 ? '#585858' : '#383838';
    };
    const shell = astroBossPaint(S, S, (x, y) => shellCol(x, y, false));
    const glow = astroBossPaint(S, S, (x, y) => shellCol(x, y, true));
    // a plate (pointing up): an iron one, the same shot up, a crust one (regrown), a hot one (the vent about to blow)
    const HALF = 0.345;
    const plate = kind => astroBossPaint(S, S, (x, y) => {
      const [d, a] = polar(x, y);
      if (d < 10.5 || d > 29.5 || Math.abs(a) > HALF) return null;
      const e = Math.min(d - 10.5, 29.5 - d, d * (HALF - Math.abs(a)));
      if (e < 1) return '#101010';
      if (kind === 'hot') return (x + y) & 1 ? '#F8D878' : '#F8F8F8';
      if (kind === 'crust') {
        const v = n3(x / 2, y / 2) + ((x + y) & 1) * 0.05;
        if (Math.abs(n(x / 3 + 9, y / 3) - 0.5) < 0.035) return '#F83800';
        if (e < 2 && d > 27) return '#7C7C7C';
        return v > 0.6 ? '#585858' : v > 0.35 ? '#383838' : '#581000';
      }
      if (kind === 'cracked' && Math.abs(n(x / 4 + 3, y / 4 + 7) - 0.5) < 0.04) return '#101010';
      if (e < 2 && (d > 27 || a < 0)) return '#F8F8F8';
      if (Math.abs(d - 19.5) < 0.6) return '#585858';
      for (const [rd, ra] of [[25.5, 0.2], [14.5, 0.2]]) for (const sg of [-1, 1]) {
        const px = C + Math.sin(ra * sg) * rd, py = C - Math.cos(ra * sg) * rd;
        if (Math.abs(x + 0.5 - px) < 1 && Math.abs(y + 0.5 - py) < 1) return '#F8F8F8';
        if (Math.abs(x - 0.5 - px) < 1 && Math.abs(y - 0.5 - py) < 1) return '#383838';
      }
      return d > 19.5 ? ((x + y) % 5 === 0 ? '#7C7C7C' : '#BCBCBC') : '#7C7C7C';
    });
    // the light from the top left (stays put while the rock turns), laid over the whole rock
    const shade = astroBossPaint(96, 96, (x, y) => {
      const dx = (x + 0.5 - 48) / 31, dy = (y + 0.5 - 48) / 31, d = dx * dx + dy * dy;
      if (d > 1) return null;
      const l = -dx * 0.55 - dy * 0.65 + Math.sqrt(1 - d) * 0.6;
      if (l < -0.25) return (x + y) & 1 ? '#000000A0' : '#00000060';
      if (l < 0.1) return (x + y) & 1 ? '#00000070' : null;
      if (l > 0.95) return (x + y) & 1 ? '#FFFFFF50' : null;
      return null;
    });
    return {
      lava: astroBossRotor(lava), shell: astroBossRotor(shell), glow: astroBossRotor(glow), shade,
      iron: astroBossRotor(plate('iron')), cracked: astroBossRotor(plate('cracked')), crust: astroBossRotor(plate('crust')), hot: astroBossRotor(plate('hot')),
    };
  });
}

function astroBossGolem(A, def) {
  const b = astroBossBase(A, def, 30, 80), k = b.k, art = astroBossGolemArt(), SEC = ASTRO_BOSS_TAU / 8;
  const plateHp = Math.max(1, Math.round((4 + 2 * k.L) * ASTRO_BOSS_TUNE.hp));
  Object.assign(b, {
    rot: Math.random() * ASTRO_BOSS_TAU, spin: 0, vx: 0, vy: 0, mode: 'roll', mt: 0, cool: 170, aim: 0, shedT: 360, spawned: 0,
    regrowT: 200, sprayA: 0, nextAtk: 0, cv: astroBossCanvas(96, 96),
    plates: Array.from({ length: 8 }, () => ({ hp: plateHp, max: plateHp, kind: 'iron', fl: 0, grow: 0 })),
  });
  const platePos = (i, rad = 21) => { const a = b.rot + i * SEC; return [b.x + Math.sin(a) * rad, b.y - Math.cos(a) * rad, a]; };
  const exposed = () => b.plates.map((p, i) => (p.hp <= 0 || p.grow > 0 ? i : -1)).filter(i => i >= 0);
  // a plate comes off: debris, a rock flung out, a crystal
  const breakPlate = (i, rock = true) => {
    const p = b.plates[i], [px, py, a] = platePos(i);
    p.hp = 0; p.grow = 0;
    A.boom(astroBossMod(px, A.W), astroBossMod(py, A.H), 0);
    b.fx.burst(px, py, 10, p.kind === 'crust' ? ['#585858', '#F83800', '#383838'] : ['#BCBCBC', '#7C7C7C', '#F8F8F8'], 1.8, 26, 2);
    if (rock && b.spawned < 18) { b.spawned++; astroBossRock(A, px, py, 2, a, 0.9, p.kind === 'crust' ? 'stone' : 'iron'); }
    A.drop(astroBossMod(px, A.W), astroBossMod(py, A.H), 'crystal');
    A.addScore(-1, 50);
  };
  b.onPhase = ph => {
    A.shake(22);
    if (ph === 2) { A.flash(4, '#F83800'); A.popup(b.x, b.y - 36, 'MOLTEN!', '#F8B800'); astroBossDrops(A, b.x, b.y, 3, 34); b.nextAtk = 1; }
    if (ph === 3) { A.popup(b.x, b.y - 36, 'CORE BREACH!', '#F83800'); astroBossDrops(A, b.x, b.y, 3, 34); b.nextAtk = 1; }
    b.mode = 'roll'; b.cool = 90;
  };
  b.update = function (A) {
    b.A = A; b.t++; b.fx.update(); astroBossCheck(b);
    if (b.fl > 0) b.fl--;
    for (const p of b.plates) { if (p.fl > 0) p.fl--; if (p.grow > 0) p.grow--; }
    if (b.enter > 0) { b.enter--; b.rot += 0.03; return; }
    if (b.dying) {
      b.dt++; b.vx *= 0.95; b.vy *= 0.95; b.spin *= 0.97; b.rot += b.spin; b.x = astroBossMod(b.x + b.vx, A.W); b.y = astroBossMod(b.y + b.vy, A.H);
      if (b.dt % 8 === 1) {
        const a = Math.random() * ASTRO_BOSS_TAU, d = 8 + Math.random() * 20;
        A.boom(astroBossMod(b.x + Math.sin(a) * d, A.W), astroBossMod(b.y - Math.cos(a) * d, A.H), b.dt > 90 ? 2 : 1); A.shake(6);
      }
      if (b.dt % 3 === 0) b.fx.burst(b.x, b.y, 3, ['#F8D878', '#F8B800', '#F83800'], 2.6, 30, 2);
      if (b.dt === 120) A.flash(6, '#F8D878');
      if (b.dt >= 150) astroBossFinale(b, A, 8);
      return;
    }
    const ph = b.phase, tg = astroBossTarget(A, b.x, b.y), sp = Math.hypot(b.vx, b.vy);
    let spinTo = (sp / 26) * (b.vx >= 0 ? 1 : -1);
    if (b.trans > 0) {
      b.trans--; b.vx *= 0.9; b.vy *= 0.9; spinTo = 0.15 * Math.sin(b.t * 0.3);
      if (b.trans % 5 === 0) b.fx.burst(b.x, b.y, 4, ['#F8B800', '#F83800'], 2, 20);
      if (ph === 3 && b.trans === 25) {
        // the core bursts the armour off
        let rocks = 0;
        b.plates.forEach((p, i) => { if (p.hp > 0 || p.grow > 0) breakPlate(i, rocks++ < 4); });
        A.shake(30); A.flash(6, '#F8D878');
      }
    } else {
      if (b.mode === 'roll') {
        const want = (0.3 + 0.1 * (ph - 1)) * k.spd;
        if (tg && tg.d > 1) { b.vx += (tg.dx / tg.d * want - b.vx) * 0.02; b.vy += (tg.dy / tg.d * want - b.vy) * 0.02; }
        if (--b.cool <= 0) {
          b.mt = 0;
          if (ph === 1 || b.nextAtk === 0) b.mode = 'wind';
          else b.mode = ph === 2 ? 'vent' : 'spray';
          b.nextAtk = 1 - b.nextAtk;
        }
      } else if (b.mode === 'wind') {
        // it stops and spins up, dust flying: then it charges where the line points
        const WIND = ph === 3 ? 42 : 55;
        b.mt++; b.vx *= 0.9; b.vy *= 0.9; spinTo = 0.32 * (Math.cos(b.aim) >= 0 ? 1 : -1);
        if (b.mt < WIND - 16 && tg) b.aim = astroBossAngTo(tg.dx, tg.dy);
        if (b.mt % 3 === 0) { const a = b.aim + Math.PI + (Math.random() - 0.5); b.fx.add(b.x + Math.sin(a) * 26, b.y - Math.cos(a) * 26, Math.sin(a) * 1.2, -Math.cos(a) * 1.2, 20, '#BCBCBC', 2); }
        if (b.mt >= WIND) {
          b.mode = 'charge'; b.mt = 0; A.shake(8);
          const s = (2.5 + 0.4 * (ph - 1)) * k.spd; b.vx = Math.sin(b.aim) * s; b.vy = -Math.cos(b.aim) * s;
        }
      } else if (b.mode === 'charge') {
        b.mt++;
        if (b.mt % 2 === 0) b.fx.add(b.x - b.vx * 8 + (Math.random() - 0.5) * 20, b.y - b.vy * 8 + (Math.random() - 0.5) * 20, -b.vx * 0.2, -b.vy * 0.2, 18, Math.random() < 0.5 ? '#F83800' : '#F8B800', 2);
        if (b.mt >= 46) { b.mode = 'roll'; b.vx *= 0.3; b.vy *= 0.3; b.cool = Math.round((ph === 1 ? 200 : 150) / k.rate); }
      } else if (b.mode === 'vent') {
        // the gaps glow white hot, then magma bursts out of every one of them
        b.mt++; b.vx *= 0.96; b.vy *= 0.96;
        if (b.mt === 50) {
          let gaps = exposed();
          if (!gaps.length) { let w = 0; b.plates.forEach((p, i) => { if (p.hp < b.plates[w].hp) w = i; }); breakPlate(w); gaps = [w]; }
          const per = 2 + (k.L > 0 ? 1 : 0), s = 1.3 * k.spd;
          for (const i of gaps) {
            const a0 = b.rot + i * SEC;
            for (let j = 0; j < per; j++) { const a = a0 + (j - (per - 1) / 2) * 0.16; astroBossShot(A, b.x + Math.sin(a) * 24, b.y - Math.cos(a) * 24, a, s, { r: 3, life: 130, col: '#F8B800' }); }
          }
          A.shake(10); b.fx.burst(b.x, b.y, 16, ['#F8D878', '#F83800'], 2.4, 22, 2);
        }
        if (b.mt >= 70) { b.mode = 'roll'; b.cool = Math.round(150 / k.rate); }
      } else if (b.mode === 'spray') {
        // the cracks blaze, then a spiral of magma out of the core
        b.mt++; b.vx *= 0.97; b.vy *= 0.97;
        if (b.mt < 40) { if (b.mt % 2 === 0) b.fx.burst(b.x, b.y, 2, ['#F8F8F8', '#F8D878'], 1.6, 14); }
        else {
          if (b.mt === 40 && tg) b.sprayA = astroBossAngTo(tg.dx, tg.dy) + 1.2;
          const every = Math.max(3, 7 - k.L);
          if ((b.mt - 40) % every === 0) {
            const s = 1.35 * k.spd, streams = k.L > 0 ? 3 : 2;
            for (let j = 0; j < streams; j++) { const a = b.sprayA + j * ASTRO_BOSS_TAU / streams; astroBossShot(A, b.x + Math.sin(a) * 18, b.y - Math.cos(a) * 18, a, s, { r: 3, life: 130, col: '#F87858' }); }
            b.sprayA += 0.29;
          }
        }
        if (b.mt >= 150) { b.mode = 'roll'; b.cool = Math.round(140 / k.rate); }
      }
      // it sheds rocks as it rolls
      if (--b.shedT <= 0) {
        b.shedT = Math.round([0, 420, 360, 300][ph] / Math.sqrt(k.rate));
        if (b.spawned < 18) { b.spawned++; const a = Math.random() * ASTRO_BOSS_TAU; astroBossRock(A, b.x + Math.sin(a) * 30, b.y - Math.cos(a) * 30, 2, a, 0.8, ph === 3 ? 'magma' : 'stone'); }
      }
      // phase 2: the crust grows back over the gaps (a plate at a time, up to five)
      if (ph === 2 && --b.regrowT <= 0) {
        b.regrowT = Math.round(330 / Math.sqrt(k.rate));
        const gone = b.plates.map((p, i) => (p.hp <= 0 ? i : -1)).filter(i => i >= 0);
        if (8 - gone.length < 5 && gone.length) {
          const p = b.plates[gone[Math.floor(Math.random() * gone.length)]], hp = Math.max(1, Math.round((3 + k.L) * ASTRO_BOSS_TUNE.hp));
          Object.assign(p, { kind: 'crust', hp, max: hp, grow: 60, fl: 0 });
        }
      }
    }
    b.spin += (spinTo - b.spin) * 0.08; b.rot += b.spin;
    b.x = astroBossMod(b.x + b.vx, A.W); b.y = astroBossMod(b.y + b.vy, A.H);
  };
  b.hit = function (x, y, r, dmg) {
    r = r > 0 ? r : 2; dmg = dmg > 0 ? dmg : 1;
    const A = b.A;
    if (b.enter > 0 || b.dying || b.dead) return false;
    const n = A.near(b.x, b.y, x, y);
    if (n.d > 28 + r) return false;
    if (b.trans > 0) { astroBossClank(b, x, y); return true; }
    if (b.phase < 3) {
      const i = astroBossMod(Math.round(astroBossAngDiff(b.rot, astroBossAngTo(n.dx, n.dy)) / SEC), 8), p = b.plates[i];
      if (n.d < 11 + r * 0.5) { astroBossClank(b, x, y); return true; }       // the stone hub
      if (p.hp > 0 && !p.grow) {
        p.hp -= dmg; p.fl = 5; astroBossClank(b, x, y);
        if (p.hp <= 0) breakPlate(i);
        return true;
      }
    }
    b.fx.burst(x, y, 4, ['#F8D878', '#F8B800', '#F83800'], 1.6, 14);
    astroBossDamage(b, dmg);
    return true;
  };
  b.touches = function (x, y, r) {
    if (b.enter > 0 || b.dying || b.dead) return false;
    return b.A.near(b.x, b.y, x, y).d < 26 + r;
  };
  b.draw = function (ctx, A) {
    ctx.save(); ctx.imageSmoothingEnabled = false;
    // the rock, put together in its own canvas, the light laid over the lot
    const c = b.cv.getContext('2d'), white = b.fl > 0 && (b.fl & 2) || (b.dying && (b.dt & 4));
    c.globalCompositeOperation = 'source-over'; c.clearRect(0, 0, 96, 96);
    if (b.phase < 3) art.lava.draw(c, 48, 48, b.rot, white);
    else {
      art.shell.draw(c, 48, 48, b.rot, white);
      if (!white) { c.globalAlpha = 0.35 + 0.35 * Math.sin(b.t * (b.mode === 'spray' && b.mt < 40 ? 0.6 : 0.12)); art.glow.draw(c, 48, 48, b.rot); c.globalAlpha = 1; }
    }
    const venting = b.mode === 'vent' && b.trans <= 0 && b.mt < 50;
    b.plates.forEach((p, i) => {
      const a = b.rot + i * SEC;
      if (p.hp > 0) {
        if (p.grow > 0) { if ((p.grow >> 2) & 1) return; c.globalAlpha = 1 - p.grow / 75; }
        const ro = p.kind === 'crust' ? art.crust : p.hp <= p.max / 2 ? art.cracked : art.iron;
        ro.draw(c, 48, 48, a, p.fl > 0);
        c.globalAlpha = 1;
      } else if (venting && b.phase < 3) { c.globalAlpha = 0.3 + 0.6 * (b.mt / 50) * ((b.t >> 1) & 1); art.hot.draw(c, 48, 48, a); c.globalAlpha = 1; }
    });
    c.globalCompositeOperation = 'source-atop'; c.drawImage(art.shade, 0, 0); c.globalCompositeOperation = 'source-over';
    const jit = b.dying || b.trans > 0 ? ((b.t >> 1) & 1) * 2 - 1 : 0, show = b.enter > 0 ? astroBossWarpIn(ctx, A, b) : true;
    if (show) astroBossCopies(A, b.x, b.y, 48, (X, Y) => ctx.drawImage(b.cv, Math.round(X - 48 + jit), Math.round(Y - 48)));
    // the charge's line: where it's going to roll
    if (b.mode === 'wind' && b.trans <= 0 && !b.dying) {
      const WIND = b.phase === 3 ? 42 : 55, locked = b.mt >= WIND - 16;
      astroBossDash(ctx, A, b.x, b.y, b.aim, 140, locked ? ((b.t >> 1) & 1 ? '#F8F8F8' : '#F83800') : '#F87858', b.t >> 1, 8);
    }
    b.fx.draw(ctx, A);
    ctx.restore();
  };
  return b;
}

// =====================================================================
//  2. VOID MATRIARCH: a mothership seen from above
// =====================================================================
function astroBossMotherArt() {
  return astroBossArt('mother', () => {
    const S = 72, C = 36;
    const hull = astroBossPaint(S, S, (x, y) => {
      const dx = x + 0.5 - C, dy = y + 0.5 - C, d = Math.hypot(dx, dy), a = Math.atan2(dx, -dy);
      if (d > 31) return null;
      if (d > 30) return '#101010';
      const l = (-dx * 0.5 - dy * 0.6) / 31 + ((x + y) & 1) * 0.04;
      // the hangar bay at the bottom
      if (Math.abs(astroBossAngDiff(a, Math.PI)) < 0.24 && d > 17 && d < 29) {
        if (Math.abs(astroBossAngDiff(a, Math.PI)) > 0.2 || d < 18) return '#101010';
        return (Math.floor(d) + Math.floor(x / 2)) % 4 < 2 ? '#F8B800' : '#383838';
      }
      if (d > 26) return l > 0.25 ? '#9878F8' : l > -0.25 ? '#6844FC' : '#4428BC';
      if (d > 25) return '#101010';
      if (d > 11.5) {
        const seam = Math.abs(astroBossMod(a + 0.26, ASTRO_BOSS_TAU / 12) - 0.26) * d < 0.6 || Math.abs(d - 18.5) < 0.5;
        if (seam) return '#383838';
        return l > 0.35 ? '#F8F8F8' : l > 0 ? '#BCBCBC' : l > -0.4 ? '#7C7C7C' : '#585858';
      }
      if (d > 10) return '#383838';
      return '#202020';
    });
    // a turret (barrel up)
    const turret = astroBossPaint(15, 15, (x, y) => {
      const dx = x + 0.5 - 7.5, dy = y + 0.5 - 9, d = Math.hypot(dx, dy);
      if (Math.abs(dx) <= 1.5 && y >= 0 && y < 8) return Math.abs(dx) > 1 ? '#101010' : y < 1 ? '#F8F8F8' : '#BCBCBC';
      if (d > 4.5) return null;
      if (d > 3.5) return '#101010';
      return dx + dy < -1 ? '#9878F8' : d < 1.5 ? '#F8F8F8' : '#6844FC';
    });
    // a shield pylon (pointing out): a stalk with a glowing crystal
    const pylon = astroBossPaint(16, 16, (x, y) => {
      const dx = x + 0.5 - 8;
      if (y >= 12 && y <= 15 && Math.abs(dx) < 5) return y === 12 || Math.abs(dx) > 4 ? '#101010' : '#585858';
      if (y >= 7 && y < 12 && Math.abs(dx) < 1.5) return '#BCBCBC';
      const m = Math.abs(dx) + Math.abs(y + 0.5 - 4.5);
      if (m < 4.5) return m > 3.6 ? '#0058F8' : m < 1.6 ? '#F8F8F8' : dx < 0 ? '#A4E4FC' : '#3CBCFC';
      return null;
    });
    return { hull, hullW: astroBossWhite(hull), turret: astroBossRotor(turret), pylon: astroBossRotor(pylon, 64) };
  });
}

function astroBossMother(A, def) {
  const b = astroBossBase(A, def, 40, 75), k = b.k, art = astroBossMotherArt(), BEAM_LEN = Math.round(Math.min(170, Math.max(120, Math.min(A.W, A.H) * 0.7))), BEAM_W = 0.2;
  Object.assign(b, {
    vx: (Math.random() < 0.5 ? -1 : 1) * 0.3, vy: 0, ring: 0, ringSpin: 0.008, pyA: 0, pylons: [], rip: [],
    gunT: 120, gun: -1, gunMode: 'aim', burst: 0, spiralT: 0, bayT: 380, bay: 0, launched: 0,
    beamT: 9999, beam: 0, beamA: 0, beamDir: 1, lock: [0, 0], look: 0,
  });
  const pylonsUp = (n, hp) => {
    hp = Math.max(1, Math.round(hp * k.hp));
    b.pylons = Array.from({ length: n }, (_, i) => ({ a: i / n * ASTRO_BOSS_TAU + (n === 2 ? Math.PI / 2 : 0), hp, max: hp, fl: 0, grow: 40 }));
  };
  pylonsUp(2 + (k.L > 0 ? 1 : 0), 9);
  const shield = () => b.pylons.some(p => p.hp > 0);
  const pyPos = (p, rad = 40) => { const a = p.a + b.pyA; return [b.x + Math.sin(a) * rad, b.y - Math.cos(a) * rad, a]; };
  const gunPos = (i, rad = 20) => { const a = b.ring + i * ASTRO_BOSS_TAU / 4; return [b.x + Math.sin(a) * rad, b.y - Math.cos(a) * rad, a]; };
  const killPylon = p => {
    const [px, py] = pyPos(p);
    p.hp = 0; A.boom(astroBossMod(px, A.W), astroBossMod(py, A.H), 1);
    b.fx.burst(px, py, 12, ['#A4E4FC', '#3CBCFC', '#F8F8F8'], 2, 26, 2);
    A.drop(astroBossMod(px, A.W), astroBossMod(py, A.H), 'crystal'); A.addScore(-1, 100);
    if (!shield()) { A.popup(b.x, b.y - 46, 'SHIELD DOWN!', '#3CBCFC'); A.flash(3, '#3CBCFC'); A.shake(10); }
  };
  b.onPhase = ph => {
    A.shake(20); b.beam = 0; b.beamT = 160; b.gun = -1; b.burst = 0;
    if (ph === 2) { pylonsUp(3 + (k.L > 0 ? 1 : 0), 6); A.popup(b.x, b.y - 46, 'SHIELD UP!', '#A4E4FC'); b.ringSpin = 0.012; b.gunMode = 'fan'; b.gunT = 140; }
    if (ph === 3) {
      for (const p of b.pylons) if (p.hp > 0) killPylon(p);
      A.popup(b.x, b.y - 46, 'HULL BREACHED!', '#F83800'); A.flash(5, '#F83800'); b.ringSpin = 0.03; b.gunMode = 'spiral'; b.gunT = 100;
    }
    astroBossDrops(A, b.x, b.y, 3, 44);
  };
  b.update = function (A) {
    b.A = A; b.t++; b.fx.update(); astroBossCheck(b);
    if (b.fl > 0) b.fl--;
    for (const p of b.pylons) { if (p.fl > 0) p.fl--; if (p.grow > 0) p.grow--; }
    for (const r of b.rip) r.t--;
    if (b.rip.length && b.rip[0].t <= 0) b.rip = b.rip.filter(r => r.t > 0);
    const tg = astroBossTarget(A, b.x, b.y), ph = b.phase;
    if (tg) b.look = astroBossAngTo(tg.dx, tg.dy);
    if (b.enter > 0) { b.enter--; b.ring += 0.05; return; }
    if (b.dying) {
      b.dt++; b.ringSpin = Math.min(0.25, b.ringSpin + 0.002); b.ring += b.ringSpin; b.beam = 0;
      b.x = astroBossMod(b.x + b.vx * 0.5, A.W); b.y = astroBossMod(b.y + 0.15, A.H);
      if (b.dt % 9 === 1) {
        const a = Math.random() * ASTRO_BOSS_TAU, d = 10 + Math.random() * 22;
        A.boom(astroBossMod(b.x + Math.sin(a) * d, A.W), astroBossMod(b.y - Math.cos(a) * d, A.H), b.dt > 100 ? 2 : 1); A.shake(6);
      }
      if (b.dt % 2 === 0) b.fx.add(b.x + (Math.random() - 0.5) * 50, b.y + (Math.random() - 0.5) * 50, 0, -0.4, 30, Math.random() < 0.5 ? '#585858' : '#F83800', 2);
      if (b.dt === 110) A.flash(5, '#9878F8');
      if (b.dt >= 160) astroBossFinale(b, A, 8);
      return;
    }
    // it cruises across the field, weaving up and down, slower while the beam is on
    const slow = b.beam > 0 || b.trans > 0 ? 0.35 : 1;
    b.vy = Math.cos(b.t * 0.011) * 0.28;
    if (b.t % 600 === 300 && tg) b.vx = Math.sign(tg.dx || 1) * Math.abs(b.vx);
    b.x = astroBossMod(b.x + b.vx * slow * k.spd, A.W); b.y = astroBossMod(b.y + b.vy * slow * k.spd, A.H);
    b.ring += b.ringSpin * (b.trans > 0 ? 3 : 1);
    if (ph === 2) b.pyA += 0.004 * k.spd;
    if (ph === 3 && b.t % 4 === 0) b.fx.add(b.x + (Math.random() - 0.5) * 40, b.y + (Math.random() - 0.5) * 40, 0, -0.35, 26, Math.random() < 0.6 ? '#585858' : '#7C7C7C', 2);
    if (b.trans > 0) { b.trans--; return; }
    // the turrets
    if (--b.gunT <= 0) {
      if (b.gunMode === 'aim') {
        // the turret nearest the tank glows, then a burst of three at it
        if (b.gun < 0) {
          let best = 0, bd = 9;
          for (let i = 0; i < 4; i++) { const dd = Math.abs(astroBossAngDiff(gunPos(i)[2], b.look)); if (dd < bd) { bd = dd; best = i; } }
          b.gun = best; b.gunT = 22;
        } else if (tg) {
          const [gx, gy] = gunPos(b.gun, 26), n = A.near(astroBossMod(gx, A.W), astroBossMod(gy, A.H), tg.s.x, tg.s.y);
          astroBossShot(A, gx, gy, astroBossAngTo(n.dx, n.dy), 1.6 * k.spd, { r: 2, life: 140, col: '#F878F8' });
          if (++b.burst >= 3 + k.L) { b.burst = 0; b.gun = -1; b.gunT = Math.round(85 / k.rate); } else b.gunT = 7;
        }
      } else if (b.gunMode === 'fan') {
        // all four glow, then each fires a fan straight out
        if (b.gun < 0) { b.gun = 4; b.gunT = 24; }
        else {
          const per = 3 + (k.L > 0 ? 2 : 0);
          for (let i = 0; i < 4; i++) {
            const [gx, gy, a] = gunPos(i, 26);
            for (let j = 0; j < per; j++) astroBossShot(A, gx, gy, a + (j - (per - 1) / 2) * 0.2, 1.3 * k.spd, { r: 2, life: 140, col: '#F878F8' });
          }
          b.gun = -1; b.gunT = Math.round(125 / k.rate);
        }
      } else {
        // a spiral: the ring spins and each turret fires in turn
        if (b.spiralT <= 0) { b.gun = 4; b.gunT = 24; b.spiralT = 22 + 4 * k.L; }
        else {
          const i = b.spiralT % 4, [gx, gy, a] = gunPos(i, 26);
          astroBossShot(A, gx, gy, a, 1.25 * k.spd, { r: 2, life: 150, col: '#F878F8' });
          if (k.L > 0) astroBossShot(A, gx, gy, a + 0.4, 1.0 * k.spd, { r: 2, life: 150, col: '#D800CC' });
          b.gunT = Math.max(4, Math.round(8 / k.rate));
          if (--b.spiralT <= 0) { b.gun = -1; b.gunT = Math.round(110 / k.rate); }
        }
      }
    }
    // the bay: a small saucer out now and then
    if (--b.bayT <= 0 && b.launched < 6 + 2 * k.L) { b.bay = 50; b.bayT = Math.round([0, 620, 480, 380][ph] / Math.sqrt(k.rate)); }
    if (b.bay > 0 && --b.bay === 0) {
      b.launched++;
      A.spawnSaucer(astroBossMod(b.x, A.W), astroBossMod(b.y + 34, A.H), true);
      b.fx.burst(b.x, b.y + 30, 8, ['#F8B800', '#F8F8F8'], 1.4, 18);
    }
    // the tractor beam (phase 2 on): a line shows where it starts, then it sweeps; a tank that stays in it gets hurt
    if (ph >= 2) {
      if (b.beam === 0 && --b.beamT <= 0) {
        b.beamDir = Math.random() < 0.5 ? -1 : 1; b.beamA = b.look - b.beamDir * 1.0; b.beam = -55;
      } else if (b.beam < 0) {
        if (++b.beam === 0) b.beam = 1;
      } else if (b.beam > 0) {
        b.beam++; b.beamA += b.beamDir * 0.0125 * k.spd;
        for (const s of A.ships()) {
          const n = A.near(b.x, b.y, s.x, s.y), inBeam = n.d > 24 && n.d < BEAM_LEN && Math.abs(astroBossAngDiff(b.beamA, astroBossAngTo(n.dx, n.dy))) < BEAM_W + s.r / Math.max(30, n.d);
          const p = s.p ? 1 : 0;
          if (inBeam) { if (++b.lock[p] >= 40) { A.hurtShip(s, 1); b.lock[p] = -40; } }
          else b.lock[p] = b.lock[p] > 0 ? Math.max(0, b.lock[p] - 2) : Math.min(0, b.lock[p] + 1);
        }
        if (b.beam > (ph === 3 ? 200 : 165)) { b.beam = 0; b.lock = [0, 0]; b.beamT = Math.round((ph === 3 ? 330 : 420) / k.rate); }
      }
    }
  };
  b.hit = function (x, y, r, dmg) {
    r = r > 0 ? r : 2; dmg = dmg > 0 ? dmg : 1;
    const A = b.A;
    if (b.enter > 0 || b.dying || b.dead) return false;
    for (const p of b.pylons) {
      if (p.hp <= 0) continue;
      const [px, py] = pyPos(p, 41);
      if (A.near(px, py, x, y).d < 6 + r) {
        if (p.grow > 0 || b.trans > 0) { astroBossClank(b, x, y); return true; }
        p.hp -= dmg; p.fl = 5; b.fx.burst(x, y, 3, ['#A4E4FC', '#F8F8F8'], 1.2, 10);
        if (p.hp <= 0) killPylon(p);
        return true;
      }
    }
    const n = A.near(b.x, b.y, x, y);
    if (shield() && n.d < 35 + r) {
      b.rip.push({ a: astroBossAngTo(n.dx, n.dy), t: 12 });
      b.fx.burst(x, y, 2, ['#A4E4FC', '#F8F8F8'], 1, 8);
      return true;
    }
    if (n.d < 30 + r) {
      if (b.trans > 0) { astroBossClank(b, x, y); return true; }
      b.fx.burst(x, y, 3, ['#F8F8F8', '#9878F8', '#F8B800'], 1.4, 12);
      astroBossDamage(b, dmg);
      return true;
    }
    return false;
  };
  b.touches = function (x, y, r) {
    if (b.enter > 0 || b.dying || b.dead) return false;
    return b.A.near(b.x, b.y, x, y).d < 28 + r;
  };
  b.draw = function (ctx, A) {
    ctx.save(); ctx.imageSmoothingEnabled = false;
    const show = b.enter > 0 ? astroBossWarpIn(ctx, A, b) : true, white = b.fl > 0 && (b.fl & 2) || (b.dying && (b.dt & 4));
    // the beam, under everything
    if (b.beam !== 0 && !b.dying) {
      const ca = b.beamA - Math.PI / 2;
      for (const ox of [-A.W, 0, A.W]) for (const oy of [-A.H, 0, A.H]) {
        const X = b.x + ox, Y = b.y + oy;
        if (b.beam < 0) { if (!ox && !oy) astroBossDash(ctx, A, b.x, b.y, b.beamA, BEAM_LEN, (b.t >> 2) & 1 ? '#A4E4FC' : '#3CBCFC', b.t >> 1, 6); continue; }
        if (X + BEAM_LEN < 0 || X - BEAM_LEN > A.W || Y + BEAM_LEN < 0 || Y - BEAM_LEN > A.H) continue;
        ctx.globalAlpha = 0.22 + 0.06 * Math.sin(b.t * 0.4);
        ctx.fillStyle = '#3CBCFC';
        ctx.beginPath(); ctx.moveTo(X, Y); ctx.arc(X, Y, BEAM_LEN, ca - BEAM_W, ca + BEAM_W); ctx.closePath(); ctx.fill();
        ctx.globalAlpha = 0.85; ctx.strokeStyle = '#A4E4FC'; ctx.lineWidth = 1;
        for (let s = BEAM_LEN - ((b.t * 2) % 22); s > 26; s -= 22) { ctx.beginPath(); ctx.arc(X, Y, s, ca - BEAM_W, ca + BEAM_W); ctx.stroke(); }
        ctx.globalAlpha = 1; ctx.strokeStyle = '#F8F8F8';
        for (const e of [-BEAM_W, BEAM_W]) { ctx.beginPath(); ctx.moveTo(X + Math.cos(ca + e) * 26, Y + Math.sin(ca + e) * 26); ctx.lineTo(X + Math.cos(ca + e) * BEAM_LEN, Y + Math.sin(ca + e) * BEAM_LEN); ctx.stroke(); }
      }
      // a tank caught in it: a ring closing in on it as the hurt comes
      for (const s of A.ships()) {
        const l = b.lock[s.p ? 1 : 0];
        if (l > 4) astroBossRing(ctx, A, s.x, s.y, 6 + (40 - l) * 0.4, (b.t >> 1) & 1 ? '#F83800' : '#F8F8F8', 0, 2);
      }
    }
    if (show) astroBossCopies(A, b.x, b.y, 48, (X, Y) => {
      // the pylons on their struts
      for (const p of b.pylons) {
        if (p.hp <= 0) continue;
        if (p.grow > 0 && (p.grow >> 2) & 1) continue;
        const a = p.a + b.pyA, ext = p.grow > 0 ? 1 - p.grow / 40 : 1;
        ctx.fillStyle = '#585858';
        for (let s = 28; s < 28 + 8 * ext; s++) ctx.fillRect(Math.round(X + Math.sin(a) * s) - 1, Math.round(Y - Math.cos(a) * s) - 1, 2, 2);
        art.pylon.draw(ctx, X + Math.sin(a) * (30 + 8 * ext), Y - Math.cos(a) * (30 + 8 * ext), a, p.fl > 0 && (p.fl & 2));
      }
      ctx.drawImage(white ? art.hullW : art.hull, Math.round(X - 36), Math.round(Y - 36));
      // the rim lights chase round; they turn yellow, then red as it takes damage
      const lc = ['', '#3CBCFC', '#F8B800', '#F83800'][b.phase];
      for (let i = 0; i < 16; i++) {
        if ((i + (b.t >> 3)) % 4) continue;
        const a = i / 16 * ASTRO_BOSS_TAU + 0.2;
        if (Math.abs(astroBossAngDiff(a, Math.PI)) < 0.3) continue;
        ctx.fillStyle = white ? '#F8F8F8' : lc; ctx.fillRect(Math.round(X + Math.sin(a) * 27.5) - 1, Math.round(Y - Math.cos(a) * 27.5) - 1, 2, 2);
      }
      // the bay door blinking: something's coming out
      if (b.bay > 0 && (b.bay >> 2) & 1) { ctx.fillStyle = '#F8F8F8'; ctx.fillRect(Math.round(X - 3), Math.round(Y + 18), 6, 10); }
      // the turrets; the ones about to fire glow
      for (let i = 0; i < 4; i++) {
        const [gx, gy, a] = gunPos(i);
        const charging = b.gun === 4 || b.gun === i;
        art.turret.draw(ctx, gx - b.x + X, gy - b.y + Y, a, white || (charging && b.gunT < 20 && (b.t & 2)));
      }
      // the dome and the eye in it, watching the nearest tank
      ctx.fillStyle = white ? '#F8F8F8' : '#4428BC'; ctx.beginPath(); ctx.arc(Math.round(X), Math.round(Y), 9.5, 0, ASTRO_BOSS_TAU); ctx.fill();
      if (!white) {
        ctx.fillStyle = '#6844FC'; ctx.fillRect(Math.round(X) - 6, Math.round(Y) - 6, 3, 2); ctx.fillRect(Math.round(X) - 7, Math.round(Y) - 4, 2, 2);
        const blink = b.t % 240 < 8, ex = Math.round(X + Math.sin(b.look) * 2), ey = Math.round(Y - Math.cos(b.look) * 2);
        if (blink) { ctx.fillStyle = '#9878F8'; ctx.fillRect(ex - 4, ey, 8, 1); }
        else {
          ctx.fillStyle = b.phase === 3 ? '#F87858' : '#F8F8F8'; ctx.fillRect(ex - 4, ey - 2, 8, 5); ctx.fillRect(ex - 3, ey - 3, 6, 7);
          ctx.fillStyle = b.phase === 3 ? '#A81000' : '#101010';
          ctx.fillRect(Math.round(ex + Math.sin(b.look) * 1.5) - 1, Math.round(ey - Math.cos(b.look) * 1.5) - 1, 3, 3);
        }
        ctx.fillStyle = '#F8F8F8'; ctx.fillRect(Math.round(X) - 5, Math.round(Y) - 7, 2, 1);
      }
      // the shield: a shimmering ring, ripples where shots bounce off
      if (shield() && !b.dying) {
        ctx.fillStyle = '#3CBCFC';
        const n = 72;
        for (let k = 0; k < n; k++) {
          const ph = (k + (b.t >> 2)) % 6;
          if (ph === 5) continue;
          const a = k / n * ASTRO_BOSS_TAU;
          ctx.fillStyle = ph === 0 ? '#F8F8F8' : (k & 1) ? '#3CBCFC' : '#0078F8';
          ctx.fillRect(Math.round(X + Math.sin(a) * 34), Math.round(Y - Math.cos(a) * 34), 1, 1);
        }
        for (const rp of b.rip) for (let k = -4; k <= 4; k++) {
          const a = rp.a + k * 0.08, rr = 34 + (12 - rp.t) * 0.3;
          ctx.fillStyle = '#F8F8F8'; ctx.fillRect(Math.round(X + Math.sin(a) * rr), Math.round(Y - Math.cos(a) * rr), 2, 1);
        }
      }
    });
    b.fx.draw(ctx, A);
    ctx.restore();
  };
  return b;
}

// =====================================================================
//  3. COMET WYRM: a serpent of rock and iron, a burning comet for a tail
// =====================================================================
function astroBossWyrmArt() {
  return astroBossArt('wyrm', () => {
    const n = astroBossNoise(23);
    // the head (snout up), its jaws shut / open; hot: red-hot iron (the last phase). A viper's wedge: a narrow snout,
    // broad jaws, horns swept back, a crest of rock down the middle, eyes under heavy brows
    const HW = [1.5, 2.5, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 8.5, 8.5, 8, 7.5, 6.5, 5.5, 4.5, 3.5];
    const head = (open, hot) => {
      const gap = y => (open && y < 10 ? 0.6 + (10 - y) * 0.38 : 0);
      const hwAt = y => (y < HW.length ? HW[y] + (open && y < 10 ? (10 - y) * 0.3 : 0) : 0);
      // drawn 1.3 times the design's size (the design in 23 x 25 cells, the sprite in pixels with a 1px outline)
      const HS = 1.3, CW = 30, CH = 33, Y = y => Math.floor((y + 0.5) / HS), DX = x => (x + 0.5 - CW / 2) / HS;
      const part = (x, y) => {
        if (x < 0 || y < 0 || x >= CW || y >= CH) return null;
        const yd = Y(y), ax = Math.abs(DX(x));
        if (ax < hwAt(yd)) return ax < gap(yd) ? (yd > 0 ? 'mouth' : null) : 'body';
        if (yd >= 12 && yd < 23) { const cx = 5.6 + (yd - 12) * 0.5, w = 2 - (yd - 12) * 0.13; if (Math.abs(ax - cx) < w) return 'horn'; }
        return null;
      };
      return astroBossPaint(CW, CH, (x, y) => {
        const what = part(x, y);
        if (!what) return null;
        const dx = DX(x), ax = Math.abs(dx), yd = Y(y);
        if (what === 'mouth') {
          if (yd <= 3 && ax > gap(yd) - 1.2) return '#F8F8F8';                 // fangs
          return yd < 5 ? '#F8D878' : (x + y) & 1 ? '#F83800' : '#F8B800';
        }
        if ([[-1, 0], [1, 0], [0, -1], [0, 1]].some(([i, j]) => { const o = part(x + i, y + j); return o !== what && !(what === 'body' && o === 'mouth'); })) return '#101010';
        const M = hot ? ['#F8D878', '#F87858', '#F83800', '#A81000'] : ['#F8F8F8', '#BCBCBC', '#7C7C7C', '#585858'];
        if (what === 'horn') return yd > 19 ? M[0] : M[1];
        if ((yd === 8 || yd === 9) && ax > 3.2 && ax < 6.4) return yd === 8 && ax > 5 ? '#F8F8F8' : hot ? '#F8F8F8' : '#B8F818';
        if (yd === 7 && ax > 2.8 && ax < 6.8) return '#101010';
        if (!open && yd === 2 && ax > 0.8 && ax < 2.2) return '#101010';
        if (ax < 1.6 && yd >= 4 && yd <= 19) { const v = n(x / 2.5, y / 2.5) + ((x + y) & 1) * 0.06; return v > 0.62 ? '#F0BC3C' : v > 0.38 ? '#C84C0C' : '#881400'; }
        if (yd === 12 || yd === 16) return M[3];
        if (ax > hwAt(yd) - 1.4) return dx < 0 ? M[2] : M[3];
        return dx < 0 ? (ax < 4 ? M[0] : M[1]) : (ax < 4 ? M[1] : M[2]);
      });
    };
    // an iron segment of radius r (pointing up): a dorsal plate, rivets, a stub of a spike each side
    const iron = (r, hot) => astroBossPaint(2 * r + 5, 2 * r + 3, (x, y) => {
      const dx = x + 0.5 - (r + 2.5), dy = y + 0.5 - (r + 1.5), d = Math.hypot(dx, dy), ax = Math.abs(dx);
      const M = hot ? ['#F8D878', '#F87858', '#F83800', '#A81000'] : ['#F8F8F8', '#BCBCBC', '#7C7C7C', '#585858'];
      const spike = ax >= r - 0.5 && ax < r + 2 && dy > -0.5 && dy < 1.5 - (ax - r) * 0.8;
      if (d > r + 0.3 && !spike) return null;
      if (spike && d > r - 0.7) return ax > r + 0.9 ? M[0] : '#101010';
      if (d > r - 0.7) return '#101010';
      if (Math.abs(ax - r * 0.6) < 0.7 && Math.abs(dy) < 0.7) return '#F8F8F8';
      if (ax < r * 0.4 && dy < r * 0.5) return ax > r * 0.4 - 1 ? M[3] : dy < -r * 0.4 ? M[0] : M[1];
      if (dy > r * 0.45) return M[3];
      return dx < 0 ? M[1] : M[2];
    });
    const rock = (r, seed) => astroBossPaint(2 * r + 2, 2 * r + 2, (x, y) => {
      const dx = x + 0.5 - (r + 1), dy = y + 0.5 - (r + 1), a = Math.atan2(dy, dx), d = Math.hypot(dx, dy) / (1 + 0.1 * Math.sin(a * 3 + seed) + 0.06 * Math.sin(a * 5 + seed * 2));
      if (d > r) return null;
      if (d > r - 1) return '#101010';
      const l = (-dx - dy) / r * 0.6 + n(x / 2 + seed * 5, y / 2) * 0.5 + ((x + y) & 1) * 0.06;
      if (Math.hypot(dx - r * 0.3, dy - r * 0.2) < r * 0.28) return '#503000';
      return l > 0.75 ? '#F0BC3C' : l > 0.35 ? '#C84C0C' : l > 0 ? '#881400' : '#503000';
    });
    const out = { head: astroBossRotor(head(false, false)), jaws: astroBossRotor(head(true, false)), headHot: astroBossRotor(head(false, true)), jawsHot: astroBossRotor(head(true, true)), iron: {}, hot: {}, rock: {}, rockW: {} };
    for (let r = 3; r <= 8; r++) {
      out.iron[r] = astroBossRotor(iron(r, false), 48); out.hot[r] = astroBossRotor(iron(r, true), 48);
      out.rock[r] = [0, 1].map(s => rock(r, s + r)); out.rockW[r] = out.rock[r].map(astroBossWhite);
    }
    return out;
  });
}

function astroBossWyrm(A, def) {
  const b = astroBossBase(A, def, 16, 80), k = b.k, art = astroBossWyrmArt(), SP = 10;
  const N = 12 + 2 * Math.min(3, k.L) + (Math.min(A.W, A.H) > 300 ? 4 : 0);
  const rockHp = Math.max(1, Math.round((3 + k.L) * ASTRO_BOSS_TUNE.hp));
  Object.assign(b, {
    hx: b.x, hy: b.y, ang: Math.random() * ASTRO_BOSS_TAU, sp: 0, mode: 'chase', mt: 0, cool: 200, nextAtk: 0, cu: null, ring: null,
    phi: 0, rho: 0, orbit: false, cdir: 1, tailT: 120, jaw: 0, parts: [], cap: (N + 3) * SP + 8,
    segs: Array.from({ length: N }, (_, i) => ({ kind: i % 2 ? 'iron' : 'rock', hp: rockHp, fl: 0, off: (i + 1) * SP, r: Math.round(8 - 4 * i / (N - 1)) })),
    tail: { fl: 0, off: (N + 1) * SP },
  });
  // its body laid out behind the head along a gentle curve
  b.trail = [];
  for (let i = 0; i < b.cap; i++) { const a = b.ang + Math.PI + Math.sin(i / 30) * 0.5; b.trail.push({ x: b.hx + Math.sin(a) * i, y: b.hy - Math.cos(a) * i }); }
  const shift = (dx, dy) => { b.hx += dx; b.hy += dy; for (const p of b.trail) { p.x += dx; p.y += dy; } if (b.cu) { b.cu.x += dx; b.cu.y += dy; } };
  const at = off => { const i = Math.max(0, Math.min(b.trail.length - 2, Math.floor(off))), f = off - i, p = b.trail[i], q = b.trail[i + 1] || p; return [p.x + (q.x - p.x) * f, p.y + (q.y - p.y) * f]; };
  const heading = off => { const [ax, ay] = at(Math.max(0, off - 3)), [bx, by] = at(off + 3); return astroBossAngTo(ax - bx, ay - by); };
  const move = () => {
    b.hx += Math.sin(b.ang) * b.sp; b.hy -= Math.cos(b.ang) * b.sp;
    let last = b.trail[0], d = Math.hypot(b.hx - last.x, b.hy - last.y);
    while (d >= 1) { last = { x: last.x + (b.hx - last.x) / d, y: last.y + (b.hy - last.y) / d }; b.trail.unshift(last); d -= 1; }
    if (b.trail.length > b.cap) b.trail.length = b.cap;
    if (b.hx < 0) shift(A.W, 0); else if (b.hx >= A.W) shift(-A.W, 0);
    if (b.hy < 0) shift(0, A.H); else if (b.hy >= A.H) shift(0, -A.H);
  };
  // where each piece is (wrapped): for hits, touches and drawing
  const place = () => {
    const parts = [{ type: 'head', x: b.hx, y: b.hy, r: 11, ang: b.ang }];
    b.segs.forEach((s, i) => { s.off += ((i + 1) * SP - s.off) * 0.12; const [x, y] = at(s.off); parts.push({ type: s.kind, x, y, r: s.r, ang: heading(s.off), seg: s }); });
    b.tail.off += ((b.segs.length + 1) * SP - 1 - b.tail.off) * 0.12;
    if (!b.tail.gone) { const [tx, ty] = at(b.tail.off); parts.push({ type: 'tail', x: tx, y: ty, r: 5, ang: heading(b.tail.off) }); }
    for (const p of parts) { p.x = astroBossMod(p.x, A.W); p.y = astroBossMod(p.y, A.H); }
    b.parts = parts; b.x = parts[0].x; b.y = parts[0].y;
  };
  place();
  const turnTo = (want, rate) => { const d = astroBossAngDiff(b.ang, want); b.ang += Math.max(-rate, Math.min(rate, d)); };
  const breakSeg = (s, rock = true) => {
    const p = b.parts.find(q => q.seg === s);
    b.segs = b.segs.filter(q => q !== s);
    if (!p) return;
    A.boom(p.x, p.y, 0); b.fx.burst(p.x, p.y, 8, ['#C84C0C', '#F0BC3C', '#503000'], 1.6, 22, 2);
    if (rock) astroBossRock(A, p.x, p.y, 2, Math.random() * ASTRO_BOSS_TAU, 0.7, 'stone');
    if (Math.random() < 0.6) A.drop(p.x, p.y, 'crystal');
    A.addScore(-1, 50);
  };
  b.onPhase = ph => {
    A.shake(24); b.jaw = 40; b.mode = 'chase'; b.cool = 80; b.ring = null; b.cu = null;
    if (ph === 2) { A.popup(b.x, b.y - 18, 'IT COILS!', '#58D854'); A.flash(3, '#58D854'); }
    if (ph === 3) {
      A.popup(b.x, b.y - 18, 'SHEDDING ITS SKIN!', '#F83800'); A.flash(5, '#F83800');
      let n = 0;
      for (const s of b.segs.slice()) if (s.kind === 'rock') breakSeg(s, n++ < 4);
    }
    astroBossDrops(A, b.x, b.y, 3, 20);
  };
  b.update = function (A) {
    b.A = A; b.t++; b.fx.update(); astroBossCheck(b);
    if (b.fl > 0) b.fl--; if (b.tail.fl > 0) b.tail.fl--; if (b.jaw > 0) b.jaw--;
    for (const s of b.segs) if (s.fl > 0) s.fl--;
    const tp = b.parts[b.parts.length - 1];
    if (!b.dying && b.t % 2 === 0) b.fx.add(tp.x + (Math.random() - 0.5) * 4, tp.y + (Math.random() - 0.5) * 4, -Math.sin(tp.ang) * 0.5, Math.cos(tp.ang) * 0.5, 22, ['#F8F8F8', '#A4E4FC', '#3CBCFC'][b.t % 3], 1 + (b.t & 1), 0.97);
    if (b.enter > 0) { b.enter--; b.sp = 0.4; turnTo(b.ang + 0.02, 0.02); move(); place(); return; }
    const ph = b.phase, hp = astroBossTarget(A, b.parts[0].x, b.parts[0].y);
    const chaseSp = (0.85 + 0.2 * (ph - 1)) * k.spd;
    if (b.dying) {
      // it blows up from the tail to the head
      b.dt++; b.sp *= 0.96; turnTo(b.ang + Math.sin(b.t * 0.2), 0.05);
      if (b.dt === 1) { const p = b.parts[b.parts.length - 1]; b.tail.gone = true; A.boom(p.x, p.y, 2); A.shake(10); b.fx.burst(p.x, p.y, 16, ['#F8F8F8', '#A4E4FC', '#3CBCFC'], 2.2, 26, 2); }
      move(); place();
      if (b.dt % 7 === 0) {
        if (b.segs.length) { const p = b.parts[b.parts.length - 1]; b.segs.pop(); A.boom(p.x, p.y, 1); A.shake(5); b.fx.burst(p.x, p.y, 6, ['#F8B800', '#7C7C7C'], 1.6, 20, 2); }
        else if (!b.headT) { b.headT = b.dt; A.flash(5, '#58D854'); }
      }
      if (b.headT && b.dt - b.headT >= 35) astroBossFinale(b, A, 8);
      return;
    }
    if (b.trans > 0) { b.trans--; b.sp += (0.3 - b.sp) * 0.1; turnTo(b.ang + 0.08, 0.06); move(); place(); return; }
    const want = hp ? astroBossAngTo(hp.dx, hp.dy) : b.ang;
    if (b.mode === 'chase') {
      // it slithers after the nearest tank
      b.sp += (chaseSp - b.sp) * 0.05;
      turnTo(want + Math.sin(b.t * 0.07) * 0.7, (0.03 + 0.008 * ph) * k.spd);
      if (--b.cool <= 0) {
        b.mt = 0;
        b.mode = ph >= 2 && b.nextAtk === 1 && hp ? 'mark' : 'rear';
        if (b.mode === 'mark') b.ring = { x: hp.s.x, y: hp.s.y };
        b.nextAtk = 1 - b.nextAtk;
      }
    } else if (b.mode === 'rear') {
      // it stops, rears back, jaws open, and a line shows where it's going to strike
      const REAR = [0, 50, 44, 38][ph];
      b.mt++; b.sp *= 0.88; b.jaw = 2;
      if (b.mt < REAR - 14) turnTo(want, 0.09);
      if (b.mt >= REAR) { b.mode = 'lunge'; b.mt = 0; A.shake(6); }
    } else if (b.mode === 'lunge') {
      b.mt++; b.sp = (4 + 0.4 * (ph - 1)) * k.spd; b.jaw = 2;
      if (b.mt >= 24) { b.mode = ph >= 2 ? 'spit' : 'chase'; b.mt = 0; b.cool = Math.round(170 / k.rate); }
    } else if (b.mode === 'spit') {
      // after the strike it turns and spits a fan of acid
      b.mt++; b.sp += (0.4 - b.sp) * 0.1; turnTo(want, 0.07); b.jaw = 2;
      if (b.mt === 26) {
        const n = (ph === 3 ? 5 : 3) + (k.L > 0 ? 2 : 0), [mx, my] = [b.hx + Math.sin(b.ang) * 13, b.hy - Math.cos(b.ang) * 13];
        for (let j = 0; j < n; j++) astroBossShot(A, mx, my, b.ang + (j - (n - 1) / 2) * 0.2, 1.6 * k.spd, { r: 3, life: 130, col: '#58D854' });
      }
      if (b.mt >= 40) { b.mode = 'chase'; b.cool = Math.round(150 / k.rate); }
    } else if (b.mode === 'mark') {
      // a ring marks where it means to coil; then it closes round that place
      b.mt++; b.sp += (2 * k.spd - b.sp) * 0.05;
      const n = A.near(b.parts[0].x, b.parts[0].y, b.ring.x, b.ring.y); turnTo(astroBossAngTo(n.dx, n.dy), 0.06);
      if (b.mt >= 50) {
        const m = A.near(b.parts[0].x, b.parts[0].y, b.ring.x, b.ring.y);
        b.cu = { x: b.hx + m.dx, y: b.hy + m.dy }; b.mode = 'coil'; b.mt = 0; b.orbit = false; b.rho = 64;
        b.cdir = astroBossAngDiff(b.ang, astroBossAngTo(m.dx, m.dy)) > 0 ? -1 : 1;
      }
    } else if (b.mode === 'coil') {
      b.mt++;
      const dx = b.hx - b.cu.x, dy = b.hy - b.cu.y, d = Math.hypot(dx, dy);
      if (!b.orbit) {
        // to the ring first
        const tx = b.cu.x + dx / (d || 1) * b.rho, ty = b.cu.y + dy / (d || 1) * b.rho;
        turnTo(astroBossAngTo(tx - b.hx, ty - b.hy) + b.cdir * 0.6, 0.12); b.sp = 2.4 * k.spd;
        if (Math.abs(d - b.rho) < 8 || b.mt > 90) { b.orbit = true; b.phi = astroBossAngTo(dx, dy); }
      } else {
        // round and round, tighter and tighter
        b.rho = Math.max(26, b.rho - 0.22 * k.spd); b.phi += b.cdir * (1.9 * k.spd) / b.rho;
        const tx = b.cu.x + Math.sin(b.phi) * b.rho, ty = b.cu.y - Math.cos(b.phi) * b.rho;
        b.ang = astroBossAngTo(tx - b.hx, ty - b.hy); b.sp = Math.min(3, Math.hypot(tx - b.hx, ty - b.hy));
      }
      if (b.mt >= 260) { b.mode = 'chase'; b.cool = Math.round(150 / k.rate); b.ring = null; b.cu = null; }
    }
    // the last phase: the comet in its tail shoots at the tanks
    if (ph === 3 && --b.tailT <= 0) {
      const t = b.parts[b.parts.length - 1], tg = astroBossTarget(A, t.x, t.y);
      if (tg) astroBossShot(A, t.x, t.y, astroBossAngTo(tg.dx, tg.dy), 1.4 * k.spd, { r: 2, life: 140, col: '#A4E4FC' });
      b.tailT = Math.round(100 / k.rate);
    }
    move(); place();
  };
  b.hit = function (x, y, r, dmg) {
    r = r > 0 ? r : 2; dmg = dmg > 0 ? dmg : 1;
    const A = b.A;
    if (b.enter > 0 || b.dying || b.dead) return false;
    let best = null, bd = 1e9;
    for (const p of b.parts) { const d = A.near(p.x, p.y, x, y).d - (p.type === 'head' ? 11 : p.type === 'tail' ? 6 : p.r + 1); if (d < r && d < bd) { bd = d; best = p; } }
    if (!best) return false;
    if (b.trans > 0) { astroBossClank(b, x, y); return true; }
    if (best.type === 'head') {
      const open = b.jaw > 0;
      b.fx.burst(x, y, open ? 6 : 3, open ? ['#F8D878', '#58D854', '#F8F8F8'] : ['#F8F8F8', '#BCBCBC'], 1.5, 12);
      astroBossDamage(b, open ? dmg * 2 : dmg);
    } else if (best.type === 'tail') {
      b.tail.fl = 6; b.fx.burst(x, y, 6, ['#F8F8F8', '#A4E4FC', '#3CBCFC'], 1.6, 14);
      astroBossDamage(b, dmg * 2);
    } else if (best.type === 'rock') {
      best.seg.hp -= dmg; best.seg.fl = 5; b.fx.burst(x, y, 3, ['#C84C0C', '#F0BC3C'], 1.2, 10);
      if (best.seg.hp <= 0) breakSeg(best.seg);
    } else astroBossClank(b, x, y);
    return true;
  };
  b.touches = function (x, y, r) {
    if (b.enter > 0 || b.dying || b.dead) return false;
    for (const p of b.parts) if (b.A.near(p.x, p.y, x, y).d < (p.type === 'head' ? 10 : p.r) + r) return true;
    return false;
  };
  b.draw = function (ctx, A) {
    ctx.save(); ctx.imageSmoothingEnabled = false;
    const show = b.enter > 0 ? astroBossWarpIn(ctx, A, b) : true;
    // the coil's ring and the strike's line
    if (b.ring && !b.dying) {
      const c = b.mode === 'mark' ? ((b.t >> 2) & 1 ? '#F83800' : '#F8B800') : '#C84C0C';
      astroBossRing(ctx, A, b.ring.x, b.ring.y, b.mode === 'coil' ? b.rho : 64, c, b.t >> 1, 2);
    }
    if (b.mode === 'rear' && !b.dying) {
      const REAR = [0, 50, 44, 38][b.phase], locked = b.mt >= REAR - 14;
      astroBossDash(ctx, A, b.x, b.y, b.ang, 110, locked ? ((b.t >> 1) & 1 ? '#F8F8F8' : '#F83800') : '#F87858', b.t >> 1, 8);
    }
    if (show) {
      const hot = b.phase === 3, ws = b.dying && (b.dt & 4);
      for (let i = b.parts.length - 1; i >= 0; i--) {
        const p = b.parts[i];
        astroBossCopies(A, p.x, p.y, 16, (X, Y) => {
          if (p.type === 'tail') {
            // the comet: a white-hot core in a blue blaze, flickering
            const fl = b.tail.fl > 0 && (b.tail.fl & 2), pulse = (b.t >> 2) & 1, tg = astroBossTailGlow(b);
            ctx.fillStyle = fl ? '#F8F8F8' : tg ? '#F8F8F8' : '#0078F8'; ctx.beginPath(); ctx.arc(Math.round(X), Math.round(Y), 5 + pulse, 0, ASTRO_BOSS_TAU); ctx.fill();
            ctx.fillStyle = fl ? '#F8F8F8' : '#3CBCFC'; ctx.beginPath(); ctx.arc(Math.round(X), Math.round(Y), 3.5, 0, ASTRO_BOSS_TAU); ctx.fill();
            ctx.fillStyle = '#F8F8F8'; ctx.fillRect(Math.round(X) - 1, Math.round(Y) - 1, 3, 3);
          } else if (p.type === 'head') {
            const ro = b.jaw > 0 ? (hot ? art.jawsHot : art.jaws) : (hot ? art.headHot : art.head);
            ro.draw(ctx, X, Y, p.ang, (b.fl > 0 && (b.fl & 2)) || ws);
          } else if (p.type === 'iron') {
            (hot ? art.hot : art.iron)[p.r].draw(ctx, X, Y, p.ang, ws);
          } else {
            const im = (p.seg.fl > 0 && (p.seg.fl & 2)) || ws ? art.rockW[p.r][i & 1] : art.rock[p.r][i & 1];
            ctx.drawImage(im, Math.round(X - im.width / 2), Math.round(Y - im.height / 2));
          }
        });
      }
    }
    b.fx.draw(ctx, A);
    ctx.restore();
  };
  return b;
}
// the tail glows white just before it shoots (last phase)
function astroBossTailGlow(b) { return b.phase === 3 && b.tailT < 20 && (b.t & 2); }

// =====================================================================
//  the list astro.js reads: they come at waves 5, 10, 15, and again harder each loop (20, 25, 30 ...)
// =====================================================================
const ASTRO_BOSSES = [
  { key: 'golem', name: 'CINDER COLOSSUS', wave: 5, make(A) { return astroBossGolem(A, { key: 'golem', name: 'CINDER COLOSSUS' }); } },
  { key: 'mother', name: 'VOID MATRIARCH', wave: 10, make(A) { return astroBossMother(A, { key: 'mother', name: 'VOID MATRIARCH' }); } },
  { key: 'wyrm', name: 'COMET WYRM', wave: 15, make(A) { return astroBossWyrm(A, { key: 'wyrm', name: 'COMET WYRM' }); } },
];
