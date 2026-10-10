'use strict';
// =====================================================================
//  DESERT DOMINION's world art (the ART-WORLD part of the rts contract): everything that isn't a unit, all drawn
//  pixel by pixel on canvases and cached.
//    rtsTileArt(kind, mask, variant, res)   the ground of KHARRA, 16*res square: sand rippled by the wind, rolling
//                                           dunes, dark rock plateaus with cracks and lit rims, jagged mountains, the
//                                           orange glow of the GLIMMER fields (thick ones denser and brighter),
//                                           blooms, craters, laid concrete, rubble; edges blend by the 4-neighbour
//                                           mask (and, if given, the extended mask of rtsWTileMask); any tile meets
//                                           any other without a seam
//    rtsDrawShroud(ctx, x, y, mask, res)    the unexplored dark with a soft dithered edge, over a 16*res cell
//    rtsBuildingArt(key, house, state)      every building in the House's colours (W*16*res x H*16*res, state.res):
//                                           damage, animation, doors, rising from its scaffolding, the white flash of
//                                           a hit; the turrets
//    rtsWallArt(house, mask, res)           wall pieces joined to their neighbours
//    rtsBuildingIcon(key, house)            32 x 24 sidebar pictures (shrunk from the res 2 drawings)
//    rtsWormArt(phase, frame, dir8, res)    the SANDWYRM: its ripple under the sand, bursting up with its ringed
//                                           maw of teeth, swallowing, diving
//    rtsCursorArt(kind, frame)              the mouse pointers (screen space: one size)
//    rtsBloomArt(frame, res), rtsRubbleArt(w, h, seed, res)
//  res (always last, optional) is 1 (16 px a tile, the default) or 2 (32 px a tile). Res 2 isn't res 1 scaled up:
//  the painter draws in the same "logical" pixels at twice the resolution, so every shape lands where it does at
//  res 1, and each piece adds detail at res 2 (hairline edges, rivets, panel seams, vents, ladders, rails, glazing,
//  finer emblems, hydraulic arms, rockets, ribbed domes ...; the ground in its own finer drawing). Each is cached per
//  res. Light comes from the top left everywhere; buildings are seen from above at a slant (roof and south face),
//  with their shadow falling to the lower right; a 1 px dark outline at each res.
// =====================================================================

// ------------------------------------------------------------------ colours
const RTS_W_PAL_FALLBACK = {
  aquila: ['#78B8F8', '#3C78F8', '#1838A0'], drakon: ['#F87858', '#D82800', '#801000'], serpens: ['#88E888', '#38B838', '#186818'],
  regent: ['#C8A0F8', '#9858D8', '#582888'], nomad: ['#E8C898', '#C89858', '#806030'],
};
const RTS_W_HOUSES = ['aquila', 'drakon', 'serpens', 'regent', 'nomad'];
function rtsWHousePal(house) {
  const P = typeof RTS_HOUSE_PAL !== 'undefined' && RTS_HOUSE_PAL ? RTS_HOUSE_PAL : RTS_W_PAL_FALLBACK;
  return P[house] || RTS_W_PAL_FALLBACK[house] || ['#C8C8C8', '#909090', '#585858'];
}
const RTS_W_C = {
  sand: ['#F8D898', '#ECB868', '#DCA052', '#C88840', '#A86C30', '#7C4C1C'],
  rock: ['#C0A890', '#9C8470', '#806854', '#644E3E', '#4A382C', '#2C2018'],
  cliff: ['#B08C6C', '#8C684C', '#6C4C38', '#503628', '#38241A', '#1C100A'],
  glim: ['#FCF0B0', '#F8C040', '#F89020', '#E06010', '#B03C08', '#782008'],
  conc: ['#E0DCD4', '#C4C0B8', '#A8A49C', '#8C8880', '#68645C', '#44403A'],
  metal: ['#F8F0E0', '#D8CCB8', '#B4A894', '#8C8070', '#665C50', '#423A32', '#221C18'],
  glass: ['#C8F0FC', '#78C0E8', '#3878B0', '#1C3C64'],
  hazard: ['#F8C800', '#2C2418'],
  worm: ['#E8C4A4', '#C49478', '#9C6C58', '#744C40', '#4C302C', '#28161A'],
};
const rtsWRGBc = {};
function rtsWRGB(c) {
  if (typeof c !== 'string') return c;
  let v = rtsWRGBc[c];
  if (!v) v = rtsWRGBc[c] = [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
  return v;
}
const rtsWMix = (a, b, t) => { a = rtsWRGB(a); b = rtsWRGB(b); return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; };
const rtsWHex = c => '#' + c.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');

// ------------------------------------------------------------------ hashes and noise (the tiling kind: period 16)
function rtsWHash(x, y, s) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul((s | 0) + 1, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
const RTS_W_BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + 0.5) / 16);
const rtsWBayer = (x, y) => RTS_W_BAYER[(y & 3) * 4 + (x & 3)];
// value noise that wraps every `per` pixels (cell must divide per)
function rtsWPNoise(x, y, cell, s, per = 16) {
  const n = per / cell, fx = x / cell, fy = y / cell, xi = Math.floor(fx), yi = Math.floor(fy);
  let xf = fx - xi, yf = fy - yi;
  xf = xf * xf * (3 - 2 * xf); yf = yf * yf * (3 - 2 * yf);
  const m = v => ((v % n) + n) % n;
  const a = rtsWHash(m(xi), m(yi), s), b = rtsWHash(m(xi + 1), m(yi), s), c = rtsWHash(m(xi), m(yi + 1), s), d = rtsWHash(m(xi + 1), m(yi + 1), s);
  return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf;
}
const rtsWPFbm = (x, y, s) => rtsWPNoise(x, y, 8, s) * 0.5 + rtsWPNoise(x, y, 4, s + 1) * 0.3 + rtsWPNoise(x, y, 2, s + 2) * 0.2;
// free (not wrapping) noise for variant detail inside a tile
function rtsWNoise(x, y, s) {
  const xi = Math.floor(x), yi = Math.floor(y); let xf = x - xi, yf = y - yi;
  xf = xf * xf * (3 - 2 * xf); yf = yf * yf * (3 - 2 * yf);
  const a = rtsWHash(xi, yi, s), b = rtsWHash(xi + 1, yi, s), c = rtsWHash(xi, yi + 1, s), d = rtsWHash(xi + 1, yi + 1, s);
  return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf;
}
// a wrapping 1-d wobble along a tile edge (t in pixels)
const rtsWEdgeN = (t, s) => rtsWPNoise(t, 0.5, 4, s) * 0.6 + rtsWPNoise(t, 0.5, 2, s + 9) * 0.4;
// how far inside the tile (0 at the border, 1 from 4 px in): variant detail fades out towards the borders so any
// variant meets any other without a seam
function rtsWInner(x, y) {
  const d = Math.min(x + 0.5, 15.5 - x, y + 0.5, 15.5 - y);
  const t = Math.max(0, Math.min(1, (d - 1.5) / 3));
  return t * t * (3 - 2 * t);
}
const rtsWSeeded = s => { let v = (s >>> 0) || 1; return () => { v = (Math.imul(v, 1664525) + 1013904223) >>> 0; return v / 4294967296; }; };

// ------------------------------------------------------------------ the painter: an RGBA buffer and the brushes
// new RtsWPaint(w, h, s): a picture w x h in "logical" pixels (the 16-per-tile grid) drawn at s device pixels per
// logical one (s = res: 1 or 2). The brushes take logical coordinates (fractions allowed: at s 2 a half is one
// device pixel) and draw at the device resolution, so curves, lines and dithering come out finer at res 2; q (=
// 1/s) is one device pixel in logical units, for hairlines. this.w / this.h and dpx/get/on/shade/tint/outline/
// shadow/stamp work in device pixels. At s 1 every brush draws exactly as it always did.
class RtsWPaint {
  constructor(w, h, s = 1) {
    this.s = s; this.q = 1 / s; this.lw = w; this.lh = h;
    this.w = Math.round(w * s); this.h = Math.round(h * s); this.d = new Uint8ClampedArray(this.w * this.h * 4);
  }
  in(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h; }
  // a device pixel (alpha a blends over what's there)
  dpx(x, y, c, a = 1) {
    x |= 0; y |= 0;
    if (!c || x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const v = rtsWRGB(c), i = (y * this.w + x) * 4, d = this.d;
    if (a >= 1) { d[i] = v[0]; d[i + 1] = v[1]; d[i + 2] = v[2]; d[i + 3] = 255; return; }
    if (a <= 0) return;
    const da = d[i + 3] / 255, oa = a + da * (1 - a);
    if (oa <= 0) return;
    for (let k = 0; k < 3; k++) d[i + k] = (v[k] * a + d[i + k] * da * (1 - a)) / oa;
    d[i + 3] = oa * 255;
  }
  // a logical pixel (s x s device pixels)
  px(x, y, c, a = 1) {
    const s = this.s;
    if (s === 1) { this.dpx(x, y, c, a); return; }
    const X = Math.floor(x * s + 1e-6), Y = Math.floor(y * s + 1e-6);
    for (let j = 0; j < s; j++) for (let i = 0; i < s; i++) this.dpx(X + i, Y + j, c, a);
  }
  // one device pixel at a logical position
  fp(x, y, c, a = 1) { if (this.s === 1) this.dpx(x, y, c, a); else this.dpx(Math.floor(x * this.s + 1e-6), Math.floor(y * this.s + 1e-6), c, a); }
  get(x, y) { if (!this.in(x, y)) return null; const i = (y * this.w + x) * 4, d = this.d; return [d[i], d[i + 1], d[i + 2], d[i + 3]]; }
  on(x, y) { return this.in(x, y) && this.d[(y * this.w + x) * 4 + 3] > 0; }
  alpha(x, y) { return this.in(x, y) ? this.d[(y * this.w + x) * 4 + 3] : 0; }
  rect(x, y, w, h, c, a) {
    const s = this.s;
    if (s === 1) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.dpx(i, j, c, a); return; }
    const X0 = Math.round(x * s), Y0 = Math.round(y * s), X1 = Math.round((x + w) * s), Y1 = Math.round((y + h) * s);
    for (let j = Y0; j < Y1; j++) for (let i = X0; i < X1; i++) this.dpx(i, j, c, a);
  }
  clear(x, y, w, h) {
    const s = this.s, X0 = Math.round(x * s), Y0 = Math.round(y * s), X1 = Math.round((x + w) * s), Y1 = Math.round((y + h) * s);
    for (let j = Y0; j < Y1; j++) for (let i = X0; i < X1; i++) if (this.in(i, j)) this.d.fill(0, (j * this.w + i) * 4, (j * this.w + i) * 4 + 4);
  }
  frame(x, y, w, h, c, t = 1) { this.rect(x, y, w, t, c); this.rect(x, y + h - t, w, t, c); this.rect(x, y, t, h, c); this.rect(x + w - t, y, t, h, c); }
  // a hairline frame (one device pixel)
  fframe(x, y, w, h, c) { this.frame(x, y, w, h, c, this.q); }
  fill(x, y, w, h, fn) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) { const c = fn(i, j); if (c) this.px(i, j, c); } }
  // paint every device pixel of the logical box [x0, x1) x [y0, y1): fn(x, y, X, Y) gets the pixel's logical
  // position (at s 1 just the pixel; at s 2 its centre less a half) and its device one, and returns a colour or nothing
  each(x0, y0, x1, y1, fn) {
    const s = this.s;
    for (let Y = Math.floor(y0 * s); Y < Math.ceil(y1 * s - 1e-9); Y++) for (let X = Math.floor(x0 * s); X < Math.ceil(x1 * s - 1e-9); X++) {
      const c = fn(s === 1 ? X : (X + 0.5) / s - 0.5, s === 1 ? Y : (Y + 0.5) / s - 0.5, X, Y);
      if (c) this.dpx(X, Y, c);
    }
  }
  disc(cx, cy, r, c, a) {
    const s = this.s;
    if (s === 1) { for (let y = Math.floor(cy - r); y <= cy + r; y++) for (let x = Math.floor(cx - r); x <= cx + r; x++) if ((x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <= r * r) this.dpx(x, y, c, a); return; }
    for (let Y = Math.floor((cy - r) * s); Y <= (cy + r) * s; Y++) for (let X = Math.floor((cx - r) * s); X <= (cx + r) * s; X++) if (((X + 0.5) / s - cx) ** 2 + ((Y + 0.5) / s - cy) ** 2 <= r * r) this.dpx(X, Y, c, a);
  }
  ell(cx, cy, rx, ry, c, a) {
    const s = this.s;
    if (s === 1) { for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) if (((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1) this.dpx(x, y, c, a); return; }
    for (let Y = Math.floor((cy - ry) * s); Y <= (cy + ry) * s; Y++) for (let X = Math.floor((cx - rx) * s); X <= (cx + rx) * s; X++) if ((((X + 0.5) / s - cx) / rx) ** 2 + (((Y + 0.5) / s - cy) / ry) ** 2 <= 1) this.dpx(X, Y, c, a);
  }
  // a device-pixel Bresenham line, each point a w x w block
  dline(x0, y0, x1, y1, c, a, w = 1) {
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let e = dx + dy;
    for (;;) {
      if (w === 1) this.dpx(x0, y0, c, a); else for (let j = 0; j < w; j++) for (let i = 0; i < w; i++) this.dpx(x0 + i, y0 + j, c, a);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; }
    }
  }
  // a line one logical pixel wide
  line(x0, y0, x1, y1, c, a) {
    const s = this.s;
    if (s === 1) { this.dline(Math.round(x0), Math.round(y0), Math.round(x1), Math.round(y1), c, a); return; }
    this.dline(Math.round(x0 * s), Math.round(y0 * s), Math.round(x1 * s), Math.round(y1 * s), c, a, s);
  }
  // a hairline (one device pixel wide)
  fline(x0, y0, x1, y1, c, a) {
    const s = this.s;
    if (s === 1) { this.line(x0, y0, x1, y1, c, a); return; }
    this.dline(Math.floor(x0 * s + 1e-6), Math.floor(y0 * s + 1e-6), Math.floor(x1 * s + 1e-6), Math.floor(y1 * s + 1e-6), c, a);
  }
  poly(pts, c, a) {
    const s = this.s;
    let y0 = Infinity, y1 = -Infinity;
    for (const p of pts) { y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
    for (let Y = Math.floor(y0 * s); Y <= y1 * s; Y++) {
      const yc = (Y + 0.5) / s, xs = [];
      for (let i = 0; i < pts.length; i++) {
        const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length];
        if ((ay <= yc && by > yc) || (by <= yc && ay > yc)) xs.push(ax + (yc - ay) / (by - ay) * (bx - ax));
      }
      xs.sort((p, q) => p - q);
      for (let k = 0; k + 1 < xs.length; k += 2) for (let X = Math.round(xs[k] * s); X < Math.round(xs[k + 1] * s); X++) this.dpx(X, Y, c, a);
    }
  }
  // darken (f < 1) or lighten (f > 1) what's there (device pixels)
  shade(x, y, f) { if (!this.on(x, y)) return; const i = (y * this.w + x) * 4; for (let k = 0; k < 3; k++) this.d[i + k] = this.d[i + k] * f; }
  shadeRect(x, y, w, h, f) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.shade(i, j, f); }
  // the same over a logical rectangle
  lshade(x, y, w, h, f) { const s = this.s; this.shadeRect(Math.round(x * s), Math.round(y * s), Math.round((x + w) * s) - Math.round(x * s), Math.round((y + h) * s) - Math.round(y * s), f); }
  tint(x, y, c, a) { if (!this.on(x, y)) return; const v = rtsWRGB(c), i = (y * this.w + x) * 4; for (let k = 0; k < 3; k++) this.d[i + k] += (v[k] - this.d[i + k]) * a; }
  ltint(x, y, w, h, c, a) { const s = this.s; for (let j = Math.round(y * s); j < Math.round((y + h) * s); j++) for (let i = Math.round(x * s); i < Math.round((x + w) * s); i++) this.tint(i, j, c, a); }
  // a dark outline round everything drawn (into the empty pixels next to it)
  outline(c, a = 1) {
    const w = this.w, h = this.h, m = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (!this.on(x, y) && (this.on(x - 1, y) || this.on(x + 1, y) || this.on(x, y - 1) || this.on(x, y + 1))) m[y * w + x] = 1;
    for (let i = 0; i < w * h; i++) if (m[i]) this.dpx(i % w, (i / w) | 0, c, a);
  }
  // the shadow the drawing casts to the lower right (into empty pixels; device offsets); soft: its far edge dithered
  shadow(dx, dy, a = 0.38, soft = 0) {
    const w = this.w, h = this.h, m = new Float32Array(w * h), mk = Math.max(dx, dy);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (this.on(x, y)) continue;
      for (let k = 1; k <= mk; k++) if (this.on(x - Math.min(k, dx), y - Math.min(k, dy))) { m[y * w + x] = soft && k > mk - soft ? 0.6 : 1; break; }
    }
    for (let i = 0; i < w * h; i++) if (m[i]) {
      const j = i * 4;
      if (m[i] < 1 && rtsWBayer(i % w, (i / w) | 0) > 0.5) continue;
      this.d[j] = this.d[j + 1] = this.d[j + 2] = 0; this.d[j + 3] = a * 255;
    }
  }
  // stamp another painter at device x,y
  stamp(src, x, y) { for (let j = 0; j < src.h; j++) for (let i = 0; i < src.w; i++) { const p = src.get(i, j); if (p[3]) this.dpx(x + i, y + j, p, p[3] / 255); } }
  canvas() {
    const c = makeCanvas(this.w, this.h), g = c.getContext('2d'), im = g.createImageData(this.w, this.h);
    im.data.set(this.d); g.putImageData(im, 0, 0); return c;
  }
}
// read a canvas back into a painter (s: its scale)
function rtsWFromCanvas(c, s = 1) {
  const P = new RtsWPaint(c.width / s, c.height / s, s);
  P.d.set(c.getContext('2d').getImageData(0, 0, c.width, c.height).data);
  return P;
}
// the resolution asked for: 2 for 2 (and anything over 1.5), else 1
const rtsWRes = r => (+r >= 1.5 ? 2 : 1);

// ------------------------------------------------------------------ terrain
const RTS_W_FAM = [0, 0, 1, 2, 3, 3, 0, 1, 0, 1, 1];   // kind -> family: 0 sand, 1 rock, 2 cliff, 3 glimmer
const RTS_W_SIDES = [[0, -1], [1, 0], [0, 1], [-1, 0]];  // up right down left (mask bits 1 2 4 8)
const RTS_W_DIAG = [[1, -1], [1, 1], [-1, 1], [-1, -1]]; // up-right down-right down-left up-left (bits 256..2048)
// the full mask for a tile of a map (t: kinds, w, h): bits 0-3 same family (the contract's mask); bits 4-7 a side
// whose neighbour is "special" (rock: a cliff there, so the rock runs on under its foot; cliff: rock there, so the
// foot stands on rock not sand; dunes: dunes there; thick glimmer: thick there; light glimmer: thick there);
// bits 8-11 the diagonals of the same family; bit 12 says these extra bits are given. CORE may pass this (better
// corners and joins) or just bits 0-3.
function rtsWTileMask(t, w, h, x, y) {
  const at = (i, j) => (i < 0 || j < 0 || i >= w || j >= h ? t[Math.min(h - 1, Math.max(0, j)) * w + Math.min(w - 1, Math.max(0, i))] : t[j * w + i]);
  const k = at(x, y), f = RTS_W_FAM[k] | 0;
  let m = 0x1000;
  RTS_W_SIDES.forEach(([dx, dy], b) => {
    const n = at(x + dx, y + dy), nf = RTS_W_FAM[n] | 0;
    if (nf === f) m |= 1 << b;
    const sp = f === 1 ? n === 3 : f === 2 ? nf === 1 : k === 1 ? n === 1 : f === 3 ? n === 5 : false;
    if (sp) m |= 16 << b;
  });
  RTS_W_DIAG.forEach(([dx, dy], b) => { const n = at(x + dx, y + dy); if ((RTS_W_FAM[n] | 0) === f || (f === 1 && n === 3)) m |= 256 << b; });
  return m;
}
const RTS_W_TILE_CACHE = new Map();

// the sand anywhere (the same at the borders of every tile so they all join): ripples the wind laid (a dark line
// with its lit crest above), pale and dark grains, broad patches; inner detail (v) for variety
function rtsWSandPx(x, y, v, inner) {
  // (the variant's own noise only inside the tile, a wrapping one at its borders: so any tile meets any other)
  const iw = rtsWInner(x, y);
  const S = RTS_W_C.sand, n = rtsWPFbm(x, y, 11) * 0.4 + (rtsWPNoise(x, y, 4, 15) * (1 - iw) + rtsWNoise(x / 3 + v * 11.3, y / 3, 15 + v) * iw) * 0.6;
  let lv = 2 + (n - 0.5) * 1.3;
  if (inner > 0 && v) lv += (rtsWNoise(x / 4 + v * 7.3, y / 4, 40 + v) - 0.5) * 1.6 * inner;
  const wob = 1.4 * Math.sin(Math.PI * 2 * x / 16 + 1.3) + 0.8 * Math.sin(Math.PI * 4 * x / 16 + 0.4) + (rtsWPNoise(x, y, 4, 12) - 0.5) * 2.2
    + rtsWInner(x, y) * (rtsWNoise(x / 5 + v * 3.7, y / 6, 14 + v) - 0.5) * 7;
  const r = (((y + wob) % 8) + 8) % 8, h = rtsWHash(x, y, 13 + (iw > 0.5 ? v : 0));
  let i = Math.round(lv + (rtsWBayer(x, y) - 0.5) * 0.55);
  if (r < 1 && h > 0.22) i = Math.max(i + 1, 3);
  else if (r >= 7 && h > 0.5) i = Math.min(i - 1, 1);
  if (h < 0.018) i = 4; else if (h > 0.99) i = 0;
  return S[Math.max(0, Math.min(5, i))];
}
// a stone or two (variant inner detail on rock)
function rtsWPebbles(P, v, seed, ok, pal) {
  const R = rtsWSeeded(seed * 97 + v * 13 + 5), n = 1 + Math.floor(R() * 2);
  for (let k = 0; k < n; k++) {
    const x = 4 + Math.floor(R() * 8), y = 4 + Math.floor(R() * 8);
    if (!ok(x, y)) continue;
    P.px(x, y, pal[1]); P.px(x + 1, y, pal[2]); P.px(x + 1, y + 1, pal[4]); P.px(x + 2, y + 1, pal[5]);
  }
}

// edge geometry: an sdf (< 0 inside our material) from the sides this tile's family lacks; the edge wobbles the
// same way all along a side (so neighbours with the same open side join), and corners are rounded by R
function rtsWEdgeSdf(x, y, open, depth, wob, seed, R) {
  const qs = [], px = x + 0.5, py = y + 0.5;
  for (let b = 0; b < 4; b++) {
    if (!open[b]) continue;
    const along = b === 0 || b === 2 ? x : y, dist = b === 0 ? py : b === 1 ? 16 - px : b === 2 ? 16 - py : px;
    qs.push(depth + (rtsWEdgeN(along, seed + (b & 1) * 5) - 0.5) * 2 * wob - dist + R);
  }
  if (!qs.length) return -99;
  let l2 = 0, mx = -99;
  for (const q of qs) { if (q > 0) l2 += q * q; mx = Math.max(mx, q); }
  return Math.sqrt(l2) + Math.min(mx, 0) - R;
}
// a 45-degree edge across corner c (0 up-right, 1 down-right, 2 down-left, 3 up-left) where the region's edge runs
// diagonally (both sides there open, the two diagonals beside them filled: known only from the extended mask); it
// meets the neighbours' inner-corner notches of radius d at the tile's sides
function rtsWDiagSdf(x, y, c, d, wob, seed) {
  const px = x + 0.5, py = y + 0.5;
  const t = c === 0 ? 16 - px + py : c === 1 ? 32 - px - py : c === 2 ? px + 16 - py : px + py;
  const u = c === 0 || c === 2 ? (px + py) / 32 : (px - py + 16) / 32;
  return (16 + d - t) / 1.414 + (rtsWNoise(u * 6, c, seed) - 0.5) * 2 * wob * Math.sin(Math.PI * Math.max(0, Math.min(1, u)));
}
// the shape of a region's tile: straight (wobbling) edges, rounded or diagonal outer corners, inner notches
function rtsWShape(open, ext, diag, depth, wob, seed, R) {
  const corners = [0, 1, 2, 3].map(b => !open[b] && !open[(b + 1) & 3] && !diag(b));
  const cuts = [0, 1, 2, 3].map(c => ext && open[c] && open[(c + 1) & 3] && !open[(c + 2) & 3] && !open[(c + 3) & 3] && diag((c + 1) & 3) && diag((c + 3) & 3));
  const ci = cuts.indexOf(true);
  return (x, y) => Math.max(ci >= 0 ? rtsWDiagSdf(x, y, ci, depth + 0.4, wob * 0.6, seed) : rtsWEdgeSdf(x, y, open, depth, wob, seed, R), rtsWCornerSdf(x, y, corners, depth));
}
// inner corners (both sides there, the diagonal not): a rounded notch
function rtsWCornerSdf(x, y, corners, depth) {
  let s = -99;
  const C = [[16, 0], [16, 16], [0, 16], [0, 0]];
  for (let b = 0; b < 4; b++) if (corners[b]) s = Math.max(s, depth + 0.4 - Math.hypot(x + 0.5 - C[b][0], y + 0.5 - C[b][1]));
  return s;
}
// terraces of a height field, lit from the top left: the level's tone, a lit lip where the ground steps up towards
// the lower right, a dark rim where it falls away, shade under a ledge
function rtsWTerrace(pal, L, x, y, tone) {
  const l = L(x, y), dn = L(x + 1, y + 1), up = L(x - 1, y - 1);
  if (dn > l) return pal[l + 1 < dn ? 0 : 1];
  if (dn < l) return pal[Math.min(pal.length - 1, 4 + (l - dn > 1 ? 1 : 0))];
  if (up > l) return pal[Math.min(pal.length - 1, tone(l) + 1)];
  return pal[tone(l)];
}

// a material shaded from a height field's slope (light from the top left), dithered into the palette
function rtsWLit(pal, base, slope, x, y) {
  return pal[Math.max(0, Math.min(pal.length - 1, Math.round(base - slope + (rtsWBayer(x, y) - 0.5) * 0.85)))];
}

function rtsWTileBuild(kind, mask, v) {
  const P = new RtsWPaint(16, 16), fam = RTS_W_FAM[kind] | 0, ext = (mask & 0x1000) !== 0;
  const same = b => (mask >> b) & 1, spec = b => ext && ((mask >> (4 + b)) & 1), diag = b => (ext ? (mask >> (8 + b)) & 1 : 1);
  const sand = (x, y) => rtsWSandPx(x, y, v, 0);
  const innerSand = (x, y) => rtsWSandPx(x, y, v, rtsWInner(x, y));

  if (fam === 0) {
    // ---------------------------------------------------------------- sand, dunes, bloom, sand crater
    if (kind === 1) {
      // dunes: diagonal ridges, a long windward slope lit from the top left, a sharp crest, the lee in shade;
      // they flatten out towards sides the extended mask says aren't dunes
      const open = [0, 1, 2, 3].map(b => ext && !spec(b));
      const amp = (x, y) => {
        let a = 1;
        for (let b = 0; b < 4; b++) if (open[b]) {
          const dist = b === 0 ? y + 0.5 : b === 1 ? 15.5 - x : b === 2 ? 15.5 - y : x + 0.5;
          const e = 6 + (rtsWEdgeN(b === 0 || b === 2 ? x : y, 61 + (b & 1)) - 0.5) * 6;
          a = Math.min(a, Math.max(0, Math.min(1, dist / Math.max(1, e))));
        }
        return a * a * (3 - 2 * a);
      };
      const height = (x, y) => {
        const wv = rtsWInner(x, y), u0 = y + x + 2.6 * Math.sin(Math.PI * 2 * x / 16 + 0.6) + 1.6 * Math.sin(Math.PI * 2 * y / 16 + 2.1);
        const u = u0 + wv * (rtsWNoise(x / 6 + v * 3.1, y / 6, 50 + v) - 0.5) * 6;
        const p = ((u % 16) + 16) % 16;
        return (p < 11 ? p / 11 : (16 - p) / 5) * amp(x, y);
      };
      const S = RTS_W_C.sand;
      for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
        const a = amp(x, y), sl = (height(x + 1, y + 1) - height(x - 1, y - 1)) * 2.2;
        let i = S.indexOf(sand(x, y));
        if (a > 0) i = Math.round(i - sl * 1.3 + (height(x, y) - 0.5 * a) * 0.5 + (rtsWBayer(x, y) - 0.5) * 0.7 * a);
        P.px(x, y, S[Math.max(0, Math.min(5, i))]);
      }
      return P;
    }
    P.fill(0, 0, 16, 16, innerSand);
    if (kind === 6) P.stamp(rtsWBloomPaint(0, v), 0, 0);
    if (kind === 8) rtsWCraterSand(P, v);
    return P;
  }

  if (fam === 3) {
    // ---------------------------------------------------------------- glimmer: the orange glow in the sand
    const thick = kind === 5, G = RTS_W_C.glim;
    const open = [0, 1, 2, 3].map(b => !same(b));
    const corners = [0, 1, 2, 3].map(b => same(b) && same((b + 1) & 3) && !diag(b));
    // thick fields thin out towards light ones (when the extended mask says which neighbours are thick)
    const thickOpen = [0, 1, 2, 3].map(b => thick && ext && same(b) && !spec(b));
    const fade = (x, y, which, w0) => {
      let q = [];
      for (let b = 0; b < 4; b++) {
        if (!which[b]) continue;
        const dist = b === 0 ? y + 0.5 : b === 1 ? 15.5 - x : b === 2 ? 15.5 - y : x + 0.5, along = b === 0 || b === 2 ? x : y;
        q.push((w0 + (rtsWEdgeN(along, 31 + (b & 1) * 3) - 0.5) * 6) - dist);
      }
      let l2 = 0, mx = -99;
      for (const v2 of q) { if (v2 > 0) l2 += v2 * v2; mx = Math.max(mx, v2); }
      const s = q.length ? Math.sqrt(l2) + Math.min(mx, 0) : -99;     // > 0 inside the fading band
      return Math.max(0, Math.min(1, 1 - s / w0));
    };
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const inn = rtsWInner(x, y);
      // tk: 1 in a thick field, 0 where it meets a light one (both then the same at the border)
      const tk = thick ? fade(x, y, thickOpen, 6) : 0, tkk = tk >= 0.5;
      let d = 0.58 + 0.22 * tk + (rtsWPFbm(x, y, 21) - 0.5) * 0.6 + ((rtsWPNoise(x, y, 2, 22) - 0.5) * (1 - inn) + (rtsWNoise(x / 1.8 + v * 3.3, y / 1.8, 22 + v) - 0.5) * inn) * 0.4;
      if (inn > 0) d += inn * (rtsWNoise(x / 3.5 + v * 5.3, y / 3.5, 70 + v) - 0.5) * 0.45;
      let e = fade(x, y, open, 7);
      for (let b = 0; b < 4; b++) if (corners[b]) {
        const C = [[16, 0], [16, 16], [0, 16], [0, 0]][b], dd = Math.hypot(x + 0.5 - C[0], y + 0.5 - C[1]);
        e = Math.min(e, Math.max(0, Math.min(1, dd / 7)));
      }
      d *= e;
      const s = d + (rtsWBayer(x, y) - 0.5) * 0.3, h = rtsWHash(x, y, 23 + v);
      let c = sand(x, y);
      if (tkk) {
        if (s > 0.22) c = rtsWMix(c, '#C05820', 0.55);
        if (s > 0.42) c = G[4];
        if (s > 0.58) c = G[3];
        if (s > 0.74) c = G[2];
        if (s > 0.9) c = G[1];
      } else {
        if (s > 0.25) c = rtsWMix(c, '#D87830', 0.45);
        if (s > 0.5) c = G[3];
        if (s > 0.68) c = G[2];
        if (s > 0.86) c = G[1];
      }
      // grains catching the light (and their shade below right)
      if (d > 0.15 && h < d * (tkk ? 0.2 : 0.12)) c = G[h < d * 0.05 ? 0 : 1];
      else if (d > 0.3 && rtsWHash(x - 1, y - 1, 23 + v) < d * 0.12) c = G[tkk ? 5 : 4];
      P.px(x, y, c);
    }
    return P;
  }

  if (fam === 1) {
    // ---------------------------------------------------------------- rock (and concrete, rock craters, rubble)
    const R = RTS_W_C.rock;
    const open = [0, 1, 2, 3].map(b => !same(b) && !spec(b));
    const sdf = rtsWShape(open, ext, diag, 3.4, 1.6, 41, 6);
    const L = (x, y) => {
      const inn = rtsWInner(x, y);
      let h = rtsWPFbm(x, y, 43) * 0.33 + (rtsWPNoise(x, y, 4, 47) * (1 - inn) + rtsWNoise(x / 3.2 + v * 9.1, y / 3.2, 47 + v) * inn) * 0.55
        + (rtsWPNoise(x, y, 2, 48) * (1 - inn) + rtsWNoise(x / 1.4 + v * 5.3, y / 1.4, 48 + v) * inn) * 0.12;
      if (inn > 0) h += inn * (rtsWNoise(x / 4.5 + v * 4.7, y / 4.5, 80 + v) - 0.5) * 0.35;
      return Math.max(0, Math.min(3, Math.floor(h * 4.4 - 0.4)));
    };
    const tone = l => [3, 2, 2, 1][l];
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const s = sdf(x, y);
      if (s > 0) {
        // beyond the rim: the plateau's side face (deeper at the south), then its shadow on the sand
        P.px(x, y, sand(x, y));
        if (sdf(x, y - 1) <= 0) P.px(x, y, (x & 1) ? R[4] : R[5]);
        else if (sdf(x, y - 2) <= 0 && sdf(x - 1, y - 2) <= 0) P.px(x, y, R[5]);
        else if (sdf(x - 1, y) <= 0) P.px(x, y, R[5]);
        else if (sdf(x - 1, y - 1) <= 0 || sdf(x - 2, y - 2) <= 0 || sdf(x - 1, y - 3) <= 0 || sdf(x - 2, y - 3) <= 0) P.shade(x, y, 0.62);
        continue;
      }
      let c = rtsWTerrace(R, L, x, y, tone);
      // the rim: lit where it faces the light, dark where it doesn't
      if (sdf(x - 1, y) > 0 || sdf(x, y - 1) > 0) c = R[0];
      else if (sdf(x + 1, y) > 0 || sdf(x, y + 1) > 0) c = R[4];
      const h = rtsWHash(x, y, 46 + v);
      if (h < 0.03) c = R[4]; else if (h > 0.975) c = R[0];
      P.px(x, y, c);
    }
    if (v === 3) rtsWPebbles(P, v, kind + 20, (x, y) => sdf(x, y) < -2 && sdf(x + 2, y + 1) < -2, R);
    if (kind === 7) rtsWConcrete(P, open, v);
    if (kind === 9) rtsWCraterRock(P, v, sdf);
    if (kind === 10) rtsWRubbleTile(P, v, sdf);
    return P;
  }

  // ------------------------------------------------------------------ cliffs: the mountains, jagged and dark
  const C = RTS_W_C.cliff, R = RTS_W_C.rock;
  const open = [0, 1, 2, 3].map(b => !same(b)), onRock = [0, 1, 2, 3].map(b => spec(b));
  const sdf = rtsWShape(open, ext, diag, 3.4, 2.2, 51, 6);
  // the top surface stands back from the south edge by the height of the face
  const FACE = 4;
  const top = (x, y) => (open[2] ? sdf(x, y + FACE) : sdf(x, y));
  // crags: Voronoi cells, each a jagged mound (distance to the cell's edge), rising away from the massif's edges;
  // the points on the tile's borders are the same for every tile (so the crags there join up), the inner ones
  // differ by variant
  const cells = rtsWCragPts(v);
  const H = (x, y) => {
    const s = top(x, y), px = x + 0.5, py = y + 0.5;
    let f1 = 99, f2 = 99;
    for (const [qx, qy] of cells) { const d = Math.hypot(px - qx, py - qy); if (d < f1) { f2 = f1; f1 = d; } else if (d < f2) f2 = d; }
    const inn = rtsWInner(x, y), n54 = rtsWPNoise(x, y, 4, 54) * (1 - inn) + rtsWNoise(x / 3 + v * 6.1, y / 3, 54 + v) * inn;
    const n52 = rtsWPNoise(x, y, 2, 52) * (1 - inn) + rtsWNoise(x / 1.5 + v * 2.9, y / 1.5, 52 + v) * inn;
    return Math.min(1, Math.max(0, -s) / 4) * 1.2 + Math.min(4, f2 - f1) * 0.4 + (1 - Math.abs(n54 - 0.5) * 2) * 1.1 + n52 * 0.3 - (f2 - f1 < 0.7 ? 0.9 : 0);
  };

  // the ground at the foot: sand, or rock when the extended mask says so (the nearest open side decides)
  const footRock = (x, y) => {
    let best = -1, bd = 99;
    for (let b = 0; b < 4; b++) {
      if (!open[b]) continue;
      const dist = b === 0 ? y + 0.5 : b === 1 ? 15.5 - x : b === 2 ? 15.5 - y : x + 0.5;
      if (dist < bd) { bd = dist; best = b; }
    }
    return best >= 0 ? onRock[best] : ext;   // (an inner corner's notch: mountains stand on rock)
  };
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const s = sdf(x, y);
    if (s > 0) {
      if (footRock(x, y)) P.px(x, y, rtsWTerrace(R, () => 1, x, y, () => 2));
      else P.px(x, y, sand(x, y));
      // scree at the foot, and the mountain's shadow
      if (s < 1.6 && rtsWHash(x, y, 56 + v) < 0.4) P.px(x, y, C[rtsWHash(x, y, 57) < 0.5 ? 3 : 5]);
      if (sdf(x - 1, y - 1) <= 0 || sdf(x - 2, y - 2) <= 0 || sdf(x - 1, y - 2) <= 0 || sdf(x - 2, y - 1) <= 0 || sdf(x - 3, y - 3) <= 0) P.shade(x, y, 0.55);
      continue;
    }
    let c;
    if (top(x, y) > 0) {
      // the south face: strata in irregular vertical runs, darker towards its foot
      const depth = top(x, y), st = rtsWHash(x, (y + Math.floor(rtsWHash(x, 0, 58) * 4)) >> 2, 58);
      c = C[st < 0.28 ? 5 : st > 0.82 && depth < 2.5 ? 2 : depth > 2.6 ? 4 : 3];
      if (top(x - 1, y) <= 0 && depth < 1.2) c = C[2];
    } else {
      const h = H(x, y), sl = H(x + 1, y + 1) - H(x - 1, y - 1);
      c = rtsWLit(C, 3.1 - (h - 1.7) * 0.9, sl * 2.2, x, y);
      if (sdf(x - 1, y) > 0 || sdf(x, y - 1) > 0) c = C[1];
      else if (sdf(x + 1, y) > 0) c = C[5];
      else if (top(x, y + 1) > 0) c = C[open[2] ? 1 : 5];
      const q = rtsWHash(x, y, 59 + v);
      if (q < 0.03) c = C[5];
    }
    P.px(x, y, c);
  }
  return P;
}

