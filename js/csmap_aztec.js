'use strict';
// =====================================================================
//  COUNTER-STRIKE's second map: DE_AZTEC, seen from above, a tile to a character (60 x 62 tiles of 16 px).
//  The classic layout: a Mayan ruin in the jungle, cut through by a river. T spawn in the south west; LONG runs up the
//  west side to the jungle path on the river's bank, and the ROPE BRIDGE crosses the ravine to the A ramp and
//  bombsite A in the north west (the archaeological dig round the temple pyramid). From T spawn the T ramp also goes
//  down to the WATER: the canal running east, under the overpass, to the B ramp and bombsite B in the east (the
//  temple with its big stairs, the deep pool below it). The T tunnel runs east under the hill to the DOUBLE DOORS;
//  out of them the lower ramp drops to the water and the OVERPASS crosses it to the courtyard and the B arch.
//  CT spawn in the north east: the CT hall west to A, the CT path south to B, the connector down to the courtyard
//  (the CTs' way round between the sites). CTs are close to both sites; the Ts have the long walk.
//    S  weathered stone (temple walls, the halls): nothing breaks it, it blocks shells and sight
//    J  the jungle: trees and rock, the same as stone to a tank
//    T  a stepped temple pyramid (stone too)
//    ~  deep water (the ravine, the pool): no tank crosses it, shells and sight go over it
//    .  floor (jungle earth, stone slabs on the sites and in the halls, the shallow canal, the rope bridge's planks,
//       the stairs and ramps, the overpass: see floors)
//    x  wooden crate: cover that shells break bit by bit
//    d  a wooden door leaf beside a doorway (the double doors)
// =====================================================================

// the new tiles: stone, jungle and temple are unbreakable walls (as Dust 2's #), the water is water
Object.assign(CS_TILE_BLOCK, { S: '@', J: '@', T: '@', '~': '~' });
Object.assign(CS_THUMB_COL, { S: '#626A54', J: '#1E3818', T: '#8C8A68', '~': '#24505C' });

