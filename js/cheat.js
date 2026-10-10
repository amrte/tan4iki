'use strict';
// =====================================================================
//  CHEAT MODE: everything unlocked, any round of any mode to start from, the whole boss gallery.
//    The code, on the title screen: UP UP DOWN DOWN LEFT RIGHT LEFT RIGHT B A (the arrows or WASD, B: player 1's
//    second button or the B key, A: player 1's fire or the A key; a gamepad's d-pad, B and A; the on-screen pad on
//    touch), or tap the title logo 7 times quickly. Again turns it off. Remembered (STORE 'tank1990_cheat').
//    While it's on:
//      - every unlock check says yes: the classic stage picker goes to the end (BABA GALYA's secret stage too),
//        every FORTRESS map, every TANK RALLY tank; the BOSS GALLERY lists every boss, met and beaten
//      - the first curtain (or the mode's own start screen) picks where to start: SURVIVAL's wave, TIME ATTACK's
//        stage, VS CPU's round, the MAZE, the CUSTOM level, ANY SIDE's stage and edge, CORRIDOR's height (a band,
//        a depot, a boss gate), ASTRO TANKS' wave; GALAXY's sector or boss (up/down beside the run), KILL RACE's
//        round (up/down beside the target); TANK RALLY's world and division; DESERT DOMINION's mission
//      - a later start brings the kit the mode would have built up by then (GALAXY power, bombs and hangar
//        upgrades; ASTRO TANKS upgrades and crystals; SURVIVAL perks; TANK RALLY money)
//      - records, saves, the boss gallery and the careers are kept apart: STORE keys of progress are read and
//        written as '<key>~cheat' once written (until then the real ones are read), saves go to '<slot key>~cheat'.
//        Turning it off brings the real ones back untouched.
//  Wraps what the modes have (installed once every script is in, after the modes' own late hooks).
// =====================================================================

const CHEAT_KEY = 'tank1990_cheat';
const CHEAT_SEQ = ['U', 'U', 'D', 'D', 'L', 'R', 'L', 'R', 'B', 'A'];
const CHEAT_GAP = 180;                    // frames between two presses of the code before it starts over
const CHEAT_TAPS = 7, CHEAT_TAP_GAP = 700; // taps on the logo, ms between them
const CHEAT_SUFFIX = '~cheat';
// the STORE keys that hold progress and records (read through to the real ones until written)
const CHEAT_SHADOW = ['tank1990_hi', 'tank1990_modes', 'tank1990_bestStage', 'tank1990_lastStage', 'tank1990_daily',
  'tank1990_bossbook', 'tank1990_rally', 'tank1990_rts', 'tank1990_astro'];
const CHEAT_ROUNDS = 30, CHEAT_MAZES = 50, CHEAT_ASTRO_WAVES = 60, CHEAT_SIDES_STAGES = 99, CHEAT_CR_TOP = 3000;
const CHEAT_RALLY_MONEY = 500000;

const CHEAT = { on: false, prog: 0, last: 0, frame: 0, taps: 0, tapAt: 0, book: null, bookKey: '' };

// ------------------------------------------------------------------ the store: progress kept apart while it's on
(() => {
  const get = STORE.get, set = STORE.set, NONE = {};
  try { CHEAT.on = get.call(STORE, CHEAT_KEY, false) === true; } catch (e) { CHEAT.on = false; }
  STORE.get = function (k, d) {
    if (CHEAT.on && CHEAT_SHADOW.includes(k)) {
      const v = get.call(this, k + CHEAT_SUFFIX, NONE);
      if (v !== NONE) return v;
    }
    return get.call(this, k, d);
  };
  STORE.set = function (k, v) {
    return set.call(this, CHEAT.on && CHEAT_SHADOW.includes(k) ? k + CHEAT_SUFFIX : k, v);
  };
  CHEAT.rawSet = (k, v) => set.call(STORE, k, v);
})();

// pickers and kits are the host's (or a local game's) business; an online guest follows
const cheatLocal = () => CHEAT.on && !(typeof Net !== 'undefined' && Net.role === 'client');

