'use strict';
// =====================================================================
//  GALAXY, how it feels: focus mode, B-button gestures, weapon slots and swapping, overheat and the charge blast, the team combo, grazing, screen shake and hit-stop.
//    B       tap (let go within 12 frames): swap to your other weapon; hold (12+ frames): FOCUS, half speed and
//            your hitbox shown; double-tap (2nd press within 14 frames of letting go): a bomb (the tap's swap undone)
//    slots   two weapons: p.gx.weapons = [in hand, other]; p.gx.weapon is the one in hand (the rest reads that)
//    heat    every volley heats the gun (blaster nonstop: ~5 s to 100); at 100 it OVERHEATS: no fire for 1.5 s
//    charge  half a second without firing charges it up over a second; the next press lets go a CHARGE BLAST
//    combo   kills chain within 2 s (3 s in co-op): x1 + 1 for every 8, up to x8; anyone hit breaks it
//    graze   an enemy shot passing close by without hitting: points and the bomb meter (25 grazes: a bomb)
//    juice   screen shake, a tiny hit-stop on big kills and boss phases, slow motion when a ship goes down
// =====================================================================

const GXF = {
  tap: 12, dbl: 14,               // B: a tap is shorter than this; the 2nd press of a double-tap within this
  heatTime: 480,                  // frames of nonstop fire to overheat (every gun, by its cooldown)
  coolDelay: 20, cool: 1.6,       // after this long not firing it cools this much a frame
  overT: 70, overTo: 40,          // overheated: no fire this long, then the heat is back down to this
  chargeWait: 30, chargeTime: 60, // not firing this long starts the charge, full after this long
  blastDmg: 20,                   // the charge blast: x the ship's damage
  comboT: 120, comboMax: 8,       // the combo's window (x1.5 in co-op), its top multiplier
  graze: 10, grazePts: 20, grazeMeter: 4,
};

// the two weapon slots, kept in step with p.gx.weapon (which other code may set directly)
function gxSlots(gp) {
  let w = gp.weapons;
  if (!Array.isArray(w)) w = gp.weapons = [gp.weapon, null];
  if (w[0] !== gp.weapon) { if (w[1] === gp.weapon) w[1] = w[0]; w[0] = gp.weapon; }
  if (w[1] === w[0]) w[1] = null;
  return w;
}
const gxMult = g => (g && g.combo ? Math.min(GXF.comboMax, 1 + Math.floor(g.combo.n / 8)) : 1);
function gxShake(g, frames, i) {
  if (!g) return;
  g.shakeI = g.shake > 0 ? Math.max(g.shakeI || 1, i) : i;
  g.shake = Math.max(g.shake || 0, frames);
}

// ------------------------------------------------------------------ set-up
{
  const _setup = Stage.prototype.setupGalaxy;
  Stage.prototype.setupGalaxy = function (level) {
    const r = _setup.call(this, level), g = this.galaxy;
    Object.assign(g, { combo: { n: 0, t: 0, max: GXF.comboT }, shake: 0, shakeI: 0, stop: 0, slow: 0, blasts: [], sparks: [], hint: level === 1 ? 420 : 0 });
    for (const p of this.players) gxSlots(gxPlayer(p));
    return r;
  };
}

