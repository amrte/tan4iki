'use strict';
// =====================================================================
//  Abilities of the enemies from the new-enemies design canvas
//    MASON    rebuilds bricks that were shot away (one 8px block every 3 s)
//    MORTAR   stops and lobs a shell over walls at a player; a crosshair marks the spot 1.5 s before impact
//    SKIMMER  glides over water (see canStep and the 'hover' path map)
//    FLAMER   a 2-tile flame jet instead of shells: burns trees, can't be shot down, hurts every tank it touches
//    SPLITTER on its last hit splits into two fast minis that rush the eagle (a blast destroys it whole)
//    MEDIC    repairs one hit on a damaged enemy nearby every 4 s; tanks appearing near it get a shield
//    JAMMER   inside its 3-tile field your shells fly at half speed and timed power-ups stop counting down
//    SPOTTER  marks a player it can see; while marked, every enemy hunts that player and fires more
// =====================================================================

const BUILD_EVERY = 180, BUILD_RANGE = 96;
const HEAL_EVERY = 240, HEAL_RANGE = 96;
const JAM_RADIUS = 48;
const FLAME_LEN = 32, FLAME_TIME = 40;
const MORTAR_MIN = 48, MORTAR_MAX = 208, MORTAR_FLIGHT = 90, MORTAR_RADIUS = 12;
const MARK_TIME = 300, SPOT_RANGE = 176;

