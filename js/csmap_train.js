'use strict';
// =====================================================================
//  COUNTER-STRIKE's map DE_TRAIN, seen from above, a tile to a character (66 x 68 tiles of 16 px).
//  The rail yard of the classic layout: T spawn in the north west; ALLEY and PIGEONS east along the top to IVY, which
//  comes down into the A yard at its north west; T CONNECTOR down from spawn to A MAIN, which comes in from the west;
//  SHOWERS down from main to POPDOG, the hall under A that comes up into the yard by the E BOX (south west). The A
//  yard (outside A, the big site) is five tracks of trains running west to east: the ivy train, the two bomb trains
//  (red and green, the site between them, the sandwich above, a gap through both to plant in), the blue train and the
//  ladder train; HEAVEN looks down on it from the east through its windows, HELL under it, the LADDER ROOM between
//  them and down to CT spawn (east); the Z CONNECTOR from the yard's south side to CT spawn. T STAIRS go down the west
//  side to the B HALLS, UPPER B coming out over the north west of bombsite B (south), LOWER B going on round to the
//  B RAMP at its south west; B is two tracks of trains (the bomb train and the oil tanker, the green car and the
//  coach), BACK OF B round from CT spawn to its south east.
//    #  wall (grey concrete): nothing breaks it, it blocks shells and sight
//    .  floor (concrete, gravel in the yards, rails on the tracks, tiles indoors: see the floors)
//    x  wooden crate: cover that shells break bit by bit
//    w  a window: heaven's, over the yard (shells and sight pass, tanks don't)
//    1  a rusty red boxcar   2  a green boxcar   3  a blue passenger car   4  a black oil tanker (steel: nothing
//       breaks a train; a car is a run of one character two tiles tall, its ends drawn where the run ends)
//    5  the E box (an electrical cabinet, steel)
// =====================================================================

