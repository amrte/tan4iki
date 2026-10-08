'use strict';
// =====================================================================
//  Boss rounds: every Nth stage (default 10) is a boss stage with escorts. Ten bosses, in this order:
//  IRON BEAR, MOLE, HARVESTER, HYDRA, GUNSHIP, PHANTOM, ARMORED TRAIN, SCORPION, DREADNOUGHT and the UFO (stage 100
//  by default), then round again, tougher. Every boss has three phases by the HP it has left (above 2/3, above 1/3,
//  the rest): each phase change staggers it, names the new phase, shows on its hull (wear, then smoke, then fire)
//  and changes how it fights. The first five live here, the other five in bosses2.js.
// =====================================================================

// hp: base hit points (before the BOSS HP setting, +50% in 2P, +50% per loop)
// escorts: enemy types (0 basic, 1 fast, 2 power, 3 armor) cycled to fill the escort count
// phases: the name of each phase (shown when it begins)
const BOSSES = [
  { kind: 'bear', name: 'IRON BEAR', hp: 40, pts: 5000, w: 32, h: 32, escorts: [0, 0, 1, 0, 0, 1, 0, 1], desc: 'CHARGES, CRUSHING WALLS',
    phases: ['ARMORED', 'RAGING', 'BERSERK'] },
  { kind: 'mole', name: 'MOLE', hp: 30, pts: 6000, w: 32, h: 32, escorts: [1, 1, 0, 1, 1, 0, 1, 1], desc: 'DIGS UNDER, POPS UP TO FIRE',
    phases: ['DIGGING', 'FRENZIED', 'TREMORS'] },
  { kind: 'hydra', name: 'HYDRA', turretHp: 12, coreHp: 24, pts: 7000, w: 48, h: 32, escorts: [2, 0, 2, 1, 2, 0, 2, 1], desc: 'BREAK 3 TURRETS, THEN THE CORE',
    phases: ['THREE HEADS', 'REGROWING', 'BARE CORE'] },
  { kind: 'phantom', name: 'PHANTOM', hp: 30, pts: 8000, w: 32, h: 32, escorts: [1, 2, 1, 2, 1, 2, 1, 2], desc: 'INVISIBLE, LEAVES DECOYS',
    phases: ['CLOAKED', 'HAUNTING', 'UNMASKED'] },
  { kind: 'dread', name: 'DREADNOUGHT', hp: 100, pts: 10000, w: 48, h: 48, escorts: [3, 2, 3, 2, 3, 2, 3, 3], desc: '3 PHASES, AN ARMY INSIDE',
    phases: ['BATTLESHIP', 'MINELAYER', 'MELTDOWN'] },
  // bosses2.js
  { kind: 'harvester', name: 'HARVESTER', hp: 45, pts: 6500, w: 32, h: 32, escorts: [1, 0, 1, 1, 0, 1, 1, 0], desc: 'RACES AND RAMS, MOWS EVERYTHING',
    phases: ['HARVEST', 'OVERDRIVE', 'ON FIRE'] },
  { kind: 'gunship', name: 'GUNSHIP', hp: 50, pts: 7500, w: 32, h: 32, escorts: [0, 1, 2, 0, 1, 2, 0, 1], desc: 'FLIES OVER WALLS, ROCKETS',
    phases: ['PATROL', 'AIR ASSAULT', 'GOING DOWN'] },
  { kind: 'train', name: 'ARMORED TRAIN', locoHp: 24, carHp: 16, pts: 8500, w: 128, h: 16, escorts: [3, 0, 3, 1, 3, 0, 3, 1], desc: 'WRECK THE WAGONS, THEN THE ENGINE',
    phases: ['FULL STEAM', 'TROOPS OUT', 'DERAILED'] },
  { kind: 'scorpion', name: 'SCORPION', hp: 60, pts: 9000, w: 32, h: 32, escorts: [2, 2, 1, 2, 2, 1, 2, 3], desc: 'WALKS OVER WALLS, STINGS FROM AFAR',
    phases: ['STALKING', 'VENOM', 'FRENZY'] },
  { kind: 'ufo', name: 'UFO', hp: 90, pts: 20000, w: 48, h: 48, escorts: [1, 2, 1, 3, 1, 2, 1, 3], desc: 'THE LAST BOSS, FROM OUTER SPACE',
    phases: ['INVASION', 'FORCE FIELD', 'CRASH-LANDED'] },
];
// the order they come in (indexes into BOSSES)
const BOSS_ORDER = [0, 1, 5, 2, 6, 3, 7, 8, 4, 9];
// flying bosses go over walls and tanks and are drawn above the trees
const bossFlies = b => b.kind === 'gunship' || (b.kind === 'ufo' && !b.crashed);

// Arenas (13x13 tile codes, same legend as LEVELS). The eagle fortress is added by the loader.
const BOSS_ARENAS = [
  [ // IRON BEAR: open ground, brick walls to smash, steel pillars to stun it on
    '.............',
    '.............',
    '..##.....##..',
    '..#..@.@..#..',
    '..#.......#..',
    '@....###....@',
    '.............',
    '...@.....@...',
    '.##.#...#.##.',
    '.............',
    '..@.......@..',
    '.#.........#.',
    '.............',
  ],
  [ // MOLE: dense bricks and forest, a steel ring in front of the eagle
    '.............',
    '.%%.#.%.#.%%.',
    '.%%.#.%.#.%%.',
    '...#.....#...',
    '.#..%%#%%..#.',
    '.#..%%#%%..#.',
    '...#.....#...',
    '%%.#.#.#.#.%%',
    '%%.........%%',
    '.##.%...%.##.',
    '....BBBBB....',
    '....R...L....',
    '.............',
  ],
  [ // HYDRA: an island moat at the top with two brick bridges; steel cap over the eagle
    '...~.....~...',
    '...~.....~...',
    '...~.....~...',
    '...~.....~...',
    '...~~#~#~~...',
    '.............',
    '.#.@.....@.#.',
    '.#...#.#...#.',
    '.....#.#.....',
    '.##.......##.',
    '....BBBBB....',
    '.............',
    '.............',
  ],
  [ // PHANTOM: ice fields (it leaves tracks) and forest
    '.............',
    '._____%_____.',
    '._%%__%__%%_.',
    '.__%%___%%__.',
    '.___________.',
    '%%__@___@__%%',
    '._____%_____.',
    '.__%%___%%__.',
    '._%%_____%%_.',
    '.___________.',
    '..#._____.#..',
    '.............',
    '.............',
  ],
  [ // DREADNOUGHT: steel bastion at the top, brick layers down to the eagle
    '...@.....@...',
    '...@.....@...',
    '...@.....@...',
    '...@@###@@...',
    '.#.........#.',
    '.#.##.#.##.#.',
    '.............',
    '@.##.#.#.##.@',
    '.............',
    '.#.#.###.#.#.',
    '.#.........#.',
    '.............',
    '.............',
  ],
  [ // HARVESTER: a farm: crops to mow, barns to smash through, a few steel posts to stall it on
    '.............',
    '.%%%%...%%%%.',
    '.%%%%...%%%%.',
    '.............',
    '.##.%%%%%.##.',
    '.##.%%%%%.##.',
    '.............',
    '%%%..@.@..%%%',
    '%%%.......%%%',
    '.............',
    '.%%.#.#.#.%%.',
    '.....###.....',
    '.............',
  ],
  [ // GUNSHIP: a compound: steel blocks to hide behind, a pond it flies over
    '.............',
    '.@@..###..@@.',
    '.@@..#.#..@@.',
    '.....#.#.....',
    '.##.......##.',
    '.##..~~~..##.',
    '.....~~~.....',
    '.#.#.....#.#.',
    '.#.#.@.@.#.#.',
    '.............',
    '.##.......##.',
    '.............',
    '.............',
  ],
  [ // ARMORED TRAIN: two tracks across the field (rows 3 and 7, kept clear), cover between them
    '.............',
    '.#.#.@.@.#.#.',
    '.#.#.....#.#.',
    '.............',
    '.@.##...##.@.',
    '.....%%%.....',
    '.##.......##.',
    '.............',
    '.#.@.#.#.@.#.',
    '.#.........#.',
    '.....###.....',
    '.............',
    '.............',
  ],
  [ // SCORPION: desert rocks and an oasis (it walks right over them)
    '.............',
    '..@...~...@..',
    '.@@..~~~..@@.',
    '......~......',
    '.#.##...##.#.',
    '.#.........#.',
    '...@.###.@...',
    '.............',
    '.##.#...#.##.',
    '.............',
    '..@.......@..',
    '.............',
    '.............',
  ],
  [ // UFO: crop circles and two monoliths
    '.............',
    '..%%%...%%%..',
    '.%%.%%.%%.%%.',
    '.%%.%%.%%.%%.',
    '..%%%...%%%..',
    '.....@.@.....',
    '.#.........#.',
    '.#..##.##..#.',
    '....#...#....',
    '.@.........@.',
    '.....###.....',
    '.............',
    '.............',
  ],
];

function bossForStage(num) {
  if (!Config.on('bossRounds')) return null;
  const every = Config.get('bossEvery');
  if (num % every !== 0) return null;
  const n = num / every - 1;
  return { idx: BOSS_ORDER[n % BOSS_ORDER.length], loop: Math.floor(n / BOSS_ORDER.length) };
}

class Boss {
  constructor(o) {
    Object.assign(this, {
      kind: 'bear', x: 0, y: 0, w: 32, h: 32, dir: 2, hp: 1, maxHp: 1, alive: true, main: true,
      mode: 'roam', t: 0, cd: 60, acc: 0, animTick: 0, flash: 0, visibleT: 0, enraged: false, phase: 1, stagger: 0,
      bullets: 0, isPlayer: false, power: false, cutter: false, speedMul: 1,
    }, o);
  }
}

