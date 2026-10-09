'use strict';
// =====================================================================
//  GALAXY, run types: campaign, boss rush, endless, daily. Picked with the GALAXY RUN setting, which left/right
//  also changes on the mode's title screen and on the first curtain (as KILL RACE picks its target there).
//    CAMPAIGN   the fourteen sectors, then round again (galaxy.js), as it always was
//    BOSS RUSH  the 14 bosses back to back, no waves; power 4 and 3 bombs to start, the hangar after every 3rd
//               boss; the record: bosses beaten (all 12: the fastest time), then the score
//    ENDLESS    one long run: random waves of every kind, tougher wave by wave; a boss every 6 waves (all 14 in
//               a random order, then round again, tougher), the sky changes with it; the hangar every 12 waves
//    DAILY      the campaign with today's waves: the plans shuffled by the date, the same for everyone today
//  Records in the modes store: galaxy (campaign), galaxyRush, galaxyEndless, galaxyDaily (today's only).
// =====================================================================

const GXD_RUNS = { CAMPAIGN: 'campaign', 'BOSS RUSH': 'rush', ENDLESS: 'endless', DAILY: 'daily' };
const GXD_NAMES = { campaign: 'CAMPAIGN', rush: 'BOSS RUSH', endless: 'ENDLESS', daily: 'DAILY' };
const GXD_BLURB = { campaign: GX_SECTORS.length + ' SECTORS, THEN ROUND AGAIN', rush: 'ALL ' + GX_BOSSES.length + ' BOSSES, BACK TO BACK', endless: 'WAVES WITHOUT END', daily: "TODAY'S WAVES, THE SAME FOR ALL" };
const GXD_RUSH_SHOP = 3, GXD_BLOCK = 6;   // boss rush: the hangar after every 3rd boss; endless: a boss every 6 waves (2 a stage)
const gxdRun = () => GXD_RUNS[Config.get('galaxyRun')] || 'campaign';
const gxdToday = () => dailyToday().date;
const gxdRunOf = () => (Game.mode === 'galaxy' && Game.gxRun) || 'campaign';

function gxdStepRun(dir) {
  Config.step('galaxyRun', dir);
  Game.gxRun = gxdRun();
  if (Game.curtain) Game.curtain.gxRun = Game.gxRun;
  Sound.play('select');
}

// a run type's record, short: '7 BOSSES  120400', 'WAVE 23  45000'... ('' if none)
function gxdBest(run, rec = STORE.get(MODE_KEY, {})) {
  if (run === 'rush') { const b = rec.galaxyRush; return !b ? '' : b.bosses >= GX_BOSSES.length ? 'ALL ' + b.bosses + ' IN ' + fmtTime(b.frames) : b.bosses + (b.bosses === 1 ? ' BOSS  ' : ' BOSSES  ') + b.score; }
  if (run === 'endless') { const b = rec.galaxyEndless; return b ? 'WAVE ' + b.wave + '  ' + b.score : ''; }
  if (run === 'daily') { const b = rec.galaxyDaily; return b && b.date === gxdToday() ? 'SECTOR ' + b.level + '  ' + b.score : ''; }
  const b = rec.galaxy; return b ? 'SECTOR ' + b.level + '  ' + b.score : '';
}