// ------------------------------------------------------------------ every frame: hit-stop, slow motion, then the rest
{
  const _update = Stage.prototype.updateGalaxy;
  Stage.prototype.updateGalaxy = function () {
    const g = this.galaxy;
    if (!g.combo) g.combo = { n: 0, t: 0, max: GXF.comboT };
    g.blasts = g.blasts || []; g.sparks = g.sparks || [];
    if (g.shake > 0) g.shake--;
    if (g.hint > 0) g.hint--;
    // a frozen moment (always counting down): B still listens, so a tap isn't lost
    let skip = false;
    if (g.stop > 0) { g.stop--; skip = true; } else if (g.slow > 0 && (--g.slow & 1)) skip = true;
    if (skip) {
      if (!this.over) for (const t of this.tanks) if (t.alive && t.isPlayer && t.player) this.gxButtonB(t, t.player, gxPlayer(t.player), Input.player(t.player.i));
      return;
    }
    const r = _update.call(this);
    if (!this.galaxy) return r;
    this.gxUpdateBlasts();
    this.gxUpdateGraze();
    for (const s of g.sparks) s.t--;
    g.sparks = g.sparks.filter(s => s.t > 0);
    // the combo runs out (it waits while there's no one to shoot)
    const c = g.combo;
    if (c.n && (g.list.length || g.boss) && --c.t <= 0) {
      if (c.n >= 8) this.popups.push({ x: FW - 34, y: 34, text: 'COMBO ' + c.n, label: true, color: COL.gold, t: 0, delay: 0, life: 60 });
      c.n = 0; c.t = 0;
    }
    return r;
  };
}

// ------------------------------------------------------------------ your ship: focus speed, heat and charge
{
  const _player = Stage.prototype.gxUpdatePlayer;
  Stage.prototype.gxUpdatePlayer = function (t) {
    const p = t.player, gp = gxPlayer(p);
    gxSlots(gp);
    if (!t.gxInit) Object.assign(gp, { focus: false, heat: 0, overT: 0, charge: 0 });   // a new ship: a cool gun, no charge
    const inp = this.over ? null : Input.player(p.i);
    // focus: half speed (the core adds a step's worth to t.acc; half of it is taken back first)
    if (gp.focus && inp && inp.dir >= 0 && !(t.frozen > 1)) t.acc = (t.acc || 0) - (1.4 + 0.3 * gxUp(p, 'engine')) / 2;
    const r = _player.call(this, t);
    if (!inp || !t.alive) return r;
    if (gp.overT > 0) {
      // overheated: it cools off visibly, then it's usable again
      gp.overT--; gp.heat = GXF.overTo + (100 - GXF.overTo) * gp.overT / GXF.overT; gp.charge = 0; t.gxIdle = 0;
      if (this.frame % 6 === 0) Sound.play('gxHiss');
      return r;
    }
    if (t.gxFireF === this.frame) t.gxIdle = 0;
    else {
      t.gxIdle = (t.gxIdle || 0) + 1;
      if (t.gxIdle > GXF.coolDelay) gp.heat = Math.max(0, (gp.heat || 0) - GXF.cool);
      if (t.gxIdle >= GXF.chargeWait && (gp.charge || 0) < 100) {
        gp.charge = Math.min(100, (gp.charge || 0) + 100 / GXF.chargeTime);
        if (gp.charge >= 100) Sound.play('gxCharged');
      }
    }
    if (gp.bombMeter >= 100 && gp.bombs < 5) this.gxBombUp(t);
    return r;
  };
}

// B: tap, hold, double-tap (called by gxUpdatePlayer, and on frozen frames too); once a frame per ship
Stage.prototype.gxButtonB = function (t, p, gp, inp) {
  if (t.gxBF === this.frame) return;
  t.gxBF = this.frame;
  const s = t.gxB || (t.gxB = { down: false, at: 0, rel: -99, tap: false, swapped: false, bomb: false, pop: null }), f = this.frame;
  const down = !!(inp.alt || inp.altPressed), press = !!inp.altPressed || (down && !s.down);
  // let go: short means a tap (swap)
  if (s.down && (!down || inp.altPressed)) {
    if (!s.bomb && f - s.at < GXF.tap) { s.swapped = this.gxSwap(t, p, gp); s.pop = s.swapped ? this.popups[this.popups.length - 1] : null; s.tap = true; s.rel = f; }
    else s.tap = false;
    s.bomb = false;
  }
  if (press) {
    s.at = f; s.bomb = false;
    if (s.tap && f - s.rel <= GXF.dbl) {
      // the second tap: a bomb, and the first tap's swap is undone
      s.tap = false; s.bomb = true;
      if (s.swapped) { this.gxSwap(t, p, gp, true); if (s.pop) s.pop.t = 1e4; }
      s.swapped = false;
      if (gp.bombs > 0) this.gxBomb(t, p);
      else { this.gxSayShip(t, 'NO BOMBS', '#BCBCBC', 40); Sound.play('gxEmpty'); }
    } else s.tap = false;
  }
  s.down = down;
  gp.focus = down && !s.bomb && f - s.at >= GXF.tap;
};

