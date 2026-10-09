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
  { name: 'TURRET', weight: 2, isNew: true, desc: 'A TURRET TO PLACE WITH B' },
  { name: 'CLAUDE', weight: 1, isNew: true, desc: 'CLAUDE EATS ENEMY TANKS', who: 'PLAYER' },
  { name: 'REVIVE', weight: 1, isNew: true, desc: 'BRINGS FALLEN PLAYERS BACK' },
  { name: 'AIRSTRIKE', weight: 1, isNew: true, desc: 'BOMBS THE BUSIEST ROW' },
  { name: 'BRIDGE', weight: 1, isNew: true, desc: '2 BRIDGE KITS FOR WATER' },
  { name: 'SMOKE', weight: 2, isNew: true, desc: 'ENEMIES LOSE TRACK OF YOU' },
  // night stages only: every second power-up there (weight 0 = never picked at random)
  { name: 'NIGHT VISION', weight: 0, isNew: true, desc: 'SEE IN THE DARK FOR 20 S', who: 'PLAYER' },
  { name: 'WEAPON', weight: 3, isNew: true, desc: 'A NEW WEAPON OR ITS NEXT MK', who: 'PLAYER' },
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

// Skill levels, named as in DOOM. HURT ME PLENTY is the game as it is (and the default).
// fire / speed / shell / spawn / boss scale the enemies; lives = extra tanks; vet shifts when veterans and elites
// appear (in stages); aggr scales how many enemies rush, hunt and snipe (the rest wander as in the original);
// newMult / newShift: share of the new enemy types and how many stages later each one first appears;
// maxOn = change to enemies on screen; plates = free armour plate each life; eagle = free eagle armour each stage;
// respawn = chance a destroyed enemy comes back.
// sight / baseSight = how far (px) an enemy notices you / the eagle lined up with it and fires on purpose (beyond
// that it only fires at random); baseAim scales how often enemies make for the eagle and shell it from range;
// grab = which power-ups enemies may take (0 none, 1 all but grenade, clock and shovel, 2 all); hqPace = how fast
// the computer's HQ upgrades in VS CPU; bossPace = share of frames a boss acts on (slower bosses); shield = how much
// longer your spawn shield lasts; repair = a free REPAIR CREW level (the fortress mends itself).
const SKILLS = [
  { name: "I'M TOO YOUNG TO DIE", fire: 0.35, speed: 0.75, shell: 0.7, spawn: 0.6, boss: 0.5, lives: 3, vet: -30, aggr: 0.15,
    newMult: 0.3, newShift: 15, maxOn: -1, plates: 1, eagle: 3, respawn: 0, sight: 64, baseSight: 40, baseAim: 0.4, grab: 0, hqPace: 0.5, bossPace: 0.6, shield: 2, repair: 3 },
  { name: 'HEY, NOT TOO ROUGH', fire: 0.6, speed: 0.88, shell: 0.85, spawn: 0.75, boss: 0.75, lives: 2, vet: -15, aggr: 0.45,
    newMult: 0.6, newShift: 6, maxOn: 0, plates: 0, eagle: 2, respawn: 0, sight: 104, baseSight: 64, baseAim: 0.5, grab: 1, hqPace: 0.75, bossPace: 0.8, shield: 1.5, repair: 2 },
  { name: 'HURT ME PLENTY', fire: 1, speed: 1, shell: 1, spawn: 1, boss: 1, lives: 0, vet: 0, aggr: 0.85,
    newMult: 1, newShift: 0, maxOn: 0, plates: 0, eagle: 0, respawn: 0, sight: 176, baseSight: 112, baseAim: 0.8, grab: 2, hqPace: 1, bossPace: 1, shield: 1, repair: 0 },
  { name: 'ULTRA-VIOLENCE', fire: 1.3, speed: 1.1, shell: 1.15, spawn: 1.25, boss: 1.25, lives: 0, vet: 5, aggr: 1.25,
    newMult: 1.2, newShift: 0, maxOn: 1, plates: 0, eagle: 0, respawn: 0, sight: 999, baseSight: 999, baseAim: 1.1, grab: 2, hqPace: 1.2, bossPace: 1, shield: 1, repair: 0 },
  { name: 'NIGHTMARE!', fire: 1.6, speed: 1.2, shell: 1.3, spawn: 1.5, boss: 1.5, lives: 0, vet: 10, aggr: 1.5,
    newMult: 1.5, newShift: 0, maxOn: 2, plates: 0, eagle: 0, respawn: 0.3, sight: 999, baseSight: 999, baseAim: 1.25, grab: 2, hqPace: 1.4, bossPace: 1, shield: 1, repair: 0 },
];

