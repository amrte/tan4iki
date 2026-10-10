'use strict';
// =====================================================================
//  DESERT DOMINION: the units' art (ART-UNITS of the shared contract). Every unit seen from above in the five
//  House palettes, eight directions and its animation frames; turrets on their own; infantry walking, shooting
//  and dying; burning wrecks; shots; explosions and the other effects; the sidebar build icons.
//  Two resolutions: res 1 (16 px a tile, the far view) and res 2 (32 px a tile, the close view). res 2 is not a
//  blown-up res 1: it is drawn at twice the resolution with more detail (panel seams, rivets, hatches, lights,
//  tread links and sprockets, exhausts, antennae, muzzle brakes, soldiers with faces, helmets and packs ...).
//  Every res 2 canvas is exactly twice the res 1 canvas's size, with the same anchor (centred).
//  Vehicles are not bitmaps turned round: each is a list of shapes (rects, ellipses, polygons, thick lines) in
//  its own coordinates (a res 1 pixel a unit, the front up) plus crisp 1 px decals (seams, rivets, lights) and
//  every sprite is rasterised fresh for its direction pixel by pixel, so diagonals come out as clean pixel art.
//  Each shape is shaded on its own with the light from the top-left (a lit rim, a dark rim, domes); at res 2 the
//  raised parts also cast a 1 px shadow on what's under them; then the whole gets a 1 px dark outline and a soft
//  shadow. Infantry are pixel grids (five facings, mirrored with the light kept top-left; a finer set at res 2)
//  with legs and weapons drawn per frame. Effects are procedural (noise-edged fireballs, dithered smoke).
//  Everything is cached per resolution.
//  API (contract; res is always last and optional, 1 or 2, default 1): rtsUnitArt, rtsTurretArt,
//  rtsInfantryDeathArt, rtsWreckArt, rtsShotArt, rtsFxArt + RTS_FX_FRAMES, rtsUnitIcon. Every sprite is meant to
//  be drawn centred on the unit's position (use the canvas's own width/height: most are 16x16 at res 1, the big
//  ones bigger, see RTS_U_SIZE, which is the res 1 size).
// =====================================================================

// the fallback House palettes [light, mid, dark] until rtsdata.js's RTS_HOUSE_PAL exists
const RTS_U_PAL = {
  aquila: ['#78B8F8', '#3C78F8', '#1838A0'],
  drakon: ['#F87858', '#D82800', '#801000'],
  serpens: ['#88E888', '#38B838', '#186818'],
  regent: ['#C8A0F8', '#9858D8', '#582888'],
  nomad: ['#E8C898', '#C89858', '#806030'],
};
function rtsUPal(house) {
  const P = typeof RTS_HOUSE_PAL !== 'undefined' && RTS_HOUSE_PAL ? RTS_HOUSE_PAL : RTS_U_PAL;
  return (P && P[house]) || RTS_U_PAL[house] || RTS_U_PAL.aquila;
}
// the resolution asked for: 1 or 2
function rtsURes(res) { return res >= 1.5 ? 2 : 1; }

// ------------------------------------------------------------------ pixel buffers and colours
const RTS_U_RGB = new Map();
function rtsURgb(hex) {
  let c = RTS_U_RGB.get(hex);
  if (!c) {
    const h = hex.length === 4 ? hex.replace(/^#(.)(.)(.)$/, '#$1$1$2$2$3$3') : hex;
    c = [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
    RTS_U_RGB.set(hex, c);
  }
  return c;
}
function rtsUHex(r, g, b) {
  const f = v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return '#' + f(r) + f(g) + f(b);
}
// a colour moved towards white (t > 0) or black (t < 0) (cached)
const RTS_U_TINTS = new Map();
function rtsUTint(hex, t) {
  const key = hex + t;
  let out = RTS_U_TINTS.get(key);
  if (out) return out;
  const [r, g, b] = rtsURgb(hex);
  out = t > 0 ? rtsUHex(r + (255 - r) * t, g + (255 - g) * t, b + (255 - b) * t) : rtsUHex(r * (1 + t), g * (1 + t), b * (1 + t));
  RTS_U_TINTS.set(key, out);
  return out;
}
// half way (t) from colour a to colour b (cached)
const RTS_U_MIXES = new Map();
function rtsUMix(a, b, t) {
  const key = a + b + t;
  let out = RTS_U_MIXES.get(key);
  if (out) return out;
  const A = rtsURgb(a), B = rtsURgb(b);
  out = rtsUHex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t);
  RTS_U_MIXES.set(key, out);
  return out;
}
function rtsUBuf(w, h) { return { w, h, d: new Uint8ClampedArray(w * h * 4) }; }
function rtsUPut(b, x, y, hex, a = 255) {
  x = Math.floor(x); y = Math.floor(y);
  if (x < 0 || y < 0 || x >= b.w || y >= b.h || !hex) return;
  const o = (y * b.w + x) * 4, c = rtsURgb(hex);
  if (a >= 255 || b.d[o + 3] === 0) { b.d[o] = c[0]; b.d[o + 1] = c[1]; b.d[o + 2] = c[2]; b.d[o + 3] = a; return; }
  const k = a / 255;   // over something already there
  b.d[o] = b.d[o] * (1 - k) + c[0] * k; b.d[o + 1] = b.d[o + 1] * (1 - k) + c[1] * k; b.d[o + 2] = b.d[o + 2] * (1 - k) + c[2] * k;
  b.d[o + 3] = Math.max(b.d[o + 3], a);
}
function rtsUAlpha(b, x, y) { return x < 0 || y < 0 || x >= b.w || y >= b.h ? 0 : b.d[(y * b.w + x) * 4 + 3]; }
function rtsUGetHex(b, x, y) { const o = (y * b.w + x) * 4; return rtsUHex(b.d[o], b.d[o + 1], b.d[o + 2]); }
function rtsUCanvas(b) {
  const c = makeCanvas(b.w, b.h), x = c.getContext('2d'), id = x.createImageData(b.w, b.h);
  id.data.set(b.d); x.putImageData(id, 0, 0);
  return c;
}
const RTS_U_BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
function rtsUBayer(x, y) { return (RTS_U_BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16; }
// a little deterministic random
function rtsURand(seed) {
  let s = (seed * 2654435761) >>> 0 || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}
// a fixed noise value 0..1 for a cell
function rtsUHash(x, y) {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
// a smooth value noise 0..1 (cells of 1)
function rtsUNoise(x, y, seed = 0) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const h = (a, b) => rtsUHash(a + seed * 1013, b - seed * 571);
  return (h(xi, yi) * (1 - u) + h(xi + 1, yi) * u) * (1 - v) + (h(xi, yi + 1) * (1 - u) + h(xi + 1, yi + 1) * u) * v;
}
// a smooth wobble round a circle (periodic in θ), for ragged blast edges and clouds
function rtsUWob(th, seed, t = 0) {
  const r = rtsURand(seed + 7);
  let v = 0;
  for (let k = 2; k <= 6; k++) v += Math.sin(k * th + r() * 6.283 + t * (r() - 0.5) * 6) / k;
  return v;
}
// the same from a table (1024 steps round the circle; for the big res 2 effects)
const RTS_U_WOBS = new Map();
function rtsUWobF(th, seed, t = 0) {
  const key = seed * 1000 + t;
  let tab = RTS_U_WOBS.get(key);
  if (!tab) {
    if (RTS_U_WOBS.size > 4000) RTS_U_WOBS.clear();
    tab = new Float32Array(1024);
    for (let i = 0; i < 1024; i++) tab[i] = rtsUWob(i / 1024 * Math.PI * 2, seed, t);
    RTS_U_WOBS.set(key, tab);
  }
  return tab[Math.floor(th * 162.97466) & 1023];
}

// the shared colours (NES-ish)
const RTS_U_C = {
  ol: '#100808',
  met: ['#FCFCFC', '#BCBCBC', '#7C7C7C'],
  gun: ['#B0B0B0', '#6C6C6C', '#303030'],
  ste: ['#DCD0B4', '#A0947C', '#5C5444'],
  drk: ['#6C6C6C', '#404040', '#202020'],
  gls: ['#BCF4FC', '#3CBCFC', '#0868A8'],
  yel: ['#FCE4A0', '#F8B800', '#A87400'],
  red: ['#FCB8A8', '#E83818', '#881400'],
  grn: ['#C0F8A8', '#58D854', '#007800'],
  cya: ['#FCFCFC', '#9CF4FC', '#3CBCFC'],
  pla: ['#FCFCFC', '#F8B8F8', '#C048F0'],
  skin: ['#FCD8A8', '#E09868', '#985030'],
  sand: ['#FCE0A8', '#E8B878', '#B88850'],
  glim: ['#FCE0A8', '#F89838', '#C04800'],
  fire: ['#FCFCFC', '#FCE4A0', '#F8B800', '#E45C10', '#D82800', '#881400'],
  smoke: ['#D8D8D8', '#A8A8A8', '#7C7C7C', '#585858', '#383838'],
};

// ------------------------------------------------------------------ the shape rasteriser
// shapes (own coordinates, x right, y back; the front is -y; a res 1 pixel a unit):
//   R: rect x0..x1, y0..y1, corners cut by c;  E: ellipse;  L: thick line (a capsule);  P: polygon;  F: any test
// m: material ([light, mid, dark] | 'H' house | 'HL' lighter house | 'HD' darker house | one colour |
//    fn(s, lx, ly, f, pal, pk, res))
// sh: shading 'b' bevel (default), 'f' flat, 'd' dome, 'r' recessed (lit bottom-right). Flat and recessed parts
// cast no shadow at res 2 (nc: true stops any part casting one).
// Decals (X: a crisp 1 px polyline or point after the shapes): c a colour, or 'dk'/'lt' (darken/lighten what's
// under it), 'dk2' (darker still); only where something is drawn unless all is set.
// Stamps (T: a little pixel picture, not turned with the unit, centred on its point): rows of chars, a colour map.
function rtsUR(x0, y0, x1, y1, m, sh, c) { return { t: 'r', x0, y0, x1, y1, m, sh: sh || 'b', c: c || 0, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, R: Math.hypot(x1 - x0, y1 - y0) / 2 }; }
function rtsUE(x, y, rx, ry, m, sh) { return { t: 'e', x, y, rx, ry, m, sh: sh || 'b', cx: x, cy: y, R: Math.max(rx, ry) }; }
function rtsUL(x0, y0, x1, y1, w, m, sh) { return { t: 'l', x0, y0, x1, y1, w, m, sh: sh || 'b', cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, R: Math.hypot(x1 - x0, y1 - y0) / 2 + w / 2 }; }
function rtsUP(pts, m, sh) {
  let cx = 0, cy = 0;
  for (const [x, y] of pts) { cx += x; cy += y; }
  cx /= pts.length; cy /= pts.length;
  let R = 0;
  for (const [x, y] of pts) R = Math.max(R, Math.hypot(x - cx, y - cy));
  return { t: 'p', pts, m, sh: sh || 'b', cx, cy, R };
}
function rtsUF(fn, m, sh, cx = 0, cy = 0, R = 4) { return { t: 'f', fn, m, sh: sh || 'b', cx, cy, R }; }
function rtsUX(pts, c, all) { return { t: 'x', pts, c, all: !!all }; }
function rtsUDot(x, y, c, all) { return { t: 'x', pts: [[x, y]], c, all: !!all }; }
function rtsUT(x, y, rows, map) { return { t: 'st', x, y, rows, map }; }
// no shadow cast by this part
function rtsUNC(p) { if (p) p.nc = true; return p; }
function rtsUIn(p, x, y) {
  switch (p.t) {
    case 'r': {
      if (x < p.x0 || x >= p.x1 || y < p.y0 || y >= p.y1) return false;
      if (!p.c) return true;
      return Math.min(x - p.x0, p.x1 - x) + Math.min(y - p.y0, p.y1 - y) >= p.c;
    }
    case 'e': { const dx = (x - p.x) / p.rx, dy = (y - p.y) / p.ry; return dx * dx + dy * dy <= 1; }
    case 'l': {
      const vx = p.x1 - p.x0, vy = p.y1 - p.y0, L2 = vx * vx + vy * vy || 1e-9;
      const t = Math.max(0, Math.min(1, ((x - p.x0) * vx + (y - p.y0) * vy) / L2));
      const dx = x - p.x0 - vx * t, dy = y - p.y0 - vy * t;
      return dx * dx + dy * dy <= p.w * p.w / 4;
    }
    case 'p': {
      let inside = false;
      const q = p.pts;
      for (let i = 0, j = q.length - 1; i < q.length; j = i++) {
        if ((q[i][1] > y) !== (q[j][1] > y) && x < (q[j][0] - q[i][0]) * (y - q[i][1]) / (q[j][1] - q[i][1]) + q[i][0]) inside = !inside;
      }
      return inside;
    }
    case 'f': return p.fn(x, y);
  }
  return false;
}
function rtsUMat(m, s, lx, ly, o) {
  if (typeof m === 'function') return m(s, lx, ly, o.f, o.pal, o.pk || 1, o.res || 1);
  if (m === 'H') return o.pal[s];
  if (m === 'HL') return [rtsUTint(o.pal[0], 0.35), o.pal[0], o.pal[1]][s];
  if (m === 'HD') return [o.pal[1], o.pal[2], rtsUTint(o.pal[2], -0.45)][s];
  if (Array.isArray(m)) return m[s] || m[m.length - 1];
  return m;
}
// parts -> pixel buffer. o: { w, h, cx, cy, k (pixels a unit), ang (radians clockwise from up), f (frame), pal,
// res (1|2: the pattern density), cast (1 px shadows of raised parts, default at res 2), outline (default true),
// shadow: [dx, dy] | null, recolour: fn(hex, lx, ly) (wrecks), into: buffer to draw over }
function rtsURaster(parts, o) {
  const W = o.w, H = o.h, n = W * H, k = o.k || 1, res = o.res || 1;
  const ca = Math.cos(o.ang || 0), sa = Math.sin(o.ang || 0);
  // on a diagonal, stripes run along the pixel diagonals
  o.pk = Math.abs(Math.abs(ca) - Math.abs(sa)) < 0.01 ? Math.SQRT2 : 1;
  const LX = new Float32Array(n), LY = new Float32Array(n), col = new Array(n).fill(null);
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const wx = i + 0.5 - o.cx + 0.0123, wy = j + 0.5 - o.cy + 0.0071, q = j * W + i;
    LX[q] = (ca * wx + sa * wy) / k; LY[q] = (-sa * wx + ca * wy) / k;
  }
  const toPx = (x, y) => [Math.floor(o.cx + (ca * x - sa * y) * k - 0.0123), Math.floor(o.cy + (sa * x + ca * y) * k - 0.0071)];
  const stamp = new Int32Array(n).fill(-1), layer = new Int32Array(n).fill(-1), casts = new Uint8Array(n);
  const later = [], soft = o.soft !== undefined ? o.soft : res > 1;
  for (let idx = 0; idx < parts.length; idx++) {
    const p = parts[idx];
    if (!p) continue;
    if (p.t === 'x' || p.t === 'st') { later.push(p); continue; }
    // only the pixels round the part
    const pcx = o.cx + (ca * p.cx - sa * p.cy) * k, pcy = o.cy + (sa * p.cx + ca * p.cy) * k, pr = (p.R + 1) * k + 1;
    const i0 = Math.max(0, Math.floor(pcx - pr)), i1 = Math.min(W - 1, Math.ceil(pcx + pr));
    const j0 = Math.max(0, Math.floor(pcy - pr)), j1 = Math.min(H - 1, Math.ceil(pcy + pr));
    let any = false;
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { const q = j * W + i; if (rtsUIn(p, LX[q], LY[q])) { stamp[q] = idx; any = true; } }
    if (!any) continue;
    const cast = !(p.nc || p.sh === 'f' || p.sh === 'r');
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const q = j * W + i;
      if (stamp[q] !== idx) continue;
      let s = 1, half = 0;
      if (p.sh !== 'f') {
        let nx = 0, ny = 0, edge = false;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;
          const x = i + dx, y = j + dy;
          if (x < 0 || y < 0 || x >= W || y >= H || stamp[y * W + x] !== idx) { nx += dx; ny += dy; edge = true; }
        }
        const d = nx + ny;
        if (edge && d !== 0) s = d < 0 ? 0 : 2;
        // at res 2 a second, softer ring inside the rim on the bigger parts (half tones)
        else if (soft && !edge && p.R * k >= 4.5 && p.sh !== 'r') {
          let mx = 0, my = 0;
          for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
            if (Math.max(Math.abs(dx), Math.abs(dy)) < 2) continue;
            const x = i + dx, y = j + dy;
            if (x < 0 || y < 0 || x >= W || y >= H || stamp[y * W + x] !== idx) { mx += dx; my += dy; }
          }
          if (mx + my < -1) half = -1; else if (mx + my > 1) half = 1;
        }
        if (p.sh === 'r') s = 2 - s;
        else if (p.sh === 'd' && (!edge || d === 0)) {
          const t = ((i + 0.5 - pcx) + (j + 0.5 - pcy)) / (p.R * k * 1.41);
          if (soft) { s = t < -0.42 ? 0 : t > 0.5 ? 2 : 1; half = s === 1 ? (t < -0.15 ? -1 : t > 0.25 ? 1 : 0) : 0; }
          else s = t < -0.3 ? 0 : t > 0.45 ? 2 : 1;
        }
      }
      let c = rtsUMat(p.m, s, LX[q], LY[q], o);
      if (c && half) { const c2 = rtsUMat(p.m, half < 0 ? 0 : 2, LX[q], LY[q], o); if (c2) c = rtsUMix(c, c2, 0.5); }
      if (c) { col[q] = c; layer[q] = idx; casts[q] = cast ? 1 : 0; }
    }
  }
  // the raised parts' 1 px shadows on what's under them (light from the top-left)
  if (o.cast !== undefined ? o.cast : res > 1) {
    const sh = [];
    for (let j = 1; j < H; j++) for (let i = 1; i < W; i++) {
      const q = j * W + i;
      if (!col[q]) continue;
      const L = layer[q];
      for (const nb of [q - 1, q - W, q - W - 1]) if (casts[nb] && layer[nb] > L) { sh.push(q); break; }
    }
    for (const q of sh) col[q] = rtsUTint(col[q], -0.3);
  }
  // the decals and stamps
  for (const p of later) {
    if (p.t === 'st') {
      const [px, py] = toPx(p.x, p.y), hh = p.rows.length, ww = p.rows[0].length;
      for (let j = 0; j < hh; j++) for (let i = 0; i < ww; i++) {
        const ch = p.rows[j][i], x = px - (ww >> 1) + i, y = py - (hh >> 1) + j;
        if (ch === '.' || x < 0 || y < 0 || x >= W || y >= H) continue;
        const c = p.map[ch];
        if (c) col[y * W + x] = c;
      }
      continue;
    }
    const plot = (x, y) => {
      if (x < 0 || y < 0 || x >= W || y >= H) return;
      const q = y * W + x;
      if (!col[q] && !p.all) return;
      let c = p.c;
      if (c === 'H0' || c === 'H1' || c === 'H2') c = o.pal[+c[1]];
      else if (c === 'dk' || c === 'lt' || c === 'dk2') { if (!col[q]) return; c = rtsUTint(col[q], c === 'dk' ? -0.32 : c === 'dk2' ? -0.55 : 0.3); }
      col[q] = c;
    };
    const P = p.pts.map(([x, y]) => toPx(x, y));
    if (P.length === 1) { plot(P[0][0], P[0][1]); continue; }
    for (let s = 0; s + 1 < P.length; s++) {
      let [x0, y0] = P[s];
      const [x1, y1] = P[s + 1], dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
      let err = dx + dy;
      for (let guard = 0; guard < 400; guard++) {
        if (s === 0 || guard > 0) plot(x0, y0);
        if (x0 === x1 && y0 === y1) break;
        const e2 = 2 * err;
        if (e2 >= dy) { err += dy; x0 += sx; }
        if (e2 <= dx) { err += dx; y0 += sy; }
      }
    }
  }
  if (o.recolour) for (let q = 0; q < n; q++) if (col[q]) col[q] = o.recolour(col[q], LX[q], LY[q], q % W, (q / W) | 0);
  const b = o.into || rtsUBuf(W, H);
  // the soft shadow first (under), then the outline and the colours
  const sil = new Uint8Array(n);
  for (let q = 0; q < n; q++) if (col[q]) sil[q] = 1;
  if (o.outline !== false) {
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
      const q = j * W + i;
      if (col[q]) continue;
      if ((i > 0 && col[q - 1]) || (i < W - 1 && col[q + 1]) || (j > 0 && col[q - W]) || (j < H - 1 && col[q + W])) sil[q] = 2;
    }
  }
  if (o.shadow) {
    const [sx, sy] = o.shadow, sh = new Uint8Array(n);
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
      const x = i - sx, y = j - sy;
      if (x >= 0 && y >= 0 && x < W && y < H && sil[y * W + x]) sh[j * W + i] = 1;
    }
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
      const q = j * W + i;
      if (!sh[q] || sil[q]) continue;
      const rim = !(i > 0 && sh[q - 1]) || !(i < W - 1 && sh[q + 1]) || !(j > 0 && sh[q - W]) || !(j < H - 1 && sh[q + W]);
      rtsUPut(b, i, j, '#000000', rim ? 44 : 88);
    }
  }
  for (let q = 0; q < n; q++) {
    const i = q % W, j = (q - i) / W;
    if (col[q]) rtsUPut(b, i, j, col[q]);
    else if (sil[q] === 2) rtsUPut(b, i, j, o.olc || RTS_U_C.ol);
  }
  return b;
}

