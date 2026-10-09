'use strict';
// =====================================================================
//  MAZE, the world: what makes each labyrinth its own (maze.js keeps the patrols, reinforcements and the exit).
//    KEYS AND GATES  red, blue and yellow gates block the way; each key lies deeper in, behind the gate before it.
//                    Keys belong to the whole team and open every gate of their colour
//    POWER CELLS     the exit stays sealed until the team has 3 (a lair's also until its beast is dead)
//    RIVERS          some mazes are cut in two by water; a BRIDGE crate on your side lays one bridge
//    PLATES, DOORS   stand on a plate and a steel door somewhere else opens for 20 s
//    MOVING WALLS    every 15 s a wall slides or turns, opening one way and closing another (never onto a tank)
//    CRACKED FLOOR   gives way behind you once you've driven over it
//    BELTS, PADS     conveyor corridors and teleporter pairs: shortcuts, or a ride into a dead end
//    DARKNESS        your lamp lights the way; what you've seen stays dim; some parts stay pitch black but for torches
//    LAMP FUEL       your lamp shrinks slowly; fuel cans refill it
//    MAP             the minimap shows only what you've seen; up to 5 markers (Q / E, see README); a map scroll
//                    shows the whole maze for 15 s
//    COLLAPSE        once every key and cell is in hand the maze caves in behind you: a clock runs to the exit
//    STARS           par times for 1-3 stars; the best per maze is kept
//    TREASURE        rooms behind bricks, gates and plate doors; a sealed vault; a secret exit that skips a maze
//    THEMES          mazes 1-4 stone dungeon, 5-9 sewers, 10-14 ice caverns, 15+ the machine; every 5th is a lair
//  The world is generated so the maze can always be solved; mazeSolve checks every one before it's used.
// =====================================================================

const MZ_KEYS = ['red', 'blue', 'yellow'];
const MZ_KEY_COL = { red: ['#F83800', '#A80000', '#FCA044'], blue: ['#3C7CFC', '#0028A8', '#B8D8F8'], yellow: ['#F8D800', '#A87C00', '#FCFCA8'] };
const MZ_PLATE_COL = ['#58F898', '#F878F8', '#F89838'];
const MZ_CELLS = 3;                      // power cells to unseal the exit
const MZ_DOOR_TIME = 20 * 60;            // a plate holds its door open this long after you leave it
const MZ_MOVE_EVERY = 15 * 60, MZ_WARN = 120;   // moving walls: how often, and how long they rumble first
const MZ_FUEL_TIME = 200 * 60;           // a full lamp burns down in this long
const MZ_LAMP = [22, 46];                // lamp radius (px): at empty, plus this much at full
const MZ_SCROLL_TIME = 15 * 60;
const MZ_KEY_BACK = 45 * 60;             // a stolen key that nobody drops comes back where it lay after this long
const MZ_MARKS = 5;
// edge kinds of the generated maze (a wall slot between two cells)
const E_WALL = 0, E_OPEN = 1, E_BRICK = 2, E_GATE = 3, E_DOOR = 4, E_SECRET = 5, E_MOVER = 6, E_WATER = 7, E_VAULT = 8, E_CROSS = 9;

const mazeThemeOf = n => (n <= 4 ? 'dungeon' : n <= 9 ? 'sewer' : n <= 14 ? 'ice' : 'machine');
const mazeIsLair = n => n > 0 && n % 5 === 0;

// maze size (cells) for stage n: as maze.js has it, a lair a good deal smaller (but still 1.5 screens either way)
function mazeDims(n, vc, vr) {
  const [w, h] = mazeCells(n, vc, vr);
  if (!mazeIsLair(n)) return [w, h];
  return [Math.max(Math.ceil(vc * 1.5 / MAZE_PITCH), 12, Math.round(w * 0.72)), Math.max(Math.ceil(vr * 1.5 / MAZE_PITCH), 9, Math.round(h * 0.72))];
}

// ------------------------------------------------------------ the look of each depth (seasons.js's THEMES)
function mzPaintFloor(x, r, kind) {
  const W = FW, H = FH;
  for (let ty = 0; ty < H / 16; ty++) for (let tx = 0; tx < W / 16; tx++) {
    const X = tx * 16, Y = ty * 16, v = r();
    if (kind === 'dungeon') {   // flagstones
      x.fillStyle = v < 0.3 ? '#1E1A15' : v < 0.6 ? '#1A1612' : '#17140F'; x.fillRect(X + 1, Y + 1, 15, 15);
      x.fillStyle = '#0C0A08'; x.fillRect(X, Y, 16, 1); x.fillRect(X, Y, 1, 16);
      if (v < 0.12) { x.fillStyle = '#100E0B'; x.fillRect(X + 3 + (v * 80 | 0) % 8, Y + 5, 4, 1); x.fillRect(X + 6, Y + 6, 1, 3); }
    } else if (kind === 'sewer') {   // slimy setts, puddles, grime
      x.fillStyle = v < 0.5 ? '#141C12' : '#121A10'; x.fillRect(X, Y, 16, 16);
      x.fillStyle = '#0A0F09'; x.fillRect(X, Y + 7, 16, 1); x.fillRect(X + ((ty & 1) ? 4 : 11), Y, 1, 7); x.fillRect(X + ((ty & 1) ? 11 : 4), Y + 8, 1, 8);
      if (v < 0.1) { x.fillStyle = '#1C3448'; x.fillRect(X + 3, Y + 10, 6, 2); x.fillStyle = '#2C4C64'; x.fillRect(X + 4, Y + 10, 2, 1); }
      else if (v < 0.2) { x.fillStyle = '#24341C'; x.fillRect(X + 9, Y + 2, 3, 2); }
    } else if (kind === 'ice') {   // packed snow and blue ice
      x.fillStyle = v < 0.5 ? '#25364C' : '#22324A'; x.fillRect(X, Y, 16, 16);
      x.fillStyle = '#30486A'; for (let k = 0; k < 4; k++) x.fillRect(X + ((v * 97 + k * 5) | 0) % 14, Y + k * 4 + 1, 2, 1);
      if (v < 0.15) { x.fillStyle = '#4C6C90'; x.fillRect(X + 2, Y + 3, 1, 1); x.fillRect(X + 11, Y + 12, 1, 1); }
    } else {   // the machine: deck plates, bolts, grates
      x.fillStyle = '#18181E'; x.fillRect(X, Y, 16, 16);
      x.fillStyle = '#22222A'; x.fillRect(X + 1, Y + 1, 14, 14);
      x.fillStyle = '#0E0E12'; x.fillRect(X, Y, 16, 1); x.fillRect(X, Y, 1, 16);
      x.fillStyle = '#34343E'; x.fillRect(X + 2, Y + 2, 1, 1); x.fillRect(X + 13, Y + 2, 1, 1); x.fillRect(X + 2, Y + 13, 1, 1); x.fillRect(X + 13, Y + 13, 1, 1);
      if (v < 0.12) { x.fillStyle = '#101014'; for (let k = 0; k < 4; k++) x.fillRect(X + 4, Y + 4 + k * 2, 8, 1); }
    }
  }
}
Object.assign(THEMES, {
  mzdungeon: {
    name: 'STONE DUNGEON', color: '#BCB4A8', ground: '#17140F', paint: (x, r) => mzPaintFloor(x, r, 'dungeon'),
    tex: {
      steel: { rows: ['HHLLLLMK', 'HLLLLMMK', 'LLLMMMDK', 'KKKKKKKK', 'LMKHHLLL', 'MMKHLLLM', 'MDKLLMMD', 'KKKKKKKK'], colors: { H: '#BCB4A8', L: '#968E82', M: '#766E64', D: '#544C44', K: '#2A2620' } },
      brick: { colors: { R: '#8C3C20', H: '#B8643C', D: '#4C1C0C', M: '#3C3430' } },
      forest: { colors: { g: '#8C8C7C', G: '#3C3C34' }, rows: ['g.g..g.g', '.gGgggG.', 'gG.g.gGg', '.gggGgg.', 'gGg.g.Gg', '.gGgggG.', 'g.gGg.g.', '..g..g.g'] },
      water0: { colors: { b: '#1C2C5C', w: '#5C7CB8' } }, water1: { colors: { b: '#1C2C5C', w: '#5C7CB8' } },
    },
    particles: { kind: 'drift', n: 10, colors: ['#4C463E', '#6C6458'], w: 1, h: 1, fall: [0.04, 0.12], sway: 0.5 },
  },
  mzsewer: {
    name: 'THE SEWERS', color: '#7CB860', ground: '#131B11', paint: (x, r) => mzPaintFloor(x, r, 'sewer'),
    tex: {
      steel: { rows: ['HLLLLLMK', 'LLGLLMMK', 'MMMMMMDK', 'KKKKKKKK', 'LLKHLLLL', 'GMKLLGLM', 'DGKMMMGD', 'KGKKKGKK'], colors: { H: '#A4AC90', L: '#7C8468', M: '#5C6448', D: '#3C4430', K: '#1A1E12', G: '#4C8C24' } },
      brick: { colors: { R: '#6C4C2C', H: '#8C6C44', D: '#3C2814', M: '#2C3020' } },
      forest: { colors: { g: '#7CC03C', G: '#2C5C14' }, rows: ['.g..g...', '.g..g.g.', '.gg.g.g.', 'Gg.gg.g.', '.g.Gg.gg', '.gG.gGg.', 'GgG.Gg.G', '.G..G..G'] },
      water0: { colors: { b: '#244C34', w: '#6CA87C' } }, water1: { colors: { b: '#244C34', w: '#6CA87C' } },
    },
    particles: { kind: 'drift', n: 14, colors: ['#5C8CA8', '#3C6C88'], w: 1, h: 2, fall: [1.2, 2], sway: 0 },
  },
  mzice: {
    name: 'ICE CAVERNS', color: '#B8E0F8', ground: '#22324A', paint: (x, r) => mzPaintFloor(x, r, 'ice'), snowCaps: '#F8FCFF',
    tex: {
      steel: { rows: ['WWHHHHHD', 'WHHHHHHD', 'HHLHHHHD', 'HHHLHHHD', 'HHHHLHHD', 'HHHHHHHD', 'HHHHHHDD', 'DDDDDDDD'], colors: { W: '#F8FCFF', H: '#A8D4F0', L: '#DCF0FC', D: '#4C88B8' } },
      brick: { colors: { R: '#7C98B8', H: '#B8D0E8', D: '#3C5878', M: '#DCECF8' } },
      forest: { colors: { g: '#E0F0F8', G: '#5C94B8' } },
      ice: { colors: { W: '#F8FCFF', G: '#C8E4F8', D: '#7CB4E0' } },
      water0: { colors: { b: '#1C4C98', w: '#A8D8F8' } }, water1: { colors: { b: '#1C4C98', w: '#A8D8F8' } },
    },
    particles: { kind: 'drift', n: 24, colors: ['#FFFFFF', '#C8E0F8'], w: 1, h: 1, fall: [0.15, 0.4], sway: 0.6 },
  },
  mzmachine: {
    name: 'THE MACHINE', color: '#F8B800', ground: '#18181E', paint: (x, r) => mzPaintFloor(x, r, 'machine'),
    tex: {
      steel: { rows: ['DGGGGGGD', 'GRWWWWRD', 'GWWWWWWD', 'GWWYYWWD', 'GWWYYWWD', 'GWWWWWWD', 'GRWWWWRD', 'DDDDDDDD'], colors: { D: '#2C2C34', G: '#7C8090', W: '#A4A8B4', R: '#1C1C24', Y: '#8C8C98' } },
      brick: { rows: ['RRRRRRRM', 'RHHRRHHM', 'RHHRRHHM', 'MMMMMMMM', 'RRRMRRRR', 'HHRMRHHR', 'HHRMRHHR', 'MMMMMMMM'], colors: { R: '#9C5424', H: '#C87C3C', D: '#5C2C10', M: '#2C2C34' } },
      forest: { colors: { g: '#C8A030', G: '#3C3C44' }, rows: ['gG.gG.gG', 'GgGGgGGg', '.G..G..G', 'gG.gG.gG', 'GgGGgGGg', '.G..G..G', 'gG.gG.gG', 'GgGGgGGg'] },
      water0: { colors: { b: '#2C2C5C', w: '#7C7CB8' } }, water1: { colors: { b: '#2C2C5C', w: '#7C7CB8' } },
    },
    particles: { kind: 'firefly', n: 8, colors: ['#F8B800', '#F87800'], w: 1, h: 1 },
  },
});
const mzThemeKey = n => 'mz' + mazeThemeOf(n);

// ------------------------------------------------------------ the generator
// mazeWorld(n, MW, MH): the maze for stage n, MW x MH cells, with everything in it. Tries again (and in the end
// leaves features out) until mazeSolve finds the way through in every state the moving walls can be in.
function mazeWorld(n, MW, MH, rand = Math.random) {
  for (let k = 0; k < 14; k++) {
    const w = mzGen(n, MW, MH, rand, k >= 10);
    if (w && mzWorldOk(w)) return w;
  }
  return mzGen(n, MW, MH, rand, 'plain');
}

// solvable with the moving walls in every position (all of them when there are few, a good sample otherwise)
function mzWorldOk(w) {
  const m = w.movers.length, states = [];
  if (m <= 6) for (let s = 0; s < (1 << m); s++) states.push(w.movers.map((_, k) => (s >> k) & 1));
  else { states.push(w.movers.map(() => 0), w.movers.map(() => 1)); for (let k = 0; k < 40; k++) states.push(w.movers.map(() => Math.random() < 0.5 ? 1 : 0)); }
  return states.every(s => mazeSolve(w, s).ok);
}

