'use strict';
// =====================================================================
//  DESERT DOMINION: the computer commander's army (the other half of RtsAiCommander, js/rtsai.js).
//    - production: a mix by House and tech level that answers what the enemy has been seen to field (missile
//      tanks and troopers against aircraft and tanks, light vehicles against infantry, tanks against light
//      vehicles), factory upgrades, skylifters, starport bargains; never past the money the economy needs.
//    - roles: new units gather at the rally point ('pool'); a few stay home ('def'); waves ('wave'), a raiding
//      party ('harass'), a scout, units going to be mended ('fix'), a bloom-burster, units turned by a converter.
//    - defence: enemies seen by the base are met by everything at home, a wave out is called back when the base is
//      outgunned; a harvester under fire gets help and runs home.
//    - attack waves: sized and timed by level, a target chosen from memory (value against the defences seen round
//      it: harvesters, refineries, power, the weak side), a staging point short of it, then in; the wave moves on
//      to the next building it knows of, and falls back when beaten. Hard levels split into two prongs and raid.
//    - specials: juggernauts blow themselves up in a crowd, converters gas the best vehicles in reach (the turned
//      ones are thrown at their old friends), the palace's doomfist goes where the enemy buildings are densest, the
//      saboteur for the key building, the nomads for the enemy harvesters.
// =====================================================================

// unit choice weights (before the counters)
const RTS_AI_MIX = {
  soldier: 0.6, trooper: 2, praetorian: 6, trike: 1, raider: 1.2, quad: 1.6, tank: 5, missile: 4, siege: 4, sonic: 4, juggernaut: 3, converter: 2, gunwing: 0.3,
};
// House flavour
const RTS_AI_FLAVOUR = {
  aquila: { sonic: 1.3, quad: 1.2, missile: 1.1 },
  drakon: { trooper: 1.3, juggernaut: 1.3, siege: 1.1 },
  serpens: { converter: 1.2, siege: 1.3, tank: 1.1 },
  regent: { praetorian: 2, siege: 1.3, gunwing: 1.2 },
};
// what each class of our army should be, as a share (with and without the heavy factory)
const RTS_AI_SHARE_HEAVY = { inf: 0.16, light: 0.14, heavy: 0.62, air: 0.08 };
const RTS_AI_SHARE_LIGHT = { inf: 0.5, light: 0.5, heavy: 0, air: 0 };
function rtsAiClass(d) { return d.cls === 'air' ? 'air' : d.cls === 'inf' ? 'inf' : d.armor === 'light' ? 'light' : 'heavy'; }
// army points: what a unit counts for in a wave
function rtsAiPts(d) {
  if (d.cls === 'inf') return d.key === 'praetorian' ? 1 : 0.5;
  if (d.cls === 'air') return 1.5;
  if (d.armor === 'light') return 1;
  return (d.cost || 300) >= 600 ? 2 : 1.5;
}