// ------------------------------------------------------------------ materials with patterns
const rtsUMod = (v, m) => ((v % m) + m) % m;
// treads: links that run back as the vehicle goes forward (4 frames); at res 2 each link has a lit edge, a
// plate and a gap (on a diagonal the pattern is stretched to whole pixel steps: q)
const rtsUQ = pk => pk > 1.2 ? Math.SQRT1_2 : 1;
function rtsUTread(s, lx, ly, f, pal, pk = 1, res = 1) {
  if (res > 1) {
    const ph = rtsUMod(ly * rtsUQ(pk) + (f & 3) * 0.5, 2);
    if (s === 0) return ph < 0.5 ? '#B0B0B0' : '#8C8C8C';
    if (s === 2) return ph < 1.5 ? '#2C2C2C' : '#141414';
    return ph < 0.5 ? '#7C7C7C' : ph < 1.5 ? '#4C4C4C' : '#1C1C1C';
  }
  const b = rtsUMod(Math.floor(ly * pk / 2 + (f & 3) / 2), 2);
  if (s === 0) return '#848484';
  if (s === 2) return '#181818';
  return b ? '#242424' : '#505050';
}
function rtsUTyre(s, lx, ly, f, pal, pk = 1, res = 1) {
  if (res > 1) {
    const ph = rtsUMod(ly * 2 * rtsUQ(pk) + (f & 3) * 0.75, 3);
    if (s === 0) return ph < 1 ? '#8C8C8C' : '#686868';
    if (s === 2) return '#141414';
    return ph < 1 ? '#4C4C4C' : ph < 2 ? '#303030' : '#1C1C1C';
  }
  const b = rtsUMod(Math.floor(ly * pk + (f & 1)), 2);
  if (s === 0) return '#6C6C6C';
  if (s === 2) return '#141414';
  return b ? '#282828' : '#444444';
}
// an engine grille / vents (slats across)
function rtsUGrille(s, lx, ly, f, pal, pk = 1, res = 1) {
  if (s === 0) return '#9C9C9C';
  if (s === 2) return '#202020';
  if (res > 1) return rtsUMod(ly * 2 * rtsUQ(pk), 2) < 1 ? '#7C7C7C' : '#282828';
  return rtsUMod(Math.floor(ly * pk), 2) ? '#242424' : '#686868';
}
// a mesh / louvre (cooling fans)
function rtsUMesh(s, lx, ly, f, pal, pk = 1, res = 1) {
  if (s === 0) return '#9C9C9C';
  if (s === 2) return '#202020';
  const q = res * rtsUQ(pk), a = rtsUMod(Math.floor(lx * q), 2), b = rtsUMod(Math.floor(ly * q), 2);
  return a && b ? '#202020' : a || b ? '#484848' : '#707070';
}
// hazard stripes (crane, clamps)
function rtsUHazard(s, lx, ly, f, pal, pk = 1, res = 1) {
  const b = rtsUMod(Math.floor((lx + ly) * pk * (res > 1 ? 1.4 : 1)), 3);
  if (s === 2) return b === 0 ? '#202020' : '#A87400';
  return b === 0 ? '#303030' : s === 0 ? '#FCE4A0' : '#F8B800';
}

// ------------------------------------------------------------------ the vehicles (front up, a unit a res 1 pixel)
const RTS_U_DIRS = [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];
const RTS_U_INF = ['soldier', 'trooper', 'nomad', 'saboteur', 'praetorian'];
// the units with a separate turret (rtsTurretArt)
const RTS_U_TURRETED = ['tank', 'siege', 'missile', 'sonic', 'juggernaut', 'converter'];
const RTS_U_LAMP = '#FCFCB0', RTS_U_TAIL = '#F83818', RTS_U_GUNL = ['#D0D0D0', '#8C8C8C', '#4C4C4C'], RTS_U_GAS = ['#F0FCE0', '#B8F068', '#4C9800'];

// two treads either side, x in [a, b] (mirrored), y in [y0, y1]; at res 2 with the guide line down the inside
function rtsUTreads(a, b, y0, y1, c = 1.5, hd = false) {
  const out = [rtsUR(-b, y0, -a, y1, rtsUTread, 'b', c), rtsUR(a, y0, b, y1, rtsUTread, 'b', c)];
  if (hd) for (const sx of [-1, 1]) out.push(rtsUX([[sx * (a + 0.6), y0 + c * 0.7], [sx * (a + 0.6), y1 - c * 0.7]], 'dk'));
  return out;
}
// mudguards over the tread ends (res 2)
function rtsUGuards(a, b, y0, y1, m = 'HD') {
  return [rtsUR(-b - 0.2, y0, -a + 0.3, y0 + 1.1, m, 'b', 0.4), rtsUR(a - 0.3, y0, b + 0.2, y0 + 1.1, m, 'b', 0.4),
    rtsUR(-b - 0.2, y1 - 1, -a + 0.3, y1, m, 'b', 0.4), rtsUR(a - 0.3, y1 - 1, b + 0.2, y1, m, 'b', 0.4)];
}
// a row of rivets (lit dots with a dark one below each at res 2)
function rtsURivets(pts) { return pts.flatMap(([x, y]) => [rtsUDot(x + 0.5, y + 0.5, 'dk'), rtsUDot(x, y, 'lt')]); }
// an exhaust stack seen from above: a metal ring with a sooty hole
function rtsUExhaust(x, y, r = 0.8) { return [rtsUE(x, y, r, r, RTS_U_C.met, 'd'), rtsUDot(x, y, '#181818')]; }
// a hatch: a dome with a dark rim line and a handle
function rtsUHatch(x, y, r, m) { return [rtsUE(x, y, r, r, m || RTS_U_C.ste, 'd'), rtsUDot(x + r * 0.2, y + r * 0.2, 'dk'), rtsUDot(x - r * 0.35, y - r * 0.35, 'lt')]; }
// an antenna whipping back from (x, y), with a lit tip
function rtsUAntenna(x, y, len) { return [rtsUX([[x, y], [x + 0.2, y + len]], '#383838', true), rtsUDot(x + 0.2, y + len, '#BCBCBC', true)]; }
// a turret's barrel with its recoil and the flash at the muzzle; at res 2 a fume extractor and a slotted brake
function rtsUBarrel(x, y0, y1, w, firing, m = RTS_U_C.gun, hd = false) {
  const rc = firing ? 1 : 0, out = [rtsUL(x, y0 + rc, x, y1 + rc, w, m)];
  if (hd) {
    out.push(rtsUL(x, y0 + (y1 - y0) * 0.45 + rc, x, y0 + (y1 - y0) * 0.6 + rc, w + 0.7, m));   // the fume extractor
    out.push(rtsUR(x - w / 2 - 0.5, y1 + rc - 0.4, x + w / 2 + 0.5, y1 + rc + 1.3, RTS_U_C.drk, 'b', 0.3));   // muzzle brake
    out.push(rtsUX([[x - w / 2 - 0.4, y1 + rc + 0.4], [x + w / 2 + 0.4, y1 + rc + 0.4]], '#101010'));
    out.push(rtsUDot(x, y1 + rc - 0.3, '#101010'));
  } else out.push(rtsUR(x - w / 2 - 0.5, y1 + rc - 0.2, x + w / 2 + 0.5, y1 + rc + 1.2, RTS_U_C.drk));   // muzzle brake
  if (firing) {
    if (hd) {
      // a star of flame at the muzzle, kept inside the canvas
      const tp = y1 + rc, top = Math.max(-7.95, tp - 2.6);
      out.push(rtsUP([[x, top], [x + 0.7, tp - 1.2], [x + 2.5, tp - 0.9], [x + 0.8, tp - 0.4], [x, tp + 0.2], [x - 0.8, tp - 0.4], [x - 2.5, tp - 0.9], [x - 0.7, tp - 1.2]], RTS_U_C.fire[3], 'f'));
      out.push(rtsUE(x, tp - 1, 1.3, Math.min(1.1, tp - 1 + 7.95), RTS_U_C.fire[2], 'f'), rtsUE(x, tp - 0.9, 0.6, 0.55, RTS_U_C.fire[0], 'f'));
    } else out.push(rtsUE(x, y1 - 1, 1.6, 1.6, RTS_U_C.fire[2], 'f'), rtsUE(x, y1 - 1, 0.9, 0.9, RTS_U_C.fire[0], 'f'));
  }
  return out;
}
// the House emblems (stamps, res 2): AQUILA an eagle, DRAKON a horned skull, SERPENS a coiled serpent, the REGENT
// a crown, the NOMADS a sun
const RTS_U_EMBLEM = {
  aquila: ['a...a', 'aa.aa', '.aaa.', '..a..'],
  drakon: ['a...a', '.aaa.', '.b.b.', '..a..'],
  serpens: ['.aaa.', 'a....', '.aaa.', '....a', 'aaa..'],
  regent: ['a.a.a', 'aaaaa', 'aaaaa'],
  nomad: ['..a..', '.aaa.', 'aaaaa', '.aaa.', '..a..'],
};
function rtsUEmblem(x, y, house, pal, plate = true) {
  const rows = RTS_U_EMBLEM[house] || RTS_U_EMBLEM.aquila, w = rows[0].length + 2, h = rows.length + 2;
  const out = [];
  if (plate) out.push(rtsUT(x, y, Array.from({ length: h }, () => 'p'.repeat(w)), { p: rtsUTint(pal[2], -0.35) }));
  out.push(rtsUT(x, y, rows, { a: rtsUTint(pal[0], 0.3), b: '#101010' }));
  return out;
}