function mzGen(n, MW, MH, rand, plain) {
  const N = MW * MH, at = (i, j) => j * MW + i, I = c => c % MW, J = c => (c / MW) | 0;
  const theme = mazeThemeOf(n), lair = mazeIsLair(n), rnd = k => Math.floor(rand() * k);
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const kind = new Uint8Array(N), et = new Uint8Array(N * 2);   // cells: 0 maze, 1 river, 2 vault, 3 arena; edges: E_*
  const nbr = (c, k) => { const i = I(c), j = J(c); return k === 0 ? (j > 0 ? c - MW : -1) : k === 1 ? (i < MW - 1 ? c + 1 : -1) : k === 2 ? (j < MH - 1 ? c + MW : -1) : (i > 0 ? c - 1 : -1); };
  const edge = (c, k) => (k === 0 ? (c - MW) * 2 + 1 : k === 1 ? c * 2 : k === 2 ? c * 2 + 1 : (c - 1) * 2);
  const ends = e => { const a = e >> 1; return [a, e & 1 ? a + MW : a + 1]; };
  const start = at(0, MH - 1);
  // rivers: a whole row of cells turns to water (the lower one is crossed first)
  const rivers = [];
  if (!lair && !plain && MH >= 9 && (theme === 'sewer' || (n >= 3 && rand() < 0.3))) {
    const rows = theme === 'sewer' && MH >= 15 && rand() < 0.6 ? [Math.round(MH * 2 / 3), Math.round(MH / 3)] : [Math.floor(MH / 2) - rnd(2)];
    for (const row of rows) { rivers.push({ row }); for (let i = 0; i < MW; i++) kind[at(i, row)] = 1; }
  }
  // a lair's arena in the middle
  let arena = null;
  if (lair) {
    const w = MW >= 20 ? 5 : 4, h = MH >= 14 ? 4 : 3;
    arena = { i: (MW - w) >> 1, j: (MH - h) >> 1, w, h };
    for (let j = arena.j; j < arena.j + h; j++) for (let i = arena.i; i < arena.i + w; i++) kind[at(i, j)] = 3;
  }
  // a vault: 2 x 2 cells walled in, that a minotaur's death opens
  let vault = null;
  if (!lair && !plain && n >= 3 && rand() < 0.55) {
    for (let t = 0; t < 40 && !vault; t++) {
      const i = 1 + rnd(MW - 3), j = 1 + rnd(MH - 3);
      if (i + j < 5 || (MH - 1 - j) + i < 5) continue;
      let ok = true;
      for (let y = j - 1; y <= j + 2; y++) for (let x = i; x <= i + 1; x++) if (kind[at(x, y)]) ok = false;
      if (!ok) continue;
      vault = { i, j, cells: [at(i, j), at(i + 1, j), at(i, j + 1), at(i + 1, j + 1)] };
      for (const c of vault.cells) kind[c] = 2;
    }
  }
  // depth-first carving: long winding passages (each strip between rivers is its own maze)
  const seen = new Uint8Array(N);
  const carve = s => {
    const stack = [s]; seen[s] = 1;
    while (stack.length) {
      const c = stack[stack.length - 1], next = [];
      for (let k = 0; k < 4; k++) { const d = nbr(c, k); if (d >= 0 && !seen[d] && !kind[d]) next.push(k); }
      if (!next.length) { stack.pop(); continue; }
      const k = next[rnd(next.length)], d = nbr(c, k);
      et[edge(c, k)] = E_OPEN; seen[d] = 1; stack.push(d);
    }
  };
  carve(start);
  for (let c = 0; c < N; c++) if (!seen[c] && !kind[c]) carve(c);
  if (arena) {
    for (let j = arena.j; j < arena.j + arena.h; j++) for (let i = arena.i; i < arena.i + arena.w; i++) {
      if (i < arena.i + arena.w - 1) et[edge(at(i, j), 1)] = E_OPEN;
      if (j < arena.j + arena.h - 1) et[edge(at(i, j), 2)] = E_OPEN;
    }
    // a way in on every side
    for (let k = 0; k < 4; k++) {
      const side = [];
      for (let j = arena.j; j < arena.j + arena.h; j++) for (let i = arena.i; i < arena.i + arena.w; i++) {
        const c = at(i, j), d = nbr(c, k);
        if (d >= 0 && kind[d] === 0) side.push(edge(c, k));
      }
      if (side.length) et[side[rnd(side.length)]] = E_OPEN;
    }
  }
  // crossings: where a bridge can go over a river (a gap in the bank on both sides)
  let cross = [];
  rivers.forEach((rv, k) => {
    const cols = shuffle([...Array(MW).keys()].filter(i => kind[at(i, rv.row - 1)] === 0 && kind[at(i, rv.row + 1)] === 0));
    const m = Math.min(cols.length, 1 + (rand() < 0.6 ? 1 : 0) + (MW > 22 && rand() < 0.5 ? 1 : 0));
    for (let q = 0; q < m; q++) cross.push({ lo: at(cols[q], rv.row + 1), hi: at(cols[q], rv.row - 1), k, i: cols[q] });
    for (let i = 0; i < MW - 1; i++) et[at(i, rv.row) * 2] = E_WATER;
  });
  let crossAt = {};
  const indexCross = () => { crossAt = {}; cross.forEach((x, q) => { x.q = q; (crossAt[x.lo] = crossAt[x.lo] || []).push(x); (crossAt[x.hi] = crossAt[x.hi] || []).push(x); }); };
  indexCross();
  const movOpen = new Uint8Array(N * 2);
  // every way out of a cell: f(neighbour, edge or -1 - crossing)
  const adj = (c, f, noCross) => {
    for (let k = 0; k < 4; k++) {
      const d = nbr(c, k);
      if (d < 0) continue;
      const e = edge(c, k), t = et[e];
      if (t === E_OPEN || t === E_GATE || t === E_DOOR || (t === E_MOVER && movOpen[e])) f(d, e);
    }
    if (!noCross && crossAt[c]) for (const x of crossAt[c]) f(x.lo === c ? x.hi : x.lo, -1 - x.q);
  };
  const bfs = (src, skip) => {
    const dist = new Int32Array(N).fill(-1), par = new Int32Array(N).fill(-1), parE = new Int32Array(N).fill(0), q = Array.isArray(src) ? src.slice() : [src];
    for (const s of q) dist[s] = 0;
    for (let h = 0; h < q.length; h++) {
      const c = q[h];
      adj(c, (d, e) => { if (dist[d] >= 0 || (skip && skip(c, d, e))) return; dist[d] = dist[c] + 1; par[d] = c; parE[d] = e; q.push(d); });
    }
    return { dist, par, parE };
  };
  let B = bfs(start);
  for (let c = 0; c < N; c++) if ((kind[c] === 0 || kind[c] === 3) && B.dist[c] < 0) return null;   // something got walled off
  // the exit: the farthest cell on the outer edge (beyond the last river)
  const topRow = rivers.length ? Math.min(...rivers.map(r => r.row)) : MH;
  let exit = -1;
  for (let c = 0; c < N; c++) {
    const i = I(c), j = J(c);
    if (kind[c] || (i && j && i < MW - 1 && j < MH - 1) || j >= topRow) continue;
    if (exit < 0 || B.dist[c] > B.dist[exit]) exit = c;
  }
  if (exit < 0) return null;
  const path = [], pathE = [];
  for (let c = exit; c >= 0; c = B.par[c]) { path.push(c); pathE.push(c === start ? 0 : B.parE[c]); }
  path.reverse(); pathE.reverse();   // pathE[s]: how path[s - 1] leads to path[s]
  const L = path.length - 1;
  // gates and a door along the way out (rivers are where they are)
  const fixed = [];
  for (let s = 1; s <= L; s++) if (pathE[s] < 0) fixed.push(s);
  const nG = lair || plain ? 0 : Math.min(n < 4 ? 1 : n < 8 ? 2 : 3, Math.max(1, Math.floor(L / 14))), nD = !lair && !plain && n >= 2 && L > 20 && rand() < 0.5 ? 1 : 0;
  const nB = nG + nD, steps = [], taken = s => fixed.concat(steps).some(t => Math.abs(t - s) < 4);
  for (let b = 0; b < nB; b++) {
    const want = L * ((b + 1) / (nB + 1) + (rand() - 0.5) * 0.12);
    let best = -1;
    for (let s = 3; s <= L - 2; s++) {
      const e = pathE[s];
      if (e < 0 || et[e] !== E_OPEN || kind[path[s]] || kind[path[s - 1]] || taken(s)) continue;
      if (best < 0 || Math.abs(s - want) < Math.abs(best - want)) best = s;
    }
    if (best > 0) steps.push(best);
  }
  steps.sort((a, b) => a - b);
  const doorAt = nD && steps.length ? steps[rnd(steps.length)] : -1;
  const barrier = new Set(steps.map(s => pathE[s]));
  // zones: what you can reach without passing a gate, a door or a river
  const zone = new Int16Array(N).fill(-1);
  let nz = 0;
  const comp = new Int16Array(N).fill(-1);
  for (let c0 = 0; c0 < N; c0++) {
    if (comp[c0] >= 0 || (kind[c0] !== 0 && kind[c0] !== 3)) continue;
    const q = [c0]; comp[c0] = nz;
    for (let h = 0; h < q.length; h++) adj(q[h], (d, e) => { if (comp[d] < 0 && !barrier.has(e)) { comp[d] = nz; q.push(d); } }, true);
    nz++;
  }
  const order = new Int16Array(nz).fill(-1);
  let zi = 0;
  for (const c of path) if (order[comp[c]] < 0) order[comp[c]] = zi++;
  for (let c = 0; c < N; c++) if (comp[c] >= 0) zone[c] = order[comp[c]] >= 0 ? order[comp[c]] : 0;
  const nZones = zi;
  // a river's other crossings must join the same two zones as the one on the way (else one bridge could strand you)
  const barriers = [];
  let gi = 0;
  for (let s = 1; s <= L; s++) {
    const e = pathE[s];
    if (e < 0) {
      const x = cross[-1 - e];
      barriers.push({ s, type: 'river', k: x.k, zFrom: zone[path[s - 1]], zTo: zone[path[s]], cell: path[s - 1] });
    } else if (barrier.has(e)) {
      const b = { s, e, type: s === doorAt ? 'door' : 'gate', zFrom: zone[path[s - 1]], zTo: zone[path[s]], cell: path[s - 1] };
      if (b.type === 'gate') b.c = MZ_KEYS[gi++];
      barriers.push(b);
      et[e] = b.type === 'gate' ? E_GATE : E_DOOR;
    }
  }
  const keep = [];
  for (const x of cross) {
    const b = barriers.find(r => r.type === 'river' && r.k === x.k);
    if (b && zone[x.lo] === b.zFrom && zone[x.hi] === b.zTo) keep.push(x);
  }
  cross = keep; indexCross();
  for (const x of cross) et[x.hi * 2 + 1] = et[(x.hi + MW) * 2 + 1] = E_CROSS;
  // pathE crossing indices changed: point the river steps at the kept crossings again
  for (let s = 1; s <= L; s++) if (pathE[s] < 0) { const x = cross.find(y => (y.lo === path[s - 1] && y.hi === path[s]) || (y.hi === path[s - 1] && y.lo === path[s])); pathE[s] = x ? -1 - x.q : pathE[s]; }
  // a few extra openings, so there's more than one way round (never between zones)
  const loop = new Uint8Array(N * 2);
  for (let t = Math.floor(N * 0.05); t > 0; t--) {
    const c = rnd(N), k = rnd(4), d = nbr(c, k);
    if (d < 0 || zone[c] < 0 || zone[c] !== zone[d] || kind[c] === 1 || kind[d] === 1) continue;
    const e = edge(c, k);
    if (et[e] === E_WALL) { et[e] = E_OPEN; loop[e] = 1; }
  }
  const deg = new Uint8Array(N);
  for (let c = 0; c < N; c++) if (zone[c] >= 0) adj(c, () => deg[c]++);
  const onPath = new Uint8Array(N); for (const c of path) onPath[c] = 1;
  const offPath = bfs(path).dist, distS = bfs(start).dist;
  // ---- what lies in the maze
  const used = new Uint8Array(N), items = [];
  used[start] = used[exit] = 1;
  for (let k = 0; k < 4; k++) { const d = nbr(start, k); if (d >= 0) used[d] = 1; }
  // the best free cell for an item: off the beaten track, in a dead end if there's one
  const pick = (ok, dead = true) => {
    let best = -1, bs = -1;
    for (let c = 0; c < N; c++) {
      if (used[c] || kind[c] !== 0 || zone[c] < 0 || !ok(c)) continue;
      const s = offPath[c] * 2 + (dead && deg[c] === 1 ? 8 : 0) + rand() * 6 + Math.min(10, distS[c] / 6);
      if (s > bs) { bs = s; best = c; }
    }
    if (best >= 0) used[best] = 1;
    return best;
  };
  const gates = [], doors = [], rooms = [];
  for (const b of barriers) {
    if (b.type === 'gate') {
      gates.push({ e: b.e, c: b.c, route: true });
      const c = pick(x => zone[x] === b.zFrom);
      if (c >= 0) items.push({ k: 'key', c: b.c, cell: c, req: true, guard: rand() < 0.5 });
    } else if (b.type === 'river') {
      const c = pick(x => zone[x] === b.zFrom);
      if (c >= 0) items.push({ k: 'bridge', river: b.k, cell: c, req: true });
    } else {
      // the plate: on the near side, a short drive from the door
      const near = bfs(b.cell, (c, d) => zone[d] !== b.zFrom).dist;
      let c = pick(x => zone[x] === b.zFrom && near[x] >= 3 && near[x] <= 8);
      if (c < 0) c = pick(x => zone[x] === b.zFrom && near[x] >= 1 && near[x] <= 10, false);
      if (c < 0) { et[b.e] = E_OPEN; b.type = 'open'; continue; }   // no room for one: just a passage
      doors.push({ e: b.e, plate: c, route: true });
    }
  }
  const nCells = [];
  for (let k = 0; k < MZ_CELLS; k++) {
    const z = nZones <= 1 ? 0 : Math.round(k * (nZones - 1) / (MZ_CELLS - 1));
    let c = pick(x => zone[x] === z);
    if (c < 0) c = pick(() => true);
    if (c >= 0) { items.push({ k: 'cell', cell: c, req: true }); nCells.push(c); }
  }
  if (nCells.length < MZ_CELLS) return null;
  const fuel = [];
  for (let k = Math.max(3, Math.round(N / 28)); k > 0; k--) {
    const c = pick(x => fuel.every(f => Math.abs(I(f) - I(x)) + Math.abs(J(f) - J(x)) >= 5));
    if (c < 0) break;
    fuel.push(c); items.push({ k: 'fuel', cell: c });
  }
  if (n >= 2 && !plain) for (let k = N > 500 ? 2 : 1; k > 0; k--) { const c = pick(() => true); if (c >= 0) items.push({ k: 'scroll', cell: c }); }
  // treasure rooms: dead ends behind bricks, a gate or a plate door
  const sealed = new Uint8Array(N);   // cells whose walls must stay steel
  const leafEdge = c => { let e0 = -2; adj(c, (d, e) => { e0 = e; }, true); return e0; };
  const leaves = shuffle([...Array(N).keys()].filter(c => kind[c] === 0 && zone[c] >= 0 && !used[c] && deg[c] === 1 && offPath[c] > 0 && !crossAt[c]));
  let nT = plain ? 0 : 1 + (n >= 3 ? 1 : 0) + (N > 450 ? 1 : 0);
  for (const c of leaves) {
    if (nT <= 0) break;
    const e = leafEdge(c);
    if (e < 0 || et[e] !== E_OPEN || used[c]) continue;
    const via = ends(e)[0] === c ? ends(e)[1] : ends(e)[0];
    let lock = 'brick', plate = -1;
    const r = rand(), cols = gates.map(g => g.c);
    if (cols.length && r < 0.3) lock = 'gate';
    else if (r < 0.55) {
      const near = bfs(via, (a, d, ee) => zone[d] !== zone[c] || ee === e).dist;
      plate = pick(x => near[x] >= 2 && near[x] <= 6, false);
      if (plate >= 0) lock = 'door';
    }
    used[c] = 1; sealed[c] = 1; nT--;
    const roll = rand(), loot = roll < 0.5 ? 'coins' : roll < 0.8 ? 'weapon' : 'life';
    if (lock === 'brick') et[e] = E_BRICK;
    else if (lock === 'gate') { const col = cols[rnd(cols.length)]; et[e] = E_GATE; gates.push({ e, c: col, route: false }); }
    else { et[e] = E_DOOR; doors.push({ e, plate, route: false }); }
    rooms.push({ cell: c, kind: 'treasure', lock, loot, e });
  }
  // the secret exit: a dead end walled in by a wall that only looks like steel
  let secret = null;
  if (n >= 2 && !lair && !plain && rand() < 0.4) {
    const cand = leaves.filter(c => !used[c] && et[leafEdge(c)] === E_OPEN);
    cand.sort((a, b) => ((I(b) % (MW - 1) === 0 || J(b) % (MH - 1) === 0) - (I(a) % (MW - 1) === 0 || J(a) % (MH - 1) === 0)) || offPath[b] - offPath[a]);
    if (cand.length) { const c = cand[0], e = leafEdge(c); et[e] = E_SECRET; used[c] = 1; sealed[c] = 1; secret = { cell: c, e }; }
  }
  // the vault opens on the zone it borders first
  if (vault) {
    const out = [];
    for (const c of vault.cells) for (let k = 0; k < 4; k++) {
      const d = nbr(c, k);
      if (d < 0 || kind[d] === 2) continue;
      et[edge(c, k)] = E_VAULT;
      if (kind[d] === 0 && zone[d] >= 0) out.push({ e: edge(c, k), z: zone[d] });
    }
    for (let a = 0; a < 4; a++) for (let b = a + 1; b < 4; b++) {
      const ca = vault.cells[a], cb = vault.cells[b];
      for (let k = 0; k < 4; k++) if (nbr(ca, k) === cb) et[edge(ca, k)] = E_OPEN;
    }
    if (!out.length) { for (const c of vault.cells) kind[c] = 1; vault = null; }   // (never happens: a vault has neighbours)
    else { const z = Math.min(...out.map(o => o.z)); vault.entr = out.filter(o => o.z === z).map(o => o.e); vault.z = z; }
  }
  const special = c => used[c] || sealed[c] || kind[c] !== 0 || zone[c] < 0;
  // ---- moving walls: a passage of the tree (A) and a wall beside it (B) that closes the same loop; one of the two
  // is always open, so every cell can be reached whichever way they stand
  const movers = [];
  const nM = plain ? 0 : n < 3 ? 0 : lair ? 1 + rnd(2) : theme === 'machine' ? 5 + rnd(4) : theme === 'ice' ? 2 + rnd(2) : 1 + rnd(2);
  const onCyc = new Uint8Array(N);
  if (nM) {
    const T = bfs(start), depth = T.dist, isTree = e => { const [a, b] = ends(e); return (T.par[b] === a && T.parE[b] === e) || (T.par[a] === b && T.parE[a] === e); };
    const treePath = (u, v) => {
      const cells = [], es = [];
      while (u !== v) {
        if (depth[u] >= depth[v]) { cells.push(u); es.push(T.parE[u]); u = T.par[u]; } else { cells.push(v); es.push(T.parE[v]); v = T.par[v]; }
        if (u < 0 || v < 0) return null;
      }
      cells.push(u);
      return { cells, es };
    };
    const cand = [];
    for (let pj = 1; pj < MH; pj++) for (let pi = 1; pi < MW; pi++) {
      // the four wall slots that meet at the pillar between cells (pi - 1, pj - 1) and (pi, pj)
      const inc = [at(pi - 1, pj - 1) * 2, at(pi - 1, pj) * 2, at(pi - 1, pj - 1) * 2 + 1, at(pi, pj - 1) * 2 + 1];
      for (let a = 0; a < 4; a++) for (let b = 0; b < 4; b++) {
        if (a === b) continue;
        const A = inc[a], Bw = inc[b];
        if (et[A] !== E_OPEN || loop[A] || !isTree(A) || et[Bw] !== E_WALL) continue;
        const [u, v] = ends(Bw), [p, q] = ends(A);
        if (special(u) || special(v) || special(p) || special(q) || zone[u] !== zone[v]) continue;
        const cyc = treePath(u, v);
        if (!cyc || cyc.cells.length > 16 || !cyc.es.includes(A) || cyc.es.some(e => e < 0)) continue;
        cand.push({ a: A, b: Bw, slide: (a >> 1) === (b >> 1), pi, pj, cyc: cyc.cells });
      }
    }
    shuffle(cand);
    for (const c of cand) {
      if (movers.length >= nM) break;
      if (c.cyc.some(x => onCyc[x]) || et[c.a] !== E_OPEN || et[c.b] !== E_WALL) continue;
      for (const x of c.cyc) onCyc[x] = 1;
      et[c.a] = et[c.b] = E_MOVER; movOpen[c.a] = 1;
      movers.push(c);
    }
  }
  // ---- cracked floor: never in a cell the maze can't do without
  const pits = [];
  const nP = plain || n < 2 ? 0 : Math.round(Math.min(10, 2 + n / 3) * (theme === 'ice' ? 1.5 : 1) * (lair ? 0.5 : 1));
  if (nP) {
    const isPit = new Uint8Array(N);
    const reach = () => { const q = [start], s = new Uint8Array(N); s[start] = 1; for (let h = 0; h < q.length; h++) adj(q[h], d => { if (!s[d] && !isPit[d]) { s[d] = 1; q.push(d); } }); return q.length; };
    let base = reach();
    const cand = shuffle([...Array(N).keys()].filter(c => !special(c) && !onCyc[c] && deg[c] >= 2 && !crossAt[c]));
    for (const c of cand) {
      if (pits.length >= nP) break;
      isPit[c] = 1;
      const r = reach();
      if (r === base - 1) { pits.push(c); used[c] = 1; base = r; } else isPit[c] = 0;
    }
  }
  // ---- teleporter pairs (sometimes into a dead end) and conveyor corridors
  const pads = [], extras = typeof Config === 'undefined' || Config.on('terrainExtras');   // Settings: MUD, BELTS, PADS
  const nT2 = plain || !extras || n < 4 ? 0 : theme === 'machine' ? 2 + (N > 500 ? 1 : 0) : theme === 'ice' ? 0 : rand() < 0.6 ? 1 : 0;
  for (let k = 0; k < nT2; k++) {
    const a = pick(x => !onCyc[x], false);
    if (a < 0) break;
    const d = bfs(a, (c, x) => zone[x] !== zone[a]).dist, dead = rand() < 0.4;
    const b = pick(x => zone[x] === zone[a] && d[x] >= 8 && !onCyc[x] && (!dead || deg[x] === 1), dead);
    if (b < 0) { used[a] = 0; break; }
    pads.push({ a, b });
  }
  const belts = [], exitD = bfs(exit).dist;
  const nBelt = plain || !extras ? 0 : theme === 'machine' ? 3 + (N > 500 ? 2 : 0) : n >= 6 && !lair && rand() < 0.35 ? 1 : 0;
  for (let k = 0, t = 0; k < nBelt && t < 300; t++) {
    const c0 = rnd(N), dk = rnd(4), c1 = nbr(c0, dk), c2 = c1 >= 0 ? nbr(c1, dk) : -1;
    if (c2 < 0 || [c0, c1, c2].some(c => special(c) || onCyc[c])) continue;
    const e1 = edge(c0, dk), e2 = edge(c1, dk);
    if (et[e1] !== E_OPEN || et[e2] !== E_OPEN) continue;
    // mostly towards the exit (a shortcut), now and then away from it
    const toExit = exitD[c2] < exitD[c0], fwd = rand() < 0.75 ? toExit : !toExit;
    belts.push({ cells: [c0, c1, c2], es: [e1, e2], dir: fwd ? dk : (dk + 2) % 4 });
    for (const c of [c0, c1, c2]) used[c] = 1;
    k++;
  }
  // ---- pitch-black parts, with torches on their walls
  const pitch = new Uint8Array(N), torches = [];
  const nPitch = plain || n < 2 ? 0 : lair ? 1 : theme === 'sewer' ? 2 + rnd(2) : 1 + rnd(2);
  for (let k = 0; k < nPitch; k++) {
    let s = -1;
    for (let t = 0; t < 30 && s < 0; t++) { const c = rnd(N); if (kind[c] === 0 && zone[c] >= 0 && !pitch[c] && distS[c] > 5) s = c; }
    if (s < 0) break;
    const size = 6 + rnd(9), q = [s];
    pitch[s] = 1;
    for (let h = 0; h < q.length && q.length < size; h++) adj(q[h], d => { if (!pitch[d] && kind[d] === 0 && q.length < size) { pitch[d] = 1; q.push(d); } }, true);
  }
  // ---- the rest: a little brick to shoot through (inside a zone), trees, ice, sludge
  for (let e = 0; e < N * 2; e++) {
    if (et[e] !== E_WALL) continue;
    const a = e >> 1;
    if ((e & 1) ? J(a) >= MH - 1 : I(a) >= MW - 1) continue;
    const [p, q] = ends(e);
    if (kind[p] || kind[q] || zone[p] < 0 || zone[p] !== zone[q] || sealed[p] || sealed[q]) continue;
    if (rand() < 0.1) et[e] = E_BRICK;
  }
  for (let c = 0; c < N; c++) {
    if (!pitch[c] || rand() < 0.45) continue;
    const sides = [0, 1, 2, 3].filter(k => { const d = nbr(c, k); return d < 0 || et[edge(c, k)] === E_WALL; });
    if (sides.length) torches.push({ cell: c, side: sides[rnd(sides.length)] });
  }
  const decor = new Uint8Array(N);   // 0 none, 1 trees, 2 ice, 3 sludge
  const dz = { dungeon: [0.06, 0, 0], sewer: [0.04, 0, 0.1], ice: [0.02, 0.32, 0], machine: [0.03, 0, 0] }[theme];
  const plates = new Set(doors.map(d => d.plate));
  for (let c = 0; c < N; c++) {
    if (kind[c] !== 0 || used[c] || sealed[c] || plates.has(c) || pits.includes(c)) continue;
    const r = rand();
    decor[c] = r < dz[0] ? 1 : r < dz[0] + dz[1] ? 2 : r < dz[0] + dz[1] + dz[2] ? 3 : 0;
  }
  for (const c of pits) decor[c] = 0;
  // treasure: what's in the rooms and the vault
  for (const r of rooms) {
    if (r.loot === 'coins') { items.push({ k: 'coin', cell: r.cell, dx: -6 }, { k: 'coin', cell: r.cell, dx: 6 }, { k: 'coin', cell: r.cell, dy: 8 }); }
    else items.push({ k: r.loot === 'weapon' ? 'weapon' : 'life', cell: r.cell });
  }
  const par = mzPar({ MW, MH, kind, et, cross, movers, pits: [], pads, items, gates, doors, start, exit, movOpen }, N);
  // ---- the blocks (8px), as maze.js draws them: '@' steel, '#' brick, '~' water, '%' trees, '_' ice, 'm' sludge
  const BW = (MW * MAZE_PITCH + 1) * 2, BH = (MH * MAZE_PITCH + 1) * 2, g = [];
  for (let y = 0; y < BH; y++) g.push(new Array(BW).fill('.'));
  const fill = (tx, ty, tw, th, ch) => { for (let y = ty * 2; y < (ty + th) * 2; y++) for (let x = tx * 2; x < (tx + tw) * 2; x++) g[y][x] = ch; };
  for (let j = 0; j <= MH; j++) for (let i = 0; i <= MW; i++) fill(i * 3, j * 3, 1, 1, '@');
  for (let i = 0; i < MW; i++) { fill(i * 3 + 1, 0, 2, 1, '@'); fill(i * 3 + 1, MH * 3, 2, 1, '@'); }
  for (let j = 0; j < MH; j++) { fill(0, j * 3 + 1, 1, 2, '@'); fill(MW * 3, j * 3 + 1, 1, 2, '@'); }
  const EDGE_CH = { [E_WALL]: '@', [E_OPEN]: '.', [E_BRICK]: '#', [E_GATE]: '@', [E_DOOR]: '@', [E_SECRET]: '#', [E_WATER]: '~', [E_VAULT]: '@', [E_CROSS]: '.' };
  const edgeFill = (e, ch) => { const a = e >> 1, i = I(a), j = J(a); if (e & 1) fill(i * 3 + 1, j * 3 + 3, 2, 1, ch); else fill(i * 3 + 3, j * 3 + 1, 1, 2, ch); };
  for (let c = 0; c < N; c++) {
    const i = I(c), j = J(c);
    if (i < MW - 1) edgeFill(c * 2, et[c * 2] === E_MOVER ? (movOpen[c * 2] ? '.' : '@') : EDGE_CH[et[c * 2]]);
    if (j < MH - 1) edgeFill(c * 2 + 1, et[c * 2 + 1] === E_MOVER ? (movOpen[c * 2 + 1] ? '.' : '@') : EDGE_CH[et[c * 2 + 1]]);
    if (kind[c] === 1) fill(i * 3 + 1, j * 3 + 1, 2, 2, '~');
    else if (decor[c]) fill(i * 3 + 1, j * 3 + 1, 2, 2, ' %_m'[decor[c]]);
  }
  for (const x of cross) { edgeFill(x.hi * 2 + 1, '.'); edgeFill((x.hi + MW) * 2 + 1, '.'); }
  // inside the vault and the arena: one room, no pillars
  const roomPillars = (i0, j0, w, h) => { for (let j = j0 + 1; j < j0 + h; j++) for (let i = i0 + 1; i < i0 + w; i++) fill(i * 3, j * 3, 1, 1, '.'); };
  if (vault) roomPillars(vault.i, vault.j, 2, 2);
  if (arena) roomPillars(arena.i, arena.j, arena.w, arena.h);
  const BELT_CH = ['^', '>', 'v', '<'];
  for (const b of belts) {
    for (const c of b.cells) fill(I(c) * 3 + 1, J(c) * 3 + 1, 2, 2, BELT_CH[b.dir]);
    for (const e of b.es) edgeFill(e, BELT_CH[b.dir]);
  }
  // for maze.js: the start, the exit, the way between, distances from the start (-1: not on foot)
  const dist = Array.from(bfs(start, (c, d, e) => e >= 0 && et[e] !== E_OPEN && et[e] !== E_GATE && et[e] !== E_DOOR && et[e] !== E_MOVER).dist);
  for (const r of rooms) dist[r.cell] = -1;
  if (secret) dist[secret.cell] = -1;
  const xy = c => [I(c), J(c)];
  return {
    MW, MH, n, theme, themeKey: 'mz' + theme, lair, start: xy(start), exit: xy(exit), path: path.map(xy), dist, blocks: g.map(r => r.join('')),
    kind, et, movOpen, zone, nZones, startCell: start, exitCell: exit, cross, rivers, barriers, gates, doors, movers, pits, pads, belts, items,
    rooms, vault, arena, secret, pitch, torches, par, plain: !!plain,
  };
}

