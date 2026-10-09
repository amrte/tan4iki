'use strict';
// =====================================================================
//  Construction, part two: what a custom level can have beyond its tiles and season, and how it plays.
//    MARKERS (a page of the map in editor.js): the eagle anywhere (its brick fortress moves with it), players I-IV's
//    starts, up to 8 enemy entry points (used in turn), up to 12 power-up spots and where the boss starts.
//    LEVEL: the size (13 x 13 up to 40 x 30 tiles; the screen scrolls), season, weather, no eagle at all (the enemy
//    hunts you then), the goal (destroy them all, or hold out till the time is up), a time limit, lives.
//    ENEMIES: the line-up (groups of a type with a count, a rank, hits and speed; in turn or mixed), how many at once
//    and how often, a boss and its HP. POWER-UPS: which ones may appear, and timed drops.
//    A level without any of this is an old one and plays exactly as before: 13 x 13, the classic markers.
// =====================================================================

// What a level may hold besides blocks and theme (all optional; any one of them makes it a level of the new kind):
//   w, h          size in 16px tiles (blocks: h * 2 rows of w * 2)
//   eagle         [tx, ty]; noEagle: true for none
//   starts        [[tx, ty] x 4] players I-IV
//   entries       [[tx, ty], ...] enemy entry points; spots: power-up spots; bossAt: [tx, ty]
//   lineup        [{ type, n, rank, hits, speed }] (none: the stage's usual tanks); order: 'turn' (none: mixed)
//   boss, bossHp  an index into BOSSES and its HP in %
//   pu            the power-ups allowed (none: as in the settings); drops: one every so many seconds
//   weather       'clear', 'night' or 'fog'; goal: 'hold'; time (minutes); lives; maxOn; every (seconds)
const CL_KEYS = ['w', 'h', 'eagle', 'noEagle', 'starts', 'entries', 'spots', 'bossAt', 'lineup', 'order', 'boss', 'bossHp',
  'pu', 'drops', 'weather', 'goal', 'time', 'lives', 'maxOn', 'every'];
const CL_SIZE = { w: [13, 40], h: [13, 30] }, CL_ENTRIES = 8, CL_SPOTS = 12, CL_GROUPS = 10, CL_GROUP_MAX = 50;
const CL_RANKS = ['NRM', 'VET', 'ELI'];
const CL_WEATHER = [null, 'clear', 'night', 'fog'];
const CL_EVERY = [0, 0.5, 1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];
const CL_DROPS = [0, 10, 15, 20, 30, 45, 60, 90];
const CL_SPEEDS = [50, 60, 75, 90, 100, 110, 125, 150, 175, 200];
const CL_BOSS_HP = [25, 50, 75, 100, 125, 150, 200, 250, 300, 400, 500];
// a custom line-up starts as the first stage's
const CL_LINEUP0 = [{ type: 0, n: 10 }, { type: 1, n: 4 }, { type: 2, n: 3 }, { type: 3, n: 3 }];
// the editor's pages
const CL_PAGES = ['map', 'marks', 'level', 'foes', 'pu'];
const CL_PAGE_NAMES = { map: 'TERRAIN', marks: 'MARKERS', level: 'LEVEL', foes: 'ENEMIES', pu: 'POWER-UPS' };
const CL_PAGE_TAGS = { map: 'MAP', marks: 'MRK', level: 'LVL', foes: 'ENM', pu: 'PWR' };
// the markers palette
const ED_MARKS = [
  { key: 'eagle', name: 'EAGLE' }, { key: 0, name: 'START I' }, { key: 1, name: 'START II' }, { key: 2, name: 'START III' },
  { key: 3, name: 'START IV' }, { key: 'entry', name: 'ENTRY' }, { key: 'spot', name: 'POWER-UP' }, { key: 'boss', name: 'BOSS' },
  { key: 'erase', name: 'ERASE' },
];
const ED_MENU_TOP = 20, ED_MENU_STEP = 12, ED_TAB_STEP = 12;
const edMenuRows = () => Math.floor((VIEW_H - ED_MENU_TOP - 4) / ED_MENU_STEP);

// line-up types: every enemy but a splitter's halves; bosses: all but the secret one
const clTypes = () => ENEMY.map((e, i) => i).filter(i => !ENEMY[i].mini);
const clBosses = () => BOSSES.map((b, i) => i).filter(i => BOSSES[i].kind !== 'galya');
const clPowerups = () => POWERUPS.map((p, i) => i).filter(i => POWERUPS[i].weight > 0);
const clShortName = t => ({ 'ROCKET TRUCK': 'R.TRUCK' })[ENEMY[t].name] || ENEMY[t].name.slice(0, 8);
const clThemeName = th => (th === 'auto' ? 'ANY' : th === 'classic' ? 'CLASSIC' : (THEMES[th] && THEMES[th].name) || EDIT_THEME_TAGS[th]);
// a value one step along a list (round the ends)
const clStep = (list, v, d) => list[(Math.max(0, list.indexOf(v)) + d + list.length) % list.length];
const clClamp = (v, a, b) => Math.max(a, Math.min(b, v));

// does a level use any of the new fields?
function clCustomized(lv) { return !!lv && CL_KEYS.some(k => lv[k] !== undefined); }

// are a level's blocks the size it says? (a level that isn't goes back to blank)
function clFits(l) {
  const w = l.w === undefined ? 13 : l.w, h = l.h === undefined ? 13 : l.h;
  return Number.isInteger(w) && Number.isInteger(h) && w >= CL_SIZE.w[0] && w <= CL_SIZE.w[1] && h >= CL_SIZE.h[0] && h <= CL_SIZE.h[1]
    && Array.isArray(l.blocks) && l.blocks.length === h * 2 && l.blocks.every(r => typeof r === 'string' && r.length === w * 2);
}

