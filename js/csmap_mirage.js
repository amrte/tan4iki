'use strict';
// =====================================================================
//  COUNTER-STRIKE's second map: DE_MIRAGE, seen from above, a tile to a character (69 x 57 tiles of 16 px), laid out
//  after the game's own radar (north up). A Moroccan town: terracotta and ochre walls, tiled floors, market awnings.
//  T spawn in the east. From it three ways out: north and round the block (the way to TOP MID, and the door into the
//  T APARTMENTS); south down to the T RAMP, then west up the A RAMP (tetris at its top) or south through PALACE ALLEY
//  and the PALACE (its pillars) out on to A. Bombsite A in the south (firebox, the default box, triple, ninja by the
//  palace door, the stairs and sandwich under the jungle); west of it the CT way in past the TICKET BOOTH from CT spawn.
//  MID runs west from top mid (its boxes) to the WINDOW (the CT sniper's nest, a window tanks can't pass); off mid go
//  the CONNECTOR (south, down to the JUNGLE above A), SHORT (the catwalk, north and west into B as B SHORT) and the
//  UNDERPASS (north, up into the apartments). The APARTMENTS run west along the north edge from T apartments past the
//  stair hall to B APARTMENTS and their balcony over bombsite B in the north west (the van, the bench, the B boxes).
//  South of B the MARKET (its window and the kitchen door on to the site, its door to the arches) and the ARCHES down
//  to CT spawn in the west, between the sites; from CT spawn a door east into the jungle, and from the jungle the
//  ladder room leads up to the window room.
//    #  plaster wall: nothing breaks it, it blocks shells and sight
//    .  floor (paving outdoors, mosaic on the sites, terracotta tiles indoors: see floors)
//    x  wooden crate, d  a door leaf (cover shells break)
//    w  a window: tanks can't get through, shells and sight can
//    a  a market stall under its awning (a wall)
//    v  the van on B (a wall)
//    p  a palm in a clay pot (cover shells break)
// =====================================================================

// the stall's awning: stripes (teal or red on cream) and a scalloped edge on the south side
CS_TILE_BLOCK.a = '@';
CS_TILE_ART.a = (g, tx, ty) => {
  const P = CS_PAL.awning, col = (tx + ty) & 1 ? P[0] : P[2], open = csTile(tx, ty + 1) !== 'a';
  g.fillStyle = P[1]; g.fillRect(0, 0, 16, 16);
  g.fillStyle = col; for (let k = 0; k < 16; k += 6) g.fillRect(k, 0, 3, 16);
  g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(0, 0, 16, 1); g.fillRect(7, 0, 2, 16);
  if (open) {
    // the hem: a row of scallops and the shade under it
    g.fillStyle = P[3]; g.fillRect(0, 12, 16, 1);
    for (let k = 0; k < 16; k += 4) g.fillRect(k + 1, 13, 2, 2);
    g.fillStyle = 'rgba(30,16,8,0.35)'; g.fillRect(0, 15, 16, 1);
  }
};
CS_THUMB_COL.a = '#2C9C94';
// the van: white, a blue stripe, the cab and its windscreen at the west end
CS_TILE_BLOCK.v = '@';
CS_TILE_ART.v = (g, tx, ty) => {
  const P = CS_PAL.van, v = (x, y) => csTile(x, y) === 'v';
  const l = !v(tx - 1, ty), r = !v(tx + 1, ty), u = !v(tx, ty - 1), d = !v(tx, ty + 1);
  g.fillStyle = P[0]; g.fillRect(0, 0, 16, 16);
  g.fillStyle = P[3];
  if (l) g.fillRect(0, 0, 1, 16);
  if (r) g.fillRect(15, 0, 1, 16);
  if (u) g.fillRect(0, 0, 16, 1);
  if (d) { g.fillStyle = P[1]; g.fillRect(0, 13, 16, 3); g.fillStyle = P[3]; g.fillRect(0, 15, 16, 1); }
  g.fillStyle = P[2]; g.fillRect(l ? 1 : 0, d ? 10 : u ? 6 : 7, 16 - (l ? 1 : 0) - (r ? 1 : 0), 2);
  if (l) { g.fillStyle = '#28445C'; g.fillRect(2, u ? 2 : 0, 4, 16 - (u ? 2 : 0) - (d ? 4 : 0)); g.fillStyle = '#6C9CC0'; g.fillRect(3, u ? 3 : 1, 1, 3); }
  else { g.fillStyle = P[1]; g.fillRect(0, u ? 3 : 0, 16, 1); g.fillRect(4, 0, 1, 16); g.fillRect(11, 0, 1, 16); }
};
CS_THUMB_COL.v = '#D8D8D0';
// a palm in a big clay pot: cover that shells break, like a crate (the floor shows round the pot)
CS_TILE_BLOCK.p = '#';
CS_TILE_ART.p = (g, tx, ty, R) => {
  const P = CS_PAL.planter;
  g.fillStyle = 'rgba(40,24,8,0.3)'; g.fillRect(3, 4, 12, 12);
  g.fillStyle = P[1]; g.fillRect(3, 3, 10, 10); g.fillRect(2, 4, 12, 8); g.fillRect(4, 2, 8, 12);
  g.fillStyle = P[0]; g.fillRect(4, 4, 8, 8); g.fillRect(3, 5, 10, 6); g.fillRect(5, 3, 6, 10);
  g.fillStyle = P[2]; g.fillRect(5, 3, 5, 1); g.fillRect(3, 5, 1, 4);
  // the fronds, from the middle out (each palm turned its own way)
  const a0 = R() * Math.PI;
  for (let k = 0; k < 7; k++) {
    const a = a0 + k * 0.9, len = 5 + (k % 3);
    for (let s = 1; s <= len; s++) {
      g.fillStyle = s > len - 2 ? P[4] : P[3];
      g.fillRect(Math.round(7.5 + Math.cos(a) * s), Math.round(7.5 + Math.sin(a) * s), 1 + (s < 3 ? 1 : 0), 1);
    }
  }
  g.fillStyle = P[5]; g.fillRect(7, 7, 2, 2);
};
CS_THUMB_COL.p = '#4C8C3C';

