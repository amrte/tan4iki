'use strict';
// =====================================================================
//  DESERT DOMINION: the numbers. Every unit, building, weapon and House of the mode (a tribute to the first real-time
//  strategy game, with names of its own): stats, armour, weapons, costs, build times, sight, power, who builds what
//  and from which tech level and factory upgrade, starport stock and the palace powers.
//    Units: hp, armour class, speed (px a frame on open ground), turn (frames per 45 degrees), weapon, sight (tiles),
//      cost, time (frames at full power), fac (the factory kind that makes it), houses (null: every House), tech (the
//      mission level it comes in at), upg (the factory upgrade it needs; upgBy: per-House exceptions), needs (other
//      buildings it needs), move class (foot, wheel, track, air).
//    Buildings: size in tiles, hp, cost, time, power (+ makes, - uses), sight, tech, upg (construction yard upgrade),
//      needs, storage (glimmer), fac (what it builds), upgrades (the paid factory upgrades: cost and tech level).
//    Weapons: class (for the armour table), damage, range (tiles), rate (frames between shots), shot (the projectile
//      art and speed), splash (tiles), air (can hit aircraft), spread (inaccuracy in tiles at full range).
// =====================================================================

const RTS_TILE = 16;
const RTS_SPEED = 1;   // a global multiplier on everything's movement speed

// the terrain kinds (one byte a tile in a map)
const RTS_T = { SAND: 0, DUNES: 1, ROCK: 2, CLIFF: 3, GLIM: 4, THICK: 5, BLOOM: 6, CONC: 7, CRATER_S: 8, CRATER_R: 9, RUBBLE: 10 };
// the art's families (4-neighbour masks of "same family" blend edges): 0 sand, 1 rock, 2 cliff, 3 glimmer
const RTS_FAMILY = [0, 0, 1, 2, 3, 3, 0, 1, 0, 1, 1];
// what each move class may cross, per terrain kind (0 = no), and how fast (multiplier)
const RTS_PASS = {
  foot: [0.9, 0.75, 1, 0.6, 0.9, 0.85, 0.9, 1.05, 0.9, 1, 0.95],
  wheel: [0.85, 0.6, 1, 0, 0.8, 0.75, 0.85, 1.1, 0.75, 0.9, 0.85],
  track: [0.9, 0.7, 1, 0, 0.85, 0.8, 0.9, 1.05, 0.8, 0.9, 0.9],
  air: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
};
// buildable ground (rock family, laid concrete, rubble)
const RTS_BUILDABLE = [false, false, true, false, false, false, false, true, false, true, true];
const RTS_ON_SAND = [true, true, false, false, true, true, true, false, true, false, false];

// House colours as art palettes: [light, mid, dark]
const RTS_HOUSE_PAL = {
  aquila: ['#78B8F8', '#3C78F8', '#1838A0'],
  drakon: ['#F87858', '#D82800', '#801000'],
  serpens: ['#88E888', '#38B838', '#186818'],
  regent: ['#C8A0F8', '#9858D8', '#582888'],
  nomad: ['#E8C898', '#C89858', '#806030'],
};

const RTS_HOUSES = {
  aquila: { key: 'aquila', name: 'AQUILA', color: '#3C78F8', emblem: 'eagle', advisor: 'COUNSELLOR MIREN', palace: 'nomads',
    motto: 'HONOUR IS THE SHARPEST BLADE', theme: 'rtsAquila', playable: true },
  drakon: { key: 'drakon', name: 'DRAKON', color: '#D82800', emblem: 'ram skull', advisor: 'OVERSEER KASK', palace: 'doomfist',
    motto: 'BREAK THEM AND TAKE IT ALL', theme: 'rtsDrakon', playable: true },
  serpens: { key: 'serpens', name: 'SERPENS', color: '#38B838', emblem: 'serpent', advisor: 'FACTOR VELL', palace: 'saboteur',
    motto: 'EVERY WAR HAS A PRICE', theme: 'rtsSerpens', playable: true },
  regent: { key: 'regent', name: 'THE REGENT', color: '#9858D8', emblem: 'crown', advisor: 'THE REGENT', palace: 'doomfist',
    motto: 'ALL OF KHARRA KNEELS', theme: 'rtsRegent', playable: false },
  nomad: { key: 'nomad', name: 'NOMADS', color: '#C89858', emblem: 'dune', advisor: '', palace: null, motto: '', playable: false },
};
const RTS_PLAYABLE = ['aquila', 'drakon', 'serpens'];
const RTS_FOES = ['aquila', 'drakon', 'serpens', 'regent'];

