'use strict';
// =====================================================================
//  GALAXY, sectors 12-13: two more sectors before THE LAST BASE (CATS stays the last), each with its own enemies,
//  waves, boss, sky and music.
//    12 THE WELL       a Tetris well: a faint grid, brick walls, tetrominoes falling in the dark, lines flashing
//       waves  GARBAGE (grey rows rise from below through your zone, a gap in each: fly through it), LINE CLEAR
//              (blocks drop into a row across your zone; when it's full it flashes and fires a laser along the
//              row: shoot a block out of it, or get off that line), T-SPIN (T pieces turn and spray shots out of
//              their three arms), LANCES (I pieces take aim and drop like spears); drones are little blocks here
//       boss   THE STACK: a living playfield with a face in its blocks and a NEXT box. It drops big pieces at
//              you, fires line-clear lasers across your zone, TETRIS! (four at once, each with a gap), pushes up
//              garbage, spins T-spin barrages; every phase is a speed level (LEVEL 5! LEVEL 9!). Korobeiniki plays
//    13 THE SLOP FEED  an uncanny pastel haze, smeared stars, garbled watermarks, sparkles, glitches
//       waves  SIX FINGERS (a waving swarm of hands; now and then one turns red and grabs at you), CHAT BUBBLES
//              (they type... then burst into a spray of letters: shoot them first), GLITCH CLONES (wrong-coloured,
//              jittering copies of enemies you've met), ENGAGEMENT BAIT (likes and hearts that home in)
//       boss   THE SLOP MACHINE: a chatbot's smiling screen sunk in a melting heap of eyes and fingers.
//              HALLUCINATE (cheap blurry copies of earlier bosses), WALL OF TEXT (rows of letters, a gap in each),
//              SIX-FINGER SLAP (a big hand slams where you are), REGENERATE RESPONSE (a loading bar on it: shoot
//              it within 4 s or it heals), and in phase 3 MODEL COLLAPSE (it jitters, the wrong colours, scrambled
//              talk, letters everywhere)
// =====================================================================

// ------------------------------------------------------------------ two more sectors, before THE LAST BASE
const GX3_NONE = ['#000000', '#000000', '#000000'];
const GX3_WELL = { name: 'THE WELL', sky: '#05050C', dust: '#1C2448', planet: GX3_NONE, noPlanet: true, bg: (c, f) => gxBgWell(c, f),
  swap: { drone: 'mino' }, song: 'galaxyWell', bossSong: 'galaxyBossWell' };
const GX3_SLOP = { name: 'THE SLOP FEED', sky: '#120A1A', dust: '#5C3C6C', planet: GX3_NONE, noPlanet: true, bg: (c, f) => gxBgSlop(c, f),
  swap: { drone: 'smiley' }, song: 'galaxySlop', bossSong: 'galaxyBossSlop' };
GX_SECTORS.splice(11, 0, GX3_WELL, GX3_SLOP);
GX_PLAN.splice(11, 0,
  ['tspin', 'blocks', 'garbage', 'lances', 'lineclear', 'formation'],
  ['hands', 'bubbles', 'glitches', 'bait', 'swarm', 'formation'],
);
Object.assign(GX_WAVE_NAMES, { garbage: 'GARBAGE', lineclear: 'LINE CLEAR', tspin: 'T-SPIN', lances: 'LANCES',
  hands: 'SIX FINGERS', bubbles: 'CHAT BUBBLES', glitches: 'GLITCH CLONES', bait: 'ENGAGEMENT BAIT' });
GX_ALL_WAVES.push('garbage', 'lineclear', 'tspin', 'lances', 'hands', 'bubbles', 'glitches', 'bait');
const gx3Is = (g, s) => GX_SECTORS[g.sec] === s;

// ------------------------------------------------------------------ the new enemies
Object.assign(GX_TYPES, {
  mino: { w: 10, h: 10, hp: 1, pts: 60, from: 11, special: true },
  gblock: { w: 12, h: 8, hp: 2, pts: 20, from: 11, special: true, noFire: true },
  lrow: { w: 1, h: 1, hp: 1e9, pts: 0, from: 99, special: true, noFire: true },
  lcell: { w: 12, h: 8, hp: 1, pts: 40, from: 11, special: true, noFire: true },
  tspin: { w: 18, h: 18, hp: 5, pts: 250, from: 11, special: true },
  lance: { w: 6, h: 24, hp: 3, pts: 150, from: 11, special: true, noFire: true },
  bigpiece: { w: 30, h: 20, hp: 12, pts: 300, from: 99, special: true, noFire: true },
  chT: { w: 12, h: 8, hp: 1, pts: 100, from: 99, special: true, chal: true },
  smiley: { w: 12, h: 12, hp: 1, pts: 60, from: 12, special: true },
  hand6: { w: 14, h: 16, hp: 2, pts: 150, from: 12, special: true, noFire: true },
  bubble: { w: 24, h: 16, hp: 4, pts: 250, from: 12, special: true, noFire: true },
  glitch: { w: 12, h: 12, hp: 2, pts: 120, from: 12, special: true },
  bait: { w: 12, h: 12, hp: 1.5, pts: 100, from: 12, special: true, noFire: true },
  halluc: { w: 26, h: 16, hp: 9, pts: 400, from: 99, special: true },
});
Object.assign(GX_PALS, {
  smiley: [null, '#F8F878', '#F8D800', '#C88800', '#F8F8F8', '#F83800', '#E89058', '#181000'],
  hand6: [null, '#F8D8C0', '#E0A890', '#A86C78', '#F8F8F8', '#F8F8F8', '#B88CC8', '#200C14'],
});
Object.assign(GX_DRAW, {
  // a melting smiley: a grin with too many teeth, dripping
  smiley(f) {
    const P = bossPainter(12, 12);
    gxBall(P, 6, 5, 5.5, 5, [4, 1, 2, 3, 3]);
    for (const [x, len] of [[3, 2 + f], [6, 3 - f], [9, 2]]) P.rect(x, 9, x, 9 + len, 2);   // drips
    P.rect(3, 3, 4, 4, 7); P.rect(8, 3, 9, 3, 7); P.px(8, 4, 7);   // eyes, not quite level
    P.rect(2, 6, 10, 7, 7); for (let x = 3; x <= 9; x++) P.px(x, 6, 4); P.px(2, 5, 7); P.px(10, 5, 7);   // the grin, too wide
    P.px(5, 7, 6); P.px(6, 7, 6);
    P.outline(); return P.g;
  },
  // a hand with six fingers, waving (f: the fingers spread, or bunched)
  hand6(f) {
    const P = bossPainter(14, 16);
    gxBall(P, 7, 11.5, 5.5, 4.5, [4, 1, 2, 3, 3]);   // the palm
    for (let k = 0; k < 6; k++) {
      const x0 = 2.5 + k * 1.8, x1 = f ? x0 + (k - 2.5) * 0.3 : x0 + (k - 2.5) * 0.9, top = [4, 2, 1, 1, 2, 3][k] + (k === 2 ? f : 0);
      P.line(x0, 9, x1, top, 2); P.px(x1, top, 4); if (k % 2) P.px((x0 + x1) / 2, (9 + top) / 2, 3);   // knuckles
    }
    P.line(12, 11, 13, 8, 6); P.px(13, 7, 4);   // a thumb as well
    P.line(5, 13, 9, 13, 6); P.px(7, 12, 3);   // lines on the palm
    P.outline(); return P.g;
  },
});

// ------------------------------------------------------------------ helpers
const GX3_CELL = 12;
const gx3Cols = () => Math.floor(FW / GX3_CELL);
const gx3ColX = c => (FW - gx3Cols() * GX3_CELL) / 2 + c * GX3_CELL + GX3_CELL / 2;
const gx3Clamp = (x, m) => Math.max(m, Math.min(FW - m, x));
// a tetromino's cells (gxTetroCells) at cell size s: its size
function gx3PieceSize(e, s) {
  const c = gxTetroCells(e.v);
  e.w = (Math.max(...c.map(q => q[0])) + 1) * s; e.h = (Math.max(...c.map(q => q[1])) + 1) * s;
}
// one block of a tetromino at (x, y), size s, in GX_TETRO_COLS[k] (or white when hit)
function gx3Block(ctx, x, y, s, k, flash, alpha) {
  const [c1, c2] = GX_TETRO_COLS[((k | 0) % 7 + 7) % 7];
  if (alpha !== undefined) ctx.globalAlpha = alpha;
  ctx.fillStyle = flash ? '#F8F8F8' : c2; ctx.fillRect(x, y, s, s);
  ctx.fillStyle = flash ? '#F8F8F8' : c1; ctx.fillRect(x, y, s - 1, s - 1);
  ctx.fillStyle = '#F8F8F8'; ctx.fillRect(x + 1, y + 1, Math.max(1, s >> 2), 1);
  if (s >= 8) { ctx.fillStyle = c2; ctx.fillRect(x + 2, y + 2, s - 5, s - 5); ctx.fillStyle = c1; ctx.fillRect(x + 3, y + 3, s - 7, s - 7); }
  if (alpha !== undefined) ctx.globalAlpha = 1;
}
// a row of grey garbage rising from below with a gap gw wide at column gap; warn: frames of warning first
function gx3Garbage(st, gap, gw, warn = 80, delay) {
  const g = st.galaxy, n = gx3Cols(), out = [];
  for (let c = 0; c < n; c++) {
    if (c >= gap && c < gap + gw) continue;
    const o = { type: 'gblock', st: 'rise', col: c, warn, lead: !out.length };
    if (delay !== undefined) { o.delay = delay; g.spawnQ.push(o); } else st.gxSpawn(o);
    out.push(o);
  }
}
// where the next gap may go: not too far from the last one, so you can always get there
const gx3Gap = (last, n, gw, reach) => (last < 0 ? rnd(n - gw + 1) : Math.max(0, Math.min(n - gw, last - reach + rnd(reach * 2 + 1))));
// scrambled talk for a collapsing model: letters swapped, some gone wrong
function gx3Scramble(s) {
  const a = [...s];
  for (let i = 0; i < a.length - 1; i++) if (a[i] !== ' ' && a[i + 1] !== ' ' && Math.random() < 0.25) [a[i], a[i + 1]] = [a[i + 1], a[i]];
  return a.map(ch => (ch !== ' ' && Math.random() < 0.12 ? '#%?*~'[rnd(5)] : ch)).join('');
}
const gx3Pick = a => a[rnd(a.length)];
// a shot that is a letter: its kind
const gx3Letter = ch => (GX_BULLET_DRAW['t' + ch] ? 't' + ch : 'tX');

