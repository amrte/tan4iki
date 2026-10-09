'use strict';
// =====================================================================
//  Stage: terrain, tanks, bullets, power-ups, AI and rendering of play
// =====================================================================

const FX = 16, FY = 8;                             // field offset on screen
// Field size in 16px tiles (classic 13x13). Set with setFieldSize(); everything below derives from it.
let COLS = 13, ROWS = 13;
let FW = 208, FH = 208;                            // field size in pixels
let GW = 52, GH = 52;                              // terrain grid (4px cells)
let SCREEN_W = 256, SCREEN_H = 224, HUD_X = 232;   // whole play screen and the side panel
let VIEW_W = 208, VIEW_H = 208;                    // the part of the field on screen (smaller on big scrolling maps)
const T_EMPTY = 0, T_BRICK = 1, T_STEEL = 2, T_WATER = 3, T_FOREST = 4, T_ICE = 5, T_BRIDGE = 6, T_MUD = 7;
const T_BELT = 8;   // 8-11: conveyor belts pushing up / right / down / left (terrain.js)
// the terrain types' tiles and the elements (biomes.js): concrete 19-21 (whole, cracked, cracked twice), deflectors 26 '/' and 27 '\\'
const T_LAVA = 12, T_BASALT = 13, T_BASALT2 = 14, T_VENT = 15, T_BOG = 16, T_REEDS = 17, T_GAS = 18, T_CONC = 19, T_RUBBLE = 22,
  T_LAMP = 23, T_DRUM = 24, T_CRATE = 25, T_DEFL = 26;
const BLOCK_TYPE = { '.': T_EMPTY, '#': T_BRICK, '@': T_STEEL, '~': T_WATER, '%': T_FOREST, '_': T_ICE,
  m: T_MUD, '=': T_BRIDGE, '^': T_BELT, '>': T_BELT + 1, v: T_BELT + 2, '<': T_BELT + 3, T: T_EMPTY,   // T: teleporter pad
  l: T_LAVA, k: T_BASALT, f: T_VENT, b: T_BOG, r: T_REEDS, g: T_GAS, c: T_CONC, u: T_RUBBLE, i: T_LAMP, d: T_DRUM, x: T_CRATE,
  '/': T_DEFL, '\\': T_DEFL + 1, O: T_EMPTY };   // O: manhole
// terrain as a string for saves and the online view: one character per cell, '0' + its type
function terrainCode(a) {
  let s = '';
  for (let i = 0; i < a.length; i += 4096) s += String.fromCharCode.apply(null, Array.from(a.subarray(i, i + 4096), v => v + 48));
  return s;
}
const DXY = [[0, -1], [1, 0], [0, 1], [-1, 0]];

// basic, fast, power, armor, then the new types (not in the original):
//   rocket - fires slow rockets that blow up bricks and tanks around them; likes to shell from a distance
//   shield - a front plate bounces shells (unless they're star-3, pierce or rocket); hit it from the side or back
//   sapper - its dozer blade crushes bricks as it drives, and it lays mines
//   shade  - almost invisible; shows itself when it fires, gets hit or comes close to you
// `ai` = chance of each personality [wander, rush (the eagle), hunt (players), snipe (from a distance)]
const ENEMY = [
  { name: 'BASIC', speed: 0.5, bullet: 2.5, hp: 1, pts: 100, xp: 10, ai: [4, 3, 2, 1], desc: 'SLOW, ONE HIT' },
  { name: 'FAST', speed: 1.25, bullet: 2.5, hp: 1, pts: 200, xp: 15, ai: [2, 4, 4, 0], desc: 'QUICK ON ITS TRACKS' },
  { name: 'POWER', speed: 0.75, bullet: 4.5, hp: 1, pts: 300, xp: 20, ai: [2, 2, 2, 4], desc: 'FAST SHELLS' },
  { name: 'ARMOR', speed: 0.5, bullet: 2.5, hp: 4, pts: 400, xp: 30, ai: [2, 5, 2, 1], desc: 'TAKES 4 HITS' },
  { name: 'ROCKET', speed: 0.5, bullet: 2, hp: 1, pts: 500, xp: 25, ai: [1, 1, 1, 7], pal: 'rocket', from: 4, desc: 'ROCKETS BLAST AN AREA' },
  { name: 'SHIELD', speed: 0.5, bullet: 2.5, hp: 2, pts: 500, xp: 30, ai: [1, 6, 3, 0], pal: 'shieldE', from: 11, desc: 'FRONT PLATE STOPS SHELLS' },
  { name: 'SAPPER', speed: 0.9, bullet: 2.5, hp: 1, pts: 400, xp: 20, ai: [1, 7, 2, 0], pal: 'sapper', from: 7, desc: 'CRUSHES BRICKS, LAYS MINES' },
  { name: 'SHADE', speed: 1, bullet: 4.5, hp: 1, pts: 600, xp: 35, ai: [1, 1, 7, 1], pal: 'shade', from: 15, desc: 'NEARLY INVISIBLE HUNTER' },
  // from the new-enemies design canvas (abilities in enemies.js); fire = how often it uses its gun
  { name: 'MASON', kind: 'mason', speed: 0.5, bullet: 2.5, hp: 2, pts: 400, xp: 25, ai: [3, 5, 1, 1], pal: 'mason', from: 12, fire: 0.5, desc: 'REBUILDS BROKEN BRICKS' },
  { name: 'MORTAR', kind: 'mortar', speed: 0.4, bullet: 2.5, hp: 2, pts: 400, xp: 25, ai: [1, 1, 1, 7], pal: 'mortar', from: 19, desc: 'LOBS SHELLS OVER WALLS' },
  { name: 'SKIMMER', kind: 'skimmer', speed: 1.1, bullet: 2.5, hp: 1, pts: 300, xp: 15, ai: [2, 3, 4, 1], pal: 'skimmer', from: 6, desc: 'GLIDES OVER WATER' },
  { name: 'FLAMER', kind: 'flamer', speed: 0.75, bullet: 2.5, hp: 6, pts: 400, xp: 25, ai: [1, 2, 7, 0], pal: 'flamer', from: 9, desc: 'SHORT FLAME JET, 6 HITS' },
  { name: 'SPLITTER', kind: 'splitter', speed: 0.75, bullet: 2.5, hp: 1, pts: 300, xp: 15, ai: [2, 5, 2, 1], pal: 'splitter', from: 14, desc: 'SPLITS INTO TWO MINIS' },
  { name: 'MEDIC', kind: 'medic', speed: 0.75, bullet: 2.5, hp: 2, pts: 500, xp: 30, ai: [6, 1, 0, 3], pal: 'medic', from: 17, fire: 0.3, desc: 'REPAIRS NEARBY ENEMIES' },
  { name: 'JAMMER', kind: 'jammer', speed: 0.5, bullet: 2.5, hp: 1, pts: 400, xp: 25, ai: [4, 1, 1, 4], pal: 'jammer', from: 21, fire: 0.3, desc: 'SLOWS YOUR SHELLS NEARBY' },
  { name: 'SPOTTER', kind: 'spotter', speed: 1.1, bullet: 2.5, hp: 1, pts: 500, xp: 30, ai: [1, 0, 1, 8], pal: 'spotter', from: 23, fire: 0.4, desc: 'MARKS YOU FOR ALL ENEMIES' },
  // half of a destroyed splitter (never in a line-up)
  { name: 'MINI', kind: 'mini', speed: 1.4, bullet: 2.5, hp: 1, pts: 100, xp: 5, ai: [0, 1, 0, 0], pal: 'splitter', mini: true, desc: 'HALF A SPLITTER, VERY FAST' },
  // a long snake: fast, never shoots, 16 hits (head only), eats your tank and grows
  { name: 'SNAKE', kind: 'snake', speed: 1.4, bullet: 2.5, hp: 16, pts: 800, xp: 50, ai: [0, 0, 1, 0], pal: 'snake', from: 13, desc: 'FAST, 16 HITS, EATS TANKS' },
  // one for each season, found only there (seasonal.js)
  { name: 'HOPPER', kind: 'hopper', speed: 1, bullet: 2.5, hp: 1, pts: 300, xp: 20, ai: [2, 3, 4, 1], pal: 'hopper', season: 'spring', desc: 'JUMPS OVER WALLS AND WATER' },
  { name: 'FIREBUG', kind: 'firebug', speed: 0.75, bullet: 2.5, hp: 2, pts: 400, xp: 25, ai: [2, 3, 4, 1], pal: 'firebug', season: 'summer', desc: 'FIRE SHELLS, FIREPROOF' },
  { name: 'GUSTER', kind: 'guster', speed: 0.6, bullet: 2.5, hp: 3, pts: 400, xp: 25, ai: [1, 2, 6, 1], pal: 'guster', season: 'autumn', fire: 0.4, desc: 'ITS FAN BLOWS YOU BACK' },
  { name: 'FROST', kind: 'frost', speed: 0.6, bullet: 2.5, hp: 2, pts: 400, xp: 25, ai: [2, 3, 3, 2], pal: 'frost', season: 'winter', desc: 'SHELLS FREEZE YOU SOLID' },
  { name: 'GHOUL', kind: 'ghoul', speed: 0.6, bullet: 2.5, hp: 2, pts: 500, xp: 30, ai: [2, 2, 5, 1], pal: 'ghoul', season: 'nuclear', desc: 'RISES AGAIN: SHOOT ITS WRECK' },
  { name: 'BURROWER', kind: 'burrower', speed: 0.8, bullet: 2.5, hp: 2, pts: 500, xp: 30, ai: [1, 2, 6, 1], pal: 'burrower', season: 'desert', desc: 'DIVES UNDER THE SAND' },
  // and one for each terrain type (biomes.js)
  { name: 'MAGMA', kind: 'magma', speed: 0.6, bullet: 2.5, hp: 3, pts: 500, xp: 30, ai: [2, 4, 3, 1], pal: 'magma', season: 'volcanic', desc: 'CROSSES LAVA, LEAVES FIRE' },
  { name: 'GATOR', kind: 'gator', speed: 0.9, bullet: 2.5, hp: 2, pts: 400, xp: 25, ai: [1, 1, 7, 1], pal: 'gator', season: 'swamp', desc: 'SWIMS UNDER, LUNGES AND BITES' },
  { name: 'ROCKET TRUCK', kind: 'truck', speed: 0.9, bullet: 2.5, hp: 2, pts: 500, xp: 30, ai: [1, 0, 2, 7], pal: 'truck', season: 'city', desc: 'SHELLS WHERE IT LAST SAW YOU' },
  // the maze's own, found only there (mazefoes.js)
  { name: 'MINOTAUR', kind: 'minotaur', speed: 0.42, bullet: 3, hp: 12, pts: 5000, xp: 150, ai: [0, 0, 1, 0], pal: 'minotaur', maze: true, desc: 'HUNTS YOU THROUGH THE MAZE' },
  { name: 'CRAWLER', kind: 'crawler', speed: 1, bullet: 3, hp: 2, pts: 500, xp: 30, ai: [0, 0, 1, 0], pal: 'crawler', maze: true, desc: 'HIDES IN BRICK WALLS' },
  { name: 'SENTRY', kind: 'sentry', speed: 0, bullet: 3, hp: 4, pts: 600, xp: 35, ai: [1, 0, 0, 0], pal: 'sentry', maze: true, desc: 'TURNS AND FIRES ON A BEAT' },
  { name: 'LOCKSMITH', kind: 'locksmith', speed: 1.35, bullet: 2.5, hp: 2, pts: 700, xp: 40, ai: [0, 0, 1, 0], pal: 'locksmith', maze: true, desc: 'STEALS A KEY AND RUNS' },
  { name: 'MIRROR', kind: 'mirror', speed: 1, bullet: 2.5, hp: 2, pts: 800, xp: 45, ai: [0, 0, 0, 0], pal: 'mirror', maze: true, desc: 'COPIES YOUR MOVES MIRRORED' },
  { name: 'MOSSLUMP', kind: 'creeper', speed: 0.6, bullet: 2.5, hp: 2, pts: 600, xp: 35, ai: [0, 0, 1, 0], pal: 'creeper', maze: true, desc: 'CREEPS UP, HISSES, BLOWS UP' },
];
// types that can join a line-up, and every non-classic type (the tally's NEW row)
const NEW_TYPES = ENEMY.map((e, i) => i).filter(i => i >= 4 && !ENEMY[i].mini && !ENEMY[i].season && !ENEMY[i].maze);   // the seasons' and the maze's own come their own way
const ALL_NEW = ENEMY.map((e, i) => i).filter(i => i >= 4);
const kindOf = t => ENEMY[t.type].kind;
// Veteran and elite enemies (later stages): extra hits, faster shells and engine, more XP; they wear rank stripes
const ENEMY_RANKS = [
  null,
  { hp: 1, shell: 1.3, speed: 1.1, fire: 1.2, xp: 1.5, look: 3 },
  { hp: 2, shell: 1.5, speed: 1.2, fire: 1.5, xp: 2, look: 7 },
];
const zeroKills = () => new Array(ENEMY.length).fill(0);

const PU = {
  HELMET: 0, CLOCK: 1, SHOVEL: 2, STAR: 3, GRENADE: 4, TANK: 5, GUN: 6, SHIP: 7,
  // additions that were not in the original game
  TURBO: 8, RAPID: 9, SPREAD: 10, PIERCE: 11, ROCKET: 12, MINES: 13, GHOST: 14, COIN: 15,
  TURRET: 16, CLAUDE: 17, REVIVE: 18, AIRSTRIKE: 19, BRIDGE: 20, SMOKE: 21,   // see extras.js
  NIGHT: 22,   // night vision (terrain.js)
  WEAPON: 23,   // a weapon crate (weapons.js)
};
// timed effects granted by the new power-ups (stored per tank in t.boost)
const TIMED_BOOSTS = { [PU.TURBO]: 'turbo', [PU.RAPID]: 'rapid', [PU.SPREAD]: 'spread', [PU.PIERCE]: 'pierce', [PU.ROCKET]: 'rocket', [PU.GHOST]: 'ghost', [PU.SMOKE]: 'smoke' };
const TURBO_MULT = 1.75;
// small points for wrecking things: per shell that breaks bricks, per steel block, per tree, per enemy turret,
// per enemy shell shot down
const OBJ_PTS = { brick: 10, steel: 50, tree: 20, turret: 300, shell: 20 };
const ROCKET_RADIUS = 14, MINE_RADIUS = 18, MINE_ARM_TIME = 40, MAX_MINES = 16;
let BASE_X = 96, BASE_Y = 192;
let ENEMY_SPAWN_X = [96, 192, 0];
let PLAYER_SPAWN = [[64, 192], [128, 192], [0, 192], [192, 192]];
let BASE_WALL = [[11, 23], [12, 23], [13, 23], [14, 23], [11, 24], [14, 24], [11, 25], [14, 25]];
// which edge the eagle sits on (ANY SIDE mode turns the map; everything else has it at the bottom):
// BASE_FWD is the way from the eagle into the field, ENEMY_SPAWNS the entry points on the opposite edge
let BASE_SIDE = 'bottom', BASE_FWD = 0, ENEMY_SPAWNS = [[96, 0], [192, 0], [0, 0]], ENEMY_SPAWN_DIR = 2;
const SIDE_FWD = { bottom: 0, top: 2, left: 1, right: 3 };

