'use strict';
// =====================================================================
//  The mode title pictures (intro.js puts them on the screen): one scene per mode, 240x136, a pixel to a pixel.
//  Each is a little film of what its mode is about, with depth (sky, far hills, near ground), its own light and
//  things going on: tanks driving and firing, shells, muzzle flashes, smoke, sparks, debris and explosions.
//  What doesn't move is drawn once into a cached layer (IA.layer) and copied each frame; the rest goes on top.
//  t = frames since the screen opened (60 a second). The helpers first, then the pictures.
// =====================================================================

const IPW = MODE_PIC_W, IPH = MODE_PIC_H;
const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + 0.5) / 16);
const bayer = (x, y) => BAYER4[(y & 3) * 4 + (x & 3)];

const IA = {
  cache: new Map(),
  rgbs: new Map(),
  // something that doesn't move, drawn once into its own canvas
  layer(k, draw, w = IPW, h = IPH) {
    let c = this.cache.get(k);
    if (!c) { c = makeCanvas(w, h); const x = c.getContext('2d'); x.imageSmoothingEnabled = false; draw(x); this.cache.set(k, c); }
    return c;
  },
  rgb(col) {
    let v = this.rgbs.get(col);
    if (!v) { v = [1, 3, 5].map(i => parseInt(col.substr(i, 2), 16)); this.rgbs.set(col, v); }
    return v;
  },
  // w x h pixels at (x0, y0) from fn(x, y) -> '#RRGGBB' or nothing (in picture pixels), laid over what's there
  paint(c, x0, y0, w, h, fn) {
    x0 = Math.round(x0); y0 = Math.round(y0); w = Math.round(w); h = Math.round(h);
    if (w <= 0 || h <= 0) return;
    const src = makeCanvas(w, h), sc = src.getContext('2d'), img = sc.createImageData(w, h), d = img.data;
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const col = fn(x0 + i, y0 + j);
      if (!col) continue;
      const v = this.rgb(col), o = (j * w + i) * 4;
      d[o] = v[0]; d[o + 1] = v[1]; d[o + 2] = v[2]; d[o + 3] = 255;
    }
    sc.putImageData(img, 0, 0);
    c.drawImage(src, x0, y0);
  },
  // a number from 0 to 1 for a spot (the same every time): texture, which brick is darker ...
  hash(a, b = 0, s = 0) { let h = (a * 374761393 + b * 668265263 + s * 2147483647) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; },
  // smooth noise from 0 to 1 along x (one bump every unit or so)
  noise(x, s = 0) { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return IA.hash(i, 1, s) * (1 - u) + IA.hash(i + 1, 1, s) * u; },
  // smooth noise over a plane, repeating every pw x ph cells (a map that wraps round)
  noise2(x, y, s = 0, pw = 1e6, ph = 1e6) {
    const i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
    const h = (a, b) => IA.hash(((a % pw) + pw) % pw, ((b % ph) + ph) % ph, s);
    return (h(i, j) * (1 - u) + h(i + 1, j) * u) * (1 - v) + (h(i, j + 1) * (1 - u) + h(i + 1, j + 1) * u) * v;
  },
  // a dithered gradient through cols, top to bottom (an NES sky)
  grad(c, x, y, w, h, cols) {
    const n = cols.length - 1;
    this.paint(c, x, y, w, h, (i, j) => { const v = (j - y) / Math.max(1, h - 1) * n, k = Math.floor(v); return cols[Math.min(n, k + (v - k > bayer(i, j) ? 1 : 0))]; });
  },
  // see-through col over a box at about a (0-1), as an ordered dither: shade, fog, light
  veil(c, x, y, w, h, col, a) { if (a > 0) this.paint(c, x, y, w, h, (i, j) => (bayer(i, j) < a ? col : null)); },
  dith(c, x, y, w, h, col, ph = 0) { Art.dith(c, x, y, w, h, col, ph); },
  // hills or mountains standing on y, about amp high, lit from the left: cols [lit, body, shaded], snow over snow
  ridge(c, y, amp, seed, cols, o = {}) {
    const r = seeded(seed), p = [r() * 6, r() * 6, r() * 6, r() * 6], f = o.f || 1, w = o.w || IPW, x0 = o.x || 0;
    const hg = x => amp * (0.6 + 0.22 * Math.sin(x * 0.019 * f + p[0]) + 0.13 * Math.sin(x * 0.051 * f + p[1]) + 0.06 * Math.sin(x * 0.13 * f + p[2])
      + (o.jag ? o.jag * IA.noise(x * f / 7, seed) : 0));
    for (let x = x0; x < x0 + w; x++) {
      const h = hg(x), top = Math.round(y - h), slope = h - hg(x - 1), bot = o.bottom || IPH;
      Pix.rect(c, x, top, 1, bot - top, cols[1]);
      const lit = slope > 0.05, k = Math.min(6, Math.round(Math.abs(slope) * 6) + 1);
      if (lit) for (let j = 0; j < k + 2; j++) { if (j < k || (x + j) & 1) Pix.rect(c, x, top + j, 1, 1, cols[0]); }
      else if (slope < -0.05) for (let j = 1; j < k + 3; j++) if (j < k || (x + j) & 1) Pix.rect(c, x, top + j, 1, 1, cols[2]);
      if (o.snow && h > amp * o.snow) { const s = Math.round((h - amp * o.snow) * 0.6) + 1; for (let j = 0; j < s; j++) if (j < s - 1 || (x & 1)) Pix.rect(c, x, top + j, 1, 1, lit ? '#F8F8F8' : '#BCBCDC'); }
      if (o.trees && IA.hash(x, seed) < o.trees) { const th = 2 + Math.floor(IA.hash(seed, x) * 3); Pix.rect(c, x, top - th, 1, th, cols[2]); Pix.rect(c, x - 1, top - th + 1, 3, th - 1, cols[2]); }
    }
  },
  // flecks of texture (grass, stones, sand) over a box
  speckle(c, x, y, w, h, cols, n, seed = 1, sw = 1) {
    const r = seeded(seed);
    for (let k = 0; k < n; k++) Pix.rect(c, x + Math.floor(r() * w), y + Math.floor(r() * h), sw, 1, cols[Math.floor(r() * cols.length)]);
  },
  // a ball lit from the top left, tones dithered into each other: cols light to dark (5); band(x, y): more or less light
  ball(c, cx, cy, rx, ry, cols, band) {
    this.paint(c, Math.floor(cx - rx), Math.floor(cy - ry), Math.ceil(rx * 2) + 1, Math.ceil(ry * 2) + 1, (x, y) => {
      const nx = (x + 0.5 - cx) / rx, ny = (y + 0.5 - cy) / ry, d = nx * nx + ny * ny;
      if (d > 1) return null;
      const l = -nx * 0.5 - ny * 0.6 + Math.sqrt(1 - d) * 0.65 + (bayer(x, y) - 0.5) * 0.25 + (band ? band(x, y) : 0);
      return cols[l > 0.95 ? 0 : l > 0.55 ? 1 : l > 0.15 ? 2 : l > -0.25 ? 3 : 4];
    });
  },
  // a soft cloud (nebula, smoke bank): cols from the outside in, the outside dithered, its edge wobbling
  cloud(c, cx, cy, rx, ry, cols, seed = 0) {
    this.paint(c, Math.floor(cx - rx * 1.3), Math.floor(cy - ry * 1.3), Math.ceil(rx * 2.6) + 1, Math.ceil(ry * 2.6) + 1, (x, y) => {
      const dx = (x - cx) / rx, dy = (y - cy) / ry, a = Math.atan2(dy, dx), d = Math.hypot(dx, dy) / (1 + 0.18 * Math.sin(a * 3 + seed) + 0.1 * Math.sin(a * 7 + seed * 2.3));
      for (let i = cols.length - 1; i >= 0; i--) {
        if (d > 1 - i / cols.length) continue;
        if (i === 0 && bayer(x, y) > 0.5) return null;
        return cols[i];
      }
      return null;
    });
  },
  // a puffy cloud in the sky: lumps along a flat bottom, lit from above; cols [lit, body, shade]
  puffs(c, x, y, w, cols, seed = 1) {
    const r = seeded(seed), n = Math.max(2, Math.round(w / 9));
    const lumps = [];
    for (let k = 0; k < n; k++) lumps.push([x + (k + 0.5) * w / n + (r() - 0.5) * 3, Math.round(3 + r() * 4 + Math.sin(k / (n - 1) * Math.PI) * w / 8)]);
    for (const [lx, lr] of lumps) Pix.disc(c, Math.round(lx), y - lr + 2, lr, cols[2]);
    for (const [lx, lr] of lumps) Pix.disc(c, Math.round(lx) - 1, y - lr + 1, lr - 1, cols[1]);
    for (const [lx, lr] of lumps) Pix.disc(c, Math.round(lx) - 2, y - lr, Math.max(1, lr - 3), cols[0]);
    Pix.rect(c, x + 2, y + 1, w - 4, 2, cols[2]);
  },
  // a shaded puff of smoke: tone 0 light .. 2 dark, 3 sandy dust
  puff(c, x, y, r, tone = 1) {
    const T = [['#F8F8F8', '#BCBCBC', '#7C7C7C'], ['#BCBCBC', '#8C8C8C', '#5C5C5C'], ['#6C6C6C', '#484848', '#2C2C2C'], ['#F8E0A8', '#C8A060', '#8C6830']][tone];
    x = Math.round(x); y = Math.round(y); r = Math.max(1, Math.round(r));
    Pix.disc(c, x, y, r, T[2]);
    if (r > 1) Pix.disc(c, x - 1, y - 1, r - 1, T[1]);
    if (r > 2) Pix.disc(c, x - Math.round(r / 3), y - Math.round(r / 3), Math.max(1, r - 3), T[0]);
  },
  // a column of smoke going up from (x, y), drifting with the wind; n puffs, h high
  smoke(c, x, y, t, o = {}) {
    const n = o.n || 5, h = o.h || 30, life = o.life || 90, tone = o.tone === undefined ? 2 : o.tone, size = o.size || 4;
    for (let k = n - 1; k >= 0; k--) {
      const p = ((t + k * life / n + (o.seed || 0) * 17) % life) / life;
      IA.puff(c, x + Math.sin(p * 5 + k) * 2 + p * p * (o.wind === undefined ? 10 : o.wind), y - p * h, 1 + p * size, p > 0.6 && tone < 2 ? tone + 1 : tone);
    }
  },
  // a muzzle flash at (x, y), pointing along (dx, dy), f = frames since the shot (0-3)
  flash(c, x, y, dx, dy, f) {
    if (f < 0 || f > 3) return;
    x = Math.round(x); y = Math.round(y);
    const L = [7, 9, 6, 3][f], px = -dy, py = dx;
    for (let k = 0; k < L; k++) {
      const w = Math.round((k < L / 3 ? k + 1 : L - k) * 0.8), col = k < L * 0.35 ? '#F8F8F8' : k < L * 0.7 ? '#F8D838' : '#F87818';
      for (let s = -w; s <= w; s++) Pix.rect(c, x + dx * k + px * s, y + dy * k + py * s, 1, 1, Math.abs(s) === w && w > 1 ? '#F87818' : col);
    }
    if (f < 2) for (const s of [-1, 1]) { Pix.rect(c, x + dx * 2 + px * s * 4, y + dy * 2 + py * s * 4, 1, 1, '#F8D838'); Pix.rect(c, x + dx + px * s * 3, y + dy + py * s * 3, 1, 1, '#F8F8F8'); }
    if (f === 0) Pix.disc(c, x, y, 2, '#F8F8F8');
  },
  // a shell flying along (dx, dy) (a unit step), a glowing trail behind it
  shell(c, x, y, dx, dy, col = '#F8F8F8') {
    x = Math.round(x); y = Math.round(y);
    for (let k = 1; k < 7; k++) Pix.rect(c, x - dx * k, y - dy * k, 1, 1, k < 3 ? '#F8D838' : k < 5 ? '#F87818' : '#A82800');
    Pix.rect(c, x - (dy ? 1 : 0), y - (dx ? 1 : 0), dy ? 2 : 2, dx ? 2 : 2, col);
  },
  // sparks flying out of (x, y), p = 0..1 through their life
  sparks(c, x, y, p, n = 8, seed = 0, cols = ['#F8F8F8', '#F8D838', '#F87818']) {
    const r = seeded(seed + 7);
    for (let k = 0; k < n; k++) {
      const a = r() * Math.PI * 2, v = 8 + r() * 14, q = p * (0.7 + r() * 0.3);
      if (q > 1) continue;
      const sx = x + Math.cos(a) * v * q, sy = y + Math.sin(a) * v * q * 0.8 + q * q * 10;
      Pix.rect(c, sx, sy, 1, 1, cols[Math.min(cols.length - 1, Math.floor(q * cols.length))]);
      if (q < 0.5) Pix.rect(c, sx - Math.cos(a), sy - Math.sin(a) * 0.8, 1, 1, cols[Math.min(cols.length - 1, 1)]);
    }
  },
  // chunks thrown up from (x, y) and falling back, p = 0..1
  debris(c, x, y, p, n, cols, seed = 0, spread = 1) {
    const r = seeded(seed + 3);
    for (let k = 0; k < n; k++) {
      const vx = (r() - 0.5) * 36 * spread, vy = 14 + r() * 16, s = 1 + Math.floor(r() * 2);
      Pix.rect(c, x + vx * p, y - vy * p + 30 * p * p, s, s, cols[k % cols.length]);
    }
  },
  // an explosion at (x, y), about s across at its biggest; f = frames since it started (it lasts 40):
  // a flash, a fireball of lumps going red at the edges, then its smoke rolling up
  boom(c, x, y, f, s = 12, seed = 0) {
    if (f < 0 || f >= 40) return;
    const r = seeded(seed * 97 + 13), R = s * Math.min(1, (f + 3) / 8), blobs = [];
    for (let k = 0; k < 8; k++) { const a = r() * 6.3, d = 0.2 + r() * 0.5; blobs.push([Math.cos(a) * d, Math.sin(a) * d * 0.8, 0.35 + r() * 0.3, r()]); }
    if (f > 8) for (const [bx, by, br, q] of blobs) {
      const p = Math.min(1, (f - 8) / 32);
      IA.puff(c, x + bx * R + p * 6 * (q - 0.3), y + by * R - p * (14 + q * 10) - 2, br * R * (0.7 + p * 0.6), p > 0.5 ? 2 : 1);
    }
    const heat = Math.max(0, 1 - f / 22);
    if (heat > 0) {
      const lump = (k, col) => { for (const [bx, by, br] of blobs) Pix.disc(c, Math.round(x + bx * R), Math.round(y + by * R - f * 0.2), Math.max(0, Math.round(br * R * k * (0.4 + heat * 0.6))), col); };
      lump(1, '#A81800'); lump(0.85, f < 14 ? '#E83C10' : '#A81800');
      if (f < 16) lump(0.6, '#F88818');
      if (f < 11) lump(0.4, '#F8D838');
      if (f < 6) Pix.disc(c, Math.round(x), Math.round(y), Math.round(R * 0.35), '#F8F8F8');
    }
    if (f < 2) Pix.disc(c, Math.round(x), Math.round(y), Math.round(s * 0.8), f ? '#F8D838' : '#F8F8F8');
    if (f < 22) IA.sparks(c, x, y, f / 22, 12, seed);
  },
  // a sprite's outline plus a lit and a shaded edge, at k times its size (an emblem in relief)
  emboss(img, k, edge = '#000000', lit = '#F8F8F8', dark = '#3C3C3C') {
    const key = 'emb' + k + edge + lit + dark;
    if (img[key]) return img[key];
    const w = img.width, h = img.height, d = img.getContext('2d').getImageData(0, 0, w, h).data;
    const on = (i, j) => i >= 0 && j >= 0 && i < w && j < h && d[(j * w + i) * 4 + 3] > 0;
    const out = makeCanvas(w * k + 2, h * k + 2), x = out.getContext('2d');
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      if (!on(i, j)) continue;
      x.fillStyle = edge; x.fillRect(i * k, j * k, k + 2, k + 2);
    }
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      if (!on(i, j)) continue;
      const o = (j * w + i) * 4;
      x.fillStyle = `rgb(${d[o]},${d[o + 1]},${d[o + 2]})`; x.fillRect(i * k + 1, j * k + 1, k, k);
      if (!on(i, j - 1)) { x.fillStyle = lit; x.fillRect(i * k + 1, j * k + 1, k, 1); }
      if (!on(i - 1, j)) { x.fillStyle = lit; x.fillRect(i * k + 1, j * k + 1, 1, k); }
      if (!on(i, j + 1)) { x.fillStyle = dark; x.fillRect(i * k + 1, j * k + k, k, 1); }
      if (!on(i + 1, j)) { x.fillStyle = dark; x.fillRect(i * k + k, j * k + 1, 1, k); }
    }
    img[key] = out;
    return out;
  },
  // a brick wall, every brick its own: 8x4 bricks, every other row half a brick along, lit on top, mortar between
  bricks(c, x, y, w, h, seed = 1, cols = ['#F09858', '#C05018', '#8C3000', '#601800'], mortar = '#40302C') {
    this.paint(c, x, y, w, h, (i, j) => {
      const jj = j - y, row = jj >> 2, bx = i - x + (row & 1) * 4 + 64, b = bx >> 3, ii = bx & 7, rr = jj & 3, q = IA.hash(b, row, seed);
      if (rr === 3 || ii === 7) return mortar;
      if (q < 0.06 && ii > 2 && ii < 6 && rr === 1) return cols[3];   // a chip
      if (rr === 0 || ii === 0) return q < 0.3 ? cols[1] : cols[0];
      if (rr === 2) return cols[2];
      return q < 0.25 ? cols[2] : cols[1];
    });
  },
  // steel: riveted plates, size px square, bevelled
  steel(c, x, y, w, h, size = 8, cols = ['#F8F8F8', '#C8C8C8', '#A0A0A0', '#4C4C4C', '#5C5C5C']) {
    this.paint(c, x, y, w, h, (i, j) => {
      const ii = (i - x) % size, jj = (j - y) % size;
      if (ii === 0 || jj === 0) return cols[0];
      if (ii === size - 1 || jj === size - 1) return cols[3];
      if ((ii === 2 || ii === size - 3) && (jj === 2 || jj === size - 3)) return cols[4];
      return ii + jj < size - 2 ? cols[1] : cols[2];
    });
  },
  // a round tree seen from the side or above: lumps of leaves lit from the top left; trunk h below
  tree(c, x, y, r, seed = 1, cols = ['#88D850', '#3C9C28', '#1C6014', '#0C3008'], trunk = 0) {
    if (trunk) { Pix.rect(c, x - 1, y, 3, trunk, '#4C2C10'); Pix.rect(c, x - 1, y, 1, trunk, '#7C4C20'); }
    const s = seeded(seed), lumps = [];
    for (let k = 0; k < 5; k++) { const a = s() * 6.3, d = s() * r * 0.5; lumps.push([x + Math.cos(a) * d, y + Math.sin(a) * d * 0.7, r * (0.55 + s() * 0.3)]); }
    for (const [lx, ly, lr] of lumps) Pix.disc(c, Math.round(lx + 1), Math.round(ly + 1), Math.round(lr), cols[3]);
    for (const [lx, ly, lr] of lumps) Pix.disc(c, Math.round(lx), Math.round(ly), Math.round(lr), cols[2]);
    for (const [lx, ly, lr] of lumps) Pix.disc(c, Math.round(lx - lr * 0.2), Math.round(ly - lr * 0.25), Math.round(lr * 0.7), cols[1]);
    for (const [lx, ly, lr] of lumps) if (lr > 3) Pix.disc(c, Math.round(lx - lr * 0.4), Math.round(ly - lr * 0.45), Math.round(lr * 0.3), cols[0]);
  },
  // a fir tree h tall standing on (x, y)
  pine(c, x, y, h, cols = ['#3C8C3C', '#1C5C24', '#0C3010']) {
    Pix.rect(c, x, y - 2, 1, 3, '#3C2410');
    for (let j = 0; j < h; j++) {
      const w = Math.round((j / h) * h * 0.32 + ((j % 4) === 3 ? -1 : 0));
      Pix.rect(c, x - w, y - h + j, w, 1, cols[0]); Pix.rect(c, x, y - h + j, w + 1, 1, cols[1]);
      if (j % 4 === 3) Pix.rect(c, x - w, y - h + j, 2 * w + 1, 1, cols[2]);
    }
  },
  // words on a dark plate inside a picture
  tag(c, s, x, y, col, bg = '#000000') {
    s = String(s);
    Pix.rect(c, x - 2, y - 2, s.length * 8 + 2, 11, bg);
    Font.draw(c, s, x, y, col);
  },
  // tiny 3x5 digits
  digits(c, s, x, y, col) { GxArt.digits(c, String(s), x, y, col); },
  // a palette: a PALS key or [null, light, mid, dark]
  pal(p) { return typeof p === 'string' ? PALS[p] || PALS.silver : p; },

  // ---- tanks
  // a tank seen from the side, centred on cx, its tracks on the ground line gy, facing right (o.flip: left).
  // o: f (tread frame), L (hull length: 30 light .. 44 heavy), recoil (0-3), star (an emblem colour), sway (antenna)
  // returns where its muzzle is
  sideTank(c, cx, gy, pal, o = {}) {
    const P = this.pal(pal), L = o.L || 36, B = o.B || Math.round(L * 0.4), f = (o.f || 0) % 3, rc = o.recoil || 0;
    const key = 'st' + P.join() + L + B + f + rc + (o.star || '');
    let img = this.cache.get(key);
    const tx = Math.round(L * 0.46);
    if (!img) {
      img = makeCanvas(L + B + 20, 32);
      const x = img.getContext('2d'), R = (dx, dy, w, h, col) => { x.fillStyle = col; x.fillRect(4 + dx, 12 + dy, w, h); };
      // tracks, road wheels, sprocket and idler
      R(3, 12, L - 6, 1, '#202020'); R(1, 13, L - 2, 6, '#202020'); R(3, 19, L - 6, 1, '#202020');
      for (let k = 3; k < L - 3; k++) if ((k + f) % 3 === 0) { R(k, 12, 1, 1, '#6C6C6C'); R(k, 19, 1, 1, '#5C5C5C'); }
      const n = Math.max(3, Math.round((L - 8) / 7)), wheel = (wx, wy, r) => {
        x.fillStyle = '#3C3C3C'; Pix.disc(x, 4 + wx, 12 + wy, r, '#3C3C3C'); Pix.disc(x, 4 + wx, 12 + wy, r - 1, '#8C8C8C');
        R(wx - 1, wy - 1, 1, 1, '#C8C8C8'); R(wx, wy, 1, 1, '#2C2C2C');
        const a = f * 2.1 + wx; R(wx + Math.round(Math.cos(a) * (r - 1)), wy + Math.round(Math.sin(a) * (r - 1)), 1, 1, '#4C4C4C');
      };
      for (let k = 0; k < n; k++) wheel(Math.round(6 + k * (L - 12) / (n - 1)), 15, 3);
      wheel(2, 14, 2); wheel(L - 3, 14, 2);
      // the hull: a sloped front, a shadowed skirt, rivets, a toolbox, a headlight, the exhaust
      R(5, 6, L - 13, 1, P[1]);
      R(4, 7, L - 9, 1, P[2]); R(3, 8, L - 7, 1, P[2]); R(2, 9, L - 5, 1, P[2]); R(2, 10, L - 3, 1, P[2]);
      R(4, 7, 1, 1, P[1]); R(3, 8, 1, 1, P[1]); R(2, 9, 1, 2, P[1]);
      for (const [yy, xe] of [[7, L - 6], [8, L - 5], [9, L - 4], [10, L - 2]]) R(xe, yy, 1, 1, P[1]);
      R(1, 11, L - 2, 1, P[3]);
      for (let k = 6; k < L - 6; k += 4) R(k, 10, 1, 1, P[3]);
      R(6, 8, 6, 2, P[3]); R(7, 8, 4, 1, P[1]);
      R(L - 6, 8, 2, 1, '#F8F8C0'); R(L - 6, 9, 2, 1, '#7C7C7C');
      R(0, 8, 2, 2, '#3C3C3C');
      // the turret: a dome lit from the top left, a cupola, a vision slit, the mantlet
      R(tx - 4, 0, 8, 1, P[1]); R(tx - 6, 1, 13, 1, P[2]); R(tx - 7, 2, 16, 3, P[2]); R(tx - 7, 5, 16, 1, P[3]);
      R(tx - 6, 1, 2, 1, P[1]); R(tx - 7, 2, 1, 3, P[1]); R(tx + 8, 2, 1, 3, P[3]);
      R(tx - 5, 6, 11, 1, '#2C2C2C');
      R(tx - 4, -2, 4, 2, '#5C5C5C'); R(tx - 4, -2, 4, 1, '#A0A0A0'); R(tx - 2, -3, 1, 1, '#5C5C5C');
      R(tx + 3, 2, 3, 1, '#1C1C1C');
      R(tx + 8, 1, 3, 4, P[3]); R(tx + 8, 1, 3, 1, P[2]);
      if (o.star) { R(tx - 1, 2, 3, 1, o.star); R(tx, 1, 1, 3, o.star); }
      // the gun
      const bx = tx + 11 - rc;
      R(bx, 2, B, 1, '#C8C8C8'); R(bx, 3, B, 1, '#6C6C6C');
      R(bx + (B >> 1) - 1, 1, 3, 4, '#5C5C5C'); R(bx + (B >> 1) - 1, 1, 3, 1, '#9C9C9C');
      R(bx + B - 3, 1, 3, 4, '#4C4C4C'); R(bx + B - 3, 1, 3, 1, '#A0A0A0'); R(bx + B - 1, 2, 1, 2, '#1C1C1C');
      this.cache.set(key, img);
    }
    const X0 = Math.round(cx - L / 2), Y = Math.round(gy) - 32;
    if (!o.flip) c.drawImage(img, X0 - 4, Y);
    else { c.save(); c.translate(X0 + L + 4, 0); c.scale(-1, 1); c.drawImage(img, 0, Y); c.restore(); }
    // the antenna whips about as it drives
    const ax = o.flip ? X0 + L - 1 - (tx - 3) : X0 + tx - 3, sw = (o.sway || 0) * (o.flip ? 1 : -1);
    Pix.line(c, ax, Y + 11, ax + Math.round(sw * 0.5) + (o.flip ? 1 : -1), Y + 6, '#3C3C3C'); Pix.line(c, ax + Math.round(sw * 0.5) + (o.flip ? 1 : -1), Y + 6, ax + sw + (o.flip ? 2 : -2), Y + 2, '#3C3C3C');
    const mx = tx + 11 - rc + B;
    return { x: o.flip ? X0 + L - 1 - mx : X0 + mx, y: Y + 14 };
  },

  // a tank seen from above (28x28, a little more than twice a game tank), centred on (cx, cy); dir 0 up, 1 right,
  // 2 down, 3 left; f: tread frame; o.heavy: a big turret and two guns; o.recoil
  topTank(c, cx, cy, dir, pal, f = 0, o = {}) {
    const P = this.pal(pal), key = 'tt' + P.join() + (f % 3) + dir + (o.heavy ? 'h' : '') + (o.recoil || 0);
    let img = this.cache.get(key);
    if (!img) {
      const src = makeCanvas(28, 28), x = src.getContext('2d'), R = (dx, dy, w, h, col) => { x.fillStyle = col; x.fillRect(dx, dy, w, h); };
      // tracks
      for (const tx0 of [3, 19]) {
        R(tx0, 4, 6, 22, '#282828'); R(tx0 === 3 ? 3 : 24, 4, 1, 22, '#484848');
        for (let y = 5; y < 25; y++) if ((y + f) % 3 === 0) R(tx0 + 1, y, 4, 1, '#646464');
        R(tx0 === 3 ? 8 : 19, 4, 1, 22, '#141414');
        x.clearRect(tx0 === 3 ? 3 : 24, 4, 1, 1); x.clearRect(tx0 === 3 ? 3 : 24, 25, 1, 1);
      }
      // the hull: lit on the left and the front, an engine grille at the back
      R(9, 5, 10, 20, P[2]); R(9, 5, 1, 20, P[1]); R(9, 5, 10, 1, P[1]); R(18, 5, 1, 20, P[3]); R(9, 24, 10, 1, P[3]);
      R(10, 6, 8, 1, P[1]);
      for (let y = 20; y < 24; y += 2) R(11, y, 6, 1, '#1C1C1C');
      R(10, 25, 2, 1, '#3C3C3C'); R(16, 25, 2, 1, '#3C3C3C');
      // the turret, its shadow, a hatch and a periscope
      const tw = o.heavy ? 12 : 10, t0 = 14 - tw / 2, ty = o.heavy ? 10 : 11;
      R(t0 + 1, ty + 1, tw, tw, P[3]);
      R(t0, ty, tw, tw, P[2]); x.clearRect(t0, ty, 1, 1); x.clearRect(t0 + tw - 1, ty, 1, 1); x.clearRect(t0, ty + tw - 1, 1, 1); x.clearRect(t0 + tw - 1, ty + tw - 1, 1, 1);
      R(t0 + 1, ty, tw - 2, 1, P[1]); R(t0, ty + 1, 1, tw - 2, P[1]); R(t0 + tw - 1, ty + 1, 1, tw - 2, P[3]); R(t0 + 1, ty + tw - 1, tw - 2, 1, P[3]);
      R(t0 + 2, ty + tw - 5, 3, 3, '#4C4C4C'); R(t0 + 2, ty + tw - 5, 2, 1, '#9C9C9C');
      R(t0 + tw - 4, ty + 2, 2, 2, P[3]);
      // the gun(s)
      const rc = o.recoil || 0, guns = o.heavy ? [11, 15] : [13];
      for (const gx of guns) { R(gx, 1 + rc, 1, ty - 1 - rc, P[1]); R(gx + 1, 1 + rc, 1, ty - 1 - rc, P[3]); R(gx - 1, rc, 4, 2, '#3C3C3C'); R(gx - 1, rc, 4, 1, '#8C8C8C'); }
      R(12, ty - 1, 4, 2, P[3]);
      img = makeCanvas(28, 28);
      const y = img.getContext('2d');
      y.translate(14, 14); y.rotate(dir * Math.PI / 2); y.drawImage(src, -14, -14);
      this.cache.set(key, img);
    }
    c.drawImage(img, Math.round(cx) - 14, Math.round(cy) - 14);
  },
  // where a top-down tank's muzzle is
  muzzle(cx, cy, dir, d = 14) { const [dx, dy] = [[0, -1], [1, 0], [0, 1], [-1, 0]][dir]; return [cx + dx * d, cy + dy * d, dx, dy]; },

  // a small tank seen from above (11x11) for maps seen from high up, centred on (cx, cy)
  miniTank(c, cx, cy, dir, pal, f = 0) {
    const P = this.pal(pal), key = 'mt' + P.join() + (f & 1) + dir;
    let img = this.cache.get(key);
    if (!img) {
      const src = makeCanvas(12, 12), x = src.getContext('2d'), R = (dx, dy, w, h, col) => { x.fillStyle = col; x.fillRect(dx, dy, w, h); };
      R(1, 2, 3, 9, '#282828'); R(8, 2, 3, 9, '#282828');
      for (let y = 2 + (f & 1); y < 11; y += 2) { R(1, y, 3, 1, '#646464'); R(8, y, 3, 1, '#646464'); }
      R(4, 3, 4, 8, P[2]); R(4, 3, 1, 8, P[1]); R(7, 3, 1, 8, P[3]);
      R(3, 5, 6, 5, P[2]); R(3, 5, 6, 1, P[1]); R(3, 6, 1, 4, P[1]); R(8, 6, 1, 4, P[3]); R(4, 9, 4, 1, P[3]);
      R(5, 0, 2, 6, P[1]); R(6, 0, 1, 6, P[3]); R(4, 7, 2, 1, '#3C3C3C');
      img = makeCanvas(12, 12);
      const y = img.getContext('2d');
      y.translate(6, 6); y.rotate(dir * Math.PI / 2); y.drawImage(src, -6, -6);
      this.cache.set(key, img);
    }
    c.drawImage(img, Math.round(cx) - 6, Math.round(cy) - 6);
  },
  // a block of the map seen from above with its south face and its shadow: kind brick, steel or a pal of three
  block(c, x, y, w, h, kind, seed = 1, face = 4) {
    IA.veil(c, x + 3, y + 3, w + 1, h + face, '#000000', 0.55);
    if (kind === 'steel') { IA.steel(c, x, y, w, h, 8); Pix.rect(c, x, y + h, w, face, '#5C5C6C'); Pix.rect(c, x, y + h, w, 1, '#8C8C9C'); for (let k = 2; k < w; k += 8) Pix.rect(c, x + k, y + h + 1, 1, face - 1, '#3C3C4C'); }
    else if (kind === 'brick') { IA.bricks(c, x, y, w, h, seed); IA.bricks(c, x, y + h, w, face, seed + 9, ['#8C3C10', '#702808', '#501800', '#401000'], '#2C1C18'); }
    else { Pix.rect(c, x, y, w, h, kind[0]); Pix.rect(c, x, y + h, w, face, kind[2]); IA.dith(c, x, y + 1, w, h - 1, kind[1]); }
    Pix.rect(c, x, y + h + face, w, 1, '#141414');
  },
  // trees seen from above: a clump of round crowns
  wood(c, x, y, w, h, seed = 1) {
    const r = seeded(seed);
    for (let k = 0; k < w * h / 40; k++) IA.tree(c, Math.round(x + r() * w), Math.round(y + r() * h), 4 + Math.floor(r() * 3), seed + k, ['#88D850', '#3C9C28', '#1C6014', '#082008']);
  },
  // a pond seen from above: a sandy shore round dark water
  pond(c, cx, cy, rx, ry) {
    this.paint(c, cx - rx - 2, cy - ry - 2, rx * 2 + 5, ry * 2 + 5, (x, y) => {
      const d = Math.hypot((x - cx) / rx, (y - cy) / ry) + (IA.noise(Math.atan2(y - cy, x - cx) * 3 + 9, 3) - 0.5) * 0.15;
      return d > 1.12 ? null : d > 1 ? (bayer(x, y) < 0.5 ? '#C8A860' : '#A08040') : d > 0.9 ? '#1C30A0' : (y - cy) < -ry * 0.5 && bayer(x, y) < 0.3 ? '#3C64F8' : '#2038C8';
    });
  },
  // a crater: a dark hole, a lit far rim, thrown earth round it
  crater(c, cx, cy, r, earth = '#3C2C10') {
    Pix.disc(c, cx, cy, r + 2, earth); IA.dith(c, cx - r - 3, cy - r - 2, 2 * r + 7, 2 * r + 5, earth);
    Pix.disc(c, cx, cy, r, '#1C1408'); Pix.disc(c, cx + 1, cy + 1, r - 2, '#0C0804');
    for (let a = -2.6; a < -0.6; a += 0.25) Pix.rect(c, Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r), 1, 1, '#7C6438');
  },
  // a burnt patch round (cx, cy), its edge ragged
  scorch(c, cx, cy, r) {
    this.paint(c, cx - r, cy - r, 2 * r + 1, 2 * r + 1, (x, y) => {
      const d = Math.hypot(x - cx, y - cy) / r + (IA.noise(Math.atan2(y - cy, x - cx) * 2 + 5, r) - 0.5) * 0.4;
      return d > 1 ? null : d > 0.7 ? (bayer(x, y) < (1 - d) * 3 ? '#1C1408' : null) : bayer(x, y) < 0.2 ? '#3C2C1C' : '#1C1408';
    });
  },
  // a copy of src in less light (k of it), a little blue added: what you remember seeing in the dark
  dimmed(c, src, k, blue = 0) {
    const w = src.width, h = src.height, img = src.getContext('2d').getImageData(0, 0, w, h), d = img.data;
    for (let o = 0; o < d.length; o += 4) { d[o] = d[o] * k; d[o + 1] = d[o + 1] * k; d[o + 2] = Math.min(255, d[o + 2] * k + blue); }
    const tmp = makeCanvas(w, h); tmp.getContext('2d').putImageData(img, 0, 0); c.drawImage(tmp, 0, 0);
  },
  // seven-segment digits (an LCD), size 6x11 each, the unlit segments faint
  lcd(c, s, x, y, on, off) {
    const SEG = { 0: 'abcdef', 1: 'bc', 2: 'abged', 3: 'abgcd', 4: 'fgbc', 5: 'afgcd', 6: 'afgedc', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg', '-': 'g', ' ': '' };
    const bar = { a: [1, 0, 4, 1], b: [5, 1, 1, 4], c: [5, 6, 1, 4], d: [1, 10, 4, 1], e: [0, 6, 1, 4], f: [0, 1, 1, 4], g: [1, 5, 4, 1] };
    for (const ch of String(s)) {
      if (ch === ':' || ch === '.') { Pix.rect(c, x, y + 9, 2, 2, on); if (ch === ':') Pix.rect(c, x, y + 3, 2, 2, on); x += 4; continue; }
      const lit = SEG[ch] || '';
      for (const k in bar) { const [bx, by, w, h] = bar[k]; if (off || lit.includes(k)) Pix.rect(c, x + bx, y + by, w, h, lit.includes(k) ? on : off); }
      x += 8;
    }
  },
  // the eagle, as a big emblem in relief
  eagle(c, x, y, k = 2) { c.drawImage(this.emboss(Sprites.eagle, k, '#000000', '#E8E8E8', '#3C3C3C'), Math.round(x), Math.round(y)); },
  // the spawn star that comes before a tank, f frames in
  spawnStar(c, x, y, f) {
    const s = [2, 4, 6, 4, 2, 4, 6, 8][(f >> 2) & 7];
    for (let k = -s; k <= s; k++) { const col = Math.abs(k) < 2 ? '#F8F8F8' : Math.abs(k) < s / 2 ? '#F8D838' : '#3CBCFC'; Pix.rect(c, x + k, y, 1, 1, col); Pix.rect(c, x, y + k, 1, 1, col); }
    for (let k = 1; k < s / 2; k++) for (const [a, b] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) Pix.rect(c, x + a * k, y + b * k, 1, 1, '#3CBCFC');
    Pix.rect(c, x - 1, y - 1, 3, 3, '#F8F8F8');
  },
};

