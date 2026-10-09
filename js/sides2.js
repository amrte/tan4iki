'use strict';
// =====================================================================
//  ANY SIDE, the twists (main.js turns the field; this gives every stage something of its own)
//    - the eagle's edge goes round, a new one each stage: left, top, right, bottom, so any four stages in a row
//      bring all four
//    - a twist on most stages (the same each time a run gets there, from the run's seed):
//        TWO FRONTS      stage 2, 7, 12 ...  the far edge and a flank take turns, a wave each, and every wave from a
//                                            new edge is announced by arrows where it will come in
//        THE EAGLE MOVES stage 3, 8, 13 ...  once a third of them are beaten a truck carries the eagle along a road
//                                            to a new fort on an edge beside it. They go for the truck (lose it and the
//                                            eagle is lost); the fort is built round it when it arrives and the
//                                            enemy then comes from across the new edge
//        WIND            stage 4, 14, 24 ... shells drift with the wind (a sock in the left border shows it)
//        ICE SLOPE       stage 9, 19, 29 ... an icy map tilted towards the eagle: anything on the ice slides that way
//        MIRROR          every 5th stage     two eagles on opposite edges, the enemy in from both flanks, half going
//                                            for each; lose either and it's over
//    - maps made for each edge (a river with bridges in front of the fort, a cliff top with ramps ...), mixed in
//      with the turned classics
//    - before each stage a few seconds to put down sandbags or a turret (1-2 each), facing the way they come
//    - a streak: sides cleared in a row without losing the eagle; all four pays a bonus
//    - the curtain shows the next stage in miniature: the eagle, where they come in, the twist, the streak
// =====================================================================

const SD_ROT = ['left', 'top', 'right', 'bottom'];
const SD_QUARTER = { bottom: 0, left: 1, top: 2, right: 3 };   // quarter turns from "eagle at the bottom"
const SD_OPP = { left: 'right', right: 'left', top: 'bottom', bottom: 'top' };
const SD_OUT = { top: 0, right: 1, bottom: 2, left: 3 };        // the way towards that edge
const SD_PLACE_TIME = 600, SD_WARN = 150, SD_TRUCK_SPEED = 0.35, SD_TRUCK_HP = 3, SD_SLOPE = 0.3, SD_BAG_HP = 4;
const SD_STREAK_BONUS = 5000, SD_MOVE_LATEST = 2700;
const SD_WIND = [0, 0.05, 0.09, 0.13];                         // drift per frame at each wind strength
const SD_TWISTS = {
  two: { name: 'TWO FRONTS', desc: 'FAR SIDE + A FLANK', note: 'WATCH YOUR FLANK' },
  move: { name: 'THE EAGLE MOVES', desc: 'ESCORT THE TRUCK', note: 'IT MOVES TO A NEW FORT' },
  wind: { name: 'WIND', desc: 'SHELLS DRIFT', note: 'SHELLS DRIFT WITH IT' },
  slope: { name: 'ICE SLOPE', desc: 'ICE SLIDES TO YOU', note: 'THE ICE SLIDES DOWNHILL' },
  mirror: { name: 'MIRROR STAGE', desc: 'GUARD BOTH EAGLES', note: 'LOSE EITHER AND IT ENDS' },
};

// maps made for one edge, as 13x13 tiles the way they're played (the classic tile codes, and = bridge, m mud).
// The eagle, its fort, the starts and the entry points are cleared by the loader; ice: the one for the ICE SLOPE
const SD_MAPS = {
  left: [
    { name: 'RIVER BANK', rows: [   // a river along the fort's edge, three bridges over it
      '...~...#..%..',
      '.#.~.@.#..%%.',
      '...=......#..',
      '.#.~.##.@....',
      '...~..#...%%.',
      '...~.....@...',
      '...=..##.....',
      '...~.....@...',
      '...~..#...%%.',
      '.#.~.##.@....',
      '...=......#..',
      '.#.~.@.#..%%.',
      '...~...#..%..'] },
    { name: 'GLACIER', ice: true, rows: [
      '...___.___...',
      '.#.___@___.#.',
      '...__#_#__...',
      '.@.___.___.@.',
      '...#__.__#...',
      '..._______...',
      '...__@_@__...',
      '..._______...',
      '...#__.__#...',
      '.@.___.___.@.',
      '...__#_#__...',
      '.#.___@___.#.',
      '...___.___...'] },
    { name: 'CANYON', rows: [   // steel walls in long lanes towards the fort
      '.......%%%...',
      '..#....%.%..#',
      '..#.#.......#',
      '...@@@@.@@@@.',
      '.....#...#...',
      '..%%.#.#.#.%%',
      '..%%...#....%',
      '..%%.#.#.#.%%',
      '.....#...#...',
      '...@@@@.@@@@.',
      '..#.#.......#',
      '..#....%.%..#',
      '.......%%%...'] },
  ],
  top: [
    { name: 'CLIFF TOP', rows: [   // the fort on a cliff: a steel edge with three muddy ramps up
      '.............',
      '.#.#.....#.#.',
      '.............',
      '..%...#...%..',
      '@@m@@@m@@@m@@',
      '..m...m...m..',
      '.#...#.#...#.',
      '.#.%.....%.#.',
      '...%%.#.%%...',
      '.#...#.#...#.',
      '.#.........#.',
      '...#.....#...',
      '.............'] },
    { name: 'ICE SHELF', ice: true, rows: [
      '.............',
      '.##.......##.',
      '....._._.....',
      '.__@_____@__.',
      '.____#_#____.',
      '.@_________@.',
      '.___#___#___.',
      '.___________.',
      '.__@__#__@__.',
      '.___________.',
      '.#__#___#__#.',
      '.____...____.',
      '.............'] },
    { name: 'CITY BLOCKS', rows: [
      '.............',
      '.##.#...#.##.',
      '.##.#...#.##.',
      '.............',
      '.#.##.#.##.#.',
      '.#.##.#.##.#.',
      '......@......',
      '.##.#...#.##.',
      '.##.#.%.#.##.',
      '.....%%%.....',
      '.#.##.%.##.#.',
      '.#.##...##.#.',
      '.............'] },
  ],
  right: [
    { name: 'DELTA', rows: [   // a river splitting in front of the fort, bridges across
      '..%%....~....',
      '.......~~.#..',
      '.#..#..~..#..',
      '.#..#.~~.....',
      '......~...@..',
      '..%%..=..#...',
      '..%%.~~=~~...',
      '..%%..=..#...',
      '......~...@..',
      '.#..#.~~.....',
      '.#..#..~..#..',
      '.......~~.#..',
      '..%%....~....'] },
    { name: 'FROZEN BAY', ice: true, rows: [
      '....%%.......',
      '._____..#.#..',
      '.__@__.......',
      '.______#..@..',
      '.__#___......',
      '.______@.#...',
      '.______.__...',
      '.______@.#...',
      '.__#___......',
      '.______#..@..',
      '.__@__.......',
      '._____..#.#..',
      '....%%.......'] },
    { name: 'WOODS', rows: [
      '.%%%..#..%%..',
      '.%%%..#..%%..',
      '......#......',
      '.#.%%%%%.#...',
      '.#.%...%.#.#.',
      '...%.#.%...#.',
      '...%.#.......',
      '...%.#.%...#.',
      '.#.%...%.#.#.',
      '.#.%%%%%.#...',
      '......#......',
      '.%%%..#..%%..',
      '.%%%..#..%%..'] },
  ],
  bottom: [
    { name: 'THE DAM', rows: [   // a reservoir and a dam across the field, two spillways through
      '.............',
      '.~~~~.~.~~~~.',
      '.~~~~=~=~~~~.',
      '.~~~~.~.~~~~.',
      '.............',
      '@@@.@@@@@.@@@',
      '.#...#.#...#.',
      '.#.%.....%.#.',
      '...%..#..%...',
      '.#.%.....%.#.',
      '.#...#.#...#.',
      '.............',
      '.............'] },
    { name: 'ICE RINK', ice: true, rows: [
      '.............',
      '.#.#.#.#.#.#.',
      '.............',
      '._____@_____.',
      '.__#_____#__.',
      '.___________.',
      '.@__#___#__@.',
      '.___________.',
      '.__#_____#__.',
      '._____@_____.',
      '.............',
      '.#.#.....#.#.',
      '.............'] },
    { name: 'TRENCHES', rows: [
      '.............',
      '.%%.......%%.',
      '####.###.####',
      '.............',
      '.@..##.##..@.',
      '.............',
      '##.####.####.',
      '.............',
      '.@..##.##..@.',
      '.............',
      '####.###.####',
      '.............',
      '.............'] },
  ],
};
const SD_TILE = Object.assign({}, TILE_PAT, { '=': ['==', '=='], m: ['mm', 'mm'] });

// a 13x13 tile map -> 26 rows of blocks
function sdMapBlocks(rows) {
  const out = [];
  for (const r of rows) {
    let a = '', b = '';
    for (const ch of r) { const p = SD_TILE[ch] || SD_TILE['.']; a += p[0]; b += p[1]; }
    out.push(a, b);
  }
  return out;
}

// a 16px spot in "eagle at the bottom" terms, turned so the bottom faces side (as turnBlocks turns the map)
function sdTurnPt(x, y, side) {
  const W = 192;   // ANY SIDE is always the classic 13x13 field
  switch (side) {
    case 'left': return [W - y, x];
    case 'right': return [y, W - x];
    case 'top': return [W - x, W - y];
    default: return [x, y];
  }
}
// the edge a spot on the field's rim is on (never asked about a corner)
function sdEdgeOf(x, y) { return x <= 0 ? 'left' : x >= 192 ? 'right' : y <= 0 ? 'top' : 'bottom'; }

// what stage n of a run brings: the eagle's edge, the twist, the map, and the coin tosses inside the twist
function sdPlanFor(n, seed, side) {
  n = Math.max(1, n | 0);
  const r = seeded((seed | 0) * 131 + n * 7919 + 17);
  r();
  if (!SD_ROT.includes(side)) side = SD_ROT[((seed | 0) + n - 1) % 4];
  const k = n % 5, twist = k === 0 ? 'mirror' : k === 2 ? 'two' : k === 3 ? 'move' : k === 4 ? (Math.floor(n / 5) % 2 ? 'slope' : 'wind') : null;
  const flank = r() < 0.5 ? 'l' : 'r', moveTo = r() < 0.5 ? 'l' : 'r', windSign = r() < 0.5 ? 1 : -1, pick = r(), which = r();
  const pool = SD_MAPS[side];
  let map = -1;
  if (twist === 'slope') map = pool.findIndex(m => m.ice);
  else if (twist !== 'mirror' && pick < 0.55) {
    const dry = pool.map((m, i) => i).filter(i => !pool[i].ice);
    map = dry[Math.floor(which * dry.length)];
  }
  return { n, side, twist, map, flank, moveTo, windSign };
}

