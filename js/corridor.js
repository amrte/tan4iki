'use strict';
// =====================================================================
//  CORRIDOR mode: the usual width, endless height. Climb as far as you can.
//  The world is three map sections stacked (13 tiles high each). When the whole team has climbed out of the bottom
//  section it is dropped, everything moves down one section, and a fresh section is added on top, so the climb
//  never ends. Enemies keep arriving just above the screen and get tougher the higher you get; ones left far
//  behind drop out. No eagle: it's over when everyone is out of tanks. Every 5 sections: a tank for everyone.
// =====================================================================

const CORRIDOR_SECTIONS = 3, CORRIDOR_SECTION = 13;

// one section's block rows, as wide as the field (a classic 26-block map, mirrored outwards when wider)
function corridorSection(map) {
  const b = mapToBlocks(map), TW = COLS * 2, offX = 2 * Math.floor((COLS - 13) / 2);
  const mirror = (i, n) => { const p = 2 * n, m = ((i % p) + p) % p; return m < n ? m : p - 1 - m; };
  return b.map(row => { let r = ''; for (let x = 0; x < TW; x++) r += row[mirror(x - offX, 26)]; return r; });
}

function corridorMap() { return LEVELS[Math.floor(Math.random() * LEVELS.length)]; }

// the starting world: sections stacked top to bottom
function corridorBlocks(n) {
  let rows = [];
  for (let k = 0; k < n; k++) rows = rows.concat(corridorSection(corridorMap()));
  return rows;
}