// DAILY: a sector's waves shuffled by the date (YYYYMMDD), one swapped for a surprise
function gxdDailyPlan(plan, level, date) {
  const r = seeded(+String(date).replace(/-/g, '') * 31 + level * 7919), p = plan.slice();
  for (let i = p.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
  if (p.length) p[Math.floor(r() * p.length)] = GX_ALL_WAVES[Math.floor(r() * GX_ALL_WAVES.length)];
  return p;
}
const gxdPlanBase = gxPlan;
gxPlan = function (sec, loop, level) {
  const run = gxdRunOf();
  if (run === 'rush') return [];   // no waves: the boss comes straight on
  const plan = gxdPlanBase(sec, loop, level);
  return run === 'daily' ? gxdDailyPlan(plan, level, Game.gxDate || gxdToday()) : plan;
};

// ENDLESS: which sector's look and boss block b (0, 1, 2... six waves each) has: the first time round the first
// half of the sectors in a random order, then the second half; after that all of them shuffled, every time round
function gxdEndlessSec(b) {
  const E = Game.gxEndless || (Game.gxEndless = { order: [] }), n = GX_SECTORS.length;
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  while (E.order.length <= b) {
    const all = [...Array(n).keys()], half = n >> 1;
    const next = E.order.length ? shuffle(all) : shuffle(all.slice(0, half)).concat(shuffle(all.slice(half)));
    if (next[0] === E.order[E.order.length - 1]) [next[0], next[n - 1]] = [next[n - 1], next[0]];   // never the same boss twice in a row
    E.order.push(...next);
  }
  return E.order[b];
}
// ENDLESS: how hard wave w is: more hit points, faster and more shooting, wave by wave
function gxdEndlessDiff(g, w) {
  const k = Math.max(0, w - 1), s = Config.skill();
  g.d = Math.min(12, k / 6);
  g.hpMul = 1 + 0.04 * k + 0.0003 * k * k;
  g.fireMul = Math.min(3.2, 1 + 0.025 * k) * s.fire;
  g.shotSpd = Math.min(1.9, 1 + 0.01 * k) * s.shell;
}

// ------------------------------------------------------------------ the stage
const gxdSetup = Stage.prototype.setupGalaxy, gxdNextWave = Stage.prototype.gxNextWave, gxdBossKill = Stage.prototype.gxBossKill;
const gxdUpdate = Stage.prototype.updateGalaxy, gxdHud = Stage.prototype.renderGalaxyHud;
const gxdView = Stage.prototype.galaxyView, gxdApplyView = Stage.prototype.applyGalaxyView;

Object.assign(Stage.prototype, {
  setupGalaxy(level) {
    gxdSetup.call(this, level);
    const g = this.galaxy, run = g.run = gxdRunOf();
    if (run === 'rush') {
      g.plan = []; g.t = 50;   // a short intro, then the boss
      g.banner = { text: 'BOSS ' + level + '/' + GX_BOSSES.length + ': ' + GX_BOSSES[g.sec].name, t: 110 };
    } else if (run === 'endless') {
      // a stage is two blocks of six waves, each with its boss; the hangar comes between stages
      g.blk = g.blk0 = 2 * (level - 1); g.ew = g.blk * GXD_BLOCK;
      this.gxdBlock(g);
      g.banner = { text: (level === 1 ? 'ENDLESS: ' : 'WAVE ' + (g.ew + 1) + ': ') + GX_SECTORS[g.sec].name, t: 150 };
    } else if (run === 'daily' && level === 1) g.banner = { text: 'DAILY ' + (Game.gxDate || gxdToday()), t: 150 };
  },

  // ENDLESS: the next six waves: a sector's sky and boss, random waves
  gxdBlock(g) {
    g.sec = gxdEndlessSec(g.blk); g.loop = Math.floor(g.blk / GX_SECTORS.length); g.wave = 0;
    const plan = [];
    while (plan.length < GXD_BLOCK) { const k = GX_ALL_WAVES[rnd(GX_ALL_WAVES.length)]; if (k !== plan[plan.length - 1]) plan.push(k); }
    g.plan = plan;
    gxdEndlessDiff(g, g.ew + 1);
  },

  gxNextWave() {
    const g = this.galaxy;
    // BOSS RUSH: no waves, the boss
    if (g.run === 'rush') { g.wave = 1; g.phase = 'wave'; g.t = 0; g.spawnQ = []; this.gxBossStart(); return; }
    if (g.run !== 'endless') return gxdNextWave.call(this);
    const boss = g.wave >= g.plan.length, w0 = g.wave;
    const r = gxdNextWave.call(this);
    if (boss || g.wave === w0) return r;   // the boss, or held back (perks on offer)
    g.ew++; gxdEndlessDiff(g, g.ew);
    if (g.phase === 'wave') g.banner = { text: 'WAVE ' + g.ew + ': ' + (GX_WAVE_NAMES[g.kind] || String(g.kind).toUpperCase()), t: 110 };
    return r;
  },

  gxBossKill(p) {
    const g = this.galaxy, name = GX_BOSSES[g.sec].name;
    const r = gxdBossKill.call(this, p);
    if (g.run && g.run !== 'campaign' && g.run !== 'daily' && g.banner && g.banner.text.startsWith('SECTOR ')) g.banner = { text: (g.run === 'rush' ? 'BOSS ' + g.level + '/' + GX_BOSSES.length + ': ' : '') + name + ' DOWN!', t: 200 };
    return r;
  },

  updateGalaxy() {
    const r = gxdUpdate.call(this), g = this.galaxy;
    // ENDLESS: the first boss of the stage is down: on to the next sector (the second one ends the stage: the hangar)
    if (g && g.run === 'endless' && this.result === 'clear' && g.blk === g.blk0) {
      this.result = null; this.bossDefeated = false;
      g.blk++; this.gxdBlock(g);
      g.phase = 'between'; g.t = 0; g.flash = 16;
      g.banner = { text: 'ON TO ' + GX_SECTORS[g.sec].name, t: 150 };
    }
    return r;
  },

  // the line above the field: the run's own count
  renderGalaxyHud(ctx) {
    gxdHud.call(this, ctx);
    const g = this.galaxy;
    if (!g.run || g.run === 'campaign') return;
    const boss = g.phase === 'boss' || g.phase === 'clear';
    const top = g.run === 'rush' ? 'BOSS ' + g.level + '/' + GX_BOSSES.length + '  ' + fmtTime(Game.gxClock || 0)
      : g.run === 'endless' ? 'ENDLESS WAVE ' + Math.max(1, g.ew || 0) + (boss ? '  BOSS' : '')
      : 'DAILY SECTOR ' + g.level + '  ' + (boss ? 'BOSS' : 'WAVE ' + Math.max(1, g.wave) + '/' + (g.plan ? g.plan.length : GX_WAVES));
    ctx.fillStyle = COL.bg; ctx.fillRect(FX, 0, VIEW_W, FY);
    Font.drawCenter(ctx, top, FX + VIEW_W / 2, 0, COL.black);
  },

  // online: guests need the run, the sector (endless changes it mid-stage) and the endless wave
  galaxyView() {
    const v = gxdView.call(this), g = this.galaxy;
    v.run = g.run || 'campaign'; v.sec = g.sec; v.ew = g.ew || 0;
    return v;
  },

  applyGalaxyView(v) {
    gxdApplyView.call(this, v);
    const g = this.galaxy;
    g.run = v.run || 'campaign'; g.ew = v.ew || 0;
    if (v.sec !== undefined) g.sec = v.sec;
  },
});

// ------------------------------------------------------------------ the game: picking a run, its flow, records
const gxdNewGame = Game.newGame, gxdBeginStage = Game.beginStage, gxdUpdatePlay = Game.updatePlay, gxdToShop = Game.toShop, gxdToCurtain = Game.toCurtain;
const gxdUpdateCurtain = Game.updateCurtain, gxdRenderCurtain = Game.renderCurtain, gxdUpdateModeIntro = Game.updateModeIntro, gxdRenderModeIntro = Game.renderModeIntro;
const gxdRenderTitle = Game.renderTitle, gxdToModeResult = Game.toModeResult, gxdRenderModeResult = Game.renderModeResult;

Object.assign(Game, {
  newGame(n, custom, online) {
    const r = gxdNewGame.call(this, n, custom, online);
    if (this.mode === 'galaxy') {
      this.gxRun = gxdRun(); this.gxFresh = true; this.gxClock = 0;
      // the first curtain picks the run (left/right), like KILL RACE's target
      if (this.curtain) Object.assign(this.curtain, { gxSel: true, gxRun: this.gxRun });
    }
    return r;
  },

  beginStage() {
    if (this.mode === 'galaxy' && this.gxFresh) {
      // the run starts: its date (DAILY), the endless order, BOSS RUSH's starting kit
      this.gxFresh = false; this.gxRun = this.gxRun || gxdRun(); this.gxClock = 0;
      this.gxDate = gxdToday(); this.gxEndless = { order: [] };
      if (this.gxRun === 'rush') for (const p of this.players) Object.assign(gxPlayer(p), { power: 4, bombs: 3 });
    }
    return gxdBeginStage.call(this);
  },

  // BOSS RUSH: the clock runs while you fly
  updatePlay() {
    if (this.mode === 'galaxy' && this.gxRun === 'rush' && !this.paused && this.stage && !this.stage.over) this.gxClock = (this.gxClock || 0) + 1;
    return gxdUpdatePlay.call(this);
  },

  // after a stage cleared: BOSS RUSH is won after the 12th boss, and has the hangar after every 3rd only
  gxdRushOver() { return this.mode === 'galaxy' && this.state === 'play' && this.gxRun === 'rush' && this.stageNum > GX_BOSSES.length; },
  toShop() {
    if (this.gxdRushOver()) { this.toModeResult(true); return; }
    if (this.mode === 'galaxy' && this.state === 'play' && this.gxRun === 'rush' && (this.stageNum - 1) % GXD_RUSH_SHOP) { this.toCurtain(false); return; }
    return gxdToShop.call(this);
  },
  toCurtain(selectable) {
    if (this.gxdRushOver()) { this.toModeResult(true); return; }
    return gxdToCurtain.call(this, selectable);
  },

  updateCurtain() {
    const c = this.curtain;
    if (c && c.gxSel && c.phase === 'show') {
      const m = Input.menu(), dir = m.up || m.right ? 1 : m.down || m.left ? -1 : 0;
      if (dir) gxdStepRun(dir);
      if (m.ok && this.t > 10) { c.gxSel = false; this.beginStage(); }
      else if (m.back) this.toTitle();
      return;
    }
    return gxdUpdateCurtain.call(this);
  },

  // GALAXY's curtain: the sector (BOSS RUSH: the next boss; ENDLESS: the wave), and on the first one the run
  renderCurtain(ctx) {
    gxdRenderCurtain.call(this, ctx);
    const c = this.curtain;
    if (this.mode !== 'galaxy' || !c || c.phase !== 'show') return;
    const cx = SCREEN_W / 2, cy = SCREEN_H / 2, run = c.gxRun || this.gxRun || 'campaign', n = this.stageNum, blink = (this.t >> 4) & 1;
    ctx.fillStyle = COL.bg; ctx.fillRect(0, cy - 10, SCREEN_W, 64); ctx.fillRect(0, cy - 38, SCREEN_W, 11);   // (no seasons in space)
    const [top, sub] = run === 'rush' ? ['BOSS ' + n + '/' + GX_BOSSES.length, 'NEXT: ' + GX_BOSSES[(n - 1) % GX_BOSSES.length].name]
      : run === 'endless' ? ['WAVE ' + ((n - 1) * 2 * GXD_BLOCK + 1), 'A BOSS EVERY ' + GXD_BLOCK + ' WAVES']
      : ['SECTOR ' + n, GX_SECTORS[(n - 1) % GX_SECTORS.length].name];
    Font.drawCenter(ctx, top, cx, cy - 8, COL.black);
    Font.drawCenter(ctx, sub, cx, cy + 4, '#A00000');
    if (run === 'daily') Font.drawCenter(ctx, 'DAILY ' + (this.gxDate || gxdToday()), cx, cy + 16, '#3C3C3C');
    if (c.gxSel) {
      Font.drawCenter(ctx, (blink ? '< ' : '  ') + GXD_NAMES[run] + (blink ? ' >' : '  '), cx, cy + 30, COL.black);
      Font.drawCenter(ctx, gxdBest(run) ? 'BEST ' + gxdBest(run) : GXD_BLURB[run], cx, cy + 42, '#3C3C3C');
    }
  },

  // the mode's title screen: left/right picks the run
  updateModeIntro() {
    if (this.mode === 'galaxy') {
      const m = Input.menu();
      if (m.left || m.right) { gxdStepRun(m.right ? 1 : -1); this.t = Math.min(this.t, 60); }
    }
    return gxdUpdateModeIntro.call(this);
  },

  renderModeIntro(ctx) {
    gxdRenderModeIntro.call(this, ctx);
    if (this.mode !== 'galaxy') return;
    // the lines under the picture again, a little tighter, with the run and its record
    const L = introLayout(), y = L.ty, cx = L.cx, t = this.t, run = this.gxRun || gxdRun(), best = gxdBest(run);
    ctx.save();
    ctx.translate(-menuOX(), -menuOY());   // intro.js lays the screen out on the whole screen
    ctx.fillStyle = COL.black; ctx.fillRect(0, y - 2, SCREEN_W, SCREEN_H - y + 2);
    Font.drawCenter(ctx, modeInfo('galaxy').desc, cx, y, '#F8F8F8');
    Font.drawCenter(ctx, 'MUSIC: ' + musicName('galaxy'), cx, y + 10, SKILL_TAGS[Music.skillLevel()][1]);
    Font.drawCenter(ctx, '< ' + GXD_NAMES[run] + ' >', cx, y + 21, COL.gold);
    Font.drawCenter(ctx, best && (t >> 7) & 1 ? 'BEST ' + best : GXD_BLURB[run], cx, y + 31, COL.lgrey);
    if ((t >> 4) & 1 || t < 20) Font.drawCenter(ctx, 'PRESS ENTER', cx, y + 41, COL.red);
    ctx.restore();
  },

  // the title's record line for GALAXY: the chosen run's best
  renderTitle(ctx) {
    gxdRenderTitle.call(this, ctx);
    const cur = this.titleMenu()[this.menuIdx];
    if (!cur || !cur.mode || this.titleY !== 0 || Config.get('gameMode') !== 'galaxy') return;
    const run = gxdRun();
    ctx.fillStyle = COL.black; ctx.fillRect(0, 212, SW, 10);
    Font.drawCenter(ctx, GXD_NAMES[run] + ': ' + (gxdBest(run) || '1-4 PLAYERS'), SW / 2, 213, COL.lgrey);
  },

  toModeResult(done) {
    const run = this.gxRun || 'campaign';
    if (this.mode !== 'galaxy' || run === 'campaign') {
      const r = gxdToModeResult.call(this, done);
      if (this.mode === 'galaxy' && this.modeRes) this.modeRes.run = 'campaign';
      return r;
    }
    const rec = STORE.get(MODE_KEY, {}), score = this.players.reduce((a, p) => a + p.score, 0), g = this.stage && this.stage.galaxy;
    const res = { mode: 'galaxy', run, done, score, newBest: false };
    if (run === 'rush') {
      res.bosses = done ? GX_BOSSES.length : this.stageNum - 1; res.frames = this.gxClock || 0;
      const b = rec.galaxyRush, all = res.bosses >= GX_BOSSES.length;
      if (!b || res.bosses > b.bosses || (res.bosses === b.bosses && (all ? res.frames < b.frames : score > b.score))) { rec.galaxyRush = { bosses: res.bosses, frames: res.frames, score }; res.newBest = true; }
      res.best = rec.galaxyRush;
    } else if (run === 'endless') {
      res.wave = g ? g.ew || 0 : 0;
      const b = rec.galaxyEndless;
      if (!b || res.wave > b.wave || (res.wave === b.wave && score > b.score)) { rec.galaxyEndless = { wave: res.wave, score }; res.newBest = true; }
      res.best = rec.galaxyEndless;
    } else {
      // DAILY: today's best only; a new day starts it again
      res.date = this.gxDate || gxdToday(); res.level = this.stageNum; res.wave = g ? g.wave : 0; res.boss = !!g && (g.phase === 'boss' || g.phase === 'clear');
      const b = rec.galaxyDaily && rec.galaxyDaily.date === res.date ? rec.galaxyDaily : null;
      if (!b || score > b.score) { rec.galaxyDaily = { date: res.date, score, level: res.level, wave: res.wave }; res.newBest = true; }
      res.best = rec.galaxyDaily;
    }
    STORE.set(MODE_KEY, rec);
    this.modeRes = res;
    Sound.setEngine(0);
    Sound.play(res.newBest ? 'bonus' : 'gameover');
    this.setState('modeResult');
  },

  renderModeResult(ctx) {
    const r = this.modeRes;
    if (!r || r.mode !== 'galaxy' || !r.run || r.run === 'campaign') {
      gxdRenderModeResult.call(this, ctx);
      if (r && r.mode === 'galaxy') Font.drawCenter(ctx, 'CAMPAIGN', SW / 2, 54, COL.gold);
      return;
    }
    ctx.fillStyle = COL.black; ctx.fillRect(0, 0, SW, SH);
    Font.drawCenter(ctx, modeInfo('galaxy').name, SW / 2, 40, COL.red);
    Font.drawCenter(ctx, GXD_NAMES[r.run] + (r.run === 'daily' ? ' ' + r.date : ''), SW / 2, 54, COL.gold);
    const N = GX_BOSSES.length;
    const what = r.run === 'rush' ? (r.done ? 'ALL ' + N + ' BOSSES IN ' + fmtTime(r.frames) : 'BOSSES BEATEN: ' + r.bosses + '/' + N)
      : r.run === 'endless' ? 'YOU REACHED WAVE ' + Math.max(1, r.wave)
      : 'SECTOR ' + r.level + ', ' + (r.boss ? 'THE BOSS' : 'WAVE ' + Math.max(1, r.wave));
    Font.drawCenter(ctx, what, SW / 2, 80, r.done ? COL.gold : COL.white);
    Font.drawCenter(ctx, 'SCORE ' + r.score, SW / 2, 100, COL.white);
    const b = r.best;
    if (b) Font.drawCenter(ctx, 'BEST: ' + (r.run === 'rush' ? (b.bosses >= N ? 'ALL ' + N + ' IN ' + fmtTime(b.frames) : b.bosses + '/' + N + ' BOSSES') + '  ' + b.score
      : r.run === 'endless' ? 'WAVE ' + b.wave + '  ' + b.score : 'TODAY SECTOR ' + b.level + '  ' + b.score), SW / 2, 124, COL.lgrey);
    if (r.newBest && (this.t >> 4) & 1) Font.drawCenter(ctx, 'NEW BEST!', SW / 2, 150, COL.gold);
    if (this.t > 60) Font.drawCenter(ctx, 'PRESS ENTER', SW / 2, 196, COL.lgrey);
  },
});

// ------------------------------------------------------------------ online: the host's run reaches the guests
const gxdBuildView = Net.buildView, gxdApplyNetView = Net.applyView;
Object.assign(Net, {
  buildView(full) {
    const v = gxdBuildView.call(this, full);
    v.gxr = Game.gxRun || null; v.gxc = Game.gxClock || 0; v.gxdt = Game.gxDate || null;
    return v;
  },
  applyView(v) {
    // first, so a stage set up from this view knows the run
    if (v.gxr !== undefined) { Game.gxRun = v.gxr; Game.gxClock = v.gxc; Game.gxDate = v.gxdt; }
    return gxdApplyNetView.call(this, v);
  },
});
