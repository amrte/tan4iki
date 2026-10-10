'use strict';
// =====================================================================
//  DESERT DOMINION: the computer commander (RTS_AI).
//    RTS_AI.make(R, house, level) -> { tick(R) }, called every 15 frames for each computer House (level 0 gentle ..
//    4 hard). It plays only through the command API and sees only what its own side sees: it scouts, remembers
//    the enemy buildings and units it has seen (where and when), and forgets units that drop out of sight.
//    This file: the levels, perception (sight, memory, scouting targets), the economy (build order by tech level,
//    power, refineries and harvesters, silos, concrete, repairs, rebuilding, selling when stalled, MCVs) and the
//    base layout (compact, doors and docks kept clear and reachable, defences on the approaches facing the enemy).
//    rtsai_army.js: the army (what to build, rally, defence, attack waves, harassment, retreats, specials, palace).
// =====================================================================

// the difficulty levels (times in minutes of game time)
//  think: decide every n ticks; firstWave/waveGap: attack timing; wave0/waveGrow/waveMax: wave sizes (army points);
//  cap: army size; keep: units kept home; refs/hpr: refineries and harvesters per refinery; turrets/rturrets/walls:
//  defences; harass: raiding party size; prong: chance of a second prong; retreat/recall: pull back hurt waves, call
//  them home to defend; repairAt: building repair threshold; reserve: credits kept for the economy; smart: target
//  choice (0 nearest .. 3 value against threat); concrete; scout; forget: frames before an unseen unit is forgotten;
//  parallel: factories working at once; upg: factory upgrade levels it buys; lifters: skylifters.
const RTS_AI_LEVELS = [
  { think: 4, firstWave: 10, waveGap: 5, wave0: 3, waveGrow: 1, waveMax: 7, cap: 9, keep: 2, refs: 1, hpr: 1, turrets: 1, rturrets: 0, walls: 0,
    harass: 0, prong: 0, retreat: 0, recall: 0, repairAt: 0.45, reserve: 300, smart: 0, concrete: 0, scout: 0, forget: 1200, parallel: 1, upg: 1, lifters: 0, port: 0, react: 2 },
  { think: 2, firstWave: 9, waveGap: 4.5, wave0: 4, waveGrow: 1, waveMax: 10, cap: 14, keep: 2, refs: 2, hpr: 1, turrets: 2, rturrets: 1, walls: 0,
    harass: 0, prong: 0, retreat: 0.2, recall: 1, repairAt: 0.55, reserve: 250, smart: 1, concrete: 0, scout: 1, forget: 1800, parallel: 2, upg: 2, lifters: 0, port: 1, react: 1 },
  { think: 2, firstWave: 8, waveGap: 4, wave0: 5, waveGrow: 2, waveMax: 16, cap: 22, keep: 3, refs: 2, hpr: 1.2, turrets: 3, rturrets: 2, walls: 0,
    harass: 2, prong: 0, retreat: 0.3, recall: 1, repairAt: 0.65, reserve: 200, smart: 2, concrete: 1, scout: 1, forget: 2400, parallel: 2, upg: 2, lifters: 1, port: 1, react: 1 },
  { think: 1, firstWave: 5, waveGap: 3, wave0: 7, waveGrow: 2, waveMax: 24, cap: 30, keep: 3, refs: 3, hpr: 1.7, turrets: 3, rturrets: 2, walls: 2,
    harass: 3, prong: 0.4, retreat: 0.3, recall: 1, repairAt: 0.7, reserve: 150, smart: 3, concrete: 1, scout: 1, forget: 3000, parallel: 5, upg: 2, lifters: 1, port: 1, react: 0 },
  { think: 1, firstWave: 4, waveGap: 2.5, wave0: 8, waveGrow: 3, waveMax: 32, cap: 40, keep: 4, refs: 3, hpr: 2.2, turrets: 4, rturrets: 2, walls: 2,
    harass: 3, prong: 1, retreat: 0.3, recall: 1, repairAt: 0.75, reserve: 100, smart: 3, concrete: 1, scout: 1, forget: 3600, parallel: 5, upg: 2, lifters: 2, port: 1, react: 0 },
];
const RTS_AI_MIN = 3600;   // frames a minute
// what a building is worth to knock out (attack targets), and what a defence adds to the threat round it
const RTS_AI_VALUE = { yard: 9, heavy: 8, refinery: 8, vapor: 6, palace: 7, starport: 6, hightech: 6, lab: 5, light: 5, repair: 5, barracks: 4, hall: 4,
  radar: 4, silo: 3, turret: 2, rturret: 2, wall: 0 };
const RTS_AI_DEF_STR = { turret: 300, rturret: 420 };
// discs of tiles round a point, by radius (the engine's sight rule: dx*dx + dy*dy <= r*r + r)
const RTS_AI_DISC = (() => {
  const out = [];
  for (let r = 0; r <= 12; r++) {
    const a = [], rr = r * r + r;
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (dx * dx + dy * dy <= rr) a.push(dx, dy);
    out.push(Int8Array.from(a));
  }
  return out;
})();
// the threat a unit poses (and the worth of a unit of ours): its price, less as it's hurt
function rtsAiStr(d, hpFrac) {
  if (!d || (!d.wpn && !d.saboteur)) return 0;
  const c = d.cost || (d.cls === 'inf' ? 110 : 400);
  return c * (0.35 + 0.65 * Math.max(0, Math.min(1, hpFrac)));
}
function rtsAiHashStr(s) { let n = 7; for (let i = 0; i < s.length; i++) n = (n * 31 + s.charCodeAt(i)) >>> 0; return n; }

// each game's shared notes between computer Houses on the same team (a common target, who attacked when)
const RTS_AI_TEAMS = new WeakMap();
function rtsAiTeam(R, team) {
  let g = RTS_AI_TEAMS.get(R);
  if (!g) { g = {}; RTS_AI_TEAMS.set(R, g); }
  return g[team] || (g[team] = { target: null, t: -1e9, by: null, help: null, helpT: -1e9, waveT: -1e9, waveBy: null });
}

const RTS_AI = {
  make(R, house, level, opts) { return new RtsAiCommander(R, house, level, opts); },
  // a one-line state of a House's commander (tests, debugging)
  debug(R, h) { const Hs = R.houses[h]; return Hs && Hs.brain && Hs.brain.debug ? Hs.brain.debug(R) : ''; },
};

