'use strict';
// =====================================================================
//  The BLOCKS look (Settings -> SCREEN -> LOOK, and the pause menu): a texture pack in the style of the voxel
//  games. Every tile becomes a chunky 16px block (8px for the small things: plates, barrels, lamps, deflectors) with
//  per-pixel noise, darker edges and light from the top left; each season keeps its colours.
//    brick     cobblestone (mossy in spring and the swamp, sandstone bricks in the desert, dark bricks in the volcano,
//              clay bricks in the city, so they never look like its concrete)
//    steel     obsidian plates: near black with a lit bevel, so it stands out from cobble, concrete and any ground
//    concrete  a smooth pale slab with a seam; it cracks, then chips
//    trees     leaf blocks with gaps (cacti in the desert), water and lava flow, packed ice, sand, mud, planks...
//    ground    a floor of dark blocks: grass, leaf litter, snow, ash, sand, rock, marsh, paving
//  Only the drawing changes: the map, the rules and the online game are the same, and each player picks their own
//  (the setting isn't sent to guests). Galaxy, the tanks, the title and boss pictures keep their classic looks.
//  The textures are painted once per season (cached like themeTex's); changing the look redraws the layers once.
// =====================================================================

const blockLook = () => Config.get('look') === 'BLOCKS';

// ------------------------------------------------------------------ painting
const bkRGB = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const bkShade = (c, k) => c.map(v => Math.max(0, Math.min(255, Math.round(v * k))));
const bkMix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
const bkClamp = (t, lo, hi) => Math.max(lo, Math.min(hi, t));

// a w x h picture from fn(x, y) -> [r, g, b] or null (see-through); one ImageData write, not a fillRect per pixel
function bkPaint(w, h, fn) {
  const c = makeCanvas(w, h), x = c.getContext('2d'), im = x.createImageData(w, h), d = im.data;
  for (let y = 0; y < h; y++) for (let i = 0; i < w; i++) {
    const p = fn(i, y);
    if (!p) continue;
    const o = (y * w + i) * 4;
    d[o] = p[0]; d[o + 1] = p[1]; d[o + 2] = p[2]; d[o + 3] = 255;
  }
  x.putImageData(im, 0, 0);
  return c;
}

// smooth noise (0..1) that tiles every n pixels, so a block repeats without a seam; cells = blobs across
function bkNoise(n, cells, r) {
  const g = Array.from({ length: cells * cells }, () => r());
  const at = (i, j) => g[(((j % cells) + cells) % cells) * cells + (((i % cells) + cells) % cells)];
  const s = t => t * t * (3 - 2 * t);
  return (x, y) => {
    const fx = (x + 0.5) * cells / n, fy = (y + 0.5) * cells / n, i = Math.floor(fx), j = Math.floor(fy), u = s(fx - i), v = s(fy - j);
    return (at(i, j) * (1 - u) + at(i + 1, j) * u) * (1 - v) + (at(i, j + 1) * (1 - u) + at(i + 1, j + 1) * u) * v;
  };
}

// a block's own edges: lit along the top and left, in shadow along the bottom and right
function bkEdge(p, x, y, n, lit = 1.14, dark = 0.72) {
  if (x === n - 1 || y === n - 1) return bkShade(p, dark);
  if (x === 0 || y === 0) return bkShade(p, lit);
  return p;
}

