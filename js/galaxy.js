'use strict';
// =====================================================================
//  GALAXY: a space shoot-'em-up. Your tanks fly at the bottom of a starfield and shoot up at alien waves.
//  Twelve sectors (then round again, tougher, the waves shuffled), six waves each and a boss; sectors 7-12, their
//  bosses and the newer waves are in galaxy2.js. Sectors 1-6:
//    waves   FORMATION (they fly in to a grid and dive at you), SWARM (streams weaving across), ROCKS (an asteroid
//            shower; big rocks split), KAMIKAZE (drones dropping straight at you), BOMBERS (crossing the top, laying
//            bombs), ESCORT (drones circling armoured ships)
//    weapons BLASTER, SPREAD, LASER (hold fire), PLASMA (big piercing orbs), LIGHTNING (jumps from enemy to enemy),
//            MISSILES (homing); each with 8 power levels. A gift box gives its weapon (the same one: +1 power), a power
//            cell +1 power; losing a tank costs 2 levels. B: a bomb, damage to everything on screen
//    pickups coins and gems (points, which are also your money), shields, bombs, extra lives
//    hangar  between sectors (the shop): firepower, rapid fire, engine, shield, magnet, wingman drones, armour,
//            bombs, lives, weapons and power
//    bosses  MOTHERSHIP, WAR CRAB, ROCK TITAN, FROST QUEEN, ELDER EYE (hit it only while it's open), OVERMIND
//            (shielded by orbiting orbs), each with three phases of attacks
//  Co-op for 1-4 players, here or online.
// =====================================================================

const GX_WAVES = 6;
const GX_SECTORS = [
  { name: 'MOON ORBIT', sky: '#000010', dust: '#28284C', planet: ['#BCBCBC', '#7C7C7C', '#4C4C4C'] },
  { name: 'RED PLANET', sky: '#100004', dust: '#4C1810', planet: ['#F87858', '#C83C14', '#7C1C00'] },
  { name: 'ASTEROID BELT', sky: '#08080C', dust: '#3C3428', planet: ['#C8A878', '#8C6C3C', '#4C3818'] },
  { name: 'ICE GIANT', sky: '#000818', dust: '#183C5C', planet: ['#B8F8F8', '#58B8E8', '#2C5C9C'] },
  { name: 'NEBULA', sky: '#0C0018', dust: '#4C1C6C', planet: ['#F8B8F8', '#C060E0', '#602880'] },
  { name: 'THE CORE', sky: '#100000', dust: '#5C2C00', planet: ['#F8F878', '#F8A030', '#C83800'] },
];
const GX_PLAN = [
  ['formation', 'swarm', 'formation', 'rocks', 'swarm', 'formation'],
  ['formation', 'kamikaze', 'swarm', 'formation', 'bombers', 'formation'],
  ['rocks', 'formation', 'swarm', 'rocks', 'kamikaze', 'formation'],
  ['formation', 'bombers', 'swarm', 'formation', 'kamikaze', 'escort'],
  ['swarm', 'formation', 'escort', 'rocks', 'bombers', 'formation'],
  ['escort', 'swarm', 'formation', 'kamikaze', 'bombers', 'escort'],
];
// enemy kinds: size, hit points, points, which sector they first appear in
const GX_TYPES = {
  drone: { w: 12, h: 10, hp: 1, pts: 50, from: 0 },
  bug: { w: 12, h: 12, hp: 2, pts: 80, from: 0 },
  wasp: { w: 12, h: 12, hp: 1, pts: 100, from: 1 },
  brute: { w: 16, h: 14, hp: 6, pts: 300, from: 2 },
  splitter: { w: 14, h: 12, hp: 3, pts: 150, from: 2 },
  egger: { w: 14, h: 14, hp: 4, pts: 200, from: 3 },
  mine: { w: 10, h: 10, hp: 2, pts: 120, from: 3 },
  tanker: { w: 18, h: 16, hp: 12, pts: 600, from: 4 },
  rock: { w: 16, h: 16, hp: 6, pts: 100, from: 0 },
  rockM: { w: 10, h: 10, hp: 3, pts: 60, from: 0 },
  rockS: { w: 6, h: 6, hp: 1, pts: 30, from: 0 },
};
// hooks for the later sectors' enemies, waves and bosses (galaxy2.js): by state / type / kind
const GX_MOVES = {}, GX_FIRE = {}, GX_COLLIDE = {}, GX_ON_KILL = {}, GX_RENDER = {}, GX_WAVE_KINDS = {}, GX_WAVE_NAMES = {}, GX_BOSS_ACTS = {};
const GX_FRAME = [], GX_PICKUPS = {}, GX_BULLET_DRAW = {};
// how hard a sector is: steep through the first six, gentler after
const gxDiff = sec => Math.min(sec, 5) + Math.max(0, sec - 5) * 0.6;
// weapons: power 1-8
const GX_WEAPONS = {
  blaster: { name: 'BLASTER', letter: 'B', color: '#F87830', snd: 'gxBlaster' },
  spread: { name: 'SPREAD', letter: 'S', color: '#58D854', snd: 'gxSpread' },
  laser: { name: 'LASER', letter: 'L', color: '#3CBCFC', snd: 'gxLaser' },
  plasma: { name: 'PLASMA', letter: 'P', color: '#C060E0', snd: 'gxPlasma' },
  lightning: { name: 'LIGHTNING', letter: 'Z', color: '#F8F878', snd: 'gxLightning' },
  missiles: { name: 'MISSILES', letter: 'M', color: '#F83800', snd: 'gxBlaster' },
};
const GX_WEAPON_KEYS = Object.keys(GX_WEAPONS), GX_POWER_MAX = 8;
// the hangar's upgrades (per player): level prices, what each level does
const GX_UPS = {
  fire: { name: 'FIREPOWER', prices: [3000, 5000, 8000, 12000, 16000], desc: '+15% DAMAGE A LEVEL' },
  rapid: { name: 'RAPID FIRE', prices: [3000, 5000, 8000, 12000, 16000], desc: 'FIRES 10% FASTER A LEVEL' },
  engine: { name: 'ENGINE', prices: [2000, 4000, 6000], desc: 'FLY FASTER' },
  shield: { name: 'SHIELD', prices: [2500, 5000, 8000], desc: 'A SHIELD AT EVERY START, LONGER' },
  magnet: { name: 'MAGNET', prices: [2000, 4000, 6000], desc: 'PULLS IN PICKUPS FROM FURTHER' },
  drones: { name: 'WINGMAN DRONES', prices: [8000, 15000], desc: 'LITTLE GUNS AT YOUR SIDES' },
  armor: { name: 'ARMOR', prices: [6000, 12000], desc: 'PLATES THAT SOAK A HIT EACH' },
};

const gxPlayer = p => {
  if (!p.gx) p.gx = { weapon: 'blaster', power: 1, bombs: 1, up: {} };
  return p.gx;
};
const gxUp = (p, k) => (gxPlayer(p).up[k] || 0);

// ------------------------------------------------------------------ sprites (drawn facing down at you)
const GX_PALS = {
  drone: [null, '#B8F8B8', '#58D854', '#1C7C1C', '#F8F8F8', '#F83800', '#3CBCFC', '#081808'],
  bug: [null, '#F8B8F8', '#C060E0', '#602880', '#F8F8F8', '#F8D800', '#58F8F8', '#180818'],
  wasp: [null, '#F8F878', '#F8B800', '#7C5800', '#F8F8F8', '#202020', '#A8E8F8', '#140C00'],
  brute: [null, '#F8B8A8', '#C83C14', '#601000', '#E0E0E0', '#F8F878', '#7C7C7C', '#180400'],
  splitter: [null, '#B8F8F8', '#3CBCB8', '#0C5C5C', '#F8F8F8', '#F83800', '#58D854', '#041818'],
  egger: [null, '#F8E8B8', '#E0A848', '#7C4C14', '#F8F8F8', '#F83800', '#C83C14', '#180C00'],
  mine: [null, '#E0E0E0', '#8C8C9C', '#3C3C4C', '#F8F8F8', '#F83800', '#F8D800', '#0C0C10'],
  tanker: [null, '#C8C8F8', '#6060C8', '#28286C', '#F8F8F8', '#F8D800', '#58F8F8', '#08081C'],
  rock: [null, '#C8A878', '#8C6C3C', '#4C3818', '#E8D8B8', '#5C4428', '#A08058', '#140C04'],
};
const GX_DRAW = {
  drone(f) {
    const P = bossPainter(12, 10);
    P.ellipse(6, 6, 6, 3.5); P.disc(6, 4, 2.6, 6); P.px(5, 3, 4);
    for (const x of [2, 6, 10]) P.px(x, 7, (x + f * 4) % 8 < 4 ? 5 : 4);
    P.outline(); return P.g;
  },
  bug(f) {
    const P = bossPainter(12, 12);
    const wing = f ? 1 : 0;
    P.ellipse(2.5, 4 - wing, 2.5, 3.5); P.ellipse(9.5, 4 - wing, 2.5, 3.5);   // wings
    for (let y = 0; y < 12; y++) for (let x = 0; x < 12; x++) if (P.g[y][x]) P.g[y][x] = 6;
    P.ellipse(6, 5, 3, 4); P.disc(6, 9.5, 2.2, 2);
    P.px(5, 9, 5); P.px(7, 9, 5); P.line(4, 1, 3, 0, 3); P.line(8, 1, 9, 0, 3);
    P.outline(); return P.g;
  },
  wasp(f) {
    const P = bossPainter(12, 12);
    P.ellipse(2.5 + f, 3, 2.5, 2); P.ellipse(9.5 - f, 3, 2.5, 2);
    for (let y = 0; y < 12; y++) for (let x = 0; x < 12; x++) if (P.g[y][x]) P.g[y][x] = 6;
    P.ellipse(6, 6, 2.5, 5.5);
    for (const y of [3, 5, 7]) P.rect(4, y, 8, y, 5);
    P.px(6, 11, 4); P.px(5, 1, 5); P.px(7, 1, 5);
    P.outline(); return P.g;
  },
  brute(f) {
    const P = bossPainter(16, 14);
    P.ellipse(8, 6, 6.5, 5); P.rect(1, 6, 3, 13, 6); P.rect(12, 6, 14, 13, 6); P.rect(1, 12, 3, 13, 4); P.rect(12, 12, 14, 13, 4);   // cannon arms
    P.rect(5, 4, 10, 5, 3); P.px(6, 4, f ? 5 : 4); P.px(9, 4, f ? 5 : 4);
    P.rect(6, 9, 9, 9, 3);
    P.outline(); return P.g;
  },
  splitter(f) {
    const P = bossPainter(14, 12);
    P.ellipse(4.5, 6, 4.5, 4.5); P.ellipse(9.5, 6, 4.5, 4.5);
    P.disc(4.5, 6, 1.5, f ? 5 : 6); P.disc(9.5, 6, 1.5, f ? 6 : 5);
    P.line(7, 2, 7, 10, 3);
    P.outline(); return P.g;
  },
  egger(f) {
    const P = bossPainter(14, 14);
    P.ellipse(7, 6, 6, 5.5); P.ellipse(7, 10, 4, 3);
    P.px(5, 5, 7); P.px(9, 5, 7); P.px(5, 4, 4); P.px(9, 4, 4);
    P.rect(6, 8, 8, 9, 5); P.px(3 - f, 12, 6); P.px(11 + f, 12, 6);
    P.outline(); return P.g;
  },
  mine(f) {
    const P = bossPainter(10, 10);
    P.circle(5, 5, 3.5);
    for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4 + f * 0.4; P.px(5 + Math.round(Math.cos(a) * 4.5), 5 + Math.round(Math.sin(a) * 4.5), 2); }
    P.px(5, 5, f ? 5 : 6);
    P.outline(); return P.g;
  },
  tanker(f) {
    const P = bossPainter(18, 16);
    for (let y = 1; y < 15; y++) { const hw = 8 - Math.abs(y - 8) * 0.4; P.rect(Math.round(9 - hw), y, Math.round(8 + hw), y, y < 4 ? 1 : y > 12 ? 3 : 2); }
    P.rect(5, 6, 12, 9, 3); P.rect(6, 7, 11, 8, f ? 6 : 5);
    P.rect(2, 12, 3, 15, 4); P.rect(14, 12, 15, 15, 4);
    P.outline(); return P.g;
  },
};
const GxGfx = {
  cache: new Map(),
  get(type, f = 0, variant = 'n') {
    const k = type + f + variant;
    let c = this.cache.get(k);
    if (!c) {
      const pal = variant === 'f' ? BOSS_PALS.f : GX_PALS[type];
      c = gridCanvas(GX_DRAW[type](f), pal);
      this.cache.set(k, c);
    }
    return c;
  },
};

