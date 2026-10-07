'use strict';
// =====================================================================
//  Enemy personalities and path finding
//  In the original every enemy wanders at random. Here each tank gets a personality when it appears:
//    WANDER - the classic random drive
//    RUSH   - heads for the eagle along the cheapest route, shooting through bricks on the way
//    HUNT   - chases the nearest player
//    SNIPE  - keeps its distance, lines up with a player (or the eagle) and shells from range
// =====================================================================

const AI = { WANDER: 0, RUSH: 1, HUNT: 2, SNIPE: 3 };
const AI_MARK = [null, '#F83800', '#F8B800', '#3CBCFC'];   // "SHOW AI TYPE": rush, hunt, snipe
const SNIPE_MIN = 40, SNIPE_MAX = 136;                    // preferred shelling range in pixels

function pickPersonality(type, stageNum) {
  const mode = Config.get('aiStyle');
  if (mode === 'CLASSIC') return AI.WANDER;
  if (mode !== 'MIXED') return AI[mode];
  const w = ENEMY[type].ai.slice();
  // later stages bring fewer aimless tanks
  w[0] *= Math.max(0.35, 1 - (stageNum - 1) * 0.03);
  let r = Math.random() * w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < 4; i++) { if (r < w[i]) return i; r -= w[i]; }
  return AI.WANDER;
}

// small binary heap of [priority, node]
class NavHeap {
  constructor() { this.a = []; }
  push(p, n) {
    const a = this.a;
    a.push([p, n]);
    let i = a.length - 1;
    while (i > 0) {
      const j = (i - 1) >> 1;
      if (a[j][0] <= a[i][0]) break;
      [a[i], a[j]] = [a[j], a[i]];
      i = j;
    }
  }
  pop() {
    const a = this.a, top = a[0], last = a.pop();
    if (a.length) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1, r = l + 1;
        let m = i;
        if (l < a.length && a[l][0] < a[m][0]) m = l;
        if (r < a.length && a[r][0] < a[m][0]) m = r;
        if (m === i) break;
        [a[i], a[m]] = [a[m], a[i]];
        i = m;
      }
    }
    return top;
  }
  get size() { return this.a.length; }
}

