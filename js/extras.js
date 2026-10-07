'use strict';
// =====================================================================
//  Turrets, Claude, airstrikes and revival
//    TURRET    placed anywhere (B button with turrets carried, or the TURRET power-up drops one); turns towards
//              the nearest enemy and shoots once lined up. 3 hits. An enemy that grabs the power-up gets a red one.
//    CLAUDE    the orange Claude sparkle wanders the field for a while, chirping, and eats every enemy tank
//              (and enemy shell) it bumps into. It nibbles bosses. It won't work for the enemy.
//    AIRSTRIKE a plane flies along the row with the most enemies, bombing it (an enemy's plane bombs yours).
//    REVIVE    a fallen player comes back: the REVIVE power-up, FIRE during play (costs points), or the shop.
// =====================================================================

const TURRET_RANGE = 128, TURRET_HP = 3, TURRET_MAX = 3;
const CLAUDE_SPEED = 1, CLAUDE_EXTRA = 300;   // Claude stays for the new-power-up time + 5 s
const REVIVE_WAIT = 300;                      // all players out: 5 s to pay for a revival before GAME OVER

const reviveCost = () => (Config.get('reviveCost') === 'OFF' ? 0 : Config.get('reviveCost'));
// who gets the points for a turret's / Claude's / a plane's kills
const gunner = p => ({ isPlayer: !!p, player: p, bullets: 0, alive: true });

