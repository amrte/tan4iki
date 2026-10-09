'use strict';
// =====================================================================
//  COUNTER-STRIKE reloading: every gun has a magazine. Empty, the tank reloads (it can't fire till it's done);
//  R reloads early (player II on the same keyboard: 7; with three or four at one keyboard only the empty magazine
//  reloads, R being player IV's fire). Bots reload when there's nobody to fight and the magazine is half gone.
//  The magazine shows in the side panel (a bar, yellow while reloading) and under your tank while it reloads.
//  A gun bought, a bot taken over, a new round: the magazine is the gun's (full, or as the bot left it).
// =====================================================================

// shots a magazine, frames to reload (the flamethrower's is frames of flame)
const CS_MAG = { cannon: [6, 100], mg: [40, 130], flame: [150, 110], mortar: [3, 140], tesla: [4, 120], missile: [2, 150], laser: [3, 150] };
const CS_RELOAD_KEYS = [['KeyR'], ['Digit7']];

// ------------------------------------------------------------------ the key (and an online guest's)
Input.csReloadPressed = function (i) {
  const r = this.remote[i];
  if (r) { const v = r.rl || 0, seen = r._rl; r._rl = v; return seen !== undefined && v !== seen; }
  const n = this.localCount();
  if (n > 2) return false;
  const keys = CS_RELOAD_KEYS[n === 1 ? 0 : i];
  return !!keys && keys.some(c => this.just.has(c));
};
(() => {
  Net.counters.rl = 0;
  const clientUpdate = Net.clientUpdate;
  Net.clientUpdate = function () {
    if (Game.mode === 'cs' && Game.state === 'play' && Input.csReloadPressed(0)) this.counters.rl = (this.counters.rl || 0) + 1;
    return clientUpdate.apply(this, arguments);
  };
})();

Object.assign(Stage.prototype, {
  csGun(p) { return CS_MAG[p.weapon] ? p.weapon : 'cannon'; },
  csMagSize(p) { return CS_MAG[this.csGun(p)][0]; },
  // what's left in the magazine (a different gun in hand: its own, full)
  csMagLeft(p) {
    const g = this.csGun(p);
    if (p.csMagW !== g || p.csMag === undefined || p.csMag === null) { p.csMagW = g; p.csMag = CS_MAG[g][0]; p.csReload = 0; }
    return p.csMag;
  },
  csCanShoot(p) { return !(p.csReload > 0) && this.csMagLeft(p) > 0; },
  csStartReload(p) {
    if (p.csReload > 0 || this.csMagLeft(p) >= this.csMagSize(p)) return;
    p.csReload = p.csReloadMax = CS_MAG[this.csGun(p)][1];
    if (!p.bot && p.tank) Sound.play('csReload');
  },
  csSpend(p, n = 1) {
    this.csMagLeft(p);
    p.csMag = Math.max(0, p.csMag - n);
    if (p.csMag <= 0) this.csStartReload(p);
  },
  csReloadTick() {
    for (const p of this.players) {
      if (p.csReload > 0 && --p.csReload === 0) { p.csMag = this.csMagSize(p); if (!p.bot && p.tank) Sound.play('csReloaded'); }
      if (!p.bot && p.tank && Input.csReloadPressed(p.i)) this.csStartReload(p);
    }
  },
});