// damage a weapon class does to an armour class (fraction)
const RTS_ARMOR = {
  bullet: { inf: 1, light: 0.6, heavy: 0.3, air: 0.5, bld: 0.12, wall: 0.08 },
  shell: { inf: 0.5, light: 0.85, heavy: 1, air: 0, bld: 0.6, wall: 0.5 },
  heavy: { inf: 0.7, light: 1, heavy: 1, air: 0, bld: 0.85, wall: 0.7 },
  rocket: { inf: 0.3, light: 0.45, heavy: 1, air: 1, bld: 0.5, wall: 0.4 },
  plasma: { inf: 0.9, light: 1, heavy: 1, air: 0, bld: 0.9, wall: 0.9 },
  sonic: { inf: 1, light: 0.85, heavy: 0.85, air: 0, bld: 0.3, wall: 0.15 },
  gas: { inf: 0.3, light: 0.5, heavy: 0.5, air: 0, bld: 0.1, wall: 0 },
  blast: { inf: 1, light: 1, heavy: 1, air: 0.5, bld: 1, wall: 1 },
};

// weapons (range, splash and spread in tiles; rate in frames; shot speed in px a frame)
const RTS_WEAPONS = {
  rifle: { cls: 'bullet', dmg: 4, range: 2.5, rate: 28, shot: 'bullet', speed: 6, sound: 'mg' },
  mg: { cls: 'bullet', dmg: 5, range: 3, rate: 13, shot: 'bullet', speed: 7, sound: 'mg' },
  twinmg: { cls: 'bullet', dmg: 5, range: 3, rate: 16, shot: 'bullet', speed: 7, salvo: 2, sound: 'mg' },
  bazooka: { cls: 'rocket', dmg: 24, range: 4, rate: 75, shot: 'rocket', speed: 3.2, spread: 0.3, air: true, sound: 'missile' },
  nomadgun: { cls: 'rocket', dmg: 18, range: 4, rate: 55, shot: 'rocket', speed: 3.4, spread: 0.2, air: true, sound: 'missile' },
  praetorgun: { cls: 'rocket', dmg: 26, range: 4.5, rate: 60, shot: 'rocket', speed: 3.4, spread: 0.25, splash: 0.3, air: true, sound: 'missile' },
  cannon: { cls: 'shell', dmg: 26, range: 4, rate: 52, shot: 'shell', speed: 4.5, splash: 0.25, sound: 'shot' },
  siegegun: { cls: 'heavy', dmg: 44, range: 5, rate: 80, shot: 'heavy', speed: 4, splash: 0.5, salvo: 2, sound: 'mortar' },
  launcher: { cls: 'rocket', dmg: 44, range: 6, rate: 100, shot: 'missile', speed: 3, spread: 0.6, splash: 0.3, salvo: 2, air: true, minRange: 1.5, sound: 'missile' },
  sonicwave: { cls: 'sonic', dmg: 85, range: 5.5, rate: 90, shot: 'sonic', speed: 2.6, sonic: true, sound: 'zap' },
  plasma: { cls: 'plasma', dmg: 60, range: 5.5, rate: 90, shot: 'plasma', speed: 3.4, splash: 0.5, salvo: 2, sound: 'laser' },
  gasgun: { cls: 'gas', dmg: 18, range: 6, rate: 100, shot: 'gas', speed: 2.6, splash: 0.4, convert: 1500, sound: 'gas' },
  turretgun: { cls: 'shell', dmg: 24, range: 5.5, rate: 46, shot: 'shell', speed: 5, splash: 0.25, sound: 'shot' },
  turretrocket: { cls: 'rocket', dmg: 30, range: 8.5, rate: 72, shot: 'missile', speed: 3.4, spread: 0.3, splash: 0.3, air: true, minRange: 1.5, needsPower: true, sound: 'missile' },
  wingrocket: { cls: 'rocket', dmg: 14, range: 3.5, rate: 40, shot: 'rocket', speed: 4, spread: 0.2, splash: 0.25, sound: 'missile' },
  doomfist: { cls: 'blast', dmg: 520, range: 999, rate: 0, shot: 'doomfist', speed: 2.4, splash: 3, spread: 3 },
  selfdestruct: { cls: 'blast', dmg: 320, splash: 2.6 },
  sabotage: { cls: 'blast', dmg: 700, splash: 1.2 },
};

