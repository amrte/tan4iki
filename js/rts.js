'use strict';
// =====================================================================
//  DESERT DOMINION: the simulation core (a tribute to the first real-time strategy game).
//    RtsGame is the play state's stage (Game.stage, also Game.rts): the map of KHARRA, the Houses (credits, power,
//    storage, production queues, starport, palace), the buildings, the mission's objectives and its end. Units,
//    movement, pathfinding, combat, harvesting, aircraft and sandwyrms are in rtsunit.js; the placeholder computer
//    player in rtsai.js (the stand-in map generator is at the end of this file); the screen and the controls in
//    rtsui.js / rtsdraw.js; saving in rtssave.js.
//    - houses: R.houses[key] (key = the House: aquila, drakon, serpens, regent, nomad). Team 0 is the player's side
//      (allies, the nomads of an AQUILA player), team 1 the computer's; same team = friends.
//    - production: one queue per factory kind (yard, barracks, hall, light, heavy, hightech); the head is built
//      paying as it goes (no money: it waits), slower on low power. A finished building waits "ready to place"; a
//      finished unit rolls out of the primary factory's door to its rally point. '_upg' in a queue is the
//      factory's paid upgrade.
//    - power: vapor traps make it (less when damaged), the rest use it; short: production slows, radar and rocket
//      turrets go off. Storage: refineries and silos; harvested glimmer past it is lost.
//    - buildings go next to your own (or your concrete) on rock; on bare rock they start damaged and slowly decay.
//      Repair costs credits as it goes, selling pays half (less if damaged), soldiers capture damaged ones.
//    - the command API (what the computer players use; see the bottom of rtsunit.js for the unit orders).
// =====================================================================

