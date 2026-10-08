'use strict';
// =====================================================================
//  Base upgrades: bought in the shop between stages, shared by the whole team and kept from stage to stage
//  until the game is over (and in saves). Most have 5 levels.
//    WALLS    extra brick ring · steel inner corners · steel inner ring · steel outer corners · all-steel fortress
//    ARMOR    the eagle survives 1-5 hits per stage
//    REPAIR   a crew rebuilds one fortress block every 10 / 7 / 5 / 3 / 2 seconds
//    GUN      the eagle shoots enemies lined up with it; faster and further each level, steel-breaking shells at 4,
//             exploding shells at 5
//    FIELD    2-10 armed mines in front of the fortress at the start of every stage
//    TESLA    zaps every enemy within 2-4 tiles of the eagle, every 3 s down to every second
//    TRAPS    tank traps: enemies near the eagle crawl (30%-70% slower, over 2.5-4.5 tiles)
//    SUPPLY   a power-up is dropped by the fortress every 60 s down to every 20 s
//    RADAR    1 stealth tanks always show · 2 see which tank is about to appear at each entry point
//             3 spotters can't mark you
// =====================================================================

const BASE_UPGRADES = [
  { key: 'walls', name: 'BASE WALLS', prices: [4000, 7000, 10000, 14000, 18000],
    descs: ['EXTRA BRICK RING', 'STEEL INNER CORNERS', 'STEEL INNER RING', 'STEEL OUTER CORNERS', 'ALL-STEEL FORTRESS'] },
  { key: 'armor', name: 'EAGLE ARMOR', prices: [3000, 5000, 8000, 11000, 15000],
    descs: [1, 2, 3, 4, 5].map(n => 'EAGLE SURVIVES ' + n + (n > 1 ? ' HITS' : ' HIT')) },
  { key: 'repair', name: 'REPAIR CREW', prices: [2500, 4000, 6000, 8000, 10000],
    descs: [10, 7, 5, 3, 2].map(n => 'REBUILDS WALLS EVERY ' + n + ' S') },
  { key: 'gun', name: 'EAGLE GUN', prices: [5000, 7000, 9000, 12000, 16000],
    descs: ['SHOOTS TANKS IN LINE', 'FASTER, LONGER RANGE', 'FASTER STILL', 'SHELLS BREAK STEEL', 'EXPLODING SHELLS'] },
  { key: 'field', name: 'MINEFIELD', prices: [2000, 3000, 4000, 5000, 6000],
    descs: [2, 4, 6, 8, 10].map(n => n + ' MINES BEFORE THE EAGLE') },
  { key: 'tesla', name: 'TESLA COIL', prices: [6000, 8000, 10000, 13000, 16000],
    descs: ['ZAP 2 TILES, EVERY 3 S', 'ZAP 2.5 TILES, EVERY 2.5 S', 'ZAP 3 TILES, EVERY 2 S', 'ZAP 3.5 TILES, EVERY 1.5 S', 'ZAP 4 TILES, EVERY 1 S'] },
  { key: 'traps', name: 'TANK TRAPS', prices: [2500, 4000, 5500, 7000, 9000],
    descs: [30, 40, 50, 60, 70].map(n => 'ENEMIES ' + n + '% SLOWER NEAR') },
  { key: 'supply', name: 'SUPPLY DROP', prices: [4000, 6000, 8000, 10000, 12000],
    descs: [60, 45, 35, 25, 20].map(n => 'POWER-UP EVERY ' + n + ' S') },
  { key: 'radar', name: 'RADAR', prices: [3000, 5000, 7000],
    descs: ['STEALTH TANKS SHOW', 'SEE WHO SPAWNS WHERE', 'SPOTTERS CAN\'T MARK YOU'] },
];
const newBase = () => Object.fromEntries(BASE_UPGRADES.map(u => [u.key, 0]));
const REPAIR_EVERY = [0, 600, 420, 300, 180, 120];
const GUN_EVERY = [0, 110, 80, 60, 45, 35], GUN_RANGE = [0, 96, 128, 160, 192, 240];
const TESLA_EVERY = [0, 180, 150, 120, 90, 60], TESLA_RANGE = [0, 32, 40, 48, 56, 64];
const TRAP_SLOW = [1, 0.7, 0.6, 0.5, 0.4, 0.3], TRAP_RANGE = [0, 40, 48, 56, 64, 72];
const SUPPLY_EVERY = [0, 3600, 2700, 2100, 1500, 1200];
const EAGLE_GUN = { isPlayer: false, bullets: 0, eagle: true };   // owner of the eagle's shells and zaps (no points)

