'use strict';
// =====================================================================
//  COUNTER-STRIKE orders: a player tells the bots on their team what to do
//    FOLLOW ME   they come along behind you
//    HOLD HERE   they take up places round where you stand and defend them, looking the way you looked
//    GO ON       back to their own plan
//  Keys: 1 2 3 (player I; II has 8 9 0); Q, a stick click on a gamepad or the ORDER button on a touch screen goes
//  round the three. An order lasts the round, or until the one who gave it is out. A bot still plants when it's on a
//  site with the bomb, and defuses the bomb it's on.
// =====================================================================

const CSO_KINDS = [null, 'follow', 'hold', 'go'];
const CSO_NAME = { follow: 'FOLLOW ME', hold: 'HOLD HERE', go: 'GO ON' };
const CSO_KEYS = [['Digit1', 'Digit2', 'Digit3', 'KeyQ', 'TRadio'], ['Digit8', 'Digit9', 'Digit0']];
const CSO_PAD = [10, 11];   // the stick clicks

// ------------------------------------------------------------------ the keys: 1-3 an order, 4 the next one round
Input.radio = function (i) {
  const r = this.remote[i];
  if (r) {
    const v = r.rd || 0, seen = r._rd;
    r._rd = v;
    return seen !== undefined && v !== seen ? r.rk || 0 : 0;
  }
  const set = this.localCount() === 1 ? 0 : i;
  const keys = CSO_KEYS[set];
  if (keys) {
    for (let k = 0; k < 3; k++) if (this.just.has(keys[k])) return k + 1;
    if (keys.slice(3).some(c => this.just.has(c))) return 4;
  }
  for (const p of this.padsFor(i)) if (p.justRadio) return 4;
  return 0;
};
(() => {
  const poll = Input.poll;
  Input.poll = function () {
    poll.apply(this, arguments);
    const held = this.radioHeld || (this.radioHeld = {});
    for (const p of this.pads || []) {
      const on = CSO_PAD.some(n => p.raw[n]);
      p.justRadio = on && !held[p.gp.index];
      held[p.gp.index] = on;
    }
  };
  // an online guest's orders go to the host with the rest of what they press
  Net.counters.rd = 0; Net.counters.rk = 0;
  const clientUpdate = Net.clientUpdate;
  Net.clientUpdate = function () {
    const k = Game.mode === 'cs' && Game.state === 'play' ? Input.radio(0) : 0;
    if (k) { this.counters.rd = (this.counters.rd || 0) + 1; this.counters.rk = k; }
    return clientUpdate.apply(this, arguments);
  };
})();

