'use strict';
// =====================================================================
//  DESERT DOMINION: saving a battle in the middle (pause menu: SAVE GAME) and going on with it later (the title's
//  CONTINUE with the mode picked). The game's own save slot for the mode (Game.saveKey('rts'), through
//  Game.writeSave); what's saved: the map as it is now (glimmer dug, craters, concrete), every House (credits,
//  queues, upgrades, palace charge, starport, stats, what it has explored), buildings, units and their orders,
//  the sandwyrms, the ruins, the reinforcements still to come, the camera and the groups. Shots and effects in
//  flight aren't; a frigate on its way drops its cargo at once on loading, a skylifter's load is set down.
// =====================================================================

const RTS_SAVE_FMT = 1;
function rtsPackBytes(u8) {
  let s = '';
  for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
  return btoa(s);
}
function rtsBytesOf(str) {
  const s = atob(str), u = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i);
  return u;
}
// one bit a tile (what a House has explored)
function rtsPackBits(a) {
  const b = new Uint8Array((a.length + 7) >> 3);
  for (let i = 0; i < a.length; i++) if (a[i]) b[i >> 3] |= 1 << (i & 7);
  return rtsPackBytes(b);
}
function rtsBitsOf(str, n) {
  const b = rtsBytesOf(str), a = new Uint8Array(n);
  for (let i = 0; i < n; i++) a[i] = (b[i >> 3] >> (i & 7)) & 1;
  return a;
}