Object.assign(Stage.prototype, {
  setupCorridor() {
    this.corridor = { shifts: 0, climbed: 0, startY: PLAYER_SPAWN[0][1], spawnCd: 120, spawned: 0, lifeAt: 5 };
    this.noBase = true;
    this.queue = [];
    this.total = 0;
    // a clear runway at the bottom where everyone starts
    this.clearArea(0, FH - 48, FW, 48);
  },

  sectionPx() { return CORRIDOR_SECTION * 16; },

  // how far the team has climbed, in tiles (the front-runner counts)
  corridorClimb() {
    const c = this.corridor, ps = this.tanks.filter(t => t.isPlayer && !t.ally && t.alive);
    if (ps.length) {
      const top = Math.min(...ps.map(t => t.y));
      c.climbed = Math.max(c.climbed, Math.floor((c.shifts * this.sectionPx() + c.startY - top) / 16));
    }
    return c.climbed;
  },

  // "stage" the enemies are drawn from: one up every section climbed
  corridorLevel() { return 1 + Math.floor(this.corridorClimb() / CORRIDOR_SECTION); },

  // a destroyed player comes back near the bottom of the screen
  corridorSpawnPoint(p) {
    if (this.camY === undefined) return PLAYER_SPAWN[p.i];
    const y = Math.min(FH - 16, Math.floor((this.camY + VIEW_H - 16) / 16) * 16);
    const x = Math.max(0, Math.min(FW - 16, PLAYER_SPAWN[p.i][0]));
    this.clearArea(x, y, 16, 16);
    return [x, y];
  },

  updateCorridor() {
    const c = this.corridor, lvl = this.corridorLevel(), S = this.sectionPx();
    const cam = this.camY === undefined ? FH - VIEW_H : this.camY;
    // enemies arrive just above the screen
    if (--c.spawnCd <= 0 && this.freezeE <= 0) {
      c.spawnCd = Math.round(Math.max(45, 160 - lvl * 5) / Config.scale('spawnRate') / Config.skill().spawn);
      const onField = this.tanks.filter(t => !t.isPlayer).length + this.spawns.filter(s => s.enemy).length;
      if (onField < this.maxEnemies) {
        for (let k = 0; k < 20; k++) {
          const x = Math.floor(Math.random() * (COLS - 1)) * 16;
          const y = Math.max(0, Math.floor((cam - 32 - Math.random() * 64) / 16) * 16);
          if (this.tanks.some(t => overlap(t.x, t.y, 16, 16, x, y, 16, 16))) continue;
          let solid = false;
          for (let cy = y >> 2; cy < (y + 16) >> 2 && !solid; cy++) for (let cx = x >> 2; cx < (x + 16) >> 2; cx++) {
            const v = this.get(cx, cy);
            if (v === T_STEEL || v === T_WATER || v === T_BRICK) { solid = true; break; }
          }
          if (solid) continue;
          const q = buildQueue(lvl, 1)[0];
          q.ai = [AI.HUNT, AI.HUNT, AI.SNIPE, AI.WANDER][Math.floor(Math.random() * 4)];
          q.bonus = Config.on('bonusTanks') && c.spawned % 7 === 3;
          c.spawned++;
          this.spawns.push({ x, y, t: SPARKLE_TIME, enemy: q });
          this.total++;
          break;
        }
      }
    }
    // enemies left far behind drop out
    for (const t of this.tanks) if (!t.isPlayer && t.y > cam + VIEW_H + 96) t.alive = false;
    // a tank for everyone every 5 sections
    if (this.corridorClimb() >= c.lifeAt * CORRIDOR_SECTION) {
      c.lifeAt += 5;
      for (const p of this.players) if (!p.out && !Config.infiniteLives()) p.lives++;
      Sound.play('life');
      this.popups.push({ x: FW / 2, y: cam + 40, text: '+1 TANK', label: true, color: COL.gold, t: 0, delay: 0, life: 90 });
    }
    // once nobody is left in the bottom section, the world moves down one section
    const ps = this.tanks.filter(t => t.isPlayer && !t.ally && t.alive);
    if (ps.length && Math.max(...ps.map(t => t.y)) < FH - S - 16 && !this.spawns.some(s => s.player)) this.corridorShift();
  },

  corridorShift() {
    const S = this.sectionPx(), rows = S / 4, c = this.corridor;
    // terrain: everything moves down `rows` cells, a new section on top
    const fresh = corridorSection(corridorMap()), t = new Uint8Array(GW * GH);
    t.set(this.terrain.subarray(0, (GH - rows) * GW), rows * GW);
    for (let by = 0; by < fresh.length; by++) for (let bx = 0; bx < COLS * 2; bx++) {
      const v = BLOCK_TYPE[fresh[by][bx]] || T_EMPTY;
      for (let k = 0; k < 4; k++) t[(by * 2 + (k >> 1)) * GW + bx * 2 + (k & 1)] = v;
    }
    this.terrain = t;
    this.origTerrain = t.slice();
    this.dirty = true;
    this.terrainVer = (this.terrainVer || 0) + 1;
    this.navCost = {}; this.navBaseF = {}; this.navPlayerF = new Map();
    this.netDiff = []; this.netFull = true;
    // everything else moves down with it; what falls off the bottom is gone
    const down = o => { o.y += S; return o.y < FH; };
    for (const tk of this.tanks) { tk.y += S; if (tk.trail) for (const p of tk.trail) p[1] += S; if (tk.nav) tk.nav = null; }
    this.tanks = this.tanks.filter(tk => tk.y < FH);
    for (const k of ['bullets', 'spawns', 'mines', 'turrets', 'claudes', 'strikes', 'shells', 'pads']) this[k] = this[k].filter(down);
    for (const f of this.fx) f.y += S;
    for (const p of this.popups) p.y += S;
    for (const h of this.heals) { h.y1 += S; h.y2 += S; }
    if (this.powerup && !down(this.powerup)) this.powerup = null;
    this.pads.forEach((p, i) => { p.pair = this.pads[p.pair] ? p.pair : -1; });
    this.pads = this.pads.filter(p => p.pair >= 0);
    if (this.camY !== undefined) this.camY += S;
    c.shifts++;
  },

  renderCorridorLine(ctx) {
    const best = (STORE.get(MODE_KEY, {}).corridor || {}).dist || 0;
    Font.drawCenter(ctx, 'CLIMBED ' + this.corridorClimb() + ' M' + (best ? '  BEST ' + best : ''), FX + VIEW_W / 2, 0, COL.black);
  },
});