// ------------------------------------------------------------------ sprites
// palette slots: 1 light, 2 base, 3 shadow, 4 metal, 5 lights / glow, 6 a second colour, 7 outline
const BOSS_PALS = {
  bear: [null, '#B8E890', '#5C9C34', '#1C3C0C', '#C8C8C8', '#F8D800', '#8C6C3C', '#0C1404'],
  mole: [null, '#F0C080', '#B06828', '#4C2800', '#E0E0E0', '#F8D800', '#8C8C8C', '#1C0C00'],
  hydra: [null, '#B8F0E8', '#2C9C9C', '#0C3C44', '#C860F0', '#F83800', '#68D8B8', '#04181C'],
  phantom: [null, '#FFFFFF', '#C8B8F8', '#6050B8', '#F0E8FF', '#58F8F8', '#9C88E8', '#100828'],
  dread: [null, '#D8D8E8', '#7C7C98', '#282838', '#E04030', '#F8D800', '#54546C', '#0C0C14'],
  harvester: [null, '#F8F878', '#D8A800', '#7C5000', '#C8C8C8', '#A8E8F8', '#3C9C1C', '#181008'],
  gunship: [null, '#B8C878', '#6C7C38', '#2C3410', '#C8C8C8', '#78D8F8', '#F8D800', '#0C1004'],
  train: [null, '#A8A8C0', '#5C5C78', '#2C2C3C', '#D8D8D8', '#F8F878', '#C82800', '#0C0C10'],
  scorpion: [null, '#F8D878', '#B88838', '#5C3C08', '#E8E8E8', '#F83800', '#7C4818', '#140C04'],
  ufo: [null, '#E8E8F8', '#9898B8', '#48486C', '#F8F8F8', '#A8F8F8', '#58D854', '#0C0C18'],
  alien: [null, '#B8F8B8', '#58D854', '#1C7C1C', '#C8C8C8', '#F858F8', '#F8F858', '#081808'],
  f: [null, '#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#E8E8E8'],
  r: [null, '#FFC0B0', '#E04030', '#600000', '#F87858', '#FFFF00', '#B02818', '#300000'],
};

function bossPainter(w, h) {
  const g = [];
  for (let y = 0; y < h; y++) g.push(new Array(w).fill(0));
  const P = {
    g,
    px(x, y, c) { x |= 0; y |= 0; if (x >= 0 && y >= 0 && x < w && y < h) g[y][x] = c; },
    rect(x0, y0, x1, y1, c) { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) P.px(x, y, c); },
    line(x0, y0, x1, y1, c) {
      const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) || 1;
      for (let i = 0; i <= n; i++) P.px(Math.round(x0 + (x1 - x0) * i / n), Math.round(y0 + (y1 - y0) * i / n), c);
    },
    disc(cx, cy, r, c) { for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (Math.hypot(x + 0.5 - cx, y + 0.5 - cy) <= r) P.px(x, y, c); },
    ring(cx, cy, r, c) { for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (Math.abs(Math.hypot(x + 0.5 - cx, y + 0.5 - cy) - r) < 0.5) P.px(x, y, c); },
    box(x0, y0, x1, y1) {
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        let c = 2;
        if (x === x0 || y === y0) c = 1;
        if (x === x1 || y === y1) c = 3;
        P.px(x, y, c);
      }
    },
    circle(cx, cy, r) { P.ellipse(cx, cy, r, r); },
    // a shaded ellipse: lit from the top left
    ellipse(cx, cy, rx, ry) {
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const dx = x + 0.5 - cx, dy = y + 0.5 - cy, d = Math.hypot(dx / rx, dy / ry);
        if (d > 1) continue;
        P.px(x, y, d > 1 - 1 / Math.min(rx, ry) ? (dx + dy < 0 ? 1 : 3) : (dx / rx + dy / ry < -0.4 ? 1 : 2));
      }
    },
    treads(x0, x1, y0, y1, frame) {
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        const edge = x === x0 || x === x1 || y === y0 || y === y1;
        P.px(x, y, edge || (y + frame * 2) % 4 === 0 ? 3 : ((y + frame * 2) % 4 === 1 ? 1 : 2));
      }
    },
    // battle damage: scorched plates in phase 2, more of them and holes in phase 3
    wear(ph, seed) {
      if (ph < 2) return;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const v = g[y][x], k = (Math.imul(x + 31, 73856093) ^ Math.imul(y + 17, 19349663) ^ Math.imul(seed, 83492791)) >>> 0;
        if (v !== 1 && v !== 2) continue;
        if (k % 100 < (ph === 2 ? 7 : 14)) g[y][x] = 3;
        else if (ph === 3 && k % 100 >= 97) g[y][x] = 7;
      }
    },
    // a dark rim round the whole shape, so it reads on any ground
    outline() {
      const o = g.map(r => r.slice());
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        if (o[y][x]) continue;
        if ((x > 0 && o[y][x - 1]) || (x < w - 1 && o[y][x + 1]) || (y > 0 && o[y - 1][x]) || (y < h - 1 && o[y + 1][x])) g[y][x] = 7;
      }
    },
  };
  return P;
}

// rotate a grid a quarter turn clockwise (any shape)
function rotCW(g) {
  const h = g.length, w = g[0].length, r = [];
  for (let y = 0; y < w; y++) { r.push(new Array(h)); for (let x = 0; x < h; x++) r[y][x] = g[h - 1 - x][y]; }
  return r;
}

