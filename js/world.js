'use strict';
// =====================================================================
//  WORLD (ENDLESS WORLD): a land without end, made as you drive (worldgen.js lays it out)
//    - the field is a window of chunks (3 x 3 on the usual screen) round the team. Cross into the next chunk and
//      the window moves with you: the chunks on the far side drop off (what you did there is kept, as a short list
//      of changes once it's been a while), new ones come in, and everything on the field moves with the land, so
//      the rest of the game never meets an edge
//    - biomes, each with its own look, its twist while you're in it (showers, wildfire, gusts, blizzards, hot
//      spots, mirages, lava bombs, marsh gas, blackouts) and its own enemy among the rest
//    - VILLAGES: most are attacked when you find them: hold off the waves and the village is saved (a tank for
//      everyone, points, supplies) and from then on it's a safe place: you come back there, and the game is saved
//      there. Some are friendly from the start (a gift, and a safe place too). Lose the eagle and the village burns
//    - RUINS: walled compounds with a chest in each room, and guards; some have a vault, and in it a guardian (one of
//      the bosses) and the big treasure
//    - NESTS turn out tanks until destroyed; enemies roam everywhere, more and tougher the further out you are (and
//      the longer you've been out); patrols along the roads
//    - day and night: mostly day (7 minutes a cycle); a short night (a fifth of it) is dark round your lights
//    - the compass in the side panel points to the nearest village or ruin still to visit; the minimap shows what
//      you've seen. The run's record: how far you got from home, and how many villages you saved
// =====================================================================

// the cycle: day until WD_DUSK, a gentle dusk to WD_NIGHT, night to WD_DAWN, then dawn (fractions of WD_DAY)
const WD_DAY = 25200, WD_DUSK = 0.74, WD_NIGHT = 0.8, WD_DAWN = 0.93, WD_DROP_LIFE = 3600, WD_SAFE_R = 144, WD_SIEGE_R = 144, WD_KEEP = 48, WD_RECS = 3000;
// it never runs out of enemies: this one stays in the queue so the stage never counts as clear (and isn't spawned)
const WD_SENTINEL = { type: 0, world: true };
// the guardians a vault may hold (bosses that get about by themselves, away from an arena)
const WD_BOSSES = ['bear', 'harvester', 'scorpion', 'gunship'];
// power-ups that may lie about as supplies, and the rare ones in chests
const WD_SUPPLY = [PU.STAR, PU.HELMET, PU.WEAPON, PU.TURRET, PU.MINES, PU.STAR, PU.HELMET];
const WD_RARE = [PU.GUN, PU.TANK, PU.TURRET, PU.CLAUDE, PU.AIRSTRIKE, PU.SHIP];
const WD_NOTE = 150;
const wdKey = (cx, cy) => cx + ',' + cy;

// how many chunks the window holds across and down for a screen of vc x vr tiles: one more than it needs each way
function wdWindow(vc, vr) {
  const m = v => Math.max(1, Math.ceil((v / 2 + 3) / WD_CH));
  return [2 * m(vc) + 1, 2 * m(vr) + 1];
}

// a new run, or one from a checkpoint
function wdNewRun() { return { seed: 1 + rnd(1e9) }; }

// ------------------------------------------------------------------ the look (textures as pixels, for painting chunks)
const wdColor = hex => { const v = parseInt(hex.slice(1), 16); return (255 << 24 | (v & 255) << 16 | (v >> 8 & 255) << 8 | v >> 16) >>> 0; };
// a house roof from above (16px): its colours change with the land
const WD_HOUSE_ROWS = ['.kkkkkkkkkkkkkk.', 'kRRRRRRRRRRkCCkk', 'krrrrrrrrrrkcckk', 'kRRRRRRRRRRkcckk', 'krrrrrrrrrrrrrrk', 'kRRRRRRRRRRRRRRk',
  'krrrrrrrrrrrrrrk', 'kHHHHHHHHHHHHHHk', 'kkkkkkkkkkkkkkkk', 'kDDDDDDDDDDDDDDk', 'kddddddddddddddk', 'kDDDDDDDDDDDDDDk', 'kddddddddddddddk',
  'kDDDDDDDDDDDDDDk', 'keeeeeeeeeeeeeek', '.kkkkkkkkkkkkkk.'];
const WD_ROOF = {
  spring: ['#E05C1C', '#A83010', '#A02C08', '#701C04', '#F8A070'], summer: ['#E05C1C', '#A83010', '#A02C08', '#701C04', '#F8A070'],
  autumn: ['#B87C3C', '#7C4C1C', '#7C4818', '#4C2C0C', '#E0B078'], winter: ['#F8F8FF', '#B8C8DC', '#B8C4D8', '#8494AC', '#FFFFFF'],
  desert: ['#E8B070', '#B87C3C', '#B88040', '#8C5820', '#F8D8A0'], swamp: ['#8C7C38', '#5C5020', '#5C5020', '#3C3410', '#B8A858'],
  city: ['#9C9CA4', '#6C6C74', '#6C6C74', '#4C4C54', '#C8C8D0'], volcanic: ['#6C4438', '#3C2018', '#4C2C24', '#2C1810', '#9C7464'],
  nuclear: ['#7C7C6C', '#54544C', '#54544C', '#3C3C34', '#A8A898'],
};
// ruin stone: old grey blocks, moss in the joints
const WD_RUIN_ROWS = ['GGGgGGGs', 'GgGGGGgs', 'GGGmGGGs', 'ssssssss', 'GGsGGGGG', 'gGsGGmGg', 'GGsGgGGG', 'ssssssss'];
const wdTexCan = {};
function wdTexCanvas(theme, key) {
  if (key === 'bridge') return Sprites.bridgeTex;
  if (key === 'mud') return Sprites.mudTex;
  if (key === 'house' || key === 'ruin') {
    const k = theme + key;
    if (!wdTexCan[k]) {
      const r = WD_ROOF[theme] || WD_ROOF.spring;
      wdTexCan[k] = key === 'house' ? paintRows(WD_HOUSE_ROWS, { k: '#1C0C04', R: r[0], r: r[1], D: r[2], d: r[3], H: r[4], e: '#140804', c: '#4C4C4C', C: '#8C8C8C' })
        : paintRows(WD_RUIN_ROWS, theme === 'desert' ? { G: '#B89C68', g: '#987C4C', m: '#7C6C3C', s: '#5C4824' } : { G: '#8C8C7C', g: '#6C6C5C', m: '#4C7C3C', s: '#34342C' });
    }
    return wdTexCan[k];
  }
  return themeTex(theme)[key];
}
const wdTexPx = {};
function wdTexOf(theme, key) {
  const T = wdTexPx[theme] || (wdTexPx[theme] = {});
  if (!T[key]) {
    const c = wdTexCanvas(theme, key), d = c.getContext('2d').getImageData(0, 0, c.width, c.height);
    T[key] = { w: c.width, d: new Uint32Array(d.data.buffer) };
  }
  return T[key];
}
// which texture a cell shows (null: none on the layers: water, lava and belts move and are drawn every frame)
function wdKeyOf(v, deco) {
  switch (v) {
    case T_BRICK: return deco === WD_HOUSE ? 'house' : deco === WD_RUIN ? 'ruin' : 'brick';
    case T_STEEL: return 'steel';
    case T_ICE: return 'ice';
    case T_BRIDGE: return 'bridge';
    case T_MUD: return 'mud';
    case T_FOREST: return 'forest';
    case T_REEDS: return 'reeds';
    case T_BOG: case T_GAS: return 'bog';
    case T_VENT: return 'vent';
    case T_LAMP: return 'lamp';
    case T_CRATE: return 'crate';
    default: return BIO_TEX[v] || null;
  }
}
const wdOnForest = v => v === T_FOREST || v === T_REEDS;
const wdCapSolid = v => v === T_BRICK || v === T_STEEL || v === T_FOREST;
const WD_BIOMES_ALL = WD_THEMES.map((t, b) => b);
// the ground of each biome as packed pixels: base, specks, roads, and a few details
const wdGroundCols = {};
function wdGroundOf(b) {
  if (wdGroundCols[b]) return wdGroundCols[b];
  const th = THEMES[WD_THEMES[b]], c = wdColor;
  const road = ['#2E2614', '#20200E', '#33240F', '#566070', '#7C603A', '#2E2420', '#3C2C18', '#1C1C20', '#3A3A2E'][b];
  const det = [['#F878B8', '#F8D838', '#F8F8F8'], ['#1E3A12', '#284A16'], ['#C85010', '#E08020', '#A03008'], ['#8C9CB0', '#B8C8D8'],
    ['#4C3818', '#6C5028'], ['#5C1808', '#A83008'], ['#0A1006', '#2C4018'], ['#18181A', '#3A3A3C'], ['#3C3C30', '#4C4C40']][b];
  return (wdGroundCols[b] = {
    base: c(th.ground), specks: (th.specks || [th.ground]).map(c), det: det.map(c),
    road: c(road), roadEdge: c(['#1A160A', '#10100A', '#1C1408', '#3C4858', '#5C4420', '#140C08', '#24180C', '#141416', '#24241C'][b]),
    pebble: c(['#4C4024', '#34301C', '#4C3818', '#6C7888', '#9C8050', '#443830', '#5C4428', '#2C2C30', '#4C4C40'][b]),
    lane: c(b === WDB.CITY ? '#7C7C6C' : road),
    cobble: c(b === WDB.SNOW ? '#7C8898' : b === WDB.DESERT ? '#A08050' : '#4C4436'), cobLine: c(b === WDB.SNOW ? '#56606E' : b === WDB.DESERT ? '#6C5430' : '#2C261C'),
    flag: c(b === WDB.DESERT ? '#8C7448' : '#3C3C34'), flagLine: c(b === WDB.DESERT ? '#5C4824' : '#24241E'), moss: c('#3C5C28'),
    scorch: c('#140E0C'), ember: c('#7C2408'), ash: c('#3C3430'),
  });
}
// a pixel's own number (the same every time for a place in the world)
const wdPixHash = (x, y) => { let h = Math.imul(x, 0x27d4eb2d) ^ Math.imul(y, 0x165667b1); h = Math.imul(h ^ (h >>> 15), 0x85ebca6b); return (h ^ (h >>> 13)) >>> 0; };

// ------------------------------------------------------------------ sprites of its own
// a chest (16px; the big one in gold), drawn once
const WD_CHEST_ROWS = ['................', '................', '..kkkkkkkkkkkk..', '.kWWWWWWWWWWWWk.', '.kWwwwwwwwwwwWk.', '.kwwwwwwwwwwwwk.',
  '.kGGGGGGGGGGGGk.', '.kkkkkkYYkkkkkk.', '.kWWWWWkYkWWWWk.', '.kwwwwwkkkwwwwk.', '.kwwwwwwwwwwwwk.', '.kGwwwwwwwwwwGk.', '.kGGGGGGGGGGGGk.',
  '..kkkkkkkkkkkk..', '................', '................'];