Object.assign(RtsGame.prototype, {
  serialize() {
    const ref = o => !o ? null : o.ground ? { g: [o.tx, o.ty] } : (o.isU || o.isB) && !o.dead ? { id: o.id } : null;
    const order = o => {
      const c = Object.assign({}, o);
      if (o.k !== 'boom') { c.t = ref(o.t); }
      c.b = ref(o.b);
      return c;
    };
    const opts = {};
    for (const k in this.opts) if (k !== 'map' && typeof this.opts[k] !== 'function') opts[k] = this.opts[k];
    const g8 = new Uint8Array(this.map.g.buffer.slice(this.map.g.byteOffset, this.map.g.byteOffset + this.map.g.byteLength));
    const units = [];
    for (const u of this.units) {
      if (u.dead || u.key === 'frigate') continue;
      const s = { id: u.id, key: u.key, h: u.h, hp: u.hp, tx: u.tx, ty: u.ty, x: u.x, y: u.y, dir: u.dir, tdir: u.tdir, order: order(u.order), cargo: u.cargo, hs: u.hs,
        harvTile: u.harvTile, conv: u.conv, still: u.still, alt: u.alt, ang: u.ang, aiWave: !!u.aiWave, docked: ref(u.docked), carried: !!u.carried, tgt: ref(u.tgt) };
      units.push(s);
    }
    // a frigate's cargo comes along as units waiting by its drop point
    const drops = [];
    for (const u of this.units) if (!u.dead && u.key === 'frigate' && u.job && u.job.phase !== 'out' && !(u.job.phase === 'land' && u.job.t >= 50)) drops.push({ h: u.h, keys: u.job.keys, to: u.job.to, port: ref(u.job.port) });
    const slab = [];
    for (let i = 0; i < this.N; i++) if (this.slab[i]) slab.push([i, this.slab[i]]);
    return {
      fmt: RTS_SAVE_FMT, player: this.player, frame: this.frame, seed: this.seed, opts,
      map: { w: this.W, h: this.H, t: rtsPackBytes(this.map.t), g: rtsPackBytes(g8), starts: this.map.starts, blooms: this.map.blooms, name: this.map.name },
      slab, ruins: this.ruins || [],
      houses: this.houseList.map(H => ({ id: H.id, team: H.team, human: H.human, ai: H.ai, credits: H.credits, techLevel: H.techLevel, prod: JSON.parse(JSON.stringify(H.prod)),
        palaceT: H.palaceT, port: H.port ? { stock: H.port.stock, price: H.port.price, order: H.port.order, eta: H.port.eta ? Math.max(1, H.port.eta - this.frame) : 0, t: H.port.t } : null,
        stats: H.stats, defeated: H.defeated, start: H.start, nomads: !!H.nomads, aiBoost: H.aiBoost, exp: rtsPackBits(H.exp) })),
      buildings: this.buildings.filter(b => !b.dead).map(b => ({ id: b.id, key: b.key, h: b.h, x: b.x, y: b.y, hp: b.hp, level: b.level, repairing: b.repairing, rally: b.rally,
        primary: !!b.primary, rise: b.rise, tdir: b.tdir })),
      units, drops,
      worms: this.worms.map(w => Object.assign({}, w, { prey: null })),
      reinf: this.reinf.map(r => Object.assign({}, r, { at: (r.at | 0) - this.frame })),
      objectives: this.objectives, bloomT: this.bloomT, wormCount: this.wormCount,
      ui: { cam: { x: this.cam.x, y: this.cam.y }, groups: this.ui.groups, clicks: this.ui.clicks, tab: this.ui.tab },
    };
  },
  // after a fresh RtsGame on the saved map (no bases, no units): everything else back as it was
  restore(d) {
    const W = this.W, idMap = new Map();
    this.frame = d.frame | 0;
    this.rnd = rtsRng((this.seed ^ this.frame ^ 0x9e3779b9) >>> 0);
    for (const [i, h] of d.slab || []) this.slab[i] = h;
    this.ruins = Array.isArray(d.ruins) ? d.ruins.filter(r => r && r.w > 0 && r.h > 0) : [];
    // the Houses
    for (const s of d.houses) {
      let H = this.houses[s.id];
      if (!H && s.nomads) H = this.nomadHouse(this.P);
      if (!H) H = this.addHouse({ house: s.id, credits: 0, ai: s.ai }, s.team, false, s.start);
      // the roaming nomads (the palace's, or a mission's ally marked so at its start) stay a band without a brain
      if (s.nomads) { H.nomads = true; H.brain = null; }
      Object.assign(H, { team: s.team, credits: s.credits, techLevel: s.techLevel, prod: s.prod, palaceT: s.palaceT, stats: s.stats, defeated: s.defeated, start: s.start,
        aiBoost: s.aiBoost || H.aiBoost });
      for (const k of RTS_FACTORIES) if (!H.prod[k]) H.prod[k] = { queue: [], prog: 0, paid: 0, ready: null, broke: false, retry: 0 };
      if (s.port) H.port = { stock: s.port.stock || {}, price: s.port.price || {}, order: s.port.order || [], eta: s.port.eta ? this.frame + s.port.eta : 0, frigate: null, t: s.port.t | 0 };
      if (s.exp) H.exp = rtsBitsOf(s.exp, this.N);
    }
    // buildings
    for (const s of d.buildings) {
      const H = this.houses[s.h];
      if (!H || !RTS_BUILDINGS[s.key] || !this.footFree(s.key, s.x, s.y, null, true)) continue;
      const b = this.addBuilding(H, s.key, s.x, s.y, { whole: true, instant: true, noFree: true, level: s.level });
      Object.assign(b, { hp: s.hp, repairing: !!s.repairing, rally: s.rally || null, primary: !!s.primary, rise: s.rise === undefined ? 1 : s.rise, tdir: s.tdir | 0 });
      idMap.set(s.id, b);
    }
    // units (on their tiles; one that can't be there goes to the nearest free one)
    const later = [];
    for (const s of d.units) {
      const H = this.houses[s.h], def = RTS_UNITS[s.key];
      if (!H || !def) continue;
      let tx = s.tx, ty = s.ty;
      const u = this.newUnit(H, s.key, tx, ty);
      if (def.cls !== 'air') {
        if (!this.tileFreeFor(def, ty * W + tx, u)) { const p = this.findFree(def, tx, ty, 8, null, u); if (!p) continue; tx = p.x; ty = p.y; u.tx = tx; u.ty = ty; }
        u.slot = this.occupy(u, ty * W + tx);
        if (u.slot < 0) continue;
        u.x = tx * 16 + 8 + (def.cls === 'inf' ? RTS_SLOT[u.slot][0] : 0); u.y = ty * 16 + 8 + (def.cls === 'inf' ? RTS_SLOT[u.slot][1] : 0);
      } else { u.x = s.x; u.y = s.y; u.alt = s.alt || 1; u.ang = s.ang || 0; }
      Object.assign(u, { hp: s.hp, dir: s.dir | 0, tdir: s.tdir | 0, cargo: s.cargo | 0, hs: s.hs || null, harvTile: s.harvTile === undefined ? -1 : s.harvTile, conv: s.conv || null,
        still: s.still | 0, aiWave: !!s.aiWave });
      this.units.push(u); H.units.push(u); this.byId.set(u.id, u);
      idMap.set(s.id, u);
      later.push([u, s]);
    }
    const back = r => !r ? null : r.g ? { ground: true, x: r.g[0] * 16 + 8, y: r.g[1] * 16 + 8, tx: r.g[0], ty: r.g[1] } : idMap.get(r.id) || null;
    for (const [u, s] of later) {
      const o = Object.assign({}, s.order || { k: 'idle' });
      if (o.k !== 'boom') o.t = back(o.t);
      o.b = back(o.b);
      if ((o.k === 'attack' && !o.t) || ((o.k === 'capture' || o.k === 'sabotage') && !o.b)) u.order = { k: 'idle' }; else u.order = o;
      u.tgt = back(s.tgt);
      if (o.k === 'move' || o.k === 'amove' || o.k === 'retreat' || o.k === 'deploy') this.requestPath(u, o.x, o.y);
      const dk = back(s.docked);
      if (dk && dk.isB && !dk.busy && this.adjacent(u, dk)) { dk.busy = u; u.docked = dk; }
      if (u.harvTile >= 0 && u.harvTile < this.N) this.harvRes[u.harvTile] = u.id;
    }
    // the frigates' cargo
    for (const f of d.drops || []) {
      const H = this.houses[f.h], port = back(f.port);
      if (!H) continue;
      for (const k of f.keys || []) { const nu = port && !port.dead ? this.spawnBeside(H, k, port) : this.spawnUnitNear(H, k, f.to.x, f.to.y, 6); if (nu && nu.d.harvester) this.cmdHarvest(nu); }
    }
    this.worms = (d.worms || []).map(w => Object.assign({}, w, { prey: null }));
    this.wormCount = d.wormCount | 0;
    this.reinf = (d.reinf || []).map(r => Object.assign({}, r, { at: this.frame + (r.at | 0) }));
    this.objectives = d.objectives || { destroy: true };
    this.bloomT = d.bloomT || 1800;
    for (const H of this.houseList) this.recalcHouse(H);
    if (d.ui) {
      this.ui.groups = {};
      for (const n in d.ui.groups || {}) this.ui.groups[n] = (d.ui.groups[n] || []).map(id => { const o = idMap.get(id); return o ? o.id : -1; });
      if (d.ui.clicks) this.ui.clicks = d.ui.clicks;
      if (d.ui.tab) this.ui.tab = d.ui.tab;
      if (d.ui.cam) { this.cam.x = d.ui.cam.x; this.cam.y = d.ui.cam.y; this.clampCam(); }
    }
    this.ui.sel = []; this.ui.selB = null;
    this.ui.cred = Math.floor(this.P.credits);
    this.allDirty = true;
    this.msgs = [];
    this.say('GAME LOADED');
  },
});