// all drawn facing up (dir 0); f = animation frame, ph = phase (1-3)
const BOSS_DRAW = {
  bear(f, ph) {
    const P = bossPainter(32, 32);
    P.treads(1, 7, 3, 30, f); P.treads(24, 30, 3, 30, f);
    for (const x of [4, 27]) for (let y = 7; y < 30; y += 6) P.px(x, y + (f & 1), 4);   // road wheels
    P.box(6, 6, 25, 28);
    P.rect(8, 10, 23, 10, 3);
    for (let x = 9; x <= 22; x += 2) P.rect(x, 24, x, 27, 3);   // engine grille
    P.rect(8, 23, 23, 23, 3);
    P.disc(8.5, 27, 1.6, 6); P.disc(23.5, 27, 1.6, 6); P.px(8, 27, 7); P.px(23, 27, 7);   // exhausts
    P.px(9, 7, 5); P.px(22, 7, 5); P.px(10, 7, 5); P.px(21, 7, 5);                          // headlights
    if (ph < 3) {
      // the toothed ram plate (dented in phase 2, torn off in phase 3: just the brackets left)
      P.rect(4, 2, 27, 4, 4); P.rect(4, 5, 27, 5, 3);
      for (let x = 5; x < 27; x += 4) { P.px(x, 1, 4); P.px(x + 1, 1, 4); P.px(x, 0, 1); }
      if (ph === 2) { P.px(12, 3, 3); P.px(13, 4, 3); P.px(20, 2, 3); P.px(21, 3, 3); }
    } else for (const x of [6, 14, 22]) P.rect(x, 4, x + 2, 5, 3);
    // turret with two round "ears" (one shot off in phase 3) and a hatch
    P.circle(10.5, 12.5, 2.6); if (ph < 3) P.circle(21.5, 12.5, 2.6);
    P.circle(16, 17, 7.5);
    P.disc(18.5, 19.5, 2.1, 4); P.px(18, 19, 1); P.px(19, 20, 3);
    P.rect(14, 0, 17, 12, 2); P.rect(14, 0, 14, 12, 1); P.rect(17, 0, 17, 12, 3); P.rect(13, 0, 18, 1, 3);   // barrel, muzzle brake
    P.wear(ph, 1); P.outline();
    return P.g;
  },
  mole(f, ph) {
    const P = bossPainter(32, 32);
    P.treads(2, 7, 9, 30, f); P.treads(24, 29, 9, 30, f);
    P.box(7, 10, 24, 29);
    // digging claws either side of the drill
    for (const s of [-1, 1]) { const x = 16 + s * 9; P.line(x, 12, x + s * 3, 5, 6); P.line(x + s, 12, x + s * 4, 6, 6); P.px(x + s * 3, 4, 4); P.px(x + s * 4, 5, 4); }
    // the drill, spiralling; its tip snaps off in phase 3 and the stump glows red-hot
    const tip = ph === 3 ? 3 : 0;
    for (let y = tip; y <= 11; y++) {
      const half = 1 + y * 0.7;
      for (let x = 0; x < 32; x++) if (Math.abs(x + 0.5 - 16) <= half) P.px(x, y, ((x + y + f * 2) & 3) < 2 ? 4 : 2);
    }
    if (ph === 3) { P.rect(14, 3, 17, 4, 5); P.px(15, 2, 5); }
    P.rect(8, 12, 23, 12, 3);
    P.circle(16, 19, 5.5); P.rect(15, 18, 16, 19, 5); P.px(14, 17, 1);   // cabin dome, porthole
    P.px(9, 13, 5); P.px(22, 13, 5);                                    // headlights
    P.rect(10, 25, 21, 28, 3); for (let x = 11; x <= 20; x += 3) { P.px(x, 26, 6); P.px(x + 1, 27, 6); }   // dirt hopper
    P.wear(ph, 2); P.outline();
    return P.g;
  },
  phantom(f, ph) {
    const P = bossPainter(32, 32);
    P.treads(3, 6, 5, 29, f); P.treads(25, 28, 5, 29, f);
    for (let y = 4; y <= 29; y++) {                            // sleek wedge hull
      const half = y < 12 ? 4 + (y - 4) * 1.2 : 13 - Math.max(0, y - 25);
      for (let x = 0; x < 32; x++) {
        const dx = x + 0.5 - 16;
        if (Math.abs(dx) > half) continue;
        let c = dx < -half + 1.5 ? 1 : dx > half - 1.5 ? 3 : 2;
        if (y === 4) c = 1;
        if (y === 29) c = 3;
        P.px(x, y, c);
      }
    }
    P.line(9, 25, 15, 18, 6); P.line(22, 25, 16, 18, 6); P.line(16, 19, 16, 27, 6);   // stealth panel seams
    P.rect(7, 26, 9, 29, 6); P.rect(22, 26, 24, 29, 6);                               // tail fins
    P.rect(11, 13, 20, 15, 5); P.rect(11, 13, 20, 13, 4);                            // glowing visor
    if (ph === 3) { P.line(13, 13, 16, 15, 7); P.line(16, 15, 18, 14, 7); for (const [x, y] of [[10, 20], [20, 23], [14, 26]]) P.rect(x, y, x + 1, y + 1, 7); }
    P.rect(15, 0, 15, 12, 1); P.rect(16, 0, 16, 12, 2);
    P.wear(ph, 3); P.outline();
    return P.g;
  },
  dread(f, ph) {
    const P = bossPainter(48, 48);
    P.treads(0, 7, 3, 46, f); P.treads(40, 47, 3, 46, f);
    P.treads(8, 11, 6, 43, f + 1); P.treads(36, 39, 6, 43, f + 1);
    P.box(10, 5, 37, 45);
    P.rect(12, 11, 35, 11, 3); P.rect(12, 38, 35, 38, 3);
    for (let y = 8; y <= 44; y += 6) { P.px(12, y, 4); P.px(35, y, 4); }   // rivets
    P.line(14, 40, 33, 40, 6); P.line(14, 8, 33, 8, 6);
    P.circle(12.5, 15, 5.5); P.circle(35.5, 15, 5.5);
    // twin cannons; the left one is blown off in phase 2
    for (const x0 of [11, 34]) {
      if (x0 === 11 && ph >= 2) { P.rect(x0, 7, x0 + 3, 12, 3); P.rect(x0, 7, x0 + 3, 7, 7); P.px(x0 + 1, 8, 5); continue; }
      P.rect(x0, 0, x0 + 3, 12, 2); P.rect(x0, 0, x0, 12, 1); P.rect(x0 + 3, 0, x0 + 3, 12, 3); P.rect(x0 - 1, 0, x0 + 4, 1, 3);
    }
    if (ph < 3) { P.rect(19, 21, 28, 30, 3); P.rect(20, 22, 27, 29, 2); P.rect(20, 22, 27, 22, 1); P.rect(23, 25, 24, 26, 4); }   // the hatch
    else {
      // hatch blown away: the reactor shows, pulsing
      P.rect(19, 21, 28, 30, 7); P.disc(24, 26, 3.6, f & 1 ? 5 : 4); P.disc(24, 26, 1.6, 1);
      for (const [x, y] of [[18, 20], [29, 22], [21, 31]]) P.px(x, y, 3);
    }
    P.circle(24, 36, 5.5); P.disc(24, 36, 1.5, 4);
    for (const x of [14, 19, 28, 33]) P.rect(x, 42, x, 43, 5);
    P.wear(ph, 4); P.outline();
    return P.g;
  },
  hydra(f, ph) {                                               // faces down, never rotates
    const P = bossPainter(48, 32);
    P.treads(0, 5, 1, 30, f); P.treads(42, 47, 1, 30, f);
    P.box(4, 2, 43, 29);
    for (let y = 4; y <= 20; y += 2) for (let x = 6 + (y & 2); x < 42; x += 4) P.px(x, y, 1);   // scales
    P.rect(6, 22, 41, 22, 3);
    for (const x of [7, 11, 36, 40]) P.rect(x, 24, x + 1, 27, 3);                              // gills
    P.rect(19, 21, 28, 28, 3); P.rect(20, 22, 27, 27, 2); P.rect(20, 22, 27, 22, 6);            // armoured core plate
    P.wear(ph, 5); P.outline();
    return P.g;
  },
  // Hydra turrets (16x16, barrels down): 0 gatling, 1 laser, 2 rocket, 3 wreck
  turret(k) {
    const P = bossPainter(16, 16);
    if (k === 3) {
      P.circle(8, 6, 5.5);
      for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if (P.g[y][x]) P.g[y][x] = (x * 7 + y * 3) % 5 === 0 ? 2 : 3;
      return P.g;
    }
    P.circle(8, 6, 5.5);
    P.px(5, 4, 5); P.px(10, 4, 5);   // eyes
    if (k === 0) { P.rect(5, 8, 6, 15, 2); P.rect(9, 8, 10, 15, 2); P.rect(5, 8, 5, 15, 1); P.rect(9, 8, 9, 15, 1); P.rect(5, 15, 10, 15, 3); }
    if (k === 1) { P.rect(7, 8, 8, 15, 1); P.rect(6, 13, 9, 15, 5); }
    if (k === 2) { P.rect(5, 9, 10, 13, 2); P.rect(5, 9, 10, 9, 1); P.rect(6, 14, 9, 15, 4); }
    P.px(8, 6, 4);
    P.outline();
    return P.g;
  },
};

const BossGfx = {
  cache: new Map(),
  // kind: a BOSS_DRAW name or 'turret0'..'turret3'; variant: n (normal), f (hit flash), r (rage); ph: phase
  get(kind, frame, dir, variant = 'n', ph = 1) {
    const k = kind + frame + dir + variant + ph;
    let c = this.cache.get(k);
    if (!c) {
      const isTurret = kind.startsWith('turret');
      let g = isTurret ? BOSS_DRAW.turret(+kind[6]) : BOSS_DRAW[kind](frame, ph);
      if (!isTurret && kind !== 'hydra' && kind !== 'ufo') for (let i = 0; i < dir; i++) g = rotCW(g);
      const pal = variant === 'n' ? BOSS_PALS[isTurret ? 'hydra' : BOSS_PALS[kind] ? kind : kind.match(/^[a-z]+/)[0]] : BOSS_PALS[variant];
      c = gridCanvas(g, pal);
      this.cache.set(k, c);
    }
    return c;
  },
};

