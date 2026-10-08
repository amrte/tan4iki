'use strict';
// =====================================================================
//  FORTRESS: tower defense. Hold your eagle through 30 waves on one of four maps (picked on the curtain).
//  Your tank is the builder: drive up to a spot and press B to open the build menu for the tile in front of you
//  (left/right choose, fire builds, B closes). Point it at one of your towers to upgrade it, choose what it aims
//  at, repair or sell it. You fight too, and a destroyed tank comes back after a moment.
//  Gold: for every kill, a bonus for every wave, 5% interest on what you save (up to 40), gold mines, and a bonus for
//  calling a wave early (SEND WAVE in the menu, or Tab). The eagle has HP (20 on Hurt me plenty): every hit costs 1.
//  Towers: 8 kinds, 3 levels each, and at the top most of them can specialise one of two ways. Enemy shells and
//  blasts damage towers; towers fire over walls. Walls (brick, steel) and towers reroute the enemy, but you can
//  never shut every way to the eagle. Pause menu -> SPEED: 1X / 2X / 3X. Clear wave 30 for 1-3 stars (by eagle HP).
// =====================================================================

const TD_WAVES = 30, TD_FIRST_BUILD = 1800, TD_BUILD = 900, TD_INTEREST = 0.05, TD_INTEREST_MAX = 40, TD_SELL = 0.7;
const TD_START_GOLD = [400, 325, 260, 230, 200], TD_EAGLE_HP = [30, 25, 20, 15, 10], TD_HP_MULT = [0.7, 0.85, 1, 1.15, 1.3];
const TD_BUFF_RANGE = 48;
const TD_TARGETS = ['FIRST', 'LAST', 'STRONG', 'CLOSE'];

const TOWERS = {
  gun: { name: 'GUN TOWER', desc: 'QUICK SHOTS, ONE TARGET', cost: [60, 70, 100], hp: 6,
    lv: [{ range: 56, cd: 36, dmg: 1 }, { range: 64, cd: 30, dmg: 1.5 }, { range: 72, cd: 24, dmg: 2 }],
    specs: [{ key: 'gatling', name: 'GATLING', desc: 'A HAIL OF BULLETS', cost: 220, range: 72, cd: 7, dmg: 1 },
      { key: 'sniper', name: 'SNIPER', desc: 'FAR, HEAVY, SEES STEALTH', cost: 240, range: 168, cd: 75, dmg: 9, seeStealth: true, fast: true }] },
  cannon: { name: 'CANNON', desc: 'SPLASH; NOT TOO CLOSE', cost: [90, 100, 140], hp: 8,
    lv: [{ range: 72, min: 20, cd: 90, dmg: 2, splash: 14 }, { range: 76, min: 20, cd: 80, dmg: 3, splash: 16 }, { range: 84, min: 20, cd: 70, dmg: 4, splash: 18 }],
    specs: [{ key: 'howitzer', name: 'HOWITZER', desc: 'HUGE BLASTS FROM AFAR', cost: 300, range: 136, min: 32, cd: 110, dmg: 7, splash: 28 },
      { key: 'cluster', name: 'CLUSTER', desc: 'SHELLS BURST INTO BOMBLETS', cost: 280, range: 88, min: 20, cd: 80, dmg: 3, splash: 14, cluster: 4 }] },
  tesla: { name: 'TESLA', desc: 'LIGHTNING JUMPS ON', cost: [110, 110, 160], hp: 6,
    lv: [{ range: 44, cd: 60, dmg: 1.5, chain: 2 }, { range: 48, cd: 52, dmg: 2, chain: 3 }, { range: 56, cd: 44, dmg: 3, chain: 4 }],
    specs: [{ key: 'storm', name: 'STORM', desc: 'CHAINS TO 9 TANKS', cost: 320, range: 64, cd: 44, dmg: 3, chain: 9 },
      { key: 'emp', name: 'EMP', desc: 'STUNS WHAT IT HITS', cost: 300, range: 56, cd: 60, dmg: 2.5, chain: 4, stun: 70 }] },
  frost: { name: 'FROST', desc: 'SLOWS ALL AROUND IT', cost: [80, 80, 120], hp: 6,
    lv: [{ range: 36, slow: 0.6 }, { range: 44, slow: 0.5 }, { range: 52, slow: 0.4 }],
    specs: [{ key: 'blizzard', name: 'BLIZZARD', desc: 'SLOWER STILL, AND IT HURTS', cost: 260, range: 60, slow: 0.3, dps: 0.8 },
      { key: 'shatter', name: 'SHATTER', desc: 'CHILLED TANKS: DOUBLE DAMAGE', cost: 240, range: 52, slow: 0.45, brittle: true }] },
  flame: { name: 'FLAMER', desc: 'BURNS ALL IN A SHORT CONE', cost: [100, 100, 150], hp: 8,
    lv: [{ range: 32, dps: 2.5 }, { range: 36, dps: 3.5 }, { range: 40, dps: 5 }],
    specs: [{ key: 'inferno', name: 'INFERNO', desc: 'TWICE THE HEAT', cost: 300, range: 44, dps: 10 },
      { key: 'napalm', name: 'NAPALM', desc: 'LEAVES THE GROUND BURNING', cost: 260, range: 44, dps: 5, napalm: true }] },
  rocket: { name: 'ROCKETS', desc: 'FAR, HOMING, BEATS ARMOR', cost: [130, 130, 180], hp: 6,
    lv: [{ range: 96, cd: 100, dmg: 4 }, { range: 104, cd: 90, dmg: 5 }, { range: 112, cd: 80, dmg: 7 }],
    specs: [{ key: 'swarm', name: 'SWARM', desc: '4 ROCKETS AT ONCE', cost: 320, range: 112, cd: 90, dmg: 3, salvo: 4 },
      { key: 'buster', name: 'BUSTER', desc: 'ONE HUGE HIT, PIERCES SHIELDS', cost: 340, range: 128, cd: 110, dmg: 16, pierce: true }] },
  radar: { name: 'RADAR', desc: 'SHOWS STEALTH, +RANGE NEAR', cost: [70, 80, 110], hp: 5,
    lv: [{ range: 72, boost: 0.15 }, { range: 88, boost: 0.22 }, { range: 104, boost: 0.3 }], specs: [] },
  mine: { name: 'GOLD MINE', desc: 'GOLD AFTER EVERY WAVE', cost: [100, 120, 160], hp: 6,
    lv: [{ income: 25 }, { income: 50 }, { income: 90 }], specs: [] },
};
const TOWER_KINDS = Object.keys(TOWERS);
const TD_WALLS = { brick: { name: 'BRICK WALL', desc: 'SLOWS THEM: THEY SHOOT THROUGH', cost: 5 }, steel: { name: 'STEEL WALL', desc: 'THEY MUST GO ROUND', cost: 20 } };
const TD_ABILITIES = { strike: { name: 'AIR STRIKE', desc: 'BOMBS THE BUSIEST ROW', cost: 150, cool: 1800 }, wing: { name: 'WINGMAN', desc: 'A TANK FIGHTS BESIDE YOU', cost: 100, cool: 2700 } };