// ------------------------------------------------------------ the solver
// Can a team get every key, crate and power cell and then out, with the moving walls standing as in `state`
// (0: as built, 1: moved), every cracked floor already fallen in, bricks unbroken and no ship or spare bridges?
function mazeSolve(w, state) {
  const { MW, MH, kind, et } = w, N = MW * MH, I = c => c % MW, J = c => (c / MW) | 0;
  const open = new Uint8Array(N * 2);
  w.movers.forEach((mv, k) => { open[state && state[k] ? mv.b : mv.a] = 1; });
  const pit = new Uint8Array(N); for (const c of w.pits) pit[c] = 1;
  const gateOf = {}, doorOf = {}, padOf = {};
  for (const g of w.gates) gateOf[g.e] = g.c;
  w.doors.forEach((d, k) => { doorOf[d.e] = k; });
  for (const p of w.pads) { (padOf[p.a] = padOf[p.a] || []).push(p.b); (padOf[p.b] = padOf[p.b] || []).push(p.a); }
  const crossAt = {};
  for (const x of w.cross) { (crossAt[x.lo] = crossAt[x.lo] || []).push(x); (crossAt[x.hi] = crossAt[x.hi] || []).push(x); }
  const have = new Set(), itemsAt = {};
  for (const it of w.items) (itemsAt[it.cell] = itemsAt[it.cell] || []).push(it);
  const plateAt = {};
  w.doors.forEach((d, k) => { (plateAt[d.plate] = plateAt[d.plate] || []).push(k); });
  let reached = null;
  for (let round = 0; round < 30; round++) {
    reached = new Uint8Array(N);
    const q = [w.startCell]; reached[w.startCell] = 1;
    const go = d => { if (!reached[d] && !pit[d] && (kind[d] === 0 || kind[d] === 3)) { reached[d] = 1; q.push(d); } };
    for (let h = 0; h < q.length; h++) {
      const c = q[h], i = I(c), j = J(c);
      for (let k = 0; k < 4; k++) {
        const d = k === 0 ? (j > 0 ? c - MW : -1) : k === 1 ? (i < MW - 1 ? c + 1 : -1) : k === 2 ? (j < MH - 1 ? c + MW : -1) : (i > 0 ? c - 1 : -1);
        if (d < 0) continue;
        const e = k === 0 ? d * 2 + 1 : k === 1 ? c * 2 : k === 2 ? c * 2 + 1 : d * 2, t = et[e];
        if (t === E_OPEN || (t === E_MOVER && open[e]) || (t === E_GATE && have.has('key:' + gateOf[e])) || (t === E_DOOR && have.has('plate:' + doorOf[e]))) go(d);
      }
      for (const x of crossAt[c] || []) if (have.has('bridge:' + x.k)) go(x.lo === c ? x.hi : x.lo);
      for (const d of padOf[c] || []) go(d);
    }
    const before = have.size;
    for (const c of q) {
      for (const it of itemsAt[c] || []) have.add(it.k === 'key' ? 'key:' + it.c : it.k === 'bridge' ? 'bridge:' + it.river : it.k === 'cell' ? 'cell:' + c : it.k);
      for (const k of plateAt[c] || []) have.add('plate:' + k);
    }
    if (have.size === before) break;
  }
  const missing = w.items.filter(it => it.req && !reached[it.cell]);
  return { ok: !!reached[w.exitCell] && !missing.length, reached, have, missing };
}

// par times (s) for ** and ***: the shortest tour that picks up what's needed in order, at a tank's pace
function mzPar(w, N) {
  const { MW, MH, kind, et } = w, I = c => c % MW, J = c => (c / MW) | 0, have = new Set();
  const gateOf = {}, doorOf = {}, crossAt = {};
  for (const g of w.gates) gateOf[g.e] = g.c;
  w.doors.forEach((d, k) => { doorOf[d.e] = k; });
  for (const x of w.cross) { (crossAt[x.lo] = crossAt[x.lo] || []).push(x); (crossAt[x.hi] = crossAt[x.hi] || []).push(x); }
  const dists = from => {
    const dist = new Int32Array(N).fill(-1), q = [from]; dist[from] = 0;
    for (let h = 0; h < q.length; h++) {
      const c = q[h], i = I(c), j = J(c);
      const go = d => { if (dist[d] < 0 && (kind[d] === 0 || kind[d] === 3)) { dist[d] = dist[c] + 1; q.push(d); } };
      for (let k = 0; k < 4; k++) {
        const d = k === 0 ? (j > 0 ? c - MW : -1) : k === 1 ? (i < MW - 1 ? c + 1 : -1) : k === 2 ? (j < MH - 1 ? c + MW : -1) : (i > 0 ? c - 1 : -1);
        if (d < 0) continue;
        const e = k === 0 ? d * 2 + 1 : k === 1 ? c * 2 : k === 2 ? c * 2 + 1 : d * 2, t = et[e];
        if (t === E_OPEN || (t === E_MOVER && w.movOpen[e]) || (t === E_GATE && have.has('key:' + gateOf[e])) || (t === E_DOOR && have.has('plate:' + doorOf[e]))) go(d);
      }
      for (const x of crossAt[c] || []) if (have.has('bridge:' + x.k)) go(x.lo === c ? x.hi : x.lo);
      for (const p of w.pads) { if (p.a === c) go(p.b); else if (p.b === c) go(p.a); }
    }
    return dist;
  };
  const todo = w.items.filter(it => it.req).map(it => ({ cell: it.cell, tag: it.k === 'key' ? 'key:' + it.c : it.k === 'bridge' ? 'bridge:' + it.river : 'cell' }))
    .concat(w.doors.map((d, k) => ({ cell: d.plate, tag: 'plate:' + k, opt: !d.route })));
  let pos = w.start, total = 0;
  for (let guard = 0; guard < 40; guard++) {
    const d = dists(pos);
    let best = null;
    for (const t of todo) if (!t.done && !t.opt && d[t.cell] >= 0 && (!best || d[t.cell] < d[best.cell])) best = t;
    if (!best) break;
    total += d[best.cell]; pos = best.cell; best.done = true; have.add(best.tag);
  }
  const d = dists(pos);
  total += Math.max(0, d[w.exit]);
  const p3 = Math.ceil((total * 1.3 + 25) / 5) * 5;
  return [Math.ceil((p3 * 1.6 + 20) / 5) * 5, p3];
}

// ------------------------------------------------------------ in play
const mzCellXY = (m, c) => [((c % m.MW) * MAZE_PITCH + 1) * 16, (((c / m.MW) | 0) * MAZE_PITCH + 1) * 16];
// a wall slot between two cells, in px
const mzEdgeRect = (m, e) => {
  const a = e >> 1, i = a % m.MW, j = (a / m.MW) | 0;
  return e & 1 ? { x: (i * 3 + 1) * 16, y: (j * 3 + 3) * 16, w: 32, h: 16 } : { x: (i * 3 + 3) * 16, y: (j * 3 + 1) * 16, w: 16, h: 32 };
};
let mzUpdateMaze = null, mzSetupMaze = null;   // our own wrappers: anything else wrapped over them runs the maze's enemies

