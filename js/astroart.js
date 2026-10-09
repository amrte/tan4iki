'use strict';
// =====================================================================
//  ASTRO TANKS' title picture (intro.js shows it; the helpers are introart.js's): a tank adrift in deep space.
//  A starfield in three layers sliding past at three speeds, a nebula, a ringed planet and a cratered moon. Your
//  tank turns and thrusts with a flame behind it; a big rock comes tumbling in and is shot into two, and one of those
//  into two more, debris flying; a flying saucer crosses the top firing at you and is blown up; an iron rock takes
//  two clanging hits and splits on the third. A few more rocks wander across, wrapping round the edges.
//  Everything is worked out from the frame within an 8 s loop (the title screen's own length): it repeats seamlessly.
//  Angles as in the game: 0 = up, growing clockwise; a heading a points along (sin a, -cos a).
// =====================================================================

const ASTRO_ART_P = 480;   // frames a loop
// a rock's five tones, light to dark
const ASTRO_ART_ROCKS = {
  stone: ['#E4D4BC', '#B49C80', '#806C58', '#54443C', '#241C1C'],
  iron: ['#DCE4F4', '#98A8C4', '#687890', '#3C4860', '#181C30'],
  ice: ['#F8F8F8', '#A4E4FC', '#5CB0E0', '#2C70A8', '#0C3460'],
  crystal: ['#E8C8F8', '#B488E0', '#7C54B0', '#4C2C78', '#200C38'],
  magma: ['#C8A890', '#8C6450', '#5C3C30', '#3C2420', '#140C0C'],
};

