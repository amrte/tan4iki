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
      const B = GxArt.boss('mothership', (t >> 3) & 1), X = Math.round(48 - B.width / 2), Y = 8 + Math.round(Math.sin(t / 24)), ex = X + (B.width >> 1), ey = Y + Math.round(B.height * 0.88);
      // the beam, scanning bands running down it
      for (let y = ey + 1; y < INTRO_H; y++) {
        const hw = 3 + Math.round((y - ey - 1) * 0.45);
        Art.dith(c, ex - hw, y, hw * 2, 1, (y - (t >> 1)) % 6 === 0 ? '#F8F8F8' : '#58F8F8', y & 1);
      }
      Art.rot(c, 16, 16, sc => sc.drawImage(Sprites.tank('p0', 0, 0, Config.playerPal(0)), 0, 0), ex, 52 - ((t >> 2) % 6), t / 9);
      c.drawImage(B, X, Y);
      // drones swooping out of it
      for (let k = 0; k < 4; k++) {
        const p = ((t + k * 30) % 120) / 120, s = k % 2 ? 1 : -1, img = GxGfx.get('drone', (t >> 3) & 1);
        c.drawImage(img, Math.round(ex + s * (10 + p * 50) - 6), Math.round(Y + B.height * 0.7 + Math.sin(p * 3) * 14 - p * 8));
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
      { const B = GxArt.boss('mothership', (t >> 4) & 1, 3); GxArt.rot(c, B, 38, 50 - B.height * 0.3, 0.42); }
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
      const B = GxArt.boss('crab', (t >> 4) & 1), w = B.width, X = Math.round(58 - w / 2 + Math.sin(t / 22) * 3), Y = 58 - B.height;
      Art.dith(c, X + Math.round(w * 0.1), 52, Math.round(w * 0.8), 6, '#5C1808', 0);   // its shadow
      c.drawImage(B, X, Y);
      Art.debris(c, X + Math.round(w * 0.13), 56, t, 4, '#C86838'); Art.debris(c, X + Math.round(w * 0.84), 56, t + 18, 4, '#C86838');
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
      const B = GxArt.boss('crab', (t >> 2) & 1, 3), w = B.width, h = B.height, X = Math.round(54 - w / 2), Y = 57 - h, k0 = w / 76, y0 = Y + Math.round(h * 0.3);
      for (let k = 0; k < 3; k++) for (const sd of [-1, 1]) {   // its legs kicking in the air
        const wg = Math.round(Math.sin(t / 4 + k * 2 + sd) * 2), kx = Math.round(54 + sd * (13 + k * 7) * k0), ky = Math.round(y0 - (12 - k) * k0) + wg, fx = Math.round(54 + sd * (10 + k * 9) * k0), fy = Math.round(y0 - (20 - k * 2) * k0) - wg;
        Pix.line(c, Math.round(54 + sd * (8 + k * 5) * k0), y0 + 4, kx, ky, '#7C1000', 2); Pix.line(c, kx, ky, fx, fy, '#E04030', 2); Pix.rect(c, fx, fy, 1, 1, '#F8B8A8');
      }
      Art.flipV(c, w, h, sc => sc.drawImage(B, 0, 0), X, Y);
      Art.stars(c, 54, Y - 4, t);
      Art.smoke(c, 40, Y + h * 0.4, t, 4, 2, true); Art.smoke(c, 70, Y + h * 0.45, t, 3, 6, true);
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
      const B = GxArt.boss('titan', (t >> 3) & 1), w = B.width, h = B.height, X = Math.round(76 - w / 2), Y = Math.round(32 - h / 2 + Math.sin(t / 30) * 1.5);
      Art.dith(c, X + Math.round(w * 0.3), Y + Math.round(h * 0.25), Math.round(w * 0.4), Math.round(h * 0.45), '#5C1C00', 0);   // the magma's glow, inside the rock
      c.drawImage(B, X, Y);
      // the rocks it throws at you
      for (let k = 0; k < 4; k++) {
        const p = ((t + k * 25) % 100) / 100, x = X + w * 0.45 - p * (44 + k * 8), y = Y + h * 0.6 + p * (10 + k * 4), s = 2 + (k % 2);
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
      const w = img.width, h = img.height, hw = w >> 1;
      Art.rot(c, hw, h, sc => sc.drawImage(img, 0, 0, hw, h, 0, 0, hw, h), 56 - w / 4 - 10 * p, 31 + 2 * p, -0.3 * p);
      Art.rot(c, w - hw, h, sc => sc.drawImage(img, hw, 0, w - hw, h, 0, 0, w - hw, h), 57 + w / 4 + 11 * p, 33 + 3 * p, 0.35 * p);
      Art.sparks(c, 56, 34, t, 8, '#F87830');
      Art.debris(c, 56, 30, t, 6, '#8C6C3C', 1.4);
      Art.stars(c, 44 - w / 4, 31 - h / 2, t);
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
      const B = GxArt.boss('frost', (t >> 3) & 1), w = B.width, h = B.height, X = Math.round(77 - w / 2), Y = Math.round(28 - h / 2 + Math.sin(t / 20) * 2), cx = X + (w >> 1);
      GxArt.glow(c, cx, Y + Math.round(h * 0.54), Math.round(w * 0.55), Math.round(h * 0.5), '#1C4C7C', (t >> 4) & 1);   // her cold aura
      c.drawImage(B, X, Y);
      // the shards she fans out
      for (let k = 0; k < 7; k++) { const p = ((t + k * 7) % 50) / 50, a = Math.PI / 2 + (k - 3) * 0.32, x = cx + Math.cos(a) * p * 50, y = Y + h * 0.77 + Math.sin(a) * p * 30; Pix.rect(c, Math.round(x), Math.round(y) - 1, 1, 3, '#E0F8F8'); Pix.rect(c, Math.round(x) - 1, Math.round(y), 3, 1, '#58B8E8'); }
      // her beam, and a tank frozen solid in it
      if (t % 90 > 40) { const by = Y + Math.round(h * 0.81); Pix.rect(c, cx - 1, by, 3, 64, (t >> 1) & 1 ? '#E0F8F8' : '#58F8F8'); Pix.rect(c, cx, by, 1, 64, '#F8F8F8'); }
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
      const m = Math.min(1, 0.35 + t / 160), img = GxArt.boss('frost', 0, 3), w = img.width, h = img.height, r = seeded(41), X = Math.round(53 - w / 2), Y = 57 - h + Math.round(m * 8);
      const ct = Math.round(h * 0.25), cw = Math.round(w * 0.36), pw = w * 0.48 + m * w * 0.22;
      Pix.disc(c, 53, 56, 4, '#58B8E8');
      for (let y = -4; y <= 4; y++) { const hw = Math.round(pw * Math.sqrt(1 - (y / 4.5) ** 2)); Pix.rect(c, 53 - hw, 55 + y, 2 * hw, 1, y < -2 ? '#A8E8F8' : '#58B8E8'); }
      Pix.rect(c, 40, 53, 12, 1, '#F8F8F8'); Pix.rect(c, 62, 55, 8, 1, '#E0F8F8');
      c.save(); c.beginPath(); c.rect(0, 0, INTRO_W, 54); c.clip();
      for (let x = 0; x < w; x++) { const d = Math.round((3 + r() * 8) * m); c.drawImage(img, x, ct, 1, h - ct, X + x, Y + ct + d, 1, h - ct); }
      c.restore();
      Art.rot(c, cw, ct, sc => sc.drawImage(img, Math.round(w * 0.32), 0, cw, ct, 0, 0, cw, ct), X - 2, 51, -0.6);   // the crown
      for (let k = 0; k < 5; k++) { const p = ((t + k * 13) % 40) / 40; Pix.rect(c, Math.round(X + w * (0.2 + k * 0.15)), Math.round(Y + h * 0.58 + p * 14), 1, 2, '#A8E8F8'); }   // drips
      GxArt.steam(c, X + w * 0.35, Y + h * 0.5, t, 4, 4); GxArt.steam(c, X + w * 0.7, Y + h * 0.55, t, 3, 7);
      Art.tank(c, 88, 50, 0, true, t >> 3); Art.flag(c, 104, 40, t);
    },
  },

  // NEBULA: the eye opens, stares, and a burning beam follows its gaze
  eye: {
    intro(c, t) {
      c.drawImage(gxaNebula(), 0, 0);
      Pix.stars(c, 14, 8, t, INTRO_H);
      const shut = t % 200 > 192 ? 1 : 0, B = GxArt.boss('eye', shut + 2 * ((t >> 3) & 1)), X = Math.round(56 - B.width / 2), Y = Math.round(28 - B.height / 2 + Math.sin(t / 26) * 1.5);
      for (let k = 0; k < 6; k++) { const a = t / 30 + k, img = GxGfx.get('bug', (t >> 3) & 1); c.drawImage(img, Math.round(56 + Math.cos(a) * 50 - 6), Math.round(28 + Math.sin(a * 1.3) * 26 - 6)); }
      c.drawImage(B, X, Y);
      // its stare: a warning line to you, then the beam
      const s = t % 120, px = X + (B.width >> 1), py = Y + Math.round(B.height * 0.47);
      if (!shut && s > 20 && s < 60 && (t >> 1) & 1) for (let k = 0; k < 40; k += 3) Pix.rect(c, Math.round(px + (92 - px) * k / 40), Math.round(py + (54 - py) * k / 40), 1, 1, '#F83800');
      if (!shut && s >= 60 && s < 84) { Pix.line(c, px - 1, py, 91, 54, '#F83800', 3); Pix.line(c, px, py + 1, 92, 55, '#F8F8F8'); Art.sparks(c, 92, 54, t, 6, '#F87830'); }
      GxArt.ship(c, s >= 60 && s < 84 ? 86 + ((t >> 1) & 1) : 84, 46, t);
    },
    outro(c, t) {
      c.drawImage(gxaNebula(), 0, 0);
      Pix.stars(c, 14, 8, t, INTRO_H);
      const B = GxArt.boss('eye', 1 + 2 * ((t >> 5) & 1), 3), w = B.width, h = B.height, X = Math.round(56 - w / 2), Y = Math.round(32 - h / 2 + Math.sin(t / 40)), cx = X + (w >> 1), cy = Y + Math.round(h * 0.47);
      c.drawImage(B, X, Y);
      // shut for good, under an eye patch
      const rx = Math.round(w * 0.17), ry = Math.round(h * 0.15);
      Pix.line(c, X + Math.round(w * 0.06), Y + Math.round(h * 0.29), cx - rx, cy - 3, '#202020', 2); Pix.line(c, cx + rx, cy - 3, X + Math.round(w * 0.94), Y + Math.round(h * 0.29), '#202020', 2);
      for (let y = -ry; y <= ry; y++) { const hw = Math.round(rx * Math.sqrt(1 - (y / (ry + 0.5)) ** 2)); Pix.rect(c, cx - hw, cy + y, 2 * hw, 1, y < -ry + 3 ? '#3C3C3C' : '#141414'); }
      Pix.rect(c, cx - Math.round(rx * 0.6), cy - ry + 1, 3, 1, '#5C5C5C');
      // a tear, and stars going round
      const p = (t % 50) / 50, tx = X + Math.round(w * 0.19); Pix.rect(c, tx, Math.round(cy + 4 + p * 16), 1, 2, '#78D8F8'); Pix.rect(c, tx, Math.round(cy + 6 + p * 16), 2, 1, '#78D8F8');
      Art.stars(c, cx, Y + 3, t);
      // its bugs scatter, you fly off
      for (let k = 0; k < 4; k++) { const q = ((t + k * 25) % 100) / 100; c.drawImage(GxGfx.get('bug', (t >> 2) & 1), Math.round(56 + (k % 2 ? 1 : -1) * (20 + q * 60) - 6), Math.round(40 - q * 40 + k * 4)); }
      GxArt.ship(c, 10, 66 - ((t * 0.6) % 90), t); GxArt.ship(c, 92, 72 - ((t * 0.6) % 96), t, 1);
    },
  },

  // THE CORE: the brain that runs it all, its orbs going round, its thoughts hammering out
  overmind: {
    intro(c, t) {
      gxaCore(c, t);
      const B = GxArt.boss('overmind', (t >> 3) & 1), w = B.width, h = B.height, X = Math.round(56 - w / 2), Y = Math.round(28 - h / 2 + Math.sin(t / 26) * 1.5), cx = X + (w >> 1), cy = Y + (h >> 1);
      for (let k = 0; k < 3; k++) { const r = (t * 0.7 + k * 18) % 54; if (r > 12) Art.ring(c, cx, Y + h * 0.35, r, k % 2 ? '#F878F8' : '#C060E0', Math.round(r * 2.5), t / 30); }   // its thoughts
      const orb = (k, back) => { const a = t / 35 + k * Math.PI / 2, s = Math.sin(a); if ((s < 0) !== back) return; GxArt.ball(c, cx + Math.cos(a) * (w * 0.62), cy + s * (h * 0.36), 4, 4, ['#F8F8F8', '#F8F878', '#F8D800', '#C88800', '#7C4C00']); };
      for (let k = 0; k < 4; k++) orb(k, true);
      c.drawImage(B, X, Y);
      for (let k = 0; k < 4; k++) orb(k, false);
      if ((t >> 2) % 5 === 0) Art.sparks(c, X + Math.round(w * 0.3), Y + Math.round(h * 0.08), t, 4, '#F8F878');
      for (let k = 0; k < 3; k++) { const a = t / 40 + k * 2.1; c.drawImage(GxGfx.get('wasp', (t >> 2) & 1), Math.round(56 + Math.cos(a) * 46 - 6), Math.round(50 + Math.sin(a) * 6 - 6)); }
    },
    outro(c, t) {
      gxaCore(c, t, 92);
      // sinking into the core, sparking and smoking
      const B = GxArt.boss('overmind', (t >> 2) & 1, 3), sink = Math.min(1, t / 160) * 10, cy = Math.round(46 - B.height * 0.25 + sink);
      const surf = x => 46 + Math.round(Math.sin(x / 6 + t / 10) * 1.2);
      c.save(); c.beginPath(); c.rect(0, 0, INTRO_W, 46); c.clip();
      GxArt.rot(c, B, 56, cy, 0.18);
      c.restore();
      for (let x = 0; x < INTRO_W; x++) { const y = surf(x); Pix.rect(c, x, y, 1, INTRO_H - y, '#F8A030'); Pix.rect(c, x, y, 1, 1, '#F8F8C8'); if ((x + (t >> 2)) % 7 < 2) Pix.rect(c, x, y + 1, 1, 1, '#F8D878'); }
      Art.dith(c, 0, 52, INTRO_W, 12, '#F87830', (t >> 3) & 1);
      for (let k = 0; k < 5; k++) { const q = ((t + k * 23) % 60) / 60, x = 30 + k * 13; if (q < 0.7) Pix.disc(c, x, 60 - Math.round(q * 14), q < 0.5 ? 1 : 2, '#F8F8C8'); }   // it bubbles
      Art.smoke(c, 44, cy - B.height * 0.3, t, 5, 2, true); Art.smoke(c, 70, cy - B.height * 0.2, t, 4, 5, true);
      Art.sparks(c, 48, cy - B.height * 0.35, t, 6, '#F8F878'); Art.sparks(c, 72, cy - B.height * 0.15, t + 9, 5, '#58F8F8');
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
      const B = GxArt.boss('city', open + 2 * ((t >> 3) & 1)), X = Math.round(56 - B.width / 2), Y = 2, dx = X + (B.width >> 1), dy = Y + Math.round(B.height * 0.775);
      c.drawImage(B, X, Y);
      if (open) Art.ring(c, dx, dy, 4 + ((t >> 1) % 6), '#F8F8F8', 16, t / 4);
      c.drawImage(gxaSkyline(), 0, 0);
      // its primary weapon on the tallest tower
      if (s > 110 && s < 140) { Pix.rect(c, dx - 4, dy + 3, 9, 64, (t >> 1) & 1 ? '#58F8F8' : '#F8F8F8'); Pix.rect(c, dx - 1, dy + 3, 3, 64, '#F8F8F8'); GxArt.booms(c, dx - 10, 32, 20, 14, t, 3, 1); }
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
      const B = GxArt.boss('delorean', (t >> 2) & 1), w = B.width, h = B.height, X = Math.round(56 - w / 2), Y = 58 - h + Math.round(Math.sin(t / 10));
      for (const fx of [0.26, 0.74]) for (let y = 18; y < Y + 2; y += 2) Pix.rect(c, X + Math.round(w * fx) - 1, y, 3, 2, (y + t) % 4 ? '#F8B800' : '#F83800');
      c.drawImage(B, X, Y);
      // lightning crackling round it
      const r = seeded(t >> 2);
      for (let k = 0; k < 2; k++) { let x = X + (k ? w - 2 : 2), y = Y + Math.round(h * 0.2 + r() * h * 0.6); for (let s = 0; s < 6; s++) { const nx = x + (k ? 3 : -3), ny = y + Math.floor(r() * 7) - 3; Pix.line(c, x, y, nx, ny, s % 2 ? '#F8F8F8' : '#A8E8F8'); x = nx; y = ny; } }
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
      const B = GxArt.boss('martian', (t >> 3) & 1), w = B.width, h = B.height, X = Math.round(36 - w / 2), Y = Math.round(34 - h / 2 + Math.sin(t / 16) * 2), cx = X + (w >> 1);
      for (let k = 0; k < 4; k++) { const a = t / 40 + k * Math.PI / 2; c.drawImage(GxGfx.get('msaucer', (t >> 3) & 1), Math.round(cx + Math.cos(a) * 34 - 7), Math.round(Y + h / 2 + Math.sin(a) * 15 - 5)); }
      c.drawImage(B, X, Y);
      // its rays at you
      for (let k = 0; k < 3; k++) { const p = ((t + k * 12) % 36) / 36, x = cx + p * 50, y = Y + h - 2 + p * 14; for (let j = -2; j <= 2; j++) Pix.rect(c, Math.round(x + j * 2), Math.round(y + j * 0.6), 2, 1, Math.abs(j) < 1 ? '#F8F8F8' : '#58F858'); }
      GxArt.ship(c, 88, 44 + Math.round(Math.sin(t / 10) * 2), t);
    },
    outro(c, t) {
      c.drawImage(gxaSaturn(), 0, 0);
      // the yodel got to it: the dome in pieces, its brain popped out on a spring
      // (where things are in its sprite, as parts of its size: the dome, the skull in it, the brain on the skull)
      const skull = (x, y, w, h) => Math.hypot(x + 0.5 - w / 2, y + 0.5 - h * 0.47) <= w * 0.125;
      const brainOf = (x, y, w, h) => Math.hypot((x + 0.5 - w / 2) / (w * 0.19), (y + 0.5 - h * 0.26) / (h * 0.24)) <= 1 && !skull(x, y, w, h);
      const domeOf = (x, y, w, h) => y < h * 0.64 && Math.hypot((x + 0.5 - w / 2) / (w * 0.27), (y + 0.5 - h * 0.37) / (h * 0.4)) <= 1;
      const body = GxArt.boss('martian', (t >> 3) & 1, 3, null, g => { const r = seeded(9), h = g.length, w = g[0].length; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (domeOf(x, y, w, h) && !(skull(x, y, w, h) && y > h * 0.27) && !(y > h * 0.53 && r() < 0.6)) g[y][x] = 0; }, 'pop');
      const brain = GxArt.boss('martian', 0, 1, null, g => { const h = g.length, w = g[0].length; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (!brainOf(x, y, w, h)) g[y][x] = 0; }, 'brain');
      const w = body.width, h = body.height, X = Math.round(55 - w / 2), Y = Math.round(46 - h / 2), cx = X + (w >> 1), up = Math.round((9 + Math.abs(Math.sin(t / 9)) * 5) * h / 36);
      c.drawImage(body, X, Y);
      for (let k = 0; k < 5; k++) Pix.rect(c, cx - 2 + (k % 2) * 2, Y + Math.round(h * 0.3) - Math.round((k + 1) * up / 6), 3, 1, '#BCBCBC');   // the spring
      c.drawImage(brain, X, Y - up);
      if (t % 18 < 6) for (let k = 0; k < 6; k++) { const a = k * 1.05; Pix.rect(c, Math.round(cx + Math.cos(a) * w * 0.27), Math.round(Y - up + h * 0.17 + Math.sin(a) * h * 0.28), 1, 1, '#F8F8F8'); }
      Art.debris(c, cx, Y + Math.round(h * 0.28), t, 8, '#A8F8D8', 1.3);   // glass
      Art.sparks(c, X + Math.round(w * 0.8), Y + Math.round(h * 0.67), t, 5, '#F8D800');
      for (let k = 0; k < 4; k++) { const q = ((t + k * 20) % 80) / 80; GxArt.note(c, Math.round(2 + q * 26 + k * 4), Math.round(50 - q * 30 + Math.sin(q * 9 + k) * 3), k % 2 ? '#F8F878' : '#F8F8F8'); }   // the yodel
      for (let k = 0; k < 2; k++) { const q = ((t + k * 45) % 90) / 90; c.drawImage(GxGfx.get('msaucer', (t >> 2) & 1), Math.round(70 + q * 50 + k * 10), Math.round(40 - q * 40 + k * 12)); }   // its wingmen run
    },
    bubble(t, outro) { return outro ? (t % 120 > 30 ? gxaSay('ACK...?', 76, 30) : null) : (t % 120 > 50 ? gxaSay('ACK ACK!', 66, 4) : null); },
  },

  // CYBERSPACE: the cube over the grid, its beam taking a tank apart
  cube: {
    intro(c, t) {
      gxaGrid(c, t);
      const B = GxArt.boss('cube', (t >> 4) & 1), w = B.width, h = B.height, X = Math.round(56 - w / 2), Y = Math.round(48 - h + Math.sin(t / 30) * 1.5), bx = X + Math.round(w * 0.4);
      // its beam, and a tank caught in it
      for (let y = Y + h - 4; y < INTRO_H; y++) { const hw = 6 + (y - Y - h + 4); Art.dith(c, bx - hw, y, hw * 2, 1, (y + (t >> 1)) % 4 ? '#1C7C1C' : '#58F858', y & 1); }
      c.drawImage(B, X, Y);
      for (let k = 0; k < 4; k++) { const a = t / 25 + k * Math.PI / 2; c.drawImage(GxGfx.get('cubelet', (t >> 3) & 1), Math.round(56 + Math.cos(a) * (w * 0.5 + 16) - 5), Math.round(Y + h / 2 + Math.sin(a) * (h * 0.32) - 5)); }
      c.drawImage(Sprites.tank('p0', 0, 0, Config.playerPal(0)), bx - 8, 50);
      Art.dith(c, bx - 8, 50, 16, 14, '#58F858', (t >> 2) & 1);
      if ((t >> 2) & 1) for (let k = 0; k < 3; k++) Pix.rect(c, bx - 8, 52 + k * 4 + ((t >> 1) & 3), 16, 1, '#58F858');
    },
    outro(c, t) {
      gxaGrid(c, t);
      // it comes apart, block by block, and piles up on the grid
      const img = GxArt.boss('cube', (t >> 3) & 1, 3), r = seeded(55), cw = img.width >> 2, ch = img.height >> 2, X = Math.round(56 - img.width / 2), Y = 48 - img.height;
      for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) {
        const w = i < 3 ? cw : img.width - 3 * cw, h = j < 3 ? ch : img.height - 3 * ch, rr = r(), p = Math.max(0, Math.min(1, (t - (3 - j) * 14 - rr * 24) / 50)), e = p * p;
        const n = (j * 4 + i) * 7 % 16, x0 = X + i * cw + w / 2, y0 = Y + j * ch + h / 2, x1 = 12 + (n % 8) * 12 + (n >> 3) * 6, y1 = 58 - (n >> 3) * (ch - 3);
        const tx = x0 + (x1 - x0) * p, ty = y0 + (y1 - y0) * e - Math.sin(p * Math.PI) * 6;
        Art.rot(c, w, h, sc => sc.drawImage(img, i * cw, j * ch, w, h, 0, 0, w, h), tx, ty, (rr - 0.5) * 1.6 * e);
      }
      // glitches where it stood
      const g = seeded(t >> 2);
      for (let k = 0; k < 5; k++) Pix.rect(c, X + Math.floor(g() * img.width), Y + Math.floor(g() * img.height), 4 + Math.floor(g() * 10), 1, g() < 0.5 ? '#58F858' : '#F8F8F8');
      Art.sparks(c, 56, 30, t, 8, '#58F858');
      GxArt.ship(c, 92, 66 - ((t * 0.7) % 96), t);
    },
    bubble(t, outro) { return outro ? (t > 30 && t % 160 > 60 ? gxaSay('WE... WILL... ADAPT...?', 2, 2) : null) : t % 160 > 30 ? gxaSay('RESISTANCE IS FUTILE.', 2, 2) : null; },
  },

  // DARK STAR: the head, its hands coming down at you
  head: {
    intro(c, t) {
      gxaDarkStar(c, t);
      const open = t % 140 > 80 ? 1 : 0, B = GxArt.boss('head', open + 2 * ((t >> 4) & 1)), X = Math.round(68 - B.width / 2), Y = Math.round(32 - B.height / 2 + Math.sin(t / 24) * 1.5);
      if (open) for (let k = 0; k < 8; k++) { const a = k * 0.8 + 0.3, d = 40 - ((t * 2 + k * 11) % 40); Pix.rect(c, Math.round(X + B.width / 2 + Math.cos(a) * d), Math.round(Y + B.height * 0.79 + Math.sin(a) * d * 0.6), 3, 1, '#A8E8F8'); }
      c.drawImage(B, X, Y);
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
      const B = GxArt.boss('head', 1 + 2 * ((t >> 4) & 1), 3, pal), w = B.width, h = B.height, X = Math.round(55 - w / 2), Y = Math.round(34 - h / 2 + Math.sin(t / 30)), cx = X + (w >> 1), ey = Y + Math.round(h * 0.45), e = Math.max(2, Math.round(w / 22));
      c.drawImage(B, X, Y);
      for (const ex of [cx - Math.round(w * 0.15), cx + Math.round(w * 0.15)]) { Pix.line(c, ex - e, ey - e, ex + e, ey + e, '#0C1008', 2); Pix.line(c, ex + e, ey - e, ex - e, ey + e, '#0C1008', 2); }
      const ty = Y + Math.round(h * 0.84);
      Pix.rect(c, cx - 3, ty, 6, 9, '#F8A8B8'); Pix.rect(c, cx - 2, ty + 8, 4, 2, '#F8A8B8'); Pix.rect(c, cx - 1, ty + 1, 1, 6, '#D87888');
      for (const [fx, s] of [[0.24, 1], [0.45, 3], [0.67, 5]]) { const x = X + Math.round(w * fx); Art.smoke(c, x, Y + 3, t, 4, s, true); Art.fire(c, x - 2, Y + 5, 4, t + s * 3); }
      Art.sparks(c, X + Math.round(w * 0.33), Y + Math.round(h * 0.14), t, 5, '#F8F878'); Art.sparks(c, X + Math.round(w * 0.73), Y + Math.round(h * 0.18), t + 12, 5, '#F8F878');
      // its hands, limp, drifting off
      Art.flipV(c, 26, 20, sc => sc.drawImage(GxGfx.hand(false, -1), 0, 0), 0, 44 + Math.round(Math.sin(t / 20) * 2));
      Art.flipV(c, 26, 20, sc => sc.drawImage(GxGfx.hand(false, 1), 0, 0), 88, 46 + Math.round(Math.cos(t / 20) * 2));
      GxArt.ship(c, 92, 64 - ((t * 0.7) % 90), t);
    },
    bubble(t, outro) { return !outro && t % 140 < 80 && t > 10 ? gxaSay('COME CLOSER, LITTLE TANKS!', 2, 2) : outro && t % 180 > 100 ? gxaSay('MY BRAIN...', 72, 4) : null; },
  },

  // THE LAST BASE: CATS on its main screen, a bomb set up on the deck
  cats: {
    intro(c, t) {
      gxaBase(c, t);
      const talk = (t % 120) < 90, B = GxArt.boss('cats', (talk ? (t >> 3) & 1 : 0) + 2 * ((t >> 4) & 1)), w = B.width, h = B.height, X = Math.round(56 - w / 2), Y = Math.round(30 - h / 2 + Math.sin(t / 20) * 1.5);
      Art.dith(c, X + Math.round(w * 0.17), 52, Math.round(w * 0.67), 4, '#0C0C14', 0);
      c.drawImage(B, X, Y);
      // MAIN SCREEN TURN ON
      if ((t >> 1) & 1 && t % 120 > 90) Art.dith(c, X + Math.round(w * 0.345), Y + Math.round(h * 0.29), Math.round(w * 0.31), Math.round(h * 0.44), '#58F858', 0);
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
      const img = GxArt.boss('cats', 2 * ((t >> 4) & 1), 3), w = img.width, h = img.height, X = Math.round(56 - w / 2), Y = 62 - h, k = w / 84;
      c.save(); c.beginPath(); c.rect(0, 0, INTRO_W, 58); c.clip(); c.drawImage(img, X, Y); c.restore();
      const n = seeded(t >> 1);
      for (let q = 0; q < 40; q++) Pix.rect(c, X + Math.round(w * (0.36 + n() * 0.28)), Y + Math.round(h * (0.31 + n() * 0.42)), 2, 1, n() < 0.5 ? '#3C3C3C' : '#7C7C7C');   // static
      const cx = X + Math.round(w * 0.52), cy = Y + Math.round(h * 0.42);
      for (const [dx, dy] of [[-14, -8], [-12, 9], [9, -9], [11, 10], [-3, 14], [2, -10], [13, 1]]) { const ex = cx + Math.round(dx * k), ey = cy + Math.round(dy * k); Pix.line(c, cx, cy, ex, ey, '#F8F8F8'); Pix.line(c, cx + 1, cy + 1, ex + 1, ey + 1, '#202020'); }
      Pix.disc(c, cx, cy, 2, '#F8F8F8');
      Art.sparks(c, X + Math.round(w * 0.36), Y + Math.round(h * 0.38), t, 6, '#58F858'); Art.sparks(c, X + Math.round(w * 0.83), Y + Math.round(h * 0.27), t + 11, 5, '#F8D800');
      GxArt.burn(c, X + Math.round(w * 0.12), Y + Math.round(h * 0.23), t, 1); GxArt.burn(c, X + Math.round(w * 0.9), Y + Math.round(h * 0.35), t, 4);
      Art.smoke(c, cx, Y, t, 5, 2, true);
      // all your base are yours: the tanks on the deck with their flag
      Art.tank(c, 4, 49, 0, false, t >> 3); Art.tank(c, 92, 49, 1, true, t >> 3); Art.flag(c, 108, 39, t);
    },
    bubble(t, outro) { return !outro ? (t > 10 && t % 120 < 90 ? gxaSay((t % 240) < 120 ? 'HOW ARE YOU GENTLEMEN !!' : 'MAKE YOUR TIME.', 4, 2) : null) : t % 160 > 40 ? gxaSay('WHAT YOU SAY !!', 92, 34) : null; },
  },
};