// the floors: paving slabs outdoors, zellige mosaic on the sites, terracotta tiles in the houses
CS_FLOOR_ART.mpave = (g, x, y, tx, ty, P, r) => {
  // big flagstones, laid in courses, worn at the joints
  const o = ((tx * 7 + ty * 3) % 3) * 5 + 3;
  g.fillStyle = P[1]; g.fillRect(x, y + 15, 16, 1); g.fillRect(x + o, y, 1, 15);
  if ((tx + ty * 2) % 3 === 0) g.fillRect(x, y + 7, o, 1);
  g.fillStyle = P[2]; g.fillRect(x + o + 1, y, 3, 1);
  for (let n = 0; n < 5; n++) { g.fillStyle = P[1 + Math.floor(r() * 3)]; g.fillRect(x + Math.floor(r() * 16), y + Math.floor(r() * 16), 1, 1); }
};
CS_FLOOR_ART.mosaic = (g, x, y, tx, ty, P) => {
  // a star of blue-green tiles on cream, an ochre heart, terracotta in the corners, dark grout round it
  g.fillStyle = P[2]; g.fillRect(x, y, 16, 1); g.fillRect(x, y, 1, 16);
  g.fillStyle = P[1]; g.fillRect(x + 6, y + 3, 5, 11); g.fillRect(x + 3, y + 6, 11, 5);
  g.fillRect(x + 4, y + 4, 9, 9);
  g.fillStyle = P[0]; g.fillRect(x + 4, y + 4, 1, 1); g.fillRect(x + 12, y + 4, 1, 1); g.fillRect(x + 4, y + 12, 1, 1); g.fillRect(x + 12, y + 12, 1, 1);
  g.fillStyle = P[3]; g.fillRect(x + 7, y + 7, 3, 3);
  g.fillStyle = P[4]; g.fillRect(x + 1, y + 1, 2, 2); g.fillRect(x + 14, y + 1, 2, 2); g.fillRect(x + 1, y + 14, 2, 2); g.fillRect(x + 14, y + 14, 2, 2);
  g.fillStyle = P[2]; g.fillRect(x + 8, y + 5, 1, 1); g.fillRect(x + 8, y + 11, 1, 1); g.fillRect(x + 5, y + 8, 1, 1); g.fillRect(x + 11, y + 8, 1, 1);
};
CS_FLOOR_ART.mtile = (g, x, y, tx, ty, P, r) => {
  // square terracotta tiles, four to a tile, the odd one darker
  for (let k = 0; k < 4; k++) {
    const sx = x + (k & 1) * 8, sy = y + (k >> 1) * 8;
    if (r() < 0.15) { g.fillStyle = P[3]; g.fillRect(sx, sy, 8, 8); }
    g.fillStyle = P[2]; g.fillRect(sx + 1, sy + 1, 5, 1);
    g.fillStyle = P[1]; g.fillRect(sx, sy + 7, 8, 1); g.fillRect(sx + 7, sy, 1, 7);
  }
};