const AstroArt = {
  P: ASTRO_ART_P,
  rocks: new Map(),
  tanks: new Map(),
  tankSrc: new Map(),
  plan: null,

  // ---------------------------------------------------------------- sprites
  // a rock of radius R turned to ang: lit from the top left whatever its turn, its craters and grain turning with
  // it (so it tumbles); 32 turns, cached
  rock(kind, R, seed, ang) {
    const n = 32, ai = ((Math.round(ang / (Math.PI * 2) * n) % n) + n) % n, key = kind + R + '/' + seed + '/' + ai;
    let img = this.rocks.get(key);
    if (img) return img;
    const cols = ASTRO_ART_ROCKS[kind], r = seeded(seed * 7919 + 17);
    const ph = [r() * 6.3, r() * 6.3, r() * 6.3], amp = [0.07 + r() * 0.06, 0.05 + r() * 0.05, 0.03 + r() * 0.03];
    const rad = th => R * (0.86 + amp[0] * Math.sin(2 * th + ph[0]) + amp[1] * Math.sin(3 * th + ph[1]) + amp[2] * Math.sin(5 * th + ph[2]));
    const craters = [];
    for (let k = 0; k < (R > 10 ? 4 : R > 6 ? 2 : 1); k++) { const a = r() * 6.3, d = r() * 0.55 * R; craters.push([Math.cos(a) * d, Math.sin(a) * d, Math.max(1.4, R * (0.16 + r() * 0.14))]); }
    const O = Math.ceil(R * 2.3) + 3, a = ai * Math.PI * 2 / n, ca = Math.cos(a), sa = Math.sin(a);
    img = makeCanvas(O, O);
    const ic = img.getContext('2d'), id = ic.createImageData(O, O), px = id.data;
    for (let j = 0; j < O; j++) for (let i = 0; i < O; i++) {
      const ox = i + 0.5 - O / 2, oy = j + 0.5 - O / 2, u = ca * ox + sa * oy, v = -sa * ox + ca * oy;
      const d = Math.hypot(u, v), rr = rad(Math.atan2(v, u));
      if (d > rr) continue;
      const nz = Math.sqrt(Math.max(0, 1 - (d / rr) * (d / rr)));
      let l = -ox / rr * 0.5 - oy / rr * 0.55 + nz * 0.7 + (IA.hash(Math.floor(u + 40), Math.floor(v + 40), seed) - 0.5) * 0.3;
      for (const [cu, cv, cr] of craters) {
        const du = u - cu, dv = v - cv, dd = Math.hypot(du, dv);
        if (dd >= cr) continue;
        const sx = ca * du - sa * dv, sy = sa * du + ca * dv;   // back to the picture's way up: the bowl lit on its far side
        l += (sx * 0.5 + sy * 0.55) / cr * 0.8 - 0.2;
        if (dd > cr - 1) l += 0.12;
      }
      l += (bayer(i, j) - 0.5) * 0.22;
      let tone = l > 0.85 ? 0 : l > 0.45 ? 1 : l > 0.05 ? 2 : l > -0.35 ? 3 : 4;
      if (d > rr - 1.1) tone = Math.max(tone, l > 0.4 ? 3 : 4);   // a dark rim, NES style
      let col = cols[tone];
      if (kind === 'magma' && tone < 4) {   // glowing cracks
        const q = Math.abs(IA.noise2(u / 3 + 9, v / 3 + 9, seed) - 0.5);
        if (q < 0.035) col = '#F8D838'; else if (q < 0.07) col = '#F87818';
      }
      if (kind === 'crystal' && tone > 0 && tone < 4 && IA.hash(Math.floor(u / 2 + 40), Math.floor(v / 2 + 40), seed + 5) < 0.1) col = tone < 2 ? '#F8F8F8' : '#58F8F8';
      const c3 = IA.rgb(col), o = (j * O + i) * 4;
      px[o] = c3[0]; px[o + 1] = c3[1]; px[o + 2] = c3[2]; px[o + 3] = 255;
    }
    ic.putImageData(id, 0, 0);
    this.rocks.set(key, img);
    return img;
  },
  drawRock(c, kind, R, seed, ang, x, y, flash) {
    const img = this.rock(kind, R, seed, ang);
    c.drawImage(img, Math.round(x - img.width / 2), Math.round(y - img.height / 2));
    if (flash) Pix.disc(c, Math.round(x), Math.round(y), Math.max(1, Math.round(R * 0.7)), '#F8F8F8');
  },

  // the game's top-down tank (introart.js's, gun up) turned to ang, size px across: sampled pixel by pixel so it
  // stays crisp; 64 turns, cached
  tank(pal, ang, f, size) {
    const a64 = ((Math.round(ang / (Math.PI * 2) * 64) % 64) + 64) % 64, key = pal + a64 + '/' + (f & 1) + '/' + size;
    let img = this.tanks.get(key);
    if (img) return img;
    let src = this.tankSrc.get(pal + (f & 1));
    if (!src) {
      const cv = makeCanvas(28, 28), x = cv.getContext('2d');
      IA.topTank(x, 14, 14, 0, pal, f & 1);
      src = x.getImageData(0, 0, 28, 28).data;
      this.tankSrc.set(pal + (f & 1), src);
    }
    const O = Math.ceil(size * 1.45) + 2, a = a64 * Math.PI / 32, ca = Math.cos(a), sa = Math.sin(a), k = 28 / size;
    img = makeCanvas(O, O);
    const ic = img.getContext('2d'), id = ic.createImageData(O, O), d = id.data;
    for (let j = 0; j < O; j++) for (let i = 0; i < O; i++) {
      const ox = i + 0.5 - O / 2, oy = j + 0.5 - O / 2;
      const sx = Math.floor((ca * ox + sa * oy) * k + 14), sy = Math.floor((-sa * ox + ca * oy) * k + 14);
      if (sx < 0 || sy < 0 || sx > 27 || sy > 27) continue;
      const s = (sy * 28 + sx) * 4, o = (j * O + i) * 4;
      if (src[s + 3] < 128) continue;
      d[o] = src[s]; d[o + 1] = src[s + 1]; d[o + 2] = src[s + 2]; d[o + 3] = 255;
    }
    ic.putImageData(id, 0, 0);
    this.tanks.set(key, img);
    return img;
  },

  // the flying saucer (21 x 10), its lights chasing round
  saucer(c, x, y, f) {
    x = Math.round(x) - 10; y = Math.round(y) - 5;
    const R = (dx, dy, w, h, col) => Pix.rect(c, x + dx, y + dy, w, h, col);
    R(7, 0, 7, 1, '#3CBCFC'); R(6, 1, 9, 1, '#A4E4FC'); R(5, 2, 11, 2, '#3CBCFC'); R(7, 1, 2, 1, '#F8F8F8'); R(6, 2, 2, 1, '#F8F8F8'); R(14, 2, 2, 2, '#0078B8');
    R(3, 4, 15, 1, '#F8F8F8'); R(1, 5, 19, 1, '#BCBCBC'); R(0, 6, 21, 1, '#BCBCBC'); R(1, 7, 19, 1, '#7C7C7C'); R(4, 8, 13, 1, '#5C5C5C'); R(7, 9, 7, 1, '#3C3C3C');
    R(1, 5, 2, 1, '#F8F8F8'); R(18, 6, 3, 1, '#7C7C7C');
    for (let k = 0; k < 5; k++) R(2 + k * 4, 6, 2, 1, (k + (f >> 3)) % 5 === 0 ? '#F8F8F8' : (k + (f >> 3)) & 1 ? '#F83800' : '#F8D838');
  },

  // a shot going along (dx, dy) (a unit step), a glowing trail behind it
  shot(c, x, y, dx, dy, cols = ['#F8F8F8', '#F8D838', '#F87818', '#A82800']) {
    for (let k = 7; k >= 1; k--) Pix.rect(c, x - dx * k * 1.3, y - dy * k * 1.3, 1, 1, cols[Math.min(3, 1 + (k >> 1))]);
    Pix.rect(c, x - 0.5, y - 0.5, 2, 2, cols[0]);
  },

  // pieces of rock flying out of (x, y), age frames ago; they tumble (a pixel or two) and blink out
  debris(c, x, y, age, cols, seed, n = 12, speed = 1) {
    if (age < 0 || age > 70) return;
    const r = seeded(seed * 31 + 7);
    for (let k = 0; k < n; k++) {
      const a = r() * Math.PI * 2, v = (0.35 + r() * 0.9) * speed, life = 36 + r() * 34, s = r() < 0.4 ? 2 : 1, col = cols[1 + Math.floor(r() * 3)];
      if (age > life || (age > life - 10 && (age >> 1) & 1)) continue;
      const px = x + Math.cos(a) * v * age, py = y + Math.sin(a) * v * age;
      Pix.rect(c, px, py, s, (s === 2 && (age + k) & 4) ? 1 : s, col);
    }
  },
  // a burst of rock dust: a dithered ring opening out and thinning
  dust(c, x, y, age, R, col) {
    if (age < 0 || age > 28) return;
    const rr = R * 0.6 + age * 0.9, a = 0.7 * (1 - age / 28);
    if (age < 3) Pix.disc(c, Math.round(x), Math.round(y), Math.round(R * 0.9), age ? '#F8D838' : '#F8F8F8');
    for (let k = 0; k < 28; k++) {
      const th = k / 28 * Math.PI * 2 + IA.hash(k, 3) * 0.3, w = rr * (0.8 + IA.hash(k, 4) * 0.35);
      const px = Math.round(x + Math.cos(th) * w), py = Math.round(y + Math.sin(th) * w);
      if (bayer(px, py) < a) Pix.rect(c, px, py, 1, 1, col);
    }
  },

  // ---------------------------------------------------------------- the film, worked out once
  // where the tank is (it drifts round a little loop) and which way the stars stream (it flies right)
  tankAt(f) {
    const q = f / this.P * Math.PI * 2;
    return { x: 104 + 9 * Math.sin(q), y: 72 + 5 * Math.sin(2 * q) };
  },
  thrustAng(f) {
    const q = f / this.P * Math.PI * 2, vx = 0.5 + 9 * Math.cos(q) * Math.PI * 2 / this.P, vy = 10 * Math.cos(2 * q) * Math.PI * 2 / this.P - 0.12;
    return Math.atan2(vx, -vy);
  },
  build() {
    const P = this.P, W = IPW;
    // the rocks and the saucer that get shot: where they are at frame f (they may be asked before they exist)
    const lin = (f0, x0, y0, vx, vy) => f => ({ x: x0 + vx * (f - f0), y: y0 + vy * (f - f0) });
    const A = { kind: 'stone', R: 13, seed: 3, spin: 0.021, path: lin(0, W + 20, 24, -0.62, 0.14), from: 0 };
    const B = { kind: 'iron', R: 8, seed: 11, spin: -0.045, path: lin(230, -12, 120, 0.5, -0.2), from: 230, hp: 3 };
    const U = { saucer: true, R: 8, from: 150, path: f => ({ x: -14 + 1.2 * (f - 150), y: 22 + 4 * Math.sin((f - 150) / 14) }) };
    const objs = [A, B, U];
    // the tank's way through the loop: thrusting (facing where it flies), turning, aiming at something
    const segs = [
      { a: 0, b: 34, kind: 'thrust' }, { a: 34, b: 52, kind: 'turn' }, { a: 52, b: 68, kind: 'aim', at: A },
      { a: 68, b: 104, kind: 'turn' }, { a: 104, b: 118, kind: 'aim', at: 'M1' }, { a: 118, b: 140, kind: 'turn' },
      { a: 140, b: 182, kind: 'thrust' }, { a: 182, b: 206, kind: 'turn' }, { a: 206, b: 262, kind: 'aim', at: U },
      { a: 262, b: 290, kind: 'turn' }, { a: 290, b: 345, kind: 'aim', at: B }, { a: 345, b: 375, kind: 'turn' },
      { a: 375, b: P, kind: 'thrust' }];
    const fires = [[60, A], [112, 'M1'], [254, U], [300, B], [318, B], [336, B]];
    const SPEED = 4, MUZ = 12;
    const named = {};
    const target = t => (typeof t === 'string' ? named[t] : t);
    // which way to point to hit o, fired from (x, y) at frame f
    const lead = (o, f, x, y) => {
      let tau = 0;
      for (let k = 0; k < 8; k++) { const p = o.path(f + tau); tau = Math.hypot(p.x - x, p.y - y) / SPEED; }
      const p = o.path(f + tau);
      return Math.atan2(p.x - x, -(p.y - y));
    };
    const ease = q => q * q * (3 - 2 * q);
    const angAt = f => {
      const s = segs.find(g => f >= g.a && f < g.b) || segs[0], T = this.tankAt(f);
      if (s.kind === 'thrust') return this.thrustAng(f);
      if (s.kind === 'aim') return lead(target(s.at), f, T.x, T.y);
      const i = segs.indexOf(s), pv = segs[(i + segs.length - 1) % segs.length], nx = segs[(i + 1) % segs.length];
      const end = g => (g === pv ? s.a - 1 : (s.b) % P);
      const a0 = angAt(end(pv)), a1 = angAt(end(nx));
      let d = a1 - a0;
      d = ((d + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
      return a0 + d * ease((f - s.a + 1) / (s.b - s.a + 1));
    };
    // fire the shots in turn: each flies until it hits what it was aimed at (which may split)
    const shots = [], events = [];
    const split = (o, f, p, kids) => {
      o.until = f;
      events.push({ f, x: p.x, y: p.y, R: o.R, kind: o.kind || 'saucer', seed: (o.seed || 5) + f });
      for (const [name, kind, R, dvx, dvy, seed, spin] of kids) {
        const v0 = o.path(f + 1), vx = v0.x - p.x + dvx, vy = v0.y - p.y + dvy, k = { kind, R, seed, spin, from: f, path: lin(f, p.x, p.y, vx, vy) };
        objs.push(k);
        if (name) named[name] = k;
      }
    };
    for (const [f0, tg] of fires) {
      const o = target(tg), T = this.tankAt(f0), a = angAt(f0), dx = Math.sin(a), dy = -Math.cos(a);
      const s = { f0, x0: T.x + dx * MUZ, y0: T.y + dy * MUZ, dx, dy, f1: f0 + 60, hit: null };
      for (let f = f0; f < f0 + 60; f++) {
        const x = s.x0 + dx * SPEED * (f - f0), y = s.y0 + dy * SPEED * (f - f0), p = o.path(f);
        if (Math.hypot(p.x - x, p.y - y) < o.R + 2) { s.f1 = f; s.hit = o; break; }
      }
      shots.push(s);
      if (!s.hit) continue;
      const p = o.path(s.f1);
      if (o === A) split(o, s.f1, p, [['M1', 'stone', 8, -0.1, -0.5, 21, -0.05], ['M2', 'stone', 8, 0.15, 0.55, 22, 0.04]]);
      else if (o === named.M1) split(o, s.f1, p, [[null, 'stone', 4.5, 0.55, -0.25, 31, 0.09], [null, 'stone', 4.5, -0.5, -0.5, 32, -0.07]]);
      else if (o === U) { o.until = s.f1; events.push({ f: s.f1, x: p.x, y: p.y, R: 10, kind: 'saucer', seed: 9 }); }
      else if (o === B) {
        o.hits = (o.hits || []).concat(s.f1);
        if (o.hits.length >= o.hp) split(o, s.f1, p, [[null, 'iron', 4.5, -0.45, -0.45, 41, 0.08], [null, 'iron', 4.5, 0.35, 0.4, 42, -0.1]]);
        else events.push({ f: s.f1, x: p.x, y: p.y, R: 3, kind: 'clink', seed: s.f1 });
      }
    }
    // the saucer shoots back (and misses): from where it is, at where the tank is, a little off
    const ufoShots = [[196, 16], [228, -18]].map(([f0, off]) => {
      const p = U.path(f0), T = this.tankAt(f0 + 30), dx = T.x + off - p.x, dy = T.y - p.y, d = Math.hypot(dx, dy);
      return { f0, x0: p.x, y0: p.y + 4, dx: dx / d, dy: dy / d, f1: f0 + 160 };
    });
    // the tank's heading every frame
    const ang = [];
    for (let f = 0; f < P; f++) ang.push(angAt(f));
    const thrust = f => { const s = segs.find(g => f >= g.a && f < g.b); return s && s.kind === 'thrust'; };
    return { ang, thrust, shots, ufoShots, events, objs, SPEED };
  },

  // ---------------------------------------------------------------- the picture
  draw(c, t) {
    const W = IPW, H = IPH, P = this.P, f = t % P, A = this.plan || (this.plan = this.build());
    const mod = (v, m) => ((v % m) + m) % m;
    // the depths: black to deep blue, a violet nebula and a teal one
    c.drawImage(IA.layer('astro-bg', b => {
      IA.grad(b, 0, 0, W, H, ['#000000', '#000008', '#04041C', '#080828']);
      IA.cloud(b, 84, 34, 70, 20, ['#0C0420', '#180830', '#240C44', '#341058'], 4);
      IA.cloud(b, 52, 96, 40, 16, ['#020C14', '#04182C', '#082438'], 7);
      IA.cloud(b, 150, 22, 30, 10, ['#100418', '#1C0828'], 2);
    }), 0, 0);
    // the stars, three layers at three speeds (the far ones a 120 px pattern so they too come round in a loop)
    for (const [n, seed, period, v, col, tw] of [[40, 51, 120, 0.25, '#5C5C7C', 1], [34, 52, 240, 0.5, '#BCBCBC', 1], [12, 53, 240, 1, '#F8F8F8', 0]]) {
      const r = seeded(seed);
      for (let k = 0; k < n; k++) {
        const x0 = r() * period, y = Math.floor(r() * H), ph = Math.floor(r() * 96), x = mod(x0 - v * f, period);
        if (tw && (f + ph) % 96 < 8) continue;
        for (let xx = x; xx < W; xx += period) {
          Pix.rect(c, xx, y, 1, 1, col);
          if (v < 1) continue;
          if (k % 4) Pix.rect(c, xx + 1, y, 2, 1, '#5C5C7C');   // the near ones streak a little
          else for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) Pix.rect(c, xx + dx, y + dy, 1, 1, '#7C7C9C');
        }
      }
    }
    // the ringed planet (its ring behind it, it, the ring in front casting a shadow) and the moon
    c.drawImage(IA.layer('astro-sky', b => {
      const px = 198, py = 112, pr = 25, tilt = -0.32, ct = Math.cos(tilt), st = Math.sin(tilt);
      const ring = (x, y) => {   // in the ring's plane: how far out (in planet radii), and which side
        const dx = x + 0.5 - px, dy = y + 0.5 - py, u = ct * dx + st * dy, v = (-st * dx + ct * dy) / 0.24;
        return { rho: Math.hypot(u, v) / pr, front: v > 0 };
      };
      const onRing = q => q.rho > 1.3 && q.rho < 2.05 && !(q.rho > 1.66 && q.rho < 1.74);
      const ringCol = (q, x, y) => (q.rho < 1.48 ? (bayer(x, y) < 0.5 ? '#8C7C60' : '#5C5040') : q.rho < 1.66 ? '#D8C8A0' : q.rho < 1.9 ? '#B4A07C' : bayer(x, y) < 0.5 ? '#8C7C60' : null);
      IA.paint(b, px - 2.2 * pr, py - pr - 6, 4.4 * pr, 2 * pr + 12, (x, y) => { const q = ring(x, y); return onRing(q) && !q.front ? ringCol(q, x, y) : null; });
      IA.ball(b, px, py, pr, pr, ['#D8F0F8', '#88C8E0', '#4C8CC0', '#2C4C8C', '#141C44'], (x, y) => {
        const band = Math.sin((y - py + (x - px) * 0.3) / 3.2) + 0.6 * Math.sin((y - py + (x - px) * 0.3) / 1.3 + 2);
        const sh = ring(x, y - 3), shadow = onRing(sh) && sh.front ? -0.45 : 0;
        return band * 0.1 + shadow;
      });
      IA.paint(b, px - 2.2 * pr, py - 8, 4.4 * pr, pr + 16, (x, y) => { const q = ring(x, y); return onRing(q) && q.front ? ringCol(q, x, y) : null; });
      // the moon, its craters
      IA.ball(b, 30, 22, 9, 9, ['#F8F8F8', '#C8C8D0', '#9C9CA8', '#5C5C6C', '#2C2C38']);
      for (const [x, y, r] of [[27, 19, 2], [33, 25, 1], [25, 26, 1], [35, 18, 1]]) { Pix.disc(b, x, y, r, '#7C7C8C'); Pix.rect(b, x - r, y - 1, 1, 1, '#5C5C6C'); }
      // a small far planet
      IA.ball(b, 150, 10, 3, 3, ['#F8D8A8', '#E8A060', '#C06838', '#7C3820', '#3C1810']);
    }), 0, 0);

    // rocks wandering through, wrapping round the edges (they take whole laps in a loop)
    const SPANX = W + 40, SPANY = H + 40;
    for (const [kind, R, seed, x0, y0, kx, ky, sp] of [['crystal', 7, 61, 40, 110, 1, 0, 1], ['ice', 5, 62, 200, 6, -2, 0, -2], ['magma', 6, 63, 228, 48, 0, 1, 2]]) {
      const x = mod(x0 + kx * SPANX * f / P + 20, SPANX) - 20, y = mod(y0 + ky * SPANY * f / P + 20, SPANY) - 20;
      this.drawRock(c, kind, R, seed, sp * Math.PI * 2 * f / P, x, y);
    }
    // the rocks being shot, their pieces, the saucer (an event of the last loop still showing too: age + P)
    const ages = from => [f - from, f + P - from].filter(a => a >= 0);
    for (const o of A.objs) for (const age of ages(o.from)) {
      const at = o.from + age;
      if (o.until !== undefined && at >= o.until) continue;
      const p = o.path(at);
      if (p.x < -30 || p.x > W + 30 || p.y < -30 || p.y > H + 30) continue;
      if (o.saucer) { this.saucer(c, p.x, p.y, at); continue; }
      const flash = o.hits && o.hits.some(h => at - h >= 0 && at - h < 3);
      this.drawRock(c, o.kind, o.R, o.seed, o.spin * at, p.x, p.y, flash);
    }
    // the saucer's shots
    for (const s of A.ufoShots) for (const age of ages(s.f0)) {
      if (age > s.f1 - s.f0) continue;
      const x = s.x0 + s.dx * 2.2 * age, y = s.y0 + s.dy * 2.2 * age;
      if (x > -8 && x < W + 8 && y > -8 && y < H + 8) this.shot(c, x, y, s.dx * 0.8, s.dy * 0.8, [(age >> 1) & 1 ? '#F8F8F8' : '#F878F8', '#F878F8', '#D800CC', '#7C0868']);
      if (age < 4) Pix.disc(c, Math.round(s.x0), Math.round(s.y0), 2 - (age >> 1), '#F878F8');
    }

    // the tank: exhaust puffs behind it while it thrusts, its flame, the tank itself, the flash of a shot
    const T = this.tankAt(f), a = A.ang[f], hx = Math.sin(a), hy = -Math.cos(a), pal = Config.playerPal(0);
    for (let k = 0; k < 9; k++) {
      const e = (f - (f % 3)) - k * 3, ee = mod(e, P), age = f - e;
      if (!A.thrust(ee)) continue;
      const Te = this.tankAt(ee), ae = A.ang[ee], ex = Math.sin(ae), ey = -Math.cos(ae), j = IA.hash(ee, 9) - 0.5;
      const x = Te.x - ex * (12 + age * 1.1) - ey * j * 3 - 0.5 * age, y = Te.y - ey * (12 + age * 1.1) + ex * j * 3;
      Pix.rect(c, x, y, age < 9 ? 2 : 1, age < 9 ? 2 : 1, ['#F8D838', '#F87818', '#A82800', '#5C1000'][Math.min(3, age >> 3)]);
    }
    if (A.thrust(f)) {
      const L = 5 + ((f * 7) % 5 > 2 ? 2 : 0) + (f & 1);
      for (let k = 0; k < L; k++) {
        const x = T.x - hx * (11 + k), y = T.y - hy * (11 + k), w = k < 2 ? 1 : k < L - 2 ? 1 : 0;
        const col = k < 2 ? '#F8F8F8' : k < 4 ? '#F8D838' : k < L - 1 ? '#F87818' : '#D82800';
        for (let s = -w; s <= w; s++) Pix.rect(c, x - hy * s, y + hx * s, 1, 1, Math.abs(s) === w && w ? '#F87818' : col);
      }
    }
    const img = this.tank(pal, a, A.thrust(f) ? (f >> 2) : 0, 24);
    c.drawImage(img, Math.round(T.x - img.width / 2), Math.round(T.y - img.height / 2));
    for (const s of A.shots) for (const age of ages(s.f0)) if (age < 4) IA.flash(c, s.x0, s.y0, s.dx, s.dy, age);

    // the tank's shots
    for (const s of A.shots) for (const age of ages(s.f0)) {
      if (age > s.f1 - s.f0 || age < 1) continue;
      const x = s.x0 + s.dx * A.SPEED * age, y = s.y0 + s.dy * A.SPEED * age;
      if (x > -8 && x < W + 8 && y > -8 && y < H + 8) this.shot(c, x, y, s.dx, s.dy);
    }
    // what the shots did: rocks bursting into dust and pieces, an iron rock clanging, the saucer blowing up
    for (const e of A.events) for (const age of ages(e.f)) {
      if (e.kind === 'clink') { if (age < 14) IA.sparks(c, e.x, e.y, age / 14, 8, e.seed, ['#F8F8F8', '#A4E4FC', '#5C94FC']); continue; }
      if (e.kind === 'saucer') {
        IA.boom(c, e.x, e.y, age, 14, 3);
        this.debris(c, e.x, e.y, age, ['#F8F8F8', '#BCBCBC', '#7C7C7C', '#3CBCFC', '#F83800'], e.seed, 14, 1.3);
        continue;
      }
      const cols = ASTRO_ART_ROCKS[e.kind];
      this.dust(c, e.x, e.y, age, e.R, cols[2]);
      this.debris(c, e.x, e.y, age, cols, e.seed, e.R > 10 ? 16 : 10, e.R > 10 ? 1.1 : 0.9);
      if (age < 16) IA.sparks(c, e.x, e.y, age / 16, 10, e.seed);
    }

    // the saucer's points, floating up
    for (const e of A.events) for (const age of ages(e.f)) {
      if (e.kind !== 'saucer' || age < 6 || age > 56 || (age > 46 && (age & 2))) continue;
      const x = Math.round(e.x - 8), y = Math.round(e.y - 6 - (age - 6) * 0.3);
      Pix.rect(c, x - 1, y - 1, 17, 7, '#000000');
      IA.digits(c, '1000', x, y, (age >> 2) & 1 ? '#F8F8F8' : '#F8D838');
    }
    // the wave and the tanks in reserve
    IA.tag(c, 'WAVE 4', 6, 126, '#F8F8F8');
    for (let k = 0; k < 3; k++) IA.miniTank(c, 64 + k * 13, 129, 0, pal);
  },
};

INTRO_SCENES.astro = (c, t) => AstroArt.draw(c, t);
