'use strict';
// =====================================================================
//  CORRIDOR, the climb as a race (corridor.js keeps the endless world: three sections, the bottom one dropping away)
//    HAZARD      lava, flood water or a wall of fire (by biome) creeps up from below, faster the higher you are;
//                fall behind into it and you lose a tank (you come back above it). Easier skills: slower
//    COMBO       climbing briskly fills a meter: x2, then x3 points; stop too long and it drains
//    BANDS       a new biome every 100 m: city, forest, snow and ice, volcano (lava along the sides), sky fortress
//                (steel walkways over a drop: off the edge is a tank). Each has its ground and tiles, its twist,
//                its own enemy, its music and its hazard; the ground blends where two meet
//    SET PIECES  every third section: a narrow bridge under fire, a convoy crossing, a minefield, a gate held by
//                3 turrets, a conveyor-belt climb, a dark tunnel lit only by your lamp. Now and then the way
//                splits: FAST (more enemies, a power-up) or SAFE
//    DEPOTS      every 250 m: patch every tank (plates; a tank for anyone with none left) and are the checkpoint
//    BOSS GATES  every 500 m a gatehouse boss (the classic bosses, tougher the higher) holds the way
//    MEDALS      bronze, silver and gold at 300, 600 and 1000 m; a ghost marks where your best run ended
//  A section is planned from the run's seed and its number (k: 13 m each), so a checkpoint rebuilds the same climb.
// =====================================================================

const CR_BAND_M = 100, CR_DEPOT_M = 250, CR_GATE_M = 500;
const CR_MEDALS = [
  { at: 300, name: 'BRONZE', c: ['#F8C090', '#C87830', '#6C3410'] },
  { at: 600, name: 'SILVER', c: ['#FFFFFF', '#BCBCC8', '#5C5C6C'] },
  { at: 1000, name: 'GOLD', c: ['#FCF4A8', '#F0BC3C', '#8C6000'] },
];
// song: an existing tune that fits (music.js / rock.js); hazard: what rises from below
const CR_BANDS = [
  { key: 'city', name: 'CITY', theme: 'city', fx: 'city', song: 'corridor', hazard: 'flood', color: '#BCBCBC' },
  { key: 'forest', name: 'FOREST', theme: 'summer', fx: 'summer', song: 'bigmaps', hazard: 'fire', color: '#58D854' },
  { key: 'snow', name: 'SNOW AND ICE', theme: 'winter', fx: 'winter', song: 'sides', hazard: 'flood', color: '#B8D8F8' },
  { key: 'volcano', name: 'VOLCANO', theme: 'volcanic', fx: 'volcanic', song: 'survival', hazard: 'lava', color: '#F85800' },
  { key: 'sky', name: 'SKY FORTRESS', theme: 'sky', fx: 'autumn', song: 'galaxy', hazard: 'fire', color: '#78D8F8' },
];
const CR_PIECES = ['bridge', 'convoy', 'mines', 'turrets', 'belts', 'tunnel'];
const CR_PIECE_NAMES = { bridge: 'BRIDGE UNDER FIRE', convoy: 'CONVOY CROSSING', mines: 'MINEFIELD', turrets: 'TURRET GATE',
  belts: 'CONVEYOR CLIMB', tunnel: 'DARK TUNNEL', branch: 'THE WAY SPLITS', depot: 'SUPPLY DEPOT', gate: 'BOSS GATE' };
const CR_HAZ = {
  lava: { name: 'LAVA', die: 'MELTED!', sound: 'lava', color: '#F87800' },
  flood: { name: 'FLOOD', die: 'SWEPT AWAY!', sound: 'splash', color: '#58A8F8' },
  fire: { name: 'FIRE', die: 'BURNED!', sound: 'explode', color: '#F83800' },
};
// how fast the hazard climbs (px a frame) on each skill, and before it starts
const CR_HAZ_SKILL = [0.5, 0.7, 1, 1.15, 1.3], CR_HAZ_GRACE = 300, CR_GATE_TURRET_HP = 4;
const CR_COMBO_TILE = 4, CR_COMBO_X2 = 35, CR_COMBO_X3 = 70;

const crBandIdx = alt => Math.floor(Math.max(0, alt) / CR_BAND_M) % CR_BANDS.length;
const crBand = alt => CR_BANDS[crBandIdx(alt)];
const crRng = (seed, k, salt = 0) => seeded((Math.imul(seed | 0, 2654435761) ^ Math.imul(k + 7, 40503) ^ Math.imul(salt + 3, 974593)) >>> 0);
const crMedalOf = alt => CR_MEDALS.filter(m => alt >= m.at).length;   // 0 none, 1 bronze, 2 silver, 3 gold

// the gate number (1, 2, ...) of section k if it holds a boss gate, else 0
function crGateNo(k) {
  const g0 = Math.floor(13 * k / CR_GATE_M);
  for (let g = Math.max(1, g0); g <= g0 + 1; g++) if (Math.floor(g * CR_GATE_M / 13) === k) return g;
  return 0;
}
// the altitude a depot in section k stands for (250, 500, 750 ...), else 0; past a boss gate it's the section above it
function crDepotAlt(k) {
  if (k > 0 && crGateNo(k - 1)) return crGateNo(k - 1) * CR_GATE_M;
  const m0 = Math.floor(13 * k / CR_DEPOT_M);
  for (let m = Math.max(1, m0); m <= m0 + 1; m++) if (m % 2 && Math.floor(m * CR_DEPOT_M / 13) === k) return m * CR_DEPOT_M;
  return 0;
}
// what section k is: the set pieces come every third section (each of the six once in every eighteen, in the run's
// own order), a split now and then, never right before a gate
function crPlanOf(seed, k) {
  const g = crGateNo(k);
  if (g) return { kind: 'gate', g, idx: BOSS_ORDER[(g - 1) % BOSS_ORDER.length] };
  const d = crDepotAlt(k);
  if (d) return { kind: 'depot', alt: d };
  if (k < 2 || crGateNo(k + 1)) return { kind: 'map' };
  if (k % 3 === 2) {
    const order = CR_PIECES.slice(), r = crRng(seed, 0, 1);
    for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
    return { kind: order[Math.floor(k / 3) % order.length] };
  }
  if (k % 5 === 4) return { kind: 'branch', fast: crRng(seed, k, 2)() < 0.5 ? 0 : 1 };
  return { kind: 'map' };
}

// ------------------------------------------------------------------ the sky fortress's look
Object.assign(THEMES, {
  sky: {
    name: 'SKY FORTRESS', color: '#78D8F8', ground: '#3C4654', specks: ['#46505E', '#343C48', '#505A68'],
    tex: { brick: { colors: { R: '#5C6C8C', H: '#94A8C8', D: '#283048', M: '#6C7484' } }, forest: { colors: { g: '#68B848', G: '#1C5420' } } },
    particles: { kind: 'sand', n: 12, colors: ['#E8F0F8', '#A8C0D8'], w: 5, h: 1 },   // wind streaks
    paint: (x, r) => {   // deck plates: seams every 16px, a rivet at each corner
      for (let y = 0; y < FH; y += 16) { x.fillStyle = '#2C333E'; x.fillRect(0, y, FW, 1); x.fillStyle = '#4C5664'; x.fillRect(0, y + 1, FW, 1); }
      for (let px = 0; px < FW; px += 16) { x.fillStyle = '#2C333E'; x.fillRect(px, 0, 1, FH); }
      x.fillStyle = '#6C7888';
      for (let y = 3; y < FH; y += 16) for (let px = 3; px < FW; px += 16) { x.fillRect(px, y, 1, 1); x.fillRect(px + 10, y, 1, 1); x.fillRect(px, y + 10, 1, 1); x.fillRect(px + 10, y + 10, 1, 1); }
      for (let k = 0; k < FW * FH / 500; k++) { x.fillStyle = r() < 0.5 ? '#343C48' : '#4E5866'; x.fillRect(Math.floor(r() * FW), Math.floor(r() * FH), 2 + Math.floor(r() * 3), 1); }
    },
  },
});
SEASON_ENEMY.sky = 20;   // the guster: its fan blows you about up there

// the drop below the walkways: far-off sky with clouds and the land a long way down (a 32px tile)
let crDropTex = null;
function crDropTile() {
  if (crDropTex) return crDropTex;
  const c = makeCanvas(32, 32), x = c.getContext('2d'), r = seeded(4711);
  x.fillStyle = '#2C64C8'; x.fillRect(0, 0, 32, 32);
  for (let k = 0; k < 40; k++) { x.fillStyle = r() < 0.5 ? '#3070D0' : '#2858B8'; x.fillRect(Math.floor(r() * 32), Math.floor(r() * 32), 2 + Math.floor(r() * 4), 1); }
  // the ground far below, through the haze
  for (let k = 0; k < 5; k++) { x.fillStyle = ['#3C7C58', '#4C8C48', '#5C7C58'][k % 3]; x.fillRect(Math.floor(r() * 30), Math.floor(r() * 30), 2 + Math.floor(r() * 3), 1 + Math.floor(r() * 2)); }
  // little clouds
  for (let k = 0; k < 4; k++) {
    const cx = Math.floor(r() * 28), cy = Math.floor(r() * 30);
    x.fillStyle = '#C8DCF8'; x.fillRect(cx, cy, 5, 1); x.fillRect(cx + 1, cy - 1, 3, 1);
    x.fillStyle = '#E8F0FC'; x.fillRect(cx + 1, cy - 1, 2, 1);
  }
  crDropTex = c;
  return c;
}

