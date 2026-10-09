'use strict';
// =====================================================================
//  COUNTER-STRIKE's map: DE_DUST2, seen from above, a tile to a character (64 x 60 tiles of 16 px).
//  The classic layout: T spawn in the south; LONG A up the east side (outside long, the long doors, the pit, long A,
//  the ramp and the car) to bombsite A in the north east (the goose corner behind its boxes); MID up the middle
//  (top mid, the xbox, the mid doors to CT mid) with the CATWALK (A short) climbing from mid into A; the B TUNNELS
//  up the west side (outside, upper and lower tunnels, the lower ones coming out in mid) to bombsite B in the north
//  west (back plat, the boxes, the B doors and the window towards CT); CT spawn between the two sites.
//    #  sandstone wall: nothing breaks it (the stage's hardSteel), it blocks shells and sight
//    .  floor (sand outdoors, stone on the sites, boards in the tunnels: see CS_FLOORS)
//    x  wooden crate: cover that shells break bit by bit (brick underneath)
//    d  a wooden door leaf beside a doorway (brick too)
//    w  a window: tanks can't get through, shells and sight can (water underneath, drawn as glass and bars)
// =====================================================================

const CS_MAP = [
  '################################################################',
  '################################################################',
  '##...................######.............##..................####',
  '##...................######........x........................####',
  '##...................###......................xx..........x...##',
  '##..........xx.......d....................................xx..##',
  '##..........xx...............xx..................xx...........##',
  '#####...............................x............x............##',
  '##...................d..................##....................##',
  '##...................###................#####...........x.....##',
  '##.xx................###.............########.................##',
  '##...............xx..#...............########........x........##',
  '####..............x..w...............####.....................##',
  '####..........x......w...............#........................##',
  '##.....x.............#...............#...############........###',
  '##.............###########...........#...############........###',
  '##.............################d..d###...############.xx.....###',
  '##.............################....###...############........###',
  '#########....#################......##...############........###',
  '#########....#################......##...############........###',
  '#########....#################......##...############........###',
  '#########....#################...........############........###',
  '#########....#################...x.......############........###',
  '#########....#################...........############........###',
  '#########....#################......#################........###',
  '#########....#################......#################........###',
  '#########....########...............#################.x......###',
  '#########....########...............#################........###',
  '#########....########...............#################........###',
  '#########....########....#####......#################........###',
  '#########....########....#####......#################........###',
  '#########....########....#####......###########..............###',
  '#########....########....#####......###########..............###',
  '#########....########....#####......###########..............###',
  '#########....########....#####......###########..............###',
  '########.................###..........#########..............###',
  '########.................###.x........#########........xx....###',
  '########.................###..........#########..............###',
  '########.....###############........x.#########..............###',
  '########.....###############..........#########..............###',
  '########.....##################.....###########..............###',
  '########.....##################.....############d..d#####....###',
  '########.....##################.....############....#####....###',
  '########.....##################.....#########.........###....###',
  '########.....##################.....#########.........###....###',
  '########.....##################.....#########.........###....###',
  '########.....##################.....#########....x....###..x.###',
  '########.....##################.....#########.........###....###',
  '########.....##########.....................#.........##########',
  '########.....##########...................x.#.........##########',
  '########.........................x..........#.........##########',
  '########..............................##..............##########',
  '########........x..........##.........##..............##########',
  '########...................##....................###############',
  '########.........................................###############',
  '#######################.x........................###############',
  '#######################.....................####################',
  '#######################.....................####################',
  '################################################################',
  '################################################################',
];
const CS_W = CS_MAP[0].length, CS_H = CS_MAP.length;

