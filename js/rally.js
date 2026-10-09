'use strict';
// =====================================================================
//  TANK RALLY: the race. Four tanks, laps round a track of tiles (rallytracks.js), guns, drops and boosts, money on
//  the track. The career between races (garage, shop, rivals, divisions) is rallycareer.js; this file is the race.
//    - driving: four directions with momentum. Holding a direction speeds you up that way to your top speed, letting
//      go coasts, the opposite way brakes. A 90-degree turn keeps the old speed sideways for a moment (a slide: longer
//      with little grip, much longer on ice) while part of it carries on the new way, so corners take timing. Walls
//      stop you (their corners are rounded off: you slip past them), rough ground and mud slow you (rough less with
//      better suspension), lava burns, a ramp throws you over the next tiles (over pits, mines and shells), a pit
//      wrecks you, boost pads and BOOST charges give a burst. Racers that meet push each other and both lose speed.
//    - laps: the racing line is a loop of waypoints with a gate at each. They count in order only (a shortcut past a
//      gate doesn't), the start/finish gate counts the laps and refills the charges. Positions go by laps and by how
//      far along the line you are; a racer facing back down the line is told so.
//    - FIRE: the forward weapon (cannon shells, homing missiles or a laser), B: the rear drop (mines, an oil slick that
//      sends whoever drives in spinning, or smoke that hides you), FIRE and B together: BOOST. Each has charges for
//      the lap. Hits take armour; at none the tank is WRECKED and comes back on the racing line 2 s later, where it
//      was, the one who did it scores a kill. $ spots pay money, + spots repair and top up the charges.
//    - computer rivals follow the racing line looking as far ahead as they can see, brake for corners by their grip
//      and the room past the corner, boost on straights, shoot at racers ahead in line and drop things on those
//      close behind, steer round pits, crates and (the better ones) mines and oil. Skill 0-4 and a style (clean,
//      aggressive, dirty) set how fast and how mean; a little rubber band keeps them in the race, never much.
//    - the camera follows you, looking ahead; two players: the leader, and a trailing player who drops off the
//      screen is put back just behind (after a short wait).
//    - the race API: Game.rallyStartRace(opts), and when it's over Game.rallyRaceOver(results) (the career's; until
//      it exists a results screen here, then the title). Starting TANK RALLY from the title calls
//      Game.rallyNewCareer(players) (the career's), or without it races the first track straight away.
// =====================================================================

// the numbers (frames, px, px/frame)
const RALLY = {
  half: 6.5,            // half the tank's collision box (14 px: a little smaller than its sprite)
  gate: 112,            // how far from a waypoint its gate reaches
  respawn: 120,         // from a wreck to the respawn
  fall: 34,             // falling into a pit
  inv: 90,              // after a respawn: can't be hit, passes through others
  shell: 5, shellLife: 34, missileLife: 150, laser: 176,
  boostTime: 70, boostMul: 1.45, padTime: 32, padMul: 1.35, rampMin: 1.5,
  money: 100, moneyBack: 600, repairBack: 900,
  mineArm: 30, mineLife: 3600, oilLife: 1500, oilSpin: 46, smokeLife: 300, lava: 40,
  endWait: 480,         // after the second racer finishes, the rest have this long
  count: 50,            // each step of the countdown
};
// the ground: one kind per tile character (TRACKS draws them, this gives them their meaning)
const RK_WALL = 0, RK_ROAD = 1, RK_ROUGH = 2, RK_ICE = 3, RK_MUD = 4, RK_PIT = 5, RK_LAVA = 6, RK_BOOST = 7, RK_CRATE = 8, RK_JUMP = 9;   // 9-12: ramps up, right, down, left
const RALLY_KIND = { '#': RK_WALL, ' ': RK_WALL, '.': RK_ROAD, s: RK_ROAD, '=': RK_ROAD, $: RK_ROAD, '+': RK_ROAD, ',': RK_ROUGH, i: RK_ICE, m: RK_MUD,
  '~': RK_PIT, l: RK_LAVA, b: RK_BOOST, x: RK_CRATE, '^': RK_JUMP, '>': RK_JUMP + 1, v: RK_JUMP + 2, '<': RK_JUMP + 3 };
// what the ground allows: top speed, acceleration, grip (rough and mud: susp is what each level of suspension gives back)
const RALLY_SURF = [null, { top: 1, acc: 1, grip: 1 }, { top: 0.62, acc: 0.75, grip: 0.85, susp: 0.1 }, { top: 1.05, acc: 0.4, grip: 0.22 },
  { top: 0.45, acc: 0.55, grip: 1.1, susp: 0.06 }, null, { top: 0.7, acc: 0.7, grip: 0.9 }];
const RALLY_FWD = ['cannon', 'missile', 'laser'], RALLY_DROP = ['mine', 'oil', 'smoke'];
const RALLY_DEFAULT_LOADOUT = { chassis: 'scout', spec: 'p1', topSpeed: 1.7, accel: 0.05, grip: 0.55, armor: 4, susp: 1,
  fwd: { kind: 'cannon', charges: 4, dmg: 1 }, drop: { kind: 'mine', charges: 2 }, boost: 2 };
const RALLY_AI_PALS = ['c_RED', 'c_BLUE', 'c_PURPLE', 'c_WHITE', 'c_ORANGE', 'c_CYAN'];
const RALLY_AI_SPECS = ['e1', 'e2', 'e3', 'e0'];
const RALLY_AI_NAMES = ['RIVET', 'TORQUE', 'SPROCKET', 'GRAVEL', 'NOVA', 'BRASS'];
const RALLY_STYLES = ['clean', 'aggressive', 'dirty'];
const RALLY_ORD = ['1ST', '2ND', '3RD', '4TH', '5TH', '6TH'];
const RALLY_POS_COL = [COL.gold, COL.white, '#F87858', '#ADADAD'];

// race clock: M:SS.T
function rallyClock(f) {
  if (!(f >= 0)) return '-:--.-';
  const t = Math.floor(f / 6), s = Math.floor(t / 10);
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0') + '.' + (t % 10);
}
const rallyName = d => (d && d.name) || (d && d.human ? ROMAN[d.player | 0] + '-PLAYER' : 'RIVAL');

// ================================================================= tracks
// the built-in test oval: only when no track list was loaded (rallytracks.js), so the mode still runs
function rallyTestOval() {
  const W = 44, H = 28, rows = [];
  for (let y = 0; y < H; y++) {
    let r = '';
    for (let x = 0; x < W; x++) {
      const edge = x === 0 || y === 0 || x === W - 1 || y === H - 1, infield = x >= 7 && x <= W - 8 && y >= 7 && y <= H - 8;
      r += edge || infield ? '#' : x === 12 && y <= 6 ? 's' : x >= 20 && x <= 22 && y === 24 ? 'b' : (x === 26 && y === 3) ? '$' : (x === 3 && y === 13) ? '+' : '.';
    }
    rows.push(r);
  }
  // the centre of the ring, its corners cut, points at most 7 tiles apart, from the start line on
  const x0 = 3, y0 = 3, x1 = W - 4, y1 = H - 4, c = 3, corners = [[x0 + c, y0], [x1 - c, y0], [x1, y0 + c], [x1, y1 - c], [x1 - c, y1], [x0 + c, y1], [x0, y1 - c], [x0, y0 + c]];
  const pts = [];
  corners.forEach((a, i) => {
    const b = corners[(i + 1) % corners.length], n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 7));
    for (let k = 0; k < n; k++) pts.push([Math.round(a[0] + (b[0] - a[0]) * k / n), Math.round(a[1] + (b[1] - a[1]) * k / n)]);
  });
  const at = pts.findIndex(p => p[1] === y0 && p[0] >= 12);
  const path = [[12, 3]].concat(pts.slice(at).concat(pts.slice(0, at)).filter(p => !(p[0] === 12 && p[1] === 3)));
  return { key: 'testoval', name: 'TEST OVAL', world: 'test', laps: 4, rows, start: { x: 14, y: 3, dir: 1 }, path };
}

function rallyTrackList() {
  return typeof RALLY_TRACKS !== 'undefined' && Array.isArray(RALLY_TRACKS) && RALLY_TRACKS.length ? RALLY_TRACKS : null;
}
// a track by its key (or a track itself); the first one, or the test oval, otherwise
function rallyTrackDef(key) {
  if (key && typeof key === 'object' && Array.isArray(key.rows)) return key;
  const list = rallyTrackList();
  if (list) return list.find(t => t.key === key) || list[0];
  return RALLY_OVAL || (RALLY_OVAL = rallyTestOval());
}
let RALLY_OVAL = null;

// a track made ready to race once: the tile kinds, the racing line (lengths, directions, gates, the room past each
// corner), the pickup spots. Kept per track.
const RALLY_PREP = new Map();
function rallyPrep(def) {
  let T = RALLY_PREP.get(def);
  if (T) return T;
  const H = def.rows.length, W = Math.max(...def.rows.map(r => r.length));
  const rows = def.rows.map(r => r.padEnd(W, ' '));
  const kind = new Uint8Array(W * H), spots = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const c = rows[y][x];
    kind[y * W + x] = c in RALLY_KIND ? RALLY_KIND[c] : RK_ROAD;   // anything else is drawn scenery on the track
    if (c === '$' || c === '+') spots.push({ x: x * 16 + 8, y: y * 16 + 8, kind: c });
  }
  // the racing line, in px (tile centres), with repeats taken out
  const P = [];
  for (const p of def.path || []) {
    const q = [p[0] * 16 + 8, p[1] * 16 + 8], l = P[P.length - 1];
    if (!l || l[0] !== q[0] || l[1] !== q[1]) P.push(q);
  }
  if (P.length > 2 && P[0][0] === P[P.length - 1][0] && P[0][1] === P[P.length - 1][1]) P.pop();
  const n = P.length, len = [], S = [], U = [], D = [];
  let L = 0;
  for (let k = 0; k < n; k++) {
    const a = P[k], b = P[(k + 1) % n], d = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    len.push(d); S.push(L); U.push([(b[0] - a[0]) / d, (b[1] - a[1]) / d]); L += d;
  }
  // each gate faces between the way in and the way out
  for (let k = 0; k < n; k++) {
    const a = U[(k + n - 1) % n], b = U[k], x = a[0] + b[0], y = a[1] + b[1], d = Math.hypot(x, y);
    D.push(d > 0.1 ? [x / d, y / d] : b);
  }
  T = { def, key: def.key || 'track', name: def.name || 'TRACK', world: def.world || '', laps: def.laps || 4, W, H, rows, kind, spots, P, n, len, S, U, D, L };
  // the room past each waypoint going straight on (how far a tank can slide wide there), for the rivals' braking
  T.room = P.map((p, k) => {
    const u = U[(k + n - 1) % n];
    let d = 0;
    while (d < 128) { const kk = rallyKindAt(T, kind, p[0] + u[0] * (d + 4), p[1] + u[1] * (d + 4)); if (kk === RK_WALL || kk === RK_CRATE || kk === RK_PIT) break; d += 4; }
    return d;
  });
  RALLY_PREP.set(def, T);
  return T;
}
function rallyKindAt(T, kind, x, y) {
  const tx = Math.floor(x / 16), ty = Math.floor(y / 16);
  return tx < 0 || ty < 0 || tx >= T.W || ty >= T.H ? RK_WALL : kind[ty * T.W + tx];
}