// the trains and the E box: steel blocks, their own pictures, their colours on the team screen. The registries are
// shared by every map, so another map's picture for one of these characters (if any) is kept for that map
(() => {
  const CARS = '1234', solid = c => CARS.includes(c) || c === '5';
  for (const ch of CARS + '5') {
    CS_TILE_BLOCK[ch] = '@';
    const prev = CS_TILE_ART[ch];
    CS_TILE_ART[ch] = (g, tx, ty, R) => (CS_MAPKEY === 'train' || !prev ? (ch === '5' ? eBox(g) : car(g, tx, ty, R)) : prev(g, tx, ty, R));
  }
  Object.assign(CS_THUMB_COL, { 1: '#8C3C24', 2: '#3C6C40', 3: '#3C5C9C', 4: '#242428', 5: '#6C6C6C' });

  // one tile of a car: drawn in the car's own frame (32 px tall, two tiles), the ends where the run of tiles ends
  function car(g, tx, ty, R) {
    const ch = csTile(tx, ty), P = CS_PAL['car' + ch], top = csTile(tx, ty + 1) === ch, oy = top ? 0 : -16;
    let x0 = tx, x1 = tx;
    while (csTile(x0 - 1, ty) === ch) x0--;
    while (csTile(x1 + 1, ty) === ch) x1++;
    const i = tx - x0, n = x1 - x0 + 1, first = i === 0, last = i === n - 1;
    const f = (c, x, y, w, h) => { g.fillStyle = c; g.fillRect(x, y + oy, w, h); };
    const xa = first ? 2 : 0, xb = last ? 14 : 16, w = xb - xa;
    if (ch === '4') {
      // a tanker: the frame under it, the barrel shaded round, hoops, a dome with its hatch in the middle
      f('#2C2C30', first ? 1 : 0, 4, (last ? 15 : 16) - (first ? 1 : 0), 24);
      const ca = first ? 3 : 0, cb = last ? 13 : 16, cw = cb - ca;
      f(P[3], ca, 5, cw, 22); f(P[2], ca, 6, cw, 6); f(P[4], ca, 7, cw, 2); f(P[0], ca, 12, cw, 7); f(P[1], ca, 19, cw, 6);
      // rounded ends, a hoop near each end
      if (first) { f(P[3], 2, 8, 1, 16); f(P[1], 2, 9, 1, 14); f(P[3], 3, 5, 1, 1); f(P[3], 3, 26, 1, 1); }
      if (last) { f(P[3], 13, 8, 1, 16); f(P[1], 13, 9, 1, 14); f(P[3], 12, 5, 1, 1); f(P[3], 12, 26, 1, 1); }
      if (i === 1) f(P[3], 2, 6, 1, 20);
      if (i === n - 2) f(P[3], 13, 6, 1, 20);
      if (i === n >> 1) { f(P[3], 3, 9, 10, 14); f(P[2], 4, 10, 8, 12); f(P[4], 5, 11, 4, 1); f(P[0], 5, 13, 6, 8); f(P[3], 7, 15, 2, 4); }
      // the ladder and the walkway at the ends
      if (first) { f('#8C8C8C', 0, 6, 1, 20); for (let k = 7; k < 26; k += 3) f('#8C8C8C', 0, k, 2, 1); }
      if (last) { f('#8C8C8C', 15, 6, 1, 20); for (let k = 7; k < 26; k += 3) f('#8C8C8C', 14, k, 2, 1); }
      for (let k = 0; k < 3; k++) f(P[1], Math.floor(R() * 16), 10 + Math.floor(R() * 10), 1, 1);
      return;
    }
    // a boxcar or a coach: the body's dark edge, the roof, its lit and shaded sides
    f(P[3], first ? 1 : 0, 2, (last ? 15 : 16) - (first ? 1 : 0), 28);
    f(P[0], xa, 3, w, 26);
    f(P[2], xa, 3, w, 1); f(P[1], xa, 26, w, 3);
    if (ch === '3') {
      // a coach: the raised middle of the roof with its vents, gutters, the gangway bellows at the ends
      f(P[2], xa, 11, w, 10); f(P[1], xa, 20, w, 1);
      f(P[1], 3, 13, 3, 5); f(P[1], 11, 13, 3, 5); f(P[3], 4, 14, 1, 3); f(P[3], 12, 14, 1, 3);
      f(P[1], xa, 5, w, 1); f(P[1], xa, 24, w, 1);
      if (first) f('#2C2C2C', 0, 9, 2, 14);
      if (last) f('#2C2C2C', 14, 9, 2, 14);
    } else {
      // a boxcar: the roof's ribs, the wooden walkway down the middle, the hand brake wheel at one end
      for (let k = 3; k < 16; k += 4) if (k >= xa && k < xb) { f(P[1], k, 4, 1, 22); if (k + 1 < xb) f(P[2], k + 1, 4, 1, 22); }
      f('#5C4430', xa, 14, w, 3); f('#7C6044', xa, 14, w, 1);
      for (let k = 1; k < 16; k += 3) if (k >= xa && k < xb) f('#3C2C1C', k, 14, 1, 3);
      if (first) { f('#3C3C3C', 2, 5, 1, 22); f('#9C9C9C', 3, 6, 3, 3); }
      if (last) f('#3C3C3C', 13, 5, 1, 22);
      for (let k = 0; k < 4; k++) f(R() < 0.5 ? P[1] : P[2], Math.floor(R() * 16), 4 + Math.floor(R() * 22), 1, 1);
    }
  }
  // the E box: a grey electrical cabinet with its warning sign
  function eBox(g) {
    g.fillStyle = '#242424'; g.fillRect(1, 1, 14, 14);
    g.fillStyle = '#8C9094'; g.fillRect(2, 2, 12, 11);
    g.fillStyle = '#A8ACB0'; g.fillRect(2, 2, 12, 1);
    g.fillStyle = '#5C6064'; g.fillRect(8, 3, 1, 10); g.fillRect(2, 12, 12, 1);
    g.fillStyle = '#F8D838'; g.fillRect(4, 5, 3, 3);
    g.fillStyle = '#000000'; g.fillRect(5, 6, 1, 1);
  }

  // the floors: shadows the trains throw (the walls' are drawn for every map)
  const shade = (g, x, y, tx, ty) => {
    g.fillStyle = 'rgba(16,16,24,0.34)';
    if (solid(csTile(tx, ty - 1))) g.fillRect(x, y, 16, 4);
    if (solid(csTile(tx - 1, ty))) g.fillRect(x, y, 3, 16);
  };
  const specks = (g, x, y, P, r, n) => { for (let k = 0; k < n; k++) { g.fillStyle = P[1 + Math.floor(r() * 3)]; g.fillRect(x + Math.floor(r() * 16), y + Math.floor(r() * 16), 1 + (r() < 0.3 ? 1 : 0), 1); } };
  // concrete: big slabs with their joints
  CS_FLOOR_ART.concrete = (g, x, y, tx, ty, P, r) => {
    g.fillStyle = P[1];
    if (tx % 3 === 0) g.fillRect(x, y, 1, 16);
    if (ty % 3 === 0) g.fillRect(x, y, 16, 1);
    specks(g, x, y, P, r, 4);
    if (r() < 0.06) { g.fillStyle = P[3]; g.fillRect(x + 3 + Math.floor(r() * 8), y + 4 + Math.floor(r() * 8), 4, 1); }
    shade(g, x, y, tx, ty);
  };
  // gravel: the yards between the tracks
  CS_FLOOR_ART.gravel = (g, x, y, tx, ty, P, r) => { specks(g, x, y, P, r, 18); shade(g, x, y, tx, ty); };
  // the tracks: gravel, wooden sleepers across, two steel rails along (a track is two tiles tall)
  CS_FLOOR_ART.rails = (g, x, y, tx, ty, P, r) => {
    specks(g, x, y, ['', P[1], P[2], P[3]], r, 10);
    const b = CS_FLOORS.find(k => k[0] === 'rails' && tx >= k[1] && ty >= k[2] && tx < k[1] + k[3] && ty < k[2] + k[4]);
    const oy = !b || ty === b[2] ? 0 : -16;
    g.save(); g.beginPath(); g.rect(x, y, 16, 16); g.clip();
    for (let k = 0; k < 16; k++) if ((x + k) % 6 === 0) { g.fillStyle = P[4]; g.fillRect(x + k, y + oy + 5, 3, 22); g.fillStyle = P[5]; g.fillRect(x + k + 2, y + oy + 5, 1, 22); }
    for (const ry of [9, 21]) { g.fillStyle = P[6]; g.fillRect(x, y + oy + ry, 16, 2); g.fillStyle = P[7]; g.fillRect(x, y + oy + ry + 2, 16, 1); }
    g.restore();
    shade(g, x, y, tx, ty);
  };
  // indoors: the halls' tiled floor
  CS_FLOOR_ART.hall = (g, x, y, tx, ty, P, r) => {
    g.fillStyle = P[1]; g.fillRect(x, y + 7, 16, 1); g.fillRect(x, y + 15, 16, 1); g.fillRect(x + 7, y, 1, 16); g.fillRect(x + 15, y, 1, 16);
    g.fillStyle = P[2]; g.fillRect(x, y, 7, 1); g.fillRect(x + 8, y + 8, 7, 1);
    specks(g, x, y, P, r, 3);
    shade(g, x, y, tx, ty);
  };
})();

