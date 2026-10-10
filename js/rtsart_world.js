'use strict';
// =====================================================================
//  DESERT DOMINION's world art (the ART-WORLD part of the rts contract): everything that isn't a unit, all drawn
//  pixel by pixel on canvases and cached.
//    rtsTileArt(kind, mask, variant)        the ground of KHARRA, 16 x 16: sand rippled by the wind, rolling dunes,
//                                           dark rock plateaus with cracks and lit rims, jagged mountains, the
//                                           orange glow of the GLIMMER fields (thick ones denser and brighter),
//                                           blooms, craters, laid concrete, rubble; edges blend by the 4-neighbour
//                                           mask (and, if given, the extended mask of rtsWTileMask)
//    rtsDrawShroud(ctx, x, y, mask)         the unexplored dark with a soft dithered edge
//    rtsBuildingArt(key, house, state)      every building in the House's colours: damage, animation, doors,
//                                           rising from its scaffolding, the white flash of a hit; the turrets
//    rtsWallArt(house, mask)                wall pieces joined to their neighbours
//    rtsBuildingIcon(key, house)            32 x 24 sidebar pictures
//    rtsWormArt(phase, frame, dir8)         the SANDWYRM: its ripple under the sand, bursting up with its ringed
//                                           maw of teeth, swallowing, diving
//    rtsCursorArt(kind, frame)              the mouse pointers
//    rtsBloomArt(frame), rtsRubbleArt(w, h, seed)
//  Light comes from the top left everywhere; buildings are seen from above at a slant (roof and south face), with
//  their shadow falling to the lower right.
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
class RtsWPaint {
  constructor(w, h) { this.w = w; this.h = h; this.d = new Uint8ClampedArray(w * h * 4); }
  in(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h; }
  // set a pixel (alpha a blends over what's there)
  px(x, y, c, a = 1) {
    x |= 0; y |= 0;
    if (!c || x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const v = rtsWRGB(c), i = (y * this.w + x) * 4, d = this.d;
    if (a >= 1) { d[i] = v[0]; d[i + 1] = v[1]; d[i + 2] = v[2]; d[i + 3] = 255; return; }
    const da = d[i + 3] / 255, oa = a + da * (1 - a);
    if (oa <= 0) return;
    for (let k = 0; k < 3; k++) d[i + k] = (v[k] * a + d[i + k] * da * (1 - a)) / oa;
    d[i + 3] = oa * 255;
  }
  get(x, y) { if (!this.in(x, y)) return null; const i = (y * this.w + x) * 4, d = this.d; return [d[i], d[i + 1], d[i + 2], d[i + 3]]; }
  on(x, y) { return this.in(x, y) && this.d[(y * this.w + x) * 4 + 3] > 0; }
  rect(x, y, w, h, c, a) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.px(i, j, c, a); }
  clear(x, y, w, h) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (this.in(i, j)) this.d.fill(0, (j * this.w + i) * 4, (j * this.w + i) * 4 + 4); }
  frame(x, y, w, h, c) { this.rect(x, y, w, 1, c); this.rect(x, y + h - 1, w, 1, c); this.rect(x, y, 1, h, c); this.rect(x + w - 1, y, 1, h, c); }
  fill(x, y, w, h, fn) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) { const c = fn(i, j); if (c) this.px(i, j, c); } }
  disc(cx, cy, r, c, a) { for (let y = Math.floor(cy - r); y <= cy + r; y++) for (let x = Math.floor(cx - r); x <= cx + r; x++) if ((x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <= r * r) this.px(x, y, c, a); }
  ell(cx, cy, rx, ry, c, a) { for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) if (((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1) this.px(x, y, c, a); }
  line(x0, y0, x1, y1, c, a) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let e = dx + dy;
    for (;;) { this.px(x0, y0, c, a); if (x0 === x1 && y0 === y1) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; } }
  }
  poly(pts, c, a) {
    let y0 = Infinity, y1 = -Infinity;
    for (const p of pts) { y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
    for (let y = Math.floor(y0); y <= y1; y++) {
      const yc = y + 0.5, xs = [];
      for (let i = 0; i < pts.length; i++) {
        const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length];
        if ((ay <= yc && by > yc) || (by <= yc && ay > yc)) xs.push(ax + (yc - ay) / (by - ay) * (bx - ax));
      }
      xs.sort((p, q) => p - q);
      for (let k = 0; k + 1 < xs.length; k += 2) for (let x = Math.round(xs[k]); x < Math.round(xs[k + 1]); x++) this.px(x, y, c, a);
    }
  }
  // darken (f < 1) or lighten (f > 1) what's there
  shade(x, y, f) { if (!this.on(x, y)) return; const i = (y * this.w + x) * 4; for (let k = 0; k < 3; k++) this.d[i + k] = this.d[i + k] * f; }
  shadeRect(x, y, w, h, f) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.shade(i, j, f); }
  tint(x, y, c, a) { if (!this.on(x, y)) return; const v = rtsWRGB(c), i = (y * this.w + x) * 4; for (let k = 0; k < 3; k++) this.d[i + k] += (v[k] - this.d[i + k]) * a; }
  // a dark outline round everything drawn (into the empty pixels next to it)
  outline(c, a = 1) {
    const w = this.w, h = this.h, m = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (!this.on(x, y) && (this.on(x - 1, y) || this.on(x + 1, y) || this.on(x, y - 1) || this.on(x, y + 1))) m[y * w + x] = 1;
    for (let i = 0; i < w * h; i++) if (m[i]) this.px(i % w, (i / w) | 0, c, a);
  }
  // the shadow the drawing casts to the lower right (into empty pixels)
  shadow(dx, dy, a = 0.38) {
    const w = this.w, h = this.h, m = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (this.on(x, y)) continue;
      for (let k = 1; k <= Math.max(dx, dy); k++) if (this.on(x - Math.min(k, dx), y - Math.min(k, dy))) { m[y * w + x] = 1; break; }
    }
    for (let i = 0; i < w * h; i++) if (m[i]) { const j = i * 4; this.d[j] = this.d[j + 1] = this.d[j + 2] = 0; this.d[j + 3] = a * 255; }
  }
  // stamp another painter / canvas-like pixel source at x,y
  stamp(src, x, y) { for (let j = 0; j < src.h; j++) for (let i = 0; i < src.w; i++) { const p = src.get(i, j); if (p[3]) this.px(x + i, y + j, p, p[3] / 255); } }
  canvas() {
    const c = makeCanvas(this.w, this.h), g = c.getContext('2d'), im = g.createImageData(this.w, this.h);
    im.data.set(this.d); g.putImageData(im, 0, 0); return c;
  }
}
// read a canvas back into a painter
function rtsWFromCanvas(c) {
  const P = new RtsWPaint(c.width, c.height);
  P.d.set(c.getContext('2d').getImageData(0, 0, c.width, c.height).data);
  return P;
}

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
  const S = RTS_W_C.sand, n = rtsWPFbm(x, y, 11) * 0.4 + rtsWNoise(x / 3 + v * 11.3, y / 3, 15 + v) * 0.6;
  let lv = 2 + (n - 0.5) * 1.3;
  if (inner > 0 && v) lv += (rtsWNoise(x / 4 + v * 7.3, y / 4, 40 + v) - 0.5) * 1.6 * inner;
  const wob = 1.4 * Math.sin(Math.PI * 2 * x / 16 + 1.3) + 0.8 * Math.sin(Math.PI * 4 * x / 16 + 0.4) + (rtsWPNoise(x, y, 4, 12) - 0.5) * 2.2
    + rtsWInner(x, y) * (rtsWNoise(x / 5 + v * 3.7, y / 6, 14 + v) - 0.5) * 7;
  const r = (((y + wob) % 8) + 8) % 8, h = rtsWHash(x, y, 13 + v);
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
      let d = (thick ? 0.8 : 0.58) + (rtsWPFbm(x, y, 21) - 0.5) * 0.6 + (rtsWNoise(x / 1.8 + v * 3.3, y / 1.8, 22 + v) - 0.5) * 0.4;
      if (inn > 0) d += inn * (rtsWNoise(x / 3.5 + v * 5.3, y / 3.5, 70 + v) - 0.5) * 0.45;
      let e = fade(x, y, open, 7);
      for (let b = 0; b < 4; b++) if (corners[b]) {
        const C = [[16, 0], [16, 16], [0, 16], [0, 0]][b], dd = Math.hypot(x + 0.5 - C[0], y + 0.5 - C[1]);
        e = Math.min(e, Math.max(0, Math.min(1, dd / 7)));
      }
      if (thick) d *= 0.6 + 0.4 * fade(x, y, thickOpen, 6);
      d *= e;
      const s = d + (rtsWBayer(x, y) - 0.5) * 0.3, h = rtsWHash(x, y, 23 + v);
      let c = sand(x, y);
      if (thick) {
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
      if (d > 0.15 && h < d * (thick ? 0.2 : 0.12)) c = G[h < d * 0.05 ? 0 : 1];
      else if (d > 0.3 && rtsWHash(x - 1, y - 1, 23 + v) < d * 0.12) c = G[thick ? 5 : 4];
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
      let h = rtsWPFbm(x, y, 43) * 0.33 + rtsWNoise(x / 3.2 + v * 9.1, y / 3.2, 47 + v) * 0.55 + rtsWNoise(x / 1.4 + v * 5.3, y / 1.4, 48 + v) * 0.12;
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
    return Math.min(1, Math.max(0, -s) / 4) * 1.2 + Math.min(4, f2 - f1) * 0.4 + (1 - Math.abs(rtsWNoise(x / 3 + v * 6.1, y / 3, 54 + v) - 0.5) * 2) * 1.1 + rtsWNoise(x / 1.5 + v * 2.9, y / 1.5, 52 + v) * 0.3 - (f2 - f1 < 0.7 ? 0.9 : 0);
  };

  // the ground at the foot: sand, or rock when the extended mask says so (the nearest open side decides)
  const footRock = (x, y) => {
    let best = -1, bd = 99;
    for (let b = 0; b < 4; b++) {
      if (!open[b]) continue;
      const dist = b === 0 ? y + 0.5 : b === 1 ? 15.5 - x : b === 2 ? 15.5 - y : x + 0.5;
      if (dist < bd) { bd = dist; best = b; }
    }
    return best >= 0 && onRock[best];
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
      const depth = top(x, y), st = rtsWHash(x, (y + Math.floor(rtsWHash(x, 0, 58 + v) * 4)) >> 2, 58 + v);
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
  const R = rtsWSeeded(v * 131 + 17), mid = [5.5 + R() * 5, 5.5 + R() * 5];
  base.forEach(([x, y], i) => {
    for (let ox = -16; ox <= 16; ox += 16) for (let oy = -16; oy <= 16; oy += 16) {
      if (i === 2 && !ox && !oy) { pts.push(mid); continue; }
      pts.push([x + ox, y + oy]);
    }
  });
  if (v & 1) pts.push([mid[0] + 3, mid[1] - 2.5]);
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

function rtsTileArt(kind, mask, variant) {
  kind = kind | 0; mask = mask === undefined ? 15 : mask | 0; variant = ((variant | 0) % 4 + 4) % 4;
  if (kind < 0 || kind > 10) kind = 0;
  // only the bits a kind looks at go into the cache key
  const fam = RTS_W_FAM[kind];
  let m = mask;
  if (!(m & 0x1000)) m &= 15;
  if (fam === 0 && kind !== 1) m = 0;
  const key = kind + ':' + m + ':' + variant;
  let c = RTS_W_TILE_CACHE.get(key);
  if (!c) { c = rtsWTileBuild(kind, m, variant).canvas(); RTS_W_TILE_CACHE.set(key, c); }
  return c;
}

// ------------------------------------------------------------------ the shroud
const RTS_W_SHROUD = [];
function rtsWShroudTile(mask) {
  if (RTS_W_SHROUD[mask]) return RTS_W_SHROUD[mask];
  const P = new RtsWPaint(16, 16), open = [0, 1, 2, 3].map(b => (mask >> b) & 1);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    // distance into the dark from the explored sides (rounded where two meet)
    let q = [];
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
    const t = rtsWBayer(x, y);
    // three steps: clear, a half-dark dither, solid
    if (a > 0.66 + (t - 0.5) * 0.3) P.px(x, y, '#000000');
    else if (a > 0.2 + (t - 0.5) * 0.35) P.px(x, y, '#000000', t < 0.5 ? 0.82 : 0.55);
    else if (a > 0.04 && t < 0.25) P.px(x, y, '#000000', 0.45);
  }
  return (RTS_W_SHROUD[mask] = P.canvas());
}
function rtsDrawShroud(ctx, x, y, mask) {
  mask = (mask | 0) & 15;
  if (!mask) { ctx.fillStyle = '#000000'; ctx.fillRect(x, y, 16, 16); return; }
  ctx.drawImage(rtsWShroudTile(mask), x, y);
}