// ------------------------------------------------------------------ the materials
// cobblestone: round stones in dark mortar (a wrapped Voronoi, so it tiles); each stone lit on its top left.
// ramp: mortar, then stone tones dark to light. moss: { at, cols } patches over it
function bkCobble(r, ramp, moss) {
  const R = ramp.map(bkRGB), N = 16, pts = [], id = [], lay = seeded(1777);   // the same stones in every season
  for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) pts.push([(i + 0.2 + lay() * 0.6) * N / 3, (j + 0.2 + lay() * 0.6) * N / 3, 1 + Math.floor(lay() * 3)]);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    let d1 = 1e9, d2 = 1e9, k1 = 0;
    pts.forEach((p, k) => {
      let dx = Math.abs(x + 0.5 - p[0]), dy = Math.abs(y + 0.5 - p[1]);
      dx = Math.min(dx, N - dx); dy = Math.min(dy, N - dy);
      const d = Math.sqrt(dx * dx * 0.8 + dy * dy * 1.15);
      if (d < d1) { d2 = d1; d1 = d; k1 = k; } else if (d < d2) d2 = d;
    });
    id.push(d2 - d1 < 0.85 ? -1 : k1);
  }
  const at = (x, y) => id[((y + N) % N) * N + ((x + N) % N)];
  const mn = moss && bkNoise(N, 4, r), M = moss && moss.cols.map(bkRGB);
  return bkPaint(N, N, (x, y) => {
    const k = at(x, y);
    let p;
    if (k < 0) p = r() < 0.25 ? bkShade(R[0], 1.25) : R[0];
    else {
      let t = pts[k][2];
      if (at(x, y - 1) < 0 || at(x - 1, y) < 0) t++;
      if (at(x, y + 1) < 0 || at(x + 1, y) < 0) t--;
      if (r() < 0.18) t += r() < 0.5 ? 1 : -1;
      p = R[bkClamp(t, 1, R.length - 1)];
    }
    if (mn && mn(x, y) > moss.at && r() < 0.85) p = M[k < 0 ? 0 : Math.floor(r() * M.length)];
    return bkEdge(p, x, y, N, 1.08, 0.8);
  });
}

// bricks in courses: bw x bh with a 1px joint, every second course moved along by off
function bkBricks(r, ramp, o) {
  const R = ramp.map(bkRGB), M = bkRGB(o.mortar), N = 16, tone = {};
  for (let k = 0; k < 64; k++) tone[k] = 1 + Math.floor(r() * (R.length - 2));
  return bkPaint(N, N, (x, y) => {
    const c = Math.floor(y / o.bh), yy = y % o.bh, xx = (x + (c & 1) * o.off) % N, bx = xx % o.bw;
    if (yy === o.bh - 1 || bx === o.bw - 1) return r() < 0.2 ? bkShade(M, 0.85) : M;
    let t = tone[c * 8 + Math.floor(xx / o.bw)];
    if (yy === 0 || bx === 0) t++;
    if (yy === o.bh - 2) t--;
    if (r() < 0.2) t += r() < 0.5 ? 1 : -1;
    return R[bkClamp(t, 0, R.length - 1)];
  });
}

// obsidian in 8px plates (like the classic steel's): near black with violet glints, a lit bevel, a black seam
function bkObsidian(r) {
  const D = ['#1C1034', '#241640', '#2C1C4E', '#36245E'].map(bkRGB), G = ['#544090', '#8C74D8'].map(bkRGB);
  const HI = bkRGB('#B4A4E8'), HI2 = bkRGB('#9484CC'), LO = bkRGB('#040208');
  return bkPaint(16, 16, (x, y) => {
    const i = x & 7, j = y & 7;
    if (i === 7 || j === 7) return LO;
    if (i === 0 || j === 0) return (i + j) & 1 ? HI : HI2;
    if (i === 6 || j === 6) return D[0];
    if (r() < 0.07) return G[r() < 0.65 ? 0 : 1];
    return D[Math.floor(r() * 4)];
  });
}

// leaves: three tones (R, as [r, g, b], dark to light) in clumps with dark gaps you can glimpse a tank through (trees hide tanks, as ever)
function bkLeaves(r, R, extra) {
  const n = bkNoise(16, 4, r), X = extra && bkRGB(extra);
  return bkPaint(16, 16, (x, y) => {
    const v = n(x, y) * 0.65 + r() * 0.45;
    if (v < 0.2) return null;
    let p = R[v < 0.42 ? 0 : v < 0.7 ? 1 : 2];
    if (X && r() < 0.07) p = X;
    return bkEdge(p, x, y, 16, 1.1, 0.72);
  });
}

