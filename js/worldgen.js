'use strict';
// =====================================================================
//  WORLD: the land itself (world.js plays it). An endless land in chunks of 13 x 13 tiles (the size of one
//  classic map), laid out from the run's seed, so the same seed always gives the same world:
//    BIOMES    grassland, forest, autumn woods, snowfields, desert, volcano, swamp, city ruins and wasteland: big
//              regions from smooth noise (heat, wet, and two rarer ones), their borders frayed; each with its own
//              ground, walls, trees and water (frozen in the snow, dried to mud in the desert, lava in the volcano)
//    TERRAIN   rivers and lakes running across chunks, woods, and pieces of the 35 classic maps standing about
//              as old walls
//    ROADS     a loose net between chunk centres (long roads every 4 chunks, every village on it), bridged over
//              water and lava; city chunks get streets all round
//    FEATURES  now and then a village (its eagle in a brick ring, houses round a square), ruins (a walled
//              compound, a chest in each room, sometimes a vault with a guardian and the big treasure) or an
//              enemy nest; HOME at the start
//  Every chunk is open: its four edge midpoints are clear and joined up inside it, and any sizeable pocket walled
//  in by steel, water or lava gets a way cut in (bridged), so the whole world hangs together: you and the enemy
//  can always get from one chunk to the next.
// =====================================================================

const WD_CH = 13, WD_CB = 26, WD_CC = 52, WD_PX = 208;   // a chunk: 16px tiles, 8px blocks, 4px cells, pixels
const WD_THEMES = ['spring', 'summer', 'autumn', 'winter', 'desert', 'volcanic', 'swamp', 'city', 'nuclear'];
const WD_BNAME = ['GRASSLAND', 'FOREST', 'AUTUMN WOODS', 'SNOWFIELDS', 'DESERT', 'VOLCANO', 'SWAMP', 'CITY RUINS', 'WASTELAND'];
const WDB = { GRASS: 0, FOREST: 1, AUTUMN: 2, SNOW: 3, DESERT: 4, VOLCANO: 5, SWAMP: 6, CITY: 7, WASTE: 8 };
// per biome: how high the noise must be for old walls (pieces of the classic maps), trees and lakes
const WD_STAMP = [0.6, 0.67, 0.63, 0.64, 0.6, 0.63, 0.69, 0.42, 0.56];
const WD_TREE = [0.66, 0.5, 0.53, 0.62, 0.74, 0.69, 0.56, 0.72, 0.66];
const WD_LAKE = [0.73, 0.75, 0.73, 0.7, 0.77, 0.63, 0.64, 0.8, 0.73];
// what a classic map's block may leave standing (the rest of it is left out)
const WD_STAMPED = { '#': T_BRICK, '@': T_STEEL, '~': T_WATER, '%': T_FOREST, '_': T_ICE };
// the ground's own kinds (per 8px block): wild, road, a village's cobbles, a ruin's flagstones, a nest's scorch
const WG = { WILD: 0, ROAD: 1, COBBLE: 2, FLAG: 3, SCORCH: 4 };
// cells drawn differently from the tile they are (world.js): a house roof, ruin stone
const WD_HOUSE = 1, WD_RUIN = 2;
// chests in ruins: what's in them
const WD_CHESTS = ['coins', 'star', 'weapon', 'rare'];