// ------------------------------------------------------------------ the glimmer bloom
// a buried bulb that has pushed up through the sand: cracked open a little, the glow inside pulsing
function rtsWBloomPaint(frame, v = 0) {
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
const RTS_W_BLOOM = [];
function rtsBloomArt(frame) { const f = ((frame | 0) % 4 + 4) % 4; return RTS_W_BLOOM[f] || (RTS_W_BLOOM[f] = rtsWBloomPaint(f).canvas()); }

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
// a House's emblem with its top-left at x, y (s: scale); col the figure, dark its detail
function rtsWEmblem(P, house, x, y, col, dark, s = 1) {
  const E = RTS_W_EMBLEMS[house] || RTS_W_EMBLEMS.regent;
  E.forEach((row, j) => { for (let i = 0; i < row.length; i++) if (row[i] !== '.') P.rect(x + i * s, y + j * s, s, s, row[i] === '#' ? col : dark); });
}
const rtsWEmblemSize = house => { const E = RTS_W_EMBLEMS[house] || RTS_W_EMBLEMS.regent; return [E[0].length, E.length]; };

// ------------------------------------------------------------------ brushes for buildings
const RTS_W_M = RTS_W_C.metal;
const RTS_W_OUT = '#1A140F';
// a block seen from above at a slant: its roof (top: hi, mid, lo), its south face d px tall (side: hi, mid, lo)
function rtsWBox(P, x, y, w, h, d, top, side) {
  const rh = h - d;
  P.rect(x, y, w, rh, top[1]);
  P.rect(x, y, w, 1, top[0]); P.rect(x, y, 1, rh, top[0]);
  P.rect(x + w - 1, y + 1, 1, rh - 1, top[2]); P.rect(x + 1, y + rh - 1, w - 1, 1, top[2]);
  if (d > 0) {
    P.rect(x, y + rh, w, d, side[1]);
    P.rect(x, y + rh, 1, d, side[0]);
    P.rect(x + w - 1, y + rh, 1, d, side[2]);
    P.rect(x, y + h - 1, w, 1, side[2]);
  }
}
const rtsWRoof = () => [RTS_W_M[1], RTS_W_M[2], RTS_W_M[3]];
const rtsWSide = () => [RTS_W_M[3], RTS_W_M[4], RTS_W_M[5]];
const rtsWHRoof = H => [H[0], H[1], H[2]];
const rtsWHSide = H => [H[1], H[2], rtsWHex(rtsWMix(H[2], '#000000', 0.4))];
// rivets/seams along a roof
function rtsWSeams(P, x, y, w, h, step, col, vertical) {
  if (vertical) for (let i = x + step; i < x + w - 1; i += step) P.rect(i, y + 1, 1, h - 2, col);
  else for (let j = y + step; j < y + h - 1; j += step) P.rect(x + 1, j, w - 2, 1, col);
}
// a row of windows (glass with a glint), lit warm when `lit`
function rtsWWindows(P, x, y, n, w, h, gap, lit) {
  const G = RTS_W_C.glass;
  for (let k = 0; k < n; k++) {
    const wx = x + k * (w + gap);
    P.rect(wx, y, w, h, lit ? '#F8D070' : G[2]);
    P.rect(wx, y, w, 1, lit ? '#FCF0B0' : G[1]);
    P.px(wx, y, lit ? '#FFFFFF' : G[0]);
    P.rect(wx, y + h - 1, w, 1, lit ? '#D89030' : G[3]);
  }
}
// slatted vents
function rtsWVent(P, x, y, w, h) {
  P.rect(x, y, w, h, RTS_W_M[5]);
  for (let j = y; j < y + h; j += 2) P.rect(x, j, w, 1, RTS_W_M[3]);
  P.rect(x, y, w, 1, RTS_W_M[6]);
}
// yellow and black hazard stripes
function rtsWHazard(P, x, y, w, h, ph = 0) {
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) P.px(i, j, ((i + j + ph) >> 1) & 1 ? RTS_W_C.hazard[0] : RTS_W_C.hazard[1]);
}
// a pipe from one point to another (axis-aligned runs), lit on its top/left
function rtsWPipe(P, pts, col = RTS_W_M) {
  for (let k = 0; k + 1 < pts.length; k++) {
    const [x0, y0] = pts[k], [x1, y1] = pts[k + 1];
    if (y0 === y1) { const a = Math.min(x0, x1), b = Math.max(x0, x1); P.rect(a, y0, b - a + 2, 2, col[3]); P.rect(a, y0, b - a + 2, 1, col[1]); }
    else { const a = Math.min(y0, y1), b = Math.max(y0, y1); P.rect(x0, a, 2, b - a + 2, col[3]); P.rect(x0, a, 1, b - a + 2, col[1]); }
  }
}
// a vertical round tank: its lit cap (an ellipse), its body shaded across, the band in house colours
function rtsWTank(P, cx, top, r, h, pal, band) {
  const ry = Math.max(2, Math.round(r * 0.55));
  for (let y = top; y < top + h; y++) for (let x = Math.floor(cx - r); x < cx + r; x++) {
    const u = (x + 0.5 - (cx - r)) / (2 * r);
    P.px(x, y, pal[u < 0.18 ? 1 : u < 0.55 ? 2 : u < 0.85 ? 3 : 4]);
  }
  P.ell(cx, top + h, r, ry, pal[4]);
  for (let x = Math.floor(cx - r); x < cx + r; x++) { const u = (x + 0.5 - (cx - r)) / (2 * r); P.px(x, top + h + Math.round(Math.sqrt(Math.max(0, 1 - (2 * u - 1) ** 2)) * ry) - 1, pal[5]); }
  if (band) {
    const by = top + Math.round(h * 0.35);
    for (let y = by; y < by + 2; y++) for (let x = Math.floor(cx - r); x < cx + r; x++) { const u = (x + 0.5 - (cx - r)) / (2 * r); P.px(x, y, band[u < 0.3 ? 0 : u < 0.75 ? 1 : 2]); }
  }
  P.ell(cx, top, r, ry, pal[2]);
  P.ell(cx - 0.5, top - 0.5, r - 1, ry - 0.6, pal[1]);
  P.px(Math.round(cx - r * 0.45), top - 1, pal[0]);
}
// a dome, shaded from the top left
function rtsWDome(P, cx, cy, r, pal, sq = 1) {
  for (let y = Math.floor(cy - r * sq); y <= cy + r * sq; y++) for (let x = Math.floor(cx - r); x <= cx + r; x++) {
    const dx = (x + 0.5 - cx) / r, dy = (y + 0.5 - cy) / (r * sq), d2 = dx * dx + dy * dy;
    if (d2 > 1) continue;
    const l = -dx * 0.6 - dy * 0.75 + Math.sqrt(1 - d2) * 0.5;
    P.px(x, y, pal[l > 0.75 ? 0 : l > 0.35 ? 1 : l > -0.1 ? 2 : l > -0.45 ? 3 : 4]);
  }
}
// a flag on its pole (the pole's foot at x, y), waving
function rtsWFlag(P, H, house, x, y, f, len = 10) {
  P.rect(x, y - len, 1, len, RTS_W_M[1]); P.px(x, y - len - 1, '#F8D878');
  P.rect(x + 1, y - len + 1, 1, len - 1, RTS_W_M[4]);
  for (let i = 0; i < 7; i++) {
    const off = Math.round(Math.sin((i + f * 1.6) * 0.9) * 0.9);
    for (let j = 0; j < 5; j++) P.px(x + 1 + i, y - len + j + off + (i > 4 ? 0 : 0), j === 0 ? H[0] : j === 4 ? H[2] : i === 3 && j === 2 ? '#F8F0D0' : H[1]);
  }
}
// a lamp (on/off)
function rtsWLamp(P, x, y, on, col = '#F83818') {
  P.px(x, y, on ? col : '#5C2018');
  if (on) { P.px(x - 1, y, col, 0.35); P.px(x + 1, y, col, 0.35); P.px(x, y - 1, col, 0.35); P.px(x, y + 1, col, 0.35); P.px(x, y, '#FFF0D0', 0.5); }
}
// a roller door (open 0 shut .. 3 open): its frame, the slats rolling up, the dark inside (a glow when it opens)
function rtsWDoor(P, x, y, w, h, open, H) {
  P.rect(x - 1, y - 1, w + 2, h + 1, RTS_W_M[5]);
  P.rect(x, y, w, h, '#120C08');
  if (open > 0) { P.rect(x + 1, y + h - 3, w - 2, 3, '#2C2418'); P.rect(x + 2, y + h - 2, w - 4, 1, '#F8B848', 0.35 * open); }
  const shut = Math.round(h * (1 - open / 3));
  for (let j = 0; j < shut; j++) P.rect(x, y + j, w, 1, j % 2 ? RTS_W_M[3] : RTS_W_M[2]);
  if (shut > 0) P.rect(x, y + shut - 1, w, 1, RTS_W_M[4]);
  // hazard posts either side
  for (let j = 0; j < h; j++) { P.px(x - 1, y + j, ((j >> 1) & 1) ? RTS_W_C.hazard[0] : RTS_W_C.hazard[1]); P.px(x + w, y + j, ((j >> 1) & 1) ? RTS_W_C.hazard[0] : RTS_W_C.hazard[1]); }
  if (H) P.rect(x, y - 2, w, 1, H[1]);
}
// smoke puffs drifting up from a chimney top at x, y
function rtsWSmoke(P, x, y, f, n = 3) {
  for (let k = 0; k < n; k++) {
    const t = ((f + k * 4 / n) % 4) / 4, r = 1 + t * 1.6;
    P.disc(x + t * 3, y - 1 - t * 6, r, t < 0.5 ? '#A8A098' : '#888078', 0.75 - t * 0.5);
  }
}
// welding sparks round x, y
function rtsWSparks(P, x, y, f) {
  const R = rtsWSeeded(f * 13 + x * 7 + y);
  P.px(x, y, '#FFFFFF');
  for (let k = 0; k < 4; k++) P.px(x + Math.round((R() - 0.5) * 5), y + Math.round((R() - 0.5) * 4), R() < 0.5 ? '#F8F070' : '#F8A830');
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

const RTS_W_DRAW = {
  // a slab of concrete, and four
  slab1(P) { rtsWSlab(P, 0, 0); },
  slab4(P) { for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) rtsWSlab(P, i * 16, j * 16); },

  // CONSTRUCTION YARD: the deck with its assembly square, the control house, the yellow crane swinging
  yard(P, H, house, f, st) {
    const M = RTS_W_M, C = RTS_W_C.conc, act = f >= 4, g = f & 3, Y = ['#FCE070', '#F8C800', '#B88C00', '#6C5000'];
    rtsWBox(P, 1, 8, 28, 21, 4, [C[1], C[2], C[4]], rtsWSide());
    rtsWHazard(P, 2, 25, 26, 2);
    // the assembly square: yellow corner marks, a frame of girders going up, a stack of beams
    for (const [x, y, sx, sy] of [[14, 13, 1, 1], [27, 13, -1, 1], [14, 23, 1, -1], [27, 23, -1, -1]]) { P.rect(Math.min(x, x + sx * 2), y, 3, 1, Y[1]); P.rect(x, Math.min(y, y + sy * 2), 1, 3, Y[1]); }
    P.rect(17, 15, 8, 6, C[3]);
    P.frame(17, 17, 8, 5, M[5]); P.frame(17, 15, 8, 5, M[4]);
    for (const x of [17, 24]) P.rect(x, 15, 1, 7, M[5]);
    P.rect(17, 15, 8, 1, M[2]);
    for (let k = 0; k < 3; k++) { P.rect(3, 19 + k * 2, 9, 1, M[2]); P.rect(3, 20 + k * 2, 9, 1, M[5]); P.px(3, 19 + k * 2, M[1]); }
    if (act) { rtsWSparks(P, 18 + g * 2, 20, f); rtsWSparks(P, 23 - g, 16, f + 5); }
    // the control house: the House's roof with its emblem, windows along its face
    rtsWBox(P, 2, 1, 13, 16, 5, rtsWHRoof(H), rtsWSide());
    rtsWEmblem(P, house, 4, 2, H[0], H[2]);
    rtsWWindows(P, 3, 13, 3, 3, 2, 1, act);
    // the crane: a yellow lattice tower at the back corner, its boom swinging out over the square, the hook
    for (let y = 1; y < 19; y++) { P.px(24, y, Y[0]); P.px(25, y, Y[1]); P.px(27, y, Y[2]); P.px(26, y, (y & 3) === 0 ? Y[1] : (y & 1) ? Y[3] : M[5]); }
    P.rect(23, 18, 6, 2, M[4]); P.rect(23, 18, 6, 1, M[2]);
    const sw = act ? [0, 2, 4, 2][g] : [0, 1, 1, 0][g], tip = [15 + sw, 12 + (sw >> 1)];
    // the counterweight behind, the boom (a lattice of two chords)
    P.rect(27, 1, 3, 3, M[5]); P.rect(27, 1, 3, 1, M[3]);
    P.line(25, 2, tip[0], tip[1] - 1, Y[0]); P.line(26, 3, tip[0] + 1, tip[1], Y[2]);
    for (let k = 1; k < 6; k++) P.px(Math.round(25.5 + (tip[0] - 25) * k / 6), Math.round(2.5 + (tip[1] - 2) * k / 6), Y[3]);
    P.rect(24, 0, 3, 2, M[4]); rtsWLamp(P, 25, 0, g < 2);
    const hy = tip[1] + 3 + (act ? (g & 1) * 2 : 0);
    P.rect(tip[0], tip[1] + 1, 1, hy - tip[1], M[5]);
    P.rect(tip[0] - 1, hy, 3, 1, M[3]); P.px(tip[0] + 1, hy + 1, M[4]);
    if (act) { P.rect(tip[0] - 3, hy + 2, 7, 1, M[2]); P.rect(tip[0] - 3, hy + 3, 7, 1, M[5]); }
  },

  // VAPOR TRAP: a broad round tower drawing the air through its fan, condensers beside it, a mist rising
  vapor(P, H, house, f) {
    const M = RTS_W_M;
    P.ell(15, 23, 13, 6, RTS_W_C.conc[4]); P.ell(15, 22, 12, 5, RTS_W_C.conc[2]); P.ell(15, 21.5, 11, 4, RTS_W_C.conc[3]);
    // a condenser tank and its pipe
    rtsWPipe(P, [[23, 18], [26, 18]]);
    rtsWTank(P, 27, 13, 2.5, 10, M, null);
    rtsWTank(P, 4, 14, 2.5, 9, M, null);
    rtsWPipe(P, [[5, 19], [8, 19]]);
    // the tower
    rtsWTank(P, 15, 7, 10, 15, M, rtsWHRoof(H));
    for (let x = 8; x < 23; x += 3) P.rect(x, 15, 1, 5, M[x < 15 ? 3 : 5]);
    // the fan in its housing
    P.ell(15, 7, 10, 5.5, M[1]); P.ell(15, 7.5, 8.6, 4.4, M[5]); P.ell(15, 8, 7.6, 3.6, M[6]);
    for (let k = 0; k < 4; k++) {
      const a = f * Math.PI / 8 + k * Math.PI / 2, ex = 15 + Math.cos(a) * 7.2, ey = 8 + Math.sin(a) * 3.4;
      const bx = 15 + Math.cos(a + 0.35) * 6.6, by = 8 + Math.sin(a + 0.35) * 3.1;
      P.poly([[15, 8], [ex, ey], [bx, by]], M[k & 1 ? 2 : 3]);
      P.line(15, 8, ex, ey, M[1]);
    }
    P.ell(15, 8, 2, 1.4, H[1]); P.px(14, 7, H[0]);
    // the mist: droplets drifting up off the fan
    for (let k = 0; k < 5; k++) { const t = ((f + k * 0.8) % 4) / 4; P.px(7 + k * 4 + Math.round(t * 2), 4 - Math.round(t * 4), '#E0F4FC', 0.8 - t * 0.6); }
    rtsWLamp(P, 27, 12, f < 2, '#58D8F8');
  },

  // REFINERY: the works with its two tall vats glowing, the chimney, the unloading pad with its hopper
  refinery(P, H, house, f) {
    const M = RTS_W_M, C = RTS_W_C.conc, G = RTS_W_C.glim, unl = f >= 4, g = f & 3;
    // the pad: hazard edge, the hopper's grating, the glow of glimmer pouring in
    rtsWBox(P, 27, 9, 19, 20, 3, [C[2], C[3], C[4]], rtsWSide());
    rtsWHazard(P, 28, 10, 17, 1, 0); rtsWHazard(P, 28, 24, 17, 1, 1);
    P.rect(32, 13, 10, 9, M[6]);
    const glow = unl ? [G[2], G[1], G[0], G[1]][g] : G[4];
    P.rect(33, 14, 8, 7, unl ? G[3] : '#3C2014');
    for (let x = 33; x < 41; x += 2) P.rect(x, 14, 1, 7, M[5]);
    for (let y = 15; y < 21; y += 2) for (let x = 34; x < 41; x += 2) P.px(x, y, glow);
    if (unl) for (let k = 0; k < 6; k++) { const R = rtsWSeeded(f * 11 + k); P.px(33 + Math.floor(R() * 8), 13 + Math.floor(R() * 7) - g, k & 1 ? G[0] : G[1]); }
    rtsWLamp(P, 29, 12, unl ? g & 1 : g === 0, '#F8B800'); rtsWLamp(P, 43, 12, unl ? !(g & 1) : g === 2, '#F8B800');
    // the conveyor from the hopper into the works
    P.rect(24, 16, 9, 3, M[4]); P.rect(24, 16, 9, 1, M[2]);
    for (let x = 24 + (g & 1); x < 32; x += 2) P.px(x, 17, unl ? G[2] : M[5]);
    // the works
    rtsWBox(P, 1, 6, 26, 22, 6, rtsWRoof(), rtsWSide());
    rtsWSeams(P, 1, 6, 26, 16, 4, M[3], true);
    P.rect(1, 22, 26, 2, H[1]); P.rect(1, 22, 26, 1, H[0]);
    rtsWVent(P, 3, 24, 6, 3); rtsWWindows(P, 12, 24, 3, 3, 2, 1, true);
    // the vats: a gauge glowing in each
    rtsWTank(P, 7, 3, 5, 12, M, rtsWHRoof(H));
    rtsWTank(P, 18, 3, 5, 12, M, rtsWHRoof(H));
    for (const x of [6, 17]) { P.rect(x, 9, 2, 6, M[6]); const lv = 2 + ((g + (x > 10 ? 2 : 0)) % 4); P.rect(x, 15 - lv, 2, lv, unl ? G[1] : G[2]); P.px(x, 15 - lv, G[0]); }
    // the chimney
    P.rect(24, 0, 3, 9, M[3]); P.rect(24, 0, 1, 9, M[2]); P.rect(24, 0, 3, 1, M[5]); P.rect(24, 3, 3, 1, H[1]);
    rtsWSmoke(P, 25, 1, g, unl ? 3 : 2);
  },

  // GLIMMER SILO: four squat tanks on a plinth, their gauges showing how full they are
  silo(P, H, house, f, st) {
    const M = RTS_W_M, C = RTS_W_C.conc, G = RTS_W_C.glim, fill = st.fill;
    rtsWBox(P, 1, 13, 28, 16, 3, [C[1], C[2], C[4]], rtsWSide());
    rtsWPipe(P, [[8, 8], [21, 8]]); rtsWPipe(P, [[8, 18], [21, 18]]);
    let k = 0;
    for (const [cx, top] of [[8, 4], [21, 4], [8, 14], [21, 14]]) {
      rtsWTank(P, cx, top, 6, 8, M, rtsWHRoof(H));
      // the gauge: a slit up the tank's front, glowing to the fill line
      const lv = Math.round(5 * Math.max(0, Math.min(1, fill)));
      P.rect(cx - 1, top + 2, 2, 6, M[6]);
      if (lv) P.rect(cx - 1, top + 8 - lv, 2, lv, G[(f + k) % 4 === 0 ? 1 : 2]);
      P.px(cx - 4, top - 1, M[0]);
      k++;
    }
    rtsWLamp(P, 27, 26, f < 2, '#F8B800');
  },

  // RADAR OUTPOST: the operations block, the mast, the dish turning
  radar(P, H, house, f) {
    const M = RTS_W_M, G = RTS_W_C.glass;
    rtsWBox(P, 22, 14, 7, 14, 4, rtsWHRoof(H), rtsWSide());
    rtsWVent(P, 23, 24, 5, 3);
    rtsWBox(P, 1, 12, 22, 16, 5, rtsWRoof(), rtsWSide());
    rtsWSeams(P, 1, 12, 22, 11, 5, M[3], true);
    P.rect(1, 23, 22, 1, H[1]);
    rtsWWindows(P, 3, 24, 4, 3, 2, 2, f & 1);
    rtsWEmblem(P, house, 3, 13, H[1], H[2]);
    // mast
    P.rect(14, 9, 3, 9, M[3]); P.rect(14, 9, 1, 9, M[1]); P.rect(13, 17, 5, 2, M[4]);
    // the dish: seen from the side as it turns, the inside or the back
    const a = f * Math.PI / 4, c = Math.cos(a), s = Math.sin(a), rx = Math.max(1.6, 8.5 * Math.abs(c)), ry = 6.5, cx = 15.5 + s * 2, cy = 7;
    for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
      const u = (x + 0.5 - cx) / rx, v = (y + 0.5 - cy) / ry, d2 = u * u + v * v;
      if (d2 > 1) continue;
      let col;
      if (c >= 0) {
        // the bowl seen from inside: its rim lit, the hollow shaded (light falls on its lower right)
        const l = u * 0.5 + v * 0.7;
        col = d2 > 0.72 ? (u + v < 0.2 ? M[0] : M[3]) : l > 0.35 ? M[1] : l > -0.2 ? M[2] : l > -0.6 ? M[3] : M[4];
      } else {
        // its back: a convex shell lit from the top left
        const l = -u * 0.6 - v * 0.7 + Math.sqrt(1 - d2) * 0.4;
        col = d2 > 0.8 ? M[4] : l > 0.6 ? M[1] : l > 0.1 ? M[2] : l > -0.4 ? M[3] : M[4];
      }
      P.px(x, y, col);
    }
    if (c >= 0) {
      // the feed on its three struts
      const fx = cx + s * 4.5, fy = cy - 1;
      for (const [sx, sy] of [[cx - rx * 0.75, cy + 2], [cx + rx * 0.75, cy + 2], [cx, cy - ry * 0.8]]) P.line(sx, sy, fx, fy, M[5]);
      P.rect(Math.round(fx) - 1, Math.round(fy) - 1, 3, 2, H[1]); P.px(Math.round(fx) - 1, Math.round(fy) - 1, H[0]);
    } else {
      P.line(cx - rx + 1, cy, cx + rx - 1, cy, M[4]); P.line(cx, cy - ry + 1, cx, cy + ry - 1, M[4]); P.disc(cx, cy, 1.5, M[5]);
    }
    rtsWLamp(P, 2, 11, f % 4 < 2);
  },

  // BARRACKS: a ribbed hut in the House's colours, sandbags, the flag
  barracks(P, H, house, f, st) {
    const M = RTS_W_M, act = f >= 4, g = f & 3, sb = ['#E0C890', '#C0A068', '#8C7048'];
    // the hut: a curved roof lit along its top, ribs across it
    for (let y = 5; y < 20; y++) {
      const t = (y - 5) / 15, c = t < 0.15 ? H[0] : t < 0.6 ? H[1] : H[2];
      P.rect(2, y, 22, 1, c);
    }
    for (let x = 5; x < 24; x += 4) for (let y = 5; y < 20; y++) P.px(x, y, rtsWHex(rtsWMix(y < 8 ? H[1] : H[2], '#000000', 0.25)));
    P.rect(2, 5, 1, 15, H[0]); P.rect(23, 5, 1, 15, rtsWHex(rtsWMix(H[2], '#000000', 0.3)));
    rtsWBox(P, 2, 19, 22, 9, 8, rtsWSide(), rtsWSide());
    P.rect(2, 19, 22, 1, M[2]);
    rtsWDoor(P, 9, 21, 8, 7, st.door);
    rtsWWindows(P, 4, 22, 1, 3, 2, 0, act); rtsWWindows(P, 19, 22, 1, 3, 2, 0, act);
    // sandbags at the corners
    const bag = (x, y) => { P.rect(x, y, 4, 3, sb[2]); P.rect(x, y, 3, 2, sb[1]); P.rect(x + 1, y, 2, 1, sb[0]); P.px(x, y + 2, '#5C4830'); };
    for (const [x0, y0] of [[0, 26], [19, 26]]) { for (let k = 0; k < 3; k++) bag(x0 + k * 3, y0); for (let k = 0; k < 2; k++) bag(x0 + 1 + k * 3, y0 - 2); }
    for (let k = 0; k < 3; k++) bag(25, 9 + k * 3);
    rtsWFlag(P, H, house, 26, 22, g, 13);
    P.rect(5, 2, 1, 4, M[4]); rtsWLamp(P, 5, 1, g < 2);
  },

  // TROOPER HALL: a tall hall with its ridge in House colours, rockets racked on the roof, a tower
  hall(P, H, house, f, st) {
    const M = RTS_W_M, act = f >= 4, g = f & 3;
    rtsWBox(P, 1, 4, 22, 24, 7, rtsWRoof(), rtsWSide());
    rtsWSeams(P, 1, 4, 22, 17, 3, M[3], false);
    P.rect(10, 4, 4, 17, H[1]); P.rect(10, 4, 1, 17, H[0]); P.rect(13, 4, 1, 17, H[2]);
    // rockets standing in their racks either side of the ridge
    for (const [xa, xb] of [[2, 9], [14, 21]]) { P.rect(xa, 9, xb - xa, 1, M[5]); P.rect(xa, 15, xb - xa, 1, M[5]); }
    for (const x0 of [3, 6, 15, 18]) {
      P.px(x0, 5, '#F86040'); P.rect(x0, 6, 2, 2, '#D82800'); P.px(x0 + 1, 6, '#A01800');
      P.rect(x0, 8, 2, 8, '#E8E4D8'); P.rect(x0 + 1, 8, 1, 8, '#A8A498'); P.px(x0, 8, '#FFFFFF');
      P.px(x0 - 1, 15, M[5]); P.px(x0 + 2, 15, M[5]); P.px(x0 - 1, 14, M[4]); P.px(x0 + 2, 14, M[4]);
    }
    rtsWDoor(P, 8, 22, 8, 6, st.door);
    P.rect(3, 22, 3, 5, H[1]); P.rect(3, 22, 3, 1, H[0]); P.px(4, 24, H[0]); P.rect(18, 22, 3, 5, H[1]); P.rect(18, 22, 3, 1, H[0]); P.px(19, 24, H[0]);
    // the tower
    rtsWBox(P, 22, 1, 7, 27, 5, rtsWHRoof(H), rtsWSide());
    rtsWWindows(P, 23, 6, 1, 5, 2, 0, act); rtsWWindows(P, 23, 12, 1, 5, 2, 0, act);
    rtsWVent(P, 23, 23, 5, 3);
    rtsWLamp(P, 25, 2, g < 2);
  },

  // LIGHT FACTORY: a sawtooth roof of skylights, the House's band, the wide door, a vent stack
  light(P, H, house, f, st) {
    const M = RTS_W_M, G = RTS_W_C.glass, act = f >= 4, g = f & 3;
    rtsWBox(P, 1, 7, 28, 21, 9, rtsWRoof(), rtsWSide());
    for (let x0 = 2; x0 < 27; x0 += 6) {
      for (let x = 0; x < 6 && x0 + x < 28; x++) P.rect(x0 + x, 8, 1, 10, x < 4 ? [M[1], M[2], M[2], M[3]][x] : G[x === 4 ? 1 : 2]);
      P.px(x0 + 4, 8, G[0]);
    }
    P.rect(1, 17, 28, 1, M[4]);
    P.rect(1, 19, 28, 2, H[1]); P.rect(1, 19, 28, 1, H[0]);
    rtsWEmblem(P, house, 2, 9, H[1], H[2]);
    rtsWDoor(P, 9, 21, 12, 7, st.door, H);
    rtsWVent(P, 3, 22, 4, 4); rtsWVent(P, 23, 22, 4, 4);
    // the stack
    P.rect(24, 1, 4, 9, M[3]); P.rect(24, 1, 1, 9, M[1]); P.rect(24, 1, 4, 1, M[6]); P.rect(24, 4, 4, 1, H[1]);
    if (act) rtsWSmoke(P, 26, 1, g, 3);
    rtsWLamp(P, 8, 20, act ? g & 1 : 0, '#F8B800'); rtsWLamp(P, 22, 20, act ? !(g & 1) : 0, '#F8B800');
  },

  // HEAVY FACTORY: a long works under a gantry crane, two stacks, the great door
  heavy(P, H, house, f, st) {
    const M = RTS_W_M, act = f >= 4, g = f & 3;
    rtsWBox(P, 1, 7, 44, 21, 9, rtsWRoof(), rtsWSide());
    rtsWSeams(P, 1, 7, 44, 12, 4, M[3], true);
    rtsWVent(P, 25, 9, 6, 4);
    // the gantry: rails, and the bridge running along them
    P.rect(3, 9, 29, 1, M[5]); P.rect(3, 16, 29, 1, M[5]);
    const bx = 18 + [0, 3, 6, 3][act ? g : 0];
    P.rect(bx, 8, 3, 10, '#F8C800'); P.rect(bx + 2, 8, 1, 10, '#A07800'); P.rect(bx - 1, 12, 5, 2, M[5]);
    P.rect(1, 19, 44, 2, H[1]); P.rect(1, 19, 44, 1, H[0]);
    for (let x = 3; x < 44; x += 6) P.px(x, 20, H[2]);
    rtsWDoor(P, 15, 21, 16, 7, st.door, H);
    rtsWWindows(P, 3, 22, 3, 2, 3, 2, act); rtsWWindows(P, 34, 22, 3, 2, 3, 2, act);
    // the stacks
    for (const x of [4, 10]) { P.rect(x, 0, 4, 11, M[3]); P.rect(x, 0, 1, 11, M[1]); P.rect(x + 3, 0, 1, 11, M[5]); P.rect(x, 0, 4, 1, M[6]); P.rect(x, 3, 4, 2, H[1]); if (act) rtsWSmoke(P, x + 2, 0, (g + x) & 3, 3); }
    rtsWEmblem(P, house, 34, 8, H[1], H[2]);
    rtsWLamp(P, 14, 20, act ? g & 1 : 0, '#F8B800'); rtsWLamp(P, 32, 20, act ? !(g & 1) : 0, '#F8B800');
  },

  // HIGH-TECH FACTORY: a hangar under a curved roof with its skylight, the landing pad beside it, a mast
  hightech(P, H, house, f, st) {
    const M = RTS_W_M, C = RTS_W_C.conc, G = RTS_W_C.glass, act = f >= 4, g = f & 3;
    // the pad
    rtsWBox(P, 31, 8, 16, 20, 2, [C[1], C[2], C[4]], rtsWSide());
    P.disc(39, 17, 6, H[2]); P.disc(39, 17, 5, C[3]);
    P.rect(36, 14, 1, 7, '#F8F0D0'); P.rect(42, 14, 1, 7, '#F8F0D0'); P.rect(37, 17, 5, 1, '#F8F0D0');
    for (const [x, y, k] of [[32, 9, 0], [45, 9, 1], [32, 25, 2], [45, 25, 3]]) rtsWLamp(P, x, y, (g === k) || (act && (g & 1) === (k & 1)), '#58F858');
    // the hangar: a barrel roof shaded across, ribs, the long skylight
    for (let x = 1; x < 31; x++) {
      const t = (x - 1) / 30, c = t < 0.1 ? M[0] : t < 0.4 ? M[1] : t < 0.75 ? M[2] : t < 0.92 ? M[3] : M[4];
      P.rect(x, 4, 1, 15, c);
    }
    for (let y = 6; y < 19; y += 3) P.rect(1, y, 30, 1, M[3]);
    P.rect(12, 5, 6, 13, G[2]); P.rect(12, 5, 2, 13, G[1]); P.px(12, 5, G[0]); P.rect(17, 5, 1, 13, G[3]);
    if (act) P.rect(12, 5 + g * 3, 6, 2, '#F8F0B0');
    P.rect(1, 4, 30, 1, M[0]);
    rtsWBox(P, 1, 18, 30, 10, 9, rtsWSide(), rtsWSide());
    P.rect(1, 18, 30, 2, H[1]); P.rect(1, 18, 30, 1, H[0]);
    rtsWDoor(P, 7, 21, 16, 7, st.door, H);
    rtsWEmblem(P, house, 21, 6, H[1], H[2]);
    // the mast
    P.rect(28, 0, 1, 6, M[3]); P.rect(26, 2, 5, 1, M[4]); rtsWLamp(P, 28, 0, g & 1);
  },

  // REPAIR PAD: the control booth, the raised pad with its bay, two yellow arms reaching over it
  repair(P, H, house, f) {
    const M = RTS_W_M, C = RTS_W_C.conc, act = f >= 4, g = f & 3;
    rtsWBox(P, 13, 7, 34, 21, 3, [C[2], C[3], C[4]], rtsWSide());
    rtsWHazard(P, 14, 24, 32, 1); rtsWHazard(P, 14, 8, 32, 1, 1);
    // the bay: a grating, a cross of guide lines
    P.rect(20, 11, 20, 11, M[5]); P.frame(20, 11, 20, 11, M[6]);
    for (let x = 22; x < 39; x += 3) P.rect(x, 12, 1, 9, M[4]);
    P.rect(29, 12, 2, 9, H[1]); P.rect(21, 16, 18, 1, H[1]);
    // the arms: shoulders on the pad's back corners, elbows, the tools (moving while at work)
    const sway = act ? [0, 2, 3, 1][g] : 0;
    for (const [sx, dir] of [[17, 1], [43, -1]]) {
      const ex = sx + dir * 6, ey = 12 + (dir > 0 ? sway : 3 - sway), tx = ex + dir * (4 + (dir > 0 ? sway : 3 - sway)), ty = 17;
      P.rect(sx - 2, 8, 4, 4, M[4]); P.rect(sx - 2, 8, 4, 1, M[2]);
      P.line(sx, 10, ex, ey, '#A07800'); P.line(sx, 9, ex, ey - 1, '#F8C800');
      P.line(ex, ey, tx, ty, '#A07800'); P.line(ex, ey - 1, tx, ty - 1, '#F8C800');
      P.rect(ex - 1, ey - 1, 2, 2, M[3]); P.rect(tx - 1, ty, 2, 2, M[5]);
      if (act) rtsWSparks(P, tx, ty + 1, f + sx);
    }
    // the booth
    rtsWBox(P, 1, 5, 13, 23, 7, rtsWHRoof(H), rtsWSide());
    rtsWEmblem(P, house, 3, 6, H[0], H[2]);
    rtsWWindows(P, 2, 22, 3, 3, 2, 1, true);
    P.rect(5, 0, 1, 6, M[3]); rtsWLamp(P, 5, 0, act ? g & 1 : g === 0, act ? '#F8B800' : '#58F858');
  },

  // RESEARCH LAB: a glass dome on its block, a tank of something glowing, the antenna
  lab(P, H, house, f) {
    const M = RTS_W_M, G = RTS_W_C.glass, pulse = [0.3, 0.6, 1, 0.6][f];
    rtsWBox(P, 1, 12, 27, 16, 5, rtsWRoof(), rtsWSide());
    P.rect(1, 23, 27, 1, H[1]); P.rect(1, 24, 27, 1, H[2]);
    rtsWWindows(P, 3, 25, 5, 2, 2, 2, true);
    // the tank, glowing green
    rtsWTank(P, 24, 4, 3.5, 13, M, null);
    P.rect(23, 7, 3, 9, M[6]); P.rect(23, 16 - Math.round(4 + pulse * 4), 3, Math.round(4 + pulse * 4), rtsWHex(rtsWMix('#208840', '#B8F8A0', pulse)));
    P.px(23, 8, '#E8FCE0');
    rtsWPipe(P, [[19, 15], [22, 15]]);
    // the dome: glass in panes, its lit side and its glints
    rtsWDome(P, 12, 13, 10, [G[0], G[1], G[2], G[3], '#102038'], 0.85);
    for (let k = -2; k <= 2; k++) for (let y = 5; y < 22; y++) { const half = Math.sqrt(Math.max(0, 1 - ((y + 0.5 - 13) / 8.5) ** 2)) * 10; P.px(Math.round(12 + k * half / 2.6), y, M[3]); }
    for (let x = 3; x < 22; x++) { const half = Math.sqrt(Math.max(0, 1 - ((x + 0.5 - 12) / 10) ** 2)) * 8.5; P.px(x, Math.round(13 - half * 0.45), M[3]); }
    P.px(8, 7, '#FFFFFF'); P.px(7, 8, '#FFFFFF'); P.px(9, 6, G[0]);
    P.ell(12, 13, 3, 2.4, rtsWHex(rtsWMix(G[2], '#A0F8C0', pulse * 0.6)));
    // the antenna
    P.rect(26, 0, 1, 5, M[3]); P.rect(25, 1, 3, 1, M[4]); rtsWLamp(P, 26, 0, f & 1, '#F83818');
  },

  // STARPORT: the great landing ring with its lights running round, the control tower, the terminal
  starport(P, H, house, f) {
    const M = RTS_W_M, C = RTS_W_C.conc, G = RTS_W_C.glass, cx = 28, cy = 24;
    // the apron
    rtsWBox(P, 9, 6, 38, 38, 3, [C[1], C[2], C[4]], rtsWSide());
    // the ring: a dark band, the pad, its marks
    P.ell(cx, cy, 17, 16, C[4]); P.ell(cx, cy, 16, 15, '#3C3830'); P.ell(cx, cy, 13, 12, C[3]); P.ell(cx, cy, 12, 11, C[2]);
    P.ell(cx, cy, 8, 7.5, H[2]); P.ell(cx, cy, 7, 6.5, H[1]); P.ell(cx - 1, cy - 1, 5, 4.5, H[0], 0.5); P.ell(cx, cy, 4, 3.6, C[2]);
    for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2; P.line(cx + Math.cos(a) * 9, cy + Math.sin(a) * 8.5, cx + Math.cos(a) * 11.5, cy + Math.sin(a) * 10.5, '#F8F0D0'); }
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
    P.rect(0, 2, 12, 9, M[4]); P.rect(1, 3, 10, 7, G[2]); P.rect(1, 3, 10, 2, G[1]); P.px(2, 3, G[0]);
    P.rect(0, 1, 12, 2, M[2]); P.rect(0, 10, 12, 2, M[5]);
    P.rect(5, 0, 1, 2, M[3]); rtsWLamp(P, 5, 0, f & 1);
    rtsWWindows(P, 2, 37, 2, 3, 2, 2, true);
    // the terminal along the front
    rtsWBox(P, 12, 38, 30, 9, 4, rtsWRoof(), rtsWSide());
    P.rect(12, 42, 30, 1, H[1]);
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

