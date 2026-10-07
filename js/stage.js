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
const T_EMPTY = 0, T_BRICK = 1, T_STEEL = 2, T_WATER = 3, T_FOREST = 4, T_ICE = 5;
const BLOCK_TYPE = { '.': T_EMPTY, '#': T_BRICK, '@': T_STEEL, '~': T_WATER, '%': T_FOREST, '_': T_ICE };
const DXY = [[0, -1], [1, 0], [0, 1], [-1, 0]];

// basic, fast, power, armor, then the new types (not in the original):
//   rocket - fires slow rockets that blow up bricks and tanks around them; likes to shell from a distance
//   shield - a front plate bounces shells (unless they're star-3, pierce or rocket); hit it from the side or back
//   sapper - its dozer blade crushes bricks as it drives, and it lays mines
//   shade  - almost invisible; shows itself when it fires, gets hit or comes close to you
// `ai` = chance of each personality [wander, rush (the eagle), hunt (players), snipe (from a distance)]
const ENEMY = [
  { name: 'BASIC', speed: 0.5, bullet: 2.5, hp: 1, pts: 100, xp: 10, ai: [4, 3, 2, 1] },
  { name: 'FAST', speed: 1.25, bullet: 2.5, hp: 1, pts: 200, xp: 15, ai: [2, 4, 4, 0] },
  { name: 'POWER', speed: 0.75, bullet: 4.5, hp: 1, pts: 300, xp: 20, ai: [2, 2, 2, 4] },
  { name: 'ARMOR', speed: 0.5, bullet: 2.5, hp: 4, pts: 400, xp: 30, ai: [2, 5, 2, 1] },
  { name: 'ROCKET', speed: 0.5, bullet: 2, hp: 1, pts: 500, xp: 25, ai: [1, 1, 1, 7], pal: 'rocket', from: 4, desc: 'ROCKETS BLAST AN AREA' },
  { name: 'SHIELD', speed: 0.5, bullet: 2.5, hp: 2, pts: 500, xp: 30, ai: [1, 6, 3, 0], pal: 'shieldE', from: 11, desc: 'FRONT PLATE STOPS SHELLS' },
  { name: 'SAPPER', speed: 0.9, bullet: 2.5, hp: 1, pts: 400, xp: 20, ai: [1, 7, 2, 0], pal: 'sapper', from: 7, desc: 'CRUSHES BRICKS, LAYS MINES' },
  { name: 'SHADE', speed: 1, bullet: 4.5, hp: 1, pts: 600, xp: 35, ai: [1, 1, 7, 1], pal: 'shade', from: 15, desc: 'NEARLY INVISIBLE HUNTER' },
];
const NEW_TYPES = [4, 5, 6, 7];
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
};
// timed effects granted by the new power-ups (stored per tank in t.boost)
const TIMED_BOOSTS = { [PU.TURBO]: 'turbo', [PU.RAPID]: 'rapid', [PU.SPREAD]: 'spread', [PU.PIERCE]: 'pierce', [PU.ROCKET]: 'rocket', [PU.GHOST]: 'ghost' };
const TURBO_MULT = 1.75;
const ROCKET_RADIUS = 14, MINE_RADIUS = 18, MINE_ARM_TIME = 40, MAX_MINES = 16;
let BASE_X = 96, BASE_Y = 192;
let ENEMY_SPAWN_X = [96, 192, 0];
let PLAYER_SPAWN = [[64, 192], [128, 192], [0, 192], [192, 192]];
let BASE_WALL = [[11, 23], [12, 23], [13, 23], [14, 23], [11, 24], [14, 24], [11, 25], [14, 25]];

