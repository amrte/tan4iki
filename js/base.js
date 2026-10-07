'use strict';
// =====================================================================
//  Base upgrades: bought in the shop between stages, shared by the whole team, kept until game over.
//    WALLS       1 an extra brick ring · 2 steel corners · 3 a full steel inner ring
//    ARMOR       the eagle survives 1 / 2 / 3 hits per stage
//    REPAIR      a crew rebuilds the fortress, one block every 10 / 6 / 3 seconds
//    GUN         the eagle shoots enemies lined up with it · faster, longer range · steel-breaking shells
//    FIELD       2 / 4 / 6 armed mines in front of the fortress at the start of every stage
// =====================================================================

const BASE_UPGRADES = [
  { key: 'walls', name: 'BASE WALLS', prices: [4000, 7000, 12000], descs: ['AN EXTRA BRICK RING', 'STEEL CORNERS', 'FULL STEEL INNER RING'] },
  { key: 'armor', name: 'EAGLE ARMOR', prices: [3000, 6000, 10000], descs: ['EAGLE SURVIVES 1 HIT', 'EAGLE SURVIVES 2 HITS', 'EAGLE SURVIVES 3 HITS'] },
  { key: 'repair', name: 'REPAIR CREW', prices: [2500, 5000, 8000], descs: ['REBUILDS WALLS EVERY 10 S', 'REBUILDS WALLS EVERY 6 S', 'REBUILDS WALLS EVERY 3 S'] },
  { key: 'gun', name: 'EAGLE GUN', prices: [5000, 8000, 12000], descs: ['EAGLE SHOOTS TANKS IN LINE', 'FASTER, LONGER RANGE', 'SHELLS BREAK STEEL'] },
  { key: 'field', name: 'MINEFIELD', prices: [2000, 3000, 4000], descs: ['2 MINES BEFORE THE EAGLE', '4 MINES BEFORE THE EAGLE', '6 MINES BEFORE THE EAGLE'] },
];
const newBase = () => ({ walls: 0, armor: 0, repair: 0, gun: 0, field: 0 });
const REPAIR_EVERY = [0, 600, 360, 180];
const GUN_EVERY = [0, 110, 70, 45], GUN_RANGE = [0, 96, 144, 192];
const EAGLE_GUN = { isPlayer: false, bullets: 0, eagle: true };   // owner of the eagle's shells (no points)

Object.assign(Stage.prototype, {
  // at stage start (before the stage's terrain is remembered for masons)
  applyBase(base) {
    this.base = Object.assign(newBase(), base || {});
    this.eagleArmor = this.base.armor;
    this.eagleInv = 0;
    this.eagleFlash = 0;
    this.repairT = 0;
    this.gunT = 60;
    this.gunDir = 0;
    if (this.base.walls >= 1) for (const [x, y] of this.outerRing()) this.setBlock(x, y, T_BRICK);
    if (this.base.walls >= 2) this.setBaseWalls(T_BRICK);
    this.placeMinefield([0, 2, 4, 6][this.base.field]);
  },

  // the extra ring of blocks around the classic fortress
  outerRing() {
    const bx = BASE_X / 8, by = BASE_Y / 8, out = [];
    for (let y = by - 2; y <= by + 1; y++) for (let x = bx - 2; x <= bx + 3; x++) {
      if ((x === bx - 2 || x === bx + 3 || y === by - 2) && x >= 0 && x < COLS * 2 && y >= 0) out.push([x, y]);
    }
    return out;
  },

  // what a fortress block is made of with the WALLS upgrade (i = index in BASE_WALL)
  baseWallType(i) {
    const w = this.base ? this.base.walls : 0;
    if (w >= 3) return T_STEEL;
    if (w >= 2) {
      const [x, y] = BASE_WALL[i], bx = BASE_X / 8, by = BASE_Y / 8;
      if ((x === bx - 1 || x === bx + 2) && (y === by - 1 || y === by + 1)) return T_STEEL;
    }
    return T_BRICK;
  },

  placeMinefield(n) {
    const spots = [];
    for (const dy of [48, 72]) for (const dx of [0, -24, 24, -48, 48, -72, 72]) spots.push([BASE_X + 8 + dx, BASE_Y + 8 - dy]);
    for (const [x, y] of spots) {
      if (n <= 0) break;
      if (x < 8 || x > FW - 8 || y < 8) continue;
      const t = this.get(x >> 2, y >> 2);
      if (t !== T_EMPTY && t !== T_FOREST) continue;
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
  },

  // put back one missing block of the fortress
  repairFortress() {
    const want = BASE_WALL.map((b, i) => [b[0], b[1], this.baseWallType(i)]);
    if (this.base.walls >= 1) for (const [x, y] of this.outerRing()) want.push([x, y, T_BRICK]);
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
      let dir = -1;
      if (Math.abs(dx) < 8 && dy < 0) dir = 0;
      else if (Math.abs(dy) < 8) dir = dx > 0 ? 1 : 3;
      const d = Math.abs(dx) + Math.abs(dy);
      if (dir >= 0 && d < bd) { bd = d; best = dir; }
    }
    if (best === null) return;
    // the shell starts outside the fortress so it never breaks its own walls
    const off = 8 + (this.base.walls >= 1 ? 16 : 8) + 2;
    this.bullets.push({
      x: ex - 2 + DXY[best][0] * off, y: ey - 2 + DXY[best][1] * off, dir: best, speed: 4, owner: EAGLE_GUN, free: true,
      isPlayer: true, eagle: true, power: g >= 3, cutter: false, alive: true, pierce: false, rocket: false,
    });
    this.gunDir = best;
    this.gunT = GUN_EVERY[g];
    Sound.play('shot');
  },

  // a hit on the eagle: armor soaks it if there is any left
  eagleArmorHit() {
    if (this.eagleInv > 0) return true;
    if (this.eagleArmor <= 0) return false;
    this.eagleArmor--;
    this.eagleInv = 40;
    this.eagleFlash = 30;
    this.addFx(BASE_X + 8, BASE_Y + 8, Sprites.smallExp, 3);
    Sound.play('armor');
    return true;
  },

  renderEagle(ctx) {
    if (!this.baseAlive) { ctx.drawImage(Sprites.eagleDead, BASE_X, BASE_Y); return; }
    if (this.eagleArmor > 0 || this.eagleFlash > 0) {
      const c = this.eagleFlash > 0 && (this.eagleFlash >> 2) & 1 ? COL.white : this.eagleArmor >= 3 ? COL.gold : '#3CBCFC';
      ctx.drawImage(Sprites.outline(Sprites.eagle, c), BASE_X - 1, BASE_Y - 1);
    }
    ctx.drawImage(Sprites.eagle, BASE_X, BASE_Y);
    if (this.base && this.base.gun) {
      // a small turret on the eagle's head
      const cx = BASE_X + 8, cy = BASE_Y + 5;
      ctx.fillStyle = '#505050';
      ctx.fillRect(cx - 2, cy - 2, 4, 4);
      ctx.fillStyle = this.base.gun >= 3 ? COL.gold : '#ADADAD';
      ctx.fillRect(cx - 1, cy - 1, 2, 2);
      const [dx, dy] = DXY[this.gunDir || 0];
      ctx.fillStyle = '#505050';
      for (let k = 2; k <= 4; k++) ctx.fillRect(cx - (dx ? 0 : 1) + dx * k - (dx < 0 ? 1 : 0), cy - (dy ? 0 : 1) + dy * k - (dy < 0 ? 1 : 0), dx ? 1 : 2, dy ? 1 : 2);
    }
  },
});
