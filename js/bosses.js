'use strict';
// =====================================================================
//  Boss rounds: every Nth stage (default 10) is a boss stage with escorts.
//  Boss order: IRON BEAR, MOLE, HYDRA, PHANTOM, DREADNOUGHT, then repeat tougher.
// =====================================================================

// hp: base hit points (before the BOSS HP setting, +50% in 2P, +50% per loop)
// escorts: enemy types (0 basic, 1 fast, 2 power, 3 armor) cycled to fill the escort count
const BOSSES = [
  { kind: 'bear', name: 'IRON BEAR', hp: 40, pts: 5000, w: 32, h: 32, escorts: [0, 0, 1, 0, 0, 1, 0, 1], desc: 'CHARGES, CRUSHING WALLS' },
  { kind: 'mole', name: 'MOLE', hp: 30, pts: 6000, w: 32, h: 32, escorts: [1, 1, 0, 1, 1, 0, 1, 1], desc: 'DIGS UNDER, POPS UP TO FIRE' },
  { kind: 'hydra', name: 'HYDRA', turretHp: 12, coreHp: 24, pts: 7000, w: 48, h: 32, escorts: [2, 0, 2, 1, 2, 0, 2, 1], desc: 'BREAK 3 TURRETS, THEN THE CORE' },
  { kind: 'phantom', name: 'PHANTOM', hp: 30, pts: 8000, w: 32, h: 32, escorts: [1, 2, 1, 2, 1, 2, 1, 2], desc: 'INVISIBLE, LEAVES DECOYS' },
  { kind: 'dread', name: 'DREADNOUGHT', hp: 100, pts: 10000, w: 48, h: 48, escorts: [3, 2, 3, 2, 3, 2, 3, 3], desc: '3 PHASES, AN ARMY INSIDE' },
];

// Arenas (13x13 tile codes, same legend as LEVELS). The eagle fortress is added by the loader.
const BOSS_ARENAS = [
  [ // IRON BEAR: open ground, brick walls to smash, steel pillars to stun it on
    '.............',
    '.............',
    '..##.....##..',
    '..#..@.@..#..',
    '..#.......#..',
    '@....###....@',
    '.............',
    '...@.....@...',
    '.##.#...#.##.',
    '.............',
    '..@.......@..',
    '.#.........#.',
    '.............',
  ],
  [ // MOLE: dense bricks and forest, a steel ring in front of the eagle
    '.............',
    '.%%.#.%.#.%%.',
    '.%%.#.%.#.%%.',
    '...#.....#...',
    '.#..%%#%%..#.',
    '.#..%%#%%..#.',
    '...#.....#...',
    '%%.#.#.#.#.%%',
    '%%.........%%',
    '.##.%...%.##.',
    '....BBBBB....',
    '....R...L....',
    '.............',
  ],
  [ // HYDRA: an island moat at the top with two brick bridges; steel cap over the eagle
    '...~.....~...',
    '...~.....~...',
    '...~.....~...',
    '...~.....~...',
    '...~~#~#~~...',
    '.............',
    '.#.@.....@.#.',
    '.#...#.#...#.',
    '.....#.#.....',
    '.##.......##.',
    '....BBBBB....',
    '.............',
    '.............',
  ],
  [ // PHANTOM: ice fields (it leaves tracks) and forest
    '.............',
    '._____%_____.',
    '._%%__%__%%_.',
    '.__%%___%%__.',
    '.___________.',
    '%%__@___@__%%',
    '._____%_____.',
    '.__%%___%%__.',
    '._%%_____%%_.',
    '.___________.',
    '..#._____.#..',
    '.............',
    '.............',
  ],
  [ // DREADNOUGHT: steel bastion at the top, brick layers down to the eagle
    '...@.....@...',
    '...@.....@...',
    '...@.....@...',
    '...@@###@@...',
    '.#.........#.',
    '.#.##.#.##.#.',
    '.............',
    '@.##.#.#.##.@',
    '.............',
    '.#.#.###.#.#.',
    '.#.........#.',
    '.............',
    '.............',
  ],
];

function bossForStage(num) {
  if (!Config.on('bossRounds')) return null;
  const every = Config.get('bossEvery');
  if (num % every !== 0) return null;
  const n = num / every - 1;
  return { idx: n % BOSSES.length, loop: Math.floor(n / BOSSES.length) };
}

class Boss {
  constructor(o) {
    Object.assign(this, {
      kind: 'bear', x: 0, y: 0, w: 32, h: 32, dir: 2, hp: 1, maxHp: 1, alive: true, main: true,
      mode: 'roam', t: 0, cd: 60, acc: 0, animTick: 0, flash: 0, visibleT: 0, enraged: false,
      bullets: 0, isPlayer: false, power: false, cutter: false, speedMul: 1,
    }, o);
  }
}

// ------------------------------------------------------------------ sprites
const BOSS_PALS = {
  bear: [null, '#B8E890', '#5C9C34', '#1C3C0C', '#C8C8C8', '#E04030'],
  mole: [null, '#F0C080', '#B06828', '#4C2800', '#E0E0E0', '#F8D800'],
  hydra: [null, '#B8F0E8', '#2C9C9C', '#0C3C44', '#C860F0', '#F83800'],
  phantom: [null, '#FFFFFF', '#C8B8F8', '#6050B8', '#F0E8FF', '#58F8F8'],
  dread: [null, '#D8D8E8', '#7C7C98', '#282838', '#E04030', '#F8D800'],
  f: [null, '#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF'],
  r: [null, '#FFC0B0', '#E04030', '#600000', '#F87858', '#FFFF00'],
};

