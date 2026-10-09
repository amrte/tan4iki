'use strict';
// =====================================================================
//  No dead ends: every enemy entry point has a way to the players
//  A map (above all a wider field mirrored from a classic one, or a season's lava, or a big map's seams) can wall an
//  entry point in with steel, water or lava: the tank that comes in there can never get out, and the stage can't be
//  won. When a stage is built, a way is opened from each walled-in entry point to the players: the shortest route
//  through as little of it as possible, steel and the like cleared, water bridged. And if an enemy still ends up
//  somewhere it can't get out of (rebuilt walls, a jump, a teleporter), after a while it comes in again at an
//  entry point that is open.
// =====================================================================

const REACH_STUCK = 600;   // frames an enemy may sit with no way to anyone before it is sent round again

// a cell no tank drives or shoots through (bricks, concrete and crates can be shot away)
const reachWall = v => v === T_STEEL || v === T_WATER || (v >= T_LAVA && bioNav(v, '') < 0);

Object.assign(Stage.prototype, {
  // the modes where enemies come in at entry points and have to get to you
  reachApplies() {
    return !this.galaxy && !this.maze && !this.td && !this.corridor && !this.vs && !this.race;
  },
  reachEntries() {
    if (this.svSpawns) return this.svSpawns.map(([x, y]) => [x, y]);
    if (this.spawnXs) return this.spawnXs.map(x => [x, 0]);
    return ENEMY_SPAWNS.map(([x, y]) => [x, y]);   // the far edge's, or a custom level's own
  },
  reachGoals() {
    return this.players.map(p => (this.vsSpawn || PLAYER_SPAWN)[p.i]).filter(Boolean);
  },

  // route costs on the 8px node grid: a wall costs a lot (so a route takes as little of it as it can); -1 never
  reachCosts() {
    const NX = COLS * 2 - 1, NY = ROWS * 2 - 1, c = new Float32Array(NX * NY);
    for (let by = 0; by < NY; by++) for (let bx = 0; bx < NX; bx++) {
      let cost = 1;
      for (let cy = by * 2; cy < by * 2 + 4; cy++) for (let cx = bx * 2; cx < bx * 2 + 4; cx++) if (reachWall(this.get(cx, cy))) cost += 40;
      if (!this.noBase && overlap(bx * 8, by * 8, 16, 16, BASE_X, BASE_Y, 16, 16)) cost = -1;
      c[by * NX + bx] = cost;
    }
    return c;
  },
  // distance from the goals over those costs (walls: open = false treats them as closed)
  reachField(goals, costs, open) {
    const NX = COLS * 2 - 1, dist = new Float64Array(costs.length).fill(Infinity), h = new NavHeap();
    for (const [x, y] of goals) {
      const n = Math.min(ROWS * 2 - 2, y >> 3) * NX + Math.min(NX - 1, x >> 3);
      dist[n] = 0; h.push(0, n);
    }
    while (h.size) {
      const [d, v] = h.pop();
      if (d > dist[v]) continue;
      const vx = v % NX, vy = (v / NX) | 0;
      for (const [dx, dy] of DXY) {
        const ux = vx + dx, uy = vy + dy, u = uy * NX + ux;
        if (ux < 0 || uy < 0 || ux >= NX || u >= dist.length || costs[u] < 0 || (!open && costs[u] > 30)) continue;
        const nd = d + costs[u];
        if (nd < dist[u]) { dist[u] = nd; h.push(nd, u); }
      }
    }
    return dist;
  },

  // open a way from every walled-in entry point (called once the stage's terrain is all in place)
  openEntries() {
    if (!this.reachApplies()) return 0;
    const goals = this.reachGoals();
    if (!goals.length) return 0;
    const NX = COLS * 2 - 1, costs = this.reachCosts();
    const closed = this.reachField(goals, costs, false), open = this.reachField(goals, costs, true);
    let opened = 0;
    for (const [x, y] of this.reachEntries()) {
      let n = Math.min(ROWS * 2 - 2, y >> 3) * NX + Math.min(NX - 1, x >> 3);
      if (closed[n] < Infinity || !(open[n] < Infinity)) continue;
      // walk down the open field to the goal, clearing what's in the way
      for (let k = 0; k < 4000 && open[n] > 0; k++) {
        const bx = n % NX, by = (n / NX) | 0;
        for (let cy = by * 2; cy < by * 2 + 4; cy++) for (let cx = bx * 2; cx < bx * 2 + 4; cx++) {
          const v = this.get(cx, cy);
          if (reachWall(v)) this.set(cx, cy, v === T_WATER ? T_BRIDGE : T_EMPTY);
        }
        let best = n;
        for (const [dx, dy] of DXY) {
          const ux = bx + dx, uy = by + dy, u = uy * NX + ux;
          if (ux >= 0 && uy >= 0 && ux < NX && u < open.length && open[u] < open[best]) best = u;
        }
        if (best === n) break;
        n = best;
      }
      opened++;
    }
    if (opened) this.origTerrain = this.terrain.slice();   // what masons put back
    return opened;
  },

  // an enemy that can't get to anyone (or to the eagle) for a while comes in again where it can
  reachRescue(t) {
    t.reachT = (t.reachT || 0) + 1;
    if (t.reachT % 60 || !this.reachApplies() || t.slither || t.ally) return;
    const ps = this.tanks.filter(p => p.isPlayer && p.alive && !p.ally && p.player);
    if (!ps.length) return;
    const NX = COLS * 2 - 1, n = Math.min(ROWS * 2 - 2, Math.round(t.y / 8)) * NX + Math.min(NX - 1, Math.round(t.x / 8));
    const mode = t.hover ? 'hover' : '';
    const ok = ps.some(p => this.navPlayer(p, mode)[n] < Infinity) || (!this.noBase && this.baseAlive && this.navBase(mode)[n] < Infinity);
    t.stuckFor = ok ? 0 : (t.stuckFor || 0) + 60;
    if (t.stuckFor < REACH_STUCK) return;
    // a free entry point that leads somewhere
    const free = this.reachEntries().filter(([x, y]) => {
      const m = Math.min(ROWS * 2 - 2, y >> 3) * NX + Math.min(NX - 1, x >> 3);
      return ps.some(p => this.navPlayer(p, mode)[m] < Infinity) && !this.tanks.some(o => o.alive && o !== t && overlap(o.x, o.y, 16, 16, x, y, 16, 16));
    });
    if (!free.length) return;
    const [x, y] = free[rnd(free.length)];
    this.addFx(t.x + 8, t.y + 8, [Sprites.sparkle[3], Sprites.sparkle[2], Sprites.sparkle[1], Sprites.sparkle[0]], 6);
    t.x = x; t.y = y; t.stuckFor = 0; t.acc = 0;
    t.dir = y === 0 ? 2 : y >= FH - 16 ? 0 : x === 0 ? 1 : x >= FW - 16 ? 3 : t.dir;
  },
});

(() => {
  const P = Stage.prototype;
  // the last step of building a stage's terrain (the secrets go in after the seasons and the mode's own setup)
  const setupSecrets = P.setupSecrets;
  P.setupSecrets = function (opts) {
    setupSecrets.call(this, opts);
    if (!opts.snapshot && !opts.editor && Net.role !== 'client') this.openEntries();
  };
  const updateEnemy = P.updateEnemy;
  P.updateEnemy = function (t) {
    updateEnemy.call(this, t);
    if (t.alive && Net.role !== 'client') this.reachRescue(t);
  };
})();
