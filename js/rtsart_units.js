'use strict';
// =====================================================================
//  DESERT DOMINION: the units' art (ART-UNITS of the shared contract). Every unit seen from above in the five
//  House palettes, eight directions and its animation frames; turrets on their own; infantry walking, shooting
//  and dying; burning wrecks; shots; explosions and the other effects; the sidebar build icons.
//  Vehicles are not bitmaps turned round: each is a list of shapes (rects, ellipses, polygons, thick lines) in
//  its own coordinates (a pixel a unit, the front up), and every sprite is rasterised fresh for its direction
//  pixel by pixel, so diagonals come out as clean pixel art. Each shape is shaded on its own with the light from
//  the top-left (a lit rim, a dark rim, domes), then the whole gets a 1 px dark outline and a soft shadow.
//  Infantry are little pixel grids (five facings, mirrored with the light kept top-left) with legs drawn per
//  frame. Effects are procedural (noise-edged fireballs, dithered smoke). Everything is cached.
//  API (contract): rtsUnitArt, rtsTurretArt, rtsInfantryDeathArt, rtsWreckArt, rtsShotArt, rtsFxArt +
//  RTS_FX_FRAMES, rtsUnitIcon. Every sprite is meant to be drawn centred on the unit's position (use the
//  canvas's own width/height: most are 16x16, the big ones bigger, see RTS_U_SIZE).
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
// a colour moved towards white (t > 0) or black (t < 0)
function rtsUTint(hex, t) {
  const [r, g, b] = rtsURgb(hex);
  return t > 0 ? rtsUHex(r + (255 - r) * t, g + (255 - g) * t, b + (255 - b) * t) : rtsUHex(r * (1 + t), g * (1 + t), b * (1 + t));
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
// a smooth wobble round a circle (periodic in θ), for ragged blast edges and clouds
function rtsUWob(th, seed, t = 0) {
  const r = rtsURand(seed + 7);
  let v = 0;
  for (let k = 2; k <= 6; k++) v += Math.sin(k * th + r() * 6.283 + t * (r() - 0.5) * 6) / k;
  return v;
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
// shapes (own coordinates, x right, y back; the front is -y):
//   R: rect x0..x1, y0..y1, corners cut by c;  E: ellipse;  L: thick line (a capsule);  P: polygon;  F: any test
// m: material ([light, mid, dark] | 'H' house | 'HL' lighter house | 'HD' darker house | one colour | fn(s, lx, ly, f, pal))
// sh: shading 'b' bevel (default), 'f' flat, 'd' dome, 'r' recessed (lit bottom-right)
function rtsUR(x0, y0, x1, y1, m, sh, c) { return { t: 'r', x0, y0, x1, y1, m, sh: sh || 'b', c: c || 0, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, R: Math.max(x1 - x0, y1 - y0) / 2 }; }
function rtsUE(x, y, rx, ry, m, sh) { return { t: 'e', x, y, rx, ry, m, sh: sh || 'b', cx: x, cy: y, R: Math.max(rx, ry) }; }
function rtsUL(x0, y0, x1, y1, w, m, sh) { return { t: 'l', x0, y0, x1, y1, w, m, sh: sh || 'b', cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, R: Math.hypot(x1 - x0, y1 - y0) / 2 }; }
function rtsUP(pts, m, sh) {
  let cx = 0, cy = 0;
  for (const [x, y] of pts) { cx += x; cy += y; }
  cx /= pts.length; cy /= pts.length;
  let R = 0;
  for (const [x, y] of pts) R = Math.max(R, Math.hypot(x - cx, y - cy));
  return { t: 'p', pts, m, sh: sh || 'b', cx, cy, R };
}
function rtsUF(fn, m, sh, cx = 0, cy = 0, R = 4) { return { t: 'f', fn, m, sh: sh || 'b', cx, cy, R }; }
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
  if (typeof m === 'function') return m(s, lx, ly, o.f, o.pal, o.pk || 1);
  if (m === 'H') return o.pal[s];
  if (m === 'HL') return [rtsUTint(o.pal[0], 0.35), o.pal[0], o.pal[1]][s];
  if (m === 'HD') return [o.pal[1], o.pal[2], rtsUTint(o.pal[2], -0.45)][s];
  if (Array.isArray(m)) return m[s] || m[m.length - 1];
  return m;
}
// parts -> pixel buffer. o: { w, h, cx, cy, k (pixels a unit), ang (radians clockwise from up), f (frame), pal,
// outline (default true), shadow: [dx, dy] | null, recolour: fn(hex) (wrecks), skip: buffer to draw over }
function rtsURaster(parts, o) {
  const W = o.w, H = o.h, n = W * H, k = o.k || 1;
  const ca = Math.cos(o.ang || 0), sa = Math.sin(o.ang || 0);
  // on a diagonal, stripes run along the pixel diagonals
  o.pk = Math.abs(Math.abs(ca) - Math.abs(sa)) < 0.01 ? Math.SQRT2 : 1;
  const LX = new Float32Array(n), LY = new Float32Array(n), col = new Array(n).fill(null);
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const wx = i + 0.5 - o.cx + 0.0123, wy = j + 0.5 - o.cy + 0.0071, q = j * W + i;
    LX[q] = (ca * wx + sa * wy) / k; LY[q] = (-sa * wx + ca * wy) / k;
  }
  const mask = new Uint8Array(n);
  for (const p of parts) {
    if (!p) continue;
    let any = false;
    for (let q = 0; q < n; q++) { const v = rtsUIn(p, LX[q], LY[q]); mask[q] = v ? 1 : 0; if (v) any = true; }
    if (!any) continue;
    // the part's centre on the picture (for domes)
    const cwx = (ca * p.cx - sa * p.cy) * k, cwy = (sa * p.cx + ca * p.cy) * k;
    for (let q = 0; q < n; q++) {
      if (!mask[q]) continue;
      const i = q % W, j = (q - i) / W;
      let s = 1;
      if (p.sh !== 'f') {
        let nx = 0, ny = 0, edge = false;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;
          const x = i + dx, y = j + dy;
          if (x < 0 || y < 0 || x >= W || y >= H || !mask[y * W + x]) { nx += dx; ny += dy; edge = true; }
        }
        const d = nx + ny;
        if (edge && d !== 0) s = d < 0 ? 0 : 2;
        if (p.sh === 'r') s = 2 - s;
        else if (p.sh === 'd' && (!edge || d === 0)) {
          const t = ((i + 0.5 - o.cx - cwx) + (j + 0.5 - o.cy - cwy)) / (p.R * k * 1.41);
          s = t < -0.3 ? 0 : t > 0.45 ? 2 : 1;
        }
      }
      let c = rtsUMat(p.m, s, LX[q], LY[q], o);
      if (c && o.recolour) c = o.recolour(c, LX[q], LY[q]);
      if (c) col[q] = c;
    }
  }
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
// treads: links that run back as the vehicle goes forward (4 frames)
function rtsUTread(s, lx, ly, f, pal, pk = 1) {
  const b = ((Math.floor(ly * pk / 2 * (pk > 1 ? 1 : 1) + (f & 3) / 2) % 2) + 2) % 2;
  if (s === 0) return '#848484';
  if (s === 2) return '#181818';
  return b ? '#242424' : '#505050';
}
function rtsUTyre(s, lx, ly, f, pal, pk = 1) {
  const b = ((Math.floor(ly * pk + (f & 1)) % 2) + 2) % 2;
  if (s === 0) return '#6C6C6C';
  if (s === 2) return '#141414';
  return b ? '#282828' : '#444444';
}
// an engine grille / vents
function rtsUGrille(s, lx, ly, f, pal, pk = 1) {
  if (s === 0) return '#9C9C9C';
  if (s === 2) return '#202020';
  return (((Math.floor(ly * pk) % 2) + 2) % 2) ? '#242424' : '#686868';
}
// hazard stripes (crane, clamps)
function rtsUHazard(s, lx, ly, f, pal, pk = 1) {
  const b = ((Math.floor((lx + ly) * pk) % 3) + 3) % 3;
  if (s === 2) return b === 0 ? '#202020' : '#A87400';
  return b === 0 ? '#303030' : s === 0 ? '#FCE4A0' : '#F8B800';
}