Object.assign(Stage.prototype, {
  // ------------------------------------------------------------ turrets
  placeTurret(x, y, owner, enemy) {
    x = Math.max(0, Math.min(FW - 16, Math.round(x / 8) * 8));
    y = Math.max(0, Math.min(FH - 16, Math.round(y / 8) * 8));
    // a player keeps at most 3 on the field: the oldest goes
    const mine = this.turrets.filter(t => t.owner === owner && t.enemy === enemy);
    if (mine.length >= TURRET_MAX) this.turrets.splice(this.turrets.indexOf(mine[0]), 1);
    this.turrets.push({ x, y, dir: 0, want: 0, hp: TURRET_HP, owner, enemy: !!enemy, cd: 40, turn: 0 });
    Sound.play('build');
  },

  turretAt(x, y, w, h) { return this.turrets.find(t => overlap(x, y, w, h, t.x, t.y, 16, 16)); },

  updateTurrets() {
    for (const tu of this.turrets) {
      if (tu.cd > 0) tu.cd--;
      if ((tu.enemy ? this.freezeE : this.freezeP) > 0) continue;
      const cx = tu.x + 8, cy = tu.y + 8;
      // nearest target in range
      let best = null, bd = TURRET_RANGE;
      for (const t of this.tanks) {
        if (!t.alive || t.isPlayer !== tu.enemy || t.boost.smoke) continue;
        const d = Math.abs(t.x + 8 - cx) + Math.abs(t.y + 8 - cy);
        if (d < bd) { bd = d; best = t; }
      }
      if (!best) continue;
      const dx = best.x + 8 - cx, dy = best.y + 8 - cy;
      tu.want = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : (dy > 0 ? 2 : 0);
      // swing round one quarter-turn at a time
      if (tu.dir !== tu.want) {
        if (++tu.turn >= 8) { tu.turn = 0; tu.dir = (tu.want - tu.dir + 4) % 4 === 3 ? (tu.dir + 3) % 4 : (tu.dir + 1) % 4; }
        continue;
      }
      const lined = (tu.dir & 1) ? Math.abs(dy) < 6 : Math.abs(dx) < 6;
      if (!lined || tu.cd > 0) continue;
      // a friendly turret never shoots towards its own eagle
      if (!tu.enemy && this.eagleInLine(cx, cy, best.x + 8, best.y + 8)) continue;
      const [ox, oy] = DXY[tu.dir];
      this.bullets.push({
        x: cx - 2 + ox * 10, y: cy - 2 + oy * 10, dir: tu.dir, speed: 4, owner: tu.enemy ? { isPlayer: false, bullets: 0 } : gunner(tu.owner),
        free: true, isPlayer: !tu.enemy, passPlayers: !tu.enemy, power: false, cutter: false, alive: true, pierce: false, rocket: false,
      });
      tu.cd = 50;
      if (!tu.enemy) Sound.play('shot');
    }
  },

  eagleInLine(x0, y0, x1, y1) {
    const ex = BASE_X + 8, ey = BASE_Y + 8;
    if (Math.abs(y1 - y0) < 6) return Math.abs(ey - y0) < 12 && (ex - x0) * (ex - x1) < 0;
    return Math.abs(ex - x0) < 12 && (ey - y0) * (ey - y1) < 0;
  },

  // a shell meets a turret (returns true if it stopped there)
  bulletTurret(b) {
    const tu = this.turretAt(b.x, b.y, 4, 4);
    if (!tu) return false;
    if (b.isPlayer !== tu.enemy) return false;   // shells fly over turrets on their own side
    this.killBullet(b, true);
    if (--tu.hp <= 0) {
      this.turrets.splice(this.turrets.indexOf(tu), 1);
      this.addFx(tu.x + 8, tu.y + 8, BIG_EXPLOSION(), 4);
      Sound.play('explode');
    } else Sound.play('armor');
    return true;
  },

  // ------------------------------------------------------------ Claude
  summonClaude(x, y, p) {
    this.claudes.push({ x: Math.round(x / 8) * 8, y: Math.round(y / 8) * 8, dir: 0, t: Config.frames('newTime') + CLAUDE_EXTRA, p, chirp: 30, nibble: 0, acc: 0 });
    this.popups.push({ x: x + 8, y, text: 'HI!', label: true, color: '#F0A080', t: 0, delay: 0 });
    Sound.play('claude');
  },

  updateClaudes() {
    for (const c of this.claudes) {
      c.t--;
      if (--c.chirp <= 0) { c.chirp = 70 + rnd(110); Sound.play('claude'); }
      // wander towards the nearest enemy (tank or boss); Claude floats over walls and water
      if ((c.x & 7) === 0 && (c.y & 7) === 0) {
        let best = null, bd = Infinity;
        for (const t of this.tanks) {
          if (!t.alive || t.isPlayer) continue;
          const d = Math.abs(t.x - c.x) + Math.abs(t.y - c.y);
          if (d < bd) { bd = d; best = [t.x, t.y]; }
        }
        for (const bo of this.bosses) if (bo.alive) { const d = Math.abs(bo.x - c.x) + Math.abs(bo.y - c.y); if (d < bd) { bd = d; best = [bo.x + bo.w / 2 - 8, bo.y + bo.h / 2 - 8]; } }
        if (best && Math.random() > 0.15) {
          const dx = best[0] - c.x, dy = best[1] - c.y;
          c.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : (dy > 0 ? 2 : 0);
        } else if (Math.random() < 0.3) c.dir = rnd(4);
      }
      c.acc += CLAUDE_SPEED;
      while (c.acc >= 1) {
        c.acc--;
        const nx = c.x + DXY[c.dir][0], ny = c.y + DXY[c.dir][1];
        if (nx < 0 || ny < 0 || nx > FW - 16 || ny > FH - 16) { c.dir = (c.dir + 2) % 4; break; }
        c.x = nx; c.y = ny;
      }
      // munch
      for (const t of this.tanks) {
        if (!t.alive || t.isPlayer || !overlap(t.x + 2, t.y + 2, 12, 12, c.x + 2, c.y + 2, 12, 12)) continue;
        this.killEnemy(t, gunner(c.p), true, true);
        this.popups.push({ x: t.x + 8, y: t.y, text: 'NOM!', label: true, color: '#F0A080', t: 0, delay: 0 });
        Sound.play('nom');
      }
      for (const b of this.bullets) {
        if (b.alive && !b.isPlayer && overlap(b.x, b.y, 4, 4, c.x + 2, c.y + 2, 12, 12)) { this.killBullet(b, false); Sound.play('nom'); }
      }
      if (--c.nibble <= 0) {
        for (const bo of this.bosses) {
          if (bo.alive && this.bossTangible(bo) && overlap(c.x, c.y, 16, 16, bo.x, bo.y, bo.w, bo.h)) {
            this.bossHit(bo, 1, gunner(c.p), c.x + 8);
            c.nibble = 30;
            Sound.play('nom');
          }
        }
      }
      if (c.t <= 0) {
        this.addFx(c.x + 8, c.y + 8, [Sprites.sparkle[3], Sprites.sparkle[2], Sprites.sparkle[1], Sprites.sparkle[0]], 4);
        this.popups.push({ x: c.x + 8, y: c.y, text: 'BYE!', label: true, color: '#F0A080', t: 0, delay: 0 });
        Sound.play('claudeBye');
      }
    }
    this.claudes = this.claudes.filter(c => c.t > 0);
  },

  // ------------------------------------------------------------ airstrikes
  // a plane flies along the busiest row (never the rows by the eagle), dropping bombs
  callAirstrike(byPlayer, owner) {
    const targets = this.tanks.filter(t => t.alive && t.isPlayer !== byPlayer);
    let y = -1, bestN = 0, bestOff = Infinity;
    for (let row = 0; row <= FH - 16; row += 8) {
      if (row > BASE_Y - 40) break;
      const hit = targets.filter(t => Math.abs(t.y - row) < 12);
      const off = hit.reduce((a, t) => a + Math.abs(t.y - row), 0);   // ties: the row they sit on exactly
      if (hit.length > bestN || (hit.length === bestN && hit.length && off < bestOff)) { bestN = hit.length; bestOff = off; y = row; }
    }
    if (y < 0) y = Math.min(BASE_Y - 48, 32 + rnd(Math.max(1, (FH >> 1) - 32)));
    const dir = Math.random() < 0.5 ? 1 : 3;
    this.strikes.push({ x: dir === 1 ? -24 : FW + 8, y, dir, byPlayer, owner, drop: 0 });
    Sound.play('plane');
  },

  updateStrikes() {
    for (const s of this.strikes) {
      s.x += s.dir === 1 ? 3 : -3;
      s.drop += 3;
      if (s.drop >= 24 && s.x > 0 && s.x < FW - 16) {
        s.drop = 0;
        this.blast(s.x + 8, s.y + 8, 12, s.byPlayer, s.owner, false);
      }
      if (s.x < -32 || s.x > FW + 16) s.done = true;
    }
    this.strikes = this.strikes.filter(s => !s.done);
  },

  // ------------------------------------------------------------ revival
  revive(p, payer) {
    if (payer) spend(payer, reviveCost());
    p.out = false;
    p.lives = 0;
    this.spawnPlayer(p, 0);
    this.reviveWait = 0;
    this.popups.push({ x: PLAYER_SPAWN[p.i][0] + 8, y: PLAYER_SPAWN[p.i][1], text: 'REVIVED!', label: true, color: COL.gold, t: 0, delay: 0, life: 90 });
    Sound.play('life');
  },

  // someone who can pay for p (p first, then the richest teammate)
  revivePayer(p) {
    const cost = reviveCost();
    if (!cost) return null;
    if (wallet(p) >= cost) return p;
    const rich = this.players.filter(q => q !== p && wallet(q) >= cost).sort((a, b) => wallet(b) - wallet(a));
    return rich[0] || null;
  },

  // fallen players press FIRE to come back
  updateRevival() {
    for (const p of this.players) {
      if (!p.out) continue;
      const payer = this.revivePayer(p);
      if (payer && Input.player(p.i).firePressed) this.revive(p, payer);
    }
    if (this.reviveWait > 0 && --this.reviveWait <= 0 && this.players.every(q => q.out)) this.startOver();
  },

  // ------------------------------------------------------------ drawing
  renderTurrets(ctx) {
    for (const tu of this.turrets) {
      ctx.drawImage(Sprites.turretBase, tu.x, tu.y);
      ctx.drawImage(Sprites.turretGun(tu.dir, tu.enemy ? 'red' : Config.playerPal(tu.owner ? tu.owner.i : 0)), tu.x, tu.y);
      for (let k = 0; k < tu.hp; k++) { ctx.fillStyle = tu.enemy ? '#F83800' : '#58D854'; ctx.fillRect(tu.x + 5 + k * 2, tu.y + 14, 1, 1); }
    }
  },

  renderClaudes(ctx) {
    for (const c of this.claudes) {
      if (c.t < 60 && (c.t >> 2) & 1) continue;
      ctx.drawImage(Sprites.claude[(c.x + c.y) >> 3 & 1], c.x, c.y);
    }
  },

  renderStrikes(ctx) {
    for (const s of this.strikes) {
      ctx.globalAlpha = 0.35;
      ctx.drawImage(Sprites.plane[s.dir], s.x + 6, s.y + 10);   // shadow
      ctx.globalAlpha = 1;
      ctx.drawImage(Sprites.plane[s.dir], s.x, s.y);
    }
  },

  renderRevival(ctx) {
    const cost = reviveCost();
    if (!cost) return;
    const lines = [];
    for (const p of this.players) {
      if (!p.out || !this.revivePayer(p)) continue;
      lines.push((this.players.length > 1 ? ROMAN[p.i] + ': ' : '') + 'FIRE = REVIVE ' + cost);
    }
    if (!lines.length || !((this.frame >> 4) & 1)) return;
    if (this.reviveWait > 0) lines.unshift('LAST CHANCE ' + Math.ceil(this.reviveWait / 60));
    lines.forEach((l, i) => Font.drawCenter(ctx, l, VIEW_W / 2, VIEW_H - 28 - (lines.length - 1 - i) * 10, COL.gold));
  },
});

