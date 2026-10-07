'use strict';
// =====================================================================
//  Stage: terrain, tanks, bullets, power-ups, AI and rendering of play
// =====================================================================

const FX = 16, FY = 8, FS = 208, GN = 52;          // field offset/size, terrain grid (4px cells)
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

const PU = { HELMET: 0, CLOCK: 1, SHOVEL: 2, STAR: 3, GRENADE: 4, TANK: 5, GUN: 6, SHIP: 7 };
const PU_WEIGHTS = [2, 2, 2, 3, 2, 1, 1, 1];
const BASE_X = 96, BASE_Y = 192;
const ENEMY_SPAWN_X = [96, 192, 0];
const PLAYER_SPAWN = [[64, 192], [128, 192]];
const BASE_WALL = [[11, 23], [12, 23], [13, 23], [14, 23], [11, 24], [14, 24], [11, 25], [14, 25]];
const BONUS_SLOTS = [3, 10, 17];   // 4th, 11th and 18th enemy carry a power-up
const SPARKLE_TIME = 60;
const BIG_EXPLOSION = () => [Sprites.smallExp[0], Sprites.smallExp[1], Sprites.smallExp[2], Sprites.bigExp[0], Sprites.bigExp[1]];

const Settings = { enemyPickup: true };

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
  return list.map((type, i) => ({ type, bonus: BONUS_SLOTS.includes(i) }));
}