function bossPainter(w, h) {
  const g = [];
  for (let y = 0; y < h; y++) g.push(new Array(w).fill(0));
  const P = {
    g,
    px(x, y, c) { x |= 0; y |= 0; if (x >= 0 && y >= 0 && x < w && y < h) g[y][x] = c; },
    rect(x0, y0, x1, y1, c) { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) P.px(x, y, c); },
    box(x0, y0, x1, y1) {
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        let c = 2;
        if (x === x0 || y === y0) c = 1;
        if (x === x1 || y === y1) c = 3;
        P.px(x, y, c);
      }
    },
    circle(cx, cy, r) {
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const dx = x + 0.5 - cx, dy = y + 0.5 - cy, d = Math.hypot(dx, dy);
        if (d <= r) P.px(x, y, d > r - 1 ? (dx + dy < 0 ? 1 : 3) : (dx + dy < -r * 0.4 ? 1 : 2));
      }
    },
    treads(x0, x1, y0, y1, frame) {
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        const edge = x === x0 || x === x1 || y === y0 || y === y1;
        P.px(x, y, edge || (y + frame * 2) % 4 === 0 ? 3 : ((y + frame * 2) % 4 === 1 ? 1 : 2));
      }
    },
  };
  return P;
}

const BOSS_DRAW = {
  bear(f) {
    const P = bossPainter(32, 32);
    P.treads(1, 7, 3, 30, f); P.treads(24, 30, 3, 30, f);
    P.box(6, 6, 25, 28);
    P.rect(8, 10, 23, 10, 3); P.rect(8, 23, 23, 23, 3);
    P.rect(4, 2, 27, 4, 4); P.rect(4, 5, 27, 5, 3);            // ram plate
    for (let x = 5; x < 27; x += 4) { P.px(x, 1, 4); P.px(x + 1, 1, 4); }
    P.circle(16, 18, 7.5);
    P.rect(14, 0, 17, 13, 2); P.rect(14, 0, 14, 13, 1); P.rect(17, 0, 17, 13, 3); P.rect(13, 0, 18, 0, 3);
    P.rect(9, 26, 10, 26, 5); P.rect(21, 26, 22, 26, 5);
    return P.g;
  },
  mole(f) {
    const P = bossPainter(32, 32);
    P.treads(2, 7, 9, 30, f); P.treads(24, 29, 9, 30, f);
    P.box(7, 10, 24, 29);
    for (let y = 0; y <= 11; y++) {                            // spinning drill
      const half = 1 + y * 0.7;
      for (let x = 0; x < 32; x++) if (Math.abs(x + 0.5 - 16) <= half) P.px(x, y, ((x + y + f * 2) & 3) < 2 ? 4 : 2);
    }
    P.rect(8, 12, 23, 12, 3);
    P.circle(16, 20, 5.5);
    P.rect(15, 19, 16, 20, 5);
    P.rect(10, 26, 11, 29, 3); P.rect(20, 26, 21, 29, 3);
    return P.g;
  },
  phantom(f) {
    const P = bossPainter(32, 32);
    P.treads(3, 6, 5, 29, f); P.treads(25, 28, 5, 29, f);
    for (let y = 4; y <= 29; y++) {                            // sleek wedge hull
      const half = y < 12 ? 4 + (y - 4) * 1.2 : 13 - Math.max(0, y - 25);
      for (let x = 0; x < 32; x++) {
        const dx = x + 0.5 - 16;
        if (Math.abs(dx) > half) continue;
        let c = dx < -half + 1.5 ? 1 : dx > half - 1.5 ? 3 : 2;
        if (y === 4) c = 1;
        if (y === 29) c = 3;
        P.px(x, y, c);
      }
    }
    P.rect(11, 13, 20, 15, 5); P.rect(11, 13, 20, 13, 4);      // glowing visor
    P.rect(15, 0, 15, 12, 1); P.rect(16, 0, 16, 12, 2);
    P.rect(9, 26, 10, 29, 3); P.rect(21, 26, 22, 29, 3);
    return P.g;
  },
  dread(f) {
    const P = bossPainter(48, 48);
    P.treads(0, 7, 3, 46, f); P.treads(40, 47, 3, 46, f);
    P.treads(8, 11, 6, 43, f + 1); P.treads(36, 39, 6, 43, f + 1);
    P.box(10, 5, 37, 45);
    P.rect(12, 11, 35, 11, 3); P.rect(12, 38, 35, 38, 3);
    P.circle(12.5, 15, 5.5); P.circle(35.5, 15, 5.5);
    for (const x0 of [11, 34]) { P.rect(x0, 0, x0 + 3, 12, 2); P.rect(x0, 0, x0, 12, 1); P.rect(x0 + 3, 0, x0 + 3, 12, 3); P.rect(x0 - 1, 0, x0 + 4, 0, 3); }
    P.rect(19, 21, 28, 30, 3); P.rect(20, 22, 27, 29, 2); P.rect(20, 22, 27, 22, 1);   // hatch
    P.circle(24, 36, 5.5);
    for (const x of [14, 19, 28, 33]) P.rect(x, 42, x, 43, 4);
    return P.g;
  },
  hydra(f) {                                                   // faces down, never rotates
    const P = bossPainter(48, 32);
    P.treads(0, 5, 1, 30, f); P.treads(42, 47, 1, 30, f);
    P.box(4, 2, 43, 29);
    P.rect(6, 22, 41, 22, 3);
    P.rect(19, 21, 28, 28, 3); P.rect(20, 22, 27, 27, 2);      // armoured core plate
    return P.g;
  },
  // Hydra turrets (16x16, barrels down): 0 gatling, 1 laser, 2 rocket, 3 wreck
  turret(k) {
    const P = bossPainter(16, 16);
    if (k === 3) {
      P.circle(8, 6, 5.5);
      for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if (P.g[y][x]) P.g[y][x] = (x * 7 + y * 3) % 5 === 0 ? 2 : 3;
      return P.g;
    }
    P.circle(8, 6, 5.5);
    if (k === 0) { P.rect(5, 8, 6, 15, 2); P.rect(9, 8, 10, 15, 2); P.rect(5, 8, 5, 15, 1); P.rect(9, 8, 9, 15, 1); P.rect(5, 15, 10, 15, 3); }
    if (k === 1) { P.rect(7, 8, 8, 15, 1); P.rect(6, 13, 9, 15, 5); }
    if (k === 2) { P.rect(5, 9, 10, 13, 2); P.rect(5, 9, 10, 9, 1); P.rect(6, 14, 9, 15, 4); }
    P.px(8, 6, 4);
    return P.g;
  },
};