// ------------------------------------------------------------------ sectors 12-13 (galaxy3.js)
// a Tetris block, lit at its top left, shaded on its right and bottom
const gxaBlock = (c, x, y, S, col, dark = '#3C3C3C') => { Pix.rect(c, x, y, S, S, col); Pix.rect(c, x + S - 1, y, 1, S, dark); Pix.rect(c, x, y + S - 1, S, 1, dark); Pix.rect(c, x, y, 2, 1, '#F8F8F8'); Pix.rect(c, x, y + 1, 1, 1, '#F8F8F8'); };
// a tetromino (GX_TETRO_COLS' colours) with its top left at (x, y)
const gxaPiece = (c, s, r, x, y, S) => { for (const [cx, cy] of gxTetroCells({ s, r })) gxaBlock(c, Math.round(x + cx * S), Math.round(y + cy * S), S, GX_TETRO_COLS[s][0], GX_TETRO_COLS[s][1]); };
// a framed panel (the stack's LV and NEXT boxes)
const gxaPanel = (c, x, y, w, h) => { Pix.rect(c, x, y, w, h, '#7C7C7C'); Pix.rect(c, x, y, w, 1, '#BCBCBC'); Pix.rect(c, x, y, 1, h, '#BCBCBC'); Pix.rect(c, x, y + h - 1, w, 1, '#3C3C3C'); Pix.rect(c, x + 2, y + 2, w - 4, h - 4, '#0C0C1C'); };
// THE WELL: the dark, a faint grid, dim pieces falling
const gxaWell = (c, t) => {
  Pix.rect(c, 0, 0, INTRO_W, INTRO_H, '#05050C');
  for (let x = 3; x < INTRO_W; x += 4) Pix.rect(c, x, 0, 1, INTRO_H, '#0A0A1A');
  for (let y = (t >> 3) % 4; y < INTRO_H; y += 4) Pix.rect(c, 0, y, INTRO_W, 1, '#0A0A1A');
  for (let k = 0; k < 4; k++) { const n = Math.floor((t + k * 70) / 280), y = ((t + k * 70) % 280) / 3 - 16, s = (k * 3 + n) % 7; for (const [cx, cy] of gxTetroCells({ s, r: (k + n) % 4 })) Pix.rect(c, 6 + ((k * 31 + n * 17) % 100) + cx * 4, Math.round(y / 4) * 4 + cy * 4, 3, 3, GX_TETRO_COLS[s][1]); }
};
// THE STACK at picture size: its well (inside X..X+10S, Y..Y+11S) between brick walls, its blocks making the face
// (galaxy3.js's rows). o.off(i, j, x, y): moved ([dx, dy]) or gone (null); o.flash(j): a row's colour while it clears;
// o.dead: its eyes crossed out
function gxaStack(c, X, Y, S, ph, f, o = {}) {
  const W = 10 * S, H = 11 * S, cols = ['#3CBCFC', '#F8D800', '#B058F8', '#58D854'];
  for (const x0 of [X - 3, X + W]) for (let y = Y - 6; y < Y + H; y += 3) { Pix.rect(c, x0, y, 3, 2, '#7C7C7C'); Pix.rect(c, x0, y + 2, 3, 1, '#3C3C3C'); Pix.rect(c, x0 + (((y - Y) / 3) & 1 ? 0 : 2), y, 1, 2, '#3C3C3C'); Pix.rect(c, x0, y, 1, 1, '#BCBCBC'); }
  for (let x = X - 3; x < X + W + 3; x += 4) { Pix.rect(c, x, Y + H, 3, 2, '#7C7C7C'); Pix.rect(c, x, Y + H, 3, 1, '#BCBCBC'); Pix.rect(c, x, Y + H + 2, 4, 1, '#3C3C3C'); }
  Pix.rect(c, X, Y, W, H, '#0C0C1C');
  for (let x = X + S - 1; x < X + W; x += S) for (let y = Y + S - 1; y < Y + H; y += S) Pix.rect(c, x, y, 1, 1, '#2C2C3C');
  const rows = (ph >= 3 ? GX3_STACK_TOP : ph >= 2 ? GX3_STACK_TOP.slice(2) : []).concat(GX3_STACK), top = 11 - rows.length, face = top + rows.length - GX3_STACK.length;
  const at = (i, j) => { const x = X + i * S, y = Y + (top + j) * S, d = o.off ? o.off(i, j, x, y) : [0, 0]; return d && [x + d[0], y + d[1]]; };
  rows.forEach((r, j) => [...r].forEach((ch, i) => {
    const p = at(i, j), k = top + j - face, fl = o.flash && o.flash(j);
    if (!p || ch === '.') return;
    const [x, y] = p;
    if (fl) Pix.rect(c, x, y, S, S, fl);
    else if (ch >= '0' && ch <= '3' || ch === 'g') gxaBlock(c, x, y, S, ch === 'g' ? '#7C7C7C' : ph >= 3 && j < 2 && f ? '#F83800' : cols[+ch]);
    else if (ch === 'w') Pix.rect(c, x, y, S, S, '#F8F8F8');
    else {
      Pix.rect(c, x, y, S, S, '#000000');
      if (ch === 't') for (let d = 0; d < S - 1; d++) Pix.rect(c, x + (d >> 1), k === 4 ? y + d : y + S - 1 - d, S - (d >> 1) * 2, 1, '#F8F8F8');   // teeth
    }
  }));
  // the eyes: a black rim, red pupils glaring inward (crossed out once it's beaten); brows in a V
  const fj = face - top, e1 = at(1, fj + 1), e2 = at(6, fj + 1);
  [[e1, 1], [e2, -1]].forEach(([e, s]) => {
    if (!e || (o.flash && o.flash(fj + 1))) return;
    const [x0, y0] = e, w = 3 * S, h = 2 * S;
    Pix.rect(c, x0 - 1, y0 - 1, w + 2, 1, '#000000'); Pix.rect(c, x0 - 1, y0 + h, w + 2, 1, '#000000'); Pix.rect(c, x0 - 1, y0, 1, h, '#000000'); Pix.rect(c, x0 + w, y0, 1, h, '#000000');
    const px = s > 0 ? x0 + w - S - 1 - (f ? 0 : 1) : x0 + 1 + (f ? 1 : 0);
    if (o.dead) { Pix.line(c, px - 1, y0 + 1, px + S, y0 + h - 2, '#F83800', 2); Pix.line(c, px + S, y0 + 1, px - 1, y0 + h - 2, '#F83800', 2); }
    else { Pix.rect(c, px, y0 + 2, S, h - 3, '#F83800'); Pix.rect(c, px + 1, y0 + 3, 1, 1, '#F8F8F8'); }
    for (let i = 0; i < w + 1; i++) Pix.rect(c, s > 0 ? x0 - 1 + i : x0 + w - i, y0 - 4 + Math.round(i * 0.4), 1, 2, '#000000');
  });
  // the piece in play over it (none at level 9: no room left)
  if (ph < 3 && !o.dead) gxaPiece(c, 2, 2, X + 4 * S, Y + Math.max(0, top - 3) * S + (f ? 1 : 0), S);
}
// THE SLOP FEED: a pastel haze, melting stars, garbled watermarks, sparkles
const gxaSlopSky = (c, t) => {
  c.drawImage(GxArt.once('slopSky', m => {
    Pix.bands(m, 0, INTRO_H, ['#120A1A', '#1C1028', '#24183A', '#201C3C', '#182838']);
    for (const [x, y, text] of [[4, 8, 'LOREM IPSUM'], [52, 20, 'WATERMARK'], [8, 40, 'BUY NOW'], [64, 52, 'STOCK IMAGE']]) {
      Art.rot(m, 60, 7, sc => gxTiny(sc, text, 30, 1, '#3C2C58', null), x + 28, y + 3, -0.22);
    }
  }), 0, 0);
  const r = seeded(77);
  for (let k = 0; k < 12; k++) { const x = Math.floor(r() * INTRO_W), y = Math.floor((r() * INTRO_H + t * (0.15 + r() * 0.2)) % (INTRO_H + 8)) - 4, len = 2 + (k % 4); Pix.rect(c, x, y, 1, 1, '#F8E8F8'); Pix.rect(c, x, y + 1, 1, len, k % 2 ? '#7C6C98' : '#5C7C88'); }
  for (let k = 0; k < 3; k++) { const q = (t + k * 50) % 90; if (q > 40) continue; const x = 10 + ((k * 41 + Math.floor((t + k * 50) / 90) * 23) % 92), y = 6 + ((k * 23 + Math.floor((t + k * 50) / 90) * 13) % 40), n = q < 10 || q > 30 ? 1 : 2; Pix.rect(c, x - n, y, 2 * n + 1, 1, '#F8E878'); Pix.rect(c, x, y - n, 1, 2 * n + 1, '#F8E878'); Pix.rect(c, x, y, 1, 1, '#F8F8F8'); }
};
// a six-fingered hand reaching up out of the goo (cx: its palm), its fingers wiggling
const gxaHand6 = (c, cx, y, t) => {
  GxArt.ball(c, cx, y, 5, 4, ['#F8F8F8', '#F8C8E8', '#F0C8A0', '#D898D0', '#8C5098']);
  for (let k = 0; k < 6; k++) { const a = -Math.PI / 2 + (k - 2.5) * 0.3, len = 5 + (k % 3) + Math.round(Math.sin(t / 6 + k)), x0 = cx + Math.cos(a) * 3, y0 = y + Math.sin(a) * 2; Pix.line(c, Math.round(x0), Math.round(y0), Math.round(x0 + Math.cos(a) * len), Math.round(y0 + Math.sin(a) * len), '#F0C8A0'); Pix.rect(c, Math.round(x0 + Math.cos(a) * len), Math.round(y0 + Math.sin(a) * len), 1, 1, '#F8F8F8'); }
};
// a goo eye, looking its own way (or crossed out)
const gxaGooEye = (c, x, y, r, k, t, dead) => {
  Pix.disc(c, x, y, r, '#F8F8F8');
  if (dead) { Pix.line(c, x - r + 1, y - r + 1, x + r - 1, y + r - 1, '#180818'); Pix.line(c, x + r - 1, y - r + 1, x - r + 1, y + r - 1, '#180818'); return; }
  const a = k * 2.1 + t / 40; Pix.disc(c, Math.round(x + Math.cos(a) * r * 0.4), Math.round(y + Math.sin(a) * r * 0.4), Math.max(1, r >> 1), k % 2 ? '#3C8CF8' : '#C83C50');
};