const wdSpr = {};
function wdChestSprite(big) {
  const k = big ? 'bigChest' : 'chest';
  if (!wdSpr[k]) wdSpr[k] = paintRows(WD_CHEST_ROWS, big ? { k: '#3C2400', W: '#F8F078', w: '#F8B800', G: '#F8F8F8', Y: '#E45C10' } : { k: '#2C1400', W: '#C88848', w: '#8C5418', G: '#F8B800', Y: '#F8F8F8' });
  return wdSpr[k];
}

Object.assign(Stage.prototype, {
  // ------------------------------------------------------------ set-up
  // run: { seed } for a new world, or a checkpoint's world (seed, the safe village it starts at, states, changes, explored ...)
  setupWorld(run) {
    run = run || wdNewRun();
    const NX = COLS / WD_CH, NY = ROWS / WD_CH;
    const W = this.world = {
      seed: run.seed | 0 || 1, NX, NY, ox: 0, oy: 0, chunks: new Map(), feats: new Map(),
      clock: run.clock || Math.round(WD_DAY * 0.04), day: run.day || 1, dist: run.dist || 0, saved: run.saved || 0, looted: run.looted || 0,
      time: run.time || 0, at: Array.isArray(run.at) ? [run.at[0] | 0, run.at[1] | 0] : [0, 0], ckN: 0, spawned: 0, notes: [], featVer: 0,
    };
    this.wdLoadState(run);
    this.noBase = true; this.baseAlive = false; this.big = 'world';
    this.outposts = []; this.factories = []; this.pads = []; this.weather = null;
    this.queue = [WD_SENTINEL]; this.total = 0;
    this.reachApplies = () => false;   // the land itself keeps every place reachable (worldgen.js)
    this.wdDrops = []; this.wdVillages = []; this.wdRuins = []; this.wdChests = []; this.wdSpawnCd = 240;
    const [hx, hy] = W.at;
    W.ox = hx - (NX >> 1); W.oy = hy - (NY >> 1);
    this.wdBuild();
    // everyone starts in the safe village's square (they were put at the usual places before the land was here)
    for (const s of this.spawns) if (s.player) [s.x, s.y] = this.wdHomeSpot(s.player.i);
    this.wdBiome = this.wdBioAt(this.wdHomeSpot(0)[0] + 8, this.wdHomeSpot(0)[1] + 8);
    // every land's textures as pixels now, rather than the first time each one turns up
    for (const th of WD_THEMES) for (const k of ['brick', 'house', 'ruin', 'steel', 'ice', 'bridge', 'mud', 'forest', 'reeds', 'bog', 'vent', 'lamp', 'crate'].concat(Object.values(BIO_TEX))) wdTexOf(th, k);
    this.theme = WD_THEMES[this.wdBiome];
    this.num = 1;
  },

  // the checkpoint's world: what happened to villages, ruins and nests, the land's changes, what you'd seen
  wdLoadState(run) {
    const W = this.world;
    for (const f of Array.isArray(run.feats) ? run.feats : []) if (Array.isArray(f) && f.length >= 3) W.feats.set(wdKey(f[0], f[1]), Object.assign({}, f[2]));
    for (const c of Array.isArray(run.chunks) ? run.chunks : []) if (Array.isArray(c) && typeof c[2] === 'string') this.wdRec(c[0], c[1]).diff = c[2];
    if (typeof run.seen === 'string') for (const p of run.seen.split(';')) { const [a, b] = p.split(',').map(Number); if (isFinite(a) && isFinite(b) && p) this.wdRec(a, b).seen = true; }
  },

  // a chunk's record: { cells (as you left it, for a while), diff (its changes, after that), seen, thumb }
  wdRec(cx, cy) {
    const W = this.world, k = wdKey(cx, cy);
    let r = W.chunks.get(k);
    if (!r) {
      r = { cx, cy, cells: null, diff: '', seen: false, thumb: null, at: this.frame || 0 };
      W.chunks.set(k, r);
      if (W.chunks.size > WD_RECS) this.wdForget();
    }
    return r;
  },

  // too many chunks remembered: the oldest go (their changes and their place on the map with them)
  wdForget() {
    const W = this.world, recs = [...W.chunks.values()].sort((a, b) => a.at - b.at);
    for (const r of recs.slice(0, recs.length - Math.round(WD_RECS * 0.9))) if (!this.wdInWindow(r.cx, r.cy)) W.chunks.delete(wdKey(r.cx, r.cy));
  },

  wdInWindow(cx, cy) { const W = this.world; return cx >= W.ox && cy >= W.oy && cx < W.ox + W.NX && cy < W.oy + W.NY; },

  // a feature's state (made the first time it's asked for)
  wdFeat(cx, cy) {
    const W = this.world, k = wdKey(cx, cy);
    let s = W.feats.get(k);
    if (!s) {
      const f = wdFeatureOf(W.seed, cx, cy);
      if (!f) return null;
      s = f.kind === 'home' ? { s: 'saved' } : f.kind === 'village' ? { s: 'wild' } : f.kind === 'ruin' ? { open: 0, guards: 0, boss: 0 } : { hp: 0, dead: 0 };
      W.feats.set(k, s);
    }
    return s;
  },

  // ------------------------------------------------------------ the window
  wdBuild() {
    const W = this.world;
    if (this.bosses && this.bosses.length) this.wdBossAway();
    this.terrain = new Uint8Array(GW * GH);
    this.origTerrain = new Uint8Array(GW * GH);
    this.wdDeco = new Uint8Array(GW * GH);
    this.wdBio = new Uint8Array((GW >> 1) * (GH >> 1));
    this.wdGnd = new Uint8Array((GW >> 1) * (GH >> 1));
    for (let j = 0; j < W.NY; j++) for (let i = 0; i < W.NX; i++) this.wdPut(i, j);
    this.layerOf = null; this.dirty = true; this.wdPending = new Set(); this.wdPart = new Map();
    this.wdTouched();
    this.wdSync();
  },

  // the terrain changed wholesale: the path finding and the online view start over
  wdTouched() {
    this.terrainVer = (this.terrainVer || 0) + 1;
    this.navCost = {}; this.navBaseF = {}; this.navPlayerF = new Map();
    this.netDiff = []; this.netFull = true;
  },

  // chunk (cx, cy)'s land, as you left it
  wdCellsOf(cx, cy, g) {
    const r = this.world.chunks.get(wdKey(cx, cy));
    if (r && r.cells) return r.cells;
    if (r && r.diff) return wdUndiff(g.cells, r.diff);
    return g.cells;
  },

  // the chunk for window slot (i, j) into the window's arrays (look: only how it looks, for an online guest, whose
  // terrain comes from the host)
  wdPut(i, j, look) {
    const W = this.world, cx = W.ox + i, cy = W.oy + j, g = wdGen(W.seed, cx, cy), C = WD_CC, B = WD_CB, BW = GW >> 1;
    const cur = look ? null : this.wdCellsOf(cx, cy, g);
    for (let y = 0; y < C; y++) {
      const o = (j * C + y) * GW + i * C;
      if (cur) { this.terrain.set(cur.subarray(y * C, y * C + C), o); this.origTerrain.set(g.cells.subarray(y * C, y * C + C), o); }
      this.wdDeco.set(g.deco.subarray(y * C, y * C + C), o);
    }
    for (let y = 0; y < B; y++) {
      const o = (j * B + y) * BW + i * B;
      this.wdBio.set(g.bio.subarray(y * B, y * B + B), o);
      this.wdGnd.set(g.gnd.subarray(y * B, y * B + B), o);
    }
    const r = W.chunks.get(wdKey(cx, cy));
    if (r && !look) { r.cells = null; r.at = this.frame || 0; }   // the window holds it now
  },

  // window slot (i, j) is leaving: keep its land as it is (the oldest kept ones become a list of changes)
  wdTake(i, j) {
    const W = this.world, cx = W.ox + i, cy = W.oy + j, C = WD_CC, cells = new Uint8Array(C * C);
    for (let y = 0; y < C; y++) { const o = (j * C + y) * GW + i * C; cells.set(this.terrain.subarray(o, o + C), y * C); }
    const r = this.wdRec(cx, cy);
    r.cells = cells; r.at = this.frame || 0;
    r.diff = wdDiff(wdGen(W.seed, cx, cy).cells, cells);   // it was just in the window: still built, so this is quick
    const kept = [...W.chunks.values()].filter(q => q.cells && !this.wdInWindow(q.cx, q.cy));
    if (kept.length > WD_KEEP) kept.reduce((a, b) => (a.at <= b.at ? a : b)).cells = null;
  },

  // a slot's land as changes from how it was made (for the checkpoint)
  wdDiffOf(i, j) {
    const W = this.world, C = WD_CC, cells = new Uint8Array(C * C);
    for (let y = 0; y < C; y++) { const o = (j * C + y) * GW + i * C; cells.set(this.terrain.subarray(o, o + C), y * C); }
    return wdDiff(wdGen(W.seed, W.ox + i, W.oy + j).cells, cells);
  },

  // the window moves one chunk (dx or dy is +1 or -1): see the top
  wdShift(dx, dy) {
    const W = this.world, NX = W.NX, NY = W.NY;
    for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) if (i - dx < 0 || j - dy < 0 || i - dx >= NX || j - dy >= NY) this.wdTake(i, j);
    this.wdSlide(dx, dy, false);
    this.wdMoveAll(-dx * WD_PX, -dy * WD_PX);
    this.wdTouched();
    this.wdSync();
    this.bioCards();   // first-meet cards for the new chunks' ground
    W.shifts = (W.shifts || 0) + 1;
  },

  // the window's arrays and layers slide a chunk; the chunks coming in are put in (to be painted soon)
  wdSlide(dx, dy, look) {
    const W = this.world, NX = W.NX, NY = W.NY, C = WD_CC, B = WD_CB;
    const move = (a, w, h, ox, oy) => {
      if (!a) return a;
      const out = new a.constructor(a.length), x0 = Math.max(0, -ox), x1 = Math.min(w, w - ox);
      for (let y = 0; y < h; y++) { const yy = y + oy; if (yy >= 0 && yy < h && x1 > x0) out.set(a.subarray(yy * w + x0 + ox, yy * w + x1 + ox), y * w + x0); }
      return out;
    };
    if (!look) {
      this.terrain = move(this.terrain, GW, GH, dx * C, dy * C);
      this.origTerrain = move(this.origTerrain, GW, GH, dx * C, dy * C);
    }
    this.wdDeco = move(this.wdDeco, GW, GH, dx * C, dy * C);
    this.layerOf = move(this.layerOf, GW, GH, dx * C, dy * C);
    this.wdBio = move(this.wdBio, GW >> 1, GH >> 1, dx * B, dy * B);
    this.wdGnd = move(this.wdGnd, GW >> 1, GH >> 1, dx * B, dy * B);
    W.ox += dx; W.oy += dy;
    // chunks still to be painted move with the rest (how far along each one is, too); the new ones join them
    const pend = new Set(), part = new Map(), was = this.wdPart || new Map();
    for (const s of this.wdPending || []) {
      const i = s % NX - dx, j = ((s / NX) | 0) - dy;
      if (i >= 0 && j >= 0 && i < NX && j < NY) { pend.add(j * NX + i); if (was.has(s)) part.set(j * NX + i, was.get(s)); }
    }
    for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) if (i + dx < 0 || j + dy < 0 || i + dx >= NX || j + dy >= NY) { this.wdPut(i, j, look); pend.add(j * NX + i); part.delete(j * NX + i); }
    this.wdPending = pend; this.wdPart = part;
    this.wdScrollLayers(-dx * WD_PX, -dy * WD_PX);
    this.dirty = true;   // the moving tiles' lists are made again with the next drawing
  },

  // everything on the field moves (dx, dy) pixels with the land; what ends up off it goes
  wdMoveAll(dx, dy) {
    const inF = (x, y, m = 0) => x > -m && y > -m && x < FW + m && y < FH + m;
    const mv = o => { o.x += dx; o.y += dy; return o; };
    for (const t of this.tanks) {
      t.x += dx; t.y += dy;
      if (t.lx !== undefined) { t.lx += dx; t.ly += dy; }
      if (t.hop) t.hop = [t.hop[0] + dx, t.hop[1] + dy, t.hop[2] + dx, t.hop[3] + dy];
      if (t.seen) t.seen = [t.seen[0] + dx, t.seen[1] + dy, t.seen[2]];
      if (t.trail) for (const p of t.trail) { p[0] += dx; p[1] += dy; }
      if (t.segs) for (const p of t.segs) { p[0] += dx; p[1] += dy; }
      if (t.flame) { t.flame.x += dx; t.flame.y += dy; }
    }
    // the enemy left behind is gone; a straggler of yours catches up with the rest
    for (const t of this.tanks) if (!t.isPlayer && t.alive && !inF(t.x + 8, t.y + 8)) t.alive = false;
    this.tanks = this.tanks.filter(t => t.alive);
    for (const b of this.bullets) { mv(b); if (!inF(b.x, b.y)) this.killBullet(b, false); }
    this.bullets = this.bullets.filter(b => b.alive);
    for (const k of ['spawns', 'mines', 'turrets', 'claudes', 'shells', 'fx', 'popups', 'flames', 'wdDrops', 'wrecks', 'zones']) {
      if (!this[k]) continue;
      for (const o of this[k]) mv(o);
      this[k] = this[k].filter(o => inF(o.x, o.y, 8));
    }
    for (const s of this.strikes) mv(s);
    for (const h of this.heals) { h.x1 += dx; h.y1 += dy; h.x2 += dx; h.y2 += dy; }
    for (const q of this.booms || []) { mv(q); if (q.sx !== undefined) { q.sx += dx; q.sy += dy; } }
    this.booms = (this.booms || []).filter(q => inF(q.x, q.y));
    for (const f of this.wfx) { if (f.pts) f.pts = f.pts.map(p => [p[0] + dx, p[1] + dy]); if (f.box) f.box = [f.box[0] + dx, f.box[1] + dy, f.box[2], f.box[3]]; if (f.x !== undefined) mv(f); }
    for (const m of this.wshots) { mv(m); for (const [a, b] of [['x0', 'y0'], ['tx', 'ty']]) if (m[a] !== undefined) { m[a] += dx; m[b] += dy; } }
    this.wshots = this.wshots.filter(m => inF(m.x, m.y));
    if (this.powerup) { mv(this.powerup); if (!inF(this.powerup.x, this.powerup.y)) this.powerup = null; }
    // a guardian moves with the land, and what it's left about (bales, fires, bombs, venom, stings, its next spot)
    for (const b of this.bosses) {
      mv(b);
      for (const k of ['bales', 'fires', 'bombs', 'pools', 'stings']) for (const o of b[k] || []) { mv(o); if (o.x0 !== undefined) { o.x0 += dx; o.y0 += dy; o.tx += dx; o.ty += dy; } }
      if (b.wp) b.wp = [b.wp[0] + dx, b.wp[1] + dy];
    }
    if (this.bosses.some(b => b.alive && !inF(b.x + b.w / 2, b.y + b.h / 2))) this.wdBossAway();
    for (const p of this.puffs || []) mv(p);
    this.beams = []; this.tracks = []; this.dust = [];
    // cells: fires and puddles
    const cell = i => { const x = (i % GW) + dx / 4, y = ((i / GW) | 0) + dy / 4; return x >= 0 && y >= 0 && x < GW && y < GH ? y * GW + x : -1; };
    const fires = new Map();
    for (const [i, f] of this.fires || []) { const n = cell(i); if (n >= 0) fires.set(n, f); }
    this.fires = fires;
    for (const pd of this.puddles || []) pd.cells = pd.cells.map(cell).filter(i => i >= 0);
    if (this.camX !== undefined) { this.camX += dx; this.camY += dy; }
    if (this.wdLast) { this.wdLast[0] += dx; this.wdLast[1] += dy; }
    // a player that's off the field now (left behind on the far side) joins the others
    const ps = this.tanks.filter(t => t.isPlayer && t.alive);
    for (const t of ps) {
      if (t.x >= 0 && t.y >= 0 && t.x <= FW - 16 && t.y <= FH - 16) continue;
      const [cx, cy] = this.wdCenter(), spot = this.wdFreeNear(cx - 8, cy - 8, 96);
      t.x = spot[0]; t.y = spot[1]; t.acc = 0; t.shield = Math.max(t.shield, 60);
      this.addFx(t.x + 8, t.y + 8, [Sprites.sparkle[3], Sprites.sparkle[2], Sprites.sparkle[1], Sprites.sparkle[0]], 6);
    }
  },

  // ------------------------------------------------------------ what's in the window
  // villages, ruins, nests and hot spots in the window, from their states; the eagles under siege are outposts
  // (enemies go for them, bigmap.js) and live nests are factories
  wdSync() {
    const W = this.world;
    this.wdVillages = []; this.wdRuins = []; this.wdChests = []; this.outposts = []; this.zones = [];
    const facs = [];
    for (let j = 0; j < W.NY; j++) for (let i = 0; i < W.NX; i++) {
      const cx = W.ox + i, cy = W.oy + j, g = wdGen(W.seed, cx, cy), f = g.feat, x0 = i * WD_PX, y0 = j * WD_PX;
      for (const z of g.zones) this.zones.push({ x: x0 + z[0], y: y0 + z[1], r: z[2] });
      if (!f) continue;
      const st = this.wdFeat(cx, cy), key = wdKey(cx, cy);
      if (f.kind === 'home' || f.kind === 'village') {
        const v = { key, cx, cy, x: x0 + f.ex, y: y0 + f.ey, f, st, home: f.kind === 'home' };
        this.wdVillages.push(v);
        if (st.s === 'siege') { const o = { x: v.x, y: v.y, alive: true, wd: key }; this.outposts.push(o); v.post = o; if (st.ehp === undefined) st.ehp = 3; }
      } else if (f.kind === 'ruin') {
        const r = { key, cx, cy, x: x0 + 104, y: y0 + 104, x0, y0, f, st };
        this.wdRuins.push(r);
        f.chests.forEach((c, k) => {
          if (st.open & (1 << k)) return;
          if (c.kind === 'big' && st.boss !== 2) return;   // behind the guardian
          this.wdChests.push({ x: x0 + c.x, y: y0 + c.y, kind: c.kind, k, ruin: r });
        });
      } else if (f.kind === 'nest') {
        const old = this.factories.find(q => q.wd === key);
        if (!st.hp) st.hp = FACTORY_HP + Math.min(8, Math.floor(Math.hypot(cx, cy) / 4));
        facs.push(Object.assign(old || { cd: 300, flash: 0 }, { x: x0 + f.x, y: y0 + f.y, hp: st.dead ? 0 : st.hp, wd: key, st }));
      }
    }
    this.factories = facs;
    W.featVer++;
  },

  // ------------------------------------------------------------ places and distances
  wdBioAt(x, y) {
    const bx = Math.max(0, Math.min((GW >> 1) - 1, x >> 3)), by = Math.max(0, Math.min((GH >> 1) - 1, y >> 3));
    return this.wdBio[by * (GW >> 1) + bx];
  },
  // the middle of the team (field pixels); the last one known while everyone's between tanks
  wdCenter() {
    const ps = this.tanks.filter(t => t.isPlayer && t.alive && !t.ally);
    if (ps.length) this.wdLast = [ps.reduce((a, t) => a + t.x + 8, 0) / ps.length, ps.reduce((a, t) => a + t.y + 8, 0) / ps.length];
    return this.wdLast || [FW / 2, FH / 2];
  },
  // field pixels to world tiles from the middle of home (chunk 0, 0)
  wdTiles(x, y) {
    const W = this.world, wx = W.ox * WD_PX + x - 104, wy = W.oy * WD_PX + y - 104;
    return Math.hypot(wx, wy) / 16;
  },
  wdDistNow() { const [x, y] = this.wdCenter(); return this.wdTiles(x, y); },
  // how dangerous it is here: 1 at home, one more every 2 chunks out
  wdTier() { return 1 + Math.floor(this.wdDistNow() / 26); },
  // the screen's window onto the field, where the camera is heading (no smoothing: the game's logic uses it)
  wdView() {
    const [cx, cy] = this.wdCenter();
    return [Math.max(0, Math.min(FW - VIEW_W, cx - VIEW_W / 2)), Math.max(0, Math.min(FH - VIEW_H, cy - VIEW_H / 2))];
  },
  wdNearest(x, y) {
    let d = Infinity;
    for (const t of this.tanks) if (t.isPlayer && t.alive && !t.ally) d = Math.min(d, Math.hypot(t.x + 8 - x, t.y + 8 - y));
    return d;
  },
  // ground a 16px tank can stand on (and nothing standing there)
  wdFree16(x, y, tanksToo = true) {
    if (x < 0 || y < 0 || x > FW - 16 || y > FH - 16) return false;
    for (let cy = y >> 2; cy < (y + 16) >> 2; cy++) for (let cx = x >> 2; cx < (x + 16) >> 2; cx++) {
      const v = this.terrain[cy * GW + cx];
      if (!(v === T_EMPTY || v === T_FOREST || v === T_ICE || v === T_MUD || v === T_BRIDGE || v === T_REEDS || v === T_RUBBLE)) return false;
    }
    if (this.wdVillages.some(v => overlap(x, y, 16, 16, v.x, v.y, 16, 16))) return false;
    if (this.factories.some(f => f.hp > 0 && overlap(x, y, 16, 16, f.x, f.y, 32, 32))) return false;
    if (!tanksToo) return true;
    return !this.tanks.some(t => t.alive && overlap(t.x, t.y, 16, 16, x, y, 16, 16)) && !this.spawns.some(s => overlap(s.x, s.y, 16, 16, x, y, 16, 16));
  },
  // a free spot near (x, y), searching outwards; cleared if there's none
  wdFreeNear(x, y, r = 64) {
    x = Math.round(x / 8) * 8; y = Math.round(y / 8) * 8;
    for (let d = 0; d <= r; d += 8) for (let k = 0; k < Math.max(1, d); k++) {
      const a = k / Math.max(1, d) * Math.PI * 2, sx = Math.round((x + Math.cos(a) * d) / 8) * 8, sy = Math.round((y + Math.sin(a) * d) / 8) * 8;
      if (this.wdFree16(sx, sy)) return [sx, sy];
    }
    x = Math.max(0, Math.min(FW - 16, x)); y = Math.max(0, Math.min(FH - 16, y));
    this.clearArea(x, y, 16, 16);
    return [x, y];
  },
  // where player i starts (or comes back) in a safe village's square
  wdHomeSpot(i, v) {
    const W = this.world;
    v = v || this.wdVillages.find(q => q.cx === W.at[0] && q.cy === W.at[1]) || this.wdVillages.find(q => q.home) || this.wdVillages[0];
    const [x, y] = v ? [v.x, v.y] : [FW / 2 - 8, FH / 2 - 8];
    return [[x - 40, y], [x + 40, y], [x - 40, y + 32], [x + 40, y + 32]][i & 3];
  },

  // a fallen player comes back: in the nearest safe village close by, or near the others
  wdRespawnSpot(p) {
    const [cx, cy] = this.wdCenter(), safe = this.wdVillages.filter(v => v.st.s === 'saved' || v.st.s === 'friend');
    const near = safe.filter(v => Math.hypot(v.x - cx, v.y - cy) < Math.max(VIEW_W, VIEW_H) * 1.2).sort((a, b) => Math.hypot(a.x - cx, a.y - cy) - Math.hypot(b.x - cx, b.y - cy))[0];
    if (near) { const [x, y] = this.wdHomeSpot(p.i, near); return this.wdFreeNear(x, y, 48); }
    const mates = this.tanks.filter(t => t.isPlayer && t.alive && !t.ally);
    return this.wdFreeNear(cx - 8, cy + (mates.length ? 24 : 0) - 8, 96);
  },
});