const BossGfx = {
  cache: new Map(),
  // kind: bear/mole/phantom/dread/hydra or 'turret0'..'turret3'; variant: n (normal), f (hit flash), r (rage)
  get(kind, frame, dir, variant = 'n') {
    const k = kind + frame + dir + variant;
    let c = this.cache.get(k);
    if (!c) {
      const isTurret = kind.startsWith('turret');
      let g = isTurret ? BOSS_DRAW.turret(+kind[6]) : BOSS_DRAW[kind](frame);
      if (!isTurret && kind !== 'hydra') for (let i = 0; i < dir; i++) g = rotGrid(g);
      const pal = variant === 'n' ? BOSS_PALS[isTurret ? 'hydra' : kind] : BOSS_PALS[variant];
      c = gridCanvas(g, pal);
      this.cache.set(k, c);
    }
    return c;
  },
};

// ------------------------------------------------------------------ stage integration
Object.assign(Stage.prototype, {
  initBoss(info) {
    const def = BOSSES[info.idx];
    const mult = Config.scale('bossHp') * Config.skill().boss * (1 + 0.5 * this.extraPlayers) * (1 + 0.5 * info.loop);
    const hp = n => Math.max(1, Math.round(n * mult));
    this.bossIdx = info.idx;
    this.bossLoop = info.loop;
    this.bossDropAt = [0.75, 0.5, 0.25];
    this.bossBanner = 180;
    this.encounter('b' + info.idx);   // cards.js
    const b = new Boss({ kind: def.kind, w: def.w, h: def.h, x: Math.round((FW - def.w) / 16) * 8, y: 0, speedMul: 1 + 0.15 * info.loop });
    if (def.kind === 'hydra') {
      b.y = 16;
      b.turrets = [0, 1, 2].map(() => ({ hp: hp(def.turretHp), max: hp(def.turretHp), cd: 90, burst: 0 }));
      b.core = hp(def.coreHp);
      b.hp = b.maxHp = b.turrets.reduce((a, t) => a + t.hp, 0) + b.core;
      b.home = b.x;
      b.drift = 1;
      // a ship is part of this arena: it lets you reach the island
      this.powerup = { type: PU.SHIP, x: Math.max(0, BASE_X - 64), y: Math.min(FH - 48, 112), t: 0 };
    } else {
      b.hp = b.maxHp = hp(def.hp);
    }
    if (def.kind === 'mole') { b.mode = 'under'; b.y = 16; }
    if (def.kind === 'dread') { b.phase = 1; b.cannon = 0; b.hatchT = 0; b.mineT = 0; b.volT = 0; b.laserT = 0; }
    if (def.kind === 'phantom') { b.tele = 0; }
    this.bosses = [b];
    // escorts replace the normal line-up: 40% of "tanks per stage" (8 by default)
    const n = Math.max(4, Math.round(Config.get('enemyCount') * 0.4));
    this.queue = [];
    for (let i = 0; i < n; i++) this.queue.push({ type: def.escorts[i % def.escorts.length], bonus: false });
    this.total = n;
    this.maxEnemies = Math.min(this.maxEnemies, 3 + Math.min(2, this.extraPlayers));
  },

  mainBoss() { return this.bosses.find(b => b.main); },
  bossAlive() { return this.bosses.some(b => b.main && b.alive); },

  bossTangible(b) {
    if (!b.alive) return false;
    if (b.kind === 'mole') return b.mode === 'up' || b.mode === 'burrow';
    return true;
  },

  // used by the spawner: keep entry points free of bosses (and the column above them)
  bossBlocksSpawn(x) {
    return this.bosses.some(b => b.alive && this.bossTangible(b) && overlap(x, 0, 16, 16, b.x, 0, b.w, b.y + b.h));
  },

  bossBlocksTank(t, nx, ny) {
    for (const b of this.bosses) {
      if (!this.bossTangible(b)) continue;
      if (overlap(nx, ny, 16, 16, b.x, b.y, b.w, b.h) && !overlap(t.x, t.y, 16, 16, b.x, b.y, b.w, b.h)) return true;
    }
    return false;
  },

  // a shell reaches a boss; returns 'stop', 'pass' or null (no boss there)
  bossShell(b) {
    for (const bo of this.bosses) {
      if (bo === b.owner || !this.bossTangible(bo)) continue;
      if (!overlap(b.x, b.y, 4, 4, bo.x, bo.y, bo.w, bo.h)) continue;
      if (!b.isPlayer) continue; // enemy shells fly through bosses
      if (b.pierce) {
        b.hits = b.hits || new Set();
        if (b.hits.has(bo)) continue;
        b.hits.add(bo);
        this.bossHit(bo, 1, b.owner, b.x + 2);
        return 'pass';
      }
      this.bossHit(bo, 1, b.owner, b.x + 2);
      this.killBullet(b, true, null, bo);
      return 'stop';
    }
    return null;
  },

  bossHit(bo, dmg, by, hx) {
    if (!this.bossTangible(bo)) return;
    if (bo.kind === 'decoy') {
      bo.alive = false;
      this.addFx(bo.x + 16, bo.y + 16, Sprites.smallExp, 4);
      Sound.play('steel');
      return;
    }
    if (bo.kind === 'hydra') {
      const zone = Math.max(0, Math.min(2, Math.floor(((hx === undefined ? bo.x + 24 : hx) - bo.x) / 16)));
      // the centre column is the laser turret (index 1); left gatling (0), right rocket (2)
      const tur = bo.turrets[zone];
      if (tur.hp > 0) {
        tur.hp = Math.max(0, tur.hp - dmg);
        if (tur.hp === 0) {
          this.addFx(bo.x + zone * 16 + 8, bo.y + 8, BIG_EXPLOSION(), 5);
          Sound.play('explode');
        }
      } else if (bo.turrets.every(t => t.hp === 0)) {
        bo.core = Math.max(0, bo.core - dmg);
      } else {
        // armour between live turrets: no damage
        Sound.play('steel');
        return;
      }
      bo.hp = bo.turrets.reduce((a, t) => a + t.hp, 0) + bo.core;
    } else {
      bo.hp -= dmg * (bo.mode === 'dazed' ? 2 : 1);
    }
    bo.flash = 6;
    if (by && by.isPlayer) { this.lastBossHitter = by.player; this.addXp(by.player, 2 * dmg); }
    Sound.play('armor');
    const frac = Math.max(0, bo.hp) / bo.maxHp;
    while (this.bossDropAt.length && frac <= this.bossDropAt[0]) { this.bossDropAt.shift(); this.spawnPowerup(); }
    if (!bo.enraged && frac <= 0.5) { bo.enraged = true; Sound.play('bossWarn'); }
    if (bo.hp <= 0) this.killBoss(bo);
  },

  killBoss(bo) {
    bo.alive = false;
    this.bossDefeated = true;
    // a chain of explosions over the hull
    for (let i = 0; i < 8; i++) {
      this.fx.push({ x: bo.x + 4 + Math.random() * (bo.w - 8), y: bo.y + 4 + Math.random() * (bo.h - 8), frames: BIG_EXPLOSION(), per: 5, tick: -i * 8 });
    }
    Sound.play('bossDie');
    const def = BOSSES[this.bossIdx];
    const p = this.lastBossHitter || this.players.find(q => !q.out) || this.players[0];
    const pts = def.pts * (1 + this.bossLoop);
    this.addScore(p, pts);
    this.popups.push({ x: bo.x + bo.w / 2, y: bo.y + bo.h / 2, text: String(pts), t: 0, delay: 50 });
    // XP: 200 for the final blow, 100 for everyone else still in the fight
    for (const q of this.players) if (!q.out || q === p) this.addXp(q, (q === p ? 200 : 100) * (1 + this.bossLoop));
    // the escorts and anything left of the boss go with it
    for (const t of this.tanks) if (!t.isPlayer && t.alive) this.killEnemy(t, null, false, true);
    for (const o of this.bosses) o.alive = false;
    this.queue = [];
    this.spawns = this.spawns.filter(s => !s.enemy);
    this.beams = [];
    this.mines = this.mines.filter(m => m.byPlayer);
  },

  // ------------------------------------------------------------ boss helpers
  bossCenter(b) { return [b.x + b.w / 2, b.y + b.h / 2]; },

  bossTarget(b) {
    const [cx, cy] = this.bossCenter(b);
    let best = null, bd = 1e9;
    for (const t of this.tanks) {
      if (!t.isPlayer || !t.alive || t.boost.smoke) continue;
      const d = Math.hypot(t.x + 8 - cx, t.y + 8 - cy);
      if (d < bd) { bd = d; best = [t.x + 8, t.y + 8]; }
    }
    return best || [BASE_X + 8, BASE_Y + 8];
  },

  dirToward(fx, fy, tx, ty) {
    const dx = tx - fx, dy = ty - fy;
    return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : (dy > 0 ? 2 : 0);
  },

  bossFire(b, cx, cy, dir, opts = {}) {
    this.bullets.push(Object.assign({
      x: cx - 2, y: cy - 2, dir, speed: 2.5, owner: b, free: true, isPlayer: false,
      power: false, cutter: false, alive: true, pierce: false, rocket: false,
    }, opts));
  },

  // the point just outside the boss on side `dir`, offset along that side
  bossMuzzle(b, dir, off = 0) {
    const [cx, cy] = this.bossCenter(b);
    const [dx, dy] = DXY[dir];
    return [cx + dx * (b.w / 2 + 2) + (dy ? off : 0), cy + dy * (b.h / 2 + 2) + (dx ? off : 0)];
  },

  // one pixel step; crush: break bricks and run over tanks
  bossStep(b, d, crush) {
    const nx = b.x + DXY[d][0], ny = b.y + DXY[d][1];
    if (nx < 0 || ny < 0 || nx + b.w > FW || ny + b.h > FH) return 'edge';
    if (overlap(nx, ny, b.w, b.h, BASE_X, BASE_Y, 16, 16)) return 'eagle';
    let x0, x1, y0, y1;
    switch (d) {
      case 0: x0 = nx; x1 = nx + b.w - 1; y0 = y1 = ny; break;
      case 2: x0 = nx; x1 = nx + b.w - 1; y0 = y1 = ny + b.h - 1; break;
      case 1: y0 = ny; y1 = ny + b.h - 1; x0 = x1 = nx + b.w - 1; break;
      default: y0 = ny; y1 = ny + b.h - 1; x0 = x1 = nx; break;
    }
    const bricks = [];
    for (let cy = y0 >> 2; cy <= y1 >> 2; cy++) for (let cx = x0 >> 2; cx <= x1 >> 2; cx++) {
      const t = this.get(cx, cy);
      if (t === T_STEEL) return 'steel';
      if (t === T_WATER) return 'water';
      if (t === T_BRICK) { if (!crush) return 'brick'; bricks.push([cx, cy]); }
    }
    for (const o of this.bosses) {
      if (o !== b && this.bossTangible(o) && overlap(nx, ny, b.w, b.h, o.x, o.y, o.w, o.h) && !overlap(b.x, b.y, b.w, b.h, o.x, o.y, o.w, o.h)) return 'tank';
    }
    for (const t of this.tanks) {
      if (!t.alive || !overlap(nx, ny, b.w, b.h, t.x, t.y, 16, 16) || overlap(b.x, b.y, b.w, b.h, t.x, t.y, 16, 16)) continue;
      if (!crush) return 'tank';
      if (t.isPlayer) { this.hitPlayer(t); if (t.alive) return 'tank'; }
      else this.killEnemy(t, null, false);
    }
    for (const [cx, cy] of bricks) this.set(cx, cy, T_EMPTY);
    if (bricks.length && this.frame % 6 === 0) Sound.play('brick');
    b.x = nx; b.y = ny;
    b.animTick++;
    return null;
  },

  bossMove(b, d, speed, crush) {
    b.acc += speed * b.speedMul;
    while (b.acc >= 1) {
      b.acc -= 1;
      const r = this.bossStep(b, d, crush);
      if (r) { b.acc = 0; return r; }
    }
    return null;
  },

  // wander like a tank, drifting toward a target
  bossRoam(b, speed, bias = 0.6) {
    const r = this.bossMove(b, b.dir, speed, false);
    if (r || ((b.x & 7) === 0 && (b.y & 7) === 0 && Math.random() < 1 / 40)) {
      const [cx, cy] = this.bossCenter(b), [tx, ty] = this.bossTarget(b);
      let d = Math.random() < bias ? this.dirToward(cx, cy, tx, ty) : rnd(4);
      if (r && d === b.dir) d = (d + 1 + rnd(3)) % 4;
      b.dir = d;
    }
  },

  summonEscort(type) {
    if (this.tanks.filter(t => !t.isPlayer).length + this.spawns.filter(s => s.enemy).length >= this.maxEnemies + 2) return;
    const free = ENEMY_SPAWN_X.filter(x => !this.bossBlocksSpawn(x));
    if (!free.length) return;
    this.spawns.push({ x: free[rnd(free.length)], y: 0, t: SPARKLE_TIME, enemy: { type, bonus: false } });
  },

  addBeam(x, y0, warn = 50) {
    // runs down the column until steel (the eagle itself is never hit)
    let y1 = FH;
    for (let y = Math.max(0, y0); y < FH; y += 4) {
      let blocked = false;
      for (let cx = (x - 4) >> 2; cx <= (x + 3) >> 2; cx++) if (this.get(cx, y >> 2) === T_STEEL) blocked = true;
      if (blocked) { y1 = y; break; }
    }
    if (x + 4 > BASE_X && x - 4 < BASE_X + 16) y1 = Math.min(y1, BASE_Y);
    this.beams.push({ x, y0, y1, t: 0, warn, dur: 22 });
    Sound.play('charge');
  },

  // ------------------------------------------------------------ per-frame update
  updateBosses() {
    if (!this.bosses.length) return;
    if (this.bossBanner > 0) this.bossBanner--;
    for (const b of this.bosses) { if (b.flash > 0) b.flash--; if (b.visibleT > 0) b.visibleT--; }
    for (const tr of this.tracks) tr.t--;
    this.tracks = this.tracks.filter(tr => tr.t > 0);
    for (const d of this.dust) d.t--;
    this.dust = this.dust.filter(d => d.t > 0);
    if (this.freezeE > 0 || this.over) return;
    for (const b of this.bosses.slice()) if (b.alive) BOSS_AI[b.kind].call(this, b);
    this.bosses = this.bosses.filter(b => b.alive || b.main);
    // laser beams: warning line, then a short deadly burst
    for (const bm of this.beams) {
      bm.t++;
      if (bm.t === bm.warn) Sound.play('laser');
      if (bm.t < bm.warn || bm.t >= bm.warn + bm.dur) continue;
      for (const t of this.tanks) {
        if (t.isPlayer && t.alive && overlap(t.x, t.y, 16, 16, bm.x - 4, bm.y0, 8, bm.y1 - bm.y0)) this.hitPlayer(t);
      }
      for (let y = bm.y0 >> 2; y < bm.y1 >> 2; y++) for (let cx = (bm.x - 4) >> 2; cx <= (bm.x + 3) >> 2; cx++) {
        if (this.get(cx, y) === T_BRICK) this.set(cx, y, T_EMPTY);
      }
    }
    this.beams = this.beams.filter(bm => bm.t < bm.warn + bm.dur);
  },

  // ------------------------------------------------------------ rendering
  renderBossUnder(ctx) {
    if (!this.bosses.length) return;
    ctx.fillStyle = '#707088';
    for (const tr of this.tracks) { ctx.globalAlpha = Math.min(1, tr.t / 120); ctx.fillRect(tr.x, tr.y, 2, 2); }
    ctx.fillStyle = '#A07848';
    for (const d of this.dust) { ctx.globalAlpha = Math.min(1, d.t / 30); ctx.fillRect(d.x, d.y, 2, 2); }
    ctx.globalAlpha = 1;
  },

  renderBosses(ctx) {
    for (const b of this.bosses) {
      if (!b.alive) continue;
      const kind = b.kind === 'decoy' ? 'phantom' : b.kind;
      let variant = 'n';
      if (b.flash > 0 && (b.flash & 2)) variant = 'f';
      else if ((b.mode === 'windup' || (kind === 'dread' && b.flash > 6)) && (this.frame >> 2) & 1) variant = 'r';
      const frame = kind === 'mole' ? (this.frame >> 2) & 1 : (b.animTick >> 1) & 1;
      if (kind === 'mole' && (b.mode === 'under' || b.mode === 'emerge')) {
        if (b.mode === 'emerge') {
          // swirling dust where it will surface
          ctx.fillStyle = (this.frame >> 2) & 1 ? '#C89858' : '#806040';
          for (let i = 0; i < 10; i++) {
            const a = this.frame * 0.25 + i * Math.PI / 5, r = 6 + (b.t % 20) / 2;
            ctx.fillRect(Math.round(b.x + 16 + Math.cos(a) * r), Math.round(b.y + 16 + Math.sin(a) * r), 3, 3);
          }
        }
        continue;
      }
      if (kind === 'phantom') {
        ctx.globalAlpha = b.mode === 'vanish' ? ((b.t >> 1) & 1 ? 0.6 : 0.1) : (b.visibleT > 0 || b.flash > 0 ? 1 : 0.13 + ((this.frame >> 3) & 1) * 0.05);
      }
      if (kind === 'mole' && b.mode === 'burrow') ctx.globalAlpha = Math.max(0.15, 1 - b.t / 30);
      if (kind === 'hydra') {
        ctx.drawImage(BossGfx.get('hydra', frame, 2, variant), b.x, b.y);
        b.turrets.forEach((tur, k) => ctx.drawImage(BossGfx.get('turret' + (tur.hp > 0 ? k : 3), 0, 2, tur.hp > 0 ? variant : 'n'), b.x + k * 16, b.y + 2));
        if (b.turrets.every(t => t.hp === 0)) {
          // exposed core glows
          ctx.fillStyle = (this.frame >> 2) & 1 ? '#F83800' : '#F8D800';
          ctx.fillRect(b.x + 21, b.y + 23, 6, 4);
        }
      } else {
        ctx.drawImage(BossGfx.get(kind, frame, kind === 'dread' ? 2 : b.dir, variant), b.x, b.y);
      }
      ctx.globalAlpha = 1;
      if (b.mode === 'dazed') {
        ctx.fillStyle = '#F8D800';
        for (let i = 0; i < 3; i++) {
          const a = this.frame * 0.2 + i * 2.09;
          ctx.fillRect(Math.round(b.x + b.w / 2 + Math.cos(a) * 12), Math.round(b.y - 2 + Math.sin(a) * 4), 2, 2);
        }
      }
    }
  },

  renderBeams(ctx) {
    for (const bm of this.beams) {
      if (bm.t < bm.warn) {
        if ((bm.t >> 2) & 1) { ctx.fillStyle = '#F83800'; ctx.fillRect(bm.x - 1, bm.y0, 2, bm.y1 - bm.y0); }
      } else {
        ctx.fillStyle = (bm.t >> 1) & 1 ? '#F83800' : '#F87858';
        ctx.fillRect(bm.x - 4, bm.y0, 8, bm.y1 - bm.y0);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(bm.x - 1, bm.y0, 2, bm.y1 - bm.y0);
      }
    }
  },

  renderBossBanner(ctx) {
    if (!this.bossBanner || this.bossIdx === undefined) return;
    const y = (VIEW_H >> 1) - 20;
    ctx.fillStyle = COL.black;
    ctx.fillRect(0, y - 4, VIEW_W, 32);
    if ((this.bossBanner >> 3) & 1) Font.drawCenter(ctx, 'WARNING', VIEW_W / 2, y, COL.red);
    Font.drawCenter(ctx, 'BOSS: ' + BOSSES[this.bossIdx].name, VIEW_W / 2, y + 13, COL.white);
  },

  renderBossHud(ctx, H) {
    const b = this.mainBoss();
    // HP bar
    ctx.fillStyle = COL.black;
    ctx.fillRect(H + 2, 20, 12, 90);
    const frac = b && b.alive ? Math.max(0, b.hp) / b.maxHp : 0;
    const hgt = Math.round(86 * frac);
    ctx.fillStyle = b && b.enraged && (this.frame >> 3) & 1 ? '#F87858' : '#E04030';
    ctx.fillRect(H + 4, 22 + 86 - hgt, 8, hgt);
    // escorts still to come
    ctx.drawImage(Sprites.enemyIcon, H, 112);
    Font.draw(ctx, String(Math.min(99, this.queue.length)), H + 8, 112, COL.black);
  },
});

