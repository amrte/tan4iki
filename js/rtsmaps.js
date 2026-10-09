'use strict';
// =====================================================================
//  DESERT DOMINION: the maps of KHARRA (the engine is rts.js, the campaign rtscampaign.js)
//    - rtsMapGen({ w, h, players, seed, style }) -> a map { w, h, t, g, starts, blooms } (the contract's format):
//      seeded and deterministic. Every start is a rock plateau big enough for a base (opts.baseR: its radius per
//      start), with a home glimmer field of the same size near it, more contested fields in between, blooms out
//      in the open sand, dune ridges, mountains (cliffs) on the rock. Styles:
//        open     wide sand seas with rock outcrops (lots of room for wyrms)
//        canyons  mostly rock cut by sand canyons and cliff ridges; narrow passes
//        islands  rock islands in a deep sand sea
//        basin    a rock rim round a rich sand basin with a few mesas
//      Every start can reach every other by vehicle (cliffs are cut through where needed: canyon passes) and every
//      pocket of open ground joins the rest.
//    - rtsMapPlaceBase(map, cx, cy, keys, opts): a prebuilt base on the rock round (cx, cy): buildings packed with
//      a lane between them, laid on concrete, turrets on the side the attacks come from.
//    - rtsMapMission(spec): one campaign mission's map and set-up (RTS_C_MAP_MISSIONS: sizes, bases, units,
//      reinforcements by mission level), checked with rtsMapValidate.
//    - rtsMapThumb(map, scale): the map as a picture (one pixel a tile), for menus, tests and the stand-in screen.
//  Tile kinds: 0 sand, 1 dunes, 2 rock, 3 cliff, 4 glimmer, 5 thick glimmer, 6 bloom, 7 concrete, 8 sand crater,
//  9 rock crater, 10 rubble. Buildings are { key, x, y } with x, y the top-left tile of the footprint.
// =====================================================================

const RTS_C_MAP_STYLES = ['open', 'canyons', 'islands', 'basin'];
// building footprints (RTS_BUILDINGS, when CORE's data has them, wins)
const RTS_C_MAP_BSIZE = {
  slab1: [1, 1], slab4: [2, 2], yard: [2, 2], vapor: [2, 2], refinery: [3, 2], silo: [2, 2], radar: [2, 2], barracks: [2, 2],
  hall: [2, 2], light: [2, 2], heavy: [3, 2], hightech: [3, 2], repair: [3, 2], lab: [2, 2], starport: [3, 3], palace: [3, 3],
  wall: [1, 1], turret: [1, 1], rturret: [1, 1],
};
const RTS_C_MAP_DEFENCE = { wall: 1, turret: 1, rturret: 1 };

function rtsMapBSize(key) {
  const B = typeof RTS_BUILDINGS !== 'undefined' && RTS_BUILDINGS ? RTS_BUILDINGS[key] : null;
  if (B) {
    const w = B.w || (B.size && B.size[0]), h = B.h || (B.size && B.size[1]);
    if (w > 0 && h > 0) return [w, h];
  }
  return RTS_C_MAP_BSIZE[key] || [2, 2];
}
// what a tile is to the things on it
const rtsMapSandy = k => k === 0 || k === 1 || k === 4 || k === 5 || k === 6 || k === 8;
const rtsMapRocky = k => k === 2 || k === 7 || k === 9 || k === 10;
const rtsMapDrive = k => k !== 3 && k >= 0 && k <= 10;   // vehicles: everything but cliffs
const rtsMapBuildable = k => k === 2 || k === 7;

