'use strict';
// =====================================================================
//  KILL RACE, part II (race.js runs the round, bots.js the deathmatch bots):
//    no friendly fire  your shells pass through the other racers (stage.js asks this.race)
//    sharper bots      they react and aim quicker, lead a moving target, shoot down or sidestep shells coming at
//                      them, go for the enemy nearest along the roads (and gladly for a golden one), pick up
//                      power-ups from further off, and drive a quarter faster than before
//    GOLDEN TANK       twice a round a gold enemy rolls in (announced): tougher and quicker, worth 3 kills
//    KILL STREAK       3 kills in a row, each within 5 seconds of the last, without being destroyed: a power-up
//                      drops right where you are (again at 6, 9 ...)
//    FINAL RUSH        the last 4 enemies of a round count double
//    THE CROWN         the round's leader wears a crown, and the enemy tanks go for the crown first
//    decided early     the round ends as soon as nobody can catch the leader any more: the enemies left blow up
//  Bonus kills (gold, rush) go to p.raceBonus, which raceTally (race.js) adds to the kills.
// =====================================================================

const RACE_BOT_SPEED = 1.25, RACE_GOLD = 3, RACE_GOLD_HP = 3, RACE_RUSH = 4, RACE_STREAK_N = 3, RACE_STREAK_T = 300;
const RACE_BOT_RANGE = 320, RACE_BOT_PU = 160, RACE_CROWN_PULL = 96;

// what an enemy (a queue item, a sparkle, a tank) is worth, before the rush doubles it
const raceValue = o => (o && (o.raceGold || (o.extra && o.extra.raceGold)) ? RACE_GOLD : 1);

