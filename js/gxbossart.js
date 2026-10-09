'use strict';
// =====================================================================
//  GALAXY's boss pictures, like bossart.js's for the tank bosses: a WARNING picture as each galaxy boss arrives
//  (the fight waits behind it) and a victory picture once it's down and its loot is in, before the hangar
//  (ENDLESS: mid-stage, then on with the waves). 112x64, shown at double size; the bosses are their own sprites
//  from the fight (galaxy.js, galaxy2.js) in their sector's sky, the rest drawn with bossart.js's helpers.
//  Enter or fire moves on; after a few seconds it moves on by itself. Settings -> GAME -> BOSS SCREENS.
// =====================================================================

const GxArt = {
  cache: new Map(),
  // something that doesn't move, drawn once into its own canvas
  once(k, draw, w = INTRO_W, h = INTRO_H) {
    let c = this.cache.get(k);
    if (!c) { c = makeCanvas(w, h); draw(c.getContext('2d')); this.cache.set(k, c); }
    return c;
  },
  // the boss's sprite from the fight; pal: colours of its own (a fried brain...); edit(g): changes to its pixel grid
  boss(key, f = 0, ph = 1, pal = null, edit = null, tag = '') {
    if (!pal && !edit) return GxGfx.boss(key, f, 'n', ph);
    const k = 'B' + key + f + ph + tag + (pal ? pal.join() : '');
    let c = this.cache.get(k);
    if (!c) { const g = GX_BOSS_DRAW[key](f, ph); if (edit) edit(g); c = gridCanvas(g, pal || GX_BOSS_PALS[key]); this.cache.set(k, c); }
    return c;
  },
  // a ball lit from the top left, its tones dithered into each other (planets, moons, rocks): cols light to dark (5);
  // band(x, y): a little more or less light (stripes)
  ball(c, cx, cy, rx, ry, cols, band) {
    for (let y = Math.max(0, Math.floor(cy - ry)); y <= Math.min(INTRO_H - 1, cy + ry); y++) for (let x = Math.max(0, Math.floor(cx - rx)); x <= Math.min(INTRO_W - 1, cx + rx); x++) {
      const nx = (x + 0.5 - cx) / rx, ny = (y + 0.5 - cy) / ry, d = nx * nx + ny * ny;
      if (d > 1) continue;
      const l = -nx * 0.5 - ny * 0.6 + Math.sqrt(1 - d) * 0.65 + ((x + y) & 1 ? 0.05 : -0.05) + (band ? band(x, y) : 0);
      Pix.rect(c, x, y, 1, 1, cols[l > 0.95 ? 0 : l > 0.55 ? 1 : l > 0.15 ? 2 : l > -0.25 ? 3 : 4]);
    }
  },
  // a crater (seen at a slant): a dark floor in the shade of its near wall, its far rim lit
  crater(c, x, y, r, dark = '#5C5C5C', lit = '#E0E0E0') {
    const ry = Math.max(1, r * 0.55);
    for (let j = -Math.ceil(ry) - 1; j <= ry + 1; j++) for (let i = -r - 1; i <= r + 1; i++) {
      const d = Math.hypot(i / r, j / ry);
      if (d <= 1) Pix.rect(c, x + i, y + j, 1, 1, Math.hypot(i / r, (j + 1) / ry) > 1 ? '#3C3C3C' : dark);
      else if (d <= 1 + 1.2 / r && j > 0) Pix.rect(c, x + i, y + j, 1, 1, lit);
    }
  },
  // a dithered glow (an aura, a shadow) over an ellipse
  glow(c, cx, cy, rx, ry, col, ph = 0) {
    for (let y = -ry; y <= ry; y++) { const w = Math.round(rx * Math.sqrt(1 - (y / (ry + 0.5)) ** 2)); Art.dith(c, Math.round(cx - w), Math.round(cy + y), 2 * w + 1, 1, col, (y + ph) & 1); }
  },
  // steam rising (light, thinning out)
  steam(c, x, y, t, n = 4, seed = 0) {
    for (let k = 0; k < n; k++) {
      const p = ((t + k * Math.floor(60 / n) + seed * 13) % 60) / 60, r = Math.round(p * 2.5);
      if (p < 0.6 || (k + (t >> 2)) & 1) Pix.disc(c, Math.round(x + Math.sin(k * 2.3 + seed + p * 3) * 3), Math.round(y - p * 18), r, p < 0.4 ? '#F8F8F8' : '#C8E8F8');
    }
  },
  // deep space: its colour and twinkling stars
  space(c, sky, seed = 1, t = 0, n = 34) { Pix.rect(c, 0, 0, INTRO_W, INTRO_H, sky); Pix.stars(c, n, seed, t, INTRO_H); },
  // a soft cloud (nebula, dust): layers of cols from the outside in, the outer one dithered, its edge wobbling
  cloud(c, cx, cy, rx, ry, cols, seed = 0) {
    for (let y = Math.max(0, Math.floor(cy - ry * 1.3)); y <= Math.min(INTRO_H - 1, cy + ry * 1.3); y++) for (let x = Math.max(0, Math.floor(cx - rx * 1.3)); x <= Math.min(INTRO_W - 1, cx + rx * 1.3); x++) {
      const dx = (x - cx) / rx, dy = (y - cy) / ry, a = Math.atan2(dy, dx), d = Math.hypot(dx, dy) / (1 + 0.18 * Math.sin(a * 3 + seed) + 0.1 * Math.sin(a * 7 + seed * 2.3));
      for (let i = cols.length - 1; i >= 0; i--) {
        if (d > 1 - i / cols.length) continue;
        if (i === 0 && (x + y) & 1) break;
        Pix.rect(c, x, y, 1, 1, cols[i]); break;
      }
    }
  },
  // a flat ring (an orbit, a planet's rings), dotted; only its front half (front 1) or back half (front -1)
  oval(c, cx, cy, rx, ry, col, n = 60, ph = 0, front = 0) {
    for (let k = 0; k < n; k++) { const a = ph + k / n * Math.PI * 2; if (front && Math.sign(Math.sin(a)) !== front) continue; Pix.rect(c, Math.round(cx + Math.cos(a) * rx), Math.round(cy + Math.sin(a) * ry), 1, 1, col); }
  },
  // your tank, flying (seen from above, nose up as in the fight), its thrusters burning
  ship(c, x, y, t, i = 0) {
    x = Math.round(x); y = Math.round(y);
    Pix.rect(c, x + 5, y + 16, 2, 2 + ((t >> 1) & 1), (t >> 1) & 1 ? '#F8B800' : '#F83800'); Pix.rect(c, x + 9, y + 16, 2, 2 + ((t >> 2) & 1), (t >> 1) & 1 ? '#F83800' : '#F8B800');
    c.drawImage(Sprites.tank('p0', (t >> 2) & 1, 0, Config.playerPal(i)), x, y);
  },
  // an image turned by ang, centred on (cx, cy), pixel-sharp
  rot(c, img, cx, cy, ang) { Art.rot(c, img.width, img.height, sc => sc.drawImage(img, 0, 0), cx, cy, ang); },
  // explosions popping over a box, one after another
  booms(c, x, y, w, h, t, n = 3, seed = 0) {
    for (let k = 0; k < n; k++) {
      const q = t + k * Math.floor(30 / n) + seed * 7, p = q % 30;
      if (p > 13) continue;
      const r = seeded(seed * 31 + k * 7 + Math.floor(q / 30) * 3 + 1);
      Pix.boom(c, x + Math.floor(r() * w) - 8, y + Math.floor(r() * h) - 8, p);
    }
  },
  // tiny 3x5 digits (a clock, the time circuits)
  digits(c, s, x, y, col) {
    const D = { 0: '111101101101111', 1: '010110010010111', 2: '111001111100111', 3: '111001011001111', 4: '101101111001001', 5: '111100111001111',
      6: '111100111101111', 7: '111001010010010', 8: '111101111101111', 9: '111101111001111', ':': '000010000010000' };
    for (const ch of s) { const d = D[ch]; if (d) for (let k = 0; k < 15; k++) if (d[k] === '1') Pix.rect(c, x + (k % 3), y + Math.floor(k / 3), 1, 1, col); x += ch === ':' ? 3 : 4; }
  },
  // a quaver (the yodel)
  note(c, x, y, col) { Pix.rect(c, x, y + 3, 2, 2, col); Pix.rect(c, x + 1, y, 1, 4, col); Pix.rect(c, x + 2, y, 1, 1, col); Pix.rect(c, x + 3, y + 1, 1, 1, col); },
  // a little fire-and-smoke for something burning at (x, y)
  burn(c, x, y, t, seed = 0) { Art.smoke(c, x, y - 3, t, 4, seed, true); Art.fire(c, x - 3, y, 6, t + seed * 5); },
};

