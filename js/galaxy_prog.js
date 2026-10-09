'use strict';
// =====================================================================
//  GALAXY, progression: the softer death penalty, perks between waves, fair loot, reviving a teammate from their wreck.
//    death   losing a ship still costs 2 power levels, but they spill out of the wreck as power cells that float up
//            and drift slowly down (about 10 s on screen); only you can grab them for the first 6 s, then anyone
//    loot    in co-op, what an enemy drops is the killer's for 3 s (a little mark in their colour under it): nobody
//            else can take it or pull it in with a magnet; the boss's loot is everyone's
//    perks   after waves 2 and 4 of every sector three perk capsules drift in; fly into one to take it (one each per
//            offer); the next wave waits until everyone has picked, or 10 s. FIREPOWER, RAPID, ENGINE, MAGNET (past
//            the hangar's caps), DRONE, ARMOR, BOMBS, POWER, CRIT (10% of your hits do double), LUCK (+50% drops),
//            SHIELD START (a shield at every wave start), LIFE (rarer). Kept in p.gx.perks {key: count}
//    rescue  in co-op, losing your last ship leaves an escape pod blinking SOS in the lower half for 25 s; a
//            teammate who holds their ship over it for 1.5 s brings you back right there (one ship, a 2 s shield)
// =====================================================================

const GX_PERK_EVERY = [2, 4];              // waves after which perks are offered
const GX_PERK_WAIT = 600;                  // 10 s to pick, then the capsules fly off
const GX_LOOT_OWN = 180, GX_CELL_OWN = 360; // 3 s: the killer's loot; 6 s: your own power cells back
const GX_SOS_LIFE = 1500, GX_SOS_HOLD = 90; // the pod lasts 25 s; 1.5 s over it to revive
const GX_NOBODY = { alive: true };         // a pickup nobody may take just now (its owner's ship is down)

// a player's colour (their tank's main shade)
const gxCol = i => (PALS[Config.playerPal(i)] || PALS.p1)[2];
const gxPerkN = (p, k) => ((gxPlayer(p).perks || {})[k] || 0);

// ------------------------------------------------------------------ a tiny 3x5 font (names under the capsules)
// a glyph is five rows of three bits, one octal digit a row
const GX_TINY = {
  A: '25755', B: '65656', C: '34443', D: '65556', E: '74647', F: '74644', G: '34553', H: '55755', I: '72227', J: '11152',
  K: '55655', L: '44447', M: '57755', N: '65555', O: '25552', P: '65644', Q: '25563', R: '65655', S: '34216', T: '72222',
  U: '55557', V: '55552', W: '55775', X: '55255', Y: '55222', Z: '71247', 0: '75557', 1: '26227', 2: '61247', 3: '61216',
  4: '55711', 5: '74616', 6: '34757', 7: '71222', 8: '75757', 9: '75716', '+': '02720', '%': '51245', '!': '22202', '-': '00700',
};
function gxTiny(ctx, text, cx, y, color, shadow = '#100808') {
  text = String(text).toUpperCase();
  const x0 = Math.round(cx - (text.length * 4 - 1) / 2);
  for (const [col, d] of shadow ? [[shadow, 1], [color, 0]] : [[color, 0]]) {
    ctx.fillStyle = col;
    for (let i = 0; i < text.length; i++) {
      const gl = GX_TINY[text[i]];
      if (gl) for (let r = 0; r < 5; r++) for (let b = 0; b < 3; b++) if (+gl[r] & (4 >> b)) ctx.fillRect(x0 + i * 4 + b + d, y + r + d, 1, 1);
    }
  }
}