// everything about a level, with the usual values where it has none (an old level: the classic 13 x 13 markers)
function clResolve(lv) {
  const w = lv.w || 13, h = lv.h || 13, ex = Math.floor(w / 2);
  const tile = p => Array.isArray(p) && Number.isInteger(p[0]) && Number.isInteger(p[1]) && p[0] >= 0 && p[1] >= 0 && p[0] < w && p[1] < h;
  const tiles = (a, max) => (Array.isArray(a) ? a.filter(tile).slice(0, max).map(p => [p[0], p[1]]) : []);
  const home = tile(lv.eagle) ? [lv.eagle[0], lv.eagle[1]] : [ex, h - 1];
  const starts = [[ex - 2, h - 1], [ex + 2, h - 1], [0, h - 1], [w - 1, h - 1]].map((d, i) => (Array.isArray(lv.starts) && tile(lv.starts[i]) ? [lv.starts[i][0], lv.starts[i][1]] : d));
  const entries = tiles(lv.entries, CL_ENTRIES), types = clTypes();
  const lineup = (Array.isArray(lv.lineup) ? lv.lineup : []).filter(g => g && types.includes(g.type) && g.n >= 1).slice(0, CL_GROUPS).map(g => ({
    type: g.type, n: Math.min(CL_GROUP_MAX, g.n | 0), rank: clClamp(g.rank | 0, 0, 2), hits: clClamp(g.hits | 0, 0, 20),
    speed: CL_SPEEDS.includes(g.speed) ? g.speed : 100,
  }));
  const goal = lv.goal === 'hold' ? 'hold' : 'all';
  return {
    w, h, home, eagle: lv.noEagle ? null : home, starts,
    entries: entries.length ? entries : [[ex, 0], [w - 1, 0], [0, 0]],   // the classic order: middle, right, left
    spots: tiles(lv.spots, CL_SPOTS), bossAt: tile(lv.bossAt) ? [lv.bossAt[0], lv.bossAt[1]] : null,
    lineup: lineup.length ? lineup : null, order: lv.order === 'turn' ? 'turn' : 'mix',
    boss: clBosses().includes(lv.boss) ? lv.boss : -1, bossHp: CL_BOSS_HP.includes(lv.bossHp) ? lv.bossHp : 100,
    pu: Array.isArray(lv.pu) ? lv.pu.filter(i => Number.isInteger(i) && POWERUPS[i]) : null,
    drops: CL_DROPS.includes(lv.drops) ? lv.drops : 0,
    weather: CL_WEATHER.includes(lv.weather) ? lv.weather : null,
    goal, time: clClamp(lv.time | 0, 0, 30) || (goal === 'hold' ? 3 : 0),
    lives: clClamp(lv.lives | 0, 0, 9), maxOn: clClamp(lv.maxOn | 0, 0, 12), every: CL_EVERY.includes(lv.every) ? lv.every : 0,
  };
}

// the game's markers (stage.js globals) for a level: after setFieldSize, which puts back the classic ones
function clSetGlobals(c) {
  const [ex, ey] = c.eagle || [-4, -4];   // no eagle: off the field, out of everyone's way
  BASE_X = ex * 16; BASE_Y = ey * 16;
  // the eagle "faces" into the field from its nearest edge (base upgrades are laid out that way)
  const d = { bottom: c.h - 1 - ey, top: ey, left: ex, right: c.w - 1 - ex };
  BASE_SIDE = c.eagle ? Object.keys(d).reduce((a, k) => (d[k] < d[a] ? k : a), 'bottom') : 'bottom';
  BASE_FWD = SIDE_FWD[BASE_SIDE];
  BASE_WALL = c.eagle ? baseRing(1) : [];
  PLAYER_SPAWN = c.starts.map(([x, y]) => [x * 16, y * 16]);
  ENEMY_SPAWNS = c.entries.map(([x, y]) => [x * 16, y * 16]);
  ENEMY_SPAWN_X = ENEMY_SPAWNS.map(p => p[0]);
  ENEMY_SPAWN_DIR = 2;
}

// which way a tank at (x, y) starts: enemies towards the eagle (or the middle); players away from the nearest edge
// (up from the bottom row, as ever), or towards the middle out in the open
function clFacing(x, y, toEagle) {
  if (!toEagle) {
    const d = [y, FW - 16 - x, FH - 16 - y, x], near = Math.min(...d);   // to the top, right, bottom, left
    if (near < 48) return [2, 3, 0, 1][[0, 2, 1, 3].find(k => d[k] === near)];   // the top and bottom first
  }
  const eg = toEagle && BASE_X >= 0, dx = (eg ? BASE_X : FW / 2 - 8) - x, dy = (eg ? BASE_Y : FH / 2 - 8) - y;
  return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : (dy > 0 ? 2 : 0);
}

// the line-up as a stage queue: groups in turn, or mixed (the same mix every time the level is played)
function clQueue(c) {
  const list = [];
  for (const g of c.lineup) for (let i = 0; i < g.n; i++) list.push(g);
  if (c.order !== 'turn') {
    const r = seeded(7919 + list.reduce((a, g, i) => a + (g.type + 1) * (i + 3), 0));
    for (let i = list.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [list[i], list[j]] = [list[j], list[i]]; }
  }
  const bonus = Config.on('bonusTanks');
  return list.map((g, i) => {
    const e = { type: g.type, bonus: bonus && isBonusSlot(i), rank: g.rank };
    if (g.hits) e.hp = g.hits;
    if (g.speed !== 100) e.extra = { speedMul: g.speed / 100 };
    return e;
  });
}

// ------------------------------------------------------------------ blocks
// the 8px blocks of the ring round an eagle at tile (tx, ty), inside a w x h field
function clRing(tx, ty, w, h) {
  const out = [];
  for (let y = ty * 2 - 1; y <= ty * 2 + 2; y++) for (let x = tx * 2 - 1; x <= tx * 2 + 2; x++) {
    if (x >> 1 === tx && y >> 1 === ty && x >= 0 && y >= 0) continue;
    if (x >= 0 && y >= 0 && x < w * 2 && y < h * 2) out.push([x, y]);
  }
  return out;
}

// build the brick fortress round an eagle at `at` (clearing its own tile), or take it away (only its bricks)
function clFortress(blocks, w, h, at, build) {
  const rows = blocks.map(r => r.split(''));
  for (const [x, y] of clRing(at[0], at[1], w, h)) if (build) rows[y][x] = '#'; else if (rows[y][x] === '#') rows[y][x] = '.';
  if (build) for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) rows[at[1] * 2 + y][at[0] * 2 + x] = '.';
  return rows.map(r => r.join(''));
}

// write the markers into a level that has only the classic ones so far (before moving one or resizing)
function clMaterialize(lv) {
  const c = clResolve(lv);
  if (!Array.isArray(lv.eagle)) lv.eagle = c.home.slice();
  if (!Array.isArray(lv.starts)) lv.starts = c.starts.map(p => p.slice());
  if (!Array.isArray(lv.entries)) lv.entries = c.entries.map(p => p.slice());
  if (!Array.isArray(lv.spots)) lv.spots = [];
  return lv;
}

