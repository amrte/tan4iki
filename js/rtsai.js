'use strict';
// =====================================================================
//  DESERT DOMINION: the placeholder computer player (RTS_AI) and the stand-in skirmish map generator.
//    RTS_AI.make(R, house, level) -> { tick(R) }, called every 15 frames for each computer House. It plays only
//    through the command API (R.startBuild, R.place, R.cmdAttackMove, ...), so a better one can take its place:
//    unfolds the MCV, builds power first when short, then refinery, barracks, factories, radar, turrets, ...
//    (a plan, in order), keeps a harvester or two per refinery, trains a mixed army by what its factories make,
//    upgrades them, repairs what's hit, defends its base, uses its palace and the starport, and sends attack
//    waves that grow and come sooner at higher levels (0 easy .. 4 brutal).
//    rtsGenMap(opts) builds a skirmish map when js/rtsmaps.js (rtsMapGen) isn't there: value noise for rock
//    plateaus, cliffs and dunes, a rock base at each start, glimmer fields near every start and out in the open,
//    a few blooms.
// =====================================================================

// ------------------------------------------------------------------ the map generator (stand-in)
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

// ------------------------------------------------------------------ the computer player (placeholder)
const RTS_AI_PLAN = [['vapor', 1], ['refinery', 1], ['barracks', 1], ['vapor', 2], ['light', 1], ['radar', 1], ['refinery', 2], ['heavy', 1],
  ['vapor', 3], ['silo', 1], ['turret', 2], ['hall', 1], ['vapor', 4], ['hightech', 1], ['repair', 1], ['rturret', 2], ['vapor', 5], ['lab', 1],
  ['starport', 1], ['refinery', 3], ['vapor', 6], ['turret', 4], ['palace', 1], ['rturret', 4], ['vapor', 7], ['heavy', 2], ['vapor', 8], ['silo', 2]];
// unit choices by factory (weights)
const RTS_AI_MIX = {
  barracks: { soldier: 3, praetorian: 4 },
  hall: { trooper: 1 },
  light: { trike: 2, raider: 2, quad: 3 },
  heavy: { tank: 5, missile: 3, siege: 3, sonic: 2, juggernaut: 2, converter: 2 },
  hightech: { gunwing: 1 },
};

const RTS_AI = {
  make(R, house, level) { return new RtsBasicAi(R, house, level); },
};