// the crags' cell centres for a variant: shared points on the borders (with their copies one tile over), inner
// points of its own
const RTS_W_CRAGS = [];
function rtsWCragPts(v) {
  if (RTS_W_CRAGS[v]) return RTS_W_CRAGS[v];
  // an irregular set repeating every 16 px (so the borders join), and an inner point of the variant's own in place
  // of the middle one
  const base = [[0.5, 0.5], [9, 1.5], [3.5, 7], [12.5, 9], [6, 13]], pts = [];
  // (the variant's own points kept well inside, so the borders are the same for every variant)
  const R = rtsWSeeded(v * 131 + 17), mid = [6.5 + R() * 3, 6.5 + R() * 3];
  base.forEach(([x, y]) => { for (let ox = -16; ox <= 16; ox += 16) for (let oy = -16; oy <= 16; oy += 16) pts.push([x + ox, y + oy]); });
  pts.push(mid);
  if (v & 1) pts.push([Math.min(10, mid[0] + 2.5), Math.max(5.5, mid[1] - 2)]);
  return (RTS_W_CRAGS[v] = pts);
}

function rtsWCraterSand(P, v) {
  const S = RTS_W_C.sand, cx = 8 + (v & 1 ? 1 : -0.5), cy = 8 + (v & 2 ? 0.5 : -0.5), r = 4.6 + (v % 3) * 0.6;
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const dx = x + 0.5 - cx, dy = y + 0.5 - cy, d = Math.hypot(dx, dy) / r;
    if (d > 1.6) continue;
    const n = rtsWHash(x, y, 60 + v);
    if (d < 1) {
      // the dish: shade on the inner top-left wall, light on the lower right
      const side = (dx + dy) / (r * 1.4);
      let i = d < 0.45 ? 4 : side < -0.15 ? 4 : side > 0.35 ? 1 : 3;
      if (d < 0.45 && n < 0.4) i = 5;
      P.px(x, y, S[i]);
    } else if (d < 1.25) {
      // the thrown-up rim, pale, and scorch
      P.px(x, y, n < 0.3 ? S[4] : (dx + dy) < 0 ? S[0] : S[1]);
    } else if (n < 0.28) P.px(x, y, n < 0.12 ? S[5] : S[4]);
  }
}
function rtsWCraterRock(P, v, sdf) {
  const R = RTS_W_C.rock, cx = 8 + (v & 1 ? 0.5 : -0.5), cy = 8 + (v & 2 ? 0.5 : -0.5), r = 4.2 + (v % 3) * 0.5;
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    if (sdf(x, y) > -0.5) continue;
    const dx = x + 0.5 - cx, dy = y + 0.5 - cy, a = Math.atan2(dy, dx), rr = r * (0.85 + 0.3 * rtsWHash(Math.round((a + 4) * 3), v, 63)), d = Math.hypot(dx, dy) / rr;
    if (d > 1.7) continue;
    const n = rtsWHash(x, y, 64 + v);
    if (d < 1) {
      const side = (dx + dy) / (rr * 1.4);
      P.px(x, y, d < 0.4 ? '#140C08' : side < -0.1 ? R[5] : side > 0.35 ? R[2] : R[4]);
    } else if (d < 1.3) P.px(x, y, (dx + dy) < 0 ? R[0] : n < 0.4 ? R[5] : R[1]);
    else if (n < 0.3) P.px(x, y, '#241810');
  }
}
function rtsWRubbleTile(P, v, sdf) {
  const M = RTS_W_C.conc, R = rtsWSeeded(v * 71 + 9);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if (sdf(x, y) < -1 && rtsWHash(x, y, 70 + v) < 0.35) P.shade(x, y, 0.6);
  for (let k = 0; k < 6; k++) {
    const x = 2 + Math.floor(R() * 11), y = 2 + Math.floor(R() * 11), w = 2 + Math.floor(R() * 3), h = 1 + Math.floor(R() * 2);
    if (sdf(x, y) > -1 || sdf(x + w, y + h) > -1) continue;
    P.rect(x, y, w, h, M[2]); P.rect(x, y, w, 1, M[0]); P.rect(x + w - 1, y, 1, h, M[4]); P.px(x + w, y + h, '#2C2018');
  }
  for (let k = 0; k < 2; k++) { const x = 3 + Math.floor(R() * 9), y = 3 + Math.floor(R() * 9); P.line(x, y, x + 3, y + (R() < 0.5 ? 1 : -1), '#3C3430'); }
}
// laid concrete: a slab with its seams, worn a little (laid on rock; at a rock edge the slab stops short)
function rtsWConcrete(P, open, v) {
  const M = RTS_W_C.conc;
  const x0 = open[3] ? 2 : 0, y0 = open[0] ? 2 : 0, x1 = open[1] ? 13 : 15, y1 = open[2] ? 13 : 15;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const n = rtsWPFbm(x, y, 75), h = rtsWHash(x & 15, y & 15, 76);
    let i = 2 + (n < 0.35 ? -0.6 : n > 0.66 ? 0.6 : 0);
    i = Math.round(i + (rtsWBayer(x, y) - 0.5) * 0.6);
    if (h < 0.04) i = 3;
    P.px(x, y, M[i]);
  }
  // seams: lit top/left lip, dark joint bottom/right
  P.rect(x0, y0, x1 - x0 + 1, 1, M[0]); P.rect(x0, y0, 1, y1 - y0 + 1, M[0]);
  P.rect(x0, y1, x1 - x0 + 1, 1, M[4]); P.rect(x1, y0, 1, y1 - y0 + 1, M[4]);
  P.px(x1, y0, M[3]); P.px(x0, y1, M[3]);
  if (v === 1) { P.line(5, 9, 8, 7, M[4]); P.px(9, 7, M[4]); }
  if (v === 2) { for (const [x, y] of [[6, 5], [7, 5], [6, 6], [10, 10], [9, 11]]) P.px(x, y, M[3]); }
  if (v === 3) { P.rect(4, 11, 3, 2, '#7C7468'); P.px(5, 10, '#7C7468'); }
}

// ------------------------------------------------------------------ terrain at res 2 (32 x 32)
// The same ground with the same edges (every shape is a function of the tile's logical coordinates, so a res 2 tile
// meets its neighbours exactly where a res 1 tile does), drawn finer: three wind ripples a tile with lit crests and
// shadowed troughs, pebbles; dunes with a sharp lit crest line; rock in terraces with hairline cracks, grit and
// boulders, its plateau faces in strata; mountains of crags split by crevices, their south faces layered and
// fractured, scree at the foot; glimmer as grains and crystals with glints; concrete with joints, bolt holes,
// stains; craters with thrown-out ejecta; rubble of broken slabs and rebar.
const rtsWL2 = X => X / 2 - 0.25;   // a device pixel's logical coordinate (so that its centre is at +0.5)
const rtsWClampI = (i, n) => Math.max(0, Math.min(n - 1, Math.round(i)));

// the sand's brightness level (0 light .. 5 dark) at device X, Y: broad tone, three ripples a tile (a lit crest,
// the shadow line under it, the long windward rise), fading in and out; inn > 0 adds the variant's own drift
function rtsWSandLv2(X, Y, v, inn) {
  const x = rtsWL2(X), y = rtsWL2(Y);
  let lv = 2 + (rtsWPFbm(x, y, 11) - 0.5) * 0.75 + (rtsWPNoise(x, y, 2, 16) - 0.5) * 0.3;
  if (inn > 0) lv += (rtsWNoise(x / 4 + v * 7.3, y / 4, 40 + v) - 0.5) * 1.3 * inn;
  // (slanting a third of a period across the tile, so they still join; wandering with the noise)
  const wob = x / 3 + (rtsWPNoise(x, y, 8, 12) - 0.5) * 4.6 + (rtsWPNoise(x, y, 4, 18) - 0.5) * 1.5
    + inn * (rtsWNoise(x / 5 + v * 3.7, y / 6, 14 + v) - 0.5) * 8;
  const per = 16 / 3, t = (((y + wob) % per) + per) % per;
  const str = Math.max(0, 0.3 + 0.7 * rtsWPNoise(x, y, 8, 17) + inn * (rtsWNoise(x / 4 + v * 2.1, y / 4, 19 + v) - 0.5) * 0.8);
  if (t < 0.5) lv += 1.3 * str;
  else if (t < 1.25) lv += 0.6 * str;
  else if (t > per - 0.5) lv -= 1.15 * str;
  else if (t > per - 1.5) lv -= 0.5 * str;
  else lv -= (t - 1.25) / (per - 2.75) * 0.3 * str;
  return lv;
}
function rtsWSand2(X, Y, v, inn, lv) {
  if (lv === undefined) lv = rtsWSandLv2(X, Y, v, inn);
  const h = rtsWHash(X, Y, 13);
  let i = Math.round(lv + (rtsWBayer(X, Y) - 0.5) * 0.6);
  if (h < 0.012) i = Math.max(i + 2, 4); else if (h > 0.993) i = 0; else if (h > 0.985) i = Math.max(1, i - 1);
  return RTS_W_C.sand[rtsWClampI(i, 6)];
}
// a little stone at device X, Y (w x h): lit top left, dark lower right, its shadow on the ground
function rtsWStone2(P, X, Y, w, h, pal) {
  const inS = (i, j) => (((i + 0.5) / w - 0.5) ** 2 + ((j + 0.5) / h - 0.5) ** 2) <= 0.3;
  for (let j = 0; j <= h + 1; j++) for (let i = 0; i <= w + 1; i++) if (!inS(i, j) && inS(i - 1, j - 1)) P.shade(X + i, Y + j, 0.62);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    if (!inS(i, j)) continue;
    const l = -((i + 0.5) / w - 0.5) - ((j + 0.5) / h - 0.5);
    P.dpx(X + i, Y + j, pal[l > 0.3 ? 0 : l < -0.25 ? 2 : 1]);
  }
  if (w > 2 && h > 2) P.dpx(X + 1, Y + 1, pal[0]);
}
// pebbles strewn inside a tile (ok(X, Y) says where they may lie)
function rtsWPebbles2(P, seed, n, ok, pals) {
  const R = rtsWSeeded(seed);
  for (let k = 0; k < n; k++) {
    const w = 2 + Math.floor(R() * 3), h = 2 + Math.floor(R() * 2), X = 5 + Math.floor(R() * (22 - w)), Y = 5 + Math.floor(R() * (22 - h)), pal = pals[Math.floor(R() * pals.length)];
    if (!ok(X, Y) || !ok(X + w + 1, Y + h + 1)) continue;
    rtsWStone2(P, X, Y, w, h, pal);
  }
}
const RTS_W_SANDSTONES = [['#E8D0A8', '#B89870', '#7C6044'], ['#D8C0A0', '#A88868', '#6C5038'], ['#F0E0C0', '#C8A878', '#8C6C48']];

// fields over a res 2 tile's device pixels and a margin of 12 round it (for looking a few pixels aside), computed
// once: per tile (its edge shape) or cached for every tile that shares them (the variant's own ground)
const RTS_W_G2C = new Map();
function rtsWGrid2(fn) {
  const a = new Float64Array(56 * 56);
  for (let Y = -12; Y < 44; Y++) for (let X = -12; X < 44; X++) a[(Y + 12) * 56 + X + 12] = fn(rtsWL2(X), rtsWL2(Y), X, Y);
  return a;
}
function rtsWGrid2c(key, fn) { let a = RTS_W_G2C.get(key); if (!a) RTS_W_G2C.set(key, a = rtsWGrid2(fn)); return a; }
const rtsWG = (a, X, Y) => a[(Y + 12) * 56 + X + 12];
// the sand's levels of a variant (inn: with its inner drift, as on a sand tile, or without, as round the rocks)
function rtsWSandLvs2(v, inn) {
  const key = 'sand' + v + ':' + (inn ? 1 : 0);
  let a = RTS_W_G2C.get(key);
  if (!a) {
    a = new Float64Array(32 * 32);
    for (let Y = 0; Y < 32; Y++) for (let X = 0; X < 32; X++) a[Y * 32 + X] = rtsWSandLv2(X, Y, v, inn ? rtsWInner(rtsWL2(X), rtsWL2(Y)) : 0);
    RTS_W_G2C.set(key, a);
  }
  return a;
}
// a region's edge shape as a function of device X, Y over the grid (null when nothing is open: -99 everywhere)
function rtsWShapeGrid2(open, ext, diag, depth, wob, seed, R) {
  const corners = [0, 1, 2, 3].some(b => !open[b] && !open[(b + 1) & 3] && !diag(b));
  if (!open.some(o => o) && !corners) return null;
  // (filled in as it's looked at: most pixels look at only a few)
  const sdf = rtsWShape(open, ext, diag, depth, wob, seed, R), a = new Float64Array(56 * 56).fill(NaN);
  return (X, Y) => { const i = (Y + 12) * 56 + X + 12; let s = a[i]; if (s !== s) s = a[i] = sdf(rtsWL2(X), rtsWL2(Y)); return s; };
}

function rtsWTileBuild2(kind, mask, v) {
  const P = new RtsWPaint(16, 16, 2), fam = RTS_W_FAM[kind] | 0, ext = (mask & 0x1000) !== 0;
  const same = b => (mask >> b) & 1, spec = b => ext && ((mask >> (4 + b)) & 1), diag = b => (ext ? (mask >> (8 + b)) & 1 : 1);
  const inner2 = (X, Y) => rtsWInner(rtsWL2(X), rtsWL2(Y));
  const SL0 = rtsWSandLvs2(v, false), sand = (X, Y) => rtsWSand2(X, Y, v, 0, SL0[Y * 32 + X]);
  const S = RTS_W_C.sand;

  if (fam === 0) {
    if (kind === 1) {
      // dunes: the res 1 dune field sampled finer; a sharp crest line catching the light, the lee in deep shade,
      // little ripples on the windward slopes
      const open = [0, 1, 2, 3].map(b => ext && !spec(b));
      const AMP = open.some(o => o) ? rtsWGrid2((x, y) => {
        let a = 1;
        for (let b = 0; b < 4; b++) if (open[b]) {
          const dist = b === 0 ? y + 0.5 : b === 1 ? 15.5 - x : b === 2 ? 15.5 - y : x + 0.5;
          const e = 6 + (rtsWEdgeN(b === 0 || b === 2 ? x : y, 61 + (b & 1)) - 0.5) * 6;
          a = Math.min(a, Math.max(0, Math.min(1, dist / Math.max(1, e))));
        }
        return a * a * (3 - 2 * a);
      }) : null;
      const PH = rtsWGrid2c('dune' + v, (x, y) => {
        const wv = rtsWInner(x, y), u0 = y + x + 2.2 * Math.sin(Math.PI * 2 * x / 16 + 0.6) + 1.3 * Math.sin(Math.PI * 2 * y / 16 + 2.1) + (rtsWPNoise(x, y, 8, 51) - 0.5) * 5;
        const u = u0 + wv * (rtsWNoise(x / 6 + v * 3.1, y / 6, 50 + v) - 0.5) * 10;
        return ((u % 16) + 16) % 16;
      });
      const amp = (X, Y) => (AMP ? rtsWG(AMP, X, Y) : 1);
      const height = (X, Y) => { const p = rtsWG(PH, X, Y); return (p < 11 ? p / 11 : (16 - p) / 5) * amp(X, Y); };
      for (let Y = 0; Y < 32; Y++) for (let X = 0; X < 32; X++) {
        const a = amp(X, Y);
        let lv = SL0[Y * 32 + X];
        if (a > 0) {
          const sl = (height(X + 1, Y + 1) - height(X - 1, Y - 1)) * 4.4, p = rtsWG(PH, X, Y);
          lv += (-sl * 1.3 + (height(X, Y) - 0.5 * a) * 0.5) * 1 - (lv - 2) * 0.4 * a;
          // the crest: a lit line, the lee just under it darkest; windward ripples
          if (p > 10.4 && p < 11.1) lv -= 0.85 * a;
          else if (p >= 11.1 && p < 12.2) lv += 0.7 * a;
          else if (p < 10 && p > 1.5 && ((p * 1.6) % 2) < 0.32) lv += 0.55 * a;
        }
        P.dpx(X, Y, rtsWSand2(X, Y, v, 0, lv));
      }
      return P;
    }
    const SL1 = rtsWSandLvs2(v, true);
    for (let Y = 0; Y < 32; Y++) for (let X = 0; X < 32; X++) P.dpx(X, Y, rtsWSand2(X, Y, v, 0, SL1[Y * 32 + X]));
    const okIn = (X, Y) => inner2(X, Y) > 0.9;
    if (kind === 0) {
      if (v === 1 || v === 3) rtsWPebbles2(P, 300 + v, v === 1 ? 1 : 2, okIn, RTS_W_SANDSTONES);
      if (v === 2) {
        // a patch of coarse dark grit the wind uncovered
        for (let Y = 6; Y < 26; Y++) for (let X = 6; X < 26; X++) {
          const n = rtsWNoise(X / 5, Y / 5, 330) * (1 - Math.hypot(X - 15.5, Y - 16) / 11);
          if (n > 0.28 && rtsWHash(X, Y, 331) < n * 1.1) P.dpx(X, Y, S[rtsWHash(X, Y, 332) < 0.3 ? 5 : 3]);
        }
      }
    }
    if (kind === 6) P.stamp(rtsWBloomPaint(0, v, 2), 0, 0);
    if (kind === 8) rtsWCraterSand2(P, v);
    return P;
  }

  if (fam === 3) {
    // glimmer: the orange glow as grains, crystals catching the light, glints; thick fields denser and deeper
    const thick = kind === 5, G = RTS_W_C.glim;
    const open = [0, 1, 2, 3].map(b => !same(b));
    const corners = [0, 1, 2, 3].map(b => same(b) && same((b + 1) & 3) && !diag(b));
    const thickOpen = [0, 1, 2, 3].map(b => thick && ext && same(b) && !spec(b));
    const fade = (x, y, which, w0) => {
      const q = [];
      for (let b = 0; b < 4; b++) {
        if (!which[b]) continue;
        const dist = b === 0 ? y + 0.5 : b === 1 ? 15.5 - x : b === 2 ? 15.5 - y : x + 0.5, along = b === 0 || b === 2 ? x : y;
        q.push((w0 + (rtsWEdgeN(along, 31 + (b & 1) * 3) - 0.5) * 6) - dist);
      }
      let l2 = 0, mx = -99;
      for (const v2 of q) { if (v2 > 0) l2 += v2 * v2; mx = Math.max(mx, v2); }
      const s = q.length ? Math.sqrt(l2) + Math.min(mx, 0) : -99;
      return Math.max(0, Math.min(1, 1 - s / w0));
    };
    const anyOpen = open.some(o => o) || corners.some(o => o), anyThick = thickOpen.some(o => o);
    const BASE = rtsWGrid2c('glim' + v, (x, y) => {
      const inn = rtsWInner(x, y);
      return (rtsWPFbm(x, y, 21) - 0.5) * 0.6 + (rtsWPNoise(x, y, 2, 22) - 0.5) * 0.35 + (inn > 0 ? inn * (rtsWNoise(x / 3.5 + v * 5.3, y / 3.5, 70 + v) - 0.5) * 0.45 : 0);
    });
    const VEIN = rtsWGrid2c('vein', (x, y) => (Math.abs(rtsWPNoise(x, y, 4, 25) - rtsWPNoise(x, y, 4, 26)) < 0.03 ? 1 : 0));
    const D = new Float32Array(32 * 32), TK = new Float32Array(32 * 32);
    for (let Y = 0; Y < 32; Y++) for (let X = 0; X < 32; X++) {
      const x = rtsWL2(X), y = rtsWL2(Y);
      const tk = thick ? (anyThick ? fade(x, y, thickOpen, 6) : 1) : 0;
      TK[Y * 32 + X] = tk;
      let d = 0.58 + 0.22 * tk + rtsWG(BASE, X, Y);
      let e = anyOpen ? fade(x, y, open, 7) : 1;
      for (let b = 0; b < 4; b++) if (corners[b]) {
        const C = [[16, 0], [16, 16], [0, 16], [0, 0]][b], dd = Math.hypot(x + 0.5 - C[0], y + 0.5 - C[1]);
        e = Math.min(e, Math.max(0, Math.min(1, dd / 7)));
      }
      d *= e;
      D[Y * 32 + X] = d;
      const s = d + (rtsWBayer(X, Y) - 0.5) * 0.3 + (rtsWHash(X, Y, 24) - 0.5) * 0.12;
      let c = sand(X, Y);
      if (tk >= 0.5) {
        if (s > 0.2) c = rtsWMix(c, '#C05820', 0.5);
        if (s > 0.4) c = G[4];
        if (s > 0.55) c = G[3];
        if (s > 0.7) c = G[2];
        if (s > 0.86) c = G[1];
        // dark veins between the heaps
        if (d > 0.5 && rtsWG(VEIN, X, Y)) c = G[5];
      } else {
        if (s > 0.25) c = rtsWMix(c, '#D87830', 0.42);
        if (s > 0.48) c = G[3];
        if (s > 0.66) c = G[2];
        if (s > 0.85) c = G[1];
      }
      P.dpx(X, Y, c);
    }
    // crystals: a lit facet, a mid one, a dark one, the shadow under; glints on the brightest
    const R = rtsWSeeded(500 + v * 7 + (thick ? 3 : 0));
    const nC = thick ? 32 : 24;
    for (let k = 0; k < nC; k++) {
      const X = 2 + Math.floor(R() * 26), Y = 2 + Math.floor(R() * 26), d = D[Y * 32 + X];
      if (R() > d * 1.25) continue;
      const big = d > 0.7 && TK[Y * 32 + X] > 0.5 && R() < 0.4;
      P.dpx(X, Y, G[0]); P.dpx(X + 1, Y, G[1]); P.dpx(X, Y + 1, G[2]); P.dpx(X + 1, Y + 1, G[4]); P.shade(X + 2, Y + 1, 0.7); P.shade(X + 1, Y + 2, 0.7);
      if (big) { P.dpx(X, Y - 1, G[0]); P.dpx(X - 1, Y, G[1]); P.dpx(X + 2, Y, G[3]); P.dpx(X + 1, Y + 2, G[5]); P.dpx(X, Y + 2, G[4]); }
    }
    for (let Y = 0; Y < 32; Y++) for (let X = 0; X < 32; X++) {
      const d = D[Y * 32 + X], h = rtsWHash(X, Y, 23 + v);
      if (d > 0.15 && h < d * 0.04) P.dpx(X, Y, G[h < d * 0.012 ? 0 : 1]);
    }
    const nG = thick ? 3 : 2;
    for (let k = 0; k < nG; k++) {
      const X = 4 + Math.floor(R() * 24), Y = 4 + Math.floor(R() * 24);
      if (D[Y * 32 + X] < 0.45) continue;
      P.dpx(X, Y, '#FFFFFF'); for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) P.dpx(X + a, Y + b, G[0]);
      if (thick || k === 0) for (const [a, b] of [[2, 0], [-2, 0], [0, 2], [0, -2]]) P.dpx(X + a, Y + b, G[0], 0.55);
    }
    return P;
  }

  if (fam === 1) {
    // rock: terraces, rims, the plateau's face in strata, cracks, grit, boulders (and concrete, craters, rubble)
    const R = RTS_W_C.rock;
    const open = [0, 1, 2, 3].map(b => !same(b) && !spec(b));
    const SG = rtsWShapeGrid2(open, ext, diag, 3.4, 1.6, 41, 6);
    const sd = SG || (() => -99);
    const LG = rtsWGrid2c('rockL' + v, (x, y) => {
      const inn = rtsWInner(x, y);
      const h = 0.5 + (rtsWPNoise(x, y, 4, 44) - 0.5) * 0.55 * (1 - 0.6 * inn) + (rtsWPNoise(x, y, 2, 45) - 0.5) * 0.3
        + (rtsWPNoise(x, y, 8, 43) - 0.5) * 0.2 + inn * (rtsWNoise(x / 3.2 + v * 9.1, y / 3.2, 47 + v) - 0.5) * 0.8;
      return Math.max(0, Math.min(3, Math.floor((h - 0.5) * 7 + 1.6)));
    });
    const TN = rtsWGrid2c('rockT', (x, y) => rtsWPNoise(x, y, 2, 49));
    const L = (X, Y) => rtsWG(LG, X, Y);
    const tone = l => [3, 2.35, 2, 1.4][l];
    const SD = new Float32Array(32 * 32);
    for (let Y = 0; Y < 32; Y++) for (let X = 0; X < 32; X++) {
      const s = sd(X, Y);
      SD[Y * 32 + X] = s;
      if (s > 0) {
        P.dpx(X, Y, sand(X, Y));
        // the plateau's south face under the rim (strata), its east face, its shadow on the sand
        let k = 0;
        for (let n = 1; n <= 4; n++) if (sd(X, Y - n) <= 0) { k = n; break; }
        if (k) {
          const st = rtsWHash(X >> 1, Y + k, 42);
          P.dpx(X, Y, k === 1 ? R[3] : k === 4 ? R[5] : st < 0.3 ? R[5] : st > 0.85 ? R[3] : R[4]);
          continue;
        }
        if (sd(X - 1, Y) <= 0) { P.dpx(X, Y, R[4]); continue; }
        if (sd(X - 2, Y) <= 0) { P.dpx(X, Y, R[5]); continue; }
        if (sd(X - 2, Y - 2) <= 0 || sd(X - 4, Y - 4) <= 0 || sd(X - 2, Y - 6) <= 0 || sd(X - 4, Y - 6) <= 0 || sd(X - 3, Y - 5) <= 0) P.shade(X, Y, 0.62);
        else if ((sd(X - 5, Y - 7) <= 0 || sd(X - 5, Y - 5) <= 0) && rtsWBayer(X, Y) < 0.5) P.shade(X, Y, 0.72);
        continue;
      }
      let c;
      if (sd(X - 1, Y) > 0 || sd(X, Y - 1) > 0) c = R[0];
      else if (sd(X + 1, Y) > 0 || sd(X, Y + 1) > 0) c = R[4];
      else if (sd(X - 2, Y) > 0 || sd(X, Y - 2) > 0) c = R[1];
      else {
        const l = L(X, Y), dn = L(X + 1, Y + 1), up = L(X - 1, Y - 1);
        if (dn > l) c = R[l + 1 < dn ? 0 : 1];
        else if (dn < l) c = R[Math.min(5, 4 + (l - dn > 1 ? 1 : 0))];
        else if (up > l || L(X - 2, Y - 2) > l) c = R[rtsWClampI(tone(l) + 0.9, 6)];
        else c = R[rtsWClampI(tone(l) + (rtsWG(TN, X, Y) - 0.5) * 0.9 + (rtsWBayer(X, Y) - 0.5) * 0.7, 6)];
      }
      const h = rtsWHash(X, Y, 46 + v);
      if (h < 0.035) c = R[4]; else if (h > 0.98) c = R[0];
      P.dpx(X, Y, c);
    }
    // hairline cracks wandering across the rock (the zero line of two noises: they run on into the next tile)
    const CK = rtsWGrid2c('rockC', (x, y) => (rtsWPNoise(x, y, 8, 403) > 0.48 && Math.abs(rtsWPNoise(x, y, 4, 401) - rtsWPNoise(x, y, 4, 402)) < 0.022 ? 1 : 0));
    for (let Y = 0; Y < 32; Y++) for (let X = 0; X < 32; X++) {
      if (SD[Y * 32 + X] > -1.2 || !rtsWG(CK, X, Y)) continue;
      P.dpx(X, Y, R[5]);
      if (X < 31 && Y < 31 && SD[(Y + 1) * 32 + X + 1] < -1.2 && !rtsWG(CK, X + 1, Y + 1)) P.dpx(X + 1, Y + 1, R[1]);
    }
    const okIn = (X, Y) => X >= 0 && Y >= 0 && X < 32 && Y < 32 && SD[Y * 32 + X] < -2.2 && inner2(X, Y) > 0.9;
    const RP = [[R[0], R[2], R[4]], [R[1], R[3], R[5]], ['#B8A898', '#8C7C6C', '#544638']];
    if (kind === 2) {
      if (v === 1) rtsWPebbles2(P, 610, 2, okIn, RP);
      if (v === 3) rtsWPebbles2(P, 611, 5, okIn, RP);
      if (v === 2) {
        // a boulder sitting on the rock
        const R2 = rtsWSeeded(612), X = 9 + Math.floor(R2() * 10), Y = 9 + Math.floor(R2() * 8);
        if (okIn(X, Y) && okIn(X + 8, Y + 7)) { rtsWStone2(P, X, Y, 7, 5, [R[0], R[2], R[4]]); P.dpx(X + 4, Y + 2, R[3]); P.dpx(X + 5, Y + 3, R[3]); }
      }
    }
    if (kind === 7) rtsWConcrete2(P, open, v);
    if (kind === 9) rtsWCraterRock2(P, v, SD);
    if (kind === 10) rtsWRubbleTile2(P, v, SD);
    return P;
  }

  // ------------------------------------------------------------------ cliffs
  const C = RTS_W_C.cliff, R = RTS_W_C.rock;
  const open = [0, 1, 2, 3].map(b => !same(b)), onRock = [0, 1, 2, 3].map(b => spec(b));
  const SG = rtsWShapeGrid2(open, ext, diag, 3.4, 2.2, 51, 6);
  const sd = SG || (() => -99);
  const FACE2 = 8;   // the face's height in device pixels
  const top = open[2] ? (X, Y) => sd(X, Y + FACE2) : sd;
  const cells = rtsWCragPts2(v);
  // a crag in each cell (its height the distance in from the cell's edge), broken by ridged noise; the edge rise and
  // the valleys' crevices; all but the edge rise the same for every tile of the variant
  const rid = n => 1 - Math.abs(n - 0.5) * 2;
  const VE = rtsWGrid2c('cragE' + v, (x, y) => {
    const px = x + 0.5, py = y + 0.5;
    let f1 = 99, f2 = 99, k1 = 0;
    for (const [qx, qy, k] of cells) { const d = Math.hypot(px - qx, py - qy) / k; if (d < f1) { f2 = f1; f1 = d; k1 = k; } else if (d < f2) f2 = d; }
    return (f2 - f1) * k1;
  });
  const HB = rtsWGrid2c('cragH' + v, (x, y, X, Y) => {
    const inn = rtsWInner(x, y), e = rtsWG(VE, X, Y);
    const mid = rid(rtsWPNoise(x, y, 4, 54)) * (1 - inn) + rid(rtsWNoise(x / 3.5 + v * 6.1, y / 3.5, 54 + v)) * inn;
    return Math.min(3.5, e) * 0.42 + mid * 0.9 + rid(rtsWPNoise(x, y, 2, 52)) * 0.3 - (e < 0.6 ? 0.6 : 0);
  });
  const CV = rtsWGrid2c('cragV' + v, (x, y, X, Y) => (rtsWG(VE, X, Y) < 0.22 && rtsWPNoise(x, y, 4, 63) > 0.56 ? 1 : 0));
  const Hh = (X, Y) => Math.min(1, Math.max(0, -top(X, Y)) / 4) * 1.2 + rtsWG(HB, X, Y);
  const TN = rtsWGrid2c('rockT', (x, y) => rtsWPNoise(x, y, 2, 49));
  const footRock = (x, y) => {
    let best = -1, bd = 99;
    for (let b = 0; b < 4; b++) {
      if (!open[b]) continue;
      const dist = b === 0 ? y + 0.5 : b === 1 ? 15.5 - x : b === 2 ? 15.5 - y : x + 0.5;
      if (dist < bd) { bd = dist; best = b; }
    }
    return best >= 0 ? onRock[best] : ext;   // (an inner corner's notch: mountains stand on rock)
  };
  for (let Y = 0; Y < 32; Y++) for (let X = 0; X < 32; X++) {
    const x = rtsWL2(X), y = rtsWL2(Y), s = sd(X, Y);
    if (s > 0) {
      if (footRock(x, y)) P.dpx(X, Y, R[rtsWClampI(2 + (rtsWG(TN, X, Y) - 0.5) * 0.9 + (rtsWBayer(X, Y) - 0.5) * 0.7, 6)]);
      else P.dpx(X, Y, sand(X, Y));
      // scree at the foot: chips of the mountain, and its shadow
      if (s < 1.8 && rtsWHash(X >> 1, Y >> 1, 56) < 0.42 - s * 0.15) P.dpx(X, Y, C[rtsWHash(X, Y, 57) < 0.5 ? 3 : 5]);
      if (sd(X - 2, Y - 2) <= 0 || sd(X - 4, Y - 4) <= 0 || sd(X - 2, Y - 4) <= 0 || sd(X - 4, Y - 2) <= 0 || sd(X - 6, Y - 6) <= 0) P.shade(X, Y, 0.55);
      else if (sd(X - 7, Y - 7) <= 0 && rtsWBayer(X, Y) < 0.5) P.shade(X, Y, 0.7);
      continue;
    }
    let c;
    const tp = top(X, Y);
    if (tp > 0) {
      // the south face: layered strata bending a little, fractures down it, darker towards its foot
      const yy = Y + Math.round((rtsWPNoise(x, 0.5, 4, 58) - 0.5) * 4), band = yy >> 1, seam = (yy & 1) === 0 && rtsWHash(band, X >> 2, 59) < 0.55;
      const st = rtsWHash(X >> 1, band, 58);
      let i = tp < 1.2 ? 2 : tp > 2.8 ? 4 : 3;
      if (st < 0.22) i++; else if (st > 0.86 && tp < 2.6) i--;
      if (seam) i++;
      if (rtsWHash(X, 0, 61) < 0.07 && rtsWHash(X, band >> 1, 62) < 0.6) i = 5;
      c = C[rtsWClampI(i, 6)];
      if (top(X - 1, Y) <= 0 && tp < 1.4) c = C[2];
      if (top(X, Y - 1) <= 0) c = C[1];
    } else {
      const h = Hh(X, Y), sl = (Hh(X + 1, Y + 1) - Hh(X - 1, Y - 1)) * 2;
      c = C[rtsWClampI(3 - (h - 1.6) * 0.55 - sl * 2.6 + (rtsWBayer(X, Y) - 0.5) * 0.85, 6)];
      // crevices along some of the valleys
      if (rtsWG(CV, X, Y)) c = C[5];
      if (sd(X - 1, Y) > 0 || sd(X, Y - 1) > 0) c = C[1];
      else if (sd(X + 1, Y) > 0) c = C[5];
      else if (top(X, Y + 1) > 0) c = C[open[2] ? 1 : 5];
      const qh = rtsWHash(X, Y, 59 + v);
      if (qh < 0.03) c = C[5]; else if (qh > 0.985) c = C[0];
    }
    P.dpx(X, Y, c);
  }
  return P;
}
// the peaks of the res 2 mountains: [x, y, size]; those along the borders (and their copies a tile over) are the
// same for every tile, so the crags join; three inner ones of the variant's own, kept far enough in that they
// never reach the border
const RTS_W_CRAGS2 = [];
function rtsWCragPts2(v) {
  if (RTS_W_CRAGS2[v]) return RTS_W_CRAGS2[v];
  const base = [[0.5, 0.5, 1.1], [9, 1.5, 1], [3.5, 7, 0.9], [12.5, 9, 1.05], [6, 13, 0.95]], pts = [];
  base.forEach(([x, y, k]) => { for (let ox = -16; ox <= 16; ox += 16) for (let oy = -16; oy <= 16; oy += 16) pts.push([x + ox, y + oy, k]); });
  const R = rtsWSeeded(v * 977 + 33), inner = [];
  for (let t = 0; inner.length < 1 + (v & 1) && t < 60; t++) {
    const p = [6.5 + R() * 3, 6.5 + R() * 3, 0.75 + R() * 0.2];
    if (inner.every(q => Math.hypot(q[0] - p[0], q[1] - p[1]) > 2.5)) inner.push(p);
  }
  return (RTS_W_CRAGS2[v] = pts.concat(inner));
}