// ------------------------------------------------------------------ giving them, and the bots taking them
Object.assign(Stage.prototype, {
  csOrderTick() {
    const C = this.cs, O = C.orders || (C.orders = { T: null, CT: null });
    if (C.phase === 'end') return;
    for (const p of this.csHumans()) {
      const k = Input.radio(p.i);
      if (!k || !this.csTankOf(p)) continue;
      const cur = O[p.csTeam], now = cur && cur.by === p.i ? cur.k : null;
      this.csOrder(p, k === 4 ? (now === 'follow' ? 'hold' : now === 'hold' ? 'go' : 'follow') : CSO_KINDS[k]);
    }
    // an order ends with the one who gave it
    for (const team of ['T', 'CT']) if (O[team] && !this.csTankOf(this.csP(O[team].by))) O[team] = null;
  },

  csOrder(p, kind) {
    const C = this.cs, t = this.csTankOf(p);
    C.orders[p.csTeam] = kind === 'go' ? null : { k: kind, by: p.i, x: t.x, y: t.y, dir: t.dir };
    this.csNote(csName(p) + ': ' + CSO_NAME[kind], CS_COL[p.csTeam], 120, p.csTeam);
    const bot = this.players.find(q => q.bot && q.csTeam === p.csTeam && this.csTankOf(q));
    if (bot) this.csNote(bot.csName + ': ROGER', COL.lgrey, 100, p.csTeam);
    Sound.play('select');
  },

  // where a bot under orders goes (null: no order for its team)
  csOrderGoal(t, p) {
    const o = this.cs.orders && this.cs.orders[p.csTeam];
    if (!o) return null;
    const k = this.players.filter(q => q.bot && q.csTeam === p.csTeam).indexOf(p);
    if (o.k === 'follow') {
      const lead = this.csTankOf(this.csP(o.by));
      if (!lead) return null;
      // after the leader's place on a 2-tile grid (a new route only when that changes), each at its own distance
      return { node: this.csNode(Math.round(lead.x / 32) * 32, Math.round(lead.y / 32) * 32), near: 3 + 2 * (k % 4), urgent: true };
    }
    // HOLD HERE: places round where the order was given, facing the way the player faced
    const [ox, oy] = CSB_JIT[(k + 1) % CSB_JIT.length];
    return { node: this.csNode(o.x + ox * 16, o.y + oy * 16), near: 1, dir: o.dir };
  },

  // the order on the screen, for the team that has it
  csRenderOrder(ctx) {
    const C = this.cs, V = this.csViewer(), o = C.orders && V.team && C.orders[V.team];
    if (C.phase === 'buy' && V.ps.some(p => this.csTankOf(p))) return;
    if (o && C.phase === 'live') {
      const txt = 'ORDER: ' + CSO_NAME[o.k];
      ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(2, VIEW_H - 12, txt.length * 8 + 4, 10);
      Font.draw(ctx, txt, 4, VIEW_H - 11, CS_COL[V.team]);
    }
  },
});

(() => {
  const P = Stage.prototype;
  const update = P.csUpdate;
  P.csUpdate = function () { this.csOrderTick(); return update.apply(this, arguments); };
  // an order before the plan; what only a bot on the spot can do comes first (plant on a site, defuse)
  const goal = P.csBotGoal;
  P.csBotGoal = function (t, p, pl, B) {
    const g = goal.apply(this, arguments);
    if (g && g.act) return g;
    const o = this.csOrderGoal(t, p);
    if (o && o.urgent) this.csField(o.node, true);
    return o || g;
  };
  const banner = P.csRenderBanner;
  P.csRenderBanner = function (ctx) {
    banner.apply(this, arguments);
    this.csRenderOrder(ctx);
  };
  // the buy screen says how
  const buy = P.csRenderBuy;
  P.csRenderBuy = function (ctx) {
    buy.apply(this, arguments);
    const h = 34 + CS_BUY.length * 10 + 12, y = 4 + h + 3, txt = Net.role === 'client' || this.csViewer().ps.length > 1 ? 'ORDERS: 1 2 3' : '1 FOLLOW 2 HOLD 3 GO ON';
    ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect((VIEW_W - txt.length * 8) / 2 - 2, y - 1, txt.length * 8 + 4, 10);
    Font.drawCenter(ctx, txt, VIEW_W / 2, y, COL.lgrey);
  };
  // online: the orders go to the guests with the round
  const view = P.csView;
  P.csView = function () {
    const v = view.apply(this, arguments), O = this.cs.orders || {};
    v.od = ['T', 'CT'].map(k => (O[k] ? [O[k].k, O[k].by] : 0));
    return v;
  };
  const apply = P.applyCsView;
  P.applyCsView = function (v) {
    apply.apply(this, arguments);
    const C = this.cs;
    C.orders = { T: null, CT: null };
    if (v.od) ['T', 'CT'].forEach((k, j) => { if (v.od[j]) C.orders[k] = { k: v.od[j][0], by: v.od[j][1] }; });
  };
  // the ORDER button on a touch screen shows in a match only
  const update2 = Game.update;
  Game.update = function () {
    const on = this.mode === 'cs' && this.state === 'play';
    if (on !== this.csTouchOn && typeof document !== 'undefined') { this.csTouchOn = on; document.body.classList.toggle('csmode', on); }
    return update2.apply(this, arguments);
  };
})();