// ------------------------------------------------------------------ the vehicles (front up, a unit a pixel)
const RTS_U_DIRS = [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];
const RTS_U_INF = ['soldier', 'trooper', 'nomad', 'saboteur', 'praetorian'];
// the units with a separate turret (rtsTurretArt)
const RTS_U_TURRETED = ['tank', 'siege', 'missile', 'sonic', 'juggernaut', 'converter'];

// two treads either side, x in [a, b] (mirrored), y in [y0, y1]
function rtsUTreads(a, b, y0, y1, c = 1.5) {
  return [rtsUR(-b, y0, -a, y1, rtsUTread, 'b', c), rtsUR(a, y0, b, y1, rtsUTread, 'b', c)];
}
// a turret's barrel with its recoil and the flash at the muzzle
function rtsUBarrel(x, y0, y1, w, firing, m = RTS_U_C.gun) {
  const rc = firing ? 1 : 0, out = [rtsUL(x, y0 + rc, x, y1 + rc, w, m)];
  out.push(rtsUR(x - w / 2 - 0.5, y1 + rc - 0.2, x + w / 2 + 0.5, y1 + rc + 1.2, RTS_U_C.drk));   // muzzle brake
  if (firing) out.push(rtsUE(x, y1 - 1, 1.6, 1.6, RTS_U_C.fire[2], 'f'), rtsUE(x, y1 - 1, 0.9, 0.9, RTS_U_C.fire[0], 'f'));
  return out;
}