// ------------------------------------------------------------------ the perks
// can(p): is it any use to p; take: what it does
const gxBump = (k, top) => ({ can: p => gxUp(p, k) < top, take(p, t, gp) { gp.up[k] = gxUp(p, k) + 1; } });
const GX_PERKS = {
  fire: Object.assign({ name: 'FIREPOWER', icon: 'F', col: '#F87830' }, gxBump('fire', 7)),
  rapid: Object.assign({ name: 'RAPID', icon: 'R', col: '#F8D800' }, gxBump('rapid', 7)),
  engine: Object.assign({ name: 'ENGINE', icon: 'E', col: '#3CBCFC' }, gxBump('engine', 5)),
  magnet: Object.assign({ name: 'MAGNET', icon: 'M', col: '#C060E0' }, gxBump('magnet', 5)),
  drone: Object.assign({ name: 'DRONE', icon: 'D', col: '#A8A8C8' }, gxBump('drones', 2)),
  armor: { name: 'ARMOR', icon: 'A', col: '#58B8B0', can: p => gxUp(p, 'armor') < 3, take(p, t, gp) { gp.up.armor = gxUp(p, 'armor') + 1; if (t) t.plates = (t.plates || 0) + 1; } },
  bombs: { name: 'BOMBS', icon: 'B', col: '#F8A8C8', can: p => gxPlayer(p).bombs < 5, take(p, t, gp) { gp.bombs = Math.min(5, gp.bombs + 2); } },
  power: { name: 'POWER', icon: 'P', col: '#58D854', can: p => gxPlayer(p).power < GX_POWER_MAX, take(p, t, gp) { gp.power = Math.min(GX_POWER_MAX, gp.power + 2); } },
  crit: { name: 'CRIT', icon: '!', col: '#58F8F8', can: p => gxPerkN(p, 'crit') < 3 },
  luck: { name: 'LUCK', icon: '*', col: '#B8F818', can: p => gxPerkN(p, 'luck') < 2 },
  shield: { name: 'SHIELD START', icon: 'S', col: '#6888FC', can: p => gxPerkN(p, 'shield') < 3 },
  life: { name: 'LIFE', icon: '+', col: '#F8B800', w: 0.3, ok: () => !Config.infiniteLives(), can: () => true, take(p) { p.lives++; } },
};
// a lighter / darker shade of a colour (f > 0 towards white, < 0 towards black)
function gxShade(col, f) {
  const n = parseInt(col.slice(1), 16), c = [n >> 16, (n >> 8) & 255, n & 255].map(v => Math.round(f > 0 ? v + (255 - v) * f : v * (1 + f)));
  return '#' + c.map(v => v.toString(16).padStart(2, '0')).join('');
}