// ------------------------------------------------------------------ numbers from a seed
function rtsMapRng(seed) {
  let a = (seed >>> 0) || 0x9E3779B9;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function rtsMapHash(x, y, s) {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
// a seed from anything (strings, numbers): the same input, the same map
function rtsMapSeed(...parts) {
  let h = 2166136261;
  for (const c of parts.join('|')) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}
// smooth value noise 0..1, and a few octaves of it
function rtsMapNoise(x, y, s) {
  const i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const a = rtsMapHash(i, j, s), b = rtsMapHash(i + 1, j, s), c = rtsMapHash(i, j + 1, s), d = rtsMapHash(i + 1, j + 1, s);
  return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
}
function rtsMapFbm(x, y, s, oct = 4) {
  let sum = 0, amp = 1, tot = 0, f = 1;
  for (let o = 0; o < oct; o++) { sum += rtsMapNoise(x * f, y * f, s + o * 977) * amp; tot += amp; amp *= 0.5; f *= 2.03; }
  return sum / tot;
}

// ------------------------------------------------------------------ the generator
// opts: { w, h, players, seed, style, baseR: [radius per start] | n, rich: glimmer factor (1), worms }
function rtsMapGen(opts) {
  opts = opts || {};
  const w = Math.max(32, Math.min(128, opts.w | 0 || 64)), h = Math.max(32, Math.min(128, opts.h | 0 || w));
  const n = Math.max(1, Math.min(4, opts.players | 0 || 2));
  const seed = (opts.seed === undefined ? 1 : opts.seed) >>> 0;
  const style = RTS_C_MAP_STYLES.includes(opts.style) ? opts.style : 'open';
  const rich = opts.rich > 0 ? opts.rich : 1;
  const R = rtsMapRng(seed ^ 0x5EED);
  const N = w * h, t = new Uint8Array(N), g = new Uint16Array(N);
  const id = (x, y) => y * w + x, inside = (x, y) => x >= 0 && y >= 0 && x < w && y < h;
  const small = Math.min(w, h);
  const baseR = [];
  for (let i = 0; i < n; i++) {
    const r = Array.isArray(opts.baseR) ? opts.baseR[i] : opts.baseR;
    baseR.push(Math.max(6, Math.min(16, r || Math.round(Math.max(7, Math.min(10, small / 7))))));
  }

  // --- the starts: round the middle, evenly spaced (2: across, 3: a triangle, 4: the corners), a little jitter
  const cx = (w - 1) / 2, cy = (h - 1) / 2, starts = [];
  const a0 = n === 4 ? Math.PI / 4 + (R() < 0.5 ? 0 : Math.PI / 2) : R() * Math.PI * 2;
  for (let i = 0; i < n; i++) {
    const a = a0 + i * Math.PI * 2 / n + (R() - 0.5) * 0.18, ca = Math.cos(a), sa = Math.sin(a);
    const m = baseR[i] + 3;
    let s = Math.min(Math.abs(ca) > 1e-3 ? (w / 2 - m) / Math.abs(ca) : 1e9, Math.abs(sa) > 1e-3 ? (h / 2 - m) / Math.abs(sa) : 1e9);
    s *= style === 'basin' ? 0.97 : 0.9;
    if (n === 1) s = 0;
    const x = Math.round(Math.max(m, Math.min(w - 1 - m, cx + ca * s))), y = Math.round(Math.max(m, Math.min(h - 1 - m, cy + sa * s)));
    starts.push({ x, y, r: baseR[i] });
  }

  // --- rock, cliffs and sand by style
  const S1 = seed * 7 + 11, S2 = seed * 13 + 5, S3 = seed * 31 + 17, S4 = seed * 3 + 23;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const f = rtsMapFbm(x / 15, y / 15, S1), f2 = rtsMapFbm(x / 9, y / 9, S2, 3);
    let k = 0;
    if (style === 'open') {
      if (f > 0.63) k = 2;
      if (f > 0.71 && f2 > 0.5) k = 3;
    } else if (style === 'canyons') {
      // rock everywhere but along winding sand canyons (and a few wider sand flats); cliff ridges between them
      const chan = Math.abs(2 * rtsMapFbm(x / 22, y / 22, S3, 3) - 1), ridge = 1 - Math.abs(2 * rtsMapFbm(x / 14, y / 14, S4 + 7, 3) - 1);
      k = chan < 0.13 || f < 0.33 ? 0 : 2;
      if (k === 2 && chan > 0.22 && ridge > 0.9) k = 3;
    } else if (style === 'islands') {
      if (f > 0.66) k = 2;
      if (f > 0.76 && f2 > 0.55) k = 3;
    } else {   // basin
      const dx = (x - cx) / (w / 2), dy = (y - cy) / (h / 2), d = Math.sqrt(dx * dx + dy * dy) + (f - 0.5) * 0.35;
      if (d > 0.72) k = 2;
      if (d > 0.72 && d < 0.79 && f2 > 0.52) k = 3;
      if (d > 0.98 && f2 > 0.6) k = 3;
      if (d < 0.6 && f > 0.69) k = f > 0.74 && f2 > 0.5 ? 3 : 2;   // mesas
    }
    t[id(x, y)] = k;
  }

  // --- the plateaus: clean rock for each base, cliffs along parts of the edge
  const core = new Uint8Array(N);   // 1: a base's ground, kept clear of fields and blooms
  starts.forEach((st, i) => {
    const r = st.r, ph = R() * 100;
    for (let y = st.y - r - 3; y <= st.y + r + 3; y++) for (let x = st.x - r - 3; x <= st.x + r + 3; x++) {
      if (!inside(x, y)) continue;
      const dx = x - st.x, dy = y - st.y, d = Math.sqrt(dx * dx + dy * dy), a = Math.atan2(dy, dx);
      const edge = r * (0.86 + 0.28 * rtsMapNoise(a * 1.6 + ph, i * 3.7, S4));
      if (d <= edge) {
        const wall = d > edge - 1.2 && rtsMapNoise(a * 2.4 + ph, 9 + i, S3) > (style === 'canyons' ? 0.5 : 0.6);
        t[id(x, y)] = wall ? 3 : 2;
        if (d <= edge - 1.5) core[id(x, y)] = 1;
      } else if (d <= edge + 2.2 && t[id(x, y)] === 3) t[id(x, y)] = 2;   // no cliff hard against the plateau's foot
    }
  });

  // --- dune ridges on the open sand (long waves across the wind)
  const wa = R() * Math.PI, wc = Math.cos(wa), ws = Math.sin(wa);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (t[id(x, y)] !== 0) continue;
    const u = x * wc + y * ws, wave = Math.abs(Math.sin(u * 0.55 + rtsMapFbm(x / 10, y / 10, S2 + 1, 3) * 7));
    if (wave > 0.8 && rtsMapFbm(x / 13, y / 13, S3 + 2, 2) > (style === 'islands' || style === 'open' ? 0.42 : 0.5)) t[id(x, y)] = 1;
  }

  // --- glimmer fields: grown as blobs over the sand (thick in the middle), the same size for every House's home
  const near = (x, y, pad) => starts.some(s => (x - s.x) ** 2 + (y - s.y) ** 2 < (s.r + pad) ** 2);
  const field = (fx, fy, size, opt = {}) => {
    fx = Math.round(fx); fy = Math.round(fy);
    if (!inside(fx, fy)) return 0;
    const seen = new Uint8Array(N), pq = [[0, fx, fy]], got = [];
    seen[id(fx, fy)] = 1;
    let pops = 0;
    while (pq.length && got.length < size && pops++ < size * 8) {
      let bi = 0;
      for (let k = 1; k < pq.length; k++) if (pq[k][0] < pq[bi][0]) bi = k;
      const [, x, y] = pq[bi];
      pq[bi] = pq[pq.length - 1]; pq.pop();
      const i = id(x, y), k = t[i];
      const ok = !core[i] && k !== 3 && k !== 6 && k !== 4 && k !== 5 && (opt.anyGround || !rtsMapRocky(k));
      if (!ok && got.length) continue;   // (before the first tile is found, it looks on through anything)
      if (ok) got.push(i);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (!inside(nx, ny) || seen[id(nx, ny)]) continue;
        seen[id(nx, ny)] = 1;
        const nk = t[id(nx, ny)], dd = Math.hypot(nx - fx, ny - fy);
        pq.push([dd + rtsMapHash(nx, ny, seed) * 2.2 + (rtsMapSandy(nk) ? 0 : 4), nx, ny]);
      }
    }
    const thick = Math.round(got.length * (opt.thick || 0.35));
    got.forEach((i, k) => {
      // a field laid over rock sits in a hollow of sand
      if (rtsMapRocky(t[i])) for (const d of [-1, 1, -w, w, -w - 1, -w + 1, w - 1, w + 1]) { const j = i + d; if (j >= 0 && j < N && t[j] === 2 && !core[j]) t[j] = 0; }
      t[i] = k < thick ? 5 : 4; g[i] = k < thick ? 200 : 100;
    });
    return got.length;
  };
  // the best sandy spot along a direction (or anywhere near), for a field
  const sandSpot = (x0, y0, ang, d0, d1, pad) => {
    for (let d = d0; d <= d1; d++) for (const da of [0, 0.25, -0.25, 0.5, -0.5, 0.8, -0.8]) {
      const x = Math.round(x0 + Math.cos(ang + da) * d), y = Math.round(y0 + Math.sin(ang + da) * d);
      if (inside(x, y) && rtsMapSandy(t[id(x, y)]) && !near(x, y, pad)) return [x, y];
    }
    return null;
  };
  const homeSize = Math.round(46 * rich), side = R() < 0.5 ? 1 : -1;
  // (every home field the same size, at the same distance and the same turn from the way to the middle; laid over
  // rock it sinks into a hollow of sand)
  starts.forEach(st => {
    const toMid = n === 1 ? R() * 6.28 : Math.atan2(cy - st.y, cx - st.x), ang = toMid + side * 0.7;
    const d = st.r + 5, fx = Math.max(3, Math.min(w - 4, st.x + Math.cos(ang) * d)), fy = Math.max(3, Math.min(h - 4, st.y + Math.sin(ang) * d));
    field(fx, fy, homeSize, { anyGround: true });
  });
  // contested: between the starts and in the middle
  const contested = [];
  if (n === 2) {   // two fields either side of the middle, off the straight line between the bases
    const ax = starts[1].x - starts[0].x, ay = starts[1].y - starts[0].y, al = Math.hypot(ax, ay) || 1, off = small / 4.5;
    contested.push([cx - ay / al * off, cy + ax / al * off], [cx + ay / al * off, cy - ax / al * off]);
  } else if (n > 2) {
    for (let i = 0; i < n; i++) { const a = starts[i], b = starts[(i + 1) % n]; contested.push([(a.x + b.x) / 2, (a.y + b.y) / 2]); }
  }
  if (n !== 2) contested.push([cx + (R() - 0.5) * 4, cy + (R() - 0.5) * 4]);
  for (const [x, y] of contested) {
    const p = sandSpot(x, y, R() * 6.28, 0, 8, 4) || [x, y];
    field(p[0], p[1], Math.round((style === 'basin' ? 80 : 58) * rich), { anyGround: style !== 'canyons', thick: 0.45 });
  }
  // scattered smaller ones
  const extra = Math.round(N / (style === 'basin' ? 700 : 1000) * rich);
  for (let k = 0; k < extra; k++) {
    for (let tries = 0; tries < 30; tries++) {
      const x = Math.floor(R() * w), y = Math.floor(R() * h);
      if (!rtsMapSandy(t[id(x, y)]) || t[id(x, y)] >= 4 || near(x, y, 5)) continue;
      field(x, y, 14 + Math.floor(R() * 26), { thick: 0.25 + R() * 0.2 });
      break;
    }
  }

  // --- fair shares: a House with less glimmer round its base than the richest gets another field near it
  const share = st => { let sum = 0; const rr = st.r + 14; for (let y = Math.max(0, st.y - rr); y <= Math.min(h - 1, st.y + rr); y++) for (let x = Math.max(0, st.x - rr); x <= Math.min(w - 1, st.x + rr); x++) if ((x - st.x) ** 2 + (y - st.y) ** 2 <= rr * rr) sum += g[id(x, y)]; return sum; };
  for (let pass = 0; pass < 3 && n > 1; pass++) {
    const sh = starts.map(share), top = Math.max(...sh);
    let added = false;
    starts.forEach((st, i) => {
      if (sh[i] >= top * 0.85) return;
      const toMid = Math.atan2(cy - st.y, cx - st.x) - side * (0.8 + pass * 0.5);
      const p = sandSpot(st.x, st.y, toMid, st.r + 4, st.r + 11, 3) || [st.x + Math.cos(toMid) * (st.r + 6), st.y + Math.sin(toMid) * (st.r + 6)];
      if (field(Math.max(3, Math.min(w - 4, p[0])), Math.max(3, Math.min(h - 4, p[1])), Math.max(8, Math.round((top - sh[i]) / 125)), { anyGround: true, thick: 0.3 })) added = true;
    });
    if (!added) break;
  }

  // --- blooms out on the open sand
  const blooms = [];
  const nb = Math.max(1, Math.round(N / 1300));
  for (let k = 0, tries = 0; k < nb && tries < 400; tries++) {
    const x = 2 + Math.floor(R() * (w - 4)), y = 2 + Math.floor(R() * (h - 4)), i = id(x, y);
    if ((t[i] !== 0 && t[i] !== 1) || near(x, y, 6)) continue;
    if (blooms.some(([bx, by]) => Math.abs(bx - x) + Math.abs(by - y) < 8)) continue;
    t[i] = 6; blooms.push([x, y]); k++;
  }

  const map = { w, h, t, g, starts: starts.map(s => ({ x: s.x, y: s.y })), blooms, style, seed, baseR };
  rtsMapConnect(map);
  return map;
}

