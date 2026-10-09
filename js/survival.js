'use strict';
// =====================================================================
//  SURVIVAL: hold out for 100 waves on one map
//    - no eagle: you start in the middle of a map a little bigger than the screen, and the enemy comes in from
//      every edge to hunt you down
//    - a wave grows to 28 tanks (more with more players), then the tanks get tougher instead: more armour, more
//      hunters, more of them on the field at once (4 rising to 8), faster spawns, the newer enemy types
//    - every third wave has a twist (night, a swarm, an armoured column, rocket rain, a blitz ...), announced
//      a wave ahead
//    - between waves: 10-60% of the wrecked terrain is rebuilt and a few power-ups are dropped around the map;
//      a perfect wave (no tank lost) pays a bonus and one more power-up; every 5 waves pick 1 of 3 perks
//    Replaces the old survival rules in modes.js (setupSurvival / nextWave).
// =====================================================================

const SV_WAVES = 100, SV_BREAK = 300, SV_GROW = 4, SV_CAP = 28, SV_DROP_LIFE = 1800, SV_TWIST_EVERY = 3;

// the twists; type: the enemy the wave is made of (every: only every n-th tank), count: wave size factor
const SV_TWISTS = {
  night: { name: 'NIGHT WAVE', desc: 'THEY COME IN THE DARK', from: 3, weather: 'night' },
  swarm: { name: 'SWARM', desc: 'A HORDE OF FAST LIGHT TANKS', from: 3, type: 1, count: 1.5, light: true, maxOn: 3, spawn: 0.5 },
  column: { name: 'ARMOURED COLUMN', desc: 'HEAVY ARMOUR ONLY', from: 6, type: 3, count: 0.6, rank: 1 },
  sappers: { name: 'SAPPERS', desc: 'BLADES AND MINES', from: 6, type: 6, count: 0.8 },
  blitz: { name: 'BLITZ', desc: 'DOUBLE-SPEED ENEMIES', from: 9, speed: 2 },
  rockets: { name: 'ROCKET RAIN', desc: 'WATCH THE SKY', from: 9, type: 4, every: 3, rain: true },
  fog: { name: 'FOG', desc: 'CAN YOU SEE THEM?', from: 12, weather: 'fog' },
  shields: { name: 'SHIELD WALL', desc: 'HIT THEM FROM THE SIDE', from: 12, type: 5, count: 0.8 },
  shades: { name: 'SHADOWS', desc: 'NEARLY INVISIBLE HUNTERS', from: 15, type: 7, count: 0.6 },
  snakes: { name: 'SNAKE PIT', desc: 'THEY EAT TANKS', from: 24, type: 17, every: 5 },
  final: { name: 'THE LAST WAVE', desc: 'EVERYTHING THEY HAVE LEFT', rank: 2, count: 1.4 },
};

// perks: one of three every 5 waves, for the whole team, for the rest of the run
const SV_PERKS = [
  { key: 'plate', name: 'ARMOUR PLATE', desc: 'A PLATE, REGROWN EACH WAVE', max: 3 },
  { key: 'reload', name: 'QUICK RELOAD', desc: 'FIRE 25% FASTER', max: 2 },
  { key: 'shells', name: 'HOT SHELLS', desc: 'SHELLS FLY 25% FASTER', max: 2 },
  { key: 'twin', name: 'TWIN GUN', desc: 'ONE MORE SHELL IN THE AIR', max: 2 },
  { key: 'engine', name: 'BIG ENGINE', desc: 'DRIVE 12% FASTER', max: 2 },
  { key: 'lives', name: 'SPARE TANKS', desc: 'TWO MORE LIVES, NOW', max: 99 },
  { key: 'scav', name: 'SCAVENGER', desc: 'ONE MORE DROP EACH WAVE', max: 3 },
  { key: 'fuse', name: 'LONG FUSE', desc: 'POWER-UPS LAST 50% LONGER', max: 2 },
  { key: 'star', name: 'VETERAN CREW', desc: 'RESPAWN WITH A STAR MORE', max: 3 },
  { key: 'bounty', name: 'BOUNTY', desc: '25% MORE POINTS', max: 2 },
  { key: 'ap', name: 'AP SHELLS', desc: 'YOUR SHELLS BREAK STEEL', max: 1 },
  { key: 'shield', name: 'FIELD SHIELD', desc: 'LONGER SHIELD ON RESPAWN', max: 2 },
];
const svPerkInfo = key => SV_PERKS.find(p => p.key === key);