// where everything goes for a plan (the field already turned): the blocks, the fronts the enemy comes in on (each a
// list of [x, y, dir]), the twin eagle, the new fort's site; all worked out with the eagle at the bottom, then turned
function sdModel(plan, map) {
  const S = plan.side, T = (x, y) => sdTurnPt(x, y, S), D = d => (d + SD_QUARTER[S]) % 4;
  const front = (list, d) => { const pts = list.map(([x, y]) => T(x, y).concat(D(d))); return { edge: sdEdgeOf(pts[0][0], pts[0][1]), pts }; };
  let blocks;
  const own = plan.map >= 0 && SD_MAPS[S][plan.map];
  if (own) blocks = sdMapBlocks(own.rows);
  else {
    let b = mapToBlocks(map);
    if (plan.twist === 'mirror') b = b.slice(13).reverse().concat(b.slice(13));   // the eagle's half twice, back to back
    blocks = turnBlocks(b, S);
  }
  const m = { blocks, side: S, name: own ? own.name : null, base: T(96, 192), fronts: [front([[96, 0], [192, 0], [0, 0]], 2)], players: null, twin: null, site: null };
  if (plan.twist === 'two') {
    const x = plan.flank === 'l' ? 0 : 192;
    m.fronts.push(front([[x, 64], [x, 112]], plan.flank === 'l' ? 1 : 3));
  } else if (plan.twist === 'mirror') {
    const [tx, ty] = T(96, 0);
    m.twin = { x: tx, y: ty, side: SD_OPP[S] };
    m.fronts = [front([[0, 96], [0, 64], [0, 128]], 1), front([[192, 96], [192, 64], [192, 128]], 3)];
    m.players = [T(64, 192), T(128, 0), T(128, 192), T(64, 0)];   // II and IV by the other eagle
  } else if (plan.twist === 'move') {
    const l = plan.moveTo === 'l', ex = l ? 0 : 192, [sx, sy] = T(ex, 96);
    m.site = { x: sx, y: sy, side: sdEdgeOf(sx, sy), players: [T(ex, 64), T(ex, 128), T(ex, 0), T(ex, 192)] };
    m.fronts.push(front([[192 - ex, 96], [192 - ex, 192], [192 - ex, 0]], l ? 3 : 1));   // from across the new edge
  }
  return m;
}

// a sandbag wall is the half of its tile that faces the enemy
function sdBagRect(b) {
  const d = b.dir;
  return d === 0 ? [b.x, b.y, 16, 8] : d === 2 ? [b.x, b.y + 8, 16, 8] : d === 1 ? [b.x + 8, b.y, 8, 16] : [b.x, b.y, 8, 16];
}
// ground a truck drives over as it is (anything else on its road is cleared away, water bridged)
const sdRoadOk = v => v === T_EMPTY || v === T_FOREST || v === T_ICE || v === T_BRIDGE || v === T_MUD || isBelt(v) || v === T_REEDS;

// ------------------------------------------------------------ sprites
const SD_TRUCK_ROWS = [   // facing up: the cab in front, the eagle riding on the flatbed
  '...HDDDDDDDDH...',
  '...DGGGGGGGGD...',
  '.KKDWwWWWWWWDKK.',
  '.KKDWWWWWWWWDKK.',
  '.KKDGGGGGGGGDKK.',
  '...DLLLLLLLLD...',
  '..DDDDDDDDDDDD..',
  '.KDBBBBBBBBBBDK.',
  '.KD1bbbbbbbb1DK.',
  '.KD11bb11bb11DK.',
  '.KD111b12b111DK.',
  '.KDb11111111bDK.',
  '.KDbb1b11b1bbDK.',
  '.KDbbb1111bbbDK.',
  '..DDDDDDDDDDDD..',
  '...R........R...',
];
const SD_TRUCK_PAL = { K: '#181818', D: '#203800', G: '#4C8C10', L: '#94C848', W: '#7CC8F0', w: '#E8F8FC', H: '#F8F0A0',
  B: '#4C2C08', b: '#7C5418', 1: '#D8D8D8', 2: '#D82800', R: '#D82800' };
const SD_ARROW_ROWS = [
  '.......OO.......',
  '......ORRO......',
  '.....ORRRRO.....',
  '....ORRRRRRO....',
  '...ORRRRRRRRO...',
  '..ORRRRRRRRRRO..',
  '.ORRRRRRRRRRRRO.',
  '.OOOORRRRRROOOO.',
  '....ORRRRRRO....',
  '....ORRRRRRO....',
  '....ORRRRRRO....',
  '....ORRRRRRO....',
  '....ORRRRRRO....',
  '....OOOOOOOO....',
  '................',
  '................',
];
let sdSpr = null;
function sdTurnCanvas(src, d) {
  const c = makeCanvas(16, 16), x = c.getContext('2d');
  x.imageSmoothingEnabled = false;
  x.translate(8, 8); x.rotate(d * Math.PI / 2); x.drawImage(src, -8, -8);
  return c;
}
function sdSprites() {
  if (sdSpr) return sdSpr;
  // a sandbag wall facing up: a row of three sacks with two on top, a shadow behind
  const bag = makeCanvas(16, 16), g = bag.getContext('2d');
  const sack = (x, y) => {
    g.fillStyle = '#5C3C10'; g.fillRect(x + 1, y, 4, 1); g.fillRect(x, y + 1, 6, 2); g.fillRect(x + 1, y + 3, 4, 1);
    g.fillStyle = '#C89C58'; g.fillRect(x + 1, y + 1, 4, 2);
    g.fillStyle = '#ECD49C'; g.fillRect(x + 1, y + 1, 2, 1);
    g.fillStyle = '#9C7434'; g.fillRect(x + 4, y + 2, 1, 1);
  };
  g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(1, 8, 14, 2);
  for (const x of [0, 5, 10]) sack(x, 4);
  for (const x of [2, 8]) sack(x, 1);
  g.fillStyle = '#5C3C10'; g.fillRect(15, 5, 1, 2);
  const truck = paintRows(SD_TRUCK_ROWS, SD_TRUCK_PAL), arrow = paintRows(SD_ARROW_ROWS, { O: '#F8F8F8', R: '#D82800' });
  sdSpr = {
    truck: [0, 1, 2, 3].map(d => sdTurnCanvas(truck, d)),
    bag: [0, 1, 2, 3].map(d => sdTurnCanvas(bag, d)),
    arrow: [0, 1, 2, 3].map(d => sdTurnCanvas(arrow, d)),
  };
  return sdSpr;
}