function rtsWCraterSand2(P, v) {
  const S = RTS_W_C.sand, cx = 8 + (v & 1 ? 1 : -0.5), cy = 8 + (v & 2 ? 0.5 : -0.5), r = 4.6 + (v % 3) * 0.6;
  for (let Y = 0; Y < 32; Y++) for (let X = 0; X < 32; X++) {
    const dx = rtsWL2(X) + 0.5 - cx, dy = rtsWL2(Y) + 0.5 - cy, d = Math.hypot(dx, dy) / r;
    if (d > 1.75) continue;
    const n = rtsWHash(X, Y, 60 + v), b = (rtsWBayer(X, Y) - 0.5) * 0.7;
    if (d < 1) {
      // the dish: its far (lower right) wall in the light, the near one in shade, scorched sand at the bottom
      const side = (dx + dy) / (r * 1.4);
      let i = 3.1 - side * 2.4 + (d < 0.5 ? 0.9 * (1 - d * 2) : 0) + b;
      if (d < 0.35 && n < 0.45) i = 5;
      P.dpx(X, Y, S[rtsWClampI(i, 6)]);
      if (d < 0.6 && n > 0.93) P.dpx(X, Y, '#3C2810');
    } else if (d < 1.3) {
      // the rim thrown up: its outer slope lit towards the top left, a lip of light along its crest
      const o = (dx + dy) / (d * r);
      const i = d < 1.08 ? (o < 0 ? 1 : 2) : o < -0.3 ? 0.7 : o > 0.4 ? 3 : 1.8;
      P.dpx(X, Y, S[rtsWClampI(i + b, 6)]);
      if (n < 0.12) P.dpx(X, Y, S[4]);
    } else if (n < 0.3 * (1.75 - d) / 0.45) {
      // ejecta: clods and dark scorch flung out
      P.dpx(X, Y, n < 0.1 ? S[5] : S[3]);
      if (n < 0.05) P.dpx(X - 1, Y - 1, S[1]);
    }
  }
}
function rtsWCraterRock2(P, v, SD) {
  const R = RTS_W_C.rock, cx = 8 + (v & 1 ? 0.5 : -0.5), cy = 8 + (v & 2 ? 0.5 : -0.5), r = 4.2 + (v % 3) * 0.5;
  for (let Y = 0; Y < 32; Y++) for (let X = 0; X < 32; X++) {
    if (SD[Y * 32 + X] > -0.5) continue;
    const dx = rtsWL2(X) + 0.5 - cx, dy = rtsWL2(Y) + 0.5 - cy, a = Math.atan2(dy, dx);
    const rr = r * (0.85 + 0.3 * rtsWHash(Math.round((a + 4) * 3), v, 63)), d = Math.hypot(dx, dy) / rr;
    if (d > 1.8) continue;
    const n = rtsWHash(X, Y, 64 + v), side = (dx + dy) / (rr * 1.4);
    if (d < 1) {
      let c = d < 0.38 ? '#140C08' : side < -0.1 ? R[5] : side > 0.35 ? R[2] : R[4];
      if (d < 0.38 && n > 0.9) c = '#3C2418';
      if (d >= 0.38 && d < 0.5 && n < 0.4) c = '#241810';
      P.dpx(X, Y, c);
    } else if (d < 1.3) P.dpx(X, Y, (dx + dy) < 0 ? (d < 1.1 ? R[0] : R[1]) : n < 0.4 ? R[5] : R[2]);
    else if (n < 0.34 * (1.8 - d) / 0.5) P.dpx(X, Y, n < 0.12 ? '#241810' : R[4]);
  }
  // fractures running out from it, and chips of stone thrown round
  const Rn = rtsWSeeded(65 + v * 5);
  for (let k = 0; k < 5; k++) {
    const a = Rn() * Math.PI * 2, l0 = r * 1.05, l1 = r * (1.4 + Rn() * 0.5);
    let X = Math.round((cx + Math.cos(a) * l0) * 2), Y = Math.round((cy + Math.sin(a) * l0) * 2);
    for (let i = 0; i < (l1 - l0) * 2; i++) {
      if (X < 1 || Y < 1 || X > 30 || Y > 30 || SD[Y * 32 + X] > -1) break;
      P.dpx(X, Y, R[5]);
      X += Math.round(Math.cos(a) + (Rn() - 0.5) * 0.8); Y += Math.round(Math.sin(a) + (Rn() - 0.5) * 0.8);
    }
  }
  for (let k = 0; k < 4; k++) {
    const a = Rn() * Math.PI * 2, l = r * (1.35 + Rn() * 0.3), X = Math.round((cx + Math.cos(a) * l) * 2), Y = Math.round((cy + Math.sin(a) * l) * 2);
    if (X > 2 && Y > 2 && X < 28 && Y < 28 && SD[Y * 32 + X] < -1.5) rtsWStone2(P, X, Y, 2 + (k & 1), 2, [R[0], R[2], R[4]]);
  }
}
function rtsWRubbleTile2(P, v, SD) {
  const M = RTS_W_C.conc, MT = RTS_W_M, R = rtsWSeeded(v * 71 + 9);
  for (let Y = 0; Y < 32; Y++) for (let X = 0; X < 32; X++) {
    if (SD[Y * 32 + X] > -1) continue;
    const n = rtsWNoise(X / 6, Y / 6, 70 + v);
    if (n > 0.45 && rtsWBayer(X, Y) < (n - 0.45) * 2.4) P.shade(X, Y, 0.55);
  }
  for (let k = 0; k < 9; k++) {
    const w = 3 + Math.floor(R() * 6), h = 2 + Math.floor(R() * 4), X = 3 + Math.floor(R() * (26 - w)), Y = 3 + Math.floor(R() * (26 - h));
    if (SD[Y * 32 + X] > -1 || SD[(Y + h) * 32 + X + w] > -1) continue;
    const metal = R() < 0.25, pal = metal ? [MT[1], MT[3], MT[5]] : [M[0], M[2], M[4]], cut = Math.floor(R() * 3);
    for (let j = 0; j <= h; j++) for (let i = 0; i <= w; i++) {
      if (i + j < cut || (w - i) + (h - j) < cut - 1) continue;
      if (j === h || i === w) { P.shade(X + i + 1, Y + j + 1, 0.55); continue; }
      const c = j === 0 || i === Math.max(0, cut - j) ? pal[0] : i === w - 1 || j === h - 1 ? pal[2] : pal[1];
      P.dpx(X + i, Y + j, c);
    }
    if (!metal && R() < 0.6) { const rx = X + 1 + Math.floor(R() * (w - 2)); P.dline(rx, Y + 1, rx + (R() < 0.5 ? 2 : -2), Y - 2, '#8C4C2C'); }
  }
  for (let k = 0; k < 3; k++) { const X = 4 + Math.floor(R() * 22), Y = 4 + Math.floor(R() * 22); if (SD[Y * 32 + X] < -1) P.dline(X, Y, X + 5, Y + (R() < 0.5 ? 2 : -2), '#3C3430'); }
}
// laid concrete at res 2: the slab, its lit and shadowed seams, the joints of its four panels, bolt holes, wear
function rtsWConcrete2(P, open, v) {
  const M = RTS_W_C.conc;
  const x0 = open[3] ? 4 : 0, y0 = open[0] ? 4 : 0, x1 = open[1] ? 27 : 31, y1 = open[2] ? 27 : 31;
  for (let Y = y0; Y <= y1; Y++) for (let X = x0; X <= x1; X++) {
    const x = rtsWL2(X), y = rtsWL2(Y), n = rtsWPFbm(x, y, 75), h = rtsWHash(X & 31, Y & 31, 76);
    let i = 2 + (n - 0.5) * 2.2 + (rtsWPNoise(x, y, 2, 77) - 0.5) * 0.6;
    i = Math.round(i + (rtsWBayer(X, Y) - 0.5) * 0.6);
    if (h < 0.035) i = 3; else if (h > 0.985) i = 1;
    P.dpx(X, Y, M[rtsWClampI(i, 6)]);
  }
  // the joints between the four panels: a dark groove, its lit lip
  const mx = (x0 + x1 + 1) >> 1, my = (y0 + y1 + 1) >> 1;
  for (let Y = y0 + 1; Y < y1; Y++) { P.dpx(mx, Y, M[3]); P.dpx(mx + 1, Y, M[1]); }
  for (let X = x0 + 1; X < x1; X++) { P.dpx(X, my, M[3]); P.dpx(X, my + 1, M[1]); }
  // the slab's edges
  for (let X = x0; X <= x1; X++) { P.dpx(X, y0, M[0]); P.dpx(X, y0 + 1, M[1]); P.dpx(X, y1, M[5]); P.dpx(X, y1 - 1, M[4]); }
  for (let Y = y0; Y <= y1; Y++) { P.dpx(x0, Y, M[0]); P.dpx(x0 + 1, Y, M[1]); P.dpx(x1, Y, M[5]); P.dpx(x1 - 1, Y, M[4]); }
  P.dpx(x1, y0, M[3]); P.dpx(x0, y1, M[3]); P.dpx(x1 - 1, y0 + 1, M[2]); P.dpx(x0 + 1, y1 - 1, M[2]);
  // bolt holes near the corners
  for (const [X, Y] of [[x0 + 4, y0 + 4], [x1 - 4, y0 + 4], [x0 + 4, y1 - 4], [x1 - 4, y1 - 4]]) { P.dpx(X, Y, M[5]); P.dpx(X + 1, Y + 1, M[0]); P.dpx(X + 1, Y, M[3]); }
  if (v === 1) { P.dline(9, 19, 14, 15, M[4]); P.dline(14, 15, 17, 15, M[4]); P.dline(12, 17, 12, 20, M[4]); P.dpx(15, 16, M[1]); }
  if (v === 2) {
    // an oil stain
    for (let Y = 8; Y < 16; Y++) for (let X = 6; X < 15; X++) { const d = Math.hypot((X - 10) / 4, (Y - 11.5) / 3.2) + (rtsWHash(X, Y, 78) - 0.5) * 0.35; if (d < 1) P.tint(X, Y, '#2C2820', d < 0.5 ? 0.55 : 0.32); }
    P.dpx(9, 10, M[1]);
  }
  if (v === 3) {
    // a patched square, darker, its seam
    for (let Y = 19; Y < 26; Y++) for (let X = 18; X < 26; X++) P.dpx(X, Y, rtsWHash(X, Y, 79) < 0.25 ? M[4] : '#7C7468');
    for (let X = 18; X < 26; X++) { P.dpx(X, 19, M[2]); P.dpx(X, 25, M[5]); }
    for (let Y = 19; Y < 26; Y++) { P.dpx(18, Y, M[2]); P.dpx(25, Y, M[5]); }
  }
  if (v === 0) for (let k = 0; k < 6; k++) P.dpx(7 + k * 3, 23 + (k & 1), M[3]);   // tyre scuffs
}

// rtsTileArt(kind, mask, variant, res) -> canvas 16*res square (res 1 or 2, default 1)
function rtsTileArt(kind, mask, variant, res) {
  kind = kind | 0; mask = mask === undefined ? 15 : mask | 0; variant = ((variant | 0) % 4 + 4) % 4;
  if (kind < 0 || kind > 10) kind = 0;
  const r = rtsWRes(res);
  // only the bits a kind looks at go into the cache key
  const fam = RTS_W_FAM[kind];
  let m = mask;
  if (!(m & 0x1000)) m &= 15;
  if (fam === 0 && kind !== 1) m = 0;
  const key = kind + ':' + m + ':' + variant + ':' + r;
  let c = RTS_W_TILE_CACHE.get(key);
  if (!c) { c = (r === 2 ? rtsWTileBuild2(kind, m, variant) : rtsWTileBuild(kind, m, variant)).canvas(); RTS_W_TILE_CACHE.set(key, c); }
  return c;
}

// ------------------------------------------------------------------ the shroud
const RTS_W_SHROUD = [];
function rtsWShroudTile(mask, r = 1) {
  const key = mask + r * 16;
  if (RTS_W_SHROUD[key]) return RTS_W_SHROUD[key];
  const n = 16 * r, P = new RtsWPaint(16, 16, r), open = [0, 1, 2, 3].map(b => (mask >> b) & 1);
  for (let Y = 0; Y < n; Y++) for (let X = 0; X < n; X++) {
    const x = r === 1 ? X : rtsWL2(X), y = r === 1 ? Y : rtsWL2(Y);
    // distance into the dark from the explored sides (rounded where two meet)
    const q = [];
    for (let b = 0; b < 4; b++) {
      if (!open[b]) continue;
      const along = b === 0 || b === 2 ? x : y, dist = b === 0 ? y + 0.5 : b === 1 ? 15.5 - x : b === 2 ? 15.5 - y : x + 0.5;
      q.push(9 - dist + (rtsWEdgeN(along, 91 + (b & 1)) - 0.5) * 3);
    }
    let a = 1;
    if (q.length) {
      let l2 = 0, mx = -99;
      for (const v of q) { if (v > 0) l2 += v * v; mx = Math.max(mx, v); }
      const s = Math.sqrt(l2) + Math.min(mx, 0);   // > 0 inside the soft edge
      a = Math.max(0, Math.min(1, 1 - s / 9));
    }
    const t = rtsWBayer(X, Y);
    if (r === 1) {
      // three steps: clear, a half-dark dither, solid
      if (a > 0.66 + (t - 0.5) * 0.3) P.dpx(X, Y, '#000000');
      else if (a > 0.2 + (t - 0.5) * 0.35) P.dpx(X, Y, '#000000', t < 0.5 ? 0.82 : 0.55);
      else if (a > 0.04 && t < 0.25) P.dpx(X, Y, '#000000', 0.45);
    } else {
      // finer at res 2: solid, two dithered greys, a sparse fringe
      if (a > 0.7 + (t - 0.5) * 0.24) P.dpx(X, Y, '#000000');
      else if (a > 0.45 + (t - 0.5) * 0.3) P.dpx(X, Y, '#000000', t < 0.5 ? 0.88 : 0.7);
      else if (a > 0.2 + (t - 0.5) * 0.3) P.dpx(X, Y, '#000000', t < 0.5 ? 0.62 : 0.45);
      else if (a > 0.04 && t < 0.3) P.dpx(X, Y, '#000000', 0.35);
    }
  }
  return (RTS_W_SHROUD[key] = P.canvas());
}
// rtsDrawShroud(ctx, x, y, mask, res): the unexplored dark over a 16*res cell at canvas px x, y
function rtsDrawShroud(ctx, x, y, mask, res) {
  mask = (mask | 0) & 15;
  const r = rtsWRes(res);
  if (!mask) { ctx.fillStyle = '#000000'; ctx.fillRect(x, y, 16 * r, 16 * r); return; }
  ctx.drawImage(rtsWShroudTile(mask, r), x, y);
}

// ------------------------------------------------------------------ the glimmer bloom
// a buried bulb that has pushed up through the sand: cracked open a little, the glow inside pulsing
function rtsWBloomPaint(frame, v = 0, r = 1) {
  if (r === 2) return rtsWBloomPaint2(frame, v);
  const P = new RtsWPaint(16, 16), G = RTS_W_C.glim, S = RTS_W_C.sand, f = frame & 3;
  const cx = 8, cy = 8.5, glow = [0.5, 0.8, 1, 0.75][f];
  // the mound of sand pushed up round it, and its shadow
  P.ell(cx + 1, cy + 1.5, 6.5, 5, '#000000', 0.25);
  P.ell(cx, cy + 0.5, 6.5, 5, S[3]);
  P.ell(cx - 0.6, cy, 5.8, 4.4, S[1]);
  P.ell(cx + 0.6, cy + 1, 5, 3.8, S[2]);
  // the bulb: a fleshy dome, dark red-brown, ribbed
  P.disc(cx, cy, 4.2, '#5C2010');
  P.disc(cx - 0.3, cy - 0.3, 3.7, '#8C3418');
  P.disc(cx - 0.9, cy - 0.9, 2.4, '#B4502C');
  P.px(cx - 2, cy - 3, '#D87850'); P.px(cx - 3, cy - 2, '#D87850');
  for (const [a, b] of [[-3, 0], [3, 0], [0, -3], [0, 3]]) P.line(cx, cy, cx + a * 1.2, cy + b * 1.2, '#5C2010');
  // the glowing cracks
  const hot = glow > 0.9 ? G[0] : glow > 0.7 ? G[1] : G[2];
  for (const [x, y] of [[8, 8], [9, 8], [7, 9], [8, 6], [10, 9], [6, 8], [8, 10]]) P.px(x, y, (x + y) & 1 ? hot : G[2]);
  if (glow > 0.7) { P.px(9, 7, G[1]); P.px(7, 7, G[3]); }
  // grains of glimmer already spilled round it
  for (const [x, y] of [[2, 10], [13, 7], [12, 12], [4, 4], [11, 3]]) if (rtsWHash(x, y, 95 + v) < 0.7) P.px(x, y, G[(x + f) & 1 ? 2 : 3]);
  return P;
}
// the bloom at res 2: the sand heaved up round it in a lit mound with cracks, the bulb a ribbed fleshy dome split
// by fissures glowing from within (pulsing), its glow spilling on the sand, crystals already scattered
function rtsWBloomPaint2(frame, v = 0) {
  const P = new RtsWPaint(16, 16, 2), G = RTS_W_C.glim, S = RTS_W_C.sand, f = frame & 3, glow = [0.5, 0.8, 1, 0.75][f];
  const cx = 8, cy = 8.5, FL = ['#F0A080', '#D06C48', '#A84828', '#82341A', '#5C2010', '#3A1208'];
  P.ell(cx + 1.2, cy + 1.8, 6.6, 5.1, '#000000', 0.22);
  for (let Y = 0; Y < 32; Y++) for (let X = 0; X < 32; X++) {
    const dx = (X + 0.5) / 2 - cx, dy = (Y + 0.5) / 2 - (cy + 0.5), u = dx / 6.5, w = dy / 5, d2 = u * u + w * w;
    if (d2 > 1) continue;
    // the mound: lit on its top-left slope, shaded down its far side, rays of cracked crust
    const l = (-u * 0.7 - w * 0.8) * Math.sqrt(d2) * 1.6;
    let i = 2.2 - l * 1.6 + (rtsWBayer(X, Y) - 0.5) * 0.7;
    if (d2 > 0.82) i += 0.6;
    const a = Math.atan2(w, u), ray = Math.abs(((a * 7 / Math.PI + 7.5 + rtsWNoise(a * 3, 1, 97) * 0.6) % 1) - 0.5) < 0.05 && d2 > 0.42 && d2 < 0.9;
    if (ray) i += 1.6;
    P.dpx(X, Y, S[rtsWClampI(i, 6)]);
  }
  // the glow on the sand round the bulb
  for (let Y = 0; Y < 32; Y++) for (let X = 0; X < 32; X++) {
    const d = Math.hypot((X + 0.5) / 2 - cx, (Y + 0.5) / 2 - cy);
    if (d > 4.2 && d < 6.2 && rtsWBayer(X, Y) < (6.2 - d) / 2 * glow * 0.8) P.tint(X, Y, G[2], 0.35 * glow);
  }
  // the bulb: a dome lit from the top left, its ribs, its tip
  P.disc(cx + 0.4, cy + 0.5, 4.4, FL[5]);
  for (let Y = 0; Y < 32; Y++) for (let X = 0; X < 32; X++) {
    const dx = ((X + 0.5) / 2 - cx) / 4.2, dy = ((Y + 0.5) / 2 - cy) / 4.2, d2 = dx * dx + dy * dy;
    if (d2 > 1) continue;
    const l = -dx * 0.6 - dy * 0.75 + Math.sqrt(1 - d2) * 0.55, a = Math.atan2(dy, dx);
    let i = l > 0.85 ? 0 : l > 0.5 ? 1 : l > 0.15 ? 2 : l > -0.25 ? 3 : 4;
    const rib = Math.abs(((a * 3 / Math.PI + 6.25) % 1) - 0.5);
    if (rib < 0.07 && d2 > 0.12) i = Math.min(5, i + 1); else if (rib > 0.36 && rib < 0.42 && i > 0 && d2 > 0.1) i--;
    P.dpx(X, Y, FL[i]);
  }
  P.disc(cx - 1.6, cy - 1.9, 0.9, '#F8C0A0'); P.fp(cx - 2, cy - 2.5, '#FFF0E0');
  // the fissures, glowing from within, hotter as it pulses
  const hot = glow > 0.9 ? G[0] : glow > 0.7 ? G[1] : G[2];
  const cracks = [[[8, 8], [9, 7.5], [9.5, 6.5], [10.5, 6]], [[8, 8], [7, 8.5], [6, 8], [5.5, 9]], [[8, 8], [8.5, 9.5], [8, 10.5], [9, 11.5]], [[8, 8], [7.5, 7], [7.5, 5.5]]];
  for (const c of cracks) for (let k = 0; k + 1 < c.length; k++) {
    P.fline(c[k][0], c[k][1], c[k + 1][0], c[k + 1][1], G[3]);
    P.fline(c[k][0] + 0.5, c[k][1], c[k + 1][0] + 0.5, c[k + 1][1], k ? G[2] : hot);
  }
  P.disc(8.25, 8.25, 0.9, hot); P.fp(8, 8, glow > 0.9 ? '#FFFFFF' : G[0]);
  if (glow > 0.7) for (const [x, y] of [[10.5, 5.5], [5, 9], [9, 12], [7.5, 5]]) P.fp(x, y, G[1], glow);
  // crystals spilled round it
  const R = rtsWSeeded(95 + v * 3);
  for (let k = 0; k < 7; k++) {
    const a = R() * Math.PI * 2, d = 5 + R() * 2.4, X = Math.round((cx + Math.cos(a) * d) * 2), Y = Math.round((cy + 0.5 + Math.sin(a) * d * 0.8) * 2);
    if (X < 1 || Y < 1 || X > 29 || Y > 29) continue;
    P.dpx(X, Y, G[(k + f) & 1 ? 1 : 0]); P.dpx(X + 1, Y, G[2]); P.dpx(X, Y + 1, G[3]); P.dpx(X + 1, Y + 1, G[5]);
  }
  return P;
}
// rtsBloomArt(frame, res) -> canvas 16*res square
const RTS_W_BLOOM = [];
function rtsBloomArt(frame, res) {
  const f = ((frame | 0) % 4 + 4) % 4, r = rtsWRes(res), k = f + (r - 1) * 4;
  return RTS_W_BLOOM[k] || (RTS_W_BLOOM[k] = rtsWBloomPaint(f, 0, r).canvas());
}

// ------------------------------------------------------------------ the Houses' emblems ('#' the figure, '+' its dark detail)
const RTS_W_EMBLEMS = {
  aquila: [      // an eagle, wings spread, head turned
    '....##...',
    '#...#++.#',
    '##..##.##',
    '###.#.###',
    '#########',
    '.#######.',
    '..#####..',
    '...###...',
    '..#.#.#..',
  ],
  drakon: [      // a ram's skull, its horns curled
    '##.....##',
    '#.#...#.#',
    '#..###..#',
    '.#######.',
    '..#+#+#..',
    '..#####..',
    '...#+#...',
    '...###...',
    '...#.#...',
  ],
  serpens: [     // a coiled serpent, its head raised
    '.....##..',
    '....#+##.',
    '....##...',
    '..###....',
    '.#...##..',
    '#..##..#.',
    '#.#..#.#.',
    '#..##..#.',
    '.#....#..',
    '..####...',
  ],
  regent: [      // a crown
    '#...#...#',
    '#..###..#',
    '##.###.##',
    '#########',
    '#+#+#+#+#',
    '#########',
  ],
  nomad: [       // a crescent and a star
    '..###....',
    '.##......',
    '##....#..',
    '##...###.',
    '##....#..',
    '.##......',
    '..###....',
  ],
};
// the emblems drawn finer for res 2 (17 wide; 'o' a lit touch)
const RTS_W_EMBLEMS2 = {
  aquila: [
    '#......###......#',
    '##....####.....##',
    '#+#..##+##....#+#',
    '##+#..+###...#+##',
    '###+#..###..#+###',
    '.###+#######+###.',
    '..###+#####+###..',
    '....##o###o##....',
    '.....#######.....',
    '......#####......',
    '.....#.###.#.....',
    '....+#.###.#+....',
    '......#####......',
    '.....##.#.##.....',
    '.....#..#..#.....',
  ],
  drakon: [
    '..###.......###..',
    '.##o##.....##o##.',
    '##..+##...##+..##',
    '#..#.+#...#+.#..#',
    '#.##..#####..##.#',
    '.##.##o###o##.##.',
    '..##o#######o##..',
    '...###########...',
    '...#+++###+++#...',
    '...##++###++##...',
    '....#########....',
    '.....###+###.....',
    '.....##+++##.....',
    '......#####......',
    '......#+#+#......',
    '.......###.......',
    '.......#.#.......',
  ],
  serpens: [
    '......####.......',
    '.....#o####..+...',
    '.....##+###++....',
    '......#####..+...',
    '.......###.......',
    '........##.......',
    '........##.......',
    '.......##........',
    '....#####........',
    '..###o#####......',
    '.##.......###....',
    '##..#####...##...',
    '#..##o..##...#...',
    '#..#..+.##...##..',
    '#..##...##...#...',
    '##..######..##...',
    '.##........##....',
    '..###o######.....',
    '....#####........',
  ],
  regent: [
    '.#.............#.',
    '###...........###',
    '.#.....###.....#.',
    '.##...#####...##.',
    '.###.##o#o##.###.',
    '.###############.',
    '.##+##+###+##+##.',
    '.###############.',
    '.#+#o#+#o#+#o#+#.',
    '.###############.',
    '..#############..',
  ],
  nomad: [
    '.....####........',
    '...###o..........',
    '..##o............',
    '.##o.........#...',
    '.##.........###..',
    '##.........#####.',
    '##........###o###',
    '##.........#####.',
    '.##.........###..',
    '.##..........#...',
    '..##.............',
    '...###...........',
    '.....####........',
  ],
};
// a House's emblem with its top-left at x, y (s: scale); col the figure, dark its detail. At res 2 (scale 1) the
// finer drawing of RTS_W_EMBLEMS2 in the same place, embossed (a shade under its lower right edges)
function rtsWEmblem(P, house, x, y, col, dark, s = 1) {
  if (P.s === 2 && s === 1) {
    const E2 = RTS_W_EMBLEMS2[house] || RTS_W_EMBLEMS2.regent, h1 = rtsWEmblemSize(house)[1];
    const X0 = Math.round(x * 2), Y0 = Math.round(y * 2) + ((h1 * 2 - E2.length) >> 1), lite = rtsWHex(rtsWMix(col, '#FFFFFF', 0.55));
    const at = (i, j) => j >= 0 && j < E2.length && i >= 0 && i < E2[j].length && E2[j][i] !== '.';
    for (let j = 0; j <= E2.length; j++) for (let i = 0; i <= 17; i++) if (!at(i, j) && at(i - 1, j - 1)) P.shade(X0 + i, Y0 + j, 0.7);
    E2.forEach((row, j) => { for (let i = 0; i < row.length; i++) { const ch = row[i]; if (ch !== '.') P.dpx(X0 + i, Y0 + j, ch === '#' ? col : ch === '+' ? dark : lite); } });
    return;
  }
  const E = RTS_W_EMBLEMS[house] || RTS_W_EMBLEMS.regent;
  E.forEach((row, j) => { for (let i = 0; i < row.length; i++) if (row[i] !== '.') P.rect(x + i * s, y + j * s, s, s, row[i] === '#' ? col : dark); });
}
const rtsWEmblemSize = house => { const E = RTS_W_EMBLEMS[house] || RTS_W_EMBLEMS.regent; return [E[0].length, E.length]; };