// a new run: its map, its season (when they cycle) and the seed for its twists
function svNewRun() {
  const s = Config.get('seasons');
  return { seed: 1 + rnd(1e9), map: rnd(LEVELS.length), theme: s === 'CYCLE' ? THEME_ORDER[rnd(THEME_ORDER.length)] : undefined };
}
// revivals paid for so far this run (each one doubles the price; kept on the players, so checkpoints carry it)
function svRevivesUsed() {
  return typeof Game !== 'undefined' && Game.players && Game.players[0] ? Game.players[0].svRevives || 0 : 0;
}
// a player's perk level (survival only)
function svPerkOf(p, key) {
  return p && p.svPerks && typeof Game !== 'undefined' && Game.mode === 'survival' ? p.svPerks[key] || 0 : 0;
}

Object.assign(Stage.prototype, {
  setupSurvival() {
    const run = (typeof Game !== 'undefined' && Game.svRun) || {};
    this.survival = true;
    this.noBase = true;
    this.baseAlive = false;   // no eagle, and no light where it would be on a night wave
    this.svSeed = run.seed || 1;
    this.svMap = run.map || 0;
    this.svDrops = []; this.svRockets = []; this.svNotes = []; this.svLost = 0; this.svPlan = null;
    this.svWeather0 = this.weather;
    this.setBaseWalls(T_EMPTY);
    // the crates, barrels, mud, belts and teleporters of a later stage
    if (Config.on('terrainExtras')) this.addTerrainExtras(10 + this.svMap % 7);
    // enemies come in from every edge, at entry points three tiles apart (each one cleared)
    const pts = [], xs = [], ys = [];
    for (let x = 0; x < FW - 16; x += 48) xs.push(x);
    xs.push(FW - 16);
    for (let y = 48; y < FH - 48; y += 48) ys.push(y);
    for (const x of xs) pts.push([x, 0, 2], [x, FH - 16, 0]);
    for (const y of ys) pts.push([0, y, 1], [FW - 16, y, 3]);
    this.svSpawns = pts;
    for (const [x, y] of pts) this.clearArea(x, y, 16, 16);
    // you start in the middle
    const cx = Math.round(FW / 16) * 8, cy = Math.round(FH / 16) * 8;
    this.vsSpawn = [[cx - 24, cy - 16], [cx + 8, cy - 16], [cx - 24, cy + 16], [cx + 8, cy + 16]];
    this.clearArea(cx - 32, cy - 24, 64, 64);
    this.wave = 0;
    this.waveBreak = 0;
    this.total = 0;
    this.svStartWave(1);
  },

  // ------------------------------------------------------------ waves
  // which twist wave w has (null: none); the same for the whole run (from its seed)
  svTwist(w) {
    if (!this.svPlan) {
      const r = seeded(this.svSeed * 31 + 5), used = {}, plan = [];
      let last = null;
      for (let v = 1; v <= SV_WAVES; v++) {
        if (v === SV_WAVES) { plan[v] = 'final'; continue; }
        if (v % SV_TWIST_EVERY) continue;
        const ok = Object.keys(SV_TWISTS).filter(k => k !== 'final' && k !== last && SV_TWISTS[k].from <= v
          && (SV_TWISTS[k].type === undefined || Config.get('e' + SV_TWISTS[k].type + 'On') !== 'OFF'));
        if (!ok.length) continue;
        const wt = ok.map(k => 1 / (1 + (used[k] || 0) * 2)), sum = wt.reduce((a, b) => a + b, 0);
        let x = r() * sum, k = 0;
        while (k < ok.length - 1 && x >= wt[k]) { x -= wt[k]; k++; }
        plan[v] = last = ok[k];
        used[last] = (used[last] || 0) + 1;
      }
      this.svPlan = plan;
    }
    return this.svPlan[w] || null;
  },

  // the tanks of wave w
  svQueue(w, key) {
    const tw = key ? SV_TWISTS[key] : null, coop = 1 + 0.35 * this.extraPlayers;
    let count = Math.min(SV_CAP, 4 + 2 * w) * coop * (tw && tw.count || 1);
    count = Math.max(4, Math.min(Math.round(45 * coop), Math.round(count)));
    const q = buildQueue(Math.min(60, 1 + Math.round(w * 0.6)), count);
    if (tw && tw.type !== undefined) q.forEach((e, i) => { if (!tw.every || i % tw.every === tw.every - 1) e.type = tw.type; });
    else if (!tw) this.seasonEnemies(q);
    const r = seeded(this.svSeed + w * 977), sk = Config.skill().aggr;
    for (const e of q) {
      if (tw && tw.light) e.rank = 0;
      if (tw && tw.rank) e.rank = Math.max(e.rank || 0, tw.rank);
      const vr = ENEMY_RANKS[e.rank || 0];
      let hp = Config.enemy(e.type).hp + (vr ? vr.hp : 0);
      // past the size cap they get more armour instead
      if (!(tw && tw.light)) {
        if (r() < Math.min(0.75, Math.max(0, (w - 12) * 0.009))) hp++;
        if (r() < Math.min(0.5, Math.max(0, (w - 40) * 0.008))) hp++;
      }
      e.hp = hp;
      // ... and more of them hunt you (none go for an eagle: there isn't one)
      const wt = [Math.max(0.1, 0.6 - w * 0.008) / sk, 0, (1 + w * 0.025) * sk, 0.4 + w * 0.004];
      let x = r() * (wt[0] + wt[2] + wt[3]);
      e.ai = x < wt[0] ? AI.WANDER : x < wt[0] + wt[2] ? AI.HUNT : AI.SNIPE;
      if (tw && tw.speed) e.extra = { speedMul: tw.speed };
    }
    return q;
  },

  svStartWave(w) {
    const key = this.svTwist(w), tw = key ? SV_TWISTS[key] : null;
    this.wave = w;
    this.svTwistNow = key;
    this.queue = this.svQueue(w, key);
    this.total += this.queue.length;
    const sk = Config.skill(), extra = this.extraPlayers;
    this.maxEnemies = Math.max(2, Config.get('maxOnScreen') + Math.min(4, Math.floor((w - 1) / 18)) + sk.maxOn + extra + (tw && tw.maxOn || 0));
    this.spawnInterval = Math.round(Math.max(36, 150 - (w - 1) * 1.15) * (1 - 0.08 * extra) * (tw && tw.spawn || 1) / Config.scale('spawnRate') / sk.spawn);
    this.spawnTimer = 30;
    this.svLost = 0;
    this.weather = tw && tw.weather ? tw.weather : this.svWeather0;
    this.svRainT = 150;
    this.svNotes = [];
    if (tw) this.svNotes.push({ text: tw.name + '!', color: COL.red, t: 0, life: 180 });
    const next = this.svTwist(w + 1);
    if (next) this.svNotes.push({ text: 'NEXT WAVE: ' + SV_TWISTS[next].name, color: COL.gold, t: -200, life: 180 });
  },

  // called every frame while the field is empty: the wave was beaten, the breather, then the next one
  nextWave() {
    if (this.svWon) { if (++this.svWinT >= 300 && !this.result) this.result = 'svwin'; return; }
    if (this.waveBreak > 0) {
      if (--this.waveBreak === 0) this.svStartWave(this.wave + 1);
      return;
    }
    const w = this.wave, live = this.players.filter(p => !p.out);
    this.svRockets = [];
    this.weather = this.svWeather0;
    for (const p of live) this.addXp(p, 10 + w * 2);
    // a perfect wave: points and a power-up beside each of you
    if (this.svLost === 0) {
      const pts = 1000 + w * 100;
      for (const p of live) this.addScore(p, pts);
      this.svPerfect = { pts, t: 150 };
      for (const p of live) if (p.tank) this.svDrop(p.tank);
    } else this.svPerfect = null;
    if (w % 10 === 0) for (const p of live) if (!Config.infiniteLives()) p.lives++;
    Sound.play('bonus');
    if (w >= SV_WAVES) { this.svWon = true; this.svWinT = 0; return; }
    // the map partly rebuilt, power-ups around it, armour plates regrown
    this.svRebuild();
    const n = 2 + rnd(2) + this.extraPlayers + svPerkOf(this.players[0], 'scav');
    for (let k = 0; k < n; k++) this.svDrop();
    const plates = svPerkOf(this.players[0], 'plate');
    for (const t of this.tanks) if (t.isPlayer && !t.ally && t.alive) t.plates = Math.max(t.plates, plates);
    this.waveBreak = SV_BREAK;
    if (w % 5 === 0) this.svOfferPerks();
  },

  // put back a random 10-60% of the wrecked terrain (not under a tank, a mine or a power-up)
  svRebuild() {
    const orig = this.svOrig;
    if (!orig || orig.length !== this.terrain.length) return;
    const frac = 0.1 + Math.random() * 0.5;
    const gone = i => orig[i] !== T_EMPTY && this.terrain[i] !== orig[i] && this.terrain[i] !== T_BRIDGE;
    const busy = (x, y) => this.tanks.some(t => t.alive && overlap(t.x - 2, t.y - 2, 20, 20, x, y, 8, 8))
      || this.spawns.some(s => overlap(s.x, s.y, 16, 16, x, y, 8, 8))
      || this.svDrops.some(d => overlap(d.x, d.y, 16, 16, x, y, 8, 8))
      || this.mines.some(m => overlap(m.x - 4, m.y - 4, 8, 8, x, y, 8, 8));
    let n = 0;
    for (let by = 0; by < GH / 2; by++) for (let bx = 0; bx < GW / 2; bx++) {
      const cells = [[bx * 2, by * 2], [bx * 2 + 1, by * 2], [bx * 2, by * 2 + 1], [bx * 2 + 1, by * 2 + 1]].filter(([x, y]) => gone(y * GW + x));
      if (!cells.length || Math.random() >= frac || busy(bx * 8, by * 8)) continue;
      for (const [x, y] of cells) this.set(x, y, orig[y * GW + x]);
      n++;
    }
    if (n) {
      Sound.play('build');
      this.svNotes.push({ text: 'MAP REBUILT ' + Math.round(frac * 100) + '%', color: COL.lgrey, t: -60, life: 150 });
    }
  },

  // a power-up left on the ground for 30 s: anywhere, or near a tank
  svDrop(near) {
    const nextKey = this.svTwist(this.wave + 1), dark = nextKey && SV_TWISTS[nextKey].weather;
    const weights = POWERUPS.map((pu, i) => (Config.get('pu' + i) === 'OFF' || i === PU.SHOVEL || (i === PU.NIGHT && !dark) ? 0 : pu.weight));
    const total = weights.reduce((a, b) => a + b, 0);
    if (!total) return;
    let r = rnd(total), type = 0;
    while (r >= weights[type]) { r -= weights[type]; type++; }
    const OPEN = [T_EMPTY, T_FOREST, T_ICE, T_MUD, T_BRIDGE];
    const free = (x, y) => {
      if (x < 0 || y < 0 || x > FW - 16 || y > FH - 16) return false;
      for (let cy = y >> 2; cy < (y + 16) >> 2; cy++) for (let cx = x >> 2; cx < (x + 16) >> 2; cx++) if (!OPEN.includes(this.get(cx, cy))) return false;
      return !this.tanks.some(t => t.alive && overlap(t.x, t.y, 16, 16, x, y, 16, 16)) && !this.svDrops.some(d => overlap(d.x, d.y, 16, 16, x - 8, y - 8, 32, 32));
    };
    let x = -1, y = -1;
    for (let k = 0; k < 120 && x < 0; k++) {
      const cx = near ? Math.round((near.x + rnd(81) - 40) / 8) * 8 : rnd((FW - 16) / 8 + 1) * 8;
      const cy = near ? Math.round((near.y + rnd(81) - 40) / 8) * 8 : rnd((FH - 16) / 8 + 1) * 8;
      if (free(cx, cy) && (near || !this.svSpawns.some(([sx, sy]) => overlap(sx - 16, sy - 16, 48, 48, cx, cy, 16, 16)))) { x = cx; y = cy; }
    }
    if (x < 0) return;
    const d = { type, x, y, t: 0 };
    if (type === PU.WEAPON) d.weapon = this.crateWeapon();
    this.svDrops.push(d);
    Sound.play('puAppear');
  },

  // ------------------------------------------------------------ perks
  svOfferPerks() {
    const have = this.players[0].svPerks || {};
    const pool = SV_PERKS.filter(p => (have[p.key] || 0) < p.max && !(p.key === 'lives' && Config.infiniteLives()));
    const opts = [];
    while (opts.length < 3 && pool.length) opts.push(pool.splice(rnd(pool.length), 1)[0].key);
    if (opts.length) this.svPick = { opts, idx: 0, t: 0 };
  },

  svPickInput() {
    const pk = this.svPick;
    if (++pk.t < 30) return;   // a moment before it takes your fire button, so you don't pick by accident
    const m = Input.menu();
    if (m.up || m.left) { pk.idx = (pk.idx + pk.opts.length - 1) % pk.opts.length; Sound.play('select'); }
    if (m.down || m.right) { pk.idx = (pk.idx + 1) % pk.opts.length; Sound.play('select'); }
    if (m.fire) this.svTakePerk(pk.opts[pk.idx]);
  },

  svTakePerk(key) {
    this.svPick = null;
    for (const p of this.players) {
      p.svPerks = Object.assign({}, p.svPerks);
      p.svPerks[key] = (p.svPerks[key] || 0) + 1;
    }
    if (key === 'lives') for (const p of this.players) { p.lives += 2; if (p.out) this.revive(p, null); }
    for (const t of this.tanks) if (t.isPlayer && !t.ally && t.alive) {
      if (key === 'plate') t.plates++;
      t.applyLevel();
    }
    Sound.play('levelUp');
    this.svNotes.push({ text: svPerkInfo(key).name + '!', color: COL.gold, t: 0, life: 120 });
  },

  // ------------------------------------------------------------ every frame
  svTick() {
    // power-ups on the ground: yours to take (the enemy leaves them alone)
    for (const d of this.svDrops) {
      d.t++;
      const t = this.tanks.find(t => t.alive && t.isPlayer && !t.ally && overlap(t.x, t.y, 16, 16, d.x + 2, d.y + 2, 12, 12));
      if (t) { d.gone = true; this.applyPowerup(t, d); }
      else if (d.t >= SV_DROP_LIFE) d.gone = true;
    }
    this.svDrops = this.svDrops.filter(d => !d.gone);
    for (const n of this.svNotes) n.t++;
    this.svNotes = this.svNotes.filter(n => n.t < n.life);
    if (this.svPerfect && --this.svPerfect.t <= 0) this.svPerfect = null;
    // rocket rain: shells from the sky land near you, a shadow marks the spot first
    const tw = this.svTwistNow && SV_TWISTS[this.svTwistNow];
    if (tw && tw.rain && !this.waveBreak && !this.over && !this.freezeE) {
      const ps = this.tanks.filter(t => t.alive && t.isPlayer && !t.ally);
      if (--this.svRainT <= 0 && ps.length) {
        this.svRainT = Math.max(50, 130 - this.wave) + rnd(40);
        const p = ps[rnd(ps.length)];
        this.svRockets.push({ x: Math.max(8, Math.min(FW - 8, p.x + 8 + rnd(65) - 32)), y: Math.max(8, Math.min(FH - 8, p.y + 8 + rnd(65) - 32)), t: 75 });
      }
    }
    for (const k of this.svRockets) {
      if (--k.t > 0) continue;
      k.done = true;
      this.blast(k.x, k.y, 16, false, null, false);
      this.addFx(k.x, k.y, BIG_EXPLOSION(), 4);
      Sound.play('explode');
    }
    this.svRockets = this.svRockets.filter(k => !k.done);
  },

  // ------------------------------------------------------------ checkpoints
  svCheckpoint() {
    return { seed: this.svSeed, map: this.svMap, theme: this.theme, cols: COLS, rows: ROWS, terrain: terrainCode(this.terrain) };
  },
  svResume(at) {
    if (!this.svOrig) this.svOrig = this.terrain.slice();
    const sv = at.sv;
    if (sv && typeof sv.terrain === 'string' && sv.terrain.length === this.terrain.length) {
      for (let i = 0; i < this.terrain.length; i++) this.terrain[i] = sv.terrain.charCodeAt(i) - 48;
      this.dirty = true;
      this.terrainVer = (this.terrainVer || 0) + 1;
    }
    this.total = 0;
    this.svStartWave(Math.max(1, Math.min(SV_WAVES, at.wave | 0)));
  },

  // ------------------------------------------------------------ drawing
  // in the field's coordinates: power-ups on the ground, rocket shadows and the rockets coming down
  svRenderWorld(ctx) {
    for (const d of this.svDrops || []) {
      if (d.t > SV_DROP_LIFE - 180 && (d.t >> 3) & 1) continue;
      drawPowerup(ctx, d, d.x, d.y);
    }
    for (const k of this.svRockets || []) {
      const s = Math.round(4 + (75 - k.t) / 8);
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(k.x - s, k.y - s / 2, s * 2, s);
      if (k.t < 30 && (k.t >> 2) & 1) {
        ctx.fillStyle = '#F83800';
        ctx.fillRect(k.x - 6, k.y, 13, 1); ctx.fillRect(k.x, k.y - 6, 1, 13);
      }
      // the rocket on its way down
      const ry = k.y - k.t * 3;
      ctx.fillStyle = '#F8F8F8'; ctx.fillRect(k.x - 1, ry - 6, 3, 6);
      ctx.fillStyle = (k.t >> 1) & 1 ? '#F8B800' : '#F83800'; ctx.fillRect(k.x - 1, ry - 10, 3, 4);
    }
  },

  // on the screen: the wave announcements, the perk pick, the end
  svRenderBanner(ctx) {
    const cx = VIEW_W / 2, cy = VIEW_H / 2;
    this.svNotes.forEach((n, i) => { if (n.t >= 0) Font.drawCenter(ctx, n.text, cx, VIEW_H - 14 - i * 10, n.color); });   // low: the cards and season news are at the top
    if (this.svWon) {
      Font.drawCenter(ctx, 'ALL ' + SV_WAVES + ' WAVES HELD!', cx, cy - 12, COL.gold);
      if ((this.frame >> 4) & 1) Font.drawCenter(ctx, 'VICTORY!', cx, cy + 4, COL.white);
      return;
    }
    if (this.svPick) { this.svRenderPick(ctx); return; }
    if (!this.waveBreak) return;
    if (this.svPerfect) {
      Font.drawCenter(ctx, 'PERFECT WAVE!', cx, cy - 40, COL.gold);
      Font.drawCenter(ctx, '+' + this.svPerfect.pts + ' AND A POWER-UP', cx, cy - 30, COL.white);
    }
    const w = this.wave + 1, key = this.svTwist(w);
    if ((this.waveBreak >> 4) & 1) Font.drawCenter(ctx, 'WAVE ' + w + ' OF ' + SV_WAVES, cx, cy - 4, COL.gold);
    if (key) {
      Font.drawCenter(ctx, SV_TWISTS[key].name, cx, cy + 10, COL.red);
      Font.drawCenter(ctx, SV_TWISTS[key].desc, cx, cy + 20, COL.white);
    }
  },

  svRenderPick(ctx) {
    const pk = this.svPick, cx = VIEW_W / 2, y0 = Math.round(VIEW_H / 2 - 52), have = this.players[0].svPerks || {};
    ctx.fillStyle = 'rgba(0,0,0,0.78)';
    ctx.fillRect(0, y0 - 6, VIEW_W, 104);
    Font.drawCenter(ctx, 'WAVE ' + this.wave + ' HELD: PICK A PERK', cx, y0, COL.gold);
    pk.opts.forEach((key, i) => {
      const pi = svPerkInfo(key), y = y0 + 20 + i * 26, on = i === pk.idx, lv = (have[key] || 0) + 1;
      Font.drawCenter(ctx, (on ? '> ' : '') + pi.name + (lv > 1 && pi.max > 1 && pi.max < 99 ? ' ' + lv : '') + (on ? ' <' : ''), cx, y, on ? COL.gold : COL.white);
      Font.drawCenter(ctx, pi.desc, cx, y + 10, on ? COL.white : COL.lgrey);
    });
  },

  // online: what a guest needs to see
  svView() {
    return { s: this.svSeed, k: this.svPick, d: this.svDrops.map(d => [d.type, d.x, d.y, d.t, d.weapon || 0]), r: this.svRockets.map(k => [k.x, k.y, k.t]),
      n: this.svNotes, pf: this.svPerfect || null, w: this.svWon ? 1 : 0, tn: this.svTwistNow || null };
  },
  applySvView(v) {
    if (!v) return;
    if (this.svSeed !== v.s) { this.svSeed = v.s; this.svPlan = null; }
    this.svPick = v.k || null;
    this.svDrops = v.d.map(a => ({ type: a[0], x: a[1], y: a[2], t: a[3], weapon: a[4] || undefined }));
    this.svRockets = v.r.map(a => ({ x: a[0], y: a[1], t: a[2] }));
    this.svNotes = v.n || []; this.svPerfect = v.pf; this.svWon = !!v.w; this.svTwistNow = v.tn;
  },
});