// ------------------------------------------------------------------ building a section (26 rows of block chars)
// tile rows 0 (top) to 12; tiles are 2x2 blocks
function crMake(seed, k) {
  const TW = COLS * 2, plan = crPlanOf(seed, k), r = crRng(seed, k);
  const B = { k, plan, r, TW, feats: [], mines: [], turrets: [], keep: new Set(), noSky: false, fixed: false, alt: ty => 13 * k + 12 - ty };
  const base = map => corridorSection(map).map(row => row.split(''));
  B.G = base(LEVELS[Math.floor(r() * LEVELS.length)]);
  B.blk = (bx, by, ch) => { if (bx >= 0 && by >= 0 && bx < TW && by < 26) B.G[by][bx] = ch; };
  B.tile = (tx, ty, ch) => { for (let q = 0; q < 4; q++) B.blk(tx * 2 + (q & 1), ty * 2 + (q >> 1), ch); };
  B.tileHas = (tx, ty, chs) => { for (let q = 0; q < 4; q++) if (chs.includes((B.G[ty * 2 + (q >> 1)] || [])[tx * 2 + (q & 1)])) return true; return false; };
  B.open = (tx, ty) => tx >= 0 && ty >= 0 && tx < COLS && ty < 13 && !B.tileHas(tx, ty, '#@~%_mlkfcuidxr=^><v');
  B.row = (ty, ch, x0 = 0, x1 = COLS - 1) => { for (let tx = x0; tx <= x1; tx++) B.tile(tx, ty, ch); };
  B.clear = (x0, y0, x1, y1) => { for (let ty = y0; ty <= y1; ty++) B.row(ty, '.', Math.max(0, x0), Math.min(COLS - 1, x1)); };
  const mid = Math.floor(COLS / 2) - 1;   // the left of the two middle tiles
  switch (plan.kind) {
    case 'depot': {
      B.clear(mid - 2, 4, mid + 3, 7);
      for (let ty = 8; ty <= 12; ty++) for (const tx of [mid, mid + 1]) if (B.tileHas(tx, ty, '@~')) B.tile(tx, ty, '.');
      B.feats.push({ k: 'depot', x: mid * 16, y: 5 * 16, alt: plan.alt, sec: k, used: false });
      for (let ty = 3; ty <= 8; ty++) B.keep.add(ty);
      B.noSky = true;
      break;
    }
    case 'gate': {
      // the boss's own arena, a gatehouse wall across the top with its gate in the middle
      B.G = base(BOSS_ARENAS[plan.idx]);
      B.row(0, '@'); B.row(12, '.');
      const def = BOSSES[plan.idx];
      if (def.kind !== 'train') {
        const bx = Math.round((FW - def.w) / 16) * 8;
        B.clear(Math.floor(bx / 16), 1, Math.floor((bx + def.w - 1) / 16), Math.min(4, Math.ceil((16 + def.h) / 16)));
      }
      B.feats.push({ k: 'bossgate', x: mid * 16, y: 0, g: plan.g, idx: plan.idx, open: false, sec: k });
      B.fixed = true;
      break;
    }
    case 'bridge': {
      // a river right across, one narrow bridge (two tiles over lava or the drop), guns on the far bank
      const hot = [4, 5, 6, 7, 8].some(ty => ['volcano', 'sky'].includes(crBand(B.alt(ty)).key)), w = hot ? 2 : 1;
      const bx = 1 + Math.floor(r() * (COLS - 2 - w));
      B.clear(0, 2, COLS - 1, 3); B.clear(0, 9, COLS - 1, 9);
      for (let ty = 4; ty <= 8; ty++) { B.row(ty, hot ? 'l' : '~'); for (let q = 0; q < w; q++) B.tile(bx + q, ty, '='); }
      // cover along the far bank (never right by the bridge), a gun at the bridge's end and one off to a side
      for (let tx = 0; tx < COLS; tx++) if (Math.abs(tx - bx) > 1 && r() < 0.3) B.tile(tx, 3, '#');
      const tur = [[bx + (w > 1 ? Math.floor(r() * 2) : 0), 1], [bx + (r() < 0.5 ? -3 : 3 + w - 1), 2]];
      for (const [tx, ty] of tur) {
        const x = Math.max(0, Math.min(COLS - 1, tx));
        B.clear(x - 1, ty, x + 1, ty); B.blk(x * 2 - 1, ty * 2 + 1, '#'); B.blk(x * 2 + 2, ty * 2 + 1, '#');   // sandbags
        B.turrets.push({ x: x * 16, y: ty * 16 });
      }
      B.feats.push({ k: 'bridge', x: bx * 16, w: w * 16, y0: 4 * 16, y1: 9 * 16 });
      for (let ty = 1; ty <= 9; ty++) B.keep.add(ty);
      break;
    }
    case 'convoy': {
      // a road right across, low walls on both sides with a few gaps; tanks drive along it left to right
      B.clear(0, 4, COLS - 1, 7);
      for (const ty of [4, 7]) {
        B.row(ty, '#');
        for (let n = 0; n < Math.max(2, Math.round(COLS / 5)); n++) { const gx = Math.floor(r() * (COLS - 1)); B.tile(gx, ty, '.'); B.tile(gx + 1, ty, '.'); }
      }
      B.feats.push({ k: 'road', y: 5 * 16, h: 32, cd: 20 });
      for (let ty = 3; ty <= 8; ty++) B.keep.add(ty);
      break;
    }
    case 'mines': {
      // open ground sown with mines; one winding way through is clear (shoot a mine from afar to set it off)
      B.clear(0, 2, COLS - 1, 10);
      for (let n = 0; n < COLS; n++) if (r() < 0.45) B.blk(Math.floor(r() * TW), 4 + Math.floor(r() * 15), '#');
      const safe = new Set();
      let px = Math.floor(r() * COLS);
      for (let ty = 10; ty >= 2; ty--) {
        safe.add(px + ',' + ty);
        if (r() < 0.5) { const nx = Math.max(0, Math.min(COLS - 1, px + (r() < 0.5 ? -1 : 1) * (1 + Math.floor(r() * 2)))); for (let x = Math.min(px, nx); x <= Math.max(px, nx); x++) safe.add(x + ',' + ty); px = nx; }
      }
      for (let ty = 3; ty <= 9; ty++) for (let tx = 0; tx < COLS; tx++) {
        if (safe.has(tx + ',' + ty) || r() > 0.5 || B.tileHas(tx, ty, '#')) continue;
        B.mines.push({ x: tx * 16 + 6 + Math.floor(r() * 5), y: ty * 16 + 6 + Math.floor(r() * 5) });
      }
      B.feats.push({ k: 'mines', y0: 2 * 16, y1: 11 * 16 });
      break;
    }
    case 'turrets': {
      // a steel wall right across; its gate opens once the three turrets in front of it are wrecked
      B.clear(0, 2, COLS - 1, 6);
      B.row(3, '@');
      const xs = [1, mid + Math.floor(r() * 2), COLS - 2];
      for (const tx of xs) { B.turrets.push({ x: tx * 16, y: 5 * 16 }); B.blk(tx * 2 - 1, 11, '#'); B.blk(tx * 2 + 2, 11, '#'); }
      B.feats.push({ k: 'tgate', x: mid * 16, y: 3 * 16, id: k, open: false });
      for (let ty = 2; ty <= 6; ty++) B.keep.add(ty);
      break;
    }
    case 'belts': {
      // lanes of conveyor belts: most run down against you, a few run up; belts across shift you between them
      const ups = new Set(), n = Math.max(2, Math.round(COLS / 5));
      while (ups.size < n) ups.add(Math.floor(r() * COLS));
      for (let ty = 1; ty <= 11; ty++) for (let tx = 0; tx < COLS; tx++) B.tile(tx, ty, ups.has(tx) ? '^' : 'v');
      for (const ty of [4, 8]) B.row(ty, r() < 0.5 ? '>' : '<');
      for (let n2 = 0; n2 < COLS; n2++) { const tx = Math.floor(r() * COLS), ty = 2 + Math.floor(r() * 9); if (!ups.has(tx) && ty !== 4 && ty !== 8) B.tile(tx, ty, '#'); }
      B.row(0, '.'); B.row(12, '.');
      B.feats.push({ k: 'belts', y0: 16, y1: 12 * 16 });
      B.fixed = true;
      break;
    }
    case 'tunnel': {
      // solid rock with a winding two-tile way through, dark inside
      for (let ty = 1; ty <= 11; ty++) B.row(ty, '@');
      B.row(0, '.'); B.row(12, '.');
      let x = Math.max(0, Math.min(COLS - 2, mid + Math.floor(r() * 3) - 1));
      for (let ty = 11; ty >= 1; ty--) {
        B.tile(x, ty, '.'); B.tile(x + 1, ty, '.');
        if (ty > 1 && ty < 11 && r() < 0.4) {
          const nx = Math.max(0, Math.min(COLS - 2, x + (r() < 0.5 ? -1 : 1) * (2 + Math.floor(r() * 3))));
          for (let q = Math.min(x, nx); q <= Math.max(x, nx) + 1; q++) { B.tile(q, ty, '.'); B.tile(q, ty - 1, '.'); }
          x = nx;
        }
      }
      for (let n2 = 0; n2 < 3; n2++) { const ty = 2 + Math.floor(r() * 9), tx = Math.floor(r() * COLS); if (B.open(tx, ty)) B.blk(tx * 2 + Math.floor(r() * 2), ty * 2 + Math.floor(r() * 2), '#'); }
      B.feats.push({ k: 'tunnel', y0: 16, y1: 12 * 16 });
      B.fixed = true;
      break;
    }
    case 'branch': {
      // a steel wall down the middle: one side open and fast (more enemies, crates), the other a slow safe zigzag
      const c = Math.floor(COLS / 2), fastL = plan.fast === 0;
      const side = left => (left ? [0, c - 1] : [c + 1, COLS - 1]);
      for (let ty = 1; ty <= 11; ty++) B.tile(c, ty, '@');
      const [fx0, fx1] = side(fastL), [sx0, sx1] = side(!fastL);
      B.clear(fx0, 1, fx1, 11);
      for (let n2 = 0; n2 < 2; n2++) { const tx = fx0 + Math.floor(r() * (fx1 - fx0 + 1)), ty = 2 + Math.floor(r() * 8); B.tile(tx, ty, 'x'); }
      B.clear(sx0, 1, sx1, 11);
      [3, 6, 9].forEach((ty, i) => {
        const gapNear = i % 2 === 0;   // the gap by the wall, then out at the edge, then by the wall
        const gx = (gapNear === fastL) ? sx1 - 1 : sx0;   // left/right of the safe side
        for (let tx = sx0; tx <= sx1; tx++) if (tx < gx || tx > gx + 1) B.tile(tx, ty, '#');
        if (r() < 0.6) B.tile(sx0 + Math.floor(r() * (sx1 - sx0 + 1)), ty + 1, '%');
      });
      B.feats.push({ k: 'branch', y0: 16, y1: 12 * 16, fast: plan.fast, cd: 90, drop: false });
      B.noSky = true;
      break;
    }
    default: break;
  }
  crBands(B);
  // nothing waits on the drop or the lava
  B.mines = B.mines.filter(m => B.G[m.y >> 3] && B.G[m.y >> 3][m.x >> 3] !== 'l');
  return B;
}

// what each band does to a section's rows (set pieces keep some of theirs)
function crBands(B) {
  const { G, r, TW } = B, rows = [];
  for (let ty = 0; ty < 13; ty++) rows.push(crBand(B.alt(ty)).key);
  const keep = ty => B.fixed || B.keep.has(ty);
  // lakes: whole bodies of water freeze (snow) or turn to lava (volcano)
  const seen = new Uint8Array(TW * 26);
  for (let by = 0; by < 26; by++) for (let bx = 0; bx < TW; bx++) {
    if (seen[by * TW + bx] || G[by][bx] !== '~' || keep(by >> 1)) continue;
    const lake = [[bx, by]]; seen[by * TW + bx] = 1;
    for (let q = 0; q < lake.length; q++) for (const [dx, dy] of DXY) {
      const nx = lake[q][0] + dx, ny = lake[q][1] + dy;
      if (nx < 0 || ny < 0 || nx >= TW || ny >= 26 || seen[ny * TW + nx] || G[ny][nx] !== '~' || keep(ny >> 1)) continue;
      seen[ny * TW + nx] = 1; lake.push([nx, ny]);
    }
    const band = rows[by >> 1];
    const to = band === 'snow' && r() < 0.75 ? '_' : band === 'volcano' && r() < 0.7 ? 'l' : null;
    if (to) for (const [x, y] of lake) G[y][x] = to;
  }
  const opens = band => {
    const out = [];
    for (let ty = 1; ty < 12; ty++) if (rows[ty] === band && !keep(ty)) for (let tx = 0; tx < COLS; tx++) if (B.open(tx, ty)) out.push([tx, ty]);
    return out;
  };
  const pick = list => (list.length ? list.splice(Math.floor(r() * list.length), 1)[0] : null);
  for (let ty = 0; ty < 13; ty++) {
    if (keep(ty)) continue;
    const band = rows[ty], a = B.alt(ty) % CR_BAND_M;
    for (let tx = 0; tx < COLS; tx++) {
      if (band === 'city') {
        if (B.tileHas(tx, ty, '#') && r() < 0.35) for (let q = 0; q < 4; q++) { const bx = tx * 2 + (q & 1), by = ty * 2 + (q >> 1); if (G[by][bx] === '#') G[by][bx] = 'c'; }
        if (B.tileHas(tx, ty, '%') && r() < 0.5) for (let q = 0; q < 4; q++) { const bx = tx * 2 + (q & 1), by = ty * 2 + (q >> 1); if (G[by][bx] === '%') G[by][bx] = 'u'; }
      } else if (band === 'forest') {
        if (B.open(tx, ty) && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => B.tileHas(tx + dx, ty + dy, '%')) && r() < 0.3) B.tile(tx, ty, '%');
      } else if (band === 'volcano') {
        for (let q = 0; q < 4; q++) { const bx = tx * 2 + (q & 1), by = ty * 2 + (q >> 1); if (G[by][bx] === '@') G[by][bx] = 'k'; }
      }
    }
    // the volcano's sides run with lava (fading in and out at the band's edges)
    if (band === 'volcano' && a >= 2 && a <= 97) {
      const both = a >= 4 && a <= 95, bulge = (B.alt(ty) * 7 + B.k) % 5 === 0;
      B.tile(0, ty, 'l');
      if (both) B.tile(COLS - 1, ty, 'l');
      if (bulge && a >= 6 && a <= 93) B.tile(B.alt(ty) % 2 ? 1 : COLS - 2, ty, 'l');
    }
  }
  // a few touches per band: lamps and fuel drums in the city, groves in the forest, ice patches, vents
  if (rows.includes('city')) {
    const o = opens('city');
    for (let n = 0; n < 2; n++) { const t = pick(o); if (t) B.blk(t[0] * 2 + Math.floor(r() * 2), t[1] * 2 + Math.floor(r() * 2), 'i'); }
    const t = pick(o);
    if (t) for (let q = 0, m = 1 + Math.floor(r() * 3); q < m; q++) B.blk(t[0] * 2 + (q & 1), t[1] * 2 + (q >> 1), 'd');
  }
  if (rows.includes('forest')) { const o = opens('forest'); for (let n = 0; n < 2; n++) { const t = pick(o); if (t) { B.tile(t[0], t[1], '%'); if (B.open(t[0] + 1, t[1])) B.tile(t[0] + 1, t[1], '%'); } } }
  if (rows.includes('snow')) { const o = opens('snow'); for (let n = 0; n < 2; n++) { const t = pick(o); if (t) { B.tile(t[0], t[1], '_'); if (B.open(t[0] + 1, t[1])) B.tile(t[0] + 1, t[1], '_'); } } }
  if (rows.includes('volcano')) { const o = opens('volcano').filter(([tx]) => tx > 1 && tx < COLS - 2); for (let n = 0; n < 2; n++) { const t = pick(o); if (t) B.tile(t[0], t[1], 'f'); } }
  if (rows.includes('sky') && !B.noSky && !B.fixed) crSkyRows(B, rows);
  // no water, ice or mud on the decks up there
  for (let ty = 0; ty < 13; ty++) if (rows[ty] === 'sky') for (let by = ty * 2; by < ty * 2 + 2; by++) for (let bx = 0; bx < TW; bx++) if ('~_m'.includes(G[by][bx])) G[by][bx] = '.';
}

// the sky fortress: walkways (two-tile spines up the section, landings right across, a deck or two) and the drop
function crSkyRows(B, rows) {
  const { r } = B, sky = [], on = [];
  for (let ty = 0; ty < 13; ty++) if (rows[ty] === 'sky' && !B.keep.has(ty)) sky.push(ty);
  if (!sky.length) return;
  for (let ty = 0; ty < 13; ty++) on.push(new Array(COLS).fill(false));
  const n = Math.max(2, Math.round(COLS / 6)), spines = [];
  for (let i = 0; i < n; i++) spines.push(Math.max(0, Math.min(COLS - 2, Math.round((i + 0.5) * COLS / n) - 1 + Math.floor(r() * 3) - 1)));
  for (const ty of sky) {
    const a = B.alt(ty) % CR_BAND_M;
    if (ty === 0 || ty === 12 || a <= 1 || a >= 98) on[ty].fill(true);   // landings: where sections and bands meet
    for (const x of spines) on[ty][x] = on[ty][x + 1] = true;
  }
  const lo = Math.min(...spines), hi = Math.max(...spines) + 1;
  for (let m = 0; m < 2; m++) { const ty = 3 + Math.floor(r() * 7); for (let tx = lo; tx <= hi; tx++) on[ty][tx] = true; }
  for (let m = 0; m < 2; m++) {
    const x = spines[Math.floor(r() * spines.length)] + (r() < 0.5 ? -3 : 2), ty = 2 + Math.floor(r() * 8);
    for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 3; dx++) if (on[ty + dy] && x + dx >= 0 && x + dx < COLS) on[ty + dy][x + dx] = true;
  }
  for (const ty of sky) for (let tx = 0; tx < COLS; tx++) {
    if (!on[ty][tx]) { B.tile(tx, ty, 'l'); continue; }
    const spine = spines.some(x => tx === x || tx === x + 1);
    for (let q = 0; q < 4; q++) {
      const bx = tx * 2 + (q & 1), by = ty * 2 + (q >> 1), ch = B.G[by][bx];
      if ('~%_mrbg'.includes(ch) || (spine && (ch === '@' || ch === 'k'))) B.G[by][bx] = '.';
    }
  }
}