function cheatToggle() {
  CHEAT.on = !CHEAT.on;
  CHEAT.rawSet(CHEAT_KEY, CHEAT.on);
  CHEAT.book = null;
  Game.hi = STORE.get('tank1990_hi', 20000);
  Game.peekCache = null;
  if (Game.menuIdx >= Game.titleMenu().length) Game.menuIdx = 0;
  Game.toast(CHEAT.on ? 'ALL UNLOCKED' : 'CHEAT MODE OFF');
  Sound.play(CHEAT.on ? 'secret' : 'pause');
}

// ------------------------------------------------------------------ the code on the title screen
// what was pressed this frame, as the code's letters (a key can be two: A is also LEFT)
function cheatTokens() {
  const tok = new Set(), codes = [];
  const add = (sym, list) => { for (const c of list) if (Input.just.has(c)) { tok.add(sym); codes.push(c); } };
  const k0 = Keymap.get(0);
  add('U', KEYS.solo[0].concat(k0.up)); add('R', KEYS.solo[1].concat(k0.right));
  add('D', KEYS.solo[2].concat(k0.down)); add('L', KEYS.solo[3].concat(k0.left));
  add('B', KEYS.solo.alt.concat(k0.alt, ['KeyB']));
  add('A', KEYS.solo.fire.concat(k0.fire, ['KeyA']));
  for (const p of Input.pads) {
    if (p.just0) tok.add('U');
    if (p.just1) tok.add('R');
    if (p.just2) tok.add('D');
    if (p.just3) tok.add('L');
    if (p.justAlt) tok.add('B');
    if (p.justFire) tok.add('A');
  }
  return { tok, codes };
}
// nothing of this frame's presses reaches the menu
function cheatSwallow(codes) {
  for (const c of codes) Input.just.delete(c);
  for (const p of Input.pads) { p.just0 = p.just1 = p.just2 = p.just3 = false; p.justFire = p.justAlt = p.justStart = p.justBack = false; }
}
// just up and down (a curtain where left/right do something else)
function cheatSwallowUD() {
  for (const c of KEYS.solo[0].concat(KEYS.solo[2])) Input.just.delete(c);
  for (const p of Input.pads) p.just0 = p.just2 = false;
}

// true when this frame finished the code
function cheatCodeStep() {
  CHEAT.frame++;
  const { tok, codes } = cheatTokens();
  if (!tok.size) return false;
  if (CHEAT.frame - CHEAT.last > CHEAT_GAP) CHEAT.prog = 0;
  CHEAT.last = CHEAT.frame;
  if (tok.has(CHEAT_SEQ[CHEAT.prog])) CHEAT.prog++;
  else CHEAT.prog = tok.has('U') ? (CHEAT.prog === 2 ? 2 : 1) : 0;
  // after the eight arrows, B and A belong to the code (B is also fire on the touch pad): the menu doesn't get them
  if (CHEAT.prog > 8) cheatSwallow(codes);
  if (CHEAT.prog < CHEAT_SEQ.length) return false;
  CHEAT.prog = 0;
  cheatSwallow(codes);
  return true;
}

// the title logo, in the menu's coordinates (as renderTitle draws it)
function cheatLogoBox() {
  const top = Game.titleMenuY(), rowBottom = Game.lastScores && Game.lastScores[1] ? 36 : 24;
  const w = Font.bigWidth(GAME_NAME, 4), y = Math.round((rowBottom + top - 4 - 28) / 2);
  return { x: (SW - w) >> 1, y, w, h: 28 };
}

// ------------------------------------------------------------------ the boss gallery: every page, met and beaten
function cheatBook() {
  const xs = typeof BOOK_X_PAGES !== 'undefined' ? BOOK_X_PAGES : [];
  const key = BOSSES.length + '/' + GX_BOSSES.map(b => b.key).join(',') + '/' + xs.length;
  if (CHEAT.book && CHEAT.bookKey === key) return CHEAT.book;
  const all = () => ({ seen: 1, beaten: 1 }), d = { t: {}, g: {}, x: {}, seeded: true, xSeeded: true, cheat: true };
  BOSSES.forEach((b, i) => { d.t[i] = all(); });
  GX_BOSSES.forEach(b => { d.g[b.key] = all(); });
  xs.forEach(p => { d.x[p.key] = all(); });
  CHEAT.book = d; CHEAT.bookKey = key;
  return d;
}