// the maps: 21 x 17 tiles; @ steel, ~ water, % trees, _ ice, # brick, S an enemy entry
const TD_MAPS = [
  { key: 'meadow', name: 'MEADOW', diff: 'EASY', theme: 'spring', rows: [
    '..........S..........', '.....................', '...%%..........%%....', '...%%...@@@....%%....', '.........@...........',
    '..@@...........@@....', '.....................', '.......%%...%%.......', '~~.....%%...%%.....~~', '~~.................~~',
    '.....@@.......@@.....', '.....................', '...%%...........%%...', '...%%...........%%...', '.....................',
    '.....................', '.....................'] },
  { key: 'river', name: 'RIVER', diff: 'NORMAL', theme: 'summer', rows: [
    '...S.............S...', '.....................', '..%%.............%%..', '..%%....@...@....%%..', '.....................',
    '.....................', '~~~~~~~~..~~~..~~~~~~', '~~~~~~~~..~~~..~~~~~~', '.....................', '....@@.........@@....',
    '.....................', '..%%.............%%..', '..%%.............%%..', '.....................', '......@.......@......',
    '.....................', '.....................'] },
  { key: 'canyon', name: 'CANYON', diff: 'NORMAL', theme: 'desert', rows: [
    'S....................', '.....................', '@@@@@@@@@@@@@@@@@....', '.....................', '.....................',
    '....@@@@@@@@@@@@@@@@@', '.....................', '.....................', '@@@@@@@@@@@@@@@@@....', '.....................',
    '.....................', '....@@@@@@@@@@@@@@@@@', '.....................', '.....................', '.....................',
    '.....................', '.....................'] },
  { key: 'crossroads', name: 'CROSSROADS', diff: 'HARD', theme: 'winter', rows: [
    '..........S..........', 'S...................S', '...@@...........@@...', '...@.............@...', '.......%%...%%.......',
    '.......%%...%%.......', '.....................', '..........@..........', '.....................', '.......%%...%%.......',
    '.......%%...%%.......', '...@.............@...', '...@@...........@@...', '.....................', '.....................',
    '.....................', '.....................'] },
];
const TD_W = 21, TD_H = 17;

// a map as 8px blocks, and its entry points (px)
function tdMapBlocks(m) {
  const blocks = [], spawns = [];
  m.rows.forEach((row, y) => {
    let r = '';
    for (let x = 0; x < TD_W; x++) {
      const c = row[x] || '.';
      if (c === 'S') spawns.push([x * 16, y * 16]);
      r += (c === 'S' ? '.' : c).repeat(2);
    }
    blocks.push(r, r);
  });
  return { blocks, spawns };
}

// what wave w brings: [{type, hp}], how far apart they come, and its kind (for the preview)
function tdWave(w, lv, season) {
  const mult = (1 + (w - 1) * 0.16 + Math.max(0, w - 20) * 0.08) * TD_HP_MULT[lv];
  const pool = [[0, 3]];
  const add = (from, type, wt) => { if (w >= from && Config.get('e' + type + 'On') !== 'OFF') pool.push([type, wt]); };
  add(3, 1, 2); add(4, 2, 1.5); add(5, 10, 0.7); add(6, 3, 1); add(7, 4, 0.6); add(8, 7, 0.5); add(9, 13, 0.4);
  add(11, 5, 0.6); add(12, 12, 0.6); add(13, 6, 0.5); add(15, 9, 0.4); add(16, 14, 0.3); add(18, 11, 0.5);
  if (season !== undefined) add(6, season, 0.6);
  const kind = w % 10 === 0 ? 'BOSS' : w % 5 === 3 ? 'SWARM' : w % 5 === 4 ? 'HEAVY' : w % 7 === 2 ? 'FAST' : 'MIXED';
  let n = Math.min(50, 5 + Math.floor(w * 1.8)), gap = 55, list = [];
  const pick = filter => {
    const p = pool.filter(([t]) => filter(t)), tot = p.reduce((a, q) => a + q[1], 0);
    let r = Math.random() * tot;
    for (const [t, wt] of p) { if (r < wt) return t; r -= wt; }
    return p.length ? p[0][0] : 0;
  };
  const hp = t => Math.max(1, Math.round(Config.enemy(t).hp * mult));
  if (kind === 'SWARM') { n = Math.min(60, Math.round(n * 1.6)); gap = 22; for (let i = 0; i < n; i++) { const t = pick(t => t <= 1 || t === 10); list.push({ type: t, hp: Math.max(1, Math.round(hp(t) * 0.6)) }); } }
  else if (kind === 'HEAVY') { n = Math.max(3, Math.round(n * 0.5)); gap = 95; for (let i = 0; i < n; i++) { const t = pick(t => [3, 5, 11, 2, 4].includes(t)); list.push({ type: t, hp: hp(t) }); } }
  else if (kind === 'FAST') { gap = 35; for (let i = 0; i < n; i++) { const t = pick(t => [1, 10, 7, 0].includes(t)); list.push({ type: t, hp: hp(t) }); } }
  else for (let i = 0; i < n; i++) { const t = pick(() => true); list.push({ type: t, hp: hp(t) }); }
  if (kind === 'BOSS') for (let k = 0; k < w / 10; k++) list.splice(Math.floor(list.length * (k + 1) / (w / 10 + 1)), 0, { type: 17, hp: Math.round(16 * mult) });
  return { list, gap, kind };
}