// ----------------------------------------------------------------- the ground, drawn once per track
// TRACKS' rallyGround(track) (the whole ground on one canvas, kept per track) when it's loaded; else tile by tile with
// rallyGroundArt (it draws at 0,0: moved there), else a plain look of our own
const RALLY_GROUND = new Map();
function rallySeedOf(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; }
function rallyDrawTile(g, T, ch, tx, ty, R) {
  if (typeof rallyGroundArt === 'function') {
    g.save();
    try { g.translate(tx * 16, ty * 16); rallyGroundArt(g, ch, tx, ty, T.world, R, T.def); g.restore(); return; } catch (e) { g.restore(); }
  }
  rallyBaseArt(g, ch, tx, ty, R);
}
function rallyGroundOf(T) {
  let c = RALLY_GROUND.get(T);
  if (c) return c;
  if (typeof rallyGround === 'function' && T.world !== 'test') { try { c = rallyGround(T.def); } catch (e) { c = null; } }
  if (!c || c.width !== T.W * 16 || c.height !== T.H * 16) {
    c = makeCanvas(T.W * 16, T.H * 16);
    const g = c.getContext('2d'), R = seeded(rallySeedOf(T.key));
    g.imageSmoothingEnabled = false;
    for (let y = 0; y < T.H; y++) for (let x = 0; x < T.W; x++) rallyDrawTile(g, T, T.rows[y][x], x, y, R);
  }
  RALLY_GROUND.set(T, c);
  return c;
}
// the plain look (no track art loaded)
function rallyBaseArt(g, ch, tx, ty, R) {
  const x = tx * 16, y = ty * 16, px = (c, a, b, w = 1, h = 1) => { g.fillStyle = c; g.fillRect(x + a, y + b, w, h); };
  const speck = (c, n) => { for (let k = 0; k < n; k++) px(c, (R() * 16) | 0, (R() * 16) | 0); };
  const road = () => { px('#5C5C5C', 0, 0, 16, 16); speck('#6C6C6C', 6); speck('#4C4C4C', 6); };
  switch (ch) {
    case '#': px('#7C7C7C', 0, 0, 16, 16); px('#BCBCBC', 0, 0, 16, 2); px('#3C3C3C', 0, 13, 16, 3); px('#9C9C9C', 0, 6, 16, 1); break;
    case ' ': px('#005800', 0, 0, 16, 16); speck('#00A844', 6); speck('#003800', 5); break;
    case ',': px('#8C6C44', 0, 0, 16, 16); speck('#AC8C5C', 10); speck('#5C4C2C', 8); break;
    case 'i': px('#A8D8F0', 0, 0, 16, 16); px('#E8F8FC', (R() * 8) | 0, (R() * 14) | 0, 6, 1); px('#E8F8FC', (R() * 8) | 0, (R() * 14) | 0, 5, 1); speck('#78B8D8', 4); break;
    case 'm': for (let k = 0; k < 4; k++) g.drawImage(Sprites.mudTex, x + (k & 1) * 8, y + (k >> 1) * 8); break;
    case '~': px('#000000', 0, 0, 16, 16); px('#101830', (R() * 10) | 0, (R() * 14) | 0, 5, 1); px('#101830', (R() * 10) | 0, (R() * 14) | 0, 4, 1); break;
    case 'l': px('#C81800', 0, 0, 16, 16); speck('#F8B800', 7); speck('#F87800', 9); break;
    case 's': for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) px((i + j) & 1 ? '#000000' : '#F8F8F8', i * 4, j * 4, 4, 4); break;
    case '=': for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) px((i + j) & 1 ? '#D82800' : '#F8F8F8', i * 8, j * 8, 8, 8); break;
    case 'x': px('#6C3C0C', 0, 0, 16, 16); px('#B87830', 1, 1, 14, 14); px('#6C3C0C', 7, 1, 2, 14); px('#6C3C0C', 1, 7, 14, 2); px('#E8A848', 1, 1, 14, 1); break;
    case 'b': road(); px('#58D854', 2, 2, 12, 12); px('#005800', 4, 4, 8, 8); px('#B8F818', 6, 6, 4, 4); break;
    case '^': case '>': case 'v': case '<': {
      road();
      const d = '^>v<'.indexOf(ch);
      for (let k = 0; k < 3; k++) for (let j = -3; j <= 3; j++) {
        // chevrons pointing the ramp's way, a dark lip at its far end
        const a = 3 + k * 4 + Math.abs(j), b = 8 + j;
        const [ux, uy] = d === 0 ? [b, 15 - a] : d === 1 ? [a, b] : d === 2 ? [b, a] : [15 - a, b];
        px('#F8B800', ux, uy);
      }
      if (d === 0) px('#202020', 0, 0, 16, 2); else if (d === 1) px('#202020', 14, 0, 2, 16); else if (d === 2) px('#202020', 0, 14, 16, 2); else px('#202020', 0, 0, 2, 16);
      break;
    }
    default: road();
  }
}
const RALLY_THUMB = { '#': '#7C7C7C', ' ': '#004000', ',': '#8C6C44', i: '#A8D8F0', m: '#6C4818', '~': '#000000', l: '#E04000', s: '#F8F8F8', b: '#58D854', x: '#B87830', '=': '#D82800' };
function rallyThumbCol(ch) {
  if (typeof RALLY_THUMB_COL !== 'undefined' && RALLY_THUMB_COL && RALLY_THUMB_COL[ch]) return RALLY_THUMB_COL[ch];
  return RALLY_THUMB[ch] || (ch in RALLY_KIND && RALLY_KIND[ch] >= RK_JUMP ? '#F8B800' : '#A0A0A0');
}
// the minimap: a tile to a pixel, or fewer when the track is big
function rallyMiniOf(T) {
  if (T.mini) return T.mini;
  const step = Math.max(1, Math.ceil(Math.max(T.W / 64, T.H / 48))), mw = Math.ceil(T.W / step), mh = Math.ceil(T.H / step);
  const c = makeCanvas(mw, mh), g = c.getContext('2d');
  for (let y = 0; y < mh; y++) for (let x = 0; x < mw; x++) {
    // a cell shows track if any of its tiles is track
    let ch = ' ';
    for (let j = 0; j < step && ch === ' '; j++) for (let i = 0; i < step; i++) {
      const tx = x * step + i, ty = y * step + j;
      if (tx < T.W && ty < T.H && T.kind[ty * T.W + tx] !== RK_WALL) { ch = T.rows[ty][tx]; break; }
    }
    g.fillStyle = ch === ' ' ? 'rgba(0,0,0,0.55)' : rallyThumbCol(ch);
    g.fillRect(x, y, 1, 1);
  }
  T.mini = { c, step };
  return T.mini;
}

// ----------------------------------------------------------------- little pictures (icons and pickups)
const RALLY_ICON_SRC = {
  cannon: ['...11...', '..1221..', '..1221..', '..1221..', '..1221..', '..1221..', '..3333..', '..3333..'],
  missile: ['...1....', '..121...', '..121...', '..121...', '.31213..', '.3.1.3..', '...4....', '..4.4...'],
  laser: ['.....11.', '....11..', '...11...', '..1111..', '...11...', '..11....', '.11.....', '11......'],
  mine: ['..1..1..', '...22...', '.222222.', '.223322.', '.223322.', '.222222.', '...22...', '..1..1..'],
  oil: ['...1....', '..121...', '.12221..', '.12221..', '1222221.', '1232221.', '.12221..', '..111...'],
  smoke: ['........', '..111...', '.11211..', '1122211.', '1222221.', '.122221.', '..1111..', '........'],
  boost: ['1..1..1.', '.1..1..1', '..1..1..', '...1..1.', '...1..1.', '..1..1..', '.1..1..1', '1..1..1.'],
  coin: ['....1111....', '..11222211..', '.1222222221.', '.1223333221.', '122322222221', '122233322221', '122222232221', '122233332221',
    '.1222322221.', '.1222222221.', '..11222211..', '....1111....'],
  repair: ['111111111111', '133333333331', '133332233331', '133332233331', '133332233331', '132222222231', '132222222231', '133332233331',
    '133332233331', '133332233331', '133333333331', '111111111111'],
};
const RALLY_ICON_COL = {
  cannon: { 1: '#F8F8F8', 2: '#C0C0C0', 3: '#7C7C7C' }, missile: { 1: '#F8F8F8', 2: '#58D854', 3: '#3C7C3C', 4: '#F87800' },
  laser: { 1: '#F83800' }, mine: { 1: '#ADADAD', 2: '#505050', 3: '#E04030' }, oil: { 1: '#202020', 2: '#383838', 3: '#9C9C9C' },
  smoke: { 1: '#7C7C7C', 2: '#C8C8C8' }, boost: { 1: '#3CBCFC' },
  coin: { 1: '#7C5800', 2: '#F8D838', 3: '#7C5800' }, repair: { 1: '#202020', 2: '#F83800', 3: '#F8F8F8' },
};
let RALLY_ICONS = null;
function rallyIcon(k) {
  if (!RALLY_ICONS) { RALLY_ICONS = {}; for (const n in RALLY_ICON_SRC) RALLY_ICONS[n] = paintRows(RALLY_ICON_SRC[n], RALLY_ICON_COL[n]); }
  return RALLY_ICONS[k];
}

// ----------------------------------------------------------------- a racer's tank: its loadout, as the career gave it
function rallyLoadoutOf(def, i) {
  let lo = def.loadout;
  if (!lo && typeof rallyLoadout === 'function') { try { lo = rallyLoadout(def); } catch (e) { lo = null; } }
  lo = lo || {};
  const D = RALLY_DEFAULT_LOADOUT, num = (v, d, a, b) => (typeof v === 'number' && isFinite(v) ? Math.max(a, Math.min(b, v)) : d);
  const fwd = lo.fwd || {}, drop = lo.drop || {};
  const pal = lo.pal && PALS[lo.pal] ? lo.pal : def.human ? Config.playerPal(def.player | 0) : RALLY_AI_PALS[i % RALLY_AI_PALS.length];
  const spec = lo.spec && TANK_GRIDS[lo.spec] ? lo.spec : def.human ? D.spec : RALLY_AI_SPECS[i % RALLY_AI_SPECS.length];
  return {
    chassis: lo.chassis || D.chassis, spec, pal,
    topSpeed: num(lo.topSpeed, D.topSpeed, 0.5, 3), accel: num(lo.accel, D.accel, 0.01, 0.2), grip: num(lo.grip, D.grip, 0, 1),
    armor: Math.round(num(lo.armor, D.armor, 1, 12)), susp: num(lo.susp, D.susp, 0, 3),
    fwd: { kind: RALLY_FWD.includes(fwd.kind) ? fwd.kind : D.fwd.kind, charges: Math.round(num(fwd.charges, D.fwd.charges, 0, 20)), dmg: Math.round(num(fwd.dmg, D.fwd.dmg, 1, 8)) },
    drop: { kind: RALLY_DROP.includes(drop.kind) ? drop.kind : D.drop.kind, charges: Math.round(num(drop.charges, D.drop.charges, 0, 20)) },
    boost: Math.round(num(lo.boost, D.boost, 0, 20)),
  };
}

// ================================================================= the race
class RallyRace {
  constructor(opts, T) {
    this.rally = true; this.opts = opts; this.T = T;
    this.frame = 0; this.over = false; this.result = null; this.done = false; this.reported = false;
    this.laps = Math.max(1, Math.min(20, opts.laps | 0 || T.laps || 4));
    this.kind = T.kind.slice();   // crates break
    this.crates = new Map();
    this.ground = makeCanvas(T.W * 16, T.H * 16);
    this.ground.getContext('2d').drawImage(rallyGroundOf(T), 0, 0);
    this.shots = []; this.beams = []; this.mines = []; this.oils = []; this.smokes = []; this.fx = []; this.parts = []; this.popups = [];
    this.calls = []; this.call = null;
    this.spots = T.spots.map(s => Object.assign({ wait: 0 }, s));
    this.phase = 'intro'; this.t = 0; this.clock = 0;
    this.finishOrder = []; this.endAt = 0; this.stuckResets = 0; this.stuckAt = []; this.leader = null; this.leadSaid = 0;
    const defs = (opts.racers && opts.racers.length ? opts.racers : [{ id: 'p0', human: true, player: 0 }]).slice(0, 6);
    const grid = this.gridSpots(defs.length);
    this.racers = defs.map((d, i) => this.newRacer(d, i, grid[i]));
    this.humans = this.racers.filter(r => r.human);
    for (const r of this.racers) this.startLine(r);
    this.order = this.racers.slice();
    this.updatePlaces();
    const f = this.focus();
    this.camX = Math.max(0, Math.min(FW - VIEW_W, f.x - VIEW_W / 2)); this.camY = Math.max(0, Math.min(FH - VIEW_H, f.y - VIEW_H / 2));
  }

  // the starting grid: the staggered slots the track paints behind its start line (two, one, two, one: a tile back
  // and to each side, two back in the middle, ...); where those aren't clear, pole on the start tile and the rest
  // behind two by two (on whichever side has room)
  gridSpots(n) {
    const T = this.T, st = T.def.start || { x: T.def.path[0][0], y: T.def.path[0][1], dir: 1 };
    const d = (st.dir | 0) & 3, [fx, fy] = DXY[d], sx = -fy, sy = fx;
    const ok = (x, y) => !this.boxSolid(x, y, RALLY.half + 1) && this.kindAt(x, y) !== RK_PIT && this.kindAt(x, y) < RK_JUMP;
    const px = st.x * 16 + 8, py = st.y * 16 + 8, out = [];
    const slots = [[1, -1], [1, 1], [2, 0], [3, -1], [3, 1], [4, 0]].slice(0, n).map(([b, s]) => ({ x: px - fx * b * 16 + sx * s * 16, y: py - fy * b * 16 + sy * s * 16, dir: d }));
    if (slots.every(p => ok(p.x, p.y))) return slots;
    let side = 0;
    for (const s of [1, -1]) if (!side && ok(px + sx * 18 * s, py + sy * 18 * s) && ok(px + sx * 18 * s - fx * 48, py + sy * 18 * s - fy * 48)) side = s;
    for (let i = 0; i < n; i++) {
      let x, y;
      if (side) { const row = i >> 1; x = px - fx * row * 26 + (i & 1 ? sx * 18 * side : 0) - (i & 1 ? fx * 10 : 0); y = py - fy * row * 26 + (i & 1 ? sy * 18 * side : 0) - (i & 1 ? fy * 10 : 0); }
      else { x = px - fx * i * 22; y = py - fy * i * 22; }
      out.push({ x, y, dir: d });
    }
    return out;
  }