(function () {
  const P = Stage.prototype;

  // ---- setting up: maze.js puts the patrols in; then the world goes in
  const setupBase = P.setupMaze;
  P.setupMaze = function (mz) {
    setupBase.call(this, mz);
    if (mz && mz.kind) this.mzSetupWorld(mz);   // (a plain layout, like the title picture's, has none of it)
  };
  mzSetupMaze = P.setupMaze;

  Object.assign(P, {
    mzSetupWorld(w) {
      const m = this.maze, XY = c => mzCellXY(w, c);
      // the walls as generated: the eagle's brick ring and the entry points made holes and bricks in them
      for (let by = 0; by < ROWS * 2; by++) {
        const row = w.blocks[by];
        for (let bx = 0; bx < COLS * 2; bx++) {
          const v = BLOCK_TYPE[row[bx]] || T_EMPTY;
          for (let k = 0; k < 4; k++) this.terrain[(by * 2 + (k >> 1)) * GW + bx * 2 + (k & 1)] = v;
        }
      }
      this.origTerrain = this.terrain.slice();
      this.dirty = true;
      this.weather = null;   // always dark down here, in its own way (renderMazeDark)
      const rect = (c, cw = 1, ch = 1) => { const [x, y] = XY(c); return { x, y, w: (cw * 3 - 1) * 16, h: (ch * 3 - 1) * 16 }; };
      Object.assign(m, {
        mzOn: true, world: w, theme: w.theme, lair: w.lair, n: this.num,
        keys: [], keysEver: [], keyCols: w.gates.filter(g => g.route).map(g => g.c), keyLost: {}, cellsGot: 0, cellsNeed: MZ_CELLS,
        items: [], gates: [], doors: [], movers: [], cracks: [], rubble: [], torches: [], markers: [], rivers: [],
        rooms: [], vault: null, secret: null, scrollT: 0, collapse: null, shake: 0, par: w.par, t0: this.frame, torchVer: 1, nextId: 1,
        lairBossPending: w.lair,
      });
      // the contract's rooms: treasure rooms, the vault, the lair's arena, the secret exit's room (px)
      for (const r of w.rooms) m.rooms.push(Object.assign(rect(r.cell), { kind: 'treasure', lock: r.lock, entr: mzEdgeRect(w, r.e) }));
      if (w.arena) {
        const a = w.arena, c = a.j * w.MW + a.i;
        m.rooms.push(Object.assign(rect(c, a.w, a.h), { kind: 'arena' }));
      }
      if (w.vault) {
        const v = w.vault, c = v.j * w.MW + v.i;
        m.vault = Object.assign(rect(c, 2, 2), { open: false, entr: v.entr.map(e => mzEdgeRect(w, e)) });
        m.rooms.push(Object.assign(rect(c, 2, 2), { kind: 'vault' }));
      }
      if (w.secret) {
        m.secret = Object.assign(rect(w.secret.cell), { wall: mzEdgeRect(w, w.secret.e), found: false });
        m.rooms.push(Object.assign(rect(w.secret.cell), { kind: 'secret' }));
      }
      w.rivers.forEach((rv, k) => m.rivers.push({ row: rv.row, cols: w.cross.filter(x => x.k === k).map(x => x.i), bridged: false, home: null }));
      m.keyHome = {};
      // items: in the middle of their cell (coins side by side)
      for (const it of w.items) {
        const [x, y] = XY(it.cell);
        const o = this.mzAddItem(it.k, x + 16 + (it.dx || 0), y + 16 + (it.dy || 0), { c: it.c, river: it.river, req: !!it.req, home: true });
        if (it.k === 'key') m.keyHome[it.c] = o.home0;
        if (it.k === 'bridge' && m.rivers[it.river]) m.rivers[it.river].home = o.home0;
      }
      for (const g of w.gates) m.gates.push(Object.assign(mzEdgeRect(w, g.e), { c: g.c, route: g.route, open: 0, t: 0 }));
      w.doors.forEach((d, k) => {
        const [px, py] = XY(d.plate);
        m.doors.push(Object.assign(mzEdgeRect(w, d.e), { px, py, col: MZ_PLATE_COL[k % MZ_PLATE_COL.length], route: d.route, open: false, timer: 0, held: false, jam: false }));
      });
      w.movers.forEach((mv, k) => {
        m.movers.push({ a: mzEdgeRect(w, mv.a), b: mzEdgeRect(w, mv.b), s: 0, slide: mv.slide, pv: [mv.pi * 48 + 8, mv.pj * 48 + 8],
          next: MZ_MOVE_EVERY + (k * 197) % 420, anim: 0 });
      });
      for (const c of w.pits) { const [x, y] = XY(c); m.cracks.push({ x, y, st: 0, t: 0 }); }
      // torches: on the wall beside a pitch-black cell; their light comes from just in front of them
      for (const t of w.torches) {
        const [x, y] = XY(t.cell), k = t.side;
        const tx = k === 1 ? x + 32 : k === 3 ? x - 16 : x + 8, ty = k === 2 ? y + 32 : k === 0 ? y - 16 : y + 8;
        m.torches.push({ x: tx, y: ty, side: k, lx: x + 16 + DXY[k][0] * 8, ly: y + 16 + DXY[k][1] * 8, lit: 0 });
      }
      m.pitchCells = [];
      for (let c = 0; c < w.pitch.length; c++) if (w.pitch[c]) m.pitchCells.push(c);
      // teleporters: pairs of pads, in the middle of their cells
      for (const p of w.pads) {
        const i = this.pads.length, col = PAD_COLORS[(i >> 1) % PAD_COLORS.length], [ax, ay] = XY(p.a), [bx, by] = XY(p.b);
        this.pads.push({ x: ax + 8, y: ay + 8, pair: i + 1, color: col }, { x: bx + 8, y: by + 8, pair: i, color: col });
      }
      // guards: some keys have a patrol waiting beside them
      for (const it of w.items) {
        if (!it.guard || !this.queue.length) continue;
        const [x, y] = XY(it.cell);
        this.spawns.push({ x: x + (rnd(2) ? 16 : 0), y: y + 16, t: SPARKLE_TIME, enemy: this.queue.shift() });
      }
      for (const p of this.players) p.mzFuel = 1;
      this.mzSeen = new Uint8Array(COLS * ROWS);
      this.mzSeenN = 0;
      this.mzPitchTiles();
      // without the maze's enemies (mazefoes.js) a lair has no beast to wait for
      if (m.lair && !this.mzFoes()) m.lairBossPending = false;
    },

    // is something else running the maze's enemies (minotaurs, the lair's beast)? It wraps setupMaze or updateMaze over ours
    mzFoes() { return Stage.prototype.updateMaze !== mzUpdateMaze || Stage.prototype.setupMaze !== mzSetupMaze; },

    mzPitchTiles() {
      const m = this.maze, pt = new Uint8Array(COLS * ROWS);
      for (const c of m.pitchCells || []) {
        const i = c % m.MW, j = (c / m.MW) | 0;
        for (let ty = j * 3; ty <= j * 3 + 3; ty++) for (let tx = i * 3; tx <= i * 3 + 3; tx++) pt[ty * COLS + tx] = 1;
      }
      this.mzPitch = pt;
    },

    mzAddItem(k, cx, cy, o = {}) {
      const m = this.maze, it = Object.assign({ id: m.nextId++, k, x: Math.round(cx - 8), y: Math.round(cy - 8) }, o);
      if (o.home === true) it.home0 = [it.x, it.y];   // where it first lay (a lost key or crate comes back there)
      delete it.home;
      m.items.push(it);
      return it;
    },

    // ---- the contract with the maze's enemies (mazefoes.js)
    // the exit stays shut while cells are missing, and in a lair while its beast is still to come or alive
    mazeSealed() {
      const m = this.maze;
      if (!m || !m.mzOn) return false;
      if (m.sealedNet !== undefined) return m.sealedNet;   // an online guest: as the host has it
      return m.cellsGot < m.cellsNeed || !!(m.lair && (m.lairBossPending || this.tanks.some(t => t.alive && t.lairBoss)));
    },

    // a minotaur fell: the vault's walls come down on the side it borders
    mazeOpenVault() {
      const m = this.maze, v = m && m.vault;
      if (!v || v.open) return false;
      v.open = true;
      for (const r of v.entr || []) { this.mzFill(r.x, r.y, r.w, r.h, T_EMPTY); this.mzDust(r.x + r.w / 2, r.y + r.h / 2, 12); }
      // the treasure inside
      const cx = v.x + v.w / 2, cy = v.y + v.h / 2;
      this.mzAddItem('coin', cx - 20, cy - 16); this.mzAddItem('coin', cx, cy - 16); this.mzAddItem('coin', cx + 20, cy - 16);
      this.mzAddItem('weapon', cx - 14, cy + 14); this.mzAddItem('life', cx + 14, cy + 14);
      m.shake = Math.max(m.shake, 20);
      this.popups.push({ x: cx, y: v.y - 4, text: 'THE VAULT IS OPEN!', label: true, color: COL.gold, t: 0, delay: 0, life: 150 });
      Sound.play('mzVault');
      return true;
    },

    // a thief: one of the team's keys (the newest) and its colour, or null
    mazeStealKey() {
      const m = this.maze;
      if (!m || !m.keys || !m.keys.length) return null;
      const c = m.keys.pop();
      m.keyLost[c] = 0;
      return c;
    },

    // something on the floor centred on (x, y) px: 'key' (extra.color), 'cell', 'bridge', 'fuel', 'scroll', 'coin',
    // 'weapon' (extra.weapon), 'life', or 'pu' (extra.type: any power-up). In a wall it goes to the middle of its cell.
    mazeDropItem(kind, x, y, extra = {}) {
      const m = this.maze;
      if (!m || !m.mzOn) return null;
      const solid = (px, py) => { const v = this.get(px >> 2, py >> 2); return v === T_STEEL || v === T_BRICK || v === T_WATER || v < 0; };
      if (solid(x - 6, y - 6) || solid(x + 6, y - 6) || solid(x - 6, y + 6) || solid(x + 6, y + 6)) { const [cx, cy] = this.mazeCellAt(x, y); x = cx + 16; y = cy + 16; }
      const it = this.mzAddItem(kind, x, y, { c: extra.color || extra.c, w: extra.weapon, pu: extra.type, river: extra.river, req: kind === 'key' || kind === 'cell' });
      this.addFx(x, y, [Sprites.sparkle[1], Sprites.sparkle[2], Sprites.sparkle[3]], 4);
      return it;
    },

    // ---- terrain helpers
    mzFill(x, y, w, h, v) {
      for (let cy = y >> 2; cy < (y + h) >> 2; cy++) for (let cx = x >> 2; cx < (x + w) >> 2; cx++) this.set(cx, cy, v);
      if (v !== T_EMPTY && this.mines.length) this.mines = this.mines.filter(mn => !overlap(mn.x - 2, mn.y - 2, 4, 4, x, y, w, h));
    },
    mzSolidTile(tx, ty) {
      const v = this.get(tx * 4 + 1, ty * 4 + 1), u = this.get(tx * 4 + 2, ty * 4 + 2);
      return v < 0 || v === T_STEEL || v === T_BRICK || v === T_WATER || u === T_STEEL || u === T_BRICK || u === T_WATER;
    },
    mzCellOpen(i, j) { return !this.mzSolidTile(i * 3 + 1, j * 3 + 1) && !this.mzSolidTile(i * 3 + 2, j * 3 + 2); },
    mzCellOf(x, y) { const m = this.maze; return Math.max(0, Math.min(m.MW - 1, Math.floor((x - 16) / 48))) + Math.max(0, Math.min(m.MH - 1, Math.floor((y - 16) / 48))) * m.MW; },
    // distances (in cells) to the exit the way the walls stand now (bricks count as walls; a river only where bridged)
    mzDField() {
      const m = this.maze, MW = m.MW, MH = m.MH, N = MW * MH, D = new Int32Array(N).fill(-1);
      const ex = this.mzCellOf(m.ex + 16, m.ey + 16), q = [ex];
      D[ex] = 0;
      const padCell = this.pads.map(p => this.mzCellOf(p.x + 8, p.y + 8));
      for (let h = 0; h < q.length; h++) {
        const c = q[h], i = c % MW, j = (c / MW) | 0;
        const go = d => { if (D[d] < 0 && this.mzCellOpen(d % MW, (d / MW) | 0)) { D[d] = D[c] + 1; q.push(d); } };
        if (i < MW - 1 && !this.mzSolidTile(i * 3 + 3, j * 3 + 1) && !this.mzSolidTile(i * 3 + 3, j * 3 + 2)) go(c + 1);
        if (i > 0 && !this.mzSolidTile(i * 3, j * 3 + 1) && !this.mzSolidTile(i * 3, j * 3 + 2)) go(c - 1);
        if (j < MH - 1 && !this.mzSolidTile(i * 3 + 1, j * 3 + 3) && !this.mzSolidTile(i * 3 + 2, j * 3 + 3)) go(c + MW);
        if (j > 0 && !this.mzSolidTile(i * 3 + 1, j * 3) && !this.mzSolidTile(i * 3 + 2, j * 3)) go(c - MW);
        for (let k = 0; k < padCell.length; k++) if (padCell[k] === c && this.pads[k].pair !== undefined && padCell[this.pads[k].pair] !== undefined) go(padCell[this.pads[k].pair]);
      }
      return D;
    },
  });

  // ---- secrets.js hides power-ups in bricks and turns some into ? blocks: never the secret exit's wall or a treasure
  // room's way in (a ? block never breaks)
  const secretsBase = P.setupSecrets;
  P.setupSecrets = function (opts) {
    const m = this.maze, keep = [];
    if (m && m.mzOn) {
      const walls = m.rooms.filter(r => r.lock === 'brick' && r.entr).map(r => r.entr).concat(m.secret ? [m.secret.wall] : []);
      for (const r of walls) for (let cy = r.y >> 2; cy < (r.y + r.h) >> 2; cy++) for (let cx = r.x >> 2; cx < (r.x + r.w) >> 2; cx++) {
        const i = cy * GW + cx;
        if (this.terrain[i] === T_BRICK) { keep.push(i); this.terrain[i] = T_STEEL; }
      }
    }
    secretsBase.call(this, opts);
    for (const i of keep) { this.terrain[i] = T_BRICK; if (this.origTerrain) this.origTerrain[i] = T_BRICK; }
  };

  // ---- respawning: never into a wall, a pit or rubble (the nearest cell that leads out instead)
  const spawnBase = P.mazeSpawnPoint;
  P.mazeSpawnPoint = function (p) {
    const at = spawnBase.call(this, p), m = this.maze;
    if (!m || !m.mzOn) return at;
    let ok = true;
    for (let ty = at[1] >> 4; ty <= (at[1] + 15) >> 4; ty++) for (let tx = at[0] >> 4; tx <= (at[0] + 15) >> 4; tx++) if (this.mzSolidTile(tx, ty)) ok = false;
    if (ok) return at;
    const D = this.mzDField(), c0 = this.mzCellOf(at[0] + 8, at[1] + 8);
    let best = -1, bd = 1e9;
    for (let c = 0; c < D.length; c++) {
      if (D[c] < 0) continue;
      const d = Math.abs(c % m.MW - c0 % m.MW) + Math.abs(((c / m.MW) | 0) - ((c0 / m.MW) | 0));
      if (d < bd) { bd = d; best = c; }
    }
    if (best < 0) return at;
    const [x, y] = mzCellXY(m, best);
    p.mazeBack = p.mazeNow = [x, y];
    return this.mazeSlot(x, y, p.i);
  };

  // ---- every frame (on the host): the world first, then maze.js (patrols, reinforcements, the exit)
  const updateBase = P.updateMaze;
  P.updateMaze = function () {
    if (this.maze.mzOn) this.mzUpdate();
    if (this.maze.escaped) return;
    const before = new Set(this.spawns);
    updateBase.call(this);
    if (this.maze.mzOn) this.mzFixSpawns(before);   // (only maze.js's reinforcements: others place their own)
  };
  mzUpdateMaze = P.updateMaze;

  // ---- the exit: sealed until the cells are in (and a lair's beast is dead); then the time and the stars
  const escapeBase = P.mazeEscape;
  P.mazeEscape = function (t, secret) {
    const m = this.maze;
    if (m.mzOn && !secret && this.mazeSealed()) {
      if (this.frame - (m.sealMsgAt || -999) > 90) {
        m.sealMsgAt = this.frame;
        const need = m.cellsNeed - m.cellsGot;
        this.popups.push({ x: m.ex + 16, y: m.ey - 6, text: need > 0 ? 'SEALED: ' + need + ' POWER CELL' + (need > 1 ? 'S' : '') + ' TO GO' : 'SEALED: SLAY THE BEAST', label: true, color: '#F83800', t: 0, delay: 0, life: 90 });
        Sound.play('mzLocked');
      }
      return;
    }
    if (m.mzOn) {
      const f = this.frame - m.t0, s = f / 60;
      const stars = secret ? 3 : s <= m.par[1] ? 3 : s <= m.par[0] ? 2 : 1;
      m.result = { f, stars, par: m.par, secret: !!secret, best: 0 };
      m.collapse = null;
      // the best per maze number (the mode's records, main.js)
      if (Net.role !== 'client' && typeof Game !== 'undefined' && Game.mode === 'maze' && Game.stage === this) {
        const rec = STORE.get(MODE_KEY, {}), all = rec.mazeStars || {};
        m.result.best = all[this.num] || 0;
        if (stars > m.result.best) { all[this.num] = stars; rec.mazeStars = all; STORE.set(MODE_KEY, rec); m.result.newBest = true; }
        if (secret) Game.mzSkip = this.num;
      }
      if (secret) {
        this.popups.push({ x: t.x + 8, y: t.y - 16, text: 'SECRET EXIT! SKIP A MAZE', label: true, color: '#F878F8', t: 0, delay: 0, life: 150 });
        Sound.play('mzSecret');
      }
    }
    escapeBase.call(this, t);
  };
})();

// ------------------------------------------------------------ the world at work (host)
// marker keys per player (free in every layout; README); gamepads: either stick button
const MZ_MARK_KEYS = { solo: ['KeyQ', 'KeyE'], 0: ['KeyQ', 'KeyE'], 1: ['BracketRight', 'Backslash', 'Numpad2', 'NumpadAdd'], 2: ['Digit8', 'Digit9'], 3: ['Digit5', 'Digit6'] };
const MZ_PAD_MARK = [10, 11];
const mzPadPrev = {};
// first-meet cards (cards.js): 'm' + index
const MZ_CARDS = [
  { name: 'LOCKED GATE', desc: 'THE KEY OF ITS COLOUR OPENS IT' },
  { name: 'PRESSURE PLATE', desc: 'OPENS ITS STEEL DOOR FOR 20 S' },
  { name: 'MOVING WALL', desc: 'SHIFTS EVERY 15 S: LISTEN FOR THE RUMBLE' },
  { name: 'CRACKED FLOOR', desc: 'GIVES WAY BEHIND YOU' },
  { name: 'TORCH', desc: 'LIGHTS UP AS YOU PASS, STAYS LIT' },
  { name: 'KEY', desc: 'THE WHOLE TEAM CARRIES IT' },
  { name: 'POWER CELL', desc: 'BRING 3 TO UNSEAL THE EXIT' },
  { name: 'LAMP FUEL', desc: 'YOUR LAMP BURNS DOWN: REFILL IT' },
  { name: 'MAP SCROLL', desc: 'THE WHOLE MAZE ON THE MAP FOR 15 S' },
  { name: 'BRIDGE CRATE', desc: 'LAYS ONE BRIDGE OVER THE RIVER' },
  { name: 'RIVER', desc: 'FIND THE BRIDGE CRATE TO CROSS' },
  { name: 'SEALED EXIT', desc: 'OPENS FOR 3 POWER CELLS' },
  { name: 'VAULT', desc: 'SEALED: A FALLEN MINOTAUR OPENS IT' },
  { name: 'LAIR', desc: 'THE EXIT OPENS WHEN ITS BEAST IS DEAD' },
];
const MZ_CARD_OF = { key: 5, cell: 6, fuel: 7, scroll: 8, bridge: 9 };

