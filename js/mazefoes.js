'use strict';
// =====================================================================
//  The maze's own enemies (MAZE mode only: they never join a line-up anywhere else)
//    MINOTAUR  a huge, slow, armoured beast that hunts the nearest player through the maze and never stops,
//              flattening brick walls on its way. You hear it before you see it (footfalls, snorts, louder as it
//              comes), and while it's close but out of sight the screen's edge glows red: IT'S COMING...
//              From maze 3, in some mazes; killing it opens the vault. In the lair (every 5th maze) it's the boss:
//              asleep in the arena until you come in, tougher, it charges down straight lines (reeling when it hits
//              a wall: double damage then) and stomps the ground round it
//    CRAWLER   hides inside brick walls (a glint now and then, red eyes when you're near); bursts out as you go
//              by, fights for a while and slips back into another wall. Shoot its wall and out it comes
//    SENTRY    a twin-barrelled turret in a corner of a junction: it swings to each open way in turn, takes aim
//              (a dotted line down both lanes, a blinking muzzle) and fires down the whole corridor. Time your dash
//    LOCKSMITH fast; when it touches you it steals one of the team's keys and runs; destroy it and the key drops.
//              With no key to take it's just a fast hunter
//    MIRROR    waits in an open room and copies the nearest player there, left for right, a moment late; it fires
//              when you fire (its shells meet yours head on). A hit makes it reel
//  The maze world (keys, gates, vaults, the lair: maze2.js) is optional here: every call to it is guarded.
// =====================================================================

const MF_T = {};   // kind -> enemy type
ENEMY.forEach((e, i) => { if (e.maze) MF_T[e.kind] = i; });
const isMf = t => !t.isPlayer && !!ENEMY[t.type] && !!ENEMY[t.type].maze;
const mfKind = t => (isMf(t) ? ENEMY[t.type].kind : null);
const MF_SKILL = [0.6, 0.8, 1, 1.2, 1.4];           // how many, per skill
const MF_NEAR = 6;                                  // cells: IT'S COMING...
const MF_CHARGE = 3, MF_CHARGE_MAX = 110;           // the lair boss's charge: px a frame, frames at most
const MF_QUAKE_R = 60;                              // its stomp reaches this far (px, centre to centre)
const MF_WAKE = 44;                                 // a crawler bursts out when you pass this close
const MF_SENTRY_WAKE = 360;                         // a sentry works while someone is this near
const MF_LAG = 10;                                  // frames a mirror is behind you
const MF_KEYS = { red: '#F83800', blue: '#3CBCFC', green: '#58D854', gold: '#F8B800', yellow: '#F8D878', silver: '#BCBCBC', purple: '#B048F8', white: '#F8F8F8' };
const mfKeyCol = c => (typeof c === 'string' && c[0] === '#' ? c : MF_KEYS[c] || '#F8B800');

// ------------------------------------------------------------------ looks
Object.assign(PALS, {
  minotaur: [null, '#F0E0C0', '#A8582C', '#1C0C08', '#F83800'],          // its small picture (cards, settings, tally)
  crawler: [null, '#F8A858', '#B83C14', '#200804', '#F8F838'],
  sentry: [null, '#D8DCE4', '#6C7480', '#141820', '#F8B800', '#F83800'],
  locksmith: [null, '#F8D878', '#5C5474', '#100C14'],
  mirror: [null, '#FFFFFF', '#A8E8F8', '#3C7C9C'],
});
// the big minotaur (24px): outline, iron, bronze, highlight, horn, horn shade, eyes, tread, tread light
const MF_MINO_PAL = {
  mino: [null, '#140A06', '#5C2C14', '#A0542C', '#E0965C', '#F4E8CC', '#B8A07C', '#F83800', '#34343C', '#7C7C88'],
  boss: [null, '#0C0408', '#3C1020', '#7C2034', '#C85068', '#F8E8A0', '#D8A830', '#F8F838', '#2C2830', '#88808C'],
  sleep: [null, '#140A06', '#5C2C14', '#A0542C', '#E0965C', '#F4E8CC', '#B8A07C', '#3C1408', '#34343C', '#7C7C88'],
  hit: [null, '#F8F8F8', '#F8F8F8', '#F8F8F8', '#F8F8F8', '#F8F8F8', '#F8F8F8', '#F8F8F8', '#F8F8F8', '#F8F8F8'],
};

// a picture built pixel by pixel: set(x, y, v) on a w x h grid, as rows of digits
function mfPaint(w, h, draw) {
  const g = Array.from({ length: h }, () => new Array(w).fill(0));
  const set = (x, y, v) => { if (x >= 0 && y >= 0 && x < w && y < h) g[y][x] = v; };
  draw(set, g);
  return g.map(r => r.map(v => (v ? String(v) : '.')).join(''));
}

// MINOTAUR, facing up: a bull's skull for a nose, horns sweeping out and forward, a riveted iron body, wide treads
function mfMinoRows(f) {
  return mfPaint(24, 24, (set, g) => {
    const both = (x, y, v) => { set(x, y, v); set(23 - x, y, v); };
    // treads
    for (let y = 6; y <= 23; y++) for (let x = 0; x <= 4; x++) {
      const edge = x === 0 || x === 4 || y === 6 || y === 23;
      both(x, y, edge ? 1 : (y + f) % 3 === 0 ? 1 : x === 2 ? 9 : 8);
    }
    // body: a dark iron hull, a bronze plate on it, a ridge down the middle, rivets
    for (let y = 8; y <= 22; y++) for (let x = 5; x <= 11; x++) both(x, y, x === 5 || y === 8 || y === 22 ? 1 : 2);
    for (let y = 11; y <= 20; y++) for (let x = 7; x <= 11; x++) both(x, y, y === 11 || x === 7 ? 4 : 3);
    for (let y = 12; y <= 19; y++) both(11, y, y & 1 ? 4 : 3);
    for (let y = 13; y <= 18; y += 5) both(8, y, 9);
    for (let y = 21; y <= 22; y++) for (let x = 8; x <= 9; x++) both(x, y, y === 21 ? 8 : 1);   // exhausts
    // shoulders
    for (let y = 8; y <= 10; y++) for (let x = 6; x <= 11; x++) both(x, y, y === 8 ? 1 : y === 9 ? 3 : 2);
    // the head: a broad brow over the eyes, narrowing to a pale muzzle in front
    const half = [3, 3, 3, 4, 4, 4, 5, 5, 5, 5, 4];
    for (let y = 0; y < half.length; y++) for (let x = 12 - half[y]; x <= 11; x++) both(x, y, x === 12 - half[y] || y === 0 ? 1 : 3);
    for (let y = 1; y <= 3; y++) for (let x = 10; x <= 11; x++) both(x, y, 4);
    both(10, 2, 1);   // nostrils
    for (let y = 4; y <= 9; y++) both(11, y, 4);   // the blaze
    for (let x = 9; x <= 10; x++) both(x, 4, 2);   // brow
    both(8, 5, 7); both(9, 5, 7); both(9, 6, 2);   // eyes
    // horns: out from the poll and round to the front, pale on top, shaded under
    const horn = [[7, 7, 5], [6, 7, 5], [5, 6, 5], [4, 6, 5], [3, 5, 5], [2, 4, 5], [2, 3, 5], [2, 2, 5], [3, 1, 5], [3, 0, 5],
      [7, 8, 6], [6, 8, 6], [5, 7, 6], [4, 7, 6], [3, 6, 6], [2, 5, 6], [1, 4, 6], [1, 3, 6], [1, 2, 6]];
    for (const [x, y, v] of horn) both(x, y, v);
    // dark outline round the horns where they stand clear
    for (const [x, y] of horn) for (const [dx, dy] of DXY) if (g[y + dy] && g[y + dy][x + dx] === 0) both(x + dx, y + dy, 1);
  });
}
const MF_MINO_ROWS = [0, 1].map(mfMinoRows);

// SENTRY: a base plate with hazard corners (16px) and its twin-barrelled head, drawn in 8 directions (0 = up, 1 = up-right ...)
const MF_SENTRY_BASE = mfPaint(16, 16, set => {
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const c = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5)), d = Math.abs(x - 7.5) + Math.abs(y - 7.5);
    if (d > 11.5) continue;
    if (d > 10.5 || c > 7) set(x, y, 3);
    else if (d > 8.5) set(x, y, ((x + y) >> 1) & 1 ? 4 : 3);   // hazard stripes on the corners
    else set(x, y, x + y < 14 ? 2 : 6);
  }
  for (const [x, y] of [[4, 4], [11, 4], [4, 11], [11, 11]]) set(x, y, 1);   // bolts
});
function mfSentryHead(dir8) {
  const a = dir8 * Math.PI / 4, ux = Math.sin(a), uy = -Math.cos(a), px = -uy, py = ux;
  return mfPaint(16, 16, set => {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const along = (x - 7.5) * ux + (y - 7.5) * uy, perp = (x - 7.5) * px + (y - 7.5) * py, d = Math.hypot(x - 7.5, y - 7.5);
      // the dome: lit from the top left, a dark rim
      if (d <= 4.4) { set(x, y, d > 3.4 ? 3 : (x - 7.5) + (y - 7.5) < -1.5 ? 1 : 2); continue; }
      // two barrels side by side, a dark edge round each, dark at the muzzle
      for (const s of [-2.25, 2.25]) {
        const q = perp - s;
        if (along < 2 || along > 8.6 || Math.abs(q) > 1.8) continue;
        set(x, y, along > 7.8 || Math.abs(q) > 1 ? 3 : q < 0 ? 1 : 6);
      }
    }
    set(Math.round(7.5 + ux * 2), Math.round(7.5 + uy * 2), 5);   // the eye looks where it aims
  });
}
const MF_SENTRY_HEADS = [0, 1, 2, 3, 4, 5, 6, 7].map(mfSentryHead);
const MF_SENTRY_PAL = [null, '#E8ECF0', '#8C949C', '#141820', '#F8B800', '#F83800', '#4C545C'];

