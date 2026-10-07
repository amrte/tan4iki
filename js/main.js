'use strict';
// =====================================================================
//  Game flow: title → stage curtain → play → score tally → next / over
// =====================================================================

// Menus (title, settings, shop, score) are drawn in a classic 256x224 frame, centred on the
// play screen, whose size follows the field size (SCREEN_W x SCREEN_H, see setFieldSize).
const SW = 256, SH = 224;
const SAVE_KEY = 'tank1990_save';
const menuOX = () => (SCREEN_W - SW) >> 1;
const menuOY = () => (SCREEN_H - SH) >> 1;
const STORE = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } },
};

// construction palette: the 14 patterns of the original editor (as 2x2 blocks)
const CONSTRUCT_PATS = [
  ['.#', '.#'], ['..', '##'], ['#.', '#.'], ['##', '..'], ['##', '##'],
  ['.@', '.@'], ['..', '@@'], ['@.', '@.'], ['@@', '..'], ['@@', '@@'],
  ['~~', '~~'], ['%%', '%%'], ['__', '__'],
  // additions: mud, conveyor belts (up, right, down, left) and a teleporter pad (pads pair up in the order placed)
  ['mm', 'mm'], ['^^', '^^'], ['>>', '>>'], ['vv', 'vv'], ['<<', '<<'], ['TT', 'TT'],
  ['..', '..'],
];

function newPlayer(i) {
  return {
    i, score: 0, lives: Config.startLives(), level: Config.get('startStars'), ship: false, cutter: false,
    kills: zeroKills(), out: false, extraGiven: false, extraCount: 0, mines: 0, turrets: 0, bridges: 0, tank: null,
    kit: null, shopShovel: false, spent: 0,   // spent: points paid out in the shop (score keeps everything earned)
    rank: Config.get('startLevel'), xp: RANKS[Config.get('startLevel') - 1].xp, stageXp: 0,   // XP level (1-10)
  };
}

function defaultCustomMap() {
  const rows = [];
  for (let y = 0; y < 26; y++) rows.push('.'.repeat(26).split(''));
  for (const [bx, by] of BASE_WALL) rows[by][bx] = '#';
  return rows.map(r => r.join(''));
}

const TITLE_MENU_Y = 126;
const ROMAN = ['I', 'II', 'III', 'IV'];
const pauseMenu = () => (Net.role === 'host' ? ['CONTINUE', 'SAVE GAME', 'ONLINE PLAYERS', 'QUIT'] : ['CONTINUE', 'SAVE GAME', 'QUIT']);
const SETTINGS_ROWS = 15, SETTINGS_TOP = 24, SETTINGS_ROW_H = 12;

// Between-stage shop: score buys upgrades. price is in points at 100% "SHOP PRICES".
// Kit items (helmet, turbo, ...) take effect when your tank first appears in the next stage.
const SHOP_ITEMS = [
  { id: 'revive', name: 'REVIVE', icon: PU.REVIVE, desc: 'BRING A FALLEN PLAYER BACK' },
  { id: 'life', name: 'EXTRA LIFE', price: 5000, icon: PU.TANK, desc: 'ONE MORE TANK' },
  { id: 'star', name: 'STAR', price: 3000, icon: PU.STAR, desc: 'ONE MORE STAR, UP TO 3' },
  { id: 'gun', name: 'GUN', price: 8000, icon: PU.GUN, desc: 'MAX LEVEL + CUTS TREES' },
  { id: 'ship', name: 'SHIP', price: 3000, icon: PU.SHIP, desc: 'CROSS WATER, SOAKS A HIT' },
  { id: 'mines', name: 'MINES', price: 1500, icon: PU.MINES, desc: 'MINES FOR THE B BUTTON' },
  { id: 'shovel', name: 'SHOVEL', price: 2000, icon: PU.SHOVEL, desc: 'STEEL EAGLE WALLS AT START' },
  { id: 'helmet', name: 'HELMET', price: 1000, icon: PU.HELMET, desc: 'SHIELD AT STAGE START' },
  { id: 'turbo', name: 'TURBO', price: 1500, icon: PU.TURBO, desc: 'FAST TANK AT STAGE START' },
  { id: 'rapid', name: 'RAPID', price: 2000, icon: PU.RAPID, desc: 'RAPID FIRE AT STAGE START' },
  { id: 'spread', name: 'SPREAD', price: 2000, icon: PU.SPREAD, desc: '3-WAY FIRE AT STAGE START' },
  { id: 'rocket', name: 'ROCKET', price: 3000, icon: PU.ROCKET, desc: 'ROCKETS AT STAGE START' },
  { id: 'pierce', name: 'PIERCE', price: 3000, icon: PU.PIERCE, desc: 'PIERCING SHELLS AT START' },
  { id: 'turret', name: 'TURRET', price: 4000, icon: PU.TURRET, desc: 'PLACE IT ANYWHERE WITH B' },
  { id: 'claude', name: 'CLAUDE', price: 6000, icon: PU.CLAUDE, desc: 'CLAUDE JOINS NEXT STAGE' },
  // makes every Claude better (team-wide, kept between stages like the base upgrades; extras.js)
  { id: 'claudeUp', up: 'claude', name: CLAUDE_UPGRADE.name, prices: CLAUDE_UPGRADE.prices, descs: CLAUDE_UPGRADE.descs, icon: PU.CLAUDE },
  { id: 'wingman', name: 'WINGMAN', price: 5000, icon: PU.TANK, desc: 'AN AI TANK FIGHTS BESIDE YOU' },
  { id: 'decoy', name: 'DECOY EAGLE', price: 3000, icon: PU.SHOVEL, desc: 'FAKE EAGLE LURES RUSHERS' },
  { id: 'smoke', name: 'SMOKE', price: 1500, icon: PU.SMOKE, desc: 'SMOKE SCREEN AT STAGE START' },
  { id: 'bridge', name: 'BRIDGE KIT', price: 1500, icon: PU.BRIDGE, desc: '2 BRIDGES: DRIVE INTO WATER' },
  // base upgrades: shared by the team, 3 levels each (base.js)
  ...BASE_UPGRADES.map((u, i) => ({ id: 'base_' + u.key, base: u.key, name: u.name, prices: u.prices, descs: u.descs, bicon: i })),
  { id: 'done', name: 'START STAGE' },
];
const SHOP_ROWS = 9, SHOP_TOP = 40, SHOP_ROW_H = 16;

