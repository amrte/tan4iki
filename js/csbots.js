'use strict';
// =====================================================================
//  COUNTER-STRIKE's bots (cs.js): computer players on both teams, driving the same tanks as you.
//    - they buy like players do: armour, a gun they can afford (one sniper laser a team), a kit for the CTs, smoke
//      for the terrorists; they save up on a poor round
//    - terrorists pick a site each round and a way in for each of them (A by long or by the catwalk, B through the
//      tunnels, or a lurker through mid and the lower tunnels), gather short of the site, go in together, plant,
//      then hold round the bomb; one of them fetches a dropped bomb; with little time left they all rush. When a
//      player carries the bomb the bots go where the player goes: the site they're heading for, in once they're near
//    - counter-terrorists spread over the map (the car at A, A site, CT mid, B site, the B window), hold their
//      spot facing the way in, and rotate to a site when the enemy is seen or heard there or the bomb is down;
//      then the nearest goes for the bomb and defuses while the rest cover him. The two nearest go after an enemy
//      seen or heard near them, and in a quiet spell each takes a turn looking out further up its way in
//    - in a fight: the nearest enemy the team can see; line up with it (tanks fire only straight), take a moment to
//      aim (quicker on harder skills) and fire, never through a teammate
//    - routes: distance fields on the 8 px grid (crates, doors and windows are walls to them), worked out once a
//      round per call-out and a few a frame for chasing, so ten bots stay cheap on the big map
// =====================================================================

const CSB_SEE = 168, CSB_ARRIVE = 2, CSB_FIELDS = 3;
// (the ways in, the posts, the rotations and the CTs' posts are the map's: CSB_ROUTES ... CSB_WAYS, set by csUseMap)
const CSB_PEEK_ON = 7, CSB_PEEK_EVERY = 26;
// how far (px) the CTs go after an enemy seen or heard, and how long they keep at it once it's gone
const CSB_HUNT_R = 400, CSB_HUNT_KEEP = 300;
// the buy: guns from the dearest a bot would go for down
const CSB_GUNS = ['missile', 'tesla', 'mortar', 'mg', 'flame'];
// where the terrorists guard a planted bomb from (tiles off it: in line with it, so a defuser is in line with them)
const CSB_GUARD = [[0, -5], [5, 0], [0, 5], [-5, 0]];
// each bot's own place round a call-out (tiles)
const CSB_JIT = [[0, 0], [2, 1], [-2, 1], [1, -2], [-1, 2], [2, -1], [-2, -1]];