// places on the map, in tiles [x, y, w, h]: the spawns (and their buy zones) and the two bombsites
const CS_ZONES = {
  T: [23, 48, 21, 10],
  CT: [24, 2, 16, 8],
  A: [45, 3, 14, 10],
  B: [3, 3, 15, 12],
};
// where each side's five tanks start (tiles), and which way they face
const CS_STARTS = {
  T: { dir: 0, at: [[30, 50], [33, 52], [36, 50], [30, 55], [36, 55]] },
  CT: { dir: 2, at: [[26, 4], [33, 3], [37, 4], [27, 7], [34, 8]] },
};
// the floor: boards in the tunnels and the window room (indoors, darker), stone slabs on the sites; sand elsewhere
const CS_FLOORS = [
  ['tunnel', 8, 19, 5, 30], ['tunnel', 13, 35, 9, 3], ['tunnel', 21, 26, 4, 12], ['tunnel', 25, 26, 5, 3], ['tunnel', 22, 11, 4, 4],
  ['stone', 42, 2, 20, 12], ['stone', 2, 2, 19, 16],
];
// call-outs (tiles): where the bots go, hold and look
const CS_SPOTS = {
  tSpawn: [33, 50], outsideLong: [48, 47], longDoors: [49, 41], long: [54, 34], pit: [58, 44], longA: [56, 24], aCar: [57, 17],
  aRamp: [57, 13], aSite: [51, 8], aPlat: [47, 6], goose: [58, 6], aShort: [41, 13], catwalk: [39, 18], catBottom: [37, 22], xbox: [33, 24],
  midTop: [32, 30], topMid: [32, 37], tRamp: [33, 43], midDoors: [32, 17], ctMid: [31, 12], ctSpawn: [32, 5], ctRamp: [40, 5],
  bDoors: [22, 7], bWindow: [24, 13], bSite: [9, 11], backPlat: [4, 4], bCar: [16, 6], bTunnels: [10, 19], bTunnelsIn: [10, 26],
  upperTunnels: [10, 40], tunnelJunction: [10, 36], lowerTunnels: [22, 31], lowerMid: [27, 27], outsideTunnels: [15, 52],
};

// the map as a block map for Stage.load (2 x 2 blocks a tile)
function csMapBlocks() {
  const BL = { '#': '@', '.': '.', x: '#', d: '#', w: '~' }, out = [];
  for (const row of CS_MAP) {
    let r = '';
    for (const ch of row) r += (BL[ch] || '.').repeat(2);
    out.push(r, r);
  }
  return out;
}
const csTile = (tx, ty) => (tx < 0 || ty < 0 || tx >= CS_W || ty >= CS_H ? '#' : CS_MAP[ty][tx]);
const csInZone = (z, px, py) => { const [x, y, w, h] = CS_ZONES[z]; return px >= x * 16 && py >= y * 16 && px < (x + w) * 16 && py < (y + h) * 16; };
function csFloorOf(tx, ty) {
  for (const [k, x, y, w, h] of CS_FLOORS) if (tx >= x && ty >= y && tx < x + w && ty < y + h) return k;
  return 'sand';
}

// the look: the season's slot for it (no twist, no weather of its own)
THEMES.dust = { name: 'DUST 2', ground: '#B08C58', specks: ['#A07C48', '#C09C68'] };
const CS_PAL = {
  sand: ['#B8925A', '#A8824C', '#C8A46C', '#9C7840'], stone: ['#C4AC80', '#B09870', '#D4BC90', '#9C8460'], tunnel: ['#5C4830', '#4C3C28', '#6C5638', '#3C2C1C'],
  roof: ['#E2C896', '#D0B07A', '#F2DCAC', '#B89058'], face: ['#8C6434', '#74502A', '#A07848'], deep: ['#9C7A4C', '#8C6A40', '#A88658'],
  crate: ['#B87C34', '#8C5820', '#5C3810', '#D8A458'], door: ['#4C7488', '#36586C', '#203848', '#6C94A8'],
};