// ------------------------------------------------------------------ set-up
Object.assign(Stage.prototype, {
  setupGalaxy(level) {
    // an empty field: no walls, no eagle
    this.terrain.fill(T_EMPTY); this.dirty = true;
    this.noBase = true; this.queue = []; this.total = 0; this.weather = null; this.pads = [];
    const sec = (level - 1) % GX_SECTORS.length, loop = Math.floor((level - 1) / GX_SECTORS.length), d = gxDiff(sec);
    this.galaxy = {
      level, sec, loop, wave: 0, phase: 'intro', t: 0, list: [], shots: [], bullets: [], pickups: [], beams: [], zaps: [], boss: null,
      spawnQ: [], banner: { text: 'SECTOR ' + level + ': ' + GX_SECTORS[sec].name, t: 150 }, flash: 0, swayT: 0, diveT: 200,
      hpMul: (1 + 0.18 * d) * Math.pow(1.6, loop), fireMul: (1 + 0.12 * d + 0.4 * loop) * Config.skill().fire, shotSpd: (1 + 0.05 * d + 0.15 * loop) * Config.skill().shell,
      cleared: false, clearT: 0, d, plan: gxPlan(sec, loop, level),
    };
    for (const p of this.players) gxPlayer(p);
  },

  // the next wave (or the boss)
  gxNextWave() {
    const g = this.galaxy;
    g.wave++;
    g.phase = 'wave'; g.t = 0; g.spawnQ = []; g.diveT = 160;
    if (g.wave > GX_WAVES) { this.gxBossStart(); return; }
    const kind = (g.plan || GX_PLAN[g.sec])[g.wave - 1];
    g.kind = kind;
    g.banner = { text: 'WAVE ' + g.wave + '/' + GX_WAVES + ': ' + (GX_WAVE_NAMES[kind] || kind.toUpperCase()), t: 110 };
    const types = Object.keys(GX_TYPES).filter(k => !k.startsWith('rock') && !GX_TYPES[k].special && GX_TYPES[k].from <= g.sec + g.loop * GX_SECTORS.length);
    const more = Math.min(1.6, 1 + 0.08 * (g.d ?? g.sec) + 0.2 * g.loop) * (1 + 0.25 * (this.players.length - 1));
    const add = (type, o) => g.spawnQ.push(Object.assign({ type }, o));
    if (kind === 'formation') {
      const cols = Math.max(4, Math.min(8, Math.floor((FW - 24) / 22))), rows = Math.min(5, 3 + Math.floor((g.sec + g.loop) / 2));
      const sx = Math.min(22, (FW - 32) / (cols - 1)), x0 = (FW - sx * (cols - 1)) / 2;
      for (let r = 0; r < rows; r++) {
        const type = r === 0 && types.includes('brute') ? (types.includes('tanker') && g.loop + g.sec >= 5 ? 'tanker' : 'brute')
          : r === 1 && types.includes('egger') ? 'egger' : r <= 1 ? (types.includes('bug') ? 'bug' : 'drone') : r === 2 && types.includes('splitter') ? 'splitter' : 'drone';
        for (let c = 0; c < cols; c++) {
          const n = r * cols + c, side = c < cols / 2 ? -1 : 1;
          add(type, { st: 'enter', slot: [x0 + c * sx, 22 + r * 16], from: side, delay: Math.floor(n / 4) * 30 + (n % 4) * 7 });
        }
      }
    } else if (kind === 'swarm') {
      const n = Math.round(14 * more), type = types.includes('wasp') ? 'wasp' : 'drone';
      for (let k = 0; k < n; k++) add(k % 5 === 4 && types.includes('bug') ? 'bug' : type, { st: 'stream', dirX: k % 2 ? -1 : 1, lane: (k >> 1) % 3, delay: Math.floor(k / 2) * 18 });
    } else if (kind === 'rocks') {
      const n = Math.round(10 * more);
      for (let k = 0; k < n; k++) add('rock', { st: 'fall', delay: k * 30 });
      for (let k = 0; k < 4; k++) add('drone', { st: 'enter', slot: [FW / 2 - 36 + k * 24, 26], from: k < 2 ? -1 : 1, delay: 60 + k * 10 });
    } else if (kind === 'kamikaze') {
      const n = Math.round(15 * more);
      for (let k = 0; k < n; k++) add(k % 4 === 3 && types.includes('mine') ? 'mine' : 'drone', { st: 'kami', delay: Math.floor(k / 3) * 70 + (k % 3) * 8, lane: k % 3 });
    } else if (kind === 'bombers') {
      const n = Math.round(5 * more), type = types.includes('egger') ? 'egger' : 'bug';
      for (let k = 0; k < n; k++) add(type, { st: 'cross', dirX: k % 2 ? -1 : 1, row: k % 3, delay: k * 45 });
      for (let k = 0; k < 6; k++) add('drone', { st: 'enter', slot: [FW / 2 - 50 + k * 20, 70], from: k < 3 ? -1 : 1, delay: 40 + k * 8 });
    } else if (kind === 'escort') {
      const big = types.includes('tanker') ? 'tanker' : 'brute', m = FW > 230 ? 3 : 2;
      for (let k = 0; k < m; k++) {
        const id = 'esc' + k + '_' + g.wave;
        add(big, { st: 'enter', slot: [FW * (k + 1) / (m + 1), 40], from: k % 2 ? 1 : -1, delay: k * 20, id });
        for (let j = 0; j < 6; j++) add(types.includes('wasp') ? 'wasp' : 'drone', { st: 'orbit', parent: id, ang: j * Math.PI / 3, delay: 50 + k * 20 + j * 6 });
      }
    } else if (GX_WAVE_KINDS[kind]) GX_WAVE_KINDS[kind].call(this, g, add, types, more);
  },

  // an enemy comes on: where it starts, its hit points
  gxSpawn(o) {
    const g = this.galaxy, swap = GX_SECTORS[g.sec].swap;
    if (swap && swap[o.type]) o = Object.assign({}, o, { type: swap[o.type] });   // a later sector's own kind in its place
    const T = GX_TYPES[o.type];
    const e = Object.assign({ x: 0, y: -12, w: T.w, h: T.h, hp: T.hp * g.hpMul, max: T.hp * g.hpMul, t: 0, flash: 0, fireT: 60 + rnd(120) }, o);
    if (e.st === 'enter') { e.x0 = e.from < 0 ? -10 : FW + 10; e.y0 = 40 + rnd(30); e.cx = FW / 2 + e.from * -20; e.cy = -30; e.x = e.x0; e.y = e.y0; }
    if (e.st === 'stream') { e.x = e.dirX > 0 ? -12 : FW + 12; e.base = 30 + e.lane * 26; e.y = e.base; }
    if (e.st === 'fall') { e.x = 10 + rnd(FW - 20); e.y = -10; e.vx = (Math.random() - 0.5) * 0.8; e.vy = 0.5 + Math.random() * 0.6 * Math.min(2, g.shotSpd); }
    if (e.st === 'kami') {
      const pl = this.gxPlayers();
      const tx = pl.length ? pl[rnd(pl.length)].x + 8 : FW / 2;
      e.x = Math.max(8, Math.min(FW - 8, tx + (e.lane - 1) * 18)); e.y = -10; e.vy = 0.6;
    }
    if (e.st === 'cross') { e.x = e.dirX > 0 ? -12 : FW + 12; e.y = 18 + e.row * 14; }
    if (e.st === 'orbit') { e.x = FW / 2; e.y = -20; }
    if (GX_MOVES[e.st] && GX_MOVES[e.st].init) GX_MOVES[e.st].init.call(this, e, g);
    g.list.push(e);
    return e;
  },

  gxPlayers() { return this.tanks.filter(t => t.isPlayer && t.alive && !t.ally); },
});