// cactus: ribbed green pads with pale spines, gaps between them
function bkCactus(r) {
  const D = bkRGB('#1C5818'), M = bkRGB('#3C8C2C'), L = bkRGB('#58A838'), S = bkRGB('#F8E8B0');
  return bkPaint(16, 16, (x, y) => {
    const i = x & 7, j = y & 7;
    if (i === 7 || j === 7 || ((i === 0 || i === 6) && (j === 0 || j === 6))) return null;
    if (i === 0 || j === 0) return L;
    if (i === 6 || j === 6) return D;
    if ((i === 2 || i === 4) && (j & 1)) return r() < 0.5 ? S : M;
    return i === 3 ? L : r() < 0.2 ? D : M;
  });
}

// water: a slow mottle with light ripples; frame f moves both along
function bkWater(b, w, f) {
  const B = bkRGB(b), W = bkRGB(w), n = bkNoise(16, 4, seeded(77)), q = seeded(31);
  const rip = [[1, 2, 4], [8, 5, 3], [3, 9, 3], [11, 11, 4], [6, 14, 3]];
  return bkPaint(16, 16, (x, y) => {
    const v = n((x + f * 5) % 16, (y + f * 2) % 16) + q() * 0.12;
    let p = v < 0.38 ? bkShade(B, 0.8) : v < 0.72 ? B : bkShade(B, 1.12);
    for (const [rx, ry, len] of rip) {
      const sx = (x - rx - f * 2 + 32) % 16;
      if (y === ry && sx < len) p = bkMix(B, W, sx === 0 || sx === len - 1 ? 0.35 : 0.6);
    }
    return p;
  });
}

// lava: molten blobs, a dark crust drifting over it
function bkLava(f) {
  const n = bkNoise(16, 4, seeded(5)), q = seeded(9 + f);
  const C = ['#5C0800', '#A81000', '#E03800', '#F87800', '#F8C838', '#FCF0B0'].map(bkRGB);
  return bkPaint(16, 16, (x, y) => {
    const v = n((x + f * 6) % 16, (y + f * 3) % 16) + q() * 0.15;
    return C[v < 0.25 ? 0 : v < 0.38 ? 1 : v < 0.6 ? 2 : v < 0.8 ? 3 : v < 0.93 ? 4 : 5];
  });
}

// packed ice: pale and glassy, faint streaks, block edges showing
function bkIce(r, ramp) {
  const R = ramp.map(bkRGB), n = bkNoise(16, 3, r);
  return bkPaint(16, 16, (x, y) => {
    let t = n(x, y) < 0.45 ? 1 : 2;
    if (r() < 0.12) t += r() < 0.5 ? 1 : -1;
    if ((x * 2 + y) % 13 === 3 && r() < 0.8) t = 3;
    if (x === 0 || y === 0) t = 4;
    if (x === 15 || y === 15) t = 0;
    return R[bkClamp(t, 0, 4)];
  });
}

// a rough natural block from a ramp (bog, mud, basalt...): noise blobs plus speckle; stripes: vertical grain
function bkRough(r, ramp, o = {}) {
  const R = ramp.map(bkRGB), n = bkNoise(16, o.cells || 4, r), col = Array.from({ length: 16 }, () => r());
  return bkPaint(16, 16, (x, y) => {
    let v = n(x, y) * 0.75 + r() * 0.3;
    if (o.stripes) v = v * 0.5 + col[x] * 0.5 - (x % 4 === 3 ? 0.25 : 0);
    let p = R[bkClamp(Math.floor(v * (R.length - 1) + 0.3), 0, R.length - 2)];
    if (o.spot && r() < o.spot) p = R[R.length - 1];
    return o.edge === false ? p : bkEdge(p, x, y, 16, o.lit || 1.1, o.dark || 0.78);
  });
}