class RtsAiCommander {
  constructor(R, h, level, opts) {
    this.h = h;
    this.lv = Math.max(0, Math.min(4, level | 0));
    this.L = RTS_AI_LEVELS[this.lv];
    this.opts = opts || {};
    this.rnd = rtsRng(((R.seed >>> 0) ^ rtsAiHashStr(h) ^ Math.imul(this.lv + 1, 0x9E3779B1)) >>> 0);
    this.n = 0;
    this.ok = false;
    this.cost = 0; this.costN = 0;   // time spent thinking (ms), for the tests
  }
  // ================================================================ the tick
  tick(R) {
    const H = R.houses[this.h];
    if (!H || H.defeated) return;
    const t0 = typeof performance !== 'undefined' ? performance.now() : 0;
    if (!this.ok) this.init(R, H);
    this.n++;
    const f = this.f = R.frame, L = this.L, n = this.n;
    this.sortUnits(R, H);
    if (n % (L.think > 2 ? 2 : 1) === 0) this.perceive(R, H);
    if (n % 8 === 1) this.strategy(R, H);
    // the economy every tick (cheap unless it places something), the army by the level's pace
    if (n % Math.min(2, L.think) === 0) this.economy(R, H);
    if (n % L.think === 0) this.army(R, H);
    if (t0) { const dt = performance.now() - t0; this.cost += dt; this.costN++; if (dt > (this.costMax || 0)) { this.costMax = dt; this.costMaxAt = this.lastStep; } }
  }
  init(R, H) {
    this.ok = true;
    const N = R.N;
    this.W = R.W; this.Hh = R.H;
    this.vis = new Int32Array(N);         // the tick a tile was last seen by our side (0: never)
    this.bvis = new Uint8Array(N);        // seen by our side's buildings (they don't move)
    this.bvisSig = -1;
    this.keep = new Uint8Array(N);        // tiles to keep clear: doors, docks, the road out
    this.flood = new Uint32Array(N); this.floodGen = 0; this.floodQ = new Int32Array(N);
    this.dist = null;                     // a walking-distance map from the enemy (the approaches)
    this.mb = new Map();                  // remembered enemy buildings: id -> { o, key, h, x, y, w, hh, t, hp }
    this.mu = new Map();                  // remembered enemy units: id -> { o, key, h, x, y, t, hp, str }
    this.mix = { inf: 0, light: 0, heavy: 0, air: 0 };   // what the enemy fields (seen, decaying)
    this.worms = [];
    this.role = new Map();                // our units: id -> role ('pool', 'def', 'wave', 'harass', 'scout', 'fix', 'bloom', 'conv')
    this.waves = [];
    this.block = {};                      // building keys put off until a frame (couldn't be placed)
    this.plan = null;                     // a building and its spot (concrete laid there first)
    this.slabs = [];                      // where the queued concrete goes
    this.placeFail = 0;
    this.layoutSig = -1;
    this.approaches = []; this.road = new Set(); this.apT = -1e9; this.apKey = '';
    this.rally = null;
    this.home = { x: H.start.x, y: H.start.y };
    this.cands = (R.map.starts || []).filter(s => Math.hypot(s.x - H.start.x, s.y - H.start.y) > 10).map(s => ({ x: s.x, y: s.y, seen: false }));
    this.foeBases = {};                   // per enemy House: { x, y, n, t } from the buildings remembered
    this.main = null;                     // the enemy base we go for
    const f = R.frame, L = this.L;
    this.nextWave = f + L.firstWave * RTS_AI_MIN * (0.9 + this.rnd() * 0.2);
    this.nextHarass = f + (L.firstWave * 0.7) * RTS_AI_MIN;
    this.nextScout = f + (this.lv >= 3 ? 300 : 900);
    this.waveN = 0; this.counterT = -1e9;
    this.lastThreat = -1e9; this.threatStr = 0; this.attackedT = -1e9;
    this.glimNear = 99999; this.glimT = -1e9;
    this.stallT = -1; this.lastIncome = f; this.lastCredits = H.credits; this.lastHarv = H.stats.harvested;
    this.mcvSpot = null;
    this.census = new Map();              // enemy army units seen in the last minutes: id -> { o, str, t, h }
    this.incomeLog = [[f, H.stats.harvested]]; this.income = 0;
    this.nomadsOnly = !H.buildings.length && !H.units.some(u => u.d.deploys);
    // several computer Houses on one side against the player: they take turns to attack, and hit a little softer
    // (a campaign's two-House missions would otherwise swamp a lone commander)
    const mates = R.houseList.filter(o => o.team === H.team && !o.human && !o.nomads && o.ai !== null && o.ai !== undefined).length;
    const vsHuman = R.houseList.some(o => o.human && o.team !== H.team);
    this.mates = vsHuman ? mates : 1;
    this.soft = this.mates >= 2 ? (this.lv >= 4 ? 0.85 : 0.75) : 1;
    if (this.mates >= 2) this.nextWave += (this.mates - 1) * RTS_AI_MIN * (0.5 + this.rnd());
    // a campaign mission: the player starts with next to nothing against a standing base, so the first attack
    // waits longer and the waves hit softer (the mission's own raids keep the pressure on)
    this.campaign = !!(R.opts.mission && R.opts.mission.campaign) && !H.human;
    if (this.campaign) { this.nextWave += 3 * RTS_AI_MIN; this.nextHarass += 3 * RTS_AI_MIN; this.soft *= 0.8; }
    // what it starts with: units already round a base stay home to guard it
    for (const u of H.units) if (u.d.wpn && !u.d.harvester) this.role.set(u.id, H.buildings.length ? 'def' : 'pool');
  }
  // our units by what they are (once a tick)
  sortUnits(R, H) {
    const army = [], harvs = [], lifters = [], mcvs = [], sabs = [], air = [];
    for (const u of H.units) {
      if (u.dead || u.carried || u.key === 'frigate') continue;
      const d = u.d;
      if (d.harvester) harvs.push(u);
      else if (d.lifter) lifters.push(u);
      else if (d.deploys) mcvs.push(u);
      else if (d.saboteur) sabs.push(u);
      else if (d.wpn) { if (d.cls === 'air') air.push(u); else army.push(u); }
    }
    this.armyU = army; this.harvs = harvs; this.lifters = lifters; this.mcvs = mcvs; this.sabs = sabs; this.air = air;
    let yard = null;
    for (const b of H.buildings) if (b.key === 'yard' && !b.dead) { yard = b; break; }
    this.yard = yard;
    if (yard) this.home = { x: yard.x + 1, y: yard.y + 1 };
    else if (H.buildings.length) {
      let sx = 0, sy = 0, k = 0;
      for (const b of H.buildings) if (!b.d.wall && !b.d.defense) { sx += b.x + b.w / 2; sy += b.y + b.hh / 2; k++; }
      if (k) this.home = { x: Math.round(sx / k), y: Math.round(sy / k) };
    }
    this.enemies = R.enemiesOf(this.h);
  }

  // ================================================================ perception: what our side sees now, and memory
  perceive(R, H) {
    const W = this.W, Hh = this.Hh, vis = this.vis, n = this.n, f = R.frame;
    // the buildings' sight (ours and our friends'), redone when they change
    let sig = 0;
    for (const A of R.houseList) if (A.team === H.team) for (const b of A.buildings) sig = (sig * 31 + b.id) >>> 0;
    if (sig !== this.bvisSig) {
      this.bvisSig = sig;
      const bv = this.bvis;
      bv.fill(0);
      for (const A of R.houseList) if (A.team === H.team) for (const b of A.buildings) {
        const cx = b.x + (b.w >> 1), cy = b.y + (b.hh >> 1), D = RTS_AI_DISC[Math.min(12, (b.d.sight || 2) + 1)];
        for (let k = 0; k < D.length; k += 2) { const x = cx + D[k], y = cy + D[k + 1]; if (x >= 0 && y >= 0 && x < W && y < Hh) bv[y * W + x] = 1; }
      }
    }
    // the units' sight
    for (const A of R.houseList) {
      if (A.team !== H.team) continue;
      for (const u of A.units) {
        if (u.dead || u.carried) continue;
        const D = RTS_AI_DISC[Math.min(12, u.d.sight || 1)];
        for (let k = 0; k < D.length; k += 2) { const x = u.tx + D[k], y = u.ty + D[k + 1]; if (x >= 0 && y >= 0 && x < W && y < Hh) vis[y * W + x] = n; }
      }
    }
    this.visN = n;
    // the enemy: units and buildings in sight go into memory
    const mix = this.mix;
    for (const E of this.enemies) {
      for (const u of E.units) {
        if (u.dead || u.carried || u.d.untargetable) continue;
        if (u.d.stealth && u.still > 60) continue;   // hidden while it keeps still
        if (!this.seen(u.tx, u.ty)) continue;
        let r = this.mu.get(u.id);
        if (!r) {
          r = { o: u, id: u.id, key: u.key, d: u.d, h: u.h, x: u.tx, y: u.ty, t: f, hp: 1, first: f };
          this.mu.set(u.id, r);
          const c = u.d.cost || 100;
          if (u.d.cls === 'air') mix.air += c; else if (u.d.cls === 'inf') mix.inf += c; else if (u.d.armor === 'light') mix.light += c; else if (u.d.wpn) mix.heavy += c;
        }
        r.x = u.tx; r.y = u.ty; r.t = f; r.h = u.h; r.hp = u.hp / u.max; r.mv = !!(u.path || u.mv);
        if (u.d.wpn) { const c = this.census.get(u.id); if (c) { c.t = f; c.str = rtsAiStr(u.d, r.hp); c.h = u.h; } else this.census.set(u.id, { o: u, str: rtsAiStr(u.d, r.hp), t: f, h: u.h }); }
      }
      for (const b of E.buildings) {
        if (b.dead) continue;
        if (!this.seesB(b)) continue;
        let r = this.mb.get(b.id);
        if (!r) { r = { o: b, id: b.id, key: b.key, d: b.d, h: b.h, x: b.x, y: b.y, w: b.w, hh: b.hh, t: f, hp: 1, first: f }; this.mb.set(b.id, r); }
        r.t = f; r.h = b.h; r.hp = b.hp / b.max;
      }
    }
    // who shot at us is seen (the shots give them away)
    for (const u of H.units) {
      const by = u.hitBy;
      if (!by || f - u.hitT > 20 || by.dead || !by.isU || !R.isEnemy(this.h, by.h) || by.d.untargetable) continue;
      let r = this.mu.get(by.id);
      if (!r) { r = { o: by, id: by.id, key: by.key, d: by.d, h: by.h, x: by.tx, y: by.ty, t: f, hp: 1, first: f }; this.mu.set(by.id, r); }
      r.x = by.tx; r.y = by.ty; r.t = f; r.hp = by.hp / by.max;
    }
    // forget what isn't there any more (looked at and gone), and units long out of sight
    if (n % 4 === 0) {
      for (const [id, r] of this.mb) if (r.t !== f && (this.seesB(r) || r.o.dead && f - r.t > 9000)) this.mb.delete(id);
      const fg = this.L.forget;
      for (const [id, r] of this.mu) if (r.t !== f && (f - r.t > fg || this.seen(r.x, r.y))) this.mu.delete(id);
      for (const k in mix) mix[k] *= 0.985;
      // the enemy's army as last counted: forgotten after a few minutes, or when it fell where we saw it last
      for (const [id, c] of this.census) {
        if (c.o.dead && f - c.t < 120) { (this.foeLost || (this.foeLost = [])).push({ t: f, v: c.o.d.cost || 100 }); this.census.delete(id); }
        else if (f - c.t > 4 * RTS_AI_MIN || c.o.h !== c.h && !R.isEnemy(this.h, c.o.h)) this.census.delete(id);
      }
      if (this.foeLost) while (this.foeLost.length && f - this.foeLost[0].t > RTS_AI_MIN) this.foeLost.shift();
    }
    // sandwyrms we can see
    this.worms.length = 0;
    for (const w of R.worms) {
      if (w.phase === 'away') continue;
      const tx = (w.x / 16) | 0, ty = (w.y / 16) | 0;
      // the ripple in the sand shows wherever we have explored (as on the player's screen; in fog: in sight only)
      if (R.fog ? this.seen(tx, ty) : this.everSeen(tx, ty) || this.seen(tx, ty)) this.worms.push({ x: tx, y: ty, hunt: w.phase === 'hunt' || w.phase === 'rise' });
    }
    // where a wyrm was seen lately (it may have slipped out of sight)
    const wm = this.wormMem || (this.wormMem = []);
    for (const w of this.worms) { const o = wm.find(m => Math.abs(m.x - w.x) + Math.abs(m.y - w.y) < 6); if (o) Object.assign(o, w, { t: f }); else wm.push(Object.assign({ t: f }, w)); }
    for (let k = wm.length - 1; k >= 0; k--) if (f - wm[k].t > 1200) wm.splice(k, 1);
    // the likely enemy starts: looked at
    for (const c of this.cands) if (!c.seen && this.vis[c.y * W + c.x]) c.seen = true;
  }
  seen(x, y) {
    if (x < 0 || y < 0 || x >= this.W || y >= this.Hh) return false;
    const i = y * this.W + x;
    return this.vis[i] === this.visN || this.bvis[i] === 1;
  }
  seesB(b) {
    return this.seen(b.x + (b.w >> 1), b.y + (b.hh >> 1)) || this.seen(b.x, b.y) || this.seen(b.x + b.w - 1, b.y + b.hh - 1) || this.seen(b.x + b.w - 1, b.y) || this.seen(b.x, b.y + b.hh - 1);
  }
  everSeen(x, y) { return x >= 0 && y >= 0 && x < this.W && y < this.Hh && (this.vis[y * this.W + x] > 0 || this.bvis[y * this.W + x] === 1); }