// swap the two weapons; false if there's no second one
Stage.prototype.gxSwap = function (t, p, gp, quiet) {
  const w = gxSlots(gp);
  if (!w[1]) { if (!quiet) Sound.play('gxEmpty'); return false; }
  [w[0], w[1]] = [w[1], w[0]]; gp.weapon = w[0];
  t.gcool = Math.max(t.gcool || 0, 4);
  if (!quiet) { const W = GX_WEAPONS[w[0]] || GX_WEAPONS.blaster; this.gxSayShip(t, W.name, W.color, 36); Sound.play('gxSwap'); }
  return true;
};

// a word over a ship
Stage.prototype.gxSayShip = function (t, text, color = COL.white, life = 50) { this.popups.push({ x: t.x + 8, y: t.y - 4, text, label: true, color, t: 0, delay: 0, life }); };

// the bomb meter is full: one more bomb
Stage.prototype.gxBombUp = function (t) {
  const gp = gxPlayer(t.player);
  gp.bombMeter = 0; gp.bombs = Math.min(5, gp.bombs + 1);
  this.gxSayShip(t, 'BOMB +1', '#F8B800', 50); Sound.play('pickup');
};

// ------------------------------------------------------------------ firing: overheat, the charge blast
{
  const _fire = Stage.prototype.gxFire;
  Stage.prototype.gxFire = function (t, p, gp) {
    const g = this.galaxy;
    t.gxFireF = this.frame;
    if (gp.overT > 0) return;
    if (gp.charge >= 100) { this.gxChargeBlast(t, p, gp); return; }
    gp.charge = 0;
    const cool0 = t.gcool || 0, nb = g.beams.length;
    const r = _fire.call(this, t, p, gp);
    // heat: by the gun's cooldown, so every gun overheats after the same time of nonstop fire; rapid fire runs cooler
    const cool = 1 - 0.08 * gxUp(p, 'rapid');
    let add = 0;
    if (g.beams.length > nb) add = 100 / GXF.heatTime;   // the laser, every frame it's on
    else if ((t.gcool || 0) > cool0) add = t.gcool / Math.max(0.3, 1 - 0.1 * gxUp(p, 'rapid')) * 100 / GXF.heatTime;
    gp.heat = Math.min(100, (gp.heat || 0) + add * cool);
    if (gp.heat >= 100) {
      gp.heat = 100; gp.overT = GXF.overT; gp.charge = 0;
      this.gxSayShip(t, 'OVERHEAT!', '#F83800', 60);
      Sound.play('gxHiss');
    }
    return r;
  };
}

Stage.prototype.gxChargeBlast = function (t, p, gp) {
  const g = this.galaxy, W = GX_WEAPONS[gp.weapon] || GX_WEAPONS.blaster;
  g.blasts.push({ x: t.x + 8, y: t.y - 6, c: W.color, o: p.i, dmg: GXF.blastDmg * this.gxDmg(p), hit: [], boss: false });
  gp.charge = 0; t.gcool = 14;
  gxShake(g, 10, 2);
  Sound.play('gxBlast');
};

// the charge blasts fly up through everything (their shots too), the boss takes it once
Stage.prototype.gxUpdateBlasts = function () {
  const g = this.galaxy;
  for (const s of g.blasts) {
    s.y -= 5;
    if (s.y < -20) { s.dead = true; continue; }
    const p = this.players[s.o] || this.players[0], x = s.x - 5, y = s.y - 8;
    for (const e of g.list.slice()) {
      if (e.dead || e.warnT > 0 || s.hit.includes(e)) continue;
      const T = GX_TYPES[e.type] || {}, w = e.w || T.w || 10, h = e.h || T.h || 10;
      if (!overlap(x, y, 10, 16, e.x - w / 2, e.y - h / 2, w, h)) continue;
      s.hit.push(e); this.gxHit(e, s.dmg, p);
    }
    g.bullets = g.bullets.filter(b => !(Math.abs(b.x - s.x) < 8 && Math.abs(b.y - s.y) < 10));
    if (!s.boss && g.boss && this.gxBossHitRect(x, y, 10, 16, s.dmg, p)) s.boss = true;
  }
  g.blasts = g.blasts.filter(s => !s.dead);
};