Object.assign(Stage.prototype, {
  setupFortress(o) {
    const lv = tdSkill();
    this.td = { map: o.map, spawns: o.spawns, wave: 0, phase: 'build', timer: TD_FIRST_BUILD, gold: TD_START_GOLD[lv], list: [], gap: 55, spawnT: 0,
      kind: '', won: false, wonT: 0, cool: { strike: 0, wing: 0 }, lv, maxHp: TD_EAGLE_HP[lv], season: SEASON_ENEMY[this.theme] };
    this.td.next = tdWave(1, lv, this.td.season);
    this.towers = []; this.tdShots = []; this.tdBeams = []; this.tdSparks = [];
    this.queue = []; this.total = 0;
    this.eagleArmor = this.td.maxHp - 1;   // the eagle's HP: each hit costs 1
    this.vsSpawn = null;
  },

  // ------------------------------------------------------------ every frame
  updateFortress() {
    const td = this.td;
    if (td.won) { if (++td.wonT > 300) this.result = 'tdwin'; return; }
    for (const k in td.cool) if (td.cool[k] > 0) td.cool[k]--;
    if (Input.anyJust(['Tab']) && td.phase === 'build') this.tdSendWave();
    if (td.phase === 'build') {
      if (--td.timer <= 0) this.tdStartWave();
    } else {
      // release the wave, a tank at a time from the entry points in turn
      if (td.list.length && --td.spawnT <= 0 && this.freezeE <= 0) {
        const open = this.tdOpen(), [x, y] = open[(td.spawned++) % open.length];
        if (!this.tanks.some(t => t.alive && overlap(t.x, t.y, 16, 16, x, y, 16, 16)) && !this.spawns.some(s => s.enemy && s.x === x && s.y === y)) {
          const e = td.list.shift();
          this.spawns.push({ x, y, t: SPARKLE_TIME, enemy: { type: e.type, hp: e.hp, ai: AI.RUSH } });
          this.total++;
          td.spawnT = Math.round(td.gap / Config.skill().spawn);
        } else td.spawnT = 10;
      }
      if (!td.list.length && !this.spawns.some(s => s.enemy) && !this.tanks.some(t => t.alive && !t.isPlayer && !t.mirage)) this.tdWaveCleared();
    }
    this.updateTowers();
    this.updateTdShots();
    for (const b of this.tdBeams) b.t--;
    this.tdBeams = this.tdBeams.filter(b => b.t > 0);
    for (const s of this.tdSparks) { s.x += s.vx; s.y += s.vy; s.t--; }
    this.tdSparks = this.tdSparks.filter(s => s.t > 0);
  },

  // the entry points in use: a map with several opens them one at a time, a new one every 5 waves
  tdOpen(wave = this.td.wave) { return this.td.spawns.slice(0, Math.max(1, Math.min(this.td.spawns.length, 1 + Math.floor((wave - 1) / 5)))); },

  tdStartWave() {
    const td = this.td;
    td.wave++;
    if (td.wave > 1 && this.tdOpen().length > this.tdOpen(td.wave - 1).length) {
      const [x, y] = this.tdOpen()[this.tdOpen().length - 1];
      this.popups.push({ x: x + 8, y: y + 20, text: 'NEW ENTRY OPEN!', label: true, color: '#F83800', t: 0, delay: 0, life: 150 });
    }
    const w = td.next;
    td.list = w.list.slice(); td.gap = w.gap; td.kind = w.kind; td.spawnT = 30; td.spawned = 0;
    td.phase = 'wave';
    td.next = td.wave < TD_WAVES ? tdWave(td.wave + 1, td.lv, td.season) : null;
    this.popups.push({ x: (this.camX || 0) + VIEW_W / 2, y: (this.camY || 0) + 40, text: 'WAVE ' + td.wave + (w.kind !== 'MIXED' ? ': ' + w.kind : ''), label: true, color: w.kind === 'BOSS' ? '#F83800' : COL.gold, t: 0, delay: 0, life: 120 });
    Sound.play(w.kind === 'BOSS' ? 'bossWarn' : 'puAppear');
  },

  // call the next wave now: gold for the time left
  tdSendWave() {
    const td = this.td;
    if (td.phase !== 'build') return;
    const bonus = Math.ceil(td.timer / 60) * 2;
    if (bonus > 0) { td.gold += bonus; this.popups.push({ x: (this.camX || 0) + VIEW_W / 2, y: (this.camY || 0) + 56, text: 'EARLY +' + bonus, label: true, color: COL.gold, t: 0, delay: 0, life: 90 }); }
    this.tdStartWave();
  },

  tdWaveCleared() {
    const td = this.td;
    let gold = 20 + 3 * td.wave;
    const interest = Math.min(TD_INTEREST_MAX, Math.floor(td.gold * TD_INTEREST));
    const mines = this.towers.filter(t => t.kind === 'mine').reduce((a, t) => a + this.towerStat(t).income, 0);
    td.gold += gold + interest + mines;
    for (const t of this.towers) if (t.kind === 'mine') this.popups.push({ x: t.x + 8, y: t.y, text: '+' + this.towerStat(t).income, label: true, color: COL.gold, t: 0, delay: 0, life: 70 });
    this.popups.push({ x: (this.camX || 0) + VIEW_W / 2, y: (this.camY || 0) + 40, text: 'WAVE ' + td.wave + ' HELD +' + gold + (interest ? '  INTEREST +' + interest : ''), label: true, color: COL.gold, t: 0, delay: 0, life: 150 });
    for (const p of this.players) if (!p.out) this.addXp(p, 10 + td.wave);
    Sound.play('bonus');
    if (td.wave >= TD_WAVES) {
      td.won = true;
      const f = (this.eagleArmor + 1) / td.maxHp;
      td.stars = f >= 0.9 ? 3 : f >= 0.5 ? 2 : 1;
      this.popups.push({ x: (this.camX || 0) + VIEW_W / 2, y: (this.camY || 0) + 70, text: 'VICTORY! ' + '*'.repeat(td.stars), label: true, color: COL.gold, t: 0, delay: 0, life: 300 });
      Sound.play('levelUp');
      return;
    }
    td.phase = 'build'; td.timer = TD_BUILD;
  },

  // ------------------------------------------------------------ towers
  towerStat(tw) {
    const T = TOWERS[tw.kind], s = Object.assign({}, T.lv[tw.lv - 1], tw.spec !== undefined ? T.specs[tw.spec] : {});
    // a radar nearby stretches the range
    let boost = 0;
    for (const r of this.towers) if (r.kind === 'radar' && r !== tw && Math.hypot(r.x - tw.x, r.y - tw.y) <= TD_BUFF_RANGE) boost = Math.max(boost, TOWERS.radar.lv[r.lv - 1].boost);
    if (s.range && tw.kind !== 'radar') s.range = Math.round(s.range * (1 + boost));
    return s;
  },

  towerAt(x, y) { return (this.towers || []).find(t => t.x === x && t.y === y); },

  // what a tower can see: enemies in range (stealthy ones only when revealed, underground or airborne never)
  tdTargets(tw, s, cx, cy) {
    const out = [];
    for (const t of this.tanks) {
      if (!t.alive || t.isPlayer || t.burrow > 0 || t.hopT > 0) continue;
      if (t.stealth && !(t.reveal > 0) && !s.seeStealth) continue;
      const d = Math.hypot(t.x + 8 - cx, t.y + 8 - cy);
      if (d <= s.range && !(s.min && d < s.min)) out.push([t, d]);
    }
    return out;
  },

  tdPick(tw, list) {
    if (!list.length) return null;
    const mode = TD_TARGETS[tw.target || 0];
    if (mode === 'CLOSE') return list.reduce((a, b) => (b[1] < a[1] ? b : a))[0];
    if (mode === 'STRONG') return list.reduce((a, b) => (b[0].hp > a[0].hp ? b : a))[0];
    // first / last: along the way to the eagle
    const dist = this.navBase(''), NX = COLS * 2 - 1, NY = ROWS * 2 - 1;
    const left = t => { const v = dist[Math.max(0, Math.min(NY - 1, Math.round(t.y / 8))) * NX + Math.max(0, Math.min(NX - 1, Math.round(t.x / 8)))]; return v === Infinity ? 1e6 : v; };
    return list.reduce((a, b) => ((mode === 'FIRST' ? left(b[0]) < left(a[0]) : left(b[0]) > left(a[0])) ? b : a))[0];
  },

  updateTowers() {
    for (const t of this.tanks) if (!t.isPlayer) { t.chill = 1; t.brittle = false; }
    // radars first (they reveal), frost auras next (they slow and make brittle), then the guns
    const order = this.towers.slice().sort((a, b) => (a.kind === 'radar' ? 0 : a.kind === 'frost' ? 1 : 2) - (b.kind === 'radar' ? 0 : b.kind === 'frost' ? 1 : 2));
    for (const tw of order) {
      if (tw.flash > 0) tw.flash--;
      if (tw.cd > 0) tw.cd--;
      if (this.freezeP > 0) continue;
      const s = this.towerStat(tw), cx = tw.x + 8, cy = tw.y + 8;
      if (tw.kind === 'mine') continue;
      if (tw.kind === 'radar') {
        for (const t of this.tanks) if (t.alive && !t.isPlayer && Math.hypot(t.x + 8 - cx, t.y + 8 - cy) <= s.range) t.reveal = Math.max(t.reveal || 0, 8);
        tw.ang = (tw.ang || 0) + 0.08;
        continue;
      }
      const list = this.tdTargets(tw, s, cx, cy);
      if (tw.kind === 'frost') {
        for (const [t] of list) {
          t.chill = Math.min(t.chill || 1, s.slow);
          if (s.brittle) t.brittle = true;
          if (s.dps && this.frame % 6 === 0) this.tdHit(t, s.dps * 0.1, tw, true);
        }
        tw.busy = list.length > 0;
        continue;
      }
      const target = this.tdPick(tw, list);
      tw.busy = !!target;
      if (!target) continue;
      tw.ang = Math.atan2(target.y + 8 - cy, target.x + 8 - cx);
      if (tw.kind === 'flame') {
        if (this.frame % 6 === 0) {
          for (const [t, d] of list) {
            const a = Math.atan2(t.y + 8 - cy, t.x + 8 - cx), diff = Math.abs(((a - tw.ang + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
            if (diff < 0.5 || d < 12) this.tdHit(t, s.dps * 0.1, tw, true);
          }
          if (s.napalm && this.fires) this.igniteAt(target.x + 8, target.y + 8, 6, true, true);
        }
        for (let k = 0; k < 2; k++) {
          const a = tw.ang + (Math.random() - 0.5) * 0.8, v = 1.5 + Math.random() * 1.5;
          this.tdSparks.push({ x: cx + Math.cos(tw.ang) * 6, y: cy + Math.sin(tw.ang) * 6, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: Math.round(s.range / v), fire: true });
        }
        if (this.frame % 24 === 0) Sound.play('flame');
        continue;
      }
      if (tw.cd > 0) continue;
      tw.cd = s.cd;
      if (tw.kind === 'tesla') {
        const hit = [target], pts = [[cx, cy - 6], [target.x + 8, target.y + 8]];
        while (hit.length < s.chain) {
          const last = hit[hit.length - 1];
          let best = null, bd = 44;
          for (const t of this.tanks) {
            if (!t.alive || t.isPlayer || hit.includes(t) || t.burrow > 0 || (t.stealth && !(t.reveal > 0))) continue;
            const d = Math.hypot(t.x - last.x, t.y - last.y);
            if (d < bd) { bd = d; best = t; }
          }
          if (!best) break;
          hit.push(best); pts.push([best.x + 8, best.y + 8]);
        }
        for (const t of hit) { this.tdHit(t, s.dmg, tw, false); if (s.stun) t.stun = s.stun; }
        this.tdBeams.push({ pts, t: 10, color: s.stun ? '#7CB8F8' : '#F8F8A0' });
        Sound.play('zap');
      } else if (tw.kind === 'cannon') {
        const lead = (target.speed || 0.5) * 20, tx = target.x + 8 + DXY[target.dir][0] * lead, ty = target.y + 8 + DXY[target.dir][1] * lead;
        this.tdShots.push({ kind: 'shell', x: cx, y: cy, x0: cx, y0: cy, tx, ty, p: 0, dp: 2.2 / Math.max(20, Math.hypot(tx - cx, ty - cy)), dmg: s.dmg, splash: s.splash, cluster: s.cluster, tw });
        Sound.play('mortar');
      } else if (tw.kind === 'rocket') {
        const targets = s.salvo ? list.map(q => q[0]).sort(() => Math.random() - 0.5).slice(0, s.salvo) : [target];
        while (s.salvo && targets.length < s.salvo) targets.push(target);
        targets.forEach((t, k) => this.tdShots.push({ kind: 'rocket', x: cx, y: cy - 4, vx: Math.cos(tw.ang + (k - 1.5) * 0.4) * 0.8, vy: Math.sin(tw.ang + (k - 1.5) * 0.4) * 0.8, target: t, dmg: s.dmg, splash: 8, pierce: s.pierce, tw, life: 240 }));
        Sound.play('mortar');
      } else {
        // gun, gatling, sniper
        this.tdShots.push({ kind: 'bullet', x: cx + Math.cos(tw.ang) * 7, y: cy + Math.sin(tw.ang) * 7, target, speed: s.fast ? 9 : 5, dmg: s.dmg, tw, life: 90 });
        if (tw.spec !== 0 || this.frame % 3 === 0) Sound.play('shot');
      }
    }
  },

  updateTdShots() {
    for (const s of this.tdShots) {
      if (s.kind === 'shell') {
        s.p += s.dp;
        s.x = s.x0 + (s.tx - s.x0) * s.p; s.y = s.y0 + (s.ty - s.y0) * s.p;
        if (s.p >= 1) { s.done = true; this.tdBoom(s.tx, s.ty, s.splash, s.dmg, s.tw); if (s.cluster) for (let k = 0; k < s.cluster; k++) { const a = k * Math.PI / 2 + 0.6; this.tdShots.push({ kind: 'shell', bomblet: true, x: s.tx, y: s.ty, x0: s.tx, y0: s.ty, tx: s.tx + Math.cos(a) * 16, ty: s.ty + Math.sin(a) * 16, p: 0, dp: 0.08, dmg: s.dmg * 0.5, splash: 10, tw: s.tw }); } }
        continue;
      }
      if (--s.life <= 0) { s.done = true; continue; }
      const t = s.target, alive = t && t.alive && !(t.burrow > 0);
      if (alive) { s.tx = t.x + 8; s.ty = t.y + 8; }
      if (s.tx === undefined) { s.done = true; continue; }
      const dx = s.tx - s.x, dy = s.ty - s.y, d = Math.hypot(dx, dy);
      if (s.kind === 'rocket') {
        // a rocket turns towards its target and speeds up
        const sp = Math.min(4, Math.hypot(s.vx, s.vy) + 0.12);
        s.vx += (dx / Math.max(1, d)) * 0.5; s.vy += (dy / Math.max(1, d)) * 0.5;
        const k = sp / Math.max(0.01, Math.hypot(s.vx, s.vy));
        s.vx *= k; s.vy *= k;
        if (this.frame % 2 === 0) this.tdSparks.push({ x: s.x, y: s.y, vx: 0, vy: 0, t: 12, smoke: true });
        s.x += s.vx; s.y += s.vy;
        if (Math.hypot(s.tx - s.x, s.ty - s.y) < 5) { s.done = true; if (alive) this.tdHit(t, s.dmg, s.tw, false, s.pierce); this.tdBoom(s.tx, s.ty, s.splash, s.dmg * 0.4, s.tw, t); }
        continue;
      }
      if (d <= s.speed + 2) { s.done = true; if (alive) this.tdHit(t, s.dmg, s.tw, false); continue; }
      s.x += dx / d * s.speed; s.y += dy / d * s.speed;
    }
    this.tdShots = this.tdShots.filter(s => !s.done);
  },

  // a blast at (x, y): everything within r takes dmg (except skip)
  tdBoom(x, y, r, dmg, tw, skip) {
    this.addFx(x, y, r >= 20 ? BIG_EXPLOSION() : Sprites.smallExp, r >= 20 ? 4 : 3);
    for (const t of this.tanks.slice()) {
      if (!t.alive || t.isPlayer || t === skip || t.burrow > 0 || t.hopT > 0) continue;
      if (Math.hypot(t.x + 8 - x, t.y + 8 - y) <= r + 6) this.tdHit(t, dmg, tw, true);
    }
    this.explosionHeat(x, y, r);
  },

  // a tower's damage on an enemy (fractions add up; a shield plate takes most of a hit from the front)
  tdHit(t, dmg, tw, splash, pierce) {
    if (!t.alive) return;
    if (t.mirage) { this.vanishMirage(t, true); return; }
    if (t.frontShield && !pierce && tw) {
      const [fx, fy] = DXY[t.dir], ax = tw.x - t.x, ay = tw.y - t.y, d = Math.hypot(ax, ay) || 1;
      if ((ax * fx + ay * fy) / d > 0.7) dmg *= 0.25;
    }
    if (t.brittle) dmg *= 2;
    t.reveal = Math.max(t.reveal || 0, 20);
    t.tdAcc = (t.tdAcc || 0) + dmg;
    let n = Math.floor(t.tdAcc);
    t.tdAcc -= n;
    if (n <= 0 || t.shield > 0) return;
    while (n-- > 0 && t.alive) {
      if (t.bonus) { t.bonus = false; this.spawnPowerup(); }
      t.hp--;
      if (t.hp <= 0) {
        this.killEnemy(t, gunner(tw && tw.owner), true);
        if (kindOf(t) === 'splitter' && !splash) this.split(t);
      }
    }
  },

  // gold for a kill
  tdKillGold(t) { if (this.td && !t.mirage) this.td.gold += Math.ceil(ENEMY[t.type].pts / 50) + Math.floor(this.td.wave / 4); },

  // enemy shells on towers (true if the shell stopped there)
  bulletTower(b) {
    const tw = this.towers.find(q => overlap(b.x, b.y, 4, 4, q.x, q.y, 16, 16));
    if (!tw) return false;
    this.killBullet(b, true);
    this.damageTower(tw, b.power ? 2 : 1);
    return true;
  },

  damageTower(tw, n) {
    tw.hp -= n; tw.flash = 10;
    if (tw.hp > 0) { Sound.play('armor'); return; }
    this.towers.splice(this.towers.indexOf(tw), 1);
    this.terrainVer++;
    this.addFx(tw.x + 8, tw.y + 8, BIG_EXPLOSION(), 5);
    this.popups.push({ x: tw.x + 8, y: tw.y, text: TOWERS[tw.kind].name + ' LOST', label: true, color: COL.red, t: 0, delay: 0, life: 90 });
    Sound.play('explode');
  },

  // ------------------------------------------------------------ building
  // the tile in front of a tank (where it builds)
  tdSpot(t) {
    const x = Math.floor((t.x + 8 + DXY[t.dir][0] * 16) / 16) * 16, y = Math.floor((t.y + 8 + DXY[t.dir][1] * 16) / 16) * 16;
    return [x, y];
  },

  tdSpotKind(x, y) {
    if (x < 0 || y < 0 || x > FW - 16 || y > FH - 16) return 'off';
    if (this.towerAt(x, y)) return 'tower';
    let brick = 0, steel = 0, bad = 0;
    for (let cy = y >> 2; cy < (y + 16) >> 2; cy++) for (let cx = x >> 2; cx < (x + 16) >> 2; cx++) {
      const v = this.get(cx, cy);
      if (v === T_BRICK) brick++; else if (v === T_STEEL) steel++; else if (v === T_WATER || isBelt(v)) bad++;
    }
    if (bad) return 'off';
    if (steel === 16 && this.tdBuilt && this.tdBuilt.has(x + ',' + y)) return 'wall';
    if (brick === 16 && this.tdBuilt && this.tdBuilt.has(x + ',' + y)) return 'wall';
    if (brick || steel) return 'off';
    if (overlap(x, y, 16, 16, BASE_X - 16, BASE_Y - 16, 48, 32)) return 'off';
    if (this.td.spawns.some(([sx, sy]) => overlap(x, y, 16, 16, sx, sy, 16, 16))) return 'off';
    if (this.tanks.some(t => t.alive && overlap(x, y, 16, 16, t.x, t.y, 16, 16))) return 'busy';
    return 'free';
  },

  // would this (tower or steel) still leave the enemy a way to the eagle from every entry point?
  tdLeavesPath(place, undo) {
    place();
    this.terrainVer++; this.navCost = {}; this.navBaseF = {};
    const dist = this.navBase(''), NX = COLS * 2 - 1;
    const ok = this.td.spawns.every(([x, y]) => dist[(y >> 3) * NX + (x >> 3)] < Infinity);
    if (!ok) { undo(); this.terrainVer++; this.navCost = {}; this.navBaseF = {}; }
    return ok;
  },

  // the menu for the spot in front of a player's tank
  tdMenuItems(p, x, y) {
    const td = this.td, kind = this.tdSpotKind(x, y), items = [], g = td.gold;
    const tw = kind === 'tower' && this.towerAt(x, y);
    if (td.phase === 'build') items.push({ key: 'send', label: 'SEND WAVE ' + (td.wave + 1), desc: 'NOW: +' + Math.ceil(td.timer / 60) * 2 + ' GOLD', price: 0, icon: '>>' });
    if (tw) {
      const T = TOWERS[tw.kind];
      if (tw.spec === undefined && tw.lv < 3) items.push({ key: 'up', label: 'LEVEL ' + (tw.lv + 1), desc: T.name, price: T.cost[tw.lv], icon: '^' });
      if (tw.spec === undefined && tw.lv === 3) T.specs.forEach((s, i) => items.push({ key: 'spec' + i, label: s.name, desc: s.desc, price: s.cost, icon: tw.kind, spec: i }));
      if (tw.kind !== 'mine' && tw.kind !== 'radar' && tw.kind !== 'frost') items.push({ key: 'target', label: 'AIM: ' + TD_TARGETS[tw.target || 0], desc: 'FIRE: CHANGE', price: 0, icon: '+' });
      if (tw.hp < tw.max) items.push({ key: 'repair', label: 'REPAIR', desc: 'BACK TO FULL STRENGTH', price: Math.ceil((tw.max - tw.hp) / tw.max * tw.spent * 0.3), icon: 'R' });
      items.push({ key: 'sell', label: 'SELL +' + Math.floor(tw.spent * TD_SELL), desc: T.name + ' L' + tw.lv + (tw.spec !== undefined ? ' ' + T.specs[tw.spec].name : ''), price: 0, icon: 'coin' });
    } else if (kind === 'wall') {
      items.push({ key: 'remove', label: 'REMOVE WALL', desc: 'GIVES BACK HALF', price: 0, icon: 'X' });
    } else if (kind === 'free' || kind === 'busy') {
      for (const k of TOWER_KINDS) items.push({ key: 'build', tower: k, label: TOWERS[k].name, desc: TOWERS[k].desc, price: TOWERS[k].cost[0], icon: k });
      items.push({ key: 'wall', wall: 'brick', label: TD_WALLS.brick.name, desc: TD_WALLS.brick.desc, price: TD_WALLS.brick.cost, icon: 'brick' });
      items.push({ key: 'wall', wall: 'steel', label: TD_WALLS.steel.name, desc: TD_WALLS.steel.desc, price: TD_WALLS.steel.cost, icon: 'steel' });
    }
    for (const a in TD_ABILITIES) {
      const A = TD_ABILITIES[a], c = td.cool[a];
      items.push({ key: 'ability', ability: a, label: A.name + (c > 0 ? ' ' + Math.ceil(c / 60) + 'S' : ''), desc: A.desc, price: A.cost, icon: a, wait: c > 0 });
    }
    items.push({ key: 'close', label: 'CLOSE', desc: kind === 'off' ? "CAN'T BUILD HERE" : kind === 'busy' ? 'A TANK IS IN THE WAY' : '', price: 0, icon: 'X' });
    for (const it of items) it.ok = !it.wait && it.price <= g && !(it.key === 'build' || it.key === 'wall' ? kind !== 'free' : false);
    return items;
  },

  // a player's B button and menu (true: the tank does nothing else this frame)
  fortressInput(t, p, inp) {
    const pressed = inp.dir >= 0 && inp.dir !== p.tdDir;
    p.tdDir = inp.dir;
    const m = p.tdMenu;
    if (!m) {
      if (inp.altPressed) { const [x, y] = this.tdSpot(t); p.tdMenu = { x, y, idx: 0 }; Sound.play('select'); t.moving = false; return true; }
      return false;
    }
    t.moving = false;
    const items = this.tdMenuItems(p, m.x, m.y);
    m.idx = Math.min(m.idx, items.length - 1);
    if (pressed && (inp.dir === 1 || inp.dir === 0)) { m.idx = (m.idx + 1) % items.length; Sound.play('select'); }
    if (pressed && (inp.dir === 3 || inp.dir === 2)) { m.idx = (m.idx + items.length - 1) % items.length; Sound.play('select'); }
    if (inp.altPressed) { p.tdMenu = null; return true; }
    if (inp.firePressed) this.tdChoose(p, t, items[m.idx]);
    return true;
  },

  tdChoose(p, t, it) {
    const td = this.td, m = p.tdMenu, x = m.x, y = m.y;
    if (it.key === 'close') { p.tdMenu = null; return; }
    if (it.key === 'target') { const tw = this.towerAt(x, y); tw.target = ((tw.target || 0) + 1) % TD_TARGETS.length; Sound.play('select'); return; }
    if (!it.ok) { this.tdMsg(p, it.wait ? 'NOT READY YET' : it.price > td.gold ? 'NOT ENOUGH GOLD' : "CAN'T BUILD HERE"); Sound.play('steel'); return; }
    if (it.key === 'send') { this.tdSendWave(); p.tdMenu = null; return; }
    if (it.key === 'ability') {
      td.gold -= it.price; td.cool[it.ability] = TD_ABILITIES[it.ability].cool;
      if (it.ability === 'strike') this.callAirstrike(true, gunner(p)); else this.spawnWingman(p);
      p.tdMenu = null; return;
    }
    if (it.key === 'build') {
      const T = TOWERS[it.tower], tw = { x, y, kind: it.tower, lv: 1, hp: T.hp, max: T.hp, cd: 30, target: 0, owner: p, spent: it.price, flash: 0, ang: -Math.PI / 2 };
      if (!this.tdLeavesPath(() => this.towers.push(tw), () => this.towers.splice(this.towers.indexOf(tw), 1))) { this.tdMsg(p, 'THAT WOULD SHUT THE WAY'); Sound.play('steel'); return; }
      td.gold -= it.price;
      this.addFx(x + 8, y + 8, [Sprites.sparkle[0], Sprites.sparkle[1], Sprites.sparkle[2]], 4);
      Sound.play('build');
      return;
    }
    if (it.key === 'wall') {
      const v = it.wall === 'steel' ? T_STEEL : T_BRICK, set = val => { for (let cy = y >> 2; cy < (y + 16) >> 2; cy++) for (let cx = x >> 2; cx < (x + 16) >> 2; cx++) this.set(cx, cy, val); };
      if (v === T_STEEL && !this.tdLeavesPath(() => set(T_STEEL), () => set(T_EMPTY))) { this.tdMsg(p, 'THAT WOULD SHUT THE WAY'); Sound.play('steel'); return; }
      if (v === T_BRICK) set(T_BRICK);
      (this.tdBuilt || (this.tdBuilt = new Set())).add(x + ',' + y);
      this.origTerrain = this.terrain.slice();
      td.gold -= it.price;
      Sound.play('build');
      return;
    }
    if (it.key === 'remove') {
      const brick = this.get(x >> 2, y >> 2) === T_BRICK;
      for (let cy = y >> 2; cy < (y + 16) >> 2; cy++) for (let cx = x >> 2; cx < (x + 16) >> 2; cx++) this.set(cx, cy, T_EMPTY);
      this.tdBuilt.delete(x + ',' + y);
      td.gold += Math.floor((brick ? TD_WALLS.brick.cost : TD_WALLS.steel.cost) / 2);
      Sound.play('brick');
      return;
    }
    const tw = this.towerAt(x, y);
    if (!tw) return;
    if (it.key === 'up') { td.gold -= it.price; tw.spent += it.price; tw.lv++; tw.max += 3; tw.hp = tw.max; Sound.play('levelUp'); this.addFx(x + 8, y + 8, [Sprites.sparkle[0], Sprites.sparkle[1]], 4); }
    else if (it.key.startsWith('spec')) { td.gold -= it.price; tw.spent += it.price; tw.spec = it.spec; tw.max += 6; tw.hp = tw.max; Sound.play('levelUp'); this.addFx(x + 8, y + 8, [Sprites.sparkle[0], Sprites.sparkle[1], Sprites.sparkle[2]], 5); }
    else if (it.key === 'repair') { td.gold -= it.price; tw.hp = tw.max; Sound.play('heal'); }
    else if (it.key === 'sell') {
      td.gold += Math.floor(tw.spent * TD_SELL);
      this.towers.splice(this.towers.indexOf(tw), 1);
      this.terrainVer++;
      Sound.play('pickup');
      p.tdMenu = null;
    }
  },

  tdMsg(p, text) { if (p.tank) this.popups.push({ x: p.tank.x + 8, y: p.tank.y - 4, text, label: true, color: COL.red, t: 0, delay: 0, life: 60 }); },

  // ------------------------------------------------------------ drawing
  // a tower: a steel plate with its kind on top, level pips, a spec star, an HP bar when damaged
  drawTower(ctx, tw, x = tw.x, y = tw.y, ghost) {
    const f = this.frame, a = tw.ang === undefined ? -Math.PI / 2 : tw.ang, cx = x + 8, cy = y + 8, sp = tw.spec !== undefined;
    const lvCol = ['#ADADAD', '#F0BC3C', '#58D854'][Math.max(0, (tw.lv || 1) - 1)];
    if (ghost) ctx.globalAlpha = 0.55;
    ctx.drawImage(Sprites.turretBase, x, y);
    const R = (dx, dy, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(cx + dx), Math.round(cy + dy), w, h); };
    const barrel = (len, w, c) => { for (let k = 2; k <= len; k++) R(Math.cos(a) * k - w / 2, Math.sin(a) * k - w / 2, w, w, c); };
    switch (tw.kind) {
      case 'gun':
        R(-4, -4, 8, 8, '#3C3C3C'); R(-3, -3, 6, 6, sp ? (tw.spec ? '#3878C8' : '#C83C20') : lvCol);
        barrel(tw.spec === 1 ? 9 : 7, tw.spec === 0 ? 3 : 2, '#F8F8F8'); break;
      case 'cannon':
        R(-5, -4, 10, 9, '#1C1C1C'); R(-4, -3, 8, 7, sp ? (tw.spec ? '#C87C28' : '#7C7C7C') : '#5C5C5C'); R(-2, -2, 3, 2, lvCol);
        barrel(tw.spec === 0 ? 9 : 7, 3, '#ADADAD'); break;
      case 'tesla': {
        R(-3, -1, 6, 6, '#3C3C50'); for (let k = 0; k < 3; k++) R(-4 + (k & 1), 3 - k * 3, 8 - 2 * (k & 1), 1, '#C87C28');
        R(-2, -7, 4, 4, (f >> 2) & 1 ? '#F8F8A0' : (tw.spec === 1 ? '#7CB8F8' : lvCol)); break;
      }
      case 'frost':
        R(-1, -6, 2, 12, '#B8E8F8'); R(-6, -1, 12, 2, '#B8E8F8'); R(-4, -4, 2, 2, '#7CC8F8'); R(2, -4, 2, 2, '#7CC8F8'); R(-4, 2, 2, 2, '#7CC8F8'); R(2, 2, 2, 2, '#7CC8F8');
        R(-2, -2, 4, 4, tw.spec === 1 ? '#F8F8F8' : tw.spec === 0 ? '#3C78F8' : lvCol); break;
      case 'flame':
        R(-4, -3, 8, 8, '#7C1C00'); R(-3, -2, 6, 6, tw.spec === 0 ? '#F8D878' : '#D82800'); R(-1, -1, 2, 2, lvCol);
        barrel(7, 2, '#3C3C3C'); if (tw.busy && (f >> 1) & 1) R(Math.cos(a) * 8 - 1, Math.sin(a) * 8 - 1, 3, 3, '#F8B800'); break;
      case 'rocket':
        R(-5, -4, 10, 9, '#2C3C1C'); R(-4, -3, 8, 7, '#587C38');
        for (let k = 0; k < (tw.spec === 0 ? 4 : 2); k++) R(-3 + (k % 2) * 4, -3 + (k >> 1) * 4, 2, 2, tw.spec === 1 ? '#F83800' : '#F8F8F8');
        R(-1, 3, 2, 1, lvCol); break;
      case 'radar': {
        R(-1, -2, 2, 7, '#7C7C7C');
        const r = tw.ang || 0;
        for (let k = -4; k <= 4; k++) R(Math.cos(r) * k - 0.5, -3 + Math.sin(r) * k * 0.4, 1, 1, '#F8F8F8');
        R(-1, -4, 2, 2, (f >> 3) & 1 ? '#F83800' : lvCol); break;
      }
      case 'mine':
        R(-5, 0, 10, 5, '#5C3C1C'); R(-4, -3, 8, 4, '#F8B800'); R(-2, -5, 4, 2, '#F8D878');
        if ((f + x) % 60 < 6) R(1, -4, 1, 1, '#F8F8F8'); R(-1, 2, 2, 1, lvCol); break;
    }
    if (ghost) { ctx.globalAlpha = 1; return; }
    for (let k = 0; k < (tw.lv || 1); k++) R(-7 + k * 3, 5, 2, 2, lvCol);
    if (sp) R(4, 4, 3, 3, (f >> 3) & 1 ? '#F8F8F8' : COL.gold);
    if (tw.flash > 0 && (tw.flash >> 1) & 1) { ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(x, y, 16, 16); }
    if (tw.hp < tw.max) {
      ctx.fillStyle = COL.black; ctx.fillRect(x, y - 4, 16, 3);
      ctx.fillStyle = tw.hp / tw.max > 0.4 ? '#58D854' : '#F83800'; ctx.fillRect(x + 1, y - 3, Math.max(1, Math.round(14 * tw.hp / tw.max)), 1);
    }
  },

  ring(ctx, cx, cy, r, color) {
    ctx.fillStyle = color;
    const n = Math.max(24, Math.round(r));
    for (let k = 0; k < n; k++) { const a = k / n * Math.PI * 2 + this.frame * 0.01; ctx.fillRect(Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r), 1, 1); }
  },

  renderTowers(ctx) {
    if (!this.td) return;
    // the entry points: open ones blink red, the ones still closed are grey (and say when they open)
    const open = this.td.spawns.length && this.td.wave >= 0 ? this.tdOpen(Math.max(1, this.td.wave + (this.td.phase === 'build' ? 1 : 0))).length : 1;
    this.td.spawns.forEach(([x, y], i) => {
      const on = i < open;
      ctx.fillStyle = on ? ((this.frame >> 3) & 1 ? '#F83800' : '#7C0800') : '#5C5C5C';
      for (const [dx, dy] of [[0, 0], [14, 0], [0, 14], [14, 14]]) ctx.fillRect(x + dx, y + dy, 2, 2);
      if (!on) ctx.drawImage(Sprites.mini(String(i * 5 + 1)), x + 5, y + 5);
    });
    for (const tw of this.towers) {
      if (tw.kind === 'frost' && tw.busy) this.ring(ctx, tw.x + 8, tw.y + 8, this.towerStat(tw).range, 'rgba(124,200,248,0.6)');
      this.drawTower(ctx, tw);
    }
    // each player's build spot (and the range of what's being chosen there)
    for (const p of this.players) {
      const t = this.tanks.find(o => o.alive && o.isPlayer && o.player === p);
      if (!t || p.out) continue;
      const m = p.tdMenu, [x, y] = m ? [m.x, m.y] : this.tdSpot(t), k = this.tdSpotKind(x, y);
      const col = k === 'free' || k === 'tower' || k === 'wall' ? ((this.frame >> 4) & 1 ? '#F8F8F8' : '#ADADAD') : '#7C2C2C';
      ctx.fillStyle = col;
      for (const [dx, dy, w, h] of [[0, 0, 4, 1], [0, 0, 1, 4], [12, 0, 4, 1], [15, 0, 1, 4], [0, 15, 4, 1], [0, 12, 1, 4], [12, 15, 4, 1], [15, 12, 1, 4]]) ctx.fillRect(x + dx, y + dy, w, h);
      if (!m) continue;
      const items = this.tdMenuItems(p, x, y), it = items[Math.min(m.idx, items.length - 1)];
      if (it && it.key === 'build') { this.drawTower(ctx, { kind: it.tower, lv: 1, ang: -Math.PI / 2 }, x, y, true); const r = TOWERS[it.tower].lv[0].range; if (r) this.ring(ctx, x + 8, y + 8, r, '#F8F8F8'); }
      const tw = this.towerAt(x, y);
      if (tw && tw.kind !== 'mine') {
        let s = this.towerStat(tw);
        if (it && it.key === 'up') s = Object.assign({}, TOWERS[tw.kind].lv[tw.lv]);
        if (it && it.spec !== undefined) s = Object.assign({}, s, TOWERS[tw.kind].specs[it.spec]);
        if (s.range) this.ring(ctx, x + 8, y + 8, s.range, '#F8F8F8');
        if (tw.kind === 'radar') this.ring(ctx, x + 8, y + 8, TD_BUFF_RANGE, '#F8B800');
      }
    }
  },

  renderTdOver(ctx) {
    if (!this.td) return;
    for (const s of this.tdSparks) {
      ctx.fillStyle = s.smoke ? 'rgba(160,160,160,' + (s.t / 16) + ')' : ['#F8F8F8', '#F8D878', '#F87830', '#D82800'][(s.t + (this.frame >> 1)) & 3];
      ctx.fillRect(Math.round(s.x) - 1, Math.round(s.y) - 1, s.smoke ? 2 : 3, s.smoke ? 2 : 3);
    }
    for (const s of this.tdShots) {
      if (s.kind === 'shell') {
        const h = Math.sin(Math.PI * s.p) * (s.bomblet ? 6 : 14);
        ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(Math.round(s.x) - 1, Math.round(s.y), 3, 2);
        ctx.fillStyle = s.bomblet ? '#F8B800' : '#3C3C3C'; ctx.fillRect(Math.round(s.x) - 1, Math.round(s.y - h) - 1, 3, 3);
      } else if (s.kind === 'rocket') { ctx.fillStyle = '#F87830'; ctx.fillRect(Math.round(s.x) - 1, Math.round(s.y) - 1, 3, 3); }
      else { ctx.fillStyle = '#F8F8F8'; ctx.fillRect(Math.round(s.x) - 1, Math.round(s.y) - 1, 2, 2); }
    }
    for (const b of this.tdBeams) {
      ctx.fillStyle = (b.t >> 1) & 1 ? '#FFFFFF' : b.color;
      for (let k = 1; k < b.pts.length; k++) {
        const [x0, y0] = b.pts[k - 1], [x1, y1] = b.pts[k], n = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0) / 2));
        for (let i = 0; i <= n; i++) ctx.fillRect(Math.round(x0 + (x1 - x0) * i / n + (Math.random() - 0.5) * 3), Math.round(y0 + (y1 - y0) * i / n + (Math.random() - 0.5) * 3), 1, 1);
      }
    }
    // stunned tanks spark
    for (const t of this.tanks) if (t.alive && t.stun > 0 && (this.frame >> 1) & 1) { ctx.fillStyle = '#7CB8F8'; ctx.fillRect(t.x + rnd(16), t.y + rnd(16), 2, 1); }
  },

  // an icon for a menu item (16 x 16)
  tdIcon(ctx, it, x, y) {
    if (TOWERS[it.icon]) { this.drawTower(ctx, { kind: it.icon, lv: 1, spec: it.spec, ang: -Math.PI / 2, hp: 1, max: 1 }, x, y); return; }
    if (it.icon === 'brick' || it.icon === 'steel') { for (let k = 0; k < 4; k++) ctx.drawImage(Sprites.tex[it.icon], x + (k & 1) * 8, y + (k >> 1) * 8); return; }
    if (it.icon === 'strike') { ctx.drawImage(Sprites.plane[0], x + 8 - Sprites.plane[0].width / 2, y + 8 - Sprites.plane[0].height / 2); return; }
    if (it.icon === 'wing') { ctx.drawImage(Sprites.tank('p1', 0, 0, 'c_WHITE'), x, y); return; }
    if (it.icon === 'coin') { ctx.fillStyle = '#3C3C3C'; ctx.fillRect(x, y, 16, 16); tdCoin(ctx, x + 4, y + 4); return; }
    ctx.fillStyle = '#3C3C3C'; ctx.fillRect(x, y, 16, 16);
    Font.drawCenter(ctx, it.icon, x + 8, y + 4, COL.white);
  },

  // the build menus (screen space, at the bottom of the field) and the wave countdown
  renderFortressUI(ctx) {
    if (!this.td) return;
    const td = this.td;
    if (td.phase === 'build' && !td.won) {
      const kind = td.next && td.next.kind !== 'MIXED' ? ': ' + td.next.kind : '';
      Font.drawCenter(ctx, 'WAVE ' + (td.wave + 1) + ' IN ' + Math.ceil(td.timer / 60) + kind, VIEW_W / 2, 4, (td.timer >> 4) & 1 || td.timer > 300 ? (kind === ': BOSS' ? COL.red : COL.white) : COL.red);
      if (td.wave === 0 && !this.players.some(p => p.tdMenu)) Font.drawCenter(ctx, 'B: BUILD  TAB: SEND WAVE', VIEW_W / 2, 14, COL.lgrey);
    }
    let y = VIEW_H - 46;
    for (const p of this.players) {
      const m = p.tdMenu, t = this.tanks.find(o => o.alive && o.isPlayer && o.player === p);
      if (!m || !t) continue;
      const items = this.tdMenuItems(p, m.x, m.y), it = items[Math.min(m.idx, items.length - 1)];
      ctx.fillStyle = 'rgba(0,0,0,0.85)'; ctx.fillRect(0, y, VIEW_W, 46);
      ctx.fillStyle = PALS[Config.playerPal(p.i)][2]; ctx.fillRect(0, y, VIEW_W, 1);
      Font.draw(ctx, it.label, 4, y + 3, it.ok || it.key === 'close' || it.key === 'target' ? COL.white : COL.lgrey);
      if (it.price) { Font.drawRight(ctx, String(it.price), VIEW_W - 3, y + 3, it.price <= td.gold ? COL.gold : COL.red); tdCoin(ctx, VIEW_W - 12 - String(it.price).length * 8, y + 3); }
      Font.draw(ctx, it.desc || '', 4, y + 13, '#7C7C7C');
      const per = Math.max(1, Math.floor((VIEW_W - 8) / 18)), first = Math.max(0, Math.min(items.length - per, m.idx - (per >> 1)));
      for (let k = first; k < Math.min(items.length, first + per); k++) {
        const ix = 4 + (k - first) * 18, iy = y + 26;
        if (k === m.idx) { ctx.fillStyle = COL.gold; ctx.fillRect(ix - 1, iy - 1, 18, 18); ctx.fillStyle = COL.black; ctx.fillRect(ix, iy, 16, 16); }
        this.tdIcon(ctx, items[k], ix, iy);
        if (!items[k].ok && items[k].key !== 'close' && items[k].key !== 'target') { ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(ix, iy, 16, 16); }
      }
      y -= 48;
    }
  },

  // the border above the field and the side panel: wave, gold, eagle HP, the next wave
  renderFortressHud(ctx, H) {
    const td = this.td;
    Font.drawCenter(ctx, 'WAVE ' + td.wave + '/' + TD_WAVES + ' GOLD ' + td.gold + ' HP ' + (this.baseAlive ? this.eagleArmor + 1 : 0), FX + VIEW_W / 2, 0, COL.black);
    Font.draw(ctx, 'NXT', H, 26, COL.black);
    if (td.next) {
      const counts = new Map();
      for (const e of td.next.list) counts.set(e.type, (counts.get(e.type) || 0) + 1);
      [...counts].slice(0, 6).forEach(([type, n], i) => {
        const yy = 36 + i * 18;
        ctx.drawImage(Sprites.tank('e' + type, 0, 2, ENEMY[type].pal || 'silver'), H, yy);
        ctx.drawImage(Sprites.mini(String(n)), H + 1, yy + 11);
      });
    }
    tdCoin(ctx, H + 4, 152, 1);
    Font.drawCenter(ctx, String(Math.min(9999, td.gold)), H + 8, 164, COL.black);
  },
});

// a gold coin, s pixels per dot (8 x 8 at s = 1)
function tdCoin(ctx, x, y, s = 1) {
  const rows = ['..XXXX..', '.XYYYYX.', 'XYYXYYYX', 'XYXXXYYX', 'XYYXYYYX', 'XYYYYYYX', '.XYYYYX.', '..XXXX..'];
  rows.forEach((r, j) => { for (let i = 0; i < 8; i++) if (r[i] !== '.') { ctx.fillStyle = r[i] === 'X' ? '#A86C00' : '#F8D040'; ctx.fillRect(x + i * s, y + j * s, s, s); } });
}

function tdSkill() { const s = Config.get('skill'); return s === AUTO_SKILL ? Math.max(0, Math.min(4, Math.round(AutoSkill.rating))) : s; }