// a new size: what was painted stays where it fits (from the top left), the markers too
function clResize(lv, w, h) {
  clMaterialize(lv);
  const ow = lv.w || 13, oh = lv.h || 13, old = lv.blocks;
  lv.blocks = Array.from({ length: h * 2 }, (_, y) => Array.from({ length: w * 2 }, (_, x) => (y < oh * 2 && x < ow * 2 ? old[y][x] : '.')).join(''));
  lv.w = w; lv.h = h;
  const fit = p => p[0] < w && p[1] < h, pull = p => [Math.min(w - 1, p[0]), Math.min(h - 1, p[1])];
  if (!fit(lv.eagle)) {
    lv.eagle = pull(lv.eagle);
    if (!lv.noEagle) lv.blocks = clFortress(lv.blocks, w, h, lv.eagle, true);
  }
  lv.starts = lv.starts.map(pull);
  lv.entries = lv.entries.filter(fit);
  if (!lv.entries.length) lv.entries = [[0, 0]];
  lv.spots = lv.spots.filter(fit);
  if (lv.bossAt && !fit(lv.bossAt)) delete lv.bossAt;
}

// can a tank get from every entry point and start to the eagle (or, with none, to player I)? (2x2-block footprint)
function clReachable(g, c) {
  const W = g[0].length, H = g.length, wall = ch => LEVEL_WALL[ch];
  const ok = (x, y) => x >= 0 && y >= 0 && x < W - 1 && y < H - 1 && !wall(g[y][x]) && !wall(g[y][x + 1]) && !wall(g[y + 1][x]) && !wall(g[y + 1][x + 1]);
  const goal = c.eagle || c.starts[0], seen = new Uint8Array(W * H), q = [[goal[0] * 2, goal[1] * 2]];
  seen[goal[1] * 2 * W + goal[0] * 2] = 1;
  while (q.length) {
    const [x, y] = q.pop();
    for (const [dx, dy] of DXY) {
      const nx = x + dx, ny = y + dy;
      if (!ok(nx, ny) || seen[ny * W + nx]) continue;
      seen[ny * W + nx] = 1;
      q.push([nx, ny]);
    }
  }
  return c.entries.concat(c.starts).every(([x, y]) => seen[y * 2 * W + x * 2]);
}

// a random level of any size: classic-style random maps side by side (their own fortresses taken away), the
// markers on clear ground, the fortress round the eagle; checked so everyone can get through
function clRandom(c) {
  const W = c.w * 2, H = c.h * 2, CLASSIC_RING = clRing(6, 12, 13, 13);
  const clear = (g, [tx, ty]) => { for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) g[ty * 2 + y][tx * 2 + x] = '.'; };
  for (let attempt = 0; attempt < 30; attempt++) {
    const g = Array.from({ length: H }, () => Array(W).fill('.'));
    for (let sy = 0; sy < H; sy += 26) for (let sx = 0; sx < W; sx += 26) {
      const part = randomLevel().map(r => r.split(''));
      for (const [x, y] of CLASSIC_RING) part[y][x] = '.';
      for (let y = 0; y < 26 && sy + y < H; y++) for (let x = 0; x < 26 && sx + x < W; x++) g[sy + y][sx + x] = part[y][x];
    }
    c.starts.concat(c.entries, c.spots, c.bossAt ? [c.bossAt] : []).forEach(p => clear(g, p));
    if (c.eagle) { for (const [x, y] of clRing(c.eagle[0], c.eagle[1], c.w, c.h)) g[y][x] = '#'; clear(g, c.eagle); }
    if (clReachable(g, c)) return g.map(r => r.join(''));
  }
  const blank = Array.from({ length: H }, () => '.'.repeat(W));
  return c.eagle ? clFortress(blank, c.w, c.h, c.eagle, true) : blank;
}