// a crack: a wandering dark line from one edge in (concrete, basalt)
function bkCracks(r, n) {
  const out = new Set();
  for (let k = 0; k < n; k++) {
    let x = 2 + Math.floor(r() * 12), y = r() < 0.5 ? 1 : 14;
    const dy = y < 8 ? 1 : -1;
    for (let s = 0; s < 6 + r() * 5; s++) { out.add(x + y * 16); y += dy; x += r() < 0.33 ? -1 : r() < 0.5 ? 1 : 0; x = bkClamp(x, 1, 14); if (y < 1 || y > 14) break; }
  }
  return out;
}

// concrete: a smooth pale slab with a seam across the middle; cracks after a hit, chips after two
function bkConc(r, hits) {
  const R = ['#5C5848', '#8C8878', '#A8A494', '#B8B4A4', '#CCC8B8', '#E0DCCC'].map(bkRGB), K = bkRGB('#2C2820');
  const cr = hits ? bkCracks(r, hits * 2) : new Set();
  return bkPaint(16, 16, (x, y) => {
    if (hits > 1 && ((x === 0 || x === 15 || y === 0 || y === 15) && r() < 0.35)) return null;
    if (cr.has(x + y * 16)) return K;
    let t = 3;
    if (r() < 0.22) t += r() < 0.5 ? 1 : -1;
    if (y === 7) t = 1;
    if (y === 8) t = 4;
    if (x === 0 || y === 0) t = 5;
    if (x === 15 || y === 15) t = 0;
    return R[t];
  });
}

// gravel and broken stone lying about (you drive over it): pebbles lit from the top left, gaps between
function bkRubble(r) {
  const P = [], C = ['#3C3830', '#5C584C', '#8C887C', '#B4B0A0'].map(bkRGB);
  for (let k = 0; k < 16; k++) P.push([r() * 16, r() * 16, 0.8 + r() * 1.1, 1 + Math.floor(r() * 2)]);
  const inP = (x, y) => P.find(p => { let dx = Math.abs(x + 0.5 - p[0]), dy = Math.abs(y + 0.5 - p[1]); dx = Math.min(dx, 16 - dx); dy = Math.min(dy, 16 - dy); return Math.max(dx, dy) < p[2]; });
  return bkPaint(16, 16, (x, y) => {
    const p = inP(x, y);
    if (!p) return null;
    let t = p[3];
    if (!inP(x, (y + 15) % 16) || !inP((x + 15) % 16, y)) t++;
    if (!inP(x, (y + 1) % 16) || !inP((x + 1) % 16, y)) t = 0;
    return C[bkClamp(t, 0, 3)];
  });
}

// a vent: a stepped crater of dark rock round an ember core
function bkVent(r) {
  const h = bkRGB('#6C6070'), k = bkRGB('#3C3040'), K = bkRGB('#2C2028'), b = bkRGB('#140C10'), c = bkRGB('#701000'), e = bkRGB('#C83000');
  return bkPaint(16, 16, (x, y) => {
    const dx = Math.abs(x - 7.5), dy = Math.abs(y - 7.5), d = Math.max(dx, dy) * 0.6 + (dx + dy) * 0.4;
    if (d > 8) return null;
    if (d > 6.2) return bkEdge(bkShade(x + y < 14 ? h : k, 0.9 + r() * 0.2), x, y, 16);
    if (d > 4.6) return K;
    if (d > 2.6) return b;
    return r() < 0.25 ? e : c;
  });
}

// reeds: tall stalks with joints and brown heads, leaves between, gaps
function bkReeds(r) {
  const g = bkRGB('#88B040'), G = bkRGB('#3C6C18'), n = bkRGB('#2C4C10'), b = bkRGB('#7C4818'), B = bkRGB('#4C2808');
  const head = Array.from({ length: 4 }, () => Math.floor(r() * 10));
  return bkPaint(16, 16, (x, y) => {
    const s = x % 4, k = x >> 2;
    if (s === 1 || s === 2) {
      if (y >= head[k] && y < head[k] + 3) return s === 1 ? b : B;
      if ((y + k * 3) % 5 === 0) return n;
      return s === 1 ? g : G;
    }
    if (r() < 0.45) return null;
    return r() < 0.5 ? G : n;
  });
}

