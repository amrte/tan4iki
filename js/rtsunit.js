'use strict';
// =====================================================================
//  DESERT DOMINION: units (the simulation's half that moves).
//    - tiles: a vehicle holds one tile (and the next while it rolls into it), infantry share a tile three to a tile
//      (each in its own slot), buildings block both, aircraft hold none. Vehicles turn in eight steps before they
//      roll; turrets turn on their own. Vehicles run over enemy infantry.
//    - paths: A* over the tiles (8 ways, no cutting corners past blocked tiles), the cost of each tile by how fast
//      the unit crosses it, standing units a little dearer to pass; a unit waiting behind a friend asks it to step
//      aside, waits, then looks for a way round the units near it. Paths are worked out a few each frame (a budget
//      of tiles searched), so a big order doesn't stall the game.
//    - combat: shots fly (bullets, shells, rockets, homing missiles, plasma, gas, the sonic wave that passes through
//      everything in its line), damage by weapon class against armour class (rtsdata.js), splash, craters, wrecks.
//      Units on guard fire at what comes in range, hit back when hit, hunters seek out the nearest enemy.
//    - harvesters find the nearest glimmer, scoop it (700 credits a load), go back to a refinery and unload (one
//      at a time; past the storage it's lost); skylifters ferry them when it's far, and take damaged units to the
//      repair pad. Frigates bring starport orders, the DOOMFIST falls anywhere.
//    - sandwyrms roam the open sand, home in on noise (moving, digging, firing on the sand), rise and swallow
//      everything there; they can't cross rock. Glimmer blooms burst into new fields when touched or shot.
// =====================================================================

const RTS_SLOT = [[-4, -3], [4, -2], [0, 4]];   // infantry spots in a tile
const RTS_SQRT2 = Math.SQRT2;

function rtsTurnToward(from, to) {
  const d = ((to - from) % 8 + 8) % 8;
  if (!d) return from;
  return (from + (d <= 4 ? 1 : 7)) % 8;
}