Object.assign(Stage.prototype, {
  // the enemies still to come or on the field (queue items, sparkles about to hatch, tanks)
  raceLeft() {
    return [...this.queue, ...this.spawns.filter(s => s.enemy).map(s => s.enemy), ...this.tanks.filter(t => t.alive && !t.isPlayer && !t.mirage)];
  },

  // the most kills anyone could still add: everything left, the last RACE_RUSH of it counted twice
  raceMaxLeft() {
    const v = this.raceLeft().map(raceValue).sort((a, b) => b - a);
    return v.reduce((a, n) => a + n, 0) + v.slice(0, RACE_RUSH).reduce((a, n) => a + n, 0);
  },

  // the round's leader (a player), or null while it's level (stage.race keeps its index, lead: it goes online as is)
  raceLeader() {
    const rows = this.players.map(p => raceTally(p).kills), best = Math.max(...rows);
    return best > 0 && rows.filter(k => k === best).length === 1 ? this.players[rows.indexOf(best)] : null;
  },
  raceLead() { const R = this.race; return R && R.lead >= 0 ? this.players[R.lead] || null : null; },

  // a kill in the race: gold and the rush count extra, a streak drops a power-up
  raceKill(t, p) {
    const left = this.raceLeft().length + 1;   // this one included
    let v = raceValue(t), why = t.raceGold ? 'GOLD' : '';
    if (left <= RACE_RUSH && this.race.total > RACE_RUSH) { v *= 2; why = why ? 'GOLD X2' : 'RUSH'; }
    if (v > 1) {
      p.raceBonus = (p.raceBonus || 0) + v - 1;
      this.popups.push({ x: t.x + 8, y: t.y - 2, text: '+' + v + ' ' + why, label: true, color: COL.gold, t: 0, delay: 0, life: 80 });
    }
    // the streak, kept on the tank (destroyed: a new tank starts again; too long since the last kill: so does it)
    const me = p.tank;
    if (!me || !me.alive) return;
    const s = me.raceStreak;
    me.raceStreak = s && this.frame - s.at <= RACE_STREAK_T ? { at: this.frame, n: s.n + 1 } : { at: this.frame, n: 1 };
    const n = me.raceStreak.n;
    if (n >= RACE_STREAK_N && n % RACE_STREAK_N === 0) {
      this.spawnPowerup();
      if (this.powerup) { this.powerup.x = Math.max(0, Math.min(FW - 16, Math.round(me.x / 8) * 8)); this.powerup.y = Math.max(0, Math.min(FH - 16, Math.round(me.y / 8) * 8)); }
      this.popups.push({ x: me.x + 8, y: me.y - 10, text: n === RACE_STREAK_N ? 'KILL STREAK!' : 'STREAK X' + n + '!', label: true, color: COL.white, t: 0, delay: 0, life: 90 });
      Sound.play('bonus');
    }
  },

  raceBanner(text, color = COL.gold) {
    this.popups.push({ x: FW / 2, y: FH / 2 - 8, text, label: true, color, t: 0, delay: 0, life: 150 });
  },

  // a racing bot: KILL RACE's own, sharper than the deathmatch one
  raceBotInput(t) {
    const b = t.botAi || (t.botAi = { dir: rnd(4), stuck: 0, lx: t.x, ly: t.y, wander: 0, aim: 0, pick: 0, tgt: null });
    const idle = { dir: -1, fire: false, firePressed: false, alt: false, altPressed: false };
    const aggr = Math.max(0.5, Config.skill().aggr || 1);
    if (t.x === b.lx && t.y === b.ly) b.stuck++; else { b.stuck = 0; b.lx = t.x; b.ly = t.y; }
    if (b.stuck > 14) { b.wander = 10 + rnd(14); b.dir = (b.dir + (rnd(2) ? 1 : 3)) % 4; b.stuck = 0; }
    const cx = t.x + 8, cy = t.y + 8;
    // 1. a shell coming at it: shoot it down if it's facing it, else get out of its line
    for (const s of this.bullets) {
      if (!s.alive || s.isPlayer) continue;
      const sx = s.x + 2, sy = s.y + 2, [ux, uy] = DXY[s.dir], ax = cx - sx, ay = cy - sy, along = ax * ux + ay * uy, off = Math.abs(ax * uy - ay * ux);
      if (along <= 0 || along > 72 || off > 10) continue;
      const back = (s.dir + 2) % 4;
      if (t.dir === back && t.cool === 0) return Object.assign(idle, { dir: back, fire: true, firePressed: true });
      const side = [(s.dir + 1) % 4, (s.dir + 3) % 4], pick = side.find(d => !this.blockedDir || !this.blockedDir(t, d)) ?? side[rnd(2)];
      b.wander = 8; b.dir = side.includes(b.dir) ? b.dir : pick;
      return Object.assign(idle, { dir: b.dir });
    }
    // 2. the target: the enemy nearest along the roads (a golden one counts as much nearer); kept for a moment
    if (--b.pick <= 0 || !b.tgt || !b.tgt.alive) {
      b.pick = 20; b.tgt = null;
      const foes = this.tanks.filter(o => o.alive && !o.isPlayer && !(o.boost && o.boost.smoke));
      if (foes.length) {
        const NX = COLS * 2 - 1, node = (x, y) => Math.max(0, Math.min(ROWS * 2 - 2, Math.round(y / 8))) * NX + Math.max(0, Math.min(NX - 1, Math.round(x / 8)));
        const dist = this.navField([node(t.x, t.y)]);
        let bd = Infinity;
        for (const o of foes) {
          const d = (dist[node(o.x, o.y)] ?? Infinity) - (o.raceGold ? 30 : 0);
          const dd = d === Infinity ? 999 + Math.abs(o.x - t.x) + Math.abs(o.y - t.y) : d;
          if (dd < bd) { bd = dd; b.tgt = o; }
        }
      }
    }
    const tgt = b.tgt;
    // 3. lined up with where it will be when the shell gets there: face it and fire (quickly)
    let fire = false, aimDir = -1;
    if (tgt) {
      const d0 = Math.abs(tgt.x - t.x) + Math.abs(tgt.y - t.y), k = tgt.moving !== false ? d0 / Math.max(2, t.bulletSpeed) : 0;
      const [mx, my] = DXY[tgt.dir] || [0, 0];
      for (const [px, py] of [[tgt.x + mx * tgt.speed * k, tgt.y + my * tgt.speed * k], [tgt.x, tgt.y]]) {
        const dx = px - t.x, dy = py - t.y;
        if ((Math.abs(dx) < 5 || Math.abs(dy) < 5) && Math.abs(dx) + Math.abs(dy) < RACE_BOT_RANGE && this.clearLine(cx, cy, px + 8, py + 8)) {
          aimDir = Math.abs(dx) < 5 ? (dy > 0 ? 2 : 0) : (dx > 0 ? 1 : 3);
          break;
        }
      }
      if (aimDir >= 0) { if (++b.aim > Math.round(5 / aggr)) fire = t.dir === aimDir; } else b.aim = 0;
    }
    if (aimDir >= 0) { b.dir = aimDir; return Object.assign(idle, { dir: aimDir, fire, firePressed: fire }); }
    // 4. where to: a power-up within reach, else the target
    const pu = this.powerup;
    const goal = pu && Math.abs(pu.x - t.x) + Math.abs(pu.y - t.y) < RACE_BOT_PU ? { x: pu.x, y: pu.y, pu: true } : tgt;
    if (b.wander > 0) b.wander--;
    else if (goal && (t.x & 7) === 0 && (t.y & 7) === 0) {
      const NX = COLS * 2 - 1, node = (x, y) => Math.max(0, Math.min(ROWS * 2 - 2, Math.round(y / 8))) * NX + Math.max(0, Math.min(NX - 1, Math.round(x / 8)));
      const dist = goal.pu ? this.navField([node(goal.x, goal.y)]) : this.navPlayer(goal);
      const bx = t.x >> 3, by = t.y >> 3;
      let best = -1, bv = Infinity;
      for (let d = 0; d < 4; d++) {
        const ux = bx + DXY[d][0], uy = by + DXY[d][1];
        if (ux < 0 || uy < 0 || ux >= NX || uy * NX >= dist.length) continue;
        const v = dist[uy * NX + ux] + (d === b.dir ? -0.01 : 0);
        if (v < bv) { bv = v; best = d; }
      }
      if (best >= 0 && bv < Infinity) b.dir = best;
      else if (Math.random() < 0.1) b.dir = rnd(4);
    }
    // bricks in the way: shoot through
    if (t.dir === b.dir && this.brickAhead(t) && Math.random() < 0.35) fire = true;
    return Object.assign(idle, { dir: b.dir, fire, firePressed: fire });
  },
});

