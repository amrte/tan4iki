'use strict';
// =====================================================================
//  GALAXY, tuning: how hard each skill level is, and the hangar's own money (credits).
//    skill    the skill level scales the enemy's hit points, fire rate, shot speed, how many shots can be up at once,
//             how many of the small fry's shots are aimed at you, and how much loot drops. ULTRA-VIOLENCE and
//             NIGHTMARE! go well past the tank game's settings.
//    credits  the hangar no longer takes points (combos, medals and grazing made everyone rich): it takes credits,
//             from coins (10), gems (40), the enemy you shoot down (a little) and bosses (a bounty for everyone).
//             Upgrades cost more and firepower and rapid fire have 7 levels.
// =====================================================================

// the skill as a number from 0 (I'M TOO YOUNG TO DIE) to 4 (NIGHTMARE!); AUTO lands in between
const gxSkillT = () => { const v = Config.values.skill; return v >= 0 && v <= 4 ? v : Math.max(0, Math.min(4, (Config.skill().fire - 0.35) / 0.3125)); };
const gxLerp = (a, t) => { const i = Math.min(a.length - 2, Math.floor(t)), k = t - i; return a[i] + (a[i + 1] - a[i]) * k; };
const GXT = {
  hp: [0.7, 0.85, 1, 1.4, 1.85],       // their hit points (bosses' too)
  fire: [1, 1, 1, 1.3, 1.55],          // on top of the skill's own fire rate (UV 1.3 → 1.7, NM 1.6 → 2.5)
  shot: [1, 1, 1, 1.1, 1.2],           // on top of the skill's shell speed
  aim: [0, 0, 0.1, 0.4, 0.65],         // share of the small fry's shots aimed at you
  cap: [0.8, 0.9, 1, 1.4, 1.8],        // how many of their shots can be up at once
  drops: [1.25, 1.1, 1, 0.85, 0.7],    // loot from what you shoot down
};

// ------------------------------------------------------------------ skill
function gxTune(g) {
  const t = gxSkillT();
  // other code (ENDLESS) sets these afresh as it goes: scale whatever we haven't scaled yet
  if (g.hpMul !== g._tHp) g._tHp = g.hpMul = g.hpMul * gxLerp(GXT.hp, t);
  if (g.fireMul !== g._tFire) g._tFire = g.fireMul = g.fireMul * gxLerp(GXT.fire, t);
  if (g.shotSpd !== g._tShot) g._tShot = g.shotSpd = g.shotSpd * gxLerp(GXT.shot, t);
  g.aim = gxLerp(GXT.aim, t); g.capMul = gxLerp(GXT.cap, t); g.dropMul = gxLerp(GXT.drops, t);
}
{
  const _setup = Stage.prototype.setupGalaxy, _update = Stage.prototype.updateGalaxy, _boss = Stage.prototype.gxBossStart;
  Stage.prototype.setupGalaxy = function (level) { const r = _setup.call(this, level); if (this.galaxy) gxTune(this.galaxy); return r; };
  Stage.prototype.updateGalaxy = function () { if (this.galaxy) gxTune(this.galaxy); return _update.call(this); };
  // bosses: their hit points by the skill too
  Stage.prototype.gxBossStart = function () {
    const r = _boss.apply(this, arguments), b = this.galaxy.boss;
    if (b) { b.hp = b.max = b.max * gxLerp(GXT.hp, gxSkillT()); if (b.hands) for (const hd of b.hands) hd.hp = hd.max = hd.max * gxLerp(GXT.hp, gxSkillT()); }
    return r;
  };
}
// the small fry: on the harder skills some of their shots come at you, not just straight down
for (const k of ['drone', 'bug', 'wasp', 'splitter']) if (!GX_FIRE[k]) GX_FIRE[k] = function (e, g, near) {
  if (Math.random() < (g.aim || 0)) this.gxAimed(e, near(e.x, e.y), 1.4);
  else g.bullets.push({ x: e.x, y: e.y + 5, vx: 0, vy: 1.3 * g.shotSpd, k: 'egg' });
  return Math.round((e.st === 'cross' ? 150 + rnd(90) : 320 + rnd(400)) / Math.max(0.4, g.fireMul));
};
// loot: less of it on the harder skills, more on the easier ones (boss loot and power cells you lost aren't touched)
{
  const _kill = Stage.prototype.gxKill, _drop = Stage.prototype.gxDrop;
  Stage.prototype.gxKill = function (e, p) {
    this._gxtKill = true;
    try { return _kill.call(this, e, p); } finally { this._gxtKill = false; }
  };
  Stage.prototype.gxDrop = function (x, y, k) {
    const g = this.galaxy, m = g && g.dropMul !== undefined ? g.dropMul : 1;
    if (this._gxtKill && m < 1 && Math.random() > m) return;
    const r = _drop.call(this, x, y, k);
    if (this._gxtKill && m > 1 && Math.random() < m - 1) _drop.call(this, x + 4, y, 'coin');
    return r;
  };
}