// the minimap's colours: tiles, roads and squares, and the bare ground of each biome
const WD_MINI = Object.assign({ [T_BRICK]: [168, 72, 16], [T_STEEL]: [180, 180, 188], [T_WATER]: [32, 64, 200], [T_FOREST]: [28, 108, 28], [T_ICE]: [168, 200, 232],
  [T_MUD]: [108, 72, 32], [T_BRIDGE]: [140, 100, 50] }, BIO_MINI);
const WD_MINI_ROAD = [92, 80, 56], WD_MINI_TOWN = [120, 104, 80];
const WD_MINI_GROUND = [[36, 56, 28], [24, 48, 20], [64, 44, 20], [92, 104, 120], [128, 100, 52], [52, 32, 24], [36, 44, 24], [56, 56, 60], [56, 56, 44]];

Object.assign(Stage.prototype, {
  // ------------------------------------------------------------ every frame (the host's game)
  wdTick() {
    const W = this.world;
    W.time++;
    this.wdClock();
    for (const n of W.notes) n.t++;
    W.notes = W.notes.filter(n => n.t < (n.life || WD_NOTE));
    if (this.over) return;
    // the window follows the team (one chunk a frame at most)
    const [cx, cy] = this.wdCenter(), mx = W.NX >> 1, my = W.NY >> 1, H = 32;
    if (this.tanks.some(t => t.isPlayer && t.alive && !t.ally)) {
      if (cx < mx * WD_PX - H) this.wdShift(-1, 0);
      else if (cx > (mx + 1) * WD_PX + H) this.wdShift(1, 0);
      else if (cy < my * WD_PX - H) this.wdShift(0, -1);
      else if (cy > (my + 1) * WD_PX + H) this.wdShift(0, 1);
    }
    this.wdLand();
    const dn = this.wdDistNow();
    this.num = 1 + Math.floor(dn / 26);   // what the rest of the game takes as the stage: how far out you are
    for (const t of this.tanks) if (t.isPlayer && t.alive && !t.ally) W.dist = Math.max(W.dist, Math.floor(this.wdTiles(t.x + 8, t.y + 8)));
    if (W.time % 15 === 0) this.wdExplore();
    this.wdVillageTick();
    this.wdRuinTick();
    this.wdNestTick();
    this.wdDropTick();
    this.wdSpawnTick();
    this.wdDespawn();
    if (W.time % 30 === 1) this.wdCompassFind();
    this.wdPrefetch();
    if (this.wdBossEnd && this.frame >= this.wdBossEnd) { this.wdBossEnd = 0; this.bossDefeated = false; this.bossIdx = undefined; this.bosses = []; }
  },

  // the day: light, then dusk, night and dawn; the day count goes up at sunrise
  wdClock() {
    const W = this.world, p0 = (W.clock % WD_DAY) / WD_DAY;
    W.clock++;
    const p = (W.clock % WD_DAY) / WD_DAY;
    if (p0 < WD_NIGHT && p >= WD_NIGHT) { this.wdNote('NIGHT FALLS', '#7C7CF8'); Sound.play('wdNight'); }
    if (p0 < WD_DAWN && p >= WD_DAWN) { W.day++; this.wdNote('DAY ' + W.day, COL.gold); Sound.play('wdDawn'); }
    this.weather = this.wdDark() > 0.6 ? 'night' : null;
  },
  // how dark it is: 0 by day, 1 at night
  wdDark() {
    const W = this.world;
    if (!W) return 0;
    const p = (W.clock % WD_DAY) / WD_DAY;
    // (a smooth ramp, so dusk and dawn come on gently)
    const e = t => t * t * (3 - 2 * t);
    return p < WD_DUSK ? 0 : p < WD_NIGHT ? e((p - WD_DUSK) / (WD_NIGHT - WD_DUSK)) : p < WD_DAWN ? 1 : e(Math.max(0, 1 - (p - WD_DAWN) / (1 - WD_DAWN)));
  },

  // the land you're in: its look, its twist, its own enemy
  wdLand() {
    const W = this.world, [cx, cy] = this.wdCenter(), b = this.wdBioAt(cx, cy);
    if (b === this.wdBiome) { this.wdBioT = 0; return; }
    if (++this.wdBioT < 90) return;   // well inside it first
    this.wdBioT = 0; this.wdBiome = b;
    const th = WD_THEMES[b], was = this.seasonFx;
    this.theme = th;
    this.seasonFx = Config.on('seasonFx') && SEASON_FX_NAME[th] ? th : null;
    // the last land's weather stays behind
    if (was !== this.seasonFx) {
      if (th !== 'winter') this.blizzard = 0;
      if (th !== 'spring') this.shower = 0;
      if (th !== 'autumn') this.wind = null;
      if (th !== 'city') this.blackout = 0;
      this.seaT = Math.min(this.seaT || 1e9, 900 + rnd(900));
    }
    this.wdNote(WD_BNAME[b], THEMES[th].color || COL.white, this.seasonFx ? SEASON_FX_NAME[th] : '');
    W.biomes = (W.biomes || 0) | (1 << b);
  },

  // a line low on the screen (and a second under it)
  wdNote(text, color, sub) {
    const W = this.world;
    W.notes = W.notes.filter(n => n.text !== text).slice(-2);
    W.notes.push({ text, color, sub: sub || '', t: 0 });
  },

  // the chunks on screen are explored: on the minimap from now on
  wdExplore() {
    const W = this.world, [vx, vy] = this.wdView();
    for (let j = 0; j < W.NY; j++) for (let i = 0; i < W.NX; i++) {
      if (!overlap(vx - 16, vy - 16, VIEW_W + 32, VIEW_H + 32, i * WD_PX, j * WD_PX, WD_PX, WD_PX)) continue;
      const r = this.wdRec(W.ox + i, W.oy + j);
      if (!r.seen) { r.seen = true; W.seenN = (W.seenN || 0) + 1; }
      r.at = this.frame;
      if (!r.thumb || W.time % 120 < 15) r.thumb = this.wdThumb(i, j, r.thumb);
    }
  },

  // a chunk as the minimap shows it: a pixel a tile
  wdThumb(i, j, out) {
    out = out || new Uint8Array(WD_CH * WD_CH * 3);
    const BW = GW >> 1;
    for (let ty = 0; ty < WD_CH; ty++) for (let tx = 0; tx < WD_CH; tx++) {
      const cx = i * WD_CC + tx * 4 + 1, cy = j * WD_CC + ty * 4 + 1, v = this.terrain[cy * GW + cx], o = (ty * WD_CH + tx) * 3;
      let col = WD_MINI[v];
      if (!col) {
        const b = this.wdBio[(cy >> 1) * BW + (cx >> 1)], gd = this.wdGnd[(cy >> 1) * BW + (cx >> 1)];
        col = gd === WG.ROAD ? WD_MINI_ROAD : gd === WG.COBBLE || gd === WG.FLAG ? WD_MINI_TOWN : WD_MINI_GROUND[b];
      }
      out[o] = col[0]; out[o + 1] = col[1]; out[o + 2] = col[2];
    }
    return out;
  },

  // ------------------------------------------------------------ villages
  wdVillageTick() {
    const W = this.world, tier = this.wdTier(), far = Math.max(VIEW_W, VIEW_H) * 1.5;
    for (const v of this.wdVillages) {
      const st = v.st, near = this.wdNearest(v.x + 8, v.y + 8);
      if (st.s === 'wild') {
        if (v.f.siege && near < 9 * 16) {
          // under attack: hold off the waves
          Object.assign(st, { s: 'siege', wave: 1, waves: Math.min(4, 2 + Math.floor(tier / 3)), left: this.wdWaveSize(tier), cd: 90 });
          this.wdNote('VILLAGE UNDER ATTACK!', COL.red, 'DEFEND ITS EAGLE');
          Sound.play('wdAlarm');
          this.wdSync();
          // the first of them are already at its gates
          for (let k = 0; k < 2 && st.left > 0; k++) if (this.wdSiegeTank(v, tier, true)) st.left--;
        } else if (!v.f.siege && near < 4 * 16) {
          // friendly: a gift, and a safe place from now on
          st.s = 'friend';
          W.ckN++; W.safeAt = [v.cx, v.cy];
          this.wdDrop(WD_SUPPLY[rnd(WD_SUPPLY.length)], v.x, v.y - 24);
          this.wdNote('FRIENDLY VILLAGE', '#58D854', 'A SAFE PLACE: GAME SAVED');
          Sound.play('wdSaved');
        }
        continue;
      }
      if (st.s === 'siege') {
        if (near > far) continue;   // nobody's there to fight for it: it holds its breath
        const mine = this.tanks.some(t => t.alive && t.wdSiege === v.key) || this.spawns.some(s => s.enemy && s.enemy.extra && s.enemy.extra.wdSiege === v.key);
        if (st.left > 0) {
          if (--st.cd <= 0 && this.wdSiegeTank(v, tier)) { st.left--; st.cd = Math.max(40, 110 - tier * 6); }
        } else if (!mine) {
          if (st.wave < st.waves) {
            st.wave++; st.left = this.wdWaveSize(tier); st.cd = 200;
            this.wdNote('WAVE ' + st.wave + ' OF ' + st.waves, COL.gold);
          } else this.wdVillageSaved(v, tier);
        }
        continue;
      }
      if (st.s !== 'saved' && st.s !== 'friend') continue;
      if (W.time % 600 === 0) this.wdMend(v);
      // back in a safe village's square: the game is saved here (unless it was the last one saved)
      const at = W.safeAt || W.at;
      if (near < 48 && (at[0] !== v.cx || at[1] !== v.cy)) { W.safeAt = [v.cx, v.cy]; W.ckN++; this.wdNote('GAME SAVED', '#58D854'); }
      // a safe place: nothing hurts you in the square
      for (const t of this.tanks) if (t.isPlayer && t.alive && Math.hypot(t.x - v.x, t.y - v.y) < 40) t.shield = Math.max(t.shield, 20);
    }
  },

  wdWaveSize(tier) { return Math.min(10, 2 + Math.floor(tier / 2) + this.extraPlayers + rnd(2)); },

  // one of the attackers comes in from the wild, out of sight if it can (close: already at the village)
  wdSiegeTank(v, tier, close) {
    const spot = close ? this.wdSpawnSpot(v.x + 8, v.y + 8, 4 * 16, 7 * 16, false)
      : this.wdSpawnSpot(v.x + 8, v.y + 8, 7 * 16, 13 * 16) || this.wdSpawnSpot(v.x + 8, v.y + 8, 5 * 16, 13 * 16, false);
    if (!spot) return false;
    const q = this.wdEnemy(spot[0], spot[1], tier);
    q.ai = Math.random() < 0.65 ? AI.RUSH : AI.HUNT;
    q.extra.wdSiege = v.key;
    this.spawns.push({ x: spot[0], y: spot[1], t: SPARKLE_TIME, enemy: q });
    this.total++;
    return true;
  },

  wdVillageSaved(v, tier) {
    const W = this.world;
    v.st.s = 'saved';
    W.saved++; W.ckN++; W.safeAt = [v.cx, v.cy];
    for (const p of this.players) {
      if (p.out) continue;
      if (!Config.infiniteLives()) p.lives++;
      this.addScore(p, 2000 + 500 * tier);
      this.addXp(p, 60);
    }
    const n = 2 + this.extraPlayers;
    for (let k = 0; k < n; k++) this.wdDrop(Math.random() < 0.15 ? (Math.random() < 0.5 ? PU.TANK : PU.GUN) : WD_SUPPLY[rnd(WD_SUPPLY.length)], v.x - 32 + (k % 3) * 32, v.y + (k < 3 ? -32 : 40));
    this.popups.push({ x: v.x + 8, y: v.y - 12, text: '+1 TANK', label: true, color: COL.gold, t: 0, delay: 0, life: 120 });
    this.wdNote('VILLAGE SAVED!', COL.gold, 'A SAFE PLACE: GAME SAVED');
    Sound.play('wdSaved');
    this.wdSync();
  },

  // the eagle fell: the village burns
  wdVillageLost(v) {
    v.st.s = 'lost';
    const C = WD_CC, i = v.cx - this.world.ox, j = v.cy - this.world.oy;
    for (const [tx, ty] of v.f.houses) for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
      const cx = i * C + tx * 4 + x, cy = j * C + ty * 4 + y;
      if (this.get(cx, cy) === T_BRICK && (x + y + tx) % 3) this.set(cx, cy, T_EMPTY);
      if (this.fires && (x + y) % 2 === 0) this.ignite(cy * GW + cx, true);
    }
    for (let k = 0; k < 5; k++) this.fx.push({ x: v.x + 8 + rnd(48) - 24, y: v.y + 8 + rnd(48) - 24, frames: BIG_EXPLOSION(), per: 5, tick: -k * 8 });
    for (const t of this.tanks) if (t.wdSiege === v.key) { t.ai = AI.HUNT; t.wdSiege = null; }
    this.wdNote('VILLAGE LOST', COL.red, 'IT BURNS');
    Sound.play('wdLost');
    this.wdSync();
  },

  // a safe village puts its eagle's brick ring back (where nothing stands)
  wdMend(v) {
    const bx = v.x >> 3, by = v.y >> 3;
    for (let y = by - 1; y <= by + 2; y++) for (let x = bx - 1; x <= bx + 2; x++) {
      if (x >= bx && x <= bx + 1 && y >= by && y <= by + 1) continue;
      if (this.tanks.some(t => t.alive && overlap(t.x, t.y, 16, 16, x * 8, y * 8, 8, 8))) continue;
      for (let k = 0; k < 4; k++) { const cx = x * 2 + (k & 1), cy = y * 2 + (k >> 1); if (this.get(cx, cy) === T_EMPTY) this.set(cx, cy, T_BRICK); }
    }
  },

  // ------------------------------------------------------------ ruins
  wdRuinTick() {
    const tier = this.wdTier();
    for (const r of this.wdRuins) {
      const st = r.st, near = this.wdNearest(r.x, r.y);
      if (!st.guards && near < 8 * 16) {
        // the guards: tougher than the rest
        st.guards = 1;
        const n = Math.min(6, 2 + Math.floor(tier / 2) + this.extraPlayers);
        for (let k = 0; k < n; k++) {
          const [gx, gy] = r.f.guards[k % 4], spot = this.wdFreeNear(r.x0 + gx - 8 + (k >> 2) * 16, r.y0 + gy - 8, 24);
          const q = this.wdEnemy(spot[0], spot[1], tier + 2);
          q.rank = Math.min(2, (q.rank || 0) + 1); q.ai = AI.HUNT; q.extra.wdGuard = r.key;
          this.spawns.push({ x: spot[0], y: spot[1], t: SPARKLE_TIME + k * 10, enemy: q });
          this.total++;
        }
        this.wdNote('RUIN GUARDS!', '#F87858', r.f.boss >= 0 ? 'SOMETHING STIRS IN THE VAULT' : 'A CHEST IN EVERY ROOM');
      }
      // the guardian wakes when you reach its vault, and goes back in if you run off
      if (r.f.boss >= 0 && st.boss !== 2 && !this.bosses.length && this.wdNearest(r.x0 + 104, r.y0 + 104) < 40) this.wdBossStart(r, tier);
      const b = this.bosses.find(q => q.wdRuin === r.key && q.alive);
      if (b && !this.bossDefeated && this.wdNearest(b.x + b.w / 2, b.y + b.h / 2) > Math.max(VIEW_W, VIEW_H) * 1.6) { this.wdBossAway(); this.wdNote('THE GUARDIAN RETURNS TO ITS VAULT', '#F87858'); }
    }
    // chests: drive over one to open it
    for (const c of this.wdChests.slice()) {
      const t = this.tanks.find(o => o.alive && o.isPlayer && !o.ally && overlap(o.x, o.y, 16, 16, c.x + 2, c.y + 2, 12, 12));
      if (t) this.wdOpenChest(c, t);
    }
  },

  wdOpenChest(c, t) {
    const W = this.world, r = c.ruin, p = t.player, tier = this.wdTier();
    r.st.open |= 1 << c.k;
    this.wdChests = this.wdChests.filter(q => q !== c);
    const ok = i => Config.get('pu' + i) !== 'OFF';
    let kind = c.kind;
    if (kind === 'rare' && !WD_RARE.some(ok)) kind = 'coins';
    if (kind === 'coins') {
      const pts = 1000 + 250 * tier;
      this.addScore(p, pts);
      this.popups.push({ x: c.x + 8, y: c.y, text: 'TREASURE +' + pts, label: true, color: COL.gold, t: 0, delay: 0, life: 90 });
    } else if (kind === 'star') this.applyPowerup(t, { type: PU.STAR, x: c.x, y: c.y });
    else if (kind === 'weapon') this.applyPowerup(t, { type: PU.WEAPON, x: c.x, y: c.y, weapon: this.crateWeapon() });
    else if (kind === 'rare') { const pool = WD_RARE.filter(ok); this.applyPowerup(t, { type: pool[rnd(pool.length)], x: c.x, y: c.y }); }
    else if (kind === 'big') {
      for (const q of this.players) if (!q.out && !Config.infiniteLives()) q.lives++;
      const pts = 5000 + 1000 * tier;
      this.addScore(p, pts);
      this.applyPowerup(t, { type: PU.GUN, x: c.x, y: c.y });
      this.popups.push({ x: c.x + 8, y: c.y - 8, text: 'BIG TREASURE! +' + pts, label: true, color: COL.gold, t: 0, delay: 0, life: 150 });
      this.wdNote('BIG TREASURE!', COL.gold, 'A TANK FOR EVERYONE');
    }
    for (let k = 0; k < 6; k++) this.fx.push({ x: c.x + 8 + rnd(17) - 8, y: c.y + 8 + rnd(17) - 8, frames: [Sprites.sparkle[3], Sprites.sparkle[2], Sprites.sparkle[1], Sprites.sparkle[0]], per: 4, tick: -k * 4 });
    Sound.play('wdChest');
    // the last chest of a ruin: looted
    if (!r.st.done && r.f.chests.every((q, k) => r.st.open & (1 << k))) { r.st.done = 1; W.looted++; }
  },

  // the guardian: one of the bosses, out of its vault (the walls blown open)
  wdBossStart(r, tier) {
    const st = r.st, kind = WD_BOSSES[r.f.boss % WD_BOSSES.length], idx = BOSSES.findIndex(b => b.kind === kind);
    if (idx < 0) { st.boss = 2; this.wdSync(); return; }
    st.boss = 1;
    const max = this.maxEnemies;
    this.initBoss({ idx, loop: Math.min(3, Math.floor(tier / 6)) });
    this.queue = [WD_SENTINEL]; this.total = 0; this.maxEnemies = max;
    const b = this.bosses[0];
    b.x = r.x0 + 88; b.y = r.y0 + 88;
    b.wdRuin = r.key;
    for (let by = 10; by <= 15; by++) for (let bx = 10; bx <= 15; bx++) {
      if (bx > 10 && bx < 15 && by > 10 && by < 15) continue;
      for (let k = 0; k < 4; k++) this.set((r.x0 >> 2) + bx * 2 + (k & 1), (r.y0 >> 2) + by * 2 + (k >> 1), T_EMPTY);
      if ((bx + by) % 2) this.fx.push({ x: r.x0 + bx * 8 + 4, y: r.y0 + by * 8 + 4, frames: BIG_EXPLOSION(), per: 4, tick: -rnd(30) });
    }
    Sound.play('wdVault');
    this.wdNote('THE GUARDIAN WAKES!', COL.red, BOSSES[idx].name);
  },

  // the guardian is left behind (the window moves on): back into its vault, to be fought another time
  wdBossAway() {
    if (!this.bosses.length || this.bossDefeated) return;
    const b = this.mainBoss(), r = b && this.wdRuins.find(q => q.key === b.wdRuin);
    if (r) r.st.boss = 0;
    this.bosses = []; this.bossIdx = undefined; this.beams = [];
  },

  // ------------------------------------------------------------ nests
  wdNestTick() {
    const tier = this.wdTier(), cap = this.wdCap();
    for (const f of this.factories) {
      if (f.hp <= 0) continue;
      if (f.flash > 0) f.flash--;
      if (this.freezeE > 0 || this.wdNearest(f.x + 16, f.y + 16) > Math.max(VIEW_W, VIEW_H) * 1.2 || --f.cd > 0) continue;
      f.cd = Math.round(Math.max(240, 600 - tier * 25) / Config.scale('spawnRate') / Config.skill().spawn);
      const own = this.tanks.filter(t => t.alive && t.wdNest === f.wd).length;
      if (own >= 3 || this.wdFoes() >= cap + 2) continue;
      const x = f.x + 8, y = f.y + 32;
      if (!this.wdFree16(x, y)) continue;
      const q = this.wdEnemy(x, y, tier);
      q.extra.wdNest = f.wd; q.extra.dir = 2;
      this.spawns.push({ x, y, t: SPARKLE_TIME, enemy: q });
      this.total++;
    }
  },

  // ------------------------------------------------------------ supplies on the ground
  wdDrop(type, x, y) {
    if (Config.get('pu' + type) === 'OFF') type = PU.STAR;
    const [sx, sy] = this.wdFreeNear(x, y, 48);
    const d = { type, x: sx, y: sy, t: 0 };
    if (type === PU.WEAPON) d.weapon = this.crateWeapon();
    this.wdDrops.push(d);
    Sound.play('puAppear');
  },
  wdDropTick() {
    for (const d of this.wdDrops) {
      d.t++;
      const t = this.tanks.find(o => o.alive && o.isPlayer && !o.ally && overlap(o.x, o.y, 16, 16, d.x + 2, d.y + 2, 12, 12));
      if (t) { d.gone = true; this.applyPowerup(t, d); }
      else if (d.t >= WD_DROP_LIFE) d.gone = true;
    }
    this.wdDrops = this.wdDrops.filter(d => !d.gone);
  },

  // ------------------------------------------------------------ the enemy
  wdFoes() { return this.tanks.filter(t => !t.isPlayer && t.alive && !t.mirage).length + this.spawns.filter(s => s.enemy).length; },
  // how many may be about at once: more further out and with more of you (the night brings none extra)
  wdCap() {
    const d = Math.min(240, this.wdDistNow());
    return Math.max(1, Math.min(14, Config.get('maxOnScreen') - 2 + Math.floor(d / 40) + this.extraPlayers + Config.skill().maxOn));
  },
  // one enemy for this far out: the corridor's growing mix (corridor.js), and now and then the land's own
  wdEnemy(x, y, tier) {
    const W = this.world, h = (tier - 1) * 18 + (this.wdDistNow() % 26) * 0.7 + W.time / 3600 * 2;
    const q = corridorEnemy(h), th = WD_THEMES[this.wdBioAt(x + 8, y + 8)], own = SEASON_ENEMY[th];
    if (own !== undefined && Config.get('e' + own + 'On') !== 'OFF' && Config.get('newEnemies') !== 'OFF' && Math.random() < 0.16 + Math.min(0.1, tier * 0.01)) q.type = own;
    q.ai = noBasePersonality();
    q.bonus = Config.on('bonusTanks') && W.spawned++ % 7 === 3;
    const [px, py] = this.wdCenter();
    q.extra = { dir: Math.abs(px - x) > Math.abs(py - y) ? (px > x ? 1 : 3) : (py > y ? 2 : 0) };
    return q;
  },

  // a spot for an enemy to come in: between r0 and r1 from (x, y), out of sight (or anywhere: offScreen false),
  // never by a safe village, and somewhere it can get to you from
  wdSpawnSpot(x, y, r0, r1, offScreen = true) {
    const [vx, vy] = this.wdView(), safe = this.wdVillages.filter(v => v.st.s === 'saved' || v.st.s === 'friend');
    const ps = this.tanks.filter(t => t.isPlayer && t.alive && !t.ally);
    for (let k = 0; k < 30; k++) {
      const a = Math.random() * Math.PI * 2, d = r0 + Math.random() * (r1 - r0);
      const sx = Math.round((x + Math.cos(a) * d - 8) / 16) * 16, sy = Math.round((y + Math.sin(a) * d - 8) / 16) * 16;
      if (offScreen && overlap(sx, sy, 16, 16, vx - 12, vy - 12, VIEW_W + 24, VIEW_H + 24)) continue;
      if (!this.wdFree16(sx, sy) || safe.some(v => Math.hypot(v.x - sx, v.y - sy) < WD_SAFE_R)) continue;
      if (ps.some(t => Math.hypot(t.x - sx, t.y - sy) < 64)) continue;
      if (ps.length && !this.wdReach()[(sy >> 3) * (COLS * 2 - 1) + (sx >> 3)]) continue;
      return [sx, sy];
    }
    return null;
  },

  // which tank places can get to one of you (a flood over the path finding's costs, made again now and then)
  wdReach() {
    const c = this.wdReachC;
    if (c && c.ver === this.terrainVer && this.frame - c.at < 60) return c.r;
    const NX = COLS * 2 - 1, NY = ROWS * 2 - 1, cost = this.navCosts(''), r = new Uint8Array(NX * NY), q = [];
    for (const t of this.tanks) {
      if (!t.isPlayer || !t.alive || t.ally) continue;
      const n = Math.min(NY - 1, Math.round(t.y / 8)) * NX + Math.min(NX - 1, Math.round(t.x / 8));
      if (!r[n]) { r[n] = 1; q.push(n); }
    }
    for (let k = 0; k < q.length; k++) {
      const n = q[k], x = n % NX, y = (n / NX) | 0;
      for (const [dx, dy] of DXY) {
        const ux = x + dx, uy = y + dy, u = uy * NX + ux;
        if (ux < 0 || uy < 0 || ux >= NX || uy >= NY || r[u] || cost[u] < 0) continue;
        r[u] = 1; q.push(u);
      }
    }
    this.wdReachC = { r, ver: this.terrainVer, at: this.frame };
    return r;
  },

  // the wild: tanks come in just out of sight, now and then a patrol along a road
  wdSpawnTick() {
    if (this.freezeE > 0 || !this.tanks.some(t => t.isPlayer && t.alive)) return;
    if (--this.wdSpawnCd > 0) return;
    const d = this.wdDistNow();
    this.wdSpawnCd = Math.round(Math.max(50, 260 - d * 0.6) / Config.scale('spawnRate') / Config.skill().spawn);
    // a little peace at home
    if (d < 10 || this.wdFoes() >= this.wdCap()) return;
    const tier = this.wdTier(), [cx, cy] = this.wdCenter(), R = Math.max(VIEW_W, VIEW_H);
    // NIGHTMARE!'s risen tanks (killEnemy puts them in the queue) come back too
    const extra = this.queue.length > 1 ? this.queue.splice(1, 1)[0] : null;
    if (!extra && Math.random() < 0.22 && this.wdPatrol(tier, cx, cy, R)) return;
    const spot = this.wdSpawnSpot(cx, cy, R * 0.6, R * 0.95);
    if (!spot) return;
    const q = this.wdEnemy(spot[0], spot[1], tier);
    if (extra) { q.type = extra.type; q.rank = extra.rank; }
    this.spawns.push({ x: spot[0], y: spot[1], t: SPARKLE_TIME, enemy: q });
    this.total++;
  },

  // two or three tanks in a line along a road, out of sight
  wdPatrol(tier, cx, cy, R) {
    const BW = GW >> 1, [vx, vy] = this.wdView();
    for (let k = 0; k < 20; k++) {
      const a = Math.random() * Math.PI * 2, d = R * (0.6 + Math.random() * 0.35);
      const bx = Math.round((cx + Math.cos(a) * d) / 8), by = Math.round((cy + Math.sin(a) * d) / 8);
      if (bx < 1 || by < 1 || bx >= BW - 8 || by >= (GH >> 1) - 8 || this.wdGnd[by * BW + bx] !== WG.ROAD) continue;
      const horiz = this.wdGnd[by * BW + bx + 2] === WG.ROAD, n = 2 + (tier > 3 ? 1 : 0), spots = [];
      for (let m = 0; m < n; m++) {
        const sx = (bx + (horiz ? m * 3 : 0)) * 8, sy = (by + (horiz ? 0 : m * 3)) * 8;
        if (!this.wdFree16(sx, sy) || overlap(sx, sy, 16, 16, vx - 12, vy - 12, VIEW_W + 24, VIEW_H + 24)) break;
        spots.push([sx, sy]);
      }
      if (spots.length < 2) continue;
      for (const [sx, sy] of spots) {
        const q = this.wdEnemy(sx, sy, tier);
        q.ai = AI.HUNT; q.extra.dir = horiz ? (cx > sx ? 1 : 3) : (cy > sy ? 2 : 0); q.extra.wdPatrol = 1;
        this.spawns.push({ x: sx, y: sy, t: SPARKLE_TIME, enemy: q });
        this.total++;
      }
      return true;
    }
    return false;
  },

  // enemies left far behind wander off (and no longer count); so does one shut in somewhere it can't get out of
  // (walls rebuilt round it), once it's out of sight
  wdDespawn() {
    const R = Math.max(VIEW_W, VIEW_H) * 1.4 + 96, check = this.frame % 60 === 0, [vx, vy] = this.wdView();
    const reach = check && this.tanks.some(t => t.isPlayer && t.alive) ? this.wdReach() : null, NX = COLS * 2 - 1;
    for (const t of this.tanks) {
      if (t.isPlayer || !t.alive || t.mirage) continue;
      if (reach && !t.hover && !t.slither) {
        const n = Math.min(ROWS * 2 - 2, Math.round(t.y / 8)) * NX + Math.min(NX - 1, Math.round(t.x / 8));
        t.wdShut = reach[n] ? 0 : (t.wdShut || 0) + 60;
        if (t.wdShut >= 600 && !overlap(t.x, t.y, 16, 16, vx, vy, VIEW_W, VIEW_H)) { t.alive = false; continue; }
      }
      if (this.wdNearest(t.x + 8, t.y + 8) < R) { t.wdFar = 0; continue; }
      if (++t.wdFar > 240) t.alive = false;
    }
  },

  // ------------------------------------------------------------ the compass
  // the nearest village or ruin still to visit (looked for twice a second, up to 12 chunks out)
  wdCompassFind() {
    const W = this.world, [x, y] = this.wdCenter(), wx = W.ox * WD_PX + x, wy = W.oy * WD_PX + y;
    const ccx = Math.floor(wx / WD_PX), ccy = Math.floor(wy / WD_PX);
    let best = null, bd = Infinity;
    for (let r = 0; r <= 12 && !best; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      const cx = ccx + dx, cy = ccy + dy, f = wdFeatureOf(W.seed, cx, cy);
      if (!f || f.kind === 'nest' || f.kind === 'home') continue;
      const st = W.feats.get(wdKey(cx, cy));
      if (f.kind === 'village' && st && st.s !== 'wild' && st.s !== 'siege') continue;
      if (f.kind === 'ruin' && st && st.done) continue;
      const tx = cx * WD_PX + 104, ty = cy * WD_PX + 104, d = Math.hypot(tx - wx, ty - wy);
      if (d < bd) { bd = d; best = { wx: tx, wy: ty, kind: f.kind, siege: !!(st && st.s === 'siege') }; }
    }
    this.wdCompass = best;
  },

  // build the two rings of chunks round the window ahead of time, a chunk a frame (the next ones to come in, and
  // the ones their ground blends into), so moving on costs little
  wdPrefetch() {
    const W = this.world, w = W.NX + 4, h = W.NY + 4, n = w * h;
    for (let tries = 0; tries < n; tries++) {
      W.pf = ((W.pf || 0) + 1) % n;
      const x = W.pf % w - 2, y = ((W.pf / w) | 0) - 2;
      if (x >= 0 && y >= 0 && x < W.NX && y < W.NY) continue;
      if (wdGenCache.has(W.seed + ':' + (W.ox + x) + ',' + (W.oy + y))) continue;
      wdGen(W.seed, W.ox + x, W.oy + y);
      return;
    }
  },

  // ------------------------------------------------------------ saving
  // the world for a checkpoint: the seed, the safe village to start at, the clock and the records, every
  // village's, ruin's and nest's state, the land's changes and what you've explored (a siege or a guardian in
  // progress starts over)
  wdCheckpoint() {
    const W = this.world, chunks = [];
    for (const r of W.chunks.values()) if (!this.wdInWindow(r.cx, r.cy) && r.diff) chunks.push([r.cx, r.cy, r.diff]);
    for (let j = 0; j < W.NY; j++) for (let i = 0; i < W.NX; i++) { const d = this.wdDiffOf(i, j); if (d) chunks.push([W.ox + i, W.oy + j, d]); }
    const feats = [];
    for (const [k, st] of W.feats) {
      const [a, b] = k.split(',').map(Number), o = Object.assign({}, st);
      if (o.s === 'siege') o.s = 'wild';
      if (o.boss === 1) o.boss = 0;
      if (o.guards && !o.done) o.guards = 0;
      feats.push([a, b, o]);
    }
    const seen = [...W.chunks.values()].filter(r => r.seen).map(r => r.cx + ',' + r.cy).join(';');
    return { seed: W.seed, at: W.safeAt || W.at, clock: W.clock, day: W.day, dist: W.dist, saved: W.saved, looted: W.looted, time: W.time, feats, chunks, seen };
  },

  // ------------------------------------------------------------ online
  // what a guest needs to draw the world (the terrain itself comes as usual)
  wdNetView() {
    const W = this.world, cp = this.wdCompass;
    const v = {
      s: W.seed, n: [W.NX, W.NY], o: [W.ox, W.oy], c: W.clock, d: W.day, di: W.dist, sv: W.saved, lt: W.looted, b: this.wdBiome,
      no: W.notes.slice(-1), dr: this.wdDrops.map(d => [d.type, d.x, d.y, d.t, d.weapon || 0]), ch: this.wdChests.map(c => [c.x, c.y, c.kind === 'big' ? 1 : 0]),
      vl: this.wdVillages.map(q => [q.x, q.y, q.st.s, q.home ? 1 : 0, q.st.wave || 0, q.st.waves || 0, q.cx, q.cy, q.st.ehp || 0]),
      cp: cp ? [cp.wx, cp.wy, cp.kind === 'ruin' ? 1 : 0, cp.siege ? 1 : 0] : null,
    };
    // the states of every place (for the minimap) now and then
    if (W.time % 60 < 2 || W.featVer !== this.wdSentVer) { this.wdSentVer = W.featVer; v.fs = [...W.feats].map(([k, st]) => [k, st.s || '', st.done ? 1 : 0, st.dead ? 1 : 0]); }
    return v;
  },

  // a guest: its own copy of the world's look, kept in step with the host's window
  applyWdView(v) {
    let W = this.world;
    const BN = (GW >> 1) * (GH >> 1);
    if (!W || W.seed !== v.s || W.NX !== v.n[0] || W.NY !== v.n[1] || !this.wdBio || this.wdBio.length !== BN || this.terrain.length !== GW * GH) {
      W = this.world = { client: true, seed: v.s, NX: v.n[0], NY: v.n[1], ox: v.o[0], oy: v.o[1], chunks: new Map(), feats: new Map(), notes: [], time: 0, featVer: 0, at: [0, 0] };
      this.wdDeco = new Uint8Array(GW * GH); this.wdBio = new Uint8Array(BN); this.wdGnd = new Uint8Array(BN);
      for (let j = 0; j < W.NY; j++) for (let i = 0; i < W.NX; i++) this.wdPut(i, j, true);
      this.layerOf = null; this.dirty = true; this.wdPending = new Set(); this.wdPart = new Map();
      this.wdDrops = []; this.wdChests = []; this.wdVillages = [];
    } else if (v.o[0] !== W.ox || v.o[1] !== W.oy) {
      const dx = v.o[0] - W.ox, dy = v.o[1] - W.oy;
      if (Math.abs(dx) + Math.abs(dy) === 1) {
        this.wdSlide(dx, dy, true);
        if (this.camX !== undefined) { this.camX -= dx * WD_PX; this.camY -= dy * WD_PX; }
      } else {
        W.ox = v.o[0]; W.oy = v.o[1];
        for (let j = 0; j < W.NY; j++) for (let i = 0; i < W.NX; i++) this.wdPut(i, j, true);
        this.layerOf = null; this.dirty = true;
      }
    }
    W.time++;
    Object.assign(W, { clock: v.c, day: v.d, dist: v.di, saved: v.sv, looted: v.lt });
    for (const n of v.no) if (!W.notes.some(q => q.text === n.text && q.t <= n.t)) W.notes = [n];
    if (W.notes[0] && W.notes[0].t < (W.notes[0].life || WD_NOTE)) W.notes[0].t++;
    if (v.b !== undefined) this.wdBiome = v.b;
    this.wdDrops = v.dr.map(a => ({ type: a[0], x: a[1], y: a[2], t: a[3], weapon: a[4] || undefined }));
    this.wdChests = v.ch.map(a => ({ x: a[0], y: a[1], kind: a[2] ? 'big' : 'chest' }));
    this.wdVillages = v.vl.map(a => {
      const g = wdGen(W.seed, a[6], a[7]);
      return { x: a[0], y: a[1], st: { s: a[2], wave: a[4], waves: a[5], ehp: a[8] }, home: !!a[3], cx: a[6], cy: a[7], f: g.feat || { houses: [] } };
    });
    this.wdCompass = v.cp ? { wx: v.cp[0], wy: v.cp[1], kind: v.cp[2] ? 'ruin' : 'village', siege: !!v.cp[3] } : null;
    if (v.fs) { W.feats = new Map(v.fs.map(a => [a[0], { s: a[1] || undefined, done: a[2], dead: a[3] }])); W.featVer++; }
    if (W.time % 15 === 0) this.wdExplore();
  },
});