// ================================================================== into the game's save slot
Object.assign(Game, {
  // a saved battle back on the screen
  rtsLoad(s) {
    const d = s && s.rts;
    if (!d || d.fmt !== RTS_SAVE_FMT || !d.map || !Array.isArray(d.houses)) return false;
    const map = { w: d.map.w, h: d.map.h, t: rtsBytesOf(d.map.t), g: new Uint16Array(rtsBytesOf(d.map.g).buffer), starts: d.map.starts || [], blooms: d.map.blooms || [], name: d.map.name };
    if (map.t.length !== map.w * map.h || map.g.length !== map.w * map.h) return false;
    const P = d.houses.find(h => h.id === d.player);
    if (!P) return false;
    const empty = h => ({ house: h.id, credits: 0, ai: h.ai, base: [], units: [], noMcv: true, start: h.start });
    const opts = Object.assign({}, d.opts, { map, seed: d.seed, worms: 0, reinforcements: [], player: Object.assign(empty(P), { credits: 0 }),
      allies: d.houses.filter(h => h.id !== d.player && !h.nomads && h.team === P.team).map(empty),
      foes: d.houses.filter(h => h.id !== d.player && !h.nomads && h.team !== P.team).map(empty) });
    Config.values.gameMode = 'rts';
    const st = this.rtsStartMission(opts);
    st.restore(d);
    st.opts.worms = d.wormCount;
    // a campaign mission: the campaign's own state, so the result goes where it should
    const mi = d.opts && d.opts.mission;
    if (mi && mi.campaign && !this.rtsC && typeof rtsCLoad === 'function') {
      try { const C = rtsCLoad(); if (C && C.house === mi.house && C.level === mi.level) this.rtsC = C; } catch (e) { /* the campaign's business */ }
    }
    return true;
  },
});