// Daily challenge: the same 3 stages and 2 twists for everyone on a given day, 1 player, no shop, no saves.
const DAILY_KEY = 'tank1990_daily', DAILY_STAGES = 3;
const MODE_KEY = 'tank1990_modes';   // survival and time-attack records
const fmtTime = f => { const s = f / 60; return Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0') + '.' + Math.floor((s * 10) % 10); };
const ENEMY_KEYS = k => ENEMY.map((e, i) => 'e' + i + k).filter(key => Config.defs[key]);
const DAILY_MODS = [
  { name: 'DOUBLE TROUBLE', set: v => { v.enemyCount = 40; v.maxOnScreen = 6; } },
  { name: 'GLASS CANNON', set: v => { v.lives = 1; v.startStars = 3; v.pShell = 200; } },
  { name: 'SPEED DEMONS', set: v => { for (const k of ENEMY_KEYS('Speed')) v[k] = 150; } },
  { name: 'NO POWER-UPS', set: v => { POWERUPS.forEach((pu, i) => { v['pu' + i] = 'OFF'; }); } },
  { name: 'NEW BREED', set: v => { v.newEnemies = 'MANY'; } },
  { name: 'ROCKET PARTY', set: v => { v.startStars = 3; v.keepStars = 'ON'; } },
  { name: 'IRON HIDES', set: v => { for (const k of ENEMY_KEYS('Hits')) v[k] = Math.min(9, v[k] + 1); } },
  { name: 'WIDE OPEN', set: v => { v.fieldW = 20; v.fieldH = 15; } },
  { name: 'NIGHT SHIFT', set: v => { v.skill = 4; } },
  { name: 'EASY RIDER', set: v => { v.skill = 1; v.lives = 5; } },
  { name: 'TURBO TANK', set: v => { v.pSpeed = 175; } },
  { name: 'BOSS RUSH', set: v => { v.bossRounds = 'ON'; v.bossEvery = 5; }, boss: true },
  { name: 'LIGHTS OUT', set: v => { v.darkStages = 'ALWAYS NIGHT'; } },
  { name: 'PEA SOUP', set: v => { v.darkStages = 'ALWAYS FOG'; } },
];

// two twists clash when both set the same setting to different values (NIGHT SHIFT and EASY RIDER both pick the
// skill, LIGHTS OUT and PEA SOUP the dark stages, ...): one would silently undo the other
function dailyClash(a, b) {
  const va = {}, vb = {};
  DAILY_MODS[a].set(va); DAILY_MODS[b].set(vb);
  return Object.keys(va).some(k => k in vb && vb[k] !== va[k]);
}

function dailyToday(when = new Date()) {
  const d = when, date = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const r = seeded(+date.replace(/-/g, '') * 2654435761);
  const a = Math.floor(r() * DAILY_MODS.length);
  const ok = [];
  for (let i = 0; i < DAILY_MODS.length; i++) if (i !== a && !dailyClash(a, i)) ok.push(i);
  const b = ok[Math.floor(r() * ok.length)];
  let stage = 1 + Math.floor(r() * 30);
  // BOSS RUSH: start one stage before a boss stage (bosses every 5), so the 3-stage run always meets one
  if (DAILY_MODS[a].boss || DAILY_MODS[b].boss) stage = Math.max(1, Math.round((stage + 1) / 5)) * 5 - 1;
  return { date, stage, mods: [a, b] };
}

function shopPrice(item) {
  const discount = Game.shopDiscount ? 0.75 : 1;
  if (item.id === 'revive') return reviveCost();   // the REVIVE COST setting, as during play
  const price = item.prices ? item.prices[Math.min(item.prices.length - 1, Game.base[item.base || item.up] || 0)] : item.price;
  return Math.round((price * Config.scale('shopPrices') * discount) / 100) * 100;
}

// what the player already has; `max` means it can't be bought again
function shopStatus(item, p) {
  if (item.id === 'revive') {
    if (!reviveCost()) return { text: 'OFF', max: true };
    if (p.out) return { text: 'YOU', max: false };
    const n = Game.players.filter(q => q.out).length;
    return n ? { text: 'X' + n, max: false } : { text: '', max: true };
  }
  if (p.out && item.id !== 'done') return { text: '', max: true };   // a fallen player can only buy a revival
  if (item.up) {
    const lv = Game.base[item.up] || 0, top = item.prices.length;
    return { text: lv >= top ? 'MAX' : 'L' + lv + '/' + top, max: lv >= top };
  }
  if (item.base) {
    if (!Config.on('baseShop')) return { text: 'OFF', max: true };
    const lv = Game.base[item.base] || 0, top = item.prices.length;
    return { text: lv >= top ? 'MAX' : 'L' + lv + '/' + top, max: lv >= top };
  }
  switch (item.id) {
    case 'life': return Config.infiniteLives() ? { text: 'INF', max: true } : { text: 'X' + p.lives, max: p.lives >= 99 };
    case 'star': return { text: p.level + '/3', max: p.level >= 3 };
    case 'gun': return p.level >= 3 && p.cutter ? { text: 'OWNED', max: true } : { text: '' };
    case 'ship': return p.ship ? { text: 'OWNED', max: true } : { text: '' };
    case 'mines': return { text: 'X' + (p.mines || 0), max: (p.mines || 0) >= 99 };
    case 'turret': return { text: 'X' + (p.turrets || 0), max: (p.turrets || 0) >= 9 };
    case 'bridge': return { text: 'X' + (p.bridges || 0), max: (p.bridges || 0) >= 9 };
    case 'shovel': return p.shopShovel ? { text: 'READY', max: true } : { text: '' };
    case 'done': return { text: '' };
    default: return p.kit && p.kit[item.id] ? { text: 'READY', max: true } : { text: '' };
  }
}

function shopApply(item, p) {
  if (item.id === 'revive') {
    const who = p.out ? p : Game.players.find(q => q.out);
    who.out = false;
    who.lives = 0;
    return;
  }
  if (item.id === 'turret') { p.turrets = (p.turrets || 0) + 1; return; }
  if (item.id === 'bridge') { p.bridges = (p.bridges || 0) + 2; return; }
  if (item.base || item.up) { const k = item.base || item.up; Game.base[k] = (Game.base[k] || 0) + 1; return; }
  switch (item.id) {
    case 'life': p.lives++; break;
    case 'star': p.level++; break;
    case 'gun': p.level = 3; p.cutter = true; break;
    case 'ship': p.ship = true; break;
    case 'mines': p.mines = (p.mines || 0) + Config.get('mineCount'); break;
    case 'shovel': p.shopShovel = true; break;
    default: p.kit = p.kit || {}; p.kit[item.id] = true;
  }
}

const Game = {
  state: 'title',
  t: 0,
  hi: 20000,
  players: [],
  base: newBase(),   // base upgrades bought in the shop (shared)
  twoP: false,
  multiN: 2,     // players chosen on the MULTIPLAYER row (2-4)
  stageNum: 1,
  stage: null,
  paused: false,
  lastScores: [0, 0],
  menuIdx: 0,
  pauseIdx: 0,
  pauseMsg: '',
  pauseMsgT: 0,
  titleY: SH,
  custom: null,
  customPending: false,

  init() {
    this.hi = STORE.get('tank1990_hi', 20000);
    const c = STORE.get('tank1990_custom', null);
    this.custom = Array.isArray(c) && c.length === 26 ? c : defaultCustomMap();
    this.toTitle();
  },

  setState(s) { this.state = s; this.t = 0; },

  saveHi() {
    for (const p of this.players) if (p.score > this.hi && !p.bot) this.hi = p.score;   // bots don't set high scores
    STORE.set('tank1990_hi', this.hi);
  },

  // ---------------------------------------------------------------- screen layout
  // field size from the settings; FIT matches the window's shape
  desiredField() {
    let w = Config.get('fieldW'), h = Config.get('fieldH');
    const wrap = document.getElementById('wrap');
    const aspect = wrap && wrap.clientHeight ? wrap.clientWidth / wrap.clientHeight : 16 / 10;
    if (w === 'FIT' && h === 'FIT') h = 13;
    if (w === 'FIT') w = Math.max(13, Math.min(60, Math.round((aspect * (h * 16 + 16) - 48) / 16)));
    if (h === 'FIT') h = Math.max(13, Math.min(40, Math.round(((w * 16 + 48) / aspect - 16) / 16)));
    return [w, h];
  },

  // vc / vr: the screen's window when the field is a big scrolling map
  applyLayout(cols, rows, vc, vr) {
    if (cols === undefined) [cols, rows] = this.desiredField();
    setFieldSize(cols, rows, vc, vr);
  },

  // ---------------------------------------------------------------- title
  toTitle() {
    Sound.setEngine(0);
    this.endDaily();
    this.applyLayout();
    this.titleY = SH;
    this.setState('title');
    if (this.menuIdx >= this.titleMenu().length) this.menuIdx = 0;
  },

  hasSave() { return !!STORE.get(SAVE_KEY, null); },

  titleMenu() {
    const m = [];
    if (this.hasSave()) m.push({ label: 'CONTINUE', act: () => this.loadGame() });
    m.push({ label: '1 PLAYER', act: () => this.startGame(1) });
    // left/right picks 2, 3 or 4 players
    m.push({ label: this.multiN + ' PLAYERS', act: () => this.startGame(this.multiN), adjust: d => { this.multiN = (this.multiN - 2 + d + 3) % 3 + 2; } });
    // left/right switches between hosting and joining an online game
    m.push({ label: this.onlineJoin ? 'ONLINE: JOIN' : 'ONLINE: HOST', act: () => this.openOnline(), adjust: () => { this.onlineJoin = !this.onlineJoin; } });
    // skill level, named as in DOOM: left/right (or A) changes it
    // game mode: left/right (or A) changes it
    m.push({ label: 'MODE: ' + modeInfo(Config.get('gameMode')).name, mode: true, act: () => Config.step('gameMode', 1), adjust: d => Config.step('gameMode', d) });
    m.push({ label: 'DAILY CHALLENGE', daily: true, act: () => this.startDaily() });
    m.push({ label: Config.get('skill') === AUTO_SKILL ? 'AUTO SKILL' : Config.skill().name, skill: true, act: () => Config.step('skill', 1), adjust: d => Config.step('skill', d) });
    m.push({ label: 'CONSTRUCTION', act: () => this.toConstruct() });
    m.push({ label: 'SETTINGS', act: () => this.toSettings() });
    return m;
  },

  updateTitle() {
    const m = Input.menu();
    if (this.titleY > 0) {
      this.titleY = Math.max(0, this.titleY - 2);
      if (m.any) this.titleY = 0;
      return;
    }
    const n = this.titleMenu().length;
    if (m.up) { this.menuIdx = (this.menuIdx + n - 1) % n; Sound.play('select'); }
    if (m.down || m.select) { this.menuIdx = (this.menuIdx + 1) % n; Sound.play('select'); }
    const item = this.titleMenu()[this.menuIdx];
    if (item && item.adjust && (m.left || m.right)) { item.adjust(m.right ? 1 : -1); Sound.play('select'); }
    if (m.ok) this.chooseMenu(this.menuIdx);
  },

  chooseMenu(i) {
    const item = this.titleMenu()[i];
    if (item) item.act();
  },

  renderTitle(ctx) {
    ctx.fillStyle = COL.black;
    ctx.fillRect(0, 0, SW, SH);
    ctx.save();
    ctx.translate(0, this.titleY);
    Font.draw(ctx, 'I-', 16, 16, COL.white);
    Font.drawRight(ctx, this.lastScores[0] ? this.lastScores[0] : '00', 88, 16, COL.white);
    Font.draw(ctx, 'HI-', 112, 16, COL.white);
    Font.drawRight(ctx, this.hi, 176, 16, COL.white);
    // version beside the hi-score; a II-player score drops to the row below
    Font.draw(ctx, 'V' + APP_VERSION, 192, 16, COL.lgrey);
    if (this.lastScores[1]) {
      Font.draw(ctx, 'II-', 184, 28, COL.white);
      Font.drawRight(ctx, this.lastScores[1], 248, 28, COL.white);
    }
    const pat = Sprites.bricks(ctx);
    Font.big(ctx, GAME_NAME, (SW - Font.bigWidth(GAME_NAME, 4)) >> 1, 58, 4, pat);
    const menu = this.titleMenu(), top = this.titleMenuY(), step = this.titleStep();
    menu.forEach((it, i) => {
      Font.draw(ctx, it.label, 88, top + i * step, it.skill ? ['#58D854', '#B8F818', COL.white, COL.orange, COL.red, '#3CBCFC'][Config.get('skill')] : COL.white);
      if (it.adjust && !it.skill && i === this.menuIdx) Font.draw(ctx, '<>', 88 + it.label.length * 8 + 6, top + i * step, COL.lgrey);
    });
    if (this.titleY === 0) {
      const anim = (this.t >> 2) & 1;
      ctx.drawImage(Sprites.tank('p0', anim, 1, Config.playerPal(0)), 64, top - 4 + this.menuIdx * step);
    }
    const cur = menu[this.menuIdx];
    if (cur && cur.mode && this.titleY === 0) {
      const mi = modeInfo(Config.get('gameMode')), rec = STORE.get(MODE_KEY, {});
      Font.drawCenter(ctx, mi.desc + (mi.cpu ? '' : mi.vs ? ' (2-4 P)' : ''), SW / 2, 203, COL.gold);
      const best = mi.key === 'survival' && rec.survival ? 'BEST WAVE ' + rec.survival.wave + '  ' + rec.survival.score
        : mi.key === 'timeattack' && rec.timeattack ? 'BEST TIME ' + fmtTime(rec.timeattack)
        : mi.key === 'corridor' && rec.corridor ? 'BEST CLIMB ' + rec.corridor.dist + ' M  ' + rec.corridor.score
        : mi.key === 'eagles' ? '1P: VS CPU' + (rec.cpu ? ', BEST ' + rec.cpu.rounds + ' ROUNDS' : '') + '  2-4P: VS'
        : mi.key === 'dm' ? '1P: VS ' + DM_BOTS + ' BOTS  2-4P: VS EACH OTHER' : '< > CHANGE MODE';
      Font.drawCenter(ctx, best, SW / 2, 213, COL.lgrey);
    } else if (cur && cur.daily && this.titleY === 0) {
      const d = dailyToday(), best = STORE.get(DAILY_KEY, {});
      Font.drawCenter(ctx, DAILY_MODS[d.mods[0]].name + ' + ' + DAILY_MODS[d.mods[1]].name, SW / 2, 203, COL.gold);
      Font.drawCenter(ctx, 'STAGE ' + d.stage + '  BEST ' + (best.date === d.date ? best.score : 0), SW / 2, 213, COL.lgrey);
    } else if (cur && cur.skill && this.titleY === 0 && Config.get('skill') === AUTO_SKILL) {
      AutoSkill.load();
      Font.drawCenter(ctx, 'ADAPTS TO HOW YOU PLAY', SW / 2, 203, '#3CBCFC');
      Font.drawCenter(ctx, 'NOW: ' + AutoSkill.nearest().name, SW / 2, 213, COL.lgrey);
    } else Font.drawCenter(ctx, cur && cur.skill && this.titleY === 0 ? '< > CHANGE SKILL' : 'ENTER START  M MUTE', SW / 2, 206, COL.lgrey);
    ctx.restore();
  },

  openOnline() {
    if (this.onlineJoin) Net.openPanel('join');
    else { Net.startHosting(); Net.openPanel('lobby'); }
  },

  // a guest waiting for the host to start
  renderNetWait(ctx) {
    ctx.fillStyle = COL.black;
    ctx.fillRect(0, 0, SW, SH);
    Font.drawCenter(ctx, 'ONLINE GAME', SW / 2, 60, COL.red);
    ctx.drawImage(Sprites.tank('p0', (this.t >> 3) & 1, 0, Config.playerPal(Net.slot)), SW / 2 - 8, 82);
    Font.drawCenter(ctx, 'YOU ARE ' + ROMAN[Net.slot] + '-PLAYER', SW / 2, 110, COL.white);
    Font.drawCenter(ctx, 'WAITING FOR THE HOST', SW / 2, 130, (this.t >> 4) & 1 ? COL.gold : COL.lgrey);
    Font.drawCenter(ctx, 'ESC LEAVE', SW / 2, 200, COL.lgrey);
  },

  // tighter spacing when the menu gets long, so it never reaches the version line
  titleStep() { return this.titleMenu().length > 6 ? 12 : 14; },
  titleMenuY() { return TITLE_MENU_Y - (this.titleMenu().length - 4) * this.titleStep() / 2; },

  // ---------------------------------------------------------------- save / load
  // One save slot: written by SAVE GAME in the pause menu and automatically at every stage start.
  saveGame() {
    if (!this.stage || this.stage.over || this.daily || (this.mode && this.mode !== 'classic' && this.mode !== 'bigmaps')) return false;
    const data = {
      app: APP_VERSION, time: Date.now(), numPlayers: this.players.length, stageNum: this.stageNum, lastScores: this.lastScores,
      mode: this.mode || 'classic',
      players: this.players.map(p => { const o = Object.assign({}, p); delete o.tank; return o; }),
      base: this.base,
      stage: this.stage.snapshot(),
    };
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); return true; } catch (e) { return false; }
  },

  loadGame() {
    const s = STORE.get(SAVE_KEY, null);
    if (!s || !s.stage) return;
    if (Net.role === 'host') Net.hangUp();
    Input.remote = {};
    const n = s.numPlayers || (s.twoP ? 2 : 1);
    this.twoP = n > 1;
    Input.numPlayers = n;
    this.players = s.players.map(p => Object.assign(newPlayer(p.i), p, { tank: null }));
    this.stageNum = s.stageNum;
    this.lastScores = s.lastScores || [0, 0];
    this.customPending = false;
    // the saved terrain only fits the field size it was saved with
    this.mode = s.mode || 'classic';
    this.applyLayout(s.stage.cols, s.stage.rows, s.stage.vcols, s.stage.vrows);
    this.base = Object.assign(newBase(), s.base || {});
    this.stage = new Stage(this.stageNum, LEVELS[(this.stageNum - 1) % LEVELS.length], this.players, { snapshot: s.stage, base: this.base });
    this.paused = true;
    this.pauseIdx = 0;
    this.pauseMsg = 'GAME LOADED';
    this.pauseMsgT = 120;
    this.openH = SCREEN_H / 2;
    this.setState('play');
  },

  // ---------------------------------------------------------------- new game / curtain
  // n = number of players (1-4); online: started from the online lobby
  newGame(n, custom, online) {
    AutoSkill.start();   // before the players: AUTO's starting tanks follow the remembered rating
    if (!online) { if (Net.role === 'host') Net.hangUp(); Input.remote = {}; }
    this.applyLayout();
    n = Math.max(1, Math.min(4, +n || 1));
    this.twoP = n > 1;
    Input.numPlayers = n;
    this.players = [];
    for (let i = 0; i < n; i++) this.players.push(newPlayer(i));
    this.base = newBase();
    // the stage picker starts where you last played
    this.stageNum = Math.max(1, Math.min(this.stageLimit(), STORE.get('tank1990_lastStage', 1) | 0 || 1));
    this.customPending = custom;
    // game mode (modes.js); versus needs at least two players
    this.mode = custom || this.daily ? 'classic' : Config.get('gameMode');
    // VS EAGLES alone: against the computer (cpuvs.js); other versus modes need at least two players
    if (this.mode === 'eagles' && n < 2) this.mode = 'cpu';
    else if (this.mode === 'dm' && n < 2) for (let i = 1; i <= DM_BOTS; i++) this.players.push(Object.assign(newPlayer(i), { bot: true }));   // bots.js
    else if (modeInfo(this.mode).vs && n < 2) this.mode = 'classic';
    this.vsWins = []; this.round = 1; this.taFrames = 0; this.taCleared = 0;
    this.toCurtain(!custom && (this.mode === 'classic' || this.mode === 'bigmaps'));
    if (this.mode === 'timeattack' || this.mode === 'corridor' || this.mode === 'cpu') this.stageNum = 1;
    else if (this.mode !== 'classic') this.stageNum = 1 + Math.floor(Math.random() * LEVELS.length);
  },

  toCurtain(selectable) {
    Sound.setEngine(0);
    this.curtain = { selectable, h: 0, phase: 'close' };
    this.setState('curtain');
  },

  updateCurtain() {
    const c = this.curtain;
    if (c.phase === 'close') {
      c.h = Math.min(SCREEN_H / 2, c.h + 8);
      if (c.h >= SCREEN_H / 2) { c.phase = 'show'; this.t = 0; }
      return;
    }
    const m = Input.menu();
    if (c.selectable) {
      const n = this.stageLimit();
      if (m.up || m.right) { this.stageNum = this.stageNum % n + 1; Sound.play('select'); }
      if (m.down || m.left) { this.stageNum = (this.stageNum + n - 2) % n + 1; Sound.play('select'); }
      if (m.ok) this.beginStage();
      if (m.back) this.toTitle();
    } else if (this.t >= 100 || (this.t > 20 && m.ok)) {
      this.beginStage();
    }
  },

  renderCurtain(ctx) {
    const c = this.curtain;
    if (c.phase === 'close' && this.stage) this.stage.render(ctx);
    else if (c.phase === 'close') { ctx.fillStyle = COL.black; ctx.fillRect(0, 0, SCREEN_W, SCREEN_H); }
    ctx.fillStyle = COL.bg;
    ctx.fillRect(0, 0, SCREEN_W, c.h);
    ctx.fillRect(0, SCREEN_H - c.h, SCREEN_W, c.h);
    if (c.phase === 'show') {
      const cx = SCREEN_W / 2, cy = SCREEN_H / 2;
      Font.draw(ctx, this.mode === 'cpu' ? 'ROUND' : 'STAGE', cx - 32, cy - 8, COL.black);
      Font.drawRight(ctx, this.stageNum, cx + 32, cy - 8, COL.black);
      // against the computer: what their HQ got for this round
      if (this.mode === 'cpu') {
        const news = cpuNews(this.stageNum);
        if (news.length) Font.drawCenter(ctx, 'ENEMY HQ UPGRADED', cx, cy + 14, '#A00000');
        news.forEach((t, i) => Font.drawCenter(ctx, t, cx, cy + 26 + i * 10, '#3C3C3C'));
        if (this.stageNum === 1) Font.drawCenter(ctx, 'DESTROY THE ENEMY HQ', cx, cy + 14, '#A00000');
      }
      const boss = bossForStage(this.stageNum);
      if (boss) Font.drawCenter(ctx, 'BOSS: ' + BOSSES[boss.idx].name, cx, cy + 10, '#A00000');
      const wx = !this.customPending && stageWeather(this.stageNum, !!boss);
      if (wx) Font.drawCenter(ctx, wx === 'night' ? 'NIGHT' : 'FOG', cx, cy + (boss ? 34 : c.selectable ? 24 : 10), wx === 'night' ? '#00006C' : '#ADADAD');
      if (Config.get('skill') !== 2) Font.drawCenter(ctx, Config.skill().name, cx, cy - 24, '#3C3C3C');
      if (c.selectable && (this.t >> 4) & 1) Font.drawCenter(ctx, '< SELECT >', cx, cy + (boss ? 24 : 12), '#3C3C3C');
    }
  },

  // stages you can pick: the 35 maps, or up to the furthest stage you have reached
  stageLimit() { return Math.max(LEVELS.length, Math.min(99, STORE.get('tank1990_bestStage', 1) | 0)); },

  beginStage() {
    let map, custom = false;
    if (this.customPending) { map = this.custom; custom = true; this.customPending = false; }
    else map = LEVELS[(this.stageNum - 1) % LEVELS.length];
    const boss = custom || this.mode !== 'classic' ? null : bossForStage(this.stageNum);
    if (boss) map = BOSS_ARENAS[boss.idx];
    const vs = modeInfo(this.mode).vs ? this.mode : null;
    // big scrolling maps: every stage in BIG MAPS, every 4th classic stage with BIG MAP STAGES on
    const big = !custom && !boss && (this.mode === 'bigmaps'
      || (this.mode === 'classic' && !this.daily && Config.get('bigStages') === 'SOME' && this.stageNum % 4 === 0));
    let blocks = null, objective = null;
    const corridor = !custom && this.mode === 'corridor';
    if (corridor) {
      // the usual width, at least three sections high (one more than the screen needs above and below)
      const [vc, vr] = this.desiredField(), rows = Math.max(3, Math.ceil((vr + 26) / CORRIDOR_SECTION)) * CORRIDOR_SECTION;
      setFieldSize(vc, rows, vc, vr);
      blocks = corridorBlocks(rows / CORRIDOR_SECTION);
    } else if (big) {
      const [vc, vr] = this.desiredField(), [SX, SY] = bigWorldSize(vc, vr);
      setFieldSize(SX * SECTOR, SY * SECTOR, vc, vr);
      blocks = bigWorldBlocks(this.stageNum, SX, SY);
      objective = Math.floor(this.stageNum / (this.mode === 'bigmaps' ? 1 : 4)) % 2 ? 'outposts' : 'factories';
    } else if (!custom) this.applyLayout();
    this.stage = new Stage(this.stageNum, map, this.players, {
      custom, boss, base: vs || corridor ? newBase() : this.base, corridor, cpu: this.mode === 'cpu' && !custom ? this.stageNum : 0, vs, survival: this.mode === 'survival', timeAttack: this.mode === 'timeattack',
      blocks, big: objective,
    });
    this.paused = false;
    this.openH = SCREEN_H / 2;
    this.setState('play');
    Sound.play('start');
    if (this.mode === 'classic' || this.mode === 'bigmaps') this.saveGame(); // autosave at every stage start
    if (!custom && Net.role !== 'client' && !this.daily && this.mode === 'classic') {
      STORE.set('tank1990_lastStage', this.stageNum);
      if (this.stageNum > STORE.get('tank1990_bestStage', 1)) STORE.set('tank1990_bestStage', this.stageNum);
    }
  },

  // ---------------------------------------------------------------- play
  updatePlay() {
    const m = Input.menu();
    if (this.pauseMsgT > 0) this.pauseMsgT--;
    if (this.openH > 0) this.openH = Math.max(0, this.openH - 8);
    if (!this.paused) {
      const guestPause = Object.values(Input.remote).some(r => r.menu && r.menu.start);
      if ((m.start || m.back || guestPause) && !this.stage.over) {
        this.paused = true;
        this.pauseIdx = 0;
        Sound.play('pause');
        Sound.setEngine(0);
      }
    } else {
      // pause menu: continue / save / quit (P or Esc resumes)
      const PM = pauseMenu();
      if (m.up) { this.pauseIdx = (this.pauseIdx + PM.length - 1) % PM.length; Sound.play('select'); }
      if (m.down) { this.pauseIdx = (this.pauseIdx + 1) % PM.length; Sound.play('select'); }
      if (Input.anyJust(['KeyP', 'Escape'])) this.paused = false;
      else if (m.ok) this.pauseAction(PM[this.pauseIdx]);
      return;
    }
    this.stage.update();
    if (this.mode === 'timeattack' && !this.stage.over && !this.stage.clearTimer) this.taFrames++;
    const r = this.stage.result;
    if (r === 'vsRound') { this.vsRoundEnd(); return; }
    if (r && this.mode === 'timeattack' && r === 'clear') { this.saveHi(); this.taNext(); return; }
    if (r === 'gameover') AutoSkill.event('gameOver');
    if (r === 'gameover' && (this.mode === 'survival' || this.mode === 'timeattack' || this.mode === 'corridor' || this.mode === 'cpu')) { this.saveHi(); this.toModeResult(false); return; }
    if (this.stage.result) {
      // beating a boss earns 25% off in the next shop
      this.shopDiscount = this.stage.result === 'clear' && this.stage.bossIdx !== undefined;
      this.saveHi();
      this.toScore(this.stage.result === 'gameover');
    }
  },

  pauseAction(action) {
    if (action === 'CONTINUE') this.paused = false;
    else if (action === 'SAVE GAME') {
      const ok = this.saveGame();
      this.pauseMsg = ok ? 'GAME SAVED' : this.daily ? 'NO SAVES IN DAILY' : this.mode !== 'classic' ? 'NO SAVES IN THIS MODE' : 'SAVE FAILED';
      this.pauseMsgT = 120;
      Sound.play(ok ? 'pickup' : 'steel');
    } else if (action === 'ONLINE PLAYERS') {
      Net.openPanel('ingame');
    } else if (action === 'QUIT') {
      if (Net.role === 'host') Net.hangUp();
      this.saveHi();
      this.lastScores = this.players.map(p => p.score);
      this.stage = null;
      this.toTitle();
    }
  },

  renderPlay(ctx) {
    this.stage.render(ctx);
    // time attack: the clock, in the border above the field
    if (this.mode === 'timeattack') Font.drawCenter(ctx, fmtTime(this.taFrames) + '  STAGE ' + (this.taCleared + 1) + '/' + TA_STAGES, SCREEN_W / 2, 0, COL.black);
    if (this.paused) {
      // centred on the window onto the field (big maps and the corridor are bigger than the screen)
      const w = 112, h = 70, x = FX + ((VIEW_W - w) >> 1), y = FY + ((VIEW_H - h) >> 1);
      ctx.fillStyle = COL.black;
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = COL.lgrey;
      ctx.fillRect(x, y, w, 1); ctx.fillRect(x, y + h - 1, w, 1); ctx.fillRect(x, y, 1, h); ctx.fillRect(x + w - 1, y, 1, h);
      Font.drawCenter(ctx, 'PAUSE', x + w / 2, y + 6, COL.orange);
      pauseMenu().forEach((label, i) => {
        Font.draw(ctx, label, x + 24, y + 22 + i * 12, COL.white);
        if (i === this.pauseIdx) Font.draw(ctx, '>', x + 12, y + 22 + i * 12, COL.gold);
      });
      if (this.pauseMsgT > 0) Font.drawCenter(ctx, this.pauseMsg, x + w / 2, y + h + 4, COL.gold);
    }
    if (this.openH > 0) {
      ctx.fillStyle = COL.bg;
      ctx.fillRect(0, 0, SCREEN_W, this.openH);
      ctx.fillRect(0, SCREEN_H - this.openH, SCREEN_W, this.openH);
    }
  },

  // ---------------------------------------------------------------- score tally
  toScore(gameOver) {
    Sound.setEngine(0);
    // one row per classic tank type, plus one for all the new types when any were destroyed
    const rows = [[0], [1], [2], [3]];
    if (this.players.some(p => ALL_NEW.some(k => p.kills[k]))) rows.push(ALL_NEW);
    this.sc = { gameOver, row: 0, n: 0, wait: 30, phase: 'rows', bonus: -1, rows };
    this.setState('score');
  },

  updateScore() {
    const sc = this.sc;
    if (sc.wait > 0) { sc.wait--; return; }
    if (sc.phase === 'rows') {
      const maxK = Math.max(...this.players.map(p => this.rowKills(p, sc.row)));
      if (sc.n < maxK) {
        sc.n++;
        Sound.play('tick');
        sc.wait = 9;
      } else {
        sc.row++;
        sc.n = 0;
        sc.wait = 20;
        if (sc.row >= sc.rows.length) { sc.phase = 'total'; sc.wait = 30; }
      }
    } else if (sc.phase === 'total') {
      if (this.players.length > 1 && !sc.gameOver) {
        // the player with the most kills (no tie) earns 1000
        const k = this.players.map(p => p.kills.reduce((a, b) => a + b, 0));
        const best = Math.max(...k);
        if (k.filter(v => v === best).length === 1) {
          sc.bonus = k.indexOf(best);
          const p = this.players[sc.bonus];
          p.score += 1000;
          checkExtraLife(p);
          Sound.play('bonus');
          this.saveHi();
        }
      }
      sc.phase = 'done';
      sc.wait = 150;
    } else {
      this.lastScores = this.players.map(p => p.score);
      if (this.daily) this.dailyNext(sc.gameOver);
      else if (sc.gameOver) this.toBigOver();
      else {
        this.stageNum++;
        if (Config.on('shop') && this.players.some(p => !p.out)) this.toShop();
        else this.toCurtain(false);
      }
    }
  },

  // kills and points of one tally row (the "new types" row adds several types together)
  rowKills(p, row) { return this.sc.rows[row].reduce((a, k) => a + (p.kills[k] || 0), 0); },
  rowPts(p, row, shown) {
    const types = this.sc.rows[row], all = this.rowKills(p, row);
    const pts = types.reduce((a, k) => a + (p.kills[k] || 0) * ENEMY[k].pts, 0);
    return all ? Math.round(pts * shown / all) : 0;
  },
  rowIcon(row) {
    const types = this.sc.rows[row], k = types[(this.t >> 5) % types.length];
    return Sprites.tank('e' + k, 0, 0, ENEMY[k].pal || 'silver');
  },
  scShown(p, row) {
    const sc = this.sc;
    return row < sc.row || sc.phase !== 'rows' ? this.rowKills(p, row) : (row === sc.row ? Math.min(sc.n, this.rowKills(p, row)) : -1);
  },

  // 3-4 players: one column per player
  renderScoreMulti(ctx) {
    const sc = this.sc, P = this.players, n = P.length;
    const colX = i => 72 + i * ((SW - 80) / n);
    const shown = (p, row) => this.scShown(p, row);
    P.forEach((p, i) => {
      const x = colX(i);
      ctx.drawImage(Sprites.playerIcon(Config.playerPal(i)), x + 10, 54);
      Font.drawRight(ctx, ROMAN[i], x + 8, 54, COL.red);
      Font.drawRight(ctx, p.score, x + 40, 68, COL.gold);
      if (Config.xpOn()) Font.drawRight(ctx, 'LV' + p.rank, x + 40, 78, COL.white);
    });
    const nr = sc.rows.length, gap = nr > 4 ? 16 : 20;
    for (let row = 0; row < nr; row++) {
      const y = 92 + row * gap;
      ctx.drawImage(this.rowIcon(row), 12, y - 4);
      Font.draw(ctx, sc.rows[row].length > 1 ? 'NEW' : String(ENEMY[row].pts), 32, y, COL.lgrey);
      P.forEach((p, i) => { const k = shown(p, row); if (k >= 0) Font.drawRight(ctx, k, colX(i) + 24, y, COL.white); });
    }
    ctx.fillStyle = COL.white;
    ctx.fillRect(64, 172, SW - 72, 2);
    if (sc.phase !== 'rows') {
      Font.draw(ctx, 'TOTAL', 12, 180, COL.white);
      P.forEach((p, i) => Font.drawRight(ctx, p.kills.reduce((a, b) => a + b, 0), colX(i) + 24, 180, COL.white));
      if (sc.bonus >= 0) Font.drawCenter(ctx, 'BONUS! ' + ROMAN[sc.bonus] + '-PLAYER 1000 PTS', SW / 2, 202, COL.red);
    }
  },

  renderScore(ctx) {
    const sc = this.sc;
    ctx.fillStyle = COL.black;
    ctx.fillRect(0, 0, SW, SH);
    Font.draw(ctx, 'HI-SCORE', 64, 16, COL.red);
    Font.drawRight(ctx, this.hi, 200, 16, COL.gold);
    Font.draw(ctx, 'STAGE', 96, 36, COL.white);
    Font.drawRight(ctx, this.stageNum, 160, 36, COL.white);
    const P = this.players;
    if (P.length > 2) { this.renderScoreMulti(ctx); return; }
    Font.draw(ctx, 'I-PLAYER', 16, 56, COL.red);
    Font.drawRight(ctx, P[0].score, 96, 72, COL.gold);
    if (this.twoP) {
      Font.draw(ctx, 'II-PLAYER', 168, 56, COL.red);
      Font.drawRight(ctx, P[1].score, 240, 72, COL.gold);
    }
    // XP level and what this stage earned
    if (Config.xpOn()) P.forEach((p, i) => {
      const x = i ? 168 : 16;
      Font.draw(ctx, (p.rank >= 10 ? 'L' : 'LV') + p.rank, x, 82, COL.white);
      if (p.stageXp) Font.drawRight(ctx, '+' + p.stageXp + 'XP', x + 80, 82, COL.lgrey);
    });
    const shown = (p, row) => this.scShown(p, row);
    const nr = sc.rows.length, gap = nr > 4 ? 18 : 22;
    for (let row = 0; row < nr; row++) {
      const y = 96 + row * gap;
      ctx.drawImage(this.rowIcon(row), 120, y - 4);
      const k1 = shown(P[0], row);
      if (k1 >= 0) {
        Font.drawRight(ctx, this.rowPts(P[0], row, k1), 56, y, COL.white);
        Font.draw(ctx, 'PTS', 64, y, COL.white);
        Font.drawRight(ctx, k1, 102, y, COL.white);
      }
      Font.draw(ctx, '<', 107, y, COL.white);
      if (this.twoP) {
        Font.draw(ctx, '>', 138, y, COL.white);
        const k2 = shown(P[1], row);
        if (k2 >= 0) {
          Font.drawRight(ctx, k2, 162, y, COL.white);
          Font.drawRight(ctx, this.rowPts(P[1], row, k2), 208, y, COL.white);
          Font.draw(ctx, 'PTS', 216, y, COL.white);
        }
      }
    }
    ctx.fillStyle = COL.white;
    ctx.fillRect(96, 182, 64, 2);
    if (sc.phase !== 'rows') {
      Font.draw(ctx, 'TOTAL', 40, 190, COL.white);
      Font.drawRight(ctx, P[0].kills.reduce((a, b) => a + b, 0), 102, 190, COL.white);
      if (this.twoP) Font.drawRight(ctx, P[1].kills.reduce((a, b) => a + b, 0), 162, 190, COL.white);
      if (sc.bonus >= 0) {
        const x = sc.bonus === 0 ? 24 : 160;
        Font.draw(ctx, 'BONUS!', x, 203, COL.red);
        Font.draw(ctx, '1000 PTS', x, 213, COL.white);
      }
    }
  },

  // ---------------------------------------------------------------- game modes
  startGame(n) {
    const mi = modeInfo(Config.get('gameMode'));
    if (mi.vs && !mi.cpu && n < 2) { this.toast('VERSUS NEEDS 2-4 PLAYERS'); Sound.play('steel'); return; }
    this.newGame(n, false);
  },

  // time attack: on to the next stage, or done
  taNext() {
    this.taCleared++;
    if (this.taCleared >= TA_STAGES) { this.toModeResult(true); return; }
    this.stageNum++;
    this.toCurtain(false);
  },

  toModeResult(done) {
    const rec = STORE.get(MODE_KEY, {}), score = this.players.reduce((a, p) => a + p.score, 0);
    const res = { mode: this.mode, done, score, newBest: false };
    if (this.mode === 'survival') {
      res.wave = this.stage.wave;
      const b = rec.survival;
      if (!b || res.wave > b.wave || (res.wave === b.wave && score > b.score)) { rec.survival = { wave: res.wave, score }; res.newBest = true; }
      res.best = rec.survival;
    } else if (this.mode === 'cpu') {
      res.rounds = this.stageNum - 1;
      const b = rec.cpu;
      if (!b || res.rounds > b.rounds || (res.rounds === b.rounds && score > b.score)) { rec.cpu = { rounds: res.rounds, score }; res.newBest = true; }
      res.best = rec.cpu;
    } else if (this.mode === 'corridor') {
      res.dist = this.stage.corridorClimb();
      const b = rec.corridor;
      if (!b || res.dist > b.dist || (res.dist === b.dist && score > b.score)) { rec.corridor = { dist: res.dist, score }; res.newBest = true; }
      res.best = rec.corridor;
    } else {
      res.frames = this.taFrames;
      res.cleared = this.taCleared;
      if (done && (!rec.timeattack || this.taFrames < rec.timeattack)) { rec.timeattack = this.taFrames; res.newBest = true; }
      res.best = rec.timeattack || 0;
    }
    STORE.set(MODE_KEY, rec);
    this.modeRes = res;
    Sound.setEngine(0);
    Sound.play(res.newBest ? 'bonus' : 'gameover');
    this.setState('modeResult');
  },

  // versus: a round is over
  vsRoundEnd() {
    const st = this.stage, w = st.vsWinner;
    if (w >= 0) this.vsWins[w] = (this.vsWins[w] || 0) + 1;
    const final = this.mode !== 'eagles' || this.vsWins.some(n => n >= VS_ROUNDS);
    this.vsRes = {
      mode: this.mode, winner: w, final, round: this.round,
      rows: this.players.map(p => ({ i: p.i, bot: !!p.bot, kills: p.vsKills || 0, caps: p.caps || 0, wins: this.vsWins[p.i] || 0 })),
    };
    Sound.setEngine(0);
    this.setState('vsResult');
  },

  updateVsResult() {
    if (this.t < 90 || !(Input.menu().ok || this.t > 600)) return;
    if (this.vsRes.final) { this.stage = null; this.toTitle(); this.titleY = 0; return; }
    this.round++;
    this.stageNum = this.stageNum % LEVELS.length + 1;
    for (const p of this.players) { p.out = false; p.vsKills = 0; }
    this.toCurtain(false);
  },

  renderVsResult(ctx) {
    const r = this.vsRes;
    ctx.fillStyle = COL.black;
    ctx.fillRect(0, 0, SW, SH);
    Font.drawCenter(ctx, modeInfo(r.mode).name + (r.mode === 'eagles' ? '  ROUND ' + r.round : ''), SW / 2, 30, COL.red);
    const msg = r.winner >= 0 ? playerName(r.rows.find(row => row.i === r.winner)) + ' ' + (r.final ? 'WINS THE MATCH!' : 'WINS THE ROUND') : 'DRAW!';
    if ((this.t >> 4) & 1 || this.t > 90) Font.drawCenter(ctx, msg, SW / 2, 60, COL.gold);
    const head = r.mode === 'eagles' ? 'ROUNDS' : r.mode === 'dm' ? 'KILLS' : 'FLAGS';
    Font.draw(ctx, head, 136, 92, COL.lgrey);
    r.rows.forEach((row, k) => {
      const y = 110 + k * 18;
      ctx.drawImage(Sprites.playerIcon(Config.playerPal(row.i)), 64, y);
      Font.draw(ctx, playerName(row), 76, y, COL.white);
      Font.drawRight(ctx, r.mode === 'eagles' ? row.wins : r.mode === 'dm' ? row.kills : row.caps, 184, y, COL.white);
    });
    if (this.t > 90) Font.drawCenter(ctx, r.final ? 'PRESS ENTER' : 'PRESS ENTER: NEXT ROUND', SW / 2, 200, COL.lgrey);
  },

  updateModeResult() {
    if (this.t > 60 && Input.menu().ok) { this.stage = null; this.toTitle(); this.titleY = 0; }
  },

  renderModeResult(ctx) {
    const r = this.modeRes;
    ctx.fillStyle = COL.black;
    ctx.fillRect(0, 0, SW, SH);
    Font.drawCenter(ctx, modeInfo(r.mode).name, SW / 2, 40, COL.red);
    if (r.mode === 'survival') {
      Font.drawCenter(ctx, 'YOU HELD OUT TO WAVE ' + r.wave, SW / 2, 80, COL.white);
      Font.drawCenter(ctx, 'SCORE ' + r.score, SW / 2, 100, COL.white);
      Font.drawCenter(ctx, 'BEST: WAVE ' + r.best.wave + '  ' + r.best.score, SW / 2, 124, COL.lgrey);
    } else if (r.mode === 'cpu') {
      Font.drawCenter(ctx, r.rounds === 1 ? 'YOU WON 1 ROUND' : 'YOU WON ' + r.rounds + ' ROUNDS', SW / 2, 80, COL.white);
      Font.drawCenter(ctx, 'SCORE ' + r.score, SW / 2, 100, COL.white);
      Font.drawCenter(ctx, 'BEST: ' + r.best.rounds + ' ROUNDS  ' + r.best.score, SW / 2, 124, COL.lgrey);
    } else if (r.mode === 'corridor') {
      Font.drawCenter(ctx, 'YOU CLIMBED ' + r.dist + ' M', SW / 2, 80, COL.white);
      Font.drawCenter(ctx, 'SCORE ' + r.score, SW / 2, 100, COL.white);
      Font.drawCenter(ctx, 'BEST: ' + r.best.dist + ' M  ' + r.best.score, SW / 2, 124, COL.lgrey);
    } else {
      Font.drawCenter(ctx, r.done ? 'ALL ' + TA_STAGES + ' STAGES IN ' + fmtTime(r.frames) : 'FAILED ON STAGE ' + (r.cleared + 1), SW / 2, 80, COL.white);
      Font.drawCenter(ctx, 'SCORE ' + r.score, SW / 2, 100, COL.white);
      Font.drawCenter(ctx, 'BEST TIME ' + (r.best ? fmtTime(r.best) : '-'), SW / 2, 124, COL.lgrey);
    }
    if (r.newBest && (this.t >> 4) & 1) Font.drawCenter(ctx, 'NEW BEST!', SW / 2, 150, COL.gold);
    if (this.t > 60) Font.drawCenter(ctx, 'PRESS ENTER', SW / 2, 196, COL.lgrey);
  },

  // ---------------------------------------------------------------- daily challenge
  startDaily() {
    if (Net.role === 'host') Net.hangUp();
    const d = dailyToday();
    // today's twists go on top of your settings for this run only (never saved)
    this.dailyBackup = Object.assign({}, Config.values);
    Config.values.shop = 'OFF';
    Config.values.gameMode = 'classic';
    for (const i of d.mods) DAILY_MODS[i].set(Config.values);
    Config.apply();
    this.daily = { date: d.date, mods: d.mods, start: d.stage, cleared: 0 };
    this.newGame(1, false);
    this.stageNum = d.stage;
    this.curtain.selectable = false;
  },

  dailyNext(gameOver) {
    const dl = this.daily;
    if (!gameOver) dl.cleared++;
    if (gameOver || dl.cleared >= DAILY_STAGES) { this.finishDaily(); return; }
    this.stageNum++;
    this.toCurtain(false);
  },

  finishDaily() {
    const dl = this.daily, score = this.players[0].score, best = STORE.get(DAILY_KEY, {});
    dl.score = score;
    dl.newBest = best.date !== dl.date || score > best.score;
    dl.best = dl.newBest ? score : best.score;
    if (dl.newBest) STORE.set(DAILY_KEY, { date: dl.date, score });
    this.saveHi();
    this.dailyDone = dl;
    this.endDaily();
    Sound.play(dl.newBest ? 'bonus' : 'gameover');
    this.setState('dailyResult');
  },

  // put the player's own settings back
  endDaily() {
    if (!this.daily) return;
    Config.values = this.dailyBackup;
    this.daily = null;
    Config.apply();
  },

  updateDailyResult() {
    if (this.t > 60 && Input.menu().ok) { this.stage = null; this.toTitle(); this.titleY = 0; }
  },

  renderDailyResult(ctx) {
    const d = this.dailyDone;
    ctx.fillStyle = COL.black;
    ctx.fillRect(0, 0, SW, SH);
    Font.drawCenter(ctx, 'DAILY CHALLENGE', SW / 2, 30, COL.red);
    Font.drawCenter(ctx, d.date, SW / 2, 46, COL.lgrey);
    Font.drawCenter(ctx, DAILY_MODS[d.mods[0]].name, SW / 2, 70, COL.gold);
    Font.drawCenter(ctx, '+ ' + DAILY_MODS[d.mods[1]].name, SW / 2, 82, COL.gold);
    Font.drawCenter(ctx, 'STAGES CLEARED ' + d.cleared + '/' + DAILY_STAGES, SW / 2, 110, COL.white);
    Font.drawCenter(ctx, 'SCORE ' + d.score, SW / 2, 130, COL.white);
    Font.drawCenter(ctx, "TODAY'S BEST " + d.best, SW / 2, 146, COL.lgrey);
    if (d.newBest && (this.t >> 4) & 1) Font.drawCenter(ctx, 'NEW BEST!', SW / 2, 166, COL.gold);
    if (this.t > 60) Font.drawCenter(ctx, 'PRESS ENTER', SW / 2, 196, COL.lgrey);
  },

  // ---------------------------------------------------------------- big game over
  toBigOver() {
    this.saveHi();
    Sound.play('gameover');
    this.setState('bigover');
  },

  updateBigOver() {
    if (this.t > 260 || (this.t > 60 && Input.menu().ok)) {
      this.stage = null;
      this.toTitle();
    }
  },

  renderBigOver(ctx) {
    ctx.fillStyle = COL.black;
    ctx.fillRect(0, 0, SW, SH);
    const pat = Sprites.bricks(ctx);
    const rise = Math.max(0, 60 - this.t * 2);
    ctx.save();
    ctx.translate(0, rise);
    Font.big(ctx, 'GAME', (SW - Font.bigWidth('GAME', 4)) >> 1, 56, 4, pat);
    Font.big(ctx, 'OVER', (SW - Font.bigWidth('OVER', 4)) >> 1, 104, 4, pat);
    ctx.restore();
  },

  // ---------------------------------------------------------------- construction
  toConstruct() {
    this.applyLayout(13, 13); // the editor works on the classic 13x13 field
    this.ed = {
      tx: 0, ty: 0, pat: -1, last: null, rep: 0,
      stage: new Stage(1, this.custom, [], { custom: true }),
    };
    this.setState('construct');
  },

  editTile(tx, ty, patIdx) {
    if (tx === 6 && ty === 12) return; // the eagle itself
    const p = CONSTRUCT_PATS[patIdx];
    const rows = this.custom.map(r => r.split(''));
    for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) {
      const bx = tx * 2 + x, by = ty * 2 + y;
      rows[by][bx] = p[y][x];
      this.ed.stage.setBlock(bx, by, BLOCK_TYPE[p[y][x]]);
    }
    this.custom = rows.map(r => r.join(''));
    this.ed.stage.pads = padsFromBlocks(this.custom);
    STORE.set('tank1990_custom', this.custom);
    Sound.play('build');
  },

  updateConstruct() {
    const ed = this.ed, m = Input.menu();
    const moveCursor = d => {
      ed.tx = Math.max(0, Math.min(12, ed.tx + DXY[d][0]));
      ed.ty = Math.max(0, Math.min(12, ed.ty + DXY[d][1]));
    };
    const tapped = m.up ? 0 : m.right ? 1 : m.down ? 2 : m.left ? 3 : -1;
    if (tapped >= 0) {
      moveCursor(tapped);
      ed.rep = 14; // auto-repeat after a short delay
    } else {
      const held = Input.heldDir();
      if (held >= 0 && --ed.rep <= 0) { moveCursor(held); ed.rep = 5; }
    }

    const here = ed.tx + ',' + ed.ty;
    if (m.fire && !m.start) {
      if (ed.pat < 0) ed.pat = 0;
      else if (ed.last === here) ed.pat = (ed.pat + 1) % CONSTRUCT_PATS.length;
      ed.last = here;
      this.editTile(ed.tx, ed.ty, ed.pat);
    } else if (m.alt) {
      ed.pat = ed.pat < 0 ? CONSTRUCT_PATS.length - 1 : (ed.pat + CONSTRUCT_PATS.length - 1) % CONSTRUCT_PATS.length;
      ed.last = here;
      this.editTile(ed.tx, ed.ty, ed.pat);
    }
    if (m.start) this.newGame(1, true);
    else if (m.back) this.toTitle();
    else if (Input.just.has('Delete')) { this.custom = defaultCustomMap(); STORE.set('tank1990_custom', this.custom); this.toConstruct(); }
  },

  renderConstruct(ctx) {
    const st = this.ed.stage;
    ctx.fillStyle = COL.bg;
    ctx.fillRect(0, 0, SW, SH);
    ctx.fillStyle = COL.black;
    ctx.fillRect(FX, FY, FW, FH);
    if (st.dirty) st.buildLayers();
    ctx.save();
    ctx.translate(FX, FY);
    ctx.drawImage(st.bgLayer, 0, 0);
    for (const i of st.waterCells) {
      const cx = i % GW, cy = (i / GW) | 0;
      ctx.drawImage(Sprites.tex.water0, (cx & 1) * 4, (cy & 1) * 4, 4, 4, cx * 4, cy * 4, 4, 4);
    }
    st.frame = this.t;
    st.renderBelts(ctx);
    st.renderPads(ctx);
    ctx.drawImage(Sprites.eagle, BASE_X, BASE_Y);
    ctx.drawImage(st.forestLayer, 0, 0);
    if (((this.t >> 3) & 1) === 0) ctx.drawImage(Sprites.tank('p0', 0, 0, Config.playerPal(0)), this.ed.tx * 16, this.ed.ty * 16);
    ctx.restore();
    // current pattern preview
    Font.draw(ctx, 'PAT', 228, 16, COL.black);
    ctx.fillStyle = COL.black;
    ctx.fillRect(231, 26, 18, 18);
    if (this.ed.pat >= 0) {
      const p = CONSTRUCT_PATS[this.ed.pat];
      const tex = { '#': 'brick', '@': 'steel', '~': 'water0', '%': 'forest', '_': 'ice' };
      for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) {
        const c = p[y][x], k = tex[c];
        if (k) ctx.drawImage(Sprites.tex[k], 232 + x * 8, 27 + y * 8);
        else if (c === 'm') ctx.drawImage(Sprites.mudTex, 232 + x * 8, 27 + y * 8);
      }
      const arrow = { '^': '^', '>': '>', v: 'V', '<': '<' }[p[0][0]];
      if (arrow) { ctx.fillStyle = '#383838'; ctx.fillRect(232, 27, 16, 16); Font.draw(ctx, arrow, 236, 31, '#9C9C9C'); }
      if (p[0][0] === 'T') { ctx.strokeStyle = PAD_COLORS[0]; ctx.strokeRect(234.5, 29.5, 11, 11); ctx.fillStyle = PAD_COLORS[0]; ctx.fillRect(238, 33, 4, 4); }
    }
    Font.draw(ctx, 'A', 228, 60, COL.black); Font.draw(ctx, '+', 236, 60, COL.black);
    Font.draw(ctx, 'B', 228, 72, COL.black); Font.draw(ctx, '-', 236, 72, COL.black);
    Font.draw(ctx, 'GO', 228, 180, COL.black);
    Font.draw(ctx, 'ENT', 228, 190, COL.black);
  },

  // ---------------------------------------------------------------- shop
  toShop() {
    Sound.setEngine(0);
    // fallen players get a turn too, to buy themselves back in
    this.shop = { order: this.players.filter(p => !p.out || reviveCost()), turn: 0, idx: 0, scroll: 0, rep: 0, msg: '', msgT: 0 };
    this.setState('shop');
  },

  shopMove(dir) {
    const sh = this.shop, n = SHOP_ITEMS.length;
    sh.idx = (sh.idx + dir + n) % n;
    if (sh.idx < sh.scroll) sh.scroll = sh.idx;
    if (sh.idx >= sh.scroll + SHOP_ROWS) sh.scroll = sh.idx - SHOP_ROWS + 1;
  },

  shopBuy() {
    const sh = this.shop, p = sh.order[sh.turn], item = SHOP_ITEMS[sh.idx];
    if (item.id === 'done') { this.shopNext(); return; }
    const price = shopPrice(item), st = shopStatus(item, p);
    if (st.max) {
      sh.msg = item.id === 'revive' ? (reviveCost() ? 'NOBODY TO REVIVE' : 'REVIVE IS OFF') : p.out ? 'REVIVE FIRST' : 'YOU ALREADY HAVE IT';
      sh.msgT = 90; Sound.play('steel'); return;
    }
    if (wallet(p) < price) { sh.msg = 'NOT ENOUGH POINTS'; sh.msgT = 90; Sound.play('steel'); return; }
    spend(p, price);
    shopApply(item, p);
    sh.msg = 'BOUGHT ' + item.name;
    sh.msgT = 60;
    Sound.play(item.id === 'life' || item.id === 'revive' ? 'life' : 'pickup');
  },

  // next player's turn, or on to the stage
  shopNext() {
    const sh = this.shop;
    sh.turn++;
    sh.idx = 0; sh.scroll = 0; sh.msgT = 0;
    if (sh.turn >= sh.order.length) {
      this.shopDiscount = false;
      this.lastScores = this.players.map(p => p.score);
      this.toCurtain(false);
    } else Sound.play('select');
  },

  updateShop() {
    const sh = this.shop, cur = sh.order[sh.turn];
    // an online guest picks their own items; the host can skip their turn with Esc
    const guest = Input.remote[cur.i];
    if (guest && Input.anyJust(['Escape'])) { this.shopNext(); return; }
    const m = guest ? Object.assign({}, guest.menu || {}) : Input.menu();
    if (sh.msgT > 0) sh.msgT--;
    let d = 0;
    if (m.up) { d = -1; sh.rep = 16; } else if (m.down) { d = 1; sh.rep = 16; }
    else {
      const held = Input.heldDir();
      if ((held === 0 || held === 2) && --sh.rep <= 0) { d = held === 0 ? -1 : 1; sh.rep = 4; }
    }
    if (d) { this.shopMove(d); Sound.play('select'); }
    if (m.ok) this.shopBuy();
    else if (m.back) this.shopNext();
  },

  renderShop(ctx) {
    const sh = this.shop, p = sh.order[sh.turn];
    ctx.fillStyle = COL.black;
    ctx.fillRect(0, 0, SW, SH);
    Font.drawCenter(ctx, this.shopDiscount ? 'SHOP  BOSS BONUS -25%' : 'SHOP', SW / 2, 6, COL.red);
    ctx.drawImage(Sprites.rankTank('p' + p.level, (this.t >> 3) & 1, 1, Config.playerPal(p.i), Config.xpOn() ? p.rank : 1, true), 6, 15);
    Font.draw(ctx, ROMAN[p.i] + '-PLAYER', 26, 20, COL.red);
    Font.drawRight(ctx, wallet(p), 214, 20, COL.gold);
    Font.draw(ctx, 'PTS', 220, 20, COL.white);
    for (let r = 0; r < SHOP_ROWS; r++) {
      const i = sh.scroll + r, item = SHOP_ITEMS[i];
      if (!item) break;
      const y = SHOP_TOP + r * SHOP_ROW_H;
      if (i === sh.idx) { ctx.fillStyle = '#20206C'; ctx.fillRect(4, y - 4, SW - 8, SHOP_ROW_H); }
      if (item.id === 'done') {
        Font.draw(ctx, item.name + ' ' + this.stageNum, 34, y, COL.white);
        continue;
      }
      ctx.drawImage(item.base ? Sprites.baseIcons[item.bicon] : Sprites.powerups[item.icon], 12, y - 4);
      const price = shopPrice(item), st = shopStatus(item, p);
      Font.draw(ctx, item.name, 34, y, st.max ? COL.lgrey : COL.white);
      if (!st.max) Font.drawRight(ctx, price, 190, y, wallet(p) >= price ? COL.gold : '#7C3C3C');
      Font.drawRight(ctx, st.text, 250, y, COL.lgrey);
    }
    ctx.fillStyle = COL.lgrey;
    if (sh.scroll > 0) for (let k = 0; k < 4; k++) ctx.fillRect(SW / 2 - k, 30 + k, 1 + 2 * k, 1);
    if (sh.scroll + SHOP_ROWS < SHOP_ITEMS.length) for (let k = 0; k < 4; k++) ctx.fillRect(SW / 2 - 3 + k, SHOP_TOP + SHOP_ROWS * SHOP_ROW_H - 3 + k, 7 - 2 * k, 1);
    const item = SHOP_ITEMS[sh.idx];
    if (sh.msgT > 0) Font.drawCenter(ctx, sh.msg, SW / 2, 192, sh.msg.startsWith('BOUGHT') ? COL.gold : COL.red);
    else if (item.base) {
      const lv = Game.base[item.base] || 0;
      Font.drawCenter(ctx, Config.on('baseShop') ? (lv >= item.prices.length ? 'FULLY UPGRADED' : 'BASE: ' + item.descs[lv]) : 'BASE UPGRADES ARE OFF', SW / 2, 192, COL.gold);
    } else if (item.up) {
      const lv = Game.base[item.up] || 0;
      Font.drawCenter(ctx, lv >= item.prices.length ? 'FULLY UPGRADED' : 'L' + (lv + 1) + ': ' + item.descs[lv], SW / 2, 192, COL.gold);
    } else if (item.desc) {
      const desc = item.id === 'mines' ? '+' + Config.get('mineCount') + ' ' + item.desc : item.desc;
      Font.drawCenter(ctx, desc, SW / 2, 192, COL.white);
    }
    Font.drawCenter(ctx, 'A BUY   ESC DONE', SW / 2, 208, COL.lgrey);
  },

  // ---------------------------------------------------------------- key setup
  // rows: player picker, 6 keyboard actions (2 keys each), 4 gamepad actions (2 buttons each), buttons
  keyRows() {
    const rows = [{ type: 'player' }];
    for (const a of ACTIONS) rows.push({ type: 'key', a });
    for (const a of PAD_ACTIONS) rows.push({ type: 'pad', a });
    rows.push({ type: 'btn', act: 'resetP', label: 'RESET THIS PLAYER' });
    rows.push({ type: 'btn', act: 'resetAll', label: 'RESET ALL KEYS AND PADS' });
    rows.push({ type: 'btn', act: 'back', label: 'BACK' });
    return rows;
  },

  toKeys() {
    this.ks = { player: 0, idx: 1, col: 0, capture: null, msg: '', msgT: 0 };
    this.setState('keys');
  },

  keysActivate() {
    const ks = this.ks, row = this.keyRows()[ks.idx];
    if (row.type === 'player') { ks.player = (ks.player + 1) % 4; Sound.play('select'); return; }
    if (row.type === 'btn') {
      if (row.act === 'resetP') { Keymap.resetPlayer(ks.player); ks.msg = 'PLAYER ' + ROMAN[ks.player] + ' KEYS RESET'; }
      else if (row.act === 'resetAll') { Keymap.resetAll(); ks.msg = 'ALL KEYS AND PADS RESET'; }
      else { this.setState('settings'); return; }
      ks.msgT = 90; Sound.play('pickup');
      return;
    }
    // wait for the next key / pad button
    ks.capture = { row: ks.idx, col: ks.col, kind: row.type };
    Input.capture = ev => {
      ks.capture = null;
      if (ev.kind === 'key' && ev.code === 'Escape') { Sound.play('select'); return; }
      if (row.type === 'key' && ev.kind === 'key') Keymap.setKey(ks.player, row.a, ks.col, ev.code);
      else if (row.type === 'pad' && ev.kind === 'pad') Keymap.setPad(row.a, ks.col, ev.button);
      else { ks.msg = row.type === 'pad' ? 'PRESS A GAMEPAD BUTTON' : 'PRESS A KEYBOARD KEY'; ks.msgT = 90; Sound.play('steel'); return; }
      Sound.play('pickup');
    };
  },

  updateKeys() {
    const ks = this.ks, rows = this.keyRows();
    if (ks.msgT > 0) ks.msgT--;
    if (ks.capture) return; // keys go to the capture handler
    const m = Input.menu(), row = rows[ks.idx];
    if (m.up) { ks.idx = (ks.idx + rows.length - 1) % rows.length; Sound.play('select'); }
    if (m.down) { ks.idx = (ks.idx + 1) % rows.length; Sound.play('select'); }
    const cur = rows[ks.idx];
    if (m.left || m.right) {
      if (cur.type === 'player') ks.player = (ks.player + (m.right ? 1 : 3)) % 4;
      else ks.col = ks.col ? 0 : 1;
      Sound.play('select');
    }
    if (Input.anyJust(['Delete', 'Backspace']) && (row.type === 'key' || row.type === 'pad')) {
      if (row.type === 'key') Keymap.clearKey(ks.player, row.a, ks.col); else Keymap.clearPad(row.a, ks.col);
      Sound.play('build');
      return;
    }
    if (m.ok) this.keysActivate();
    else if (Input.anyJust(['Escape']) || Input.pads.some(p => p.justBack)) this.setState('settings');
  },

  renderKeys(ctx) {
    const ks = this.ks, rows = this.keyRows();
    const LABEL = { up: 'UP', down: 'DOWN', left: 'LEFT', right: 'RIGHT', fire: 'FIRE', alt: 'B / MINES', start: 'PAUSE', back: 'BACK' };
    ctx.fillStyle = COL.black;
    ctx.fillRect(0, 0, SW, SH);
    Font.drawCenter(ctx, 'KEYS AND PADS', SW / 2, 6, COL.red);
    let y = 22;
    rows.forEach((row, i) => {
      if (row.type === 'pad' && rows[i - 1].type !== 'pad') {
        Font.draw(ctx, 'GAMEPAD - ALL PADS', 8, y + 2, COL.orange);
        y += 13;
      }
      if (row.type === 'btn' && rows[i - 1].type !== 'btn') y += 4;
      const sel = i === ks.idx;
      if (sel) { ctx.fillStyle = '#20206C'; ctx.fillRect(4, y - 2, SW - 8, 11); }
      if (row.type === 'player') {
        const name = 'PLAYER ' + ROMAN[ks.player];
        ctx.drawImage(Sprites.playerIcon(Config.playerPal(ks.player)), 16, y);
        Font.drawCenter(ctx, (sel ? '< ' : '') + name + (sel ? ' >' : ''), SW / 2, y, COL.white);
        Font.drawRight(ctx, Keymap.custom(ks.player) ? 'CUSTOM' : 'DEFAULT', 250, y, Keymap.custom(ks.player) ? COL.gold : COL.lgrey);
        y += 13;
        Font.draw(ctx, 'KEYBOARD', 8, y + 2, COL.orange);
        Font.draw(ctx, 'KEY 1', 120, y + 2, COL.lgrey);
        Font.draw(ctx, 'KEY 2', 184, y + 2, COL.lgrey);
        y += 13;
        return;
      }
      if (row.type === 'btn') {
        Font.draw(ctx, row.label, 16, y, row.act === 'back' ? COL.white : COL.gold);
        y += 11;
        return;
      }
      Font.draw(ctx, LABEL[row.a], 16, y, COL.white);
      const list = row.type === 'key' ? Keymap.get(ks.player)[row.a] : Keymap.padMap()[row.a];
      for (let c = 0; c < 2; c++) {
        const x = c ? 184 : 120;
        const waiting = ks.capture && ks.capture.row === i && ks.capture.col === c;
        const text = waiting ? ((this.t >> 3) & 1 ? '?' : '') : (row.type === 'key' ? keyLabel(list[c]) : padLabel(list[c]));
        if (sel && ks.col === c) { ctx.fillStyle = COL.gold; ctx.fillRect(x - 3, y - 2, 60, 1); ctx.fillRect(x - 3, y + 8, 60, 1); }
        Font.draw(ctx, text, x, y, list[c] === undefined && !waiting ? '#505050' : COL.white);
      }
      y += 11;
    });
    let foot = 'A CHANGE  DEL CLEAR  ESC BACK';
    if (ks.capture) foot = ks.capture.kind === 'pad' ? 'PRESS A PAD BUTTON  ESC CANCEL' : 'PRESS A KEY  ESC CANCEL';
    else if (ks.msgT > 0) foot = ks.msg;
    else if (rows[ks.idx].type === 'player') foot = '<> CHOOSE PLAYER';
    Font.drawCenter(ctx, foot, SW / 2, 214, ks.msgT > 0 && !ks.capture ? COL.gold : COL.lgrey);
  },

  // short message over any screen (gamepad connected, ...)
  toast(text) { this.toastText = text; this.toastT = 150; },

  // ---------------------------------------------------------------- settings
  toSettings() {
    this.st = { idx: 1, scroll: 0, rep: 0 };
    this.setState('settings');
  },

  settingsMove(dir) {
    const n = SETTINGS_DEF.length, st = this.st;
    let i = st.idx;
    do { i = (i + dir + n) % n; } while (SETTINGS_DEF[i].section);
    st.idx = i;
    // keep the cursor (and the section header above it) on screen
    if (st.idx < st.scroll + 1) st.scroll = Math.max(0, st.idx - 1);
    if (st.idx >= st.scroll + SETTINGS_ROWS) st.scroll = st.idx - SETTINGS_ROWS + 1;
    if (dir > 0 && st.idx < st.scroll) st.scroll = 0;
  },

  settingsActivate(dir) {
    const row = SETTINGS_DEF[this.st.idx];
    if (row.key) {
      Config.step(row.key, dir);
      Sound.play('select');
    } else if (row.action === 'reset') {
      Config.reset();
      Sound.play('pickup');
    } else if (row.action === 'resetCards') {
      Seen.reset();
      this.toast('CARDS WILL SHOW AGAIN');
      Sound.play('pickup');
    } else if (row.action === 'classicPU') {
      Config.setPowerups(pu => (pu.isNew ? 'OFF' : 'ANYONE'));
      Sound.play('pickup');
    } else if (row.action === 'allPU') {
      Config.setPowerups(() => 'ANYONE');
      Sound.play('pickup');
    } else if (row.action === 'fitScreen') {
      // one click: field sized to the screen shape, scaled to fill it, fullscreen
      Config.values.fieldW = 'FIT';
      Config.values.fieldH = 13;
      Config.values.scaling = 'FILL';
      Config.save();
      if (!(document.fullscreenElement || document.webkitFullscreenElement)) toggleFullscreen();
      this.applyLayout();
      Config.apply();
      Sound.play('pickup');
    } else if (row.action === 'keys') {
      this.toKeys();
    } else if (row.action === 'ranks') {
      this.setState('ranks');
    } else if (row.action === 'fullscreen') {
      toggleFullscreen();
    } else if (row.action === 'back') {
      this.leaveSettings();
    }
  },

  leaveSettings() {
    this.toTitle();
    this.titleY = 0;
    this.menuIdx = this.titleMenu().findIndex(it => it.label === 'SETTINGS');
  },

  updateSettings() {
    const m = Input.menu(), st = this.st;
    const tapped = m.up ? 0 : m.right ? 1 : m.down ? 2 : m.left ? 3 : -1;
    let d = -1;
    if (tapped >= 0) { d = tapped; st.rep = 16; }
    else {
      const held = Input.heldDir();
      if (held >= 0 && --st.rep <= 0) { d = held; st.rep = 4; }
    }
    if (d === 0) { this.settingsMove(-1); Sound.play('select'); }
    if (d === 2) { this.settingsMove(1); Sound.play('select'); }
    if (d === 1 || d === 3) {
      if (SETTINGS_DEF[st.idx].key) this.settingsActivate(d === 1 ? 1 : -1);
    }
    if (m.ok) this.settingsActivate(1);
    else if (m.alt) { if (SETTINGS_DEF[st.idx].key) this.settingsActivate(-1); }
    else if (m.back) this.leaveSettings();
  },

  renderSettings(ctx) {
    const st = this.st;
    ctx.fillStyle = COL.black;
    ctx.fillRect(0, 0, SW, SH);
    Font.drawCenter(ctx, 'SETTINGS', SW / 2, 8, COL.red);
    Font.drawRight(ctx, 'V' + APP_VERSION, 250, 8, '#505050');
    for (let r = 0; r < SETTINGS_ROWS; r++) {
      const i = st.scroll + r, row = SETTINGS_DEF[i];
      if (!row) break;
      const y = SETTINGS_TOP + r * SETTINGS_ROW_H;
      if (row.section) {
        Font.draw(ctx, row.section, 8, y, COL.orange);
        ctx.fillStyle = COL.orange;
        ctx.fillRect(8 + row.section.length * 8 + 2, y + 3, 216 - row.section.length * 8, 1);
        if (row.enemy !== undefined) ctx.drawImage(Sprites.tank('e' + row.enemy, 0, 3, ENEMY[row.enemy].pal || 'silver'), 232, y - 5);
        if (row.section === 'WHO CAN COLLECT') {
          ctx.fillStyle = COL.black;
          ctx.fillRect(184, y, 64, 8);
          Font.draw(ctx, '* NEW', 200, y, COL.gold);
        }
        continue;
      }
      const sel = i === st.idx;
      if (sel) {
        ctx.fillStyle = '#20206C';
        ctx.fillRect(4, y - 2, SW - 8, 11);
      }
      if (row.action) {
        Font.draw(ctx, row.label, 16, y, row.action === 'reset' ? COL.red : row.action === 'back' ? COL.white : COL.gold);
        continue;
      }
      Font.draw(ctx, row.label, 16, y, COL.white);
      const val = Config.format(row.key);
      Font.drawRight(ctx, val, 238, y, Config.isDefault(row.key) ? COL.lgrey : COL.gold);
      if (sel) {
        Font.draw(ctx, '<', 238 - val.length * 8 - 9, y, COL.white);
        Font.draw(ctx, '>', 241, y, COL.white);
      }
      if (row.color) {
        const c = TANK_COLORS[Config.get(row.key)];
        c.forEach((col, k) => { ctx.fillStyle = col; ctx.fillRect(160 - 18 + k * 5, y, 5, 7); });
      }
    }
    // scroll hints
    ctx.fillStyle = COL.lgrey;
    if (st.scroll > 0) for (let k = 0; k < 4; k++) ctx.fillRect(SW / 2 - k, 19 + k - 3, 1 + 2 * k, 1);
    if (st.scroll + SETTINGS_ROWS < SETTINGS_DEF.length) for (let k = 0; k < 4; k++) ctx.fillRect(SW / 2 - 3 + k, 205 + k, 7 - 2 * k, 1);
    // footer: what the selected power-up does, otherwise the controls
    const cur = SETTINGS_DEF[st.idx];
    if (cur.powerup !== undefined) {
      ctx.drawImage(Sprites.powerups[cur.powerup], 8, 207);
      Font.draw(ctx, POWERUPS[cur.powerup].desc, 28, 212, COL.white);
    } else if (cur.enemy !== undefined && ENEMY[cur.enemy].desc) {
      ctx.drawImage(Sprites.tank('e' + cur.enemy, (this.t >> 3) & 1, 1, ENEMY[cur.enemy].pal), 8, 207);
      Font.draw(ctx, ENEMY[cur.enemy].desc, 28, 212, COL.white);
    } else if (cur.key === 'aiStyle' || cur.key === 'aiMarks') {
      ['RUSH', 'HUNT', 'SNIPE'].forEach((w, i) => {
        ctx.fillStyle = AI_MARK[i + 1];
        ctx.fillRect(24 + i * 72, 213, 5, 5);
        Font.draw(ctx, w, 34 + i * 72, 212, COL.white);
      });
    } else {
      Font.drawCenter(ctx, '<> CHANGE   ESC BACK', SW / 2, 212, COL.lgrey);
    }
  },

  // ---------------------------------------------------------------- ranks and perks (from settings)
  updateRanks() {
    const m = Input.menu();
    if (this.t > 5 && (m.ok || m.back || m.alt)) { Sound.play('select'); this.setState('settings'); }
  },

  renderRanks(ctx) {
    ctx.fillStyle = COL.black;
    ctx.fillRect(0, 0, SW, SH);
    Font.drawCenter(ctx, 'RANKS AND PERKS', SW / 2, 4, COL.red);
    const perks = Config.get('perks') === 'ON', pal = Config.playerPal(0);
    RANKS.forEach((rk, i) => {
      const y = 21 + i * 20;
      ctx.drawImage(Sprites.rankTank('p0', (this.t >> 3) & 1, 0, pal, i + 1, true), 8, y - 2);
      if (i === 9 && (this.t & 31) < 20) ctx.drawImage(Sprites.outline(Sprites.rankTank('p0', (this.t >> 3) & 1, 0, pal, 10, true), COL.gold), 7, y - 3);
      Font.draw(ctx, (i + 1) + ' ' + rk.name, 32, y, COL.white);
      Font.drawRight(ctx, rk.xp + ' XP', 250, y, COL.gold);
      Font.draw(ctx, rk.perk, 48, y + 9, perks ? COL.lgrey : '#505050');
    });
    if (!Config.xpOn()) Font.drawCenter(ctx, 'XP AND LEVELS ARE OFF', SW / 2, 215, COL.orange);
    else if (!perks) Font.drawCenter(ctx, 'PERKS OFF: LOOKS ONLY', SW / 2, 215, COL.orange);
  },

  // mouse / touch on the canvas (in screen pixels)
  pointer(x, y) {
    Sound.unlock();
    if (this.state === 'ranks') { this.setState('settings'); return; }
    if (this.state === 'title' || this.state === 'settings' || this.state === 'shop') { x -= menuOX(); y -= menuOY(); }
    if (this.state === 'shop') {
      const r = Math.floor((y - SHOP_TOP + 4) / SHOP_ROW_H), i = this.shop.scroll + r;
      if (r < 0 || r >= SHOP_ROWS || !SHOP_ITEMS[i]) return;
      if (i === this.shop.idx) this.shopBuy();
      else { this.shop.idx = i; Sound.play('select'); }
      return;
    }
    if (this.state === 'title' && this.titleY === 0) {
      const i = Math.floor((y - this.titleMenuY() + 4) / this.titleStep());
      if (i >= 0 && i < this.titleMenu().length && x > 56 && x < 200) {
        if (i === this.menuIdx) this.chooseMenu(i);
        else { this.menuIdx = i; Sound.play('select'); }
      }
    } else if (this.state === 'settings') {
      const r = Math.floor((y - SETTINGS_TOP + 2) / SETTINGS_ROW_H);
      if (y < 20) { this.settingsMove(-1); return; }
      if (y > 204) { this.settingsMove(1); return; }
      const i = this.st.scroll + r, row = SETTINGS_DEF[i];
      if (r < 0 || r >= SETTINGS_ROWS || !row || row.section) return;
      if (i !== this.st.idx && !row.action) { this.st.idx = i; Sound.play('select'); return; }
      this.st.idx = i;
      if (row.key) this.settingsActivate(x < 196 ? -1 : 1);
      else this.settingsActivate(1);
    }
  },

  wheel(dy) {
    if (this.state === 'settings') this.settingsMove(dy > 0 ? 1 : -1);
    if (this.state === 'shop') this.shopMove(dy > 0 ? 1 : -1);
  },

  // ---------------------------------------------------------------- dispatch
  update() {
    if (Net.role === 'client') { this.t++; Net.clientUpdate(); return; }
    this.t++;
    switch (this.state) {
      case 'title': this.updateTitle(); break;
      case 'curtain': this.updateCurtain(); break;
      case 'play': this.updatePlay(); break;
      case 'score': this.updateScore(); break;
      case 'bigover': this.updateBigOver(); break;
      case 'construct': this.updateConstruct(); break;
      case 'settings': this.updateSettings(); break;
      case 'shop': this.updateShop(); break;
      case 'keys': this.updateKeys(); break;
      case 'ranks': this.updateRanks(); break;
      case 'dailyResult': this.updateDailyResult(); break;
      case 'vsResult': this.updateVsResult(); break;
      case 'modeResult': this.updateModeResult(); break;
    }
  },

  render(ctx) {
    // the canvas follows the field size; menus sit in a centred 256x224 frame
    const c = ctx.canvas;
    if (c.width !== SCREEN_W || c.height !== SCREEN_H) {
      c.width = SCREEN_W;
      c.height = SCREEN_H;
      ctx.imageSmoothingEnabled = false;
      Sprites.brickPattern = null;
      if (this.onResize) this.onResize();
    }
    const full = this.state === 'play' || this.state === 'curtain' || this.state === 'construct';
    if (!full) {
      ctx.fillStyle = COL.black;
      ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
      ctx.save();
      ctx.translate(menuOX(), menuOY());
    }
    this.renderState(ctx);
    if (!full) ctx.restore();
    if (this.toastT > 0) {
      this.toastT--;
      const w = this.toastText.length * 8 + 12, x = (SCREEN_W - w) >> 1;
      ctx.fillStyle = COL.black;
      ctx.fillRect(x, 2, w, 12);
      Font.draw(ctx, this.toastText, x + 6, 4, COL.gold);
    }
  },

  renderState(ctx) {
    switch (this.state) {
      case 'title': this.renderTitle(ctx); break;
      case 'curtain': this.renderCurtain(ctx); break;
      case 'play': this.renderPlay(ctx); break;
      case 'score': this.renderScore(ctx); break;
      case 'bigover': this.renderBigOver(ctx); break;
      case 'construct': this.renderConstruct(ctx); break;
      case 'settings': this.renderSettings(ctx); break;
      case 'shop': this.renderShop(ctx); break;
      case 'keys': this.renderKeys(ctx); break;
      case 'ranks': this.renderRanks(ctx); break;
      case 'dailyResult': this.renderDailyResult(ctx); break;
      case 'vsResult': this.renderVsResult(ctx); break;
      case 'modeResult': this.renderModeResult(ctx); break;
      case 'netwait': this.renderNetWait(ctx); break;
    }
  },
};