{
  const P = Stage.prototype;

  // the round: two golden tanks in the queue (a third and two thirds of the way through)
  const setup = P.setupRace;
  P.setupRace = function (target, round) {
    const r = setup.apply(this, arguments);
    this.race.total = this.queue.length;
    for (const f of [1 / 3, 2 / 3]) {
      const it = this.queue[Math.floor(this.queue.length * f)];
      if (it) { it.bonus = false; it.hp = RACE_GOLD_HP; it.extra = Object.assign({}, it.extra, { raceGold: true, speedMul: 1.3 }); }
    }
    for (const p of this.players) p.raceBonus = 0;
    return r;
  };

  // a golden one arrives
  const spawned = P.enemySpawned;
  P.enemySpawned = function (t) {
    const r = spawned.apply(this, arguments);
    if (this.race && t.raceGold) { this.raceBanner('GOLDEN TANK! X' + RACE_GOLD); Sound.play('puAppear'); }
    return r;
  };

  // kills: the bonus and the streak
  const kill = P.killEnemy;
  P.killEnemy = function (t, by, award, silent) {
    const counts = this.race && !this.race.done && t.alive && !t.mirage && award && by && by.isPlayer && by.player;
    const r = kill.apply(this, arguments);
    if (counts && !t.alive) this.raceKill(t, by.player);
    return r;
  };

  // each frame: the final rush, the leader (the crown), and whether the round is decided
  const update = P.update;
  P.update = function () {
    const r = update.apply(this, arguments);
    const R = this.race;
    if (!R || this.over || R.done) return r;
    const left = this.raceLeft().length;
    if (!R.rush && left > 0 && left <= RACE_RUSH && R.total > RACE_RUSH) { R.rush = true; this.raceBanner('FINAL RUSH! KILLS X2', COL.white); Sound.play('bonus'); }
    const L = this.raceLeader();
    R.lead = L ? this.players.indexOf(L) : -1;
    // nobody can catch the leader any more: the round's over
    const k = this.players.map(p => raceTally(p).kills).sort((a, b) => b - a);
    if (left > 0 && L && k[0] > (k[1] || 0) + this.raceMaxLeft()) {
      R.done = true;
      this.queue.length = 0;
      this.spawns = this.spawns.filter(s => !s.enemy);
      for (const t of this.tanks) if (t.alive && !t.isPlayer) this.killEnemy(t, null, false, true);
      Sound.play('explode');
      this.raceBanner(playerName(L) + ' TAKES IT!');
    }
    return r;
  };

  // enemies go for the crown first (when it isn't much further than whoever's nearest)
  const nearest = P.nearestPlayer;
  P.nearestPlayer = function (t) {
    const n = nearest.apply(this, arguments), L = this.raceLead(), c = L && L.tank;
    if (!n || !c || !c.alive || c === n || (c.boost && c.boost.smoke)) return n;
    const d = o => Math.abs(o.x - t.x) + Math.abs(o.y - t.y);
    return d(c) <= d(n) + RACE_CROWN_PULL ? c : n;
  };

  // the racing bots
  const botInput = P.botInput;
  P.botInput = function (t) { return this.race ? this.raceBotInput(t) : botInput.apply(this, arguments); };

  // the golden tanks' gleam
  const drawTank = P.drawTank;
  P.drawTank = function (ctx, t) {
    if (this.race && t.raceGold && t.alive && (this.frame >> 2) & 1) ctx.drawImage(Sprites.outline(Sprites.tank('e' + t.type, t.anim, t.dir, 'gold'), COL.gold), t.x - 1, t.y - 1);
    const r = drawTank.apply(this, arguments);
    if (this.race && t.raceGold && t.alive && (this.frame >> 3) & 1) ctx.drawImage(Sprites.tank('e' + t.type, t.anim, t.dir, 'gold'), t.x, t.y);
    return r;
  };
  // (the crown over everything on the field, trees and other tanks too)
  const over = P.renderTdOver;
  P.renderTdOver = function (ctx) {
    const r = over.apply(this, arguments), L = this.raceLead(), t = L && L.tank;
    if (t && t.alive) raceDrawCrown(ctx, t.x + 4, t.y - 7, this.frame);
    return r;
  };
}

// a little gold crown (8x5), its jewels twinkling
function raceDrawCrown(ctx, x, y, f) {
  ctx.fillStyle = '#000000'; ctx.fillRect(x - 1, y + 1, 10, 5);
  ctx.fillStyle = COL.gold;
  ctx.fillRect(x, y + 2, 8, 3); ctx.fillRect(x, y, 1, 2); ctx.fillRect(x + 3, y, 2, 2); ctx.fillRect(x + 7, y, 1, 2);
  ctx.fillStyle = (f >> 3) & 1 ? '#F83800' : '#F8F8F8'; ctx.fillRect(x + 2, y + 3, 1, 1); ctx.fillRect(x + 5, y + 3, 1, 1);
}

// the racing bots drive a quarter faster
{
  const applyLevel = Tank.prototype.applyLevel;
  Tank.prototype.applyLevel = function () {
    const r = applyLevel.apply(this, arguments);
    if (this.player && this.player.bot && Game.mode === 'race') this.speed *= RACE_BOT_SPEED;
    return r;
  };
}