const RTS_DX8 = [0, 1, 1, 1, 0, -1, -1, -1], RTS_DY8 = [-1, -1, 0, 1, 1, 1, 0, -1];
// dir8 (0 north, clockwise) of a vector
function rtsDir8(dx, dy) {
  if (!dx && !dy) return 0;
  const a = Math.atan2(dx, -dy);   // 0 up, clockwise
  return ((Math.round(a / (Math.PI / 4)) % 8) + 8) % 8;
}
// a small fast seeded generator
function rtsRng(seed) {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function rtsSay(kind) { if (typeof rtsSting === 'function') { try { rtsSting(kind); } catch (e) { /* the stinger's own trouble */ } } }

const RTS_MSG = {
  built: 'CONSTRUCTION COMPLETE', unitReady: 'UNIT READY', underAttack: 'OUR UNITS ARE UNDER ATTACK', harvesterAttacked: 'HARVESTER UNDER ATTACK',
  wormSign: 'WYRM SIGN! KEEP OFF THE SAND', baseUnderAttack: 'OUR BASE IS UNDER ATTACK', lowPower: 'LOW POWER: BUILD VAPOR TRAPS',
  insufficient: 'INSUFFICIENT FUNDS', cantPlace: 'CAN\'T PLACE IT THERE', missionWon: 'MISSION ACCOMPLISHED', missionLost: 'MISSION FAILED',
};

class RtsGame {
  constructor(opts) {
    opts = this.opts = Object.assign({}, opts || {});
    this.rts = true; this.frame = 0; this.over = false; this.result = null; this.done = false; this.reported = false;
    this.seed = (opts.seed === undefined ? Math.floor(Math.random() * 1e9) : opts.seed) >>> 0;
    opts.seed = this.seed;
    this.rnd = rtsRng(this.seed ^ 0x5bd1e995);
    // ---- the map (a copy: the mission's own stays as it was, for RESTART)
    let map = opts.map;
    if (!map) {
      const mo = Object.assign({ w: 64, h: 64, players: 1 + (opts.foes || []).length + (opts.allies || []).length, seed: this.seed, style: 'open' }, opts.mapOpts || {});
      map = typeof rtsMapGen === 'function' ? rtsMapGen(mo) : rtsGenMap(mo);
      opts.map = map;
    }
    const W = this.W = map.w, H = this.H = map.h, N = this.N = W * H;
    this.map = { w: W, h: H, t: Uint8Array.from(map.t), g: Uint16Array.from(map.g), starts: (map.starts || []).map(s => ({ x: s.x, y: s.y })),
      blooms: (map.blooms || []).map(b => b.slice ? b.slice() : [b.x, b.y]), name: map.name || '' };
    const t = this.map.t, g = this.map.g;
    for (let i = 0; i < N; i++) {   // glimmer tiles without an amount get the standard one, amounts without a tile the tile
      if ((t[i] === 4 || t[i] === 5) && !g[i]) g[i] = t[i] === 5 ? 200 : 100;
      if (g[i] && RTS_ON_SAND[t[i]] && t[i] !== 6 && t[i] !== 4 && t[i] !== 5) t[i] = g[i] > 100 ? 5 : 4;
    }
    for (const [bx, by] of this.map.blooms) if (bx >= 0 && by >= 0 && bx < W && by < H) t[by * W + bx] = 6;
    // ---- occupancy
    this.bAt = new Array(N).fill(null);        // building on a tile
    this.vAt = new Array(N).fill(null);        // vehicle on (or moving into) a tile
    this.iAt = new Array(N * 3).fill(null);    // up to three infantry a tile
    this.slab = new Array(N).fill(null);       // who laid the concrete
    this.harvRes = new Int32Array(N);          // glimmer tile a harvester is heading for (its id)
    this.units = []; this.buildings = []; this.shots = []; this.fx = []; this.wrecks = []; this.corpses = []; this.worms = [];
    this.byId = new Map(); this.nextId = 1;
    this.dirtyT = new Set(); this.dirtyS = new Set(); this.allDirty = true;
    this.msgs = []; this.stingT = {}; this.battleT = -99999; this.events = [];
    this.techLevel = Math.max(1, Math.min(9, opts.tech || 9));
    this.fog = !!opts.fog;
    this.speed = Math.max(1, Math.min(3, opts.speed | 0 || 1));
    // ---- houses: the player's side is team 0, the computer's team 1
    this.houses = {}; this.houseList = [];
    const P = opts.player || { house: 'aquila' };
    this.player = P.house || 'aquila';
    const starts = this.map.starts.slice();
    const takeStart = (want) => {
      if (want && want.x !== undefined) return want;
      return starts.length ? starts.shift() : { x: (this.rnd() * (W - 16) | 0) + 8, y: (this.rnd() * (H - 16) | 0) + 8 };
    };
    this.addHouse(P, 0, true, takeStart(P.start));
    for (const a of opts.allies || []) this.addHouse(a, 0, false, takeStart(a.start));
    // the computer's Houses stand together (as in the original) unless each is given a team of its own
    for (const f of opts.foes || []) this.addHouse(f, f.team > 0 ? f.team | 0 : 1, false, takeStart(f.start));
    this.pathInit();
    this.uiInit && this.uiInit();
    // ---- bases and units
    for (const Hs of this.houseList) this.setupHouse(Hs);
    // ---- sandwyrms
    this.wormCount = opts.worms === undefined ? 1 : opts.worms | 0;
    for (let i = 0; i < this.wormCount; i++) this.spawnWorm((typeof RTS_WORM !== 'undefined' ? RTS_WORM.first : 4800) + i * 2400);
    this.bloomT = 1800;
    this.reinf = (opts.reinforcements || []).map(r => Object.assign({ done: false }, r));
    this.objectives = opts.objectives || { destroy: true };
    // computer players
    // (player.ai given: the player's House plays itself too, a demo)
    if (typeof P.ai === 'number') this.P.ai = P.ai;
    for (const Hs of this.houseList) if ((!Hs.human || typeof P.ai === 'number') && Hs.ai !== null && Hs.ai !== undefined && typeof RTS_AI !== 'undefined') {
      try { Hs.brain = RTS_AI.make(this, Hs.id, Hs.ai); } catch (e) { console.error(e); }
    }
    this.uiStart && this.uiStart();
    if (typeof opts.onStart === 'function') opts.onStart(this);
  }

  // ------------------------------------------------------------------ houses
  addHouse(def, team, human, start) {
    const id = def.house || 'drakon';
    if (this.houses[id]) {   // the same House twice: one House, the units and base of both
      const Hs = this.houses[id];
      Hs.extra.push({ def, start });
      return Hs;
    }
    const Hs = {
      id, name: (RTS_HOUSES[id] || {}).name || id.toUpperCase(), team, human, ai: human ? null : def.ai === undefined ? 2 : def.ai,
      credits: def.credits === undefined ? 1500 : def.credits, storage: 0, powerOut: 0, powerUse: 0, techLevel: Math.max(1, Math.min(9, def.tech || this.opts.tech || 9)),
      buildings: [], units: [], count: {}, prod: {}, start, extra: [], def,
      palaceT: 0, palaceReady: false, port: null, aiBoost: 1,
      exp: new Uint8Array(this.N), see: new Uint8Array(this.N),
      stats: { harvested: 0, unitsKilled: 0, unitsLost: 0, buildingsKilled: 0, buildingsLost: 0, built: 0, lost: 0 },
      defeated: false, lowPowerSaid: false, lastHit: -9999,
    };
    if (!human) Hs.aiBoost = [0.8, 0.95, 1.1, 1.3, 1.55][Math.max(0, Math.min(4, Hs.ai | 0))];
    for (const k of RTS_FACTORIES) Hs.prod[k] = { queue: [], prog: 0, paid: 0, ready: null, broke: false, retry: 0 };
    this.houses[id] = Hs;
    this.houseList.push(Hs);
    return Hs;
  }
  // the nomads of the deep desert (an AQUILA's palace calls them): made the first time they're needed
  nomadHouse(friendOf) {
    let Hs = this.houses.nomad;
    if (!Hs) { Hs = this.addHouse({ house: 'nomad', credits: 0, ai: 2 }, friendOf ? friendOf.team : 0, false, { x: 0, y: 0 }); Hs.nomads = true; Hs.brain = null; }
    return Hs;
  }
  setupHouse(Hs) {
    const lists = [{ def: Hs.def, start: Hs.start }].concat(Hs.extra);
    for (const { def, start } of lists) {
      for (const b of def.base || []) {
        const d = RTS_BUILDINGS[b.key];
        if (!d) continue;
        if (d.slab) { for (let y = 0; y < d.h; y++) for (let x = 0; x < d.w; x++) this.laySlab(Hs, b.x + x, b.y + y); continue; }
        if (this.footFree(b.key, b.x, b.y, null, true)) this.addBuilding(Hs, b.key, b.x, b.y, { whole: true, noFree: b.noFree, instant: true });
      }
      let units = def.units;
      if (!units) units = (def.base && def.base.length) || def.noMcv ? [] : [{ key: 'mcv' }];
      else if (!def.noMcv && !(def.base && def.base.length) && !units.some(u => RTS_UNITS[u.key] && RTS_UNITS[u.key].deploys) && !def.noBase) units = [{ key: 'mcv' }].concat(units);
      for (const u of units) {
        const ux = u.x === undefined ? start.x : u.x, uy = u.y === undefined ? start.y : u.y;
        const nu = this.spawnUnitNear(Hs, u.key, ux, uy);
        if (nu && u.order === 'hunt') this.cmdHunt(nu);
      }
      this.reveal(Hs, start.x, start.y, 6);
    }
    // the starport's price list
    Hs.port = { stock: {}, price: {}, order: [], eta: 0, frigate: null, t: 0 };
    this.portRestock(Hs, true);
  }
  team(h) { const Hs = this.houses[h]; return Hs ? Hs.team : -1; }
  isEnemy(a, b) { const A = this.houses[a], B = this.houses[b]; return !!(A && B && A.team !== B.team); }
  enemiesOf(h) { return this.houseList.filter(o => this.isEnemy(h, o.id)); }
  get P() { return this.houses[this.player]; }

  // ------------------------------------------------------------------ map
  idx(x, y) { return y * this.W + x; }
  inMap(x, y) { return x >= 0 && y >= 0 && x < this.W && y < this.H; }
  setTile(i, k) {
    if (this.map.t[i] === k) return;
    this.map.t[i] = k;
    this.markDirty(i);
  }
  markDirty(i) {
    const W = this.W, x = i % W;
    this.dirtyT.add(i);
    if (i >= W) this.dirtyT.add(i - W);
    if (i + W < this.N) this.dirtyT.add(i + W);
    if (x > 0) this.dirtyT.add(i - 1);
    if (x < W - 1) this.dirtyT.add(i + 1);
  }
  // reveal a circle of tiles for a House (the player's shroud is drawn from its exp)
  reveal(Hs, cx, cy, r) {
    if (typeof Hs === 'string') Hs = this.houses[Hs];
    if (!Hs) return;
    const exp = Hs.exp, W = this.W, me = Hs.id === this.player, rr = r * r + r;
    const x0 = Math.max(0, cx - r), x1 = Math.min(W - 1, cx + r), y0 = Math.max(0, cy - r), y1 = Math.min(this.H - 1, cy + r);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const dx = x - cx, dy = y - cy;
      if (dx * dx + dy * dy > rr) continue;
      const i = y * W + x;
      if (!exp[i]) { exp[i] = 1; if (me) this.shroudDirty(i); }
    }
    // a computer House's friends share what it sees (the player's allies share with the player)
    if (Hs.team === 0 && !me) {
      const P = this.P;
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        const dx = x - cx, dy = y - cy, i = y * W + x;
        if (dx * dx + dy * dy <= rr && !P.exp[i]) { P.exp[i] = 1; this.shroudDirty(i); }
      }
    }
  }
  shroudDirty(i) {
    const W = this.W, x = i % W;
    this.dirtyS.add(i);
    if (i >= W) this.dirtyS.add(i - W);
    if (i + W < this.N) this.dirtyS.add(i + W);
    if (x > 0) this.dirtyS.add(i - 1);
    if (x < W - 1) this.dirtyS.add(i + 1);
  }
  explored(h, x, y) { const Hs = this.houses[h]; return !!(Hs && this.inMap(x, y) && Hs.exp[y * this.W + x]); }
  // the command API: can House h see tile (tx, ty)? (shroud: explored; with fog: in sight now)
  visible(h, tx, ty) {
    const Hs = this.houses[h];
    if (!Hs || !this.inMap(tx, ty)) return false;
    const i = ty * this.W + tx;
    return this.fog ? !!Hs.see[i] : !!Hs.exp[i];
  }
  // fog of war: what each House sees right now (every few frames)
  updateSight() {
    for (const Hs of this.houseList) {
      const see = Hs.see;
      see.fill(0);
      const mark = (cx, cy, r) => {
        const x0 = Math.max(0, cx - r), x1 = Math.min(this.W - 1, cx + r), y0 = Math.max(0, cy - r), y1 = Math.min(this.H - 1, cy + r), rr = r * r + r;
        for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const dx = x - cx, dy = y - cy; if (dx * dx + dy * dy <= rr) see[y * this.W + x] = 1; }
      };
      for (const u of Hs.units) if (!u.dead && !u.hidden) mark(u.tx, u.ty, u.d.sight || 2);
      for (const b of Hs.buildings) if (!b.dead) mark(b.x + (b.w >> 1), b.y + (b.h >> 1), (b.d.sight || 2) + 1);
    }
    // the player's side shares sight
    const P = this.P;
    for (const Hs of this.houseList) if (Hs !== P && Hs.team === P.team) for (let i = 0; i < this.N; i++) if (Hs.see[i]) P.see[i] = 1;
  }
  // can the player see this thing now? (the shroud, the fog)
  playerSees(tx, ty) {
    if (!this.inMap(tx, ty)) return false;
    const P = this.P, i = ty * this.W + tx;
    return this.fog ? !!P.see[i] : !!P.exp[i];
  }

  // ------------------------------------------------------------------ messages
  // a status line for the player (and the stinger, if the music has one), each kind at most every `gap` frames
  say(text, sting, gap) {
    const key = sting || text;
    if (gap && this.stingT[key] !== undefined && this.frame - this.stingT[key] < gap) return;
    this.stingT[key] = this.frame;
    this.msgs.push({ text: text || RTS_MSG[sting] || '', t: this.frame });
    if (this.msgs.length > 6) this.msgs.shift();
    if (sting) rtsSay(sting);
  }
  // fighting near the player's things: battle music for a while
  battle() { this.battleT = this.frame; }

  // ------------------------------------------------------------------ buildings
  // can a building of key stand at (x, y)? (no units in the way unless ignoreUnits; `except` a unit that may be there)
  footFree(key, x, y, except, ignoreUnits) {
    const d = RTS_BUILDINGS[key];
    if (!d) return false;
    for (let yy = y; yy < y + d.h; yy++) for (let xx = x; xx < x + d.w; xx++) {
      if (!this.inMap(xx, yy)) return false;
      const i = yy * this.W + xx;
      if (!RTS_BUILDABLE[this.map.t[i]] || this.bAt[i]) return false;
      if (ignoreUnits) continue;
      const v = this.vAt[i];
      if (v && v !== except) return false;
      for (let s = 0; s < 3; s++) { const q = this.iAt[i * 3 + s]; if (q && q !== except) return false; }
    }
    return true;
  }
  // the command API: may House h put building key with its top-left at (tx, ty)? On rock (or concrete), clear, and
  // next to one of its own buildings or its concrete.
  canPlace(h, key, tx, ty) {
    const Hs = this.houses[h], d = RTS_BUILDINGS[key];
    if (!Hs || !d) return false;
    if (!this.footFree(key, tx, ty, null, false)) return false;
    if (d.slab) {   // a slab only goes on rock that isn't concrete yet (one of the four may be)
      let fresh = 0;
      for (let yy = ty; yy < ty + d.h; yy++) for (let xx = tx; xx < tx + d.w; xx++) if (this.map.t[yy * this.W + xx] !== RTS_T.CONC) fresh++;
      if (!fresh) return false;
    }
    if (Hs.human && !this.anyExplored(Hs, tx, ty, d.w, d.h)) return false;
    // next to its own: a building or concrete within one tile
    for (let yy = ty - 1; yy <= ty + d.h; yy++) for (let xx = tx - 1; xx <= tx + d.w; xx++) {
      if (!this.inMap(xx, yy)) continue;
      const i = yy * this.W + xx, b = this.bAt[i];
      if ((b && b.h === h) || this.slab[i] === h) return true;
    }
    return false;
  }
  anyExplored(Hs, x, y, w, h) {
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) if (this.inMap(xx, yy) && Hs.exp[yy * this.W + xx]) return true;
    return false;
  }
  laySlab(Hs, x, y) {
    if (!this.inMap(x, y)) return;
    const i = y * this.W + x;
    if (!RTS_BUILDABLE[this.map.t[i]] || this.bAt[i]) return;
    this.setTile(i, RTS_T.CONC);
    this.slab[i] = Hs.id;
  }
  addBuilding(Hs, key, x, y, o) {
    o = o || {};
    const d = RTS_BUILDINGS[key];
    const b = { id: this.nextId++, isB: true, key, d, h: Hs.id, x, y, w: d.w, hh: d.h, max: d.hp, hp: d.hp, rise: o.instant ? 1 : 0, level: o.level || 0,
      repairing: false, flash: 0, door: 0, doorT: 0, anim: (this.rnd() * 60) | 0, tdir: 4, cd: 0, rally: null, busy: null, bare: 0, decayT: 0, dead: false,
      hitT: -9999, fire: 0, firing: 0, cx: (x + d.w / 2) * 16, cy: (y + d.h / 2) * 16, born: this.frame };
    for (let yy = y; yy < y + d.h; yy++) for (let xx = x; xx < x + d.w; xx++) {
      const i = yy * this.W + xx;
      this.bAt[i] = b;
      if (this.map.t[i] !== RTS_T.CONC) b.bare++;
      this.markDirty(i);
    }
    // on bare rock: starts damaged (the original's foundations rule), and decays slowly
    if (!o.whole && b.bare) b.hp = Math.max(1, Math.round(b.max * (1 - 0.35 * b.bare / (d.w * d.h))));
    Hs.buildings.push(b); this.buildings.push(b); this.byId.set(b.id, b);
    Hs.count[key] = (Hs.count[key] || 0) + 1;
    this.recalcHouse(Hs);
    this.reveal(Hs, x + (d.w >> 1), y + (d.h >> 1), (d.sight || 2) + 1);
    if (d.freeUnit && !o.noFree) {
      const u = this.spawnBeside(Hs, d.freeUnit, b);
      if (u && RTS_UNITS[d.freeUnit].harvester) this.cmdHarvest(u);
    }
    if (d.palace) Hs.palaceT = Math.max(Hs.palaceT, 0);
    return b;
  }
  removeBuilding(b, how) {
    if (b.dead) return;
    b.dead = true;
    const Hs = this.houses[b.h];
    for (let yy = b.y; yy < b.y + b.hh; yy++) for (let xx = b.x; xx < b.x + b.w; xx++) {
      const i = yy * this.W + xx;
      if (this.bAt[i] === b) this.bAt[i] = null;
      if (how === 'destroyed' && !b.d.wall) this.setTile(i, RTS_T.RUBBLE);
      else this.markDirty(i);
    }
    if (Hs) {
      const k = Hs.buildings.indexOf(b);
      if (k >= 0) Hs.buildings.splice(k, 1);
      Hs.count[b.key] = Math.max(0, (Hs.count[b.key] || 1) - 1);
      this.recalcHouse(Hs);
    }
    const k = this.buildings.indexOf(b);
    if (k >= 0) this.buildings.splice(k, 1);
    this.byId.delete(b.id);
    if (b.busy && !b.busy.dead) { const u = b.busy; b.busy = null; u.docked = null; if (u.d.harvester) { u.hs = 'back'; } }
    if (this.onBuildingGone) this.onBuildingGone(b);
  }
  // power and storage of a House (as its buildings stand now)
  recalcHouse(Hs) {
    let out = 0, use = 0, store = 0;
    for (const b of Hs.buildings) {
      const p = b.d.power || 0;
      if (p > 0) out += p * Math.max(0.25, b.hp / b.max) * (b.rise >= 1 ? 1 : 0.5);
      else use -= p;
      store += b.d.storage || 0;
    }
    Hs.powerOut = Math.round(out); Hs.powerUse = use; Hs.storage = store;
    Hs.power = { out: Hs.powerOut, use, low: use > Hs.powerOut };
  }
  lowPower(Hs) { return Hs.powerUse > Hs.powerOut; }
  powerFactor(Hs) { return Hs.powerUse > Hs.powerOut ? Math.max(0.25, Hs.powerOut / Math.max(1, Hs.powerUse)) : 1; }
  hasRadar(Hs) { return (Hs.count.radar || 0) > 0 && !this.lowPower(Hs); }
  // damage to a building (from rtsunit.js's damage)
  hurtBuilding(b, dmg, byHouse) {
    if (b.dead || dmg <= 0) return;
    b.hp -= dmg; b.flash = 6; b.hitT = this.frame;
    const Hs = this.houses[b.h];
    if (Hs) Hs.lastHit = this.frame;
    if (b.h === this.player || (byHouse === this.player)) this.battle();
    if (b.h === this.player && byHouse && byHouse !== this.player) this.say(null, 'baseUnderAttack', 900);
    if (b.d.power > 0 && Hs) this.recalcHouse(Hs);
    if (b.hp <= 0) this.destroyBuilding(b, byHouse);
  }
  destroyBuilding(b, byHouse) {
    if (b.dead) return;
    const Hs = this.houses[b.h], By = this.houses[byHouse];
    if (Hs) Hs.stats.buildingsLost++;
    if (By && By !== Hs) By.stats.buildingsKilled++;
    // the blast: one big one, smaller ones over the rest
    this.addFx(b.w * b.hh > 1 ? 'bigboom' : 'boom', b.cx, b.cy);
    for (let yy = 0; yy < b.hh; yy++) for (let xx = 0; xx < b.w; xx++) if (this.rnd() < 0.6) this.addFx('boom', (b.x + xx) * 16 + 8, (b.y + yy) * 16 + 8, (this.rnd() * 20) | 0);
    for (let k = 0; k < 3; k++) this.addFx('smoke', b.cx + (this.rnd() - 0.5) * b.w * 12, b.cy + (this.rnd() - 0.5) * b.hh * 12, 10 + k * 8);
    if (typeof Sound !== 'undefined' && this.near(b.cx, b.cy)) Sound.play(b.w * b.hh > 2 ? 'baseDie' : 'explode');
    this.removeBuilding(b, 'destroyed');
    // survivors run out (the original's): a soldier or two from the bigger buildings
    if (Hs && !b.d.wall && !b.d.defense && b.w * b.hh >= 4 && Hs.id !== 'nomad') {
      const n = this.rnd() < 0.5 ? 1 : this.rnd() < 0.5 ? 2 : 0;
      for (let k = 0; k < n; k++) { const s = this.spawnUnitNear(Hs, 'soldier', b.x + (b.w >> 1), b.y + b.hh, 3); if (s && !Hs.human) this.cmdHunt(s); }
    }
    this.splashDamage(b.cx, b.cy, 18, 25, 'blast', byHouse, null, b);
  }

  // ------------------------------------------------------------------ production
  factoryKindOf(key) {
    if (RTS_BUILDINGS[key]) return 'yard';
    const u = RTS_UNITS[key];
    return u ? u.fac : null;
  }
  // the primary factory of a kind (the one marked primary, else the first built)
  factoryOf(Hs, kind) {
    if (typeof Hs === 'string') Hs = this.houses[Hs];
    let best = null;
    for (const b of Hs.buildings) if (b.d.fac === kind && b.rise >= 1) { if (b.primary) return b; if (!best) best = b; }
    return best;
  }
  upgLevel(Hs, kind) {
    let lv = 0;
    for (const b of Hs.buildings) if (b.d.fac === kind) lv = Math.max(lv, b.level || 0);
    return lv;
  }
  // what a House can make in a factory kind right now (keys), as the sidebar shows it
  buildList(h, kind) {
    const Hs = typeof h === 'string' ? this.houses[h] : h;
    if (!Hs) return [];
    const out = [], upg = this.upgLevel(Hs, kind), has = k => (Hs.count[k] || 0) > 0;
    if (kind === 'yard') {
      for (const k in RTS_BUILDINGS) {
        const d = RTS_BUILDINGS[k];
        if (d.noBuild || !rtsAllowed(Hs.id, k, Hs.techLevel, upg)) continue;
        if (d.needs && !d.needs.every(has)) continue;
        out.push(k);
      }
    } else if (kind === 'starport') {
      for (const k of RTS_STARPORT.items) if (this.portAllowed(Hs, k)) out.push(k);
    } else {
      for (const k in RTS_UNITS) {
        const d = RTS_UNITS[k];
        if (d.fac !== kind || !rtsAllowed(Hs.id, k, Hs.techLevel, upg)) continue;
        if (d.needs && !d.needs.every(has)) continue;
        out.push(k);
      }
    }
    return out;
  }
  // the next factory upgrade of a building: { cost, tech } or null
  nextUpgrade(b) {
    const ups = b && b.d.upgrades;
    if (!ups) return null;
    const lv = b.level || 0, Hs = this.houses[b.h];
    // the highest level among the House's factories of the kind counts (one upgrade serves them all)
    const have = Hs ? this.upgLevel(Hs, b.d.fac) : lv;
    const u = ups[have];
    if (!u || (Hs && Hs.techLevel < u.tech)) return null;
    return u;
  }
  // the command API: queue one of key in a House's factory kind (false if it can't)
  startBuild(h, kind, key) {
    const Hs = this.houses[h];
    if (!Hs || !Hs.prod[kind]) return false;
    const q = Hs.prod[kind];
    if (key !== '_upg' && !this.buildList(Hs, kind).includes(key)) return false;
    if (!Hs.buildings.some(b => b.d.fac === kind)) return false;
    if (q.queue.length >= 9) return false;
    if (key === '_upg' && q.queue.includes('_upg')) return false;
    q.queue.push(key);
    return true;
  }
  // the command API: drop the last item of a queue (the one in the works pays back what it cost so far; a finished
  // building waiting to be placed pays back all of it)
  cancelBuild(h, kind, key) {
    const Hs = this.houses[h];
    if (!Hs || !Hs.prod[kind]) return false;
    const q = Hs.prod[kind];
    if (!q.queue.length) return false;
    let at = q.queue.length - 1;
    if (key) { at = q.queue.lastIndexOf(key); if (at < 0) return false; }
    if (at === 0) {
      Hs.credits += q.ready ? this.itemCost(Hs, q.queue[0], kind) : q.paid;
      q.prog = 0; q.paid = 0; q.ready = null; q.broke = false;
    }
    q.queue.splice(at, 1);
    return true;
  }
  // the command API: the finished item waiting in a factory kind (a building to place, or a unit with no room to
  // come out yet), or null
  ready(h, kind) {
    const Hs = this.houses[h];
    return Hs && Hs.prod[kind] ? Hs.prod[kind].ready : null;
  }
  progress(h, kind) {
    const Hs = this.houses[h], q = Hs && Hs.prod[kind];
    if (!q || !q.queue.length) return 0;
    return Math.min(1, q.prog / this.itemTime(q.queue[0]));
  }
  itemTime(key) { return key === '_upg' ? RTS_UPGRADE_TIME : Math.max(30, (rtsDefOf(key) || {}).time || 300); }
  itemCost(Hs, key, kind) {
    if (key === '_upg') { const f = this.factoryOf(Hs, kind), u = f && this.nextUpgrade(f); return u ? u.cost : 0; }
    return rtsPriceOf(Hs.id, key);
  }
  prodTick(Hs) {
    const pf = this.powerFactor(Hs) * (Hs.aiBoost || 1);
    for (const kind of RTS_FACTORIES) {
      const q = Hs.prod[kind];
      if (!q.queue.length) continue;
      const key = q.queue[0];
      if (q.ready) {   // a unit with nowhere to come out: try again now and then
        if (kind !== 'yard' && --q.retry <= 0) { q.retry = 30; if (this.spawnFromFactory(Hs, kind, key)) this.prodDone(Hs, q); }
        continue;
      }
      const fb = this.factoryOf(Hs, kind);
      if (!fb) continue;
      if (key === '_upg' && !this.nextUpgrade(fb)) { q.queue.shift(); q.prog = 0; q.paid = 0; continue; }
      const total = this.itemTime(key), cost = this.itemCost(Hs, key, kind);
      const pay = Math.min(cost - q.paid, cost / total * pf);
      if (pay > 0 && Hs.credits < pay) {
        if (!q.broke && Hs.human) this.say(null, 'insufficient', 600);
        q.broke = true;
        continue;
      }
      q.broke = false;
      if (pay > 0) { Hs.credits -= pay; q.paid += pay; }
      q.prog += pf;
      if (q.prog < total) continue;
      q.prog = total;
      if (key === '_upg') {
        fb.level = this.upgLevel(Hs, kind) + 1;
        for (const b of Hs.buildings) if (b.d.fac === kind) b.level = fb.level;
        if (Hs.human) this.say(RTS_FAC_NAME[kind] + ' UPGRADED', 'built');
        this.prodDone(Hs, q);
      } else if (kind === 'yard') {
        q.ready = key;
        if (Hs.human) this.say(null, 'built');
      } else if (this.spawnFromFactory(Hs, kind, key)) this.prodDone(Hs, q);
      else { q.ready = key; q.retry = 30; }
    }
  }
  prodDone(Hs, q) { q.queue.shift(); q.prog = 0; q.paid = 0; q.ready = null; q.broke = false; }
  // a finished unit rolls out of its factory's door (and on to the rally point)
  spawnFromFactory(Hs, kind, key) {
    const fb = this.factoryOf(Hs, kind);
    if (!fb) return null;
    const u = this.spawnBeside(Hs, key, fb);
    if (!u) return null;
    fb.door = 1; fb.doorT = 40;
    Hs.stats.built++;
    if (Hs.human) this.say(rtsNameOf(key) + ' READY', 'unitReady');
    if (u.d.harvester) this.cmdHarvest(u);
    else if (fb.rally) this.cmdMove(u, fb.rally.x, fb.rally.y);
    if (this.onUnitBuilt) this.onUnitBuilt(u, fb);
    return u;
  }
  // the command API: place the finished building (key must be the yard's ready one)
  place(h, key, tx, ty) {
    const Hs = this.houses[h];
    if (!Hs) return null;
    const q = Hs.prod.yard;
    if (q.ready !== key) return null;
    if (!this.canPlace(h, key, tx, ty)) { if (Hs.human) this.say(null, 'cantPlace', 60); return null; }
    const d = RTS_BUILDINGS[key];
    this.prodDone(Hs, q);
    if (d.slab) {
      for (let y = 0; y < d.h; y++) for (let x = 0; x < d.w; x++) this.laySlab(Hs, tx + x, ty + y);
      if (typeof Sound !== 'undefined' && Hs.human) Sound.play('build');
      return { slab: true, key, x: tx, y: ty };
    }
    const b = this.addBuilding(Hs, key, tx, ty);
    if (typeof Sound !== 'undefined' && Hs.human) Sound.play('build');
    if (Hs.human && d.power < 0 && this.lowPower(Hs)) this.say(null, 'lowPower', 900);
    return b;
  }
  // the command API: start the paid upgrade of a factory (queued like a unit)
  upgrade(h, b) {
    if (!b || b.dead || b.h !== h || !b.d.upgrades) return false;
    if (!this.nextUpgrade(b)) return false;
    const was = b.primary;
    // the upgrade goes through the queue of the building's kind, on this building
    for (const o of this.houses[h].buildings) if (o.d.fac === b.d.fac) o.primary = false;
    b.primary = true;
    if (!this.startBuild(h, b.d.fac, '_upg')) { b.primary = was; return false; }
    return true;
  }
  // the command API: sell a building (half its price back, less if damaged)
  sell(h, b) {
    if (!b || b.dead || b.h !== h) return false;
    const Hs = this.houses[h];
    const back = Math.floor(rtsPriceOf(h, b.key) / 2 * Math.max(0, b.hp / b.max));
    Hs.credits += back;
    this.addFx('smoke', b.cx, b.cy);
    this.removeBuilding(b, 'sold');
    if (Hs.human) { this.say('SOLD FOR ' + back + ' CREDITS'); if (typeof Sound !== 'undefined') Sound.play('coin'); }
    return true;
  }
  // the command API: switch a building's repair on or off (it costs as it goes)
  repairBuilding(h, b, on) {
    if (!b || b.dead || b.h !== h) return false;
    b.repairing = on === undefined ? !b.repairing : !!on;
    if (b.hp >= b.max) b.repairing = false;
    return true;
  }
  setPrimary(h, b) {
    if (!b || b.dead || b.h !== h || !b.d.fac) return false;
    for (const o of this.houses[h].buildings) if (o.d.fac === b.d.fac) o.primary = o === b;
    return true;
  }
  setRally(h, b, tx, ty) {
    if (!b || b.dead || b.h !== h) return false;
    b.rally = tx === null || tx === undefined ? null : { x: Math.max(0, Math.min(this.W - 1, tx)), y: Math.max(0, Math.min(this.H - 1, ty)) };
    return true;
  }
  buildingsTick(Hs) {
    const f = this.frame;
    for (const b of Hs.buildings) {
      if (b.rise < 1) b.rise = Math.min(1, b.rise + 1 / 50);
      if (b.flash > 0) b.flash--;
      if (b.doorT > 0 && --b.doorT === 0) b.door = 0;
      if (b.working > 0) b.working--;
      if (b.hp < b.max * 0.5 && !b.d.wall && (f + b.id * 5) % (b.hp < b.max * 0.25 ? 20 : 40) === 0) { const r = rtsHash(b.id, f); this.addFx('smoke', b.x * 16 + 4 + r % Math.max(1, b.w * 16 - 8), b.y * 16 + 2 + (r >> 8) % Math.max(1, b.hh * 16 - 8), 0, 0, true); }
      b.anim++;
      // repair: 2 hp a time, paid as it goes
      if (b.repairing && (f + b.id) % 6 === 0) {
        const cost = Math.max(0.2, rtsPriceOf(Hs.id, b.key) / b.max * 0.5) * 2;
        if (Hs.credits >= cost) { Hs.credits -= cost; b.hp = Math.min(b.max, b.hp + 2); if (b.d.power > 0) this.recalcHouse(Hs); }
        else if (Hs.human) this.say(null, 'insufficient', 600);
        if (b.hp >= b.max) b.repairing = false;
      }
      // bare rock: slow decay down to half
      if (b.bare && !b.d.wall && (f + b.id * 7) % Math.max(60, Math.round(1800 / b.bare)) === 0 && b.hp > b.max * 0.5 && !b.repairing) b.hp--;
      if (b.d.wpn) this.turretTick(b, Hs);
    }
  }

  // ------------------------------------------------------------------ the palace
  palaceKind(h) { const Hs = this.houses[h]; return Hs && (Hs.count.palace || 0) > 0 ? (RTS_HOUSES[h] || {}).palace : null; }
  palaceCharge(h) {
    const k = this.palaceKind(h), Hs = this.houses[h];
    if (!k) return 0;
    return Math.min(1, Hs.palaceT / RTS_PALACE[k].charge);
  }
  palaceReady(h) { return this.palaceCharge(h) >= 1; }
  palaceTick(Hs) {
    const k = this.palaceKind(Hs.id);
    if (!k) { Hs.palaceT = 0; Hs.palaceReady = false; return; }
    const was = Hs.palaceT >= RTS_PALACE[k].charge;
    Hs.palaceT = Math.min(RTS_PALACE[k].charge, Hs.palaceT + this.powerFactor(Hs) * (Hs.human ? 1 : Hs.aiBoost));
    if (!was && Hs.palaceT >= RTS_PALACE[k].charge && Hs.human) this.say('PALACE: ' + RTS_PALACE[k].name + ' READY', 'built');
  }
  // the command API: use the palace's power. target: a tile {x, y}, a unit or a building (the doomfist and the
  // nomads go there; the saboteur heads for a building given)
  palacePower(h, target) {
    const Hs = this.houses[h], k = this.palaceKind(h);
    if (!Hs || !k || !this.palaceReady(h)) return false;
    const pal = Hs.buildings.find(b => b.d.palace);
    if (!pal) return false;
    let tx, ty;
    if (target) {
      if (target.isB) { tx = target.x + (target.w >> 1); ty = target.y + (target.hh >> 1); }
      else if (target.tx !== undefined && target.d) { tx = target.tx; ty = target.ty; }
      else { tx = target.x | 0; ty = target.y | 0; }
    }
    if (k === 'doomfist') {
      if (tx === undefined) return false;
      this.launchDoomfist(Hs, pal, tx, ty);
      if (Hs.human) this.say('DOOMFIST LAUNCHED');
      else if (this.isEnemy(h, this.player)) this.say('MISSILE LAUNCH DETECTED', 'underAttack');
    } else if (k === 'nomads') {
      const N = this.nomadHouse(Hs);
      let cx = tx, cy = ty;
      if (cx === undefined) { cx = pal.x + 1; cy = pal.y + 3; }
      const n = RTS_PALACE.nomads.count;
      for (let i = 0; i < n; i++) {
        const u = this.spawnUnitNear(N, 'nomad', cx, cy, 6);
        if (u) { this.cmdHunt(u); this.addFx('sand', u.x, u.y); }
      }
      this.reveal(Hs, cx, cy, 4);
      if (Hs.human) this.say('THE NOMADS ANSWER OUR CALL');
    } else if (k === 'saboteur') {
      const u = this.spawnBeside(Hs, 'saboteur', pal);
      if (!u) return false;
      if (target && target.isB && this.isEnemy(h, target.h)) this.cmdSabotage(u, target);
      if (Hs.human) this.say('A SABOTEUR AWAITS YOUR ORDERS');
    }
    Hs.palaceT = 0;
    return true;
  }

  // ------------------------------------------------------------------ the starport
  portAllowed(Hs, key) {
    const d = RTS_UNITS[key];
    return !!(d && (!d.houses || d.houses.includes(Hs.id)) && d.tech <= Hs.techLevel);
  }
  portRestock(Hs, all) {
    const P = Hs.port;
    for (const k of RTS_STARPORT.items) {
      if (!this.portAllowed(Hs, k)) continue;
      if (all) P.stock[k] = 1 + ((this.rnd() * 4) | 0);
      else P.stock[k] = Math.min(RTS_STARPORT.maxStock, (P.stock[k] || 0) + (this.rnd() < 0.6 ? 1 : 0));
    }
    this.portPrices(Hs);
  }
  portPrices(Hs) {
    for (const k of RTS_STARPORT.items) {
      if (!this.portAllowed(Hs, k)) continue;
      const base = RTS_UNITS[k].cost, sw = RTS_STARPORT.swing;
      Hs.port.price[k] = Math.max(10, Math.round(base * (1 + (this.rnd() * 2 - 1) * sw) / 5) * 5);
    }
  }
  // the command API: buy one of key at the starport (on the next frigate)
  starportBuy(h, key) {
    const Hs = this.houses[h];
    if (!Hs || !(Hs.count.starport > 0) || !this.portAllowed(Hs, key)) return false;
    const P = Hs.port, price = P.price[key];
    if (!(P.stock[key] > 0)) { if (Hs.human) this.say('SOLD OUT'); return false; }
    if (P.frigate) { if (Hs.human) this.say('FRIGATE ON ITS WAY: WAIT'); return false; }
    if (Hs.credits < price) { if (Hs.human) this.say(null, 'insufficient', 120); return false; }
    Hs.credits -= price; P.stock[key]--; P.order.push({ key, price });
    if (!P.eta) P.eta = this.frame + RTS_STARPORT.delay;
    if (Hs.human && typeof Sound !== 'undefined') Sound.play('coin');
    return true;
  }
  starportCancel(h, key) {
    const Hs = this.houses[h];
    if (!Hs || Hs.port.frigate) return false;
    const P = Hs.port;
    let i = -1;
    for (let k = P.order.length - 1; k >= 0; k--) if (!key || P.order[k].key === key) { i = k; break; }
    if (i < 0) return false;
    const o = P.order.splice(i, 1)[0];
    Hs.credits += o.price; P.stock[o.key] = (P.stock[o.key] || 0) + 1;
    if (!P.order.length) P.eta = 0;
    return true;
  }
  portTick(Hs) {
    const P = Hs.port;
    if (!P) return;
    P.t++;
    if (P.t % RTS_STARPORT.every === 0) this.portPrices(Hs);
    if (P.t % RTS_STARPORT.restock === 0) this.portRestock(Hs, false);
    if (P.eta && this.frame >= P.eta && !P.frigate) {
      const port = Hs.buildings.find(b => b.key === 'starport' && b.rise >= 1);
      if (!port) { P.eta = this.frame + 120; return; }
      P.frigate = this.launchFrigate(Hs, port, P.order.map(o => o.key));
      P.order = [];
      P.eta = 0;
      if (Hs.human) this.say('FRIGATE APPROACHING');
    }
  }

  // ------------------------------------------------------------------ the frame
  update() {
    if (this.uiUpdate) this.uiUpdate();
    if (this.done) {
      this.endT++;
      this.frame++;
      this.fxTick();
      return;
    }
    const n = this.speed;
    for (let s = 0; s < n && !this.done; s++) this.step();
  }
  step() {
    this.frame++;
    const f = this.frame;
    this.gridBuild();
    for (const Hs of this.houseList) {
      this.prodTick(Hs);
      this.buildingsTick(Hs);
      this.palaceTick(Hs);
      this.portTick(Hs);
      if ((f + Hs.id.length) % 20 === 0) {
        this.recalcHouse(Hs);
        if (Hs.human) {
          const low = this.lowPower(Hs);
          if (low && !Hs.lowPowerSaid) this.say(null, 'lowPower', 1200);
          Hs.lowPowerSaid = low;
        }
      }
    }
    this.pathTick();
    for (let i = 0; i < this.units.length; i++) { const u = this.units[i]; if (!u.dead) this.unitTick(u); }
    this.shotsTick();
    this.fxTick();
    this.wormsTick();
    this.bloomTick();
    if (this.units.some(u => u.dead)) this.units = this.units.filter(u => !u.dead);
    // reinforcements
    for (const r of this.reinf) if (!r.done && f >= (r.at | 0)) { r.done = true; this.reinforce(r); }
    // the computer players think every 15 frames (each on its own frame)
    this.houseList.forEach((Hs, k) => {
      if (Hs.brain && !Hs.defeated && (f + k * 4) % 15 === 0) { try { Hs.brain.tick(this); } catch (e) { if (!this.aiErr) { this.aiErr = true; console.error('RTS_AI', e); } } }
      else if (Hs.nomads && (f + k * 4) % 30 === 0) this.nomadsTick(Hs);
    });
    if (this.fog && f % 10 === 0) this.updateSight();
    if (f % 30 === 0) this.checkEnd();
    if (typeof this.opts.onTick === 'function') this.opts.onTick(this);
  }
  // the nomads: no base, they hunt
  nomadsTick(Hs) { for (const u of Hs.units) if (!u.dead && (u.order.k === 'idle' || u.order.k === 'guard')) this.cmdHunt(u); }
  reinforce(r) {
    const Hs = this.houses[r.house] || (r.house === 'nomad' ? this.nomadHouse(this.P) : null);
    if (!Hs) return;
    const keys = r.units || [];
    // where they come in: an edge (towards the House's base if 'any')
    const home = Hs.buildings[0] ? { x: Hs.buildings[0].x, y: Hs.buildings[0].y } : Hs.start;
    let edge = r.edge || 'any';
    if (edge === 'any') {
      const d = { n: home.y, s: this.H - 1 - home.y, w: home.x, e: this.W - 1 - home.x };
      edge = Object.keys(d).sort((a, b) => d[a] - d[b])[0];
    }
    const at = edge === 'n' ? { x: home.x, y: 1 } : edge === 's' ? { x: home.x, y: this.H - 2 } : edge === 'w' ? { x: 1, y: home.y } : { x: this.W - 2, y: home.y };
    if (r.byAir) {
      this.launchFrigate(Hs, null, keys, { from: at, to: { x: home.x + 1, y: home.y + 3 } });
    } else {
      for (const k of keys) {
        const u = this.spawnUnitNear(Hs, k, at.x, at.y, 6);
        if (!u) continue;
        if (Hs.human) this.cmdMove(u, home.x + 1, home.y + 3); else this.cmdHunt(u);
      }
    }
    if (Hs.human) this.say('REINFORCEMENTS HAVE ARRIVED');
  }

  // ------------------------------------------------------------------ the end
  houseDefeated(Hs) {
    if (Hs.buildings.some(b => !b.d.wall)) return false;
    return !Hs.units.some(u => !u.dead && (u.d.wpn || u.d.deploys || u.d.saboteur) && u.d.cls !== 'air');
  }
  checkEnd() {
    for (const Hs of this.houseList) {
      if (Hs.defeated || Hs.nomads) continue;
      if (this.houseDefeated(Hs)) {
        Hs.defeated = true;
        if (!Hs.human && this.isEnemy(Hs.id, this.player)) this.say('HOUSE ' + Hs.name + ' IS DEFEATED');
      }
    }
    const o = this.objectives, P = this.P;
    let win = null;
    if (P.defeated) win = false;
    else if (o.harvest && P.stats.harvested >= o.harvest) win = true;
    else if (o.survive && this.frame >= o.survive) win = true;
    else if (o.destroy || (!o.harvest && !o.survive)) {
      const foes = this.enemiesOf(this.player).filter(h => !h.nomads);
      if (foes.length && foes.every(h => h.defeated || (o.destroy === 'buildings' && !h.buildings.some(b => !b.d.wall)))) win = true;
    }
    // a mission's own rule: true / false ends it so, null keeps it going, anything else leaves it to the above
    if (typeof this.opts.checkWin === 'function') { const w = this.opts.checkWin(this); if (w === true || w === false || w === null) win = w; }
    if (win !== null) this.finish(win);
  }
  finish(win) {
    if (this.done) return;
    this.done = true; this.endT = 0; this.over = true;
    this.resultData = this.resultOf(win, false);
    this.say(null, win ? 'missionWon' : 'missionLost');
    if (typeof this.opts.onEnd === 'function') { try { this.opts.onEnd(this.resultData, this); } catch (e) { console.error(e); } }
  }
  near(x, y) { return this.uiNear ? this.uiNear(x, y) : true; }
  // what Game.rtsMissionOver hears: { win, quit, mission, time, harvested, unitsKilled, unitsLost, buildingsKilled, buildingsLost,
  // score, enemyHarvested, foes: [{ house, harvested, unitsKilled, buildingsKilled }] }
  resultOf(win, quit) {
    const P = this.P, foes = this.enemiesOf(this.player).filter(h => !h.nomads);
    const s = P.stats, time = this.frame;
    const score = quit ? 0 : Math.max(0, Math.round(s.harvested / 10 + s.unitsKilled * 40 + s.buildingsKilled * 100 - s.unitsLost * 10 - s.buildingsLost * 30 + (win ? 1000 + Math.max(0, 36000 - time) / 36 : 0)));
    const fs = foes.map(h => ({ house: h.id, harvested: Math.round(h.stats.harvested), unitsKilled: h.stats.unitsKilled, buildingsKilled: h.stats.buildingsKilled }));
    return { win: !!win && !quit, quit: !!quit, mission: this.opts.mission || null, time, harvested: Math.round(s.harvested), unitsKilled: s.unitsKilled, unitsLost: s.unitsLost,
      buildingsKilled: s.buildingsKilled, buildingsLost: s.buildingsLost, score, enemyHarvested: fs.reduce((a, f) => a + f.harvested, 0), foes: fs };
  }
}