// ------------------------------------------------------------------ every frame
Object.assign(Stage.prototype, {
  updateGalaxy() {
    const g = this.galaxy;
    if (this.freezeE > 0) this.freezeE--;
    this.updateSpawns();   // players coming (back) on
    g.beams = [];
    if (g.flash > 0) g.flash--;
    if (g.banner && --g.banner.t <= 0) g.banner = null;
    for (const t of this.tanks) if (t.alive && t.isPlayer) this.gxUpdatePlayer(t);
    if (!this.over) {
      g.t++;
      if (g.phase === 'intro' && g.t > 120) this.gxNextWave();
      else if (g.phase === 'wave') {
        for (const o of g.spawnQ.filter(q => q.delay <= g.t)) this.gxSpawn(o);
        g.spawnQ = g.spawnQ.filter(q => q.delay > g.t);
        if (!g.spawnQ.length && !g.list.length) {
          g.phase = 'between'; g.t = 0;
          // a gift between waves now and then
          if (g.wave === 2 || g.wave === 4) this.gxDrop(FW / 2 - 30 + rnd(60), -8, 'box');
        }
      } else if (g.phase === 'between' && g.t > 80) this.gxNextWave();
      else if (g.phase === 'boss') this.gxUpdateBoss();
      // the sector ends once the boss's loot is all picked up (it flies to you), or after 15 s at most
      else if (g.phase === 'clear' && g.t > 200 && (!g.pickups.length || g.t > 900)) this.result = 'clear';
      for (const h of GX_FRAME) h.call(this, g);
      this.gxUpdateEnemies();
    }
    this.gxUpdateShots();
    this.gxUpdateBullets();
    this.gxUpdatePickups();
    for (const z of g.zaps) z.t--;
    g.zaps = g.zaps.filter(z => z.t > 0);
    this.tanks = this.tanks.filter(t => t.alive);
    for (const f of this.fx) f.tick++;
    this.fx = this.fx.filter(f => f.tick < f.frames.length * f.per);
    for (const p of this.popups) p.t++;
    this.popups = this.popups.filter(p => p.t < p.delay + (p.life || 48));
    Sound.setEngine(0);
    if (this.over) { this.overTimer++; if (this.overTimer >= 320) this.result = 'gameover'; }
    if (!this.over || this.reviveWait > 0) this.updateRevival();
  },

  // ------------------------------------------------------------ your ship (your tank, in space)
  gxUpdatePlayer(t) {
    const p = t.player, gp = gxPlayer(p);
    if (!t.gxInit) {
      t.gxInit = true;
      t.plates = Math.max(t.plates || 0, gxUp(p, 'armor'));
      if (gxUp(p, 'shield')) t.shield = Math.max(t.shield, 120 + 120 * gxUp(p, 'shield'));
    }
    if (t.shield > 0) t.shield--;
    if (t.glow > 0) t.glow--;
    t.dir = 0;
    if (t.frozen > 0) t.frozen--;
    if (this.over) { t.moving = false; return; }
    const inp = Input.player(p.i);
    if (inp.dir >= 0 && !(t.frozen > 0)) {
      t.acc = (t.acc || 0) + 1.4 + 0.3 * gxUp(p, 'engine');
      while (t.acc >= 1) {
        t.acc -= 1;
        t.x = Math.max(0, Math.min(FW - 16, t.x + DXY[inp.dir][0]));
        t.y = Math.max(Math.round(FH * 0.35), Math.min(FH - 16, t.y + DXY[inp.dir][1]));
      }
      t.animTick++; t.anim = (t.animTick >> 1) & 1; t.moving = true;
    } else t.moving = false;
    if (t.gcool > 0) t.gcool--;
    if (inp.fire || inp.firePressed) this.gxFire(t, p, gp);
    this.gxButtonB(t, p, gp, inp);   // B: tap swaps, hold focuses, double-tap bombs (galaxy_feel.js)
    // wingman drones: little guns either side
    const nd = gxUp(p, 'drones');
    if (nd && (this.frame + p.i * 4) % 14 === 0 && (inp.fire || this.galaxy.list.length)) {
      for (const s of nd >= 2 ? [-1, 1] : [p.i % 2 ? 1 : -1]) this.galaxy.shots.push({ x: t.x + 8 + s * 15, y: t.y + 2, vx: 0, vy: -5, dmg: 0.8 * this.gxDmg(p), k: 'd', o: p.i, life: 80 });
      if (p.i === 0 || this.players.length < 2) Sound.play('gxDrone');
    }
  },

  gxDmg(p) { return 1 + 0.15 * gxUp(p, 'fire'); },

  // fire the weapon in hand
  gxFire(t, p, gp) {
    const g = this.galaxy, pw = gp.power, dm = this.gxDmg(p), cx = t.x + 8, top = t.y;
    const rate = 1 - 0.1 * gxUp(p, 'rapid');
    if (gp.weapon === 'laser') {
      // a beam straight up, through everything in line, while fire is held
      const w = 3 + pw;
      g.beams.push({ x: cx, w, y: top, o: p.i });
      const dmg = (0.06 + 0.025 * pw) * dm;
      for (const e of g.list) if (Math.abs(e.x - cx) < w / 2 + (e.w || GX_TYPES[e.type].w) / 2 && e.y < top && e.y > -8) this.gxHit(e, dmg, p, true);
      if (g.boss) this.gxBossHitRect(cx - w / 2, 0, w, top, dmg, p);
      if (this.frame % 8 === 0) Sound.play('gxLaser');
      return;
    }
    if (t.gcool > 0) return;
    const shot = (dx, ang, o = {}) => g.shots.push(Object.assign({ x: cx + dx, y: top, vx: Math.sin(ang) * 5, vy: -Math.cos(ang) * 5, dmg: dm, k: 'b', o: p.i, life: 70 }, o));
    let cd = 9;
    if (gp.weapon === 'blaster') {
      const n = [1, 2, 2, 3, 3, 4, 4, 5][pw - 1], d = [1, 1, 1.25, 1.25, 1.45, 1.45, 1.65, 1.9][pw - 1];
      for (let k = 0; k < n; k++) { const off = (k - (n - 1) / 2) * 5; shot(off, pw >= 5 && Math.abs(off) > 7 ? Math.sign(off) * 0.08 : 0, { dmg: d * dm }); }
      cd = 9;
    } else if (gp.weapon === 'spread') {
      const n = [3, 3, 5, 5, 7, 7, 9, 9][pw - 1], step = pw % 2 ? 0.16 : 0.12;
      for (let k = 0; k < n; k++) shot(0, (k - (n - 1) / 2) * step, { k: 's', dmg: (0.85 + 0.05 * pw) * dm });
      cd = 13;
    } else if (gp.weapon === 'plasma') {
      shot(0, 0, { k: 'p', vy: -2.6, vx: 0, dmg: (2.5 + 0.6 * pw) * dm, r: 3 + (pw >> 1), pierce: 1 + (pw >> 1), hit: [] });
      if (pw >= 6) { shot(-8, -0.15, { k: 'p', vy: -2.5, dmg: 2 * dm, r: 3, pierce: 1, hit: [] }); shot(8, 0.15, { k: 'p', vy: -2.5, dmg: 2 * dm, r: 3, pierce: 1, hit: [] }); }
      cd = 28 - pw;
    } else if (gp.weapon === 'lightning') {
      // jumps from the nearest enemy above you to the next, and the next...
      const n = 1 + (pw >> 1), pts = [[cx, top]], hit = [];
      let fx = cx, fy = top;
      for (let k = 0; k < n; k++) {
        let best = null, bd = k ? 70 : 140;
        for (const e of g.list) { if (hit.includes(e) || e.y > top || e.y < -6 || e.warnT > 0) continue; const d = Math.hypot(e.x - fx, e.y - fy); if (d < bd) { bd = d; best = e; } }
        if (!best) break;
        hit.push(best); pts.push([best.x, best.y]); fx = best.x; fy = best.y;
      }
      for (const e of hit) this.gxHit(e, (1.1 + 0.2 * pw) * dm, p);
      if (!hit.length && g.boss) { const b = g.boss; pts.push([b.x, b.y + b.h / 2]); this.gxBossHitRect(b.x - 2, b.y, 4, b.h, (1.1 + 0.2 * pw) * dm, p); }
      if (pts.length < 2) pts.push([cx + rnd(9) - 4, top - 40]);
      g.zaps.push({ pts, t: 6 });
      cd = 14;
    } else if (gp.weapon === 'missiles') {
      shot(0, 0, { dmg: dm });
      const n = [1, 1, 2, 2, 3, 3, 4, 4][pw - 1];
      if (this.frame % 2 === 0) { for (let k = 0; k < n; k++) shot((k - (n - 1) / 2) * 8, (k - (n - 1) / 2) * 0.5, { k: 'm', vx: (k - (n - 1) / 2) * 1.2, vy: -1.5, dmg: (1.6 + 0.15 * pw) * dm, life: 120 }); Sound.play('gxMissile'); }
      cd = 16;
    }
    t.gcool = Math.max(3, Math.round(cd * rate));
    // every gun has its own voice; with 3-4 ships the extra players' guns go quieter (every other shot)
    if (p.i < 2 || (this.frame >> 4) & 1) Sound.play(GX_WEAPONS[gp.weapon].snd);
  },

  // B: a bomb: everything on screen takes a heavy hit and their shots are gone
  gxBomb(t, p) {
    const g = this.galaxy, gp = gxPlayer(p);
    gp.bombs--;
    g.flash = 24; g.bullets = [];
    for (const e of g.list.slice()) if (e.y > -8 && e.y < FH + 8 && !(e.warnT > 0)) this.gxHit(e, 15 * this.gxDmg(p), p);
    if (g.boss && g.boss.y + g.boss.h > 0) this.gxBossDamage(12 * this.gxDmg(p), p, true);
    for (let k = 0; k < 6; k++) this.fx.push({ x: 20 + rnd(FW - 40), y: 20 + rnd(FH / 2), frames: BIG_EXPLOSION(), per: 4, tick: -k * 4 });
    Sound.play('bossDie');
  },

  // ------------------------------------------------------------ your shots
  gxUpdateShots() {
    const g = this.galaxy;
    for (const s of g.shots) {
      s.life--;
      if (s.k === 'm') {
        // missiles turn to the nearest enemy
        let best = null, bd = 1e9;
        for (const e of g.list) { const d = Math.hypot(e.x - s.x, e.y - s.y); if (d < bd && e.y < s.y + 20) { bd = d; best = e; } }
        const tx = best ? best.x : g.boss ? g.boss.x : s.x, ty = best ? best.y : g.boss ? g.boss.y + g.boss.h / 2 : -50;
        const d = Math.hypot(tx - s.x, ty - s.y) || 1;
        s.vx += (tx - s.x) / d * 0.35; s.vy += (ty - s.y) / d * 0.35;
        const v = Math.hypot(s.vx, s.vy), cap = 3.6;
        if (v > cap) { s.vx *= cap / v; s.vy *= cap / v; }
      }
      s.x += s.vx; s.y += s.vy;
      if (s.y < -10 || s.x < -10 || s.x > FW + 10 || s.y > FH + 10 || s.life <= 0) { s.dead = true; continue; }
      const r = s.k === 'p' ? s.r : 2, pl = this.players[s.o] || this.players[0];
      for (const e of g.list) {
        const T = GX_TYPES[e.type];
        if (Math.abs(e.x - s.x) > (e.w || T.w) / 2 + r || Math.abs(e.y - s.y) > (e.h || T.h) / 2 + r) continue;
        if (s.k === 'p') { if (s.hit.includes(e.id || e)) continue; s.hit.push(e.id || e); this.gxHit(e, s.dmg, pl); if (--s.pierce <= 0) { s.dead = true; break; } continue; }
        this.gxHit(e, s.dmg, pl);
        s.dead = true;
        break;
      }
      if (!s.dead && g.boss && this.gxBossHitRect(s.x - r, s.y - r, r * 2, r * 2, s.dmg, pl)) s.dead = true;
    }
    g.shots = g.shots.filter(s => !s.dead);
  },

  gxHit(e, dmg, p, quiet) {
    if (e.dead) return;
    e.hp -= dmg; e.flash = 4;
    if (e.hp <= 0) this.gxKill(e, p);
    else if (!quiet && this.frame % 3 === 0) Sound.play('gxHit');
  },

  gxKill(e, p) {
    const g = this.galaxy, T = GX_TYPES[e.type];
    e.dead = true;
    g.list = g.list.filter(o => o !== e);
    if (p) { this.addScore(p, T.pts * (1 + g.loop)); p.gxKills = (p.gxKills || 0) + 1; }
    if (GX_ON_KILL[e.type] && GX_ON_KILL[e.type].call(this, e, p, g) === false) return;   // it handles its own end
    this.addFx(e.x, e.y, T.w >= 16 ? Sprites.bigExp : Sprites.smallExp, 3);
    if (this.frame % 2 === 0 || T.w >= 16) Sound.play(T.w >= 16 ? 'explode' : 'gxPop');
    // what it leaves behind
    if (e.type === 'rock' || e.type === 'rockM') for (const s of [-1, 1]) this.gxSpawn({ type: e.type === 'rock' ? 'rockM' : 'rockS', st: 'fall' }), Object.assign(g.list[g.list.length - 1], { x: e.x + s * 4, y: e.y, vx: s * (0.5 + Math.random() * 0.5), vy: e.vy || 0.8 });
    if (e.type === 'splitter') for (const s of [-1, 1]) { const d = this.gxSpawn({ type: 'drone', st: 'kami', lane: 1 }); d.x = e.x + s * 6; d.y = e.y; d.vy = 0.5; d.vx = s * 0.6; }
    if (e.type === 'mine') for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; g.bullets.push({ x: e.x, y: e.y, vx: Math.cos(a) * 1.4 * g.shotSpd, vy: Math.sin(a) * 1.4 * g.shotSpd, k: 'shot' }); }
    const big = T.pts >= 200, r = Math.random();
    if (r < (big ? 0.5 : 0.22)) this.gxDrop(e.x, e.y, big && Math.random() < 0.6 ? 'gem' : 'coin');
    else if (r < (big ? 0.58 : 0.25)) this.gxDrop(e.x, e.y, 'cell');
    else if (r < (big ? 0.62 : 0.262)) this.gxDrop(e.x, e.y, 'box');
    else if (r < (big ? 0.64 : 0.268)) this.gxDrop(e.x, e.y, Math.random() < 0.5 ? 'shield' : 'bomb');
  },

  // ------------------------------------------------------------ the enemy
  gxUpdateEnemies() {
    const g = this.galaxy, pl = this.gxPlayers(), frozen = this.freezeE > 0;
    const sway = Math.sin(this.frame / 70) * Math.min(12, (FW - 180) / 2 + 10), breathe = Math.sin(this.frame / 45);
    const near = (x, y) => pl.reduce((a, t) => (!a || Math.hypot(t.x + 8 - x, t.y + 8 - y) < Math.hypot(a.x + 8 - x, a.y + 8 - y) ? t : a), null);
    // now and then one or two leave the formation and dive at you
    if (!frozen && --g.diveT <= 0) {
      const formed = g.list.filter(e => e.st === 'form');
      for (let k = 0; k < Math.min(formed.length, 1 + (g.sec + g.loop > 2 ? 1 : 0)); k++) {
        const e = formed[rnd(formed.length)];
        if (e.st !== 'form') continue;
        const tg = near(e.x, e.y);
        // they swoop near you, not always straight through you
        e.st = 'dive'; e.t = 0; e.sx = e.x; e.sy = e.y; e.tx = (tg ? tg.x + 8 : FW / 2) + rnd(61) - 30; e.shot = false;
      }
      g.diveT = Math.round((150 + rnd(90)) / Math.max(0.6, g.fireMul));
    }
    for (const e of g.list.slice()) {
      const T = GX_TYPES[e.type];
      if (e.flash > 0) e.flash--;
      if (frozen) continue;
      e.t++;
      const slotX = e.slot ? e.slot[0] + sway : 0, slotY = e.slot ? e.slot[1] + breathe * (e.slot[1] - 20) * 0.08 : 0;
      switch (e.st) {
        case 'enter': {
          const p = Math.min(1, e.t / 70), q = 1 - p;
          e.x = q * q * e.x0 + 2 * q * p * e.cx + p * p * slotX; e.y = q * q * e.y0 + 2 * q * p * (e.cy + 120) + p * p * slotY;
          if (p >= 1) e.st = 'form';
          break;
        }
        case 'form': e.x = slotX; e.y = slotY; break;
        case 'dive': {
          const k = Math.min(1, e.t / 70);
          e.x = e.sx + (e.tx - e.sx) * (k * k * (3 - 2 * k)) + Math.sin(e.t / 9) * 14 * (1 - k * 0.5);
          e.y = e.sy - Math.sin(Math.min(1, e.t / 20) * Math.PI) * 10 + Math.max(0, e.t - 10) * 1.6 * Math.min(1.6, g.shotSpd);
          if (!e.shot && e.y > FH * 0.3) { e.shot = true; this.gxAimed(e, near(e.x, e.y), 1.5); }
          if (e.y > FH + 14) { e.st = e.slot ? 'return' : 'gone'; e.x = e.slot ? slotX : e.x; e.y = -14; }
          break;
        }
        case 'return': e.x += (slotX - e.x) * 0.08; e.y += 1.4; if (e.y >= slotY) e.st = 'form'; break;
        case 'stream':
          e.x += e.dirX * 1.3 * Math.min(1.5, 0.8 + g.shotSpd * 0.3);
          e.y = e.base + Math.sin(e.x / 22) * 14;
          if (e.x < -16 || e.x > FW + 16) { e.dirX = -e.dirX; e.lane = (e.lane + 1) % 3; e.base = 30 + e.lane * 26; }
          break;
        case 'fall':
          e.x += e.vx; e.y += e.vy;
          if (e.x < 4 || e.x > FW - 4) e.vx = -e.vx;
          if (e.y > FH + 16) e.st = 'gone';
          break;
        case 'kami': {
          const tg = near(e.x, e.y);
          if (tg && e.y < tg.y) e.x += Math.sign(tg.x + 8 - e.x) * 0.35 + (e.vx || 0);
          e.vy = Math.min(2.6, (e.vy || 0.6) + 0.035); e.y += e.vy;
          if (e.y > FH + 12) e.st = 'gone';
          break;
        }
        case 'cross':
          e.x += e.dirX * 0.8;
          if (e.x < -14 || e.x > FW + 14) { e.dirX = -e.dirX; e.y = Math.min(FH * 0.4, e.y + 8); }
          break;
        case 'orbit': {
          const par = g.list.find(o => o.id && o.id === e.parent);
          if (!par) { e.st = 'dive'; e.t = 0; e.sx = e.x; e.sy = e.y; const tg = near(e.x, e.y); e.tx = tg ? tg.x + 8 : FW / 2; e.shot = false; break; }
          e.ang += 0.035;
          const ox = par.x + Math.cos(e.ang) * 24, oy = par.y + Math.sin(e.ang) * 16;
          e.x = e.t < 40 ? e.x + (ox - e.x) * 0.12 : ox; e.y = e.t < 40 ? e.y + (oy - e.y) * 0.12 : oy;
          break;
        }
        default: if (GX_MOVES[e.st]) GX_MOVES[e.st].call(this, e, g, near);
      }
      if (e.st === 'gone') { g.list = g.list.filter(o => o !== e); continue; }
      // shooting: eggs straight down; the big ones aim
      if (e.st !== 'fall' && e.st !== 'enter' && e.y > 0 && --e.fireT <= 0 && g.bullets.length < 14 + 2 * (g.d ?? g.sec) + 6 * g.loop) {
        let own;
        if (GX_FIRE[e.type]) own = GX_FIRE[e.type].call(this, e, g, near);   // a number: its own time to the next shot
        else if (T.noFire) { /* rams, never shoots */ }
        else if (e.type === 'brute') this.gxAimed(e, near(e.x, e.y), 1.6);
        else if (e.type === 'tanker') for (const sp of [-0.25, 0, 0.25]) this.gxAimed(e, near(e.x, e.y), 1.4, sp);
        else if (e.type === 'egger') for (const vx of [-0.5, 0, 0.5]) g.bullets.push({ x: e.x, y: e.y + 6, vx, vy: 1.1 * g.shotSpd, k: 'egg' });
        else if (e.type !== 'mine' && e.type !== 'kami') g.bullets.push({ x: e.x, y: e.y + 5, vx: 0, vy: 1.3 * g.shotSpd, k: 'egg' });
        e.fireT = own !== undefined ? own : Math.round((e.st === 'cross' ? 150 + rnd(90) : 320 + rnd(400)) / Math.max(0.4, g.fireMul));
      }
      // running into a ship
      if (e.warnT > 0) continue;   // not on yet: only its warning shows
      for (const t of pl) {
        if (GX_COLLIDE[e.type] ? GX_COLLIDE[e.type].call(this, e, t) : Math.abs(t.x + 8 - e.x) < (e.w || T.w) / 2 + 5 && Math.abs(t.y + 8 - e.y) < (e.h || T.h) / 2 + 5) {
          this.hitPlayer(t);
          this.gxHit(e, 3, null);
        }
      }
    }
  },

  // a shot at a ship (a little to the side with spread)
  gxAimed(e, t, spd, spread = 0) {
    if (!t) return;
    const g = this.galaxy, a = Math.atan2(t.y + 8 - e.y, t.x + 8 - e.x) + spread;
    g.bullets.push({ x: e.x, y: e.y + 4, vx: Math.cos(a) * spd * g.shotSpd, vy: Math.sin(a) * spd * g.shotSpd, k: 'shot' });
  },

  gxUpdateBullets() {
    const g = this.galaxy, pl = this.gxPlayers();
    for (const b of g.bullets) {
      if (this.freezeE > 0 && b.k !== 'beam') continue;
      b.x += b.vx; b.y += b.vy;
      if (b.k === 'shard' && b.slow) b.vy = Math.min(b.vy + 0.02, 2.2);
      if (b.y > FH + 8 || b.y < -16 || b.x < -8 || b.x > FW + 8) { b.dead = true; continue; }
      for (const t of pl) {
        if (Math.abs(t.x + 8 - b.x) < 4 && Math.abs(t.y + 9 - b.y) < 5) {   // only the ship's middle counts (a shoot-em-up's small hitbox)
          b.dead = true;
          if (b.k === 'ice') { if (!(t.shield > 0)) t.frozen = 50; } else this.hitPlayer(t);
          break;
        }
      }
    }
    g.bullets = g.bullets.filter(b => !b.dead);
  },

  // ------------------------------------------------------------ pickups
  gxDrop(x, y, k) {
    const g = this.galaxy;
    g.pickups.push({ x, y, k, vy: 0.55, t: 0, w: k === 'box' ? GX_WEAPON_KEYS[rnd(GX_WEAPON_KEYS.length)] : null });
  },

  gxUpdatePickups() {
    const g = this.galaxy, pl = this.gxPlayers();
    for (const u of g.pickups) {
      u.t++;
      u.y += u.vy; u.x += Math.sin(u.t / 15) * 0.3;
      // sector clear: after a moment all the loot homes in on the nearest ship, faster and faster
      if (g.phase === 'clear' && g.t > 60 && pl.length) {
        // power cells are shared out one per ship, the rest goes to whoever is nearest
        if (u.k === 'cell' && !(u.to && u.to.alive)) u.to = pl[(g.cellTurn = ((g.cellTurn || 0) + 1)) % pl.length];
        const t = u.k === 'cell' ? u.to : pl.reduce((a, q) => Math.hypot(q.x + 8 - u.x, q.y + 8 - u.y) < Math.hypot(a.x + 8 - u.x, a.y + 8 - u.y) ? q : a);
        const dx = t.x + 8 - u.x, dy = t.y + 8 - u.y, d = Math.hypot(dx, dy) || 1, v = Math.min(5, 1 + (g.t - 60) / 40);
        u.x += dx / d * v; u.y += dy / d * v - u.vy;
      }
      // a magnet pulls them in
      for (const t of pl) {
        if (u.to && u.to !== t && u.to.alive) continue;   // a cell on its way to someone else
        const r = 22 + 18 * gxUp(t.player, 'magnet'), dx = t.x + 8 - u.x, dy = t.y + 8 - u.y, d = Math.hypot(dx, dy);
        if (d < r && d > 0) { u.x += dx / d * 1.6; u.y += dy / d * 1.6; }
        if (Math.abs(dx) < 11 && Math.abs(dy) < 11) { this.gxCollect(t, u); u.dead = true; break; }
      }
      if (u.y > FH + 10 || u.t > 1200) u.dead = true;
    }
    g.pickups = g.pickups.filter(u => !u.dead);
  },

  gxCollect(t, u) {
    const p = t.player, gp = gxPlayer(p);
    if (GX_PICKUPS[u.k]) { GX_PICKUPS[u.k].collect.call(this, t, u); return; }
    const say = (text, color = COL.white) => this.popups.push({ x: t.x + 8, y: t.y - 4, text, label: true, color, t: 0, delay: 0, life: 50 });
    if (u.k === 'coin') { this.addScore(p, 100); Sound.play('coin'); }
    else if (u.k === 'gem') { this.addScore(p, 500); say('500', COL.gold); Sound.play('coin'); }
    else if (u.k === 'cell') {
      if (gp.power < GX_POWER_MAX) { gp.power++; say('POWER ' + gp.power, '#58D854'); } else { this.addScore(p, 1000); say('MAX! 1000', COL.gold); }
      Sound.play('pickup');
    } else if (u.k === 'box') {
      if (gp.weapon === u.w) { gp.power = Math.min(GX_POWER_MAX, gp.power + 1); say(GX_WEAPONS[u.w].name + ' ' + gp.power, GX_WEAPONS[u.w].color); }
      else { gp.weapon = u.w; say(GX_WEAPONS[u.w].name, GX_WEAPONS[u.w].color); }
      Sound.play('bonus');
    } else if (u.k === 'shield') { t.shield = Math.max(t.shield, 480); say('SHIELD', '#3CBCFC'); Sound.play('pickup'); }
    else if (u.k === 'bomb') { gp.bombs = Math.min(5, gp.bombs + 1); say('BOMB', '#F83800'); Sound.play('pickup'); }
    else if (u.k === 'life') { p.lives++; say('1UP', COL.gold); Sound.play('life'); }
  },

  // losing a ship costs 2 power levels
  gxOnDeath(p) { const gp = gxPlayer(p); gp.power = Math.max(1, gp.power - 2); },
});

