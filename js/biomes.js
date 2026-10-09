'use strict';
// =====================================================================
//  Terrain types: three more looks alongside the seasons (seasons.js), each with tiles of its own, a twist and an
//  enemy found nowhere else; and three elements that turn up in any stage.
//    VOLCANIC  LAVA        drive in (your tank's middle over it) and you're gone; a glowing rim warns you. Shells fly
//                          over it, enemies keep out of it
//              BASALT      dark rock: shells bounce off; a power shell cracks it, a second one breaks it
//              FIRE VENTS  bubble for a second, then a column of fire: any tank on one is hit
//              LAVA BOMBS  (twist) the volcano spits bombs; a shadow marks where each one lands, the ground burns
//              MAGMA       (enemy) crosses lava, fireproof, leaves a trail of burning ground
//    SWAMP     BOG         slower than mud; stand still in it and you sink; sunk, you take a hit
//              REEDS       hide tanks like trees, burn like tinder
//              SWAMP GAS   a shot, a flame or a blast lights it: a hiss, then the whole pocket blows up
//              MARSH GAS   (twist) new gas bubbles up out of the bog
//              GATOR       (enemy) swims under the water (shells pass over it), surfaces, lunges and bites
//    CITY      CONCRETE    takes 3 hits (2 with power shells), cracking; then it's rubble
//              RUBBLE      slows you a little; shells pass
//              MANHOLES    linked pairs: drive onto one and you come up out of the other (shells don't)
//              STREET LAMPS light up the dark around them (city stages are often night or fog)
//              BLACKOUT    (twist) a power cut: dark for a while, street lamps and all; only tanks and gunfire give light
//              ROCKET TRUCK (enemy) shells the spot where it last saw you: three rockets, the spot marked
//    anywhere  CRATES      shoot one open: points or a power-up
//              BARRELS     (fuel drums in the city) blow up when shot, hurting every tank near and setting off
//                          their neighbours
//              DEFLECTORS  diagonal steel: turns shells 90 degrees
//  Crates come from stage 4, barrels from 6, deflectors from 10 (Settings -> MUD, BELTS, PADS turns them off);
//  CONSTRUCTION paints every one of them.
// =====================================================================

const BOG_SLOW = 0.4, RUBBLE_SLOW = 0.8, SINK_MAX = 180;
const VENT_PERIOD = 300, VENT_WARN = 60, VENT_FIRE = 54;
const GAS_FUSE = 24, DRUM_FUSE = 8, DRUM_R = 15, GAS_R = 12;
const BOMB_TIME = 110, BOMB_R = 11, BLACKOUT_TIME = 540;
const SALVO_TIME = 80, SALVO_R = 11, TRUCK_SIGHT = 176, LUNGE_RANGE = 64, LUNGE_TIME = 22;
const MANHOLE_CARD = 40;   // manholes are pads, not tiles: their card key

const isConc = v => v >= T_CONC && v <= T_CONC + 2;
const isDefl = v => v === T_DEFL || v === T_DEFL + 1;
const isBasalt = v => v === T_BASALT || v === T_BASALT2;
// stops a tank like a wall (lava stops only the enemy: see bioBlocks)
const bioSolid = v => isBasalt(v) || isConc(v) || v === T_LAMP || v === T_DRUM || v === T_CRATE || isDefl(v);
// no place to put something down (a power-up, a mirage, a hopper's landing)
const bioBad = v => v === T_LAVA || v === T_VENT || bioSolid(v);
// drawn every frame or listed for light: a change to or from one redraws the layers
const bioAnim = v => v === T_LAVA || v === T_VENT || v === T_GAS || v === T_LAMP || v === T_BOG;
// blocks a line of sight like trees and walls
const bioSight = v => bioSolid(v) || v === T_REEDS;
// stops a shell (a deflector turns it instead; a cutter shell mows reeds)
const bioStops = (v, b) => (bioSolid(v) && !isDefl(v)) || (v === T_REEDS && b.cutter);
// what an enemy's route pays to go through (-1: never; the snake can't shoot its way through)
const bioNav = (v, mode) => (v === T_LAVA ? (mode === 'magma' ? 0 : -1) : isBasalt(v) || isDefl(v) || v === T_DRUM || v === T_LAMP ? -1
  : mode === 'slither' && (isConc(v) || v === T_CRATE) ? -1 : isConc(v) ? 1.2 : v === T_CRATE ? 0.6 : v === T_VENT ? 0.8 : v === T_BOG ? (mode === 'hover' ? 0 : 0.6) : v === T_GAS ? 0.3 : v === T_RUBBLE ? 0.1 : 0);
// on the big maps' minimap
const BIO_MINI = { [T_LAVA]: [248, 88, 0], [T_BASALT]: [72, 64, 84], [T_BASALT2]: [72, 64, 84], [T_VENT]: [136, 20, 0], [T_BOG]: [52, 60, 28],
  [T_REEDS]: [120, 160, 56], [T_GAS]: [140, 210, 60], [T_CONC]: [168, 164, 148], [T_CONC + 1]: [168, 164, 148], [T_CONC + 2]: [168, 164, 148],
  [T_RUBBLE]: [100, 96, 88], [T_LAMP]: [248, 216, 120], [T_DRUM]: [200, 60, 24], [T_CRATE]: [183, 101, 6], [T_DEFL]: [200, 200, 200], [T_DEFL + 1]: [200, 200, 200] };
// first-meet cards (cards.js: 't' + the tile)
const BIO_CARDS = {
  [T_LAVA]: { name: 'LAVA', desc: 'DRIVE IN AND YOU BURN; SHELLS FLY OVER' },
  [T_BASALT]: { name: 'BASALT', desc: 'ONLY POWER SHELLS CRACK IT' },
  [T_VENT]: { name: 'FIRE VENT', desc: 'BUBBLES, THEN ERUPTS: KEEP OFF' },
  [T_BOG]: { name: 'BOG', desc: 'SLOW; STOP IN IT AND YOU SINK' },
  [T_REEDS]: { name: 'REEDS', desc: 'HIDE TANKS, BURN FAST' },
  [T_GAS]: { name: 'SWAMP GAS', desc: 'A SHOT OR A FLAME BLOWS IT UP' },
  [T_CONC]: { name: 'CONCRETE', desc: 'TAKES 3 HITS' },
  [T_DRUM]: { name: 'BARRELS', desc: 'BLOW UP WHEN SHOT, HURT ALL NEAR' },
  [T_CRATE]: { name: 'SUPPLY CRATE', desc: 'SHOOT IT: POINTS OR A POWER-UP' },
  [T_DEFL]: { name: 'DEFLECTOR', desc: 'TURNS SHELLS 90 DEGREES' },
  [MANHOLE_CARD]: { name: 'MANHOLES', desc: 'IN ONE, OUT OF ITS TWIN' },
};
// the 8px texture of each static tile (the rest are drawn as they move)
const BIO_TEX = { [T_BASALT]: 'basalt', [T_BASALT2]: 'basalt2', [T_CONC]: 'conc', [T_CONC + 1]: 'conc2', [T_CONC + 2]: 'conc3',
  [T_RUBBLE]: 'rubble', [T_DRUM]: 'drum', [T_DEFL]: 'defl', [T_DEFL + 1]: 'defl2' };