// the 8px blocks at ring distance d around the eagle's 2x2 blocks, inside the field (row by row)
function baseRing(d) {
  const bx = BASE_X / 8, by = BASE_Y / 8, out = [];
  for (let y = by - d; y <= by + 1 + d; y++) for (let x = bx - d; x <= bx + 1 + d; x++) {
    if (Math.max(Math.max(bx - x, x - bx - 1), Math.max(by - y, y - by - 1)) !== d) continue;
    if (x >= 0 && y >= 0 && x < COLS * 2 && y < ROWS * 2) out.push([x, y]);
  }
  return out;
}

// a block in "eagle at the bottom" terms: u across (the eagle's blocks are 0 and 1), v towards the field
// (-1 = the row just in front of it; the eagle's own rows are 0 and 1)
function baseRel(x, y) {
  const bx = BASE_X / 8, by = BASE_Y / 8;
  switch (BASE_SIDE) {
    case 'top': return [x - bx, by + 1 - y];
    case 'left': return [y - by, bx + 1 - x];
    case 'right': return [y - by, x - bx];
    default: return [x - bx, y - by];
  }
}

// vcols / vrows: the window onto a bigger field that scrolls (big maps); the whole field otherwise
// side: where the eagle is (ANY SIDE mode; square fields only for the sides and the top)
function setFieldSize(cols, rows, vcols = cols, vrows = rows, side = 'bottom') {
  COLS = cols; ROWS = rows;
  FW = cols * 16; FH = rows * 16;
  GW = cols * 4; GH = rows * 4;
  VIEW_W = Math.min(FW, vcols * 16); VIEW_H = Math.min(FH, vrows * 16);
  SCREEN_W = FX + VIEW_W + 32; SCREEN_H = FY * 2 + VIEW_H; HUD_X = FX + VIEW_W + 8;
  // eagle at the centre of its edge (the bottom, normally), with its brick fortress
  BASE_SIDE = side; BASE_FWD = SIDE_FWD[side];
  const across = side === 'left' || side === 'right' ? rows : cols;
  const mid16 = across * 8 - 8, far = side === 'top' || side === 'left' ? 0 : (side === 'bottom' ? FH : FW) - 16;
  [BASE_X, BASE_Y] = side === 'left' || side === 'right' ? [far, mid16] : [mid16, far];
  BASE_WALL = baseRing(1);
  // players I and II beside the eagle, III and IV in the corners on its edge
  const along = (a, d) => (side === 'left' || side === 'right' ? [d, a] : [a, d]);
  PLAYER_SPAWN = [along(mid16 - 32, far), along(mid16 + 32, far), along(0, far), along(across * 16 - 16, far)];
  // enemy entry points along the far edge: centre, then outwards (right, left), more for wide fields
  const n = 2 * Math.max(1, Math.round((across - 1) / 12)) + 1, mid = (n - 1) / 2;
  const at = i => Math.round(i * (across - 1) / (n - 1)) * 16;
  const order = [at(mid)];
  for (let k = 1; k <= mid; k++) order.push(at(mid + k), at(mid - k));
  const opp = side === 'bottom' || side === 'right' ? 0 : (side === 'top' ? FH : FW) - 16;
  ENEMY_SPAWNS = order.map(a => along(a, opp));
  ENEMY_SPAWN_X = ENEMY_SPAWNS.map(p => p[0]);
  ENEMY_SPAWN_DIR = (BASE_FWD + 2) % 4;   // they come in heading for the eagle's edge
}

// turn a 26x26 block map so its bottom edge (the eagle's) faces side
function turnBlocks(blocks, side) {
  if (side === 'bottom') return blocks;
  const n = blocks.length, belt = { left: { '^': '>', '>': 'v', v: '<', '<': '^' }, right: { '^': '<', '>': '^', v: '>', '<': 'v' }, top: { '^': 'v', v: '^', '<': '>', '>': '<' } }[side];
  const out = [];
  for (let y = 0; y < n; y++) {
    let r = '';
    for (let x = 0; x < n; x++) {
      // the old block that lands at (x, y)
      const [ox, oy] = side === 'left' ? [y, n - 1 - x] : side === 'right' ? [n - 1 - y, x] : [n - 1 - x, n - 1 - y];
      const c = blocks[oy][ox];
      r += belt[c] || c;
    }
    out.push(r);
  }
  return out;
}

// Fit a 26x26-block stage into the current field: the original sits at the bottom centre
// (so the eagle lines up) and is mirrored outwards to fill any extra width and height.
function expandBlocks(blocks) {
  const TW = COLS * 2, TH = ROWS * 2;
  if (TW === 26 && TH === 26) return blocks;
  const offX = 2 * Math.floor((COLS - 13) / 2), offY = TH - 26;
  const mirror = (i, n) => { const p = 2 * n, m = ((i % p) + p) % p; return m < n ? m : p - 1 - m; };
  const out = [];
  for (let y = 0; y < TH; y++) {
    let row = '';
    const sy = mirror(y - offY, 26);
    for (let x = 0; x < TW; x++) row += blocks[sy][mirror(x - offX, 26)];
    out.push(row);
  }
  return out;
}
const SPARKLE_TIME = 60;
const BIG_EXPLOSION = () => [Sprites.smallExp[0], Sprites.smallExp[1], Sprites.smallExp[2], Sprites.bigExp[0], Sprites.bigExp[1]];

function rnd(n) { return Math.floor(Math.random() * n); }
function overlap(ax, ay, aw, ah, bx, by, bw, bh) { return ax < bx + bw && bx < ax + aw && ay < by + bh && by < ay + ah; }

// 13x13 tile map or 26x26 block map -> 26 strings of block chars
function mapToBlocks(map) {
  if (map.length === 26) return map.slice();
  const out = new Array(26).fill('');
  for (let ty = 0; ty < 13; ty++) {
    for (let tx = 0; tx < 13; tx++) {
      const p = TILE_PAT[map[ty][tx]] || TILE_PAT['.'];
      out[ty * 2] += p[0];
      out[ty * 2 + 1] += p[1];
    }
  }
  return out;
}

// 4th, 11th, 18th ... enemy carries a power-up
const isBonusSlot = i => i % 7 === 3;

// count: how many tanks (the ENEMIES setting unless given, e.g. a survival wave)
function buildQueue(stageNum, count) {
  const mix = enemyMix(stageNum);
  const list = [];
  mix.forEach((n, type) => { for (let i = 0; i < n; i++) list.push(type); });
  // deterministic shuffle per stage, but keep the weakest tanks mostly up front
  const r = seeded(stageNum * 7919 + 13);
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.max(0, i - 1 - Math.floor(r() * 6));
    [list[i], list[j]] = [list[j], list[i]];
  }
  // stretch or shrink the 20-tank line-up to the configured count
  count = count || Config.get('enemyCount');
  const bonus = Config.on('bonusTanks');
  const out = [];
  for (let i = 0; i < count; i++) out.push({ type: list[Math.floor(i * list.length / count)], bonus: bonus && isBonusSlot(i) });
  // Later stages get tougher: new enemy types join one by one (rocket from stage 4, sapper 7, shield 11,
  // shade 15) and take a growing share of the line-up; veterans appear from stage 10 and elites from stage 20.
  const sk = Config.skill(), mult = ({ OFF: 0, FEW: 0.5, NORMAL: 1, MANY: 1.8 }[Config.get('newEnemies')] || 0) * sk.newMult;
  const s = stageNum, kinds = NEW_TYPES.filter(k => s >= ENEMY[k].from + sk.newShift && Config.get('e' + k + 'On') !== 'OFF');
  if (mult && kinds.length) {
    const share = Math.min(0.6, (0.06 + (s - 4 - sk.newShift) * 0.015) * mult);
    for (let i = 2; i < out.length; i++) {   // never the very first tanks of a stage
      if (r() < share) out[i].type = kinds[Math.floor(r() * kinds.length)];
    }
  }
  if (Config.on('enemyGrowth')) {
    const vs = s + Config.skill().vet;   // harder skills bring veterans and elites sooner
    const vet = Math.min(0.45, Math.max(0, (vs - 9) * 0.02)), elite = Math.min(0.35, Math.max(0, (vs - 19) * 0.015));
    for (const e of out) {
      const x = r();
      e.rank = x < elite ? 2 : x < elite + vet ? 1 : 0;
    }
  }
  return out;
}

// points to spend: everything earned minus what the shop (and revivals) took. Spending never lowers the score,
// so it never costs you the high score
function wallet(p) { return Math.max(0, p.score - (p.spent || 0)); }
function spend(p, n) { p.spent = (p.spent || 0) + n; }

// extra lives for crossing 20,000 points (once, or every 20,000)
function checkExtraLife(p) {
  const mode = Config.get('extraLife');
  if (mode === 'OFF') return false;
  if (mode === 'ONCE') {
    if (p.extraGiven || p.score < 20000) return false;
    p.extraGiven = true;
    p.lives++;
    return true;
  }
  // galaxy's scores run far higher (combos, medals): a life every 250K there
  const n = Math.floor(p.score / (typeof Game !== 'undefined' && Game.mode === 'galaxy' ? 250000 : 20000)), had = p.extraCount || 0;
  if (n <= had) return false;
  p.lives += n - had;
  p.extraCount = n;
  return true;
}

// ------------------------------------------------------------ XP ranks
// level (1-10) reached with this much XP, capped by nothing but the table
function rankFor(xp) {
  let r = 1;
  while (r < RANKS.length && xp >= RANKS[r].xp) r++;
  return r;
}

// what a rank gives (see RANKS); "LOOKS ONLY" keeps the looks but no perks
function rankPerks(level) {
  if (!Config.xpOn() || Config.get('perks') !== 'ON') level = 1;
  return {
    speed: level >= 6 ? 1.2 : level >= 2 ? 1.1 : 1,
    reload: level >= 8 ? 8 : level >= 3 ? 11 : 14,   // frames between shots while fire is held
    shell: level >= 4 ? 1.2 : 1,
    plates: level >= 9 ? 2 : level >= 5 ? 1 : 0,
    star: level >= 7 ? 1 : 0,
    repair: level >= 10,
  };
}
const PLATE_REPAIR = 1800;   // frames for a marshal's plate to grow back

class Tank {
  constructor(o) {
    this.x = 0; this.y = 0; this.dir = 0; this.acc = 0; this.animTick = 0; this.anim = 0;
    this.shield = 0; this.frozen = 0; this.bullets = 0; this.cool = 0; this.slide = 0;
    this.moving = false; this.alive = true; this.ship = false; this.cutter = false; this.power = false;
    this.blocked = 0; this.isPlayer = false; this.player = null; this.type = 0; this.hp = 1; this.bonus = false;
    this.speed = 0.75; this.bulletSpeed = 2.5; this.maxBullets = 1;
    this.boost = {};   // active timed power-ups: name -> frames left
    this.mines = 0;    // mines carried by an enemy tank
    this.ai = 0; this.aiBase = false; this.hold = 0; this.vet = 0; this.hover = false; this.cd = 0; this.maxHp = 0;            // enemy personality (see ai.js)
    this.rocketGun = false; this.frontShield = false; this.crusher = false; this.stealth = false; this.reveal = 0;
    this.plates = 0;   // armour plates (XP perk): each one soaks a hit
    this.repair = 0;
    this.glow = 0;     // level-up flash
    Object.assign(this, o);
  }
  applyLevel() {
    const p = this.player, lv = p.level, perk = rankPerks(p.rank || 1);
    this.speed = 0.75 * Config.scale('pSpeed') * perk.speed;
    this.bulletSpeed = (lv >= 1 ? 4.5 : 2.5) * Config.scale('pShell') * perk.shell;
    this.reload = perk.reload;
    this.maxBullets = lv >= 2 ? 2 : 1;
    this.power = lv >= 3;
    this.cutter = p.cutter;
    this.ship = p.ship;
  }
}