const RTS_U_MODEL = {
  // ---- light vehicles
  trike: {
    size: 16, icon: { k: 1.9 },
    body: f => [
      rtsUR(-5, 1, -3, 5.5, rtsUTyre, 'b', 0.6), rtsUR(3, 1, 5, 5.5, rtsUTyre, 'b', 0.6),
      rtsUR(-3, 2.5, 3, 4, RTS_U_C.drk),
      rtsUR(-1, -7, 1, -3.5, rtsUTyre, 'b', 0.5),
      rtsUP([[-1, -5], [1, -5], [2.5, -1.5], [2.5, 3.5], [-2.5, 3.5], [-2.5, -1.5]], 'H'),
      rtsUR(-1.5, 3, 1.5, 6, rtsUGrille),
      rtsUR(-2, -2, 2, 0, RTS_U_C.ste, 'b', 0.5),
      rtsUE(-0.5, 1, 1.5, 1.5, RTS_U_C.drk, 'd'),
      rtsUL(1.5, -1, 1.5, -6.5, 1, RTS_U_C.gun),
    ],
  },
  raider: {
    size: 16, icon: { k: 1.9 },
    body: f => [
      rtsUR(-4.5, 2, -3, 5.5, rtsUTyre, 'b', 0.5), rtsUR(3, 2, 4.5, 5.5, rtsUTyre, 'b', 0.5),
      rtsUR(-1, -7.5, 1, -5, rtsUTyre, 'b', 0.5),
      rtsUR(-3, 3, 3, 4.5, RTS_U_C.drk),
      rtsUP([[0, -7], [1.5, -5.5], [2.5, 0], [2, 4], [-2, 4], [-2.5, 0], [-1.5, -5.5]], 'HL'),
      rtsUP([[0, -5], [1, -3], [-1, -3]], RTS_U_C.gls),
      rtsUR(-3.5, 4.5, 3.5, 6, 'HD', 'b', 0.5),
      rtsUE(0, 0, 1.3, 1.5, RTS_U_C.drk, 'd'),
      rtsUL(-2.5, -1, -2.5, -4.5, 1, RTS_U_C.gun), rtsUL(2.5, -1, 2.5, -4.5, 1, RTS_U_C.gun),
    ],
  },
  quad: {
    size: 16, icon: { k: 1.8 },
    body: f => [
      rtsUR(-5.5, -6, -3, -2, rtsUTyre, 'b', 0.6), rtsUR(3, -6, 5.5, -2, rtsUTyre, 'b', 0.6),
      rtsUR(-5.5, 2, -3, 6, rtsUTyre, 'b', 0.6), rtsUR(3, 2, 5.5, 6, rtsUTyre, 'b', 0.6),
      rtsUR(-3.5, -3.5, 3.5, -2.5, RTS_U_C.drk), rtsUR(-3.5, 3.5, 3.5, 4.5, RTS_U_C.drk),
      rtsUR(-3, -5, 3, 6, 'H', 'b', 1),
      rtsUR(-2, 2, 2, 5, rtsUGrille),
      rtsUR(-2, -2, 2, 1.5, RTS_U_C.ste, 'b', 0.5),
      rtsUE(0, -0.5, 1.3, 1.3, RTS_U_C.drk, 'd'),
      rtsUL(-1.5, -3, -1.5, -7.5, 1, RTS_U_C.gun), rtsUL(1.5, -3, 1.5, -7.5, 1, RTS_U_C.gun),
    ],
  },
  // ---- heavy vehicles (bodies; their turrets below)
  tank: {
    size: 16, icon: { k: 1.6 },
    body: f => [
      ...rtsUTreads(2.5, 5.5, -6, 6.5),
      rtsUR(-3, -5, 3, 6, 'H', 'b', 1),
      rtsUR(-2, -5, 2, -3.5, 'HL', 'b', 0.5),
      rtsUR(-2, 3.5, 2, 5.5, rtsUGrille),
    ],
    turret: fire => [
      rtsUR(-2.5, -1.5, 2.5, 3.5, 'HL', 'b', 1.3),
      rtsUE(-0.8, 1.6, 0.9, 0.9, RTS_U_C.drk, 'r'),
      ...rtsUBarrel(0, -1.5, -7, 1.5, fire),
    ],
  },
  missile: {
    size: 16, icon: { k: 1.6 },
    body: f => [
      ...rtsUTreads(3, 5.5, -6.5, 6.5),
      rtsUR(-3, -6.5, 3, 6, 'H', 'b', 1),
      rtsUR(-2.5, -6, 2.5, -4, RTS_U_C.gls, 'b', 0.6),
      rtsUR(-2, 3.5, 2, 5.5, rtsUGrille),
    ],
    turret: fire => {
      // a twin rocket pod on a pivot; firing, the rockets are gone in a puff
      const out = [rtsUE(0, 1.5, 2.5, 2.5, RTS_U_C.ste, 'd'), rtsUR(-3.5, -2, 3.5, 3.5, 'HL', 'b', 1)];
      for (const x of [-1.5, 1.5]) {
        out.push(rtsUR(x - 1, -5, x + 1, 2, RTS_U_C.gun, 'b'));
        out.push(rtsUR(x - 1, -5, x + 1, -4, fire ? '#202020' : RTS_U_C.red[1], 'f'));
      }
      if (fire) out.push(rtsUE(0, -6, 3, 1.6, RTS_U_C.smoke[0], 'f'), rtsUE(0, -5.5, 1.5, 0.9, RTS_U_C.fire[1], 'f'));
      return out;
    },
  },
  siege: {
    size: 16, icon: { k: 1.6 },
    body: f => [
      ...rtsUTreads(3, 6.5, -6.5, 6.5, 2.2),
      rtsUR(-3.5, -6, 3.5, 6.5, 'H', 'b', 1),
      rtsUR(-3, -6, 3, -4.5, RTS_U_C.ste, 'b', 0.8),
      rtsUR(-2, 4, 2, 6, rtsUGrille),
    ],
    turret: fire => [
      rtsUR(-3.5, -2.5, 3.5, 4, 'HL', 'b', 1.5),
      rtsUR(-2.5, 1, -0.5, 3, 'HD', 'r'),
      rtsUR(-3, -3.5, 3, -1.5, RTS_U_C.ste, 'b', 0.5),
      ...rtsUBarrel(-2, -2.5, -7, 2, fire, RTS_U_C.met), ...rtsUBarrel(2, -2.5, -7, 2, fire, RTS_U_C.met),
    ],
  },
  harvester: {
    size: 20, icon: { k: 1.35 },
    body: f => {
      const h = f >= 4, g = f & 3, out = [
        ...rtsUTreads(3.5, 6.5, -5, 7.5, 1.5),
        rtsUR(-4, -5.5, 4, 7.5, RTS_U_C.ste, 'b', 1),
        // the hopper: a House-coloured rim round a heap of glimmer
        rtsUR(-4, -1, 4, 7.5, 'H', 'b', 1),
        rtsUR(-2.5, 0.5, 2.5, 6, (s, lx, ly) => ((Math.floor(lx * 1.7 + ly * 1.3) % 3) + 3) % 3 === 0 ? RTS_U_C.glim[0] : s === 2 ? RTS_U_C.glim[1] : RTS_U_C.glim[2], 'r'),
        // the cab (front left) and the engine (front right)
        rtsUR(-4, -5.5, -0.5, -1.5, 'HL', 'b', 0.5),
        rtsUR(-3.5, -5, -1, -3.5, RTS_U_C.gls, 'b'),
        rtsUR(0.5, -5, 3.5, -1.5, rtsUGrille),
        // the scoop: a wide rake of teeth that turn while it works
        rtsUR(-6.5, -8.5, 6.5, -5.5, RTS_U_C.met, 'b', 1.5),
        rtsUR(-5.5, -8.5, 5.5, -7, (s, lx) => ((Math.floor(lx + (h ? g : 0)) % 2) + 2) % 2 ? '#303030' : s === 0 ? '#FCFCFC' : '#9C9C9C', 'f'),
      ];
      if (h) {   // sand thrown up in front of the scoop
        const r = rtsURand(31 + g);
        for (let i = 0; i < 6; i++) out.push(rtsUE(-6 + r() * 12, -9.6 + r() * 1.2, 0.6, 0.6, r() < 0.5 ? RTS_U_C.glim[1] : RTS_U_C.sand[0], 'f'));
      }
      return out;
    },
  },
  mcv: {
    size: 20, icon: { k: 1.35 },
    body: f => [
      ...[-5, 0, 5].flatMap(y => [rtsUR(-6.5, y - 1.7, -4.5, y + 1.7, rtsUTyre, 'b', 0.6), rtsUR(4.5, y - 1.7, 6.5, y + 1.7, rtsUTyre, 'b', 0.6)]),
      rtsUR(-5, -7.5, 5, 7.5, RTS_U_C.drk),
      // the cab
      rtsUR(-4.5, -8, 4.5, -4, RTS_U_C.ste, 'b', 1.2),
      rtsUR(-3.5, -7.5, 3.5, -6, RTS_U_C.gls),
      // the boxy body, House coloured, with a roof hatch and vents
      rtsUR(-5, -3.5, 5, 8, 'H', 'b', 0.8),
      rtsUR(-4, -2.5, 4, 7, 'HL', 'b'),
      rtsUR(-3.5, 4, -0.5, 6.5, rtsUGrille),
      rtsUR(0.5, -2, 3.5, 1, RTS_U_C.ste, 'b'),
      // the folded crane, across the roof
      rtsUE(2.5, 5, 1.6, 1.6, RTS_U_C.met, 'd'),
      rtsUL(2.5, 5, -2.5, -2, 1.4, rtsUHazard),
      rtsUL(-2.5, -2, -2.5, 0.5, 1, RTS_U_C.drk),
    ],
  },
  sonic: {
    size: 16, icon: { k: 1.6 },
    body: f => [
      ...rtsUTreads(2.5, 5.5, -6.5, 6.5),
      rtsUR(-3, -6, 3, 6.5, 'H', 'b', 1),
      rtsUR(-2, 3, 2, 5.5, (s, lx, ly, f) => (((Math.floor(ly) + f) % 2) ? RTS_U_C.cya[1] : RTS_U_C.cya[2]), 'f'),
      rtsUR(-2, -5.5, 2, -4, 'HL', 'b', 0.5),
    ],
    turret: fire => [
      rtsUE(0, 1, 3, 3, RTS_U_C.ste, 'd'),
      // the emitter: a dish of rings with a flaring horn in front
      rtsUF((x, y) => { const d = Math.hypot(x, y - 1); return d <= 3.2; }, (s, lx, ly) => {
        const d = Math.hypot(lx, ly - 1);
        if (fire) return d < 1.3 ? RTS_U_C.cya[0] : d < 2.3 ? RTS_U_C.cya[1] : RTS_U_C.cya[2];
        return d < 1.2 ? RTS_U_C.cya[1] : Math.floor(d) % 2 ? RTS_U_C.met[s === 2 ? 2 : 1] : RTS_U_C.met[s === 0 ? 0 : 2];
      }, 'b', 0, 1, 3),
      rtsUP([[-1, -1.5], [1, -1.5], [2.3, -6], [-2.3, -6]], RTS_U_C.met),
      rtsUR(-1.8, -6.2, 1.8, -5, fire ? RTS_U_C.cya[0] : RTS_U_C.cya[2], 'f'),
    ],
  },
  juggernaut: {
    size: 20, icon: { k: 1.2 },
    body: f => [
      ...rtsUTreads(5, 8, -7, 7, 2.2), ...rtsUTreads(3, 5, -6.5, 6.5, 1),
      rtsUR(-5.5, -7.5, 5.5, 7.5, 'HD', 'b', 2),
      rtsUR(-4.5, -7, 4.5, -5, RTS_U_C.ste, 'b', 1),
      rtsUR(-4, 4, 4, 6.5, rtsUGrille),
      rtsUR(-5.5, -4, -3.5, 3, 'H', 'b'), rtsUR(3.5, -4, 5.5, 3, 'H', 'b'),
    ],
    turret: fire => {
      const out = [
        rtsUE(0, 0.5, 4.5, 4.5, 'H', 'd'),
        rtsUE(0, 0.5, 2.3, 2.3, 'HD', 'r'),
      ];
      for (const x of [-2.5, 2.5]) {
        const rc = fire ? 1 : 0;
        out.push(rtsUL(x, -2 + rc, x, -7 + rc, 2, RTS_U_C.gun), rtsUR(x - 1.5, -5 + rc, x + 1.5, -4 + rc, RTS_U_C.pla[2], 'f'), rtsUR(x - 1, -8 + rc, x + 1, -7 + rc, fire ? RTS_U_C.pla[0] : RTS_U_C.pla[2], 'f'));
        if (fire) out.push(rtsUE(x, -7.6, 1.4, 1.1, RTS_U_C.pla[1], 'f'), rtsUE(x, -7.6, 0.6, 0.6, '#FFFFFF', 'f'));
      }
      out.push(rtsUE(0, 1, 1, 1, RTS_U_C.pla[2], 'f'));
      return out;
    },
  },
  converter: {
    size: 16, icon: { k: 1.6 },
    body: f => [
      ...rtsUTreads(2.5, 5.5, -6.5, 6.5),
      rtsUR(-3, -6, 3, 6.5, 'H', 'b', 1),
      // gas tanks on the back deck
      rtsUL(-1.5, 2.5, -1.5, 5.5, 2.2, RTS_U_C.grn), rtsUL(1.5, 2.5, 1.5, 5.5, 2.2, RTS_U_C.grn),
      rtsUR(-2, -5.5, 2, -4, 'HL', 'b', 0.5),
    ],
    turret: fire => [
      rtsUE(0, 1, 3.3, 3.3, 'HL', 'd'),
      // the mortar: a fat short tube with the gas glowing in its mouth
      rtsUL(0, 0, 0, -3 + (fire ? 1 : 0), 2.6, RTS_U_C.met, 'b'),
      rtsUE(0, -3.5 + (fire ? 1 : 0), 1.7, 1.2, '#104810', 'f'),
      rtsUE(0, -3.5 + (fire ? 1 : 0), 0.9, 0.6, fire ? RTS_U_C.grn[0] : RTS_U_C.grn[1], 'f'),
      fire ? rtsUE(0, -6, 2.4, 1.7, RTS_U_C.grn[1], 'f') : null,
      fire ? rtsUE(-0.5, -6.3, 1.2, 0.8, RTS_U_C.grn[0], 'f') : null,
      rtsUE(1.5, 2, 0.8, 0.8, RTS_U_C.grn, 'f'),
    ],
  },
  // ---- aircraft (drawn with their shadow further off, they fly)
  skylifter: {
    size: 24, air: true, icon: { k: 1.05 },
    body: f => {
      const carry = f >= 4, g = f & 3, cl = carry ? 1.5 : 2.5;
      const glow = i => [RTS_U_C.fire[1], RTS_U_C.fire[2], RTS_U_C.fire[3]][(g + i) % 3];
      return [
        // the clamps under the back of the body (hazard yellow), open or shut
        rtsUL(-cl, 1.5, -cl - 0.6, 6, 1, rtsUHazard), rtsUL(cl, 1.5, cl + 0.6, 6, 1, rtsUHazard),
        // the stub wings with an engine pod at each end
        rtsUR(-5, -2.5, 5, -0.5, RTS_U_C.ste, 'b', 0.6),
        rtsUE(-5, -1.5, 1.6, 3.2, 'HL', 'd'), rtsUE(5, -1.5, 1.6, 3.2, 'HL', 'd'),
        rtsUR(-5.5, 1.4, -4.5, 2.4, glow(0), 'f'), rtsUR(4.5, 1.4, 5.5, 2.4, glow(1), 'f'),
        // the long body, the cockpit at the front, a tail
        rtsUR(-2, -9, 2, 8.5, 'H', 'b', 1.5),
        rtsUR(-0.5, -4, 0.5, 6, 'HD', 'f'),
        rtsUE(0, -7, 1.3, 1.6, RTS_U_C.gls, 'd'),
        rtsUR(-3.5, 6.5, 3.5, 8, 'HD', 'b', 0.6),
      ];
    },
  },
  gunwing: {
    size: 20, air: true, icon: { k: 1.25 },
    body: f => {
      const sp = [7, 5.5, 3.5, 5.5][f & 3], ww = [2.2, 2.5, 2.8, 2.5][f & 3];
      return [
        // the flapping wings, a pair each side
        rtsUP([[1, -2.5], [sp, -2.5 - ww * 0.4], [sp + 0.3, -1.2], [1, 0]], 'HL'),
        rtsUP([[-1, -2.5], [-sp, -2.5 - ww * 0.4], [-sp - 0.3, -1.2], [-1, 0]], 'HL'),
        rtsUP([[1, 1], [sp - 1.5, 1.5], [sp - 1.3, 2.8], [1, 3]], 'H'),
        rtsUP([[-1, 1], [-sp + 1.5, 1.5], [-sp + 1.3, 2.8], [-1, 3]], 'H'),
        rtsUR(-1.5, -7, 1.5, 7, RTS_U_C.ste, 'b', 1),
        rtsUE(0, -4.8, 1, 1.6, RTS_U_C.gls, 'd'),
        rtsUR(-3, 6, 3, 7.5, 'HD', 'b', 0.5),
        rtsUL(-1.5, -5, -1.5, -7.5, 1, RTS_U_C.gun), rtsUL(1.5, -5, 1.5, -7.5, 1, RTS_U_C.gun),
      ];
    },
  },
  frigate: {
    size: 40, k: 1.3, air: true, icon: { k: 0.8 },
    body: f => {
      const g = f & 3;
      return [
        rtsUP([[-8, 2], [-3, -3], [-3, 6], [-8, 8]], 'HD'), rtsUP([[8, 2], [3, -3], [3, 6], [8, 8]], 'HD'),
        rtsUP([[0, -12], [4, -8], [5, 9], [3, 11], [-3, 11], [-5, 9], [-4, -8]], 'H'),
        rtsUP([[0, -12], [2.5, -9.5], [-2.5, -9.5]], 'HL'),
        rtsUE(0, -7, 1.5, 2, RTS_U_C.gls, 'd'),
        // cargo bay doors and House bands
        rtsUR(-3, -4, 3, 6, RTS_U_C.ste, 'r'),
        rtsUR(-0.5, -4, 0.5, 6, RTS_U_C.drk, 'f'),
        rtsUR(-4.5, -5.5, 4.5, -4.5, 'HD', 'f'), rtsUR(-5, 7, 5, 8, 'HD', 'f'),
        ...[-2.5, 0, 2.5].map((x, i) => rtsUE(x, 11.2, 1, 0.9, RTS_U_C.fire[(g + i) % 3 + 1], 'f')),
        rtsUE(-6.5, 7.5, 0.8, 0.8, g < 2 ? '#FC4040' : '#681010', 'f'), rtsUE(6.5, 7.5, 0.8, 0.8, g < 2 ? '#40FC40' : '#106810', 'f'),
      ];
    },
  },
  doomfist: {
    size: 16, air: true, icon: { k: 1.3 },
    body: f => rtsUDoomParts(f),
  },
};
// the great missile (the unit and the shot)
function rtsUDoomParts(f, big) {
  const g = f & 3, fl = [3, 4, 2.5, 3.5][g];
  return [
    rtsUP([[-1.8, 3], [-3.5, 6], [-3.5, 7], [-1.5, 6]], RTS_U_C.red), rtsUP([[1.8, 3], [3.5, 6], [3.5, 7], [1.5, 6]], RTS_U_C.red),
    rtsUE(0, 6 + fl / 2, 1.3, fl / 2 + 0.5, RTS_U_C.fire[3], 'f'),
    rtsUE(0, 6 + fl / 3, 0.8, fl / 3 + 0.3, RTS_U_C.fire[1], 'f'),
    rtsUR(-1.6, -4, 1.6, 6.5, RTS_U_C.met, 'b', 0.6),
    rtsUR(-1.6, 0, 1.6, 1.5, RTS_U_C.drk, 'f'),
    rtsUP([[0, -7.5], [1.6, -4], [-1.6, -4]], RTS_U_C.red),
    rtsUL(0, -1, 0, -3, 0.9, RTS_U_C.yel, 'f'),
  ];
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
// mirrored facings keep the light top-left: swap the light and dark letters
const RTS_U_SWAP = { h: 'd', d: 'h', L: 'k', k: 'L', S: 's', s: 'S', R: 'r', r: 'R', T: 't', t: 'T', A: 'a', a: 'A' };
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
// the look of each kind of foot soldier
function rtsUInfStyle(key, pal) {
  const base = {
    L: '#D8D8C8', K: '#9C9C88', k: '#5C5C48', S: RTS_U_C.skin[0], s: RTS_U_C.skin[1],
    h: pal[0], H: pal[1], d: pal[2], W: '#5C4828', R: '#A09060', r: '#686038',
    P: '#787058', p: '#4C4838', B: '#282018', G: '#6C6C6C', g: '#303030',
    gun: 4, tube: false,
  };
  switch (key) {
    case 'soldier': return Object.assign(base, { L: pal[0], K: pal[2], k: rtsUTint(pal[2], -0.4) });
    case 'trooper': return Object.assign(base, { L: rtsUTint(pal[0], 0.3), K: pal[0], k: pal[1], R: '#788050', r: '#484C28', tube: true, gun: 5 });
    case 'nomad': return Object.assign(base, {
      L: '#E8D0A0', K: '#C8A068', k: '#886034', h: '#E0C490', H: '#B89060', d: '#806030', W: pal[1], R: pal[0], r: pal[1],
      P: '#B89060', p: '#806030', B: '#4C3418', S: '#C88858', s: '#985830', gun: 4, robe: true,
    });
    case 'saboteur': return Object.assign(base, {
      L: '#585868', K: '#383848', k: '#202028', h: '#585868', H: '#383848', d: '#202028', W: pal[1], R: pal[1], r: pal[2],
      P: '#383848', p: '#202028', B: '#101018', S: '#383848', s: '#202028', G: '#9C9C9C', gun: 2,
    });
    case 'praetorian': return Object.assign(base, {
      L: '#F8F0D0', K: '#E0B848', k: '#986C10', R: pal[1], r: pal[2], W: '#E0B848', P: pal[2], p: rtsUTint(pal[2], -0.4), B: '#181010',
      G: '#8C8C8C', g: '#383838', gun: 5, heavy: true, crest: pal[1],
    });
  }
  return base;
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
    const shoot = f >= 4, rx = fc.hx, ry = fc.hy - (shoot && fc.dy >= 0 ? 0 : 0);
    if (st.tube) {   // a rocket tube on the shoulder: thick, from behind the shoulder forward
      const sx = rx - fc.dx * 2, sy = ry - 1 - fc.dy * 2;
      for (let t = 0; t < 6; t++) {
        const x = sx + fc.dx * t, y = sy + fc.dy * t;
        put(x, y, t === 5 ? RTS_U_C.red[1] : t === 4 ? '#B0B888' : st.R);
        if (fc.dx && fc.dy) put(x + (fc.dx > 0 ? 0 : 0), y + 1, t >= 4 ? null : st.r);
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
function rtsUInfCanvas(key, pal, dir, f) {
  const b = rtsUBuf(16, 16);
  rtsUInfFigure(b, key, pal, dir, f, 5, 3);
  rtsUOutline(b);
  rtsUFootShadow(b, 8.5, 13.2, 3.6, 1.6);
  return rtsUCanvas(b);
}
// a dying soldier: hit, falling, down, a pool, then a dark heap
function rtsUInfDeathCanvas(key, pal, f) {
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

// =====================================================================
//  The API
// =====================================================================

// a unit's body: vehicles 16x16 (harvester, mcv, juggernaut 20x20; aircraft bigger, see RTS_U_SIZE), centred;
// infantry one soldier in 16x16 (frame 0..3 walking, 4 aiming, 5 shooting)
function rtsUnitArt(key, house, dir8, frame) {
  dir8 = ((dir8 | 0) % 8 + 8) % 8; frame = Math.max(0, frame | 0);
  if (RTS_U_INF.includes(key)) {
    frame = Math.min(5, frame);
    return rtsUCached('i' + key + house + dir8 + '/' + frame, () => rtsUInfCanvas(key, rtsUPal(house), dir8, frame));
  }
  const m = RTS_U_MODEL[key] || RTS_U_MODEL.tank;
  const f = key === 'harvester' || key === 'skylifter' ? frame & 7 : frame & 3;
  return rtsUCached('u' + key + house + dir8 + '/' + f, () =>
    rtsUModelCanvas(m.body(f), m.size, dir8, { f, k: m.k || 1, pal: rtsUPal(house), shadow: m.air ? (m.size >= 32 ? [3, 4] : [2, 3]) : [1, 1] }));
}
// a separate turret (16x16, centred) for the turreted tanks; null for the rest
function rtsTurretArt(key, house, dir8, firing) {
  const m = RTS_U_MODEL[key];
  if (!m || !m.turret) return null;
  dir8 = ((dir8 | 0) % 8 + 8) % 8;
  const fire = !!firing;
  return rtsUCached('t' + key + house + dir8 + (fire ? 'F' : ''), () =>
    rtsUModelCanvas(m.turret(fire), 16, dir8, { f: 0, pal: rtsUPal(house), shadow: [1, 1] }));
}
function rtsInfantryDeathArt(key, house, frame) {
  frame = Math.max(0, Math.min(5, frame | 0));
  return rtsUCached('d' + key + house + frame, () => rtsUInfDeathCanvas(RTS_U_INF.includes(key) ? key : 'soldier', rtsUPal(house), frame));
}

// a burning wreck: the vehicle charred black (body and turret), flames and smoke (frame 0..7, loops);
// optional dir8 (default 3) to match how it died
function rtsWreckArt(key, frame, dir8 = 3) {
  frame = ((frame | 0) % 8 + 8) % 8; dir8 = ((dir8 | 0) % 8 + 8) % 8;
  if (RTS_U_INF.includes(key)) return rtsInfantryDeathArt(key, 'nomad', 5);
  const m = RTS_U_MODEL[key] || RTS_U_MODEL.tank;
  return rtsUCached('w' + key + dir8 + '/' + frame, () => {
    const char = ['#6C6058', '#4C4440', '#342C28', '#1C1814'];
    const recolour = (c, lx, ly) => {
      const [r, g, bb] = rtsURgb(c), l = (r * 0.3 + g * 0.59 + bb * 0.11) / 255;
      const n = Math.sin(lx * 3.1 + ly * 1.7) + Math.sin(lx * 1.3 - ly * 2.9);
      if (n > 1.55) return frame % 4 < 2 ? '#E45C10' : '#881400';   // glowing embers
      return char[l > 0.7 ? 0 : l > 0.45 ? 1 : l > 0.25 ? 2 : 3];
    };
    const o = { w: m.size, h: m.size, cx: m.size / 2, cy: m.size / 2, k: m.k || 1, ang: dir8 * Math.PI / 4, f: 0, pal: ['#808080', '#606060', '#404040'], recolour, shadow: [1, 1] };
    const parts = m.body(0).filter(p => !(p && p.sh === 'f' && /^#F/.test(String(p.m))));
    const b = rtsURaster(parts, o);
    if (m.turret) rtsURaster(m.turret(false), Object.assign({}, o, { into: b, shadow: null, ang: ((dir8 + 1) & 7) * Math.PI / 4 }));
    // flames licking up from two spots, and smoke going up and off
    const S = m.size, r = rtsURand(key.length * 13 + 5);
    const spots = [[S / 2 - 2 + Math.floor(r() * 3), S / 2 + 1], [S / 2 + 2, S / 2 - 2 + Math.floor(r() * 2)]];
    spots.forEach(([x, y], i) => rtsUFlame(b, x, y, 4 + (S > 16 ? 2 : 0), 6 + (S > 16 ? 2 : 0), frame + i * 3, i + 3));
    for (let k = 0; k < 3; k++) {
      const t = ((frame + k * 2.7) % 8) / 8, sx = spots[k % 2][0] + t * 3, sy = spots[k % 2][1] - 4 - t * (S / 2 - 3);
      rtsUPuff(b, sx, sy, 1 + t * 2.2, 1 - t, k);
    }
    return rtsUCanvas(b);
  });
}
// flames: columns of fire from (cx, by) up to h high, w wide, loops over 8 frames
function rtsUFlame(b, cx, by, w, h, frame, seed) {
  const ph = (frame % 8) / 8 * Math.PI * 2, r = rtsURand(seed * 17 + 3), p1 = r() * 6, p2 = r() * 6;
  for (let i = -Math.ceil(w / 2); i <= Math.ceil(w / 2); i++) {
    const u = i / (w / 2 + 0.5), env = Math.max(0, 1 - u * u);
    const hh = h * env * (0.65 + 0.2 * Math.sin(ph + i * 1.7 + p1) + 0.15 * Math.sin(2 * ph - i * 2.3 + p2));
    for (let y = 0; y < hh; y++) {
      const v = y / Math.max(1, hh), c = v < 0.25 ? 1 : v < 0.55 ? 2 : v < 0.85 ? 3 : 4;
      rtsUPut(b, cx + i, by - y, RTS_U_C.fire[Math.abs(u) > 0.7 && c < 3 ? c + 1 : c]);
    }
  }
  // a spark
  const sy = by - h - ((frame * 2 + seed) % 4), sx = cx + ((frame + seed) % 3) - 1;
  rtsUPut(b, sx, sy, RTS_U_C.fire[2]);
}
// a soft puff of smoke (radius r, opacity a 0..1)
function rtsUPuff(b, cx, cy, r, a, seed = 0) {
  for (let j = Math.floor(cy - r - 1); j <= cy + r + 1; j++) for (let i = Math.floor(cx - r - 1); i <= cx + r + 1; i++) {
    const d = Math.hypot(i + 0.5 - cx, j + 0.5 - cy) / Math.max(0.6, r);
    if (d > 1) continue;
    if (rtsUBayer(i + seed, j) > a * (1.2 - d * 0.5)) continue;
    const lit = (i + 0.5 - cx) + (j + 0.5 - cy) < -r * 0.3;
    rtsUPut(b, i, j, lit ? RTS_U_C.smoke[1] : d > 0.7 ? RTS_U_C.smoke[3] : RTS_U_C.smoke[2]);
  }
}

// ------------------------------------------------------------------ shots
const RTS_U_SHOT = {
  bullet: { size: 8, parts: f => [rtsUL(0, -1, 0, 1.5, 1, f & 1 ? RTS_U_C.fire[1] : RTS_U_C.fire[0], 'f'), rtsUL(0, 1.5, 0, 2.5, 1, RTS_U_C.fire[3], 'f')], ol: false },
  shell: { size: 8, parts: f => [rtsUL(0, 1, 0, 3, 1, RTS_U_C.fire[f & 1 ? 3 : 2], 'f'), rtsUE(0, 0, 1.1, 1.1, ['#FCFCFC', '#FCE4A0', '#F8B800'], 'd')] },
  heavy: { size: 12, parts: f => [rtsUL(0, 1, 0, 4.5, 1.6, RTS_U_C.fire[f & 1 ? 3 : 4], 'f'), rtsUE(0, 0, 1.6, 1.8, ['#FCFCFC', '#FCE4A0', '#E45C10'], 'd')] },
  rocket: {
    size: 16, parts: f => [
      rtsUE(0, 4 + (f & 1), 0.9, 1.5 + (f & 1) * 0.5, RTS_U_C.fire[3], 'f'), rtsUE(0, 3.6, 0.6, 0.8, RTS_U_C.fire[1], 'f'),
      rtsUL(0, -2, 0, 2.5, 1.2, RTS_U_C.met), rtsUL(0, -3, 0, -2, 1.2, RTS_U_C.red, 'f'),
    ], trail: 'rocket',
  },
  missile: {
    size: 16, parts: f => [
      rtsUE(0, 5 + (f & 1) * 0.5, 1.2, 2 + (f & 1) * 0.6, RTS_U_C.fire[3], 'f'), rtsUE(0, 4.5, 0.7, 1, RTS_U_C.fire[1], 'f'),
      rtsUP([[-0.8, 1.5], [-2, 3.5], [2, 3.5], [0.8, 1.5]], RTS_U_C.gun),
      rtsUR(-1, -3, 1, 3.5, RTS_U_C.met, 'b'), rtsUP([[0, -5], [1, -3], [-1, -3]], RTS_U_C.red),
    ], trail: 'missile',
  },
  plasma: {
    size: 16, ol: false, parts: f => {
      const p = [1, 1.25, 1.45, 1.2][f & 3];
      return [
        rtsUE(0.5, 3.5, 0.9 * p, 1.8, RTS_U_C.pla[2], 'f'),
        rtsUE(0, 0, 3 * p, 3 * p, '#8800B0', 'f'), rtsUE(0, 0, 2.3 * p, 2.3 * p, RTS_U_C.pla[2], 'f'),
        rtsUE(0, 0, 1.5 * p, 1.5 * p, RTS_U_C.pla[1], 'f'), rtsUE(-0.3, -0.3, 0.8 * p, 0.8 * p, '#FFFFFF', 'f'),
      ];
    },
  },
  sonic: {
    size: 16, ol: false, parts: f => {
      const out = [];
      for (let k = 0; k < 3; k++) {
        const R = 3 + k * 2 - (f & 3) * 0.5;
        if (R < 1) continue;
        out.push(rtsUF((x, y) => {
          const d = Math.hypot(x, y - 5);
          return d >= R && d < R + 1 && Math.abs(Math.atan2(x, -(y - 5))) < 0.9;
        }, k === 0 ? RTS_U_C.cya[0] : k === 1 ? RTS_U_C.cya[1] : RTS_U_C.cya[2], 'f'));
      }
      return out;
    },
  },
  gas: {
    size: 12, parts: f => {
      const a = (f & 3) * Math.PI / 4, c = Math.cos(a), s = Math.sin(a);
      return [
        rtsUE(0.5, 3.5, 1.5, 1.5, RTS_U_C.grn[2], 'f'), rtsUE(-0.5, 2.6, 1, 1, RTS_U_C.grn[1], 'f'),
        rtsUL(-1.6 * s, -1.6 * c, 1.6 * s, 1.6 * c, 2.2, RTS_U_C.gun),
        rtsUE(1.2 * s, 1.2 * c, 0.9, 0.9, RTS_U_C.grn[0], 'f'),
      ];
    },
  },
  doomfist: { size: 24, parts: f => rtsUDoomParts(f, true), trail: 'doom' },
};
// a shot flying in direction dir8 (frame 0..3 loops), centred; sizes: bullet/shell 8, heavy/gas 12, others 16,
// doomfist 24
function rtsShotArt(kind, dir8, frame) {
  const s = RTS_U_SHOT[kind] || RTS_U_SHOT.shell;
  dir8 = ((dir8 | 0) % 8 + 8) % 8; frame = ((frame | 0) % 4 + 4) % 4;
  return rtsUCached('s' + kind + dir8 + '/' + frame, () => {
    const N = s.size, b = rtsUBuf(N, N), [dx, dy] = RTS_U_DIRS[dir8], L = Math.hypot(dx, dy);
    // a smoke trail behind rockets and missiles
    if (s.trail) {
      const n = s.trail === 'rocket' ? 3 : s.trail === 'missile' ? 4 : 5, step = s.trail === 'doom' ? 2.4 : 1.6;
      for (let k = 0; k < n; k++) {
        const d = (s.trail === 'doom' ? 9 : 5.5) + k * step + (frame & 1) * 0.5;
        rtsUPuff(b, N / 2 - dx / L * d, N / 2 - dy / L * d, (s.trail === 'doom' ? 2 : s.trail === 'missile' ? 1.5 : 1.2) + k * 0.4, 1 - k * 0.16, k + frame);
      }
    }
    rtsURaster(s.parts(frame), { w: N, h: N, cx: N / 2, cy: N / 2, ang: dir8 * Math.PI / 4, f: frame, pal: RTS_U_PAL.nomad, outline: s.ol !== false, into: b, shadow: null });
    return rtsUCanvas(b);
  });
}

// ------------------------------------------------------------------ effects
const RTS_FX_FRAMES = { hit: 4, boom: 8, bigboom: 12, smoke: 8, fire: 8, sand: 6, muzzle: 3, gasCloud: 10, sonicWave: 8, glimmerBurst: 10 };
const RTS_U_FX_SIZE = { hit: 8, boom: 24, bigboom: 48, smoke: 16, fire: 16, sand: 16, muzzle: 8, gasCloud: 32, sonicWave: 32, glimmerBurst: 32 };
// a fireball at (cx, cy): its radius R, its age t (0 flash .. 1 gone), ragged by seed
function rtsUFireball(b, cx, cy, R, t, seed) {
  const grow = Math.min(1, 0.3 + t * 3.2), Rc = R * grow, heat0 = Math.max(0, 1.25 - t * 1.5);
  const smokeT = Math.max(0, (t - 0.25) / 0.75);
  for (let j = Math.floor(cy - R * 1.4); j <= cy + R * 1.4; j++) for (let i = Math.floor(cx - R * 1.4); i <= cx + R * 1.4; i++) {
    const x = i + 0.5 - cx, y = j + 0.5 - cy - smokeT * R * 0.25, d = Math.hypot(x, y), th = Math.atan2(y, x);
    const rr = Rc * (1 + 0.22 * rtsUWob(th, seed, t));
    if (d > rr) continue;
    const v = (1 - d / rr) * heat0 + (rtsUBayer(i, j) - 0.5) * 0.18 + 0.1 * rtsUWob(th * 2 + d, seed + 3, t);
    // smoke rolls in from the edge as it cools
    const sm = smokeT > 0 && (d / rr) > 1 - smokeT * 1.3;
    if (sm) {
      if (rtsUBayer(i, j) < smokeT * smokeT * 0.9) continue;
      const lit = x + y < -rr * 0.2;
      rtsUPut(b, i, j, lit ? RTS_U_C.smoke[2] : d / rr > 0.8 ? RTS_U_C.smoke[4] : RTS_U_C.smoke[3]);
      continue;
    }
    const F = RTS_U_C.fire;
    rtsUPut(b, i, j, v > 0.9 ? F[0] : v > 0.7 ? F[1] : v > 0.5 ? F[2] : v > 0.3 ? F[3] : v > 0.12 ? F[4] : F[5]);
  }
}
function rtsUDebris(b, cx, cy, R, t, seed, n) {
  const r = rtsURand(seed);
  for (let k = 0; k < n; k++) {
    const a = r() * Math.PI * 2, sp = R * (0.6 + r() * 0.7), d = sp * Math.min(1, t * 1.6);
    const x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d - Math.sin(Math.min(1, t * 1.6) * Math.PI) * R * 0.4 * r();
    if (t > 0.85) continue;
    rtsUPut(b, x, y, t < 0.35 ? RTS_U_C.fire[1] : k % 2 ? RTS_U_C.smoke[4] : RTS_U_C.fire[4]);
  }
}
function rtsUFx(kind, f) {
  const N = RTS_U_FX_SIZE[kind], b = rtsUBuf(N, N), n = RTS_FX_FRAMES[kind], t = f / Math.max(1, n - 1), c = N / 2;
  const F = RTS_U_C.fire;
  switch (kind) {
    case 'hit': {
      const P = [[F[0], F[1]], [F[1], F[2]], [F[3], F[4]], [RTS_U_C.smoke[2], RTS_U_C.smoke[3]]][f];
      const r = [1, 2.5, 2, 1.5][f];
      rtsUPut(b, 3, 3, P[0]); rtsUPut(b, 4, 4, P[0]); rtsUPut(b, 3, 4, P[0]); rtsUPut(b, 4, 3, P[0]);
      if (f < 3) for (const [dx, dy] of RTS_U_DIRS) { const k = (dx && dy) ? r * 0.7 : r; rtsUPut(b, 3.5 + dx * k, 3.5 + dy * k, P[1]); }
      else rtsUPuff(b, 4, 3.5, 2, 0.8);
      break;
    }
    case 'muzzle': {
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
      rtsUFireball(b, c, c, 8.5, t, 11);
      if (f >= 1 && f <= 4) rtsUFireball(b, c + 4, c - 3, 4, Math.max(0, t * 1.4 - 0.15), 5);
      rtsUDebris(b, c, c, 11, t, 9, 10);
      break;
    case 'bigboom': {
      // three blasts going off one after the other, a shock ring and a lot of junk
      if (f >= 1 && f <= 5) {
        const rr = 6 + f * 4;
        for (let a = 0; a < 96; a++) {
          const th = a / 96 * Math.PI * 2, x = c + Math.cos(th) * rr, y = c + Math.sin(th) * rr * 0.85;
          if (rtsUBayer(Math.floor(x), Math.floor(y)) < 0.35 + f * 0.1) continue;
          rtsUPut(b, x, y, f < 3 ? RTS_U_C.sand[0] : RTS_U_C.sand[2], 200);
        }
      }
      rtsUFireball(b, c - 6, c + 4, 11, Math.max(0, Math.min(1, (f - 2) / 9)), 21);
      rtsUFireball(b, c + 7, c - 5, 10, Math.max(0, Math.min(1, (f - 1) / 9)), 22);
      rtsUFireball(b, c, c, 16, t, 23);
      rtsUDebris(b, c, c, 22, t, 24, 22);
      break;
    }
    case 'smoke': {
      // a puff rising and spreading while it thins out
      const r = 2.6 + t * 4, y = c + 3 - t * 5, a = 1.1 - t * 0.85;
      rtsUPuff(b, c - t * 1.5, y + 1, r * 0.8, a, 1);
      rtsUPuff(b, c + 1.5, y - 1, r * 0.7, a * 0.9, 2);
      rtsUPuff(b, c, y - r * 0.4, r * 0.75, a, 3);
      break;
    }
    case 'fire':
      rtsUFlame(b, c - 3, 13, 4, 8, f, 1);
      rtsUFlame(b, c + 3, 13, 4, 9, f + 3, 2);
      rtsUFlame(b, c, 14, 5, 12, f + 5, 3);
      break;
    case 'sand': {
      // a low puff of sand thrown out to the sides, grains falling
      const S = ['#FCE8C0', '#C89858', '#A07038'], rx = 2.5 + t * 5.5, ry = 1.8 + t * 2.5, a = 1.15 - t * 0.8;
      for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
        const x = (i + 0.5 - c) / rx, y = (j + 0.5 - c - 2 + t * 2) / ry, d = x * x + y * y + 0.3 * rtsUWob(Math.atan2(y, x), 4, t);
        if (d > 1 || rtsUBayer(i, j) > a * (1.3 - d * 0.6)) continue;
        rtsUPut(b, i, j, x + y < -0.4 ? S[0] : d > 0.65 ? S[2] : S[1]);
      }
      const r = rtsURand(77);
      for (let k = 0; k < 8; k++) {
        const ang = r() * Math.PI * 2, sp = 3 + r() * 4;
        if (t < 0.9) rtsUPut(b, c + Math.cos(ang) * sp * (0.3 + t), c + 1 + Math.sin(ang) * sp * 0.5 * (0.3 + t) - Math.sin(t * Math.PI) * 3, S[2]);
      }
      break;
    }
    case 'gasCloud': {
      // green blobs swelling and swirling, then thinning out
      const G = ['#E0FCC0', '#A8F088', '#58D854', '#00A800', '#005800'];
      const grow = Math.min(1, 0.35 + t * 1.6), a = t < 0.6 ? 1 : 1 - (t - 0.6) / 0.45;
      for (let k = 0; k < 6; k++) {
        const ang = k * 1.05 + t * 1.6, dist = (k ? 6 : 0) * grow, R = (k ? 5.5 : 8) * grow;
        const bx = c + Math.cos(ang) * dist, by = c + Math.sin(ang) * dist * 0.85;
        for (let j = Math.floor(by - R); j <= by + R; j++) for (let i = Math.floor(bx - R); i <= bx + R; i++) {
          const x = i + 0.5 - bx, y = j + 0.5 - by, d = Math.hypot(x, y) / R;
          if (d > 1 + 0.15 * rtsUWob(Math.atan2(y, x), k + 40, t) || rtsUBayer(i + k, j) > a * (1.25 - d * 0.5)) continue;
          const lit = x + y < -R * 0.35;
          rtsUPut(b, i, j, lit ? G[1] : d < 0.4 ? G[2] : d < 0.8 ? G[3] : G[4]);
        }
      }
      // bright motes in it
      const r = rtsURand(91 + f);
      for (let k = 0; k < 5 * a; k++) rtsUPut(b, c + (r() - 0.5) * 20 * grow, c + (r() - 0.5) * 16 * grow, G[0]);
      break;
    }
    case 'sonicWave': {
      // rings of sound going out, trembling
      const C = RTS_U_C.cya;
      for (let k = 0; k < 3; k++) {
        const R = 2 + (f - k * 2.2) * 1.9;
        if (R < 1 || R > 15.5) continue;
        const fade = 1 - R / 16;
        for (let a = 0; a < 140; a++) {
          const th = a / 140 * Math.PI * 2, rr = R + 0.5 * Math.sin(th * 7 + f * 1.3);
          const x = c + Math.cos(th) * rr, y = c + Math.sin(th) * rr;
          if (rtsUBayer(Math.floor(x), Math.floor(y)) > fade + 0.25) continue;
          rtsUPut(b, x, y, k === 0 ? C[0] : k === 1 ? C[1] : C[2]);
          if (k === 0) rtsUPut(b, c + Math.cos(th) * (rr - 1), c + Math.sin(th) * (rr - 1), C[2], 160);
        }
      }
      break;
    }
    case 'glimmerBurst': {
      // the bulb bursts: an orange glow, a ring of sand, glimmer flung out that settles round about
      const Gl = ['#FCFCFC', '#FCE0A8', '#F8B800', '#F89838', '#E45C10', '#A83000'];
      if (f < 6) {
        const R = f < 4 ? 3 + f * 2.5 : 10 - (f - 4) * 3;
        for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
          const d = Math.hypot(i + 0.5 - c, j + 0.5 - c) / R + (rtsUBayer(i, j) - 0.5) * 0.25;
          if (d > 1) continue;
          if (f >= 4 && rtsUBayer(i, j) < (f - 3) * 0.3) continue;
          rtsUPut(b, i, j, Gl[Math.min(5, Math.floor(d * 4) + Math.min(f, 3))]);
        }
      }
      if (f >= 2) {
        const rr = 4 + f * 1.4;
        for (let a = 0; a < 90; a++) {
          const th = a / 90 * Math.PI * 2;
          if (rtsUBayer(a, f) < (f - 2) / 9) continue;
          rtsUPut(b, c + Math.cos(th) * rr, c + Math.sin(th) * rr * 0.85, f > 5 ? '#A07038' : '#C89858');
        }
      }
      const r = rtsURand(55);
      for (let k = 0; k < 26; k++) {
        const ang = r() * Math.PI * 2, sp = 5 + r() * 9, h = 4 + r() * 6;
        const tt = Math.min(1, t * 1.3), x = c + Math.cos(ang) * sp * tt, y = c + Math.sin(ang) * sp * tt * 0.85 - Math.sin(tt * Math.PI) * h;
        if (f === 0) continue;
        const col = f > 7 ? Gl[k % 2 ? 3 : 4] : Gl[1 + (k + f) % 4];
        rtsUPut(b, x, y, col);
        if (k % 2 === 0) rtsUPut(b, x + 1, y, f > 7 ? Gl[5] : Gl[3]);
        if (k % 3 === 0 && f < 7) rtsUPut(b, x, y + 1, Gl[4]);
      }
      break;
    }
  }
  return b;
}
// an effect's frame (RTS_FX_FRAMES[kind] frames), centred; sizes: hit, muzzle 8; smoke, fire, sand 16; boom 24;
// gasCloud, sonicWave, glimmerBurst 32; bigboom 48. 'fire' loops; the rest play once.
function rtsFxArt(kind, frame) {
  if (!RTS_FX_FRAMES[kind]) kind = 'boom';
  const n = RTS_FX_FRAMES[kind];
  frame = kind === 'fire' ? ((frame | 0) % n + n) % n : Math.max(0, Math.min(n - 1, frame | 0));
  return rtsUCached('x' + kind + frame, () => rtsUCanvas(rtsUFx(kind, frame)));
}

// ------------------------------------------------------------------ build icons
// the desert behind a portrait: rippled sand, a darker rock shelf in a corner
function rtsUIconBack(b, seed) {
  const S = ['#F8D8A0', '#E8B878', '#D0A060', '#B08048'];
  for (let j = 0; j < b.h; j++) for (let i = 0; i < b.w; i++) {
    const w = Math.sin(i * 0.45 + j * 0.9 + Math.sin(i * 0.2 + seed) * 2.2);
    let c = w > 0.82 ? S[0] : w < -0.8 ? S[2] : S[1];
    if (j > b.h - 7 + Math.sin(i * 0.5 + seed) * 2 && i < 12 + seed % 5) c = rtsUBayer(i, j) < 0.5 ? '#9C7C58' : '#806448';
    if (j < 4 && rtsUBayer(i, j) < (4 - j) / 6) c = S[0];
    rtsUPut(b, i, j, c);
  }
}
function rtsUIconFrame(b, pal) {
  const W = b.w, H = b.h;
  for (let i = 0; i < W; i++) { rtsUPut(b, i, 0, RTS_U_C.ol); rtsUPut(b, i, H - 1, RTS_U_C.ol); rtsUPut(b, i, 1, '#BCBCBC'); rtsUPut(b, i, H - 2, '#4C4C4C'); }
  for (let j = 0; j < H; j++) { rtsUPut(b, 0, j, RTS_U_C.ol); rtsUPut(b, W - 1, j, RTS_U_C.ol); if (j && j < H - 1) { rtsUPut(b, 1, j, '#BCBCBC'); rtsUPut(b, W - 2, j, '#4C4C4C'); } }
  rtsUPut(b, 1, H - 2, '#7C7C7C'); rtsUPut(b, W - 2, 1, '#7C7C7C');
  // the House's colour in the corners
  for (const [x, y] of [[2, 2], [3, 2], [2, 3], [W - 3, H - 3], [W - 4, H - 3], [W - 3, H - 4]]) rtsUPut(b, x, y, pal[1]);
}
// a unit's sidebar icon, 32x24: a framed portrait of the unit, large, on the sand
function rtsUnitIcon(key, house) {
  return rtsUCached('n' + key + house, () => {
    const pal = rtsUPal(house), b = rtsUBuf(32, 24);
    rtsUIconBack(b, key.length * 3 + 1);
    if (RTS_U_INF.includes(key)) {
      // two soldiers side by side, twice the size: one walking, one taking aim
      const figs = [[3, 1, -6], [5, 4, 8]], tmp = rtsUBuf(32, 24);
      for (const [dir, f, dx] of figs) {
        const fb = rtsUBuf(16, 16);
        rtsUInfFigure(fb, key, pal, dir, f, 4, 3);
        rtsUFootShadow(b, dx + 16, 24, 7, 2.5);
        for (let j = 0; j < 16; j++) for (let i = 0; i < 16; i++) {
          const o = (j * 16 + i) * 4;
          if (!fb.d[o + 3]) continue;
          const hex = rtsUHex(fb.d[o], fb.d[o + 1], fb.d[o + 2]);
          for (let v = 0; v < 2; v++) for (let u = 0; u < 2; u++) rtsUPut(tmp, dx + i * 2 + u, -3 + j * 2 + v, hex);
        }
      }
      rtsUOutline(tmp);
      for (let q = 0; q < 32 * 24; q++) if (tmp.d[q * 4 + 3]) rtsUPut(b, q % 32, Math.floor(q / 32), rtsUHex(tmp.d[q * 4], tmp.d[q * 4 + 1], tmp.d[q * 4 + 2]));
    } else {
      const m = RTS_U_MODEL[key] || RTS_U_MODEL.tank, ic = m.icon || {}, k = ic.k || 1.5, dir = ic.dir == null ? 1 : ic.dir;
      const o = { w: 32, h: 24, cx: 16 + (m.air ? -1 : 0), cy: 12.5 + (m.air ? -1 : 0), k, ang: dir * Math.PI / 4, f: 0, pal, into: b, shadow: m.air ? [3, 3] : [1, 2] };
      rtsURaster(m.body(0), o);
      if (m.turret) rtsURaster(m.turret(false), Object.assign({}, o, { shadow: [1, 1] }));
    }
    rtsUIconFrame(b, pal);
    return rtsUCanvas(b);
  });
}