// ------------------------------------------------------------------ bosses: one at the end of every sector
const GX_BOSSES = [
  { key: 'mothership', name: 'MOTHERSHIP', w: 56, h: 26, hp: 180, pts: 10000, move: 'sway',
    phases: [['fan5', 'spawnDrones', 'aimed3'], ['ring12', 'aimed5', 'spawnDrones'], ['spiral', 'fan7', 'spawnBugs']] },
  { key: 'crab', name: 'WAR CRAB', w: 56, h: 32, hp: 240, pts: 12000, move: 'swayFast',
    phases: [['claws', 'fan5'], ['claws', 'charge', 'ring12'], ['claws', 'ring16', 'charge', 'spiral']] },
  { key: 'titan', name: 'ROCK TITAN', w: 52, h: 44, hp: 260, pts: 14000, move: 'sway',
    phases: [['rocks', 'fan5'], ['rocks', 'aimed5', 'ring12'], ['spiral', 'rocks', 'fan9']] },
  { key: 'frost', name: 'FROST QUEEN', w: 48, h: 40, hp: 330, pts: 16000, move: 'hover',
    phases: [['shards', 'fan7'], ['freezeBeam', 'shards', 'aimed3'], ['icestorm', 'spiral', 'freezeBeam']] },
  { key: 'eye', name: 'ELDER EYE', w: 48, h: 40, hp: 280, pts: 18000, move: 'sway', eye: true,
    phases: [['stare', 'spawnBugs', 'fan5'], ['stare', 'ring12', 'spawnWasps'], ['stare', 'spiral', 'ring16']] },
  { key: 'overmind', name: 'OVERMIND', w: 56, h: 40, hp: 380, pts: 25000, move: 'sway', orbs: 4,
    phases: [['aimed5', 'orbFire', 'fan7'], ['spiral', 'orbFire', 'spawnWasps'], ['spiral2', 'ring16', 'aimed5', 'spawnWasps']] },
];
const GX_BOSS_PALS = {
  mothership: [null, '#E8E8F8', '#9898B8', '#48486C', '#F8F8F8', '#A8F8F8', '#F83800', '#0C0C18'],
  crab: [null, '#F8B8A8', '#E04030', '#7C1000', '#F8F8F8', '#F8D800', '#B83000', '#180400'],
  titan: [null, '#C8A878', '#8C6C3C', '#4C3818', '#E8D8B8', '#F87830', '#5C4428', '#140C04'],
  frost: [null, '#F8F8F8', '#A8E8F8', '#3C8CC8', '#E0F8F8', '#58F8F8', '#7CB8F8', '#08182C'],
  eye: [null, '#F8F0F0', '#D8C0C8', '#8C5C6C', '#F8F8F8', '#F83800', '#58D854', '#180810'],
  overmind: [null, '#F8C8E8', '#E078B8', '#8C2C6C', '#C8C8D8', '#F8F878', '#7C7C9C', '#180818'],
};
const GX_BOSS_DRAW = {
  mothership(f, ph) {
    const P = bossPainter(56, 26);
    P.disc(28, 9, 9, 5); P.px(24, 5, 4); P.px(25, 4, 4);
    P.ellipse(28, 16, 27.5, 8.5);
    P.rect(4, 15, 51, 15, 3);
    for (let k = 0; k < 9; k++) P.rect(5 + k * 6, 17, 6 + k * 6, 18, (k + f) % 3 ? 6 : 4);
    P.rect(20, 22, 35, 24, 3); P.rect(22, 23, 33, 23, 6);
    P.wear(ph, 21); P.outline(); return P.g;
  },
  crab(f, ph) {
    const P = bossPainter(56, 32);
    for (let k = 0; k < 3; k++) { P.line(18 - k * 3, 18 + k * 3, 8 - k * 4, 28 + (f ? 1 : 0), 3); P.line(38 + k * 3, 18 + k * 3, 48 + k * 4, 28 + (f ? 0 : 1), 3); }   // legs
    P.ellipse(28, 15, 16, 11);
    for (const x of [7, 49]) { P.ellipse(x, 20, 6.5, 8); P.rect(x - 3, 27, x - 1, 31, 2); P.rect(x + 1, 27, x + 3, 31, 2); P.rect(x - 1, 28, x + 1, 30, 0); }   // claws
    P.line(23, 6, 21, 0, 3); P.line(33, 6, 35, 0, 3); P.disc(21, 1, 1.6, 5); P.disc(35, 1, 1.6, 5);   // eye stalks
    P.rect(22, 18, 34, 19, 3); for (let x = 23; x < 34; x += 2) P.px(x, 20, 4);
    P.wear(ph, 22); P.outline(); return P.g;
  },
  titan(f, ph) {
    const P = bossPainter(52, 44);
    P.ellipse(26, 22, 25, 21);
    for (const [x, y, r] of [[12, 14, 4], [38, 12, 3], [34, 32, 5], [14, 32, 3]]) { P.disc(x, y, r, 3); P.disc(x - 1, y - 1, r - 1.5, 6); }   // craters
    P.disc(26, 22, 6, 7); P.disc(26, 22, 4, ph >= 2 ? 5 : 6); P.disc(26, 22, 2, f ? 4 : 5);   // the glowing core
    if (ph >= 2) { P.line(26, 28, 20, 40, 5); P.line(30, 16, 40, 6, 5); }
    if (ph >= 3) { P.line(20, 20, 6, 24, 5); P.line(32, 24, 46, 30, 5); }
    for (const x of [8, 44]) { P.rect(x - 3, 36, x + 3, 41, 3); P.rect(x - 1, 41, x + 1, 43, 4); }   // turrets
    P.outline(); return P.g;
  },
  frost(f, ph) {
    const P = bossPainter(48, 40);
    for (let y = 2; y < 38; y++) { const hw = y < 20 ? (y - 2) * 1.2 : (38 - y) * 1.2; for (let x = Math.round(24 - hw); x <= Math.round(23 + hw); x++) P.px(x, y, x < 24 - hw / 2 ? 1 : x > 24 + hw / 3 ? 3 : 2); }
    for (const x of [10, 18, 30, 38]) P.line(x, 12, x + (x < 24 ? -2 : 2), 2, 4);   // the crown's spikes
    P.line(24, 2, 24, 38, 6); P.line(6, 20, 42, 20, 6);
    P.disc(24, 20, 4, f ? 5 : 4); P.disc(24, 20, 2, 1);
    if (ph >= 2) { P.line(14, 24, 8, 30, 7); P.line(32, 14, 38, 10, 7); }
    P.outline(); return P.g;
  },
  // f: 0 open, 1 closed
  eye(f, ph) {
    const P = bossPainter(48, 40);
    for (let k = 0; k < 6; k++) { const x = 6 + k * 7; P.line(x, 28, x + (k % 2 ? 3 : -3), 39, 3); P.line(x + 1, 28, x + 1 + (k % 2 ? 3 : -3), 39, 2); }   // tentacles
    P.ellipse(24, 18, 22, 15);
    if (f) { P.rect(3, 17, 45, 18, 3); for (let x = 6; x < 44; x += 4) P.px(x, 19, 7); }   // shut
    else { P.disc(24, 18, 9, 6); P.disc(24, 18, 5, 7); P.disc(21, 15, 2, 4); for (const [x0, y0] of [[8, 12], [40, 24], [10, 24]]) P.line(x0, y0, x0 + (x0 < 24 ? 5 : -5), y0 + 1, 5); }   // open: iris, veins
    P.wear(ph, 25); P.outline(); return P.g;
  },
  overmind(f, ph) {
    const P = bossPainter(56, 40);
    P.rect(10, 26, 45, 36, 6); P.rect(10, 26, 45, 27, 4); for (let x = 12; x < 44; x += 6) P.rect(x, 30, x + 2, 34, 7);   // the machine below
    P.ellipse(28, 16, 22, 15);
    for (const [x0, y0, x1, y1] of [[10, 12, 20, 8], [20, 16, 30, 10], [30, 8, 40, 14], [14, 22, 26, 20], [32, 20, 44, 18], [28, 3, 28, 28]]) P.line(x0, y0, x1, y1, 3);   // folds
    P.disc(20, 30, 2.5, 5); P.disc(36, 30, 2.5, 5); P.px(20, 30, f ? 4 : 7); P.px(36, 30, f ? 4 : 7);
    P.wear(ph, 26); P.outline(); return P.g;
  },
};
GxGfx.boss = function (key, f, variant, ph) {
  const k = 'B' + key + f + variant + ph;
  let c = this.cache.get(k);
  if (!c) { c = gridCanvas(GX_BOSS_DRAW[key](f, ph), variant === 'f' ? BOSS_PALS.f : variant === 'r' ? BOSS_PALS.r : GX_BOSS_PALS[key]); this.cache.set(k, c); }
  return c;
};