const RTS_U_MODEL = {
  // ---- light vehicles
  trike: {
    size: 16, icon: { k: 1.9 },
    body: (f, hd) => {
      const C = RTS_U_C, out = [
        rtsUR(-5, 1, -3, 5.5, rtsUTyre, 'b', 0.6), rtsUR(3, 1, 5, 5.5, rtsUTyre, 'b', 0.6),
        rtsUR(-3, 2.5, 3, 4, C.drk),
        rtsUR(-1, -7, 1, -3.5, rtsUTyre, 'b', 0.5),
      ];
      if (!hd) {
        out.push(
          rtsUP([[-1, -5], [1, -5], [2.5, -1.5], [2.5, 3.5], [-2.5, 3.5], [-2.5, -1.5]], 'H'),
          rtsUR(-1.5, 3, 1.5, 6, rtsUGrille),
          rtsUR(-2, -2, 2, 0, C.ste, 'b', 0.5),
          rtsUE(-0.5, 1, 1.5, 1.5, C.drk, 'd'), rtsUL(1.5, -1, 1.5, -6.5, 1, C.gun), rtsUDot(0, -4.5, RTS_U_LAMP),
        );
        return out;
      }
      out.push(
        rtsUL(-1.2, -4.8, -1.2, -3, 0.6, C.met), rtsUL(1.2, -4.8, 1.2, -3, 0.6, C.met),   // the fork
        rtsUP([[-1, -5], [1, -5], [2.5, -1.5], [2.5, 3.5], [-2.5, 3.5], [-2.5, -1.5]], 'H'),
        rtsUR(-1.5, 3, 1.5, 6, rtsUGrille),
        ...rtsUExhaust(-2.1, 5.6, 0.6), ...rtsUExhaust(2.1, 5.6, 0.6),
        rtsUX([[-1.6, -3.4], [-2.2, -1.6], [-2.2, 3]], 'lt'), rtsUX([[-1.8, 2.4], [1.8, 2.4]], 'dk'),
        rtsUDot(-0.5, -4.6, RTS_U_LAMP), rtsUDot(0.5, -4.6, RTS_U_LAMP), rtsUDot(0, -4.1, 'dk'),
        rtsUDot(-2.1, 3.1, RTS_U_TAIL), rtsUDot(2.1, 3.1, RTS_U_TAIL),
        // the handlebars, the rider's arms reaching for them, a helmet with a dark visor
        rtsUR(-1.2, -2.8, 1.2, -1.6, C.drk, 'b', 0.3),
        rtsUX([[-2.4, -2.7], [2.4, -2.7]], '#383838'), rtsUDot(-2.4, -2.7, '#101010'), rtsUDot(2.4, -2.7, '#101010'),
        rtsUL(-1.3, 0.6, -2.1, -2.3, 0.7, 'HD'), rtsUL(1.3, 0.6, 2.1, -2.3, 0.7, 'HD'),
        rtsUE(0, 1.3, 1.8, 1.1, 'HD', 'd'), rtsUE(0, 0.7, 1.15, 1.2, C.ste, 'd'), rtsUX([[-0.6, -0.2], [0.6, -0.2]], '#182030'),
        // a machine gun on the right, its ammunition box
        rtsUR(1.4, -0.4, 3, 1.4, C.drk, 'b', 0.3), rtsUDot(2.2, 0.5, C.yel[1]),
        rtsUL(2.3, 0, 2.3, -6.8, 0.8, RTS_U_GUNL), rtsUDot(2.3, -6.7, '#101010'),
      );
      return out;
    },
  },
  raider: {
    size: 16, icon: { k: 1.9 },
    body: (f, hd) => {
      const C = RTS_U_C, out = [
        rtsUR(-4.5, 2, -3, 5.5, rtsUTyre, 'b', 0.5), rtsUR(3, 2, 4.5, 5.5, rtsUTyre, 'b', 0.5),
        rtsUR(-1, -7.5, 1, -5, rtsUTyre, 'b', 0.5),
        rtsUR(-3, 3, 3, 4.5, C.drk),
        rtsUP([[0, -7], [1.5, -5.5], [2.5, 0], [2, 4], [-2, 4], [-2.5, 0], [-1.5, -5.5]], 'HL'),
        rtsUP([[0, -5], [1, -3], [-1, -3]], C.gls),
        rtsUR(-3.5, 4.5, 3.5, 6, 'HD', 'b', 0.5),
      ];
      if (hd) {
        out.push(
          // racing stripes, the canopy glint and frame, the engine cover
          rtsUX([[-0.6, -4.6], [-0.9, -1], [-0.9, 3.4]], 'H2'), rtsUX([[0.6, -4.6], [0.9, -1], [0.9, 3.4]], 'H2'),
          rtsUDot(-0.3, -4.2, '#FCFCFC'),
          rtsUE(0, 0.3, 1.3, 1.6, C.drk, 'd'), rtsUE(0, -0.1, 0.9, 1, 'H', 'd'), rtsUX([[-0.5, -0.9], [0.5, -0.9]], '#182030'),
          rtsUR(-1.4, 2, 1.4, 3.8, rtsUGrille, 'b', 0.3),
          rtsUDot(-1, -6, RTS_U_LAMP), rtsUDot(1, -6, RTS_U_LAMP),
          rtsUDot(-3.2, 5.2, RTS_U_TAIL), rtsUDot(3.2, 5.2, RTS_U_TAIL),
          rtsUX([[-3.4, 4.5], [-3.4, 6]], '#101010'), rtsUX([[3.4, 4.5], [3.4, 6]], '#101010'),
          rtsUL(-2.5, -1, -2.5, -4.8, 0.8, C.gun), rtsUL(2.5, -1, 2.5, -4.8, 0.8, C.gun),
          rtsUDot(-2.5, -4.7, '#101010'), rtsUDot(2.5, -4.7, '#101010'),
        );
      } else out.push(rtsUE(0, 0, 1.3, 1.5, C.drk, 'd'), rtsUL(-2.5, -1, -2.5, -4.5, 1, C.gun), rtsUL(2.5, -1, 2.5, -4.5, 1, C.gun));
      return out;
    },
  },
  quad: {
    size: 16, icon: { k: 1.8 },
    body: (f, hd) => {
      const C = RTS_U_C, out = [
        rtsUR(-5.5, -6, -3, -2, rtsUTyre, 'b', 0.6), rtsUR(3, -6, 5.5, -2, rtsUTyre, 'b', 0.6),
        rtsUR(-5.5, 2, -3, 6, rtsUTyre, 'b', 0.6), rtsUR(3, 2, 5.5, 6, rtsUTyre, 'b', 0.6),
        rtsUR(-3.5, -3.5, 3.5, -2.5, C.drk), rtsUR(-3.5, 3.5, 3.5, 4.5, C.drk),
        rtsUR(-3, -5, 3, 6, 'H', 'b', 1),
      ];
      if (!hd) {
        out.push(rtsUR(-2, 2, 2, 5, rtsUGrille), rtsUR(-2, -2, 2, 1.5, C.ste, 'b', 0.5),
          rtsUE(0, -0.5, 1.3, 1.3, C.drk, 'd'), rtsUL(-1.5, -3, -1.5, -7.5, 1, C.gun), rtsUL(1.5, -3, 1.5, -7.5, 1, C.gun));
        return out;
      }
      out.push(
        rtsUR(-1.8, 2.6, 1.8, 5.2, rtsUGrille, 'b', 0.3),
        rtsUX([[-2.6, -3.2], [2.6, -3.2]], 'dk'), rtsUX([[-2.4, -4.4], [-2.4, 5]], 'lt'),
        ...rtsURivets([[-2.4, 2.2], [2.4, 2.2], [-2.4, 5.2], [2.4, 5.2]]),
        rtsUDot(-2.2, -4.6, RTS_U_LAMP), rtsUDot(2.2, -4.6, RTS_U_LAMP), rtsUDot(-1.5, -4.6, RTS_U_LAMP), rtsUDot(1.5, -4.6, RTS_U_LAMP),
        rtsUDot(-2.6, 5.6, RTS_U_TAIL), rtsUDot(2.6, 5.6, RTS_U_TAIL),
        // the open cockpit: the driver in a helmet, a roll bar behind him
        rtsUR(-1.9, -2.2, 1.9, 1.6, C.drk, 'r', 0.6),
        rtsUE(0, 0, 1.5, 1.1, 'HD', 'd'), rtsUE(0, -0.5, 1, 1, C.ste, 'd'), rtsUX([[-0.5, -1.3], [0.5, -1.3]], '#182030'),
        rtsUX([[-2.4, 1.7], [2.4, 1.7]], '#585858'),
        ...rtsUAntenna(2.4, 2.6, 3.6),
        // twin guns on a mount in front
        rtsUR(-2.3, -3.8, 2.3, -2.4, C.drk, 'b', 0.3),
        rtsUL(-1.5, -3, -1.5, -7.5, 0.9, RTS_U_GUNL), rtsUL(1.5, -3, 1.5, -7.5, 0.9, RTS_U_GUNL),
        rtsUDot(-1.5, -7.4, '#101010'), rtsUDot(1.5, -7.4, '#101010'),
      );
      return out;
    },
  },
  // ---- heavy vehicles (bodies; their turrets below)
  tank: {
    size: 16, icon: { k: 1.6 },
    body: (f, hd) => {
      const out = [
        ...rtsUTreads(2.5, 5.5, -6, 6.5, 1.5, hd),
        rtsUR(-3, -5, 3, 6, 'H', 'b', 1),
        rtsUR(-2, -5, 2, -3.5, 'HL', 'b', 0.5),
        rtsUR(-2, 3.5, 2, 5.5, rtsUGrille),
      ];
      if (hd) out.push(
        ...rtsUGuards(2.5, 5.5, -6.2, 6.6),
        rtsUX([[-2.5, 3], [2.5, 3]], 'dk'), rtsUX([[-2.5, -3.2], [-2.5, 2.6]], 'lt'),
        ...rtsURivets([[-1.5, -4.6], [0, -4.6], [1.5, -4.6], [-2.5, 2.4], [2.5, 2.4]]),
        rtsUDot(-1.6, -5.3, RTS_U_LAMP), rtsUDot(1.6, -5.3, RTS_U_LAMP),
        ...rtsUExhaust(-2.2, 5.9, 0.6), ...rtsUExhaust(2.2, 5.9, 0.6),
        rtsUR(-2.9, -2.5, -2.1, 1.5, RTS_U_C.ste, 'b', 0.2), rtsUR(2.1, -2.5, 2.9, 1.5, RTS_U_C.ste, 'b', 0.2),
      );
      return out;
    },
    turret: (fire, hd) => {
      const C = RTS_U_C, out = [rtsUR(-2.5, -1.5, 2.5, 3.5, 'HL', 'b', 1.3)];
      if (hd) {
        out.push(
          rtsUR(-2.1, 3.2, 2.1, 4.3, rtsUMesh, 'b', 0.3),   // the stowage basket
          rtsUR(2.3, -0.6, 3.1, 2.6, 'HD', 'b', 0.2),
          rtsUR(-1.3, -2.6, 1.3, -1, C.gun, 'b', 0.3),   // the mantlet
          // the commander's cupola, periscopes, a whip antenna
          rtsUE(-0.9, 1.3, 1.25, 1.25, 'HD', 'd'), rtsUE(-0.9, 1.3, 0.7, 0.7, 'HL', 'd'), rtsUDot(-1.2, 1, 'lt'),
          rtsUDot(0.9, 0.2, '#182030'), rtsUDot(1.4, 0.2, '#182030'), rtsUDot(1.15, 2.5, 'dk'),
          ...rtsUAntenna(1.6, 2.8, 3.6),
        );
      } else out.push(rtsUE(-0.8, 1.6, 0.9, 0.9, C.drk, 'r'));
      out.push(...rtsUBarrel(0, -1.5, -7, hd ? 1.3 : 1.5, fire, C.gun, hd));
      return out;
    },
  },
  missile: {
    size: 16, icon: { k: 1.6 },
    body: (f, hd) => {
      const out = [
        ...rtsUTreads(3, 5.5, -6.5, 6.5, 1.5, hd),
        rtsUR(-3, -6.5, 3, 6, 'H', 'b', 1),
        rtsUR(-2.5, -6, 2.5, -4, RTS_U_C.gls, 'b', 0.6),
        rtsUR(-2, 3.5, 2, 5.5, rtsUGrille),
      ];
      if (hd) out.push(
        ...rtsUGuards(3, 5.5, -6.6, 6.6),
        rtsUX([[0, -5.8], [0, -4.2]], '#103050'), rtsUDot(-1.8, -5.6, '#FCFCFC'), rtsUX([[-2.4, -3.7], [2.4, -3.7]], 'dk'),
        rtsUX([[-2.5, 3], [2.5, 3]], 'dk'),
        ...rtsURivets([[-2.4, -3], [2.4, -3], [-2.4, 2.4], [2.4, 2.4]]),
        ...rtsUExhaust(-2.2, 5.9, 0.6), ...rtsUExhaust(2.2, 5.9, 0.6),
        ...rtsUAntenna(-2.4, 2.2, 3.6),
      );
      return out;
    },
    turret: (fire, hd) => {
      // a twin rocket pod on a pivot; firing, the rockets are gone in a puff
      const C = RTS_U_C, out = [rtsUE(0, 1.5, 2.5, 2.5, C.ste, 'd'), rtsUR(-3.5, -2, 3.5, 3.5, 'HL', 'b', 1)];
      for (const x of [-1.5, 1.5]) {
        out.push(rtsUR(x - 1, -5, x + 1, 2, C.gun, 'b'));
        if (hd) {
          out.push(rtsUR(x - 1, -5, x + 1, -3.5, '#202020', 'f'));
          if (!fire) out.push(rtsUDot(x - 0.4, -4.6, C.red[1]), rtsUDot(x + 0.4, -4.6, C.red[1]), rtsUDot(x - 0.4, -4, C.red[2]), rtsUDot(x + 0.4, -4, C.red[2]));
          out.push(rtsUX([[x - 0.9, -2.5], [x + 0.9, -2.5]], 'dk'), rtsUX([[x - 0.9, 0], [x + 0.9, 0]], 'dk'), rtsUDot(x - 0.5, -1.2, C.yel[1]));
        } else out.push(rtsUR(x - 1, -5, x + 1, -4, fire ? '#202020' : C.red[1], 'f'));
      }
      if (hd) out.push(rtsUX([[-2.8, 2.6], [2.8, 2.6]], 'dk'), ...rtsURivets([[-2.8, -1.3], [2.8, -1.3]]));
      if (fire) out.push(rtsUE(0, -6, 3, 1.6, C.smoke[0], 'f'), rtsUE(0, -5.5, 1.5, 0.9, C.fire[1], 'f'));
      if (fire && hd) out.push(rtsUE(-2, -7, 1.4, 1, C.smoke[1], 'f'), rtsUE(2.2, -6.8, 1.2, 0.9, C.smoke[1], 'f'), rtsUE(0, -5.6, 0.7, 0.5, '#FFFFFF', 'f'));
      return out;
    },
  },
  siege: {
    size: 16, icon: { k: 1.6 },
    body: (f, hd) => {
      const out = [
        ...rtsUTreads(3, 6.5, -6.5, 6.5, 2.2, hd),
        rtsUR(-3.5, -6, 3.5, 6.5, 'H', 'b', 1),
        rtsUR(-3, -6, 3, -4.5, RTS_U_C.ste, 'b', 0.8),
        rtsUR(-2, 4, 2, 6, rtsUGrille),
      ];
      if (hd) out.push(
        ...rtsUGuards(3, 6.5, -6.6, 6.6),
        ...rtsURivets([[-2, -5.3], [-0.7, -5.3], [0.7, -5.3], [2, -5.3], [-3, 3.5], [3, 3.5]]),
        rtsUX([[-3, 3.4], [3, 3.4]], 'dk'),
        ...rtsUExhaust(-2.8, 5.9, 0.6), ...rtsUExhaust(2.8, 5.9, 0.6),
        rtsUR(-3.4, -3.8, -2.6, 2.6, RTS_U_C.ste, 'b', 0.2), rtsUR(2.6, -3.8, 3.4, 2.6, 'HD', 'b', 0.2),
      );
      return out;
    },
    turret: (fire, hd) => {
      const C = RTS_U_C, out = [
        rtsUR(-3.5, -2.5, 3.5, 4, 'HL', 'b', 1.5),
      ];
      if (hd) out.push(
        rtsUR(-2.7, -1.2, 2.7, 3.3, 'H', 'b', 0.8),   // the raised roof plate
        rtsUR(-2.2, -0.5, -0.4, 2.6, rtsUMesh, 'r'),
        rtsUE(1.4, 1.4, 1.15, 1.15, 'HD', 'd'), rtsUE(1.4, 1.4, 0.6, 0.6, 'HL', 'd'),
        rtsUR(-3, -3.5, 3, -1.5, C.ste, 'b', 0.5),
        ...rtsURivets([[-2.5, -2.6], [2.5, -2.6], [-3, 3.5], [3, 3.5]]),
        ...rtsUAntenna(-2.8, 3.4, 3.2),
      );
      else out.push(rtsUR(-2.5, 1, -0.5, 3, 'HD', 'r'), rtsUR(-3, -3.5, 3, -1.5, C.ste, 'b', 0.5));
      const bm = hd ? ['#DCDCDC', '#9C9C9C', '#585858'] : C.met;
      out.push(...rtsUBarrel(-2, -2.5, -7, hd ? 1.7 : 2, fire, bm, hd), ...rtsUBarrel(2, -2.5, -7, hd ? 1.7 : 2, fire, bm, hd));
      return out;
    },
  },
  harvester: {
    size: 20, icon: { k: 1.35 },
    body: (f, hd) => {
      const C = RTS_U_C, h = f >= 4, g = f & 3, out = [
        ...rtsUTreads(3.5, 6.5, -5, 7.5, 1.5, hd),
        rtsUR(-4, -5.5, 4, 7.5, C.ste, 'b', 1),
        // the hopper: a House-coloured rim round a heap of glimmer
        rtsUR(-4, -1, 4, 7.5, 'H', 'b', 1),
        rtsUR(-2.5, 0.5, 2.5, 6, (s, lx, ly, ff, pal, pk, res) => {
          if (res > 1) {
            // a heaped mound of glowing grains, lit from the top-left, a few sparkling
            const x = lx / 2.5, y = (ly - 3.25) / 2.75, hgt = 1 - x * x - y * y, n = rtsUHash(Math.floor(lx * 2), Math.floor(ly * 2));
            const l = -(x + y) * 0.6 + hgt * 0.5 + (n - 0.5) * 0.5;
            return n > 0.93 ? '#FCFCFC' : l > 0.55 ? C.glim[0] : l > 0.1 ? C.glim[1] : l > -0.35 ? C.glim[2] : '#802C00';
          }
          const v = rtsUMod(Math.floor(lx * 1.7 + ly * 1.3), 3);
          return v === 0 ? C.glim[0] : s === 2 ? C.glim[1] : C.glim[2];
        }, 'r'),
        // the cab (front left) and the engine (front right)
        rtsUR(-4, -5.5, -0.5, -1.5, 'HL', 'b', 0.5),
        rtsUR(-3.5, -5, -1, -3.5, C.gls, 'b'),
        rtsUR(0.5, -5, 3.5, -1.5, rtsUGrille),
      ];
      if (hd) out.push(
        rtsUX([[-2.25, -4.9], [-2.25, -3.6]], '#103050'), rtsUDot(-3.1, -4.7, '#FCFCFC'),
        rtsUE(-2.2, -2.5, 0.55, 0.55, g & 2 && h ? C.yel[0] : C.yel[1], 'f'), rtsUDot(-2.2, -2.5, g & 2 && h ? '#FCFCFC' : C.yel[0]),   // the beacon
        ...rtsUExhaust(2.7, -1.2, 0.7),
        rtsUX([[-3.6, -0.5], [3.6, -0.5]], 'dk'), rtsUX([[-3.5, 0], [-3.5, 7]], 'lt'),
        ...rtsURivets([[-3.5, 1.5], [-3.5, 4], [-3.5, 6.5], [3.5, 1.5], [3.5, 4], [3.5, 6.5]]),
        rtsUDot(-1, 2, '#FCFCFC'), rtsUDot(1.2, 4.2, '#FCFCFC'), rtsUDot(-0.4, 5, C.glim[0]),
        rtsUX([[-4.4, -1], [-4.4, 4]], '#303030'),
      );
      out.push(
        // the scoop: a wide rake of teeth that turn while it works, on two arms
        hd ? rtsUL(-5, -4.5, -5, -7, 0.9, C.gun) : null, hd ? rtsUL(5, -4.5, 5, -7, 0.9, C.gun) : null,
        rtsUR(-6.5, -8.5, 6.5, -5.5, C.met, 'b', 1.5),
        rtsUR(-5.5, -8.5, 5.5, -7, (s, lx, ly, ff, pal, pk, res) => rtsUMod(Math.floor(lx * (res > 1 ? 1.4 : 1) + (h ? g * (res > 1 ? 0.7 : 1) : 0)), 2) ? '#303030' : s === 0 ? '#FCFCFC' : '#9C9C9C', 'f'),
      );
      if (hd) out.push(rtsUR(-5.8, -6.4, 5.8, -5.6, rtsUHazard, 'f'));
      if (h) {   // sand thrown up in front of the scoop
        const r = rtsURand(31 + g);
        for (let i = 0; i < (hd ? 10 : 6); i++) out.push(rtsUE(-6 + r() * 12, -9.6 + r() * 1.2 - (hd ? r() * 0.8 : 0), hd ? 0.45 : 0.6, hd ? 0.45 : 0.6, r() < 0.5 ? C.glim[1] : C.sand[0], 'f'));
      }
      return out;
    },
  },
  mcv: {
    size: 20, icon: { k: 1.35 },
    body: (f, hd, house, pal) => {
      const C = RTS_U_C, out = [
        ...[-5, 0, 5].flatMap(y => [rtsUR(-6.5, y - 1.7, -4.5, y + 1.7, rtsUTyre, 'b', 0.6), rtsUR(4.5, y - 1.7, 6.5, y + 1.7, rtsUTyre, 'b', 0.6)]),
        rtsUR(-5, -7.5, 5, 7.5, C.drk),
        // the cab
        rtsUR(-4.5, -8, 4.5, -4, C.ste, 'b', 1.2),
        rtsUR(-3.5, -7.5, 3.5, -6, C.gls),
        // the boxy body, House coloured, with a roof hatch and vents
        rtsUR(-5, -3.5, 5, 8, 'H', 'b', 0.8),
        rtsUR(-4, -2.5, 4, 7, 'HL', 'b'),
        rtsUR(-3.5, 4, -0.5, 6.5, rtsUGrille),
        rtsUR(0.5, -2, 3.5, 1, C.ste, 'b'),
      ];
      if (hd) out.push(
        rtsUX([[-1.2, -7.4], [-1.2, -6.1]], '#103050'), rtsUX([[1.2, -7.4], [1.2, -6.1]], '#103050'), rtsUDot(-3, -7.2, '#FCFCFC'), rtsUDot(-0.6, -7.2, '#FCFCFC'),
        rtsUDot(-3.8, -8, RTS_U_LAMP), rtsUDot(3.8, -8, RTS_U_LAMP),
        rtsUE(0, -5, 0.55, 0.55, C.yel[1], 'f'), rtsUDot(0, -5, C.yel[0]),
        rtsUX([[-3.5, 1.5], [3.5, 1.5]], 'dk'), rtsUX([[-3.5, 3.5], [-0.2, 3.5]], 'dk'),
        ...rtsURivets([[-4.5, -3], [4.5, -3], [-4.5, 7.5], [4.5, 7.5], [-4.5, 2.2], [4.5, 2.2]]),
        rtsUX([[-4.5, -2.5], [-4.5, 7]], '#404040'),
        ...rtsUEmblem(-1.9, -0.5, house, pal),
        ...rtsUExhaust(4.4, 7.6, 0.5),
      );
      out.push(
        // the folded crane, across the roof
        rtsUE(2.5, 5, 1.6, 1.6, C.met, 'd'),
        rtsUL(2.5, 5, -2.5, -2, 1.4, rtsUHazard),
        rtsUL(-2.5, -2, -2.5, 0.5, 1, C.drk),
      );
      if (hd) out.push(rtsUDot(2.5, 5, '#303030'), rtsUDot(-2.5, 0.7, C.yel[1]), rtsUX([[2.6, 3.4], [-1.6, -2.4]], 'dk'));
      return out;
    },
  },
  sonic: {
    size: 16, icon: { k: 1.6 },
    body: (f, hd) => {
      const C = RTS_U_C, out = [
        ...rtsUTreads(2.5, 5.5, -6.5, 6.5, 1.5, hd),
        rtsUR(-3, -6, 3, 6.5, 'H', 'b', 1),
        rtsUR(-2, 3, 2, 5.5, (s, lx, ly, ff, pal, pk, res) => (rtsUMod(Math.floor(res > 1 ? ly * res * rtsUQ(pk) : ly) + ff, 2) ? C.cya[1] : C.cya[2]), 'f'),
        rtsUR(-2, -5.5, 2, -4, 'HL', 'b', 0.5),
      ];
      if (hd) out.push(
        ...rtsUGuards(2.5, 5.5, -6.6, 6.6),
        rtsUX([[-2, 2.6], [2, 2.6]], 'dk'), rtsUX([[-2.4, -3.6], [-2.4, 2]], C.cya[2]), rtsUX([[2.4, -3.6], [2.4, 2]], C.cya[2]),
        rtsUDot(-2.4, (f & 3) * 1.4 - 3.2, C.cya[0]), rtsUDot(2.4, (f & 3) * 1.4 - 3.2, C.cya[0]),
        ...rtsURivets([[-1.4, -4.9], [1.4, -4.9]]),
        rtsUDot(-1.6, -5.9, RTS_U_LAMP), rtsUDot(1.6, -5.9, RTS_U_LAMP),
      );
      return out;
    },
    turret: (fire, hd) => {
      const C = RTS_U_C, out = [
        rtsUE(0, 1, 3, 3, C.ste, 'd'),
        // the emitter: a dish of rings with a flaring horn in front
        rtsUF((x, y) => Math.hypot(x, y - 1) <= 3.2, (s, lx, ly, ff, pal, pk, res) => {
          const d = Math.hypot(lx, ly - 1), q = res > 1 ? 2 : 1;
          if (fire) return d < 1.3 ? C.cya[0] : d < 2.3 ? C.cya[1] : C.cya[2];
          return d < 1.2 ? C.cya[1] : Math.floor(d * q) % 2 ? C.met[s === 2 ? 2 : 1] : C.met[s === 0 ? 0 : 2];
        }, 'b', 0, 1, 3.3),
        rtsUP([[-1, -1.5], [1, -1.5], [2.3, -6], [-2.3, -6]], C.met),
        rtsUR(-1.8, -6.2, 1.8, -5, fire ? C.cya[0] : C.cya[2], 'f'),
      ];
      if (hd) {
        out.push(rtsUX([[-1.4, -3], [1.4, -3]], 'dk'), rtsUX([[-1.8, -4.5], [1.8, -4.5]], 'dk'), rtsUX([[-0.9, -1.8], [-1.9, -5.6]], 'lt'));
        out.push(rtsUDot(0, 1, fire ? '#FFFFFF' : C.cya[0]));
        if (fire) out.push(rtsUE(0, -7, 2.6, 1, C.cya[1], 'f'), rtsUE(0, -7.2, 1.4, 0.6, '#FFFFFF', 'f'));
      }
      return out;
    },
  },
  juggernaut: {
    size: 20, icon: { k: 1.2 },
    body: (f, hd) => {
      const C = RTS_U_C, out = [
        ...rtsUTreads(5, 8, -7, 7, 2.2, hd), ...rtsUTreads(3, 5, -6.5, 6.5, 1, hd),
        rtsUR(-5.5, -7.5, 5.5, 7.5, 'HD', 'b', 2),
        rtsUR(-4.5, -7, 4.5, -5, C.ste, 'b', 1),
        rtsUR(-4, 4, 4, 6.5, rtsUGrille),
        rtsUR(-5.5, -4, -3.5, 3, 'H', 'b'), rtsUR(3.5, -4, 5.5, 3, 'H', 'b'),
      ];
      if (hd) out.push(
        // a ram of spikes on the front, armour bolts, twin smoke stacks
        ...[-3.5, -1.2, 1.2, 3.5].map(x => rtsUP([[x - 0.7, -7.2], [x, -8.6], [x + 0.7, -7.2]], C.met)),
        ...rtsURivets([[-3.5, -6.4], [-1.2, -6.4], [1.2, -6.4], [3.5, -6.4], [-4.5, -3.4], [-4.5, 2.4], [4.5, -3.4], [4.5, 2.4], [-4.5, -0.5], [4.5, -0.5]]),
        rtsUX([[-3.2, 3.6], [3.2, 3.6]], 'dk'), rtsUX([[-5, -3.5], [-5, 2.5]], 'lt'),
        ...rtsUExhaust(-3, 7, 0.9), ...rtsUExhaust(3, 7, 0.9),
        rtsUDot(-4.4, -7.4, RTS_U_LAMP), rtsUDot(4.4, -7.4, RTS_U_LAMP),
      );
      return out;
    },
    turret: (fire, hd, house, pal) => {
      const C = RTS_U_C, out = [
        rtsUE(0, 0.5, 4.5, 4.5, 'H', 'd'),
        rtsUE(0, 0.5, 2.3, 2.3, 'HD', 'r'),
      ];
      if (hd) out.push(
        rtsUX([[-4, 0.5], [-2.4, 0.5]], 'dk'), rtsUX([[2.4, 0.5], [4, 0.5]], 'dk'), rtsUX([[0, 2.9], [0, 4.6]], 'dk'),
        ...rtsURivets([[-3, -1.8], [3, -1.8], [-3, 3], [3, 3]]),
        rtsUE(0, 0.5, 1.6, 1.6, C.pla[2], 'f'), rtsUE(0, 0.5, 0.9, 0.9, fire ? '#FFFFFF' : C.pla[1], 'f'),
      );
      for (const x of [-2.5, 2.5]) {
        const rc = fire ? 1 : 0;
        out.push(rtsUL(x, -2 + rc, x, -7 + rc, 2, C.gun), rtsUR(x - 1.5, -5 + rc, x + 1.5, -4 + rc, C.pla[2], 'f'), rtsUR(x - 1, -8 + rc, x + 1, -7 + rc, fire ? C.pla[0] : C.pla[2], 'f'));
        if (hd) out.push(rtsUR(x - 1.3, -3.4 + rc, x + 1.3, -2.6 + rc, C.pla[2], 'f'), rtsUDot(x - 0.6, -4.6 + rc, C.pla[0]), rtsUDot(x - 0.6, -3 + rc, C.pla[1]), rtsUX([[x + 0.6, -5.8 + rc], [x + 0.6, -2 + rc]], 'dk'));
        if (fire) out.push(rtsUE(x, -7.6, 1.4, 1.1, C.pla[1], 'f'), rtsUE(x, -7.6, 0.6, 0.6, '#FFFFFF', 'f'));
        if (fire && hd) out.push(rtsUE(x, -8.6, 2, 1.3, C.pla[2], 'f'), rtsUE(x, -8.3, 1.3, 0.9, C.pla[1], 'f'), rtsUE(x, -8.2, 0.6, 0.5, '#FFFFFF', 'f'));
      }
      if (!hd) out.push(rtsUE(0, 1, 1, 1, C.pla[2], 'f'));
      return out;
    },
  },
  converter: {
    size: 16, icon: { k: 1.6 },
    body: (f, hd) => {
      const C = RTS_U_C, out = [
        ...rtsUTreads(2.5, 5.5, -6.5, 6.5, 1.5, hd),
        rtsUR(-3, -6, 3, 6.5, 'H', 'b', 1),
        // gas tanks on the back deck
        rtsUL(-1.5, 2.5, -1.5, 5.5, 2.2, hd ? RTS_U_GAS : C.grn), rtsUL(1.5, 2.5, 1.5, 5.5, 2.2, hd ? RTS_U_GAS : C.grn),
        rtsUR(-2, -5.5, 2, -4, 'HL', 'b', 0.5),
      ];
      if (hd) out.push(
        ...rtsUGuards(2.5, 5.5, -6.6, 6.6),
        rtsUX([[-2.4, 3.4], [-0.6, 3.4]], '#202020'), rtsUX([[0.6, 3.4], [2.4, 3.4]], '#202020'), rtsUX([[-2.4, 4.8], [-0.6, 4.8]], '#202020'), rtsUX([[0.6, 4.8], [2.4, 4.8]], '#202020'),
        rtsUDot(-1.5, 1.6, C.met[1]), rtsUDot(1.5, 1.6, C.met[1]),
        ...rtsURivets([[-1.4, -4.9], [1.4, -4.9], [-2.5, -3], [2.5, -3]]),
        rtsUDot(-1.6, -5.9, RTS_U_LAMP), rtsUDot(1.6, -5.9, RTS_U_LAMP),
      );
      return out;
    },
    turret: (fire, hd) => {
      const C = RTS_U_C, rc = fire ? 1 : 0;
      if (hd) {
        // a squat dome, two gas canisters on its back, a fat mortar with the gas glowing in its mouth
        return [
          rtsUE(0, 1, 3.3, 3.3, 'HL', 'd'),
          rtsUL(-1.5, 2.6, -1.5, 3.9, 1.4, RTS_U_GAS), rtsUL(1.5, 2.6, 1.5, 3.9, 1.4, RTS_U_GAS),
          rtsUX([[-2, 3.2], [-1, 3.2]], '#202020'), rtsUX([[1, 3.2], [2, 3.2]], '#202020'),
          rtsUX([[-2.4, 1.5], [-0.9, 2.5]], 'dk'), rtsUX([[2.4, 1.5], [0.9, 2.5]], 'dk'),
          rtsUE(0, -0.2, 1.9, 1.9, C.gun, 'd'),
          rtsUL(0, -0.2, 0, -3.4 + rc, 2.6, C.met),
          rtsUL(0, -3 + rc, 0, -3.8 + rc, 3.2, C.gun),
          rtsUE(0, -3.6 + rc, 1.2, 0.7, '#0C380C', 'f'),
          rtsUE(0, -3.6 + rc, 0.7, 0.45, fire ? '#FFFFFF' : C.grn[1], 'f'),
          rtsUDot(-0.9, -1.4 + rc, 'lt'),
          fire ? rtsUE(0, -5.8, 2.3, 1.7, C.grn[1], 'f') : null,
          fire ? rtsUE(-0.4, -6, 1.3, 0.9, C.grn[0], 'f') : null,
          fire ? rtsUE(1.6, -7.2, 1.2, 0.8, C.grn[2], 'f') : null,
          fire ? rtsUE(-1.8, -5, 0.9, 0.7, C.grn[2], 'f') : null,
        ];
      }
      return [
        rtsUE(0, 1, 3.3, 3.3, 'HL', 'd'),
        // the mortar: a fat short tube with the gas glowing in its mouth
        rtsUL(0, 0, 0, -3 + rc, 2.6, C.met, 'b'),
        rtsUE(0, -3.5 + rc, 1.7, 1.2, '#104810', 'f'),
        rtsUE(0, -3.5 + rc, 0.9, 0.6, fire ? C.grn[0] : C.grn[1], 'f'),
        fire ? rtsUE(0, -6, 2.4, 1.7, C.grn[1], 'f') : null,
        fire ? rtsUE(-0.5, -6.3, 1.2, 0.8, C.grn[0], 'f') : null,
        rtsUE(1.5, 2, 0.8, 0.8, C.grn, 'f'),
      ];
    },
  },
  // ---- aircraft (drawn with their shadow further off, they fly)
  skylifter: {
    size: 24, air: true, icon: { k: 1.05 },
    body: (f, hd) => {
      const C = RTS_U_C, carry = f >= 4, g = f & 3, cl = carry ? 1.5 : 2.5;
      const glow = i => [C.fire[1], C.fire[2], C.fire[3]][(g + i) % 3];
      const out = [
        // the clamps under the back of the body (hazard yellow), open or shut
        rtsUL(-cl, 1.5, -cl - 0.6, 6, 1, rtsUHazard), rtsUL(cl, 1.5, cl + 0.6, 6, 1, rtsUHazard),
        // the stub wings with an engine pod at each end
        rtsUR(-5, -2.5, 5, -0.5, C.ste, 'b', 0.6),
        rtsUE(-5, -1.5, 1.6, 3.2, 'HL', 'd'), rtsUE(5, -1.5, 1.6, 3.2, 'HL', 'd'),
        rtsUR(-5.5, 1.4, -4.5, 2.4, glow(0), 'f'), rtsUR(4.5, 1.4, 5.5, 2.4, glow(1), 'f'),
        // the long body, the cockpit at the front, a tail
        rtsUR(-2, -9, 2, 8.5, 'H', 'b', 1.5),
        rtsUR(-0.5, -4, 0.5, 6, 'HD', 'f'),
        rtsUE(0, -7, 1.3, 1.6, C.gls, 'd'),
        rtsUR(-3.5, 6.5, 3.5, 8, 'HD', 'b', 0.6),
      ];
      if (hd) out.push(
        rtsUE(-5, -4, 1, 0.6, '#202020', 'f'), rtsUE(5, -4, 1, 0.6, '#202020', 'f'),   // the intakes
        rtsUX([[-5.4, -3.2], [-5.4, 0.6]], 'lt'), rtsUX([[4.6, -3.2], [4.6, 0.6]], 'lt'),
        rtsUX([[-4, -1.5], [-2.2, -1.5]], 'dk'), rtsUX([[2.2, -1.5], [4, -1.5]], 'dk'),
        rtsUDot(-6.4, -1.5, g < 2 ? '#FC4040' : '#681010'), rtsUDot(6.4, -1.5, g < 2 ? '#40FC40' : '#106810'),
        rtsUX([[-1.6, -4.5], [1.6, -4.5]], 'dk'), rtsUX([[-1.6, 0.5], [-0.6, 0.5]], 'dk'), rtsUX([[0.6, 0.5], [1.6, 0.5]], 'dk'), rtsUX([[-1.6, 4.5], [-0.6, 4.5]], 'dk'), rtsUX([[0.6, 4.5], [1.6, 4.5]], 'dk'),
        ...rtsURivets([[-1.5, -3.5], [1.5, -3.5], [-1.5, 2.5], [1.5, 2.5], [-1.5, 6], [1.5, 6]]),
        rtsUX([[0, -8.2], [0, -5.8]], '#103050'), rtsUDot(-0.6, -7.8, '#FCFCFC'),
        rtsUDot(0, 7.6, g & 1 ? '#FCFCFC' : '#888888'),
        rtsUX([[-3, 7.25], [-1, 7.25]], 'lt'),
      );
      return out;
    },
  },
  gunwing: {
    size: 20, air: true, icon: { k: 1.25 },
    body: (f, hd) => {
      const C = RTS_U_C, g = f & 3, sp = [7, 5.5, 3.5, 5.5][g], ww = [2.2, 2.5, 2.8, 2.5][g];
      const out = [
        // the flapping wings, a pair each side
        rtsUP([[1, -2.5], [sp, -2.5 - ww * 0.4], [sp + 0.3, -1.2], [1, 0]], 'HL'),
        rtsUP([[-1, -2.5], [-sp, -2.5 - ww * 0.4], [-sp - 0.3, -1.2], [-1, 0]], 'HL'),
        rtsUP([[1, 1], [sp - 1.5, 1.5], [sp - 1.3, 2.8], [1, 3]], 'H'),
        rtsUP([[-1, 1], [-sp + 1.5, 1.5], [-sp + 1.3, 2.8], [-1, 3]], 'H'),
      ];
      if (hd) {
        // the wing ribs and lights at the tips
        for (const sx of [-1, 1]) {
          out.push(rtsUX([[sx * 1.5, -1.4], [sx * (sp - 0.2), -1.9 - ww * 0.2]], 'dk'));
          if (sp > 4) out.push(rtsUX([[sx * (sp * 0.55), -2.6 - ww * 0.2], [sx * (sp * 0.55), -0.9]], 'dk'));
          out.push(rtsUX([[sx * 1.5, 2], [sx * (sp - 1.6), 2.1]], 'dk'));
        }
        out.push(rtsUDot(-sp, -1.6, g < 2 ? '#FC4040' : '#681010'), rtsUDot(sp, -1.6, g < 2 ? '#40FC40' : '#106810'));
      }
      out.push(
        rtsUR(-1.5, -7, 1.5, 7, C.ste, 'b', 1),
        rtsUE(0, -4.8, 1, 1.6, C.gls, 'd'),
        rtsUR(-3, 6, 3, 7.5, 'HD', 'b', 0.5),
        rtsUL(-1.5, -5, -1.5, -7.5, hd ? 0.8 : 1, C.gun), rtsUL(1.5, -5, 1.5, -7.5, hd ? 0.8 : 1, C.gun),
      );
      if (hd) out.push(
        rtsUX([[0, -6], [0, -3.6]], '#103050'), rtsUDot(-0.4, -5.6, '#FCFCFC'),
        rtsUX([[-1, -2], [1, -2]], 'dk'), rtsUX([[-1, 1.5], [1, 1.5]], 'dk'), rtsUX([[0, -1.5], [0, 5.5]], 'H1'),
        ...rtsURivets([[-1, 4], [1, 4]]),
        rtsUE(0, 7.6, 0.9, 0.5, C.fire[(g & 1) + 1], 'f'),
        rtsUDot(-1.5, -7.4, '#101010'), rtsUDot(1.5, -7.4, '#101010'),
      );
      return out;
    },
  },
  frigate: {
    size: 40, k: 1.3, air: true, icon: { k: 0.8 },
    body: (f, hd, house, pal) => {
      const C = RTS_U_C, g = f & 3, out = [
        rtsUP([[-8, 2], [-3, -3], [-3, 6], [-8, 8]], 'HD'), rtsUP([[8, 2], [3, -3], [3, 6], [8, 8]], 'HD'),
        rtsUP([[0, -12], [4, -8], [5, 9], [3, 11], [-3, 11], [-5, 9], [-4, -8]], 'H'),
        rtsUP([[0, -12], [2.5, -9.5], [-2.5, -9.5]], 'HL'),
        rtsUE(0, -7, 1.5, 2, C.gls, 'd'),
        // cargo bay doors and House bands
        rtsUR(-3, -4, 3, 6, C.ste, 'r'),
        rtsUR(-0.5, -4, 0.5, 6, C.drk, 'f'),
        rtsUR(-4.5, -5.5, 4.5, -4.5, 'HD', 'f'), rtsUR(-5, 7, 5, 8, 'HD', 'f'),
        ...[-2.5, 0, 2.5].map((x, i) => rtsUE(x, 11.2, 1, 0.9, C.fire[(g + i) % 3 + 1], 'f')),
        rtsUE(-6.5, 7.5, 0.8, 0.8, g < 2 ? '#FC4040' : '#681010', 'f'), rtsUE(6.5, 7.5, 0.8, 0.8, g < 2 ? '#40FC40' : '#106810', 'f'),
      ];
      if (hd) {
        out.push(
          // the wings' panels and stripes
          rtsUX([[-7.6, 4], [-3.6, 0.6]], 'dk'), rtsUX([[7.6, 4], [3.6, 0.6]], 'dk'), rtsUX([[-7.4, 6.6], [-3.4, 4.6]], 'lt'), rtsUX([[7.4, 6.6], [3.4, 4.6]], 'lt'),
          rtsUR(-7.6, 6.2, -5.4, 7, C.yel[1], 'f'), rtsUR(5.4, 6.2, 7.6, 7, C.yel[1], 'f'),
          // the hull: seams, rivets, the bridge's windows, rows of portholes
          rtsUX([[-3.6, -7.5], [3.6, -7.5]], 'dk'), rtsUX([[-4.5, 8.5], [4.5, 8.5]], 'dk'),
          rtsUX([[-1, -8.4], [1, -8.4]], '#103050'), rtsUDot(-0.6, -7.8, '#FCFCFC'), rtsUDot(0.3, -6.2, '#FCFCFC'),
          ...[-3, -1.5, 0, 1.5, 3, 4.5].flatMap(y => [rtsUDot(-3.9, y, y % 3 ? C.gls[0] : C.gls[1]), rtsUDot(3.9, y, y % 3 ? C.gls[0] : C.gls[1])]),
          ...rtsURivets([[-2.5, -10], [2.5, -10], [-4.2, 9.6], [4.2, 9.6], [-2.6, 10.4], [2.6, 10.4]]),
          // the bay doors: hazard edges and ribs
          rtsUR(-3, -4, 3, -3.4, rtsUHazard, 'f'), rtsUR(-3, 5.4, 3, 6, rtsUHazard, 'f'),
          ...[-2, 0, 2, 4].flatMap(y => [rtsUX([[-2.6, y], [-0.8, y]], 'dk'), rtsUX([[0.8, y], [2.6, y]], 'dk')]),
          ...rtsUAntenna(-1.8, 8.3, 2.4), ...rtsUAntenna(1.8, 8.3, 2.4),
          ...rtsUEmblem(0, -10.2, house, pal),
          ...[-2.5, 0, 2.5].map(x => rtsUDot(x, 11.2, '#FCFCFC')),
        );
      }
      return out;
    },
  },
  doomfist: {
    size: 16, air: true, icon: { k: 1.3 },
    body: (f, hd) => rtsUDoomParts(f, hd),
  },
};
// the great missile (the unit and the shot)
function rtsUDoomParts(f, hd) {
  const C = RTS_U_C, g = f & 3, fl = [3, 4, 2.5, 3.5][g];
  const out = [
    rtsUP([[-1.8, 3], [-3.5, 6], [-3.5, 7], [-1.5, 6]], C.red), rtsUP([[1.8, 3], [3.5, 6], [3.5, 7], [1.5, 6]], C.red),
    rtsUE(0, 6 + fl / 2, 1.3, fl / 2 + 0.5, C.fire[3], 'f'),
    rtsUE(0, 6 + fl / 3, 0.8, fl / 3 + 0.3, C.fire[1], 'f'),
  ];
  if (hd) out.push(rtsUE(0, 6.2 + fl / 4, 0.4, fl / 4 + 0.2, '#FFFFFF', 'f'));
  out.push(
    rtsUR(-1.6, -4, 1.6, 6.5, C.met, 'b', 0.6),
    rtsUR(-1.6, 0, 1.6, 1.5, C.drk, 'f'),
    rtsUP([[0, -7.5], [1.6, -4], [-1.6, -4]], C.red),
    rtsUL(0, -1, 0, -3, 0.9, C.yel, 'f'),
  );
  if (hd) out.push(
    rtsUR(-1.6, 3.6, 1.6, 4.4, rtsUHazard, 'f'), rtsUX([[-1.6, -4], [1.6, -4]], '#581000'),
    rtsUX([[-1.2, -3.6], [-1.2, 6]], 'lt'), rtsUX([[1.1, -3.6], [1.1, 6]], 'dk'),
    rtsUX([[-0.4, -0.3], [0.4, -0.3]], '#101010'), rtsUDot(0, 1.8, '#101010'), rtsUDot(-0.6, -6.2, '#FCB8A8'),
    rtsUX([[-2.4, 5.2], [-3.2, 6.4]], '#581000'), rtsUX([[2.4, 5.2], [3.2, 6.4]], '#581000'),
  );
  return out;
}
const RTS_U_SIZE = {};
for (const k in RTS_U_MODEL) RTS_U_SIZE[k] = RTS_U_MODEL[k].size;
for (const k of RTS_U_INF) RTS_U_SIZE[k] = 16;