// ------------------------------------------------------------------ boss behaviour (this = Stage)
const BOSS_AI = {
  // IRON BEAR: roams firing 3-shell volleys; flashes red, then charges in a line crushing bricks.
  // Dazed (double damage) after a charge, longer if it slammed into steel.
  bear(b) {
    b.t++;
    switch (b.mode) {
      case 'roam': {
        this.bossRoam(b, b.enraged ? 0.6 : 0.5);
        if (--b.cd <= 0) {
          for (const off of [-10, 0, 10]) { const [x, y] = this.bossMuzzle(b, b.dir, off); this.bossFire(b, x, y, b.dir); }
          b.cd = b.enraged ? 55 : 80;
        }
        if (b.t >= (b.enraged ? 240 : 360)) {
          const [cx, cy] = this.bossCenter(b), [tx, ty] = this.bossTarget(b);
          b.dir = this.dirToward(cx, cy, tx, ty);
          b.mode = 'windup'; b.t = 0;
          Sound.play('bossWarn');
        }
        break;
      }
      case 'windup':
        if (b.t >= (b.enraged ? 40 : 60)) {
          b.mode = 'charge'; b.t = 0;
          if (b.enraged) { this.summonEscort(0); this.summonEscort(0); }
        }
        break;
      case 'charge': {
        const r = this.bossMove(b, b.dir, b.enraged ? 4 : 3, true);
        if (b.t % 8 === 0) Sound.play('charge');
        if (r || b.t > 240) {
          b.mode = 'dazed'; b.t = 0; b.dazeLen = r === 'steel' ? 180 : 120;
          Sound.play('explode');
        }
        break;
      }
      case 'dazed':
        if (b.t >= b.dazeLen) { b.mode = 'roam'; b.t = 0; }
        break;
    }
  },

  // MOLE: travels underground (only a dust trail), surfaces near a player or the eagle with a dust swirl
  // warning, fires a cross of 8 shells, then burrows again. Only hittable while up or burrowing.
  mole(b) {
    b.t++;
    switch (b.mode) {
      case 'under': {
        if (!b.target) b.target = this.moleTarget(b, b.second);
        const sp = (b.enraged ? 1.6 : 1.2) * b.speedMul;
        const dx = b.target[0] - b.x, dy = b.target[1] - b.y, d = Math.hypot(dx, dy);
        if (d > sp) { b.x += dx / d * sp; b.y += dy / d * sp; }
        if (b.t % 3 === 0) this.dust.push({ x: b.x + 12 + rnd(8), y: b.y + 12 + rnd(8), t: 40 });
        if (d <= sp || b.t > 260) {
          b.x = Math.round(b.target[0] / 4) * 4; b.y = Math.round(b.target[1] / 4) * 4;
          b.mode = 'emerge'; b.t = 0;
          Sound.play('burrow');
        }
        break;
      }
      case 'emerge':
        if (b.t >= 60) {
          // bursts out of the ground: bricks and steel break, tanks underneath are hit
          for (let cy = b.y >> 2; cy < (b.y + b.h) >> 2; cy++) for (let cx = b.x >> 2; cx < (b.x + b.w) >> 2; cx++) {
            const t = this.get(cx, cy);
            if (t === T_BRICK || t === T_STEEL) this.set(cx, cy, T_EMPTY);
          }
          for (const t of this.tanks) {
            if (!t.alive || !overlap(t.x, t.y, 16, 16, b.x, b.y, b.w, b.h)) continue;
            if (t.isPlayer) this.hitPlayer(t); else this.killEnemy(t, null, false);
          }
          this.addFx(b.x + 16, b.y + 16, Sprites.bigExp, 4);
          Sound.play('explode');
          b.mode = 'up'; b.t = 0;
          this.moleVolley(b);
        }
        break;
      case 'up':
        if (b.enraged && b.t === 90) this.moleVolley(b);
        if (b.t >= 180) { b.mode = 'burrow'; b.t = 0; }
        break;
      case 'burrow':
        if (b.t >= 30) {
          if (b.enraged) this.mines.push({ x: b.x + 16, y: b.y + 16, byPlayer: false, owner: b, t: 0 });
          b.second = b.enraged && !b.second; // enraged: pops up twice in a row
          b.mode = 'under'; b.t = 0; b.target = null;
          Sound.play('burrow');
        }
        break;
    }
  },

  // HYDRA: drifts on its island. Left turret fires gatling bursts, right turret rockets, centre turret a
  // laser beam down the screen. Turrets are destroyed one by one; then the core is exposed.
  hydra(b) {
    b.t++;
    // slow drift left and right around its starting spot
    if (b.t % 4 === 0) {
      const r = this.bossStep(b, b.drift > 0 ? 1 : 3, false);
      if (r || Math.abs(b.x - b.home) >= 16) b.drift = -b.drift;
    }
    const [tx, ty] = this.bossTarget(b);
    const fast = b.enraged ? 0.5 : 1;
    b.turrets.forEach((tur, k) => {
      if (tur.hp <= 0) return;
      const cx = b.x + k * 16 + 8, cy = b.y + 14;
      tur.cd--;
      if (k === 0) {
        if (tur.cd <= 0) { tur.burst = 4; tur.cd = Math.round(120 * fast); }
        if (tur.burst > 0 && b.t % 8 === 0) {
          tur.burst--;
          const d = this.dirToward(cx, cy, tx, ty);
          this.bossFire(b, cx + DXY[d][0] * 10, cy + DXY[d][1] * 22, d, { speed: 3 });
        }
      } else if (k === 2) {
        if (tur.cd <= 0) {
          const d = this.dirToward(cx, cy, tx, ty);
          this.bossFire(b, cx + DXY[d][0] * 10, cy + DXY[d][1] * 22, d, { speed: 2, rocket: true });
          tur.cd = Math.round(140 * fast);
        }
      } else if (tur.cd <= 0) {
        this.addBeam(cx, b.y + b.h);
        tur.cd = Math.round(240 * fast);
      }
    });
    if (b.turrets.every(t => t.hp === 0) && --b.cd <= 0) {
      const [cx, cy] = this.bossCenter(b);
      for (const d of [1, 2, 3]) this.bossFire(b, cx + DXY[d][0] * 26, cy + DXY[d][1] * 18, d);
      b.cd = b.enraged ? 50 : 80;
    }
  },

  // PHANTOM: nearly invisible; shows itself only when it fires. Teleports every few seconds and leaves
  // decoys behind. On ice it leaves tracks; decoys don't.
  phantom(b) {
    b.t++;
    if (b.mode === 'vanish') {
      if (b.t >= 24) this.phantomTeleport(b);
      return;
    }
    this.bossRoam(b, b.enraged ? 1.1 : 0.9, 0.5);
    this.phantomTracks(b);
    if (--b.cd <= 0) {
      const [x, y] = this.bossMuzzle(b, b.dir);
      this.bossFire(b, x, y, b.dir, { speed: 3 });
      b.visibleT = 30;
      b.cd = b.enraged ? 45 : 60;
    }
    if (++b.tele >= (b.enraged ? 220 : 300)) {
      b.mode = 'vanish'; b.t = 0; b.tele = 0;
      for (const o of this.bosses) if (o.kind === 'decoy' && o.alive) { o.alive = false; this.addFx(o.x + 16, o.y + 16, Sprites.smallExp, 3); }
      Sound.play('teleport');
    }
  },

  decoy(b) {
    b.t++;
    this.bossRoam(b, 0.9, 0.5);
    const main = this.mainBoss();
    if (main && main.enraged && --b.cd <= 0) {
      const [x, y] = this.bossMuzzle(b, b.dir);
      this.bossFire(b, x, y, b.dir, { speed: 3 });
      b.visibleT = 30;
      b.cd = 70 + rnd(30);
    }
  },

  // DREADNOUGHT: phase 1 cannons + hatch releasing armor tanks; phase 2 mine lines and spread volleys;
  // phase 3 crawls toward the eagle crushing bricks and sweeps laser beams down the screen.
  dread(b) {
    b.t++;
    const frac = b.hp / b.maxHp, phase = frac > 2 / 3 ? 1 : frac > 1 / 3 ? 2 : 3;
    if (phase !== b.phase) { b.phase = phase; b.flash = 20; Sound.play('bossWarn'); }
    const [tx, ty] = this.bossTarget(b);
    if (--b.cd <= 0) {
      b.cannon ^= 1;
      const cx = b.x + (b.cannon ? 36 : 12), cy = b.y + b.h - 4;
      const d = Math.abs(ty - cy) < 12 ? (tx > cx ? 1 : 3) : 2;
      this.bossFire(b, cx + DXY[d][0] * 16, cy + DXY[d][1] * 4, d, { speed: 3, power: true });
      b.cd = phase === 1 ? 45 : phase === 2 ? 70 : 60;
    }
    if (phase <= 2 && ++b.hatchT >= (phase === 1 ? 600 : 900)) {
      b.hatchT = 0;
      this.summonEscort(3);
      Sound.play('burrow');
    }
    if (phase === 2) {
      if (++b.mineT >= 420) {
        b.mineT = 0;
        // across the most open row in the middle third of the field
        const open = (x, y) => [T_EMPTY, T_ICE, T_FOREST].includes(this.get(x >> 2, y >> 2));
        let best = null, bestN = -1;
        for (let y = Math.round(FH * 0.35 / 16) * 16 + 8; y <= FH * 0.65; y += 16) {
          let n = 0;
          for (let x = 24; x < FW - 8; x += 32) if (open(x, y)) n++;
          if (n > bestN || (n === bestN && Math.random() < 0.5)) { bestN = n; best = y; }
        }
        for (let x = 24; x < FW - 8; x += 32) if (open(x, best)) this.mines.push({ x, y: best, byPlayer: false, owner: b, t: -20 });
        Sound.play('build');
      }
      if (++b.volT >= 90) {
        b.volT = 0;
        const [cx, cy] = this.bossCenter(b);
        for (const d of [1, 2, 3]) this.bossFire(b, cx + DXY[d][0] * 26, cy + DXY[d][1] * 26, d, { speed: 2.5 });
      }
    }
    if (phase === 3) {
      if (b.y + b.h < BASE_Y - 32) this.bossMove(b, 2, 0.25, true);
      if (++b.laserT >= 240) { b.laserT = 0; this.addBeam(Math.round(tx), b.y + b.h); b.laser2 = 45; }
      if (b.laser2 > 0 && --b.laser2 === 0) { const [tx2] = this.bossTarget(b); this.addBeam(Math.round(tx2), b.y + b.h); }
    }
  },
};