(() => {
  const P = Stage.prototype;
  const update = P.csUpdate;
  P.csUpdate = function () { this.csReloadTick(); return update.apply(this, arguments); };
  // a new round: every magazine full
  const setup = P.csSetup;
  P.csSetup = function () {
    const r = setup.apply(this, arguments);
    for (const p of this.players) { p.csMagW = null; p.csReload = 0; }
    return r;
  };
  // the cannon
  const fire = P.fire;
  P.fire = function (t) {
    const p = this.cs && t.player;
    if (!p || this.csGun(p) !== 'cannon') return fire.apply(this, arguments);
    if (!this.csCanShoot(p)) return false;
    const ok = fire.apply(this, arguments);
    if (ok) this.csSpend(p);
    return ok;
  };
  // the guns: a shot is whatever they put in the air (a shell, a missile, a mortar bomb, a beam)
  for (const k of ['mgFire', 'laserFire', 'mortarFire', 'teslaFire', 'missileFire']) {
    const orig = P[k];
    P[k] = function (t) {
      const p = this.cs && t.player;
      if (!p) return orig.apply(this, arguments);
      if (!this.csCanShoot(p)) return;
      const n0 = this.bullets.length + this.wshots.length + this.wfx.length;
      const r = orig.apply(this, arguments);
      if (this.bullets.length + this.wshots.length + this.wfx.length > n0) this.csSpend(p);
      return r;
    };
  }
  // the flamethrower burns its fuel while it's lit
  const flame = P.flameOn;
  P.flameOn = function (t) {
    const p = this.cs && t.player;
    if (!p) return flame.apply(this, arguments);
    if (!this.csCanShoot(p)) { t.flame = null; return; }
    const r = flame.apply(this, arguments);
    this.csSpend(p);
    return r;
  };
  // bots: nobody to fight and half the magazine gone, they reload
  const fight = P.csBotFight;
  P.csBotFight = function (t) {
    const r = fight.apply(this, arguments), p = t.player;
    if (r === '' && !(p.csReload > 0) && this.csMagLeft(p) < this.csMagSize(p) / 2) this.csStartReload(p);
    return r;
  };
  // under your tank while it reloads: a bar filling up
  const fog = P.csRenderFog;
  P.csRenderFog = function (ctx) {
    fog.apply(this, arguments);
    for (const p of this.csViewer().ps) {
      const t = this.csTankOf(p);
      if (!t || !(p.csReload > 0)) continue;
      const k = 1 - p.csReload / (p.csReloadMax || 1);
      ctx.fillStyle = COL.black; ctx.fillRect(t.x - 1, t.y + 17, 18, 4);
      ctx.fillStyle = '#F8D838'; ctx.fillRect(t.x, t.y + 18, Math.round(16 * k), 2);
    }
  };
  // the side panel: each of your players' magazine (green, yellow while reloading) and what's left
  const hud = P.csRenderHud;
  P.csRenderHud = function (ctx, H) {
    hud.apply(this, arguments);
    this.csViewer().ps.slice(0, 4).forEach((p, k) => {
      if (!this.csTankOf(p)) return;
      const y = 62 + k * 28 + 23, size = CS_MAG[CS_MAG[p.weapon] ? p.weapon : 'cannon'][0], left = p.csMag === undefined || p.csMag === null ? size : p.csMag;
      const re = p.csReload > 0, f = re ? 1 - p.csReload / (p.csReloadMax || 1) : left / size;
      ctx.fillStyle = COL.black; ctx.fillRect(H, y, 24, 3);
      ctx.fillStyle = re ? '#F8D838' : left <= size / 4 ? '#F83800' : '#58D854'; ctx.fillRect(H, y, Math.max(0, Math.round(24 * f)), 2);
    });
  };
  // what B does here: RELOADING... while it does
  const banner = P.csRenderBanner;
  P.csRenderBanner = function (ctx) {
    banner.apply(this, arguments);
    const me = this.csViewer().ps.find(p => this.csTankOf(p) && p.csReload > 0);
    if (me && this.cs.phase === 'live' && (this.frame >> 3) & 1) Font.drawCenter(ctx, 'RELOADING', VIEW_W >> 1, VIEW_H - 34, '#F8D838');
  };
  // online: the magazines go to the guests
  const view = P.csView;
  P.csView = function () {
    const v = view.apply(this, arguments);
    v.mg = this.players.map(p => [p.i, p.csMag === undefined || p.csMag === null ? -1 : p.csMag, p.csReload || 0, p.csReloadMax || 0, p.csTankLook || '']);
    return v;
  };
  const apply = P.applyCsView;
  P.applyCsView = function (v) {
    apply.apply(this, arguments);
    for (const a of v.mg || []) { const p = this.csP(a[0]); if (p) Object.assign(p, { csMag: a[1] < 0 ? null : a[1], csReload: a[2], csReloadMax: a[3], csTankLook: a[4] || null }); }
  };
})();
