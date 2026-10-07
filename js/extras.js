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
        if (!t.alive || t.isPlayer !== tu.enemy) continue;
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
    if (payer) payer.score -= reviveCost();
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
    if (p.score >= cost) return p;
    const rich = this.players.filter(q => q !== p && q.score >= cost).sort((a, b) => b.score - a.score);
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
    lines.forEach((l, i) => Font.drawCenter(ctx, l, FW / 2, FH - 28 - (lines.length - 1 - i) * 10, COL.gold));
  },
});