// ------------------------------------------------------------------ the map generator (stand-in)
// rtsGenMap(opts) builds a skirmish map when js/rtsmaps.js (rtsMapGen) isn't there: value noise for rock plateaus,
// cliffs and dunes, a rock base at each start, glimmer fields near every start and out in the open, a few blooms.
function rtsGenMap(o) {
  o = o || {};
  const w = Math.max(32, Math.min(128, o.w | 0 || 64)), h = Math.max(32, Math.min(128, o.h | 0 || 64));
  const n = Math.max(1, Math.min(4, o.players | 0 || 2)), rnd = rtsRng((o.seed | 0) || 12345), style = o.style || 'open';
  const t = new Uint8Array(w * h), g = new Uint16Array(w * h);
  // smooth value noise at a scale (tiles a lattice cell)
  const noise = sc => {
    const lw = Math.ceil(w / sc) + 2, lh = Math.ceil(h / sc) + 2, L = new Float32Array(lw * lh);
    for (let i = 0; i < L.length; i++) L[i] = rnd();
    return (x, y) => {
      const fx = x / sc, fy = y / sc, ix = fx | 0, iy = fy | 0, ax = fx - ix, ay = fy - iy;
      const sx = ax * ax * (3 - 2 * ax), sy = ay * ay * (3 - 2 * ay);
      const a = L[iy * lw + ix], b = L[iy * lw + ix + 1], c = L[(iy + 1) * lw + ix], d = L[(iy + 1) * lw + ix + 1];
      return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
    };
  };
  const big = noise(11), small = noise(4), dn = noise(6), cl = noise(5);
  // the starts: corners first (two players: opposite), inset from the edge
  const inset = Math.max(7, Math.round(Math.min(w, h) * 0.15));
  const corners = [[inset, inset], [w - 1 - inset, h - 1 - inset], [w - 1 - inset, inset], [inset, h - 1 - inset]];
  if (rnd() < 0.5) { corners[0][0] = w - 1 - inset; corners[1][0] = inset; corners[2][0] = inset; corners[3][0] = w - 1 - inset; }
  const starts = corners.slice(0, Math.max(n, 2)).map(([x, y]) => ({ x: x + ((rnd() * 5) | 0) - 2, y: y + ((rnd() * 5) | 0) - 2 }));
  const thr = { open: 0.62, canyons: 0.47, islands: 0.69, basin: 0.6 }[style] || 0.62;
  const nearStart = (x, y, r) => starts.some(s => (s.x - x) ** 2 + (s.y - y) ** 2 < r * r);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let v = big(x, y) * 0.72 + small(x, y) * 0.28;
    if (style === 'basin') { const ex = Math.min(x, w - 1 - x, y, h - 1 - y) / (Math.min(w, h) / 2); v += (1 - ex) * 0.35 - 0.12; }
    if (style === 'canyons') v += 0.08 * Math.sin((x + y) / 7);
    const i = y * w + x;
    if (v > thr) t[i] = v > thr + 0.17 && cl(x, y) > 0.45 && !nearStart(x, y, 10) ? 3 : 2;
    else t[i] = dn(x, y) > 0.64 ? 1 : 0;
  }
  // a rock plateau at every start
  for (const s of starts) {
    for (let y = s.y - 9; y <= s.y + 9; y++) for (let x = s.x - 9; x <= s.x + 9; x++) {
      if (x < 0 || y < 0 || x >= w || y >= h) continue;
      const d = Math.hypot(x - s.x, y - s.y) + (rnd() - 0.5) * 1.6;
      if (d < 6.5) t[y * w + x] = 2;
      else if (d < 8.5 && t[y * w + x] === 3) t[y * w + x] = 2;
    }
  }
  // glimmer fields: a blob of light glimmer with thick at its heart, only on sand
  const blob = (cx, cy, r) => {
    let put = 0;
    for (let y = cy - r - 1; y <= cy + r + 1; y++) for (let x = cx - r - 1; x <= cx + r + 1; x++) {
      if (x < 0 || y < 0 || x >= w || y >= h) continue;
      const d = Math.hypot(x - cx, y - cy) + (rnd() - 0.5) * 1.5;
      if (d > r) continue;
      const i = y * w + x;
      if (t[i] !== 0 && t[i] !== 1) continue;
      const thick = d < r * 0.45;
      g[i] = thick ? 200 : 100; t[i] = thick ? 5 : 4; put++;
    }
    return put;
  };
  const sandAt = (x, y) => x >= 2 && y >= 2 && x < w - 2 && y < h - 2 && (t[y * w + x] === 0 || t[y * w + x] === 1);
  const cxm = w / 2, cym = h / 2;
  for (const s of starts) {
    // one near each base, toward the middle
    const a0 = Math.atan2(cym - s.y, cxm - s.x);
    for (let k = 0; k < 40; k++) {
      const a = a0 + (rnd() - 0.5) * 1.6, d = 10 + rnd() * 5;
      const x = Math.round(s.x + Math.cos(a) * d), y = Math.round(s.y + Math.sin(a) * d);
      if (!sandAt(x, y)) continue;
      if (blob(x, y, 4 + ((rnd() * 2) | 0)) > 12) break;
    }
  }
  const fields = Math.round(w * h / 800);
  for (let k = 0, made = 0; k < fields * 20 && made < fields; k++) {
    const x = 3 + ((rnd() * (w - 6)) | 0), y = 3 + ((rnd() * (h - 6)) | 0);
    if (!sandAt(x, y) || nearStart(x, y, 10)) continue;
    if (blob(x, y, 3 + ((rnd() * 3) | 0)) > 8) made++;
  }
  // blooms
  const blooms = [];
  const nb = 2 + Math.round(w * h / 2000);
  for (let k = 0; k < nb * 30 && blooms.length < nb; k++) {
    const x = 2 + ((rnd() * (w - 4)) | 0), y = 2 + ((rnd() * (h - 4)) | 0), i = y * w + x;
    if (t[i] !== 0 || nearStart(x, y, 9)) continue;
    t[i] = 6; blooms.push([x, y]);
  }
  return { w, h, t, g, starts: starts.slice(0, n), blooms, name: 'KHARRA ' + style.toUpperCase() };
}

