'use strict';
// =====================================================================
//  VS EAGLES against the computer (VS EAGLES with 1 player)
//  The enemy has a headquarters too: an eagle in a fortress at the top centre. Its tanks keep coming and go for your
//  eagle (or you); destroy their eagle to win the round. Then the usual tally and shop, and on to the next round on a
//  new map, where the enemy HQ is a little stronger: one upgrade after another, the way you build up your own base.
//    round 2 repair crew · 3 walls, armor · 4 eagle gun · 5 minefield · 6 tesla coil · 7 tank traps, then each grows
//  The straight way in from below always stays brick, so plain shells can always get through.
// =====================================================================

const CPU_UPGRADES = [
  ['walls', 'WALLS'], ['repair', 'REPAIR CREW'], ['armor', 'ARMOR'], ['gun', 'EAGLE GUN'],
  ['field', 'MINEFIELD'], ['tesla', 'TESLA COIL'], ['traps', 'TANK TRAPS'],
];
const CPU_HQ_PTS = 2000, CPU_HQ_ROUND_PTS = 500;

// the enemy HQ's upgrade levels (0-5) in round r
function cpuBase(r) {
  const c = (v, from) => (r >= from ? Math.max(1, Math.min(5, v)) : 0);
  return {
    walls: c(Math.floor((r - 1) / 2), 3),
    repair: c(Math.floor(r / 2), 2),
    armor: c(Math.floor((r - 1) / 2), 3),
    gun: c(Math.floor((r - 2) / 2), 4),
    field: c(r - 4, 5),
    tesla: c(Math.floor((r - 4) / 2), 6),
    traps: c(r - 6, 7),
  };
}

// what's new in round r: ["EAGLE GUN L1", "ARMOR L2", ...]
function cpuNews(r) {
  if (r <= 1) return [];
  const a = cpuBase(r - 1), b = cpuBase(r);
  return CPU_UPGRADES.filter(([k]) => b[k] > a[k]).map(([k, name]) => name + ' L' + b[k]);
}