Object.assign(Stage.prototype, {
  gxBossStart() {
    const g = this.galaxy, def = GX_BOSSES[g.sec], hp = def.hp * (1 + 0.08 * (g.d ?? g.sec)) * Math.pow(1.6, g.loop) * (1 + 0.5 * (this.players.length - 1));
    g.phase = 'boss'; g.t = 0; g.kind = 'boss';
    g.boss = { key: def.key, x: FW / 2, y: -def.h, w: def.w, h: def.h, hp, max: hp, ph: 1, t: 0, cd: 120, step: 0, act: null, flash: 0, stagger: 0, spin: 0,
      open: def.eye ? 0 : 1, openT: 200, orbs: def.orbs ? Array.from({ length: def.orbs }, (_, k) => ({ a: k * Math.PI * 2 / def.orbs, hp: 14 * g.hpMul, max: 14 * g.hpMul })) : [], beams: [] };
    g.banner = { text: 'WARNING! ' + def.name, t: 150, warn: true };
    if (def.init) def.init.call(this, g.boss, g);
    Sound.play('bossWarn');
  },

  // a boss says something: a box under it (galaxy2.js's talkers)
  gxSay(b, text, t = 150) { if (b) b.say = { text, t }; },

  gxUpdateBoss() {
    const g = this.galaxy, b = g.boss, def = GX_BOSSES[g.sec];
    if (!b) return;
    b.t++;
    if (b.flash > 0) b.flash--;
    if (b.say && --b.say.t <= 0) b.say = null;
    // in from the top
    if (b.y < 14 && !b.charge && !b.dash) { b.y += 0.6; return; }
    for (const bm of b.beams) bm.t++;
    this.gxBossBeams(b);
    b.beams = b.beams.filter(bm => bm.t < bm.warn + bm.dur);
    if (b.stagger > 0) { b.stagger--; return; }
    if (this.freezeE > 0) return;
    const pl = this.gxPlayers(), near = pl.reduce((a, t) => (!a || Math.abs(t.x + 8 - b.x) < Math.abs(a.x + 8 - b.x) ? t : a), null);
    // moving (a boss of its own ways moves itself; true: it did)
    if (def.update && def.update.call(this, b, g, near, pl)) { /* moved */ }
    else if (b.hold) { /* stays put while it does something */ }
    else if (b.charge) {
      b.y += b.charge > 0 ? 2.4 : -1.4;
      if (b.y >= FH * 0.45) b.charge = -1;
      if (b.charge < 0 && b.y <= 14) { b.y = 14; b.charge = 0; }
    } else if (def.move === 'hover') {
      const tx = near ? near.x + 8 : FW / 2;
      b.x += Math.max(-0.7, Math.min(0.7, tx - b.x)); b.y = 14 + Math.sin(b.t / 40) * 3;
    } else {
      const per = def.move === 'swayFast' ? 55 : 90;
      b.x = FW / 2 + Math.sin(b.t / per) * (FW / 2 - b.w / 2 - 6); b.y = 14 + Math.sin(b.t / 50) * 3;
    }
    b.x = Math.max(b.w / 2 + 2, Math.min(FW - b.w / 2 - 2, b.x));
    // the eye opens and shuts
    if (def.eye && --b.openT <= 0) { b.open = b.open ? 0 : 1; b.openT = b.open ? 200 + 30 * b.ph : 100 - 15 * b.ph; if (b.open) Sound.play('charge'); }
    for (const o of b.orbs) o.a += 0.025 + 0.01 * b.ph;
    // running into it
    for (const t of pl) if (Math.abs(t.x + 8 - b.x) < b.w / 2 + 4 && t.y + 8 > b.y && t.y + 8 < b.y + b.h + 4) this.hitPlayer(t);
    // attacks, one after another from this phase's list
    if (b.act) { this.gxBossAct(b, near); return; }
    if (--b.cd > 0) return;
    const list = def.phases[b.ph - 1];
    b.act = { k: list[b.step++ % list.length], t: 0 };
  },

  gxBossAct(b, near) {
    const g = this.galaxy, a = b.act, cx = b.x, cy = b.y + b.h - 4, s = g.shotSpd, done = (gap = 50) => { b.act = null; b.cd = Math.round(gap / Math.max(0.6, g.fireMul) * (1 - 0.12 * (b.ph - 1))); };
    const shoot = (x, y, ang, spd, k = 'shot', o = {}) => g.bullets.push(Object.assign({ x, y, vx: Math.cos(ang) * spd * s, vy: Math.sin(ang) * spd * s, k }, o));
    const toward = (x, y) => (near ? Math.atan2(near.y + 8 - y, near.x + 8 - x) : Math.PI / 2);
    const k = a.k;
    a.t++;
    if (/^fan\d+$/.test(k)) { const n = +k.slice(3), c = toward(cx, cy); for (let i = 0; i < n; i++) shoot(cx, cy, c + (i - (n - 1) / 2) * 0.2, 1.5); Sound.play('mortar'); done(60); return; }
    if (/^ring\d+$/.test(k)) { const n = +k.slice(4); if (a.t === 1 || a.t === 24) for (let i = 0; i < n; i++) shoot(b.x, b.y + b.h / 2, i * Math.PI * 2 / n + a.t * 0.1, 1.2); if (a.t >= 24) done(70); return; }
    if (/^aimed\d+$/.test(k)) { const n = +k.slice(5); if (a.t % 8 === 1) shoot(cx, cy, toward(cx, cy), 2); if (a.t >= n * 8) done(50); return; }
    switch (k) {
      case 'spiral': case 'spiral2': {
        const arms = k === 'spiral2' ? 4 : 3;
        if (a.t % 5 === 0) { b.spin += 0.23; for (let i = 0; i < arms; i++) shoot(b.x, b.y + b.h / 2, b.spin + i * Math.PI * 2 / arms, 1.1); if (k === 'spiral2') for (let i = 0; i < 2; i++) shoot(b.x, b.y + b.h / 2, -b.spin + i * Math.PI, 1.1); }
        if (a.t >= 110) done(70);
        return;
      }
      case 'spawnDrones': case 'spawnBugs': case 'spawnWasps': {
        const type = k === 'spawnDrones' ? 'drone' : k === 'spawnBugs' ? 'bug' : 'wasp';
        if (g.list.length < 12) for (let i = 0; i < 3; i++) { const e = this.gxSpawn({ type, st: 'dive' }); e.x = b.x + (i - 1) * 14; e.y = cy; e.sx = e.x; e.sy = e.y; e.t = -i * 10; e.tx = near ? near.x + 8 : FW / 2; e.shot = false; }
        Sound.play('teleport'); done(60); return;
      }
      case 'claws': {
        if (a.t % 10 === 1) for (const dx of [-b.w / 2 + 7, b.w / 2 - 7]) shoot(b.x + dx, b.y + b.h - 2, toward(b.x + dx, b.y + b.h), 1.7);
        if (a.t >= 30) done(40);
        return;
      }
      case 'charge': if (a.t === 1) { b.charge = 1; Sound.play('charge'); } if (!b.charge) done(40); return;
      case 'rocks': for (let i = 0; i < 2 + b.ph; i++) this.gxSpawn({ type: i % 2 ? 'rockM' : 'rock', st: 'fall' }); done(90); return;
      case 'shards': { const n = 7 + b.ph * 2; for (let i = 0; i < n; i++) shoot(cx, cy, Math.PI / 2 + (i - (n - 1) / 2) * 0.17, 1.2, 'shard', { slow: true }); Sound.play('mortar'); done(60); return; }
      case 'icestorm': if (a.t % 6 === 0) g.bullets.push({ x: 6 + rnd(FW - 12), y: -6, vx: 0, vy: 1.2 * s, k: 'shard', slow: true }); if (a.t >= 100) done(60); return;
      case 'freezeBeam': if (a.t === 1) b.beams.push({ x: near ? near.x + 8 : b.x, t: 0, warn: 45, dur: 30, kind: 'ice' }); if (a.t > 75) done(40); return;
      case 'stare':
        // only while it's open: a line from the eye to you, then a burning beam along it
        if (!b.open) { done(20); return; }
        if (a.t === 1) { const tx = near ? near.x + 8 : b.x, ty = near ? near.y + 8 : FH; b.beams.push({ x: b.x, y0: b.y + 18, tx, ty, t: 0, warn: 40, dur: 24, kind: 'stare' }); Sound.play('charge'); }
        if (a.t > 64) done(30);
        return;
      case 'orbFire': for (const o of b.orbs) if (o.hp > 0) { const [ox, oy] = this.gxOrbPos(b, o); shoot(ox, oy, toward(ox, oy), 1.6); } done(50); return;
      default: if (GX_BOSS_ACTS[k]) GX_BOSS_ACTS[k].call(this, b, a, { g, cx, cy, s, done, shoot, toward, near }); else done(40);
    }
  },

  gxOrbPos(b, o) { return [b.x + Math.cos(o.a) * (b.w / 2 + 8), b.y + b.h / 2 + Math.sin(o.a) * (b.h / 2 + 6)]; },

  // the boss's beams: a warning line first, then it bites
  gxBossBeams(b) {
    for (const bm of b.beams) {
      if (bm.t === bm.warn && bm.kind !== 'tractor') Sound.play(bm.snd || 'laser');
      if (bm.t < bm.warn) continue;
      for (const t of this.gxPlayers()) {
        const px = t.x + 8, py = t.y + 8;
        let hit;
        if (bm.kind === 'ice') hit = Math.abs(px - bm.x) < 9;
        else if (bm.w) hit = Math.abs(px - bm.x) < bm.w / 2 + 3 && py > (bm.top || 0);   // a column
        if (hit && bm.kind === 'tractor') { t.x += Math.sign(bm.x - px) * Math.min(0.7, Math.abs(bm.x - px)); t.y = Math.max(Math.round(FH * 0.35), t.y - 0.6); continue; }
        if (bm.w && bm.kind !== 'ice') { if (hit) this.hitPlayer(t); continue; }
        else { const dx = bm.tx - bm.x, dy = bm.ty - bm.y0, L = Math.hypot(dx, dy) || 1, k = ((px - bm.x) * dx + (py - bm.y0) * dy) / (L * L); hit = k > 0 && Math.abs((px - bm.x) * dy - (py - bm.y0) * dx) / L < 7; }
        if (!hit) continue;
        if (bm.kind === 'ice') { if (!(t.shield > 0)) t.frozen = 70; } else this.hitPlayer(t);
      }
    }
  },

  // a shot (a rectangle) against the boss: an orb in the way takes it first; true if it hit anything
  gxBossHitRect(x, y, w, h, dmg, p) {
    const b = this.galaxy.boss, def = GX_BOSSES[this.galaxy.sec];
    if (!b || b.y < -b.h / 2) return false;   // still coming in
    if (def.hitParts && def.hitParts.call(this, b, x, y, w, h, dmg, p)) return true;   // a hand, a wingman... in the way
    for (const o of b.orbs) {
      if (o.hp <= 0) continue;
      const [ox, oy] = this.gxOrbPos(b, o);
      if (overlap(x, y, w, h, ox - 5, oy - 5, 10, 10)) {
        o.hp -= dmg; o.flash = 4;
        if (o.hp <= 0) { this.addFx(ox, oy, Sprites.bigExp, 3); Sound.play('explode'); if (p) this.addScore(p, 500); }
        return true;
      }
    }
    if (!overlap(x, y, w, h, b.x - b.w / 2, b.y, b.w, b.h)) return false;
    this.gxBossDamage(dmg, p, false);
    return true;
  },

  gxBossDamage(dmg, p, bomb) {
    const g = this.galaxy, b = g.boss, def = GX_BOSSES[g.sec];
    if (!b || b.dead) return;
    if (def.eye && !b.open && !bomb) { if (this.frame % 6 === 0) Sound.play('steel'); return; }   // the shut eye shrugs it off
    if (b.orbs.some(o => o.hp > 0)) dmg *= 0.4;   // its orbs shield it
    if (def.damage) dmg = def.damage.call(this, b, dmg, p, bomb);
    if (!(dmg > 0)) return;
    b.hp -= dmg;
    if (b.noFlash) b.noFlash = false; else b.flash = 3;   // a hit its shield took doesn't make it flash
    if (this.frame % 4 === 0) Sound.play('gxHit');
    const f = b.hp / b.max, ph = f > 2 / 3 ? 1 : f > 1 / 3 ? 2 : 3;
    if (ph > b.ph && b.hp > 0) {
      b.ph = ph; b.stagger = 40; b.act = null; b.cd = 60; b.step = 0;
      g.banner = { text: def.name + ': PHASE ' + ph, t: 100, warn: true };
      if (b.orbs.length) for (let k = 0; k < 2; k++) { const o = b.orbs[k]; if (o.hp <= 0) { o.hp = o.max * 0.6; } }   // the overmind grows two orbs back
      for (let k = 0; k < 4; k++) this.fx.push({ x: b.x - b.w / 2 + rnd(b.w), y: b.y + rnd(b.h), frames: Sprites.bigExp, per: 4, tick: -k * 5 });
      b.hold = false; b.dash = 0;
      if (def.onPhase) def.onPhase.call(this, b, g, ph);
      Sound.play('bossPhase');
    }
    if (b.hp <= 0) this.gxBossKill(p);
  },

  gxBossKill(p) {
    const g = this.galaxy, b = g.boss, def = GX_BOSSES[g.sec];
    b.dead = true;
    for (let k = 0; k < 10; k++) this.fx.push({ x: b.x - b.w / 2 + rnd(b.w), y: b.y + rnd(b.h), frames: BIG_EXPLOSION(), per: 5, tick: -k * 6 });
    Sound.play('bossDie');
    const pts = def.pts * (1 + g.loop);
    if (p) this.addScore(p, pts);
    for (const q of this.players) if (!q.out && q !== p) this.addScore(q, 2000);
    this.popups.push({ x: b.x, y: b.y + b.h / 2, text: String(pts), t: 0, delay: 40 });
    for (let k = 0; k < 8; k++) this.gxDrop(b.x - 24 + rnd(48), b.y + rnd(b.h), k < 2 ? 'gem' : 'coin');
    for (const q of this.players) if (!q.out) this.gxDrop(b.x - 20 + rnd(40), b.y + b.h, 'cell');
    if (g.sec === GX_SECTORS.length - 1 || Math.random() < 0.5) this.gxDrop(b.x, b.y + b.h, 'life');
    g.bullets = []; g.list.forEach(e => this.gxKill(e, null)); g.list = [];
    g.boss = null; g.phase = 'clear'; g.t = 0;
    g.banner = { text: 'SECTOR ' + g.level + ' CLEAR!', t: 200 };
    if (def.onKill) def.onKill.call(this, b, g);
    this.bossDefeated = true;
  },
});