// units: see the top of the file
const RTS_UNITS = {
  // ------- infantry (one soldier a unit; up to three share a tile)
  soldier: { name: 'SOLDIER', cls: 'inf', move: 'foot', armor: 'inf', hp: 20, speed: 0.28, turn: 1, wpn: 'rifle', sight: 3, cost: 60, time: 240,
    fac: 'barracks', tech: 1, capture: true, desc: 'RIFLEMAN. CAN CAPTURE DAMAGED BUILDINGS' },
  trooper: { name: 'TROOPER', cls: 'inf', move: 'foot', armor: 'inf', hp: 26, speed: 0.24, turn: 1, wpn: 'bazooka', sight: 3, cost: 100, costBy: { drakon: 85 }, time: 360,
    fac: 'hall', tech: 2, capture: true, desc: 'ROCKET TROOPER, GOOD AGAINST VEHICLES' },
  nomad: { name: 'NOMAD WARRIOR', cls: 'inf', move: 'foot', armor: 'inf', hp: 34, speed: 0.34, turn: 1, wpn: 'nomadgun', sight: 4, cost: 0, time: 0,
    fac: null, houses: ['aquila', 'nomad'], tech: 9, stealth: true, desc: 'DESERT FIGHTER, HARD TO SPOT' },
  saboteur: { name: 'SABOTEUR', cls: 'inf', move: 'foot', armor: 'inf', hp: 16, speed: 0.4, turn: 1, wpn: null, sight: 4, cost: 0, time: 0,
    fac: null, houses: ['serpens'], tech: 9, stealth: true, saboteur: true, desc: 'INVISIBLE WHEN STILL. BLOWS UP A BUILDING' },
  praetorian: { name: 'PRAETORIAN', cls: 'inf', move: 'foot', armor: 'inf', hp: 50, speed: 0.26, turn: 1, wpn: 'praetorgun', sight: 4, cost: 170, time: 420,
    fac: 'barracks', houses: ['regent'], tech: 3, capture: true, desc: 'THE REGENT\'S ELITE HEAVY TROOPER' },
  // ------- light vehicles
  trike: { name: 'TRIKE', cls: 'veh', move: 'wheel', armor: 'light', hp: 100, speed: 1.0, turn: 3, wpn: 'mg', sight: 5, cost: 150, time: 360,
    fac: 'light', houses: ['aquila', 'regent'], tech: 1, crush: true, desc: 'FAST THREE-WHEELED SCOUT' },
  raider: { name: 'RAIDER', cls: 'veh', move: 'wheel', armor: 'light', hp: 90, speed: 1.2, turn: 2, wpn: 'mg', sight: 5, cost: 150, time: 330,
    fac: 'light', houses: ['serpens'], tech: 1, crush: true, desc: 'THE FASTEST THING ON KHARRA' },
  quad: { name: 'QUAD', cls: 'veh', move: 'wheel', armor: 'light', hp: 130, speed: 0.82, turn: 4, wpn: 'twinmg', sight: 4, cost: 200, time: 480,
    fac: 'light', tech: 2, upg: 1, upgBy: { drakon: 0 }, crush: true, desc: 'FOUR WHEELS AND TWIN GUNS' },
  // ------- heavy vehicles
  tank: { name: 'COMBAT TANK', cls: 'veh', move: 'track', armor: 'heavy', hp: 200, speed: 0.55, turn: 5, wpn: 'cannon', sight: 4, cost: 300, time: 660,
    fac: 'heavy', tech: 3, turret: true, crush: true, desc: 'TURRETED CANNON, THE LINE TANK' },
  missile: { name: 'MISSILE TANK', cls: 'veh', move: 'track', armor: 'heavy', hp: 150, speed: 0.5, turn: 5, wpn: 'launcher', sight: 5, cost: 450, time: 780,
    fac: 'heavy', houses: ['aquila', 'drakon', 'regent'], tech: 4, upg: 1, turret: true, crush: true, desc: 'LONG RANGE ROCKETS, HITS AIRCRAFT' },
  siege: { name: 'SIEGE TANK', cls: 'veh', move: 'track', armor: 'heavy', hp: 380, speed: 0.4, turn: 7, wpn: 'siegegun', sight: 4, cost: 600, time: 900,
    fac: 'heavy', tech: 5, upg: 2, turret: true, crush: true, desc: 'HEAVY TWIN CANNON, SLOW' },
  harvester: { name: 'HARVESTER', cls: 'veh', move: 'track', armor: 'heavy', hp: 160, speed: 0.42, turn: 6, wpn: null, sight: 2, cost: 300, time: 720,
    fac: 'heavy', tech: 1, crush: true, harvester: true, cap: 700, digEvery: 6, big: true, desc: 'GATHERS 700 CREDITS OF GLIMMER' },
  mcv: { name: 'MCV', cls: 'veh', move: 'track', armor: 'heavy', hp: 150, speed: 0.38, turn: 7, wpn: null, sight: 3, cost: 900, time: 960,
    fac: 'heavy', tech: 4, upg: 1, crush: true, deploys: 'yard', big: true, desc: 'DEPLOYS INTO A CONSTRUCTION YARD' },
  sonic: { name: 'SONIC TANK', cls: 'veh', move: 'track', armor: 'heavy', hp: 220, speed: 0.45, turn: 6, wpn: 'sonicwave', sight: 4, cost: 600, time: 900,
    fac: 'heavy', houses: ['aquila'], tech: 7, upg: 2, needs: ['lab'], turret: true, crush: true, desc: 'A SOUND WAVE HURTS ALL IN ITS PATH' },
  juggernaut: { name: 'JUGGERNAUT', cls: 'veh', move: 'track', armor: 'heavy', hp: 520, speed: 0.3, turn: 9, wpn: 'plasma', sight: 4, cost: 800, time: 1080,
    fac: 'heavy', houses: ['drakon'], tech: 7, upg: 2, needs: ['lab'], turret: true, crush: true, big: true, selfDestruct: true, desc: 'HUGE TWIN PLASMA. CAN SELF-DESTRUCT' },
  converter: { name: 'CONVERTER', cls: 'veh', move: 'track', armor: 'heavy', hp: 170, speed: 0.46, turn: 6, wpn: 'gasgun', sight: 4, cost: 750, time: 900,
    fac: 'heavy', houses: ['serpens'], tech: 7, upg: 2, needs: ['lab'], turret: true, crush: true, desc: 'GAS TURNS ENEMY VEHICLES FOR A WHILE' },
  // ------- aircraft
  skylifter: { name: 'SKYLIFTER', cls: 'air', move: 'air', armor: 'air', hp: 100, speed: 1.5, turn: 3, wpn: null, sight: 2, cost: 800, time: 720,
    fac: 'hightech', tech: 4, lifter: true, desc: 'AIRLIFTS HARVESTERS AND DAMAGED UNITS' },
  gunwing: { name: 'GUNWING', cls: 'air', move: 'air', armor: 'air', hp: 70, speed: 1.7, turn: 2, wpn: 'wingrocket', sight: 5, cost: 600, time: 720,
    fac: 'hightech', houses: ['aquila', 'serpens', 'regent'], tech: 6, upg: 1, desc: 'ATTACK AIRCRAFT' },
  frigate: { name: 'FRIGATE', cls: 'air', move: 'air', armor: 'air', hp: 999, speed: 1.3, turn: 2, wpn: null, sight: 2, cost: 0, time: 0,
    fac: null, tech: 9, untargetable: true, desc: 'DELIVERS STARPORT ORDERS' },
  doomfist: { name: 'DOOMFIST', cls: 'air', move: 'air', armor: 'air', hp: 1, speed: 2.4, turn: 1, wpn: null, sight: 0, cost: 0, time: 0,
    fac: null, houses: ['drakon'], tech: 9, untargetable: true, desc: 'A HUGE BALLISTIC MISSILE' },
};