// ------------------------------------------------------------------ brushes for buildings
// (each draws as it always did at res 1; at res 2 the edges are hairlines and there is more on them)
const RTS_W_M = RTS_W_C.metal;
const RTS_W_OUT = '#1A140F';
const rtsWMixH = (a, b, t) => rtsWHex(rtsWMix(a, b, t));
// a block seen from above at a slant: its roof (top: hi, mid, lo), its south face d px tall (side: hi, mid, lo)
function rtsWBox(P, x, y, w, h, d, top, side) {
  const rh = h - d;
  if (P.s === 1) {
    P.rect(x, y, w, rh, top[1]);
    P.rect(x, y, w, 1, top[0]); P.rect(x, y, 1, rh, top[0]);
    P.rect(x + w - 1, y + 1, 1, rh - 1, top[2]); P.rect(x + 1, y + rh - 1, w - 1, 1, top[2]);
    if (d > 0) {
      P.rect(x, y + rh, w, d, side[1]);
      P.rect(x, y + rh, 1, d, side[0]);
      P.rect(x + w - 1, y + rh, 1, d, side[2]);
      P.rect(x, y + h - 1, w, 1, side[2]);
    }
    return;
  }
  // res 2: a two-step lit lip along the top and left, a two-step dark one along the right and the eave; the face
  // with the shadow under the eave, its lit corner, its plinth
  const q = P.q, t01 = rtsWMixH(top[0], top[1], 0.5), t12 = rtsWMixH(top[1], top[2], 0.5);
  P.rect(x, y, w, rh, top[1]);
  // a little grit on the roof
  P.each(x + 2 * q, y + 2 * q, x + w - 2 * q, y + rh - 2 * q, (lx, ly, X, Y) => { const hh = rtsWHash(X, Y, 88); return hh < 0.03 ? t12 : hh > 0.978 ? t01 : null; });
  if (d >= 4) for (let i = x + 4; i < x + w - 2; i += 4) P.rect(i, y + rh + 2 * q, q, d - 4 * q, rtsWMixH(side[1], side[2], 0.6));
  P.rect(x + q, y + q, w - 2 * q, q, t01); P.rect(x + q, y + q, q, rh - 2 * q, t01);
  P.rect(x + w - 2 * q, y + 2 * q, q, rh - 3 * q, t12); P.rect(x + 2 * q, y + rh - 2 * q, w - 3 * q, q, t12);
  P.rect(x, y, w, q, top[0]); P.rect(x, y, q, rh, top[0]);
  P.rect(x + w - q, y + q, q, rh - q, top[2]); P.rect(x + q, y + rh - q, w - q, q, top[2]);
  if (d > 0) {
    P.rect(x, y + rh, w, d, side[1]);
    P.rect(x, y + rh, w, q, rtsWMixH(side[2], '#000000', 0.3));
    P.rect(x, y + rh + q, q, d - q, side[0]);
    P.rect(x + w - q, y + rh, q, d, side[2]);
    P.rect(x, y + h - q, w, q, side[2]);
    if (d >= 3) P.rect(x + q, y + h - 2 * q, w - 2 * q, q, rtsWMixH(side[1], side[2], 0.5));
  }
}
const rtsWRoof = () => [RTS_W_M[1], RTS_W_M[2], RTS_W_M[3]];
const rtsWSide = () => [RTS_W_M[3], RTS_W_M[4], RTS_W_M[5]];
const rtsWHRoof = H => [H[0], H[1], H[2]];
const rtsWHSide = H => [H[1], H[2], rtsWHex(rtsWMix(H[2], '#000000', 0.4))];
// seams along a roof (at res 2 an engraved line, lit on its lower side, rivets along it)
function rtsWSeams(P, x, y, w, h, step, col, vertical) {
  if (P.s === 1) {
    if (vertical) for (let i = x + step; i < x + w - 1; i += step) P.rect(i, y + 1, 1, h - 2, col);
    else for (let j = y + step; j < y + h - 1; j += step) P.rect(x + 1, j, w - 2, 1, col);
    return;
  }
  const q = P.q, lite = rtsWMixH(col, '#FFFFFF', 0.45), dk = rtsWMixH(col, '#000000', 0.35);
  if (vertical) for (let i = x + step; i < x + w - 1; i += step) {
    P.rect(i, y + 1, q, h - 2, col); P.rect(i + q, y + 1, q, h - 2, lite);
    for (let j = y + 2; j < y + h - 2; j += 2) P.fp(i - q, j, dk);
  } else for (let j = y + step; j < y + h - 1; j += step) {
    P.rect(x + 1, j, w - 2, q, col); P.rect(x + 1, j + q, w - 2, q, lite);
    for (let i = x + 2; i < x + w - 2; i += 2) P.fp(i, j - q, dk);
  }
}
// a row of windows (glass with a glint), lit warm when `lit`; at res 2 framed, with a mullion
function rtsWWindows(P, x, y, n, w, h, gap, lit) {
  const G = RTS_W_C.glass;
  for (let k = 0; k < n; k++) {
    const wx = x + k * (w + gap);
    P.rect(wx, y, w, h, lit ? '#F8D070' : G[2]);
    P.rect(wx, y, w, 1, lit ? '#FCF0B0' : G[1]);
    P.px(wx, y, lit ? '#FFFFFF' : G[0]);
    P.rect(wx, y + h - 1, w, 1, lit ? '#D89030' : G[3]);
    if (P.s > 1) {
      const q = P.q;
      P.rect(wx, y, w, h, lit ? '#F0B848' : G[2]);
      P.rect(wx, y, w, h / 2, lit ? '#F8D878' : G[1]);
      P.fline(wx + q, y + h - 2 * q, wx + w * 0.6, y + q, lit ? '#FCF0C0' : G[0]);
      P.fp(wx + q, y + q, '#FFFFFF');
      if (w >= 2) P.rect(wx + Math.floor(w / 2 * 2) / 2, y, q, h, lit ? '#B07020' : G[3]);
      P.fframe(wx - q, y - q, w + 2 * q, h + 2 * q, '#2A2420');
      P.rect(wx - q, y + h, w + 2 * q, q, RTS_W_M[1]);
    }
  }
}
// slatted vents
function rtsWVent(P, x, y, w, h) {
  P.rect(x, y, w, h, RTS_W_M[5]);
  if (P.s === 1) {
    for (let j = y; j < y + h; j += 2) P.rect(x, j, w, 1, RTS_W_M[3]);
    P.rect(x, y, w, 1, RTS_W_M[6]);
    return;
  }
  const q = P.q;
  for (let j = y + q; j < y + h - q / 2; j += 2 * q) { P.rect(x + q, j, w - 2 * q, q, RTS_W_M[2]); P.rect(x + q, j + q, w - 2 * q, q, RTS_W_M[6]); }
  P.fframe(x, y, w, h, RTS_W_M[6]);
  P.rect(x, y + h, w, q, RTS_W_M[2]);
}
// yellow and black hazard stripes
function rtsWHazard(P, x, y, w, h, ph = 0) {
  if (P.s === 1) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) P.px(i, j, ((i + j + ph) >> 1) & 1 ? RTS_W_C.hazard[0] : RTS_W_C.hazard[1]); return; }
  P.each(x, y, x + w, y + h, (lx, ly, X, Y) => ((X + Y + ph * 2) >> 2) & 1 ? RTS_W_C.hazard[0] : RTS_W_C.hazard[1]);
  if (h >= 1) { P.rect(x, y, w, P.q, '#FCE878'); }
}
// a pipe from one point to another (axis-aligned runs), lit on its top/left; at res 2 rounded, with flanges
function rtsWPipe(P, pts, col = RTS_W_M) {
  const hi = P.s > 1, q = P.q;
  for (let k = 0; k + 1 < pts.length; k++) {
    const [x0, y0] = pts[k], [x1, y1] = pts[k + 1];
    if (y0 === y1) {
      const a = Math.min(x0, x1), b = Math.max(x0, x1);
      P.rect(a, y0, b - a + 2, 2, col[3]); P.rect(a, y0, b - a + 2, 1, col[1]);
      if (hi) {
        P.rect(a, y0, b - a + 2, q, col[0]); P.rect(a, y0 + 1, b - a + 2, q, col[2]); P.rect(a, y0 + 1.5, b - a + 2, q, col[4]);
        for (let i = a + 1.5; i < b + 1; i += 3) { P.rect(i, y0 - q, q, 2 + 2 * q, col[1]); P.rect(i + q, y0 - q, q, 2 + 2 * q, col[5]); }
      }
    } else {
      const a = Math.min(y0, y1), b = Math.max(y0, y1);
      P.rect(x0, a, 2, b - a + 2, col[3]); P.rect(x0, a, 1, b - a + 2, col[1]);
      if (hi) {
        P.rect(x0, a, q, b - a + 2, col[0]); P.rect(x0 + 1, a, q, b - a + 2, col[2]); P.rect(x0 + 1.5, a, q, b - a + 2, col[4]);
        for (let j = a + 1.5; j < b + 1; j += 3) { P.rect(x0 - q, j, 2 + 2 * q, q, col[1]); P.rect(x0 - q, j + q, 2 + 2 * q, q, col[5]); }
      }
    }
  }
}
// a vertical round tank: its lit cap (an ellipse), its body shaded across, the band in house colours; at res 2
// shaded in more steps, welded rings round it, rivets on the band, a hatch on the cap
function rtsWTank(P, cx, top, r, h, pal, band) {
  const ry = Math.max(2, Math.round(r * 0.55)), hi = P.s > 1, q = P.q;
  const across = x => (x + 0.5 - (cx - r)) / (2 * r);
  if (!hi) {
    for (let y = top; y < top + h; y++) for (let x = Math.floor(cx - r); x < cx + r; x++) {
      const u = across(x);
      P.px(x, y, pal[u < 0.18 ? 1 : u < 0.55 ? 2 : u < 0.85 ? 3 : 4]);
    }
  } else {
    P.each(cx - r, top, cx + r, top + h, (x, y, X, Y) => {
      const u = across(x), t = u < 0.1 ? 1.4 : u < 0.22 ? 1 : u < 0.5 ? 2 : u < 0.7 ? 2.6 : u < 0.88 ? 3.3 : 4.2;
      return pal[Math.max(0, Math.min(5, Math.round(t + (rtsWBayer(X, Y) - 0.5) * 0.6)))];
    });
    // welded rings
    for (let y = top + 3; y < top + h - 1; y += 4) P.each(cx - r, y, cx + r, y + q, (x) => pal[Math.min(5, (across(x) < 0.5 ? 3 : 4))]);
  }
  P.ell(cx, top + h, r, ry, pal[4]);
  for (let x = Math.floor(cx - r); x < cx + r; x++) { const u = (x + 0.5 - (cx - r)) / (2 * r); P.px(x, top + h + Math.round(Math.sqrt(Math.max(0, 1 - (2 * u - 1) ** 2)) * ry) - 1, pal[5]); }
  if (band) {
    const by = top + Math.round(h * 0.35);
    if (!hi) { for (let y = by; y < by + 2; y++) for (let x = Math.floor(cx - r); x < cx + r; x++) { const u = (x + 0.5 - (cx - r)) / (2 * r); P.px(x, y, band[u < 0.3 ? 0 : u < 0.75 ? 1 : 2]); } }
    else {
      P.each(cx - r, by, cx + r, by + 2, (x, y) => { const u = across(x); return band[u < 0.25 ? 0 : u < 0.72 ? 1 : 2]; });
      P.each(cx - r, by, cx + r, by + q, (x) => rtsWMixH(band[across(x) < 0.5 ? 0 : 1], '#FFFFFF', 0.25));
      for (let x = cx - r + 1; x < cx + r - 0.5; x += 1.5) P.fp(x, by + 1, band[2]);
    }
  }
  P.ell(cx, top, r, ry, pal[2]);
  P.ell(cx - 0.5, top - 0.5, r - 1, ry - 0.6, pal[1]);
  P.px(Math.round(cx - r * 0.45), top - 1, pal[0]);
  if (hi) {
    // the cap: its rim lit, a hatch with its hinge
    P.ell(cx - 0.5, top - 0.5, r - 1, ry - 0.6, pal[1]);
    P.each(cx - r, top - ry - 1, cx + r, top + ry + 1, (x, y) => {
      const u = (x + 0.5 - cx) / r, v = (y + 0.5 - top) / ry, d = u * u + v * v;
      return d <= 1 && d > 0.78 ? (u + v < 0 ? pal[0] : pal[3]) : null;
    });
    if (r >= 3) {
      // a round hatch: its rim, its lid lit, the hinge and the handle
      const hx = cx + r * 0.22, hr = Math.max(1, r * 0.3), hry = Math.max(0.8, ry * 0.36);
      P.each(hx - hr - 1, top - hry - 1, hx + hr + 1, top + hry + 1, (x, y) => {
        const u = (x + 0.5 - hx) / hr, v = (y + 0.5 - top) / hry, d = u * u + v * v;
        return d > 1.45 ? null : d > 1 ? pal[3] : u + v < -0.6 ? pal[0] : pal[1];
      });
      P.fp(hx - hr - q, top, pal[4]); P.fline(hx - hr * 0.4, top + hry * 0.2, hx + hr * 0.4, top + hry * 0.2, pal[3]);
    }
  }
}
// a dome, shaded from the top left (at res 2 in finer steps)
function rtsWDome(P, cx, cy, r, pal, sq = 1) {
  const hi = P.s > 1;
  P.each(Math.floor(cx - r), Math.floor(cy - r * sq), Math.floor(cx + r) + 1, Math.floor(cy + r * sq) + 1, (x, y, X, Y) => {
    const dx = (x + 0.5 - cx) / r, dy = (y + 0.5 - cy) / (r * sq), d2 = dx * dx + dy * dy;
    if (d2 > 1) return null;
    const l = -dx * 0.6 - dy * 0.75 + Math.sqrt(1 - d2) * 0.5 + (hi ? (rtsWBayer(X, Y) - 0.5) * 0.18 : 0);
    return pal[l > 0.75 ? 0 : l > 0.35 ? 1 : l > -0.1 ? 2 : l > -0.45 ? 3 : 4];
  });
  if (hi) {
    const hx = cx - r * 0.42, hy = cy - r * sq * 0.45;
    P.fp(hx, hy, '#FFFFFF', 0.85); P.fp(hx + 0.5, hy, pal[0]); P.fp(hx, hy + 0.5, pal[0]);
  }
}
// a flag on its pole (the pole's foot at x, y), waving; at res 2 the cloth shaded in its folds, the House's mark
function rtsWFlag(P, H, house, x, y, f, len = 10) {
  P.rect(x, y - len, 1, len, RTS_W_M[1]); P.px(x, y - len - 1, '#F8D878');
  P.rect(x + 1, y - len + 1, 1, len - 1, RTS_W_M[4]);
  if (P.s === 1) {
    for (let i = 0; i < 7; i++) {
      const off = Math.round(Math.sin((i + f * 1.6) * 0.9) * 0.9);
      for (let j = 0; j < 5; j++) P.px(x + 1 + i, y - len + j + off + (i > 4 ? 0 : 0), j === 0 ? H[0] : j === 4 ? H[2] : i === 3 && j === 2 ? '#F8F0D0' : H[1]);
    }
    return;
  }
  const q = P.q;
  P.rect(x, y - len, q, len, RTS_W_M[0]); P.rect(x + 1 - q, y - len, q, len, RTS_W_M[3]);
  P.disc(x + 0.5, y - len - 0.5, 0.8, '#F8D878'); P.fp(x, y - len - 1, '#FFFFFF');
  P.each(x + 1, y - len - 2, x + 9, y - len + 7, (lx, ly) => {
    const i = lx + 0.5 - (x + 1), wave = Math.sin((i + f * 1.6) * 0.9) * 0.9 * Math.min(1, i / 2), j = ly + 0.5 - (y - len + wave);
    if (i < 0 || i > 7.5 || j < 0 || j > 5) return null;
    const slope = Math.cos((i + f * 1.6) * 0.9);
    if (j < 0.5) return H[0];
    if (j > 4.5) return H[2];
    const mk = Math.abs(i - 3.6) + Math.abs(j - 2.5) < 1.3;
    if (mk) return Math.abs(i - 3.6) + Math.abs(j - 2.5) < 0.6 ? H[1] : '#F8F0D0';
    return slope > 0.45 ? rtsWMixH(H[1], '#FFFFFF', 0.25) : slope < -0.45 ? H[2] : H[1];
  });
}
// a lamp (on/off); at res 2 in its housing, with a glow round it
function rtsWLamp(P, x, y, on, col = '#F83818') {
  if (P.s === 1) {
    P.px(x, y, on ? col : '#5C2018');
    if (on) { P.px(x - 1, y, col, 0.35); P.px(x + 1, y, col, 0.35); P.px(x, y - 1, col, 0.35); P.px(x, y + 1, col, 0.35); P.px(x, y, '#FFF0D0', 0.5); }
    return;
  }
  const q = P.q;
  if (on) for (let j = -2; j <= 3; j++) for (let i = -2; i <= 3; i++) { const d = Math.hypot(i - 0.5, j - 0.5); if (d > 1 && d < 2.9) P.fp(x + i * q, y + j * q, col, 0.42 * (1 - (d - 1) / 2)); }
  P.rect(x, y, 1, 1, on ? col : '#5C2018');
  P.fp(x, y, on ? '#FFF8E8' : '#A04030');
  P.fp(x + q, y + q, on ? rtsWMixH(col, '#000000', 0.25) : '#2C0C08');
}
// a roller door (open 0 shut .. 3 open): its frame, the slats rolling up, the dark inside (a glow when it opens)
function rtsWDoor(P, x, y, w, h, open, H) {
  P.rect(x - 1, y - 1, w + 2, h + 1, RTS_W_M[5]);
  P.rect(x, y, w, h, '#120C08');
  if (open > 0) { P.rect(x + 1, y + h - 3, w - 2, 3, '#2C2418'); P.rect(x + 2, y + h - 2, w - 4, 1, '#F8B848', 0.35 * open); }
  const shut = Math.round(h * (1 - open / 3));
  if (P.s === 1) {
    for (let j = 0; j < shut; j++) P.rect(x, y + j, w, 1, j % 2 ? RTS_W_M[3] : RTS_W_M[2]);
    if (shut > 0) P.rect(x, y + shut - 1, w, 1, RTS_W_M[4]);
    for (let j = 0; j < h; j++) { P.px(x - 1, y + j, ((j >> 1) & 1) ? RTS_W_C.hazard[0] : RTS_W_C.hazard[1]); P.px(x + w, y + j, ((j >> 1) & 1) ? RTS_W_C.hazard[0] : RTS_W_C.hazard[1]); }
    if (H) P.rect(x, y - 2, w, 1, H[1]);
    return;
  }
  const q = P.q;
  if (open > 0) {
    // inside: the floor lit, a crane hook and the shapes of the works
    P.rect(x + 1, y + 1, w - 2, h - 4, '#1C140E');
    for (let i = x + 1.5; i < x + w - 1; i += 2.5) P.rect(i, y + 1, q, h - 4, '#2A2018');
    P.rect(x + 1, y + h - 3, w - 2, 3, '#3A2E20');
    P.rect(x + 1.5, y + h - 2, w - 3, 1, '#F8B848', 0.4 * open);
    P.rect(x + 1, y + h - 3, w - 2, q, '#F8D080', 0.3 * open);
  }
  // the slats: two hairlines each, lit and shadowed; the bottom bar with its handle
  const shutq = h * (1 - open / 3);
  for (let j = 0; j < shutq - q / 2; j += 2 * q) { P.rect(x, y + j, w, q, RTS_W_M[2]); P.rect(x, y + j + q, w, q, RTS_W_M[3]); }
  if (shutq > q) {
    P.rect(x, y + shutq - 2 * q, w, 2 * q, RTS_W_M[4]); P.rect(x, y + shutq - 2 * q, w, q, RTS_W_M[1]);
    P.rect(x + w / 2 - 0.5, y + shutq - q, 1, q, RTS_W_M[5]);
  }
  // the frame: lit lintel, hazard posts either side in finer stripes
  P.rect(x - 1, y - 1, w + 2, q, RTS_W_M[2]);
  for (let j = 0; j < h; j += q) { const c = ((Math.floor(j * 2) >> 1) & 1) ? RTS_W_C.hazard[0] : RTS_W_C.hazard[1]; P.rect(x - 1, y + j, 1, q, c); P.rect(x + w, y + j, 1, q, c); }
  P.rect(x - 1 + q, y, q, h, '#000000', 0.3);
  if (H) { P.rect(x, y - 2, w, 1, H[1]); P.rect(x, y - 2, w, q, H[0]); }
}
// smoke puffs drifting up from a chimney top at x, y
function rtsWSmoke(P, x, y, f, n = 3) {
  for (let k = 0; k < n; k++) {
    const t = ((f + k * 4 / n) % 4) / 4, r = 1 + t * 1.6;
    P.disc(x + t * 3, y - 1 - t * 6, r, t < 0.5 ? '#A8A098' : '#888078', 0.75 - t * 0.5);
    if (P.s > 1) P.disc(x + t * 3 - r * 0.35, y - 1 - t * 6 - r * 0.35, r * 0.5, '#D0C8C0', (0.75 - t * 0.5) * 0.7);
  }
}
// welding sparks round x, y
function rtsWSparks(P, x, y, f) {
  const R = rtsWSeeded(f * 13 + x * 7 + y);
  if (P.s === 1) {
    P.px(x, y, '#FFFFFF');
    for (let k = 0; k < 4; k++) P.px(x + Math.round((R() - 0.5) * 5), y + Math.round((R() - 0.5) * 4), R() < 0.5 ? '#F8F070' : '#F8A830');
    return;
  }
  P.fp(x, y, '#FFFFFF'); P.fp(x + 0.5, y, '#FCF8C0'); P.fp(x, y + 0.5, '#FCF8C0'); P.fp(x + 0.5, y + 0.5, '#F8F070');
  for (let k = 0; k < 7; k++) {
    const a = R() * Math.PI * 2, l = 1 + R() * 2.2, c = R() < 0.5 ? '#F8F070' : '#F8A830';
    P.fline(x + 0.25 + Math.cos(a) * 0.6, y + 0.25 + Math.sin(a) * 0.6, x + 0.25 + Math.cos(a) * l, y + 0.25 + Math.sin(a) * l * 0.8 + l * 0.2, c, 0.85);
  }
}
// ---- res 2 extras
// rivets round a panel
function rtsWRivets(P, x, y, w, h, step, col, lite) {
  for (let i = x + 0.5; i < x + w - 0.4; i += step) { P.fp(i, y + 0.5, col); P.fp(i, y + h - 1, col); if (lite) { P.fp(i, y, lite); } }
  for (let j = y + 0.5 + step; j < y + h - 1; j += step) { P.fp(x + 0.5, j, col); P.fp(x + w - 1, j, col); }
}
// a ladder up a face (x: its left rail)
function rtsWLadder(P, x, y0, y1, col = RTS_W_M[1], dk = RTS_W_M[5]) {
  const q = P.q;
  P.rect(x, y0, q, y1 - y0, col); P.rect(x + 1, y0, q, y1 - y0, col);
  P.rect(x + q, y0, q, y1 - y0, dk, 0.5);
  for (let j = y0 + 0.5; j < y1; j += 1) P.rect(x, j, 1 + q, q, col);
}
// a railing along a roof edge
function rtsWRail(P, x0, x1, y, col = RTS_W_M[1], dk = RTS_W_M[5]) {
  const q = P.q;
  P.rect(x0, y, x1 - x0, q, col); P.rect(x0, y + q, x1 - x0, q, dk, 0.6);
  for (let i = x0; i <= x1; i += 1.5) { P.rect(i, y, q, 1, col); P.fp(i + q, y + 1, dk); }
}
// a roof fan unit: a box with a round grille, the blades turning with f
function rtsWFanBox(P, x, y, w, f = 0) {
  const M = RTS_W_M, q = P.q, c = x + w / 2, r = w / 2 - 0.5;
  rtsWBox(P, x, y, w, w + 1, 1, [M[1], M[2], M[4]], [M[3], M[4], M[5]]);
  P.disc(c, y + w / 2, r, M[6]); P.disc(c, y + w / 2, r - q, M[5]);
  for (let k = 0; k < 3; k++) { const a = f * 0.7 + k * Math.PI * 2 / 3; P.fline(c, y + w / 2, c + Math.cos(a) * (r - q), y + w / 2 + Math.sin(a) * (r - q), M[2]); }
  P.fp(c - q, y + w / 2 - q, M[1]);
}
// an aerial: a thin mast with crossbars and a lamp
function rtsWAerial(P, x, y, h, f, col = '#F83818') {
  const M = RTS_W_M, q = P.q;
  P.rect(x, y, q, h, M[1]); P.rect(x + q, y, q, h, M[4]);
  for (let j = y + 1.5; j < y + h - 1; j += 2) P.rect(x - 1, j, 2 + q, q, M[3]);
  P.fp(x, y - q, f ? col : '#5C2018'); if (f) { P.fp(x - q, y - q, col, 0.4); P.fp(x + q, y - q, col, 0.4); P.fp(x, y - 2 * q, col, 0.4); }
}
// a grating (a dark floor of bars)
function rtsWGrate(P, x, y, w, h, bar = RTS_W_M[4], gap = RTS_W_M[6]) {
  const q = P.q;
  P.rect(x, y, w, h, gap);
  for (let i = x + q; i < x + w; i += 1) P.rect(i, y, q, h, bar);
  for (let j = y + 2; j < y + h; j += 2.5) P.rect(x, j, w, q, bar);
}
// a crate (wood, or the House's colour)
function rtsWCrate(P, x, y, w, h, pal = ['#D8B070', '#A87C44', '#6C4C28']) {
  const q = P.q;
  P.rect(x, y, w, h, pal[1]);
  P.rect(x, y, w, q, pal[0]); P.rect(x, y, q, h, pal[0]); P.rect(x + w - q, y, q, h, pal[2]); P.rect(x, y + h - q, w, q, pal[2]);
  P.fline(x + q, y + q, x + w - 2 * q, y + h - 2 * q, pal[2]); P.fline(x + w - 2 * q, y + q, x + q, y + h - 2 * q, pal[2]);
  P.rect(x + w, y + q, q, h, '#000000', 0.3); P.rect(x + q, y + h, w, q, '#000000', 0.3);
}
// a drum seen from above
function rtsWDrum(P, x, y, col) {
  const q = P.q;
  P.disc(x + 1, y + 1, 1, rtsWMixH(col, '#000000', 0.45)); P.disc(x + 1 - q, y + 1 - q, 1 - q, col); P.fp(x + 0.5, y + 0.5, rtsWMixH(col, '#FFFFFF', 0.5));
  P.fp(x + 1.5, y + 1.5, '#000000', 0.4);
}
// ------------------------------------------------------------------ the buildings
// sizes in tiles; frames: how many animation frames each has (keys with an "active" state, marked *, use frames
// 4..7 for it: the yard building, the refinery unloading, factories producing, the repair pad at work)
const RTS_W_SIZE = {
  slab1: [1, 1], slab4: [2, 2], yard: [2, 2], vapor: [2, 2], refinery: [3, 2], silo: [2, 2], radar: [2, 2], barracks: [2, 2],
  hall: [2, 2], light: [2, 2], heavy: [3, 2], hightech: [3, 2], repair: [3, 2], lab: [2, 2], starport: [3, 3], palace: [3, 3],
  turret: [1, 1], rturret: [1, 1], wall: [1, 1],
};
const RTS_W_FRAMES = {
  slab1: 1, slab4: 1, yard: 8, vapor: 4, refinery: 8, silo: 4, radar: 8, barracks: 8, hall: 8, light: 8, heavy: 8, hightech: 8,
  repair: 8, lab: 4, starport: 8, palace: 4, turret: 1, rturret: 1, wall: 1,
};
const RTS_W_ACTIVE = { yard: 1, refinery: 1, barracks: 1, hall: 1, light: 1, heavy: 1, hightech: 1, repair: 1 };
const RTS_W_DOORS = { barracks: 1, hall: 1, light: 1, heavy: 1, hightech: 1 };