// ------------------------------------------------------------------ infantry: little pixel grids
// chars: L/K/k helmet light/mid/dark; S/s skin; h/H/d uniform (House) light/mid/dark; W belt/webbing; R/r pack;
// T/t robe (nomads); A/a armour (praetorians); X crest. Legs and weapons are drawn per frame on top.
const RTS_U_INF_GRID = {
  s: ['..LKk..', '.LKKKk.', '..SSs..', '.hHHHd.', 'hhHWHdd', 'ShHWHdS', '..WWW..'],
  n: ['..LKk..', '.LKKKk.', '..kKk..', '.hRRRd.', 'hhRRRdd', 'ShRrRdS', '..WWW..'],
  e: ['..LKk..', '..KKKKk', '..kSSs.', '..hHd..', '.RhHd..', '.rhHd..', '..WWW..'],
  se: ['..LKk..', '.LKKKk.', '..kSS..', '.hHHd..', 'hhHWdd.', '.hHWdS.', '..WWW..'],
  ne: ['..LKk..', '.LKKKk.', '..kKS..', '.RRHd..', 'hRRHdd.', '.rRHd..', '..WWW..'],
};
// res 2: 14 wide, head rows 0..5, the body rows 6..13 (legs below, drawn per frame). Extra chars: x the helmet's
// brim, E the eyes, Z the lower face (scarf, mask, face guard), o/O shoulder pads, w belt shadow, Y buckle, q pack
// straps.
const RTS_U_INF_GRID2 = {
  s: ['....LLKKKk....', '...LLKKKKKk...', '...LKKKKKKk...', '..xxxxxxxxxx..', '....SESSEs....', '....SZZZZs....',
    '.oohhHHHHddOO.', '.ohhWHHHHWddO.', '.hhHWHHHHWHdd.', '.hhHWHHHHWHdd.', '.ShHHHHHHHHdS.', '.s.hHHHHHHd.s.', '...WWWYYWWW...', '...wwwwwwww...'],
  n: ['....LLKKKk....', '...LLKKKKKk...', '...LKKKKKKk...', '..xxxxxxxxxx..', '....SSSSSs....', '...hhHHHHdd...',
    '.oohqRRRRqdOO.', '.ohhRRRRRRddO.', '.hhRrrrrrrRdd.', '.hhRRRRRRRRdd.', '.ShRRRYYRRRdS.', '.s.hrrrrrrd.s.', '...WWWWWWWW...', '...wwwwwwww...'],
  e: ['.....LLKKk....', '....LKKKKKk...', '....LKKKKKKk..', '....xxxxxxxxx.', '.....kSSSES...', '.....ksSZZs...',
    '....RhHHHd....', '...RRhHHHdd...', '...RRhHHHdd...', '...RrhHHWdd...', '...rrhHHWdS...', '....rhHHHds...', '.....WWYWW....', '.....wwwww....'],
  se: ['....LLKKKk....', '...LLKKKKKk...', '...LKKKKKKkk..', '...xxxxxxxxxx.', '....kSSESSE...', '....ksSSZZs...',
    '.oohhHHHHdOO..', '.ohhWHHHHWdO..', '.hhHWHHHHWdd..', '.hhHWHHHHHdd..', '.ShHHHHHHHdS..', '.s.hHHHHHd.s..', '...WWWYWWW....', '...wwwwwww....'],
  ne: ['....LLKKKk....', '...LLKKKKKk...', '...LKKKKKKk...', '..xxxxxxxxxx..', '....SSSSSs....', '...hhHHHHd....',
    '..qRRRRhHdO...', '.RRRRRRhHddO..', '.RrrrrRhHHdd..', '.RRRRRRhHHdd..', '.RRYRRRhHHdS..', '..rrrrrhHd.s..', '...WWWWWWW....', '...wwwwwww....'],
};
// mirrored facings keep the light top-left: swap the light and dark letters
const RTS_U_SWAP = { h: 'd', d: 'h', L: 'k', k: 'L', S: 's', s: 'S', R: 'r', r: 'R', T: 't', t: 'T', A: 'a', a: 'A', o: 'O', O: 'o' };
function rtsUMirror(rows) { return rows.map(r => r.split('').reverse().map(ch => RTS_U_SWAP[ch] || ch).join('')); }
// per direction: the grid, mirrored?, the hand (grid coords) and the weapon direction, weapon behind the body?
const RTS_U_FACE = [
  { g: 'n', m: 0, hx: 5, hy: 4, dx: 0, dy: -1, back: true },
  { g: 'ne', m: 0, hx: 4, hy: 4, dx: 1, dy: -1, back: true },
  { g: 'e', m: 0, hx: 4, hy: 4, dx: 1, dy: 0 },
  { g: 'se', m: 0, hx: 4, hy: 5, dx: 1, dy: 1 },
  { g: 's', m: 0, hx: 4, hy: 5, dx: 0, dy: 1 },
  { g: 'se', m: 1, hx: 2, hy: 5, dx: -1, dy: 1 },
  { g: 'e', m: 1, hx: 2, hy: 4, dx: -1, dy: 0 },
  { g: 'ne', m: 1, hx: 2, hy: 4, dx: -1, dy: -1, back: true },
];
// res 2: the hand (where the weapon is held, walking) and the legs' hips (x of the two legs)
const RTS_U_FACE2 = {
  n: { hx: 11, hy: 9, legs: [4, 8] }, ne: { hx: 9, hy: 9, legs: [4, 7] }, e: { hx: 9, hy: 10, legs: [6, 7] },
  se: { hx: 9, hy: 10, legs: [4, 7] }, s: { hx: 8, hy: 10, legs: [4, 8] },
};
// the look of each kind of foot soldier
function rtsUInfStyle(key, pal) {
  const base = {
    L: '#D8D8C8', K: '#9C9C88', k: '#5C5C48', S: RTS_U_C.skin[0], s: RTS_U_C.skin[1],
    h: pal[0], H: pal[1], d: pal[2], W: '#5C4828', R: '#A09060', r: '#686038',
    P: '#787058', p: '#4C4838', B: '#282018', G: '#6C6C6C', g: '#303030',
    gun: 4, tube: false,
  };
  let st;
  switch (key) {
    case 'soldier': st = Object.assign(base, { L: pal[0], K: pal[2], k: rtsUTint(pal[2], -0.4) }); break;
    case 'trooper': st = Object.assign(base, { L: rtsUTint(pal[0], 0.3), K: pal[0], k: pal[1], R: '#788050', r: '#484C28', tube: true, gun: 5 }); break;
    case 'nomad': st = Object.assign(base, {
      L: '#E8D0A0', K: '#C8A068', k: '#886034', h: '#E0C490', H: '#B89060', d: '#806030', W: pal[1], R: pal[0], r: pal[1],
      P: '#B89060', p: '#806030', B: '#4C3418', S: '#C88858', s: '#985830', gun: 4, robe: true,
    }); break;
    case 'saboteur': st = Object.assign(base, {
      L: '#585868', K: '#383848', k: '#202028', h: '#585868', H: '#383848', d: '#202028', W: pal[1], R: pal[1], r: pal[2],
      P: '#383848', p: '#202028', B: '#101018', S: '#383848', s: '#202028', G: '#9C9C9C', gun: 2,
    }); break;
    case 'praetorian': st = Object.assign(base, {
      L: '#F8F0D0', K: '#E0B848', k: '#986C10', R: pal[1], r: pal[2], W: '#E0B848', P: pal[2], p: rtsUTint(pal[2], -0.4), B: '#181010',
      G: '#8C8C8C', g: '#383838', gun: 5, heavy: true, crest: pal[1],
    }); break;
    default: st = base;
  }
  // the res 2 extras
  st.x = st.x || rtsUTint(st.k, -0.35); st.E = st.E || '#201810'; st.Z = st.Z || st.S;
  st.o = st.o || st.h; st.O = st.O || st.d; st.w = st.w || rtsUTint(st.W, -0.4); st.Y = st.Y || '#D8C890'; st.q = st.q || rtsUTint(st.r, -0.35);
  st.Gl = st.Gl || rtsUTint(st.G, 0.35); st.wood = '#805830';
  if (key === 'soldier') st.res2 = { K: pal[1], k: pal[2], x: rtsUTint(pal[2], -0.4), L: pal[0] };
  if (key === 'trooper') { st.E = '#3CBCFC'; st.x = rtsUTint(pal[1], -0.45); st.o = '#788050'; st.O = '#484C28'; }
  if (key === 'nomad') { st.Z = pal[1]; st.x = '#6C4824'; st.E = '#100800'; st.w = rtsUTint(pal[1], -0.4); st.o = '#E0C490'; st.O = '#806030'; st.Y = pal[0]; st.res2 = { R: '#A88458', r: '#705030', q: pal[1] }; }
  if (key === 'saboteur') { st.E = '#E8E8E8'; st.Z = '#2C2C38'; st.x = '#101018'; st.o = '#484858'; st.O = '#18181C'; st.Y = '#9C9C9C'; st.Gl = '#C8C8C8'; }
  if (key === 'praetorian') { st.Z = '#C89C30'; st.x = '#6C4C08'; st.E = '#100808'; st.o = '#F8E8A0'; st.O = '#986C10'; st.Y = '#F8F0D0'; }
  return st;
}
// one figure into a buffer: ox, oy = the grid's top-left; f 0..3 walking, 4 aiming, 5 shooting
function rtsUInfFigure(b, key, pal, dir, f, ox, oy) {
  const st = rtsUInfStyle(key, pal), fc = RTS_U_FACE[dir & 7];
  let rows = RTS_U_INF_GRID[fc.g];
  if (fc.m) rows = rtsUMirror(rows);
  const px = [];   // [x, y, colour] in grid coords, later wins
  const put = (x, y, c) => { if (c) px.push([x, y, c]); };
  // the weapon (behind the body when facing away)
  const weapon = () => {
    const rx = fc.hx, ry = fc.hy;
    if (st.tube) {   // a rocket tube on the shoulder: thick, from behind the shoulder forward
      const sx = rx - fc.dx * 2, sy = ry - 1 - fc.dy * 2;
      for (let t = 0; t < 6; t++) {
        const x = sx + fc.dx * t, y = sy + fc.dy * t;
        put(x, y, t === 5 ? RTS_U_C.red[1] : t === 4 ? '#B0B888' : st.R);
        if (fc.dx && fc.dy) put(x, y + 1, t >= 4 ? null : st.r);
        else if (fc.dx) put(x, y + 1, t >= 4 ? null : st.r);
        else put(x + 1, y, t >= 4 ? null : st.r);
      }
      if (f === 5) { put(sx - fc.dx, sy - fc.dy, RTS_U_C.smoke[1]); put(sx - fc.dx * 2, sy - fc.dy * 2, RTS_U_C.smoke[0]); put(sx + fc.dx * 6, sy + fc.dy * 6, RTS_U_C.fire[1]); }
      return;
    }
    const n = st.gun;
    for (let t = 0; t < n; t++) {
      const x = rx + fc.dx * t, y = ry + fc.dy * t;
      put(x, y, t === 0 ? st.S : t === n - 1 ? st.g : st.G);
      if (st.heavy && t > 0) put(x + (fc.dy ? 1 : 0), y + (fc.dy ? 0 : 1), st.g);
    }
    if (f === 5) {
      const x = rx + fc.dx * n, y = ry + fc.dy * n;
      put(x, y, RTS_U_C.fire[0]); put(x + fc.dx, y + fc.dy, RTS_U_C.fire[2]);
      put(x + (fc.dy ? 1 : 0), y + (fc.dx ? 1 : 0), RTS_U_C.fire[1]); put(x - (fc.dy ? 1 : 0), y - (fc.dx ? 1 : 0), RTS_U_C.fire[1]);
    }
  };
  if (fc.back) weapon();
  // legs: hips on row 7, feet on row 9 (one row up or down while striding)
  const s = f >= 4 ? 0 : [0, 1, 0, -1][f & 3], side = fc.g === 'e';
  const hips = side ? [[2, 7], [3, 7]] : [[2, 7], [4, 7]];
  hips.forEach(([hx, hy], i) => {
    const st2 = i ? -s : s, fx = hx + fc.dx * st2, fy = 9 + Math.max(-1, Math.min(1, fc.dy * st2));
    const leg = i ? st.p : st.P;
    const n = Math.max(Math.abs(fx - hx), Math.abs(fy - hy));
    for (let t = 0; t < n; t++) put(Math.round(hx + (fx - hx) * t / n), Math.round(hy + (fy - hy) * t / n), leg);
    put(fx, fy, st.B);
    if (side) put(fx + fc.dx, fy, st.B);
  });
  // a nomad's robe hangs over the legs
  if (st.robe) { for (let x = 1; x <= 5; x++) put(x, 7, x === 1 ? st.h : x === 5 ? st.d : st.H); put(2, 8, st.H); put(4, 8, st.d); }
  rows.forEach((row, y) => { for (let x = 0; x < row.length; x++) if (row[x] !== '.') put(x, y, st[row[x]]); });
  if (st.robe) { put(1, 1, st.L); put(5, 1, st.k); put(1, 2, st.K); put(5, 2, st.k); }   // the hood
  if (st.crest) { put(3, -1, st.crest); put(2, 0, st.crest); put(4, 0, rtsUTint(st.crest, -0.4)); }
  if (key === 'saboteur') { put(2, 2, '#E8E8E8'); put(4, 2, '#E8E8E8'); if (fc.g === 'n' || fc.g === 'ne') { put(2, 2, null); put(4, 2, null); } }
  if (!fc.back) weapon();
  for (const [x, y, c] of px) rtsUPut(b, ox + x, oy + y, c);
}
// res 2: one figure (14 x 20) into a buffer at ox, oy (the grid's top-left)
function rtsUInfFigure2(b, key, pal, dir, f, ox, oy) {
  const st0 = rtsUInfStyle(key, pal), st = st0.res2 ? Object.assign({}, st0, st0.res2) : st0, fc = RTS_U_FACE[dir & 7], g2 = RTS_U_FACE2[fc.g];
  let rows = RTS_U_INF_GRID2[fc.g];
  if (fc.m) rows = rtsUMirror(rows);
  const mx = x => fc.m ? 13 - x : x;
  const px = [];
  const put = (x, y, c) => { if (c) px.push([x, y, c]); };
  const walk = f < 4, s = walk ? [0, 1, 0, -1][f & 3] : 0, bob = walk && s ? 1 : 0;
  const aim = !walk, side = fc.g === 'e';
  const dx = fc.dx, dy = fc.dy;
  // the weapon, from the hand along the facing; aiming it's raised to the shoulder
  const weapon = () => {
    let hx = mx(g2.hx), hy = g2.hy + bob - (aim ? 2 : 0);
    if (f === 5) { hx -= dx; hy -= dy; }   // the kick
    const along = (t, w = 0) => [hx + dx * t + (dy ? w : 0) * (dx && dy ? 0 : 1), hy + dy * t + (dx ? w : 0)];
    const line = (t0, t1, c, c2) => {
      for (let t = t0; t <= t1; t++) {
        const [x, y] = along(t); put(x, y, c);
        if (c2) { if (dx && dy) put(x, y + 1, c2); else if (dx) put(x, y + 1, c2); else put(x + 1, y, c2); }
      }
    };
    const tip = n => along(n);
    if (st.tube) {   // the rocket tube on the shoulder: a long fat tube, the warhead peeping out, a sight
      const sx = hx - dx * 4, sy = hy - 2 - dy * 4;
      for (let t = 0; t < 11; t++) {
        const x = sx + dx * t, y = sy + dy * t;
        const c = t === 0 ? '#202020' : t >= 9 ? (t === 10 ? RTS_U_C.red[1] : '#C8C8A0') : t % 4 === 2 ? st.r : st.R;
        put(x, y, c);
        const c2 = t === 0 ? '#101010' : t >= 9 ? (t === 10 ? RTS_U_C.red[2] : '#888868') : st.r;
        if (dx && dy) { put(x, y + 1, c2); put(x + dx, y, c); }
        else if (dx) { put(x, y + 1, c2); put(x, y - 1, t >= 9 ? null : rtsUTint(st.R, 0.3)); }
        else { put(x + 1, y, c2); put(x - 1, y, t >= 9 ? null : rtsUTint(st.R, 0.3)); }
      }
      put(sx + dx * 5 - (dy ? 0 : 0), sy + dy * 5 - (dx ? 2 : 0) - (dy && !dx ? 0 : 0) + (dx ? 0 : 0), '#202020');
      if (f === 5) {
        for (let k = 1; k <= 4; k++) put(sx - dx * k + (k % 2), sy - dy * k + (k % 2 ? 1 : 0), RTS_U_C.smoke[k < 3 ? 0 : 1]);
        put(sx - dx, sy - dy, RTS_U_C.fire[1]);
        const [x, y] = [sx + dx * 11, sy + dy * 11];
        put(x, y, RTS_U_C.fire[0]); put(x + dx, y + dy, RTS_U_C.fire[2]); put(x + (dy ? 1 : 0), y + (dx ? 1 : 0), RTS_U_C.fire[1]);
      }
      return;
    }
    // rifles: a wooden or dark stock behind the hand, the receiver, the magazine, a long barrel
    const n0 = st.gun + 3, n = dx && dy ? Math.round(n0 * 0.75) : n0;
    line(dx && dy ? -1 : -2, -1, st.heavy ? st.g : key === 'nomad' ? st.wood : '#282828', key === 'nomad' ? '#583818' : '#141414');
    line(0, 2, st.Gl, st.g);
    line(3, n - 1, st.G, st.heavy ? st.g : null);
    const [mgx, mgy] = along(1);
    put(mgx + (dy && !dx ? -1 : 0), mgy + (dx ? 1 : 0) + (dx ? 1 : 0), st.g);   // the magazine
    put(...tip(n - 1), st.g);
    if (st.heavy) { const [x, y] = along(n - 3); put(x, y, RTS_U_C.pla[1]); }
    put(hx, hy, st.S);   // the hand on the grip
    if (f === 5) {
      const [x, y] = tip(n);
      put(x, y, RTS_U_C.fire[0]); put(x + dx, y + dy, RTS_U_C.fire[1]); put(x + dx * 2, y + dy * 2, RTS_U_C.fire[2]);
      const ox2 = dy ? 1 : 0, oy2 = dx ? 1 : 0;
      put(x + ox2, y + oy2, RTS_U_C.fire[1]); put(x - ox2, y - oy2, RTS_U_C.fire[1]);
      put(x + dx + ox2 * 2, y + dy + oy2 * 2, RTS_U_C.fire[3]); put(x + dx - ox2 * 2, y + dy - oy2 * 2, RTS_U_C.fire[3]);
    }
  };
  if (fc.back) weapon();
  // the legs: hips on row 14 (15 bobbing), boots on rows 18..19
  const L = g2.legs.map(mx).sort((a, b) => a - b);
  [0, 1].forEach(i => {
    const st2 = i ? -s : s, hx = L[i] - (i && fc.m && !side ? 1 : 0), hy = 14 + bob;
    let fx = hx, fy = 19;
    if (side) fx = hx + dx * st2 * 2;
    else if (dx) { fx = hx + dx * st2; fy = 19 + Math.max(-1, Math.min(1, dy * st2)); }
    else fy = 19 + dy * st2;
    const leg = i ? st.p : st.P, leg2 = i ? rtsUTint(st.p, -0.3) : st.p;
    for (let y = hy; y <= fy - 2; y++) {
      const t = (y - hy) / Math.max(1, fy - 2 - hy), x = Math.round(hx + (fx - hx) * t);
      put(x, y, leg); put(x + 1, y, leg2);
    }
    // the boot, the toe pointing the way it walks
    put(fx, fy - 1, st.B); put(fx + 1, fy - 1, st.B); put(fx, fy, st.B); put(fx + 1, fy, st.B);
    if (dx) put(dx > 0 ? fx + 2 : fx - 1, fy, st.B);
    put(fx, fy - 1, rtsUTint(st.B, 0.25));
  });
  // a nomad's robe over the legs, swinging as he walks
  if (st.robe) {
    for (let y = 13; y <= 16; y++) for (let x = 2 + (y > 14 ? 1 : 0) - (y === 16 ? 0 : 0); x <= 11 - (y > 14 ? 1 : 0); x++) {
      const xx = x + (y >= 15 ? s : 0);
      put(xx, y + bob, x <= 3 ? st.h : x >= 10 || y === 16 ? st.d : (x + y) % 5 === 0 ? st.d : st.H);
    }
  }
  rows.forEach((row, y) => { for (let x = 0; x < row.length; x++) if (row[x] !== '.') put(x, y + bob, st[row[x]]); });
  // the kinds' own touches
  if (st.robe) {   // the hood falls to the shoulders
    for (const [x, y] of [[2, 3], [2, 4], [2, 5], [11, 3], [11, 4], [11, 5], [3, 5]]) put(mx(x), y + bob, mx(x) < 7 ? st.L : st.k);
    put(mx(10), 5 + bob, st.k);
  }
  if (st.crest) {   // the praetorian's crest along the helmet
    const cr = st.crest, cd = rtsUTint(cr, -0.4);
    if (side) { for (let x = 4; x <= 9; x++) { put(mx(x), -1 + bob + (x === 4 || x === 9 ? 1 : 0), x < 7 ? cr : cd); } put(mx(5), -2 + bob, cr); put(mx(6), -2 + bob, cr); }
    else { for (let y = -2; y <= 1; y++) { put(6, y + bob, cr); put(7, y + bob, cd); } }
    for (const x of [1, 12]) put(x, 6 + bob, '#F8F0D0');
  }
  if (key === 'trooper' && fc.g !== 'n' && fc.g !== 'ne') { const y = 4 + bob; for (let x = 4; x <= 10; x++) if (rows[4][x] === 'S' || rows[4][x] === 's') put(x, y, '#204868'); }
  if (!fc.back) weapon();
  for (const [x, y, c] of px) rtsUPut(b, ox + x, oy + y, c);
}
// outline what's in the buffer (4-neighbours), then a soft shadow ellipse under the feet
function rtsUOutline(b, col = RTS_U_C.ol) {
  const add = [];
  for (let j = 0; j < b.h; j++) for (let i = 0; i < b.w; i++) {
    if (rtsUAlpha(b, i, j) > 128) continue;
    if (rtsUAlpha(b, i - 1, j) > 128 || rtsUAlpha(b, i + 1, j) > 128 || rtsUAlpha(b, i, j - 1) > 128 || rtsUAlpha(b, i, j + 1) > 128) add.push([i, j]);
  }
  for (const [i, j] of add) rtsUPut(b, i, j, col);
}
function rtsUFootShadow(b, cx, cy, rx, ry) {
  for (let j = Math.floor(cy - ry); j <= cy + ry; j++) for (let i = Math.floor(cx - rx); i <= cx + rx; i++) {
    const dx = (i + 0.5 - cx) / rx, dy = (j + 0.5 - cy) / ry, d = dx * dx + dy * dy;
    if (d <= 1 && rtsUAlpha(b, i, j) === 0) rtsUPut(b, i, j, '#000000', d > 0.55 ? 44 : 88);
  }
}
function rtsUInfCanvas(key, pal, dir, f, res = 1) {
  if (res > 1) {
    const b = rtsUBuf(32, 32);
    rtsUInfFigure2(b, key, pal, dir, f, 10, 6);
    rtsUOutline(b);
    rtsUFootShadow(b, 17, 26.2, 7, 2.8);
    return rtsUCanvas(b);
  }
  const b = rtsUBuf(16, 16);
  rtsUInfFigure(b, key, pal, dir, f, 5, 3);
  rtsUOutline(b);
  rtsUFootShadow(b, 8.5, 13.2, 3.6, 1.6);
  return rtsUCanvas(b);
}
// a dying soldier: hit, falling, down, a pool, then a dark heap
function rtsUInfDeathCanvas(key, pal, f, res = 1) {
  if (res > 1) return rtsUInfDeathCanvas2(key, pal, f);
  const b = rtsUBuf(16, 16), st = rtsUInfStyle(key, pal), rows = RTS_U_INF_GRID.s;
  f = Math.max(0, Math.min(5, f | 0));
  const blood = (cx, cy, r) => {
    for (let j = -2; j <= 2; j++) for (let i = -4; i <= 4; i++) {
      const d = Math.hypot(i / r, j / (r * 0.55));
      if (d <= 1) rtsUPut(b, cx + i, cy + j, d > 0.7 ? '#580800' : '#881400');
    }
  };
  if (f >= 3) blood(8, 10, f === 3 ? 2.5 : 3.6);
  if (f <= 1) {
    // still on the feet (f 0, thrown back a pixel) or half down on the knees (f 1)
    const oy = f ? 5 : 3, dx = f ? 1 : 0;
    rows.forEach((row, y) => { if (f && y > 5) return; for (let x = 0; x < 7; x++) if (row[x] !== '.') rtsUPut(b, 5 + x + (y < 3 ? dx : 0), oy + y, st[row[x]]); });
    const legs = f ? [[2, 6], [4, 6], [1, 7], [5, 7]] : [[2, 7], [2, 8], [4, 7], [4, 8], [2, 9], [4, 9]];
    for (const [x, y] of legs) rtsUPut(b, 5 + x, oy + y, y >= (f ? 7 : 9) ? st.B : st.P);
    rtsUPut(b, 9, oy + 4, '#D82800'); if (!f) { rtsUPut(b, 10, oy + 3, '#D82800'); rtsUPut(b, 11, oy + 2, '#F87858'); }
    rtsUPut(b, 12 - dx * 3, oy + 6, st.G); rtsUPut(b, 13 - dx * 3, oy + 7, st.g);
  } else {
    // flat on the back: the figure turned on its side, head to the left
    const dark = f === 5;
    const cols = [1, 2, 3, 4, 5];
    rows.forEach((row, y) => cols.forEach((x, k) => {
      if (row[x] === '.') return;
      let c = st[row[x]];
      if (dark) c = rtsUTint(c, -0.55);
      rtsUPut(b, 3 + y, 6 + k, c);
    }));
    for (let x = 0; x < 3; x++) { rtsUPut(b, 10 + x, 7, dark ? '#302820' : st.P); rtsUPut(b, 10 + x, 9, dark ? '#201810' : st.p); }
    rtsUPut(b, 13, 7, st.B); rtsUPut(b, 13, 9, st.B);
    if (f >= 2 && f < 5) { rtsUPut(b, 6, 12, st.G); rtsUPut(b, 7, 12, st.G); rtsUPut(b, 8, 13, st.g); }
  }
  rtsUOutline(b);
  if (f < 2) rtsUFootShadow(b, 8.5, 13.2, 3.6, 1.6);
  return rtsUCanvas(b);
}
// res 2 (32x32): 0 hit and thrown back, 1 on the knees, 2 falling flat, 3 down (a pool spreading), 4 still, 5 a dark
// heap in a dried pool
function rtsUInfDeathCanvas2(key, pal, f) {
  const b = rtsUBuf(32, 32), st0 = rtsUInfStyle(key, pal), st = st0.res2 ? Object.assign({}, st0, st0.res2) : st0, rows = RTS_U_INF_GRID2.s;
  f = Math.max(0, Math.min(5, f | 0));
  const pool = (cx, cy, r, dry) => {
    for (let j = -7; j <= 7; j++) for (let i = -12; i <= 12; i++) {
      const th = Math.atan2(j, i), d = Math.hypot(i / r, j / (r * 0.5)) - 0.14 * rtsUWobF(th, 61);
      if (d > 1) continue;
      rtsUPut(b, cx + i, cy + j, d > 0.78 ? (dry ? '#401008' : '#580800') : dry ? '#5C1810' : (i * 3 + j * 5) % 11 === 0 && d < 0.6 ? '#B02010' : '#881400');
    }
  };
  if (f >= 3) pool(15, 19, f === 3 ? 5.5 : 9, f === 5);
  const gun = (x, y, len, dark) => {
    for (let t = 0; t < len; t++) { rtsUPut(b, x + t, y, dark ? '#202020' : t < 2 ? (key === 'nomad' ? st.wood : '#282828') : st.Gl); rtsUPut(b, x + t, y + 1, dark ? '#101010' : st.g); }
    if (st.tube) for (let t = 0; t < len; t++) rtsUPut(b, x + t, y - 1, dark ? '#303020' : st.R);
  };
  const dk = c => f === 5 ? rtsUTint(c, -0.55) : c;
  if (f <= 1) {
    const oy = f ? 9 : 5, lean = f ? 1 : 2;
    rows.forEach((row, y) => {
      for (let x = 0; x < 14; x++) if (row[x] !== '.') rtsUPut(b, 9 + x + (y < 6 ? lean : y < 10 ? (f ? 0 : 1) : 0), oy + y, st[row[x]]);
    });
    if (f === 0) {
      for (const x of [4, 8]) for (let k = 0; k < 6; k++) { rtsUPut(b, 9 + x, oy + 14 + k, k > 3 ? st.B : st.P); rtsUPut(b, 10 + x, oy + 14 + k, k > 3 ? st.B : st.p); }
      // the hit: a spray of blood
      for (const [x, y, c] of [[16, 12, '#D82800'], [18, 10, '#D82800'], [20, 8, '#F87858'], [21, 9, '#D82800'], [19, 7, '#F87858'], [22, 6, '#881400'], [17, 11, '#881400']]) rtsUPut(b, x, y, c);
      gun(21, oy + 13, 7);
    } else {
      // down on the knees: short legs, the boots behind, the weapon dropped
      for (const x of [4, 8]) {
        for (let k = 0; k < 3; k++) { rtsUPut(b, 9 + x, oy + 14 + k, st.P); rtsUPut(b, 10 + x, oy + 14 + k, st.p); }
        rtsUPut(b, 8 + x, oy + 17, st.B); rtsUPut(b, 9 + x, oy + 17, st.B); rtsUPut(b, 10 + x, oy + 17, st.B);
      }
      gun(21, oy + 16, 8);
    }
  } else {
    // flat on the back: the figure turned on its side, head to the left, arms flung out, the weapon fallen by it
    const sl = f === 2 ? 1 : 0, X = 4 + sl, Y = 9 - sl;
    rows.forEach((row, y) => {
      for (let x = 1; x <= 12; x++) if (row[x] !== '.') rtsUPut(b, X + y, Y + x, dk(st[row[x]]));
    });
    for (let x = 0; x < 6; x++) {
      for (const [y, c] of [[4, st.P], [5, st.p], [8, st.P], [9, st.p]]) rtsUPut(b, X + 14 + x, Y + y + (x > 3 && y > 6 ? 1 : 0), dk(c));
    }
    for (const y of [4, 5, 8, 9]) { rtsUPut(b, X + 20, Y + y + (y > 6 ? 1 : 0), dk(st.B)); rtsUPut(b, X + 21, Y + y + (y > 6 ? 1 : 0), dk(st.B)); }
    // an arm flung up past the head
    if (f >= 2) { rtsUPut(b, X + 9, Y + 1, dk(st.h)); rtsUPut(b, X + 8, Y, dk(st.h)); rtsUPut(b, X + 7, Y - 1, dk(st.S)); }
    if (f < 5) gun(X + 5, Y + 15, 9, f >= 4); else gun(X + 6, Y + 15, 6, true);
  }
  rtsUOutline(b);
  if (f < 2) rtsUFootShadow(b, 17, 26.2, 7, 2.8);
  return rtsUCanvas(b);
}