csAddMap('mirage', {
  name: 'MIRAGE', label: 'DE_MIRAGE',
  theme: { name: 'MIRAGE', ground: '#D4B48A', specks: ['#C4A27A', '#E2C49C'] },
  rows: [
  '#####################################################################',
  '#####......................########p......................###########',
  '#####.....................................................###########',
  '#####.....................................................###########',
  '#####......................................############...###......p#',
  '##############.....################........###......................#',
  '##p..vvv..............#############........###......................#',
  '##...vvv..............#############........###......................#',
  '#.....................#############........###......................#',
  '#.......x....xx.................####...#######p.....#########.......#',
  '#...............................####...#######......#########.......#',
  '#...............................####...#######......#########.......#',
  '#...............................####...#######......#########.......#',
  '#...........xx..................####...#######......#########.......#',
  '##..........xx..................####...#######......#########.......#',
  '##....................######....####...#######......#########.......#',
  '##....................######....####...#######......#########.......#',
  '##....................######....####...#######......#########.......#',
  '##....................######....####...#######......#########.......#',
  '##....................######....####...#######......#########.......#',
  '########...#www##.....######....####...#######......#########.......#',
  '######..........#.....#....#.........................########.......#',
  '######..........#.....#....w.........................########p......#',
  '######....aa....#.....#....w.....................xx..#########......#',
  '######....aa..........#....w.....................xx..#########......#',
  '######aa..............#....#.........................#########......#',
  '######aa..............#....#.........................#########......#',
  '######......aa..#.....#....#p........................#########......#',
  '#################.....#....#####....#................#########......#',
  '#################.....#...x#####....#.......x........#########......#',
  '#################.....#....#####....##########################......#',
  '#################.....#....#####....################................#',
  '#################.....#....#####....################................#',
  '#################.....#....#####....################................#',
  '#################.....#....#####....################................#',
  '#################.....#....#####....################................#',
  '#################.....#....##..p....######......####................#',
  '#################.....#.............######xx....####................#',
  '#################.....#.............######.x.............####....####',
  '#################........................................####....####',
  '#################........................................####....####',
  '###############...........p..............................####....####',
  '###############.......#########..........................####....####',
  '###############.......#########.................#############....####',
  '###########p..........#########.................#############....####',
  '###########...........#########................##############....####',
  '###########...........#########.xx.............##................####',
  '###########...........#########.xx......x......d#................####',
  '###########...........#########..................................####',
  '###############.......#########......................#...#.......####',
  '###############..................................................####',
  '##################...............................................####',
  '##################.......##............xxx.......................####',
  '##################.......##....................d#####################',
  '##################.............................######################',
  '##################............p######################################',
  '#####################################################################',
  ],

  // the spawns (and their buy zones) and the two bombsites, in tiles [x, y, w, h]
  zones: {
  T: [61, 11, 7, 11],
  CT: [11, 42, 11, 9],
  A: [34, 45, 8, 8],
  B: [7, 8, 8, 7],
  },
  starts: {
  T: { dir: 3, at: [[62, 13], [65, 13], [63, 16], [66, 16], [64, 19]] },
  CT: { dir: 1, at: [[16, 43], [19, 43], [17, 46], [20, 46], [18, 49]] },
  },
  // the floor: mosaic on the sites, terracotta tiles in the apartments, the palace, the market and the window room,
  // the underpass dark, the spawns' yards in slabs; paving everywhere else
  floors: [
  ['mosaic', 33, 44, 10, 10], ['mosaic', 6, 7, 10, 9],
  ['mtile', 5, 1, 53, 4], ['mtile', 35, 5, 8, 4], ['mtile', 47, 46, 18, 7], ['mtile', 6, 20, 10, 8], ['mtile', 23, 21, 4, 15],
  ['tunnel', 36, 9, 3, 12],
  ['stone', 61, 4, 7, 19], ['stone', 11, 41, 11, 10],
  ['mpave', 0, 0, 69, 57],
  ],
  // call-outs (tiles)
  spots: {
  tSpawn: [64, 16], tApps: [50, 2], appsStairs: [38, 5], bApps: [22, 3], balcony: [16, 7], van: [4, 9], bench: [3, 12], bSite: [11, 11],
  bShort: [25, 13], short: [29, 17], kitchen: [9, 18], market: [8, 25], arches: [19, 24], underpass: [37, 14],
  topMid: [48, 13], mid: [40, 24], window: [24, 23], ladderRoom: [24, 31], connector: [33, 31], jungle: [27, 39],
  stairs: [33, 41], sandwich: [35, 43], aSite: [37, 47], firebox: [32, 49], triple: [40, 54], tetris: [45, 38], ninja: [45, 54],
  aRamp: [50, 40], tRamp: [56, 34], palaceAlley: [62, 41], palace: [56, 47], palaceExit: [45, 49],
  ctSpawn: [18, 46], ticket: [23, 51], ct: [29, 52],
  },
  // the minimap: paving, the sites' mosaic
  mini: { floor: [212, 180, 138], site: [120, 178, 168] },
  // the look: sandy paving, a blue-green mosaic, terracotta tiles, ochre plaster walls with terracotta faces, flat
  // roofs further off, blue-green doors, the stalls' awnings, the van, the palms
  pal: {
    mpave: ['#D4B48A', '#C4A27A', '#E2C49C', '#B8946A'],
    mosaic: ['#E8DCC0', '#6AAAA2', '#B8A888', '#D8A860', '#C08060'],
    mtile: ['#B87048', '#9C5A3A', '#C88460', '#A66242'],
    tunnel: ['#6C5A44', '#5A4A38', '#7C6A50', '#463626'],
    stone: ['#D8C8A8', '#C4B490', '#E8D8B8', '#AC9C7C'],
    roof: ['#E4BC88', '#CCA070', '#F4D4A4', '#B08458'], face: ['#B0603A', '#8C4628', '#C8784C'], deep: ['#9C7C5C', '#8A6A4C', '#AC8C6A'],
    crate: ['#AC7840', '#805424', '#4C3010', '#CC9C5C'], door: ['#2C8C8C', '#1C6C70', '#0C4448', '#58B8B0'],
    planter: ['#B4643C', '#7C3C1C', '#D08458', '#3C8C34', '#74B44C', '#2C4C1C'],
    awning: ['#2C9C94', '#F0E0C0', '#C0402C', '#1C6460'], van: ['#ECECE4', '#B4B4AC', '#3C74A8', '#2C2C2C'],
  },
  // the bots (csbots.js): the terrorists' ways in (by the ramp, the palace or the connector to A; by the apartments,
  // short or the underpass to B), where they hold round a planted bomb (looking at the CTs' ways back in), where the CTs
  // rotate to, their posts (an anchor off each site, the window, the jungle) and where each looks out from now and then
  bots: {
    routes: {
      ramp: { site: 'A', path: ['tRamp', 'aRamp'], stage: 'aRamp', go: ['tetris', 'aSite'] },
      palace: { site: 'A', path: ['tRamp', 'palaceAlley', 'palace'], stage: 'palace', go: ['palaceExit', 'aSite'] },
      connector: { site: 'A', path: ['topMid', 'mid', 'connector'], stage: 'connector', go: ['jungle', 'stairs', 'aSite'] },
      apps: { site: 'B', path: ['tApps', 'appsStairs', 'bApps'], stage: 'bApps', go: ['balcony', 'bSite'] },
      short: { site: 'B', path: ['topMid', 'mid', 'short'], stage: 'short', go: ['bShort', 'bSite'] },
      underpass: { site: 'B', path: ['topMid', 'mid', 'underpass', 'appsStairs', 'bApps'], stage: 'bApps', go: ['balcony', 'bSite'] },
    },
    post: { A: ['firebox', 'triple', 'stairs', 'tetris'], B: ['bShort', 'van', 'kitchen', 'bench'] },
    rot: { A: ['ct', 'jungle', 'ticket'], B: ['arches', 'market', 'kitchen'] },
    ct: [['ticket', 1], ['market', 0], ['window', 1], ['jungle', 1], ['bench', 1]],
    peek: { ticket: 'firebox', market: 'kitchen', window: 'mid', jungle: 'connector', bench: 'bSite' },
    ways: { A: ['ramp', 'palace', 'ramp', 'connector', 'palace'], B: ['apps', 'apps', 'short', 'apps', 'underpass'] },
  },
});