// ------------------------------------------------------------------ the editor's new pages
Object.assign(Game, {
  edLevel() { return Customs.level(Customs.load().slot); },
  edMenuPage() { return ['level', 'foes', 'pu'].includes(this.ed.page); },

  edSetPage(p) {
    const ed = this.ed;
    if (ed.page === p) return;
    Object.assign(ed, { page: p, panel: -1, row: 0, col: 0, scroll: 0 });
    Sound.play('select');
  },
  edPageStep(d) { const i = CL_PAGES.indexOf(this.ed.page); this.edSetPage(CL_PAGES[(i + d + CL_PAGES.length) % CL_PAGES.length]); },

  // the whole map in the window at once (O), when it's bigger than the window
  edCanZoom() { return FW > VIEW_W || FH > VIEW_H; },
  edScale() { return this.ed.zoom && this.edCanZoom() ? Math.min(VIEW_W / FW, VIEW_H / FH) : 1; },
  edZoom() {
    if (!this.edCanZoom()) { Sound.play('steel'); return; }
    this.ed.zoom = !this.ed.zoom;
    Sound.play('select');
  },

  // a level setting: kept only while it isn't the usual (a level with none plays as the old ones did)
  edSet(k, v, usual) {
    const lv = this.edLevel();
    if (v === usual || v === undefined || v === null) delete lv[k]; else lv[k] = v;
    Customs.save();
    this.ed.c = clResolve(lv);
    Sound.play('select');
  },

  // after the blocks or markers change: save, and the field again
  edCommit(lv) {
    this.custom = lv.blocks.slice();
    this.saveSlot();
    this.rebuildEdStage();
  },

  edResize(w, h) {
    w = clClamp(w, CL_SIZE.w[0], CL_SIZE.w[1]); h = clClamp(h, CL_SIZE.h[0], CL_SIZE.h[1]);
    const lv = this.edLevel();
    if (w === (lv.w || 13) && h === (lv.h || 13)) { Sound.play('steel'); return; }
    this.saveSlot();
    clResize(lv, w, h);
    this.edCommit(lv);
    Sound.play('select');
  },

  // the eagle on or off: its fortress comes and goes with it
  edEagle(on) {
    const lv = clMaterialize(this.edLevel()), c = this.ed.c, [tx, ty] = lv.eagle, at = on ? this.edMarkAt(tx, ty) : null;
    // back on: whatever was put on its tile meanwhile makes way (a player's start can't)
    if (typeof at === 'number' || (at === 'entry' && c.entries.length <= 1)) { this.toast('MOVE THE MARKER ON ITS TILE FIRST'); Sound.play('steel'); return; }
    this.saveSlot();
    this.edDropMark(lv, at, tx, ty);
    lv.blocks = clFortress(lv.blocks, c.w, c.h, lv.eagle, on);
    if (on) delete lv.noEagle; else lv.noEagle = true;
    this.edCommit(lv);
    Sound.play('select');
  },

  // ---- markers
  // what marker stands on a tile: 'eagle', a player (0-3), 'entry', 'spot', 'boss' or null
  edMarkAt(tx, ty) {
    const c = this.ed.c, on = p => p && p[0] === tx && p[1] === ty;
    if (on(c.eagle)) return 'eagle';
    const s = c.starts.findIndex(on);
    if (s >= 0) return s;
    if (c.entries.some(on)) return 'entry';
    if (c.spots.some(on)) return 'spot';
    if (on(c.bossAt)) return 'boss';
    return null;
  },

  // put marker k (ED_MARKS) on a tile; entries and spots go off again with a second press
  edMark(tx, ty, k) {
    const key = ED_MARKS[k].key, at = this.edMarkAt(tx, ty), fixed = at === 'eagle' || typeof at === 'number';
    if (key === 'erase') { this.edUnmark(tx, ty); return; }
    if (at === key) { if (key === 'entry' || key === 'spot' || key === 'boss') this.edUnmark(tx, ty); return; }
    const lv = clMaterialize(this.edLevel()), c = this.ed.c;
    const fail = () => Sound.play('steel');
    this.saveSlot();
    if (key === 'entry' || key === 'spot') {
      const list = key === 'entry' ? lv.entries : lv.spots;
      if (fixed || list.length >= (key === 'entry' ? CL_ENTRIES : CL_SPOTS)) { fail(); return; }
      this.edDropMark(lv, at, tx, ty);
      list.push([tx, ty]);
    } else if (key === 'boss') {
      if (fixed) { fail(); return; }
      this.edDropMark(lv, at, tx, ty);
      lv.bossAt = [tx, ty];
    } else if (key === 'eagle') {
      if (fixed || (at === 'entry' && lv.entries.length <= 1)) { fail(); return; }
      // (putting it down while there's none brings it back)
      this.edDropMark(lv, at, tx, ty);
      if (c.eagle) lv.blocks = clFortress(lv.blocks, c.w, c.h, lv.eagle, false);
      lv.blocks = clFortress(lv.blocks, c.w, c.h, [tx, ty], true);
      lv.eagle = [tx, ty];
      delete lv.noEagle;
    } else {
      // a player's start: swaps with another player's there
      if (at === 'eagle' || (at === 'entry' && lv.entries.length <= 1)) { fail(); return; }
      if (typeof at === 'number') lv.starts[at] = lv.starts[key].slice();
      else this.edDropMark(lv, at, tx, ty);
      lv.starts[key] = [tx, ty];
    }
    this.edCommit(lv);
    Sound.play('build');
  },

  edDropMark(lv, at, tx, ty) {
    const off = p => !(p[0] === tx && p[1] === ty);
    if (at === 'entry') lv.entries = lv.entries.filter(off);
    else if (at === 'spot') lv.spots = lv.spots.filter(off);
    else if (at === 'boss') delete lv.bossAt;
  },

  // take an entry point, power-up spot or the boss's spot off a tile (the eagle and starts only move)
  edUnmark(tx, ty) {
    const at = this.edMarkAt(tx, ty), lv = this.edLevel();
    if (!at || at === 'eagle' || typeof at === 'number' || (at === 'entry' && this.ed.c.entries.length <= 1)) { Sound.play('steel'); return; }
    clMaterialize(lv);
    const off = p => !(p[0] === tx && p[1] === ty);
    if (at === 'entry') lv.entries = lv.entries.filter(off);
    else if (at === 'spot') lv.spots = lv.spots.filter(off);
    else delete lv.bossAt;
    Customs.save();
    this.ed.c = clResolve(lv);
    clSetGlobals(this.ed.c);
    Sound.play('brick');
  },

  // ---- the line-up
  edLineupSet(L) {
    const lv = this.edLevel();
    if (L && L.length) lv.lineup = L; else { delete lv.lineup; delete lv.order; }
    Customs.save();
    this.ed.c = clResolve(lv);
  },
  edGroups() { return (this.ed.c.lineup || []).map(g => Object.assign({}, g)); },
  edAddGroup() {
    const L = this.edGroups(), last = L[L.length - 1] || { type: 0, rank: 0, hits: 0, speed: 100 };
    if (L.length >= CL_GROUPS) { Sound.play('steel'); return; }
    L.push(Object.assign({}, last, { n: 4 }));
    this.edLineupSet(L);
    this.ed.row = this.edRows().findIndex(r => r.kind === 'group' && r.g === L.length - 1);
    this.ed.col = 1;
    this.edMenuScroll();
    Sound.play('build');
  },
  edGroupStep(gi, col, d) {
    const L = this.edGroups(), g = L[gi], T = clTypes();
    if (!g) return;
    if (col === 0) {
      g.n = Math.min(CL_GROUP_MAX, g.n + d);
      if (g.n < 1) { this.edGroupRemove(gi); return; }
    } else if (col === 1) g.type = T[(T.indexOf(g.type) + d + T.length) % T.length];
    else if (col === 2) g.rank = (g.rank + d + 3) % 3;
    else if (col === 3) g.hits = (g.hits + d + 21) % 21;
    else g.speed = clStep(CL_SPEEDS, g.speed, d);
    this.edLineupSet(L);
    Sound.play('select');
  },
  edGroupRemove(gi) {
    const L = this.edGroups();
    L.splice(gi, 1);
    this.edLineupSet(L);
    Sound.play('steel');
  },
  // where a group row's fields are: [text, x, width] (x from the left of the window)
  edGroupCells(g) {
    return [[String(g.n).padStart(2, ' '), 16, 16], [clShortName(g.type), 38, 64], [CL_RANKS[g.rank], 108, 24],
      [g.hits ? 'H' + g.hits : 'H--', 138, 24], [g.speed + '%', 168, 32]];
  },

  // ---- the menu pages: their rows
  // kind: 'page' (the title: which page), 'set' (a value, < >), 'group' (a line-up group), 'act' (do it), 'note'
  edRows() {
    const ed = this.ed, lv = this.edLevel(), c = ed.c = clResolve(lv), R = [{ kind: 'page' }];
    const set = (label, val, step, usual, hint) => R.push({ kind: 'set', label, val: String(val), step, usual, hint });
    if (ed.page === 'level') {
      set('WIDTH', c.w, d => this.edResize(c.w + d, c.h), c.w === 13, 'TILES ACROSS: 13 TO 40');
      set('HEIGHT', c.h, d => this.edResize(c.w, c.h + d), c.h === 13, 'TILES DOWN: 13 TO 30');
      set('SEASON', clThemeName(this.customTheme), d => this.edTheme(d), this.customTheme === 'auto', "ANY: THE STAGE'S OWN");
      set('WEATHER', ['AUTO', 'CLEAR', 'NIGHT', 'FOG'][CL_WEATHER.indexOf(c.weather)], d => this.edSet('weather', clStep(CL_WEATHER, c.weather, d), null), !c.weather, 'AUTO: AS IN THE SETTINGS');
      set('EAGLE', c.eagle ? 'ON' : 'OFF', () => this.edEagle(!c.eagle), !!c.eagle, c.eagle ? 'ITS PLACE: MARKERS PAGE' : 'NONE: THEY HUNT YOU');
      set('GOAL', c.goal === 'hold' ? 'HOLD OUT' : 'DESTROY ALL', () => this.edSet('goal', c.goal === 'hold' ? null : 'hold', null), c.goal !== 'hold',
        c.goal === 'hold' ? 'LAST TILL THE TIME IS UP' : 'EVERY TANK, AND THE BOSS');
      const t0 = c.goal === 'hold' ? 1 : 0, tn = 31 - t0;
      set('TIME LIMIT', c.time ? c.time + ' MIN' : 'OFF', d => this.edSet('time', t0 + ((c.time - t0 + d) % tn + tn) % tn, 0), !c.time,
        c.goal === 'hold' ? 'HOW LONG TO HOLD OUT' : 'OUT OF TIME: GAME OVER');
      set('LIVES', c.lives || 'AUTO', d => this.edSet('lives', (c.lives + d + 10) % 10, 0), !c.lives, 'TANKS EACH PLAYER HAS HERE');
    } else if (ed.page === 'foes') {
      set('LINE-UP', c.lineup ? 'CUSTOM' : 'AUTO', () => { this.edLineupSet(c.lineup ? null : CL_LINEUP0.map(g => Object.assign({ rank: 0, hits: 0, speed: 100 }, g))); Sound.play('select'); },
        !c.lineup, c.lineup ? 'GROUPS OF TANKS BELOW' : "AUTO: THE STAGE'S OWN");
      if (c.lineup) {
        set('ORDER', c.order === 'turn' ? 'IN TURN' : 'MIXED', () => this.edSet('order', c.order === 'turn' ? null : 'turn', null), c.order !== 'turn',
          c.order === 'turn' ? 'GROUP AFTER GROUP' : 'SHUFFLED TOGETHER');
        c.lineup.forEach((g, i) => R.push({ kind: 'group', g: i }));
        if (c.lineup.length < CL_GROUPS) R.push({ kind: 'act', label: '+ ADD TANKS', act: () => this.edAddGroup(), hint: 'A NEW GROUP OF TANKS' });
      }
      set('AT ONCE', c.maxOn || 'AUTO', d => this.edSet('maxOn', (c.maxOn + d + 13) % 13, 0), !c.maxOn, 'ENEMIES OUT AT ONCE');
      set('NEW ONE EVERY', c.every ? c.every + ' S' : 'AUTO', d => this.edSet('every', clStep(CL_EVERY, c.every, d), 0), !c.every, 'SECONDS BETWEEN ARRIVALS');
      const B = [-1].concat(clBosses());
      set('BOSS', c.boss >= 0 ? BOSSES[c.boss].name : 'NONE', d => this.edSet('boss', clStep(B, c.boss, d), -1), c.boss < 0, 'ITS PLACE: MARKERS PAGE');
      if (c.boss >= 0) set('BOSS HP', c.bossHp + '%', d => this.edSet('bossHp', clStep(CL_BOSS_HP, c.bossHp, d), 100), c.bossHp === 100, 'TIMES THE BOSS HP SETTING');
    } else {
      set('POWER-UPS', c.pu ? 'CHOSEN' : 'USUAL', () => this.edSet('pu', c.pu ? null : clPowerups(), null), !c.pu, c.pu ? 'ONLY THE ONES SWITCHED ON' : 'USUAL: AS IN THE SETTINGS');
      set('TIMED DROPS', c.drops ? 'EVERY ' + c.drops + ' S' : 'OFF', d => this.edSet('drops', clStep(CL_DROPS, c.drops, d), 0), !c.drops, 'A POWER-UP NOW AND THEN');
      R.push({ kind: 'note', label: c.spots.length ? 'LAND ON ' + c.spots.length + (c.spots.length > 1 ? ' SPOTS' : ' SPOT') : 'LAND ANYWHERE: NO SPOTS' });
      if (c.pu) {
        const all = clPowerups().every(i => c.pu.includes(i));
        R.push({ kind: 'act', label: all ? 'ALL OFF' : 'ALL ON', act: () => this.edSet('pu', all ? [] : clPowerups(), null), hint: 'SWITCH THEM ALL AT ONCE' });
        for (const i of clPowerups()) {
          const on = c.pu.includes(i);
          R.push({ kind: 'set', label: POWERUPS[i].name, val: on ? 'ON' : 'OFF', icon: i, usual: !on, hint: POWERUPS[i].desc,
            step: () => this.edSet('pu', on ? c.pu.filter(j => j !== i) : c.pu.concat([i]), null) });
        }
      }
    }
    return R;
  },

  edMenuScroll(rows = this.edRows()) {
    const ed = this.ed, n = edMenuRows(), li = ed.row - 1;
    if (li >= 0 && li < ed.scroll) ed.scroll = li;
    if (li >= ed.scroll + n) ed.scroll = li - n + 1;
    ed.scroll = clClamp(ed.scroll, 0, Math.max(0, rows.length - 1 - n));
  },

  // up / down: the next row that can be picked
  edMenuMove(d, rows = this.edRows()) {
    const ed = this.ed;
    let i = ed.row;
    for (let k = 0; k < rows.length; k++) {
      i = (i + d + rows.length) % rows.length;
      if (rows[i].kind !== 'note') break;
    }
    ed.row = i;
    this.edMenuScroll(rows);
    Sound.play('select');
  },

  edRowStep(row, d) {
    if (row.kind === 'page') this.edPageStep(d);
    else if (row.kind === 'group') this.edGroupStep(row.g, this.ed.col, d);
    else if (row.step) row.step(d);
    else if (row.act) row.act();
  },

  updateEdMenu(m, just) {
    const ed = this.ed;
    let rows = this.edRows();
    if (!rows[ed.row] || rows[ed.row].kind === 'note') ed.row = 0;
    this.edMenuScroll(rows);
    let dir = m.up ? 0 : m.right ? 1 : m.down ? 2 : m.left ? 3 : -1;
    if (dir >= 0) ed.rep = 14;
    else {
      const held = Input.heldDir();
      if (held >= 0 && --ed.rep <= 0 && rows[ed.row].kind !== 'page') { dir = held; ed.rep = 5; }   // auto-repeat (not for the page switch)
    }
    if (dir === 0 || dir === 2) { this.edMenuMove(dir === 0 ? -1 : 1, rows); return; }
    const row = rows[ed.row];
    if (dir === 1 || dir === 3) this.edRowStep(row, dir === 1 ? 1 : -1);
    else if (m.fire) {
      if (row.kind === 'group') { ed.col = (ed.col + 1) % 5; Sound.play('select'); } else this.edRowStep(row, 1);
    } else if (m.alt) {
      if (row.kind === 'group') { ed.col = (ed.col + 4) % 5; Sound.play('select'); } else if (row.kind !== 'act') this.edRowStep(row, -1);
    } else if (just('Delete') && row.kind === 'group') this.edGroupRemove(row.g);
    else if (m.back) this.edSetPage('map');
    // rows come and go (a custom line-up, the boss's HP): stay on one that's there
    rows = this.edRows();
    ed.row = Math.min(ed.row, rows.length - 1);
    if (rows[ed.row].kind === 'note') ed.row--;
  },

  edWheel(dy) { if (this.edMenuPage()) this.edMenuMove(dy > 0 ? 1 : -1); },

  // mouse / touch on a menu page: pick a row, then step its value (left part: back, right part: on)
  edMenuPointer(x, y) {
    const ed = this.ed, rows = this.edRows(), x0 = FX, w = VIEW_W;
    if (y < FY + ED_MENU_TOP - 4) { ed.row = 0; this.edPageStep(x < x0 + w / 2 ? -1 : 1); return; }   // the title: the page
    const r = Math.floor((y - FY - ED_MENU_TOP + 2) / ED_MENU_STEP);
    if (r >= edMenuRows()) { ed.scroll++; this.edMenuScroll(rows); return; }
    const i = 1 + ed.scroll + r, row = rows[i];
    if (r < 0 || !row || row.kind === 'note') return;
    if (row.kind === 'group') {
      const cells = this.edGroupCells(ed.c.lineup[row.g]), k = cells.findIndex(([, cx, cw]) => x >= x0 + cx - 3 && x < x0 + cx + cw + 3);
      if (k < 0) { ed.row = i; return; }
      if (ed.row === i && ed.col === k) this.edGroupStep(row.g, k, x < x0 + cells[k][1] + cells[k][2] / 2 ? -1 : 1);
      else { ed.row = i; ed.col = k; Sound.play('select'); }
      return;
    }
    if (row.kind === 'act') { ed.row = i; row.act(); return; }
    if (ed.row !== i) { ed.row = i; Sound.play('select'); return; }
    row.step(x < x0 + w - 42 ? -1 : 1);
  },

  // ---- drawing
  renderEdMenu(ctx) {
    const ed = this.ed, rows = this.edRows(), c = ed.c, x0 = FX, w = VIEW_W, n = edMenuRows();
    ctx.fillStyle = COL.black;
    ctx.fillRect(FX, FY, VIEW_W, VIEW_H);
    // the title is the page switch
    const total = c.lineup ? c.lineup.reduce((a, g) => a + g.n, 0) : 0;
    const title = CL_PAGE_NAMES[ed.page] + (ed.page === 'foes' && total ? ': ' + total + (total > 1 ? ' TANKS' : ' TANK') : '');
    if (ed.row === 0) {
      ctx.fillStyle = '#20206C'; ctx.fillRect(x0 + 2, FY + 3, w - 4, 11);
      Font.draw(ctx, '<', x0 + 6, FY + 5, COL.white); Font.draw(ctx, '>', x0 + w - 14, FY + 5, COL.white);
    }
    Font.drawCenter(ctx, title, x0 + w / 2, FY + 5, COL.orange);
    for (let r = 0; r < n; r++) {
      const i = 1 + ed.scroll + r, row = rows[i];
      if (!row) break;
      const y = FY + ED_MENU_TOP + r * ED_MENU_STEP, sel = i === ed.row;
      if (sel) { ctx.fillStyle = '#20206C'; ctx.fillRect(x0 + 2, y - 2, w - 4, 11); }
      if (row.kind === 'group') { this.renderEdGroup(ctx, c.lineup[row.g], x0, y, sel); continue; }
      if (row.kind === 'note') { Font.draw(ctx, row.label, x0 + 16, y, '#7C7C7C'); continue; }
      if (row.kind === 'act') { Font.draw(ctx, row.label, x0 + 16, y, COL.gold); continue; }
      if (row.icon !== undefined) ctx.drawImage(Sprites.powerups[row.icon], x0 + 4, y - 1, 8, 8);
      Font.draw(ctx, row.label, x0 + 16, y, COL.white);
      Font.drawRight(ctx, row.val, x0 + w - 18, y, row.usual ? COL.lgrey : COL.gold);
      if (sel) { Font.draw(ctx, '<', x0 + w - 18 - row.val.length * 8 - 9, y, COL.white); Font.draw(ctx, '>', x0 + w - 15, y, COL.white); }
    }
    // more rows above or below
    ctx.fillStyle = COL.lgrey;
    const mid = x0 + w / 2;
    if (ed.scroll > 0) for (let k = 0; k < 3; k++) ctx.fillRect(mid - k, FY + ED_MENU_TOP - 6 + k, 1 + 2 * k, 1);
    if (ed.scroll + n < rows.length - 1) for (let k = 0; k < 3; k++) ctx.fillRect(mid - 2 + k, FY + VIEW_H - 4 + k, 5 - 2 * k, 1);
  },

  renderEdGroup(ctx, g, x0, y, sel) {
    ctx.drawImage(Sprites.tank('e' + g.type, (this.t >> 3) & 1, 1, ENEMY[g.type].pal || 'silver'), x0 + 4, y - 1, 8, 8);
    const cols = [COL.gold, COL.white, ['#ADADAD', '#F8B800', '#F83800'][g.rank], g.hits ? COL.gold : COL.lgrey, g.speed !== 100 ? COL.gold : COL.lgrey];
    this.edGroupCells(g).forEach(([text, cx, cw], k) => {
      if (sel && this.ed.col === k) { ctx.fillStyle = '#4848B8'; ctx.fillRect(x0 + cx - 2, y - 2, cw + 3, 11); }
      Font.draw(ctx, text, x0 + cx, y, cols[k]);
    });
  },

  // a marker's picture, 16px on the map or 8px on the panel
  drawEdMark(ctx, key, x, y, s) {
    const f = this.t, box = col => { ctx.strokeStyle = col; ctx.strokeRect(x + 0.5, y + 0.5, s - 1, s - 1); };
    if (key === 'eagle') ctx.drawImage(Sprites.eagle, x, y, s, s);
    else if (typeof key === 'number') ctx.drawImage(Sprites.tank('p0', 0, 0, Config.playerPal(key)), x, y, s, s);
    else if (key === 'entry') { ctx.drawImage(Sprites.sparkle[[0, 1, 2, 3, 2, 1][(f >> 3) % 6]], x, y, s, s); box('#F83800'); }
    else if (key === 'spot') { ctx.globalAlpha = 0.6; ctx.drawImage(Sprites.powerups[PU.STAR], x, y, s, s); ctx.globalAlpha = 1; box(COL.gold); }
    else if (key === 'boss') { box('#F83800'); Font.draw(ctx, 'B', x + (s >> 1) - 4, y + (s >> 1) - 4, '#F83800'); }
    else Font.draw(ctx, 'X', x + (s >> 1) - 4, y + (s >> 1) - 4, COL.white);
  },

  // the markers on the map (both map pages): power-up spots, entry points (numbered in the order they're used), the
  // boss's spot and the players' starts
  renderEdMarks(ctx) {
    const c = this.ed.c, num = (n, x, y) => { const im = Sprites.mini(String(n)); ctx.fillStyle = COL.black; ctx.fillRect(x - 1, y - 1, im.width + 2, 9); ctx.drawImage(im, x, y); };
    c.spots.forEach(([tx, ty]) => this.drawEdMark(ctx, 'spot', tx * 16, ty * 16, 16));
    c.entries.forEach(([tx, ty], i) => { this.drawEdMark(ctx, 'entry', tx * 16, ty * 16, 16); num(i + 1, tx * 16 + 2, ty * 16 + 2); });
    if (c.bossAt) this.drawEdMark(ctx, 'boss', c.bossAt[0] * 16, c.bossAt[1] * 16, 16);
    c.starts.forEach(([tx, ty], i) => {
      ctx.globalAlpha = 0.8;
      ctx.drawImage(Sprites.tank('p0', 0, clFacing(tx * 16, ty * 16, false), Config.playerPal(i)), tx * 16, ty * 16);
      ctx.globalAlpha = 1;
      num(i + 1, tx * 16 + 11, ty * 16 + 8);
    });
  },
});