// the sector skies, kept
const gxaMoon = () => GxArt.once('moon', c => {
  GxArt.ball(c, 86, 80, 48, 48, ['#F8F8F8', '#D0D0D0', '#A8A8A8', '#7C7C7C', '#4C4C4C']);
  for (const [x, y, r] of [[66, 44, 4], [84, 38, 3], [100, 46, 5], [76, 54, 3], [56, 58, 4], [94, 58, 3], [70, 36, 2], [104, 36, 2]]) GxArt.crater(c, x, y, r, '#8C8C8C', '#E8E8E8');
});
const gxaEarth = (c, x, y, r) => {
  GxArt.ball(c, x, y, r, r, ['#F8F8F8', '#78D8F8', '#2C7CC8', '#1C3C8C', '#0C1430']);
  const s = seeded(5);
  for (let k = 0; k < r * 3; k++) { const a = s() * 6.3, d = s() * r * 0.8; Pix.rect(c, Math.round(x + Math.cos(a) * d - r * 0.15), Math.round(y + Math.sin(a) * d * 0.8), 1 + (k % 2), 1, d < r * 0.5 ? '#58B848' : '#2C7C2C'); }
  for (let k = 0; k < 4; k++) Pix.rect(c, x - r + 2 + k * 3, y - r * 0.5 + k * 2, 3, 1, '#F8F8F8');
};
const gxaNebula = () => GxArt.once('nebula', c => {
  Pix.rect(c, 0, 0, INTRO_W, INTRO_H, '#0C0018');
  GxArt.cloud(c, 28, 18, 44, 20, ['#2C0C4C', '#4C1C6C', '#7C2C8C', '#A84CA8'], 1);
  GxArt.cloud(c, 92, 50, 40, 18, ['#2C0C3C', '#5C1C5C', '#8C3C7C'], 2);
  GxArt.cloud(c, 84, 10, 22, 9, ['#3C1C5C', '#6C3C8C'], 3);
  Pix.stars(c, 40, 6, 0, INTRO_H);
});
const gxaBelt = () => GxArt.once('belt', c => {
  const r = seeded(17);
  for (let k = 0; k < 70; k++) {
    const p = r(), x = p * INTRO_W, y = 54 - p * 44 + (r() - 0.5) * 18, s = 1 + Math.floor(r() * 3), far = r() < 0.5;
    GxArt.ball(c, x, y, s, s * 0.85, far ? ['#8C6C3C', '#6C5030', '#4C3818', '#2C2010', '#1C140C'] : ['#E8D8B8', '#C8A878', '#8C6C3C', '#4C3818', '#2C2010']);
  }
});
const gxaCore = (c, t, cy = 82) => {
  Pix.rect(c, 0, 0, INTRO_W, INTRO_H, '#100000');
  Pix.stars(c, 20, 9, t, 30);
  for (const [r, col, d] of [[78, '#3C0C00', 1], [64, '#5C1800', 0], [52, '#8C2800', 1], [44, '#C83800', 0], [36, '#F87830', 1], [30, '#F8A030', 0], [24, '#F8D878', 1], [18, '#F8F8C8', 0]]) {
    const rr = r + Math.round(Math.sin(t / 15 + r) * 1.5);
    if (d) { Art.dith(c, 0, Math.max(0, cy - rr), INTRO_W, INTRO_H, col, 0); Pix.disc(c, 56, cy, rr - 3, col); } else Pix.disc(c, 56, cy, rr, col);
  }
  // its swirling arms
  for (let k = 0; k < 40; k++) { const a = k * 0.45 + t / 60, d = 20 + (k * 7) % 60; Pix.rect(c, Math.round(56 + Math.cos(a) * d * 1.3), Math.round(cy + Math.sin(a) * d * 0.5), 2, 1, k % 3 ? '#F8A030' : '#F8F878'); }
};
const gxaSkyline = () => GxArt.once('skyline', c => {
  const r = seeded(21);
  for (let x = 0; x < INTRO_W;) {
    const w = 6 + Math.floor(r() * 9), h = 10 + Math.floor(r() * 16) + (x > 46 && x < 64 ? 10 : 0), top = INTRO_H - h;
    Pix.rect(c, x, top, w, h, x % 2 ? '#101828' : '#141C30'); Pix.rect(c, x, top, 1, h, '#1C2840');
    for (let y = top + 2; y < INTRO_H - 1; y += 3) for (let xx = x + 1; xx < x + w - 1; xx += 2) if (r() < 0.45) Pix.rect(c, xx, y, 1, 1, r() < 0.8 ? '#F8D878' : '#F8F8F8');
    if (h > 26) { Pix.rect(c, x + (w >> 1), top - 6, 1, 6, '#1C2840'); Pix.rect(c, x + (w >> 1), top - 7, 1, 1, '#F83800'); }
    x += w + (r() < 0.3 ? 1 : 0);
  }
});
const gxaSaturn = () => GxArt.once('saturn', c => {
  Pix.rect(c, 0, 0, INTRO_W, INTRO_H, '#0C0804'); Pix.stars(c, 30, 4, 0, INTRO_H);
  const ring = front => { for (const [rx, ry, col] of [[46, 10, '#8C6C3C'], [43, 9.3, '#E8D8B8'], [40, 8.6, '#C8A878'], [37, 8, '#A08058'], [34, 7.4, '#E8D8B8']]) GxArt.oval(c, 82, 26, rx, ry, col, 220, 0, front); };
  ring(-1);
  GxArt.ball(c, 82, 26, 22, 20, ['#F8F0C8', '#E8D8A8', '#C8A878', '#8C6C3C', '#4C3818'], (x, y) => Math.sin(y / 2.3) * 0.12);
  ring(1);
});
const gxaGrid = (c, t) => {
  Pix.bands(c, 0, 26, ['#000000', '#000800', '#001400', '#082808']);
  Pix.rect(c, 0, 26, INTRO_W, 38, '#000800');
  for (let k = 0; k < 9; k++) { const q = (k + (t * 0.02) % 1) / 9, y = Math.round(26 + 38 * q * q); Pix.rect(c, 0, y, INTRO_W, 1, k > 4 ? '#1C7C1C' : '#0C4C0C'); }
  for (let i = -8; i <= 8; i++) Pix.line(c, 56 + i * 4, 26, 56 + i * 22, 64, Math.abs(i) < 6 ? '#0C4C0C' : '#083808');
  for (let k = 0; k < 14; k++) { const x = (k * 37 + 5) % INTRO_W, y = Math.round((t * (0.6 + (k % 3) * 0.3) + k * 23) % 40) - 10; Pix.rect(c, x, y, 1, 4, '#1C7C1C'); Pix.rect(c, x, y + 4, 1, 1, '#58F858'); }
};
const gxaDarkStar = (c, t, dim) => {
  Pix.rect(c, 0, 0, INTRO_W, INTRO_H, '#080000'); Pix.stars(c, 26, 12, t, INTRO_H);
  for (const [r, col, d] of [[30, '#2C0400', 1], [26, '#5C0C00', 0], [22, '#8C1C00', 1], [19, '#C83800', 0], [17, '#F87830', 1]]) {
    const rr = r + Math.round(Math.sin(t / 12 + r) * 1.2) - (dim ? 4 : 0);
    if (d) { for (let y = -rr; y <= rr; y++) { const w = Math.floor(Math.sqrt(rr * rr - y * y)); Art.dith(c, 24 - w, 22 + y, 2 * w + 1, 1, col, y & 1); } } else Pix.disc(c, 24, 22, rr, col);
  }
  Pix.disc(c, 24, 22, 15, '#000000');
  for (let k = 0; k < 12; k++) { const a = k * 0.52 + t / 40; Pix.rect(c, Math.round(24 + Math.cos(a) * 16), Math.round(22 + Math.sin(a) * 16), 1, 1, '#F8B800'); }
};
const gxaBase = (c, t) => {
  c.drawImage(GxArt.once('base', b => {
    Pix.rect(b, 0, 0, INTRO_W, INTRO_H, '#14141C');
    for (let x = 0; x < INTRO_W; x += 16) for (let y = 0; y < 52; y += 13) { Pix.rect(b, x + 1, y + 1, 14, 11, '#1C1C28'); Pix.rect(b, x + 1, y + 1, 14, 1, '#2C2C3C'); Pix.rect(b, x + 2, y + 2, 1, 1, '#4C4C5C'); Pix.rect(b, x + 13, y + 10, 1, 1, '#4C4C5C'); }
    for (const y of [8, 30]) { Pix.rect(b, 0, y, INTRO_W, 2, '#3C3C4C'); Pix.rect(b, 0, y, INTRO_W, 1, '#5C5C6C'); }
    Pix.rect(b, 0, 52, INTRO_W, 12, '#2C2C38'); Pix.rect(b, 0, 52, INTRO_W, 1, '#6C6C7C');
    for (let x = 0; x < INTRO_W; x += 8) Pix.line(b, 56 + (x - 56) * 0.6, 53, x + (x - 56) * 0.4, 63, '#3C3C48');   // the deck's seams
    for (const y of [56, 60]) Pix.rect(b, 0, y, INTRO_W, 1, '#3C3C48');
    for (let x = 4; x < INTRO_W; x += 12) { Pix.rect(b, x, 49, 6, 2, '#F8D800'); Pix.rect(b, x + 3, 49, 3, 2, '#202020'); }   // hazard stripes
  }), 0, 0);
  // alarm lights going round
  for (const x of [6, 104]) {
    const on = ((t >> 3) + (x > 50 ? 1 : 0)) & 1;
    Pix.rect(c, x - 2, 1, 5, 4, '#3C3C4C'); Pix.rect(c, x - 1, 2, 3, 2, on ? '#F83800' : '#7C1000');
    if (on) { Art.dith(c, x - 6, 0, 13, 9, '#A81000', 0); Pix.rect(c, x, 2, 1, 1, '#F8F8F8'); }
  }
};

// a speech bubble on a picture (drawGxBossScreen draws it at full size): the boss's own words
const gxaSay = (text, x, y) => ({ text, x, y });