// buildings: see the top of the file
const RTS_BUILDINGS = {
  slab1: { name: 'CONCRETE SLAB', w: 1, h: 1, hp: 0, cost: 5, time: 90, power: 0, sight: 0, tech: 1, slab: true, desc: 'A FOUNDATION: NO DECAY' },
  slab4: { name: 'CONCRETE SLAB 2X2', w: 2, h: 2, hp: 0, cost: 20, time: 200, power: 0, sight: 0, tech: 2, upg: 1, slab: true, desc: 'FOUR FOUNDATIONS AT ONCE' },
  yard: { name: 'CONSTRUCTION YARD', w: 2, h: 2, hp: 400, cost: 900, time: 0, power: 0, sight: 4, tech: 99, fac: 'yard', noBuild: true, storage: 1000,
    upgrades: [{ cost: 300, tech: 2 }, { cost: 400, tech: 5 }], desc: 'BUILDS THE BASE' },
  vapor: { name: 'VAPOR TRAP', w: 2, h: 2, hp: 200, cost: 300, time: 600, power: 100, sight: 2, tech: 1, desc: 'POWER FROM THE AIR' },
  refinery: { name: 'REFINERY', w: 3, h: 2, hp: 450, cost: 400, time: 840, power: -30, sight: 3, tech: 1, needs: ['vapor'], storage: 1000, freeUnit: 'harvester',
    desc: 'TURNS GLIMMER INTO CREDITS. STORES 1000' },
  silo: { name: 'GLIMMER SILO', w: 2, h: 2, hp: 150, cost: 150, time: 360, power: -5, sight: 2, tech: 1, needs: ['refinery'], storage: 1000, desc: 'STORES 1000 MORE' },
  radar: { name: 'RADAR OUTPOST', w: 2, h: 2, hp: 250, cost: 400, time: 720, power: -30, sight: 7, tech: 2, needs: ['vapor'], radar: true, desc: 'THE MINIMAP. NEEDS POWER' },
  barracks: { name: 'BARRACKS', w: 2, h: 2, hp: 300, cost: 300, time: 600, power: -10, sight: 3, tech: 1, needs: ['vapor'], fac: 'barracks', desc: 'TRAINS SOLDIERS' },
  hall: { name: 'TROOPER HALL', w: 2, h: 2, hp: 300, cost: 400, time: 720, power: -20, sight: 3, tech: 2, needs: ['barracks'], fac: 'hall', desc: 'TRAINS TROOPERS' },
  light: { name: 'LIGHT FACTORY', w: 2, h: 2, hp: 350, cost: 400, time: 720, power: -20, sight: 3, tech: 1, needs: ['refinery'], fac: 'light',
    upgrades: [{ cost: 200, tech: 2 }], desc: 'BUILDS LIGHT VEHICLES' },
  heavy: { name: 'HEAVY FACTORY', w: 3, h: 2, hp: 400, cost: 600, time: 960, power: -35, sight: 3, tech: 3, needs: ['light', 'radar'], fac: 'heavy',
    upgrades: [{ cost: 300, tech: 4 }, { cost: 400, tech: 5 }], desc: 'BUILDS TANKS AND HARVESTERS' },
  hightech: { name: 'HIGH-TECH FACTORY', w: 3, h: 2, hp: 400, cost: 500, time: 960, power: -35, sight: 3, tech: 4, needs: ['light', 'radar'], fac: 'hightech',
    upgrades: [{ cost: 400, tech: 6 }], desc: 'BUILDS AIRCRAFT' },
  repair: { name: 'REPAIR PAD', w: 3, h: 2, hp: 400, cost: 700, time: 900, power: -20, sight: 3, tech: 4, needs: ['heavy'], repairPad: true, desc: 'MENDS VEHICLES' },
  lab: { name: 'RESEARCH LAB', w: 2, h: 2, hp: 300, cost: 500, time: 960, power: -40, sight: 3, tech: 6, needs: ['radar', 'heavy'], desc: 'OPENS THE HOUSE SPECIAL' },
  starport: { name: 'STARPORT', w: 3, h: 3, hp: 500, cost: 500, time: 1080, power: -50, sight: 3, tech: 5, needs: ['refinery', 'radar'], fac: 'starport', desc: 'BUY UNITS OFF-WORLD' },
  palace: { name: 'PALACE', w: 3, h: 3, hp: 1000, cost: 999, time: 1500, power: -80, sight: 4, tech: 8, needs: ['starport'], palace: true, desc: 'THE HOUSE SUPER POWER' },
  wall: { name: 'WALL', w: 1, h: 1, hp: 70, cost: 50, time: 120, power: 0, sight: 1, tech: 2, needs: ['barracks'], wall: true, armor: 'wall', desc: 'STOPS GROUND UNITS' },
  turret: { name: 'GUN TURRET', w: 1, h: 1, hp: 200, cost: 125, time: 420, power: -10, sight: 5, tech: 3, needs: ['radar'], wpn: 'turretgun', defense: true, desc: 'A CANNON ON A SWIVEL' },
  rturret: { name: 'ROCKET TURRET', w: 1, h: 1, hp: 220, cost: 250, time: 600, power: -25, sight: 7, tech: 5, upg: 1, needs: ['radar'], wpn: 'turretrocket', defense: true,
    desc: 'LONG RANGE ROCKETS. NEEDS POWER' },
};
for (const k in RTS_UNITS) RTS_UNITS[k].key = k;
for (const k in RTS_BUILDINGS) RTS_BUILDINGS[k].key = k;