// Each draws in logical pixels (16 a tile) on a painter of scale res; at res 2 (hi) each adds its finer detail.
const RTS_W_DRAW = {
  // a slab of concrete, and four
  slab1(P) { rtsWSlab(P, 0, 0); },
  slab4(P) { for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) rtsWSlab(P, i * 16, j * 16); },

  // CONSTRUCTION YARD: the deck with its assembly square, the control house, the yellow crane swinging
  yard(P, H, house, f, st) {
    const M = RTS_W_M, C = RTS_W_C.conc, act = f >= 4, g = f & 3, Y = ['#FCE070', '#F8C800', '#B88C00', '#6C5000'], hi = P.s > 1, q = P.q;
    rtsWBox(P, 1, 8, 28, 21, 4, [C[1], C[2], C[4]], rtsWSide());
    if (hi) {
      // the deck's tread plate, tie-down bolts along its edge
      for (let y = 9.5; y < 24; y += 1.5) for (let x = 2.5 + ((y * 2) & 1 ? 0.75 : 0); x < 28; x += 1.5) P.fp(x, y, C[3]);
      for (let x = 3; x < 28; x += 4) { P.fp(x, 24, M[5]); P.fp(x + q, 24 + q, C[0]); }
    }
    rtsWHazard(P, 2, 25, 26, 2);
    // the assembly square: yellow corner marks, a frame of girders going up, a stack of beams
    for (const [x, y, sx, sy] of [[14, 13, 1, 1], [27, 13, -1, 1], [14, 23, 1, -1], [27, 23, -1, -1]]) { P.rect(Math.min(x, x + sx * 2), y, 3, 1, Y[1]); P.rect(x, Math.min(y, y + sy * 2), 1, 3, Y[1]); }
    P.rect(17, 15, 8, 6, C[3]);
    if (!hi) {
      P.frame(17, 17, 8, 5, M[5]); P.frame(17, 15, 8, 5, M[4]);
      for (const x of [17, 24]) P.rect(x, 15, 1, 7, M[5]);
      P.rect(17, 15, 8, 1, M[2]);
      for (let k = 0; k < 3; k++) { P.rect(3, 19 + k * 2, 9, 1, M[2]); P.rect(3, 20 + k * 2, 9, 1, M[5]); P.px(3, 19 + k * 2, M[1]); }
    } else {
      // a hull taking shape on its jig: the chassis, its wheels, girders round it and their braces
      P.rect(17, 15, 8, 6, C[4]); P.fframe(17, 15, 8, 6, C[5]);
      rtsWBox(P, 18.5, 16, 5, 4.5, 1, [M[2], M[3], M[4]], [M[4], M[5], M[6]]);
      for (const [x, y] of [[18, 16.5], [23, 16.5], [18, 18.5], [23, 18.5]]) { P.rect(x, y, 1, 1.5, M[6]); P.fp(x, y, M[4]); }
      P.rect(19.5, 17, 3, 1.5, M[5]); P.fp(19.5, 17, M[3]);
      P.fframe(17, 15, 8, 6.5, M[4]);
      for (const x of [17, 24.5]) { P.rect(x, 14, 0.5, 7.5, M[2]); P.rect(x + q, 14, q, 7.5, M[5]); }
      P.rect(17, 14, 8, q, M[1]); P.rect(17, 14 + q, 8, q, M[4]);
      P.fline(17.5, 14.5, 20.5, 16, M[4]); P.fline(24.5, 14.5, 21.5, 16, M[4]);
      // the stack of I-beams, their ends showing the profile
      for (let k = 0; k < 3; k++) {
        const y = 19 + k * 2;
        P.rect(3, y, 9, 1, M[2]); P.rect(3, y + 1, 9, 1, M[5]); P.rect(3, y, 9, q, M[1]); P.rect(3, y + 1, 9, q, M[4]);
        P.rect(2.5, y, 1.5, q, M[0]); P.rect(3, y + q, q, 1.5 - q, M[3]); P.rect(2.5, y + 1.5, 1.5, q, M[4]);
      }
      rtsWDrum(P, 12.5, 19, '#C04828'); rtsWDrum(P, 12.5, 21.5, '#C8A040');
    }
    if (act) { rtsWSparks(P, 18 + g * 2, 20, f); rtsWSparks(P, 23 - g, 16, f + 5); }
    // the control house: the House's roof with its emblem, windows along its face
    rtsWBox(P, 2, 1, 13, 16, 5, rtsWHRoof(H), rtsWSide());
    rtsWEmblem(P, house, 4, 2, H[0], H[2]);
    rtsWWindows(P, 3, 13, 3, 3, 2, 1, act);
    if (hi) { rtsWFanBox(P, 11.5, 2, 2.5, g); rtsWRivets(P, 2, 1, 13, 11, 2, H[2]); P.rect(2, 11.5, 13, q, rtsWMixH(H[2], '#000000', 0.3)); }
    // the crane: a yellow lattice tower at the back corner, its boom swinging out over the square, the hook
    const sw = act ? [0, 2, 4, 2][g] : [0, 1, 1, 0][g], tip = [15 + sw, 12 + (sw >> 1)];
    const hy = tip[1] + 3 + (act ? (g & 1) * 2 : 0);
    if (!hi) {
      for (let y = 1; y < 19; y++) { P.px(24, y, Y[0]); P.px(25, y, Y[1]); P.px(27, y, Y[2]); P.px(26, y, (y & 3) === 0 ? Y[1] : (y & 1) ? Y[3] : M[5]); }
      P.rect(23, 18, 6, 2, M[4]); P.rect(23, 18, 6, 1, M[2]);
      P.rect(27, 1, 3, 3, M[5]); P.rect(27, 1, 3, 1, M[3]);
      P.line(25, 2, tip[0], tip[1] - 1, Y[0]); P.line(26, 3, tip[0] + 1, tip[1], Y[2]);
      for (let k = 1; k < 6; k++) P.px(Math.round(25.5 + (tip[0] - 25) * k / 6), Math.round(2.5 + (tip[1] - 2) * k / 6), Y[3]);
      P.rect(24, 0, 3, 2, M[4]); rtsWLamp(P, 25, 0, g < 2);
      P.rect(tip[0], tip[1] + 1, 1, hy - tip[1], M[5]);
      P.rect(tip[0] - 1, hy, 3, 1, M[3]); P.px(tip[0] + 1, hy + 1, M[4]);
      if (act) { P.rect(tip[0] - 3, hy + 2, 7, 1, M[2]); P.rect(tip[0] - 3, hy + 3, 7, 1, M[5]); }
      return;
    }
    // hi: a lattice tower (rails, ties and X braces you can see through), its foot, the operator's cab
    P.rect(23, 18, 6, 2, M[4]); P.rect(23, 18, 6, q, M[2]); P.rect(23, 19.5, 6, q, M[6]);
    for (const [x, c, d] of [[24, Y[0], Y[2]], [27, Y[1], Y[3]]]) { P.rect(x, 1, q, 17, c); P.rect(x + q, 1, q, 17, d); }
    for (let y = 1.5; y < 17.5; y += 2) { P.rect(24, y, 3.5, q, Y[1]); P.fline(24.5, y + 0.5, 26.5, y + 1.5, Y[2]); P.fline(26.5, y + 0.5, 24.5, y + 1.5, Y[2]); }
    P.rect(21.5, 5, 2.5, 2.5, Y[1]); P.rect(21.5, 5, 2.5, q, Y[0]); P.rect(22, 5.5, 1.5, 1, RTS_W_C.glass[1]); P.fp(22, 5.5, '#FFFFFF');
    // the counterweight (striped) on its jib behind, the slewing ring
    P.rect(25, 1.5, 5, 1, Y[2]); P.rect(25, 1.5, 5, q, Y[0]);
    rtsWBox(P, 27.5, 0.5, 2.5, 3.5, 1, [M[3], M[4], M[5]], [M[5], M[6], M[6]]); rtsWHazard(P, 27.5, 3, 2.5, 0.5);
    P.rect(24, 0, 3, 2, M[4]); P.rect(24, 0, 3, q, M[2]);
    rtsWLamp(P, 25, 0, g < 2);
    // the boom: two chords and the web between them, out to the tip
    const ax = 25, ay = 1.5, bx = 26, by = 3, n = 7;
    P.fline(ax, ay, tip[0], tip[1] - 1, Y[0]); P.fline(ax, ay + q, tip[0], tip[1] - 1 + q, Y[1]);
    P.fline(bx, by, tip[0] + 1, tip[1], Y[2]); P.fline(bx, by + q, tip[0] + 1, tip[1] + q, Y[3]);
    for (let k = 0; k < n; k++) {
      const t0 = k / n, t1 = (k + 1) / n;
      P.fline(ax + (tip[0] - ax) * t0, ay + (tip[1] - 1 - ay) * t0, bx + (tip[0] + 1 - bx) * t1, by + (tip[1] - by) * t1, Y[3]);
    }
    // the cable, the hook block and its hook; a beam on the hook while it works
    P.fline(tip[0] + 0.25, tip[1] + 0.5, tip[0] + 0.25, hy, M[5]); P.fline(tip[0] + 0.75, tip[1] + 0.5, tip[0] + 0.75, hy, M[6]);
    P.rect(tip[0] - 0.5, hy, 2, 1.5, Y[1]); P.rect(tip[0] - 0.5, hy, 2, q, Y[0]); P.rect(tip[0] + 1.5 - q, hy, q, 1.5, Y[3]);
    P.fp(tip[0], hy + 1.5, M[4]); P.fp(tip[0], hy + 2, M[4]); P.fp(tip[0] + 0.5, hy + 2.5, M[4]); P.fp(tip[0] + 1, hy + 2, M[3]);
    if (act) {
      P.fline(tip[0] + 0.5, hy + 2, tip[0] - 2.5, hy + 3, M[5]); P.fline(tip[0] + 0.5, hy + 2, tip[0] + 3.5, hy + 3, M[5]);
      P.rect(tip[0] - 3, hy + 3, 7, 1, M[2]); P.rect(tip[0] - 3, hy + 4, 7, 0.5, M[5]); P.rect(tip[0] - 3, hy + 3, 7, q, M[1]);
      P.rect(tip[0] - 3, hy + 3, q, 1.5, M[4]); P.rect(tip[0] + 4 - q, hy + 3, q, 1.5, M[6]);
    }
  },

  // VAPOR TRAP: a broad round tower drawing the air through its fan, condensers beside it, a mist rising
  vapor(P, H, house, f) {
    const M = RTS_W_M, hi = P.s > 1, q = P.q, C = RTS_W_C.conc;
    P.ell(15, 23, 13, 6, C[4]); P.ell(15, 22, 12, 5, C[2]); P.ell(15, 21.5, 11, 4, C[3]);
    if (hi) {
      // the round plinth: its lit rim, drain channel, bolts
      P.each(2, 16, 28, 29, (x, y) => { const u = (x + 0.5 - 15) / 12, v = (y + 0.5 - 22) / 5, d = u * u + v * v; return d <= 1 && d > 0.84 ? (u + v < -0.2 ? C[0] : u + v > 0.4 ? C[4] : C[1]) : null; });
      for (let k = 0; k < 10; k++) { const a = k * Math.PI / 5; P.fp(15 + Math.cos(a) * 10.5, 22 + Math.sin(a) * 4.3, C[5]); }
    }
    // a condenser tank and its pipe
    rtsWPipe(P, [[23, 18], [26, 18]]);
    rtsWTank(P, 27, 13, 2.5, 10, M, null);
    rtsWTank(P, 4, 14, 2.5, 9, M, null);
    rtsWPipe(P, [[5, 19], [8, 19]]);
    if (hi) for (const [cx, t, h] of [[27, 13, 10], [4, 14, 9]]) for (let y = t + 1.5; y < t + h - 0.5; y += 1) P.each(cx - 2.5, y, cx + 2.5, y + q, (x) => (x + 0.5 < cx ? M[3] : M[5]));
    // the tower
    rtsWTank(P, 15, 7, 10, 15, M, rtsWHRoof(H));
    for (let x = 8; x < 23; x += 3) P.rect(x, 15, 1, 5, M[x < 15 ? 3 : 5]);
    if (hi) {
      for (let x = 8; x < 23; x += 3) { P.rect(x, 15, q, 5, M[x < 15 ? 1 : 3]); P.rect(x + q, 15, q, 5, M[x < 15 ? 4 : 6]); }
      rtsWLadder(P, 21.5, 9, 21.5);
      P.rect(6, 20.5, 18, q, M[5]);
    }
    // the fan in its housing
    P.ell(15, 7, 10, 5.5, M[1]); P.ell(15, 7.5, 8.6, 4.4, M[5]); P.ell(15, 8, 7.6, 3.6, M[6]);
    if (hi) {
      // the cowl's lip, a grille of rings inside, the blades with their lit leading edges, the blur behind them
      P.each(4, 1, 26, 13, (x, y) => { const u = (x + 0.5 - 15) / 10, v = (y + 0.5 - 7) / 5.5, d = u * u + v * v; return d <= 1 && d > 0.82 ? (u + v < 0 ? M[0] : M[3]) : null; });
      for (const k of [0.45, 0.75]) P.each(6, 3, 24, 13, (x, y) => { const u = (x + 0.5 - 15) / (7.6 * k), v = (y + 0.5 - 8) / (3.6 * k), d = u * u + v * v; return Math.abs(d - 1) < 0.12 ? M[4] : null; });
      for (let k = 0; k < 4; k++) {
        const a = f * Math.PI / 8 + k * Math.PI / 2 - 0.35;
        for (let t = 0; t < 1; t += 0.2) P.fline(15, 8, 15 + Math.cos(a + t * 0.3) * 7, 8 + Math.sin(a + t * 0.3) * 3.3, M[5], 0.5);
      }
    }
    for (let k = 0; k < 4; k++) {
      const a = f * Math.PI / 8 + k * Math.PI / 2, ex = 15 + Math.cos(a) * 7.2, ey = 8 + Math.sin(a) * 3.4;
      const bx = 15 + Math.cos(a + 0.35) * 6.6, by = 8 + Math.sin(a + 0.35) * 3.1;
      P.poly([[15, 8], [ex, ey], [bx, by]], M[k & 1 ? 2 : 3]);
      if (hi) { P.fline(15, 8, ex, ey, M[0]); P.fline(15, 8.5, bx, by, M[4]); } else P.line(15, 8, ex, ey, M[1]);
    }
    P.ell(15, 8, 2, 1.4, H[1]); P.px(14, 7, H[0]);
    if (hi) { P.ell(15, 8, 2, 1.4, H[2]); P.ell(14.75, 7.75, 1.6, 1, H[1]); P.fp(14, 7.5, H[0]); for (let k = 0; k < 4; k++) P.fp(15 + Math.cos(k * 1.57 + 0.4) * 1.2, 8 + Math.sin(k * 1.57 + 0.4) * 0.8, M[1]); }
    // the mist: droplets drifting up off the fan
    for (let k = 0; k < 5; k++) { const t = ((f + k * 0.8) % 4) / 4; P.px(7 + k * 4 + Math.round(t * 2), 4 - Math.round(t * 4), '#E0F4FC', 0.8 - t * 0.6); }
    if (hi) for (let k = 0; k < 9; k++) { const t = ((f + k * 0.45) % 4) / 4; P.fp(6.5 + k * 2.2 + t * 1.5, 5 - t * 5 - (k & 1) * 0.5, '#F0FCFF', 0.75 - t * 0.6); }
    rtsWLamp(P, 27, 12, f < 2, '#58D8F8');
  },

  // REFINERY: the works with its two tall vats glowing, the chimney, the unloading pad with its hopper
  refinery(P, H, house, f) {
    const M = RTS_W_M, C = RTS_W_C.conc, G = RTS_W_C.glim, unl = f >= 4, g = f & 3, hi = P.s > 1, q = P.q;
    // the pad: hazard edge, the hopper's grating, the glow of glimmer pouring in
    rtsWBox(P, 27, 9, 19, 20, 3, [C[2], C[3], C[4]], rtsWSide());
    if (hi) { for (let x = 29; x < 45; x += 2) { P.fp(x, 23, C[4]); P.fp(x + 1, 12.5, C[4]); } for (let y = 12; y < 23; y += 1.5) { P.fp(28.5, y, C[4]); P.fp(44, y + 0.5, C[4]); } }
    rtsWHazard(P, 28, 10, 17, 1, 0); rtsWHazard(P, 28, 24, 17, 1, 1);
    P.rect(32, 13, 10, 9, M[6]);
    const glow = unl ? [G[2], G[1], G[0], G[1]][g] : G[4];
    P.rect(33, 14, 8, 7, unl ? G[3] : '#3C2014');
    if (hi) {
      // the hopper: a funnel shaded inward, the grating over it, glimmer heaped and glowing in its throat
      P.each(33, 14, 41, 21, (x, y, X, Y) => {
        const u = (x + 0.5 - 37) / 4, v = (y + 0.5 - 17.5) / 3.5, d = Math.max(Math.abs(u), Math.abs(v));
        const base = unl ? [G[1], G[2], G[3], G[4]] : ['#5C3418', '#4C2814', '#3C2014', '#2C160C'];
        return base[Math.min(3, Math.floor(d * 4 + (rtsWBayer(X, Y) - 0.5) * 0.6))];
      });
      P.fframe(32, 13, 10, 9, M[4]); P.rect(32, 13, 10, q, M[3]);
      for (let x = 33.5; x < 41; x += 1) P.rect(x, 14, q, 7, M[5]);
      for (let y = 15; y < 21; y += 2) P.rect(33, y, 8, q, M[5]);
      for (let y = 15; y < 21; y += 2) for (let x = 34; x < 41; x += 2) P.fp(x + 0.25, y + 0.5, glow);
    } else {
      for (let x = 33; x < 41; x += 2) P.rect(x, 14, 1, 7, M[5]);
      for (let y = 15; y < 21; y += 2) for (let x = 34; x < 41; x += 2) P.px(x, y, glow);
    }
    if (unl) for (let k = 0; k < (hi ? 12 : 6); k++) { const R = rtsWSeeded(f * 11 + k); const x = 33 + Math.floor(R() * 8), y = 13 + Math.floor(R() * 7) - g; if (hi) { P.fp(x + (R() < 0.5 ? 0.5 : 0), y + (R() < 0.5 ? 0.5 : 0), k & 1 ? G[0] : G[1]); } else P.px(x, y, k & 1 ? G[0] : G[1]); }
    rtsWLamp(P, 29, 12, unl ? g & 1 : g === 0, '#F8B800'); rtsWLamp(P, 43, 12, unl ? !(g & 1) : g === 2, '#F8B800');
    // the conveyor from the hopper into the works
    P.rect(24, 16, 9, 3, M[4]); P.rect(24, 16, 9, 1, M[2]);
    if (hi) {
      P.rect(24, 16.5, 9, 2, M[6]);
      for (let x = 24 + (g & 1) * 0.5; x < 33; x += 1) P.rect(x, 16.5, q, 2, M[5]);
      for (let x = 24.25 + g * 0.5; x < 32.5; x += 2) { P.fp(x, 17, unl ? G[1] : M[4]); P.fp(x + 0.5, 17.5, unl ? G[2] : M[4]); }
      P.rect(24, 16, 9, q, M[1]); P.rect(24, 18.5, 9, q, M[3]);
    } else for (let x = 24 + (g & 1); x < 32; x += 2) P.px(x, 17, unl ? G[2] : M[5]);
    // the works
    rtsWBox(P, 1, 6, 26, 22, 6, rtsWRoof(), rtsWSide());
    rtsWSeams(P, 1, 6, 26, 16, 4, M[3], true);
    P.rect(1, 22, 26, 2, H[1]); P.rect(1, 22, 26, 1, H[0]);
    if (hi) { P.rect(1, 23.5, 26, q, H[2]); for (let x = 2; x < 27; x += 3) P.fp(x, 22.75, H[2]); }
    rtsWVent(P, 3, 24, 6, 3); rtsWWindows(P, 12, 24, 3, 3, 2, 1, true);
    if (hi) { rtsWFanBox(P, 23.5, 10.5, 3, g + (unl ? 1 : 0)); rtsWPipe(P, [[11, 14], [14, 14]]); }
    // the vats: a gauge glowing in each
    rtsWTank(P, 7, 3, 5, 12, M, rtsWHRoof(H));
    rtsWTank(P, 18, 3, 5, 12, M, rtsWHRoof(H));
    if (hi) {
      // a catwalk across between the vats' tops, its rails
      P.rect(11, 1.5, 3, 1.5, M[3]); P.rect(11, 1.5, 3, q, M[1]); P.rect(11, 3 - q, 3, q, M[5]);
      for (let x = 11.5; x < 14; x += 1) P.fp(x, 2.25, M[4]);
      P.rect(11, 1, 3, q, M[1]); P.rect(11, 3.5, 3, q, M[4]);
    }
    for (const x of [6, 17]) {
      P.rect(x, 9, 2, 6, M[6]); const lv = 2 + ((g + (x > 10 ? 2 : 0)) % 4); P.rect(x, 15 - lv, 2, lv, unl ? G[1] : G[2]); P.px(x, 15 - lv, G[0]);
      if (hi) { P.fframe(x - q, 9 - q, 2 + 2 * q, 6 + 2 * q, M[4]); for (let y = 10; y < 15; y += 1) P.fp(x + 2 - q, y, M[2]); P.rect(x, 15 - lv, q, lv, G[0]); }
    }
    // the chimney
    P.rect(24, 0, 3, 9, M[3]); P.rect(24, 0, 1, 9, M[2]); P.rect(24, 0, 3, 1, M[5]); P.rect(24, 3, 3, 1, H[1]);
    if (hi) { P.rect(24, 0, q, 9, M[1]); P.rect(27 - q, 0, q, 9, M[5]); P.rect(24, 0, 3, q, M[2]); P.rect(24.5, 0.5, 2, q, M[6]); P.rect(24, 3, 3, q, H[0]); for (let y = 5; y < 9; y += 1.5) P.rect(24, y, 3, q, M[4]); }
    rtsWSmoke(P, 25, 1, g, unl ? 3 : 2);
  },

  // GLIMMER SILO: four squat tanks on a plinth, their gauges showing how full they are
  silo(P, H, house, f, st) {
    const M = RTS_W_M, C = RTS_W_C.conc, G = RTS_W_C.glim, fill = st.fill, hi = P.s > 1, q = P.q;
    rtsWBox(P, 1, 13, 28, 16, 3, [C[1], C[2], C[4]], rtsWSide());
    if (hi) for (let x = 3; x < 29; x += 3) { P.fp(x, 26.5, C[4]); P.fp(x + 1.5, 14, C[3]); }
    rtsWPipe(P, [[8, 8], [21, 8]]); rtsWPipe(P, [[8, 18], [21, 18]]);
    if (hi) { for (const y of [8, 18]) { P.disc(14.75, y + 1, 1.2, '#C83018'); P.disc(14.5, y + 0.75, 0.7, '#F86040'); P.fp(14.25, y + 0.5, '#FFD0B0'); } }
    let k = 0;
    for (const [cx, top] of [[8, 4], [21, 4], [8, 14], [21, 14]]) {
      rtsWTank(P, cx, top, 6, 8, M, rtsWHRoof(H));
      // the gauge: a slit up the tank's front, glowing to the fill line
      const lv = Math.round(5 * Math.max(0, Math.min(1, fill)));
      P.rect(cx - 1, top + 2, 2, 6, M[6]);
      if (lv) P.rect(cx - 1, top + 8 - lv, 2, lv, G[(f + k) % 4 === 0 ? 1 : 2]);
      P.px(cx - 4, top - 1, M[0]);
      if (hi) {
        P.fframe(cx - 1 - q, top + 2 - q, 2 + 2 * q, 6 + 2 * q, M[4]);
        if (lv) { P.rect(cx - 1, top + 8 - lv, q, lv, G[0]); P.rect(cx - 1, top + 8 - lv, 2, q, '#FFF8D0'); }
        for (let y = top + 3; y < top + 8; y += 1) P.fp(cx + 1, y, M[2]);
        rtsWLadder(P, cx + 3.5, top + 1, top + 8);
      }
      k++;
    }
    rtsWLamp(P, 27, 26, f < 2, '#F8B800');
  },

  // RADAR OUTPOST: the operations block, the mast, the dish turning
  radar(P, H, house, f) {
    const M = RTS_W_M, G = RTS_W_C.glass, hi = P.s > 1, q = P.q;
    rtsWBox(P, 22, 14, 7, 14, 4, rtsWHRoof(H), rtsWSide());
    rtsWVent(P, 23, 24, 5, 3);
    rtsWBox(P, 1, 12, 22, 16, 5, rtsWRoof(), rtsWSide());
    rtsWSeams(P, 1, 12, 22, 11, 5, M[3], true);
    P.rect(1, 23, 22, 1, H[1]);
    rtsWWindows(P, 3, 24, 4, 3, 2, 2, f & 1);
    rtsWEmblem(P, house, 3, 13, H[1], H[2]);
    if (hi) {
      rtsWFanBox(P, 24, 15.5, 3, f); rtsWAerial(P, 26.5, 10, 5, f & 1, '#58F858');
      P.rect(1, 23, 22, q, H[0]); P.rect(1, 23.5, 22, q, H[2]);
      // cable trays from the block up the mast
      P.rect(13, 16, 6, q, M[5]); P.rect(13, 16 + q, 6, q, M[3]);
    }
    // mast
    P.rect(14, 9, 3, 9, M[3]); P.rect(14, 9, 1, 9, M[1]); P.rect(13, 17, 5, 2, M[4]);
    if (hi) {
      P.rect(14, 9, 3, 9, M[4]); P.rect(14, 9, q, 9, M[1]); P.rect(14.5, 9, q, 9, M[2]); P.rect(17 - q, 9, q, 9, M[6]);
      for (let y = 10; y < 17; y += 1.5) { P.fline(14.5, y, 16.5, y + 1.5, M[2]); P.rect(14, y, 3, q, M[3]); }
      P.rect(13, 17, 5, 2, M[4]); P.rect(13, 17, 5, q, M[2]); P.rect(13, 18.5, 5, q, M[6]);
    }
    // the dish: seen from the side as it turns, the inside or the back
    const a = f * Math.PI / 4, c = Math.cos(a), s = Math.sin(a), rx = Math.max(1.6, 8.5 * Math.abs(c)), ry = 6.5, cx = 15.5 + s * 2, cy = 7;
    P.each(Math.floor(cx - rx), Math.floor(cy - ry), Math.floor(cx + rx) + 1, Math.floor(cy + ry) + 1, (x, y, X, Y) => {
      const u = (x + 0.5 - cx) / rx, v = (y + 0.5 - cy) / ry, d2 = u * u + v * v;
      if (d2 > 1) return null;
      if (c >= 0) {
        // the bowl seen from inside: its rim lit, the hollow shaded (light falls on its lower right)
        const l = u * 0.5 + v * 0.7;
        if (hi) {
          if (d2 > 0.86) return u + v < 0.2 ? M[0] : M[3];
          const ang = Math.atan2(v, u), rib = Math.abs(((ang * 4 / Math.PI + 8.5) % 1) - 0.5) < 0.06 || Math.abs(d2 - 0.42) < 0.03;
          const t = l + (rtsWBayer(X, Y) - 0.5) * 0.2;
          const col = t > 0.35 ? M[1] : t > -0.2 ? M[2] : t > -0.6 ? M[3] : M[4];
          return rib ? M[t > -0.2 ? 3 : 4] : col;
        }
        return d2 > 0.72 ? (u + v < 0.2 ? M[0] : M[3]) : l > 0.35 ? M[1] : l > -0.2 ? M[2] : l > -0.6 ? M[3] : M[4];
      }
      // its back: a convex shell lit from the top left
      const l = -u * 0.6 - v * 0.7 + Math.sqrt(1 - d2) * 0.4 + (hi ? (rtsWBayer(X, Y) - 0.5) * 0.15 : 0);
      return d2 > 0.8 ? M[4] : l > 0.6 ? M[1] : l > 0.1 ? M[2] : l > -0.4 ? M[3] : M[4];
    });
    if (c >= 0) {
      // the feed on its three struts
      const fx = cx + s * 4.5, fy = cy - 1;
      for (const [sx, sy] of [[cx - rx * 0.75, cy + 2], [cx + rx * 0.75, cy + 2], [cx, cy - ry * 0.8]]) (hi ? P.fline : P.line).call(P, sx, sy, fx, fy, M[5]);
      P.rect(Math.round(fx) - 1, Math.round(fy) - 1, 3, 2, H[1]); P.px(Math.round(fx) - 1, Math.round(fy) - 1, H[0]);
      if (hi) { P.fp(Math.round(fx) + 1.5, Math.round(fy) + 0.5, H[2]); P.fp(Math.round(fx), Math.round(fy) - 1, '#FFFFFF'); }
    } else {
      (hi ? P.fline : P.line).call(P, cx - rx + 1, cy, cx + rx - 1, cy, M[4]); (hi ? P.fline : P.line).call(P, cx, cy - ry + 1, cx, cy + ry - 1, M[4]); P.disc(cx, cy, 1.5, M[5]);
      if (hi) { P.disc(cx - 0.25, cy - 0.25, 1, M[3]); P.fp(cx - 0.5, cy - 0.5, M[1]); }
    }
    rtsWLamp(P, 2, 11, f % 4 < 2);
  },

  // BARRACKS: a ribbed hut in the House's colours, sandbags, the flag
  barracks(P, H, house, f, st) {
    const M = RTS_W_M, act = f >= 4, g = f & 3, sb = ['#E0C890', '#C0A068', '#8C7048'], hi = P.s > 1, q = P.q;
    // the hut: a curved roof lit along its top, ribs across it
    if (!hi) {
      for (let y = 5; y < 20; y++) {
        const t = (y - 5) / 15, c = t < 0.15 ? H[0] : t < 0.6 ? H[1] : H[2];
        P.rect(2, y, 22, 1, c);
      }
      for (let x = 5; x < 24; x += 4) for (let y = 5; y < 20; y++) P.px(x, y, rtsWHex(rtsWMix(y < 8 ? H[1] : H[2], '#000000', 0.25)));
    } else {
      // corrugated: the curve shaded in finer steps, a rib every logical pixel, the heavier frames every four
      const Hl = rtsWMixH(H[0], '#FFFFFF', 0.3), Hd = rtsWMixH(H[2], '#000000', 0.3);
      P.each(2, 5, 24, 20, (x, y, X, Y) => {
        const t = (y + 0.5 - 5) / 15, l = t < 0.06 ? 0 : t < 0.18 ? 1 : t < 0.45 ? 2 : t < 0.7 ? 3 : t < 0.9 ? 4 : 5;
        const pal = [Hl, H[0], H[1], rtsWMixH(H[1], H[2], 0.5), H[2], Hd];
        const rib = (X & 1) === 1;
        return pal[Math.min(5, l + (rib ? 1 : 0))];
      });
      for (let x = 5; x < 24; x += 4) P.each(x, 5, x + 0.5, 20, (lx, ly) => rtsWMixH(ly < 8 ? H[1] : H[2], '#000000', 0.35));
      for (let x = 5.5; x < 24; x += 4) P.each(x, 5, x + 0.5, 20, (lx, ly) => (ly < 9 ? H[0] : null));
      // a vent cowl on the ridge, rivet rows
      for (const x of [9, 17]) { P.disc(x + 1, 7.5, 1.3, M[4]); P.disc(x + 0.75, 7.25, 0.9, M[2]); P.fp(x + 0.5, 7, M[0]); }
    }
    P.rect(2, 5, 1, 15, H[0]); P.rect(23, 5, 1, 15, rtsWHex(rtsWMix(H[2], '#000000', 0.3)));
    rtsWBox(P, 2, 19, 22, 9, 8, rtsWSide(), rtsWSide());
    P.rect(2, 19, 22, 1, M[2]);
    if (hi) { P.rect(2, 19, 22, q, M[1]); for (let x = 3; x < 23; x += 2) P.fp(x, 27, M[6]); P.rect(2.5, 20, 21, q, M[5]); }
    rtsWDoor(P, 9, 21, 8, 7, st.door);
    rtsWWindows(P, 4, 22, 1, 3, 2, 0, act); rtsWWindows(P, 19, 22, 1, 3, 2, 0, act);
    if (hi) {
      // a sign over the door in the House's colours
      P.rect(10, 19.5, 6, 1, H[1]); P.rect(10, 19.5, 6, q, H[0]); P.rect(10.5, 20, 5, q, H[2]);
      rtsWCrate(P, 4, 25.5, 2.5, 2); rtsWCrate(P, 19.5, 25.5, 2.5, 2, [rtsWMixH(H[1], '#FFFFFF', 0.2), H[2], rtsWMixH(H[2], '#000000', 0.4)]);
    }
    // sandbags at the corners
    const bag = hi ? (x, y) => {
      P.ell(x + 2, y + 1.6, 2, 1.4, sb[2]); P.ell(x + 1.75, y + 1.25, 1.75, 1.1, sb[1]); P.ell(x + 1.4, y + 0.9, 1.1, 0.6, sb[0]);
      P.rect(x + 0.75, y + 1.5, 2.5, q, sb[2]); P.fp(x + 3.5, y + 2.5, '#5C4830');
    } : (x, y) => { P.rect(x, y, 4, 3, sb[2]); P.rect(x, y, 3, 2, sb[1]); P.rect(x + 1, y, 2, 1, sb[0]); P.px(x, y + 2, '#5C4830'); };
    for (const [x0, y0] of [[0, 26], [19, 26]]) { for (let k = 0; k < 3; k++) bag(x0 + k * 3, y0); for (let k = 0; k < 2; k++) bag(x0 + 1 + k * 3, y0 - 2); }
    for (let k = 0; k < 3; k++) bag(25, 9 + k * 3);
    rtsWFlag(P, H, house, 26, 22, g, 13);
    P.rect(5, 2, 1, 4, M[4]); rtsWLamp(P, 5, 1, g < 2);
    if (hi) { P.rect(5, 2, q, 4, M[2]); P.rect(4, 4, 3, q, M[3]); }
  },

  // TROOPER HALL: a tall hall with its ridge in House colours, rockets racked on the roof, a tower
  hall(P, H, house, f, st) {
    const M = RTS_W_M, act = f >= 4, g = f & 3, hi = P.s > 1, q = P.q;
    rtsWBox(P, 1, 4, 22, 24, 7, rtsWRoof(), rtsWSide());
    rtsWSeams(P, 1, 4, 22, 17, 3, M[3], false);
    P.rect(10, 4, 4, 17, H[1]); P.rect(10, 4, 1, 17, H[0]); P.rect(13, 4, 1, 17, H[2]);
    if (hi) {
      P.rect(10, 4, q, 17, rtsWMixH(H[0], '#FFFFFF', 0.3)); P.rect(14 - q, 4, q, 17, rtsWMixH(H[2], '#000000', 0.3));
      for (let y = 5.5; y < 20; y += 3) { P.rect(11, y, 2, q, H[2]); P.fp(11.5, y + 0.5, H[0]); }
    }
    // rockets standing in their racks either side of the ridge
    for (const [xa, xb] of [[2, 9], [14, 21]]) { P.rect(xa, 9, xb - xa, 1, M[5]); P.rect(xa, 15, xb - xa, 1, M[5]); if (hi) { P.rect(xa, 9, xb - xa, q, M[3]); P.rect(xa, 15, xb - xa, q, M[3]); } }
    for (const x0 of [3, 6, 15, 18]) {
      if (!hi) {
        P.px(x0, 5, '#F86040'); P.rect(x0, 6, 2, 2, '#D82800'); P.px(x0 + 1, 6, '#A01800');
        P.rect(x0, 8, 2, 8, '#E8E4D8'); P.rect(x0 + 1, 8, 1, 8, '#A8A498'); P.px(x0, 8, '#FFFFFF');
        P.px(x0 - 1, 15, M[5]); P.px(x0 + 2, 15, M[5]); P.px(x0 - 1, 14, M[4]); P.px(x0 + 2, 14, M[4]);
        continue;
      }
      // a rocket: the pointed red nose, the white body shaded round, a band, the fins at its foot
      P.poly([[x0, 7], [x0 + 1, 4.5], [x0 + 2, 7]], '#D82800'); P.poly([[x0 + 1, 4.5], [x0 + 2, 7], [x0 + 1.5, 7]], '#A01800'); P.fp(x0 + 0.5, 6, '#F88060');
      P.rect(x0, 7, 2, 9, '#E8E4D8'); P.rect(x0, 7, q, 9, '#FFFFFF'); P.rect(x0 + 1.5, 7, q, 9, '#A8A498'); P.rect(x0 + 1, 7, q, 9, '#D0CCC0');
      P.rect(x0, 10, 2, q, '#D82800'); P.rect(x0, 10.5, 2, q, '#801000');
      P.poly([[x0 - 1, 16], [x0, 13.5], [x0, 16]], M[4]); P.poly([[x0 + 2, 13.5], [x0 + 3, 16], [x0 + 2, 16]], M[5]); P.fp(x0 - 0.5, 15, M[2]);
    }
    rtsWDoor(P, 8, 22, 8, 6, st.door);
    P.rect(3, 22, 3, 5, H[1]); P.rect(3, 22, 3, 1, H[0]); P.px(4, 24, H[0]); P.rect(18, 22, 3, 5, H[1]); P.rect(18, 22, 3, 1, H[0]); P.px(19, 24, H[0]);
    if (hi) for (const x of [3, 18]) { P.fframe(x, 22, 3, 5, H[2]); P.rect(x + 0.5, 23.5, 2, q, H[2]); P.rect(x + 0.5, 25, 2, q, H[2]); P.fp(x + 1, 22.5, rtsWMixH(H[0], '#FFFFFF', 0.4)); }
    // the tower
    rtsWBox(P, 22, 1, 7, 27, 5, rtsWHRoof(H), rtsWSide());
    rtsWWindows(P, 23, 6, 1, 5, 2, 0, act); rtsWWindows(P, 23, 12, 1, 5, 2, 0, act);
    rtsWVent(P, 23, 23, 5, 3);
    if (hi) { rtsWRail(P, 22.5, 28.5, 1.5); P.rect(23, 17, 5, q, H[2]); P.rect(23, 19, 5, q, H[2]); rtsWAerial(P, 27, -0.5 + 3, 3, g >= 2, '#F8B800'); }
    rtsWLamp(P, 25, 2, g < 2);
  },

  // LIGHT FACTORY: a sawtooth roof of skylights, the House's band, the wide door, a vent stack
  light(P, H, house, f, st) {
    const M = RTS_W_M, G = RTS_W_C.glass, act = f >= 4, g = f & 3, hi = P.s > 1, q = P.q;
    rtsWBox(P, 1, 7, 28, 21, 9, rtsWRoof(), rtsWSide());
    for (let x0 = 2; x0 < 27; x0 += 6) {
      for (let x = 0; x < 6 && x0 + x < 28; x++) P.rect(x0 + x, 8, 1, 10, x < 4 ? [M[1], M[2], M[2], M[3]][x] : G[x === 4 ? 1 : 2]);
      P.px(x0 + 4, 8, G[0]);
      if (hi && x0 + 6 <= 28) {
        // the sloped roof in finer shades, the glazing in panes catching the sky
        P.each(x0, 8, x0 + 4, 18, (x) => { const t = (x + 0.5 - x0) / 4; return t < 0.12 ? M[0] : t < 0.4 ? M[1] : t < 0.8 ? M[2] : M[3]; });
        P.each(x0 + 4, 8, x0 + 6, 18, (x, y, X, Y) => { const t = (x + 0.5 - x0 - 4) / 2; return (Y & 3) === 3 ? M[4] : t < 0.3 ? G[1] : (X + Y) % 7 === 0 ? G[0] : G[2]; });
        P.rect(x0 + 4, 8, q, 10, M[5]); P.rect(x0 + 6 - q, 8, q, 10, G[3]);
        if (act) P.rect(x0 + 4.5, 9, 1, 8, '#F8E0A0', 0.35);
      }
    }
    P.rect(1, 17, 28, 1, M[4]);
    P.rect(1, 19, 28, 2, H[1]); P.rect(1, 19, 28, 1, H[0]);
    if (hi) { P.rect(1, 17, 28, q, M[5]); P.rect(1, 20.5, 28, q, H[2]); for (let x = 2; x < 29; x += 2) P.fp(x, 19.75, H[2]); }
    rtsWEmblem(P, house, 2, 9, H[1], H[2]);
    rtsWDoor(P, 9, 21, 12, 7, st.door, H);
    rtsWVent(P, 3, 22, 4, 4); rtsWVent(P, 23, 22, 4, 4);
    // the stack
    P.rect(24, 1, 4, 9, M[3]); P.rect(24, 1, 1, 9, M[1]); P.rect(24, 1, 4, 1, M[6]); P.rect(24, 4, 4, 1, H[1]);
    if (hi) {
      P.each(24, 1, 28, 10, (x) => { const t = (x + 0.5 - 24) / 4; return t < 0.12 ? M[0] : t < 0.35 ? M[1] : t < 0.6 ? M[2] : t < 0.85 ? M[3] : M[4]; });
      P.ell(26, 1.25, 2, 0.75, M[6]); P.each(24, 0.5, 28, 2, (x, y) => { const u = (x + 0.5 - 26) / 2, v = (y + 0.5 - 1.25) / 0.75, d = u * u + v * v; return d <= 1 && d > 0.55 ? (u + v < 0 ? M[1] : M[4]) : null; });
      P.rect(24, 4, 4, 1, H[1]); P.rect(24, 4, 4, q, H[0]); for (let y = 6; y < 10; y += 1.5) P.rect(24, y, 4, q, M[4]);
      rtsWLadder(P, 27.5, 3, 10);
    }
    if (act) rtsWSmoke(P, 26, 1, g, 3);
    rtsWLamp(P, 8, 20, act ? g & 1 : 0, '#F8B800'); rtsWLamp(P, 22, 20, act ? !(g & 1) : 0, '#F8B800');
  },

  // HEAVY FACTORY: a long works under a gantry crane, two stacks, the great door
  heavy(P, H, house, f, st) {
    const M = RTS_W_M, act = f >= 4, g = f & 3, hi = P.s > 1, q = P.q, Y = ['#FCE070', '#F8C800', '#B88C00', '#6C5000'];
    rtsWBox(P, 1, 7, 44, 21, 9, rtsWRoof(), rtsWSide());
    rtsWSeams(P, 1, 7, 44, 12, 4, M[3], true);
    rtsWVent(P, 25, 9, 6, 4);
    if (hi) {
      // skylights down the bay under the gantry, glowing when the works are busy
      const G = RTS_W_C.glass;
      for (const x0 of [4, 15]) {
        P.rect(x0, 11, 9, 3, M[5]);
        P.each(x0 + q, 11 + q, x0 + 9 - q, 14 - q, (x, y, X, Y) => (X % 6 === 0 ? M[4] : act ? (Y & 1 ? '#F8D070' : '#F0B848') : y < 12.5 ? G[1] : G[2]));
        P.rect(x0, 11, 9, q, M[2]); P.fline(x0 + 1, 13.5, x0 + 2.5, 11.5, act ? '#FCF0C0' : G[0]);
      }
    }
    // the gantry: rails, and the bridge running along them
    P.rect(3, 9, 29, 1, M[5]); P.rect(3, 16, 29, 1, M[5]);
    const bx = 18 + [0, 3, 6, 3][act ? g : 0];
    if (!hi) {
      P.rect(bx, 8, 3, 10, '#F8C800'); P.rect(bx + 2, 8, 1, 10, '#A07800'); P.rect(bx - 1, 12, 5, 2, M[5]);
    } else {
      for (const y of [9, 16]) { P.rect(3, y, 29, q, M[3]); for (let x = 3.5; x < 32; x += 1.5) P.fp(x, y + 0.5, M[6]); }
      // the bridge: a yellow box girder with hazard ends, the trolley riding it, the hook hanging
      rtsWBox(P, bx, 8, 3, 10, 0, [Y[0], Y[1], Y[2]], [Y[2], Y[3], Y[3]]);
      for (let y = 9; y < 17; y += 1.5) P.fline(bx + 0.5, y, bx + 2, y + 1, Y[2]);
      rtsWHazard(P, bx, 8, 3, 1); rtsWHazard(P, bx, 17, 3, 1, 1);
      const ty = 11 + (act ? [0, 1, 2, 1][g] : 0);
      rtsWBox(P, bx - 1, ty, 5, 3, 0.5, [M[2], M[3], M[5]], [M[4], M[5], M[6]]);
      P.rect(bx + 0.5, ty + 0.5, 2, 1.5, M[6]); P.fp(bx + 1, ty + 1, M[3]);
      P.fline(bx + 1.5, ty + 2.5, bx + 1.5, ty + 4, M[6]); P.fp(bx + 1, ty + 4, M[4]); P.fp(bx + 2, ty + 4, M[4]);
    }
    P.rect(1, 19, 44, 2, H[1]); P.rect(1, 19, 44, 1, H[0]);
    for (let x = 3; x < 44; x += 6) P.px(x, 20, H[2]);
    if (hi) { P.rect(1, 20.5, 44, q, H[2]); for (let x = 3; x < 44; x += 6) { P.fp(x + 0.5, 19.5, H[0]); } }
    rtsWDoor(P, 15, 21, 16, 7, st.door, H);
    rtsWWindows(P, 3, 22, 3, 2, 3, 2, act); rtsWWindows(P, 34, 22, 3, 2, 3, 2, act);
    // the stacks
    for (const x of [4, 10]) {
      P.rect(x, 0, 4, 11, M[3]); P.rect(x, 0, 1, 11, M[1]); P.rect(x + 3, 0, 1, 11, M[5]); P.rect(x, 0, 4, 1, M[6]); P.rect(x, 3, 4, 2, H[1]);
      if (hi) {
        P.each(x, 0, x + 4, 11, (lx) => { const t = (lx + 0.5 - x) / 4; return t < 0.12 ? M[0] : t < 0.35 ? M[1] : t < 0.6 ? M[2] : t < 0.85 ? M[3] : M[4]; });
        P.ell(x + 2, 0.75, 2, 0.75, M[6]); P.rect(x, 0, 4, q, M[2]);
        P.rect(x, 3, 4, 2, H[1]); P.rect(x, 3, 4, q, H[0]); P.rect(x, 4.5, 4, q, H[2]);
        for (let y = 6; y < 11; y += 1.5) P.rect(x, y, 4, q, M[4]);
        rtsWLadder(P, x + 3.25, 5.5, 11);
      }
      if (act) rtsWSmoke(P, x + 2, 0, (g + x) & 3, 3);
    }
    rtsWEmblem(P, house, 34, 8, H[1], H[2]);
    rtsWLamp(P, 14, 20, act ? g & 1 : 0, '#F8B800'); rtsWLamp(P, 32, 20, act ? !(g & 1) : 0, '#F8B800');
  },

  // HIGH-TECH FACTORY: a hangar under a curved roof with its skylight, the landing pad beside it, a mast
  hightech(P, H, house, f, st) {
    const M = RTS_W_M, C = RTS_W_C.conc, G = RTS_W_C.glass, act = f >= 4, g = f & 3, hi = P.s > 1, q = P.q;
    // the pad
    rtsWBox(P, 31, 8, 16, 20, 2, [C[1], C[2], C[4]], rtsWSide());
    P.disc(39, 17, 6, H[2]); P.disc(39, 17, 5, C[3]);
    if (hi) {
      P.disc(39, 17, 5, C[3]); P.disc(39, 17, 4.5, C[2]);
      P.each(32, 10, 46, 24, (x, y) => { const d = Math.hypot(x + 0.5 - 39, y + 0.5 - 17); return Math.abs(d - 5.75) < 0.3 ? (Math.floor(Math.atan2(y + 0.5 - 17, x + 0.5 - 39) * 4) & 1 ? '#F8F0D0' : H[2]) : null; });
      for (const [x, y] of [[33, 10], [44, 10], [33, 24], [44, 24]]) { P.fp(x, y, C[5]); P.fp(x + q, y + q, C[0]); }
    }
    P.rect(36, 14, 1, 7, '#F8F0D0'); P.rect(42, 14, 1, 7, '#F8F0D0'); P.rect(37, 17, 5, 1, '#F8F0D0');
    if (hi) { P.rect(36 + 1 - q, 14, q, 7, C[3]); P.rect(43 - q, 14, q, 7, C[3]); P.rect(37, 18 - q, 5, q, C[3]); }
    for (const [x, y, k] of [[32, 9, 0], [45, 9, 1], [32, 25, 2], [45, 25, 3]]) rtsWLamp(P, x, y, (g === k) || (act && (g & 1) === (k & 1)), '#58F858');
    // the hangar: a barrel roof shaded across, ribs, the long skylight
    if (!hi) {
      for (let x = 1; x < 31; x++) {
        const t = (x - 1) / 30, c = t < 0.1 ? M[0] : t < 0.4 ? M[1] : t < 0.75 ? M[2] : t < 0.92 ? M[3] : M[4];
        P.rect(x, 4, 1, 15, c);
      }
      for (let y = 6; y < 19; y += 3) P.rect(1, y, 30, 1, M[3]);
    } else {
      P.each(1, 4, 31, 19, (x, y, X, Y) => {
        const t = (x + 0.5 - 1) / 30 + (rtsWBayer(X, Y) - 0.5) * 0.03;
        return t < 0.06 ? M[0] : t < 0.2 ? rtsWMixH(M[0], M[1], 0.5) : t < 0.42 ? M[1] : t < 0.62 ? rtsWMixH(M[1], M[2], 0.5) : t < 0.8 ? M[2] : t < 0.93 ? M[3] : M[4];
      });
      for (let y = 6; y < 19; y += 3) P.each(1, y, 31, y + 0.5, (x, yy, X, Y) => (Y & 1 ? M[1] : M[3]));
      for (let x = 2; x < 30; x += 1) P.each(x, 4.5, x + q, 18.5, (lx, ly, X, Y) => ((Y % 6) === 0 ? M[4] : null));
    }
    P.rect(12, 5, 6, 13, G[2]); P.rect(12, 5, 2, 13, G[1]); P.px(12, 5, G[0]); P.rect(17, 5, 1, 13, G[3]);
    if (hi) {
      for (let y = 6.5; y < 18; y += 2) { P.rect(12, y, 6, q, M[3]); P.rect(12, y + q, 6, q, G[3]); }
      P.rect(15, 5, q, 13, M[3]);
      for (let k = 0; k < 3; k++) P.fline(12.5 + k * 1.5, 17, 14.5 + k * 1.5, 6, G[0], 0.45);
    }
    if (act) P.rect(12, 5 + g * 3, 6, 2, '#F8F0B0');
    P.rect(1, 4, 30, 1, M[0]);
    rtsWBox(P, 1, 18, 30, 10, 9, rtsWSide(), rtsWSide());
    P.rect(1, 18, 30, 2, H[1]); P.rect(1, 18, 30, 1, H[0]);
    if (hi) { P.rect(1, 19.5, 30, q, H[2]); for (let x = 2.5; x < 30; x += 3) P.fp(x, 18.75, H[2]); rtsWVent(P, 2.5, 21.5, 3, 4); rtsWVent(P, 25, 21.5, 4, 4); }
    rtsWDoor(P, 7, 21, 16, 7, st.door, H);
    rtsWEmblem(P, house, 21, 6, H[1], H[2]);
    // the mast
    P.rect(28, 0, 1, 6, M[3]); P.rect(26, 2, 5, 1, M[4]); rtsWLamp(P, 28, 0, g & 1);
    if (hi) { P.rect(28, 0, q, 6, M[1]); P.rect(26, 2, 5, q, M[2]); P.rect(26.5, 4, 3, q, M[3]); P.fp(26, 3, M[5]); P.fp(30.5, 3, M[5]); }
  },

  // REPAIR PAD: the control booth, the raised pad with its bay, two yellow arms reaching over it
  repair(P, H, house, f) {
    const M = RTS_W_M, C = RTS_W_C.conc, act = f >= 4, g = f & 3, hi = P.s > 1, q = P.q;
    rtsWBox(P, 13, 7, 34, 21, 3, [C[2], C[3], C[4]], rtsWSide());
    rtsWHazard(P, 14, 24, 32, 1); rtsWHazard(P, 14, 8, 32, 1, 1);
    // the bay: a grating, a cross of guide lines
    P.rect(20, 11, 20, 11, M[5]); P.frame(20, 11, 20, 11, M[6]);
    for (let x = 22; x < 39; x += 3) P.rect(x, 12, 1, 9, M[4]);
    P.rect(29, 12, 2, 9, H[1]); P.rect(21, 16, 18, 1, H[1]);
    if (hi) {
      rtsWGrate(P, 20.5, 11.5, 19, 10, M[4], M[6]);
      P.fframe(20, 11, 20, 11, M[3]); P.rect(20, 11, 20, q, M[2]);
      P.rect(29.25, 12, 1.5, 9, H[1]); P.rect(29.25, 12, q, 9, H[0]); P.rect(21, 16.25, 18, 0.5, H[1]); P.rect(21, 16.25, 18, q, H[0]);
      // drains, oil stains on the pad
      for (const [x, y] of [[16, 12], [43, 19]]) { P.ell(x, y, 2, 1.2, '#3C342C', 0.45); P.ell(x - 0.5, y - 0.25, 1, 0.6, '#2C2620', 0.4); }
    }
    // the arms: shoulders on the pad's back corners, elbows, the tools (moving while at work)
    const sway = act ? [0, 2, 3, 1][g] : 0;
    for (const [sx, dir] of [[17, 1], [43, -1]]) {
      const ex = sx + dir * 6, ey = 12 + (dir > 0 ? sway : 3 - sway), tx = ex + dir * (4 + (dir > 0 ? sway : 3 - sway)), ty = 17;
      P.rect(sx - 2, 8, 4, 4, M[4]); P.rect(sx - 2, 8, 4, 1, M[2]);
      if (!hi) {
        P.line(sx, 10, ex, ey, '#A07800'); P.line(sx, 9, ex, ey - 1, '#F8C800');
        P.line(ex, ey, tx, ty, '#A07800'); P.line(ex, ey - 1, tx, ty - 1, '#F8C800');
        P.rect(ex - 1, ey - 1, 2, 2, M[3]); P.rect(tx - 1, ty, 2, 2, M[5]);
      } else {
        // a slewing base with bolts, two-tone arm sections with a hydraulic ram along each, joints, the tool head
        rtsWBox(P, sx - 2, 8, 4, 4, 1, [M[1], M[2], M[4]], [M[4], M[5], M[6]]); P.disc(sx, 9.5, 1.2, M[3]); P.fp(sx - 0.5, 9, M[1]);
        const arm = (x0, y0, x1, y1) => { P.line(x0, y0 + 1, x1, y1 + 1, '#A07800'); P.line(x0, y0, x1, y1, '#F8C800'); P.fline(x0, y0, x1, y1, '#FCE070'); P.fline(x0 + 0.5, y0 + 1.5, x1 + 0.5, y1 + 1.5, '#6C5000'); };
        arm(sx, 9, ex, ey - 1); arm(ex, ey - 1, tx, ty - 1);
        P.fline(sx + dir * 1.5, 11, ex - dir * 1.5, ey + 0.5, M[1]); P.fline(sx + dir * 1.5, 11.5, ex - dir * 1.5, ey + 1, M[4]);
        P.disc(ex + 0.5, ey, 1.1, M[4]); P.disc(ex + 0.25, ey - 0.25, 0.7, M[2]); P.fp(ex, ey - 0.5, M[0]);
        rtsWBox(P, tx - 1, ty, 2.5, 2.5, 0.5, [M[3], M[4], M[5]], [M[5], M[6], M[6]]); P.fp(tx, ty + 2.5, '#58D8F8'); P.fp(tx + 0.5, ty + 2.5, '#2878B0');
      }
      if (act) rtsWSparks(P, tx, ty + 1, f + sx);
    }
    // the booth
    rtsWBox(P, 1, 5, 13, 23, 7, rtsWHRoof(H), rtsWSide());
    rtsWEmblem(P, house, 3, 6, H[0], H[2]);
    rtsWWindows(P, 2, 22, 3, 3, 2, 1, true);
    if (hi) { rtsWFanBox(P, 9, 12.5, 3, g); rtsWRivets(P, 1, 5, 13, 16, 2, H[2]); rtsWRail(P, 1.5, 13.5, 5.5); }
    P.rect(5, 0, 1, 6, M[3]); rtsWLamp(P, 5, 0, act ? g & 1 : g === 0, act ? '#F8B800' : '#58F858');
    if (hi) { P.rect(5, 0.5, q, 5.5, M[1]); P.rect(4, 3, 3, q, M[4]); }
  },

  // RESEARCH LAB: a glass dome on its block, a tank of something glowing, the antenna
  lab(P, H, house, f) {
    const M = RTS_W_M, G = RTS_W_C.glass, pulse = [0.3, 0.6, 1, 0.6][f], hi = P.s > 1, q = P.q;
    rtsWBox(P, 1, 12, 27, 16, 5, rtsWRoof(), rtsWSide());
    P.rect(1, 23, 27, 1, H[1]); P.rect(1, 24, 27, 1, H[2]);
    if (hi) { P.rect(1, 23, 27, q, H[0]); rtsWSeams(P, 1, 12, 27, 11, 5, M[3], true); }
    rtsWWindows(P, 3, 25, 5, 2, 2, 2, true);
    // the tank, glowing green
    rtsWTank(P, 24, 4, 3.5, 13, M, null);
    const gl = rtsWHex(rtsWMix('#208840', '#B8F8A0', pulse)), lvh = Math.round(4 + pulse * 4);
    P.rect(23, 7, 3, 9, M[6]); P.rect(23, 16 - lvh, 3, lvh, gl);
    P.px(23, 8, '#E8FCE0');
    if (hi) {
      P.fframe(23 - q, 7 - q, 3 + 2 * q, 9 + 2 * q, M[4]);
      P.rect(23, 16 - lvh, q, lvh, rtsWMixH(gl, '#FFFFFF', 0.4)); P.rect(23, 16 - lvh, 3, q, '#E8FCE0');
      for (let k = 0; k < 3; k++) { const by = 16 - ((f * 2 + k * 3) % lvh) - 1; P.fp(23.5 + k * 0.75, by, '#E8FCE0'); }
      for (let y = 8; y < 16; y += 2) P.fp(25.5, y, M[3]);
    }
    rtsWPipe(P, [[19, 15], [22, 15]]);
    // the dome: glass in panes, its lit side and its glints
    rtsWDome(P, 12, 13, 10, [G[0], G[1], G[2], G[3], '#102038'], 0.85);
    if (!hi) {
      for (let k = -2; k <= 2; k++) for (let y = 5; y < 22; y++) { const half = Math.sqrt(Math.max(0, 1 - ((y + 0.5 - 13) / 8.5) ** 2)) * 10; P.px(Math.round(12 + k * half / 2.6), y, M[3]); }
      for (let x = 3; x < 22; x++) { const half = Math.sqrt(Math.max(0, 1 - ((x + 0.5 - 12) / 10) ** 2)) * 8.5; P.px(x, Math.round(13 - half * 0.45), M[3]); }
      P.px(8, 7, '#FFFFFF'); P.px(7, 8, '#FFFFFF'); P.px(9, 6, G[0]);
      P.ell(12, 13, 3, 2.4, rtsWHex(rtsWMix(G[2], '#A0F8C0', pulse * 0.6)));
    } else {
      // the frame: meridians and parallels as hairlines, the glow of the work inside showing through
      P.ell(12, 13.5, 4.5, 3.6, rtsWMixH(G[3], '#60F8A0', pulse * 0.45));
      P.ell(12, 13.5, 3, 2.4, rtsWMixH(G[2], '#A0F8C0', pulse * 0.7));
      P.ell(12, 13.5, 1.4, 1.1, rtsWMixH(G[1], '#E0FCE0', pulse));
      for (let k = -3; k <= 3; k++) for (let y = 4.5; y < 21.5; y += 0.5) { const half = Math.sqrt(Math.max(0, 1 - ((y + 0.25 - 13) / 8.5) ** 2)) * 10; P.fp(12 + k * half / 3.4, y, M[3]); }
      for (const t of [0.2, 0.45, 0.7]) for (let x = 2.5; x < 22; x += 0.5) { const half = Math.sqrt(Math.max(0, 1 - ((x + 0.25 - 12) / 10) ** 2)) * 8.5; P.fp(x, 13 - half * t * 1.1, M[3]); }
      P.fp(7.5, 7, '#FFFFFF'); P.fp(7, 7.5, '#FFFFFF'); P.fp(8, 6.5, '#FFFFFF'); P.fp(6.5, 8, G[0]); P.fp(8.5, 6, G[0]); P.fp(6, 9, G[0]);
      // a little dish on the block, cables
      P.disc(25.5, 21.5, 1.6, M[2]); P.disc(25.75, 21.75, 1.1, M[3]); P.fp(25.25, 21.25, M[0]);
    }
    // the antenna
    P.rect(26, 0, 1, 5, M[3]); P.rect(25, 1, 3, 1, M[4]); rtsWLamp(P, 26, 0, f & 1, '#F83818');
    if (hi) { P.rect(26, 0.5, q, 4.5, M[1]); P.rect(25, 1, 3, q, M[2]); P.rect(25.5, 3, 2, q, M[4]); }
  },

  // STARPORT: the great landing ring with its lights running round, the control tower, the terminal
  starport(P, H, house, f) {
    const M = RTS_W_M, C = RTS_W_C.conc, G = RTS_W_C.glass, cx = 28, cy = 24, hi = P.s > 1, q = P.q;
    // the apron
    rtsWBox(P, 9, 6, 38, 38, 3, [C[1], C[2], C[4]], rtsWSide());
    if (hi) {
      // its slabs, and guide stripes leading in to the ring
      for (let x = 13.5; x < 46; x += 8) P.rect(x, 7, q, 33, C[3]);
      for (let y = 10.5; y < 40; y += 8) P.rect(10, y, 36, q, C[3]);
      for (let k = 0; k < 3; k++) { P.rect(43, 9 + k * 2, 2, 0.5, '#F8C800'); P.rect(11, 38 - k * 2, 2, 0.5, '#F8C800'); }
    }
    // the ring: a dark band, the pad, its marks
    P.ell(cx, cy, 17, 16, C[4]); P.ell(cx, cy, 16, 15, '#3C3830'); P.ell(cx, cy, 13, 12, C[3]); P.ell(cx, cy, 12, 11, C[2]);
    if (hi) {
      P.each(cx - 17, cy - 16, cx + 17, cy + 16, (x, y) => {
        const u = (x + 0.5 - cx), v = (y + 0.5 - cy), d = Math.hypot(u / 16, v / 15);
        if (d > 1 || d < 0.8) return null;
        return Math.abs(d - 0.9) < 0.012 ? '#5C5848' : null;
      });
      P.each(cx - 13, cy - 12, cx + 13, cy + 12, (x, y) => { const d = Math.hypot((x + 0.5 - cx) / 12, (y + 0.5 - cy) / 11); return d <= 1 && d > 0.94 ? ((x + 0.5 - cx) + (y + 0.5 - cy) < 0 ? C[0] : C[4]) : null; });
      // scorch of thrusters on the pad
      P.each(cx - 11, cy - 10, cx + 11, cy + 10, (x, y, X, Y) => { const d = Math.hypot((x + 0.5 - cx) / 10, (y + 0.5 - cy) / 9); return d < 1 && d > 0.75 && rtsWBayer(X, Y) < 0.35 * (1 - Math.abs(d - 0.87) * 8) ? C[4] : null; });
    }
    P.ell(cx, cy, 8, 7.5, H[2]); P.ell(cx, cy, 7, 6.5, H[1]); P.ell(cx - 1, cy - 1, 5, 4.5, H[0], 0.5); P.ell(cx, cy, 4, 3.6, C[2]);
    for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2; P.line(cx + Math.cos(a) * 9, cy + Math.sin(a) * 8.5, cx + Math.cos(a) * 11.5, cy + Math.sin(a) * 10.5, '#F8F0D0'); }
    if (hi) for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + Math.PI / 4; P.fline(cx + Math.cos(a) * 9.5, cy + Math.sin(a) * 9, cx + Math.cos(a) * 11, cy + Math.sin(a) * 10.3, '#F8F0D0'); }
    rtsWEmblem(P, house, cx - 4, cy - 4, '#F8F0D0', H[2]);
    // the lights: sixteen round the ring, a wave running round it
    for (let k = 0; k < 16; k++) {
      const a = k * Math.PI / 8, x = Math.round(cx + Math.cos(a) * 14.5 - 0.5), y = Math.round(cy + Math.sin(a) * 13.5 - 0.5);
      const on = ((k - f * 2) % 16 + 16) % 16 < 3;
      rtsWLamp(P, x, y, on, '#58F8F8');
    }
    // the control tower
    rtsWBox(P, 1, 30, 10, 12, 4, rtsWHRoof(H), rtsWSide());
    rtsWBox(P, 3, 9, 6, 24, 0, rtsWRoof(), rtsWSide());
    P.rect(7, 10, 1, 22, M[4]);
    for (const y of [14, 21, 28]) { P.rect(3, y, 6, 2, H[1]); P.rect(3, y, 6, 1, H[0]); P.px(8, y + 1, H[2]); }
    if (hi) {
      P.each(3, 9, 9, 33, (x) => { const t = (x + 0.5 - 3) / 6; return t < 0.15 ? M[0] : t < 0.45 ? M[1] : t < 0.75 ? M[2] : M[3]; });
      for (const y of [14, 21, 28]) { P.rect(3, y, 6, 2, H[1]); P.rect(3, y, 6, q, H[0]); P.rect(3, y + 2 - q, 6, q, H[2]); }
      for (let y = 10; y < 32; y += 1) if (y % 7 > 1) P.fp(4.5, y, G[2]);
      rtsWLadder(P, 7.5, 10, 32);
    }
    P.rect(0, 2, 12, 9, M[4]); P.rect(1, 3, 10, 7, G[2]); P.rect(1, 3, 10, 2, G[1]); P.px(2, 3, G[0]);
    P.rect(0, 1, 12, 2, M[2]); P.rect(0, 10, 12, 2, M[5]);
    if (hi) {
      // the cab's slanted glazing in panes, a console's lights inside
      P.each(1, 3, 11, 10, (x, y, X, Y) => { const t = (y + 0.5 - 3) / 7; return (X % 5) === 2 ? M[4] : t < 0.25 ? G[1] : t < 0.6 ? G[2] : G[3]; });
      P.fline(2, 9, 4, 3.5, G[0]); P.fline(3, 9, 5, 3.5, G[0], 0.5);
      for (let k = 0; k < 4; k++) P.fp(2.5 + k * 2.5, 9, ['#F83818', '#58F858', '#F8C800', '#58D8F8'][(k + f) & 3]);
      P.rect(0, 1, 12, q, M[1]); P.rect(0, 2.5, 12, q, M[4]); P.rect(0, 11.5, 12, q, M[6]);
      P.disc(9.5, 1, 1.2, M[2]); P.disc(9.25, 0.75, 0.6, M[0]);
    }
    P.rect(5, 0, 1, 2, M[3]); rtsWLamp(P, 5, 0, f & 1);
    rtsWWindows(P, 2, 37, 2, 3, 2, 2, true);
    // the terminal along the front
    rtsWBox(P, 12, 38, 30, 9, 4, rtsWRoof(), rtsWSide());
    P.rect(12, 42, 30, 1, H[1]);
    if (hi) { P.rect(12, 42, 30, q, H[0]); rtsWSeams(P, 12, 38, 30, 5, 5, M[3], true); }
    rtsWWindows(P, 14, 44, 6, 3, 2, 1, (f >> 1) & 1);
    rtsWFlag(P, H, house, 44, 46, f & 3, 12);
  },

  // PALACE: each House builds its own (AQUILA domes and spires in white stone, DRAKON a black fortress with horned
  // towers and fire, SERPENS a stepped temple in jade and gold); THE REGENT and the NOMADS the domed kind
  palace(P, H, house, f) {
    if (house === 'drakon') return rtsWPalaceDrakon(P, H, house, f);
    if (house === 'serpens') return rtsWPalaceSerpens(P, H, house, f);
    return rtsWPalaceDomes(P, H, house, f);
  },

  // GUN TURRET and ROCKET TURRET: drawn by rtsWTurret
  turret(P, H, house, f, st) { rtsWTurret(P, H, false, st.dir8 | 0, !!st.firing); },
  rturret(P, H, house, f, st) { rtsWTurret(P, H, true, st.dir8 | 0, !!st.firing); },
};