// ------------------------------------------------------------------ drawing
// a pickup's icon (also used in the hangar): coin, gem, power cell, weapon box, shield, bomb, extra life
function gxDrawPickup(ctx, k, x, y, t, w) {
  x = Math.round(x); y = Math.round(y);
  const R = (dx, dy, ww, hh, c) => { ctx.fillStyle = c; ctx.fillRect(x + dx, y + dy, ww, hh); };
  if (GX_PICKUPS[k]) { GX_PICKUPS[k].draw(ctx, x, y, t, R); return; }
  if (k === 'coin') { const sq = [5, 4, 2, 4][(t >> 3) & 3]; R(-sq / 2 - 1, -4, sq + 2, 8, '#7C5000'); R(-sq / 2, -3, sq, 6, '#F8D800'); if (sq > 2) R(-1, -2, 1, 2, '#F8F8F8'); return; }
  if (k === 'gem') { for (let j = 0; j < 4; j++) R(-j, -3 + j, j * 2 + 1, 1, '#58F8F8'); for (let j = 0; j < 3; j++) R(-2 + j, 1 + j, 5 - j * 2, 1, '#3CBCB8'); R(-1, -2, 1, 1, '#F8F8F8'); return; }
  if (k === 'cell') { R(-5, -5, 10, 10, '#0C3C0C'); R(-4, -4, 8, 8, (t >> 3) & 1 ? '#58D854' : '#3C9C1C'); Font.draw(ctx, 'P', x - 3, y - 3, '#F8F8F8'); return; }
  if (k === 'box') {
    const W = GX_WEAPONS[w] || GX_WEAPONS.blaster;
    // a blue crate tied with a ribbon in the weapon's colour (never red: red is for things that hurt)
    R(-6, -6, 12, 12, '#100808'); R(-5, -5, 10, 10, '#2038EC'); R(-5, -5, 10, 1, '#6888FC'); R(-1, -5, 2, 10, W.color); R(-5, -1, 10, 2, W.color);
    R(-3, -8, 2, 2, '#F8F8F8'); R(1, -8, 2, 2, '#F8F8F8');
    if ((t >> 4) & 1) { R(-4, -4, 8, 8, '#100808'); Font.draw(ctx, W.letter, x - 3, y - 3, W.color); }
    return;
  }
  if (k === 'shield') { ctx.fillStyle = '#3CBCFC'; for (let a = 0; a < 16; a++) ctx.fillRect(x + Math.round(Math.cos(a * 0.39) * 5), y + Math.round(Math.sin(a * 0.39) * 5), 1, 1); R(-1, -1, 2, 2, '#F8F8F8'); return; }
  if (k === 'bomb') { R(-2, -6, 4, 10, '#BCBCBC'); R(-2, -6, 4, 2, '#F83800'); R(-4, 2, 2, 3, '#7C7C7C'); R(2, 2, 2, 3, '#7C7C7C'); if ((t >> 2) & 1) R(-1, 5, 2, 2, '#F8B800'); return; }
  if (k === 'life') { ctx.drawImage(Sprites.playerIcon(Config.playerPal(0)), x - 4, y - 4); if ((t >> 3) & 1) R(-6, -6, 12, 1, '#F8D800'); }
}