// a slab of concrete as a building (opaque, with its seams)
function rtsWSlab(P, x0, y0) {
  const M = RTS_W_C.conc;
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const n = rtsWPFbm(x, y, 75), h = rtsWHash(x + x0, y + y0, 76);
    let i = Math.round(2 + (n < 0.35 ? -0.6 : n > 0.66 ? 0.6 : 0) + (rtsWBayer(x, y) - 0.5) * 0.6);
    if (h < 0.04) i = 3;
    P.px(x0 + x, y0 + y, M[i]);
  }
  P.rect(x0, y0, 16, 1, M[0]); P.rect(x0, y0, 1, 16, M[0]); P.rect(x0, y0 + 15, 16, 1, M[4]); P.rect(x0 + 15, y0, 1, 16, M[4]);
}

// the domed palace: a broad stair, the hall of columns, the great dome, two spires, the House's banners
function rtsWPalaceDomes(P, H, house, f) {
  const S = ['#FCF8EC', '#E8E0CC', '#CCC0A4', '#A49880', '#786C58', '#4C4434'], gold = ['#FCE890', '#E8B830', '#A87818'];
  const glow = [0.4, 0.7, 1, 0.7][f];
  // the terrace and its stair
  rtsWBox(P, 2, 20, 42, 26, 4, [S[1], S[2], S[3]], [S[3], S[4], S[5]]);
  for (let k = 0; k < 4; k++) P.rect(17 + k, 42 + k, 12 - k * 2, 1, k & 1 ? S[2] : S[1]);
  // the hall: columns along its face
  rtsWBox(P, 7, 18, 32, 22, 9, [S[0], S[1], S[2]], [S[2], S[3], S[4]]);
  for (let x = 9; x < 38; x += 4) { P.rect(x, 31, 2, 9, S[1]); P.rect(x + 1, 31, 1, 9, S[3]); P.rect(x - 1, 31, 4, 1, S[0]); }
  P.rect(7, 30, 32, 1, gold[1]);
  P.rect(19, 32, 8, 8, '#2C2014'); P.ell(23, 32, 4, 3, '#2C2014');
  P.rect(20, 34, 6, 6, rtsWHex(rtsWMix('#5C3810', gold[0], glow * 0.6)));
  // the great dome on its drum, a gold finial
  rtsWBox(P, 14, 13, 18, 12, 3, [S[0], S[1], S[2]], [S[2], S[3], S[4]]);
  rtsWDome(P, 23, 14, 10, [rtsWHex(rtsWMix(H[0], '#FFFFFF', 0.4)), H[0], H[1], H[2], rtsWHex(rtsWMix(H[2], '#000000', 0.4))], 0.9);
  for (let k = -1; k <= 1; k++) for (let y = 6; y < 22; y++) { const half = Math.sqrt(Math.max(0, 1 - ((y + 0.5 - 14) / 9) ** 2)) * 10; P.px(Math.round(23 + k * half / 1.8), y, H[2]); }
  P.rect(22, 1, 2, 4, gold[1]); P.px(22, 1, gold[0]); P.disc(23, 1, 1.4, gold[0]);
  // the spires
  for (const x of [4, 37]) {
    rtsWBox(P, x, 8, 7, 30, 3, [S[0], S[1], S[2]], [S[2], S[3], S[4]]);
    rtsWDome(P, x + 3.5, 8, 4, [rtsWHex(rtsWMix(H[0], '#FFFFFF', 0.4)), H[0], H[1], H[2], rtsWHex(rtsWMix(H[2], '#000000', 0.4))], 1);
    P.rect(x + 3, 1, 1, 4, gold[1]); P.px(x + 3, 0, gold[0]);
    P.rect(x + 2, 14, 3, 4, '#2C2014'); P.rect(x + 2, 14, 3, 4, rtsWHex(rtsWMix('#2C2014', '#F8D070', glow)), 0.8);
    P.rect(x + 2, 22, 3, 4, '#2C2014'); P.rect(x + 2, 22, 3, 4, rtsWHex(rtsWMix('#2C2014', '#F8D070', glow)), 0.6);
  }
  // the banners either side of the door, the emblem in gold above it
  for (const x of [11, 30]) {
    const off = f & 1;
    P.rect(x, 31, 5, 8, H[1]); P.rect(x, 31, 5, 1, H[0]); P.rect(x + 4, 31, 1, 8, H[2]);
    P.px(x + 1, 39, H[1]); P.px(x + 3, 39 + off, H[1]);
    P.px(x + 2, 34, gold[0]); P.px(x + 2, 35, gold[1]); P.px(x + 1, 35, gold[1]); P.px(x + 3, 35, gold[1]);
  }
  const [ew] = rtsWEmblemSize(house);
  rtsWEmblem(P, house, 23 - (ew >> 1), 20, gold[f === 2 ? 0 : 1], gold[2]);
}
// DRAKON's fortress: black stone, spiked battlements, horned towers, fire in the braziers
function rtsWPalaceDrakon(P, H, house, f) {
  const S = ['#A8A0A0', '#888080', '#686060', '#4C4444', '#343030', '#1C1818'], fire = ['#FCF0A0', '#F8B800', '#F86800', '#C82800'];
  rtsWBox(P, 1, 18, 45, 28, 4, [S[2], S[3], S[4]], [S[3], S[4], S[5]]);
  for (let k = 0; k < 4; k++) P.rect(17 + k, 42 + k, 12 - k * 2, 1, S[k & 1 ? 3 : 2]);
  // the keep
  rtsWBox(P, 8, 10, 30, 30, 11, [S[1], S[2], S[3]], [S[3], S[4], S[5]]);
  rtsWSeams(P, 8, 10, 30, 19, 4, S[4], false);
  for (let x = 8; x < 38; x += 4) { P.rect(x, 7, 2, 4, S[2]); P.px(x, 7, S[0]); P.px(x + 1, 6, S[1]); }   // spiked crenels
  // the gate: a fanged arch, a red glow inside
  P.rect(18, 31, 10, 9, '#140C0C'); P.ell(23, 31, 5, 4, '#140C0C');
  P.rect(19, 34, 8, 6, rtsWHex(rtsWMix('#3C0C08', '#F84818', [0.3, 0.6, 0.9, 0.6][f])));
  for (let x = 19; x < 28; x += 2) P.px(x, 30 + (x & 2 ? 1 : 0), S[0]);
  // the red banner with the skull hanging over the gate
  P.rect(17, 12, 12, 15, H[1]); P.rect(17, 12, 12, 1, H[0]); P.rect(28, 12, 1, 15, H[2]);
  for (let x = 17; x < 29; x += 2) P.px(x, 27 + (((x >> 1) + f) & 1), H[1]);
  rtsWEmblem(P, house, 19, 15, '#E8E0D0', '#2C1C18');
  // the horned towers
  for (const x of [1, 37]) {
    rtsWBox(P, x, 6, 9, 32, 4, [S[1], S[2], S[3]], [S[3], S[4], S[5]]);
    P.line(x, 6, x - 1, 1, S[0]); P.line(x + 1, 6, x, 2, S[2]); P.line(x + 8, 6, x + 9, 1, S[0]); P.line(x + 7, 6, x + 8, 2, S[2]);
    P.rect(x + 3, 15, 3, 5, '#140C0C'); P.rect(x + 3, 16, 3, 3, fire[3], 0.5 + 0.15 * (f & 1));
    // the brazier on top
    P.rect(x + 2, 7, 5, 3, S[4]); P.rect(x + 2, 7, 5, 1, S[2]);
    const fl = [[0, 1, 2], [1, 2, 1], [2, 1, 0], [1, 0, 1]][f];
    for (let k = 0; k < 3; k++) { P.rect(x + 3 + k, 5 - fl[k], 1, 2 + fl[k], fire[2]); P.px(x + 3 + k, 6 - fl[k], fire[1]); }
    P.px(x + 4, 5 - fl[1], fire[0]);
  }
}
// SERPENS' temple: three steps of jade-roofed terraces, gold trim, the serpent in gold, lanterns
function rtsWPalaceSerpens(P, H, house, f) {
  const S = ['#F8E8C0', '#E0C890', '#C0A068', '#987848', '#6C5030', '#44301C'], gold = ['#FCF0A0', '#F8C838', '#B88818'];
  const J = [rtsWHex(rtsWMix(H[0], '#FFFFFF', 0.3)), H[0], H[1], H[2], rtsWHex(rtsWMix(H[2], '#000000', 0.4))];
  const tier = (x, y, w, h, d) => {
    rtsWBox(P, x, y, w, h, d, [J[1], J[2], J[3]], [S[2], S[3], S[4]]);
    for (let i = x + 2; i < x + w - 1; i += 3) P.rect(i, y + 1, 1, h - d - 2, J[3]);   // the roof's tiles
    P.rect(x, y + h - d, w, 1, gold[1]);
  };
  tier(1, 22, 45, 24, 5);
  tier(7, 13, 33, 22, 5);
  tier(13, 5, 21, 19, 5);
  // the sanctum on top, with its lantern
  rtsWBox(P, 18, 0, 11, 10, 4, [S[0], S[1], S[2]], [S[2], S[3], S[4]]);
  P.rect(22, 6, 3, 4, '#1C1008'); P.rect(22, 7, 3, 3, rtsWHex(rtsWMix('#3C2008', gold[0], [0.3, 0.6, 1, 0.6][f])));
  // the stair up the middle
  for (let y = 17; y < 46; y++) P.rect(20, y, 7, 1, (y & 1) ? S[1] : S[2]);
  P.rect(19, 17, 1, 29, gold[2]); P.rect(27, 17, 1, 29, gold[2]);
  // the serpent in gold beside it, and the House's emblem on the middle step
  const [ew] = rtsWEmblemSize(house);
  rtsWEmblem(P, house, 9, 33, gold[f === 2 ? 0 : 1], gold[2]);
  rtsWEmblem(P, house, 29, 33, gold[f === 2 ? 0 : 1], gold[2]);
  rtsWEmblem(P, house, 24 - (ew >> 1), 6 + 5, J[0], J[3]);
  // lanterns on the corners, glowing in turn
  for (const [x, y, k] of [[3, 24, 0], [43, 24, 1], [9, 15, 2], [37, 15, 3]]) rtsWLamp(P, x, y, (f + k) & 1, '#F8D838');
}