// a lamp (8px): a glowing block in a dark frame
function bkLamp(r) {
  const F = bkRGB('#3C3020'), Y = ['#C88C20', '#F8B800', '#F8D878', '#F8E8A0', '#FCF8E0'].map(bkRGB);
  return bkPaint(8, 8, (x, y) => {
    if (x === 0 || y === 0 || x === 7 || y === 7) return (x + y) & 1 ? F : bkShade(F, 1.3);
    const c = Math.abs(x - 3.5) + Math.abs(y - 3.5);
    return Y[bkClamp(4 - Math.floor(c) + (r() < 0.3 ? -1 : 0), 0, 4)];
  });
}

// a barrel (8px): a cube with a dark rim, lit on the left, a bright warning band round the middle
function bkDrum(r, C) {
  const [d, k, R, h, w] = [C.d, C.r, C.R, C.h, C.w].map(bkRGB);
  return bkPaint(8, 8, (x, y) => {
    if (y === 0) return k;
    if (y === 7 || x === 7) return d;
    if (y === 3 || y === 4) return x === 0 ? bkShade(w, 1.1) : r() < 0.15 ? bkShade(w, 0.8) : w;
    if (x === 0) return h;
    if (y === 1) return bkShade(R, 1.15);
    return r() < 0.2 ? k : R;
  });
}

// a supply crate: a framed wooden chest with iron corners and a catch (bridges are bare planks)
function bkCrate(r) {
  const k = bkRGB('#3C1C00'), W = bkRGB('#F0B060'), w = bkRGB('#B76506'), dk = bkRGB('#8C4C04'), I = bkRGB('#BCBCBC'), Id = bkRGB('#6C6C6C'), Y = bkRGB('#F8D838');
  return bkPaint(16, 16, (x, y) => {
    if (x === 0 || y === 0 || x === 15 || y === 15) return k;
    if ((x < 3 || x > 12) && (y < 3 || y > 12)) return (x + y) & 1 ? I : Id;
    if ((x === 7 || x === 8) && y >= 6 && y <= 8) return y === 8 ? Id : Y;
    if (y === 6 || y === 7) return y === 6 ? k : dk;
    if (x === 1 || y === 1) return W;
    if (x === 14 || y === 14) return dk;
    return (y % 5 === 0) ? dk : r() < 0.15 ? dk : w;
  });
}

// a deflector (8px): the classic's exact diagonal (gameplay hangs on it) as a polished band across dark stone
function bkDefl(r, flip) {
  const S = ['#202028', '#2C2C34', '#383840'].map(bkRGB), W = bkRGB('#F8F8F8'), G = bkRGB('#BCBCBC'), D = bkRGB('#5C5C5C');
  return bkPaint(8, 8, (x0, y) => {
    const x = flip ? 7 - x0 : x0, s = x + y;
    if (s === 6) return W;
    if (s === 7) return G;
    if (s === 8) return D;
    return bkEdge(S[Math.floor(r() * 3)], x0, y, 8, 1.4, 0.7);
  });
}

// bridge planks: boards across, dark gaps and joints
function bkPlanks(r) {
  const L = bkRGB('#E8A048'), M = bkRGB('#C07818'), m = bkRGB('#A86408'), D = bkRGB('#5C2C00');
  const joint = Array.from({ length: 4 }, () => Math.floor(r() * 16)), grain = Array.from({ length: 16 }, () => r());
  return bkPaint(16, 16, (x, y) => {
    const b = y >> 2, yy = y & 3;
    if (yy === 3) return D;
    if (x === joint[b]) return D;
    if (yy === 0) return L;
    return grain[(x + b * 5) % 16] < 0.25 ? m : M;
  });
}

