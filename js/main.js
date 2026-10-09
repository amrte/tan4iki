'use strict';
// =====================================================================
//  Game flow: title → stage curtain → play → score tally → next / over
// =====================================================================

// Menus (title, settings, shop, score) are drawn in a classic 256x224 frame, centred on the
// play screen, whose size follows the field size (SCREEN_W x SCREEN_H, see setFieldSize).
const SW = 256, SH = 224;
const SAVE_KEY = 'tank1990_save';   // CLASSIC's slot; every other mode adds '_' + its slot (see Game.saveSlotOf)
// modes saved as a checkpoint (CLASSIC and BIG MAPS save the stage exactly), and the game's state they keep
const CK_MODES = ['custom', 'survival', 'timeattack', 'sides', 'corridor', 'maze', 'fortress', 'galaxy', 'cpu', 'race'];
const CK_GAME_KEYS = ['taFrames', 'taCleared', 'round', 'raceTarget', 'tdMap', 'nextSide', 'shopDiscount', 'gxRun', 'gxDate', 'gxClock', 'gxEndless'];
const menuOX = () => (SCREEN_W - SW) >> 1;
const menuOY = () => (SCREEN_H - SH) >> 1;
// saves the browser wouldn't store (storage full, or blocked for this page): kept here until the page is closed
const MEM_SAVES = {};
const STORE = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } },
};


function newPlayer(i) {
  return {
    i, score: 0, lives: Config.startLives(), level: Config.get('startStars'), ship: false, cutter: false,
    kills: zeroKills(), out: false, extraGiven: false, extraCount: 0, mines: 0, turrets: 0, bridges: 0, tank: null,
    kit: null, shopShovel: false, spent: 0,   // spent: points paid out in the shop (score keeps everything earned)
    weapon: 'cannon', wlv: {},   // the weapon in hand and each one's level (weapons.js)
    rank: Config.get('startLevel'), xp: RANKS[Config.get('startLevel') - 1].xp, stageXp: 0,   // XP level (1-10)
  };
}


// a blank custom level: just the eagle's brick fortress (classic 13x13 layout; the editor is in editor.js)
function defaultCustomMap() {
  const rows = [];
  for (let y = 0; y < 26; y++) rows.push('.'.repeat(26).split(''));
  for (const [bx, by] of [[11, 23], [12, 23], [13, 23], [14, 23], [11, 24], [14, 24], [11, 25], [14, 25]]) rows[by][bx] = '#';
  return rows.map(r => r.join(''));
}

const TITLE_MENU_Y = 126;
const ROMAN = ['I', 'II', 'III', 'IV'];
// the pause menu; SKILL changes the difficulty on the spot (not in the daily challenge, where it's part of the rules)
const pauseMenu = () => ['CONTINUE'].concat(Game.daily ? [] : ['SKILL'], Game.mode === 'fortress' ? ['SPEED'] : [], ['MUSIC', 'MUSIC VOL'],
  Game.daily ? [] : [Game.mode === 'fortress' ? 'RESTART WAVE' : 'RESTART ROUND'], ['SAVE GAME'], Net.role ? ['ONLINE PLAYERS'] : [], ['QUIT']);
// pause rows changed with left/right (or fire): the setting each one steps
const PAUSE_STEP = { MUSIC: 'music', 'MUSIC VOL': 'musicVol', SPEED: 'tdSpeed' };
const SETTINGS_ROWS = 15, SETTINGS_TOP = 24, SETTINGS_ROW_H = 12;

// The settings as a menu tree: each section of SETTINGS_DEF becomes a page on the top level, the per-enemy sections
// pages under ENEMY TYPES; RESET and BACK stay on the top level, and every page ends with a BACK row.
// Items: { label, node } opens a page; anything else is a SETTINGS_DEF row (a setting or an action).
function settingsTree() {
  const root = { title: 'SETTINGS', items: [] }, types = { title: 'ENEMY TYPES', items: [] };
  let page = null;
  for (const row of SETTINGS_DEF) {
    if (row.section) {
      page = { title: row.section, items: [], enemy: row.enemy };
      if (row.enemy !== undefined) types.items.push({ label: row.section, node: page, enemy: row.enemy });
      else {
        root.items.push({ label: row.section, node: page });
        if (row.section === 'ENEMIES') root.items.push({ label: 'ENEMY TYPES', node: types });
      }
    } else if (row.action === 'reset' || row.action === 'back') root.items.push(row);
    else page.items.push(row);
  }
  const addBack = node => { for (const it of node.items) if (it.node) addBack(it.node); if (node !== root) node.items.push({ action: 'up', label: 'BACK' }); };
  addBack(root);
  return root;
}

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
  // weapons (weapons.js): the next MK of one, which goes in hand; the cannon is free to go back to
  { id: 'w_cannon', weapon: 'cannon', name: 'CANNON', price: 0, icon: PU.STAR, desc: 'BACK TO THE CLASSIC GUN' },
  ...WEAPON_KEYS.map(k => ({ id: 'w_' + k, weapon: k, name: WEAPONS[k].name, icon: PU.WEAPON, desc: WEAPONS[k].desc })),
  { id: 'turret', name: 'TURRET', price: 4000, icon: PU.TURRET, desc: 'PLACE IT ANYWHERE WITH B' },
  { id: 'claude', name: 'CLAUDE', price: 6000, icon: PU.CLAUDE, desc: 'CLAUDE JOINS NEXT STAGE' },
  // makes every Claude better (team-wide, kept between stages like the base upgrades; extras.js)
  { id: 'claudeUp', up: 'claude', name: CLAUDE_UPGRADE.name, prices: CLAUDE_UPGRADE.prices, descs: CLAUDE_UPGRADE.descs, icon: PU.CLAUDE },
  { id: 'wingman', name: 'WINGMAN', price: 5000, icon: PU.TANK, desc: 'AN AI TANK FIGHTS BESIDE YOU' },
  { id: 'decoy', name: 'DECOY EAGLE', price: 3000, icon: PU.SHOVEL, desc: 'FAKE EAGLE LURES RUSHERS' },
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

function shopPrice(item, p) {
  if (item.gxShop) return gxShopPrice(item, p);   // the GALAXY hangar (galaxy.js)
  const discount = Game.shopDiscount ? 0.75 : 1;
  if (item.id === 'revive') return reviveCost();   // the REVIVE COST setting, as during play
  if (item.weapon) {
    // the next MK; one you have at MK IV is free to take back in hand
    const lv = (p && p.wlv && p.wlv[item.weapon]) || 0;
    if (item.weapon === 'cannon' || lv >= WEAPON_MAX) return 0;
    return Math.round((WEAPON_PRICES[item.weapon][lv] * Config.scale('shopPrices') * discount) / 100) * 100;
  }
  const price = item.prices ? item.prices[Math.min(item.prices.length - 1, Game.base[item.base || item.up] || 0)] : item.price;
  return Math.round((price * Config.scale('shopPrices') * discount) / 100) * 100;
}

// what the player already has; `max` means it can't be bought again
function shopStatus(item, p) {
  if (item.gxShop) return gxShopStatus(item, p);
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
  // the maze has no eagle: nothing for it on sale there
  if (Game.mode === 'maze' && (item.base || item.id === 'shovel' || item.id === 'decoy')) return { text: 'N/A', max: true };
  if (item.base) {
    if (!Config.on('baseShop')) return { text: 'OFF', max: true };
    const lv = Game.base[item.base] || 0, top = item.prices.length;
    return { text: lv >= top ? 'MAX' : 'L' + lv + '/' + top, max: lv >= top };
  }
  if (item.weapon) {
    const inHand = (p.weapon || 'cannon') === item.weapon, lv = (p.wlv || {})[item.weapon] || 0;
    if (item.weapon === 'cannon') return inHand ? { text: 'IN HAND', max: true } : { text: 'TAKE' };
    if (inHand) return lv >= WEAPON_MAX ? { text: 'MK IV', max: true } : { text: 'MK ' + MK[lv - 1] };
    return lv ? { text: lv >= WEAPON_MAX ? 'TAKE' : 'MK ' + MK[lv - 1] } : { text: '' };
  }
  switch (item.id) {
    case 'life': return Config.infiniteLives() ? { text: 'INF', max: true } : { text: 'X' + p.lives, max: p.lives >= 99 };
    case 'star': return { text: p.level + '/3', max: p.level >= 3 };
    case 'gun': return p.level >= 3 && p.cutter ? { text: 'OWNED', max: true } : { text: '' };
    case 'ship': return p.ship ? { text: 'OWNED', max: true } : { text: '' };
    case 'mines': return { text: 'X' + (p.mines || 0), max: (p.mines || 0) >= 99 };
    case 'turret': return { text: 'X' + (p.turrets || 0), max: (p.turrets || 0) >= 9 };
    case 'shovel': return p.shopShovel ? { text: 'READY', max: true } : { text: '' };
    case 'done': return { text: '' };
    default: return p.kit && p.kit[item.id] ? { text: 'READY', max: true } : { text: '' };
  }
}