  newRacer(def, i, g) {
    const lo = rallyLoadoutOf(def, i), human = !!def.human;
    const skill = Math.max(0, Math.min(4, def.skill === undefined ? 2 : def.skill | 0)), style = RALLY_STYLES.includes(def.style) ? def.style : 'clean';
    const color = typeof def.color === 'string' && def.color[0] === '#' ? def.color : def.color && PALS[def.color] ? PALS[def.color][2] : PALS[lo.pal][2];
    return {
      def, i, id: def.id !== undefined ? def.id : i, name: rallyName(def), human, player: def.player | 0, skill, style, lo, color,
      x: g.x, y: g.y, vx: 0, vy: 0, dir: g.dir, look: g.dir, z: 0, air: 0, airT: 0, airH: 0, anim: 0, animT: 0,
      armor: lo.armor, ch: { fwd: lo.fwd.charges, drop: lo.drop.charges, boost: lo.boost },
      boostT: 0, spin: 0, spinT: 0, hidden: 0, wreck: 0, fall: 0, inv: 0, hitT: 0, lavaT: 0, cool: 0, dcool: 0, wrong: 0, off: 0,
      lap: 0, maxLap: 0, seg: 0, s: 0, prog: 0, lapStart: 0, best: 0, lapTimes: [],
      kills: 0, killTimes: [], wrecks: 0, money: 0, finished: false, place: 0, time: 0, pos: i + 1, fired: false,
      topMul: 1, btn: { f: 0, b: 0 }, padIn: false,
      ai: { dir: g.dir, pend: -1, pendT: 0, brake: 0, chkT: 0, chkProg: -1e9, stuck: 0, recover: 0, fireCd: 30 + i * 7 },
    };
  }

  // where each racer stands against the start/finish gate: past it, on lap 1 already; behind it, still to cross
  startLine(r) {
    const T = this.T, [px, py] = T.P[0], [dx, dy] = T.D[0];
    if ((r.x - px) * dx + (r.y - py) * dy >= 0) { r.lap = 1; r.maxLap = 1; r.seg = 0; } else { r.lap = 0; r.maxLap = 0; r.seg = T.n - 1; }
    this.track(r);
  }