// ------------------------------------------------------------------ each season's blocks
// what each season's walls are made of (the rest follows its classic colours: trees, water, barrels)
const BK_WALLS = {
  classic: { kind: 'cobble', ramp: ['#202020', '#585858', '#747474', '#929292', '#B4B4B4'] },
  spring: { kind: 'cobble', ramp: ['#202020', '#585858', '#747474', '#929292', '#B4B4B4'], moss: { at: 0.68, cols: ['#2C4818', '#4C7C28', '#6C9C38'] } },
  summer: { kind: 'cobble', ramp: ['#24221E', '#5C5850', '#78746C', '#949088', '#B4B0A8'] },
  autumn: { kind: 'cobble', ramp: ['#241A10', '#5C4C38', '#786850', '#94846C', '#B4A48C'], moss: { at: 0.74, cols: ['#5C2C08', '#A84C10', '#C87018'] } },
  winter: { kind: 'cobble', ramp: ['#141820', '#707888', '#8890A0', '#A4ACBC', '#C8D0DC'] },
  nuclear: { kind: 'cobble', ramp: ['#121210', '#5C5C4C', '#747464', '#8C8C7C', '#A8A898'], moss: { at: 0.78, cols: ['#3C4C10', '#5C7418', '#7C9C20'] } },
  desert: { kind: 'bricks', ramp: ['#8C6428', '#B08840', '#C8A050', '#D8B868', '#ECD088'], o: { bw: 16, bh: 4, off: 8, mortar: '#6C4818' } },
  volcanic: { kind: 'bricks', ramp: ['#4C1810', '#6C281C', '#843424', '#9C442C', '#B85C3C'], o: { bw: 8, bh: 4, off: 4, mortar: '#140404' } },
  swamp: { kind: 'cobble', ramp: ['#14180C', '#545848', '#6C705C', '#888C74', '#A4A890'], moss: { at: 0.56, cols: ['#2C4818', '#3C6420', '#5C8430'] } },
  city: { kind: 'bricks', ramp: ['#6C2010', '#903020', '#A84030', '#BC5038', '#D06848'], o: { bw: 8, bh: 4, off: 4, mortar: '#B4ACA0' } },
};
// ground blocks: a ramp dark to light (kept dark, as the classic grounds, so tanks and shells stand out), and
// specks: things lying on it [colour, chance per pixel]
const BK_GROUND = {
  classic: { ramp: ['#060608', '#0A0A0D', '#0E0E12', '#121217'] },
  spring: { ramp: ['#0A1806', '#0E200A', '#12280C', '#162E10'], specks: [['#F8A8D0', 0.004], ['#E8E8E8', 0.002], ['#24401A', 0.02]] },
  summer: { ramp: ['#091505', '#0C1C08', '#10240A', '#142C0E'], specks: [['#24481A', 0.03], ['#C8C838', 0.001]] },
  autumn: { ramp: ['#140A04', '#1C1006', '#24160A', '#2C1C0C'], specks: [['#6C2C08', 0.018], ['#8C4C0C', 0.012], ['#7C1C04', 0.008]] },
  winter: { ramp: ['#323C4A', '#3A4656', '#424E5E', '#4A5868'], specks: [['#6C7C90', 0.02], ['#8C9CB0', 0.005]] },
  nuclear: { ramp: ['#1A1A14', '#22221A', '#2A2A20', '#323226'], specks: [['#3C3C30', 0.04], ['#141410', 0.03], ['#4C5C18', 0.003]] },
  desert: { ramp: ['#4C381A', '#56401E', '#604824', '#6A5029'], specks: [['#7C5C2C', 0.04], ['#443016', 0.02]] },
  volcanic: { ramp: ['#140806', '#1C0E0A', '#24120E', '#2C1612'], specks: [['#3C1C14', 0.03], ['#5C1808', 0.006]], glow: '#6C1C08' },
  swamp: { ramp: ['#0E1408', '#12180A', '#161E0E', '#1C2412'], specks: [['#2C4018', 0.025], ['#080C04', 0.03]] },
  city: { ramp: ['#202024', '#26262A', '#2C2C30', '#323236'], specks: [['#3A3A3E', 0.03], ['#18181A', 0.02]], lanes: '#4C4C44' },
};