// ------------------------------------------------------------------ grazing: their shots passing close by
Stage.prototype.gxUpdateGraze = function () {
  const g = this.galaxy, pl = this.gxPlayers();
  for (const b of g.bullets) {
    if (b.gz < 0) continue;
    const t = pl.find(q => Math.hypot(q.x + 8 - b.x, q.y + 9 - b.y) < GXF.graze);
    if (t) { b.gz = t.player.i + 1; continue; }
    // it was close and it's gone past without a hit
    if (b.gz > 0) { const q = pl.find(o => o.player.i === b.gz - 1); b.gz = -1; if (q) this.gxGraze(q, b); }
  }
};

Stage.prototype.gxGraze = function (t, b) {
  const g = this.galaxy, p = t.player, gp = gxPlayer(p);
  this.addScore(p, GXF.grazePts * gxMult(g));
  gp.graze = (gp.graze || 0) + 1;
  gp.bombMeter = Math.min(100, (gp.bombMeter || 0) + GXF.grazeMeter);
  if (gp.bombMeter >= 100 && gp.bombs < 5) this.gxBombUp(t);
  g.sparks.push({ x: Math.round((b.x + t.x + 8) / 2), y: Math.round((b.y + t.y + 9) / 2), t: 8 });
  Sound.play('gxGraze');
};

// ------------------------------------------------------------------ kills: the combo, hit-stop on the big ones
{
  const _kill = Stage.prototype.gxKill;
  Stage.prototype.gxKill = function (e, p) {
    const g = this.galaxy, T = GX_TYPES[e.type] || {};
    let extra = 0;
    if (p && g && !e.dead) {
      const c = g.combo || (g.combo = { n: 0, t: 0, max: GXF.comboT });
      c.n++; c.max = Math.round(GXF.comboT * (this.players.length > 1 ? 1.5 : 1)); c.t = c.max;
      extra = (T.pts || 0) * (1 + g.loop) * (gxMult(g) - 1);
    }
    const r = _kill.call(this, e, p);
    if (extra > 0) this.addScore(p, extra);
    if (p && g && (e.w || T.w || 0) >= 16) { g.stop = Math.max(g.stop || 0, 2); gxShake(g, 6, 1); }
    return r;
  };
}

// a bomb shakes the screen
{
  const _bomb = Stage.prototype.gxBomb;
  Stage.prototype.gxBomb = function (t, p) { const r = _bomb.call(this, t, p); gxShake(this.galaxy, 22, 2); return r; };
}

// the boss: a phase change stops the world for a moment; its death shakes it
{
  const _bdmg = Stage.prototype.gxBossDamage;
  Stage.prototype.gxBossDamage = function (dmg, p, bomb) {
    const g = this.galaxy, b = g && g.boss, ph = b ? b.ph : 0;
    const r = _bdmg.call(this, dmg, p, bomb);
    if (b && b.dead) gxShake(g, 40, 3);
    else if (b && b.ph > ph) { g.stop = Math.max(g.stop || 0, 4); gxShake(g, 20, 3); }
    return r;
  };
}