(function () {
  const P = Stage.prototype;
  const pop = (st, x, y, text, color = COL.white, life = 90) => st.popups.push({ x, y, text, label: true, color, t: 0, delay: 0, life });

  Object.assign(P, {
    mzUpdate() {
      const m = this.maze, ps = this.tanks.filter(t => t.isPlayer && !t.ally && t.alive);
      if (m.shake > 0) m.shake--;
      if (m.scrollT > 0) m.scrollT--;
      for (const g of m.gates) if (g.open && g.t < 60) g.t++;
      for (const mv of m.movers) if (mv.anim > 0) mv.anim--;
      for (const p of m.puffs || []) p.t++;
      if (m.puffs) m.puffs = m.puffs.filter(p => p.t < 30);
      if (m.escaped) return;
      this.mzPickups(ps);
      this.mzGates(ps);
      this.mzDoors(ps);
      if (!m.collapse) this.mzMovers(ps);
      this.mzCracks(ps);
      this.mzTorches(ps);
      this.mzLamps(ps);
      this.mzRivers();
      this.mzKeys();
      this.mzMarkers();
      this.mzSecretExit(ps);
      this.mzFinale(ps);
      if (this.frame % 20 === 0) this.mzMeet(ps);
      if (this.frame % 4 === 0) for (const t of ps) this.mzLookAround(t);
    },

    // a puff of dust (drawn by everyone, sent to guests)
    mzDust(x, y, n = 8) {
      const m = this.maze;
      (m.puffs || (m.puffs = [])).push({ x: Math.round(x), y: Math.round(y), n, t: 0 });
      if (m.puffs.length > 40) m.puffs.shift();
    },

    // ---- things on the floor: drive over them
    mzPickups(ps) {
      const m = this.maze;
      let took = false;
      for (const it of m.items) {
        const t = ps.find(o => overlap(o.x, o.y, 16, 16, it.x + 3, it.y + 3, 10, 10));
        if (t) { it.gone = took = true; this.mzTake(it, t); }
      }
      if (took) m.items = m.items.filter(it => !it.gone);
    },
    mzTake(it, t) {
      const m = this.maze, p = t.player, x = it.x + 8, y = it.y;
      switch (it.k) {
        case 'key':
          if (!m.keys.includes(it.c)) m.keys.push(it.c);
          if (!m.keysEver.includes(it.c)) m.keysEver.push(it.c);
          m.keyLost[it.c] = 0;
          this.addScore(p, 500); this.addXp(p, 10);
          pop(this, x, y, it.c.toUpperCase() + ' KEY', MZ_KEY_COL[it.c][0], 120);
          Sound.play('mzKey');
          break;
        case 'cell':
          m.cellsGot = Math.min(m.cellsNeed, m.cellsGot + 1);
          this.addScore(p, 500); this.addXp(p, 10);
          pop(this, x, y, 'POWER CELL ' + m.cellsGot + '/' + m.cellsNeed, '#58F898', 120);
          Sound.play('mzCell');
          break;
        case 'bridge':
          p.bridges = (p.bridges || 0) + 1;
          pop(this, x, y, 'BRIDGE KIT: DRIVE INTO THE RIVER', COL.gold, 150);
          Sound.play('pickup');
          break;
        case 'fuel': p.mzFuel = 1; this.addScore(p, 100); pop(this, x, y, 'LAMP FUEL', '#F8B800'); Sound.play('mzFuel'); break;
        case 'scroll': m.scrollT = MZ_SCROLL_TIME; this.addScore(p, 100); pop(this, x, y, 'MAP SCROLL', '#F8D878', 120); Sound.play('mzScroll'); break;
        case 'coin': this.addScore(p, 500); this.popups.push({ x, y: y + 4, text: '500', t: 0, delay: 0 }); Sound.play('coin'); break;
        case 'weapon': this.applyPowerup(t, { type: PU.WEAPON, x: it.x, y: it.y, weapon: it.w || this.crateWeapon() }); break;
        case 'life': this.applyPowerup(t, { type: PU.TANK, x: it.x, y: it.y }); break;
        case 'pu': this.applyPowerup(t, { type: it.pu | 0, x: it.x, y: it.y }); break;
      }
    },

    // ---- gates open for their key (and for anyone once the maze is coming down)
    mzGates(ps) {
      const m = this.maze;
      for (const g of m.gates) {
        if (g.open) continue;
        const t = ps.find(o => overlap(o.x - 2, o.y - 2, 20, 20, g.x, g.y, g.w, g.h));
        if (!t) continue;
        if (m.keys.includes(g.c) || m.collapse) this.mzOpenGate(g);
        else if (this.frame - (g.msgAt || -999) > 120) {
          g.msgAt = this.frame;
          pop(this, g.x + g.w / 2, g.y - 4, 'NEEDS THE ' + g.c.toUpperCase() + ' KEY', MZ_KEY_COL[g.c][2]);
          Sound.play('mzLocked');
        }
      }
    },
    mzOpenGate(g) {
      g.open = 1; g.t = 0;
      this.mzFill(g.x, g.y, g.w, g.h, T_EMPTY);
      pop(this, g.x + g.w / 2, g.y - 4, g.c.toUpperCase() + ' GATE OPEN', MZ_KEY_COL[g.c][0]);
      Sound.play('mzGate');
    },

    // ---- pressure plates: the door stays open while someone's on the plate, then 20 s (ticking) and it slams
    mzDoors(ps) {
      const m = this.maze;
      for (const d of m.doors) {
        if (d.jam) continue;
        if (m.collapse) { d.jam = true; d.timer = 0; if (!d.open) this.mzDoorOpen(d); continue; }   // the maze is coming down: they jam open
        const on = ps.some(t => overlap(t.x + 4, t.y + 4, 8, 8, d.px + 4, d.py + 4, 24, 24));
        if (on) {
          if (!d.held) Sound.play('mzPlate');
          d.held = true;
          if (!d.open) this.mzDoorOpen(d);
          d.timer = MZ_DOOR_TIME;
          continue;
        }
        d.held = false;
        if (!d.open) continue;
        if (d.timer > 0) {
          d.timer--;
          if (d.timer > 0 && (d.timer % 60 === 0 || (d.timer < 300 && d.timer % 30 === 0))) Sound.play('mzTick');
        } else if (!this.tanks.some(t => t.alive && overlap(t.x, t.y, 16, 16, d.x - 1, d.y - 1, d.w + 2, d.h + 2))) {
          d.open = false;
          this.mzFill(d.x, d.y, d.w, d.h, T_STEEL);
          this.mzDust(d.x + d.w / 2, d.y + d.h / 2, 6);
          Sound.play('mzDoor');
        }
      }
    },
    mzDoorOpen(d) {
      d.open = true;
      this.mzFill(d.x, d.y, d.w, d.h, T_EMPTY);
      Sound.play('mzDoor');
      if (!d.jam) pop(this, d.px + 16, d.py - 4, 'A DOOR OPENS: 20 S', d.col);
    },

    // ---- moving walls: a rumble, then one wall slides or swings into the other's place (never onto a tank)
    mzMovers(ps) {
      const m = this.maze;
      for (const mv of m.movers) {
        const left = mv.next - this.frame;
        if (left > MZ_WARN) continue;
        const near = ps.some(t => Math.abs(t.x + 8 - mv.pv[0]) + Math.abs(t.y + 8 - mv.pv[1]) < 200);
        if (left > 0) {
          if (near && left % 40 === 0) Sound.play('mzRumble');
          if (left % 20 === 0) { const r = mv.s ? mv.a : mv.b; this.mzDust(r.x + r.w / 2, r.y + r.h / 2, 3); }
          continue;
        }
        const close = mv.s ? mv.b : mv.a, open = mv.s ? mv.a : mv.b;   // as built (s 0) A is open and B shut
        if (this.tanks.some(t => t.alive && overlap(t.x, t.y, 16, 16, close.x - 1, close.y - 1, close.w + 2, close.h + 2))) continue;   // wait till it's clear
        this.mzFill(open.x, open.y, open.w, open.h, T_EMPTY);
        this.mzFill(close.x, close.y, close.w, close.h, T_STEEL);
        mv.s ^= 1; mv.next = this.frame + MZ_MOVE_EVERY; mv.anim = 16;
        this.mzDust(close.x + close.w / 2, close.y + close.h / 2, 10);
        this.mzDust(open.x + open.w / 2, open.y + open.h / 2, 6);
        if (near) { Sound.play('mzWall'); m.shake = Math.max(m.shake, 10); }
      }
    },

    // ---- cracked floor: you drive over it once; when everyone's off, it falls in
    mzCracks(ps) {
      const m = this.maze;
      for (const ck of m.cracks) {
        if (ck.st === 3) continue;
        if (ck.st === 0) {
          if (ps.some(t => overlap(t.x + 2, t.y + 2, 12, 12, ck.x, ck.y, 32, 32))) { ck.st = 1; Sound.play('mzCrack'); }
          continue;
        }
        const on = this.tanks.some(t => t.alive && overlap(t.x, t.y, 16, 16, ck.x - 1, ck.y - 1, 34, 34));
        if (ck.st === 1) { if (!on) { ck.st = 2; ck.t = 45; } continue; }
        if (on) { ck.st = 1; continue; }   // back on it: it waits till you're off again
        if (--ck.t > 0) continue;
        ck.st = 3;
        this.mzFill(ck.x, ck.y, 32, 32, T_STEEL);
        this.mzDust(ck.x + 16, ck.y + 16, 14);
        this.mzLoseItems(ck.x, ck.y);
        Sound.play('mzCollapse');
        m.shake = Math.max(m.shake, 8);
      }
    },
    // whatever lay in a cell that fell in or caved in (a key or a cell goes back where it first lay)
    mzLoseItems(x, y) {
      const m = this.maze, lost = m.items.filter(it => overlap(it.x, it.y, 16, 16, x, y, 32, 32));
      if (!lost.length) return;
      m.items = m.items.filter(it => !lost.includes(it));
      for (const it of lost) {
        if ((it.k !== 'key' && it.k !== 'cell' && it.k !== 'bridge') || (it.k === 'bridge' && m.rivers[it.river] && m.rivers[it.river].bridged)) continue;
        const [hx, hy] = this.mzSafeSpot(it.home0);
        this.mzAddItem(it.k, hx + 8, hy + 8, { c: it.c, river: it.river, req: it.req, home0: [hx, hy] });
      }
    },
    // where something the team can't do without can lie: its spot if its cell is still open, else beside a player
    mzSafeSpot(at) {
      const m = this.maze;
      if (at) { const c = this.mzCellOf(at[0] + 8, at[1] + 8); if (this.mzCellOpen(c % m.MW, (c / m.MW) | 0)) return at; }
      const t = this.tanks.find(o => o.isPlayer && o.alive && !o.ally), [cx, cy] = t ? this.mazeCellAt(t.x + 8, t.y + 8) : [m.sx, m.sy];
      return [cx + 8, cy + 8];
    },

    // ---- torches light up as you pass and stay lit
    mzTorches(ps) {
      if (this.frame % 8) return;
      const m = this.maze;
      for (const tc of m.torches) {
        if (tc.lit || !ps.some(t => Math.abs(t.x + 8 - tc.lx) + Math.abs(t.y + 8 - tc.ly) < 40)) continue;
        tc.lit = 1; m.torchVer++;
        Sound.play('mzTorch');
      }
    },

    // ---- lamp fuel: it burns down slowly while you drive about
    mzLamps(ps) {
      for (const t of ps) {
        const p = t.player, was = p.mzFuel === undefined ? 1 : p.mzFuel;
        p.mzFuel = Math.max(0, was - 1 / MZ_FUEL_TIME);
        if (was > 0.2 && p.mzFuel <= 0.2) pop(this, t.x + 8, t.y - 6, 'LAMP LOW: FIND FUEL', '#F8B800', 120);
        else if (was > 0 && p.mzFuel <= 0) pop(this, t.x + 8, t.y - 6, 'LAMP OUT!', '#F83800', 120);
      }
    },
    mzFuelOf(p) { const m = this.maze; return m && m.fuel ? (m.fuel[p.i] === undefined ? 1 : m.fuel[p.i]) : p.mzFuel === undefined ? 1 : p.mzFuel; },
    mzLampR(t) { return t.ally ? 36 : MZ_LAMP[0] + MZ_LAMP[1] * this.mzFuelOf(t.player); },

    // ---- rivers: bridged yet? If not and the team has no kit left, a new crate where the first one lay
    mzRivers() {
      const m = this.maze;
      if (!m.rivers.length || this.frame % 30) return;
      m.rivers.forEach((rv, k) => {
        if (!rv.bridged) rv.bridged = rv.cols.some(i => [1, 2].some(dx => this.get((i * 3 + dx) * 4 + 2, (rv.row * 3 + 1) * 4 + 2) === T_BRIDGE));
        if (rv.bridged || !rv.home) return;
        if (m.items.some(it => it.k === 'bridge' && it.river === k) || this.players.some(p => !p.out && p.bridges > 0)) return;
        const [hx, hy] = this.mzSafeSpot(rv.home);
        this.mzAddItem('bridge', hx + 8, hy + 8, { river: k, req: true, home0: [hx, hy] });
        pop(this, hx + 8, hy - 4, 'A NEW BRIDGE CRATE', COL.gold);
      });
    },

    // ---- a stolen key that nobody brings back turns up again where it first lay
    mzKeys() {
      if (this.frame % 60) return;
      const m = this.maze;
      for (const c of m.keyCols) {
        const needed = m.gates.some(g => g.route && !g.open && g.c === c);
        const missing = !m.keys.includes(c) && !m.items.some(it => it.k === 'key' && it.c === c);
        if (!needed || !missing || !m.keysEver.includes(c)) { m.keyLost[c] = 0; continue; }
        m.keyLost[c] = (m.keyLost[c] || 0) + 60;
        if (m.keyLost[c] < MZ_KEY_BACK || !m.keyHome[c]) continue;
        m.keyLost[c] = 0;
        const [hx, hy] = this.mzSafeSpot(m.keyHome[c]);
        this.mzAddItem('key', hx + 8, hy + 8, { c, req: true, home0: [hx, hy] });
        pop(this, hx + 8, hy - 4, 'THE ' + c.toUpperCase() + ' KEY IS BACK', MZ_KEY_COL[c][0], 150);
      }
    },

    // ---- markers on the map: a player's button drops one where they are (again on the same spot takes it away)
    mzMarkers() {
      for (const p of this.players) {
        const t = p.tank;
        if (p.out || !t || !t.alive || !this.mzMarkPressed(p.i)) continue;
        const m = this.maze, [cx, cy] = this.mazeCellAt(t.x + 8, t.y + 8), x = cx + 16, y = cy + 16;
        const k = m.markers.findIndex(mk => mk.x === x && mk.y === y);
        if (k >= 0) { m.markers.splice(k, 1); pop(this, x, y - 12, 'MARK OFF', COL.lgrey, 60); }
        else {
          m.markers.push({ x, y, i: p.i });
          if (m.markers.length > MZ_MARKS) m.markers.shift();
          pop(this, x, y - 12, 'MARK ' + m.markers.length + '/' + MZ_MARKS, PALS[Config.playerPal(p.i)][1], 60);
        }
        Sound.play('mzMark');
      }
    },
    mzMarkPressed(i) {
      const r = Input.remote[i];
      if (r) { const v = r.mk || 0, was = r._mzmk; r._mzmk = v; return was !== undefined && v !== was; }
      return mzLocalMark(i);
    },

    // ---- the secret exit: behind a wall that only looks like steel
    mzSecretExit(ps) {
      const s = this.maze.secret;
      if (!s) return;
      if (!s.found && this.frame % 10 === 0) {
        const w = s.wall;
        let left = 0;
        for (let cy = w.y >> 2; cy < (w.y + w.h) >> 2; cy++) for (let cx = w.x >> 2; cx < (w.x + w.w) >> 2; cx++) if (this.get(cx, cy) === T_BRICK) left++;
        if (left < (w.w * w.h) / 16 * 0.75) { s.found = true; pop(this, s.x + 16, s.y - 4, 'A SECRET EXIT!', '#F878F8', 150); Sound.play('secret'); }
      }
      const t = ps.find(o => overlap(o.x, o.y, 16, 16, s.x + 8, s.y + 8, 16, 16));
      if (t) this.mazeEscape(t, true);
    },

    // ---- the collapse: once the exit's open and every key and crossing is behind you
    mzFinale(ps) {
      const m = this.maze, sealed = this.mazeSealed();
      if (m.wasSealed && !sealed) {
        pop(this, m.ex + 16, m.ey - 6, 'THE EXIT IS OPEN!', '#58F898', 150);
        Sound.play('mzSeal');
      }
      m.wasSealed = sealed;
      const c = m.collapse;
      if (!c) {
        if (m.collapsed || sealed || !ps.length || !m.keyCols.every(k => m.keysEver.includes(k)) || !m.rivers.every(r => r.bridged)) return;
        this.mzCollapseStart(ps);
        return;
      }
      c.t--;
      if (this.frame % 40 === 0) this.mzCollapseStep(ps);
      if (this.frame % 100 === 0) { m.shake = Math.max(m.shake, 6); Sound.play('mzRumble'); }
      if (c.t > 0 && c.t <= 600 && c.t % 60 === 0) Sound.play('mzTick');
      if (c.t > 0) return;
      // too slow: the ceiling comes down on everyone still in here (a tank each), and the clock starts again, shorter
      for (const t of ps) { t.shield = 0; t.plates = 0; t.ship = false; t.frozen = 0; this.hitPlayer(t); }
      c.fails = (c.fails || 0) + 1;
      c.total = Math.max(30 * 60, Math.round(c.total * 2 / 3)); c.t = c.total;
      m.shake = 40;
      const [cx, cy] = this.mzCam || [0, 0];
      pop(this, cx + VIEW_W / 2, cy + VIEW_H / 2, 'THE CEILING CAVES IN!', '#F83800', 150);
      Sound.play('mzCaveIn');
    },
    mzCollapseStart(ps) {
      const m = this.maze, D = this.mzDField();
      // the locks shake loose, the doors jam open, the machinery stops
      for (const g of m.gates) if (!g.open) this.mzOpenGate(g);
      let far = 0;
      for (const t of ps) far = Math.max(far, D[this.mzCellOf(t.x + 8, t.y + 8)]);
      const sk = Config.get('skill'), lv = sk === AUTO_SKILL ? Math.max(0, Math.min(4, Math.round(AutoSkill.rating))) : sk;
      const secs = Math.round(Math.max(60, 20 + 1.6 * far) * [1.5, 1.25, 1, 0.9, 0.8][lv] / 5) * 5;
      m.collapse = { t: secs * 60, total: secs * 60, fails: 0 };
      m.collapsed = true;
      m.shake = 30;
      const [cx, cy] = this.mzCam || [ps[0].x, ps[0].y];
      pop(this, cx + VIEW_W / 2, cy + VIEW_H / 2 - 20, 'THE MAZE IS COLLAPSING!', '#F83800', 180);
      pop(this, cx + VIEW_W / 2, cy + VIEW_H / 2 - 8, 'GET OUT!', COL.gold, 180);
      Sound.play('mzAlarm');
    },
    // rubble falls behind the team: in cells farther from the way out than anyone, near enough to see it go
    mzCollapseStep(ps) {
      const m = this.maze, D = this.mzDField(), MW = m.MW;
      const pc = ps.map(t => this.mzCellOf(t.x + 8, t.y + 8));
      let dP = -1;
      for (const c of pc) dP = Math.max(dP, D[c]);
      const keepOut = new Set(this.pads.map(p => this.mzCellOf(p.x + 8, p.y + 8)));
      keepOut.add(this.mzCellOf(m.ex + 16, m.ey + 16));
      for (const r of m.rooms) for (let y = r.y + 16; y < r.y + r.h; y += 48) for (let x = r.x + 16; x < r.x + r.w; x += 48) keepOut.add(this.mzCellOf(x, y));
      const cand = [];
      for (let c = 0; c < D.length; c++) {
        if (keepOut.has(c) || (D[c] >= 0 && D[c] <= dP + 2)) continue;
        const i = c % MW, j = (c / MW) | 0;
        let near = 99;
        for (const q of pc) near = Math.min(near, Math.abs(q % MW - i) + Math.abs(((q / MW) | 0) - j));
        if (near > 7 || near < 2 || !this.mzCellOpen(i, j)) continue;
        const [x, y] = mzCellXY(m, c);
        if (isBelt(this.get((x >> 2) + 2, (y >> 2) + 2)) || this.tanks.some(t => t.alive && overlap(t.x, t.y, 16, 16, x - 2, y - 2, 36, 36))) continue;
        cand.push([near + Math.random(), x, y]);
      }
      cand.sort((a, b) => a[0] - b[0]);
      for (const [, x, y] of cand.slice(0, 2)) {
        this.mzFill(x, y, 32, 32, T_STEEL);
        m.rubble.push({ x, y });
        this.mzDust(x + 16, y + 16, 14);
        this.mzLoseItems(x, y);
      }
      if (cand.length) { Sound.play('mzCollapse'); m.shake = Math.max(m.shake, 8); }
    },

    // ---- reinforcements must turn up in an open cell (not in water, rubble, a pit or a sealed room)
    mzFixSpawns(before) {
      const m = this.maze;
      let drop = false;
      for (const s of this.spawns) {
        if (!s.enemy || before.has(s)) continue;
        let bad = m.rooms.some(r => r.kind !== 'arena' && !(r.kind === 'vault' && m.vault && m.vault.open) && overlap(s.x, s.y, 16, 16, r.x, r.y, r.w, r.h));
        for (let ty = s.y >> 4; ty <= (s.y + 15) >> 4 && !bad; ty++) for (let tx = s.x >> 4; tx <= (s.x + 15) >> 4; tx++) if (this.mzSolidTile(tx, ty)) bad = true;
        if (bad) { s.bad = drop = true; this.queue.unshift(s.enemy); }
      }
      if (drop) this.spawns = this.spawns.filter(s => !s.bad);
    },

    // ---- first-meet cards for what's new down here
    mzMeet(ps) {
      const m = this.maze, near = (x, y, r = 72) => ps.some(t => Math.abs(t.x + 8 - x) < r && Math.abs(t.y + 8 - y) < r);
      if (m.gates.some(g => !g.open && near(g.x + g.w / 2, g.y + g.h / 2))) this.encounter('m0');
      if (m.doors.some(d => near(d.px + 16, d.py + 16))) this.encounter('m1');
      if (m.movers.some(mv => near(mv.pv[0], mv.pv[1], 96))) this.encounter('m2');
      if (m.cracks.some(c => c.st < 3 && near(c.x + 16, c.y + 16, 56))) this.encounter('m3');
      if (m.torches.some(t => near(t.x + 8, t.y + 8, 56))) this.encounter('m4');
      for (const it of m.items) if (MZ_CARD_OF[it.k] && near(it.x + 8, it.y + 8, 48)) this.encounter('m' + MZ_CARD_OF[it.k]);
      if (m.rivers.some(rv => ps.some(t => Math.abs(t.y + 8 - (rv.row * 3 + 2) * 16) < 56))) this.encounter('m10');
      if (near(m.ex + 16, m.ey + 16, 96) && this.mazeSealed()) this.encounter(m.lair && m.cellsGot >= m.cellsNeed ? 'm13' : 'm11');
      if (m.vault && !m.vault.open && near(m.vault.x + m.vault.w / 2, m.vault.y + m.vault.h / 2, 90)) this.encounter('m12');
      if (m.lair && m.rooms.some(r => r.kind === 'arena' && near(r.x + r.w / 2, r.y + r.h / 2, 120))) this.encounter('m13');
    },
  });
})();

// is player i's marker button just pressed at this computer? (keys free in the player's layout, or a stick button)
function mzLocalMark(i) {
  if (typeof Input === 'undefined') return false;
  const solo = Input.localCount() === 1, keys = (solo ? MZ_MARK_KEYS.solo : MZ_MARK_KEYS[i]) || [];
  const mine = Keymap.custom(i) ? Keymap.get(i) : null;
  let hit = keys.some(c => Input.just.has(c) && !(mine && ACTIONS.some(a => (mine[a] || []).includes(c))));
  for (const pd of Input.padsFor(i)) {
    const k = pd.gp ? pd.gp.index : 0, on = !!(pd.raw && MZ_PAD_MARK.some(b => pd.raw[b]));
    if (on && !mzPadPrev[k]) hit = true;
    mzPadPrev[k] = on;
  }
  return hit;
}

// ------------------------------------------------------------ drawing
// item pictures, 16 x 16 ('.' clear)
const MZ_SPR = {
  key: ['................', '................', '................', '................', '.oooo...........', 'oLLXXo..........', 'oLooXooooooooo..', 'oXooXLLLLLLLLXo.',
    'oXooXXXXXXXXXXo.', 'oXXXXooooXXoXXo.', '.oooo...oXXoXXo.', '.........oo.oo..', '................', '................', '................', '................'],
  cell: ['................', '......oooo......', '......oCCo......', '....oooooooo....', '....oWGGGGGo....', '....oWLLLLGo....', '....oGGGGGGo....', '....oGLLLLGo....',
    '....oGGGGGGo....', '....oGLLLLGo....', '....oGGGGGGo....', '....oGLLLLGo....', '....oGGGGGGo....', '....oooooooo....', '................', '................'],
  fuel: ['................', '......oooo......', '.....oHooHo.....', '....ooooooooo...', '...oHHRRRRRRDo..', '...oHRRRRRRRDo..', '...oHRYYYYRRDo..', '...oHRYooYRRDo..',
    '...oHRYYYYRRDo..', '...oHRRRRRRRDo..', '...oHRRRRRRRDo..', '...oRRRRRRRDDo..', '...oDDDDDDDDDo..', '....ooooooooo...', '................', '................'],
  scroll: ['................', '................', '................', '.oo..........oo.', 'oRRooooooooooRRo', 'oRSPPPPPPPPPPSRo', 'oRSPoPPoPPoPPSRo', 'oRSPPPPPPPPPPSRo',
    'oRSPooPoPPoPPSRo', 'oRSPPPPPPXXPPSRo', 'oRSPPPPPPXXPPSRo', 'oRRooooooooooRRo', '.oo..........oo.', '................', '................', '................'],
  bridge: ['................', '.oooooooooooooo.', '.oLLLLLLLLLLLLo.', '.oLDDDDDDDDDDDo.', '.oLWWWWWWWWWWDo.', '.oLBBBBBBBBBBDo.', '.oLBBBBBBBBBBDo.', '.oLWBWWWWWWBWDo.',
    '.oLQBQQQQQQBQDo.', '.oLQBqQQqQQBQDo.', '.oLQQQQQQQQQQDo.', '.oLqQQqQQQqQQDo.', '.oLDDDDDDDDDDDo.', '.oDDDDDDDDDDDDo.', '.oooooooooooooo.', '................'],
};
const MZ_SPR_COL = {
  cell: { o: '#0C2C14', G: '#00A844', L: '#B8F818', W: '#F8F8F8', C: '#ADADAD' },
  fuel: { o: '#3C0800', R: '#D82800', H: '#F87858', D: '#880000', Y: '#F8B800' },
  scroll: { o: '#3C2814', P: '#F8D8A0', S: '#C8A060', R: '#A0703C', X: '#D82800' },
  bridge: { o: '#2C1800', W: '#C88C44', D: '#8C5C24', L: '#E8B070', B: '#5C3410', Q: '#2C68D8', q: '#A8C8F8' },
};
const mzSprCache = {};
function mzSprite(k, color) {
  const key = k + (color || '');
  if (!mzSprCache[key]) {
    const cm = k === 'key' ? { o: MZ_KEY_COL[color][1], X: MZ_KEY_COL[color][0], L: MZ_KEY_COL[color][2] } : MZ_SPR_COL[k];
    mzSprCache[key] = paintRows(MZ_SPR[k], k === 'key' ? Object.assign({ o: '#000000' }, cm) : cm);
  }
  return mzSprCache[key];
}
// tiny 3 x 5 digits for the side panel and the map
const MZ_DIG = { 0: '111101101101111', 1: '010110010010111', 2: '111001111100111', 3: '111001111001111', 4: '101101111001001', 5: '111100111001111',
  6: '111100111101111', 7: '111001001010010', 8: '111101111101111', 9: '111101111001111', '/': '001001010100100', ':': '000010000010000' };