// a colour from the season's classic textures (so the blocks keep each season's feel)
function bkCol(theme, kind, k) {
  const o = ((THEMES[theme] || {}).tex || {})[kind];
  return (o && o.colors && o.colors[k]) || TEX_SRC[kind].colors[k];
}

const blockTexCache = {};
// every texture themeTex has, as blocks (seasons.js asks for these while the look is BLOCKS); plus mud, the bridge's
// planks and the belts' bed, which are the same in every classic season
function blockTex(theme) {
  if (blockTexCache[theme]) return blockTexCache[theme];
  if (!THEMES[theme]) theme = 'classic';
  const r = seeded(4099 + theme.length * 131 + theme.charCodeAt(0) * 7), W = BK_WALLS[theme] || BK_WALLS.classic, out = {};
  out.brick = W.kind === 'bricks' ? bkBricks(r, W.ramp, W.o) : bkCobble(r, W.ramp, W.moss);
  out.steel = bkObsidian(seeded(271));
  const g = bkCol(theme, 'forest', 'g'), G = bkCol(theme, 'forest', 'G');
  out.forest = theme === 'desert' ? bkCactus(r)
    : bkLeaves(r, [bkShade(bkRGB(G), 0.8), bkMix(bkRGB(G), bkRGB(g), 0.45), bkRGB(g)],
      theme === 'spring' ? bkCol(theme, 'forest', 'p') : theme === 'winter' ? '#F8F8FF' : null);
  out.water0 = bkWater(bkCol(theme, 'water0', 'b'), bkCol(theme, 'water0', 'w'), 0);
  out.water1 = bkWater(bkCol(theme, 'water1', 'b'), bkCol(theme, 'water1', 'w'), 1);
  out.ice = bkIce(r, theme === 'nuclear' ? ['#5C5C48', '#8C8C78', '#A8A890', '#C8C8B0', '#E0E0CC'] : ['#4C74B0', '#7CA4DC', '#98BCEC', '#C0DCFC', '#E8F4FF']);
  out.lava0 = bkLava(0); out.lava1 = bkLava(1);
  const bas = ['#18141C', '#302838', '#3C3444', '#4C4454', '#6C6474'];
  out.basalt = bkRough(seeded(61), bas, { stripes: true, lit: 1.3, dark: 0.5 });
  const cr = bkCracks(seeded(67), 3);   // cracked: the same rock with glowing cracks
  out.basalt2 = bkRough(seeded(61), bas, { stripes: true, lit: 1.3, dark: 0.5 });
  out.basalt2.getContext('2d').drawImage(bkPaint(16, 16, (x, y) => (cr.has(x + y * 16) ? bkRGB((x + y) & 1 ? '#E85800' : '#F8B800') : null)), 0, 0);
  out.vent = bkVent(r);
  out.bog = bkRough(r, ['#1C2410', '#283018', '#323C1C', '#3C4824', '#6C7C34'], { spot: 0.03, lit: 1.08, dark: 0.85 });
  out.reeds = bkReeds(r);
  out.conc = bkConc(r, 0); out.conc2 = bkConc(r, 1); out.conc3 = bkConc(r, 2);
  out.rubble = bkRubble(r);
  out.lamp = bkLamp(r);
  out.drum = bkDrum(r, { d: bkCol(theme, 'drum', 'd'), r: bkCol(theme, 'drum', 'r'), R: bkCol(theme, 'drum', 'R'), h: bkCol(theme, 'drum', 'h'), w: bkCol(theme, 'drum', 'w') });
  out.crate = bkCrate(r);
  out.defl = bkDefl(r, false); out.defl2 = bkDefl(r, true);
  // mud: darker and wetter than any season's ground (it slows you: it must show)
  out.mud = bkRough(r, ['#24160A', '#342010', '#442C14', '#54381C', '#A87C44'], { spot: 0.04, cells: 5, lit: 1.25, dark: 0.6 });
  out.bridge = bkPlanks(r);
  out.belt = bkRough(r, ['#242020', '#2C2828', '#363232', '#403C3C', '#5C5454'], { spot: 0.02, edge: false });
  blockTexCache[theme] = out;
  return out;
}