Object.assign(Stage.prototype, {
  // ------------------------------------------------------------ setting up
  sdSetup(pend) {
    const { plan, model: m } = pend, many = plan.twist === 'two' || plan.twist === 'mirror';
    const sd = this.sd = {
      plan, twist: plan.twist, name: m.name, fronts: m.fronts, cur: 0, wave: 0, waveN: many ? 4 + this.extraPlayers : 1e9, left: 0, pos: 0,
      warn: null, notes: [], bags: [], road: null, site: null, truck: null, twin: null, wind: null, slope: plan.twist === 'slope',
      split: 0, moved: false, build: [], clock: 0, moveAt: 0,
    };
    sd.left = sd.waveN;
    if (m.twin) this.sdMakeTwin(m.twin);
    if (m.site) this.sdMakeRoad(m.site);
    if (plan.twist === 'wind') sd.wind = { dir: (BASE_FWD + (plan.windSign > 0 ? 1 : 3)) % 4, str: 2, t: 480 };
    if (plan.twist === 'mirror') sd.warn = { f: 0, t: SD_WARN };   // the first wave is from a flank: say so
    this.sdPlace = this.sdNewPlace();
  },

  // run fn with the stage's globals pointing at the twin eagle (its fort, minefield, gun and repairs use them)
  sdAtTwin(fn) {
    const tw = this.sd && this.sd.twin;
    if (!tw) return undefined;
    const keep = [BASE_X, BASE_Y, BASE_SIDE, BASE_FWD, BASE_WALL];
    BASE_X = tw.x; BASE_Y = tw.y; BASE_SIDE = tw.side; BASE_FWD = SIDE_FWD[tw.side]; BASE_WALL = baseRing(1);
    try { return fn(); } finally { [BASE_X, BASE_Y, BASE_SIDE, BASE_FWD, BASE_WALL] = keep; }
  },

  // MIRROR: the second eagle, in a fort of its own built to the same upgrades, facing its own way
  sdMakeTwin(t) {
    const tw = this.sd.twin = { x: t.x, y: t.y, side: t.side, alive: true, armor: this.eagleArmor, inv: 0, flash: 0, gunT: 90, gunDir: SIDE_FWD[t.side] };
    this.sdAtTwin(() => {
      for (let y = BASE_Y / 8; y < BASE_Y / 8 + 2; y++) for (let x = BASE_X / 8; x < BASE_X / 8 + 2; x++) this.setBlock(x, y, T_EMPTY);
      if (this.base.walls >= 1) for (const [x, y] of baseRing(2)) this.setBlock(x, y, this.outerWallType(x, y));
      SD_SET_WALLS.call(this, T_BRICK);
      this.placeMinefield(this.base.field * 2);
    });
    return tw;
  },

  // THE EAGLE MOVES: room for the new fort, and the road to it (cleared, water bridged; the old fort stays shut
  // until the truck breaks out of it)
  sdMakeRoad(site) {
    const sd = this.sd;
    sd.site = { x: site.x, y: site.y, side: site.side, players: site.players.map(p => p.slice()) };
    this.clearArea(site.x - 16, site.y - 16, 48, 48);
    for (const [x, y] of site.players) this.clearArea(x, y, 16, 16);
    sd.road = this.sdRoute(BASE_X, BASE_Y, site.x, site.y);
    for (const [x, y] of sd.road) {
      if (Math.abs(x - BASE_X) <= 16 && Math.abs(y - BASE_Y) <= 16) continue;
      for (let cy = y >> 2; cy < (y + 16) >> 2; cy++) for (let cx = x >> 2; cx < (x + 16) >> 2; cx++) {
        const v = this.get(cx, cy);
        if (v === T_WATER) this.set(cx, cy, T_BRIDGE);
        else if (v >= 0 && !sdRoadOk(v)) this.set(cx, cy, T_EMPTY);
      }
    }
    this.pads = this.pads.filter(p => !sd.road.some(([x, y]) => overlap(x, y, 16, 16, p.x, p.y, 16, 16)));
    sd.moveAt = Math.max(1, Math.ceil(this.total / 3));
  },

  // the truck's way: the cheapest on the 8px grid, through as little wall and as few turns as it can
  sdRoute(x0, y0, x1, y1) {
    const NX = COLS * 2 - 1, NY = ROWS * 2 - 1, N = NX * NY, cost = new Float32Array(N);
    const avoid = PLAYER_SPAWN.concat(ENEMY_SPAWNS);
    for (let by = 0; by < NY; by++) for (let bx = 0; bx < NX; bx++) {
      let c = 1;
      for (let cy = by * 2; cy < by * 2 + 4; cy++) for (let cx = bx * 2; cx < bx * 2 + 4; cx++) {
        const v = this.get(cx, cy);
        if (v === T_BRICK) c += 0.4; else if (v === T_WATER) c += 1; else if (!sdRoadOk(v)) c += 2;
      }
      const x = bx * 8, y = by * 8;
      if (avoid.some(([ax, ay]) => overlap(x, y, 16, 16, ax, ay, 16, 16)) && Math.hypot(x - x0, y - y0) > 24 && Math.hypot(x - x1, y - y1) > 24) c += 6;
      cost[by * NX + bx] = c;
    }
    const start = (y0 >> 3) * NX + (x0 >> 3), goal = (y1 >> 3) * NX + (x1 >> 3);
    const dist = new Float64Array(N * 4).fill(Infinity), prev = new Int32Array(N * 4).fill(-1), h = new NavHeap();
    for (let d = 0; d < 4; d++) { dist[start * 4 + d] = 0; h.push(0, start * 4 + d); }
    let end = -1;
    while (h.size) {
      const [dd, s] = h.pop();
      if (dd > dist[s]) continue;
      const n = s >> 2, pd = s & 3;
      if (n === goal) { end = s; break; }
      const nx = n % NX, ny = (n / NX) | 0;
      for (let d = 0; d < 4; d++) {
        const ux = nx + DXY[d][0], uy = ny + DXY[d][1];
        if (ux < 0 || uy < 0 || ux >= NX || uy >= NY) continue;
        const u = uy * NX + ux, us = u * 4 + d, nd = dd + cost[u] + (d !== pd && n !== start ? 3 : 0);
        if (nd < dist[us]) { dist[us] = nd; prev[us] = s; h.push(nd, us); }
      }
    }
    const path = [];
    for (let s = end; s >= 0; s = prev[s]) { const n = s >> 2; path.unshift([(n % NX) * 8, ((n / NX) | 0) * 8]); }
    return path.length ? path : [[x0, y0], [x1, y1]];
  },

  // ------------------------------------------------------------ before the stage: sandbags and turrets
  sdNewPlace() {
    const n = this.players.length > 2 ? 1 : 2, tw = this.sd.twin;
    const cur = this.players.filter(p => !p.out && !p.bot).map(p => {
      const [sx, sy] = PLAYER_SPAWN[p.i] || [BASE_X, BASE_Y];
      // forward from where you start: out of the fort's edge (or the twin's, by the other eagle)
      const fwd = tw && Math.abs(sx - tw.x) + Math.abs(sy - tw.y) < Math.abs(sx - BASE_X) + Math.abs(sy - BASE_Y) ? SIDE_FWD[tw.side] : BASE_FWD;
      const x0 = Math.round((sx + DXY[fwd][0] * 32) / 16) * 16, y0 = Math.round((sy + DXY[fwd][1] * 32) / 16) * 16;
      // the nearest spot to there that a piece can go on
      let at = null;
      for (let r = 0; r < 13 && !at; r++) for (let dy = -r; dy <= r && !at; dy++) for (let dx = -r; dx <= r && !at; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) === r && this.sdCanPlace(x0 + dx * 16, y0 + dy * 16)) at = [x0 + dx * 16, y0 + dy * 16];
      }
      if (!at) at = [Math.max(0, Math.min(FW - 16, x0)), Math.max(0, Math.min(FH - 16, y0))];
      return { i: p.i, x: at[0], y: at[1], kind: 'bag', left: n, tur: 1, done: false, hold: -1, rep: 0 };
    });
    return cur.length ? { t: SD_PLACE_TIME, cur } : null;
  },

  // somewhere a sandbag or a turret may go: open ground, clear of the forts, the starts, the entry points and the road
  sdCanPlace(x, y) {
    const sd = this.sd;
    if (x < 0 || y < 0 || x > FW - 16 || y > FH - 16) return false;
    for (let cy = y >> 2; cy < (y + 16) >> 2; cy++) for (let cx = x >> 2; cx < (x + 16) >> 2; cx++) {
      const v = this.get(cx, cy);
      if (v !== T_EMPTY && v !== T_ICE && v !== T_MUD && v !== T_BRIDGE) return false;
    }
    const near = (ax, ay, pad) => overlap(x, y, 16, 16, ax - pad, ay - pad, 16 + 2 * pad, 16 + 2 * pad);
    if (near(BASE_X, BASE_Y, 16) || (sd.twin && near(sd.twin.x, sd.twin.y, 16)) || (sd.site && near(sd.site.x, sd.site.y, 16))) return false;
    if (PLAYER_SPAWN.some(([px, py]) => near(px, py, 0)) || (sd.site && sd.site.players.some(([px, py]) => near(px, py, 0)))) return false;
    if (ENEMY_SPAWNS.some(([ex, ey]) => near(ex, ey, 16))) return false;
    if (sd.road && sd.road.some(([rx, ry]) => overlap(x, y, 16, 16, rx, ry, 16, 16))) return false;
    if (sd.bags.some(b => b.x === x && b.y === y) || this.turrets.some(t => overlap(x, y, 16, 16, t.x, t.y, 16, 16))) return false;
    if ((this.pads || []).some(p => overlap(x, y, 16, 16, p.x, p.y, 16, 16)) || (this.qblocks || []).some(q => overlap(x, y, 16, 16, q.x, q.y, 16, 16))) return false;
    return !this.tanks.some(t => t.alive && overlap(x, y, 16, 16, t.x, t.y, 16, 16));
  },

  // the way a sandbag faces: towards the nearest edge they come in from
  sdFacing(x, y) {
    let best = BASE_FWD, bd = Infinity;
    for (const f of this.sd.fronts) {
      const e = f.edge, d = e === 'top' ? y : e === 'bottom' ? FH - 16 - y : e === 'left' ? x : FW - 16 - x;
      if (d < bd) { bd = d; best = SD_OUT[e]; }
    }
    return best;
  },

  // the placing phase, every frame (the rest of the stage waits; your tanks roll in meanwhile)
  sdPlaceTick() {
    const pl = this.sdPlace;
    this.updateSpawns();
    for (const p of this.popups) p.t++;
    this.popups = this.popups.filter(p => p.t < p.delay + (p.life || 48));
    for (const c of pl.cur) {
      if (c.done) continue;
      const inp = Input.player(c.i);
      // one tile a press, repeating while it's held
      if (inp.dir >= 0) {
        if (inp.dir !== c.hold) { c.hold = inp.dir; c.rep = 14; this.sdMoveCursor(c, inp.dir); }
        else if (--c.rep <= 0) { c.rep = 6; this.sdMoveCursor(c, inp.dir); }
      } else c.hold = -1;
      if (inp.altPressed && c.tur > 0) { c.kind = c.kind === 'bag' ? 'turret' : 'bag'; Sound.play('select'); }
      if (inp.firePressed) this.sdPut(c);
    }
    if (--pl.t <= 0 || pl.cur.every(c => c.done)) this.sdPlaceEnd();
  },

  sdMoveCursor(c, d) {
    c.x = Math.max(0, Math.min(FW - 16, c.x + DXY[d][0] * 16));
    c.y = Math.max(0, Math.min(FH - 16, c.y + DXY[d][1] * 16));
    Sound.play('select');
  },

  sdPut(c) {
    if (!this.sdCanPlace(c.x, c.y)) { Sound.play('steel'); return false; }
    const dir = this.sdFacing(c.x, c.y), p = this.players.find(q => q.i === c.i);
    if (c.kind === 'turret') {
      this.placeTurret(c.x, c.y, p, false);
      const tu = this.turrets[this.turrets.length - 1];
      tu.dir = tu.want = dir;
      c.tur--; c.kind = 'bag';
    } else this.sd.bags.push({ x: c.x, y: c.y, dir, hp: SD_BAG_HP, flash: 0 });
    this.addFx(c.x + 8, c.y + 8, [Sprites.sparkle[0], Sprites.sparkle[1]], 4);
    Sound.play('sdPlace');
    if (--c.left <= 0) c.done = true;
    return true;
  },

  // time's up, everyone's done, or ENTER: on with the stage, and what's special about it
  sdPlaceEnd() {
    this.sdPlace = null;
    Sound.play('sdGo');
    const tw = SD_TWISTS[this.sd.twist];
    if (tw) {
      this.sdNote(tw.name + '!', COL.gold, 0, 170);
      this.sdNote(tw.note, COL.white, -20, 150);
    }
  },

  sdNote(text, color, t, life) { this.sd.notes.push({ text, color, t, life }); },

  // ------------------------------------------------------------ every frame
  sdTick() {
    const sd = this.sd;
    sd.clock++;
    for (const n of sd.notes) n.t++;
    sd.notes = sd.notes.filter(n => n.t < n.life);
    if (sd.warn && --sd.warn.t <= 0) sd.warn = null;
    for (const b of sd.bags) if (b.flash > 0) b.flash--;
    if (this.over) return;
    if (sd.wind) this.sdWindTick();
    if (sd.slope) this.sdSlopeTick();
    if (sd.site && !sd.moved) {
      if (sd.truck) this.sdTruckTick();
      else if (this.killed >= sd.moveAt || sd.clock >= SD_MOVE_LATEST) this.sdTruckStart();
    }
    if (sd.build.length) this.sdBuildTick();
    if (sd.twin) this.sdTwinTick();
  },

  // a new front: its arrows and a siren first, then the wave
  sdSetFront(f) {
    const sd = this.sd;
    sd.cur = f;
    sd.warn = { f, t: SD_WARN };
    Sound.play('sdAlarm');
  },

  sdWindTick() {
    const w = this.sd.wind;
    if (--w.t > 0) return;
    // gusts come and go; now and then it turns right round
    w.t = 420 + rnd(360);
    w.str = 1 + rnd(3);
    if (!rnd(4)) { w.dir = (w.dir + 2) % 4; this.sdNote('THE WIND TURNS', COL.lgrey, 0, 120); }
    Sound.play('sdWind');
  },

  // ICE SLOPE: whatever is on the ice slides towards the eagle's edge
  sdSlopeTick() {
    const down = (BASE_FWD + 2) % 4;
    for (const t of this.tanks) {
      if (!t.alive || t.hover || t.hopT > 0 || t.burrow > 0 || !this.onIce(t)) { t.sdSlide = 0; continue; }
      t.sdSlide = (t.sdSlide || 0) + SD_SLOPE;
      while (t.sdSlide >= 1) { t.sdSlide--; if (!this.shove(t, down)) { t.sdSlide = 0; break; } }
    }
  },

  // ------------------------------------------------------------ the truck
  sdTruckStart() {
    const sd = this.sd, r = sd.road, d0 = r.length > 1 ? (r[1][0] > r[0][0] ? 1 : r[1][0] < r[0][0] ? 3 : r[1][1] > r[0][1] ? 2 : 0) : BASE_FWD;
    sd.truck = { x: BASE_X, y: BASE_Y, dir: d0, hp: SD_TRUCK_HP, state: 'load', t: 90, i: 1, acc: 0, flash: 0, inv: 0, wait: 0 };
    this.sdNote('THE EAGLE MOVES OUT!', COL.gold, 0, 170);
    this.sdNote('ESCORT THE TRUCK!', COL.white, -20, 150);
    Sound.play('sdTruck');
    // and they smell it: most of them go for the truck
    for (const t of this.tanks) if (t.alive && !t.isPlayer && t.ai && Math.random() < 0.6) t.ai = AI.RUSH;
    this.navBaseF = {};
  },

  sdTruckTick() {
    const sd = this.sd, tr = sd.truck;
    if (tr.flash > 0) tr.flash--;
    if (tr.inv > 0) tr.inv--;
    if (tr.state === 'load') {
      if (--tr.t <= 0) { tr.state = 'drive'; BASE_WALL = []; }   // out of the fort: nothing to shut round it now
      return;
    }
    tr.acc += SD_TRUCK_SPEED;
    while (tr.acc >= 1) {
      const [tx, ty] = sd.road[tr.i], dx = Math.sign(tx - tr.x), dy = Math.sign(ty - tr.y);
      if (!dx && !dy) { if (++tr.i >= sd.road.length) { this.sdArrive(); return; } continue; }
      const nx = tr.x + dx, ny = tr.y + dy;
      // it waits for tanks in its way (yours too), and sounds the horn if it waits long
      if (this.tanks.some(t => t.alive && !t.mirage && !(t.burrow > 0) && !(t.hopT > 0) && overlap(nx, ny, 16, 16, t.x, t.y, 16, 16) && !overlap(tr.x, tr.y, 16, 16, t.x, t.y, 16, 16))) {
        tr.acc = 0;
        if (++tr.wait % 120 === 60) Sound.play('sdHorn');
        break;
      }
      tr.wait = 0; tr.acc--;
      tr.x = nx; tr.y = ny; tr.dir = dx > 0 ? 1 : dx < 0 ? 3 : dy > 0 ? 2 : 0;
      this.sdTruckCrush(tr);
      if (!(tr.x & 7) && !(tr.y & 7)) this.navCost = {};   // where the eagle stood is open again
    }
    BASE_X = tr.x; BASE_Y = tr.y;
  },

  // it breaks out of the old fort and through whatever was put on its road since
  sdTruckCrush(tr) {
    let n = 0;
    for (let cy = tr.y >> 2; cy <= (tr.y + 15) >> 2; cy++) for (let cx = tr.x >> 2; cx <= (tr.x + 15) >> 2; cx++) {
      const v = this.get(cx, cy);
      if (v < 0 || sdRoadOk(v)) continue;
      if (v === T_WATER) this.set(cx, cy, T_BRIDGE);
      else if (v === T_CRATE || v === T_LAMP) this.bioCrush(cx, cy, v);
      else { this.set(cx, cy, T_EMPTY); n++; }
    }
    if (n && this.lastBrickSound < this.frame - 20) { Sound.play('brick'); this.lastBrickSound = this.frame; }
    const sd = this.sd, hit = o => overlap(tr.x, tr.y, 16, 16, o.x, o.y, 16, 16);
    sd.bags = sd.bags.filter(b => !overlap(tr.x, tr.y, 16, 16, ...sdBagRect(b)));
    if (this.turrets.some(hit)) { this.turrets = this.turrets.filter(t => !hit(t)); Sound.play('brick'); }
    if (this.qblocks && this.qblocks.some(hit)) this.qblocks = this.qblocks.filter(q => !hit(q));
  },

  // there: the fort goes up round it, facing the new way, and the enemy now comes from across the new edge
  sdArrive() {
    const sd = this.sd, s = sd.site;
    sd.truck = null; sd.moved = true;
    BASE_X = s.x; BASE_Y = s.y; BASE_SIDE = s.side; BASE_FWD = SIDE_FWD[s.side]; BASE_WALL = baseRing(1);
    PLAYER_SPAWN = s.players.map(p => p.slice());
    sd.build = BASE_WALL.map((b, i) => [b[0], b[1], this.baseWallType(i)]);
    if (this.base.walls >= 1) for (const [x, y] of this.outerRing()) sd.build.push([x, y, this.outerWallType(x, y)]);
    this.sdBuildTick();
    this.placeMinefield(this.base.field * 2);
    this.gunDir = BASE_FWD;
    this.navCost = {}; this.navBaseF = {};
    this.addFx(BASE_X + 8, BASE_Y + 8, [Sprites.sparkle[3], Sprites.sparkle[2], Sprites.sparkle[1], Sprites.sparkle[0]], 6);
    this.sdNote('NEW FORT BUILT!', COL.gold, 0, 160);
    Sound.play('sdBuild');
    if (sd.fronts.length > 1) this.sdSetFront(1);
  },

  // fort blocks still to go up (one under a tank waits until it drives off)
  sdBuildTick() {
    this.sd.build = this.sd.build.filter(([x, y, type]) => {
      if (this.tanks.some(t => t.alive && overlap(t.x, t.y, 16, 16, x * 8, y * 8, 8, 8))) return true;
      this.setBlock(x, y, type);
      return false;
    });
  },

  // ------------------------------------------------------------ the twin eagle
  sdTwinTick() {
    const tw = this.sd.twin;
    if (tw.inv > 0) tw.inv--;
    if (tw.flash > 0) tw.flash--;
    const g = this.base && this.base.gun;
    if (!g || !tw.alive || this.freezeP > 0 || --tw.gunT > 0) return;
    // its own eagle gun (eagleShoot with the twin's place and timer)
    const keep = [this.gunT, this.gunDir];
    this.gunDir = tw.gunDir;
    this.sdAtTwin(() => this.eagleShoot(g));
    tw.gunT = this.gunT; tw.gunDir = this.gunDir;
    [this.gunT, this.gunDir] = keep;
  },

  sdTwinHit() {
    const tw = this.sd.twin;
    if (!tw || !tw.alive || tw.inv > 0) return;
    if (tw.armor > 0) {
      tw.armor--; tw.inv = 40; tw.flash = 30;
      this.addFx(tw.x + 8, tw.y + 8, Sprites.smallExp, 3);
      Sound.play('armor');
      return;
    }
    tw.alive = false;
    this.addFx(tw.x + 8, tw.y + 8, BIG_EXPLOSION(), 6);
    Sound.play('baseDie');
    this.startOver();
    this.sdLost();
  },

  // the eagle (or the truck, or the twin) is gone: the streak with it, even if you go on from the checkpoint
  sdLost() { if (Net.role !== 'client' && typeof Game !== 'undefined' && Game.mode === 'sides') Game.sdBreak(); },

  // shells against the sandbags, the truck and the twin (true: it stopped)
  sdShell(b) {
    const sd = this.sd;
    if (!b.isPlayer) for (const g of sd.bags) {
      if (!overlap(b.x, b.y, 4, 4, ...sdBagRect(g))) continue;
      this.killBullet(b, true);
      this.sdBagHit(g, 1);
      return true;
    }
    const tr = sd.truck;
    // your shells don't hurt the truck: they knock on it and stop
    if (tr && tr.state === 'drive' && b.isPlayer && overlap(b.x, b.y, 4, 4, tr.x, tr.y, 16, 16)) { this.killBullet(b, false); return true; }
    const tw = sd.twin;
    if (tw && tw.alive && !b.eagle && overlap(b.x, b.y, 4, 4, tw.x, tw.y, 16, 16)) { this.killBullet(b, true); this.sdTwinHit(); return true; }
    // one eagle's gun never shoots the other
    if (tw && b.eagle && (overlap(b.x, b.y, 4, 4, BASE_X, BASE_Y, 16, 16) || (tw.alive && overlap(b.x, b.y, 4, 4, tw.x, tw.y, 16, 16)))) { this.killBullet(b, false); return true; }
    return false;
  },

  sdBagHit(g, n) {
    g.hp -= n; g.flash = 8;
    if (g.hp > 0) { Sound.play('brick'); return; }
    this.sd.bags = this.sd.bags.filter(o => o !== g);
    this.addFx(g.x + 8, g.y + 8, Sprites.smallExp, 4);
    Sound.play('brick');
  },

  // ------------------------------------------------------------ drawing
  // under everything on the ground: the road and the new fort's site
  sdRenderGround(ctx) {
    const sd = this.sd;
    if (sd.road && !sd.moved) {
      // a dirt track (only on open ground: bricks and the rest draw over it), each cell once
      if (!sd.roadCells || sd.roadCells.src !== sd.road) {
        const cells = new Set();
        for (const [x, y] of sd.road) for (let cy = y >> 2; cy < (y + 16) >> 2; cy++) for (let cx = x >> 2; cx < (x + 16) >> 2; cx++) cells.add(cy * GW + cx);
        sd.roadCells = { src: sd.road, list: [...cells] };
      }
      ctx.fillStyle = 'rgba(132,96,44,0.5)';
      for (const i of sd.roadCells.list) if (this.terrain[i] === T_EMPTY) ctx.fillRect((i % GW) * 4, ((i / GW) | 0) * 4, 4, 4);
      // and two wheel ruts along it
      ctx.fillStyle = 'rgba(56,34,8,0.75)';
      for (let k = 1; k < sd.road.length; k++) {
        const [x0, y0] = sd.road[k - 1], [x1, y1] = sd.road[k], across = x0 === x1;
        if (this.get((x1 + 8) >> 2, (y1 + 8) >> 2) !== T_EMPTY) continue;
        for (const o of [4, 11]) ctx.fillRect(across ? x1 + o : Math.min(x0, x1) + 8, across ? Math.min(y0, y1) + 8 : y1 + o, across ? 1 : 8, across ? 8 : 1);
      }
    }
    if (sd.site && !sd.moved) {
      // the new fort's ground marked out in gold, and a flag on it
      const { x, y } = sd.site, on = (this.frame >> 4) & 1;
      ctx.fillStyle = on ? COL.gold : '#A87C00';
      for (let k = 0; k < 32; k += 4) {
        ctx.fillRect(x - 8 + k, y - 8, 2, 1); ctx.fillRect(x - 8 + k, y + 23, 2, 1);
        ctx.fillRect(x - 8, y - 8 + k, 1, 2); ctx.fillRect(x + 23, y - 8 + k, 1, 2);
      }
      ctx.fillStyle = '#BCBCBC'; ctx.fillRect(x + 7, y + 2, 1, 12);
      ctx.fillStyle = '#D82800';
      const w = (this.frame >> 3) & 1;
      ctx.fillRect(x + 8, y + 2, 6, 2); ctx.fillRect(x + 8, y + 4, 5 - w, 2); ctx.fillRect(x + 8 + w, y + 6, 3, 1);
      ctx.fillStyle = '#7C7C7C'; ctx.fillRect(x + 5, y + 14, 5, 1);
    }
  },

  sdRenderBags(ctx) {
    const S = sdSprites();
    for (const b of this.sd.bags) {
      if (b.flash > 0 && (b.flash >> 1) & 1) ctx.drawImage(Sprites.outline(S.bag[b.dir], COL.white), b.x - 1, b.y - 1);
      ctx.drawImage(S.bag[b.dir], b.x, b.y);
      // torn sacks: a dark split for every hit taken
      const [rx, ry, rw] = sdBagRect(b);
      ctx.fillStyle = '#3C2800';
      for (let k = 0; k < SD_BAG_HP - b.hp; k++) ctx.fillRect(rx + (rw > 8 ? 2 + k * 4 : 2 + (k & 1) * 3), ry + (rw > 8 ? 2 + (k & 1) * 3 : 2 + k * 4), 2, 1);
    }
  },

  sdRenderTruck(ctx, tr) {
    const S = sdSprites(), img = S.truck[tr.dir];
    if (tr.flash > 0 && (tr.flash >> 1) & 1) ctx.drawImage(Sprites.outline(img, COL.white), tr.x - 1, tr.y - 1);
    else if (this.eagleArmor > 0) ctx.drawImage(Sprites.outline(img, this.eagleArmor >= 3 ? COL.gold : '#3CBCFC'), tr.x - 1, tr.y - 1);
    ctx.drawImage(img, tr.x, tr.y);
    // what's left of it, above it
    for (let k = 0; k < SD_TRUCK_HP; k++) { ctx.fillStyle = k < tr.hp ? '#58D854' : '#7C0800'; ctx.fillRect(tr.x + 4 + k * 3, tr.y - 3, 2, 2); }
    // dust behind it while it rolls
    if (tr.state === 'drive' && !tr.wait && (this.frame & 4)) {
      const [dx, dy] = DXY[(tr.dir + 2) % 4];
      ctx.fillStyle = 'rgba(200,180,140,0.5)';
      ctx.fillRect(tr.x + 7 + dx * 10 + ((this.frame >> 3) & 1) * 2 - 1, tr.y + 7 + dy * 10, 3, 2);
    }
  },

  // tesla lightning while the eagle is on the road (renderEagle draws it otherwise)
  sdRenderZaps(ctx) {
    for (const zp of this.zaps || []) {
      ctx.fillStyle = (zp.t >> 1) & 1 ? '#F8F8F8' : '#58F8F8';
      const x0 = BASE_X + 8, y0 = BASE_Y + 2, n = 8;
      for (let i = 0; i <= n; i++) {
        const j = i === 0 || i === n ? 0 : ((i * 7 + zp.t) % 5) - 2;
        ctx.fillRect(Math.round(x0 + (zp.x - x0) * i / n) + j, Math.round(y0 + (zp.y - y0) * i / n) - j, 2, 2);
      }
    }
  },

  // the twin: renderEagle with its place, armour, gun and fate
  sdRenderTwin(ctx) {
    const tw = this.sd.twin, keep = [this.zaps, this.eagleArmor, this.eagleFlash, this.gunDir, this.baseAlive];
    this.zaps = []; this.eagleArmor = tw.armor; this.eagleFlash = tw.flash; this.gunDir = tw.gunDir; this.baseAlive = tw.alive;
    try { this.sdAtTwin(() => SD_RENDER_EAGLE.call(this, ctx)); } finally { [this.zaps, this.eagleArmor, this.eagleFlash, this.gunDir, this.baseAlive] = keep; }
  },

  // over the field: wind streaks, the warning arrows, the placing cursors, the notes
  sdRenderOver(ctx) {
    const sd = this.sd, S = sdSprites();
    if (sd.wind) {
      const [dx, dy] = DXY[sd.wind.dir], sp = 0.6 + sd.wind.str * 0.5, len = 3 + sd.wind.str * 2;
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      for (let k = 0; k < 6 + sd.wind.str * 3; k++) {
        const a = (k * 73 + 11) % 208, b = ((k * 151 + this.frame * sp) % 240) - 16;
        const x = dx ? (dx > 0 ? b : 208 - b) : a, y = dy ? (dy > 0 ? b : 208 - b) : (a * 7) % 208;
        ctx.fillRect(Math.round(x), Math.round(y), dx ? len : 1, dy ? len : 1);
      }
    }
    // where they'll come in: a red arrow at each entry point of the next front (all of them while you place)
    const fronts = this.sdPlace ? sd.fronts.filter((f, i) => !sd.site || i === 0) : sd.warn ? [sd.fronts[sd.warn.f]] : [];
    if (fronts.length && ((this.frame >> 3) & 1 || this.sdPlace)) {
      for (const f of fronts) for (const [x, y, d] of f.pts) {
        const back = DXY[(d + 2) % 4], bob = (this.frame >> 2) & 3;
        ctx.globalAlpha = this.sdPlace ? 0.7 : 1;
        ctx.drawImage(S.arrow[d], x + back[0] * (2 - bob) * -1, y + back[1] * (2 - bob) * -1);
        ctx.globalAlpha = 1;
      }
    }
    if (this.sdPlace) { this.sdRenderPlace(ctx); return; }
    // the warning and the notes, on a dark band in the half away from the eagle
    const lines = [], wf = sd.warn && sd.fronts[sd.warn.f];
    if (wf) lines.push(['ATTACK FROM THE ' + wf.edge.toUpperCase() + '!', (this.frame >> 3) & 1 ? COL.red : COL.white]);
    for (const n of sd.notes) if (n.t >= 0) lines.push([n.text, n.color]);
    this.sdBand(ctx, lines, BASE_SIDE === 'bottom' ? 40 : VIEW_H - 62);
  },

  sdBand(ctx, lines, y) {
    lines.forEach(([text, col], i) => {
      ctx.fillStyle = 'rgba(0,0,0,0.65)';
      ctx.fillRect(0, y + i * 10 - 2, VIEW_W, 11);
      Font.drawCenter(ctx, text, VIEW_W / 2, y + i * 10, col);
    });
  },

  sdRenderPlace(ctx) {
    const pl = this.sdPlace, S = sdSprites();
    for (const c of pl.cur) {
      const col = PALS[Config.playerPal(c.i)][2], ok = c.ok !== undefined ? c.ok : this.sdCanPlace(c.x, c.y);
      if (!c.done) {
        ctx.globalAlpha = 0.6;
        if (c.kind === 'turret') { ctx.drawImage(Sprites.turretBase, c.x, c.y); ctx.drawImage(Sprites.turretGun(this.sdFacing(c.x, c.y), Config.playerPal(c.i)), c.x, c.y); }
        else ctx.drawImage(S.bag[this.sdFacing(c.x, c.y)], c.x, c.y);
        ctx.globalAlpha = 1;
        // a bracket cursor in your colour (red when it can't go there)
        ctx.fillStyle = ok ? ((this.frame >> 3) & 1 ? col : COL.white) : COL.red;
        for (const [x, y, w, h] of [[-1, -1, 5, 1], [-1, -1, 1, 5], [12, -1, 5, 1], [16, -1, 1, 5], [-1, 16, 5, 1], [-1, 12, 1, 5], [12, 16, 5, 1], [16, 12, 1, 5]]) ctx.fillRect(c.x + x, c.y + y, w, h);
        // how many still to put down
        for (let k = 0; k < c.left; k++) { ctx.fillStyle = COL.black; ctx.fillRect(c.x + 18, c.y + k * 4, 3, 3); ctx.fillStyle = col; ctx.fillRect(c.x + 18, c.y + k * 4, 2, 2); }
      }
    }
    // what to do, in the half away from the eagle (clear of the edge they come in on)
    const one = pl.cur.length === 1 && pl.cur[0], swap = one ? (one.tur > 0 ? (one.kind === 'turret' ? 'B: SANDBAG' : 'B: TURRET') : 'SANDBAGS') : 'B: SWAP';
    this.sdBand(ctx, [['PLACE DEFENCES ' + Math.ceil(pl.t / 60), COL.gold], ['FIRE: PUT  ' + swap, COL.white], ['ENTER: START', COL.lgrey]], BASE_SIDE === 'top' ? VIEW_H - 62 : 22);
  },

  // in the left border: the wind sock, or the slope
  sdRenderBorder(ctx) {
    const sd = this.sd, x0 = 0, y0 = FY + 4;
    if (sd.wind) {
      const w = sd.wind, [dx, dy] = DXY[w.dir], len = 4 + w.str * 3, fl = (this.frame >> 2) & 3;
      // a pole, and the sock streaming off its top in red and white bands: the stronger it blows, the longer it
      // stands out, and the faster its tip flutters
      const px = dx > 0 ? x0 + 1 : dx < 0 ? x0 + 14 : x0 + 3, py = dy < 0 ? y0 + len + 1 : y0;
      ctx.fillStyle = '#BCBCBC'; ctx.fillRect(px, py, 1, 24 - (dy < 0 ? len + 1 : 0));
      ctx.fillStyle = '#3C3C3C'; ctx.fillRect(px - 1, py + 23 - (dy < 0 ? len + 1 : 0), 3, 1);
      for (let k = 0; k < len; k++) {
        ctx.fillStyle = (k >> 1) % 2 ? '#F8F8F8' : '#D82800';
        const thick = 5 - Math.round(2 * k / Math.max(1, len - 1)), wob = k >= len - 2 && fl === k % 4 ? 1 : 0;
        if (dx) ctx.fillRect(px + dx * (k + 1), py + 1 + wob + (5 - thick) / 2 | 0, 1, thick);
        else ctx.fillRect(px + 1 + wob + ((5 - thick) / 2 | 0), dy > 0 ? py + 1 + k : py - 1 - k, thick, 1);
      }
      // and how hard: one to three pips
      for (let k = 0; k < 3; k++) { ctx.fillStyle = k < w.str ? COL.gold : '#3C3C3C'; ctx.fillRect(x0 + 2 + k * 4, y0 + 28, 3, 3); }
    }
    if (sd.slope) {
      // a strip of ice with chevrons sliding down it, towards the eagle's edge
      const [dx, dy] = DXY[(BASE_FWD + 2) % 4], cx = x0 + 7, cy = y0 + 12;
      ctx.fillStyle = '#C8E8F8'; ctx.fillRect(cx - (dy ? 5 : 7), cy - (dy ? 9 : 5), dy ? 11 : 15, dy ? 19 : 11);
      ctx.fillStyle = '#F8F8F8'; ctx.fillRect(cx - (dy ? 5 : 7), cy - (dy ? 9 : 5), dy ? 2 : 15, dy ? 19 : 2);
      ctx.fillStyle = '#0058F8';
      for (let k = 0; k < 2; k++) {
        const o = (((this.frame >> 2) + k * 6) % 12) - 6, ax = cx + dx * o, ay = cy + dy * o;
        for (let j = -3; j <= 3; j++) ctx.fillRect(ax + (dy ? j : -dx * Math.abs(j)), ay + (dx ? j : -dy * Math.abs(j)), 1, 1);
      }
    }
  },

  // ------------------------------------------------------------ online
  sdView(full) {
    const sd = this.sd, tr = sd.truck, tw = sd.twin;
    const v = {
      b: [BASE_X, BASE_Y, BASE_SIDE], c: sd.cur, w: sd.warn ? [sd.warn.f, sd.warn.t] : 0, wi: sd.wind ? [sd.wind.dir, sd.wind.str] : 0, n: sd.notes,
      tr: tr ? [tr.x, tr.y, tr.dir, tr.hp, tr.state === 'drive' ? 1 : 0, tr.flash, tr.wait ? 1 : 0] : 0,
      tw: tw ? [tw.x, tw.y, tw.side, tw.alive ? 1 : 0, tw.armor, tw.flash, tw.gunDir] : 0,
      bg: sd.bags.map(g => [g.x, g.y, g.dir, g.hp, g.flash]), mv: sd.moved ? 1 : 0, sl: sd.slope ? 1 : 0,
      pl: this.sdPlace ? [this.sdPlace.t, this.sdPlace.cur.map(c => [c.i, c.x, c.y, c.kind === 'turret' ? 1 : 0, c.left, c.done ? 1 : 0, this.sdCanPlace(c.x, c.y) ? 1 : 0])] : 0,
    };
    // what doesn't change: now and then
    if (full || this.frame % 30 === 0) Object.assign(v, { p: sd.plan, fr: sd.fronts.map(f => [f.edge, f.pts]), rd: sd.road, st: sd.site ? [sd.site.x, sd.site.y, sd.site.side] : 0 });
    return v;
  },
  applySdView(v) {
    const sd = this.sd || (this.sd = { plan: null, twist: null, fronts: [], road: null, site: null, notes: [], bags: [], build: [], cur: 0 });
    if (v.p) { sd.plan = v.p; sd.twist = v.p.twist; }
    if (v.fr) sd.fronts = v.fr.map(a => ({ edge: a[0], pts: a[1] }));
    if (v.rd !== undefined) sd.road = v.rd;
    if (v.st !== undefined) sd.site = v.st ? { x: v.st[0], y: v.st[1], side: v.st[2], players: [] } : null;
    if (BASE_X !== v.b[0] || BASE_Y !== v.b[1] || BASE_SIDE !== v.b[2]) {
      BASE_X = v.b[0]; BASE_Y = v.b[1]; BASE_SIDE = v.b[2]; BASE_FWD = SIDE_FWD[BASE_SIDE];
      BASE_WALL = BASE_X % 8 || BASE_Y % 8 ? [] : baseRing(1);   // no fort round a truck on the road
    }
    sd.cur = v.c; sd.warn = v.w ? { f: v.w[0], t: v.w[1] } : null; sd.wind = v.wi ? { dir: v.wi[0], str: v.wi[1] } : null;
    sd.notes = v.n || []; sd.moved = !!v.mv; sd.slope = !!v.sl;
    sd.truck = v.tr ? { x: v.tr[0], y: v.tr[1], dir: v.tr[2], hp: v.tr[3], state: v.tr[4] ? 'drive' : 'load', flash: v.tr[5], wait: v.tr[6] } : null;
    sd.twin = v.tw ? { x: v.tw[0], y: v.tw[1], side: v.tw[2], alive: !!v.tw[3], armor: v.tw[4], flash: v.tw[5], gunDir: v.tw[6] } : null;
    sd.bags = (v.bg || []).map(a => ({ x: a[0], y: a[1], dir: a[2], hp: a[3], flash: a[4] }));
    this.sdPlace = v.pl ? { t: v.pl[0], cur: v.pl[1].map(a => ({ i: a[0], x: a[1], y: a[2], kind: a[3] ? 'turret' : 'bag', left: a[4], done: !!a[5], ok: !!a[6] })) } : null;
  },
});