// short names (as DOOM players say them) and colours for the side panel (dark, on grey) and the pause menu (bright)
const SKILL_TAGS = [['ITY', '#58D854', '#005800'], ['NTR', '#3CBCFC', '#0000A8'], ['HMP', '#F8F8F8', '#000000'],
  ['UV', '#F87858', '#A81000'], ['NM', '#F83800', '#880000'], ['AUTO', '#3CBCFC', '#0000A8']];

// enemy personality where there is no eagle to rush (corridor, kill race): calmer skills wander more
function noBasePersonality() {
  const a = Config.skill().aggr, w = [Math.max(0.3, 1.2 - 0.5 * a), 0, a, 0.4 * a];
  let r = Math.random() * w.reduce((x, y) => x + y, 0);
  for (let i = 0; i < 4; i++) { if (r < w[i]) return i; r -= w[i]; }
  return 0;
}

// AUTO skill: a rating from 0 (I'M TOO YOUNG TO DIE) to 4 (NIGHTMARE!) that follows how you play, and enemy
// strength blended between the two nearest skills. Kills and cleared stages push it up; lost tanks, hits on the eagle
// and game overs push it down. It is remembered between games.
const AUTO_SKILL = 5, AUTO_KEY = 'tank1990_autoskill';
const AUTO_STEP = { kill: 0.015, clear: 0.15, cleanClear: 0.25, death: -0.3, eagleHit: -0.15, gameOver: -0.5 };
const AutoSkill = {
  rating: 2,
  stageDeaths: 0,
  cache: null,
  load() {
    let v = NaN;
    try { v = parseFloat(localStorage.getItem(AUTO_KEY)); } catch (e) { /* storage unavailable */ }
    this.rating = v >= 0 && v <= 4 ? v : 2;   // first time: HURT ME PLENTY
    this.cache = null;
  },
  save() { try { localStorage.setItem(AUTO_KEY, String(Math.round(this.rating * 100) / 100)); } catch (e) { /* storage unavailable */ } },
  active() { return Config.get('skill') === AUTO_SKILL && !(typeof Game !== 'undefined' && modeInfo(Game.mode).vs); },
  // a new game starts from the remembered rating, never at the very ends
  start() { this.load(); this.rating = Math.max(0.5, Math.min(3.5, this.rating)); this.stageDeaths = 0; this.cache = null; },
  stageStart() { this.stageDeaths = 0; },
  // something happened in the game
  event(kind, players = 1) {
    if (!this.active()) return;
    let d = AUTO_STEP[kind] || 0;
    if (kind === 'death') { d /= Math.sqrt(players); this.stageDeaths++; }
    if (kind === 'clear' && this.stageDeaths === 0) d += AUTO_STEP.cleanClear;
    this.rating = Math.max(0, Math.min(4, this.rating + d));
    this.cache = null;
    if (kind === 'clear' || kind === 'gameOver') this.save();
  },
  nearest() { return SKILLS[Math.max(0, Math.min(4, Math.round(this.rating)))]; },
  // the skill table blended at the current rating
  params() {
    if (this.cache) return this.cache;
    const r = this.rating, lo = SKILLS[Math.floor(r)], hi = SKILLS[Math.min(4, Math.floor(r) + 1)], f = r - Math.floor(r);
    const p = { name: 'AUTO: ' + this.nearest().name };
    for (const k in lo) if (typeof lo[k] === 'number') p[k] = lo[k] + (hi[k] - lo[k]) * f;
    for (const k of ['lives', 'plates', 'eagle', 'maxOn', 'grab', 'repair']) p[k] = Math.round(p[k]);
    this.cache = p;
    return p;
  },
};

