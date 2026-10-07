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
  { key: 'pSpeed', label: 'TANK SPEED', values: PCTS, def: 100, fmt: fmtPct },
  { key: 'pShell', label: 'SHELL SPEED', values: PCTS, def: 100, fmt: fmtPct },
  { key: 'startStars', label: 'START STARS', values: [0, 1, 2, 3], def: 0 },
  { key: 'keepStars', label: 'KEEP STARS ON DEATH', values: ['OFF', 'ON'], def: 'OFF' },
  { key: 'spawnShield', label: 'SPAWN SHIELD', values: SECS, def: 3, fmt: fmtSec },
  { key: 'extraLife', label: 'EXTRA LIFE AT 20K', values: ['ONCE', 'EVERY', 'OFF'], def: 'ONCE' },
  { key: 'friendlyFire', label: 'FRIENDLY FIRE', values: ['FREEZE', 'OFF'], def: 'FREEZE' },

  { section: 'ENEMIES' },
  { key: 'enemyCount', label: 'TANKS PER STAGE', values: [5, 10, 15, 20, 25, 30, 40, 50, 75, 99], def: 20 },
  { key: 'maxOnScreen', label: 'MAX ON SCREEN', values: range(1, 10), def: 4 },
  { key: 'spawnRate', label: 'SPAWN RATE', values: PCTS, def: 100, fmt: fmtPct },
  { key: 'enemyFire', label: 'FIRE RATE', values: PCTS, def: 100, fmt: fmtPct },
  { key: 'enemyAim', label: 'BASE HUNTING', values: PCTS, def: 100, fmt: fmtPct },
  { key: 'bonusTanks', label: 'FLASHING TANKS', values: ONOFF, def: 'ON' },
  { key: 'enemyPickup', label: 'ENEMY PICKUPS', values: ONOFF, def: 'ON' },

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

  { section: 'POWER-UPS' },
  { key: 'helmetTime', label: 'HELMET TIME', values: SECS.slice(1), def: 10, fmt: fmtSec },
  { key: 'clockTime', label: 'CLOCK TIME', values: SECS.slice(1), def: 10, fmt: fmtSec },
  { key: 'shovelTime', label: 'SHOVEL TIME', values: SECS.slice(5), def: 20, fmt: fmtSec },

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
  },

  // ---- helpers used by the game rules
  playerPal(i) { return 'c_' + this.values[i === 0 ? 'p1Color' : 'p2Color']; },
  startLives() { const v = this.values.lives; return v === 'INF' ? 2 : v - 1; },
  infiniteLives() { return this.values.lives === 'INF'; },
  frames(k) { return Math.round(this.values[k] * 60); },
  scale(k) { return this.values[k] / 100; },
  enemy(type) {
    const base = ENEMY[type];
    return {
      speed: base.speed * this.scale('e' + type + 'Speed'),
      bullet: base.bullet * this.scale('e' + type + 'Shell'),
      hp: this.values['e' + type + 'Hits'],
      pts: base.pts,
    };
  },
};