// ------------------------------------------------------------------ caches and the vehicle renders
const RTS_U_CACHE = new Map();
function rtsUCached(key, make) {
  let c = RTS_U_CACHE.get(key);
  if (!c) { c = make(); RTS_U_CACHE.set(key, c); }
  return c;
}
function rtsUModelCanvas(parts, size, dir8, opt = {}) {
  const b = rtsURaster(parts, Object.assign({ w: size, h: size, cx: size / 2, cy: size / 2, ang: (dir8 & 7) * Math.PI / 4 }, opt));
  return rtsUCanvas(b);
}
// a body's parts; at res 1 a few lamps (single pixels) that help to tell the front
const RTS_U_LAMPS1 = {
  tank: [[-1.5, -4.5], [1.5, -4.5]], siege: [[-2, -5.5], [2, -5.5]], sonic: [[-1.5, -5], [1.5, -5]], converter: [[-1.5, -5], [1.5, -5]],
  quad: [[-2, -4.5], [2, -4.5]], harvester: [[-2.2, -2.2]],
};
function rtsUBodyParts(m, f, res, house, pal) {
  const parts = m.body(f, res > 1, house, pal), key = Object.keys(RTS_U_MODEL).find(k => RTS_U_MODEL[k] === m);
  if (res === 1 && RTS_U_LAMPS1[key]) for (const [x, y] of RTS_U_LAMPS1[key]) parts.push(rtsUDot(x, y, key === 'harvester' ? RTS_U_C.yel[1] : RTS_U_LAMP));
  return parts;
}
function rtsUShadowOf(m, res) { return (m.air ? (m.size >= 32 ? [3, 4] : [2, 3]) : [1, 1]).map(v => v * res); }