// defaults that have changed: a saved setting still on the old default moves to the new one
const OLD_DEFAULTS = { e11Hits: [2], e17Hits: [10] };   // flamer 2 -> 6, snake 10 -> 16 hits (short range, tougher)

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
  // points a fallen player (or a teammate) pays to come back: FIRE during play, or REVIVE in the shop
  { key: 'reviveCost', label: 'REVIVE COST', values: ['OFF', 2500, 5000, 7500, 10000], def: 7500 },

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
  { key: 'e11Hits', label: 'HITS TO DESTROY', values: range(1, 12), def: 6, enemy: 11 },
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

  { section: 'SNAKE *', enemy: 17 },
  { key: 'e17Speed', label: 'SPEED', values: PCTS, def: 100, fmt: fmtPct, enemy: 17 },
  { key: 'e17Hits', label: 'HITS TO DESTROY', values: range(1, 30), def: 16, enemy: 17 },
  { key: 'e17On', label: 'APPEARS', values: ONOFF, def: 'ON', enemy: 17 },
  // the seasons' own (seasonal.js): each only in its season
  { section: 'HOPPER *', enemy: 18 },
  { key: 'e18Speed', label: 'SPEED', values: PCTS, def: 100, fmt: fmtPct, enemy: 18 },
  { key: 'e18Hits', label: 'HITS TO DESTROY', values: range(1, 9), def: 1, enemy: 18 },
  { key: 'e18On', label: 'APPEARS', values: ONOFF, def: 'ON', enemy: 18 },
  { section: 'FIREBUG *', enemy: 19 },
  { key: 'e19Speed', label: 'SPEED', values: PCTS, def: 100, fmt: fmtPct, enemy: 19 },
  { key: 'e19Hits', label: 'HITS TO DESTROY', values: range(1, 9), def: 2, enemy: 19 },
  { key: 'e19On', label: 'APPEARS', values: ONOFF, def: 'ON', enemy: 19 },
  { section: 'GUSTER *', enemy: 20 },
  { key: 'e20Speed', label: 'SPEED', values: PCTS, def: 100, fmt: fmtPct, enemy: 20 },
  { key: 'e20Hits', label: 'HITS TO DESTROY', values: range(1, 9), def: 3, enemy: 20 },
  { key: 'e20On', label: 'APPEARS', values: ONOFF, def: 'ON', enemy: 20 },
  { section: 'FROST *', enemy: 21 },
  { key: 'e21Speed', label: 'SPEED', values: PCTS, def: 100, fmt: fmtPct, enemy: 21 },
  { key: 'e21Hits', label: 'HITS TO DESTROY', values: range(1, 9), def: 2, enemy: 21 },
  { key: 'e21On', label: 'APPEARS', values: ONOFF, def: 'ON', enemy: 21 },
  { section: 'GHOUL *', enemy: 22 },
  { key: 'e22Speed', label: 'SPEED', values: PCTS, def: 100, fmt: fmtPct, enemy: 22 },
  { key: 'e22Hits', label: 'HITS TO DESTROY', values: range(1, 9), def: 2, enemy: 22 },
  { key: 'e22On', label: 'APPEARS', values: ONOFF, def: 'ON', enemy: 22 },
  { section: 'BURROWER *', enemy: 23 },
  { key: 'e23Speed', label: 'SPEED', values: PCTS, def: 100, fmt: fmtPct, enemy: 23 },
  { key: 'e23Hits', label: 'HITS TO DESTROY', values: range(1, 9), def: 2, enemy: 23 },
  { key: 'e23On', label: 'APPEARS', values: ONOFF, def: 'ON', enemy: 23 },
  // the terrain types' own (biomes.js)
  { section: 'MAGMA *', enemy: 24 },
  { key: 'e24Speed', label: 'SPEED', values: PCTS, def: 100, fmt: fmtPct, enemy: 24 },
  { key: 'e24Hits', label: 'HITS TO DESTROY', values: range(1, 9), def: 3, enemy: 24 },
  { key: 'e24On', label: 'APPEARS', values: ONOFF, def: 'ON', enemy: 24 },
  { section: 'GATOR *', enemy: 25 },
  { key: 'e25Speed', label: 'SPEED', values: PCTS, def: 100, fmt: fmtPct, enemy: 25 },
  { key: 'e25Hits', label: 'HITS TO DESTROY', values: range(1, 9), def: 2, enemy: 25 },
  { key: 'e25On', label: 'APPEARS', values: ONOFF, def: 'ON', enemy: 25 },
  { section: 'ROCKET TRUCK *', enemy: 26 },
  { key: 'e26Speed', label: 'SPEED', values: PCTS, def: 100, fmt: fmtPct, enemy: 26 },
  { key: 'e26Hits', label: 'HITS TO DESTROY', values: range(1, 9), def: 2, enemy: 26 },
  { key: 'e26On', label: 'APPEARS', values: ONOFF, def: 'ON', enemy: 26 },
  // the maze's own (mazefoes.js): only in MAZE mode
  { section: 'MINOTAUR *', enemy: 27 },
  { key: 'e27Speed', label: 'SPEED', values: PCTS, def: 100, fmt: fmtPct, enemy: 27 },
  { key: 'e27Hits', label: 'HITS TO DESTROY', values: range(4, 30), def: 12, enemy: 27 },
  { key: 'e27On', label: 'APPEARS', values: ONOFF, def: 'ON', enemy: 27 },
  { section: 'CRAWLER *', enemy: 28 },
  { key: 'e28Speed', label: 'SPEED', values: PCTS, def: 100, fmt: fmtPct, enemy: 28 },
  { key: 'e28Hits', label: 'HITS TO DESTROY', values: range(1, 9), def: 2, enemy: 28 },
  { key: 'e28On', label: 'APPEARS', values: ONOFF, def: 'ON', enemy: 28 },
  { section: 'SENTRY *', enemy: 29 },
  { key: 'e29Hits', label: 'HITS TO DESTROY', values: range(1, 9), def: 4, enemy: 29 },
  { key: 'e29On', label: 'APPEARS', values: ONOFF, def: 'ON', enemy: 29 },
  { section: 'LOCKSMITH *', enemy: 30 },
  { key: 'e30Speed', label: 'SPEED', values: PCTS, def: 100, fmt: fmtPct, enemy: 30 },
  { key: 'e30Hits', label: 'HITS TO DESTROY', values: range(1, 9), def: 2, enemy: 30 },
  { key: 'e30On', label: 'APPEARS', values: ONOFF, def: 'ON', enemy: 30 },
  { section: 'MIRROR *', enemy: 31 },
  { key: 'e31Hits', label: 'HITS TO DESTROY', values: range(1, 9), def: 2, enemy: 31 },
  { key: 'e31On', label: 'APPEARS', values: ONOFF, def: 'ON', enemy: 31 },

  { section: 'POWER-UPS' },
  { key: 'helmetTime', label: 'HELMET TIME', values: SECS.slice(1), def: 10, fmt: fmtSec },
  { key: 'clockTime', label: 'CLOCK TIME', values: SECS.slice(1), def: 10, fmt: fmtSec },
  { key: 'shovelTime', label: 'SHOVEL TIME', values: SECS.slice(5), def: 20, fmt: fmtSec },
  { key: 'newTime', label: 'NEW P-UP TIME', values: SECS.slice(5), def: 15, fmt: fmtSec },
  { key: 'mineCount', label: 'MINES PER PICKUP', values: range(1, 9), def: 3 },

  // who may collect each power-up: ANYONE (players and enemies), PLAYER only, or OFF (never appears)
  { section: 'WHO CAN COLLECT' },
  ...POWERUPS.map((pu, i) => ({
    key: 'pu' + i, label: pu.name + (pu.isNew ? ' *' : ''), values: ['ANYONE', 'PLAYER', 'OFF'], def: pu.who || 'ANYONE', powerup: i,
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
  { key: 'baseShop', label: 'BASE UPGRADES', values: ONOFF, def: 'ON' },

  // field size in 16px tiles; FIT sizes it to the window's shape when a game starts
  { section: 'SCREEN' },
  { key: 'fieldW', label: 'FIELD WIDTH', values: range(13, 60).concat(['FIT']), def: 13 },
  { key: 'fieldH', label: 'FIELD HEIGHT', values: range(13, 40).concat(['FIT']), def: 13 },
  { key: 'scaling', label: 'SCALING', values: ['SHARP', 'FILL'], def: 'SHARP' },
  { key: 'minimap', label: 'MINIMAP', values: ONOFF, def: 'ON' },
  // blocks.js: the terrain as voxel-style blocks; only how this screen draws it (not sent online)
  { key: 'look', label: 'LOOK', values: ['CLASSIC', 'BLOCKS'], def: 'CLASSIC' },
  { key: 'controls', label: 'CONTROLS', values: ['AUTO', 'PC', 'MAC'], def: 'AUTO' },
  { action: 'keys', label: 'SET UP KEYS AND PADS' },
  { key: 'rumble', label: 'GAMEPAD RUMBLE', values: ONOFF, def: 'ON' },
  { action: 'fitScreen', label: 'FIT TO MY SCREEN' },
  { action: 'fullscreen', label: 'TOGGLE FULLSCREEN' },

  { section: 'GAME' },
  { key: 'gameMode', label: 'GAME MODE', values: ['classic', 'custom', 'survival', 'timeattack', 'bigmaps', 'sides', 'corridor', 'maze', 'fortress', 'galaxy', 'coop', 'race', 'eagles', 'dm', 'ctf'], def: 'classic',
    fmt: v => modeInfo(v).name },
  { key: 'skill', label: 'SKILL', values: [0, 1, 2, 3, 4, 5], def: 2, fmt: v => ['TOO YOUNG', 'NOT TOO ROUGH', 'HURT ME', 'ULTRA-VIOL.', 'NIGHTMARE!', 'AUTO'][v] },
  { key: 'raceTarget', label: 'RACE: FIRST TO', values: [1, 2, 3, 5, 7, 10], def: 3, fmt: v => v + ' PTS' },
  // galaxy_modes.js: the kind of GALAXY run (also picked on its title screen and first curtain)
  { key: 'galaxyRun', label: 'GALAXY RUN', values: ['CAMPAIGN', 'BOSS RUSH', 'ENDLESS', 'DAILY'], def: 'CAMPAIGN' },
  // terrain.js, biomes.js: mud, belts, pads, and crates, barrels, deflectors
  { key: 'terrainExtras', label: 'MUD, BELTS, PADS', values: ONOFF, def: 'ON' },
  // seasons.js: a new season every stage, or one at random, or always the same (OFF: the classic black); the last
  // three are the terrain types (biomes.js)
  { key: 'seasons', label: 'SEASONS', values: ['CYCLE', 'RANDOM', 'OFF', 'SPRING', 'SUMMER', 'AUTUMN', 'WINTER', 'NUCLEAR', 'DESERT', 'VOLCANIC', 'SWAMP', 'CITY'], def: 'CYCLE' },
  // seasonal.js: showers, wildfire, gusts, blizzards, hot spots, mirages (biomes.js: lava bombs, marsh gas, blackouts)
  { key: 'seasonFx', label: 'SEASON EFFECTS', values: ONOFF, def: 'ON' },
  // secrets.js: power-ups hidden in walls, ? blocks with coins or a guardian mushroom
  { key: 'secrets', label: 'SECRETS', values: ONOFF, def: 'ON' },
  // fortress.js: fast forward (also in the pause menu during a FORTRESS game)
  { key: 'tdSpeed', label: 'FORTRESS SPEED', values: [1, 2, 3], def: 1, fmt: v => v + 'X' },
  // classic games: every 4th stage (not a boss stage) a big scrolling map
  { key: 'bigStages', label: 'BIG MAP STAGES', values: ['OFF', 'SOME'], def: 'OFF' },
  { key: 'darkStages', label: 'NIGHT AND FOG', values: ['SOME', 'MANY', 'OFF', 'ALWAYS NIGHT', 'ALWAYS FOG'], def: 'SOME',
    fmt: v => (v === 'ALWAYS NIGHT' ? 'ALL NIGHT' : v === 'ALWAYS FOG' ? 'ALL FOG' : v) },
  { key: 'gameSpeed', label: 'GAME SPEED', values: [50, 75, 100, 125, 150, 200], def: 100, fmt: fmtPct },
  // intro.js: the mode's title picture
  { key: 'modeIntro', label: 'MODE TITLE SCREENS', values: ONOFF, def: 'ON' },
  { key: 'bossScreens', label: 'BOSS SCREENS', values: ONOFF, def: 'ON' },
  // a one-line card the first time you meet each enemy, boss and power-up (cards.js)
  { key: 'newCards', label: 'FIRST-MEET CARDS', values: ONOFF, def: 'ON' },
  { action: 'resetCards', label: 'SHOW ALL CARDS AGAIN' },

  { section: 'SOUND' },
  { key: 'volume', label: 'VOLUME', values: [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100], def: 100, fmt: fmtPct },
  { key: 'engineSound', label: 'ENGINE SOUND', values: ONOFF, def: 'ON' },

  { section: 'MUSIC' },
  // music.js: a chiptune for every mode, in a version for every skill
  { key: 'music', label: 'MUSIC', values: ONOFF, def: 'ON' },
  // rock.js: hard rock and heavy metal versions of every tune, or the chiptunes
  { key: 'musicStyle', label: 'MUSIC STYLE', values: ['ROCK', 'CHIPTUNE'], def: 'ROCK' },
  { key: 'musicVol', label: 'MUSIC VOLUME', values: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100], def: 50, fmt: fmtPct },

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
    for (const k in saved) {
      if (!this.defs[k] || !this.defs[k].values.includes(saved[k])) continue;
      if ((OLD_DEFAULTS[k] || []).includes(saved[k])) continue;   // a default that has since changed: take the new one
      this.values[k] = saved[k];
    }
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
    if (typeof Music !== 'undefined') Music.applyVolume();
    if (typeof Game !== 'undefined' && Game.onResize) Game.onResize();
    if (typeof Input !== 'undefined' && Input.updateHelp) Input.updateHelp();
  },

  // ---- helpers used by the game rules
  playerPal(i) { return 'c_' + this.values['p' + (i + 1) + 'Color']; },
  startLives() { const v = this.values.lives; return v === 'INF' ? 2 : Math.min(99, v - 1 + this.skill().lives); },
  skill() { return this.values.skill === AUTO_SKILL ? AutoSkill.params() : SKILLS[this.values.skill] || SKILLS[2]; },
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