// a ship is hit: the combo breaks; a ship lost: a bigger blast and slow motion
{
  const _hit = Stage.prototype.hitPlayer;
  Stage.prototype.hitPlayer = function (t, by) {
    const g = this.galaxy;
    if (!g || !t || !t.isPlayer || t.ally || !t.alive) return _hit.call(this, t, by);
    const shielded = t.shield > 0, r = _hit.call(this, t, by), c = g.combo;
    if (c && c.n && !shielded) {   // a hit the shield takes costs nothing
      if (c.n >= 8) { this.popups.push({ x: FW - 34, y: 34, text: 'COMBO LOST', label: true, color: '#F83800', t: 0, delay: 0, life: 60 }); Sound.play('gxComboLost'); }
      c.n = 0; c.t = 0;
    }
    if (!t.alive) {
      const gp = t.player && gxPlayer(t.player);
      if (gp) Object.assign(gp, { focus: false, charge: 0, heat: 0, overT: 0 });
      g.slow = 40; gxShake(g, 26, 3);
      for (let k = 0; k < 4; k++) this.fx.push({ x: t.x + 8 + rnd(25) - 12, y: t.y + 8 + rnd(25) - 12, frames: BIG_EXPLOSION(), per: 4, tick: -3 - k * 4 });
      for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; this.fx.push({ x: t.x + 8 + Math.cos(a) * 14, y: t.y + 8 + Math.sin(a) * 14, frames: Sprites.smallExp, per: 3, tick: -6 }); }
    }
    return r;
  };
}

// ------------------------------------------------------------------ weapon boxes and the hangar: two slots
{
  const _collect = Stage.prototype.gxCollect;
  Stage.prototype.gxCollect = function (t, u) {
    if (u.k !== 'box' || GX_PICKUPS.box || !GX_WEAPONS[u.w]) return _collect.call(this, t, u);
    const p = t.player, gp = gxPlayer(p), w = gxSlots(gp), W = GX_WEAPONS[u.w];
    const up = () => { gp.power = Math.min(GX_POWER_MAX, gp.power + 1); this.gxSayShip(t, W.name + ' ' + gp.power, W.color, 50); };
    if (w[0] === u.w) up();   // the one in hand: +1 power
    else if (w[1] === u.w) { w[1] = w[0]; w[0] = u.w; up(); }   // the other one: in hand, +1 power
    else { if (!w[1]) w[1] = w[0]; w[0] = u.w; this.gxSayShip(t, W.name, W.color, 50); }   // a new one: in hand (the old one to slot 2 if it's free)
    gp.weapon = w[0];
    Sound.play('bonus');
  };
}
{
  const _apply = gxShopApply, _status = gxShopStatus;
  gxShopApply = function (item, p) {
    if (item.gxShop !== 'weapon') return _apply(item, p);
    const gp = gxPlayer(p), w = gxSlots(gp);
    if (w[0] === item.weapon_) return;
    w[1] = w[0]; w[0] = item.weapon_; gp.weapon = w[0];
  };
  gxShopStatus = function (item, p) {
    if (item.gxShop === 'weapon' && !p.out) { const w = gxSlots(gxPlayer(p)); if (w[1] === item.weapon_) return { text: 'CARRIED', max: true }; }
    return _status(item, p);
  };
  for (const it of GX_SHOP) if (it && it.gxShop === 'weapon') it.desc = 'IN HAND, THE OLD ONE KEPT';
}

// ------------------------------------------------------------------ drawing
{
  const _render = Stage.prototype.renderGalaxy, noHud = () => {};
  Stage.prototype.renderGalaxy = function (ctx) {
    const g = this.galaxy;
    let dx = 0, dy = 0;
    if (g && g.shake > 0) { const i = Math.min(g.shakeI || 1, Math.ceil(g.shake / 4)); dx = Math.round((Math.random() * 2 - 1) * i); dy = Math.round((Math.random() * 2 - 1) * i); }
    if (dx || dy) { ctx.fillStyle = COL.bg; ctx.fillRect(0, 0, SCREEN_W, SCREEN_H); }
    // the field shakes, the side panel doesn't
    this.renderGalaxyHud = noHud;
    ctx.save(); ctx.translate(dx, dy);
    try {
      _render.call(this, ctx);
      if (g) { ctx.save(); ctx.translate(FX, FY); ctx.beginPath(); ctx.rect(0, 0, VIEW_W, VIEW_H); ctx.clip(); this.gxDrawFeel(ctx); ctx.restore(); }
    } finally { delete this.renderGalaxyHud; ctx.restore(); }
    this.renderGalaxyHud(ctx);
  };
}