Object.assign(Stage.prototype, {
  // the ground, drawn once: sand, stone and boards, the shadows the walls throw, the painted bombsite letters
  csGround() {
    if (this.ground && this.groundFor === 'cs' && this.ground.width === FW) return this.ground;
    const c = makeCanvas(FW, FH), g = c.getContext('2d'), r = seeded(2002);
    for (let ty = 0; ty < CS_H; ty++) for (let tx = 0; tx < CS_W; tx++) {
      const k = csFloorOf(tx, ty), P = CS_PAL[k], x = tx * 16, y = ty * 16;
      g.fillStyle = P[0]; g.fillRect(x, y, 16, 16);
      if (k === 'stone') {
        // big slabs, worn at the joints
        g.fillStyle = P[1]; g.fillRect(x, y + 15, 16, 1); g.fillRect(x + ((ty & 1) ? 0 : 8), y, 1, 15);
        g.fillStyle = P[2]; g.fillRect(x + 1, y + 1, 5, 1);
      } else if (k === 'tunnel') {
        // floor boards along the tunnel
        g.fillStyle = P[1]; for (let k2 = 3; k2 < 16; k2 += 4) g.fillRect(x, y + k2, 16, 1);
        g.fillStyle = P[3]; g.fillRect(x + ((tx * 7 + ty * 3) % 12), y + 1 + ((tx + ty) % 3) * 4, 1, 2);
      }
      for (let n = 0; n < (k === 'sand' ? 7 : 3); n++) { g.fillStyle = P[1 + Math.floor(r() * 3)]; g.fillRect(x + Math.floor(r() * 16), y + Math.floor(r() * 16), 1 + (r() < 0.3 ? 1 : 0), 1); }
    }
    // shadows: the walls throw them down and to the right
    g.fillStyle = 'rgba(40,24,8,0.32)';
    for (let ty = 0; ty < CS_H; ty++) for (let tx = 0; tx < CS_W; tx++) {
      if (csTile(tx, ty) === '#') continue;
      const x = tx * 16, y = ty * 16;
      if (csTile(tx, ty - 1) === '#') g.fillRect(x, y, 16, 4);
      if (csTile(tx - 1, ty) === '#') g.fillRect(x, y + (csTile(tx, ty - 1) === '#' ? 4 : 0), 3, 16 - (csTile(tx, ty - 1) === '#' ? 4 : 0));
    }
    // the bombsites: a dashed frame and a big sprayed letter
    for (const s of ['A', 'B']) {
      const [x, y, w, h] = CS_ZONES[s].map(v => v * 16);
      g.fillStyle = 'rgba(200,56,24,0.55)';
      for (let k = 0; k < w; k += 8) { g.fillRect(x + k, y, 4, 1); g.fillRect(x + k, y + h - 1, 4, 1); }
      for (let k = 0; k < h; k += 8) { g.fillRect(x, y + k, 1, 4); g.fillRect(x + w - 1, y + k, 1, 4); }
      g.globalAlpha = 0.6;
      const cx = x + w / 2, cy = y + h / 2, sc = 4;
      Font.big(g, s, Math.round(cx - 3 * sc), Math.round(cy - 3.5 * sc), sc, '#C03818');
      g.globalAlpha = 1;
    }
    // the spawns: a faint stencil
    for (const s of ['T', 'CT']) {
      const [x, y, w, h] = CS_ZONES[s].map(v => v * 16);
      g.globalAlpha = 0.35;
      Font.big(g, s, Math.round(x + w / 2 - (s.length * 8 - 2)), Math.round(y + h / 2 - 7), 2, s === 'T' ? '#7C3810' : '#1C3C7C');
      g.globalAlpha = 1;
    }
    this.ground = c; this.groundFor = 'cs';
    return c;
  },

  // one tile's picture: a wall (shaded by what's round it), a crate, a door leaf or a window
  csTileArt(tx, ty) {
    const ch = csTile(tx, ty), c = makeCanvas(16, 16), g = c.getContext('2d'), wall = (x, y) => csTile(x, y) === '#';
    const R = seeded(tx * 131 + ty * 977 + 5);
    if (ch === '#') {
      // far from any floor: the flat roofs of the town; next to one: sandstone blocks, a face on the south side
      let near = false;
      for (let y = ty - 1; y <= ty + 1; y++) for (let x = tx - 1; x <= tx + 1; x++) if (!wall(x, y)) near = true;
      const P = near ? CS_PAL.roof : CS_PAL.deep;
      g.fillStyle = P[0]; g.fillRect(0, 0, 16, 16);
      g.fillStyle = P[1];
      if (near) { g.fillRect(0, 7, 16, 1); g.fillRect(0, 15, 16, 1); g.fillRect((ty & 1) ? 4 : 11, 0, 1, 7); g.fillRect((ty & 1) ? 11 : 4, 8, 1, 7); }
      else { for (let k = 0; k < 16; k += 4) g.fillRect(0, k + 3, 16, 1); }
      for (let n = 0; n < 6; n++) { g.fillStyle = P[1 + Math.floor(R() * 3)]; g.fillRect(Math.floor(R() * 16), Math.floor(R() * 16), 1, 1); }
      if (near) {
        if (!wall(tx, ty - 1)) { g.fillStyle = CS_PAL.roof[2]; g.fillRect(0, 0, 16, 1); }
        if (!wall(tx - 1, ty)) { g.fillStyle = CS_PAL.roof[2]; g.fillRect(0, 0, 1, 16); }
        if (!wall(tx + 1, ty)) { g.fillStyle = CS_PAL.face[1]; g.fillRect(15, 0, 1, 16); }
        if (!wall(tx, ty + 1)) {
          // the wall's face, seen a little from the south
          g.fillStyle = CS_PAL.face[0]; g.fillRect(0, 11, 16, 5);
          g.fillStyle = CS_PAL.face[1]; g.fillRect(0, 15, 16, 1); g.fillRect((tx & 1) ? 5 : 12, 11, 1, 4);
          g.fillStyle = CS_PAL.face[2]; g.fillRect(0, 11, 16, 1);
        }
      }
    } else if (ch === 'x') {
      const P = CS_PAL.crate;
      g.fillStyle = P[2]; g.fillRect(0, 0, 16, 16);
      g.fillStyle = P[0]; g.fillRect(1, 1, 14, 14);
      g.fillStyle = P[1]; for (let k = 4; k < 15; k += 4) g.fillRect(1, k, 14, 1);
      g.fillStyle = P[2];
      for (let k = 1; k < 15; k++) { g.fillRect(k, k, 1, 1); g.fillRect(15 - k, k, 1, 1); }
      g.fillStyle = P[3]; g.fillRect(1, 1, 14, 1); g.fillRect(1, 1, 1, 14);
      g.fillStyle = P[2]; g.fillRect(0, 0, 2, 2); g.fillRect(14, 0, 2, 2); g.fillRect(0, 14, 2, 2); g.fillRect(14, 14, 2, 2);
    } else if (ch === 'd') {
      // a door leaf, planks up and down, faded blue paint
      const P = CS_PAL.door;
      g.fillStyle = P[2]; g.fillRect(0, 0, 16, 16);
      g.fillStyle = P[0]; g.fillRect(1, 1, 14, 14);
      g.fillStyle = P[1]; for (let k = 4; k < 15; k += 4) g.fillRect(k, 1, 1, 14);
      g.fillStyle = P[3]; g.fillRect(1, 1, 14, 1);
      g.fillStyle = '#2C2C2C'; g.fillRect(2, 4, 12, 1); g.fillRect(2, 11, 12, 1);
    } else if (ch === 'w') {
      // a window: dark glass behind iron bars
      g.fillStyle = CS_PAL.roof[1]; g.fillRect(0, 0, 16, 16);
      g.fillStyle = '#1C2C38'; g.fillRect(3, 1, 10, 14);
      g.fillStyle = '#3C5C74'; g.fillRect(4, 2, 3, 2);
      g.fillStyle = '#7C7C7C'; for (let k = 3; k < 14; k += 3) g.fillRect(k, 1, 1, 14);
    }
    return c;
  },

  // the walls, crates, doors and windows (this.bgLayer); what a shell breaks off is cleared cell by cell (redrawCells)
  csBuildLayers() {
    if (!this.bgLayer || this.bgLayer.width !== FW || this.bgLayer.height !== FH) { this.bgLayer = makeCanvas(FW, FH); this.forestLayer = makeCanvas(FW, FH); }
    const bg = this.bgLayer.getContext('2d');
    bg.clearRect(0, 0, FW, FH); this.forestLayer.getContext('2d').clearRect(0, 0, FW, FH);
    this.waterCells = []; this.beltCells = [];
    this.bioL = { lava: [], vent: [], gas: [], lamp: [], bog: [] };
    const art = new Map();
    for (let cy = 0; cy < GH; cy++) for (let cx = 0; cx < GW; cx++) {
      const t = this.terrain[cy * GW + cx];
      if (t !== T_STEEL && t !== T_BRICK && t !== T_WATER) continue;
      const tx = cx >> 2, ty = cy >> 2, k = ty * CS_W + tx;
      if (!art.has(k)) art.set(k, this.csTileArt(tx, ty));
      bg.drawImage(art.get(k), (cx & 3) * 4, (cy & 3) * 4, 4, 4, cx * 4, cy * 4, 4, 4);
    }
    this.dirty = false;
    this.dirtyCells = [];
    this.layerOf = this.terrain.slice();
  },
});

(() => {
  const P = Stage.prototype;
  const ground = P.groundLayer;
  P.groundLayer = function () { return this.cs ? this.csGround() : ground.call(this); };
  const build = P.buildLayers;
  P.buildLayers = function () { if (this.cs) this.csBuildLayers(); else build.call(this); };
})();