csAddMap('aztec', {
  name: 'AZTEC', label: 'DE_AZTEC',
  theme: { name: 'AZTEC', ground: '#5E6438', specks: ['#4E5430', '#6E7444'] },
  rows: [
  'JJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJ',
  'JJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJ',
  'JJSSSSSSSSSSSSSSSSSSSSSSSSJJJJJJJJJJSSSSSSSSSSSSSSSSSSSSSJJJ',
  'JJS...................S..SJJJJJJJJJJS...................SJJJ',
  'JJS.x...S................SJJJJJJJJJJS...................SJJJ',
  'JJS................xx....SSSSSSSSSSSS...................SJJJ',
  'JJS.....................................................SJJJ',
  'JJS..TTTT...............................................SJJJ',
  'JJS..TTTT.....................S.........................SJJJ',
  'JJS..TTTT...............................................SJJJ',
  'JJS................S....................................SJJJ',
  'JJS......................SSSSSSSSSSSS...................SJJJ',
  'JJS..xx..................SJJJJJJJJJJS....SSSSSS.....SSSSSJJJ',
  'JJS.................x....SJJJJJJJJJJS....SJJJJJ.....JJJJJJJJ',
  'JJS......................SJJJJJJJJJJS....SJJJJJ.....JJJJJJJJ',
  'JJS......................SJJJJJJJJJJS....SJJJJJ.....JJJJJJJJ',
  'JJSSSSSSSSSS......SSSSSSSSJJJJJJJJJJS....SJJJJJ.....JJJJJJJJ',
  'JJJJJJJJJJJJ......JJJJJJJJJJJJJJJJJJS....SJJJJJ.....JJJJJJJJ',
  'JJJJJJJJJJJJ......JJJJJJJJJJJJJJJJJJS....SJJJJJ.....JJJJJJJJ',
  'JJJJJJJJJJJJ......JJJJJJJJJJJJJJJJJJS....SJJJJJ.....JJJJJJJJ',
  'JJJJJJJJJJJJ......JJJJJJJJJJ............SSJJJJJ.....JJJJJJJJ',
  'JJJJJJJJJJJJ......JJJJJJJJJJ............JSSSSSSS...SSSSSSSJJ',
  'JJ~~~~~~~~~~~~..~~~~~~~~~~~J..x.........JS...............SJJ',
  'JJ~~~~~~~~~~~~..~~~~~~~~~~~J............JS...............SJJ',
  'JJ~~~~~~~~~~~~..~~~~~~~~~~~J............JS..xx......TTTTTSJJ',
  'JJ~~~~~~~~~~~~..~~~~~~~~~~~J...TT...................TTTTTSJJ',
  'JJ~~~~~~~~~~~~..~~~~~~~~~~~J...TT...................TTTTTSJJ',
  'JJ~~~~~~~~~~~~..~~~~~~~~~~~J.............................SJJ',
  'JJJ.........J......JJJ~~~~~J.............................SJJ',
  'JJJ................JJJ~~~~~J............JS...............SJJ',
  'JJJ..............x.JJJ~~~~~J..........x.JS...............SJJ',
  'JJJ.....JJ.........JJJ~~~~~J............JS..x............SJJ',
  'JJJ.....JJJJJJJJJJJJJJ~~~~~J............JS............xx.SJJ',
  'JJJ.....JJJJJJJJJJJJJJ~~~~~JJJJJJ....JJJJS...............SJJ',
  'JJJ.....JJJJJJJJJJJJJJ~~~~~JJJJJJ....JJJJS...............SJJ',
  'JJJJ....JJJJJJJJJJJJJJ~~~~~JJJJJJ....JJJJSSS.....SSSSSSSSSJJ',
  'JJJ.....JJJJJJJJJJJJJJ~~~~~JJJJJJ....JJJJJJJ.....~~~~~~~~JJJ',
  'JJJ.....JJJJJJJJJJJJJ............................~~~~~~~~JJJ',
  'JJJ.....JJJJJJJJJJJJJ............................~~~~~~~~JJJ',
  'JJJ....JJJJJJJJJJJJJJ............................~~~~~~~~JJJ',
  'JJJ.....JJJJJJJJJJJJJ............................~~~~~~~~JJJ',
  'JJJ.....JJJJJJJJJJJJJ....JJJJJJJJ....JJ....J.....~~~~~~~~JJJ',
  'JJJ.....JJJJJJJJJJJJJ.....JJ.........J....JJJJJJJ~~~~~~~~JJJ',
  'JJJJ....JJJJJJJJJJJJJ.....JJ...............JJJJJJ~~~~~~~~JJJ',
  'JJJ.....JJJJJJJJJJJJJ.....JJ...............JJJJJJ~~~~~~~~JJJ',
  'JJJ.....JJJJJJJJJJJJJ.....JJ.x............JJJJJJJJJJJJJJJJJJ',
  'JJJ....JJJJJJJJJJJJJJJ....JJJ.............JJJJJJJJJJJJJJJJJJ',
  'JJJ.....JJJJJJJJJJJJJ......JJJSd...dSJJJJJJJJJJJJJJJJJJJJJJJ',
  'JJJ.....JJJJJJJJJJJJJ......JJJS.....SJJJJJJJJJJJJJJJJJJJJJJJ',
  'JJJJJJ.....................JJJS.....SJJJJJJJJJJJJJJJJJJJJJJJ',
  'JJJJJ......................JJJS.....SJJJJJJJJJJJJJJJJJJJJJJJ',
  'JJJJ.......................JJJS.....SJJJJJJJJJJJJJJJJJJJJJJJ',
  'JJJJ......................JJJJS.....SJJJJJJJJJJJJJJJJJJJJJJJ',
  'JJJJ.................SSSSSSSSSS.....SJJJJJJJJJJJJJJJJJJJJJJJ',
  'JJJJ....x...........................SJJJJJJJJJJJJJJJJJJJJJJJ',
  'JJJJ................................SJJJJJJJJJJJJJJJJJJJJJJJ',
  'JJJJ................................SJJJJJJJJJJJJJJJJJJJJJJJ',
  'JJJJ................................SJJJJJJJJJJJJJJJJJJJJJJJ',
  'JJJJ................SSSSSSSSSSSSSSSSSJJJJJJJJJJJJJJJJJJJJJJJ',
  'JJJJJJ.............JJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJ',
  'JJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJ',
  'JJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJ',
  ],

  // places on the map, in tiles [x, y, w, h]: the spawns (and their buy zones) and the two bombsites
  zones: {
  T: [5, 50, 15, 9],
  CT: [38, 3, 16, 8],
  A: [4, 4, 19, 12],
  B: [43, 23, 13, 11],
  },
  // where each side's five tanks start (tiles), and which way they face
  starts: {
  T: { dir: 0, at: [[9, 51], [12, 51], [15, 51], [10, 56], [14, 56]] },
  CT: { dir: 2, at: [[41, 5], [44, 4], [47, 5], [50, 4], [45, 8]] },
  },
  // the floor: the rope bridge's planks, the overpass's stone, the shallow canal, the stairs, slabs on the sites, in CT
  // spawn and the courtyard, dark stone in the halls and the T tunnel; jungle earth everywhere else
  floors: [
  ['bridge', 14, 22, 2, 6], ['span', 33, 33, 4, 9], ['shallow', 21, 37, 24, 4],
  ['steps', 44, 35, 5, 7], ['steps', 12, 16, 6, 6], ['steps', 52, 27, 5, 2],
  ['slab', 3, 3, 22, 13], ['slab', 37, 3, 19, 9], ['slab', 42, 22, 15, 13], ['slab', 28, 20, 12, 13], ['slab', 40, 25, 2, 4],
  ['hall', 25, 6, 12, 5], ['hall', 37, 12, 4, 8], ['hall', 21, 54, 15, 4], ['hall', 31, 47, 5, 7],
  ['earth', 0, 0, 60, 62],
  ],
  // call-outs (tiles): where the bots go, hold and look
  spots: {
  tSpawn: [12, 53], long: [5, 40], jungle: [5, 29], bridgeFoot: [14, 29], bridge: [14, 24], aRamp: [14, 18],
  aSite: [16, 10], aEdge: [14, 13], aTemple: [9, 10], aBoxes: [19, 7], aBack: [5, 5], aHall: [24, 8],
  ctHall: [28, 8], ctSpawn: [45, 7], connector: [38, 15], courtyard: [34, 29], bArch: [40, 26], ctPath: [49, 16],
  bSite: [46, 29], bEdge: [45, 32], bTemple: [53, 30], bBack: [50, 23], bStairs: [47, 25], bRamp: [45, 38],
  water: [31, 38], waterIn: [23, 43], tRamp: [23, 49], overpass: [34, 35], lowerRamp: [40, 43], doors: [33, 44],
  doubleDoors: [33, 50], tTunnel: [27, 55],
  },
  // the jungle's colours: earth, slabs, halls, water, planks, stairs; the walls; crates and doors of dark wood
  pal: {
  earth: ['#5E6438', '#4E5430', '#6E7444', '#424824', '#3C5A24'],
  slab: ['#8A8C74', '#767862', '#A0A288', '#62644E', '#6C7A4C'],
  hall: ['#4E4C3C', '#3E3C30', '#5E5C48', '#2E2C22'],
  shallow: ['#3E6A5C', '#2E584C', '#5C8A78', '#1E4038', '#8CB4A0'],
  bridge: ['#8C6438', '#6C4824', '#A87C48', '#3C2814', '#C8B07C'],
  steps: ['#7C7E68', '#626450', '#9A9C84', '#4C4E3C'],
  span: ['#828470', '#6A6C58', '#A4A68C', '#4E503E'],
  wall: ['#8E9480', '#747A66', '#A8AE98', '#5C624E', '#5C6E3A', '#4A5636'],
  jungle: ['#2E4A22', '#223C1A', '#3E5E2C', '#507034', '#16281A'],
  water: ['#1E3E44', '#163238', '#2C5458', '#4C7C74'],
  crate: ['#8C6430', '#64461C', '#3C2810', '#B08C50'], door: ['#6C5434', '#54402A', '#2C2014', '#8C7048'],
  },
  // the minimap's colours: floor, the sites
  mini: { floor: [104, 112, 66], site: [150, 152, 122] },
  // the bots (csbots.js): the terrorists' ways in (call-outs in order, the last one the site; stage: where they
  // gather; go: on in from there); where they hold round a planted bomb; where the CTs rotate to; the CTs' posts and
  // which way they look; where each post looks out from now and then; which ways the five take to each site
  bots: {
    routes: {
      bridge: { site: 'A', path: ['long', 'jungle', 'bridgeFoot'], stage: 'bridgeFoot', go: ['bridge', 'aRamp', 'aSite'] },
      lurk: { site: 'A', path: ['tTunnel', 'doubleDoors', 'doors', 'overpass', 'courtyard'], stage: 'courtyard', go: ['connector', 'ctHall', 'aHall', 'aSite'] },
      water: { site: 'B', path: ['tRamp', 'waterIn', 'water'], stage: 'water', go: ['bRamp', 'bSite'] },
      doors: { site: 'B', path: ['tTunnel', 'doubleDoors', 'doors'], stage: 'doors', go: ['lowerRamp', 'bRamp', 'bSite'] },
      overpass: { site: 'B', path: ['tTunnel', 'doubleDoors', 'doors'], stage: 'doors', go: ['overpass', 'courtyard', 'bArch', 'bSite'] },
    },
    post: { A: ['aTemple', 'aBoxes', 'aEdge', 'aHall'], B: ['bTemple', 'bBack', 'bEdge', 'bStairs'] },
    rot: { A: ['aHall', 'aBoxes', 'aSite'], B: ['bStairs', 'bBack', 'bSite'] },
    ct: [['aEdge', 2], ['bEdge', 2], ['courtyard', 2], ['aTemple', 1], ['bTemple', 3]],
    peek: { aEdge: 'aRamp', bEdge: 'bRamp', courtyard: 'overpass', aTemple: 'aRamp', bTemple: 'bRamp' },
    ways: { A: ['bridge', 'bridge', 'lurk', 'bridge', 'bridge'], B: ['water', 'doors', 'overpass', 'water', 'doors'] },
  },
});