// ------------------------------------------------------------------ the stage
Object.assign(Stage.prototype, {
  crNew() {
    return { seed: 1 + rnd(1e9), feats: [], hz: { y: FH + 96, t: 0, kind: 'flood', warn: 0 }, combo: { v: 0, lv: 1, stop: 0 },
      band: 0, banner: null, medals: 0, record: false, fight: null, ckSec: 0, ckAlt: 0, last: 0, noted: {}, ghost: crGhost() };
  },

  // tile row altitudes: where the world's rows are on the climb
  crBase() { const c = this.corridor; return (c.shifts * this.sectionPx() + c.startY) / 16; },
  crAltY(y) { return this.crBase() - y / 16; },
  crYAlt(alt) { return (this.crBase() - alt) * 16; },
  crSections() { return Math.round(ROWS / CORRIDOR_SECTION); },

  // one section into slot j (0 = top) of the world: its terrain, mines, turrets and features
  crPlace(B, j) {
    const S = this.sectionPx(), top = j * S, cy0 = top >> 2;
    for (let by = 0; by < 26; by++) for (let bx = 0; bx < B.TW; bx++) {
      const v = BLOCK_TYPE[B.G[by][bx]] || T_EMPTY;
      for (let q = 0; q < 4; q++) this.terrain[(cy0 + by * 2 + (q >> 1)) * GW + bx * 2 + (q & 1)] = v;
    }
    for (const m of B.mines) this.mines.push({ x: m.x, y: m.y + top, byPlayer: false, owner: null, t: MINE_ARM_TIME });
    for (const tu of B.turrets) {
      if (this.turrets.some(o => overlap(o.x, o.y, 16, 16, tu.x, tu.y + top, 16, 16))) continue;
      this.turrets.push({ x: tu.x, y: tu.y + top, dir: 2, want: 2, hp: CR_GATE_TURRET_HP, owner: null, enemy: true, cd: 60, turn: 0, crg: B.k });
    }
    for (const f of B.feats) {
      const o = Object.assign({}, f);
      for (const key of ['y', 'y0', 'y1']) if (o[key] !== undefined) o[key] += top;
      o.kind = B.plan.kind; o.sec = B.k;
      this.cr2.feats.push(o);
    }
  },

  // the whole world for where the climb stands (a new run, a checkpoint, a jump)
  crBuildWorld() {
    const n = this.crSections(), c = this.corridor;
    this.cr2.feats = [];
    this.turrets = this.turrets.filter(t => !t.enemy);
    this.mines = [];
    for (let j = 0; j < n; j++) this.crPlace(crMake(this.cr2.seed, c.shifts + n - 1 - j), j);
    this.crTerrainChanged();
  },

  crTerrainChanged() {
    this.origTerrain = this.terrain.slice();
    this.dirty = true;
    this.terrainVer = (this.terrainVer || 0) + 1;
    this.navCost = {}; this.navBaseF = {}; this.navPlayerF = new Map();
    this.netDiff = []; this.netFull = true;
    this.pads = [];
  },

  // a fresh start on section k: the world rebuilt round it, the team at its bottom (checkpoints, tests)
  crRebuild(k) {
    const c = this.corridor;
    c.shifts = k; c.climbed = 13 * k; c.startY = FH - 16;
    c.lifeAt = Math.floor(k / 5) * 5 + 5; c.kinds = corridorMix(13 * k).map(m => m[0]);
    this.tanks = this.tanks.filter(t => t.isPlayer && !t.ally);
    this.bullets = []; this.spawns = this.spawns.filter(s => s.player); this.fx = []; this.popups = [];
    this.powerup = null; this.booms = []; this.fires = new Map(); this.puddles = []; this.wrecks = []; this.zones = [];
    this.bosses = []; this.beams = []; this.bossIdx = undefined; this.bossDefeated = false; this.queue = [];
    this.cr2.fight = null; this.cr2.last = c.climbed; this.cr2.combo = { v: 0, lv: 1, stop: 0 }; this.cr2.banner = null; this.cr2.bannerQ = [];
    this.crBuildWorld();
    this.clearArea(0, FH - 48, FW, 48);
    this.origTerrain = this.terrain.slice();
    this.players.forEach((p, i) => {
      const t = p.tank, [x, y] = PLAYER_SPAWN[i];
      if (t) { t.x = x; t.y = y; t.acc = 0; }
      for (const s of this.spawns) if (s.player === p) { s.x = x; s.y = y; }
    });
    this.camY = FH - VIEW_H; this.camX = 0;
    this.cr2.hz = { y: FH + 96, t: 0, kind: crBand(13 * k).hazard, warn: 0 };
    this.crSetBand(crBandIdx(13 * k), true);
  },

  // ------------------------------------------------------------ every frame (host)
  crTick() {
    const c2 = this.cr2, alt = this.corridorClimb();
    const ps = this.tanks.filter(t => t.isPlayer && !t.ally && t.alive);
    // climbing: points for each new metre, the combo, medals, passing the ghost, a new band
    if (alt > c2.last) {
      const d = alt - c2.last;
      c2.last = alt;
      c2.combo.v = Math.min(100, c2.combo.v + CR_COMBO_TILE * d);
      c2.combo.stop = 0;
      for (const p of this.players) if (!p.out) this.addScore(p, 10 * d);
    } else if (++c2.combo.stop > 90) c2.combo.v = Math.max(0, c2.combo.v - (c2.combo.stop > 240 ? 0.35 : 0.15));
    const lv = c2.combo.v >= CR_COMBO_X3 ? 3 : c2.combo.v >= CR_COMBO_X2 ? 2 : 1;
    if (lv !== c2.combo.lv) {
      const lead = ps.reduce((a, t) => (!a || t.y < a.y ? t : a), null);
      if (lv > c2.combo.lv) { Sound.play('crCombo'); if (lead) this.popups.push({ x: lead.x + 8, y: lead.y - 6, text: 'CLIMB X' + lv + '!', label: true, color: lv === 3 ? '#F83800' : '#F8B800', t: 0, delay: 0, life: 70 }); }
      else if (lv === 1) Sound.play('crComboLost');
      c2.combo.lv = lv;
    }
    const medal = crMedalOf(alt);
    if (medal > c2.medals) {
      c2.medals = medal;
      const m = CR_MEDALS[medal - 1];
      this.crBanner({ text: m.name + ' MEDAL!', sub: m.at + ' M', color: m.c[1], t: 180, medal });
      Sound.play('crMedal');
      if (Net.role !== 'client') { const rec = STORE.get(MODE_KEY, {}); if ((rec.crMedal || 0) < medal) { rec.crMedal = medal; STORE.set(MODE_KEY, rec); } }
    }
    if (c2.ghost && !c2.record && alt > c2.ghost.alt && c2.ghost.alt > 0) {
      c2.record = true;
      const lead = ps.reduce((a, t) => (!a || t.y < a.y ? t : a), null);
      if (lead) this.popups.push({ x: lead.x + 8, y: lead.y - 10, text: 'NEW RECORD!', label: true, color: COL.gold, t: 0, delay: 0, life: 100 });
      Sound.play('crRecord');
    }
    const b = crBandIdx(alt);
    if (b !== c2.band) this.crSetBand(b);
    if (c2.banner && --c2.banner.t <= 0) c2.banner = (c2.bannerQ || []).shift() || null;
    this.crHazard(ps);
    this.crFeatures(ps);
    this.crGateFight(ps);
  },

  // news in the middle of the screen; one at a time (a new band and a medal can come at the same metre)
  crBanner(b) {
    const c2 = this.cr2;
    if (c2.banner && c2.banner.t > 0) (c2.bannerQ || (c2.bannerQ = [])).push(b); else c2.banner = b;
  },

  // the front-runner reached a new band: its look and weather, twist, enemy and music
  crSetBand(b, quiet) {
    const c2 = this.cr2, band = CR_BANDS[b];
    c2.band = b;
    this.theme = band.theme;
    this.seasonFx = Config.on('seasonFx') ? band.fx : null;
    this.seaT = 600 + rnd(600);
    this.blizzard = 0; this.blackout = 0; this.wind = null; this.shower = 0;
    if (quiet) return;
    const fx = Config.on('seasonFx') && SEASON_FX_NAME[band.fx];
    this.crBanner({ text: band.name, sub: Math.floor(this.corridorClimb() / CR_BAND_M) * CR_BAND_M + ' M' + (fx ? '  ' + fx : ''), color: band.color, t: 180 });
    Sound.play('crBand');
  },

  // what plays: the band's tune (the dark tunnel has the maze's)
  crSong() {
    const c2 = this.cr2;
    if (c2.inTunnel) return 'maze';
    return CR_BANDS[c2.band || 0].song;
  },

  // ------------------------------------------------------------ the hazard
  crHazard(ps) {
    const c2 = this.cr2, hz = c2.hz, S = this.sectionPx();
    hz.t++;
    if (hz.warn > 0) hz.warn--;
    const alt = this.corridorClimb();
    hz.kind = crBand(Math.max(0, this.crAltY(hz.y))).hazard;
    const held = c2.fight || this.crGateHold();
    if (hz.t > CR_HAZ_GRACE && !held && this.freezeP <= 0) {
      let v = Math.min(0.26, 0.09 + 0.00014 * alt) * CR_HAZ_SKILL[seasonSkill()];
      // never more than a screen and a bit behind the last of you
      if (ps.length) {
        const low = Math.max(...ps.map(t => t.y + 16)), gap = hz.y - low - VIEW_H * 1.25;
        if (gap > 0) v += Math.min(1.2, gap * 0.01);
      }
      hz.y -= v;
    }
    // a closed boss gate holds it a little below the arena
    if (held) hz.y = Math.max(hz.y, S + 64);
    // tanks that fall behind into it
    for (const t of this.tanks) {
      if (!t.alive || t.y + (t.isPlayer ? 10 : 8) <= hz.y) continue;
      if (t.isPlayer) this.crHazardDeath(t);
      else this.killEnemy(t, null, false, true);
    }
    if (this.powerup && this.powerup.y + 8 > hz.y) this.powerup = null;
    this.mines = this.mines.filter(m => m.y < hz.y);
    // a rumble when it's close to someone
    if (ps.some(t => hz.y - (t.y + 16) < 40) && hz.t % 50 === 0) { Sound.play('crRise'); hz.warn = 50; }
  },

  crHazardDeath(t) {
    const H = CR_HAZ[this.cr2.hz.kind] || CR_HAZ.lava;
    this.addFx(t.x + 8, t.y + 8, BIG_EXPLOSION(), 5);
    this.popups.push({ x: t.x + 8, y: t.y - 4, text: H.die, label: true, color: H.color, t: 0, delay: 0, life: 70 });
    Sound.play(H.sound);
    if (t.ally) { this.hitAlly(t); return; }
    t.shield = 0; t.plates = 0;
    if (t.ship) { t.ship = false; if (t.player) t.player.ship = false; }
    this.hitPlayer(t);
  },

  // ------------------------------------------------------------ depots, gates, convoys, minefields, splits
  crFeatures(ps) {
    const c2 = this.cr2;
    c2.inTunnel = false;
    const lead = ps.reduce((a, t) => (!a || t.y < a.y ? t : a), null);
    for (const f of c2.feats) {
      const y0 = f.y0 !== undefined ? f.y0 : f.y;
      // the set piece's name as it comes into view
      if (!c2.noted[f.sec] && CR_PIECE_NAMES[f.kind] && f.kind !== 'map' && this.camY !== undefined && y0 > this.camY - 16 && y0 < this.camY + VIEW_H - 32) {
        c2.noted[f.sec] = true;
        this.popups.push({ x: FW / 2, y: Math.round(this.camY) + 112, text: CR_PIECE_NAMES[f.kind], label: true, color: COL.gold, t: 0, delay: 0, life: 110 });
      }
      if (f.k === 'depot' && !f.used && ps.some(t => overlap(t.x, t.y, 16, 16, f.x + 4, f.y + 4, 24, 24))) this.crDepot(f);
      else if (f.k === 'tgate' && !f.open && !this.turrets.some(tu => tu.crg === f.id)) this.crOpenGate(f, 'GATE OPEN!');
      else if (f.k === 'road') this.crConvoy(f);
      else if (f.k === 'mines') this.crMineShots(f);
      else if (f.k === 'branch') this.crBranch(f, ps);
      else if (f.k === 'tunnel' && lead && lead.y + 8 >= f.y0 && lead.y + 8 < f.y1) c2.inTunnel = true;
    }
  },

  crDepot(f) {
    const c2 = this.cr2;
    f.used = true;
    c2.ckSec = f.sec; c2.ckAlt = f.alt;
    for (const p of this.players) {
      if (p.out) { this.revive(p, null); continue; }   // a tank for anyone who had none left
      if (p.lives <= 0 && !Config.infiniteLives()) p.lives = 1;
      const t = p.tank;
      if (t) {
        t.plates = Math.max(t.plates, 1, rankPerks(p.rank || 1).plates, Config.skill().plates || 0);
        t.shield = Math.max(t.shield, 90);
        t.frozen = 0;
      }
    }
    // the hazard falls back: a breather
    c2.hz.y = Math.max(c2.hz.y, f.y + 32 + VIEW_H);
    this.popups.push({ x: f.x + 16, y: f.y - 2, text: 'PATCHED UP!', label: true, color: '#58D854', t: 0, delay: 0, life: 100 });
    this.popups.push({ x: f.x + 16, y: f.y + 40, text: 'CHECKPOINT ' + f.alt + ' M', label: true, color: COL.white, t: 0, delay: 20, life: 120 });
    Sound.play('crDepot');
  },

  // a gate's door (two tiles in the wall) opens
  crOpenGate(f, text) {
    f.open = true;
    for (let cy = f.y >> 2; cy < (f.y + 16) >> 2; cy++) for (let cx = f.x >> 2; cx < (f.x + 32) >> 2; cx++) if (this.get(cx, cy) !== T_EMPTY) this.set(cx, cy, T_EMPTY);
    this.origTerrain = this.terrain.slice();
    this.popups.push({ x: f.x + 16, y: f.y + 12, text, label: true, color: COL.gold, t: 0, delay: 0, life: 100 });
    Sound.play('crGate');
  },

  // tanks drive along the road, left to right, while it's near the screen
  crConvoy(f) {
    if (this.freezeE > 0 || this.camY === undefined || f.y < this.camY - 96 || f.y > this.camY + VIEW_H + 48) return;
    if (--f.cd > 0) return;
    const y = f.y + 8, mine = this.tanks.filter(t => t.crConvoy && t.alive).length + this.spawns.filter(s => s.enemy && s.enemy.extra && s.enemy.extra.crConvoy).length;
    if (mine >= 5 || this.tanks.some(t => t.alive && overlap(t.x, t.y, 16, 16, 0, y, 24, 16)) || this.spawns.some(s => overlap(s.x, s.y, 16, 16, 0, y, 24, 16))) { f.cd = 15; return; }
    const type = rnd(3) ? 0 : 3;
    this.spawns.push({ x: 0, y, t: 1, enemy: { type, bonus: false, ai: 0, extra: { crConvoy: true, dir: 1, speed: 0.6 } } });
    f.cd = Math.round((90 + rnd(90)) / Config.skill().spawn);
  },

  // a convoy tank: drives on; turns to fire at a tank lined up with it, then drives on
  crConvoyAct(t) {
    if (t.shield > 0) t.shield--;
    if (t.cool > 0) t.cool--;
    if (this.freezeE > 0 || t.stun > 0) return;
    if (t.aimT > 0) {
      if (--t.aimT === 10 && t.cool === 0) { this.fire(t); t.cool = Math.round(80 / Config.skill().fire); }
      if (t.aimT === 0) this.turn(t, 1);
      return;
    }
    if (t.dir !== 1) this.turn(t, 1);
    t.moving = this.move(t, 1);
    if (t.x >= FW - 16) { t.alive = false; return; }   // off along the road
    if (t.cool === 0) for (const o of this.tanks) {
      if (!o.isPlayer || !o.alive || Math.abs(o.x - t.x) > 5 || Math.abs(o.y - t.y) > 112 || o.boost.smoke) continue;
      this.turn(t, o.y < t.y ? 0 : 2);
      t.aimT = 26;
      break;
    }
  },

  // a shell meeting a mine on the field sets it off (from far enough away, it's how you clear a way)
  crMineShots(f) {
    if (!this.mines.length) return;
    for (const b of this.bullets) {
      if (!b.alive || !b.isPlayer || b.y < f.y0 - 8 || b.y > f.y1 + 8) continue;
      const m = this.mines.find(q => !q.byPlayer && !q.done && overlap(b.x, b.y, 4, 4, q.x - 5, q.y - 5, 10, 10));
      if (!m) continue;
      m.done = true;
      this.killBullet(b, false);
      if (b.owner && b.owner.player) this.addScore(b.owner.player, 50);
      this.blast(m.x, m.y, MINE_RADIUS, false, null, false);
    }
    this.mines = this.mines.filter(m => !m.done);
  },

  // the fast side of a split: more enemies come at you there, and there's a power-up to be had
  crBranch(f, ps) {
    const c = Math.floor(COLS / 2) * 16, fastX = f.fast === 0 ? [0, c - 16] : [c + 16, FW - 16];
    const inside = ps.filter(t => t.y + 8 >= f.y0 - 16 && t.y + 8 < f.y1 + 16);
    if (!inside.length || this.over) return;
    const onFast = inside.filter(t => t.x + 8 >= fastX[0] && t.x + 8 < fastX[1] + 16);
    if (onFast.length && !f.drop && !this.powerup) {
      f.drop = true;
      this.spawnPowerup();
      const spot = this.crFreeSpot(fastX[0], fastX[1], Math.max(f.y0, onFast[0].y - 80), onFast[0].y - 32);
      if (this.powerup && spot) { this.powerup.x = spot[0]; this.powerup.y = spot[1]; }
    }
    if (this.freezeE > 0 || --f.cd > 0) return;
    f.cd = Math.round(150 / Config.scale('spawnRate') / Config.skill().spawn);
    const onField = this.tanks.filter(t => !t.isPlayer).length + this.spawns.filter(s => s.enemy).length;
    if (onField >= this.maxEnemies + 2) return;
    const top = Math.min(...inside.map(t => t.y));
    const spot = this.crFreeSpot(fastX[0], fastX[1], Math.max(f.y0, top - 112), Math.max(f.y0, top - 48));
    if (!spot) return;
    const q = this.seasonSwap(corridorEnemy(this.corridorClimb()), 0.14);
    q.ai = noBasePersonality();
    this.spawns.push({ x: spot[0], y: spot[1], t: SPARKLE_TIME, enemy: q });
    this.total++;
  },

  // a free 16px spot (open ground, nobody there) in x0..x1, y0..y1
  crFreeSpot(x0, x1, y0, y1) {
    for (let k = 0; k < 24; k++) {
      const x = Math.round((x0 + Math.random() * Math.max(0, x1 - x0)) / 8) * 8, y = Math.round((y0 + Math.random() * Math.max(0, y1 - y0)) / 8) * 8;
      if (y < 0 || x < 0 || x > FW - 16 || y > FH - 16 || !this.crSpotOk(x, y)) continue;
      return [x, y];
    }
    return null;
  },

  crSpotOk(x, y) {
    for (let cy = y >> 2; cy < (y + 16) >> 2; cy++) for (let cx = x >> 2; cx < (x + 16) >> 2; cx++) {
      const v = this.get(cx, cy);
      if (v < 0 || v === T_BRICK || v === T_STEEL || v === T_WATER || (v >= T_LAVA && v !== T_RUBBLE && v !== T_REEDS)) return false;
    }
    if (this.tanks.some(t => t.alive && overlap(t.x, t.y, 16, 16, x, y, 16, 16)) || this.spawns.some(s => overlap(s.x, s.y, 16, 16, x, y, 16, 16))) return false;
    if (this.mines.some(m => overlap(m.x - 4, m.y - 4, 8, 8, x, y, 16, 16)) || (this.turrets.length && this.turretAt(x, y, 16, 16))) return false;
    return true;
  },

  // ------------------------------------------------------------ boss gates
  // a closed boss gate in the top section holds the world: nothing more is added above it until it opens
  crGateHold() { return this.cr2.feats.some(f => f.k === 'bossgate' && !f.open && f.y < this.sectionPx()); },

  crGateFight(ps) {
    const c2 = this.cr2, S = this.sectionPx();
    const f = c2.feats.find(q => q.k === 'bossgate' && !q.open && q.y < S);
    if (f && !c2.fight && ps.some(t => t.y < S - 8)) this.crStartFight(f);
    const F = c2.fight;
    if (!F) return;
    if (!F.won && this.bossDefeated) {
      F.won = this.frame;
      this.maxEnemies = F.maxEnemies; this.spawnXs = null;
      if (F.gate) this.crOpenGate(F.gate, 'THE GATE IS OPEN!');
      this.crBanner({ text: 'GATE ' + F.g + ' TAKEN!', sub: 'ON UP', color: COL.gold, t: 150 });
    }
    // the wreck burns a while (and the victory tune plays), then the boss is gone for good
    if (F.won && this.frame - F.won > 300) this.crEndFight();
  },

  crEndFight() {
    this.bosses = []; this.beams = []; this.puffs = []; this.tracks = []; this.dust = [];
    this.bossIdx = undefined; this.bossDefeated = false; this.bossNote = null; this.bossBanner = 0;
    this.cr2.fight = null;
  },

  crStartFight(f) {
    const c2 = this.cr2, S = this.sectionPx();
    c2.fight = { g: f.g, gate: f, maxEnemies: this.maxEnemies, won: 0 };
    // the boss's arena is the top section: for the boss, the field ends at its bottom
    const fh = FH;
    FH = S;
    try { this.initBoss({ idx: f.idx, loop: 0.5 * (f.g - 1) }); } finally { FH = fh; }
    this.bossDefeated = false;
    const b = this.mainBoss();
    if (b && b.y < 16 && !['train', 'hydra', 'mole'].includes(b.kind)) b.y = 16;
    // the escorts come out of the gatehouse
    this.spawnXs = [f.x, f.x + 16];
    this.spawnTimer = 120;
    Sound.play('bossWarn');   // the boss's own banner names it
  },

  // ------------------------------------------------------------ a tank comes back above the hazard, on solid ground
  crSpawnPoint(p) {
    const hz = this.cr2.hz, cam = this.camY, pref = Math.max(0, Math.min(FW - 16, PLAYER_SPAWN[p.i][0]));
    const lim = Math.floor((hz.y - 48) / 16) * 16;
    const bottom = Math.min(FH - 16, Math.floor((cam + VIEW_H - 16) / 16) * 16, lim);
    const xs = [];
    for (let x = 0; x <= FW - 16; x += 16) xs.push(x);
    xs.sort((a, b) => Math.abs(a - pref) - Math.abs(b - pref));
    for (let y = bottom; y >= Math.max(0, cam - 16); y -= 16) for (const x of xs) if (this.crSpotOk(x, y)) return [x, y];
    const y = Math.max(0, Math.min(bottom, lim));
    this.clearArea(pref, y, 16, 16);
    return [pref, y];
  },

  // ------------------------------------------------------------ online
  crView() {
    const c2 = this.cr2;
    return { f: c2.feats, h: [Math.round(c2.hz.y), c2.hz.kind, c2.hz.warn], c: [Math.round(c2.combo.v), c2.combo.lv], b: c2.band, bn: c2.banner,
      g: c2.ghost, m: c2.medals, t: c2.inTunnel ? 1 : 0, ft: c2.fight ? 1 : 0, fl: c2.falls || [], r: c2.record ? 1 : 0 };
  },
  applyCrView(v) {
    const c2 = this.cr2 || (this.cr2 = { feats: [], hz: { y: FH + 96, kind: 'flood', warn: 0, t: 0 }, combo: { v: 0, lv: 1 }, band: 0, noted: {} });
    c2.feats = v.f || []; c2.hz.y = v.h[0]; c2.hz.kind = v.h[1]; c2.hz.warn = v.h[2]; c2.combo.v = v.c[0]; c2.combo.lv = v.c[1];
    c2.band = v.b; c2.banner = v.bn; c2.ghost = v.g; c2.medals = v.m; c2.inTunnel = !!v.t; c2.fight = v.ft ? {} : null;
    c2.falls = v.fl || []; c2.record = !!v.r;
  },

  // ------------------------------------------------------------ checkpoints (the last depot)
  crCkAt() { const c2 = this.cr2; return { sec: c2.ckSec, alt: c2.ckAlt, seed: c2.seed, medals: c2.medals, record: c2.record }; },
  crResume(at) {
    const c = this.corridor, o = at.cr2 || {}, c2 = this.cr2;
    // an older save knows only how far you'd got: on from the section that was
    const sec = Math.max(0, o.sec !== undefined ? o.sec | 0 : Math.floor((at.climbed | 0) / CORRIDOR_SECTION));
    if (o.seed) c2.seed = o.seed | 0;
    c2.ckSec = sec; c2.ckAlt = o.alt | 0 || 13 * sec; c2.medals = o.medals | 0; c2.record = !!o.record;
    this.crRebuild(sec);
    for (const f of c2.feats) if (f.k === 'depot' && f.sec === sec) f.used = true;   // the depot you start on has done its job
    c.lifeAt = Math.max(5, at.lifeAt | 0, Math.floor(sec / 5) * 5 + 5); c.spawned = at.spawned | 0;
    c.kinds = Array.isArray(at.kinds) ? at.kinds.slice() : [];
  },

  // tests and the soak: on to (the bottom of the section holding) altitude alt
  crJump(alt) { this.crRebuild(Math.max(0, Math.floor(alt / CORRIDOR_SECTION))); },
  crPlan(k) { return crPlanOf(this.cr2.seed, k); },
});