// ------------------------------------------------------------------ connections
// labels the ground vehicles can drive on into connected areas: { lab (Int32Array, -1 for cliffs), sizes }
function rtsMapAreas(map) {
  const { w, h, t } = map, N = w * h, lab = new Int32Array(N).fill(-1), sizes = [], q = new Int32Array(N);
  for (let s = 0; s < N; s++) {
    if (lab[s] >= 0 || !rtsMapDrive(t[s])) continue;
    const L = sizes.length;
    let qh = 0, qt = 0, cnt = 0;
    q[qt++] = s; lab[s] = L;
    while (qh < qt) {
      const i = q[qh++], x = i % w, y = (i - x) / w;
      cnt++;
      if (x > 0 && lab[i - 1] < 0 && rtsMapDrive(t[i - 1])) { lab[i - 1] = L; q[qt++] = i - 1; }
      if (x < w - 1 && lab[i + 1] < 0 && rtsMapDrive(t[i + 1])) { lab[i + 1] = L; q[qt++] = i + 1; }
      if (y > 0 && lab[i - w] < 0 && rtsMapDrive(t[i - w])) { lab[i - w] = L; q[qt++] = i - w; }
      if (y < h - 1 && lab[i + w] < 0 && rtsMapDrive(t[i + w])) { lab[i + w] = L; q[qt++] = i + w; }
    }
    sizes.push(cnt);
  }
  return { lab, sizes };
}