function setFieldSize(cols, rows) {
  COLS = cols; ROWS = rows;
  FW = cols * 16; FH = rows * 16;
  GW = cols * 4; GH = rows * 4;
  SCREEN_W = FX + FW + 32; SCREEN_H = FY * 2 + FH; HUD_X = FX + FW + 8;
  // eagle at the bottom centre, with its brick fortress
  BASE_X = cols * 8 - 8; BASE_Y = FH - 16;
  const bx = BASE_X / 8, by = BASE_Y / 8;
  BASE_WALL = [[bx - 1, by - 1], [bx, by - 1], [bx + 1, by - 1], [bx + 2, by - 1], [bx - 1, by], [bx + 2, by], [bx - 1, by + 1], [bx + 2, by + 1]];
  // players I and II beside the eagle, III and IV in the bottom corners
  PLAYER_SPAWN = [[BASE_X - 32, BASE_Y], [BASE_X + 32, BASE_Y], [0, FH - 16], [FW - 16, FH - 16]];
  // enemy entry points along the top: centre, right, left, then more for wide fields
  const n = 2 * Math.max(1, Math.round((cols - 1) / 12)) + 1, mid = (n - 1) / 2;
  const at = i => Math.round(i * (cols - 1) / (n - 1)) * 16;
  ENEMY_SPAWN_X = [at(mid)];
  for (let k = 1; k <= mid; k++) ENEMY_SPAWN_X.push(at(mid + k), at(mid - k));
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

function buildQueue(stageNum) {
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
  const count = Config.get('enemyCount'), bonus = Config.on('bonusTanks');
  const out = [];
  for (let i = 0; i < count; i++) out.push({ type: list[Math.floor(i * list.length / count)], bonus: bonus && isBonusSlot(i) });
  // Later stages get tougher: new enemy types join one by one (rocket from stage 4, sapper 7, shield 11,
  // shade 15) and take a growing share of the line-up; veterans appear from stage 10 and elites from stage 20.
  const mult = { OFF: 0, FEW: 0.5, NORMAL: 1, MANY: 1.8 }[Config.get('newEnemies')] || 0;
  const s = stageNum, kinds = NEW_TYPES.filter(k => s >= ENEMY[k].from);
  if (mult && kinds.length) {
    const share = Math.min(0.6, (0.06 + (s - 4) * 0.015) * mult);
    for (let i = 2; i < out.length; i++) {   // never the very first tanks of a stage
      if (r() < share) out[i].type = kinds[Math.floor(r() * kinds.length)];
    }
  }
  if (Config.on('enemyGrowth')) {
    const vet = Math.min(0.45, Math.max(0, (s - 9) * 0.02)), elite = Math.min(0.35, Math.max(0, (s - 19) * 0.015));
    for (const e of out) {
      const x = r();
      e.rank = x < elite ? 2 : x < elite + vet ? 1 : 0;
    }
  }
  return out;
}

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
  const n = Math.floor(p.score / 20000), had = p.extraCount || 0;
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
    this.ai = 0; this.aiBase = false; this.hold = 0; this.vet = 0;            // enemy personality (see ai.js)
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
    this.load(expandBlocks(mapToBlocks(map)), !opts.custom || !classic);
    this.tanks = [];
    this.bullets = [];
    this.fx = [];
    this.popups = [];
    this.spawns = [];
    this.powerup = null;
    this.mines = [];
    this.bosses = []; this.beams = []; this.tracks = []; this.dust = [];
    this.lastBrickSound = -1;
    this.queue = buildQueue(num);
    this.total = this.queue.length;
    this.killed = 0;
    this.spawnTimer = 0;
    this.spawnPos = 0;
    this.spawnInterval = Math.round(Math.max(70, 190 - ((num - 1) % 35) * 4 - (this.twoP ? 20 : 0)) / Config.scale('spawnRate'));
    this.maxEnemies = Config.get('maxOnScreen') + [0, 2, 3, 4][this.extraPlayers];
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
    for (const p of players) {
      p.kills = zeroKills();
      if (!opts.snapshot) p.stageXp = 0;
      p.tank = null;
      if (!p.out && !opts.snapshot) this.spawnPlayer(p, 0);
      // a shovel charge bought in the shop fortifies the eagle from the start
      if (p.shopShovel) {
        p.shopShovel = false;
        this.shovel = Config.frames('shovelTime');
        this.setBaseWalls(T_STEEL);
      }
    }
    if (opts.boss) this.initBoss(opts.boss);
    if (opts.snapshot) this.restore(opts.snapshot);
  }

  // ------------------------------------------------------------ save / load
  // Everything needed to resume this stage later (shells in flight and effects are dropped).
  snapshot() {
    const tankKeys = ['x', 'y', 'dir', 'isPlayer', 'type', 'hp', 'bonus', 'shield', 'frozen', 'ship', 'cutter', 'power',
      'speed', 'bulletSpeed', 'maxBullets', 'boost', 'mines', 'plates', 'repair',
      'ai', 'aiBase', 'hold', 'rocketGun', 'frontShield', 'crusher', 'stealth', 'vet'];
    return {
      cols: COLS, rows: ROWS,
      terrain: Array.from(this.terrain).join(''),
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
    this.spawns = [];
    for (const p of this.players) { p.tank = null; p.kills = zeroKills().map((z, k) => (sn.kills[p.i] || [])[k] || 0); }
    this.tanks = sn.tanks.map(o => {
      const t = new Tank(Object.assign({}, o, { boost: Object.assign({}, o.boost) }));
      delete t.pi;
      if (o.pi >= 0) { t.player = this.players[o.pi]; t.player.tank = t; }
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
    for (let by = 0; by < ROWS * 2; by++) {
      for (let bx = 0; bx < COLS * 2; bx++) {
        this.setBlock(bx, by, BLOCK_TYPE[blocks[by][bx]] || T_EMPTY);
      }
    }
    // keep spawn points free of solid terrain
    const clearSolid = (bx, by) => {
      for (let y = by; y < by + 2; y++) for (let x = bx; x < bx + 2; x++) {
        const t = this.get(x * 2, y * 2);
        if (t === T_BRICK || t === T_STEEL || t === T_WATER) this.setBlock(x, y, T_EMPTY);
      }
    };
    ENEMY_SPAWN_X.forEach(x => clearSolid(x / 8, 0));
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
    this.dirty = true;
  }
  setBlock(bx, by, t) {
    for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) this.set(bx * 2 + x, by * 2 + y, t);
  }
  clearGroup(cx, cy, type) {
    const bx = cx & ~1, by = cy & ~1;
    for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) if (this.get(bx + x, by + y) === type) this.set(bx + x, by + y, T_EMPTY);
  }
  setBaseWalls(t) {
    for (const [bx, by] of BASE_WALL) this.setBlock(bx, by, t);
  }
  onIce(t) {
    return this.get((t.x + 8) >> 2, (t.y + 8) >> 2) === T_ICE;
  }

  // ------------------------------------------------------------ spawning
  spawnPlayer(p, delay) {
    const [x, y] = PLAYER_SPAWN[p.i];
    this.spawns.push({ x, y, t: SPARKLE_TIME + delay, player: p });
  }

  updateSpawning() {
    if (this.queue.length === 0) return;
    if (this.spawnTimer > 0) { this.spawnTimer--; return; }
    const onField = this.tanks.filter(t => !t.isPlayer).length + this.spawns.filter(s => s.enemy).length;
    if (onField >= this.maxEnemies) return;
    // pick the next entry point that no boss is sitting on
    let x = -1;
    for (let k = 0; k < ENEMY_SPAWN_X.length && x < 0; k++) {
      const cand = ENEMY_SPAWN_X[this.spawnPos++ % ENEMY_SPAWN_X.length];
      if (!this.bossBlocksSpawn(cand)) x = cand;
    }
    if (x < 0) return;
    const item = this.queue.shift();
    this.spawns.push({ x, y: 0, t: SPARKLE_TIME, enemy: item });
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
          x: s.x, y: s.y, dir: 2, type, hp: st.hp + vr.hp, bonus: s.enemy.bonus, vet,
          speed: st.speed * vr.speed, bulletSpeed: st.bullet * vr.shell, maxBullets: 1,
          ai: s.enemy.ai !== undefined ? s.enemy.ai : pickPersonality(type, this.num),
          aiBase: type !== 4 && Math.random() < 0.3,  // some snipers shell the eagle instead of you (not rocket tanks)
          rocketGun: type === 4, frontShield: type === 5, crusher: type === 6, stealth: type === 7,
          mines: type === 6 ? 3 : 0,
        }));
      } else {
        const p = s.player;
        const t = new Tank({ x: s.x, y: s.y, dir: 0, isPlayer: true, player: p, shield: Config.frames('spawnShield') });
        const perk = rankPerks(p.rank || 1);
        p.level = Math.max(p.level, perk.star);
        t.plates = perk.plates;
        t.applyLevel();
        p.tank = t;
        // items bought in the shop take effect on the first spawn of the stage
        if (p.kit) {
          if (p.kit.helmet) t.shield = Math.max(t.shield, Config.frames('helmetTime'));
          for (const k of ['turbo', 'rapid', 'rocket', 'pierce', 'spread', 'ghost']) if (p.kit[k]) t.boost[k] = Config.frames('newTime');
          p.kit = null;
        }
        this.tanks.push(t);
      }
      s.done = true;
    }
    this.spawns = this.spawns.filter(s => !s.done);
  }

  // ------------------------------------------------------------ main update
  update() {
    this.frame++;
    if (this.freezeE > 0) this.freezeE--;
    if (this.freezeP > 0) this.freezeP--;
    this.updateShovel();
    if (!this.over) this.updateSpawning();
    this.updateSpawns();
    for (const t of this.tanks) {
      if (!t.alive) continue;
      for (const k in t.boost) if (--t.boost[k] <= 0) delete t.boost[k];
      if (t.isPlayer) this.updatePlayer(t); else this.updateEnemy(t);
    }
    this.updateBosses();
    this.updateBullets();
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
    } else if (this.queue.length === 0 && !this.spawns.some(s => s.enemy) && !this.tanks.some(t => !t.isPlayer) && !this.bossAlive()) {
      this.clearTimer++;
      if (this.clearTimer === 1) for (const p of this.players) if (!p.out) this.addXp(p, 25);
      if (this.clearTimer >= 190) this.result = 'clear';
    }
  }

  updateShovel() {
    if (this.shovel <= 0) return;
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
    const inp = Input.player(p.i);
    if (inp.dir >= 0) {
      this.turn(t, inp.dir);
      this.move(t, t.dir);
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
    // B drops a mine while you carry some; otherwise it fires like A
    const hasMines = p.mines > 0;
    if (hasMines && inp.altPressed) { this.dropMine(t); p.mines--; }
    const firePressed = inp.firePressed || (!hasMines && inp.altPressed);
    const fireHeld = inp.fire || (!hasMines && inp.alt);
    if (firePressed || (fireHeld && t.cool === 0)) {
      if (this.fire(t)) t.cool = t.boost.rapid ? 5 : t.reload || 14;
    }
  }

  updateEnemy(t) {
    if (t.shield > 0) t.shield--;
    if (t.reveal > 0) t.reveal--;
    if (this.freezeE > 0) return;
    if (t.cool > 0) t.cool--;
    const smart = t.ai > 0;
    let ok = true;
    if (t.hold > 0) {
      // a sniper parked in position; it moves on if a player gets too close
      t.hold--;
      const pt = this.nearestPlayer(t);
      if (pt && Math.abs(pt.x - t.x) + Math.abs(pt.y - t.y) < SNIPE_MIN - 8) t.hold = 0;
    } else {
      ok = this.move(t, t.dir);
      if (!ok) {
        t.blocked++;
        // personalities shoot their way through bricks instead of turning away
        const wait = smart && this.brickAhead(t) ? 40 : 6;
        if (t.blocked >= wait && Math.random() < 0.3) {
          if (smart) this.aiChoose(t, true); else this.chooseDir(t, true);
          t.blocked = 0;
        }
      } else {
        t.blocked = 0;
        if ((t.x & 7) === 0 && (t.y & 7) === 0) {
          if (smart) this.aiChoose(t, false);
          else if (Math.random() < 1 / 20) this.chooseDir(t, false);
        }
      }
    }
    if (t.mines > 0 && ok && !t.hold && Math.random() < (t.crusher ? 1 / 150 : 1 / 180)) { this.dropMine(t); t.mines--; }
    const maxB = t.boost.rapid ? 3 : 1;
    if (t.bullets < maxB && t.cool === 0) {
      let chance = ok ? 0.022 : 0.07;
      if (this.targetInSight(t)) chance = 0.15;
      if (t.hold > 0) chance = 0.1;
      else if (smart && !ok && this.brickAhead(t)) chance = 0.2;
      chance *= Config.scale('enemyFire') * (t.boost.rapid ? 3 : 1) * (t.vet ? ENEMY_RANKS[t.vet].fire : 1);
      if (Math.random() < chance) { this.fire(t); t.cool = t.rocketGun ? 50 : 16; }
    }
  }

  targetInSight(t) {
    const targets = [{ x: BASE_X, y: BASE_Y }].concat(this.tanks.filter(o => o.isPlayer));
    for (const o of targets) {
      const dx = o.x - t.x, dy = o.y - t.y;
      if (Math.abs(dx) < 8 && ((t.dir === 0 && dy < 0) || (t.dir === 2 && dy > 0))) return true;
      if (Math.abs(dy) < 8 && ((t.dir === 3 && dx < 0) || (t.dir === 1 && dx > 0))) return true;
    }
    return false;
  }

  chooseDir(t, blocked) {
    const r = Math.random();
    const pBase = Math.min(0.8, Math.min(0.5, 0.25 + this.num * 0.008) * Config.scale('enemyAim'));
    let target = null;
    if (r < pBase) target = { x: BASE_X, y: BASE_Y };
    else if (r < pBase + 0.2) {
      const ps = this.tanks.filter(o => o.isPlayer);
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
    t.acc += t.speed * (t.boost.turbo ? TURBO_MULT : 1);
    let ok = true;
    while (t.acc >= 1) {
      t.acc -= 1;
      if (this.canStep(t, d)) {
        t.x += DXY[d][0];
        t.y += DXY[d][1];
        t.animTick++;
        if (t.crusher) this.crush(t);
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
      if (this.get(cx, cy) === T_BRICK) { this.set(cx, cy, T_EMPTY); n++; }
    }
    if (n && this.lastBrickSound < this.frame - 20) { Sound.play('brick'); this.lastBrickSound = this.frame; }
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
        if (tt === T_STEEL || (tt === T_BRICK && !t.boost.ghost && !t.crusher)) return false;
        if (tt === T_WATER && !t.ship && !t.boost.ghost) return false;
      }
    }
    if (overlap(nx, ny, 16, 16, BASE_X, BASE_Y, 16, 16)) return false;
    if (this.bosses.length && this.bossBlocksTank(t, nx, ny)) return false;
    for (const o of this.tanks) {
      if (o === t || !o.alive) continue;
      if (overlap(nx, ny, 16, 16, o.x, o.y, 16, 16) && !overlap(t.x, t.y, 16, 16, o.x, o.y, 16, 16)) return false;
    }
    return true;
  }

  fire(t) {
    if (t.bullets >= (t.boost.rapid ? Math.max(4, t.maxBullets) : t.maxBullets)) return false;
    const shell = (x, y, dir, free) => this.bullets.push({
      x, y, dir, speed: t.bulletSpeed, owner: t, free,
      isPlayer: t.isPlayer, power: t.power, cutter: t.cutter, alive: true,
      pierce: !!t.boost.pierce, rocket: !!(t.boost.rocket || t.rocketGun),
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
            // piercing shells plough through ordinary ones
            if (!a.pierce || c.pierce) this.killBullet(a, a.rocket);
            if (!c.pierce || a.pierce) this.killBullet(c, c.rocket);
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
    if (fx && b.rocket) this.blast(b.x + 2, b.y + 2, ROCKET_RADIUS, b.isPlayer, b.owner, b.power, exclude, excludeBoss);
    else if (fx) this.addFx(b.x + 2, b.y + 2, Sprites.smallExp, 3);
  }

  stepBullet(b, dist) {
    b.x += DXY[b.dir][0] * dist;
    b.y += DXY[b.dir][1] * dist;
    if (b.x < 0 || b.y < 0 || b.x > FW - 4 || b.y > FH - 4) {
      b.x = Math.max(0, Math.min(FW - 4, b.x));
      b.y = Math.max(0, Math.min(FH - 4, b.y));
      this.killBullet(b, true);
      if (b.isPlayer) Sound.play('steel');
      return;
    }
    if (this.bulletTerrain(b)) return;
    if (this.bosses.length && this.bossShell(b) === 'stop') return;
    if (overlap(b.x, b.y, 4, 4, BASE_X, BASE_Y, 16, 16)) {
      this.killBullet(b, true);
      if (this.baseAlive) this.destroyBase();
      return;
    }
    for (const t of this.tanks) {
      if (!t.alive || t === b.owner) continue;
      if (!overlap(b.x, b.y, 4, 4, t.x, t.y, 16, 16)) continue;
      if (b.pierce) {
        // piercing shells damage each tank once and keep flying
        if (b.isPlayer === t.isPlayer && (!b.isPlayer || Config.get('friendlyFire') === 'OFF')) continue;
        b.hits = b.hits || new Set();
        if (b.hits.has(t)) continue;
        b.hits.add(t);
        if (b.isPlayer && t.isPlayer) { if (t.shield <= 0) t.frozen = 180; }
        else if (b.isPlayer) this.hitEnemy(t, b.owner);
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
        if (t.isPlayer) {
          // friendly fire freezes the other player for a few seconds
          if (Config.get('friendlyFire') === 'OFF') continue;
          this.killBullet(b, false);
          if (t.shield <= 0) t.frozen = 180;
          return;
        }
        this.hitEnemy(t, b.owner);
        this.killBullet(b, true, t);
        return;
      }
      if (!t.isPlayer) continue;
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
        if (t === T_BRICK || t === T_STEEL || (t === T_FOREST && b.cutter)) {
          if (vert) { if (hitRow < 0 || (b.dir === 0 ? cy > hitRow : cy < hitRow)) hitRow = cy; }
          else if (hitCol < 0 || (b.dir === 3 ? cx > hitCol : cx < hitCol)) hitCol = cx;
        }
      }
    }
    if (hitRow < 0 && hitCol < 0) return false;

    // piercing shells tunnel through bricks (and trees for cutters), stopping only at steel they can't break
    if (b.pierce) {
      let blocked = false;
      for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) if (this.get(cx, cy) === T_STEEL && !b.power) blocked = true;
      if (!blocked) {
        const lo = vert ? Math.floor((b.x + 2 - 8) / 4) : Math.floor((b.y + 2 - 8) / 4);
        const hi = vert ? Math.floor((b.x + 2 + 7.99) / 4) : Math.floor((b.y + 2 + 7.99) / 4);
        for (let k = lo; k <= hi; k++) {
          const cx = vert ? k : hitCol, cy = vert ? hitRow : k, t = this.get(cx, cy);
          if (t === T_BRICK) this.set(cx, cy, T_EMPTY);
          else if (t === T_STEEL) this.clearGroup(cx, cy, T_STEEL);
          else if (t === T_FOREST && b.cutter) this.clearGroup(cx, cy, T_FOREST);
        }
        if (b.isPlayer && this.lastBrickSound < this.frame - 3) { Sound.play('brick'); this.lastBrickSound = this.frame; }
        return false;
      }
    }

    // a shell blasts a 16px-wide strip; power shells (star level 3) dig twice as deep and break steel
    const depth = b.power ? 2 : 1;
    const step = (b.dir === 0 || b.dir === 3) ? -1 : 1;
    let broke = false;
    const hitCell = (cx, cy) => {
      const t = this.get(cx, cy);
      if (t === T_BRICK) { this.set(cx, cy, T_EMPTY); broke = true; }
      else if (t === T_STEEL && b.power) { this.clearGroup(cx, cy, T_STEEL); broke = true; }
      else if (t === T_FOREST && b.cutter) { this.clearGroup(cx, cy, T_FOREST); broke = true; }
    };
    if (vert) {
      const mx = b.x + 2, c0 = Math.floor((mx - 8) / 4), c1 = Math.floor((mx + 7.99) / 4);
      for (let k = 0; k < depth; k++) for (let c = c0; c <= c1; c++) hitCell(c, hitRow + k * step);
    } else {
      const my = b.y + 2, r0 = Math.floor((my - 8) / 4), r1 = Math.floor((my + 7.99) / 4);
      for (let k = 0; k < depth; k++) for (let r = r0; r <= r1; r++) hitCell(hitCol + k * step, r);
    }
    this.killBullet(b, true);
    if (b.isPlayer) Sound.play(broke ? 'brick' : 'steel');
    return true;
  }

  // ------------------------------------------------------------ blasts and mines
  // explosion that breaks bricks (steel with power) and damages the other side's tanks
  blast(cx, cy, r, byPlayer, owner, power, exclude, excludeBoss) {
    for (let y = Math.floor((cy - r) / 4); y <= Math.floor((cy + r) / 4); y++) {
      for (let x = Math.floor((cx - r) / 4); x <= Math.floor((cx + r) / 4); x++) {
        if (Math.hypot(x * 4 + 2 - cx, y * 4 + 2 - cy) > r) continue;
        const t = this.get(x, y);
        if (t === T_BRICK) this.set(x, y, T_EMPTY);
        else if (t === T_STEEL && power) this.clearGroup(x, y, T_STEEL);
      }
    }
    const reaches = (x, y, w, h) => Math.hypot(Math.max(x, Math.min(cx, x + w)) - cx, Math.max(y, Math.min(cy, y + h)) - cy) < r - 2;
    for (const t of this.tanks) {
      if (!t.alive || t === exclude || !reaches(t.x, t.y, 16, 16)) continue;
      if (byPlayer && !t.isPlayer) this.hitEnemy(t, owner);
      else if (!byPlayer && t.isPlayer) this.hitPlayer(t);
    }
    if (!byPlayer && this.baseAlive && reaches(BASE_X, BASE_Y, 16, 16)) this.destroyBase();
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
      const victim = this.tanks.find(t => t.alive && t.isPlayer !== m.byPlayer && overlap(t.x, t.y, 16, 16, m.x - 4, m.y - 4, 8, 8));
      if (victim) {
        m.done = true;
        this.blast(m.x, m.y, MINE_RADIUS, m.byPlayer, m.owner, false);
      }
    }
    this.mines = this.mines.filter(m => !m.done);
  }

  // ------------------------------------------------------------ damage
  hitEnemy(t, by) {
    t.reveal = 90;
    if (t.bonus) { t.bonus = false; this.spawnPowerup(); }
    if (t.shield > 0) { Sound.play('steel'); return; }
    t.hp--;
    if (t.hp > 0) { Sound.play('armor'); return; }
    this.killEnemy(t, by, true);
  }

  killEnemy(t, by, award, silent) {
    if (!t.alive) return;
    t.alive = false;
    this.killed++;
    this.addFx(t.x + 8, t.y + 8, BIG_EXPLOSION(), 5);
    if (!silent) Sound.play('explode');
    if (award && by && by.isPlayer) {
      const p = by.player, pts = ENEMY[t.type].pts;
      p.kills[t.type]++;
      this.addXp(p, ENEMY[t.type].xp * (t.vet ? ENEMY_RANKS[t.vet].xp : 1) + (t.bonus ? 5 : 0));
      this.addScore(p, pts);
      this.popups.push({ x: t.x + 8, y: t.y + 8, text: String(pts), t: 0, delay: 25 });
    }
  }

  hitPlayer(t) {
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
    // optional: lose part of the progress towards the next level (never a whole level)
    const loss = Config.get('xpLoss');
    if (Config.xpOn() && loss) {
      const floor = RANKS[p.rank - 1].xp;
      p.xp = Math.max(floor, p.xp - Math.round((p.xp - floor) * loss / 100));
    }
    p.tank = null;
    if (Config.infiniteLives()) {
      this.spawnPlayer(p, 30);
    } else if (p.lives > 0) {
      p.lives--;
      this.spawnPlayer(p, 30);
    } else {
      p.out = true;
      if (this.players.every(q => q.out)) this.startOver();
    }
  }

  destroyBase() {
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
    if (!p || !Config.xpOn()) return;
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
  spawnPowerup() {
    // only power-ups enabled in the settings can appear
    const weights = POWERUPS.map((pu, i) => (Config.get('pu' + i) === 'OFF' ? 0 : pu.weight));
    const total = weights.reduce((a, b) => a + b, 0);
    if (total === 0) return;
    let r = rnd(total), type = 0;
    while (r >= weights[type]) { r -= weights[type]; type++; }
    let x = 0, y = 0;
    for (let tries = 0; tries < 60; tries++) {
      x = rnd((FW - 16) / 8 + 1) * 8; y = rnd((FH - 16) / 8 + 1) * 8;
      if (overlap(x, y, 16, 16, BASE_X - 16, BASE_Y - 16, 48, 32)) continue;
      let bad = 0;
      for (let cy = y >> 2; cy < (y + 16) >> 2; cy++) for (let cx = x >> 2; cx < (x + 16) >> 2; cx++) {
        const t = this.get(cx, cy);
        if (t === T_STEEL || t === T_WATER) bad++;
      }
      if (bad <= 4) break;
    }
    this.powerup = { type, x, y, t: 0 };
    Sound.play('puAppear');
  }

  checkPickups() {
    const pu = this.powerup;
    if (!pu) return;
    const order = this.tanks.filter(t => t.isPlayer).concat(this.tanks.filter(t => !t.isPlayer));
    for (const t of order) {
      if (t.alive && Config.canCollect(pu.type, t.isPlayer) && overlap(t.x, t.y, 16, 16, pu.x + 2, pu.y + 2, 12, 12)) {
        this.powerup = null;
        this.applyPowerup(t, pu);
        return;
      }
    }
  }

  applyPowerup(t, pu) {
    const enemies = this.tanks.filter(e => !e.isPlayer && e.alive);
    if (t.isPlayer) {
      const p = t.player;
      let snd = 'pickup';
      this.addScore(p, 500);
      this.addXp(p, 5);
      if (POWERUPS[pu.type].isNew) this.popups.push({ x: pu.x + 8, y: pu.y + 8, text: POWERUPS[pu.type].name, label: true, color: COL.white, t: 0, delay: 0 });
      else this.popups.push({ x: pu.x + 8, y: pu.y + 8, text: '500', t: 0, delay: 0 });
      if (TIMED_BOOSTS[pu.type]) t.boost[TIMED_BOOSTS[pu.type]] = Config.frames('newTime');
      switch (pu.type) {
        case PU.HELMET: t.shield = Config.frames('helmetTime'); break;
        case PU.CLOCK: this.freezeE = Config.frames('clockTime'); snd = 'freeze'; break;
        case PU.SHOVEL: this.shovel = Config.frames('shovelTime'); this.setBaseWalls(T_STEEL); break;
        case PU.STAR:
          if (p.level < 3) p.level++; else p.cutter = true;
          t.applyLevel();
          break;
        case PU.GRENADE:
          enemies.forEach(e => this.killEnemy(e, null, false, true));
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
      }
      Sound.play(snd);
    } else {
      // Tank 1990 rule: enemies can grab bonuses too
      Sound.play('enemyPickup');
      switch (pu.type) {
        case PU.HELMET: enemies.forEach(e => { e.shield = Config.frames('helmetTime'); }); break;
        case PU.CLOCK: this.freezeP = Config.frames('clockTime'); break;
        case PU.SHOVEL: this.shovel = 0; this.setBaseWalls(T_EMPTY); break;
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
      }
      if (TIMED_BOOSTS[pu.type]) t.boost[TIMED_BOOSTS[pu.type]] = Config.frames('newTime');
    }
  }

  // ------------------------------------------------------------ rendering
  buildLayers() {
    if (!this.bgLayer) {
      this.bgLayer = makeCanvas(FW, FH);
      this.forestLayer = makeCanvas(FW, FH);
    }
    const bg = this.bgLayer.getContext('2d'), fo = this.forestLayer.getContext('2d'), tex = Sprites.tex;
    bg.clearRect(0, 0, FW, FH);
    fo.clearRect(0, 0, FW, FH);
    this.waterCells = [];
    for (let cy = 0; cy < GH; cy++) {
      for (let cx = 0; cx < GW; cx++) {
        const t = this.terrain[cy * GW + cx];
        if (!t) continue;
        const sx = (cx & 1) * 4, sy = (cy & 1) * 4, dx = cx * 4, dy = cy * 4;
        if (t === T_BRICK) bg.drawImage(tex.brick, sx, sy, 4, 4, dx, dy, 4, 4);
        else if (t === T_STEEL) bg.drawImage(tex.steel, sx, sy, 4, 4, dx, dy, 4, 4);
        else if (t === T_ICE) bg.drawImage(tex.ice, sx, sy, 4, 4, dx, dy, 4, 4);
        else if (t === T_FOREST) fo.drawImage(tex.forest, sx, sy, 4, 4, dx, dy, 4, 4);
        else if (t === T_WATER) this.waterCells.push(cy * GW + cx);
      }
    }
    this.dirty = false;
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
    if (t.isPlayer) {
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
    if (t.isPlayer) {
      // the tank wears its XP rank; a marshal (level 10) and a fresh promotion glow
      const lv = Config.xpOn() ? t.player.rank || 1 : 1;
      const img = Sprites.rankTank(spec, t.anim, t.dir, pal, lv, t.plates > 0);
      if (t.glow > 0 ? (t.glow >> 2) & 1 : lv >= 10 && (this.frame & 31) < 20) {
        ctx.drawImage(Sprites.outline(img, t.glow > 0 ? COL.white : COL.gold), t.x - 1, t.y - 1);
      }
      ctx.drawImage(img, t.x, t.y);
    } else {
      // a shade is a faint shimmer unless it just fired, got hit or is close to a player
      if (t.stealth) ctx.globalAlpha = Math.min(ctx.globalAlpha, this.shadeAlpha(t));
      // veterans and elites wear rank stripes (and an elite a turret star)
      ctx.drawImage(t.vet ? Sprites.rankTank(spec, t.anim, t.dir, pal, ENEMY_RANKS[t.vet].look, false) : Sprites.tank(spec, t.anim, t.dir, pal), t.x, t.y);
      if (t.ai && Config.on('aiMarks') && ctx.globalAlpha > 0.5) {
        ctx.fillStyle = AI_MARK[t.ai];
        ctx.fillRect(t.x + 7, t.y + 7, 2, 2);
      }
    }
    ctx.globalAlpha = 1;
    if (t.shield > 0) ctx.drawImage(Sprites.shield[(this.frame >> 1) & 1], t.x, t.y);
  }

  render(ctx) {
    ctx.fillStyle = COL.bg;
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
    ctx.fillStyle = COL.black;
    ctx.fillRect(FX, FY, FW, FH);
    if (this.dirty) this.buildLayers();

    ctx.save();
    ctx.translate(FX, FY);
    ctx.beginPath();
    ctx.rect(0, 0, FW, FH);
    ctx.clip();

    ctx.drawImage(this.bgLayer, 0, 0);
    const wt = Sprites.tex[(this.frame >> 5) & 1 ? 'water1' : 'water0'];
    for (const i of this.waterCells) {
      const cx = i % GW, cy = (i / GW) | 0;
      ctx.drawImage(wt, (cx & 1) * 4, (cy & 1) * 4, 4, 4, cx * 4, cy * 4, 4, 4);
    }
    ctx.drawImage(this.baseAlive ? Sprites.eagle : Sprites.eagleDead, BASE_X, BASE_Y);

    for (const m of this.mines) ctx.drawImage(Sprites.mine[m.t < MINE_ARM_TIME || ((this.frame >> 3) & 1) ? 1 : 0], m.x - 4, m.y - 4);
    this.renderBossUnder(ctx);
    for (const t of this.tanks) this.drawTank(ctx, t);
    this.renderBosses(ctx);
    for (const s of this.spawns) {
      if (s.t > SPARKLE_TIME) continue;
      const k = Math.floor((SPARKLE_TIME - s.t) / 4) % 6;
      ctx.drawImage(Sprites.sparkle[[0, 1, 2, 3, 2, 1][k]], s.x, s.y);
    }
    for (const b of this.bullets) {
      const spr = b.rocket ? Sprites.bulletRocket : b.pierce ? Sprites.bulletPierce : Sprites.bullet;
      ctx.drawImage(spr[b.dir], Math.round(b.x), Math.round(b.y));
    }

    this.renderBeams(ctx);
    ctx.drawImage(this.forestLayer, 0, 0);

    if (this.powerup && ((this.powerup.t >> 3) & 1) === 0) {
      ctx.drawImage(Sprites.powerups[this.powerup.type], this.powerup.x, this.powerup.y);
    }
    for (const f of this.fx) {
      if (f.tick < 0) continue;
      const fr = f.frames[Math.min(f.frames.length - 1, Math.floor(f.tick / f.per))];
      ctx.drawImage(fr, Math.round(f.x - fr.width / 2), Math.round(f.y - fr.height / 2));
    }
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
    if (this.over) {
      const y = Math.max(FH / 2 - 8, FH - this.overTimer * 1.3);
      Font.draw(ctx, 'GAME', FW / 2 - 15, y, COL.red);
      Font.draw(ctx, 'OVER', FW / 2 - 15, y + 9, COL.red);
    }
    this.renderBossBanner(ctx);
    this.renderRankMsg(ctx);
    ctx.restore();
    this.renderHud(ctx);
  }

  // promotion banner at the top of the field: "II-PLAYER LEVEL 5" / rank name / new perk
  renderRankMsg(ctx) {
    const m = this.rankMsg;
    if (!m) return;
    const rk = RANKS[m.r - 1], who = this.players.length > 1 ? ROMAN[m.p.i] + '-PLAYER ' : '';
    const perk = Config.get('perks') === 'ON' ? rk.perk : '';
    const lines = [[who + 'LEVEL ' + m.r, COL.gold], [rk.name, COL.white]].concat(perk ? [[perk, COL.lgrey]] : []);
    const w = Math.min(FW, Math.max(...lines.map(l => l[0].length)) * 8 + 12), h = lines.length * 10 + 6;
    const x = (FW - w) >> 1, y = 16 + (m.t > 225 ? (m.t - 225) * -2 : 0);
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(x, y, w, h);
    lines.forEach(([text, c], i) => Font.drawCenter(ctx, text, FW / 2, y + 4 + i * 10, c));
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

  renderHud(ctx) {
    const H = HUD_X, n = this.bossIdx === undefined ? Math.min(20, this.queue.length) : 0;
    if (this.bossIdx !== undefined) this.renderBossHud(ctx, H);
    for (let i = 0; i < n; i++) ctx.drawImage(Sprites.enemyIcon, H + (i % 2) * 8, 24 + (i >> 1) * 8);
    // more than 20 waiting: show how many in total
    if (n && this.queue.length > 20) Font.drawCenter(ctx, String(this.queue.length), H + 8, 106, COL.black);
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
          ctx.fillStyle = '#505050';
          for (let k = 0; k < Math.min(4, p.mines || 0); k++) ctx.fillRect(H + 22, y + 1 + k * 3, 2, 2);
        } else if (p.mines) {
          ctx.fillStyle = '#505050';
          for (let k = 0; k < Math.min(3, p.mines); k++) ctx.fillRect(H + 1 + k * 3, y + 9, 2, 2);
        }
      });
      ctx.drawImage(Sprites.flag, H, 184);
      Font.drawRight(ctx, String(this.num), H + 16, 200, COL.black);
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
        ctx.fillStyle = '#505050';
        for (let k = 0; k < Math.min(5, p.mines || 0); k++) ctx.fillRect(H + 1 + k * 3, y + 25, 2, 2);
      } else if (p.mines) {
        ctx.drawImage(Sprites.mine[0], H, y + 16);
        Font.draw(ctx, String(Math.min(9, p.mines)), H + 8, y + 16, COL.black);
      }
    });
    ctx.drawImage(Sprites.flag, H, 184);
    Font.drawRight(ctx, String(this.num), H + 16, 200, COL.black);
  }
}