// ------------------------------------------------------------ hooks into the stage
(() => {
  const P = Stage.prototype;
  const update = P.update;
  P.update = function () {
    if (!this.survival || this.galaxy) return update.call(this);
    if (!this.svOrig) this.svOrig = this.terrain.slice();   // the map as it began: what gets rebuilt
    if (this.svPick) { this.frame++; this.svPickInput(); return; }   // everything waits for the perk
    update.call(this);
    this.svTick();
  };

  // enemies come in from any edge, away from you if they can
  const spawning = P.updateSpawning;
  P.updateSpawning = function () {
    if (!this.survival || !this.svSpawns) return spawning.call(this);
    if (!this.queue.length) return;
    if (this.spawnTimer > 0) { this.spawnTimer--; return; }
    const onField = this.tanks.filter(t => !t.isPlayer).length + this.spawns.filter(s => s.enemy).length;
    if (onField >= this.maxEnemies) return;
    const ps = this.tanks.filter(t => t.isPlayer && t.alive);
    const free = this.svSpawns.filter(([x, y]) => !this.tanks.some(t => t.alive && overlap(t.x, t.y, 16, 16, x, y, 16, 16)) && !this.spawns.some(s => overlap(s.x, s.y, 16, 16, x, y, 16, 16)));
    if (!free.length) return;
    const far = free.filter(([x, y]) => ps.every(t => Math.hypot(t.x - x, t.y - y) >= 96));
    const pool = far.length ? far : free, [x, y, dir] = pool[rnd(pool.length)];
    const item = this.queue.shift();
    item.extra = Object.assign({}, item.extra, { dir });
    this.spawns.push({ x, y, t: SPARKLE_TIME, enemy: item });
    if (item.bonus) this.powerup = null;
    this.spawnTimer = this.spawnInterval;
  };

  // a perfect wave is one where nobody loses a tank
  const hitPlayer = P.hitPlayer;
  P.hitPlayer = function (t, by) {
    const was = t.alive;
    hitPlayer.call(this, t, by);
    if (this.survival && was && !t.alive && t.isPlayer && !t.ally) this.svLost = (this.svLost || 0) + 1;
  };

  // perks: LONG FUSE stretches timed power-ups, BOUNTY the points
  const applyPowerup = P.applyPowerup;
  P.applyPowerup = function (t, pu) {
    applyPowerup.call(this, t, pu);
    const f = this.survival && t.isPlayer ? svPerkOf(t.player, 'fuse') : 0;
    if (!f) return;
    const k = TIMED_BOOSTS[pu.type];
    if (k && t.boost[k]) t.boost[k] = Math.round(t.boost[k] * (1 + 0.5 * f));
    if (pu.type === PU.HELMET) t.shield = Math.round(t.shield * (1 + 0.5 * f));
  };
  const addScore = P.addScore;
  P.addScore = function (p, n) {
    const b = this.survival ? svPerkOf(p, 'bounty') : 0;
    return addScore.call(this, p, b ? Math.round(n * (1 + 0.25 * b)) : n);
  };

  // a paid revival makes the next one dearer (free ones, from SPARE TANKS or the REVIVE power-up, don't count)
  const revive = P.revive;
  P.revive = function (p, payer) {
    revive.call(this, p, payer);
    if (this.survival && payer) for (const q of this.players) q.svRevives = (q.svRevives || 0) + 1;
  };
  // above the field: the points you can spend on a revival, and what the next one costs
  const objLine = P.renderObjectiveLine;
  P.renderObjectiveLine = function (ctx) {
    if (!this.survival || !reviveCost()) return objLine.call(this, ctx);
    const pts = Math.max(...this.players.map(wallet));
    Font.drawCenter(ctx, 'PTS ' + pts + '  REVIVE ' + reviveCost(), FX + VIEW_W / 2, 0, COL.black);
  };
  const banner = P.renderModeBanner;
  P.renderModeBanner = function (ctx) {
    if (this.survival && this.svNotes) { this.svRenderBanner(ctx); return; }
    banner.call(this, ctx);
  };
  const world = P.renderBigMap;
  P.renderBigMap = function (ctx) {
    world.call(this, ctx);
    if (this.survival) this.svRenderWorld(ctx);
  };

  // the perks on a player's tank
  const applyLevel = Tank.prototype.applyLevel;
  Tank.prototype.applyLevel = function () {
    const p = this.player, star = svPerkOf(p, 'star');
    if (star && p.level < Math.min(3, star)) p.level = Math.min(3, star);
    applyLevel.call(this);
    if (!p || !p.svPerks || Game.mode !== 'survival') return;
    this.speed *= Math.pow(1.12, svPerkOf(p, 'engine'));
    this.bulletSpeed *= Math.pow(1.25, svPerkOf(p, 'shells'));
    this.reload = Math.max(4, Math.round(this.reload * Math.pow(0.75, svPerkOf(p, 'reload'))));
    this.maxBullets += svPerkOf(p, 'twin');
    if (svPerkOf(p, 'ap')) this.power = true;
    if (!this.svInit) {   // a fresh tank: its plates and its spawn shield
      this.svInit = true;
      this.plates = Math.max(this.plates, svPerkOf(p, 'plate'));
      this.shield = Math.round(this.shield * (1 + svPerkOf(p, 'shield')));
    }
  };

  // ------------------------------------------------------------ the game around it
  const ckAt = Game.ckAt;
  Game.ckAt = function (st) {
    if (st.survival && st.svSpawns) return { wave: st.wave, sv: st.svCheckpoint() };
    return ckAt.call(this, st);
  };
  // a new run's first checkpoint (taken before the map was picked) gets the map, so a reload in wave 1 brings back
  // the same one; so does RESTART ROUND
  const beginStage = Game.beginStage;
  Game.beginStage = function () {
    beginStage.apply(this, arguments);
    const st = this.stage;
    if (this.mode !== 'survival' || !st || !st.svSpawns) return;
    const at = this.ckAt(st);
    if (this.roundSave && !(this.roundSave.resume && this.roundSave.resume.sv)) this.roundSave.resume = at;
    if (this.ck && !(this.ck.at && this.ck.at.sv)) { this.ck.at = at; this.autoSave(); }
  };
  const ckApply = Game.ckApply;
  Game.ckApply = function (at) {
    const st = this.stage;
    if (st && st.survival && st.svSpawns && at && (at.wave > 1 || at.sv)) { st.svResume(at); return; }
    return ckApply.call(this, at);
  };

  // online: drops, rockets, notes and the perk pick go to the guests
  const stageView = Net.stageView;
  Net.stageView = function (st, full) {
    const v = stageView.call(this, st, full);
    if (st.survival && st.svSpawns) v.svx = st.svView();
    return v;
  };
  const applyStage = Net.applyStage;
  Net.applyStage = function (sv) {
    applyStage.call(this, sv);
    if (sv.svx && Game.stage) Game.stage.applySvView(sv.svx);
  };
})();