Object.assign(Stage.prototype, {
  // at stage start (before the stage's terrain is remembered for masons)
  applyBase(base) {
    this.base = Object.assign(newBase(), base || {});
    this.base.repair = Math.max(this.base.repair, Config.skill().repair || 0);   // easy skills: a free repair crew
    this.eagleArmor = this.base.armor + Config.skill().eagle;   // easy skills: free eagle armour
    this.eagleInv = 0;
    this.eagleFlash = 0;
    this.repairT = 0;
    this.gunT = 60;
    this.gunDir = 0;
    this.teslaT = 60;
    this.zaps = [];
    this.supplyT = Math.min(1200, SUPPLY_EVERY[this.base.supply] || 0);   // the first drop comes sooner
    if (this.base.walls >= 1) for (const [x, y] of this.outerRing()) this.setBlock(x, y, this.outerWallType(x, y));
    if (this.base.walls >= 2) this.setBaseWalls(T_BRICK);
    this.placeMinefield(this.base.field * 2);
  },

  // the extra ring of blocks around the classic fortress (whichever edge the eagle is on)
  outerRing() { return baseRing(2); },

  // the outer ring: brick, steel corners at level 4, all steel at level 5
  outerWallType(x, y) {
    const w = this.base ? this.base.walls : 0, [u, v] = baseRel(x, y);
    if (w >= 5) return T_STEEL;
    if (w >= 4 && v === -2 && (u === -2 || u === 3)) return T_STEEL;
    return T_BRICK;
  },

  // what a fortress block is made of with the WALLS upgrade (i = index in BASE_WALL)
  baseWallType(i) {
    const w = this.base ? this.base.walls : 0;
    if (w >= 3) return T_STEEL;
    if (w >= 2) {
      const [u, v] = baseRel(...BASE_WALL[i]);
      if ((u === -1 || u === 2) && (v === -1 || v === 1)) return T_STEEL;
    }
    return T_BRICK;
  },

  // a point in front of the eagle: `ahead` px into the field, `side` px across (from the eagle's centre)
  baseAhead(ahead, side) {
    const [fx, fy] = DXY[BASE_FWD];
    return [BASE_X + 8 + fx * ahead - fy * side, BASE_Y + 8 + fy * ahead + fx * side];
  },

  placeMinefield(n) {
    const spots = [];
    for (const dy of [48, 72, 96]) for (const dx of [0, -24, 24, -48, 48, -72, 72]) spots.push(this.baseAhead(dy, dx));
    for (const [x, y] of spots) {
      if (n <= 0) break;
      if (x < 8 || x > FW - 8 || y < 8 || y > FH - 8) continue;
      // any ground a tank can drive on: open, trees, ice, mud, bridges, belts
      const t = this.get(x >> 2, y >> 2);
      if (t === T_BRICK || t === T_STEEL || t === T_WATER || t < 0) continue;
      if (PLAYER_SPAWN.some(([sx, sy]) => overlap(x - 4, y - 4, 8, 8, sx, sy, 16, 16))) continue;
      this.mines.push({ x, y, byPlayer: true, owner: null, t: MINE_ARM_TIME });
      n--;
    }
  },

  // every frame
  updateBase() {
    if (!this.base || !this.baseAlive || this.over) return;
    if (this.eagleInv > 0) this.eagleInv--;
    if (this.eagleFlash > 0) this.eagleFlash--;
    const r = this.base.repair;
    if (r && this.shovel <= 0 && ++this.repairT >= REPAIR_EVERY[r]) { this.repairT = 0; this.repairFortress(); }
    const g = this.base.gun;
    if (g && this.freezeP <= 0 && --this.gunT <= 0) this.eagleShoot(g);
    const z = this.base.tesla;
    if (z && --this.teslaT <= 0) this.teslaZap(z);
    for (const zp of this.zaps) zp.t--;
    this.zaps = this.zaps.filter(zp => zp.t > 0);
    const sp = this.base.supply;
    if (sp && !this.powerup && --this.supplyT <= 0) { this.supplyT = SUPPLY_EVERY[sp]; this.supplyDrop(); }
  },

  // the tesla coil: lightning to every enemy close to the eagle
  teslaZap(z) {
    this.teslaT = 20;
    const ex = BASE_X + 8, ey = BASE_Y + 8;
    const hit = this.tanks.filter(t => t.alive && !t.isPlayer && Math.hypot(t.x + 8 - ex, t.y + 8 - ey) < TESLA_RANGE[z] + 8);
    if (!hit.length) return;
    for (const t of hit) {
      this.zaps.push({ x: t.x + 8, y: t.y + 8, t: 10 });
      this.hitEnemy(t, EAGLE_GUN, true);
    }
    this.teslaT = TESLA_EVERY[z];
    Sound.play('zap');
  },

  // tank traps: how fast an enemy may move here
  trapFactor(t) {
    const lv = this.base ? this.base.traps : 0;
    if (!lv || t.isPlayer) return 1;
    return Math.hypot(t.x + 8 - BASE_X - 8, t.y + 8 - BASE_Y - 8) < TRAP_RANGE[lv] ? TRAP_SLOW[lv] : 1;
  },

  // supply drop: a power-up lands on a free spot just in front of the fortress
  supplyDrop() {
    this.spawnPowerup();
    if (!this.powerup) return;
    for (const dy of [40, 56, 32, 72]) for (const dx of [0, -24, 24, -48, 48]) {
      const [cx, cy] = this.baseAhead(dy, dx), x = cx - 8, y = cy - 8;
      if (x < 0 || y < 0 || x > FW - 16 || y > FH - 16) continue;
      let bad = false;
      for (let cy = y >> 2; cy < (y + 16) >> 2; cy++) for (let cx = x >> 2; cx < (x + 16) >> 2; cx++) {
        const v = this.get(cx, cy);
        if (v === T_STEEL || v === T_WATER || v === T_BRICK) bad = true;
      }
      if (bad) continue;
      this.powerup.x = x; this.powerup.y = y;
      this.popups.push({ x: x + 8, y, text: 'SUPPLY!', label: true, color: COL.gold, t: 0, delay: 0 });
      return;
    }
  },

  // put back one missing block of the fortress
  repairFortress() {
    const want = BASE_WALL.map((b, i) => [b[0], b[1], this.baseWallType(i)]);
    if (this.base.walls >= 1) for (const [x, y] of this.outerRing()) want.push([x, y, this.outerWallType(x, y)]);
    for (const [x, y, type] of want) {
      let missing = false;
      for (let k = 0; k < 4; k++) if (this.get(x * 2 + (k & 1), y * 2 + (k >> 1)) === T_EMPTY) missing = true;
      if (!missing || this.tanks.some(o => o.alive && overlap(o.x, o.y, 16, 16, x * 8, y * 8, 8, 8))) continue;
      for (let k = 0; k < 4; k++) {
        const cx = x * 2 + (k & 1), cy = y * 2 + (k >> 1);
        if (this.get(cx, cy) === T_EMPTY) this.set(cx, cy, type);
      }
      this.addFx(x * 8 + 4, y * 8 + 4, [Sprites.sparkle[0], Sprites.sparkle[1]], 4);
      Sound.play('build');
      return;
    }
  },

  // the eagle fires at the nearest enemy lined up with it (up, left or right)
  eagleShoot(g) {
    this.gunT = 12;
    const ex = BASE_X + 8, ey = BASE_Y + 8;
    let best = null, bd = GUN_RANGE[g];
    for (const t of this.tanks) {
      if (!t.alive || t.isPlayer) continue;
      const dx = t.x + 8 - ex, dy = t.y + 8 - ey;
      // straight out into the field, or along the eagle's own edge (never into the wall behind it)
      const dir = Math.abs(dx) < 8 ? (dy < 0 ? 0 : 2) : Math.abs(dy) < 8 ? (dx > 0 ? 1 : 3) : -1;
      if (dir < 0 || dir === (BASE_FWD + 2) % 4) continue;
      const d = Math.abs(dx) + Math.abs(dy);
      if (d < bd) { bd = d; best = dir; }
    }
    if (best === null) return;
    // the shell starts outside the fortress so it never breaks its own walls
    const off = 8 + (this.base.walls >= 1 ? 16 : 8) + 2;
    this.bullets.push({
      x: ex - 2 + DXY[best][0] * off, y: ey - 2 + DXY[best][1] * off, dir: best, speed: 4, owner: EAGLE_GUN, free: true,
      isPlayer: true, eagle: true, power: g >= 4, cutter: false, alive: true, pierce: false, rocket: g >= 5,
    });
    this.gunDir = best;
    this.gunT = GUN_EVERY[g];
    Sound.play('shot');
  },

  // a hit on the eagle: armor soaks it if there is any left
  eagleArmorHit() {
    if (this.eagleInv > 0) return true;
    if (this.eagleArmor <= 0) return false;
    AutoSkill.event('eagleHit');
    this.eagleArmor--;
    this.eagleInv = 40;
    this.eagleFlash = 30;
    this.addFx(BASE_X + 8, BASE_Y + 8, Sprites.smallExp, 3);
    Sound.play('armor');
    return true;
  },

  // under the tanks: the tank-trap zone and the tesla coil's reach
  renderBaseZones(ctx) {
    const b = this.base;
    if (!b || !this.baseAlive) return;
    const ex = BASE_X + 8, ey = BASE_Y + 8;
    const a0 = Math.atan2(DXY[BASE_FWD][1], DXY[BASE_FWD][0]) - Math.PI / 2;
    const ring = (r, color, n) => {
      ctx.fillStyle = color;
      for (let a = 0; a < n; a++) {
        const ang = a0 + (a / (n - 1)) * Math.PI;   // the half circle in front of the eagle
        ctx.fillRect(Math.round(ex + Math.cos(ang) * r), Math.round(ey + Math.sin(ang) * r), 1, 1);
      }
    };
    if (b.traps) ring(TRAP_RANGE[b.traps], '#7C5800', 28);
    if (b.tesla && this.teslaT < 12) ring(TESLA_RANGE[b.tesla] + 8, '#58F8F8', 24);
  },

  renderEagle(ctx) {
    // tesla lightning
    for (const zp of this.zaps) {
      ctx.fillStyle = (zp.t >> 1) & 1 ? '#F8F8F8' : '#58F8F8';
      const x0 = BASE_X + 8, y0 = BASE_Y + 2, n = 8;
      for (let i = 0; i <= n; i++) {
        const j = i === 0 || i === n ? 0 : ((i * 7 + zp.t) % 5) - 2;
        ctx.fillRect(Math.round(x0 + (zp.x - x0) * i / n) + j, Math.round(y0 + (zp.y - y0) * i / n) - j, 2, 2);
      }
    }
    if (!this.baseAlive) { ctx.drawImage(Sprites.eagleDead, BASE_X, BASE_Y); return; }
    if (this.eagleArmor > 0 || this.eagleFlash > 0) {
      const c = this.eagleFlash > 0 && (this.eagleFlash >> 2) & 1 ? COL.white : this.eagleArmor >= 3 ? COL.gold : '#3CBCFC';
      ctx.drawImage(Sprites.outline(Sprites.eagle, c), BASE_X - 1, BASE_Y - 1);
    }
    ctx.drawImage(Sprites.eagle, BASE_X, BASE_Y);
    if (this.base && this.base.tesla) {
      // the coil: a little copper post with a glowing tip beside the eagle
      ctx.fillStyle = '#B87000'; ctx.fillRect(BASE_X + 13, BASE_Y + 9, 2, 6);
      ctx.fillStyle = this.teslaT < 12 ? '#F8F8F8' : '#58F8F8'; ctx.fillRect(BASE_X + 12, BASE_Y + 7, 4, 3);
    }
    if (this.base && this.base.gun) {
      // a small turret on the eagle's head
      const cx = BASE_X + 8, cy = BASE_Y + 5;
      ctx.fillStyle = '#505050';
      ctx.fillRect(cx - 2, cy - 2, 4, 4);
      ctx.fillStyle = this.base.gun >= 5 ? '#F87830' : this.base.gun >= 4 ? COL.gold : '#ADADAD';
      ctx.fillRect(cx - 1, cy - 1, 2, 2);
      const [dx, dy] = DXY[this.gunDir || 0];
      ctx.fillStyle = '#505050';
      for (let k = 2; k <= 4; k++) ctx.fillRect(cx - (dx ? 0 : 1) + dx * k - (dx < 0 ? 1 : 0), cy - (dy ? 0 : 1) + dy * k - (dy < 0 ? 1 : 0), dx ? 1 : 2, dy ? 1 : 2);
    }
  },
});