// the originals the twists call round their own wrappers
const SD_SET_WALLS = Stage.prototype.setBaseWalls, SD_RENDER_EAGLE = Stage.prototype.renderEagle;

// ------------------------------------------------------------ the curtain's picture of the next stage
// 64x64: the map at 2px a block, the eagle(s) in gold, red arrows where they come in, the road and the new fort,
// wind streaks or the slope's chevrons
function sdPreview(plan, n) {
  const key = JSON.stringify(plan) + n, cache = sdPreview.cache || (sdPreview.cache = {});
  if (cache.key === key) return cache.c;
  const m = sdModel(plan, LEVELS[(n - 1) % LEVELS.length]), c = makeCanvas(64, 64), x = c.getContext('2d'), O = 6;
  const TC = { '#': '#B85C1C', '@': '#ADADAD', '~': '#2858D8', '%': '#2C8C14', _: '#C8E8F8', '=': '#9C6C2C', m: '#5C3C1C' };
  x.fillStyle = '#000000'; x.fillRect(O - 1, O - 1, 54, 54);
  m.blocks.forEach((row, by) => { for (let bx = 0; bx < row.length; bx++) { const col = TC[row[bx]]; if (col) { x.fillStyle = col; x.fillRect(O + bx * 2, O + by * 2, 2, 2); } } });
  const P = (px, py) => [O + px / 4, O + py / 4];
  const eagle = (px, py) => { const [ex, ey] = P(px, py); x.fillStyle = '#000000'; x.fillRect(ex - 1, ey - 1, 6, 6); x.fillStyle = COL.gold; x.fillRect(ex, ey, 4, 4); x.fillStyle = '#BB1C0E'; x.fillRect(ex + 1, ey + 1, 2, 2); };
  // the road (roughly: out of the fort, then along to the new one) and the site
  if (m.site) {
    const [bx, by] = P(m.base[0] + 8, m.base[1] + 8), [sx, sy] = P(m.site.x + 8, m.site.y + 8), f = DXY[SIDE_FWD[plan.side]];
    const kx = f[0] ? sx : bx, ky = f[1] ? sy : by;
    x.fillStyle = COL.gold;
    for (const [ax, ay, cx, cy] of [[bx, by, kx, ky], [kx, ky, sx, sy]]) {
      const len = Math.max(Math.abs(cx - ax), Math.abs(cy - ay));
      for (let k = 0; k <= len; k += 2) x.fillRect(Math.round(ax + (cx - ax) * k / Math.max(1, len)), Math.round(ay + (cy - ay) * k / Math.max(1, len)), 1, 1);
    }
    const [qx, qy] = P(m.site.x, m.site.y);
    x.strokeStyle = COL.gold; x.lineWidth = 1; x.setLineDash([1, 1]); x.strokeRect(qx - 1.5, qy - 1.5, 7, 7); x.setLineDash([]);
  }
  eagle(...m.base);
  if (m.twin) eagle(m.twin.x, m.twin.y);
  // arrows in the margin pointing in: red for the first front, orange for the flank, dark red for later
  m.fronts.forEach((f, i) => {
    const col = i === 0 ? '#F83800' : plan.twist === 'move' ? '#7C0800' : '#F8B800';
    for (const [px, py, d] of f.pts) {
      const [ax, ay] = P(px + 8, py + 8), [dx, dy] = DXY[d];
      // a little triangle in the margin, its tip at the field's edge
      const tx = dx ? (dx > 0 ? 1 : 62) : ax, ty = dy ? (dy > 0 ? 1 : 62) : ay;
      x.fillStyle = col;
      for (let k = 0; k < 4; k++) {
        const h = 3 - k;
        if (dx) x.fillRect(tx + dx * k, ty - h, 1, 2 * h + 1); else x.fillRect(tx - h, ty + dy * k, 2 * h + 1, 1);
      }
    }
  });
  if (plan.twist === 'wind') {
    const d = (SIDE_FWD[plan.side] + (plan.windSign > 0 ? 1 : 3)) % 4, [dx, dy] = DXY[d];
    // three white arrows blowing across
    x.fillStyle = '#F8F8F8';
    for (const k of [18, 32, 46]) {
      const along = (a, b, w, h) => (dx ? x.fillRect(a, b, w, h) : x.fillRect(b, a, h, w));
      along(14, k, 34, 1);
      const tip = dx > 0 || dy > 0 ? 47 : 14, back = dx > 0 || dy > 0 ? -1 : 1;
      for (let j = 1; j <= 3; j++) { along(tip + back * j, k - j, 1, 1); along(tip + back * j, k + j, 1, 1); }
    }
  }
  if (plan.twist === 'slope') {
    // chevrons pointing downhill, towards the eagle's edge
    const [dx, dy] = DXY[(SIDE_FWD[plan.side] + 2) % 4];
    x.fillStyle = '#0058F8';
    for (const a of [18, 32, 46]) for (const b of [20, 44]) {
      const cx = dx ? b : a, cy = dy ? b : a;
      for (let k = -2; k <= 2; k++) x.fillRect(cx + (dy ? k : -dx * Math.abs(k)), cy + (dx ? k : -dy * Math.abs(k)), 1, 1);
    }
  }
  cache.key = key; cache.c = c;
  return c;
}