  // ================================================================ strategy: where the enemy is, the approaches, the rally point
  strategy(R, H) {
    const f = R.frame;
    // the enemy bases as remembered (the middle of their buildings)
    const fb = {};
    for (const r of this.mb.values()) {
      if (r.d.wall) continue;
      const o = fb[r.h] || (fb[r.h] = { h: r.h, sx: 0, sy: 0, n: 0, val: 0, yard: null });
      o.sx += r.x + r.w / 2; o.sy += r.y + r.hh / 2; o.n++; o.val += RTS_AI_VALUE[r.key] || 1;
      if (r.key === 'yard') o.yard = r;
    }
    for (const k in fb) { const o = fb[k]; o.x = Math.round(o.sx / o.n); o.y = Math.round(o.sy / o.n); }
    this.foeBases = fb;
    // the main enemy: the nearest known base (a shared team target first, when a friend has one)
    const T = rtsAiTeam(R, H.team);
    let main = null, md = 1e9;
    for (const k in fb) {
      const o = fb[k];
      let d = Math.hypot(o.x - this.home.x, o.y - this.home.y);
      if (T.target && T.target.h === o.h && f - T.t < 3 * RTS_AI_MIN) d *= 0.6;
      if (R.houses[o.h] && R.houses[o.h].human) d *= 0.85;   // the player first, as the original did
      if (d < md) { md = d; main = o; }
    }
    if (!main && T.target && f - T.t < 4 * RTS_AI_MIN) main = { h: T.target.h, x: T.target.x, y: T.target.y, n: 0, guess: true };
    if (!main) {
      // not found yet: the nearest likely start not yet looked at
      let best = null, bd = 1e9;
      for (const c of this.cands) { if (c.seen) continue; const d = Math.hypot(c.x - this.home.x, c.y - this.home.y); if (d < bd) { bd = d; best = c; } }
      if (best) main = { h: null, x: best.x, y: best.y, n: 0, guess: true };
    }
    this.main = main;
    // the approaches (where enemy paths reach the base) and the rally point: now and then, or when the enemy moves
    const key = main ? (main.x >> 2) + ',' + (main.y >> 2) : '';
    if ((key !== this.apKey || f - this.apT > 2 * RTS_AI_MIN) && (this.yard || H.buildings.length)) { this.apKey = key; this.apT = f; this.findApproaches(R, H); }
    // how much glimmer there is round the refineries
    if (f - this.glimT > 1800) { this.glimT = f; this.glimNear = this.glimmerNear(R, H); }
  }
  // breadth-first walking distance (vehicles) from (sx, sy) over the whole map
  distMap(R, sx, sy) {
    const W = this.W, N = R.N, D = this.dist || (this.dist = new Int16Array(N)), q = this.floodQ, t = R.map.t, pass = RTS_PASS.track;
    D.fill(-1);
    let head = 0, tail = 0;
    const s0 = sy * W + sx;
    D[s0] = 0; q[tail++] = s0;
    while (head < tail) {
      const c = q[head++], cx = c % W, cy = (c / W) | 0, dc = D[c] + 1;
      for (let k = 0; k < 4; k++) {
        const nx = cx + (k === 0 ? 1 : k === 1 ? -1 : 0), ny = cy + (k === 2 ? 1 : k === 3 ? -1 : 0);
        if (nx < 0 || ny < 0 || nx >= W || ny >= this.Hh) continue;
        const i = ny * W + nx;
        if (D[i] >= 0) continue;
        // through rock, sand and our buildings' tiles (the base will be built over); not cliffs
        if (!pass[t[i]] && !R.bAt[i]) continue;
        D[i] = dc; q[tail++] = i;
      }
    }
    return D;
  }
  findApproaches(R, H) {
    const W = this.W, home = this.home;
    this.approaches = [];
    this.road = new Set();
    const targets = [];
    if (this.main) targets.push(this.main);
    for (const k in this.foeBases) { const o = this.foeBases[k]; if (o !== this.main && targets.length < 3) targets.push(o); }
    if (!targets.length) for (const c of this.cands) if (targets.length < 2) targets.push(c);
    for (const tg of targets) {
      const D = this.distMap(R, Math.max(0, Math.min(W - 1, tg.x)), Math.max(0, Math.min(this.Hh - 1, tg.y)));
      // from home, down the distance toward the enemy: the road out, and the approach point some tiles out
      let x = home.x, y = home.y;
      if (D[y * W + x] < 0) { const p = this.nearestWith(x, y, 6, i => D[i] >= 0); if (!p) continue; x = p.x; y = p.y; }
      let ap = null;
      for (let step = 0; step < 40; step++) {
        const i = y * W + x;
        this.road.add(i);
        const r = Math.hypot(x - home.x, y - home.y);
        if (!ap && r >= 7) ap = { x, y, w: tg === this.main ? 2 : 1 };
        if (r >= 11) break;
        let bx = -1, by = -1, bd = D[i];
        for (let k = 0; k < 8; k++) {
          const nx = x + RTS_DX8[k], ny = y + RTS_DY8[k];
          if (nx < 0 || ny < 0 || nx >= W || ny >= this.Hh) continue;
          const dn = D[ny * W + nx];
          if (dn >= 0 && dn < bd) { bd = dn; bx = nx; by = ny; }
        }
        if (bx < 0) break;
        x = bx; y = by;
      }
      if (ap) this.approaches.push(ap);
    }
    if (!this.approaches.length) this.approaches.push(this.towards(home, this.main || { x: R.W / 2, y: R.H / 2 }, 7, 1));
    // the rally point: on the main road, a few tiles out, on open ground
    const a = this.approaches[0];
    const mid = { x: Math.round(home.x + (a.x - home.x) * 0.75), y: Math.round(home.y + (a.y - home.y) * 0.75) };
    const p = this.nearestWith(mid.x, mid.y, 6, i => R.passStatic('track', i) && !this.keep[i] && R.map.t[i] !== RTS_T.GLIM && R.map.t[i] !== RTS_T.THICK && RTS_BUILDABLE[R.map.t[i]]) ||
      this.nearestWith(mid.x, mid.y, 6, i => R.passStatic('track', i));
    if (p && (!this.rally || this.rally.x !== p.x || this.rally.y !== p.y)) {
      this.rally = p;
      for (const b of H.buildings) if (b.d.fac && b.key !== 'yard') R.setRally(this.h, b, p.x, p.y);
    }
    this.layoutSig = -1;
  }
  nearestWith(cx, cy, maxR, test) {
    const W = this.W;
    for (let r = 0; r <= maxR; r++) {
      for (let y = cy - r; y <= cy + r; y++) for (let x = cx - r; x <= cx + r; x++) {
        if (Math.max(Math.abs(x - cx), Math.abs(y - cy)) !== r || x < 0 || y < 0 || x >= W || y >= this.Hh) continue;
        if (test(y * W + x)) return { x, y };
      }
    }
    return null;
  }
  towards(a, b, d, w) {
    const L = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    return { x: Math.round(a.x + (b.x - a.x) / L * d), y: Math.round(a.y + (b.y - a.y) / L * d), w: w || 1 };
  }
  // glimmer within reach of the refineries (or home)
  glimmerNear(R, H) {
    const W = this.W, g = R.map.g;
    const refs = H.buildings.filter(b => b.key === 'refinery');
    const pts = refs.length ? refs.map(b => ({ x: b.x + 1, y: b.y + 1 })) : [this.home];
    let sum = 0;
    const seen = new Set();
    for (const p of pts) for (let y = p.y - 16; y <= p.y + 16; y += 1) for (let x = p.x - 16; x <= p.x + 16; x += 1) {
      if (x < 0 || y < 0 || x >= W || y >= this.Hh) continue;
      const i = y * W + x;
      if (!g[i] || seen.has(i) || !this.everSeen(x, y)) continue;
      seen.add(i); sum += g[i];
    }
    return sum;
  }

