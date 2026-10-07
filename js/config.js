'use strict';
// =====================================================================
//  Settings: definitions, defaults (= the classic game) and storage
// =====================================================================

// Player tank color presets: light, mid, dark (NES-style three-tone)
const TANK_COLORS = {
  YELLOW: ['#E8F860', '#F8A848', '#708800'],
  GREEN: ['#B8F8D8', '#00A844', '#005800'],
  BLUE: ['#B8D8F8', '#3C7CFC', '#0000A8'],
  CYAN: ['#C0FCFC', '#00C8D8', '#005860'],
  RED: ['#F8D0B0', '#E83C1C', '#7C0800'],
  PINK: ['#FCD0F0', '#F878C8', '#940084'],
  PURPLE: ['#E0C8FC', '#9C54FC', '#4428BC'],
  ORANGE: ['#FCE0A8', '#F87C00', '#7C3800'],
  WHITE: ['#FFFFFF', '#BCBCBC', '#505050'],
  BLACK: ['#9C9C9C', '#3C3C3C', '#101010'],
  GOLD: ['#FCF8A0', '#E4B800', '#7C5800'],
  OLIVE: ['#D8F878', '#88A818', '#304800'],
};

// All power-ups. The first 8 are the Tank 1990 originals; `isNew` ones are additions.
// weight = relative chance of appearing; desc is shown on the settings screen (max 28 chars).
const POWERUPS = [
  { name: 'HELMET', weight: 2, desc: 'SHIELD AGAINST ALL SHELLS' },
  { name: 'CLOCK', weight: 2, desc: 'FREEZES ALL ENEMY TANKS' },
  { name: 'SHOVEL', weight: 2, desc: 'STEEL WALLS AROUND EAGLE' },
  { name: 'STAR', weight: 3, desc: 'UPGRADES YOUR TANK' },
  { name: 'GRENADE', weight: 2, desc: 'DESTROYS TANKS ON SCREEN' },
  { name: 'TANK', weight: 1, desc: 'EXTRA LIFE' },
  { name: 'GUN', weight: 1, desc: 'MAX LEVEL + CUTS TREES' },
  { name: 'SHIP', weight: 1, desc: 'CROSS WATER, SOAKS A HIT' },
  { name: 'TURBO', weight: 2, isNew: true, desc: 'TANK MOVES MUCH FASTER' },
  { name: 'RAPID', weight: 2, isNew: true, desc: 'UP TO 4 SHELLS, FAST FIRE' },
  { name: 'SPREAD', weight: 2, isNew: true, desc: 'FIRES IN 3 DIRECTIONS' },
  { name: 'PIERCE', weight: 1, isNew: true, desc: 'SHELLS PIERCE TANKS+BRICK' },
  { name: 'ROCKET', weight: 1, isNew: true, desc: 'SHELLS EXPLODE IN A BLAST' },
  { name: 'MINES', weight: 2, isNew: true, desc: 'DROP MINES WITH B BUTTON' },
  { name: 'GHOST', weight: 1, isNew: true, desc: 'DRIVE THROUGH BRICK+WATER' },
  { name: 'COIN', weight: 2, isNew: true, desc: '1000 BONUS POINTS' },
];

// XP ranks: total XP needed for each level (1-10), and the perk it unlocks (descriptions max 22 chars)
const RANKS = [
  { name: 'RECRUIT', xp: 0, perk: 'NO PERKS YET' },
  { name: 'PRIVATE', xp: 100, perk: 'ENGINE +10%' },
  { name: 'CORPORAL', xp: 250, perk: 'FASTER RELOAD' },
  { name: 'SERGEANT', xp: 480, perk: 'SHELLS +20% FASTER' },
  { name: 'LIEUTENANT', xp: 800, perk: 'ARMOR PLATE' },
  { name: 'CAPTAIN', xp: 1200, perk: 'ENGINE +20%' },
  { name: 'MAJOR', xp: 1700, perk: 'EVERY LIFE GETS A STAR' },
  { name: 'COLONEL', xp: 2300, perk: 'RAPID RELOAD' },
  { name: 'GENERAL', xp: 3000, perk: 'DOUBLE ARMOR PLATE' },
  { name: 'MARSHAL', xp: 3800, perk: 'PLATES SELF-REPAIR' },
];

const pct = (...v) => v;
const PCTS = pct(25, 50, 75, 100, 125, 150, 175, 200, 250, 300);
const SECS = [0, 1, 2, 3, 4, 5, 6, 8, 10, 15, 20, 30, 45, 60];
const ONOFF = ['ON', 'OFF'];
const range = (a, b) => { const r = []; for (let i = a; i <= b; i++) r.push(i); return r; };

