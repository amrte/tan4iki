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

// basic, fast, power, armor
const ENEMY = [
  { speed: 0.5, bullet: 2.5, hp: 1, pts: 100 },
  { speed: 1.25, bullet: 2.5, hp: 1, pts: 200 },
  { speed: 0.75, bullet: 4.5, hp: 1, pts: 300 },
  { speed: 0.5, bullet: 2.5, hp: 4, pts: 400 },
];

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

class Tank {
  constructor(o) {
    this.x = 0; this.y = 0; this.dir = 0; this.acc = 0; this.animTick = 0; this.anim = 0;
    this.shield = 0; this.frozen = 0; this.bullets = 0; this.cool = 0; this.slide = 0;
    this.moving = false; this.alive = true; this.ship = false; this.cutter = false; this.power = false;
    this.blocked = 0; this.isPlayer = false; this.player = null; this.type = 0; this.hp = 1; this.bonus = false;
    this.speed = 0.75; this.bulletSpeed = 2.5; this.maxBullets = 1;
    this.boost = {};   // active timed power-ups: name -> frames left
    this.mines = 0;    // mines carried by an enemy tank
    Object.assign(this, o);
  }
  applyLevel() {
    const p = this.player, lv = p.level;
    this.speed = 0.75 * Config.scale('pSpeed');
    this.bulletSpeed = (lv >= 1 ? 4.5 : 2.5) * Config.scale('pShell');
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
      p.kills = [0, 0, 0, 0];
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
      'speed', 'bulletSpeed', 'maxBullets', 'boost', 'mines'];
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
    for (const p of this.players) { p.tank = null; p.kills = sn.kills[p.i] || [0, 0, 0, 0]; }
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
        this.tanks.push(new Tank({
          x: s.x, y: s.y, dir: 2, type: s.enemy.type, hp: st.hp, bonus: s.enemy.bonus,
          speed: st.speed, bulletSpeed: st.bullet, maxBullets: 1,
        }));
      } else {
        const p = s.player;
        const t = new Tank({ x: s.x, y: s.y, dir: 0, isPlayer: true, player: p, shield: Config.frames('spawnShield') });
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
    this.popups = this.popups.filter(p => p.t < p.delay + 48);

    // engine hum
    const pt = this.tanks.filter(t => t.isPlayer);
    Sound.setEngine(pt.length === 0 ? 0 : (pt.some(t => t.moving || t.slide > 0) ? 2 : 1));

    // stage end
    if (this.over) {
      this.overTimer++;
      if (this.overTimer >= 320) this.result = 'gameover';
    } else if (this.queue.length === 0 && !this.spawns.some(s => s.enemy) && !this.tanks.some(t => !t.isPlayer) && !this.bossAlive()) {
      this.clearTimer++;
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
      if (this.fire(t)) t.cool = t.boost.rapid ? 5 : 14;
    }
  }

  updateEnemy(t) {
    if (t.shield > 0) t.shield--;
    if (this.freezeE > 0) return;
    if (t.cool > 0) t.cool--;
    const ok = this.move(t, t.dir);
    if (!ok) {
      t.blocked++;
      if (t.blocked >= 6 && Math.random() < 0.3) { this.chooseDir(t, true); t.blocked = 0; }
    } else {
      t.blocked = 0;
      if ((t.x & 7) === 0 && (t.y & 7) === 0 && Math.random() < 1 / 20) this.chooseDir(t, false);
    }
    if (t.mines > 0 && ok && Math.random() < 1 / 180) { this.dropMine(t); t.mines--; }
    if (t.bullets < (t.boost.rapid ? 3 : 1) && t.cool === 0) {
      let chance = ok ? 0.022 : 0.07;
      if (this.targetInSight(t)) chance = 0.15;
      chance *= Config.scale('enemyFire') * (t.boost.rapid ? 3 : 1);
      if (Math.random() < chance) { this.fire(t); t.cool = 16; }
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
      } else {
        ok = false;
        t.acc = 0;
        break;
      }
    }
    t.anim = (t.animTick >> 1) & 1;
    return ok;
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
        if (tt === T_STEEL || (tt === T_BRICK && !t.boost.ghost)) return false;
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
      pierce: !!t.boost.pierce, rocket: !!t.boost.rocket,
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
      this.addScore(p, pts);
      this.popups.push({ x: t.x + 8, y: t.y + 8, text: String(pts), t: 0, delay: 25 });
    }
  }

  hitPlayer(t) {
    if (!t.alive || t.shield > 0) return;
    const p = t.player;
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
      // armor tanks start green and fade to silver as they take hits
      else if (t.hp >= 4) pal = 'green';
      else if (t.hp === 3) pal = 'gold';
      else if (t.hp === 2) pal = (this.frame >> 2) & 1 ? 'gold' : 'silver';
      else pal = 'silver';
    }
    if (t.boost.ghost) ctx.globalAlpha = (this.frame >> 2) & 1 ? 0.35 : 0.6;
    ctx.drawImage(Sprites.tank(spec, t.anim, t.dir, pal), t.x, t.y);
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
    ctx.restore();
    this.renderHud(ctx);
  }

  renderHud(ctx) {
    const H = HUD_X, n = this.bossIdx === undefined ? Math.min(20, this.queue.length) : 0;
    if (this.bossIdx !== undefined) this.renderBossHud(ctx, H);
    for (let i = 0; i < n; i++) ctx.drawImage(Sprites.enemyIcon, H + (i % 2) * 8, 24 + (i >> 1) * 8);
    // more than 20 waiting: show how many in total
    if (n && this.queue.length > 20) Font.drawCenter(ctx, String(this.queue.length), H + 8, 106, COL.black);
    const lives = p => (Config.infiniteLives() ? '~' : String(Math.min(99, p.lives)));
    if (this.players.length > 2) {
      // 3-4 players: one compact row each, the tank icon in the player's colour
      this.players.forEach((p, i) => {
        const y = 128 + i * 14;
        ctx.drawImage(Sprites.playerIcon(Config.playerPal(i)), H, y);
        Font.draw(ctx, lives(p), H + 8, y, COL.black);
        if (p.mines) { ctx.fillStyle = '#505050'; for (let k = 0; k < Math.min(3, p.mines); k++) ctx.fillRect(H + 1 + k * 3, y + 9, 2, 2); }
      });
      ctx.drawImage(Sprites.flag, H, 184);
      Font.drawRight(ctx, String(this.num), H + 16, 200, COL.black);
      return;
    }
    Font.draw(ctx, 'IP', H, 136, COL.black);
    ctx.drawImage(Sprites.lifeIcon, H, 144);
    Font.draw(ctx, lives(this.players[0]), H + 8, 144, COL.black);
    if (this.players[1]) {
      Font.draw(ctx, 'IIP', H, 160, COL.black);
      ctx.drawImage(Sprites.lifeIcon, H, 168);
      Font.draw(ctx, lives(this.players[1]), H + 8, 168, COL.black);
    }
    // mines carried
    this.players.forEach((p, i) => {
      if (!p.mines) return;
      const y = i === 0 ? 152 : 176;
      ctx.drawImage(Sprites.mine[0], H, y);
      Font.draw(ctx, String(Math.min(9, p.mines)), H + 8, y, COL.black);
    });
    ctx.drawImage(Sprites.flag, H, 184);
    Font.drawRight(ctx, String(this.num), H + 16, 200, COL.black);
  }
}