// where your best run ended (the ghost on the way up)
function crGhost() {
  const b = (STORE.get(MODE_KEY, {}).corridor || {});
  return b.dist > 0 ? { alt: b.dist, x: b.gx === undefined ? -1 : b.gx } : null;
}

// the line under the mode on the title: the best climb and score, room left for the medals (drawn by crTitleMedals)
function crTitleBest(rec) {
  const b = rec.corridor;
  return (b ? 'BEST ' + b.dist + ' M  ' + b.score : 'NO CLIMB YET') + '    ';
}

// a medal, 9x12: ribbon, then the disc with its shine (lit: earned; dark: not yet)
function crDrawMedal(ctx, x, y, m, lit) {
  const c = lit ? CR_MEDALS[m].c : ['#3C3C3C', '#2C2C2C', '#1C1C1C'];
  ctx.fillStyle = lit ? '#D82800' : '#2C2C2C'; ctx.fillRect(x + 2, y, 2, 4);
  ctx.fillStyle = lit ? '#3C7CF8' : '#242424'; ctx.fillRect(x + 5, y, 2, 4);
  ctx.fillStyle = c[2]; ctx.fillRect(x + 2, y + 4, 5, 1); ctx.fillRect(x + 1, y + 5, 7, 5); ctx.fillRect(x + 2, y + 10, 5, 1);
  ctx.fillStyle = c[1]; ctx.fillRect(x + 2, y + 5, 5, 5); ctx.fillRect(x + 3, y + 4, 3, 1);
  ctx.fillStyle = c[0]; ctx.fillRect(x + 2, y + 5, 2, 1); ctx.fillRect(x + 2, y + 6, 1, 2);
  if (lit) { ctx.fillStyle = c[2]; ctx.fillRect(x + 4, y + 6, 1, 3); ctx.fillRect(x + 3, y + 7, 3, 1); }
}

// ------------------------------------------------------------------ drawing
// each band's ground for a strip two sections tall (cached), so the corridor's ground can be laid row by row
const crGroundCache = {};
function crBandGround(theme) {
  const key = theme + FW;
  if (crGroundCache[key]) return crGroundCache[key];
  const t = THEMES[theme] || THEMES.classic, H = 26 * 16, c = makeCanvas(FW, H), x = c.getContext('2d'), fh = FH;
  x.fillStyle = t.ground; x.fillRect(0, 0, FW, H);
  const r = seeded(977 + FW + theme.length * 31);
  FH = H;   // the paint functions fill the field they're given
  try {
    if (t.specks) for (let k = 0; k < FW * H / 40; k++) { x.fillStyle = t.specks[Math.floor(r() * t.specks.length)]; x.fillRect(Math.floor(r() * FW), Math.floor(r() * H), 1 + (r() < 0.3 ? 1 : 0), 1); }
    if (t.paint) t.paint(x, seeded(499 + theme.length));
  } finally { FH = fh; }
  crGroundCache[key] = c;
  return c;
}