// ------------------------------------------------------------------ the music: WIDE FRONT suits a long way out
SONGS.world = SONGS.bigmaps;
ROCK_ALIAS.world = 'bigmaps';

// ------------------------------------------------------------------ hooks into the stage and the game
(() => {
  const P = Stage.prototype;
  const W = st => st.world && !st.world.client;   // the host's world (or a game on its own)

  // the land is laid when the stage is built (before the season: it's the land that says what season it is)
  const setupSeason = P.setupSeason;
  P.setupSeason = function (opts) {
    if (opts.world) this.setupWorld(Game.wdRun || (Game.wdSeed ? { seed: Game.wdSeed } : null));   // wdSeed: a world picked by hand (tests)
    setupSeason.call(this, opts);
  };

  const update = P.update;
  P.update = function () {
    update.call(this);
    if (W(this)) this.wdTick();
  };
  // its enemies come their own way (wdSpawnTick)
  const spawning = P.updateSpawning;
  P.updateSpawning = function () { if (!this.world) spawning.call(this); };
  const spawnPlayer = P.spawnPlayer;
  P.spawnPlayer = function (p, delay) {
    if (!W(this)) return spawnPlayer.call(this, p, delay);
    const [x, y] = this.wdRespawnSpot(p);
    this.spawns.push({ x, y, t: SPARKLE_TIME + delay, player: p });
  };
  // nests turn out tanks in wdNestTick
  const bigUpdate = P.updateBigMap;
  P.updateBigMap = function () { if (!this.world) bigUpdate.call(this); };

  // a village's eagle stands in the way, and stops shells (only the enemy's harm the one under siege)
  const canStep = P.canStep;
  P.canStep = function (t, d) {
    if (!canStep.call(this, t, d)) return false;
    if (!this.world) return true;
    const nx = t.x + DXY[d][0], ny = t.y + DXY[d][1];
    return !this.wdVillages.some(v => v.st.s !== 'lost' && v.st.s !== 'siege' && overlap(nx, ny, 16, 16, v.x, v.y, 16, 16));
  };
  const bulletBig = P.bulletBigMap;
  P.bulletBigMap = function (b) {
    if (bulletBig.call(this, b)) return true;
    if (!this.world) return false;
    const v = this.wdVillages.find(q => q.st.s !== 'lost' && q.st.s !== 'siege' && overlap(b.x, b.y, 4, 4, q.x, q.y, 16, 16));
    if (!v) return false;
    this.killBullet(b, true);
    return true;
  };
  const outpostDown = P.outpostDown;
  P.outpostDown = function (o) {
    if (!W(this)) return outpostDown.call(this, o);
    const v = this.wdVillages.find(q => q.key === o.wd);
    // a village's eagle takes three hits (the villagers patch it up between them)
    if (v && v.st.ehp > 1) {
      v.st.ehp--; v.st.hitT = 20;
      this.addFx(o.x + 8, o.y + 8, [Sprites.smallExp[0], Sprites.smallExp[1]], 4);
      Sound.play('armor');
      this.popups.push({ x: o.x + 8, y: o.y - 8, text: 'VILLAGE HIT', label: true, color: COL.red, t: 0, delay: 0, life: 50 });
      return;
    }
    o.alive = false;
    AutoSkill.event('eagleHit');
    this.navBaseF = {};
    this.addFx(o.x + 8, o.y + 8, BIG_EXPLOSION(), 6);
    Sound.play('baseDie');
    if (v) this.wdVillageLost(v);
  };
  // a nest's damage is remembered; destroyed, it leaves supplies
  const hitFactory = P.hitFactory;
  P.hitFactory = function (f, dmg, by) {
    hitFactory.call(this, f, dmg, by);
    if (!W(this) || !f.st) return;
    f.st.hp = Math.max(0, f.hp);
    if (f.hp <= 0 && !f.st.dead) {
      f.st.dead = 1;
      this.wdDrop(WD_SUPPLY[rnd(WD_SUPPLY.length)], f.x + 8, f.y + 36);
      this.wdNote('NEST DESTROYED', COL.gold);
    }
  };

  // the guardian beaten: the vault's treasure shows; the victory tune for a while, then the land's again
  const killBoss = P.killBoss;
  P.killBoss = function (bo) {
    killBoss.call(this, bo);
    if (!W(this)) return;
    this.queue = [WD_SENTINEL];
    const r = this.wdRuins.find(q => q.key === bo.wdRuin) || this.wdRuins.find(q => q.f.boss >= 0 && q.st.boss === 1);
    if (r) r.st.boss = 2;
    this.wdSync();
    this.wdBossEnd = this.frame + 480;
    this.wdNote('THE GUARDIAN FALLS!', COL.gold, 'ITS TREASURE IS YOURS');
  };
  // the guardian's escorts come out of the ground round it, not at the top of the field
  const summonEscort = P.summonEscort;
  P.summonEscort = function (type) {
    if (!W(this)) return summonEscort.call(this, type);
    const b = this.mainBoss();
    if (b) this.summonAt(type, b.x + b.w / 2, b.y + b.h + 16);
  };
  // no eagle to make for (only a village under attack): wanderers drift towards you instead of the field's bottom
  const baseTarget = P.baseTarget;
  P.baseTarget = function (t) {
    if (!this.world || this.baseGoals().length) return baseTarget.call(this, t);
    const [x, y] = this.wdCenter();
    return { x: x - 8, y: y - 8 };
  };
  // a power-up turns up near you (not somewhere in a window three screens wide)
  const spawnPowerup = P.spawnPowerup;
  P.spawnPowerup = function (only) {
    spawnPowerup.call(this, only);
    if (!W(this) || !this.powerup) return;
    const [vx, vy] = this.wdView();
    for (let k = 0; k < 40; k++) {
      const x = vx + 8 + rnd(Math.max(1, (VIEW_W - 32) / 8)) * 8, y = vy + 8 + rnd(Math.max(1, (VIEW_H - 32) / 8)) * 8;
      if (this.wdFree16(x, y, false)) { this.powerup.x = x; this.powerup.y = y; break; }
    }
  };
  // the camera holds still while everyone's between tanks
  const camera = P.camera;
  P.camera = function () {
    if (this.world && this.camX !== undefined && !this.tanks.some(t => t.isPlayer && !t.ally && t.alive)) return [Math.round(this.camX), Math.round(this.camY)];
    return camera.call(this);
  };

  // the path finding over a window this big: the same search, on a heap that doesn't allocate, and only as far as
  // an enemy that matters could be (further off they drive about as tanks did in the original)
  const navField = P.navField, HP = { p: new Float64Array(4096), n: new Int32Array(4096) };
  P.navField = function (seeds, mode = '') {
    if (!this.world) return navField.call(this, seeds, mode);
    const NX = COLS * 2 - 1, cost = this.navCosts(mode), N = cost.length, dist = new Float64Array(N).fill(Infinity), LIM = 140;
    if (HP.p.length < N * 4 + 16) { HP.p = new Float64Array(N * 4 + 16); HP.n = new Int32Array(N * 4 + 16); }
    const hp = HP.p, hn = HP.n;
    let size = 0;
    const push = (p, n) => {
      let i = size++;
      while (i > 0) { const j = (i - 1) >> 1; if (hp[j] <= p) break; hp[i] = hp[j]; hn[i] = hn[j]; i = j; }
      hp[i] = p; hn[i] = n;
    };
    for (const n of seeds) if (n >= 0 && n < N) { dist[n] = 0; push(0, n); }
    while (size) {
      const d = hp[0], v = hn[0], lp = hp[--size], ln = hn[size];
      let i = 0;
      for (;;) {
        const l = i * 2 + 1, r = l + 1;
        if (l >= size) break;
        const m = r < size && hp[r] < hp[l] ? r : l;
        if (hp[m] >= lp) break;
        hp[i] = hp[m]; hn[i] = hn[m]; i = m;
      }
      if (size) { hp[i] = lp; hn[i] = ln; }
      if (d > dist[v]) continue;
      if (d > LIM) break;
      const vx = v % NX, vy = (v / NX) | 0, step = Math.max(1, cost[v]);
      for (let k = 0; k < 4; k++) {
        const ux = vx + DXY[k][0], uy = vy + DXY[k][1];
        if (ux < 0 || uy < 0 || ux >= NX || uy * NX >= N) continue;
        const u = uy * NX + ux;
        if (cost[u] < 0) continue;
        const nd = d + step;
        if (nd < dist[u]) { dist[u] = nd; if (size >= hp.length) break; push(nd, u); }
      }
    }
    return dist;
  };

  // ------------------------------------------------------------ drawing
  const render = P.render;
  P.render = function (ctx) {
    if (!this.world || !this.wdBio) return render.call(this, ctx);
    if (this.dirty || !this.bgLayer) this.wdLayers();
    else if (this.dirtyCells && this.dirtyCells.length) this.wdRedraw();
    this.wdPaintSome(1);
    const all = this.bioL, cam = this.camX === undefined ? [0, 0] : [Math.round(this.camX), Math.round(this.camY)];
    this.bioL = this.wdCulled(cam[0], cam[1]);
    try { render.call(this, ctx); } finally { this.bioL = all; }
  };
  const buildLayers = P.buildLayers;
  P.buildLayers = function () { if (this.world && this.wdBio) this.wdLayers(); else buildLayers.call(this); };
  const redrawCells = P.redrawCells;
  P.redrawCells = function () { if (this.world && this.wdBio) this.wdRedraw(); else redrawCells.call(this); };
  const groundLayer = P.groundLayer;
  P.groundLayer = function () { return this.world && this.wdGround ? this.wdGround : groundLayer.call(this); };
  const renderBelts = P.renderBelts;
  P.renderBelts = function (ctx) { if (this.world) this.wdWater(ctx); renderBelts.call(this, ctx); };
  const renderSecrets = P.renderSecrets;
  P.renderSecrets = function (ctx) { renderSecrets.call(this, ctx); if (this.world) this.wdRenderObjects(ctx); };
  const renderDarkness = P.renderDarkness;
  P.renderDarkness = function (ctx) {
    if (!this.world) return renderDarkness.call(this, ctx);
    this.wdDarkness(ctx, Math.round(this.camX || 0), Math.round(this.camY || 0));
  };
  const renderMinimap = P.renderMinimap;
  P.renderMinimap = function (ctx, camX, camY) { if (this.world) this.wdMinimap(ctx, camX, camY); else renderMinimap.call(this, ctx, camX, camY); };
  // the side panel as usual (no queue of tanks: it never ends), with the compass, the day and the villages
  const renderHud = P.renderHud;
  P.renderHud = function (ctx) {
    if (!this.world) return renderHud.call(this, ctx);
    const q = this.queue;
    this.queue = [];
    renderHud.call(this, ctx);
    this.queue = q;
    this.wdRenderHud(ctx, HUD_X);
  };
  const objLine = P.renderObjectiveLine;
  P.renderObjectiveLine = function (ctx) { if (this.world) this.wdLine(ctx); else objLine.call(this, ctx); };
  const banner = P.renderModeBanner;
  P.renderModeBanner = function (ctx) { banner.call(this, ctx); if (this.world) this.wdBanner(ctx); };

  // ------------------------------------------------------------ the game around it
  const G = Game;
  // a checkpoint at every safe village (and the run's start)
  const ckMarkOf = G.ckMarkOf;
  G.ckMarkOf = function (st) { return st.world && !st.world.client ? 'k' + st.world.ckN : ckMarkOf.call(this, st); };
  const ckAt = G.ckAt;
  G.ckAt = function (st) { return st.world && !st.world.client ? { wd: st.wdCheckpoint() } : ckAt.call(this, st); };
  const ckApply = G.ckApply;
  G.ckApply = function (at) { if (this.stage && this.stage.world) return; ckApply.call(this, at); };   // setupWorld took it all
  // RESTART ROUND goes back to the last safe village too
  const ckPoll = G.ckPoll;
  G.ckPoll = function () {
    const before = this.ck;
    ckPoll.call(this);
    if (this.mode === 'world' && this.ck && this.ck !== before && this.roundSave) {
      this.roundSave.players = JSON.parse(JSON.stringify(this.ck.players));
      this.roundSave.resume = this.ck.at;
    }
  };
  // a new run's first checkpoint (taken before the world was made) gets the world, so a reload brings back the same one
  const beginStage = G.beginStage;
  G.beginStage = function () {
    beginStage.apply(this, arguments);
    const st = this.stage;
    if (this.mode !== 'world' || !st || !st.world) return;
    const at = this.ckAt(st);
    if (this.roundSave && !(this.roundSave.resume && this.roundSave.resume.wd)) this.roundSave.resume = at;
    if (this.ck && !(this.ck.at && this.ck.at.wd)) { this.ck.at = at; this.autoSave(); }
  };
  // the run's record: how far from home, then villages saved, then the score
  const toModeResult = G.toModeResult;
  G.toModeResult = function (done) {
    if (this.mode !== 'world' || !this.stage || !this.stage.world) return toModeResult.call(this, done);
    const rec = STORE.get(MODE_KEY, {}), score = this.players.reduce((a, p) => a + p.score, 0), W = this.stage.world;
    const res = { mode: 'world', done, score, newBest: false, dist: W.dist, villages: W.saved, looted: W.looted, days: W.day };
    const b = rec.world, better = !b || res.dist > b.dist || (res.dist === b.dist && (res.villages > b.villages || (res.villages === b.villages && score > b.score)));
    if (better) { rec.world = { dist: res.dist, villages: res.villages, score }; res.newBest = true; }
    res.best = rec.world;
    STORE.set(MODE_KEY, rec);
    this.modeRes = res;
    Sound.setEngine(0);
    Sound.play(res.newBest ? 'bonus' : 'gameover');
    this.setState('modeResult');
  };
  const renderModeResult = G.renderModeResult;
  G.renderModeResult = function (ctx) {
    const r = this.modeRes;
    if (!r || r.mode !== 'world') return renderModeResult.call(this, ctx);
    ctx.fillStyle = COL.black;
    ctx.fillRect(0, 0, SW, SH);
    Font.drawCenter(ctx, modeInfo('world').name, SW / 2, 40, COL.red);
    Font.drawCenter(ctx, 'YOU GOT ' + r.dist + ' M FROM HOME', SW / 2, 74, COL.white);
    Font.drawCenter(ctx, 'VILLAGES SAVED ' + r.villages + '  RUINS ' + (r.looted || 0), SW / 2, 88, COL.white);
    Font.drawCenter(ctx, 'DAY ' + r.days + '  SCORE ' + r.score, SW / 2, 102, COL.white);
    Font.drawCenter(ctx, 'BEST: ' + r.best.dist + ' M  ' + r.best.villages + ' VILLAGES  ' + r.best.score, SW / 2, 124, COL.lgrey);
    if (r.newBest && (this.t >> 4) & 1) Font.drawCenter(ctx, 'NEW BEST!', SW / 2, 150, COL.gold);
    if (this.t > 60) Font.drawCenter(ctx, 'PRESS ENTER', SW / 2, 196, COL.lgrey);
  };
  // the first curtain: where you start
  const renderCurtain = G.renderCurtain;
  G.renderCurtain = function (ctx) {
    renderCurtain.call(this, ctx);
    if (this.mode === 'world' && this.curtain && this.curtain.phase === 'show') Font.drawCenter(ctx, 'FIND THE VILLAGES', SCREEN_W / 2, SCREEN_H / 2 + 14, '#A00000');
  };

  // ------------------------------------------------------------ online
  const stageView = Net.stageView;
  Net.stageView = function (st, full) {
    const v = stageView.call(this, st, full);
    if (W(st)) v.wdx = st.wdNetView();
    return v;
  };
  const applyStage = Net.applyStage;
  Net.applyStage = function (sv) {
    applyStage.call(this, sv);
    const st = Game.stage;
    if (!st) return;
    if (sv.wdx) st.applyWdView(sv.wdx);
    else if (st.world) { st.world = null; st.wdBio = null; st.dirty = true; }
  };
})();