class Tank {
  constructor(o) {
    this.x = 0; this.y = 0; this.dir = 0; this.acc = 0; this.animTick = 0; this.anim = 0;
    this.shield = 0; this.frozen = 0; this.bullets = 0; this.cool = 0; this.slide = 0;
    this.moving = false; this.alive = true; this.ship = false; this.cutter = false; this.power = false;
    this.blocked = 0; this.isPlayer = false; this.player = null; this.type = 0; this.hp = 1; this.bonus = false;
    this.speed = 0.75; this.bulletSpeed = 2.5; this.maxBullets = 1;
    Object.assign(this, o);
  }
  applyLevel() {
    const p = this.player, lv = p.level;
    this.speed = 0.75;
    this.bulletSpeed = lv >= 1 ? 4.5 : 2.5;
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
    this.terrain = new Uint8Array(GN * GN);
    this.load(mapToBlocks(map), !opts.custom);
    this.tanks = [];
    this.bullets = [];
    this.fx = [];
    this.popups = [];
    this.spawns = [];
    this.powerup = null;
    this.queue = buildQueue(num);
    this.total = this.queue.length;
    this.killed = 0;
    this.spawnTimer = 0;
    this.spawnPos = 0;
    this.spawnInterval = Math.max(70, 190 - ((num - 1) % 35) * 4 - (this.twoP ? 20 : 0));
    this.maxEnemies = this.twoP ? 6 : 4;
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
      if (!p.out) this.spawnPlayer(p, 0);
    }
  }

  // ------------------------------------------------------------ terrain
  load(blocks, forceBase) {
    for (let by = 0; by < 26; by++) {
      for (let bx = 0; bx < 26; bx++) {
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
    [0, 12, 24].forEach(bx => clearSolid(bx, 0));
    clearSolid(8, 24); clearSolid(16, 24);
    // the eagle and its fortress
    for (let y = 24; y < 26; y++) for (let x = 12; x < 14; x++) this.setBlock(x, y, T_EMPTY);
    if (forceBase) this.setBaseWalls(T_BRICK);
  }
  get(cx, cy) {
    if (cx < 0 || cy < 0 || cx >= GN || cy >= GN) return -1;
    return this.terrain[cy * GN + cx];
  }
  set(cx, cy, t) {
    if (cx < 0 || cy < 0 || cx >= GN || cy >= GN) return;
    this.terrain[cy * GN + cx] = t;
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
    const item = this.queue.shift();
    const x = ENEMY_SPAWN_X[this.spawnPos++ % 3];
    this.spawns.push({ x, y: 0, t: SPARKLE_TIME, enemy: item });
    if (item.bonus) this.powerup = null;
    this.spawnTimer = this.spawnInterval;
  }

  updateSpawns() {
    for (const s of this.spawns) {
      s.t--;
      if (s.t > 0) continue;
      if (s.enemy) {
        if (this.tanks.some(t => overlap(t.x, t.y, 16, 16, s.x, s.y, 16, 16))) { s.t = 1; continue; }
        const st = ENEMY[s.enemy.type];
        this.tanks.push(new Tank({
          x: s.x, y: s.y, dir: 2, type: s.enemy.type, hp: st.hp, bonus: s.enemy.bonus,
          speed: st.speed, bulletSpeed: st.bullet, maxBullets: 1,
        }));
      } else {
        const p = s.player;
        const t = new Tank({ x: s.x, y: s.y, dir: 0, isPlayer: true, player: p, shield: 180 });
        t.applyLevel();
        p.tank = t;
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
      if (t.isPlayer) this.updatePlayer(t); else this.updateEnemy(t);
    }
    this.updateBullets();
    this.tanks = this.tanks.filter(t => t.alive);
    this.checkPickups();
    if (this.powerup) this.powerup.t++;
    for (const f of this.fx) f.tick++;
    this.fx = this.fx.filter(f => f.tick < f.frames.length * f.per);
    for (const p of this.popups) p.t++;
    this.popups = this.popups.filter(p => p.t < p.delay + 48);

    // engine hum
    const pt = this.tanks.filter(t => t.isPlayer);
    Sound.setEngine(pt.length === 0 ? 0 : (pt.some(t => t.moving || t.slide > 0) ? 2 : 1));

    // stage end
    if (this.over) {
      this.overTimer++;
      if (this.overTimer >= 320) this.result = 'gameover';
    } else if (this.queue.length === 0 && !this.spawns.some(s => s.enemy) && !this.tanks.some(t => !t.isPlayer)) {
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
    if (inp.firePressed || (inp.fire && t.cool === 0)) {
      if (this.fire(t)) t.cool = 14;
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
    if (t.bullets === 0 && t.cool === 0) {
      let chance = ok ? 0.022 : 0.07;
      if (this.targetInSight(t)) chance = 0.15;
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
    const pBase = Math.min(0.5, 0.25 + this.num * 0.008);
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
    t.acc += t.speed;
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
    if (nx < 0 || ny < 0 || nx > FS - 16 || ny > FS - 16) return false;
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
        if (tt === T_BRICK || tt === T_STEEL) return false;
        if (tt === T_WATER && !t.ship) return false;
      }
    }
    if (overlap(nx, ny, 16, 16, BASE_X, BASE_Y, 16, 16)) return false;
    for (const o of this.tanks) {
      if (o === t || !o.alive) continue;
      if (overlap(nx, ny, 16, 16, o.x, o.y, 16, 16) && !overlap(t.x, t.y, 16, 16, o.x, o.y, 16, 16)) return false;
    }
    return true;
  }

  fire(t) {
    if (t.bullets >= t.maxBullets) return false;
    const pos = [[t.x + 6, t.y], [t.x + 12, t.y + 6], [t.x + 6, t.y + 12], [t.x, t.y + 6]][t.dir];
    this.bullets.push({
      x: pos[0], y: pos[1], dir: t.dir, speed: t.bulletSpeed, owner: t,
      isPlayer: t.isPlayer, power: t.power, cutter: t.cutter, alive: true,
    });
    t.bullets++;
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
          if (overlap(a.x, a.y, 4, 4, c.x, c.y, 4, 4)) { this.killBullet(a, false); this.killBullet(c, false); break; }
        }
      }
    }
    this.bullets = bs.filter(b => b.alive);
  }

  killBullet(b, fx) {
    if (!b.alive) return;
    b.alive = false;
    b.owner.bullets = Math.max(0, b.owner.bullets - 1);
    if (fx) this.addFx(b.x + 2, b.y + 2, Sprites.smallExp, 3);
  }

  stepBullet(b, dist) {
    b.x += DXY[b.dir][0] * dist;
    b.y += DXY[b.dir][1] * dist;
    if (b.x < 0 || b.y < 0 || b.x > FS - 4 || b.y > FS - 4) {
      b.x = Math.max(0, Math.min(FS - 4, b.x));
      b.y = Math.max(0, Math.min(FS - 4, b.y));
      this.killBullet(b, true);
      if (b.isPlayer) Sound.play('steel');
      return;
    }
    if (this.bulletTerrain(b)) return;
    if (overlap(b.x, b.y, 4, 4, BASE_X, BASE_Y, 16, 16)) {
      this.killBullet(b, true);
      if (this.baseAlive) this.destroyBase();
      return;
    }
    for (const t of this.tanks) {
      if (!t.alive || t === b.owner) continue;
      if (!overlap(b.x, b.y, 4, 4, t.x, t.y, 16, 16)) continue;
      if (b.isPlayer) {
        if (t.isPlayer) {
          // friendly fire freezes the other player for a few seconds
          this.killBullet(b, false);
          if (t.shield <= 0) t.frozen = 180;
          return;
        }
        this.killBullet(b, true);
        this.hitEnemy(t, b.owner);
        return;
      }
      if (!t.isPlayer) continue;
      this.killBullet(b, true);
      this.hitPlayer(t);
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
      return;
    }
    t.alive = false;
    this.addFx(t.x + 8, t.y + 8, BIG_EXPLOSION(), 5);
    Sound.play('playerDie');
    p.level = 0;
    p.cutter = false;
    p.tank = null;
    if (p.lives > 0) {
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
    if (!p.extraGiven && p.score >= 20000) {
      p.extraGiven = true;
      p.lives++;
      Sound.play('life');
    }
  }

  addFx(x, y, frames, per) {
    this.fx.push({ x, y, frames, per, tick: 0 });
  }

  // ------------------------------------------------------------ power-ups
  spawnPowerup() {
    let total = PU_WEIGHTS.reduce((a, b) => a + b, 0), r = rnd(total), type = 0;
    while (r >= PU_WEIGHTS[type]) { r -= PU_WEIGHTS[type]; type++; }
    let x = 0, y = 0;
    for (let tries = 0; tries < 60; tries++) {
      x = rnd(25) * 8; y = rnd(25) * 8;
      if (overlap(x, y, 16, 16, 80, 176, 48, 32)) continue;
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
    const order = this.tanks.filter(t => t.isPlayer).concat(Settings.enemyPickup ? this.tanks.filter(t => !t.isPlayer) : []);
    for (const t of order) {
      if (t.alive && overlap(t.x, t.y, 16, 16, pu.x + 2, pu.y + 2, 12, 12)) {
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
      this.popups.push({ x: pu.x + 8, y: pu.y + 8, text: '500', t: 0, delay: 0 });
      switch (pu.type) {
        case PU.HELMET: t.shield = 600; break;
        case PU.CLOCK: this.freezeE = 600; snd = 'freeze'; break;
        case PU.SHOVEL: this.shovel = 1200; this.setBaseWalls(T_STEEL); break;
        case PU.STAR:
          if (p.level < 3) p.level++; else p.cutter = true;
          t.applyLevel();
          break;
        case PU.GRENADE:
          enemies.forEach(e => this.killEnemy(e, null, false, true));
          if (enemies.length) Sound.play('explode');
          break;
        case PU.TANK: p.lives++; snd = 'life'; break;
        case PU.GUN: p.level = 3; p.cutter = true; t.applyLevel(); break;
        case PU.SHIP: p.ship = true; t.ship = true; break;
      }
      Sound.play(snd);
    } else {
      // Tank 1990 rule: enemies can grab bonuses too
      Sound.play('enemyPickup');
      switch (pu.type) {
        case PU.HELMET: enemies.forEach(e => { e.shield = 600; }); break;
        case PU.CLOCK: this.freezeP = 600; break;
        case PU.SHOVEL: this.shovel = 0; this.setBaseWalls(T_EMPTY); break;
        case PU.STAR: enemies.forEach(e => { e.hp = Math.min(4, e.hp + 1); e.bulletSpeed = 4.5; }); break;
        case PU.GRENADE: this.tanks.filter(o => o.isPlayer).forEach(o => this.hitPlayer(o)); break;
        case PU.TANK: t.hp = Math.max(t.hp, 4); break;
        case PU.GUN: t.power = true; t.bulletSpeed = 4.5; break;
        case PU.SHIP: t.ship = true; break;
      }
    }
  }

  // ------------------------------------------------------------ rendering
  buildLayers() {
    if (!this.bgLayer) {
      this.bgLayer = makeCanvas(FS, FS);
      this.forestLayer = makeCanvas(FS, FS);
    }
    const bg = this.bgLayer.getContext('2d'), fo = this.forestLayer.getContext('2d'), tex = Sprites.tex;
    bg.clearRect(0, 0, FS, FS);
    fo.clearRect(0, 0, FS, FS);
    this.waterCells = [];
    for (let cy = 0; cy < GN; cy++) {
      for (let cx = 0; cx < GN; cx++) {
        const t = this.terrain[cy * GN + cx];
        if (!t) continue;
        const sx = (cx & 1) * 4, sy = (cy & 1) * 4, dx = cx * 4, dy = cy * 4;
        if (t === T_BRICK) bg.drawImage(tex.brick, sx, sy, 4, 4, dx, dy, 4, 4);
        else if (t === T_STEEL) bg.drawImage(tex.steel, sx, sy, 4, 4, dx, dy, 4, 4);
        else if (t === T_ICE) bg.drawImage(tex.ice, sx, sy, 4, 4, dx, dy, 4, 4);
        else if (t === T_FOREST) fo.drawImage(tex.forest, sx, sy, 4, 4, dx, dy, 4, 4);
        else if (t === T_WATER) this.waterCells.push(cy * GN + cx);
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
      pal = t.player.i === 0 ? 'p1' : 'p2';
    } else {
      spec = 'e' + t.type;
      if (t.bonus && ((this.frame >> 3) & 1)) pal = 'red';
      // armor tanks start green and fade to silver as they take hits
      else if (t.hp >= 4) pal = 'green';
      else if (t.hp === 3) pal = 'gold';
      else if (t.hp === 2) pal = (this.frame >> 2) & 1 ? 'gold' : 'silver';
      else pal = 'silver';
    }
    ctx.drawImage(Sprites.tank(spec, t.anim, t.dir, pal), t.x, t.y);
    if (t.shield > 0) ctx.drawImage(Sprites.shield[(this.frame >> 1) & 1], t.x, t.y);
  }

  render(ctx) {
    ctx.fillStyle = COL.bg;
    ctx.fillRect(0, 0, 256, 224);
    ctx.fillStyle = COL.black;
    ctx.fillRect(FX, FY, FS, FS);
    if (this.dirty) this.buildLayers();

    ctx.save();
    ctx.translate(FX, FY);
    ctx.beginPath();
    ctx.rect(0, 0, FS, FS);
    ctx.clip();

    ctx.drawImage(this.bgLayer, 0, 0);
    const wt = Sprites.tex[(this.frame >> 5) & 1 ? 'water1' : 'water0'];
    for (const i of this.waterCells) {
      const cx = i % GN, cy = (i / GN) | 0;
      ctx.drawImage(wt, (cx & 1) * 4, (cy & 1) * 4, 4, 4, cx * 4, cy * 4, 4, 4);
    }
    ctx.drawImage(this.baseAlive ? Sprites.eagle : Sprites.eagleDead, BASE_X, BASE_Y);

    for (const t of this.tanks) this.drawTank(ctx, t);
    for (const s of this.spawns) {
      if (s.t > SPARKLE_TIME) continue;
      const k = Math.floor((SPARKLE_TIME - s.t) / 4) % 6;
      ctx.drawImage(Sprites.sparkle[[0, 1, 2, 3, 2, 1][k]], s.x, s.y);
    }
    for (const b of this.bullets) ctx.drawImage(Sprites.bullet[b.dir], Math.round(b.x), Math.round(b.y));

    ctx.drawImage(this.forestLayer, 0, 0);

    if (this.powerup && ((this.powerup.t >> 3) & 1) === 0) {
      ctx.drawImage(Sprites.powerups[this.powerup.type], this.powerup.x, this.powerup.y);
    }
    for (const f of this.fx) {
      const fr = f.frames[Math.min(f.frames.length - 1, Math.floor(f.tick / f.per))];
      ctx.drawImage(fr, Math.round(f.x - fr.width / 2), Math.round(f.y - fr.height / 2));
    }
    for (const p of this.popups) {
      if (p.t < p.delay) continue;
      const c = Sprites.mini(p.text);
      ctx.drawImage(c, Math.round(p.x - c.width / 2), Math.round(p.y - 3));
    }
    if (this.over) {
      const y = Math.max(96, FS - this.overTimer * 1.3);
      Font.draw(ctx, 'GAME', 89, y, COL.red);
      Font.draw(ctx, 'OVER', 89, y + 9, COL.red);
    }
    ctx.restore();
    this.renderHud(ctx);
  }

  renderHud(ctx) {
    const n = this.queue.length;
    for (let i = 0; i < n; i++) ctx.drawImage(Sprites.enemyIcon, 232 + (i % 2) * 8, 24 + (i >> 1) * 8);
    Font.draw(ctx, 'IP', 232, 136, COL.black);
    ctx.drawImage(Sprites.lifeIcon, 232, 144);
    Font.draw(ctx, String(Math.min(99, this.players[0].lives)), 240, 144, COL.black);
    if (this.players[1]) {
      Font.draw(ctx, 'IIP', 232, 160, COL.black);
      ctx.drawImage(Sprites.lifeIcon, 232, 168);
      Font.draw(ctx, String(Math.min(99, this.players[1].lives)), 240, 168, COL.black);
    }
    ctx.drawImage(Sprites.flag, 232, 184);
    Font.drawRight(ctx, String(this.num), 248, 200, COL.black);
  }
}