// small 16px pictures for the settings, the cards' tally and the editor (the minotaur and sentry draw bigger in play)
TANK_GRIDS.e27 = [0, 1].map(f => mfPaint(16, 16, set => {
  const both = (x, y, v) => { set(x, y, v); set(15 - x, y, v); };
  for (let y = 6; y <= 15; y++) for (let x = 0; x <= 2; x++) both(x, y, x === 1 && (y + f) % 2 ? 2 : 3);   // treads
  for (let y = 7; y <= 15; y++) for (let x = 3; x <= 7; x++) both(x, y, x === 3 || y === 15 ? 3 : x === 7 && y & 1 ? 1 : 2);   // body
  for (let y = 0; y <= 8; y++) { const h = y < 3 ? 2 : 3; for (let x = 8 - h; x <= 7; x++) both(x, y, x === 8 - h || y === 0 ? 3 : 2); }   // head
  both(7, 1, 1); both(7, 2, 1); both(6, 1, 3); both(5, 4, 4);   // muzzle, nostrils, eyes
  for (const [x, y] of [[4, 6], [3, 6], [2, 5], [1, 4], [1, 3], [1, 2], [2, 1], [2, 0]]) both(x, y, 1);   // horns
}));
// CRAWLER: a beetle of the walls: mandibles and a stubby gun, a ribbed shell, three legs a side that step in turn
TANK_GRIDS.e28 = [0, 1].map(f => mfPaint(16, 16, set => {
  const both = (x, y, v) => { set(x, y, v); set(15 - x, y, v); };
  for (let k = 0; k < 3; k++) {   // legs, out and back, alternating
    const y = 6 + k * 3, s = (k + f) & 1 ? 1 : -1;
    both(4, y, 3); both(3, y, 3); both(2, y + s, 3); both(1, y + s, 3); both(1, y + s * 2, 3);
  }
  for (let y = 1; y < 16; y++) for (let x = 0; x < 8; x++) {
    const head = y < 6, rx = head ? 2.6 : 4.6, cy = head ? 4 : 10, ry = head ? 2.4 : 5.4;
    const d = ((x - 7.5) / rx) ** 2 + ((y - cy) / ry) ** 2;
    if (d > 1) continue;
    both(x, y, d > 0.7 ? 3 : (!head && (y - 6) % 3 === 0) ? 3 : x === 7 && !head ? 1 : (x + y) % 5 === 0 ? 1 : 2);
  }
  both(5, 1, 3); both(5, 0, 3); both(6, 2, 3);   // mandibles
  both(7, 0, 3); both(7, 1, 3); both(7, 2, 1);   // gun
  both(6, 4, 4);   // eyes
}));
// SENTRY: its base and head as one picture
TANK_GRIDS.e29 = [0, 1].map(() => MF_SENTRY_BASE.map((r, y) => r.split('').map((c, x) => {
  const h = MF_SENTRY_HEADS[0][y][x];
  const v = h !== '.' ? +h : c === '.' ? 0 : ({ 1: 3, 2: 2, 3: 3, 4: 4, 6: 2 })[c];
  return v ? String(v) : '.';
}).join('')));
// LOCKSMITH: a slim fast hull with a big key for a gun (its bow on the hull, the blade out front), a swag bag on the back
TANK_GRIDS.e30 = [0, 1].map(f => mfPaint(16, 16, set => {
  for (let y = 4; y <= 14; y++) for (const x0 of [1, 12]) for (let x = x0; x < x0 + 3; x++) set(x, y, x === x0 + 1 && (y + f) % 2 ? 2 : 3);   // tracks
  for (let y = 5; y <= 12; y++) for (let x = 4; x <= 11; x++) set(x, y, x === 4 || x === 11 || y === 5 ? 3 : 2);
  for (let y = 10; y <= 15; y++) for (let x = 4; x <= 11; x++) {   // the bag
    const d = ((x - 7.5) / 3.6) ** 2 + ((y - 12.8) / 2.6) ** 2;
    if (d <= 1) set(x, y, d > 0.82 ? 3 : x + y < 21 ? 1 : 2);
  }
  set(7, 10, 3); set(8, 10, 3);   // its tie
  for (let y = 5; y <= 9; y++) for (let x = 5; x <= 10; x++) {   // the key's bow
    const d = Math.hypot(x - 7.5, y - 7);
    if (d <= 2.6) set(x, y, d > 1.6 ? 1 : 3);
  }
  for (let y = 0; y <= 4; y++) { set(7, y, 1); set(8, y, y ? 2 : 1); }   // the blade
  set(9, 1, 1); set(9, 3, 1); set(6, 0, 3); set(9, 0, 3);   // its teeth
}));
// MIRROR: a player's tank in glass (in play it takes the look of the tank it copies)
TANK_GRIDS.e31 = TANK_GRIDS.p0;

// a sprite of the big pictures, turned to dir (cached)
function mfSprite(key, rows, dir, pal) {
  const k = 'mf' + key + dir;
  let c = Sprites.cache.get(k);
  if (!c) { c = rotatedCanvas(rows, dir, pal); Sprites.cache.set(k, c); }
  return c;
}
// a key, 7x4 (the locksmith's loot)
function mfDrawKey(ctx, x, y, col) {
  ctx.fillStyle = COL.black; ctx.fillRect(x - 1, y - 1, 9, 6);
  ctx.fillStyle = col;
  ctx.fillRect(x, y, 3, 4); ctx.fillRect(x + 3, y + 1, 4, 1); ctx.fillRect(x + 5, y + 2, 1, 1); ctx.fillRect(x + 6, y + 2, 1, 2);
  ctx.fillStyle = COL.black; ctx.fillRect(x + 1, y + 1, 1, 2);
}