// =====================================================================
//  The API (res: 1 = 16 px a tile, 2 = 32 px a tile; optional, default 1; a res 2 canvas is twice the size)
// =====================================================================

// a unit's body: vehicles 16x16 (harvester, mcv, juggernaut, gunwing 20x20; skylifter 24x24; frigate 40x40; see
// RTS_U_SIZE), centred; infantry one soldier in 16x16 (frame 0..3 walking, 4 aiming, 5 shooting); x2 at res 2
function rtsUnitArt(key, house, dir8, frame, res) {
  res = rtsURes(res);
  dir8 = ((dir8 | 0) % 8 + 8) % 8; frame = Math.max(0, frame | 0);
  if (RTS_U_INF.includes(key)) {
    frame = Math.min(5, frame);
    return rtsUCached('i' + key + house + dir8 + '/' + frame + '@' + res, () => rtsUInfCanvas(key, rtsUPal(house), dir8, frame, res));
  }
  const m = RTS_U_MODEL[key] || RTS_U_MODEL.tank, pal = rtsUPal(house);
  const f = key === 'harvester' || key === 'skylifter' ? frame & 7 : frame & 3;
  return rtsUCached('u' + key + house + dir8 + '/' + f + '@' + res, () =>
    rtsUModelCanvas(rtsUBodyParts(m, f, res, house, pal), m.size * res, dir8, { f, res, k: (m.k || 1) * res, pal, shadow: rtsUShadowOf(m, res) }));
}
// a separate turret (16x16, 32x32 at res 2, centred) for the turreted tanks; null for the rest
function rtsTurretArt(key, house, dir8, firing, res) {
  const m = RTS_U_MODEL[key];
  if (!m || !m.turret) return null;
  res = rtsURes(res);
  dir8 = ((dir8 | 0) % 8 + 8) % 8;
  const fire = !!firing, pal = rtsUPal(house);
  return rtsUCached('t' + key + house + dir8 + (fire ? 'F' : '') + '@' + res, () =>
    rtsUModelCanvas(m.turret(fire, res > 1, house, pal), 16 * res, dir8, { f: 0, res, k: res, pal, shadow: [res, res] }));
}
// a dying foot soldier (frame 0..5), 16x16 (32x32 at res 2)
function rtsInfantryDeathArt(key, house, frame, res) {
  res = rtsURes(res);
  frame = Math.max(0, Math.min(5, frame | 0));
  return rtsUCached('d' + key + house + frame + '@' + res, () => rtsUInfDeathCanvas(RTS_U_INF.includes(key) ? key : 'soldier', rtsUPal(house), frame, res));
}