Object.assign(Stage.prototype, {
  // three different perks drift in (at least one of you must have a use for each)
  gxPerkOffer(g) {
    const live = this.players.filter(p => !p.out);
    const pool = Object.keys(GX_PERKS).filter(k => { const P = GX_PERKS[k]; return (!P.ok || P.ok()) && live.some(p => P.can(p)); }), pick = [];
    while (pick.length < 3 && pool.length) {
      let r = Math.random() * pool.reduce((a, k) => a + (GX_PERKS[k].w || 1), 0), i = 0;
      while (i < pool.length - 1 && (r -= GX_PERKS[pool[i]].w || 1) > 0) i++;
      pick.push(pool.splice(i, 1)[0]);
    }
    g.perkWave = g.wave;
    if (!pick.length) return;   // nothing left that anyone could use
    g.perk = { t: 0, leave: 0, took: {}, caps: pick.map((k, i) => ({ k, x: Math.round(FW * (i + 1) / 4), y: -14 - 12 * i, by: [] })) };
    Sound.play('gxPerkIn');
  },

  gxPerkUpdate(g) {
    if (g.phase === 'between' && GX_PERK_EVERY.includes(g.wave) && g.perkWave !== g.wave && this.players.some(p => !p.out)) this.gxPerkOffer(g);
    const o = g.perk;
    if (!o) return;
    o.t++;
    const ty = Math.round(FH * 0.45);
    for (const c of o.caps) {
      if (c.flash > 0) c.flash--;
      if (o.leave) { c.vy = (c.vy || -0.5) - 0.1; c.y += c.vy; continue; }   // off the top, faster and faster
      if (c.y < ty) c.y = Math.min(ty, c.y + Math.max(0.6, (ty - c.y) * 0.06));
    }
    if (o.leave) { if (o.caps.every(c => c.y < -24)) g.perk = null; return; }
    // fly into one to take it: one each
    for (const t of this.gxPlayers()) {
      if (o.took[t.player.i] !== undefined) continue;
      const c = o.caps.find(c => Math.abs(t.x + 8 - c.x) < 15 && Math.abs(t.y + 8 - c.y) < 11);
      if (c) this.gxPerkTake(t, c, o);
    }
    const live = this.players.filter(p => !p.out);
    if (!live.length || live.every(p => o.took[p.i] !== undefined) || o.t > GX_PERK_WAIT || g.phase !== 'between') o.leave = 1;
  },

  gxPerkTake(t, c, o) {
    const p = t.player, gp = gxPlayer(p), P = GX_PERKS[c.k];
    o.took[p.i] = c.k; c.by.push(p.i);
    const say = (text, color) => this.popups.push({ x: t.x + 8, y: t.y - 4, text, label: true, color, t: 0, delay: 0, life: 70 });
    if (P.can(p)) {
      if (P.take) P.take.call(this, p, t, gp);
      gp.perks = gp.perks || {};
      gp.perks[c.k] = (gp.perks[c.k] || 0) + 1;
      say(P.name + '!', P.col);
    } else { this.addScore(p, 1000); say('MAX! 1000', COL.gold); }
    c.flash = 12;
    Sound.play('gxPerk');
  },

  // whose eyes are on this screen (a capsule greys out once they've all picked)
  gxViewers() {
    if (typeof Net !== 'undefined' && Net.role === 'client') return [Net.slot];
    if (typeof Net !== 'undefined' && Net.role === 'host' && Net.inGame) return this.players.filter(p => (Net.slots[p.i] || 'local') === 'local').map(p => p.i);
    return this.players.map(p => p.i);
  },

  // ------------------------------------------------------------ the escape pod (your last ship lost, in co-op)
  gxSosUpdate(g) {
    for (const p of this.players) if (p.gxSosShield && p.tank && p.tank.alive) { p.tank.shield = 120; p.gxSosShield = false; }   // back, shielded
    if (!g.sos || !g.sos.length) return;
    const pl = this.gxPlayers(), lo = Math.round(FH * 0.5) + 6, hi = FH - 10;
    for (const w of g.sos) {
      const p = this.players.find(q => q.i === w.i);
      if (!p || !p.out) { w.done = true; continue; }   // brought back some other way
      w.t++;
      const by = pl.find(t => t.player !== p && Math.abs(t.x + 8 - w.x) < 11 && Math.abs(t.y + 8 - w.y) < 11);
      if (by) {
        w.prog++; w.by = by.player.i;
        if (w.prog % 18 === 1) Sound.play('gxSosTick');
        if (w.prog >= GX_SOS_HOLD) { this.gxSosRevive(p, w, by.player); w.done = true; }
        continue;   // it holds still while you're on it
      }
      w.prog = Math.max(0, w.prog - 2);
      // drifting about the lower half, bouncing off the edges
      w.x += w.vx; w.y += w.vy + Math.sin(w.t / 30) * 0.12;
      if (w.x < 10 || w.x > FW - 10) { w.vx = -w.vx; w.x = Math.max(10, Math.min(FW - 10, w.x)); }
      if (w.y < lo || w.y > hi) { w.vy = -w.vy; w.y = Math.max(lo, Math.min(hi, w.y)); }
      if (w.t >= GX_SOS_LIFE) { w.done = true; this.addFx(w.x, w.y, Sprites.smallExp, 3); }
    }
    g.sos = g.sos.filter(w => !w.done);
  },

  gxSosRevive(p, w, by) {
    p.out = false; p.lives = 0; this.reviveWait = 0;
    const x = Math.max(0, Math.min(FW - 16, Math.round(w.x - 8))), y = Math.max(Math.round(FH * 0.35), Math.min(FH - 16, Math.round(w.y - 8)));
    this.spawns.push({ x, y, t: 16, player: p });
    p.gxSosShield = true;
    if (by) this.addScore(by, 1000);
    this.popups.push({ x: w.x, y: w.y - 10, text: 'REVIVED!', label: true, color: COL.gold, t: 0, delay: 0, life: 90 });
    Sound.play('life');
  },

  // a crit's little star
  gxCritFx(x, y) { const g = this.galaxy; (g.crits = g.crits || []).push({ x: Math.round(x), y: Math.round(y), t: 10 }); if (g.crits.length > 12) g.crits.shift(); },
});

GX_FRAME.push(function (g) {
  this.gxPerkUpdate(g);
  this.gxSosUpdate(g);
  if (g.crits) { for (const c of g.crits) c.t--; g.crits = g.crits.filter(c => c.t > 0); }
});