  // ------------------------------------------------------------ the ground
  kindAt(x, y) { return rallyKindAt(this.T, this.kind, x, y); }
  solidAt(x, y) { const k = this.kindAt(x, y); return k === RK_WALL || k === RK_CRATE; }
  boxSolid(x, y, h) {
    const x0 = Math.floor((x - h) / 16), x1 = Math.floor((x + h - 0.01) / 16), y0 = Math.floor((y - h) / 16), y1 = Math.floor((y + h - 0.01) / 16);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
      if (tx < 0 || ty < 0 || tx >= this.T.W || ty >= this.T.H) return true;
      const k = this.kind[ty * this.T.W + tx];
      if (k === RK_WALL || k === RK_CRATE) return true;
    }
    return false;
  }
  surfOf(r) {
    const k = this.kindAt(r.x, r.y), s = RALLY_SURF[k] || RALLY_SURF[RK_ROAD];
    return { top: s.top + (s.susp || 0) * r.lo.susp, acc: s.acc, grip: s.grip, k };
  }
  gripOf(r, k) {
    const s = RALLY_SURF[k === undefined ? this.kindAt(r.x, r.y) : k] || RALLY_SURF[RK_ROAD];
    return Math.min(0.5, (0.05 + 0.11 * r.lo.grip) * s.grip * (r.spin > 0 ? 0.3 : 1));
  }
  // a point on the racing line, s px along it from the start line
  pathAt(s, hint) {
    const T = this.T, n = T.n;
    s = ((s % T.L) + T.L) % T.L;
    let k = hint === undefined ? 0 : hint;
    for (let j = 0; j < n; j++) { if (s >= T.S[k] && s < T.S[k] + T.len[k]) break; k = (k + 1) % n; }
    const d = s - T.S[k];
    return { x: T.P[k][0] + T.U[k][0] * d, y: T.P[k][1] + T.U[k][1] * d, k };
  }

  // ------------------------------------------------------------ laps and places
  // the next gate passed (in order only), or the last one passed backwards; then how far along the line
  track(r) {
    const T = this.T, n = T.n, G2 = RALLY.gate * RALLY.gate;
    for (let j = 0; j < 3; j++) {
      const k = (r.seg + 1) % n, ox = r.x - T.P[k][0], oy = r.y - T.P[k][1];
      if (ox * T.D[k][0] + oy * T.D[k][1] >= 0 && ox * ox + oy * oy < G2) { r.seg = k; if (k === 0) this.crossLine(r); } else break;
    }
    {
      const k = r.seg, ox = r.x - T.P[k][0], oy = r.y - T.P[k][1];
      if (ox * T.D[k][0] + oy * T.D[k][1] < -10 && ox * ox + oy * oy < G2) { if (k === 0) r.lap--; r.seg = (k + n - 1) % n; }
    }
    const k = r.seg, t = Math.max(0, Math.min(T.len[k], (r.x - T.P[k][0]) * T.U[k][0] + (r.y - T.P[k][1]) * T.U[k][1]));
    r.s = T.S[k] + t;
    r.prog = (r.lap - 1) * T.L + r.s;
  }

  crossLine(r) {
    r.lap++;
    if (r.lap <= r.maxLap) return;   // back over the line and across again: nothing new
    r.maxLap = r.lap;
    if (r.lap > 1) {
      const lt = this.clock - r.lapStart;
      r.lapTimes.push(lt);
      if (!r.best || lt < r.best) r.best = lt;
      // a fresh lap: the charges are full again
      r.ch.fwd = Math.max(r.ch.fwd, r.lo.fwd.charges); r.ch.drop = Math.max(r.ch.drop, r.lo.drop.charges); r.ch.boost = Math.max(r.ch.boost, r.lo.boost);
      if (r.human && r.lap <= this.laps) { Sound.play('pickup'); this.pop(r, 'RELOADED', '#58D854'); }
    }
    r.lapStart = this.clock;
    if (r.lap > this.laps && !r.finished) this.finish(r);
    else if (r.lap === this.laps && this.laps > 1 && this.phase === 'race') {
      // the final lap: for each player as they start it, and when the first rival does (before any player)
      if (r.human) this.say(this.humans.length > 1 ? r.name + ': FINAL LAP!' : 'FINAL LAP!', COL.gold, 2);
      else if (!this.finalSaid && !this.humans.some(h => h.lap >= this.laps)) this.say(r.name + ' STARTS THE FINAL LAP!', COL.white, 1);
      this.finalSaid = true;
    }
  }

  finish(r) {
    r.finished = true;
    r.time = this.clock;
    this.finishOrder.push(r);
    r.place = this.finishOrder.length;
    r.boostT = 0;
    if (r.place === 1) this.say(r.name + ' TAKES THE FLAG!', COL.gold, 3);
    else if (r.human) this.say(r.name + ' FINISHES ' + RALLY_ORD[r.place - 1], COL.white, 2);
    if (r.human) Sound.play(r.place === 1 ? 'bonus' : 'life');
    if (this.finishOrder.length === 2 && !this.endAt) this.endAt = this.clock + RALLY.endWait;
  }

  updatePlaces() {
    this.order = this.racers.slice().sort((a, b) => (a.finished || b.finished ? (a.finished ? (b.finished ? a.place - b.place : -1) : 1) : b.prog - a.prog));
    this.order.forEach((r, k) => { r.pos = k + 1; });
    const lead = this.order[0];
    if (this.phase === 'race' && lead !== this.leader) {
      if (this.leader && this.frame - this.leadSaid > 150 && this.clock > 120) {
        this.leadSaid = this.frame;
        this.say(lead.name + [' TAKES THE LEAD!', ' GRABS THE LEAD!', ' MUSCLES TO THE FRONT!'][(this.frame >> 3) % 3], lead.human ? COL.gold : COL.white, 1);
      }
      this.leader = lead;
    }
  }

  // ------------------------------------------------------------ the frame
  update() {
    this.frame++; this.t++;
    if (this.phase === 'intro') { if (this.t >= 40) { this.phase = 'count'; this.t = 0; Sound.play('csBeep'); } }
    else if (this.phase === 'count') {
      if (this.t === RALLY.count || this.t === RALLY.count * 2) Sound.play('csBeep');
      if (this.t >= RALLY.count * 3) { this.phase = 'race'; this.t = 0; Sound.play('csGo'); this.say(['ENGINES HOT, GUNS LOADED!', 'PEDAL DOWN, SHELLS UP!', 'LET THE SCRAP FLY!'][rnd(3)], COL.gold, 1); }
    } else if (this.phase === 'race' || this.phase === 'results') {
      if (this.phase === 'race') this.clock++;
      this.rubber();
      for (const r of this.racers) this.updateRacer(r);
      this.collide();
      this.updateShots();
      this.updateHazards();
      this.updateSpots();
      for (const r of this.racers) if (r.x > -900) this.track(r);
      this.updatePlaces();
      if (this.phase === 'race') { this.checkEnd(); this.onFire(); this.catchUp(); }
      else if (++this.resT > 330 || (this.resT > 60 && this.humans.some(h => { const i = this.rawInput(h); return i.firePressed || i.altPressed; }))) this.done = true;
    }
    for (const f of this.fx) f.tick++;
    this.fx = this.fx.filter(f => f.tick < f.frames.length * f.per);
    for (const p of this.parts) { p.x += p.vx; p.y += p.vy; p.t--; }
    this.parts = this.parts.filter(p => p.t > 0);
    for (const p of this.popups) p.t++;
    this.popups = this.popups.filter(p => p.t < 60);
    for (const b of this.beams) b.t--;
    this.beams = this.beams.filter(b => b.t > 0);
    this.updateCalls();
    this.updateCamera();
    const f = this.focus();
    Sound.setEngine(this.phase === 'results' || this.done ? 0 : f && !f.wreck && Math.hypot(f.vx, f.vy) > 0.3 ? 2 : 1);
  }

  // the rivals hang on a little when they fall far behind, and ease off a little far ahead (never much)
  rubber() {
    const hs = this.humans.filter(h => !h.finished);
    const ref = hs.length ? Math.max(...hs.map(h => h.prog)) : null;
    for (const r of this.racers) {
      if (r.human) { r.topMul = 1; continue; }
      const sk = (0.84 + 0.04 * r.skill) * (r.style === 'clean' ? 1.02 : 1);
      const gap = ref === null ? 0 : Math.max(-0.4, Math.min(0.6, (ref - r.prog) / this.T.L));
      r.topMul = sk * (1 + (gap > 0 ? gap * 0.07 : gap * 0.06));
    }
  }

  rawInput(r) {
    if (typeof r.def.input === 'function') {
      const i = r.def.input(this, r) || {};
      return { dir: i.dir === undefined ? -1 : i.dir, fire: !!i.fire, firePressed: !!(i.firePressed || i.fire), alt: !!i.alt, altPressed: !!(i.altPressed || i.alt), boost: !!i.boost };
    }
    return Input.player(r.player);
  }

  // a human's buttons: FIRE the weapon, B the drop, the two together (within a few frames of each other) BOOST
  humanInput(r) {
    const i = this.rawInput(r), B = r.btn, out = { dir: i.dir, fire: false, drop: false, boost: !!i.boost };
    if (i.firePressed) B.f = 5;
    if (i.altPressed) B.b = 5;
    if (B.f > 0 && B.b > 0) { out.boost = true; B.f = B.b = 0; }
    else {
      if (B.f > 0 && --B.f === 0) out.fire = true;
      if (B.b > 0 && --B.b === 0) out.drop = true;
    }
    return out;
  }

  updateRacer(r) {
    if (r.cool > 0) r.cool--;
    if (r.dcool > 0) r.dcool--;
    if (r.hitT > 0) r.hitT--;
    if (r.inv > 0) r.inv--;
    if (r.hidden > 0) r.hidden--;
    if (r.fall > 0) {
      // falling into a pit: down it goes, then the wreck's wait
      if (--r.fall === 0) { r.wreck = RALLY.respawn - RALLY.fall; r.wrecks++; }
      return;
    }
    if (r.wreck > 0) { if (--r.wreck === 0) { this.respawn(r, r.catchS); r.catchS = undefined; } return; }
    // (a racer given an input function is driven by it: the tests, a demo)
    const inp = this.phase !== 'race' || r.finished ? this.aiInput(r, true) : r.human || typeof r.def.input === 'function' ? this.humanInput(r) : this.aiInput(r, false);
    if (inp.boost) this.boostIt(r);
    else {
      if (inp.fire) this.fireFwd(r);
      if (inp.drop) this.dropIt(r);
    }
    if (r.air > 0) this.flyStep(r); else this.drive(r, inp.dir);
    this.slideMove(r);
    if (r.air === 0) this.groundEffects(r);
    if (r.boostT > 0) { r.boostT--; if (this.frame & 1) this.part(r.x - DXY[r.look][0] * 9, r.y - DXY[r.look][1] * 9, -DXY[r.look][0] * 0.5, -DXY[r.look][1] * 0.5, (this.frame >> 1) & 1 ? '#F8D838' : '#F87800', 8); }
    // the tracks turn with the speed
    r.animT += Math.hypot(r.vx, r.vy);
    if (r.animT > 3) { r.animT = 0; r.anim ^= 1; }
    // facing back down the line
    const sp = Math.hypot(r.vx, r.vy), u = this.T.U[r.seg];
    if (sp > 0.4 && r.vx * u[0] + r.vy * u[1] < -0.3 * sp) r.wrong++; else r.wrong = Math.max(0, r.wrong - 3);
    if (!r.human) this.aiStuck(r);
  }

  // driving on the ground: the held direction pushes that way; what was going sideways slides on as grip allows
  drive(r, dir) {
    const sf = this.surfOf(r);
    let top = r.lo.topSpeed * sf.top * r.topMul * (r.boostT > 0 ? RALLY.boostMul : 1);
    if (r.finished) top *= 0.6;
    const acc = r.lo.accel * sf.acc * (r.boostT > 0 ? 2.2 : 1), gf = this.gripOf(r, sf.k);
    if (r.spin > 0) {
      // oil: round and round, no steering
      r.spin--;
      if (++r.spinT % 5 === 0) r.dir = (r.dir + 1) & 3;
      r.look = r.dir;
      dir = -1;
    }
    const sp0 = Math.hypot(r.vx, r.vy);
    if (dir >= 0) {
      // braking (the opposite way at speed): the tank keeps looking where it goes
      const opp = sp0 > 0.5 && ((dir === 0 && r.vy > 0.5) || (dir === 2 && r.vy < -0.5) || (dir === 1 && r.vx < -0.5) || (dir === 3 && r.vx > 0.5)) && Math.abs(DXY[dir][0] ? r.vx : r.vy) > sp0 * 0.7;
      r.dir = dir;
      if (!opp) r.look = dir;
    }
    const [fx, fy] = DXY[r.dir];
    let fwd = r.vx * fx + r.vy * fy, lat = -r.vx * fy + r.vy * fx;
    const lost = lat * gf;
    lat -= lost;
    if (dir >= 0) {
      fwd += Math.abs(lost) * 0.55;   // part of the slide carries on the new way
      if (fwd < 0) fwd = Math.min(0, fwd + acc * 2.2 * Math.min(1, sf.grip) + 0.02);
      else if (fwd < top) fwd = Math.min(top, fwd + acc);
      else fwd = Math.max(top, fwd - (fwd - top) * 0.07 - 0.01);
    } else {
      const c = 0.014 + (sf.top < 0.8 ? 0.02 : 0);
      fwd = fwd > 0 ? Math.max(0, fwd - c) : Math.min(0, fwd + c);
      if (fwd > top) fwd -= (fwd - top) * 0.07;
    }
    r.vx = fwd * fx - lat * fy;
    r.vy = fwd * fy + lat * fx;
    if (Math.abs(lat) > 0.9 && (this.frame & 3) === 0) {
      this.part(r.x + (Math.random() - 0.5) * 10, r.y + (Math.random() - 0.5) * 10, 0, 0, sf.k === RK_ICE ? '#E8F8FC' : sf.k === RK_ROUGH || sf.k === RK_MUD ? '#8C6C44' : '#9C9C9C', 12);
      if (r.human && (this.frame & 15) === 0 && Math.abs(lat) > 1.3) Sound.play('skid');
    }
  }

  // in the air: on it flies, nothing to steer
  flyStep(r) {
    r.air++;
    r.z = r.airH * Math.sin(Math.PI * Math.min(1, r.air / r.airT));
    if (r.air >= r.airT) {
      r.air = 0; r.z = 0;
      for (let k = 0; k < 4; k++) this.part(r.x, r.y + 6, (k - 1.5) * 0.4, 0.1, '#BCBCBC', 10);
      if (this.near(r)) Sound.play('bump');
    }
  }

  // moving, an axis at a time: walls stop you, but their corners nudge you past
  slideMove(r) {
    const h = RALLY.half;
    const sp = Math.hypot(r.vx, r.vy);
    if (sp > 4.5) { r.vx *= 4.5 / sp; r.vy *= 4.5 / sp; }
    if (this.boxSolid(r.x, r.y, h)) this.unstick(r);
    // x
    let nx = r.x + r.vx;
    if (r.vx && this.boxSolid(nx, r.y, h)) {
      const ny = Math.abs(r.vx) > Math.abs(r.vy) * 0.5 ? this.cornerNudge(nx, r.y, h, false) : 0;
      if (ny && !this.boxSolid(r.x, r.y + ny, h)) { r.y += ny; r.vx *= 0.97; if (this.boxSolid(nx, r.y, h)) nx = r.x; }
      else nx = this.hitWall(r, 'x', nx);
    }
    r.x = nx;
    // y
    let ny = r.y + r.vy;
    if (r.vy && this.boxSolid(r.x, ny, h)) {
      const nx2 = Math.abs(r.vy) > Math.abs(r.vx) * 0.5 ? this.cornerNudge(r.x, ny, h, true) : 0;
      if (nx2 && !this.boxSolid(r.x + nx2, r.y, h)) { r.x += nx2; r.vy *= 0.97; if (this.boxSolid(r.x, ny, h)) ny = r.y; }
      else ny = this.hitWall(r, 'y', ny);
    }
    r.y = ny;
  }
  // somehow inside a wall (pushed in): out to the nearest free spot
  unstick(r) {
    for (let d = 1; d <= 12; d++) for (const [a, b] of [[0, -1], [1, 0], [0, 1], [-1, 0], [1, 1], [-1, 1], [1, -1], [-1, -1]]) {
      if (!this.boxSolid(r.x + a * d, r.y + b * d, RALLY.half)) { r.x += a * d; r.y += b * d; return; }
    }
  }
  // free a few px to one side? (along x when the move is in y, and the other way round)
  cornerNudge(x, y, h, alongX) {
    for (let k = 1; k <= 6; k++) for (const s of [-1, 1]) {
      if (!this.boxSolid(alongX ? x + s * k : x, alongX ? y : y + s * k, h)) return s * Math.min(k, 1.5);
    }
    return 0;
  }
  hitWall(r, axis, n) {
    const h = RALLY.half, v = axis === 'x' ? r.vx : r.vy, imp = Math.abs(v);
    // flush against the tile edge
    const p = v > 0 ? Math.floor((n + h) / 16) * 16 - h - 0.01 : (Math.floor((n - h) / 16) + 1) * 16 + h + 0.01;
    const old = axis === 'x' ? r.x : r.y, out = Math.abs(p - old) <= Math.abs(v) + 0.02 ? p : old;
    if (axis === 'x') { r.vx = -r.vx * 0.2; r.vy *= 0.85; } else { r.vy = -r.vy * 0.2; r.vx *= 0.85; }
    if (imp > 0.8) {
      if (this.near(r)) Sound.play('bump');
      for (let k = 0; k < 3; k++) this.part(r.x + (axis === 'x' ? Math.sign(v) * 8 : (k - 1) * 4), r.y + (axis === 'y' ? Math.sign(v) * 8 : (k - 1) * 4), (Math.random() - 0.5), (Math.random() - 0.5), '#F8D878', 8);
    }
    return out;
  }

  // what's under the tank: pits, ramps, pads, lava, pickups
  groundEffects(r) {
    const k = this.kindAt(r.x, r.y);
    if (k === RK_PIT) { this.fallIn(r); return; }
    if (k >= RK_JUMP) {
      // off the lip of the ramp (its last tile, the far quarter of it): launched, at least at the ramp's own kick,
      // the sideways speed halved; about three tiles of flight at racing speed
      const d = k - RK_JUMP, [jx, jy] = DXY[d], along = r.vx * jx + r.vy * jy;
      const tx = Math.floor(r.x / 16), ty = Math.floor(r.y / 16), lip = this.kindAt(r.x + jx * 16, r.y + jy * 16) !== k;
      const into = jx ? (jx > 0 ? r.x - tx * 16 : tx * 16 + 16 - r.x) : (jy > 0 ? r.y - ty * 16 : ty * 16 + 16 - r.y);
      if (along >= 0.4 && lip && into >= 11) {
        const a = Math.max(along, RALLY.rampMin), lat = (r.vx * -jy + r.vy * jx) * 0.5;
        r.vx = a * jx - lat * jy; r.vy = a * jy + lat * jx;
        r.airT = Math.min(44, Math.round(22 + a * 6)); r.air = 1; r.airH = 9 + r.airT / 4; r.z = 0.1;
        if (this.near(r)) Sound.play('boing');
        return;
      }
    }
    if (k === RK_BOOST) {
      if (!r.padIn) {
        r.padIn = true;
        const sp = Math.hypot(r.vx, r.vy), want = r.lo.topSpeed * RALLY.padMul;
        if (sp > 0.2 && sp < want) { r.vx *= want / sp; r.vy *= want / sp; }
        r.boostT = Math.max(r.boostT, RALLY.padTime);
        if (this.near(r)) Sound.play('charge');
      }
    } else r.padIn = false;
    if (k === RK_LAVA) {
      if (++r.lavaT % RALLY.lava === 0) this.damage(null, r, 1);
      if ((this.frame & 3) === 0) this.part(r.x + (Math.random() - 0.5) * 12, r.y + 4, 0, -0.4, (this.frame >> 2) & 1 ? '#F8B800' : '#F83800', 10);
      if (r.lavaT === 1 && this.near(r)) Sound.play('lava');
    } else r.lavaT = 0;
  }

  fallIn(r) {
    r.fall = RALLY.fall; r.vx *= 0.3; r.vy *= 0.3; r.boostT = 0; r.spin = 0;
    if (this.near(r)) Sound.play('sink');
    if (r.human || this.near(r)) this.say(r.name + [' TOOK A DIVE!', ' FOUND THE BOTTOM!', ' IS SWIMMING WITH THE BOLTS!'][rnd(3)], COL.white, 0);
  }

  // back on the racing line where it was (a little on if that spot is a pit, a ramp or taken)
  respawn(r, s) {
    const T = this.T;
    let at = s === undefined ? r.s : s, p = this.pathAt(at, r.seg);
    for (let j = 0; j < 60; j++) {
      const k = this.kindAt(p.x, p.y);
      const free = k !== RK_PIT && k !== RK_WALL && k !== RK_CRATE && k < RK_JUMP && !this.boxSolid(p.x, p.y, RALLY.half)
        && !this.racers.some(o => o !== r && !o.wreck && !o.fall && Math.hypot(o.x - p.x, o.y - p.y) < 14);
      if (free) break;
      at += 8; p = this.pathAt(at, p.k);
    }
    r.x = p.x; r.y = p.y; r.vx = r.vy = 0; r.z = 0; r.air = 0; r.spin = 0; r.boostT = 0; r.lavaT = 0; r.hitT = 0;
    const u = T.U[p.k];
    r.dir = r.look = Math.abs(u[0]) > Math.abs(u[1]) ? (u[0] > 0 ? 1 : 3) : (u[1] > 0 ? 2 : 0);
    r.armor = r.lo.armor; r.inv = RALLY.inv;
    // the line moved on past a gate or two: catch up with it
    const was = r.lap;
    this.track(r);
    if (r.lap < was) r.lap = was;
    r.ai.chkT = 0; r.ai.chkProg = r.prog; r.ai.recover = 0;
  }

  // racers that meet push each other apart and both lose speed
  collide() {
    const rs = this.racers;
    for (let a = 0; a < rs.length; a++) for (let b = a + 1; b < rs.length; b++) {
      const p = rs[a], q = rs[b];
      if (p.wreck || q.wreck || p.fall || q.fall || p.inv > 0 || q.inv > 0 || Math.abs(p.z - q.z) > 4) continue;
      const dx = q.x - p.x, dy = q.y - p.y, d = Math.hypot(dx, dy);
      if (d >= 13 || d < 0.01) continue;
      const nx = dx / d, ny = dy / d, push = (13 - d) / 2;
      // pushed apart, but never into a wall
      if (!this.boxSolid(p.x - nx * push, p.y - ny * push, RALLY.half)) { p.x -= nx * push; p.y -= ny * push; }
      if (!this.boxSolid(q.x + nx * push, q.y + ny * push, RALLY.half)) { q.x += nx * push; q.y += ny * push; }
      const rel = (q.vx - p.vx) * nx + (q.vy - p.vy) * ny;
      if (rel < 0) {
        const j = -rel * 0.75;
        p.vx -= nx * j; p.vy -= ny * j; q.vx += nx * j; q.vy += ny * j;
        for (const o of [p, q]) { o.vx *= 0.9; o.vy *= 0.9; }
        if (-rel > 0.6 && this.near(p)) Sound.play('bump');
      }
    }
  }

  // ------------------------------------------------------------ weapons, drops, boost
  hittable(o) { return !o.wreck && !o.fall && o.inv <= 0 && !o.finished && o.z < 4; }

  fireFwd(r) {
    if (r.ch.fwd <= 0 || r.cool > 0 || r.air > 0) return false;
    const kind = r.lo.fwd.kind, [fx, fy] = DXY[r.look], dmg = r.lo.fwd.dmg;
    r.ch.fwd--; r.cool = kind === 'laser' ? 30 : 22;
    const nx = r.x + fx * 10, ny = r.y + fy * 10;
    if (kind === 'cannon') {
      const v = RALLY.shell + Math.max(0, r.vx * fx + r.vy * fy);
      this.shots.push({ kind: 'shell', x: nx, y: ny, vx: fx * v, vy: fy * v, dir: r.look, owner: r, life: RALLY.shellLife, dmg });
      if (this.near(r)) Sound.play('shot');
    } else if (kind === 'missile') {
      const tgt = this.missileTarget(r);
      this.shots.push({ kind: 'missile', x: nx, y: ny, vx: fx * 2 + r.vx * 0.5, vy: fy * 2 + r.vy * 0.5, owner: r, target: tgt, life: RALLY.missileLife, dmg });
      if (this.near(r)) Sound.play('missile');
    } else {
      // the laser: at once, through every racer in line, up to a wall
      let x = nx, y = ny, d = 0;
      const hit = new Set();
      while (d < RALLY.laser && !this.solidAt(x, y)) {
        for (const o of this.racers) if (o !== r && !hit.has(o) && this.hittable(o) && Math.abs(o.x - x) < 8 && Math.abs(o.y - y) < 8) hit.add(o);
        x += fx * 4; y += fy * 4; d += 4;
      }
      this.beams.push({ x0: nx, y0: ny, x1: x, y1: y, t: 12 });
      for (const o of hit) this.damage(r, o, dmg);
      if (this.near(r)) Sound.play('laser');
    }
    r.fired = true;
    return true;
  }

  // a missile goes for the racer just ahead in the standings if it's near and in front, else the nearest in front
  missileTarget(r) {
    const [fx, fy] = DXY[r.look];
    const ok = o => o !== r && this.hittable(o) && o.hidden <= 0 && (o.x - r.x) * fx + (o.y - r.y) * fy > 8 && Math.hypot(o.x - r.x, o.y - r.y) < 240;
    const ahead = this.order[r.pos - 2];
    if (ahead && ok(ahead)) return ahead;
    let best = null, bd = 1e9;
    for (const o of this.racers) if (ok(o)) { const d = Math.hypot(o.x - r.x, o.y - r.y); if (d < bd) { bd = d; best = o; } }
    return best;
  }

  dropIt(r) {
    if (r.ch.drop <= 0 || r.dcool > 0 || r.air > 0) return false;
    const kind = r.lo.drop.kind, [fx, fy] = DXY[r.look], x = r.x - fx * 13, y = r.y - fy * 13;
    if (this.solidAt(x, y)) return false;
    r.ch.drop--; r.dcool = 24;
    if (kind === 'mine') { this.mines.push({ x, y, owner: r, t: 0 }); if (this.mines.length > 24) this.mines.shift(); }
    else if (kind === 'oil') { this.oils.push({ x, y, owner: r, t: 0 }); if (this.oils.length > 16) this.oils.shift(); }
    else { this.smokes.push({ x, y, t: 0 }); r.hidden = 240; }
    if (this.near(r)) Sound.play(kind === 'smoke' ? 'csSmoke' : 'build');
    return true;
  }

  boostIt(r) {
    if (r.ch.boost <= 0 || r.boostT > 20 || r.air > 0 || r.spin > 0) return false;
    r.ch.boost--; r.boostT = RALLY.boostTime;
    const [fx, fy] = DXY[r.look];
    r.vx += fx * 0.6; r.vy += fy * 0.6;
    if (this.near(r)) Sound.play('mph');
    return true;
  }

  updateShots() {
    for (const m of this.shots) {
      if (m.kind === 'missile') {
        // homing: turns toward its target, speeds up; loses it in smoke or when it's wrecked
        if (m.target && (!this.hittable(m.target) || m.target.hidden > 0)) m.target = null;
        const sp = Math.min(3.8, Math.hypot(m.vx, m.vy) + 0.06);
        let a = Math.atan2(m.vy, m.vx);
        if (m.target) {
          const want = Math.atan2(m.target.y - m.y, m.target.x - m.x);
          let da = want - a;
          while (da > Math.PI) da -= 2 * Math.PI;
          while (da < -Math.PI) da += 2 * Math.PI;
          a += Math.max(-0.11, Math.min(0.11, da));
        }
        m.vx = Math.cos(a) * sp; m.vy = Math.sin(a) * sp;
        if ((this.frame & 1) === 0) this.part(m.x, m.y, 0, 0, '#9C9C9C', 10);
      }
      // two half steps, so nothing is jumped over
      for (let s = 0; s < 2 && !m.done; s++) {
        m.x += m.vx / 2; m.y += m.vy / 2;
        if (this.solidAt(m.x, m.y)) {
          const tx = Math.floor(m.x / 16), ty = Math.floor(m.y / 16);
          if (this.kindAt(m.x, m.y) === RK_CRATE) this.hitCrate(tx, ty, m.kind === 'missile' ? 2 : 1);
          m.done = true; this.boom(m.x, m.y, false);
          break;
        }
        for (const o of this.racers) {
          if (o === m.owner || !this.hittable(o) || Math.abs(o.x - m.x) > 7 || Math.abs(o.y - m.y) > 7) continue;
          m.done = true; this.boom(m.x, m.y, false); this.damage(m.owner, o, m.dmg);
          break;
        }
      }
      if (--m.life <= 0 && !m.done) { m.done = true; if (m.kind === 'missile') this.boom(m.x, m.y, false); }
    }
    this.shots = this.shots.filter(m => !m.done);
  }

  hitCrate(tx, ty, n) {
    const i = ty * this.T.W + tx, hp = (this.crates.has(i) ? this.crates.get(i) : 2) - n;
    this.crates.set(i, hp);
    if (hp > 0) return;
    this.kind[i] = RK_ROAD;
    rallyDrawTile(this.ground.getContext('2d'), this.T, '.', tx, ty, seeded(i));
    this.addFx(tx * 16 + 8, ty * 16 + 8, Sprites.smallExp, 4);
    if (this.near({ x: tx * 16 + 8, y: ty * 16 + 8 })) Sound.play('crate');
  }

  // mines go off under whoever drives over them once armed, oil spins them, smoke hides who's in it
  updateHazards() {
    for (const m of this.mines) {
      if (++m.t > RALLY.mineLife) { m.done = true; continue; }
      if (m.t < RALLY.mineArm) continue;
      for (const o of this.racers) {
        if (!this.hittable(o) || Math.abs(o.x - m.x) > 9 || Math.abs(o.y - m.y) > 9) continue;
        m.done = true;
        this.boom(m.x, m.y, true);
        o.vx *= 0.3; o.vy *= 0.3; o.spin = Math.max(o.spin, 16);
        this.damage(m.owner, o, 2);
        break;
      }
    }
    this.mines = this.mines.filter(m => !m.done);
    for (const s of this.oils) {
      if (++s.t > RALLY.oilLife) { s.done = true; continue; }
      for (const o of this.racers) {
        if (s.t < 20 && o === s.owner) continue;
        if (!this.hittable(o) || o.spin > 0 || o.spinFrom === s || Math.abs(o.x - s.x) > 11 || Math.abs(o.y - s.y) > 9) continue;
        o.spin = RALLY.oilSpin; o.spinT = 0; o.spinFrom = s;
        if (this.near(o)) Sound.play('skid');
        if (o.human) this.pop(o, 'OIL!', '#9C9C9C');
      }
    }
    this.oils = this.oils.filter(s => !s.done);
    for (const s of this.smokes) {
      s.t++;
      for (const o of this.racers) if (Math.hypot(o.x - s.x, o.y - s.y) < 26 && s.t > 10) o.hidden = Math.max(o.hidden, 2);
    }
    this.smokes = this.smokes.filter(s => s.t < RALLY.smokeLife);
  }

  // $ pays, + repairs and tops the charges up; both come back after a while
  updateSpots() {
    for (const sp of this.spots) {
      if (sp.wait > 0) { sp.wait--; continue; }
      for (const r of this.racers) {
        if (r.wreck || r.fall || r.z > 4 || r.finished || Math.abs(r.x - sp.x) > 11 || Math.abs(r.y - sp.y) > 11) continue;
        if (sp.kind === '$') {
          r.money += RALLY.money; sp.wait = RALLY.moneyBack;
          if (r.human) { Sound.play('coin'); this.pop(r, '+' + RALLY.money, '#58D854'); }
        } else {
          r.armor = Math.min(r.lo.armor, r.armor + 2);
          r.ch.fwd = Math.min(r.lo.fwd.charges + 1, r.ch.fwd + 1); r.ch.drop = Math.min(r.lo.drop.charges + 1, r.ch.drop + 1); r.ch.boost = Math.min(r.lo.boost + 1, r.ch.boost + 1);
          sp.wait = RALLY.repairBack;
          if (r.human) { Sound.play('pickup'); this.pop(r, 'REPAIRED', COL.white); }
        }
        break;
      }
    }
  }

  damage(att, o, n) {
    if (!this.hittable(o)) return;
    o.armor -= n; o.hitT = 14;
    if (o.armor > 0) { if (this.near(o)) Sound.play('armor'); if (o.human) Input.rumble(o.player, 0.4, 120); return; }
    // wrecked
    o.armor = 0; o.wreck = RALLY.respawn; o.wrecks++; o.vx = o.vy = 0; o.boostT = 0; o.spin = 0; o.air = 0; o.z = 0;
    this.addFx(o.x, o.y, BIG_EXPLOSION(), 6);
    if (this.near(o)) Sound.play('explode');
    if (o.human) Input.rumble(o.player, 0.9, 400);
    if (att && att !== o) {
      att.kills++; att.killTimes.push(this.clock);
      this.say(['WRECKED! ', 'SCRAP METAL! ', 'BOOM! '][rnd(3)] + att.name + ' GETS ' + o.name, att.human ? COL.gold : COL.white, 1);
    } else this.say(o.name + ' IS WRECKED!', COL.white, 0);
  }

  // two kills in 20 s, or the third of the race: on fire
  onFire() {
    for (const r of this.racers) {
      const n = r.killTimes.length;
      if (n !== r.fireSaid && (n >= 3 || (n >= 2 && r.killTimes[n - 1] - r.killTimes[n - 2] < 1200))) {
        r.fireSaid = n;
        this.say(r.name + ' IS ON FIRE!', '#F87800', 2);
      }
    }
  }

  // ------------------------------------------------------------ the end
  checkEnd() {
    const humansDone = this.humans.length && this.humans.every(h => h.finished);
    const timeUp = (this.endAt && !this.opts.waitAll && this.clock >= this.endAt) || this.clock > this.laps * 5 * 3600 || this.finishOrder.length === this.racers.length;
    if (!humansDone && !timeUp) return;
    // the rest by how far they got (their times guessed from their pace)
    const rest = this.racers.filter(r => !r.finished).sort((a, b) => b.prog - a.prog);
    // (the pace: the winner's, a little slower; or 1 px a frame)
    const total = this.laps * this.T.L, win = this.finishOrder[0], pace = win ? Math.max(0.5, total / Math.max(1, win.time) * 0.85) : 1;
    for (const r of rest) {
      r.finished = true; r.est = true;
      r.time = this.clock + 30 + Math.round(Math.max(0, total - r.prog) / pace);
      this.finishOrder.push(r); r.place = this.finishOrder.length;
    }
    this.results = this.finishOrder.map(r => ({ id: r.id, place: r.place, time: r.time, bestLap: r.best, kills: r.kills, wrecks: r.wrecks, money: r.money,
      name: r.name, human: r.human, player: r.human ? r.player : undefined, laps: Math.min(this.laps, Math.max(0, r.maxLap - 1)), est: !!r.est }));
    this.phase = 'results'; this.resT = 0; this.over = true;
    this.updatePlaces();
  }

  // two players: the one who falls off the screen comes back just behind the leader (after a short wait)
  catchUp() {
    if (this.humans.length < 2) return;
    const lead = this.focus();
    for (const h of this.humans) {
      if (h === lead || h.wreck || h.fall || h.air || h.finished) { h.off = 0; continue; }
      const out = h.x < this.camX - 8 || h.y < this.camY - 8 || h.x > this.camX + VIEW_W + 8 || h.y > this.camY + VIEW_H + 8;
      h.off = out ? h.off + 1 : 0;
      if (h.off < 45) continue;
      h.off = 0;
      const pr = Math.max(h.prog, lead.prog - 40), lap = Math.floor(pr / this.T.L) + 1;
      h.lap = lap; if (lap > h.maxLap) { h.maxLap = lap; h.lapStart = this.clock; }
      const s = pr - (lap - 1) * this.T.L;
      h.seg = this.pathAt(s).k;
      h.wreck = 60; h.x = -999; h.y = -999; h.vx = h.vy = 0; h.catchS = s;
      this.pop(lead, rallyName(h.def) + ' CATCHES UP', COL.white);
    }
  }

  // ------------------------------------------------------------ the rivals
  aiInput(r, cruise) {
    const A = r.ai, out = { dir: -1, fire: false, drop: false, boost: false };
    if (this.phase !== 'race' && this.phase !== 'results') return out;
    if (r.air > 0 || r.spin > 0) return out;
    const T = this.T, sk = cruise ? 2 : r.skill, sp = Math.hypot(r.vx, r.vy), gf = this.gripOf(r);
    // steering: the furthest point of the racing line ahead it can see
    const la = A.recover > 0 ? 18 : 26 + sp * (13 + sk * 2);
    const tg = this.aiTarget(r, la, sk >= 2 && !cruise && A.recover <= 0 && sp > 0.6);
    // allowing for the slide: where the sideways drift will carry it
    const u = T.U[r.seg], vu = r.vx * u[0] + r.vy * u[1], px = r.vx - vu * u[0], py = r.vy - vu * u[1];
    const drift = Math.min(22, (1 - gf) / gf) * 0.8;
    const ax = tg.x - (r.x + px * drift), ay = tg.y - (r.y + py * drift);
    let dir;
    if (Math.abs(ax) < 0.5 && Math.abs(ay) < 0.5) dir = A.dir;
    else if (A.dir === 1 || A.dir === 3) dir = Math.abs(ay) > Math.abs(ax) * 1.3 ? (ay > 0 ? 2 : 0) : (ax > 0 ? 1 : 3);
    else dir = Math.abs(ax) > Math.abs(ay) * 1.3 ? (ax > 0 ? 1 : 3) : (ay > 0 ? 2 : 0);
    // the weaker drivers react a moment late
    const late = cruise ? 0 : 4 - sk;
    if (late > 0 && dir !== A.dir && A.recover <= 0) {
      if (A.pend !== dir) { A.pend = dir; A.pendT = late; }
      if (--A.pendT > 0) dir = A.dir; else A.pend = -1;
    }
    // a wall right in front (a crate, a corner taken wide): round it, to the target's side if there's room
    if (this.boxSolid(r.x + DXY[dir][0] * 2, r.y + DXY[dir][1] * 2, RALLY.half)) {
      const side = dir === 1 || dir === 3 ? (ay > 0 ? 2 : 0) : (ax > 0 ? 1 : 3);
      dir = !this.boxSolid(r.x + DXY[side][0] * 3, r.y + DXY[side][1] * 3, RALLY.half) ? side : (side + 2) & 3;
      A.pend = -1;
    }
    A.dir = dir;
    // speed: brake for the corner ahead, by the grip there and the room past it
    const lim = A.recover > 0 ? 1.2 : this.aiLimit(r, sp, sk);
    if (A.brake > 0 || sp > lim + 0.3) {
      if (A.brake <= 0) A.brake = 3;
      A.brake--;
      dir = Math.abs(r.vx) > Math.abs(r.vy) ? (r.vx > 0 ? 3 : 1) : (r.vy > 0 ? 0 : 2);
      if (sp <= lim) A.brake = 0;
    } else if (sp > lim) dir = -1;
    out.dir = dir;
    if (A.recover > 0) A.recover--;
    if (!cruise && this.phase === 'race') this.aiWeapons(r, out, sp);
    return out;
  }

  // the furthest point ahead on the line in clear sight; if even near ones are blocked, a little to one side
  // (mines and oil only matter while there's a way round them: with none, straight on)
  aiTarget(r, la, avoid) {
    const T = this.T;
    for (const f of [1, 0.62, 0.38, 0.22]) {
      const p = this.pathAt(r.s + Math.max(14, la * f), r.seg);
      if (this.clearLine(r, p.x, p.y, avoid)) return p;
    }
    const p = this.pathAt(r.s + 22, r.seg), u = T.U[p.k];
    for (const o of [10, -10, 20, -20, 32, -32]) {
      const q = { x: p.x - u[1] * o, y: p.y + u[0] * o, k: p.k };
      if (Math.hypot(q.x - r.x, q.y - r.y) > 12 && this.clearLine(r, q.x, q.y, avoid)) return q;
    }
    return avoid ? this.aiTarget(r, la, false) : p;
  }

  // can the tank get there straight? (walls, crates, pits unless a ramp on the way jumps them; mines and oil for the
  // careful ones)
  clearLine(r, x1, y1, avoid) {
    const dx = x1 - r.x, dy = y1 - r.y, d = Math.hypot(dx, dy);
    if (d < 1) return true;
    const ux = dx / d, uy = dy / d, n = Math.ceil(d / 6);
    let jump = r.air > 0;
    for (let i = 1; i <= n; i++) {
      const x = r.x + dx * i / n, y = r.y + dy * i / n, close = d * i / n < 9;
      for (const o of close ? [0] : [0, 5, -5]) {
        const k = this.kindAt(x - uy * o, y + ux * o);
        if (k === RK_WALL || k === RK_CRATE) return false;
        if (k >= RK_JUMP && DXY[k - RK_JUMP][0] * ux + DXY[k - RK_JUMP][1] * uy > 0.5) jump = true;
        if (k === RK_PIT && !jump) return false;
      }
      if (avoid && !close && d * i / n > 14) {
        for (const m of this.mines) if (m.owner !== r && Math.abs(m.x - x) < 10 && Math.abs(m.y - y) < 10) return false;
        for (const s of this.oils) if (Math.abs(s.x - x) < 13 && Math.abs(s.y - y) < 11) return false;
      }
    }
    return true;
  }

  // the speed it may carry now: the first corner within braking reach, how sharp it turns from where the tank is
  // going, how much room there is to slide wide past it and the grip there
  aiLimit(r, sp, sk) {
    if (sp < 0.4) return 9;
    const T = this.T, vx = r.vx / sp, vy = r.vy / sp, sf = this.surfOf(r);
    const dec = (r.lo.accel * 2.2 * Math.min(1, sf.grip) + 0.02) * 0.75;
    const reach = sp * sp / (2 * dec) + 72;
    let lim = 9, k = r.seg, d = T.len[k] - (r.s - T.S[k]);
    for (let j = 0; j < 10 && d < reach; j++) {
      k = (k + 1) % T.n;
      const c = vx * T.U[k][0] + vy * T.U[k][1];
      if (c < 0.85) {
        const a = Math.acos(Math.max(-1, Math.min(1, c))), gk = this.gripOf(r, rallyKindAt(T, this.kind, T.P[k][0], T.P[k][1]));
        let vc = Math.max(0.45, (T.room[k] - 8) * gk / (1 - gk)) * (0.78 + 0.06 * sk);
        vc /= Math.max(0.5, Math.sin(Math.min(a, Math.PI / 2)));
        if (a > 2) vc *= 0.85;
        lim = Math.min(lim, Math.sqrt(vc * vc + 2 * dec * Math.max(0, d - 6)));
      }
      d += T.len[k];
    }
    return lim;
  }

  // a straight ahead? (for a boost)
  straightAhead(r, dist) {
    const T = this.T, u = T.U[r.seg];
    let k = r.seg, d = T.len[k] - (r.s - T.S[k]);
    while (d < dist) { k = (k + 1) % T.n; if (u[0] * T.U[k][0] + u[1] * T.U[k][1] < 0.92) return false; d += T.len[k]; }
    return true;
  }

  aiWeapons(r, out, sp) {
    const A = r.ai, sk = r.skill;
    const mean = r.style === 'aggressive' ? 1.7 : r.style === 'clean' ? 0.55 : 1, dirty = r.style === 'dirty' ? 1.9 : r.style === 'clean' ? 0.5 : 1;
    const [fx, fy] = DXY[r.look];
    if (A.fireCd > 0) A.fireCd--;
    if (r.ch.fwd > 0 && r.cool <= 0 && A.fireCd <= 0) {
      const kind = r.lo.fwd.kind;
      for (const o of this.racers) {
        if (o === r || !this.hittable(o) || o.hidden > 0) continue;
        const dx = o.x - r.x, dy = o.y - r.y, al = dx * fx + dy * fy, lat = Math.abs(dx * fy - dy * fx);
        const ok = kind === 'missile' ? al > 20 && al < 200 && lat < al * 0.8 : al > 10 && al < (kind === 'laser' ? 160 : 120) && lat < 6 + (r.style === 'aggressive' ? 2 : 0);
        if (ok && this.clearLine(r, o.x, o.y, false) && Math.random() < 0.02 * (1 + sk) * mean) { out.fire = true; A.fireCd = 20; break; }
      }
    }
    if (r.ch.drop > 0 && r.dcool <= 0) {
      for (const o of this.racers) {
        if (o === r || !this.hittable(o)) continue;
        const dx = o.x - r.x, dy = o.y - r.y, al = dx * fx + dy * fy, lat = Math.abs(dx * fy - dy * fx);
        if (al < -12 && al > -80 && lat < 14 && Math.random() < 0.015 * dirty * (1 + sk * 0.5)) { out.drop = true; break; }
      }
    }
    if (r.ch.boost > 0 && r.boostT <= 0 && sp > 0.75 * r.lo.topSpeed * r.topMul && Math.random() < 0.025 * (1 + sk * 0.4) && this.straightAhead(r, 150)) out.boost = true;
  }

  // a rival that stops getting anywhere backs off and finds the line again; still stuck, it's put back on it
  aiStuck(r) {
    const A = r.ai;
    if (this.phase !== 'race' || r.wreck || r.fall || r.air) { A.chkT = 0; A.chkProg = r.prog; return; }
    if (++A.chkT < 120) return;
    A.chkT = 0;
    if (r.prog - A.chkProg < 20) { A.stuck++; A.recover = 70; } else A.stuck = 0;
    A.chkProg = r.prog;
    if (A.stuck >= 3) {
      A.stuck = 0; this.stuckResets++; r.stuckResets = (r.stuckResets || 0) + 1;
      this.stuckAt.push([r.id, Math.floor(r.x / 16), Math.floor(r.y / 16), this.clock]);   // (for the tests)
      this.respawn(r, r.s + 16);
    }
  }

  // ------------------------------------------------------------ words
  say(text, color, prio) {
    this.calls.push({ text, color, prio, at: this.frame });
    if (this.calls.length > 4) this.calls.sort((a, b) => b.prio - a.prio || a.at - b.at).splice(4);
  }
  updateCalls() {
    if (this.call && --this.call.t <= 0) this.call = null;
    if (!this.call || (this.calls.length && this.call.t < 70 && this.calls.some(c => c.prio > this.call.prio))) {
      this.calls = this.calls.filter(c => this.frame - c.at < 240);
      if (this.calls.length) {
        this.calls.sort((a, b) => b.prio - a.prio || a.at - b.at);
        const c = this.calls.shift();
        this.call = { text: c.text, color: c.color, prio: c.prio, t: 100 };
      }
    }
  }
  pop(r, text, color) { this.popups.push({ r, text, color, t: 0 }); }

  // ------------------------------------------------------------ bits
  addFx(x, y, frames, per) { this.fx.push({ x, y, frames, per, tick: 0 }); }
  boom(x, y, big) { this.addFx(x, y, big ? BIG_EXPLOSION() : Sprites.smallExp, big ? 5 : 3); if (this.near({ x, y })) Sound.play(big ? 'explode' : 'brick'); }
  part(x, y, vx, vy, c, t) { if (this.parts.length < 160) this.parts.push({ x, y, vx, vy, c, t }); }
  near(o) { return o.x > this.camX - 24 && o.y > this.camY - 24 && o.x < this.camX + VIEW_W + 24 && o.y < this.camY + VIEW_H + 24; }

  // the one the camera follows: the human (the leading one of two), or the leader
  focus() {
    const hs = this.humans.filter(h => h.x > -900);
    if (hs.length === 1) return hs[0];
    if (hs.length > 1) return hs.slice().sort((a, b) => a.pos - b.pos)[0];
    return (this.order && this.order[0]) || this.racers[0];
  }
  camTX(f) { return Math.max(0, Math.min(FW - VIEW_W, f.x + Math.max(-56, Math.min(56, f.vx * 24)) - VIEW_W / 2)); }
  camTY(f) { return Math.max(0, Math.min(FH - VIEW_H, f.y + Math.max(-48, Math.min(48, f.vy * 24)) - VIEW_H / 2)); }
  updateCamera() {
    const f = this.focus();
    if (!f || f.x < -900) return;
    let tx = this.camTX(f), ty = this.camTY(f);
    // two players close together: both in the picture
    const o = this.humans.find(h => h !== f && !h.wreck && h.x > -900);
    if (o && Math.abs(o.x - f.x) < VIEW_W - 64 && Math.abs(o.y - f.y) < VIEW_H - 64) {
      tx = Math.max(0, Math.min(FW - VIEW_W, (f.x * 0.65 + o.x * 0.35) - VIEW_W / 2));
      ty = Math.max(0, Math.min(FH - VIEW_H, (f.y * 0.65 + o.y * 0.35) - VIEW_H / 2));
    }
    const far = Math.hypot(tx - this.camX, ty - this.camY) > VIEW_W;
    this.camX += (tx - this.camX) * (far ? 0.4 : 0.12);
    this.camY += (ty - this.camY) * (far ? 0.4 : 0.12);
  }

  // ------------------------------------------------------------ drawing
  render(ctx) {
    ctx.fillStyle = COL.bg;
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
    const cx = Math.round(this.camX), cy = Math.round(this.camY);
    ctx.save();
    ctx.translate(FX, FY);
    ctx.beginPath(); ctx.rect(0, 0, VIEW_W, VIEW_H); ctx.clip();
    ctx.fillStyle = COL.black; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.drawImage(this.ground, cx, cy, VIEW_W, VIEW_H, 0, 0, VIEW_W, VIEW_H);
    ctx.save();
    ctx.translate(-cx, -cy);
    this.drawWorld(ctx, cx, cy);
    ctx.restore();
    this.drawHud(ctx);
    ctx.restore();
    this.drawBorder(ctx);
  }

  drawWorld(ctx, cx, cy) {
    const f = this.frame, inView = (x, y, m = 24) => x > cx - m && y > cy - m && x < cx + VIEW_W + m && y < cy + VIEW_H + m;
    // pickups
    for (const sp of this.spots) {
      if (sp.wait > 0 || !inView(sp.x, sp.y)) continue;
      const img = rallyIcon(sp.kind === '$' ? 'coin' : 'repair'), bob = (f >> 4) & 1;
      ctx.drawImage(img, sp.x - 6, sp.y - 6 - bob);
    }
    // oil, mines
    for (const s of this.oils) {
      if (!inView(s.x, s.y)) continue;
      const a = Math.min(1, s.t / 10, (RALLY.oilLife - s.t) / 60);
      ctx.globalAlpha = a;
      ctx.fillStyle = '#101010'; ctx.fillRect(s.x - 10, s.y - 5, 20, 10); ctx.fillRect(s.x - 7, s.y - 8, 14, 16);
      ctx.fillStyle = '#383848'; ctx.fillRect(s.x - 5, s.y - 4, 6, 2); ctx.fillRect(s.x + 2, s.y + 2, 4, 1);
      ctx.globalAlpha = 1;
    }
    for (const m of this.mines) if (inView(m.x, m.y)) ctx.drawImage(Sprites.mine[m.t < RALLY.mineArm || (f >> 3) & 1 ? 0 : 1], Math.round(m.x) - 4, Math.round(m.y) - 4);
    // shadows of those in the air
    for (const r of this.racers) {
      if (r.z <= 0.5 || r.wreck) continue;
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      const w = Math.max(6, 14 - r.z / 3);
      ctx.fillRect(Math.round(r.x - w / 2), Math.round(r.y + 2), Math.round(w), 5);
    }
    // the tanks on the ground, then shells, then the ones in the air over everything
    for (const r of this.racers) if (r.z <= 0.5) this.drawRacer(ctx, r);
    for (const m of this.shots) {
      if (!inView(m.x, m.y)) continue;
      if (m.kind === 'shell') ctx.drawImage(Sprites.bullet[m.dir], Math.round(m.x) - 2, Math.round(m.y) - 2);
      else { ctx.fillStyle = (f >> 1) & 1 ? '#58D854' : '#F8F8F8'; ctx.fillRect(Math.round(m.x) - 1, Math.round(m.y) - 1, 3, 3); }
    }
    for (const b of this.beams) {
      const w = Math.max(1, Math.round(b.t / 4));
      ctx.fillStyle = (b.t >> 1) & 1 ? '#FFFFFF' : '#F83800';
      ctx.fillRect(Math.round(Math.min(b.x0, b.x1) - (b.x0 === b.x1 ? w / 2 : 0)), Math.round(Math.min(b.y0, b.y1) - (b.y0 === b.y1 ? w / 2 : 0)), Math.max(w, Math.abs(b.x1 - b.x0)), Math.max(w, Math.abs(b.y1 - b.y0)));
    }
    for (const p of this.parts) { ctx.fillStyle = p.c; ctx.fillRect(Math.round(p.x), Math.round(p.y), p.t > 6 ? 2 : 1, p.t > 6 ? 2 : 1); }
    for (const r of this.racers) if (r.z > 0.5) this.drawRacer(ctx, r);
    for (const fx of this.fx) {
      const fr = fx.frames[Math.min(fx.frames.length - 1, Math.floor(fx.tick / fx.per))];
      ctx.drawImage(fr, Math.round(fx.x - fr.width / 2), Math.round(fx.y - fr.height / 2));
    }
    // smoke
    for (const s of this.smokes) {
      const k = Math.min(1, s.t / 20, (RALLY.smokeLife - s.t) / 60), rr = 26 * k;
      if (rr < 2 || !inView(s.x, s.y, 40)) continue;
      for (let j = 0; j < 7; j++) {
        const a = j * 0.9 + s.t * 0.012, d = j ? rr * 0.55 : 0, q = Math.max(2, Math.round(rr * (j ? 0.5 : 0.65)));
        const x = Math.round(s.x + Math.cos(a) * d), y = Math.round(s.y + Math.sin(a) * d * 0.8);
        ctx.fillStyle = j & 1 ? 'rgba(196,196,188,0.88)' : 'rgba(160,160,152,0.88)';
        for (let dy = -q; dy <= q; dy += 2) { const w = Math.floor(Math.sqrt(q * q - dy * dy)); ctx.fillRect(x - w, y + dy, 2 * w + 1, 2); }
      }
    }
    // the players' marks, little words over the tanks
    for (const r of this.racers) {
      if (!r.human || r.wreck || r.fall) continue;
      if (this.humans.length > 1 || this.phase !== 'race') Font.draw(ctx, ROMAN[r.player], Math.round(r.x) - ROMAN[r.player].length * 4 + 1, Math.round(r.y - 18 - r.z), r.color);
    }
    for (const p of this.popups) {
      if (p.r.x < -900) continue;
      Font.drawCenter(ctx, p.text, Math.round(p.r.x), Math.round(p.r.y - 22 - p.t / 5), p.color);
    }
  }

  drawRacer(ctx, r) {
    if (r.wreck > 0) return;
    if (r.inv > 0 && (this.frame >> 2) & 1) return;
    const img = Sprites.tank(r.lo.spec, r.anim, r.look, r.lo.pal);
    if (r.fall > 0) {
      // shrinking into the pit
      const s = Math.max(0.15, r.fall / RALLY.fall);
      ctx.drawImage(img, r.x - 8 * s, r.y - 8 * s, 16 * s, 16 * s);
      return;
    }
    if (r.hidden > 0 && !r.human) ctx.globalAlpha = 0.45;
    if (r.z > 0.5) {
      const s = 1 + r.z / 22;
      ctx.drawImage(img, Math.round(r.x - 8 * s), Math.round(r.y - 8 * s - r.z), Math.round(16 * s), Math.round(16 * s));
    } else {
      if (r.hitT > 0 && (r.hitT >> 1) & 1) ctx.drawImage(Sprites.outline(img, COL.white), Math.round(r.x) - 9, Math.round(r.y) - 9);
      ctx.drawImage(img, Math.round(r.x) - 8, Math.round(r.y) - 8);
    }
    ctx.globalAlpha = 1;
  }

  // the HUD over the field: places and laps, charges, armour, money, the minimap, the announcer, the countdown
  drawHud(ctx) {
    const f = this.frame;
    this.humans.slice(0, 2).forEach((h, k) => {
      // place and lap
      const x = 3 + k * 70, y = 3, ord = RALLY_ORD[h.pos - 1] || h.pos + 'TH';
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(x, y, 64, 26);
      Font.big(ctx, String(h.pos), x + 2, y + 2, 2, RALLY_POS_COL[h.pos - 1] || COL.lgrey);
      Font.draw(ctx, ord.slice(1), x + 14, y + 2, RALLY_POS_COL[h.pos - 1] || COL.lgrey);
      if (this.humans.length > 1) Font.draw(ctx, ROMAN[h.player], x + 40, y + 2, h.color);
      Font.draw(ctx, h.finished && !h.est ? 'DONE' : 'L' + Math.max(1, Math.min(this.laps, h.lap)) + '/' + this.laps, x + 14, y + 11, COL.white);
      if (h.finished && !h.est) Font.draw(ctx, rallyClock(h.time).slice(0, 7), x + 2, y + 19, COL.lgrey);
      else Font.draw(ctx, rallyClock(this.clock - h.lapStart).slice(0, 7), x + 2, y + 19, COL.lgrey);
      // the charges, armour and money
      const bx = k ? VIEW_W - 92 : 3, by = VIEW_H - 30;
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(bx, by, 89, 27);
      const slot = (icon, n, sx, lit) => {
        ctx.globalAlpha = n > 0 ? 1 : 0.35;
        ctx.drawImage(rallyIcon(icon), bx + sx, by + 3);
        ctx.globalAlpha = 1;
        Font.draw(ctx, String(Math.min(9, n)), bx + sx + 9, by + 3, lit ? COL.gold : n > 0 ? COL.white : '#6C6C6C');
      };
      slot(h.lo.fwd.kind, h.ch.fwd, 2, h.cool > 10);
      slot(h.lo.drop.kind, h.ch.drop, 31, h.dcool > 12);
      slot('boost', h.ch.boost, 60, h.boostT > 0);
      for (let j = 0; j < h.lo.armor; j++) {
        ctx.fillStyle = j < h.armor ? (h.armor <= 1 && (f >> 3) & 1 ? '#F83800' : '#58D854') : '#3C3C3C';
        ctx.fillRect(bx + 3 + j * 5, by + 15, 4, 8);
      }
      csMoneyText(ctx, h.money, bx + 87 - (String(h.money).length * 5 + 5), by + 16, '#58D854');
      if (h.wrong > 40 && !h.finished && (f >> 4) & 1) Font.drawCenter(ctx, 'WRONG WAY!', VIEW_W / 2, VIEW_H / 2 + 24 + k * 10, '#F83800');
      if (h.wreck > 0 && h.x > -900 && !h.finished) Font.drawCenter(ctx, 'WRECKED', VIEW_W / 2, VIEW_H / 2 + 36 + k * 10, COL.white);
    });
    this.drawMinimap(ctx);
    // the announcer
    const c = this.call;
    if (c && (c.t > 8 || (c.t >> 1) & 1)) {
      const big = c.text.length * 16 - 4 <= VIEW_W - 8, y = 44;
      ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillRect(0, y - 3, VIEW_W, big ? 20 : 13);
      if (big) Font.big(ctx, c.text, (VIEW_W - Font.bigWidth(c.text, 2)) >> 1, y, 2, c.color);
      else Font.drawCenter(ctx, c.text.slice(0, Math.floor(VIEW_W / 8)), VIEW_W / 2, y, c.color);
    }
    // the countdown, the track's name before it
    if (this.phase === 'intro' || this.phase === 'count') {
      const name = this.T.name;
      ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillRect(0, 34, VIEW_W, 24);
      Font.drawCenter(ctx, name.slice(0, Math.floor(VIEW_W / 8)), VIEW_W / 2, 37, COL.white);
      Font.drawCenter(ctx, this.laps + ' LAPS', VIEW_W / 2, 47, COL.lgrey);
      if (this.phase === 'count') {
        const n = 3 - Math.floor(this.t / RALLY.count), s = String(n);
        Font.big(ctx, s, (VIEW_W - Font.bigWidth(s, 4)) >> 1, VIEW_H - 64, 4, ['#F83800', '#F87800', COL.gold][3 - n]);
      }
    } else if (this.phase === 'race' && this.clock < 45) {
      Font.big(ctx, 'GO!', (VIEW_W - Font.bigWidth('GO!', 4)) >> 1, VIEW_H - 64, 4, '#58D854');
    }
    if (this.phase === 'results') this.drawResults(ctx);
  }

  drawMinimap(ctx) {
    const M = rallyMiniOf(this.T), mw = M.c.width, mh = M.c.height, x0 = VIEW_W - mw - 3, y0 = 3, s = 1 / (16 * M.step);
    const under = this.humans.some(h => h.x - this.camX > x0 - 12 && h.y - this.camY < y0 + mh + 12);
    ctx.globalAlpha = under ? 0.35 : 0.9;
    ctx.fillStyle = '#000000'; ctx.fillRect(x0 - 1, y0 - 1, mw + 2, mh + 2);
    ctx.drawImage(M.c, x0, y0);
    ctx.globalAlpha = 1;
    for (const r of this.order.slice().reverse()) {
      if (r.wreck && r.x < -900) continue;
      const x = Math.round(x0 + r.x * s) - 1, y = Math.round(y0 + r.y * s) - 1;
      if (r.human && (this.frame >> 3) & 1) { ctx.fillStyle = COL.white; ctx.fillRect(x - 1, y - 1, 4, 4); }
      ctx.fillStyle = r.wreck ? '#3C3C3C' : r.color; ctx.fillRect(x, y, 2, 2);
    }
  }

  drawResults(ctx) {
    const rs = this.finishOrder, w = Math.min(VIEW_W - 8, 200), h = 28 + rs.length * 10 + 12, x = (VIEW_W - w) >> 1, y = Math.max(32, (VIEW_H - h) >> 1);
    ctx.fillStyle = 'rgba(0,0,0,0.85)'; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = COL.gold; ctx.fillRect(x, y, w, 1); ctx.fillRect(x, y + h - 1, w, 1);
    Font.drawCenter(ctx, 'RACE OVER', x + w / 2, y + 4, COL.gold);
    rs.forEach((r, k) => {
      const ry = y + 18 + k * 10;
      Font.draw(ctx, RALLY_ORD[k], x + 4, ry, RALLY_POS_COL[k] || COL.lgrey);
      Font.draw(ctx, r.name.slice(0, Math.max(4, Math.floor((w - 100) / 8))), x + 36, ry, r.human ? COL.gold : COL.white);
      Font.drawRight(ctx, r.est ? '--' : rallyClock(r.time), x + w - 4, ry, r.est ? '#6C6C6C' : COL.lgrey);
    });
    const best = this.racers.filter(r => r.best).sort((a, b) => a.best - b.best)[0];
    if (best) Font.drawCenter(ctx, ('BEST LAP ' + best.name + ' ' + rallyClock(best.best)).slice(0, Math.floor(w / 8)), x + w / 2, y + h - 11, '#58D854');
  }

  // round the field: the clock above, the keys below, the standings at the side
  drawBorder(ctx) {
    const f = this.focus(), H = HUD_X;
    Font.drawCenter(ctx, rallyClock(this.clock), FX + VIEW_W / 2, 0, COL.black);
    if (f && f.best && VIEW_W >= 240) Font.drawRight(ctx, 'BEST ' + rallyClock(f.best).slice(0, 6), FX + VIEW_W, 0, '#3C3C3C');
    if (VIEW_W >= 200) Font.draw(ctx, 'LAP ' + Math.max(1, Math.min(this.laps, f ? f.lap : 1)) + '/' + this.laps, FX, 0, '#3C3C3C');
    const keys = VIEW_W >= 232 ? 'FIRE:GUN  B:DROP  FIRE+B:BOOST' : VIEW_W >= 224 ? 'FIRE:GUN B:DROP FIRE+B:BOOST' : 'FIRE+B: BOOST';
    Font.drawCenter(ctx, keys, FX + VIEW_W / 2, FY + VIEW_H, '#3C3C3C');
    // the standings
    this.order.slice(0, 6).forEach((r, k) => {
      const y = 12 + k * 18;
      Font.draw(ctx, String(k + 1), H, y, r.human ? COL.black : '#3C3C3C');
      ctx.drawImage(Sprites.playerIcon(r.lo.pal), H + 9, y);
      ctx.drawImage(Sprites.mini('L' + Math.max(0, Math.min(this.laps, r.lap))), H + 2, y + 9);
    });
  }
}