// the factory kinds (a production queue each) and the building that holds each one
const RTS_FACTORIES = ['yard', 'barracks', 'hall', 'light', 'heavy', 'hightech'];
const RTS_FAC_NAME = { yard: 'BUILD', barracks: 'BARRACKS', hall: 'TROOPERS', light: 'LIGHT', heavy: 'HEAVY', hightech: 'AIR', starport: 'STARPORT' };
const RTS_FAC_TAB = { yard: 'BLD', barracks: 'INF', hall: 'TRP', light: 'LT', heavy: 'HV', hightech: 'AIR', starport: 'PRT' };
const RTS_FAC_TAB2 = { yard: 'BD', barracks: 'IN', hall: 'TR', light: 'LT', heavy: 'HV', hightech: 'AR', starport: 'SP' };
const RTS_UPGRADE_TIME = 600;

// the sandwyrms: the first one's arrival (frames), meals before it dives deep [min, max], frames away down there
// [min, max], how far it hears (tiles), and how much a harvester draws it (a factor on its distance: under 1 more)
const RTS_WORM = { first: 7200, meals: [1, 3], away: [6000, 9600], hear: 11, harvester: 1 };

// the palace powers: charge time (frames), what they do
const RTS_PALACE = {
  nomads: { name: 'NOMAD WARRIORS', charge: 9000, count: 6, target: true, desc: 'NOMAD WARRIORS RISE FROM THE SANDS' },
  doomfist: { name: 'DOOMFIST', charge: 12000, target: true, desc: 'A HUGE MISSILE: ANY TARGET ON THE MAP' },
  saboteur: { name: 'SABOTEUR', charge: 7200, target: false, desc: 'A SABOTEUR LEAVES THE PALACE' },
};