const fmtPct = v => v + '%';
const fmtSec = v => v + 'S';

// Each row: key, label (max 18 chars), list of values, default, optional formatter.
// A row with only `section` is a header; `action` rows run a command.
const SETTINGS_DEF = [
  { section: 'PLAYER' },
  { key: 'lives', label: 'LIVES', values: range(1, 9).concat(['INF']), def: 3 },
  { key: 'p1Color', label: 'I-PLAYER COLOR', values: Object.keys(TANK_COLORS), def: 'YELLOW', color: true },
  { key: 'p2Color', label: 'II-PLAYER COLOR', values: Object.keys(TANK_COLORS), def: 'GREEN', color: true },
  { key: 'p3Color', label: 'III-PLAYER COLOR', values: Object.keys(TANK_COLORS), def: 'BLUE', color: true },
  { key: 'p4Color', label: 'IV-PLAYER COLOR', values: Object.keys(TANK_COLORS), def: 'PINK', color: true },
  { key: 'pSpeed', label: 'TANK SPEED', values: PCTS, def: 100, fmt: fmtPct },
  { key: 'pShell', label: 'SHELL SPEED', values: PCTS, def: 100, fmt: fmtPct },
  { key: 'startStars', label: 'START STARS', values: [0, 1, 2, 3], def: 0 },
  { key: 'keepStars', label: 'KEEP STARS ON DEATH', values: ['OFF', 'ON'], def: 'OFF' },
  { key: 'spawnShield', label: 'SPAWN SHIELD', values: SECS, def: 3, fmt: fmtSec },
  { key: 'extraLife', label: 'EXTRA LIFE AT 20K', values: ['ONCE', 'EVERY', 'OFF'], def: 'ONCE' },
  { key: 'friendlyFire', label: 'FRIENDLY FIRE', values: ['FREEZE', 'OFF'], def: 'FREEZE' },

  { section: 'XP AND LEVELS' },
  { key: 'xp', label: 'XP AND LEVELS', values: ONOFF, def: 'ON' },
  { key: 'xpRate', label: 'XP RATE', values: PCTS, def: 100, fmt: fmtPct },
  { key: 'perks', label: 'LEVEL PERKS', values: ['ON', 'LOOKS ONLY'], def: 'ON' },
  { key: 'startLevel', label: 'START LEVEL', values: range(1, 10), def: 1 },
  { key: 'xpLoss', label: 'XP LOST ON DEATH', values: [0, 10, 25, 50], def: 0, fmt: fmtPct },
  { action: 'ranks', label: 'SHOW RANKS AND PERKS' },

  { section: 'ENEMIES' },
  { key: 'enemyCount', label: 'TANKS PER STAGE', values: range(1, 99), def: 20 },
  { key: 'maxOnScreen', label: 'MAX ON SCREEN', values: range(1, 20), def: 4 },
  { key: 'spawnRate', label: 'SPAWN RATE', values: PCTS, def: 100, fmt: fmtPct },
  { key: 'enemyFire', label: 'FIRE RATE', values: PCTS, def: 100, fmt: fmtPct },
  { key: 'enemyAim', label: 'BASE HUNTING', values: PCTS, def: 100, fmt: fmtPct },
  { key: 'bonusTanks', label: 'FLASHING TANKS', values: ONOFF, def: 'ON' },
  // MIXED: each tank gets a personality (wander, rush the eagle, hunt players, snipe); CLASSIC: all wander
  { key: 'aiStyle', label: 'AI PERSONALITIES', values: ['MIXED', 'CLASSIC', 'RUSH', 'HUNT', 'SNIPE'], def: 'MIXED' },
  { key: 'aiMarks', label: 'SHOW AI TYPE', values: ['OFF', 'ON'], def: 'OFF' },
  { key: 'newEnemies', label: 'NEW ENEMY TYPES', values: ['OFF', 'FEW', 'NORMAL', 'MANY'], def: 'NORMAL' },
  { key: 'enemyGrowth', label: 'VETERANS + ELITES', values: ONOFF, def: 'ON' },

  { section: 'BASIC TANK', enemy: 0 },
  { key: 'e0Speed', label: 'SPEED', values: PCTS, def: 100, fmt: fmtPct },
  { key: 'e0Shell', label: 'SHELL SPEED', values: PCTS, def: 100, fmt: fmtPct },
  { key: 'e0Hits', label: 'HITS TO DESTROY', values: range(1, 9), def: 1 },
  { section: 'FAST TANK', enemy: 1 },
  { key: 'e1Speed', label: 'SPEED', values: PCTS, def: 100, fmt: fmtPct },
  { key: 'e1Shell', label: 'SHELL SPEED', values: PCTS, def: 100, fmt: fmtPct },
  { key: 'e1Hits', label: 'HITS TO DESTROY', values: range(1, 9), def: 1 },
  { section: 'POWER TANK', enemy: 2 },
  { key: 'e2Speed', label: 'SPEED', values: PCTS, def: 100, fmt: fmtPct },
  { key: 'e2Shell', label: 'SHELL SPEED', values: PCTS, def: 100, fmt: fmtPct },
  { key: 'e2Hits', label: 'HITS TO DESTROY', values: range(1, 9), def: 1 },
  { section: 'ARMOR TANK', enemy: 3 },
  { key: 'e3Speed', label: 'SPEED', values: PCTS, def: 100, fmt: fmtPct },
  { key: 'e3Shell', label: 'SHELL SPEED', values: PCTS, def: 100, fmt: fmtPct },
  { key: 'e3Hits', label: 'HITS TO DESTROY', values: range(1, 9), def: 4 },
  { section: 'ROCKET TANK *', enemy: 4 },
  { key: 'e4Speed', label: 'SPEED', values: PCTS, def: 100, fmt: fmtPct, enemy: 4 },
  { key: 'e4Shell', label: 'SHELL SPEED', values: PCTS, def: 100, fmt: fmtPct, enemy: 4 },
  { key: 'e4Hits', label: 'HITS TO DESTROY', values: range(1, 9), def: 1, enemy: 4 },
  { key: 'e4On', label: 'APPEARS', values: ONOFF, def: 'ON', enemy: 4 },
  { section: 'SHIELD TANK *', enemy: 5 },
  { key: 'e5Speed', label: 'SPEED', values: PCTS, def: 100, fmt: fmtPct, enemy: 5 },
  { key: 'e5Shell', label: 'SHELL SPEED', values: PCTS, def: 100, fmt: fmtPct, enemy: 5 },
  { key: 'e5Hits', label: 'HITS TO DESTROY', values: range(1, 9), def: 2, enemy: 5 },
  { key: 'e5On', label: 'APPEARS', values: ONOFF, def: 'ON', enemy: 5 },
  { section: 'SAPPER TANK *', enemy: 6 },
  { key: 'e6Speed', label: 'SPEED', values: PCTS, def: 100, fmt: fmtPct, enemy: 6 },
  { key: 'e6Shell', label: 'SHELL SPEED', values: PCTS, def: 100, fmt: fmtPct, enemy: 6 },
  { key: 'e6Hits', label: 'HITS TO DESTROY', values: range(1, 9), def: 1, enemy: 6 },
  { key: 'e6On', label: 'APPEARS', values: ONOFF, def: 'ON', enemy: 6 },
  { section: 'SHADE TANK *', enemy: 7 },
  { key: 'e7Speed', label: 'SPEED', values: PCTS, def: 100, fmt: fmtPct, enemy: 7 },
  { key: 'e7Shell', label: 'SHELL SPEED', values: PCTS, def: 100, fmt: fmtPct, enemy: 7 },
  { key: 'e7Hits', label: 'HITS TO DESTROY', values: range(1, 9), def: 1, enemy: 7 },
  { key: 'e7On', label: 'APPEARS', values: ONOFF, def: 'ON', enemy: 7 },

  { section: 'MASON *', enemy: 8 },
  { key: 'e8Speed', label: 'SPEED', values: PCTS, def: 100, fmt: fmtPct, enemy: 8 },
  { key: 'e8Hits', label: 'HITS TO DESTROY', values: range(1, 9), def: 2, enemy: 8 },
  { key: 'e8On', label: 'APPEARS', values: ONOFF, def: 'ON', enemy: 8 },
  { section: 'MORTAR *', enemy: 9 },
  { key: 'e9Speed', label: 'SPEED', values: PCTS, def: 100, fmt: fmtPct, enemy: 9 },
  { key: 'e9Hits', label: 'HITS TO DESTROY', values: range(1, 9), def: 2, enemy: 9 },
  { key: 'e9On', label: 'APPEARS', values: ONOFF, def: 'ON', enemy: 9 },
  { section: 'SKIMMER *', enemy: 10 },
  { key: 'e10Speed', label: 'SPEED', values: PCTS, def: 100, fmt: fmtPct, enemy: 10 },
  { key: 'e10Hits', label: 'HITS TO DESTROY', values: range(1, 9), def: 1, enemy: 10 },
  { key: 'e10On', label: 'APPEARS', values: ONOFF, def: 'ON', enemy: 10 },
  { section: 'FLAMER *', enemy: 11 },
  { key: 'e11Speed', label: 'SPEED', values: PCTS, def: 100, fmt: fmtPct, enemy: 11 },
  { key: 'e11Hits', label: 'HITS TO DESTROY', values: range(1, 9), def: 2, enemy: 11 },
  { key: 'e11On', label: 'APPEARS', values: ONOFF, def: 'ON', enemy: 11 },
  { section: 'SPLITTER *', enemy: 12 },
  { key: 'e12Speed', label: 'SPEED', values: PCTS, def: 100, fmt: fmtPct, enemy: 12 },
  { key: 'e12Hits', label: 'HITS TO DESTROY', values: range(1, 9), def: 1, enemy: 12 },
  { key: 'e12On', label: 'APPEARS', values: ONOFF, def: 'ON', enemy: 12 },
  { section: 'MEDIC *', enemy: 13 },
  { key: 'e13Speed', label: 'SPEED', values: PCTS, def: 100, fmt: fmtPct, enemy: 13 },
  { key: 'e13Hits', label: 'HITS TO DESTROY', values: range(1, 9), def: 2, enemy: 13 },
  { key: 'e13On', label: 'APPEARS', values: ONOFF, def: 'ON', enemy: 13 },
  { section: 'JAMMER *', enemy: 14 },
  { key: 'e14Speed', label: 'SPEED', values: PCTS, def: 100, fmt: fmtPct, enemy: 14 },
  { key: 'e14Hits', label: 'HITS TO DESTROY', values: range(1, 9), def: 1, enemy: 14 },
  { key: 'e14On', label: 'APPEARS', values: ONOFF, def: 'ON', enemy: 14 },
  { section: 'SPOTTER *', enemy: 15 },
  { key: 'e15Speed', label: 'SPEED', values: PCTS, def: 100, fmt: fmtPct, enemy: 15 },
  { key: 'e15Hits', label: 'HITS TO DESTROY', values: range(1, 9), def: 1, enemy: 15 },
  { key: 'e15On', label: 'APPEARS', values: ONOFF, def: 'ON', enemy: 15 },

  { section: 'POWER-UPS' },
  { key: 'helmetTime', label: 'HELMET TIME', values: SECS.slice(1), def: 10, fmt: fmtSec },
  { key: 'clockTime', label: 'CLOCK TIME', values: SECS.slice(1), def: 10, fmt: fmtSec },
  { key: 'shovelTime', label: 'SHOVEL TIME', values: SECS.slice(5), def: 20, fmt: fmtSec },
  { key: 'newTime', label: 'NEW P-UP TIME', values: SECS.slice(5), def: 15, fmt: fmtSec },
  { key: 'mineCount', label: 'MINES PER PICKUP', values: range(1, 9), def: 3 },

  // who may collect each power-up: ANYONE (players and enemies), PLAYER only, or OFF (never appears)
  { section: 'WHO CAN COLLECT' },
  ...POWERUPS.map((pu, i) => ({
    key: 'pu' + i, label: pu.name + (pu.isNew ? ' *' : ''), values: ['ANYONE', 'PLAYER', 'OFF'], def: 'ANYONE', powerup: i,
  })),
  { action: 'classicPU', label: 'CLASSIC POWER-UPS ONLY' },
  { action: 'allPU', label: 'ALL POWER-UPS ON' },

  { section: 'BOSSES' },
  { key: 'bossRounds', label: 'BOSS ROUNDS', values: ONOFF, def: 'ON' },
  { key: 'bossEvery', label: 'BOSS EVERY', values: [5, 10, 15, 20, 25, 30], def: 10, fmt: v => v + ' ST' },
  { key: 'bossHp', label: 'BOSS HP', values: PCTS, def: 100, fmt: fmtPct },

  { section: 'SHOP' },
  { key: 'shop', label: 'SHOP AFTER STAGES', values: ONOFF, def: 'ON' },
  { key: 'shopPrices', label: 'SHOP PRICES', values: PCTS, def: 100, fmt: fmtPct },

  // field size in 16px tiles; FIT sizes it to the window's shape when a game starts
  { section: 'SCREEN' },
  { key: 'fieldW', label: 'FIELD WIDTH', values: range(13, 60).concat(['FIT']), def: 13 },
  { key: 'fieldH', label: 'FIELD HEIGHT', values: range(13, 40).concat(['FIT']), def: 13 },
  { key: 'scaling', label: 'SCALING', values: ['SHARP', 'FILL'], def: 'SHARP' },
  { key: 'controls', label: 'CONTROLS', values: ['AUTO', 'PC', 'MAC'], def: 'AUTO' },
  { action: 'keys', label: 'SET UP KEYS AND PADS' },
  { key: 'rumble', label: 'GAMEPAD RUMBLE', values: ONOFF, def: 'ON' },
  { action: 'fitScreen', label: 'FIT TO MY SCREEN' },
  { action: 'fullscreen', label: 'TOGGLE FULLSCREEN' },

  { section: 'GAME' },
  { key: 'gameSpeed', label: 'GAME SPEED', values: [50, 75, 100, 125, 150, 200], def: 100, fmt: fmtPct },
  { key: 'volume', label: 'VOLUME', values: [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100], def: 100, fmt: fmtPct },
  { key: 'engineSound', label: 'ENGINE SOUND', values: ONOFF, def: 'ON' },

  { action: 'reset', label: 'RESET TO DEFAULTS' },
  { action: 'back', label: 'BACK' },
];