// joins everything up: tiny pockets become mountain, bigger ones get a pass cut to the main ground (the area of
// the first start) through the fewest cliffs
function rtsMapConnect(map) {
  const { w, h, t, g } = map, N = w * h;
  for (let guard = 0; guard < 64; guard++) {
    const { lab, sizes } = rtsMapAreas(map);
    const s0 = map.starts[0], main = lab[s0.y * w + s0.x];
    if (main < 0) { t[s0.y * w + s0.x] = 2; continue; }
    // pockets of 1-3 tiles: filled in
    let other = false;
    for (let i = 0; i < N; i++) {
      const L = lab[i];
      if (L < 0 || L === main) continue;
      if (sizes[L] <= 3 && !map.starts.some(s => s.y * w + s.x === i)) { t[i] = 3; g[i] = 0; } else other = true;
    }
    if (!other) return map;
    // breadth-first out of the main ground across cliffs to the nearest other area, then cut along the way back
    const from = new Int32Array(N).fill(-2), q = new Int32Array(N);
    let qh = 0, qt = 0, hit = -1;
    for (let i = 0; i < N; i++) if (lab[i] === main) { from[i] = -1; q[qt++] = i; }
    while (qh < qt && hit < 0) {
      const i = q[qh++], x = i % w, y = (i - x) / w;
      for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1]) {
        if (j < 0 || from[j] !== -2) continue;
        from[j] = i;
        if (lab[j] >= 0 && lab[j] !== main && sizes[lab[j]] > 3) { hit = j; break; }
        q[qt++] = j;
      }
    }
    if (hit < 0) return map;
    // a pass two tiles wide
    for (let i = from[hit]; i >= 0 && lab[i] !== main; i = from[i]) {
      t[i] = 2;
      const x = i % w, y = (i - x) / w;
      if (x + 1 < w && t[i + 1] === 3) t[i + 1] = 2;
      if (y + 1 < h && t[i + w] === 3) t[i + w] = 2;
    }
  }
  return map;
}