// ================================================================= into the game
Object.assign(Game, {
  // the race: { track (a key, or a track itself), laps, racers } as the contract has it, and optionally trackData (the
  // track itself), music (or song: a SONGS key for the race, e.g. 'rallyBoss'), waitAll (no end until every racer is
  // in: tests), a racer's input(race, racer) function (drives it instead of the keys or the AI: tests, demos).
  // Sets up the screen and plays it; Game.rallyRaceOver(results) when it's over.
  rallyStartRace(opts) {
    opts = Object.assign({}, opts || {});
    const def = rallyTrackDef(opts.trackData && Array.isArray(opts.trackData.rows) ? opts.trackData : opts.track), T = rallyPrep(def);
    if (!opts.racers || !opts.racers.length) opts.racers = this.rallyDefaultRacers(1);
    this.mode = 'rally';
    // the humans' game slots (the keys each one uses)
    const np = Math.min(2, Math.max(1, ...opts.racers.filter(r => r && r.human).map(r => (r.player | 0) + 1)));
    if (!this.players || this.players.length !== np || this.players.some(p => p.bot)) { this.players = []; for (let i = 0; i < np; i++) this.players.push(newPlayer(i)); }
    if (Net.role !== 'host') Input.remote = {};
    Input.numPlayers = np; this.twoP = np > 1;
    const [vc, vr] = this.desiredField();
    setFieldSize(T.W, T.H, Math.min(vc, T.W), Math.min(vr, T.H));
    this.rallyOpts = opts;
    this.stage = new RallyRace(opts, T);
    this.paused = false; this.pauseCtl = false;
    this.openH = SCREEN_H / 2;
    this.setState('play');
    return this.stage;
  },

  // a human or two at the back of the grid, rivals ahead of them (the quick race, and a race with no racers given)
  rallyDefaultRacers(n) {
    const sk = Config.get('skill') === AUTO_SKILL ? 2 : Math.max(0, Math.min(4, Config.get('skill') | 0)), out = [];
    for (let i = 0; i < 4 - n; i++) out.push({ id: 'ai' + i, name: RALLY_AI_NAMES[i], human: false, skill: sk, style: RALLY_STYLES[i % 3] });
    for (let i = 0; i < n; i++) out.push({ id: 'p' + i, name: ROMAN[i] + '-PLAYER', human: true, player: i });
    return out;
  },

  // without the career: straight into a race on the first track
  rallyQuickRace(n) {
    n = Math.max(1, Math.min(2, n | 0 || 1));
    const def = rallyTrackDef();
    this.rallyStartRace({ track: def.key, laps: def.laps || 4, racers: this.rallyDefaultRacers(n) });
  },

  // the race is over (the career's when it's loaded): a results screen, then the title
  rallyRaceOver(results) {
    this.vsRes = { mode: 'rally', results, track: this.stage && this.stage.T ? this.stage.T.name : '' };
    Sound.setEngine(0);
    this.setState('vsResult');
  },

  // TANK RALLY picked on the title: the career's screens, or a quick race without them
  rallyEnter() {
    const n = Math.max(1, Math.min(2, (this.players || []).filter(p => !p.bot).length || 1));
    if (typeof this.rallyNewCareer === 'function') this.rallyNewCareer(n);
    else this.rallyQuickRace(n);
  },

  rallyRenderResult(ctx) {
    const r = this.vsRes, t = this.t;
    ctx.fillStyle = COL.black; ctx.fillRect(0, 0, SW, SH);
    Font.big(ctx, 'TANK RALLY', (SW - Font.bigWidth('TANK RALLY', 2)) >> 1, 10, 2, Sprites.bricks(ctx));
    Font.drawCenter(ctx, r.track, SW / 2, 32, COL.lgrey);
    Font.draw(ctx, 'TIME', 108, 50, COL.lgrey); Font.draw(ctx, 'BEST', 164, 50, COL.lgrey); Font.drawRight(ctx, 'K', 244, 50, COL.lgrey);
    (r.results || []).forEach((q, k) => {
      const y = 64 + k * 22;
      Font.draw(ctx, RALLY_ORD[k], 4, y, RALLY_POS_COL[k] || COL.lgrey);
      Font.draw(ctx, String(q.name || q.id).slice(0, 8), 36, y, q.human ? COL.gold : COL.white);
      Font.draw(ctx, q.est ? '--' : rallyClock(q.time), 108, y, COL.white);
      Font.draw(ctx, q.bestLap ? rallyClock(q.bestLap) : '--', 164, y, COL.white);
      Font.drawRight(ctx, String(q.kills), 244, y, COL.white);
      if (q.money) csMoneyText(ctx, q.money, 36, y + 10, '#58D854');
    });
    const me = (r.results || []).find(q => q.human);
    if (me && ((t >> 4) & 1 || t > 60)) Font.drawCenter(ctx, me.place === 1 ? 'YOU WIN THE RACE!' : 'YOU FINISHED ' + RALLY_ORD[me.place - 1], SW / 2, 176, me.place === 1 ? COL.gold : COL.white);
    if (t > 60) Font.drawCenter(ctx, 'PRESS ENTER', SW / 2, 200, COL.lgrey);
  },
});