// the four sides in a row, as letters: cleared ones white, this stage's red, the rest dark
function sdStreakLetters(ctx, x, y, done, now, blink) {
  SD_ROT.forEach((s, i) => {
    const col = done.includes(s) ? COL.white : s === now ? (blink ? '#A00000' : '#F83800') : '#3C3C3C';
    Font.draw(ctx, s[0].toUpperCase(), x + i * 10, y, col);
  });
}

// ------------------------------------------------------------ hooks into the stage
(() => {
  const P = Stage.prototype;
  // built with the stage's terrain (before the secrets and before reach.js opens walled-in entry points)
  const setupSecrets = P.setupSecrets;
  P.setupSecrets = function (opts) {
    const pend = typeof Game !== 'undefined' && Game.sdPending;
    if (pend && opts && opts.blocks === pend.model.blocks && !opts.snapshot && !opts.editor && Net.role !== 'client') { Game.sdPending = null; this.sdSetup(pend); }
    setupSecrets.call(this, opts);
    // nothing hidden on the road or where the new fort goes
    const sd = this.sd;
    if (sd && sd.road && this.qblocks) this.qblocks = this.qblocks.filter(q => !sd.road.some(([x, y]) => overlap(x, y, 16, 16, q.x, q.y, 16, 16)));
  };

  const update = P.update;
  P.update = function () {
    if (!this.sd || this.galaxy) return update.call(this);
    if (this.sdPlace) { this.frame++; this.sdPlaceTick(); return; }   // the stage waits while you place
    update.call(this);
    this.sdTick();
  };

  // enemies come in on the front whose turn it is, after its warning
  const spawning = P.updateSpawning;
  P.updateSpawning = function () {
    const sd = this.sd;
    if (!sd || !sd.fronts.length || this.survival || this.cl || this.race) return spawning.call(this);
    if (!this.queue.length || sd.warn) return;
    if (this.spawnTimer > 0) { this.spawnTimer--; return; }
    const onField = this.tanks.filter(t => !t.isPlayer).length + this.spawns.filter(s => s.enemy).length;
    if (onField >= this.maxEnemies) return;
    const pts = sd.fronts[sd.cur].pts;
    let at = null;
    for (let k = 0; k < pts.length && !at; k++) {
      const p = pts[sd.pos++ % pts.length];
      if (!this.tanks.some(t => t.alive && overlap(t.x, t.y, 16, 16, p[0], p[1], 16, 16)) && !this.spawns.some(s => overlap(s.x, s.y, 16, 16, p[0], p[1], 16, 16))) at = p;
    }
    if (!at) return;
    const item = this.queue.shift();
    item.extra = Object.assign({}, item.extra, { dir: at[2] });
    this.spawns.push({ x: at[0], y: at[1], t: SPARKLE_TIME, enemy: item });
    if (item.bonus) this.powerup = null;
    this.spawnTimer = this.spawnInterval;
    // TWO FRONTS, MIRROR: a wave from each front in turn
    if (--sd.left <= 0 && sd.fronts.length > 1 && !sd.site) { sd.left = sd.waveN; sd.wave++; this.sdSetFront(sd.wave % sd.fronts.length); }
  };

  const spawned = P.enemySpawned;
  P.enemySpawned = function (t) {
    spawned.call(this, t);
    const sd = this.sd;
    if (!sd) return;
    if (sd.twin) t.sdGoal = sd.split++ % 2;   // half for each eagle
    if (sd.truck && t.ai && Math.random() < 0.6) t.ai = AI.RUSH;
  };

  // MIRROR: an enemy goes for its own eagle (the decoy fools them all as ever)
  const aiChoose = P.aiChoose;
  P.aiChoose = function (t, blocked) {
    this.sdCur = t;
    try { aiChoose.call(this, t, blocked); } finally { this.sdCur = null; }
  };
  const navBase = P.navBase;
  P.navBase = function (mode = '') {
    const t = this.sdCur, tw = this.sd && this.sd.twin;
    if (!tw || !tw.alive || !t || t.sdGoal === undefined || this.decoy) return navBase.call(this, mode);
    const g = t.sdGoal === 1 ? tw : { x: BASE_X, y: BASE_Y }, key = mode + (t.sdGoal === 1 ? '#twin' : '#main');
    const all = this.navBaseF || (this.navBaseF = {}), f = all[key];
    if (f && (f.ver === this.terrainVer || this.frame - f.at < 30)) return f.dist;
    const NX = COLS * 2 - 1, NY = ROWS * 2 - 1, seeds = [];
    for (let by = 0; by < NY; by++) for (let bx = 0; bx < NX; bx++) {
      const x = bx * 8, y = by * 8;
      if (overlap(x, y, 16, 16, g.x - 8, g.y - 8, 32, 32) && !overlap(x, y, 16, 16, g.x, g.y, 16, 16)) seeds.push(by * NX + bx);
    }
    all[key] = { dist: this.navField(seeds, mode), at: this.frame, ver: this.terrainVer };
    return all[key].dist;
  };
  const baseGoals = P.baseGoals;
  P.baseGoals = function () {
    const g = baseGoals.call(this), tw = this.sd && this.sd.twin;
    if (tw && tw.alive && !this.decoy) g.push({ x: tw.x, y: tw.y });
    return g;
  };
  const baseTarget = P.baseTarget;
  P.baseTarget = function (t) {
    const tw = this.sd && this.sd.twin;
    if (tw && tw.alive && !this.decoy && t && t.sdGoal !== undefined) return t.sdGoal === 1 ? { x: tw.x, y: tw.y } : { x: BASE_X, y: BASE_Y };
    return baseTarget.call(this, t);
  };

  // the twin and the sandbags stand in the way like the eagle does
  const canStep = P.canStep;
  P.canStep = function (t, d) {
    if (!canStep.call(this, t, d)) return false;
    const sd = this.sd;
    if (!sd) return true;
    const nx = t.x + DXY[d][0], ny = t.y + DXY[d][1];
    if (sd.twin && sd.twin.alive && overlap(nx, ny, 16, 16, sd.twin.x, sd.twin.y, 16, 16)) return false;
    for (const b of sd.bags) {
      const r = sdBagRect(b);
      if (overlap(nx, ny, 16, 16, ...r) && !overlap(t.x, t.y, 16, 16, ...r)) return false;
    }
    return true;
  };
  // a sandbag in front is worth a shot, like bricks
  const brickAhead = P.brickAhead;
  P.brickAhead = function (t, d = t.dir) {
    if (brickAhead.call(this, t, d)) return true;
    const sd = this.sd;
    if (!sd || !sd.bags.length || t.isPlayer) return false;
    const [x0, y0, x1, y1] = [[t.x, t.y - 4, t.x + 15, t.y - 1], [t.x + 16, t.y, t.x + 19, t.y + 15], [t.x, t.y + 16, t.x + 15, t.y + 19], [t.x - 4, t.y, t.x - 1, t.y + 15]][d];
    return sd.bags.some(b => overlap(x0, y0, x1 - x0 + 1, y1 - y0 + 1, ...sdBagRect(b)));
  };

  // shells: the sandbags, the truck and the twin, after the terrain
  const bulletTerrain = P.bulletTerrain;
  P.bulletTerrain = function (b) {
    if (bulletTerrain.call(this, b)) return true;
    return this.sd ? this.sdShell(b) : false;
  };
  // WIND: shells flying across it drift with it
  const stepBullet = P.stepBullet;
  P.stepBullet = function (b, dist) {
    stepBullet.call(this, b, dist);
    const w = this.sd && this.sd.wind;
    if (!w || !b.alive || (b.dir & 1) === (w.dir & 1) || !b.speed) return;
    const k = SD_WIND[w.str] * dist / b.speed;
    b.x = Math.max(0, Math.min(FW - 4, b.x + DXY[w.dir][0] * k));
    b.y = Math.max(0, Math.min(FH - 4, b.y + DXY[w.dir][1] * k));
  };
  // the enemy's blasts: sandbags and the twin too
  const blast = P.blast;
  P.blast = function (cx, cy, r, byPlayer) {
    const res = blast.apply(this, arguments), sd = this.sd;
    if (sd && !byPlayer) {
      for (const g of sd.bags.slice()) if (Math.hypot(g.x + 8 - cx, g.y + 8 - cy) < r + 8) this.sdBagHit(g, 2);
      const tw = sd.twin, reach = (x, y) => Math.hypot(Math.max(x, Math.min(cx, x + 16)) - cx, Math.max(y, Math.min(cy, y + 16)) - cy) < r - 2;
      if (tw && tw.alive && reach(tw.x, tw.y)) this.sdTwinHit();
    }
    return res;
  };

  // the eagle on the road: armour first, then the truck takes the hits; lose the truck and the eagle goes with it
  const destroyBase = P.destroyBase;
  P.destroyBase = function () {
    const tr = this.sd && this.sd.truck;
    if (tr && tr.state === 'drive') {
      if (this.mushroomGuards && this.mushroomGuards()) return;
      if (this.eagleArmorHit()) return;
      if (tr.inv > 0) return;
      if (--tr.hp > 0) {
        tr.flash = 20; tr.inv = 30;
        this.addFx(tr.x + 8, tr.y + 8, Sprites.smallExp, 3);
        this.popups.push({ x: tr.x + 8, y: tr.y - 6, text: 'TRUCK HIT', label: true, color: COL.red, t: 0, delay: 0, life: 60 });
        Sound.play('armor');
        return;
      }
      this.popups.push({ x: tr.x + 8, y: tr.y - 6, text: 'TRUCK LOST', label: true, color: COL.red, t: 0, delay: 0, life: 120 });
    }
    destroyBase.call(this);
    if (this.sd && !this.baseAlive) this.sdLost();
  };

  // the old fort's outer ring isn't rebuilt round a moving truck; the shovel and repairs work on both eagles' forts
  const outerRing = P.outerRing;
  P.outerRing = function () {
    const tr = this.sd && this.sd.truck;
    return tr && tr.state === 'drive' ? [] : outerRing.call(this);
  };
  P.setBaseWalls = function (t) {
    SD_SET_WALLS.call(this, t);
    const tw = this.sd && this.sd.twin;
    if (tw && tw.alive) this.sdAtTwin(() => SD_SET_WALLS.call(this, t));
  };
  const repair = P.repairFortress;
  P.repairFortress = function () {
    repair.call(this);
    const tw = this.sd && this.sd.twin;
    if (tw && tw.alive) this.sdAtTwin(() => repair.call(this));
  };
  // no supply drops while the eagle is on the road (there's no "in front of the fort")
  const supply = P.supplyDrop;
  P.supplyDrop = function () {
    const tr = this.sd && this.sd.truck;
    if (tr && tr.state === 'drive') return;
    supply.call(this);
  };
  // the stage isn't won until the eagle has got to its new fort
  const pending = P.seasonPending;
  P.seasonPending = function () { return pending.call(this) || !!(this.sd && this.sd.site && !this.sd.moved && Net.role !== 'client'); };

  // stage cleared: one more side for the streak
  const clear = P.carryOnClear;
  P.carryOnClear = function () {
    clear.call(this);
    if (this.sd && Net.role !== 'client' && typeof Game !== 'undefined' && Game.mode === 'sides') Game.sdCleared(this);
  };

  // ---- drawing
  const pads = P.renderPads;
  P.renderPads = function (ctx) {
    if (this.sd) this.sdRenderGround(ctx);
    pads.call(this, ctx);
  };
  P.renderEagle = function (ctx) {
    const sd = this.sd, tr = sd && sd.truck;
    if (tr && this.baseAlive && (tr.state === 'drive' || (tr.t >> 3) & 1)) { this.sdRenderZaps(ctx); this.sdRenderTruck(ctx, tr); }
    else SD_RENDER_EAGLE.call(this, ctx);
    if (sd && sd.twin) this.sdRenderTwin(ctx);
  };
  const turrets = P.renderTurrets;
  P.renderTurrets = function (ctx) {
    if (this.sd && this.sd.bags.length) this.sdRenderBags(ctx);
    turrets.call(this, ctx);
  };
  const banner = P.renderModeBanner;
  P.renderModeBanner = function (ctx) {
    banner.call(this, ctx);
    if (this.sd) this.sdRenderOver(ctx);
  };
  // above the field: the streak, the four sides as letters
  const objLine = P.renderObjectiveLine;
  P.renderObjectiveLine = function (ctx) {
    if (!this.sd || typeof Game === 'undefined' || Game.mode !== 'sides') return objLine.call(this, ctx);
    const n = Game.sdStreak | 0, text = 'STREAK ' + n + '  ', w = text.length * 8 + 38, x = FX + Math.round((VIEW_W - w) / 2);
    Font.draw(ctx, text, x, 0, COL.black);
    sdStreakLetters(ctx, x + text.length * 8, 0, Game.sdDone || [], this.sd.plan ? this.sd.plan.side : BASE_SIDE, (this.frame >> 4) & 1);
  };
  const hud = P.renderHud;
  P.renderHud = function (ctx) {
    hud.call(this, ctx);
    if (this.sd) this.sdRenderBorder(ctx);
  };
})();