function mzTiny(ctx, s, x, y, col) {
  ctx.fillStyle = col;
  for (const ch of String(s)) {
    const b = MZ_DIG[ch];
    if (b) for (let k = 0; k < 15; k++) if (b[k] === '1') ctx.fillRect(x + k % 3, y + ((k / 3) | 0), 1, 1);
    x += ch === ':' ? 3 : 4;
  }
}
const MZ_STAR = ['...X...', '...X...', '..XXX..', 'XXXXXXX', '.XXXXX.', '.XX.XX.', 'X.....X'];
function mzStar(ctx, x, y, col) { ctx.fillStyle = col; MZ_STAR.forEach((r, j) => { for (let i = 0; i < 7; i++) if (r[i] === 'X') ctx.fillRect(x + i, y + j, 1, 1); }); }
// yellow and black stripes for a steel door
let mzHazardC = null;
function mzHazard() {
  if (mzHazardC) return mzHazardC;
  const c = makeCanvas(32, 32), x = c.getContext('2d');
  for (let y = 0; y < 32; y++) for (let i = 0; i < 32; i++) { x.fillStyle = ((i + y) >> 2) & 1 ? '#E8A800' : '#1C1C1C'; x.fillRect(i, y, 1, 1); }
  x.fillStyle = 'rgba(255,255,255,0.25)'; x.fillRect(0, 0, 32, 1); x.fillRect(0, 0, 1, 32);
  return (mzHazardC = c);
}
const mzHash = (a, b) => { let h = (a * 374761393 + b * 668265263) | 0; h = (h ^ (h >> 13)) * 1274126177; return ((h ^ (h >> 16)) >>> 0) / 4294967296; };

(function () {
  const P = Stage.prototype;

  // the exit pad, and under the tanks: plates, cracks, the arena's floor, things to pick up; then the walls' overlays
  const exitBase = P.renderMazeExit;
  P.renderMazeExit = function (ctx) {
    const m = this.maze;
    if (!m || !m.mzOn) { exitBase.call(this, ctx); return; }
    const [cx, cy] = this.mzCam || [0, 0];
    const vis = (x, y, w, h) => x + w > cx - 8 && x < cx + VIEW_W + 8 && y + h > cy - 8 && y < cy + VIEW_H + 8;
    this.mzRenderFloor(ctx, vis);
    exitBase.call(this, ctx);
    this.mzRenderSeal(ctx);
    this.mzRenderWalls(ctx, vis);
  };

  Object.assign(P, {
    mzRenderFloor(ctx, vis) {
      const m = this.maze, f = this.frame;
      // the lair's arena: a ring of old stains
      for (const r of m.rooms) {
        if (r.kind !== 'arena' || !vis(r.x, r.y, r.w, r.h)) continue;
        const ccx = r.x + r.w / 2, ccy = r.y + r.h / 2, R = Math.min(r.w, r.h) / 2 - 6;
        for (let a = 0; a < 64; a++) {
          const t = a / 64 * Math.PI * 2;
          ctx.fillStyle = a & 1 ? '#4C1C14' : '#3C140C';
          ctx.fillRect(Math.round(ccx + Math.cos(t) * R) - 1, Math.round(ccy + Math.sin(t) * R * 0.8) - 1, 3, 3);
        }
        ctx.fillStyle = '#2C0C08';
        for (let k = 0; k < 14; k++) ctx.fillRect(Math.round(r.x + 8 + mzHash(k, r.x) * (r.w - 16)), Math.round(r.y + 8 + mzHash(r.y, k) * (r.h - 16)), 2 + (k % 3), 2);
      }
      // pressure plates
      for (const d of m.doors) {
        if (!vis(d.px, d.py, 32, 32)) continue;
        const down = d.held ? 1 : 0, x = d.px + 5, y = d.py + 5;
        ctx.fillStyle = '#101010'; ctx.fillRect(x, y, 22, 22);
        ctx.fillStyle = down ? '#4C4C54' : '#7C7C88'; ctx.fillRect(x + 1 + down, y + 1 + down, 20 - down, 20 - down);
        ctx.fillStyle = down ? '#34343C' : '#A8A8B4'; ctx.fillRect(x + 1 + down, y + 1 + down, 20 - down, 1); ctx.fillRect(x + 1 + down, y + 1 + down, 1, 20 - down);
        const lit = d.open && ((f >> 3) & 1 || d.held || d.jam);
        ctx.fillStyle = lit ? d.col : '#2C2C30';
        for (let k = 0; k < 4; k++) ctx.fillRect(x + 11 - k + down, y + 7 + k + down, 1 + k * 2, 1), ctx.fillRect(x + 11 - k + down, y + 14 - k + down, 1 + k * 2, 1);
      }
      // cracked floor
      for (const ck of m.cracks) {
        if (ck.st === 3 || !vis(ck.x, ck.y, 32, 32)) continue;
        const sh = ck.st === 2 ? ((f >> 1) & 1) : 0, x = ck.x + sh, y = ck.y;
        // chipped light edges, dark gaps (more of them once it's been driven over)
        const lines = [[4, 6, 9, 1], [12, 6, 1, 8], [12, 14, 10, 1], [21, 9, 1, 6], [6, 20, 7, 1], [12, 20, 1, 8], [22, 15, 6, 1], [3, 26, 6, 1]];
        const all = ck.st ? lines.concat([[16, 2, 1, 4], [26, 21, 1, 7], [6, 10, 1, 7], [16, 24, 8, 1], [27, 4, 3, 1]]) : lines;
        ctx.fillStyle = 'rgba(200,190,170,0.55)';
        for (const [a, b, w, h] of all) ctx.fillRect(x + a - 1, y + b - 1, w + 1, h + 1);
        ctx.fillStyle = '#030303';
        for (const [a, b, w, h] of all) ctx.fillRect(x + a, y + b, Math.max(2, w), Math.max(2, h));
        if (ck.st === 2) { ctx.fillStyle = '#5C544C'; for (let k = 0; k < 5; k++) ctx.fillRect(x + 4 + ((k * 7 + f) % 24), y + 4 + ((k * 11 + f * 2) % 24), 2, 2); }
      }
      // what lies about
      for (const it of m.items) {
        if (!vis(it.x, it.y, 16, 16)) continue;
        const bob = it.k === 'key' || it.k === 'cell' || it.k === 'scroll' ? Math.round(Math.sin((f + it.id * 13) / 12)) : 0, x = it.x, y = it.y + bob;
        if (it.k === 'coin') {
          const w = Math.max(1, Math.round(Math.abs(Math.cos((f + it.id * 9) / 10)) * 10));
          ctx.fillStyle = '#7C4C00'; ctx.fillRect(x + 8 - (w >> 1) - 1, y + 3, w + 2, 10);
          ctx.fillStyle = '#F8B800'; ctx.fillRect(x + 8 - (w >> 1), y + 3, w, 10);
          ctx.fillStyle = '#FCE4A0'; if (w > 3) ctx.fillRect(x + 8 - (w >> 1) + 1, y + 4, 1, 8);
        } else if (it.k === 'weapon') drawPowerup(ctx, { type: PU.WEAPON, weapon: it.w }, x, y);
        else if (it.k === 'life') ctx.drawImage(Sprites.powerups[PU.TANK], x, y);
        else if (it.k === 'pu') ctx.drawImage(Sprites.powerups[it.pu | 0] || Sprites.powerups[0], x, y);
        else if (MZ_SPR[it.k]) {
          if (it.k === 'cell' && (f >> 4) & 1) { ctx.fillStyle = 'rgba(88,248,152,0.25)'; ctx.fillRect(x + 2, y, 12, 16); }
          ctx.drawImage(mzSprite(it.k, it.k === 'key' ? (MZ_KEY_COL[it.c] ? it.c : 'red') : null), x, y);
        }
        if ((it.k === 'key' || it.k === 'cell') && (f + it.id * 17) % 80 < 12) ctx.drawImage(Sprites.sparkle[((f + it.id * 17) % 80) >> 2 & 3], x + 4, y - 4);
      }
    },

    // the exit, sealed: red bars, a lock and the power cells still to bring
    mzRenderSeal(ctx) {
      const m = this.maze;
      if (!this.mazeSealed()) return;
      const x = m.ex, y = m.ey;
      ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(x, y, 32, 32);
      ctx.fillStyle = '#A80000';
      for (let k = 0; k < 4; k++) { ctx.fillRect(x + 3 + k * 8, y, 2, 32); }
      ctx.fillRect(x, y + 4, 32, 2); ctx.fillRect(x, y + 26, 32, 2);
      // the lock (or the beast's horns in a lair whose cells are in)
      if (m.lair && m.cellsGot >= m.cellsNeed) {
        ctx.fillStyle = '#F8F8F8';
        ctx.fillRect(x + 9, y + 10, 14, 10); ctx.fillRect(x + 6, y + 6, 3, 6); ctx.fillRect(x + 23, y + 6, 3, 6); ctx.fillRect(x + 5, y + 5, 2, 2); ctx.fillRect(x + 25, y + 5, 2, 2);
        ctx.fillStyle = '#A80000'; ctx.fillRect(x + 12, y + 13, 2, 2); ctx.fillRect(x + 18, y + 13, 2, 2);
      } else {
        ctx.fillStyle = '#F0BC3C'; ctx.fillRect(x + 11, y + 13, 10, 8);
        ctx.fillStyle = '#A87C00'; ctx.fillRect(x + 12, y + 8, 2, 5); ctx.fillRect(x + 18, y + 8, 2, 5); ctx.fillRect(x + 12, y + 8, 8, 2);
        ctx.fillStyle = '#000000'; ctx.fillRect(x + 15, y + 15, 2, 4);
      }
      for (let k = 0; k < m.cellsNeed; k++) {
        ctx.fillStyle = '#000000'; ctx.fillRect(x + 6 + k * 8, y + 23, 6, 6);
        ctx.fillStyle = k < m.cellsGot ? '#58F898' : '#2C3C2C'; ctx.fillRect(x + 7 + k * 8, y + 24, 4, 4);
      }
    },

    // gates, doors, moving walls, pits, rubble, torches, the secret wall and the vault
    mzRenderWalls(ctx, vis) {
      const m = this.maze, f = this.frame, tex = themeTex(this.theme);
      for (const g of m.gates) {
        if ((g.open && g.t >= 20) || !vis(g.x, g.y, g.w, g.h)) continue;
        const [c0, c1, c2] = MZ_KEY_COL[g.c] || MZ_KEY_COL.red, vert = g.h > g.w;
        // opening: the bars sink into the wall at both ends
        const k = g.open ? g.t / 20 : 0, L = vert ? g.h : g.w, cut = Math.round(L / 2 * k);
        ctx.save(); ctx.beginPath();
        if (vert) { ctx.rect(g.x, g.y, g.w, cut ? L / 2 - cut : L); if (cut) ctx.rect(g.x, g.y + L / 2 + cut, g.w, L / 2 - cut); }
        else { ctx.rect(g.x, g.y, cut ? L / 2 - cut : L, g.h); if (cut) ctx.rect(g.x + L / 2 + cut, g.y, L / 2 - cut, g.h); }
        ctx.clip();
        ctx.fillStyle = '#0C0C10'; ctx.fillRect(g.x, g.y, g.w, g.h);
        for (let a = 2; a < L; a += 4) {   // bars
          ctx.fillStyle = c1; vert ? ctx.fillRect(g.x + 2, g.y + a, g.w - 4, 2) : ctx.fillRect(g.x + a, g.y + 2, 2, g.h - 4);
          ctx.fillStyle = c0; vert ? ctx.fillRect(g.x + 2, g.y + a, g.w - 4, 1) : ctx.fillRect(g.x + a, g.y + 2, 1, g.h - 4);
        }
        ctx.fillStyle = c0;
        if (vert) { ctx.fillRect(g.x + 2, g.y, 2, g.h); ctx.fillRect(g.x + g.w - 4, g.y, 2, g.h); } else { ctx.fillRect(g.x, g.y + 2, g.w, 2); ctx.fillRect(g.x, g.y + g.h - 4, g.w, 2); }
        // the lock plate, in the key's colour
        const lx = g.x + g.w / 2 - 5, ly = g.y + g.h / 2 - 5;
        ctx.fillStyle = '#000000'; ctx.fillRect(lx - 1, ly - 1, 12, 12);
        ctx.fillStyle = c2; ctx.fillRect(lx, ly, 10, 10);
        ctx.fillStyle = c0; ctx.fillRect(lx + 1, ly + 1, 8, 8);
        ctx.fillStyle = '#000000'; ctx.fillRect(lx + 3, ly + 2, 4, 3); ctx.fillRect(lx + 4, ly + 5, 2, 3);
        ctx.restore();
      }
      for (const d of m.doors) {
        if (!vis(d.x, d.y, d.w, d.h)) continue;
        const vert = d.h > d.w, L = vert ? d.h : d.w;
        if (d.open) {   // the door's frame on the pillars
          ctx.fillStyle = d.col;
          if (vert) { ctx.fillRect(d.x, d.y - 2, d.w, 2); ctx.fillRect(d.x, d.y + d.h, d.w, 2); } else { ctx.fillRect(d.x - 2, d.y, 2, d.h); ctx.fillRect(d.x + d.w, d.y, 2, d.h); }
          continue;
        }
        ctx.fillStyle = '#141414'; ctx.fillRect(d.x, d.y, d.w, d.h);
        ctx.drawImage(mzHazard(), 0, 0, d.w - 2, d.h - 2, d.x + 1, d.y + 1, d.w - 2, d.h - 2);
        ctx.fillStyle = 'rgba(0,0,0,0.35)'; vert ? ctx.fillRect(d.x + d.w - 3, d.y, 2, d.h) : ctx.fillRect(d.x, d.y + d.h - 3, d.w, 2);
        ctx.fillStyle = d.col;
        if (vert) { ctx.fillRect(d.x, d.y, d.w, 3); ctx.fillRect(d.x, d.y + d.h - 3, d.w, 3); } else { ctx.fillRect(d.x, d.y, 3, d.h); ctx.fillRect(d.x + d.w - 3, d.y, 3, d.h); }
        ctx.fillStyle = '#000000'; ctx.fillRect(d.x + d.w / 2 - 3, d.y + d.h / 2 - 3, 6, 6);
        ctx.fillStyle = d.col; ctx.fillRect(d.x + d.w / 2 - 2, d.y + d.h / 2 - 2, 4, 4);
      }
      // moving walls: a hub on their pillar, amber lights on the wall that moves; it shakes before it goes
      for (const mv of m.movers) {
        if (!vis(mv.pv[0] - 48, mv.pv[1] - 48, 96, 96)) continue;
        const shut = mv.s ? mv.a : mv.b, gap = mv.s ? mv.b : mv.a, warn = mv.next - f <= MZ_WARN && mv.next - f > 0 && !m.collapse;
        // grooves in the floor where the wall will go
        ctx.fillStyle = '#08080A';
        if (gap.w > gap.h) { ctx.fillRect(gap.x + 2, gap.y + 7, gap.w - 4, 2); } else { ctx.fillRect(gap.x + 7, gap.y + 2, 2, gap.h - 4); }
        const sh = warn ? ((f >> 1) & 1 ? 1 : -1) : 0;
        if (mv.anim > 0) {   // on its way: a block of wall travelling from where it stood
          const k = 1 - mv.anim / 16, x = gap.x + (shut.x - gap.x) * k, y = gap.y + (shut.y - gap.y) * k;
          ctx.fillStyle = '#000000'; ctx.fillRect(shut.x, shut.y, shut.w, shut.h);
          this.mzSteelBlock(ctx, tex, Math.round(x), Math.round(y), shut.w, shut.h);
        } else if (sh) this.mzSteelBlock(ctx, tex, shut.x + (shut.w > shut.h ? sh : 0), shut.y + (shut.w > shut.h ? 0 : sh), shut.w, shut.h);
        const on = warn ? (f >> 2) & 1 : (f >> 5) % 4 === 0;
        ctx.fillStyle = on ? '#F8B800' : '#7C5C00';
        if (shut.w > shut.h) { ctx.fillRect(shut.x + 2, shut.y + 7, 2, 2); ctx.fillRect(shut.x + shut.w - 4, shut.y + 7, 2, 2); } else { ctx.fillRect(shut.x + 7, shut.y + 2, 2, 2); ctx.fillRect(shut.x + 7, shut.y + shut.h - 4, 2, 2); }
        const [px, py] = mv.pv;
        ctx.fillStyle = '#1C1C20'; ctx.fillRect(px - 6, py - 6, 12, 12);
        ctx.fillStyle = mv.slide ? '#6C6C78' : '#8C7C5C'; ctx.fillRect(px - 5, py - 5, 10, 10);
        ctx.fillStyle = '#2C2C34';
        const a = (f / 30 + (mv.s ? 1.6 : 0)) % 6.28;
        for (let k = 0; k < 4; k++) ctx.fillRect(Math.round(px + Math.cos(a + k * 1.57) * 3) - 1, Math.round(py + Math.sin(a + k * 1.57) * 3) - 1, 2, 2);
        ctx.fillStyle = '#C8C8D0'; ctx.fillRect(px - 1, py - 1, 2, 2);
      }
      // fallen-in floor: a black hole with a broken rim
      for (const ck of m.cracks) if (ck.st === 3 && vis(ck.x, ck.y, 32, 32)) this.mzPit(ctx, ck.x, ck.y);
      for (const r of m.rubble) if (vis(r.x, r.y, 32, 32)) this.mzRubble(ctx, r.x, r.y);
      // torches
      for (const tc of m.torches) {
        if (!vis(tc.x, tc.y, 16, 16)) continue;
        const cx = tc.x + 8 + DXY[(tc.side + 2) % 4][0] * 5, cy = tc.y + 8 + DXY[(tc.side + 2) % 4][1] * 5;
        ctx.fillStyle = '#3C2410'; ctx.fillRect(cx - 1, cy - 2, 3, 6);
        ctx.fillStyle = '#7C5428'; ctx.fillRect(cx - 2, cy - 3, 5, 2);
        if (!tc.lit) { ctx.fillStyle = '#2C2C2C'; ctx.fillRect(cx - 1, cy - 5, 3, 2); continue; }
        const fl = (f >> 2) + tc.x;
        ctx.fillStyle = '#F83800'; ctx.fillRect(cx - 2, cy - 7, 5, 4);
        ctx.fillStyle = '#F8B800'; ctx.fillRect(cx - 1 + (fl & 1), cy - 8 - (fl % 3 === 0 ? 1 : 0), 3, 4);
        ctx.fillStyle = '#FCFCA8'; ctx.fillRect(cx, cy - 6, 1, 2);
      }
      // the secret exit's wall: it looks like the rest (but for a hairline crack and a glint now and then)
      const s = m.secret;
      if (s && !s.found && vis(s.wall.x, s.wall.y, s.wall.w, s.wall.h)) {
        const w = s.wall;
        for (let cy = w.y >> 2; cy < (w.y + w.h) >> 2; cy++) for (let cx = w.x >> 2; cx < (w.x + w.w) >> 2; cx++) {
          if (this.get(cx, cy) === T_BRICK) ctx.drawImage(tex.steel, (cx & 1) * 4, (cy & 1) * 4, 4, 4, cx * 4, cy * 4, 4, 4);
        }
        ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(w.x + 5, w.y + 9, 1, 5); ctx.fillRect(w.x + 6, w.y + 13, 3, 1);
        const g = f % 240;
        if (g < 10) { ctx.fillStyle = '#F8F8F8'; ctx.fillRect(w.x + 3 + g, w.y + 3 + g, 2, 2); }
      }
      // the vault: gold trim round its walls and a padlock on each way in
      const v = m.vault;
      if (v && !v.open && vis(v.x - 16, v.y - 16, v.w + 32, v.h + 32)) {
        ctx.fillStyle = '#C8A030';
        ctx.fillRect(v.x - 14, v.y - 14, v.w + 28, 1); ctx.fillRect(v.x - 14, v.y + v.h + 13, v.w + 28, 1);
        ctx.fillRect(v.x - 14, v.y - 14, 1, v.h + 28); ctx.fillRect(v.x + v.w + 13, v.y - 14, 1, v.h + 28);
        for (const r of v.entr || []) {
          const x = r.x + r.w / 2 - 5, y = r.y + r.h / 2 - 4;
          ctx.fillStyle = '#000000'; ctx.fillRect(x - 1, y - 4, 12, 13);
          ctx.fillStyle = '#A87C00'; ctx.fillRect(x + 2, y - 3, 6, 2); ctx.fillRect(x + 2, y - 3, 2, 4); ctx.fillRect(x + 6, y - 3, 2, 4);
          ctx.fillStyle = '#F0BC3C'; ctx.fillRect(x, y + 1, 10, 7);
          ctx.fillStyle = '#000000'; ctx.fillRect(x + 4, y + 3, 2, 3);
        }
      }
      // dust
      for (const p of m.puffs || []) {
        if (!vis(p.x - 20, p.y - 20, 40, 40)) continue;
        const r = 4 + p.t * 0.6;
        ctx.fillStyle = 'rgba(150,140,120,' + (0.6 * (1 - p.t / 30)).toFixed(2) + ')';
        for (let k = 0; k < p.n; k++) {
          const a = k * 2.4 + p.x, d = r * (0.4 + mzHash(k, p.x + p.y) * 0.8);
          ctx.fillRect(Math.round(p.x + Math.cos(a) * d) - 1, Math.round(p.y + Math.sin(a) * d - p.t * 0.2) - 1, 3, 3);
        }
      }
    },
    mzSteelBlock(ctx, tex, x, y, w, h) {
      for (let yy = 0; yy < h; yy += 4) for (let xx = 0; xx < w; xx += 4) ctx.drawImage(tex.steel, (xx >> 2 & 1) * 4, (yy >> 2 & 1) * 4, 4, 4, x + xx, y + yy, 4, 4);
    },
    mzPit(ctx, x, y) {
      ctx.fillStyle = '#3C342C'; ctx.fillRect(x, y, 32, 32);
      ctx.fillStyle = '#050506'; ctx.fillRect(x + 3, y + 3, 26, 26);
      ctx.fillStyle = '#3C342C';
      for (let k = 0; k < 12; k++) {
        const s = (mzHash(x + k, y) * 4) | 0, along = 3 + ((mzHash(k, x + y) * 22) | 0);
        if (k % 4 === 0) ctx.fillRect(x + along, y + 3, 2, s); else if (k % 4 === 1) ctx.fillRect(x + along, y + 29 - s, 2, s);
        else if (k % 4 === 2) ctx.fillRect(x + 3, y + along, s, 2); else ctx.fillRect(x + 29 - s, y + along, s, 2);
      }
      ctx.fillStyle = '#121216'; ctx.fillRect(x + 8, y + 8, 16, 16);
      ctx.fillStyle = '#5C544C'; ctx.fillRect(x + 1, y + 1, 3, 2); ctx.fillRect(x + 27, y + 28, 3, 2); ctx.fillRect(x + 28, y + 2, 2, 2);
    },
    mzRubble(ctx, x, y) {
      ctx.fillStyle = '#241E18'; ctx.fillRect(x, y, 32, 32);
      const cols = ['#8C8478', '#6C6458', '#4C463C'];
      for (let k = 0; k < 9; k++) {
        const bx = x + 1 + ((mzHash(x + k, y * 3) * 24) | 0), by = y + 1 + ((mzHash(y + k, x * 7) * 24) | 0), s = 5 + ((mzHash(k, x ^ y) * 5) | 0);
        ctx.fillStyle = '#1C1812'; ctx.fillRect(bx + 1, by + 1, s, s);
        ctx.fillStyle = cols[k % 3]; ctx.fillRect(bx, by, s, s - 1); ctx.fillRect(bx + 1, by + s - 1, s - 2, 1);
        ctx.fillStyle = '#A8A094'; ctx.fillRect(bx + 1, by + 1, 2, 1);
      }
    },

    // ---- light and the dark
    mzSeenArr() {
      if (!this.mzSeen || this.mzSeen.length !== COLS * ROWS) { this.mzSeen = new Uint8Array(COLS * ROWS); this.mzSeenN = 0; }
      return this.mzSeen;
    },
    mzOpaque(tx, ty) { const v = this.get(tx * 4 + 1, ty * 4 + 1), u = this.get(tx * 4 + 2, ty * 4 + 2); return v === T_STEEL || v === T_BRICK || v < 0 || u === T_STEEL || u === T_BRICK; },
    // a lamp at (px, py) of radius R: cb(tile, brightness) for every tile it reaches (walls stop it, and are lit themselves)
    mzFlood(px, py, R, cb) {
      const n0 = COLS * ROWS;
      if (!this.mzStamp || this.mzStamp.length !== n0) { this.mzStamp = new Int32Array(n0); this.mzStampN = 0; this.mzQ = new Int32Array(1024); }
      const st = this.mzStamp, id = ++this.mzStampN, q = this.mzQ, tx0 = Math.max(0, Math.min(COLS - 1, px >> 4)), ty0 = Math.max(0, Math.min(ROWS - 1, py >> 4)), t0 = ty0 * COLS + tx0;
      let h = 0, n = 0;
      q[n++] = t0; st[t0] = id;
      while (h < n) {
        const gi = q[h++], tx = gi % COLS, ty = (gi / COLS) | 0, d = Math.hypot(tx * 16 + 8 - px, ty * 16 + 8 - py), v = Math.min(1, (R - d) / (R * 0.5));
        if (v <= 0) continue;
        cb(gi, v);
        if (gi !== t0 && this.mzOpaque(tx, ty)) continue;
        if (tx > 0 && st[gi - 1] !== id && n < q.length) { st[gi - 1] = id; q[n++] = gi - 1; }
        if (tx < COLS - 1 && st[gi + 1] !== id && n < q.length) { st[gi + 1] = id; q[n++] = gi + 1; }
        if (ty > 0 && st[gi - COLS] !== id && n < q.length) { st[gi - COLS] = id; q[n++] = gi - COLS; }
        if (ty < ROWS - 1 && st[gi + COLS] !== id && n < q.length) { st[gi + COLS] = id; q[n++] = gi + COLS; }
      }
    },
    mzLookAround(t) {
      const seen = this.mzSeenArr();
      this.mzFlood(t.x + 8, t.y + 8, this.mzLampR(t), (gi, v) => { if (v > 0.3 && !seen[gi]) { seen[gi] = 1; this.mzSeenN++; } });
    },
    // the torches' light (fixed once they're lit; again when the walls change)
    mzTorchMap() {
      const m = this.maze, key = m.torchVer + ':' + (this.terrainVer || 0) + ':' + (this.mzTopo || 0) + ':' + m.torches.map(t => t.lit).join('');
      if (this.mzTL && this.mzTLKey === key && this.mzTL.length === COLS * ROWS) return this.mzTL;
      const L = this.mzTL && this.mzTL.length === COLS * ROWS ? this.mzTL.fill(0) : new Float32Array(COLS * ROWS);
      for (const tc of m.torches) if (tc.lit) this.mzFlood(tc.lx, tc.ly, 60, (gi, v) => { if (v * 0.9 > L[gi]) L[gi] = v * 0.9; });
      this.mzTL = L; this.mzTLKey = key;
      return L;
    },
    mzLight(x, y) {
      const g = this.mzLit;
      if (!g) return 1;
      const tx = (x >> 4) - g.tx0, ty = (y >> 4) - g.ty0;
      return tx < 0 || ty < 0 || tx >= g.tw || ty >= g.th ? 0 : g.B[ty * g.tw + tx];
    },

    // the dark: unexplored black, explored dim (pitch-black parts stay black), lamps and torches light it up
    renderMazeDark(ctx) {
      const m = this.maze, [cx0, cy0] = this.mzCam || [0, 0], f = this.frame;
      const tx0 = Math.max(0, (cx0 >> 4) - 1), ty0 = Math.max(0, (cy0 >> 4) - 1);
      const tx1 = Math.min(COLS - 1, ((cx0 + VIEW_W) >> 4) + 1), ty1 = Math.min(ROWS - 1, ((cy0 + VIEW_H) >> 4) + 1);
      const tw = tx1 - tx0 + 1, th = ty1 - ty0 + 1;
      if (!this.mzDarkC || this.mzDarkC.width !== tw || this.mzDarkC.height !== th) {
        this.mzDarkC = makeCanvas(tw, th);
        this.mzDarkImg = this.mzDarkC.getContext('2d').createImageData(tw, th);
        this.mzB = new Float32Array(tw * th);
      }
      const B = this.mzB, seen = this.mzSeenArr(), pitch = this.mzPitch, TL = this.mzTorchMap(), client = Net.role === 'client';
      for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
        const gi = ty * COLS + tx;
        B[(ty - ty0) * tw + tx - tx0] = Math.max(seen[gi] ? (pitch && pitch[gi] ? 0.03 : 0.36) : 0, TL[gi]);
      }
      const put = (gi, v) => {
        const tx = gi % COLS - tx0, ty = ((gi / COLS) | 0) - ty0;
        if (tx >= 0 && ty >= 0 && tx < tw && ty < th && v > B[ty * tw + tx]) B[ty * tw + tx] = v;
      };
      // a plain round glow (no walls in its way)
      const glow = (x, y, r, k = 1) => {
        for (let ty = Math.max(ty0, (y - r) >> 4); ty <= Math.min(ty1, (y + r) >> 4); ty++) for (let tx = Math.max(tx0, (x - r) >> 4); tx <= Math.min(tx1, (x + r) >> 4); tx++) {
          const v = k * Math.min(1, (r - Math.hypot(tx * 16 + 8 - x, ty * 16 + 8 - y)) / (r * 0.5));
          if (v > 0) put(ty * COLS + tx, v);
        }
      };
      for (const t of this.tanks) {
        if (!t.alive) continue;
        if (t.isPlayer) this.mzFlood(t.x + 8, t.y + 8, this.mzLampR(t), (gi, v) => { put(gi, v); if (client && v > 0.3 && !seen[gi]) { seen[gi] = 1; this.mzSeenN = (this.mzSeenN || 0) + 1; } });
        else if (t.reveal > 0) glow(t.x + 8, t.y + 8, 20, 0.7);   // a muzzle flash gives an enemy away
      }
      for (const b of this.bullets) glow(b.x + 2, b.y + 2, 18, 0.7);
      for (const fx of this.fx) if (fx.tick >= 0) glow(fx.x, fx.y, 30);
      for (const s of this.spawns) glow(s.x + 8, s.y + 8, 18, 0.6);
      for (const fl of this.flames) glow(fl.x + fl.w / 2, fl.y + fl.h / 2, 30);
      for (const c of this.claudes) glow(c.x + 8, c.y + 8, 36);
      glow(m.ex + 16, m.ey + 16, 34, 0.45 + 0.1 * Math.sin(f / 15));   // the exit glows
      for (const d of m.doors) if (d.open && !d.jam) glow(d.x + d.w / 2, d.y + d.h / 2, 26, 0.6);
      for (const it of m.items) if (it.k === 'key' || it.k === 'cell') glow(it.x + 8, it.y + 8, 18, 0.25 + 0.15 * Math.sin((f + it.id * 9) / 10));
      for (const p of this.pads) if (!p.kind) glow(p.x + 8, p.y + 8, 14, 0.4);
      if (this.nightVision > 0) for (let i = 0; i < tw * th; i++) B[i] = Math.max(B[i], 0.8);
      // into a small picture, one pixel a tile, stretched smooth over the field
      const W = this.mzDarkC.width, img = this.mzDarkImg, d = img.data;
      for (let ty = 0; ty < th; ty++) for (let tx = 0; tx < tw; tx++) {
        const o = (ty * W + tx) * 4, b = B[ty * tw + tx];
        d[o] = 2; d[o + 1] = 2; d[o + 2] = 10; d[o + 3] = Math.round(250 * (1 - Math.min(1, b)));
      }
      const dc = this.mzDarkC.getContext('2d');
      dc.putImageData(img, 0, 0);
      const sm = ctx.imageSmoothingEnabled;
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(this.mzDarkC, 0, 0, tw, th, tx0 * 16, ty0 * 16, tw * 16, th * 16);
      ctx.imageSmoothingEnabled = sm;
      this.mzLit = { B, tx0, ty0, tw, th };
    },

    // over the dark: markers, door clocks, eyes in the dark
    mzRenderOver(ctx) {
      const m = this.maze, f = this.frame, [cx, cy] = this.mzCam || [0, 0];
      const vis = (x, y) => x > cx - 16 && x < cx + VIEW_W + 16 && y > cy - 16 && y < cy + VIEW_H + 16;
      for (const mk of m.markers) {   // a chalk cross on the floor
        if (!vis(mk.x, mk.y)) continue;
        ctx.globalAlpha = 0.85;
        ctx.fillStyle = PALS[Config.playerPal(mk.i)][1];
        for (let k = -4; k <= 4; k++) { ctx.fillRect(mk.x + k, mk.y + k, 1, 1); ctx.fillRect(mk.x + k, mk.y - k, 1, 1); }
        ctx.fillRect(mk.x - 1, mk.y - 1, 2, 2);
        ctx.globalAlpha = 1;
      }
      for (const d of m.doors) {   // the seconds a door has left
        if (!d.open || d.jam || d.held || !vis(d.x + d.w / 2, d.y)) continue;
        const s = String(Math.ceil(d.timer / 60)), w = s.length * 8 + 2, x = Math.round(d.x + d.w / 2 - w / 2), y = d.y + d.h / 2 - 5;
        ctx.fillStyle = '#000000'; ctx.fillRect(x - 1, y - 1, w + 2, 10);
        Font.draw(ctx, s, x + 1, y, d.timer < 300 && (f >> 3) & 1 ? '#F83800' : d.col);
      }
      // red eyes: an enemy in the dark (now and then they blink)
      for (const t of this.tanks) {
        if (!t.alive || t.isPlayer || t.mirage || t.burrow > 0 || !vis(t.x + 8, t.y + 8) || this.mzLight(t.x + 8, t.y + 8) > 0.3) continue;
        if ((f + t.x * 3) % 160 < 8) continue;
        const ex = t.x + 8 + DXY[t.dir][0] * 3, ey = t.y + 8 + DXY[t.dir][1] * 3, sx = t.dir & 1 ? 0 : 2, sy = t.dir & 1 ? 2 : 0;
        ctx.fillStyle = '#F83800';
        ctx.fillRect(ex - sx - 1, ey - sy - 1, 1, 1); ctx.fillRect(ex + sx, ey + sy, 1, 1);
      }
      // what you've already seen glints in the dim
      for (const it of m.items) {
        if ((it.k !== 'key' && it.k !== 'cell') || !vis(it.x, it.y) || (f + it.id * 23) % 120 > 6) continue;
        if (!this.mzSeenArr()[((it.y + 8) >> 4) * COLS + ((it.x + 8) >> 4)] || this.mzLight(it.x + 8, it.y + 8) > 0.5) continue;
        ctx.fillStyle = it.k === 'key' ? MZ_KEY_COL[it.c][2] : '#B8F818';
        ctx.fillRect(it.x + 7, it.y + 5, 2, 6); ctx.fillRect(it.x + 5, it.y + 7, 6, 2);
      }
    },
  });

  const darkBase = P.renderDarkness;
  P.renderDarkness = function (ctx) {
    if (this.maze && this.maze.mzOn) { this.renderMazeDark(ctx); return; }
    darkBase.call(this, ctx);
  };
  const overBase = P.renderBigMap;
  P.renderBigMap = function (ctx) {
    overBase.call(this, ctx);
    if (this.maze && this.maze.mzOn) this.mzRenderOver(ctx);
  };
  // can you see this enemy? Not in the dark
  const seenBase = P.enemySeen;
  P.enemySeen = function (t) {
    if (!seenBase.call(this, t)) return false;
    if (!this.maze || !this.maze.mzOn) return true;
    // a muzzle flash only gives it away on your screen: walls hide the rest
    const g = this.mzLit;
    if (!g) return true;   // nothing drawn yet
    const on = (t.x >> 4) >= g.tx0 && (t.y >> 4) >= g.ty0 && (t.x >> 4) < g.tx0 + g.tw && (t.y >> 4) < g.ty0 + g.th;
    return on && (t.reveal > 0 || this.mzLight(t.x + 8, t.y + 8) > 0.3);
  };
  // the camera: remembered for the dark; it shakes when the maze does
  const camBase = P.camera;
  P.camera = function () {
    let r = camBase.call(this);
    const m = this.maze;
    if (m && m.mzOn && m.shake > 0) {
      const a = m.shake > 12 ? 2 : 1, f = this.frame;
      r = [r[0] + ((f * 7) % 3 - 1) * a, r[1] + ((f * 5 + 1) % 3 - 1) * a];
    }
    this.mzCam = r;
    return r;
  };
})();