Stage.prototype.gxDrawFeel = function (ctx) {
  const g = this.galaxy, f = this.frame;
  // the charge blasts: a fat bolt in the weapon's colour, a white-hot core, a fading tail
  for (const s of g.blasts || []) {
    const x = Math.round(s.x), y = Math.round(s.y);
    ctx.globalAlpha = 0.35; ctx.fillStyle = s.c; ctx.fillRect(x - 7, y - 6, 14, 26); ctx.globalAlpha = 1;
    ctx.fillStyle = s.c; ctx.fillRect(x - 5, y - 8, 10, 18); ctx.fillRect(x - 3, y - 10, 6, 2);
    ctx.fillStyle = (f >> 1) & 1 ? '#F8F8F8' : '#F8F8B8'; ctx.fillRect(x - 2, y - 7, 4, 14);
    ctx.fillStyle = s.c; for (let k = 0; k < 4; k++) ctx.fillRect(x - 1 + ((f + k) % 3) - 1, y + 12 + k * 4, 2, 2);
  }
  for (const s of g.sparks || []) {
    const r = 9 - s.t;
    ctx.fillStyle = '#F8F8F8'; ctx.fillRect(s.x, s.y - 1 - (r >> 1), 1, 3 + (r >> 1) * 2 - 2); ctx.fillRect(s.x - 1 - (r >> 1), s.y, 3 + (r >> 1) * 2 - 2, 1);
    ctx.fillStyle = '#58F8F8'; ctx.fillRect(s.x, s.y, 1, 1);
  }
  // per ship: the charge's glow, the focus ring and hitbox, steam when overheated
  for (const t of this.tanks) {
    if (!t.alive || !t.isPlayer || !t.player || !t.player.gx) continue;
    const gp = t.player.gx, cx = t.x + 8, cy = t.y + 9, W = GX_WEAPONS[gp.weapon] || GX_WEAPONS.blaster;
    if (gp.charge > 0) {
      const full = gp.charge >= 100, r = full ? 12 + Math.sin(f / 3) * 1.5 : 4 + gp.charge * 0.08;
      ctx.globalAlpha = full ? 0.22 : 0.05 + gp.charge * 0.0012; ctx.fillStyle = W.color; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = full ? 0.9 : 0.5; ctx.strokeStyle = full && (f >> 2) & 1 ? '#F8F8F8' : W.color; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;
      if (full) { ctx.fillStyle = '#F8F8F8'; for (let k = 0; k < 4; k++) { const a = f / 8 + k * Math.PI / 2; ctx.fillRect(Math.round(cx + Math.cos(a) * (r + 2)), Math.round(cy + Math.sin(a) * (r + 2)), 1, 1); } }
    }
    if (gp.focus) {
      ctx.globalAlpha = 0.3; ctx.strokeStyle = '#A8E8F8'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(cx, cy, 13, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 0.55; ctx.fillStyle = '#A8E8F8'; for (let k = 0; k < 4; k++) { const a = -f / 20 + k * Math.PI / 2; ctx.fillRect(Math.round(cx + Math.cos(a) * 13) - 1, Math.round(cy + Math.sin(a) * 13) - 1, 2, 2); }
      ctx.globalAlpha = 1;
      // the hitbox: a red ring with a white dot (the ship's only part that counts)
      ctx.fillStyle = '#F83800'; ctx.fillRect(cx - 2, cy - 4, 4, 1); ctx.fillRect(cx - 2, cy + 3, 4, 1); ctx.fillRect(cx - 4, cy - 2, 1, 4); ctx.fillRect(cx + 3, cy - 2, 1, 4);
      ctx.fillRect(cx - 3, cy - 3, 1, 1); ctx.fillRect(cx + 2, cy - 3, 1, 1); ctx.fillRect(cx - 3, cy + 2, 1, 1); ctx.fillRect(cx + 2, cy + 2, 1, 1);
      ctx.fillStyle = '#100808'; ctx.fillRect(cx - 2, cy - 2, 4, 4);
      ctx.fillStyle = '#F8F8F8'; ctx.fillRect(cx - 1, cy - 1, 2, 2);
    }
    // overheated: steam puffs off both sides
    if (gp.overT > 0) for (let k = 0; k < 6; k++) {
      const a = (f * 0.7 + k * 3.4) % 20, side = k & 1 ? 1 : -1, z = a < 7 ? 3 : 2;
      ctx.fillStyle = a < 12 ? '#F8F8F8' : '#A0A0A0'; ctx.fillRect(Math.round(cx + side * (7 + a * 0.4)) - 1, Math.round(cy + 2 - a), z, z);
    }
  }
  // the team combo, top right: the multiplier, the count, the time left
  const c = g.combo;
  if (c && c.n >= 2) {
    const m = gxMult(g), y = g.boss && g.boss.y > -g.boss.h / 2 ? 18 : 3, x1 = VIEW_W - 3, label = c.n + ' HITS', w = Math.max(label.length * 8, 34);
    // no box behind it (it would hide what flies up there): a shadow under the letters, see-through
    const mt = 'X' + m, sh = (t, x, yy, col) => { Font.draw(ctx, t, x + 1, yy + 1, '#000000'); Font.draw(ctx, t, x, yy, col); };
    ctx.globalAlpha = 0.85;
    sh(mt, x1 - mt.length * 8, y + 1, m >= GXF.comboMax ? ((f >> 2) & 1 ? '#F8F8F8' : COL.gold) : m > 1 ? COL.gold : '#BCBCBC');
    sh(label, x1 - label.length * 8, y + 10, '#F8F8F8');
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#3C3C3C'; ctx.fillRect(x1 - w, y + 19, w, 2);
    ctx.fillStyle = c.t < 40 && (f >> 2) & 1 ? '#F8F8F8' : '#58D854'; ctx.fillRect(x1 - w, y + 19, Math.round(w * Math.max(0, c.t) / (c.max || GXF.comboT)), 2);
  }
  // the first sector's hint: what B does
  if (g.hint > 0 && !g.perk) {   // (not over a perk offer)
    const lines = ['TAP B: SWAP WEAPON', 'HOLD B: FOCUS', 'B B: BOMB'], y = Math.round(VIEW_H / 2) - 2;
    ctx.globalAlpha = Math.min(1, g.hint / 30);
    ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillRect(VIEW_W / 2 - 80, y - 4, 160, lines.length * 10 + 6);
    lines.forEach((s, i) => Font.drawCenter(ctx, s, VIEW_W / 2, y + i * 10, i === 0 ? '#58F8F8' : i === 1 ? '#F8F8F8' : '#F8B800'));
    ctx.globalAlpha = 1;
  }
};

// the side panel: the 2nd weapon small beside the first, a heat bar under them, the bomb meter under the bombs
{
  const _hud = Stage.prototype.renderGalaxyHud;
  // tiny digits (3x5) for the power beside the weapons
  const DIG = ['111101101101111', '010110010010111', '111001111100111', '111001111001111', '101101111001001', '111100111001111', '111100111101111', '111001010010010', '111101111101111', '111101111001111'];
  const digit = (ctx, n, x, y, c) => { ctx.fillStyle = c; const d = DIG[n] || DIG[0]; for (let i = 0; i < 15; i++) if (d[i] === '1') ctx.fillRect(x + i % 3, y + Math.floor(i / 3), 1, 1); };
  Stage.prototype.renderGalaxyHud = function (ctx) {
    const r = _hud.call(this, ctx), H = HUD_X, f = this.frame;
    this.players.forEach((p, i) => {
      const y = 20 + i * 34, gp = gxPlayer(p), w = gxSlots(gp);
      // over the core's big power number: the power small, the other weapon as a little crate
      ctx.fillStyle = COL.bg; ctx.fillRect(H + 11, y + 11, SCREEN_W - H - 11, 11);
      ctx.fillStyle = '#100808'; ctx.fillRect(H + 11, y + 11, 5, 10);
      digit(ctx, Math.min(9, gp.power), H + 12, y + 13, gp.power >= GX_POWER_MAX ? '#F8D800' : '#F8F8F8');
      const x2 = H + 17, y2 = y + 13;
      if (w[1] && GX_WEAPONS[w[1]]) {
        const W2 = GX_WEAPONS[w[1]];
        ctx.fillStyle = '#100808'; ctx.fillRect(x2, y2, 7, 7); ctx.fillStyle = '#2038EC'; ctx.fillRect(x2 + 1, y2 + 1, 5, 5);
        ctx.fillStyle = W2.color; ctx.fillRect(x2 + 3, y2 + 1, 1, 5); ctx.fillRect(x2 + 1, y2 + 3, 5, 1);
        ctx.fillRect(x2 + 2, y2 - 2, 3, 2);   // its colour on top, so it reads even this small
      } else { ctx.fillStyle = '#4C4C4C'; for (let k = 0; k < 7; k += 2) { ctx.fillRect(x2 + k, y2, 1, 1); ctx.fillRect(x2 + k, y2 + 6, 1, 1); ctx.fillRect(x2, y2 + k, 1, 1); ctx.fillRect(x2 + 6, y2 + k, 1, 1); } }
      // heat: green, yellow, red; flashing when hot
      const heat = Math.max(0, Math.min(100, gp.heat || 0)), hw = 23, hot = gp.overT > 0 || heat >= 80;
      ctx.fillStyle = '#3C3C3C'; ctx.fillRect(H + 1, y + 22, hw, 2);
      ctx.fillStyle = gp.overT > 0 ? ((f >> 2) & 1 ? '#F83800' : '#F8F8F8') : heat >= 80 ? ((f >> 3) & 1 ? '#F83800' : '#F87830') : heat >= 50 ? '#F8D800' : '#58D854';
      if (!hot || (f >> 2) & 1 || gp.overT > 0) ctx.fillRect(H + 1, y + 22, Math.round(hw * heat / 100), 2);
      // the bomb meter: grazes fill it
      const bm = Math.max(0, Math.min(100, gp.bombMeter || 0));
      ctx.fillStyle = '#3C3C3C'; ctx.fillRect(H, y + 30, 24, 1);
      ctx.fillStyle = bm >= 100 ? COL.gold : '#F8B800'; ctx.fillRect(H, y + 30, Math.round(24 * bm / 100), 1);
    });
    return r;
  };
}

// ------------------------------------------------------------------ online: the combo, shake, blasts, sparks, hint
{
  const _view = Stage.prototype.galaxyView, _apply = Stage.prototype.applyGalaxyView;
  Stage.prototype.galaxyView = function () {
    const v = _view.call(this), g = this.galaxy, c = g.combo || { n: 0, t: 0, max: GXF.comboT };
    v.fe = { c: [c.n, c.t, c.max], sh: [g.shake || 0, g.shakeI || 0], hi: g.hint || 0,
      bl: (g.blasts || []).map(s => [Math.round(s.x), Math.round(s.y), s.c]), sp: (g.sparks || []).map(s => [s.x, s.y, s.t]) };
    return v;
  };
  Stage.prototype.applyGalaxyView = function (v) {
    const r = _apply.call(this, v), g = this.galaxy, fe = v.fe;
    if (!fe) return r;
    g.combo = { n: fe.c[0], t: fe.c[1], max: fe.c[2] };
    g.shake = fe.sh[0]; g.shakeI = fe.sh[1]; g.hint = fe.hi;
    g.blasts = fe.bl.map(a => ({ x: a[0], y: a[1], c: a[2] }));
    g.sparks = fe.sp.map(a => ({ x: a[0], y: a[1], t: a[2] }));
    return r;
  };
}