Object.assign(Stage.prototype, {
  setupCpu(round) {
    const base = cpuBase(round);
    this.cpu = {
      round, x: BASE_X, y: 0, alive: true, base, armor: base.armor, inv: 0, flash: 0,
      repairT: 0, gunT: 120, gunDir: 2, teslaT: 120, zaps: [],
    };
    // their tanks come in at the other entry points (the middle one is the HQ now)
    this.spawnXs = ENEMY_SPAWN_X.filter(x => Math.abs(x - BASE_X) >= 48);
    if (!this.spawnXs.length) this.spawnXs = [0, FW - 16];
    this.clearArea(BASE_X - 24, 0, 64, 40);
    // no teleporter pair with a pad inside the HQ (pads come in pairs: i and i ^ 1)
    const inHq = p => overlap(p.x, p.y, 16, 16, BASE_X - 24, 0, 64, 40);
    const keep = [];
    for (let i = 0; i + 1 < this.pads.length; i += 2) if (!inHq(this.pads[i]) && !inHq(this.pads[i + 1])) keep.push(this.pads[i], this.pads[i + 1]);
    keep.forEach((p, i) => { p.pair = i ^ 1; });
    this.pads = keep;
    for (const [x, y, t] of this.cpuWalls()) this.setBlock(x, y, t);
    // a minefield below their fortress (enemy mines: they go off under you)
    let n = base.field * 2;
    for (const dy of [56, 80]) for (const dx of [0, -24, 24, -48, 48, -72, 72]) {
      const x = BASE_X + 8 + dx, y = 8 + dy;
      if (n <= 0 || x < 8 || x > FW - 8) continue;
      const t = this.get(x >> 2, y >> 2);
      if (t !== T_EMPTY && t !== T_FOREST) continue;
      this.mines.push({ x, y, byPlayer: false, owner: null, t: MINE_ARM_TIME });
      n--;
    }
    this.navBaseF = {};
  },

  // the HQ fortress: an inner ring of 8 blocks round the eagle, an outer ring of 12 from WALLS 1; [bx, by, type]
  cpuWalls() {
    const w = this.cpu.base.walls, bx = BASE_X / 8, out = [];
    const door = x => x === bx || x === bx + 1;   // the way in from below always stays brick
    for (let y = 0; y <= 2; y++) for (let x = bx - 1; x <= bx + 2; x++) {
      if (!(x === bx - 1 || x === bx + 2 || y === 2)) continue;
      const corner = y === 2 && !door(x);
      out.push([x, y, (corner && w >= 2) || (!door(x) && w >= 3) ? T_STEEL : T_BRICK]);
    }
    if (w >= 1) {
      for (let y = 0; y <= 3; y++) for (let x = bx - 2; x <= bx + 3; x++) {
        if (!(x === bx - 2 || x === bx + 3 || y === 3) || x < 0 || x >= COLS * 2) continue;
        const corner = y === 3 && (x === bx - 2 || x === bx + 3);
        out.push([x, y, (corner && w >= 4) || (!door(x) && w >= 5) ? T_STEEL : T_BRICK]);
      }
    }
    return out;
  },

  // every frame while the HQ stands
  updateCpu() {
    const c = this.cpu;
    if (!c.alive || this.over) return;
    // the enemy never runs out of tanks while its HQ stands
    if (this.queue.length < 3) {
      const more = buildQueue(this.num, 20).sort(() => Math.random() - 0.5).slice(0, 4);
      this.queue.push(...more);
      this.total += more.length;
    }
    if (c.inv > 0) c.inv--;
    if (c.flash > 0) c.flash--;
    const b = c.base;
    if (b.repair && ++c.repairT >= REPAIR_EVERY[b.repair]) { c.repairT = 0; this.cpuRepair(); }
    if (b.gun && this.freezeE <= 0 && --c.gunT <= 0) this.cpuShoot(b.gun);
    if (b.tesla && this.freezeE <= 0 && --c.teslaT <= 0) this.cpuZap(b.tesla);
    for (const z of c.zaps) z.t--;
    c.zaps = c.zaps.filter(z => z.t > 0);
  },

  cpuRepair() {
    for (const [x, y, type] of this.cpuWalls()) {
      let missing = false;
      for (let k = 0; k < 4; k++) if (this.get(x * 2 + (k & 1), y * 2 + (k >> 1)) === T_EMPTY) missing = true;
      if (!missing || this.tanks.some(o => o.alive && overlap(o.x, o.y, 16, 16, x * 8, y * 8, 8, 8))) continue;
      for (let k = 0; k < 4; k++) {
        const cx = x * 2 + (k & 1), cy = y * 2 + (k >> 1);
        if (this.get(cx, cy) === T_EMPTY) this.set(cx, cy, type);
      }
      this.addFx(x * 8 + 4, y * 8 + 4, [Sprites.sparkle[0], Sprites.sparkle[1]], 4);
      return;
    }
  },

  // their eagle shoots at you when you line up with it (down, left or right)
  cpuShoot(g) {
    const c = this.cpu, ex = c.x + 8, ey = c.y + 8;
    c.gunT = 12;
    let best = null, bd = GUN_RANGE[g];
    for (const t of this.tanks) {
      if (!t.alive || !t.isPlayer || t.boost.smoke) continue;
      const dx = t.x + 8 - ex, dy = t.y + 8 - ey;
      let dir = -1;
      if (Math.abs(dx) < 8 && dy > 0) dir = 2;
      else if (Math.abs(dy) < 8) dir = dx > 0 ? 1 : 3;
      const d = Math.abs(dx) + Math.abs(dy);
      if (dir >= 0 && d < bd) { bd = d; best = dir; }
    }
    if (best === null) return;
    // the shell starts outside the fortress so it never breaks its own walls
    const off = 8 + (c.base.walls >= 1 ? 16 : 8) + 2;
    this.bullets.push({
      x: ex - 2 + DXY[best][0] * off, y: ey - 2 + DXY[best][1] * off, dir: best, speed: 3.5, free: true,
      owner: { isPlayer: false, bullets: 0 }, isPlayer: false, power: g >= 4, cutter: false, alive: true, pierce: false, rocket: g >= 5,
    });
    c.gunDir = best;
    c.gunT = GUN_EVERY[g];
    Sound.play('shot');
  },

  cpuZap(z) {
    const c = this.cpu, ex = c.x + 8, ey = c.y + 8;
    c.teslaT = 20;
    const hit = this.tanks.filter(t => t.alive && t.isPlayer && !t.ally && Math.hypot(t.x + 8 - ex, t.y + 8 - ey) < TESLA_RANGE[z] + 8);
    if (!hit.length) return;
    for (const t of hit) { c.zaps.push({ x: t.x + 8, y: t.y + 8, t: 10 }); this.hitPlayer(t); }
    c.teslaT = TESLA_EVERY[z];
    Sound.play('zap');
  },

  // their tank traps slow you near their HQ
  cpuTrap(t) {
    const c = this.cpu, lv = c && c.alive ? c.base.traps : 0;
    if (!lv) return 1;
    return Math.hypot(t.x - c.x, t.y - c.y) < TRAP_RANGE[lv] ? TRAP_SLOW[lv] : 1;
  },

  // a shell meets their eagle (true if it stopped there); their own shells can't hurt it
  cpuBullet(b) {
    const c = this.cpu;
    if (!c.alive || !overlap(b.x, b.y, 4, 4, c.x, c.y, 16, 16)) return false;
    this.killBullet(b, true);
    if (b.isPlayer) this.cpuHit(b.owner);
    return true;
  },

  cpuHit(by) {
    const c = this.cpu;
    if (!c.alive || c.inv > 0) return;
    if (c.armor > 0) {
      c.armor--; c.inv = 40; c.flash = 30;
      this.addFx(c.x + 8, c.y + 8, Sprites.smallExp, 3);
      Sound.play('armor');
      return;
    }
    this.cpuDown(by);
  },

  // their HQ falls: the round is won, and every tank of theirs goes up with it
  cpuDown(by) {
    const c = this.cpu;
    c.alive = false;
    this.addFx(c.x + 8, c.y + 8, BIG_EXPLOSION(), 6);
    Sound.play('baseDie');
    const p = by && by.player, pts = CPU_HQ_PTS + CPU_HQ_ROUND_PTS * c.round;
    if (p) { this.addScore(p, pts); this.addXp(p, 50); }
    else for (const q of this.players) if (!q.out) this.addScore(q, Math.round(pts / this.players.length));
    this.popups.push({ x: c.x + 8, y: c.y + 24, text: 'ENEMY HQ DOWN +' + pts, label: true, color: COL.gold, t: 0, delay: 0, life: 150 });
    this.queue = [];
    this.spawns = this.spawns.filter(s => !s.enemy);
    for (const t of this.tanks) if (t.alive && !t.isPlayer) this.killEnemy(t, null, false, true);
    for (const m of this.mines) if (!m.byPlayer) m.done = true;
    this.mines = this.mines.filter(m => !m.done);
  },

  renderCpu(ctx) {
    const c = this.cpu;
    if (!c) return;
    const b = c.base, ex = c.x + 8, ey = c.y + 8;
    if (c.alive && b.traps) {
      ctx.fillStyle = '#7C5800';
      const r = TRAP_RANGE[b.traps];
      for (let a = 0; a < 28; a++) { const ang = (a / 27) * Math.PI; ctx.fillRect(Math.round(ex + Math.cos(ang) * r), Math.round(ey + Math.sin(ang) * r), 1, 1); }
    }
    for (const z of c.zaps) {
      ctx.fillStyle = (z.t >> 1) & 1 ? '#F8F8F8' : '#F83800';
      for (let i = 0; i <= 8; i++) {
        const j = i === 0 || i === 8 ? 0 : ((i * 7 + z.t) % 5) - 2;
        ctx.fillRect(Math.round(ex + (z.x - ex) * i / 8) + j, Math.round(ey + 6 + (z.y - ey - 6) * i / 8) - j, 2, 2);
      }
    }
    if (!c.alive) { ctx.drawImage(Sprites.eagleDead, c.x, c.y); return; }
    // the enemy's eagle glows red (white when hit); armour pips underneath
    ctx.drawImage(Sprites.outline(Sprites.eagle, c.flash > 0 && (c.flash >> 2) & 1 ? COL.white : '#F83800'), c.x - 1, c.y - 1);
    ctx.drawImage(Sprites.eagle, c.x, c.y);
    ctx.fillStyle = COL.gold;
    for (let k = 0; k < c.armor; k++) ctx.fillRect(c.x + 8 - c.armor + k * 2, c.y + 17, 1, 1);
    if (b.tesla) {
      ctx.fillStyle = '#B87000'; ctx.fillRect(c.x + 13, c.y + 1, 2, 6);
      ctx.fillStyle = c.teslaT < 12 ? '#F8F8F8' : '#F83800'; ctx.fillRect(c.x + 12, c.y + 6, 4, 3);
    }
    if (b.gun) {
      const cx = c.x + 8, cy = c.y + 11;
      ctx.fillStyle = '#505050';
      ctx.fillRect(cx - 2, cy - 2, 4, 4);
      ctx.fillStyle = b.gun >= 5 ? '#F87830' : b.gun >= 4 ? COL.gold : '#ADADAD';
      ctx.fillRect(cx - 1, cy - 1, 2, 2);
      const [dx, dy] = DXY[c.gunDir || 2];
      ctx.fillStyle = '#505050';
      for (let k = 2; k <= 4; k++) ctx.fillRect(cx - (dx ? 0 : 1) + dx * k - (dx < 0 ? 1 : 0), cy - (dy ? 0 : 1) + dy * k - (dy < 0 ? 1 : 0), dx ? 1 : 2, dy ? 1 : 2);
    }
  },

  // the border above the field: round and what's left of their armour
  renderCpuLine(ctx) {
    const c = this.cpu;
    Font.drawCenter(ctx, 'ROUND ' + c.round + (c.alive && c.armor ? '  HQ ARMOR ' + c.armor : ''), FX + VIEW_W / 2, 0, COL.black);
  },
});