// ------------------------------------------------------------------ noise
// a number from 0 to 1 for a spot (the same every time for the seed)
function wdHash(s, x, y, k = 0) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul((s + k * 1013) | 0, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1103515245);
  h = Math.imul(h ^ (h >>> 16), 2246822519);
  return ((h ^ (h >>> 13)) >>> 0) / 4294967296;
}
// smooth value noise over the plane (one bump per unit)
function wdNoise(s, x, y) {
  const i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const a = wdHash(s, i, j), b = wdHash(s, i + 1, j), c = wdHash(s, i, j + 1), d = wdHash(s, i + 1, j + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
// a few octaves of it (bumps of every size)
function wdFbm(s, x, y, oct) {
  let t = 0, amp = 1, n = 0;
  for (let o = 0; o < oct; o++) { t += wdNoise(s + o * 7919, x, y) * amp; n += amp; amp *= 0.5; x *= 2.03; y *= 2.03; }
  return t / n;
}
// noise bunches up round the middle: spread it out again
const wdSpread = (v, k) => Math.max(0, Math.min(1, (v - 0.5) * k + 0.5));

// the biome at a world block (8px units); near the start it's always grassland
function wdBiomeAt(seed, gx, gy) {
  const x = gx + (wdNoise(seed + 5, gx / 6, gy / 6) - 0.5) * 10, y = gy + (wdNoise(seed + 6, gx / 6, gy / 6) - 0.5) * 10;   // frayed borders
  let temp = wdSpread(wdFbm(seed + 11, x / 210, y / 210, 3), 2.6), wet = wdSpread(wdFbm(seed + 23, x / 170, y / 170, 3), 2.6);
  let odd = wdSpread(wdFbm(seed + 37, x / 250, y / 250, 2), 2), urb = wdSpread(wdFbm(seed + 41, x / 140, y / 140, 2), 2);
  const d = Math.hypot(gx, gy) / 2;   // tiles from the start
  if (d < 40) { const f = Math.min(1, 1.6 - d / 25); temp += (0.5 - temp) * f; wet += (0.45 - wet) * f; odd *= 1 - f; urb *= 1 - f; }
  if (odd > 0.8) return temp > 0.5 ? WDB.VOLCANO : WDB.WASTE;
  if (urb > 0.84) return WDB.CITY;
  if (temp < 0.23) return WDB.SNOW;
  if (temp > 0.73) return wet < 0.5 ? WDB.DESERT : WDB.SWAMP;
  if (wet > 0.54) return temp > 0.5 ? WDB.FOREST : WDB.AUTUMN;
  return WDB.GRASS;
}

// the classic maps as 26x26 block rows (worked out once)
let wdLevelBlocks = null;
function wdLevels() { return wdLevelBlocks || (wdLevelBlocks = LEVELS.map(m => mapToBlocks(m))); }

// ------------------------------------------------------------------ features (decided without building the chunk)
const wdFeatCache = new Map();
// what stands in chunk (cx, cy): null, or { kind: 'home' | 'village' | 'ruin' | 'nest', ... }
function wdFeatureOf(seed, cx, cy) {
  const key = seed + ':' + cx + ',' + cy;
  let f = wdFeatCache.get(key);
  if (f !== undefined) return f;
  f = null;
  const d = Math.hypot(cx, cy);
  if (cx === 0 && cy === 0) f = { kind: 'home' };
  else {
    // one place of note in every 3 x 3 chunks, at a chunk the dice pick
    const sx = Math.floor(cx / 3), sy = Math.floor(cy / 3), pick = Math.floor(wdHash(seed, sx, sy, 31) * 9);
    if (cx - sx * 3 + (cy - sy * 3) * 3 === pick && d >= 2) {
      const r = wdHash(seed, sx, sy, 32), b = wdBiomeAt(seed, cx * WD_CB + 13, cy * WD_CB + 13);
      // no villages in the volcano or the wasteland: ruins there
      if (r < 0.56 && b !== WDB.VOLCANO && b !== WDB.WASTE) f = { kind: 'village', siege: wdHash(seed, cx, cy, 34) < Math.min(0.8, 0.45 + d * 0.02) };
      else if (r < 0.94) f = { kind: 'ruin', boss: d >= 4 && wdHash(seed, cx, cy, 35) < 0.4 ? Math.floor(wdHash(seed, cx, cy, 36) * 4) : -1 };
    }
    // nests: more of them further out, never next to home
    if (!f && d >= 3 && wdHash(seed, cx, cy, 33) < Math.min(0.12, 0.02 + d * 0.005)) f = { kind: 'nest' };
  }
  if (wdFeatCache.size > 40000) wdFeatCache.clear();
  wdFeatCache.set(key, f);
  return f;
}
const wdTown = f => f && (f.kind === 'village' || f.kind === 'home');

// is there a road from chunk (cx, cy) to its right (horiz) or down neighbour?
function wdRoadEdge(seed, cx, cy, horiz) {
  if (wdTown(wdFeatureOf(seed, cx, cy)) || wdTown(horiz ? wdFeatureOf(seed, cx + 1, cy) : wdFeatureOf(seed, cx, cy + 1))) return true;
  if (horiz ? cy % 4 === 0 : cx % 4 === 0) return wdHash(seed, cx, cy, horiz ? 41 : 42) < 0.85;   // the long roads
  return wdHash(seed, cx, cy, horiz ? 43 : 44) < 0.2;
}

// ------------------------------------------------------------------ building a chunk
// tiles that a tank can neither drive nor shoot through (a way has to go round or over them)
const wdHard = v => v === T_STEEL || v === T_WATER || v === T_LAVA || isBasalt(v) || isDefl(v) || v === T_DRUM || v === T_LAMP;

// the chunk at (cx, cy) as the seed makes it:
//   cells (52x52 4px cells: terrain types), deco (52x52: house roofs, ruin stone), bio and gnd (26x26 blocks: the
//   biome and the ground's kind), feat (its feature laid out, positions in pixels from the chunk's corner),
//   zones (wasteland hot spots)
function wdGenChunk(seed, cx, cy) {
  const B = WD_CB, gx0 = cx * B, gy0 = cy * B;
  const bio = new Uint8Array(B * B), gnd = new Uint8Array(B * B), blk = new Uint8Array(B * B), solid = new Uint8Array(B * B);
  // the biome a 16px tile at a time (the ground's drawing frays its borders finer); lakes and rivers from noise
  // sampled every other block and blended between (they're smooth at that size: a third of the work)
  for (let ty = 0; ty < WD_CH; ty++) for (let tx = 0; tx < WD_CH; tx++) {
    const b = wdBiomeAt(seed, gx0 + tx * 2, gy0 + ty * 2), i = ty * 2 * B + tx * 2;
    bio[i] = bio[i + 1] = bio[i + B] = bio[i + B + 1] = b;
  }
  const SN = B / 2 + 1, lakeN = new Float32Array(SN * SN), riverN = new Float32Array(SN * SN);
  for (let y = 0; y < SN; y++) for (let x = 0; x < SN; x++) {
    const gx = gx0 + x * 2, gy = gy0 + y * 2;
    lakeN[y * SN + x] = wdFbm(seed + 61, gx / 28, gy / 28, 3);
    riverN[y * SN + x] = wdFbm(seed + 51, gx / 110, gy / 110, 3);
  }
  const blend = (a, bx, by) => {
    const x = bx >> 1, y = by >> 1, fx = (bx & 1) * 0.5, fy = (by & 1) * 0.5, k = y * SN + x;
    return (a[k] * (1 - fx) + a[k + 1] * fx) * (1 - fy) + (a[k + SN] * (1 - fx) + a[k + SN + 1] * fx) * fy;
  };
  const lvs = wdLevels(), lv = lvs[Math.floor(wdHash(seed, cx, cy, 9) * lvs.length)], flip = wdHash(seed, cx, cy, 10) < 0.5;
  const tileH = (bx, by, k) => wdHash(seed, (gx0 + bx) >> 1, (gy0 + by) >> 1, k);   // one die per 16px tile
  for (let by = 0; by < B; by++) for (let bx = 0; bx < B; bx++) {
    const i = by * B + bx, gx = gx0 + bx, gy = gy0 + by, b = bio[i];
    let t = T_EMPTY;
    // old walls: a piece of a classic map shows through where the walls noise is high
    if (wdFbm(seed + 81, gx / 13, gy / 13, 2) > WD_STAMP[b]) t = WD_STAMPED[lv[by][flip ? B - 1 - bx : bx]] || T_EMPTY;
    if (t === T_EMPTY && wdFbm(seed + 71, gx / 7, gy / 7, 2) > WD_TREE[b]) t = T_FOREST;
    const lake = blend(lakeN, bx, by) > WD_LAKE[b];
    const river = Math.abs(blend(riverN, bx, by) - 0.5) < 0.011;
    if (lake || river) t = T_WATER;
    // the biome's own take on it
    switch (b) {
      case WDB.GRASS: if (t === T_EMPTY && wdNoise(seed + 91, gx / 5, gy / 5) > 0.86) t = T_MUD; break;
      case WDB.SNOW: if (t === T_WATER && (river || wdNoise(seed + 93, gx / 24, gy / 24) < 0.8)) t = T_ICE; break;
      case WDB.DESERT:
        if (t === T_WATER && (river || wdNoise(seed + 95, gx / 24, gy / 24) < 0.65)) t = T_MUD;   // dried up; the rest are oases
        else if (t === T_FOREST && tileH(bx, by, 12) > 0.4) t = T_EMPTY;   // cacti stand alone
        break;
      case WDB.VOLCANO:
        if (t === T_WATER && (river || wdNoise(seed + 97, gx / 24, gy / 24) < 0.8)) t = T_LAVA;
        else if (t === T_STEEL) t = T_BASALT;
        else if (t === T_ICE) t = T_EMPTY;
        else if (t === T_EMPTY && tileH(bx, by, 13) < 0.02) t = T_VENT;
        break;
      case WDB.SWAMP:
        if ((t === T_EMPTY && wdNoise(seed + 99, gx / 6, gy / 6) > 0.62) || t === T_MUD) t = tileH(bx, by, 14) < 0.05 ? T_GAS : T_BOG;
        else if (t === T_FOREST && tileH(bx, by, 15) < 0.35) t = T_REEDS;
        break;
      case WDB.CITY:
        if (t === T_BRICK && tileH(bx, by, 16) < 0.45) t = T_CONC;
        else if (t === T_FOREST && tileH(bx, by, 17) < 0.5) t = T_RUBBLE;
        else if (t === T_ICE) t = T_EMPTY;
        break;
      case WDB.WASTE:
        if (t === T_BRICK && tileH(bx, by, 18) < 0.2) t = T_RUBBLE;
        break;
    }
    blk[i] = t;
  }
  // reeds along the swamp's shores, a few crates and barrels anywhere, drums and lamps in the city
  for (let by = 0; by < B; by++) for (let bx = 0; bx < B; bx++) {
    const i = by * B + bx, b = bio[i];
    if (blk[i] !== T_EMPTY) continue;
    const near = v => (bx > 0 && blk[i - 1] === v) || (bx < B - 1 && blk[i + 1] === v) || (by > 0 && blk[i - B] === v) || (by < B - 1 && blk[i + B] === v);
    const h = wdHash(seed, gx0 + bx, gy0 + by, 19);
    if (b === WDB.SWAMP && near(T_WATER) && h < 0.45) blk[i] = T_REEDS;
    else if (b === WDB.CITY && h < 0.03 && (near(T_BRICK) || near(T_CONC))) blk[i] = T_LAMP;
    else if (h > (b === WDB.CITY ? 0.985 : 0.9985)) blk[i] = T_DRUM;
  }
  for (let ty = 1; ty < WD_CH - 1; ty++) for (let tx = 1; tx < WD_CH - 1; tx++) {
    if (wdHash(seed, cx * WD_CH + tx, cy * WD_CH + ty, 20) > 0.006) continue;
    const ks = [0, 1, B, B + 1].map(k => ty * 2 * B + tx * 2 + k);
    if (ks.every(k => blk[k] === T_EMPTY)) for (const k of ks) blk[k] = T_CRATE;
  }
  // roads: from the middle to each edge that has one, wiggling a little (straight through a village)
  const town = wdTown(wdFeatureOf(seed, cx, cy)), amp = town ? 0 : Math.round((wdHash(seed, cx, cy, 45) - 0.5) * 4);
  const lay = (bx, by) => {
    if (bx < 0 || by < 0 || bx >= B || by >= B) return;
    const i = by * B + bx, v = blk[i];
    blk[i] = v === T_WATER || v === T_LAVA ? T_BRIDGE : v === T_ICE ? T_ICE : T_EMPTY;
    gnd[i] = WG.ROAD;
  };
  const roadH = (x0, x1) => { for (let x = x0; x <= x1; x++) { const y = 12 + Math.round(amp * Math.sin(Math.PI * (x + 0.5 - 13) / 13)); lay(x, y); lay(x, y + 1); } };
  const roadV = (y0, y1) => { for (let y = y0; y <= y1; y++) { const x = 12 + Math.round(amp * Math.sin(Math.PI * (y + 0.5 - 13) / 13)); lay(x, y); lay(x + 1, y); } };
  const E = wdRoadEdge(seed, cx, cy, true), W = wdRoadEdge(seed, cx - 1, cy, true), S = wdRoadEdge(seed, cx, cy, false), N = wdRoadEdge(seed, cx, cy - 1, false);
  if (E) roadH(12, B - 1);
  if (W) roadH(0, 13);
  if (S) roadV(12, B - 1);
  if (N) roadV(0, 13);
  // the city: streets all round each chunk (two chunks side by side make a street two blocks wide)
  if (bio[13 * B + 13] === WDB.CITY) for (let k = 0; k < B; k++) for (const [x, y] of [[k, 0], [k, B - 1], [0, k], [B - 1, k]]) if (bio[y * B + x] === WDB.CITY) lay(x, y);
  const feat = wdLayFeature(seed, cx, cy, blk, gnd, solid, bio);
  wdOpenUp(blk, solid);
  // into 4px cells; ruin walls crumble here and there
  const cells = new Uint8Array(WD_CC * WD_CC), deco = new Uint8Array(WD_CC * WD_CC);
  for (let by = 0; by < B; by++) for (let bx = 0; bx < B; bx++) {
    const i = by * B + bx, v = blk[i];
    for (let k = 0; k < 4; k++) {
      const c = (by * 2 + (k >> 1)) * WD_CC + bx * 2 + (k & 1);
      cells[c] = v;
      if (solid[i] === 2 && v === T_BRICK) deco[c] = WD_HOUSE;
      else if (solid[i] === 3 && v === T_BRICK) { deco[c] = WD_RUIN; if (wdHash(seed, gx0 * 2 + bx * 2 + (k & 1), gy0 * 2 + by * 2 + (k >> 1), 22) < 0.22) cells[c] = T_EMPTY; }
    }
  }
  // hot spots in the wasteland, on open ground away from the road
  const zones = [];
  if (bio[13 * B + 13] === WDB.WASTE && !feat) {
    for (let k = 0, n = 1 + Math.floor(wdHash(seed, cx, cy, 23) * 2), tries = 0; k < n && tries < 20; tries++) {
      const bx = 3 + Math.floor(wdHash(seed, cx, cy, 24 + tries) * 20), by = 3 + Math.floor(wdHash(seed, cx, cy, 50 + tries) * 20);
      if (blk[by * B + bx] !== T_EMPTY || gnd[by * B + bx] || zones.some(z => Math.hypot(z[0] - bx * 8, z[1] - by * 8) < 56)) continue;
      zones.push([bx * 8 + 4, by * 8 + 4, 18 + Math.floor(wdHash(seed, cx, cy, 80 + k) * 3) * 3]);
      k++;
    }
  }
  return { cx, cy, cells, deco, bio, gnd, feat, zones };
}

// the chunk's feature, laid out over its terrain; solid marks blocks taken by things that aren't tiles
// (1: an eagle or a nest, which tanks can't drive through) and the houses (2) and ruin walls (3)
function wdLayFeature(seed, cx, cy, blk, gnd, solid, bio) {
  const f0 = wdFeatureOf(seed, cx, cy);
  if (!f0) return null;
  const B = WD_CB, at = (bx, by) => by * B + bx;
  const fill = (x0, y0, x1, y1, v, g) => {
    for (let by = y0; by <= y1; by++) for (let bx = x0; bx <= x1; bx++) {
      const i = at(bx, by);
      if (v !== undefined) blk[i] = v;
      if (g !== undefined && gnd[i] !== WG.ROAD) gnd[i] = g;
    }
  };
  const h = k => wdHash(seed, cx, cy, k);
  if (f0.kind === 'home' || f0.kind === 'village') {
    // the square: cobbles, nothing in the way; the eagle in its brick ring in the middle; houses round it
    fill(5, 5, 20, 20, T_EMPTY, WG.COBBLE);
    for (let by = 11; by <= 14; by++) for (let bx = 11; bx <= 14; bx++) blk[at(bx, by)] = bx >= 12 && bx <= 13 && by >= 12 && by <= 13 ? T_EMPTY : T_BRICK;
    for (let by = 12; by <= 13; by++) for (let bx = 12; bx <= 13; bx++) solid[at(bx, by)] = 1;
    const spots = [[3, 3], [9, 3], [3, 9], [9, 9], [1, 1], [11, 1], [1, 11], [11, 11], [4, 1], [8, 11], [1, 8], [11, 4]];
    const houses = spots.slice(0, 4).concat(spots.slice(4).filter((s, k) => h(60 + k) < 0.45));
    for (const [tx, ty] of houses) for (let by = ty * 2; by <= ty * 2 + 1; by++) for (let bx = tx * 2; bx <= tx * 2 + 1; bx++) { blk[at(bx, by)] = T_BRICK; solid[at(bx, by)] = 2; gnd[at(bx, by)] = WG.COBBLE; }
    // hedges round the square
    for (let k = 4; k <= 21; k++) for (const [bx, by] of [[k, 4], [k, 21], [4, k], [21, k]]) {
      const i = at(bx, by);
      if (gnd[i] !== WG.ROAD && !solid[i] && blk[i] === T_EMPTY && wdHash(seed, cx * B + bx, cy * B + by, 61) < 0.5) blk[i] = bio[i] === WDB.DESERT ? T_EMPTY : T_FOREST;
    }
    return { kind: f0.kind, ex: 96, ey: 96, siege: !!f0.siege, houses };
  }
  if (f0.kind === 'nest') {
    // an enemy factory in a scorched clearing, a few barricades round it
    fill(7, 6, 18, 19, T_EMPTY, WG.SCORCH);
    for (let by = 9; by <= 12; by++) for (let bx = 11; bx <= 14; bx++) solid[at(bx, by)] = 1;
    for (let k = 7; k <= 18; k++) for (const [bx, by] of [[7, k], [18, k]]) if (k < 11 || k > 14) blk[at(bx, by)] = T_BRICK;
    return { kind: 'nest', x: 88, y: 72 };
  }
  // ruins: a walled compound (gates in the middle of each side), a room in each corner with a chest, the middle
  // open, or a steel vault with a guardian in it and the big treasure
  fill(4, 4, 21, 21, T_EMPTY, WG.FLAG);
  const wall = (bx, by) => { const i = at(bx, by); blk[i] = T_BRICK; solid[i] = 3; };
  for (let k = 4; k <= 21; k++) if (k < 12 || k > 13) { wall(k, 4); wall(k, 21); wall(4, k); wall(21, k); }
  for (const [rx, ry] of [[10, 10], [15, 10], [10, 15], [15, 15]]) {
    // each room's two inner walls (the outer ones are the compound's), a doorway in each
    const sx = rx === 10 ? 5 : 15, sy = ry === 10 ? 5 : 15;
    for (let k = 0; k < 6; k++) if (k !== 2 && k !== 3) { wall(rx, sy + k); wall(sx + k, ry); }
  }
  for (const [bx, by] of [[4, 4], [21, 4], [4, 21], [21, 21]]) { blk[at(bx, by)] = T_STEEL; solid[at(bx, by)] = 0; }   // corner posts
  const chests = [[48, 48], [136, 48], [48, 136], [136, 136]].map(([x, y], k) => ({ x, y, kind: WD_CHESTS[Math.floor(h(70 + k) * WD_CHESTS.length)] }));
  const boss = f0.boss;
  if (boss >= 0) {
    // the vault: steel round a 4x4-block room, brick doors
    for (let k = 10; k <= 15; k++) for (const [bx, by] of [[k, 10], [k, 15], [10, k], [15, k]]) { blk[at(bx, by)] = k === 12 || k === 13 ? T_BRICK : T_STEEL; solid[at(bx, by)] = 0; }
    fill(11, 11, 14, 14, T_EMPTY);
    chests.push({ x: 96, y: 96, kind: 'big' });
  } else chests.push({ x: 96, y: 96, kind: 'coins' });
  return { kind: 'ruin', boss, chests, guards: [[96, 40], [96, 152], [40, 96], [152, 96]] };
}

// keep every chunk open (see the top): the four edge midpoints clear and joined, big pockets cut into.
// Works on the 8px node grid the enemy's path finding uses (a node is a tank's place: 2x2 blocks).
function wdOpenUp(blk, solid) {
  const B = WD_CB, N = B - 1;
  const clear = i => { if (solid[i] === 1) return; const v = blk[i]; if (wdHard(v)) blk[i] = v === T_WATER || v === T_LAVA ? T_BRIDGE : T_EMPTY; };
  const blocksOf = n => { const x = n % N, y = (n / N) | 0, i = y * B + x; return [i, i + 1, i + B, i + B + 1]; };
  const hard = i => solid[i] === 1 || wdHard(blk[i]);
  const open = n => blocksOf(n).every(i => !hard(i));
  const seeds = [12 * N, 12 * N + N - 1, 12, (N - 1) * N + 12];
  for (const n of seeds) for (const i of blocksOf(n)) clear(i);
  const reached = new Uint8Array(N * N);
  const flood = starts => {
    const q = starts.filter(n => !reached[n] && open(n));
    for (const n of q) reached[n] = 1;
    for (let k = 0; k < q.length; k++) {
      const n = q[k], x = n % N, y = (n / N) | 0;
      for (const [dx, dy] of DXY) {
        const ux = x + dx, uy = y + dy, u = uy * N + ux;
        if (ux < 0 || uy < 0 || ux >= N || uy >= N || reached[u] || !open(u)) continue;
        reached[u] = 1; q.push(u);
      }
    }
  };
  flood([seeds[0]]);
  // what's still cut off: the other midpoints, and one node of every pocket of 4 or more
  const todo = seeds.slice(1);
  const seen = new Uint8Array(N * N);
  for (let n = 0; n < N * N; n++) {
    if (reached[n] || seen[n] || !open(n)) continue;
    const q = [n]; seen[n] = 1;
    for (let k = 0; k < q.length; k++) {
      const x = q[k] % N, y = (q[k] / N) | 0;
      for (const [dx, dy] of DXY) {
        const ux = x + dx, uy = y + dy, u = uy * N + ux;
        if (ux < 0 || uy < 0 || ux >= N || uy >= N || seen[u] || reached[u] || !open(u)) continue;
        seen[u] = 1; q.push(u);
      }
    }
    if (q.length >= 4) todo.push(n);
  }
  for (const t of todo) {
    if (reached[t]) continue;
    // the cheapest way from it to what's open (through as few hard blocks as it can), cleared
    const dist = new Float64Array(N * N).fill(Infinity), prev = new Int32Array(N * N).fill(-1), h = new NavHeap();
    dist[t] = 0; h.push(0, t);
    let hit = -1;
    while (h.size) {
      const [d, v] = h.pop();
      if (d > dist[v]) continue;
      if (reached[v]) { hit = v; break; }
      const x = v % N, y = (v / N) | 0;
      for (const [dx, dy] of DXY) {
        const ux = x + dx, uy = y + dy, u = uy * N + ux;
        if (ux < 0 || uy < 0 || ux >= N || uy >= N) continue;
        const bs = blocksOf(u);
        if (bs.some(i => solid[i] === 1)) continue;
        const nd = d + 1 + 30 * bs.filter(i => wdHard(blk[i])).length;
        if (nd < dist[u]) { dist[u] = nd; prev[u] = v; h.push(nd, u); }
      }
    }
    if (hit < 0) continue;
    const path = [];
    for (let v = hit; v >= 0; v = prev[v]) { path.push(v); for (const i of blocksOf(v)) clear(i); }
    flood(path);
  }
}

// a chunk's changes as a short string (each changed cell: 3 base-36 digits for where, a character for what) and back
function wdDiff(base, cur) {
  let s = '';
  for (let i = 0; i < base.length; i++) if (base[i] !== cur[i]) s += i.toString(36).padStart(3, '0') + String.fromCharCode(48 + cur[i]);
  return s;
}
function wdUndiff(base, s) {
  const c = base.slice();
  for (let k = 0; k + 3 < s.length; k += 4) { const i = parseInt(s.substr(k, 3), 36); if (i >= 0 && i < c.length) c[i] = s.charCodeAt(k + 3) - 48; }
  return c;
}

// the last chunks built, kept for a while (each one takes a millisecond or two)
const wdGenCache = new Map();
function wdGen(seed, cx, cy) {
  const key = seed + ':' + cx + ',' + cy;
  let g = wdGenCache.get(key);
  if (g) { wdGenCache.delete(key); wdGenCache.set(key, g); return g; }
  g = wdGenChunk(seed, cx, cy);
  wdGenCache.set(key, g);
  while (wdGenCache.size > 160) wdGenCache.delete(wdGenCache.keys().next().value);
  return g;
}