// ---------------------------------------------------------------------------------------------- the pictures
Object.assign(INTRO_SCENES, {
  // CLASSIC: dusk, the eagle's brick fortress on the right; your tank holds the road in front of it and shoots
  // the enemy tanks as they appear out of their spawn stars, the counter of tanks still to come going down
  classic(c, t) {
    c.drawImage(IA.layer('classic', b => {
      IA.grad(b, 0, 0, IPW, 96, ['#0C0C2C', '#1C1450', '#3C1868', '#7C2470', '#C83C50', '#F0703C', '#F8B048']);
      for (let k = 0; k < 3; k++) IA.dith(b, 0, 2 + k * 6, IPW, 1, '#2C2C5C', k);
      Pix.stars(b, 30, 4, 0, 34, IPW);
      IA.ball(b, 132, 74, 16, 16, ['#F8F8E0', '#F8F0A8', '#F8D878', '#F8B048', '#F09040']);
      IA.ridge(b, 92, 26, 3, ['#7C4478', '#4C2C5C', '#341C48'], { snow: 1.05, jag: 0.6 });
      IA.ridge(b, 101, 13, 8, ['#4C6C30', '#2C4420', '#1C3018'], { f: 1.6, trees: 0.25 });
      IA.grad(b, 0, 100, IPW, 36, ['#4C3C18', '#5C4420', '#4C3818', '#3C2C10']);
      IA.speckle(b, 0, 100, IPW, 36, ['#6C5428', '#2C2008', '#7C6C38', '#3C5C20'], 260, 5);
      // the road to the gate, ruts in it
      Pix.rect(b, 0, 113, IPW, 13, '#7C6434'); Pix.rect(b, 0, 113, IPW, 1, '#9C8048'); Pix.rect(b, 0, 125, IPW, 1, '#4C3818');
      for (let x = 0; x < IPW; x += 3) { Pix.rect(b, x, 116 + ((x >> 3) & 1), 2, 1, '#5C4824'); Pix.rect(b, x + 1, 122 - ((x >> 4) & 1), 2, 1, '#5C4824'); }
      IA.speckle(b, 0, 114, IPW, 11, ['#8C7444', '#5C4824'], 90, 9);
      // the fortress: towers, battlements, the eagle on its steel plate
      IA.bricks(b, 180, 66, 58, 50, 3);
      for (let x = 180; x < 238; x += 10) IA.bricks(b, x, 60, 6, 6, x);
      IA.bricks(b, 174, 46, 14, 70, 7); IA.bricks(b, 230, 46, 10, 70, 9);
      for (const x of [174, 180, 230, 236]) IA.bricks(b, x, 41, 4, 5, x);
      IA.steel(b, 174, 46, 14, 4, 4); IA.steel(b, 230, 46, 10, 4, 4);
      IA.steel(b, 192, 70, 36, 36, 6);
      Pix.rect(b, 194, 72, 32, 32, '#101018');
      IA.eagle(b, 193, 71, 2);
      Pix.rect(b, 172, 114, 68, 2, '#2C2010');
      // a shell crater, a broken fence, grass up close
      for (let k = 0; k < 6; k++) { Pix.rect(b, 6 + k * 12, 98 + (k % 3), 2, 9, '#3C2410'); Pix.rect(b, 6 + k * 12, 98 + (k % 3), 1, 9, '#6C4420'); }
      Pix.line(b, 6, 101, 66, 102, '#5C5C5C');
      for (let x = 0; x < IPW; x++) { const h = 2 + Math.round(IA.noise(x / 3, 4) * 6); Pix.rect(b, x, IPH - h, 1, h, (x & 3) ? '#1C2C0C' : '#2C4418'); if (h > 6 && x & 1) Pix.rect(b, x, IPH - h, 1, 1, '#5C7C28'); }
    }), 0, 0);
    // clouds lit pink from below, drifting
    for (let k = 0; k < 4; k++) {
      const w = 26 + k * 6, x = ((k * 83 + t * (0.05 + k * 0.03)) % (IPW + w + 20)) - w - 10;
      IA.puffs(c, Math.round(x), 22 + k * 9, w, ['#F8A0A0', '#B85878', '#6C3060'], k + 1);
    }
    // the flag on the tower
    Pix.rect(c, 180, 22, 1, 19, '#BCBCBC');
    for (let k = 0; k < 12; k++) { const yy = 23 + Math.round(Math.sin(t / 7 - k * 0.6) * 1.5); Pix.rect(c, 181 + k, yy, 1, 7, k > 9 ? '#A01800' : '#E43C10'); Pix.rect(c, 181 + k, yy, 1, 1, '#F87858'); }
    // a far column of enemy tanks crawling along the hills
    for (let k = 0; k < 3; k++) { const x = ((t * 0.12 + k * 14) % 130) - 10; Pix.rect(c, x, 96, 8, 2, '#141C10'); Pix.rect(c, x + 2, 95, 3, 1, '#141C10'); Pix.rect(c, x + 5, 95, 4, 1, '#141C10'); }
    // one tank a round: its star, in it comes, you fire, it blows up
    const P = 150, cyc = t % P, kills = Math.floor(t / P), kinds = ['silver', 'red', 'silver', 'green'], pal = kinds[kills % 4];
    const ex = 28 + Math.min(50, Math.max(0, cyc - 24) * 0.75), eg = 124;
    if (cyc < 26) IA.spawnStar(c, 28, eg - 9, cyc);
    else if (cyc < 98) {
      const m = IA.sideTank(c, ex, eg, pal === 'red' && (t >> 3) & 1 ? 'silver' : pal, { f: t >> 2, L: pal === 'green' ? 40 : 34, star: '#D82800', sway: Math.sin(t / 5) * 2 });
      // it fires at you; the shell bursts on the sandbags
      const q = cyc - 58;
      if (q >= 0 && q < 4) IA.flash(c, m.x, m.y, 1, 0, q);
      if (q >= 0 && q < 18) IA.shell(c, m.x + q * 3, m.y, 1, 0);
      if (q >= 18 && q < 30) { IA.sparks(c, m.x + 54, m.y - 1, (q - 18) / 12, 8, kills); IA.debris(c, m.x + 54, m.y + 2, (q - 18) / 12, 5, ['#8C7444', '#5C4824'], kills); }
    }
    // you
    const fire = cyc - 82, rc = fire >= 0 && fire < 6 ? 2 - (fire >> 1) : 0;
    const m = IA.sideTank(c, 150, 120, Config.playerPal(0), { flip: true, f: 0, L: 38, recoil: Math.max(0, rc), star: '#F8F8F8', sway: fire >= 0 && fire < 10 ? 2 : 0 });
    if (fire >= 0 && fire < 4) IA.flash(c, m.x, m.y, -1, 0, fire);
    if (fire >= 0 && fire < 8) IA.puff(c, m.x - 4 - fire, m.y - fire * 0.5, 1 + fire * 0.4, 0);
    if (fire >= 0 && fire < 16) IA.shell(c, m.x - fire * 3.6, m.y, -1, 0);
    if (cyc >= 98) { IA.boom(c, 78, 112, cyc - 98, 14, kills); IA.debris(c, 78, 112, (cyc - 98) / 30, 8, ['#3C3C3C', '#C0C0C0', '#F8F8F8'], kills); }
    if (cyc >= 104) IA.smoke(c, 78, 116, t, { n: 6, h: 40, size: 5, seed: kills });
    // the enemies still to come, as on the side panel
    const left = Math.max(1, 20 - (kills % 20) - (cyc >= 98 ? 1 : 0));
    Pix.rect(c, 3, 3, 33, 12, '#000000'); Pix.rect(c, 4, 4, 31, 10, '#636363');
    c.drawImage(Sprites.enemyIcon, 6, 5); Font.draw(c, 'x' + left, 14 + (left < 10 ? 4 : 0), 5, '#000000');
  },

  // SURVIVAL: no eagle, just you in the middle of the map; the enemy pours in from every edge and you turn to face
  // each one. Every few waves a twist: night, rocket rain, a swarm, a blitz
  survival(c, t) {
    const cx = 120, cy = 68;
    c.drawImage(IA.layer('survival', b => {
      IA.paint(b, 0, 0, IPW, IPH, (x, y) => {
        const n = IA.noise(x / 9 + IA.noise(y / 11, 5) * 2, 7) * 0.6 + IA.noise(y / 7 + x / 30, 9) * 0.4, q = bayer(x, y);
        return n > 0.62 ? (q < 0.5 ? '#5C4824' : '#4C3C1C') : n > 0.5 ? (q < 0.3 ? '#4C5C24' : '#3C5420') : q < 0.15 ? '#4C6C2C' : '#2C481C';
      });
      // the worn tracks the waves have left on their way in
      for (const [x, y, w, h] of [[112, 0, 16, IPH], [0, 60, IPW, 16]]) IA.veil(b, x, y, w, h, '#5C4824', 0.55);
      for (let k = 0; k < IPH; k += 3) { Pix.rect(b, 113, k, 2, 1, '#3C2C10'); Pix.rect(b, 125, k + 1, 2, 1, '#3C2C10'); }
      for (let k = 0; k < IPW; k += 3) { Pix.rect(b, k, 61, 1, 2, '#3C2C10'); Pix.rect(b, k + 1, 73, 1, 2, '#3C2C10'); }
      IA.crater(b, 70, 98, 6); IA.crater(b, 182, 30, 5); IA.crater(b, 96, 40, 4); IA.crater(b, 206, 112, 7); IA.crater(b, 30, 30, 4);
      IA.block(b, 14, 10, 40, 12, 'brick', 3); IA.block(b, 14, 22, 12, 16, 'brick', 4);
      IA.block(b, 156, 84, 48, 12, 'brick', 5); IA.block(b, 192, 96, 12, 16, 'brick', 6);
      IA.block(b, 168, 8, 24, 16, 'steel'); IA.block(b, 40, 96, 16, 16, 'steel');
      IA.pond(b, 216, 44, 18, 12);
      IA.wood(b, 56, 26, 34, 22, 3); IA.wood(b, 2, 104, 30, 28, 8); IA.wood(b, 140, 108, 22, 22, 11);
      // the wrecks of the waves before
      IA.scorch(b, 86, 116, 18); IA.scorch(b, 150, 34, 18);
      IA.topTank(b, 86, 116, 1, [null, '#7C6C64', '#4C4040', '#201818'], 0); IA.topTank(b, 150, 34, 2, [null, '#7C6C64', '#4C4040', '#201818'], 1);
    }), 0, 0);
    IA.smoke(c, 86, 112, t, { n: 5, h: 26, seed: 1, wind: 8 }); IA.smoke(c, 150, 30, t, { n: 5, h: 26, seed: 2, wind: 8 });
    // the waves: which twist, how many, how fast; every enemy has its lane, its time, and the moment you hit it
    const WP = 170, wave = Math.floor(t / WP), twist = ['', 'NIGHT', 'ROCKETS', 'SWARM', 'BLITZ'][wave % 5];
    const lanes = [[0, -1], [1, 0], [0, 1], [-1, 0]], far = [cy + 16, 136, IPH - cy + 16, 136];
    const foes = [];
    for (let w = wave - 1; w <= wave; w++) {
      const tw = ['', 'NIGHT', 'ROCKETS', 'SWARM', 'BLITZ'][((w % 5) + 5) % 5], n = tw === 'SWARM' ? 12 : 7, gap = tw === 'SWARM' ? 13 : 22, run = tw === 'BLITZ' ? 34 : 70;
      for (let k = 0; k < n; k++) {
        const s = w * WP + k * gap - 50, lane = (((k * 3 + w) % 4) + 4) % 4, hit = s + run, d = 44 + (k % 2) * 8;
        foes.push({ s, lane, hit, d, run, small: tw === 'SWARM', fast: tw === 'BLITZ', k: k + w * 13 });
      }
    }
    // turn to the next one coming, fire as it gets close
    const next = foes.filter(e => e.hit >= t - 3).sort((a, b) => a.hit - b.hit)[0], dir = next ? next.lane : 0;
    const shots = foes.filter(e => t >= e.hit - 6 && t < e.hit), recoil = foes.some(e => t - (e.hit - 6) >= 0 && t - (e.hit - 6) < 4);
    for (const e of foes) {
      if (t < e.s) continue;
      const [dx, dy] = lanes[e.lane], p = Math.min(1, (t - e.s) / e.run), dist = far[e.lane] - (far[e.lane] - e.d) * p;
      const ex = cx + dx * dist, ey = cy + dy * dist;
      if (t < e.hit) {
        if (e.fast) for (let k = 1; k < 4; k++) Pix.rect(c, ex + dx * (8 + k * 5) - (dy ? 0 : 0), ey + dy * (8 + k * 5), dy ? 1 : 4, dy ? 4 : 1, '#F8F8F8');
        if (e.small) c.drawImage(Sprites.tank('e1', (t >> 1) & 1, (e.lane + 2) % 4, 'silver'), Math.round(ex) - 8, Math.round(ey) - 8);
        else IA.topTank(c, ex, ey, (e.lane + 2) % 4, ['silver', 'red', 'green', 'silver'][e.k % 4], t >> 2, { heavy: e.k % 4 === 2 });
      } else if (t < e.hit + 40) {
        IA.boom(c, ex, ey, t - e.hit, e.small ? 9 : 13, e.k);
        if (t - e.hit < 20) IA.debris(c, ex, ey, (t - e.hit) / 20, 6, ['#3C3C3C', '#BCBCBC'], e.k);
      }
    }
    for (const e of shots) {
      const [dx, dy] = lanes[e.lane], q = (t - (e.hit - 6)) / 6, d0 = 16, d1 = e.d - 8;
      IA.shell(c, cx + dx * (d0 + (d1 - d0) * q), cy + dy * (d0 + (d1 - d0) * q), dx, dy);
    }
    IA.topTank(c, cx, cy, dir, Config.playerPal(0), 0, { recoil: recoil ? 1 : 0 });
    if (shots.length) { const [mx, my, dx, dy] = IA.muzzle(cx, cy, dir); IA.flash(c, mx, my, dx, dy, Math.min(3, t - (shots[0].hit - 6))); }
    // rocket rain: a crosshair on the ground, the rocket coming down at a slant, then the blast
    if (twist === 'ROCKETS') for (let k = 0; k < 5; k++) {
      const q = (t + k * 31) % 62, r = seeded(Math.floor((t + k * 31) / 62) * 7 + k), x = 20 + Math.floor(r() * 200), y = 12 + Math.floor(r() * 112);
      if (Math.abs(x - cx) < 24 && Math.abs(y - cy) < 24) continue;
      if (q < 30) {
        if ((q >> 2) & 1) { for (const [a, b] of [[-5, 0], [3, 0], [0, -5], [0, 3]]) Pix.rect(c, x + a, y + b, a ? 3 : 1, a ? 1 : 3, '#F83800'); }
        const rx = x + (30 - q) * 2, ry = y - (30 - q) * 3.4;
        for (let j = 1; j < 6; j++) IA.puff(c, rx + j * 2.4, ry - j * 4, 1 + j * 0.3, 1);
        Pix.rect(c, rx - 1, ry - 3, 3, 5, '#E4E4E4'); Pix.rect(c, rx, ry + 2, 1, 1, '#F83800'); Pix.rect(c, rx - 1, ry - 4, 3, 1, '#F87818');
      } else IA.boom(c, x, y, q - 30, 10, k + 50);
    }
    // night: only what your lamp shows, and the enemy's eyes
    if (twist === 'NIGHT') {
      c.drawImage(IA.layer('survival-night', b => IA.paint(b, 0, 0, IPW, IPH, (x, y) => {
        const d = Math.hypot(x - cx, (y - cy) * 1.1) / 46;
        return d < 0.75 ? null : d < 1.1 && bayer(x, y) > (d - 0.75) * 2.6 ? null : bayer(x, y) < 0.12 && d < 1.4 ? '#101830' : '#000008';
      })), 0, 0);
      for (const e of foes) if (t >= e.s && t < e.hit) {
        const [dx, dy] = lanes[e.lane], dist = far[e.lane] - (far[e.lane] - e.d) * Math.min(1, (t - e.s) / e.run), ex = cx + dx * dist, ey = cy + dy * dist;
        if (dist > 40) { Pix.rect(c, ex - dy * 3 - dx * 8, ey - dx * 3 - dy * 8, 1, 1, '#F8D838'); Pix.rect(c, ex + dy * 3 - dx * 8, ey + dx * 3 - dy * 8, 1, 1, '#F8D838'); }
      }
    }
    // the edges they come in from
    for (const [x, y, d] of [[cx, 2, 2], [IPW - 3, cy, 3], [cx, IPH - 3, 0], [2, cy, 1]]) if ((t >> 3) & 1) {
      const [dx, dy] = lanes[d];
      for (let k = 0; k < 3; k++) { Pix.rect(c, x + dx * k - dy * (2 - k), y + dy * k - dx * (2 - k), 1, 1, '#F83800'); Pix.rect(c, x + dx * k + dy * (2 - k), y + dy * k + dx * (2 - k), 1, 1, '#F83800'); }
    }
    IA.tag(c, 'WAVE ' + (31 + wave), 5, 5, COL.gold);
    if (twist && ((t >> 4) & 1 || t % WP > 40)) IA.tag(c, { NIGHT: 'NIGHT WAVE', ROCKETS: 'ROCKET RAIN', SWARM: 'SWARM', BLITZ: 'BLITZ' }[twist], 5, 17, '#F83800');
  },

  // TIME ATTACK: flat out at dawn, the land streaming by (the further, the slower), a checkpoint flashing past,
  // the stopwatch and the LCD running
  timeattack(c, t) {
    const WL = 480, scroll = (img, v, y) => { const o = Math.floor(t * v) % WL; c.drawImage(img, -o, y); c.drawImage(img, WL - o, y); };
    c.drawImage(IA.layer('ta-sky', b => {
      IA.grad(b, 0, 0, IPW, 86, ['#1C3C9C', '#2C5CC8', '#3C88E8', '#78B8F0', '#C8D8E8', '#F8D8A8', '#F8B878']);
      IA.ball(b, 52, 74, 11, 11, ['#F8F8F8', '#F8F8D0', '#F8F0A0', '#F8D878', '#F8C060']);
    }), 0, 0);
    scroll(IA.layer('ta-far', b => {
      IA.ridge(b, 70, 34, 21, ['#9CA8D8', '#6878B0', '#4C5890'], { w: WL, snow: 0.85, jag: 0.5, f: 1.25, bottom: 96 });
      for (let k = 0; k < 5; k++) IA.puffs(b, k * 96 + 10, 18 + (k % 3) * 9, 30 + (k % 2) * 14, ['#F8F8F8', '#D8E0F0', '#A8B8D8'], k + 3);
    }, WL, 96), 0.2, 4);
    scroll(IA.layer('ta-mid', b => {
      IA.ridge(b, 44, 16, 4, ['#5CA838', '#3C8028', '#285C1C'], { w: WL, f: 2.2, bottom: 56 });
      for (let x = 4; x < WL; x += 9 + (x * 7) % 11) IA.pine(b, x, 44 - Math.round(IA.noise(x / 20, 2) * 8), 9 + (x % 5), ['#2C7C2C', '#1C5C1C', '#0C3C10']);
      // a village
      for (let k = 0; k < 4; k++) { const x = 300 + k * 13; Pix.rect(b, x, 34, 10, 8, '#E8D8B8'); Pix.rect(b, x + 9, 34, 1, 8, '#B8A888'); for (let j = 0; j < 4; j++) Pix.rect(b, x - 1 + j, 33 - j, 12 - 2 * j, 1, j ? '#C84C20' : '#882810'); Pix.rect(b, x + 3, 37, 2, 2, '#384868'); }
    }, WL, 56), 0.7, 52);
    scroll(IA.layer('ta-near', b => {
      Pix.rect(b, 0, 0, WL, 12, '#58A030'); IA.speckle(b, 0, 0, WL, 12, ['#78C040', '#3C7C20'], 300, 4, 2);
      for (let x = 0; x < WL; x += 24) { Pix.rect(b, x, 0, 2, 9, '#E8E8E8'); Pix.rect(b, x + 1, 0, 1, 9, '#9C9C9C'); Pix.rect(b, x, 1, 2, 2, '#F83800'); }
      Pix.rect(b, 0, 3, WL, 1, '#BCBCBC'); Pix.rect(b, 0, 6, WL, 1, '#BCBCBC');
      // the distance signs
      for (const [x, n] of [[60, '2'], [300, '1']]) { Pix.rect(b, x, 0, 2, 12, '#5C5C5C'); Pix.rect(b, x - 5, 0, 12, 7, '#F8F8F8'); Pix.rect(b, x - 4, 1, 10, 5, '#00883C'); IA.digits(b, n, x, 1, '#F8F8F8'); }
    }, WL, 12), 2.5, 96);
    // the road: kerbs, the asphalt, the centre line streaking
    c.drawImage(IA.layer('ta-road', b => {
      Pix.rect(b, 0, 108, IPW, 28, '#4C4C54'); IA.speckle(b, 0, 108, IPW, 28, ['#5C5C64', '#3C3C44', '#68686C'], 400, 6);
      IA.veil(b, 0, 126, IPW, 10, '#2C2C34', 0.5);
    }), 0, 0);
    const ro = Math.floor(t * 6);
    for (let x = -(ro % 16); x < IPW; x += 16) { Pix.rect(c, x, 106, 8, 3, '#F8F8F8'); Pix.rect(c, x + 8, 106, 8, 3, '#D82800'); Pix.rect(c, x, 108, 16, 1, '#888888'); }
    for (let x = -(ro % 48); x < IPW; x += 48) Pix.rect(c, x, 122, 26, 2, '#F8F8F8');
    // a checkpoint every few seconds: an arch with a chequered banner
    const ck = (t + 150) % 300, gx = IPW + 30 - ck * 6;
    const gate = front => {
      if (gx < -80 || gx > IPW + 40) return;
      if (!front) { Pix.rect(c, gx + 8, 40, 3, 66, '#7C7C7C'); Pix.rect(c, gx + 8, 40, 1, 66, '#BCBCBC'); return; }
      Pix.rect(c, gx - 30, 46, 5, 90, '#BCBCBC'); Pix.rect(c, gx - 30, 46, 1, 90, '#F8F8F8'); Pix.rect(c, gx - 26, 46, 1, 90, '#6C6C6C');
      for (let k = 0; k < 9; k++) for (let j = 0; j < 3; j++) Pix.rect(c, gx - 28 + k * 4, 38 - Math.round(k * 0.7) + j * 4, 4, 4, (k + j) & 1 ? '#000000' : '#F8F8F8');
      Pix.rect(c, gx - 30, 37, 42, 1, '#3C3C3C'); Pix.rect(c, gx - 31, 34, 5, 4, '#3C3C3C'); Pix.rect(c, gx - 30, 35, 3, 2, (t >> 3) & 1 ? '#58F898' : '#1C5C30');
    };
    gate(false);
    // the tank, bouncing a little at speed, dust and smoke streaming off it
    const bob = (t >> 1) & 1 ? 0 : -1;
    for (let k = 0; k < 8; k++) { const q = ((t * 3 + k * 8) % 60) / 60; IA.puff(c, 66 - q * 76, 130 - q * 12 - (k % 3) * 2, 2 + q * 7, 3); }
    IA.smoke(c, 62, 104 + bob, t * 2, { n: 4, h: 10, wind: -40, tone: 1, size: 2, life: 30 });
    for (let k = 0; k < 6; k++) { const y = 100 + k * 6, len = 10 + ((k * 7 + t) % 12), x = 44 - ((t * 9 + k * 37) % 56); Pix.rect(c, x, y, len, 1, k & 1 ? '#F8F8F8' : '#BCBCBC'); }
    IA.sideTank(c, 100, 132 + bob, Config.playerPal(0), { f: t, L: 48, star: '#F8F8F8', sway: -3 - ((t >> 2) & 1) });
    gate(true);
    // the stopwatch
    const wx = 208, wy = 30;
    Pix.rect(c, wx - 3, wy - 25, 7, 5, '#9C9C9C'); Pix.rect(c, wx - 4, wy - 26, 9, 2, '#E8E8E8'); Pix.rect(c, wx + 15, wy - 19, 4, 4, '#9C9C9C');
    IA.ball(c, wx, wy, 21, 21, ['#F8F8F8', '#D8D8D8', '#A8A8A8', '#787878', '#484848']);
    Pix.disc(c, wx, wy, 17, '#2C2C2C'); Pix.disc(c, wx, wy, 16, '#F8F8F0'); Pix.disc(c, wx + 1, wy + 1, 14, '#E8E8E0'); Pix.disc(c, wx, wy, 13, '#F8F8F0');
    for (let k = 0; k < 60; k++) { const a = k * Math.PI / 30, l = k % 5 ? 1 : 3; for (let j = 0; j < l; j++) Pix.rect(c, Math.round(wx + Math.cos(a) * (15 - j)), Math.round(wy + Math.sin(a) * (15 - j)), 1, 1, k % 5 ? '#7C7C7C' : '#000000'); }
    Pix.disc(c, wx, wy + 7, 4, '#D8D8D0'); const sm = t * Math.PI / 900 - Math.PI / 2; Pix.line(c, wx, wy + 7, wx + Math.cos(sm) * 3, wy + 7 + Math.sin(sm) * 3, '#000000');
    const a = t * Math.PI / 30 - Math.PI / 2;
    Pix.line(c, wx - Math.cos(a) * 3, wy - Math.sin(a) * 3, wx + Math.cos(a) * 13, wy + Math.sin(a) * 13, '#D82800');
    Pix.disc(c, wx, wy, 1, '#D82800'); Pix.rect(c, wx, wy, 1, 1, '#F8F8F8');
    // the LCD: the clock, the stage, the split at the last checkpoint
    const T = 4200 + t, cs = Math.floor((T % 60) * 100 / 60), sec = Math.floor(T / 60) % 60, min = Math.floor(T / 3600);
    Pix.rect(c, 4, 4, 82, 30, '#000000'); Pix.rect(c, 5, 5, 80, 28, '#0C1C10'); Pix.rect(c, 5, 5, 80, 1, '#2C4C30');
    IA.lcd(c, min + ':' + String(sec).padStart(2, '0') + '.' + String(cs).padStart(2, '0'), 8, 8, '#58F898', '#143C20');
    Font.draw(c, ck > 40 && ck < 200 && (t >> 3) & 1 ? 'SPLIT -1.8' : 'STAGE 3/5', 8, 24, ck > 40 && ck < 200 && (t >> 3) & 1 ? '#58F898' : '#F0BC3C');
  },

  // BIG MAPS: a whole war seen from high up, the map sliding by under drifting clouds: rivers, woods, villages,
  // roads, factories smoking, outposts flying their flags, platoons on the move, shells landing; a minimap in the corner
  bigmaps(c, t) {
    const MW = 384, MH = 256, ox = Math.floor(t * 0.32) % MW, oy = Math.floor(t * 0.13) % MH;
    const world = IA.layer('bm-world', b => {
      const town = (x, y) => { const tx = ((x % MW) + MW) % MW, ty = ((y % MH) + MH) % MH; return [[60, 50], [250, 70], [150, 190], [320, 200], [40, 170]].some(([a, bb]) => Math.abs(tx - a) < 18 && Math.abs(ty - bb) < 14); };
      IA.paint(b, 0, 0, MW, MH, (x, y) => {
        const n = IA.noise2(x / 48, y / 48, 3, 8, 16 / 3) * 0.7 + IA.noise2(x / 16, y / 16, 4, 24, 16) * 0.3;
        const rv = Math.abs(y - 128 - Math.sin(x / MW * Math.PI * 4) * 40 - Math.sin(x / MW * Math.PI * 2 + 1) * 20) - (2 + IA.noise2(x / 12, 0, 5, 32, 1) * 3);
        const q = bayer(x, y), fx = Math.floor(x / 24), fy = Math.floor(y / 20), fq = IA.hash(fx, fy, 6);
        if (rv < 0) return q < 0.2 ? '#3C64F8' : '#2038C8';
        if (rv < 1.5) return '#B89C58';
        if (n < 0.3) return n < 0.27 ? (q < 0.25 ? '#3C64F8' : '#2038C8') : '#B89C58';
        if (n > 0.6) { const tr = IA.hash(x >> 1, y >> 1, 7); return tr < 0.3 ? '#0C4808' : tr < 0.8 ? '#1C6C14' : '#3C9C28'; }
        if (fq < 0.3 && !town(x, y)) { const row = (fq < 0.15 ? x : y) % 3; return row ? (fq < 0.1 ? '#A8B048' : '#7C9C30') : '#5C7C28'; }
        return q < 0.3 ? '#4C8C2C' : '#3C7C24';
      });
      // roads joining the villages
      const T = [[60, 50], [250, 70], [320, 200], [150, 190], [40, 170], [60, 50]];
      for (let k = 1; k < T.length; k++) { const [x0, y0] = T[k - 1], [x1, y1] = T[k]; Pix.line(b, x0, y0, x1, y0, '#9C7C48', 2); Pix.line(b, x1, y0, x1, y1, '#9C7C48', 2); }
      // villages: roofs with their shadows; bunkers of steel; craters
      for (const [tx, ty] of T.slice(0, 5)) for (let k = 0; k < 7; k++) {
        const x = tx - 14 + (k % 4) * 8 + (k > 3 ? 3 : 0), y = ty - 10 + (k > 3 ? 12 : 0);
        Pix.rect(b, x + 1, y + 1, 6, 5, '#1C2C10'); Pix.rect(b, x, y, 6, 5, k % 3 ? '#C84C20' : '#A8A8A8'); Pix.rect(b, x, y, 6, 1, k % 3 ? '#F87850' : '#E8E8E8'); Pix.rect(b, x, y + 2, 6, 1, k % 3 ? '#882810' : '#7C7C7C');
      }
      const r = seeded(31);
      for (let k = 0; k < 40; k++) { const x = Math.floor(r() * MW), y = Math.floor(r() * MH); Pix.disc(b, x, y, 2, '#3C2C10'); Pix.rect(b, x, y, 1, 1, '#100800'); }
      for (const [x, y] of [[110, 30], [200, 140], [350, 110], [20, 230]]) { Pix.rect(b, x + 1, y + 1, 10, 8, '#102008'); IA.steel(b, x, y, 10, 8, 5); }
    }, MW, MH);
    for (const [x, y] of [[-ox, -oy], [MW - ox, -oy], [-ox, MH - oy], [MW - ox, MH - oy]]) c.drawImage(world, x, y);
    const at = (wx, wy) => [((wx - ox) % MW + MW) % MW - (((wx - ox) % MW + MW) % MW > IPW + 40 ? MW : 0), ((wy - oy) % MH + MH) % MH - (((wy - oy) % MH + MH) % MH > IPH + 40 ? MH : 0)];
    // enemy factories, smoking, and your outposts with their flags
    for (const [wx, wy] of [[250, 50], [150, 210], [330, 180]]) {
      const [x, y] = at(wx, wy);
      Pix.rect(c, x + 1, y + 1, 14, 9, '#102008'); c.drawImage(Sprites.factory[(t >> 4) & 1], 0, 0, 16, 16, x, y - 3, 14, 12);
      IA.smoke(c, x + 11, y - 2, t, { n: 4, h: 18, size: 3, seed: wx, wind: 12 });
    }
    for (const [wx, wy] of [[60, 70], [40, 150], [270, 90]]) {
      const [x, y] = at(wx, wy);
      Pix.rect(c, x, y - 8, 1, 9, '#E8E8E8'); for (let k = 0; k < 5; k++) Pix.rect(c, x + 1 + k, y - 8 + Math.round(Math.sin(t / 6 - k)), 1, 3, COL.gold);
    }
    // platoons driving along the roads; yours is the one picked out
    const leg = (k, sp) => { const L = [[60, 50], [250, 50], [250, 70], [320, 70], [320, 200], [150, 200], [150, 190], [40, 190], [40, 170], [60, 170], [60, 50]]; let d = (t * sp + k) % 1176; for (let i = 1; i < L.length; i++) { const [x0, y0] = L[i - 1], [x1, y1] = L[i], l = Math.abs(x1 - x0) + Math.abs(y1 - y0); if (d <= l) { const f = d / l; return [x0 + (x1 - x0) * f, y0 + (y1 - y0) * f, x1 > x0 ? 1 : x1 < x0 ? 3 : y1 > y0 ? 2 : 0]; } d -= l; } return [60, 50, 0]; };
    for (const [k, pal, mine] of [[0, Config.playerPal(0), 1], [400, 'red', 0], [760, 'silver', 0]]) for (let j = 0; j < 3; j++) {
      const [wx, wy, d] = leg(k + 1176 - j * 13, 0.45), [x, y] = at(wx, wy);
      IA.miniTank(c, x, y, d, pal, t >> 2);
      if (mine && !j && (t >> 4) & 1) for (const [a, bb] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { Pix.rect(c, x + a * 9 - (a > 0 ? 2 : 0), y + bb * 9, 3, 1, COL.gold); Pix.rect(c, x + a * 9, y + bb * 9 - (bb > 0 ? 2 : 0), 1, 3, COL.gold); }
    }
    // shells landing
    for (let k = 0; k < 3; k++) { const q = (t + k * 23) % 70, r = seeded(Math.floor((t + k * 23) / 70) * 5 + k); IA.boom(c, 20 + r() * 200, 20 + r() * 100, q, 7, k); }
    // clouds, their shadows on the ground well below them
    for (let k = 0; k < 4; k++) {
      const x = ((k * 97 - t * 0.6) % (IPW + 120) + IPW + 120) % (IPW + 120) - 60, y = 14 + k * 31;
      c.drawImage(IA.layer('bm-shadow' + (k & 1), b => IA.paint(b, 0, 0, 60, 28, (xx, yy) => { const d = Math.hypot((xx - 30) / 26, (yy - 14) / 10) / (1 + 0.18 * Math.sin(Math.atan2(yy - 14, xx - 30) * 3 + k)); return d < 1 && bayer(xx, yy) < 0.45 ? '#0C1C08' : null; }), 60, 28), Math.round(x) + 22, y + 20);
      c.drawImage(IA.layer('bm-cloud' + (k & 1), b => { IA.cloud(b, 30, 14, 26, 10, ['#C8D0D8', '#E8ECF0', '#F8F8F8'], k); }, 60, 28), Math.round(x), y);
    }
    // the map display: a grid, corner brackets, a compass and the minimap with your view on it
    for (let x = (-ox % 32 + 32) % 32; x < IPW; x += 32) IA.dith(c, x, 0, 1, IPH, '#58F898', x & 1);
    for (let y = (-oy % 32 + 32) % 32; y < IPH; y += 32) IA.dith(c, 0, y, IPW, 1, '#58F898', y & 1);
    for (const [x, y, a, b2] of [[2, 2, 1, 1], [IPW - 3, 2, -1, 1], [2, IPH - 3, 1, -1], [IPW - 3, IPH - 3, -1, -1]]) { Pix.rect(c, Math.min(x, x + a * 9), y, 10, 1, '#58F898'); Pix.rect(c, x, Math.min(y, y + b2 * 9), 1, 10, '#58F898'); }
    const mm = IA.layer('bm-mini', b => { b.drawImage(world, 0, 0, MW, MH, 1, 1, 48, 32); Pix.rect(b, 0, 0, 50, 1, '#58F898'); Pix.rect(b, 0, 33, 50, 1, '#58F898'); Pix.rect(b, 0, 0, 1, 34, '#58F898'); Pix.rect(b, 49, 0, 1, 34, '#58F898'); }, 50, 34);
    Pix.rect(c, IPW - 57, IPH - 41, 52, 36, '#000000'); c.drawImage(mm, IPW - 56, IPH - 40);
    const vx = IPW - 55 + Math.round(ox / 8), vy = IPH - 39 + Math.round(oy / 8);
    for (const [ax, ay] of [[0, 0], [-48, 0], [0, -32], [-48, -32]]) { c.save(); c.beginPath(); c.rect(IPW - 55, IPH - 39, 48, 32); c.clip(); c.strokeStyle = '#F8F8F8'; c.lineWidth = 1; c.strokeRect(vx + ax + 0.5, vy + ay + 0.5, 30, 17); c.restore(); }
    IA.tag(c, 'X' + String(ox).padStart(3, '0') + ' Y' + String(oy).padStart(3, '0'), 6, 6, '#58F898');
  },

  // ANY SIDE: the war-room table under a lamp; the map on it turns, so your eagle ends up on the left, at the top,
  // on the right; the compass turns with it and the board says where the eagle is now
  sides(c, t) {
    const FX = 120, FY = 66, F = 112;
    c.drawImage(IA.layer('sides-table', b => {
      IA.paint(b, 0, 0, IPW, IPH, (x, y) => {
        const d = Math.hypot((x - FX) / 150, (y - FY) / 100), g = Math.sin(y * 0.9 + IA.noise(x / 14, y) * 4) * 0.5 + 0.5, q = bayer(x, y);
        const l = 1 - d + (g - 0.5) * 0.12 + (q - 0.5) * 0.18;
        return l > 0.62 ? '#9C6430' : l > 0.45 ? '#7C4C20' : l > 0.3 ? '#5C3414' : l > 0.15 ? '#40240C' : '#281408';
      });
      // papers, a pencil and a coffee ring
      Pix.rect(b, 191, 98, 40, 30, '#1C1408'); Pix.rect(b, 189, 96, 40, 30, '#E8E0C8'); for (let k = 0; k < 6; k++) Pix.rect(b, 193, 101 + k * 4, 24 + (k * 7) % 9, 1, '#9C9488');
      Pix.line(b, 196, 92, 222, 84, '#F8B800', 2); Pix.line(b, 196, 93, 222, 85, '#C07000'); Pix.rect(b, 194, 92, 2, 2, '#F8E8C0');
      for (let a = 0; a < 6.3; a += 0.12) Pix.rect(b, Math.round(28 + Math.cos(a) * 9), Math.round(112 + Math.sin(a) * 7), 1, 1, '#4C2C10');
      // the steel frame round the map
      IA.steel(b, FX - F / 2 - 5, FY - F / 2 - 5, F + 10, F + 10, 5); Pix.rect(b, FX - F / 2 - 1, FY - F / 2 - 1, F + 2, F + 2, '#000000');
    }), 0, 0);
    // the map (14 x 14 tiles of 8): the eagle in its bricks at the bottom, you beside it
    const field = IA.layer('sides-field', b => {
      const M = ['..............', '.bb.bb..bb.bb.', '.bb.bb..bb.bb.', '.bb.bbssbb.bb.', '.bb.bb..bb.bb.', '......ff......', 'ss..bbffbb..ss', '....bbffbb....',
        '..ww......ww..', '.bb.bb..bb.bb.', '.bb.bb..bb.bb.', '.bb..bbbb..bb.', '.....b..b.....', '.....b..b.....'];
      const tex = Sprites.tex, kind = { b: tex.brick, s: tex.steel, f: tex.forest, w: tex.water0, i: tex.ice };
      Pix.rect(b, 0, 0, F, F, '#000000');
      M.forEach((row, j) => { for (let i = 0; i < 14; i++) if (kind[row[i]]) b.drawImage(kind[row[i]], i * 8, j * 8); });
      b.drawImage(Sprites.eagle, 48, 96);
    }, F, F);
    const HOLD = 70, TURN = 30, step = Math.floor(t / (HOLD + TURN)), ph = t % (HOLD + TURN), turning = ph >= HOLD && step < 3;
    const rot = Math.min(step, 3), ang = (rot + (turning ? (ph - HOLD) / TURN : 0)) * Math.PI / 2;
    if (!turning) {
      c.save(); c.translate(FX, FY); c.rotate(rot * Math.PI / 2); c.drawImage(field, -F / 2, -F / 2); c.restore();
    } else {
      // turning: every pixel looked up in the map (nearest), clipped to the frame
      const out = IA.sidesBuf || (IA.sidesBuf = c.createImageData(F, F)), sd = IA.sidesSrc || (IA.sidesSrc = field.getContext('2d').getImageData(0, 0, F, F).data);
      const cs = Math.cos(ang), sn = Math.sin(ang), d = out.data;
      for (let y = 0; y < F; y++) for (let x = 0; x < F; x++) {
        const rx = x + 0.5 - F / 2, ry = y + 0.5 - F / 2, sx = Math.floor(rx * cs + ry * sn + F / 2), sy = Math.floor(-rx * sn + ry * cs + F / 2), o = (y * F + x) * 4;
        if (sx < 0 || sy < 0 || sx >= F || sy >= F) { d[o] = 8; d[o + 1] = 8; d[o + 2] = 16; d[o + 3] = 255; continue; }
        const i = (sy * F + sx) * 4; d[o] = sd[i]; d[o + 1] = sd[i + 1]; d[o + 2] = sd[i + 2]; d[o + 3] = 255;
      }
      c.putImageData(out, FX - F / 2, FY - F / 2);
    }
    // a point on the map, where it is now
    const P = (x, y) => { const dx = x - F / 2, dy = y - F / 2, cs = Math.cos(ang), sn = Math.sin(ang); return [Math.round(FX + dx * cs - dy * sn), Math.round(FY + dx * sn + dy * cs)]; };
    if (!turning) {
      const [ex, ey] = P(56, 104);
      if ((t >> 3) & 1) c.drawImage(Sprites.outline(Sprites.eagle, COL.gold), ex - 9, ey - 9);
      // you, beside it; an enemy rolling down from the far side; the spawn stars
      const [px, py] = P(32, 104);
      c.drawImage(Sprites.tank('p0', 0, rot % 4, Config.playerPal(0)), px - 8, py - 8);
      const [qx, qy] = P(56, 12 + Math.min(ph, 60) * 0.7);
      if (ph > 12) c.drawImage(Sprites.tank('e0', (t >> 2) & 1, (2 + rot) % 4, 'silver'), qx - 8, qy - 8);
      for (const sx of [8, 56, 104]) { const [x, y] = P(sx, 8); if (ph < 14 || sx !== 56) c.drawImage(Sprites.sparkle[((t >> 2) + sx) % Sprites.sparkle.length], x - 8, y - 8); }
      // your shot at it
      const q = ph - 34;
      if (q >= 0 && q < 12) { const [bx, by] = P(32, 92 - q * 6); Pix.rect(c, bx - 1, by - 1, 3, 3, '#F8F8F8'); }
    } else for (let k = 0; k < 4; k++) {
      // arrows sweeping round as it turns
      const a = ang + k * Math.PI / 2 + Math.PI / 4;
      for (let j = 0; j < 10; j++) { const b = a - j * 0.06; Pix.rect(c, Math.round(FX + Math.cos(b) * 70), Math.round(FY + Math.sin(b) * 70), 2, 2, j ? (j < 5 ? COL.gold : '#9C6C10') : '#F8F8F8'); }
    }
    // the compass, turning with the map
    const CX = 30, CY = 40;
    Pix.disc(c, CX + 1, CY + 1, 20, '#1C1008'); Pix.disc(c, CX, CY, 20, '#BC9C5C'); Pix.disc(c, CX, CY, 18, '#E8D8A8'); Pix.disc(c, CX, CY, 17, '#F8F0D0');
    for (let k = 0; k < 16; k++) { const a = k * Math.PI / 8 + ang; Pix.rect(c, Math.round(CX + Math.cos(a) * 15), Math.round(CY + Math.sin(a) * 15), 1, 1, '#7C6440'); }
    for (let k = 0; k < 4; k++) {
      const a = ang - Math.PI / 2 + k * Math.PI / 2, col = k ? '#3C3C3C' : '#D82800';
      for (let j = 0; j < 13; j++) { const w = Math.round((13 - j) / 5); Pix.rect(c, Math.round(CX + Math.cos(a) * j - Math.sin(a) * 0) - w, Math.round(CY + Math.sin(a) * j) - (w ? 0 : 0), 2 * w + 1, 1, j < 2 ? '#7C7C7C' : col); }
    }
    Pix.disc(c, CX, CY, 2, '#C89C38'); Pix.rect(c, CX, CY, 1, 1, '#F8F8F8');
    const [nx, ny] = [CX + Math.round(Math.cos(ang - Math.PI / 2) * 24), CY + Math.round(Math.sin(ang - Math.PI / 2) * 24)];
    Font.draw(c, 'N', nx - 3, ny - 3, '#F8F8F8');
    // where the eagle is
    const sides = ['BOTTOM', 'LEFT', 'TOP', 'RIGHT'], now = turning ? -1 : rot;
    Font.draw(c, 'EAGLE', 190, 8, '#F8F8F8');
    for (let k = 1; k < 4; k++) {
      const y = 22 + (k - 1) * 13, on = k === now;
      if (on) Pix.rect(c, 186, y - 2, 52, 11, '#000000');
      Font.draw(c, sides[k], 190, y, on ? ((t >> 3) & 1 ? COL.gold : '#F8F8F8') : '#C8A070');
    }
  },

  // CORRIDOR: a road of blocks climbing through the sky, the clouds far below drifting by slower than the road;
  // you drive up it, shooting what comes down, the height going up and up past your best
  corridor(c, t) {
    const X0 = 64, CW = 112, SH = 256, v = 0.6, off = t * v;
    c.drawImage(IA.layer('cor-sky', b => IA.grad(b, 0, 0, IPW, IPH, ['#2C5CC8', '#3C78E0', '#5C94E8', '#78ACF0'])), 0, 0);
    const clouds = (k, sp, cols) => {
      const img = IA.layer('cor-cl' + k, b => { const r = seeded(k + 4); for (let j = 0; j < 7; j++) IA.cloud(b, Math.floor(r() * IPW), 10 + j * 26 + Math.floor(r() * 10), 22 + r() * 18, 7 + r() * 4, cols, j + k); }, IPW, 180);
      const o = Math.floor(t * sp) % 180;
      c.drawImage(img, k * 20, o - 180); c.drawImage(img, k * 20, o); c.drawImage(img, k * 20 - IPW, o - 180); c.drawImage(img, k * 20 - IPW, o);
    };
    clouds(0, 0.12, ['#9CBCF0', '#B8D0F8', '#D0E0F8']);
    // the road's shadow falls on the far clouds
    IA.veil(c, X0 + 8, 0, CW + 6, IPH, '#1C3C9C', 0.4);
    clouds(1, 0.25, ['#D8E8F8', '#F0F8F8', '#F8F8F8']);
    const road = IA.layer('cor-road', b => {
      Pix.rect(b, 0, 0, CW, SH, '#585048'); IA.speckle(b, 0, 0, CW, SH, ['#686058', '#484038', '#706858'], 900, 3);
      for (let y = 0; y < SH; y += 16) Pix.rect(b, 8, y, CW - 16, 1, '#4C443C');
      // obstacles, a row every 16, never in the middle lane
      for (let j = 0; j < SH / 16; j++) {
        const r = seeded(j * 7 + 3);
        for (let i = 0; i < 4; i++) {
          const x = 8 + i * 16 + (i > 1 ? 32 : 0), y = j * 16, q = r();
          if (j % 8 === 3 && i < 3) { IA.paint(b, x, y, 16, 16, (xx, yy) => (bayer(xx, yy) < 0.2 ? '#3C64F8' : '#2038C8')); Pix.rect(b, x, y, 16, 1, '#7CB8F8'); continue; }
          if (q < 0.25) IA.block(b, x, y + 2, 16, 10, 'brick', j * 9 + i, 4);
          else if (q < 0.33) IA.block(b, x, y + 2, 16, 10, 'steel', 0, 4);
          else if (q < 0.45) IA.wood(b, x + 2, y + 2, 12, 12, j * 5 + i);
        }
      }
      // the parapets, with their faces and the drop beyond
      for (const x of [0, CW - 8]) { IA.steel(b, x, 0, 8, SH, 8); }
      IA.veil(b, 8, 0, 3, SH, '#000000', 0.5);
    }, CW, SH);
    const ro = Math.floor(off) % SH;
    c.drawImage(road, X0, ro - SH); c.drawImage(road, X0, ro);
    // an enemy rolls down the lane; you shoot it
    const P = 140, cyc = t % P, n = Math.floor(t / P), ey = -16 + cyc * 1.1 + off % 1;
    if (cyc < 78) IA.topTank(c, X0 + 56, ey, 2, n & 1 ? 'red' : 'silver', t >> 2);
    else if (cyc < 118) IA.boom(c, X0 + 56, -16 + 78 * 1.1, cyc - 78, 13, n);
    const sx = cyc - 66;
    const px = X0 + 56 + Math.round(Math.sin(t / 25) * 2);
    if (sx >= 0 && sx < 12) IA.shell(c, X0 + 56, 90 - sx * 4, 0, -1);
    IA.topTank(c, px, 108, 0, Config.playerPal(0), t >> 1, { recoil: sx >= 0 && sx < 4 ? 1 : 0 });
    if (sx >= 0 && sx < 4) IA.flash(c, px, 94, 0, -1, sx);
    // your best, a gold line across the road; it passes under you
    const by = Math.round((t * v + 40) % 600) - 40;
    if (by > -2 && by < IPH) { for (let x = X0 + 8; x < X0 + CW - 8; x += 6) Pix.rect(c, x, by, 4, 2, COL.gold); IA.tag(c, 'BEST', X0 + CW + 4, by - 4, COL.gold); }
    // the height: a ruler on the left, the count on the right
    const h = 340 + Math.floor(off / 4);
    Pix.rect(c, 0, 0, 44, IPH, '#0C1C4C'); Pix.rect(c, 44, 0, 1, IPH, '#5C94E8');
    for (let y = -(16 - (Math.floor(off) % 16)); y < IPH + 16; y += 4) {
      const mark = h + Math.round((108 - y - (Math.floor(off) % 4)) / 4);
      const big = mark % 4 === 0;
      Pix.rect(c, big ? 30 : 36, y + (Math.floor(off) % 4), big ? 14 : 8, 1, big ? '#F8F8F8' : '#7C94C8');
      if (mark % 8 === 0) IA.digits(c, String(mark).padStart(4, '0'), 8, y + (Math.floor(off) % 4) - 2, '#BCC8E8');
    }
    Pix.rect(c, 26, 105, 19, 7, COL.gold); Pix.rect(c, 45, 106, 2, 5, COL.gold); Pix.rect(c, 47, 107, 2, 3, COL.gold); IA.digits(c, h % 10000, 29, 106, '#000000');
    Pix.rect(c, X0 + CW + 2, 4, IPW - X0 - CW - 6, 42, '#000000');
    Font.draw(c, 'HEIGHT', X0 + CW + 6, 8, '#BCC8E8');
    Font.big(c, String(h), X0 + CW + 6, 20, 2, COL.gold);
    Font.draw(c, 'M', X0 + CW + 54, 30, '#BCC8E8');
    if (by > 108 && by < 160 && (t >> 3) & 1) IA.tag(c, 'RECORD!', X0 + CW + 6, 54, '#58F898');
  },

  // MAZE: deep underground, only your lamp lights the way; what you've seen stays dim behind you, red eyes wait in
  // the dark, and far off the way out glows green until you get there
  maze(c, t) {
    const MZ = IA.mazeData || (IA.mazeData = mazeLayout(13, 7, seeded(1987))), B = 3, OY = 2;
    const at = (x, y) => { const row = MZ.blocks[Math.floor((y - OY) / B)]; return row ? row[Math.floor(x / B)] || '.' : '@'; };
    const lit = IA.layer('maze-lit', b => {
      Pix.rect(b, 0, 0, IPW, IPH, '#000000');
      IA.paint(b, 0, OY, IPW, IPH - OY - 2, (x, y) => {
        const k = at(x, y), q = bayer(x, y), n = IA.hash(x >> 1, y >> 1, 3);
        if (k === '@' || k === '#') {
          const face = at(x, y + 1) !== k || at(x, y + 2) !== k;
          if (k === '#') return face ? '#5C1C00' : ((y - OY) % 4 === 3 || ((x + ((y - OY) >> 2) * 3) % 6) === 5 ? '#4C2C24' : n < 0.3 ? '#C05018' : '#E07038');
          if (face) return at(x, y + 1) !== k ? '#2C2C38' : '#4C4C5C';
          return at(x - 1, y) !== k || at(x, y - 1) !== k ? '#C8C8D8' : n < 0.25 ? '#7C7C8C' : '#9C9CAC';
        }
        if (k === '%') return n < 0.3 ? '#3C9C28' : n < 0.6 ? '#1C6C14' : '#0C4808';
        if (k === '_') return q < 0.2 ? '#F8F8F8' : '#A8D8F8';
        const shade = at(x - 2, y - 2) === '@' || at(x - 2, y - 2) === '#';
        const tile = (x % 9 === 0 || (y - OY) % 9 === 0) ? '#1C1C20' : n < 0.1 ? '#2C3C24' : '#34343C';
        return shade && q < 0.6 ? '#141418' : tile;
      });
    });
    const dim = IA.layer('maze-dim', b => IA.dimmed(b, lit, 0.42, 6)), dark = IA.layer('maze-dark', b => IA.dimmed(b, lit, 0.2, 4));
    const ctr = ([i, j]) => [18 * i + 12, 18 * j + 12 + OY];
    const run = MZ.path.length - 1, SPD = 7, END = run * SPD, cyc = t % (END + 110), pos = Math.min(run, cyc / SPD), k = Math.floor(pos), f = pos - k;
    const [ax, ay] = ctr(MZ.path[k]), [bx, by] = ctr(MZ.path[Math.min(run, k + 1)]), tx = ax + (bx - ax) * f, ty = ay + (by - ay) * f;
    const dir = k < run ? (bx > ax ? 1 : bx < ax ? 3 : by > ay ? 2 : 0) : 1, out = cyc >= END;
    c.drawImage(out ? lit : dark, 0, 0);
    if (!out) {
      // the way you came, as you remember it
      for (let q = 0; q <= k; q++) { const [i, j] = MZ.path[q]; c.drawImage(dim, 18 * i, 18 * j + OY, 24, 24, 18 * i, 18 * j + OY, 24, 24); }
      // your lamp
      const R = 34;
      c.save(); c.beginPath();
      for (let dy = -R; dy <= R; dy++) { const w = Math.floor(Math.sqrt(R * R - dy * dy)); c.rect(Math.round(tx) - w, Math.round(ty) + dy, 2 * w + 1, 1); }
      c.clip(); c.drawImage(lit, 0, 0); c.restore();
      IA.paint(c, tx - R - 1, ty - R - 1, 2 * R + 3, 2 * R + 3, (x, y) => { const d = Math.hypot(x - tx, y - ty); return d > R - 9 && d <= R + 1 && bayer(x, y) < (d - R + 9) / 10 ? '#000000' : null; });
    }
    // the way out, glowing
    const [gx, gy] = ctr(MZ.exit), gl = (t >> 2) & 3;
    for (let r = 10 + gl; r > 2; r -= 3) IA.paint(c, gx - r, gy - r, 2 * r + 1, 2 * r + 1, (x, y) => (Math.hypot(x - gx, y - gy) <= r && bayer(x, y) < 0.25 ? '#58F898' : null));
    Pix.rect(c, gx - 4, gy - 4, 8, 8, '#1C7C3C'); Pix.rect(c, gx - 3, gy - 3, 6, 6, out && (t >> 2) & 1 ? '#F8F8F8' : '#58F898'); Pix.rect(c, gx - 1, gy - 1, 2, 2, '#F8F8F8');
    // the guards: tanks in the lamp light, a pair of red eyes in the dark
    const r = seeded(77);
    for (let n = 0; n < 9; n++) {
      const i = Math.floor(r() * 13), j = Math.floor(r() * 7), [x, y] = ctr([i, j]), d = Math.round(Math.sin(t / 30 + n) * 3), dirn = n & 1 ? (d > 0 ? 1 : 3) : (d > 0 ? 2 : 0);
      const px = x + (n & 1 ? d : 0), py = y + (n & 1 ? 0 : d);
      if (out || Math.hypot(px - tx, py - ty) < 28) IA.miniTank(c, px, py, dirn, 'red', t >> 3);
      else if ((t + n * 23) % 90 < 80) { Pix.rect(c, px - 2, py - 1, 1, 1, '#F83800'); Pix.rect(c, px + 2, py - 1, 1, 1, '#F83800'); }
    }
    IA.miniTank(c, tx, ty, dir, Config.playerPal(0), Math.floor(pos * 3));
    if (out) {
      if ((t >> 3) & 1) IA.tag(c, 'ESCAPED!', 88, 62, COL.gold);
      for (let q = 0; q < 6; q++) c.drawImage(Sprites.sparkle[((t >> 2) + q) % Sprites.sparkle.length], gx - 8 + Math.round(Math.cos(q + t / 9) * 12), gy - 8 + Math.round(Math.sin(q + t / 9) * 12));
    }
  },

  // FORTRESS: a road winding through the meadow to your eagle; towers along it cut down the column marching on it
  // with bullets, shells, lightning, frost and rockets, and every wreck pays gold
  fortress(c, t) {
    const road = [[-16, 24], [56, 24], [56, 104], [136, 104], [136, 40], [200, 40], [200, 96], [222, 96]];
    const pos = s => {
      for (let k = 1; k < road.length; k++) {
        const [x0, y0] = road[k - 1], [x1, y1] = road[k], len = Math.abs(x1 - x0) + Math.abs(y1 - y0);
        if (s <= len) { const f = s / len; return [x0 + (x1 - x0) * f, y0 + (y1 - y0) * f, x1 > x0 ? 1 : y1 > y0 ? 2 : 0]; }
        s -= len;
      }
      return null;
    };
    c.drawImage(IA.layer('fort', b => {
      IA.paint(b, 0, 0, IPW, IPH, (x, y) => { const n = IA.noise2(x / 10, y / 10, 2), q = bayer(x, y); return n > 0.7 ? (q < 0.5 ? '#58A838' : '#4C9830') : n < 0.25 ? (q < 0.4 ? '#2C6C1C' : '#3C7C24') : q < 0.12 ? '#5CA83C' : '#3C8828'; });
      const r = seeded(12);
      for (let k = 0; k < 70; k++) { const x = Math.floor(r() * IPW), y = Math.floor(r() * IPH), col = ['#F8F8F8', '#F8D838', '#F878B8', '#A8C8F8'][k % 4]; Pix.rect(b, x, y, 1, 1, col); Pix.rect(b, x, y + 1, 1, 1, '#1C5C14'); }
      for (let k = 0; k < 120; k++) Pix.rect(b, Math.floor(r() * IPW), Math.floor(r() * IPH), 1, 2, '#245C18');
      // the road: packed earth, its edges, ruts
      for (let k = 1; k < road.length; k++) {
        const [x0, y0] = road[k - 1], [x1, y1] = road[k], x = Math.min(x0, x1) - 8, y = Math.min(y0, y1) - 8, w = Math.abs(x1 - x0) + 16, h = Math.abs(y1 - y0) + 16;
        Pix.rect(b, x - 1, y - 1, w + 2, h + 2, '#5C4420');
      }
      for (let k = 1; k < road.length; k++) {
        const [x0, y0] = road[k - 1], [x1, y1] = road[k], x = Math.min(x0, x1) - 8, y = Math.min(y0, y1) - 8, w = Math.abs(x1 - x0) + 16, h = Math.abs(y1 - y0) + 16;
        IA.paint(b, x, y, w, h, (xx, yy) => { const n = IA.hash(xx >> 1, yy >> 1, 4); return n < 0.15 ? '#7C6034' : n < 0.3 ? '#9C7C48' : '#8C6C3C'; });
      }
      for (let k = 1; k < road.length; k++) { const [x0, y0] = road[k - 1], [x1, y1] = road[k]; for (const o of [-4, 4]) Pix.line(b, x0 + (y0 === y1 ? 0 : o), y0 + (y0 === y1 ? o : 0), x1 + (y0 === y1 ? 0 : o), y1 + (y0 === y1 ? o : 0), '#6C5028'); }
      IA.wood(b, 4, 64, 34, 30, 2); IA.wood(b, 84, 2, 34, 20, 5); IA.wood(b, 158, 112, 40, 22, 7); IA.wood(b, 214, 4, 24, 26, 9);
      for (const [x, y] of [[90, 80], [176, 74], [30, 116], [120, 66]]) { Pix.disc(b, x + 1, y + 1, 3, '#1C3C10'); Pix.disc(b, x, y, 3, '#8C8C8C'); Pix.disc(b, x - 1, y - 1, 1, '#C8C8C8'); }
      // your eagle behind its walls
      IA.bricks(b, 212, 80, 28, 8, 3); IA.bricks(b, 212, 80, 6, 34, 4); IA.bricks(b, 212, 108, 28, 6, 5);
      b.drawImage(Sprites.eagle, 220, 88);
    }), 0, 0);
    // the column, marching; every one has its place to die (and the gold it pays)
    const tanks = [], LOOP = 520;
    for (let k = 0; k < 7; k++) {
      const s = (t * 0.4 + k * 46) % LOOP, die = 120 + ((k * 67) % 250), p = pos(Math.min(s, die));
      if (!p) continue;
      if (s < die) tanks.push({ x: p[0], y: p[1], d: p[2], k, hp: 1 - s / die });
      else if (s < die + 16) { const f = Math.floor((s - die) / 0.4); IA.boom(c, p[0], p[1], f, 12, k); if (f > 8) { const q = Math.min(1, (f - 8) / 22); Pix.disc(c, Math.round(p[0] + (14 - p[0]) * q), Math.round(p[1] + (8 - p[1]) * q - Math.sin(q * Math.PI) * 20), 2, '#F8D838'); } }
    }
    const near = (x, y, rng) => tanks.reduce((b, p) => { const d = Math.hypot(p.x - x, p.y - y); return d < rng && (!b || d < b.dd) ? Object.assign(p, { dd: d }) : b; }, null);
    const frozen = new Set();
    // frost: a cold ring, snow drifting in it, the tanks in it frosted over
    const [fx, fy] = [168, 72];
    for (let k = 0; k < 40; k++) { const a = k / 40 * Math.PI * 2 + t * 0.01, rr = 30 + Math.sin(t / 10) * 1; Pix.rect(c, fx + Math.cos(a) * rr, fy + Math.sin(a) * rr, 1, 1, '#A8E0F8'); }
    for (let k = 0; k < 10; k++) { const a = k * 2.4 + t * 0.03, d = (k * 7 + t * 0.3) % 28; Pix.rect(c, fx + Math.cos(a) * d, fy + Math.sin(a) * d, 1, 1, '#F8F8F8'); }
    for (const p of tanks) if (Math.hypot(p.x - fx, p.y - fy) < 30) frozen.add(p.k);
    for (const p of tanks) {
      c.drawImage(Sprites.tank('e' + [0, 1, 3, 2][p.k % 4], (t >> 2) & 1, p.d, p.k === 3 ? 'green' : p.k === 5 ? 'red' : 'silver'), Math.round(p.x) - 8, Math.round(p.y) - 8);
      if (frozen.has(p.k)) IA.veil(c, Math.round(p.x) - 7, Math.round(p.y) - 7, 14, 14, '#A8E0F8', 0.35);
      Pix.rect(c, Math.round(p.x) - 7, Math.round(p.y) - 11, 14, 3, '#000000'); Pix.rect(c, Math.round(p.x) - 6, Math.round(p.y) - 10, Math.max(1, Math.round(12 * p.hp)), 1, p.hp > 0.4 ? '#58D854' : '#F83800');
    }
    // the towers and what they throw
    const T = [['gun', 24, 48], ['tesla', 80, 56], ['cannon', 96, 120], ['frost', fx - 8, fy - 8], ['rocket', 160, 8], ['flame', 112, 72], ['gun', 216, 52]];
    const fake = { frame: t };
    for (const [kind, x, y] of T) {
      const cx = x + 8, cy = y + 8, p = near(cx, cy, kind === 'flame' ? 34 : 60), ang = p ? Math.atan2(p.y - cy, p.x - cx) : -Math.PI / 2;
      Stage.prototype.drawTower.call(fake, c, { kind, lv: 3, ang, hp: 1, max: 1, busy: !!p, spec: kind === 'gun' && x > 200 ? 1 : undefined }, x, y);
      if (!p) continue;
      if (kind === 'gun') { const q = (t % 8) / 8; IA.shell(c, cx + (p.x - cx) * q, cy + (p.y - cy) * q, Math.sign(Math.round(Math.cos(ang))), Math.sign(Math.round(Math.sin(ang)))); }
      if (kind === 'cannon') { const q = (t % 40) / 24; if (q < 1) { Pix.rect(c, cx + (p.x - cx) * q - 1, cy + (p.y - cy) * q - Math.sin(q * Math.PI) * 14 - 1, 3, 3, '#1C1C1C'); Pix.rect(c, cx + (p.x - cx) * q - 1, cy + (p.y - cy) * q - Math.sin(q * Math.PI) * 14 - 1, 1, 1, '#9C9C9C'); } else IA.boom(c, p.x, p.y, Math.floor((q - 1) * 24 * 1.5), 8, 3); }
      if (kind === 'tesla' && (t % 30) < 8) {
        const bolt = (x0, y0, x1, y1, sd) => { const r = seeded(sd); let px = x0, py = y0; for (let k = 1; k <= 6; k++) { const nx = x0 + (x1 - x0) * k / 6 + (k < 6 ? (r() - 0.5) * 8 : 0), ny = y0 + (y1 - y0) * k / 6 + (k < 6 ? (r() - 0.5) * 8 : 0); Pix.line(c, px, py, nx, ny, '#7C78F8', 2); Pix.line(c, px, py, nx, ny, (t & 2) ? '#F8F8F8' : '#F8F8A0'); px = nx; py = ny; } };
        bolt(cx, cy - 6, p.x, p.y, t >> 1);
        const p2 = tanks.find(q => q !== p && Math.hypot(q.x - p.x, q.y - p.y) < 40);
        if (p2) bolt(p.x, p.y, p2.x, p2.y, (t >> 1) + 9);
        IA.sparks(c, p.x, p.y, (t % 30) / 8, 6, t >> 3, ['#F8F8F8', '#A8A8F8']);
      }
      if (kind === 'rocket') { const q = (t % 50) / 30; if (q < 1) { const rx = cx + (p.x - cx) * q, ry = cy + (p.y - cy) * q - Math.sin(q * Math.PI) * 10; for (let j = 1; j < 5; j++) IA.puff(c, rx - (p.x - cx) * j * 0.03, ry - (p.y - cy) * j * 0.03 + j, 1 + j * 0.4, 0); Pix.rect(c, rx - 1, ry - 1, 3, 3, '#F8F8F8'); Pix.rect(c, rx, ry, 1, 1, '#F83800'); } else IA.boom(c, p.x, p.y, Math.floor((q - 1) * 30), 9, 5); }
      if (kind === 'flame') for (let k = 0; k < 10; k++) { const q = ((t * 2 + k * 5) % 20) / 20, sp = (k % 3 - 1) * 0.25; const x2 = cx + Math.cos(ang + sp * q) * q * p.dd, y2 = cy + Math.sin(ang + sp * q) * q * p.dd; Pix.rect(c, x2 - 1, y2 - 1, q > 0.5 ? 3 : 2, q > 0.5 ? 3 : 2, q < 0.3 ? '#F8F8A0' : q < 0.6 ? '#F8B800' : '#D82800'); }
    }
    // gold and the wave
    IA.tag(c, '$' + (215 + ((t >> 5) * 15) % 900), 15, 4, COL.gold); Pix.disc(c, 7, 7, 4, '#7C5000'); Pix.disc(c, 7, 7, 3, '#F8D838'); Pix.rect(c, 6, 5, 1, 2, '#F8F8F8');
    IA.tag(c, 'WAVE 12/30', 154, 124, '#F8F8F8');
  },

  // KILL RACE: a stadium at night under the floodlights, the crowd on its feet; four tanks, four lanes, targets
  // rolling in, and the big board counting who has the most kills
  race(c, t) {
    c.drawImage(IA.layer('race', b => {
      IA.grad(b, 0, 0, IPW, 30, ['#04040C', '#0C0C24', '#181838']);
      Pix.stars(b, 20, 3, 0, 14, IPW);
      // the stands, tier on tier
      for (let y = 16; y < 64; y += 6) { Pix.rect(b, 0, y, IPW, 6, y % 12 ? '#3C3C48' : '#34343C'); Pix.rect(b, 0, y + 5, IPW, 1, '#1C1C24'); }
      // the floodlight towers and their beams
      for (const x of [14, 226]) {
        Pix.rect(b, x - 1, 6, 3, 60, '#5C5C6C'); Pix.rect(b, x - 1, 6, 1, 60, '#9C9CAC');
        IA.paint(b, 0, 14, IPW, 122, (xx, yy) => { const dx = xx - x, dy = yy - 8, a = Math.abs(Math.atan2(dx, dy) - (x < 100 ? -0.55 : 0.55)); return a < 0.28 && bayer(xx, yy) < 0.12 * (1 - a / 0.28) + 0.03 ? '#F8F8D0' : null; });
        Pix.rect(b, x - 7, 1, 15, 8, '#2C2C34'); for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) Pix.rect(b, x - 6 + i * 4, 2 + j * 3, 3, 2, '#F8F8E0');
      }
      // the board
      Pix.rect(b, 76, 1, 88, 48, '#9C9CAC'); Pix.rect(b, 77, 2, 86, 46, '#000000'); Pix.rect(b, 78, 3, 84, 44, '#080810');
      for (let y = 3; y < 47; y += 2) Pix.rect(b, 78, y, 84, 1, '#0C0C18');
      Pix.rect(b, 118, 49, 4, 15, '#5C5C6C');
      // the barrier, with its boards
      Pix.rect(b, 0, 62, IPW, 11, '#E8E8E8'); Pix.rect(b, 0, 73, IPW, 2, '#5C5C5C');
      for (let x = 0; x < IPW; x += 40) { Pix.rect(b, x + 2, 63, 36, 9, ['#D82800', '#0058F8', '#F8B800', '#00A844', '#7C2CC8', '#D82800'][x / 40]); Font.draw(b, ['TANK', 'NES', '1990', 'KILL', 'RACE', 'BOOM'][x / 40], x + 20 - ['TANK', 'NES', '1990', 'KILL', 'RACE', 'BOOM'][x / 40].length * 4 + 1, 64, '#F8F8F8'); }
      // the arena floor: sand, ruts, the lanes
      IA.grad(b, 0, 74, IPW, 62, ['#987040', '#A87C48', '#B88C58', '#C89C64']);
      IA.speckle(b, 0, 74, IPW, 62, ['#C8A070', '#886038', '#7C5830'], 500, 8, 2);
      for (const y of [91, 106, 122]) for (let x = 0; x < IPW; x += 8) Pix.rect(b, x, y, 5, 1, '#E8D0A0');
    }), 0, 0);
    // the crowd, jumping
    c.drawImage(IA.layer('race-crowd' + ((t >> 3) & 1), b => {
      const r = seeded(9), f = (t >> 3) & 1;
      for (let y = 18; y < 62; y += 6) for (let x = 1; x < IPW; x += 4) {
        if ((x > 74 && x < 166 && y < 50) || r() < 0.08) continue;
        const up = f && r() < 0.5 ? 1 : 0, shirt = ['#D82800', '#F8B800', '#0058F8', '#00A844', '#F8F8F8', '#F878B8', '#3CBCFC'][Math.floor(r() * 7)];
        Pix.rect(b, x, y - up, 2, 2, ['#F8C8A0', '#C88C58', '#8C5C30'][Math.floor(r() * 3)]); Pix.rect(b, x, y + 2 - up, 3, 3, shirt);
        if (up && r() < 0.4) Pix.rect(b, x + 2, y - 2, 1, 2, '#F8C8A0');
      }
    }), 0, 0);
    for (let k = 0; k < 3; k++) { const r = seeded((t >> 2) * 3 + k); if (r() < 0.5) { const x = Math.floor(r() * IPW), y = 18 + Math.floor(r() * 40); if (x < 74 || x > 166) { Pix.rect(c, x, y, 1, 1, '#F8F8F8'); Pix.rect(c, x - 1, y, 3, 1, '#F8F8F8'); Pix.rect(c, x, y - 1, 1, 3, '#F8F8F8'); } } }
    // four lanes: a target rolls in, you shoot it, +1
    const lanes = [[84, 26, 108, 0], [99, 30, 118, 40], [115, 34, 128, 77], [132, 38, 140, 19]], kills = [];
    lanes.forEach(([gy, L, per, off], i) => {
      const cyc = (t + off) % per, n = Math.floor((t + off) / per), pal = Config.playerPal(i);
      kills.push(Math.min(9, n + [2, 1, 3, 0][i]));
      const tx = 262 - cyc * 1.3;
      if (cyc < 66) IA.sideTank(c, tx, gy, n % 3 ? 'silver' : 'red', { flip: true, f: t >> 2, L: L - 2 });
      else if (cyc < 106) { IA.boom(c, 176, gy - 8, cyc - 66, L * 0.35, i + n); Font.draw(c, '+1', 170, gy - 20 - Math.min(16, (cyc - 66) >> 1), PALS[pal][2]); }
      const q = cyc - 46, m = IA.sideTank(c, 82 - i * 16, gy, pal, { f: (t >> 3) + i, L, recoil: q >= 0 && q < 4 ? 2 - (q >> 1) : 0, star: '#F8F8F8', sway: q >= 0 && q < 10 ? -2 : 0 });
      if (q >= 0 && q < 4) IA.flash(c, m.x, m.y, 1, 0, q);
      if (q >= 0 && q < 20) IA.shell(c, m.x + q * 6, m.y, 1, 0);
    });
    // the board: four bars racing to ten, the leader's crown
    const best = Math.max(...kills);
    kills.forEach((k, i) => {
      const y = 6 + i * 10, pal = PALS[Config.playerPal(i)];
      Font.draw(c, ROMAN[i], 82, y, pal[2]);
      Pix.rect(c, 106, y + 1, 40, 5, '#1C1C2C'); Pix.rect(c, 106, y + 1, k * 4, 5, pal[2]); Pix.rect(c, 106, y + 1, k * 4, 1, pal[1]);
      IA.digits(c, k, 150, y + 1, '#F8F8F8');
      if (k === best && (t >> 3) & 1) { c.strokeStyle = COL.gold; c.lineWidth = 1; c.strokeRect(79.5, y - 1.5, 80, 10); }
    });
  },

  // VS EAGLES: two forts face each other across the mud in a thunderstorm, an eagle on each wall; the two tanks
  // trade shells at each other's eagle
  eagles(c, t) {
    const p1 = PALS[Config.playerPal(0)], p2 = PALS[Config.playerPal(1)];
    c.drawImage(IA.layer('eagles', b => {
      IA.grad(b, 0, 0, IPW, 106, ['#06060E', '#0C0C1C', '#14182C', '#1C2440', '#283454']);
      for (let k = 0; k < 6; k++) IA.cloud(b, k * 48 + 10, 10 + (k % 3) * 9, 34, 10, ['#1C2034', '#283048', '#343C58'], k);
      IA.ridge(b, 104, 10, 6, ['#20283C', '#141C2C', '#0C1020'], { f: 1.4 });
      IA.grad(b, 0, 102, IPW, 34, ['#2C2418', '#241C10', '#1C140C']);
      IA.speckle(b, 0, 102, IPW, 34, ['#3C3020', '#141008', '#4C3C24'], 300, 2, 2);
      for (const [x, y, w] of [[96, 116, 22], [134, 124, 30], [70, 130, 16]]) IA.paint(b, x, y, w, 4, (xx, yy) => (Math.hypot((xx - x - w / 2) / (w / 2), (yy - y - 2) / 2) < 1 ? (bayer(xx, yy) < 0.3 ? '#5C6C9C' : '#2C3858') : null));
      for (const [x, y] of [[112, 126], [150, 110]]) IA.crater(b, x, y, 4, '#2C2010');
      // barbed wire in the middle
      for (let k = 0; k < 4; k++) Pix.rect(b, 104 + k * 10, 104, 1, 9, '#5C4C3C');
      for (let x = 100; x < 140; x++) { Pix.rect(b, x, 106 + Math.round(Math.sin(x * 0.9) * 1.5), 1, 1, '#7C7C7C'); if (x % 3 === 0) Pix.rect(b, x, 105 + Math.round(Math.sin(x * 0.9) * 1.5), 1, 1, '#ADADAD'); }
      // the two forts, the eagles on their walls, their banners
      for (const [x0, flip, pal] of [[0, false, p1], [182, true, p2]]) {
        const X = (x, w) => (flip ? IPW - x - w : x);
        IA.bricks(b, X(0, 20), 38, 20, 76, 2 + x0); IA.bricks(b, X(20, 38), 72, 38, 42, 3 + x0);
        for (let k = 0; k < 4; k++) IA.bricks(b, X(22 + k * 10, 6), 66, 6, 6, k + x0);
        for (let k = 0; k < 3; k++) IA.bricks(b, X(1 + k * 7, 4), 33, 4, 5, k + x0 * 2);
        IA.steel(b, X(18, 42), 68, 42, 4, 4);
        b.drawImage(IA.emboss(Sprites.eagle, 2, '#000000', '#E8E8E8', '#3C3C3C'), X(22, 34), 34);
        Pix.rect(b, X(5, 10), 46, 10, 26, pal[2]); Pix.rect(b, X(5, 10), 46, 10, 2, pal[1]); Pix.rect(b, X(5, 10), 70, 10, 2, pal[3]);
        for (let k = 0; k < 5; k++) Pix.rect(b, X(5 + k * 2, 1), 72, 1, 2 + (k & 1), pal[2]);
        Pix.rect(b, X(8, 4), 54, 4, 4, '#F8F8F8'); Pix.rect(b, X(9, 2), 52, 2, 8, '#F8F8F8');
        Pix.rect(b, X(10, 1), 14, 1, 20, '#BCBCBC');
      }
    }), 0, 0);
    // flags on the towers
    for (const [x, pal, flip] of [[10, p1, false], [229, p2, true]]) for (let k = 0; k < 10; k++) { const yy = 15 + Math.round(Math.sin(t / 6 - k * 0.7) * 1.5); Pix.rect(c, flip ? x - 1 - k : x + 1 + k, yy, 1, 6, k > 7 ? pal[3] : pal[2]); }
    // the storm: lightning now and then, rain all the time
    const L = t % 130;
    if (L < 8) {
      c.globalAlpha = [0.45, 0.15, 0.35, 0.1, 0.05, 0, 0, 0][L]; Pix.rect(c, 0, 0, IPW, 104, '#C8D0F8'); c.globalAlpha = 1;
      const r = seeded(Math.floor(t / 130) + 4);
      let x = 100 + r() * 40, y = 0;
      while (y < 100) {
        const nx = x + (r() - 0.5) * 16, ny = y + 6 + r() * 8;
        Pix.line(c, x, y, nx, ny, '#B8C0F8', 3); Pix.line(c, x, y, nx, ny, '#F8F8F8');
        if (r() < 0.2) Pix.line(c, nx, ny, nx + (r() - 0.5) * 20, ny + 10, '#B8C0F8');
        x = nx; y = ny;
      }
    }
    for (let k = 0; k < 60; k++) { const x = (IA.hash(k, 3) * 280 + t * 2.2) % 280 - 30, y = (IA.hash(k, 5) * 136 + t * 5) % 140; Pix.line(c, x, y, x - 2, y + 5, k % 3 ? '#3C4C78' : '#6C7CA8'); }
    // the duel: each fires at the other's eagle; the hit wall flies apart and its eagle shakes
    const cyc = t % 140;
    for (const [i, cx, flip, start, wx] of [[0, 76, false, 20, 182], [1, 164, true, 90, 58]]) {
      const q = cyc - start, pal = Config.playerPal(i), roll = Math.round(Math.sin(t / 40 + i * 2) * 4);
      const m = IA.sideTank(c, cx + roll, 126, pal, { flip, f: t >> 3, L: 38, recoil: q >= 0 && q < 4 ? 2 - (q >> 1) : 0, star: '#F8F8F8', sway: q >= 0 && q < 10 ? 2 : Math.sin(t / 9) });
      const dir = flip ? -1 : 1, travel = Math.abs(wx - m.x) / 5;
      if (q >= 0 && q < 4) IA.flash(c, m.x, m.y, dir, 0, q);
      if (q >= 0 && q < travel) IA.shell(c, m.x + dir * q * 5, m.y - Math.sin(q / travel * Math.PI) * 10, dir, 0);
      const h = q - travel;
      if (h >= 0 && h < 40) { IA.boom(c, wx, m.y - 4, Math.floor(h), 9, i + 3); IA.debris(c, wx, m.y - 4, h / 40, 7, ['#C05018', '#8C3000', '#F09858'], i, 0.8); }
      if (h >= 0 && h < 14) { const ex = flip ? 22 : IPW - 56, em = IA.emboss(Sprites.eagle, 2, '#000000', '#E8E8E8', '#3C3C3C'); if (h & 2) c.drawImage(Sprites.outline(em, '#F83800'), ex - 1, 33); IA.sparks(c, ex + 17, 50, h / 14, 8, i + 5); }
    }
    // VS, in the storm
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [2, 2]]) Font.big(c, 'VS', 98 + dx, 40 + dy, 3, '#000000');
    Font.big(c, 'VS', 98, 40, 3, (t >> 4) & 1 ? COL.gold : '#F83800');
  },

  // DEATHMATCH: a steel arena at night, red beacons turning, a skull painted on the floor; four tanks shoot it out
  // across it, shells meeting in the middle, the frags going up
  dm(c, t) {
    const SKULL = ['....XXXXXXXX....', '..XXXXXXXXXXXX..', '.XXXXXXXXXXXXXX.', '.XXXXXXXXXXXXXX.', 'XXX...XXXX...XXX', 'XX.....XX.....XX',
      'XX.....XX.....XX', 'XXX...XXXX...XXX', '.XXXXXX..XXXXXX.', '..XXXXX..XXXXX..', '...XXXXXXXXXX...', '...X.X.XX.X.X...', '...XXXXXXXXXX...', '....XXXXXXXX....'];
    const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];
    c.drawImage(IA.layer('dm', b => {
      IA.paint(b, 0, 0, IPW, IPH, (x, y) => {
        const i = x % 6, j = y % 6, q = IA.hash(x >> 3, y >> 3, 2);
        if (x % 48 === 0 || y % 34 === 0) return '#141418';
        if ((x % 48 === 3 || x % 48 === 45) && (y % 34 === 3 || y % 34 === 31)) return '#7C7C88';
        return (i === 1 && j < 3) || (j === 1 && i < 3) ? '#4C4C58' : (i + j) % 6 === 4 && i > 2 ? '#202024' : q < 0.1 ? '#2C2C30' : '#34343C';
      });
      // the skull, painted and worn, and two crossed guns behind it
      for (const [x0, y0, x1, y1] of [[64, 24, 176, 112], [176, 24, 64, 112]]) { Pix.line(b, x0, y0, x1, y1, '#3C1010', 6); Pix.line(b, x0, y0, x1, y1, '#5C1818', 3); }
      const sk = makeCanvas(16, 14), sx = sk.getContext('2d');
      SKULL.forEach((row, j) => { for (let i = 0; i < 16; i++) if (row[i] === 'X') Pix.rect(sx, i, j, 1, 1, '#A82418'); });
      b.drawImage(IA.emboss(sk, 4, '#1C0404', '#D84830', '#5C0C08'), 87, 39);
      IA.paint(b, 88, 40, 64, 56, (x, y) => (IA.hash(x >> 1, y >> 1, 9) < 0.08 ? '#34343C' : null));
      for (let k = 0; k < 7; k++) { const r = seeded(k + 3), ox = 14 + r() * 200, oy = 14 + r() * 100, w = 4 + r() * 6; IA.paint(b, ox - w, oy - w, w * 2, w * 2, (x, y) => (Math.hypot((x - ox) / w, (y - oy) / (w * 0.7)) < 1 - IA.hash(x, y, k) * 0.3 ? '#18181C' : null)); }
      // hazard stripes along the edges, steel blocks for cover
      for (let x = 0; x < IPW; x++) for (const y of [0, IPH - 4]) Pix.rect(b, x, y, 1, 4, ((x + y) >> 2) & 1 ? '#F8B800' : '#141414');
      for (const [x, y] of [[36, 18], [188, 18], [36, 100], [188, 100]]) IA.block(b, x, y, 16, 12, 'steel', 0, 4);
    }), 0, 0);
    // the beacons, sweeping red light round the arena
    for (const [bx, by, k] of [[8, 8, 0], [232, 8, 1], [8, 128, 2], [232, 128, 3]]) {
      const a = t * 0.06 + k * 1.6;
      for (let r = 6; r < 70; r += 2) for (let s = -3; s <= 3; s++) { const aa = a + s * 0.05, x = Math.round(bx + Math.cos(aa) * r), y = Math.round(by + Math.sin(aa) * r); if (((x + y) & 1) && (r < 30 || !((x + y) & 2))) Pix.rect(c, x, y, 1, 1, r < 30 ? '#B02010' : '#701008'); }
      Pix.disc(c, bx, by, 4, '#3C0800'); Pix.disc(c, bx, by, 3, (t >> 2) & 1 ? '#F83800' : '#C82000'); Pix.rect(c, bx - 1, by - 1, 1, 1, '#F8B8A8');
    }
    // two duels across the skull, left against right and top against bottom: both fire and the shells meet in
    // the middle; then one fires alone and hits, and the other comes back with a shield
    const tanks = [[34, 68, 1], [206, 68, 3], [120, 20, 2], [120, 116, 0]], frags = [6, 4, 5, 3], P = 150, events = [];
    for (const [a, bb, off] of [[0, 1, 0], [3, 2, 75]]) {
      const cyc = (t + off) % P, n = Math.floor((t + off) / P), w = n & 1 ? bb : a;
      events.push({ from: a, to: bb, at: 10, meet: true, cyc }, { from: bb, to: a, at: 10, meet: true, cyc }, { from: w, to: w === a ? bb : a, at: 70, cyc });
      frags[w] += Math.ceil(n / 2) + (cyc > 100 ? 1 : 0);
    }
    const dead = new Set(), shield = new Set();
    for (const e of events) if (!e.meet && e.cyc >= 100 && e.cyc < 132) dead.add(e.to); else if (!e.meet && e.cyc >= 132) shield.add(e.to);
    const at = tanks.map(([x, y, d], i) => { const sw = Math.round(Math.sin(t / 25 + i) * 5); return [x + DIRS[d][0] * sw, y + DIRS[d][1] * sw, d]; });
    at.forEach(([x, y, d], i) => {
      if (dead.has(i)) return;
      const firing = events.some(e => e.from === i && e.cyc >= e.at && e.cyc < e.at + 4);
      IA.topTank(c, x, y, d, Config.playerPal(i), t >> 2, { recoil: firing ? 1 : 0 });
      if (shield.has(i)) for (let k = 0; k < 12; k++) { const a = k * 0.52 + t * 0.2; Pix.rect(c, x + Math.cos(a) * 16, y + Math.sin(a) * 16, 1, 1, (k + (t >> 1)) & 1 ? '#F8F8F8' : '#3CBCFC'); }
    });
    for (const e of events) {
      const [ax, ay, d] = at[e.from], [bx, by] = at[e.to], q = e.cyc - e.at, [dx, dy] = DIRS[d];
      if (q < 0) continue;
      if (q < 4) IA.flash(c, ax + dx * 14, ay + dy * 14, dx, dy, q);
      const len = Math.hypot(bx - ax, by - ay), mid = len / 2 - 2, sp = 4;
      if (e.meet) { if (q * sp < mid - 14) IA.shell(c, ax + dx * (14 + q * sp), ay + dy * (14 + q * sp), dx, dy); else if (q * sp < mid + 30) IA.sparks(c, (ax + bx) / 2, (ay + by) / 2, (q * sp - mid + 14) / 44, 12, e.from); }
      else if (q * sp < len - 28) IA.shell(c, ax + dx * (14 + q * sp), ay + dy * (14 + q * sp), dx, dy);
      else if (e.cyc < 140) { const f = Math.floor(q - (len - 28) / sp); IA.boom(c, bx, by, f, 16, e.from + 7); IA.debris(c, bx, by, f / 30, 8, ['#3C3C3C', PALS[Config.playerPal(e.to)][2]], e.to); }
    }
    // the frags and the kill feed
    Pix.rect(c, 4, 6, 70, 11, '#000000');
    frags.forEach((f, i) => Font.draw(c, String(f), 7 + i * 17, 8, PALS[Config.playerPal(i)][2]));
    events.filter(e => !e.meet && e.cyc >= 100).forEach((e, k) => {
      const y = 8 + k * 12;
      Pix.rect(c, 162, y - 2, 74, 11, '#000000');
      Font.draw(c, ROMAN[e.from], 164, y, PALS[Config.playerPal(e.from)][2]); Font.draw(c, '>', 196, y, '#F8F8F8'); Font.draw(c, ROMAN[e.to], 206, y, PALS[Config.playerPal(e.to)][2]);
    });
  },

  // FLAGS: a sunny valley, a base at each end and a river between them; your tank runs their flag home over the
  // bridge, theirs on its tail, its shells splashing into the river
  ctf(c, t) {
    const p1 = Config.playerPal(0), p2 = Config.playerPal(1), P1 = PALS[p1], P2 = PALS[p2], GY = 112;
    c.drawImage(IA.layer('ctf', b => {
      IA.grad(b, 0, 0, IPW, 80, ['#2C78E8', '#4C98F0', '#78B8F8', '#A8D8F8', '#D0E8F8']);
      IA.ball(b, 30, 18, 9, 9, ['#F8F8F8', '#F8F8D8', '#F8F0A0', '#F8E080', '#F8D060']);
      IA.ridge(b, 82, 22, 14, ['#A8B8E0', '#7C90C8', '#5C70A8'], { snow: 0.9, jag: 0.4, f: 1.2 });
      IA.ridge(b, 96, 14, 5, ['#68B848', '#3C9030', '#2C6C24'], { f: 1.8, trees: 0.3 });
      IA.grad(b, 0, 98, IPW, 38, ['#58A838', '#4C9830', '#3C8028']);
      IA.speckle(b, 0, 98, IPW, 38, ['#78C048', '#2C6C1C', '#F8F8F8', '#F8D838'], 260, 7);
      for (const x of [56, 66, 172, 186, 230]) IA.tree(b, x, 92, 6, x, undefined, 8);
      // the river, sunk between its banks
      IA.paint(b, 70, 100, 100, 36, (x, y) => { const bank = Math.abs(x - 120 + (y - 100) * 0.4) - 22 - (y - 100) * 0.5; return bank > 0 ? (bank < 3 ? '#7C5C30' : null) : y < 106 ? (bank > -2 ? '#7C5C30' : '#4C3818') : bayer(x, y) < 0.25 ? '#3C80E8' : '#2058C8'; });
      // the bases: bunkers of sandbags and steel, your flag still at home
      for (const [x, pal] of [[4, P1], [204, P2]]) {
        IA.steel(b, x, 92, 32, 20, 8);
        for (let k = 0; k < 6; k++) { IA.puff(b, x + 3 + k * 5.4, 90, 3, 3); IA.puff(b, x + 5 + k * 5.4, 86, 3, 3); }
        Pix.rect(b, x + 6, 98, 20, 4, '#101010'); Pix.rect(b, x + 6, 98, 20, 1, pal[2]);
        Pix.rect(b, x + 15, 46, 2, 40, '#E8E8E8'); Pix.rect(b, x + 16, 46, 1, 40, '#9C9C9C'); Pix.disc(b, x + 16, 45, 1, COL.gold);
      }
    }), 0, 0);
    for (let k = 0; k < 3; k++) IA.puffs(c, Math.round(((k * 90 + t * (0.08 + k * 0.03)) % (IPW + 60)) - 50), 20 + k * 11, 28 + k * 8, ['#F8F8F8', '#E0E8F8', '#B8C8E8'], k + 7);
    // the water: ripples drifting downstream
    for (let k = 0; k < 18; k++) { const y = 108 + (k % 9) * 3, x = 84 + ((k * 13 + (t >> 1)) % 64); if (Math.abs(x - 120 + (y - 100) * 0.4) < 20 + (y - 100) * 0.5) Pix.rect(c, x, y, 3, 1, '#A8D0F8'); }
    // the bridge
    Pix.rect(c, 86, GY - 3, 68, 4, '#B07838'); Pix.rect(c, 86, GY - 3, 68, 1, '#E8A860'); Pix.rect(c, 86, GY + 1, 68, 2, '#5C3810');
    for (let x = 88; x < 154; x += 4) Pix.rect(c, x, GY - 3, 1, 4, '#7C5020');
    for (const x of [92, 120, 148]) { Pix.rect(c, x, GY + 3, 3, 20, '#5C3810'); Pix.rect(c, x, GY + 3, 1, 20, '#8C6030'); }
    Pix.rect(c, 86, GY - 11, 68, 1, '#8C6030'); for (let x = 86; x < 155; x += 8) Pix.rect(c, x, GY - 11, 1, 8, '#7C5020');
    // the run: their flag on your tank, back to your base; they chase and shoot
    const RUN = 340, cyc = t % (RUN + 80), home = cyc >= RUN, caps = 2 + Math.floor(t / (RUN + 80));
    const flag = (x, y, pal, flip) => { for (let k = 0; k < 13; k++) { const yy = y + Math.round(Math.sin(t / 5 - k * 0.6) * (k / 6)); Pix.rect(c, flip ? x - k : x + k, yy, 1, 9, k > 10 ? pal[3] : pal[2]); Pix.rect(c, flip ? x - k : x + k, yy, 1, 1, pal[1]); } Pix.rect(c, flip ? x - 7 : x + 5, y + 3 + Math.round(Math.sin(t / 5 - 6) * 1), 3, 3, '#F8F8F8'); };
    flag(21, 46, P1, false);
    const cx = home ? 40 : 214 - cyc * 0.51, ch = home ? 300 : cx + 62 + Math.round(Math.sin(t / 30) * 6);
    if (!home) {
      IA.sideTank(c, ch, GY, p2, { flip: true, f: t >> 2, L: 36, star: '#F8F8F8', sway: Math.sin(t / 7) * 2 });
      const q = t % 70, mx = ch - 34;
      if (q < 4) IA.flash(c, mx, GY - 18, -1, 0, q);
      if (q < 18) IA.shell(c, mx - q * 4, GY - 18 + q * q * 0.06, -1, 0);
      else if (q < 40) { const sx = mx - 72, f = q - 18; if (Math.abs(sx - 120) < 26) { for (let k = 0; k < 8; k++) { const a = -Math.PI / 2 + (k - 3.5) * 0.25, d = f * 0.9; Pix.rect(c, sx + Math.cos(a) * d * 0.6, GY + 6 + Math.sin(a) * d * 1.4 + f * f * 0.05, 2, 2, k & 1 ? '#F8F8F8' : '#A8D0F8'); } } else { IA.debris(c, sx, GY - 2, f / 22, 6, ['#5C4424', '#3C8028'], q); IA.puff(c, sx, GY - 4 - f * 0.3, 2 + f * 0.15, 3); } }
    }
    IA.sideTank(c, cx, GY, p1, { flip: true, f: home ? 0 : t >> 2, L: 36, star: '#F8F8F8', sway: home ? 0 : Math.sin(t / 6) * 2 });
    if (!home) { Pix.rect(c, cx + 12, GY - 34, 1, 18, '#E8E8E8'); flag(cx + 13, GY - 34, P2, false); for (let k = 0; k < 4; k++) { const q = ((t * 2 + k * 15) % 60) / 60; IA.puff(c, cx + 22 + q * 20, GY - 2 - q * 6, 1 + q * 4, 3); } }
    else {
      flag(26, 58, P2, false); Pix.rect(c, 25, 58, 1, 10, '#E8E8E8');
      if ((t >> 3) & 1) IA.tag(c, 'CAPTURE!', 88, 46, COL.gold);
      for (let k = 0; k < 3; k++) { const q = (cyc - RUN + k * 20) % 40, fx = 60 + k * 50, fy = 40 - q; if (q < 20) Pix.rect(c, fx, fy + 20, 1, 3, '#F8F8F8'); else IA.sparks(c, fx, 20, (q - 20) / 20, 14, k, ['#F8F8F8', [P1[1], COL.gold, '#F878B8'][k], '#F83800']); }
    }
    // the score
    Pix.rect(c, 92, 3, 56, 13, '#000000');
    Font.draw(c, String(caps + (home ? 1 : 0)), 100, 6, P1[2]); Font.draw(c, '-', 116, 6, '#F8F8F8'); Font.draw(c, '1', 132, 6, P2[2]);
  },

  // VS CPU: the machine's fortress at night, a mainframe with a face on its screen, tape reels turning, a dish on
  // the roof; its HQ blinks red at the foot of it, and you (and your friends) shoot your way in
  cpu(c, t) {
    c.drawImage(IA.layer('cpu', b => {
      IA.grad(b, 0, 0, IPW, 104, ['#04040C', '#0C0820', '#1C1038', '#2C1848', '#3C2050']);
      Pix.stars(b, 40, 8, 0, 60, IPW);
      IA.ball(b, 40, 22, 10, 10, ['#F8F8F8', '#E0E0E8', '#B8B8C8', '#8C8CA0', '#5C5C70']);
      // the city behind
      const r = seeded(4);
      for (let x = 0; x < 130;) {
        const w = 8 + Math.floor(r() * 10), h = 20 + Math.floor(r() * 34), top = 104 - h;
        Pix.rect(b, x, top, w, h, x % 2 ? '#141024' : '#1C1430'); Pix.rect(b, x, top, 1, h, '#2C2444');
        for (let y = top + 3; y < 102; y += 4) for (let xx = x + 2; xx < x + w - 1; xx += 3) if (r() < 0.35) Pix.rect(b, xx, y, 1, 2, r() < 0.8 ? '#F8D878' : '#58F8F8');
        x += w + 1;
      }
      // the ground: concrete, cracks, a wreck
      IA.grad(b, 0, 104, IPW, 32, ['#3C3C44', '#34343C', '#2C2C34']);
      IA.speckle(b, 0, 104, IPW, 32, ['#4C4C58', '#202028'], 200, 3);
      for (let k = 0; k < 5; k++) { let x = 10 + k * 40, y = 108; for (let j = 0; j < 6; j++) { const nx = x + 3 + (j * 7) % 5, ny = y + 2 + (j % 3); Pix.line(b, x, y, nx, ny, '#18181C'); x = nx; y = ny; } }
      // the fortress
      IA.steel(b, 128, 58, 112, 52, 12, ['#7C7C90', '#4C4C5C', '#3C3C4C', '#1C1C28', '#8C8CA0']);
      Pix.rect(b, 128, 56, 112, 3, '#9C9CAC');
      // the mainframe: a cabinet, its screen, tape reels, a panel of lights
      Pix.rect(b, 138, 4, 96, 56, '#000000'); Pix.rect(b, 139, 5, 94, 54, '#C8B890'); Pix.rect(b, 139, 5, 94, 1, '#F0E0B8'); Pix.rect(b, 139, 5, 1, 54, '#E8D8B0'); Pix.rect(b, 232, 5, 1, 54, '#887850'); Pix.rect(b, 139, 58, 94, 1, '#887850');
      Pix.rect(b, 144, 9, 54, 40, '#3C3828'); Pix.rect(b, 146, 11, 50, 36, '#061206');
      for (let k = 0; k < 2; k++) { const x = 203 + k * 15; Pix.rect(b, x - 6, 9, 13, 24, '#2C2C2C'); }
      Pix.rect(b, 202, 36, 28, 13, '#5C5444');
      for (let k = 0; k < 6; k++) Pix.rect(b, 144 + k * 9, 52, 6, 2, '#5C5444');
      Pix.rect(b, 180, 0, 2, 5, '#7C7C7C'); Pix.line(b, 181, 0, 196, -2, '#7C7C7C');
      // the HQ bunker at its foot
      IA.steel(b, 160, 80, 48, 30, 6); Pix.rect(b, 172, 88, 24, 22, '#100808');
    }), 0, 0);
    // the dish turning, cables, reels and lights
    const da = Math.sin(t / 40);
    for (let k = -6; k <= 6; k++) Pix.rect(c, Math.round(181 + k * da), -1 + Math.round(Math.abs(k) * 0.4), 1, 2, '#BCBCBC');
    for (let k = 0; k < 2; k++) { const x = 203 + k * 15, y = 20; Pix.disc(c, x, y, 6, '#7C7C7C'); Pix.disc(c, x, y, 4, '#3C2C1C'); Pix.disc(c, x, y, 1, '#BCBCBC'); const a = t * (k ? -0.12 : 0.15); for (const o of [0, 2.1, 4.2]) Pix.rect(c, Math.round(x + Math.cos(a + o) * 3), Math.round(y + Math.sin(a + o) * 3), 1, 1, '#BCBCBC'); }
    for (let k = 0; k < 18; k++) { const on = IA.hash(k, t >> 3) < 0.5; Pix.rect(c, 204 + (k % 6) * 4, 38 + Math.floor(k / 6) * 4, 2, 2, on ? ['#F83800', '#58F898', '#F8D838'][k % 3] : '#2C2820'); }
    // the face: green phosphor, scanlines; when it's hit, it glitches
    const hit = (t % 90) > 44 && (t % 90) < 60, g = '#38F838';
    const blink = t % 120 > 112;
    if (hit) {
      const r = seeded(t >> 1);
      for (let k = 0; k < 9; k++) Pix.rect(c, 146 + Math.floor(r() * 30), 11 + Math.floor(r() * 36), 10 + Math.floor(r() * 20), 1, r() < 0.5 ? g : '#1C501C');
      for (const ex of [158, 178]) { Pix.line(c, ex, 18, ex + 8, 26, g, 2); Pix.line(c, ex + 8, 18, ex, 26, g, 2); }
    } else {
      for (const ex of [158, 178]) { Pix.rect(c, ex, blink ? 23 : 18, 9, blink ? 2 : 8, g); if (!blink) Pix.rect(c, ex + 3 + Math.round(Math.sin(t / 30) * 2), 21, 3, 3, '#061206'); }
      Pix.line(c, 156, 14, 166, 16, g, 2); Pix.line(c, 178, 16, 188, 14, g, 2);
    }
    const mw = 18 + Math.round(Math.abs(Math.sin(t / 6)) * 10);
    Pix.rect(c, 171 - mw / 2, 36, mw, 3, g); Pix.rect(c, 171 - mw / 2, 39, 2, 2, g); Pix.rect(c, 169 + mw / 2, 39, 2, 2, g);
    for (let y = 12; y < 47; y += 3) Pix.rect(c, 146, y, 50, 1, '#0C240C');
    // its HQ, blinking red
    c.drawImage(Sprites.eagle, 176, 92);
    c.drawImage(Sprites.outline(Sprites.eagle, (t >> 3) & 1 ? '#F83800' : '#A80000'), 175, 91);
    // a gun on the wall firing back
    const tq = t % 60;
    Pix.rect(c, 128, 64, 10, 8, '#3C3C44'); Pix.rect(c, 120, 66, 10, 3, '#7C7C88');
    if (tq < 16) { Pix.line(c, 118 - tq * 6, 67, 118 - tq * 6 - 10, 69, '#F83800', 2); Pix.line(c, 118 - tq * 6, 67, 118 - tq * 6 - 10, 69, '#F8B8A8'); }
    // the players, firing at the HQ: sparks off the steel
    for (const [i, cx, gy, off] of [[0, 46, 128, 0], [1, 92, 122, 45]]) {
      const q = (t + off) % 90, roll = Math.round(Math.sin(t / 35 + i) * 3);
      const m = IA.sideTank(c, cx + roll, gy, Config.playerPal(i), { f: t >> 3, L: 36, recoil: q < 4 ? 2 - (q >> 1) : 0, star: '#F8F8F8', sway: q < 10 ? -2 : Math.sin(t / 10) });
      if (q < 4) IA.flash(c, m.x, m.y, 1, 0, q);
      const travel = (160 - m.x) / 6;
      if (q < travel) IA.shell(c, m.x + q * 6, m.y, 1, 0);
      else if (q < travel + 30) { IA.boom(c, 160, m.y, Math.floor(q - travel), 8, i); IA.sparks(c, 160, m.y, (q - travel) / 30, 10, i + 4); }
    }
  },

  // CUSTOM LEVELS: a blueprint pinned to the desk; the pencil puts the level down tile by tile, picked from the
  // palette beside it; then a tank tries it out and it gets its SAVED stamp
  custom(c, t) {
    const MAP = ['bb.ss.bb.', 'b.......b', '..ww.ff..', '.bbb.bbb.', '..ff.ww..', 'ii.....ii', '...bEb...'];
    const BX = 14, BY = 12, TS = 16;
    c.drawImage(IA.layer('custom', b => {
      IA.paint(b, 0, 0, IPW, IPH, (x, y) => { const g = Math.sin(y * 0.7 + IA.noise(x / 18, y >> 2) * 5) * 0.5 + 0.5, q = bayer(x, y); return g + (q - 0.5) * 0.3 > 0.72 ? '#A06830' : g + (q - 0.5) * 0.3 > 0.3 ? '#885424' : '#6C4018'; });
      // the blueprint, its shadow, its grid, a curled corner
      IA.veil(b, 9, 9, 164, 124, '#2C1808', 0.7);
      Pix.rect(b, 6, 6, 162, 124, '#1C4CA8');
      IA.speckle(b, 6, 6, 162, 124, ['#2454B0', '#1844A0'], 500, 3);
      for (let x = 6; x < 168; x += 4) Pix.rect(b, x, 6, 1, 124, (x - BX) % TS === 0 ? '#5C8CE0' : '#2C5CB8');
      for (let y = 6; y < 130; y += 4) Pix.rect(b, 6, y, 162, 1, (y - BY) % TS === 0 ? '#5C8CE0' : '#2C5CB8');
      for (let k = 0; k < 10; k++) Pix.rect(b, 168 - 10 + k, 130 - 10 + 10 - k, 10 - k, 1, '#885424');
      for (let k = 0; k < 10; k++) Pix.rect(b, 158 + k, 120 + (9 - k), 1, k + 1 > 9 - k ? 1 : 1, '#9CC0F8');
      Pix.line(b, 158, 129, 167, 120, '#3C6CC8');
      for (const [x, y] of [[10, 10], [163, 10], [10, 125]]) { Pix.disc(b, x + 1, y + 1, 2, '#2C1808'); Pix.disc(b, x, y, 2, '#D82800'); Pix.rect(b, x - 1, y - 1, 1, 1, '#F8B8A8'); }
      // the palette window
      Pix.rect(b, 178, 6, 56, 92, '#000000'); Pix.rect(b, 179, 7, 54, 90, '#BCBCBC'); Pix.rect(b, 179, 7, 54, 10, '#0C2C74'); Font.draw(b, 'TILES', 186, 8, '#F8F8F8');
      Pix.rect(b, 180, 18, 52, 78, '#5C5C5C');
      // a mug of tea, a pencil sharpener's shavings, a rubber
      Pix.disc(b, 207, 121, 10, '#4C2C10'); Pix.disc(b, 205, 119, 9, '#E8E8E8'); Pix.disc(b, 205, 119, 7, '#B8B8B8'); Pix.disc(b, 205, 119, 6, '#7C4818'); Pix.disc(b, 203, 117, 2, '#A06830');
      Pix.rect(b, 214, 115, 5, 2, '#E8E8E8'); Pix.rect(b, 217, 115, 2, 7, '#E8E8E8');
      Pix.rect(b, 182, 104, 14, 7, '#F878B8'); Pix.rect(b, 182, 104, 14, 1, '#F8B8D8'); Pix.rect(b, 182, 110, 14, 1, '#B8588C');
    }), 0, 0);
    // tiles going down one by one, the pencil at the next one, the palette lighting the kind
    const tile = (k, x, y) => c.drawImage(IA.layer('ctile' + k + (k === 'w' ? (t >> 3) & 3 : (x + y) % 3), b => {
      if (k === 'b') IA.bricks(b, 0, 0, TS, TS, x + y);
      else if (k === 's') IA.steel(b, 0, 0, TS, TS, 8);
      else if (k === 'w') { Pix.rect(b, 0, 0, TS, TS, '#2038C8'); for (let j = 0; j < 4; j++) Pix.rect(b, (j * 5 + (t >> 3)) % 12, 2 + j * 4, 4, 1, '#7CB8F8'); }
      else if (k === 'f') { Pix.rect(b, 0, 0, TS, TS, '#0C4808'); IA.tree(b, 5, 5, 4, x, ['#88D850', '#3C9C28', '#1C6014', '#0C3008']); IA.tree(b, 11, 10, 4, y, ['#88D850', '#3C9C28', '#1C6014', '#0C3008']); }
      else if (k === 'i') { Pix.rect(b, 0, 0, TS, TS, '#A8D8F8'); Pix.line(b, 2, 12, 12, 2, '#F8F8F8'); Pix.line(b, 6, 14, 14, 6, '#D8F0F8'); }
      else if (k === 'E') IA.eagle(b, -1, -1, 1);
    }, TS, TS), x, y);
    const cells = [];
    MAP.forEach((row, j) => { for (let i = 0; i < row.length; i++) if (row[i] !== '.') cells.push([i, j, row[i]]); });
    const STEP = 7, BUILD = cells.length * STEP, cyc = t % (BUILD + 320), n = Math.min(cells.length, Math.floor(cyc / STEP));
    cells.forEach(([i, j, k], q) => { if (q < n) tile(k, BX + i * TS, BY + j * TS); });
    const kinds = ['b', 's', 'f', 'w', 'i', 'E'], cur = n < cells.length ? cells[n][2] : null;
    kinds.forEach((k, q) => {
      const x = 184 + (q % 2) * 24, y = 22 + (q >> 1) * 24;
      Pix.rect(c, x - 2, y - 2, 20, 20, k === cur ? ((t >> 2) & 1 ? COL.gold : '#F8F8F8') : '#3C3C3C');
      Pix.rect(c, x - 1, y - 1, 18, 18, '#000000');
      tile(k, x, y);
    });
    if (n > 0 && n <= cells.length && cyc % STEP < 3) { const [i, j] = cells[n - 1]; c.strokeStyle = '#F8F8F8'; c.lineWidth = 1; c.strokeRect(BX + i * TS - 0.5, BY + j * TS - 0.5, TS + 1, TS + 1); }
    if (n < cells.length) {
      // the pencil, hopping to the next tile
      const [i, j] = cells[n], f = (cyc % STEP) / STEP, x = BX + i * TS + 10, y = BY + j * TS + 4 - Math.round(Math.sin(f * Math.PI) * 4);
      for (let k = 0; k < 14; k++) { Pix.rect(c, x + k + 1, y - k - 1, 3, 3, '#2C1808'); }
      for (let k = 0; k < 14; k++) { Pix.rect(c, x + k, y - k - 2, 3, 3, k < 3 ? '#F8E8C0' : k < 11 ? '#F8B800' : '#F878B8'); Pix.rect(c, x + k + 2, y - k - 1, 1, 1, k < 3 ? '#C8A878' : k < 11 ? '#C07000' : '#B8588C'); }
      Pix.rect(c, x, y, 2, 1, '#000000'); Pix.rect(c, x + 11, y - 13, 3, 3, '#BCBCBC');
    } else {
      // the test drive up the middle, then the stamp
      const q = cyc - BUILD, ty = Math.max(BY + 8, BY + 6 * TS + 8 - q * 0.8);
      if (q < 140) { c.drawImage(Sprites.tank('p0', (t >> 2) & 1, 0, Config.playerPal(0)), BX + 4 * TS, ty - 8); if (q < 12) c.drawImage(Sprites.shield[(t >> 1) & 1], BX + 4 * TS, BY + 6 * TS); }
      if (q > 110) {
        const sx = 40, sy = 46;
        Pix.rect(c, sx, sy, 96, 26, '#D82800'); Pix.rect(c, sx + 2, sy + 2, 92, 22, '#1C4CA8'); Pix.rect(c, sx + 4, sy + 4, 88, 18, '#D82800'); Pix.rect(c, sx + 5, sy + 5, 86, 16, '#1C4CA8');
        Font.big(c, 'SAVED', sx + 10, sy + 6, 2, '#F83800');
      }
    }
    // steam off the tea
    for (let k = 0; k < 3; k++) { const p = ((t + k * 20) % 60) / 60; Pix.rect(c, 203 + Math.round(Math.sin(p * 6 + k) * 2), 110 - p * 16, 1, 2, p < 0.5 ? '#F8F8F8' : '#BCBCBC'); }
  },

  // GALAXY: deep space, a ringed planet, nebulae; stars streaming past in three layers; the alien formation
  // sways, one dives; your tank flies up at them on its jets, guns blazing
  galaxy(c, t) {
    c.drawImage(IA.layer('galaxy', b => {
      IA.grad(b, 0, 0, IPW, IPH, ['#000008', '#04001C', '#0C0428', '#140830']);
      IA.cloud(b, 60, 50, 60, 26, ['#200C40', '#341458', '#4C2070', '#6C3488'], 2);
      IA.cloud(b, 190, 30, 44, 18, ['#081C34', '#0C2C48', '#14405C', '#1C5C70'], 5);
      Pix.stars(b, 70, 21, 0, IPH, IPW);
      // a spiral galaxy far off
      for (let k = 0; k < 60; k++) { const a = k * 0.35, r = k * 0.28; for (const s of [0, Math.PI]) Pix.rect(b, Math.round(28 + Math.cos(a + s) * r), Math.round(106 + Math.sin(a + s) * r * 0.45), 1, 1, k < 12 ? '#F8F8F8' : k % 3 ? '#9C7CC8' : '#C8A8F8'); }
      // a ringed planet
      GxArt.oval(b, 200, 108, 52, 9, '#C8A070', 140, 0, -1);
      IA.ball(b, 200, 108, 30, 30, ['#F8E0A8', '#E8B068', '#C07840', '#7C4420', '#3C1C08'], (x, y) => Math.sin(y * 0.5) * 0.12);
      for (let k = 0; k < 3; k++) GxArt.oval(b, 200, 108, 50 - k * 2, 8 - k * 0.3, ['#E8C890', '#C8A070', '#A07C50'][k], 160, 0, 1);
      IA.ball(b, 148, 22, 6, 6, ['#F8F8F8', '#C8C8D8', '#9C9CB0', '#6C6C80', '#3C3C50']);
    }), 0, 0);
    // stars streaming down, the nearer the faster
    for (let k = 0; k < 54; k++) {
      const layer = k % 3, sp = [0.4, 1, 2.2][layer], x = Math.floor(IA.hash(k, 1) * IPW), y = (IA.hash(k, 2) * IPH + t * sp) % IPH;
      Pix.rect(c, x, y, 1, layer === 2 ? 3 : 1, ['#5C5C8C', '#A8A8D8', '#F8F8F8'][layer]);
    }
    // the formation, swaying; one of them dives at you and loops back
    const sw = Math.round(Math.sin(t / 30) * 10);
    const rows = [['brute', 5, 18], ['bug', 6, 15], ['drone', 7, 13]];
    rows.forEach(([type, n, gap], row) => {
      for (let k = 0; k < n; k++) {
        const img = GxGfx.get(type, (t >> 3) & 1), x = 120 - (n - 1) * gap / 2 + k * gap + sw, y = 10 + row * 16 + Math.round(Math.sin(t / 12 + k) * 1);
        if (row === 2 && k === 5 && (t % 200) > 40) continue;
        // one shot down now and then
        const q = (t + k * 37 + row * 11) % 160;
        if (q < 30 && (k + row) % 3 === 0) { IA.boom(c, x, y, q, 9, k + row * 7); continue; }
        c.drawImage(img, Math.round(x - img.width / 2), y - (img.height >> 1));
      }
    });
    const dv = t % 200;
    if (dv > 40) { const p = (dv - 40) / 160, img = GxGfx.get('drone', (t >> 2) & 1); c.drawImage(img, Math.round(150 + sw + Math.sin(p * 9) * 30 - 6), Math.round(42 + Math.sin(p * Math.PI) * 70 - 5)); }
    // pick-ups drifting down
    gxDrawPickup(c, 'box', 36, 50 + ((t >> 1) % 60), t, 'spread');
    gxDrawPickup(c, 'coin', 212, 30 + ((t >> 2) % 70), t);
    // you: thrusters, twin guns
    const tx = 120 + Math.round(Math.sin(t / 45) * 40), ty = 112;
    for (const dx of [-5, 4]) { const fl = 3 + ((t >> 1) & 1) * 2 + ((t >> 2) & 1); Pix.rect(c, tx + dx, ty + 13, 2, fl, '#F83800'); Pix.rect(c, tx + dx, ty + 13, 2, fl - 2, '#F8B800'); Pix.rect(c, tx + dx, ty + 13, 2, 1, '#F8F8F8'); }
    IA.topTank(c, tx, ty, 0, Config.playerPal(0), t >> 1, { recoil: (t >> 2) & 1 });
    for (let k = 0; k < 4; k++) { const y = ty - 16 - ((t * 5 + k * 22) % 88); for (const dx of [-1, 1]) { Pix.rect(c, tx + dx * 2 - (dx < 0 ? 1 : 0), y, 1, 6, '#58F8F8'); Pix.rect(c, tx + dx * 2 - (dx < 0 ? 1 : 0), y + 1, 1, 4, '#F8F8F8'); } }
    if ((t >> 1) & 1) IA.flash(c, tx, ty - 15, 0, -1, (t >> 1) & 3);
  },
});