// ------------------------------------------------------------------ stage integration
Object.assign(Stage.prototype, {
  initBoss(info) {
    const def = BOSSES[info.idx];
    const mult = Config.scale('bossHp') * Config.skill().boss * (1 + 0.5 * this.extraPlayers) * (1 + 0.5 * info.loop);
    const hp = n => Math.max(1, Math.round(n * mult));
    this.bossIdx = info.idx;
    this.bossLoop = info.loop;
    this.bossDropAt = [0.75, 0.5, 0.25];
    this.bossBanner = 180;
    this.encounter('b' + info.idx);   // cards.js
    const b = new Boss({ kind: def.kind, w: def.w, h: def.h, x: Math.round((FW - def.w) / 16) * 8, y: 0, speedMul: 1 + 0.15 * info.loop });
    if (def.kind === 'hydra') {
      b.y = 16;
      b.turrets = [0, 1, 2].map(() => ({ hp: hp(def.turretHp), max: hp(def.turretHp), cd: 90, burst: 0 }));
      b.core = hp(def.coreHp);
      b.hp = b.maxHp = b.turrets.reduce((a, t) => a + t.hp, 0) + b.core;
      b.home = b.x;
      b.drift = 1;
      // a ship is part of this arena: it lets you reach the island
      this.powerup = { type: PU.SHIP, x: Math.max(0, BASE_X - 64), y: Math.min(FH - 48, 112), t: 0 };
    } else if (BOSS_INIT[def.kind]) BOSS_INIT[def.kind].call(this, b, def, hp);   // bosses2.js
    else {
      b.hp = b.maxHp = hp(def.hp);
    }
    this.puffs = []; this.bossNote = null;
    if (def.kind === 'mole') { b.mode = 'under'; b.y = 16; b.geysers = []; }
    if (def.kind === 'dread') { b.phase = 1; b.cannon = 0; b.hatchT = 0; b.mineT = 0; b.volT = 0; b.laserT = 0; }
    if (def.kind === 'phantom') { b.tele = 0; b.blinkT = 0; }
    if (def.kind === 'hydra') b.coreBeam = 0;
    this.bosses = [b];
    // escorts replace the normal line-up: 40% of "tanks per stage" (8 by default)
    const n = Math.max(4, Math.round(Config.get('enemyCount') * 0.4));
    this.queue = [];
    for (let i = 0; i < n; i++) this.queue.push({ type: def.escorts[i % def.escorts.length], bonus: false });
    this.total = n;
    this.maxEnemies = Math.min(this.maxEnemies, 3 + Math.min(2, this.extraPlayers));
  },

  mainBoss() { return this.bosses.find(b => b.main); },
  bossAlive() { return this.bosses.some(b => b.main && b.alive); },

  bossTangible(b) {
    if (!b.alive) return false;
    if (b.kind === 'mole') return b.mode === 'up' || b.mode === 'burrow';
    if (b.kind === 'train') return b.derailed || (b.mode === 'run' && b.x + b.w > 0 && b.x < FW);   // off the field between runs
    return true;
  },

  // the three phases, by the HP left: above 2/3, above 1/3, the rest
  bossPhaseOf(b) { const f = Math.max(0, b.hp) / b.maxHp; return f > 2 / 3 ? 1 : f > 1 / 3 ? 2 : 3; },

  // a new phase: it reels for a moment, the phase is named, bits fly off, and it fights differently from now on
  bossPhaseUp(b, ph) {
    b.phase = ph; b.enraged = true; b.stagger = 40; b.flash = 20;
    const def = BOSSES[this.bossIdx];
    if (def && def.phases) this.bossNote = { text: def.name + ': ' + def.phases[ph - 1], t: 150 };
    for (let i = 0; i < 6; i++) this.fx.push({ x: b.x + 4 + rnd(Math.max(1, b.w - 8)), y: b.y + 4 + rnd(Math.max(1, b.h - 8)), frames: Sprites.smallExp, per: 3, tick: -i * 5 });
    Sound.play('bossPhase');
    if (BOSS_PHASE[b.kind]) BOSS_PHASE[b.kind].call(this, b, ph);
  },

  // put a tank down somewhere (paratroopers, troops off the train, drones): a free 16x16 spot near (x, y)
  summonAt(type, x, y) {
    if (this.tanks.filter(t => !t.isPlayer).length + this.spawns.filter(s => s.enemy).length >= this.maxEnemies + 2) return false;
    for (let r = 0; r <= 48; r += 8) for (let k = 0; k < 8; k++) {
      const a = k * Math.PI / 4, sx = Math.round((x + Math.cos(a) * r - 8) / 8) * 8, sy = Math.round((y + Math.sin(a) * r - 8) / 8) * 8;
      if (sx < 0 || sy < 0 || sx > FW - 16 || sy > FH - 16 || overlap(sx, sy, 16, 16, BASE_X - 16, BASE_Y - 16, 48, 32)) continue;
      let ok = true;
      for (let cy = sy >> 2; cy < (sy + 16) >> 2 && ok; cy++) for (let cx = sx >> 2; cx < (sx + 16) >> 2; cx++) {
        const t = this.get(cx, cy);
        if (t === T_BRICK || t === T_STEEL || t === T_WATER) { ok = false; break; }
      }
      if (!ok || this.tanks.some(t => t.alive && overlap(sx, sy, 16, 16, t.x, t.y, 16, 16)) || this.spawns.some(s => overlap(sx, sy, 16, 16, s.x, s.y, 16, 16))) continue;
      if (this.bosses.some(o => o.alive && !bossFlies(o) && this.bossTangible(o) && overlap(sx, sy, 16, 16, o.x, o.y, o.w, o.h))) continue;
      this.spawns.push({ x: sx, y: sy, t: SPARKLE_TIME, enemy: { type, bonus: false } });
      return true;
    }
    return false;
  },

  // used by the spawner: keep entry points free of bosses (and the column above them)
  bossBlocksSpawn(x) {
    return this.bosses.some(b => b.alive && !bossFlies(b) && this.bossTangible(b) && overlap(x, 0, 16, 16, b.x, 0, b.w, b.y + b.h));
  },

  bossBlocksTank(t, nx, ny) {
    for (const b of this.bosses) {
      if (!this.bossTangible(b) || bossFlies(b)) continue;
      if (overlap(nx, ny, 16, 16, b.x, b.y, b.w, b.h) && !overlap(t.x, t.y, 16, 16, b.x, b.y, b.w, b.h)) return true;
    }
    return false;
  },

  // a shell reaches a boss; returns 'stop', 'pass' or null (no boss there)
  bossShell(b) {
    for (const bo of this.bosses) {
      if (bo === b.owner || !this.bossTangible(bo)) continue;
      if (!overlap(b.x, b.y, 4, 4, bo.x, bo.y, bo.w, bo.h)) continue;
      if (!b.isPlayer) continue; // enemy shells fly through bosses
      if (b.pierce) {
        b.hits = b.hits || new Set();
        if (b.hits.has(bo)) continue;
        b.hits.add(bo);
        this.bossHit(bo, 1, b.owner, b.x + 2);
        return 'pass';
      }
      if (b.dmg !== undefined) this.weaponBosses(b.owner, b.x, b.y, 4, 4, b.dmg, bo); else this.bossHit(bo, 1, b.owner, b.x + 2);
      this.killBullet(b, true, null, bo);
      return 'stop';
    }
    return null;
  },

  bossHit(bo, dmg, by, hx) {
    if (!this.bossTangible(bo)) return;
    if (bo.kind === 'decoy') {
      bo.alive = false;
      this.addFx(bo.x + 16, bo.y + 16, Sprites.smallExp, 4);
      Sound.play('steel');
      return;
    }
    if (bo.kind === 'hydra') {
      const zone = Math.max(0, Math.min(2, Math.floor(((hx === undefined ? bo.x + 24 : hx) - bo.x) / 16)));
      // the centre column is the laser turret (index 1); left gatling (0), right rocket (2)
      const tur = bo.turrets[zone];
      if (tur.hp > 0) {
        tur.hp = Math.max(0, tur.hp - dmg);
        if (tur.hp === 0) {
          this.addFx(bo.x + zone * 16 + 8, bo.y + 8, BIG_EXPLOSION(), 5);
          Sound.play('explode');
          if (bo.phase >= 2) this.hydraRegrow(bo);
        }
      } else if (bo.turrets.every(t => t.hp === 0)) {
        bo.core = Math.max(0, bo.core - dmg);
      } else {
        // armour between live turrets: no damage
        Sound.play('steel');
        return;
      }
      bo.hp = bo.turrets.reduce((a, t) => a + t.hp, 0) + bo.core;
    } else if (BOSS_DAMAGE[bo.kind]) {
      // train wagons, the UFO's force field (bosses2.js): false = the hit did nothing
      if (BOSS_DAMAGE[bo.kind].call(this, bo, dmg, hx) === false) return;
    } else {
      bo.hp -= dmg * (bo.mode === 'dazed' || bo.mode === 'stall' ? 2 : 1);
    }
    bo.flash = 6;
    if (by && by.isPlayer) { this.lastBossHitter = by.player; this.addXp(by.player, 2 * dmg); }
    Sound.play('armor');
    const frac = Math.max(0, bo.hp) / bo.maxHp;
    while (this.bossDropAt.length && frac <= this.bossDropAt[0]) { this.bossDropAt.shift(); this.spawnPowerup(); }
    if (bo.hp <= 0) { this.killBoss(bo); return; }
    const ph = Math.max(this.bossPhaseOf(bo), bo.forcePhase || 0);
    while (bo.main && (bo.phase || 1) < ph) this.bossPhaseUp(bo, (bo.phase || 1) + 1);
  },

  killBoss(bo) {
    bo.alive = false;
    this.bossDefeated = true;
    // a chain of explosions over the hull
    for (let i = 0; i < 8; i++) {
      this.fx.push({ x: bo.x + 4 + Math.random() * (bo.w - 8), y: bo.y + 4 + Math.random() * (bo.h - 8), frames: BIG_EXPLOSION(), per: 5, tick: -i * 8 });
    }
    Sound.play('bossDie');
    const def = BOSSES[this.bossIdx];
    const p = this.lastBossHitter || this.players.find(q => !q.out) || this.players[0];
    const pts = def.pts * (1 + this.bossLoop);
    this.bossPts = pts;
    this.addScore(p, pts);
    this.popups.push({ x: bo.x + bo.w / 2, y: bo.y + bo.h / 2, text: String(pts), t: 0, delay: 50 });
    // XP: 200 for the final blow, 100 for everyone else still in the fight
    for (const q of this.players) if (!q.out || q === p) this.addXp(q, (q === p ? 200 : 100) * (1 + this.bossLoop));
    // the escorts and anything left of the boss go with it
    for (const t of this.tanks) if (!t.isPlayer && t.alive) this.killEnemy(t, null, false, true);
    for (const o of this.bosses) o.alive = false;
    this.queue = [];
    this.spawns = this.spawns.filter(s => !s.enemy);
    this.beams = [];
    this.mines = this.mines.filter(m => m.byPlayer);
    if (bo.kind === 'ufo') {
      // the last boss: the end of the story (the game goes on, a round tougher)
      this.bossNote = { text: 'THE EARTH IS SAVED!', t: 400, gold: true };
      this.popups.push({ x: bo.x + bo.w / 2, y: bo.y - 10, text: 'THE END?', label: true, color: COL.gold, t: 0, delay: 90, life: 240 });
    }
  },

  // ------------------------------------------------------------ boss helpers
  bossCenter(b) { return [b.x + b.w / 2, b.y + b.h / 2]; },

  bossTarget(b) {
    const [cx, cy] = this.bossCenter(b);
    let best = null, bd = 1e9;
    for (const t of this.tanks) {
      if (!t.isPlayer || !t.alive || t.boost.smoke) continue;
      const d = Math.hypot(t.x + 8 - cx, t.y + 8 - cy);
      if (d < bd) { bd = d; best = [t.x + 8, t.y + 8]; }
    }
    return best || [BASE_X + 8, BASE_Y + 8];
  },

  dirToward(fx, fy, tx, ty) {
    const dx = tx - fx, dy = ty - fy;
    return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : (dy > 0 ? 2 : 0);
  },

  bossFire(b, cx, cy, dir, opts = {}) {
    this.bullets.push(Object.assign({
      x: cx - 2, y: cy - 2, dir, speed: 2.5, owner: b, free: true, isPlayer: false,
      power: false, cutter: false, alive: true, pierce: false, rocket: false,
    }, opts));
  },

  // the point just outside the boss on side `dir`, offset along that side
  bossMuzzle(b, dir, off = 0) {
    const [cx, cy] = this.bossCenter(b);
    const [dx, dy] = DXY[dir];
    return [cx + dx * (b.w / 2 + 2) + (dy ? off : 0), cy + dy * (b.h / 2 + 2) + (dx ? off : 0)];
  },

  // one pixel step; crush: break bricks and run over tanks
  bossStep(b, d, crush) {
    const nx = b.x + DXY[d][0], ny = b.y + DXY[d][1];
    if (nx < 0 || ny < 0 || nx + b.w > FW || ny + b.h > FH) return 'edge';
    if (overlap(nx, ny, b.w, b.h, BASE_X, BASE_Y, 16, 16)) return 'eagle';
    let x0, x1, y0, y1;
    switch (d) {
      case 0: x0 = nx; x1 = nx + b.w - 1; y0 = y1 = ny; break;
      case 2: x0 = nx; x1 = nx + b.w - 1; y0 = y1 = ny + b.h - 1; break;
      case 1: y0 = ny; y1 = ny + b.h - 1; x0 = x1 = nx + b.w - 1; break;
      default: y0 = ny; y1 = ny + b.h - 1; x0 = x1 = nx; break;
    }
    const bricks = [];
    for (let cy = y0 >> 2; cy <= y1 >> 2; cy++) for (let cx = x0 >> 2; cx <= x1 >> 2; cx++) {
      const t = this.get(cx, cy);
      if (t === T_STEEL) return 'steel';
      if (t === T_WATER) return 'water';
      if (t === T_BRICK) { if (!crush) return 'brick'; bricks.push([cx, cy]); }
    }
    for (const o of this.bosses) {
      if (o !== b && this.bossTangible(o) && overlap(nx, ny, b.w, b.h, o.x, o.y, o.w, o.h) && !overlap(b.x, b.y, b.w, b.h, o.x, o.y, o.w, o.h)) return 'tank';
    }
    for (const t of this.tanks) {
      if (!t.alive || !overlap(nx, ny, b.w, b.h, t.x, t.y, 16, 16) || overlap(b.x, b.y, b.w, b.h, t.x, t.y, 16, 16)) continue;
      if (!crush) return 'tank';
      if (t.isPlayer) { this.hitPlayer(t); if (t.alive) return 'tank'; }
      else this.killEnemy(t, null, false);
    }
    for (const [cx, cy] of bricks) this.set(cx, cy, T_EMPTY);
    if (bricks.length && this.frame % 6 === 0) Sound.play('brick');
    b.x = nx; b.y = ny;
    b.animTick++;
    return null;
  },

  bossMove(b, d, speed, crush) {
    b.acc += speed * b.speedMul;
    while (b.acc >= 1) {
      b.acc -= 1;
      const r = this.bossStep(b, d, crush);
      if (r) { b.acc = 0; return r; }
    }
    return null;
  },

  // wander like a tank, drifting toward a target
  bossRoam(b, speed, bias = 0.6) {
    const r = this.bossMove(b, b.dir, speed, false);
    if (r || ((b.x & 7) === 0 && (b.y & 7) === 0 && Math.random() < 1 / 40)) {
      const [cx, cy] = this.bossCenter(b), [tx, ty] = this.bossTarget(b);
      let d = Math.random() < bias ? this.dirToward(cx, cy, tx, ty) : rnd(4);
      if (r && d === b.dir) d = (d + 1 + rnd(3)) % 4;
      b.dir = d;
    }
  },

  summonEscort(type) {
    if (this.tanks.filter(t => !t.isPlayer).length + this.spawns.filter(s => s.enemy).length >= this.maxEnemies + 2) return;
    const free = ENEMY_SPAWN_X.filter(x => !this.bossBlocksSpawn(x));
    if (!free.length) return;
    this.spawns.push({ x: free[rnd(free.length)], y: 0, t: SPARKLE_TIME, enemy: { type, bonus: false } });
  },

  addBeam(x, y0, warn = 50) {
    // runs down the column until steel (the eagle itself is never hit)
    let y1 = FH;
    for (let y = Math.max(0, y0); y < FH; y += 4) {
      let blocked = false;
      for (let cx = (x - 4) >> 2; cx <= (x + 3) >> 2; cx++) if (this.get(cx, y >> 2) === T_STEEL) blocked = true;
      if (blocked) { y1 = y; break; }
    }
    if (x + 4 > BASE_X && x - 4 < BASE_X + 16) y1 = Math.min(y1, BASE_Y);
    this.beams.push({ x, y0, y1, t: 0, warn, dur: 22 });
    Sound.play('charge');
  },

  // ------------------------------------------------------------ per-frame update
  updateBosses() {
    if (!this.bosses.length) return;
    if (this.bossBanner > 0) this.bossBanner--;
    for (const b of this.bosses) { if (b.flash > 0) b.flash--; if (b.visibleT > 0) b.visibleT--; }
    // a hurt boss smokes (phase 2), then burns (phase 3)
    this.puffs = this.puffs || [];
    for (const pf of this.puffs) { pf.t--; pf.y -= 0.35; pf.x += pf.vx || 0; }
    this.puffs = this.puffs.filter(pf => pf.t > 0);
    const mb = this.mainBoss();
    if (mb && mb.alive && mb.phase >= 2 && this.bossTangible(mb) && this.frame % (mb.phase === 3 ? 5 : 12) === 0) {
      const [px, py] = BOSS_SMOKE[mb.kind] ? BOSS_SMOKE[mb.kind].call(this, mb) : [mb.x + 4 + rnd(Math.max(1, mb.w - 8)), mb.y + 4 + rnd(Math.max(1, mb.h - 8))];
      this.puffs.push({ x: px, y: py, t: 36, fire: mb.phase === 3 && Math.random() < 0.45, vx: (Math.random() - 0.5) * 0.3 });
    }
    if (this.bossNote && --this.bossNote.t <= 0) this.bossNote = null;
    for (const tr of this.tracks) tr.t--;
    this.tracks = this.tracks.filter(tr => tr.t > 0);
    for (const d of this.dust) d.t--;
    this.dust = this.dust.filter(d => d.t > 0);
    if (this.freezeE > 0 || this.over) return;
    // easier skills: bosses act on fewer frames (slower moves, fewer attacks)
    const pace = Config.skill().bossPace || 1;
    for (const b of this.bosses.slice()) {
      if (!b.alive) continue;
      b.pace = (b.pace || 0) + pace;
      if (b.pace < 1) continue;
      b.pace -= 1;
      if (b.stagger > 0) { b.stagger--; continue; }   // reeling from a phase change
      BOSS_AI[b.kind].call(this, b);
    }
    this.bosses = this.bosses.filter(b => b.alive || b.main);
    // laser beams: warning line, then a short deadly burst
    for (const bm of this.beams) {
      bm.t++;
      if (bm.t === bm.warn) Sound.play('laser');
      if (bm.t < bm.warn || bm.t >= bm.warn + bm.dur) continue;
      for (const t of this.tanks) {
        if (t.isPlayer && t.alive && overlap(t.x, t.y, 16, 16, bm.x - 4, bm.y0, 8, bm.y1 - bm.y0)) this.hitPlayer(t);
      }
      for (let y = bm.y0 >> 2; y < bm.y1 >> 2; y++) for (let cx = (bm.x - 4) >> 2; cx <= (bm.x + 3) >> 2; cx++) {
        if (this.get(cx, y) === T_BRICK) this.set(cx, y, T_EMPTY);
      }
    }
    this.beams = this.beams.filter(bm => bm.t < bm.warn + bm.dur);
  },

  // ------------------------------------------------------------ rendering
  renderBossUnder(ctx) {
    if (!this.bosses.length) return;
    for (const b of this.bosses) if (b.alive && BOSS_UNDER[b.kind]) BOSS_UNDER[b.kind].call(this, ctx, b);   // tracks, shadows, bales...
    ctx.fillStyle = '#707088';
    for (const tr of this.tracks) { ctx.globalAlpha = Math.min(1, tr.t / 120); ctx.fillRect(tr.x, tr.y, 2, 2); }
    ctx.fillStyle = '#A07848';
    for (const d of this.dust) { ctx.globalAlpha = Math.min(1, d.t / 30); ctx.fillRect(d.x, d.y, 2, 2); }
    ctx.globalAlpha = 1;
  },

  renderBosses(ctx) {
    for (const b of this.bosses) if (b.alive && !bossFlies(b)) this.drawBoss(ctx, b);
  },

  // above the trees: flying bosses, what bosses throw through the air, smoke and fire from a hurt boss
  renderBossOver(ctx) {
    if (!this.bosses.length) return;
    for (const b of this.bosses) if (b.alive && bossFlies(b)) this.drawBoss(ctx, b);
    for (const b of this.bosses) if (b.alive && BOSS_OVER[b.kind]) BOSS_OVER[b.kind].call(this, ctx, b);
    for (const pf of this.puffs || []) {
      const k = pf.t / 36;
      if (pf.fire && k > 0.5) ctx.fillStyle = (pf.t >> 1) & 1 ? '#F8D800' : '#F83800';
      else ctx.fillStyle = 'rgba(' + (pf.fire ? '60,60,60' : '150,150,150') + ',' + Math.min(0.8, k + 0.15) + ')';
      const sz = pf.fire && k > 0.5 ? 2 : 3 + Math.round((1 - k) * 2);
      ctx.fillRect(Math.round(pf.x - sz / 2), Math.round(pf.y - sz / 2), sz, sz);
    }
  },

  drawBoss(ctx, b) {
    const kind = b.kind === 'decoy' ? 'phantom' : b.kind, ph = b.kind === 'decoy' ? 1 : (b.phase || 1);
    let variant = 'n';
    if (b.flash > 0 && (b.flash & 2)) variant = 'f';
    else if ((b.mode === 'windup' || b.pinch > 0 || (kind === 'dread' && b.flash > 6)) && (this.frame >> 2) & 1) variant = 'r';
    const frame = kind === 'mole' ? (this.frame >> 2) & 1 : (b.animTick >> 1) & 1;
    ctx.save();
    if (b.stagger > 0) ctx.translate((this.frame >> 1) & 1 ? 1 : -1, 0);   // reeling from a phase change
    this.drawBossBody(ctx, b, kind, variant, frame, ph);
    ctx.restore();
    ctx.globalAlpha = 1;
    if (b.mode === 'dazed' || b.mode === 'stall') {
      ctx.fillStyle = '#F8D800';
      for (let i = 0; i < 3; i++) {
        const a = this.frame * 0.2 + i * 2.09;
        ctx.fillRect(Math.round(b.x + b.w / 2 + Math.cos(a) * 12), Math.round(b.y - 2 + Math.sin(a) * 4), 2, 2);
      }
    }
  },

  drawBossBody(ctx, b, kind, variant, frame, ph) {
    if (BOSS_RENDER[kind]) { BOSS_RENDER[kind].call(this, ctx, b, variant, frame, ph); return; }   // bosses2.js
    if (kind === 'mole') {
      // sand geysers about to burst under the players (phase 3)
      for (const gy of b.geysers || []) {
        ctx.fillStyle = (this.frame >> 1) & 1 ? '#C89858' : '#806040';
        for (let i = 0; i < 6; i++) {
          const a = this.frame * 0.3 + i * Math.PI / 3, r = 7 - gy.t / 10;
          ctx.fillRect(Math.round(gy.x + 8 + Math.cos(a) * r), Math.round(gy.y + 8 + Math.sin(a) * r), 2, 2);
        }
      }
      if (b.mode === 'under' || b.mode === 'emerge') {
        if (b.mode === 'emerge') {
          // swirling dust where it will surface
          ctx.fillStyle = (this.frame >> 2) & 1 ? '#C89858' : '#806040';
          for (let i = 0; i < 10; i++) {
            const a = this.frame * 0.25 + i * Math.PI / 5, r = 6 + (b.t % 20) / 2;
            ctx.fillRect(Math.round(b.x + 16 + Math.cos(a) * r), Math.round(b.y + 16 + Math.sin(a) * r), 3, 3);
          }
        }
        return;
      }
    }
    if (kind === 'phantom') {
      // unmasked (phase 3): it can't hide any more, it only flickers
      ctx.globalAlpha = b.mode === 'vanish' ? ((b.t >> 1) & 1 ? 0.6 : 0.1)
        : b.visibleT > 0 || b.flash > 0 ? 1 : ph === 3 ? ((this.frame >> 2) & 1 ? 0.85 : 0.45) : b.life ? 0.4 : 0.13 + ((this.frame >> 3) & 1) * 0.05;
    }
    if (kind === 'mole' && b.mode === 'burrow') ctx.globalAlpha = Math.max(0.15, 1 - b.t / 30);
    if (kind === 'hydra') {
      ctx.drawImage(BossGfx.get('hydra', frame, 2, variant, ph), b.x, b.y);
      b.turrets.forEach((tur, k) => {
        if (tur.hp <= 0 && tur.regrowT > 0) {
          // a head growing back: it swells out of the stump
          const s = 1 - tur.regrowT / HYDRA_REGROW, c = BossGfx.get('turret' + k, 0, 2, (this.frame >> 2) & 1 ? 'r' : 'n');
          ctx.drawImage(c, b.x + k * 16 + 8 - 8 * s, b.y + 2 + 8 - 8 * s, 16 * s, 16 * s);
          return;
        }
        ctx.drawImage(BossGfx.get('turret' + (tur.hp > 0 ? k : 3), 0, 2, tur.hp > 0 ? variant : 'n'), b.x + k * 16, b.y + 2);
      });
      if (b.turrets.every(t => t.hp === 0)) {
        // exposed core glows
        ctx.fillStyle = (this.frame >> 2) & 1 ? '#F83800' : '#F8D800';
        ctx.fillRect(b.x + 21, b.y + 23, 6, 4);
      }
      return;
    }
    ctx.drawImage(BossGfx.get(kind, frame, kind === 'dread' ? 2 : b.dir, variant, ph), b.x, b.y);
  },

  renderBeams(ctx) {
    for (const bm of this.beams) {
      if (bm.t < bm.warn) {
        if ((bm.t >> 2) & 1) { ctx.fillStyle = '#F83800'; ctx.fillRect(bm.x - 1, bm.y0, 2, bm.y1 - bm.y0); }
      } else {
        ctx.fillStyle = (bm.t >> 1) & 1 ? '#F83800' : '#F87858';
        ctx.fillRect(bm.x - 4, bm.y0, 8, bm.y1 - bm.y0);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(bm.x - 1, bm.y0, 2, bm.y1 - bm.y0);
      }
    }
  },

  renderBossBanner(ctx) {
    const nt = this.bossNote;
    if (nt && this.bossIdx !== undefined) {
      // a new phase: its name in a strip near the top of the field
      ctx.fillStyle = 'rgba(0,0,0,0.75)';
      ctx.fillRect(0, 22, VIEW_W, 13);
      Font.drawCenter(ctx, nt.text, VIEW_W / 2, 25, nt.gold ? COL.gold : (nt.t >> 3) & 1 ? '#F83800' : '#F8D800');
    }
    if (!this.bossBanner || this.bossIdx === undefined) return;
    const y = (VIEW_H >> 1) - 20;
    ctx.fillStyle = COL.black;
    ctx.fillRect(0, y - 4, VIEW_W, 32);
    if ((this.bossBanner >> 3) & 1) Font.drawCenter(ctx, 'WARNING', VIEW_W / 2, y, COL.red);
    Font.drawCenter(ctx, (BOSSES[this.bossIdx].kind === 'ufo' ? 'FINAL BOSS: ' : 'BOSS: ') + BOSSES[this.bossIdx].name, VIEW_W / 2, y + 13, COL.white);
  },

  renderBossHud(ctx, H) {
    const b = this.mainBoss();
    // HP bar
    ctx.fillStyle = COL.black;
    ctx.fillRect(H + 2, 20, 12, 90);
    const frac = b && b.alive ? Math.max(0, b.hp) / b.maxHp : 0;
    const hgt = Math.round(86 * frac);
    const ph = b ? b.phase || 1 : 1;
    ctx.fillStyle = ph === 3 && (this.frame >> 3) & 1 ? '#F8D800' : ['#E04030', '#F87830', '#F83800'][ph - 1];
    ctx.fillRect(H + 4, 22 + 86 - hgt, 8, hgt);
    // where the next phases begin
    ctx.fillStyle = COL.black;
    for (const k of [1 / 3, 2 / 3]) ctx.fillRect(H + 2, 22 + 86 - Math.round(86 * k), 12, 1);
    // escorts still to come
    ctx.drawImage(Sprites.enemyIcon, H, 112);
    Font.draw(ctx, String(Math.min(99, this.queue.length)), H + 8, 112, COL.black);
  },
});