Object.assign(Stage.prototype, {
  // ------------------------------------------------------------ the maze as cells
  // the cell a 16px tank is in (the nearest centre), and where a 16px tank sits in the middle of cell (i, j)
  mfCellOf(x, y) {
    const m = this.maze;
    return [Math.max(0, Math.min(m.MW - 1, Math.round((x - 24) / 48))), Math.max(0, Math.min(m.MH - 1, Math.round((y - 24) / 48)))];
  },
  mfMid(i, j) { return [i * 48 + 24, j * 48 + 24]; },

  // a 4px cell nothing gets through (crush: brick doesn't count, it gets flattened)
  mfHard(v, crush) { return v < 0 || v === T_STEEL || v === T_WATER || v === T_LAVA || (v === T_BRICK && !crush) || (v >= T_LAVA && bioSolid(v)); },
  mfOpen(x, y, w, h, crush) {
    for (let cy = y >> 2; cy <= (y + h - 1) >> 2; cy++) for (let cx = x >> 2; cx <= (x + w - 1) >> 2; cx++) if (this.mfHard(this.get(cx, cy), crush)) return false;
    return true;
  },
  mfAllBrick(x, y) {
    for (let cy = y >> 2; cy < (y + 16) >> 2; cy++) for (let cx = x >> 2; cx < (x + 16) >> 2; cx++) if (this.get(cx, cy) !== T_BRICK) return false;
    return true;
  },

  // which ways out of each cell a 16px tank in its middle can drive (bit k: direction k); rebuilt as walls change
  mfLinks(crush) {
    const m = this.maze, key = crush ? 'c' : 'n', all = this.mfLinkC || (this.mfLinkC = {}), e = all[key];
    if (e && (e.ver === this.terrainVer || this.frame - e.at < 30)) return e.bits;
    const W = m.MW, bits = new Uint8Array(W * m.MH), qs = this.qblocks || [];
    // ? blocks stand in the way too (secrets.js)
    const open = (x, y, w, h) => this.mfOpen(x, y, w, h, crush) && !qs.some(q => overlap(x, y, w, h, q.x, q.y, 16, 16));
    for (let j = 0; j < m.MH; j++) for (let i = 0; i < W; i++) {
      const [x, y] = this.mfMid(i, j);
      if (i < W - 1 && open(x, y, 64, 16)) { bits[j * W + i] |= 2; bits[j * W + i + 1] |= 8; }
      if (j < m.MH - 1 && open(x, y, 16, 64)) { bits[j * W + i] |= 4; bits[(j + 1) * W + i] |= 1; }
    }
    all[key] = { bits, ver: this.terrainVer, at: this.frame };
    return bits;
  },

  // every cell's distance from cell (i0, j0) along the passages, and the way back
  mfRoute(i0, j0, crush, ban) {
    const W = this.maze.MW, n = W * this.maze.MH, bits = this.mfLinks(crush), step = [-W, 1, W, -1];
    const dist = new Int16Array(n).fill(-1), prev = new Int32Array(n).fill(-1), q = [j0 * W + i0];
    dist[q[0]] = 0;
    for (let h = 0; h < q.length; h++) {
      const c = q[h];
      for (let k = 0; k < 4; k++) {
        if (!((bits[c] >> k) & 1) || (ban && ban.get(c * 4 + k) > this.frame)) continue;
        const nb = c + step[k];
        if (dist[nb] >= 0) continue;
        dist[nb] = dist[c] + 1; prev[nb] = c; q.push(nb);
      }
    }
    return { dist, prev };
  },

  // ------------------------------------------------------------ who's who
  mfPrey() { return this.tanks.filter(o => o.isPlayer && !o.ally && o.alive && !o.boost.smoke); },
  mfFoes(kind) { return this.tanks.filter(t => t.alive && mfKind(t) === kind); },
  // a card the first time it comes into view
  mfMeet(t) {
    if (t.mfMet) return;
    if (this.tanks.some(o => o.isPlayer && o.alive && Math.abs(o.x - t.x) < VIEW_W / 2 + 8 && Math.abs(o.y - t.y) < VIEW_H / 2 + 8)) { t.mfMet = true; this.encounter('e' + t.type); }
  },
  // somewhere the host's screen shows (sounds from further off would only be noise)
  mfHeard(t, margin = 32) {
    const x = this.camX || 0, y = this.camY || 0;
    return t.x + 16 > x - margin && t.x < x + VIEW_W + margin && t.y + 16 > y - margin && t.y < y + VIEW_H + margin;
  },

  // ------------------------------------------------------------ setting out the maze
  // a maze foe straight onto the field (no sparkle: hidden in a wall, bolted to the floor, asleep in its lair)
  mfMake(type, x, y, extra = {}) {
    const st = Config.enemy(type), sk = Config.skill();
    const t = new Tank(Object.assign({ x, y, dir: 2, type, hp: st.hp, speed: st.speed * sk.speed, bulletSpeed: st.bullet * sk.shell, maxBullets: 1, ai: AI.HUNT, mazeAwake: true }, extra));
    t.maxHp = t.hp; t.cd = 60 + rnd(90);
    this.tanks.push(t);
    this.total++;
    const k = ENEMY[type].kind;
    if (k === 'minotaur') { t.minotaur = true; t.crusher = true; t.power = true; t.mfBan = new Map(); t.mfPlanT = 0; t.mfGruntT = 120 + rnd(120); t.mfD = 99; }
    if (k === 'crawler') { t.slither = true; t.mfSeed = rnd(170); }
    if (k === 'sentry') this.mfSentryInit(t);
    if (k === 'mirror') { t.maxBullets = 2; t.mfHist = []; t.mfWho = -1; }
    return t;
  },

  // where the maze foes go, by maze number, theme, skill and how many of you there are
  mfSetup() {
    const m = this.maze, lay = this.mfLay;
    if (!m || !lay) return;
    const n = this.num, theme = m.theme || 'dungeon', lv = seasonSkill(), np = Math.max(1, this.players.length);
    const many = ({ OFF: 0, FEW: 0.5, NORMAL: 1, MANY: 1.5 })[Config.get('newEnemies')];
    const scale = (many === undefined ? 1 : many) * MF_SKILL[lv] * (1 + 0.25 * (np - 1));
    const on = k => Config.get('e' + MF_T[k] + 'On') !== 'OFF';
    const count = (k, base, cap) => (on(k) ? Math.min(cap, Math.round(base * scale)) : 0);
    const W = m.MW, start = lay.start || [0, m.MH - 1];
    const fromStart = (i, j) => (lay.dist ? lay.dist[j * W + i] : Math.abs(i - start[0]) + Math.abs(j - start[1]));
    const [sx, sy] = this.mfMid(start[0], start[1]);
    // never near the start, the exit, inside a closed vault or the lair's arena
    const clear = (x, y, w = 16, h = 16, arenaOk) => {
      if (Math.abs(x - sx) + Math.abs(y - sy) < 200) return false;
      if (overlap(x, y, w, h, m.ex - 16, m.ey - 16, 64, 64)) return false;
      if (m.vault && !m.vault.open && overlap(x, y, w, h, m.vault.x - 8, m.vault.y - 8, m.vault.w + 16, m.vault.h + 16)) return false;
      return arenaOk || !(m.rooms || []).some(r => r.kind === 'arena' && overlap(x, y, w, h, r.x - 8, r.y - 8, r.w + 16, r.h + 16));
    };
    const cells = [];
    for (let j = 0; j < m.MH; j++) for (let i = 0; i < W; i++) if (fromStart(i, j) >= 5) cells.push([i, j]);
    const taken = [];
    const free = (x, y) => !taken.some(([a, b]) => Math.abs(a - x) + Math.abs(b - y) < 96) && !this.tanks.some(t => t.alive && overlap(t.x, t.y, 16, 16, x - 8, y - 8, 32, 32))
      && !this.spawns.some(s => overlap(s.x, s.y, 16, 16, x - 8, y - 8, 32, 32));
    const put = (type, x, y, extra) => { taken.push([x, y]); return this.mfMake(type, x, y, extra); };
    const tw = { dungeon: [0.7, 1.5], sewer: [1, 1.2], ice: [1, 0.7], machine: [2, 0.5] }[theme] || [1, 1];
    // sentries at the junctions with the longest views
    if (n >= 2) {
      const want = count('sentry', (1 + Math.floor((n - 1) / 3)) * tw[0], 6);
      for (const s of this.mfJunctions(cells).filter(s => clear(s.x, s.y))) {
        if (taken.filter(a => a.sentry).length >= want) break;
        if (taken.some(a => a.sentry && Math.abs(a[0] - s.x) + Math.abs(a[1] - s.y) < 192) || !free(s.x, s.y)) continue;
        put(MF_T.sentry, s.x, s.y);
        taken[taken.length - 1].sentry = true;
      }
    }
    // crawlers in the brick walls
    if (n >= 2) {
      const want = count('crawler', (1 + Math.floor((n - 1) / 3)) * tw[1], 6);
      const spots = this.mfSpots().filter(([x, y]) => clear(x, y) && fromStart(...this.mfCellOf(x, y)) >= 5);
      for (let k = 0; k < want && spots.length; k++) {
        const [x, y] = spots.splice(rnd(spots.length), 1)[0];
        if (!free(x, y)) { k--; continue; }
        const t = put(MF_T.crawler, x, y);
        t.mfHid = true; t.sub = true;
      }
    }
    // locksmiths patrol (and come for you once they see you)
    if (n >= 3) {
      const want = count('locksmith', 1 + (n >= 7 ? 1 : 0) + (np >= 3 ? 1 : 0), 3);
      const pool = cells.filter(([i, j]) => fromStart(i, j) >= 8);
      for (let k = 0, tries = 0; k < want && pool.length && tries < 50; tries++) {
        const [x, y] = this.mfMid(...pool[rnd(pool.length)]);
        if (!clear(x, y) || !free(x, y)) continue;
        put(MF_T.locksmith, x, y, { ai: AI.WANDER, mazeAwake: false });
        k++;
      }
    }
    // mirrors in the open rooms
    if (n >= 2 && on('mirror')) {
      const rooms = (m.rooms || []).filter(r => r.kind !== 'arena' && r.kind !== 'vault' && r.w >= 64 && r.h >= 48 && clear(r.x, r.y, r.w, r.h));
      for (let k = 0, made = 0; k < rooms.length && made < Math.max(1, Math.min(2, Math.round(scale))); k++) {
        const r = rooms[k], ax = r.x + r.w / 2;
        const x = Math.round((ax + r.w / 4 - 8) / 8) * 8, y = Math.round((r.y + r.h / 2 - 8) / 8) * 8;
        if (!this.mfOpen(x, y, 16, 16) || !free(x, y) || Math.random() > 0.75) continue;
        put(MF_T.mirror, x, y, { mfRoom: { x: r.x, y: r.y, w: r.w, h: r.h } });
        made++;
      }
    }
    // the minotaur: the lair's boss, or now and then one loose in the maze
    if (m.lair) this.mfLairBoss();
    else if (n >= 3 && on('minotaur') && Math.random() < Math.min(0.9, (0.35 + 0.1 * (n - 3)) * [0.5, 0.75, 1, 1.1, 1.2][lv] + (theme === 'dungeon' ? 0.15 : 0))) {
      const far = Math.max(...cells.map(([i, j]) => fromStart(i, j)));
      const pool = cells.filter(([i, j]) => fromStart(i, j) >= far * 0.55 && fromStart(i, j) <= far * 0.85);
      for (let tries = 0; tries < 40 && pool.length; tries++) {
        const [x, y] = this.mfMid(...pool[rnd(pool.length)]);
        if (!clear(x, y) || !free(x, y)) continue;
        put(MF_T.minotaur, x, y, { hp: Math.max(4, Math.round((Config.enemy(MF_T.minotaur).hp + 3 * (np - 1)) * [0.6, 0.8, 1, 1.15, 1.3][lv])) });
        this.mfOmen = 150;
        break;
      }
    }
  },

  // the lair's boss in its arena (asleep until you come in)
  mfLairBoss() {
    const m = this.maze;
    if (!m) return null;
    if (Config.get('e' + MF_T.minotaur + 'On') === 'OFF') { m.lairBossPending = false; return null; }
    const lv = seasonSkill(), np = Math.max(1, this.players.length), arena = (m.rooms || []).find(r => r.kind === 'arena');
    let i, j;
    if (arena) [i, j] = this.mfCellOf(arena.x + arena.w / 2 - 8, arena.y + arena.h / 2 - 8);
    else {
      // no arena: the cell furthest from the start (but not the exit)
      const lay = this.mfLay, W = m.MW;
      let bd = -1;
      for (let jj = 0; jj < m.MH; jj++) for (let ii = 0; ii < W; ii++) {
        const d = lay && lay.dist ? lay.dist[jj * W + ii] : ii + (m.MH - jj);
        const [x, y] = this.mfMid(ii, jj);
        if (d > bd && !overlap(x, y, 16, 16, m.ex - 32, m.ey - 32, 96, 96)) { bd = d; i = ii; j = jj; }
      }
    }
    const [x, y] = this.mfMid(i, j);
    // make room (whatever was to come there doesn't)
    const inWay = o => overlap(o.x, o.y, 16, 16, x - 16, y - 16, 48, 48);
    const gone = this.tanks.filter(o => o.alive && !o.isPlayer && inWay(o)).length + this.spawns.filter(s => s.enemy && inWay(s)).length;
    this.tanks = this.tanks.filter(o => o.isPlayer || !o.alive || !inWay(o));
    this.spawns = this.spawns.filter(s => !s.enemy || !inWay(s));
    this.total -= gone;
    const hp = Math.max(8, Math.round((Config.enemy(MF_T.minotaur).hp * 2 + 6 * (np - 1)) * [0.6, 0.8, 1, 1.2, 1.4][lv]));
    const t = this.mfMake(MF_T.minotaur, x, y, { hp, lairBoss: true, mfDormant: true, mfArena: arena ? { x: arena.x, y: arena.y, w: arena.w, h: arena.h } : null });
    t.mfChargeCd = 60; t.mfStompCd = 60;
    m.lairBossPending = false;
    return t;
  },

  // junction cells (three or four ways out) by how far they see down their corridors; a sentry stands in a
  // corner of each (by a wall, if there is one), so you can still get past it
  mfJunctions(cells) {
    const m = this.maze, W = m.MW, bits = this.mfLinks(false), out = [];
    const ways = c => [0, 1, 2, 3].filter(k => (bits[c] >> k) & 1);
    for (const [i, j] of cells) {
      const c = j * W + i, k = ways(c);
      if (k.length < 3) continue;
      if ((m.rooms || []).some(r => overlap(i * 48 + 16, j * 48 + 16, 32, 32, r.x, r.y, r.w, r.h))) continue;   // rooms are no junctions
      let view = 0;
      for (const d of k) {
        let ii = i, jj = j;
        for (let s = 0; s < 8 && (bits[jj * W + ii] >> d) & 1; s++) { ii += DXY[d][0]; jj += DXY[d][1]; view++; }
      }
      const shut = [0, 1, 2, 3].find(d => !k.includes(d));
      const qs = shut === undefined ? [[0, 0], [1, 0], [0, 1], [1, 1]] : [[[0, 0], [1, 0]], [[1, 0], [1, 1]], [[0, 1], [1, 1]], [[0, 0], [0, 1]]][shut];
      const q = qs[rnd(qs.length)], [cx, cy] = mazeCellPx(i, j);
      out.push({ x: cx + q[0] * 16, y: cy + q[1] * 16, view: view + Math.random() * 3 });
    }
    return out.sort((a, b) => b.view - a.view);
  },

  // places in brick walls a crawler fits in (16px of solid brick with open ground beside it)
  mfSpots() {
    const c = this.mfSpotC;
    if (c && (c.ver === this.terrainVer || this.frame - c.at < 60)) return c.list.slice();
    const list = [];
    for (let y = 0; y <= FH - 16; y += 8) for (let x = 0; x <= FW - 16; x += 8) {
      if (this.get(x >> 2, y >> 2) !== T_BRICK || !this.mfAllBrick(x, y)) continue;
      if (DXY.some(([dx, dy]) => this.mfOpen(x + dx * 16, y + dy * 16, 16, 16))) list.push([x, y]);
    }
    this.mfSpotC = { list, ver: this.terrainVer, at: this.frame };
    return list.slice();
  },

  // ------------------------------------------------------------ every frame
  // the per-frame round for the whole maze: the screen shake, a lair boss still to come, the omen
  mfFrame() {
    const m = this.maze;
    if (this.mfShake > 0) this.mfShake--;
    if (m.lairBossPending && !m.escaped && !this.tanks.some(t => t.alive && t.lairBoss)) this.mfLairBoss();
    if (this.mfOmen > 0 && --this.mfOmen === 0 && this.mfFoes('minotaur').length) {
      this.popups.push({ x: (this.camX || 0) + VIEW_W / 2, y: (this.camY || 0) + 56, text: 'SOMETHING HUNTS HERE...', label: true, color: '#F83800', t: 0, delay: 0, life: 150 });
      Sound.play('mfRoar');
    }
  },

  // housekeeping every maze foe does; true while it can't act (the clock, an EMP jolt)
  mfTick(t) {
    if (t.shield > 0) t.shield--;
    if (t.reveal > 0) t.reveal--;
    if (t.cool > 0) t.cool--;
    if (this.freezeE > 0) return true;
    if (t.stun > 0) { t.stun--; return true; }
    return false;
  },

  // ------------------------------------------------------------ minotaur
  mfMinotaur(t) {
    if (t.mfRing > 0) t.mfRing--;
    if (this.mfTick(t)) return;
    const ps = this.mfPrey();
    if (t.mfDormant) {
      const a = t.mfArena;
      if (t.hp < t.maxHp || ps.some(o => Math.abs(o.x - t.x) + Math.abs(o.y - t.y) < 136 || (a && overlap(o.x, o.y, 16, 16, a.x, a.y, a.w, a.h)))) this.mfWake(t);
      return;
    }
    this.mfMeet(t);
    this.mfCrushAll(t);
    if (!t.alive) return;
    if (t.mfHold > 0) { t.mfHold--; return; }
    if (t.mfDaze > 0) { t.mfDaze--; return; }
    if (t.mfStomp > 0) { if (--t.mfStomp === 0) this.mfQuake(t); return; }
    if (t.mfPaw > 0) { if (--t.mfPaw === 0) { t.mfCharge = MF_CHARGE_MAX; Sound.play('mfCharge'); } return; }
    if (t.mfCharge > 0) { this.mfChargeStep(t); return; }
    if (t.mfChargeCd > 0) t.mfChargeCd--;
    if (t.mfStompCd > 0) t.mfStompCd--;
    if (t.lairBoss && this.mfBossMoves(t, ps)) return;
    if (--t.mfPlanT <= 0) this.mfPlan(t, ps);
    const x0 = t.x, y0 = t.y;
    this.mfWalk(t, ps);
    this.mfShoot(t, ps);
    // you hear it coming: footfalls (louder the nearer it is), a snort now and then, a roar when it's close
    t.mfStepAcc = (t.mfStepAcc || 0) + Math.abs(t.x - x0) + Math.abs(t.y - y0);
    if (t.mfStepAcc >= 20) {
      t.mfStepAcc = 0;
      if (t.mfD <= 9) Sound.play(t.mfD <= 2 ? 'mfStep3' : t.mfD <= 5 ? 'mfStep2' : 'mfStep1');
    }
    if (t.mfD <= 8 && --t.mfGruntT <= 0) { t.mfGruntT = 160 + rnd(200); Sound.play('mfGrunt'); }
    if (t.mfD <= MF_NEAR && !t.mfNear) { t.mfNear = true; Sound.play('mfRoar'); }
    else if (t.mfD > MF_NEAR + 3) t.mfNear = false;
  },

  mfWake(t) {
    if (!t.mfDormant) return;
    t.mfDormant = false; t.mfHold = 60; t.mfPlanT = 0;
    this.mfShake = 24;
    this.popups.push({ x: (this.camX || 0) + VIEW_W / 2, y: (this.camY || 0) + 48, text: 'THE MINOTAUR WAKES!', label: true, color: '#F83800', t: 0, delay: 0, life: 120 });
    Sound.play('mfRoar');
    t.mfMet = false; this.mfMeet(t);
  },

  // the way to the nearest of you from cell `from` (its nearest cell unless given): the next cell along it
  // (-1: you're in that cell, or it can't reach anyone and stays), and how far you are (t.mfD, in cells)
  mfPlan(t, ps, from) {
    const W = this.maze.MW, [ci, cj] = this.mfCellOf(t.x, t.y), here = from === undefined ? cj * W + ci : from;
    t.mfPlanT = 30; t.mfPlanned = this.frame;
    const r = this.mfRoute(here % W, Math.floor(here / W), true, t.mfBan);
    let best = -1, bd = 1e9;
    for (const o of ps) {
      const [i, j] = this.mfCellOf(o.x, o.y), d = r.dist[j * W + i];
      if (d >= 0 && d < bd) { bd = d; best = j * W + i; }
    }
    if (best < 0) {
      // nobody it can reach: it prowls
      t.mfD = 99;
      const bits = this.mfLinks(true), ks = [0, 1, 2, 3].filter(k => (bits[here] >> k) & 1 && !(t.mfBan.get(here * 4 + k) > this.frame));
      t.mfNext = ks.length ? here + [-W, 1, W, -1][ks[rnd(ks.length)]] : -1;
      return;
    }
    t.mfD = bd;
    if (bd === 0) { t.mfNext = -1; return; }
    let c = best;
    while (r.prev[c] !== here) c = r.prev[c];
    t.mfNext = c;
  },

  // walk the middle of the passages, cell to cell (t.mfFrom -> t.mfTo); a new plan on arriving in each
  mfWalk(t, ps) {
    const W = this.maze.MW, mid = c => this.mfMid(c % W, Math.floor(c / W));
    let mult = 1;
    // it spots you down a corridor: it comes faster
    for (const o of ps) {
      const dx = o.x - t.x, dy = o.y - t.y, ahead = [-dy, dx, dy, -dx][t.dir], side = Math.abs((t.dir & 1) ? dy : dx);
      if (ahead > 0 && ahead < 240 && side < 12 && this.sightLine(t.x + 8, t.y + 8, o.x + 8, o.y + 8)) { mult = 1.6; break; }
    }
    if (!(t.mfTo >= 0)) { const [i, j] = this.mfCellOf(t.x, t.y); t.mfTo = t.mfFrom = j * W + i; }
    t.acc += t.speed * mult;
    while (t.acc >= 1) {
      t.acc -= 1;
      let [gx, gy] = mid(t.mfTo);
      if (t.x === gx && t.y === gy) {
        if (t.mfPlanned !== this.frame) this.mfPlan(t, ps, t.mfTo);
        const c = t.mfTo, n = t.mfNext;
        if (!(n >= 0) || Math.abs((n % W) - (c % W)) + Math.abs(Math.floor(n / W) - Math.floor(c / W)) !== 1) { t.acc = 0; break; }
        t.mfFrom = c; t.mfTo = n;
        [gx, gy] = mid(n);
      }
      const dx = gx - t.x, dy = gy - t.y, hx = dx > 0 ? 1 : 3, vy = dy > 0 ? 2 : 0;
      const tries = !dx ? [vy] : !dy ? [hx] : t.mfSwap ? [vy, hx] : [hx, vy];
      const d = tries.find(k => this.canStep(t, k));
      if (d === undefined) { this.mfBlocked(t, tries[0]); t.acc = 0; break; }
      t.dir = d;
      t.x += DXY[d][0]; t.y += DXY[d][1];
      this.crush(t);
      t.animTick++;
      t.mfStuck = 0; t.mfBump = 0; t.mfLost = 0;
    }
    t.anim = (t.animTick >> 2) & 1;
  },

  // something in the way: a tank of its own side gets trampled; a wall it can't break (or anything else) gets
  // avoided for a while: back to the cell it came from and another way round
  mfBlocked(t, d) {
    t.dir = d;
    const o = this.tankAhead(t);
    if (o && !o.isPlayer) {
      if (++t.mfBump > 40) { t.mfBump = 0; this.mfTrample(t, o); }
      return;
    }
    if (o) return;   // one of you, shielded: it leans on you
    if (++t.mfLost > 240) {
      // lost for good (it never should be): a step any way it can, and a fresh start from the nearest cell
      this.chooseDir(t, true); this.move(t, t.dir);
      t.mfLost = 0; t.mfTo = -1;
      return;
    }
    if (++t.mfStuck < 30) return;
    t.mfStuck = 0;
    const W = this.maze.MW, k = [0, 1, 2, 3].find(q => t.mfFrom + [-W, 1, W, -1][q] === t.mfTo);
    if (k !== undefined) {
      t.mfBan.set(t.mfFrom * 4 + k, this.frame + 600);
      t.mfBan.set(t.mfTo * 4 + ((k + 2) & 3), this.frame + 600);
      [t.mfFrom, t.mfTo] = [t.mfTo, t.mfFrom];
    } else t.mfSwap = !t.mfSwap;   // off the middle: try the other way round
    t.mfPlanT = 0;
  },

  mfTrample(t, o) {
    this.killEnemy(o, null, false);
    this.popups.push({ x: o.x + 8, y: o.y, text: 'CRUNCH!', label: true, color: '#F8B800', t: 0, delay: 0, life: 50 });
    this.mfShake = Math.max(this.mfShake, 8);
  },

  // anyone it touches (its whole bulk, not just the middle) is crushed
  mfCrushAll(t) {
    for (const o of this.tanks) {
      if (!o.isPlayer || !o.alive || o.shield > 0 || !overlap(t.x - 4, t.y - 4, 24, 24, o.x, o.y, 16, 16)) continue;
      this.hitPlayer(o);
      if (o.alive) continue;
      this.popups.push({ x: o.x + 8, y: o.y, text: 'CRUSHED!', label: true, color: '#F83800', t: 0, delay: 0, life: 60 });
      Sound.play('mfRoar');
      t.mfHold = 120; t.mfCharge = 0;
    }
  },

  // a heavy shell at whoever stands straight ahead in clear view
  mfShoot(t, ps) {
    if (t.cool > 0 || t.bullets > 0) return;
    for (const o of ps) {
      const dx = o.x - t.x, dy = o.y - t.y, ahead = [-dy, dx, dy, -dx][t.dir], side = Math.abs((t.dir & 1) ? dy : dx);
      if (ahead < 12 || ahead > 260 || side > 10 || !this.sightLine(t.x + 8, t.y + 8, o.x + 8, o.y + 8)) continue;
      this.fire(t);
      t.cool = Math.round((t.lairBoss ? 60 : 85) / Config.scale('enemyFire') / Config.skill().fire);
      return;
    }
  },

  // the lair boss: a stomp when you're close, a charge when you're straight down a clear line
  mfBossMoves(t, ps) {
    if (t.mfStompCd <= 0 && ps.some(o => Math.hypot(o.x - t.x, o.y - t.y) < MF_QUAKE_R - 8)) {
      t.mfStomp = 42; t.mfStompCd = 999;
      Sound.play('mfGrunt');
      return true;
    }
    if (t.mfChargeCd > 0) return false;
    for (const o of ps) {
      const dx = o.x - t.x, dy = o.y - t.y;
      if (Math.abs(dx) >= 12 && Math.abs(dy) >= 12) continue;
      const d = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : (dy > 0 ? 2 : 0), dist = Math.abs(dx) + Math.abs(dy);
      if (dist < 40 || dist > 260) continue;
      const [lx, ly, lw, lh] = [[t.x, t.y - dist, 16, dist], [t.x + 16, t.y, dist, 16], [t.x, t.y + 16, 16, dist], [t.x - dist, t.y, dist, 16]][d];
      if (!this.mfOpen(lx, ly, lw, lh, true)) continue;
      t.dir = d; t.mfPaw = 48; t.mfChargeCd = 999;
      Sound.play('mfGrunt');
      return true;
    }
    return false;
  },

  mfChargeStep(t) {
    t.mfCharge--;
    for (let k = 0; k < MF_CHARGE && t.mfCharge > 0; k++) {
      this.mfCrushAll(t);
      if (!t.alive || !(t.mfCharge > 0)) break;
      if (this.canStep(t, t.dir)) { t.x += DXY[t.dir][0]; t.y += DXY[t.dir][1]; this.crush(t); t.animTick++; continue; }
      const o = this.tankAhead(t);
      if (o && !o.isPlayer) { this.mfTrample(t, o); continue; }
      t.mfCharge = 0;
      if (!o) {
        // into a wall: it reels (and takes double damage meanwhile)
        t.mfDaze = Math.round(110 / Config.skill().speed);
        this.mfShake = Math.max(this.mfShake, 16);
        this.popups.push({ x: t.x + 8, y: t.y - 10, text: 'DAZED!', label: true, color: '#F8F838', t: 0, delay: 0, life: 60 });
        Sound.play('mfQuake');
      }
    }
    t.anim = (t.animTick >> 1) & 1;
    if (!(t.mfCharge > 0)) { t.mfChargeCd = 180 + rnd(120); t.mfPlanT = 0; t.mfTo = -1; }
  },

  mfQuake(t) {
    t.mfRing = 24;
    t.mfStompCd = Math.round((260 + rnd(80)) / Config.skill().fire);
    this.mfShake = Math.max(this.mfShake, 22);
    Sound.play('mfQuake');
    for (const o of this.tanks) if (o.isPlayer && o.alive && Math.hypot(o.x - t.x, o.y - t.y) < MF_QUAKE_R) this.hitPlayer(o);
  },

  // the beast is down: the vault opens, and in the lair everyone is paid
  mfSlain(t, by, award) {
    this.mfShake = 34;
    for (let k = 0; k < 6; k++) {
      const a = k * Math.PI / 3;
      this.fx.push({ x: t.x + 8 + Math.cos(a) * 12, y: t.y + 8 + Math.sin(a) * 12, frames: BIG_EXPLOSION(), per: 5, tick: -6 - k * 5 });
    }
    Sound.play('bossDie');
    if (!award && !(by && by.isPlayer)) return;
    this.popups.push({ x: t.x + 8, y: t.y - 16, text: t.lairBoss ? 'THE MINOTAUR FALLS!' : 'MINOTAUR SLAIN!', label: true, color: COL.gold, t: 0, delay: 10, life: 150 });
    if (t.lairBoss) for (const p of this.players) if (!p.out) { this.addScore(p, 3000); this.addXp(p, 60); }
    if (this.maze && this.maze.vault && typeof this.mazeOpenVault === 'function') this.mazeOpenVault();
  },

  // ------------------------------------------------------------ sentry
  mfSentryInit(t) {
    const W = this.maze.MW, i = Math.floor((t.x - 16) / 48), j = Math.floor((t.y - 16) / 48), bits = this.mfLinks(false)[j * W + i] || 0;
    t.mfDirs = [0, 1, 2, 3].filter(k => (bits >> k) & 1);
    if (!t.mfDirs.length) t.mfDirs = [0, 1, 2, 3];
    t.mfIdx = rnd(t.mfDirs.length);
    t.mfHead = t.mfDirs[t.mfIdx] * 2; t.dir = t.mfDirs[t.mfIdx];
    t.mfPhase = 0; t.mfT = 30 + rnd(90); t.speed = 0;
  },

  // turn, take aim, fire twice, rest; then the next open way round
  mfSentry(t) {
    if (t.mfFlash > 0) t.mfFlash--;
    if (this.mfTick(t)) return;
    t.hold = 0;
    if (!this.mfPrey().some(o => Math.abs(o.x - t.x) + Math.abs(o.y - t.y) < MF_SENTRY_WAKE)) return;   // nobody near: it waits
    this.mfMeet(t);
    if (--t.mfT > 0) return;
    const lv = seasonSkill();
    if (t.mfPhase === 0) {   // rested: on to the next way
      t.mfIdx = (t.mfIdx + 1) % t.mfDirs.length;
      t.mfPhase = 1; t.mfT = 1;
      if (t.mfHead !== t.mfDirs[t.mfIdx] * 2 && this.mfHeard(t)) Sound.play('mfTurn');
    } else if (t.mfPhase === 1) {   // swinging round, 45 degrees at a time
      const want = t.mfDirs[t.mfIdx] * 2, diff = (want - t.mfHead + 8) % 8;
      if (!diff) {
        t.mfPhase = 2; t.mfT = [64, 54, 44, 38, 32][lv]; t.dir = want / 2;
        if (this.mfHeard(t)) Sound.play('mfAim');
      } else { t.mfHead = (t.mfHead + (diff <= 4 ? 1 : 7)) % 8; t.mfT = 7; }
    } else if (t.mfPhase === 2) {   // aimed: fire
      this.mfVolley(t); t.mfPhase = 3; t.mfT = 14; t.mfShots = 1;
    } else if (t.mfShots > 0) { t.mfShots--; this.mfVolley(t); t.mfT = 14; }
    else { t.mfPhase = 0; t.mfT = [70, 52, 34, 26, 20][lv]; }
  },

  // where its shells start: both lanes of the corridor, just off its plate
  mfLanes(t, d) {
    const cx = 16 + 48 * Math.floor((t.x - 16) / 48), cy = 16 + 48 * Math.floor((t.y - 16) / 48);
    if (d & 1) { const x = d === 1 ? t.x + 16 : t.x - 4; return [[x, cy + 6], [x, cy + 22]]; }
    const y = d === 2 ? t.y + 16 : t.y - 4;
    return [[cx + 6, y], [cx + 22, y]];
  },

  mfVolley(t) {
    const d = t.mfHead >> 1;
    for (const [x, y] of this.mfLanes(t, d)) {
      this.bullets.push({ x, y, dir: d, speed: t.bulletSpeed, owner: t, free: true, isPlayer: false, power: false, cutter: false, alive: true,
        pierce: false, rocket: false, passPlayers: false, frost: false, fire: false, mirage: false });
    }
    t.mfFlash = 6; t.reveal = 40;
    if (this.mfHeard(t)) Sound.play('mfTurret');
  },

  // how far a lane runs from (x, y) before a wall stops a shell (the dotted aim line)
  mfLaneLen(x, y, d) {
    let n = 0;
    for (; n < 400; n += 4) {
      const v = this.get((x + 2 + DXY[d][0] * n) >> 2, (y + 2 + DXY[d][1] * n) >> 2);
      if (v < 0 || v === T_STEEL || v === T_BRICK || (v >= T_LAVA && bioSolid(v))) break;
    }
    return n;
  },

  // ------------------------------------------------------------ crawler
  mfCrawler(t) {
    if (t.mfHid) {
      if (this.mfTick(t)) return;
      t.hold = 0;
      if (t.mfCrack > 0) { if (--t.mfCrack === 0) this.mfBurst(t); return; }
      if (t.mfRest > 0) t.mfRest--;
      // its wall shot away (or flattened): out it comes
      let brick = 0;
      for (let cy = t.y >> 2; cy < (t.y + 16) >> 2; cy++) for (let cx = t.x >> 2; cx < (t.x + 16) >> 2; cx++) if (this.get(cx, cy) === T_BRICK) brick++;
      if (brick < 12) { this.mfBurst(t); return; }
      if (t.mfRest > 0) return;
      if (this.mfPrey().some(o => Math.abs(o.x - t.x) + Math.abs(o.y - t.y) < MF_WAKE)) { t.mfCrack = 22; if (this.mfHeard(t)) Sound.play('mfCrack'); }
      return;
    }
    if (t.mfBurstT > 0) {
      // bursting out: two pixels a frame
      if (this.mfTick(t)) return;
      t.mfBurstT--;
      for (let k = 0; k < 2; k++) if (this.canStep(t, t.dir)) { t.x += DXY[t.dir][0]; t.y += DXY[t.dir][1]; t.animTick++; } else t.mfBurstT = 0;
      t.anim = (t.animTick >> 1) & 1;
      if (!t.mfBurstT) t.cool = 0;   // and a shot straight away
      return;
    }
    if (t.mfGo) {
      if (t.x === t.mfGo[0] && t.y === t.mfGo[1] && this.mfAllBrick(t.x, t.y)) { this.mfHide(t); return; }
      if (++t.mfGoT > (t.mfGoMax || 600) || !this.mfAllBrick(t.mfGo[0], t.mfGo[1])) { t.mfGo = null; t.mfOut = 120; }
      else t.cool = Math.max(t.cool, 2);   // on its way it holds its fire (it would only spoil its wall)
    } else if (--t.mfOut <= 0) {
      t.mfGo = this.mfPickHide(t); t.mfGoT = 0;
      if (!t.mfGo) t.mfOut = 120;
    }
    mfUpdateEnemy.call(this, t);
  },

  // out of the wall, towards whoever woke it
  mfBurst(t) {
    const ps = this.mfPrey(), o = ps.sort((a, b) => Math.abs(a.x - t.x) + Math.abs(a.y - t.y) - Math.abs(b.x - t.x) - Math.abs(b.y - t.y))[0];
    let best = -1, bd = 1e9;
    for (let d = 0; d < 4; d++) {
      const x = t.x + DXY[d][0] * 16, y = t.y + DXY[d][1] * 16;
      if (!this.mfOpen(x, y, 16, 16, true)) continue;
      const v = (o ? Math.abs(o.x - x) + Math.abs(o.y - y) : rnd(9)) + (this.mfOpen(x, y, 16, 16) ? 0 : 100);
      if (v < bd) { bd = v; best = d; }
    }
    t.mfHid = false; t.sub = false; t.mfCrack = 0;
    t.dir = best < 0 ? t.dir : best;
    t.mfBurstT = best < 0 ? 0 : 8;
    t.mfFrom = [t.x, t.y]; t.mfOut = 360 + rnd(200); t.mfGo = null;
    t.ai = AI.HUNT; t.reveal = 90; t.hold = 0;
    const [fx, fy] = [[8, 0], [16, 8], [8, 16], [0, 8]][t.dir];
    for (let k = 0; k < 3; k++) this.fx.push({ x: t.x + fx + rnd(9) - 4, y: t.y + fy + rnd(9) - 4, frames: Sprites.smallExp, per: 3, tick: -k * 3 });
    if (this.mfHeard(t)) Sound.play('mfBurst');
    t.mfMet = false; this.mfMeet(t);
  },

  mfHide(t) {
    t.mfHid = true; t.sub = true; t.mfGo = null; t.mfRest = 150; t.hold = 0;
    this.addFx(t.x + 8, t.y + 8, [Sprites.smallExp[0]], 4);
    if (this.mfHeard(t)) Sound.play('mfHide');
  },

  // another wall to slip into: a near one, not the one it came out of, not one with a player beside it
  // (the nearest along its way, which goes through brick but not steel; t.mfGoMax: how long it may take)
  mfPickHide(t) {
    const others = this.mfFoes('crawler').filter(o => o !== t).map(o => o.mfGo || [o.x, o.y]), ps = this.mfPrey();
    const NX = COLS * 2 - 1, way = this.mfNav((t.y >> 3) * NX + (t.x >> 3), 90);
    let best = null, bd = 90;   // nodes (8px): no further than this
    for (const [x, y] of this.mfSpots()) {
      const d = way[(y >> 3) * NX + (x >> 3)];
      if (!(d < bd) || d < 3 || (t.mfFrom && x === t.mfFrom[0] && y === t.mfFrom[1])) continue;
      if (others.some(([a, b]) => Math.abs(a - x) + Math.abs(b - y) < 24) || ps.some(o => Math.abs(o.x - x) + Math.abs(o.y - y) < 56)) continue;
      best = [x, y]; bd = d;
    }
    if (best) t.mfGoMax = Math.round(bd * 8 / Math.max(0.3, t.speed) * 1.6) + 120;
    return best;
  },

  // its route to a wall (brick is no obstacle to it)
  mfFieldTo(t, at) {
    const f = t.mfField, NX = COLS * 2 - 1, node = (at[1] >> 3) * NX + (at[0] >> 3);
    if (f && f.node === node && (f.ver === this.terrainVer || this.frame - f.at < 120)) return f.dist;
    t.mfField = { node, at: this.frame, ver: this.terrainVer, dist: this.mfNav(node, 110) };
    return t.mfField.dist;
  },

  // navField's distances (the crawler's way: brick is no obstacle), but only out to max moves from node: it never
  // needs more, and a whole big maze takes a while
  mfNav(node, max) {
    const NX = COLS * 2 - 1, cost = this.navCosts('slither'), dist = new Float64Array(cost.length).fill(Infinity), h = new NavHeap();
    if (node < 0 || node >= dist.length) return dist;
    dist[node] = 0; h.push(0, node);
    while (h.size) {
      const [d, v] = h.pop();
      if (d > dist[v]) continue;
      if (d > max) break;
      const vx = v % NX, vy = (v / NX) | 0, step = Math.max(1, cost[v]);
      for (const [dx, dy] of DXY) {
        const ux = vx + dx, uy = vy + dy, u = uy * NX + ux;
        if (ux < 0 || uy < 0 || ux >= NX || u >= dist.length || cost[u] < 0 || d + step >= dist[u]) continue;
        dist[u] = d + step; h.push(d + step, u);
      }
    }
    return dist;
  },

  // ------------------------------------------------------------ locksmith
  mfLocksmith(t) {
    if (t.mazeAwake && t.ai !== AI.HUNT) t.ai = AI.HUNT;
    if (t.key && !this.mfPrey().some(o => Math.abs(o.x - t.x) + Math.abs(o.y - t.y) < 56)) t.cool = Math.max(t.cool, 2);   // no time to shoot while it runs (unless cornered)
    mfUpdateEnemy.call(this, t);
    if (!t.alive || this.freezeE > 0) return;
    if (t.mazeAwake) this.mfMeet(t);
    if (t.mfGrab > 0) { t.mfGrab--; return; }
    if (t.key) return;
    const o = this.tanks.find(p => p.isPlayer && !p.ally && p.alive && overlap(t.x - 2, t.y - 2, 20, 20, p.x, p.y, 16, 16));
    if (!o) return;
    t.mfGrab = 90;
    const c = typeof this.mazeStealKey === 'function' ? this.mazeStealKey() : null;
    if (!c) return;   // nothing to steal: it just keeps after you
    t.key = c; t.mfFlee = true; t.speed *= 1.15; t.mazeAwake = true; t.ai = AI.HUNT;
    this.popups.push({ x: t.x + 8, y: t.y - 6, text: 'KEY STOLEN!', label: true, color: mfKeyCol(c), t: 0, delay: 0, life: 90 });
    Sound.play('mfSteal');
    this.turn(t, Math.abs(o.x - t.x) > Math.abs(o.y - t.y) ? (o.x > t.x ? 3 : 1) : (o.y > t.y ? 0 : 2));
  },

  // run: always to where you are furthest from it
  mfFleeChoose(t, blocked) {
    const pt = this.nearestPlayer(t);
    if (!pt) { this.chooseDir(t, blocked); return; }
    const dist = this.navPlayer(pt), NX = COLS * 2 - 1, bx = t.x >> 3, by = t.y >> 3;
    let best = -1, bv = -Infinity;
    for (let d = 0; d < 4; d++) {
      if (!this.canStep(t, d)) continue;
      const ux = bx + DXY[d][0], uy = by + DXY[d][1];
      if (ux < 0 || uy < 0 || ux >= NX || uy * NX >= dist.length || !isFinite(dist[uy * NX + ux])) continue;
      const v = dist[uy * NX + ux] + (d === t.dir ? 0.5 : 0) + Math.random() * 0.3;
      if (v > bv) { bv = v; best = d; }
    }
    if (best < 0) this.chooseDir(t, blocked); else this.turn(t, best);
  },

  mfDropKey(t) {
    if (!t.key || (this.maze && this.maze.escaped)) return;
    if (typeof this.mazeDropItem === 'function') this.mazeDropItem('key', t.x, t.y, { color: t.key });
    this.popups.push({ x: t.x + 8, y: t.y - 6, text: 'KEY DROPPED!', label: true, color: mfKeyCol(t.key), t: 0, delay: 20, life: 90 });
    t.key = null;
  },

  // ------------------------------------------------------------ mirror
  mfMirror(t) {
    if (this.mfTick(t)) return;
    if (t.mfDaze > 0) { t.mfDaze--; return; }
    const R = t.mfRoom;
    if (!R) return;
    let p = null, bd = 1e9;
    for (const o of this.mfPrey()) {
      if (!overlap(o.x, o.y, 16, 16, R.x - 8, R.y - 8, R.w + 16, R.h + 16)) continue;
      const d = Math.abs(o.x - t.x) + Math.abs(o.y - t.y);
      if (d < bd) { bd = d; p = o; }
    }
    if (!p) { t.mfWho = -1; t.mfHist.length = 0; return; }
    if (t.mfWho !== p.player.i) {
      t.mfWho = p.player.i; t.mfHist.length = 0; t.mfShotSeen = p.mfShot || 0;
      Sound.play('mfMirror');
      this.mfMeet(t);
    }
    t.mfLv = p.player.level || 0;
    const shot = p.mfShot > t.mfShotSeen;
    if (shot) t.mfShotSeen = p.mfShot;
    t.mfHist.push([p.x, p.y, p.dir, shot ? 1 : 0]);
    if (t.mfHist.length <= MF_LAG) return;
    const [px, py, pd, fired] = t.mfHist.shift();
    // where you'd be, left for right across the room's middle (and inside the room)
    const ax = R.x + R.w / 2, gx = Math.max(R.x, Math.min(R.x + R.w - 16, Math.round(2 * ax - px - 16))), gy = Math.max(R.y, Math.min(R.y + R.h - 16, py));
    t.acc += t.speed;
    while (t.acc >= 1) {
      t.acc -= 1;
      const dx = gx - t.x, dy = gy - t.y;
      if (!dx && !dy) break;
      const d = [dy ? (dy > 0 ? 2 : 0) : -1, dx ? (dx > 0 ? 1 : 3) : -1].find(k => k >= 0 && this.canStep(t, k));
      if (d === undefined) { t.acc = 0; break; }
      t.x += DXY[d][0]; t.y += DXY[d][1]; t.animTick++;
    }
    t.dir = pd & 1 ? 4 - pd : pd;
    t.anim = (t.animTick >> 1) & 1;
    if (fired) this.fire(t);
  },

  // ------------------------------------------------------------ drawing
  mfDraw(ctx, t) {
    const k = mfKind(t), f = this.frame;
    if (k === 'minotaur') this.mfDrawMino(ctx, t);
    else if (k === 'sentry') {
      ctx.drawImage(mfSprite('sb', MF_SENTRY_BASE, 0, MF_SENTRY_PAL), t.x, t.y);
      const hit = t.reveal > 80 && (f >> 1) & 1, h = t.mfHead || 0;
      ctx.drawImage(mfSprite('sh' + h + (hit ? 'w' : ''), MF_SENTRY_HEADS[h], 0, hit ? [null, '#F8F8F8', '#F8F8F8', '#F8F8F8', '#F8F8F8', '#F8F8F8'] : MF_SENTRY_PAL), t.x, t.y);
      // aiming: the muzzles blink, faster as it's about to fire; the flash as it fires
      const [ux, uy] = [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]][h];
      if (t.mfPhase === 2 && ((t.mfT > 16 ? f >> 3 : f >> 1) & 1)) { ctx.fillStyle = '#F83800'; ctx.fillRect(t.x + 7 + ux * 7 - 1, t.y + 7 + uy * 7 - 1, 4, 4); }
      if (t.mfFlash > 0) {
        ctx.fillStyle = t.mfFlash > 3 ? '#F8F8F8' : '#F8B800';
        for (const [x, y] of this.mfLanes(t, h >> 1)) ctx.fillRect(x - 1, y - 1, 6, 6);
      }
      if (t.hp < (t.maxHp || 4) && (f & 15) < 8) { ctx.fillStyle = '#7C7C7C'; ctx.fillRect(t.x + 9, t.y + 2 - ((f >> 3) & 3), 2, 2); }   // smoking
    } else if (k === 'crawler') this.mfDrawCrawler(ctx, t);
    else if (k === 'locksmith') {
      ctx.drawImage(Sprites.tank('e' + t.type, t.anim, t.dir, t.reveal > 80 && (f >> 1) & 1 ? 'silver' : 'locksmith'), t.x, t.y);
      if (t.key) mfDrawKey(ctx, t.x + 4, t.y - 7 + ((f >> 4) & 1), mfKeyCol(t.key));
    } else if (k === 'mirror') {
      if (t.mfDaze > 0 && (f >> 1) & 1) return;
      const img = Sprites.tank('p' + Math.max(0, Math.min(3, t.mfLv || 0)), t.anim, t.dir, 'mirror');
      if ((f & 63) < 32) ctx.drawImage(Sprites.outline(img, '#58F8F8'), t.x - 1, t.y - 1);
      ctx.drawImage(img, t.x, t.y);
      // a gleam running across the glass
      const g = (f >> 1) % 40;
      if (g < 18) {
        ctx.fillStyle = 'rgba(255,255,255,0.75)';
        for (let k2 = 0; k2 < 16; k2++) { const x = g - k2; if (x >= 2 && x < 14 && k2 >= 2 && k2 < 14) ctx.fillRect(t.x + x, t.y + k2, 1, 1); }
      }
    }
  },

  mfDrawMino(ctx, t) {
    const f = this.frame, hit = t.reveal > 82 && (f >> 1) & 1;
    let x = t.x - 4, y = t.y - 4;
    if (t.mfStomp > 0 || t.mfPaw > 0) x += ((f >> 1) & 1) * 2 - 1;   // it trembles before it goes
    const pal = hit ? 'hit' : t.mfDormant ? 'sleep' : t.lairBoss ? 'boss' : 'mino';
    const img = mfSprite('mi' + pal + (t.anim || 0), MF_MINO_ROWS[t.anim || 0], t.dir, MF_MINO_PAL[pal]);
    if (t.lairBoss && !t.mfDormant) ctx.drawImage(Sprites.outline(img, (f >> 3) & 1 ? '#F8B800' : '#F83800'), x - 1, y - 1);
    ctx.drawImage(img, x, y);
    if (t.mfDormant) Font.draw(ctx, 'Z', t.x + 12 + ((f >> 4) & 1), t.y - 10 - ((f >> 3) % 6), '#BCBCBC');
    // knocked silly: stars round its head
    if (t.mfDaze > 0) for (let k = 0; k < 3; k++) {
      const a = f * 0.15 + k * 2.1;
      ctx.fillStyle = k & 1 ? '#F8F838' : '#F8F8F8';
      ctx.fillRect(Math.round(t.x + 7 + Math.cos(a) * 9), Math.round(t.y + 6 + Math.sin(a) * 4) - 4, 2, 2);
    }
    // its hits, over its back (the lair's boss has a bar of its own at the bottom of the screen)
    if (!t.lairBoss && t.hp < t.maxHp) {
      const w = Math.max(1, Math.round(22 * t.hp / t.maxHp));
      ctx.fillStyle = COL.black; ctx.fillRect(x, y - 4, 24, 3);
      ctx.fillStyle = t.hp / t.maxHp > 0.34 ? '#F8B800' : '#F83800'; ctx.fillRect(x + 1, y - 3, w, 1);
    }
  },

  mfDrawCrawler(ctx, t) {
    const f = this.frame;
    if (t.mfHid) {
      // in the wall: a glint now and then; red eyes when you're near; the bricks shiver just before it comes out
      const near = this.tanks.some(o => o.isPlayer && o.alive && Math.abs(o.x - t.x) + Math.abs(o.y - t.y) < 96);
      if (t.mfCrack > 0) {
        ctx.fillStyle = '#5C2C14';
        for (let k = 0; k < 6; k++) ctx.fillRect(t.x + ((k * 37 + f * 5) % 16), t.y + ((k * 23 + f * 3) % 16), 2, 1);
        ctx.fillStyle = '#C8B898';
        for (let k = 0; k < 4; k++) ctx.fillRect(t.x + ((k * 41 + f * 7) % 18) - 1, t.y + ((k * 29 + f * 11) % 18) - 1, 1, 1);
      }
      if (near || t.mfCrack > 0) {
        ctx.globalAlpha = t.mfCrack > 0 ? 1 : 0.6 + 0.35 * Math.sin(f / 9);
        ctx.fillStyle = COL.black;
        ctx.fillRect(t.x + 3, t.y + 6, 4, 3); ctx.fillRect(t.x + 9, t.y + 6, 4, 3);
        ctx.fillStyle = t.mfCrack > 0 && (f >> 1) & 1 ? '#F8D838' : '#F83800';
        ctx.fillRect(t.x + 4, t.y + 7, 2, 1); ctx.fillRect(t.x + 10, t.y + 7, 2, 1);
        ctx.globalAlpha = 1;
      }
      const g = (f + (t.mfSeed || 0)) % 170;
      if (g < 6) {
        const gx = t.x + 3 + ((t.mfSeed || 0) % 10), gy = t.y + 3 + ((t.mfSeed || 0) * 7 % 10);
        ctx.fillStyle = '#F8F8F8';
        ctx.fillRect(gx, gy, 1, 1);
        if (g > 1 && g < 5) { ctx.fillRect(gx - 1, gy, 3, 1); ctx.fillRect(gx, gy - 1, 1, 3); }
      }
      return;
    }
    ctx.drawImage(Sprites.tank('e' + t.type, t.anim, t.dir, t.reveal > 82 && (f >> 1) & 1 ? 'silver' : 'crawler'), t.x, t.y);
  },

  // over the ground: the sentries' aim lines, the lair boss's stomp and charge warnings
  mfOver(ctx) {
    const f = this.frame;
    for (const t of this.tanks) {
      const k = mfKind(t);
      if (!t.alive || !k) continue;
      if (k === 'sentry' && t.mfPhase === 2 && ((t.mfT > 16 ? f >> 2 : f >> 1) & 1)) {
        const d = (t.mfHead || 0) >> 1;
        ctx.fillStyle = t.mfT > 16 ? 'rgba(248,56,0,0.8)' : '#F8F8F8';
        for (const [x, y] of this.mfLanes(t, d)) {
          const n = this.mfLaneLen(x, y, d);
          for (let s = 4; s < n; s += 8) ctx.fillRect(x + 1 + DXY[d][0] * s, y + 1 + DXY[d][1] * s, 2, 2);
        }
      }
      if (k !== 'minotaur') continue;
      if (t.mfStomp > 0) {
        // where the stomp will reach
        const r = MF_QUAKE_R, cx = t.x + 8, cy = t.y + 8;
        ctx.fillStyle = (f >> 2) & 1 ? 'rgba(248,56,0,0.85)' : 'rgba(248,184,0,0.6)';
        for (let a = 0; a < 48; a++) { const q = a / 48 * Math.PI * 2; ctx.fillRect(Math.round(cx + Math.cos(q) * r) - 1, Math.round(cy + Math.sin(q) * r) - 1, 2, 2); }
      }
      if (t.mfRing > 0) {
        // the shock rolling out
        const r = (24 - t.mfRing) * 3, cx = t.x + 8, cy = t.y + 8;
        ctx.fillStyle = 'rgba(200,184,152,' + (t.mfRing / 30).toFixed(2) + ')';
        for (let a = 0; a < 40; a++) { const q = a / 40 * Math.PI * 2 + f * 0.05; ctx.fillRect(Math.round(cx + Math.cos(q) * r) - 1, Math.round(cy + Math.sin(q) * r) - 1, 3, 3); }
      }
      if (t.mfPaw > 0) {
        // pawing the ground: dust kicked up behind, and a warning
        const [bx, by] = [[8, 22], [-6, 8], [8, -6], [22, 8]][t.dir];
        ctx.fillStyle = '#C8B898';
        for (let k2 = 0; k2 < 4; k2++) ctx.fillRect(t.x + bx + ((k2 * 5 + f) % 9) - 4, t.y + by + ((k2 * 7 + f * 2) % 7) - 3, 2, 2);
        if ((f >> 2) & 1) Font.draw(ctx, '!', t.x + 4, t.y - 16, '#F83800');
      }
      if (t.mfCharge > 0) {
        // speed lines behind it
        ctx.fillStyle = 'rgba(248,248,248,0.6)';
        const [dx, dy] = DXY[t.dir];
        for (let k2 = 0; k2 < 3; k2++) {
          const off = k2 * 6 - 6, len = 8 + ((f + k2 * 3) % 6);
          if (dx) ctx.fillRect(dx > 0 ? t.x - 6 - len : t.x + 22, t.y + 8 + off, len, 1);
          else ctx.fillRect(t.x + 8 + off, dy > 0 ? t.y - 6 - len : t.y + 22, 1, len);
        }
      }
    }
  },

  // on the screen: IT'S COMING..., the lair boss's bar, where a stolen key went
  mfScreen(ctx, camX, camY) {
    const f = this.frame;
    for (const t of this.tanks) {
      const k = mfKind(t);
      if (!t.alive || !k) continue;
      const sx = t.x + 8 - camX, sy = t.y + 8 - camY, off = sx < -12 || sy < -12 || sx > VIEW_W + 12 || sy > VIEW_H + 12;
      if (k === 'minotaur' && !t.mfDormant && off && t.mfD <= MF_NEAR) {
        // the edge it's behind glows red, more as it comes
        const a = (0.18 + 0.32 * (1 - t.mfD / (MF_NEAR + 1))) * (0.7 + 0.3 * Math.sin(f / 7));
        const ang = Math.atan2(sy - VIEW_H / 2, sx - VIEW_W / 2), ca = Math.cos(ang), sa = Math.sin(ang);
        for (let s = 0; s < 6; s++) {
          ctx.fillStyle = 'rgba(216,24,0,' + (a * (1 - s / 6)).toFixed(3) + ')';
          if (ca > 0.35) ctx.fillRect(VIEW_W - 2 - s * 2, 0, 2, VIEW_H);
          if (ca < -0.35) ctx.fillRect(s * 2, 0, 2, VIEW_H);
          if (sa > 0.35) ctx.fillRect(0, VIEW_H - 2 - s * 2, VIEW_W, 2);
          if (sa < -0.35) ctx.fillRect(0, s * 2, VIEW_W, 2);
        }
        if ((f >> 5) % 3 !== 2) {
          ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(VIEW_W / 2 - 60, VIEW_H - 25, 120, 13);
          Font.drawCenter(ctx, "IT'S COMING...", VIEW_W / 2, VIEW_H - 22, '#F83800');
        }
      }
      if (k === 'locksmith' && t.key && off && (f >> 3) & 1) {
        mfDrawKey(ctx, Math.max(3, Math.min(VIEW_W - 10, sx - 4)), Math.max(3, Math.min(VIEW_H - 7, sy - 2)), mfKeyCol(t.key));
      }
      if (t.lairBoss && !t.mfDormant) {
        // the boss's bar along the bottom of the screen
        const w = 120, x0 = (VIEW_W - w) >> 1, y0 = VIEW_H - 10, fill = Math.round((w - 2) * Math.max(0, t.hp) / (t.maxHp || 1));
        Font.drawCenter(ctx, 'MINOTAUR', VIEW_W / 2, y0 - 10, COL.gold);
        ctx.fillStyle = COL.black; ctx.fillRect(x0 - 1, y0 - 1, w + 2, 6);
        ctx.fillStyle = '#5C1C00'; ctx.fillRect(x0, y0, w, 4);
        ctx.fillStyle = t.mfDaze > 0 && (f >> 2) & 1 ? '#F8F8F8' : t.hp / t.maxHp > 0.34 ? '#F87800' : (f >> 3) & 1 ? '#F83800' : '#F8B800';
        ctx.fillRect(x0 + 1, y0 + 1, fill, 2);
      }
    }
  },

  // ------------------------------------------------------------ online: what a guest needs to draw them
  mfView() {
    const out = [];
    this.tanks.filter(t => t.alive).forEach((t, i) => {
      const k = mfKind(t);
      if (!k) return;
      if (k === 'minotaur') out.push([i, t.maxHp, (t.mfDormant ? 1 : 0) | (t.lairBoss ? 2 : 0), t.mfStomp || 0, t.mfRing || 0, t.mfD === undefined ? 99 : t.mfD, t.mfPaw || 0, t.mfCharge || 0, t.mfDaze || 0]);
      else if (k === 'crawler') out.push([i, t.maxHp, t.mfHid ? 1 : 0, t.mfCrack || 0, t.mfSeed || 0]);
      else if (k === 'sentry') out.push([i, t.maxHp, t.mfHead || 0, t.mfPhase || 0, t.mfT || 0, t.mfFlash || 0]);
      else if (k === 'locksmith') out.push([i, t.maxHp, t.key || 0]);
      else out.push([i, t.maxHp, t.mfDaze || 0, t.mfLv || 0]);
    });
    return out.length || this.mfShake ? { t: out, sh: this.mfShake || 0 } : null;
  },

  mfApplyView(v) {
    this.mfShake = v ? v.sh : 0;
    if (!v) return;
    for (const a of v.t) {
      const t = this.tanks[a[0]], k = t && mfKind(t);
      if (!k) continue;
      t.maxHp = a[1];
      if (k === 'minotaur') {
        Object.assign(t, { minotaur: true, mfDormant: !!(a[2] & 1), lairBoss: !!(a[2] & 2), mfStomp: a[3], mfRing: a[4], mfD: a[5], mfPaw: a[6], mfCharge: a[7], mfDaze: a[8] });
      } else if (k === 'crawler') Object.assign(t, { mfHid: !!a[2], sub: !!a[2], mfCrack: a[3], mfSeed: a[4] });
      else if (k === 'sentry') Object.assign(t, { mfHead: a[2], mfPhase: a[3], mfT: a[4], mfFlash: a[5] });
      else if (k === 'locksmith') t.key = a[2] || null;
      else Object.assign(t, { mfDaze: a[2], mfLv: a[3] });
    }
  },
});