  // ================================================================ the economy
  economy(R, H) {
    if (this.n % 8 === 0) {
      const log = this.incomeLog;
      log.push([R.frame, H.stats.harvested]);
      while (log.length > 2 && R.frame - log[1][0] >= 2 * RTS_AI_MIN) log.shift();
      const a = log[0], b = log[log.length - 1];
      this.income = b[0] > a[0] ? (b[1] - a[1]) / (b[0] - a[0]) : 0;
    }
    this.mcvs.forEach(u => this.handleMcv(R, H, u));
    if (this.yard) {
      this.placeReady(R, H);
      if (!H.prod.yard.queue.length) this.chooseBuild(R, H);
    }
    this.harvesting(R, H);
    if (this.n % 4 === 0) this.repairs(R, H);
    if (this.n % 8 === 4) this.unstall(R, H);
  }
  count(H, k) { return H.count[k] | 0; }
  // credits a frame the queues are paying now, and what we can afford to start (income, plus the bank spent over ~25 s)
  drain(R, H) {
    const pf = R.powerFactor(H) * (H.aiBoost || 1);
    let d = 0;
    for (const k of RTS_FACTORIES) {
      const q = H.prod[k];
      if (!q.queue.length || q.ready) continue;
      const key = q.queue[0], cost = R.itemCost(H, key, k);
      if (q.paid < cost) d += cost / R.itemTime(key) * pf;
    }
    return d;
  }
  affords(R, H, key, kind, reserve) {
    const pf = R.powerFactor(H) * (H.aiBoost || 1);
    const want = rtsPriceOf(this.h, key) / R.itemTime(key) * pf;
    const avail = this.income * 1.15 + Math.max(0, H.credits - (reserve || 0)) / 1500;
    return this.drain(R, H) + want <= avail + 0.02;
  }
  can(R, H, list, k) { return list.has(k) && !(this.block[k] > R.frame); }
  // how many refineries: the level's number, one more late in a long game when the fields are rich, fewer when broke
  refTarget(R, H) {
    let n = this.L.refs;
    if (this.lv >= 3 && R.frame > 14 * RTS_AI_MIN && this.glimNear > 4000) n++;
    if (this.nomadsOnly) n = 0;
    return n;
  }
  turretTarget(R, H) {
    const L = this.L, min = R.frame / RTS_AI_MIN;
    let n = Math.min(L.turrets, 1 + Math.floor(min / 3));
    if (R.frame - this.attackedT < 2 * RTS_AI_MIN) n += 1;
    return n;
  }
  chooseBuild(R, H) {
    const h = this.h, f = R.frame, L = this.L, lv = this.lv, T = H.techLevel;
    const list = new Set(R.buildList(h, 'yard'));
    const c = k => this.count(H, k), can = k => this.can(R, H, list, k);
    const spare = H.powerOut - H.powerUse;
    const refs = c('refinery'), harv = this.harvs.length;
    let pick = null, urgent = false;
    const want = [];
    if (!c('vapor')) want.push('vapor');
    if (!refs) want.push('refinery');
    // no harvester and no heavy factory to make one: another refinery brings one with it
    if (refs && !harv && !this.canMakeHarv(R, H) && H.credits >= 400 && !this.harvOrdered(H) && refs < 5) want.push('refinery');
    // short of harvesters with no heavy factory yet: a refinery is the cheapest harvester there is
    const hwant = Math.max(refs, Math.round(refs * L.hpr));
    if (refs && harv <= 1 && harv < hwant && !this.canMakeHarv(R, H) && refs < Math.min(3, this.refTarget(R, H) + 1) && H.credits >= 450 && R.frame > 2 * RTS_AI_MIN) want.push('refinery');
    // glimmer lost for want of storage
    if (H.credits >= H.storage - 250 && c('silo') < 2 + refs && f > 1800 && refs) want.push('silo');
    const seq = [['barracks', 1], ['hightech', this.wormKills >= 3 && c('heavy') ? 1 : 0], ['refinery', Math.min(2, this.refTarget(R, H))], ['light', 1], ['radar', 1], ['heavy', 1],
      ['turret', Math.min(2, this.turretTarget(R, H))], ['hall', lv >= 1 ? 1 : 0], ['repair', lv >= 1 ? 1 : 0], ['hightech', lv >= 1 || T >= 6 || this.wormKills >= 2 ? 1 : 0],
      ['refinery', this.refTarget(R, H)], ['turret', this.turretTarget(R, H) - (lv >= 2 && list.has('rturret') ? 1 : 0)],
      ['rturret', this.mix.air > 400 ? Math.max(2, L.rturrets) : L.rturrets], ['lab', lv >= 1 && R.upgLevel(H, 'heavy') >= 1 ? 1 : 0], ['starport', lv >= 1 ? 1 : 0],
      ['palace', lv >= 1 || f > 25 * RTS_AI_MIN ? 1 : 0], ['wall', L.walls ? Math.min(L.walls, 2 * (c('turret') + c('rturret'))) : 0]];
    for (const [k, n] of seq) if (c(k) < n) want.push(k);
    // the costly extras wait for a decent army and money to spare (the army and the economy come first)
    let pts = 0;
    for (const u of this.armyU) pts += rtsAiPts(u.d);
    const armyOk = pts >= Math.min(L.cap * 0.6, 3 + f / RTS_AI_MIN * 1.5) || f - this.lastThreat < 600 && pts >= 4;
    this.armyOk = armyOk;
    const lux = { hightech: 1, starport: 1, palace: 1, wall: 1, repair: 1, lab: 1, rturret: 1 };
    for (const k of want) {
      if (!can(k)) continue;
      const luxK = lux[k] || k === 'turret' && c('turret') >= 2 && f - this.attackedT > RTS_AI_MIN;
      if (luxK && !(armyOk && H.credits > rtsPriceOf(h, k) * (k === 'palace' || k === 'starport' ? 1 : 0.5) && !this.econNeed) && !(k === 'hightech' && this.wormKills >= 3)) continue;
      if (k === 'wall' && !this.findDefenseSpot(R, H, 'wall', true)) continue;
      pick = k; break;
    }
    if (pick === 'vapor' || pick === 'refinery' && (!refs || !harv)) urgent = true;
    // power for it (the vapor trap first)
    if (pick && pick !== 'vapor' && can('vapor')) {
      const use = -(RTS_BUILDINGS[pick].power || 0);
      if (spare - use < 15) { pick = 'vapor'; urgent = true; }
    }
    if (!pick && can('vapor') && (spare < 30 || spare < 60 && H.credits > 1500) && c('vapor') < 14) pick = 'vapor';
    // the yard's upgrade (concrete 2x2, rocket turrets)
    if (!pick && this.yard && R.nextUpgrade(this.yard) && H.credits > 700 && lv >= 1 && c('heavy') && this.yard.level < 1 && armyOk) { R.upgrade(h, this.yard); return; }
    if (!pick) {
      // rich and nothing to build: concrete under a building that stands on bare rock is of no use any more; more
      // turrets late on at the higher levels
      if (lv >= 3 && H.credits > 2500 && can('turret') && c('turret') + c('rturret') < L.turrets + L.rturrets + 4) pick = can('rturret') && this.rnd() < 0.6 ? 'rturret' : 'turret';
      else return;
    }
    const price = rtsPriceOf(h, pick);
    // save for the economy: no new building past the essentials while broke and short of harvesters
    // (what leads to more harvesters isn't held back for the economy's sake)
    const toHarv = !this.canMakeHarv(R, H) && (pick === 'light' || pick === 'radar' || pick === 'heavy' || pick === 'refinery');
    if (!urgent && pick !== 'silo' && H.credits < price * 0.35 + (this.econNeed && !toHarv ? 300 : 0) + (this.insurance && !(toHarv && pick === 'refinery') ? this.insurance + price * 0.4 : 0)) return;
    // concrete first (the higher levels, when well off): the spot chosen now, the slabs, then the building
    if (L.concrete && !urgent && !RTS_BUILDINGS[pick].defense && !RTS_BUILDINGS[pick].wall && pick !== 'silo' && H.credits > price + 250) {
      const spot = this.findSpot(R, H, pick);
      if (spot && this.queueConcrete(R, H, list, pick, spot)) { this.plan = { key: pick, x: spot.x, y: spot.y }; R.startBuild(h, 'yard', pick); return; }
    }
    this.plan = null;
    R.startBuild(h, 'yard', pick);
  }
  // concrete slabs for the tiles of a spot that are bare rock (2x2 slabs where they fit, else 1x1)
  queueConcrete(R, H, list, key, spot) {
    const d = RTS_BUILDINGS[key], W = this.W, t = R.map.t;
    const bare = [];
    for (let y = spot.y; y < spot.y + d.h; y++) for (let x = spot.x; x < spot.x + d.w; x++) if (t[y * W + x] !== RTS_T.CONC) bare.push({ x, y });
    if (!bare.length) return false;
    const big = list.has('slab4'), q = [], used = new Set();
    if (big) {
      for (let y = spot.y; y + 1 < spot.y + d.h; y += 2) for (let x = spot.x; x + 1 < spot.x + d.w; x += 2) {
        q.push({ key: 'slab4', x, y });
        used.add(y * W + x); used.add(y * W + x + 1); used.add((y + 1) * W + x); used.add((y + 1) * W + x + 1);
      }
    }
    for (const p of bare) if (!used.has(p.y * W + p.x)) q.push({ key: 'slab1', x: p.x, y: p.y });
    if (q.length > 6) return false;
    // nearest our buildings first (each slab must touch our buildings or concrete)
    const near = p => { let best = 99; for (const b of H.buildings) { const dx = Math.max(b.x - p.x, 0, p.x - (b.x + b.w - 1)), dy = Math.max(b.y - p.y, 0, p.y - (b.y + b.hh - 1)); best = Math.min(best, Math.max(dx, dy)); } return best; };
    q.sort((a, b) => near(a) - near(b));
    this.slabs = q;
    for (const s of q) R.startBuild(this.h, 'yard', s.key);
    return true;
  }
  // a finished building (or slab) waits in the yard: put it down
  placeReady(R, H) {
    const h = this.h, key = R.ready(h, 'yard');
    if (!key) return;
    const d = RTS_BUILDINGS[key];
    if (d.slab) {
      // a planned spot it fits now (they're laid outward from the base), else the plan is dropped: the slabs go back
      for (let j = 0; j < this.slabs.length; j++) {
        const s = this.slabs[j];
        if (s.key === key && R.canPlace(h, key, s.x, s.y) && R.place(h, key, s.x, s.y)) { this.slabs.splice(j, 1); return; }
      }
      this.slabs = [];
      const q = H.prod.yard.queue;
      for (let k = q.length - 1; k >= 1; k--) if (RTS_BUILDINGS[q[k]] && RTS_BUILDINGS[q[k]].slab) q.splice(k, 1);
      R.cancelBuild(h, 'yard', key);
      return;
    }
    let spot = null;
    if (this.plan && this.plan.key === key && R.canPlace(h, key, this.plan.x, this.plan.y)) spot = this.plan;
    else if (this.n % 2 === 0 || this.placeFail === 0) spot = this.findSpot(R, H, key);
    if (spot && R.place(h, key, spot.x, spot.y)) {
      this.plan = null; this.placeFail = 0; this.layoutSig = -1;
      // a new factory sends its units to the rally point
      const b = R.bAt[spot.y * this.W + spot.x];
      if (b && b.d.fac && b.key !== 'yard' && this.rally) R.setRally(h, b, this.rally.x, this.rally.y);
      return;
    }
    if (++this.placeFail > 10) {
      R.cancelBuild(h, 'yard');
      this.block[key] = R.frame + 2 * RTS_AI_MIN;
      this.placeFail = 0; this.plan = null;
    }
  }
  // ---------------------------------------------------------------- harvesters
  canMakeHarv(R, H) { return R.factoryOf(H, 'heavy') && R.buildList(this.h, 'heavy').includes('harvester'); }
  harvOrdered(H) {
    if (H.prod.heavy.queue.includes('harvester')) return true;
    return !!(H.port && H.port.order.some(o => o.key === 'harvester'));
  }
  harvesting(R, H) {
    const h = this.h, f = R.frame, lv = this.lv;
    const refs = this.count(H, 'refinery'), harvs = this.harvs;
    // how many: per refinery by level, a few more on a big rich map
    const want = refs ? Math.min(10, Math.max(refs, Math.round(refs * this.L.hpr))) : 0;
    this.econNeed = refs > 0 && harvs.length < Math.min(want, refs) || !refs && !this.nomadsOnly;
    // money kept back while one sandwyrm could leave us with no harvester (enough for another, or a refinery)
    const mk = this.canMakeHarv(R, H);
    this.insurance = !refs || this.nomadsOnly || harvs.length > (mk ? 1 : 2) ? 0 : mk ? rtsPriceOf(h, 'harvester') : rtsPriceOf(h, 'refinery');
    if (refs && harvs.length < want && !this.harvOrdered(H)) {
      if (this.canMakeHarv(R, H)) {
        const q = H.prod.heavy.queue;
        if (!q.length) R.startBuild(h, 'heavy', 'harvester');
        else if (!harvs.length && q[0] !== '_upg') { while (q.length) R.cancelBuild(h, 'heavy'); R.startBuild(h, 'heavy', 'harvester'); }
      } else if (H.count.starport && R.portAllowed(H, 'harvester') && H.port.stock.harvester > 0 && !H.port.frigate && H.credits >= H.port.price.harvester) {
        R.starportBuy(h, 'harvester');
      }
    }
    // a harvester gone without a shot fired: a sandwyrm took it there (keep away from that sand a while)
    const seenH = this.harvSeen || (this.harvSeen = new Map());
    for (const [id, o] of seenH) {
      if (!o.u.dead) continue;
      seenH.delete(id);
      if (f - o.u.hitT > 90) { this.wormKills = (this.wormKills || 0) + 1; (this.hot || (this.hot = [])).push({ x: o.u.tx, y: o.u.ty, t: f + RTS_AI_MIN, k: f, worm: true }); if (this.hot.length > 8) this.hot.shift(); }
    }
    for (const u of harvs) if (!seenH.has(u.id)) seenH.set(u.id, { u });
    // a harvester being built with no money for it: the army's queues give theirs back
    const hq = H.prod.heavy;
    if (hq.queue[0] === 'harvester' && hq.broke && harvs.length < refs) for (const k of ['hightech', 'light', 'hall', 'barracks']) { const q = H.prod[k].queue; if (q.length && q[0] !== '_upg' && q[0] !== 'skylifter') R.cancelBuild(h, k); }
    // each harvester: busy, out of danger, sent to a good field (near, close to the rock, away from trouble)
    for (const u of harvs) {
      if (u.docked) { u.aiHinted = false; continue; }
      if (u.lift) continue;
      // a sandwyrm closing in: keep still (it hunts what moves and digs), on again when it has gone
      if (lv >= 1 && !RTS_AI.noWormAvoid && this.wormMem && this.wormMem.length && !(u.hitT > f - 30)) {
        // (a short halt only: a wyrm denied its meal stays about and hunts something else; a harvester kept idle
        // long costs more than one now and then)
        let near = false;
        for (const w of this.wormMem) {
          if (!w.hunt || f - w.t > 60) continue;
          const d = Math.abs(w.x - u.tx) + Math.abs(w.y - u.ty);
          if (d <= (lv >= 3 ? 11 : 8) && d >= 3) { near = true; break; }
        }
        if (near && !(u.aiStillT && f - u.aiStillT < 60 * 60 && f - u.aiStillT > 12 * 60)) {
          if (u.order.k !== 'idle' || u.path) R.cmdStop(u);
          if (!u.aiStillT || f - u.aiStillT >= 60 * 60) u.aiStillT = f;
          u.aiWaitT = Math.max(u.aiWaitT || 0, f + 120); u.aiHinted = false; continue;
        }
      }
      // no glimmer in reach: try a field of our choosing; boxed in by our own buildings a while: sell one to let it out
      if (u.noGlim && u.hs === 'seek') {
        u.aiHinted = false;
        if (!u.aiNoG) u.aiNoG = f;
        if (f - u.aiNoG > 1800 && this.nearBase(R, H, u.tx, u.ty, 1)) { this.freeHarvester(R, H, u); u.aiNoG = f; }
      } else u.aiNoG = 0;
      // parked (by the refinery while a sandwyrm feeds out there, or keeping still)
      if (u.aiWaitT) { if (f < u.aiWaitT && !(u.hitT > f - 30)) continue; u.aiWaitT = 0; R.cmdHarvest(u); u.aiHinted = false; }
      if (lv >= 1 && !u.aiHinted && u.order.k === 'harvest' && (u.hs === 'seek' || u.hs === 'go' && !u.cargo) && !u.wantPath) {
        u.aiHinted = true;
        const p = this.chooseField(R, H, u);
        if (p && p.wait && harvs.length > 0) {
          const ref = R.nearestRefinery(u);
          u.aiWaitT = f + 25 * 60;
          R.cmdStop(u);
          if (ref && !R.adjacent(u, ref)) { const sp = R.besideSpot(u, ref); R.cmdMove(u, sp.x, sp.y); }
          continue;
        }
        const ht = u.harvTile >= 0 && u.hs === 'go' ? u.harvTile : -1;
        if (p && (ht < 0 || Math.abs(ht % this.W - p.x) + Math.abs(((ht / this.W) | 0) - p.y) > 5)) R.cmdHarvest(u, p.x, p.y);
      }
      const ok = u.order.k === 'harvest' || u.order.k === 'repair';
      // hurt: to the repair pad (the skylifter fetches it if it can)
      if (lv >= 1 && u.hp < u.max * 0.35 && this.count(H, 'repair') && u.order.k !== 'repair' && f - u.hitT > 60 && u.cargo < 350) { R.cmdRepair(u); continue; }
      if (!ok) { R.cmdHarvest(u); continue; }
    }
  }
  freeHarvester(R, H, u) {
    const order = ['wall', 'silo', 'turret', 'barracks', 'hall', 'radar', 'vapor', 'repair', 'starport', 'lab', 'light', 'hightech'];
    let best = null, bi = 99;
    for (let k = 0; k < 8; k++) {
      const x = u.tx + RTS_DX8[k], y = u.ty + RTS_DY8[k];
      if (!R.inMap(x, y)) continue;
      const b = R.bAt[y * this.W + x];
      if (!b || b.h !== this.h) continue;
      const i = order.indexOf(b.key);
      if (i >= 0 && i < bi && !(b.key === 'vapor' && H.powerOut - (b.d.power || 0) < H.powerUse)) { bi = i; best = b; }
    }
    if (best) { this.note('sold ' + best.key + ' to free a boxed-in harvester'); R.sell(this.h, best); this.layoutSig = -1; }
  }
  // how far out on the open sand each tile is (sandwyrms can't leave it), now and then
  rockDistMap(R) {
    const W = this.W, N = R.N, t = R.map.t, D = this.rockD || (this.rockD = new Uint8Array(N)), q = this.floodQ;
    let tail = 0, head = 0;
    for (let i = 0; i < N; i++) { if (RTS_ON_SAND[t[i]]) D[i] = 255; else { D[i] = 0; q[tail++] = i; } }
    while (head < tail) {
      const c = q[head++], cx = c % W, cy = (c / W) | 0, dn = D[c] + 1;
      if (dn > 40) continue;
      for (let k = 0; k < 4; k++) {
        const nx = cx + (k === 0 ? 1 : k === 1 ? -1 : 0), ny = cy + (k === 2 ? 1 : k === 3 ? -1 : 0);
        if (nx < 0 || ny < 0 || nx >= W || ny >= this.Hh) continue;
        const i = ny * W + nx;
        if (D[i] <= dn) continue;
        D[i] = dn; q[tail++] = i;
      }
    }
    this.rockT = R.frame;
  }
  // the glimmer tile a harvester should go for
  chooseField(R, H, u) {
    const W = this.W, Hh = this.Hh, g = R.map.g, t = R.map.t, res = R.harvRes, f = R.frame;
    if (!this.rockD || f - this.rockT > 3 * RTS_AI_MIN) this.rockDistMap(R);
    const ref = R.nearestRefinery(u);
    if (!ref) return null;
    const rx = ref.x + 1, ry = ref.y + 1;
    // trouble on a coarse grid: enemies seen lately, places our harvesters were hit
    const cw = Math.ceil(W / 8), ch = Math.ceil(Hh / 8), dg = new Float32Array(cw * ch);
    const mark = (x, y, v) => { const cx = (x >> 3), cy = (y >> 3); for (let yy = cy - 1; yy <= cy + 1; yy++) for (let xx = cx - 1; xx <= cx + 1; xx++) if (xx >= 0 && yy >= 0 && xx < cw && yy < ch) dg[yy * cw + xx] += (xx === cx && yy === cy ? v : v * 0.5); };
    for (const r of this.mu.values()) if (r.d.wpn && f - r.t < 1800) mark(r.x, r.y, rtsAiStr(r.d, r.hp) / 30);
    for (const r of this.mb.values()) if (r.d.defense) mark(r.x, r.y, 12);
    for (const s of this.hot || []) if (f - s.t < 2400) mark(s.x, s.y, s.worm ? 25 : 18);
    for (const w of this.worms) mark(w.x, w.y, 10);
    const sandW = this.lv >= 2 ? 0.6 : 0.3, R2 = 30;
    let best = null, bs = 1e9;
    for (let y = Math.max(0, ry - R2); y <= Math.min(Hh - 1, ry + R2); y++) for (let x = Math.max(0, rx - R2); x <= Math.min(W - 1, rx + R2); x++) {
      const i = y * W + x;
      if (!g[i] || t[i] === RTS_T.BLOOM) continue;
      if (res[i] && res[i] !== u.id && R.byId.has(res[i])) continue;
      if (R.vAt[i] && R.vAt[i] !== u) continue;
      if (!(this.vis[i] > 0 || this.bvis[i])) continue;
      const dgv = dg[(y >> 3) * cw + (x >> 3)];
      const s = Math.hypot(x - rx, y - ry) + Math.min(20, this.rockD[i]) * sandW + dgv - (g[i] > 100 ? 1.5 : 0);
      if (s < bs) { bs = s; best = { x, y, dg: dgv }; }
    }
    // the best there is lies where a sandwyrm just fed: wait it out by the refinery
    if (best && best.dg >= 20 && this.wormNear(best.x, best.y, f)) return { wait: true };
    return best;
  }
  wormNear(x, y, f) {
    for (const s of this.hot || []) if (s.worm && f - s.k < 70 * 60 && Math.abs(s.x - x) + Math.abs(s.y - y) < 14) return true;
    for (const w of this.worms) if (Math.abs(w.x - x) + Math.abs(w.y - y) < 12) return true;
    return false;
  }
  // ---------------------------------------------------------------- repairs
  repairs(R, H) {
    const h = this.h, f = R.frame, L = this.L;
    const rich = H.credits > L.reserve + 100 + (this.insurance || 0);
    for (const b of H.buildings) {
      if (b.rise < 1) continue;
      if (b.repairing) {
        if (H.credits < 60 && !(b.d.power > 0)) R.repairBuilding(h, b, false);
        continue;
      }
      if (b.hp >= b.max) continue;
      const frac = b.hp / b.max;
      // vapor traps make less power when hurt: those first
      const thr = b.d.power > 0 && H.powerUse > H.powerOut ? 0.95 : L.repairAt;
      if (frac > thr) continue;
      const hit = f - b.hitT < 90;
      if (hit && frac > 0.4 && this.lv < 3) continue;   // still under fire: wait (the higher levels mend under fire)
      if (!rich && !(frac < 0.3 && H.credits > 60)) continue;
      R.repairBuilding(h, b, true);
    }
  }
  // ---------------------------------------------------------------- never stall: no money, no harvesters -> sell
  unstall(R, H) {
    const h = this.h, f = R.frame, refs = this.count(H, 'refinery'), harv = this.harvs.length;
    if (H.stats.harvested > this.lastHarv) { this.lastHarv = H.stats.harvested; this.lastIncome = f; }
    if (this.nomadsOnly || !H.buildings.length) return;
    const yq = H.prod.yard, hq = H.prod.heavy, P = H.port;
    let need = 0, keepRef = false;
    if (!refs && this.yard) {
      keepRef = true;
      need = yq.queue[0] === 'refinery' ? rtsPriceOf(h, 'refinery') - yq.paid : rtsPriceOf(h, 'refinery');
      if (!this.count(H, 'vapor')) need += rtsPriceOf(h, 'vapor');
    } else if (refs && !harv) {
      if (hq.queue[0] === 'harvester') need = rtsPriceOf(h, 'harvester') - hq.paid;
      else if (P && P.order.some(o => o.key === 'harvester')) need = 0;
      else if (this.canMakeHarv(R, H)) need = rtsPriceOf(h, 'harvester');
      else if (this.yard) { keepRef = true; need = yq.queue[0] === 'refinery' ? rtsPriceOf(h, 'refinery') - yq.paid : rtsPriceOf(h, 'refinery'); }
      else if (this.count(H, 'starport') && P && P.stock.harvester > 0) need = P.price.harvester;
    }
    need = Math.max(0, Math.ceil(need));
    if (!need || H.credits >= need) { this.stallT = -1; return; }
    // the queues give their money back first (not the harvester, nor the refinery that brings one)
    for (const k of ['hightech', 'heavy', 'light', 'hall', 'barracks']) {
      const q = H.prod[k].queue;
      while (q.length && q[q.length - 1] !== 'harvester') R.cancelBuild(h, k);
    }
    while (yq.queue.length && !(keepRef && (yq.queue[yq.queue.length - 1] === 'refinery' || yq.queue[yq.queue.length - 1] === 'vapor'))) R.cancelBuild(h, 'yard');
    if (P && P.order.length && !P.frigate) while (P.order.length) R.starportCancel(h);
    if (H.credits >= need) return;
    // then what we can do without, if it's enough to get going again
    const worth = b => Math.floor(rtsPriceOf(h, b.key) / 2 * Math.max(0, b.hp / b.max));
    const order = ['wall', 'palace', 'starport', 'lab', 'turret', 'rturret', 'hightech', 'repair', 'hall', 'silo', 'radar', 'barracks', 'vapor', 'light', 'refinery'];
    const sel = [];
    let pot = H.credits, out = H.powerOut, use = H.powerUse + (keepRef ? 30 : 0);
    for (const k of order) {
      for (const b of H.buildings) {
        if (b.key !== k || b.rise < 1) continue;
        if (k === 'light' && (this.count(H, 'heavy') || !this.yard)) continue;
        if (k === 'silo' && H.storage - 1000 < H.credits) continue;
        if (k === 'refinery' && (refs <= 1 || this.canMakeHarv(R, H))) continue;
        if (k === 'vapor') { const p = (b.d.power || 0) * b.hp / b.max; if (this.count(H, 'vapor') - sel.filter(o => o.key === 'vapor').length <= 1 || out - p < use) continue; out -= p; }
        else if (b.d.power < 0) use += b.d.power;
        sel.push(b); pot += worth(b);
      }
    }
    if (pot < need) {
      // a dead end (no harvester, no money, nothing worth selling): the House's backers send one by frigate, after a
      // long wait and not often (the one help the computer gets: a stalled opponent is no opponent)
      if (refs && !harv && !this.harvOrdered(H)) {
        if (!this.deadT) this.deadT = f;
        if (f - this.deadT > 90 * 60 && f - (this.giftT || -1e9) > 4 * RTS_AI_MIN) {
          const ref = H.buildings.find(b => b.key === 'refinery');
          if (ref && R.launchFrigate) { R.launchFrigate(H, null, ['harvester'], { to: { x: ref.x + 1, y: ref.y + ref.hh } }); this.giftT = f; this.deadT = 0; this.note('dead end: a harvester by frigate'); }
        }
      }
      return;
    }
    this.deadT = 0;
    if (this.stallT < 0) this.stallT = f;
    if (f - this.stallT < 240) return;
    for (const b of sel) { if (H.credits >= need) break; R.sell(h, b); }
    this.stallT = -1;
  }
  // ---------------------------------------------------------------- MCVs: unpack at a good spot
  handleMcv(R, H, u) {
    if (u.mv || u.wantPath || u.lift) return;
    if (u.order.k === 'deploy' && (u.path || this.n % 8)) return;
    // the first yard: where it stands if it can, else nearby; a later one: by the base, or a new field (expansion)
    if ((!this.yard || u.aiExpand) && R.cmdDeploy(u, true)) { this.layoutSig = -1; return; }
    const at = u.aiExpand || (this.yard ? null : H.buildings.length ? this.home : H.start);
    if (!at) { if (this.yard && this.n % 40 === 0) { u.aiExpand = this.expansionSpot(R, H) || null; } return; }
    const s = this.deploySpot(R, u, at);
    if (s) R.cmdDeployAt(u, s.x, s.y);
  }
  deploySpot(R, u, at) {
    const W = this.W, t = R.map.t;
    let best = null, bs = 1e9;
    for (let r = 0; r <= 10; r++) for (let y = at.y - r; y <= at.y + r; y++) for (let x = at.x - r; x <= at.x + r; x++) {
      if (Math.max(Math.abs(x - at.x), Math.abs(y - at.y)) !== r) continue;
      if (!R.footFree('yard', x, y, u, false)) continue;
      let rock = 0;
      for (let yy = y - 3; yy <= y + 4; yy++) for (let xx = x - 3; xx <= x + 4; xx++) if (xx >= 0 && yy >= 0 && xx < W && yy < this.Hh && RTS_BUILDABLE[t[yy * W + xx]] && !R.bAt[yy * W + xx]) rock++;
      const sc = r * 1.5 + (64 - rock) * 0.5;
      if (sc < bs) { bs = sc; best = { x, y }; }
      if (r > 5 && best) return best;
    }
    return best;
  }
  // a rock spot next to a rich field far from the refineries (a second base), or null
  expansionSpot(R, H) { return null; }