// a slab of concrete as a building (opaque, with its seams); at res 2 its four panels, bolts, wear
function rtsWSlab(P, x0, y0) {
  const M = RTS_W_C.conc;
  if (P.s === 1) {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const n = rtsWPFbm(x, y, 75), h = rtsWHash(x + x0, y + y0, 76);
      let i = Math.round(2 + (n < 0.35 ? -0.6 : n > 0.66 ? 0.6 : 0) + (rtsWBayer(x, y) - 0.5) * 0.6);
      if (h < 0.04) i = 3;
      P.px(x0 + x, y0 + y, M[i]);
    }
    P.rect(x0, y0, 16, 1, M[0]); P.rect(x0, y0, 1, 16, M[0]); P.rect(x0, y0 + 15, 16, 1, M[4]); P.rect(x0 + 15, y0, 1, 16, M[4]);
    return;
  }
  const X0 = x0 * 2, Y0 = y0 * 2;
  for (let Y = 0; Y < 32; Y++) for (let X = 0; X < 32; X++) {
    const x = rtsWL2(X), y = rtsWL2(Y), n = rtsWPFbm(x, y, 75), h = rtsWHash(X + X0, Y + Y0, 76);
    let i = Math.round(2 + (n - 0.5) * 2 + (rtsWPNoise(x, y, 2, 77) - 0.5) * 0.6 + (rtsWBayer(X, Y) - 0.5) * 0.6);
    if (h < 0.035) i = 3; else if (h > 0.985) i = 1;
    P.dpx(X0 + X, Y0 + Y, M[rtsWClampI(i, 6)]);
  }
  for (let k = 1; k < 31; k++) { P.dpx(X0 + 16, Y0 + k, M[3]); P.dpx(X0 + 17, Y0 + k, M[1]); P.dpx(X0 + k, Y0 + 16, M[3]); P.dpx(X0 + k, Y0 + 17, M[1]); }
  for (let k = 0; k < 32; k++) { P.dpx(X0 + k, Y0, M[0]); P.dpx(X0 + k, Y0 + 1, M[1]); P.dpx(X0, Y0 + k, M[0]); P.dpx(X0 + 1, Y0 + k, M[1]); P.dpx(X0 + k, Y0 + 31, M[5]); P.dpx(X0 + k, Y0 + 30, M[4]); P.dpx(X0 + 31, Y0 + k, M[5]); P.dpx(X0 + 30, Y0 + k, M[4]); }
  P.dpx(X0 + 31, Y0, M[3]); P.dpx(X0, Y0 + 31, M[3]);
  for (const [X, Y] of [[4, 4], [27, 4], [4, 27], [27, 27]]) { P.dpx(X0 + X, Y0 + Y, M[5]); P.dpx(X0 + X + 1, Y0 + Y + 1, M[0]); P.dpx(X0 + X + 1, Y0 + Y, M[3]); }
  const R = rtsWSeeded(x0 * 7 + y0 * 13 + 5);
  if (R() < 0.6) { const X = 6 + Math.floor(R() * 18), Y = 6 + Math.floor(R() * 18); for (let j = -2; j <= 2; j++) for (let i = -3; i <= 3; i++) if (i * i / 9 + j * j / 4 < 1 && rtsWHash(X + i, Y + j, 78) < 0.8) P.tint(X0 + X + i, Y0 + Y + j, '#2C2820', 0.3); }
}

// the domed palace: a broad stair, the hall of columns, the great dome, two spires, the House's banners
function rtsWPalaceDomes(P, H, house, f) {
  const S = ['#FCF8EC', '#E8E0CC', '#CCC0A4', '#A49880', '#786C58', '#4C4434'], gold = ['#FCE890', '#E8B830', '#A87818'], hi = P.s > 1, q = P.q;
  const glow = [0.4, 0.7, 1, 0.7][f];
  const Hd = [rtsWHex(rtsWMix(H[0], '#FFFFFF', 0.4)), H[0], H[1], H[2], rtsWHex(rtsWMix(H[2], '#000000', 0.4))];
  // the terrace and its stair
  rtsWBox(P, 2, 20, 42, 26, 4, [S[1], S[2], S[3]], [S[3], S[4], S[5]]);
  if (hi) {
    // paving on the terrace, courses of stone down its face
    for (let x = 5; x < 43; x += 3) P.rect(x, 20.5, q, 21, S[2]);
    for (let y = 23; y < 41; y += 3) P.rect(2.5, y, 41, q, S[2]);
    for (let y = 42.5; y < 46; y += 1.5) { P.rect(2, y, 42, q, S[5]); for (let x = 3 + (y * 2 % 2 ? 1 : 0); x < 44; x += 3) P.fp(x, y + 0.5, S[5]); }
  }
  for (let k = 0; k < 4; k++) P.rect(17 + k, 42 + k, 12 - k * 2, 1, k & 1 ? S[2] : S[1]);
  if (hi) for (let k = 0; k < 4; k++) { P.rect(17 + k, 42 + k, 12 - k * 2, q, S[0]); P.rect(17 + k, 42.5 + k, 12 - k * 2, q, S[3]); }
  // the hall: columns along its face
  rtsWBox(P, 7, 18, 32, 22, 9, [S[0], S[1], S[2]], [S[2], S[3], S[4]]);
  for (let x = 9; x < 38; x += 4) {
    P.rect(x, 31, 2, 9, S[1]); P.rect(x + 1, 31, 1, 9, S[3]); P.rect(x - 1, 31, 4, 1, S[0]);
    if (hi) {
      P.rect(x + 2, 31.5, 2, 8.5, S[5]);                                   // the shade between the columns
      P.rect(x, 31, 0.5, 9, S[0]); P.rect(x + 0.5, 31, q, 9, S[1]); P.rect(x + 1, 31, q, 9, S[2]); P.rect(x + 1.5, 31, 0.5, 9, S[3]);
      P.rect(x - 1, 31, 4, q, '#FFFFFF'); P.rect(x - 1, 31.5, 4, q, S[3]); P.rect(x - 0.5, 39, 3, 1, S[2]); P.rect(x - 0.5, 39, 3, q, S[0]);
    }
  }
  P.rect(7, 30, 32, 1, gold[1]);
  if (hi) { P.rect(7, 30, 32, q, gold[0]); P.rect(7, 30.5, 32, q, gold[2]); for (let x = 8; x < 39; x += 2) P.fp(x, 30.5, gold[0]); }
  P.rect(19, 32, 8, 8, '#2C2014'); P.ell(23, 32, 4, 3, '#2C2014');
  P.rect(20, 34, 6, 6, rtsWHex(rtsWMix('#5C3810', gold[0], glow * 0.6)));
  if (hi) {
    // the great door: a gold-framed arch, two leaves with studs, light spilling between them
    P.each(18.5, 28.5, 27.5, 40, (x, y) => { const u = x + 0.5 - 23, v = y + 0.5 - 32.5; const out = v < 0 ? Math.hypot(u / 4.5, v / 3.5) : Math.abs(u) / 4.5; const inn = v < 0 ? Math.hypot(u / 4, v / 3) : Math.abs(u) / 4; return out <= 1 && inn > 1 ? gold[u + v < 0 ? 0 : 2] : null; });
    const lf = rtsWMixH('#5C3810', '#A87040', 0.4);
    P.rect(19.5, 33, 3.25, 7, lf); P.rect(23.25, 33, 3.25, 7, lf);
    P.rect(22.75, 33, 0.5, 7, rtsWMixH('#5C3810', gold[0], glow));
    for (let y = 34; y < 40; y += 1.5) { P.fp(20.5, y, gold[1]); P.fp(21.75, y, gold[1]); P.fp(24.25, y, gold[1]); P.fp(25.5, y, gold[1]); }
    P.rect(19, 39.5, 8, q, rtsWMixH('#5C3810', gold[0], glow * 0.8));
  }
  // the great dome on its drum, a gold finial
  rtsWBox(P, 14, 13, 18, 12, 3, [S[0], S[1], S[2]], [S[2], S[3], S[4]]);
  if (hi) for (let x = 15.5; x < 31; x += 2.5) { P.rect(x, 22.5, 1, 1.5, '#2C2014'); P.fp(x, 22.5, S[3]); P.rect(x, 23, 1, 1, rtsWMixH('#2C2014', '#F8D070', glow), 0.8); }
  rtsWDome(P, 23, 14, 10, Hd, 0.9);
  if (!hi) {
    for (let k = -1; k <= 1; k++) for (let y = 6; y < 22; y++) { const half = Math.sqrt(Math.max(0, 1 - ((y + 0.5 - 14) / 9) ** 2)) * 10; P.px(Math.round(23 + k * half / 1.8), y, H[2]); }
  } else {
    for (let k = -2; k <= 2; k++) if (k) for (let y = 5.5; y < 22.5; y += 0.5) { const half = Math.sqrt(Math.max(0, 1 - ((y + 0.25 - 14) / 9) ** 2)) * 10; P.fp(23 + k * half / 2.6, y, k < 0 ? H[1] : H[2]); }
    for (let y = 5.5; y < 22.5; y += 0.5) { P.fp(23, y, H[2]); }
    P.each(12, 19, 34, 24, (x, y) => { const u = (x + 0.5 - 23) / 10, v = (y + 0.5 - 14) / 9; const d = u * u + v * v; return d <= 1 && d > 0.9 && v > 0.3 ? gold[u < -0.3 ? 0 : u > 0.4 ? 2 : 1] : null; });
  }
  P.rect(22, 1, 2, 4, gold[1]); P.px(22, 1, gold[0]); P.disc(23, 1, 1.4, gold[0]);
  if (hi) { P.rect(23.5, 1, 0.5, 4, gold[2]); P.disc(23, 3.5, 0.9, gold[1]); P.fp(22.5, 3, gold[0]); P.fp(22.5, 0.5, '#FFFFFF'); }
  // the spires
  for (const x of [4, 37]) {
    rtsWBox(P, x, 8, 7, 30, 3, [S[0], S[1], S[2]], [S[2], S[3], S[4]]);
    if (hi) { P.each(x, 8, x + 7, 35, (lx) => { const t = (lx + 0.5 - x) / 7; return t < 0.12 ? S[0] : t < 0.5 ? S[1] : t < 0.85 ? S[2] : S[3]; }); for (let y = 11; y < 35; y += 4) P.rect(x, y, 7, q, S[3]); rtsWRail(P, x - 0.5, x + 7.5, 11.5, S[0], S[4]); }
    rtsWDome(P, x + 3.5, 8, 4, Hd, 1);
    if (hi) for (const k of [-1, 1]) for (let y = 4.5; y < 11.5; y += 0.5) { const half = Math.sqrt(Math.max(0, 1 - ((y + 0.25 - 8) / 4) ** 2)) * 4; P.fp(x + 3.5 + k * half / 2, y, H[2]); }
    P.rect(x + 3, 1, 1, 4, gold[1]); P.px(x + 3, 0, gold[0]);
    P.rect(x + 2, 14, 3, 4, '#2C2014'); P.rect(x + 2, 14, 3, 4, rtsWHex(rtsWMix('#2C2014', '#F8D070', glow)), 0.8);
    P.rect(x + 2, 22, 3, 4, '#2C2014'); P.rect(x + 2, 22, 3, 4, rtsWHex(rtsWMix('#2C2014', '#F8D070', glow)), 0.6);
    if (hi) for (const wy of [14, 22]) { P.disc(x + 3.5, wy + 0.25, 1.5, rtsWMixH('#2C2014', '#F8D070', glow), 0.8); P.rect(x + 3.25, wy, q, 4, '#2C2014'); P.fframe(x + 2 - q, wy - q, 3 + 2 * q, 4 + 2 * q, gold[2]); }
  }
  // the banners either side of the door, the emblem in gold above it
  for (const x of [11, 30]) {
    const off = f & 1;
    P.rect(x, 31, 5, 8, H[1]); P.rect(x, 31, 5, 1, H[0]); P.rect(x + 4, 31, 1, 8, H[2]);
    P.px(x + 1, 39, H[1]); P.px(x + 3, 39 + off, H[1]);
    P.px(x + 2, 34, gold[0]); P.px(x + 2, 35, gold[1]); P.px(x + 1, 35, gold[1]); P.px(x + 3, 35, gold[1]);
    if (hi) {
      P.rect(x, 31, 5, q, gold[1]); P.rect(x + 0.5, 31.5, q, 7.5, H[0]);
      for (let k = 0; k < 5; k++) P.fp(x + k + 0.5, 39 + ((k + off) & 1) * 0.5, gold[1]);
      P.poly([[x + 2.5, 33], [x + 4, 35], [x + 2.5, 37], [x + 1, 35]], gold[1]); P.poly([[x + 2.5, 33], [x + 4, 35], [x + 2.5, 35]], gold[2]); P.fp(x + 2, 34, gold[0]);
    }
  }
  const [ew] = rtsWEmblemSize(house);
  rtsWEmblem(P, house, 23 - (ew >> 1), 20, gold[f === 2 ? 0 : 1], gold[2]);
}
// DRAKON's fortress: black stone, spiked battlements, horned towers, fire in the braziers
function rtsWPalaceDrakon(P, H, house, f) {
  const S = ['#A8A0A0', '#888080', '#686060', '#4C4444', '#343030', '#1C1818'], fire = ['#FCF0A0', '#F8B800', '#F86800', '#C82800'], hi = P.s > 1, q = P.q;
  const courses = (x, y, w, h, c, step = 2) => {
    for (let j = y + step; j < y + h - 0.5; j += step) {
      P.rect(x + q, j, w - 2 * q, q, c);
      for (let i = x + ((j - y) / step & 1 ? 1.5 : 3); i < x + w - 1; i += 3) P.rect(i, j - step + q, q, step - q, c);
    }
  };
  rtsWBox(P, 1, 18, 45, 28, 4, [S[2], S[3], S[4]], [S[3], S[4], S[5]]);
  if (hi) { courses(1, 18, 45, 24, S[4], 3); courses(1, 42, 45, 4, S[5], 1.5); }
  for (let k = 0; k < 4; k++) P.rect(17 + k, 42 + k, 12 - k * 2, 1, S[k & 1 ? 3 : 2]);
  if (hi) for (let k = 0; k < 4; k++) P.rect(17 + k, 42 + k, 12 - k * 2, q, S[1]);
  // the keep
  rtsWBox(P, 8, 10, 30, 30, 11, [S[1], S[2], S[3]], [S[3], S[4], S[5]]);
  rtsWSeams(P, 8, 10, 30, 19, 4, S[4], false);
  if (hi) courses(8, 29, 30, 11, S[5], 2);
  for (let x = 8; x < 38; x += 4) {
    if (!hi) { P.rect(x, 7, 2, 4, S[2]); P.px(x, 7, S[0]); P.px(x + 1, 6, S[1]); continue; }   // spiked crenels
    P.rect(x, 8, 2, 3, S[2]); P.rect(x, 8, q, 3, S[0]); P.rect(x + 2 - q, 8, q, 3, S[4]);
    P.poly([[x, 8], [x + 1.5, 5], [x + 2, 8]], S[1]); P.poly([[x + 1.5, 5], [x + 2, 8], [x + 1.25, 8]], S[3]); P.fp(x + 1, 6, S[0]);
  }
  // the gate: a fanged arch, a red glow inside
  P.rect(18, 31, 10, 9, '#140C0C'); P.ell(23, 31, 5, 4, '#140C0C');
  P.rect(19, 34, 8, 6, rtsWHex(rtsWMix('#3C0C08', '#F84818', [0.3, 0.6, 0.9, 0.6][f])));
  for (let x = 19; x < 28; x += 2) P.px(x, 30 + (x & 2 ? 1 : 0), S[0]);
  if (hi) {
    // the portcullis half raised: its bars and the fangs over the arch
    for (let x = 19.5; x < 27; x += 1.5) { P.rect(x, 29, q, 5, S[4]); P.rect(x + q, 29, q, 5, S[2]); P.fp(x, 34, S[1]); }
    for (let y = 30; y < 34; y += 1.5) P.rect(19, y, 8, q, S[4]);
    for (let x = 18.5; x < 28; x += 2) P.poly([[x, 28.5], [x + 1.5, 28.5], [x + 0.75, 31]], '#E8E0D0');
    P.each(17, 26, 29, 40, (x, y) => { const u = x + 0.5 - 23, v = y + 0.5 - 31; const out = v < 0 ? Math.hypot(u / 5.6, v / 4.6) : Math.abs(u) / 5.6; const inn = v < 0 ? Math.hypot(u / 5, v / 4) : Math.abs(u) / 5; return out <= 1 && inn > 1 ? S[u < 0 ? 1 : 4] : null; });
  }
  // the red banner with the skull hanging over the gate
  P.rect(17, 12, 12, 15, H[1]); P.rect(17, 12, 12, 1, H[0]); P.rect(28, 12, 1, 15, H[2]);
  for (let x = 17; x < 29; x += 2) P.px(x, 27 + (((x >> 1) + f) & 1), H[1]);
  if (hi) {
    P.each(17, 12, 29, 28, (x, y) => { const t = (x + 0.5 - 17) / 12, fold = Math.sin(t * Math.PI * 3 + f * 0.6); return y > 12.5 && y < 27 ? (fold > 0.6 ? rtsWMixH(H[1], '#FFFFFF', 0.15) : fold < -0.6 ? H[2] : null) : null; });
    P.rect(16.5, 11.5, 13, 1, S[1]); P.rect(16.5, 11.5, 13, q, S[0]);
    for (let x = 17.5; x < 29; x += 2) P.poly([[x - 0.5, 27], [x + 0.5, 27], [x, 28.5 + (((x * 2) + f) & 1) * 0.5]], H[2]);
  }
  rtsWEmblem(P, house, 19, 15, '#E8E0D0', '#2C1C18');
  // the horned towers
  for (const x of [1, 37]) {
    rtsWBox(P, x, 6, 9, 32, 4, [S[1], S[2], S[3]], [S[3], S[4], S[5]]);
    if (hi) { courses(x, 10, 9, 24, S[4], 2.5); }
    if (!hi) { P.line(x, 6, x - 1, 1, S[0]); P.line(x + 1, 6, x, 2, S[2]); P.line(x + 8, 6, x + 9, 1, S[0]); P.line(x + 7, 6, x + 8, 2, S[2]); }
    else {
      // the horns: curving up and out, ridged
      for (const [b, d] of [[x, -1], [x + 9, 1]]) {
        const pts = [];
        for (let t = 0; t <= 1; t += 0.1) pts.push([b + d * (Math.sin(t * 1.4) * 2.2) - (d > 0 ? 1 : 0), 7 - t * 6.5]);
        for (let k = 0; k + 1 < pts.length; k++) { const w = 1.4 * (1 - k / pts.length) + 0.4; P.line(pts[k][0], pts[k][1], pts[k + 1][0], pts[k + 1][1], S[1]); P.rect(pts[k][0] - w / 2 + 0.5, pts[k][1], w, 0.5, k & 1 ? S[2] : S[0]); }
        P.fp(pts[pts.length - 1][0] + 0.5, pts[pts.length - 1][1], '#E8E0D0');
      }
    }
    P.rect(x + 3, 15, 3, 5, '#140C0C'); P.rect(x + 3, 16, 3, 3, fire[3], 0.5 + 0.15 * (f & 1));
    if (hi) { P.ell(x + 4.5, 15, 1.5, 1, '#140C0C'); P.rect(x + 4.25, 15, q, 5, S[4]); P.rect(x + 3, 23, 3, 3, '#140C0C'); P.rect(x + 3, 23.5, 3, 2.5, fire[3], 0.35 + 0.1 * (f & 1)); }
    // the brazier on top
    P.rect(x + 2, 7, 5, 3, S[4]); P.rect(x + 2, 7, 5, 1, S[2]);
    const fl = [[0, 1, 2], [1, 2, 1], [2, 1, 0], [1, 0, 1]][f];
    if (!hi) {
      for (let k = 0; k < 3; k++) { P.rect(x + 3 + k, 5 - fl[k], 1, 2 + fl[k], fire[2]); P.px(x + 3 + k, 6 - fl[k], fire[1]); }
      P.px(x + 4, 5 - fl[1], fire[0]);
    } else {
      P.rect(x + 2, 7, 5, q, S[1]); P.rect(x + 2, 9.5, 5, q, S[5]);
      for (let k = 0; k < 6; k++) {
        const fx = x + 2.75 + k * 0.6, ht = 2 + fl[k >> 1] + ((k + f) & 1) * 0.5;
        P.rect(fx, 7 - ht + 0.5, 0.5, ht, fire[2]); P.rect(fx, 7 - ht + 1, 0.5, ht - 1, fire[1]); P.fp(fx, 7 - ht + 0.5, fire[k & 1 ? 1 : 0]);
      }
      P.rect(x + 3.5, 6, 2, 1, fire[0]); P.fp(x + 4, 6.5, '#FFFFFF');
      P.fp(x + 3 + (f & 1), 2.5 - fl[1] * 0.5, fire[2], 0.7); P.fp(x + 5.5 - (f & 1), 1.5 - fl[0] * 0.5, fire[3], 0.6);
    }
  }
}
// SERPENS' temple: three steps of jade-roofed terraces, gold trim, the serpent in gold, lanterns
function rtsWPalaceSerpens(P, H, house, f) {
  const S = ['#F8E8C0', '#E0C890', '#C0A068', '#987848', '#6C5030', '#44301C'], gold = ['#FCF0A0', '#F8C838', '#B88818'], hi = P.s > 1, q = P.q;
  const J = [rtsWHex(rtsWMix(H[0], '#FFFFFF', 0.3)), H[0], H[1], H[2], rtsWHex(rtsWMix(H[2], '#000000', 0.4))];
  const tier = (x, y, w, h, d) => {
    rtsWBox(P, x, y, w, h, d, [J[1], J[2], J[3]], [S[2], S[3], S[4]]);
    for (let i = x + 2; i < x + w - 1; i += 3) P.rect(i, y + 1, 1, h - d - 2, J[3]);   // the roof's tiles
    P.rect(x, y + h - d, w, 1, gold[1]);
    if (hi) {
      // tiles in rows, each lit on its left, a ridge of gold along the eave, the wall below in panels
      for (let i = x + 2; i < x + w - 1; i += 3) { P.rect(i, y + 1, q, h - d - 2, J[4]); P.rect(i + 1, y + 1, q, h - d - 2, J[0]); }
      for (let j = y + 2.5; j < y + h - d - 1; j += 2) P.rect(x + 1, j, w - 2, q, J[3]);
      P.rect(x, y + h - d, w, q, gold[0]); P.rect(x, y + h - d + 0.5, w, q, gold[2]);
      for (let i = x + 1; i < x + w; i += 1.5) P.fp(i, y + h - d + 1, gold[2]);
      for (let i = x + 3; i < x + w - 1; i += 4) P.rect(i, y + h - d + 1.5, q, d - 2, S[4]);
    }
  };
  tier(1, 22, 45, 24, 5);
  tier(7, 13, 33, 22, 5);
  tier(13, 5, 21, 19, 5);
  // the sanctum on top, with its lantern
  rtsWBox(P, 18, 0, 11, 10, 4, [S[0], S[1], S[2]], [S[2], S[3], S[4]]);
  P.rect(22, 6, 3, 4, '#1C1008'); P.rect(22, 7, 3, 3, rtsWHex(rtsWMix('#3C2008', gold[0], [0.3, 0.6, 1, 0.6][f])));
  if (hi) { P.ell(23.5, 6.25, 1.5, 1, '#1C1008'); P.fframe(21.5, 5.5, 4, 4.5, gold[1]); P.rect(18, 0, 11, q, gold[0]); for (let x = 19; x < 28; x += 2) P.fp(x, 0.5, gold[2]); P.disc(23.5, 3, 1.2, gold[1]); P.fp(23, 2.5, gold[0]); }
  // the stair up the middle
  for (let y = 17; y < 46; y++) P.rect(20, y, 7, 1, (y & 1) ? S[1] : S[2]);
  P.rect(19, 17, 1, 29, gold[2]); P.rect(27, 17, 1, 29, gold[2]);
  if (hi) { for (let y = 17; y < 46; y++) { P.rect(20, y, 7, q, S[0]); P.rect(20, y + 0.5, 7, q, S[3]); } P.rect(19, 17, q, 29, gold[0]); P.rect(27, 17, q, 29, gold[1]); }
  // the serpent in gold beside it, and the House's emblem on the middle step
  const [ew] = rtsWEmblemSize(house);
  rtsWEmblem(P, house, 9, 33, gold[f === 2 ? 0 : 1], gold[2]);
  rtsWEmblem(P, house, 29, 33, gold[f === 2 ? 0 : 1], gold[2]);
  rtsWEmblem(P, house, 24 - (ew >> 1), 6 + 5, J[0], J[3]);
  // lanterns on the corners, glowing in turn
  for (const [x, y, k] of [[3, 24, 0], [43, 24, 1], [9, 15, 2], [37, 15, 3]]) {
    if (hi) { P.rect(x - 0.5, y - 1.5, 2, 1, gold[2]); P.rect(x, y - 2, q, 0.5, gold[1]); }
    rtsWLamp(P, x, y, (f + k) & 1, '#F8D838');
  }
}