// ------------------------------------------------------------------ playing a level
Object.assign(Game, {
  // the field and markers of a level of the new kind (null for an old one, which plays as it always did)
  customSetup(lv) {
    if (!lv || !clCustomized(lv) || !clFits(lv)) return null;
    const c = clResolve(lv), [vc, vr] = this.desiredField();
    setFieldSize(c.w, c.h, Math.min(c.w, vc), Math.min(c.h, vr));
    clSetGlobals(c);
    return c;
  },

  // the level the next stage will be (CUSTOM LEVELS, or the editor's own)
  customNext() {
    if (Net.role === 'client') return null;
    if (this.customPending) return this.customLevel || null;
    if (this.mode !== 'custom') return null;
    const used = Customs.used();
    return used.length ? Customs.level(used[(this.stageNum - 1) % used.length]) : null;
  },
});

(function () {
  const P = Stage.prototype;

  Object.assign(P, {
    // a custom level's rules, once the stage is built (the editor's field only takes the markers)
    setupCustomLevel(c, opts) {
      this.cl = c;
      this.clT = 0; this.clDropT = 0; this.clClock = null;
      if (opts.editor) return;
      if (!c.eagle) { this.noBase = true; this.baseAlive = false; this.shovel = 0; }
      if (c.weather) this.weather = c.weather === 'clear' ? null : c.weather;
      if (opts.snapshot) return;
      if (c.lineup) { this.queue = clQueue(c); this.total = this.queue.length; }
      // a boss: its own escorts with the usual line-up, or the level's line-up instead
      if (c.boss >= 0) {
        const q = this.queue, mx = this.maxEnemies, hp = Config.values.bossHp;
        Config.values.bossHp = hp * c.bossHp / 100;
        try { this.initBoss({ idx: c.boss, loop: 0 }); } finally { Config.values.bossHp = hp; }
        if (c.lineup) { this.queue = q; this.total = q.length; this.maxEnemies = mx; }
        const b = this.bosses[0];
        if (b && c.bossAt && b.kind !== 'train') {
          b.x = clClamp(Math.round((c.bossAt[0] * 16 + 8 - b.w / 2) / 8) * 8, 0, FW - b.w);
          b.y = clClamp(Math.round((c.bossAt[1] * 16 + 8 - b.h / 2) / 8) * 8, 0, FH - b.h);
          if (b.home !== undefined) b.home = b.x;
        }
      }
      if (c.maxOn) this.maxEnemies = c.maxOn;
      if (c.every) this.spawnInterval = Math.max(20, Math.round(c.every * 60));
      if (c.lives && !Config.infiniteLives()) for (const p of this.players) if (!p.out) p.lives = c.lives - 1;
    },

    // every frame, before the stage's own update: drops, the clock (and the line-up again while holding out)
    clTick() {
      const c = this.cl;
      if (this.over || this.clearTimer || this.result || this.galaxy) return;
      this.clT++;
      if (c.drops && !this.powerup && ++this.clDropT >= c.drops * 60) { this.clDropT = 0; this.spawnPowerup(); }
      if (!c.time) return;
      const left = Math.max(0, c.time * 3600 - this.clT);
      this.clClock = { left, hold: c.goal === 'hold' };
      if (c.goal === 'hold') {
        if (left > 0 && !this.queue.length && !this.clHeld) {
          this.queue = c.lineup ? clQueue(c) : buildQueue(this.num);
          this.total += this.queue.length;
        }
        if (left <= 0) this.clHoldDone();
      } else if (left <= 0) {
        this.popups.push({ x: FW / 2, y: FH / 2, text: 'TIME UP', label: true, color: COL.red, t: 0, delay: 0, life: 200 });
        Sound.play('baseDie');
        this.startOver();
      }
    },

    // held out: whatever is left of the enemy goes
    clHoldDone() {
      if (!this.clHeld) {
        this.clHeld = true;
        this.popups.push({ x: FW / 2, y: FH / 2, text: 'HELD OUT!', label: true, color: COL.gold, t: 0, delay: 0, life: 150 });
        Sound.play('bonus');
      }
      this.queue = [];
      this.spawns = this.spawns.filter(s => !s.enemy);
      for (const t of this.tanks) if (!t.isPlayer && t.alive) this.killEnemy(t, null, false, true);
      for (const b of this.bosses) b.alive = false;
      this.wrecks = [];
    },
  });

  const update = P.update;
  P.update = function () {
    if (this.cl) this.clTick();
    update.call(this);
  };

  // enemies come in at the level's entry points, in turn, facing the eagle (or the middle)
  const spawning = P.updateSpawning;
  P.updateSpawning = function () {
    if (!this.cl || this.survival || this.race || this.maze || this.galaxy) return spawning.call(this);
    if (!this.queue.length) return;
    if (this.spawnTimer > 0) { this.spawnTimer--; return; }
    const onField = this.tanks.filter(t => !t.isPlayer).length + this.spawns.filter(s => s.enemy).length;
    if (onField >= this.maxEnemies) return;
    let at = null;
    for (let k = 0; k < ENEMY_SPAWNS.length && !at; k++) {
      const [x, y] = ENEMY_SPAWNS[this.spawnPos++ % ENEMY_SPAWNS.length];
      if (!this.spawns.some(s => overlap(s.x, s.y, 16, 16, x, y, 16, 16)) && !this.bosses.some(b => b.alive && !bossFlies(b) && this.bossTangible(b) && overlap(x, y, 16, 16, b.x - 8, b.y - 8, b.w + 16, b.h + 16))) at = [x, y];
    }
    if (!at) return;
    const item = this.queue.shift();
    item.extra = Object.assign({}, item.extra, { dir: clFacing(at[0], at[1], true) });
    this.spawns.push({ x: at[0], y: at[1], t: SPARKLE_TIME, enemy: item });
    if (item.bonus) this.powerup = null;
    this.spawnTimer = this.spawnInterval;
  };

  // players start facing into the field
  const spawns = P.updateSpawns;
  P.updateSpawns = function () {
    const due = this.cl ? this.spawns.filter(s => s.player && s.t <= 1) : null;
    spawns.call(this);
    if (due) for (const s of due) if (s.done && s.player.tank) s.player.tank.dir = clFacing(s.x, s.y, false);
  };

  // a boss's reinforcements come in at the level's entry points too
  const escort = P.summonEscort;
  P.summonEscort = function (type) {
    if (!this.cl) return escort.call(this, type);
    if (this.tanks.filter(t => !t.isPlayer).length + this.spawns.filter(s => s.enemy).length >= this.maxEnemies + 2) return;
    const [x, y] = ENEMY_SPAWNS[rnd(ENEMY_SPAWNS.length)];
    if (this.spawns.some(s => overlap(s.x, s.y, 16, 16, x, y, 16, 16))) return;
    this.spawns.push({ x, y, t: SPARKLE_TIME, enemy: { type, bonus: false, extra: { dir: clFacing(x, y, true) } } });
  };

  // a boss down doesn't end a custom level: the rest of the line-up still has to be beaten
  const killBoss = P.killBoss;
  P.killBoss = function (bo) {
    if (!this.cl || !this.cl.lineup) return killBoss.call(this, bo);
    const q = this.queue, sp = this.spawns.filter(s => s.enemy), foes = this.tanks.filter(t => !t.isPlayer && t.alive);
    this.tanks = this.tanks.filter(t => !foes.includes(t));
    killBoss.call(this, bo);
    this.tanks = this.tanks.concat(foes);
    this.queue = q;
    this.spawns = this.spawns.concat(sp);
  };

  // power-ups: only the level's own, and on its spots
  const spawnPu = P.spawnPowerup;
  P.spawnPowerup = function (only) {
    const c = this.cl;
    if (!c) return spawnPu.call(this, only);
    if (c.pu) {
      only = (only || POWERUPS.map((p, i) => i)).filter(i => c.pu.includes(i));
      if (!only.length) return;
    }
    const was = this.powerup;
    spawnPu.call(this, only);
    const pu = this.powerup;
    if (!pu || pu === was || !c.spots.length) return;
    const free = c.spots.filter(([x, y]) => !this.tanks.some(t => t.alive && overlap(t.x, t.y, 16, 16, x * 16, y * 16, 16, 16)) && !(was && was.x === x * 16 && was.y === y * 16));
    const [sx, sy] = (free.length ? free : c.spots)[rnd(free.length || c.spots.length)];
    pu.x = sx * 16; pu.y = sy * 16;
  };

  // the clock in the border above the field
  const objLine = P.renderObjectiveLine;
  P.renderObjectiveLine = function (ctx) {
    const k = this.clClock;
    if (!k) { objLine.call(this, ctx); return; }
    const s = Math.ceil(k.left / 60), text = (k.hold ? 'HOLD OUT ' : 'TIME ') + Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
    Font.drawCenter(ctx, text, FX + VIEW_W / 2, 0, s <= 10 && (this.frame >> 4) & 1 ? '#A00000' : COL.black);
  };

  // exact saves (a level played from the editor) keep the level's rules and markers
  const snapshot = P.snapshot;
  P.snapshot = function () {
    const sn = snapshot.call(this);
    if (this.cl) Object.assign(sn, { cl: this.cl, clT: this.clT, clDropT: this.clDropT, clHeld: !!this.clHeld });
    return sn;
  };
  const restore = P.restore;
  P.restore = function (sn) {
    if (sn.cl) {
      clSetGlobals(sn.cl);   // before the players come back at their starts
      this.setupCustomLevel(sn.cl, { snapshot: true });
      this.clT = sn.clT | 0; this.clDropT = sn.clDropT | 0; this.clHeld = !!sn.clHeld;
    }
    restore.call(this, sn);
  };

  // online: guests put the eagle where the host has it, and see the clock
  const stageView = Net.stageView;
  Net.stageView = function (st, full) {
    const v = stageView.call(this, st, full);
    if (st.cl) v.clx = [BASE_X, BASE_Y, st.clClock ? st.clClock.left : -1, st.clClock && st.clClock.hold ? 1 : 0];
    return v;
  };
  const applyStage = Net.applyStage;
  Net.applyStage = function (sv) {
    applyStage.call(this, sv);
    const st = Game.stage;
    if (!st) return;
    if (sv.clx) {
      if (BASE_X !== sv.clx[0] || BASE_Y !== sv.clx[1]) { BASE_X = sv.clx[0]; BASE_Y = sv.clx[1]; BASE_WALL = baseRing(1); }
      st.clClock = sv.clx[2] >= 0 ? { left: sv.clx[2], hold: !!sv.clx[3] } : null;
    } else st.clClock = null;
  };

  // the curtain names the level's boss, its weather and its goal
  const curtain = Game.renderCurtain;
  Game.renderCurtain = function (ctx) {
    curtain.call(this, ctx);
    const cu = this.curtain, lv = cu && cu.phase === 'show' ? this.customNext() : null;
    if (!lv || !clCustomized(lv)) return;
    const c = clResolve(lv), lines = [];
    if (c.boss >= 0) lines.push(['BOSS: ' + BOSSES[c.boss].name, '#A00000']);
    if (c.weather === 'night' || c.weather === 'fog') lines.push([c.weather === 'night' ? 'NIGHT' : 'FOG', c.weather === 'night' ? '#00006C' : '#ADADAD']);
    if (c.goal === 'hold') lines.push(['HOLD OUT ' + c.time + ' MIN', '#3C3C3C']);
    else if (c.time) lines.push(['TIME LIMIT ' + c.time + ' MIN', '#3C3C3C']);
    if (!c.eagle) lines.push(['NO EAGLE: THEY HUNT YOU', '#3C3C3C']);
    lines.forEach(([t, col], i) => Font.drawCenter(ctx, t, SCREEN_W / 2, SCREEN_H / 2 + 28 + i * 11, col));
  };

  const wheel = Game.wheel;
  Game.wheel = function (dy) {
    if (this.state === 'construct') { this.edWheel(dy); return; }
    wheel.call(this, dy);
  };
})();