// ------------------------------------------------------------------ prebuilt bases
// keys: the buildings (yard first), packed round (cx, cy) on bare rock with a lane between them, then the defences
// (turrets / walls) on the side towards opts.toward. opts.occ: a shared Uint8Array (1 footprint, 2 lane) so bases
// and units don't overlap; opts.concrete (true): lay concrete under the buildings.
function rtsMapPlaceBase(map, cx, cy, keys, opts = {}) {
  const { w, h, t } = map, occ = opts.occ || (map.occ = map.occ || new Uint8Array(w * h));
  const list = [], missing = [], maxR = opts.maxR || 16;
  const cand = [];
  for (let dy = -maxR; dy <= maxR; dy++) for (let dx = -maxR; dx <= maxR; dx++) {
    const d = dx * dx + dy * dy;
    if (d <= maxR * maxR) cand.push([d + rtsMapHash(dx, dy, map.seed | 0) * 0.5, cx + dx, cy + dy]);
  }
  cand.sort((a, b) => a[0] - b[0]);
  const fits = (x, y, bw, bh, lane) => {
    if (x < 1 || y < 1 || x + bw > w - 1 || y + bh > h - 1) return false;
    for (let j = 0; j < bh; j++) for (let i = 0; i < bw; i++) {
      const k = (y + j) * w + x + i;
      if (!rtsMapBuildable(t[k]) || occ[k]) return false;
    }
    if (lane) {   // keep the ring round it drivable so units can get out
      for (let i = -1; i <= bw; i++) for (const j of [-1, bh]) { const k = (y + j) * w + x + i; if (occ[k] === 1 || t[k] === 3) return false; }
      for (let j = 0; j < bh; j++) for (const i of [-1, bw]) { const k = (y + j) * w + x + i; if (occ[k] === 1 || t[k] === 3) return false; }
    }
    return true;
  };
  const mark = (x, y, bw, bh, lane, conc) => {
    for (let j = -1; j <= bh; j++) for (let i = -1; i <= bw; i++) {
      const xx = x + i, yy = y + j;
      if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
      const k = yy * w + xx, inFp = i >= 0 && j >= 0 && i < bw && j < bh;
      if (inFp) { occ[k] = 1; if (conc && t[k] === 2) t[k] = 7; } else if (lane && !occ[k]) occ[k] = 2;
    }
  };
  let ext = 0;
  const body = keys.filter(k => !RTS_C_MAP_DEFENCE[k]), defs = keys.filter(k => RTS_C_MAP_DEFENCE[k]);
  for (const key of body) {
    const [bw, bh] = rtsMapBSize(key);
    let done = false;
    for (const [, px, py] of cand) {
      const x = px - ((bw - 1) >> 1), y = py - ((bh - 1) >> 1);
      if (!fits(x, y, bw, bh, true)) continue;
      mark(x, y, bw, bh, true, opts.concrete !== false && key !== 'slab1' && key !== 'slab4');
      list.push({ key, x, y });
      ext = Math.max(ext, Math.hypot(x + bw / 2 - cx, y + bh / 2 - cy) + Math.max(bw, bh) / 2);
      done = true;
      break;
    }
    if (!done) missing.push(key);
  }
  // the defences: a fan on the side the attacks come from, a ring further out
  const tw = opts.toward || { x: (w - 1) / 2, y: (h - 1) / 2 };
  const a0 = Math.atan2(tw.y - cy, tw.x - cx);
  let k = 0;
  for (const key of defs) {
    let done = false;
    for (let tries = 0; tries < 40 && !done; tries++) {
      const slot = k + tries, side = slot % 2 ? 1 : -1, step = Math.ceil(slot / 2);
      const a = a0 + side * step * 0.42, d = ext + 1.5 + (tries > 12 ? (tries - 12) * 0.25 : 0);
      const x = Math.round(cx + Math.cos(a) * d), y = Math.round(cy + Math.sin(a) * d);
      if (x < 1 || y < 1 || x >= w - 1 || y >= h - 1) continue;
      const i = y * w + x;
      if (!rtsMapBuildable(t[i]) || occ[i] === 1) continue;
      occ[i] = 1;
      if (opts.concrete !== false && t[i] === 2 && key !== 'wall') t[i] = 7;
      list.push({ key, x, y });
      done = true;
      k = slot + 1;
    }
    if (!done) missing.push(key);
  }
  return { ok: !missing.length, list, missing };
}

// the nearest free tile to (x, y) a unit can stand on (inf: infantry, who may climb onto cliffs). used: a Set of
// tile indices already taken (shared between the calls of one set-up)
function rtsMapSpot(map, x, y, inf, used) {
  const { w, h, t } = map, occ = map.occ;
  x = Math.round(x); y = Math.round(y);
  for (let r = 0; r < 24; r++) {
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      const xx = x + dx, yy = y + dy;
      if (xx < 1 || yy < 1 || xx >= w - 1 || yy >= h - 1) continue;
      const i = yy * w + xx;
      if (occ && occ[i] === 1) continue;
      if (used && used.has(i)) continue;
      if (t[i] === 6) continue;   // never on a bloom
      if (!inf && !rtsMapDrive(t[i])) continue;
      if (used) used.add(i);
      return { x: xx, y: yy };
    }
  }
  return { x, y };
}

// ------------------------------------------------------------------ campaign missions
// symbolic units: what each House calls its light vehicle, its rocket vehicle, its special, its aircraft
const RTS_C_MAP_UNITSYM = {
  LIGHT: { aquila: 'trike', drakon: 'quad', serpens: 'raider', regent: 'trike', nomad: 'nomad' },
  ROCKET: { aquila: 'missile', drakon: 'missile', serpens: 'siege', regent: 'siege', nomad: 'nomad' },
  SPECIAL: { aquila: 'sonic', drakon: 'juggernaut', serpens: 'converter', regent: 'praetorian', nomad: 'nomad' },
  AIR: { aquila: 'gunwing', drakon: 'tank', serpens: 'gunwing', regent: 'gunwing', nomad: 'nomad' },
  INF: { aquila: 'soldier', drakon: 'soldier', serpens: 'soldier', regent: 'praetorian', nomad: 'nomad' },
  ROCKETINF: { aquila: 'trooper', drakon: 'trooper', serpens: 'trooper', regent: 'praetorian', nomad: 'nomad' },
};
const rtsMapUnit = (sym, house) => (RTS_C_MAP_UNITSYM[sym] ? RTS_C_MAP_UNITSYM[sym][house] || RTS_C_MAP_UNITSYM[sym].aquila : sym);
const RTS_C_MAP_MIN = 3600;   // frames in a minute