// ------------------------------------------------------------------ where to start: the pickers on the first curtain
// CORRIDOR's places to start: the start, each band, each depot, just below each boss gate (to 3000 m)
function cheatCorridorPoints() {
  if (cheatCorridorPoints.list) return cheatCorridorPoints.list;
  const pts = [{ sec: 0, name: 'THE START - 0 M' }];
  for (let k = 1; 13 * k <= CHEAT_CR_TOP; k++) {
    const g = crGateNo(k), dep = crDepotAlt(k), band = Math.floor(13 * k / CR_BAND_M) !== Math.floor(13 * (k - 1) / CR_BAND_M);
    if (g) pts.push({ sec: k - 1, name: 'BOSS GATE ' + g + ' - ' + 13 * k + ' M' });
    if (dep) pts.push({ sec: k, name: 'DEPOT ' + dep + ' M' });
    else if (band && !g) pts.push({ sec: k, name: crBand(13 * k).name + ' - ' + 13 * k + ' M' });
  }
  return (cheatCorridorPoints.list = pts);
}
const cheatAstroBoss = w => { if (w % 5) return ''; const L = astroWaveBosses(); return L[(w / 5 - 1) % L.length].name || 'BOSS'; };

// fields: min / max / text(value, G); live(G, vals): the curtain shows it as you pick; start(G, vals): set it up
// (return true when the mode starts by itself, else the stage begins)
const CHEAT_PICKS = {
  survival: {
    fields: [{ min: () => 1, max: () => SV_WAVES, text: v => '< WAVE ' + v + ' >' }],
    start(G, [w]) { G.ckResume = w > 1 ? { wave: w } : null; cheatSurvivalKit(G, w); },
  },
  timeattack: {
    fields: [{ min: () => 1, max: () => TA_STAGES, text: v => '< STAGE ' + v + ' OF ' + TA_STAGES + ' >' }],
    live(G, [s]) { G.stageNum = s; },
    start(G, [s]) { G.stageNum = s; G.taCleared = s - 1; },
  },
  cpu: {
    fields: [{ min: () => 1, max: () => CHEAT_ROUNDS, text: v => '< ROUND ' + v + ' >' }],
    live(G, [r]) { G.stageNum = r; },
    start(G, [r]) { G.stageNum = r; },
  },
  maze: {
    fields: [{ min: () => 1, max: () => CHEAT_MAZES, text: v => '< MAZE ' + v + (mazeIsLair(v) ? ': A LAIR' : '') + ' >' }],
    live(G, [n]) { G.stageNum = n; },
    start(G, [n]) { G.stageNum = n; },
  },
  custom: {
    fields: [{ min: () => 1, max: () => Math.max(1, Customs.used().length), text: v => '< LEVEL ' + v + ' OF ' + Math.max(1, Customs.used().length) + ' >' }],
    live(G, [n]) { G.stageNum = n; },
    start(G, [n]) { G.stageNum = n; },
  },
  sides: {
    fields: [{ min: () => 1, max: () => CHEAT_SIDES_STAGES, text: v => 'STAGE ' + v },
      { min: () => 0, max: () => SD_ROT.length - 1, text: v => 'EAGLE ' + SD_ROT[v].toUpperCase() }],
    // the run's seed turned so the rotation puts the eagle on the chosen edge at this stage (and goes round from it)
    live(G, [s, side]) {
      G.stageNum = s;
      const now = ((G.sdSeed | 0) + s - 1) % 4;
      G.sdSeed = (G.sdSeed | 0) + ((side - now) % 4 + 4) % 4;
      G.sdPlan = sdPlanFor(s, G.sdSeed); G.nextSide = G.sdPlan.side;
    },
    start(G, v) { this.live(G, v); },
  },
  corridor: {
    fields: [{ min: () => 0, max: () => cheatCorridorPoints().length - 1, text: v => '< ' + cheatCorridorPoints()[v].name + ' >' }],
    start(G, [i]) {
      const sec = cheatCorridorPoints()[i].sec;
      G.ckResume = sec > 0 ? { climbed: 13 * sec, lifeAt: Math.floor(sec / 5) * 5 + 5, kinds: corridorMix(13 * sec).map(m => m[0]), spawned: 0, cr2: { sec, alt: 13 * sec } } : null;
    },
  },
  astro: {
    fields: [{ min: () => 1, max: () => CHEAT_ASTRO_WAVES, text: v => '< WAVE ' + v + (cheatAstroBoss(v) ? ': ' + cheatAstroBoss(v) : '') + ' >' }],
    start(G, [w]) { G.cheatAstroWave = w; G.curtain.astro = false; G.astroEnter(); return true; },
  },
};