// ------------------------------------------------------------------ hooks into the game (after maze.js and maze2.js)
const mfUpdateEnemy = Stage.prototype.updateEnemy;
(P => {
  const setup = P.setupMaze;
  P.setupMaze = function (mz) {
    setup.call(this, mz);
    this.mfLay = mz;   // the layout: the start and every cell's distance from it
    this.mfShake = 0;
    this.mfSetup();
  };

  // ? blocks are made out of brick after the maze is laid out (secrets.js): a crawler whose wall became one moves on
  const secrets = P.setupSecrets;
  P.setupSecrets = function (opts) {
    secrets.call(this, opts);
    if (!this.maze) return;
    this.mfSpotC = null; this.mfLinkC = null;   // the walls changed (in the same frame)
    for (const t of this.mfFoes('crawler')) {
      if (!t.mfHid || this.mfAllBrick(t.x, t.y)) continue;
      const sp = this.mfSpots().find(([x, y]) => Math.abs(x - t.x) + Math.abs(y - t.y) < 240 && Math.abs(x - this.maze.sx) + Math.abs(y - this.maze.sy) > 200
        && !this.tanks.some(o => o !== t && o.alive && overlap(o.x, o.y, 16, 16, x - 8, y - 8, 32, 32)));
      if (sp) [t.x, t.y] = sp;
      else { t.alive = false; this.total--; }
    }
    this.tanks = this.tanks.filter(t => t.alive);
  };

  // the maze's reinforcements don't count the sentries and the rest against how many may be out at once
  const upMaze = P.updateMaze;
  P.updateMaze = function () {
    const n = this.tanks.filter(t => t.alive && isMf(t)).length;
    this.maxEnemies += n;
    try { upMaze.call(this); } finally { this.maxEnemies -= n; }
  };

  const specials = P.updateSpecials;
  P.updateSpecials = function () {
    specials.call(this);
    if (this.maze) this.mfFrame();
  };

  P.updateEnemy = function (t) {
    switch (mfKind(t)) {
      case 'minotaur': this.mfMinotaur(t); break;
      case 'sentry': this.mfSentry(t); break;
      case 'crawler': this.mfCrawler(t); break;
      case 'locksmith': this.mfLocksmith(t); break;
      case 'mirror': this.mfMirror(t); break;
      default: mfUpdateEnemy.call(this, t);
    }
  };

  // a crawler heads for its wall, a locksmith with a key runs
  const choose = P.aiChoose;
  P.aiChoose = function (t, blocked) {
    if (t.mfGo) { this.followField(t, this.mfFieldTo(t, t.mfGo), blocked); return; }
    if (t.mfFlee) { this.mfFleeChoose(t, blocked); return; }
    // a crawler out hunting takes the usual routes (the ones the other hunters share), brick or no brick
    if (mfKind(t) === 'crawler') { t.slither = false; choose.call(this, t, blocked); t.slither = true; return; }
    choose.call(this, t, blocked);
  };

  const hit = P.hitEnemy;
  P.hitEnemy = function (t, by, blast) {
    const k = mfKind(t);
    if (k === 'minotaur') {
      if (t.mfDormant) this.mfWake(t);
      if (t.mfDaze > 0 && t.hp > 1 && t.shield <= 0) t.hp--;   // reeling: double damage
    }
    if (k === 'crawler' && t.mfHid) this.mfBurst(t);   // a blast in its wall: out it comes
    hit.call(this, t, by, blast);
    if (!t.alive) return;
    if (k === 'mirror') t.mfDaze = 45;
    if (k === 'crawler' && !t.mfGo) t.mfOut = Math.min(t.mfOut || 0, 40);   // hurt: back to a wall soon
  };

  const kill = P.killEnemy;
  P.killEnemy = function (t, by, award, silent) {
    // a grenade or Claude's bite only wounds the minotaur (the maze escaped, or the game over: it goes with the rest)
    if (t.alive && t.minotaur && silent && !(this.maze && this.maze.escaped) && !this.over && t.hp > 4) {
      if (this.frame - (t.mfBit || -99) < 30) return;   // one bite at a time
      t.mfBit = this.frame;
      t.hp -= 4; t.reveal = 90;
      if (t.mfDormant) this.mfWake(t);
      Sound.play('armor');
      return;
    }
    const was = t.alive;
    kill.call(this, t, by, award, silent);
    if (!was || t.alive || !isMf(t)) return;
    if (t.minotaur) this.mfSlain(t, by, award);
    if (t.key) this.mfDropKey(t);
  };

  // the mirror watches when you fire (the cannon or a weapon)
  const fire = P.fire;
  P.fire = function (t) {
    const ok = fire.call(this, t);
    if (ok && t.isPlayer) t.mfShot = this.frame;
    return ok;
  };
  const fireW = P.fireWeapon;
  P.fireWeapon = function (t, p, pressed, held) {
    const c = t.wcool;
    fireW.call(this, t, p, pressed, held);
    if ((pressed || held) && !(c > 1)) t.mfShot = this.frame;
  };

  // nothing shoves a sentry, the minotaur or a crawler in its wall about (autumn gusts)
  const shove = P.shove;
  P.shove = function (t, d) {
    const k = mfKind(t);
    if (k === 'sentry' || k === 'minotaur' || t.mfHid) return false;
    return shove.call(this, t, d);
  };

  // a crawler in its wall gets no arrow and no dot on the minimap
  const seen = P.enemySeen;
  P.enemySeen = function (t) { return !t.mfHid && seen.call(this, t); };

  // a destroyed player doesn't come back right under the minotaur's nose
  const back = P.mazeSpawnPoint;
  P.mazeSpawnPoint = function (p) {
    const ms = this.tanks.filter(t => t.alive && t.minotaur && !t.mfDormant), at = p.mazeBack || [this.maze.sx, this.maze.sy];
    const near = a => ms.some(m => Math.abs(m.x - a[0]) + Math.abs(m.y - a[1]) < 144);
    if (!ms.length || !near(at)) return back.call(this, p);
    // the nearest cell (along the passages from there) it isn't close to
    const W = this.maze.MW, [i0, j0] = this.mfCellOf(at[0] + 8, at[1] + 8), r = this.mfRoute(i0, j0, false);
    let best = null, bd = 1e9;
    for (let c = 0; c < r.dist.length; c++) {
      if (r.dist[c] < 0 || r.dist[c] >= bd) continue;
      const xy = mazeCellPx(c % W, Math.floor(c / W));
      if (!near(xy)) { bd = r.dist[c]; best = xy; }
    }
    return best ? this.mazeSlot(best[0], best[1], p.i) : back.call(this, p);
  };

  // the minotaur's stomps and charges shake the screen
  const cam = P.camera;
  P.camera = function () {
    const c = cam.call(this);
    if (!(this.mfShake > 0)) return c;
    const k = Math.min(3, Math.ceil(this.mfShake / 8)), f = this.frame;
    return [c[0] + ((f * 7) % 3 - 1) * k, c[1] + ((f * 5 + 1) % 3 - 1) * k];
  };

  // drawing: the foes themselves (with the tanks), their warnings over the ground, the screen's own signs
  const drawS = P.drawSeasonTank;
  P.drawSeasonTank = function (ctx, t) {
    if (mfKind(t)) { this.mfDraw(ctx, t); return true; }
    return drawS.call(this, ctx, t);
  };
  const over = P.renderSpecialsOver;
  P.renderSpecialsOver = function (ctx) {
    over.call(this, ctx);
    this.mfOver(ctx);
  };
  const arrows = P.renderEnemyArrows;
  P.renderEnemyArrows = function (ctx, camX, camY) {
    arrows.call(this, ctx, camX, camY);
    this.mfScreen(ctx, camX, camY);
  };
})(Stage.prototype);

// online: the guests' view carries what they need to draw the maze foes (net.js loads after this file)
function mfNetHook() {
  const view = Net.stageView, apply = Net.applyStage;
  Net.stageView = function (st, full) {
    const sv = view.call(this, st, full);
    sv.mf = st.mfView ? st.mfView() : null;
    return sv;
  };
  Net.applyStage = function (sv) {
    apply.call(this, sv);
    if (Game.stage) Game.stage.mfApplyView(sv.mf);
  };
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mfNetHook); else mfNetHook();