// ------------------------------------------------------------------ the twenty-four pictures
const GX_BOSS_ART = {
  // MOON ORBIT: it hangs over the moon, a tank caught in its tractor beam; its drones pour out
  mothership: {
    intro(c, t) {
      GxArt.space(c, '#000010', 3, t);
      gxaEarth(c, 16, 12, 7);
      c.drawImage(gxaMoon(), 0, 0);
      const X = 18, Y = 4 + Math.round(Math.sin(t / 24));
      // the beam, scanning bands running down it
      for (let y = Y + 31; y < INTRO_H; y++) {
        const hw = 3 + Math.round((y - Y - 31) * 0.45);
        Art.dith(c, X + 38 - hw, y, hw * 2, 1, (y - (t >> 1)) % 6 === 0 ? '#F8F8F8' : '#58F8F8', y & 1);
      }
      Art.rot(c, 16, 16, sc => sc.drawImage(Sprites.tank('p0', 0, 0, Config.playerPal(0)), 0, 0), X + 38, 52 - ((t >> 2) % 6), t / 9);
      c.drawImage(GxArt.boss('mothership', (t >> 3) & 1), X, Y);
      // drones swooping out of it
      for (let k = 0; k < 4; k++) {
        const p = ((t + k * 30) % 120) / 120, s = k % 2 ? 1 : -1, img = GxGfx.get('drone', (t >> 3) & 1);
        c.drawImage(img, Math.round(X + 38 + s * (10 + p * 50) - 6), Math.round(Y + 24 + Math.sin(p * 3) * 14 - p * 8));
      }
    },
    outro(c, t) {
      GxArt.space(c, '#000008', 8, t, 30);
      gxaEarth(c, 84, 14, 10);
      // the moon's surface
      c.drawImage(GxArt.once('moonGround', m => {
        for (let x = 0; x < INTRO_W; x++) { const top = 44 - Math.round(Math.sin(x / INTRO_W * Math.PI) * 3); Pix.rect(m, x, top, 1, INTRO_H - top, '#9C9C9C'); Pix.rect(m, x, top, 1, 1, '#D8D8D8'); }
        Art.dith(m, 0, 52, INTRO_W, 12, '#7C7C7C', 0);
        for (const [x, y, r] of [[8, 50, 3], [62, 58, 4], [100, 56, 3], [40, 61, 2], [86, 48, 2]]) GxArt.crater(m, x, y, r, '#7C7C7C', '#E8E8E8');
      }), 0, 0);
      // crashed nose first into it, burning
      GxArt.rot(c, GxArt.boss('mothership', (t >> 4) & 1, 3), 38, 40, 0.42);
      for (let k = 0; k < 9; k++) Pix.disc(c, 10 + k * 3, 54 - Math.abs(k - 4), 3, k % 2 ? '#8C8C8C' : '#A8A8A8');   // the dust it threw up
      Art.smoke(c, 52, 28, t, 5, 1, true); Art.smoke(c, 30, 36, t, 4, 3, true);
      Art.fire(c, 46, 37, 6, t); Art.sparks(c, 60, 40, t, 6, '#F8D800');
      // one small step: a tank plants its flag; the crew comes out waving theirs
      artAlien(c, 64, 42, t, true);
      for (let k = 0; k < 4; k++) Pix.rect(c, 82 - k * 5, 58 + (k & 1), 2, 1, '#6C6C6C');
      Art.tank(c, 88, 49, 0, true, t >> 3); Art.flag(c, 106, 39, t);
    },
  },

  // RED PLANET: it climbs out of the dunes, claws snapping; a rover makes a run for it
  crab: {
    intro(c, t) {
      Pix.bands(c, 0, 46, ['#2C0804', '#4C1006', '#6C1C0C', '#943014', '#B8481C', '#D06A34']);
      Pix.stars(c, 10, 2, t, 14);
      Pix.disc(c, 98, 9, 3, '#C8A890'); Pix.rect(c, 97, 8, 1, 1, '#E8D0B8'); Pix.rect(c, 14, 6, 2, 2, '#A88C78');   // its two moons
      c.drawImage(GxArt.once('mars', m => {
        for (const [x, w, h] of [[2, 22, 9], [58, 30, 12], [92, 18, 7]]) { Pix.rect(m, x + 3, 42 - h, w - 6, h, '#5C1808'); for (let k = 0; k < 3; k++) Pix.rect(m, x + k, 42 - h + 3 + k * 2, w - k * 2, 1, '#5C1808'); Pix.rect(m, x + 3, 42 - h, w - 6, 1, '#7C2C10'); }
        artHills(m, 44, '#7C2C10', 2, 8, 2);
        Pix.rect(m, 0, 46, INTRO_W, 18, '#9C3C18');
        for (let y = 47; y < 64; y += 3) for (let x = (y * 5) % 7; x < INTRO_W; x += 9) Pix.rect(m, x, y, 4, 1, '#B85428');
        for (const [x, y] of [[6, 58], [104, 52], [30, 62], [88, 61]]) { Pix.disc(m, x, y, 2, '#5C2010'); Pix.rect(m, x - 1, y - 1, 1, 1, '#C86838'); }
      }), 0, 0);
      const X = 18 + Math.round(Math.sin(t / 22) * 3), Y = 15;
      Art.dith(c, X + 8, 52, 60, 6, '#5C1808', 0);   // its shadow
      c.drawImage(GxArt.boss('crab', (t >> 4) & 1), X, Y);
      Art.debris(c, X + 10, 56, t, 4, '#C86838'); Art.debris(c, X + 64, 56, t + 18, 4, '#C86838');
      // the rover, flat out
      const rx = 2 + ((t >> 3) & 1);
      Pix.rect(c, rx + 1, 54, 10, 3, '#E0E0E0'); Pix.rect(c, rx + 1, 54, 10, 1, '#F8F8F8'); Pix.rect(c, rx + 2, 52, 6, 2, '#BCBCBC');
      Pix.rect(c, rx + 8, 49, 1, 5, '#7C7C7C'); Pix.rect(c, rx + 7, 48, 3, 2, '#3C3C3C'); Pix.rect(c, rx + 7, 48, 1, 1, '#58F8F8');
      for (const dx of [2, 6, 10]) { Pix.disc(c, rx + dx, 58, 1, '#202020'); }
      Art.smoke(c, rx + 12, 56, t, 3, 5);
    },
    outro(c, t) {
      // a martian sunset is blue
      Pix.bands(c, 0, 46, ['#100818', '#20142C', '#3C2C48', '#5C4C68', '#7C7898']);
      Pix.stars(c, 12, 7, t, 18);
      Pix.disc(c, 26, 44, 9, '#88A8C8'); Pix.disc(c, 26, 44, 5, '#C8E8F8'); Pix.disc(c, 26, 44, 3, '#F8F8F8');
      artHills(c, 44, '#4C1808', 2, 8, 2);
      Pix.rect(c, 0, 46, INTRO_W, 18, '#6C2810');
      for (let y = 47; y < 64; y += 3) for (let x = (y * 5) % 7; x < INTRO_W; x += 9) Pix.rect(c, x, y, 4, 1, '#843818');
      // on its back, legs waving
      for (let k = 0; k < 3; k++) for (const sd of [-1, 1]) {   // its legs kicking in the air
        const w = Math.round(Math.sin(t / 4 + k * 2 + sd) * 2), kx = 54 + sd * (13 + k * 7), ky = 16 - k + w, fx = 54 + sd * (10 + k * 9), fy = 8 + k * 2 - w;
        Pix.line(c, 54 + sd * (8 + k * 5), 28, kx, ky, '#7C1000', 2); Pix.line(c, kx, ky, fx, fy, '#E04030', 2); Pix.rect(c, fx, fy, 1, 1, '#F8B8A8');
      }
      Art.flipV(c, 76, 42, sc => sc.drawImage(GxArt.boss('crab', (t >> 2) & 1, 3), 0, 0), 16, 17);
      Art.stars(c, 54, 14, t);
      Art.smoke(c, 40, 34, t, 4, 2, true); Art.smoke(c, 70, 36, t, 3, 6, true);
      // the rover comes back for a look
      Pix.rect(c, 4, 54, 10, 3, '#C8C8C8'); Pix.rect(c, 5, 52, 6, 2, '#9C9C9C'); Pix.rect(c, 11, 49, 1, 5, '#7C7C7C'); Pix.rect(c, 10, 48, 3, 2, '#3C3C3C'); Pix.rect(c, 12, 48, 1, 1, (t >> 4) & 1 ? '#F83800' : '#58F8F8');
      for (const dx of [5, 9, 13]) Pix.disc(c, dx, 58, 1, '#202020');
      Pix.line(c, 14, 54, 18 + ((t >> 4) & 1) * 2, 50, '#BCBCBC');
      Art.tank(c, 90, 51, 0, true, t >> 3); Art.flag(c, 106, 41, t);
    },
  },

  // ASTEROID BELT: a mountain with a face, its heart of magma, throwing rocks
  titan: {
    intro(c, t) {
      GxArt.space(c, '#08080C', 5, t, 26);
      GxArt.glow(c, 6, 5, 11, 8, '#4C4C3C', 0); Pix.disc(c, 6, 5, 4, '#F8F8C8'); Pix.disc(c, 6, 5, 2, '#F8F8F8');   // a far sun
      c.drawImage(gxaBelt(), 0, 0);
      const X = 42, Y = 4 + Math.round(Math.sin(t / 30) * 1.5);
      Art.dith(c, X + 18, Y + 18, 30, 30, '#5C1C00', 0);   // the magma's glow
      c.drawImage(GxArt.boss('titan', (t >> 3) & 1), X, Y);
      // the rocks it throws at you
      for (let k = 0; k < 4; k++) {
        const p = ((t + k * 25) % 100) / 100, x = X + 30 - p * (44 + k * 8), y = Y + 34 + p * (10 + k * 4), s = 2 + (k % 2);
        GxArt.ball(c, x, y, s, s, ['#E8D8B8', '#C8A878', '#8C6C3C', '#4C3818', '#2C2010']);
        Pix.rect(c, Math.round(x + s + 1), Math.round(y - 1), 2, 1, '#F87830');
      }
      GxArt.ship(c, 10, 44 + Math.round(Math.sin(t / 16) * 2), t);
    },
    outro(c, t) {
      GxArt.space(c, '#08080C', 5, t, 26);
      c.drawImage(gxaBelt(), 0, 0);
      const img = GxArt.boss('titan', (t >> 3) & 1, 3), p = Math.min(1, t / 90);
      // split down the middle, the halves drifting apart, magma spilling
      for (let k = 0; k < 10; k++) { const q = ((t * 0.5 + k * 9) % 40) / 40; Pix.rect(c, Math.round(56 + Math.sin(k * 2) * 4 * p), Math.round(30 + q * 30), 1, 2, q < 0.5 ? '#F8D800' : '#F83800'); }
      Art.rot(c, 33, 56, sc => sc.drawImage(img, 0, 0, 33, 56, 0, 0, 33, 56), 40 - 10 * p, 31 + 2 * p, -0.3 * p);
      Art.rot(c, 33, 56, sc => sc.drawImage(img, 33, 0, 33, 56, 0, 0, 33, 56), 73 + 11 * p, 33 + 3 * p, 0.35 * p);
      Art.sparks(c, 56, 34, t, 8, '#F87830');
      Art.debris(c, 56, 30, t, 6, '#8C6C3C', 1.4);
      Art.stars(c, 34, 6, t);
      // you fly through the gap
      GxArt.ship(c, 48, 66 - ((t * 0.8) % 96), t);
    },
  },

  // ICE GIANT: the queen above a frozen world, her beam turning a tank into an ice cube
  frost: {
    intro(c, t) {
      c.drawImage(GxArt.once('iceGiant', m => {
        Pix.rect(m, 0, 0, INTRO_W, INTRO_H, '#000818'); Pix.stars(m, 34, 13, 0, INTRO_H);
        GxArt.oval(m, 14, 60, 74, 12, '#3C8CC8', 300, -0.15, -1);
        GxArt.ball(m, 14, 76, 54, 54, ['#F8F8F8', '#B8F8F8', '#58B8E8', '#2C5C9C', '#102C5C'], (x, y) => Math.sin(y / 3.1) * 0.09);
        GxArt.oval(m, 14, 60, 74, 12, '#A8E8F8', 300, -0.15, 1); GxArt.oval(m, 14, 60, 70, 11, '#58B8E8', 300, 0, 1);
      }), 0, 0);
      for (let k = 0; k < 8; k++) { const x = (k * 29 + 7) % INTRO_W, y = (k * 17 + (t >> 2)) % INTRO_H, on = (t + k * 9) % 30 < 15; Pix.rect(c, x, y, 1, 1, '#F8F8F8'); if (on) { Pix.rect(c, x - 1, y, 3, 1, '#A8E8F8'); Pix.rect(c, x, y - 1, 1, 3, '#A8E8F8'); Pix.rect(c, x, y, 1, 1, '#F8F8F8'); } }
      const X = 46, Y = 2 + Math.round(Math.sin(t / 20) * 2);
      GxArt.glow(c, X + 31, Y + 28, 34, 26, '#1C4C7C', (t >> 4) & 1);   // her cold aura
      c.drawImage(GxArt.boss('frost', (t >> 3) & 1), X, Y);
      // the shards she fans out
      for (let k = 0; k < 7; k++) { const p = ((t + k * 7) % 50) / 50, a = Math.PI / 2 + (k - 3) * 0.32, x = X + 31 + Math.cos(a) * p * 50, y = Y + 40 + Math.sin(a) * p * 30; Pix.rect(c, Math.round(x), Math.round(y) - 1, 1, 3, '#E0F8F8'); Pix.rect(c, Math.round(x) - 1, Math.round(y), 3, 1, '#58B8E8'); }
      // her beam, and a tank frozen solid in it
      if (t % 90 > 40) { Pix.rect(c, X + 30, Y + 42, 3, 50, (t >> 1) & 1 ? '#E0F8F8' : '#58F8F8'); Pix.rect(c, X + 31, Y + 42, 1, 50, '#F8F8F8'); }
      Pix.rect(c, 14, 44, 22, 19, '#58B8E8'); Pix.rect(c, 15, 45, 20, 17, '#A8E8F8');
      c.drawImage(Sprites.tank('p0', 0, 0, Config.playerPal(0)), 17, 46);
      Art.dith(c, 15, 45, 20, 17, '#C8F0F8', 0); Pix.rect(c, 15, 45, 20, 1, '#F8F8F8'); Pix.rect(c, 15, 45, 1, 17, '#E0F8F8'); Pix.line(c, 30, 47, 33, 51, '#F8F8F8');
      Art.stars(c, 25, 41, t);
    },
    outro(c, t) {
      // down on the ice giant's frozen plain, its rings across the sky
      Pix.bands(c, 0, 44, ['#000818', '#08183C', '#183C6C', '#3C6C9C']);
      Pix.stars(c, 20, 13, t, 24);
      GxArt.oval(c, 56, 70, 110, 52, '#A8E8F8', 500, 0, -1); GxArt.oval(c, 56, 70, 104, 48, '#58B8E8', 500, 0, -1);
      Pix.rect(c, 0, 44, INTRO_W, 20, '#B8E8F8'); Pix.rect(c, 0, 44, INTRO_W, 1, '#F8F8F8');
      for (const [x0, y0, x1, y1] of [[4, 50, 16, 54], [16, 54, 20, 62], [70, 48, 84, 52], [92, 58, 108, 56]]) Pix.line(c, x0, y0, x1, y1, '#7CB8E8');
      // melting into a puddle: each column runs down, the crown slips off
      const m = Math.min(1, 0.35 + t / 160), img = GxArt.boss('frost', 0, 3), r = seeded(41), X = 22, Y = 4 + Math.round(m * 8);
      Pix.disc(c, 53, 56, 4, '#58B8E8');
      for (let y = -4; y <= 4; y++) { const w = Math.round((30 + m * 14) * Math.sqrt(1 - (y / 4.5) ** 2)); Pix.rect(c, 53 - w, 55 + y, 2 * w, 1, y < -2 ? '#A8E8F8' : '#58B8E8'); }
      Pix.rect(c, 34, 53, 14, 1, '#F8F8F8'); Pix.rect(c, 64, 55, 8, 1, '#E0F8F8');
      c.save(); c.beginPath(); c.rect(0, 0, INTRO_W, 54); c.clip();
      for (let x = 0; x < 62; x++) { const d = Math.round((4 + r() * 10) * m); c.drawImage(img, x, 13, 1, 39, X + x, Y + 13 + d, 1, 39); }
      c.restore();
      Art.rot(c, 22, 13, sc => sc.drawImage(img, 20, 0, 22, 13, 0, 0, 22, 13), 30, 50, -0.6);   // the crown
      for (let k = 0; k < 5; k++) { const p = ((t + k * 13) % 40) / 40; Pix.rect(c, X + 12 + k * 9, Math.round(Y + 30 + p * 20), 1, 2, '#A8E8F8'); }   // drips
      GxArt.steam(c, 40, 34, t, 4, 4); GxArt.steam(c, 66, 36, t, 3, 7);
      Art.tank(c, 88, 50, 0, true, t >> 3); Art.flag(c, 104, 40, t);
    },
  },

  // NEBULA: the eye opens, stares, and a burning beam follows its gaze
  eye: {
    intro(c, t) {
      c.drawImage(gxaNebula(), 0, 0);
      Pix.stars(c, 14, 8, t, INTRO_H);
      const X = 25, Y = 2 + Math.round(Math.sin(t / 26) * 1.5), shut = t % 200 > 192 ? 1 : 0;
      for (let k = 0; k < 6; k++) { const a = t / 30 + k, img = GxGfx.get('bug', (t >> 3) & 1); c.drawImage(img, Math.round(56 + Math.cos(a) * 50 - 6), Math.round(28 + Math.sin(a * 1.3) * 26 - 6)); }
      c.drawImage(GxArt.boss('eye', shut + 2 * ((t >> 3) & 1)), X, Y);
      // its stare: a warning line to you, then the beam
      const s = t % 120, px = X + 31, py = Y + 26;
      if (!shut && s > 20 && s < 60 && (t >> 1) & 1) for (let k = 0; k < 40; k += 3) Pix.rect(c, Math.round(px + (92 - px) * k / 40), Math.round(py + (54 - py) * k / 40), 1, 1, '#F83800');
      if (!shut && s >= 60 && s < 84) { Pix.line(c, px - 1, py, 91, 54, '#F83800', 3); Pix.line(c, px, py + 1, 92, 55, '#F8F8F8'); Art.sparks(c, 92, 54, t, 6, '#F87830'); }
      GxArt.ship(c, s >= 60 && s < 84 ? 86 + ((t >> 1) & 1) : 84, 46, t);
    },
    outro(c, t) {
      c.drawImage(gxaNebula(), 0, 0);
      Pix.stars(c, 14, 8, t, INTRO_H);
      const X = 25, Y = 6 + Math.round(Math.sin(t / 40) * 1);
      c.drawImage(GxArt.boss('eye', 1 + 2 * ((t >> 5) & 1), 3), X, Y);
      // shut for good, under an eye patch
      Pix.line(c, X + 4, Y + 15, X + 22, Y + 22, '#202020', 2); Pix.line(c, X + 40, Y + 22, X + 58, Y + 15, '#202020', 2);
      for (let y = -7; y <= 7; y++) { const w = Math.round(10 * Math.sqrt(1 - (y / 7.5) ** 2)); Pix.rect(c, X + 31 - w, Y + 26 + y, 2 * w, 1, y < -4 ? '#3C3C3C' : '#141414'); }
      Pix.rect(c, X + 25, Y + 20, 3, 1, '#5C5C5C');
      // a tear, and stars going round
      const p = (t % 50) / 50; Pix.rect(c, X + 12, Math.round(Y + 30 + p * 16), 1, 2, '#78D8F8'); Pix.rect(c, X + 12, Math.round(Y + 32 + p * 16), 2, 1, '#78D8F8');
      Art.stars(c, X + 31, Y + 4, t);
      // its bugs scatter, you fly off
      for (let k = 0; k < 4; k++) { const q = ((t + k * 25) % 100) / 100; c.drawImage(GxGfx.get('bug', (t >> 2) & 1), Math.round(56 + (k % 2 ? 1 : -1) * (20 + q * 60) - 6), Math.round(40 - q * 40 + k * 4)); }
      GxArt.ship(c, 10, 66 - ((t * 0.6) % 90), t); GxArt.ship(c, 92, 72 - ((t * 0.6) % 96), t, 1);
    },
  },

  // THE CORE: the brain that runs it all, its orbs going round, its thoughts hammering out
  overmind: {
    intro(c, t) {
      gxaCore(c, t);
      const X = 20, Y = 2 + Math.round(Math.sin(t / 26) * 1.5), cx = X + 36, cy = Y + 26;
      for (let k = 0; k < 3; k++) { const r = (t * 0.7 + k * 18) % 54; if (r > 12) Art.ring(c, cx, Y + 18, r, k % 2 ? '#F878F8' : '#C060E0', Math.round(r * 2.5), t / 30); }   // its thoughts
      const orb = (k, back) => { const a = t / 35 + k * Math.PI / 2, s = Math.sin(a); if ((s < 0) !== back) return; GxArt.ball(c, cx + Math.cos(a) * 44, cy + s * 18, 4, 4, ['#F8F8F8', '#F8F878', '#F8D800', '#C88800', '#7C4C00']); };
      for (let k = 0; k < 4; k++) orb(k, true);
      c.drawImage(GxArt.boss('overmind', (t >> 3) & 1), X, Y);
      for (let k = 0; k < 4; k++) orb(k, false);
      if ((t >> 2) % 5 === 0) Art.sparks(c, cx - 14, Y + 4, t, 4, '#F8F878');
      for (let k = 0; k < 3; k++) { const a = t / 40 + k * 2.1; c.drawImage(GxGfx.get('wasp', (t >> 2) & 1), Math.round(56 + Math.cos(a) * 46 - 6), Math.round(50 + Math.sin(a) * 6 - 6)); }
    },
    outro(c, t) {
      gxaCore(c, t, 92);
      // sinking into the core, sparking and smoking
      const sink = Math.min(1, t / 160) * 10, X = 20, Y = 8 + Math.round(sink);
      const surf = x => 46 + Math.round(Math.sin(x / 6 + t / 10) * 1.2);
      c.save(); c.beginPath(); c.rect(0, 0, INTRO_W, 46); c.clip();
      GxArt.rot(c, GxArt.boss('overmind', (t >> 2) & 1, 3), X + 36, Y + 26, 0.18);
      c.restore();
      for (let x = 0; x < INTRO_W; x++) { const y = surf(x); Pix.rect(c, x, y, 1, INTRO_H - y, '#F8A030'); Pix.rect(c, x, y, 1, 1, '#F8F8C8'); if ((x + (t >> 2)) % 7 < 2) Pix.rect(c, x, y + 1, 1, 1, '#F8D878'); }
      Art.dith(c, 0, 52, INTRO_W, 12, '#F87830', (t >> 3) & 1);
      for (let k = 0; k < 5; k++) { const q = ((t + k * 23) % 60) / 60, x = 30 + k * 13; if (q < 0.7) Pix.disc(c, x, 60 - Math.round(q * 14), q < 0.5 ? 1 : 2, '#F8F8C8'); }   // it bubbles
      Art.smoke(c, 40, 22, t, 5, 2, true); Art.smoke(c, 70, 24, t, 4, 5, true);
      Art.sparks(c, 46, 14, t, 6, '#F8F878'); Art.sparks(c, 74, 20, t + 9, 5, '#58F8F8');
      for (let k = 0; k < 4; k++) GxArt.ball(c, 8 + k * 30 + Math.round(Math.sin(t / 20 + k) * 2), 12 + (k % 2) * 8, 3, 3, ['#7C7C7C', '#5C5C5C', '#3C3C3C', '#2C2C2C', '#1C1C1C']);   // its orbs, dead
      GxArt.ship(c, 92, 64 - ((t * 0.7) % 90), t);
    },
  },

  // EARTH ORBIT: as big as the city under it, its dish opening
  city: {
    intro(c, t) {
      Pix.bands(c, 0, 50, ['#000814', '#04102C', '#0C1C44', '#1C2858', '#3C2C5C']);
      Pix.stars(c, 14, 15, t, 20);
      GxArt.cloud(c, 4, 36, 22, 6, ['#1C2848', '#2C3C5C'], 2); GxArt.cloud(c, 108, 32, 24, 7, ['#1C2848', '#2C3C5C'], 4);
      const s = t % 150, open = s > 70 ? 1 : 0;
            c.drawImage(GxArt.boss('city', open + 2 * ((t >> 3) & 1)), 6, 0);
      if (open) Art.ring(c, 56, 31, 4 + ((t >> 1) % 6), '#F8F8F8', 16, t / 4);
      c.drawImage(gxaSkyline(), 0, 0);
      // its primary weapon on the tallest tower
      if (s > 110 && s < 140) { Pix.rect(c, 52, 34, 9, 30, (t >> 1) & 1 ? '#58F8F8' : '#F8F8F8'); Pix.rect(c, 55, 34, 3, 30, '#F8F8F8'); GxArt.booms(c, 46, 30, 20, 14, t, 3, 1); }
      for (let k = 0; k < 3; k++) { const p = ((t + k * 40) % 120) / 120; c.drawImage(GxGfx.get('attacker', (t >> 2) & 1), Math.round(10 + k * 40 + Math.sin(p * 6 + k) * 8), Math.round(30 + p * 30)); }
    },
    outro(c, t) {
      Pix.bands(c, 0, 50, ['#000814', '#04102C', '#0C1C44', '#1C2858']);
      Pix.stars(c, 16, 15, t, 20);
      // crashed out past the city, burning; fireworks over it
      GxArt.rot(c, GxArt.boss('city', 2 * ((t >> 4) & 1), 3), 76, 46, -0.22);
      Art.smoke(c, 60, 34, t, 5, 1, true); Art.smoke(c, 88, 32, t, 5, 4, true); Art.fire(c, 64, 40, 8, t); Art.fire(c, 84, 37, 6, t + 7);
      const cols = ['#F83800', '#58F858', '#F8D800', '#3CBCFC', '#F878F8'];
      for (let k = 0; k < 4; k++) {
        const q = (t + k * 31) % 100, x = 12 + ((k * 29 + Math.floor((t + k * 31) / 100) * 17) % 90), y = 10 + (k * 7) % 14, col = cols[(k + Math.floor((t + k * 31) / 100)) % cols.length];
        if (q < 20) Pix.rect(c, x, Math.round(50 - (50 - y) * q / 20), 1, 2, '#F8F8C8');
        else if (q < 60) { const r = (q - 20) * 0.3; Art.ring(c, x, y + Math.round((q - 20) / 12), r, q < 44 ? col : '#7C7C7C', 12, k); if (q < 30) Pix.rect(c, x, y, 1, 1, '#F8F8F8'); }
      }
      c.drawImage(gxaSkyline(), 0, 0);
      // the floppy disk that did it
      const dy = Math.round(Math.sin(t / 12) * 2);
      Pix.rect(c, 4, 4 + dy, 14, 14, '#100808'); Pix.rect(c, 5, 5 + dy, 12, 12, '#2038C8'); Pix.rect(c, 8, 5 + dy, 6, 5, '#BCBCBC'); Pix.rect(c, 11, 6 + dy, 2, 3, '#2038C8');
      Pix.rect(c, 7, 11 + dy, 8, 5, '#F8F8F8'); Pix.rect(c, 8, 12 + dy, 6, 1, '#3CBCFC'); Pix.rect(c, 8, 14 + dy, 4, 1, '#F83800');
      if ((t >> 3) & 1) { Pix.rect(c, 19, 3 + dy, 1, 3, '#F8F8F8'); Pix.rect(c, 18, 4 + dy, 3, 1, '#F8F8F8'); }
      Pix.rect(c, 14, 41, 26, 23, '#101828'); Pix.rect(c, 14, 41, 26, 1, '#2C3C5C');
      for (let y = 44; y < 64; y += 3) for (let x = 16; x < 38; x += 3) if ((x * 7 + y) % 5 < 3) Pix.rect(c, x, y, 1, 1, '#F8D878');
      Art.tank(c, 18, 32, 0, false, t >> 3); Art.flag(c, 34, 22, t);
    },
  },

  // TIME VORTEX: out of the vortex at 88 mph, two trails of fire behind it
  delorean: {
    intro(c, t) {
      Pix.rect(c, 0, 0, INTRO_W, INTRO_H, '#04001C');
      for (let k = 0; k < 9; k++) { const r = (t * 0.7 + k * 13) % 117; GxArt.oval(c, 56, 18, r, r * 0.55, k % 2 ? '#3C5CF8' : '#A8E8F8', Math.round(20 + r * 2), t / 40 + k); }
      for (let k = 0; k < 16; k++) { const a = k * 0.39 + t / 80, d = (t * 1.5 + k * 19) % 70; Pix.rect(c, Math.round(56 + Math.cos(a) * d * 1.4), Math.round(18 + Math.sin(a) * d * 0.7), 2, 1, '#F8F8F8'); }
      Pix.disc(c, 56, 18, 4, '#A8E8F8'); Pix.disc(c, 56, 18, 2, '#F8F8F8');
      const X = 33, Y = 30 + Math.round(Math.sin(t / 10));
      for (const dx of [12, 34]) for (let y = 18; y < Y + 2; y += 2) Pix.rect(c, X + dx - 1, y, 3, 2, (y + t) % 4 ? '#F8B800' : '#F83800');
      c.drawImage(GxArt.boss('delorean', (t >> 2) & 1), X, Y);
      // lightning crackling round it
      const r = seeded(t >> 2);
      for (let k = 0; k < 2; k++) { let x = X + (k ? 44 : 2), y = Y + 6 + Math.floor(r() * 18); for (let s = 0; s < 6; s++) { const nx = x + (k ? 3 : -3), ny = y + Math.floor(r() * 7) - 3; Pix.line(c, x, y, nx, ny, s % 2 ? '#F8F8F8' : '#A8E8F8'); x = nx; y = ny; } }
    },
    outro(c, t) {
      // Hill Valley, 1955: the courthouse clock stopped at 10:04, and a flat
      const bolt = t % 160 < 5;
      Pix.bands(c, 0, 46, bolt ? ['#F8F8F8', '#E0F0F8', '#C8E8F8'] : ['#3CBCFC', '#68C8F8', '#A4E4FC']);
      GxArt.cloud(c, 44, 8, 14, 4, ['#E0F0F8', '#F8F8F8'], 1);
      c.drawImage(GxArt.once('hillValley', m => {
        Pix.rect(m, 56, 24, 50, 22, '#C8B898'); Pix.rect(m, 56, 24, 50, 2, '#E8D8B8'); Pix.rect(m, 54, 22, 54, 2, '#A89878');
        for (let x = 60; x < 104; x += 6) { Pix.rect(m, x, 28, 2, 18, '#E8D8B8'); Pix.rect(m, x + 2, 28, 1, 18, '#A89878'); }
        Pix.rect(m, 74, 6, 14, 17, '#C8B898'); Pix.rect(m, 74, 6, 14, 1, '#E8D8B8'); Pix.rect(m, 73, 4, 16, 2, '#A89878'); Pix.rect(m, 80, 0, 2, 4, '#7C7C7C');
        Pix.disc(m, 81, 13, 5, '#7C6C4C'); Pix.disc(m, 81, 13, 4, '#F8F8E8');
        Pix.line(m, 81, 13, 78, 11, '#202020'); Pix.line(m, 81, 13, 82, 9, '#202020');   // 10:04
        for (const [x, h] of [[46, 16], [108, 18]]) { Pix.rect(m, x + 2, 46 - 6, 2, 6, '#5C3C1C'); Pix.disc(m, x + 3, 46 - h + 4, 5, '#2C7C2C'); Pix.disc(m, x + 2, 46 - h + 3, 3, '#58B848'); }
        Pix.rect(m, 0, 44, INTRO_W, 4, '#BCBCBC'); Pix.rect(m, 0, 48, INTRO_W, 16, '#4C4C4C');
        for (let x = 2; x < INTRO_W; x += 12) Pix.rect(m, x, 56, 6, 1, '#F8F8F8');
      }), 0, 0);
      if (bolt) { Pix.line(c, 81, 0, 78, -1, '#F8F8F8'); Pix.line(c, 81, 0, 81, 3, '#F8F8F8', 2); }
      // the car, side-on, nose left: a gull-wing door up, the front tyre flat
      const x = 6, y = 36;
      Pix.rect(c, x + 2, y + 6, 40, 5, '#BCBCBC'); Pix.rect(c, x + 2, y + 6, 40, 1, '#E8E8E8');
      for (let k = 0; k < 4; k++) Pix.rect(c, x - k + 2, y + 7 + k, 1, 1, '#9C9C9C');   // the wedge nose
      Pix.rect(c, x + 14, y + 2, 18, 4, '#BCBCBC'); Pix.line(c, x + 9, y + 6, x + 14, y + 2, '#E8E8E8'); Pix.rect(c, x + 15, y + 3, 7, 3, '#3C4C5C'); Pix.rect(c, x + 23, y + 3, 6, 3, '#3C4C5C');
      Pix.line(c, x + 22, y + 2, x + 30, y - 6, '#E8E8E8', 2); Pix.line(c, x + 22, y + 3, x + 29, y - 4, '#3C4C5C');   // the door
      for (let k = 0; k < 3; k++) Pix.rect(c, x + 33 + k * 2, y + 3, 1, 3, '#5C5C5C');   // louvres
      Pix.rect(c, x + 2, y + 11, 40, 2, '#3C3C3C'); Pix.rect(c, x, y + 8, 3, 1, '#F8F8C8');
      Pix.rect(c, x + 38, y + 1, 4, 5, '#E0E0E0'); Pix.rect(c, x + 38, y + 1, 4, 1, '#F8F8F8');   // Mr Fusion
      Pix.line(c, x + 36, y + 6, x + 42, y + 12, '#F87830');
      Art.wheel(c, x + 33, y + 13, 4, '#202020', '#7C7C7C');
      Pix.rect(c, x + 6, y + 12, 10, 3, '#202020'); Pix.rect(c, x + 3, y + 15, 16, 2, '#202020'); Pix.rect(c, x + 2, y + 16, 18, 1, '#202020');   // the flat
      Pix.rect(c, x + 9, y + 13, 4, 2, '#7C7C7C'); Pix.rect(c, x + 10, y + 13, 2, 1, '#BCBCBC');
      for (let k = 0; k < 3; k++) { const q = (t + k * 6) % 18; if (q < 12) Pix.rect(c, x - 2 - (q >> 1), y + 12 + k * 2, 2, 1, '#F8F8F8'); }   // the air hissing out
      Art.smoke(c, x + 40, y, t, 4, 2);
      if ((t >> 3) & 1) Art.sparks(c, x + 18, y + 8, t, 4, '#58F8F8');
      // the time circuits: where you are
      Pix.rect(c, 3, 3, 21, 11, '#3C3C3C'); Pix.rect(c, 4, 4, 19, 9, '#100808'); Pix.rect(c, 4, 4, 19, 1, '#5C5C5C');
      GxArt.digits(c, '1955', 6, 6, (t >> 4) & 1 ? '#F83800' : '#F87830');
      Art.tank(c, 76, 50, 0, true, t >> 3); Art.flag(c, 93, 40, t);
    },
    bubble(t, outro) { return outro && t % 200 > 40 ? gxaSay('GREAT SCOTT!', 10, 18) : !outro && t % 160 > 100 ? gxaSay('88 MPH!', 4, 6) : null; },
  },

  // SATURN RINGS: the martian saucer and its four wingmen, ray guns blazing
  martian: {
    intro(c, t) {
      c.drawImage(gxaSaturn(), 0, 0);
      const X = 8, Y = 18 + Math.round(Math.sin(t / 16) * 2);
      for (let k = 0; k < 4; k++) { const a = t / 40 + k * Math.PI / 2; c.drawImage(GxGfx.get('msaucer', (t >> 3) & 1), Math.round(X + 29 + Math.cos(a) * 36 - 7), Math.round(Y + 18 + Math.sin(a) * 14 - 5)); }
      c.drawImage(GxArt.boss('martian', (t >> 3) & 1), X, Y);
      // its rays at you
      for (let k = 0; k < 3; k++) { const p = ((t + k * 12) % 36) / 36, x = X + 29 + p * 50, y = Y + 34 + p * 14; for (let j = -2; j <= 2; j++) Pix.rect(c, Math.round(x + j * 2), Math.round(y + j * 0.6), 2, 1, Math.abs(j) < 1 ? '#F8F8F8' : '#58F858'); }
      GxArt.ship(c, 88, 44 + Math.round(Math.sin(t / 10) * 2), t);
    },
    outro(c, t) {
      c.drawImage(gxaSaturn(), 0, 0);
      // the yodel got to it: the dome in pieces, its brain popped out on a spring
      const brainOf = (x, y) => Math.hypot((x + 0.5 - 29) / 11, (y + 0.5 - 9) / 8.5) <= 1 && Math.hypot(x + 0.5 - 29, y + 0.5 - 16.5) > 7.2;
      const domeOf = (x, y) => y < 23 && Math.hypot((x + 0.5 - 29) / 15.5, (y + 0.5 - 13) / 14.5) <= 1;
      const body = GxArt.boss('martian', (t >> 3) & 1, 3, null, g => { const r = seeded(9); for (let y = 0; y < g.length; y++) for (let x = 0; x < g[0].length; x++) if (domeOf(x, y) && !(Math.hypot(x + 0.5 - 29, y + 0.5 - 16.5) <= 7.2 && y > 9) && !(y > 19 && r() < 0.6)) g[y][x] = 0; }, 'pop');
      const brain = GxArt.boss('martian', 0, 1, null, g => { for (let y = 0; y < g.length; y++) for (let x = 0; x < g[0].length; x++) if (!brainOf(x, y)) g[y][x] = 0; }, 'brain');
      const X = 26, Y = 26, up = 9 + Math.round(Math.abs(Math.sin(t / 9)) * 5);
      c.drawImage(body, X, Y);
      for (let k = 0; k < 5; k++) Pix.rect(c, X + 27 + (k % 2) * 3, Y + 10 - Math.round((k + 1) * up / 6), 3, 1, '#BCBCBC');   // the spring
      c.drawImage(brain, X, Y - up);
      if (t % 18 < 6) for (let k = 0; k < 6; k++) { const a = k * 1.05; Pix.rect(c, Math.round(X + 29 + Math.cos(a) * 15), Math.round(Y - up + 6 + Math.sin(a) * 10), 1, 1, '#F8F8F8'); }
      Art.debris(c, X + 29, Y + 10, t, 8, '#A8F8D8', 1.3);   // glass
      Art.sparks(c, X + 46, Y + 24, t, 5, '#F8D800');
      for (let k = 0; k < 4; k++) { const q = ((t + k * 20) % 80) / 80; GxArt.note(c, Math.round(2 + q * 26 + k * 4), Math.round(50 - q * 30 + Math.sin(q * 9 + k) * 3), k % 2 ? '#F8F878' : '#F8F8F8'); }   // the yodel
      for (let k = 0; k < 2; k++) { const q = ((t + k * 45) % 90) / 90; c.drawImage(GxGfx.get('msaucer', (t >> 2) & 1), Math.round(70 + q * 50 + k * 10), Math.round(40 - q * 40 + k * 12)); }   // its wingmen run
    },
    bubble(t, outro) { return outro ? (t % 120 > 30 ? gxaSay('ACK...?', 76, 30) : null) : (t % 120 > 50 ? gxaSay('ACK ACK!', 66, 4) : null); },
  },

  // CYBERSPACE: the cube over the grid, its beam taking a tank apart
  cube: {
    intro(c, t) {
      gxaGrid(c, t);
      const X = 26, Y = -4 + Math.round(Math.sin(t / 30) * 1.5);
      // its beam, and a tank caught in it
      for (let y = Y + 54; y < INTRO_H; y++) { const hw = 6 + (y - Y - 54); Art.dith(c, 50 - hw, y, hw * 2, 1, (y + (t >> 1)) % 4 ? '#1C7C1C' : '#58F858', y & 1); }
      c.drawImage(GxArt.boss('cube', (t >> 4) & 1), X, Y);
      for (let k = 0; k < 4; k++) { const a = t / 25 + k * Math.PI / 2; c.drawImage(GxGfx.get('cubelet', (t >> 3) & 1), Math.round(56 + Math.cos(a) * 46 - 5), Math.round(28 + Math.sin(a) * 18 - 5)); }
      c.drawImage(Sprites.tank('p0', 0, 0, Config.playerPal(0)), 42, 50);
      Art.dith(c, 42, 50, 16, 14, '#58F858', (t >> 2) & 1);
      if ((t >> 2) & 1) for (let k = 0; k < 3; k++) Pix.rect(c, 42, 52 + k * 4 + ((t >> 1) & 3), 16, 1, '#58F858');
    },
    outro(c, t) {
      gxaGrid(c, t);
      // it comes apart, block by block, and piles up on the grid
      const img = GxArt.boss('cube', (t >> 3) & 1, 3), r = seeded(55), X = 26, Y = -2;
      for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) {
        const w = 15, h = j < 3 ? 15 : 13, rr = r(), p = Math.max(0, Math.min(1, (t - (3 - j) * 14 - rr * 24) / 50)), e = p * p;
        const n = (j * 4 + i) * 7 % 16, x0 = X + i * 15 + w / 2, y0 = Y + j * 15 + h / 2, x1 = 12 + (n % 8) * 12 + (n >> 3) * 6, y1 = 57 - (n >> 3) * 10;
        const tx = x0 + (x1 - x0) * p, ty = y0 + (y1 - y0) * e - Math.sin(p * Math.PI) * 6;
        Art.rot(c, w, h, sc => sc.drawImage(img, i * 15, j * 15, w, h, 0, 0, w, h), tx, ty, (rr - 0.5) * 1.6 * e);
      }
      // glitches where it stood
      const g = seeded(t >> 2);
      for (let k = 0; k < 5; k++) Pix.rect(c, 26 + Math.floor(g() * 60), Math.floor(g() * 40), 4 + Math.floor(g() * 10), 1, g() < 0.5 ? '#58F858' : '#F8F8F8');
      Art.sparks(c, 56, 30, t, 8, '#58F858');
      GxArt.ship(c, 92, 66 - ((t * 0.7) % 96), t);
    },
    bubble(t, outro) { return outro ? (t > 30 && t % 160 > 60 ? gxaSay('WE... WILL... ADAPT...?', 2, 2) : null) : t % 160 > 30 ? gxaSay('RESISTANCE IS FUTILE.', 2, 2) : null; },
  },

  // DARK STAR: the head, its hands coming down at you
  head: {
    intro(c, t) {
      gxaDarkStar(c, t);
      const X = 36, Y = 6 + Math.round(Math.sin(t / 24) * 1.5), open = t % 140 > 80 ? 1 : 0;
      if (open) for (let k = 0; k < 8; k++) { const a = k * 0.8 + 0.3, d = 40 - ((t * 2 + k * 11) % 40); Pix.rect(c, Math.round(X + 33 + Math.cos(a) * d), Math.round(Y + 44 + Math.sin(a) * d * 0.6), 3, 1, '#A8E8F8'); }
      c.drawImage(GxArt.boss('head', open + 2 * ((t >> 4) & 1)), X, Y);
      // its left hand slams down
      const s = t % 70, hy = s < 30 ? 30 : s < 40 ? 30 + (s - 30) * 2.4 : s < 54 ? 54 : 54 - (s - 54) * 1.5;
      if (s >= 40 && s < 46) GxArt.booms(c, 6, 54, 20, 6, t, 2, 3);
      c.drawImage(GxGfx.hand(false, -1), 4, Math.round(hy) - 10);
      c.drawImage(GxGfx.hand(false, 1), 96, 40 + Math.round(Math.sin(t / 15) * 2));
      GxArt.ship(c, s >= 40 && s < 54 ? 34 : 24, 46, t);
    },
    outro(c, t) {
      gxaDarkStar(c, t, true);
      // its brain fried: smoke, little flames, eyes crossed, the tongue out
      const pal = GX_BOSS_PALS.head.slice(); pal[6] = '#7C4C2C';
      const X = 22, Y = 8 + Math.round(Math.sin(t / 30));
      c.drawImage(GxArt.boss('head', 1 + 2 * ((t >> 4) & 1), 3, pal), X, Y);
      for (const ex of [X + 23, X + 43]) { Pix.line(c, ex - 3, Y + 22, ex + 3, Y + 28, '#0C1008', 2); Pix.line(c, ex + 3, Y + 22, ex - 3, Y + 28, '#0C1008', 2); }
      Pix.rect(c, X + 30, Y + 47, 6, 9, '#F8A8B8'); Pix.rect(c, X + 31, Y + 55, 4, 2, '#F8A8B8'); Pix.rect(c, X + 32, Y + 48, 1, 6, '#D87888');
      for (const [dx, s] of [[16, 1], [30, 3], [44, 5]]) { Art.smoke(c, X + dx, Y + 3, t, 4, s, true); Art.fire(c, X + dx - 2, Y + 5, 4, t + s * 3); }
      Art.sparks(c, X + 22, Y + 8, t, 5, '#F8F878'); Art.sparks(c, X + 48, Y + 10, t + 12, 5, '#F8F878');
      // its hands, limp, drifting off
      Art.flipV(c, 26, 20, sc => sc.drawImage(GxGfx.hand(false, -1), 0, 0), 0, 44 + Math.round(Math.sin(t / 20) * 2));
      Art.flipV(c, 26, 20, sc => sc.drawImage(GxGfx.hand(false, 1), 0, 0), 88, 46 + Math.round(Math.cos(t / 20) * 2));
      GxArt.ship(c, 92, 64 - ((t * 0.7) % 90), t);
    },
    bubble(t, outro) { return !outro && t % 140 < 80 && t > 10 ? gxaSay('COME CLOSER, LITTLE TANKS!', 2, 2) : outro && t % 180 > 100 ? gxaSay('MY BRAIN...', 120, 6) : null; },
  },

  // THE LAST BASE: CATS on its main screen, a bomb set up on the deck
  cats: {
    intro(c, t) {
      gxaBase(c, t);
      const X = 14, Y = 2 + Math.round(Math.sin(t / 20) * 1.5), talk = (t % 120) < 90;
      Art.dith(c, X + 14, 52, 56, 4, '#0C0C14', 0);
      c.drawImage(GxArt.boss('cats', (talk ? (t >> 3) & 1 : 0) + 2 * ((t >> 4) & 1)), X, Y);
      // MAIN SCREEN TURN ON
      if ((t >> 1) & 1 && t % 120 > 90) Art.dith(c, X + 29, Y + 15, 26, 23, '#58F858', 0);
      // somebody set up us the bomb
      for (const [bx, k] of [[8, 0], [96, 1]]) {
        Pix.disc(c, bx + 4, 58, 4, '#202020'); Pix.rect(c, bx + 2, 55, 2, 2, '#5C5C5C'); Pix.rect(c, bx + 3, 52, 1, 2, '#7C5000');
        if ((t + k * 3) & 2) Pix.rect(c, bx + 3, 51, 1, 1, '#F8D800');
        Pix.rect(c, bx, 58, 9, 5, '#100808'); GxArt.digits(c, String(9 - ((t >> 5) + k * 4) % 10), bx + 3, 58, '#F83800');
      }
    },
    outro(c, t) {
      gxaBase(c, t);
      // crashed onto the deck, its main screen cracked
      const X = 14, Y = 10, img = GxArt.boss('cats', 2 * ((t >> 4) & 1), 3);
      c.save(); c.beginPath(); c.rect(0, 0, INTRO_W, 58); c.clip(); c.drawImage(img, X, Y); c.restore();
      const n = seeded(t >> 1);
      for (let k = 0; k < 40; k++) Pix.rect(c, X + 30 + Math.floor(n() * 24), Y + 16 + Math.floor(n() * 22), 2, 1, n() < 0.5 ? '#3C3C3C' : '#7C7C7C');   // static
      const cx = X + 44, cy = Y + 22;
      for (const [dx, dy] of [[-14, -8], [-12, 9], [9, -9], [11, 10], [-3, 14], [2, -10], [13, 1]]) { Pix.line(c, cx, cy, cx + dx, cy + dy, '#F8F8F8'); Pix.line(c, cx + 1, cy + 1, cx + dx + 1, cy + dy + 1, '#202020'); }
      Pix.disc(c, cx, cy, 2, '#F8F8F8');
      Art.sparks(c, X + 30, Y + 20, t, 6, '#58F858'); Art.sparks(c, X + 70, Y + 14, t + 11, 5, '#F8D800');
      GxArt.burn(c, X + 10, Y + 12, t, 1); GxArt.burn(c, X + 76, Y + 18, t, 4);
      Art.smoke(c, X + 44, Y, t, 5, 2, true);
      // all your base are yours: the tanks on the deck with their flag
      Art.tank(c, 4, 49, 0, false, t >> 3); Art.tank(c, 92, 49, 1, true, t >> 3); Art.flag(c, 108, 39, t);
    },
    bubble(t, outro) { return !outro ? (t > 10 && t % 120 < 90 ? gxaSay((t % 240) < 120 ? 'HOW ARE YOU GENTLEMEN !!' : 'MAKE YOUR TIME.', 4, 2) : null) : t % 160 > 40 ? gxaSay('WHAT YOU SAY !!', 92, 34) : null; },
  },
};