(() => {
  const G = Game;
  const saveKind = G.saveKind, saveGame = G.saveGame, titleSlot = G.titleSlot, saveWhere = G.saveWhere, loadGame = G.loadGame;
  G.saveKind = function () {
    if (this.mode === 'rts' && this.stage && this.stage.rts && !Net.role && !this.daily) return 'rts';
    return saveKind.apply(this, arguments);
  };
  G.saveGame = function () {
    if (this.saveKind() !== 'rts') return saveGame.apply(this, arguments);
    const st = this.stage;
    if (!st || st.done) { this.saveMsg = 'CAN\'T SAVE NOW'; return false; }
    let ok = false;
    try {
      const data = { app: APP_VERSION, fmt: 2, time: Date.now(), mode: 'rts', numPlayers: 1, stage: 1, rts: st.serialize() };
      ok = this.writeSave(data);
    } catch (e) { console.error(e); ok = false; }
    this.saveMsg = ok ? this.saveMsgOf(ok, 'GAME SAVED') : 'COULD NOT SAVE';
    return ok;
  };
  G.titleSlot = function () {
    if (Config.get('gameMode') === 'rts') return 'rts';
    return titleSlot.apply(this, arguments);
  };
  G.saveWhere = function (s) {
    if (s && s.mode === 'rts' && s.rts) {
      const mi = s.rts.opts && s.rts.opts.mission, t = Math.floor((s.rts.frame | 0) / 60);
      return (mi && mi.level ? 'MISSION ' + mi.level : 'SKIRMISH') + ' ' + Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0');
    }
    return saveWhere.apply(this, arguments);
  };
  G.loadGame = function (slot = this.titleSlot()) {
    if (slot !== 'rts') return loadGame.apply(this, arguments);
    const s = this.savePeek(slot);
    let r = false;
    try { r = this.rtsLoad(s); } catch (e) { console.error(e); r = false; }
    if (r) return true;
    this.dropSave(slot);
    this.stage = null; this.paused = false;
    this.toTitle(); this.titleY = 0;
    this.toast('SAVE TOO OLD');
    Sound.play('steel');
    return false;
  };
})();