const Config = {
  values: {},
  defs: {},

  init() {
    for (const d of SETTINGS_DEF) if (d.key) this.defs[d.key] = d;
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem('tank1990_settings') || '{}') || {}; } catch (e) { saved = {}; }
    this.reset(false);
    for (const k in saved) if (this.defs[k] && this.defs[k].values.includes(saved[k])) this.values[k] = saved[k];
    this.apply();
  },

  get(k) { return this.values[k]; },
  on(k) { return this.values[k] === 'ON'; },

  // step a setting forward/back through its value list
  step(k, dir) {
    const d = this.defs[k], i = d.values.indexOf(this.values[k]);
    const n = d.values.length;
    this.values[k] = d.values[(i + dir + n) % n];
    this.save();
    this.apply();
  },

  reset(save = true) {
    for (const k in this.defs) this.values[k] = this.defs[k].def;
    if (save) { this.save(); this.apply(); }
  },

  // power-up rules: can this kind of tank pick it up?
  canCollect(i, isPlayer) {
    const v = this.values['pu' + i];
    return v === 'ANYONE' || (isPlayer && v === 'PLAYER');
  },
  setPowerups(fn) {
    POWERUPS.forEach((pu, i) => { this.values['pu' + i] = fn(pu); });
    this.save();
  },

  isDefault(k) { return this.values[k] === this.defs[k].def; },

  format(k) {
    const d = this.defs[k], v = this.values[k];
    return d.fmt ? d.fmt(v) : String(v);
  },

  save() {
    try { localStorage.setItem('tank1990_settings', JSON.stringify(this.values)); } catch (e) { /* storage unavailable */ }
  },

  // push settings that live outside the game rules (palettes, audio)
  apply() {
    for (const name in TANK_COLORS) PALS['c_' + name] = [null].concat(TANK_COLORS[name]);
    if (typeof Sound !== 'undefined') Sound.applyVolume();
    if (typeof Game !== 'undefined' && Game.onResize) Game.onResize();
    if (typeof Input !== 'undefined' && Input.updateHelp) Input.updateHelp();
  },

  // ---- helpers used by the game rules
  playerPal(i) { return 'c_' + this.values['p' + (i + 1) + 'Color']; },
  startLives() { const v = this.values.lives; return v === 'INF' ? 2 : v - 1; },
  infiniteLives() { return this.values.lives === 'INF'; },
  frames(k) { return Math.round(this.values[k] * 60); },
  xpOn() { return this.values.xp === 'ON'; },
  scale(k) { return this.values[k] / 100; },
  // an enemy type's stats with its settings applied (types without a setting use the defaults)
  enemy(type) {
    const base = ENEMY[type], pct = k => (this.values[k] === undefined ? 1 : this.values[k] / 100);
    return {
      speed: base.speed * pct('e' + type + 'Speed'),
      bullet: base.bullet * pct('e' + type + 'Shell'),
      hp: this.values['e' + type + 'Hits'] === undefined ? base.hp : this.values['e' + type + 'Hits'],
      pts: base.pts,
    };
  },
};