// ------------------------------------------------------------------ textures (8px like the others; crates and vents 16px)
// a round crater for the vents: a rim lit from the top left, a dark throat, an ember core
const VENT_ROWS = Array.from({ length: 16 }, (_, y) => Array.from({ length: 16 }, (_, x) => {
  const d = Math.hypot(x - 7.5, y - 7.5);
  return d > 7.7 ? '.' : d > 6.3 ? (x + y < 14 ? 'h' : 'k') : d > 5 ? 'K' : d > 2.6 ? 'b' : 'c';
}).join(''));
Object.assign(TEX_SRC, {
  lava0: { rows: ['oorrrdro', 'oyorrrro', 'yyyorddr', 'oyoorrrr', 'rorroooo', 'rrdroyyo', 'drrooywy', 'rrroooyo'],
    colors: { d: '#A81000', r: '#E03800', o: '#F87800', y: '#F8C838', w: '#FCF0B0' } },
  lava1: { rows: ['roorrdrr', 'ooyorrrr', 'oyyyorrd', 'ooyoorrr', 'rrorroyo', 'drrrooyy', 'rdrrooyw', 'rrrrooyo'],
    colors: { d: '#A81000', r: '#E03800', o: '#F87800', y: '#F8C838', w: '#FCF0B0' } },
  basalt: { rows: ['hhhkhhkb', 'hkkkkKkb', 'hkKkkkkb', 'kkkkKkKb', 'hkkKkkkb', 'kKkkkkKb', 'hkkkKkkb', 'bbbbbbbb'],
    colors: { h: '#6C6474', k: '#4C4454', K: '#302838', b: '#18141C' } },
  basalt2: { rows: ['hhhkhhkb', 'hkkckKkb', 'hkKkckkb', 'kkcckkKb', 'hkkKcckb', 'kKkkkckb', 'hkkkKkkb', 'bbbbbbbb'],
    colors: { h: '#6C6474', k: '#4C4454', K: '#302838', b: '#18141C', c: '#E85800' } },
  vent: { rows: VENT_ROWS, colors: { h: '#6C6070', k: '#3C3040', K: '#2C2028', b: '#140C10', c: '#701000' } },
  bog: { rows: ['bbcbbabb', 'bcebbbab', 'bbbbdbbb', 'abbbbbcb', 'bbdbbceb', 'bbbabbbb', 'cbbbbdbb', 'ebbcbbba'],
    colors: { a: '#283018', b: '#323C1C', c: '#3C4824', d: '#1C2410', e: '#566428' } },
  reeds: { rows: ['.b..b...', '.BgbB.b.', '.GgBG.Bg', 'gG.GgGG.', '.Gg.gGgG', 'GgGgGgGg', 'gGgGgGgG', 'GgGgGgGg'],
    colors: { g: '#88B040', G: '#3C6C18', b: '#7C4818', B: '#4C2808' } },
  conc: { rows: ['LLLLLLLC', 'LCCCsCCD', 'LCsCCCCD', 'LCCCCCsD', 'LsCCCCCD', 'LCCCsCCD', 'LCCCCCCD', 'CDDDDDDD'],
    colors: { L: '#C8C4B4', C: '#A8A494', s: '#8C8878', D: '#6C6858' } },
  conc2: { rows: ['LLLLLLLC', 'LCCkCCCD', 'LCsCkCCD', 'LCCCkCsD', 'LsCkCCCD', 'LCCkCCCD', 'LCCCkCCD', 'CDDDDDDD'],
    colors: { L: '#C8C4B4', C: '#A8A494', s: '#8C8878', D: '#6C6858', k: '#3C3830' } },
  conc3: { rows: ['LLL.LLLC', 'LCkkCCkD', 'LkCCkCkD', '.CCkkkCD', 'LskCCkCD', 'LCkCCkCD', 'LkCCkCC.', 'CDDD.DDD'],
    colors: { L: '#C8C4B4', C: '#A8A494', s: '#8C8878', D: '#6C6858', k: '#3C3830' } },
  rubble: { rows: ['.ab..c..', 'bb...cb.', '....a...', '.ca....b', '.bb..ab.', '....cb..', 'a.....ca', 'bc..a...'],
    colors: { a: '#8C887C', b: '#5C584C', c: '#B4B0A0' } },
  lamp: { rows: ['..mmmm..', '.myyyym.', '.myYYym.', '.myyyym.', '..mmmm..', '...kk...', '...kk...', '..kmmk..'],
    colors: { m: '#5C5C68', y: '#F8E8A0', Y: '#F8B800', k: '#2C2C34' } },
  drum: { rows: ['.rrrrrr.', 'rRhhRRRr', 'rhrrrrRd', 'rRrwwrRd', 'rRrwwrRd', 'rRrrrrRd', 'rRRRRRRd', '.dddddd.'],
    colors: { r: '#701808', R: '#C83C18', h: '#F07850', w: '#F8D838', d: '#380800' } },
  crate: { rows: ['kkkkkkkkkkkkkkkk', 'kWWWWWWWWWWWWWWk', 'kWkwwwwwwwwwwkwk', 'kWwkwwwwwwwwkwwk', 'kWwwkwwwwwwkwwwk', 'kWwwwkwwwwkwwwwk',
    'kWwwwwkwwkwwwwwk', 'kWwwwwwkkwwwwwwk', 'kWwwwwwkkwwwwwwk', 'kWwwwwkwwkwwwwwk', 'kWwwwkwwwwkwwwwk', 'kWwwkwwwwwwkwwwk',
    'kWwkwwwwwwwwkwwk', 'kWkwwwwwwwwwwkwk', 'kwwwwwwwwwwwwwwk', 'kkkkkkkkkkkkkkkk'],
  colors: { k: '#4C2400', W: '#F0B060', w: '#B76506' } },
  defl: { rows: ['BbbbbbWG', 'bbbbbWGD', 'bbbbWGDb', 'bbbWGDbb', 'bbWGDbbb', 'bWGDbbbb', 'WGDbbbbb', 'GDbbbbbB'],
    colors: { b: '#383840', B: '#24242C', W: '#F8F8F8', G: '#BCBCBC', D: '#6C6C6C' } },
  defl2: { rows: ['GWbbbbbB', 'DGWbbbbb', 'bDGWbbbb', 'bbDGWbbb', 'bbbDGWbb', 'bbbbDGWb', 'bbbbbDGW', 'BbbbbbDG'],
    colors: { b: '#383840', B: '#24242C', W: '#F8F8F8', G: '#BCBCBC', D: '#6C6C6C' } },
});

// ------------------------------------------------------------------ the three looks
THEME_ORDER.push('volcanic', 'swamp', 'city');
Object.assign(THEMES, {
  volcanic: {
    name: 'VOLCANIC', color: '#F85800', ground: '#1C100C', specks: ['#2C1810', '#341C14', '#140A08'], tint: 'rgba(255,60,0,0.05)',
    tex: { brick: { colors: { R: '#7C3420', H: '#A85C34', D: '#3C1008', M: '#4C3C38' } },
      forest: { colors: { g: '#6C5848', G: '#2C1C14' } },
      water0: { colors: { b: '#1C2C5C', w: '#5C6C9C' } }, water1: { colors: { b: '#1C2C5C', w: '#5C6C9C' } } },
    particles: { kind: 'ember', n: 24, colors: ['#F87800', '#F8B800', '#D82800', '#8C8C8C'], w: 1, h: 1, big: 0.12, fall: [0.2, 0.6], sway: 0.7 },
    paint: (x, r) => {   // dark cracks in the rock, a few still glowing
      for (let k = 0; k < FW * FH / 900; k++) {
        let px = Math.floor(r() * FW), py = Math.floor(r() * FH);
        x.fillStyle = r() < 0.2 ? '#5C1808' : '#0C0604';
        for (let s = 0; s < 4 + r() * 8; s++) { x.fillRect(px, py, 1, 1); px += r() < 0.5 ? 1 : 0; py += r() < 0.5 ? 1 : -1; }
      }
    },
  },
  swamp: {
    name: 'SWAMP', color: '#8CB040', ground: '#141A0C', specks: ['#1C2410', '#222C14', '#0E1408'],
    tex: { brick: { colors: { R: '#7C4C2C', H: '#A87040', D: '#3C2010', M: '#4C6C2C' } }, steel: { colors: { W: '#C8D0B8', G: '#8C9C7C' } },
      forest: { colors: { g: '#5C8C30', G: '#1C4010' } },
      water0: { colors: { b: '#2C4C30', w: '#7CA86C' } }, water1: { colors: { b: '#2C4C30', w: '#7CA86C' } } },
    particles: { kind: 'firefly', n: 16, colors: ['#D8F858', '#A8F818'], w: 1, h: 1 },
    mist: true,
    paint: (x, r) => {   // dark wet patches and tufts of grass
      for (let k = 0; k < FW * FH / 700; k++) {
        const px = Math.floor(r() * FW), py = Math.floor(r() * FH);
        if (r() < 0.5) { x.fillStyle = '#0A1006'; x.fillRect(px, py, 3 + Math.floor(r() * 4), 2); }
        else { x.fillStyle = '#2C4018'; x.fillRect(px, py, 1, 2); x.fillRect(px + 2, py, 1, 2); x.fillRect(px + 1, py - 1, 1, 2); }
      }
    },
  },
  city: {
    name: 'CITY RUINS', color: '#BCBCBC', ground: '#28282C', specks: ['#323236', '#202024', '#3A3A3E'],
    tex: { brick: { colors: { R: '#A04C34', H: '#C8785C', D: '#58200C', M: '#6C6C6C' } }, forest: { colors: { g: '#5C9438', G: '#1C4818' } },
      water0: { colors: { b: '#203C70', w: '#8CA8D8' } }, water1: { colors: { b: '#203C70', w: '#8CA8D8' } },
      drum: { colors: { r: '#284C7C', R: '#4C7CB8', h: '#88B8F0', w: '#F8B800', d: '#102440' } } },
    particles: { kind: 'drift', n: 16, colors: ['#8C8C8C', '#5C5C5C', '#ADADAD'], w: 1, h: 1, big: 0.2, fall: [0.1, 0.3], sway: 0.8 },
    paint: (x, r) => {   // asphalt: worn lane dashes and cracks
      x.fillStyle = '#4C4C44';
      for (let y = 40; y < FH - 24; y += 64) for (let px = 4; px < FW; px += 16) if (r() < 0.7) x.fillRect(px, y, 6, 1);
      for (let k = 0; k < FW * FH / 1200; k++) {
        let px = Math.floor(r() * FW), py = Math.floor(r() * FH);
        x.fillStyle = '#18181A';
        for (let s = 0; s < 3 + r() * 6; s++) { x.fillRect(px, py, 1, 1); px += r() < 0.5 ? 1 : -1; py += 1; }
      }
    },
  },
});
Object.assign(SEASON_ENEMY, { volcanic: 24, swamp: 25, city: 26 });
Object.assign(SEASON_FX_NAME, { volcanic: 'LAVA BOMBS', swamp: 'MARSH GAS', city: 'BLACKOUT' });

// ------------------------------------------------------------------ the three tanks
Object.assign(PALS, {
  magma: [null, '#F8A030', '#7C2C14', '#200804'],
  gator: [null, '#D8F878', '#3C7C28', '#0C2C08'],
  truck: [null, '#E8E4C8', '#6C7C30', '#141808'],
});
// MAGMA: a rock hull split by glowing seams round a molten core, a short glowing gun
TANK_GRIDS.e24 = canvasEnemyGrids(['.......1', '.......1', '......13', '111...13', '13111111', '11112222', '13123222', '11122322',
  '13122233', '11122233', '13123222', '11112322', '13112222', '11111111', '131.....', '111.....']);
// GATOR: a long snout, eyes, legs out to the sides, a tail behind; no tracks
TANK_GRIDS.e25 = canvasEnemyGrids(['......11', '.....122', '.....132', '.....122', '....1222', '...13122', '...12222', '11.12222',
  '.1112322', '...12232', '...12322', '11.12222', '.1112222', '....1222', '.....122', '......12'], false);