// the turrets: an armoured octagonal bunker, on it the gun (or the rocket pod) turned to dir8, a flash when it fires
function rtsWTurret(P, H, rocket, dir, firing) {
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

// damage: scorch, holes burnt through with embers glowing in them, cracks; worse when heavily damaged
function rtsWDamage(P, key, dmg, f) {
  if (!dmg) return;
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

// building up: the foundation marked out, the building rising out of the ground inside its scaffolding
function rtsWBuildStage(base, step) {
  const w = base.w, h = base.h, P = new RtsWPaint(w, h), Y = RTS_W_C.hazard[0], M = RTS_W_M;
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

// a white flash over the building (a hit)
function rtsWFlash(c) {
  const P = rtsWFromCanvas(c);
  for (let y = 0; y < P.h; y++) for (let x = 0; x < P.w; x++) { const p = P.get(x, y); if (p[3] > 120) P.tint(x, y, '#FFFFFF', 0.7); }
  return P.canvas();
}

const RTS_W_BLD_CACHE = new Map();
function rtsWBuildingPaint(key, house, f, dmg, st) {
  const S = RTS_W_SIZE[key] || [2, 2], P = new RtsWPaint(S[0] * 16, S[1] * 16), H = rtsWHousePal(house);
  const draw = RTS_W_DRAW[key];
  if (draw) draw(P, H, house, f, st);
  else { rtsWBox(P, 1, 1, S[0] * 16 - 4, S[1] * 16 - 4, 5, rtsWHRoof(H), rtsWSide()); }
  if (key === 'slab1' || key === 'slab4') return P;
  P.outline(RTS_W_OUT);
  rtsWDamage(P, key, dmg, f);
  P.shadow(key === 'turret' || key === 'rturret' ? 2 : 3, key === 'turret' || key === 'rturret' ? 2 : 3, 0.36);
  return P;
}
// rtsBuildingArt(key, house, state) -> canvas (w*16 x h*16). state: { dmg 0..2, frame (any integer; wraps by
// RTS_W_FRAMES[key]), active (adds 4: building/unloading/producing/repairing for RTS_W_ACTIVE keys), door 0..3,
// build 0..1, flash, fill 0..1 (silo), dir8/firing (turrets) }
function rtsBuildingArt(key, house, state) {
  state = state || {};
  if (key === 'wall') return rtsWallArt(house, state.mask === undefined ? 0 : state.mask);
  const n = RTS_W_FRAMES[key] || 1;
  let f = (((state.frame | 0) % n) + n) % n;
  if (state.active && RTS_W_ACTIVE[key]) f = 4 + (f & 3);
  const dmg = Math.max(0, Math.min(2, state.dmg | 0)), door = RTS_W_DOORS[key] ? Math.max(0, Math.min(3, state.door | 0)) : 0;
  const build = state.build === undefined || state.build === null ? 1 : Math.max(0, Math.min(1, +state.build || 0)), bs = Math.round(build * 8);
  const turret = key === 'turret' || key === 'rturret';
  const dir = turret ? (((state.dir8 | 0) % 8) + 8) % 8 : 0, firing = turret && state.firing ? 1 : 0;
  const fill = key === 'silo' ? Math.round(Math.max(0, Math.min(1, state.fill === undefined ? 0.5 : +state.fill || 0)) * 5) : 0;
  if (bs < 8) { f = 0; }
  const k = [key, house, f, dmg, door, bs, dir, firing, fill].join(':');
  const flash = !!state.flash;
  let c = RTS_W_BLD_CACHE.get(k);
  if (!c) {
    if (bs < 8) {
      const base = rtsWBuildingPaint(key, house, 0, 0, { door: 0, fill: 0, dir8: dir, firing: 0 });
      c = rtsWBuildStage(base, bs).canvas();
    } else c = rtsWBuildingPaint(key, house, f, dmg, { door, fill: fill / 5, dir8: dir, firing }).canvas();
    RTS_W_BLD_CACHE.set(k, c);
  }
  if (!flash) return c;
  const kf = k + ':flash';
  let cf = RTS_W_BLD_CACHE.get(kf);
  if (!cf) { cf = rtsWFlash(c); RTS_W_BLD_CACHE.set(kf, cf); }
  return cf;
}

// ------------------------------------------------------------------ walls
// rtsWallArt(house, mask): a piece of wall, 16 x 16, joined to its neighbours (mask 1 up, 2 right, 4 down, 8 left);
// stone blocks with a lit top, the face showing where the wall runs out towards the south, the House's mark on posts
const RTS_W_WALL = new Map();
function rtsWallArt(house, mask) {
  mask = (mask | 0) & 15;
  const k = house + ':' + mask;
  if (RTS_W_WALL.has(k)) return RTS_W_WALL.get(k);
  const P = new RtsWPaint(16, 16), H = rtsWHousePal(house);
  const S = ['#E4DCCC', '#C8BCA8', '#A89C88', '#847866', '#5C5244', '#3C342C'];
  const up = mask & 1, rt = mask & 2, dn = mask & 4, lf = mask & 8;
  // the top surface (where the wall stands) and the face below where it ends
  const x0 = lf ? 0 : 3, x1 = rt ? 16 : 13, y0 = up ? 0 : 2, y1 = dn ? 16 : 10;
  const inTop = (x, y) => (x >= 3 && x < 13 && y >= y0 && y < y1) || (y >= 2 && y < 10 && x >= x0 && x < x1);
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
  const straight = mask === 5 || mask === 10;
  if (!straight) { P.rect(5, 3, 6, 5, S[0]); P.rect(6, 4, 4, 3, H[1]); P.rect(6, 4, 4, 1, H[0]); P.rect(9, 5, 1, 2, H[2]); P.rect(5, 7, 6, 1, S[3]); }
  P.outline(RTS_W_OUT, 0.9);
  P.shadow(2, 2, 0.32);
  const c = P.canvas();
  RTS_W_WALL.set(k, c);
  return c;
}

// ------------------------------------------------------------------ build icons (32 x 24): a framed picture
const RTS_W_ICON = new Map();
function rtsWIconFrame(P, house) {
  const H = rtsWHousePal(house);
  // a dusty sky over the sand, the frame round it
  for (let y = 1; y < 23; y++) {
    const t = (y - 1) / 22, c = t < 0.55 ? rtsWMix('#E8A868', '#F8D8A0', t / 0.55) : rtsWMix('#D89850', '#B87838', (t - 0.55) / 0.45);
    for (let x = 1; x < 31; x++) P.px(x, y, rtsWBayer(x, y) < 0.15 && t < 0.55 ? rtsWMix(c, '#FFFFFF', 0.15) : c);
  }
  P.frame(0, 0, 32, 24, '#1A140F');
  P.rect(1, 1, 30, 1, H[0]); P.rect(1, 1, 1, 22, H[0]); P.rect(1, 22, 30, 1, H[2]); P.rect(30, 1, 1, 22, H[2]);
}
function rtsWIconFit(P, src, maxW, maxH, cx, bottom) {
  const s = Math.min(1, maxW / src.width, maxH / src.height), w = Math.max(1, Math.round(src.width * s)), h = Math.max(1, Math.round(src.height * s));
  const t = makeCanvas(w, h), g = t.getContext('2d');
  g.imageSmoothingEnabled = s < 1; if (s < 1) g.imageSmoothingQuality = 'high';
  g.drawImage(src, 0, 0, w, h);
  const T = rtsWFromCanvas(t), x0 = Math.round(cx - w / 2), y0 = bottom - h;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const p = T.get(x, y);
    if (p[3] < 110) continue;
    // keep it crisp: no half-transparent edges except the shadow
    const dark = p[0] + p[1] + p[2] < 40;
    P.px(x0 + x, y0 + y, [p[0], p[1], p[2]], dark && p[3] < 200 ? 0.4 : 1);
  }
}
function rtsBuildingIcon(key, house) {
  const k = key + ':' + house;
  if (RTS_W_ICON.has(k)) return RTS_W_ICON.get(k);
  const P = new RtsWPaint(32, 24);
  rtsWIconFrame(P, house);
  if (key === 'wall') {
    const c = makeCanvas(48, 16), g = c.getContext('2d');
    g.drawImage(rtsWallArt(house, 2), 0, 0); g.drawImage(rtsWallArt(house, 10), 16, 0); g.drawImage(rtsWallArt(house, 8), 32, 0);
    rtsWIconFit(P, c, 28, 20, 16, 20);
  } else if (key === 'turret' || key === 'rturret') {
    const c = rtsBuildingArt(key, house, { dir8: 3 }), b = makeCanvas(32, 32), g = b.getContext('2d');
    g.imageSmoothingEnabled = false; g.drawImage(c, 0, 0, 32, 32);
    rtsWIconFit(P, b, 28, 20, 16, 22);
  } else {
    const S = RTS_W_SIZE[key] || [2, 2];
    const c = rtsBuildingArt(key, house, { frame: key === 'radar' ? 1 : 0 });
    rtsWIconFit(P, c, S[0] === 1 ? 20 : 29, S[1] === 3 ? 22 : 21, 16, 22);
  }
  const c = P.canvas();
  RTS_W_ICON.set(k, c);
  return c;
}

// ------------------------------------------------------------------ rubble where a building stood
// rtsRubbleArt(w, h, seed): w, h in tiles (or pixels if over 8); broken slabs, twisted girders, scorch
const RTS_W_RUBBLE = new Map();
function rtsRubbleArt(w, h, seed) {
  w = w | 0 || 1; h = h | 0 || 1; seed = seed | 0;
  const W = w > 8 ? w : w * 16, Hh = h > 8 ? h : h * 16, k = W + 'x' + Hh + ':' + seed;
  if (RTS_W_RUBBLE.has(k)) return RTS_W_RUBBLE.get(k);
  const P = new RtsWPaint(W, Hh), R = rtsWSeeded(seed * 977 + W * 31 + Hh), M = RTS_W_M, C = RTS_W_C.conc;
  // the scorched ground where it stood
  for (let y = 1; y < Hh - 1; y++) for (let x = 1; x < W - 1; x++) {
    const e = Math.min(x, y, W - 1 - x, Hh - 1 - y), n = rtsWNoise(x / 4, y / 4, seed + 3);
    if (e > 2 + n * 3 || rtsWBayer(x, y) < 0.3) P.px(x, y, '#1C140C', 0.25 + n * 0.35);
  }
  // the stumps of walls along the old outline
  for (let x = 2; x < W - 3; x++) if (rtsWNoise(x / 3, 1, seed + 5) > 0.45) { P.px(x, Hh - 5, M[3]); P.px(x, Hh - 4, M[5]); if (rtsWHash(x, 0, seed) < 0.5) P.px(x, Hh - 6, M[2]); }
  for (let y = 3; y < Hh - 4; y++) if (rtsWNoise(1, y / 3, seed + 6) > 0.5) { P.px(2, y, M[2]); P.px(3, y, M[4]); }
  // broken slabs and blocks
  const n = Math.round(W * Hh / 70);
  for (let i = 0; i < n; i++) {
    const bw = 2 + Math.floor(R() * 4), bh = 1 + Math.floor(R() * 3), x = 2 + Math.floor(R() * (W - bw - 4)), y = 2 + Math.floor(R() * (Hh - bh - 4));
    const pal = R() < 0.6 ? [C[0], C[2], C[4]] : [M[2], M[3], M[5]];
    P.rect(x, y, bw, bh, pal[1]); P.rect(x, y, bw, 1, pal[0]); P.rect(x + bw - 1, y, 1, bh, pal[2]); P.rect(x + 1, y + bh, bw, 1, '#140C08', 0.5);
  }
  // twisted girders and pipes
  for (let i = 0; i < Math.max(2, n >> 2); i++) {
    const x = 3 + Math.floor(R() * (W - 8)), y = 3 + Math.floor(R() * (Hh - 8)), l = 3 + Math.floor(R() * 5);
    P.line(x, y, x + l, y + Math.floor((R() - 0.5) * 4), M[5]); P.line(x, y - 1, x + l - 1, y - 1 + Math.floor((R() - 0.5) * 3), M[3]);
  }
  // a few embers still glowing, smoke stains
  for (let i = 0; i < 3; i++) P.px(3 + Math.floor(R() * (W - 6)), 3 + Math.floor(R() * (Hh - 6)), i ? '#C83000' : '#F88000');
  const c = P.canvas();
  RTS_W_RUBBLE.set(k, c);
  return c;
}

// ------------------------------------------------------------------ the SANDWYRM
// rtsWormArt(phase, frame, dir8) -> canvas 32 x 32, centred on the worm: 'under' (0..3: its ripple trail under
// the sand, heading dir8), 'rise' (0..5: the sand heaves and bursts, the ringed head comes up, the maw opens),
// 'eat' (0..3: the maw closing on its prey, sand flying), 'dive' (0..5: sinking back, the sand closing over)
const RTS_W_WORM_FRAMES = { under: 4, rise: 6, eat: 4, dive: 6 };
const RTS_W_WORM = new Map();
const RTS_W_DIRV = [[0, -1], [0.7071, -0.7071], [1, 0], [0.7071, 0.7071], [0, 1], [-0.7071, 0.7071], [-1, 0], [-0.7071, -0.7071]];
// sand thrown up round x, y out to radius r
function rtsWSpray(P, cx, cy, r, n, seed, a = 1) {
  const S = RTS_W_C.sand, R = rtsWSeeded(seed);
  for (let k = 0; k < n; k++) {
    const ang = R() * Math.PI * 2, d = r * (0.55 + R() * 0.45), x = Math.round(cx + Math.cos(ang) * d), y = Math.round(cy + Math.sin(ang) * d * 0.9);
    P.px(x, y, S[k % 3 === 0 ? 0 : k % 3 === 1 ? 1 : 3], a);
    if (R() < 0.3) P.px(x + 1, y + 1, S[4], a * 0.7);
  }
}
// the heaped sand round a hole (a ring lit on its far side, its near lip shadowed)
function rtsWSandRing(P, cx, cy, r) {
  const S = RTS_W_C.sand;
  for (let y = Math.floor(cy - r - 3); y <= cy + r + 3; y++) for (let x = Math.floor(cx - r - 3); x <= cx + r + 3; x++) {
    const dx = x + 0.5 - cx, dy = y + 0.5 - cy, d = Math.hypot(dx, dy);
    if (d < r || d > r + 2.6 + rtsWHash(x, y, 9) * 0.8) continue;
    const lit = (dx + dy) / (d || 1);
    P.px(x, y, d < r + 1 ? (lit > 0 ? S[1] : S[4]) : lit > 0.2 ? S[2] : lit < -0.4 ? S[0] : S[1]);
  }
}
// the head seen from above: ringed segments shaded as a dome; open 0..1 peels its three lips back to show the
// rings of teeth and the throat
function rtsWWormHead(P, cx, cy, r, open, dir, f) {
  const W = RTS_W_C.worm, a0 = Math.atan2(RTS_W_DIRV[dir][1], RTS_W_DIRV[dir][0]);
  // the lips folded back (drawn first, they lie outside the rim)
  if (open > 0.3) for (let k = 0; k < 3; k++) {
    const a = a0 + k * Math.PI * 2 / 3 + Math.PI / 3, l = r * (0.35 + 0.35 * open);
    const bx = cx + Math.cos(a) * (r - 1), by = cy + Math.sin(a) * (r - 1), tx = cx + Math.cos(a) * (r + l), ty = cy + Math.sin(a) * (r + l);
    const px = -Math.sin(a) * r * 0.55, py = Math.cos(a) * r * 0.55;
    P.poly([[bx + px, by + py], [tx, ty], [bx - px, by - py]], W[2]);
    P.poly([[bx + px * 0.6, by + py * 0.6], [tx - Math.cos(a), ty - Math.sin(a)], [bx, by]], W[1]);
    P.line(bx - px, by - py, tx, ty, W[4]);
  }
  P.disc(cx + 0.6, cy + 0.6, r + 1, W[5]);
  for (let y = Math.floor(cy - r); y <= cy + r; y++) for (let x = Math.floor(cx - r); x <= cx + r; x++) {
    const dx = (x + 0.5 - cx) / r, dy = (y + 0.5 - cy) / r, d2 = dx * dx + dy * dy;
    if (d2 > 1) continue;
    const d = Math.sqrt(d2), l = -dx * 0.55 - dy * 0.7 + Math.sqrt(1 - d2) * 0.6;
    let i = l > 0.7 ? 0 : l > 0.35 ? 1 : l > 0 ? 2 : l > -0.35 ? 3 : 4;
    // the segment rings
    const ring = (d * r) % 3;
    if (ring < 0.8 && d > 0.25) i = Math.min(5, i + 1);
    else if (ring > 2.4 && l > 0) i = Math.max(0, i - 1);
    P.px(x, y, W[i]);
  }
  if (open <= 0) {
    // closed: the three lips meeting in a seam
    for (let k = 0; k < 3; k++) { const a = a0 + k * Math.PI * 2 / 3 + Math.PI / 3; P.line(cx, cy, cx + Math.cos(a) * r * 0.6, cy + Math.sin(a) * r * 0.6, W[5]); }
    P.px(Math.round(cx - 0.5), Math.round(cy - 0.5), W[5]);
    return;
  }
  // the maw: the throat, the rings of teeth pointing in
  const m = Math.max(1.5, r * 0.72 * open);
  P.disc(cx, cy, m, '#4C1410');
  P.disc(cx, cy, m * 0.75, '#2C0806');
  P.disc(cx + 0.5, cy + 0.5, m * 0.35, '#100202');
  if (m > 3) P.disc(cx, cy, m * 0.2, ['#781810', '#982818', '#782010', '#601008'][f & 3]);
  const teeth = (rad, n, len, ph) => {
    for (let k = 0; k < n; k++) {
      const a = k * Math.PI * 2 / n + ph, x = cx + Math.cos(a) * rad, y = cy + Math.sin(a) * rad;
      P.px(Math.round(x - 0.5), Math.round(y - 0.5), '#F8F0D8');
      if (len > 1) P.px(Math.round(x - Math.cos(a) * 1.2 - 0.5), Math.round(y - Math.sin(a) * 1.2 - 0.5), '#C8B898');
    }
  };
  teeth(m - 0.6, Math.max(6, Math.round(m * 2.6)), m > 4 ? 2 : 1, 0);
  if (m > 4) teeth(m * 0.55, Math.round(m * 1.6), 1, 0.3 + (f & 1) * 0.2);
}
function rtsWormArt(phase, frame, dir8) {
  phase = RTS_W_WORM_FRAMES[phase] ? phase : 'under';
  const n = RTS_W_WORM_FRAMES[phase], f = (((frame | 0) % n) + n) % n, dir = (((dir8 | 0) % 8) + 8) % 8;
  const k = phase + f + ':' + dir;
  if (RTS_W_WORM.has(k)) return RTS_W_WORM.get(k);
  const P = new RtsWPaint(32, 32), S = RTS_W_C.sand, [dx, dy] = RTS_W_DIRV[dir], px = -dy, py = dx, cx = 16, cy = 16;
  if (phase === 'under') {
    // ripples spreading back from it in chevrons, moving along as it goes; the hump of sand over its head
    for (let d = 3 - (f % 4) * 0.75 + 1; d < 17; d += 3) {
      const w = 2 + d * 0.32, a = Math.max(0.25, 1 - d / 18);
      for (let s = -w; s <= w; s += 0.5) {
        const back = d + Math.abs(s) * 0.55, x = cx + dx * (3 - back) + px * s, y = cy + dy * (3 - back) + py * s;
        P.px(Math.round(x - 0.5), Math.round(y - 0.5), S[5], Math.min(1, a * 1.1));
        P.px(Math.round(x - 0.5 + dx), Math.round(y - 0.5 + dy), S[0], Math.min(1, a * 1.0));
      }
    }
    const hx = cx + dx * 4, hy = cy + dy * 4;
    P.ell(hx + 1.2, hy + 1.2, 5, 4.5, S[5], 0.6);
    P.ell(hx, hy, 4.5, 4, S[2]);
    P.ell(hx - 0.8, hy - 0.8, 3.2, 2.8, S[1]);
    P.ell(hx - 1.2, hy - 1.4, 1.6, 1.2, S[0]);
    rtsWSpray(P, hx + dx * 3, hy + dy * 3, 3.5, 5, f * 7 + dir, 0.9);
  } else if (phase === 'rise') {
    const hx = cx + dx * 1.5, hy = cy + dy * 1.5;
    if (f === 0) {
      // the sand heaves and cracks
      P.ell(cx + 1, cy + 1, 8, 7, S[5], 0.35); P.ell(cx, cy, 8, 7, S[2]); P.ell(cx - 1, cy - 1, 6, 5, S[1]); P.ell(cx - 2, cy - 2, 3, 2.5, S[0]);
      for (let k = 0; k < 5; k++) { const a = k * 1.3 + dir; P.line(cx, cy, cx + Math.cos(a) * 6, cy + Math.sin(a) * 5, S[4]); }
      rtsWSpray(P, cx, cy, 9, 8, 11 + dir);
    } else {
      const r = [0, 4, 6.5, 8, 9.5, 10][f], open = [0, 0, 0, 0.45, 1, 1][f];
      rtsWSandRing(P, hx, hy, r);
      rtsWWormHead(P, hx, hy, r, open, dir, f);
      rtsWSpray(P, hx, hy, r + 5 + f, 10 + f * 2, f * 13 + dir, f > 3 ? 0.8 : 1);
    }
  } else if (phase === 'eat') {
    const hx = cx + dx * 1.5, hy = cy + dy * 1.5, r = 10, open = [1, 0.5, 0, 0.4][f];
    rtsWSandRing(P, hx, hy, r);
    rtsWWormHead(P, hx, hy, r + (f === 2 ? 0.5 : 0), open, dir, f);
    rtsWSpray(P, hx, hy, r + 4, 14, f * 17 + dir + 3);
  } else {
    // dive: the closed head sinks, the sand slides in over it, ripples left behind
    const hx = cx + dx * 1.5, hy = cy + dy * 1.5, r = [9.5, 8, 6, 4, 0, 0][f];
    if (r > 0) { rtsWSandRing(P, hx, hy, r); rtsWWormHead(P, hx, hy, r, 0, dir, f); }
    else {
      for (let rr = 3 + (f - 4) * 3; rr < 12; rr += 3.5) for (let a = 0; a < Math.PI * 2; a += 0.12) {
        const x = Math.round(hx + Math.cos(a) * rr - 0.5), y = Math.round(hy + Math.sin(a) * rr * 0.9 - 0.5);
        P.px(x, y, S[Math.cos(a - 0.8) > 0 ? 4 : 0], f === 5 ? 0.4 : 0.75);
      }
      P.ell(hx, hy, 3.5, 3, S[f === 4 ? 4 : 3], 0.7);
    }
    if (f < 5) rtsWSpray(P, hx, hy, (r || 4) + 4, 8, f * 19 + dir, 0.9 - f * 0.12);
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