function toggleFullscreen() {
  const el = document.getElementById('wrap');
  const fsEl = document.fullscreenElement || document.webkitFullscreenElement;
  try {
    if (fsEl) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    else {
      const req = el.requestFullscreen || el.webkitRequestFullscreen;
      const r = req && req.call(el);
      if (r && r.catch) r.catch(() => {});
    }
  } catch (e) { /* fullscreen not available here */ }
}

// =====================================================================
//  Boot & main loop (fixed 60 Hz simulation)
// =====================================================================
(function boot() {
  const canvas = document.getElementById('screen');
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  document.title = APP_TITLE;
  Sprites.init();
  Config.init();
  Keymap.load();
  Input.init();
  window.addEventListener('gamepadconnected', e => Game.toast('GAMEPAD ' + (e.gamepad.index + 1) + ' CONNECTED'));
  window.addEventListener('gamepaddisconnected', e => Game.toast('GAMEPAD ' + (e.gamepad.index + 1) + ' DISCONNECTED'));
  Input.updateHelp();
  Game.init();

  const toScreen = e => {
    const r = canvas.getBoundingClientRect();
    return [(e.clientX - r.left) * canvas.width / r.width, (e.clientY - r.top) * canvas.height / r.height];
  };
  canvas.addEventListener('pointerdown', e => { const [x, y] = toScreen(e); Game.pointer(x, y); });
  canvas.addEventListener('wheel', e => {
    if (Game.state !== 'settings' && Game.state !== 'shop') return;
    e.preventDefault();
    Game.wheel(e.deltaY);
  }, { passive: false });

  // SHARP scales by whole pixels; FILL uses all the space it can
  function resize() {
    const wrap = document.getElementById('wrap');
    const cs = getComputedStyle(wrap);
    const w = wrap.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const h = wrap.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    let s = Math.min(w / canvas.width, h / canvas.height);
    if (s >= 1 && Config.get('scaling') === 'SHARP') s = Math.floor(s);
    s = Math.max(0.25, s);
    canvas.style.width = Math.round(canvas.width * s) + 'px';
    canvas.style.height = Math.round(canvas.height * s) + 'px';
  }
  Game.onResize = resize;
  const relayout = () => {
    // outside a game, FIT field sizes follow the window shape
    if (Game.state === 'title' || Game.state === 'settings') Game.applyLayout();
    resize();
  };
  window.addEventListener('resize', relayout);
  document.addEventListener('fullscreenchange', relayout);
  document.addEventListener('webkitfullscreenchange', relayout);
  canvas.addEventListener('dblclick', toggleFullscreen);
  resize();

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && Game.state === 'play' && !Game.paused && !Game.stage.over) {
      Game.paused = true;
      Game.pauseIdx = 0;
      Sound.setEngine(0);
    }
  });

  const BASE_STEP = 1000 / 60;
  let last = performance.now(), acc = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    acc += now - last;
    last = now;
    if (acc > 200) acc = 200;
    const STEP = BASE_STEP / Config.scale('gameSpeed');
    while (acc >= STEP) {
      Input.poll();
      if (!Net.panelOpen || Net.role === 'host') Game.update();
      Net.hostTick();
      Input.endFrame();
      acc -= STEP;
    }
    Game.render(ctx);
  }
  requestAnimationFrame(frame);
})();