// ROCKET TRUCK: a cab with a windscreen up front, a rack of four rockets behind it, wheels
TANK_GRIDS.e26 = canvasEnemyGrids(['........', '....1111', '...12222', '...13333', '11.12222', '11.12222', '...11111', '...12121',
  '...13131', '11.13131', '11.13131', '...12121', '...11111', '11.12222', '11.11111', '........'], false);

// a manhole cover (16px), drawn once
let manholeImg = null;
function manholeSprite() {
  if (manholeImg) return manholeImg;
  const rows = Array.from({ length: 16 }, (_, y) => Array.from({ length: 16 }, (_, x) => {
    const d = Math.hypot(x - 7.5, y - 7.5);
    if (d > 7.6) return '.';
    if (d > 6.4) return 'k';
    if (d > 5.6) return x + y < 14 ? 'h' : 'm';
    return y % 3 === 1 ? 'k' : (x + y < 13 ? 'h' : 'm');
  }).join(''));
  manholeImg = paintRows(rows, { k: '#141418', m: '#4C4C54', h: '#7C7C88' });
  return manholeImg;
}

Object.assign(Stage.prototype, {
  // ------------------------------------------------------------ set-up
  setupBio(opts) {
    this.booms = [];   // barrels and gas about to go, lava bombs and rockets on the way
    this.blackout = 0;
    this.bioCarded = !!opts.editor;
  },

  // the terrain type's own features, placed the same way each time a stage is played (normal stages only)
  applyBiome(num) {
    const r = seeded(num * 6151 + 29), area = (COLS * ROWS) / 169;
    if (this.theme === 'volcanic') this.biomeVolcanic(r, area);
    else if (this.theme === 'swamp') this.biomeSwamp(r, area);
    else if (this.theme === 'city') this.biomeCity(r, area);
  },

  // a free 16px tile: open ground, away from the eagle (near px), the start points, entry points and pads
  bioTileFree(tx, ty, near = 56) {
    const x = tx * 16, y = ty * 16;
    if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS || y < 32 || y > FH - 48) return false;
    if (Math.hypot(x - BASE_X, y - BASE_Y) < near) return false;
    if (PLAYER_SPAWN.concat(ENEMY_SPAWNS).some(([sx, sy]) => overlap(x, y, 16, 16, sx - 16, sy - 16, 48, 48))) return false;
    if (this.pads.some(p => overlap(x, y, 16, 16, p.x - 8, p.y - 8, 32, 32))) return false;
    for (let cy = ty * 4; cy < ty * 4 + 4; cy++) for (let cx = tx * 4; cx < tx * 4 + 4; cx++) if (this.get(cx, cy) !== T_EMPTY) return false;
    return true;
  },

  bioPick(r, near, test) {
    for (let k = 0; k < 150; k++) {
      const tx = Math.floor(r() * COLS), ty = Math.floor(r() * ROWS);
      if (this.bioTileFree(tx, ty, near) && (!test || test(tx, ty))) return [tx, ty];
    }
    return null;
  },

  fillTile(tx, ty, v) { for (let cy = ty * 4; cy < ty * 4 + 4; cy++) for (let cx = tx * 4; cx < tx * 4 + 4; cx++) this.set(cx, cy, v); },

  // each connected body of one tile type (4px cells, 4-connected)
  bioGroups(v) {
    const seen = new Uint8Array(GW * GH), out = [];
    for (let i = 0; i < GW * GH; i++) {
      if (seen[i] || this.terrain[i] !== v) continue;
      const g = [i]; seen[i] = 1;
      for (let k = 0; k < g.length; k++) {
        const c = g[k], cx = c % GW, cy = (c / GW) | 0;
        for (const [dx, dy] of DXY) {
          const nx = cx + dx, ny = cy + dy, n = ny * GW + nx;
          if (nx < 0 || ny < 0 || nx >= GW || ny >= GH || seen[n] || this.terrain[n] !== v) continue;
          seen[n] = 1; g.push(n);
        }
      }
      out.push(g);
    }
    return out;
  },

  // the eagle's fortress (and what's right round it) keeps its bricks
  nearBase(cx, cy, d) { return Math.hypot(cx * 4 + 2 - BASE_X - 8, cy * 4 + 2 - BASE_Y - 8) < d; },

  biomeVolcanic(r, area) {
    // most lakes turn to lava (not one lapping at a player's start point); steel turns to basalt
    let lava = 0;
    for (const lake of this.bioGroups(T_WATER)) {
      const nearStart = lake.some(i => PLAYER_SPAWN.some(([sx, sy]) => Math.hypot((i % GW) * 4 + 2 - sx - 8, ((i / GW) | 0) * 4 + 2 - sy - 8) < 36));
      if (nearStart || r() > 0.7) continue;
      for (const i of lake) this.set(i % GW, (i / GW) | 0, T_LAVA);
      lava += lake.length;
    }
    for (let i = 0; i < GW * GH; i++) if (this.terrain[i] === T_STEEL && !this.nearBase(i % GW, (i / GW) | 0, 20)) this.set(i % GW, (i / GW) | 0, T_BASALT);
    // no lakes: a pool or two of its own
    for (let k = 0, n = lava > 20 ? 0 : Math.max(1, Math.round(1.5 * area)); k < n; k++) {
      const wide = r() < 0.5, t = this.bioPick(r, 72, (tx, ty) => this.bioTileFree(tx + (wide ? 1 : 0), ty + (wide ? 0 : 1), 72));
      if (!t) break;
      this.fillTile(t[0], t[1], T_LAVA); this.fillTile(t[0] + (wide ? 1 : 0), t[1] + (wide ? 0 : 1), T_LAVA);
    }
    // fire vents on open ground
    for (let k = 0, n = Math.max(2, Math.round((2 + r() * 2) * area)); k < n; k++) {
      const t = this.bioPick(r, 64);
      if (t) this.fillTile(t[0], t[1], T_VENT);
    }
  },

  biomeSwamp(r, area) {
    // mud is bog here, and there's more of it
    for (let i = 0; i < GW * GH; i++) if (this.terrain[i] === T_MUD) this.set(i % GW, (i / GW) | 0, T_BOG);
    for (let k = 0, n = Math.round((2 + r()) * area); k < n; k++) {
      const t = this.bioPick(r, 48);
      if (!t) break;
      const cx = t[0] * 4 + 2, cy = t[1] * 4 + 2, rad = 3 + r() * 2.5;
      for (let y = Math.floor(cy - rad); y <= cy + rad; y++) for (let x = Math.floor(cx - rad); x <= cx + rad; x++) {
        if (Math.hypot(x + 0.5 - cx, y + 0.5 - cy) > rad || this.get(x, y) !== T_EMPTY || this.nearBase(x, y, 40) || y < 8) continue;
        if (PLAYER_SPAWN.some(([sx, sy]) => overlap(x * 4, y * 4, 4, 4, sx - 4, sy - 4, 24, 24))) continue;
        this.set(x, y, T_BOG);
      }
    }
    // reeds along the shores (8px blocks next to water, fewer by the bog), and in place of some of the trees
    const blk = (bx, by, v) => [0, 1, 2, 3].every(k => this.get(bx * 2 + (k & 1), by * 2 + (k >> 1)) === v);
    const reeds = [];
    for (let by = 2; by < GH / 2 - 1; by++) for (let bx = 0; bx < GW / 2; bx++) {
      if (!blk(bx, by, T_EMPTY) || this.nearBase(bx * 2, by * 2, 36)) continue;
      if (PLAYER_SPAWN.concat(ENEMY_SPAWNS).some(([sx, sy]) => overlap(bx * 8, by * 8, 8, 8, sx, sy, 16, 16))) continue;
      let wet = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (dx || dy) wet = Math.max(wet, blk(bx + dx, by + dy, T_WATER) ? 0.55 : this.get((bx + dx) * 2, (by + dy) * 2) === T_BOG ? 0.3 : 0);
      if (wet && r() < wet) reeds.push([bx, by]);
    }
    for (const [bx, by] of reeds) this.setBlock(bx, by, T_REEDS);
    for (let by = 0; by < GH / 2; by++) for (let bx = 0; bx < GW / 2; bx++) if (blk(bx, by, T_FOREST) && r() < 0.35) this.setBlock(bx, by, T_REEDS);
    // pockets of gas on the bog
    const bogs = [];
    for (let by = 0; by < GH / 2; by++) for (let bx = 0; bx < GW / 2; bx++) if (blk(bx, by, T_BOG)) bogs.push([bx, by]);
    for (let k = 0, n = Math.round((2 + r() * 2) * area); k < n && bogs.length; k++) {
      const [bx, by] = bogs.splice(Math.floor(r() * bogs.length), 1)[0];
      this.setBlock(bx, by, T_GAS);
    }
  },

  biomeCity(r, area) {
    // many walls are concrete; parks are rubble
    for (let ty = 0; ty < ROWS; ty++) for (let tx = 0; tx < COLS; tx++) {
      let brick = 0, tree = 0;
      for (let cy = ty * 4; cy < ty * 4 + 4; cy++) for (let cx = tx * 4; cx < tx * 4 + 4; cx++) { const v = this.get(cx, cy); if (v === T_BRICK) brick++; else if (v === T_FOREST) tree++; }
      if (brick && r() < 0.45 && !this.nearBase(tx * 4 + 2, ty * 4 + 2, 40)) {
        for (let cy = ty * 4; cy < ty * 4 + 4; cy++) for (let cx = tx * 4; cx < tx * 4 + 4; cx++) if (this.get(cx, cy) === T_BRICK) this.set(cx, cy, T_CONC);
      }
      if (tree && r() < 0.5) for (let cy = ty * 4; cy < ty * 4 + 4; cy++) for (let cx = tx * 4; cx < tx * 4 + 4; cx++) if (this.get(cx, cy) === T_FOREST) this.set(cx, cy, T_RUBBLE);
    }
    // fuel drums in ones, twos and threes
    for (let k = 0, n = Math.round((2 + r()) * area); k < n; k++) this.drumTile(r, 64);
    // manholes: one pair (two on a big field), one each side
    for (let k = 0, pairs = area > 2 ? 2 : 1; k < pairs; k++) {
      const a = this.bioPick(r, 48, tx => tx < COLS / 2 - 1), b = a && this.bioPick(r, 48, tx => tx > COLS / 2);
      if (!a || !b) break;
      const i = this.pads.length;
      this.pads.push({ x: a[0] * 16, y: a[1] * 16, pair: i + 1, kind: 'hole' }, { x: b[0] * 16, y: b[1] * 16, pair: i, kind: 'hole' });
    }
    // street lamps beside the walls, and rubble here and there
    const wall = v => v === T_BRICK || isConc(v) || v === T_STEEL;
    const lampOk = (bx, by) => [0, 1, 2, 3].every(k => this.get(bx * 2 + (k & 1), by * 2 + (k >> 1)) === T_EMPTY) && by >= 4 && !this.nearBase(bx * 2, by * 2, 44)
      && !PLAYER_SPAWN.concat(ENEMY_SPAWNS).some(([sx, sy]) => overlap(bx * 8, by * 8, 8, 8, sx - 8, sy - 8, 32, 32))
      && !this.pads.some(p => overlap(bx * 8, by * 8, 8, 8, p.x, p.y, 16, 16));
    for (let k = 0, placed = 0, n = Math.round(5 * area); k < 400 && placed < n; k++) {
      const bx = Math.floor(r() * GW / 2), by = Math.floor(r() * GH / 2);
      if (!lampOk(bx, by) || !DXY.some(([dx, dy]) => wall(this.get((bx + dx) * 2, (by + dy) * 2)))) continue;
      if (this.terrain.some((v, i) => v === T_LAMP && Math.abs((i % GW) - bx * 2) + Math.abs(((i / GW) | 0) - by * 2) < 12)) continue;
      this.setBlock(bx, by, T_LAMP); placed++;
    }
    for (let k = 0, n = Math.round(6 * area); k < n; k++) {
      const bx = Math.floor(r() * GW / 2), by = Math.floor(r() * GH / 2);
      if (lampOk(bx, by)) this.setBlock(bx, by, T_RUBBLE);
    }
  },

  // a tile with one to three barrels in it
  drumTile(r, near) {
    const t = this.bioPick(r, near);
    if (!t) return;
    const n = 1 + Math.floor(r() * 3), ks = [0, 1, 2, 3];
    for (let k = 0; k < n; k++) { const q = ks.splice(Math.floor(r() * ks.length), 1)[0]; this.setBlock(t[0] * 2 + (q & 1), t[1] * 2 + (q >> 1), T_DRUM); }
  },

  // the elements for any stage (terrain.js: after mud, pads and belts, from the same dice)
  addBioExtras(num, r, area) {
    if (num >= 4 && r() < 0.7) for (let k = 0, n = Math.max(1, Math.round(area)); k < n; k++) { const t = this.bioPick(r, 48); if (t) this.fillTile(t[0], t[1], T_CRATE); }
    if (num >= 6 && r() < 0.55) for (let k = 0, n = Math.max(1, Math.round(1.5 * area)); k < n; k++) this.drumTile(r, 64);
    if (num >= 10 && r() < 0.5) {
      for (let k = 0, n = Math.max(1, Math.round(area)); k < n; k++) {
        const t = this.bioPick(r, 48);
        if (!t) break;
        // a diagonal across the tile: '/' or '\'
        const [tx, ty] = t, back = r() < 0.5;
        this.setBlock(tx * 2 + (back ? 0 : 1), ty * 2, T_DEFL + (back ? 1 : 0));
        this.setBlock(tx * 2 + (back ? 1 : 0), ty * 2 + 1, T_DEFL + (back ? 1 : 0));
      }
    }
  },

  // a card for each new kind of ground on the field, the first time ever
  bioCards() {
    const has = new Set(this.terrain);
    for (const [v, ...alt] of [[T_LAVA], [T_BASALT, T_BASALT2], [T_VENT], [T_BOG], [T_REEDS], [T_GAS], [T_CONC, T_CONC + 1, T_CONC + 2], [T_DRUM], [T_CRATE], [T_DEFL, T_DEFL + 1]]) {
      if (has.has(v) || alt.some(a => has.has(a))) this.encounter('t' + v);
    }
    if (this.pads.some(p => p.kind === 'hole')) this.encounter('t' + MANHOLE_CARD);
  },

  // ------------------------------------------------------------ every frame
  updateBio() {
    if (!this.bioCarded) { this.bioCarded = true; this.bioCards(); }
    if (this.blackout > 0) this.blackout--;
    if (this.booms.length) this.updateBooms();
    this.updateVents();
    for (const t of this.tanks) if (t.alive) this.bioTank(t);
  },

  // lava, bog, and the terrain types' own tanks
  bioTank(t) {
    const kind = t.isPlayer ? '' : kindOf(t), air = t.hopT > 0 || t.burrow > 0 || t.mirage, c = this.cellUnder(t);
    t.lavaNear = false;
    if (!air && kind !== 'magma' && !t.boost.ghost) {
      if (c === T_LAVA) { this.lavaDeath(t); return; }
      if (t.isPlayer) t.lavaNear = this.underTank(t, T_LAVA);
    }
    // the bog: still, you sink; moving, you work your way back up
    // (a slow tank in the bog doesn't get a pixel further every frame: trying to drive counts)
    const bog = c === T_BOG && !t.hover && !t.boost.ghost && !air;
    const moved = t.x !== t.lx || t.y !== t.ly || (t.isPlayer ? t.moving : !(t.hold > 0) && !(t.blocked > 4));
    t.lx = t.x; t.ly = t.y;
    const held = t.frozen > 0 || t.stun > 0 || (t.isPlayer ? this.freezeP > 0 : this.freezeE > 0);
    if (bog && !held) {
      t.sink = Math.max(0, (t.sink || 0) + (moved ? -2 : 1));
      if (t.isPlayer && t.sink === 90) this.popups.push({ x: t.x + 8, y: t.y - 4, text: 'SINKING!', label: true, color: '#A8C850', t: 0, delay: 0, life: 60 });
      if (t.sink >= SINK_MAX) {
        t.sink = 60;
        this.popups.push({ x: t.x + 8, y: t.y - 4, text: 'GLUG!', label: true, color: '#A8C850', t: 0, delay: 0, life: 60 });
        Sound.play('sink');
        if (t.isPlayer) this.hitPlayer(t); else this.hitEnemy(t, null);
      }
    } else if (!bog && t.sink > 0) t.sink = Math.max(0, t.sink - 4);
    if (kind === 'magma') this.magmaTrail(t);
    else if (kind === 'gator') this.gatorStep(t);
  },

  // is there a cell of v under the tank (its body, not the very edge)?
  underTank(t, v) {
    for (let cy = (t.y + 1) >> 2; cy <= (t.y + 14) >> 2; cy++) for (let cx = (t.x + 1) >> 2; cx <= (t.x + 14) >> 2; cx++) if (this.get(cx, cy) === v) return true;
    return false;
  },

  // into the lava: gone, whatever armour you had
  lavaDeath(t) {
    this.addFx(t.x + 8, t.y + 8, BIG_EXPLOSION(), 5);
    this.popups.push({ x: t.x + 8, y: t.y - 4, text: 'MELTED!', label: true, color: '#F87800', t: 0, delay: 0, life: 70 });
    Sound.play('lava');
    if (t.isPlayer) {
      t.shield = 0; t.plates = 0;
      if (t.ship) { t.ship = false; if (t.player) t.player.ship = false; }
      this.hitPlayer(t);
    } else this.killEnemy(t, null, false);
  },

  // magma: every few steps the ground it has just left catches fire for a while (it burns only you: foe)
  magmaTrail(t) {
    if (!this.fires || Math.abs(t.x - (t.mx || 0)) + Math.abs(t.y - (t.my || 0)) < 8) return;
    t.mx = t.x; t.my = t.y;
    const [dx, dy] = DXY[t.dir], x = (t.x + 8 - dx * 10) >> 2, y = (t.y + 8 - dy * 10) >> 2;
    for (const [ox, oy] of [[0, 0], [dy, dx]]) {
      const i = (y + oy) * GW + x + ox;
      if (this.get(x + ox, y + oy) < 0) continue;
      this.ignite(i, true);
      const f = this.fires.get(i);
      if (f) f.foe = true;
    }
  },

  // ------------------------------------------------------------ gator
  // in the water it's under (shells pass over it); it waits for a tank to come in line, surfaces, lunges and bites
  gatorAct(t) {
    if (t.snap > 0 || t.lunge > 0 || t.hold > 0) return;
    if ((t.cd = (t.cd || 0) - 1) > 0) return;
    for (const o of this.tanks) {
      if (!o.isPlayer || !o.alive || o.boost.smoke) continue;
      const dx = o.x - t.x, dy = o.y - t.y, d = Math.abs(dx) + Math.abs(dy);
      if ((Math.abs(dx) > 6 && Math.abs(dy) > 6) || d > LUNGE_RANGE || d < 4 || !this.sightLine(t.x + 8, t.y + 8, o.x + 8, o.y + 8)) continue;
      this.faceTarget(t, o.x + 8, o.y + 8);
      t.snap = 30; t.hold = 30; t.reveal = 60; t.sub = false;
      Sound.play('gator');
      return;
    }
    t.cd = 8;
  },

  gatorStep(t) {
    t.hover = true;
    t.sub = !(t.snap > 0) && !(t.lunge > 0) && this.cellUnder(t) === T_WATER;
    if (this.freezeE > 0 || t.stun > 0) return;
    if (t.snap > 0 && --t.snap === 0) t.lunge = LUNGE_TIME;
    if (!(t.lunge > 0)) return;
    t.lunge--;
    t.hold = Math.max(t.hold, 2);
    for (let k = 0; k < 3; k++) {
      const prey = this.tanks.find(o => o.alive && o.isPlayer && overlap(t.x - 2, t.y - 2, 20, 20, o.x, o.y, 16, 16));
      if (prey) { this.gatorBite(t, prey); return; }
      if (!this.canStep(t, t.dir)) { t.lunge = 0; t.cd = 90; return; }
      t.x += DXY[t.dir][0]; t.y += DXY[t.dir][1];
    }
    if (!t.lunge) t.cd = 120;
  },

  gatorBite(t, o) {
    const armoured = o.shield > 0 || o.plates > 0 || o.ship;
    this.hitPlayer(o);
    this.popups.push({ x: o.x + 8, y: o.y, text: 'CHOMP!', label: true, color: '#B8F818', t: 0, delay: 0, life: 60 });
    Sound.play('chomp');
    t.lunge = 0; t.cd = 150; t.hold = 30;
    if (armoured) this.turn(t, (t.dir + 2) % 4);   // it bit on armour: it lets go
  },

  // ------------------------------------------------------------ rocket truck
  // it remembers where it last saw you and sends three rockets there; the spot is marked while they fly
  truckAct(t) {
    for (const o of this.tanks) {
      if (!o.isPlayer || !o.alive || o.boost.smoke || Math.hypot(o.x - t.x, o.y - t.y) > TRUCK_SIGHT) continue;
      if (this.sightLine(t.x + 8, t.y + 8, o.x + 8, o.y + 8)) { t.seen = [o.x + 8, o.y + 8, this.frame]; break; }
    }
    if (t.hold > 0 || (t.cd = (t.cd || 0) - 1) > 0) return;
    const s = t.seen;
    if (!s || this.frame - s[2] > 360 || Math.hypot(s[0] - t.x - 8, s[1] - t.y - 8) < 40) { t.cd = 20; return; }
    this.faceTarget(t, s[0], s[1]);
    t.hold = 40; t.reveal = 60;
    for (let k = 0; k < 3; k++) {
      const x = Math.max(6, Math.min(FW - 6, s[0] + rnd(25) - 12)), y = Math.max(6, Math.min(FH - 6, s[1] + rnd(25) - 12));
      this.booms.push({ key: 'r' + this.frame + k, kind: 'rocket', x, y, t: SALVO_TIME + k * 10, sx: t.x + 8, sy: t.y + 8, by: t });
    }
    t.cd = Math.round((300 + rnd(120)) / Config.scale('enemyFire') / Config.skill().fire);
    Sound.play('salvo');
  },

  // ------------------------------------------------------------ vents
  // the 16px tiles with a vent in them (from a list of vent cells)
  ventsOf(cells) {
    const seen = new Set(), out = [];
    for (const i of cells) {
      const tx = (i % GW) >> 2, ty = ((i / GW) | 0) >> 2, k = ty * COLS + tx;
      if (seen.has(k)) continue;
      seen.add(k);
      out.push({ x: tx * 16, y: ty * 16, off: ((tx * 73 + ty * 151) % 9) * 37 });
    }
    return out;
  },

  ventTiles() {
    if (this.vents && this.ventFor === this.terrainVer) return this.vents;
    const cells = [];
    for (let i = 0; i < GW * GH; i++) if (this.terrain[i] === T_VENT) cells.push(i);
    this.vents = this.ventsOf(cells); this.ventFor = this.terrainVer;
    return this.vents;
  },

  // where a vent is in its cycle: quiet, then VENT_WARN frames of bubbling, then VENT_FIRE frames of fire
  ventPhase(v) { return (this.frame + v.off) % VENT_PERIOD; },

  updateVents() {
    const vs = this.ventTiles(), fire0 = VENT_PERIOD - VENT_FIRE;
    let roar = false;
    for (const v of vs) {
      const ph = this.ventPhase(v);
      if (ph < fire0) continue;
      if (ph === fire0) { roar = true; this.bioHeat(v.x + 8, v.y + 8, 14, null); }
      const key = v.x + ',' + v.y + ',' + Math.floor((this.frame + v.off) / VENT_PERIOD);
      for (const t of this.tanks.slice()) {
        if (!t.alive || t.hopT > 0 || t.burrow > 0 || t.mirage || t.sub || t.ventHit === key || (!t.isPlayer && kindOf(t) === 'magma')) continue;
        if (!overlap(t.x + 2, t.y + 2, 12, 12, v.x + 2, v.y + 2, 12, 12)) continue;
        t.ventHit = key;
        if (t.isPlayer) this.hitPlayer(t); else this.hitEnemy(t, null);
      }
    }
    if (roar) Sound.play('vent');
  },

  // fire nearby: reeds catch, gas and barrels go
  bioHeat(x, y, r, by) {
    for (let cy = Math.floor((y - r) / 4); cy <= Math.floor((y + r) / 4); cy++) for (let cx = Math.floor((x - r) / 4); cx <= Math.floor((x + r) / 4); cx++) {
      const v = this.get(cx, cy);
      if (v === T_REEDS && this.fires) this.ignite(cy * GW + cx, false);
      else if (v === T_GAS || v === T_DRUM) this.bioIgnite(cx, cy, by);
    }
  },

  // ------------------------------------------------------------ explosions: barrels, gas, bombs, rockets
  bioIgnite(cx, cy, by) {
    const v = this.get(cx, cy);
    if (v === T_GAS) this.igniteGas(cx, cy, by);
    else if (v === T_DRUM) this.lightDrum(cx, cy, by, DRUM_FUSE);
  },

  // a barrel (an 8px block) set to blow in a few frames (by: whose shot it was)
  lightDrum(cx, cy, by, delay = DRUM_FUSE) {
    const bx = cx >> 1, by8 = cy >> 1, key = 'd' + bx + ',' + by8;
    if (this.booms.some(q => q.key === key)) return;
    this.booms.push({ key, kind: 'drum', x: bx * 8 + 4, y: by8 * 8 + 4, t: Math.max(1, delay), by });
  },

  // the whole pocket of gas goes: each 8px block a moment after the one before, outward from the spark
  igniteGas(cx, cy, by) {
    if (this.booms.some(q => q.key === 'g' + (cx >> 1) + ',' + (cy >> 1))) return;
    const start = cy * GW + cx, seen = new Set([start]), q = [start], blocks = new Map();
    for (let k = 0; k < q.length; k++) {
      const i = q[k], x = i % GW, y = (i / GW) | 0;
      blocks.set('g' + (x >> 1) + ',' + (y >> 1), [x >> 1, y >> 1]);
      for (const [dx, dy] of DXY) {
        const nx = x + dx, ny = y + dy, n = ny * GW + nx;
        if (nx < 0 || ny < 0 || nx >= GW || ny >= GH || seen.has(n) || this.terrain[n] !== T_GAS) continue;
        seen.add(n); q.push(n);
      }
    }
    for (const [key, [bx, by8]] of blocks) {
      if (this.booms.some(b => b.key === key)) continue;
      const d = Math.abs(bx - (cx >> 1)) + Math.abs(by8 - (cy >> 1));
      this.booms.push({ key, kind: 'gas', x: bx * 8 + 4, y: by8 * 8 + 4, t: GAS_FUSE + d * 3, by });
    }
    Sound.play('gas');
  },

  updateBooms() {
    for (const q of this.booms) {
      if (q.done || --q.t > 0) continue;
      q.done = true;
      if (q.kind === 'drum' || q.kind === 'gas') {
        // whatever of it is still there goes up
        const bx = (q.x - 4) >> 3, by = (q.y - 4) >> 3, v = q.kind === 'drum' ? T_DRUM : T_GAS;
        let n = 0;
        for (let k = 0; k < 4; k++) {
          const cx = bx * 2 + (k & 1), cy = by * 2 + (k >> 1);
          if (this.get(cx, cy) === v) { this.set(cx, cy, v === T_GAS && this.theme === 'swamp' ? T_BOG : T_EMPTY); n++; }
        }
        if (n) this.bioBoom(q.x, q.y, v === T_DRUM ? DRUM_R : GAS_R, q.by, true);
      } else if (q.kind === 'bomb') this.bioBoom(q.x, q.y, BOMB_R, null, false, true);
      else if (q.kind === 'rocket') this.bioBoom(q.x, q.y, SALVO_R, q.by, false, false, true);
    }
    this.booms = this.booms.filter(q => !q.done);
  },

  // an explosion out of the ground: it breaks bricks, sets off what's near and hurts every tank in reach, both sides.
  // base: it can take the eagle (a barrel can); fire: the ground burns after (a lava bomb); foe: only players (rockets)
  bioBoom(x, y, r, by, base, fire, foe) {
    const pl = by && by.isPlayer ? by : null, wrecked = { brick: 0, steel: 0 };
    for (let cy = Math.floor((y - r) / 4); cy <= Math.floor((y + r) / 4); cy++) for (let cx = Math.floor((x - r) / 4); cx <= Math.floor((x + r) / 4); cx++) {
      if (Math.hypot(cx * 4 + 2 - x, cy * 4 + 2 - y) > r) continue;
      const v = this.get(cx, cy);
      if (v === T_BRICK) { this.set(cx, cy, T_EMPTY); wrecked.brick++; }
      else if (v >= T_LAVA) this.bioBlastCell(cx, cy, v, false, pl, wrecked);
    }
    if (pl) this.wreckPoints(pl, wrecked, x, y);
    this.explosionHeat(x, y, r + 4);
    if (fire && this.fires) this.igniteAt(x, y, 7, true);
    const reaches = (tx, ty, w, h) => Math.hypot(Math.max(tx, Math.min(x, tx + w)) - x, Math.max(ty, Math.min(y, ty + h)) - y) < r - 2;
    for (const t of this.tanks.slice()) {
      if (!t.alive || t.burrow > 0 || t.hopT > 0 || t.sub || !reaches(t.x, t.y, 16, 16)) continue;
      if (t.isPlayer) this.hitPlayer(t, pl && pl !== t ? pl : undefined);
      else if (!foe && !(fire && kindOf(t) === 'magma')) this.hitEnemy(t, pl, true);
    }
    if (base && !this.noBase && this.baseAlive && reaches(BASE_X, BASE_Y, 16, 16)) this.destroyBase();
    this.addFx(x, y, BIG_EXPLOSION(), 4);
    Sound.play(base ? 'barrel' : 'explode');
  },

  // what a blast does to one cell of the new ground
  bioBlastCell(cx, cy, v, power, pl, wrecked) {
    if (isConc(v)) { this.crackConcrete(cx, cy, v, power ? 2 : 1); if (wrecked) wrecked.brick++; }
    else if (isBasalt(v)) { if (power && !this.hardSteel) this.crackBasalt(cx, cy, v); }
    else if (v === T_DRUM) this.lightDrum(cx, cy, pl, DRUM_FUSE);
    else if (v === T_GAS) this.igniteGas(cx, cy, pl);
    else if (v === T_CRATE) this.breakCrate(cx, cy, pl);
    else if (v === T_LAMP) this.lampDown(cx, cy);
    else if (v === T_REEDS && this.fires) this.ignite(cy * GW + cx, false);
  },

  crackConcrete(cx, cy, v, dmg) { const n = v + dmg; this.set(cx, cy, n > T_CONC + 2 ? T_RUBBLE : n); },

  // basalt cracks, then breaks
  crackBasalt(cx, cy) { const v = this.get(cx, cy); if (isBasalt(v)) this.set(cx, cy, v === T_BASALT ? T_BASALT2 : T_EMPTY); },

  lampDown(cx, cy) {
    const bx = cx & ~1, by = cy & ~1;
    for (let y = by; y < by + 2; y++) for (let x = bx; x < bx + 2; x++) if (this.get(x, y) === T_LAMP) this.set(x, y, T_RUBBLE);
    this.addFx(bx * 4 + 4, by * 4 + 4, [Sprites.sparkle[1], Sprites.sparkle[0]], 3);
  },

  // a crate (a whole 16px tile) splinters; a player's shot gets what was in it: a power-up or points
  breakCrate(cx, cy, pl) {
    const tx = cx >> 2, ty = cy >> 2;
    let n = 0;
    for (let y = ty * 4; y < ty * 4 + 4; y++) for (let x = tx * 4; x < tx * 4 + 4; x++) if (this.get(x, y) === T_CRATE) { this.set(x, y, T_EMPTY); n++; }
    if (!n) return;
    const x = tx * 16, y = ty * 16;
    this.addFx(x + 8, y + 8, Sprites.smallExp, 3);
    Sound.play('crate');
    if (!pl || !pl.player) return;
    if (!this.powerup && !this.vs && Math.random() < 0.4) {
      this.spawnPowerup();
      if (this.powerup) { this.powerup.x = Math.min(FW - 16, x); this.powerup.y = Math.min(FH - 16, y); }
      return;
    }
    const pts = [100, 200, 300, 500][rnd(4)];
    this.addScore(pl.player, pts);
    this.popups.push({ x: x + 8, y: y + 8, text: String(pts), t: 0, delay: 0 });
  },

  // ------------------------------------------------------------ shells
  // every step of a shell: deflectors turn it, gas catches (once it's clear of the gun)
  bioShell(b, dist) {
    b.trav = (b.trav || 0) + dist;
    const cx = Math.floor((b.x + 2) / 4), cy = Math.floor((b.y + 2) / 4), v = this.get(cx, cy);
    if (isDefl(v)) {
      const key = (cy >> 1) * GW + (cx >> 1);
      if (b.defl === key) return false;
      b.defl = key;
      b.dir = (v === T_DEFL ? [1, 0, 3, 2] : [3, 2, 1, 0])[b.dir];
      b.x = (cx >> 1) * 8 + 2; b.y = (cy >> 1) * 8 + 2;
      Sound.play('deflect');
    } else if (v === T_GAS && b.trav > 10) this.igniteGas(cx, cy, b.owner);
    return false;
  },

  // a shell hitting a cell of the new ground (true: something broke)
  bioHitCell(cx, cy, v, b, n) {
    const pl = b.isPlayer ? b.owner : null;
    if (isConc(v)) { this.crackConcrete(cx, cy, v, b.power ? 2 : 1); n.brick++; return true; }
    if (isBasalt(v)) { if (b.power && !this.hardSteel) { this.crackBasalt(cx, cy); return true; } return false; }
    if (v === T_DRUM) { this.lightDrum(cx, cy, b.owner, 1); return true; }
    if (v === T_CRATE) { this.breakCrate(cx, cy, pl); return true; }
    if (v === T_LAMP) { this.lampDown(cx, cy); return true; }
    if (v === T_REEDS && b.cutter) { this.clearGroup(cx, cy, T_REEDS); n.tree++; return true; }
    return false;
  },

  // a piercing shell punches through concrete, crates and lamps
  bioPierceCell(cx, cy, v, b, n) {
    if (isConc(v)) { this.set(cx, cy, T_RUBBLE); n.brick++; }
    else if (v === T_CRATE) this.breakCrate(cx, cy, b.isPlayer ? b.owner : null);
    else if (v === T_LAMP) this.lampDown(cx, cy);
    else if (v === T_REEDS && b.cutter) { this.clearGroup(cx, cy, T_REEDS); n.tree++; }
  },

  // a laser beam meets a cell (true: it stops there)
  bioBeam(cx, cy, v, att, cut) {
    if (v === T_GAS) { this.igniteGas(cx, cy, att); return false; }
    if (v === T_DRUM) { this.lightDrum(cx, cy, att, 1); return true; }
    if (v === T_CRATE) { this.breakCrate(cx, cy, att); return true; }
    if (v === T_LAMP) { this.lampDown(cx, cy); return true; }
    if (isConc(v)) { if (cut) this.crackConcrete(cx, cy, v, 1); return true; }
    return bioSolid(v);
  },

  // a flame (yours, the flamer's) on reeds, gas or a barrel
  bioFlame(cx, cy, v, att, safe) {
    if (v === T_REEDS) { if (this.fires) this.ignite(cy * GW + cx, false, safe); else this.set(cx, cy, T_EMPTY); }
    else this.bioIgnite(cx, cy, att);
  },

  // can t drive onto a cell of v?
  bioBlocks(t, v) {
    if (v === T_LAVA) return (!t.isPlayer && kindOf(t) !== 'magma') || !!t.ally || !!(t.player && t.player.bot);
    if (isBasalt(v) || isDefl(v)) return true;
    if (v === T_CRATE || v === T_LAMP) return !t.boost.ghost && !t.crusher;
    if (isConc(v) || v === T_DRUM) return !t.boost.ghost;
    return false;
  },

  // a sapper's blade: crates and lamps go under it
  bioCrush(cx, cy, v) { if (v === T_CRATE) this.breakCrate(cx, cy, null); else if (v === T_LAMP) this.lampDown(cx, cy); },

  // ------------------------------------------------------------ the twists
  bioEvent(s) {
    if (s === 'volcanic') { this.lavaBombs(); this.seaT = 900 + rnd(700); return true; }
    if (s === 'swamp') { this.marshGas(); this.seaT = 700 + rnd(600); return true; }
    // a blackout now and then, not every half minute: half the time the lights just hold
    if (s === 'city' && Math.random() < 0.5) { this.seaT = 1800 + rnd(1800); return true; }
    if (s === 'city') { this.blackout = BLACKOUT_TIME; this.seaT = BLACKOUT_TIME + 3600 + rnd(2400); this.seasonNote('BLACKOUT!', '#F8D878'); Sound.play('blackout'); return true; }
    return false;
  },

  // bombs out of the volcano: one near each of you, the rest anywhere on the screen
  lavaBombs() {
    const ps = this.tanks.filter(t => t.isPlayer && t.alive && !t.ally), n = 3 + rnd(3) + (FW * FH > 208 * 208 * 2 ? 2 : 0), spots = [];
    for (let tries = 0; spots.length < n && tries < 100; tries++) {
      const p = ps[spots.length];
      const x = p ? p.x + 8 + rnd(25) - 12 : (this.camX || 0) + 16 + rnd(VIEW_W - 32), y = p ? p.y + 8 + rnd(25) - 12 : (this.camY || 0) + 16 + rnd(VIEW_H - 32);
      if (x < 8 || y < 8 || x > FW - 8 || y > FH - 8 || Math.hypot(x - BASE_X - 8, y - BASE_Y - 8) < 44) continue;
      if (spots.some(q => Math.hypot(q[0] - x, q[1] - y) < 24)) continue;
      spots.push([x, y]);
    }
    spots.forEach(([x, y], k) => this.booms.push({ key: 'b' + this.frame + k, kind: 'bomb', x, y, t: BOMB_TIME + k * 12, by: null }));
    this.seasonNote('ERUPTION!', '#F87800');
    Sound.play('rumble');
  },

  // new gas bubbles up out of the bog
  marshGas() {
    let gas = 0;
    for (const v of this.terrain) if (v === T_GAS) gas++;
    if (gas >= 48) return;
    const spots = [];
    for (let by = 0; by < GH / 2; by++) for (let bx = 0; bx < GW / 2; bx++) {
      if (![0, 1, 2, 3].every(k => this.get(bx * 2 + (k & 1), by * 2 + (k >> 1)) === T_BOG)) continue;
      if (!this.tanks.some(t => t.alive && overlap(t.x, t.y, 16, 16, bx * 8 - 4, by * 8 - 4, 16, 16))) spots.push([bx, by]);
    }
    for (let k = 0; k < 2 && spots.length; k++) {
      const [bx, by] = spots.splice(rnd(spots.length), 1)[0];
      this.setBlock(bx, by, T_GAS);
      if (!k) { this.seasonNote('MARSH GAS', '#A8E040', bx * 8 + 4, by * 8); this.encounter('t' + T_GAS); }
    }
  },

  // a blackout with the lights flickering as they go and as they come back
  lightsOut() {
    const b = this.blackout;
    if (!(b > 0)) return false;
    if (b > BLACKOUT_TIME - 40 || b < 40) return ((this.frame >> 2) * 7 + (b >> 3)) % 3 !== 0;
    return true;
  },

  // the corridor moved everything down S pixels
  bioShift(S) {
    for (const q of this.booms) { q.y += S; if (q.sy !== undefined) q.sy += S; }
    this.booms = this.booms.filter(q => q.y < FH);
  },

  // ------------------------------------------------------------ online
  bioView() {
    const K = { drum: 0, gas: 1, bomb: 2, rocket: 3 };
    return this.booms.length || this.blackout ? [this.booms.map(q => [K[q.kind], q.x, q.y, q.t, q.sx || 0, q.sy || 0]), this.blackout] : null;
  },

  applyBioView(bz) {
    const K = ['drum', 'gas', 'bomb', 'rocket'];
    this.booms = bz ? bz[0].map(a => ({ kind: K[a[0]], x: a[1], y: a[2], t: a[3], sx: a[4], sy: a[5] })) : [];
    this.blackout = bz ? bz[1] : 0;
  },

  // ------------------------------------------------------------ drawing
  // one cell into the terrain layers (buildLayers / redrawCells); the moving ones are listed for every frame
  bioCell(bg, fo, v, cx, cy, tex) {
    const L = this.bioL, i = cy * GW + cx;
    const draw = (ctx, im) => texCell(ctx, im, cx, cy);   // 8px textures, 16px crates and vents (and blocks)
    if (v === T_LAVA) { if (L) L.lava.push(i); }
    else if (v === T_GAS) { draw(bg, tex.bog); if (L) L.gas.push(i); }
    else if (v === T_VENT) { draw(bg, tex.vent); if (L) L.vent.push(i); }
    else if (v === T_BOG) { draw(bg, tex.bog); if (L) L.bog.push(i); }
    else if (v === T_LAMP) { draw(bg, tex.lamp); if (L) L.lamp.push(i); }
    else if (v === T_REEDS) draw(fo, tex.reeds);
    else if (v === T_CRATE) draw(bg, tex.crate);
    else if (BIO_TEX[v]) draw(bg, tex[BIO_TEX[v]]);
  },

  // the glowing rim round the lava, on the open ground beside it (worked out once per drawing of the layers)
  lavaEdges() {
    const L = this.bioL;
    if (L.edges) return L.edges;
    const e = [];
    for (const i of L.lava) {
      const cx = i % GW, cy = (i / GW) | 0, x = cx * 4, y = cy * 4;
      const out = (nx, ny) => { const v = nx >= 0 && ny >= 0 && nx < GW && ny < GH ? this.terrain[ny * GW + nx] : T_LAVA; return v !== T_LAVA && v !== T_BRICK && v !== T_STEEL && !bioSolid(v); };
      if (out(cx, cy - 1)) e.push([x, y - 1, 4, 1, x, y - 2, 4, 1]);
      if (out(cx, cy + 1)) e.push([x, y + 4, 4, 1, x, y + 5, 4, 1]);
      if (out(cx - 1, cy)) e.push([x - 1, y, 1, 4, x - 2, y, 1, 4]);
      if (out(cx + 1, cy)) e.push([x + 4, y, 1, 4, x + 5, y, 1, 4]);
    }
    L.edges = e;
    return e;
  },

  // on the ground, under the tanks: lava and its rim, bubbling bog, vents, gas, lamps' light, manholes are pads
  renderBio(ctx) {
    const L = this.bioL;
    if (!L) return;
    const f = this.frame, tex = themeTex(this.theme);
    if (L.lava.length) {
      const lt = tex[(f >> 4) & 1 ? 'lava1' : 'lava0'];
      for (const i of L.lava) texCell(ctx, lt, i % GW, (i / GW) | 0);
      const E = this.lavaEdges(), hot = (f >> 3) & 1;
      ctx.fillStyle = hot ? '#F8B800' : '#F87800';
      for (const q of E) ctx.fillRect(q[0], q[1], q[2], q[3]);
      ctx.fillStyle = hot ? 'rgba(248,88,0,0.6)' : 'rgba(200,40,0,0.45)';
      for (const q of E) ctx.fillRect(q[4], q[5], q[6], q[7]);
    }
    for (const i of L.bog) {
      const h = (i * 2654435761) >>> 0;
      if ((((h >> 4) + (f >> 3)) % 41) > 1) continue;
      const x = (i % GW) * 4 + (h & 3), y = ((i / GW) | 0) * 4 + ((h >> 2) & 3);
      ctx.fillStyle = (((h >> 4) + (f >> 3)) % 41) ? '#7C8C44' : '#A8B868';
      ctx.fillRect(x, y, 1, 1);
      if (h & 16) ctx.fillRect(x + 1, y, 1, 1);
    }
    if (L.vent.length) {
      if (!L.vents) L.vents = this.ventsOf(L.vent);
      const fire0 = VENT_PERIOD - VENT_FIRE, warn0 = fire0 - VENT_WARN;
      for (const v of L.vents) {
        const ph = this.ventPhase(v), cx = v.x + 8, cy = v.y + 8;
        if (ph >= fire0) { ctx.fillStyle = '#F8D878'; ctx.fillRect(cx - 4, cy - 4, 8, 8); ctx.fillStyle = '#FCF8E8'; ctx.fillRect(cx - 2, cy - 2, 4, 4); }
        else if (ph >= warn0) {
          // bubbling: the core swells and flashes, drops of lava jump out
          const k = (ph - warn0) / VENT_WARN, s = 2 + Math.round(k * 3);
          ctx.fillStyle = (f >> 2) & 1 ? '#F83800' : '#F8B800'; ctx.fillRect(cx - s, cy - s, s * 2, s * 2);
          ctx.fillStyle = '#F8D878';
          for (let n = 0; n < 3; n++) { const a = (f * 0.4 + n * 2.1 + v.off), d = 3 + ((f + n * 5) % 6); ctx.fillRect(Math.round(cx + Math.cos(a) * d), Math.round(cy + Math.sin(a) * d - ((f + n * 3) % 4)), 1, 1); }
        } else { ctx.fillStyle = (f >> 5) & 1 ? '#881400' : '#A81C00'; ctx.fillRect(cx - 2, cy - 2, 4, 4); }
      }
    }
    if (L.gas.length) {
      const lit = new Set(this.booms.filter(q => q.kind === 'gas').map(q => q.x + ',' + q.y));
      for (const i of L.gas) {
        const cx = i % GW, cy = (i / GW) | 0, x = cx * 4, y = cy * 4, h = cx * 7 + cy * 13;
        const hot = lit.has(((cx >> 1) * 8 + 4) + ',' + ((cy >> 1) * 8 + 4));
        // a bubble per cell, swelling and shrinking on its own; lit, they flash
        const big = ((f >> 4) + h) % 3 !== 0, bob = ((f >> 3) + h) & 1;
        ctx.fillStyle = hot ? ((f >> 1) & 1 ? '#F8F8B0' : '#F87800') : '#2C5410';
        if (big) { ctx.fillRect(x, y + bob, 4, 3); ctx.fillRect(x + 1, y - 1 + bob, 2, 5); } else ctx.fillRect(x + 1, y + 1, 3, 3);
        ctx.fillStyle = hot ? '#F8D838' : '#8CD848';
        if (big) { ctx.fillRect(x + 1, y + bob, 2, 3); ctx.fillRect(x, y + 1 + bob, 4, 1); } else ctx.fillRect(x + 2, y + 2, 1, 1);
        ctx.fillStyle = '#E8F8B8';
        if (big) ctx.fillRect(x + 1, y + bob, 1, 1);
      }
    }
    if (L.lamp.length && this.weather && !this.lightsOut()) {
      // a pool of light under each lamp
      ctx.fillStyle = 'rgba(248,216,120,0.07)';
      for (const i of L.lamp) {
        const cx = i % GW, cy = (i / GW) | 0;
        if (cx & 1 || cy & 1) continue;
        const x = cx * 4 + 4, y = cy * 4 + 4;
        for (const rr of [16, 11, 6]) for (let dy = -rr; dy < rr; dy += 2) { const w = Math.round(Math.sqrt(rr * rr - dy * dy)); ctx.fillRect(x - w, y + dy, w * 2, 2); }
      }
    }
    for (const q of this.booms) {
      if (q.kind !== 'drum' || !((f >> 1) & 1)) continue;
      ctx.fillStyle = '#F8F8F8';
      ctx.fillRect(q.x - 5, q.y - 5, 10, 1); ctx.fillRect(q.x - 5, q.y + 4, 10, 1); ctx.fillRect(q.x - 5, q.y - 5, 1, 10); ctx.fillRect(q.x + 4, q.y - 5, 1, 10);
    }
  },

  // a tank as the new ground sees it: under the water (a gator), sinking in the bog, about to bite (false: as usual)
  drawBioTank(ctx, t) {
    const f = this.frame;
    if (t.sub) {
      // only the eyes and the ripples show
      ctx.fillStyle = 'rgba(200,232,255,0.5)';
      const r = 5 + ((f >> 3) % 4);
      ctx.fillRect(t.x + 8 - r, t.y + 8, 1, 1); ctx.fillRect(t.x + 8 + r, t.y + 8, 1, 1); ctx.fillRect(t.x + 8, t.y + 8 - r, 1, 1); ctx.fillRect(t.x + 8, t.y + 8 + r, 1, 1);
      const [ex, ey] = [[0, -3], [3, 0], [0, 3], [-3, 0]][t.dir], side = (t.dir & 1) ? [0, 2] : [2, 0];
      ctx.fillStyle = '#D8F878';
      ctx.fillRect(t.x + 7 + ex - side[0], t.y + 7 + ey - side[1], 2, 2); ctx.fillRect(t.x + 7 + ex + side[0], t.y + 7 + ey + side[1], 2, 2);
      return true;
    }
    const depth = t.sink > 0 ? Math.min(5, 1 + Math.floor(t.sink / 36)) : 0;
    if (!depth && !(t.snap > 0)) return false;
    this.drawTank(ctx, t);
    if (depth) {
      // the bog closes in from every side
      ctx.fillStyle = 'rgba(44,52,24,0.9)';
      ctx.fillRect(t.x, t.y, 16, depth); ctx.fillRect(t.x, t.y + 16 - depth, 16, depth);
      ctx.fillRect(t.x, t.y + depth, depth, 16 - depth * 2); ctx.fillRect(t.x + 16 - depth, t.y + depth, depth, 16 - depth * 2);
      ctx.fillStyle = '#A8B868';
      for (let k = 0; k < 2; k++) { const a = f * 0.3 + k * 3; ctx.fillRect(Math.round(t.x + 8 + Math.cos(a) * 8), Math.round(t.y + 8 + Math.sin(a) * 8), 1, 1); }
    }
    if (t.snap > 0) {
      // jaws open: teeth at the front, and a warning
      const [fx, fy] = [[7, -2], [16, 7], [7, 16], [-2, 7]][t.dir];
      ctx.fillStyle = '#F8F8F8';
      ctx.fillRect(t.x + fx, t.y + fy, (t.dir & 1) ? 2 : 1, (t.dir & 1) ? 1 : 2); ctx.fillRect(t.x + fx + ((t.dir & 1) ? 0 : 2), t.y + fy + ((t.dir & 1) ? 2 : 0), (t.dir & 1) ? 2 : 1, (t.dir & 1) ? 1 : 2);
      if ((f >> 2) & 1) Font.draw(ctx, '!', t.x + 5, t.y - 10, '#F83800');
    }
    return true;
  },

  // over everything on the ground: fire columns, bombs and rockets on the way, mist, the lava warning
  renderBioOver(ctx, camX, camY) {
    const f = this.frame, fire = ['#F8F8F8', '#F8D878', '#F87830', '#D82800'], L = this.bioL;
    if (L && L.vents) {
      const fire0 = VENT_PERIOD - VENT_FIRE;
      for (const v of L.vents) {
        const ph = this.ventPhase(v);
        if (ph < fire0) continue;
        // a column of fire, tallest in the middle of the eruption
        const k = Math.sin(Math.PI * (ph - fire0) / VENT_FIRE), hgt = 6 + Math.round(k * 18);
        for (let n = 0; n < 26; n++) {
          const px = v.x + 2 + ((n * 37 + f * 11) % 12), py = v.y + 14 - ((n * 53 + f * 7) % (hgt + 10));
          ctx.fillStyle = fire[(n + (f >> 1)) & 3];
          ctx.fillRect(px - 1, py - 1, 3, 3);
        }
      }
    }
    for (const q of this.booms) {
      if (q.kind === 'bomb') {
        // a shadow that grows where it'll land, the bomb coming down on it
        const k = Math.max(0, Math.min(1, 1 - q.t / BOMB_TIME)), r = Math.round(2 + k * (BOMB_R - 2));
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.fillRect(q.x - r, q.y - (r >> 1), r * 2, r);
        if (q.t < 40 && (f >> 2) & 1) { ctx.fillStyle = '#F83800'; ctx.fillRect(q.x - BOMB_R, q.y, BOMB_R * 2, 1); ctx.fillRect(q.x, q.y - (BOMB_R >> 1), 1, BOMB_R); }
        if (q.t < 60) {
          const by = q.y - q.t * 2;
          ctx.fillStyle = '#F87800'; ctx.fillRect(q.x - 2, by - 2, 4, 4);
          ctx.fillStyle = '#F8D878'; ctx.fillRect(q.x - 1, by - 1, 2, 2);
          ctx.fillStyle = 'rgba(248,120,0,0.5)'; ctx.fillRect(q.x - 1, by - 8, 2, 6);
        }
      } else if (q.kind === 'rocket') {
        // the marked spot, and the rocket on its way to it
        if (q.t > 24 || (f >> 1) & 1) {
          ctx.fillStyle = q.t < 24 ? '#F83800' : '#F8B800';
          const r = SALVO_R - 3;
          ctx.fillRect(q.x - r, q.y - r, 3, 1); ctx.fillRect(q.x - r, q.y - r, 1, 3); ctx.fillRect(q.x + r - 2, q.y - r, 3, 1); ctx.fillRect(q.x + r, q.y - r, 1, 3);
          ctx.fillRect(q.x - r, q.y + r, 3, 1); ctx.fillRect(q.x - r, q.y + r - 2, 1, 3); ctx.fillRect(q.x + r - 2, q.y + r, 3, 1); ctx.fillRect(q.x + r, q.y + r - 2, 1, 3);
          ctx.fillRect(q.x, q.y, 1, 1);
        }
        const p = 1 - q.t / SALVO_TIME;
        if (p > 0) {
          const x = q.sx + (q.x - q.sx) * p, y = q.sy + (q.y - q.sy) * p - Math.sin(Math.PI * p) * 28;
          ctx.fillStyle = 'rgba(180,180,180,0.6)'; ctx.fillRect(Math.round(x) - 1, Math.round(y) + 2, 2, 2);
          ctx.fillStyle = '#F8F8F8'; ctx.fillRect(Math.round(x) - 1, Math.round(y) - 1, 2, 2);
          ctx.fillStyle = '#F83800'; ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
        }
      }
    }
    // swamp mist: wide pale banks drifting by, thicker in the middle
    if ((THEMES[this.theme] || {}).mist) {
      ctx.fillStyle = 'rgba(190,210,170,0.035)';
      for (let k = 0; k < 4; k++) {
        const w = 90 + k * 30, x = Math.round(camX + ((f * (0.15 + k * 0.05) + k * 97) % (VIEW_W + w)) - w), y = camY + ((k * 61 + 20) % VIEW_H);
        for (let s = 0; s < 4; s++) ctx.fillRect(x + s * 8, y - s * 3, w - s * 16, 6 + s * 6);
      }
    }
    // at the lava's edge: your tank glows red
    for (const t of this.tanks) {
      if (!t.alive || !t.lavaNear || !((f >> 2) & 1)) continue;
      ctx.fillStyle = '#F83800';
      ctx.fillRect(t.x - 1, t.y - 1, 18, 1); ctx.fillRect(t.x - 1, t.y + 16, 18, 1); ctx.fillRect(t.x - 1, t.y, 1, 16); ctx.fillRect(t.x + 16, t.y, 1, 16);
    }
  },

  // in the dark: lamps (not in a blackout), lava, erupting vents and incoming bombs give light too (terrain.js)
  bioLights(light) {
    const L = this.bioL;
    if (!L) return;
    if (!this.lightsOut()) for (const i of L.lamp) { const cx = i % GW, cy = (i / GW) | 0; if (!(cx & 1) && !(cy & 1)) light(cx * 4 + 4, cy * 4 + 4, 46); }
    for (const i of L.lava) { const cx = i % GW, cy = (i / GW) | 0; if (!(cx & 3) && !(cy & 3)) light(cx * 4 + 8, cy * 4 + 8, 14); }
    if (L.vents) for (const v of L.vents) if (this.ventPhase(v) >= VENT_PERIOD - VENT_FIRE - VENT_WARN) light(v.x + 8, v.y + 8, 26);
    for (const q of this.booms) if (q.kind === 'bomb' || q.kind === 'rocket') light(q.x, q.y, 16);
  },
});

// bits of a tank's state an online guest needs to draw it (net.js)
function bioTankBits(t) {
  return (t.sink > 0 ? Math.min(7, 1 + Math.floor(t.sink / 36)) : 0) | (t.sub ? 8 : 0) | (t.snap > 0 ? 16 : 0) | (t.lavaNear ? 32 : 0);
}
function bioTankFrom(b) {
  b = b || 0;
  return { sink: b & 7 ? (b & 7) * 36 - 18 : 0, sub: !!(b & 8), snap: b & 16 ? 1 : 0, lavaNear: !!(b & 32) };
}