// ------------------------------------------------------------------ boss behaviour (this = Stage)
// per-kind hooks (the newer bosses add theirs in bosses2.js): set-up, how hits land, what a new phase does,
// drawing (instead of the plain sprite), drawing over the trees, where smoke comes out
const BOSS_INIT = {}, BOSS_DAMAGE = {}, BOSS_RENDER = {}, BOSS_UNDER = {}, BOSS_OVER = {}, BOSS_SMOKE = {};
const HYDRA_REGROW = 480;
const BOSS_PHASE = {
  // HYDRA: from phase 2 a head that's lost grows back once (half strength)
  hydra(b, ph) { if (ph === 2) this.hydraRegrow(b); },
  // DREADNOUGHT: the left cannon is shot off (phase 2); the hatch blows and the reactor shows (phase 3)
  dread(b, ph) { this.addFx(b.x + (ph === 2 ? 12 : 24), b.y + (ph === 2 ? 8 : 26), BIG_EXPLOSION(), 4); Sound.play('explode'); },
  bear(b, ph) { if (ph === 3) { this.addFx(b.x + 16, b.y + 4, BIG_EXPLOSION(), 4); Sound.play('explode'); } },   // the ram plate comes off
};

const BOSS_AI = {
  // IRON BEAR: roams firing 3-shell volleys; flashes red, then charges in a line crushing bricks.
  // Dazed (double damage) after a charge, longer if it slammed into steel.
  // RAGING (phase 2): faster; calls 2 escorts; after a charge it turns on you and charges once more.
  // BERSERK (phase 3): the ram plate is gone; 5-shell volleys, hardly any wind-up, and it stomps out a ring of
  // shells when it shakes off a daze.
  bear(b) {
    b.t++;
    const ph = b.phase || 1, windup = [60, 40, 22][ph - 1];
    switch (b.mode) {
      case 'roam': {
        this.bossRoam(b, [0.5, 0.6, 0.8][ph - 1]);
        if (--b.cd <= 0) {
          for (const off of ph === 3 ? [-14, -7, 0, 7, 14] : [-10, 0, 10]) { const [x, y] = this.bossMuzzle(b, b.dir, off); this.bossFire(b, x, y, b.dir); }
          b.cd = [80, 55, 50][ph - 1];
        }
        if (b.t >= [360, 240, 180][ph - 1]) {
          const [cx, cy] = this.bossCenter(b), [tx, ty] = this.bossTarget(b);
          b.dir = this.dirToward(cx, cy, tx, ty);
          b.mode = 'windup'; b.t = 0;
          Sound.play('bossWarn');
        }
        break;
      }
      case 'windup':
        if (b.t >= windup) {
          b.mode = 'charge'; b.t = 0;
          if (ph >= 2 && !b.chained) { this.summonEscort(0); this.summonEscort(0); }
        }
        break;
      case 'charge': {
        const r = this.bossMove(b, b.dir, [3, 4, 4.5][ph - 1], true);
        if (b.t % 8 === 0) Sound.play('charge');
        if (r || b.t > 240) {
          if (ph >= 2 && !b.chained && r !== 'steel') {
            // round it comes for a second go
            b.chained = true;
            const [cx, cy] = this.bossCenter(b), [tx, ty] = this.bossTarget(b);
            b.dir = this.dirToward(cx, cy, tx, ty);
            b.mode = 'windup'; b.t = Math.max(0, windup - 16);
            Sound.play('explode');
            break;
          }
          b.chained = false;
          b.mode = 'dazed'; b.t = 0; b.dazeLen = r === 'steel' ? 180 : 120;
          Sound.play('explode');
        }
        break;
      }
      case 'dazed':
        if (b.t >= b.dazeLen) {
          b.mode = 'roam'; b.t = 0;
          if (ph === 3) this.bearStomp(b);
        }
        break;
    }
  },

  // MOLE: travels underground (only a dust trail), surfaces near a player or the eagle with a dust swirl
  // warning, fires a cross of 8 shells, then burrows again. Only hittable while up or burrowing.
  // TREMORS (phase 3): while it's under, the ground bursts up under each player (a dust swirl warns first).
  mole(b) {
    b.t++;
    b.geysers = b.geysers || [];
    for (const gy of b.geysers) {
      if (++gy.t < 45) continue;
      gy.done = true;
      for (let cy = gy.y >> 2; cy < (gy.y + 16) >> 2; cy++) for (let cx = gy.x >> 2; cx < (gy.x + 16) >> 2; cx++) if (this.get(cx, cy) === T_BRICK) this.set(cx, cy, T_EMPTY);
      for (const t of this.tanks) if (t.alive && t.isPlayer && overlap(t.x, t.y, 16, 16, gy.x + 2, gy.y + 2, 12, 12)) this.hitPlayer(t);
      this.addFx(gy.x + 8, gy.y + 8, Sprites.smallExp, 3);
    }
    b.geysers = b.geysers.filter(gy => !gy.done);
    if (b.phase === 3 && b.mode === 'under' && b.t % 100 === 50) {
      for (const t of this.tanks) if (t.alive && t.isPlayer && !t.ally) b.geysers.push({ x: Math.round(t.x / 4) * 4, y: Math.round(t.y / 4) * 4, t: 0 });
      Sound.play('burrow');
    }
    switch (b.mode) {
      case 'under': {
        if (!b.target) b.target = this.moleTarget(b, b.second);
        const sp = (b.enraged ? 1.6 : 1.2) * b.speedMul;
        const dx = b.target[0] - b.x, dy = b.target[1] - b.y, d = Math.hypot(dx, dy);
        if (d > sp) { b.x += dx / d * sp; b.y += dy / d * sp; }
        if (b.t % 3 === 0) this.dust.push({ x: b.x + 12 + rnd(8), y: b.y + 12 + rnd(8), t: 40 });
        if (d <= sp || b.t > 260) {
          b.x = Math.round(b.target[0] / 4) * 4; b.y = Math.round(b.target[1] / 4) * 4;
          b.mode = 'emerge'; b.t = 0;
          Sound.play('burrow');
        }
        break;
      }
      case 'emerge':
        if (b.t >= 60) {
          // bursts out of the ground: bricks and steel break, tanks underneath are hit
          for (let cy = b.y >> 2; cy < (b.y + b.h) >> 2; cy++) for (let cx = b.x >> 2; cx < (b.x + b.w) >> 2; cx++) {
            const t = this.get(cx, cy);
            if (t === T_BRICK || t === T_STEEL) this.set(cx, cy, T_EMPTY);
          }
          for (const t of this.tanks) {
            if (!t.alive || !overlap(t.x, t.y, 16, 16, b.x, b.y, b.w, b.h)) continue;
            if (t.isPlayer) this.hitPlayer(t); else this.killEnemy(t, null, false);
          }
          this.addFx(b.x + 16, b.y + 16, Sprites.bigExp, 4);
          Sound.play('explode');
          b.mode = 'up'; b.t = 0;
          this.moleVolley(b);
        }
        break;
      case 'up':
        if (b.enraged && b.t === 90) this.moleVolley(b);
        if (b.phase === 3 && b.t === 150) this.moleVolley(b);
        if (b.t >= 180) { b.mode = 'burrow'; b.t = 0; }
        break;
      case 'burrow':
        if (b.t >= 30) {
          if (b.enraged) this.mines.push({ x: b.x + 16, y: b.y + 16, byPlayer: false, owner: b, t: 0 });
          b.second = b.enraged && !b.second; // enraged: pops up twice in a row
          b.mode = 'under'; b.t = 0; b.target = null;
          Sound.play('burrow');
        }
        break;
    }
  },

  // HYDRA: drifts on its island. Left turret fires gatling bursts, right turret rockets, centre turret a
  // laser beam down the screen. Turrets are destroyed one by one; then the core is exposed.
  hydra(b) {
    b.t++;
    // slow drift left and right around its starting spot
    // BARE CORE (phase 3): it swings much further, faster
    if (b.t % (b.phase === 3 ? 2 : 4) === 0) {
      const r = this.bossStep(b, b.drift > 0 ? 1 : 3, false);
      if (r || Math.abs(b.x - b.home) >= (b.phase === 3 ? 40 : 16)) b.drift = -b.drift;
    }
    // REGROWING (phase 2 on): a lost head grows back, once
    for (const tur of b.turrets) {
      if (!(tur.regrowT > 0) || --tur.regrowT > 0) continue;
      tur.hp = Math.ceil(tur.max / 2); tur.cd = 60;
      b.hp = Math.min(b.maxHp, b.turrets.reduce((a, t) => a + t.hp, 0) + b.core);
      this.addFx(b.x + b.turrets.indexOf(tur) * 16 + 8, b.y + 8, [Sprites.sparkle[0], Sprites.sparkle[1], Sprites.sparkle[2], Sprites.sparkle[3]], 4);
      this.popups.push({ x: b.x + b.turrets.indexOf(tur) * 16 + 8, y: b.y - 4, text: 'REGROWN!', label: true, color: '#F83800', t: 0, delay: 0, life: 70 });
      Sound.play('bossWarn');
    }
    const [tx, ty] = this.bossTarget(b);
    const fast = b.enraged ? 0.5 : 1;
    b.turrets.forEach((tur, k) => {
      if (tur.hp <= 0) return;
      const cx = b.x + k * 16 + 8, cy = b.y + 14;
      tur.cd--;
      if (k === 0) {
        if (tur.cd <= 0) { tur.burst = 4; tur.cd = Math.round(120 * fast); }
        if (tur.burst > 0 && b.t % 8 === 0) {
          tur.burst--;
          const d = this.dirToward(cx, cy, tx, ty);
          this.bossFire(b, cx + DXY[d][0] * 10, cy + DXY[d][1] * 22, d, { speed: 3 });
        }
      } else if (k === 2) {
        if (tur.cd <= 0) {
          const d = this.dirToward(cx, cy, tx, ty);
          this.bossFire(b, cx + DXY[d][0] * 10, cy + DXY[d][1] * 22, d, { speed: 2, rocket: true });
          tur.cd = Math.round(140 * fast);
        }
      } else if (tur.cd <= 0) {
        this.addBeam(cx, b.y + b.h);
        tur.cd = Math.round(240 * fast);
      }
    });
    if (b.turrets.every(t => t.hp === 0) && --b.cd <= 0) {
      const [cx, cy] = this.bossCenter(b);
      for (const d of [1, 2, 3]) this.bossFire(b, cx + DXY[d][0] * 26, cy + DXY[d][1] * 18, d);
      b.cd = b.phase === 3 ? 40 : b.enraged ? 50 : 80;
    }
    if (b.phase === 3 && ++b.coreBeam >= 200) { b.coreBeam = 0; this.addBeam(b.x + 24, b.y + b.h); }
  },

  // PHANTOM: nearly invisible; shows itself only when it fires. Teleports every few seconds and leaves
  // decoys behind. On ice it leaves tracks; decoys don't.
  // UNMASKED (phase 3): the cloak is broken (it flickers); it blinks to a spot lined up with you, leaving an
  // after-image, and fires three at once.
  phantom(b) {
    b.t++;
    if (b.mode === 'vanish') {
      if (b.t >= 24) this.phantomTeleport(b);
      return;
    }
    if (b.phase === 3) {
      this.bossRoam(b, 1.2, 0.6);
      this.phantomTracks(b);
      if (++b.blinkT >= 100) { b.blinkT = 0; this.phantomBlink(b); }
      else if (--b.cd <= 0) {
        const [x, y] = this.bossMuzzle(b, b.dir);
        this.bossFire(b, x, y, b.dir, { speed: 3 });
        b.visibleT = 20; b.cd = 50;
      }
      return;
    }
    this.bossRoam(b, b.enraged ? 1.1 : 0.9, 0.5);
    this.phantomTracks(b);
    if (--b.cd <= 0) {
      const [x, y] = this.bossMuzzle(b, b.dir);
      this.bossFire(b, x, y, b.dir, { speed: 3 });
      b.visibleT = 30;
      b.cd = b.enraged ? 45 : 60;
    }
    if (++b.tele >= (b.enraged ? 220 : 300)) {
      b.mode = 'vanish'; b.t = 0; b.tele = 0;
      for (const o of this.bosses) if (o.kind === 'decoy' && o.alive) { o.alive = false; this.addFx(o.x + 16, o.y + 16, Sprites.smallExp, 3); }
      Sound.play('teleport');
    }
  },

  decoy(b) {
    b.t++;
    if (b.life) { if (--b.life <= 0) b.alive = false; return; }   // an after-image: it just fades
    this.bossRoam(b, 0.9, 0.5);
    const main = this.mainBoss();
    if (main && main.enraged && --b.cd <= 0) {
      const [x, y] = this.bossMuzzle(b, b.dir);
      this.bossFire(b, x, y, b.dir, { speed: 3 });
      b.visibleT = 30;
      b.cd = 70 + rnd(30);
    }
  },

  // DREADNOUGHT: phase 1 cannons + hatch releasing armor tanks; phase 2 mine lines and spread volleys;
  // phase 3 crawls toward the eagle crushing bricks and sweeps laser beams down the screen.
  dread(b) {
    b.t++;
    const phase = b.phase || 1;
    const [tx, ty] = this.bossTarget(b);
    if (--b.cd <= 0) {
      b.cannon = phase >= 2 ? 1 : b.cannon ^ 1;   // the left cannon is gone from phase 2
      const cx = b.x + (b.cannon ? 36 : 12), cy = b.y + b.h - 4;
      const d = Math.abs(ty - cy) < 12 ? (tx > cx ? 1 : 3) : 2;
      this.bossFire(b, cx + DXY[d][0] * 16, cy + DXY[d][1] * 4, d, { speed: 3, power: true });
      b.cd = phase === 1 ? 45 : phase === 2 ? 70 : 60;
    }
    if (phase <= 2 && ++b.hatchT >= (phase === 1 ? 600 : 900)) {
      b.hatchT = 0;
      this.summonEscort(3);
      Sound.play('burrow');
    }
    if (phase === 2) {
      if (++b.mineT >= 420) {
        b.mineT = 0;
        // across the most open row in the middle third of the field
        const open = (x, y) => [T_EMPTY, T_ICE, T_FOREST].includes(this.get(x >> 2, y >> 2));
        let best = null, bestN = -1;
        for (let y = Math.round(FH * 0.35 / 16) * 16 + 8; y <= FH * 0.65; y += 16) {
          let n = 0;
          for (let x = 24; x < FW - 8; x += 32) if (open(x, y)) n++;
          if (n > bestN || (n === bestN && Math.random() < 0.5)) { bestN = n; best = y; }
        }
        for (let x = 24; x < FW - 8; x += 32) if (open(x, best)) this.mines.push({ x, y: best, byPlayer: false, owner: b, t: -20 });
        Sound.play('build');
      }
      if (++b.volT >= 90) {
        b.volT = 0;
        const [cx, cy] = this.bossCenter(b);
        for (const d of [1, 2, 3]) this.bossFire(b, cx + DXY[d][0] * 26, cy + DXY[d][1] * 26, d, { speed: 2.5 });
      }
    }
    if (phase === 3) {
      if (b.y + b.h < BASE_Y - 32) this.bossMove(b, 2, 0.25, true);
      if (++b.laserT >= 240) { b.laserT = 0; this.addBeam(Math.round(tx), b.y + b.h); b.laser2 = 45; }
      if (b.laser2 > 0 && --b.laser2 === 0) { const [tx2] = this.bossTarget(b); this.addBeam(Math.round(tx2), b.y + b.h); }
    }
  },
};