Object.assign(GX_BOSS_ART, {
  // THE WELL: the stack glares down, pieces rain on a tank dodging below
  stack: {
    intro(c, t) {
      gxaWell(c, t);
      const X = 40, Y = 4, S = 4, f = (t >> 4) & 1;
      for (let k = 0; k < 2; k++) { const p = ((t + k * 60) % 120) / 120; gxaPiece(c, (k * 4 + 1) % 7, k, 90 + k * 8, -12 + p * 80, 3); }
      gxaPanel(c, 20, 12, 15, 22); gxTiny(c, 'LV', 27, 16, '#BCBCBC', null); gxTiny(c, '1', 27, 24, '#F8D800', null);
      gxaPanel(c, 88, 4, 18, 20); gxTiny(c, 'NEXT', 97, 7, '#F8F8F8', null); gxaPiece(c, (t >> 6) % 7, 0, 92, 14, 3);
      gxaPanel(c, 88, 28, 18, 12); gxTiny(c, '000', 97, 32, '#58D854', null);
      gxaStack(c, X, Y, S, 1, f);
      // a hard drop coming down at you: its column shown, then the piece
      const q = t % 90, px = (Math.floor(t / 90) * 5) % 8;
      if (q < 40 && (t >> 2) & 1) for (let y = 0; y < INTRO_H; y += 3) Pix.rect(c, px + 5, y, 1, 1, '#F83800');
      if (q >= 40) gxaPiece(c, (Math.floor(t / 90) * 3) % 7, 1, px, Math.min(52, -16 + (q - 40) * 6), 4);
      GxArt.ship(c, q >= 34 ? 22 + ((t >> 1) & 1) : px, 46, t);
    },
    outro(c, t) {
      gxaWell(c, t);
      const X = 34, Y = 4, S = 4, r = seeded(12), clear = t < 70, fall = Math.min(1, Math.max(0, (t - 70) / 24));
      // TETRIS!: its bottom four rows (the mouth) flash away; what's left drops, crumbles, crossed-out eyes
      const n = GX3_STACK.length, j0 = n - 4, jit = [];
      for (let k = 0; k < 80; k++) jit.push([(r() - 0.5) * 3, r() * 4, r()]);
      gxaStack(c, X, Y, S, 1, 0, {
        dead: !clear,
        flash: j => clear && j >= j0 ? ((t >> 2) & 1 ? '#F8F8F8' : '#58F8F8') : null,
        off: (i, j) => {
          if (clear) return [0, 0];
          if (j >= j0) return null;
          const q = jit[(i * 7 + j * 3) % 80];
          return [Math.round(q[0] * fall), Math.round(4 * S * fall * fall + q[1] * fall)];
        },
      });
      if (clear) { gxaPiece(c, 0, 1, X + 9 * S, Y + 7 * S, S); gxTiny(c, 'TETRIS!', X + 5 * S, Y + 8 * S + 2, (t >> 3) & 1 ? '#F8D800' : '#F83800', '#100808'); }
      else if (t < 120) Art.debris(c, X + 5 * S, Y + 30, t - 70, 6, '#B058F8', 1.2);
      // its level panel says it; and the high scores: you on top
      gxaPanel(c, 10, 12, 20, 24); if ((t >> 4) & 1 || clear) { gxTiny(c, 'GAME', 20, 16, '#F83800', null); gxTiny(c, 'OVER', 20, 24, '#F83800', null); }
      gxaPanel(c, 78, 4, 33, 34); gxTiny(c, 'TOP 3', 94, 7, '#F8D800', null);
      gxTiny(c, '1 YOU', 93, 15, (t >> 3) & 1 ? '#F8F8F8' : '#F8D800', null); Pix.rect(c, 105, 15, 3, 4, '#E8A800'); Pix.rect(c, 106, 14, 1, 1, '#E8A800');
      gxTiny(c, '2 AAA', 93, 23, '#BCBCBC', null); gxTiny(c, '3 STACK', 94, 31, '#7C7C7C', null);
      GxArt.ship(c, 52, 66 - ((t * 0.6) % 90), t);
    },
    bubble(t, outro) { return outro ? (t > 70 && t % 160 > 20 ? gxaSay('INSERT COIN...', 2, 2) : null) : t % 120 > 10 ? gxaSay(t % 120 < 60 ? 'READY?' : 'GO!', 40, 2) : null; },
  },

  // THE SLOP FEED: the machine beaming out of its goo, letters spilling at you
  slop: {
    intro(c, t) {
      gxaSlopSky(c, t);
      const B = GxArt.boss('slop', (t >> 3) & 1), X = 2, Y = INTRO_H - B.height + 2 + Math.round(Math.sin(t / 30));
      c.drawImage(B, X, Y);
      // its wall of text, coming at you
      const words = 'GREAT QUESTION HERE ARE 5 WAYS TO';
      for (let k = 0; k < 8; k++) { const q = ((t * 0.8 + k * 14) % 112), ch = words[(k * 5 + Math.floor((t * 0.8 + k * 14) / 112)) % words.length]; if (ch !== ' ') gxTiny(c, ch, X + 60 + q * 0.5, 10 + ((k * 13) % 44) + Math.round(Math.sin(q / 8) * 2), k % 2 ? '#F8C8E8' : '#C8F8E0', '#180818'); }
      GxArt.ship(c, 94, 44 + Math.round(Math.sin(t / 14) * 2), t);
    },
    outro(c, t) {
      gxaSlopSky(c, t);
      // melted down into a puddle, its screen cracked: AN ERROR OCCURRED
      const sink = Math.round(Math.min(1, t / 140) * 3), mx = 30, my = 14 + sink;
      Pix.rect(c, mx, my, 44, 30, '#180818'); Pix.rect(c, mx + 1, my + 1, 42, 28, '#283048'); Pix.rect(c, mx + 1, my + 1, 42, 1, '#3C4868');
      Pix.rect(c, mx + 3, my + 3, 38, 24, (t >> 3) % 8 ? '#C8F8E0' : '#F8F8F8');
      for (let y = my + 4; y < my + 27; y += 2) Pix.rect(c, mx + 3, y, 38, 1, '#B8E8D0');
      gxTiny(c, 'AN ERROR', mx + 22, my + 5, '#C83C50', null); gxTiny(c, 'OCCURRED', mx + 22, my + 11, '#C83C50', null);
      gxTiny(c, 'PLEASE', mx + 22, my + 17, '#283048', null); gxTiny(c, 'TRY AGAIN', mx + 22, my + 22 - ((t >> 4) & 1), '#283048', null);
      const cx = mx + 38, cy = my + 16;
      for (const [dx, dy] of [[-6, -6], [-7, 4], [3, -9], [3, 8], [-3, 10], [-8, -1]]) { Pix.line(c, cx, cy, cx + dx, cy + dy, '#F8F8F8'); Pix.line(c, cx + 1, cy + 1, cx + dx + 1, cy + dy + 1, '#180818'); }
      Art.sparks(c, cx, cy, t, 5, '#F8D800');
      // the goo: a puddle, lumps oozing over the monitor, drips, eyes adrift
      for (const [x, y, rx, ry] of [[mx + 2, my + 2, 5, 4], [mx + 42, my + 3, 4, 4], [mx - 2, my + 31, 6, 4]]) GxArt.ball(c, x, y, rx, ry, ['#F8F8F8', '#F8C8E8', '#D898D0', '#8C5098', '#5C2C68']);
      for (let k = 0; k < 3; k++) { const q = ((t + k * 20) % 60) / 60; Pix.rect(c, mx + 6 + k * 15, my + 30 + Math.round(q * 6), 1, 2, '#D898D0'); }
      GxArt.ball(c, 56, 58, 54, 9, ['#F8F8F8', '#F8C8E8', '#D898D0', '#8C5098', '#5C2C68']);
      GxArt.ball(c, 30, 54, 16, 5, ['#F8F8F8', '#F8C8E8', '#D898D0', '#8C5098', '#5C2C68']); GxArt.ball(c, 84, 55, 14, 5, ['#F8F8F8', '#F8C8E8', '#D898D0', '#8C5098', '#5C2C68']);
      for (const [x, y, rr, k] of [[18, 56, 3, 0], [44, 60, 2, 1], [70, 59, 3, 2], [96, 57, 2, 3], [58, 55, 2, 4]]) gxaGooEye(c, x, y, rr, k, t, k % 2 === 0);
      // a six-fingered hand waves the white flag
      const hx = 12 + Math.round(Math.sin(t / 16) * 2);
      Pix.line(c, hx + 2, 48, hx + 4, 26, '#BCBCBC'); Art.flag(c, hx + 4, 24, t);
      gxaHand6(c, hx, 50, t);
      // and it tries to regenerate itself, forever
      const q = t % 100;
      Pix.rect(c, 80, 16, 28, 8, '#100818'); Pix.rect(c, 80, 16, 28, 1, '#C8F8E0'); Pix.rect(c, 80, 23, 28, 1, '#C8F8E0');
      if (q < 80) Pix.rect(c, 82, 18, Math.round(24 * q / 80), 4, '#58F8C8'); else gxTiny(c, 'ERROR', 94, 18, (t >> 1) & 1 ? '#F83800' : '#F8F8F8', null);
      GxArt.ship(c, 94, 38 + Math.round(Math.sin(t / 14) * 2), t);
    },
    bubble(t, outro) { return outro ? (t % 200 > 30 ? gxaSay("YOU'RE ABSOLUTELY RIGHT!", 2, 2) : null) : t > 8 ? gxaSay(t % 240 < 120 ? 'CERTAINLY!' : 'GREAT QUESTION!', 30, 2) : null; },
  },
});

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
  stack: { intro: ['A TETRIS WELL THAT FIGHTS BACK', 'GET OFF A LINE BEFORE IT CLEARS'], outro: 'TETRIS! TOP OUT! GAME OVER!' },
  slop: { intro: ['CERTAINLY! HERE IS YOUR BOSS.', 'SHOOT ITS BAR OR IT REGENERATES'], outro: 'RESPONSE TERMINATED.' },
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