csAddMap('train', {
  name: 'TRAIN', label: 'DE_TRAIN',
  theme: { name: 'TRAIN', ground: '#84847C', specks: ['#74746C', '#94948C'] },
  rows: [
  '##################################################################',
  '##################################################################',
  '##################################################################',
  '###xx............#########.............###########################',
  '###x...................................###########################',
  '###....................................###########################',
  '###...........x.................####...###########################',
  '###...........x.................####...###########################',
  '###..............#########......####...###########################',
  '###..............###################...###########################',
  '###........###...#############............................########',
  '###........###...#############............................#.....##',
  '###........###..x#############............................#.....##',
  '###.............x#############...111111111...222222222....w.....##',
  '###....######....#############...111111111...222222222....w.....##',
  '###....######....#############............................#.....##',
  '###....######....#############............................#.....##',
  '###....######....#############............................w.....##',
  '###....######....#############....4444444....11111111.....w.....##',
  '###....######....#############....4444444....11111111.....#.....##',
  '###....######.............................................#.....##',
  '###....######.............................................#.....##',
  '###....######.............................................###...##',
  '###....###############...#####....22222222...3333333......###...##',
  '###....###############...#####....22222222...3333333......###...##',
  '###....###############...#####xx..........................#.....##',
  '###....###############...#####........x.........................##',
  '###....###############...#####..................................##',
  '###....###############...#####...3333333...44444444.............##',
  '###....###############...#####...3333333...44444444.......#.....##',
  '###....###############...#####............................#.....##',
  '###....###############...#####....5....................xx.#.....##',
  '###....###############...#####............................#.....##',
  '###....###############...#####......111111111111..........#.....##',
  '###....###############...#####......111111111111..........#.....##',
  '###....###############...#####............................#.....##',
  '###....###############...#####............................#.....##',
  '###....###############...######...##########...############.....##',
  '###....###############...######...##########...############.....##',
  '###....###########................##########...############.....##',
  '###....###########................##########....................##',
  '###....###########................##########....................##',
  '###....###########................##########....................##',
  '###....###########...#############################..............##',
  '###.................##############################..............##',
  '###.................##############################..............##',
  '###.................##############################..............##',
  '###.................##############################..............##',
  '#########....#####........########################..............##',
  '#########....#####........########################..............##',
  '#########....#########..........................##########....####',
  '#########....#########..........................##########....####',
  '#########....#########..........................##########....####',
  '#########....#########....11111111...44444444...##########....####',
  '#########....#########....11111111...44444444...##########....####',
  '#########....#########..........................##########....####',
  '#########....#########..........................##########....####',
  '#########....#########..........................##########....####',
  '#########................222222222...33333333.................####',
  '#########................222222222...33333333.................####',
  '#########.....................................................####',
  '#########.....................................................####',
  '######################......................xx..##################',
  '######################..........................##################',
  '##################################################################',
  '##################################################################',
  '##################################################################',
  '##################################################################',
  ],

  // places on the map, in tiles [x, y, w, h]: the spawns (and their buy zones) and the two bombsites
  zones: {
  T: [3, 3, 14, 11],
  CT: [51, 41, 12, 8],
  A: [38, 16, 16, 12],
  B: [27, 51, 15, 11],
  },
  // where each side's five tanks start (tiles), and which way they face
  starts: {
  T: { dir: 1, at: [[5, 5], [9, 5], [5, 10], [9, 10], [12, 8]] },
  CT: { dir: 3, at: [[53, 42], [57, 42], [61, 43], [53, 46], [58, 46]] },
  },
  // the floor: rails on the tracks, gravel in the yards, tiles indoors (the halls, popdog, the ladder room and
  // heaven), concrete elsewhere
  floors: [
  ['rails', 30, 13, 28, 2], ['rails', 30, 18, 28, 2], ['rails', 30, 23, 28, 2], ['rails', 30, 28, 28, 2], ['rails', 30, 33, 28, 2],
  ['rails', 22, 53, 26, 2], ['rails', 22, 58, 26, 2],
  ['gravel', 30, 10, 28, 27], ['gravel', 22, 50, 26, 14],
  ['hall', 18, 39, 16, 4], ['hall', 31, 37, 3, 2], ['hall', 22, 23, 3, 16], ['hall', 3, 44, 17, 4], ['hall', 18, 43, 3, 1], ['hall', 9, 48, 4, 14], ['hall', 9, 58, 13, 4],
  ['hall', 59, 11, 5, 29], ['hall', 58, 26, 1, 3],
  ['concrete', 0, 0, 66, 68],
  ],
  // call-outs (tiles): where the bots go, hold and look
  spots: {
  tSpawn: [9, 8], alley: [21, 5], pigeons: [28, 6], ivy: [35, 4], ivyExit: [37, 11], tConnector: [14, 17], aMain: [25, 21], main: [32, 21],
  showers: [23, 31], lowerPopdog: [26, 40], popdog: [32, 37], elBox: [33, 33], sandwich: [43, 16], aSite: [43, 21], redTrain: [50, 21], greenTrain: [43, 26], blueTrain: [41, 31],
  hell: [55, 27], heaven: [61, 15], ladderRoom: [61, 31], zConnector: [45, 39], ctLower: [60, 54], ctSpawn: [56, 44],
  tStairs: [4, 26], bHalls: [10, 45], upperHalls: [16, 45], upperB: [21, 49], lowerB: [10, 54], bRamp: [19, 59],
  bSite: [35, 56], bombTrain: [36, 51], backB: [51, 60], oilB: [45, 56], coach: [40, 61],
  },
  // the look: grey concrete and brick, the trains' paint
  pal: {
    concrete: ['#8E8E86', '#7E7E76', '#9C9C94', '#6C6C66'], gravel: ['#7A7468', '#6A645A', '#8A8476', '#5A544C'],
    rails: ['#787268', '#686258', '#888274', '#585248', '#4C3C2C', '#34281C', '#B4B4BC', '#3C3C44'],
    hall: ['#5E5C58', '#4C4A46', '#6C6A66', '#3E3C38'],
    roof: ['#9A968E', '#86827A', '#B0ACA4', '#6E6A64'], face: ['#5E5A54', '#4A4640', '#76726C'], deep: ['#6E6A66', '#5E5A56', '#7E7A76'],
    door: ['#4C7C58', '#36603E', '#1C3C24', '#6C9C78'],
    car1: ['#8C3C24', '#6C2C18', '#AC5838', '#2C140C'], car2: ['#3C6C40', '#2C5030', '#548858', '#14241A'],
    car3: ['#3C5C9C', '#2C447C', '#6C8CC4', '#141C34'], car4: ['#404048', '#26262C', '#62626E', '#0C0C10', '#9494A2'],
  },
  // the minimap's colours: floor, the sites
  mini: { floor: [140, 140, 132], site: [178, 132, 110] },
  // the bots (csbots.js): the terrorists' ways in (stage: where they gather; go: on in from there, the last the
  // site); where they hold round a planted bomb; where the CTs rotate to; the CTs' posts and which way they look;
  // where each post looks out from now and then; which ways the five take to each site
  bots: {
    routes: {
      ivy: { site: 'A', path: ['alley', 'pigeons', 'ivy'], stage: 'ivy', go: ['ivyExit', 'sandwich', 'aSite'] },
      main: { site: 'A', path: ['tConnector', 'aMain'], stage: 'aMain', go: ['main', 'aSite'] },
      popdog: { site: 'A', path: ['tConnector', 'showers', 'lowerPopdog'], stage: 'lowerPopdog', go: ['popdog', 'elBox', 'blueTrain', 'aSite'] },
      upper: { site: 'B', path: ['tStairs', 'bHalls', 'upperHalls'], stage: 'upperHalls', go: ['upperB', 'bombTrain', 'bSite'] },
      lower: { site: 'B', path: ['tStairs', 'bHalls', 'lowerB'], stage: 'lowerB', go: ['bRamp', 'bSite'] },
    },
    post: { A: ['greenTrain', 'redTrain', 'sandwich', 'hell'], B: ['backB', 'oilB', 'coach', 'bombTrain'] },
    rot: { A: ['zConnector', 'hell', 'aSite'], B: ['backB', 'oilB', 'bSite'] },
    ct: [['heaven', 3], ['aSite', 3], ['bSite', 3], ['blueTrain', 3], ['backB', 3]],
    peek: { heaven: 'ivyExit', aSite: 'main', bSite: 'upperB', blueTrain: 'elBox', backB: 'bRamp' },
    ways: { A: ['main', 'ivy', 'popdog', 'main', 'ivy'], B: ['upper', 'lower', 'upper', 'lower', 'upper'] },
  },
});