// one row per mission level (1-9). size: map tiles; starts: the bases' plateau radius (player first, then the foes);
// foeBase: the prebuilt base of each foe (palace bases for the Houses at 8, the Regent's own at 9); guards: the foes'
// units round their base; raids: foe reinforcements [minute, [units], byAir]; help: the player's.
const RTS_C_MAP_BASES = {
  none: [],
  outpost: ['yard', 'vapor', 'refinery', 'barracks', 'vapor'],
  small: ['yard', 'vapor', 'refinery', 'vapor', 'barracks', 'light', 'silo', 'turret', 'turret'],
  medium: ['yard', 'refinery', 'vapor', 'vapor', 'barracks', 'light', 'heavy', 'silo', 'radar', 'vapor', 'turret', 'turret', 'turret', 'wall', 'wall'],
  large: ['yard', 'refinery', 'heavy', 'vapor', 'vapor', 'vapor', 'barracks', 'hall', 'light', 'radar', 'repair', 'silo', 'hightech', 'refinery',
    'turret', 'turret', 'rturret', 'rturret', 'turret', 'wall', 'wall', 'wall'],
  fortress: ['yard', 'refinery', 'heavy', 'vapor', 'vapor', 'vapor', 'vapor', 'barracks', 'hall', 'light', 'radar', 'repair', 'silo', 'silo',
    'hightech', 'lab', 'starport', 'refinery', 'rturret', 'rturret', 'turret', 'rturret', 'turret', 'rturret', 'wall', 'wall', 'wall', 'wall'],
  palace: ['yard', 'palace', 'refinery', 'heavy', 'vapor', 'vapor', 'vapor', 'vapor', 'barracks', 'hall', 'light', 'radar', 'repair', 'silo',
    'hightech', 'lab', 'refinery', 'rturret', 'rturret', 'turret', 'rturret', 'turret', 'rturret', 'wall', 'wall', 'wall'],
  regent: ['palace', 'yard', 'refinery', 'heavy', 'heavy', 'vapor', 'vapor', 'vapor', 'vapor', 'vapor', 'barracks', 'hall', 'light', 'radar',
    'repair', 'silo', 'silo', 'hightech', 'lab', 'starport', 'refinery', 'rturret', 'rturret', 'rturret', 'rturret', 'turret', 'turret',
    'rturret', 'rturret', 'turret', 'turret', 'wall', 'wall', 'wall', 'wall', 'wall', 'wall'],
};
const RTS_C_MAP_MISSIONS = [
  { lv: 1, size: 48, starts: [8, 7], credits: 1000, worms: 0, foeBase: 'none',
    you: ['INF', 'INF', 'LIGHT'], guards: ['INF', 'INF', 'INF'], raids: [[3, ['INF', 'INF']], [7, ['LIGHT']]], help: [] },
  { lv: 2, size: 56, starts: [8, 8], credits: 1200, worms: 1, foeBase: 'none',
    you: ['INF', 'INF', 'INF', 'LIGHT', 'LIGHT'], guards: ['INF', 'INF', 'LIGHT', 'INF'], raids: [[3, ['LIGHT', 'INF', 'INF']], [6, ['LIGHT', 'LIGHT']], [10, ['LIGHT', 'INF', 'INF', 'INF']]],
    help: [[5, ['LIGHT', 'LIGHT'], true]] },
  { lv: 3, size: 64, starts: [8, 9], credits: 1500, worms: 1, foeBase: 'outpost',
    you: ['INF', 'INF', 'LIGHT', 'LIGHT', 'quad'], guards: ['INF', 'INF', 'INF', 'LIGHT', 'LIGHT'], raids: [[5, ['LIGHT', 'INF', 'INF'], false], [10, ['LIGHT', 'LIGHT', 'quad']]],
    help: [[6, ['quad', 'quad'], true]] },
  { lv: 4, size: 64, starts: [9, 10], credits: 1500, worms: 1, foeBase: 'small',
    you: ['INF', 'INF', 'ROCKETINF', 'LIGHT', 'quad', 'quad'], guards: ['INF', 'ROCKETINF', 'LIGHT', 'quad', 'quad', 'INF'], raids: [[4, ['quad', 'LIGHT', 'INF']], [9, ['quad', 'quad', 'ROCKETINF', 'ROCKETINF']], [15, ['quad', 'LIGHT', 'LIGHT', 'INF', 'INF']]],
    help: [[6, ['quad', 'LIGHT'], true]] },
  { lv: 5, size: 64, starts: [9, 11], credits: 1800, worms: 2, foeBase: 'medium',
    you: ['ROCKETINF', 'ROCKETINF', 'quad', 'quad', 'tank', 'tank'], guards: ['tank', 'tank', 'quad', 'LIGHT', 'ROCKETINF', 'ROCKETINF', 'INF'],
    raids: [[5, ['tank', 'quad', 'LIGHT']], [10, ['tank', 'tank', 'ROCKETINF', 'ROCKETINF']], [16, ['tank', 'tank', 'quad', 'quad']]], help: [[7, ['tank', 'tank'], true]] },
  { lv: 6, size: 72, starts: [9, 12], credits: 2000, worms: 2, foeBase: 'large',
    you: ['ROCKETINF', 'ROCKETINF', 'quad', 'tank', 'tank', 'ROCKET'], guards: ['tank', 'tank', 'tank', 'ROCKET', 'quad', 'quad', 'ROCKETINF', 'ROCKETINF', 'INF'],
    raids: [[5, ['tank', 'tank', 'quad']], [10, ['tank', 'ROCKET', 'ROCKETINF', 'ROCKETINF']], [15, ['tank', 'tank', 'siege', 'quad']], [21, ['siege', 'tank', 'tank', 'LIGHT', 'LIGHT']]],
    help: [[8, ['tank', 'ROCKET'], true]] },
  { lv: 7, size: 72, starts: [9, 13], credits: 2500, worms: 2, foeBase: 'fortress',
    you: ['ROCKETINF', 'ROCKETINF', 'ROCKETINF', 'tank', 'tank', 'ROCKET', 'siege'], guards: ['tank', 'tank', 'siege', 'siege', 'ROCKET', 'quad', 'quad', 'ROCKETINF', 'ROCKETINF', 'ROCKETINF'],
    raids: [[5, ['tank', 'tank', 'quad', 'quad']], [10, ['siege', 'tank', 'ROCKET', 'ROCKETINF', 'ROCKETINF']], [15, ['AIR', 'AIR'], true], [20, ['siege', 'siege', 'tank', 'tank', 'quad']]],
    help: [[8, ['siege', 'tank'], true], [16, ['ROCKET', 'tank'], true]] },
  { lv: 8, size: 80, starts: [9, 12, 12], credits: 3000, worms: 3, foeBase: 'palace',
    you: ['ROCKETINF', 'ROCKETINF', 'ROCKETINF', 'tank', 'tank', 'tank', 'ROCKET', 'siege'], guards: ['tank', 'tank', 'siege', 'ROCKET', 'quad', 'ROCKETINF', 'ROCKETINF', 'SPECIAL'],
    raids: [[6, ['tank', 'tank', 'quad', 'quad']], [11, ['siege', 'siege', 'tank', 'ROCKETINF', 'ROCKETINF']], [16, ['SPECIAL', 'tank', 'tank']], [22, ['AIR', 'AIR', 'AIR'], true]],
    help: [[9, ['siege', 'tank', 'tank'], true], [18, ['ROCKET', 'siege'], true]] },
  { lv: 9, size: 96, starts: [10, 14, 12, 12], credits: 3500, worms: 3, foeBase: 'palace',
    you: ['ROCKETINF', 'ROCKETINF', 'ROCKETINF', 'ROCKETINF', 'tank', 'tank', 'tank', 'ROCKET', 'ROCKET', 'siege', 'siege'],
    guards: ['tank', 'tank', 'siege', 'siege', 'ROCKET', 'quad', 'quad', 'ROCKETINF', 'ROCKETINF', 'SPECIAL'],
    regentGuards: ['praetorian', 'praetorian', 'praetorian', 'praetorian', 'praetorian', 'praetorian', 'siege', 'siege', 'tank', 'tank', 'tank', 'trike', 'trike', 'gunwing'],
    raids: [[5, ['tank', 'tank', 'quad', 'quad', 'ROCKETINF']], [10, ['siege', 'siege', 'tank', 'ROCKET']], [15, ['SPECIAL', 'SPECIAL', 'tank']], [20, ['AIR', 'AIR', 'AIR'], true], [26, ['siege', 'siege', 'siege', 'tank', 'tank']]],
    regentRaids: [[7, ['praetorian', 'praetorian', 'praetorian', 'praetorian'], true], [14, ['praetorian', 'praetorian', 'siege', 'siege', 'tank']], [21, ['gunwing', 'gunwing'], true], [28, ['praetorian', 'praetorian', 'praetorian', 'praetorian', 'praetorian', 'praetorian'], true]],
    help: [[8, ['siege', 'tank', 'tank'], true], [16, ['ROCKET', 'siege', 'tank'], true], [24, ['SPECIAL', 'SPECIAL'], true]] },
];

