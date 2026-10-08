'use strict';
// =====================================================================
//  Big scrolling maps (BIG MAPS mode, or every 4th stage with BIG MAP STAGES on)
//  The world is several classic maps stitched together (3 x 2 or more); the screen shows the usual field size and
//  follows your tanks. Each big stage has an objective:
//    OUTPOSTS   two more eagles with their own fortresses beside your HQ. Enemies go for the nearest one. Only losing
//               the HQ ends the game; every outpost still standing at the end is worth 2000 to each player.
//    FACTORIES  three enemy factories in the far half keep turning out tanks until destroyed (8 hits each, 1000
//               points). The stage is clear when every factory is down and the last tank is gone.
// =====================================================================

const SECTOR = 13, OUTPOST_BONUS = 2000, FACTORY_HP = 8, FACTORY_EVERY = 720;

// the stitched world: SX x SY classic maps, as one big block map
function bigWorldBlocks(num, SX, SY) {
  const rows = [];
  for (let sy = 0; sy < SY; sy++) {
    const sectorRows = [];
    for (let sx = 0; sx < SX; sx++) sectorRows.push(mapToBlocks(LEVELS[(num * 5 + sx * 3 + sy * 7) % LEVELS.length]));
    for (let r = 0; r < 26; r++) rows.push(sectorRows.map(b => b[r]).join(''));
  }
  return rows;
}

// world size for a screen of vc x vr tiles
function bigWorldSize(vc, vr) {
  const SX = Math.max(3, Math.ceil(vc * 2 / SECTOR)), SY = Math.max(2, Math.ceil(vr * 1.5 / SECTOR));
  return [SX, SY];
}