// the ground as blocks (seasons.js groundLayer): a 16px floor, each block a shade of its own, seams in shadow
function blockGround(x, theme, r) {
  const G = BK_GROUND[theme] || BK_GROUND.classic, R = G.ramp.map(bkRGB), S = (G.specks || []).map(([c, p]) => [bkRGB(c), p]);
  const im = x.createImageData(FW, FH), d = im.data, BW = Math.ceil(FW / 16), tone = [];
  for (let k = 0; k < BW * Math.ceil(FH / 16); k++) tone.push(r() < 0.7 ? 1 : r() < 0.5 ? 2 : 0);
  const glowSeam = new Set();
  if (G.glow) for (let k = 0; k < tone.length / 6; k++) glowSeam.add(Math.floor(r() * tone.length));
  for (let y = 0; y < FH; y++) for (let i = 0; i < FW; i++) {
    const bx = i >> 4, by = y >> 4, xx = i & 15, yy = y & 15, b = by * BW + bx;
    let t = tone[b] + (r() < 0.2 ? 1 : 0) - (r() < 0.08 ? 1 : 0), p = R[bkClamp(t, 0, R.length - 1)];
    for (const [c, ch] of S) if (r() < ch) { p = c; break; }
    if (xx === 15 || yy === 15) p = glowSeam.has(b) && r() < 0.7 ? bkRGB(G.glow) : bkShade(R[0], 0.65);
    else if (xx === 0 || yy === 0) p = bkShade(p, 1.12);
    const o = (y * FW + i) * 4;
    d[o] = p[0]; d[o + 1] = p[1]; d[o + 2] = p[2]; d[o + 3] = 255;
  }
  x.putImageData(im, 0, 0);
  if (G.lanes) {   // worn lane dashes, one block row in four
    x.fillStyle = G.lanes;
    for (let y = 40; y < FH - 24; y += 64) for (let px = 4; px < FW; px += 16) if (r() < 0.7) x.fillRect(px, y, 7, 1);
  }
}

// ------------------------------------------------------------------ pads, manholes, belts
const blockSprites = {};
function blockSprite(key, make) { return blockSprites[key] || (blockSprites[key] = make()); }

// a teleporter pad: a portal in an obsidian frame, swirling in its colour; pulse: the core lit up
function blockPad(ctx, p, pulse) {
  ctx.drawImage(blockSprite('pad' + p.color + pulse, () => {
    const C = bkRGB(p.color), r = seeded(17), n = bkNoise(12, 3, seeded(23));
    const fr = bkObsidian(seeded(29)).getContext('2d').getImageData(0, 0, 16, 16).data;
    return bkPaint(16, 16, (x, y) => {
      if (x < 2 || y < 2 || x > 13 || y > 13) { const o = (y * 16 + x) * 4; return [fr[o], fr[o + 1], fr[o + 2]]; }
      const c = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5));
      if (c < 2 + pulse) return bkMix(C, [255, 255, 255], pulse ? 0.6 : 0.35);
      const v = n(x - 2, y - 2) * 0.7 + r() * 0.3;
      return bkShade(C, v < 0.35 ? 0.35 : v < 0.65 ? 0.6 : 0.9);
    });
  }), p.x, p.y);
}

// a manhole: an iron hatch with bars and rivets
function blockHole() {
  return blockSprite('hole', () => {
    const k = bkRGB('#141418'), m = bkRGB('#4C4C54'), h = bkRGB('#7C7C88'), H = bkRGB('#A8A8B4');
    return bkPaint(16, 16, (x, y) => {
      if (x === 0 || y === 0 || x === 15 || y === 15) return k;
      if (x === 1 || y === 1) return H;
      if (x === 14 || y === 14) return m;
      if ((x === 3 || x === 12) && (y === 3 || y === 12)) return H;
      return y % 4 === 2 ? k : y % 4 === 3 ? m : h;
    });
  });
}