class Stage {
  constructor(num, map, players, opts = {}) {
    this.num = num;
    this.players = players;
    this.twoP = players.length > 1;
    this.extraPlayers = Math.max(0, players.length - 1);
    this.terrain = new Uint8Array(GW * GH);
    const classic = COLS === 13 && ROWS === 13;
    // blocks: a stitched big map, or a custom level of its own size (opts.cl: it keeps the fortress as painted)
    this.load(opts.blocks || expandBlocks(mapToBlocks(map)), !opts.custom || (!classic && !opts.cl));
    // the season: its colours, and frozen or dried-up water (seasons.js)
    this.theme = stageTheme(num, opts);
    if (!opts.snapshot && !opts.editor) this.applyThemeTerrain(num);   // the editor shows what you drew
    // lava, bog, concrete and the rest of a terrain type's own (biomes.js): in the normal stages
    if (!opts.boss && !opts.custom && !opts.snapshot && !opts.editor && !opts.corridor && !opts.maze && !opts.fortress && !opts.galaxy) this.applyBiome(num);
    // mud, teleporters and belts in the normal stages; night and fog on some (terrain.js)
    if (!opts.boss && !opts.custom && !opts.snapshot && !opts.corridor && !opts.maze && !opts.fortress && !opts.galaxy && Config.on('terrainExtras')) this.addTerrainExtras(num);
    this.weather = opts.corridor || opts.fortress || opts.galaxy ? null : stageWeather(opts.custom ? 1 : num, !!opts.boss);
    this.outposts = []; this.factories = [];
    if (opts.big) this.setupBigMap(opts.big);   // bigmap.js
    this.tanks = [];
    this.bullets = [];
    this.fx = [];
    this.popups = [];
    this.spawns = [];
    this.powerup = null;
    this.mines = [];
    this.bosses = []; this.beams = []; this.tracks = []; this.dust = []; this.puffs = []; this.bossNote = null;
    this.flames = []; this.shells = []; this.heals = []; this.mark = null; this.jamList = [];   // see enemies.js
    this.turrets = []; this.claudes = []; this.strikes = []; this.reviveWait = 0;              // see extras.js
    this.snakeList = [];
    this.wfx = []; this.wshots = [];   // player weapons: beams and shells in flight (weapons.js)
    this.decoy = null;
    this.applyBase(opts.base);                 // base upgrades from the shop (base.js)
    this.origTerrain = this.terrain.slice();   // what a mason rebuilds
    this.lastBrickSound = -1;
    this.queue = buildQueue(num, opts.big ? Math.min(60, Config.get('enemyCount') * 2) : 0);   // big maps: twice the tanks
    this.total = this.queue.length;
    this.killed = 0;
    this.spawnTimer = 0;
    this.spawnPos = 0;
    this.spawnInterval = Math.round(Math.max(70, 190 - ((num - 1) % 35) * 4 - (this.twoP ? 20 : 0)) / Config.scale('spawnRate') / Config.skill().spawn);
    this.maxEnemies = Math.max(1, Config.get('maxOnScreen') + [0, 2, 3, 4][this.extraPlayers] + Config.skill().maxOn + (opts.big ? 2 : 0));
    this.freezeE = 0;
    this.freezeP = 0;
    this.shovel = 0;
    this.baseAlive = true;
    this.over = false;
    this.overTimer = 0;
    this.clearTimer = 0;
    this.result = null;
    this.frame = 0;
    this.dirty = true;
    AutoSkill.stageStart();
    // game modes (modes.js)
    this.noBase = false;
    if (opts.vs) this.setupVersus(opts.vs);
    if (opts.survival) this.setupSurvival();
    if (opts.corridor) this.setupCorridor();   // corridor.js
    if (opts.cpu) this.setupCpu(opts.cpu);      // VS EAGLES against the computer (cpuvs.js)
    if (opts.race) this.setupRace(opts.race.target, opts.race.round);   // KILL RACE (race.js)
    if (opts.maze) this.setupMaze(opts.maze);   // MAZE (maze.js)
    if (opts.fortress) this.setupFortress(opts.fortress);   // FORTRESS (fortress.js)
    if (opts.galaxy) this.setupGalaxy(opts.galaxy);   // GALAXY (galaxy.js)
    if (opts.timeAttack) this.spawnInterval = Math.round(this.spawnInterval / 2);
    for (const p of players) {
      p.kills = zeroKills();
      if (!opts.snapshot) { p.stageXp = 0; p.late = []; p.carryNext = null; }
      p.tank = null;
      if (!p.out && !opts.snapshot) this.spawnPlayer(p, 0);
      // a shovel charge bought in the shop fortifies the eagle from the start
      if (p.shopShovel) {
        p.shopShovel = false;
        this.shovel = Config.frames('shovelTime');
        this.setBaseWalls(T_STEEL);
      }
    }
    this.setupSeason(opts);   // the season's twist and its own enemy (seasonal.js)
    this.setupBio(opts);   // barrels, gas, bombs and blackouts (biomes.js)
    this.setupSecrets(opts);   // hidden power-ups and ? blocks (secrets.js)
    if (opts.boss) this.initBoss(opts.boss);
    if (opts.cl) this.setupCustomLevel(opts.cl, opts);   // a custom level's markers and rules (editor2.js)
    if (opts.snapshot) this.restore(opts.snapshot);
    else if (this.claudeLevel() >= 5 && !this.vs) this.claudeAtStart();   // CLAUDE LEVEL 5 (extras.js)
  }

  // ------------------------------------------------------------ save / load
  // Everything needed to resume this stage later (shells in flight and effects are dropped).
  snapshot() {
    const tankKeys = ['x', 'y', 'dir', 'isPlayer', 'type', 'hp', 'bonus', 'shield', 'frozen', 'ship', 'cutter', 'power',
      'speed', 'bulletSpeed', 'maxBullets', 'boost', 'mines', 'plates', 'repair',
      'ai', 'aiBase', 'hold', 'rocketGun', 'frontShield', 'crusher', 'stealth', 'vet', 'hover', 'cd', 'maxHp', 'slither', 'segN', 'trail', 'ally'];
    return {
      cols: COLS, rows: ROWS,
      terrain: terrainCode(this.terrain),
      queue: this.spawns.filter(s => s.enemy).map(s => s.enemy).concat(this.queue),
      total: this.total, killed: this.killed, spawnTimer: this.spawnTimer, spawnPos: this.spawnPos,
      spawnInterval: this.spawnInterval, maxEnemies: this.maxEnemies,
      freezeE: this.freezeE, freezeP: this.freezeP, shovel: this.shovel, baseAlive: this.baseAlive, frame: this.frame,
      powerup: this.powerup,
      mines: this.mines.map(m => ({ x: m.x, y: m.y, byPlayer: m.byPlayer, t: m.t, pi: m.owner && m.owner.player ? m.owner.player.i : -1 })),
      tanks: this.tanks.filter(t => t.alive).map(t => {
        const o = {};
        for (const k of tankKeys) o[k] = t[k];
        o.pi = t.player ? t.player.i : -1;
        return o;
      }),
      kills: this.players.map(p => p.kills.slice()),
      eagleArmor: this.eagleArmor,
      decoy: this.decoy,
      pads: this.pads, weather: this.weather, theme: this.theme,
      vcols: VIEW_W / 16, vrows: VIEW_H / 16, big: this.big || null, outposts: this.outposts, factories: this.factories,
      turrets: this.turrets.map(tu => Object.assign({}, tu, { owner: tu.owner ? tu.owner.i : -1 })),
      claudes: this.claudes.map(c => Object.assign({}, c, { p: c.p ? c.p.i : -1 })),
      boss: this.bossIdx === undefined ? null : {
        idx: this.bossIdx, loop: this.bossLoop, dropAt: this.bossDropAt, defeated: !!this.bossDefeated,
        bosses: this.bosses.map(b => Object.assign({}, b, { bullets: 0 })),
      },
    };
  }

  restore(sn) {
    for (let i = 0; i < this.terrain.length; i++) this.terrain[i] = sn.terrain.charCodeAt(i) - 48;
    this.dirty = true;
    for (const k of ['queue', 'total', 'killed', 'spawnTimer', 'spawnPos', 'spawnInterval', 'maxEnemies', 'freezeE', 'freezeP', 'shovel', 'baseAlive', 'frame', 'powerup']) this[k] = sn[k];
    if (sn.eagleArmor !== undefined) this.eagleArmor = sn.eagleArmor;
    this.decoy = sn.decoy || null;
    if (sn.pads) this.pads = sn.pads;
    if (sn.big) { this.big = sn.big; this.outposts = sn.outposts || []; this.factories = sn.factories || []; }
    if (sn.weather !== undefined) this.weather = sn.weather;
    if (sn.theme) { this.theme = sn.theme; this.dirty = true; }
    this.turrets = (sn.turrets || []).map(tu => Object.assign({}, tu, { owner: this.players[tu.owner] || null }));
    this.claudes = (sn.claudes || []).map(c => Object.assign({}, c, { p: this.players[c.p] || null }));
    this.spawns = [];
    for (const p of this.players) { p.tank = null; p.kills = zeroKills().map((z, k) => (sn.kills[p.i] || [])[k] || 0); }
    this.tanks = sn.tanks.map(o => {
      const t = new Tank(Object.assign({}, o, { boost: Object.assign({}, o.boost) }));
      delete t.pi;
      if (o.pi >= 0) { t.player = this.players[o.pi]; if (!o.ally) t.player.tank = t; }
      return t;
    });
    // players who were waiting to respawn come back at their spawn point
    for (const p of this.players) if (!p.out && !p.tank) this.spawnPlayer(p, 0);
    this.mines = sn.mines.map(m => Object.assign({}, m, { owner: m.byPlayer && this.players[m.pi] ? { isPlayer: true, player: this.players[m.pi] } : null }));
    if (sn.boss) {
      this.bossIdx = sn.boss.idx;
      this.bossLoop = sn.boss.loop;
      this.bossDropAt = sn.boss.dropAt;
      this.bossDefeated = sn.boss.defeated;
      this.bossBanner = 0;
      this.bosses = sn.boss.bosses.map(o => new Boss(o));
    }
  }