Object.assign(Stage.prototype, {
  // ------------------------------------------------------------ routes
  // where a tank can stand (its top-left on the 8 px grid): nothing solid under it
  csNav() {
    const N = this.csNavC;
    if (N && (N.ver === this.terrainVer || this.frame - N.at < 60)) return N;
    const NX = COLS * 2 - 1, NY = ROWS * 2 - 1, pass = new Uint8Array(NX * NY);
    for (let by = 0; by < NY; by++) for (let bx = 0; bx < NX; bx++) {
      let ok = 1;
      for (let cy = by * 2; cy < by * 2 + 4 && ok; cy++) for (let cx = bx * 2; cx < bx * 2 + 4; cx++) {
        const v = this.terrain[cy * GW + cx];
        if (v === T_STEEL || v === T_BRICK || v === T_WATER) { ok = 0; break; }
      }
      pass[by * NX + bx] = ok;
    }
    const fresh = !N || N.ver !== this.terrainVer;
    this.csNavC = { NX, NY, pass, ver: this.terrainVer, at: this.frame };
    if (fresh) this.csFieldC = new Map();
    return this.csNavC;
  },
  // the node a point (top-left of a tank) is at, moved to the nearest one a tank fits on
  csNode(x, y) {
    const N = this.csNav(), bx0 = Math.max(0, Math.min(N.NX - 1, Math.round(x / 8))), by0 = Math.max(0, Math.min(N.NY - 1, Math.round(y / 8)));
    for (let r = 0; r < 6; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      const bx = bx0 + dx, by = by0 + dy;
      if (bx >= 0 && by >= 0 && bx < N.NX && by < N.NY && N.pass[by * N.NX + bx]) return by * N.NX + bx;
    }
    return by0 * N.NX + bx0;
  },
  csSpotXY(name) { const s = CS_SPOTS[name]; return [s[0] * 16, s[1] * 16]; },
  // moves from every node to the goal (-1: can't get there); breadth first, cached
  csField(goal, urgent) {
    const N = this.csNav(), cache = this.csFieldC || (this.csFieldC = new Map()), f = cache.get(goal);
    if (f && (f.at >= this.frame - 40 || f.fixed || !urgent)) return f.d;
    if ((this.csFieldN || 0) >= CSB_FIELDS && this.csFieldAt === this.frame && f) return f.d;
    if (this.csFieldAt !== this.frame) { this.csFieldAt = this.frame; this.csFieldN = 0; }
    this.csFieldN++;
    const n = N.NX * N.NY, d = new Int16Array(n).fill(-1), q = new Int32Array(n);
    let h = 0, tl = 0;
    d[goal] = 0; q[tl++] = goal;
    while (h < tl) {
      const v = q[h++], vx = v % N.NX, nd = d[v] + 1;
      if (vx > 0 && d[v - 1] < 0 && N.pass[v - 1]) { d[v - 1] = nd; q[tl++] = v - 1; }
      if (vx < N.NX - 1 && d[v + 1] < 0 && N.pass[v + 1]) { d[v + 1] = nd; q[tl++] = v + 1; }
      if (v >= N.NX && d[v - N.NX] < 0 && N.pass[v - N.NX]) { d[v - N.NX] = nd; q[tl++] = v - N.NX; }
      if (v + N.NX < n && d[v + N.NX] < 0 && N.pass[v + N.NX]) { d[v + N.NX] = nd; q[tl++] = v + N.NX; }
    }
    cache.set(goal, { d, at: this.frame, fixed: !urgent });
    // chases leave a trail of goals behind them: the old ones go
    if (cache.size > 48) for (const [k, e] of cache) if (!e.fixed && (this.frame - e.at > 120 || this.frame < e.at)) cache.delete(k);
    return d;
  },
  // the way to go down a field from where the tank is (-1: there already, or no way)
  csStep(t, d, avoid) {
    const N = this.csNav(), bx = Math.round(t.x / 8), by = Math.round(t.y / 8), here = d[by * N.NX + bx];
    let best = -1, bv = here < 0 ? 1e9 : here;
    for (let k = 0; k < 4; k++) {
      const ux = bx + DXY[k][0], uy = by + DXY[k][1];
      if (ux < 0 || uy < 0 || ux >= N.NX || uy >= N.NY) continue;
      const v = d[uy * N.NX + ux];
      if (v < 0 || k === avoid) continue;
      const score = v - (k === t.dir ? 0.1 : 0);
      if (score < bv) { bv = score; best = k; }
    }
    return best;
  },
  csDist(t, d) { const N = this.csNav(); return d[Math.round(t.y / 8) * N.NX + Math.round(t.x / 8)]; },

  // ------------------------------------------------------------ buying
  csBotBuy(p) {
    const team = p.csTeam, mates = this.players.filter(q => q.csTeam === team), pistol = p.csMoney <= CS_MONEY.start;
    const buy = id => { const it = CS_BUY.find(b => b.id === id); return it && !this.csBuy(p, it); };
    if (pistol) { if (Math.random() < 0.6) buy('armor'); else buy('star'); if (team === 'T' && Math.random() < 0.3) buy('smoke'); return; }
    if (p.csMoney < 1900 && (!p.weapon || p.weapon === 'cannon')) { if (Math.random() < 0.3) buy('star'); return; }   // an eco round: save up
    if (!p.csArmor) buy('armor');
    if (!p.weapon || p.weapon === 'cannon') {
      // one sniper a team, when it can afford it
      if (p.csMoney >= 4750 + 400 && !mates.some(q => q.weapon === 'laser') && Math.random() < 0.5) buy('laser');
      else {
        const can = CSB_GUNS.filter(k => CS_BUY.find(b => b.id === k).price <= p.csMoney - 200);
        if (can.length) buy(can[Math.min(can.length - 1, rnd(2))]);
      }
    }
    if (team === 'CT' && !p.csKit) buy('kit');
    if (team === 'T' && Math.random() < 0.6) buy('smoke');
    if ((p.csArmor || 0) < 2 && p.csMoney > 2500) buy('armor');
    if (team === 'CT' && p.csMoney > 1500 && Math.random() < 0.4) buy('mines');
    if ((p.level || 0) < 1 && p.weapon === 'cannon') buy('star');
  },

  // ------------------------------------------------------------ the plan: each side's at the start of a round
  csBotPlan() {
    const C = this.cs, bots = this.players.filter(p => p.bot);
    const T = bots.filter(p => p.csTeam === 'T'), CT = bots.filter(p => p.csTeam === 'CT');
    const site = Math.random() < 0.5 ? 'A' : 'B';
    const rush = Math.random() < 0.2;
    // a rush goes straight in; otherwise they take their time at the gathering points, as a team would
    C.plan = { site, exec: false, rush, execAt: rush ? 0 : (6 + rnd(12)) * 60, rotate: null };
    this.csBotWays(site);
    const posts = CSB_CT.slice(0, Math.max(3, CT.length));
    CT.forEach((p, k) => { const [spot, dir] = posts[k % posts.length]; p.csAiPlan = { role: 'hold', spot, dir }; });
  },

  // the terrorist bots' ways in to a site
  csBotWays(site) {
    const ways = CSB_WAYS[site];
    this.players.filter(p => p.bot && p.csTeam === 'T').forEach((p, k) => { p.csAiPlan = { role: ways[k % ways.length], k: 0 }; });
  },

  // a player carrying the bomb leads: the site they're heading for (the nearer by the road, once it's clearly
  // nearer) is the bots' site; returns the player's tank (null: a bot has it, or nobody)
  csBotLead() {
    const C = this.cs, P = C.plan, B = C.bomb, c = B.state === 'carried' ? this.csP(B.carrier) : null, t = c && !c.bot ? this.csTankOf(c) : null;
    if (!t) return null;
    if (P.leadAt !== undefined && this.frame - P.leadAt < 30 && this.frame >= P.leadAt) return t;
    P.leadAt = this.frame;
    const far = k => { const v = this.csDist(t, this.csField(this.csNode(...this.csSpotXY(k)))); return v < 0 ? 1e4 : v; };
    const dA = far('aSite'), dB = far('bSite'), want = dA < dB ? 'A' : 'B';
    if (want !== P.site && Math.abs(dA - dB) > 16) { P.site = want; P.exec = false; this.csBotWays(want); }
    P.leadD = P.site === 'A' ? dA : dB;
    return t;
  },

  // ------------------------------------------------------------ every frame: what a bot presses
  csBotInput(t) {
    const p = t.player, C = this.cs, B = C.bomb;
    if (!C.plan) this.csBotPlan();
    const pl = p.csAiPlan || (p.csAiPlan = { role: 'hold', spot: p.csTeam === 'T' ? 'tSpawn' : 'ctSpawn', dir: 0 });
    const ai = t.csAi || (t.csAi = { aim: 0, stuck: 0, lx: t.x, ly: t.y, wander: 0, wdir: 0, dropped: 0 });
    const out = { dir: -1, fire: false, firePressed: false, alt: false, altPressed: false };
    if (C.phase === 'buy') return out;
    // stuck (a teammate in the lane, a corner): drive off another way for a moment
    if (t.x === ai.lx && t.y === ai.ly && ai.want) ai.stuck++; else { ai.stuck = 0; ai.lx = t.x; ai.ly = t.y; }
    if (ai.stuck > 30) { ai.wander = 14 + rnd(20); ai.wdir = (t.dir + (Math.random() < 0.5 ? 1 : 3)) % 4; if (!this.canStep(t, ai.wdir)) ai.wdir = (ai.wdir + 2) % 4; ai.stuck = 0; }
    ai.want = false;
    // pushed on top of a teammate (a turn snaps to the grid): get off him first
    const on = this.tanks.find(o => o !== t && o.alive && overlap(t.x + 2, t.y + 2, 12, 12, o.x, o.y, 16, 16));
    if (on) {
      const away = Math.abs(on.x - t.x) > Math.abs(on.y - t.y) ? (on.x > t.x ? 3 : 1) : (on.y > t.y ? 0 : 2);
      const d = [away, (away + 1) % 4, (away + 3) % 4].find(k => this.canStep(t, k));
      if (d !== undefined) { out.dir = d; ai.want = true; return out; }
    }
    // a teammate stuck behind us: make way
    const behind = this.tanks.find(o => o !== t && o.alive && o.player && o.player.csTeam === p.csTeam && (o.player.bot ? o.csAi && o.csAi.stuck > 8 : o.csDir >= 0 && o.dir === o.csDir) && this.tankAhead(o) === t);
    if (behind) {
      const d = [(behind.dir + 1) % 4, (behind.dir + 3) % 4, behind.dir].find(k => this.canStep(t, k));
      if (d !== undefined) { out.dir = d; ai.want = true; return out; }
    }
    // a fight first
    const fight = this.csBotFight(t, out);
    if (fight === 'shoot') return out;
    if (ai.wander > 0) { ai.wander--; out.dir = ai.wdir; ai.want = true; return out; }
    if (fight === 'move') { ai.want = true; return out; }
    // then the bomb and the plan
    const goal = this.csBotGoal(t, p, pl, B);
    if (goal && goal.act) { out.alt = true; out.altPressed = !ai.alt; ai.alt = true; return out; }
    ai.alt = false;
    if (goal && goal.smoke && p.csSmokes > 0) { out.alt = true; out.altPressed = true; return out; }
    if (!goal) return out;
    const d = this.csField(goal.node), dist = this.csDist(t, d);
    ai.holding = dist >= 0 && dist <= (goal.near !== undefined ? goal.near : CSB_ARRIVE);
    if (ai.holding) {
      // there: a mine on the way in (once), then look the way the post looks out
      if (goal.mine && p.mines > 0 && !ai.mined) { ai.mined = true; out.alt = true; out.altPressed = true; return out; }
      if (goal.dir !== undefined && t.dir !== goal.dir && this.frame % 20 === 0) out.dir = goal.dir;
      return out;
    }
    // down the field; a tank in the way: round it, by the free way that loses least, for a moment
    if (ai.sideT > 0) { ai.sideT--; out.dir = ai.side; ai.want = true; return out; }
    let k = (t.x & 7) === 0 && (t.y & 7) === 0 ? this.csStep(t, d) : t.dir;
    const blocker = k >= 0 && !this.canStep(t, k) ? this.tankAhead(Object.assign({}, t, { dir: k, alive: true })) : null;
    if (blocker) {
      // sideways, away from the middle of the tank in the way (the other side if that's shut)
      const off = k & 1 ? blocker.y - t.y : blocker.x - t.x, away = k & 1 ? (off > 0 ? 0 : 2) : (off > 0 ? 3 : 1);
      const alt = [away, (away + 2) % 4].find(j => this.canStep(t, j));
      if (alt !== undefined) { k = alt; ai.side = alt; ai.sideT = 12 + rnd(12); }
    }
    if (k >= 0) { out.dir = k; ai.want = true; }
    return out;
  },

  // shoot at what the team can see, or line up with it; 'shoot', 'move', or '' (nothing to fight)
  csBotFight(t, out) {
    const p = t.player, ai = t.csAi, team = p.csTeam, cx = t.x + 8, cy = t.y + 8;
    // the enemy to fight: one in line with a clear shot first, else the nearest in sight; the one it's aiming at
    // stays the target unless another is clearly better
    let tgt = null, bd = 1e9;
    for (const o of this.tanks) {
      if (!o.alive || !o.player || o.player.csTeam === team || !this.csSees(team, o)) continue;
      const ox = o.x + 8 - cx, oy = o.y + 8 - cy, far = Math.abs(ox) + Math.abs(oy);
      if (far >= CSB_SEE) continue;
      const shot = (Math.abs(ox) < 9 || Math.abs(oy) < 9) && this.clearLine(cx, cy, o.x + 8, o.y + 8) && !this.csMateInLine(t, o);
      const dd = far - (o === ai.tgt ? 24 : 0) - (shot ? 400 : 0);
      if (dd < bd) { bd = dd; tgt = o; }
    }
    if (!tgt) { ai.aim = 0; ai.tgt = null; return ''; }
    if (ai.tgt !== tgt) { ai.tgt = tgt; ai.aim = 0; }
    // a moment to aim: longer on the move, shorter for one holding still on its post (the defender's edge)
    const dx = tgt.x + 8 - cx, dy = tgt.y + 8 - cy, w = p.weapon || 'cannon';
    // (the edge is the same few frames on every skill: scaled with it, it decided every duel on the easy ones)
    const delay = Math.max(4, Math.round(26 / Math.max(0.3, Config.skill().aggr)) + (ai.holding ? -10 : t.moving ? 10 : 0));
    // the guns that find their own target: fire once it's in reach (aiming starts once it is)
    const reach = w === 'tesla' ? 58 : w === 'missile' ? 150 : 0, inReach = reach && Math.hypot(dx, dy) < reach;
    if (inReach && ++ai.aim > delay) { out.fire = true; out.firePressed = true; }
    // in line (a shell 4 px wide meets a tank 16 px wide off centre by up to 9)
    const lined = Math.abs(dx) < 9 || Math.abs(dy) < 9, range = w === 'flame' ? 44 : w === 'mortar' ? 104 : CSB_SEE;
    const want = Math.abs(dx) < Math.abs(dy) ? (dy > 0 ? 2 : 0) : (dx > 0 ? 1 : 3), far = Math.abs(dx) + Math.abs(dy);
    if (lined) {
      // blocked by a wall or a teammate: carry on; too far for the gun: close in; else turn and fire
      if (!this.clearLine(cx, cy, tgt.x + 8, tgt.y + 8) || this.csMateInLine(t, tgt)) return out.fire ? 'shoot' : '';
      if (far >= range) { if (this.canStep(t, want)) { out.dir = want; return 'move'; } return out.fire ? 'shoot' : ''; }
      if (t.dir !== want) { out.dir = want; return 'shoot'; }
      if (!inReach && ++ai.aim > delay) { out.fire = true; out.firePressed = !ai.fired; ai.fired = !ai.fired; }
      return 'shoot';
    }
    if (out.fire) return 'shoot';
    if (!inReach) ai.aim = 0;
    // further off and out of line: the plan goes on (its route lines them up soon enough). Close by: line up along the
    // shorter way, or back off along the longer one to make room to turn
    if (far > 64) return '';
    const axis = Math.abs(dx) < Math.abs(dy) ? (dx > 0 ? 1 : 3) : (dy > 0 ? 2 : 0);
    if (this.canStep(t, axis)) { out.dir = axis; return 'move'; }
    const back = (want + 2) % 4;
    if (this.canStep(t, back)) { out.dir = back; return 'move'; }
    return '';
  },

  // a teammate between the tank and its target (a shell would stop on him)
  csMateInLine(t, tgt) {
    const x0 = Math.min(t.x, tgt.x), x1 = Math.max(t.x, tgt.x), y0 = Math.min(t.y, tgt.y), y1 = Math.max(t.y, tgt.y);
    return this.tanks.some(o => o !== t && o.alive && o.player && o.player.csTeam === t.player.csTeam && overlap(o.x + 2, o.y + 2, 12, 12, x0 + 4, y0 + 4, x1 - x0 + 8, y1 - y0 + 8));
  },

  // where a bot goes now: { node, near, dir } or { act: true } (hold B: plant or defuse); null: stay
  csBotGoal(t, p, pl, B) {
    const C = this.cs, P = C.plan, at = (x, y) => this.csNode(x, y);
    // a call-out's node; jit: a place of the bot's own round it (no two of a team on one), so they don't queue
    const spot = (name, jit, alt = 0) => {
      const [x, y] = this.csSpotXY(name);
      if (!jit) return at(x, y);
      const [ox, oy] = CSB_JIT[(this.players.filter(q => q.csTeam === p.csTeam).indexOf(p) + alt) % CSB_JIT.length];
      return at(x + ox * 16, y + oy * 16);
    };
    const enemyNear = r => this.tanks.some(o => o.alive && o.player && o.player.csTeam !== p.csTeam && this.csSees(p.csTeam, o) && Math.abs(o.x - t.x) + Math.abs(o.y - t.y) < r);
    if (p.csTeam === 'T') {
      // the bomb on the ground: the nearest of us goes for it
      if (B.state === 'dropped') {
        const ts = this.csAlive('T').filter(o => o.player.bot), bn = at(B.x - 8, B.y - 8), d = this.csField(bn, true);
        const me = ts.sort((a, b) => (this.csDist(a, d) + 1e4 * (this.csDist(a, d) < 0)) - (this.csDist(b, d) + 1e4 * (this.csDist(b, d) < 0)))[0];
        if (me === t) return { node: bn, near: 0 };
      }
      if (B.state === 'carried' && B.carrier === p.i) {
        // plant as soon as we're on the site (unless someone's shooting at us)
        const site = this.csSiteAt(t.x + 8, t.y + 8);
        if (site && (P.exec || C.clock < 1800) && !enemyNear(96)) return { act: true };
        // somewhere on the site; another spot of it when a teammate is in the way
        if (t.csAi.stuck > 15) pl.alt = (pl.alt || 0) + 1;
        if (P.exec || C.clock < 1800 || P.rush) return { node: spot(P.site === 'A' ? 'aSite' : 'bSite', !!pl.alt, pl.alt), near: 0 };
      }
      // the bomb down: one guards it from a few tiles off (whoever comes to defuse it is in line with him), the rest
      // hold the ways in
      if (B.state === 'planted') {
        const k = this.players.filter(q => q.csTeam === 'T').indexOf(p), posts = CSB_POST[B.site];
        if (k % 5 >= 1) return { node: spot(posts[k % posts.length], true), near: 3 };
        const [ox, oy] = CSB_GUARD[(k + C.round) % CSB_GUARD.length];
        return { node: at(B.x - 8 + ox * 16, B.y - 8 + oy * 16), near: 2 };
      }
      const R = CSB_ROUTES[pl.role] || Object.values(CSB_ROUTES)[0];
      // everyone at their gathering point (or 25 s gone, or a rush, or time running out): go in
      const lead = this.csBotLead();
      if (!P.exec && lead) {
        // with a player carrying the bomb: in once they're close to the site (or time's running out)
        if (P.leadD < 48 || C.clock < 40 * 60) P.exec = true;
      } else if (!P.exec) {
        // everyone at the end of their way to the gathering point and settled there
        const ready = this.csAlive('T').filter(o => o.player.bot).every(o => { const q = o.player.csAiPlan, r = q && CSB_ROUTES[q.role]; return !r || (q.k >= r.path.length - 1 && o.csAi && o.csAi.holding); });
        if ((ready && C.t > P.execAt) || P.rush || C.t > P.execAt + 10 * 60 || C.clock < 45 * 60) P.exec = true;
      }
      const path = P.exec ? R.go : R.path;
      if (!P.exec && pl.k >= path.length) pl.k = path.length - 1;
      if (P.exec && !pl.go) { pl.go = true; pl.k = 0; pl.smoked = false; }
      const last = pl.k >= path.length - 1, posts = CSB_POST[R.site];
      const name = P.exec && last ? posts[p.i % posts.length] : path[Math.min(pl.k, path.length - 1)], node = spot(name, last), dd = this.csDist(t, this.csField(node));
      if (dd >= 0 && dd <= 4 && pl.k < path.length - 1) pl.k++;
      if (P.exec && !pl.smoked && p.csSmokes > 0 && pl.k === 1) { pl.smoked = true; return { smoke: true, node }; }
      // waiting to go in: anywhere round the gathering point will do (they'd only jostle for the spot)
      return { node, near: last ? (P.exec ? 3 : 6) : CSB_ARRIVE };
    }
    // counter-terrorists
    if (B.state === 'planted') {
      const cts = this.csAlive('CT').filter(o => o.player.bot), bn = at(B.x - 8, B.y - 8), d = this.csField(bn, true);
      const dist = o => { const v = this.csDist(o, d); return v < 0 ? 1e4 : v - (o.player.csKit ? 12 : 0); };
      const defuser = cts.sort((a, b) => dist(a) - dist(b))[0];
      if (defuser === t) {
        if (Math.hypot(t.x + 8 - B.x, t.y + 8 - B.y) < 13 && !enemyNear(80)) return { act: true };
        return { node: bn, near: 0 };
      }
      const posts = CSB_POST[B.site];
      return { node: spot(posts[(p.i + 1) % posts.length], true), near: 3 };
    }
    // an enemy seen or heard close by: the two nearest go after it
    const hunt = this.csBotHunt(t);
    if (hunt) return hunt;
    // rotate: Ts seen or heard at a site, or the bomb seen on the way to one
    if (!P.rotate || C.t - P.rotateAt > 900) {
      let site = null;
      for (const o of this.tanks) if (o.alive && o.player && o.player.csTeam === 'T' && this.csSees('CT', o)) site = site || this.csSiteAt(o.x + 8, o.y + 8) || this.csNearSite(o.x + 8, o.y + 8);
      if (!site) for (const n of C.noise) if (n.team === 'T') site = site || this.csNearSite(n.x, n.y);
      if (!site && B.state === 'dropped' && this.csSeesAt('CT', B.x, B.y)) site = this.csNearSite(B.x, B.y);
      if (site && site !== P.rotate) { P.rotate = site; P.rotateAt = C.t; }
    }
    if (P.rotate && pl.spot !== 'ctMid') {
      const posts = CSB_ROT[P.rotate];
      return { node: spot(posts[p.i % posts.length], true), near: 2, dir: undefined };
    }
    // a quiet spell: now and then a look further up the way in (each in turn), then back to the post
    const k = this.players.filter(q => q.bot && q.csTeam === 'CT').indexOf(p), peek = CSB_PEEK[pl.spot];
    if (peek && C.t > 8 * 60 && (Math.floor(C.t / 60) + k * 11) % CSB_PEEK_EVERY < CSB_PEEK_ON) return { node: spot(peek, true), near: 2 };
    return { node: spot(pl.spot, true), near: 1, dir: pl.dir, mine: !!pl.spot };
  },

  // where the CTs last saw or heard a terrorist, and which two bots go there: { node, hunters } or null
  csBotContact() {
    const C = this.cs;
    if (C.contactAt === this.frame) return C.contact;
    C.contactAt = this.frame;
    let c = null;
    for (const o of this.tanks) if (o.alive && o.player && o.player.csTeam === 'T' && this.csSees('CT', o)) { c = { x: o.x, y: o.y }; break; }
    const gh = C.ghosts.CT || [];
    if (!c && gh.length) c = { x: gh[gh.length - 1].x, y: gh[gh.length - 1].y };
    if (!c) for (const n of C.noise) if (n.team === 'T') c = { x: n.x - 8, y: n.y - 8 };
    const L = C.lastContact;
    if (c) {
      // the same fight (near the last one): the same hunters, the goal moved along on a 2-tile grid
      const same = L && this.frame - L.at < CSB_HUNT_KEEP && Math.abs(L.x - c.x) + Math.abs(L.y - c.y) < 96;
      const gx = Math.round(c.x / 32) * 32, gy = Math.round(c.y / 32) * 32;
      C.lastContact = { x: c.x, y: c.y, at: this.frame, node: this.csNode(gx, gy), hunters: same ? L.hunters.filter(i => this.csTankOf(this.csP(i))) : [] };
      if (C.lastContact.hunters.length < 2) {
        const free = this.csAlive('CT').filter(o => o.player.bot && !C.lastContact.hunters.includes(o.player.i) && Math.abs(o.x - c.x) + Math.abs(o.y - c.y) < CSB_HUNT_R);
        free.sort((a, b) => Math.abs(a.x - c.x) + Math.abs(a.y - c.y) - Math.abs(b.x - c.x) - Math.abs(b.y - c.y));
        for (const o of free.slice(0, 2 - C.lastContact.hunters.length)) C.lastContact.hunters.push(o.player.i);
      }
    }
    C.contact = C.lastContact && this.frame - C.lastContact.at < CSB_HUNT_KEEP && this.frame >= C.lastContact.at ? C.lastContact : null;
    return C.contact;
  },
  csBotHunt(t) {
    const c = this.csBotContact();
    if (!c || !c.hunters.includes(t.player.i)) return null;
    // there and nothing to see: the trail's gone cold
    if (this.csDist(t, this.csField(c.node, true)) <= 3 && this.frame - c.at > 60) { c.hunters = c.hunters.filter(i => i !== t.player.i); return null; }
    return { node: c.node, near: 2 };
  },

  // the site a point is close to (the way in to it), or ''
  csNearSite(x, y) {
    const near = (k, m) => { const [zx, zy, zw, zh] = CS_ZONES[k]; return x > (zx - m) * 16 && y > (zy - m) * 16 && x < (zx + zw + m) * 16 && y < (zy + zh + m) * 16; };
    return near('A', 8) ? 'A' : near('B', 8) ? 'B' : '';
  },
});