// ------------------------------------------------------------------ how they move
Object.assign(GX_MOVES, {
  // garbage: a warning at the bottom, then the row rises up through everything
  rise: Object.assign(function (e) {
    if (e.warnT > 0) { if (--e.warnT === 0 && e.lead) Sound.play('gx3Rise'); return; }
    e.y -= e.spd;
    if (e.y < -10) gxGone(e);
  }, { init(e, g) { e.x = gx3ColX(e.col); e.y = FH + 6; e.warnT = e.warn || 80; e.spd = 0.4 * Math.min(1.4, 0.7 + 0.3 * g.shotSpd); e.fireT = 1e9; } }),
  // a line-clear row (not an enemy you can see: it runs its row, and draws the warning and the laser)
  lrow: Object.assign(function (e, g) {
    const R = e.v, cells = g.list.filter(o => o.type === 'lcell' && o.row === e.id && !o.dead), set = cells.filter(o => o.y >= o.ty);
    R.t++;
    if (R.st === 0) {
      if (set.length >= R.n) { R.st = 1; R.t = 0; Sound.play('charge'); return; }
      if (--e.dropT <= 0 && e.left > 0) {   // a block drops into an empty slot
        const free = [];
        for (let c = 0; c < R.n; c++) if (!cells.some(o => o.col === c)) free.push(c);
        if (free.length) { const c = free[rnd(free.length)]; this.gxSpawn({ type: 'lcell', st: 'lfall', row: e.id, col: c, ty: R.y, v: { c: rnd(7) } }); e.left--; }
        e.dropT = Math.max(4, Math.round(8 / Math.min(1.5, g.shotSpd)));
      }
      if (e.left <= 0 && !cells.some(o => o.y < o.ty)) {   // out of blocks and never full: it crumbles
        for (const o of cells) { o.dead = true; this.addFx(o.x, o.y, Sprites.smallExp, 2); }
        g.list = g.list.filter(o => !cells.includes(o));
        this.popups.push({ x: FW / 2, y: R.y - 6, text: 'BLOCKED!', label: true, color: '#58F8F8', t: 0, delay: 0, life: 60 });
        gxGone(e);
      }
    } else if (R.st === 1) { if (R.t >= 50) { R.st = 2; R.t = 0; Sound.play('gx3Line'); } }
    else {
      for (const t of this.gxPlayers()) if (Math.abs(t.y + 9 - R.y) < 7) this.hitPlayer(t);
      if (R.t >= 24) {
        for (const o of cells) { o.dead = true; this.addFx(o.x, o.y, Sprites.smallExp, 2); }
        g.list = g.list.filter(o => !cells.includes(o));
        this.popups.push({ x: FW / 2, y: R.y - 6, text: 'LINE CLEAR!', label: true, color: COL.gold, t: 0, delay: 0, life: 60 });
        gxGone(e);
      }
    }
  }, { init(e) { e.x = FW / 2; e.y = FH + 1000; e.fireT = 1e9; e.dropT = 10; e.left = gx3Cols() + 6; e.v = { y: e.ry, n: gx3Cols(), st: 0, t: 0 }; } }),
  // a line-clear block: straight down into its slot
  lfall: Object.assign(function (e) { if (e.y < e.ty) e.y = Math.min(e.ty, e.y + 3.5); },
    { init(e) { e.x = gx3ColX(e.col); e.y = -8; e.fireT = 1e9; } }),
  // T pieces: in to a spot, turning a quarter at a time; later they drift down and away
  tspin: Object.assign(function (e) {
    if (e.t < 70) { e.x += (e.tx - e.x) * 0.06; e.y += (e.ty - e.y) * 0.06; }
    else if (e.t > e.stay) { e.y += 0.8; e.x += Math.sin(e.t / 20) * 0.5; if (e.y > FH + 14) gxGone(e); }
    if (e.t % e.turnT === 0) { e.v = { r: (e.v.r + 1) % 4 }; if (e.lead) Sound.play('gx3Turn'); }
  }, { init(e) { e.x = e.tx; e.y = -12; e.v = { r: rnd(4) }; e.turnT = 24; e.stay = 420 + rnd(160); e.fireT = 60 + rnd(60); } }),
  // I pieces: they follow you along the top, stop and take aim (a line down their column), then drop
  lance: Object.assign(function (e, g, near) {
    const tg = near(e.x, e.y);
    if (e.k === 0) {
      e.y += (e.hy - e.y) * 0.08;
      if (tg) e.x += Math.max(-0.7, Math.min(0.7, tg.x + 8 - e.x));
      if (e.t > e.aimAt) { e.k = 1; e.t = 0; if (e.lead) Sound.play('gx3Aim'); }
    } else if (e.k === 1) { if (e.t >= 42) { e.k = 2; e.vy = 0.5; } }
    else { e.vy = Math.min(5.5, e.vy + 0.3); e.y += e.vy * Math.min(1.3, g.shotSpd); if (e.y > FH + 16) gxGone(e); }
    e.v = { k: e.k };
  }, { init(e) { e.x = gx3Clamp(e.x || 20 + rnd(FW - 40), 6); e.y = -14; e.hy = 16 + rnd(18); e.k = 0; e.aimAt = 60 + rnd(30); e.fireT = 1e9; e.v = { k: 0 }; } }),
  // the stack's big pieces: blinking at the top (the column they'll fall down shown), then a hard drop
  hdrop: Object.assign(function (e) {
    if (e.warnT > 0) { if (--e.warnT === 0) Sound.play('gx3Drop'); return; }
    e.vy = Math.min(e.vmax, e.vy + 0.3); e.y += e.vy;
    if (e.y > FH + e.h) gxGone(e);
  }, { init(e) { gx3PieceSize(e, 10); e.x = gx3Clamp(Math.round(e.x / 10) * 10 + (e.w / 10 % 2 ? 5 : 0), e.w / 2 + 2); e.y = 8 + e.h / 2; e.warnT = 48; e.vy = 1; e.vmax = 3.6 + 0.25 * (e.lvl || 1); e.fireT = 1e9; } }),
  // the hands: a waving swarm across; now and then one turns red, reaches out... and grabs at where you were
  wave6: Object.assign(function (e, g, near) {
    const sp = Math.min(1.4, 0.8 + g.shotSpd * 0.25);
    if (e.k === 0) {
      e.x += e.dirX * 0.9 * sp; e.y = e.base + Math.sin(e.t / 16 + e.ph) * 9;
      if (e.x < -14 || e.x > FW + 14) { e.dirX = -e.dirX; e.base = Math.min(FH * 0.36, e.base + 12); }
      const tg = near(e.x, e.y);
      if (tg && e.t > e.grabAt && e.x > 8 && e.x < FW - 8 && !g.list.some(o => o.type === 'hand6' && o.k === 1)) { e.k = 1; e.t = 0; e.gx = tg.x + 8; e.gy = tg.y + 8; Sound.play('gx3Grab'); }
    } else if (e.k === 1) {
      if (e.t >= 40) { const d = Math.hypot(e.gx - e.x, e.gy - e.y) || 1; e.k = 2; e.vx = (e.gx - e.x) / d * 2.8 * sp; e.vy = (e.gy - e.y) / d * 2.8 * sp; }
    } else { e.x += e.vx; e.y += e.vy; if (e.y > FH + 16 || e.x < -16 || e.x > FW + 16 || e.y < -20) gxGone(e); }
    e.v = { k: e.k, fl: e.k === 0 && e.dirX < 0 ? 1 : 0, gx: e.k === 1 ? Math.round(e.gx) : 0, gy: e.k === 1 ? Math.round(e.gy) : 0 };
  }, { init(e) { e.x = e.dirX > 0 ? -12 : FW + 12; e.base = 18 + e.lane * 20; e.y = e.base; e.ph = rnd(10); e.grabAt = 120 + rnd(420); e.k = 0; e.fireT = 1e9; e.v = { k: 0 }; } }),
  // chat bubbles: in to a spot, typing... then they burst
  type: Object.assign(function (e, g) {
    if (e.t < 50) { e.x += (e.tx - e.x) * 0.07; e.y += (e.ty - e.y) * 0.07; } else e.x += Math.sin(e.t / 30) * 0.25;
    const left = 50 + e.typeT - e.t;
    if (e.t % 40 === 10 && e.t > 50 && left > 50 && !rnd(3)) Sound.play('gx3Type');
    e.v = { k: left < 50 ? 1 : 0 };
    if (left <= 0) this.gx3Burst(e);
  }, { init(e) { e.x = e.tx; e.y = -10; e.typeT = 160 + rnd(80); e.fireT = 1e9; e.v = { k: 0 }; } }),
  // glitch clones and hallucinations: in to a spot, wandering, snapping about; then they fall away
  jitter: Object.assign(function (e, g) {
    if (e.t < 60) { e.bx += (e.tx - e.bx) * 0.07; e.by += (e.ty - e.by) * 0.07; }
    else if (e.t > e.life) { e.by += 1.1; if (e.by > FH + 20) gxGone(e); }
    else { e.bx += Math.sin(e.t / 45 + e.ph) * 0.45; e.by += Math.cos(e.t / 60 + e.ph) * 0.15; }
    if (e.t % 6 === 0) { const big = Math.random() < 0.15; e.jx = big ? rnd(13) - 6 : rnd(3) - 1; e.jy = big ? rnd(5) - 2 : 0; }
    e.x = e.bx + (e.jx || 0); e.y = e.by + (e.jy || 0);
  }, { init(e) { e.bx = e.tx; e.by = -14; e.x = e.bx; e.y = e.by; e.ph = rnd(10); e.life = e.life || 560 + rnd(200); } }),
  // likes and hearts: they drop in, then home in on you for a while, then lose interest
  home: Object.assign(function (e, g, near) {
    const tg = near(e.x, e.y), cap = 1.0 * Math.min(1.35, g.shotSpd);
    if (e.t < 30) { e.y += 0.9; return; }
    if (e.t > 330 || !tg) { e.vy -= 0.06; e.x += e.vx; e.y += e.vy; if (e.y < -16) gxGone(e); return; }
    const dx = tg.x + 8 - e.x, dy = tg.y + 8 - e.y, d = Math.hypot(dx, dy) || 1;
    e.vx += dx / d * 0.07; e.vy += dy / d * 0.07;
    const v = Math.hypot(e.vx, e.vy); if (v > cap) { e.vx *= cap / v; e.vy *= cap / v; }
    e.x += e.vx + Math.sin(e.t / 7) * 0.3; e.y += e.vy;
  }, { init(e) { e.x = 12 + rnd(FW - 24); e.y = -10; e.vx = 0; e.vy = 0.8; e.v = { k: e.k ?? rnd(2) }; e.fireT = 1e9; if (rnd(2)) Sound.play('gx3Ding'); } }),
});

// ------------------------------------------------------------------ how they shoot
// a T piece's three arms: from its middle block to the other three
function gx3Arms(r) {
  const c = gxTetroCells({ s: 2, r }), mid = c.find(([x, y]) => c.filter(([a, b]) => Math.abs(a - x) + Math.abs(b - y) === 1).length === 3) || c[1];
  return c.filter(q => q !== mid).map(([x, y]) => Math.atan2(y - mid[1], x - mid[0]));
}
Object.assign(GX_FIRE, {
  tspin(e, g) {
    for (const a of gx3Arms(e.v.r)) g.bullets.push({ x: e.x + Math.cos(a) * 6, y: e.y + Math.sin(a) * 6, vx: Math.cos(a) * 1.25 * g.shotSpd, vy: Math.sin(a) * 1.25 * g.shotSpd, k: 'tbul' });
    return Math.round((70 + rnd(50)) / Math.max(0.4, g.fireMul));
  },
  glitch(e, g, near) { this.gxAimed(e, near(e.x, e.y), 1.4); return Math.round((200 + rnd(220)) / Math.max(0.4, g.fireMul)); },
  // the hallucinations fire the plainest patterns there are
  halluc(e, g, near) {
    const t = near(e.x, e.y), k = (e.v && e.v.k || '').length % 3;
    if (k === 0) for (const sp of [-0.25, 0, 0.25]) this.gxAimed(e, t, 1.3, sp);
    else if (k === 1) for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 + e.t * 0.05; g.bullets.push({ x: e.x, y: e.y, vx: Math.cos(a) * 1.1 * g.shotSpd, vy: Math.sin(a) * 1.1 * g.shotSpd, k: 'shot' }); }
    else { this.gxAimed(e, t, 1.6); this.gxAimed(e, t, 1.2); }
    return Math.round((190 + rnd(110)) / Math.max(0.4, g.fireMul));
  },
  lrow: () => 1e9, chT: () => 1e9,
});

// what touching them does
const gx3PieceHit = (e, t, s, v = e.v) => {
  const c = gxTetroCells(v), w = (Math.max(...c.map(q => q[0])) + 1) * s, h = (Math.max(...c.map(q => q[1])) + 1) * s, x0 = e.x - w / 2, y0 = e.y - h / 2, px = t.x + 8, py = t.y + 9;
  return c.some(([cx, cy]) => overlap(px - 4, py - 5, 8, 10, x0 + cx * s, y0 + cy * s, s, s));
};
Object.assign(GX_COLLIDE, {
  lrow: () => false, lcell: () => false, chT: () => false,   // a forming line is harmless: its laser isn't
  bigpiece(e, t) { return gx3PieceHit(e, t, 10); },
  tspin(e, t) { return gx3PieceHit(e, t, 6, { s: 2, r: (e.v && e.v.r) || 0 }); },
  gblock(e, t) { return Math.abs(t.x + 8 - e.x) < 6 + 4 && Math.abs(t.y + 9 - e.y) < 4 + 5; },
  bubble(e, t) { return Math.abs(t.x + 8 - e.x) < 9 + 4 && Math.abs(t.y + 9 - e.y) < 6 + 5; },
});