// the words the curtain shows (kept on the curtain, so an online guest's copy shows them too)
function cheatPickLines(c) {
  const P = c.cheat, spec = CHEAT_PICKS[P.mode];
  P.lines = spec.fields.map((F, i) => {
    const s = F.text(P.vals[i], Game);
    return spec.fields.length > 1 && i === P.f ? '< ' + s + ' >' : s;
  });
  P.hint = spec.fields.length > 1 ? 'UP DOWN: CHOOSE  < >: CHANGE' : '< >: ONE  UP DOWN: TEN';
}

function cheatPickNew(G) {
  const spec = CHEAT_PICKS[G.mode];
  if (!spec || (G.mode === 'custom' && !Customs.used().length)) return null;
  const c = G.curtain;
  c.cheat = { mode: G.mode, f: 0, rep: 0, vals: spec.fields.map(F => F.min(G)) };
  if (G.mode === 'sides') c.cheat.vals = [G.stageNum, SD_ROT.indexOf(G.nextSide) >= 0 ? SD_ROT.indexOf(G.nextSide) : 0];
  if (spec.live) spec.live(G, c.cheat.vals);
  cheatPickLines(c);
  return c.cheat;
}

// a direction this frame: pressed, or held (repeating); st[key] counts the frames to the next repeat
function cheatDir(st, key, m, which) {
  const keys = which === 'ud' ? ['up', 'down'] : ['left', 'right'], held = which === 'ud' ? [0, 2] : [3, 1];
  if (m[keys[0]]) { st[key] = 18; return -1; }
  if (m[keys[1]]) { st[key] = 18; return 1; }
  const h = Input.heldDir();
  if ((h === held[0] || h === held[1]) && --st[key] <= 0) { st[key] = 4; return h === held[0] ? -1 : 1; }
  return 0;
}

function cheatPickUpdate(G, c) {
  const P = c.cheat, spec = CHEAT_PICKS[P.mode], m = Input.menu(), nf = spec.fields.length;
  if (m.back) { G.toTitle(); return; }
  const lr = cheatDir(P, 'rep', m, 'lr'), ud = cheatDir(P, 'urep', m, 'ud');
  let dv = lr;
  if (ud && nf > 1) { P.f = (P.f + ud + nf) % nf; Sound.play('select'); }
  else if (ud) dv = -ud * 10;   // up: ten on
  if (dv) {
    const F = spec.fields[P.f], lo = F.min(G), hi = F.max(G), was = P.vals[P.f];
    let v = was + dv;
    if (v > hi) v = Math.abs(dv) > 1 && was < hi ? hi : lo;
    if (v < lo) v = Math.abs(dv) > 1 && was > lo ? lo : hi;
    P.vals[P.f] = v;
    if (spec.live) spec.live(G, P.vals);
    Sound.play('select');
  }
  cheatPickLines(c);
  if (m.ok && G.t > 10) {
    const vals = P.vals.slice();
    delete c.cheat;
    Sound.play('select');
    if (!spec.start(G, vals)) G.beginStage();
  }
}