// the words on each screen: two lines before the fight, one after it
const GX_BOSS_TALES = {
  mothership: { intro: ['A WHOLE FLEET IN ONE SHIP', 'SHOOT THE DRONES IT LETS OUT'], outro: 'ONE SMALL STEP FOR A TANK' },
  crab: { intro: ['A CRAB AS BIG AS A HANGAR', 'WHEN IT CHARGES, GET ASIDE!'], outro: 'CRAB CAKES FOR EVERYONE!' },
  titan: { intro: ['A MOUNTAIN THAT HATES YOU', 'ITS HEART IS MOLTEN ROCK'], outro: 'SPLIT RIGHT DOWN THE MIDDLE' },
  frost: { intro: ['HER HEART IS A BLOCK OF ICE', 'MIND THE FREEZE BEAM!'], outro: 'NOTHING LEFT BUT A PUDDLE' },
  eye: { intro: ['IT SEES EVERYTHING YOU DO', 'HIT IT ONLY WHILE IT IS OPEN'], outro: 'ARR! IT WEARS A PATCH NOW' },
  overmind: { intro: ['THE BRAIN THAT RUNS THE FLEET', 'ITS ORBS SHIELD IT - BREAK THEM'], outro: 'IT DID NOT THINK THIS THROUGH' },
  city: { intro: ['A SAUCER AS BIG AS A CITY', 'CATCH THE DISK: UPLOAD A VIRUS'], outro: 'HAPPY INDEPENDENCE DAY!' },
  delorean: { intro: ['WHERE IT IS GOING', 'IT DOES NOT NEED ROADS'], outro: 'STUCK IN 1955. WITH A FLAT.' },
  martian: { intro: ['ACK ACK! ACK ACK ACK!', 'BOMBS HIT IT THREE TIMES'], outro: 'IT COULD NOT STAND THE YODEL' },
  cube: { intro: ['IT ADAPTS TO YOUR GUNS', 'SO KEEP SWITCHING THEM!'], outro: 'IT DID NOT ADAPT TO THAT' },
  head: { intro: ['A HEAD THE SIZE OF A MOON', 'BREAK ITS HANDS FIRST'], outro: 'ITS BRAIN IS FRIED' },
  cats: { intro: ['ALL YOUR BASE ARE BELONG TO US', 'SOMEBODY SET UP US THE BOMB'], outro: 'FOR GREAT JUSTICE.' },
};