Object.assign(Stage.prototype, {
  // ------------------------------------------------------------ spawning and splitting
  enemySpawned(t) {
    t.maxHp = t.hp;
    t.cd = 60 + rnd(90);
    // a medic shields tanks that appear near it
    if (this.tanks.some(m => m.alive && m !== t && kindOf(m) === 'medic' && Math.abs(m.x - t.x) + Math.abs(m.y - t.y) < 64)) t.shield = 120;
  },

  split(t) {
    const st = Config.enemy(16);
    for (const dir of [3, 1]) {
      const m = new Tank({ x: t.x, y: t.y, dir, type: 16, hp: st.hp, speed: st.speed, bulletSpeed: st.bullet, maxBullets: 1, ai: AI.RUSH });
      m.maxHp = m.hp;
      this.tanks.push(m);
    }
    Sound.play('split');
  },

  // the player tank a spotter has marked (not for spotters themselves)
  markedTank(t) {
    const m = this.mark;
    if (!m || (t && kindOf(t) === 'spotter')) return null;
    if (m.p.tank && m.p.tank.alive) return m.p.tank;
    return this.tanks.find(o => o.isPlayer && o.alive && o.player === m.p) || null;   // (online guests)
  },

  jammed(x, y) {
    for (const j of this.jamList || []) if (Math.hypot(j.x + 8 - x, j.y + 8 - y) < JAM_RADIUS) return true;
    return false;
  },

  // ------------------------------------------------------------ flamer and mortar (instead of shells)
  flamerAct(t) {
    if (t.cool > 0 || this.flames.some(f => f.owner === t)) return;
    const pt = this.nearestPlayer(t);
    let go = false;
    if (pt) {
      const dx = pt.x - t.x, dy = pt.y - t.y;
      const ahead = [-dy, dx, dy, -dx][t.dir], side = Math.abs((t.dir & 1) ? dy : dx);
      go = ahead > 0 && ahead < FLAME_LEN + 16 && side < 12;
    }
    // now and then it scorches whatever is in front anyway (trees, other routes)
    if (!go && Math.random() < 0.004) go = true;
    if (!go) return;
    this.flames.push({ owner: t, age: 0, hit: new Set(), x: 0, y: 0, w: 0, h: 0 });
    t.hold = FLAME_TIME;
    t.cool = 100;
    t.reveal = 60;
    Sound.play('flame');
  },

  mortarAct(t) {
    if (--t.cd > 0) return;
    const pt = this.nearestPlayer(t);
    if (!pt) { t.cd = 60; return; }
    const tx = pt.x + 8, ty = pt.y + 8, d = Math.hypot(tx - t.x - 8, ty - t.y - 8);
    if (d < MORTAR_MIN || d > MORTAR_MAX) { t.cd = 30; return; }
    this.faceTarget(t, tx, ty);
    t.hold = 50;
    t.cd = Math.round((220 + rnd(120)) / Config.scale('enemyFire'));
    this.shells.push({ x: tx, y: ty, t: MORTAR_FLIGHT, owner: t });
    Sound.play('mortar');
  },

  // ------------------------------------------------------------ every frame
  updateSpecials() {
    this.jamList = this.tanks.filter(t => t.alive && kindOf(t) === 'jammer');
    for (const t of this.tanks) {
      if (!t.alive || t.isPlayer || this.freezeE > 0) continue;
      const kind = kindOf(t);
      if (kind === 'mason' && --t.cd <= 0) { t.cd = BUILD_EVERY; this.masonBuild(t); }
      if (kind === 'medic' && --t.cd <= 0) { t.cd = HEAL_EVERY; this.medicHeal(t); }
      if (kind === 'spotter') this.spotterLook(t);
    }
    this.updateFlames();
    // mortar shells in flight
    for (const s of this.shells) {
      if (--s.t > 0) continue;
      this.blast(s.x, s.y, MORTAR_RADIUS, false, s.owner, false);
    }
    this.shells = this.shells.filter(s => s.t > 0);
    for (const h of this.heals) h.t--;
    this.heals = this.heals.filter(h => h.t > 0);
    // the mark fades when no spotter has seen the player for a while, or the spotters are gone
    if (this.mark) {
      const spotters = this.tanks.some(t => t.alive && kindOf(t) === 'spotter');
      if (--this.mark.t <= 0 || !spotters || !this.markedTank(null)) this.mark = null;
    }
  },

  masonBuild(t) {
    const orig = this.origTerrain;
    if (!orig) return;
    const cx = t.x + 8, cy = t.y + 8;
    let best = null, bd = BUILD_RANGE;
    // 8px blocks that were brick when the stage began and have been shot away
    for (let by = Math.max(0, (cy - BUILD_RANGE) >> 3); by <= Math.min(GH / 2 - 1, (cy + BUILD_RANGE) >> 3); by++) {
      for (let bx = Math.max(0, (cx - BUILD_RANGE) >> 3); bx <= Math.min(GW / 2 - 1, (cx + BUILD_RANGE) >> 3); bx++) {
        let missing = false;
        for (let k = 0; k < 4; k++) {
          const i = (by * 2 + (k >> 1)) * GW + bx * 2 + (k & 1);
          if (orig[i] === T_BRICK && this.terrain[i] === T_EMPTY) missing = true;
        }
        if (!missing) continue;
        const d = Math.hypot(bx * 8 + 4 - cx, by * 8 + 4 - cy);
        if (d >= bd) continue;
        // never wall a tank in
        if (this.tanks.some(o => o.alive && overlap(o.x, o.y, 16, 16, bx * 8, by * 8, 8, 8))) continue;
        best = [bx, by]; bd = d;
      }
    }
    if (!best) return;
    const [bx, by] = best;
    for (let k = 0; k < 4; k++) {
      const x = bx * 2 + (k & 1), y = by * 2 + (k >> 1), i = y * GW + x;
      if (orig[i] === T_BRICK && this.terrain[i] === T_EMPTY) this.set(x, y, T_BRICK);
    }
    this.addFx(bx * 8 + 4, by * 8 + 4, [Sprites.sparkle[0], Sprites.sparkle[1]], 4);
    this.heals.push({ x1: cx, y1: cy, x2: bx * 8 + 4, y2: by * 8 + 4, t: 16, build: true });
    Sound.play('build');
  },

  medicHeal(t) {
    let best = null, bd = HEAL_RANGE;
    for (const o of this.tanks) {
      if (!o.alive || o.isPlayer || o === t || o.hp >= (o.maxHp || o.hp)) continue;
      const d = Math.abs(o.x - t.x) + Math.abs(o.y - t.y);
      if (d < bd) { bd = d; best = o; }
    }
    if (!best) return;
    best.hp++;
    this.heals.push({ x1: t.x + 8, y1: t.y + 8, x2: best.x + 8, y2: best.y + 8, t: 24 });
    Sound.play('heal');
  },

  // a spotter sees along its row or column, until steel, brick or trees block the view
  spotterLook(t) {
    for (const o of this.tanks) {
      if (!o.isPlayer || !o.alive) continue;
      const dx = o.x - t.x, dy = o.y - t.y;
      if ((Math.abs(dx) >= 8 && Math.abs(dy) >= 8) || Math.abs(dx) + Math.abs(dy) > SPOT_RANGE) continue;
      if (!this.sightLine(t.x + 8, t.y + 8, o.x + 8, o.y + 8)) continue;
      if (!this.mark || this.mark.p !== o.player) Sound.play('mark');
      this.mark = { p: o.player, t: MARK_TIME };
      return;
    }
  },

  sightLine(x0, y0, x1, y1) {
    const n = Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) / 4);
    for (let i = 1; i < n; i++) {
      const v = this.get(Math.floor((x0 + (x1 - x0) * i / n) / 4), Math.floor((y0 + (y1 - y0) * i / n) / 4));
      if (v === T_STEEL || v === T_BRICK || v === T_FOREST) return false;
    }
    return true;
  },

  updateFlames() {
    for (const f of this.flames) {
      const t = f.owner;
      f.age++;
      if (!t.alive || f.age > FLAME_TIME) { f.done = true; continue; }
      const len = Math.min(FLAME_LEN, f.age * 4), w = 12;
      [f.x, f.y, f.w, f.h] = [[t.x + 2, t.y - len, w, len], [t.x + 16, t.y + 2, len, w], [t.x + 2, t.y + 16, w, len], [t.x - len, t.y + 2, len, w]][t.dir];
      // burn the trees
      for (let cy = Math.max(0, f.y >> 2); cy <= (f.y + f.h - 1) >> 2; cy++) {
        for (let cx = Math.max(0, f.x >> 2); cx <= (f.x + f.w - 1) >> 2; cx++) if (this.get(cx, cy) === T_FOREST) this.set(cx, cy, T_EMPTY);
      }
      // and every tank in reach, its own side too (once per jet)
      for (const o of this.tanks.slice()) {
        if (!o.alive || o === t || f.hit.has(o) || !overlap(o.x, o.y, 16, 16, f.x, f.y, f.w, f.h)) continue;
        f.hit.add(o);
        if (o.isPlayer) this.hitPlayer(o); else this.hitEnemy(o, null);
      }
    }
    this.flames = this.flames.filter(f => !f.done);
  },

  // ------------------------------------------------------------ drawing
  // under the tanks: jammer fields
  renderSpecialsUnder(ctx) {
    for (const j of this.tanks) {
      if (!j.alive || kindOf(j) !== 'jammer') continue;
      const cx = j.x + 8, cy = j.y + 8, r = JAM_RADIUS - 2 + ((this.frame >> 3) & 3);
      ctx.fillStyle = (this.frame >> 4) & 1 ? '#686878' : '#3C3C50';
      for (let a = 0; a < 40; a++) {
        const ang = (a / 40) * Math.PI * 2 + this.frame * 0.01;
        ctx.fillRect(Math.round(cx + Math.cos(ang) * r), Math.round(cy + Math.sin(ang) * r), 2, 2);
      }
    }
  },

  // over the tanks: flames, repair beams, mortar crosshairs, the spotter's mark
  renderSpecialsOver(ctx) {
    const fire = ['#F8F8F8', '#F8D878', '#F87830', '#D82800'];
    for (const f of this.flames) {
      for (let k = 0; k < 18; k++) {
        const px = f.x + ((k * 37 + this.frame * 13) % Math.max(1, f.w)), py = f.y + ((k * 53 + this.frame * 7) % Math.max(1, f.h));
        ctx.fillStyle = fire[(k + (this.frame >> 1)) & 3];
        ctx.fillRect(px - 1, py - 1, 3, 3);
      }
    }
    for (const h of this.heals) {
      ctx.fillStyle = h.build ? '#F8B800' : ((h.t >> 1) & 1 ? '#F8F8F8' : '#D82800');
      const n = Math.max(1, Math.round(Math.hypot(h.x2 - h.x1, h.y2 - h.y1) / 3));
      for (let i = 0; i <= n; i += 1) {
        if ((i + (h.t >> 1)) % 2) continue;
        ctx.fillRect(Math.round(h.x1 + (h.x2 - h.x1) * i / n) - 1, Math.round(h.y1 + (h.y2 - h.y1) * i / n) - 1, 2, 2);
      }
    }
    for (const s of this.shells) {
      if ((s.t >> 2) & 1 && s.t > 20) continue;
      const r = 4 + Math.round(s.t / 10);
      ctx.fillStyle = s.t < 20 ? '#F83800' : '#F8F8F8';
      ctx.fillRect(s.x - r, s.y, r * 2 + 1, 1);
      ctx.fillRect(s.x, s.y - r, 1, r * 2 + 1);
      ctx.fillRect(s.x - 1, s.y - 1, 3, 3);
    }
    const mt = this.markedTank(null);
    if (mt && (this.frame >> 3) & 1) {
      ctx.fillStyle = '#F83800';
      for (const [x, y, w, h] of [[-2, -2, 5, 1], [-2, -2, 1, 5], [13, -2, 5, 1], [17, -2, 1, 5], [-2, 17, 5, 1], [-2, 13, 1, 5], [13, 17, 5, 1], [17, 13, 1, 5]]) {
        ctx.fillRect(mt.x + x, mt.y + y, w, h);
      }
    }
  },
});