class RtsBasicAi {
  constructor(R, h, level) {
    this.h = h;
    this.lv = Math.max(0, Math.min(4, level | 0));
    this.n = 0;
    this.rnd = rtsRng((R.seed ^ (h.charCodeAt(0) * 7919)) >>> 0);
    this.waves = 0;
    this.nextWave = [14400, 11400, 9000, 7200, 5400][this.lv];
    this.placeFail = 0;
    this.home = null;
  }
  tick(R) {
    const h = this.h, H = R.houses[h];
    if (!H || H.defeated) return;
    this.n++;
    const yard = H.buildings.find(b => b.key === 'yard');
    if (yard) this.home = { x: yard.x + 1, y: yard.y + 1 };
    if (!this.home) this.home = { x: H.start.x, y: H.start.y };
    // MCVs unpack where they stand (or roll home first)
    for (const u of H.units) {
      if (u.dead || !u.d.deploys || u.mv || u.wantPath || u.path) continue;
      if (!R.cmdDeploy(u, true)) {
        if (u.order.k === 'deploy') continue;
        const spot = this.deploySpot(R, u);
        if (spot) R.cmdDeployAt(u, spot.x, spot.y);
      }
    }
    // a small trickle for the harder levels (the original's computer had deep pockets too)
    if (this.lv >= 3 && this.n % 8 === 0) H.credits += this.lv === 4 ? 12 : 5;
    if (yard) this.build(R, H);
    this.produce(R, H);
    this.manage(R, H);
  }
  // ---------------------------------------------------------------- the base
  build(R, H) {
    const h = this.h, ready = R.ready(h, 'yard');
    if (ready) {
      const spot = this.findSpot(R, H, ready);
      if (spot && R.place(h, ready, spot.x, spot.y)) this.placeFail = 0;
      else if (++this.placeFail > 20) { R.cancelBuild(h, 'yard'); this.placeFail = 0; this.skip = ready; this.skipT = this.n + 60; }
      return;
    }
    if (H.prod.yard.queue.length) return;
    const list = R.buildList(h, 'yard');
    const spare = H.powerOut - H.powerUse;
    let pick = null;
    if (spare < 15 && list.includes('vapor') && (H.count.vapor || 0) < 12) pick = 'vapor';
    else {
      for (const [k, n] of RTS_AI_PLAN) {
        if ((H.count[k] || 0) >= n || !list.includes(k)) continue;
        if (this.skip === k && this.n < this.skipT) continue;
        pick = k;
        break;
      }
    }
    if (!pick && H.credits > 1500 && list.includes('turret') && (H.count.turret || 0) < 8) pick = list.includes('rturret') && this.rnd() < 0.5 ? 'rturret' : 'turret';
    if (this.broke && pick !== 'vapor' && pick !== 'refinery') return;
    if (pick && H.credits >= rtsPriceOf(h, pick) * 0.25) R.startBuild(h, 'yard', pick);
    // the yard's upgrade when there's money
    const y = H.buildings.find(b => b.key === 'yard');
    if (y && H.credits > 900 && R.nextUpgrade(y) && !H.prod.yard.queue.length) R.upgrade(h, y);
  }
  // a place for a building: near home, not boxing anything in; turrets toward the enemy
  findSpot(R, H, key) {
    const d = RTS_BUILDINGS[key], h = this.h, c = this.home;
    const foe = this.enemyBase(R, H);
    const ang = foe ? Math.atan2(foe.y - c.y, foe.x - c.x) : 0;
    let best = null, bs = 1e9, found = 0;
    for (let r = 1; r <= 16; r++) {
      for (let y = c.y - r; y <= c.y + r; y++) for (let x = c.x - r; x <= c.x + r; x++) {
        if (Math.max(Math.abs(x - c.x), Math.abs(y - c.y)) !== r) continue;
        if (!R.canPlace(h, key, x, y)) continue;
        // how boxed in it would be: building tiles in the ring round it
        let crowd = 0;
        for (let yy = y - 1; yy <= y + d.h; yy++) for (let xx = x - 1; xx <= x + d.w; xx++) {
          if ((xx >= x && xx < x + d.w && yy >= y && yy < y + d.h) || !R.inMap(xx, yy)) continue;
          if (R.bAt[yy * R.W + xx]) crowd++;
          else if (!RTS_PASS.track[R.map.t[yy * R.W + xx]]) crowd += 0.5;
        }
        let sc = r * 2 + Math.max(0, crowd - 3) * 3 + this.rnd() * 2;
        if (d.defense || d.wall) {
          const a = Math.atan2(y - c.y, x - c.x);
          let da = Math.abs(a - ang); if (da > Math.PI) da = Math.PI * 2 - da;
          sc = da * 6 + Math.abs(r - 6) * 1.5 + this.rnd();
        }
        if (sc < bs) { bs = sc; best = { x, y }; }
        found++;
      }
      if (found > 24 && r > 3) break;
    }
    return best;
  }
  deploySpot(R, u) {
    const s = this.home || R.houses[this.h].start;
    for (let r = 0; r <= 8; r++) for (let y = s.y - r; y <= s.y + r; y++) for (let x = s.x - r; x <= s.x + r; x++) {
      if (R.footFree('yard', x, y, u, true)) return { x, y };
    }
    return null;
  }
  // ---------------------------------------------------------------- the army
  produce(R, H) {
    const h = this.h;
    const units = H.units.filter(u => !u.dead);
    const harv = units.filter(u => u.d.harvester).length, refs = H.count.refinery || 0;
    const army = units.filter(u => u.d.wpn).length, cap = 14 + this.lv * 6;
    // harvesters first (and with none left, nothing else until there's one)
    const canHarv = R.buildList(h, 'heavy').includes('harvester');
    if (refs && harv < Math.min(refs + 1, 6) && canHarv) {
      const q = H.prod.heavy.queue;
      if (!q.length) R.startBuild(h, 'heavy', 'harvester');
      else if (!harv && q[0] !== 'harvester' && !q.includes('harvester')) { R.cancelBuild(h, 'heavy'); R.startBuild(h, 'heavy', 'harvester'); }
    }
    this.broke = refs > 0 && harv === 0 && H.credits < 600;
    // the placeholder's one cheat: a House left with a refinery, no harvester and no way to buy one gets one by frigate
    if (refs && !harv && (!canHarv || H.credits < 300) && !this.dropT) this.dropT = R.frame + 1800;
    if (this.dropT && R.frame >= this.dropT) {
      this.dropT = 0;
      const ref = H.buildings.find(b => b.key === 'refinery');
      if (ref && !units.some(u => u.d.harvester)) R.launchFrigate(H, null, ['harvester'], { to: { x: ref.x + 1, y: ref.y + ref.hh } });
    }
    if (this.broke) return;
    // one skylifter, if there's a high-tech factory
    if (H.prod.hightech.queue.length === 0 && !units.some(u => u.d.lifter) && R.buildList(h, 'hightech').includes('skylifter') && H.credits > 1200) R.startBuild(h, 'hightech', 'skylifter');
    if (army < cap) {
      for (const kind of ['barracks', 'hall', 'light', 'heavy', 'hightech']) {
        if (H.prod[kind].queue.length || !R.factoryOf(H, kind)) continue;
        if (H.credits < 150 + (kind === 'heavy' ? 150 : 0)) continue;
        const list = R.buildList(h, kind).filter(k => RTS_AI_MIX[kind] && RTS_AI_MIX[kind][k]);
        if (!list.length) continue;
        // infantry less once there are tanks
        if ((kind === 'barracks' || kind === 'hall') && R.factoryOf(H, 'heavy') && this.rnd() < 0.6) continue;
        const k = this.pick(list.map(k => [k, RTS_AI_MIX[kind][k]]));
        if (k) R.startBuild(h, kind, k);
      }
    }
    // factory upgrades
    if (this.n % 8 === 0) {
      for (const b of H.buildings) {
        if (!b.d.upgrades || b.key === 'yard') continue;
        const up = R.nextUpgrade(b);
        if (up && H.credits > up.cost + 500 && !H.prod[b.d.fac].queue.length) { R.upgrade(h, b); break; }
      }
    }
    // the starport, when rich
    if (H.count.starport && H.credits > 2200 && this.n % 20 === 0) {
      const opts = ['tank', 'missile', 'siege', 'quad'].filter(k => R.portAllowed(H, k) && H.port.stock[k] > 0 && H.port.price[k] < RTS_UNITS[k].cost * 1.15);
      if (opts.length) R.starportBuy(h, opts[(this.rnd() * opts.length) | 0]);
    }
    // the palace
    if (R.palaceReady(h)) {
      const k = R.palaceKind(h), foe = this.enemyTarget(R, H, k === 'doomfist');
      if (foe) R.palacePower(h, foe);
    }
  }
  pick(list) {
    let sum = 0;
    for (const [, w] of list) sum += w;
    let r = this.rnd() * sum;
    for (const [k, w] of list) { r -= w; if (r <= 0) return k; }
    return list.length ? list[0][0] : null;
  }
  manage(R, H) {
    const h = this.h, f = R.frame, home = this.home;
    const units = H.units.filter(u => !u.dead);
    for (const u of units) {
      if (u.d.harvester && (u.order.k === 'idle' || u.order.k === 'guard')) R.cmdHarvest(u);
      if (u.d.saboteur && u.order.k !== 'sabotage') { const t = this.enemyTarget(R, H, false); if (t) R.cmdSabotage(u, t); }
    }
    // repairs
    if (this.n % 4 === 0) for (const b of H.buildings) {
      if (!b.repairing && b.hp < b.max * 0.7 && H.credits > 350 && f - b.hitT > 120) R.repairBuilding(h, b, true);
    }
    // damaged tanks to the repair pad
    if (this.n % 6 === 0 && H.count.repair) for (const u of units) {
      if (u.d.cls === 'veh' && !u.d.harvester && u.hp < u.max * 0.35 && (u.order.k === 'idle' || u.order.k === 'guard') && f - u.hitT > 200) R.cmdRepair(u);
    }
    const fighters = units.filter(u => u.d.wpn && !u.d.lifter);
    // a harvester under fire: the nearest few go to help
    for (const hv of units) {
      if (!hv.d.harvester || f - hv.hitT > 30 || !hv.hitBy || hv.hitBy.dead || !R.isEnemy(h, hv.hitBy.h)) continue;
      const by = hv.hitBy;
      fighters.filter(u => !u.aiWave && u.d.cls !== 'air' && !(u.order.k === 'attack' && R.validTarget(u, u.order.t)))
        .sort((a, b) => ((a.x - by.x) ** 2 + (a.y - by.y) ** 2) - ((b.x - by.x) ** 2 + (b.y - by.y) ** 2))
        .slice(0, 3).forEach(u => R.cmdAttack(u, by));
    }
    // defend: something is hitting the base
    if (f - H.lastHit < 90) {
      const foes = [];
      R.unitsNear(home.x * 16 + 8, home.y * 16 + 8, 16 * 14, v => { if (R.isEnemy(h, v.h) && !v.d.untargetable && v.d.cls !== 'air') foes.push(v); });
      if (foes.length) {
        for (const u of fighters) {
          if (u.aiWave && Math.hypot(u.tx - home.x, u.ty - home.y) > 20) continue;
          if (u.order.k === 'attack' && R.validTarget(u, u.order.t)) continue;
          let best = null, bd = 1e9;
          for (const v of foes) { const d = (v.x - u.x) ** 2 + (v.y - u.y) ** 2; if (d < bd) { bd = d; best = v; } }
          if (best) R.cmdAttack(u, best);
        }
      }
    }
    // the muster: new units gather on the side facing the enemy
    const foe = this.enemyBase(R, H);
    const muster = foe ? this.towards(home, foe, 7) : home;
    for (const u of fighters) {
      if (u.aiWave) {
        if ((u.order.k === 'idle' || u.order.k === 'guard') && !u.path) R.cmdHunt(u);
        continue;
      }
      if (u.order.k === 'idle' && !u.path && !u.mv && Math.hypot(u.tx - muster.x, u.ty - muster.y) > 4 && u.d.cls !== 'air') R.cmdMove(u, muster.x + ((this.rnd() * 5) | 0) - 2, muster.y + ((this.rnd() * 5) | 0) - 2);
    }
    // attack waves
    const ready = fighters.filter(u => !u.aiWave && (u.order.k === 'idle' || u.order.k === 'guard' || u.order.k === 'move'));
    const size = Math.min(18, 5 + this.lv + this.waves * (1 + (this.lv >> 1)));
    if (f >= this.nextWave && ready.length >= size && foe) {
      const keep = Math.min(3, this.lv > 1 ? 2 : 1);
      const go = ready.slice(keep);
      const tgt = this.enemyTarget(R, H, false);
      const at = tgt ? R.targetTile(tgt) : foe;
      for (const u of go) { u.aiWave = true; R.cmdAttackMove(u, at.x, at.y); }
      this.waves++;
      this.nextWave = f + [7200, 6000, 4800, 3900, 3000][this.lv];
    }
  }
  towards(a, b, d) {
    const L = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    return { x: Math.round(a.x + (b.x - a.x) / L * d), y: Math.round(a.y + (b.y - a.y) / L * d) };
  }
  // the enemy base nearest home (a tile), and the building there worth hitting
  enemyBase(R, H) {
    const t = this.enemyTarget(R, H, false);
    if (t) return R.targetTile(t);
    let best = null, bd = 1e9;
    for (const o of R.enemiesOf(this.h)) {
      if (o.nomads || o.defeated) continue;
      const d = (o.start.x - this.home.x) ** 2 + (o.start.y - this.home.y) ** 2;
      if (d < bd) { bd = d; best = o.start; }
    }
    return best;
  }
  enemyTarget(R, H, biggest) {
    let best = null, bs = 1e18;
    for (const o of R.enemiesOf(this.h)) {
      for (const b of o.buildings) {
        if (b.dead || b.d.wall) continue;
        let sc = (b.cx / 16 - this.home.x) ** 2 + (b.cy / 16 - this.home.y) ** 2;
        if (biggest) sc -= b.w * b.hh * 400 + (b.key === 'yard' ? 3000 : 0);
        if (o.human) sc *= 0.8;
        if (sc < bs) { bs = sc; best = b; }
      }
    }
    if (!best) for (const o of R.enemiesOf(this.h)) for (const u of o.units) {
      if (u.dead || u.d.untargetable) continue;
      const sc = (u.tx - this.home.x) ** 2 + (u.ty - this.home.y) ** 2;
      if (sc < bs) { bs = sc; best = u; }
    }
    return best;
  }
}