// ------------------------------------------------------------------ the kits for a later start
// GALAXY: power, bombs and hangar upgrades for how far along sector n is (of how many there are, whatever that is)
function cheatGalaxyKit(G) {
  const run = G.gxRun || 'campaign', n = G.stageNum;
  const of = run === 'rush' ? GX_BOSSES.length : GX_SECTORS.length, done = run === 'endless' ? 2 * (n - 1) : n - 1;   // endless: two bosses a stage
  const f = Math.max(0, Math.min(1, done / Math.max(1, of - 1)));
  if (f <= 0) return;
  for (const p of G.players) {
    const gp = gxPlayer(p);
    gp.power = Math.max(gp.power, 1 + Math.round(f * (GX_POWER_MAX - 1)));
    gp.bombs = Math.max(gp.bombs, Math.min(5, 1 + Math.round(f * 4)));
    for (const k of Object.keys(GX_UPS)) gp.up[k] = Math.max(gxUp(p, k), Math.round(f * GX_UPS[k].prices.length));
  }
}
// SURVIVAL: a perk every 5 waves, as the waves before would have offered
function cheatSurvivalKit(G, w) {
  const n = Math.floor((w - 1) / 5), have = {};
  for (let k = 0; k < n; k++) {
    const pool = SV_PERKS.filter(p => (have[p.key] || 0) < p.max && !(p.key === 'lives' && Config.infiniteLives()));
    if (!pool.length) break;
    const pk = pool[rnd(pool.length)].key;
    have[pk] = (have[pk] || 0) + 1;
  }
  for (const p of G.players) {
    p.svPerks = Object.assign({}, have);
    if (have.lives) p.lives += 2 * have.lives;
  }
}
// ASTRO TANKS: the crystals a run would have had by wave w, spent in the hangar's way (what's left is kept)
const CHEAT_ASTRO_ORDER = ['guns', 'rapid', 'plates', 'engine', 'shells', 'handling', 'regen', 'magnet', 'pierce', 'salvage', 'bombs', 'homing', 'warp', 'rear', 'brakes', 'drone'];
function cheatAstroKit(kit, w) {
  let budget = Math.round(25 * (w - 1) + 1.5 * (w - 1) * (w - 1));
  for (let bought = true; bought;) {
    bought = false;
    for (const k of CHEAT_ASTRO_ORDER) {
      const d = ASTRO_UP[k];
      if (!d || astroLv(kit, k) >= d.max) continue;
      const cost = astroCost(kit, k);
      if (cost > budget) continue;
      budget -= cost; kit.up[k] = astroLv(kit, k) + 1; bought = true;
    }
  }
  kit.gems = (kit.gems | 0) + budget;
  kit.v = (kit.v | 0) + 1;
}