Object.assign(RtsAiCommander.prototype, {
  army(R, H) {
    const f = R.frame, L = this.L;
    this.roles(R, H);
    if (this.n % 2 === 0) this.produce(R, H);
    this.defend(R, H);
    this.guardHarvesters(R, H);
    this.mending(R, H);
    this.scouting(R, H);
    this.waveCtl(R, H);
    const passive = this.opts.passive;
    if ((L.harass || this.nomadsOnly) && !passive) this.harassCtl(R, H);
    if (!passive) this.airCtl(R, H);
    this.specials(R, H);
    if (this.n % 4 === 0 && !passive) { this.palaceCtl(R, H); this.saboteurs(R, H); }
    if (this.n % 16 === 8) this.blooms(R, H);
    this.poolCtl(R, H);
  },
  // ---------------------------------------------------------------- roles
  roles(R, H) {
    const f = R.frame;
    if (this.n % 20 === 0) for (const id of this.role.keys()) if (!R.byId.has(id)) this.role.delete(id);
    for (const u of this.armyU) {
      if (this.role.has(u.id)) continue;
      // turned by our converter, a campaign raid sent to hunt, or a new one for the pool
      if (u.conv && u.conv.orig !== this.h) this.role.set(u.id, 'conv');
      else if (u.order.k === 'hunt') this.role.set(u.id, 'raid');
      else this.role.set(u.id, this.nomadsOnly ? 'def' : 'pool');
    }
    for (const u of this.air) if (!this.role.has(u.id)) this.role.set(u.id, 'air');
    // a turned unit that came back to us: the pool again
    for (const u of this.armyU) if (this.role.get(u.id) === 'conv' && !u.conv) this.role.set(u.id, 'pool');
  },
  is(u, r) { return this.role.get(u.id) === r; },
  // a short diary (tests and debugging)
  note(s) { const ev = this.ev || (this.ev = []); ev.push((this.f / 3600).toFixed(1) + ' ' + s); if (ev.length > 80) ev.shift(); },
  pts(u) { return rtsAiPts(u.d); },
  str(u) { return rtsAiStr(u.d, u.hp / u.max); },
  // what the enemy has round a spot (remembered guns, units seen lately)
  threatAt(x, y, r, recent) {
    let s = 0;
    const f = this.f, r2 = r * r;
    for (const m of this.mb.values()) {
      if (!m.d.defense) continue;
      const dx = m.x - x, dy = m.y - y;
      if (dx * dx + dy * dy <= r2) s += RTS_AI_DEF_STR[m.key] * (0.4 + 0.6 * m.hp);
    }
    for (const m of this.mu.values()) {
      if (f - m.t > (recent || 1800)) continue;
      const dx = m.x - x, dy = m.y - y;
      if (dx * dx + dy * dy <= r2) s += rtsAiStr(m.d, m.hp);
    }
    return s;
  },
  nearBase(R, H, x, y, m) {
    for (const b of H.buildings) {
      if (b.d.wall) continue;
      const dx = Math.max(b.x - x, 0, x - (b.x + b.w - 1)), dy = Math.max(b.y - y, 0, y - (b.y + b.hh - 1));
      if (dx * dx + dy * dy <= m * m) return true;
    }
    if (!H.buildings.length) return Math.hypot(x - this.home.x, y - this.home.y) <= m + 2;
    return false;
  },
  busyOn(R, u) { return u.order.k === 'attack' && R.validTarget(u, u.order.t, true); },

  // ---------------------------------------------------------------- production
  produce(R, H) {
    const h = this.h, L = this.L, f = R.frame;
    if (this.opts.noArmy) return;
    let pts = 0;
    for (const u of this.armyU) pts += this.pts(u);
    for (const u of this.air) pts += this.pts(u);
    for (const k of ['barracks', 'hall', 'light', 'heavy', 'hightech']) for (const q of H.prod[k].queue) if (q !== '_upg' && q !== 'harvester' && RTS_UNITS[q]) pts += rtsAiPts(RTS_UNITS[q]);
    this.upgrades(R, H);
    this.buildLifters(R, H);
    if (this.n % 8 === 0) this.shopping(R, H);
    if (pts >= L.cap * Math.min(2, 1 + f / (25 * RTS_AI_MIN)) * (this.campaign ? (this.mates >= 2 ? 0.55 : 0.7) : 1)) return;
    const threatened = f - this.lastThreat < 900;
    const reserve = (this.econNeed ? L.reserve + 350 : L.reserve) + (H.prod.yard.queue.length && !H.prod.yard.ready ? 120 : 0) + (this.insurance || 0);
    // the classes we're short of first
    const share = R.factoryOf(H, 'heavy') ? RTS_AI_SHARE_HEAVY : RTS_AI_SHARE_LIGHT;
    const have = { inf: 0, light: 0, heavy: 0, air: 0 };
    let tot = 0.01;
    for (const u of this.armyU) { have[rtsAiClass(u.d)] += this.pts(u); tot += this.pts(u); }
    for (const u of this.air) { have.air += this.pts(u); tot += this.pts(u); }
    const kinds = ['heavy', 'light', 'hall', 'barracks', 'hightech'].filter(k => R.factoryOf(H, k));
    const clsOf = { heavy: 'heavy', light: 'light', hall: 'inf', barracks: 'inf', hightech: 'air' };
    const need = k => (share[clsOf[k]] || 0.05) - have[clsOf[k]] / tot + (k === 'hall' ? 0.03 : 0) + this.rnd() * 0.08;
    kinds.sort((a, b) => need(b) - need(a));
    let busy = 0;
    for (const k of ['barracks', 'hall', 'light', 'heavy', 'hightech']) { const q = H.prod[k].queue; if (q.length && q[0] !== 'harvester' && q[0] !== '_upg') busy++; }
    for (const kind of kinds) {
      if (busy >= L.parallel) break;
      const q = H.prod[kind].queue;
      if (q.length || this.hold === kind) continue;
      const key = this.pickUnit(R, H, kind);
      if (!key) continue;
      const price = rtsPriceOf(h, key);
      // the class we need most waits for its money (cheap ones don't jump the queue), unless under attack
      if (H.credits < price * 0.25 + (this.insurance || 0) && !threatened) break;
      if (!this.affords(R, H, key, kind, reserve) && !(threatened && H.credits > price * 0.5)) break;
      if (R.startBuild(h, kind, key)) busy++;
    }
  },
  pickUnit(R, H, kind) {
    const h = this.h, mix = this.mix, list = R.buildList(h, kind);
    const tot = mix.inf + mix.light + mix.heavy + mix.air + 1;
    const air = mix.air / tot, inf = mix.inf / tot, light = mix.light / tot, heavy = mix.heavy / tot;
    const fl = RTS_AI_FLAVOUR[h] || {};
    let specials = 0, missiles = 0, all = 0.01;
    for (const u of this.armyU) { all++; if (u.d.needs) specials++; if (u.key === 'missile') missiles++; }
    const opts = [];
    for (const k of list) {
      let w = RTS_AI_MIX[k];
      if (!w) continue;
      w *= fl[k] || 1;
      if (k === 'missile') { w *= 1 + air * 4 + heavy; if (missiles / all > 0.3 && air < 0.15) w *= 0.3; }
      if (k === 'trooper' || k === 'praetorian') w *= 1 + heavy * 1.5 + air * 1.5;
      if (k === 'soldier') { w *= 1 - inf * 0.5 + light * 0.3; if (this.lv >= 3 && R.factoryOf(H, 'light')) w *= 0.3; }
      if (k === 'quad' || k === 'trike' || k === 'raider') w *= 1 + inf * 1.6 - heavy * 0.5;
      if (k === 'siege') w *= 1 + inf * 0.8 + (this.mb.size > 12 ? 0.4 : 0);
      if (k === 'tank') w *= 1 + light * 1.2;
      if (k === 'sonic' || k === 'juggernaut' || k === 'converter') { w *= 1 + heavy * 0.8; if (specials / all > 0.3) w *= 0.3; }
      if (k === 'gunwing') {
        // aircraft only while the enemy has little to shoot them down with
        let aa = 0;
        for (const r of this.mb.values()) if (r.key === 'rturret') aa += 2;
        for (const r of this.census.values()) if (r.o.d.wpn && RTS_WEAPONS[r.o.d.wpn].air) aa++;
        w *= Math.max(0, 1 - aa / 8) * (this.air.length >= 4 ? 0.3 : 1);
      }
      // the raiding party wants fast ones
      if (this.L.harass && (k === 'raider' || k === 'trike') && this.count2('harass') < this.L.harass) w *= 2;
      if (w > 0) opts.push([k, w]);
    }
    if (!opts.length) return null;
    let s = 0;
    for (const [, w] of opts) s += w;
    let r = this.rnd() * s;
    for (const [k, w] of opts) { r -= w; if (r <= 0) return k; }
    return opts[0][0];
  },
  count2(role) { let n = 0; for (const r of this.role.values()) if (r === role) n++; return n; },
  // factory upgrades, when they open something we want and there's money to spare
  upgrades(R, H) {
    const h = this.h, L = this.L;
    if (this.n % 4 !== 2) return;
    this.hold = null;
    if (this.econNeed) return;
    // the heavy factory first (missile tanks, then siege tanks and the House special), then light, then air
    for (const kind of ['heavy', 'light', 'hightech']) {
      const b = R.factoryOf(H, kind);
      if (!b) continue;
      const up = R.nextUpgrade(b);
      if (!up || R.upgLevel(H, kind) >= L.upg || H.prod[kind].queue.includes('_upg')) continue;
      // what it would open
      const lv = R.upgLevel(H, kind) + 1;
      let opens = false;
      for (const k in RTS_UNITS) {
        const d = RTS_UNITS[k];
        if (d.fac !== kind || !RTS_AI_MIX[k]) continue;
        // something a later level opens (this one, or the next on the way)
        if (rtsAllowed(h, k, H.techLevel, lv - 1) || !rtsAllowed(h, k, H.techLevel, Math.min(L.upg, lv + 1))) continue;
        if (d.needs && !d.needs.every(n => (H.count[n] | 0) > 0 || n === 'lab' && this.lv >= 1)) continue;
        opens = true;
      }
      if (!opens) continue;
      if (kind === 'hightech' && R.frame < 12 * RTS_AI_MIN) continue;
      // the money for it as it goes, and the factory free: hold its production till then
      const pf = R.powerFactor(H) * (H.aiBoost || 1);
      const ok = this.drain(R, H) + up.cost / RTS_UPGRADE_TIME * pf <= this.income * 1.15 + Math.max(0, H.credits - L.reserve) / 1500 + 0.02 || H.credits > up.cost + L.reserve;
      // (the factory is held for it only once there's an army of its kind, and not while under attack)
      let mine = 0;
      for (const u of this.armyU) if (u.d.fac === kind) mine++;
      const mayHold = (mine >= 3 || R.frame > 9 * RTS_AI_MIN) && R.frame - this.lastThreat > 900;
      if (!ok) { if (H.credits > up.cost * 0.5 && mayHold) this.hold = kind; return; }
      if (H.prod[kind].queue.length) { if (mayHold) this.hold = kind; return; }
      if (R.upgrade(h, b)) { this.note('upgrade ' + kind + ' to ' + lv); return; }
    }
  },
  buildLifters(R, H) {
    const L = this.L;
    const want = L.lifters + (this.wormKills >= 2 ? 1 : 0);
    if (!want || this.lifters.length >= want || this.econNeed && !this.wormKills) return;
    if (!R.factoryOf(H, 'hightech') || H.prod.hightech.queue.length || !this.count(H, 'refinery')) return;
    if (H.credits < (this.wormKills >= 2 ? 850 : 1300) || !R.buildList(this.h, 'hightech').includes('skylifter')) return;
    R.startBuild(this.h, 'hightech', 'skylifter');
  },
  // the starport: bargains only
  shopping(R, H) {
    const h = this.h, P = H.port, L = this.L;
    if (!L.port || !this.count(H, 'starport') || !P || P.frigate || P.order.length >= 4) return;
    if (H.credits < L.reserve + 500 || this.econNeed) return;
    let best = null, br = this.lv >= 3 ? 0.95 : 0.85;
    for (const k of ['siege', 'tank', 'missile', 'quad', 'raider', 'trike', 'gunwing']) {
      if (!R.portAllowed(H, k) || !(P.stock[k] > 0)) continue;
      const r = P.price[k] / RTS_UNITS[k].cost;
      if (r < br && P.price[k] < H.credits - L.reserve) { br = r; best = k; }
    }
    if (best) R.starportBuy(h, best);
  },

  // ---------------------------------------------------------------- defence of the base (and of friends)
  defend(R, H) {
    const f = R.frame, L = this.L, h = this.h;
    const thr = [];
    let str = 0;
    for (const r of this.mu.values()) {
      if (f - r.t > 40 || (!r.d.wpn && !r.d.saboteur)) continue;
      if (!this.nearBase(R, H, r.x, r.y, 7)) continue;
      thr.push(r); str += rtsAiStr(r.d, r.hp) + (r.d.saboteur ? 300 : 0);
    }
    if (!thr.length) {
      this.threatStr = 0; this.threatSince = 0;
      // a building under fire from something out of our sight: everyone at home goes to look
      if (f - H.lastHit < 60 && this.n % 2 === 0) {
        let hit = null;
        for (const b of H.buildings) if (f - b.hitT < 60 && (!hit || b.hitT > hit.hitT)) hit = b;
        if (hit && f - (this.lookT || -1e9) > 240) {
          this.lookT = f; this.lastThreat = f; this.attackedT = f;
          const go = this.armyU.filter(u => (this.is(u, 'pool') || this.is(u, 'def')) && !this.busyOn(R, u));
          if (go.length) R.cmdMoveGroup(go, hit.x + (hit.w >> 1), hit.y + hit.hh, 'amove');
        }
      }
      return;
    }
    if (!this.threatSince) this.threatSince = f;
    this.lastThreat = f; this.threatStr = str;
    if (f - H.lastHit < 120) this.attackedT = f;
    // the gentle levels take a moment to notice
    if (L.react && f - this.threatSince < L.react * 60) return;
    let home = 0;
    const defenders = [];
    for (const u of this.armyU) {
      const r = this.role.get(u.id);
      if (r === 'pool' || r === 'def' || r === 'bloom' || r === 'scout' && this.nearBase(R, H, u.tx, u.ty, 10) || r === 'harass' && this.nearBase(R, H, u.tx, u.ty, 12)) {
        defenders.push(u); home += this.str(u);
        if (r === 'bloom' || r === 'harass' || r === 'scout') this.role.set(u.id, 'pool');
      }
    }
    for (const u of this.air) if (this.is(u, 'air')) defenders.push(u);
    let guns = 0;
    for (const b of H.buildings) if (b.d.defense) guns += RTS_AI_DEF_STR[b.key] * b.hp / b.max;
    // every defender on the nearest threat it can hit
    for (const u of defenders) {
      if (this.busyOn(R, u) && u.order.t.isU && this.nearBase(R, H, u.order.t.tx, u.order.t.ty, 10)) continue;
      const w = RTS_WEAPONS[u.d.wpn];
      let best = null, bd = 1e9;
      for (const r of thr) {
        if (r.d.cls === 'air' && !(w && w.air)) continue;
        if (!R.validTarget(u, r.o)) continue;
        const d = (r.x - u.tx) ** 2 + (r.y - u.ty) ** 2 - (r.d.saboteur ? 60 : 0);
        if (d < bd) { bd = d; best = r; }
      }
      if (best) R.cmdAttack(u, best.o);
    }
    // outgunned: the waves out come home
    if (L.recall && str > home * 0.9 + guns * 0.5 + 150) {
      for (const w of this.waves) {
        if (w.phase === 'home' || w.kind === 'help') continue;
        const c = this.centroid(w);
        const far = Math.hypot(c.x - this.home.x, c.y - this.home.y);
        if (w.phase === 'go' || far < 30 || str > home * 1.6 + guns) this.waveHome(R, w, true);
      }
    }
    // our friends hear of it
    const T = rtsAiTeam(R, H.team);
    T.help = { x: thr[0].x, y: thr[0].y, h, str }; T.helpT = f;
  },
  // a harvester under fire: help, and it runs home
  guardHarvesters(R, H) {
    const f = R.frame, lv = this.lv;
    for (const hv of this.harvs) {
      if (f - hv.hitT > 45 || !hv.hitBy || hv.hitBy.dead || !R.isEnemy(this.h, hv.hitBy.h)) continue;
      const by = hv.hitBy;
      if (by.isU && f - (hv.aiHelpT || -1e9) > 120) {
        hv.aiHelpT = f;
        const k = [1, 2, 3, 3, 4][lv];
        const cand = this.armyU.filter(u => (this.is(u, 'pool') || this.is(u, 'def') || this.is(u, 'harass')) && !this.busyOn(R, u) && R.validTarget(u, by) &&
          (by.d.cls !== 'air' || (RTS_WEAPONS[u.d.wpn] || {}).air));
        cand.sort((a, b) => ((a.tx - by.tx) ** 2 + (a.ty - by.ty) ** 2) - ((b.tx - by.tx) ** 2 + (b.ty - by.ty) ** 2));
        for (const u of cand.slice(0, k)) if (Math.hypot(u.tx - by.tx, u.ty - by.ty) < 30) R.cmdAttack(u, by);
        for (const u of this.air) if (this.is(u, 'air') && by.d.cls !== 'air') R.cmdAttack(u, by);
      }
      if (f - (this.hotT || -1e9) > 120) { (this.hot || (this.hot = [])).push({ x: hv.tx, y: hv.ty, t: f }); if (this.hot.length > 8) this.hot.shift(); this.hotT = f; }
      if (lv >= 1 && hv.order.k === 'harvest' && hv.hs !== 'back' && !hv.docked && !hv.lift && (hv.hp < hv.max * 0.65 || by.isB || by.d.armor === 'heavy')) R.cmdReturn(hv);
    }
  },
  // hurt vehicles to the repair pad (the levels that retreat), mended ones back to the pool
  mending(R, H) {
    const L = this.L, f = R.frame;
    const pad = this.count(H, 'repair') > 0;
    for (const u of this.armyU) {
      const r = this.role.get(u.id);
      if (r === 'fix') {
        if (u.hp >= u.max * 0.95 || u.order.k !== 'repair' && !u.lift) { this.role.set(u.id, 'pool'); if (u.order.k === 'repair') R.cmdStop(u); }
        continue;
      }
      if (!L.retreat || !pad || u.d.cls !== 'veh' || r === 'conv' || r === 'raid') continue;
      if (u.hp < u.max * 0.33 && (r !== 'wave' || this.lv >= 2)) {
        if (R.cmdRepair(u)) this.role.set(u.id, 'fix');
      }
    }
  },
  // ---------------------------------------------------------------- scouting: find the enemy
  scouting(R, H) {
    const f = R.frame, L = this.L;
    let scout = null;
    for (const u of this.armyU) if (this.is(u, 'scout')) { scout = u; break; }
    const known = this.main && !this.main.guess;
    if (scout) {
      if (known && f - (scout.aiScoutT || 0) > 600) { this.role.set(scout.id, 'pool'); if (this.rally) R.cmdMove(scout, this.rally.x, this.rally.y); return; }
      if (scout.order.k === 'move' && scout.path) return;
      const c = this.nextCand(scout);
      if (!c) { this.role.set(scout.id, 'pool'); return; }
      R.cmdMove(scout, c.x, c.y);
      return;
    }
    if (!L.scout || known || f < this.nextScout || this.nomadsOnly) return;
    // the fastest unit in the pool (a light vehicle, else a soldier)
    let best = null, bs = -1;
    for (const u of this.armyU) {
      if (!this.is(u, 'pool') && !this.is(u, 'def')) continue;
      const s = u.d.speed * (u.d.cls === 'veh' ? 1 : 0.7) - (u.d.cost || 100) / 2000;
      if (s > bs) { bs = s; best = u; }
    }
    if (!best) return;
    const c = this.nextCand(best);
    if (!c) { this.nextScout = f + 3 * RTS_AI_MIN; return; }
    this.role.set(best.id, 'scout'); best.aiScoutT = f;
    R.cmdMove(best, c.x, c.y);
    this.nextScout = f + 2 * RTS_AI_MIN;
  },
  nextCand(u) {
    let best = null, bd = 1e9;
    for (const c of this.cands) { if (c.seen) continue; const d = Math.hypot(c.x - u.tx, c.y - u.ty); if (d < bd) { bd = d; best = c; } }
    if (best) return best;
    // every start looked at: the least explored part of the map
    return this.unexplored(u.tx, u.ty);
  },
  unexplored(x, y) {
    const W = this.W, Hh = this.Hh;
    let best = null, bs = 1e9;
    for (let cy = 4; cy < Hh; cy += 8) for (let cx = 4; cx < W; cx += 8) {
      if (this.everSeen(cx, cy)) continue;
      const s = Math.hypot(cx - x, cy - y) + this.rnd() * 6;
      if (s < bs) { bs = s; best = { x: cx, y: cy }; }
    }
    return best;
  },
  // ---------------------------------------------------------------- attack waves
  centroid(w) {
    let sx = 0, sy = 0, n = 0;
    for (const u of w.units) { sx += u.tx; sy += u.ty; n++; }
    return n ? { x: sx / n, y: sy / n } : { x: this.home.x, y: this.home.y };
  },
  waveCtl(R, H) {
    const f = R.frame, L = this.L;
    for (const w of this.waves.slice()) this.waveTick(R, H, w);
    this.waves = this.waves.filter(w => w.units.size);
    // a friend's base under attack: half the pool goes to help (if ours is quiet)
    const T = rtsAiTeam(R, H.team);
    if (this.lv >= 1 && T.help && T.help.h !== this.h && f - T.helpT < 60 && f - this.lastThreat > 600 && !this.waves.some(w => w.kind === 'help')) {
      const pool = this.armyU.filter(u => this.is(u, 'pool') && u.hp > u.max * 0.5);
      if (pool.length >= 4 && Math.hypot(T.help.x - this.home.x, T.help.y - this.home.y) < 50) {
        const go = pool.slice(0, Math.ceil(pool.length / 2));
        this.launch(R, H, go, { x: T.help.x, y: T.help.y, help: true }, 'help');
      }
    }
    if (this.opts.passive || this.nomadsOnly) return;
    // the sharp levels strike back right after beating off an attack (their army is spent)
    let lost = 0;
    for (const e of this.foeLost || []) lost += e.v;
    const counter = this.lv >= 3 && !this.campaign && lost >= 900 && f - this.lastThreat > 120 && f - this.lastThreat < 1200 && f > this.counterT + 2 * RTS_AI_MIN;
    if (f < this.nextWave && !counter) return;
    if (f - this.lastThreat < 300 && !counter) return;
    const pool = this.armyU.filter(u => this.is(u, 'pool') && u.hp > u.max * 0.55);
    for (const u of this.air) if (this.is(u, 'air')) pool.push(u);
    let pts = 0;
    for (const u of pool) pts += this.pts(u);
    const size = Math.min(L.waveMax, L.wave0 + this.waveN * L.waveGrow) * (this.soft || 1);
    // friends attacking the same player take turns
    const TT = rtsAiTeam(R, H.team);
    if (this.mates >= 2 && TT.waveBy && TT.waveBy !== this.h && f - TT.waveT < 1.5 * RTS_AI_MIN && !counter) return;
    const late = f > this.nextWave + 3 * RTS_AI_MIN;
    if (pts < size && !(late && pts >= size * 0.6) && !(counter && pts >= size * 0.5)) return;
    let myStr = 0;
    for (const u of pool) myStr += this.str(u);
    const tgt = this.pickTarget(R, H, myStr, null);
    if (!tgt) { this.nextWave = f + RTS_AI_MIN; return; }
    // strong enough? (the enemy army as last counted, the guns round the target); not past the cap, not too long
    if (counter) { this.counterT = f; this.note('counter-attack (they lost ' + lost + ')'); }
    else if (L.smart >= 1 && pts < L.waveMax && f < this.nextWave + 4 * RTS_AI_MIN) {
      let foe = 0;
      for (const c of this.census.values()) if (!tgt.h || c.h === tgt.h) foe += c.str;
      const guns = L.smart >= 2 ? this.threatAt(tgt.x, tgt.y, 8, 1) : 0;
      // what we haven't seen we guess at: an army that grows with the game
      const prior = L.smart >= 3 ? 420 * Math.max(0, f / RTS_AI_MIN - 1) : 0;
      if (myStr < (Math.max(foe * 0.8, prior) + guns) * [0, 0.8, 1, 1.25, 1.35][this.lv]) return;
    }
    // a few stay home: the slowest first
    pool.sort((a, b) => a.d.speed - b.d.speed);
    const keep = Math.max(0, L.keep - this.count2('def'));
    for (let k = 0; k < keep && pool.length > 2; k++) { const u = pool.shift(); if (u.d.cls !== 'air') this.role.set(u.id, 'def'); else pool.push(u); }
    // no bigger than the level's largest wave (the rest wait at home for the next)
    {
      let take = 0;
      const cap = L.waveMax * (this.soft || 1) * 1.15;
      pool.sort((a, b) => b.d.speed - a.d.speed);
      const go = [];
      for (const u of pool) { if (take >= cap) break; go.push(u); take += this.pts(u); }
      pool.length = 0; pool.push(...go);
    }
    // two prongs: a second group for the weak side (economy, power)
    if (pool.length >= 8 && tgt.rec && this.rnd() < L.prong) {
      const t2 = this.pickTarget(R, H, myStr * 0.4, tgt);
      if (t2 && Math.hypot(t2.x - tgt.x, t2.y - tgt.y) > 5) {
        const fast = pool.slice().sort((a, b) => b.d.speed - a.d.speed);
        const n2 = Math.round(pool.length * 0.4);
        const flank = fast.slice(0, n2), main = pool.filter(u => !flank.includes(u));
        this.launch(R, H, main, tgt, 'main', 0);
        this.launch(R, H, flank, t2, 'flank', this.rnd() < 0.5 ? 0.9 : -0.9);
        this.afterWave(R, H, tgt);
        return;
      }
    }
    this.launch(R, H, pool, tgt, 'main', 0);
    this.afterWave(R, H, tgt);
  },
  afterWave(R, H, tgt) {
    const f = R.frame, L = this.L;
    this.waveN++;
    this.nextWave = f + L.waveGap * RTS_AI_MIN * (0.85 + this.rnd() * 0.3) * (this.campaign ? 1.3 : 1);
    const T = rtsAiTeam(R, H.team);
    if (tgt.h) { T.target = { h: tgt.h, x: tgt.x, y: tgt.y }; T.t = f; T.by = this.h; }
    T.waveT = f; T.waveBy = this.h;
  },
  launch(R, H, units, tgt, kind, swing) {
    const f = R.frame;
    const from = this.rally || this.home;
    // stage short of the target (out of its guns' reach), from our side (or swung round for a flank)
    let ang = Math.atan2(from.y - tgt.y, from.x - tgt.x) + (swing || 0);
    const sd = tgt.help ? 0 : tgt.guess ? 6 : 10;
    let st = { x: Math.round(tgt.x + Math.cos(ang) * sd), y: Math.round(tgt.y + Math.sin(ang) * sd) };
    st.x = Math.max(1, Math.min(this.W - 2, st.x)); st.y = Math.max(1, Math.min(this.Hh - 2, st.y));
    st = this.nearestWith(st.x, st.y, 6, i => R.passStatic('track', i)) || st;
    const ground = units.filter(u => u.d.cls !== 'air');
    if (ground.length) R.cmdMoveGroup(ground, st.x, st.y, 'amove');
    for (const u of units) { this.role.set(u.id, 'wave'); if (u.d.cls === 'air') R.cmdAttackMove(u, st.x, st.y); }
    let str = 0;
    for (const u of units) str += this.str(u);
    const w = { units: new Set(units), tgt, stage: st, phase: tgt.help ? 'attack' : 'go', t: f, t0: f, str0: str, kind, d0: Math.hypot(st.x - from.x, st.y - from.y) };
    this.note('wave ' + kind + ' n' + units.length + ' str ' + Math.round(str) + ' -> ' + (tgt.rec ? tgt.rec.key : tgt.guess ? 'guess' : 'help') + ' ' + tgt.x + ',' + tgt.y);
    this.waves.push(w);
    if (tgt.help) this.waveAttack(R, w);
    return w;
  },
  waveHome(R, w, fight) {
    let str = 0;
    for (const u of w.units) str += this.str(u);
    this.note('wave ' + w.kind + ' home (' + (fight ? 'recall' : 'beaten') + ') n' + w.units.size + ' str ' + Math.round(str) + '/' + Math.round(w.str0));
    w.phase = 'home'; w.t = R.frame;
    const p = this.rally || this.home;
    const ground = [...w.units].filter(u => u.d.cls !== 'air');
    if (ground.length) R.cmdMoveGroup(ground, p.x, p.y, fight ? 'amove' : 'move');
    for (const u of w.units) if (u.d.cls === 'air') R.cmdMove(u, p.x, p.y);
  },
  waveTick(R, H, w) {
    const f = R.frame, L = this.L;
    for (const u of w.units) if (u.dead || u.h !== this.h || this.role.get(u.id) !== 'wave') w.units.delete(u);
    if (!w.units.size) return;
    let str = 0;
    for (const u of w.units) str += this.str(u);
    // beaten: fall back (the gentle level fights on)
    if (L.retreat && w.phase !== 'home' && str < w.str0 * L.retreat && w.kind !== 'help') { this.waveHome(R, w, false); return; }
    // the sharp levels pull back sooner when what they see outguns what is left
    if (this.lv >= 3 && w.phase === 'attack' && str < w.str0 * 0.55 && this.n % 4 === 0) {
      const c = this.centroid(w);
      if (this.threatAt(c.x, c.y, 9, 120) > str * 1.3) { this.waveHome(R, w, false); return; }
    }
    const idle = u => (u.order.k === 'idle' || u.order.k === 'guard') && !u.path && !u.wantPath;
    if (w.phase === 'go') {
      let near = 0;
      for (const u of w.units) if (Math.abs(u.tx - w.stage.x) + Math.abs(u.ty - w.stage.y) <= 6) near++;
      const tmax = 1800 + w.d0 * 16 / 0.35;
      if (near >= w.units.size * (this.lv >= 3 ? 0.85 : 0.7) || f - w.t > tmax) { w.phase = 'attack'; w.t = f; this.waveAttack(R, w); return; }
      if (this.n % 4 === 0) for (const u of w.units) if (idle(u) && Math.abs(u.tx - w.stage.x) + Math.abs(u.ty - w.stage.y) > 6) R.cmdAttackMove(u, w.stage.x, w.stage.y);
      return;
    }
    if (w.phase === 'attack') {
      // the target gone (destroyed, or looked at and not there): the next one near
      const t = w.tgt;
      let gone = false;
      if (t.rec) gone = !this.mb.has(t.rec.id) && !this.mu.has(t.rec.id);
      else if (t.help) { const c = this.centroid(w); gone = Math.hypot(c.x - t.x, c.y - t.y) < 8 && f - w.t > 240 || f - w.t0 > 2 * RTS_AI_MIN; }
      else if (t.guess) gone = this.seen(t.x, t.y) && f - w.t > 240;
      if (gone || f - w.t > 3 * RTS_AI_MIN) {
        const c = this.centroid(w);
        const nt = t.help ? this.nearestFoe(R, { x: t.x, y: t.y }, 12, true) : this.nearestFoe(R, c, 30, false) || this.pickTarget(R, H, str, null);
        if (!nt || t.help && f - w.t0 > 90 * 60) { this.waveHome(R, w, true); return; }
        w.tgt = nt; w.t = f;
        this.waveAttack(R, w);
        return;
      }
      // the guns first, all together (no enemy army in sight): the nearest gun, the weakest of two
      if (L.smart >= 3 && this.n % 2 === 0 && this.focusGuns(R, w)) return;
      if (this.n % 2 === 0) for (const u of w.units) if (idle(u) && Math.abs(u.tx - t.x) + Math.abs(u.ty - t.y) > 3) this.unitAttack(R, u, w);
      // nothing in reach of the ones standing at the target: on to what they know is near
      if (this.n % 6 === 0) {
        let stood = 0;
        for (const u of w.units) if (idle(u) && !u.tgt) stood++;
        if (stood >= w.units.size * 0.6 && f - w.t > 600) {
          const c = this.centroid(w);
          const nt = this.nearestFoe(R, c, 30, false);
          if (nt && (!t.rec || nt.rec !== t.rec)) { w.tgt = nt; w.t = f; this.waveAttack(R, w); }
          else if (!nt) { const p = this.pickTarget(R, H, str, null); if (p) { w.tgt = p; w.t = f; this.waveAttack(R, w); } else this.waveHome(R, w, true); }
        }
      }
      return;
    }
    // home: back in the pool once there
    const p = this.rally || this.home;
    for (const u of w.units) {
      if (Math.abs(u.tx - p.x) + Math.abs(u.ty - p.y) <= 7 || f - w.t > 2 * RTS_AI_MIN) { this.role.set(u.id, 'pool'); w.units.delete(u); }
      else if (idle(u) && this.n % 4 === 0) R.cmdMove(u, p.x, p.y);
    }
  },
  focusGuns(R, w) {
    const c = this.centroid(w), f = this.f;
    for (const r of this.mu.values()) if (r.t === f && r.d.wpn && r.d.cls !== 'air' && Math.abs(r.x - c.x) + Math.abs(r.y - c.y) < 10) return false;
    let best = null, bs = 1e9;
    for (const r of this.mb.values()) {
      if (!r.d.defense || r.t !== f) continue;
      const d = Math.hypot(r.x - c.x, r.y - c.y);
      if (d > 10) continue;
      const s = d + r.hp * 4;
      if (s < bs) { bs = s; best = r; }
    }
    if (!best || !R.validTarget(null, best.o)) return false;
    for (const u of w.units) if (u.d.cls !== 'air' && !(u.order.k === 'attack' && u.order.t === best.o)) R.cmdAttack(u, best.o);
    return true;
  },
  waveAttack(R, w) {
    for (const u of w.units) this.unitAttack(R, u, w);
  },
  // one unit of a wave at its target (seen now: at it; else to where it was); sonic tanks lead, the rest a step behind
  unitAttack(R, u, w) {
    const t = w.tgt;
    if (t.rec && t.rec.t === this.f && R.validTarget(u, t.rec.o) && !(t.rec.d.cls === 'air' && !(RTS_WEAPONS[u.d.wpn] || {}).air)) {
      if (t.rec.o.isB || u.d.cls === 'air') { R.cmdAttack(u, t.rec.o); return; }
    }
    let x = t.x, y = t.y;
    const hasSonic = u.key !== 'sonic' && [...w.units].some(v => v.key === 'sonic');
    if (hasSonic) { const p = this.towards({ x: t.x, y: t.y }, this.rally || this.home, 2); x = p.x; y = p.y; }
    x += ((this.rnd() * 5) | 0) - 2; y += ((this.rnd() * 5) | 0) - 2;
    R.cmdAttackMove(u, Math.max(0, Math.min(this.W - 1, x)), Math.max(0, Math.min(this.Hh - 1, y)));
  },
  // the nearest enemy we know of round a point: a building, or units seen just now
  nearestFoe(R, c, maxD, unitsOnly) {
    let best = null, bd = maxD * maxD;
    if (!unitsOnly) for (const r of this.mb.values()) {
      if (r.d.wall) continue;
      const d = (r.x + r.w / 2 - c.x) ** 2 + (r.y + r.hh / 2 - c.y) ** 2 - (RTS_AI_VALUE[r.key] || 1) * 6;
      if (d < bd) { bd = d; best = { x: r.x + (r.w >> 1), y: r.y + (r.hh >> 1), rec: r, h: r.h }; }
    }
    for (const r of this.mu.values()) {
      if (this.f - r.t > 120 || r.d.cls === 'air') continue;
      const d = (r.x - c.x) ** 2 + (r.y - c.y) ** 2;
      if (d < bd) { bd = d; best = { x: r.x, y: r.y, rec: r, h: r.h }; }
    }
    return best;
  },
  // what to attack: by level, the nearest building, or the best worth against the guns round it
  pickTarget(R, H, myStr, not) {
    const L = this.L, from = this.rally || this.home, f = this.f;
    let best = null, bs = -1e9;
    for (const r of this.mb.values()) {
      if (r.d.wall || r.d.defense && (not || L.smart >= 2) || not && not.rec === r) continue;
      if (not && Math.hypot(r.x - not.x, r.y - not.y) < 6) continue;
      const cx = r.x + r.w / 2, cy = r.y + r.hh / 2;
      const dist = Math.hypot(cx - from.x, cy - from.y);
      let s;
      if (L.smart === 0) s = -dist;
      else {
        let val = RTS_AI_VALUE[r.key] || 1;
        if (L.smart >= 2 && (r.key === 'refinery' || r.key === 'vapor')) val += 2;
        if (this.main && this.main.h && r.h !== this.main.h) val -= 2;
        s = val * 12 - dist * 0.6;
        if (L.smart >= 2) { const th = this.threatAt(cx, cy, 7); s -= th / Math.max(400, myStr) * 30; }
      }
      if (s > bs) { bs = s; best = r; }
    }
    // the enemy's harvesters out on the fields (the sharper levels, or when nothing else is known)
    if (L.smart >= 2 || !best) for (const r of this.mu.values()) {
      if (!r.d.harvester || f - r.t > 1800) continue;
      if (not && not.rec === r) continue;
      const dist = Math.hypot(r.x - from.x, r.y - from.y);
      const th = this.threatAt(r.x, r.y, 7, 900);
      const s = 7 * 12 + 30 - dist * 0.6 - th / Math.max(400, myStr) * 30 + (not ? 40 : 0);
      if (s > bs) { bs = s; best = r; }
    }
    if (best) return best.w ? { x: best.x + (best.w >> 1), y: best.y + (best.hh >> 1), rec: best, h: best.h } : { x: best.x, y: best.y, rec: best, h: best.h };
    if (not) return null;
    if (this.main) return { x: this.main.x, y: this.main.y, guess: true, h: this.main.h };
    const u = this.unexplored(this.home.x, this.home.y);
    return u ? { x: u.x, y: u.y, guess: true, h: null } : null;
  },
  // ---------------------------------------------------------------- the raiding party: after the harvesters
  harassCtl(R, H) {
    const f = R.frame, L = this.L;
    const squad = this.armyU.filter(u => this.is(u, 'harass'));
    if (squad.length) {
      let hp = 0, mx = 0;
      for (const u of squad) { hp += u.hp; mx += u.max; }
      const t = this.harassT;
      // hurt or no target: home
      if (hp < mx * 0.45 || !t || f - this.harassGo > 2.5 * RTS_AI_MIN) {
        for (const u of squad) { this.role.set(u.id, 'pool'); if (this.rally) R.cmdMove(u, this.rally.x, this.rally.y); else R.cmdMove(u, this.home.x, this.home.y); }
        this.nextHarass = f + (this.nomadsOnly ? 3.5 : 2) * RTS_AI_MIN;
        return;
      }
      // keep after it (a harvester seen now: at it; else where it was)
      if (this.n % 2 === 0) {
        const r = t.rec && this.mu.get(t.rec.id);
        if (t.rec && t.rec.d && !t.rec.w && !r) { this.harassT = this.harassTarget(R, H); if (!this.harassT) return; }
        for (const u of squad) {
          if (this.busyOn(R, u)) continue;
          if (r && r.t === f && R.validTarget(u, r.o)) R.cmdAttack(u, r.o);
          else if ((u.order.k === 'idle' || u.order.k === 'guard') && !u.path) {
            const tt = this.harassT;
            if (!tt) break;
            if (Math.abs(u.tx - tt.x) + Math.abs(u.ty - tt.y) <= 3) { this.harassT = this.harassTarget(R, H); }
            else R.cmdAttackMove(u, tt.x, tt.y);
          }
        }
      }
      return;
    }
    if (f < this.nextHarass || f - this.lastThreat < 900) return;
    const want = this.nomadsOnly ? 2 : this.campaign ? Math.min(2, L.harass) : L.harass;
    // fast ones from the pool (the raiders' own: light vehicles; with no base: whatever there is, a couple kept)
    let cand = this.armyU.filter(u => (this.is(u, 'pool') || this.nomadsOnly && this.is(u, 'def')) && u.hp > u.max * 0.7);
    if (!this.nomadsOnly) cand = cand.filter(u => u.d.cls === 'veh' && u.d.speed >= 0.8);
    else if (cand.length <= 2) { this.nextHarass = f + RTS_AI_MIN; return; }
    if (cand.length < Math.min(2, want)) { this.nextHarass = f + 600; return; }
    const tgt = this.harassTarget(R, H);
    if (!tgt) { this.nextHarass = f + RTS_AI_MIN; return; }
    cand.sort((a, b) => b.d.speed - a.d.speed);
    const go = cand.slice(0, this.nomadsOnly ? Math.min(want, cand.length - 2) : want);
    for (const u of go) { this.role.set(u.id, 'harass'); R.cmdAttackMove(u, tgt.x, tgt.y); }
    this.harassT = tgt; this.harassGo = f;
  },
  harassTarget(R, H) {
    const f = this.f, from = this.home;
    let best = null, bs = 1e9;
    for (const r of this.mu.values()) {
      if (!r.d.harvester || f - r.t > 2400) continue;
      const th = this.threatAt(r.x, r.y, 6, 900);
      const s = Math.hypot(r.x - from.x, r.y - from.y) + th / 40 + (f - r.t) / 120;
      if (s < bs) { bs = s; best = { x: r.x, y: r.y, rec: r }; }
    }
    if (best) return best;
    // no harvester seen lately: a refinery out of the guns' way, or (no base of our own) whatever we've seen
    // (a campaign foe's raiders only go for harvesters)
    if (this.campaign && !this.nomadsOnly) return null;
    for (const r of this.mb.values()) {
      if (r.key !== 'refinery' && !(this.nomadsOnly && !r.d.wall)) continue;
      const th = this.threatAt(r.x + 1, r.y + 1, 7);
      if (th > 700 && !this.nomadsOnly) continue;
      const s = Math.hypot(r.x - from.x, r.y - from.y) + th / 40;
      if (s < bs) { bs = s; best = { x: r.x + (r.w >> 1), y: r.y + r.hh, rec: r }; }
    }
    if (best) return best;
    if (this.nomadsOnly) {
      // no base: units seen, else the nearest likely camp
      for (const r of this.mu.values()) { const s = Math.hypot(r.x - from.x, r.y - from.y); if (s < bs) { bs = s; best = { x: r.x, y: r.y }; } }
      if (best) return best;
      const c = this.cands.find(c => !c.seen) || this.cands[0];
      if (c) return { x: c.x, y: c.y };
    }
    return null;
  },
  // ---------------------------------------------------------------- aircraft
  airCtl(R, H) {
    const f = R.frame;
    if (!this.air.length || this.n % 2) return;
    // no air raids before the raiding parties would go (defending is always allowed)
    if (f < this.nextHarass && f - this.lastThreat > 300) { for (const u of this.air) if (this.is(u, 'air') && u.order.k !== 'idle' && !this.busyOn(R, u)) R.cmdStop(u); return; }
    for (const u of this.air) {
      if (!this.is(u, 'air')) continue;
      if (this.busyOn(R, u)) continue;
      // a harvester or a unit seen lately, away from rocket guns
      let best = null, bs = 1e9;
      for (const r of this.mu.values()) {
        if (f - r.t > 600 || r.d.cls === 'air') continue;
        let aa = 0;
        for (const m of this.mb.values()) if (m.key === 'rturret' && Math.abs(m.x - r.x) + Math.abs(m.y - r.y) < 9) aa++;
        for (const m of this.mu.values()) if ((m.key === 'missile' || m.key === 'trooper' || m.key === 'praetorian') && f - m.t < 600 && Math.abs(m.x - r.x) + Math.abs(m.y - r.y) < 6) aa++;
        const s = Math.hypot(r.x - u.tx, r.y - u.ty) + aa * 12 - (r.d.harvester ? 15 : 0);
        if (s < bs) { bs = s; best = r; }
      }
      if (best && best.t === f && R.validTarget(u, best.o)) R.cmdAttack(u, best.o);
      else if (best) R.cmdAttackMove(u, best.x, best.y);
      else if (u.order.k !== 'idle') R.cmdStop(u);
    }
  },
  // ---------------------------------------------------------------- specials
  specials(R, H) {
    const f = R.frame;
    for (const u of this.armyU) {
      const role = this.role.get(u.id);
      // a juggernaut about to die in the middle of them: take them along
      if (u.d.selfDestruct && u.order.k !== 'boom' && (u.hp < u.max * 0.28 || role === 'conv')) {
        let foe = 0, mine = 0;
        R.unitsNear(u.x, u.y, 44, v => {
          if (v === u) return;
          if (R.isEnemy(this.h, v.h)) { if (this.mu.has(v.id) && this.mu.get(v.id).t === this.f) foe += v.d.cost || 100; }
          else if (v.h === this.h) mine += v.d.cost || 100;
        });
        for (const r of this.mb.values()) if (Math.abs(r.x + r.w / 2 - u.tx) < 3.5 && Math.abs(r.y + r.hh / 2 - u.ty) < 3.5) foe += (RTS_AI_VALUE[r.key] || 1) * 90;
        if (role === 'conv') mine = 0;
        if (foe > 500 && foe > mine * 1.5 || u.hp < u.max * 0.12 && foe > 250) { R.cmdSelfDestruct(u); continue; }
      }
      // a converter: the best enemy vehicle in reach
      if (u.d.wpn === 'gasgun' && !(this.busyOn(R, u) && u.order.t.isU && u.order.t.d.cls === 'veh' && !u.order.t.conv) && this.n % 2 === 0) {
        let best = null, bs = 0;
        for (const r of this.mu.values()) {
          if (r.t !== this.f || r.d.cls !== 'veh' || r.o.conv || r.d.harvester && this.lv < 2) continue;
          const d = Math.hypot(r.x - u.tx, r.y - u.ty);
          if (d > 7) continue;
          const s = (r.d.cost || 100) * r.hp - d * 20;
          if (s > bs) { bs = s; best = r; }
        }
        if (best && R.validTarget(u, best.o)) R.cmdAttack(u, best.o);
      }
      // turned to our side for a while: at their friends
      if (role === 'conv' && !this.busyOn(R, u) && this.n % 2 === 0) {
        const t = this.nearestFoe(R, { x: u.tx, y: u.ty }, 40, false);
        if (t && t.rec && t.rec.t === this.f && R.validTarget(u, t.rec.o)) R.cmdAttack(u, t.rec.o);
        else if (t && (u.order.k === 'idle' || u.order.k === 'guard')) R.cmdAttackMove(u, t.x, t.y);
      }
    }
  },
  // ---------------------------------------------------------------- the palace
  palaceCtl(R, H) {
    const h = this.h;
    if (!R.palaceReady(h)) return;
    // not in the first minutes (the gentler, the later; a campaign foe later still)
    if (R.frame < ([15, 12, 9, 7, 5][this.lv] + (this.campaign ? 8 : 0)) * RTS_AI_MIN) return;
    const k = R.palaceKind(h), lv = this.lv, f = this.f;
    if (k === 'doomfist') {
      // where the enemy's buildings are thickest (worth most within the blast)
      let best = null, bs = 0;
      const recs = [...this.mb.values()].filter(r => !r.d.wall);
      for (const r of recs) {
        const cx = r.x + r.w / 2, cy = r.y + r.hh / 2;
        let s = 0;
        for (const o of recs) { const d = Math.hypot(o.x + o.w / 2 - cx, o.y + o.hh / 2 - cy); if (d < 4) s += (RTS_AI_VALUE[o.key] || 1) * o.w * o.hh * (1 - d / 5); }
        if (lv === 0) s = this.rnd();
        if (s > bs) { bs = s; best = { x: Math.round(cx), y: Math.round(cy) }; }
      }
      if (best) R.palacePower(h, best);
    } else if (k === 'saboteur') {
      const t = this.sabTarget(R);
      if (t) R.palacePower(h, t.o);
      else if (this.sabs.length < 2) R.palacePower(h, null);
    } else if (k === 'nomads') {
      // the enemy's harvesters out on the sand (seen lately), else a refinery, else the enemy base
      let best = null, bs = 1e9;
      for (const r of this.mu.values()) {
        if (!r.d.harvester || f - r.t > 1800) continue;
        const s = (f - r.t) / 60 + this.threatAt(r.x, r.y, 5, 900) / 100;
        if (s < bs) { bs = s; best = { x: r.x, y: r.y }; }
      }
      // (a campaign foe sends them only at harvesters: a whole band loose in a young base is too much)
      if (!best && !this.campaign) for (const r of this.mb.values()) if (r.key === 'refinery') { best = { x: r.x + 1, y: r.y + r.hh + 1 }; break; }
      if (!best && !this.campaign && this.main && !this.main.guess) best = { x: this.main.x, y: this.main.y };
      if (best) R.palacePower(h, best);
    }
  },
  sabTarget(R) {
    const pri = { palace: 10, heavy: 9, yard: 8, starport: 7, hightech: 7, lab: 6, refinery: 6, repair: 5, rturret: 3, vapor: 4, light: 4 };
    let best = null, bs = 0;
    for (const r of this.mb.values()) {
      const p = pri[r.key];
      if (!p || r.o.dead) continue;
      const s = p * 10 - Math.hypot(r.x - this.home.x, r.y - this.home.y) * 0.3;
      if (s > bs) { bs = s; best = r; }
    }
    return best;
  },
  saboteurs(R, H) {
    for (const u of this.sabs) {
      if (u.order.k === 'sabotage' && u.order.b && !u.order.b.dead) continue;
      const t = this.sabTarget(R);
      if (t && R.cmdSabotage(u, t.o)) continue;
      if (this.main && (u.order.k === 'idle' || u.order.k === 'guard')) R.cmdMove(u, this.main.x, this.main.y);
    }
  },
  // ---------------------------------------------------------------- glimmer blooms near home: burst them when the fields run low
  blooms(R, H) {
    const f = R.frame, W = this.W;
    for (const u of this.armyU) {
      if (!this.is(u, 'bloom')) continue;
      const i = u.aiBloom;
      if (R.map.t[i] !== RTS_T.BLOOM || f - u.aiBloomT > RTS_AI_MIN) { this.role.set(u.id, 'pool'); if (this.rally) R.cmdMove(u, this.rally.x, this.rally.y); }
      return;
    }
    if (this.lv < 1 || this.glimNear > 3500 || !this.count(H, 'refinery')) return;
    let best = null, bd = 28 * 28;
    for (const [bx, by] of R.map.blooms) {
      if (!this.everSeen(bx, by) || R.map.t[by * W + bx] !== RTS_T.BLOOM) continue;
      const d = (bx - this.home.x) ** 2 + (by - this.home.y) ** 2;
      if (d < bd && this.threatAt(bx, by, 8) < 200) { bd = d; best = { x: bx, y: by }; }
    }
    if (!best) return;
    let shooter = null, sd = 1e9;
    for (const u of this.armyU) {
      if (!this.is(u, 'pool') || u.d.cls !== 'veh') continue;
      const d = (u.tx - best.x) ** 2 + (u.ty - best.y) ** 2;
      if (d < sd) { sd = d; shooter = u; }
    }
    if (!shooter) return;
    this.role.set(shooter.id, 'bloom'); shooter.aiBloom = best.y * W + best.x; shooter.aiBloomT = f;
    R.cmdAttack(shooter, { x: best.x, y: best.y });
  },
  // ---------------------------------------------------------------- the pool: gather at the rally point; the guards at their posts
  poolCtl(R, H) {
    if (this.n % 4) return;
    const f = R.frame;
    if (f - this.lastThreat < 120) return;
    const p = this.rally || this.home;
    const stray = [];
    for (const u of this.armyU) {
      const r = this.role.get(u.id);
      const idle = (u.order.k === 'idle' || u.order.k === 'guard') && !u.path && !u.mv && !u.wantPath;
      // a defender that chased something out of the base: back
      if ((r === 'pool' || r === 'def') && u.order.k === 'attack' && !this.nearBase(R, H, u.tx, u.ty, 14) && !this.nomadsOnly) { R.cmdMove(u, p.x, p.y); continue; }
      if (!idle) continue;
      if (r === 'pool') { if (Math.abs(u.tx - p.x) + Math.abs(u.ty - p.y) > 6) stray.push(u); }
      else if (r === 'def') {
        if (!u.aiPost) {
          const aps = this.approaches.length ? this.approaches : [this.home];
          const a = aps[(u.id % aps.length)];
          const q = this.towards(this.home, a, Math.max(3, Math.hypot(a.x - this.home.x, a.y - this.home.y) - 2));
          u.aiPost = this.nearestWith(q.x + ((u.id * 7) % 5) - 2, q.y + ((u.id * 3) % 5) - 2, 4, i => R.passStatic(u.d.move, i) && !this.keep[i]) || q;
          if (this.nomadsOnly) u.aiPost = { x: u.tx, y: u.ty };
        }
        if (Math.abs(u.tx - u.aiPost.x) + Math.abs(u.ty - u.aiPost.y) > 4) R.cmdMove(u, u.aiPost.x, u.aiPost.y);
      }
    }
    if (stray.length) R.cmdMoveGroup(stray, p.x, p.y, 'move');
  },
});