// the starport: what can be bought (by House), the price swing and the restock
const RTS_STARPORT = {
  items: ['trike', 'raider', 'quad', 'tank', 'missile', 'siege', 'harvester', 'mcv', 'skylifter', 'gunwing'],
  swing: 0.4,             // prices move up to 40% either way
  every: 2400,            // a new price list every 40 s
  restock: 3600,          // one more of each, now and then
  maxStock: 6,
  delay: 420,             // from the first order to the frigate's arrival
};

// tech levels (as the original's missions: 1 the basics ... 9 everything): what each one adds
const RTS_TECH = (() => {
  const lv = {};
  for (let i = 1; i <= 9; i++) lv[i] = [];
  for (const k in RTS_BUILDINGS) { const t = RTS_BUILDINGS[k].tech; if (t <= 9) lv[t].push(k); }
  for (const k in RTS_UNITS) { const u = RTS_UNITS[k]; if (u.fac && u.tech <= 9) lv[u.tech].push(k); }
  return { max: 9, levels: lv };
})();

// can house h make item key (a unit or building) at tech level tech, with factory upgrade level upg?
function rtsAllowed(h, key, tech, upg) {
  const d = RTS_UNITS[key] || RTS_BUILDINGS[key];
  if (!d || d.noBuild) return false;
  if (d.houses && !d.houses.includes(h)) return false;
  if ((d.tech || 1) > tech) return false;
  const need = d.upgBy && d.upgBy[h] !== undefined ? d.upgBy[h] : d.upg || 0;
  return (upg | 0) >= need;
}
function rtsPriceOf(h, key) {
  if (key === '_upg') return 0;
  const d = RTS_UNITS[key] || RTS_BUILDINGS[key];
  if (!d) return 0;
  return d.costBy && d.costBy[h] !== undefined ? d.costBy[h] : d.cost;
}
function rtsDefOf(key) { return RTS_UNITS[key] || RTS_BUILDINGS[key] || null; }
function rtsNameOf(key) { const d = rtsDefOf(key); return d ? d.name : key === '_upg' ? 'UPGRADE' : String(key).toUpperCase(); }