// the turrets: an armoured octagonal bunker, on it the gun (or the rocket pod) turned to dir8, a flash when it fires
function rtsWTurret(P, H, rocket, dir, firing) {
  if (P.s > 1) return rtsWTurret2(P, H, rocket, dir, firing);
  const M = RTS_W_M, a = dir * Math.PI / 4, dx = Math.sin(a), dy = -Math.cos(a), cx = 7.5, cy = 7, DK = '#2A2420';
  const Hd = [rtsWHex(rtsWMix(H[0], '#FFFFFF', 0.35)), H[0], H[1], H[2], rtsWHex(rtsWMix(H[2], '#000000', 0.45))];
  // the bunker: an octagon, lit top, a face of concrete below, the House's band
  const oct = (x, y) => x >= 1 && x <= 13 && y >= 1 && y <= 11 && (x - 1) + (y - 1) >= 2 && (13 - x) + (y - 1) >= 2 && (x - 1) + (11 - y) >= 2 && (13 - x) + (11 - y) >= 2;
  for (let y = 1; y < 15; y++) for (let x = 1; x < 14; x++) {
    if (oct(x, y)) P.px(x, y, !oct(x - 1, y) || !oct(x, y - 1) ? M[2] : !oct(x + 1, y) ? M[4] : M[3]);
    else if (y > 11 && oct(x, y - 3) && !oct(x, y)) P.px(x, y, y === 14 ? M[6] : y === 12 ? H[2] : M[5]);
  }
  for (const [x, y] of [[3, 3], [11, 3], [3, 9], [11, 9]]) P.px(x, y, M[5]);
  if (!rocket) {
    // the gun: a thick barrel with a lit edge, a muzzle brake, the cupola in the House's colours
    const L = 7.5, ox = -dy, oy = dx;
    for (let t = 1; t <= L; t += 0.25) for (const s of [-1.2, 0, 1.2]) P.px(Math.round(cx + dx * t + ox * s - 0.5), Math.round(cy + dy * t + oy * s - 0.5), DK);
    for (let t = 1; t <= L - 0.5; t += 0.25) { P.px(Math.round(cx + dx * t - 0.5), Math.round(cy + dy * t - 0.5), M[1]); P.px(Math.round(cx + dx * t + ox * 0.6 - 0.5), Math.round(cy + dy * t + oy * 0.6 - 0.5), M[3]); }
    const mx = cx + dx * L, my = cy + dy * L; P.rect(Math.round(mx - 1), Math.round(my - 1), 2, 2, M[5]);
    rtsWDome(P, cx, cy, 3.8, Hd, 0.9);
    P.px(Math.round(cx - 0.5), Math.round(cy - 0.5), Hd[4]); P.px(Math.round(cx - 2.5), Math.round(cy - 2.5), Hd[0]);
    if (firing) { const fx = cx + dx * (L + 1.6), fy = cy + dy * (L + 1.6); P.disc(fx, fy, 2.2, '#F8B800'); P.disc(fx, fy, 1.3, '#FCF8D0'); }
  } else {
    // the rocket pod: a box in the House's colours turned to dir, two tubes with rockets' red noses in their mouths
    const px = -dy, py = dx;
    for (let t = -3; t <= 4.5; t += 0.25) for (let s = -3.5; s <= 3.5; s += 0.25) {
      const x = Math.round(cx + dx * t + px * s - 0.5), y = Math.round(cy + dy * t + py * s - 0.5);
      const edge = Math.abs(s) > 2.9 || t > 4 || t < -2.5;
      const lit = (-px * s - dx * t) * 0.35 + (-py * s - dy * t) * 0.45;
      P.px(x, y, edge ? DK : lit > 0.6 ? Hd[1] : lit > -0.6 ? Hd[2] : Hd[3]);
    }
    for (const s of [-1.5, 1.5]) {
      for (let t = 0; t <= 4.2; t += 0.25) P.px(Math.round(cx + dx * t + px * s - 0.5), Math.round(cy + dy * t + py * s - 0.5), M[1]);
      const x = Math.round(cx + dx * 4.4 + px * s - 0.5), y = Math.round(cy + dy * 4.4 + py * s - 0.5);
      P.px(x, y, '#F83818');
      if (firing) { P.disc(x + 0.5 + dx * 2.2, y + 0.5 + dy * 2.2, 1.9, '#F8B800'); P.px(Math.round(x + dx * 2), Math.round(y + dy * 2), '#FCF8D0'); }
    }
    P.disc(cx - dx * 1.5, cy - dy * 1.5, 1.2, M[0]);
  }
}
// the turrets at res 2, drawn pixel by pixel in the gun's own frame (t along the barrel, u across it): the bunker
// with its armour plates, bolts and the House's band; the gun's barrel shaded round with a slotted muzzle brake,
// the cupola with its hatch and periscope; or the rocket pod with its two tubes, the rockets' noses, hazard marks
function rtsWTurret2(P, H, rocket, dir, firing) {
  const M = RTS_W_M, a = dir * Math.PI / 4, dx = Math.sin(a), dy = -Math.cos(a), cx = 7.5, cy = 7, DK = '#2A2420', q = P.q;
  const Hd = [rtsWHex(rtsWMix(H[0], '#FFFFFF', 0.35)), H[0], H[1], H[2], rtsWHex(rtsWMix(H[2], '#000000', 0.45))];
  const oct = (x, y) => x >= 1 && x < 14 && y >= 1 && y < 12 && (x - 1) + (y - 1) >= 2 && (14 - x) + (y - 1) >= 2 && (x - 1) + (12 - y) >= 2 && (14 - x) + (12 - y) >= 2;
  P.each(0, 0, 16, 16, (x, y, X, Y) => {
    const lx = x + 0.25, ly = y + 0.25;
    if (oct(lx, ly)) {
      if (!oct(lx - q, ly) || !oct(lx, ly - q)) return M[1];
      if (!oct(lx - 2 * q, ly) || !oct(lx, ly - 2 * q)) return M[2];
      if (!oct(lx + q, ly)) return M[5];
      if (!oct(lx + 2 * q, ly) || !oct(lx, ly + q)) return M[4];
      // plates: a seam ring, radial seams
      const r = Math.hypot((lx - 7.5) / 6.5, (ly - 6.5) / 5.5);
      if (Math.abs(r - 0.72) < 0.05) return M[4];
      return (X + Y) % 9 === 0 ? M[2] : M[3];
    }
    if (ly >= 9) {
      // the face below: the House's band, concrete with its joints, the foot in shadow
      let k0 = -1;
      for (let k = q; k <= 3.001; k += q) if (oct(lx, ly - k)) { k0 = k; break; }
      if (k0 < 0) return null;
      if (k0 <= q) return H[1];
      if (k0 <= 1) return H[2];
      if (k0 > 2.5) return M[6];
      return !oct(lx - 0.5, ly - k0) ? M[3] : (X & 3) === 0 ? M[6] : M[5];
    }
    return null;
  });
  for (const [x, y] of [[3.5, 3], [11, 3], [3.5, 9.5], [11, 9.5], [7.25, 1.75], [1.75, 6.25], [12.75, 6.25]]) { P.fp(x, y, M[6]); P.fp(x + q, y + q, M[1]); }
  // the gun's frame: (t, u) of a logical point
  const tu = (x, y) => { const ux = x + 0.5 - cx, uy = y + 0.5 - cy; return [ux * dx + uy * dy, ux * -dy + uy * dx]; };
  // light from the top left: across the barrel the lit side is the one facing (-1, -1)
  const litU = (-1 * -dy + -1 * dx) > 0 ? -1 : 1;
  if (!rocket) {
    const L = 7.7;
    P.each(0, 0, 16, 16, (x, y) => {
      const [t, u] = tu(x, y), au = Math.abs(u);
      if (t < 1 || t > L + 0.3) return null;
      const brake = t > L - 1.6;
      const w = brake ? 1.7 : 1.2 + (t < 3.2 ? 0.3 : 0);
      if (au > w + 0.5) return null;
      if (au > w) return DK;
      if (brake && Math.abs(t - (L - 0.8)) < 0.22) return M[6];
      const s = u * litU / w;
      return s < -0.55 ? M[0] : s < -0.1 ? M[1] : s < 0.4 ? M[3] : M[4];
    });
    // the bore at the muzzle
    P.disc(cx + dx * (L + 0.1) - 0.5 + 0.5, cy + dy * (L + 0.1) - 0.5 + 0.5, 0.45, M[6]);
    // the cupola: a dome, its hatch ring and handle, the periscope on its far side
    rtsWDome(P, cx, cy, 3.9, Hd, 0.92);
    P.each(3, 2.5, 12, 11.5, (x, y) => { const d = Math.hypot(x + 0.5 - (cx - 0.7), y + 0.5 - (cy - 0.6)); return Math.abs(d - 1.5) < 0.26 ? Hd[3] : null; });
    P.fp(cx - 1.2, cy - 1.1, Hd[0]);
    P.rect(cx - dx * 2.5 - 0.5, cy - dy * 2.5 - 0.5, 1, 1, M[3]); P.fp(cx - dx * 2.5 - 0.5, cy - dy * 2.5 - 0.5, RTS_W_C.glass[1]);
    if (firing) {
      const fx = cx + dx * (L + 1.8), fy = cy + dy * (L + 1.8);
      P.disc(fx, fy, 2.4, '#F86800', 0.85); P.disc(fx, fy, 1.7, '#F8B800'); P.disc(fx, fy, 0.9, '#FCF8D0');
      for (const s of [-1, 1]) P.fline(fx, fy, fx + (-dy * s) * 2.6 + dx * 0.8, fy + (dx * s) * 2.6 + dy * 0.8, '#F8D040');
      P.fline(fx, fy, fx + dx * 3, fy + dy * 3, '#FCF0A0');
    }
  } else {
    P.each(0, 0, 16, 16, (x, y, X, Y) => {
      const [t, u] = tu(x, y), au = Math.abs(u);
      if (t < -2.8 || t > 4.6 || au > 3.6) return null;
      if (au > 3.1 || t > 4.2 || t < -2.4) return DK;
      // two tubes running along the pod, the box between and round them
      for (const s of [-1.5, 1.5]) {
        const v = (u - s) / 1.05;
        if (Math.abs(v) <= 1 && t > -1.8) {
          if (t > 3.5) return Math.abs(v) < 0.55 ? '#140C08' : M[5];
          const sv = v * litU;
          return sv < -0.5 ? M[0] : sv < 0 ? M[1] : sv < 0.6 ? M[2] : M[4];
        }
      }
      const lit = -(u * litU) / 3 - t * 0.08;
      if (t < -1.8 && t > -2.3) return ((X + Y) >> 1) & 1 ? RTS_W_C.hazard[0] : RTS_W_C.hazard[1];
      return lit > 0.35 ? Hd[0] : lit > -0.05 ? Hd[1] : lit > -0.4 ? Hd[2] : Hd[3];
    });
    for (const s of [-1.5, 1.5]) {
      const x = cx + dx * 3.95 + -dy * s, y = cy + dy * 3.95 + dx * s;
      P.disc(x - 0.5 + 0.5, y - 0.5 + 0.5, 0.55, '#F83818'); P.fp(x - 0.25, y - 0.25, '#FCA088');
      if (firing) { const fx = x + dx * 2.2, fy = y + dy * 2.2; P.disc(fx, fy, 1.9, '#F86800', 0.85); P.disc(fx, fy, 1.2, '#F8B800'); P.disc(fx, fy, 0.6, '#FCF8D0'); }
    }
    P.disc(cx - dx * 1.6, cy - dy * 1.6, 1.1, Hd[3]); P.disc(cx - dx * 1.6 - 0.25, cy - dy * 1.6 - 0.25, 0.7, M[1]);
  }
}

// damage: scorch, holes burnt through with embers glowing in them, cracks; worse when heavily damaged
function rtsWDamage(P, key, dmg, f) {
  if (!dmg) return;
  if (P.s > 1) return rtsWDamage2(P, key, dmg, f);
  let seed = 7;
  for (let i = 0; i < key.length; i++) seed = seed * 31 + key.charCodeAt(i);
  const R = rtsWSeeded(seed), w = P.w, h = P.h, M = RTS_W_M;
  const pick = (margin) => {
    for (let k = 0; k < 40; k++) {
      const x = margin + Math.floor(R() * (w - margin * 2 - 3)), y = margin + Math.floor(R() * (h - margin * 2 - 3));
      if (P.on(x, y) && P.get(x, y)[3] > 200 && P.on(x - 2, y - 2) && P.on(x + 2, y + 2)) return [x, y];
    }
    return null;
  };
  if (dmg >= 2) for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (P.get(x, y)[3] > 200) P.tint(x, y, '#2C2018', 0.22);
  const scorch = dmg === 1 ? 3 : 6, holes = dmg === 1 ? 1 : 4, cracks = dmg === 1 ? 2 : 4;
  for (let k = 0; k < scorch; k++) {
    const p = pick(2); if (!p) continue;
    const r = 2.5 + R() * (dmg + 1.5);
    for (let y = Math.floor(p[1] - r); y <= p[1] + r; y++) for (let x = Math.floor(p[0] - r); x <= p[0] + r; x++) {
      const d = Math.hypot(x - p[0], y - p[1]) / r;
      if (d < 1 && P.get(x, y) && P.get(x, y)[3] > 200 && rtsWBayer(x, y) < 1.1 - d) P.tint(x, y, '#1C140C', 0.55 - d * 0.3);
    }
  }
  for (let k = 0; k < cracks; k++) {
    const p = pick(2); if (!p) continue;
    let [x, y] = p; const dx = R() < 0.5 ? 1 : -1;
    for (let i = 0; i < 4 + dmg * 2; i++) { if (P.get(x, y) && P.get(x, y)[3] > 200) P.px(x, y, '#241A12'); if (R() < 0.6) x += dx; else y++; }
  }
  for (let k = 0; k < holes; k++) {
    const p = pick(3); if (!p) continue;
    const r = 1.4 + R() * (dmg === 1 ? 1 : 2.2);
    // soot streaked up the wall above it
    for (let y = Math.floor(p[1] - r * 3); y < p[1] - r; y++) for (let x = Math.round(p[0] - r * 0.6); x <= p[0] + r * 0.6; x++) {
      const t = (p[1] - r - y) / (r * 2);
      if (P.get(x, y) && P.get(x, y)[3] > 200 && rtsWBayer(x, y) < 0.85 - t) P.tint(x, y, '#140C08', 0.4 * (1 - t));
    }
    for (let y = Math.floor(p[1] - r - 1); y <= p[1] + r + 1; y++) for (let x = Math.floor(p[0] - r - 1); x <= p[0] + r + 1; x++) {
      const d = Math.hypot(x - p[0], y - p[1]) / (r * (0.75 + rtsWHash(x, y, seed) * 0.5));
      if (!P.get(x, y) || P.get(x, y)[3] < 200) continue;
      if (d < 1) P.px(x, y, '#100A06');
      else if (d < 1.45) P.px(x, y, (x - p[0]) + (y - p[1]) > 0 ? M[4] : '#3C2C20');
    }
    // a bent girder across it, embers inside that flicker
    if (r > 2) P.line(p[0] - r + 1, p[1] - 1, p[0] + r - 1, p[1] + 1, M[4]);
    const ember = ['#F86800', '#F8B800', '#C83000', '#F89000'];
    for (let e = 0; e < (dmg === 1 ? 1 : 3); e++) {
      const ex = Math.round(p[0] + (rtsWHash(k, e, seed) - 0.5) * r), ey = Math.round(p[1] + (rtsWHash(e, k, seed) - 0.5) * r);
      P.px(ex, ey, ember[(f + e + k) & 3]);
    }
  }
}
// damage at res 2: soot blown across it and streaked up from the holes, cracks that branch, holes torn through
// with their plating bent back (lit on the lip that faces the light), the girders inside exposed, embers, and
// when it's heavily damaged small flames licking out of them (animated with f)
function rtsWDamage2(P, key, dmg, f) {
  let seed = 7;
  for (let i = 0; i < key.length; i++) seed = seed * 31 + key.charCodeAt(i);
  const R = rtsWSeeded(seed), w = P.w, h = P.h, M = RTS_W_M, s = P.s;
  const solid = (x, y) => P.alpha(x, y) > 200;
  const pick = (margin) => {
    for (let k = 0; k < 60; k++) {
      const x = margin + Math.floor(R() * (w - margin * 2 - 6)), y = margin + Math.floor(R() * (h - margin * 2 - 6));
      if (solid(x, y) && solid(x - 4, y - 4) && solid(x + 4, y + 4) && solid(x + 4, y - 4) && solid(x - 4, y + 4)) return [x, y];
    }
    return null;
  };
  if (dmg >= 2) for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (solid(x, y)) P.tint(x, y, '#2C2018', 0.22);
  // as many as on a 2 x 2 building, in proportion to its area
  const ar = Math.min(1.6, w * h / 4096), nn = v => Math.max(1, Math.round(v * ar));
  const scorch = nn(dmg === 1 ? 3 : 6), holes = nn(dmg === 1 ? 1 : 4), cracks = nn(dmg === 1 ? 3 : 6);
  for (let k = 0; k < scorch; k++) {
    const p = pick(4); if (!p) continue;
    const r = (2.5 + R() * (dmg + 1.5)) * s;
    for (let y = Math.floor(p[1] - r); y <= p[1] + r; y++) for (let x = Math.floor(p[0] - r); x <= p[0] + r; x++) {
      const d = Math.hypot(x - p[0], y - p[1]) / r + (rtsWHash(x, y, seed + 3) - 0.5) * 0.25;
      if (d < 1 && solid(x, y) && rtsWBayer(x, y) < 1.15 - d) P.tint(x, y, '#1C140C', 0.6 - d * 0.35);
    }
  }
  for (let k = 0; k < cracks; k++) {
    const p = pick(4); if (!p) continue;
    const walk = (x, y, n, dx, depth) => {
      for (let i = 0; i < n; i++) {
        if (!solid(x, y)) return;
        P.dpx(x, y, '#241A12'); if (solid(x + 1, y + 1)) P.tint(x + 1, y + 1, '#FFFFFF', 0.15);
        if (R() < 0.55) x += dx; else y++;
        if (depth < 2 && R() < 0.12) walk(x, y, n >> 1, -dx, depth + 1);
      }
    };
    walk(p[0], p[1], (5 + dmg * 3) * s, R() < 0.5 ? 1 : -1, 0);
  }
  const ember = ['#F86800', '#F8B800', '#C83000', '#F89000'], flame = ['#FCF0A0', '#F8C800', '#F88000', '#D83000'];
  for (let k = 0; k < holes; k++) {
    const p = pick(6); if (!p) continue;
    const r = (1.5 + R() * (dmg === 1 ? 1 : 2.2)) * s * Math.max(0.6, Math.min(1, Math.sqrt(ar) * 1.2));
    // soot streaked up the wall above it
    for (let y = Math.floor(p[1] - r * 3.5); y < p[1]; y++) for (let x = Math.floor(p[0] - r); x <= p[0] + r; x++) {
      const t = (p[1] - y) / (r * 3.5), wdt = r * (1 - t * 0.4);
      if (Math.abs(x - p[0]) < wdt && solid(x, y) && rtsWBayer(x, y) < 0.9 - t) P.tint(x, y, '#140C08', 0.45 * (1 - t));
    }
    const ragged = (x, y) => Math.hypot(x - p[0], y - p[1]) / (r * (0.72 + rtsWHash(x >> 1, y >> 1, seed) * 0.55));
    for (let y = Math.floor(p[1] - r - 3); y <= p[1] + r + 3; y++) for (let x = Math.floor(p[0] - r - 3); x <= p[0] + r + 3; x++) {
      if (!solid(x, y)) continue;
      const d = ragged(x, y), sd = (x - p[0]) + (y - p[1]);
      if (d < 1) P.dpx(x, y, d < 0.7 ? '#0C0604' : '#1C120C');
      else if (d < 1.25) P.dpx(x, y, sd > 0 ? M[1] : '#2C2018');        // the torn lip: lit facing the light
      else if (d < 1.5) P.dpx(x, y, sd > 0 ? M[3] : '#3C2C20');
    }
    // the girders inside, crossed, their top edges lit
    if (r > 2.5) {
      const gx = p[0], gy = p[1];
      P.dline(Math.round(gx - r + 1), Math.round(gy - 1), Math.round(gx + r - 1), Math.round(gy + 1), M[4]);
      P.dline(Math.round(gx - r + 1), Math.round(gy - 2), Math.round(gx + r - 1), Math.round(gy), M[2]);
      if (r > 3.5) { P.dline(Math.round(gx - 1), Math.round(gy - r + 1), Math.round(gx + 1), Math.round(gy + r - 1), M[5]); P.dline(Math.round(gx - 2), Math.round(gy - r + 1), Math.round(gx), Math.round(gy + r - 1), M[3]); }
    }
    for (let e = 0; e < (dmg === 1 ? 2 : 4); e++) {
      const ex = Math.round(p[0] + (rtsWHash(k, e, seed) - 0.5) * r * 1.2), ey = Math.round(p[1] + (rtsWHash(e, k, seed) - 0.3) * r * 0.8);
      P.dpx(ex, ey, ember[(f + e + k) & 3]); if ((f + e) & 1) P.dpx(ex + 1, ey, ember[(f + e + k + 1) & 3]);
    }
    if (dmg >= 2 && k < 2) {
      // small flames licking up out of it
      for (let t = 0; t < 2; t++) {
        const fx = Math.round(p[0] - r * 0.3 + t * r * 0.6), ht = Math.round(r * 0.45 + ((f + t + k) % 3) * 1.2 + 2);
        for (let j = 0; j < ht; j++) {
          const wdt = j < ht * 0.45 ? 1 : 0, sway = Math.round(Math.sin((j + f * 2 + t) * 0.9) * 0.7);
          for (let i = -wdt; i <= wdt; i++) P.dpx(fx + i + sway, Math.round(p[1] - r * 0.3) - j, flame[Math.min(3, Math.abs(i) + (j > ht * 0.5 ? 1 : 0) + (j > ht * 0.8 ? 1 : 0))], j > ht * 0.7 ? 0.8 : 1);
        }
      }
    }
  }
  // bits of debris on the roof
  for (let k = 0; k < dmg * 3; k++) { const p = pick(4); if (p) { P.dpx(p[0], p[1], M[2]); P.dpx(p[0] + 1, p[1], M[4]); P.dpx(p[0] + 1, p[1] + 1, '#1C140C'); } }
}

// building up: the foundation marked out, the building rising out of the ground inside its scaffolding
function rtsWBuildStage(base, step) {
  const w = base.w, h = base.h, s = base.s, P = new RtsWPaint(base.lw, base.lh, s), Y = RTS_W_C.hazard[0], M = RTS_W_M;
  if (s > 1) return rtsWBuildStage2(base, step);
  P.rect(1, 1, w - 4, h - 4, '#2C241C', 0.55);
  for (const [x, y, sx, sy] of [[1, 1, 1, 1], [w - 4, 1, -1, 1], [1, h - 4, 1, -1], [w - 4, h - 4, -1, -1]]) {
    P.rect(Math.min(x, x + sx * 3), y, 4, 1, Y); P.rect(x, Math.min(y, y + sy * 3), 1, 4, Y);
  }
  const rise = Math.round(h * step / 8);
  for (let y = 0; y < rise; y++) for (let x = 0; x < w; x++) {
    const p = base.get(x, y);
    if (p[3]) P.px(x, y + h - rise, p, p[3] / 255);
  }
  if (step >= 8) return P;
  // the scaffolding: poles, rails, cross braces
  const top = Math.max(0, h - rise - 6), a = step > 6 ? 0.5 : 0.95;
  for (let x = 2; x < w - 3; x += 7) { P.rect(x, top, 1, h - 3 - top, M[2], a); P.rect(x + 1, top, 1, h - 3 - top, M[5], a * 0.6); }
  for (let y = h - 4; y >= top; y -= 6) { P.rect(2, y, w - 5, 1, M[1], a); P.rect(2, y + 1, w - 5, 1, M[5], a * 0.5); }
  for (let x = 2; x + 7 < w - 3; x += 7) for (let y = h - 4; y - 6 >= top; y -= 6) P.line(x, y, x + 7, y - 6, M[3], a * 0.8);
  // sparks where they weld
  const R = rtsWSeeded(step * 7 + w);
  for (let k = 0; k < 2; k++) rtsWSparks(P, 3 + Math.floor(R() * (w - 8)), Math.max(top + 1, h - rise - 1 + Math.floor(R() * 4)), step + k);
  return P;
}
// building up at res 2: the plot dug and marked with hazard tape on posts, the building rising out of it, the
// scaffolding round it in poles with their clamps, planks, braces; a hoist; welders' sparks at the top edge
function rtsWBuildStage2(base, step) {
  const s = base.s, W = base.lw, Hh = base.lh, P = new RtsWPaint(W, Hh, s), M = RTS_W_M, q = P.q, YW = ['#E8C890', '#C09858', '#7C5C30'];
  P.rect(1, 1, W - 4, Hh - 4, '#2C241C', 0.55);
  P.each(1, 1, W - 3, Hh - 3, (x, y, X, Y) => (rtsWHash(X, Y, 81) < 0.08 ? '#3C3024' : null));
  // tape on posts round the plot
  for (const [x0, y0, x1, y1] of [[1, 1, W - 3, 1], [1, Hh - 4, W - 3, Hh - 4], [1, 1, 1, Hh - 4], [W - 4, 1, W - 4, Hh - 4]]) {
    if (y0 === y1) P.each(x0, y0, x1, y0 + 0.5, (x, y, X) => ((X >> 2) & 1 ? RTS_W_C.hazard[0] : '#F8F0E0'));
    else P.each(x0, y0, x0 + 0.5, y1, (x, y, X, Y) => ((Y >> 2) & 1 ? RTS_W_C.hazard[0] : '#F8F0E0'));
  }
  for (const [x, y] of [[1, 1], [W - 4, 1], [1, Hh - 4], [W - 4, Hh - 4]]) { P.rect(x - 0.25, y - 0.25, 1, 1, M[5]); P.fp(x - 0.25, y - 0.25, M[1]); }
  const rise = Math.round(base.h * step / 8), h = base.h, w = base.w;
  for (let y = 0; y < rise; y++) for (let x = 0; x < w; x++) {
    const p = base.get(x, y);
    if (p[3]) P.dpx(x, y + h - rise, p, p[3] / 255);
  }
  // a fresh line where it is coming up out of the ground
  if (rise > 0 && step < 8) for (let x = 0; x < w; x++) if (P.on(x, h - rise)) P.dpx(x, h - rise, '#F8F0D0', 0.35);
  if (step >= 8) return P;
  const topL = Math.max(0, Hh - rise / s - 6), a = step > 6 ? 0.55 : 1;
  // poles with clamps, the ledgers across, planks on them, braces
  for (let x = 2; x < W - 3; x += 7) {
    P.rect(x, topL, 0.5, Hh - 3 - topL, M[1], a); P.rect(x + 0.5, topL, q, Hh - 3 - topL, M[4], a);
    for (let y = Hh - 4; y >= topL; y -= 6) { P.rect(x - 0.25, y - 0.25, 1, 1, M[5], a); P.fp(x - 0.25, y - 0.25, M[0], a); }
  }
  for (let y = Hh - 4; y >= topL; y -= 6) {
    P.rect(2, y, W - 5, q, M[1], a); P.rect(2, y + q, W - 5, q, M[4], a * 0.8);
    P.rect(2.5, y + 0.5, W - 6, 1, YW[1], a); P.rect(2.5, y + 0.5, W - 6, q, YW[0], a); P.rect(2.5, y + 1.5 - q, W - 6, q, YW[2], a);
    for (let x = 4; x < W - 4; x += 3.5) P.rect(x, y + 0.5, q, 1, YW[2], a);
  }
  for (let x = 2; x + 7 < W - 3; x += 7) for (let y = Hh - 4; y - 6 >= topL; y -= 6) P.fline(x + 0.5, y, x + 7, y - 5.5, M[3], a * 0.85);
  // a hoist on the top lift, its hook down to the work
  if (topL > 1 && step < 7) {
    const hx = W - 6;
    P.rect(hx, topL - 2, q, 2, M[2]); P.rect(hx - 2, topL - 2, 3, q, M[2]);
    P.fline(hx - 1.75, topL - 2, hx - 1.75, topL + 2, M[5]); P.fp(hx - 2, topL + 2, M[3]); P.fp(hx - 1.5, topL + 2.5, M[3]);
  }
  const R = rtsWSeeded(step * 7 + w);
  for (let k = 0; k < 3; k++) rtsWSparks(P, 3 + Math.floor(R() * (W - 8)), Math.max(topL + 1, (h - rise) / s - 1 + Math.floor(R() * 4)), step + k);
  return P;
}

// a white flash over the building (a hit)
function rtsWFlash(c) {
  const P = rtsWFromCanvas(c);
  for (let y = 0; y < P.h; y++) for (let x = 0; x < P.w; x++) { const p = P.get(x, y); if (p[3] > 120) P.tint(x, y, '#FFFFFF', 0.7); }
  return P.canvas();
}

const RTS_W_BLD_CACHE = new Map();
function rtsWBuildingPaint(key, house, f, dmg, st, r = 1) {
  const S = RTS_W_SIZE[key] || [2, 2], P = new RtsWPaint(S[0] * 16, S[1] * 16, r), H = rtsWHousePal(house);
  const draw = RTS_W_DRAW[key];
  if (draw) draw(P, H, house, f, st);
  else { rtsWBox(P, 1, 1, S[0] * 16 - 4, S[1] * 16 - 4, 5, rtsWHRoof(H), rtsWSide()); }
  if (key === 'slab1' || key === 'slab4') return P;
  P.outline(RTS_W_OUT);
  rtsWDamage(P, key, dmg, f);
  const sh = key === 'turret' || key === 'rturret' ? 2 : 3;
  P.shadow(sh * r, sh * r, 0.36, r > 1 ? 2 : 0);
  return P;
}
// rtsBuildingArt(key, house, state) -> canvas (w*16*res x h*16*res). state: { dmg 0..2, frame (any integer; wraps by
// RTS_W_FRAMES[key]), active (adds 4: building/unloading/producing/repairing for RTS_W_ACTIVE keys), door 0..3,
// build 0..1, flash, fill 0..1 (silo), dir8/firing (turrets), res 1 | 2 (default 1) }
function rtsBuildingArt(key, house, state) {
  state = state || {};
  const r = rtsWRes(state.res);
  if (key === 'wall') return rtsWallArt(house, state.mask === undefined ? 0 : state.mask, r);
  const n = RTS_W_FRAMES[key] || 1;
  let f = (((state.frame | 0) % n) + n) % n;
  if (state.active && RTS_W_ACTIVE[key]) f = 4 + (f & 3);
  const dmg = Math.max(0, Math.min(2, state.dmg | 0)), door = RTS_W_DOORS[key] ? Math.max(0, Math.min(3, state.door | 0)) : 0;
  const build = state.build === undefined || state.build === null ? 1 : Math.max(0, Math.min(1, +state.build || 0)), bs = Math.round(build * 8);
  const turret = key === 'turret' || key === 'rturret';
  const dir = turret ? (((state.dir8 | 0) % 8) + 8) % 8 : 0, firing = turret && state.firing ? 1 : 0;
  const fill = key === 'silo' ? Math.round(Math.max(0, Math.min(1, state.fill === undefined ? 0.5 : +state.fill || 0)) * 5) : 0;
  if (bs < 8) { f = 0; }
  const k = [key, house, f, dmg, door, bs, dir, firing, fill, r].join(':');
  const flash = !!state.flash;
  let c = RTS_W_BLD_CACHE.get(k);
  if (!c) {
    if (bs < 8) {
      const base = rtsWBuildingPaint(key, house, 0, 0, { door: 0, fill: 0, dir8: dir, firing: 0 }, r);
      c = rtsWBuildStage(base, bs).canvas();
    } else c = rtsWBuildingPaint(key, house, f, dmg, { door, fill: fill / 5, dir8: dir, firing }, r).canvas();
    RTS_W_BLD_CACHE.set(k, c);
  }
  if (!flash) return c;
  const kf = k + ':flash';
  let cf = RTS_W_BLD_CACHE.get(kf);
  if (!cf) { cf = rtsWFlash(c); RTS_W_BLD_CACHE.set(kf, cf); }
  return cf;
}

// ------------------------------------------------------------------ walls
// rtsWallArt(house, mask, res): a piece of wall, 16*res square, joined to its neighbours (mask 1 up, 2 right, 4 down,
// 8 left); stone blocks with a lit top, the face showing where the wall runs out towards the south, the House's mark
// on posts. At res 2 the blocks are cut finer (mortar lines, chips, each block lit along its top), the face in
// courses, the post's cap a little pyramid with the House's colour set in it.
const RTS_W_WALL = new Map();
function rtsWallArt(house, mask, res) {
  mask = (mask | 0) & 15;
  const r = rtsWRes(res), k = house + ':' + mask + ':' + r;
  if (RTS_W_WALL.has(k)) return RTS_W_WALL.get(k);
  const P = new RtsWPaint(16, 16, r), H = rtsWHousePal(house);
  const S = ['#E4DCCC', '#C8BCA8', '#A89C88', '#847866', '#5C5244', '#3C342C'];
  const up = mask & 1, rt = mask & 2, dn = mask & 4, lf = mask & 8;
  // the top surface (where the wall stands) and the face below where it ends
  const x0 = lf ? 0 : 3, x1 = rt ? 16 : 13, y0 = up ? 0 : 2, y1 = dn ? 16 : 10;
  const inTop = (x, y) => (x >= 3 && x < 13 && y >= y0 && y < y1) || (y >= 2 && y < 10 && x >= x0 && x < x1);
  const straight = mask === 5 || mask === 10;
  if (r === 1) {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      if (inTop(x, y)) {
        const row = (y + 16) >> 2, bx = (x + (row & 1) * 3) >> 2;
        let c = (y & 3) === 3 || ((x + (row & 1) * 3) & 3) === 3 ? S[3] : rtsWHash(bx, row, 5) < 0.3 ? S[2] : S[1];
        if (!inTop(x, y - 1)) c = S[0];
        else if (!inTop(x - 1, y)) c = S[0];
        else if (!inTop(x + 1, y)) c = S[3];
        P.px(x, y, c);
      } else if (inTop(x, y - 1) || inTop(x, y - 2) || inTop(x, y - 3) || inTop(x, y - 4)) {
        // the south face, in courses of stone
        let d = 1; while (d < 5 && !inTop(x, y - d)) d++;
        P.px(x, y, d === 4 ? S[5] : (x + (d >> 1)) % 4 === 0 ? S[5] : d === 1 ? S[3] : S[4]);
      }
    }
    // a post where the wall turns or ends: a cap with the House's colour
    if (!straight) { P.rect(5, 3, 6, 5, S[0]); P.rect(6, 4, 4, 3, H[1]); P.rect(6, 4, 4, 1, H[0]); P.rect(9, 5, 1, 2, H[2]); P.rect(5, 7, 6, 1, S[3]); }
  } else {
    // (blocks 4 wide in courses 2 high, so a run joins the next tile's)
    P.each(0, 0, 16, 16, (x, y, X, Y) => {
      const lx = (X + 0.5) / 2, ly = (Y + 0.5) / 2;
      if (inTop(lx, ly)) {
        if (!inTop(lx, ly - 0.5)) return S[0];
        if (!inTop(lx - 0.5, ly)) return S[0];
        if (!inTop(lx + 0.5, ly)) return S[3];
        if (!inTop(lx, ly + 0.5)) return S[3];
        const row = Y >> 2, off = (row & 1) * 4, bx = (X + off) >> 3, cy = Y & 3, cx = (X + off) & 7;
        if (cy === 3 || cx === 7) return S[3];
        if (cy === 0 || cx === 0) return S[rtsWHash(bx, row, 6) < 0.5 ? 0 : 1];
        if (rtsWHash(X, Y, 7) < 0.04) return S[3];
        const t = rtsWHash(bx, row, 5);
        return t < 0.25 ? S[2] : t > 0.85 ? rtsWMixH(S[1], S[0], 0.5) : S[1];
      }
      let d = 0;
      for (let n = 1; n <= 8; n++) if (inTop(lx, ly - n * 0.5)) { d = n; break; }
      if (!d) return null;
      // the south face: courses, joints staggered, the bottom course in shadow
      if (d === 1) return S[2];
      if (d >= 7) return S[5];
      if (d % 3 === 1) return S[5];
      const course = Math.floor((d - 1) / 3), j = ((X + course * 3) % 7) === 0;
      return j ? S[5] : d % 3 === 2 ? S[3] : S[4];
    });
    if (!straight) {
      // the post's cap: a low pyramid, the House's colour set in its top, a stud
      P.each(4.5, 2.5, 11.5, 8.5, (x, y) => {
        const u = (x + 0.5 - 8) / 3.5, v = (y + 0.5 - 5.5) / 3;
        if (Math.abs(u) > 1 || Math.abs(v) > 1) return null;
        if (Math.abs(u) < 0.55 && Math.abs(v) < 0.5) return null;
        return Math.abs(u) > Math.abs(v) ? (u < 0 ? S[0] : S[3]) : (v < 0 ? S[0] : S[2]);
      });
      P.rect(6, 4, 4, 3, H[1]); P.rect(6, 4, 4, 0.5, H[0]); P.rect(6, 4, 0.5, 3, H[0]); P.rect(9.5, 4.5, 0.5, 2.5, H[2]); P.rect(6.5, 6.5, 3, 0.5, H[2]);
      P.disc(8, 5.5, 0.8, rtsWMixH(H[0], '#FFFFFF', 0.4)); P.fp(7.5, 5, '#FFFFFF');
      P.rect(4.5, 8.5, 7, 0.5, S[4]);
    }
  }
  P.outline(RTS_W_OUT, 0.9);
  P.shadow(2 * r, 2 * r, 0.32);
  const c = P.canvas();
  RTS_W_WALL.set(k, c);
  return c;
}