// ------------------------------------------------------------------ wrappers
// losing a ship: the 2 power levels spill out as cells you can win back
const _gxpOnDeath = Stage.prototype.gxOnDeath;
Stage.prototype.gxOnDeath = function (p) {
  const gp = gxPlayer(p), was = gp.power, t = p.tank || this.tanks.find(o => o.player === p && o.isPlayer);
  const r = _gxpOnDeath.call(this, p);
  const g = this.galaxy, lost = was - gp.power;
  if (g && t && lost > 0) {
    // they float up, then drift down slowly: about 10 s before they're gone off the bottom
    const ty = Math.max(Math.round(FH * 0.35) + 6, Math.min(t.y + 8, FH + 10 - 0.25 * 600));
    for (let k = 0; k < lost; k++) {
      const n = g.pickups.length;
      this.gxDrop(Math.max(8, Math.min(FW - 8, t.x + 8 + (lost > 1 ? (k ? 7 : -7) : 0))), t.y + 8, 'cell');
      for (const u of g.pickups.slice(n)) Object.assign(u, { owner: p.i, ownT: GX_CELL_OWN, ty: ty - 4 * k, vy: -1 });
    }
  }
  return r;
};

// an enemy shot down by p: its loot is p's for a moment; LUCK: another roll at the drop table
const _gxpKill = Stage.prototype.gxKill;
Stage.prototype.gxKill = function (e, p) {
  const prev = this.gxLootOwner;
  this.gxLootOwner = p && p.i !== undefined && this.players.length > 1 ? p : null;
  try {
    const r = _gxpKill.call(this, e, p), n = p && p.i !== undefined ? gxPerkN(p, 'luck') : 0, T = GX_TYPES[e.type];
    if (n && T && this.galaxy) {
      const big = T.pts >= 200, q = Math.random() / (0.5 * n);
      if (q < (big ? 0.5 : 0.22)) this.gxDrop(e.x, e.y, big && Math.random() < 0.6 ? 'gem' : 'coin');
      else if (q < (big ? 0.58 : 0.25)) this.gxDrop(e.x, e.y, 'cell');
      else if (q < (big ? 0.62 : 0.262)) this.gxDrop(e.x, e.y, 'box');
      else if (q < (big ? 0.64 : 0.268)) this.gxDrop(e.x, e.y, Math.random() < 0.5 ? 'shield' : 'bomb');
    }
    return r;
  } finally { this.gxLootOwner = prev; }
};

const _gxpDrop = Stage.prototype.gxDrop;
Stage.prototype.gxDrop = function (x, y, k) {
  const g = this.galaxy, n = g.pickups.length, r = _gxpDrop.call(this, x, y, k), p = this.gxLootOwner;
  if (p) for (const u of g.pickups.slice(n)) if (u.owner === undefined) { u.owner = p.i; u.ownT = GX_LOOT_OWN; }
  return r;
};

// owned pickups: only the owner's ship may take or pull them (through the core's "on its way to" check)
const _gxpPickups = Stage.prototype.gxUpdatePickups;
Stage.prototype.gxUpdatePickups = function () {
  const g = this.galaxy, held = [];
  for (const u of g.pickups) {
    if (u.ty !== undefined) { if (u.y > u.ty + 1) u.vy = -Math.max(0.5, (u.y - u.ty) * 0.06); else { u.vy = 0.25; delete u.ty; } }   // a cell from a wreck floats up, then drifts
    if (!(u.ownT > 0)) continue;
    if (g.phase === 'clear') { u.ownT = 0; continue; }   // the sector's over: all the loot flies to you
    const t = this.gxPlayers().find(o => o.player.i === u.owner);
    held.push([u, u.to]); u.to = t || GX_NOBODY;
  }
  const r = _gxpPickups.call(this);
  for (const [u, to] of held) { u.to = to; u.ownT--; }
  return r;
};

// CRIT: some of your hits deal double
const _gxpHit = Stage.prototype.gxHit;
Stage.prototype.gxHit = function (e, dmg, p, quiet) {
  const n = p && !e.dead ? gxPerkN(p, 'crit') : 0;
  if (n && Math.random() < 0.1 * n) { dmg *= 2; if (!quiet) this.gxCritFx(e.x, e.y); }
  return _gxpHit.call(this, e, dmg, p, quiet);
};
const _gxpBossDamage = Stage.prototype.gxBossDamage;
Stage.prototype.gxBossDamage = function (dmg, p, bomb) {
  const n = p && !bomb ? gxPerkN(p, 'crit') : 0;
  if (n && Math.random() < 0.1 * n) dmg *= 2;
  return _gxpBossDamage.call(this, dmg, p, bomb);
};