// ------------------------------------------------------------ the map, the side panel, the border
const MZ_FLOOR_MAP = { dungeon: [132, 122, 104], sewer: [88, 128, 84], ice: [136, 176, 216], machine: [124, 124, 140] };
const mzRGB = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

(function () {
  const P = Stage.prototype;

  Object.assign(P, {
    // the minimap: one pixel (or more) per cell and per wall slot, only what you've seen (all of it while a map
    // scroll lasts); you, your markers, the keys and cells you've spotted, a door's clock, the exit signal
    mzRenderMinimap(ctx, camX, camY) {
      const m = this.maze, MW = m.MW, MH = m.MH, UW = 2 * MW + 1, UH = 2 * MH + 1, f = this.frame;
      const k = Math.max(1, Math.floor(Math.min(Math.min(84, VIEW_W * 0.42) / UW, Math.min(56, VIEW_H * 0.3) / UH)));
      const mw = UW * k, mh = UH * k, x0 = VIEW_W - mw - 3, y0 = 3, all = m.scrollT > 0;
      const key = [this.mzSeenN, this.terrainVer, this.mzTopo, all, m.gates.map(g => g.open).join(''), m.doors.map(d => d.open ? 1 : 0).join(''), m.secret && m.secret.found, m.vault && m.vault.open].join(':');
      if (!this.mzMap || this.mzMap.width !== UW || this.mzMap.height !== UH || (this.mzMapKey !== key && f - (this.mzMapAt || -99) >= 10) || this.mzMapAt > f) {
        this.mzMapKey = key; this.mzMapAt = f;
        this.mzMap = this.mzMap && this.mzMap.width === UW && this.mzMap.height === UH ? this.mzMap : makeCanvas(UW, UH);
        const c = this.mzMap.getContext('2d'), img = c.createImageData(UW, UH), d = img.data, seen = this.mzSeenArr();
        const FL = MZ_FLOOR_MAP[m.theme] || MZ_FLOOR_MAP.dungeon, WALL = [44, 44, 54], WATER = [40, 72, 200], BRIDGE = [150, 104, 48], BRICK = [168, 72, 16], PIT = [70, 56, 40];
        const special = {};   // closed gates and doors, the vault, in their colours
        const mark = (r, col) => { for (let ty = r.y >> 4; ty < (r.y + r.h) >> 4; ty++) for (let tx = r.x >> 4; tx < (r.x + r.w) >> 4; tx++) special[ty * COLS + tx] = col; };
        for (const g of m.gates) if (!g.open) mark(g, mzRGB(MZ_KEY_COL[g.c][0]));
        for (const dd of m.doors) if (!dd.open) mark(dd, mzRGB(dd.col));
        if (m.vault && !m.vault.open) for (const r of m.vault.entr || []) mark(r, [200, 160, 48]);
        if (m.secret && !m.secret.found) mark(m.secret.wall, WALL);
        const tileCol = (tx, ty) => {
          const gi = ty * COLS + tx;
          if (!all && !seen[gi]) return null;
          if (special[gi]) return special[gi];
          const v = this.get(tx * 4 + 1, ty * 4 + 1);
          return v === T_STEEL ? WALL : v === T_WATER ? WATER : v === T_BRIDGE ? BRIDGE : v === T_BRICK ? BRICK : FL;
        };
        for (let uy = 0; uy < UH; uy++) for (let ux = 0; ux < UW; ux++) {
          // a unit: a cell (odd, odd), a wall slot (odd, even / even, odd) or a pillar (even, even)
          const tx = (ux >> 1) * 3 + (ux & 1), ty = (uy >> 1) * 3 + (uy & 1);
          let col = tileCol(tx, ty);
          if (!col && (ux & 1)) col = tileCol(tx + 1, ty);
          if (!col && (uy & 1)) col = tileCol(tx, ty + 1);
          if (col && (ux & 1) && (uy & 1) && col === WALL) col = PIT;   // a cell that's all wall: fallen in or caved in
          const o = (uy * UW + ux) * 4;
          if (col) { d[o] = col[0]; d[o + 1] = col[1]; d[o + 2] = col[2]; d[o + 3] = 235; } else d[o + 3] = 170;
        }
        c.putImageData(img, 0, 0);
      }
      const under = this.tanks.some(t => t.isPlayer && t.alive && overlap(t.x - camX, t.y - camY, 16, 16, x0 - 4, y0 - 4, mw + 8, mh + 8));
      ctx.globalAlpha = under ? 0.3 : 0.92;
      ctx.fillStyle = all ? ((f >> 3) & 1 ? '#F8D878' : '#C8A060') : '#7C7C7C';
      ctx.fillRect(x0 - 1, y0 - 1, mw + 2, mh + 2);
      ctx.fillStyle = '#000000'; ctx.fillRect(x0, y0, mw, mh);
      ctx.drawImage(this.mzMap, x0, y0, mw, mh);
      const S = k / 24, dot = (wx, wy, col, r = 1) => { ctx.fillStyle = col; ctx.fillRect(Math.round(x0 + wx * S - r / 2), Math.round(y0 + wy * S - r / 2), r, r); };
      const sz = Math.max(2, k);
      // the screen you see
      ctx.fillStyle = 'rgba(248,248,248,0.55)';
      const vx = Math.round(x0 + camX * S), vy = Math.round(y0 + camY * S), vw = Math.max(2, Math.round(VIEW_W * S)), vh = Math.max(2, Math.round(VIEW_H * S));
      ctx.fillRect(vx, vy, vw, 1); ctx.fillRect(vx, vy + vh - 1, vw, 1); ctx.fillRect(vx, vy, 1, vh); ctx.fillRect(vx + vw - 1, vy, 1, vh);
      const seen = this.mzSeenArr(), known = (x, y) => all || seen[(y >> 4) * COLS + (x >> 4)];
      if (known(m.ex + 16, m.ey + 16) || f >= m.hintAt) dot(m.ex + 16, m.ey + 16, (f >> 3) & 1 ? '#58F898' : this.mazeSealed() ? '#A80000' : '#F8F8F8', sz + 1);
      for (const it of m.items) if ((it.k === 'key' || it.k === 'cell') && known(it.x + 8, it.y + 8)) dot(it.x + 8, it.y + 8, it.k === 'key' ? MZ_KEY_COL[it.c][0] : '#B8F818', sz);
      for (const dd of m.doors) if (dd.open && !dd.jam && !dd.held && (f >> 2) & 1) dot(dd.x + dd.w / 2, dd.y + dd.h / 2, dd.col, sz + 1);
      for (const mk of m.markers) {
        const x = Math.round(x0 + mk.x * S), y = Math.round(y0 + mk.y * S);
        ctx.fillStyle = (f >> 4) & 1 ? '#000000' : PALS[Config.playerPal(mk.i)][1];
        ctx.fillRect(x - 1, y - 2, 2, 4); ctx.fillRect(x - 2, y - 1, 4, 2);
      }
      for (const t of this.tanks) if (this.enemySeen(t)) dot(t.x + 8, t.y + 8, '#F83800', sz);
      for (const t of this.tanks) if (t.alive && t.isPlayer) dot(t.x + 8, t.y + 8, t.ally ? '#BCBCBC' : PALS[Config.playerPal(t.player ? t.player.i : 0)][1], sz + 1);
      ctx.globalAlpha = 1;
      if (all) mzTiny(ctx, String(Math.ceil(m.scrollT / 60)), x0 + 1, y0 + mh + 2, '#F8D878');
    },

    // over the field (screen positions): the collapse clock, and arrows to a door whose clock is running
    mzRenderScreen(ctx, camX, camY) {
      const m = this.maze, f = this.frame;
      for (const d of m.doors) {
        if (!d.open || d.jam || d.held || d.timer <= 0) continue;
        const sx = d.x + d.w / 2 - camX, sy = d.y + d.h / 2 - camY;
        if (sx >= 0 && sy >= 0 && sx < VIEW_W && sy < VIEW_H) continue;
        const x = Math.max(5, Math.min(VIEW_W - 6, sx)), y = Math.max(5, Math.min(VIEW_H - 6, sy));
        if ((f >> 3) & 1) { ctx.fillStyle = d.col; ctx.fillRect(x - 3, y - 3, 7, 7); ctx.fillStyle = COL.black; ctx.fillRect(x - 1, y - 1, 3, 3); }
        const s = String(Math.ceil(d.timer / 60));
        ctx.fillStyle = COL.black; ctx.fillRect(Math.min(VIEW_W - 14, Math.max(0, x - 6)), y + (y > VIEW_H / 2 ? -12 : 5), 13, 7);
        mzTiny(ctx, s, Math.min(VIEW_W - 13, Math.max(1, x - 5)), y + (y > VIEW_H / 2 ? -11 : 6), d.col);
      }
      const c = m.collapse;
      if (c && !m.escaped) {
        const s = Math.max(0, Math.ceil(c.t / 60)), txt = Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
        const w = Font.bigWidth(txt, 2), x = Math.round((VIEW_W - w) / 2), red = s <= 10;
        ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(x - 4, 3, w + 8, 18);
        Font.big(ctx, txt, x, 5, 2, red && (f >> 3) & 1 ? '#F8F8F8' : red ? '#F83800' : COL.gold);
        if (c.fails) Font.drawCenter(ctx, 'FASTER!', VIEW_W / 2, 23, '#F83800');
      }
    },

    // the side panel: a few of the tanks to come, the team's keys, power cells, each lamp's fuel, the collapse clock
    mzRenderHud(ctx) {
      const m = this.maze, H = HUD_X, f = this.frame;
      ctx.fillStyle = COL.bg; ctx.fillRect(H, 48, 24, 58);
      const q = this.queue.length;
      if (q > 6) ctx.drawImage(Sprites.mini(String(Math.min(999, q))), H + 4, 49);
      // keys: the colours of this maze's gates; dark until the team holds one
      let x = H;
      for (const col of MZ_KEYS) {
        if (!m.keyCols.includes(col) && !m.keys.includes(col)) continue;
        const has = m.keys.includes(col), [c0, c1] = MZ_KEY_COL[col];
        ctx.fillStyle = has ? c0 : '#3C3C3C';
        ctx.fillRect(x, 58, 3, 3); ctx.fillRect(x + 3, 59, 4, 1); ctx.fillRect(x + 5, 60, 1, 2); ctx.fillRect(x + 7, 59, 1, 3);
        ctx.fillStyle = has ? c1 : '#202020'; ctx.fillRect(x + 1, 59, 1, 1);
        x += 8;
      }
      // power cells: n/3
      const done = m.cellsGot >= m.cellsNeed;
      ctx.fillStyle = '#0C2C14'; ctx.fillRect(H, 65, 5, 8);
      ctx.fillStyle = done && (f >> 4) & 1 ? '#B8F818' : '#00A844'; ctx.fillRect(H + 1, 66, 3, 6);
      ctx.fillStyle = '#ADADAD'; ctx.fillRect(H + 1, 64, 3, 1);
      mzTiny(ctx, m.cellsGot + '/' + m.cellsNeed, H + 8, 67, done ? '#004000' : COL.black);
      // lamps: one bar each, in the player's colour, blinking when low
      this.players.forEach((p, i) => {
        const y = 77 + i * 4, fu = this.mzFuelOf(p), w = Math.round(18 * fu);
        ctx.fillStyle = '#383838'; ctx.fillRect(H + 5, y, 19, 3);
        ctx.fillStyle = fu < 0.2 && (f >> 3) & 1 ? '#F83800' : PALS[Config.playerPal(p.i)][1]; ctx.fillRect(H + 5, y, w, 2);
      });
      ctx.fillStyle = '#F8B800'; ctx.fillRect(H + 1, 77, 2, 3); ctx.fillStyle = '#F83800'; ctx.fillRect(H + 1, 79, 2, 2);
      if (m.collapse) {
        const s = Math.max(0, Math.ceil(m.collapse.t / 60));
        mzTiny(ctx, Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'), H + 2, 96, s <= 10 && (f >> 3) & 1 ? '#F8F8F8' : '#A80000');
      }
    },
  });

  const mapBase = P.renderMinimap;
  P.renderMinimap = function (ctx, camX, camY) {
    const m = this.maze;
    if (!m || !m.mzOn) { mapBase.call(this, ctx, camX, camY); return; }
    if (Config.on('minimap')) this.mzRenderMinimap(ctx, camX, camY);
    this.mzRenderScreen(ctx, camX, camY);
  };
  const hudBase = P.renderHud;
  P.renderHud = function (ctx) {
    hudBase.call(this, ctx);
    if (this.maze && this.maze.mzOn && !this.vs) this.mzRenderHud(ctx);
  };
  // the border above the field: the maze, its time (or the collapse clock)
  const lineBase = P.renderMazeLine;
  P.renderMazeLine = function (ctx) {
    const m = this.maze;
    if (!m.mzOn) { lineBase.call(this, ctx); return; }
    const c = m.collapse, f = this.frame;
    if (c && !m.escaped) {
      const s = Math.max(0, Math.ceil(c.t / 60));
      Font.drawCenter(ctx, 'MAZE ' + this.num + '  GET OUT! ' + Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'), FX + VIEW_W / 2, 0, s <= 10 && (f >> 3) & 1 ? '#F8F8F8' : '#A80000');
      return;
    }
    const t = fmtTime(Math.max(0, f - m.t0)).replace(/\.\d$/, '');
    Font.drawCenter(ctx, 'MAZE ' + this.num + (m.lair ? ' LAIR' : '') + '  ' + t + (f >= m.hintAt && !m.escaped ? '  SIGNAL' : ''), FX + VIEW_W / 2, 0, COL.black);
  };

  // ------------------------------------------------------------ online: what guests need of the maze
  const bits = a => { let s = ''; for (let i = 0; i < a.length; i += 6) { let v = 0; for (let k = 0; k < 6; k++) v |= (a[i + k] ? 1 : 0) << k; s += String.fromCharCode(48 + v); } return s; };
  const unbits = (s, a) => { for (let i = 0; i < s.length; i++) { const v = s.charCodeAt(i) - 48; for (let k = 0; k < 6; k++) if (v & (1 << k) && i * 6 + k < a.length) a[i * 6 + k] = 1; } };
  Object.assign(P, {
    mzView(full) {
      const m = this.maze, F = this.frame;
      const v = {
        k: m.keys.join(','), ke: m.keysEver.join(','), cg: m.cellsGot,
        it: m.items.map(it => [it.id, it.k, it.x, it.y, it.c || it.w || it.pu || 0]),
        g: m.gates.map(g => (g.open ? 1 + Math.min(40, g.t) : 0)),
        d: m.doors.map(d => [d.open ? 1 : 0, d.timer, d.held ? 1 : 0, d.jam ? 1 : 0]),
        mv: m.movers.map(mv => [mv.s, mv.next - F, mv.anim]),
        ck: m.cracks.map(c => c.st * 100 + Math.min(99, c.t | 0)),
        rb: m.rubble.map(r => [r.x, r.y]),
        tl: m.torches.map(t => (t.lit ? 1 : 0)).join(''),
        mk: m.markers.map(mk => [mk.x, mk.y, mk.i]),
        sc: m.scrollT, cl: m.collapse ? [m.collapse.t, m.collapse.total, m.collapse.fails || 0] : 0,
        fu: this.players.map(p => [p.i, Math.round((p.mzFuel === undefined ? 1 : p.mzFuel) * 1000) / 1000]),
        lp: m.lairBossPending ? 1 : 0, vo: m.vault && m.vault.open ? 1 : 0, rs: m.result || 0, t0: m.t0, sh: m.shake, sf: m.secret && m.secret.found ? 1 : 0,
        pf: (m.puffs || []).map(p => [p.x, p.y, p.n, p.t]), rv: m.rivers.map(r => (r.bridged ? 1 : 0)), sl: this.mazeSealed() ? 1 : 0,
      };
      if (full) {
        v.s = {
          theme: m.theme, lair: m.lair, n: m.n, rooms: m.rooms, par: m.par, keyCols: m.keyCols, need: m.cellsNeed, pitch: m.pitchCells,
          vault: m.vault ? { x: m.vault.x, y: m.vault.y, w: m.vault.w, h: m.vault.h, entr: m.vault.entr || [] } : null,
          secret: m.secret ? { x: m.secret.x, y: m.secret.y, w: m.secret.w, h: m.secret.h, wall: m.secret.wall } : null,
          gates: m.gates.map(g => [g.x, g.y, g.w, g.h, g.c, g.route ? 1 : 0]),
          doors: m.doors.map(d => [d.x, d.y, d.w, d.h, d.px, d.py, d.col, d.route ? 1 : 0]),
          movers: m.movers.map(mv => [mv.a, mv.b, mv.slide ? 1 : 0, mv.pv]),
          cracks: m.cracks.map(c => [c.x, c.y]),
          torches: m.torches.map(t => [t.x, t.y, t.side, t.lx, t.ly]),
          rivers: m.rivers.map(r => [r.row, r.cols]),
        };
        v.sn = bits(this.mzSeenArr());
      }
      return v;
    },
    mzApplyView(v) {
      if (v.s) this.mzStatic = v.s;
      const S = this.mzStatic, m = this.maze, F = this.frame;
      if (!S || !m) return;
      if (v.sn) unbits(v.sn, this.mzSeenArr());
      Object.assign(m, {
        mzOn: true, theme: S.theme, lair: S.lair, n: S.n, rooms: S.rooms, par: S.par, keyCols: S.keyCols, cellsNeed: S.need, pitchCells: S.pitch,
        keys: v.k ? v.k.split(',') : [], keysEver: v.ke ? v.ke.split(',') : [], cellsGot: v.cg,
        items: v.it.map(a => ({ id: a[0], k: a[1], x: a[2], y: a[3], c: a[1] === 'key' ? a[4] : undefined, w: a[1] === 'weapon' ? a[4] : undefined, pu: a[1] === 'pu' ? a[4] : undefined })),
        gates: S.gates.map((g, k) => ({ x: g[0], y: g[1], w: g[2], h: g[3], c: g[4], route: !!g[5], open: v.g[k] ? 1 : 0, t: v.g[k] ? v.g[k] - 1 : 0 })),
        doors: S.doors.map((d, k) => ({ x: d[0], y: d[1], w: d[2], h: d[3], px: d[4], py: d[5], col: d[6], route: !!d[7], open: !!v.d[k][0], timer: v.d[k][1], held: !!v.d[k][2], jam: !!v.d[k][3] })),
        movers: S.movers.map((a, k) => ({ a: a[0], b: a[1], slide: !!a[2], pv: a[3], s: v.mv[k][0], next: F + v.mv[k][1], anim: v.mv[k][2] })),
        cracks: S.cracks.map((a, k) => ({ x: a[0], y: a[1], st: Math.floor(v.ck[k] / 100), t: v.ck[k] % 100 })),
        torches: S.torches.map((a, k) => ({ x: a[0], y: a[1], side: a[2], lx: a[3], ly: a[4], lit: v.tl[k] === '1' ? 1 : 0 })),
        rubble: v.rb.map(a => ({ x: a[0], y: a[1] })),
        markers: v.mk.map(a => ({ x: a[0], y: a[1], i: a[2] })),
        rivers: S.rivers.map((a, k) => ({ row: a[0], cols: a[1], bridged: !!v.rv[k] })),
        vault: S.vault ? Object.assign({}, S.vault, { open: !!v.vo }) : null,
        secret: S.secret ? Object.assign({}, S.secret, { found: !!v.sf }) : null,
        scrollT: v.sc, collapse: v.cl ? { t: v.cl[0], total: v.cl[1], fails: v.cl[2] } : null, fuel: {},
        lairBossPending: !!v.lp, result: v.rs || null, t0: v.t0, shake: v.sh, puffs: v.pf.map(a => ({ x: a[0], y: a[1], n: a[2], t: a[3] })),
        torchVer: 1, sealedNet: !!v.sl,
      });
      for (const [i, fu] of v.fu) m.fuel[i] = fu;
      if (!this.mzPitch || this.mzPitchFor !== S) { this.mzPitchTiles(); this.mzPitchFor = S; }
    },
  });
})();

// ------------------------------------------------------------ the game around it: cards, online, the tally, records
function mzStarTotal(rec = STORE.get(MODE_KEY, {})) { return Object.values(rec.mazeStars || {}).reduce((a, b) => a + (b | 0), 0); }
// the stars as the title and the curtain show them
function mzStarsText(n) { const s = (STORE.get(MODE_KEY, {}).mazeStars || {})[n] | 0; return s ? '*'.repeat(s) : ''; }

function mzHookGame() {
  if (mzHookGame.done) return;
  mzHookGame.done = true;
  // first-meet cards: 'm' + index
  const cardBase = cardText;
  cardText = function (key) {
    if (key[0] !== 'm') return cardBase(key);
    const c = MZ_CARDS[+key.slice(1)];
    return c ? 'NEW: ' + c.name + ' - ' + c.desc : null;
  };
  // online: the maze's state goes to the guests (the layout once, the rest every view), marker presses come back
  const viewBase = Net.stageView;
  Net.stageView = function (st, full) {
    const v = viewBase.call(this, st, full);
    if (st.maze && st.maze.mzOn && st.maze.world) v.mzx = st.mzView(full || !st.mzSentStatic);
    st.mzSentStatic = true;
    return v;
  };
  const applyBase = Net.applyStage;
  Net.applyStage = function (sv) {
    applyBase.call(this, sv);
    const st = Game.stage;
    if (!st) return;
    if (sv.tf || (sv.df && sv.df.length)) st.mzTopo = (st.mzTopo || 0) + 1;
    if (sv.mzx && st.maze) st.mzApplyView(sv.mzx);
  };
  Net.counters.mk = Net.counters.mk || 0;
  const clientBase = Net.clientUpdate;
  Net.clientUpdate = function () {
    if (Game.state === 'play' && Game.mode === 'maze' && mzLocalMark(0)) this.counters.mk++;
    return clientBase.apply(this, arguments);
  };
  // the tally after a maze: its time and stars
  const scoreBase = Game.renderScore;
  Game.renderScore = function (ctx) {
    scoreBase.call(this, ctx);
    const st = this.stage, r = this.mode === 'maze' && st && st.maze && st.maze.result;
    if (!r) return;
    const s = Math.floor(r.f / 60), t = Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
    const line = (r.secret ? 'SECRET EXIT ' : 'TIME ') + t, w = line.length * 8 + 4 + 3 * 9, x = Math.round((SW - w) / 2);
    Font.draw(ctx, line, x, 25, COL.white);
    for (let k = 0; k < 3; k++) mzStar(ctx, x + line.length * 8 + 4 + k * 9, 25, k < r.stars ? COL.gold : '#3C3C3C');
    const p = r.par || [0, 0], ft = n => Math.floor(n / 60) + ':' + String(n % 60).padStart(2, '0');
    Font.drawCenter(ctx, r.newBest && (this.t >> 4) & 1 ? 'NEW BEST FOR THIS MAZE!' : 'PAR ' + ft(p[1]) + ' / ' + ft(p[0]), SW / 2, 45, r.newBest ? COL.gold : COL.lgrey);
  };
  // a secret exit skips the next maze
  const updScoreBase = Game.updateScore;
  Game.updateScore = function () {
    const n = this.stageNum;
    updScoreBase.apply(this, arguments);
    if (this.mode === 'maze' && this.mzSkip === n && this.stageNum === n + 1) { this.stageNum++; this.mzSkip = 0; }
  };
  // the run's end: every maze's best stars together
  const resBase = Game.toModeResult;
  Game.toModeResult = function (done) {
    resBase.apply(this, arguments);
    if (this.mode === 'maze' && this.modeRes) this.modeRes.stars = mzStarTotal();
  };
  const resRender = Game.renderModeResult;
  Game.renderModeResult = function (ctx) {
    resRender.call(this, ctx);
    const r = this.modeRes;
    if (r && r.mode === 'maze' && r.stars) {
      const s = 'STARS ' + r.stars, w = s.length * 8 + 9, x = Math.round((SW - w) / 2);
      mzStar(ctx, x, 136, COL.gold);
      Font.draw(ctx, s, x + 9, 136, COL.gold);
    }
  };
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mzHookGame); else mzHookGame();