Object.assign(Stage.prototype, {
  renderGalaxy(ctx) {
    const g = this.galaxy, f = this.frame, sec = GX_SECTORS[g.sec];
    ctx.fillStyle = COL.bg; ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
    ctx.save();
    ctx.translate(FX, FY);
    ctx.beginPath(); ctx.rect(0, 0, VIEW_W, VIEW_H); ctx.clip();
    // space: the sector's sky, a planet drifting by, three layers of stars scrolling down
    ctx.fillStyle = sec.sky; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    const py = ((f * 0.05) % (VIEW_H + 160)) - 80, px = g.sec % 2 ? VIEW_W - 30 : 30;
    if (!sec.noPlanet) for (let r = 40; r > 0; r -= 1) { ctx.fillStyle = r > 34 ? sec.planet[2] : r > 20 ? sec.planet[1] : sec.planet[0]; ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.arc(px + (40 - r) * 0.3, py - (40 - r) * 0.3, r, 0, Math.PI * 2); ctx.fill(); if (r < 40) break; }
    ctx.globalAlpha = sec.noPlanet ? 0 : 0.5;
    for (let k = 0; k < 3; k++) { ctx.fillStyle = sec.planet[k]; ctx.beginPath(); ctx.arc(px - k * 6, py - k * 6, 36 - k * 12, 0, Math.PI * 2); ctx.fill(); }
    ctx.globalAlpha = 1;
    if (sec.bg) sec.bg(ctx, f, g);
    const rr = seeded(7 + g.sec);
    for (let k = 0; k < 70; k++) {
      const layer = k % 3, x = Math.floor(rr() * VIEW_W), y0 = rr() * VIEW_H, y = (y0 + f * (0.3 + layer * 0.5)) % VIEW_H;
      ctx.fillStyle = layer === 2 ? '#F8F8F8' : layer === 1 ? '#A8A8C8' : sec.dust;
      ctx.fillRect(x, Math.floor(y), 1, layer === 2 ? 2 : 1);
    }
    // pickups, enemies, the boss
    for (const u of g.pickups) {
      gxDrawPickup(ctx, u.k, u.x, u.y, u.t, u.w);
      // loot twinkles: a little gold star hops around it
      const tw = (u.t >> 3) & 3, sx = Math.round(u.x) + [-6, 5, 5, -6][tw], sy = Math.round(u.y) + [-6, -6, 5, 5][tw];
      if (((u.t >> 2) & 1) === 0) { ctx.fillStyle = '#F8D800'; ctx.fillRect(sx, sy - 2, 1, 5); ctx.fillRect(sx - 2, sy, 5, 1); ctx.fillStyle = '#F8F8F8'; ctx.fillRect(sx, sy, 1, 1); }
    }
    for (const e of g.list) {
      if (e.type.startsWith('rock')) { this.gxDrawRock(ctx, e); continue; }
      if (GX_RENDER[e.type]) { GX_RENDER[e.type].call(this, ctx, e, f); continue; }
      const T = GX_TYPES[e.type], img = GxGfx.get(e.type, (f >> 3) & 1, e.flash > 0 ? 'f' : 'n');
      if (e.v && e.v.fl) { ctx.save(); ctx.translate(Math.round(e.x), 0); ctx.scale(-1, 1); ctx.drawImage(img, -Math.round(T.w / 2), Math.round(e.y - T.h / 2)); ctx.restore(); }
      else ctx.drawImage(img, Math.round(e.x - T.w / 2), Math.round(e.y - T.h / 2));
    }
    if (g.boss) this.gxDrawBoss(ctx, g.boss);
    // your shots, beams, lightning
    for (const s of g.shots) {
      const x = Math.round(s.x), y = Math.round(s.y), pc = PALS[Config.playerPal(s.o)] || PALS.p1;
      if (s.k === 'p') { ctx.fillStyle = '#602880'; ctx.beginPath(); ctx.arc(x, y, s.r + 1, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = (f >> 1) & 1 ? '#F8B8F8' : '#C060E0'; ctx.beginPath(); ctx.arc(x, y, s.r, 0, Math.PI * 2); ctx.fill(); continue; }
      if (s.k === 'm') { ctx.fillStyle = '#F8F8F8'; ctx.fillRect(x - 1, y - 2, 2, 4); ctx.fillStyle = (f >> 1) & 1 ? '#F83800' : '#F8B800'; ctx.fillRect(x - 1, y + 2, 2, 2); continue; }
      ctx.fillStyle = s.k === 's' ? '#58D854' : s.k === 'd' ? '#BCBCBC' : pc[1]; ctx.fillRect(x - 1, y - 3, 2, 6);
      ctx.fillStyle = '#F8F8F8'; ctx.fillRect(x - 1, y - 3, 2, 2);
    }
    for (const bm of g.beams) {
      ctx.fillStyle = (f >> 1) & 1 ? '#3CBCFC' : '#58F8F8'; ctx.fillRect(Math.round(bm.x - bm.w / 2), 0, bm.w, bm.y);
      ctx.fillStyle = '#F8F8F8'; ctx.fillRect(Math.round(bm.x - 1), 0, 2, bm.y);
    }
    for (const z of g.zaps) {
      ctx.fillStyle = (z.t >> 1) & 1 ? '#F8F878' : '#F8F8F8';
      for (let k = 1; k < z.pts.length; k++) {
        const [x0, y0] = z.pts[k - 1], [x1, y1] = z.pts[k], n = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0) / 2));
        for (let i = 0; i <= n; i++) ctx.fillRect(Math.round(x0 + (x1 - x0) * i / n + (Math.random() - 0.5) * 3), Math.round(y0 + (y1 - y0) * i / n + (Math.random() - 0.5) * 3), 1, 1);
      }
    }
    // your ships, their drones
    for (const s of this.spawns) if (s.player && s.t <= SPARKLE_TIME) ctx.drawImage(Sprites.sparkle[[0, 1, 2, 3, 2, 1][Math.floor((SPARKLE_TIME - s.t) / 4) % 6]], s.x, s.y);
    for (const t of this.tanks) {
      if (!t.alive || !t.isPlayer) continue;
      // a thruster flame under the tank
      ctx.fillStyle = (f >> 1) & 1 ? '#F8B800' : '#F83800'; ctx.fillRect(t.x + 5, t.y + 16, 2, 2 + ((f >> 1) & 1)); ctx.fillRect(t.x + 9, t.y + 16, 2, 2 + ((f >> 2) & 1));
      this.drawTank(ctx, t);
      const nd = gxUp(t.player, 'drones');
      for (const sd of nd >= 2 ? [-1, 1] : nd ? [t.player.i % 2 ? 1 : -1] : []) {
        const dx = t.x + 8 + sd * 15, dy = t.y + 6 + Math.round(Math.sin(f / 10 + sd) * 2);
        ctx.fillStyle = '#100808'; ctx.fillRect(dx - 3, dy - 3, 6, 6); ctx.fillStyle = '#BCBCBC'; ctx.fillRect(dx - 2, dy - 2, 4, 4); ctx.fillStyle = '#58F8F8'; ctx.fillRect(dx - 1, dy - 1, 2, 1);
      }
    }
    // their shots: everything that hurts glows red, with a smoky trail behind it,
    // so it can't be mistaken for the coins and crates falling with it
    const hot = (f >> 1) & 1 ? '#F83800' : '#F878F8';
    for (const b of g.bullets) {
      const x = Math.round(b.x), y = Math.round(b.y), v = Math.hypot(b.vx || 0, b.vy || 0) || 1, ux = (b.vx || 0) / v, uy = (b.vy || 1) / v;
      // a soft red halo that breathes
      ctx.globalAlpha = 0.28 + 0.12 * Math.sin(f / 3); ctx.fillStyle = '#F80000';
      ctx.beginPath(); ctx.arc(x, y, b.k === 'shard' ? 5 : 6, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
      ctx.fillStyle = '#A81000';
      for (let k = 1; k <= 2; k++) ctx.fillRect(Math.round(x - ux * (3 + 3 * k)) - 1, Math.round(y - uy * (3 + 3 * k)) - 1, k === 1 ? 2 : 1, k === 1 ? 2 : 1);
      if (GX_BULLET_DRAW[b.k]) GX_BULLET_DRAW[b.k](ctx, x, y, f, hot, b);
      else if (b.k === 'egg') {
        // a rotten egg: dark outline, a red glow, a speckled shell
        ctx.fillStyle = hot; ctx.fillRect(x - 3, y - 2, 6, 6); ctx.fillRect(x - 2, y - 3, 4, 8);
        ctx.fillStyle = '#280000'; ctx.fillRect(x - 2, y - 2, 4, 5);
        ctx.fillStyle = '#E0D0A0'; ctx.fillRect(x - 1, y - 2, 2, 5); ctx.fillRect(x - 2, y - 1, 4, 3);
        ctx.fillStyle = '#58A800'; ctx.fillRect(x - 1, y, 1, 1); ctx.fillRect(x + 1, y + 1, 1, 1);
      } else if (b.k === 'shard') {
        ctx.fillStyle = hot; ctx.fillRect(x - 2, y - 4, 4, 8);
        ctx.fillStyle = '#A8E8F8'; ctx.fillRect(x - 1, y - 3, 2, 6); ctx.fillStyle = '#F8F8F8'; ctx.fillRect(x - 1, y - 3, 1, 2);
      } else {
        // a hot plasma ball: a ring that throbs between red and magenta, a white-hot core
        ctx.fillStyle = '#500000'; ctx.fillRect(x - 4, y - 2, 8, 4); ctx.fillRect(x - 2, y - 4, 4, 8); ctx.fillRect(x - 3, y - 3, 6, 6);
        ctx.fillStyle = hot; ctx.fillRect(x - 3, y - 2, 6, 4); ctx.fillRect(x - 2, y - 3, 4, 6);
        ctx.fillStyle = '#F8F8F8'; ctx.fillRect(x - 1, y - 1, 2, 2);
      }
    }
    for (const fx of this.fx) {
      if (fx.tick < 0) continue;
      const fr = fx.frames[Math.min(fx.frames.length - 1, Math.floor(fx.tick / fx.per))];
      ctx.drawImage(fr, Math.round(fx.x - fr.width / 2), Math.round(fx.y - fr.height / 2));
    }
    for (const p of this.popups) {
      if (p.t < p.delay) continue;
      if (p.label) { const half = p.text.length * 4; Font.drawCenter(ctx, p.text, Math.max(half, Math.min(FW - half, p.x)), Math.max(0, Math.round(p.y - 4 - p.t / 6)), p.color); continue; }
      const c = Sprites.mini(p.text); ctx.drawImage(c, Math.round(p.x - c.width / 2), Math.round(p.y - 3));
    }
    // the boss's health, across the top
    if (g.boss && g.boss.y > -g.boss.h / 2) {
      const def = GX_BOSSES[g.sec], w = VIEW_W - 16, fr = Math.max(0, g.boss.hp) / g.boss.max;
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(6, 2, w + 4, 13);
      Font.draw(ctx, def.name, 9, 3, '#F8F8F8');
      ctx.fillStyle = '#3C0000'; ctx.fillRect(8, 11, w, 3);
      ctx.fillStyle = g.boss.ph === 3 && (f >> 3) & 1 ? '#F8D800' : ['#F83800', '#F87830', '#F83800'][g.boss.ph - 1]; ctx.fillRect(8, 11, Math.round(w * fr), 3);
      ctx.fillStyle = '#100808'; for (const k of [1 / 3, 2 / 3]) ctx.fillRect(8 + Math.round(w * k), 11, 1, 3);
    }
    // banners
    if (g.banner && (!g.banner.warn || (g.banner.t >> 3) & 1)) {
      const y = VIEW_H / 2 - 20;
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, y - 3, VIEW_W, 14);
      Font.drawCenter(ctx, g.banner.text, VIEW_W / 2, y, g.banner.warn ? COL.red : COL.gold);
    }
    if (g.flash > 0) { ctx.fillStyle = 'rgba(248,248,248,' + (g.flash / 30).toFixed(2) + ')'; ctx.fillRect(0, 0, VIEW_W, VIEW_H); }
    if (this.over) {
      const y = Math.max(VIEW_H / 2 - 8, VIEW_H - this.overTimer * 1.3);
      Font.draw(ctx, 'GAME', VIEW_W / 2 - 15, y, COL.red); Font.draw(ctx, 'OVER', VIEW_W / 2 - 15, y + 9, COL.red);
    }
    this.renderRevival(ctx);
    ctx.restore();
    this.renderGalaxyHud(ctx);
  },

  gxDrawRock(ctx, e) {
    const T = GX_TYPES[e.type], r = T.w / 2, x = Math.round(e.x), y = Math.round(e.y), pal = GX_PALS.rock;
    ctx.fillStyle = pal[7]; ctx.beginPath(); ctx.arc(x, y, r + 1, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = e.flash > 0 ? '#F8F8F8' : pal[2]; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    if (e.flash > 0) return;
    ctx.fillStyle = pal[1]; ctx.beginPath(); ctx.arc(x - r / 3, y - r / 3, r / 2, 0, Math.PI * 2); ctx.fill();
    const a = this.frame / 30 + x;
    ctx.fillStyle = pal[3]; ctx.fillRect(Math.round(x + Math.cos(a) * r / 2) - 1, Math.round(y + Math.sin(a) * r / 2) - 1, 2, 2);
  },

  gxDrawBoss(ctx, b) {
    const def = GX_BOSSES[this.galaxy.sec], f = def.frame ? def.frame(b, this.frame) : def.eye ? (b.open ? 0 : 1) : (this.frame >> 3) & 1;
    if (def.drawUnder) def.drawUnder.call(this, ctx, b);
    // hit: it flickers white (every other frame, so it keeps its looks under constant fire)
    const v = b.flash > 0 && (this.frame >> 1) & 1 ? 'f' : b.stagger > 0 && (this.frame >> 2) & 1 ? 'r' : 'n', img = GxGfx.boss(b.key, f, v, b.ph);
    // its beams under it: the warning line, then the beam
    for (const bm of b.beams) {
      const on = bm.t >= bm.warn;
      if (!on && !((bm.t >> 2) & 1)) continue;
      ctx.fillStyle = on ? ((bm.t >> 1) & 1 ? (bm.kind === 'ice' ? '#A8E8F8' : '#F83800') : '#F8F8F8') : (bm.kind === 'ice' ? '#3CBCFC' : '#F83800');
      if (bm.kind === 'ice') ctx.fillRect(Math.round(bm.x) - (on ? 6 : 0), 0, on ? 12 : 1, VIEW_H);
      else if (bm.w) gxDrawColumn(ctx, bm, on, this.frame);
      else {
        if (bm.col) ctx.fillStyle = on ? ((bm.t >> 1) & 1 ? bm.col : '#F8F8F8') : bm.col;
        const dx = bm.tx - bm.x, dy = bm.ty - bm.y0, L = Math.hypot(dx, dy) || 1, n = Math.ceil(Math.max(VIEW_W, VIEW_H) * 1.5);
        for (let i = 0; i < n; i += on ? 1 : 3) { const px = bm.x + dx / L * i, py = bm.y0 + dy / L * i; if (py > VIEW_H || px < 0 || px > VIEW_W) break; ctx.fillRect(Math.round(px) - (on ? 2 : 0), Math.round(py), on ? 5 : 1, 1); }
      }
    }
    ctx.drawImage(img, Math.round(b.x - b.w / 2), Math.round(b.y));
    if (def.drawOver) def.drawOver.call(this, ctx, b);
    for (const o of b.orbs) {
      if (o.hp <= 0) continue;
      const [ox, oy] = this.gxOrbPos(b, o);
      ctx.fillStyle = '#100808'; ctx.beginPath(); ctx.arc(ox, oy, 6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = o.flash > 0 ? '#F8F8F8' : (this.frame >> 2) & 1 ? '#F8F878' : '#F8B800'; ctx.beginPath(); ctx.arc(ox, oy, 5, 0, Math.PI * 2); ctx.fill();
      if (o.flash > 0) o.flash--;
    }
    // what it says, in a box under it
    if (b.say) gxSpeech(ctx, b.say.text, b.x, b.y + b.h + 3);
  },

  // the side panel: per player, lives, the weapon and its power, bombs; the border above: sector and wave
  renderGalaxyHud(ctx) {
    const g = this.galaxy, H = HUD_X;
    this.renderSkillTag(ctx, H);
    const top = 'SECTOR ' + g.level + '  ' + (g.phase === 'boss' || g.phase === 'clear' ? 'BOSS' : 'WAVE ' + Math.max(1, g.wave) + '/' + GX_WAVES);
    Font.drawCenter(ctx, top, FX + VIEW_W / 2, 0, COL.black);
    this.players.forEach((p, i) => {
      const y = 20 + i * 34, gp = gxPlayer(p), W = GX_WEAPONS[gp.weapon];
      ctx.drawImage(Sprites.playerIcon(Config.playerPal(p.i)), H, y);
      Font.draw(ctx, Config.infiniteLives() ? '~' : String(Math.min(99, p.lives)), H + 8, y, p.out ? '#7C7C7C' : COL.black);
      // the weapon (its box) and its power (a big number), then the bombs
      gxDrawPickup(ctx, 'box', H + 6, y + 16, 0, gp.weapon);
      ctx.fillStyle = '#100808'; ctx.fillRect(H + 1, y + 11, 10, 10); Font.draw(ctx, W.letter, H + 3, y + 12, W.color);
      Font.draw(ctx, String(gp.power), H + 14, y + 12, gp.power >= GX_POWER_MAX ? '#F8D800' : COL.black);
      for (let k = 0; k < gp.bombs; k++) { ctx.fillStyle = '#7C7C7C'; ctx.fillRect(H + k * 5, y + 24, 3, 5); ctx.fillStyle = '#F83800'; ctx.fillRect(H + k * 5, y + 24, 3, 2); }
    });
  },
});