// ------------------------------------------------------------------ the hooks
function cheatHooks() {
  if (cheatHooks.done) return;
  cheatHooks.done = true;
  const G = Game;
  G.hi = STORE.get('tank1990_hi', 20000);
  const wrap = (obj, name, make) => {
    const f = obj[name];
    if (typeof f !== 'function') return;
    const w = make(f);
    for (const k of Object.keys(f)) w[k] = f[k];
    obj[name] = w;
  };

  // ---- the title: the code, the logo taps, the mark
  wrap(G, 'updateTitle', f => function () {
    if (this.state === 'title' && cheatCodeStep()) cheatToggle();
    return f.apply(this, arguments);
  });
  wrap(G, 'pointer', f => function (x, y) {
    if (this.state === 'title' && this.titleY === 0) {
      const b = cheatLogoBox(), mx = x - menuOX(), my = y - menuOY();
      if (mx >= b.x - 4 && mx <= b.x + b.w + 4 && my >= b.y - 4 && my <= b.y + b.h + 4) {
        const now = Date.now();
        CHEAT.taps = now - CHEAT.tapAt < CHEAT_TAP_GAP ? CHEAT.taps + 1 : 1;
        CHEAT.tapAt = now;
        if (CHEAT.taps >= CHEAT_TAPS) { CHEAT.taps = 0; cheatToggle(); }
        return;
      }
    }
    return f.apply(this, arguments);
  });
  wrap(G, 'renderTitle', f => function (ctx) {
    const r = f.apply(this, arguments);
    if (CHEAT.on) {
      ctx.save();
      ctx.translate(0, this.titleY);
      const s = 'ALL UNLOCKED', w = s.length * 8 + 8;
      ctx.fillStyle = '#7C0800'; ctx.fillRect((SW - w) >> 1, 2, w, 11);
      Font.drawCenter(ctx, s, SW / 2, 4, (this.t >> 5) & 1 ? COL.gold : '#FCE8A0');
      ctx.restore();
    }
    return r;
  });

  // ---- what's unlocked
  wrap(G, 'stageLimit', f => function () {
    const n = f.apply(this, arguments);
    return CHEAT.on ? Math.max(n, 99, typeof galyaStage === 'function' ? galyaStage() : 0) : n;
  });
  if (typeof tdUnlocked === 'function') {
    const td = tdUnlocked;
    tdUnlocked = function (i) { return CHEAT.on || td(i); };   // eslint-disable-line no-func-assign
  }
  if (typeof rallyCanBuyChassis === 'function') {
    const can = rallyCanBuyChassis;
    rallyCanBuyChassis = function (C, p, key) {   // eslint-disable-line no-func-assign
      if (!CHEAT.on || !C) return can(C, p, key);
      return can(Object.assign({}, C, { world: Math.max(C.world | 0, rallyWorlds().length - 1) }), p, key);
    };
  }
  wrap(BossBook, 'load', f => function () { return CHEAT.on ? cheatBook() : f.apply(this, arguments); });
  wrap(BossBook, 'mark', f => function () { return CHEAT.on ? undefined : f.apply(this, arguments); });

  // ---- saves: a slot of their own while it's on
  wrap(G, 'saveKey', f => function (slot) { return f.apply(this, arguments) + (CHEAT.on ? CHEAT_SUFFIX : ''); });

  // ---- the first curtain: where to start
  wrap(G, 'newGame', f => function (n, custom) {
    const r = f.apply(this, arguments);
    this.cheatKit = null; this.cheatAstroWave = 0;
    const c = this.curtain;
    if (!cheatLocal() || custom || this.daily || !c) return r;
    if (this.mode === 'galaxy') { c.cheatUD = { what: 'galaxy', rep: 0 }; this.cheatKit = 'galaxy'; }
    else if (this.mode === 'race') c.cheatUD = { what: 'race', rep: 0 };
    else cheatPickNew(this);
    if (c.cheatUD) c.cheatUD.hint = c.cheatUD.what === 'galaxy' ? 'UP DOWN: THE SECTOR OR BOSS' : 'UP DOWN: THE ROUND';
    return r;
  });
  wrap(G, 'updateCurtain', f => function () {
    const c = this.curtain;
    if (c && c.phase === 'show' && c.cheat && CHEAT_PICKS[c.cheat.mode] && cheatLocal()) { cheatPickUpdate(this, c); return; }
    // the classic stage picker goes a long way now: holding a direction runs through the stages
    if (c && c.phase === 'show' && c.selectable && !c.tdSel && !c.raceSel && !c.gxSel && cheatLocal() && !this.daily) {
      const m = Input.menu(), h = Input.heldDir();
      if (m.up || m.down || m.left || m.right) c.cheatRep = 18;
      else if (h >= 0 && --c.cheatRep <= 0) {
        const n = this.stageLimit();
        c.cheatRep = 3;
        this.stageNum = h === 0 || h === 1 ? this.stageNum % n + 1 : (this.stageNum + n - 2) % n + 1;
        Sound.play('select');
      }
    }
    const U = c && c.phase === 'show' && c.cheatUD;
    if (U && ((U.what === 'galaxy' && c.gxSel) || (U.what === 'race' && c.raceSel)) && cheatLocal()) {
      const d = -cheatDir(U, 'rep', Input.menu(), 'ud');
      if (d) {
        if (U.what === 'race') { this.round = Math.max(1, Math.min(CHEAT_ROUNDS, this.round + d)); this.stageNum = (this.round - 1) % LEVELS.length + 1; }
        else this.stageNum += d;
        Sound.play('select');
      }
      cheatSwallowUD();
      const r = f.apply(this, arguments);
      if (U.what === 'galaxy') {
        const run = this.gxRun || 'campaign', top = run === 'rush' ? GX_BOSSES.length : run === 'endless' ? CHEAT_ROUNDS : GX_SECTORS.length;
        if (this.stageNum > top) this.stageNum = d > 0 ? 1 : top;
        if (this.stageNum < 1) this.stageNum = top;
      }
      return r;
    }
    return f.apply(this, arguments);
  });
  wrap(G, 'renderCurtain', f => function (ctx) {
    const r = f.apply(this, arguments), c = this.curtain;
    if (!c || c.phase !== 'show') return r;
    const cx = SCREEN_W / 2, cy = SCREEN_H >> 1, y = cy - 84, P = c.cheat;
    // the classic stage picker: how far it goes now, and a stage number of three digits that fits
    const classic = CHEAT.on && c.selectable && (this.mode === 'classic' || this.mode === 'bigmaps') && !this.daily;
    if (classic && this.stageNum >= 100) {
      ctx.fillStyle = COL.bg; ctx.fillRect(0, cy - 9, SCREEN_W, 10);
      Font.drawCenter(ctx, 'STAGE ' + this.stageNum, cx, cy - 8, COL.black);
    }
    if (!(P || c.cheatUD || classic)) return r;
    const lines = P ? P.lines || [] : [], n = 2 + lines.length;
    ctx.fillStyle = COL.bg; ctx.fillRect(0, y - 2, SCREEN_W, n * 11 + 2);
    Font.drawCenter(ctx, 'CHEAT: PICK THE START', cx, y, '#A00000');
    lines.forEach((s, i) => Font.drawCenter(ctx, s, cx, y + 11 + i * 11, P.f === i && lines.length > 1 && (this.t >> 4) & 1 ? '#3C3C3C' : COL.black));
    Font.drawCenter(ctx, P ? P.hint : c.cheatUD ? c.cheatUD.hint : 'EVERY STAGE OPEN: 1 TO ' + this.stageLimit(), cx, y + 11 * (n - 1), '#3C3C3C');
    if (P && P.mode === 'astro') Font.drawCenter(ctx, modeInfo('astro').name, cx, cy - 8, COL.black);   // its curtain is bare
    return r;
  });

  // ---- the kits
  wrap(G, 'beginStage', f => function () {
    const kit = this.cheatKit;
    this.cheatKit = null;
    const gx = kit === 'galaxy' && this.mode === 'galaxy' && this.gxFresh;
    if (gx) cheatGalaxyKit(this);
    const r = f.apply(this, arguments);
    // BOSS RUSH's own start (power 4, 3 bombs) comes in between: the kit again if it's more, and the checkpoint with it
    if (gx && this.gxRun === 'rush' && this.stageNum > 1) {
      cheatGalaxyKit(this);
      if (this.ck) { this.ck = this.ckTake(this.ck.at); this.autoSave(); }
    }
    return r;
  });
  wrap(G, 'astroStart', f => function () {
    const A = f.apply(this, arguments), w = this.cheatAstroWave | 0;
    this.cheatAstroWave = 0;
    if (A && w > 1 && cheatLocal()) {
      for (const p of this.players) cheatAstroKit(p.astro, w);
      A.startWave(w);
    }
    return A;
  });

  // ---- TANK RALLY: after the tanks are picked, the world and the division
  wrap(G, 'rallyMenuItems', f => function () {
    return this.rm && this.rm.phase === 'cheat' ? [{ what: 'cworld' }, { what: 'cdiv' }, { what: 'cgo' }] : f.apply(this, arguments);
  });
  wrap(G, 'rallyMenuAct', f => function (dir) {
    const R = this.rm;
    if (R && R.phase === 'setup' && cheatLocal() && dir) {
      const it = this.rallyMenuItems()[R.idx];
      if (it && it.what === 'start') { R.phase = 'cheat'; R.idx = 0; R.cw = R.cw || { world: 0, div: 0 }; Sound.play('select'); return; }
    }
    if (R && R.phase === 'cheat') { if (dir) cheatRallyAct(this, dir); return; }
    return f.apply(this, arguments);
  });
  wrap(G, 'updateRallyMenu', f => function () {
    const R = this.rm;
    if (!R || R.phase !== 'cheat') return f.apply(this, arguments);
    const m = this.rallyNav(R, 3);
    if (m.back) { R.phase = 'setup'; R.idx = this.rallyMenuItems().length - 1; Sound.play('select'); return; }
    if ((m.left || m.right) && R.idx < 2) cheatRallyAct(this, m.left ? -1 : 1);
    else if (m.ok && this.t > 8) { if (R.idx < 2) { R.idx++; Sound.play('select'); } else cheatRallyAct(this, 1); }
  });
  wrap(G, 'renderRallyMenu', f => function (ctx) {
    const R = this.rm;
    if (!R || R.phase !== 'cheat') return f.apply(this, arguments);
    cheatRallyRender(this, ctx);
  });
  wrap(G, 'rallyMenuPointer', f => function (x, y) {
    const R = this.rm;
    if (!R || R.phase !== 'cheat') return f.apply(this, arguments);
    const i = Math.floor((y - 116) / 16);
    if (i < 0 || i > 2) return;
    if (i !== R.idx && i === 2) { R.idx = i; Sound.play('select'); return; }
    R.idx = i;
    cheatRallyAct(this, x < 164 && i < 2 ? -1 : 1);
  });

  // ---- DESERT DOMINION: the mission to start the House's campaign at
  wrap(G, 'rtsCUpdHouse', f => function () {
    if (cheatLocal()) {
      const m = Input.menu(), d = m.up ? 1 : m.down ? -1 : 0;
      if (d) { this.cheatRtsLevel = ((this.cheatRtsLevel || 1) - 1 + d + 9) % 9 + 1; Sound.play('select'); }
    }
    return f.apply(this, arguments);
  });
  wrap(G, 'rtsCDrawHouse', f => function (ctx) {
    const r = f.apply(this, arguments);
    if (!cheatLocal()) return r;
    const L = this.cheatRtsLevel || 1;
    ctx.fillStyle = '#000000'; ctx.fillRect(0, 196, SW, 12);
    Font.drawCenter(ctx, 'UP DOWN: MISSION ' + L + (L === 9 ? ', THE REGENT' : ' OF 9'), SW / 2, 199, COL.gold);
    return r;
  });
  wrap(G, 'rtsCHouseIntroPick', f => function (yes) {
    const r = f.apply(this, arguments), L = this.cheatRtsLevel || 1, C = this.rtsC;
    if (yes && cheatLocal() && C && L > 1 && C.level === 1) {
      C.level = L;
      const cands = rtsCCandidates(C);
      if (cands.length) C.region = cands[0];
      this.rtsCToBrief();
    }
    return r;
  });
}