// ================================================================= hooks into the game
(() => {
  const G = Game;
  // 1-2 players only
  const startGame = G.startGame;
  G.startGame = function (n) {
    if (Config.get('gameMode') === 'rally' && n > 2) { this.toast('TANK RALLY: 1-2 PLAYERS'); Sound.play('steel'); return; }
    return startGame.apply(this, arguments);
  };
  // the curtain (after the mode's title screen) hands over to the career, or a quick race
  const newGame = G.newGame;
  G.newGame = function () {
    newGame.apply(this, arguments);
    if (this.mode === 'rally' && this.curtain) this.curtain.rally = true;
  };
  const updateCurtain = G.updateCurtain;
  G.updateCurtain = function () {
    const c = this.curtain;
    if (c && c.rally && c.phase === 'show') { c.rally = false; this.rallyEnter(); return; }
    updateCurtain.call(this);
  };
  const renderCurtain = G.renderCurtain;
  G.renderCurtain = function (ctx) {
    const c = this.curtain;
    if (c && c.rally && c.phase === 'show') { ctx.fillStyle = COL.bg; ctx.fillRect(0, 0, SCREEN_W, SCREEN_H); return; }
    renderCurtain.call(this, ctx);
  };
  // the race over: hand the results over once the frame is done
  const updatePlay = G.updatePlay;
  G.updatePlay = function () {
    updatePlay.apply(this, arguments);
    const st = this.stage;
    if (this.state === 'play' && st && st.rally && st.done && !st.reported && !this.paused) {
      st.reported = true;
      Sound.setEngine(0);
      this.rallyRaceOver(st.results);
    }
  };
  // RESTART ROUND: the same race from the grid
  const restartRound = G.restartRound;
  G.restartRound = function () {
    if (this.mode === 'rally' && this.stage && this.stage.rally) { this.paused = false; this.rallyStartRace(this.stage.opts); return; }
    restartRound.apply(this, arguments);
  };
  // the stub's results screen (the career has its own)
  const updateVsResult = G.updateVsResult;
  G.updateVsResult = function () {
    if (!this.vsRes || this.vsRes.mode !== 'rally') return updateVsResult.call(this);
    if (this.t > 30 && (Input.menu().ok || this.t > 1800)) { this.stage = null; this.toTitle(); this.titleY = 0; }
  };
  const renderVsResult = G.renderVsResult;
  G.renderVsResult = function (ctx) { if (this.vsRes && this.vsRes.mode === 'rally') this.rallyRenderResult(ctx); else renderVsResult.call(this, ctx); };
  // the music: the racing tune from GO on (the season final's own when the race names one), silence before
  const musicFrame = G.musicFrame;
  G.musicFrame = function () {
    const st = this.stage;
    if (this.state !== 'play' || !st || !st.rally) return musicFrame.apply(this, arguments);
    const pick = st.opts.music || st.opts.song, has = k => typeof SONGS !== 'undefined' && !!SONGS[k];
    const want = pick && has(pick) ? pick : has('rally') ? 'rally' : 'race';
    const song = st.phase === 'race' || st.phase === 'results' ? want : null;
    const tuning = this.paused && ['MUSIC', 'MUSIC VOL'].includes(pauseMenu()[this.pauseIdx]);
    Music.want(song, Music.skillLevel(), this.paused && !tuning);
  };
})();