// the next wave waits while perks are on offer; SHIELD START at every wave (and the boss)
const _gxpNextWave = Stage.prototype.gxNextWave;
Stage.prototype.gxNextWave = function () {
  const g = this.galaxy;
  if (g && g.phase === 'between' && g.perk && !g.perk.leave) return;
  const r = _gxpNextWave.apply(this, arguments);
  for (const t of this.gxPlayers()) { const n = gxPerkN(t.player, 'shield'); if (n) t.shield = Math.max(t.shield || 0, 180 * n); }
  return r;
};

// your last ship lost in co-op: an escape pod
const _gxpHitPlayer = Stage.prototype.hitPlayer;
Stage.prototype.hitPlayer = function (t, by) {
  const p = t && !t.ally ? t.player : null, was = p ? p.out : true, x = t && t.x, y = t && t.y;
  const r = _gxpHitPlayer.call(this, t, by);
  const g = this.galaxy;
  if (g && p && !was && p.out && this.players.length > 1 && this.players.some(q => !q.out)) {
    g.sos = g.sos || [];
    g.sos.push({ i: p.i, x: Math.max(10, Math.min(FW - 10, x + 8)), y: Math.max(Math.round(FH * 0.5) + 6, Math.min(FH - 10, y + 8)), t: 0, prog: 0,
      vx: (Math.random() < 0.5 ? -1 : 1) * (0.25 + Math.random() * 0.15), vy: Math.random() < 0.5 ? -0.2 : 0.2 });
    Sound.play('gxSos');
  }
  return r;
};

// ------------------------------------------------------------------ drawing
// pods, capsules and owner marks go under everything that moves (the sector's backdrop hook draws them, so the
// ships, pickups and enemy shots stay on top); crit stars and the PICK A PERK! banner go over the field
const _gxpRender = Stage.prototype.renderGalaxy;
Stage.prototype.renderGalaxy = function (ctx) {
  const g = this.galaxy, sec = g && GX_SECTORS[g.sec];
  if (!sec) return _gxpRender.call(this, ctx);
  const had = Object.prototype.hasOwnProperty.call(sec, 'bg'), bg = sec.bg, self = this;
  sec.bg = function (c, f, gg) { if (bg) bg.call(this, c, f, gg); self.gxRenderUnder(c, g); };
  let r;
  try { r = _gxpRender.call(this, ctx); } finally { if (had) sec.bg = bg; else delete sec.bg; }
  ctx.save();
  ctx.translate(FX, FY);
  ctx.beginPath(); ctx.rect(0, 0, VIEW_W, VIEW_H); ctx.clip();
  this.gxRenderOver(ctx, g);
  ctx.restore();
  return r;
};