Object.assign(Stage.prototype, {
  setupBigMap(kind) {
    this.big = kind;
    this.outposts = [];
    this.factories = [];
    const SX = COLS / SECTOR, hq = Math.floor(SX / 2);
    if (kind === 'outposts') {
      for (const sx of [hq - 1, hq + 1]) {
        if (sx < 0 || sx >= SX) continue;
        const x = sx * SECTOR * 16 + 96, y = FH - 16;
        this.clearArea(x - 16, y - 16, 48, 32);
        this.fortressAround(x, y);
        this.outposts.push({ x, y, alive: true });
      }
    } else {
      // three factories spread across the far half
      const n = 3;
      for (let k = 0; k < n; k++) {
        const sx = Math.min(SX - 1, Math.floor((k + 0.5) * SX / n));
        const spot = this.freeSpot32(sx * SECTOR * 16 + 88, 72 + (k & 1) * 48);
        if (!spot) continue;
        this.clearArea(spot[0], spot[1], 32, 40);
        this.factories.push({ x: spot[0], y: spot[1], hp: FACTORY_HP, cd: 240 + k * 120, flash: 0 });
      }
    }
  },

  clearArea(x, y, w, h) {
    for (let cy = Math.max(0, y >> 2); cy < Math.min(GH, (y + h) >> 2); cy++) {
      for (let cx = Math.max(0, x >> 2); cx < Math.min(GW, (x + w) >> 2); cx++) if (this.get(cx, cy) !== T_EMPTY) this.set(cx, cy, T_EMPTY);
    }
  },

  // a 32px spot near (x, y) clear of steel and water, the entry row and the player area
  freeSpot32(x0, y0) {
    for (let r = 0; r < 10; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      const x = Math.round((x0 + dx * 16) / 16) * 16, y = Math.round((y0 + dy * 16) / 16) * 16;
      if (x < 0 || y < 32 || x > FW - 32 || y > FH / 2) continue;
      let bad = false;
      for (let cy = y >> 2; cy < (y + 40) >> 2 && !bad; cy++) for (let cx = x >> 2; cx < (x + 32) >> 2; cx++) {
        const t = this.get(cx, cy);
        if (t === T_STEEL || t === T_WATER) { bad = true; break; }
      }
      if (!bad && !this.factories.some(f => overlap(x, y, 32, 40, f.x - 16, f.y - 16, 64, 72))) return [x, y];
    }
    return null;
  },

  // every eagle the enemy may go for: the HQ and any outposts still standing
  baseGoals() {
    if (this.decoy) return [{ x: this.decoy.x, y: this.decoy.y }];
    const g = this.noBase ? [] : [{ x: BASE_X, y: BASE_Y }];
    for (const o of this.outposts || []) if (o.alive) g.push({ x: o.x, y: o.y });
    return g;
  },

  factoriesAlive() { return (this.factories || []).some(f => f.hp > 0); },

  updateBigMap() {
    for (const f of this.factories) {
      if (f.hp <= 0) continue;
      if (f.flash > 0) f.flash--;
      if (this.freezeE > 0 || this.over || --f.cd > 0) continue;
      f.cd = Math.round(FACTORY_EVERY / Config.scale('spawnRate') / Config.skill().spawn);
      const onField = this.tanks.filter(t => !t.isPlayer).length + this.spawns.filter(s => s.enemy).length;
      if (onField >= this.maxEnemies + 2) continue;
      // the new tank rolls out of the door, just below the factory
      const x = f.x + 8, y = f.y + 32;
      if (this.tanks.some(t => overlap(t.x, t.y, 16, 16, x, y, 16, 16))) continue;
      const type = buildQueue(this.num, 1)[0].type;
      this.spawns.push({ x, y, t: SPARKLE_TIME, enemy: { type } });
      this.total++;
    }
  },

  // shells and blasts against outposts and factories (true if the shell stopped)
  bulletBigMap(b) {
    for (const o of this.outposts) {
      if (!o.alive || !overlap(b.x, b.y, 4, 4, o.x, o.y, 16, 16)) continue;
      this.killBullet(b, true);
      if (!b.isPlayer) this.outpostDown(o);   // your own shells can't hurt your outposts
      return true;
    }
    for (const f of this.factories) {
      if (f.hp <= 0 || !overlap(b.x, b.y, 4, 4, f.x, f.y, 32, 32)) continue;
      this.killBullet(b, true);
      if (b.isPlayer) this.hitFactory(f, b.power ? 2 : 1, b.owner);
      return true;
    }
    return false;
  },

  outpostDown(o) {
    o.alive = false;
    AutoSkill.event('eagleHit');
    this.navBaseF = {};
    this.addFx(o.x + 8, o.y + 8, BIG_EXPLOSION(), 6);
    this.popups.push({ x: o.x + 8, y: o.y - 8, text: 'OUTPOST LOST', label: true, color: COL.red, t: 0, delay: 0, life: 90 });
    Sound.play('baseDie');
  },

  hitFactory(f, dmg, by) {
    f.hp -= dmg;
    f.flash = 8;
    if (f.hp > 0) { Sound.play('armor'); return; }
    for (let i = 0; i < 6; i++) this.fx.push({ x: f.x + 4 + Math.random() * 24, y: f.y + 4 + Math.random() * 24, frames: BIG_EXPLOSION(), per: 5, tick: -i * 6 });
    Sound.play('bossDie');
    const p = by && by.player;
    if (p) { this.addScore(p, 1000); this.addXp(p, 50); }
    this.popups.push({ x: f.x + 16, y: f.y, text: 'FACTORY DOWN', label: true, color: COL.gold, t: 0, delay: 20, life: 90 });
  },

  // stage clear: standing outposts pay out
  bigMapBonus() {
    const n = this.outposts.filter(o => o.alive).length;
    if (!n) return;
    for (const p of this.players) if (!p.out) this.addScore(p, n * OUTPOST_BONUS);
    this.popups.push({ x: BASE_X + 8, y: BASE_Y - 24, text: 'OUTPOSTS +' + n * OUTPOST_BONUS, label: true, color: COL.gold, t: 0, delay: 0, life: 120 });
  },

  // ------------------------------------------------------------ camera and drawing
  // where the screen's window onto the field starts (it follows your tanks; an online guest's follows its own)
  camera() {
    if (VIEW_W >= FW && VIEW_H >= FH) return [0, 0];
    const mine = Net.role === 'client' ? this.tanks.filter(t => t.isPlayer && !t.ally && t.player && t.player.i === Net.slot) : [];
    const ps = mine.length ? mine : this.tanks.filter(t => t.isPlayer && !t.ally && t.alive);
    // the corridor holds still while everyone is between tanks (respawns come in near the bottom of the screen)
    if (!ps.length && (this.corridor || this.maze) && this.camX !== undefined) return [Math.round(this.camX), Math.round(this.camY)];
    let fx = this.maze ? this.maze.sx + 16 : BASE_X + 8, fy = this.maze ? this.maze.sy + 16 : BASE_Y + 8;
    if (ps.length) { fx = ps.reduce((a, t) => a + t.x + 8, 0) / ps.length; fy = ps.reduce((a, t) => a + t.y + 8, 0) / ps.length; }
    const tx = Math.max(0, Math.min(FW - VIEW_W, fx - VIEW_W / 2)), ty = Math.max(0, Math.min(FH - VIEW_H, fy - VIEW_H / 2));
    if (this.camX === undefined) { this.camX = tx; this.camY = ty; }
    this.camX += (tx - this.camX) * 0.2;
    this.camY += (ty - this.camY) * 0.2;
    return [Math.round(this.camX), Math.round(this.camY)];
  },

  renderBigMap(ctx) {
    for (const o of this.outposts || []) {
      if (!o.alive) { ctx.drawImage(Sprites.eagleDead, o.x, o.y); continue; }
      ctx.drawImage(Sprites.outline(Sprites.eagle, '#58F8F8'), o.x - 1, o.y - 1);
      ctx.drawImage(Sprites.eagle, o.x, o.y);
    }
    for (const f of this.factories || []) {
      if (f.hp <= 0) { ctx.fillStyle = '#3C3C3C'; ctx.fillRect(f.x + 2, f.y + 18, 28, 14); continue; }
      ctx.drawImage(f.flash > 0 && (f.flash >> 1) & 1 ? Sprites.factory[1] : Sprites.factory[0], f.x, f.y);
      // smoke from the chimney and a working light
      ctx.fillStyle = (this.frame >> 4) & 1 ? '#F83800' : '#7C0800';
      ctx.fillRect(f.x + 14, f.y + 20, 4, 2);
      ctx.fillStyle = 'rgba(160,160,160,0.6)';
      const s = (this.frame >> 2) % 8;
      ctx.fillRect(f.x + 24 + (s >> 2), f.y - 2 - s, 4, 3);
    }
  },

  // arrows at the edge of the screen pointing to objectives you can't see
  renderObjectiveArrows(ctx, camX, camY) {
    if (VIEW_W >= FW && VIEW_H >= FH) return;
    const marks = [];
    if (!this.noBase && this.baseAlive) marks.push([BASE_X + 8, BASE_Y + 8, COL.gold]);
    for (const o of this.outposts || []) if (o.alive) marks.push([o.x + 8, o.y + 8, '#58F8F8']);
    for (const f of this.factories || []) if (f.hp > 0) marks.push([f.x + 16, f.y + 16, '#F83800']);
    if (this.maze && !this.maze.escaped && this.frame >= this.maze.hintAt) marks.push([this.maze.ex + 16, this.maze.ey + 16, '#58F898']);   // the exit signal
    for (const [wx, wy, color] of marks) {
      const sx = wx - camX, sy = wy - camY;
      if (sx >= 0 && sy >= 0 && sx < VIEW_W && sy < VIEW_H) continue;
      const x = Math.max(4, Math.min(VIEW_W - 5, sx)), y = Math.max(4, Math.min(VIEW_H - 5, sy));
      if ((this.frame >> 3) & 1) continue;
      ctx.fillStyle = color;
      ctx.fillRect(x - 2, y - 2, 5, 5);
      ctx.fillStyle = COL.black;
      ctx.fillRect(x, y, 1, 1);
    }
  },

  // can you see this enemy? (not one that's underground, a mirage, cloaked, or in the dark unless it gives itself away)
  enemySeen(t) {
    if (!t.alive || t.isPlayer || t.mirage || t.burrow > 0) return false;
    if (t.reveal > 0) return true;
    if (t.stealth) return false;
    return !((this.weather === 'night' && !(this.nightVision > 0)) || this.weather === 'fog');
  },

  // big maps: an arrow at the edge of the screen for each enemy out of sight (and a bigger one for a boss)
  renderEnemyArrows(ctx, camX, camY) {
    if (VIEW_W >= FW && VIEW_H >= FH) return;
    const cx = VIEW_W / 2, cy = VIEW_H / 2;
    const marks = this.tanks.filter(t => this.enemySeen(t)).map(t => [t.x + 8, t.y + 8, false])
      .concat(this.bosses.filter(b => b.main && b.alive && this.bossTangible(b)).map(b => [b.x + b.w / 2, b.y + b.h / 2, true]));
    for (const [wx, wy, big] of marks) {
      const sx = wx - camX, sy = wy - camY;
      if (sx >= -4 && sy >= -4 && sx < VIEW_W + 4 && sy < VIEW_H + 4) continue;
      const a = Math.atan2(sy - cy, sx - cx), ca = Math.cos(a), sa = Math.sin(a);
      // where the line from the middle of the screen leaves it
      const k = Math.min(Math.abs((VIEW_W / 2 - 6) / (ca || 1e-6)), Math.abs((VIEW_H / 2 - 6) / (sa || 1e-6)));
      const x = cx + ca * k, y = cy + sa * k, far = Math.hypot(sx - cx, sy - cy) > Math.max(VIEW_W, VIEW_H) * 1.2;
      const n = big ? 6 : 4, col = big ? '#F8B800' : far ? '#A83000' : '#F83800';
      for (let r = 0; r <= n; r++) for (let j = -r; j <= r; j++) {
        const px = Math.round(x - ca * r - sa * j * 0.8), py = Math.round(y - sa * r + ca * j * 0.8);
        ctx.fillStyle = r === n || Math.abs(j) === r ? '#100808' : col;
        ctx.fillRect(px, py, 1, 1);
      }
    }
  },

  // big maps: a little map in the corner: the ground, where you are, the enemies, the eagle and the objectives.
  // In the maze it shows no walls (finding the way is the point). Settings -> SCREEN -> MINIMAP.
  renderMinimap(ctx, camX, camY) {
    if ((VIEW_W >= FW && VIEW_H >= FH) || !Config.on('minimap') || this.td) return;
    const s = Math.min(64 / FW, 48 / FH), mw = Math.max(8, Math.round(FW * s)), mh = Math.max(8, Math.round(FH * s)), x0 = VIEW_W - mw - 3, y0 = 3;
    if (!this.miniMap || this.miniMap.width !== mw || this.miniMap.height !== mh || this.frame - this.miniAt >= 30 || this.miniAt > this.frame) {
      this.miniMap = this.miniMap && this.miniMap.width === mw && this.miniMap.height === mh ? this.miniMap : makeCanvas(mw, mh);
      this.miniAt = this.frame;
      const c = this.miniMap.getContext('2d'), img = c.createImageData(mw, mh);
      const COLS4 = { [T_BRICK]: [168, 72, 16], [T_STEEL]: [180, 180, 188], [T_WATER]: [32, 64, 200], [T_FOREST]: [28, 108, 28], [T_ICE]: [168, 200, 232], [T_MUD]: [108, 72, 32], [T_BRIDGE]: [140, 100, 50] };
      for (let py = 0; py < mh; py++) for (let px = 0; px < mw; px++) {
        const o = (py * mw + px) * 4;
        const col = this.maze ? null : COLS4[this.get(Math.floor((px + 0.5) / s / 4), Math.floor((py + 0.5) / s / 4))];
        if (col) { img.data[o] = col[0]; img.data[o + 1] = col[1]; img.data[o + 2] = col[2]; img.data[o + 3] = 230; }
        else { img.data[o + 3] = 150; }
      }
      c.putImageData(img, 0, 0);
    }
    // out of the way: faint while one of you drives under it
    const under = this.tanks.some(t => t.isPlayer && t.alive && overlap(t.x - camX, t.y - camY, 16, 16, x0 - 4, y0 - 4, mw + 8, mh + 8));
    ctx.globalAlpha = under ? 0.3 : 0.9;
    ctx.fillStyle = '#7C7C7C'; ctx.fillRect(x0 - 1, y0 - 1, mw + 2, mh + 2);
    ctx.clearRect(x0, y0, mw, mh); ctx.fillStyle = '#000000'; ctx.fillRect(x0, y0, mw, mh);
    ctx.drawImage(this.miniMap, x0, y0);
    const dot = (wx, wy, col, r = 1) => { ctx.fillStyle = col; ctx.fillRect(Math.round(x0 + wx * s) - (r >> 1), Math.round(y0 + wy * s) - (r >> 1), r + 1, r + 1); };
    // the screen you see
    ctx.fillStyle = '#F8F8F8';
    const vx = Math.round(x0 + camX * s), vy = Math.round(y0 + camY * s), vw = Math.max(2, Math.round(VIEW_W * s)), vh = Math.max(2, Math.round(VIEW_H * s));
    ctx.fillRect(vx, vy, vw, 1); ctx.fillRect(vx, vy + vh - 1, vw, 1); ctx.fillRect(vx, vy, 1, vh); ctx.fillRect(vx + vw - 1, vy, 1, vh);
    if (!this.noBase && this.baseAlive) dot(BASE_X + 8, BASE_Y + 8, COL.gold, 2);
    for (const o of this.outposts || []) if (o.alive) dot(o.x + 8, o.y + 8, '#58F8F8', 2);
    for (const f of this.factories || []) if (f.hp > 0) dot(f.x + 16, f.y + 16, '#F87830', 2);
    if (this.maze && this.frame >= this.maze.hintAt) dot(this.maze.ex + 16, this.maze.ey + 16, (this.frame >> 3) & 1 ? '#58F898' : '#F8F8F8', 2);
    for (const t of this.tanks) if (this.enemySeen(t)) dot(t.x + 8, t.y + 8, '#F83800');
    for (const b of this.bosses) if (b.main && b.alive && this.bossTangible(b)) dot(b.x + b.w / 2, b.y + b.h / 2, (this.frame >> 2) & 1 ? '#F8B800' : '#F83800', 2);
    for (const t of this.tanks) if (t.alive && t.isPlayer) dot(t.x + 8, t.y + 8, t.ally ? '#BCBCBC' : PALS[Config.playerPal(t.player ? t.player.i : 0)][1]);
    ctx.globalAlpha = 1;
  },

  // how many enemies are still to beat: on the field, appearing, and waiting (null where it doesn't apply)
  enemiesLeft() {
    if (this.vs || this.race) return null;
    return this.queue.length + this.spawns.filter(sp => sp.enemy).length + this.tanks.filter(t => t.alive && !t.isPlayer && !t.mirage).length;
  },

  // objective line in the border above the field
  renderObjectiveLine(ctx) {
    if (!this.big) return;
    const text = this.big === 'outposts'
      ? 'OUTPOSTS ' + this.outposts.filter(o => o.alive).length + '/' + this.outposts.length
      : 'FACTORIES LEFT ' + this.factories.filter(f => f.hp > 0).length;
    Font.drawCenter(ctx, text, FX + VIEW_W / 2, 0, COL.black);
  },
});