// the galaxy's final boss: the last sector's (CATS)
const gxaFinal = key => { const d = GX_BOSSES[GX_SECTORS.length - 1]; return !!d && d.key === key; };

// a whole galaxy boss screen, framed like the tank bosses' (bossart.js): b = Game.bossScreen ({ gx: key, outro, pts })
function drawGxBossScreen(ctx, b, t) {
  const def = GX_BOSSES.find(d => d.key === b.gx) || { name: '', pts: 0 }, art = GX_BOSS_ART[b.gx], tale = GX_BOSS_TALES[b.gx], outro = b.outro;
  ctx.fillStyle = COL.black; ctx.fillRect(0, 0, SW, SH);
  const final = gxaFinal(b.gx);
  if (!outro) {
    if ((t >> 3) & 1 || t < 8) Font.drawCenter(ctx, final ? 'WARNING! FINAL BOSS' : 'WARNING! BOSS APPROACHING', SW / 2, 2, COL.red);
  } else Font.drawCenter(ctx, final ? 'THE GALAXY IS SAVED!' : 'BOSS DEFEATED!', SW / 2, 2, COL.gold);
  let s = 3;
  while (s > 1 && Font.bigWidth(def.name, s) > SW - 16) s--;
  if (def.name) Font.big(ctx, def.name, (SW - Font.bigWidth(def.name, s)) >> 1, 23 - (7 * s >> 1), s, Sprites.bricks(ctx));
  ctx.fillStyle = outro ? '#F8D800' : '#F83800'; ctx.fillRect(INTRO_X - 4, INTRO_Y - 4, INTRO_W * 2 + 8, INTRO_H * 2 + 8);
  ctx.fillStyle = COL.black; ctx.fillRect(INTRO_X - 3, INTRO_Y - 3, INTRO_W * 2 + 6, INTRO_H * 2 + 6);
  ctx.fillStyle = '#7C7C7C'; ctx.fillRect(INTRO_X - 2, INTRO_Y - 2, INTRO_W * 2 + 4, INTRO_H * 2 + 4);
  if (art) {
    const pc = bossArtCanvas || (bossArtCanvas = makeCanvas(INTRO_W, INTRO_H)), c = pc.getContext('2d');
    c.clearRect(0, 0, INTRO_W, INTRO_H);
    c.imageSmoothingEnabled = false;
    (outro ? art.outro : art.intro)(c, t);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(pc, INTRO_X, INTRO_Y, INTRO_W * 2, INTRO_H * 2);
    // what it says, at full size over the picture
    const bub = art.bubble && art.bubble(t, outro);
    if (bub) {
      const w = bub.text.length * 8 + 6, bx = Math.min(INTRO_X + bub.x * 2, INTRO_X + INTRO_W * 2 - w), by = INTRO_Y + bub.y * 2;
      ctx.fillStyle = '#100808'; ctx.fillRect(bx - 1, by - 1, w + 2, 13);
      ctx.fillStyle = '#F8F8F8'; ctx.fillRect(bx, by, w, 11); ctx.fillRect(bx + w - 14, by + 11, 4, 3); ctx.fillRect(bx + w - 12, by + 14, 2, 2);
      Font.draw(ctx, bub.text, bx + 3, by + 2, '#100808');
    }
  } else { ctx.fillStyle = '#000010'; ctx.fillRect(INTRO_X, INTRO_Y, INTRO_W * 2, INTRO_H * 2); }
  const y = INTRO_Y + INTRO_H * 2 + 8;
  if (!outro) {
    if (tale) { Font.drawCenter(ctx, tale.intro[0], SW / 2, y, '#F8F8F8'); Font.drawCenter(ctx, tale.intro[1], SW / 2, y + 11, '#BCBCBC'); }
  } else {
    if (tale) Font.drawCenter(ctx, tale.outro, SW / 2, y, '#F8F8F8');
    Font.drawCenter(ctx, '+' + (b.pts || def.pts) + ' PTS', SW / 2, y + 11, COL.gold);
  }
  if ((t >> 4) & 1 || t < 20) Font.drawCenter(ctx, 'PRESS ENTER', SW / 2, y + 23, COL.red);
}

