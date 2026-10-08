'use strict';
// =====================================================================
//  Computer bots for DEATHMATCH with one player: players II-IV are driven by the computer instead of a keyboard.
//  A bot heads for the nearest rival along the route field, lines up and fires once it has had a moment to aim
//  (quicker on harder skills), grabs a power-up when one lands close by, shoots bricks in its way, and backs out of
//  dead ends. Bots play the same rules as you: same tanks, frags, power-ups and respawns. In KILL RACE they go
//  after the enemy tanks instead, racing you for kills.
// =====================================================================

const DM_BOTS = 3, BOT_RANGE = 176, BOT_PU_RANGE = 80;

Object.assign(Stage.prototype, {
  // what a bot "presses" this frame (same shape as Input.player)
  botInput(t) {
    const b = t.botAi || (t.botAi = { dir: rnd(4), stuck: 0, lx: t.x, ly: t.y, wander: 0, aim: 0 });
    const idle = { dir: -1, fire: false, firePressed: false, alt: false, altPressed: false };
    // stuck against something: drive off somewhere else for a bit
    if (t.x === b.lx && t.y === b.ly) b.stuck++; else { b.stuck = 0; b.lx = t.x; b.ly = t.y; }
    if (b.stuck > 24) { b.wander = 30 + rnd(30); b.dir = rnd(4); b.stuck = 0; }
    // the nearest rival you can see (smoke hides you from bots too); in KILL RACE the rivals are the enemy tanks
    const rival = o => (this.race ? !o.isPlayer : o.isPlayer && !o.ally && o.player !== t.player);
    let tgt = null, bd = Infinity;
    for (const o of this.tanks) {
      if (!o.alive || o === t || !rival(o) || (o.boost && o.boost.smoke)) continue;
      const d = Math.abs(o.x - t.x) + Math.abs(o.y - t.y);
      if (d < bd) { bd = d; tgt = o; }
    }
    let fire = false, aimDir = -1;
    if (tgt) {
      const dx = tgt.x - t.x, dy = tgt.y - t.y;
      const lined = (Math.abs(dx) < 6 || Math.abs(dy) < 6) && bd < BOT_RANGE && this.clearLine(t.x + 8, t.y + 8, tgt.x + 8, tgt.y + 8);
      if (lined) {
        // take aim, then fire
        const want = Math.abs(dx) < 6 ? (dy > 0 ? 2 : 0) : (dx > 0 ? 1 : 3);
        if (++b.aim > Math.round(24 / Math.max(0.3, Config.skill().aggr))) { aimDir = want; fire = t.dir === want; }
      } else b.aim = 0;
    }
    // where to: a power-up close by, else the rival
    const pu = this.powerup;
    const goal = pu && Math.abs(pu.x - t.x) + Math.abs(pu.y - t.y) < BOT_PU_RANGE ? { x: pu.x, y: pu.y, pu: true } : tgt;
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
    // lined up: face the rival and shoot (and keep coming)
    if (aimDir >= 0) {
      if (fire && !this.noBase && this.eagleInLine(t.x + 8, t.y + 8, tgt.x + 8, tgt.y + 8)) fire = false;
      b.dir = aimDir;
      return Object.assign(idle, { dir: aimDir, fire });
    }
    // bricks in the way: shoot through (but not your own eagle's fortress)
    const nearHome = !this.noBase && Math.abs(t.x - BASE_X) < 40 && Math.abs(t.y - BASE_Y) < 40;
    if (t.dir === b.dir && !nearHome && this.brickAhead(t) && Math.random() < 0.1) fire = true;
    // never towards your own eagle
    if (fire && !this.noBase && this.eagleInLine(t.x + 8, t.y + 8, t.x + 8 + DXY[t.dir][0] * FW, t.y + 8 + DXY[t.dir][1] * FH)) fire = false;
    return Object.assign(idle, { dir: b.dir, fire });
  },
});

// "II-PLAYER" or "BOT II"
function playerName(p) { return p && p.bot ? 'BOT ' + ROMAN[p.i] : ROMAN[p ? p.i : 0] + '-PLAYER'; }