Object.assign(Stage.prototype, {
  moleTarget(b, near) {
    let [tx, ty] = near ? [b.x + 16 + rnd(97) - 48, b.y + 16 + rnd(97) - 48]
      : (Math.random() < 0.6 ? this.bossTarget(b) : [BASE_X + 8, BASE_Y - 40]);
    for (let tries = 0; tries < 12; tries++) {
      let x = Math.max(0, Math.min(FW - 32, Math.round((tx - 16) / 8) * 8));
      let y = Math.max(0, Math.min(FH - 32, Math.round((ty - 16) / 8) * 8));
      // never surface on the eagle (stay above its fortress) or in water
      while (y > 0 && overlap(x, y, 32, 32, BASE_X - 16, BASE_Y - 16, 48, 32)) y -= 8;
      let water = false;
      for (let cy = y >> 2; cy < (y + 32) >> 2; cy++) for (let cx = x >> 2; cx < (x + 32) >> 2; cx++) if (this.get(cx, cy) === T_WATER) water = true;
      if (!water) return [x, y];
      tx += rnd(65) - 32; ty -= 16;
    }
    return [b.x, b.y];
  },

  moleVolley(b) {
    const [cx, cy] = this.bossCenter(b);
    for (const d of [0, 1, 2, 3]) {
      for (const off of [-8, 8]) {
        const [x, y] = [cx + DXY[d][0] * 18 + (DXY[d][1] ? off : 0), cy + DXY[d][1] * 18 + (DXY[d][0] ? off : 0)];
        this.bossFire(b, x, y, d, { speed: 2.5 });
      }
    }
  },

  phantomTracks(b) {
    const [cx, cy] = this.bossCenter(b);
    if (b.animTick % 4 === 0 && this.get(cx >> 2, cy >> 2) === T_ICE && b.lastTrack !== b.animTick) {
      b.lastTrack = b.animTick;
      const side = (b.dir & 1) ? [[0, -9], [0, 8]] : [[-9, 0], [8, 0]];
      for (const [dx, dy] of side) this.tracks.push({ x: cx + dx, y: cy + dy, t: 240 });
    }
  },

  // a random free spot in the upper part of the field
  freeSpot(w, h) {
    for (let tries = 0; tries < 40; tries++) {
      const x = rnd((FW - w) / 8 + 1) * 8, y = rnd(Math.max(1, Math.floor((FH * 0.6 - h) / 8))) * 8;
      let ok = true;
      for (let cy = y >> 2; cy < (y + h) >> 2 && ok; cy++) for (let cx = x >> 2; cx < (x + w) >> 2; cx++) {
        const t = this.get(cx, cy);
        if (t === T_BRICK || t === T_STEEL || t === T_WATER) { ok = false; break; }
      }
      if (ok && this.tanks.some(t => overlap(x, y, w, h, t.x - 8, t.y - 8, 32, 32))) ok = false;
      if (ok && this.bosses.some(o => o.alive && overlap(x, y, w, h, o.x, o.y, o.w, o.h))) ok = false;
      if (ok) return [x, y];
    }
    return null;
  },

  // the berserk bear shakes off a daze: a ring of shells, two each way
  bearStomp(b) {
    const [cx, cy] = this.bossCenter(b);
    for (const d of [0, 1, 2, 3]) for (const off of [-8, 8]) {
      this.bossFire(b, cx + DXY[d][0] * 18 + (DXY[d][1] ? off : 0), cy + DXY[d][1] * 18 + (DXY[d][0] ? off : 0), d, { speed: 2.5 });
    }
    this.addFx(cx, cy, Sprites.bigExp, 4);
    Sound.play('explode');
  },

  // a lost hydra head starts growing back (once a fight, and only while another head still stands)
  hydraRegrow(b) {
    if (b.regrown) return;
    const dead = b.turrets.filter(t => t.hp <= 0 && !(t.regrowT > 0));
    if (!dead.length || dead.length === 3) return;
    dead[0].regrowT = HYDRA_REGROW;
    b.regrown = true;
  },

  // the unmasked phantom blinks to a spot lined up with the nearest player, 3-4 tiles away, and fires 3 at once
  phantomBlink(b) {
    const pl = this.tanks.filter(t => t.isPlayer && t.alive && !t.boost.smoke);
    if (!pl.length) return;
    const t = pl[rnd(pl.length)], free = (x, y) => {
      if (x < 0 || y < 0 || x > FW - 32 || y > FH - 32 || overlap(x, y, 32, 32, BASE_X - 16, BASE_Y - 16, 48, 32)) return false;
      for (let cy = y >> 2; cy < (y + 32) >> 2; cy++) for (let cx = x >> 2; cx < (x + 32) >> 2; cx++) {
        const v = this.get(cx, cy);
        if (v === T_BRICK || v === T_STEEL || v === T_WATER) return false;
      }
      return !this.tanks.some(o => o.alive && overlap(x, y, 32, 32, o.x, o.y, 16, 16));
    };
    const spots = [];
    for (const d of [0, 1, 2, 3]) for (const dist of [56, 64, 48]) {
      const x = Math.round((t.x - 8 - DXY[d][0] * dist) / 8) * 8, y = Math.round((t.y - 8 - DXY[d][1] * dist) / 8) * 8;
      if (free(x, y)) { spots.push([x, y, d]); break; }
    }
    if (!spots.length) return;
    const [x, y, d] = spots[rnd(spots.length)];
    this.bosses.push(new Boss({ kind: 'decoy', main: false, x: b.x, y: b.y, w: 32, h: 32, hp: 1, maxHp: 1, dir: b.dir, life: 90, mode: 'roam' }));
    b.x = x; b.y = y; b.dir = d; b.acc = 0;
    for (const off of [-10, 0, 10]) { const [mx, my] = this.bossMuzzle(b, d, off); this.bossFire(b, mx, my, d, { speed: 3 }); }
    b.visibleT = 30; b.cd = 40;
    Sound.play('teleport');
  },

  phantomTeleport(b) {
    const spot = this.freeSpot(b.w, b.h);
    if (spot) [b.x, b.y] = spot;
    b.mode = 'roam'; b.t = 0; b.cd = 40;
    const n = b.enraged ? 3 : 2;
    for (let i = 0; i < n; i++) {
      const s = this.freeSpot(32, 32);
      if (s) this.bosses.push(new Boss({ kind: 'decoy', main: false, x: s[0], y: s[1], w: 32, h: 32, hp: 1, maxHp: 1, dir: rnd(4), cd: 60 + rnd(40), mode: 'roam' }));
    }
    Sound.play('teleport');
  },
});