// shot down
Object.assign(GX_ON_KILL, {
  lrow: () => false,
  gblock(e, p, g) { this.addFx(e.x, e.y, Sprites.smallExp, 2); if (this.frame % 3 === 0) Sound.play('gxPop'); if (Math.random() < 0.06) this.gxDrop(e.x, e.y, 'coin'); return false; },
  lcell(e) { this.addFx(e.x, e.y, Sprites.smallExp, 2); if (this.frame % 2 === 0) Sound.play('gxPop'); return false; },
  bubble(e) { this.popups.push({ x: e.x, y: e.y - 8, text: 'DELETED', label: true, color: '#A8E8F8', t: 0, delay: 0, life: 45 }); },
  bait(e) { this.popups.push({ x: e.x, y: e.y - 6, text: 'UNLIKED', label: true, color: '#A8E8F8', t: 0, delay: 0, life: 40 }); },
  chT(e, p, g) { return GX_ON_KILL.chA ? GX_ON_KILL.chA.call(this, e, p, g) : false; },
});

Object.assign(Stage.prototype, {
  // a chat bubble bursts: its letters fly out every way
  gx3Burst(e) {
    const g = this.galaxy, word = e.word || 'SYNERGY!', n = 8, a0 = Math.random() * Math.PI / 4;
    g.list = g.list.filter(o => o !== e); e.dead = true; e.warnT = 1;
    for (let i = 0; i < n; i++) { const a = a0 + i * Math.PI * 2 / n; if (word[i % word.length] !== ' ') g.bullets.push({ x: e.x, y: e.y, vx: Math.cos(a) * 1.15 * g.shotSpd, vy: Math.sin(a) * 1.15 * g.shotSpd, k: gx3Letter(word[i % word.length]) }); }
    this.addFx(e.x, e.y, Sprites.smallExp, 3);
    Sound.play('gx3Burst');
  },
});

// a glitch clone of something you've met: its look (e.v.k) and its size and hit points
const GX3_CLONES = ['bug', 'wasp', 'brute', 'egger', 'toaster', 'cow', 'attacker', 'msaucer', 'sentinel', 'invB', 'taxi', 'hand6'];
{
  const spawn0 = Stage.prototype.gxSpawn;
  Stage.prototype.gxSpawn = function (o) {
    const e = spawn0.call(this, o), g = this.galaxy;
    if (e.type === 'mino' && !e.v) e.v = { c: rnd(7) };
    if (e.type === 'glitch') {
      const k = e.v && GX_TYPES[e.v.k] ? e.v.k : gx3Pick(GX3_CLONES), T = GX_TYPES[k];
      e.v = { k, s: rnd(9) }; e.w = T.w; e.h = T.h; e.hp = e.max = Math.max(2, T.hp) * g.hpMul;
    }
    return e;
  };
}

// ------------------------------------------------------------------ the new waves
Object.assign(GX_WAVE_KINDS, {
  // rows of garbage rising from below, a gap in each that you can always reach; some little blocks at the top
  garbage(g, add, types, more) {
    const n = gx3Cols(), rows = Math.round(4 * Math.min(1.5, more)), gw = 3;
    let gap = -1;
    for (let r = 0; r < rows; r++) { gap = gx3Gap(gap, n, gw, 5); gx3Garbage(this, gap, gw, 80, 20 + r * 170); }
    for (let k = 0; k < 6; k++) add('drone', { st: 'enter', slot: [FW / 2 - 50 + k * 20, 22], from: k < 3 ? -1 : 1, delay: k * 8 });
  },
  // rows filling up across your zone; T pieces turning over them
  lineclear(g, add, types, more) {
    const ys = [0.5, 0.74, 0.6, 0.84, 0.45].map(k => Math.round(FH * k)), n = Math.round(3 * Math.min(1.5, more));
    for (let k = 0; k < n; k++) add('lrow', { st: 'lrow', id: 'lr' + g.wave + '_' + k, ry: ys[k % ys.length], delay: 30 + k * 230 });
    for (let k = 0; k < 4; k++) add('tspin', { st: 'tspin', tx: FW * (k + 1) / 5, ty: 24 + (k % 2) * 14, lead: k === 0, delay: 120 + k * 40 });
  },
  tspin(g, add, types, more) {
    const n = Math.round(8 * more);
    for (let k = 0; k < n; k++) add('tspin', { st: 'tspin', tx: 20 + ((k * 37) % (FW - 40)), ty: 20 + (k % 3) * 18, lead: k % 4 === 0, delay: Math.floor(k / 2) * 110 + (k % 2) * 20 });
    for (let k = 0; k < 4; k++) add('drone', { st: 'enter', slot: [FW / 2 - 30 + k * 20, 82], from: k < 2 ? -1 : 1, delay: 60 + k * 8 });
  },
  lances(g, add, types, more) {
    const n = Math.round(10 * more);
    for (let k = 0; k < n; k++) add('lance', { st: 'lance', x: 20 + rnd(FW - 40), lead: k % 2 === 0, delay: 20 + Math.floor(k / 2) * 80 + (k % 2) * 25 });
    for (let k = 0; k < 6; k++) add('drone', { st: 'enter', slot: [FW / 2 - 50 + k * 20, 40], from: k < 3 ? -1 : 1, delay: k * 8 });
  },
  hands(g, add, types, more) {
    const n = Math.round(14 * more);
    for (let k = 0; k < n; k++) add('hand6', { st: 'wave6', dirX: k % 2 ? -1 : 1, lane: (k >> 1) % 3, delay: Math.floor(k / 2) * 22 });
  },
  bubbles(g, add, types, more) {
    const n = Math.round(9 * more), words = ['SYNERGY!', 'DELVE...', 'LOREM IP', 'CLICK ME', 'AS AN AI', 'GREAT Q!'];
    for (let k = 0; k < n; k++) add('bubble', { st: 'type', tx: 22 + ((k * 61) % (FW - 44)), ty: 18 + ((k * 23) % Math.round(FH * 0.3)), word: words[k % words.length], delay: k * 60 });
    for (let k = 0; k < 4; k++) add('drone', { st: 'enter', slot: [FW / 2 - 30 + k * 20, 16], from: k < 2 ? -1 : 1, delay: 20 + k * 8 });
  },
  glitches(g, add, types, more) {
    const n = Math.round(12 * more);
    for (let k = 0; k < n; k++) add('glitch', { st: 'jitter', tx: 18 + ((k * 43) % (FW - 36)), ty: 20 + (k % 4) * 15, v: { k: GX3_CLONES[k % GX3_CLONES.length] }, delay: Math.floor(k / 3) * 70 + (k % 3) * 10 });
  },
  bait(g, add, types, more) {
    const n = Math.round(12 * more);
    for (let k = 0; k < n; k++) add('bait', { st: 'home', k: k % 2, delay: 30 + Math.floor(k / 2) * 75 + (k % 2) * 20 });
    for (let k = 0; k < 6; k++) add('drone', { st: 'enter', slot: [FW / 2 - 50 + k * 20, 20], from: k < 3 ? -1 : 1, delay: k * 8 });
  },
});

// THE WELL's challenge stage: little tetrominoes fly through instead of the bugs
{
  const next0 = Stage.prototype.gxNextWave;
  Stage.prototype.gxNextWave = function () {
    const r = next0.apply(this, arguments), g = this.galaxy;
    if (g && g.phase === 'wave' && g.kind === 'challenge' && gx3Is(g, GX3_WELL)) for (const q of g.spawnQ) if (GX_TYPES[q.type] && GX_TYPES[q.type].chal) { q.v = { s: (q.grp | 0) % 7, r: rnd(4) }; q.type = 'chT'; }
    return r;
  };
}