// ------------------------------------------------------------------ credits
const gxCash = (p, n) => { if (p && !p.out) { const gp = gxPlayer(p); gp.cash = (gp.cash || 0) + n; } };
{
  const _wallet = wallet;
  // in the hangar (and for a revive) galaxy players pay in credits
  wallet = function (p) { return Game.mode === 'galaxy' && p && p.gx ? Math.max(0, Math.floor(p.gx.cash || 0) - (p.spent || 0)) : _wallet(p); };
  // (a revive's cost in credits: see reviveCost in extras.js)
  const _price = shopPrice;
  shopPrice = function (item, p) { return Game.mode === 'galaxy' && item.id === 'life' ? Math.round(600 * Config.scale('shopPrices') / 10) * 10 : _price(item, p); };
}
{
  const _collect = Stage.prototype.gxCollect, _kill = Stage.prototype.gxKill, _bossKill = Stage.prototype.gxBossKill;
  Stage.prototype.gxCollect = function (t, u) {
    if (u.k === 'coin') gxCash(t.player, 10); else if (u.k === 'gem') gxCash(t.player, 40);
    return _collect.call(this, t, u);
  };
  // what you shoot down pays a little (no combo on it)
  Stage.prototype.gxKill = function (e, p) {
    if (p && !e.dead && GX_TYPES[e.type]) gxCash(p, GX_TYPES[e.type].pts / 30);
    return _kill.call(this, e, p);
  };
  // a boss: a bounty for everyone, more for whoever finished it
  Stage.prototype.gxBossKill = function (p) {
    const g = this.galaxy, bounty = 120 + 30 * g.sec + 60 * g.loop;
    for (const q of this.players) gxCash(q, bounty + (q === p ? 80 : 0));
    return _bossKill.call(this, p);
  };
}
// prices in credits (all of them come to about 18500: a full set around sector 10 if that's all you buy);
// firepower and rapid fire up to 7 levels now
Object.assign(GX_UPS.fire, { prices: [160, 300, 470, 700, 1010, 1420, 1890] });
Object.assign(GX_UPS.rapid, { prices: [160, 300, 470, 700, 1010, 1420, 1890] });
GX_UPS.engine.prices = [140, 300, 540];
GX_UPS.shield.prices = [160, 350, 650];
GX_UPS.magnet.prices = [110, 240, 430];
GX_UPS.drones.prices = [680, 1490];
GX_UPS.armor.prices = [470, 1080];
gxShopPrice = function (item, p) {
  const gp = gxPlayer(p), disc = Game.shopDiscount ? 0.75 : 1;
  let price;
  if (item.gxShop === 'power') price = 60 + 40 * gp.power;
  else if (item.gxShop === 'bomb') price = 60;
  else if (item.gxShop === 'weapon') price = 150;
  else { const U = GX_UPS[item.up_]; price = U.prices[Math.min(U.prices.length - 1, gxUp(p, item.up_))]; }
  return Math.max(10, Math.round((price * Config.scale('shopPrices') * disc) / 10) * 10);
};