Object.assign(Stage.prototype, {
  // ------------------------------------------------------------ navigation grid
  // Nodes are tank positions on the 8px grid. Entering a node costs 1, plus extra for every brick cell
  // under the tank (it has to shoot its way through); steel, water and the eagle can't be entered.
  navCosts() {
    if (this.navCost && this.navCostVer === this.terrainVer) return this.navCost;
    const NX = COLS * 2 - 1, NY = ROWS * 2 - 1, c = new Float32Array(NX * NY);
    for (let by = 0; by < NY; by++) for (let bx = 0; bx < NX; bx++) {
      let cost = 1;
      for (let cy = by * 2; cy < by * 2 + 4 && cost > 0; cy++) for (let cx = bx * 2; cx < bx * 2 + 4; cx++) {
        const t = this.get(cx, cy);
        if (t === T_STEEL || t === T_WATER) { cost = -1; break; }
        if (t === T_BRICK) cost += 0.6;
      }
      if (overlap(bx * 8, by * 8, 16, 16, BASE_X, BASE_Y, 16, 16)) cost = -1;
      c[by * NX + bx] = cost;
    }
    this.navCost = c;
    this.navCostVer = this.terrainVer;
    return c;
  },

  // distance (in moves) from every node to the nearest seed node
  navField(seeds) {
    const NX = COLS * 2 - 1, cost = this.navCosts(), dist = new Float64Array(cost.length).fill(Infinity);
    const h = new NavHeap();
    for (const n of seeds) if (n >= 0 && n < dist.length) { dist[n] = 0; h.push(0, n); }
    while (h.size) {
      const [d, v] = h.pop();
      if (d > dist[v]) continue;
      const vx = v % NX, vy = (v / NX) | 0, step = Math.max(1, cost[v]);
      for (const [dx, dy] of DXY) {
        const ux = vx + dx, uy = vy + dy;
        if (ux < 0 || uy < 0 || ux >= NX || uy * NX >= dist.length) continue;
        const u = uy * NX + ux;
        if (cost[u] < 0) continue;
        const nd = d + step;
        if (nd < dist[u]) { dist[u] = nd; h.push(nd, u); }
      }
    }
    return dist;
  },

  // route to the eagle: any spot right next to it (rebuilt as the bricks change, at most twice a second)
  navBase() {
    const f = this.navBaseF;
    if (f && (f.ver === this.terrainVer || this.frame - f.at < 30)) return f.dist;
    const NX = COLS * 2 - 1, NY = ROWS * 2 - 1, seeds = [];
    for (let by = 0; by < NY; by++) for (let bx = 0; bx < NX; bx++) {
      const x = bx * 8, y = by * 8;
      if (overlap(x, y, 16, 16, BASE_X - 8, BASE_Y - 8, 32, 32) && !overlap(x, y, 16, 16, BASE_X, BASE_Y, 16, 16)) seeds.push(by * NX + bx);
    }
    this.navBaseF = { dist: this.navField(seeds), at: this.frame, ver: this.terrainVer };
    return this.navBaseF.dist;
  },

  // route to a player's tank (rebuilt three times a second)
  navPlayer(pt) {
    const cache = this.navPlayerF || (this.navPlayerF = new Map());
    const f = cache.get(pt);
    if (f && this.frame - f.at < 20) return f.dist;
    const NX = COLS * 2 - 1, NY = ROWS * 2 - 1;
    const bx = Math.max(0, Math.min(NX - 1, Math.round(pt.x / 8))), by = Math.max(0, Math.min(NY - 1, Math.round(pt.y / 8)));
    const dist = this.navField([by * NX + bx]);
    cache.set(pt, { dist, at: this.frame });
    return dist;
  },

  nearestPlayer(t) {
    let best = null, bd = Infinity;
    for (const o of this.tanks) {
      if (!o.isPlayer || !o.alive) continue;
      const d = Math.abs(o.x - t.x) + Math.abs(o.y - t.y);
      if (d < bd) { bd = d; best = o; }
    }
    return best;
  },

  // no steel or water between two points on one row/column (bricks are fine: shells break them)
  clearLine(x0, y0, x1, y1) {
    const n = Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) / 4);
    for (let i = 1; i < n; i++) {
      const t = this.get(Math.floor((x0 + (x1 - x0) * i / n) / 4), Math.floor((y0 + (y1 - y0) * i / n) / 4));
      if (t === T_STEEL) return false;
    }
    return true;
  },

  // step down the distance field from the tank's node; ties keep the current direction
  followField(t, dist, blocked) {
    const NX = COLS * 2 - 1, bx = t.x >> 3, by = t.y >> 3;
    let best = -1, bd = Infinity;
    for (let d = 0; d < 4; d++) {
      if (blocked && d === t.dir) continue;
      const ux = bx + DXY[d][0], uy = by + DXY[d][1];
      if (ux < 0 || uy < 0 || ux >= NX || uy * NX >= dist.length) continue;
      const v = dist[uy * NX + ux] + (d === t.dir ? -0.01 : 0);
      if (v < bd) { bd = v; best = d; }
    }
    if (best < 0 || bd === Infinity) { this.chooseDir(t, blocked); return; }
    this.turn(t, best);
  },

  faceTarget(t, tx, ty) {
    const dx = tx - (t.x + 8), dy = ty - (t.y + 8);
    this.turn(t, Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : (dy > 0 ? 2 : 0));
  },

  // decide where to go next (called on the 8px grid, or when stuck)
  aiChoose(t, blocked) {
    // now and then do something unexpected, so tanks don't drive in single file
    if (!blocked && Math.random() < 0.06) { this.chooseDir(t, false); return; }
    const pt = this.nearestPlayer(t);
    switch (t.ai) {
      case AI.RUSH:
        if (!blocked && this.navBase()[(t.y >> 3) * (COLS * 2 - 1) + (t.x >> 3)] === 0) { this.faceTarget(t, BASE_X + 8, BASE_Y + 8); return; }
        this.followField(t, this.navBase(), blocked);
        return;
      case AI.HUNT:
        this.followField(t, pt ? this.navPlayer(pt) : this.navBase(), blocked);
        return;
      case AI.SNIPE: {
        const target = t.aiBase || !pt ? { x: BASE_X, y: BASE_Y } : pt;
        const tx = target.x + 8, ty = target.y + 8, cx = t.x + 8, cy = t.y + 8;
        const dx = tx - cx, dy = ty - cy, d = Math.abs(dx) + Math.abs(dy);
        const lined = (Math.abs(dx) < 6 || Math.abs(dy) < 6) && d >= SNIPE_MIN && d <= SNIPE_MAX && this.clearLine(cx, cy, tx, ty);
        if (lined && !blocked) {
          // in position: stop, aim and shell
          this.faceTarget(t, tx, ty);
          t.hold = 40 + rnd(50);
          return;
        }
        if (pt && Math.abs(pt.x - t.x) + Math.abs(pt.y - t.y) < SNIPE_MIN && !t.aiBase) {
          // too close: back off along the main axis
          const away = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 3 : 1) : (dy > 0 ? 0 : 2);
          if (!(blocked && away === t.dir) && this.canStep(t, away)) { this.turn(t, away); return; }
        }
        this.followField(t, t.aiBase || !pt ? this.navBase() : this.navPlayer(pt), blocked);
        return;
      }
      default:
        this.chooseDir(t, blocked);
    }
  },

  // is there brick right in front of the tank? (worth a shot)
  brickAhead(t) {
    const [x0, y0, x1, y1] = [[t.x, t.y - 4, t.x + 15, t.y - 1], [t.x + 16, t.y, t.x + 19, t.y + 15],
      [t.x, t.y + 16, t.x + 15, t.y + 19], [t.x - 4, t.y, t.x - 1, t.y + 15]][t.dir];
    for (let cy = y0 >> 2; cy <= y1 >> 2; cy++) for (let cx = x0 >> 2; cx <= x1 >> 2; cx++) if (this.get(cx, cy) === T_BRICK) return true;
    return false;
  },
});