Object.assign(RtsGame.prototype, {
  // ================================================================ units: making, places, occupancy
  newUnit(Hs, key, tx, ty) {
    const d = RTS_UNITS[key];
    const u = { id: this.nextId++, isU: true, key, d, h: Hs.id, hp: d.hp, max: d.hp, x: tx * 16 + 8, y: ty * 16 + 8, tx, ty, dir: 4, tdir: 4, slot: -1,
      order: { k: 'idle' }, path: null, pi: 0, mv: null, wait: 0, turnT: 0, cd: 0, salvo: 0, salvoT: 0, tgt: null, anim: (this.rnd() * 64) | 0,
      cargo: 0, hs: null, docked: null, conv: null, hitT: -9999, hitBy: null, noiseT: -9999, still: 0, dead: false, flash: 0, firing: 0,
      scanT: this.nextId % 12, wantPath: null, inQ: false, goal: null, carried: null, lift: null, alt: 0, ang: Math.PI, job: null, born: this.frame };
    return u;
  },
  // the tile a unit of move class mc can stand on (terrain and buildings only)
  passStatic(mc, i) { return RTS_PASS[mc][this.map.t[i]] > 0 && !this.bAt[i]; },
  // a free infantry slot in a tile (-1: none), for unit u (enemies of u in it count as full)
  infSlot(i, u) {
    if (this.vAt[i] && this.vAt[i] !== u) return -1;
    let free = -1;
    for (let s = 0; s < 3; s++) {
      const q = this.iAt[i * 3 + s];
      if (!q) { if (free < 0) free = s; } else if (q !== u && u && this.isEnemy(q.h, u.h)) return -1;
    }
    return free;
  },
  hasInf(i) { return !!(this.iAt[i * 3] || this.iAt[i * 3 + 1] || this.iAt[i * 3 + 2]); },
  // is a tile free for a unit of def d (no unit given: just free)
  tileFreeFor(d, i, u) {
    if (d.cls === 'air') return true;
    if (!this.passStatic(d.move, i)) return false;
    if (d.cls === 'inf') return this.infSlot(i, u) >= 0;
    return !this.vAt[i] && !this.hasInf(i);
  },
  occupy(u, i) {
    if (u.d.cls === 'air') return 0;
    if (u.d.cls === 'inf') {
      const s = this.infSlot(i, u);
      if (s < 0) return -1;
      this.iAt[i * 3 + s] = u;
      return s;
    }
    this.vAt[i] = u;
    return 0;
  },
  release(u, i, slot) {
    if (i < 0 || u.d.cls === 'air') return;
    if (u.d.cls === 'inf') { if (slot >= 0 && this.iAt[i * 3 + slot] === u) this.iAt[i * 3 + slot] = null; }
    else if (this.vAt[i] === u) this.vAt[i] = null;
  },
  unoccupy(u) {
    const i = u.ty * this.W + u.tx;
    this.release(u, i, u.slot);
    if (u.mv) this.release(u, u.mv.ni, u.mv.ns);
  },
  // put a unit of key at a free tile (null if it isn't)
  spawnUnit(Hs, key, tx, ty) {
    const d = RTS_UNITS[key];
    if (!d || !this.inMap(tx, ty)) return null;
    const i = ty * this.W + tx;
    if (!this.tileFreeFor(d, i, { h: Hs.id })) return null;
    const u = this.newUnit(Hs, key, tx, ty);
    u.slot = this.occupy(u, i);
    if (u.slot < 0) return null;
    if (d.cls === 'inf') { u.x += RTS_SLOT[u.slot][0]; u.y += RTS_SLOT[u.slot][1]; }
    if (d.cls === 'air') u.alt = 1;
    this.units.push(u); Hs.units.push(u); this.byId.set(u.id, u);
    this.reveal(Hs, tx, ty, d.sight || 1);
    return u;
  },
  // the nearest free tile to (cx, cy) for def d, rings out to maxR
  findFree(d, cx, cy, maxR, avoid, probe) {
    for (let r = 0; r <= maxR; r++) {
      let best = null, bd = 1e9;
      for (let y = cy - r; y <= cy + r; y++) for (let x = cx - r; x <= cx + r; x++) {
        if (Math.max(Math.abs(x - cx), Math.abs(y - cy)) !== r || !this.inMap(x, y)) continue;
        const i = y * this.W + x;
        if (avoid && avoid.has(i)) continue;
        if (!this.tileFreeFor(d, i, probe || null)) continue;
        const dd = (x - cx) * (x - cx) + (y - cy) * (y - cy);
        if (dd < bd) { bd = dd; best = { x, y }; }
      }
      if (best) return best;
    }
    return null;
  },
  spawnUnitNear(Hs, key, cx, cy, maxR) {
    if (typeof Hs === 'string') Hs = this.houses[Hs];
    const d = RTS_UNITS[key];
    if (!d || !Hs) return null;
    cx = Math.max(0, Math.min(this.W - 1, cx | 0)); cy = Math.max(0, Math.min(this.H - 1, cy | 0));
    const p = this.findFree(d, cx, cy, maxR || 8, null, { h: Hs.id });
    return p ? this.spawnUnit(Hs, key, p.x, p.y) : null;
  },
  // next to a building, from its door (the middle of its bottom edge) round
  spawnBeside(Hs, key, b) {
    const d = RTS_UNITS[key];
    if (!d) return null;
    const dx = b.x + (b.w >> 1), dy = b.y + b.hh;
    let best = null, bd = 1e9;
    for (let r = 1; r <= 4 && !best; r++) {
      for (let y = b.y - r; y < b.y + b.hh + r; y++) for (let x = b.x - r; x < b.x + b.w + r; x++) {
        if (x > b.x - r && x < b.x + b.w + r - 1 && y > b.y - r && y < b.y + b.hh + r - 1) continue;
        if (!this.inMap(x, y)) continue;
        if (!this.tileFreeFor(d, y * this.W + x, { h: Hs.id })) continue;
        const dd = (x - dx) * (x - dx) + (y - dy) * (y - dy) * 0.8;
        if (dd < bd) { bd = dd; best = { x, y }; }
      }
    }
    if (!best) return null;
    const u = this.spawnUnit(Hs, key, best.x, best.y);
    if (u) u.dir = u.tdir = rtsDir8(best.x - dx, best.y - dy + 0.5) || 4;
    return u;
  },
  moveHouse(u, h) {
    const A = this.houses[u.h], B = this.houses[h];
    if (!B || A === B) return;
    if (A) { const k = A.units.indexOf(u); if (k >= 0) A.units.splice(k, 1); }
    B.units.push(u);
    u.h = h;
  },

  // ================================================================ the unit grid (8x8-tile cells, for "who's near")
  gridBuild() {
    const cw = this.gw = Math.ceil(this.W / 8), ch = Math.ceil(this.H / 8);
    if (!this.grid || this.grid.length !== cw * ch) this.grid = Array.from({ length: cw * ch }, () => []);
    for (const c of this.grid) c.length = 0;
    for (const u of this.units) {
      if (u.dead || u.carried) continue;
      const cx = Math.max(0, Math.min(cw - 1, (u.x / 128) | 0)), cy = Math.max(0, Math.min(ch - 1, (u.y / 128) | 0));
      this.grid[cy * cw + cx].push(u);
    }
  },
  // every unit within r px of (x, y): fn(u, d2)
  unitsNear(x, y, r, fn) {
    const cw = this.gw, ch = this.grid.length / cw;
    const x0 = Math.max(0, ((x - r) / 128) | 0), x1 = Math.min(cw - 1, ((x + r) / 128) | 0);
    const y0 = Math.max(0, ((y - r) / 128) | 0), y1 = Math.min(ch - 1, ((y + r) / 128) | 0), r2 = r * r;
    for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) {
      for (const u of this.grid[cy * cw + cx]) {
        if (u.dead || u.carried) continue;
        const dx = u.x - x, dy = u.y - y, d2 = dx * dx + dy * dy;
        if (d2 <= r2) fn(u, d2);
      }
    }
  },

  // ================================================================ paths
  pathInit() {
    const N = this.N;
    this.pG = new Float32Array(N); this.pFrom = new Int32Array(N); this.pSeen = new Uint32Array(N); this.pDone = new Uint32Array(N);
    this.pHeap = new Int32Array(N * 2 + 16); this.pHeapF = new Float32Array(N * 2 + 16); this.pGen = 0;
    this.pathQ = [];
    this.bfsQ = new Int32Array(N); this.bfsSeen = new Uint32Array(N); this.bfsGen = 0;
  },
  requestPath(u, gx, gy, avoid, keep) {
    u.goal = { x: gx, y: gy };
    u.wantPath = { gx, gy, avoid: !!avoid };
    if (!keep) { u.path = null; u.pi = 0; }
    if (!u.inQ) { u.inQ = true; this.pathQ.push(u); }
  },
  pathTick() {
    let budget = 5000;
    while (this.pathQ.length && budget > 0) {
      const u = this.pathQ.shift();
      u.inQ = false;
      if (u.dead || !u.wantPath || u.carried) continue;
      const w = u.wantPath;
      u.wantPath = null;
      const r = this.findPath(u, w.gx, w.gy, w.avoid);
      budget -= r.nodes + 50;
      u.path = r.path; u.pi = 0; u.pathT = this.frame; u.wait = 0;
      if (!r.path.length) u.path = null;
    }
  },
  // the nearest tile to (gx, gy) that move class mc can stand on
  nearestPassable(mc, gx, gy, fromX, fromY) {
    if (this.inMap(gx, gy) && this.passStatic(mc, gy * this.W + gx)) return { x: gx, y: gy };
    for (let r = 1; r <= 10; r++) {
      let best = null, bd = 1e9;
      for (let y = gy - r; y <= gy + r; y++) for (let x = gx - r; x <= gx + r; x++) {
        if (Math.max(Math.abs(x - gx), Math.abs(y - gy)) !== r || !this.inMap(x, y)) continue;
        if (!this.passStatic(mc, y * this.W + x)) continue;
        const dd = (x - fromX) * (x - fromX) + (y - fromY) * (y - fromY);
        if (dd < bd) { bd = dd; best = { x, y }; }
      }
      if (best) return best;
    }
    return null;
  },
  // A*: the tiles from u's tile to (gx, gy) (or as near as it gets), not counting the start
  findPath(u, gx, gy, avoid) {
    const W = this.W, H = this.H, t = this.map.t, mc = u.d.move, pass = RTS_PASS[mc];
    const sx = u.mv ? u.mv.ni % W : u.tx, sy = u.mv ? (u.mv.ni / W) | 0 : u.ty;
    gx = Math.max(0, Math.min(W - 1, gx | 0)); gy = Math.max(0, Math.min(H - 1, gy | 0));
    const goal = this.nearestPassable(mc, gx, gy, sx, sy);
    if (!goal) return { path: [], nodes: 10 };
    const s = sy * W + sx, gi = goal.y * W + goal.x;
    if (s === gi) return { path: [], nodes: 1 };
    const gen = ++this.pGen, G = this.pG, from = this.pFrom, seen = this.pSeen, done = this.pDone, heap = this.pHeap, hf = this.pHeapF;
    let hn = 0;
    const push = (i, f) => {
      let k = hn++;
      while (k > 0) { const p = (k - 1) >> 1; if (hf[p] <= f) break; heap[k] = heap[p]; hf[k] = hf[p]; k = p; }
      heap[k] = i; hf[k] = f;
    };
    const pop = () => {
      const top = heap[0], li = heap[--hn], lf = hf[hn];
      let k = 0;
      for (;;) {
        let c = 2 * k + 1;
        if (c >= hn) break;
        if (c + 1 < hn && hf[c + 1] < hf[c]) c++;
        if (hf[c] >= lf) break;
        heap[k] = heap[c]; hf[k] = hf[c]; k = c;
      }
      heap[k] = li; hf[k] = lf;
      return top;
    };
    const hOf = (x, y) => { const dx = Math.abs(x - goal.x), dy = Math.abs(y - goal.y); return (dx + dy + (RTS_SQRT2 - 2) * Math.min(dx, dy)) * 0.95; };
    G[s] = 0; seen[s] = gen; from[s] = -1;
    push(s, hOf(sx, sy));
    let nodes = 0, best = s, bestH = hOf(sx, sy);
    const maxNodes = Math.min(5000, 1500 + 60 * (Math.abs(goal.x - sx) + Math.abs(goal.y - sy)));
    const isInf = u.d.cls === 'inf';
    while (hn > 0) {
      const c = pop();
      if (done[c] === gen) continue;
      done[c] = gen;
      if (c === gi) { best = c; break; }
      if (++nodes > maxNodes) break;
      const cx = c % W, cy = (c / W) | 0;
      const hc = hOf(cx, cy);
      if (hc < bestH) { bestH = hc; best = c; }
      for (let d = 0; d < 8; d++) {
        const nx = cx + RTS_DX8[d], ny = cy + RTS_DY8[d];
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const n = ny * W + nx;
        if (done[n] === gen) continue;
        const sp = pass[t[n]];
        if (!sp || this.bAt[n]) continue;
        const diag = d & 1;
        if (diag) {
          const a = cy * W + nx, b = ny * W + cx;
          if (!pass[t[a]] || this.bAt[a] || !pass[t[b]] || this.bAt[b]) continue;
        }
        let cost = (diag ? RTS_SQRT2 : 1) / sp;
        // units in the way: dearer (standing ones more); with avoid, the standing ones near the start are walls
        const v = this.vAt[n];
        if (v && v !== u) {
          if (!v.mv && !v.path) {
            if (avoid && Math.abs(nx - sx) <= 3 && Math.abs(ny - sy) <= 3) continue;
            cost += this.isEnemy(v.h, u.h) ? 6 : 3;
          } else cost += 0.5;
        } else if (isInf && this.hasInf(n) && this.infSlot(n, u) < 0) {
          if (avoid && Math.abs(nx - sx) <= 3 && Math.abs(ny - sy) <= 3) continue;
          cost += 3;
        } else if (!isInf && this.hasInf(n)) {
          const q = this.iAt[n * 3] || this.iAt[n * 3 + 1] || this.iAt[n * 3 + 2];
          if (!(u.d.crush && q && this.isEnemy(q.h, u.h))) {
            if (avoid && Math.abs(nx - sx) <= 3 && Math.abs(ny - sy) <= 3) continue;
            cost += 2;
          }
        }
        const ng = G[c] + cost;
        if (seen[n] === gen && ng >= G[n]) continue;
        seen[n] = gen; G[n] = ng; from[n] = c;
        push(n, ng + hOf(nx, ny));
      }
    }
    const path = [];
    for (let k = best; k !== s && k >= 0; k = from[k]) path.push(k);
    path.reverse();
    return { path, nodes };
  },
  // breadth-first over tiles mc can cross from (sx, sy): the first one test(i) likes (null: none within maxNodes)
  bfs(mc, sx, sy, test, maxNodes) {
    const W = this.W, H = this.H, q = this.bfsQ, seen = this.bfsSeen, gen = ++this.bfsGen;
    let head = 0, tail = 0;
    const s = sy * W + sx;
    q[tail++] = s; seen[s] = gen;
    while (head < tail && head < maxNodes) {
      const c = q[head++];
      if (test(c)) return c;
      const cx = c % W, cy = (c / W) | 0;
      for (let d = 0; d < 8; d++) {
        const nx = cx + RTS_DX8[d], ny = cy + RTS_DY8[d];
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const n = ny * W + nx;
        if (seen[n] === gen) continue;
        seen[n] = gen;
        if (this.passStatic(mc, n)) q[tail++] = n;
      }
    }
    return null;
  },

  // ================================================================ moving
  // who stands in u's way on tile i (null: nobody)
  blockerAt(u, i) {
    const v = this.vAt[i];
    if (u.d.cls === 'inf') {
      if (v && v !== u) return v;
      if (this.infSlot(i, u) < 0) return this.iAt[i * 3] || this.iAt[i * 3 + 1] || this.iAt[i * 3 + 2];
      return null;
    }
    if (v && v !== u) return v;
    for (let s = 0; s < 3; s++) {
      const q = this.iAt[i * 3 + s];
      if (q && !(u.d.crush && this.isEnemy(q.h, u.h))) return q;
    }
    return null;
  },
  moveTick(u) {
    if (u.mv) {
      const m = u.mv;
      m.p += u.d.speed * RTS_SPEED * (RTS_PASS[u.d.move][this.map.t[m.ni]] || 0.5) * (u.conv ? 0.9 : 1);
      const k = Math.min(1, m.p / m.len);
      u.x = m.sx + (m.ex - m.sx) * k; u.y = m.sy + (m.ey - m.sy) * k;
      if (k >= 1) this.arrive(u);
      return;
    }
    if (!u.path) { u.still++; return; }
    if (u.pi >= u.path.length) { u.path = null; return; }
    const W = this.W, ni = u.path[u.pi], nx = ni % W, ny = (ni / W) | 0;
    if (Math.abs(nx - u.tx) > 1 || Math.abs(ny - u.ty) > 1) { if (u.goal) this.requestPath(u, u.goal.x, u.goal.y); else u.path = null; return; }
    const want = rtsDir8(nx - u.tx, ny - u.ty);
    if (u.d.cls === 'veh' && u.dir !== want) {
      if (++u.turnT >= u.d.turn) { u.turnT = 0; u.dir = rtsTurnToward(u.dir, want); if (!u.d.turret) u.tdir = u.dir; }
      return;
    }
    u.dir = want;
    if (!u.d.turret) u.tdir = want;
    // the ground (a building may have gone up since)
    let ok = this.passStatic(u.d.move, ni);
    if (ok && (want & 1)) {
      const a = u.ty * W + nx, b = ny * W + u.tx;
      ok = this.passStatic(u.d.move, a) && this.passStatic(u.d.move, b);
    }
    if (!ok) { if (u.goal) this.requestPath(u, u.goal.x, u.goal.y); else u.path = null; return; }
    const bl = this.blockerAt(u, ni);
    if (bl) {
      u.wait++;
      if (u.wait % 12 === 1 && !this.isEnemy(bl.h, u.h)) this.nudge(bl, u, ni);
      const last = u.pi === u.path.length - 1;
      if (last && u.wait > 20) { u.path = null; u.wait = 0; return; }   // someone stands on the goal: near enough
      if (u.wait % 30 === 0 && u.goal) this.requestPath(u, u.goal.x, u.goal.y, true, true);
      if (u.wait > 300) { u.path = null; u.wait = 0; }
      return;
    }
    u.wait = 0;
    const ns = this.occupy(u, ni);
    if (ns < 0) return;
    const off = u.d.cls === 'inf' ? RTS_SLOT[ns] : [0, 0];
    const ex = nx * 16 + 8 + off[0], ey = ny * 16 + 8 + off[1];
    u.mv = { ni, ns, sx: u.x, sy: u.y, ex, ey, len: Math.max(1, Math.hypot(ex - u.x, ey - u.y)), p: 0 };
    u.still = 0;
    if (RTS_ON_SAND[this.map.t[ni]]) u.noiseT = this.frame;
  },
  arrive(u) {
    const m = u.mv, W = this.W;
    this.release(u, u.ty * W + u.tx, u.slot);
    u.tx = m.ni % W; u.ty = (m.ni / W) | 0; u.slot = m.ns; u.x = m.ex; u.y = m.ey;
    u.mv = null; u.pi++;
    if (u.path && u.pi >= u.path.length) u.path = null;
    const Hs = this.houses[u.h];
    this.reveal(Hs, u.tx, u.ty, u.d.sight || 1);
    const i = m.ni;
    // tracks run over enemy infantry
    if (u.d.cls === 'veh') for (let s = 0; s < 3; s++) {
      const q = this.iAt[i * 3 + s];
      if (q && q !== u && this.isEnemy(q.h, u.h)) { this.killUnit(q, u.h, 'crushed'); this.sfx('nom', u.x, u.y); }
    }
    if (this.map.t[i] === RTS_T.BLOOM) this.burstBloom(i, u.h);
  },
  // a friend standing in the way steps aside (if it isn't busy)
  nudge(v, by, ni) {
    if (v.dead || v.mv || v.path || v.docked || v.carried || v.d.cls === 'air') return;
    if (!['idle', 'guard'].includes(v.order.k) && !(v.d.harvester && v.hs === 'wait')) return;
    if (v.wantPath) return;
    const W = this.W, avoid = new Set([ni, by.ty * W + by.tx]);
    if (by.path) for (let k = by.pi; k < Math.min(by.path.length, by.pi + 3); k++) avoid.add(by.path[k]);
    let best = null, bs = -1e9;
    for (let d = 0; d < 8; d++) {
      const x = v.tx + RTS_DX8[d], y = v.ty + RTS_DY8[d];
      if (!this.inMap(x, y)) continue;
      const i = y * W + x;
      if (avoid.has(i) || !this.tileFreeFor(v.d, i, v)) continue;
      // sideways to the one passing is best
      const side = Math.abs(RTS_DX8[d] * RTS_DY8[by.dir] - RTS_DY8[d] * RTS_DX8[by.dir]);
      const sc = side * 2 - (d & 1) * 0.5 + this.rnd() * 0.3;
      if (sc > bs) { bs = sc; best = i; }
    }
    if (best !== null) { v.path = [best]; v.pi = 0; v.goal = null; }
  },

  // ================================================================ the unit's frame
  unitTick(u) {
    if (u.carried) return;
    u.anim++;
    if (u.cd > 0) u.cd--;
    if (u.flash > 0) u.flash--;
    if (u.firing > 0) u.firing--;
    if (u.d.cls === 'veh' && u.hp < u.max * 0.5 && u.anim % (u.hp < u.max * 0.25 ? 14 : 28) === 0) this.addFx('smoke', u.x, u.y - 4, 0, 0, true);
    if (u.conv && --u.conv.t <= 0) this.unconvert(u);
    if (u.d.cls === 'air') { this.airTick(u); return; }
    if (u.salvo > 0 && --u.salvoT <= 0) {
      u.salvo--; u.salvoT = 8;
      if (this.validTarget(u, u.salvoTgt, true)) this.spawnShot(u, u.salvoTgt, RTS_WEAPONS[u.d.wpn]);
    }
    if (u.docked) { this.dockTick(u); return; }
    this.orderTick(u);
    this.moveTick(u);
  },
  // is t (a unit, a building, or ground) still there to be shot at by u?
  validTarget(u, t, any) {
    if (!t) return false;
    if (t.ground) return true;
    if (t.dead || t.carried) return false;
    if (t.isU) {
      if (t.d.untargetable) return false;
      if (t.d.cls === 'air') { const w = RTS_WEAPONS[u.d ? u.d.wpn : null]; if (!w || !w.air) return false; }
      if (!any && t.d.stealth && t.still > 60 && this.dist(u, t) > 24 && this.isEnemy(u.h, t.h)) return false;
    }
    return true;
  },
  dist(a, t) {
    const ax = a.isB ? a.cx : a.x, ay = a.isB ? a.cy : a.y;
    if (t.isB) {
      const x = Math.max(t.x * 16, Math.min((t.x + t.w) * 16, ax)), y = Math.max(t.y * 16, Math.min((t.y + t.hh) * 16, ay));
      return Math.hypot(ax - x, ay - y);
    }
    return Math.hypot(ax - t.x, ay - t.y);
  },
  aimPoint(a, t) {
    if (t.isB) {
      return { x: Math.max(t.x * 16 + 4, Math.min((t.x + t.w) * 16 - 4, a.x)), y: Math.max(t.y * 16 + 4, Math.min((t.y + t.hh) * 16 - 4, a.y)) };
    }
    return { x: t.x, y: t.y - (t.alt ? 6 : 0) };
  },
  targetTile(t) {
    if (t.isB) return { x: t.x + (t.w >> 1), y: t.y + (t.hh >> 1) };
    if (t.ground) return { x: t.tx, y: t.ty };
    return { x: t.tx, y: t.ty };
  },
  orderTick(u) {
    const o = u.order, w = u.d.wpn ? RTS_WEAPONS[u.d.wpn] : null;
    switch (o.k) {
      case 'idle': case 'guard': {
        if (w) {
          if (u.tgt && (!this.validTarget(u, u.tgt) || this.dist(u, u.tgt) > (w.range + 1) * 16)) u.tgt = null;
          if (!u.tgt && (this.frame + u.scanT) % 12 === 0) u.tgt = this.scan(u, w.range + (o.k === 'guard' ? 1.5 : 0.5), false);
          if (u.tgt) { this.attackTick(u, u.tgt, false, w); return; }
          // hit by something out of reach: go after it (and come back if it leads too far)
          if (o.k === 'idle' && u.hitBy && this.frame - u.hitT < 20 && this.validTarget(u, u.hitBy) && this.isEnemy(u.h, u.hitBy.h) && !u.d.harvester && !u.path) {
            const by = u.hitBy;
            if (!(by.isU && by.d.cls === 'air' && !w.air)) u.order = { k: 'attack', t: by, leash: { x: u.tx, y: u.ty } };
          }
        }
        if (o.k === 'idle' && u.d.harvester && !u.path && (this.frame + u.id) % 120 === 0 && u.hs) this.cmdHarvest(u);
        return;
      }
      case 'move': case 'retreat': {
        // turrets fire on the way at whatever comes in range
        if (w && u.d.turret && (this.frame + u.scanT) % 12 === 0) u.tgt = this.scan(u, w.range, false);
        if (w && u.d.turret && u.tgt && this.validTarget(u, u.tgt) && this.dist(u, u.tgt) <= w.range * 16) this.aimFire(u, u.tgt, w);
        if (!u.path && !u.mv && !u.wantPath) {
          // a long way (a partial path), or pushed off it: on again, a few times
          if (Math.max(Math.abs(u.tx - o.x), Math.abs(u.ty - o.y)) > 2 && (o.tries = (o.tries || 0) + 1) <= 4) { this.requestPath(u, o.x, o.y); return; }
          u.order = { k: o.k === 'retreat' ? 'guard' : 'idle' }; u.tgt = null;
        }
        return;
      }
      case 'attack': {
        const t = o.t;
        if (!this.validTarget(u, t, true) || (!w && !u.d.saboteur)) { u.order = { k: 'idle' }; u.tgt = null; return; }
        if (o.leash && Math.hypot(u.tx - o.leash.x, u.ty - o.leash.y) > 10) { this.cmdMove(u, o.leash.x, o.leash.y); return; }
        if (!w) return;
        this.attackTick(u, t, true, w);
        return;
      }
      case 'amove': {
        if (w) {
          if (u.tgt && (!this.validTarget(u, u.tgt) || this.dist(u, u.tgt) > ((u.d.sight || 3) + 2) * 16)) u.tgt = null;
          if (!u.tgt && (this.frame + u.scanT) % 12 === 0) u.tgt = this.scan(u, Math.max(w.range, u.d.sight || 3), false);
          if (u.tgt) { this.attackTick(u, u.tgt, true, w); return; }
        }
        if (!u.path && !u.mv && !u.wantPath) {
          if (Math.abs(u.tx - o.x) + Math.abs(u.ty - o.y) <= 2 || (o.tries = (o.tries || 0) + 1) > 4) { u.order = { k: 'guard', x: u.tx, y: u.ty }; return; }
          this.requestPath(u, o.x, o.y);
        }
        return;
      }
      case 'hunt': {
        if (!w && !u.d.saboteur) { u.order = { k: 'idle' }; return; }
        if (u.tgt && !this.validTarget(u, u.tgt)) u.tgt = null;
        if ((!u.tgt || (this.frame + u.id) % 90 === 0) && (this.frame + u.scanT) % 12 === 0) {
          const near = w ? this.scan(u, Math.max(w.range, u.d.sight || 3) + 1, false) : null;
          u.tgt = near || u.tgt || this.nearestEnemy(u);
        }
        if (u.tgt) { if (u.d.saboteur && u.tgt.isB) { u.order = { k: 'sabotage', b: u.tgt }; return; } if (w) this.attackTick(u, u.tgt, true, w); }
        return;
      }
      case 'harvest': this.harvestTick(u); return;
      case 'deploy': {
        if (!u.path && !u.mv && !u.wantPath) {
          if (!this.cmdDeploy(u, true)) u.order = { k: 'idle' };
        }
        return;
      }
      case 'repair': this.repairTick(u); return;
      case 'capture': case 'sabotage': this.enterTick(u); return;
      case 'boom': {
        u.path = null;
        if (--o.t <= 0) this.selfDestructBlast(u);
        return;
      }
    }
  },
  // go for t (chase: move into range), aim and fire
  attackTick(u, t, chase, w) {
    const d = this.dist(u, t), range = w.range * 16, minR = (w.minRange || 0) * 16;
    if (d <= range && d >= minR) {
      if (u.path && !u.mv) { u.path = null; u.wantPath = null; }
      if (!u.mv || u.d.turret || u.d.cls === 'inf') this.aimFire(u, t, w);
      return;
    }
    if (u.d.turret && d <= range) this.aimFire(u, t, w);
    if (!chase) return;
    const tt = this.targetTile(t);
    if (d < minR) {   // too close for a launcher: back off a little
      if (!u.path && !u.wantPath) this.requestPath(u, u.tx + Math.sign(u.tx - tt.x) * 2, u.ty + Math.sign(u.ty - tt.y) * 2);
      return;
    }
    const g = u.goal;
    if (!u.wantPath && (!u.path && !u.mv || (g && Math.abs(g.x - tt.x) + Math.abs(g.y - tt.y) > 2 && this.frame - (u.pathT || 0) > 40))) {
      this.requestPath(u, tt.x, tt.y, false, !!u.path);
    }
  },
  aimFire(u, t, w) {
    const p = this.aimPoint(u, t);
    const want = rtsDir8(p.x - u.x, p.y - u.y);
    if (u.d.turret) {
      if (u.tdir !== want) { if (u.anim % 3 === 0) u.tdir = rtsTurnToward(u.tdir, want); return; }
    } else if (u.d.cls === 'veh' || u.d.cls === 'bld') {
      if (u.mv) return;
      if (u.dir !== want) { if (++u.turnT >= u.d.turn) { u.turnT = 0; u.dir = rtsTurnToward(u.dir, want); u.tdir = u.dir; } return; }
    } else u.dir = want;
    if (u.cd > 0) return;
    this.fire(u, t, w);
  },
  fire(src, t, w) {
    src.cd = w.rate;
    src.firing = 8;
    this.spawnShot(src, t, w);
    if (w.salvo > 1) { src.salvo = w.salvo - 1; src.salvoT = 8; src.salvoTgt = t; }
    const tx = src.isB ? src.x : src.tx, ty = src.isB ? src.y : src.ty;
    if (this.inMap(tx, ty) && RTS_ON_SAND[this.map.t[ty * this.W + tx]]) src.noiseT = this.frame;
    if (w.sound) this.sfx(w.sound, src.isB ? src.cx : src.x, src.isB ? src.cy : src.y);
    if (src.h === this.player || (t.h === this.player)) this.battle();
  },
  // the nearest thing to shoot at within r tiles (units before buildings unless `bld`)
  scan(u, r, bld) {
    const w = u.d.wpn ? RTS_WEAPONS[u.d.wpn] : null;
    const x = u.isB ? u.cx : u.x, y = u.isB ? u.cy : u.y, h = u.h;
    let best = null, bs = 1e9;
    const R = r * 16 + (u.isB ? 8 : 0);
    this.unitsNear(x, y, R + 8, (v, d2) => {
      if (!this.isEnemy(h, v.h) || v.d.untargetable) return;
      if (v.d.cls === 'air' && !(w && w.air)) return;
      if (v.d.stealth && v.still > 60 && d2 > 24 * 24) return;
      if (d2 > R * R) return;
      if (this.fog && !this.visible(h, v.tx, v.ty)) return;
      const sc = Math.sqrt(d2) - (v.d.wpn ? 24 : 0) - (v === u.hitBy ? 40 : 0);
      if (sc < bs) { bs = sc; best = v; }
    });
    if (best && !bld) return best;
    for (const b of this.buildings) {
      if (b.dead || !this.isEnemy(h, b.h)) continue;
      if (Math.abs(b.cx - x) > R + 40 || Math.abs(b.cy - y) > R + 40) continue;
      const d = this.dist({ x, y }, b);
      if (d > R) continue;
      const sc = d + (b.d.wall ? 60 : 0) - (b.d.defense ? 20 : 0) + 30;
      if (sc < bs) { bs = sc; best = b; }
    }
    return best;
  },
  // the nearest enemy anything, anywhere (hunters)
  nearestEnemy(u) {
    let best = null, bd = 1e18;
    const w = u.d.wpn ? RTS_WEAPONS[u.d.wpn] : null;
    for (const o of this.houseList) {
      if (!this.isEnemy(u.h, o.id)) continue;
      for (const v of o.units) {
        if (v.dead || v.carried || v.d.untargetable || (v.d.cls === 'air' && !(w && w.air))) continue;
        const d = (v.x - u.x) ** 2 + (v.y - u.y) ** 2;
        if (d < bd) { bd = d; best = v; }
      }
      for (const b of o.buildings) {
        const d = (b.cx - u.x) ** 2 + (b.cy - u.y) ** 2 + (b.d.wall ? 1e5 : 0);
        if (d < bd) { bd = d; best = b; }
      }
    }
    return best;
  },
  // defensive buildings: aim the swivel, fire (rocket turrets need power)
  turretTick(b, Hs) {
    if (b.rise < 1) return;
    const w = RTS_WEAPONS[b.d.wpn];
    if (b.cd > 0) b.cd--;
    if (b.firing > 0) b.firing--;
    if (w.needsPower && this.lowPower(Hs)) return;
    if (b.tgt && (!this.validTarget(b, b.tgt) || this.dist(b, b.tgt) > w.range * 16 + 8)) b.tgt = null;
    if (!b.tgt && (this.frame + b.id) % 15 === 0) {
      const t = this.scan(b, w.range, false);
      b.tgt = t && t.isB && t.d.wall ? null : t;
    }
    const t = b.tgt;
    if (!t) return;
    const p = this.aimPoint({ x: b.cx, y: b.cy }, t);
    const d = Math.hypot(p.x - b.cx, p.y - b.cy);
    if (w.minRange && d < w.minRange * 16) return;
    const want = rtsDir8(p.x - b.cx, p.y - b.cy);
    if (b.tdir !== want) { if (b.anim % 3 === 0) b.tdir = rtsTurnToward(b.tdir, want); return; }
    if (b.cd > 0) return;
    this.fire(b, t, w);
  },

  // ================================================================ shots
  spawnShot(src, t, w) {
    const isB = src.isB;
    const sx0 = isB ? src.cx : src.x, sy0 = isB ? src.cy : src.y - (src.alt ? 8 : 0);
    const p = this.aimPoint({ x: sx0, y: sy0 }, t);
    let ex = p.x, ey = p.y;
    const dir = rtsDir8(ex - sx0, ey - sy0);
    const sx = sx0 + RTS_DX8[dir] * 5, sy = sy0 + RTS_DY8[dir] * 5;
    const dist0 = Math.hypot(ex - sx, ey - sy);
    if (w.spread) {
      const sp = w.spread * 16 * Math.min(1, dist0 / (w.range * 16 || 1)) * (0.4 + 0.6 * this.rnd());
      const a = this.rnd() * Math.PI * 2;
      ex += Math.cos(a) * sp; ey += Math.sin(a) * sp;
    }
    if (w.sonic) {   // the wave runs on to full range
      const L = Math.max(1, Math.hypot(ex - sx, ey - sy));
      ex = sx + (ex - sx) / L * w.range * 16; ey = sy + (ey - sy) / L * w.range * 16;
    }
    const L = Math.max(1, Math.hypot(ex - sx, ey - sy)), n = Math.max(1, Math.ceil(L / w.speed));
    const s = { k: w.shot, wc: w.cls, x: sx, y: sy, sx, sy, ex, ey, vx: (ex - sx) / n, vy: (ey - sy) / n, n, n0: n, dmg: w.dmg, h: src.h, src, tgt: t.ground ? null : t,
      splash: (w.splash || 0) * 16, dir, f: 0, convert: w.convert || 0, sonic: !!w.sonic, hits: w.sonic ? new Set() : null,
      home: w.shot === 'missile' && t && !t.ground, air: !!(t && t.isU && t.d.cls === 'air') };
    if (src.isU && src.firing !== undefined) this.addFx('muzzle', sx, sy, 0, dir);
    this.shots.push(s);
    return s;
  },
  shotsTick() {
    const out = [];
    for (const s of this.shots) {
      s.f++;
      if (s.home && s.tgt && !s.tgt.dead && !s.tgt.carried && s.n > 2) {
        const p = this.aimPoint({ x: s.x, y: s.y }, s.tgt);
        const sp = Math.hypot(s.vx, s.vy), L = Math.hypot(p.x - s.x, p.y - s.y);
        if (L < 160) {
          const k = 0.12;
          s.vx += ((p.x - s.x) / L * sp - s.vx) * k; s.vy += ((p.y - s.y) / L * sp - s.vy) * k;
          s.n = Math.max(1, Math.ceil(L / sp)); s.ex = p.x; s.ey = p.y;
          s.dir = rtsDir8(s.vx, s.vy);
        }
      }
      s.x += s.vx; s.y += s.vy; s.n--;
      if (s.sonic) this.sonicTick(s);
      if (s.k === 'rocket' || s.k === 'missile') { if (s.f % 4 === 0) this.addFx('smoke', s.x, s.y, 0, 0, true); }
      if (s.n <= 0) this.impact(s); else out.push(s);
    }
    this.shots = out;
  },
  // the sonic wave hurts everything it passes through, once each (friend and foe; not the tank that fired it)
  sonicTick(s) {
    this.unitsNear(s.x, s.y, 10, v => {
      if (v === s.src || s.hits.has(v.id) || v.d.cls === 'air') return;
      s.hits.add(v.id);
      this.damage(v, s.dmg, 'sonic', s.h, s.src);
    });
    const tx = (s.x / 16) | 0, ty = (s.y / 16) | 0;
    if (this.inMap(tx, ty)) {
      const b = this.bAt[ty * this.W + tx];
      if (b && !s.hits.has(b.id)) { s.hits.add(b.id); this.damage(b, s.dmg, 'sonic', s.h, s.src); }
    }
    if (s.f % 3 === 0) this.addFx('sonicWave', s.x, s.y, 0, s.dir, true);
  },
  impact(s) {
    const x = s.home ? s.x : s.ex, y = s.home ? s.y : s.ey;
    if (s.k === 'doomfist') { this.doomfistBlast(s, x, y); return; }
    if (s.sonic) return;
    const t = s.tgt;
    let hit = null;
    if (t && !t.dead && !t.carried) {
      if (t.isB) { if (x >= t.x * 16 - 4 && x <= (t.x + t.w) * 16 + 4 && y >= t.y * 16 - 4 && y <= (t.y + t.hh) * 16 + 4) hit = t; }
      else if (Math.hypot(t.x - x, t.y - (t.alt ? 6 : 0) - y) <= 9 + s.splash * 0.4) hit = t;
    }
    if (!hit && !s.air) {   // a miss lands on whatever is there
      const tx = (x / 16) | 0, ty = (y / 16) | 0;
      if (this.inMap(tx, ty)) {
        const b = this.bAt[ty * this.W + tx];
        if (b && b.h !== s.h) hit = b;
      }
    }
    if (hit) this.damage(hit, s.dmg, s.wc, s.h, s.src);
    if (s.convert && hit && hit.isU && hit.d.cls === 'veh' && !hit.dead && this.isEnemy(s.h, hit.h)) this.convertUnit(hit, s.h, s.convert);
    if (s.splash) this.splashDamage(x, y, s.splash, s.dmg * 0.5, s.wc, s.h, hit, hit && hit.isB ? hit : null, s.src);
    // what it looks like, and what it does to the ground
    const fxk = s.k === 'bullet' ? 'hit' : s.k === 'gas' ? 'gasCloud' : s.k === 'shell' && !s.splash ? 'hit' : 'boom';
    this.addFx(fxk, x, y);
    if (!s.air) this.groundHit(x, y, s);
    this.wormHit(x, y, s.dmg, s.h);
  },
  groundHit(x, y, s) {
    const tx = (x / 16) | 0, ty = (y / 16) | 0;
    if (!this.inMap(tx, ty)) return;
    const i = ty * this.W + tx, k = this.map.t[i];
    if (k === RTS_T.BLOOM) { this.burstBloom(i, s.h); return; }
    if (this.bAt[i]) return;
    const big = s.wc === 'heavy' || s.wc === 'plasma' || s.wc === 'blast' || (s.wc === 'rocket' && s.splash);
    if (big && this.rnd() < 0.3) {
      if (k === RTS_T.SAND || k === RTS_T.DUNES) this.setTile(i, RTS_T.CRATER_S);
      else if (k === RTS_T.ROCK) this.setTile(i, RTS_T.CRATER_R);
    }
    if (RTS_ON_SAND[k] && s.wc !== 'bullet') this.addFx('sand', x, y);
  },
  // damage to a unit or a building, by weapon class
  damage(t, dmg, wc, byHouse, src) {
    if (!t || t.dead) return;
    if (t.isB) {
      const arm = t.d.armor || 'bld';
      this.hurtBuilding(t, dmg * ((RTS_ARMOR[wc] || {})[arm] ?? 1), byHouse);
      return;
    }
    if (t.carried || t.d.untargetable) return;
    const mod = (RTS_ARMOR[wc] || {})[t.d.armor];
    const d = dmg * (mod === undefined ? 1 : mod);
    if (d <= 0) return;
    t.hp -= d; t.flash = 4; t.hitT = this.frame;
    if (src && !src.dead && (src.isU || src.isB) && src.h !== t.h) t.hitBy = src;
    const Hs = this.houses[t.h];
    if (Hs) Hs.lastHit = this.frame;
    if (t.h === this.player || byHouse === this.player) this.battle();
    if (t.h === this.player && byHouse && this.isEnemy(byHouse, t.h)) {
      if (t.d.harvester) this.say(null, 'harvesterAttacked', 900);
      else this.say(null, 'underAttack', 900);
    }
    if (t.hp <= 0) this.killUnit(t, byHouse, wc === 'sonic' ? 'sonic' : null);
  },
  splashDamage(x, y, r, dmg, wc, byHouse, skip, skipB, src) {
    if (r <= 0) return;
    this.unitsNear(x, y, r + 6, (v, d2) => {
      if (v === skip || (v.d.cls === 'air' && wc !== 'blast')) return;
      const k = 1 - Math.sqrt(d2) / (r + 6) * 0.7;
      this.damage(v, dmg * k, wc, byHouse, src);
    });
    for (const b of this.buildings.slice()) {
      if (b === skipB || b.dead) continue;
      if (this.dist({ x, y }, b) > r) continue;
      this.damage(b, dmg * 0.6, wc, byHouse, src);
    }
  },
  killUnit(u, byHouse, how) {
    if (u.dead) return;
    u.dead = true; u.hp = 0;
    if (!u.carried) this.unoccupy(u);
    if (u.docked) { u.docked.busy = null; u.docked = null; }
    if (u.harvTile >= 0 && this.harvRes[u.harvTile] === u.id) this.harvRes[u.harvTile] = 0;
    if (u.lift && !u.lift.dead) u.lift.job = null;
    if (u.job && u.job.unit && !u.job.unit.dead && u.job.unit.carried === u) this.killUnit(u.job.unit, byHouse, 'fell');
    if (u.job && u.job.unit) u.job.unit.lift = null;
    const Hs = this.houses[u.h], By = this.houses[byHouse];
    if (Hs) { Hs.stats.unitsLost++; const k = Hs.units.indexOf(u); if (k >= 0) Hs.units.splice(k, 1); }
    if (By && By !== Hs && u.d.cost) By.stats.unitsKilled++;
    if (u.conv && this.houses[u.conv.orig]) {   // a converted unit counts against its own House
      const O = this.houses[u.conv.orig];
      O.stats.unitsLost++;
    }
    this.byId.delete(u.id);
    if (how === 'eaten' || how === 'entered') return;
    if (u.d.cls === 'inf') {
      this.corpses.push({ key: u.key, h: u.h, x: u.x, y: u.y, f: 0, t: 0, crushed: how === 'crushed' });
      if (how !== 'crushed') this.sfx('playerDie', u.x, u.y, 10);
    } else {
      this.addFx(u.d.big ? 'bigboom' : 'boom', u.x, u.y - (u.alt ? 8 : 0));
      if (u.d.cls !== 'air' || u.key !== 'frigate') this.wrecks.push({ key: u.key, h: u.h, x: u.x, y: u.y, t: 0, life: 420 + ((this.rnd() * 200) | 0), dir: u.dir });
      this.sfx('explode', u.x, u.y);
      if (u.d.selfDestruct && how !== 'boom') this.selfDestructBlast(u, true);
      if (u.d.harvester && u.cargo > 50) this.spill(u.tx, u.ty, u.cargo);
      if (u.d.cls === 'veh' && this.rnd() < 0.25) {
        const i = u.ty * this.W + u.tx, k = this.map.t[i];
        if (k === RTS_T.SAND) this.setTile(i, RTS_T.CRATER_S);
      }
    }
  },
  // a harvester's load back into the sand
  spill(tx, ty, amount) {
    const g = this.map.g;
    for (let k = 0; k < 9 && amount > 0; k++) {
      const x = tx + (k % 3) - 1, y = ty + ((k / 3) | 0) - 1;
      if (!this.inMap(x, y)) continue;
      const i = y * this.W + x, t = this.map.t[i];
      if (!RTS_ON_SAND[t] || t === RTS_T.BLOOM || this.bAt[i]) continue;
      const a = Math.min(amount, 80);
      amount -= a; g[i] = Math.min(400, g[i] + a);
      this.setTile(i, g[i] > 100 ? RTS_T.THICK : RTS_T.GLIM);
    }
  },
  convertUnit(v, h, frames) {
    if (v.conv && v.conv.orig === h) { this.unconvert(v); return; }
    if (!v.conv) v.conv = { orig: v.h, t: frames }; else v.conv.t = frames;
    this.moveHouse(v, h);
    v.order = { k: 'idle' }; v.tgt = null; v.path = null; v.wantPath = null; v.hitBy = null;
    if (v.docked) { v.docked.busy = null; v.docked = null; }
    this.addFx('gasCloud', v.x, v.y);
    if (v.h === this.player) this.say('ENEMY ' + v.d.name + ' TURNED TO OUR SIDE');
    else if (v.conv.orig === this.player) this.say('OUR ' + v.d.name + ' HAS BEEN TURNED!', 'underAttack', 300);
    if (this.onConvert) this.onConvert(v);
  },
  unconvert(v) {
    const o = v.conv.orig;
    v.conv = null;
    this.moveHouse(v, o);
    v.order = { k: 'idle' }; v.tgt = null; v.path = null; v.hitBy = null;
    if (this.onConvert) this.onConvert(v);
  },
  selfDestructBlast(u, already) {
    this.addFx('bigboom', u.x, u.y);
    for (let k = 0; k < 6; k++) this.addFx('boom', u.x + (this.rnd() - 0.5) * 40, u.y + (this.rnd() - 0.5) * 40, (this.rnd() * 16) | 0);
    this.sfx('baseDie', u.x, u.y, 0);
    const w = RTS_WEAPONS.selfdestruct;
    if (!already) this.killUnit(u, u.h, 'boom');
    this.splashDamage(u.x, u.y, w.splash * 16, w.dmg, w.cls, u.h, u, null, null);
    const i = u.ty * this.W + u.tx;
    if (!this.bAt[i]) this.setTile(i, RTS_ON_SAND[this.map.t[i]] ? RTS_T.CRATER_S : RTS_T.CRATER_R);
  },

  // ================================================================ harvesting
  harvestTick(u) {
    const W = this.W, g = this.map.g, cap = u.d.cap || 700;
    if (u.lift) { u.path = null; return; }   // a skylifter is on its way
    switch (u.hs) {
      case 'seek': default: {
        if (u.cargo >= cap) { u.hs = 'back'; return; }
        if (u.wantPath || (this.frame + u.id) % 20) return;
        const o = u.order, hint = o.x !== undefined && this.inMap(o.x, o.y) ? { x: o.x, y: o.y } : null;
        const from = hint ? this.nearestPassable('track', hint.x, hint.y, hint.x, hint.y) || { x: u.tx, y: u.ty } : { x: u.tx, y: u.ty };
        const res = this.harvRes, me = u.id;
        const i = this.bfs('track', from.x, from.y, c => g[c] > 0 && this.map.t[c] !== RTS_T.BLOOM && (!res[c] || res[c] === me || !this.byId.has(res[c])) && (!this.vAt[c] || this.vAt[c] === u), 6000);
        if (i === null) {
          if (u.cargo > 0) { u.hs = 'back'; return; }
          if (!u.noGlim && u.h === this.player) this.say('NO GLIMMER IN REACH', null, 1200);
          u.noGlim = true;
          return;
        }
        u.noGlim = false;
        o.x = undefined;
        this.reserveGlim(u, i);
        const tx = i % W, ty = (i / W) | 0;
        if (Math.abs(tx - u.tx) + Math.abs(ty - u.ty) > 16 && this.callLifter(u, { x: tx, y: ty }, 'field')) return;
        this.requestPath(u, tx, ty);
        u.hs = 'go';
        return;
      }
      case 'go': {
        const i = u.harvTile;
        if (i < 0 || !(g[i] > 0)) { u.hs = 'seek'; return; }
        if (u.tx === i % W && u.ty === ((i / W) | 0) && !u.mv) { u.hs = 'dig'; u.path = null; return; }
        if (!u.path && !u.mv && !u.wantPath) {
          if ((u.tries = (u.tries || 0) + 1) > 3) { u.tries = 0; this.harvRes[i] = 0; u.harvTile = -1; u.hs = 'seek'; return; }
          this.requestPath(u, i % W, (i / W) | 0);
        }
        return;
      }
      case 'dig': {
        const i = u.ty * W + u.tx;
        u.noiseT = this.frame;
        if (!(g[i] > 0)) {
          // the next glimmer tile next door, else look further
          for (let d = 0; d < 8; d++) {
            const nx = u.tx + RTS_DX8[(d + u.dir) % 8], ny = u.ty + RTS_DY8[(d + u.dir) % 8];
            if (!this.inMap(nx, ny)) continue;
            const n = ny * W + nx;
            if (g[n] > 0 && this.map.t[n] !== RTS_T.BLOOM && !this.vAt[n] && (!this.harvRes[n] || this.harvRes[n] === u.id) && this.passStatic('track', n)) {
              this.reserveGlim(u, n); u.path = [n]; u.pi = 0; u.goal = { x: nx, y: ny }; u.hs = 'go';
              return;
            }
          }
          u.hs = 'seek';
          return;
        }
        if (u.anim % 3 === 0) {
          const take = Math.min(g[i], 2, cap - u.cargo);
          g[i] -= take; u.cargo += take;
          const k = this.map.t[i];
          if (g[i] <= 0) { g[i] = 0; this.setTile(i, RTS_T.SAND); }
          else if (k === RTS_T.THICK && g[i] <= 100) this.setTile(i, RTS_T.GLIM);
        }
        if (u.cargo >= cap) { u.hs = 'back'; if (this.harvRes[i] === u.id) this.harvRes[i] = 0; }
        return;
      }
      case 'back': case 'wait': {
        const ref = this.nearestRefinery(u);
        if (!ref) { if (u.hs !== 'wait' && u.h === this.player) this.say('NO REFINERY FOR THE HARVESTER', null, 1200); u.hs = 'wait'; return; }
        u.hs = 'back';
        if (this.adjacent(u, ref)) {
          if (!u.mv && (!ref.busy || ref.busy === u || ref.busy.dead)) {
            ref.busy = u; u.docked = ref; u.path = null; u.wantPath = null; u.dockT = 0;
            u.dir = rtsDir8(ref.cx - u.x, ref.cy - u.y);
          }
          return;
        }
        if (!u.path && !u.mv && !u.wantPath) {
          const far = Math.abs(ref.cx / 16 - u.tx) + Math.abs(ref.cy / 16 - u.ty);
          if (far > 14 && u.cargo > 0 && this.callLifter(u, { x: ref.x + 1, y: ref.y + ref.hh }, 'home', ref)) return;
          // as near as a free tile beside it (others wait their turn there)
          const spot = this.besideSpot(u, ref);
          if (spot) this.requestPath(u, spot.x, spot.y);
        }
        return;
      }
    }
  },
  reserveGlim(u, i) {
    if (u.harvTile >= 0 && this.harvRes[u.harvTile] === u.id) this.harvRes[u.harvTile] = 0;
    u.harvTile = i; this.harvRes[i] = u.id;
  },
  nearestRefinery(u) {
    let best = null, bd = 1e18;
    for (const b of this.houses[u.h].buildings) {
      if (b.key !== 'refinery' || b.rise < 1) continue;
      const d = (b.cx - u.x) ** 2 + (b.cy - u.y) ** 2 + (b.busy && b.busy !== u ? 40000 : 0);
      if (d < bd) { bd = d; best = b; }
    }
    return best;
  },
  adjacent(u, b) { return u.tx >= b.x - 1 && u.tx <= b.x + b.w && u.ty >= b.y - 1 && u.ty <= b.y + b.hh; },
  // a free tile next to building b for unit u, nearest to u (its own tile if it's there already)
  besideSpot(u, b) {
    let best = null, bd = 1e9;
    for (let y = b.y - 1; y <= b.y + b.hh; y++) for (let x = b.x - 1; x <= b.x + b.w; x++) {
      if (!this.inMap(x, y) || (x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.hh)) continue;
      const i = y * this.W + x;
      if (!this.passStatic(u.d.move, i)) continue;
      const v = this.vAt[i];
      const dd = (x - u.tx) ** 2 + (y - u.ty) ** 2 + (v && v !== u ? 30 : 0) + (y === b.y + b.hh ? 0 : 2);
      if (dd < bd) { bd = dd; best = { x, y }; }
    }
    return best || { x: b.x + (b.w >> 1), y: b.y + b.hh };
  },
  // docked: unloading at a refinery, or being mended on a repair pad
  dockTick(u) {
    const b = u.docked;
    if (!b || b.dead) { u.docked = null; return; }
    const Hs = this.houses[u.h];
    if (b.key === 'refinery') {
      b.working = 8;
      if (u.anim % 2) return;
      const a = Math.min(u.cargo, 7);
      u.cargo -= a;
      this.addCredits(Hs, a);
      if (u.cargo <= 0) {
        u.cargo = 0; b.busy = null; u.docked = null; u.hs = 'seek';
        if (u.order.k !== 'harvest') u.order = { k: 'harvest' };
      }
    } else if (b.d.repairPad) {
      b.working = 8;
      if (u.anim % 3) return;
      if (u.hp >= u.max) { b.busy = null; u.docked = null; u.order = { k: 'idle' }; if (u.d.harvester) this.cmdHarvest(u); if (u.h === this.player) this.say(u.d.name + ' REPAIRED'); return; }
      const cost = Math.max(0.3, (u.d.cost || 300) / u.max * 0.5);
      if (Hs.credits < cost) { if (Hs.human) this.say(null, 'insufficient', 600); return; }
      Hs.credits -= cost; u.hp = Math.min(u.max, u.hp + 1);
    } else { b.busy = null; u.docked = null; }
  },
  // glimmer unloaded: credits up to the storage, the rest is lost
  addCredits(Hs, a) {
    Hs.stats.harvested += a;
    const room = Math.max(0, Hs.storage - Hs.credits);
    const keep = Math.min(a, room);
    Hs.credits += keep;
    if (keep < a && Hs.human) this.say('GLIMMER LOST: BUILD MORE SILOS', null, 900);
  },
  repairTick(u) {
    const o = u.order;
    let pad = o.b && !o.b.dead && o.b.h === u.h ? o.b : null;
    if (!pad) {
      let bd = 1e18;
      for (const b of this.houses[u.h].buildings) if (b.d.repairPad && b.rise >= 1) { const d = (b.cx - u.x) ** 2 + (b.cy - u.y) ** 2; if (d < bd) { bd = d; pad = b; } }
      if (!pad) { if (u.h === this.player) this.say('NO REPAIR PAD'); u.order = { k: 'idle' }; return; }
      o.b = pad;
    }
    if (u.hp >= u.max) { u.order = { k: 'idle' }; return; }
    if (this.adjacent(u, pad) && !u.mv) {
      if (!pad.busy || pad.busy === u || pad.busy.dead) { pad.busy = u; u.docked = pad; u.path = null; }
      return;
    }
    if (!u.path && !u.mv && !u.wantPath) {
      const s = this.besideSpot(u, pad);
      this.requestPath(u, s.x, s.y);
    }
  },
  // capture or sabotage: walk up to the building and go in
  enterTick(u) {
    const o = u.order, b = o.b;
    if (!b || b.dead || !this.isEnemy(u.h, b.h)) { u.order = { k: 'idle' }; return; }
    if (this.adjacent(u, b) && !u.mv) {
      if (o.k === 'sabotage') {
        const w = RTS_WEAPONS.sabotage;
        this.addFx('bigboom', b.cx, b.cy);
        this.killUnit(u, u.h, 'entered');
        this.damage(b, w.dmg, w.cls, u.h, null);
        this.splashDamage(b.cx, b.cy, w.splash * 16, 60, w.cls, u.h, null, b, null);
        this.sfx('baseDie', b.cx, b.cy, 0);
        if (u.h === this.player) this.say('SABOTAGE!');
        return;
      }
      this.killUnit(u, u.h, 'entered');
      if (b.hp <= b.max * 0.5 && !b.d.wall) this.captureBuilding(b, u.h);
      else this.damage(b, 30 + u.hp * 1.5, 'blast', u.h, null);
      return;
    }
    if (!u.path && !u.mv && !u.wantPath) {
      const s = this.besideSpot(u, b);
      if ((o.tries = (o.tries || 0) + 1) > 6) { u.order = { k: 'idle' }; return; }
      this.requestPath(u, s.x, s.y);
    }
  },
  captureBuilding(b, h) {
    const A = this.houses[b.h], B = this.houses[h];
    if (!B || A === B) return;
    const k = A.buildings.indexOf(b);
    if (k >= 0) A.buildings.splice(k, 1);
    A.count[b.key] = Math.max(0, (A.count[b.key] || 1) - 1);
    B.buildings.push(b); B.count[b.key] = (B.count[b.key] || 0) + 1;
    b.h = h; b.repairing = false; b.primary = false; b.rally = null; b.tgt = null;
    if (b.busy) { b.busy.docked = null; b.busy = null; }
    this.recalcHouse(A); this.recalcHouse(B);
    this.reveal(B, b.x + (b.w >> 1), b.y + (b.hh >> 1), (b.d.sight || 2) + 1);
    if (h === this.player) this.say(b.d.name + ' CAPTURED');
    else if (A.id === this.player) this.say('WE LOST THE ' + b.d.name, 'baseUnderAttack');
    A.stats.buildingsLost++; B.stats.buildingsKilled++;
    if (this.onBuildingGone) this.onBuildingGone(b);
  },

  // ================================================================ aircraft
  // a free skylifter of the House takes u to dest (kind: 'home' to a refinery, 'field', 'repair'); false if none
  callLifter(u, dest, kind, b) {
    const Hs = this.houses[u.h];
    let best = null, bd = 1e18;
    for (const a of Hs.units) {
      if (a.dead || !a.d.lifter || a.job) continue;
      const d = (a.x - u.x) ** 2 + (a.y - u.y) ** 2;
      if (d < bd) { bd = d; best = a; }
    }
    if (!best) return false;
    best.job = { kind, unit: u, dest, b, phase: 'fetch', t: 0 };
    u.lift = best; u.path = null; u.wantPath = null;
    return true;
  },
  // fly toward (x, y): heading turns at the unit's rate; returns the distance left
  flyTo(u, x, y, stopAt) {
    const dx = x - u.x, dy = y - u.y, L = Math.hypot(dx, dy);
    const want = Math.atan2(dy, dx);
    let da = want - u.ang;
    while (da > Math.PI) da -= Math.PI * 2;
    while (da < -Math.PI) da += Math.PI * 2;
    const tr = 0.06 * (3 / Math.max(1, u.d.turn));
    u.ang += Math.max(-tr, Math.min(tr, da));
    let sp = u.d.speed * RTS_SPEED;
    if (stopAt !== undefined && L < 24) sp *= Math.max(0.15, L / 24);
    if (stopAt !== undefined && L <= stopAt) { u.x += dx * 0.2; u.y += dy * 0.2; }
    else { u.x += Math.cos(u.ang) * sp; u.y += Math.sin(u.ang) * sp; }
    u.dir = rtsDir8(Math.cos(u.ang), Math.sin(u.ang)); u.tdir = u.dir;
    const tx = Math.max(0, Math.min(this.W - 1, (u.x / 16) | 0)), ty = Math.max(0, Math.min(this.H - 1, (u.y / 16) | 0));
    if (tx !== u.tx || ty !== u.ty) { u.tx = tx; u.ty = ty; if (u.d.sight) this.reveal(this.houses[u.h], tx, ty, u.d.sight); }
    return L;
  },
  airTick(u) {
    if (u.key === 'frigate') { this.frigateTick(u); return; }
    if (u.d.lifter) { this.lifterTick(u); return; }
    // the gunwing: passes over its target firing rockets, turns, comes again
    const o = u.order, w = u.d.wpn ? RTS_WEAPONS[u.d.wpn] : null;
    let t = null;
    if (o.k === 'attack' && this.validTarget(u, o.t, true)) t = o.t;
    else if (o.k === 'attack') u.order = { k: 'idle' };
    if (!t && w && (o.k === 'hunt' || o.k === 'amove' || o.k === 'idle' || o.k === 'guard')) {
      if (u.tgt && !this.validTarget(u, u.tgt)) u.tgt = null;
      if (!u.tgt && (this.frame + u.scanT) % 20 === 0) u.tgt = o.k === 'hunt' ? this.scan(u, 8, false) || this.nearestEnemy(u) : this.scan(u, (u.d.sight || 5) + 1, false);
      t = u.tgt;
    }
    if (t) {
      const p = this.aimPoint(u, t);
      if (u.pass > 0) { u.pass--; this.flyTo(u, u.x + Math.cos(u.ang) * 40, u.y + Math.sin(u.ang) * 40); }
      else {
        const L = this.flyTo(u, p.x, p.y);
        const da = Math.abs(((Math.atan2(p.y - u.y, p.x - u.x) - u.ang + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
        if (w && L <= w.range * 16 && da < 0.5 && u.cd <= 0) this.fire(u, t, w);
        if (L < 14) u.pass = 40;
      }
      return;
    }
    // no target: to the point it was sent, then circle there (home: its factory)
    let hx, hy;
    if (o.k === 'move' || o.k === 'amove' || o.k === 'guard') { hx = (o.x === undefined ? u.tx : o.x) * 16 + 8; hy = (o.y === undefined ? u.ty : o.y) * 16 + 8; }
    else { const home = this.homeOf(u); hx = home.x; hy = home.y; }
    const L = Math.hypot(hx - u.x, hy - u.y);
    if (L > 30) this.flyTo(u, hx, hy);
    else { u.ang += 0.03; u.x += Math.cos(u.ang) * u.d.speed * 0.6; u.y += Math.sin(u.ang) * u.d.speed * 0.6; u.dir = rtsDir8(Math.cos(u.ang), Math.sin(u.ang)); }
  },
  homeOf(u) {
    const Hs = this.houses[u.h];
    const b = Hs.buildings.find(q => q.key === 'hightech') || Hs.buildings.find(q => q.key === 'yard') || Hs.buildings[0];
    if (b) return { x: b.cx, y: b.cy - 12 };
    return { x: Hs.start.x * 16 + 8, y: Hs.start.y * 16 + 8 };
  },
  lifterTick(u) {
    const j = u.job;
    if (!j) {
      // look for work now and then: damaged units to the repair pad
      if ((this.frame + u.id) % 60 === 0) this.lifterFindJob(u);
      const home = this.homeOf(u), L = Math.hypot(home.x - u.x, home.y - u.y);
      if (L > 24) this.flyTo(u, home.x, home.y); else { u.ang += 0.02; u.x += Math.cos(u.ang) * 0.3; u.y += Math.sin(u.ang) * 0.3; }
      return;
    }
    const v = j.unit;
    if (!v || v.dead) { if (v && v.carried === u) v.carried = null; u.job = null; return; }
    if (j.phase === 'fetch') {
      const L = this.flyTo(u, v.x, v.y, 3);
      if (L < 6 && !v.mv) {
        // pick it up
        this.unoccupy(v);
        v.carried = u; v.path = null; v.wantPath = null; v.mv = null;
        if (v.docked) { v.docked.busy = null; v.docked = null; }
        j.phase = 'carry';
      } else if (v.mv === null && v.path) { v.path = null; }
      return;
    }
    // carrying: to the drop point
    const dx = j.dest.x * 16 + 8, dy = j.dest.y * 16 + 8;
    const L = this.flyTo(u, dx, dy, 3);
    v.x = u.x; v.y = u.y; v.dir = u.dir;
    if (L < 6) {
      const p = this.findFree(v.d, j.dest.x, j.dest.y, 5, null, v);
      if (!p) return;   // hover until there's room
      v.carried = null; v.lift = null; u.job = null;
      v.tx = p.x; v.ty = p.y; v.x = p.x * 16 + 8; v.y = p.y * 16 + 8; v.mv = null;
      v.slot = this.occupy(v, p.y * this.W + p.x);
      this.reveal(this.houses[v.h], p.x, p.y, v.d.sight || 1);
      if (j.kind === 'field') { v.hs = 'go'; this.requestPath(v, j.dest.x, j.dest.y); }
      else if (j.kind === 'home') v.hs = 'back';
      else if (j.kind === 'repair') v.order = { k: 'repair', b: j.b };
    }
  },
  lifterFindJob(u) {
    const Hs = this.houses[u.h];
    if (!Hs.buildings.some(b => b.d.repairPad)) return;
    for (const v of Hs.units) {
      if (v.dead || v.d.cls !== 'veh' || v.lift || v.docked || v.carried || v.hp > v.max * 0.45) continue;
      if (v.order.k !== 'idle' && v.order.k !== 'guard' && !(v.d.harvester && v.hs === 'seek')) continue;
      if (this.frame - v.hitT < 120) continue;
      const pad = Hs.buildings.find(b => b.d.repairPad);
      u.job = { kind: 'repair', unit: v, dest: this.besideSpot(v, pad), b: pad, phase: 'fetch' };
      v.lift = u; v.path = null;
      if (v.d.harvester) v.order = { k: 'repair', b: pad };
      return;
    }
  },
  // a frigate: in from the map's edge to the drop point, down, the cargo out, away again
  launchFrigate(Hs, port, keys, o) {
    o = o || {};
    const to = port ? { x: port.x + 1, y: port.y + 1 } : o.to;
    const from = o.from || { x: to.x < this.W / 2 ? -2 : this.W + 1, y: Math.max(0, to.y - 6) };
    const u = this.newUnit(Hs, 'frigate', Math.max(0, Math.min(this.W - 1, from.x)), Math.max(0, Math.min(this.H - 1, from.y)));
    u.x = from.x * 16 + 8; u.y = from.y * 16 + 8; u.alt = 1;
    u.ang = Math.atan2(to.y - from.y, to.x - from.x);
    u.job = { kind: 'frigate', keys: keys.slice(), port, to, from, phase: 'in', t: 0 };
    this.units.push(u); Hs.units.push(u); this.byId.set(u.id, u);
    return u;
  },
  frigateTick(u) {
    const j = u.job, Hs = this.houses[u.h];
    if (j.phase === 'in') {
      const L = this.flyTo(u, j.to.x * 16 + 8, j.to.y * 16 + 8, 2);
      if (L < 4) { j.phase = 'land'; j.t = 0; }
    } else if (j.phase === 'land') {
      j.t++;
      u.alt = Math.max(0.2, 1 - j.t / 40);
      if (j.t === 50) {
        for (const k of j.keys) {
          const nu = j.port && !j.port.dead ? this.spawnBeside(Hs, k, j.port) : this.spawnUnitNear(Hs, k, j.to.x, j.to.y + 1, 6);
          if (!nu) continue;
          if (nu.d.harvester) this.cmdHarvest(nu);
          else if (!Hs.human) this.cmdGuard(nu);
          if (j.port && j.port.rally && !nu.d.harvester) this.cmdMove(nu, j.port.rally.x, j.port.rally.y);
        }
        if (Hs.port && Hs.port.frigate === u) Hs.port.frigate = null;
        if (Hs.human) this.say('FRIGATE HAS DELIVERED', 'unitReady');
      }
      if (j.t >= 80) { j.phase = 'out'; u.alt = 1; }
    } else {
      const ex = j.from.x * 16 + 8, ey = j.from.y * 16 + 8;
      const L = this.flyTo(u, ex, ey);
      if (L < 20 || u.x < -40 || u.y < -40 || u.x > this.W * 16 + 40 || u.y > this.H * 16 + 40) {
        u.dead = true;
        const k = Hs.units.indexOf(u);
        if (k >= 0) Hs.units.splice(k, 1);
        this.byId.delete(u.id);
        if (Hs.port && Hs.port.frigate === u) Hs.port.frigate = null;
      }
    }
  },
  // the DOOMFIST: up from the palace and down anywhere, not very accurately
  launchDoomfist(Hs, pal, tx, ty) {
    const sp = RTS_WEAPONS.doomfist.spread;
    const ex = (tx + (this.rnd() * 2 - 1) * sp) * 16 + 8, ey = (ty + (this.rnd() * 2 - 1) * sp) * 16 + 8;
    const sx = pal.cx, sy = pal.cy - 12;
    const L = Math.hypot(ex - sx, ey - sy), n = Math.max(60, Math.ceil(L / RTS_WEAPONS.doomfist.speed));
    this.shots.push({ k: 'doomfist', wc: 'blast', x: sx, y: sy, sx, sy, ex, ey, vx: (ex - sx) / n, vy: (ey - sy) / n, n, n0: n, dmg: RTS_WEAPONS.doomfist.dmg,
      h: Hs.id, src: pal, tgt: null, splash: RTS_WEAPONS.doomfist.splash * 16, dir: rtsDir8(ex - sx, ey - sy), f: 0, arc: Math.min(120, L * 0.35) });
    this.sfx('missile', sx, sy, 0);
  },
  doomfistBlast(s, x, y) {
    this.addFx('bigboom', x, y);
    for (let k = 0; k < 10; k++) this.addFx(k % 3 ? 'boom' : 'bigboom', x + (this.rnd() - 0.5) * 70, y + (this.rnd() - 0.5) * 70, (this.rnd() * 30) | 0);
    for (let k = 0; k < 5; k++) this.addFx('fire', x + (this.rnd() - 0.5) * 50, y + (this.rnd() - 0.5) * 50, 20 + ((this.rnd() * 30) | 0));
    this.sfx('baseDie', x, y, 0);
    this.splashDamage(x, y, s.splash, s.dmg, 'blast', s.h, null, null, null);
    const cx = (x / 16) | 0, cy = (y / 16) | 0;
    for (let yy = cy - 2; yy <= cy + 2; yy++) for (let xx = cx - 2; xx <= cx + 2; xx++) {
      if (!this.inMap(xx, yy) || this.rnd() < 0.4) continue;
      const i = yy * this.W + xx, k = this.map.t[i];
      if (this.bAt[i]) continue;
      if (k === RTS_T.SAND || k === RTS_T.DUNES) this.setTile(i, RTS_T.CRATER_S);
      else if (k === RTS_T.ROCK || k === RTS_T.CONC) this.setTile(i, RTS_T.CRATER_R);
      else if (k === RTS_T.BLOOM) this.burstBloom(i, s.h);
    }
    if (this.near(x, y)) this.shake = 20;
  },

  // ================================================================ effects
  addFx(kind, x, y, delay, dir, small) {
    if (this.fx.length > 400) return;
    this.fx.push({ k: kind, x, y, f: -(delay || 0), dir: dir || 0, small: !!small });
  },
  fxTick() {
    const out = [];
    for (const e of this.fx) {
      e.f++;
      const n = this.fxFrames(e.k) * (e.k === 'smoke' ? 6 : e.k === 'fire' ? 5 : 3);
      if (e.f < n) out.push(e);
    }
    this.fx = out;
    for (const w of this.wrecks) w.t++;
    this.wrecks = this.wrecks.filter(w => w.t < w.life);
    for (const c of this.corpses) c.t++;
    this.corpses = this.corpses.filter(c => c.t < 300);
    if (this.shake > 0) this.shake--;
  },
  fxFrames(k) {
    if (typeof RTS_FX_FRAMES !== 'undefined' && RTS_FX_FRAMES[k]) return RTS_FX_FRAMES[k];
    return { hit: 3, boom: 6, bigboom: 8, smoke: 5, fire: 6, sand: 4, muzzle: 2, gasCloud: 8, sonicWave: 4, glimmerBurst: 8 }[k] || 4;
  },
  // a sound, if it happens where the player is looking (each kind at most every few frames)
  sfx(name, x, y, gap) {
    if (typeof Sound === 'undefined' || (this.uiNear && !this.uiNear(x, y))) return;
    const k = 'sfx_' + name;
    if (this.stingT[k] !== undefined && this.frame - this.stingT[k] < (gap === undefined ? 5 : gap)) return;
    this.stingT[k] = this.frame;
    Sound.play(name);
  },

  // ================================================================ sandwyrms
  spawnWorm(delay) {
    this.worms.push({ id: this.nextId++, x: 0, y: 0, phase: 'away', t: delay, hp: 700, eaten: 0, dir: 0, prey: null, wx: 0, wy: 0, f: 0, said: -99999, full: 2 + ((this.rnd() * 3) | 0) });
  },
  onSand(x, y) {
    const tx = (x / 16) | 0, ty = (y / 16) | 0;
    return this.inMap(tx, ty) && RTS_ON_SAND[this.map.t[ty * this.W + tx]] && !this.bAt[ty * this.W + tx];
  },
  placeWorm(w) {
    for (let k = 0; k < 200; k++) {
      const x = 2 + ((this.rnd() * (this.W - 4)) | 0), y = 2 + ((this.rnd() * (this.H - 4)) | 0);
      let ok = true;
      for (let yy = y - 1; yy <= y + 1 && ok; yy++) for (let xx = x - 1; xx <= x + 1; xx++) if (!this.onSand(xx * 16 + 8, yy * 16 + 8)) { ok = false; break; }
      if (!ok) continue;
      // not right under someone's base, nor by a start
      const far = k < 150 ? 16 : 8;
      if (this.buildings.some(b => Math.abs(b.x - x) < far && Math.abs(b.y - y) < far)) continue;
      if (this.houseList.some(H => H.start && Math.abs(H.start.x - x) < far && Math.abs(H.start.y - y) < far)) continue;
      w.x = x * 16 + 8; w.y = y * 16 + 8; w.wx = w.x; w.wy = w.y;
      return true;
    }
    return false;
  },
  wormsTick() {
    for (const w of this.worms) {
      w.f++;
      switch (w.phase) {
        case 'away':
          if (--w.t <= 0) { if (this.placeWorm(w)) { w.phase = 'roam'; w.hp = 700; w.eaten = 0; w.full = 2 + ((this.rnd() * 3) | 0); } else w.t = 300; }
          break;
        case 'roam': case 'hunt': {
          // it hunts for a while, then loses interest and wanders for a while
          if (w.prey) { if (++w.huntT > 1500) { w.prey = null; w.phase = 'roam'; w.rest = 900; } }
          else if (w.rest > 0) w.rest--;
          if (w.f % 20 === 0 && !(w.rest > 0)) {
            const p = w.prey;
            if (!p || p.dead || p.carried || !this.onSand(p.x, p.y) || this.frame - p.noiseT > 240) { w.prey = this.wormPrey(w); w.phase = w.prey ? 'hunt' : 'roam'; if (w.prey && !p) w.huntT = 0; }
          }
          let tx, ty;
          if (w.prey) { tx = w.prey.x; ty = w.prey.y; }
          else {
            if (Math.hypot(w.wx - w.x, w.wy - w.y) < 8 || w.f % 900 === 0) {
              for (let k = 0; k < 20; k++) {
                const x = w.x + (this.rnd() - 0.5) * 320, y = w.y + (this.rnd() - 0.5) * 320;
                if (this.onSand(x, y)) { w.wx = x; w.wy = y; break; }
              }
            }
            tx = w.wx; ty = w.wy;
          }
          const L = Math.hypot(tx - w.x, ty - w.y);
          const sp = w.prey ? 0.5 : 0.3;
          if (L > 1) {
            const a0 = Math.atan2(ty - w.y, tx - w.x);
            let moved = false;
            for (const da of [0, 0.5, -0.5, 1, -1, 1.6, -1.6]) {
              const nx = w.x + Math.cos(a0 + da) * sp, ny = w.y + Math.sin(a0 + da) * sp;
              if (this.onSand(nx, ny)) { w.x = nx; w.y = ny; w.dir = rtsDir8(Math.cos(a0 + da), Math.sin(a0 + da)); moved = true; break; }
            }
            if (!moved) { w.prey = null; w.wx = w.x; w.wy = w.y; w.phase = 'roam'; }
          }
          if (w.prey && L < 5) { w.phase = 'rise'; w.t = 0; w.ex = w.prey.x; w.ey = w.prey.y; }
          // the player hears of it when it's near something of theirs
          if (this.frame - w.said > 2400 && w.f % 30 === 0) {
            const tx0 = (w.x / 16) | 0, ty0 = (w.y / 16) | 0;
            if (this.playerSees(tx0, ty0) && this.P.units.some(u => !u.dead && Math.abs(u.tx - tx0) < 10 && Math.abs(u.ty - ty0) < 10)) { w.said = this.frame; this.say(null, 'wormSign'); }
          }
          break;
        }
        case 'rise':
          w.t++;
          if (w.t === 16) this.wormEat(w);
          if (w.t >= 40) { w.phase = 'dive'; w.t = 0; }
          break;
        case 'dive':
          w.t++;
          if (w.t >= 30) {
            w.prey = null;
            if (w.eaten >= w.full || w.hp <= 0) { w.phase = 'away'; w.t = 3600 + ((this.rnd() * 3600) | 0); }
            else w.phase = 'roam';
          }
          break;
      }
    }
  },
  // the worm hunts the noisiest thing on the sand near it
  wormPrey(w) {
    let best = null, bs = 1e9;
    this.unitsNear(w.x, w.y, 16 * 14, (u, d2) => {
      if (u.d.cls === 'air' || u.docked || !this.onSand(u.x, u.y)) return;
      const noisy = this.frame - u.noiseT < 120;
      if (!noisy) return;
      const sc = Math.sqrt(d2) * (u.d.cls === 'inf' ? 1.6 : 1) * (u.d.harvester ? 0.7 : 1);
      if (sc < bs) { bs = sc; best = u; }
    });
    return best;
  },
  wormEat(w) {
    let n = 0;
    this.unitsNear(w.ex, w.ey, 13, u => {
      if (u.d.cls === 'air' || !this.onSand(u.x, u.y)) return;
      if (u.h === this.player) this.say(u.d.name + ' SWALLOWED BY A SANDWYRM');
      this.killUnit(u, null, 'eaten');
      n++;
    });
    w.eaten += n || 0.5;
    this.addFx('sand', w.ex, w.ey); this.addFx('sand', w.ex + 6, w.ey + 4, 4); this.addFx('sand', w.ex - 6, w.ey - 2, 8);
    this.sfx('chomp', w.ex, w.ey, 0);
  },
  // shots near a risen worm hurt it; enough and it dives away
  wormHit(x, y, dmg, h) {
    for (const w of this.worms) {
      if (w.phase !== 'rise' && w.phase !== 'dive') continue;
      if (Math.hypot(w.ex - x, w.ey - y) > 18) continue;
      w.hp -= dmg;
      if (w.hp <= 0 && w.phase === 'rise') { w.phase = 'dive'; w.t = 0; }
    }
  },

  // ================================================================ glimmer blooms
  burstBloom(i, byHouse) {
    const W = this.W, cx = i % W, cy = (i / W) | 0, g = this.map.g, t = this.map.t;
    this.setTile(i, RTS_T.THICK); g[i] = 250;
    for (let y = cy - 4; y <= cy + 4; y++) for (let x = cx - 4; x <= cx + 4; x++) {
      if (!this.inMap(x, y)) continue;
      const d = Math.hypot(x - cx, y - cy);
      if (d > 4.3) continue;
      const j = y * W + x, k = t[j];
      if (!RTS_ON_SAND[k] || k === RTS_T.BLOOM || this.bAt[j]) continue;
      g[j] = Math.min(400, g[j] + Math.round((40 + this.rnd() * 170) * (1 - d / 5.5)));
      if (g[j] > 0) this.setTile(j, g[j] > 100 ? RTS_T.THICK : RTS_T.GLIM);
    }
    this.map.blooms = this.map.blooms.filter(([bx, by]) => bx !== cx || by !== cy);
    this.addFx('glimmerBurst', cx * 16 + 8, cy * 16 + 8);
    this.sfx('explode', cx * 16 + 8, cy * 16 + 8, 0);
    this.splashDamage(cx * 16 + 8, cy * 16 + 8, 20, 45, 'blast', null, null, null, null);
    if (this.playerSees(cx, cy)) this.say('A GLIMMER BLOOM HAS BURST', null, 300);
  },
  // new blooms now and then on the open sand
  bloomTick() {
    if (--this.bloomT > 0) return;
    this.bloomT = 2400 + ((this.rnd() * 2400) | 0);
    const cap = Math.max(2, Math.round(this.N / 1200));
    if (this.map.blooms.length >= cap) return;
    for (let k = 0; k < 40; k++) {
      const x = (this.rnd() * this.W) | 0, y = (this.rnd() * this.H) | 0, i = y * this.W + x;
      if (this.map.t[i] !== RTS_T.SAND || this.vAt[i] || this.hasInf(i)) continue;
      this.setTile(i, RTS_T.BLOOM);
      this.map.blooms.push([x, y]);
      return;
    }
  },

  // ================================================================ the command API: unit orders
  // (each returns true if the order was taken; u must be alive and on the map)
  canOrder(u) { return !!(u && u.isU && !u.dead && !u.carried && u.key !== 'frigate'); },
  undock(u) { if (u.docked) { u.docked.busy = null; u.docked = null; } },
  cmdMove(u, tx, ty) {
    if (!this.canOrder(u)) return false;
    tx = Math.max(0, Math.min(this.W - 1, tx | 0)); ty = Math.max(0, Math.min(this.H - 1, ty | 0));
    this.undock(u);
    u.order = { k: 'move', x: tx, y: ty }; u.tgt = null;
    if (u.d.harvester) u.hs = null;
    if (u.d.cls !== 'air') this.requestPath(u, tx, ty);
    return true;
  },
  cmdAttack(u, t) {
    if (!this.canOrder(u) || !t) return false;
    if (u.d.saboteur && t.isB) return this.cmdSabotage(u, t);
    if (!u.d.wpn) return false;
    if (t.isU || t.isB) { if (t.dead || t === u) return false; }
    else t = { ground: true, x: Math.max(0, Math.min(this.W - 1, t.x | 0)), y: Math.max(0, Math.min(this.H - 1, t.y | 0)), cx: 0, cy: 0 };
    if (t.ground) { t.x = t.x * 16 + 8; t.y = t.y * 16 + 8; t.tx = (t.x / 16) | 0; t.ty = (t.y / 16) | 0; }
    this.undock(u);
    u.order = { k: 'attack', t }; u.tgt = t;
    if (u.d.harvester) u.hs = null;
    return true;
  },
  cmdAttackMove(u, tx, ty) {
    if (!this.canOrder(u)) return false;
    if (!u.d.wpn) return this.cmdMove(u, tx, ty);
    tx = Math.max(0, Math.min(this.W - 1, tx | 0)); ty = Math.max(0, Math.min(this.H - 1, ty | 0));
    this.undock(u);
    u.order = { k: 'amove', x: tx, y: ty }; u.tgt = null;
    if (u.d.cls !== 'air') this.requestPath(u, tx, ty);
    return true;
  },
  cmdGuard(u) {
    if (!this.canOrder(u)) return false;
    u.order = { k: 'guard', x: u.tx, y: u.ty }; u.tgt = null;
    if (u.path && !u.mv) u.path = null;
    if (u.d.harvester) u.hs = null;
    return true;
  },
  cmdStop(u) {
    if (!this.canOrder(u)) return false;
    u.order = { k: 'idle' }; u.tgt = null; u.wantPath = null;
    u.path = null;
    if (u.d.harvester) u.hs = null;
    return true;
  },
  cmdHunt(u) {
    if (!this.canOrder(u) || (!u.d.wpn && !u.d.saboteur)) return false;
    u.order = { k: 'hunt' }; u.tgt = null;
    return true;
  },
  cmdHarvest(u, tx, ty) {
    if (!this.canOrder(u) || !u.d.harvester) return false;
    this.undock(u);
    u.order = { k: 'harvest', x: tx, y: ty }; u.tgt = null;
    u.hs = u.cargo >= (u.d.cap || 700) ? 'back' : 'seek';
    if (u.harvTile === undefined) u.harvTile = -1;
    if (tx !== undefined) { u.path = null; u.hs = u.cargo >= (u.d.cap || 700) ? 'back' : 'seek'; }
    return true;
  },
  // a harvester heads home to unload; anything else falls back to the base
  cmdReturn(u) {
    if (!this.canOrder(u)) return false;
    if (u.d.harvester) { u.order = { k: 'harvest' }; u.hs = 'back'; if (u.harvTile === undefined) u.harvTile = -1; u.path = null; return true; }
    const Hs = this.houses[u.h], b = Hs.buildings.find(q => q.key === 'yard') || Hs.buildings[0];
    const home = b ? { x: b.x + (b.w >> 1), y: b.y + b.hh + 1 } : Hs.start;
    this.undock(u);
    u.order = { k: 'retreat', x: home.x, y: home.y }; u.tgt = null;
    if (u.d.cls !== 'air') this.requestPath(u, home.x, home.y);
    return true;
  },
  // an MCV unpacks into a construction yard where it stands (2x2 of clear rock with it in a corner); now=true
  // only tries (the order 'deploy' to a place calls it on arrival)
  cmdDeploy(u, now) {
    if (!this.canOrder(u) || !u.d.deploys || u.mv) return false;
    const key = u.d.deploys;
    for (const [ox, oy] of [[0, 0], [-1, 0], [0, -1], [-1, -1]]) {
      const x = u.tx + ox, y = u.ty + oy;
      if (!this.footFree(key, x, y, u, false)) continue;
      const Hs = this.houses[u.h];
      this.unoccupy(u);
      u.dead = true;
      const k = Hs.units.indexOf(u);
      if (k >= 0) Hs.units.splice(k, 1);
      this.byId.delete(u.id);
      const b = this.addBuilding(Hs, key, x, y, { whole: true });
      if (Hs.human) { this.say('CONSTRUCTION YARD DEPLOYED', 'built'); if (this.onDeployed) this.onDeployed(b); }
      return b;
    }
    if (this.houses[u.h].human && !now) this.say('CAN\'T DEPLOY: NEEDS 2X2 OF CLEAR ROCK', 'cantPlace', 60);
    return false;
  },
  // drive somewhere, then deploy there
  cmdDeployAt(u, tx, ty) {
    if (!this.canOrder(u) || !u.d.deploys) return false;
    u.order = { k: 'deploy', x: tx, y: ty };
    this.requestPath(u, tx, ty);
    return true;
  },
  cmdRepair(u, pad) {
    if (!this.canOrder(u) || u.d.cls === 'inf' || u.d.cls === 'air') return false;
    const Hs = this.houses[u.h];
    if (!Hs.buildings.some(b => b.d.repairPad)) return false;
    this.undock(u);
    u.order = { k: 'repair', b: pad && pad.d && pad.d.repairPad ? pad : null }; u.tgt = null;
    if (u.d.harvester) u.hs = null;
    u.path = null;
    return true;
  },
  cmdCapture(u, b) {
    if (!this.canOrder(u) || !u.d.capture || !b || !b.isB || b.dead || !this.isEnemy(u.h, b.h)) return false;
    u.order = { k: 'capture', b }; u.tgt = null; u.path = null;
    return true;
  },
  cmdSabotage(u, b) {
    if (!this.canOrder(u) || !u.d.saboteur || !b || !b.isB || b.dead || !this.isEnemy(u.h, b.h)) return false;
    u.order = { k: 'sabotage', b }; u.tgt = null; u.path = null;
    return true;
  },
  cmdSelfDestruct(u) {
    if (!this.canOrder(u) || !u.d.selfDestruct || u.order.k === 'boom') return false;
    u.order = { k: 'boom', t: 90 }; u.path = null; u.wantPath = null;
    if (u.h === this.player) this.say('JUGGERNAUT SELF-DESTRUCT IN 3 SECONDS');
    return true;
  },
  // a group to one place: each gets its own tile round the spot (infantry three to a tile)
  cmdMoveGroup(units, tx, ty, kind) {
    units = units.filter(u => this.canOrder(u));
    if (!units.length) return false;
    tx = Math.max(0, Math.min(this.W - 1, tx | 0)); ty = Math.max(0, Math.min(this.H - 1, ty | 0));
    if (units.length === 1) return kind === 'amove' ? this.cmdAttackMove(units[0], tx, ty) : this.cmdMove(units[0], tx, ty);
    const spots = [], used = new Map();
    const take = (u) => {
      for (let r = 0; r <= 8; r++) {
        let best = null, bd = 1e9;
        for (let y = ty - r; y <= ty + r; y++) for (let x = tx - r; x <= tx + r; x++) {
          if (Math.max(Math.abs(x - tx), Math.abs(y - ty)) !== r || !this.inMap(x, y)) continue;
          const i = y * this.W + x;
          if (u.d.cls !== 'air' && !this.passStatic(u.d.move, i)) continue;
          const n = used.get(i) || 0;
          if (n >= (u.d.cls === 'inf' ? 3 : 1)) continue;
          if (n && u.d.cls !== 'inf') continue;
          if (used.has(i) && used.get('c' + i) !== u.d.cls) continue;
          const dd = (x - tx) ** 2 + (y - ty) ** 2 + ((x - u.tx) ** 2 + (y - u.ty) ** 2) * 0.01;
          if (dd < bd) { bd = dd; best = i; }
        }
        if (best !== null) { used.set(best, (used.get(best) || 0) + 1); used.set('c' + best, u.d.cls); return best; }
      }
      return ty * this.W + tx;
    };
    const order = units.slice().sort((a, b) => ((a.tx - tx) ** 2 + (a.ty - ty) ** 2) - ((b.tx - tx) ** 2 + (b.ty - ty) ** 2));
    for (const u of order) {
      const i = take(u);
      spots.push(i);
      const x = i % this.W, y = (i / this.W) | 0;
      if (kind === 'amove') this.cmdAttackMove(u, x, y); else this.cmdMove(u, x, y);
    }
    return true;
  },
});