Object.assign(Stage.prototype, {
  moleTarget(b, near) {
    let [tx, ty] = near ? [b.x + 16 + rnd(97) - 48, b.y + 16 + rnd(97) - 48]
      : (Math.random() < 0.6 ? this.bossTarget(b) : [BASE_X + 8, BASE_Y - 40]);
    for (let tries = 0; tries < 12; tries++) {
      let x = Math.max(0, Math.min(FW - 32, Math.round((tx - 16) / 8) * 8));
      let y = Math.max(0, Math.min(FH - 32, Math.round((ty - 16) / 8) * 8));
      // never surface on the eagle (stay above its fortress) or in water
      while (y > 0 && overlap(x, y, 32, 32, BASE_X - 16, BASE_Y - 16, 48, 32)) y -= 8;
      let water = false;
      for (let cy = y >> 2; cy < (y + 32) >> 2; cy++) for (let cx = x >> 2; cx < (x + 32) >> 2; cx++) if (this.get(cx, cy) === T_WATER) water = true;
      if (!water) return [x, y];
      tx += rnd(65) - 32; ty -= 16;
    }
    return [b.x, b.y];
  },

  moleVolley(b) {
    const [cx, cy] = this.bossCenter(b);
    for (const d of [0, 1, 2, 3]) {
      for (const off of [-8, 8]) {
        const [x, y] = [cx + DXY[d][0] * 18 + (DXY[d][1] ? off : 0), cy + DXY[d][1] * 18 + (DXY[d][0] ? off : 0)];
        this.bossFire(b, x, y, d, { speed: 2.5 });
      }
    }
  },

  phantomTracks(b) {
    const [cx, cy] = this.bossCenter(b);
    if (b.animTick % 4 === 0 && this.get(cx >> 2, cy >> 2) === T_ICE && b.lastTrack !== b.animTick) {
      b.lastTrack = b.animTick;
      const side = (b.dir & 1) ? [[0, -9], [0, 8]] : [[-9, 0], [8, 0]];
      for (const [dx, dy] of side) this.tracks.push({ x: cx + dx, y: cy + dy, t: 240 });
    }
  },

  // a random free spot in the upper part of the field
  freeSpot(w, h) {
    for (let tries = 0; tries < 40; tries++) {
      const x = rnd((FW - w) / 8 + 1) * 8, y = rnd(Math.max(1, Math.floor((FH * 0.6 - h) / 8))) * 8;
      let ok = true;
      for (let cy = y >> 2; cy < (y + h) >> 2 && ok; cy++) for (let cx = x >> 2; cx < (x + w) >> 2; cx++) {
        const t = this.get(cx, cy);
        if (t === T_BRICK || t === T_STEEL || t === T_WATER) { ok = false; break; }
      }
      if (ok && this.tanks.some(t => overlap(x, y, w, h, t.x - 8, t.y - 8, 32, 32))) ok = false;
      if (ok && this.bosses.some(o => o.alive && overlap(x, y, w, h, o.x, o.y, o.w, o.h))) ok = false;
      if (ok) return [x, y];
    }
    return null;
  },

  phantomTeleport(b) {
    const spot = this.freeSpot(b.w, b.h);
    if (spot) [b.x, b.y] = spot;
    b.mode = 'roam'; b.t = 0; b.cd = 40;
    const n = b.enraged ? 3 : 2;
    for (let i = 0; i < n; i++) {
      const s = this.freeSpot(32, 32);
      if (s) this.bosses.push(new Boss({ kind: 'decoy', main: false, x: s[0], y: s[1], w: 32, h: 32, hp: 1, maxHp: 1, dir: rnd(4), cd: 60 + rnd(40), mode: 'roam' }));
    }
    Sound.play('teleport');
  },
});