// TANK RALLY's cheat page: dir on WORLD or DIVISION changes it; on START the career starts there
function cheatRallyAct(G, dir) {
  const R = G.rm, W = rallyWorlds(), cw = R.cw;
  if (R.idx === 0) { cw.world = (cw.world + dir + W.length) % W.length; if (cw.div === 2) cw.div = 1; Sound.play('select'); return; }
  if (R.idx === 1) { cw.div = (cw.div + dir + 3) % 3; if (cw.div === 2) cw.world = W.length - 1; Sound.play('select'); return; }
  const C = rallyNewState(R.picks);
  C.world = cw.div === 2 ? W.length - 1 : cw.world; C.div = cw.div;
  rallyBeginDivision(C);
  for (const p of C.players) p.money = CHEAT_RALLY_MONEY;
  G.rally = C;
  rallySave(C);
  Sound.play('pickup');
  G.rallyToHub();
}
function cheatRallyRender(G, ctx) {
  const R = G.rm, W = rallyWorlds(), cw = R.cw;
  ctx.fillStyle = COL.black; ctx.fillRect(0, 0, SW, SH);
  rallyChecker(ctx, 0, 8, G.t);
  Font.drawCenter(ctx, 'NEW CAREER', SW / 2, 20, COL.red);
  Font.drawCenter(ctx, 'CHEAT: WHERE TO START', SW / 2, 36, COL.gold);
  const world = cw.div === 2 ? W.length - 1 : cw.world;
  const rows = [['WORLD', (W[world] || {}).name || 'WORLD ' + (world + 1)], ['DIVISION', rallyDivName(cw.div)], ['START CAREER', '']];
  rows.forEach(([a, b], k) => {
    const y = 120 + k * 16, on = k === R.idx;
    if (on) { ctx.fillStyle = RALLY_DARK; ctx.fillRect(16, y - 4, SW - 32, 15); }
    if (!b) { Font.drawCenter(ctx, a, SW / 2, y, on ? COL.white : COL.lgrey); return; }
    Font.draw(ctx, a, 24, y, on ? COL.white : COL.lgrey);
    Font.drawCenter(ctx, '< ' + b + ' >', 164, y, on ? COL.gold : COL.lgrey);
  });
  R.picks.forEach((pk, i) => rallyTank(ctx, rallyLoadout(pk), SW / 2 - 16 * R.picks.length + i * 32, 60, 2, 0, (G.t >> 3) & 1));
  Font.drawCenter(ctx, 'EACH WITH ' + '$' + CHEAT_RALLY_MONEY + ' TO SPEND', SW / 2, 96, '#58D854');
  Font.drawCenter(ctx, cw.div === 2 ? 'VS BARON KRAGG' : 'EVERY TANK ON SALE', SW / 2, 176, COL.lgrey);
  Font.drawCenter(ctx, 'ARROWS PICK  A OK  ESC BACK', SW / 2, 208, COL.lgrey);
  rallyChecker(ctx, SH - 8, 8, G.t);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', cheatHooks); else setTimeout(cheatHooks, 0);