// =====================================================================
//  into the game: Game.rtsStartMission (the contract's), the play state's screen size, restart, the end
// =====================================================================
Object.assign(Game, {
  // the screen DESERT DOMINION wants: about 240 high, as wide as the window's shape allows (a map view and a sidebar)
  rtsLayout() {
    const wrap = document.getElementById('wrap');
    const aspect = wrap && wrap.clientHeight ? wrap.clientWidth / wrap.clientHeight : 16 / 10;
    // a tall window (a phone held upright): the narrowest screen, as tall as the window's shape (more map, a longer sidebar)
    if (aspect < 320 / 240) return [17, Math.max(14, Math.min(40, Math.round((320 / aspect - 16) / 16)))];
    const vr = 14, vc = Math.max(17, Math.min(34, Math.round((aspect * (vr * 16 + 16) - 48) / 16)));
    return [vc, vr];
  },
  rtsStartMission(opts) {
    opts = Object.assign({}, opts || {});
    this.mode = 'rts';
    // online (the host): the guests watch the host's screen (js/netstream.js) and each moves a cursor of its own
    if (Net.role !== 'host') Input.remote = {};
    if (!this.players || this.players.length !== 1 || this.players[0].bot) this.players = [newPlayer(0)];
    Input.numPlayers = 1 + Object.keys(Input.remote).length; this.twoP = false;
    const [vc, vr] = this.rtsLayout();
    setFieldSize(vc, vr, vc, vr);
    // keep the mission as it was given (RESTART ROUND plays it again from the start)
    this.rtsOpts = opts;
    const st = new RtsGame(opts);
    this.stage = st; this.rts = st;
    this.paused = false; this.pauseCtl = false;
    this.openH = SCREEN_H / 2;
    this.setState('play');
    return st;
  },
});