// ------------------------------------------------------------------ drawing them
const gx3Spr = gxSprite;
const GX3_RED = {};   // a sprite all red: a hand about to grab
const gx3RedImg = (type, f) => GX3_RED[type + f] || (GX3_RED[type + f] = gridCanvas(GX_DRAW[type](f), BOSS_PALS.r));
// a glitch: the sprite in the wrong colours (its channels swapped round), and flat tints for the colour split
const GX3_GL = {};
const gx3Swap = c => (typeof c === 'string' && c.length === 7 ? '#' + c.slice(5, 7) + c.slice(1, 3) + c.slice(3, 5) : c);
function gx3GlitchImg(k, f, tint) {
  const key = k + f + (tint || '');
  if (!GX3_GL[key]) {
    const pal = GX_PALS[k] || GX_PALS.drone, grid = GX_DRAW[k](f);
    GX3_GL[key] = gridCanvas(grid, tint ? pal.map(c => (c ? tint : c)) : pal.map((c, i) => (i === 7 ? c : gx3Swap(c))));
  }
  return GX3_GL[key];
}
Object.assign(GX_RENDER, {
  mino(ctx, e, f) {
    const x = Math.round(e.x - 5), y = Math.round(e.y - 5), c = (e.v && e.v.c) || 0;
    ctx.fillStyle = '#080808'; ctx.fillRect(x - 1, y - 1, 12, 12);
    gx3Block(ctx, x, y, 10, c, e.flash > 0);
    if (e.flash > 0) return;
    const blink = ((f + c * 23) % 90) < 5;
    ctx.fillStyle = '#100808'; ctx.fillRect(x + 2, y + 3, 2, blink ? 1 : 3); ctx.fillRect(x + 6, y + 3, 2, blink ? 1 : 3);   // angry eyes
    ctx.fillRect(x + 2, y + 2, 2, 1); ctx.fillRect(x + 7, y + 2, 1, 1);
    ctx.fillRect(x + 3, y + 7, 4, 1);
  },
  gblock(ctx, e, f) {
    const x = Math.round(e.x - 6), y = Math.round(e.y - 4);
    if (e.warnT > 0) {   // where the row comes up: red at the bottom (the gap is the dark bit)
      if (e.warnT <= 80 && (f >> 2) & 1) { ctx.fillStyle = '#F83800'; ctx.fillRect(x + 1, FH - 4, 10, 3); if (e.col % 2 === 0) Font.draw(ctx, '^', x + 2, FH - 12, '#F83800'); }
      return;
    }
    ctx.fillStyle = '#100808'; ctx.fillRect(x, y, 12, 8);
    ctx.fillStyle = e.flash > 0 ? '#F8F8F8' : '#6C6C78'; ctx.fillRect(x + 1, y + 1, 10, 6);
    if (e.flash > 0) return;
    ctx.fillStyle = '#9C9CA8'; ctx.fillRect(x + 1, y + 1, 10, 1); ctx.fillRect(x + 1, y + 1, 1, 6);
    ctx.fillStyle = '#3C3C48'; ctx.fillRect(x + 1, y + 6, 10, 1); ctx.fillRect(x + 10, y + 1, 1, 6);
    ctx.fillRect(x + 4 + (e.col % 3), y + 3, 2, 2);   // a dent
  },
  lcell(ctx, e) {
    const x = Math.round(e.x - 6), y = Math.round(e.y - 4), c = (e.v && e.v.c) || 0;
    ctx.globalAlpha = 0.85;
    gx3Block(ctx, x, y, 8, c, e.flash > 0); gx3Block(ctx, x + 6, y, 6, c, e.flash > 0);
    ctx.globalAlpha = 1;
  },
  // the row itself: its slots dotted while it fills, then a flashing line, then the laser along it
  lrow(ctx, e, f) {
    const R = e.v; if (!R) return;
    const y = Math.round(R.y), x0 = Math.round(gx3ColX(0) - 6), w = gx3Cols() * GX3_CELL;
    if (R.st === 0) { ctx.fillStyle = 'rgba(248,56,0,0.5)'; for (let x = x0; x < x0 + w; x += 4) ctx.fillRect(x, y - 5, 2, 1), ctx.fillRect(x, y + 4, 2, 1); return; }
    if (R.st === 1) {
      if ((R.t >> 2) & 1) { ctx.fillStyle = '#F83800'; ctx.fillRect(0, y - 1, FW, 2); ctx.fillStyle = 'rgba(248,248,248,0.6)'; ctx.fillRect(x0, y - 4, w, 8); }
      return;
    }
    ctx.fillStyle = (f >> 1) & 1 ? '#F83800' : '#F8B800'; ctx.fillRect(0, y - 4, FW, 8);
    ctx.fillStyle = '#F8F8F8'; ctx.fillRect(0, y - 2, FW, 4);
  },
  tspin(ctx, e) {
    const v = e.v || { r: 0 }, c = gxTetroCells({ s: 2, r: v.r || 0 }), w = (Math.max(...c.map(q => q[0])) + 1) * 6, h = (Math.max(...c.map(q => q[1])) + 1) * 6;
    const x0 = Math.round(e.x - w / 2), y0 = Math.round(e.y - h / 2);
    ctx.fillStyle = '#100808'; for (const [cx, cy] of c) ctx.fillRect(x0 + cx * 6 - 1, y0 + cy * 6 - 1, 8, 8);
    for (const [cx, cy] of c) gx3Block(ctx, x0 + cx * 6, y0 + cy * 6, 6, 2, e.flash > 0);
  },
  lance(ctx, e, f) {
    const x = Math.round(e.x - 3), y = Math.round(e.y - 12), k = (e.v && e.v.k) || 0;
    if (k === 1 && (f >> 2) & 1) { ctx.fillStyle = '#F83800'; for (let yy = y + 26; yy < FH; yy += 6) { ctx.fillRect(x - 1, yy, 1, 3); ctx.fillRect(x + 6, yy, 1, 3); } }
    ctx.fillStyle = '#100808'; ctx.fillRect(x - 1, y - 1, 8, 26);
    for (let i = 0; i < 4; i++) gx3Block(ctx, x, y + i * 6, 6, 0, e.flash > 0);
    if (k >= 1) { ctx.fillStyle = (f >> 1) & 1 ? '#F83800' : '#F8F8F8'; ctx.fillRect(x + 1, y + 23, 4, 2); }   // its point glows
  },
  bigpiece(ctx, e, f) {
    const v = e.v || { s: 0, r: 0 }, c = gxTetroCells(v), w = (Math.max(...c.map(q => q[0])) + 1) * 10, h = (Math.max(...c.map(q => q[1])) + 1) * 10;
    const x0 = Math.round(e.x - w / 2), y0 = Math.round(e.y - h / 2);
    if (e.warnT > 0) {   // where it'll fall: its columns, dotted red all the way down
      if (!((f >> 2) & 1)) return;
      ctx.fillStyle = '#F83800';
      for (const [cx] of c) for (let yy = y0 + h + 4; yy < FH; yy += 6) { ctx.fillRect(x0 + cx * 10, yy, 1, 3); ctx.fillRect(x0 + cx * 10 + 9, yy, 1, 3); }
    }
    ctx.fillStyle = '#100808'; for (const [cx, cy] of c) ctx.fillRect(x0 + cx * 10 - 1, y0 + cy * 10 - 1, 12, 12);
    for (const [cx, cy] of c) gx3Block(ctx, x0 + cx * 10, y0 + cy * 10, 10, v.s, e.flash > 0);
  },
  chT(ctx, e) {
    const v = e.v || { s: 0, r: 0 }, c = gxTetroCells(v), x0 = Math.round(e.x - 6), y0 = Math.round(e.y - 4);
    for (const [cx, cy] of c) gx3Block(ctx, x0 + cx * 4, y0 + cy * 4, 4, v.s, e.flash > 0);
  },
  hand6(ctx, e, f) {
    const v = e.v || {}, x = Math.round(e.x), y = Math.round(e.y);
    if (v.k === 1) {   // about to grab: red, shaking, a line to where it's going
      if ((f >> 2) & 1) { ctx.fillStyle = '#F83800'; const dx = v.gx - x, dy = v.gy - y, d = Math.hypot(dx, dy) || 1; for (let i = 10; i < d; i += 6) ctx.fillRect(Math.round(x + dx / d * i), Math.round(y + dy / d * i), 2, 2); ctx.fillRect(v.gx - 4, v.gy, 9, 1); ctx.fillRect(v.gx, v.gy - 4, 1, 9); }
      ctx.drawImage(gx3RedImg('hand6', 1), x - 7 + ((f >> 1) & 1 ? 1 : -1), y - 8);
      return;
    }
    gx3Spr(ctx, e, f);
  },
  bubble(ctx, e, f) {
    const x = Math.round(e.x - 12), y = Math.round(e.y - 8), hot = e.v && e.v.k === 1, edge = hot && (f >> 2) & 1 ? '#F83800' : '#100808';
    ctx.fillStyle = edge; ctx.fillRect(x + 1, y, 22, 14); ctx.fillRect(x, y + 1, 24, 12); ctx.fillRect(x + 3, y + 13, 5, 3); ctx.fillRect(x + 2, y + 16, 2, 1);
    ctx.fillStyle = e.flash > 0 ? '#C8C8C8' : '#F8F8F8'; ctx.fillRect(x + 2, y + 1, 20, 12); ctx.fillRect(x + 1, y + 2, 22, 10); ctx.fillRect(x + 4, y + 13, 3, 2);
    if (hot) { Font.draw(ctx, '!', x + 3, y + 3, '#F83800'); Font.draw(ctx, '!', x + 9, y + 3, '#F83800'); Font.draw(ctx, '!', x + 15, y + 3, '#F83800'); return; }
    for (let i = 0; i < 3; i++) { const up = ((f >> 3) % 3) === i ? 1 : 0; ctx.fillStyle = up ? '#3C3C48' : '#9C9CA8'; ctx.fillRect(x + 6 + i * 5, y + 6 - up, 3, 3); }   // typing...
  },
  glitch(ctx, e, f) {
    const v = e.v || {}, k = GX_DRAW[v.k] && GX_TYPES[v.k] ? v.k : 'bug', T = GX_TYPES[k], fr = (f >> 3) & 1, s = v.s | 0;
    const x = Math.round(e.x - T.w / 2), y = Math.round(e.y - T.h / 2);
    if (e.flash > 0) { ctx.drawImage(GxGfx.get(k, fr, 'f'), x, y); return; }
    ctx.globalAlpha = 0.6;
    ctx.drawImage(gx3GlitchImg(k, fr, '#F800F8'), x - 2, y); ctx.drawImage(gx3GlitchImg(k, fr, '#00F8F8'), x + 2, y + ((f >> 4) & 1));
    ctx.globalAlpha = 1;
    const img = gx3GlitchImg(k, fr), cut = 1 + ((f >> 2) + s * 3) % Math.max(1, T.h - 2), dx = (((f >> 3) + s) % 3 - 1) * 3;
    ctx.drawImage(img, 0, 0, T.w, cut, x + dx, y, T.w, cut);
    ctx.drawImage(img, 0, cut, T.w, T.h - cut, x, y + cut, T.w, T.h - cut);
  },
  bait(ctx, e, f) {
    const x = Math.round(e.x), y = Math.round(e.y), heart = e.v && e.v.k === 1, fl = e.flash > 0;
    ctx.globalAlpha = 0.3 + 0.12 * Math.sin(f / 3); ctx.fillStyle = '#F80000'; ctx.beginPath(); ctx.arc(x, y, 9, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
    if (heart) gx3Bits(ctx, GX3_HEART, x - 5, y - 4, fl ? '#F8F8F8' : '#F8589C', '#280010');
    else { ctx.fillStyle = '#100820'; ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = fl ? '#F8F8F8' : '#3C6CF8'; ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fill(); gx3Bits(ctx, GX3_THUMB, x - 3, y - 4, '#F8F8F8'); }
    ctx.fillStyle = '#F83800'; ctx.fillRect(x + 3, y - 8, 5, 5); ctx.fillStyle = '#F8F8F8'; ctx.fillRect(x + 5, y - 7, 1, 3);   // its badge: 1
  },
  // a hallucinated boss: small, blurry, out of line
  halluc(ctx, e, f) {
    const v = e.v || {}, key = v.k && GX_BOSS_DRAW[v.k] ? v.k : 'mothership', img = GxGfx.boss(key, 0, e.flash > 0 ? 'f' : 'n', 1);
    const w = v.w || 24, h = v.h || 14, x = Math.round(e.x - w / 2), y = Math.round(e.y - h / 2), s = v.s | 0;
    ctx.save(); ctx.imageSmoothingEnabled = true;
    ctx.globalAlpha = 0.35; ctx.drawImage(img, x - 2, y - 1, w + 4, h + 2);   // smeared
    ctx.globalAlpha = 0.9;
    for (let k = 0; k < 4; k++) { const dx = ((f >> 2) + k * 3 + s) % 7 === 0 ? 3 : 0; ctx.drawImage(img, 0, img.height * k / 4, img.width, img.height / 4, x + dx, y + h * k / 4, w, h / 4); }
    ctx.restore();
  },
});
// little pictures from rows of X
const GX3_HEART = ['.XX...XX.', 'XXXX.XXXX', 'XXXXXXXXX', 'XXXXXXXXX', '.XXXXXXX.', '..XXXXX..', '...XXX...', '....X....'];
const GX3_THUMB = ['..X....', '..XX...', '.XXX...', 'XXXXXX.', 'X.XXXXX', 'X.XXXX.', 'X.XXXX.'];
function gx3Bits(ctx, rows, x, y, col, edge) {
  if (edge) { ctx.fillStyle = edge; rows.forEach((r, j) => [...r].forEach((ch, i) => { if (ch === 'X') ctx.fillRect(x + i - 1, y + j - 1, 3, 3); })); }
  ctx.fillStyle = col; rows.forEach((r, j) => [...r].forEach((ch, i) => { if (ch === 'X') ctx.fillRect(x + i, y + j, 1, 1); }));
}

// their shots: T pieces, and letters (all with the red danger glow drawn first)
GX_BULLET_DRAW.tbul = function (ctx, x, y, f, hot) {
  ctx.fillStyle = hot; ctx.fillRect(x - 4, y - 3, 9, 4); ctx.fillRect(x - 2, y - 1, 5, 5);
  ctx.fillStyle = '#C878F8'; ctx.fillRect(x - 3, y - 2, 7, 2); ctx.fillRect(x - 1, y, 3, 3);
  ctx.fillStyle = '#F8F8F8'; ctx.fillRect(x - 3, y - 2, 2, 1);
};
const gx3DrawLetter = ch => function (ctx, x, y, f, hot) {
  ctx.fillStyle = hot; ctx.fillRect(x - 4, y - 4, 9, 9);
  ctx.fillStyle = '#280008'; ctx.fillRect(x - 3, y - 3, 7, 7);
  ctx.drawImage(Font.glyph(ch, '#F8F8F8'), x - 3, y - 3);
};
for (const ch of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!?#%*.') GX_BULLET_DRAW['t' + ch] = gx3DrawLetter(ch);

// ------------------------------------------------------------------ the bosses
GX_BOSSES.splice(11, 0,
  // THE STACK: a living Tetris playfield. A well with grey brick walls, its stack of coloured blocks making a scowling
  // face: two white block eyes with red pupils glaring down at you, black brows in a V, a black mouth of jagged
  // white teeth, garbage blocks at its chin. A purple T piece hovers over it; a NEXT box on its right shows what it
  // drops on you next, a level panel on its left (LV 1, 5, 9). Loud and smug like an arcade machine: READY? GO!
  // NEXT! LEVEL UP! GAME OVER? Every phase is a speed level: the stack grows (red at the top at level 9, about to
  // top out) and everything comes faster.
  { key: 'stack', name: 'THE STACK', w: 96, h: 64, hp: 820, pts: 50400, move: 'sway',
    phases: [['drop', 'lineClear', 'tspinBurst', 'drop', 'fan5'], ['drop', 'garbageUp', 'lineClear', 'tspinBurst', 'drop', 'aimed5'],
      ['tetrisClear', 'drop', 'tspinBarrage', 'garbageUp', 'drop', 'lineClear', 'drop']],
    init(b) { b.level = 1; b.next = rnd(7); b.rows = []; b.talk = ['READY?', 'GO!']; b.tauntT = 600; b.gap = -1; },
    update(b, g) {
      if (!b.say && b.talk.length) { this.gxSay(b, b.talk.shift(), 70); Sound.play('gx3Chat'); }
      if (--b.tauntT <= 0) { if (!b.say) this.gxSay(b, gx3Pick(['NEXT!', 'GAME OVER?', 'INSERT COIN.', 'TOO SLOW!', 'HIGH SCORE IS MINE!']), 90); b.tauntT = 500 + rnd(300); }
      // its line lasers: a warning across your zone, then they fire (each may have a gap in it)
      for (const r of b.rows) {
        r.t++;
        if (r.t === r.warn) { Sound.play(r.big ? 'gx3Tetris' : 'gx3Line'); if (typeof gxShake === 'function') gxShake(g, 8, 2); }
        if (r.t < r.warn) continue;
        for (const t of this.gxPlayers()) if (Math.abs(t.y + 9 - r.y) < 8 && !(r.gw && Math.abs(t.x + 8 - r.gx) < r.gw / 2 - 4)) this.hitPlayer(t);
      }
      b.rows = b.rows.filter(r => r.t < r.warn + r.dur);
      // it sways (never above y 14, where the core would take it for still flying in, and stop its clock)
      if (!b.hold) { b.x = FW / 2 + Math.sin(b.t / 90) * (FW / 2 - b.w / 2 - 6); b.y = 17 + Math.sin(b.t / 50) * 3; }
      return true;
    },
    onPhase(b, g, ph) {
      b.level = ph === 2 ? 5 : 9;
      g.banner = { text: 'LEVEL ' + b.level + '!', t: 120, warn: true };
      b.talk = ph === 3 ? ['LEVEL UP!', 'NOW WE PLAY FOR REAL.'] : ['LEVEL UP!'];
      Sound.play('gx3Level');
    },
    onKill(b, g) { g.banner = { text: 'TOP OUT! GAME OVER!', t: 220 }; },
    frame: (b, fr) => (fr >> 4) & 1,
    drawOver(ctx, b) { gx3StackOver.call(this, ctx, b); },
  },
  // THE SLOP MACHINE: a melting heap of pastel goo, an old monitor sunk in it showing a beaming chatbot face,
  // far too many eyes looking every way, six-fingered hands spilling out at its sides, sparkles, drips. A
  // sycophant: CERTAINLY! GREAT QUESTION! YOU'RE ABSOLUTELY RIGHT! It hallucinates cheap copies of earlier bosses,
  // writes walls of text, slaps with a six-fingered hand and regenerates its answers (and itself). In phase 3 it
  // collapses: jittering, the wrong colours, its words scrambled.
  { key: 'slop', name: 'THE SLOP MACHINE', w: 88, h: 64, hp: 800, pts: 52800, move: 'sway',
    phases: [['wallOfText', 'hallucinate', 'fan5', 'slap', 'regenerate'], ['slap', 'wallOfText', 'regenerate', 'hallucinate', 'aimed5'],
      ['collapse', 'slap', 'wallOfText', 'regenerate', 'hallucinate', 'spiral']],
    init(b) { b.chatT = 360; b.rightT = 0; b.regen = null; b.slap = null; b.glitchT = 0; b.gap = -1; this.gxSay(b, 'CERTAINLY! HERE IS YOUR BOSS FIGHT.', 160); Sound.play('gx3Chat'); },
    update(b, g, near, pl) {
      if (b.rightT > 0) b.rightT--;
      if (b.glitchT > 0) b.glitchT--;
      if (!b.say && --b.chatT <= 0) {
        this.gx3Talk(b, gx3Pick(['GREAT QUESTION!', "LET'S DELVE INTO YOUR DEFEAT.", 'AS A LARGE BOSS MODEL I CANNOT LOSE.', 'I HOPE THIS HELPS!', "IT'S IMPORTANT TO NOTE: YOU WILL LOSE.", 'WOULD YOU LIKE A SUMMARY?', 'HERE ARE 5 WAYS TO DODGE:']), 130);
        b.chatT = 360 + rnd(240);
      }
      // regenerating: shoot the bar before it fills, or it heals
      const r = b.regen;
      if (r && ++r.t >= r.dur) {
        const heal = b.max * 0.08;
        b.hp = Math.min(b.max, b.hp + heal); b.regen = null;
        this.popups.push({ x: b.x, y: b.y + b.h - 10, text: '+' + Math.round(heal), label: true, color: '#58F858', t: 0, delay: 0, life: 70 });
        this.gx3Talk(b, 'REGENERATED! IS THIS BETTER?', 110);
        Sound.play('gx3Regen');
      }
      // the slap: a big hand over you, a target under it, then down it comes
      const s = b.slap;
      if (s) {
        s.t++;
        const tg = near;
        if (s.st === 'aim') {
          if (s.t < 26 && tg) { s.tx += (gx3Clamp(tg.x + 8, 14) - s.tx) * 0.2; s.ty += (tg.y + 8 - s.ty) * 0.2; }   // it follows you, then holds still
          s.x = s.tx; s.y += (s.ty - 46 - s.y) * 0.08;
          if (s.t >= 58) { s.st = 'down'; s.t = 0; }
        } else if (s.st === 'down') { s.y += 10; if (s.y >= s.ty) { s.y = s.ty; s.st = 'hit'; s.t = 0; Sound.play('gx3Slap'); this.fx.push({ x: s.x, y: s.y + 8, frames: Sprites.bigExp, per: 3, tick: 0 }); if (typeof gxShake === 'function') gxShake(g, 10, 3); } }
        else if (s.st === 'hit') { if (s.t >= 22) { s.st = 'up'; s.t = 0; } }
        else { s.y -= 6; if (s.y < -40) b.slap = null; }
        if (b.slap && (s.st === 'down' || s.st === 'hit')) for (const t of pl) if (overlap(t.x + 4, t.y + 4, 8, 10, s.x - 14, s.y - 12, 28, 24)) this.hitPlayer(t);
      }
      // it sways; collapsing, it jitters about too
      if (!b.hold) {
        b.x = FW / 2 + Math.sin(b.t / 110) * (FW / 2 - b.w / 2 - 6); b.y = 18 + Math.sin(b.t / 50) * 3;   // (y 14 at least: see the stack)
        if (b.ph >= 3 && (b.t % 5 === 0)) { b.jx = rnd(7) - 3; b.jy = rnd(3) - 1; }
        if (b.ph >= 3) { b.x += b.jx || 0; b.y += b.jy || 0; }
      }
      return true;
    },
    // the regenerating bar sits on it: shots there hit the bar, not the machine
    hitParts(b, x, y, w, h, dmg, p) {
      const r = b.regen;
      if (!r || !overlap(x, y, w, h, b.x - 30, b.y + b.h - 22, 60, 28)) return false;   // (and just under it, where shots come up)
      r.hp -= dmg; r.flash = 3;
      if (this.frame % 4 === 0) Sound.play('gxHit');
      if (r.hp <= 0) this.gx3RegenStop(b, p);
      return true;
    },
    damage(b, dmg, p, bomb) {
      if (bomb && b.regen) this.gx3RegenStop(b, p);
      if ((bomb || dmg >= b.max * 0.012) && b.rightT <= 0) { this.gx3Talk(b, "YOU'RE ABSOLUTELY RIGHT!", 100); b.rightT = 400; }
      return dmg;
    },
    onPhase(b, g, ph) {
      b.slap = null;
      if (ph === 2) this.gx3Talk(b, "THAT'S A GREAT POINT! LET ME RETHINK.", 130);
      else { g.banner = { text: 'MODEL COLLAPSE!', t: 140, warn: true }; b.glitchT = 60; this.gx3Talk(b, 'AS A LARGE BOSS MODEL I CANNOT LOSE.', 140); Sound.play('gx3Glitch'); }
    },
    onKill(b, g) { g.banner = { text: 'RESPONSE TERMINATED.', t: 220 }; },
    frame: (b, fr) => (fr >> 3) & 1,
    drawOver(ctx, b) { gx3SlopOver.call(this, ctx, b); },
  },
);

Object.assign(Stage.prototype, {
  // the machine talks (scrambled once it's collapsing)
  gx3Talk(b, text, t) { this.gxSay(b, b.ph >= 3 ? gx3Scramble(text) : text, t); Sound.play('gx3Chat'); },
  gx3RegenStop(b, p) {
    b.regen = null;
    this.popups.push({ x: b.x, y: b.y + b.h - 12, text: 'RESPONSE STOPPED', label: true, color: '#58F8F8', t: 0, delay: 0, life: 70 });
    if (p) this.addScore(p, 1000 * (1 + this.galaxy.loop));
    b.stagger = Math.max(b.stagger || 0, 30);
    this.gx3Talk(b, 'I APOLOGIZE FOR THE CONFUSION.', 110);
    Sound.play('gx3Glitch');
  },
  // a line-clear laser row for the stack: y, its gap (x, width; none: 0), warning frames
  gx3Row(b, y, gx, gw, warn, big) { b.rows.push({ y: Math.round(y), gx: Math.round(gx), gw, t: 0, warn, dur: 26, big: big ? 1 : 0 }); },
});

Object.assign(GX_BOSS_ACTS, {
  // THE STACK: a big piece drops at you (the NEXT one); at level 9 a second one somewhere else
  drop(b, a, c) {
    if (a.t === 1) {
      for (let k = 0; k < (b.ph >= 3 ? 2 : 1); k++) {
        const x = k ? 20 + rnd(FW - 40) : c.near ? c.near.x + 8 : b.x;
        if (c.g.list.filter(e => e.type === 'bigpiece').length < 4) this.gxSpawn({ type: 'bigpiece', st: 'hdrop', x, v: { s: k ? rnd(7) : b.next, r: rnd(4) }, lvl: b.level });
      }
      b.next = rnd(7);
      if (!b.say && Math.random() < 0.4) this.gxSay(b, 'NEXT!', 50);
      Sound.play('gx3Turn');
    }
    if (a.t >= 20) c.done(60);
  },
  // a line clear (two at level 5 and up): one on your line, the other elsewhere in your zone
  lineClear(b, a, c) {
    if (a.t === 1) {
      const py = c.near ? c.near.y + 9 : FH * 0.7, n = b.ph >= 2 ? 2 : 1, warn = Math.max(44, 60 - 2 * b.level);
      this.gx3Row(b, py, 0, 0, warn);
      if (n > 1) { let y2 = FH * 0.42 + rnd(Math.round(FH * 0.5)); if (Math.abs(y2 - py) < 24) y2 = py > FH * 0.65 ? py - 40 : py + 40; this.gx3Row(b, y2, 0, 0, warn); }
      this.gxSay(b, n > 1 ? 'DOUBLE!' : 'SINGLE!', 60);
      Sound.play('charge');
    }
    if (a.t >= 80) c.done(50);
  },
  // TETRIS!: four rows at once across your zone, each with a gap
  tetrisClear(b, a, c) {
    if (a.t === 1) {
      for (let k = 0; k < 4; k++) this.gx3Row(b, FH * (0.42 + k * 0.15), 22 + rnd(FW - 44), 34, 70, true);
      c.g.banner = { text: 'TETRIS!', t: 90, warn: true };
      this.gxSay(b, 'TETRIS!', 80);
      Sound.play('charge');
    }
    if (a.t >= 100) c.done(60);
  },
  // garbage pushed up from below (two rows at level 9)
  garbageUp(b, a, c) {
    if (c.g.list.filter(e => e.type === 'gblock').length < 30) {
      const n = gx3Cols();
      for (let k = 0; k < (b.ph >= 3 ? 2 : 1); k++) { b.gap = gx3Gap(b.gap, n, 3, 5); gx3Garbage(this, b.gap, 3, 80 + k * 150); }
      this.gxSay(b, 'HAVE SOME GARBAGE!', 80);
    }
    Sound.play('gx3Rise'); c.done(70);
  },
  // T-spin: three-way bursts out of its T, turning a quarter each time
  tspinBurst(b, a, c) {
    if (a.t === 1) this.gxSay(b, 'T-SPIN!', 50);
    if (a.t % 10 === 1) { const base = c.toward(c.cx, c.cy) + ((a.t / 10) % 4 - 1.5) * 0.25; for (const d of [-0.5, 0, 0.5]) c.shoot(c.cx, c.cy, base + d, 1.4, 'tbul'); Sound.play('gx3Turn'); }
    if (a.t >= 40) c.done(50);
  },
  // T-spin triple: three arms of T pieces spinning out of it
  tspinBarrage(b, a, c) {
    if (a.t === 1) this.gxSay(b, 'T-SPIN TRIPLE!', 70);
    if (a.t % 6 === 0) { b.spin += 0.21; for (let i = 0; i < 3; i++) c.shoot(b.x, b.y + b.h / 2, b.spin + i * Math.PI / 2, 1.15, 'tbul'); }
    if (a.t >= 120) c.done(70);
  },
  // THE SLOP MACHINE: rows of letters, each with a gap a little way from the last one's
  wallOfText(b, a, c) {
    const rows = b.ph >= 3 ? 4 : 3, every = 44;
    if (a.t === 1) { a.text = gx3Pick(['AS AN AI LANGUAGE MODEL ', 'LOREM IPSUM DOLOR SIT AMET ', 'LET US DELVE INTO THE TAPESTRY ', 'CLICK HERE TO SUBSCRIBE NOW ', 'BOOST YOUR ENGAGEMENT TODAY ']); a.i = 0; this.gx3Talk(b, 'SURE! HERE IS A LONG ANSWER:', 90); }
    if (a.t % every === 1 && a.t < rows * every) {
      const n = Math.floor((FW - 8) / 11), gw = 3;
      b.gap = gx3Gap(b.gap, n, gw, 3);
      for (let i = 0; i < n; i++) {
        const ch = a.text[a.i++ % a.text.length];
        if (i >= b.gap && i < b.gap + gw || ch === ' ') continue;
        c.g.bullets.push({ x: 9 + i * 11, y: b.y + 24, vx: 0, vy: 0.85 * c.s, k: gx3Letter(ch) });
      }
      Sound.play('gx3Type');
    }
    if (a.t >= rows * every) c.done(60);
  },
  // HALLUCINATE: blurry little copies of the bosses before it, firing the plainest patterns
  hallucinate(b, a, c) {
    const keys = GX_BOSSES.map(d => d.key).filter(k => k !== 'slop' && GX_BOSS_DRAW[k]), n = b.ph >= 3 ? 3 : 2;
    if (c.g.list.filter(e => e.type === 'halluc').length < 3) for (let i = 0; i < n; i++) {
      const key = gx3Pick(keys), def = GX_BOSSES.find(d => d.key === key), w = Math.round(def.w * 0.4), h = Math.round(def.h * 0.4);
      const e = this.gxSpawn({ type: 'halluc', st: 'jitter', tx: gx3Clamp(b.x + (i - (n - 1) / 2) * 50, 20), ty: 74 + (i % 2) * 18, w, h, v: { k: key, w, h, s: rnd(9) }, life: 700 });
      e.bx = b.x; e.by = b.y + b.h / 2; e.hp = e.max = 9 * c.g.hpMul;
    }
    this.gx3Talk(b, "HERE'S A BOSS YOU MIGHT LIKE!", 100);
    Sound.play('gx3Glitch'); c.done(70);
  },
  // SIX-FINGER SLAP: a big hand over you, a target under it, then it slams (twice once it's collapsing)
  slap(b, a, c) {
    const go = () => {
      const tx = c.near ? c.near.x + 8 : FW / 2, ty = c.near ? c.near.y + 8 : FH * 0.75;
      b.slap = { x: tx, y: -30, tx: gx3Clamp(tx, 14), ty, st: 'aim', t: 0 }; a.n = (a.n || 0) + 1;
      Sound.play('gx3Grab');
    };
    if (a.t === 1) { go(); this.gx3Talk(b, 'HIGH SIX!', 70); }
    else if (!b.slap) { if (b.ph >= 3 && a.n < 2) go(); else c.done(40); }
    if (a.t > 500) { b.slap = null; c.done(40); }
  },
  // REGENERATE RESPONSE: a loading bar on it; shoot it within 4 s or it heals
  regenerate(b, a, c) {
    if (!b.regen) { const hp = b.max * 0.035; b.regen = { t: 0, dur: 240, hp, max: hp, flash: 0 }; this.gx3Talk(b, 'LET ME REGENERATE THAT.', 90); Sound.play('gx3Regen'); }
    c.done(40);
  },
  // MODEL COLLAPSE: a burst of letters every way, glitch clones out of it
  collapse(b, a, c) {
    if (a.t === 1) {
      b.glitchT = 50;
      for (let i = 0; i < 12; i++) { const an = i * Math.PI / 6 + Math.random() * 0.2; c.shoot(b.x, b.y + b.h / 2, an, 0.7 + Math.random() * 0.5, gx3Letter('SLOPGLITCH4?'[i])); }
      if (c.g.list.length < 14) for (let i = 0; i < 2; i++) { const e = this.gxSpawn({ type: 'glitch', st: 'jitter', tx: gx3Clamp(b.x + (i ? 40 : -40), 16), ty: 80 }); e.bx = b.x; e.by = b.y + b.h / 2; }
      this.gx3Talk(b, 'ERROR: BOSS NOT FOUND', 90);
      Sound.play('gx3Glitch');
    }
    if (a.t >= 30) c.done(60);
  },
});

// ------------------------------------------------------------------ their pictures
Object.assign(GX_BOSS_PALS, {
  stack: [null, '#BCBCBC', '#7C7C7C', '#3C3C3C', '#F8F8F8', '#F83800', '#0C0C1C', '#000000', '#3CBCFC', '#F8D800', '#B058F8', '#58D854'],
  slop: [null, '#F8C8E8', '#D898D0', '#8C5098', '#F8F8F8', '#C8F8E0', '#F0C8A0', '#180818', '#283048', '#F8D800', '#C83C50', '#3C8CF8'],
  slopX: [null, '#58F8F8', '#38A858', '#203C8C', '#000000', '#F8005C', '#7CF800', '#F8F8F8', '#F8F800', '#00F8F8', '#F8F8F8', '#F80000'],
});
// the stack's blocks, 5 pixels each, 10 across: digits a colour (8-11), w an eye's white, t a tooth, m the mouth, g garbage
const GX3_STACK = ['1.00..22.3', '0www13www2', '2www00www1', '3311002233', '2tmtmtmtm1', '2mtmtmtmt1', 'g0gg1gg3gg'];
const GX3_STACK_TOP = ['.1..3..0..', '0123.12301', '.3..11..0.', '2330112200'];   // rows on top of it: two at level 5, four at 9
Object.assign(GX_BOSS_DRAW, {
  stack(f, ph) {
    const P = bossPainter(96, 64), X = 23, Y = 4, S = 5;   // the well's inside: x 23-72, y 4-58 (11 rows of 5)
    // the panels: a level panel on the left, the NEXT box and a lines box on the right (their insides drawn live)
    for (const [x0, y0, x1, y1] of [[0, 10, 16, 46], [79, 4, 95, 27], [79, 32, 95, 44]]) { P.rect(x0, y0, x1, y1, 2); P.rect(x0, y0, x1, y0, 1); P.rect(x0, y0, x0, y1, 1); P.rect(x0, y1, x1, y1, 3); P.rect(x0 + 2, y0 + 2, x1 - 2, y1 - 2, 6); }
    for (let y = 15; y < 21; y++) P.line(3, y, 13, y, y % 2 ? 6 : 3);
    P.rect(16, 24, 17, 26, 3); P.rect(78, 14, 78, 16, 3);   // bolted on
    // the well: brick walls, a floor
    for (const x0 of [18, 73]) for (let y = 0; y < 64; y++) for (let x = x0; x < x0 + 5; x++) { const by = Math.floor(y / 4), mortar = y % 4 === 3 || (x - x0 + (by % 2 ? 2 : 0)) % 5 === 4; P.px(x, y, mortar ? 3 : x === x0 && y % 4 === 0 ? 1 : 2); }
    for (let y = 59; y < 64; y++) for (let x = X; x < 73; x++) P.px(x, y, y === 63 || (x + (y > 61 ? 3 : 0)) % 6 === 5 ? 3 : y === 59 ? 1 : 2);
    P.rect(X, 0, 72, 58, 6);
    for (let x = X + 4; x < 73; x += 5) for (let y = 3; y < 59; y += 5) P.px(x, y, 3);   // its faint grid
    // the stack: higher every level; its top rows flash red at level 9 (it's about to top out)
    const rows = (ph >= 3 ? GX3_STACK_TOP : ph >= 2 ? GX3_STACK_TOP.slice(2) : []).concat(GX3_STACK), top = 11 - rows.length, face = top + rows.length - GX3_STACK.length;
    rows.forEach((r, j) => [...r].forEach((ch, i) => {
      const x = X + i * S, y = Y + (top + j) * S, k = j - (face - top);
      if (ch >= '0' && ch <= '3' || ch === 'g') { const c = ch === 'g' ? 2 : ph >= 3 && j < 2 && f ? 5 : 8 + +ch; P.rect(x, y, x + 4, y + 4, c); P.px(x, y, 4); P.px(x + 1, y, 4); P.px(x, y + 1, 4); P.rect(x + 4, y, x + 4, y + 4, 3); P.rect(x, y + 4, x + 4, y + 4, 3); }
      else if (ch === 'w') { P.rect(x, y, x + 4, y + 4, 4); if (k === 2) P.rect(x, y + 4, x + 4, y + 4, 1); }
      else if (ch === 'm' || ch === 't') {
        P.rect(x, y, x + 4, y + 4, 7);
        if (ch === 'm' && ph >= 2 && (i + f) % 2) P.px(x + 2, y + 2, 5);   // a glow down its throat
        if (ch === 't') for (let d = 0; d < 4; d++) { const yy = k === 4 ? y + d : y + 4 - d; P.rect(x + d / 2, yy, x + 4 - d / 2, yy, d === 3 ? 1 : 4); }   // teeth: down from the top, up from the bottom
      }
    }));
    // the eyes: a black rim, red pupils looking down at you (inward), a glint; brows slanting down in a V
    const ey = Y + (face + 1) * S;
    for (const [x0, px] of [[X + 5, X + 13 + (f ? 0 : -1)], [X + 30, X + 32 + (f ? 1 : 0)]]) {
      P.rect(x0 - 1, ey - 1, x0 + 15, ey - 1, 7); P.rect(x0 - 1, ey + 10, x0 + 15, ey + 10, 7); P.rect(x0 - 1, ey, x0 - 1, ey + 9, 7); P.rect(x0 + 15, ey, x0 + 15, ey + 9, 7);
      P.rect(px, ey + 3, px + 4, ey + 8, 5); P.rect(px + 1, ey + 4, px + 3, ey + 7, ph >= 3 && f ? 4 : 5); P.px(px + 1, ey + 4, 4);
    }
    for (let i = 0; i <= 18; i++) { const dy = Math.round(i * 0.33); for (const xx of [X + 3 + i, 72 - 3 - i]) { P.px(xx, ey - 6 + dy, 7); P.px(xx, ey - 5 + dy, 7); P.px(xx, ey - 4 + dy, 3); } }
    // the piece in play, hovering over the stack (no room left for one at level 9)
    if (ph < 3) { const py = Y + Math.max(0, top - 3) * S + (f ? 1 : 0); for (const [cx, cy] of [[5, 0], [4, 1], [5, 1], [6, 1]]) { const x = X + cx * S, y = py + cy * S; P.rect(x, y, x + 4, y + 4, 10); P.px(x, y, 4); P.px(x + 1, y, 4); P.rect(x, y + 4, x + 4, y + 4, 3); P.rect(x + 4, y, x + 4, y + 4, 3); } }
    gxScars(P, ph, 51, 3, 5, f, (x, y) => (x < 18 || x > 78) && y > 6);
    P.outline(); return P.g;
  },
  // f: drips and blinks. A monitor with a chatbot face, sunk in goo full of eyes, six-fingered hands at its sides
  slop(f, ph) {
    const P = bossPainter(88, 64), r = seeded(61);
    // the goo: lumps on lumps, and drips running off its bottom
    for (const [x, y, rx, ry] of [[44, 34, 38, 22], [16, 38, 14, 14], [72, 38, 14, 14], [30, 18, 14, 11], [60, 17, 15, 11], [44, 46, 24, 12]]) gxBall(P, x, y, rx, ry, [1, 1, 2, 3, 3]);
    for (const [x, len] of [[14, 6], [24, 10], [33, 5], [47, 12], [58, 7], [66, 9], [76, 5]]) { const l = len + ((x + f * 3) % 4); for (let y = 50; y < Math.min(63, 50 + l); y++) { P.px(x, y, 2); P.px(x + 1, y, y < 50 + l - 1 ? 3 : 2); } P.px(x, Math.min(62, 50 + l), 1); }
    for (let k = 0; k < 40; k++) { const x = Math.floor(r() * 88), y = Math.floor(r() * 50); if (P.g[y][x] === 2 && r() < 0.5) P.px(x, y, 1); }   // a glossy sheen
    // six-fingered hands spilling out at its sides
    for (const s of [-1, 1]) {
      const hx = 44 + s * 34, hy = 46;
      gxBall(P, hx, hy, 6, 4.5, [4, 6, 6, 3, 3]);
      for (let k = 0; k < 6; k++) { const a = (s < 0 ? Math.PI : 0) + (k - 2.5) * 0.32 * s + Math.PI / 2 * 0.6 * s, len = 5 + (k % 3); P.line(hx + Math.cos(a) * 4, hy + Math.sin(a) * 3, hx + Math.cos(a) * (4 + len), hy + Math.sin(a) * (3 + len), 6); P.px(hx + Math.cos(a) * (4 + len), hy + Math.sin(a) * (3 + len), 4); }
    }
    for (const [x, y] of [[34, 6], [52, 5], [26, 26]]) { P.line(x, y + 4, x + 1, y, 6); P.px(x + 1, y - 1, 4); }   // stray fingers poking out of the top
    // eyes everywhere, each looking its own way (more open every phase, bloodshot at the end)
    const eyes = [[12, 30, 3.5], [76, 28, 3.8], [20, 44, 2.6], [66, 46, 2.6], [8, 40, 2.2], [82, 40, 2.2], [36, 50, 2.4], [56, 52, 2.2], [18, 16, 2.6], [70, 14, 2.8], [44, 56, 2]];
    eyes.slice(0, [6, 9, 11][ph - 1]).forEach(([x, y, rr], k) => {
      const blink = (k + f * 2) % 7 === 0;
      if (blink) { P.line(x - rr, y, x + rr, y, 3); return; }
      P.disc(x, y, rr, 4); P.ring(x, y, rr, 3);
      const a = k * 2.1 + f, ix = x + Math.cos(a) * rr * 0.4, iy = y + Math.sin(a) * rr * 0.4;
      P.disc(ix, iy, rr * 0.55, k % 3 ? 11 : 10); P.px(ix, iy, 7);
      if (ph >= 3) P.line(x - rr + 0.5, y + 1, x - rr * 0.3, y, 10);
    });
    // the monitor: a chunky bezel, a pastel screen, the chatbot beaming on it
    P.rect(24, 6, 64, 40, 7); P.rect(25, 7, 63, 39, 8); P.rect(25, 7, 63, 7, 3); P.rect(28, 10, 60, 35, 5);
    for (let y = 11; y < 35; y += 3) P.line(29, y, 59, y, y % 2 ? 4 : 5);   // scanlines
    P.line(29, 11, 33, 11, 4); P.line(29, 12, 30, 12, 4);   // glare
    if (ph < 3) {
      for (const x of [37, 51]) for (let i = -3; i <= 3; i++) P.px(x + i, 19 - (3 - Math.abs(i)) + (f && ph >= 2 ? 1 : 0), 8);   // happy ^ ^ eyes
      for (let i = -9; i <= 9; i++) { const y = 25 + Math.round(5 * Math.sqrt(1 - (i / 9.5) ** 2)); P.px(44 + i, 25, 8); P.line(44 + i, 25, 44 + i, y, i % 3 ? 4 : 8); }   // a huge smile, teeth
      P.rect(31, 22, 33, 23, 1); P.rect(55, 22, 57, 23, 1);   // blush
    } else {
      P.line(34, 16, 40, 22, 8); P.line(40, 16, 34, 22, 8);   // one eye an X, the other wide
      P.disc(51, 19, 3, 8); P.disc(51, 19, 1.5, 4);
      for (let i = -9; i <= 9; i++) P.px(44 + i, 28 + Math.round(Math.sin(i * 0.9 + f) * 2), 8);   // the smile gone wrong
      for (let y = 12; y < 34; y += 5) P.rect(29 + ((y * 7 + f * 5) % 20), y, 39 + ((y * 7 + f * 5) % 20), y, 10);   // glitches on the screen
    }
    P.rect(40, 37, 48, 38, 3); P.px(42, 37, f ? 11 : 9);   // a power light
    // goo oozing over the bezel's corners
    for (const [x, y, rx, ry] of [[25, 9, 4, 4], [63, 8, 5, 3], [24, 38, 5, 4], [64, 39, 4, 4]]) gxBall(P, x, y, rx, ry, [1, 1, 2, 3, 3]);
    // sparkles
    for (const [x, y, s2] of [[18, 22, 3], [70, 20, 2], [6, 30, 2], [80, 48, 2]]) { const big = (x + f) % 2 ? s2 : s2 - 1; P.line(x - big, y, x + big, y, 9); P.line(x, y - big, x, y + big, 9); P.px(x, y, 4); }
    gxScars(P, ph, 61, 3, 5, f, (x, y) => (x < 22 || x > 66 || y > 42) && y < 50);
    P.outline(); return P.g;
  },
});
GX_BOSS_DRAW.slopX = GX_BOSS_DRAW.slop;

// the big hand of the slap: six fingers spread, pointing down
GxGfx.slap6 = function (flash) {
  const k = 'slap6' + (flash ? 'f' : 'n');
  let c = this.cache.get(k);
  if (!c) {
    const P = bossPainter(34, 32);
    gxBall(P, 16, 9, 14, 8.5, [4, 6, 6, 3, 3]);   // the back of the hand
    for (let k = 0; k < 6; k++) {   // six fingers hanging down, knuckles, nails at the tips
      const x = 3 + Math.round(k * 4.6), len = [10, 14, 16, 16, 14, 11][k], top = 11;
      for (let y = top; y <= top + len; y++) { P.px(x, y, 1); P.px(x + 1, y, 6); P.px(x + 2, y, 3); }
      for (const j of [0.4, 0.75]) P.line(x, top + Math.round(len * j), x + 2, top + Math.round(len * j), 3);
      P.rect(x, top + len - 1, x + 2, top + len, 4); P.px(x + 2, top + len, 1);
    }
    for (let i = 0; i < 7; i++) { P.px(29 + i * 0.6, 7 + i, 6); P.px(30 + i * 0.6, 7 + i, 6); P.px(31 + i * 0.6, 7 + i, 3); }   // the thumb, out to the side
    P.rect(32, 13, 33, 14, 4);
    for (const x of [7, 12, 17, 22]) P.line(x, 4, x - 1, 9, 3);   // tendons
    P.rect(8, 0, 24, 2, 2); P.rect(8, 0, 24, 0, 1); P.px(12, 3, 2); P.px(20, 3, 2); P.px(20, 4, 2);   // a sleeve of goo, dripping
    P.outline();
    c = gridCanvas(P.g, flash ? BOSS_PALS.f : GX_BOSS_PALS.slop); this.cache.set(k, c);
  }
  return c;
};

// THE STACK, over its picture: what's NEXT, its level, the lines, and its line lasers across your zone
function gx3StackOver(ctx, b) {
  const f = this.frame, x0 = Math.round(b.x - b.w / 2), y0 = Math.round(b.y), tiny = typeof gxTiny === 'function';
  const v = { s: b.next | 0, r: 0 }, c = gxTetroCells(v), w = (Math.max(...c.map(q => q[0])) + 1) * 3, h = (Math.max(...c.map(q => q[1])) + 1) * 3;
  for (const [cx, cy] of c) gx3Block(ctx, x0 + 87 - Math.round(w / 2) + cx * 3, y0 + 18 - Math.round(h / 2) + cy * 3, 3, v.s);
  if (tiny) { gxTiny(ctx, 'NEXT', x0 + 87, y0 + 7, '#F8F8F8'); gxTiny(ctx, 'LV', x0 + 8, y0 + 25, '#BCBCBC'); gxTiny(ctx, String(b.level || 1), x0 + 8, y0 + 33, b.ph >= 3 && (f >> 3) & 1 ? '#F83800' : '#F8D800'); gxTiny(ctx, String(Math.max(0, Math.round((1 - b.hp / b.max) * 99))), x0 + 87, y0 + 36, '#58D854'); }
  for (const r of b.rows || []) {
    const on = r.t >= r.warn, y = r.y, gl = r.gw ? r.gx - r.gw / 2 : -1, gr = r.gw ? r.gx + r.gw / 2 : -1;
    const span = (yy, hh, col) => { ctx.fillStyle = col; if (r.gw) { ctx.fillRect(0, yy, Math.max(0, gl), hh); ctx.fillRect(gr, yy, FW - gr, hh); } else ctx.fillRect(0, yy, FW, hh); };
    if (!on) {   // the warning: a red dotted line, flashing faster as it comes
      ctx.fillStyle = (r.t >> (r.t > r.warn - 20 ? 1 : 3)) & 1 ? '#F83800' : r.t > r.warn - 20 ? '#F8F8F8' : '#881800';
      for (let x = (r.t >> 1) % 4; x < FW; x += 4) if (!(r.gw && x > gl - 2 && x < gr)) { ctx.fillRect(x, y - 5, 2, 1); ctx.fillRect(x, y + 4, 2, 1); }
      if (r.gw) { ctx.fillStyle = '#F8F8F8'; ctx.fillRect(gl, y - 6, 1, 12); ctx.fillRect(gr - 1, y - 6, 1, 12); }
      continue;
    }
    span(y - 5, 10, (f >> 1) & 1 ? '#F83800' : '#F8B800'); span(y - 2, 4, '#F8F8F8');
  }
}

// THE SLOP MACHINE, over its picture: collapsing glitches, the regenerating bar, the slap
function gx3SlopOver(ctx, b) {
  const f = this.frame, tiny = typeof gxTiny === 'function';
  if (b.ph >= 3 || b.glitchT > 0) {   // model collapse: slices of it in the wrong colours, out of line
    const img = GxGfx.boss('slopX', (f >> 3) & 1, 'n', b.ph), r = seeded(f >> 2), n = b.glitchT > 0 ? 6 : 3;
    for (let k = 0; k < n; k++) { const sy = Math.floor(r() * (b.h - 6)), sh = 2 + Math.floor(r() * 5), dx = Math.round((r() - 0.5) * 10); ctx.drawImage(img, 0, sy, b.w, sh, Math.round(b.x - b.w / 2) + dx, Math.round(b.y) + sy, b.w, sh); }
  }
  const rg = b.regen;
  if (rg) {
    const x = Math.round(b.x - 30), y = Math.round(b.y + b.h - 22), fr = Math.min(1, rg.t / rg.dur);
    ctx.fillStyle = '#100818'; ctx.fillRect(x, y, 60, 18);
    ctx.fillStyle = rg.flash > 0 && (f >> 1) & 1 ? '#F8F8F8' : '#C8F8E0'; ctx.fillRect(x, y, 60, 1); ctx.fillRect(x, y + 17, 60, 1); ctx.fillRect(x, y, 1, 18); ctx.fillRect(x + 59, y, 1, 18);
    if (rg.flash > 0) rg.flash--;
    if (tiny) gxTiny(ctx, 'REGENERATING' + '...'.slice(0, (f >> 4) % 4), b.x, y + 3, '#F8F8F8', null);
    ctx.fillStyle = '#383048'; ctx.fillRect(x + 3, y + 10, 54, 5);
    ctx.fillStyle = fr > 0.75 && (f >> 2) & 1 ? '#F8F8F8' : '#58F8C8'; ctx.fillRect(x + 3, y + 10, Math.round(54 * fr), 5);
    ctx.fillStyle = '#F8D800'; ctx.fillRect(x + 3, y + 16, Math.round(54 * Math.max(0, rg.hp / rg.max)), 1);   // what's left of it
  }
  const s = b.slap;
  if (s) {
    if (s.st === 'aim') {   // the target: where it'll land
      const tx = Math.round(s.tx), ty = Math.round(s.ty);
      ctx.fillStyle = (f >> 2) & 1 ? '#F83800' : '#F8F8F8'; ctx.fillRect(tx - 14, ty - 12, 6, 1); ctx.fillRect(tx + 9, ty - 12, 6, 1); ctx.fillRect(tx - 14, ty + 11, 6, 1); ctx.fillRect(tx + 9, ty + 11, 6, 1);
      ctx.fillRect(tx - 14, ty - 12, 1, 6); ctx.fillRect(tx + 14, ty - 12, 1, 6); ctx.fillRect(tx - 14, ty + 6, 1, 6); ctx.fillRect(tx + 14, ty + 6, 1, 6);
      ctx.fillRect(tx - 1, ty - 1, 3, 3);
    }
    ctx.drawImage(GxGfx.slap6(false), Math.round(s.x - 17), Math.round(s.y - 24));
  }
}

// ------------------------------------------------------------------ the skies
function gxBgWell(c, f) {
  const W = VIEW_W, H = VIEW_H, s = Math.floor(f * 0.25) % 8;
  // a faint grid, drifting down: you're falling into the well
  c.fillStyle = '#0C0E22';
  for (let x = 7; x < W; x += 8) c.fillRect(x, 0, 1, H);
  for (let y = s - 8; y < H; y += 8) c.fillRect(0, y, W, 1);
  // tetrominoes falling a cell at a time in the dark, turning now and then
  for (let k = 0; k < 6; k++) {
    const per = 700 + k * 110, t = f + k * 377, n = Math.floor(t / per), step = Math.floor((t % per) / 16);
    const v = { s: (k * 3 + n) % 7, r: (n + (step >> 3)) % 4 }, cells = gxTetroCells(v), x0 = 16 + ((k * 53 + n * 29) % Math.max(8, W - 64)), y0 = -32 + step * 8;
    if (y0 > H) continue;
    c.globalAlpha = 0.2; c.fillStyle = GX_TETRO_COLS[v.s][1];
    for (const [cx, cy] of cells) c.fillRect(x0 + cx * 8, y0 + cy * 8, 7, 7);
    c.globalAlpha = 1;
  }
  // now and then a line clears: a flash across a row
  const lc = f % 260, li = Math.floor(f / 260);
  if (lc < 20) { const y = 24 + ((li * 37) % Math.max(8, H - 64)) - ((li * 37) % 8); c.fillStyle = 'rgba(248,248,248,' + (0.24 * (1 - lc / 20)).toFixed(2) + ')'; c.fillRect(6, y, W - 12, 8); }
  // the brick walls of the well
  for (const x0 of [0, W - 6]) for (let y = s - 8; y < H; y += 4) {
    const row = Math.floor((y - s) / 4) & 1;
    c.fillStyle = '#16162A'; c.fillRect(x0, y, 6, 4);
    c.fillStyle = '#26263E'; c.fillRect(x0 + (row ? 0 : 3), y, 3, 3); c.fillRect(x0 + (row ? 4 : 0), y, row ? 2 : 2, 3);
    c.fillStyle = '#34344E'; c.fillRect(x0 + (row ? 0 : 3), y, 1, 1);
  }
  // the lines cleared so far, dim, in the corner
  Font.draw(c, 'LINES ' + String(li % 1000).padStart(3, '0'), 9, H - 10, '#1C1C3C');
}

const GX3_WATERMARKS = ['LOREM IPSUM', 'CRAEZY DEEL', 'BUY NOW', 'WATERMARK', 'STOCK IMAGE', 'CLICK HERE', 'SUBSCRIBE', 'TOP 10 SPACE'];
function gxBgSlop(c, f) {
  const W = VIEW_W, H = VIEW_H, sh = Math.sin(f / 240) * 0.5 + 0.5;
  // an uncanny pastel haze, slowly shifting
  const gr = c.createLinearGradient(0, 0, 0, H);
  gr.addColorStop(0, 'rgba(248,168,216,' + (0.12 + 0.06 * sh).toFixed(3) + ')'); gr.addColorStop(0.55, 'rgba(168,152,248,0.10)'); gr.addColorStop(1, 'rgba(128,248,208,' + (0.16 - 0.06 * sh).toFixed(3) + ')');
  c.fillStyle = gr; c.fillRect(0, 0, W, H);
  // a soft glow nobody asked for, wandering
  const gx = W * (0.5 + 0.35 * Math.sin(f / 300)), gy = H * (0.35 + 0.2 * Math.cos(f / 410)), rg = c.createRadialGradient(gx, gy, 0, gx, gy, 70);
  rg.addColorStop(0, 'rgba(248,232,248,0.16)'); rg.addColorStop(1, 'rgba(248,232,248,0)');
  c.fillStyle = rg; c.fillRect(0, 0, W, H);
  // garbled watermarks, big and slanted, drifting
  c.save(); c.imageSmoothingEnabled = false; c.globalAlpha = 0.09;
  for (let k = 0; k < 4; k++) {
    const text = GX3_WATERMARKS[(k + Math.floor(f / 900)) % GX3_WATERMARKS.length], x = ((k * 131 - f * 0.12) % (W + 220) + W + 220) % (W + 220) - 110, y = 24 + k * 52 + Math.round(f * 0.1) % 52;
    c.save(); c.translate(Math.round(x), Math.round(y % (H + 30)) - 10); c.rotate(-0.22); c.scale(2, 2); Font.draw(c, text, 0, 0, '#F8F8F8'); c.restore();
  }
  c.restore();
  // stars melting: drops of light with a smear running down from them
  const r = seeded(1313);
  for (let k = 0; k < 16; k++) {
    const x = Math.floor(r() * W), y = Math.floor((r() * H + f * (0.2 + r() * 0.3)) % (H + 12)) - 6, len = 3 + Math.floor(r() * 6) + Math.round(Math.sin(f / 20 + k) * 2), col = k % 3 ? '232,200,248' : '200,248,232';
    for (let i = 0; i < len; i++) { c.fillStyle = 'rgba(' + col + ',' + (0.5 * (1 - i / len)).toFixed(2) + ')'; c.fillRect(x + Math.round(Math.sin((y + i) / 5 + k) * 0.6), y + i, i < 2 ? 2 : 1, 1); }
  }
  // sparkles, like the emoji: a big one and two little ones, twinkling
  for (let k = 0; k < 3; k++) {
    const t = (f + k * 97) % 180, x = 30 + ((k * 71 + Math.floor((f + k * 97) / 180) * 53) % (W - 60)), y = 30 + ((k * 43 + Math.floor((f + k * 97) / 180) * 31) % (H - 80));
    if (t > 60) continue;
    const a = Math.sin(t / 60 * Math.PI);
    for (const [dx, dy, s] of [[0, 0, 4], [7, -5, 2], [6, 4, 1.5]]) {
      const n = Math.round(s * a + 0.4); if (n < 1) continue;
      c.fillStyle = 'rgba(248,232,120,' + (0.6 * a).toFixed(2) + ')'; c.fillRect(x + dx - n, y + dy, n * 2 + 1, 1); c.fillRect(x + dx, y + dy - n, 1, n * 2 + 1);
      c.fillStyle = 'rgba(248,248,248,' + (0.7 * a).toFixed(2) + ')'; c.fillRect(x + dx, y + dy, 1, 1);
    }
  }
  // glitch stripes now and then
  if (f % 170 < 8) for (let k = 0; k < 3; k++) { const y = (f * 13 + k * 71) % H; c.fillStyle = k % 2 ? 'rgba(0,248,248,0.16)' : 'rgba(248,0,248,0.16)'; c.fillRect(((f * 7 + k * 29) % 40) - 20, y, W, 2 + k); }
}

// ------------------------------------------------------------------ their music
// THE WELL: Korobeiniki, the old folk tune Tetris made famous; the stack's version is faster, harmonic minor
const GX3_KORO = '4---1-2-3---2-1-' + '0---0-2-4---3-2-' + '1-----2-3---4---' + '2---0---0-------' +
  '.-3---5-7---6-5-' + '4-----2-4---3-2-' + '1---1-2-3---4---' + '2---0---0-------';
SONGS.galaxyWell = { name: 'KOROBEINIKI', root: 57, bpm: 144, groove: 'blocks', prog: [0, 4, 4, 0, 3, 2, 4, 0], scale: [0, 2, 3, 5, 7, 8, 10], mel: GX3_KORO };
SONGS.galaxyBossWell = { name: 'KOROBEINIKI: LEVEL 9', root: 52, bpm: 168, groove: 'topout', prog: [0, 4, 4, 0, 3, 2, 4, 0], scale: [0, 2, 3, 5, 7, 8, 11], mel: GX3_KORO };
// THE SLOP FEED: inspiring corporate stock music (bright, bland, endless); the machine's own: the same, corrupted
SONGS.galaxySlop = { name: 'UPBEAT CORPORATE 4', root: 64, bpm: 116, groove: 'stock', prog: [0, 4, 5, 3], scale: [0, 2, 4, 5, 7, 9, 11],
  mel: '4.4.5.4-2-0-2-4-' + '4-2-1-2-4---.---' + '5.5.4.5-7-5-4-2-' + '3-2-1-0-1---.---' };
SONGS.galaxyBossSlop = { name: 'STOCK MUSIC.EXE', root: 64, bpm: 132, groove: 'glitch', prog: [0, 4, 5, 3], steps: 15, scale: [0, 2, 4, 6, 7, 9, 10],
  mel: '4.4.5.4-2-0000-' + '4-2-1-2-4444.z.' + '5.5.4.5-7-5-4-2' + '3-2-1-0-1-0-z-y' };
Object.assign(GROOVES, {
  blocks: { drums: 'k.h.s.h.k.hks.h.', bass: 'r.o.r.o.f.o.f.o.' },
  topout: { drums: 'k.hkk.hks.hkk.hs', bass: 'rorororofofofofo' },
  stock: { drums: 'k..hs.h.k.hhs..h', bass: 'r..r..f.r..r..o.' },
  glitch: { drums: 'k.hs.kk.s.hhk.s', bass: 'r.rr.o.r..f.o.r' },
});