// ------------------------------------------------------------ the game around it
CK_GAME_KEYS.push('sdSeed', 'sdStreak', 'sdDone');   // the run's twists and the streak survive a reload
(() => {
  const G = Game;
  // main.js's ANY SIDE branch: the field turned, the map, the fronts and starts for the stage's twist
  G.sidesLayout = function (map) {
    const plan = this.sdPlan = sdPlanFor(this.stageNum, this.sdSeed | 0, this.nextSide);
    this.nextSide = plan.side;
    setFieldSize(13, 13, 13, 13, plan.side);
    const m = sdModel(plan, map), all = [];
    for (const f of m.fronts) for (const p of f.pts) if (!all.some(q => q[0] === p[0] && q[1] === p[1])) all.push([p[0], p[1]]);
    ENEMY_SPAWNS = all;   // every entry point the stage will use (kept clear, and opened up by reach.js)
    ENEMY_SPAWN_X = all.map(p => p[0]);
    if (m.players) PLAYER_SPAWN = m.players.map(p => p.slice());
    this.sdPending = { plan, model: m };
    return m.blocks;
  };

  const newGame = G.newGame;
  G.newGame = function () {
    newGame.apply(this, arguments);
    if (this.mode !== 'sides') return;
    this.sdSeed = 1 + rnd(999999); this.sdStreak = 0; this.sdDone = [];
    this.sdPlan = sdPlanFor(this.stageNum, this.sdSeed); this.nextSide = this.sdPlan.side;
  };
  // the next edge in the rotation (main.js picks at random; this keeps them going round)
  const toCurtain = G.toCurtain;
  G.toCurtain = function () {
    const r = toCurtain.apply(this, arguments);
    if (this.mode === 'sides') { this.sdPlan = sdPlanFor(this.stageNum, this.sdSeed | 0); this.nextSide = this.sdPlan.side; }
    return r;
  };

  G.sdCleared = function (st) {
    const side = st.sd.plan ? st.sd.plan.side : BASE_SIDE;
    this.sdStreak = (this.sdStreak | 0) + 1;
    this.sdDone = (this.sdDone || []).filter(s => s !== side).concat(side);
    if (this.sdDone.length < 4) return;
    // all four: a bonus that grows with every round of four, up to 4 x
    const pay = SD_STREAK_BONUS * Math.max(1, Math.min(4, Math.floor(this.sdStreak / 4)));
    for (const p of st.players) if (!p.out) st.addScore(p, pay);
    st.popups.push({ x: BASE_X + 8, y: Math.max(24, Math.min(FH - 24, BASE_Y)), text: 'ALL FOUR SIDES! +' + pay, label: true, color: COL.gold, t: 0, delay: 10, life: 170 });
    st.sdNote('SIDE STREAK ' + this.sdStreak + '!', COL.gold, 0, 170);
    Sound.play('sdStreak');
    this.sdDone = [];
  };
  G.sdBreak = function () {
    this.sdStreak = 0; this.sdDone = [];
    const ck = this.ck;
    if (ck && ck.mode === 'sides' && ck.g) { ck.g.sdStreak = 0; ck.g.sdDone = []; if (this.saveKind() === 'ckpt') this.writeSave(ck); }
  };

  // ENTER while you place: done, on with the stage (instead of the pause menu)
  const updatePlay = G.updatePlay;
  G.updatePlay = function () {
    const st = this.stage;
    if (st && st.sdPlace && !this.paused && !st.over) {
      const guest = Object.values(Input.remote).some(r => r.menu && r.menu.start);
      if (Input.menu().start || guest) { st.sdPlaceEnd(); return; }
    }
    return updatePlay.apply(this, arguments);
  };

  // the curtain: the next stage in miniature, its twist and map, the streak
  const curtain = G.renderCurtain;
  G.renderCurtain = function (ctx) {
    curtain.call(this, ctx);
    const c = this.curtain, plan = this.sdPlan;
    if (this.mode !== 'sides' || !c || c.phase !== 'show' || !plan) return;
    const cx = SCREEN_W / 2, cy = SCREEN_H / 2, tw = SD_TWISTS[plan.twist];
    if (plan.twist === 'mirror') {
      ctx.fillStyle = COL.bg; ctx.fillRect(0, cy + 22, SCREEN_W, 10);
      Font.drawCenter(ctx, 'YOUR EAGLES: ' + plan.side.toUpperCase() + ' + ' + SD_OPP[plan.side].toUpperCase(), cx, cy + 24, '#A00000');
    }
    const px = cx - 92, py = cy + 36, tx = cx - 20;
    ctx.drawImage(sdPreview(plan, this.stageNum), px, py);
    Font.draw(ctx, tw ? tw.name : 'ONE FRONT', tx, py + 4, tw ? '#A00000' : COL.black);
    Font.draw(ctx, tw ? tw.desc : 'THE FAR SIDE', tx, py + 15, '#3C3C3C');
    const own = plan.map >= 0 && SD_MAPS[plan.side][plan.map];
    Font.draw(ctx, own ? own.name : 'CLASSIC ' + ((this.stageNum - 1) % LEVELS.length + 1), tx, py + 30, COL.black);
    Font.draw(ctx, 'STREAK ' + (this.sdStreak | 0), tx, py + 45, COL.black);
    sdStreakLetters(ctx, tx, py + 55, this.sdDone || [], plan.side, (this.t >> 4) & 1);
  };

  // online: the stage's twist state, and the plan and streak for the curtain and the border
  const stageView = Net.stageView;
  Net.stageView = function (st, full) {
    const v = stageView.call(this, st, full);
    if (st.sd) v.sdx = st.sdView(full);
    return v;
  };
  const applyStage = Net.applyStage;
  Net.applyStage = function (sv) {
    applyStage.call(this, sv);
    const st = Game.stage;
    if (!st) return;
    if (sv.sdx) st.applySdView(sv.sdx);
    else { st.sd = null; st.sdPlace = null; }
  };
  const buildView = Net.buildView;
  Net.buildView = function (full) {
    const v = buildView.call(this, full);
    if (Game.mode === 'sides') v.sdg = [Game.sdPlan || null, Game.sdStreak | 0, Game.sdDone || []];
    return v;
  };
  const applyView = Net.applyView;
  Net.applyView = function (v) {
    applyView.call(this, v);
    if (!v.sdg) return;
    [Game.sdPlan, Game.sdStreak, Game.sdDone] = v.sdg;
    if (Game.sdPlan) Game.nextSide = Game.sdPlan.side;
  };
})();