// the units of a list for a House, round (x, y)
function rtsMapUnits(map, syms, house, x, y, used) {
  return syms.map(s => {
    const key = rtsMapUnit(s, house), inf = ['soldier', 'trooper', 'nomad', 'saboteur', 'praetorian'].includes(key);
    const p = rtsMapSpot(map, x, y, inf, used);
    return { key, x: p.x, y: p.y };
  });
}

// a mission's map and set-up. spec: { level 1-9, house (the player's), foes: [houses] (the Regent first at 9),
// allies: [houses] (the NOMADS), seed, style }. -> { map, player: { house, credits, base, units }, foes: [...],
// allies: [...], reinforcements, worms, problems: [] }
function rtsMapMission(spec) {
  const M = RTS_C_MAP_MISSIONS[Math.max(1, Math.min(9, spec.level | 0)) - 1];
  const foes = (spec.foes && spec.foes.length ? spec.foes : ['drakon']).slice(0, M.starts.length - 1);
  while (foes.length < M.starts.length - 1) foes.push(foes[0]);
  const baseR = M.starts.slice(0, foes.length + 1);
  let best = null;
  for (let attempt = 0; attempt < 8; attempt++) {
    const seed = (spec.seed >>> 0) + attempt * 7919;
    const map = rtsMapGen({ w: M.size, h: M.size, players: foes.length + 1, seed, style: spec.style || 'open', baseR, rich: spec.rich || 1 });
    map.occ = new Uint8Array(map.w * map.h);
    const used = new Set(), s0 = map.starts[0], out = { map, level: M.lv, worms: M.worms, foes: [], allies: [], reinforcements: [], problems: [] };
    // the player: a construction yard at the start and the units round it
    const pb = rtsMapPlaceBase(map, s0.x, s0.y, ['yard'], { occ: map.occ, toward: map.starts[1] });
    out.player = { house: spec.house, credits: M.credits, base: pb.list, units: rtsMapUnits(map, M.you, spec.house, s0.x, s0.y + 2, used) };
    if (!pb.ok) out.problems.push('player base: ' + pb.missing.join(','));
    // the foes: a base on each of the other starts (or a camp of units on a harvest mission)
    foes.forEach((fh, i) => {
      const st = map.starts[i + 1], regent = fh === 'regent';
      let keys = RTS_C_MAP_BASES[regent ? 'regent' : M.foeBase].slice();
      if (fh === 'drakon') keys = keys.map(k => (k === 'barracks' && keys.includes('hall') ? 'barracks' : k));
      if (!regent && M.lv === 9) keys = RTS_C_MAP_BASES.large.slice();
      const fb = keys.length ? rtsMapPlaceBase(map, st.x, st.y, keys, { occ: map.occ, toward: s0 }) : { ok: true, list: [], missing: [] };
      if (!fb.ok) out.problems.push(fh + ' base: ' + fb.missing.join(','));
      const g = regent ? M.regentGuards : M.guards;
      // guards stand between their base and the player
      const gx = st.x + Math.sign(s0.x - st.x) * Math.min(6, (st.r || 9) - 2), gy = st.y + Math.sign(s0.y - st.y) * Math.min(6, (st.r || 9) - 2);
      out.foes.push({ house: fh, base: fb.list, units: rtsMapUnits(map, g, fh, keys.length ? gx : st.x, keys.length ? gy : st.y, used), noMcv: !keys.length, start: { x: st.x, y: st.y } });
      const raids = regent ? M.regentRaids : M.raids;
      for (const [min, list, air] of raids) out.reinforcements.push({ at: Math.round(min * RTS_C_MAP_MIN), house: fh, units: list.map(s => rtsMapUnit(s, fh)), edge: 'any', byAir: !!air });
    });
    for (const [min, list, air] of M.help) out.reinforcements.push({ at: Math.round(min * RTS_C_MAP_MIN), house: spec.house, units: list.map(s => rtsMapUnit(s, spec.house)), edge: 'any', byAir: !!air });
    // allies (the NOMADS): a band of warriors that walks in near the player's base
    for (const ah of spec.allies || []) {
      const ang = Math.atan2(map.h / 2 - s0.y, map.w / 2 - s0.x), d = (map.baseR[0] || 9) + 4;
      const ax = s0.x + Math.cos(ang + 0.9) * d, ay = s0.y + Math.sin(ang + 0.9) * d;
      const units = rtsMapUnits(map, M.lv >= 9 ? ['nomad', 'nomad', 'nomad', 'nomad', 'nomad', 'nomad'] : ['nomad', 'nomad', 'nomad', 'nomad'], ah, ax, ay, used);
      out.allies.push({ house: ah, base: [], units, noMcv: true, start: { x: units[0].x, y: units[0].y } });
      out.reinforcements.push({ at: Math.round((M.lv + 4) * RTS_C_MAP_MIN), house: ah, units: ['nomad', 'nomad', 'nomad'], edge: 'any', byAir: false });
    }
    out.reinforcements.sort((a, b) => a.at - b.at);
    out.problems.push(...rtsMapValidate(map, out));
    if (!out.problems.length) return out;
    if (!best || out.problems.length < best.problems.length) best = out;
  }
  return best;
}