// a burning wreck: the vehicle's burnt-out hulk (body and turret knocked askew), flames and smoke (frame 0..7,
// loops); optional dir8 (default 3) to match how it died; the unit's size (x2 at res 2)
function rtsWreckArt(key, frame, dir8 = 3, res) {
  res = rtsURes(res);
  frame = ((frame | 0) % 8 + 8) % 8; dir8 = ((dir8 == null ? 3 : dir8 | 0) % 8 + 8) % 8;
  if (RTS_U_INF.includes(key)) return rtsInfantryDeathArt(key, 'nomad', 5, res);
  const m = RTS_U_MODEL[key] || RTS_U_MODEL.tank;
  return rtsUCached('w' + key + dir8 + '/' + frame + '@' + res, () => {
    const hd = res > 1, S = m.size * res;
    const char = hd ? ['#A09080', '#6C6058', '#544A44', '#3C3430', '#28221E', '#161210'] : ['#6C6058', '#4C4440', '#342C28', '#1C1814'];
    const rust = ['#8C5434', '#6C3C24'];
    const recolour = (c, lx, ly) => {
      const [r, g, bb] = rtsURgb(c), l = (r * 0.3 + g * 0.59 + bb * 0.11) / 255;
      if (hd) {
        // charred: the shape kept by its light and shade, sooty patches, rust, a few embers still glowing
        const e = rtsUHash(Math.floor(lx * 2) + 77, Math.floor(ly * 2) + 33);
        if (e > 0.988) return frame % 4 < 2 ? '#F87818' : '#C83000';
        if (e > 0.968) return frame % 4 < 2 ? '#A82000' : '#701808';
        const soot = rtsUNoise(lx * 0.7 + 3, ly * 0.7, 9);
        const i = Math.min(5, (l > 0.75 ? 0 : l > 0.55 ? 1 : l > 0.38 ? 2 : l > 0.24 ? 3 : l > 0.12 ? 4 : 5) + (soot < 0.3 ? 1 : 0));
        if (soot > 0.72 && i >= 1 && i <= 3) return rust[i > 2 ? 1 : 0];
        return char[i];
      }
      const n = Math.sin(lx * 3.1 + ly * 1.7) + Math.sin(lx * 1.3 - ly * 2.9);
      if (n > 1.55) return frame % 4 < 2 ? '#E45C10' : '#881400';   // glowing embers
      return char[l > 0.7 ? 0 : l > 0.45 ? 1 : l > 0.25 ? 2 : 3];
    };
    const b = rtsUBuf(S, S);
    if (hd) {   // a scorch on the ground under it
      const c = S / 2, rx = S * 0.46, ry = S * 0.4, r0 = rtsURand(key.length * 7 + dir8);
      for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
        const x = (i + 0.5 - c) / rx, y = (j + 0.5 - c) / ry, d = Math.hypot(x, y) + 0.12 * rtsUWobF(Math.atan2(y, x), 70 + dir8);
        if (d > 1 || rtsUBayer(i, j) > (1 - d) * 1.6) continue;
        rtsUPut(b, i, j, '#000000', d < 0.6 ? 70 : 40);
      }
      for (let k = 0; k < 6; k++) rtsUPut(b, S * (0.15 + r0() * 0.7), S * (0.15 + r0() * 0.7), '#201810');
    }
    const o = { w: S, h: S, cx: S / 2, cy: S / 2, k: (m.k || 1) * res, res, ang: dir8 * Math.PI / 4, f: 0, pal: ['#808080', '#606060', '#404040'], recolour, shadow: [res, res], into: b };
    const parts = m.body(0, hd, 'nomad', o.pal).filter(p => !(p && (p.sh === 'f' || p.t === 'x') && /^#F/.test(String(p.m || p.c))) && !(p && p.t === 'st'));
    rtsURaster(parts, o);
    if (m.turret) {
      const tparts = m.turret(false, hd, 'nomad', o.pal).filter(p => !(p && p.t === 'x' && /^#F/.test(String(p.c))));
      rtsURaster(tparts, Object.assign({}, o, { into: b, shadow: hd ? [res, res] : null, ang: ((dir8 + 1) & 7) * Math.PI / 4, cx: S / 2 + (hd ? 1 : 0), cy: S / 2 + (hd ? 1 : 0) }));
    }
    // flames licking up from two spots, and smoke going up and off
    const r = rtsURand(key.length * 13 + 5), u = m.size;
    const spots = [[u / 2 - 2 + Math.floor(r() * 3), u / 2 + 1], [u / 2 + 2, u / 2 - 2 + Math.floor(r() * 2)]].map(([x, y]) => [x * res, y * res]);
    spots.forEach(([x, y], i) => rtsUFlame(b, x, y, hd ? 6 + (u > 16 ? 3 : 0) - i * 2 : 4 + (u > 16 ? 2 : 0), hd ? 10 + (u > 16 ? 4 : 0) - i * 2 : 6 + (u > 16 ? 2 : 0), frame + i * 3, i + 3, res));
    if (hd) rtsUFlame(b, S / 2 - 4, S / 2 + 6, 3, 6, frame + 5, 9, res);
    for (let k = 0; k < (hd ? 4 : 3); k++) {
      const t = ((frame + k * (hd ? 2 : 2.7)) % 8) / 8, sx = spots[k % 2][0] + t * 3 * res, sy = spots[k % 2][1] - 4 * res - t * (S / 2 - 3 * res);
      rtsUPuff(b, sx, sy, (1 + t * 2.2) * res, 1 - t, k, res);
    }
    return rtsUCanvas(b);
  });
}
// flames: columns of fire from (cx, by) up to h high, w wide, loops over 8 frames; finer bands at res 2
function rtsUFlame(b, cx, by, w, h, frame, seed, res = 1) {
  const ph = (frame % 8) / 8 * Math.PI * 2, r = rtsURand(seed * 17 + 3), p1 = r() * 6, p2 = r() * 6, F = RTS_U_C.fire;
  const hw = Math.ceil(w / 2);
  for (let i = -hw; i <= hw; i++) {
    const u = i / (w / 2 + 0.5), env = Math.max(0, 1 - u * u), ii = i / res;
    const hh = h * env * (0.65 + 0.2 * Math.sin(ph + ii * 1.7 + p1) + 0.15 * Math.sin(2 * ph - ii * 2.3 + p2));
    for (let y = 0; y < hh; y++) {
      let v = y / Math.max(1, hh);
      if (res > 1) {
        // tongues: the edge columns burn redder, a dither between the bands
        v += (rtsUBayer(cx + i, by - y) - 0.5) * 0.18 + Math.abs(u) * 0.22;
        const c = v < 0.12 ? 0 : v < 0.3 ? 1 : v < 0.5 ? 2 : v < 0.72 ? 3 : v < 0.9 ? 4 : 5;
        if (c === 0 && Math.abs(u) > 0.3) { rtsUPut(b, cx + i, by - y, F[1]); continue; }
        rtsUPut(b, cx + i, by - y, F[c]);
        continue;
      }
      const c = v < 0.25 ? 1 : v < 0.55 ? 2 : v < 0.85 ? 3 : 4;
      rtsUPut(b, cx + i, by - y, F[Math.abs(u) > 0.7 && c < 3 ? c + 1 : c]);
    }
  }
  // sparks
  const sy = by - h - ((frame * 2 + seed) % 4) * res, sx = cx + ((frame + seed) % 3 - 1) * res;
  rtsUPut(b, sx, sy, F[2]);
  if (res > 1) { rtsUPut(b, sx + 1, sy + 1, F[3]); rtsUPut(b, cx - ((frame + seed * 2) % 5 - 2) * 2, by - h * 0.8 - ((frame * 3 + seed) % 5) * 2, F[1]); }
}
// a soft puff of smoke (radius r, opacity a 0..1); at res 2 four shades, lit from the top-left
function rtsUPuff(b, cx, cy, r, a, seed = 0, res = 1) {
  const S = RTS_U_C.smoke;
  for (let j = Math.floor(cy - r - 1); j <= cy + r + 1; j++) for (let i = Math.floor(cx - r - 1); i <= cx + r + 1; i++) {
    const x = i + 0.5 - cx, y = j + 0.5 - cy, d = Math.hypot(x, y) / Math.max(0.6, r);
    if (d > 1) continue;
    if (rtsUBayer(i + seed, j) > a * (1.2 - d * 0.5)) continue;
    if (res > 1) {
      const l = (x + y) / (r * 1.41) + d * 0.3;
      rtsUPut(b, i, j, l < -0.45 ? S[0] : l < -0.05 ? S[1] : l < 0.45 ? S[2] : S[3]);
      continue;
    }
    const lit = x + y < -r * 0.3;
    rtsUPut(b, i, j, lit ? S[1] : d > 0.7 ? S[3] : S[2]);
  }
}

// ------------------------------------------------------------------ shots
const RTS_U_SHOT = {
  bullet: {
    size: 8, ol: false, parts: (f, hd) => hd
      ? [rtsUL(0, 0.5, 0, 3.5, 0.6, RTS_U_C.fire[3], 'f'), rtsUL(0, -1, 0, 1.5, 0.8, RTS_U_C.fire[f & 1 ? 2 : 1], 'f'), rtsUL(0, -1.2, 0, 0, 0.6, '#FFFFFF', 'f')]
      : [rtsUL(0, -1, 0, 1.5, 1, f & 1 ? RTS_U_C.fire[1] : RTS_U_C.fire[0], 'f'), rtsUL(0, 1.5, 0, 2.5, 1, RTS_U_C.fire[3], 'f')],
  },
  shell: {
    size: 8, parts: (f, hd) => hd
      ? [rtsUL(0, 0.5, 0, 3.5, 1, RTS_U_C.fire[f & 1 ? 4 : 3], 'f'), rtsUL(0, 0.5, 0, 2, 0.7, RTS_U_C.fire[2], 'f'), rtsUE(0, 0, 1.1, 1.1, ['#FCFCFC', '#FCE4A0', '#F8B800'], 'd')]
      : [rtsUL(0, 1, 0, 3, 1, RTS_U_C.fire[f & 1 ? 3 : 2], 'f'), rtsUE(0, 0, 1.1, 1.1, ['#FCFCFC', '#FCE4A0', '#F8B800'], 'd')],
  },
  heavy: {
    size: 12, parts: (f, hd) => hd
      ? [rtsUL(0, 1, 0, 5.5, 1.8, RTS_U_C.fire[f & 1 ? 4 : 5], 'f'), rtsUL(0, 1, 0, 4, 1.1, RTS_U_C.fire[3], 'f'), rtsUL(0, 1, 0, 2.5, 0.6, RTS_U_C.fire[2], 'f'), rtsUE(0, 0, 1.6, 1.8, ['#FCFCFC', '#FCE4A0', '#E45C10'], 'd'), rtsUDot(-0.5, -0.8, '#FFFFFF')]
      : [rtsUL(0, 1, 0, 4.5, 1.6, RTS_U_C.fire[f & 1 ? 3 : 4], 'f'), rtsUE(0, 0, 1.6, 1.8, ['#FCFCFC', '#FCE4A0', '#E45C10'], 'd')],
  },
  rocket: {
    size: 16, parts: (f, hd) => {
      const out = [
        rtsUE(0, 4 + (f & 1), 0.9, 1.5 + (f & 1) * 0.5, RTS_U_C.fire[3], 'f'), rtsUE(0, 3.6, 0.6, 0.8, RTS_U_C.fire[1], 'f'),
        rtsUL(0, -2, 0, 2.5, 1.2, RTS_U_C.met), rtsUL(0, -3, 0, -2, 1.2, RTS_U_C.red, 'f'),
      ];
      if (hd) out.push(rtsUP([[-0.6, 1.2], [-1.4, 2.8], [1.4, 2.8], [0.6, 1.2]], RTS_U_C.gun), rtsUL(0, -2, 0, 2.5, 1.2, RTS_U_C.met), rtsUX([[0, -0.4], [0, 0.6]], '#303030'), rtsUL(0, -3.2, 0, -2, 1.2, RTS_U_C.red, 'f'), rtsUE(0, 3.6, 0.35, 0.5, '#FFFFFF', 'f'));
      return out;
    }, trail: 'rocket',
  },
  missile: {
    size: 16, parts: (f, hd) => {
      const out = [
        rtsUE(0, 5 + (f & 1) * 0.5, 1.2, 2 + (f & 1) * 0.6, RTS_U_C.fire[3], 'f'), rtsUE(0, 4.5, 0.7, 1, RTS_U_C.fire[1], 'f'),
        rtsUP([[-0.8, 1.5], [-2, 3.5], [2, 3.5], [0.8, 1.5]], RTS_U_C.gun),
        rtsUR(-1, -3, 1, 3.5, RTS_U_C.met, 'b'), rtsUP([[0, -5], [1, -3], [-1, -3]], RTS_U_C.red),
      ];
      if (hd) out.push(rtsUP([[-0.6, -1.5], [-1.6, -0.5], [-0.6, -0.5]], RTS_U_C.gun), rtsUP([[0.6, -1.5], [1.6, -0.5], [0.6, -0.5]], RTS_U_C.gun), rtsUX([[-0.5, 0.8], [0.5, 0.8]], '#303030'), rtsUX([[-0.5, 1.4], [0.5, 1.4]], RTS_U_C.yel[1]), rtsUE(0, 4.6, 0.4, 0.6, '#FFFFFF', 'f'));
      return out;
    }, trail: 'missile',
  },
  plasma: {
    size: 16, ol: false, parts: (f, hd) => {
      const p = [1, 1.25, 1.45, 1.2][f & 3];
      const out = [
        rtsUE(0.5, 3.5, 0.9 * p, 1.8, RTS_U_C.pla[2], 'f'),
        rtsUE(0, 0, 3 * p, 3 * p, '#8800B0', 'f'), rtsUE(0, 0, 2.3 * p, 2.3 * p, RTS_U_C.pla[2], 'f'),
        rtsUE(0, 0, 1.5 * p, 1.5 * p, RTS_U_C.pla[1], 'f'), rtsUE(-0.3, -0.3, 0.8 * p, 0.8 * p, '#FFFFFF', 'f'),
      ];
      if (hd) {
        out.splice(1, 0, rtsUE(-0.4, 5, 0.6, 1.2, '#8800B0', 'f'), rtsUE(0.2, 6.5, 0.4, 0.6, '#8800B0', 'f'));
        // crackles round the ball
        const r = rtsURand(f + 3);
        for (let k = 0; k < 4; k++) { const a = r() * 6.283, d = 3.2 * p + r() * 0.8; out.push(rtsUDot(Math.cos(a) * d, Math.sin(a) * d, k & 1 ? RTS_U_C.pla[1] : '#FFFFFF', true)); }
      }
      return out;
    },
  },
  sonic: {
    size: 16, ol: false, parts: (f, hd) => {
      const out = [];
      const n = hd ? 5 : 3, step = hd ? 1.25 : 2, wdt = hd ? 0.6 : 1;
      for (let k = 0; k < n; k++) {
        const R = 3 + k * step - (f & 3) * 0.5;
        if (R < 1) continue;
        const c = hd ? [RTS_U_C.cya[0], RTS_U_C.cya[0], RTS_U_C.cya[1], RTS_U_C.cya[2], RTS_U_C.cya[2]][k] : k === 0 ? RTS_U_C.cya[0] : k === 1 ? RTS_U_C.cya[1] : RTS_U_C.cya[2];
        out.push(rtsUF((x, y) => {
          const d = Math.hypot(x, y - 5);
          return d >= R && d < R + wdt && Math.abs(Math.atan2(x, -(y - 5))) < 0.9 - k * (hd ? 0.06 : 0);
        }, c, 'f', 0, 5 - R, R + 1));
      }
      return out;
    },
  },
  gas: {
    size: 12, parts: (f, hd) => {
      const a = (f & 3) * Math.PI / 4, c = Math.cos(a), s = Math.sin(a);
      const out = [
        rtsUE(0.5, 3.5, 1.5, 1.5, RTS_U_C.grn[2], 'f'), rtsUE(-0.5, 2.6, 1, 1, RTS_U_C.grn[1], 'f'),
        rtsUL(-1.6 * s, -1.6 * c, 1.6 * s, 1.6 * c, 2.2, RTS_U_C.gun),
        rtsUE(1.2 * s, 1.2 * c, 0.9, 0.9, RTS_U_C.grn[0], 'f'),
      ];
      if (hd) out.splice(2, 0, rtsUE(-0.3, 4.6, 0.8, 0.8, RTS_U_C.grn[1], 'f'), rtsUE(0.8, 5.2, 0.5, 0.5, RTS_U_C.grn[0], 'f')), out.push(rtsUX([[-0.4 * s - 0.9 * c, -0.4 * c + 0.9 * s], [-0.4 * s + 0.9 * c, -0.4 * c - 0.9 * s]], RTS_U_C.yel[1]));
      return out;
    },
  },
  doomfist: { size: 24, parts: (f, hd) => rtsUDoomParts(f, hd), trail: 'doom' },
};
// a shot flying in direction dir8 (frame 0..3 loops), centred; sizes: bullet/shell 8, heavy/gas 12, others 16,
// doomfist 24 (x2 at res 2)
function rtsShotArt(kind, dir8, frame, res) {
  const s = RTS_U_SHOT[kind] || RTS_U_SHOT.shell;
  res = rtsURes(res);
  dir8 = ((dir8 | 0) % 8 + 8) % 8; frame = ((frame | 0) % 4 + 4) % 4;
  return rtsUCached('s' + kind + dir8 + '/' + frame + '@' + res, () => {
    const N = s.size * res, b = rtsUBuf(N, N), [dx, dy] = RTS_U_DIRS[dir8], L = Math.hypot(dx, dy);
    // a smoke trail behind rockets and missiles
    if (s.trail) {
      const n = (s.trail === 'rocket' ? 3 : s.trail === 'missile' ? 4 : 5) + (res > 1 ? 2 : 0), step = (s.trail === 'doom' ? 2.4 : 1.6) * (res > 1 ? 0.8 : 1);
      for (let k = 0; k < n; k++) {
        const d = ((s.trail === 'doom' ? 9 : 5.5) + k * step + (frame & 1) * 0.5) * res;
        const r0 = ((s.trail === 'doom' ? 2 : s.trail === 'missile' ? 1.5 : 1.2) + k * 0.4) * res * (res > 1 ? 0.85 : 1);
        rtsUPuff(b, N / 2 - dx / L * d, N / 2 - dy / L * d, r0, 1 - k * (res > 1 ? 0.11 : 0.16), k + frame, res);
      }
    }
    rtsURaster(s.parts(frame, res > 1), { w: N, h: N, cx: N / 2, cy: N / 2, k: res, res, cast: false, ang: dir8 * Math.PI / 4, f: frame, pal: RTS_U_PAL.nomad, outline: s.ol !== false, into: b, shadow: null });
    return rtsUCanvas(b);
  });
}

// ------------------------------------------------------------------ effects
const RTS_FX_FRAMES = { hit: 4, boom: 8, bigboom: 12, smoke: 8, fire: 8, sand: 6, muzzle: 3, gasCloud: 10, sonicWave: 8, glimmerBurst: 10 };
const RTS_U_FX_SIZE = { hit: 8, boom: 24, bigboom: 48, smoke: 16, fire: 16, sand: 16, muzzle: 8, gasCloud: 32, sonicWave: 32, glimmerBurst: 32 };
// at res 2 an effect also has in-between frames: rtsFxArt(kind, 2.5, 2) is half way from frame 2 to frame 3
const RTS_U_FX_SUB = 2;
// a fireball at (cx, cy): its radius R, its age t (0 flash .. 1 gone), ragged by seed; sc the resolution (finer
// billows, a dark red rim and lit smoke at 2)
function rtsUFireball(b, cx, cy, R, t, seed, sc = 1) {
  const hd = sc > 1, F = RTS_U_C.fire, SM = RTS_U_C.smoke, Wb = hd ? rtsUWobF : rtsUWob;
  const grow = Math.min(1, 0.3 + t * 3.2), Rc = R * grow, heat0 = Math.max(0, 1.25 - t * 1.5);
  const smokeT = Math.max(0, (t - 0.25) / 0.75);
  for (let j = Math.floor(cy - R * 1.4); j <= cy + R * 1.4; j++) for (let i = Math.floor(cx - R * 1.4); i <= cx + R * 1.4; i++) {
    const x = i + 0.5 - cx, y = j + 0.5 - cy - smokeT * R * 0.25, d = Math.hypot(x, y), th = Math.atan2(y, x);
    const rr = Rc * (1 + 0.22 * Wb(th, seed, t) + (hd ? 0.07 * Wb(th * 2 + 1, seed + 11, t) : 0));
    if (d > rr) continue;
    let v = (1 - d / rr) * heat0 + (rtsUBayer(i, j) - 0.5) * (hd ? 0.14 : 0.18) + 0.1 * Wb(th * 2 + d / sc, seed + 3, t);
    // billows inside (a smooth noise drifting up as it burns)
    const nz = hd ? rtsUNoise(x / (2.6 * sc), (y + t * 6 * sc) / (2.6 * sc), seed) - 0.5 : 0;
    if (hd) v += 0.3 * nz;
    // smoke rolls in from the edge as it cools
    const sm = smokeT > 0 && (d / rr) > 1 - smokeT * 1.3 + (hd ? 0.35 * nz : 0);
    if (sm) {
      if (rtsUBayer(i, j) < smokeT * smokeT * 0.9) continue;
      if (hd) {
        const l = (x + y) / (rr * 1.41) + 0.9 * (rtsUNoise(x / (2 * sc), y / (2 * sc), seed + 5) - 0.5) - 0.6 * nz;
        rtsUPut(b, i, j, l < -0.4 ? SM[1] : l < 0 ? SM[2] : l < 0.4 ? SM[3] : SM[4]);
        continue;
      }
      const lit = x + y < -rr * 0.2;
      rtsUPut(b, i, j, lit ? SM[2] : d / rr > 0.8 ? SM[4] : SM[3]);
      continue;
    }
    if (hd && v < 0.05 && smokeT > 0) { rtsUPut(b, i, j, '#5C1408'); continue; }
    rtsUPut(b, i, j, v > 0.9 ? F[0] : v > 0.7 ? F[1] : v > 0.5 ? F[2] : v > 0.3 ? F[3] : v > 0.12 ? F[4] : F[5]);
  }
}
// bits flung out (at res 2 chunks with glowing trails)
function rtsUDebris(b, cx, cy, R, t, seed, n, sc = 1) {
  const r = rtsURand(seed);
  for (let k = 0; k < n; k++) {
    const a = r() * Math.PI * 2, sp = R * (0.6 + r() * 0.7), hgt = r();
    const at = tt => {
      const d = sp * Math.min(1, tt * 1.6);
      return [cx + Math.cos(a) * d, cy + Math.sin(a) * d - Math.sin(Math.min(1, tt * 1.6) * Math.PI) * R * 0.4 * hgt];
    };
    if (t > 0.85) continue;
    const [x, y] = at(t);
    if (sc > 1) {
      for (let q = 3; q >= 1; q--) {
        const [px, py] = at(Math.max(0, t - q * 0.03));
        rtsUPut(b, px, py, t < 0.4 ? RTS_U_C.fire[q > 1 ? 3 : 2] : RTS_U_C.smoke[q > 1 ? 3 : 2], q > 2 ? 140 : 255);
      }
      const c = t < 0.35 ? RTS_U_C.fire[1] : k % 2 ? RTS_U_C.smoke[4] : RTS_U_C.fire[4];
      rtsUPut(b, x, y, c);
      if (k % 3 === 0) { rtsUPut(b, x + 1, y, c); rtsUPut(b, x + 1, y + 1, k % 2 ? '#181818' : RTS_U_C.fire[5]); }
      continue;
    }
    rtsUPut(b, x, y, t < 0.35 ? RTS_U_C.fire[1] : k % 2 ? RTS_U_C.smoke[4] : RTS_U_C.fire[4]);
  }
}
// a ring (sc thick) of dithered dots round (cx, cy)
function rtsURing(b, cx, cy, R, sy, keep, cols, sc = 1) {
  const n = Math.ceil(R * 7 + 20);
  for (let a = 0; a < n; a++) {
    const th = a / n * Math.PI * 2;
    for (let w = 0; w < sc; w++) {
      const x = cx + Math.cos(th) * (R - w), y = cy + Math.sin(th) * (R - w) * sy;
      if (rtsUBayer(Math.floor(x), Math.floor(y)) > keep) continue;
      rtsUPut(b, x, y, cols[Math.min(cols.length - 1, w)], 220);
    }
  }
}
function rtsUFx(kind, f, res = 1) {
  const sc = res, hd = res > 1, N = RTS_U_FX_SIZE[kind] * sc, b = rtsUBuf(N, N), n = RTS_FX_FRAMES[kind], t = f / Math.max(1, n - 1), c = N / 2;
  const F = RTS_U_C.fire, SM = RTS_U_C.smoke;
  switch (kind) {
    case 'hit': {
      if (hd) {
        // a white-hot spark, rays shooting out and fading, bits flying, a wisp of smoke
        if (t < 0.8) {
          const L = (2 + 5 * Math.sin(Math.min(1, t * 2) * Math.PI / 2)) * (1 - t * 0.5), hot = t < 0.3 ? 0 : t < 0.55 ? 1 : 2;
          RTS_U_DIRS.forEach(([dx, dy], k) => {
            const len = (dx && dy ? 0.6 : 1) * L * (k % 2 ? 0.9 : 1);
            for (let s = 0; s <= len; s++) rtsUPut(b, c - 0.5 + dx * s, c - 0.5 + dy * s, F[Math.min(5, hot + (s / len > 0.65 ? 2 : s / len > 0.3 ? 1 : 0))]);
          });
          const cr = Math.max(0.6, 1.8 - t * 1.6);
          for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) if (Math.hypot(i + 0.5, j + 0.5) <= cr + 0.3) rtsUPut(b, c - 1 + i + 0.5, c - 1 + j + 0.5, hot ? F[hot] : F[0]);
          const r = rtsURand(5);
          for (let k = 0; k < 5; k++) {
            const a = r() * 6.283, d = 2 + t * 9 * (0.6 + r() * 0.6);
            rtsUPut(b, c + Math.cos(a) * d, c + Math.sin(a) * d + t * t * 3, F[t < 0.4 ? 1 : 3]);
            rtsUPut(b, c + Math.cos(a) * (d - 1), c + Math.sin(a) * (d - 1) + t * t * 3, F[4], 160);
          }
        }
        if (t > 0.55) rtsUPuff(b, c + 0.5, c - (t - 0.55) * 6, 2 + (t - 0.55) * 7, 1.3 - t, 2, 2);
        break;
      }
      f = Math.round(f);
      const P = [[F[0], F[1]], [F[1], F[2]], [F[3], F[4]], [SM[2], SM[3]]][f];
      const r = [1, 2.5, 2, 1.5][f];
      rtsUPut(b, 3, 3, P[0]); rtsUPut(b, 4, 4, P[0]); rtsUPut(b, 3, 4, P[0]); rtsUPut(b, 4, 3, P[0]);
      if (f < 3) for (const [dx, dy] of RTS_U_DIRS) { const k = (dx && dy) ? r * 0.7 : r; rtsUPut(b, 3.5 + dx * k, 3.5 + dy * k, P[1]); }
      else rtsUPuff(b, 4, 3.5, 2, 0.8);
      break;
    }
    case 'muzzle': {
      if (hd) {
        // a four-pointed star with lesser diagonal spikes, shrinking and reddening, then a wisp
        const r = 7.2 * (1 - t * 0.55), heat = t * 2;
        for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
          const x = i + 0.5 - c, y = j + 0.5 - c, d = Math.hypot(x, y);
          const ax = Math.min(Math.abs(x), Math.abs(y)), dg = Math.min(Math.abs(x - y), Math.abs(x + y)) * 0.707;
          const e = d / r + Math.min(ax * 0.55, dg * 0.35 + 0.25) - 0.05 + (rtsUBayer(i, j) - 0.5) * 0.12;
          if (e > 1) continue;
          const k = Math.min(5, Math.floor(e * 3.2 + heat));
          rtsUPut(b, i, j, F[k]);
        }
        if (t >= 0.9) rtsUPuff(b, c + 1, c - 1, 3, 0.6, 1, 2);
        break;
      }
      f = Math.round(f);
      const r = [3.4, 2.4, 1.4][f];
      for (let j = 0; j < 8; j++) for (let i = 0; i < 8; i++) {
        const x = i + 0.5 - c, y = j + 0.5 - c, d = Math.hypot(x, y), star = Math.min(Math.abs(x), Math.abs(y), Math.abs(x - y) * 0.7, Math.abs(x + y) * 0.7);
        const e = d / r - (star < 0.6 ? 0.4 : 0);
        if (e > 1) continue;
        rtsUPut(b, i, j, e < 0.35 ? F[0] : e < 0.7 ? F[f ? 2 : 1] : F[f ? 3 : 2]);
      }
      break;
    }
    case 'boom':
      if (hd && t < 0.12) {   // the flash: a white burst with rays
        for (let a = 0; a < 16; a++) {
          const th = a / 16 * Math.PI * 2, L = (a % 2 ? 14 : 20) * (1 - t * 3);
          for (let s = 4; s < L; s++) rtsUPut(b, c + Math.cos(th) * s, c + Math.sin(th) * s, s < L * 0.5 ? F[1] : F[2]);
        }
      }
      if (hd && t > 0.15 && t < 0.7) rtsURing(b, c, c + 2, 10 + t * 26, 0.7, 0.75 - t, ['#E8C890', '#B88850'], 2);
      rtsUFireball(b, c, c, 8.5 * sc, t, 11, sc);
      if (f >= 1 && f <= 4) rtsUFireball(b, c + 4 * sc, c - 3 * sc, 4 * sc, Math.max(0, t * 1.4 - 0.15), 5, sc);
      if (hd && f >= 0.5 && f <= 3.5) rtsUFireball(b, c - 5 * sc, c + 3 * sc, 3.5 * sc, Math.max(0, t * 1.6 - 0.05), 6, sc);
      rtsUDebris(b, c, c, 11 * sc, t, 9, hd ? 16 : 10, sc);
      break;
    case 'bigboom': {
      // three blasts going off one after the other, a shock ring and a lot of junk
      if (f >= 1 && f <= 5) {
        const rr = (6 + f * 4) * sc;
        if (hd) rtsURing(b, c, c, rr, 0.85, 0.35 + f * 0.1 > 0.9 ? 0.1 : 1 - (0.35 + f * 0.1), [f < 3 ? '#FCE8C0' : '#C89858', f < 3 ? '#C89858' : '#A07038'], 2);
        else for (let a = 0; a < 96; a++) {
          const th = a / 96 * Math.PI * 2, x = c + Math.cos(th) * rr, y = c + Math.sin(th) * rr * 0.85;
          if (rtsUBayer(Math.floor(x), Math.floor(y)) < 0.35 + f * 0.1) continue;
          rtsUPut(b, x, y, f < 3 ? RTS_U_C.sand[0] : RTS_U_C.sand[2], 200);
        }
      }
      if (hd && t < 0.1) for (let a = 0; a < 24; a++) {
        const th = a / 24 * Math.PI * 2, L = (a % 2 ? 30 : 44) * (1 - t * 5);
        for (let s = 8; s < L; s++) rtsUPut(b, c + Math.cos(th) * s, c + Math.sin(th) * s, s < L * 0.6 ? F[1] : F[2]);
      }
      rtsUFireball(b, c - 6 * sc, c + 4 * sc, 11 * sc, Math.max(0, Math.min(1, (f - 2) / 9)), 21, sc);
      rtsUFireball(b, c + 7 * sc, c - 5 * sc, 10 * sc, Math.max(0, Math.min(1, (f - 1) / 9)), 22, sc);
      if (hd) rtsUFireball(b, c + 8 * sc, c + 7 * sc, 7 * sc, Math.max(0, Math.min(1, (f - 3) / 8)), 25, sc);
      rtsUFireball(b, c, c, 16 * sc, t, 23, sc);
      rtsUDebris(b, c, c, 22 * sc, t, 24, hd ? 34 : 22, sc);
      break;
    }
    case 'smoke': {
      // a puff rising and spreading while it thins out
      const r = (2.6 + t * 4) * sc, y = c + (3 - t * 5) * sc, a = 1.1 - t * 0.85;
      rtsUPuff(b, c - t * 1.5 * sc, y + sc, r * 0.8, a, 1, res);
      rtsUPuff(b, c + 1.5 * sc, y - sc, r * 0.7, a * 0.9, 2, res);
      rtsUPuff(b, c, y - r * 0.4, r * 0.75, a, 3, res);
      if (hd) rtsUPuff(b, c - 2 * sc + t * 2 * sc, y - r * 0.8, r * 0.5, a * 0.85, 4, res);
      break;
    }
    case 'fire':
      if (hd) {
        rtsUFlame(b, c - 7, 27, 7, 15, f, 1, 2);
        rtsUFlame(b, c + 7, 27, 7, 17, f + 3, 2, 2);
        rtsUFlame(b, c, 29, 10, 24, f + 5, 3, 2);
        rtsUFlame(b, c - 11, 29, 4, 8, f + 2, 4, 2);
        rtsUFlame(b, c + 11, 29, 4, 7, f + 6, 5, 2);
        break;
      }
      rtsUFlame(b, c - 3, 13, 4, 8, f, 1);
      rtsUFlame(b, c + 3, 13, 4, 9, f + 3, 2);
      rtsUFlame(b, c, 14, 5, 12, f + 5, 3);
      break;
    case 'sand': {
      // a low puff of sand thrown out to the sides, grains falling
      const S = ['#FCE8C0', '#C89858', '#A07038', '#E0B880'], rx = (2.5 + t * 5.5) * sc, ry = (1.8 + t * 2.5) * sc, a = 1.15 - t * 0.8;
      for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
        const x = (i + 0.5 - c) / rx, y = (j + 0.5 - c - (2 - t * 2) * sc) / ry, d = x * x + y * y + 0.3 * (hd ? rtsUWobF : rtsUWob)(Math.atan2(y, x), 4, t);
        if (d > 1 || rtsUBayer(i, j) > a * (1.3 - d * 0.6)) continue;
        rtsUPut(b, i, j, x + y < -0.4 ? S[0] : hd && x + y < 0.1 ? S[3] : d > 0.65 ? S[2] : S[1]);
      }
      const r = rtsURand(77);
      for (let k = 0; k < (hd ? 14 : 8); k++) {
        const ang = r() * Math.PI * 2, sp = (3 + r() * 4) * sc;
        if (t < 0.9) rtsUPut(b, c + Math.cos(ang) * sp * (0.3 + t), c + sc + Math.sin(ang) * sp * 0.5 * (0.3 + t) - Math.sin(t * Math.PI) * 3 * sc, hd && k % 3 === 0 ? S[1] : S[2]);
      }
      break;
    }
    case 'gasCloud': {
      // green blobs swelling and swirling, then thinning out
      const G = ['#E0FCC0', '#A8F088', '#58D854', '#00A800', '#005800'];
      const grow = Math.min(1, 0.35 + t * 1.6), a = t < 0.6 ? 1 : 1 - (t - 0.6) / 0.45;
      for (let k = 0; k < (hd ? 8 : 6); k++) {
        const ang = k * (hd ? 0.8 : 1.05) + t * 1.6, dist = (k ? (hd && k > 5 ? 9 : 6) : 0) * grow * sc, R = (k ? (hd && k > 5 ? 4 : 5.5) : 8) * grow * sc;
        const bx = c + Math.cos(ang) * dist, by = c + Math.sin(ang) * dist * 0.85;
        for (let j = Math.floor(by - R); j <= by + R; j++) for (let i = Math.floor(bx - R); i <= bx + R; i++) {
          const x = i + 0.5 - bx, y = j + 0.5 - by, d = Math.hypot(x, y) / R;
          if (d > 1 + 0.15 * (hd ? rtsUWobF : rtsUWob)(Math.atan2(y, x), k + 40, t) || rtsUBayer(i + k, j) > a * (1.25 - d * 0.5)) continue;
          const l = (x + y) / (R * 1.41);
          rtsUPut(b, i, j, hd ? (l < -0.5 ? G[0] : l < -0.2 ? G[1] : d < 0.45 ? G[2] : d < 0.8 ? G[3] : G[4]) : x + y < -R * 0.35 ? G[1] : d < 0.4 ? G[2] : d < 0.8 ? G[3] : G[4]);
        }
      }
      // bright motes in it
      const r = rtsURand(91 + (hd ? Math.floor(f * 2) + 1000 : f));
      for (let k = 0; k < 5 * a * (hd ? 2 : 1); k++) {
        const x = c + (r() - 0.5) * 20 * grow * sc, y = c + (r() - 0.5) * 16 * grow * sc;
        rtsUPut(b, x, y, G[0]);
        if (hd) { rtsUPut(b, x + 1, y, G[1]); rtsUPut(b, x, y + 1, G[1]); }
      }
      break;
    }
    case 'sonicWave': {
      // rings of sound going out, trembling
      const C = RTS_U_C.cya;
      for (let k = 0; k < (hd ? 4 : 3); k++) {
        const R = (2 + (f - k * (hd ? 1.65 : 2.2)) * 1.9) * sc;
        if (R < sc || R > 15.5 * sc) continue;
        const fade = 1 - R / (16 * sc);
        const m = Math.ceil(140 * sc);
        for (let a = 0; a < m; a++) {
          const th = a / m * Math.PI * 2, rr = R + 0.5 * sc * Math.sin(th * 7 + f * 1.3);
          const x = c + Math.cos(th) * rr, y = c + Math.sin(th) * rr;
          if (rtsUBayer(Math.floor(x), Math.floor(y)) > fade + 0.25) continue;
          rtsUPut(b, x, y, k === 0 ? C[0] : k === 1 ? C[1] : C[2]);
          if (k === 0 || hd) rtsUPut(b, c + Math.cos(th) * (rr - 1), c + Math.sin(th) * (rr - 1), k === 0 ? (hd ? C[1] : C[2]) : C[2], 160);
          if (hd && k === 0) rtsUPut(b, c + Math.cos(th) * (rr - 2), c + Math.sin(th) * (rr - 2), C[2], 120);
        }
      }
      break;
    }
    case 'glimmerBurst': {
      // the bulb bursts: an orange glow, a ring of sand, glimmer flung out that settles round about
      const Gl = ['#FCFCFC', '#FCE0A8', '#F8B800', '#F89838', '#E45C10', '#A83000'];
      if (f < 6) {
        const R = (f < 4 ? 3 + f * 2.5 : 10 - (f - 4) * 3) * sc;
        for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
          const d = Math.hypot(i + 0.5 - c, j + 0.5 - c) / R + (rtsUBayer(i, j) - 0.5) * 0.25 + (hd ? 0.08 * rtsUWobF(Math.atan2(j - c, i - c), 81, t) : 0);
          if (d > 1) continue;
          if (f >= 4 && rtsUBayer(i, j) < (f - 3) * 0.3) continue;
          rtsUPut(b, i, j, Gl[Math.min(5, Math.floor(d * 4) + Math.min(Math.floor(f), 3))]);
        }
      }
      if (f >= 2) {
        const rr = (4 + f * 1.4) * sc;
        if (hd) rtsURing(b, c, c, rr, 0.85, 1 - (f - 2) / 9, [f > 5 ? '#A07038' : '#C89858', '#A07038'], 2);
        else for (let a = 0; a < 90; a++) {
          const th = a / 90 * Math.PI * 2;
          if (rtsUBayer(a, f) < (f - 2) / 9) continue;
          rtsUPut(b, c + Math.cos(th) * rr, c + Math.sin(th) * rr * 0.85, f > 5 ? '#A07038' : '#C89858');
        }
      }
      const r = rtsURand(55);
      for (let k = 0; k < (hd ? 40 : 26); k++) {
        const ang = r() * Math.PI * 2, sp = (5 + r() * 9) * sc, h = (4 + r() * 6) * sc;
        const tt = Math.min(1, t * 1.3), x = c + Math.cos(ang) * sp * tt, y = c + Math.sin(ang) * sp * tt * 0.85 - Math.sin(tt * Math.PI) * h;
        if (f === 0) continue;
        const col = f > 7 ? Gl[k % 2 ? 3 : 4] : Gl[1 + (k + Math.floor(f)) % 4];
        rtsUPut(b, x, y, col);
        if (k % 2 === 0) rtsUPut(b, x + 1, y, f > 7 ? Gl[5] : Gl[3]);
        if (k % 3 === 0 && f < 7) rtsUPut(b, x, y + 1, Gl[4]);
        if (hd && f > 7 && k % 4 === 1) rtsUPut(b, x + 1, y + 1, Gl[(k + Math.floor(f * 2)) % 3]);   // glinting as it settles
      }
      break;
    }
  }
  return b;
}
// an effect's frame (RTS_FX_FRAMES[kind] frames), centred; sizes: hit, muzzle 8; smoke, fire, sand 16; boom 24;
// gasCloud, sonicWave, glimmerBurst 32; bigboom 48 (x2 at res 2). 'fire' loops; the rest play once. At res 2 the
// frame may be fractional (halves: in-between frames for a smoother play, see RTS_U_FX_SUB).
function rtsFxArt(kind, frame, res) {
  if (!RTS_FX_FRAMES[kind]) kind = 'boom';
  res = rtsURes(res);
  const n = RTS_FX_FRAMES[kind];
  frame = res > 1 ? Math.floor((+frame || 0) * RTS_U_FX_SUB) / RTS_U_FX_SUB : frame | 0;
  frame = kind === 'fire' ? ((frame % n) + n) % n : Math.max(0, Math.min(n - 1, frame));
  return rtsUCached('x' + kind + frame + '@' + res, () => rtsUCanvas(rtsUFx(kind, frame, res)));
}