// ------------------------------------------------------------------ the pictures
(() => {
  const P = () => CS_PAL;
  const wallCh = ch => ch === 'S' || ch === 'J' || ch === 'T' || ch === '#';
  const wallAt = (x, y) => wallCh(csTile(x, y));
  const dot = (g, c, x, y, w = 1, h = 1) => { g.fillStyle = c; g.fillRect(x, y, w, h); };

  // weathered stone: blocks with moss in the joints; a face on the side towards the floor below
  CS_TILE_ART.S = (g, tx, ty, R) => {
    const W = P().wall;
    let near = false;
    for (let y = ty - 1; y <= ty + 1; y++) for (let x = tx - 1; x <= tx + 1; x++) if (!wallAt(x, y)) near = true;
    dot(g, near ? W[0] : W[3], 0, 0, 16, 16);
    dot(g, W[1], 0, 7, 16, 1); dot(g, W[1], 0, 15, 16, 1);
    dot(g, W[1], (ty & 1) ? 5 : 11, 0, 1, 7); dot(g, W[1], (ty & 1) ? 12 : 3, 8, 1, 7);
    for (let n = 0; n < 7; n++) dot(g, W[1 + Math.floor(R() * 3)], Math.floor(R() * 16), Math.floor(R() * 16));
    // moss in the joints and the cracks
    for (let n = 0; n < 5; n++) { const x = Math.floor(R() * 15), y = R() < 0.5 ? 6 + Math.floor(R() * 2) : 14 + Math.floor(R() * 2); dot(g, W[4], x, y, 1 + Math.floor(R() * 3), 1); }
    if (R() < 0.4) dot(g, W[5], Math.floor(R() * 12), Math.floor(R() * 12), 3, 2);
    if (!near) return;
    if (!wallAt(tx, ty - 1)) dot(g, W[2], 0, 0, 16, 1);
    if (!wallAt(tx - 1, ty)) dot(g, W[2], 0, 0, 1, 16);
    if (!wallAt(tx + 1, ty)) dot(g, W[3], 15, 0, 1, 16);
    if (!wallAt(tx, ty + 1)) {
      // the face, seen a little from the south: a carved band
      dot(g, W[3], 0, 10, 16, 6); dot(g, W[1], 0, 10, 16, 1); dot(g, W[5], 0, 15, 16, 1);
      for (let k = (tx & 1) * 4; k < 16; k += 8) { dot(g, W[1], k + 1, 12, 3, 2); dot(g, W[5], k + 2, 13, 1, 1); }
    }
  };

  // the jungle: a canopy of leaves, darker under the trees, a fringe of lighter leaves over the floor
  CS_TILE_ART.J = (g, tx, ty, R) => {
    const J = P().jungle;
    dot(g, J[1], 0, 0, 16, 16);
    for (let n = 0; n < 9; n++) {
      const cx = Math.floor(R() * 16), cy = Math.floor(R() * 16), r = 2 + Math.floor(R() * 3), c = J[R() < 0.5 ? 0 : R() < 0.6 ? 2 : 4];
      for (let y = -r; y <= r; y++) { const w = Math.floor(Math.sqrt(r * r - y * y)); dot(g, c, Math.max(0, cx - w), cy + y, Math.min(16, cx + w + 1) - Math.max(0, cx - w), 1); }
    }
    for (let n = 0; n < 8; n++) dot(g, J[3], Math.floor(R() * 16), Math.floor(R() * 16), 1 + (R() < 0.4 ? 1 : 0), 1);
    // the edge towards the floor: the leaves catch the light
    const edge = (open, x, y, w, h) => { if (!open) return; for (let k = 0; k < 16; k += 2) if (R() < 0.7) dot(g, J[3], x === 'k' ? k : x, y === 'k' ? k : y, w, h); };
    edge(!wallAt(tx, ty - 1), 'k', 0, 2, 1);
    edge(!wallAt(tx - 1, ty), 0, 'k', 1, 2);
    if (!wallAt(tx, ty + 1)) { dot(g, J[4], 0, 14, 16, 2); for (let k = 0; k < 16; k += 3) dot(g, J[0], k, 13 + Math.floor(R() * 2), 2, 1); }
    if (!wallAt(tx + 1, ty)) dot(g, J[4], 15, 0, 1, 16);
  };

  // a stepped pyramid seen from above: four faces of steps (lit from the north west), the stairs up the south face,
  // a little shrine on the flat top
  CS_TILE_ART.T = (g, tx, ty, R) => {
    const W = P().wall, run = (dx, dy) => { let n = 0, x = tx + dx, y = ty + dy; while (csTile(x, y) === 'T') { n++; x += dx; y += dy; } return n; };
    const l = run(-1, 0), r = run(1, 0), u = run(0, -1), d = run(0, 1), small = Math.min(l + r + 1, u + d + 1) * 8;
    const face = { u: ['#A8AE98', '#8E9480'], l: ['#9AA08A', '#7E846E'], r: ['#767C66', '#5E644E'], d: ['#666C56', '#4E5440'] };
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const dl = l * 16 + x, dr = r * 16 + 15 - x, du = u * 16 + y, dd = d * 16 + 15 - y, m = Math.min(dl, dr, du, dd);
      const side = m === dd ? 'd' : m === du ? 'u' : m === dl ? 'l' : 'r', F = face[side];
      let c = m % 4 === 3 ? F[1] : F[0];
      if (side === 'd' && Math.abs(dl - dr) < 10) c = (m & 1) ? '#B4B89E' : '#7C826C';   // the stairs
      if (m >= small - 6) {
        // the top: the shrine's roof, its dark doorway to the south
        c = m >= small - 4 ? '#8C7454' : '#5C4C34';
        if (side === 'd' && Math.abs(dl - dr) < 4 && m < small - 1) c = '#1C1810';
      }
      g.fillStyle = c; g.fillRect(x, y, 1, 1);
    }
    for (let n = 0; n < 4; n++) dot(g, W[4], Math.floor(R() * 16), Math.floor(R() * 16), 2, 1);
  };

  // deep water: dark green-blue, ripples, a lighter rim along the banks
  CS_TILE_ART['~'] = (g, tx, ty, R) => {
    const Q = P().water;
    dot(g, Q[0], 0, 0, 16, 16);
    for (let n = 0; n < 4; n++) dot(g, Q[1], Math.floor(R() * 12), Math.floor(R() * 16), 3 + Math.floor(R() * 4), 1);
    for (let n = 0; n < 3; n++) { const x = Math.floor(R() * 12), y = Math.floor(R() * 15); dot(g, Q[2], x, y, 4, 1); dot(g, Q[3], x + 1, y, 2, 1); }
    const open = (x, y) => csTile(x, y) !== '~';
    if (open(tx, ty - 1)) { dot(g, Q[1], 0, 0, 16, 3); dot(g, Q[3], 0, 3, 16, 1); }
    if (open(tx - 1, ty)) dot(g, Q[2], 0, 0, 1, 16);
    if (open(tx + 1, ty)) dot(g, Q[2], 15, 0, 1, 16);
    if (open(tx, ty + 1)) dot(g, Q[2], 0, 15, 16, 1);
  };

  // the shadows the walls throw down and to the right (every Aztec floor draws its own)
  const shade = (g, x, y, tx, ty) => {
    g.fillStyle = 'rgba(8,20,4,0.36)';
    const up = wallAt(tx, ty - 1);
    if (up) g.fillRect(x, y, 16, 4);
    if (wallAt(tx - 1, ty)) g.fillRect(x, y + (up ? 4 : 0), 3, up ? 12 : 16);
  };
  const specks = (g, x, y, P2, r, n) => { for (let k = 0; k < n; k++) dot(g, P2[1 + Math.floor(r() * 3)], x + Math.floor(r() * 16), y + Math.floor(r() * 16), 1 + (r() < 0.3 ? 1 : 0), 1); };

  // jungle earth: dirt, moss, fallen leaves, a tuft of grass here and there
  CS_FLOOR_ART.earth = (g, x, y, tx, ty, P2, r) => {
    specks(g, x, y, P2, r, 8);
    if (r() < 0.35) { const gx = x + Math.floor(r() * 12), gy = y + Math.floor(r() * 12); dot(g, P2[4], gx, gy + 1, 1, 2); dot(g, P2[4], gx + 1, gy, 1, 3); dot(g, P2[4], gx + 2, gy + 1, 1, 2); }
    if (r() < 0.2) dot(g, '#7C5A2C', x + Math.floor(r() * 14), y + Math.floor(r() * 14), 2, 1);
    shade(g, x, y, tx, ty);
  };
  // stone slabs, mossy at the joints
  CS_FLOOR_ART.slab = (g, x, y, tx, ty, P2, r) => {
    dot(g, P2[1], x, y + 15, 16, 1); dot(g, P2[1], x + ((ty & 1) ? 0 : 8), y, 1, 15);
    dot(g, P2[2], x + 1, y + 1, 5, 1);
    if (r() < 0.5) dot(g, P2[4], x + ((ty & 1) ? 0 : 8), y + 3 + Math.floor(r() * 8), 1, 3);
    if (r() < 0.4) dot(g, P2[4], x + Math.floor(r() * 12), y + 15, 3, 1);
    specks(g, x, y, P2, r, 3);
    shade(g, x, y, tx, ty);
  };
  // the halls and the T tunnel: dark worn flagstones
  CS_FLOOR_ART.hall = (g, x, y, tx, ty, P2, r) => {
    dot(g, P2[1], x, y + 7, 16, 1); dot(g, P2[1], x, y + 15, 16, 1);
    dot(g, P2[1], x + ((tx + ty) & 1 ? 4 : 11), y, 1, 7); dot(g, P2[1], x + ((tx + ty) & 1 ? 11 : 4), y + 8, 1, 7);
    dot(g, P2[2], x + 1, y + 1, 3, 1);
    specks(g, x, y, P2, r, 3);
    shade(g, x, y, tx, ty);
  };
  // the canal: shallow water over stones, ripples going east
  CS_FLOOR_ART.shallow = (g, x, y, tx, ty, P2, r) => {
    for (let n = 0; n < 3; n++) { const sx = x + Math.floor(r() * 13), sy = y + Math.floor(r() * 14); dot(g, P2[1], sx, sy, 3, 2); dot(g, P2[3], sx, sy + 2, 3, 1); }
    for (let n = 0; n < 2; n++) { const sx = x + Math.floor(r() * 10), sy = y + Math.floor(r() * 16); dot(g, P2[2], sx, sy, 5, 1); dot(g, P2[4], sx + 2, sy, 2, 1); }
    if (wallAt(tx, ty - 1)) dot(g, P2[3], x, y, 16, 2);
    if (wallAt(tx, ty + 1)) dot(g, P2[2], x, y + 15, 16, 1);
    shade(g, x, y, tx, ty);
  };
  // the rope bridge: planks across, the ravine's water showing between them, a rope and posts each side
  CS_FLOOR_ART.bridge = (g, x, y, tx, ty, P2, r) => {
    const Q = P().water;
    dot(g, Q[0], x, y, 16, 16);
    for (let k = 0; k < 16; k += 4) { dot(g, P2[(tx + ty + k) % 3 ? 0 : 2], x, y + k, 16, 3); dot(g, P2[1], x, y + k + 2, 16, 1); }
    dot(g, P2[3], x + (tx & 1 ? 2 : 9), y + 1, 1, 1);
    const left = csFloorOf(tx - 1, ty) !== 'bridge', right = csFloorOf(tx + 1, ty) !== 'bridge';
    for (const [on, rx] of [[left, x], [right, x + 13]]) {
      if (!on) continue;
      dot(g, P2[3], rx, y, 3, 16);
      dot(g, P2[4], rx + 1, y, 1, 16);
      if (csFloorOf(tx, ty - 1) !== 'bridge' || csFloorOf(tx, ty + 1) !== 'bridge') { dot(g, P2[3], rx, y + 4, 3, 8); dot(g, P2[1], rx + 1, y + 5, 1, 6); }
    }
  };
  // the stairs and ramps: steps going down to the south
  CS_FLOOR_ART.steps = (g, x, y, tx, ty, P2, r) => {
    for (let k = 0; k < 16; k += 4) { dot(g, P2[2], x, y + k, 16, 1); dot(g, P2[1], x, y + k + 3, 16, 1); }
    dot(g, P2[3], x + ((tx * 5 + ty) % 13), y + 1, 2, 1);
    specks(g, x, y, P2, r, 2);
    shade(g, x, y, tx, ty);
  };
  // the overpass: a stone span over the water with a low parapet each side
  CS_FLOOR_ART.span = (g, x, y, tx, ty, P2, r) => {
    dot(g, P2[1], x, y + 7, 16, 1); dot(g, P2[1], x, y + 15, 16, 1); dot(g, P2[1], x + (ty & 1 ? 6 : 12), y, 1, 15);
    specks(g, x, y, P2, r, 2);
    const over = csFloorOf(tx - 1, ty) === 'shallow' || csFloorOf(tx + 1, ty) === 'shallow';
    if (over) {
      if (csFloorOf(tx - 1, ty) !== 'span') { dot(g, P2[2], x, y, 2, 16); dot(g, P2[3], x + 2, y, 1, 16); }
      if (csFloorOf(tx + 1, ty) !== 'span') { dot(g, P2[2], x + 14, y, 2, 16); dot(g, P2[3], x + 13, y, 1, 16); }
    }
    shade(g, x, y, tx, ty);
  };
})();