// ------------------------------------------------------------------ when they're shown
// The stage asks (st.gxPic) and the game shows it after the frame: a boss's WARNING picture as it arrives (it's
// already set up, off the top of the screen, and waits behind the picture), and in ENDLESS the victory picture of a
// stage's first boss (the stage goes on after it). A victory picture that ends the stage comes from toShop/toCurtain
// below: once the loot is in, before the hangar or the next curtain, which follow it.
{
  const _start = Stage.prototype.gxBossStart, _upd = Stage.prototype.updateGalaxy;
  Stage.prototype.gxBossStart = function () {
    const r = _start.apply(this, arguments), g = this.galaxy;
    if (g && g.boss) this.gxPic = { key: g.boss.key, at: Game.stageNum + '/' + (g.blk ?? '') + '/' + g.sec };
    return r;
  };
  Stage.prototype.updateGalaxy = function () {
    const g = this.galaxy, blk = g && g.blk, def = g && GX_BOSSES[g.sec], loop = g && g.loop;
    const r = _upd.apply(this, arguments);
    // ENDLESS: the stage moved on to its second block: its first boss is down (galaxy_modes.js)
    if (g && g.run === 'endless' && blk !== undefined && g.blk !== blk && def) this.gxPic = { key: def.key, outro: true, pts: def.pts * (1 + loop) };
    return r;
  };
}