  // ------------------------------------------------------------ terrain
  load(blocks, forceBase) {
    this.pads = padsFromBlocks(blocks);
    for (let by = 0; by < ROWS * 2; by++) {
      for (let bx = 0; bx < COLS * 2; bx++) {
        this.setBlock(bx, by, BLOCK_TYPE[blocks[by][bx]] || T_EMPTY);
      }
    }
    // keep spawn points free of solid terrain
    const clearSolid = (bx, by) => {
      for (let y = by; y < by + 2; y++) for (let x = bx; x < bx + 2; x++) {
        const t = this.get(x * 2, y * 2);
        if (t === T_BRICK || t === T_STEEL || t === T_WATER || t >= T_LAVA) this.setBlock(x, y, T_EMPTY);
      }
    };
    ENEMY_SPAWNS.forEach(([x, y]) => clearSolid(x / 8, y / 8));
    PLAYER_SPAWN.forEach(([x, y]) => clearSolid(x / 8, y / 8));
    // the eagle and its fortress
    for (let y = BASE_Y / 8; y < BASE_Y / 8 + 2; y++) for (let x = BASE_X / 8; x < BASE_X / 8 + 2; x++) this.setBlock(x, y, T_EMPTY);
    if (forceBase) this.setBaseWalls(T_BRICK);
  }
  get(cx, cy) {
    if (cx < 0 || cy < 0 || cx >= GW || cy >= GH) return -1;
    return this.terrain[cy * GW + cx];
  }
  set(cx, cy, t) {
    if (cx < 0 || cy < 0 || cx >= GW || cy >= GH) return;
    this.terrain[cy * GW + cx] = t;
    this.terrainVer = (this.terrainVer || 0) + 1;
    // the online host sends terrain changes to guests
    if (Net.role === 'host') (this.netDiff || (this.netDiff = [])).push(cy * GW + cx, t);
    // once the layers are drawn, only the changed cells are redrawn (a full redraw of a huge map takes a while);
    // water and belts are listed for animation, so a change to or from them redraws everything
    const old = this.layerOf && this.layerOf[cy * GW + cx];
    if (this.bgLayer && !this.dirty && this.layerOf && old !== T_WATER && t !== T_WATER && !isBelt(old) && !isBelt(t) && !bioAnim(old) && !bioAnim(t)) (this.dirtyCells || (this.dirtyCells = [])).push(cy * GW + cx);
    else if (this.bgLayer && !this.dirty && this.layerOf && old === T_WATER && t !== T_WATER && !isBelt(t) && !bioAnim(t) && this.waterCells) {
      // water bridged or filled in: just that cell (a bridge over a big map's river shouldn't redraw the lot)
      const k = this.waterCells.indexOf(cy * GW + cx);
      if (k >= 0) this.waterCells.splice(k, 1);
      (this.dirtyCells || (this.dirtyCells = [])).push(cy * GW + cx);
    } else this.dirty = true;
  }
  setBlock(bx, by, t) {
    for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) this.set(bx * 2 + x, by * 2 + y, t);
  }
  clearGroup(cx, cy, type) {
    const bx = cx & ~1, by = cy & ~1;
    for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) if (this.get(bx + x, by + y) === type) this.set(bx + x, by + y, T_EMPTY);
  }
  // brick means "the normal walls": steel where the WALLS base upgrade says so
  setBaseWalls(t) {
    BASE_WALL.forEach(([bx, by], i) => this.setBlock(bx, by, t === T_BRICK ? this.baseWallType(i) : t));
  }
  onIce(t) {
    return this.get((t.x + 8) >> 2, (t.y + 8) >> 2) === T_ICE;
  }

  // ------------------------------------------------------------ spawning
  spawnPlayer(p, delay) {
    const [x, y] = this.corridor ? this.corridorSpawnPoint(p) : this.maze ? this.mazeSpawnPoint(p) : (this.vsSpawn || PLAYER_SPAWN)[p.i];
    this.spawns.push({ x, y, t: SPARKLE_TIME + delay, player: p });
  }

  updateSpawning() {
    if (this.queue.length === 0 || this.maze) return;   // the maze brings its own (maze.js)
    if (this.spawnTimer > 0) { this.spawnTimer--; return; }
    const onField = this.tanks.filter(t => !t.isPlayer).length + this.spawns.filter(s => s.enemy).length;
    if (onField >= this.maxEnemies) return;
    // pick the next entry point that no boss is sitting on
    let x = -1, y = 0;
    if (this.spawnXs || BASE_SIDE === 'bottom') {
      const xs = this.spawnXs || ENEMY_SPAWN_X;
      for (let k = 0; k < xs.length && x < 0; k++) {
        const cand = xs[this.spawnPos++ % xs.length];
        if (!this.bossBlocksSpawn(cand)) x = cand;
      }
    } else [x, y] = ENEMY_SPAWNS[this.spawnPos++ % ENEMY_SPAWNS.length];   // ANY SIDE: the edge across from the eagle
    if (x < 0) return;
    // KILL RACE: anywhere on the map (race.js); the top row if no spot is free
    const spot = this.race && this.raceSpawnSpot();
    if (spot) [x, y] = spot;
    const item = this.queue.shift();
    this.spawns.push({ x, y, t: SPARKLE_TIME, enemy: item });
    if (item.bonus) this.powerup = null;
    this.spawnTimer = this.spawnInterval;
  }

  updateSpawns() {
    for (const s of this.spawns) {
      s.t--;
      if (s.t > 0) continue;
      if (s.enemy) {
        if (this.tanks.some(t => overlap(t.x, t.y, 16, 16, s.x, s.y, 16, 16)) || this.bossBlocksTank({ x: -99, y: -99 }, s.x, s.y)) { s.t = 1; continue; }
        const st = Config.enemy(s.enemy.type);
        const type = s.enemy.type, vet = s.enemy.rank || 0, vr = ENEMY_RANKS[vet] || { hp: 0, shell: 1, speed: 1 };
        this.tanks.push(new Tank({
          x: s.x, y: s.y, dir: ENEMY_SPAWN_DIR, type, hp: s.enemy.hp || st.hp + vr.hp, bonus: s.enemy.bonus, vet,
          speed: st.speed * vr.speed * Config.skill().speed, bulletSpeed: st.bullet * vr.shell * Config.skill().shell, maxBullets: 1,
          ai: s.enemy.ai !== undefined ? s.enemy.ai : this.noBase ? noBasePersonality() : pickPersonality(type, this.num),
          aiBase: !this.noBase && type !== 4 && Math.random() < 0.3 * Config.skill().baseAim,  // some snipers shell the eagle instead of you (not rocket tanks)
          rocketGun: type === 4, frontShield: type === 5, crusher: type === 6, stealth: type === 7,
          mines: type === 6 ? 3 : 0, hover: type === 10,
          slither: ENEMY[type].kind === 'snake', segN: 4, trail: ENEMY[type].kind === 'snake' ? [] : null,
        }));
        const nt = this.tanks[this.tanks.length - 1];
        if (s.enemy.extra) { Object.assign(nt, s.enemy.extra); if (nt.speedMul) nt.speed *= nt.speedMul; }   // fortress waves (titans, faster tanks)
        this.enemySpawned(nt);
      } else if (s.ally) {
        if (this.tanks.some(t => overlap(t.x, t.y, 16, 16, s.x, s.y, 16, 16))) { s.t = 1; continue; }
        this.makeWingman(s);
      } else {
        const p = s.player;
        const t = new Tank({ x: s.x, y: s.y, dir: BASE_FWD, isPlayer: true, player: p, shield: Math.round(Config.frames('spawnShield') * (Config.skill().shield || 1)) });
        const perk = rankPerks(p.rank || 1);
        p.level = Math.max(p.level, perk.star);
        t.plates = Math.max(perk.plates, Config.skill().plates);   // the easiest skill: a plate every life
        t.applyLevel();
        p.tank = t;
        // items bought in the shop take effect on the first spawn of the stage
        if (p.kit) {
          if (p.kit.helmet) t.shield = Math.max(t.shield, Config.frames('helmetTime'));
          for (const k of ['turbo', 'rapid', 'rocket', 'pierce', 'spread', 'ghost', 'smoke']) if (p.kit[k]) t.boost[k] = Config.frames('newTime');
          if (p.kit.claude) this.summonClaude(t.x, Math.max(0, t.y - 16), p);
          if (p.kit.wingman) this.spawnWingman(p);
          if (p.kit.decoy) this.placeDecoy();
          p.kit = null;
        }
        if (p.carry) this.applyCarry(p, t);   // power-ups from the end of the last stage, twice as long
        this.tanks.push(t);
      }
      s.done = true;
    }
    this.spawns = this.spawns.filter(s => !s.done);
  }

  // ------------------------------------------------------------ main update
  update() {
    this.frame++;
    if (this.galaxy) { this.updateGalaxy(); return; }   // GALAXY plays by its own rules (galaxy.js)
    if (this.freezeE > 0) this.freezeE--;
    if (this.freezeP > 0) this.freezeP--;
    this.updateShovel();
    this.updateCards();
    if (this.nightVision > 0) this.nightVision--;
    if (!this.over) this.updateSpawning();
    this.updateSpawns();
    for (const t of this.tanks) {
      if (!t.alive) continue;
      // inside a jammer's field your timed power-ups stop counting down
      if (!(t.isPlayer && this.jamList.length && this.jammed(t.x + 8, t.y + 8))) for (const k in t.boost) if (--t.boost[k] <= 0) delete t.boost[k];
      if (t.ally) this.updateAlly(t); else if (t.isPlayer) this.updatePlayer(t); else this.updateEnemy(t);
    }
    this.updateTerrainFx();
    this.updateSpecials();
    this.updateSeason();
    this.updateBio();   // lava, bog, vents, barrels, gas (biomes.js)
    this.updateSecrets();
    this.updateBase();
    if (this.cpu) this.updateCpu();
    this.updateTurrets();
    this.updateClaudes();
    this.updateStrikes();
    if (!this.over || this.reviveWait > 0) this.updateRevival();
    this.updateBosses();
    this.updateBullets();
    this.updateWeapons();
    this.updateMines();
    this.tanks = this.tanks.filter(t => t.alive);
    this.checkPickups();
    if (this.powerup) this.powerup.t++;
    for (const f of this.fx) f.tick++;
    this.fx = this.fx.filter(f => f.tick < f.frames.length * f.per); // negative tick = delayed
    for (const p of this.popups) p.t++;
    this.popups = this.popups.filter(p => p.t < p.delay + (p.life || 48));
    if (this.rankMsg && --this.rankMsg.t <= 0) this.rankMsg = null;

    // engine hum
    const pt = this.tanks.filter(t => t.isPlayer);
    Sound.setEngine(pt.length === 0 ? 0 : (pt.some(t => t.moving || t.slide > 0) ? 2 : 1));

    // stage end
    if (this.over) {
      this.overTimer++;
      if (this.overTimer >= 320) this.result = 'gameover';
    } else if (this.vs) {
      this.updateVersus();
    } else if (this.corridor) {
      this.updateCorridor();
    } else if (this.maze && !this.maze.escaped) {
      this.updateMaze();
    } else if (this.td) {
      this.updateFortress();
    } else if (this.cpu && this.cpu.alive) {
      // against the computer the round goes on until their HQ falls
    } else if (this.big && this.factoriesAlive()) {
      this.updateBigMap();
    } else if (this.queue.length === 0 && !this.spawns.some(s => s.enemy) && !this.tanks.some(t => !t.isPlayer && !t.mirage) && !this.bossAlive() && !this.seasonPending()) {
      if (this.survival) { this.nextWave(); return; }
      this.clearTimer++;
      if (this.clearTimer === 1) {
        for (const t of this.tanks) if (t.mirage) this.vanishMirage(t, false);
        for (const p of this.players) if (!p.out) this.addXp(p, 25);
        if (this.big) this.bigMapBonus();
        AutoSkill.event('clear');
        this.carryOnClear();
      }
      if (this.clearTimer >= 190) { this.result = 'clear'; this.carryToNext(); }
    }
  }

  updateShovel() {
    if (this.shovel <= 0 || this.noBase) return;
    this.shovel--;
    if (this.shovel === 0) this.setBaseWalls(T_BRICK);
    else if (this.shovel <= 240) {
      const ph = this.shovel % 32;
      if (ph === 0) this.setBaseWalls(T_STEEL);
      else if (ph === 16) this.setBaseWalls(T_BRICK);
    }
  }

  // ------------------------------------------------------------ tanks
  updatePlayer(t) {
    const p = t.player;
    if (t.shield > 0) t.shield--;
    if (t.glow > 0) t.glow--;
    // a marshal's armour plates grow back
    const perk = rankPerks(p.rank || 1);
    if (perk.repair && t.plates < perk.plates && ++t.repair >= PLATE_REPAIR) {
      t.repair = 0;
      t.plates++;
      Sound.play('build');
      this.popups.push({ x: t.x + 8, y: t.y, text: 'PLATE', label: true, color: COL.lgrey, t: 0, delay: 0 });
    }
    if (t.cool > 0) t.cool--;
    if (t.frozen > 0) { t.frozen--; t.moving = false; return; }
    if (this.over || this.freezeP > 0) { t.moving = false; t.slide = 0; return; }
    const inp = p.bot ? this.botInput(t) : Input.player(p.i);   // deathmatch bots (bots.js)
    if (this.td && this.fortressInput(t, p, inp)) return;   // B: the build menu (fortress.js)
    if (inp.dir >= 0) {
      this.turn(t, inp.dir);
      // a bridge kit lays a bridge when you drive into water
      if (!this.move(t, t.dir) && p.bridges > 0 && !t.ship && this.waterAhead(t) && this.layBridge(t)) p.bridges--;
      t.moving = true;
      t.slide = 0;
    } else {
      if (t.moving && this.onIce(t)) { t.slide = 28; Sound.play('skid'); }
      t.moving = false;
      if (t.slide > 0) {
        t.slide--;
        if (!this.move(t, t.dir)) t.slide = 0;
      }
    }
    // B places a turret / drops a mine while you carry some; otherwise it fires like A
    const hasTur = p.turrets > 0, hasMines = p.mines > 0, hasB = hasTur || hasMines;
    if (hasTur && inp.altPressed) { this.placeTurret(t.x, t.y, p, false); p.turrets--; }
    else if (hasMines && inp.altPressed) { this.dropMine(t); p.mines--; }
    const firePressed = inp.firePressed || (!hasB && inp.altPressed);
    const fireHeld = inp.fire || (!hasB && inp.alt);
    if (p.weapon && p.weapon !== 'cannon') { this.fireWeapon(t, p, firePressed, fireHeld); return; }   // weapons.js
    if (firePressed || (fireHeld && t.cool === 0)) {
      if (this.fire(t)) t.cool = t.boost.rapid ? 5 : t.reload || 14;
    }
  }

  updateEnemy(t) {
    if (t.shield > 0) t.shield--;
    if (t.reveal > 0) t.reveal--;
    if (this.freezeE > 0) return;
    if (t.stun > 0) { t.stun--; return; }   // an EMP tower's jolt (fortress.js)
    if (t.hopT > 0) { this.hopStep(t); return; }   // in the air (hopper)
    if (t.cool > 0) t.cool--;
    const smart = t.ai > 0;
    let ok = true;
    if (t.hold > 0) {
      // a sniper parked in position; it moves on if a player gets too close
      t.hold--;
      const pt = this.nearestPlayer(t);
      if (t.ai === AI.SNIPE && pt && Math.abs(pt.x - t.x) + Math.abs(pt.y - t.y) < SNIPE_MIN - 8) t.hold = 0;
    } else {
      if (t.yieldT > 0) t.yieldT--;
      // a slow tank doesn't step every frame; on the frames between, ask whether its next step is open, so a blocked
      // tank counts as blocked every frame (else it never gets round to turning away)
      ok = this.move(t, t.dir) && this.canStep(t, t.dir);
      if (!ok) {
        t.blocked++;
        const other = this.tankAhead(t);
        if (!other && t.blocked > 4 && kindOf(t) === 'hopper' && this.tryHop(t)) { t.blocked = 0; return; }
        if (other) {
          // another tank in the way: one of the two steps aside and lets it pass (the other waits a moment first,
          // so two tanks nose to nose in a lane don't both turn back and forth for ever)
          if (t.yieldRank === undefined) t.yieldRank = Math.random();
          const headOn = !other.isPlayer && other.dir === (t.dir + 2) % 4;
          const wait = headOn && (other.yieldRank === undefined || other.yieldRank > t.yieldRank) ? 4 : 30;
          if (t.blocked >= wait) { this.stepAside(t); t.blocked = 0; }
        } else {
          // personalities shoot their way through bricks instead of turning away
          const wait = smart && this.brickAhead(t) ? 40 : 6;
          if (t.blocked >= wait && Math.random() < 0.3) {
            if (t.yieldT > 0) this.stepAside(t);
            else if (smart || this.markedTank(t)) this.aiChoose(t, true); else this.chooseDir(t, true);
            t.blocked = 0;
          }
        }
      } else {
        t.blocked = 0;
        if ((t.x & 7) === 0 && (t.y & 7) === 0 && !(t.yieldT > 0)) {
          if (smart || this.markedTank(t)) this.aiChoose(t, false);
          else if (Math.random() < 1 / 20) this.chooseDir(t, false);
        }
      }
    }
    if (t.mines > 0 && ok && !t.hold && Math.random() < (t.crusher ? 1 / 150 : 1 / 180)) { this.dropMine(t); t.mines--; }
    const kind = kindOf(t);
    if (kind === 'flamer' || kind === 'mortar' || kind === 'snake' || kind === 'gator' || kind === 'truck') { this[kind + 'Act'](t); return; }
    if (t.burrow > 0) return;   // underground: no shooting
    const maxB = t.boost.rapid ? 3 : 1;
    if (t.bullets < maxB && t.cool === 0) {
      let chance = ok ? 0.022 : 0.07;
      if (this.targetInSight(t)) chance = 0.15;
      if (t.hold > 0) chance = 0.1;
      else if (smart && !ok && this.brickAhead(t)) chance = 0.2;
      chance *= Config.scale('enemyFire') * (t.boost.rapid ? 3 : 1) * (t.vet ? ENEMY_RANKS[t.vet].fire : 1) * (ENEMY[t.type].fire || 1);
      if (this.mark) chance *= 1.5;   // a spotter's mark: everyone shoots more
      chance *= Config.skill().fire * (this.weather === 'night' || this.blizzard > 0 ? 0.8 : 1);   // they can't see well at night either
      if (Math.random() < chance) { this.fire(t); t.cool = t.rocketGun ? 50 : 16; }
    }
  }

  // something worth a shot straight ahead: a player or an eagle in line, close enough to notice (see SKILLS)
  targetInSight(t) {
    const sk = Config.skill();
    const targets = this.baseGoals().map(g => Object.assign({ range: sk.baseSight }, g))
      .concat(this.tanks.filter(o => o.isPlayer && !o.boost.smoke).map(o => ({ x: o.x, y: o.y, range: sk.sight })));
    for (const o of targets) {
      const dx = o.x - t.x, dy = o.y - t.y;
      if (Math.abs(dx) + Math.abs(dy) > o.range) continue;
      if (Math.abs(dx) < 8 && ((t.dir === 0 && dy < 0) || (t.dir === 2 && dy > 0))) return true;
      if (Math.abs(dy) < 8 && ((t.dir === 3 && dx < 0) || (t.dir === 1 && dx > 0))) return true;
    }
    return false;
  }

  chooseDir(t, blocked) {
    const r = Math.random();
    const pBase = Math.min(0.8, Math.min(0.5, 0.25 + this.num * 0.008) * Config.scale('enemyAim') * Config.skill().baseAim);
    let target = null;
    if (r < pBase) target = this.baseTarget(t);
    else if (r < pBase + 0.2) {
      const ps = this.tanks.filter(o => o.isPlayer && !o.boost.smoke);
      if (ps.length) target = ps[rnd(ps.length)];
    }
    let d;
    if (target) {
      const dx = target.x - t.x, dy = target.y - t.y;
      if (Math.abs(dx) < 4) d = dy > 0 ? 2 : 0;
      else if (Math.abs(dy) < 4) d = dx > 0 ? 1 : 3;
      else d = Math.random() < Math.abs(dx) / (Math.abs(dx) + Math.abs(dy)) ? (dx > 0 ? 1 : 3) : (dy > 0 ? 2 : 0);
    } else {
      d = rnd(4);
    }
    if (blocked && d === t.dir) d = Math.random() < 0.5 ? (d + 1) % 4 : (d + 3) % 4;
    // blocked: never pick another way that's shut too
    if (blocked && !this.canStep(t, d)) {
      const free = [0, 1, 2, 3].filter(k => k !== t.dir && this.canStep(t, k));
      if (free.length) d = free[rnd(free.length)];
    }
    this.turn(t, d);
  }

  turn(t, d) {
    if (d === t.dir) return;
    if ((d & 1) !== (t.dir & 1)) {
      // turning 90°: snap to the 8px grid like the original
      if (d & 1) t.y = Math.round(t.y / 8) * 8;
      else t.x = Math.round(t.x / 8) * 8;
    }
    t.dir = d;
  }

  move(t, d) {
    t.acc += t.speed * (t.boost.turbo ? TURBO_MULT : 1) * (t.isPlayer ? (this.cpu ? this.cpuTrap(t) : 1) : this.trapFactor(t) * (t.chill || 1)) * this.mudFactor(t);
    let ok = true;
    while (t.acc >= 1) {
      t.acc -= 1;
      if (this.canStep(t, d)) {
        t.x += DXY[d][0];
        t.y += DXY[d][1];
        t.animTick++;
        if (t.crusher) this.crush(t);
        if (t.trail) { t.trail.unshift([t.x + 8, t.y + 8]); t.trail.length = Math.min(t.trail.length, (t.segN + 1) * SNAKE_GAP); }
      } else {
        ok = false;
        t.acc = 0;
        break;
      }
    }
    t.anim = (t.animTick >> 1) & 1;
    return ok;
  }

  // a sapper's dozer blade flattens the bricks it drives into
  crush(t) {
    let n = 0;
    for (let cy = t.y >> 2; cy <= (t.y + 15) >> 2; cy++) for (let cx = t.x >> 2; cx <= (t.x + 15) >> 2; cx++) {
      const v = this.get(cx, cy);
      if (v === T_BRICK) { this.set(cx, cy, T_EMPTY); n++; }
      else if (v === T_CRATE || v === T_LAMP) this.bioCrush(cx, cy, v);
    }
    if (n && this.lastBrickSound < this.frame - 20) { Sound.play('brick'); this.lastBrickSound = this.frame; }
  }

  // the tank right in front of t, if any
  tankAhead(t) {
    const nx = t.x + DXY[t.dir][0] * 2, ny = t.y + DXY[t.dir][1] * 2;
    return this.tanks.find(o => o !== t && o.alive && overlap(nx, ny, 16, 16, o.x, o.y, 16, 16) && !overlap(t.x, t.y, 16, 16, o.x, o.y, 16, 16)) || null;
  }

  // get out of the way: sideways if there's room (either side, at random), else back; keep going that way for a
  // little while before planning a route again
  stepAside(t) {
    const side = Math.random() < 0.5 ? [1, 3] : [3, 1];
    const tries = side.map(k => (t.dir + k) % 4).concat([(t.dir + 2) % 4]);
    const d = tries.find(dd => this.canStep(t, dd));
    if (d === undefined) return;
    this.turn(t, d);
    t.yieldT = 24 + rnd(32);
  }

  canStep(t, d) {
    const nx = t.x + DXY[d][0], ny = t.y + DXY[d][1];
    if (nx < 0 || ny < 0 || nx > FW - 16 || ny > FH - 16) return false;
    // only the leading edge is tested, so a tank that was snapped into a wall can still back out
    let x0, x1, y0, y1;
    switch (d) {
      case 0: x0 = nx; x1 = nx + 15; y0 = y1 = ny; break;
      case 2: x0 = nx; x1 = nx + 15; y0 = y1 = ny + 15; break;
      case 1: y0 = ny; y1 = ny + 15; x0 = x1 = nx + 15; break;
      default: y0 = ny; y1 = ny + 15; x0 = x1 = nx; break;
    }
    for (let cy = y0 >> 2; cy <= y1 >> 2; cy++) {
      for (let cx = x0 >> 2; cx <= x1 >> 2; cx++) {
        const tt = this.get(cx, cy);
        if (tt === T_STEEL || (tt === T_BRICK && !t.boost.ghost && !t.crusher && !t.slither)) return false;
        if (tt === T_WATER && !t.ship && !t.boost.ghost && !t.hover) return false;
        if (tt >= T_LAVA && this.bioBlocks(t, tt)) return false;   // basalt, concrete, barrels, lava for the enemy (biomes.js)
      }
    }
    if (!this.noBase && overlap(nx, ny, 16, 16, BASE_X, BASE_Y, 16, 16)) return false;
    if (this.vsEagles && this.vsEagles.some(e => overlap(nx, ny, 16, 16, e.x, e.y, 16, 16))) return false;
    if (this.cpu && this.cpu.alive && overlap(nx, ny, 16, 16, this.cpu.x, this.cpu.y, 16, 16)) return false;
    if (this.big) {
      if (this.outposts.some(o => o.alive && overlap(nx, ny, 16, 16, o.x, o.y, 16, 16))) return false;
      if (this.factories.some(f => f.hp > 0 && overlap(nx, ny, 16, 16, f.x, f.y, 32, 32) && !overlap(t.x, t.y, 16, 16, f.x, f.y, 32, 32))) return false;
    }
    if (this.decoy && overlap(nx, ny, 16, 16, this.decoy.x, this.decoy.y, 16, 16)) return false;
    if (this.bosses.length && this.bossBlocksTank(t, nx, ny)) return false;
    if (this.turrets.length) {
      const tu = this.turretAt(nx, ny, 16, 16);
      if (tu && !overlap(t.x, t.y, 16, 16, tu.x, tu.y, 16, 16)) return false;
    }
    if (this.towers && this.towers.length && this.towers.some(q => overlap(nx, ny, 16, 16, q.x, q.y, 16, 16) && !overlap(t.x, t.y, 16, 16, q.x, q.y, 16, 16))) return false;
    if (this.qblocks && this.qblocks.length && this.qblocks.some(q => overlap(nx, ny, 16, 16, q.x, q.y, 16, 16) && !overlap(t.x, t.y, 16, 16, q.x, q.y, 16, 16))) return false;
    if (t.burrow > 0 || t.mirage) return true;   // under the sand, or not really there: nothing in the way
    for (const o of this.tanks) {
      if (o === t || !o.alive || o.burrow > 0 || o.mirage || o.hopT > 0) continue;
      if (overlap(nx, ny, 16, 16, o.x, o.y, 16, 16) && !overlap(t.x, t.y, 16, 16, o.x, o.y, 16, 16)) return false;
    }
    return true;
  }

  fire(t) {
    if (t.bullets >= (t.boost.rapid ? Math.max(4, t.maxBullets) : t.maxBullets)) return false;
    const shell = (x, y, dir, free) => this.bullets.push({
      x, y, dir, speed: t.bulletSpeed, owner: t, free,
      isPlayer: t.isPlayer, power: t.power, cutter: t.cutter, alive: true,
      pierce: !!t.boost.pierce, rocket: !!(t.boost.rocket || t.rocketGun), passPlayers: !!t.ally,
      frost: !t.isPlayer && kindOf(t) === 'frost', fire: !t.isPlayer && kindOf(t) === 'firebug', mirage: !!t.mirage,
    });
    const pos = [[t.x + 6, t.y], [t.x + 12, t.y + 6], [t.x + 6, t.y + 12], [t.x, t.y + 6]][t.dir];
    shell(pos[0], pos[1], t.dir, false);
    t.bullets++;
    if (t.boost.spread) {
      // side shells don't count against the shell limit
      shell(t.x + 6, t.y + 6, (t.dir + 1) % 4, true);
      shell(t.x + 6, t.y + 6, (t.dir + 3) % 4, true);
    }
    if (t.isPlayer) Sound.play('shot');
    t.reveal = 60;
    return true;
  }

  // ------------------------------------------------------------ bullets
  updateBullets() {
    const SUB = 4;
    const bs = this.bullets;
    for (let s = 0; s < SUB; s++) {
      for (const b of bs) if (b.alive) this.stepBullet(b, b.speed / SUB);
      for (let i = 0; i < bs.length; i++) {
        const a = bs[i];
        if (!a.alive) continue;
        for (let j = i + 1; j < bs.length; j++) {
          const c = bs[j];
          if (!c.alive || a.isPlayer === c.isPlayer) continue;
          if (overlap(a.x, a.y, 4, 4, c.x, c.y, 4, 4)) {
            // piercing shells plough through ordinary ones; shooting down an enemy shell pays a little
            const mine = a.isPlayer ? a : c, theirs = a.isPlayer ? c : a;
            if (!a.pierce || c.pierce) this.killBullet(a, a.rocket);
            if (!c.pierce || a.pierce) this.killBullet(c, c.rocket);
            if (!theirs.alive && !this.vs && mine.owner && mine.owner.player) this.addScore(mine.owner.player, OBJ_PTS.shell);
            if (!a.alive) break;
          }
        }
      }
    }
    this.bullets = bs.filter(b => b.alive);
  }

  killBullet(b, fx, exclude, excludeBoss) {
    if (!b.alive) return;
    b.alive = false;
    if (!b.free) b.owner.bullets = Math.max(0, b.owner.bullets - 1);
    if (b.fire && this.fires) this.igniteAt(b.x + 2, b.y + 2, 6, true);   // a firebug's shell
    if (fx && b.rocket) this.blast(b.x + 2, b.y + 2, ROCKET_RADIUS, b.isPlayer, b.owner, b.power, exclude, excludeBoss);
    else if (fx) this.addFx(b.x + 2, b.y + 2, Sprites.smallExp, 3);
  }

  stepBullet(b, dist) {
    if (b.isPlayer && this.jamList.length && this.jammed(b.x + 2, b.y + 2)) dist *= 0.5;   // jammer field
    b.x += DXY[b.dir][0] * dist;
    b.y += DXY[b.dir][1] * dist;
    // on a map bigger than the screen a shell goes no further than a screen's length: it would otherwise fly on
    // out of sight for ages, and you can't fire again until it lands
    if (FW > VIEW_W || FH > VIEW_H) {
      b.dist = (b.dist || 0) + dist;
      if (b.dist > Math.max(VIEW_W, VIEW_H) + 32) { this.killBullet(b, false); return; }
    }
    this.bulletPad(b);
    if (b.x < 0 || b.y < 0 || b.x > FW - 4 || b.y > FH - 4) {
      b.x = Math.max(0, Math.min(FW - 4, b.x));
      b.y = Math.max(0, Math.min(FH - 4, b.y));
      this.killBullet(b, true);
      if (b.isPlayer) Sound.play('steel');
      return;
    }
    if (b.mirage) { this.mirageShell(b); return; }   // a mirage's shell harms nothing
    if (b.frost || b.fire) this.specialShell(b);
    this.bioShell(b, dist);   // deflectors, gas (biomes.js)
    if (this.bulletTerrain(b)) return;
    if (this.qblocks && this.qblocks.length && this.bulletQBlock(b)) return;   // ? blocks (secrets.js)
    if (this.turrets.length && this.bulletTurret(b)) return;
    if (b.isPlayer && this.snakeList.length && this.bulletSnakeBody(b)) return;
    if (this.bosses.length && this.bossShell(b) === 'stop') return;
    if (this.decoy && !b.isPlayer && overlap(b.x, b.y, 4, 4, this.decoy.x, this.decoy.y, 16, 16)) {
      this.killBullet(b, true);
      this.hitDecoy();
      return;
    }
    if (this.vsEagles && this.vsBulletEagle(b)) return;
    if (this.cpu && this.cpuBullet(b)) return;
    if (this.big && this.bulletBigMap(b)) return;
    if (!this.noBase && overlap(b.x, b.y, 4, 4, BASE_X, BASE_Y, 16, 16)) {
      this.killBullet(b, true);
      if (this.baseAlive) this.destroyBase();
      return;
    }
    if (b.isPlayer && this.wrecks && this.wrecks.length && this.bulletWreck(b)) return;
    if (this.td && !b.isPlayer && this.towers.length && this.bulletTower(b)) return;
    for (const t of this.tanks) {
      if (!t.alive || t === b.owner || ((b.eagle || b.passPlayers) && t.isPlayer)) continue;
      if (t.burrow > 0 || t.hopT > 0 || t.sub) continue;   // under the sand or the water, or in the air: the shell flies past
      if (!overlap(b.x, b.y, 4, 4, t.x, t.y, 16, 16)) continue;
      if (b.pierce) {
        // piercing shells damage each tank once and keep flying
        if (b.isPlayer === t.isPlayer && (!b.isPlayer || (Config.get('friendlyFire') === 'OFF' && !this.vs))) continue;
        b.hits = b.hits || new Set();
        if (b.hits.has(t)) continue;
        b.hits.add(t);
        if (b.isPlayer && t.isPlayer) { if (this.vs) this.hitPlayer(t, b.owner); else if (t.shield <= 0) t.frozen = 180; }
        else if (b.isPlayer) this.hitEnemy(t, b.owner, b.rocket);
        else this.hitPlayer(t);
        continue;
      }
      if (b.isPlayer && t.frontShield && !b.power && !b.rocket && b.dir === (t.dir + 2) % 4) {
        // shell meets the front plate: it bounces off
        this.killBullet(b, false);
        this.addFx(b.x + 2, b.y + 2, [Sprites.smallExp[0]], 4);
        Sound.play('steel');
        return;
      }
      if (b.isPlayer) {
        if (t.isPlayer && this.vs) { if (b.dmg !== undefined) this.weaponHit(b.owner, t, b.dmg); else this.hitPlayer(t, b.owner); this.killBullet(b, true, t); return; }   // versus: for real
        if (t.isPlayer) {
          // friendly fire freezes the other player for a few seconds
          if (Config.get('friendlyFire') === 'OFF') continue;
          this.killBullet(b, false);
          if (t.shield <= 0) t.frozen = 180;
          return;
        }
        if (b.dmg !== undefined) this.weaponHit(b.owner, t, b.dmg, { dir: b.dir }); else this.hitEnemy(t, b.owner, b.rocket);
        this.killBullet(b, true, t);
        return;
      }
      if (!t.isPlayer) continue;
      if (b.frost) { this.frostHit(t); this.killBullet(b, false); return; }
      this.hitPlayer(t);
      this.killBullet(b, true, t);
      return;
    }
  }

  bulletTerrain(b) {
    const x0 = Math.floor(b.x / 4), x1 = Math.floor((b.x + 3.99) / 4);
    const y0 = Math.floor(b.y / 4), y1 = Math.floor((b.y + 3.99) / 4);
    const vert = (b.dir & 1) === 0;
    let hitRow = -1, hitCol = -1;
    for (let cy = y0; cy <= y1; cy++) {
      for (let cx = x0; cx <= x1; cx++) {
        const t = this.get(cx, cy);
        if (t === T_BRICK || t === T_STEEL || (t === T_FOREST && b.cutter) || (t >= T_LAVA && bioStops(t, b))) {
          if (vert) { if (hitRow < 0 || (b.dir === 0 ? cy > hitRow : cy < hitRow)) hitRow = cy; }
          else if (hitCol < 0 || (b.dir === 3 ? cx > hitCol : cx < hitCol)) hitCol = cx;
        }
      }
    }
    if (hitRow < 0 && hitCol < 0) return false;

    // piercing shells tunnel through bricks (and trees for cutters), stopping only at steel they can't break
    if (b.pierce) {
      let blocked = false;
      for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) {
        const v = this.get(cx, cy);
        if ((v === T_STEEL && (!b.power || this.hardSteel)) || isBasalt(v) || v === T_DRUM) blocked = true;
      }
      if (!blocked) {
        const lo = vert ? Math.floor((b.x + 2 - 8) / 4) : Math.floor((b.y + 2 - 8) / 4);
        const hi = vert ? Math.floor((b.x + 2 + 7.99) / 4) : Math.floor((b.y + 2 + 7.99) / 4);
        const n = { brick: 0, steel: 0, tree: 0 };
        for (let k = lo; k <= hi; k++) {
          const cx = vert ? k : hitCol, cy = vert ? hitRow : k, t = this.get(cx, cy);
          if (t === T_BRICK) { this.set(cx, cy, T_EMPTY); n.brick++; }
          else if (t === T_STEEL) { this.clearGroup(cx, cy, T_STEEL); n.steel++; }
          else if (t === T_FOREST && b.cutter) { this.clearGroup(cx, cy, T_FOREST); n.tree++; }
          else if (t >= T_LAVA) this.bioPierceCell(cx, cy, t, b, n);
        }
        if (b.isPlayer) this.wreckPoints(b.owner, n, b.x + 2, b.y + 2);
        if (b.isPlayer && this.lastBrickSound < this.frame - 3) { Sound.play('brick'); this.lastBrickSound = this.frame; }
        return false;
      }
    }

    // a shell blasts a 16px-wide strip; power shells (star level 3) dig twice as deep and break steel
    const depth = b.power ? 2 : 1;
    const step = (b.dir === 0 || b.dir === 3) ? -1 : 1;
    let broke = false;
    const n = { brick: 0, steel: 0, tree: 0 };
    const hitCell = (cx, cy) => {
      const t = this.get(cx, cy);
      if (t === T_BRICK) { this.set(cx, cy, T_EMPTY); broke = true; n.brick++; }
      else if (t === T_STEEL && b.power && !this.hardSteel) { this.clearGroup(cx, cy, T_STEEL); broke = true; n.steel++; }
      else if (t === T_FOREST && b.cutter) { this.clearGroup(cx, cy, T_FOREST); broke = true; n.tree++; }
      else if (t >= T_LAVA && this.bioHitCell(cx, cy, t, b, n)) broke = true;
    };
    if (vert) {
      const mx = b.x + 2, c0 = Math.floor((mx - 8) / 4), c1 = Math.floor((mx + 7.99) / 4);
      for (let k = 0; k < depth; k++) for (let c = c0; c <= c1; c++) hitCell(c, hitRow + k * step);
    } else {
      const my = b.y + 2, r0 = Math.floor((my - 8) / 4), r1 = Math.floor((my + 7.99) / 4);
      for (let k = 0; k < depth; k++) for (let r = r0; r <= r1; r++) hitCell(hitCol + k * step, r);
    }
    this.killBullet(b, true);
    if (b.isPlayer) { Sound.play(broke ? 'brick' : 'steel'); this.wreckPoints(b.owner, n, b.x + 2, b.y + 2); }
    return true;
  }

  // points for what one shell or blast wrecked (n: counts of brick cells, steel blocks, trees); bricks pay once per
  // shot however many cells went, the rest per block. Shown when it's more than the brick bonus.
  wreckPoints(owner, n, x, y) {
    const p = owner && owner.player;
    if (!p || this.vs) return;
    const pts = (n.brick ? OBJ_PTS.brick : 0) + n.steel * OBJ_PTS.steel + (n.tree || 0) * OBJ_PTS.tree;
    if (!pts) return;
    this.addScore(p, pts);
    if (pts > OBJ_PTS.brick) this.popups.push({ x, y, text: String(pts), t: 0, delay: 0 });
  }

  // ------------------------------------------------------------ blasts and mines
  // explosion that breaks bricks (steel with power) and damages the other side's tanks
  blast(cx, cy, r, byPlayer, owner, power, exclude, excludeBoss) {
    this.explosionHeat(cx, cy, r + 4);
    const wrecked = { brick: 0, steel: 0 };
    for (let y = Math.floor((cy - r) / 4); y <= Math.floor((cy + r) / 4); y++) {
      for (let x = Math.floor((cx - r) / 4); x <= Math.floor((cx + r) / 4); x++) {
        if (Math.hypot(x * 4 + 2 - cx, y * 4 + 2 - cy) > r) continue;
        const t = this.get(x, y);
        if (t === T_BRICK) { this.set(x, y, T_EMPTY); wrecked.brick++; }
        else if (t === T_STEEL && power && !this.hardSteel) { this.clearGroup(x, y, T_STEEL); wrecked.steel++; }
        else if (t >= T_LAVA) this.bioBlastCell(x, y, t, power, byPlayer ? owner : null, wrecked);
      }
    }
    if (byPlayer) this.wreckPoints(owner, wrecked, cx, cy);
    if (this.td && !byPlayer) for (const tw of this.towers.slice()) if (Math.hypot(tw.x + 8 - cx, tw.y + 8 - cy) < r + 8) this.damageTower(tw, 2);
    const reaches = (x, y, w, h) => Math.hypot(Math.max(x, Math.min(cx, x + w)) - cx, Math.max(y, Math.min(cy, y + h)) - cy) < r - 2;
    for (const t of this.tanks) {
      if (!t.alive || t === exclude || !reaches(t.x, t.y, 16, 16)) continue;
      if (byPlayer && !t.isPlayer) this.hitEnemy(t, owner, true);
      else if (!byPlayer && t.isPlayer) this.hitPlayer(t);
      else if (this.vs && t.isPlayer && (!owner || !owner.player || t.player !== owner.player)) this.hitPlayer(t, owner);
    }
    if (!byPlayer && !this.noBase && this.baseAlive && reaches(BASE_X, BASE_Y, 16, 16)) this.destroyBase();
    for (const e of this.vsEagles || []) {
      if (e.alive && reaches(e.x, e.y, 16, 16) && (!owner || !owner.player || owner.player.i !== e.i)) this.vsEagleDown(e);
    }
    for (const o of this.outposts) if (!byPlayer && o.alive && reaches(o.x, o.y, 16, 16)) this.outpostDown(o);
    if (byPlayer && this.cpu && this.cpu.alive && reaches(this.cpu.x, this.cpu.y, 16, 16)) this.cpuHit(owner);
    for (const f of this.factories) if (byPlayer && f.hp > 0 && reaches(f.x, f.y, 32, 32)) this.hitFactory(f, 2, owner);
    if (!byPlayer && this.decoy && reaches(this.decoy.x, this.decoy.y, 16, 16)) this.hitDecoy();
    if (byPlayer) {
      for (const bo of this.bosses.slice()) {
        if (bo !== excludeBoss && this.bossTangible(bo) && reaches(bo.x, bo.y, bo.w, bo.h)) this.bossHit(bo, 2, owner, cx);
      }
    }
    this.addFx(cx, cy, Sprites.bigExp, 5);
    Sound.play('explode');
  }

  dropMine(t) {
    if (this.mines.length >= MAX_MINES) return;
    this.mines.push({ x: t.x + 8, y: t.y + 8, byPlayer: t.isPlayer, owner: t, t: 0 });
    Sound.play('build');
  }

  updateMines() {
    for (const m of this.mines) {
      m.t++;
      if (m.t < MINE_ARM_TIME) continue;
      // in versus a mine is for everyone but the player who laid it
      const foe = t => t.isPlayer !== m.byPlayer || (this.vs && t.isPlayer && (!m.owner || t.player !== m.owner.player));
      const victim = this.tanks.find(t => t.alive && foe(t) && overlap(t.x, t.y, 16, 16, m.x - 4, m.y - 4, 8, 8));
      if (victim) {
        m.done = true;
        this.blast(m.x, m.y, MINE_RADIUS, m.byPlayer, m.owner, false);
      }
    }
    this.mines = this.mines.filter(m => !m.done);
  }

  // ------------------------------------------------------------ damage
  // blast: rockets, mines and explosions (a splitter hit by one doesn't split)
  hitEnemy(t, by, blast) {
    if (t.mirage) { this.vanishMirage(t, true); return; }
    t.reveal = 90;
    if (t.bonus) { t.bonus = false; this.spawnPowerup(); }
    if (t.shield > 0) { Sound.play('steel'); return; }
    t.hp--;
    if (t.hp > 0) { Sound.play('armor'); return; }
    this.killEnemy(t, by, true);
    if (kindOf(t) === 'splitter' && !blast) this.split(t);
  }

  killEnemy(t, by, award, silent) {
    if (!t.alive) return;
    if (t.mirage) { this.vanishMirage(t, false); return; }
    t.alive = false;
    this.killed++;
    if (this.td) this.tdKillGold(t);
    this.addFx(t.x + 8, t.y + 8, BIG_EXPLOSION(), 5);
    this.explosionHeat(t.x + 8, t.y + 8, 10);   // summer: the trees round it catch fire
    if (award && kindOf(t) === 'ghoul') this.ghoulDown(t);   // only one you destroyed rises again
    if (!silent) Sound.play('explode');
    if (award && by && by.isPlayer) {
      // NIGHTMARE!: destroyed enemies may come back, as in DOOM
      if (Config.skill().respawn && !this.td && !ENEMY[t.type].mini && Math.random() < Config.skill().respawn) {
        this.queue.push({ type: t.type, rank: t.vet });
        this.total++;
      }
      const p = by.player, pts = ENEMY[t.type].pts;
      p.kills[t.type]++;
      AutoSkill.event('kill');
      this.addXp(p, ENEMY[t.type].xp * (t.vet ? ENEMY_RANKS[t.vet].xp : 1) + (t.bonus ? 5 : 0));
      this.addScore(p, pts);
      this.popups.push({ x: t.x + 8, y: t.y + 8, text: String(pts), t: 0, delay: 25 });
    }
  }

  // by: the tank (or turret gunner) whose shot it was, for versus kills
  hitPlayer(t, by) {
    if (t.ally) { this.hitAlly(t); return; }
    if (!t.alive || t.shield > 0) return;
    const p = t.player;
    if (t.plates > 0) {
      // an armour plate (XP perk) breaks instead of the tank
      t.plates--;
      t.repair = 0;
      t.shield = 60;
      this.addFx(t.x + 8, t.y + 8, [Sprites.smallExp[0]], 6);
      Sound.play('armor');
      Input.rumble(p.i, 0.4, 120);
      return;
    }
    if (t.ship) {
      // the boat soaks one hit
      t.ship = false;
      p.ship = false;
      t.shield = 60;
      Sound.play('armor');
      Input.rumble(p.i, 0.4, 120);
      return;
    }
    t.alive = false;
    this.addFx(t.x + 8, t.y + 8, BIG_EXPLOSION(), 5);
    Sound.play('playerDie');
    Input.rumble(p.i, 1, 400);
    if (!Config.on('keepStars')) {
      p.level = Config.get('startStars');
      p.cutter = false;
    }
    this.weaponOnDeath(p);
    if (this.galaxy) this.gxOnDeath(p);
    // optional: lose part of the progress towards the next level (never a whole level)
    const loss = Config.get('xpLoss');
    if (Config.xpOn() && loss) {
      const floor = RANKS[p.rank - 1].xp;
      p.xp = Math.max(floor, p.xp - Math.round((p.xp - floor) * loss / 100));
    }
    p.tank = null;
    if (this.vs) { this.vsDeath(t, by); return; }
    if (this.race) { p.tank = null; this.spawnPlayer(p, RACE_RESPAWN); return; }   // KILL RACE: back after a moment
    if (this.td) { this.spawnPlayer(p, 120); return; }   // FORTRESS: the eagle's HP is what counts
    AutoSkill.event('death', this.players.length);
    if (Config.infiniteLives()) {
      this.spawnPlayer(p, 30);
    } else if (p.lives > 0) {
      p.lives--;
      this.spawnPlayer(p, 30);
    } else {
      p.out = true;
      // everyone is out: a few seconds to pay for a revival, if anyone can afford it
      if (this.players.every(q => q.out)) {
        if (this.players.some(q => this.revivePayer(q))) this.reviveWait = REVIVE_WAIT;
        else this.startOver();
      }
    }
  }

  destroyBase() {
    if (this.mushroomGuards && this.mushroomGuards()) return;   // a mushroom on guard (secrets.js)
    if (this.eagleArmorHit()) return;
    this.baseAlive = false;
    this.addFx(BASE_X + 8, BASE_Y + 8, BIG_EXPLOSION(), 6);
    Sound.play('baseDie');
    this.startOver();
  }

  startOver() {
    if (!this.over) { this.over = true; this.overTimer = 0; }
  }

  addScore(p, n) {
    p.score += n;
    if (checkExtraLife(p)) Sound.play('life');
  }

  // ------------------------------------------------------------ XP
  addXp(p, n) {
    if (!p || p.bot || !Config.xpOn()) return;   // bots stay as they are
    n = Math.round(n * Config.scale('xpRate'));
    if (n <= 0) return;
    p.xp += n;
    p.stageXp = (p.stageXp || 0) + n;
    const r = rankFor(p.xp);
    if (r > p.rank) this.rankUp(p, r);
  }

  rankUp(p, r) {
    p.rank = r;
    const perk = rankPerks(r), t = p.tank;
    if (perk.star > p.level) p.level = perk.star;
    if (t) {
      t.plates = Math.max(t.plates, perk.plates);   // promotion comes with fresh plates
      t.applyLevel();
      t.glow = 90;
      this.popups.push({ x: t.x + 8, y: t.y, text: 'LEVEL UP!', label: true, color: COL.gold, t: 0, delay: 0, life: 90 });
    }
    this.rankMsg = { p, r, t: 240 };
    Sound.play('levelUp');
    Input.rumble(p.i, 0.5, 200);
  }

  addFx(x, y, frames, per) {
    this.fx.push({ x, y, frames, per, tick: 0 });
  }

  // ------------------------------------------------------------ power-ups
  spawnPowerup(only) {
    // only power-ups enabled in the settings can appear (and, in versus, only those that make sense there)
    const weights = POWERUPS.map((pu, i) => (Config.get('pu' + i) === 'OFF' || (only && !only.includes(i)) ? 0 : pu.weight));
    const total = weights.reduce((a, b) => a + b, 0);
    if (total === 0) return;
    let r = rnd(total), type = 0;
    while (r >= weights[type]) { r -= weights[type]; type++; }
    // on a night stage every second power-up is night vision (terrain.js)
    this.puCount = (this.puCount || 0) + 1;
    if (this.weather === 'night' && !only && this.puCount % 2 === 0 && Config.get('pu' + PU.NIGHT) !== 'OFF') type = PU.NIGHT;
    let x = 0, y = 0;
    for (let tries = 0; tries < 60; tries++) {
      x = rnd((FW - 16) / 8 + 1) * 8; y = rnd((FH - 16) / 8 + 1) * 8;
      // the corridor: somewhere on screen, not sections away
      if ((this.corridor || this.maze) && this.camY !== undefined) y = Math.min(FH - 16, Math.round(this.camY / 8) * 8 + rnd((VIEW_H - 16) / 8 + 1) * 8);
      if (this.maze && this.camX !== undefined) x = Math.min(FW - 16, Math.round(this.camX / 8) * 8 + rnd((VIEW_W - 16) / 8 + 1) * 8);
      if (overlap(x, y, 16, 16, BASE_X - 16, BASE_Y - 16, 48, 32)) continue;
      let bad = 0;
      for (let cy = y >> 2; cy < (y + 16) >> 2; cy++) for (let cx = x >> 2; cx < (x + 16) >> 2; cx++) {
        const t = this.get(cx, cy);
        if (t === T_STEEL || t === T_WATER || (t >= T_LAVA && bioBad(t))) bad++;
      }
      if (bad <= 4) break;
    }
    this.powerup = { type, x, y, t: 0 };
    if (type === PU.WEAPON) this.powerup.weapon = this.crateWeapon();   // which one: its letter is on the crate
    Sound.play('puAppear');
    this.encounter('p' + type);   // cards.js
  }

  checkPickups() {
    const pu = this.powerup;
    if (!pu) return;
    const order = this.tanks.filter(t => t.isPlayer && !t.ally).concat(this.tanks.filter(t => !t.isPlayer));
    for (const t of order) {
      if (t.alive && Config.canCollect(pu.type, t.isPlayer) && (t.isPlayer || this.enemyMayGrab(pu.type)) && overlap(t.x, t.y, 16, 16, pu.x + 2, pu.y + 2, 12, 12)) {
        this.powerup = null;
        this.applyPowerup(t, pu);
        return;
      }
    }
  }

  // easier skills keep power-ups away from the enemy (the nastiest ones first)
  enemyMayGrab(type) {
    const g = Config.skill().grab;
    return g >= 2 || (g === 1 && type !== PU.GRENADE && type !== PU.CLOCK && type !== PU.SHOVEL);
  }

  applyPowerup(t, pu) {
    const enemies = this.tanks.filter(e => !e.isPlayer && e.alive);
    if (t.isPlayer) {
      const p = t.player;
      let snd = 'pickup';
      this.addScore(p, 500);
      this.addXp(p, 5);
      if (pu.type === PU.WEAPON) { /* giveWeapon names it */ } else if (POWERUPS[pu.type].isNew) this.popups.push({ x: pu.x + 8, y: pu.y + 8, text: POWERUPS[pu.type].name, label: true, color: COL.white, t: 0, delay: 0 });
      else this.popups.push({ x: pu.x + 8, y: pu.y + 8, text: '500', t: 0, delay: 0 });
      if (TIMED_BOOSTS[pu.type]) t.boost[TIMED_BOOSTS[pu.type]] = Config.frames('newTime');
      this.noteTimedPickup(p, pu.type, pu.x + 8, pu.y);   // late ones carry over (extras.js)
      switch (pu.type) {
        case PU.HELMET: t.shield = Config.frames('helmetTime'); break;
        case PU.CLOCK: this.freezeE = Config.frames('clockTime'); snd = 'freeze'; break;
        case PU.SHOVEL: if (!this.noBase) { this.shovel = Config.frames('shovelTime'); this.setBaseWalls(T_STEEL); } break;
        case PU.STAR:
          if (p.level < 3) p.level++; else p.cutter = true;
          t.applyLevel();
          break;
        case PU.GRENADE:
          enemies.forEach(e => this.killEnemy(e, this.race ? t : null, !!this.race, true));   // in the race they count for you
          // bosses take a heavy hit instead (decoys pop)
          for (const bo of this.bosses.slice()) {
            if (!this.bossTangible(bo)) continue;
            const live = bo.turrets ? bo.turrets.findIndex(tu => tu.hp > 0) : -1;
            this.bossHit(bo, 5, t, bo.x + (live >= 0 ? live * 16 + 8 : 24));
          }
          if (enemies.length) Sound.play('explode');
          break;
        case PU.TANK: p.lives++; snd = 'life'; break;
        case PU.GUN: p.level = 3; p.cutter = true; t.applyLevel(); break;
        case PU.SHIP: p.ship = true; t.ship = true; break;
        case PU.MINES: p.mines = (p.mines || 0) + Config.get('mineCount'); break;
        case PU.COIN: this.addScore(p, 1000); snd = 'bonus'; break;
        case PU.TURRET:   // into your kit: B puts it down wherever you want it
          p.turrets = Math.min(9, (p.turrets || 0) + 1);
          this.popups.push({ x: t.x + 8, y: t.y - 6, text: 'TURRET: B TO PLACE', label: true, color: COL.gold, t: 0, delay: 0, life: 90 });
          break;
        case PU.CLAUDE: this.summonClaude(pu.x, pu.y, p); break;
        case PU.AIRSTRIKE: this.callAirstrike(true, gunner(p)); break;
        case PU.BRIDGE: p.bridges = (p.bridges || 0) + 2; break;
        case PU.NIGHT: this.nightVision = NIGHT_VISION_TIME; break;
        case PU.WEAPON: this.giveWeapon(p, pu.weapon || randomWeapon()); break;
        case PU.REVIVE: {
          const fallen = this.players.filter(q => q.out);
          if (fallen.length) fallen.forEach(q => this.revive(q, null));
          else { p.lives++; snd = 'life'; }
          break;
        }
      }
      Sound.play(snd);
    } else {
      // Tank 1990 rule: enemies can grab bonuses too
      Sound.play('enemyPickup');
      switch (pu.type) {
        case PU.HELMET: enemies.forEach(e => { e.shield = Config.frames('helmetTime'); }); break;
        case PU.CLOCK: this.freezeP = Config.frames('clockTime'); break;
        case PU.SHOVEL: if (!this.noBase) { this.shovel = 0; this.setBaseWalls(T_EMPTY); } break;
        case PU.STAR: enemies.forEach(e => { e.hp = Math.min(Math.max(4, Config.enemy(e.type).hp), e.hp + 1); e.bulletSpeed = 4.5; }); break;
        case PU.GRENADE: this.tanks.filter(o => o.isPlayer).forEach(o => this.hitPlayer(o)); break;
        case PU.TANK: t.hp = Math.max(t.hp, 4); break;
        case PU.GUN: t.power = true; t.bulletSpeed = 4.5; break;
        case PU.SHIP: t.ship = true; break;
        case PU.MINES: t.mines += Config.get('mineCount'); break;
        case PU.COIN: // the enemy steals points
          for (const q of this.players) q.score = Math.max(0, q.score - 1000);
          this.popups.push({ x: pu.x + 8, y: pu.y + 8, text: '-1000', label: true, color: COL.red, t: 0, delay: 0 });
          break;
        case PU.TURRET: this.placeTurret(pu.x, pu.y, null, true); break;
        case PU.CLAUDE: // Claude doesn't work for them
          this.popups.push({ x: pu.x + 8, y: pu.y + 8, text: 'NOPE!', label: true, color: '#F0A080', t: 0, delay: 0 });
          break;
        case PU.AIRSTRIKE: this.callAirstrike(false, null); break;
        case PU.BRIDGE: t.hover = true; break;   // that tank can cross water now
        case PU.REVIVE: // reinforcements
          for (let k = 0; k < 2; k++) this.queue.push({ type: rnd(4) });
          this.total += 2;
          this.popups.push({ x: pu.x + 8, y: pu.y + 8, text: '+2 TANKS', label: true, color: COL.red, t: 0, delay: 0 });
          break;
      }
      if (TIMED_BOOSTS[pu.type]) t.boost[TIMED_BOOSTS[pu.type]] = Config.frames('newTime');
    }
  }

  // ------------------------------------------------------------ rendering
  // mines on one side; a black edge keeps them visible on light ground (ice, bridges)
  renderMines(ctx, byPlayer) {
    for (const m of this.mines) {
      if (!!m.byPlayer !== byPlayer) continue;
      const spr = Sprites.mine[m.t < MINE_ARM_TIME || ((this.frame >> 3) & 1) ? 1 : 0];
      ctx.drawImage(Sprites.outline(spr, COL.black), m.x - 5, m.y - 5);
      ctx.drawImage(spr, m.x - 4, m.y - 4);
    }
  }

  buildLayers() {
    if (!this.bgLayer) {
      this.bgLayer = makeCanvas(FW, FH);
      this.forestLayer = makeCanvas(FW, FH);
    }
    const bg = this.bgLayer.getContext('2d'), fo = this.forestLayer.getContext('2d'), tex = themeTex(this.theme);
    bg.clearRect(0, 0, FW, FH);
    fo.clearRect(0, 0, FW, FH);
    this.waterCells = [];
    this.beltCells = [];
    this.bioL = { lava: [], vent: [], gas: [], lamp: [], bog: [] };   // biomes.js
    for (let cy = 0; cy < GH; cy++) {
      for (let cx = 0; cx < GW; cx++) {
        const t = this.terrain[cy * GW + cx];
        if (!t) continue;
        if (t === T_BRICK) texCell(bg, tex.brick, cx, cy);
        else if (t === T_STEEL) texCell(bg, tex.steel, cx, cy);
        else if (t === T_ICE) texCell(bg, tex.ice, cx, cy);
        else if (t === T_BRIDGE) texCell(bg, tex.bridge || Sprites.bridgeTex, cx, cy);
        else if (t === T_MUD) texCell(bg, tex.mud || Sprites.mudTex, cx, cy);
        else if (isBelt(t)) this.beltCells.push(cy * GW + cx);   // drawn every frame (they move)
        else if (t === T_FOREST) texCell(fo, tex.forest, cx, cy);
        else if (t === T_WATER) this.waterCells.push(cy * GW + cx);
        else if (t >= T_LAVA) this.bioCell(bg, fo, t, cx, cy, tex);
      }
    }
    this.themeCaps(bg, fo);   // snow on top in winter (seasons.js)
    this.dirty = false;
    this.layerLook = Config.get('look');   // CLASSIC or BLOCKS (blocks.js)
    this.dirtyCells = [];
    this.layerOf = this.terrain.slice();   // what the layers show
  }

  // redraw just the cells that changed since the layers were drawn (and the cell under each, for snow caps)
  redrawCells() {
    const bg = this.bgLayer.getContext('2d'), fo = this.forestLayer.getContext('2d'), tex = themeTex(this.theme);
    const caps = (THEMES[this.theme] || {}).snowCaps, solid = v => v === T_BRICK || v === T_STEEL || v === T_FOREST;
    const done = new Set();
    for (const i0 of this.dirtyCells) for (const i of [i0, i0 + GW]) {
      if (i >= GW * GH || done.has(i)) continue;
      done.add(i);
      const cx = i % GW, cy = (i / GW) | 0, t = this.terrain[i], dx = cx * 4, dy = cy * 4;
      bg.clearRect(dx, dy, 4, 4); fo.clearRect(dx, dy, 4, 4);
      if (t === T_BRICK) texCell(bg, tex.brick, cx, cy);
      else if (t === T_STEEL) texCell(bg, tex.steel, cx, cy);
      else if (t === T_ICE) texCell(bg, tex.ice, cx, cy);
      else if (t === T_BRIDGE) texCell(bg, tex.bridge || Sprites.bridgeTex, cx, cy);
      else if (t === T_MUD) texCell(bg, tex.mud || Sprites.mudTex, cx, cy);
      else if (t === T_FOREST) texCell(fo, tex.forest, cx, cy);
      else if (t >= T_LAVA) this.bioCell(bg, fo, t, cx, cy, tex);
      if (caps && solid(t) && !(cy > 0 && solid(this.terrain[i - GW]))) {
        const ctx = t === T_FOREST ? fo : bg;
        ctx.fillStyle = caps;
        ctx.fillRect(dx, dy, 4, 1);
        if ((cx + cy) % 3 === 0) ctx.fillRect(dx + 1, dy + 1, 2, 1);
      }
      this.layerOf[i] = t;
    }
    this.dirtyCells = [];
  }

  shadeAlpha(t) {
    if (t.reveal > 0) return Math.min(1, 0.15 + t.reveal / 40);
    for (const o of this.tanks) {
      if (!o.isPlayer || !o.alive) continue;
      const d = Math.abs(o.x - t.x) + Math.abs(o.y - t.y);
      if (d < 56) return Math.min(1, 0.15 + (56 - d) / 28);
    }
    return (this.frame & 63) < 4 ? 0.3 : 0.1;
  }

  drawTank(ctx, t) {
    if (t.isPlayer && t.frozen > 0 && ((this.frame >> 2) & 1)) return;
    if (t.ship) ctx.drawImage(Sprites.hull[t.dir], t.x, t.y);
    let spec, pal;
    if (t.ally) {
      spec = 'p1';
      pal = 'c_WHITE';
    } else if (t.isPlayer) {
      spec = 'p' + t.player.level;
      pal = Config.playerPal(t.player.i);
    } else {
      spec = 'e' + t.type;
      if (t.bonus && ((this.frame >> 3) & 1)) pal = 'red';
      else if (ENEMY[t.type].pal) pal = ENEMY[t.type].pal;
      // armor tanks start green and fade to silver as they take hits
      else if (t.hp >= 4) pal = 'green';
      else if (t.hp === 3) pal = 'gold';
      else if (t.hp === 2) pal = (this.frame >> 2) & 1 ? 'gold' : 'silver';
      else pal = 'silver';
    }
    if (t.boost.ghost) ctx.globalAlpha = (this.frame >> 2) & 1 ? 0.35 : 0.6;
    if (t.boost.smoke) { this.renderSmoke(ctx, t); if (!t.isPlayer) ctx.globalAlpha = 0.4; }
    if (t.ally) {
      ctx.drawImage(Sprites.tank(spec, t.anim, t.dir, pal), t.x, t.y);
      ctx.fillStyle = '#3CBCFC'; ctx.fillRect(t.x + 7, t.y + 7, 2, 2);   // a blue mark tells it apart
    } else if (t.isPlayer) {
      // the tank wears its XP rank; a marshal (level 10) and a fresh promotion glow
      const lv = Config.xpOn() ? t.player.rank || 1 : 1;
      const img = Sprites.rankTank(spec, t.anim, t.dir, pal, lv, t.plates > 0 ? (lv >= 5 ? 1 : 2) : 0);
      if (t.glow > 0 ? (t.glow >> 2) & 1 : lv >= 10 && (this.frame & 31) < 20) {
        ctx.drawImage(Sprites.outline(img, t.glow > 0 ? COL.white : COL.gold), t.x - 1, t.y - 1);
      }
      ctx.drawImage(img, t.x, t.y);
    } else {
      if (kindOf(t) === 'snake') { this.drawSnake(ctx, t, pal); this.drawHpBar(ctx, t); return; }
      // a shade is a faint shimmer unless it just fired, got hit or is close to a player
      if (t.stealth) ctx.globalAlpha = Math.min(ctx.globalAlpha, this.shadeAlpha(t));
      // veterans and elites wear rank stripes (and an elite a turret star)
      ctx.drawImage(t.vet ? Sprites.rankTank(spec, t.anim, t.dir, pal, ENEMY_RANKS[t.vet].look, false) : Sprites.tank(spec, t.anim, t.dir, pal), t.x, t.y);
      if (t.ai && Config.on('aiMarks') && ctx.globalAlpha > 0.5) {
        ctx.fillStyle = AI_MARK[t.ai];
        ctx.fillRect(t.x + 7, t.y + 7, 2, 2);
      }
      if (ctx.globalAlpha > 0.5) this.drawHpBar(ctx, t);
    }
    ctx.globalAlpha = 1;
    if (t.shield > 0) ctx.drawImage(Sprites.shield[(this.frame >> 1) & 1], t.x, t.y);
  }

  // tough enemies (5+ hits, like the flamer and the snake) show what's left once they've been hit
  drawHpBar(ctx, t) {
    const max = t.maxHp || Config.enemy(t.type).hp;   // an online guest only knows the type's usual hits
    if (max < (this.td ? 2 : 5) || t.hp >= max || t.hp <= 0) return;
    const w = Math.max(1, Math.round(14 * t.hp / max));
    ctx.fillStyle = COL.black; ctx.fillRect(t.x, t.y - 4, 16, 3);
    ctx.fillStyle = t.hp / max > 0.34 ? '#F8B800' : '#F83800'; ctx.fillRect(t.x + 1, t.y - 3, w, 1);
  }

  render(ctx) {
    if (this.galaxy) { this.renderGalaxy(ctx); return; }   // galaxy.js
    ctx.fillStyle = COL.bg;
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
    ctx.fillStyle = COL.black;
    ctx.fillRect(FX, FY, VIEW_W, VIEW_H);
    if (this.dirty || this.layerLook !== Config.get('look')) { this.buildLayers(); this.layerLook = Config.get('look'); }   // the look changed: once (blocks.js; set here too, as modes with their own buildLayers don't)
    else if (this.dirtyCells && this.dirtyCells.length) this.redrawCells();

    ctx.save();
    ctx.translate(FX, FY);
    ctx.beginPath();
    ctx.rect(0, 0, VIEW_W, VIEW_H);
    ctx.clip();
    // big maps scroll: everything in the field is drawn shifted by the camera
    const [camX, camY] = this.camera();
    ctx.save();
    ctx.translate(-camX, -camY);

    ctx.drawImage(this.groundLayer(), 0, 0);   // the season's ground (seasons.js)
    ctx.drawImage(this.bgLayer, 0, 0);
    const wt = themeTex(this.theme)[(this.frame >> 5) & 1 ? 'water1' : 'water0'];
    for (const i of this.waterCells) {
      const cx = i % GW, cy = (i / GW) | 0;
      if (cx * 4 + 4 < camX || cy * 4 + 4 < camY || cx * 4 > camX + VIEW_W || cy * 4 > camY + VIEW_H) continue;   // off screen (a big map's river)
      texCell(ctx, wt, cx, cy);
    }
    this.renderBelts(ctx);
    this.renderBio(ctx);   // lava, vents, gas, bog bubbles, lamplight (biomes.js)
    this.renderPads(ctx);
    if (this.maze) this.renderMazeExit(ctx);
    this.renderSeasonUnder(ctx);   // hot spots, ghoul wrecks (seasonal.js)
    this.renderSecrets(ctx);   // ? blocks, the mushroom, coins (secrets.js)
    if (!this.noBase) this.renderEagle(ctx);
    this.renderVs(ctx);
    this.renderDecoy(ctx);

    this.renderMines(ctx, false);   // the enemy's (they can hide under trees)
    this.renderBossUnder(ctx);
    this.renderSpecialsUnder(ctx);
    this.renderBaseZones(ctx);
    this.renderTurrets(ctx);
    this.renderTowers(ctx);   // FORTRESS (fortress.js)
    for (const t of this.tanks) if (!this.drawSeasonTank(ctx, t)) this.drawTank(ctx, t);
    this.renderClaudes(ctx);
    this.renderBosses(ctx);
    for (const s of this.spawns) {
      if (s.t > SPARKLE_TIME) continue;
      const k = Math.floor((SPARKLE_TIME - s.t) / 4) % 6;
      ctx.drawImage(Sprites.sparkle[[0, 1, 2, 3, 2, 1][k]], s.x, s.y);
    }
    for (const b of this.bullets) {
      if (b.light) { ctx.fillStyle = '#F8D878'; ctx.fillRect(Math.round(b.x) + 1, Math.round(b.y) + 1, 2, 2); continue; }   // a machine-gun bullet
      const spr = b.rocket ? Sprites.bulletRocket : b.pierce ? Sprites.bulletPierce : Sprites.bullet;
      ctx.drawImage(spr[b.dir], Math.round(b.x), Math.round(b.y));
    }

    this.renderBeams(ctx);
    ctx.drawImage(this.forestLayer, 0, 0);
    this.renderMines(ctx, true);    // yours, over the trees, so you always see where you laid them
    this.renderBossOver(ctx);       // flying bosses, smoke and fire (bosses.js)

    if (this.powerup && ((this.powerup.t >> 3) & 1) === 0) {
      drawPowerup(ctx, this.powerup, this.powerup.x, this.powerup.y);
    }
    this.renderSpecialsOver(ctx);
    this.renderBioOver(ctx, camX, camY);   // fire columns, lava bombs, rockets, mist (biomes.js)
    this.renderWeapons(ctx);   // beams, flames, mortar shells, missiles (weapons.js)
    this.renderTdOver(ctx);
    this.renderStrikes(ctx);
    for (const f of this.fx) {
      if (f.tick < 0) continue;
      const fr = f.frames[Math.min(f.frames.length - 1, Math.floor(f.tick / f.per))];
      ctx.drawImage(fr, Math.round(f.x - fr.width / 2), Math.round(f.y - fr.height / 2));
    }
    this.renderSeason(ctx, camX, camY);   // petals, leaves, snow, ash, sand
    this.renderSeasonOver(ctx, camX, camY);   // fire, rain, gusts, blizzard, Geiger counters (seasonal.js)
    this.renderDarkness(ctx);
    for (const p of this.popups) {
      if (p.t < p.delay) continue;
      if (p.label) {
        const half = p.text.length * 4;
        Font.drawCenter(ctx, p.text, Math.max(half, Math.min(FW - half, p.x)), Math.max(0, Math.round(p.y - 4 - p.t / 6)), p.color);
        continue;
      }
      const c = Sprites.mini(p.text);
      ctx.drawImage(c, Math.round(p.x - c.width / 2), Math.round(p.y - 3));
    }
    if (this.bosses.length) this.renderBossTalk(ctx);   // BABA GALYA's slippers and what she says, over the dark (galya.js)
    this.renderBigMap(ctx);
    this.renderCpu(ctx);
    ctx.restore();   // back to screen positions inside the field window
    this.renderEnemyArrows(ctx, camX, camY);   // big maps (bigmap.js)
    this.renderObjectiveArrows(ctx, camX, camY);
    this.renderMinimap(ctx, camX, camY);
    this.renderFortressUI(ctx);
    if (this.over) {
      const y = Math.max(VIEW_H / 2 - 8, VIEW_H - this.overTimer * 1.3);
      Font.draw(ctx, 'GAME', VIEW_W / 2 - 15, y, COL.red);
      Font.draw(ctx, 'OVER', VIEW_W / 2 - 15, y + 9, COL.red);
    }
    this.renderBossBanner(ctx);
    this.renderRankMsg(ctx);
    this.renderRevival(ctx);
    this.renderModeBanner(ctx);
    this.renderCard(ctx);
    ctx.restore();
    this.renderHud(ctx);
    this.renderWeaponBadges(ctx);
  }

  // promotion banner at the top of the field: "II-PLAYER LEVEL 5" / rank name / new perk
  renderRankMsg(ctx) {
    const m = this.rankMsg;
    if (!m) return;
    const rk = RANKS[m.r - 1], who = this.players.length > 1 ? ROMAN[m.p.i] + '-PLAYER ' : '';
    const perk = Config.get('perks') === 'ON' ? rk.perk : '';
    const lines = [[who + 'LEVEL ' + m.r, COL.gold], [rk.name, COL.white]].concat(perk ? [[perk, COL.lgrey]] : []);
    const w = Math.min(VIEW_W, Math.max(...lines.map(l => l[0].length)) * 8 + 12), h = lines.length * 10 + 6;
    const x = (VIEW_W - w) >> 1, y = 16 + (m.t > 225 ? (m.t - 225) * -2 : 0);
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(x, y, w, h);
    lines.forEach(([text, c], i) => Font.drawCenter(ctx, text, VIEW_W / 2, y + 4 + i * 10, c));
  }

  // XP bar for player p: a vertical strip (x, y, height) filling upwards, in the player's colour
  renderXpBar(ctx, p, x, y, h) {
    const r = p.rank || 1, lo = RANKS[r - 1].xp, hi = r < RANKS.length ? RANKS[r].xp : lo;
    const frac = r >= RANKS.length ? 1 : Math.min(1, (p.xp - lo) / (hi - lo));
    ctx.fillStyle = '#383838';
    ctx.fillRect(x, y, 3, h);
    const f = Math.round((h - 2) * frac);
    ctx.fillStyle = r >= RANKS.length && (this.frame & 16) ? COL.gold : PALS[Config.playerPal(p.i)][2];
    ctx.fillRect(x + 1, y + h - 1 - f, 1, f);
    ctx.fillStyle = PALS[Config.playerPal(p.i)][1];
    ctx.fillRect(x + 2, y + h - 1 - f, 1, f);
  }

  // what a player carries for the B button, as dots: mines grey, turrets yellow
  renderCarried(ctx, p, x, y, vertical, max, turretsOnly) {
    const dots = [];
    if (!turretsOnly) for (let k = 0; k < (p.mines || 0); k++) dots.push('#505050');
    for (let k = 0; k < (p.turrets || 0); k++) dots.push('#F8B800');
    for (let k = 0; k < (p.bridges || 0); k++) dots.push('#B76506');
    dots.slice(0, max).forEach((c, k) => { ctx.fillStyle = c; ctx.fillRect(x + (vertical ? 0 : k * 3), y + (vertical ? k * 3 : 0), 2, 2); });
  }

  // the difficulty at the top of the side panel (on AUTO: the level it's at now, with a small AUTO above)
  renderSkillTag(ctx, H) {
    const s = Config.get('skill'), auto = s === AUTO_SKILL;
    const lv = auto ? Math.max(0, Math.min(4, Math.round(AutoSkill.rating))) : s, [tag, , dark] = SKILL_TAGS[lv];
    if (auto) ctx.drawImage(Sprites.mini('AUTO'), H, 4);
    Font.draw(ctx, tag, H + (tag.length < 3 ? 4 : 0), 11, dark);
  }

  renderHud(ctx) {
    this.renderSkillTag(ctx, HUD_X);
    if (this.vs) { this.renderVsHud(ctx, HUD_X); return; }
    if (this.td) { this.renderFortressHud(ctx, HUD_X); return; }
    if (this.race) { this.renderRaceLine(ctx); this.renderRaceHud(ctx, HUD_X); return; }
    if (this.corridor) this.renderCorridorLine(ctx); else if (this.maze) this.renderMazeLine(ctx); else if (this.cpu) this.renderCpuLine(ctx); else this.renderObjectiveLine(ctx);
    // the tanks still to come, one icon each (more than 20: 18 icons and the number)
    const H = HUD_X, many = this.queue.length > 20, n = this.bossIdx === undefined ? Math.min(many ? 18 : 20, this.queue.length) : 0;
    if (this.bossIdx !== undefined) this.renderBossHud(ctx, H);
    for (let i = 0; i < n; i++) ctx.drawImage(Sprites.enemyIcon, H + (i % 2) * 8, 24 + (i >> 1) * 8);
    if (n && many) Font.drawCenter(ctx, String(this.queue.length), H + 8, 97, COL.black);
    // and all the enemies left to beat (on the field too), by a red crosshair
    const left = this.bossIdx === undefined ? this.enemiesLeft() : null;
    if (left !== null) {
      const y = 108;
      if (left < 100) {
        ctx.fillStyle = '#D82800';   // a target: a ring with a dot in it
        ['..XXX..', '.X...X.', 'X.....X', 'X..X..X', 'X.....X', '.X...X.', '..XXX..'].forEach((row, j) => { for (let i = 0; i < 7; i++) if (row[i] === 'X') ctx.fillRect(H + i, y + j, 1, 1); });
        Font.drawRight(ctx, String(left), H + 24, y, '#A80000');
      } else Font.drawCenter(ctx, String(left), H + 12, y, '#A80000');
    }
    const lives = p => (Config.infiniteLives() ? '~' : String(Math.min(99, p.lives)));
    const xp = Config.xpOn();
    if (this.players.length > 2) {
      // 3-4 players: one compact row each, the tank icon in the player's colour
      this.players.forEach((p, i) => {
        const y = xp ? 121 + i * 15 : 128 + i * 14;
        ctx.drawImage(Sprites.playerIcon(Config.playerPal(i)), H, y);
        Font.draw(ctx, lives(p), H + 8, y, COL.black);
        if (xp) {
          ctx.drawImage(Sprites.mini('L' + (p.rank || 1)), H, y + 8);
          this.renderXpBar(ctx, p, H + 18, y, 15);
          this.renderCarried(ctx, p, H + 22, y + 1, true, 5);
        } else this.renderCarried(ctx, p, H + 1, y + 9, false, 5);
      });
      ctx.drawImage(Sprites.flag, H, 184);
      Font.drawRight(ctx, String(this.survival ? this.wave : this.corridor ? this.corridorLevel() : this.num), H + 16, 200, COL.black);
      return;
    }
    // 1-2 players: label, lives, mines carried and (with XP on) the level and XP bar
    this.players.forEach((p, i) => {
      const y = xp ? 122 + i * 30 : 136 + i * 24;
      Font.draw(ctx, i ? 'IIP' : 'IP', H, y, COL.black);
      ctx.drawImage(Sprites.lifeIcon, H, y + 8);
      Font.draw(ctx, lives(p), H + 8, y + 8, COL.black);
      if (xp) {
        // level, XP bar beside the lives, mines as dots underneath
        ctx.drawImage(Sprites.mini('L' + (p.rank || 1)), H, y + 17);
        this.renderXpBar(ctx, p, H + 18, y + 8, 18);
        this.renderCarried(ctx, p, H + 1, y + 25, false, 5);
      } else {
        if (p.mines) {
          ctx.drawImage(Sprites.mine[0], H, y + 16);
          Font.draw(ctx, String(Math.min(9, p.mines)), H + 8, y + 16, COL.black);
        }
        this.renderCarried(ctx, p, H + 18, y + 9, true, 4, true);
      }
    });
    ctx.drawImage(Sprites.flag, H, 184);
    Font.drawRight(ctx, String(this.survival ? this.wave : this.corridor ? this.corridorLevel() : this.num), H + 16, 200, COL.black);
  }
}