// ------------------------------------------------------------------ build icons
// the desert behind a portrait: rippled sand with pebbles, a darker rock shelf in a corner, a vignette
function rtsUIconBack(b, seed) {
  const S = ['#F8D8A0', '#E8B878', '#D0A060', '#B08048'];
  const r = rtsURand(seed);
  for (let j = 0; j < b.h; j++) for (let i = 0; i < b.w; i++) {
    const w = Math.sin(i * 0.45 + j * 0.9 + Math.sin(i * 0.2 + seed) * 2.2);
    let c = w > 0.82 ? S[0] : w < -0.8 ? S[2] : S[1];
    const rock = j > b.h - 7 + Math.sin(i * 0.5 + seed) * 2 && i < 12 + seed % 5;
    if (rock) c = rtsUBayer(i, j) < 0.5 ? '#9C7C58' : '#806448';
    if (j < 4 && rtsUBayer(i, j) < (4 - j) / 6) c = S[0];
    // a vignette at the edges
    const e = Math.min(i, b.w - 1 - i, j * 1.3, (b.h - 1 - j) * 1.3);
    if (e < 4.5 && rtsUBayer(i, j) > e / 4.5) c = rtsUTint(c, -0.18);
    rtsUPut(b, i, j, c);
  }
  for (let k = 0; k < 7; k++) { const x = 3 + r() * (b.w - 6), y = 3 + r() * (b.h - 6); rtsUPut(b, x, y, '#A07850'); rtsUPut(b, x + 1, y, '#FCE8C0'); }
}
function rtsUIconFrame(b, pal, house, emblem) {
  const W = b.w, H = b.h;
  for (let i = 0; i < W; i++) { rtsUPut(b, i, 0, RTS_U_C.ol); rtsUPut(b, i, H - 1, RTS_U_C.ol); rtsUPut(b, i, 1, '#BCBCBC'); rtsUPut(b, i, H - 2, '#4C4C4C'); }
  for (let j = 0; j < H; j++) { rtsUPut(b, 0, j, RTS_U_C.ol); rtsUPut(b, W - 1, j, RTS_U_C.ol); if (j && j < H - 1) { rtsUPut(b, 1, j, '#BCBCBC'); rtsUPut(b, W - 2, j, '#4C4C4C'); } }
  rtsUPut(b, 1, H - 2, '#7C7C7C'); rtsUPut(b, W - 2, 1, '#7C7C7C');
  // the House's colour in the corners, a rivet, and (vehicles) a little House emblem in the top-left corner
  for (const [x, y] of [[W - 3, H - 3], [W - 4, H - 3], [W - 3, H - 4]]) rtsUPut(b, x, y, pal[1]);
  rtsUPut(b, 2, H - 3, '#DCDCDC'); rtsUPut(b, 3, H - 3, '#5C5C5C');
  if (!emblem) { for (const [x, y] of [[2, 2], [3, 2], [2, 3]]) rtsUPut(b, x, y, pal[1]); return; }
  const rows = RTS_U_EMBLEM[house] || RTS_U_EMBLEM.aquila, ew = rows[0].length, eh = rows.length, ex = 3, ey = 3;
  for (let j = -1; j <= eh; j++) for (let i = -1; i <= ew; i++) rtsUPut(b, ex + i, ey + j, j === eh || i === ew ? '#100808' : rtsUTint(pal[2], -0.4), 210);
  rows.forEach((row, j) => { for (let i = 0; i < ew; i++) if (row[i] === 'a') rtsUPut(b, ex + i, ey + j, rtsUTint(pal[0], 0.3)); });
}
// a unit's sidebar icon, 32x24: a framed portrait of the unit, large and in full detail, on the sand
function rtsUnitIcon(key, house) {
  return rtsUCached('n' + key + house, () => {
    const pal = rtsUPal(house), b = rtsUBuf(32, 24);
    rtsUIconBack(b, key.length * 3 + 1);
    if (RTS_U_INF.includes(key)) {
      // two soldiers side by side, drawn at the close-up resolution: one walking, one taking aim
      const tmp = rtsUBuf(32, 24);
      rtsUFootShadow(b, 10, 22, 6, 1.8); rtsUFootShadow(b, 22, 22, 6, 1.8);
      rtsUInfFigure2(tmp, key, pal, 3, 1, 2, 3);
      rtsUInfFigure2(tmp, key, pal, 5, 4, 15, 3);
      rtsUOutline(tmp);
      for (let q = 0; q < 32 * 24; q++) if (tmp.d[q * 4 + 3]) rtsUPut(b, q % 32, Math.floor(q / 32), rtsUHex(tmp.d[q * 4], tmp.d[q * 4 + 1], tmp.d[q * 4 + 2]));
    } else {
      const m = RTS_U_MODEL[key] || RTS_U_MODEL.tank, ic = m.icon || {}, k = ic.k || 1.5, dir = ic.dir == null ? 1 : ic.dir;
      const o = { w: 32, h: 24, cx: 16 + (m.air ? -1 : 0), cy: 12.5 + (m.air ? -1 : 0), k, res: 2, cast: true, ang: dir * Math.PI / 4, f: 0, pal, into: b, shadow: m.air ? [3, 3] : [1, 2] };
      rtsURaster(m.body(0, true, house, pal).filter(p => !(p && p.t === 'st')), o);
      if (m.turret) rtsURaster(m.turret(false, true, house, pal), Object.assign({}, o, { shadow: [1, 1] }));
    }
    rtsUIconFrame(b, pal, house, !RTS_U_INF.includes(key));
    return rtsUCanvas(b);
  });
}

// ------------------------------------------------------------------ warming the caches (optional)
// Everything is built on first use; the biggest res 2 pictures (the frigate, a building's blast) take ~10-20 ms
// each. rtsUWarm(res, houses, ms) builds the effects, shots and the given Houses' units a few at a time, within
// about ms milliseconds a call, so an idle loop can have them ready; it returns true when all is built.
const RTS_U_WARM = new Map();
function rtsUWarm(res = 2, houses = ['aquila', 'drakon', 'serpens'], ms = 3) {
  res = rtsURes(res);
  const key = res + houses.join(',');
  let w = RTS_U_WARM.get(key);
  if (!w) {
    const jobs = [];
    for (const k in RTS_FX_FRAMES) for (let f = 0; f < RTS_FX_FRAMES[k]; f += res > 1 ? 1 / RTS_U_FX_SUB : 1) jobs.push(() => rtsFxArt(k, f, res));
    for (const k in RTS_U_SHOT) for (let d = 0; d < 8; d++) jobs.push(() => { for (let f = 0; f < 4; f++) rtsShotArt(k, d, f, res); });
    for (const h of houses) for (const u of [...RTS_U_INF, ...Object.keys(RTS_U_MODEL)]) for (let d = 0; d < 8; d++) {
      jobs.push(() => {
        const n = RTS_U_INF.includes(u) ? 6 : u === 'harvester' || u === 'skylifter' ? 8 : 4;
        for (let f = 0; f < n; f++) rtsUnitArt(u, h, d, f, res);
        rtsTurretArt(u, h, d, false, res); rtsTurretArt(u, h, d, true, res);
      });
    }
    w = { jobs, i: 0 };
    RTS_U_WARM.set(key, w);
  }
  const t0 = performance.now();
  while (w.i < w.jobs.length && performance.now() - t0 < ms) w.jobs[w.i++]();
  return w.i >= w.jobs.length;
}