function shopApply(item, p) {
  if (item.gxShop) { gxShopApply(item, p); return; }
  if (item.id === 'revive') {
    const who = p.out ? p : Game.players.find(q => q.out);
    who.out = false;
    who.lives = 0;
    return;
  }
  if (item.id === 'turret') { p.turrets = (p.turrets || 0) + 1; return; }
  if (item.weapon) {
    // its next MK (MK IV stays MK IV), and it goes in hand
    p.wlv = p.wlv || {};
    if (item.weapon !== 'cannon') p.wlv[item.weapon] = Math.min(WEAPON_MAX, (p.wlv[item.weapon] || 0) + 1);
    p.weapon = item.weapon;
    return;
  }
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
  multiN: 1,     // players chosen on the PLAYERS row (1-4)
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
    // a BIG MAPS game in the old single slot moves to its own
    const old = STORE.get(SAVE_KEY, null);
    if (old && old.mode && old.mode !== 'classic' && !STORE.get(this.saveKey(old.mode), null)) { STORE.set(this.saveKey(old.mode), old); this.dropSave('classic'); }
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

  titleMenu() {
    const m = [], sv = this.savePeek(this.titleSlot());
    // the picked mode's save, and where it goes on from
    if (sv) m.push({ label: 'CONTINUE', note: this.saveWhere(sv), save: sv, act: () => this.loadGame() });
    // how many play here: left/right picks 1-4
    m.push({ label: this.multiN + (this.multiN > 1 ? ' PLAYERS' : ' PLAYER'), players: true, act: () => this.startGame(this.multiN), adjust: d => { this.multiN = (this.multiN - 1 + d + 4) % 4 + 1; } });
    // game mode: left/right (or A) changes it
    m.push({ label: 'MODE: ' + modeInfo(Config.get('gameMode')).name, mode: true, act: () => this.stepMode(1), adjust: d => this.stepMode(d) });
    // skill level, named as in DOOM: left/right (or A) changes it
    m.push({ label: Config.get('skill') === AUTO_SKILL ? 'AUTO SKILL' : Config.skill().name, skill: true, act: () => Config.step('skill', 1), adjust: d => Config.step('skill', d) });
    m.push({ label: 'SETTINGS', act: () => this.toSettings() });
    m.push({ label: 'DAILY CHALLENGE', daily: true, act: () => this.startDaily() });
    // left/right switches between hosting and joining an online game
    m.push({ label: this.onlineJoin ? 'ONLINE: JOIN' : 'ONLINE: HOST', act: () => this.openOnline(), adjust: () => { this.onlineJoin = !this.onlineJoin; } });
    m.push({ label: 'CONSTRUCTION', act: () => this.toConstruct() });
    return m;
  },

  // the next mode; CONTINUE comes and goes with the mode's save, so the cursor stays on the MODE row
  stepMode(d) {
    Config.step('gameMode', d);
    this.menuIdx = Math.max(0, this.titleMenu().findIndex(it => it.mode));
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
    const menu = this.titleMenu(), top = this.titleMenuY();
    // the brick title (28 high) halfway between the score row (and the II-player row under it) and the menu
    const rowBottom = this.lastScores[1] ? 36 : 24;
    Font.big(ctx, GAME_NAME, (SW - Font.bigWidth(GAME_NAME, 4)) >> 1, Math.round((rowBottom + top - 4 - 28) / 2), 4, pat);
    menu.forEach((it, i) => {
      const y = this.titleRowY(i);
      Font.draw(ctx, it.label, 88, y, it.skill ? ['#58D854', '#B8F818', COL.white, COL.orange, COL.red, '#3CBCFC'][Config.get('skill')] : COL.white);
      if (it.note) Font.draw(ctx, it.note, 88 + (it.label.length + 1) * 8, y, COL.lgrey);
      if (it.adjust && !it.skill && i === this.menuIdx) Font.draw(ctx, '<>', 88 + it.label.length * 8 + 6, y, COL.lgrey);
    });
    if (this.titleY === 0) {
      const anim = (this.t >> 2) & 1;
      ctx.drawImage(Sprites.tank('p0', anim, 1, Config.playerPal(0)), 64, this.titleRowY(this.menuIdx) - 4);
    }
    const cur = menu[this.menuIdx];
    if (cur && cur.mode && this.titleY === 0) {
      const mi = modeInfo(Config.get('gameMode')), rec = STORE.get(MODE_KEY, {});
      Font.drawCenter(ctx, mi.desc + (mi.cpu ? '' : mi.vs ? ' (2-4 P)' : ''), SW / 2, 203, COL.gold);
      const best = mi.key === 'survival' && rec.survival ? 'BEST WAVE ' + rec.survival.wave + '  ' + rec.survival.score
        : mi.key === 'timeattack' && rec.timeattack ? 'BEST TIME ' + fmtTime(rec.timeattack)
        : mi.key === 'corridor' && rec.corridor ? 'BEST CLIMB ' + rec.corridor.dist + ' M  ' + rec.corridor.score
        : mi.key === 'maze' && rec.maze ? 'BEST: ' + rec.maze.escaped + ' MAZES ESCAPED  ' + rec.maze.score
        : mi.key === 'fortress' && rec.fortress ? 'STARS ' + TD_MAPS.map(m => (rec.fortress[m.key] || {}).stars || 0).reduce((a, b) => a + b, 0) + '/' + TD_MAPS.length * 3 + '  MAPS ' + TD_MAPS.filter((m, i) => tdUnlocked(i)).length + '/' + TD_MAPS.length
        : mi.key === 'galaxy' ? '1-4 PLAYERS' + (rec.galaxy ? ', BEST SECTOR ' + rec.galaxy.level + '  ' + rec.galaxy.score : '')
        : mi.key === 'coop' ? '1-4 PLAYERS TOGETHER' + (rec.cpu ? ', BEST ' + rec.cpu.rounds + ' ROUNDS' : '')
        : mi.key === 'eagles' ? '1P: VS CPU' + (rec.cpu ? ', BEST ' + rec.cpu.rounds + ' ROUNDS' : '') + '  2-4P: VS'
        : mi.key === 'dm' ? '1P: VS ' + DM_BOTS + ' BOTS  2-4P: VS EACH OTHER'
        : mi.key === 'race' ? 'FIRST TO ' + Config.get('raceTarget') + '  1P: VS ' + DM_BOTS + ' BOTS'
        : mi.key === 'custom' ? (Customs.used().length ? Customs.used().length + ' OF ' + CUSTOM_SLOTS + ' SLOTS FILLED' : 'MAKE SOME IN CONSTRUCTION') : '< > CHANGE MODE';
      Font.drawCenter(ctx, best, SW / 2, 213, COL.lgrey);
    } else if (cur && cur.save && this.titleY === 0) {
      const [a, b] = this.saveInfo(cur.save);
      Font.drawCenter(ctx, a, SW / 2, 203, COL.gold);
      Font.drawCenter(ctx, b, SW / 2, 213, COL.lgrey);
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
  // The menu is laid out for its longest form (with CONTINUE): CONTINUE comes and goes with the picked mode's save,
  // and its row is left empty rather than everything moving up and down as you go through the modes.
  titleStep() { return 12; },
  titleMenuY() { return TITLE_MENU_Y - 2 * this.titleStep(); },   // where CONTINUE's row is (8 rows round TITLE_MENU_Y)
  titleSkip() { const m = this.titleMenu(); return m[0] && m[0].save ? 0 : 1; },
  titleRowY(i) { return this.titleMenuY() + (i + this.titleSkip()) * this.titleStep(); },

  // ---------------------------------------------------------------- save / load
  // One save slot per mode (GALAXY: per run type; CLASSIC keeps the old 'tank1990_save' key), written by SAVE GAME in
  // the pause menu and automatically at every stage start. CLASSIC and BIG MAPS save the stage exactly as it is; the
  // other modes save a checkpoint: how things stood at the start of the stage, round, sector or wave (this.ck, taken
  // in beginStage and when the stage passes a mark, see ckMarkOf), and loading plays on from there.
  // Never online, in the daily challenge or in a versus match (VS EAGLES, DEATHMATCH, FLAGS: one match between players).
  saveKind() {
    if (Net.role) return 'NO SAVES ONLINE';
    if (this.daily) return 'NO SAVES IN DAILY';
    if (this.mode === 'classic' || this.mode === 'bigmaps') return 'exact';
    return CK_MODES.includes(this.mode) ? 'ckpt' : "CAN'T SAVE HERE";
  },

  // the slot a mode saves in, and its storage key
  saveSlotOf(mode = this.mode, run = this.gxRun) { return mode === 'galaxy' && run && run !== 'campaign' ? 'galaxy_' + run : mode; },
  saveKey(slot) { return slot === 'classic' ? SAVE_KEY : SAVE_KEY + '_' + slot; },
  // the slot of the mode picked on the title screen (VS EAGLES alone and CO-OP are both VS CPU; no saves in versus)
  titleSlot() {
    const m = Config.get('gameMode');
    if (m === 'coop' || m === 'eagles') return 'cpu';
    if (m === 'galaxy') return this.saveSlotOf('galaxy', typeof gxdRun === 'function' ? gxdRun() : 'campaign');
    return CK_MODES.includes(m) || m === 'classic' || m === 'bigmaps' ? m : null;
  },

  // a slot's save, or null (parsed once, then cached while the stored text stays the same)
  savePeek(slot) {
    if (!slot) return null;
    let raw = null;
    const key = this.saveKey(slot);
    if (key in MEM_SAVES) raw = MEM_SAVES[key];   // the browser wouldn't keep it: the copy from this session
    else try { raw = localStorage.getItem(key); } catch (e) { /* storage unavailable */ }
    const c = this.peekCache || (this.peekCache = {});
    if (!c[slot] || c[slot].raw !== raw) {
      let s = null;
      try { s = raw && JSON.parse(raw); } catch (e) { s = null; }
      // the old single slot could hold a BIG MAPS game (init moves it to its own slot)
      if (s && (typeof s !== 'object' || (slot === 'classic' && s.mode && s.mode !== 'classic'))) s = null;
      c[slot] = { raw, s };
    }
    const s = c[slot].s;
    // GALAXY DAILY: today's only
    if (s && s.mode === 'galaxy' && s.g && s.g.gxRun === 'daily' && s.g.gxDate !== gxdToday()) { this.dropSave(slot); return null; }
    return s;
  },
  hasSave(slot = this.titleSlot()) { return !!this.savePeek(slot); },
  dropSave(slot) { delete MEM_SAVES[this.saveKey(slot)]; try { localStorage.removeItem(this.saveKey(slot)); } catch (e) { /* storage unavailable */ } },
  // true when stored; 'mem' when the browser refused (storage full or blocked: this.saveWhy says which) and the save
  // is kept in memory instead, good until the page is closed; false if it couldn't be written at all
  writeSave(data) {
    const key = this.saveKey(this.saveSlotOf(data.mode, data.g && data.g.gxRun));
    let text;
    try { text = JSON.stringify(data); } catch (e) { this.saveWhy = 'BAD DATA'; return false; }
    try { localStorage.setItem(key, text); delete MEM_SAVES[key]; return true; } catch (e) {
      MEM_SAVES[key] = text;
      this.saveWhy = /quota/i.test(e.name + ' ' + e.message) || e.code === 22 ? 'STORAGE FULL' : 'STORAGE BLOCKED';
      return 'mem';
    }
  },

  // where a save goes on from: short ('SECTOR 5', on the title) or long ('START OF SECTOR 5', in the messages)
  saveWhere(s, long) {
    const at = s.at || {}, g = s.g || {}, n = s.stageNum | 0, start = long && !s.stage ? 'START OF ' : '';
    let w = 'STAGE ' + n;
    if (s.mode === 'galaxy') w = g.gxRun === 'rush' ? 'BOSS ' + n : g.gxRun === 'endless' ? 'WAVE ' + ((at.blk >= 0 ? at.blk : 2 * (n - 1)) * GXD_BLOCK + 1) : 'SECTOR ' + n;
    else if (s.mode === 'fortress') w = 'WAVE ' + ((at.td && at.td.td ? at.td.td.wave | 0 : 0) + 1);
    else if (s.mode === 'survival') w = 'WAVE ' + (at.wave || 1);
    else if (s.mode === 'corridor') return (long ? 'CLIMB ' : '') + (at.climbed | 0) + ' M';
    else if (s.mode === 'race') w = 'ROUND ' + (g.round || 1);
    else if (s.mode === 'cpu') w = 'ROUND ' + n;
    else if (s.mode === 'maze') w = 'MAZE ' + n;
    else if (s.mode === 'timeattack') w = 'STAGE ' + ((g.taCleared | 0) + 1) + '/' + TA_STAGES;
    return start + w;
  },
  // the title's two lines about a save: what and where, then how many players and when
  saveInfo(s) {
    const g = s.g || {}, d = new Date(s.time || 0), two = v => String(v).padStart(2, '0'), n = s.humans || s.numPlayers || 1;
    const name = modeInfo(s.mode || 'classic').name + (s.mode === 'galaxy' && GXD_NAMES[g.gxRun] && g.gxRun !== 'campaign' ? ' ' + GXD_NAMES[g.gxRun] : '');
    const map = s.mode === 'fortress' && TD_MAPS[g.tdMap | 0] ? TD_MAPS[g.tdMap | 0].name : '';
    const b = [map, n > 1 ? n + 'P' : '', s.stage ? 'MID-STAGE' : 'CHECKPOINT', s.time ? d.getFullYear() + '-' + two(d.getMonth() + 1) + '-' + two(d.getDate()) : '',
      s.app && s.app !== APP_VERSION ? 'V' + s.app : ''].filter(x => x);
    while (b.length > 1 && b.join('  ').length > 31) b.pop();   // what fits on the line
    return [name + ' - ' + this.saveWhere(s), b.join('  ')];
  },

  // a checkpoint: the players (deep copies), the game's state for the mode, and `at`: where in the stage (null: its start)
  ckTake(at) {
    const keep = o => JSON.parse(JSON.stringify(o)), g = {};
    for (const k of CK_GAME_KEYS) if (this[k] !== undefined && this[k] !== null) g[k] = keep(this[k]);
    return {
      app: APP_VERSION, fmt: 2, time: Date.now(), mode: this.mode, humans: this.players.filter(p => !p.bot).length, stageNum: this.stageNum,
      lastScores: (this.lastScores || []).slice(), players: this.players.map(p => keep(Object.assign({}, p, { tank: null, tdMenu: null }))),
      base: keep(this.base), g, at: at || null,
    };
  },

  // the marks in a stage that make a new checkpoint: SURVIVAL a wave starting, CORRIDOR a new section, FORTRESS a build
  // phase starting (its RESTART WAVE point), GALAXY ENDLESS the stage's second block of waves
  ckMarkOf(st) {
    if (st.survival) return st.waveBreak ? this.ckMark : 'w' + st.wave;
    if (st.corridor) return 'c' + st.corridor.shifts;
    if (st.td) return st.tdSave ? 't' + st.tdSave.wave : this.ckMark;
    if (st.galaxy && st.galaxy.run === 'endless') return 'b' + st.galaxy.blk;
    return '';
  },
  ckAt(st) {
    if (st.survival) return { wave: st.wave };
    if (st.corridor) { const c = st.corridor; return { climbed: st.corridorClimb(), lifeAt: c.lifeAt, kinds: c.kinds.slice(), spawned: c.spawned }; }
    if (st.td && st.tdSave) {
      const sv = st.tdSave, own = o => Object.assign({}, o, { owner: o.owner ? o.owner.i : -1 });
      return { td: { td: sv.td, eagleArmor: sv.eagleArmor, built: sv.built, players: sv.players, towers: sv.towers.map(own), turrets: sv.turrets.map(own),
        terrain: Array.from(sv.terrain, v => String.fromCharCode(v + 48)).join('') } };
    }
    if (st.galaxy && st.galaxy.run === 'endless') return { blk: st.galaxy.blk };
    return null;
  },
  // every frame of play: a new checkpoint (and autosave) when the stage passes a mark
  ckPoll() {
    const st = this.stage;
    if (!this.ck || this.ck.mode !== this.mode || !st || st.over || this.saveKind() !== 'ckpt') return;
    const m = this.ckMarkOf(st);
    if (m === this.ckMark) return;
    this.ckMark = m;
    this.ck = this.ckTake(this.ckAt(st));
    this.writeSave(this.ck);
  },
  // a freshly built stage, moved on to where the checkpoint was (throws on a save it can't use)
  ckApply(at) {
    const st = this.stage, P = this.players;
    if (st.survival && at.wave > 1) {
      st.wave = at.wave | 0; st.queue = waveQueue(st.wave); st.seasonEnemies(st.queue); st.total = st.queue.length;
    } else if (st.corridor && at.climbed > 0) {
      // the climb so far counts on from where you start
      const c = st.corridor;
      c.climbed = at.climbed | 0; c.startY += c.climbed * 16; c.lifeAt = Math.max(5, at.lifeAt | 0); c.spawned = at.spawned | 0;
      c.kinds = Array.isArray(at.kinds) ? at.kinds.slice() : [];
    } else if (st.td && at.td) {
      const o = at.td, terrain = Uint8Array.from(String(o.terrain), ch => ch.charCodeAt(0) - 48), own = x => Object.assign({}, x, { owner: P[x.owner] || null });
      if (terrain.length !== st.terrain.length || !o.td || !Array.isArray(o.players) || o.players.length !== P.length) throw new Error('fortress save does not fit');
      st.tdSave = { wave: o.td.wave, td: o.td, eagleArmor: o.eagleArmor, terrain, built: o.built || [], towers: (o.towers || []).map(own), turrets: (o.turrets || []).map(own), players: o.players };
      st.tdRestartWave();
      st.origTerrain = st.terrain.slice(); st.popups = [];
    } else if (st.galaxy && st.galaxy.run === 'endless' && at.blk > st.galaxy.blk) {
      // the stage's second block: its sector, its six waves, then the boss that ends the stage
      const g = st.galaxy;
      g.blk = g.blk0 + 1; g.ew = g.blk * GXD_BLOCK; st.gxdBlock(g);
      g.banner = { text: 'WAVE ' + (g.ew + 1) + ': ' + GX_SECTORS[g.sec].name, t: 150 };
    }
  },

  // what SAVE GAME says: saved, kept only until the page closes (and why), or failed
  saveMsgOf(ok, saved) { return ok === true ? saved : ok === 'mem' ? 'NOT KEPT: ' + this.saveWhy : 'SAVE FAILED: ' + (this.saveWhy || 'ERROR'); },

  // SAVE GAME (pause menu) and the autosave at every stage start: true when saved; this.saveMsg says how it went
  saveGame() {
    const kind = this.saveKind();
    let ok = false;
    if (!this.stage || this.stage.over) this.saveMsg = "CAN'T SAVE HERE";
    else if (kind === 'exact') {
      const data = {
        app: APP_VERSION, fmt: 2, time: Date.now(), numPlayers: this.players.length, stageNum: this.stageNum, lastScores: this.lastScores,
        mode: this.mode || 'classic',
        players: this.players.map(p => { const o = Object.assign({}, p); delete o.tank; return o; }),
        base: this.base,
        stage: this.stage.snapshot(),
      };
      ok = this.writeSave(data);
      this.saveMsg = this.saveMsgOf(ok, 'GAME SAVED');
    } else if (kind === 'ckpt' && this.ck && this.ck.mode === this.mode) {
      ok = this.writeSave(this.ck);
      this.saveMsg = this.saveMsgOf(ok, 'SAVED: ' + this.saveWhere(this.ck, true));
    } else this.saveMsg = kind === 'ckpt' ? "CAN'T SAVE HERE" : kind;
    return ok;
  },
  autoSave() { const k = this.saveKind(); if (k === 'exact' || (k === 'ckpt' && this.ck)) this.saveGame(); },

  // CONTINUE: the save of the mode picked on the title screen; one that can't be used is dropped
  loadGame(slot = this.titleSlot()) {
    const s = this.savePeek(slot);
    if (!s) return false;
    let r = false;
    try { r = s.stage ? this.loadExact(s) : this.loadCheckpoint(s); } catch (e) { r = false; }
    if (r === true) return true;
    this.dropSave(slot);
    this.stage = null; this.paused = false; this.ckResume = null; this.ck = null;
    this.toTitle(); this.titleY = 0;
    this.toast(r || 'SAVE TOO OLD');
    Sound.play('steel');
    return false;
  },

  // the whole stage as it was (CLASSIC, BIG MAPS)
  loadExact(s) {
    if (!Array.isArray(s.players) || !s.players.length || typeof s.stage.terrain !== 'string') return false;
    if (Net.role === 'host') Net.hangUp();
    Input.remote = {};
    const n = s.numPlayers || (s.twoP ? 2 : 1);
    this.twoP = n > 1;
    Input.numPlayers = n;
    this.players = s.players.map(p => Object.assign(newPlayer(p.i), p, { tank: null }));
    this.stageNum = Math.max(1, s.stageNum | 0);
    this.lastScores = s.lastScores || [0, 0];
    this.customPending = false;
    // the saved terrain only fits the field size it was saved with
    this.mode = s.mode || 'classic';
    this.applyLayout(s.stage.cols, s.stage.rows, s.stage.vcols, s.stage.vrows);
    this.base = Object.assign(newBase(), s.base || {});
    this.stage = new Stage(this.stageNum, LEVELS[(this.stageNum - 1) % LEVELS.length], this.players, { snapshot: s.stage, base: this.base });
    this.ck = null;
    this.paused = true;
    this.pauseIdx = 0;
    this.pauseMsg = 'GAME LOADED';
    this.pauseMsgT = 120;
    this.openH = SCREEN_H / 2;
    this.setState('play');
    return true;
  },

  // a checkpoint: the stage built again from its start (or from the wave, section or block in it), paused
  loadCheckpoint(s) {
    const P = s.players, g = s.g && typeof s.g === 'object' ? s.g : {};
    if (!CK_MODES.includes(s.mode) || !Array.isArray(P) || !P.length || P.length > 4 || !(s.stageNum >= 1)) return false;
    if (s.mode === 'custom' && !Customs.used().length) return 'NO CUSTOM LEVELS FOR IT';
    if (Net.role === 'host') Net.hangUp();
    Input.remote = {};
    AutoSkill.start();
    this.endDaily();
    this.mode = s.mode;
    const n = Math.max(1, Math.min(4, s.humans || P.filter(p => !p.bot).length || 1));
    this.twoP = n > 1;
    Input.numPlayers = n;
    this.players = P.map((p, i) => Object.assign(newPlayer(i), p, { i, tank: null, tdMenu: null }));
    this.base = Object.assign(newBase(), s.base || {});
    this.stageNum = s.stageNum | 0;
    this.lastScores = Array.isArray(s.lastScores) ? s.lastScores : this.players.map(p => p.score);
    this.customPending = false; this.shopDiscount = false;
    this.vsWins = []; this.round = 1; this.taFrames = 0; this.taCleared = 0;
    for (const k of CK_GAME_KEYS) if (g[k] !== undefined) this[k] = g[k];
    if (this.mode === 'fortress') this.tdMap = Math.max(0, Math.min(TD_MAPS.length - 1, this.tdMap | 0));
    if (this.mode === 'race') this.raceTarget = this.raceTarget || Config.get('raceTarget');
    if (this.mode === 'galaxy') {
      this.gxFresh = false; this.gxRun = GXD_NAMES[this.gxRun] ? this.gxRun : 'campaign'; this.gxClock = this.gxClock || 0;
      this.gxDate = this.gxDate || gxdToday();
      if (!this.gxEndless || !Array.isArray(this.gxEndless.order)) this.gxEndless = { order: [] };
    }
    this.ckResume = s.at && typeof s.at === 'object' ? s.at : null;
    this.noBossIntro = true;
    this.applyLayout();
    this.beginStage();
    this.paused = true;
    this.pauseIdx = 0;
    this.pauseMsg = 'LOADED: ' + this.saveWhere(s, true);
    this.pauseMsgT = 150;
    return true;
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
    if (this.mode === 'coop') this.mode = 'cpu';   // CO-OP VS CPU: everyone together against the enemy HQ
    if (this.mode === 'eagles' && n < 2) this.mode = 'cpu';
    else if ((this.mode === 'dm' || this.mode === 'race') && n < 2) for (let i = 1; i <= DM_BOTS; i++) this.players.push(Object.assign(newPlayer(i), { bot: true }));   // bots.js
    else if (modeInfo(this.mode).vs && n < 2) this.mode = 'classic';
    this.vsWins = []; this.round = 1; this.taFrames = 0; this.taCleared = 0;
    this.toCurtain(!custom && (this.mode === 'classic' || this.mode === 'bigmaps'));
    if (['timeattack', 'corridor', 'cpu', 'race', 'custom', 'sides', 'maze', 'fortress', 'galaxy'].includes(this.mode)) this.stageNum = 1;
    else if (this.mode !== 'classic') this.stageNum = 1 + Math.floor(Math.random() * LEVELS.length);
    // KILL RACE: the first curtain picks how many points win the game (race.js)
    if (this.mode === 'race') { this.raceTarget = Config.get('raceTarget'); this.curtain.raceSel = true; for (const p of this.players) p.racePts = 0; }
    // FORTRESS: the first curtain picks the map (fortress.js)
    if (this.mode === 'fortress') { this.tdMap = Math.max(0, Math.min(TD_MAPS.length - 1, STORE.get('tank1990_tdmap', 0) | 0)); if (!tdUnlocked(this.tdMap)) this.tdMap = 0; this.curtain.tdSel = true; }
    // the mode's title screen first (intro.js)
    if (this.introWanted && this.introWanted(custom)) this.toModeIntro();
  },

  toCurtain(selectable) {
    Sound.setEngine(0);
    // ANY SIDE: the edge the eagle will be on this time (sides2.js makes it the next one in turn)
    if (this.mode === 'sides') this.nextSide = ['left', 'right', 'top'][rnd(3)];
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
    if (c.tdSel) {
      const dir = m.up || m.right ? 1 : m.down || m.left ? -1 : 0;
      if (dir) { this.tdMap = (this.tdMap + dir + TD_MAPS.length) % TD_MAPS.length; STORE.set('tank1990_tdmap', this.tdMap); Sound.play('select'); }
      if (m.ok && this.t > 10) { if (tdUnlocked(this.tdMap)) { c.tdSel = false; this.beginStage(); } else Sound.play('steel'); }   // the campaign: win a map to open the next
      if (m.back) this.toTitle();
    } else if (c.raceSel) {
      const dir = m.up || m.right ? 1 : m.down || m.left ? -1 : 0;
      if (dir) { Config.step('raceTarget', dir); this.raceTarget = Config.get('raceTarget'); Sound.play('select'); }
      if (m.ok) { c.raceSel = false; this.beginStage(); }
      if (m.back) this.toTitle();
    } else if (c.selectable) {
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
      const race = this.mode === 'race';
      Font.draw(ctx, this.mode === 'cpu' || race ? 'ROUND' : this.mode === 'maze' ? 'MAZE' : this.mode === 'fortress' ? 'FORTRESS' : this.mode === 'galaxy' ? 'SECTOR' : 'STAGE', cx - (this.mode === 'fortress' ? 31 : 32), cy - 8, COL.black);
      if (this.mode === 'galaxy') Font.drawCenter(ctx, GX_SECTORS[(this.stageNum - 1) % GX_SECTORS.length].name, cx, cy + 14, '#A00000');
      if (this.mode !== 'fortress') Font.drawRight(ctx, race ? this.round : this.stageNum, cx + 32, cy - 8, COL.black);
      if (race) {
        Font.drawCenter(ctx, 'MOST KILLS WINS THE ROUND', cx, cy + 14, '#A00000');
        Font.drawCenter(ctx, 'FIRST TO ' + this.raceTarget + (this.raceTarget > 1 ? ' POINTS' : ' POINT'), cx, cy + 28, c.raceSel ? COL.black : '#3C3C3C');
        if (c.raceSel && (this.t >> 4) & 1) Font.drawCenter(ctx, '< SELECT >', cx, cy + 42, '#3C3C3C');
      }
      // against the computer: what their HQ got for this round
      if (this.mode === 'maze') Font.drawCenter(ctx, 'FIND THE EXIT', cx, cy + 14, '#A00000');
      if (this.mode === 'fortress') {
        const mp = TD_MAPS[this.tdMap], best = (STORE.get(MODE_KEY, {}).fortress || {})[mp.key];
        Font.drawCenter(ctx, (this.tdMap + 1) + '. ' + mp.name + ' (' + mp.diff + ')', cx, cy + 14, '#A00000');
        if (!tdUnlocked(this.tdMap)) Font.drawCenter(ctx, 'LOCKED: WIN ' + TD_MAPS[this.tdMap - 1].name, cx, cy + 26, '#3C3C3C');
        else Font.drawCenter(ctx, best ? (best.stars ? '*'.repeat(best.stars) + ' ' : '') + 'BEST WAVE ' + best.wave + '/' + mp.waves : 'HOLD ' + mp.waves + ' WAVES', cx, cy + 26, '#3C3C3C');
        if ((this.t >> 4) & 1) Font.drawCenter(ctx, '< SELECT >', cx, cy + 40, '#3C3C3C');
      }
      if (this.mode === 'sides' && this.nextSide) Font.drawCenter(ctx, 'YOUR EAGLE: ' + this.nextSide.toUpperCase(), cx, cy + 24, '#A00000');
      if (this.mode === 'custom' && !this.customPending) {
        const used = Customs.used();
        Font.drawCenter(ctx, 'YOUR LEVEL ' + (used[(this.stageNum - 1) % used.length] + 1), cx, cy + 14, '#3C3C3C');
      }
      if (this.mode === 'cpu') {
        const news = cpuNews(this.stageNum);
        if (news.length) Font.drawCenter(ctx, 'ENEMY HQ UPGRADED', cx, cy + 14, '#A00000');
        news.forEach((t, i) => Font.drawCenter(ctx, t, cx, cy + 26 + i * 10, '#3C3C3C'));
        if (this.stageNum === 1) Font.drawCenter(ctx, 'DESTROY THE ENEMY HQ', cx, cy + 14, '#A00000');
      }
      // bosses come only in classic (as in beginStage): no boss name on other modes' curtains
      const boss = this.mode === 'classic' && !this.customPending ? bossForStage(this.stageNum) : null;
      if (boss) Font.drawCenter(ctx, BOSSES[boss.idx].kind === 'galya' ? 'BOSS: ???' : (BOSSES[boss.idx].kind === 'ufo' ? 'FINAL BOSS: ' : 'BOSS: ') + BOSSES[boss.idx].name, cx, cy + 10, '#A00000');
      // the season (when it's known in advance)
      let lvTheme;
      if (this.mode === 'custom' && !this.customPending) { const u = Customs.used(); lvTheme = Customs.level(u[(this.stageNum - 1) % u.length]).theme; }
      else if (this.customPending) lvTheme = this.customTheme;
      else if (this.mode === 'fortress' && Config.get('seasons') !== 'OFF') lvTheme = TD_MAPS[this.tdMap || 0].theme;   // each fortress map has its own season
      if (lvTheme === 'auto') lvTheme = undefined;
      const ss = Config.get('seasons'), th = lvTheme ? THEMES[lvTheme] : ss === 'RANDOM' || ss === 'OFF' ? null : THEMES[stageTheme(this.stageNum)];
      if (th && th.name && !(this.mode === 'race' && c.raceSel)) {
        const fx = Config.on('seasonFx') && SEASON_FX_NAME[lvTheme || stageTheme(this.stageNum)];   // its twist (seasonal.js)
        Font.drawCenter(ctx, th.name + (fx ? ': ' + fx : ''), cx, cy - 36, '#3C3C3C');
      }
      const wx = !this.customPending && this.mode !== 'custom' && stageWeather(this.stageNum, !!boss);
      if (wx) Font.drawCenter(ctx, wx === 'night' ? 'NIGHT' : 'FOG', cx, cy + (boss ? 34 : c.selectable ? 24 : 10), wx === 'night' ? '#00006C' : '#ADADAD');
      if (Config.get('skill') !== 2) Font.drawCenter(ctx, Config.skill().name, cx, cy - 24, '#3C3C3C');
      if (c.selectable && (this.t >> 4) & 1) Font.drawCenter(ctx, '< SELECT >', cx, cy + (boss ? 24 : 12), '#3C3C3C');
    }
  },

  // stages you can pick: the 35 maps, or up to the furthest stage you have reached
  stageLimit() { return Math.max(LEVELS.length, Math.min(99, STORE.get('tank1990_bestStage', 1) | 0)); },

  beginStage() {
    // what RESTART ROUND (pause menu) goes back to
    const keep = o => JSON.parse(JSON.stringify(o)), resume = this.ckResume || null;
    this.ckResume = null;
    this.roundSave = { players: this.players.map(p => keep(Object.assign({}, p, { tank: null }))), base: keep(this.base),
      customPending: this.customPending, taFrames: this.taFrames, taCleared: this.taCleared, resume };
    // the checkpoint SAVE GAME writes in most modes: how things stand as the stage begins (see saveGame)
    this.ck = this.saveKind() === 'ckpt' ? this.ckTake(resume) : null;
    let map, custom = false, theme, lv = null;
    if (this.customPending) { map = this.custom; custom = true; this.customPending = false; theme = this.customTheme; lv = this.customLevel; }
    else if (this.mode === 'custom') {
      // CUSTOM LEVELS: your saved levels in turn (editor.js), on the classic field they were made for (or their own)
      const used = Customs.used();
      lv = Customs.level(used[(this.stageNum - 1) % used.length]);
      map = lv.blocks; custom = true; theme = lv.theme;
      this.applyLayout(13, 13);
    } else map = LEVELS[(this.stageNum - 1) % LEVELS.length];
    if (theme === 'auto') theme = undefined;   // the stage's usual season
    const boss = custom || this.mode !== 'classic' ? null : bossForStage(this.stageNum);
    if (boss) map = BOSS_ARENAS[boss.idx];
    const vs = modeInfo(this.mode).vs ? this.mode : null;
    // big scrolling maps: every stage in BIG MAPS, every 4th classic stage with BIG MAP STAGES on
    const big = !custom && !boss && (this.mode === 'bigmaps'
      || (this.mode === 'classic' && !this.daily && Config.get('bigStages') === 'SOME' && this.stageNum % 4 === 0));
    let blocks = null, objective = null, maze = null, fortress = null, galaxy = 0;
    // a level with a size, markers or rules of its own (editor2.js); older ones play as they always did
    const cl = custom ? this.customSetup(lv) : null;
    if (cl) blocks = lv.blocks;
    const corridor = !custom && this.mode === 'corridor';
    if (!custom && this.mode === 'galaxy') {
      // GALAXY: open space, the usual field size (galaxy.js)
      this.applyLayout();
      galaxy = this.stageNum;
    } else if (!custom && this.mode === 'fortress') {
      // FORTRESS: the chosen map, a little bigger than the screen (fortress.js)
      const [vc, vr] = this.desiredField(), mp = TD_MAPS[this.tdMap || 0], md = tdMapBlocks(mp);
      setFieldSize(TD_W, TD_H, vc, vr);
      blocks = md.blocks;
      fortress = { map: mp.key, spawns: md.spawns };
      if (Config.get('seasons') !== 'OFF') theme = mp.theme;
    } else if (!custom && this.mode === 'maze') {
      // MAZE: a fresh labyrinth, bigger every stage (maze.js)
      const [vc, vr] = this.desiredField(), [MW, MH] = mazeCells(this.stageNum, vc, vr);
      setFieldSize(MW * MAZE_PITCH + 1, MH * MAZE_PITCH + 1, vc, vr);
      maze = mazeLayout(MW, MH);
      blocks = maze.blocks;
    } else if (corridor) {
      // the usual width, at least three sections high (one more than the screen needs above and below)
      const [vc, vr] = this.desiredField(), rows = Math.max(3, Math.ceil((vr + 26) / CORRIDOR_SECTION)) * CORRIDOR_SECTION;
      setFieldSize(vc, rows, vc, vr);
      blocks = corridorBlocks(rows / CORRIDOR_SECTION);
    } else if (big) {
      const [vc, vr] = this.desiredField(), [SX, SY] = bigWorldSize(vc, vr);
      setFieldSize(SX * SECTOR, SY * SECTOR, vc, vr);
      blocks = bigWorldBlocks(this.stageNum, SX, SY);
      objective = Math.floor(this.stageNum / (this.mode === 'bigmaps' ? 1 : 4)) % 2 ? 'outposts' : 'factories';
    } else if (!custom && this.mode === 'survival') {
      // SURVIVAL: one map a little bigger than the screen for the whole run, the same after a reload (survival.js)
      const [vc, vr] = this.desiredField(), sv = resume && resume.sv;
      this.svRun = sv ? { seed: sv.seed, map: sv.map, theme: sv.theme } : svNewRun();
      setFieldSize(sv ? sv.cols : vc + SV_GROW, sv ? sv.rows : vr + SV_GROW, vc, vr);
      map = LEVELS[this.svRun.map % LEVELS.length];
      if (this.svRun.theme) theme = this.svRun.theme;
    } else if (!custom && this.mode === 'sides') {
      // ANY SIDE: the classic field, turned so the eagle's edge is the chosen one, with the stage's twist (sides2.js)
      blocks = this.sidesLayout(map);
    } else if (!custom) this.applyLayout();
    this.stage = new Stage(this.stageNum, map, this.players, {
      custom, boss, base: vs || corridor || maze || fortress || galaxy || this.mode === 'race' || this.mode === 'survival' ? newBase() : this.base, corridor, maze, fortress, galaxy, cpu: this.mode === 'cpu' && !custom ? this.stageNum : 0,
      race: this.mode === 'race' && !custom ? { target: this.raceTarget, round: this.round } : null, vs, survival: this.mode === 'survival', timeAttack: this.mode === 'timeattack',
      blocks, big: objective, theme, cl,
    });
    // a loaded checkpoint from further in: on to its wave, section or block
    if (resume) this.ckApply(resume);
    this.ckMark = null; this.ckMark = this.ckMarkOf(this.stage);
    this.paused = false;
    this.openH = SCREEN_H / 2;
    this.setState('play');
    // a boss stage: its picture first (bossart.js); the start jingle comes when the fight does
    const bossPic = boss && this.bossScreensWanted() && !this.noBossIntro;
    this.noBossIntro = false;
    if (bossPic) this.toBossIntro(); else Sound.play('start');
    this.autoSave();   // at every stage start
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
      if (PM[this.pauseIdx] === 'SKILL' && (m.left || m.right)) this.pauseSkill(m.right ? 1 : -1);
      const ps = PAUSE_STEP[PM[this.pauseIdx]];
      if (ps && (m.left || m.right)) { Config.step(ps, m.right ? 1 : -1); Sound.play('select'); }
      if (Input.anyJust(['KeyP', 'Escape'])) this.paused = false;
      else if (m.ok) this.pauseAction(PM[this.pauseIdx]);
      return;
    }
    this.stage.update();
    this.ckPoll();
    if (this.mode === 'timeattack' && !this.stage.over && !this.stage.clearTimer) this.taFrames++;
    const r = this.stage.result;
    if (r === 'vsRound') { this.vsRoundEnd(); return; }
    if (r === 'clear' && this.mode === 'race') { this.saveHi(); this.raceRoundEnd(); return; }
    if (r && this.mode === 'timeattack' && r === 'clear') { this.saveHi(); this.taNext(); return; }
    if (r === 'gameover') AutoSkill.event('gameOver');
    if (r === 'gameover' && (this.mode === 'survival' || this.mode === 'timeattack' || this.mode === 'corridor' || this.mode === 'cpu' || this.mode === 'maze' || this.mode === 'fortress' || this.mode === 'galaxy')) { this.saveHi(); this.toModeResult(false); return; }
    // GALAXY: a sector cleared: the hangar, then the next one (galaxy.js)
    if (r === 'clear' && this.mode === 'galaxy') {
      this.saveHi(); this.lastScores = this.players.map(p => p.score); this.stageNum++;
      if (Config.on('shop') && this.players.some(p => !p.out)) this.toShop(); else this.toCurtain(false);
      return;
    }
    if (r === 'tdwin' || r === 'svwin') { this.saveHi(); this.toModeResult(true); return; }   // FORTRESS held, SURVIVAL's 100 waves
    if (this.stage.result) {
      // beating a boss earns 25% off in the next shop
      this.shopDiscount = this.stage.result === 'clear' && this.stage.bossIdx !== undefined;
      this.saveHi();
      // a boss beaten: its victory picture first (bossart.js)
      if (this.stage.result === 'clear' && this.stage.bossDefeated && this.bossScreensWanted()) { this.toBossOutro(); return; }
      this.toScore(this.stage.result === 'gameover');
    }
  },

  // the difficulty, from the pause menu: enemies already out keep their speed, everything else follows at once
  pauseSkill(dir) {
    Config.step('skill', dir);
    AutoSkill.cache = null;
    if (Config.get('skill') === AUTO_SKILL) AutoSkill.load();
    Sound.play('select');
  },

  pauseAction(action) {
    if (action === 'CONTINUE') this.paused = false;
    else if (action === 'SKILL') this.pauseSkill(1);
    else if (PAUSE_STEP[action]) { Config.step(PAUSE_STEP[action], 1); Sound.play('select'); }
    else if (action === 'SAVE GAME') {
      const ok = this.saveGame();
      this.pauseMsg = this.saveMsg;
      this.pauseMsgT = 120;
      Sound.play(ok ? 'pickup' : 'steel');
    } else if (action === 'RESTART ROUND' || action === 'RESTART WAVE') {
      // press twice: it throws away the round so far
      if (this.pauseMsg !== 'PRESS AGAIN TO RESTART' || this.pauseMsgT <= 0) { this.pauseMsg = 'PRESS AGAIN TO RESTART'; this.pauseMsgT = 120; Sound.play('select'); return; }
      this.pauseMsgT = 0;
      this.restartRound();
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

  // back to how things stood when the stage began (FORTRESS: the start of the current wave's build phase)
  restartRound() {
    if (this.mode === 'fortress' && this.stage && this.stage.tdRestartWave()) { this.paused = false; Sound.play('start'); return; }
    const sv = this.roundSave;
    if (!sv) return;
    this.players.forEach((p, i) => Object.assign(p, JSON.parse(JSON.stringify(sv.players[i])), { tank: null }));
    this.base = JSON.parse(JSON.stringify(sv.base));
    this.customPending = sv.customPending; this.taFrames = sv.taFrames; this.taCleared = sv.taCleared; this.ckResume = sv.resume;
    this.noBossIntro = true;   // you've seen it
    this.beginStage();
  },

  renderPlay(ctx) {
    this.stage.render(ctx);
    // time attack: the clock, in the border above the field
    if (this.mode === 'timeattack') Font.drawCenter(ctx, fmtTime(this.taFrames) + '  STAGE ' + (this.taCleared + 1) + '/' + TA_STAGES, SCREEN_W / 2, 0, COL.black);
    if (this.paused) {
      // centred on the window onto the field (big maps and the corridor are bigger than the screen)
      const PM = pauseMenu(), w = Math.min(VIEW_W - 4, 200), h = 28 + PM.length * 12;
      const x = FX + ((VIEW_W - w) >> 1), y = FY + ((VIEW_H - h) >> 1);
      ctx.fillStyle = COL.black;
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = COL.lgrey;
      ctx.fillRect(x, y, w, 1); ctx.fillRect(x, y + h - 1, w, 1); ctx.fillRect(x, y, 1, h); ctx.fillRect(x + w - 1, y, 1, h);
      Font.drawCenter(ctx, 'PAUSE', x + w / 2, y + 6, COL.orange);
      PM.forEach((label, i) => {
        const ly = y + 22 + i * 12, sel = i === this.pauseIdx;
        Font.draw(ctx, label, x + 20, ly, COL.white);
        if (sel) Font.draw(ctx, '>', x + 8, ly, COL.gold);
        if (label === 'SKILL') {
          // the skill's name, in its colour, with arrows while selected
          const v = Config.format('skill');
          Font.drawRight(ctx, v, x + w - 14, ly, SKILL_TAGS[Config.get('skill')][1]);
          if (sel) { Font.draw(ctx, '<', x + w - 14 - v.length * 8 - 9, ly, COL.white); Font.draw(ctx, '>', x + w - 11, ly, COL.white); }
        }
        if (PAUSE_STEP[label]) {
          const v = Config.format(PAUSE_STEP[label]);
          Font.drawRight(ctx, v, x + w - 14, ly, label === 'MUSIC' && !Config.on('music') ? COL.lgrey : COL.gold);
          if (sel) { Font.draw(ctx, '<', x + w - 14 - v.length * 8 - 9, ly, COL.white); Font.draw(ctx, '>', x + w - 11, ly, COL.white); }
        }
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
    // Enter / fire: the whole tally at once, and again to go straight on
    if (this.t > 10 && Input.menu().ok) {
      if (sc.phase === 'rows') { sc.row = sc.rows.length; sc.n = 0; sc.phase = 'total'; sc.wait = 0; Sound.play('tick'); }
      else if (sc.phase === 'done') sc.wait = 0;
    }
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
    this.renderScoreHint(ctx);
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
    if (sc.bonus < 0) this.renderScoreHint(ctx);
  },

  renderScoreHint(ctx) {
    if ((this.t >> 5) & 1) Font.drawCenter(ctx, this.sc.phase === 'rows' ? 'ENTER: SKIP' : 'ENTER: GO ON', SW / 2, 214, '#5C5C5C');
  },

  // ---------------------------------------------------------------- game modes
  startGame(n) {
    const mi = modeInfo(Config.get('gameMode'));
    if (mi.vs && !mi.cpu && n < 2) { this.toast('VERSUS NEEDS 2-4 PLAYERS'); Sound.play('steel'); return; }
    if (mi.key === 'custom' && !Customs.used().length) { this.toast('NO LEVELS YET: TRY CONSTRUCTION'); Sound.play('steel'); return; }
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
      // all 100 waves held beats getting to wave 100
      const b = rec.survival, lvl = o => o.wave + (o.won ? 1 : 0);
      if (!b || lvl(res) > lvl(b) || (lvl(res) === lvl(b) && score > b.score)) { rec.survival = { wave: res.wave, won: done, score }; res.won = done; res.newBest = true; }
      res.best = rec.survival;
    } else if (this.mode === 'cpu') {
      res.rounds = this.stageNum - 1;
      const b = rec.cpu;
      if (!b || res.rounds > b.rounds || (res.rounds === b.rounds && score > b.score)) { rec.cpu = { rounds: res.rounds, score }; res.newBest = true; }
      res.best = rec.cpu;
    } else if (this.mode === 'fortress') {
      const td = this.stage.td, all = rec.fortress || {}, b = all[td.map];
      res.map = td.map; res.wave = done ? td.waves : Math.max(0, td.wave - 1); res.stars = done ? td.stars : 0;
      if (!b || res.stars > (b.stars || 0) || (res.stars === (b.stars || 0) && (res.wave > b.wave || (res.wave === b.wave && score > b.score)))) { all[td.map] = { wave: res.wave, stars: res.stars, score }; res.newBest = true; }
      rec.fortress = all; res.best = all[td.map];
    } else if (this.mode === 'galaxy') {
      res.level = this.stageNum; res.wave = this.stage && this.stage.galaxy ? this.stage.galaxy.wave : 0;
      const b = rec.galaxy;
      if (!b || res.level > b.level || (res.level === b.level && (res.wave > b.wave || (res.wave === b.wave && score > b.score)))) { rec.galaxy = { level: res.level, wave: res.wave, score }; res.newBest = true; }
      res.best = rec.galaxy;
    } else if (this.mode === 'maze') {
      res.escaped = this.stageNum - 1;
      const b = rec.maze;
      if (!b || res.escaped > b.escaped || (res.escaped === b.escaped && score > b.score)) { rec.maze = { escaped: res.escaped, score }; res.newBest = true; }
      res.best = rec.maze;
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

  // KILL RACE: the round's done; the most kills scores a point (race.js)
  raceRoundEnd() {
    const w = raceWinner(this.players);
    if (w >= 0) this.players[w].racePts = (this.players[w].racePts || 0) + 1;
    const final = w >= 0 && this.players[w].racePts >= this.raceTarget;
    this.vsRes = {
      mode: 'race', winner: w >= 0 ? this.players[w].i : -1, final, round: this.round, target: this.raceTarget,
      rows: this.players.map(p => Object.assign({ i: p.i, bot: !!p.bot, wins: p.racePts || 0 }, raceTally(p))),
    };
    Sound.setEngine(0);
    Sound.play(final ? 'bonus' : 'pickup');
    this.setState('vsResult');
  },

  updateVsResult() {
    if (this.t < 30 || !(Input.menu().ok || this.t > 600)) return;
    if (this.vsRes.final) { if (this.mode === 'race' && !Net.role) this.dropSave('race'); this.stage = null; this.toTitle(); this.titleY = 0; return; }
    this.round++;
    this.stageNum = this.stageNum % LEVELS.length + 1;
    for (const p of this.players) { p.out = false; p.vsKills = 0; }
    this.toCurtain(false);
  },

  renderVsResult(ctx) {
    const r = this.vsRes;
    ctx.fillStyle = COL.black;
    ctx.fillRect(0, 0, SW, SH);
    Font.drawCenter(ctx, modeInfo(r.mode).name + (r.mode === 'eagles' || r.mode === 'race' ? '  ROUND ' + r.round : ''), SW / 2, 30, COL.red);
    const msg = r.winner >= 0 ? playerName(r.rows.find(row => row.i === r.winner)) + ' ' + (r.final ? 'WINS THE MATCH!' : 'WINS THE ROUND') : 'DRAW!';
    if ((this.t >> 4) & 1 || this.t > 90) Font.drawCenter(ctx, msg, SW / 2, 60, COL.gold);
    if (r.mode === 'race') {
      // kills this round, and points towards the target
      Font.draw(ctx, 'KILLS', 136, 92, COL.lgrey);
      Font.draw(ctx, 'PTS', 200, 92, COL.lgrey);
      Font.drawCenter(ctx, 'FIRST TO ' + r.target, SW / 2, 76, COL.lgrey);
    } else Font.draw(ctx, r.mode === 'eagles' ? 'ROUNDS' : r.mode === 'dm' ? 'KILLS' : 'FLAGS', 136, 92, COL.lgrey);
    r.rows.forEach((row, k) => {
      const y = 110 + k * 18;
      ctx.drawImage(Sprites.playerIcon(Config.playerPal(row.i)), 48, y);
      Font.draw(ctx, playerName(row), 60, y, row.i === r.winner ? COL.gold : COL.white);
      if (r.mode === 'race') { Font.drawRight(ctx, row.kills, 176, y, COL.white); Font.drawRight(ctx, row.wins, 224, y, COL.gold); }
      else Font.drawRight(ctx, r.mode === 'eagles' ? row.wins : r.mode === 'dm' ? row.kills : row.caps, 184, y, COL.white);
    });
    if (this.t > 90) Font.drawCenter(ctx, r.final ? 'PRESS ENTER' : 'PRESS ENTER: NEXT ROUND', SW / 2, 200, COL.lgrey);
  },

  updateModeResult() {
    if (this.t > 60 && Input.menu().ok) {
      // a run won (FORTRESS held, TIME ATTACK or BOSS RUSH done): nothing left to go on with
      if (this.modeRes && this.modeRes.done && !Net.role && CK_MODES.includes(this.mode)) this.dropSave(this.saveSlotOf());
      this.stage = null; this.toTitle(); this.titleY = 0;
    }
  },

  renderModeResult(ctx) {
    const r = this.modeRes;
    ctx.fillStyle = COL.black;
    ctx.fillRect(0, 0, SW, SH);
    Font.drawCenter(ctx, modeInfo(r.mode).name, SW / 2, 40, COL.red);
    if (r.mode === 'survival') {
      Font.drawCenter(ctx, r.done ? 'ALL ' + r.wave + ' WAVES HELD!' : 'YOU HELD OUT TO WAVE ' + r.wave, SW / 2, 80, r.done ? COL.gold : COL.white);
      Font.drawCenter(ctx, 'SCORE ' + r.score, SW / 2, 100, COL.white);
      Font.drawCenter(ctx, 'BEST: ' + (r.best.won ? 'ALL ' + r.best.wave + ' WAVES' : 'WAVE ' + r.best.wave) + '  ' + r.best.score, SW / 2, 124, COL.lgrey);
    } else if (r.mode === 'cpu') {
      Font.drawCenter(ctx, r.rounds === 1 ? 'YOU WON 1 ROUND' : 'YOU WON ' + r.rounds + ' ROUNDS', SW / 2, 80, COL.white);
      Font.drawCenter(ctx, 'SCORE ' + r.score, SW / 2, 100, COL.white);
      Font.drawCenter(ctx, 'BEST: ' + r.best.rounds + ' ROUNDS  ' + r.best.score, SW / 2, 124, COL.lgrey);
    } else if (r.mode === 'fortress') {
      const name = (TD_MAPS.find(m => m.key === r.map) || TD_MAPS[0]).name;
      Font.drawCenter(ctx, r.done ? name + ' HELD! ' + '*'.repeat(r.stars) : name + ': FELL AFTER ' + r.wave + (r.wave === 1 ? ' WAVE' : ' WAVES'), SW / 2, 80, r.done ? COL.gold : COL.white);
      Font.drawCenter(ctx, 'SCORE ' + r.score, SW / 2, 100, COL.white);
      Font.drawCenter(ctx, 'BEST: ' + (r.best.stars ? '*'.repeat(r.best.stars) + ' ' : '') + 'WAVE ' + r.best.wave + '  ' + r.best.score, SW / 2, 124, COL.lgrey);
    } else if (r.mode === 'galaxy') {
      const wv = w => (w > GX_WAVES ? 'THE BOSS' : 'WAVE ' + Math.max(1, w));
      Font.drawCenter(ctx, 'SECTOR ' + r.level + ', ' + wv(r.wave), SW / 2, 80, COL.white);
      Font.drawCenter(ctx, 'SCORE ' + r.score, SW / 2, 100, COL.white);
      Font.drawCenter(ctx, 'BEST: SECTOR ' + r.best.level + ' ' + wv(r.best.wave) + '  ' + r.best.score, SW / 2, 124, COL.lgrey);
    } else if (r.mode === 'maze') {
      Font.drawCenter(ctx, r.escaped === 1 ? 'YOU ESCAPED 1 MAZE' : 'YOU ESCAPED ' + r.escaped + ' MAZES', SW / 2, 80, COL.white);
      Font.drawCenter(ctx, 'SCORE ' + r.score, SW / 2, 100, COL.white);
      Font.drawCenter(ctx, 'BEST: ' + r.best.escaped + ' MAZES  ' + r.best.score, SW / 2, 124, COL.lgrey);
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

  // ---------------------------------------------------------------- construction: see editor.js

  // ---------------------------------------------------------------- shop
  toShop() {
    Sound.setEngine(0);
    // fallen players get a turn too, to buy themselves back in
    this.shop = { order: this.players.filter(p => !p.out || reviveCost()), turn: 0, idx: 0, scroll: 0, rep: 0, msg: '', msgT: 0 };
    this.setState('shop');
  },

  shopMove(dir) {
    const sh = this.shop, n = shopItems().length;
    sh.idx = (sh.idx + dir + n) % n;
    if (sh.idx < sh.scroll) sh.scroll = sh.idx;
    if (sh.idx >= sh.scroll + SHOP_ROWS) sh.scroll = sh.idx - SHOP_ROWS + 1;
  },

  shopBuy() {
    const sh = this.shop, p = sh.order[sh.turn], item = shopItems()[sh.idx];
    if (item.id === 'done') { this.shopNext(); return; }
    const price = shopPrice(item, p), st = shopStatus(item, p);
    if (st.max) {
      sh.msg = item.id === 'revive' ? (reviveCost() ? 'NOBODY TO REVIVE' : 'REVIVE IS OFF') : p.out ? 'REVIVE FIRST' : st.text === 'N/A' ? 'NO EAGLE IN THE MAZE' : 'YOU ALREADY HAVE IT';
      sh.msgT = 90; Sound.play('steel'); return;
    }
    if (wallet(p) < price) { sh.msg = this.mode === 'galaxy' ? 'NOT ENOUGH CREDITS' : 'NOT ENOUGH POINTS'; sh.msgT = 90; Sound.play('steel'); return; }
    spend(p, price);
    shopApply(item, p);
    sh.msg = 'BOUGHT ' + item.name + (item.weapon && item.weapon !== 'cannon' ? ' MK ' + MK[p.wlv[item.weapon] - 1] : '');
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
    const shopName = this.mode === 'galaxy' ? 'HANGAR' : 'SHOP';
    Font.drawCenter(ctx, this.shopDiscount ? shopName + '  BOSS BONUS -25%' : shopName, SW / 2, 6, COL.red);
    ctx.drawImage(Sprites.rankTank('p' + p.level, (this.t >> 3) & 1, 1, Config.playerPal(p.i), Config.xpOn() ? p.rank : 1, true), 6, 15);
    Font.draw(ctx, ROMAN[p.i] + '-PLAYER', 26, 20, COL.red);
    Font.drawRight(ctx, wallet(p), 214, 20, COL.gold);
    Font.draw(ctx, this.mode === 'galaxy' ? 'CR' : 'PTS', 220, 20, COL.white);   // the hangar takes credits (galaxy_tune.js)
    for (let r = 0; r < SHOP_ROWS; r++) {
      const i = sh.scroll + r, item = shopItems()[i];
      if (!item) break;
      const y = SHOP_TOP + r * SHOP_ROW_H;
      if (i === sh.idx) { ctx.fillStyle = '#20206C'; ctx.fillRect(4, y - 4, SW - 8, SHOP_ROW_H); }
      if (item.id === 'done') {
        Font.draw(ctx, item.name + ' ' + this.stageNum, 34, y, COL.white);
        continue;
      }
      if (item.gxShop) gxShopIcon(ctx, item, 12, y - 4); else if (item.base) ctx.drawImage(Sprites.baseIcons[item.bicon], 12, y - 4); else drawPowerup(ctx, { type: item.icon, weapon: item.weapon }, 12, y - 4);
      const price = shopPrice(item, p), st = shopStatus(item, p);
      Font.draw(ctx, item.name, 34, y, st.max ? COL.lgrey : COL.white);
      if (!st.max) Font.drawRight(ctx, price, 190, y, wallet(p) >= price ? COL.gold : '#7C3C3C');
      Font.drawRight(ctx, st.text, 250, y, COL.lgrey);
    }
    ctx.fillStyle = COL.lgrey;
    if (sh.scroll > 0) for (let k = 0; k < 4; k++) ctx.fillRect(SW / 2 - k, 30 + k, 1 + 2 * k, 1);
    if (sh.scroll + SHOP_ROWS < shopItems().length) for (let k = 0; k < 4; k++) ctx.fillRect(SW / 2 - 3 + k, SHOP_TOP + SHOP_ROWS * SHOP_ROW_H - 3 + k, 7 - 2 * k, 1);
    const item = shopItems()[sh.idx];
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
  // A menu tree built from SETTINGS_DEF (settingsTree): the top level lists the sections, each opens as a page;
  // st.stack holds the pages you came through, each with its own cursor.
  toSettings() {
    this.st = { stack: [{ node: settingsTree(), idx: 0, scroll: 0 }], rep: 0 };
    this.setState('settings');
  },

  settingsPage() { return this.st.stack[this.st.stack.length - 1]; },
  settingsItem() { const f = this.settingsPage(); return f.node.items[f.idx]; },

  // jump straight to a setting (its page, cursor on it)
  settingsOpen(key) {
    const find = (node, path) => {
      for (let i = 0; i < node.items.length; i++) {
        const it = node.items[i];
        if (it.key === key) return path.concat([{ node, idx: i }]);
        if (it.node) { const r = find(it.node, path.concat([{ node, idx: i }])); if (r) return r; }
      }
      return null;
    };
    this.toSettings();
    const path = find(this.st.stack[0].node, []);
    if (!path) return;
    this.st.stack = path.map(f => ({ node: f.node, idx: f.idx, scroll: Math.max(0, f.idx - SETTINGS_ROWS + 1) }));
  },

  settingsMove(dir) {
    const f = this.settingsPage(), n = f.node.items.length;
    f.idx = (f.idx + dir + n) % n;
    if (f.idx < f.scroll) f.scroll = f.idx;
    if (f.idx >= f.scroll + SETTINGS_ROWS) f.scroll = f.idx - SETTINGS_ROWS + 1;
  },

  // one level up (or out of the settings from the top)
  settingsBack() {
    if (this.st.stack.length > 1) { this.st.stack.pop(); Sound.play('select'); } else this.leaveSettings();
  },

  settingsActivate(dir) {
    const row = this.settingsItem();
    if (row.node) {
      this.st.stack.push({ node: row.node, idx: 0, scroll: 0 });
      Sound.play('select');
    } else if (row.action === 'up') {
      this.settingsBack();
    } else if (row.key) {
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
    const item = this.settingsItem();
    if (d === 0) { this.settingsMove(-1); Sound.play('select'); }
    if (d === 2) { this.settingsMove(1); Sound.play('select'); }
    if (d === 1 || d === 3) {
      if (item.key) this.settingsActivate(d === 1 ? 1 : -1);
      else if (item.node && tapped === 1) this.settingsActivate(1);   // right opens a page,
      else if (tapped === 3 && this.st.stack.length > 1) this.settingsBack();   // left goes back
    }
    if (m.ok) this.settingsActivate(1);
    else if (m.alt) { if (item.key) this.settingsActivate(-1); }
    else if (m.back) this.settingsBack();
  },

  renderSettings(ctx) {
    const st = this.st, f = this.settingsPage(), items = f.node.items, top = st.stack.length === 1;
    ctx.fillStyle = COL.black;
    ctx.fillRect(0, 0, SW, SH);
    if (top) {
      Font.drawCenter(ctx, 'SETTINGS', SW / 2, 8, COL.red);
      Font.drawRight(ctx, 'V' + APP_VERSION, 250, 8, '#505050');
    } else {
      // where you are: the page title, with the way back
      Font.draw(ctx, '<', 6, 8, '#505050');
      Font.drawCenter(ctx, f.node.title, SW / 2, 8, COL.orange);
      if (f.node.enemy !== undefined) ctx.drawImage(Sprites.tank('e' + f.node.enemy, (this.t >> 3) & 1, 1, ENEMY[f.node.enemy].pal || 'silver'), 232, 4);
      if (f.node.title === 'WHO CAN COLLECT') Font.drawRight(ctx, '*NEW', 250, 8, COL.gold);
    }
    for (let r = 0; r < SETTINGS_ROWS; r++) {
      const i = f.scroll + r, row = items[i];
      if (!row) break;
      const y = SETTINGS_TOP + r * SETTINGS_ROW_H, sel = i === f.idx;
      if (sel) {
        ctx.fillStyle = '#20206C';
        ctx.fillRect(4, y - 2, SW - 8, 11);
      }
      if (row.node) {
        // a page: its name, a picture for enemy types, and an arrow
        Font.draw(ctx, row.label, 16, y, COL.white);
        if (row.enemy !== undefined) ctx.drawImage(Sprites.tank('e' + row.enemy, 0, 3, ENEMY[row.enemy].pal || 'silver'), 216, y - 4);
        Font.draw(ctx, '>', 241, y, sel ? COL.white : '#505050');
        continue;
      }
      if (row.action) {
        Font.draw(ctx, row.label, 16, y, row.action === 'reset' ? COL.red : row.action === 'back' || row.action === 'up' ? COL.white : COL.gold);
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
    if (f.scroll > 0) for (let k = 0; k < 4; k++) ctx.fillRect(SW / 2 - k, 19 + k - 3, 1 + 2 * k, 1);
    if (f.scroll + SETTINGS_ROWS < items.length) for (let k = 0; k < 4; k++) ctx.fillRect(SW / 2 - 3 + k, 205 + k, 7 - 2 * k, 1);
    // footer: what the selected power-up / enemy does, otherwise the controls
    const cur = items[f.idx];
    if (cur.powerup !== undefined) {
      drawPowerup(ctx, { type: cur.powerup }, 8, 207);
      Font.draw(ctx, POWERUPS[cur.powerup].desc, 28, 212, COL.white);
    } else if (cur.enemy !== undefined && ENEMY[cur.enemy].desc) {
      ctx.drawImage(Sprites.tank('e' + cur.enemy, (this.t >> 3) & 1, 1, ENEMY[cur.enemy].pal || 'silver'), 8, 207);
      Font.draw(ctx, ENEMY[cur.enemy].desc, 28, 212, COL.white);
    } else if (cur.key === 'aiStyle' || cur.key === 'aiMarks') {
      ['RUSH', 'HUNT', 'SNIPE'].forEach((w, i) => {
        ctx.fillStyle = AI_MARK[i + 1];
        ctx.fillRect(24 + i * 72, 213, 5, 5);
        Font.draw(ctx, w, 34 + i * 72, 212, COL.white);
      });
    } else {
      Font.drawCenter(ctx, cur.node ? 'ENTER OPEN   ESC BACK' : '<> CHANGE   ESC BACK', SW / 2, 212, COL.lgrey);
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
    if (this.state === 'construct') { this.constructPointer(x, y, false); return; }
    if (this.state === 'title' || this.state === 'settings' || this.state === 'shop') { x -= menuOX(); y -= menuOY(); }
    if (this.state === 'shop') {
      const r = Math.floor((y - SHOP_TOP + 4) / SHOP_ROW_H), i = this.shop.scroll + r;
      if (r < 0 || r >= SHOP_ROWS || !shopItems()[i]) return;
      if (i === this.shop.idx) this.shopBuy();
      else { this.shop.idx = i; Sound.play('select'); }
      return;
    }
    if (this.state === 'title' && this.titleY === 0) {
      const i = Math.floor((y - this.titleMenuY() + 4) / this.titleStep()) - this.titleSkip();
      if (i >= 0 && i < this.titleMenu().length && x > 56 && x < 200) {
        if (i === this.menuIdx) this.chooseMenu(i);
        else { this.menuIdx = i; Sound.play('select'); }
      }
    } else if (this.state === 'settings') {
      const f = this.settingsPage(), r = Math.floor((y - SETTINGS_TOP + 2) / SETTINGS_ROW_H);
      if (y < 20) { if (x < 40 && this.st.stack.length > 1) this.settingsBack(); else this.settingsMove(-1); return; }
      if (y > 204) { this.settingsMove(1); return; }
      const i = f.scroll + r, row = f.node.items[i];
      if (r < 0 || r >= SETTINGS_ROWS || !row) return;
      if (i !== f.idx && row.key) { f.idx = i; Sound.play('select'); return; }
      f.idx = i;
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
      case 'modeIntro': this.updateModeIntro(); break;
      case 'bossIntro': case 'bossOutro': this.updateBossScreen(); break;
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
    if (this.musicFrame) this.musicFrame();
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
      case 'modeIntro': this.renderModeIntro(ctx); break;
      case 'bossIntro': case 'bossOutro': this.renderBossScreen(ctx); break;
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
// start once every script is in (the galaxy files and others load after this one and the title may need them)
function boot() {
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
  // drag to paint in the editor
  canvas.addEventListener('pointermove', e => { if ((e.buttons & 1) && Game.state === 'construct') { const [x, y] = toScreen(e); Game.constructPointer(x, y, true); } });
  canvas.addEventListener('wheel', e => {
    if (Game.state !== 'settings' && Game.state !== 'shop' && Game.state !== 'construct') return;
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
    // FORTRESS can be fast-forwarded (pause menu -> SPEED)
    const STEP = BASE_STEP / Config.scale('gameSpeed') / (Game.state === 'play' && Game.mode === 'fortress' && !Game.paused ? Config.get('tdSpeed') : 1);
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
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