Object.assign(Stage.prototype, {
  gxRenderUnder(ctx, g) {
    const f = this.frame;
    // whose loot it is: a little mark in their colour under it (co-op only)
    if (this.players.length > 1) for (const u of g.pickups) {
      if (!(u.ownT > 0) || u.owner === undefined || (u.ownT < 50 && (u.ownT >> 2) & 1)) continue;
      const x = Math.round(u.x), y = Math.round(u.y) + 8;
      ctx.fillStyle = '#100808'; ctx.fillRect(x - 3, y - 1, 6, 3);
      ctx.fillStyle = gxCol(u.owner); ctx.fillRect(x - 2, y, 4, 1);
    }
    for (const w of g.sos || []) this.gxDrawPod(ctx, w, f);
    if (g.perk) this.gxDrawPerks(ctx, g.perk, f);
  },

  gxRenderOver(ctx, g) {
    const f = this.frame, o = g.perk;
    // crits: a white star
    for (const c of g.crits || []) {
      const s = c.t > 5 ? 3 : 2;
      ctx.fillStyle = c.t > 5 ? '#F8F8F8' : '#F8F878'; ctx.fillRect(c.x - s, c.y, s * 2 + 1, 1); ctx.fillRect(c.x, c.y - s, 1, s * 2 + 1);
    }
    // a pod being held on to: a ring fills round it (over the ship)
    for (const w of g.sos || []) {
      if (!(w.prog > 0)) continue;
      const x = Math.round(w.x), y = Math.round(w.y + Math.sin(w.t / 12));
      ctx.strokeStyle = '#100808'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, 13, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = (f >> 2) & 1 ? '#F8D800' : '#F8F8F8'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x, y, 13, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, w.prog / GX_SOS_HOLD)); ctx.stroke();
    }
    // the banner above the capsules, and the time left, until all of you here have picked
    if (o && !o.leave && !this.gxPerkDone(o)) {
      const y = Math.round(FH * 0.45) - 34, left = Math.max(0, 1 - o.t / GX_PERK_WAIT);
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, y - 3, VIEW_W, 16);
      Font.drawCenter(ctx, 'PICK A PERK!', VIEW_W / 2, y, (f >> 3) & 1 ? COL.gold : '#F8F8F8');
      ctx.fillStyle = '#F8D800'; ctx.fillRect(Math.round(VIEW_W / 2 - 40 * left), y + 10, Math.round(80 * left), 1);
    }
  },

  // have all the (living) players on this screen picked?
  gxPerkDone(o) {
    const view = this.gxViewers().filter(i => { const p = this.players.find(q => q.i === i); return p && !p.out; });
    return view.length > 0 && view.every(i => o.took[i] !== undefined);
  },

  // an escape pod: a capsule in its pilot's colour, a beacon and SOS blinking; a ring fills as a teammate holds on
  gxDrawPod(ctx, w, f) {
    const x = Math.round(w.x), y = Math.round(w.y + Math.sin(w.t / 12)), col = gxCol(w.i), left = GX_SOS_LIFE - w.t;
    if (left < 300 && (w.t >> (left < 120 ? 1 : 2)) & 1) return;   // running out: it flickers
    const R = (dx, dy, ww, hh, c) => { ctx.fillStyle = c; ctx.fillRect(x + dx, y + dy, ww, hh); }, light = gxShade(col, 0.5), dark = gxShade(col, -0.45);
    // a distress ring going out from it, in the pilot's colour
    if (!w.prog) { const k = (w.t % 50) / 50; ctx.globalAlpha = 0.7 * (1 - k); ctx.strokeStyle = light; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y, 6 + 16 * k, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1; }
    // the pod: a rounded hull, little fins, a window, a beacon on top
    R(-12, -2, 24, 5, '#100808'); R(-11, -1, 3, 3, dark); R(8, -1, 3, 3, dark);
    R(-9, -3, 18, 7, '#100808'); R(-8, -4, 16, 9, '#100808'); R(-6, -5, 12, 11, '#100808');
    R(-8, -2, 16, 5, col); R(-7, -3, 14, 7, col); R(-5, -4, 10, 9, col);
    R(-5, -4, 6, 1, light); R(-7, -2, 1, 2, light); R(-4, 4, 9, 1, dark); R(6, -1, 1, 3, dark);
    R(-3, -2, 6, 4, '#100808'); R(-2, -1, 4, 2, '#3CBCFC'); R(-2, -1, 1, 1, '#F8F8F8');   // its window
    R(-1, -8, 2, 3, '#100808'); R(-1, -7, 2, 2, '#7C7C7C');
    if ((f >> 3) & 1) { R(-1, -8, 2, 2, '#F8F8F8'); R(-3, -7, 6, 1, '#58F8F8'); R(-1, -10, 2, 1, '#58F8F8'); }   // the beacon blinks
    // SOS and the pilot's number
    if ((f >> 4) & 1) gxTiny(ctx, 'SOS', x, y - 17, '#F8F8F8'); else gxTiny(ctx, ROMAN[w.i] || '', x, y - 17, light);
    // the time it has left
    if (!w.prog) { R(-8, 7, 16, 3, '#100808'); R(-7, 8, Math.max(1, Math.round(14 * left / GX_SOS_LIFE)), 1, light); }
  },

  // the perk capsules: a rounded pill in the perk's colour, its letter, a gold sparkle; the name under it
  gxDrawPerks(ctx, o, f) {
    const view = this.gxViewers(), done = this.gxPerkDone(o);
    o.caps.forEach((c, n) => {
      const P = GX_PERKS[c.k] || GX_PERKS.power, x = Math.round(c.x), y = Math.round(c.y + (o.leave ? 0 : Math.sin((f + n * 20) / 14) * 1.5));
      const grey = done && !o.leave, base = grey ? '#5C5C5C' : P.col, light = gxShade(base, 0.55), dark = gxShade(base, -0.45);
      const R = (dx, dy, ww, hh, col) => { ctx.fillStyle = col; ctx.fillRect(x + dx, y + dy, ww, hh); };
      if (!grey) { ctx.globalAlpha = 0.18 + 0.1 * Math.sin(f / 6 + n); ctx.fillStyle = P.col; ctx.beginPath(); ctx.arc(x, y, 17, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; }   // a soft glow
      // the pill: a medicine capsule, its colour on the left, a paler right half; a shine on top, a shadow below
      R(-12, -6, 24, 13, '#100808'); R(-13, -5, 26, 11, '#100808'); R(-14, -3, 28, 7, '#100808');
      R(-11, -5, 22, 11, base); R(-12, -4, 24, 9, base); R(-13, -2, 26, 5, base);
      R(0, -5, 11, 11, light); R(0, -4, 12, 9, light); R(0, -2, 13, 5, light);
      R(-10, -5, 8, 1, gxShade(base, 0.75)); R(-12, -3, 1, 3, gxShade(base, 0.75)); R(-10, 5, 20, 1, dark); R(11, -2, 1, 4, gxShade(light, -0.3)); R(-10, -4, 2, 1, '#F8F8F8');
      // its letter on a dark window (LIFE: a little tank)
      R(-5, -4, 10, 9, '#100808');
      if (c.k === 'life' && !grey) ctx.drawImage(Sprites.playerIcon(Config.playerPal(view.length ? view[0] : 0)), x - 4, y - 4);
      else Font.draw(ctx, P.icon, x - 3, y - 3, grey ? '#9C9C9C' : gxShade(base, 0.3));
      if (c.flash > 0) { ctx.globalAlpha = c.flash / 16; R(-13, -5, 26, 11, '#F8F8F8'); ctx.globalAlpha = 1; }
      // who took this one: a pip each, in their colour
      c.by.forEach((i, k) => { R(-c.by.length * 3 + k * 6, 19, 5, 3, '#100808'); R(-c.by.length * 3 + k * 6 + 1, 20, 3, 1, gxCol(i)); });
      // a gold sparkle hopping round it
      if (!grey) {
        const tw = ((f + n * 8) >> 3) & 3, sx = x + [-14, 13, 13, -14][tw], sy = y + [-7, -7, 7, 7][tw];
        if ((((f + n * 8) >> 2) & 1) === 0) { ctx.fillStyle = '#F8D800'; ctx.fillRect(sx, sy - 2, 1, 5); ctx.fillRect(sx - 2, sy, 5, 1); ctx.fillStyle = '#F8F8F8'; ctx.fillRect(sx, sy, 1, 1); }
      }
      if (!o.leave) gxTiny(ctx, P.name, x, y + 12, grey ? '#7C7C7C' : '#F8F8F8');
    });
  },
});