// =====================================================================
//  Wingman, decoy eagle, smoke screen and bridge kit
//    WINGMAN  (shop) an AI ally tank joins you: it hunts the nearest enemy and shoots; 2 hits; its kills score for you
//    DECOY    (shop) a fake eagle stands in the middle of the field; rushing enemies go for it first (2 hits)
//    SMOKE    (power-up or shop) enemies lose track of you for a while; an enemy that grabs it fades into smoke
//    BRIDGE   (power-up or shop) carried bridge kits: drive into water and a bridge is laid across it
// =====================================================================

const BRIDGE_MAX = 40;   // cells (4px) a single bridge may span

Object.assign(Stage.prototype, {
  // ------------------------------------------------------------ wingman
  spawnWingman(p) {
    // a free player entry point if there is one, else beside its owner
    const used = new Set(this.players.map(q => q.i));
    let at = PLAYER_SPAWN.find((s, i) => !used.has(i));
    if (!at) at = [Math.min(FW - 16, PLAYER_SPAWN[p.i][0] + 16), PLAYER_SPAWN[p.i][1]];
    this.spawns.push({ x: at[0], y: at[1], t: SPARKLE_TIME, ally: p });
  },

  makeWingman(s) {
    const t = new Tank({ x: s.x, y: s.y, dir: 0, isPlayer: true, ally: true, player: s.ally, hp: 2, shield: 120,
      speed: 0.75 * Config.scale('pSpeed'), bulletSpeed: 4.5 * Config.scale('pShell'), maxBullets: 1 });
    this.tanks.push(t);
    this.popups.push({ x: s.x + 8, y: s.y, text: 'WINGMAN', label: true, color: COL.white, t: 0, delay: 0 });
  },

  nearestEnemy(t) {
    let best = null, bd = Infinity;
    for (const o of this.tanks) {
      if (!o.alive || o.isPlayer) continue;
      const d = Math.abs(o.x - t.x) + Math.abs(o.y - t.y);
      if (d < bd) { bd = d; best = o; }
    }
    return best;
  },

  updateAlly(t) {
    if (t.shield > 0) t.shield--;
    if (t.cool > 0) t.cool--;
    if (t.frozen > 0) { t.frozen--; t.moving = false; return; }
    if (this.over || this.freezeP > 0) { t.moving = false; return; }
    const foe = this.nearestEnemy(t);
    if (!foe) { t.moving = false; return; }
    // path to the target (rebuilt three times a second)
    if (!t.nav || this.frame - t.nav.at >= 20 || t.nav.foe !== foe) {
      const NX = COLS * 2 - 1, NY = ROWS * 2 - 1;
      const bx = Math.max(0, Math.min(NX - 1, Math.round(foe.x / 8))), by = Math.max(0, Math.min(NY - 1, Math.round(foe.y / 8)));
      t.nav = { dist: this.navField([by * NX + bx]), at: this.frame, foe };
    }
    const dx = foe.x - t.x, dy = foe.y - t.y;
    const lined = Math.abs(dx) < 6 || Math.abs(dy) < 6;
    if (lined && this.clearLine(t.x + 8, t.y + 8, foe.x + 8, foe.y + 8)) {
      // lined up: turn and fire (never across the eagle)
      this.faceTarget(t, foe.x + 8, foe.y + 8);
      t.moving = false;
      if (t.cool === 0 && !this.eagleInLine(t.x + 8, t.y + 8, foe.x + 8, foe.y + 8) && this.fire(t)) t.cool = 20;
      return;
    }
    const ok = this.move(t, t.dir);
    t.moving = ok;
    if (!ok) {
      if (this.brickAhead(t) && t.cool === 0 && !this.eagleInLine(t.x + 8, t.y + 8, t.x + 8 + DXY[t.dir][0] * 64, t.y + 8 + DXY[t.dir][1] * 64)) {
        if (this.fire(t)) t.cool = 20;
      } else if (++t.blocked > 8) { this.followField(t, t.nav.dist, true); t.blocked = 0; }
    } else {
      t.blocked = 0;
      if ((t.x & 7) === 0 && (t.y & 7) === 0) this.followField(t, t.nav.dist, false);
    }
  },

  hitAlly(t) {
    if (!t.alive || t.shield > 0) return;
    if (--t.hp > 0) { t.shield = 60; Sound.play('armor'); return; }
    t.alive = false;
    this.addFx(t.x + 8, t.y + 8, BIG_EXPLOSION(), 5);
    Sound.play('explode');
  },

  // ------------------------------------------------------------ decoy eagle
  placeDecoy() {
    // the free 16px spot nearest the middle of the field
    const cx = ((FW >> 1) - 8) >> 3, cy = Math.round(FH * 0.42 / 8);
    for (let r = 0; r < 14; r++) {
      for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const x = (cx + dx) * 8, y = (cy + dy) * 8;
        if (x < 0 || y < 40 || x > FW - 16 || y > FH - 64) continue;
        let bad = false;
        for (let yy = y >> 2; yy < (y + 16) >> 2; yy++) for (let xx = x >> 2; xx < (x + 16) >> 2; xx++) if (this.get(xx, yy) !== T_EMPTY) bad = true;
        if (bad || this.tanks.some(o => o.alive && overlap(o.x, o.y, 16, 16, x, y, 16, 16))) continue;
        this.decoy = { x, y, hp: 2, flash: 0 };
        this.navBaseF = {};
        this.popups.push({ x: x + 8, y, text: 'DECOY', label: true, color: '#C8A850', t: 0, delay: 0 });
        return;
      }
    }
  },

  // where the enemies think the eagle is
  // (big maps: the nearest eagle still standing to tank t)
  baseTarget(t) {
    const goals = this.baseGoals();
    if (!goals.length) return { x: BASE_X, y: BASE_Y };
    if (!t || goals.length === 1) return goals[0];
    return goals.reduce((a, g) => (Math.abs(g.x - t.x) + Math.abs(g.y - t.y) < Math.abs(a.x - t.x) + Math.abs(a.y - t.y) ? g : a));
  },

  hitDecoy() {
    const d = this.decoy;
    d.flash = 20;
    if (--d.hp > 0) { Sound.play('armor'); return; }
    this.addFx(d.x + 8, d.y + 8, BIG_EXPLOSION(), 6);
    this.decoy = null;
    this.navBaseF = {};
    Sound.play('explode');
  },

  // ------------------------------------------------------------ bridges
  // a player tank stuck at water with a bridge kit lays a bridge straight across
  layBridge(t) {
    const d = t.dir, cells = [];
    const across = (d & 1) ? [t.y >> 2, (t.y + 15) >> 2] : [t.x >> 2, (t.x + 15) >> 2];
    let along = [(t.y >> 2) - 1, (t.x + 16) >> 2, (t.y + 16) >> 2, (t.x >> 2) - 1][d];
    const step = d === 0 || d === 3 ? -1 : 1;
    for (let n = 0; n < BRIDGE_MAX; n++, along += step) {
      let water = false;
      for (let a = across[0]; a <= across[1]; a++) {
        const [cx, cy] = (d & 1) ? [along, a] : [a, along];
        if (this.get(cx, cy) === T_WATER) { water = true; cells.push([cx, cy]); }
      }
      if (!water) break;
    }
    if (!cells.length) return false;
    for (const [cx, cy] of cells) this.set(cx, cy, T_BRIDGE);
    Sound.play('build');
    return true;
  },

  waterAhead(t) {
    const [x0, y0, x1, y1] = [[t.x, t.y - 4, t.x + 15, t.y - 1], [t.x + 16, t.y, t.x + 19, t.y + 15],
      [t.x, t.y + 16, t.x + 15, t.y + 19], [t.x - 4, t.y, t.x - 1, t.y + 15]][t.dir];
    for (let cy = y0 >> 2; cy <= y1 >> 2; cy++) for (let cx = x0 >> 2; cx <= x1 >> 2; cx++) if (this.get(cx, cy) === T_WATER) return true;
    return false;
  },

  // ------------------------------------------------------------ drawing
  renderDecoy(ctx) {
    const d = this.decoy;
    if (!d) return;
    if (d.flash > 0) d.flash--;
    ctx.drawImage(Sprites.outline(Sprites.eagle, d.flash > 0 && (d.flash >> 2) & 1 ? COL.white : '#C8A850'), d.x - 1, d.y - 1);
    ctx.drawImage(Sprites.eagle, d.x, d.y);
  },

  renderSmoke(ctx, t) {
    ctx.fillStyle = 'rgba(200,200,200,0.35)';
    for (let k = 0; k < 6; k++) {
      const a = k * 1.05 + this.frame * 0.05, r = 7 + ((k * 3 + (this.frame >> 3)) % 4);
      const x = t.x + 8 + Math.cos(a) * r, y = t.y + 8 + Math.sin(a) * r;
      ctx.fillRect(Math.round(x) - 3, Math.round(y) - 3, 6, 6);
    }
  },
});