Object.assign(Stage.prototype, {
  // the band of each tile row of the world, top to bottom
  crRowBands() {
    const base = this.crBase(), out = [];
    for (let r = 0; r < ROWS; r++) out.push(crBand(base - r));
    return out;
  },

  // the corridor's ground: each row in its band's colours, the two blending where bands meet
  crGround() {
    const key = this.crBase() + '|' + FW + 'x' + FH;
    if (this.ground && this.groundFor === key) return this.ground;
    const c = this.ground && this.ground.width === FW && this.ground.height === FH ? this.ground : makeCanvas(FW, FH), x = c.getContext('2d');
    const rows = this.crRowBands(), base = this.crBase();
    for (let r = 0; r < ROWS; r++) {
      const off = (((r - base) % 26) + 26) % 26;
      x.drawImage(crBandGround(rows[r].theme), 0, off * 16, FW, 16, 0, r * 16, FW, 16);
    }
    for (let r = 0; r < ROWS - 1; r++) {
      if (rows[r] === rows[r + 1]) continue;
      // the lower band's ground creeps up into the upper one, and a little the other way
      const y = (r + 1) * 16, lo = THEMES[rows[r + 1].theme] || THEMES.classic, up = THEMES[rows[r].theme] || THEMES.classic, h = seeded(y * 31 + 7);
      for (let d = 1; d <= 12; d++) for (let px = 0; px < FW; px += 2) {
        if (h() < (13 - d) / 15) { x.fillStyle = h() < 0.7 ? lo.ground : (lo.specks || [lo.ground])[0]; x.fillRect(px + (d & 1), y - d, 2, 1); }
        if (d <= 5 && h() < (6 - d) / 9) { x.fillStyle = up.ground; x.fillRect(px + (d & 1), y + d - 1, 2, 1); }
      }
    }
    this.ground = c; this.groundFor = key;
    return c;
  },

  // one cell into the layers in its row's band (shared by the full drawing and the one-cell redraws)
  crCell(bg, fo, t, cx, cy, tex, sky) {
    const sx = (cx & 1) * 4, sy = (cy & 1) * 4, dx = cx * 4, dy = cy * 4;
    if (t === T_BRICK) bg.drawImage(tex.brick, sx, sy, 4, 4, dx, dy, 4, 4);
    else if (t === T_STEEL) bg.drawImage(tex.steel, sx, sy, 4, 4, dx, dy, 4, 4);
    else if (t === T_ICE) bg.drawImage(tex.ice, sx, sy, 4, 4, dx, dy, 4, 4);
    else if (t === T_BRIDGE) bg.drawImage(Sprites.bridgeTex, sx, sy, 4, 4, dx, dy, 4, 4);
    else if (t === T_MUD) bg.drawImage(Sprites.mudTex, sx, sy, 4, 4, dx, dy, 4, 4);
    else if (isBelt(t)) { if (this.beltCells) this.beltCells.push(cy * GW + cx); }
    else if (t === T_FOREST) fo.drawImage(tex.forest, sx, sy, 4, 4, dx, dy, 4, 4);
    else if (t === T_WATER) { if (this.waterCells) this.waterCells.push(cy * GW + cx); }
    else if (t === T_LAVA && sky) { bg.drawImage(crDropTile(), dx & 31, dy & 31, 4, 4, dx, dy, 4, 4); if (this.bioL) this.bioL.drop.push(cy * GW + cx); }
    else if (t >= T_LAVA) this.bioCell(bg, fo, t, cx, cy, tex);
  },

  crBuildLayers() {
    if (!this.bgLayer) { this.bgLayer = makeCanvas(FW, FH); this.forestLayer = makeCanvas(FW, FH); }
    const bg = this.bgLayer.getContext('2d'), fo = this.forestLayer.getContext('2d'), rows = this.crRowBands();
    bg.clearRect(0, 0, FW, FH); fo.clearRect(0, 0, FW, FH);
    this.waterCells = []; this.beltCells = [];
    const L = this.bioL = { lava: [], vent: [], gas: [], lamp: [], bog: [], drop: [] };
    // a run of the same tile along a row is one fill with its texture as a pattern (anchored where the cells' own
    // textures are), far quicker than a 4px cell at a time: the corridor redraws all of this at every shift
    const pats = [new Map(), new Map()], pat = (ctx, img) => { const m = pats[ctx === bg ? 0 : 1]; let p = m.get(img); if (!p) { p = ctx.createPattern(img, 'repeat'); m.set(img, p); } return p; };
    const what = (t, tex, sky) => {
      if (t === T_BRICK) return [bg, tex.brick];
      if (t === T_STEEL) return [bg, tex.steel];
      if (t === T_ICE) return [bg, tex.ice];
      if (t === T_BRIDGE) return [bg, Sprites.bridgeTex];
      if (t === T_MUD) return [bg, Sprites.mudTex];
      if (t === T_FOREST) return [fo, tex.forest];
      if (t === T_WATER) return [null, null, this.waterCells];
      if (isBelt(t)) return [null, null, this.beltCells];
      if (t === T_LAVA) return sky ? [bg, crDropTile(), L.drop] : [null, null, L.lava];
      if (t === T_GAS) return [bg, tex.bog, L.gas];
      if (t === T_VENT) return [bg, tex.vent, L.vent];
      if (t === T_BOG) return [bg, tex.bog, L.bog];
      if (t === T_LAMP) return [bg, tex.lamp, L.lamp];
      if (t === T_REEDS) return [fo, tex.reeds];
      if (t === T_CRATE) return [bg, tex.crate];
      return BIO_TEX[t] ? [bg, tex[BIO_TEX[t]]] : [null, null];
    };
    for (let cy = 0; cy < GH; cy++) {
      const band = rows[cy >> 2], tex = themeTex(band.theme), sky = band.key === 'sky', row = cy * GW;
      for (let cx = 0; cx < GW;) {
        const t = this.terrain[row + cx];
        let n = 1;
        while (cx + n < GW && this.terrain[row + cx + n] === t) n++;
        if (t) {
          const [ctx, img, list] = what(t, tex, sky);
          if (list) for (let q = 0; q < n; q++) list.push(row + cx + q);
          if (ctx && img) { ctx.fillStyle = pat(ctx, img); ctx.fillRect(cx * 4, cy * 4, n * 4, 4); }
        }
        cx += n;
      }
    }
    // the lava's runs along each row, for drawing it every frame
    L.lavaRuns = new Map();
    for (const i of L.lava) {
      const cy = (i / GW) | 0, x = (i % GW) * 4, run = L.lavaRuns.get(cy);
      if (run && run[run.length - 1][1] === x) run[run.length - 1][1] = x + 4; else if (run) run.push([x, x + 4]); else L.lavaRuns.set(cy, [[x, x + 4]]);
    }
    this.crCaps(bg, fo, rows, null);
    this.crDropEdges(bg);
    this.dirty = false;
    this.dirtyCells = [];
    this.layerOf = this.terrain.slice();
  },

  crRedrawCells() {
    const bg = this.bgLayer.getContext('2d'), fo = this.forestLayer.getContext('2d'), rows = this.crRowBands(), done = new Set();
    const lists = [this.beltCells, this.waterCells];
    this.beltCells = null; this.waterCells = null;   // a redraw never changes those lists (a change to them redraws it all)
    const bl = this.bioL; this.bioL = null;
    for (const i0 of this.dirtyCells) for (const i of [i0, i0 + GW]) {
      if (i >= GW * GH || done.has(i)) continue;
      done.add(i);
      const cx = i % GW, cy = (i / GW) | 0, band = rows[cy >> 2];
      bg.clearRect(cx * 4, cy * 4, 4, 4); fo.clearRect(cx * 4, cy * 4, 4, 4);
      const t = this.terrain[i];
      if (t) this.crCell(bg, fo, t, cx, cy, themeTex(band.theme), band.key === 'sky');
      this.layerOf[i] = t;
    }
    [this.beltCells, this.waterCells] = lists; this.bioL = bl;
    this.crCaps(bg, fo, rows, done);
    this.dirtyCells = [];
  },

  // snow along the top of walls and trees in the snow band
  crCaps(bg, fo, rows, only) {
    const solid = v => v === T_BRICK || v === T_STEEL || v === T_FOREST;
    const cells = only ? Array.from(only) : null;
    const cap = i => {
      const cx = i % GW, cy = (i / GW) | 0, th = THEMES[rows[cy >> 2].theme] || {}, v = this.terrain[i];
      if (!th.snowCaps || !solid(v) || (cy > 0 && solid(this.terrain[i - GW]))) return;
      const ctx = v === T_FOREST ? fo : bg;
      ctx.fillStyle = th.snowCaps;
      ctx.fillRect(cx * 4, cy * 4, 4, 1);
      if ((cx + cy) % 3 === 0) ctx.fillRect(cx * 4 + 1, cy * 4 + 1, 2, 1);
    };
    if (cells) { for (const i of cells) cap(i); return; }
    for (let r = 0; r < ROWS; r++) if ((THEMES[rows[r].theme] || {}).snowCaps) for (let i = r * 4 * GW; i < (r + 1) * 4 * GW; i++) cap(i);
  },

  // walkway edges over the drop: a lit rim, the girder's face below it, its shadow on the clouds
  crDropEdges(bg) {
    const L = this.bioL;
    if (!L || !L.drop.length) return;
    const isDrop = new Uint8Array(GW * GH);
    for (const i of L.drop) isDrop[i] = 1;
    const runs = new Map();
    for (const i of L.drop) {
      const cx = i % GW, cy = (i / GW) | 0, x = cx * 4, y = cy * 4;
      const above = cy > 0 && !isDrop[i - GW], above2 = cy > 1 && !isDrop[i - 2 * GW] && !above;
      if (above) { bg.fillStyle = '#4C5664'; bg.fillRect(x, y, 4, 2); bg.fillStyle = '#262C36'; bg.fillRect(x, y + 2, 4, 1); bg.fillStyle = 'rgba(8,16,48,0.45)'; bg.fillRect(x, y + 3, 4, 1); }
      else if (above2) { bg.fillStyle = 'rgba(8,16,48,0.35)'; bg.fillRect(x, y, 4, 4); }
      if (cx > 0 && !isDrop[i - 1]) { bg.fillStyle = 'rgba(8,16,48,0.3)'; bg.fillRect(x, y, 1, 4); }
      const run = runs.get(cy);
      if (run && run[run.length - 1][1] === x) run[run.length - 1][1] = x + 4; else if (run) run.push([x, x + 4]); else runs.set(cy, [[x, x + 4]]);
    }
    // the walkway side of each edge (only cells next to the drop)
    for (const j of L.drop) {
      const jx = j % GW, jy = (j / GW) | 0;
      if (jy < GH - 1 && !isDrop[j + GW]) { bg.fillStyle = '#8C98AC'; bg.fillRect(jx * 4, jy * 4 + 4, 4, 1); }
      if (jx < GW - 1 && !isDrop[j + 1]) { bg.fillStyle = '#7C889C'; bg.fillRect(jx * 4 + 4, jy * 4, 1, 4); }
      if (jx > 0 && !isDrop[j - 1]) { bg.fillStyle = '#262C36'; bg.fillRect(jx * 4 - 1, jy * 4, 1, 4); }
    }
    L.dropRuns = runs;
  },

  // ------------------------------------------------------------ on the ground, under the tanks
  crRenderGround(ctx) {
    const c2 = this.cr2, f = this.frame, cam = Math.round(this.camY || 0), vis = (y0, y1) => y1 > cam - 8 && y0 < cam + VIEW_H + 8;
    // clouds drifting far below the walkways
    const L = this.bioL;
    if (L && L.dropRuns && L.dropRuns.size) {
      ctx.fillStyle = 'rgba(236,244,255,0.55)';
      for (let n = 0; n < 7; n++) {
        const w = 18 + (n * 13) % 22, ch = 4 + (n % 3) * 2, sp = 0.12 + (n % 4) * 0.05;
        const x0 = Math.round(((n * 71 + f * sp) % (FW + w + 20)) - w), y0 = cam + ((n * 53 + 11) % (VIEW_H - 8));
        for (let cy = y0 >> 2; cy <= (y0 + ch) >> 2; cy++) {
          const runs = L.dropRuns.get(cy);
          if (!runs) continue;
          const yt = Math.max(y0, cy * 4), yb = Math.min(y0 + ch, cy * 4 + 4), inset = Math.abs(cy * 4 + 2 - y0 - ch / 2) > ch / 3 ? 3 : 0;
          for (const [a, b] of runs) { const l = Math.max(a, x0 + inset), r = Math.min(b, x0 + w - inset); if (r > l && yb > yt) ctx.fillRect(l, yt, r - l, yb - yt); }
        }
      }
    }
    for (const q of c2.feats) {
      if (q.k === 'depot' && vis(q.y, q.y + 32)) this.crDrawDepot(ctx, q);
      else if ((q.k === 'bossgate' || q.k === 'tgate') && vis(q.y - 8, q.y + 24)) this.crDrawGate(ctx, q);
      else if (q.k === 'road' && vis(q.y, q.y + q.h)) {
        ctx.fillStyle = '#26262A'; ctx.fillRect(0, q.y, FW, q.h);
        ctx.fillStyle = '#3A3A40'; for (let x = 3; x < FW; x += 11) ctx.fillRect(x, q.y + 3 + (x * 7) % 24, 2, 1);
        ctx.fillStyle = '#C8C8B8'; ctx.fillRect(0, q.y + 1, FW, 1); ctx.fillRect(0, q.y + q.h - 2, FW, 1);
        ctx.fillStyle = '#E8C848'; for (let x = 2; x < FW; x += 16) ctx.fillRect(x, q.y + 15, 8, 2);
      } else if (q.k === 'mines' && vis(q.y0 - 8, q.y1 + 8)) {
        for (const y of [q.y0, q.y1 - 2]) for (let x = 0; x < FW; x += 4) { ctx.fillStyle = ((x >> 2) + (y >> 4)) & 1 ? '#F8B800' : '#1C1C1C'; ctx.fillRect(x, y, 4, 2); }
        this.crSign(ctx, 2, q.y1 - 14); this.crSign(ctx, FW - 14, q.y1 - 14);
      } else if (q.k === 'branch' && vis(q.y1 - 16, q.y1 + 16)) {
        const c = Math.floor(COLS / 2) * 16, halves = [[0, c], [c + 16, FW]];
        halves.forEach(([a, b], i) => {
          const fast = i === q.fast, cx = (a + b) / 2, y = q.y1 + 4, word = fast ? 'FAST' : 'SAFE';
          ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(Math.round(cx - 20), y - 2, 40, 11);
          Font.drawCenter(ctx, word, cx, y, fast ? '#F85838' : '#58D854');
          if ((f >> 4) & 1) Font.drawCenter(ctx, '^', cx, y - 11, fast ? '#F85838' : '#58D854');
        });
      } else if (q.k === 'belts' && vis(q.y0, q.y1)) {
        // a chevron on each belt tile, creeping the way it runs: green up, red down, yellow across
        const s = ((f >> 3) & 3) - 1, C = [[0, -1], [-1, 0], [1, 0], [-2, 1], [2, 1]];
        for (let ty = Math.max(q.y0, cam - 16) >> 4; ty <= Math.min(q.y1 - 1, cam + VIEW_H) >> 4; ty++) for (let tx = 0; tx < COLS; tx++) {
          const v = this.get(tx * 4 + 1, ty * 4 + 1);
          if (!isBelt(v)) continue;
          const d = v - T_BELT, [ux, uy] = DXY[d], cx = tx * 16 + 8 + ux * s, cy = ty * 16 + 8 + uy * s;
          ctx.fillStyle = d === 0 ? '#58D854' : d === 2 ? '#D85838' : '#F8B800';
          for (let [x, y] of C) { for (let k = 0; k < d; k++) [x, y] = [-y, x]; ctx.fillRect(cx + x - 1, cy + y - 1, 2, 2); }
        }
      } else if (q.k === 'tunnel' && vis(q.y1 - 4, q.y1 + 8)) {
        for (let x = 0; x < FW; x += 4) { ctx.fillStyle = (x >> 2) & 1 ? '#F8B800' : '#1C1C1C'; ctx.fillRect(x, q.y1 + 1, 4, 2); }
      }
    }
    // the ghost: where your best run ended
    const g = c2.ghost;
    if (g && g.alt > 0) {
      const y = Math.round(this.crYAlt(g.alt));
      if (vis(y - 12, y + 16)) {
        ctx.globalAlpha = c2.record ? 0.35 : 0.8;
        ctx.fillStyle = '#E8E8F8';
        for (let x = (f >> 2) % 6; x < FW; x += 6) ctx.fillRect(x, y, 3, 1);
        const gx = g.x >= 0 ? g.x : (FW >> 1) - 8;
        ctx.globalAlpha *= 0.75 + 0.2 * Math.sin(f / 12);
        ctx.drawImage(Sprites.tank('p0', 0, 0, 'c_WHITE'), gx, y + 1);
        ctx.globalAlpha = c2.record ? 0.35 : 0.9;
        const lx = gx > FW - 56 ? gx - 36 : gx + 20;
        Font.draw(ctx, 'BEST', lx, y + 5, '#E8E8F8');
        ctx.globalAlpha = 1;
      }
    }
  },

  // a little warning sign on a post (12x14): a yellow triangle with a '!'
  crSign(ctx, x, y) {
    ctx.fillStyle = '#5C3C1C'; ctx.fillRect(x + 5, y + 9, 2, 6);
    ctx.fillStyle = '#1C1C1C';
    for (let r = 0; r < 10; r++) ctx.fillRect(x + 6 - Math.ceil(r * 0.6) - 1, y + r, Math.ceil(r * 1.2) + 2, 1);
    ctx.fillStyle = '#F8B800';
    for (let r = 1; r < 9; r++) ctx.fillRect(x + 6 - Math.ceil(r * 0.6), y + r, Math.ceil(r * 1.2), 1);
    ctx.fillStyle = '#1C1C1C'; ctx.fillRect(x + 5, y + 3, 2, 3); ctx.fillRect(x + 5, y + 7, 2, 1);
  },

  // a supply depot: a pad with a cross, crates at the corners, a beacon while it's waiting for you
  crDrawDepot(ctx, q) {
    const { x, y } = q, f = this.frame, used = q.used;
    ctx.fillStyle = '#2C2C28'; ctx.fillRect(x - 1, y - 1, 34, 34);
    ctx.fillStyle = '#6C6C60'; ctx.fillRect(x, y, 32, 32);
    ctx.fillStyle = '#7C7C70'; ctx.fillRect(x + 2, y + 2, 28, 28);
    for (let k = 0; k < 32; k += 4) {   // yellow and black edge stripes
      ctx.fillStyle = (k >> 2) & 1 ? '#1C1C1C' : '#F8B800';
      ctx.fillRect(x + k, y, 4, 2); ctx.fillRect(x + k, y + 30, 4, 2); ctx.fillRect(x, y + k, 2, 4); ctx.fillRect(x + 30, y + k, 2, 4);
    }
    const cross = (c, d) => { ctx.fillStyle = d; ctx.fillRect(x + 11, y + 5, 10, 22); ctx.fillRect(x + 5, y + 11, 22, 10); ctx.fillStyle = c; ctx.fillRect(x + 12, y + 6, 8, 20); ctx.fillRect(x + 6, y + 12, 20, 8); };
    if (used) cross('#3C6C3C', '#2C3C2C');
    else { cross((f >> 4) & 1 ? '#58D854' : '#38B838', '#F8F8F8'); }
    for (const [ox, oy] of [[3, 3], [24, 3], [3, 24], [24, 24]]) {
      ctx.fillStyle = '#4C2400'; ctx.fillRect(x + ox, y + oy, 5, 5);
      ctx.fillStyle = '#B76506'; ctx.fillRect(x + ox + 1, y + oy + 1, 3, 3);
      ctx.fillStyle = '#F0B060'; ctx.fillRect(x + ox + 1, y + oy + 1, 3, 1);
    }
    if (!used) {
      ctx.fillStyle = (f >> 3) & 1 ? '#F8F8F8' : '#F83800'; ctx.fillRect(x + 15, y + 15, 2, 2);
      if ((f >> 4) & 1) Font.drawCenter(ctx, 'DEPOT', x + 16, y - 11, '#58D854');
    }
  },

  // a gate in a wall: the boss's gatehouse (towers, banners, a portcullis) or the turrets' steel door (a light for
  // each turret still standing)
  crDrawGate(ctx, q) {
    const { x, y } = q, f = this.frame;
    if (q.k === 'bossgate') {
      for (const tx of [0, FW - 24]) {   // corner towers
        ctx.fillStyle = '#2C2C34'; ctx.fillRect(tx, y - 6, 24, 24);
        ctx.fillStyle = '#6C6C7C'; ctx.fillRect(tx + 1, y - 5, 22, 22);
        ctx.fillStyle = '#4C4C58';
        for (let r = 0; r < 22; r += 5) ctx.fillRect(tx + 1, y - 5 + r, 22, 1);
        for (let r = 0; r < 22; r += 5) for (let k = (r / 5) & 1 ? 3 : 7; k < 22; k += 8) ctx.fillRect(tx + 1 + k, y - 5 + r, 1, 5);
        ctx.fillStyle = '#0C0C10'; ctx.fillRect(tx + 11, y + 2, 2, 7);
        ctx.fillStyle = '#2C2C34'; for (let k = 0; k < 24; k += 6) ctx.fillRect(tx + k, y - 9, 4, 3);
        const wave = (f >> 3) & 1;   // a pennant on top
        ctx.fillStyle = '#7C7C7C'; ctx.fillRect(tx + 11, y - 16, 1, 7);
        ctx.fillStyle = '#D82800'; ctx.fillRect(tx + 12, y - 16, 5, 2); ctx.fillRect(tx + 12, y - 14, 3 + wave, 1);
      }
      for (const bx of [x - 14, x + 38]) {   // banners with a skull
        ctx.fillStyle = '#7C0000'; ctx.fillRect(bx, y + 1, 8, 13);
        ctx.fillStyle = '#B81C00'; ctx.fillRect(bx + 1, y + 1, 6, 12);
        ctx.fillStyle = '#F8F8F8'; ctx.fillRect(bx + 2, y + 4, 4, 3); ctx.fillRect(bx + 3, y + 7, 2, 1);
        ctx.fillStyle = '#B81C00'; ctx.fillRect(bx + 3, y + 5, 1, 1); ctx.fillRect(bx + 5, y + 5, 1, 1);
      }
      ctx.fillStyle = '#2C2C34'; ctx.fillRect(x - 2, y - 2, 36, 18);
      ctx.fillStyle = '#5C5C68'; ctx.fillRect(x - 1, y - 1, 34, 2);
      ctx.fillStyle = '#0C0C10'; ctx.fillRect(x, y + 1, 32, 15);
      const lift = q.open ? 11 : 0;
      ctx.fillStyle = '#9C9CAC';
      for (let k = 2; k < 32; k += 4) ctx.fillRect(x + k, y + 1, 1, 15 - lift);
      ctx.fillRect(x, y + 4, 32, 1); if (!lift) { ctx.fillRect(x, y + 10, 32, 1); for (let k = 2; k < 32; k += 4) ctx.fillRect(x + k, y + 15, 1, 1); }
      if (!q.open && !this.cr2.fight && (f >> 4) & 1) Font.drawCenter(ctx, 'BOSS GATE', x + 16, y + 20, '#F83800');
    } else {
      ctx.fillStyle = '#1C1C24'; ctx.fillRect(x - 1, y, 34, 16);
      if (q.open) { ctx.fillStyle = '#0C0C10'; ctx.fillRect(x, y + 1, 32, 14); ctx.fillStyle = '#7C7C88'; ctx.fillRect(x, y + 1, 3, 14); ctx.fillRect(x + 29, y + 1, 3, 14); }
      else {
        ctx.fillStyle = '#8C8C9C'; ctx.fillRect(x, y + 1, 32, 14);
        ctx.fillStyle = '#5C5C6C'; ctx.fillRect(x + 15, y + 1, 2, 14); ctx.fillRect(x, y + 7, 32, 1);
        ctx.fillStyle = '#C8C8D4'; for (const [ox, oy] of [[2, 3], [12, 3], [19, 3], [29, 3], [2, 11], [12, 11], [19, 11], [29, 11]]) ctx.fillRect(x + ox, y + oy, 1, 1);
      }
      // a light for each of the three turrets: red while it stands, green once it's wrecked
      if (!q.open) {
        const left = this.turrets.filter(t => t.crg === q.id).length;
        for (let i = 0; i < 3; i++) {
          const on = i < left;
          ctx.fillStyle = '#1C1C1C'; ctx.fillRect(x + 5 + i * 8, y + 9, 7, 5);
          ctx.fillStyle = on ? ((f >> 3) & 1 ? '#F83800' : '#A80000') : '#58D854'; ctx.fillRect(x + 6 + i * 8, y + 10, 5, 3);
        }
      }
    }
  },

  // ------------------------------------------------------------ over everything: the dark tunnels, the hazard
  crRenderTunnels(ctx) {
    const cam = Math.round(this.camY || 0);
    for (const q of this.cr2.feats) {
      if (q.k !== 'tunnel') continue;
      const y0 = Math.max(q.y0 - 8, cam), y1 = Math.min(q.y1 + 8, cam + VIEW_H);
      if (y1 <= y0) continue;
      if (!this.crDark || this.crDark.width !== FW || this.crDark.height !== VIEW_H) this.crDark = makeCanvas(FW, VIEW_H);
      const d = this.crDark.getContext('2d');
      d.globalCompositeOperation = 'source-over';
      d.clearRect(0, 0, FW, VIEW_H);
      // the dark thickens over the first and last few pixels of the tunnel
      const g = d.createLinearGradient(0, q.y0 - 8 - cam, 0, q.y1 + 8 - cam);
      const e = 16 / (q.y1 - q.y0 + 16);
      g.addColorStop(0, 'rgba(0,0,8,0)'); g.addColorStop(e, 'rgba(0,0,8,0.97)'); g.addColorStop(1 - e, 'rgba(0,0,8,0.97)'); g.addColorStop(1, 'rgba(0,0,8,0)');
      d.fillStyle = g; d.fillRect(0, y0 - cam, FW, y1 - y0);
      d.globalCompositeOperation = 'destination-out';
      const light = (x, y, r) => {
        const gr = d.createRadialGradient(x, y - cam, r * 0.3, x, y - cam, r);
        gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
        d.fillStyle = gr; d.fillRect(x - r, y - cam - r, r * 2, r * 2);
      };
      for (const t of this.tanks) {
        if (!t.alive) continue;
        if (t.isPlayer) {
          const cx = t.x + 8, cy = t.y + 8, [dx, dy] = DXY[t.dir], L = 84, s = 0.42;
          light(cx, cy, 22);
          // the headlamp: a cone of light ahead
          const gr = d.createRadialGradient(cx, cy - cam, 6, cx, cy - cam, L);
          gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(0.7, 'rgba(0,0,0,0.85)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
          d.fillStyle = gr;
          d.beginPath(); d.moveTo(cx + dx * 4, cy + dy * 4 - cam);
          d.lineTo(cx + (dx - dy * s) * L, cy + (dy + dx * s) * L - cam); d.lineTo(cx + (dx + dy * s) * L, cy + (dy - dx * s) * L - cam);
          d.closePath(); d.fill();
        } else if (t.reveal > 0) light(t.x + 8, t.y + 8, 16);
      }
      for (const b of this.bullets) light(b.x + 2, b.y + 2, 10);
      for (const fx of this.fx) if (fx.tick >= 0) light(fx.x, fx.y, 26);
      for (const s of this.spawns) light(s.x + 8, s.y + 8, 14);
      if (this.powerup && (this.frame >> 4) & 1) light(this.powerup.x + 8, this.powerup.y + 8, 14);
      d.globalCompositeOperation = 'source-over';
      ctx.drawImage(this.crDark, 0, cam);
    }
  },

  // the hazard: its crest moving, its body down to the bottom of the screen
  crRenderHazard(ctx) {
    const c2 = this.cr2, hz = c2.hz, cam = Math.round(this.camY || 0), bottom = cam + VIEW_H, f = this.frame;
    // falls off the walkways: the tank shrinks away into the clouds
    for (const q of c2.falls || []) {
      const k = 1 - q.t / 40, s = Math.max(2, Math.round(16 * k));
      ctx.globalAlpha = Math.max(0.2, k);
      ctx.drawImage(Sprites.tank(q.spec || 'p0', 0, q.dir || 0, q.pal || 'c_WHITE'), Math.round(q.x + 8 - s / 2), Math.round(q.y + 8 - s / 2 + q.t / 4), s, s);
      ctx.globalAlpha = 1;
    }
    // tanks close to it glow red
    for (const t of this.tanks) {
      if (!t.alive || !t.isPlayer || hz.y - (t.y + 16) > 24 || !((f >> 2) & 1)) continue;
      ctx.fillStyle = '#F83800';
      ctx.fillRect(t.x - 1, t.y - 1, 18, 1); ctx.fillRect(t.x - 1, t.y + 16, 18, 1); ctx.fillRect(t.x - 1, t.y, 1, 16); ctx.fillRect(t.x + 16, t.y, 1, 16);
    }
    // just after the world moves down, the view can show a little below its bottom edge for a moment: the hazard
    // is down there, so it fills that
    const top = Math.round(bottom > FH && hz.y > FH ? FH : hz.y), kind = hz.kind, flash = hz.warn > 0 && (f >> 2) & 1;
    if (top > bottom + 16) return;
    const body = { lava: '#B02000', flood: '#1C4CB0', fire: '#3C0C00' }[kind];
    ctx.fillStyle = body; ctx.fillRect(0, top + 3, FW, Math.max(0, bottom - top));
    // what's in it: blobs and crust in the lava, waves in the water, embers in the fire
    const depth = Math.max(8, bottom - top - 4);
    for (let i = 0; i < 26; i++) {
      const sp = 0.15 + (i % 4) * 0.12, bx = Math.round(((i * 53) + f * sp * (i & 1 ? 1 : -1)) % (FW + 12) + FW + 12) % (FW + 12) - 6;
      const by = top + 6 + ((i * 37) % depth);
      if (by > bottom) continue;
      if (kind === 'lava') { ctx.fillStyle = i % 3 ? '#E04000' : '#701000'; ctx.fillRect(bx, by, i % 3 ? 5 : 8, i % 3 ? 2 : 1); if (i % 5 === 0) { ctx.fillStyle = '#F8A030'; ctx.fillRect(bx + 1, by, 2, 1); } }
      else if (kind === 'flood') { ctx.fillStyle = i % 4 ? '#183C98' : '#3C78D8'; ctx.fillRect(bx, by, 10, 1); }
      else { const ey = by - ((f * (0.3 + (i % 3) * 0.2)) % depth); ctx.fillStyle = i % 3 ? '#C82800' : '#F87800'; ctx.fillRect(bx, Math.max(top + 4, Math.round(ey)), 2, 2); }
    }
    for (let x = 0; x < FW; x += 2) {
      const w = Math.round(Math.sin((x + f * (kind === 'flood' ? 0.7 : 0.45)) / 7) * 1.5 + Math.sin((x * 0.31 - f * 0.21)) * 0.8);
      const y = top + w;
      if (kind === 'lava') {
        ctx.fillStyle = 'rgba(248,96,0,0.35)'; ctx.fillRect(x, y - 3, 2, 3);
        ctx.fillStyle = flash ? '#FFFFFF' : '#F8D878'; ctx.fillRect(x, y, 2, 1);
        ctx.fillStyle = '#F8A030'; ctx.fillRect(x, y + 1, 2, 1);
        ctx.fillStyle = '#F87800'; ctx.fillRect(x, y + 2, 2, 2);
        if (((x * 7 + (f >> 3)) % 41) === 0) { ctx.fillStyle = '#F8D878'; ctx.fillRect(x, y - 2 - ((f >> 1) % 3), 2, 2); }
      } else if (kind === 'flood') {
        ctx.fillStyle = flash ? '#F8D8D8' : ((x + (f >> 2)) % 6 < 3 ? '#F8F8F8' : '#C8E8F8'); ctx.fillRect(x, y - 1, 2, 1);
        ctx.fillStyle = '#88C8F8'; ctx.fillRect(x, y, 2, 1);
        ctx.fillStyle = '#3C7CE0'; ctx.fillRect(x, y + 1, 2, 2);
      } else {
        // flames: tongues flickering up from the burning edge
        const n = (Math.imul((x >> 1) + 11, 2654435761) ^ Math.imul((f >> 2) + 3, 40503)) >>> 0, h = 3 + (n % 9) + Math.round(3 * Math.sin(x / 11 + f / 9));
        ctx.fillStyle = '#D82800'; ctx.fillRect(x, y - Math.round(h * 0.5), 2, Math.round(h * 0.5) + 4);
        ctx.fillStyle = '#F87800'; ctx.fillRect(x, y - Math.round(h * 0.8), 2, Math.round(h * 0.3) + 1);
        ctx.fillStyle = flash ? '#FFFFFF' : '#F8D878'; ctx.fillRect(x, y - h, 2, Math.max(1, Math.round(h * 0.2)));
        if (n % 13 === 0) { ctx.fillStyle = 'rgba(40,32,32,0.45)'; ctx.fillRect(x - 2, y - h - 4 - ((f >> 1) % 6), 5, 3); }
      }
    }
    // driftwood on the flood
    if (kind === 'flood') for (let i = 0; i < 3; i++) {
      const bx = Math.round((i * 89 + f * 0.25) % (FW + 20)) - 10, y = top + Math.round(Math.sin((bx + f * 0.7) / 7) * 1.5) - 1;
      ctx.fillStyle = '#5C3410'; ctx.fillRect(bx, y, 7, 2); ctx.fillStyle = '#9C6C30'; ctx.fillRect(bx + 1, y, 5, 1);
    }
  },

  // ------------------------------------------------------------ on the screen (inside the field window)
  crRenderBanner(ctx) {
    const c2 = this.cr2, hz = c2.hz, cam = Math.round(this.camY || 0), f = this.frame;
    // the hazard just below the screen: a warning at the bottom edge
    const d = hz.y - (cam + VIEW_H);
    if (d > -2 && d < 64 && !this.over) {
      // a glowing edge and arrows in the corners; close, its name and how far, blinking, just above the bottom row
      const H = CR_HAZ[hz.kind] || CR_HAZ.lava, near = d < 32, blink = (f >> 3) & 1;
      ctx.fillStyle = near && blink ? 'rgba(248,56,0,0.7)' : 'rgba(216,40,0,0.4)';
      ctx.fillRect(0, VIEW_H - 3, VIEW_W, 3);
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(1, VIEW_H - 13, 22, 9); ctx.fillRect(VIEW_W - 23, VIEW_H - 13, 22, 9);
      Font.draw(ctx, '^' + Math.max(0, Math.ceil(d / 16)), 2, VIEW_H - 12, H.color);
      Font.drawRight(ctx, Math.max(0, Math.ceil(d / 16)) + '^', VIEW_W - 1, VIEW_H - 12, H.color);
      if (near && blink) {
        const text = H.name + ' RISING!';
        ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect((VIEW_W >> 1) - text.length * 4 - 3, VIEW_H - 32, text.length * 8 + 4, 10);
        Font.drawCenter(ctx, text, VIEW_W / 2, VIEW_H - 30, H.color);
      }
    }
    const b = c2.banner;
    if (b && b.t > 0) {
      const y = 70 + (b.t > 165 ? (b.t - 165) * -2 : 0), w = Math.max(b.text.length, (b.sub || '').length) * 8 + 16 + (b.medal ? 14 : 0);
      ctx.fillStyle = 'rgba(0,0,0,0.75)'; ctx.fillRect((VIEW_W - w) >> 1, y - 4, w, b.sub ? 26 : 16);
      if (b.medal) crDrawMedal(ctx, ((VIEW_W - w) >> 1) + 5, y - 1, b.medal - 1, true);
      Font.drawCenter(ctx, b.text, VIEW_W / 2 + (b.medal ? 7 : 0), y, b.color);
      if (b.sub) Font.drawCenter(ctx, b.sub, VIEW_W / 2 + (b.medal ? 7 : 0), y + 11, COL.white);
    }
  },

  // the climb meter in the left border: the combo, then the climb ahead (depots, gates, medals, your best, the hazard)
  crRenderMeter(ctx) {
    const c2 = this.cr2, f = this.frame, x0 = 0, y0 = FY;
    const lv = c2.combo.lv || 1, col = ['#7C7C7C', '#F8B800', (f >> 2) & 1 ? '#F83800' : '#F8D878'][lv - 1];
    Font.draw(ctx, 'X' + lv, x0 + 1, y0 + 1, lv > 1 ? col : '#3C3C3C');
    const bx = x0 + 5, by = y0 + 11, bh = 56;
    ctx.fillStyle = '#1C1C1C'; ctx.fillRect(bx - 1, by - 1, 8, bh + 2);
    ctx.fillStyle = '#383838'; ctx.fillRect(bx, by, 6, bh);
    const fill = Math.round(bh * Math.min(100, c2.combo.v) / 100);
    ctx.fillStyle = col; ctx.fillRect(bx, by + bh - fill, 6, fill);
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(bx, by + bh - fill, 2, fill);
    ctx.fillStyle = '#000000';
    for (const v of [CR_COMBO_X2, CR_COMBO_X3]) ctx.fillRect(bx - 1, by + bh - Math.round(bh * v / 100), 8, 1);
    // the climb ahead: from 20 m below you to 60 m above
    const ly = by + bh + 8, lh = VIEW_H - (ly - y0) - 4, alt = this.corridorClimb(), lo = alt - 20, hi = alt + 60;
    const Y = a => Math.round(ly + lh - (a - lo) / (hi - lo) * lh);
    for (let py = 0; py < lh; py += 2) {
      const a = lo + (lh - py) / lh * (hi - lo);
      ctx.fillStyle = a < 0 ? '#2C2C2C' : crBand(a).color;
      ctx.globalAlpha = 0.55; ctx.fillRect(x0 + 6, ly + py, 4, 2); ctx.globalAlpha = 1;
    }
    ctx.fillStyle = '#1C1C1C'; ctx.fillRect(x0 + 5, ly, 1, lh); ctx.fillRect(x0 + 10, ly, 1, lh);
    // the hazard, rising from the bottom
    const ha = this.crAltY(c2.hz.y);
    if (ha > lo) { const H = CR_HAZ[c2.hz.kind] || CR_HAZ.lava, t = Math.max(ly, Y(Math.min(hi, ha))); ctx.fillStyle = H.color; ctx.fillRect(x0 + 3, t, 10, ly + lh - t); ctx.fillStyle = '#F8D878'; ctx.fillRect(x0 + 3, t, 10, 1); }
    const mark = (a, draw) => { if (a >= lo && a <= hi) draw(Y(a)); };
    // depots and gates ahead (the plan knows them); medals; your best
    const k0 = Math.max(0, Math.floor(lo / 13)), k1 = Math.floor(hi / 13);
    for (let k = k0; k <= k1; k++) {
      if (crDepotAlt(k)) mark(13 * k + 6, y => { ctx.fillStyle = '#F8F8F8'; ctx.fillRect(x0 + 6, y - 3, 4, 7); ctx.fillRect(x0 + 4, y - 1, 8, 3); ctx.fillStyle = '#38B838'; ctx.fillRect(x0 + 7, y - 2, 2, 5); ctx.fillRect(x0 + 5, y, 6, 1); });
      if (crGateNo(k)) mark(13 * k + 12, y => { ctx.fillStyle = '#1C1C1C'; ctx.fillRect(x0 + 3, y - 3, 10, 6); ctx.fillStyle = '#D82800'; ctx.fillRect(x0 + 4, y - 2, 8, 4); ctx.fillStyle = '#1C1C1C'; for (let k2 = 5; k2 < 12; k2 += 2) ctx.fillRect(x0 + k2, y - 2, 1, 4); });
    }
    for (const m of CR_MEDALS) mark(m.at, y => { ctx.fillStyle = m.c[2]; ctx.fillRect(x0 + 5, y - 2, 6, 5); ctx.fillStyle = m.c[1]; ctx.fillRect(x0 + 6, y - 1, 4, 3); ctx.fillStyle = m.c[0]; ctx.fillRect(x0 + 6, y - 1, 1, 1); });
    if (c2.ghost && c2.ghost.alt > 0) mark(c2.ghost.alt, y => { ctx.fillStyle = '#E8E8F8'; ctx.fillRect(x0 + 1, y, 14, 1); ctx.fillRect(x0 + 13, y - 2, 2, 3); });
    // you
    mark(alt, y => { ctx.fillStyle = '#F8D800'; ctx.fillRect(x0 + 1, y - 2, 1, 5); ctx.fillRect(x0 + 2, y - 1, 1, 3); ctx.fillRect(x0 + 3, y, 1, 1); ctx.fillStyle = '#F8F8F8'; ctx.fillRect(x0 + 6, y, 4, 1); });
  },
});

// ------------------------------------------------------------------ hooks into the stage
(() => {
  const P = Stage.prototype;
  const wrap = (name, fn) => { const orig = P[name]; P[name] = function () { return fn.call(this, orig, arguments); }; };

  // a new climb: the run's seed, its sections, the city to start in
  wrap('setupCorridor', function (orig, a) {
    orig.apply(this, a);
    this.cr2 = this.crNew();
    this.cr2.medal0 = STORE.get(MODE_KEY, {}).crMedal || 0;
    this.crBuildWorld();
    this.clearArea(0, FH - 48, FW, 48);   // the runway everyone starts on
    this.origTerrain = this.terrain.slice();
    this.crSetBand(0, true);
  });

  wrap('updateCorridor', function (orig, a) {
    const c2 = this.cr2;
    if (!c2) return orig.apply(this, a);
    // a boss gate shuts the usual arrivals off: the fight brings its own
    if (c2.fight) this.corridor.spawnCd = Math.max(this.corridor.spawnCd, 2);
    orig.apply(this, a);
    if (!this.over) this.crTick();
    if (c2.falls) { for (const q of c2.falls) q.t++; c2.falls = c2.falls.filter(q => q.t < 40); }
    const ps = this.tanks.filter(t => t.isPlayer && !t.ally && t.alive);
    if (ps.length) { const lead = ps.reduce((m, t) => (t.y < m.y ? t : m)); if (this.corridorClimb() <= Math.floor(this.crAltY(lead.y)) + 1) c2.leadX = lead.x; }
  });

  // the world moves down a section: the features with it, a new section planned for the top (not past a shut gate)
  wrap('corridorShift', function (orig, a) {
    const c2 = this.cr2;
    if (!c2) return orig.apply(this, a);
    if (this.crGateHold()) return undefined;
    if (c2.fight && c2.fight.won) this.crEndFight();
    const S = this.sectionPx();
    orig.apply(this, a);
    for (const q of c2.feats) for (const key of ['y', 'y0', 'y1']) if (q[key] !== undefined) q[key] += S;
    c2.feats = c2.feats.filter(q => (q.y0 !== undefined ? q.y0 : q.y) < FH);
    c2.hz.y = Math.min(c2.hz.y + S, FH + 96);
    for (const q of c2.falls || []) q.y += S;
    this.crPlace(crMake(c2.seed, this.corridor.shifts + this.crSections() - 1), 0);
    this.origTerrain = this.terrain.slice();
    // past an opened gate the world moves on two sections in a row: the view never trails more than one behind
    if (this.camY !== undefined) this.camY = Math.min(this.camY, FH - VIEW_H + S);
    return undefined;
  });

  wrap('corridorSpawnPoint', function (orig, a) {
    if (this.cr2 && this.camY !== undefined) return this.crSpawnPoint(a[0]);
    return orig.apply(this, a);
  });

  // convoy tanks keep to the road
  wrap('updateEnemy', function (orig, a) {
    if (a[0].crConvoy) { this.crConvoyAct(a[0]); return undefined; }
    return orig.apply(this, a);
  });

  // the combo multiplies every point
  wrap('addScore', function (orig, a) {
    const c2 = this.corridor && this.cr2;
    if (c2 && c2.combo && c2.combo.lv > 1) return orig.call(this, a[0], a[1] * c2.combo.lv);
    return orig.apply(this, a);
  });

  // losing a tank loses the combo
  wrap('hitPlayer', function (orig, a) {
    const t = a[0], was = t.alive;
    const r = orig.apply(this, a);
    const c2 = this.corridor && this.cr2;
    if (c2 && c2.combo && was && !t.alive && t.isPlayer && !t.ally) {
      if (c2.combo.lv > 1) Sound.play('crComboLost');
      c2.combo.v = 0; c2.combo.lv = 1;
    }
    return r;
  });

  // off a walkway in the sky fortress: a long way down
  wrap('lavaDeath', function (orig, a) {
    const t = a[0];
    if (!this.cr2 || !this.corridor || crBand(this.crBase() - ((t.y + 8) >> 4)).key !== 'sky') return orig.apply(this, a);
    this.popups.push({ x: t.x + 8, y: t.y - 4, text: 'FELL!', label: true, color: '#A8D8F8', t: 0, delay: 0, life: 70 });
    Sound.play('crFall');
    if (t.isPlayer) {
      (this.cr2.falls || (this.cr2.falls = [])).push({ x: t.x, y: t.y, t: 0, dir: t.dir, spec: 'p' + (t.player ? t.player.level : 0), pal: t.player ? Config.playerPal(t.player.i) : 'c_WHITE' });
      t.shield = 0; t.plates = 0;
      if (t.ship) { t.ship = false; if (t.player) t.player.ship = false; }
      this.hitPlayer(t);
    } else this.killEnemy(t, null, false, true);
    return undefined;
  });

  // the wind (gusts, a guster's fan) never blows a tank off the edge or into the lava here
  wrap('shove', function (orig, a) {
    const [t, d] = a;
    if (this.corridor && this.cr2 && this.get((t.x + 8 + DXY[d][0]) >> 2, (t.y + 8 + DXY[d][1]) >> 2) === T_LAVA) return false;
    return orig.apply(this, a);
  });

  // magma crosses lava, but it can't walk on air
  wrap('bioBlocks', function (orig, a) {
    const [t, v] = a;
    if (v === T_LAVA && this.cr2 && this.corridor && !t.isPlayer && crBand(this.crBase() - ((t.y + 8) >> 4)).key === 'sky') return true;
    return orig.apply(this, a);
  });

  // each band's own enemy comes more often than a season's would
  wrap('seasonSwap', function (orig, a) {
    if (this.corridor && this.cr2) return orig.call(this, a[0], Math.max(a[1] || 0, 0.14));
    return orig.apply(this, a);
  });

  // in the dark (a city blackout) lava and fire light up what's just above them
  wrap('bioLights', function (orig, a) {
    orig.apply(this, a);
    const c2 = this.corridor && this.cr2;
    if (!c2 || c2.hz.kind === 'flood' || c2.hz.y > (this.camY || 0) + VIEW_H + 16) return;
    for (let x = 16; x < FW; x += 32) a[0](x, c2.hz.y, 34);
  });

  // the minimap shows the drop as sky, not lava, while you're up in the sky fortress
  wrap('renderMinimap', function (orig, a) {
    const sky = this.corridor && this.cr2 && CR_BANDS[this.cr2.band || 0].key === 'sky', lava = BIO_MINI[T_LAVA];
    if (sky) BIO_MINI[T_LAVA] = [44, 100, 200];
    try { return orig.apply(this, a); } finally { BIO_MINI[T_LAVA] = lava; }
  });

  wrap('buildLayers', function (orig, a) { return this.corridor && this.cr2 ? this.crBuildLayers() : orig.apply(this, a); });
  wrap('redrawCells', function (orig, a) { return this.corridor && this.cr2 ? this.crRedrawCells() : orig.apply(this, a); });
  wrap('groundLayer', function (orig, a) { return this.corridor && this.cr2 ? this.crGround() : orig.apply(this, a); });
  // the lava drawn every frame is only what's on the screen (the volcano's sides run the whole world's height)
  wrap('renderBio', function (orig, a) {
    const L = this.bioL;
    if (!(this.corridor && this.cr2 && L && L.lava.length > 32)) { orig.apply(this, a); if (this.corridor && this.cr2) this.crRenderGround(a[0]); return; }
    const all = L.lava, edges = this.lavaEdges(), y0 = Math.round(this.camY || 0) - 8, y1 = y0 + VIEW_H + 16, ctx = a[0], f = this.frame;
    L.lava = [];
    try { orig.apply(this, a); } finally { L.lava = all; }
    // the lava: a row's run at a time in its texture, then its glowing rim
    const tex = themeTex(this.theme)[(f >> 4) & 1 ? 'lava1' : 'lava0'];
    const pats = this.crLavaPats || (this.crLavaPats = new Map());
    if (!pats.has(tex)) pats.set(tex, ctx.createPattern(tex, 'repeat'));
    ctx.fillStyle = pats.get(tex);
    for (let cy = Math.max(0, y0 >> 2); cy <= y1 >> 2; cy++) { const runs = L.lavaRuns && L.lavaRuns.get(cy); if (runs) for (const [x0, x1] of runs) ctx.fillRect(x0, cy * 4, x1 - x0, 4); }
    const hot = (f >> 3) & 1, E = edges.filter(q => q[1] >= y0 && q[1] < y1);
    ctx.fillStyle = hot ? '#F8B800' : '#F87800';
    for (const q of E) ctx.fillRect(q[0], q[1], q[2], q[3]);
    ctx.fillStyle = hot ? 'rgba(248,88,0,0.6)' : 'rgba(200,40,0,0.45)';
    for (const q of E) ctx.fillRect(q[4], q[5], q[6], q[7]);
    this.crRenderGround(ctx);
  });
  wrap('renderDarkness', function (orig, a) { orig.apply(this, a); if (this.corridor && this.cr2) { this.crRenderTunnels(a[0]); this.crRenderHazard(a[0]); } });
  wrap('renderModeBanner', function (orig, a) { orig.apply(this, a); if (this.corridor && this.cr2) this.crRenderBanner(a[0]); });
  wrap('renderHud', function (orig, a) { orig.apply(this, a); if (this.corridor && this.cr2 && !this.vs) this.crRenderMeter(a[0]); });
})();

// the corridor starts in the city (the curtain says so too)
(() => {
  const orig = stageTheme;
  stageTheme = function (num, opts) {
    const curtain = !opts && typeof Game !== 'undefined' && Game.mode === 'corridor' && Game.state === 'curtain';
    if ((opts && opts.corridor && !opts.theme) || curtain) return CR_BANDS[0].theme;
    return orig(num, opts);
  };
})();

// each band plays its own tune
(() => {
  const want = Music.want;
  Music.want = function (mode, skill, paused) {
    const G = typeof Game !== 'undefined' ? Game : null;
    if (mode === 'corridor' && G && G.state === 'play' && G.stage && G.stage.corridor && G.stage.cr2) mode = G.stage.crSong();
    return want.call(this, mode, skill, paused);
  };
})();

// ------------------------------------------------------------------ hooks into the game and online play
// (main.js and net.js load after this file: these go in once every script has run)
function crHooks() {
  if (crHooks.done || typeof Game === 'undefined' || typeof Net === 'undefined') return;
  crHooks.done = true;
  const G = Game;
  // a gate boss fights in its arena: for it the field ends at the bottom of the top section (bosses.js loads later)
  const updateBosses = Stage.prototype.updateBosses;
  Stage.prototype.updateBosses = function () {
    if (!(this.cr2 && this.cr2.fight && this.bosses.length)) return updateBosses.apply(this, arguments);
    const fh = FH;
    FH = this.sectionPx();
    try { return updateBosses.apply(this, arguments); } finally { FH = fh; }
  };
  // the checkpoint is the last depot reached
  const ckMarkOf = G.ckMarkOf;
  G.ckMarkOf = function (st) { return st.corridor && st.cr2 ? 'd' + st.cr2.ckSec : ckMarkOf.call(this, st); };
  const ckAt = G.ckAt;
  G.ckAt = function (st) {
    if (!(st.corridor && st.cr2)) return ckAt.call(this, st);
    const c = st.corridor;
    return { climbed: st.cr2.ckAlt || 0, lifeAt: c.lifeAt, kinds: c.kinds.slice(), spawned: c.spawned, cr2: st.crCkAt() };
  };
  const ckApply = G.ckApply;
  G.ckApply = function (at) {
    const st = this.stage;
    if (st && st.corridor && st.cr2 && at && (at.cr2 || at.climbed > 0)) { st.crResume(at); return; }
    ckApply.call(this, at);
  };

  // the result: medals won, and where the best run ended (for its ghost)
  const toModeResult = G.toModeResult;
  G.toModeResult = function (done) {
    const st = this.stage, c2 = this.mode === 'corridor' && st && st.cr2;
    toModeResult.call(this, done);
    if (!c2 || !this.modeRes) return;
    const rec = STORE.get(MODE_KEY, {}), r = this.modeRes, m = Math.max(rec.crMedal || 0, crMedalOf(r.dist));
    rec.crMedal = m;
    if (r.newBest && rec.corridor) rec.corridor.gx = c2.leadX === undefined ? -1 : c2.leadX;
    STORE.set(MODE_KEY, rec);
    r.medal = m; r.runMedal = crMedalOf(r.dist); r.newMedal = r.runMedal > (c2.medal0 || 0) ? r.runMedal : 0;
  };
  const renderModeResult = G.renderModeResult;
  G.renderModeResult = function (ctx) {
    renderModeResult.call(this, ctx);
    const r = this.modeRes;
    if (!r || r.mode !== 'corridor') return;
    const x = (SW >> 1) - 46;
    Font.draw(ctx, 'MEDALS', x, 138, COL.lgrey);
    for (let i = 0; i < 3; i++) crDrawMedal(ctx, x + 54 + i * 12, 135, i, i < (r.medal || 0));
    if (r.newMedal && (this.t >> 4) & 1) Font.drawCenter(ctx, 'NEW ' + CR_MEDALS[r.newMedal - 1].name + ' MEDAL!', SW / 2, 166, CR_MEDALS[r.newMedal - 1].c[1]);
  };

  // the title: the medals beside the best climb
  const renderTitle = G.renderTitle;
  G.renderTitle = function (ctx) {
    renderTitle.call(this, ctx);
    const cur = this.titleMenu()[this.menuIdx], rec = STORE.get(MODE_KEY, {});
    if (this.titleY !== 0 || !cur || !cur.mode || modeInfo(Config.get('gameMode')).key !== 'corridor' || !(rec.corridor || rec.crMedal)) return;
    const s = crTitleBest(rec), x = Math.round(SW / 2 - (s.length * 8 - 2) / 2) + (s.length - 4) * 8 + 2;
    for (let i = 0; i < 3; i++) crDrawMedal(ctx, x + i * 10, 211, i, i < (rec.crMedal || 0));
  };

  // online: the hazard, the combo, the features and the band go to the guests
  const stageView = Net.stageView;
  Net.stageView = function (st, full) {
    const v = stageView.call(this, st, full);
    if (st.corridor && st.cr2) v.crx = st.crView();
    return v;
  };
  const applyStage = Net.applyStage;
  Net.applyStage = function (sv) {
    applyStage.call(this, sv);
    const st = Game.stage;
    if (!st) return;
    if (sv.crx) st.applyCrView(sv.crx); else st.cr2 = null;
    if (st.corridor && st.camY !== undefined) st.camY = Math.min(st.camY, FH - VIEW_H + st.sectionPx());
  };
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', crHooks); else setTimeout(crHooks, 0);