// what's wrong with a map and its set-up (empty: nothing): every start reachable by vehicle from the first, every
// building on its own rock inside the map, every unit on ground it can stand on, glimmer near every start
function rtsMapValidate(map, setup) {
  const P = [], { w, h, t } = map;
  if (!map || !map.t || map.t.length !== w * h || !map.g || map.g.length !== w * h) return ['bad arrays'];
  const { lab } = rtsMapAreas(map), s0 = map.starts[0], L = lab[s0.y * w + s0.x];
  if (L < 0) P.push('start 0 on a cliff');
  map.starts.forEach((s, i) => { if (lab[s.y * w + s.x] !== L) P.push('start ' + i + ' unreachable'); });
  // glimmer within reach of every start
  map.starts.forEach((s, i) => {
    let sum = 0;
    for (let y = Math.max(0, s.y - 20); y < Math.min(h, s.y + 21); y++) for (let x = Math.max(0, s.x - 20); x < Math.min(w, s.x + 21); x++) if (lab[y * w + x] === L) sum += map.g[y * w + x];
    if (sum < 2500) P.push('start ' + i + ' little glimmer (' + sum + ')');
  });
  if (setup) {
    const taken = new Uint8Array(w * h);
    const sides = [['player', setup.player]].concat((setup.foes || []).map((f, i) => ['foe' + i, f]), (setup.allies || []).map((f, i) => ['ally' + i, f]));
    for (const [nm, s] of sides) {
      if (!s) continue;
      for (const b of s.base || []) {
        const [bw, bh] = rtsMapBSize(b.key);
        if (b.x < 0 || b.y < 0 || b.x + bw > w || b.y + bh > h) { P.push(nm + ' ' + b.key + ' off the map'); continue; }
        for (let j = 0; j < bh; j++) for (let i = 0; i < bw; i++) {
          const k = (b.y + j) * w + b.x + i;
          if (!rtsMapBuildable(t[k])) P.push(nm + ' ' + b.key + ' not on rock');
          if (taken[k]) P.push(nm + ' ' + b.key + ' overlaps');
          taken[k] = 1;
        }
      }
    }
    for (const [nm, s] of sides) {
      if (!s) continue;
      for (const u of s.units || []) {
        const k = u.y * w + u.x, inf = ['soldier', 'trooper', 'nomad', 'saboteur', 'praetorian'].includes(u.key);
        if (u.x < 0 || u.y < 0 || u.x >= w || u.y >= h) { P.push(nm + ' ' + u.key + ' off the map'); continue; }
        if (taken[k]) P.push(nm + ' ' + u.key + ' on a building');
        if (!inf && lab[k] !== L) P.push(nm + ' ' + u.key + ' stuck at ' + u.x + ',' + u.y);
      }
    }
  }
  return P;
}

// ------------------------------------------------------------------ the map as a picture
const RTS_C_MAP_COLS = ['#D8A058', '#C08848', '#7C6450', '#4C3C30', '#F87818', '#F84800', '#F8D040', '#A8A8A0', '#9C7038', '#5C4C40', '#605850'];
function rtsMapThumb(map, scale = 1) {
  const c = makeCanvas(map.w * scale, map.h * scale), g = c.getContext('2d');
  for (let y = 0; y < map.h; y++) for (let x = 0; x < map.w; x++) {
    const k = map.t[y * map.w + x];
    let col = RTS_C_MAP_COLS[k] || '#000000';
    if ((k === 0 || k === 1) && ((x + y) & 1) && k === 1) col = '#B47C40';
    g.fillStyle = col;
    g.fillRect(x * scale, y * scale, scale, scale);
  }
  return c;
}