// ------------------------------------------------------------------ build icons (32 x 24): a framed picture
// the building is drawn from its res 2 picture, shrunk by averaging (so its detail survives as texture), crisped,
// set on the sand under a dusty sky with a far mesa, in a frame bevelled in the House's colours with rivets
const RTS_W_ICON = new Map();
function rtsWIconFrame(P, house) {
  const H = rtsWHousePal(house), S = RTS_W_C.sand;
  // a dusty sky over the sand, a mesa on the horizon, the ground with its ripples
  for (let y = 1; y < 23; y++) {
    const t = (y - 1) / 22, c = t < 0.55 ? rtsWMix('#E8A868', '#F8D8A0', t / 0.55) : rtsWMix('#D89850', '#B87838', (t - 0.55) / 0.45);
    for (let x = 1; x < 31; x++) P.px(x, y, rtsWBayer(x, y) < 0.15 && t < 0.55 ? rtsWMix(c, '#FFFFFF', 0.15) : c);
  }
  for (let x = 1; x < 31; x++) {
    const hgt = Math.max(0, Math.round(3.2 - Math.abs(x - 7) * 0.5)) + (x > 20 && x < 28 ? Math.round(1.8 - Math.abs(x - 24) * 0.5) : 0);
    for (let j = 0; j < hgt; j++) P.px(x, 12 - j, j === hgt - 1 ? '#C88C68' : '#B87C5C');
  }
  for (let x = 1; x < 31; x++) { P.px(x, 13, S[1]); if (((x * 5) % 7) < 2) P.px(x, 17 + ((x >> 2) & 1), S[3]); if (((x * 3) % 11) < 2) P.px(x, 20, S[4]); }
  P.frame(0, 0, 32, 24, '#1A140F');
  P.rect(1, 1, 30, 1, H[0]); P.rect(1, 1, 1, 22, H[0]); P.rect(1, 22, 30, 1, H[2]); P.rect(30, 1, 1, 22, H[2]);
  for (const [x, y] of [[2, 2], [29, 2], [2, 21], [29, 21]]) P.px(x, y, rtsWHex(rtsWMix(H[2], '#000000', 0.35)));
}
// shrink src (a canvas) to fit maxW x maxH, its foot at bottom, centred on cx; averaged over the pixels it covers,
// then crisped (a little unsharp masking) and with hard edges
function rtsWIconFit(P, src, maxW, maxH, cx, bottom) {
  const s = Math.min(1, maxW / src.width, maxH / src.height), w = Math.max(1, Math.round(src.width * s)), h = Math.max(1, Math.round(src.height * s));
  const S = rtsWFromCanvas(src), sw = src.width / w, shh = src.height / h, n = 4;
  const out = new Float32Array(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let r = 0, g = 0, b = 0, a = 0;
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const p = S.get(Math.min(src.width - 1, Math.floor((x + (i + 0.5) / n) * sw)), Math.min(src.height - 1, Math.floor((y + (j + 0.5) / n) * shh)));
      const pa = p[3] / 255; r += p[0] * pa; g += p[1] * pa; b += p[2] * pa; a += pa;
    }
    const o = (y * w + x) * 4;
    if (a > 0) { out[o] = r / a; out[o + 1] = g / a; out[o + 2] = b / a; }
    out[o + 3] = a / (n * n);
  }
  const x0 = Math.round(cx - w / 2), y0 = bottom - h;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const o = (y * w + x) * 4, A = out[o + 3];
    if (A < 0.45) continue;
    // unsharp: push away from the mean of its solid neighbours
    let mr = 0, mg = 0, mb = 0, mn = 0;
    for (const [i, j] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const xx = x + i, yy = y + j;
      if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
      const o2 = (yy * w + xx) * 4;
      if (out[o2 + 3] < 0.45) continue;
      mr += out[o2]; mg += out[o2 + 1]; mb += out[o2 + 2]; mn++;
    }
    let c = [out[o], out[o + 1], out[o + 2]];
    if (mn) c = c.map((v, k) => v + (v - [mr, mg, mb][k] / mn) * 0.45);
    const dark = c[0] + c[1] + c[2] < 40;
    P.px(x0 + x, y0 + y, c, dark && A < 0.8 ? 0.4 : 1);
  }
}
function rtsBuildingIcon(key, house) {
  const k = key + ':' + house;
  if (RTS_W_ICON.has(k)) return RTS_W_ICON.get(k);
  const P = new RtsWPaint(32, 24);
  rtsWIconFrame(P, house);
  if (key === 'wall') {
    const c = makeCanvas(96, 64), g = c.getContext('2d');
    g.drawImage(rtsWallArt(house, 6, 2), 0, 0); g.drawImage(rtsWallArt(house, 10, 2), 32, 0); g.drawImage(rtsWallArt(house, 8, 2), 64, 0);
    g.drawImage(rtsWallArt(house, 1, 2), 0, 32);
    rtsWIconFit(P, c, 27, 20, 16, 22);
  } else if (key === 'turret' || key === 'rturret') {
    rtsWIconFit(P, rtsBuildingArt(key, house, { dir8: 3, res: 2 }), 28, 20, 16, 22);
  } else {
    const S = RTS_W_SIZE[key] || [2, 2];
    const c = rtsBuildingArt(key, house, { frame: key === 'radar' ? 1 : 0, res: 2 });
    rtsWIconFit(P, c, S[0] === 1 ? 20 : 29, S[1] === 3 ? 22 : 21, 16, 22);
  }
  const c = P.canvas();
  RTS_W_ICON.set(k, c);
  return c;
}

// ------------------------------------------------------------------ rubble where a building stood
// rtsRubbleArt(w, h, seed, res): w, h in tiles (or pixels if over 8); broken slabs, twisted girders, scorch; at res 2
// the slabs cracked and chipped, rebar sticking out of them, the girders I-sections, ash and embers
const RTS_W_RUBBLE = new Map();
function rtsRubbleArt(w, h, seed, res) {
  w = w | 0 || 1; h = h | 0 || 1; seed = seed | 0;
  const r = rtsWRes(res), W = w > 8 ? w : w * 16, Hh = h > 8 ? h : h * 16, k = W + 'x' + Hh + ':' + seed + ':' + r;
  if (RTS_W_RUBBLE.has(k)) return RTS_W_RUBBLE.get(k);
  const P = new RtsWPaint(W, Hh, r), R = rtsWSeeded(seed * 977 + W * 31 + Hh), M = RTS_W_M, C = RTS_W_C.conc, hi = r > 1, q = P.q;
  // the scorched ground where it stood
  if (!hi) {
    for (let y = 1; y < Hh - 1; y++) for (let x = 1; x < W - 1; x++) {
      const e = Math.min(x, y, W - 1 - x, Hh - 1 - y), n = rtsWNoise(x / 4, y / 4, seed + 3);
      if (e > 2 + n * 3 || rtsWBayer(x, y) < 0.3) P.px(x, y, '#1C140C', 0.25 + n * 0.35);
    }
  } else {
    for (let Y = 2; Y < P.h - 2; Y++) for (let X = 2; X < P.w - 2; X++) {
      const x = X / 2, y = Y / 2, e = Math.min(x, y, W - x, Hh - y), n = rtsWNoise(x / 4, y / 4, seed + 3);
      if (e > 2 + n * 3 || rtsWBayer(X, Y) < 0.3) P.dpx(X, Y, rtsWHash(X, Y, seed) < 0.1 ? '#4C4440' : '#1C140C', 0.25 + n * 0.35);
    }
  }
  // the stumps of walls along the old outline
  for (let x = 2; x < W - 3; x++) if (rtsWNoise(x / 3, 1, seed + 5) > 0.45) { P.px(x, Hh - 5, M[3]); P.px(x, Hh - 4, M[5]); if (rtsWHash(x, 0, seed) < 0.5) P.px(x, Hh - 6, M[2]); if (hi) P.fp(x, Hh - 5, M[1]); }
  for (let y = 3; y < Hh - 4; y++) if (rtsWNoise(1, y / 3, seed + 6) > 0.5) { P.px(2, y, M[2]); P.px(3, y, M[4]); if (hi) P.fp(2, y, M[1]); }
  // broken slabs and blocks
  const n = Math.round(W * Hh / 70);
  for (let i = 0; i < n; i++) {
    const bw = 2 + Math.floor(R() * 4), bh = 1 + Math.floor(R() * 3), x = 2 + Math.floor(R() * (W - bw - 4)), y = 2 + Math.floor(R() * (Hh - bh - 4));
    const pal = R() < 0.6 ? [C[0], C[2], C[4]] : [M[2], M[3], M[5]];
    P.rect(x, y, bw, bh, pal[1]); P.rect(x, y, bw, 1, pal[0]); P.rect(x + bw - 1, y, 1, bh, pal[2]); P.rect(x + 1, y + bh, bw, 1, '#140C08', 0.5);
    if (hi) {
      P.rect(x, y, bw, q, '#FFFFFF', 0.35); P.rect(x, y + 0.5, bw - 1, 0.5, pal[1]); P.rect(x + bw - q, y, q, bh, '#140C08', 0.5);
      if (bw > 2) P.fline(x + 0.5, y + bh - 0.5, x + bw - 1, y + 0.5, pal[2]);
      if (R() < 0.35) P.clear(x + bw - 1, y, 1, 1);
      if (pal[0] === C[0] && R() < 0.5) { const rx = x + R() * (bw - 1); P.fline(rx, y + 0.5, rx + (R() - 0.5) * 3, y - 1.5, '#8C4C2C'); }
    }
  }
  // twisted girders and pipes
  for (let i = 0; i < Math.max(2, n >> 2); i++) {
    const x = 3 + Math.floor(R() * (W - 8)), y = 3 + Math.floor(R() * (Hh - 8)), l = 3 + Math.floor(R() * 5);
    const y1 = y + Math.floor((R() - 0.5) * 4), y2 = y - 1 + Math.floor((R() - 0.5) * 3);
    P.line(x, y, x + l, y1, M[5]); P.line(x, y - 1, x + l - 1, y2, M[3]);
    if (hi) { P.fline(x, y - 1, x + l - 1, y2, M[1]); P.fline(x + 0.5, y + 0.5, x + l, y1 + 0.5, M[6]); }
  }
  // a few embers still glowing, smoke stains
  for (let i = 0; i < 3; i++) {
    const ex = 3 + Math.floor(R() * (W - 6)), ey = 3 + Math.floor(R() * (Hh - 6));
    if (!hi) P.px(ex, ey, i ? '#C83000' : '#F88000');
    else { P.fp(ex, ey, i ? '#C83000' : '#F88000'); P.fp(ex + 0.5, ey, '#F8B800'); P.fp(ex, ey + 0.5, '#C83000'); P.fp(ex - 0.5, ey - 0.5, '#5C4C44'); }
  }
  const c = P.canvas();
  RTS_W_RUBBLE.set(k, c);
  return c;
}

// ------------------------------------------------------------------ the SANDWYRM
// rtsWormArt(phase, frame, dir8, res) -> canvas 32*res square, centred on the worm: 'under' (0..3: its ripple trail
// under the sand, heading dir8), 'rise' (0..5: the sand heaves and bursts, the ringed head comes up, the maw opens),
// 'eat' (0..3: the maw closing on its prey, sand flying), 'dive' (0..5: sinking back, the sand closing over). At res
// 2 the hide is plated in ridged rings with bristles round the rim, the lips are lined with hooks, three rings of
// glistening teeth point down a ribbed red throat, and the sand pours off it in finer grains.
const RTS_W_WORM_FRAMES = { under: 4, rise: 6, eat: 4, dive: 6 };
const RTS_W_WORM = new Map();
const RTS_W_DIRV = [[0, -1], [0.7071, -0.7071], [1, 0], [0.7071, 0.7071], [0, 1], [-0.7071, 0.7071], [-1, 0], [-0.7071, -0.7071]];
// sand thrown up round x, y out to radius r
function rtsWSpray(P, cx, cy, r, n, seed, a = 1) {
  const S = RTS_W_C.sand, R = rtsWSeeded(seed);
  if (P.s === 1) {
    for (let k = 0; k < n; k++) {
      const ang = R() * Math.PI * 2, d = r * (0.55 + R() * 0.45), x = Math.round(cx + Math.cos(ang) * d), y = Math.round(cy + Math.sin(ang) * d * 0.9);
      P.px(x, y, S[k % 3 === 0 ? 0 : k % 3 === 1 ? 1 : 3], a);
      if (R() < 0.3) P.px(x + 1, y + 1, S[4], a * 0.7);
    }
    return;
  }
  // finer: twice the grains, each a device pixel or a clod of two, with its shadow
  for (let k = 0; k < n * 2; k++) {
    const ang = R() * Math.PI * 2, d = r * (0.45 + R() * 0.6), x = cx + Math.cos(ang) * d, y = cy + Math.sin(ang) * d * 0.9;
    const c = S[k % 4 === 0 ? 0 : k % 4 === 1 ? 1 : k % 4 === 2 ? 2 : 3];
    P.fp(x, y, c, a); P.fp(x + 0.5, y + 0.5, S[5], a * 0.5);
    if (R() < 0.35) { P.fp(x + 0.5, y, c, a); P.fp(x + 1, y + 0.5, S[5], a * 0.4); }
  }
}
// the heaped sand round a hole (a ring lit on its far side, its near lip shadowed)
function rtsWSandRing(P, cx, cy, r) {
  const S = RTS_W_C.sand, hi = P.s > 1;
  P.each(Math.floor(cx - r - 3), Math.floor(cy - r - 3), Math.floor(cx + r + 3) + 1, Math.floor(cy + r + 3) + 1, (x, y, X, Y) => {
    const dx = x + 0.5 - cx, dy = y + 0.5 - cy, d = Math.hypot(dx, dy);
    if (d < r || d > r + 2.6 + rtsWHash(hi ? X >> 1 : x, hi ? Y >> 1 : y, 9) * 0.8) return null;
    const lit = (dx + dy) / (d || 1);
    if (!hi) return d < r + 1 ? (lit > 0 ? S[1] : S[4]) : lit > 0.2 ? S[2] : lit < -0.4 ? S[0] : S[1];
    // finer: the lip, the slope down, streams of sand sliding in
    const t = (d - r) / 3.2, stream = Math.abs(Math.sin(Math.atan2(dy, dx) * 9 + r)) < 0.18 && t < 0.6;
    let i = d < r + 0.5 ? (lit > 0 ? 0.6 : 4.4) : d < r + 1 ? (lit > 0 ? 1.2 : 3.6) : lit > 0.2 ? 2.2 : lit < -0.4 ? 0.4 : 1.4;
    if (stream) i += lit > 0 ? -0.8 : 0.8;
    return S[rtsWClampI(i + (rtsWBayer(X, Y) - 0.5) * 0.6, 6)];
  });
}
// the head seen from above: ringed segments shaded as a dome; open 0..1 peels its three lips back to show the
// rings of teeth and the throat
function rtsWWormHead(P, cx, cy, r, open, dir, f) {
  const W = RTS_W_C.worm, a0 = Math.atan2(RTS_W_DIRV[dir][1], RTS_W_DIRV[dir][0]), hi = P.s > 1, q = P.q;
  // the lips folded back (drawn first, they lie outside the rim)
  if (open > 0.3) for (let k = 0; k < 3; k++) {
    const a = a0 + k * Math.PI * 2 / 3 + Math.PI / 3, l = r * (0.35 + 0.35 * open);
    const bx = cx + Math.cos(a) * (r - 1), by = cy + Math.sin(a) * (r - 1), tx = cx + Math.cos(a) * (r + l), ty = cy + Math.sin(a) * (r + l);
    const px = -Math.sin(a) * r * 0.55, py = Math.cos(a) * r * 0.55;
    P.poly([[bx + px, by + py], [tx, ty], [bx - px, by - py]], W[2]);
    P.poly([[bx + px * 0.6, by + py * 0.6], [tx - Math.cos(a), ty - Math.sin(a)], [bx, by]], W[1]);
    (hi ? P.fline : P.line).call(P, bx - px, by - py, tx, ty, W[4]);
    if (hi) {
      // the lip's inner flesh, hooks along its edges
      P.poly([[bx + px * 0.45, by + py * 0.45], [tx - Math.cos(a) * 1.6, ty - Math.sin(a) * 1.6], [bx - px * 0.45, by - py * 0.45]], '#B85848');
      P.poly([[bx + px * 0.2, by + py * 0.2], [tx - Math.cos(a) * 2.6, ty - Math.sin(a) * 2.6], [bx - px * 0.2, by - py * 0.2]], '#E08870');
      for (let t = 0.15; t < 0.95; t += 0.16) for (const sgn of [1, -1]) {
        const ex = bx + sgn * px * (1 - t) + (tx - bx) * t, ey = by + sgn * py * (1 - t) + (ty - by) * t;
        P.fp(ex, ey, '#F8F0D8'); P.fp(ex - Math.cos(a) * 0.5, ey - Math.sin(a) * 0.5, '#C8B898');
      }
      P.fline(bx + px, by + py, tx, ty, W[1]);
    }
  }
  P.disc(cx + 0.6, cy + 0.6, r + 1, W[5]);
  P.each(Math.floor(cx - r), Math.floor(cy - r), Math.floor(cx + r) + 1, Math.floor(cy + r) + 1, (x, y, X, Y) => {
    const dx = (x + 0.5 - cx) / r, dy = (y + 0.5 - cy) / r, d2 = dx * dx + dy * dy;
    if (d2 > 1) return null;
    const d = Math.sqrt(d2), l = -dx * 0.55 - dy * 0.7 + Math.sqrt(1 - d2) * 0.6;
    let i = l > 0.7 ? 0 : l > 0.35 ? 1 : l > 0 ? 2 : l > -0.35 ? 3 : 4;
    // the segment rings
    const ring = (d * r) % 3;
    if (!hi) {
      if (ring < 0.8 && d > 0.25) i = Math.min(5, i + 1);
      else if (ring > 2.4 && l > 0) i = Math.max(0, i - 1);
      return W[i];
    }
    // finer: a dark groove between the plates, a lit ridge on each plate's outer edge, the plates split radially,
    // pitted, bristles round the rim
    const ang = Math.atan2(dy, dx), plate = Math.floor((ang + Math.PI) / (Math.PI * 2) * (8 + Math.floor(d * r / 3) * 4));
    if (ring < 0.45 && d > 0.2) i = Math.min(5, i + 2);
    else if (ring < 0.9 && d > 0.2) i = Math.min(5, i + 1);
    else if (ring > 2.4 && l > -0.2) i = Math.max(0, i - 1);
    if (d > 0.25 && Math.abs(((ang + Math.PI) / (Math.PI * 2) * (8 + Math.floor(d * r / 3) * 4)) % 1 - 0.5) > 0.46) i = Math.min(5, i + 1);
    if (rtsWHash(X, Y, 19 + plate) < 0.04) i = Math.min(5, i + 1);
    if (d > 0.93 && ((X + Y) & 1)) i = 5;
    return W[i];
  });
  if (open <= 0) {
    // closed: the three lips meeting in a seam
    for (let k = 0; k < 3; k++) { const a = a0 + k * Math.PI * 2 / 3 + Math.PI / 3; (hi ? P.fline : P.line).call(P, cx, cy, cx + Math.cos(a) * r * 0.6, cy + Math.sin(a) * r * 0.6, W[5]); if (hi) P.fline(cx + 0.5, cy + 0.5, cx + 0.5 + Math.cos(a) * r * 0.6, cy + 0.5 + Math.sin(a) * r * 0.6, W[1]); }
    P.px(Math.round(cx - 0.5), Math.round(cy - 0.5), W[5]);
    return;
  }
  // the maw: the throat, the rings of teeth pointing in
  const m = Math.max(1.5, r * 0.72 * open);
  P.disc(cx, cy, m, '#4C1410');
  P.disc(cx, cy, m * 0.75, '#2C0806');
  P.disc(cx + 0.5, cy + 0.5, m * 0.35, '#100202');
  if (m > 3) P.disc(cx, cy, m * 0.2, ['#781810', '#982818', '#782010', '#601008'][f & 3]);
  if (!hi) {
    const teeth = (rad, n, len, ph) => {
      for (let k = 0; k < n; k++) {
        const a = k * Math.PI * 2 / n + ph, x = cx + Math.cos(a) * rad, y = cy + Math.sin(a) * rad;
        P.px(Math.round(x - 0.5), Math.round(y - 0.5), '#F8F0D8');
        if (len > 1) P.px(Math.round(x - Math.cos(a) * 1.2 - 0.5), Math.round(y - Math.sin(a) * 1.2 - 0.5), '#C8B898');
      }
    };
    teeth(m - 0.6, Math.max(6, Math.round(m * 2.6)), m > 4 ? 2 : 1, 0);
    if (m > 4) teeth(m * 0.55, Math.round(m * 1.6), 1, 0.3 + (f & 1) * 0.2);
    return;
  }
  // hi: the throat in ribbed rings down to the dark, glistening; teeth as little fangs, lit, in three rings
  for (const t of [0.85, 0.62, 0.42]) P.each(cx - m, cy - m, cx + m, cy + m, (x, y) => { const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy) / m; return Math.abs(d - t) < 0.035 ? '#6C2018' : null; });
  P.fp(cx - m * 0.35, cy - m * 0.4, '#C86048'); P.fp(cx - m * 0.2, cy - m * 0.55, '#E88870', 0.8);
  const fangs = (rad, n, len, ph, col) => {
    for (let k = 0; k < n; k++) {
      const a = k * Math.PI * 2 / n + ph, ca = Math.cos(a), sa = Math.sin(a);
      const bx = cx + ca * rad, by = cy + sa * rad, tx = cx + ca * (rad - len), ty = cy + sa * (rad - len), w = Math.max(0.5, len * 0.4);
      P.poly([[bx - sa * w, by + ca * w], [tx, ty], [bx + sa * w, by - ca * w]], col[1]);
      P.fline(bx - sa * w * 0.5, by + ca * w * 0.5, tx, ty, col[0]);
      P.fp(tx, ty, '#FFFFFF');
    }
  };
  fangs(m * 0.98, Math.max(8, Math.round(m * 2.4)), Math.max(1, m * 0.3), 0, ['#FCF8E8', '#E0D4B8']);
  if (m > 3) fangs(m * 0.7, Math.round(m * 1.9), Math.max(0.8, m * 0.22), 0.25 + (f & 1) * 0.15, ['#F0E8D0', '#C8B898']);
  if (m > 5) fangs(m * 0.48, Math.round(m * 1.3), Math.max(0.7, m * 0.16), 0.5, ['#D8CCB0', '#A89878']);
}
function rtsWormArt(phase, frame, dir8, res) {
  phase = RTS_W_WORM_FRAMES[phase] ? phase : 'under';
  const n = RTS_W_WORM_FRAMES[phase], f = (((frame | 0) % n) + n) % n, dir = (((dir8 | 0) % 8) + 8) % 8, r = rtsWRes(res);
  const k = phase + f + ':' + dir + ':' + r;
  if (RTS_W_WORM.has(k)) return RTS_W_WORM.get(k);
  const P = new RtsWPaint(32, 32, r), S = RTS_W_C.sand, [dx, dy] = RTS_W_DIRV[dir], px = -dy, py = dx, cx = 16, cy = 16, hi = r > 1;
  if (phase === 'under') {
    // ripples spreading back from it in chevrons, moving along as it goes; the hump of sand over its head
    for (let d = 3 - (f % 4) * 0.75 + 1; d < 17; d += 3) {
      const w = 2 + d * 0.32, a = Math.max(0.25, 1 - d / 18);
      for (let s = -w; s <= w; s += hi ? 0.25 : 0.5) {
        const back = d + Math.abs(s) * 0.55, x = cx + dx * (3 - back) + px * s, y = cy + dy * (3 - back) + py * s;
        if (!hi) {
          P.px(Math.round(x - 0.5), Math.round(y - 0.5), S[5], Math.min(1, a * 1.1));
          P.px(Math.round(x - 0.5 + dx), Math.round(y - 0.5 + dy), S[0], Math.min(1, a * 1.0));
        } else {
          P.fp(x - 0.25, y - 0.25, S[5], Math.min(1, a * 1.1)); P.fp(x - 0.25 - dx * 0.5, y - 0.25 - dy * 0.5, S[4], a * 0.6);
          P.fp(x - 0.25 + dx * 0.5, y - 0.25 + dy * 0.5, S[1], a); P.fp(x - 0.25 + dx, y - 0.25 + dy, S[0], a);
        }
      }
    }
    const hx = cx + dx * 4, hy = cy + dy * 4;
    P.ell(hx + 1.2, hy + 1.2, 5, 4.5, S[5], 0.6);
    P.ell(hx, hy, 4.5, 4, S[2]);
    P.ell(hx - 0.8, hy - 0.8, 3.2, 2.8, S[1]);
    P.ell(hx - 1.2, hy - 1.4, 1.6, 1.2, S[0]);
    if (hi) {
      // the crust cracking over its back, the dark of a segment showing through
      for (let k = 0; k < 5; k++) { const a = k * 1.25 + f * 0.4 + dir; P.fline(hx, hy, hx + Math.cos(a) * 3.6, hy + Math.sin(a) * 3.2, S[4]); P.fline(hx + 0.5, hy + 0.5, hx + 0.5 + Math.cos(a) * 3.4, hy + 0.5 + Math.sin(a) * 3, S[1], 0.6); }
      P.ell(hx + dx * 0.8, hy + dy * 0.8, 1.2, 0.9, RTS_W_C.worm[3], 0.75); P.fp(hx + dx * 0.8 - 0.5, hy + dy * 0.8 - 0.5, RTS_W_C.worm[1]);
    }
    rtsWSpray(P, hx + dx * 3, hy + dy * 3, 3.5, 5, f * 7 + dir, 0.9);
  } else if (phase === 'rise') {
    const hx = cx + dx * 1.5, hy = cy + dy * 1.5;
    if (f === 0) {
      // the sand heaves and cracks
      P.ell(cx + 1, cy + 1, 8, 7, S[5], 0.35); P.ell(cx, cy, 8, 7, S[2]); P.ell(cx - 1, cy - 1, 6, 5, S[1]); P.ell(cx - 2, cy - 2, 3, 2.5, S[0]);
      for (let k = 0; k < 5; k++) { const a = k * 1.3 + dir; (hi ? P.fline : P.line).call(P, cx, cy, cx + Math.cos(a) * 6, cy + Math.sin(a) * 5, S[4]); if (hi) P.fline(cx + 0.5, cy + 0.5, cx + 0.5 + Math.cos(a) * 5.5, cy + 0.5 + Math.sin(a) * 4.5, S[0], 0.7); }
      if (hi) { P.ell(cx, cy, 1.6, 1.3, RTS_W_C.worm[4]); P.ell(cx - 0.3, cy - 0.3, 1, 0.8, RTS_W_C.worm[3]); }
      rtsWSpray(P, cx, cy, 9, 8, 11 + dir);
    } else {
      const rr = [0, 4, 6.5, 8, 9.5, 10][f], open = [0, 0, 0, 0.45, 1, 1][f];
      rtsWSandRing(P, hx, hy, rr);
      rtsWWormHead(P, hx, hy, rr, open, dir, f);
      rtsWSpray(P, hx, hy, rr + 5 + f, 10 + f * 2, f * 13 + dir, f > 3 ? 0.8 : 1);
    }
  } else if (phase === 'eat') {
    const hx = cx + dx * 1.5, hy = cy + dy * 1.5, rr = 10, open = [1, 0.5, 0, 0.4][f];
    rtsWSandRing(P, hx, hy, rr);
    rtsWWormHead(P, hx, hy, rr + (f === 2 ? 0.5 : 0), open, dir, f);
    rtsWSpray(P, hx, hy, rr + 4, 14, f * 17 + dir + 3);
  } else {
    // dive: the closed head sinks, the sand slides in over it, ripples left behind
    const hx = cx + dx * 1.5, hy = cy + dy * 1.5, rr = [9.5, 8, 6, 4, 0, 0][f];
    if (rr > 0) { rtsWSandRing(P, hx, hy, rr); rtsWWormHead(P, hx, hy, rr, 0, dir, f); }
    else {
      for (let ri = 3 + (f - 4) * 3; ri < 12; ri += 3.5) for (let a = 0; a < Math.PI * 2; a += hi ? 0.06 : 0.12) {
        const x = hx + Math.cos(a) * ri - 0.5, y = hy + Math.sin(a) * ri * 0.9 - 0.5;
        if (!hi) P.px(Math.round(x), Math.round(y), S[Math.cos(a - 0.8) > 0 ? 4 : 0], f === 5 ? 0.4 : 0.75);
        else { P.fp(x + 0.25, y + 0.25, S[Math.cos(a - 0.8) > 0 ? 4 : 0], f === 5 ? 0.4 : 0.75); P.fp(x + 0.25 - Math.cos(a) * 0.5, y + 0.25 - Math.sin(a) * 0.5, S[Math.cos(a - 0.8) > 0 ? 0 : 4], f === 5 ? 0.25 : 0.5); }
      }
      P.ell(hx, hy, 3.5, 3, S[f === 4 ? 4 : 3], 0.7);
    }
    if (f < 5) rtsWSpray(P, hx, hy, (rr || 4) + 4, 8, f * 19 + dir, 0.9 - f * 0.12);
  }
  const c = P.canvas();
  RTS_W_WORM.set(k, c);
  return c;
}

// ------------------------------------------------------------------ the mouse pointers
// rtsCursorArt(kind, frame) -> canvas 16 x 16; the hot spot is the centre (8, 8) except 'normal' (0, 0):
// RTS_W_CURSOR_HOT[kind]. frame 0..1 pulses the 'attack' and 'move' ones.
const RTS_W_CURSOR_HOT = { normal: [0, 0], select: [8, 8], move: [8, 8], attack: [8, 8], nomove: [8, 8], deploy: [8, 8], harvest: [8, 8], repair: [8, 8], capture: [8, 8], place: [8, 8] };
const RTS_W_CURSOR = new Map();
function rtsCursorArt(kind, frame) {
  if (!RTS_W_CURSOR_HOT[kind]) kind = 'normal';
  const f = (frame | 0) & 1, k = kind + f;
  if (RTS_W_CURSOR.has(k)) return RTS_W_CURSOR.get(k);
  const P = new RtsWPaint(16, 16), WH = '#F8F8F8', GR = '#58D854', RD = '#F83818', YE = '#F8C800', OR = '#F88820';
  const ring = (r, col) => { for (let a = 0; a < Math.PI * 2; a += 0.05) P.px(Math.round(8 + Math.cos(a) * r - 0.5), Math.round(8 + Math.sin(a) * r - 0.5), col); };
  const arrowHead = (x, y, d, col) => {   // a little arrow pointing d (0 up 1 right 2 down 3 left) with its tip at x, y
    for (let i = 0; i < 3; i++) for (let j = -i; j <= i; j++) {
      const [ax, ay] = d === 0 ? [x + j, y + i] : d === 2 ? [x + j, y - i] : d === 1 ? [x - i, y + j] : [x + i, y + j];
      P.px(ax, ay, col);
    }
  };
  switch (kind) {
    case 'normal': {
      const rows = ['#', '##', '#.#', '#..#', '#...#', '#....#', '#.....#', '#......#', '#.......#', '#....#####', '#..#..#', '#.# #..#', '##   #..#', '      #..#', '       ##'];
      rows.forEach((r, y) => { for (let x = 0; x < r.length; x++) if (r[x] !== ' ') P.px(x, y, r[x] === '#' ? '#101010' : WH); });
      for (let y = 2; y < 8; y++) P.px(1, y, '#C8D8F8');
      return RTS_W_CURSOR.set(k, P.canvas()).get(k);
    }
    case 'select':
      for (const [x, y, sx, sy] of [[1, 1, 1, 1], [14, 1, -1, 1], [1, 14, 1, -1], [14, 14, -1, -1]]) { P.rect(Math.min(x, x + sx * 3), y, 4, 1, GR); P.rect(x, Math.min(y, y + sy * 3), 1, 4, GR); }
      P.px(7, 7, GR); P.px(8, 8, GR); P.px(7, 8, GR); P.px(8, 7, GR);
      break;
    case 'move':
      ring(5.5 - f * 0.5, GR); P.rect(7, 7, 2, 2, GR);
      arrowHead(7.5 | 0, 1 + f, 2, GR); arrowHead(7, 14 - f, 0, GR); arrowHead(1 + f, 7, 1, GR); arrowHead(14 - f, 7, 3, GR);
      break;
    case 'attack':
      ring(5.5 + f * 0.6, RD);
      P.rect(7, 0, 2, 5, RD); P.rect(7, 11, 2, 5, RD); P.rect(0, 7, 5, 2, RD); P.rect(11, 7, 5, 2, RD);
      P.rect(7, 7, 2, 2, f ? '#FCE0A0' : RD);
      break;
    case 'nomove':
      ring(6, RD); ring(5.4, RD); P.line(4, 4, 11, 11, RD); P.line(4, 3, 12, 11, RD);
      break;
    case 'deploy':
      P.frame(4, 4, 8, 8, YE); P.rect(6, 6, 4, 4, YE);
      for (const [x, y, d] of [[1, 1, 0], [14, 1, 1], [1, 14, 2], [14, 14, 3]]) { P.line(x, y, x + (d & 1 ? -2 : 2), y + (d & 2 ? -2 : 2), YE); P.px(x, y + (d & 2 ? -1 : 1), YE); P.px(x + (d & 1 ? -1 : 1), y, YE); }
      break;
    case 'harvest':
      P.rect(7, 1, 2, 8, OR); arrowHead(7, 11, 2, OR); arrowHead(8, 11, 2, OR);
      for (const [x, y] of [[3, 13], [6, 14], [9, 14], [12, 13], [4, 11], [11, 11]]) P.px(x, y, (x + y) & 1 ? '#F8E070' : OR);
      break;
    case 'repair':
      // a spanner across, its jaw at the top right
      P.line(3, 12, 10, 5, '#C8C8C8'); P.line(4, 12, 11, 5, '#909090'); P.line(3, 11, 10, 4, WH);
      P.disc(11.5, 4.5, 3, '#C8C8C8'); P.clear(11, 1, 2, 4); P.px(10, 3, WH);
      P.rect(2, 12, 3, 2, '#909090'); P.px(9, 13, GR); P.rect(8, 12, 3, 1, GR); P.rect(9, 11, 1, 3, GR);
      break;
    case 'capture':
      // a flag planted: take it
      P.rect(4, 1, 1, 14, WH); P.rect(3, 14, 3, 1, WH);
      for (let i = 0; i < 8; i++) P.rect(5 + i, 2 + (i > 3 ? (f + (i >> 1)) & 1 : 0), 1, 5, i === 7 ? '#A01800' : RD);
      P.rect(7, 4, 3, 1, WH);
      break;
    case 'place':
      for (let i = 1; i < 15; i++) if ((i >> 1) & 1) { P.px(i, 1, YE); P.px(i, 14, YE); P.px(1, i, YE); P.px(14, i, YE); }
      P.rect(7, 7, 2, 2, YE);
      break;
  }
  P.outline('#101010');
  const c = P.canvas();
  RTS_W_CURSOR.set(k, c);
  return c;
}