  // ================================================================ the base layout
  // the tiles to keep clear (doors, docks, the road out), rebuilt when the base changes
  layout(R, H) {
    let sig = H.buildings.length;
    for (const b of H.buildings) sig = (sig * 31 + b.id) >>> 0;
    if (sig === this.layoutSig) return;
    this.layoutSig = sig;
    const K = this.keep, W = this.W;
    K.fill(0);
    const mark = (x, y) => { if (x >= 0 && y >= 0 && x < W && y < this.Hh) K[y * W + x] = 1; };
    for (const b of H.buildings) {
      const k = b.key;
      if (k === 'refinery' || k === 'repair') { for (let x = b.x - 1; x <= b.x + b.w; x++) { mark(x, b.y + b.hh); mark(x, b.y + b.hh + 1); } mark(b.x - 1, b.y + b.hh - 1); mark(b.x + b.w, b.y + b.hh - 1); }
      else if (b.d.fac && k !== 'yard' && k !== 'hightech') { const dx = b.x + (b.w >> 1); mark(dx, b.y + b.hh); mark(dx, b.y + b.hh + 1); mark(dx - 1, b.y + b.hh); if (b.w > 2) mark(dx + 1, b.y + b.hh); }
    }
    for (const i of this.road) if (Math.hypot(i % W - this.home.x, ((i / W) | 0) - this.home.y) > 3) K[i] = 1;
    if (this.rally) mark(this.rally.x, this.rally.y);
    // which access our buildings have now (a new one must not take it away)
    this.access0 = this.accessCheck(R, H, null);
  }
  // a spot for a building: compact round home, doors and docks clear, every door still reachable from outside
  findSpot(R, H, key) {
    const d = RTS_BUILDINGS[key];
    if (d.defense || d.wall) return this.findDefenseSpot(R, H, key);
    this.layout(R, H);
    const h = this.h, a = this.home, W = this.W, t = R.map.t;
    const ex = this.main ? this.main.x - a.x : 0, ey = this.main ? this.main.y - a.y : 0, eL = Math.hypot(ex, ey) || 1;
    const cands = [];
    const ox = a.x - (d.w >> 1), oy = a.y - (d.h >> 1);
    for (let r = 0; r <= 18; r++) {
      for (let y = oy - r; y <= oy + r; y++) for (let x = ox - r; x <= ox + r; x++) {
        if (Math.max(Math.abs(x - ox), Math.abs(y - oy)) !== r) continue;
        if (!R.canPlace(h, key, x, y)) continue;
        const cx = x + d.w / 2, cy = y + d.h / 2;
        let s = Math.hypot(cx - a.x, cy - a.y);
        let kept = 0;
        for (let yy = y; yy < y + d.h; yy++) for (let xx = x; xx < x + d.w; xx++) { const i = yy * W + xx; if (this.keep[i]) kept++; if (t[i] === RTS_T.CONC) s -= 0.6; }
        s += kept * 12;
        // its own door must open onto ground a vehicle can use
        if (key === 'refinery' || key === 'repair' || (d.fac && key !== 'yard' && key !== 'hightech')) {
          const dx = x + (d.w >> 1), dy = y + d.h;
          if (dy >= this.Hh || !R.passStatic('track', dy * W + dx)) s += 40;
          else if (dy + 1 < this.Hh && !R.passStatic('track', (dy + 1) * W + dx)) s += 10;
        }
        // hemmed in on every side: worse
        let ring = 0, shut = 0;
        for (let yy = y - 1; yy <= y + d.h; yy++) for (let xx = x - 1; xx <= x + d.w; xx++) {
          if (yy >= y && yy < y + d.h && xx >= x && xx < x + d.w) continue;
          ring++;
          if (xx < 0 || yy < 0 || xx >= W || yy >= this.Hh || R.bAt[yy * W + xx] || !RTS_PASS.track[t[yy * W + xx]]) shut++;
        }
        s += Math.max(0, shut - ring * 0.45) * 2.5;
        // the refinery by the glimmer; power, silos and the precious ones at the back, away from the enemy
        const side = ((cx - a.x) * ex + (cy - a.y) * ey) / eL;
        if (key === 'refinery') s += this.glimDist(R, Math.round(cx), Math.round(cy)) * 0.8;
        else if (key === 'vapor' || key === 'silo' || key === 'palace' || key === 'lab' || key === 'radar' || key === 'starport') s += side * 0.5;
        else if (d.fac) s -= side * 0.25;
        s += this.rnd() * 0.4;
        cands.push({ x, y, s });
      }
      if (cands.length >= 50 && r >= 5) break;
    }
    if (!cands.length) return null;
    cands.sort((p, q) => p.s - q.s);
    for (let k = 0; k < Math.min(12, cands.length); k++) if (this.accessOk(R, H, key, cands[k].x, cands[k].y)) return cands[k];
    return null;
  }
  // the nearest glimmer we know of from a tile (tiles; capped)
  glimDist(R, x, y) {
    const W = this.W, g = R.map.g;
    for (let r = 1; r <= 18; r++) {
      for (let k = 0; k < 16; k++) {
        const a = k / 16 * Math.PI * 2, xx = Math.round(x + Math.cos(a) * r), yy = Math.round(y + Math.sin(a) * r);
        if (xx < 0 || yy < 0 || xx >= W || yy >= this.Hh) continue;
        if (g[yy * W + xx] > 0 && this.everSeen(xx, yy)) return r;
      }
    }
    return 20;
  }
  // flood from the edge of the base's window: which of our buildings' doors and docks can be reached (with an
  // extra footprint blocked if given)
  accessCheck(R, H, foot) {
    const W = this.W, Hh = this.Hh, t = R.map.t, pass = RTS_PASS.track, bAt = R.bAt;
    let x0 = this.home.x - 6, x1 = this.home.x + 6, y0 = this.home.y - 6, y1 = this.home.y + 6;
    for (const b of H.buildings) { x0 = Math.min(x0, b.x); y0 = Math.min(y0, b.y); x1 = Math.max(x1, b.x + b.w); y1 = Math.max(y1, b.y + b.hh); }
    if (foot) { x0 = Math.min(x0, foot.x); y0 = Math.min(y0, foot.y); x1 = Math.max(x1, foot.x + foot.w); y1 = Math.max(y1, foot.y + foot.h); }
    x0 = Math.max(0, x0 - 4); y0 = Math.max(0, y0 - 4); x1 = Math.min(W - 1, x1 + 4); y1 = Math.min(Hh - 1, y1 + 4);
    const gen = ++this.floodGen, F = this.flood, q = this.floodQ;
    const inFoot = (x, y) => foot && x >= foot.x && x < foot.x + foot.w && y >= foot.y && y < foot.y + foot.h;
    const open = (x, y) => { const i = y * W + x; return pass[t[i]] > 0 && !bAt[i] && !inFoot(x, y); };
    let tail = 0, head = 0;
    for (let x = x0; x <= x1; x++) for (const y of [y0, y1]) if (open(x, y) && F[y * W + x] !== gen) { F[y * W + x] = gen; q[tail++] = y * W + x; }
    for (let y = y0; y <= y1; y++) for (const x of [x0, x1]) if (open(x, y) && F[y * W + x] !== gen) { F[y * W + x] = gen; q[tail++] = y * W + x; }
    while (head < tail) {
      const c = q[head++], cx = c % W, cy = (c / W) | 0;
      for (let k = 0; k < 4; k++) {
        const nx = cx + (k === 0 ? 1 : k === 1 ? -1 : 0), ny = cy + (k === 2 ? 1 : k === 3 ? -1 : 0);
        if (nx < x0 || ny < y0 || nx > x1 || ny > y1) continue;
        const i = ny * W + nx;
        if (F[i] === gen || !open(nx, ny)) continue;
        F[i] = gen; q[tail++] = i;
      }
    }
    // pockets: open tiles next to a building (or the new footprint) that can't be reached from outside
    let pockets = 0;
    for (let y = y0 + 1; y < y1; y++) for (let x = x0 + 1; x < x1; x++) {
      const i = y * W + x;
      if (F[i] === gen || !open(x, y)) continue;
      let by = false;
      for (let k = 0; k < 8 && !by; k++) { const nx = x + RTS_DX8[k], ny = y + RTS_DY8[k]; if (bAt[ny * W + nx] || inFoot(nx, ny)) by = true; }
      if (by) pockets++;
    }
    // per building: how many tiles round it are reached
    const out = new Map();
    const ringReached = (bx, by, bw, bh) => {
      let n = 0;
      for (let yy = by - 1; yy <= by + bh; yy++) for (let xx = bx - 1; xx <= bx + bw; xx++) {
        if (xx < 0 || yy < 0 || xx >= W || yy >= Hh) continue;
        if (yy >= by && yy < by + bh && xx >= bx && xx < bx + bw) continue;
        if (F[yy * W + xx] === gen) n++;
      }
      return n;
    };
    for (const b of H.buildings) {
      if (b.d.wall || b.d.defense || b.key === 'silo' || b.key === 'vapor') continue;
      out.set(b.id, ringReached(b.x, b.y, b.w, b.hh));
    }
    if (foot) out.set('new', ringReached(foot.x, foot.y, foot.w, foot.h));
    if (this.rally) out.set('rally', F[this.rally.y * W + this.rally.x] === gen ? 1 : 0);
    out.pockets = pockets;
    return out;
  }
  accessOk(R, H, key, x, y) {
    const d = RTS_BUILDINGS[key];
    if (!this.access0) this.access0 = this.accessCheck(R, H, null);
    const now = this.accessCheck(R, H, { x, y, w: d.w, h: d.h });
    if (now.pockets > this.access0.pockets) return false;
    for (const [id, n0] of this.access0) {
      if (!n0) continue;
      const n = now.get(id) || 0;
      const b = R.byId.get(id);
      const need = id === 'rally' ? 1 : b && (b.key === 'refinery' || b.key === 'heavy') ? 2 : 1;
      if (n < Math.min(need, n0)) return false;
    }
    if (!(d.wall || d.defense || key === 'silo' || key === 'vapor') && (now.get('new') || 0) < (key === 'refinery' || key === 'heavy' ? 2 : 1)) return false;
    return true;
  }
  // a spot for a turret (on an approach, the one with the fewest guns) or a wall (beside a turret, outward)
  findDefenseSpot(R, H, key, probe) {
    this.layout(R, H);
    const h = this.h, W = this.W, home = this.home;
    const aps = this.approaches.length ? this.approaches : [this.towards(home, this.main || { x: this.W / 2, y: this.Hh / 2 }, 7, 1)];
    const guns = H.buildings.filter(b => b.d.defense);
    let best = null, bs = 1e9;
    if (key === 'wall') {
      for (const g of guns) {
        let ap = aps[0], ad = 1e9;
        for (const a of aps) { const d = Math.hypot(a.x - g.x, a.y - g.y); if (d < ad) { ad = d; ap = a; } }
        const ox = Math.sign(ap.x - home.x), oy = Math.sign(ap.y - home.y);
        for (let k = 0; k < 8; k++) {
          const x = g.x + RTS_DX8[k], y = g.y + RTS_DY8[k];
          if (!R.inMap(x, y) || this.keep[y * W + x] || this.road.has(y * W + x)) continue;
          if (!R.canPlace(h, 'wall', x, y)) continue;
          const out = RTS_DX8[k] * ox + RTS_DY8[k] * oy;
          if (out < 0) continue;
          const s = -out * 2 + Math.hypot(x - home.x, y - home.y) * -0.1 + this.rnd() * 0.5;
          if (s < bs && (probe || this.accessOk(R, H, 'wall', x, y))) { bs = s; best = { x, y }; }
        }
      }
      return best;
    }
    // the approach that has the fewest guns for its weight
    let ap = aps[0], aw = 1e9;
    for (const a of aps) {
      let n = 0;
      for (const g of guns) if (Math.hypot(g.x - a.x, g.y - a.y) < 6) n++;
      const s = n / (a.w || 1);
      if (s < aw) { aw = s; ap = a; }
    }
    const cands = [];
    for (let y = ap.y - 7; y <= ap.y + 7; y++) for (let x = ap.x - 7; x <= ap.x + 7; x++) {
      if (!R.inMap(x, y)) continue;
      const i = y * W + x;
      if (this.keep[i] || this.road.has(i)) continue;
      if (!R.canPlace(h, key, x, y)) continue;
      let s = Math.hypot(x - ap.x, y - ap.y);
      for (const g of guns) { const d = Math.max(Math.abs(g.x - x), Math.abs(g.y - y)); if (d <= 1) s += 2.5; else if (d <= 2) s += 0.8; }
      // not too deep in the base, nor out alone
      const r = Math.hypot(x - home.x, y - home.y);
      if (r < 4) s += 4;
      s += this.rnd() * 0.5;
      cands.push({ x, y, s });
    }
    cands.sort((p, q) => p.s - q.s);
    for (let k = 0; k < Math.min(8, cands.length); k++) if (this.accessOk(R, H, key, cands[k].x, cands[k].y)) return cands[k];
    // no room by the approach: anywhere round the edge of the base toward it
    return null;
  }
  debug(R) {
    const H = R.houses[this.h];
    const roles = {};
    for (const r of this.role.values()) roles[r] = (roles[r] || 0) + 1;
    return this.h + ' L' + this.lv + ' $' + Math.round(H.credits) + ' mem b' + this.mb.size + ' u' + this.mu.size + ' main ' + (this.main ? (this.main.guess ? '?' : '') + this.main.x + ',' + this.main.y : '-') +
      ' waves ' + this.waveN + '/' + this.waves.length + ' next ' + Math.round((this.nextWave - R.frame) / 60) + 's roles ' + JSON.stringify(roles) + ' cost ' + (this.costN ? (this.cost / this.costN).toFixed(3) : 0) + 'ms';
  }
}