const gxaUpdatePlay = Game.updatePlay, gxaToShop = Game.toShop, gxaToCurtain = Game.toCurtain, gxaNewGame = Game.newGame, gxaLoadGame = Game.loadGame;
const gxaUpdateBossScreen = Game.updateBossScreen, gxaRenderBossScreen = Game.renderBossScreen, gxaMusicFrame = Game.musicFrame;

Object.assign(Game, {
  // a galaxy boss's picture: wanted (BOSS SCREENS on, not an online guest) and drawn
  gxPicOk(key) { return this.mode === 'galaxy' && this.bossScreensWanted() && !!GX_BOSS_ART[key]; },
  toGxBossScreen(key, outro, pts) {
    this.bossScreen = { gx: key, outro: !!outro, pts: pts || 0 };
    this.setState(outro ? 'bossOutro' : 'bossIntro');
  },

  newGame() { this.gxSeen = {}; this.gxAfter = null; return gxaNewGame.apply(this, arguments); },
  loadGame() { this.gxSeen = {}; this.gxAfter = null; return gxaLoadGame.apply(this, arguments); },

  updatePlay() {
    const st = this.stage, r = gxaUpdatePlay.apply(this, arguments), q = st && st.gxPic;
    if (!q) return r;
    st.gxPic = null;
    if (this.state !== 'play' || this.stage !== st || st.over || !this.gxPicOk(q.key)) return r;
    if (!q.outro) {
      // one you've seen in this run (RESTART ROUND) isn't shown again
      const seen = this.gxSeen || (this.gxSeen = {});
      if (seen[q.at]) return r;
      seen[q.at] = true;
    }
    this.toGxBossScreen(q.key, q.outro, q.pts);
    return r;
  },

  // a sector won: the boss's victory picture first, then what was to come (the hangar, the next curtain, the result)
  gxOutroFirst(fn, args) {
    const st = this.stage, g = st && st.galaxy, def = g && GX_BOSSES[g.sec];
    if (this.mode !== 'galaxy' || this.state !== 'play' || !g || st.result !== 'clear' || !st.bossDefeated || st.gxOutroDone || !def) return false;
    st.gxOutroDone = true;
    if (!this.gxPicOk(def.key)) return false;
    this.gxAfter = [fn, Array.from(args)];
    this.toGxBossScreen(def.key, true, def.pts * (1 + g.loop));
    return true;
  },
  toShop() { return this.gxOutroFirst('toShop', arguments) ? undefined : gxaToShop.apply(this, arguments); },
  toCurtain() { return this.gxOutroFirst('toCurtain', arguments) ? undefined : gxaToCurtain.apply(this, arguments); },

  updateBossScreen() {
    const b = this.bossScreen;
    if (!b || !b.gx) return gxaUpdateBossScreen.apply(this, arguments);
    const m = Input.menu(), guest = Object.values(Input.remote).some(r => r.menu && r.menu.ok);
    if (this.t < BOSS_SCREEN_TIME && !(this.t > 20 && (m.ok || m.back || guest))) return;
    if (this.t < BOSS_SCREEN_TIME) Sound.play('select');
    // back to the fight (or on through an endless stage), or on to what the sector's end was waiting for
    this.setState('play');
    const after = b.outro && this.gxAfter;
    this.gxAfter = null;
    if (after) this[after[0]].apply(this, after[1]);
    else this.openH = SCREEN_H / 2;
  },

  renderBossScreen(ctx) {
    const b = this.bossScreen;
    if (b && b.gx) drawGxBossScreen(ctx, b, this.t); else gxaRenderBossScreen.apply(this, arguments);
  },

  // the music: WARNING! before (intro.js does that one), VICTORY! after (THE EARTH IS SAVED after the final boss)
  musicFrame() {
    const b = this.bossScreen, st = this.stage, s = this.state;
    const won = s === 'bossOutro' && b && b.gx ? b.gx : s === 'play' && st && st.galaxy && st.bossDefeated && GX_BOSSES[st.galaxy.sec] ? GX_BOSSES[st.galaxy.sec].key : null;
    if (!won) return gxaMusicFrame.apply(this, arguments);
    const tuning = s === 'play' && this.paused && ['MUSIC', 'MUSIC VOL'].includes(pauseMenu()[this.pauseIdx]);
    Music.want(gxaFinal(won) ? 'ending' : 'victory', Music.skillLevel(), s === 'play' && this.paused && !tuning);
  },
});