// ------------------------------------------------------------------ online: the guest sees the capsules, pods and owners
const _gxpView = Stage.prototype.galaxyView;
Stage.prototype.galaxyView = function () {
  const v = _gxpView.call(this), g = this.galaxy, r = n => Math.round(n * 10) / 10;
  v.pk = g.perk ? { t: g.perk.t, lv: g.perk.leave, tk: g.perk.took, c: g.perk.caps.map(c => [c.k, r(c.x), r(c.y), c.by.slice(), c.flash || 0]) } : null;
  v.so = (g.sos || []).map(w => [w.i, r(w.x), r(w.y), w.t, w.prog]);
  v.uo = g.pickups.map(u => (u.ownT > 0 ? [u.owner, u.ownT] : 0));
  v.cr = g.crits && g.crits.length ? g.crits.map(c => [c.x, c.y, c.t]) : null;
  return v;
};
const _gxpApply = Stage.prototype.applyGalaxyView;
Stage.prototype.applyGalaxyView = function (v) {
  const r = _gxpApply.call(this, v), g = this.galaxy;
  g.perk = v.pk ? { t: v.pk.t, leave: v.pk.lv, took: v.pk.tk || {}, caps: v.pk.c.map(a => ({ k: a[0], x: a[1], y: a[2], by: a[3] || [], flash: a[4] || 0 })) } : null;
  g.sos = (v.so || []).map(a => ({ i: a[0], x: a[1], y: a[2], t: a[3], prog: a[4] }));
  (v.uo || []).forEach((a, i) => { if (a && g.pickups[i]) { g.pickups[i].owner = a[0]; g.pickups[i].ownT = a[1]; } });
  g.crits = (v.cr || []).map(a => ({ x: a[0], y: a[1], t: a[2] }));
  return r;
};