// ------------------------------------------------------------------ online: what a guest needs to draw it
Object.assign(Stage.prototype, {
  galaxyView() {
    const g = this.galaxy, r = n => Math.round(n * 10) / 10;
    return {
      lv: g.level, w: g.wave, ph: g.phase, bn: g.banner, fl: g.flash,
      l: g.list.map(e => [e.type, r(e.x), r(e.y), e.flash > 0 ? 1 : 0, e.v || 0, e.warnT || 0]),
      s: g.shots.map(s => [r(s.x), r(s.y), s.k, s.o, s.r || 0]),
      b: g.bullets.map(b => [r(b.x), r(b.y), b.k, r(b.vx || 0), r(b.vy || 0)]),
      u: g.pickups.map(u => [r(u.x), r(u.y), u.k, u.t, u.w]),
      bm: g.beams, z: g.zaps,
      bo: g.boss ? Object.assign({}, g.boss, { act: null }) : null,
    };
  },

  applyGalaxyView(v) {
    if (!this.galaxy || this.galaxy.level !== v.lv) this.setupGalaxy(v.lv);
    const g = this.galaxy;
    g.wave = v.w; g.phase = v.ph; g.banner = v.bn; g.flash = v.fl;
    g.list = v.l.map(a => ({ type: a[0], x: a[1], y: a[2], flash: a[3], v: a[4] || null, warnT: a[5] || 0 }));
    g.shots = v.s.map(a => ({ x: a[0], y: a[1], k: a[2], o: a[3], r: a[4] }));
    g.bullets = v.b.map(a => ({ x: a[0], y: a[1], k: a[2], vx: a[3] || 0, vy: a[4] || 0 }));
    g.pickups = v.u.map(a => ({ x: a[0], y: a[1], k: a[2], t: a[3], w: a[4] }));
    g.beams = v.bm; g.zaps = v.z; g.boss = v.bo;
  },
});

// ------------------------------------------------------------------ the hangar (the shop between sectors)
const GX_SHOP = [
  SHOP_ITEMS.find(i => i.id === 'revive'),
  SHOP_ITEMS.find(i => i.id === 'life'),
  { id: 'gx_power', gxShop: 'power', name: 'POWER +1', desc: 'YOUR WEAPON, ONE LEVEL UP', icon: 'cell' },
  { id: 'gx_bomb', gxShop: 'bomb', name: 'BOMB', desc: 'ONE MORE BOMB (UP TO 5)', icon: 'bomb' },
  ...Object.keys(GX_UPS).map(k => ({ id: 'gx_' + k, gxShop: 'up', up_: k, name: GX_UPS[k].name, desc: GX_UPS[k].desc, letter: GX_UPS[k].name[0] })),
  ...GX_WEAPON_KEYS.map(k => ({ id: 'gxw_' + k, gxShop: 'weapon', weapon_: k, name: GX_WEAPONS[k].name, desc: 'SWITCH TO IT, KEEPING YOUR POWER', icon: 'box' })),
  SHOP_ITEMS.find(i => i.id === 'done'),
];
const shopItems = () => (Game.mode === 'galaxy' ? GX_SHOP : SHOP_ITEMS);

function gxShopPrice(item, p) {
  const gp = gxPlayer(p), disc = Game.shopDiscount ? 0.75 : 1;
  let price = 0;
  if (item.gxShop === 'power') price = 1500 + 1000 * gp.power;
  else if (item.gxShop === 'bomb') price = 1500;
  else if (item.gxShop === 'weapon') price = 2500;
  else { const U = GX_UPS[item.up_]; price = U.prices[Math.min(U.prices.length - 1, gxUp(p, item.up_))]; }
  return Math.round((price * Config.scale('shopPrices') * disc) / 100) * 100;
}

function gxShopStatus(item, p) {
  const gp = gxPlayer(p);
  if (p.out) return { text: '', max: true };
  if (item.gxShop === 'power') return { text: gp.power + '/' + GX_POWER_MAX, max: gp.power >= GX_POWER_MAX };
  if (item.gxShop === 'bomb') return { text: 'X' + gp.bombs, max: gp.bombs >= 5 };
  if (item.gxShop === 'weapon') return gp.weapon === item.weapon_ ? { text: 'IN HAND', max: true } : { text: '' };
  const lv = gxUp(p, item.up_), top = GX_UPS[item.up_].prices.length;
  return { text: lv >= top ? 'MAX' : 'L' + lv + '/' + top, max: lv >= top };
}

function gxShopApply(item, p) {
  const gp = gxPlayer(p);
  if (item.gxShop === 'power') gp.power++;
  else if (item.gxShop === 'bomb') gp.bombs++;
  else if (item.gxShop === 'weapon') gp.weapon = item.weapon_;
  else gp.up[item.up_] = gxUp(p, item.up_) + 1;
}

function gxShopIcon(ctx, item, x, y) {
  if (item.icon === 'box') { gxDrawPickup(ctx, 'box', x + 8, y + 8, 0, item.weapon_); return; }
  if (item.icon) { gxDrawPickup(ctx, item.icon, x + 8, y + 8, 0); return; }
  ctx.fillStyle = '#7C7C7C'; ctx.fillRect(x + 1, y + 1, 14, 14); ctx.fillStyle = '#202020'; ctx.fillRect(x + 2, y + 2, 12, 12);
  Font.draw(ctx, item.letter, x + 5, y + 5, '#58F8F8');
}

// ------------------------------------------------------------------ its music
SONGS.galaxy = { name: 'STARFIGHTER', root: 64, bpm: 150, groove: 'starfield', prog: [0, 5, 3, 4],
  mel: '0.4.7.4.0.4.7.9.' + '7-5-4-2-0---z---' + '3.5.7.5.3.5.7.A.' + '9-7-5-4-2-------' };
SONGS.galaxyBoss = { name: 'ALIEN OVERLORD', root: 57, bpm: 140, groove: 'stomp', prog: [0, 1, 0, 6],
  mel: '0-0-7-0-6-0-5-4-' + '0-0-7-0-8-7-6-5-' + '4-4-3-4-5-4-3-1-' + '0---z---y---0---' };
GROOVES.starfield = { drums: 'k.h.s.hhk.hks.h.', bass: 'r.o.r.o.f.o.f.o.' };

// ------------------------------------------------------------------ its title picture (intro.js)
INTRO_SCENES.galaxy = function (c, t) {
  Pix.rect(c, 0, 0, INTRO_W, INTRO_H, '#000010');
  const r = seeded(99);
  for (let k = 0; k < 40; k++) { const x = Math.floor(r() * INTRO_W), y = (Math.floor(r() * INTRO_H) + (t >> (k % 2 ? 1 : 2))) % INTRO_H; Pix.rect(c, x, y, 1, 1, k % 3 ? '#7C7C9C' : '#F8F8F8'); }
  Pix.disc(c, 96, 12, 9, '#C83C14'); Pix.disc(c, 93, 9, 5, '#F87858');
  // a formation of aliens, swaying; one dives
  const sw = Math.round(Math.sin(t / 30) * 4);
  for (let row = 0; row < 3; row++) for (let col = 0; col < 6; col++) {
    const type = row === 0 ? 'brute' : row === 1 ? 'bug' : 'drone', img = GxGfx.get(type, (t >> 3) & 1);
    if (row === 2 && col === 4 && (t % 160) > 60) continue;
    c.drawImage(img, 14 + col * 14 + sw - (img.width >> 1) + 6, 4 + row * 12);
  }
  const dv = t % 160;
  if (dv > 60) c.drawImage(GxGfx.get('drone', (t >> 3) & 1), 70 + Math.round(Math.sin(dv / 8) * 10), 28 + (dv - 60) * 0.5);
  // your tank below, firing up, a laser beside
  const tx = 48 + Math.round(Math.sin(t / 40) * 20);
  c.drawImage(Sprites.tank('p0', (t >> 2) & 1, 0, Config.playerPal(0)), tx, 46);
  Pix.rect(c, tx + 5, 62, 2, 2, (t >> 1) & 1 ? '#F8B800' : '#F83800'); Pix.rect(c, tx + 9, 62, 2, 2, (t >> 1) & 1 ? '#F83800' : '#F8B800');
  for (let k = 0; k < 3; k++) { const y = 44 - ((t * 4 + k * 14) % 44); Pix.rect(c, tx + 7, y, 2, 4, '#F8F8F8'); }
  gxDrawPickup(c, 'box', 20, 40 + ((t >> 2) % 10), t, 'spread');
};
