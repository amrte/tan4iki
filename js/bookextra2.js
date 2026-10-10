'use strict';
// =====================================================================
//  BOSS GALLERY, the other modes' bosses (2 of 2): THE MINOTAUR (MAZE), BARON KRAGG (TANK RALLY) and THE REGENT
//  (DESERT DOMINION). Each is a whole boss screen like bossart.js's drawBossScreen: the name in bricks, the picture
//  (112x64, shown at double size) in its frame, the words under it; draw(ctx, t, outro): outro false = the WARNING
//  picture (before the fight), true = the VICTORY picture (after it). js/bookextra.js lists them in the gallery.
//  The pictures are their own, in each mode's colours: the lair beast's crimson iron and gold horns (mazefoes.js),
//  the champion's purple face, horns and gold cape (rallycareer.js), the Regent's crown and fan collar and his
//  golden-helmed praetorians (rtscampaign.js, rtsart_units.js).
// =====================================================================

window.BOOK_EXTRA_ART = window.BOOK_EXTRA_ART || {};

// ------------------------------------------------------------------ drawing helpers (in the picture's pixels)
const bookX2Cache = new Map();
let bookX2Pic = null;

// something that doesn't move, drawn once into its own canvas
function bookX2Once(k, w, h, draw) {
  let c = bookX2Cache.get(k);
  if (!c) { c = makeCanvas(w, h); draw(c.getContext('2d'), c); bookX2Cache.set(k, c); }
  return c;
}
// a scratch canvas, cleared
function bookX2Scratch(k, w, h) {
  let c = bookX2Cache.get('~' + k);
  if (!c || c.width !== w || c.height !== h) { c = makeCanvas(w, h); bookX2Cache.set('~' + k, c); }
  const g = c.getContext('2d');
  g.clearRect(0, 0, w, h);
  g.imageSmoothingEnabled = false;
  return c;
}
// a colour from a ramp (dark to light) for v 0..1, the steps dithered into each other
function bookX2Ramp(cols, v, x, y) {
  const n = cols.length, i = Math.floor(v * n + ((x + y) & 1 ? 0.22 : -0.22));
  return cols[Math.max(0, Math.min(n - 1, i))];
}
const bookX2Col = (col, x, y, a, b) => (typeof col === 'function' ? col(x, y, a, b) : col);
function bookX2Dot(c, x, y, col) { if (col) { c.fillStyle = col; c.fillRect(x, y, 1, 1); } }
// a filled polygon (pixel centres inside); col: a colour or fn(x, y)
function bookX2Poly(c, pts, col) {
  let y0 = Infinity, y1 = -Infinity;
  for (const p of pts) { y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
  for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) {
    const yc = y + 0.5, xs = [];
    for (let i = 0; i < pts.length; i++) {
      const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length];
      if ((ay <= yc) !== (by <= yc)) xs.push(ax + (yc - ay) / (by - ay) * (bx - ax));
    }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const xa = Math.round(xs[k]), xb = Math.round(xs[k + 1]);
      if (typeof col === 'string') { c.fillStyle = col; c.fillRect(xa, y, xb - xa, 1); } else for (let x = xa; x < xb; x++) bookX2Dot(c, x, y, col(x, y));
    }
  }
}
// a filled ellipse; col: a colour or fn(x, y, nx, ny) (nx, ny: -1..1 across it)
function bookX2Ell(c, cx, cy, rx, ry, col) {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
    const nx = (x + 0.5 - cx) / rx, ny = (y + 0.5 - cy) / ry;
    if (nx * nx + ny * ny <= 1) bookX2Dot(c, x, y, bookX2Col(col, x, y, nx, ny));
  }
}
// a cubic curve, stamped with discs (horns, tails, capes): r(k 0..1), col(x, y, nx, ny, k)
function bookX2Curve(c, p0, p1, p2, p3, n, r, col) {
  for (let i = 0; i <= n; i++) {
    const k = i / n, u = 1 - k;
    const x = u * u * u * p0[0] + 3 * u * u * k * p1[0] + 3 * u * k * k * p2[0] + k * k * k * p3[0];
    const y = u * u * u * p0[1] + 3 * u * u * k * p1[1] + 3 * u * k * k * p2[1] + k * k * k * p3[1];
    const rr = r(k);
    bookX2Ell(c, x, y, rr, rr, (px, py, nx, ny) => col(px, py, nx, ny, k));
  }
}
// a dark line round whatever is drawn on a canvas (4 neighbours), like a sprite's outline
function bookX2Outline(cv, col) {
  const g = cv.getContext('2d'), w = cv.width, h = cv.height, d = g.getImageData(0, 0, w, h).data;
  const on = (x, y) => x >= 0 && y >= 0 && x < w && y < h && d[(y * w + x) * 4 + 3] > 127;
  g.fillStyle = col;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (!on(x, y) && (on(x - 1, y) || on(x + 1, y) || on(x, y - 1) || on(x, y + 1))) g.fillRect(x, y, 1, 1);
  return cv;
}
// a soft glow (light on a wall, a beam): a checkerboard of one colour over an ellipse
function bookX2Glow(c, cx, cy, rx, ry, col, ph = 0) {
  for (let y = Math.floor(cy - ry); y <= cy + ry; y++) {
    const w = Math.round(rx * Math.sqrt(Math.max(0, 1 - ((y - cy) / (ry + 0.5)) ** 2)));
    if (w > 0) Art.dith(c, Math.round(cx - w), y, 2 * w + 1, 1, col, (y + ph) & 1);
  }
}
// tiny 3x5 letters (signs, scoreboards)
const BOOK_X2_TINY = {
  A: '010101111101101', C: '011100100100011', D: '110101101101110', E: '111100110100111', G: '011100101101011', I: '111010010010111',
  H: '101101111101101', K: '101101110101101', L: '100100100100111', M: '101111111101101', N: '110101101101101', O: '010101101101010',
  P: '110101110100100', R: '110101110101101', S: '011100010001110', V: '101101101101010',
  T: '111010010010010', U: '101101101101111', W: '101101101111101', Z: '111001010100111', 1: '010110010010111', '!': '010010010000010',
};
function bookX2Tiny(c, s, x, y, col) {
  for (const ch of s) { const d = BOOK_X2_TINY[ch]; if (d) for (let k = 0; k < 15; k++) if (d[k] === '1') Pix.rect(c, x + (k % 3), y + Math.floor(k / 3), 1, 1, col); x += 4; }
}
const bookX2TinyW = s => s.length * 4 - 1;
// a firework: a ring of sparks opening and falling (p 0..1)
function bookX2Firework(c, x, y, p, col, n = 12, r = 12) {
  for (let k = 0; k < n; k++) {
    const a = k / n * Math.PI * 2, d = r * Math.sqrt(p), px = Math.round(x + Math.cos(a) * d), py = Math.round(y + Math.sin(a) * d + p * p * 6);
    if (p > 0.7 && (k + Math.floor(p * 20)) & 1) continue;
    Pix.rect(c, px, py, 1, 1, p < 0.25 ? '#F8F8F8' : col);
    if (p < 0.6) Pix.rect(c, Math.round(x + Math.cos(a) * d * 0.7), Math.round(y + Math.sin(a) * d * 0.7 + p * p * 4), 1, 1, col);
  }
}
// confetti falling over the whole picture
function bookX2Confetti(c, t, n, seed, cols) {
  const r = seeded(seed);
  for (let k = 0; k < n; k++) {
    const x0 = r() * INTRO_W, sp = 0.25 + r() * 0.35, ph = r() * 200, col = cols[k % cols.length];
    const y = ((t * sp + ph) % (INTRO_H + 10)) - 5, x = x0 + Math.sin((t + ph) / 12) * 3;
    Pix.rect(c, x, y, (t + k * 5) % 16 < 8 ? 2 : 1, 1, col);
  }
}

// ------------------------------------------------------------------ the screen round a picture (as drawBossScreen)
// e: { name, warn (the top line before), won (after), tale: { intro: [2 lines], outro: [line, gold line] }, pts,
//      intro(c, t), outro(c, t), bubble(t, outro) -> { text, x, y, tail } | null }
function bookX2Screen(ctx, t, outro, e) {
  const pc = bookX2Pic || (bookX2Pic = makeCanvas(INTRO_W, INTRO_H)), c = pc.getContext('2d');
  c.clearRect(0, 0, INTRO_W, INTRO_H);
  c.imageSmoothingEnabled = false;
  (outro ? e.outro : e.intro)(c, t);
  ctx.fillStyle = COL.black; ctx.fillRect(0, 0, SW, SH);
  if (!outro) {
    if ((t >> 3) & 1 || t < 8) Font.drawCenter(ctx, e.warn, SW / 2, 2, COL.red);
  } else Font.drawCenter(ctx, e.won, SW / 2, 2, COL.gold);
  let s = 3;
  while (s > 1 && Font.bigWidth(e.name, s) > SW - 16) s--;
  Font.big(ctx, e.name, (SW - Font.bigWidth(e.name, s)) >> 1, 23 - (7 * s >> 1), s, Sprites.bricks(ctx));
  ctx.fillStyle = outro ? '#F8D800' : '#F83800'; ctx.fillRect(INTRO_X - 4, INTRO_Y - 4, INTRO_W * 2 + 8, INTRO_H * 2 + 8);
  ctx.fillStyle = COL.black; ctx.fillRect(INTRO_X - 3, INTRO_Y - 3, INTRO_W * 2 + 6, INTRO_H * 2 + 6);
  ctx.fillStyle = '#7C7C7C'; ctx.fillRect(INTRO_X - 2, INTRO_Y - 2, INTRO_W * 2 + 4, INTRO_H * 2 + 4);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(pc, INTRO_X, INTRO_Y, INTRO_W * 2, INTRO_H * 2);
  // what it says, at full size over the picture (tail: where its point is, from the bubble's left, in screen px)
  const bub = e.bubble && e.bubble(t, outro);
  if (bub) {
    const w = bub.text.length * 8 + 6, bx = Math.max(INTRO_X, Math.min(INTRO_X + bub.x * 2, INTRO_X + INTRO_W * 2 - w)), by = INTRO_Y + bub.y * 2;
    const tx = bub.tail === undefined ? w - 14 : Math.max(2, Math.min(w - 6, bub.tail));
    ctx.fillStyle = '#100808'; ctx.fillRect(bx - 1, by - 1, w + 2, 13);
    ctx.fillStyle = '#F8F8F8'; ctx.fillRect(bx, by, w, 11); ctx.fillRect(bx + tx, by + 11, 4, 3); ctx.fillRect(bx + tx + 2, by + 14, 2, 2);
    Font.draw(ctx, bub.text, bx + 3, by + 2, bub.col || '#100808');
  }
  const y = INTRO_Y + INTRO_H * 2 + 8;
  if (!outro) {
    Font.drawCenter(ctx, e.tale.intro[0], SW / 2, y, '#F8F8F8');
    Font.drawCenter(ctx, e.tale.intro[1], SW / 2, y + 11, '#BCBCBC');
  } else {
    Font.drawCenter(ctx, e.tale.outro[0], SW / 2, y, '#F8F8F8');
    Font.drawCenter(ctx, e.pts ? '+' + e.pts + ' PTS' : e.tale.outro[1], SW / 2, y + 11, COL.gold);
  }
  if ((t >> 4) & 1 || t < 20) Font.drawCenter(ctx, 'PRESS ENTER', SW / 2, y + 23, COL.red);
}

// =================================================================== THE MINOTAUR (MAZE: the lair of every 5th maze)
// the lair boss's colours (mazefoes.js MF_MINO_PAL.boss), as ramps dark to light
const BOOK_X2_IRON = ['#0C0408', '#2A0C18', '#3C1020', '#5C1828', '#7C2034', '#A03850', '#C85068', '#E888A0'];
const BOOK_X2_BONE = ['#5C3C08', '#8C6410', '#B88820', '#D8A830', '#F0D070', '#F8E8A0', '#FCF8E0'];
const BOOK_X2_TREAD = ['#141018', '#2C2830', '#4C4854', '#88808C'];
const BOOK_X2_STONE = ['#0C0A08', '#1C1814', '#2A2620', '#3C362E', '#544C44', '#766E64', '#968E82', '#BCB4A8'];

// the beast, from the front: horns sweeping out and up, a bull's skull for a face, a riveted iron body on wide treads.
// Drawn into its own canvas (72 x 64, the middle at x 36), outlined. st: { f (tread frame), eye 0 calm 1 bright 2 red,
//  x: eyes out (fallen), broken: the left horn snapped off, ring: the nose ring's swing (-1..1), lean: the head's tilt }
function bookX2Mino(st) {
  const key = 'mino' + [st.f || 0, st.eye || 0, st.x ? 1 : 0, st.broken ? 1 : 0, st.bd || 0, st.hd || 0, Math.round((st.ring || 0) * 1.5)].join();
  return bookX2Once(key, 72, 64, (c, cv) => bookX2MinoPaint(c, cv, st));
}
function bookX2MinoPaint(c, cv, st) {
  const X = 36, R = BOOK_X2_IRON, B = BOOK_X2_BONE, f = st.f || 0;
  const iron = (v, x, y) => bookX2Ramp(R.slice(1), v, x, y);
  c.save(); c.translate(0, st.bd || 0);
  // treads (the front of each, links rolling down)
  for (const s of [-1, 1]) {
    const x0 = s < 0 ? X - 31 : X + 19;
    for (let y = 33; y < 62; y++) for (let x = x0; x < x0 + 12; x++) {
      if ((y === 61 || y === 33) && (x === x0 || x === x0 + 11)) continue;
      const e = x === x0 || x === x0 + 11, link = (y + f) % 4 === 0;
      bookX2Dot(c, x, y, e || link ? BOOK_X2_TREAD[0] : x === x0 + 5 || x === x0 + 6 ? BOOK_X2_TREAD[3] : x < x0 + 5 ? BOOK_X2_TREAD[2] : BOOK_X2_TREAD[1]);
    }
    for (let y = 35; y < 61; y += 4) { bookX2Dot(c, x0 + 2, y + (f % 4), '#5C5864'); bookX2Dot(c, x0 + 9, y + (f % 4), '#5C5864'); }
  }
  // the hull between them: a bronze plate on dark iron, rivets, a ridge
  bookX2Poly(c, [[X - 20, 34], [X + 20, 34], [X + 20, 58], [X + 16, 61], [X - 16, 61], [X - 20, 58]], (x, y) => iron(0.42 - (y - 34) / 60 - (x - X) / 90, x, y));
  bookX2Poly(c, [[X - 15, 42], [X + 15, 42], [X + 13, 56], [X - 13, 56]], (x, y) => iron(0.55 - (y - 42) / 40 - (x - X) / 60, x, y));
  for (let x = X - 14; x <= X + 14; x++) bookX2Dot(c, x, 42, R[6]);
  for (let x = X - 17; x <= X + 17; x += 4) { bookX2Dot(c, x, 58, R[6]); bookX2Dot(c, x, 59, R[1]); }
  for (let y = 37; y < 57; y += 5) for (const s of [-1, 1]) bookX2Dot(c, X + s * 18, y, R[5]);
  // the chest gun port
  bookX2Ell(c, X, 50.5, 4.5, 4, (x, y, nx, ny) => (nx * nx + ny * ny > 0.42 ? (ny < -0.2 ? R[6] : ny > 0.3 ? R[1] : R[3]) : R[0]));
  bookX2Dot(c, X - 2, 49, '#4C4C54');
  // shoulders: a wide plate over the treads, horned fenders
  bookX2Poly(c, [[X - 33, 30], [X - 22, 25], [X + 22, 25], [X + 33, 30], [X + 32, 35], [X - 32, 35]], (x, y) => iron(0.78 - (y - 25) / 16 - Math.abs(x - X) / 110 - (x > X ? 0.1 : 0), x, y));
  for (let x = X - 31; x <= X + 31; x += 3) bookX2Dot(c, x, 33, R[1]);
  for (let x = X - 21; x <= X + 21; x++) bookX2Dot(c, x, 26, R[6]);
  for (const s of [-1, 1]) for (const [dx, h] of [[25, 6], [30, 4]]) {
    const bx = X + s * dx, by = 28.5 - (dx - 25) * 0.2;
    bookX2Poly(c, [[bx - 2, by], [bx + 2, by], [bx + s * 0.5, by - h]], (x, y) => bookX2Ramp(B, x < bx ? 0.8 : 0.4, x, y));
  }
  c.restore(); c.save(); c.translate(0, st.hd || 0);
  // the head behind the skull: dark iron cheeks and a heavy jaw
  bookX2Poly(c, [[X - 13, 11], [X + 13, 11], [X + 14, 17], [X + 12, 25], [X + 10, 33], [X + 9, 41], [X + 6, 45], [X - 6, 45], [X - 9, 41], [X - 10, 33], [X - 12, 25], [X - 14, 17]],
    (x, y) => iron(0.5 - (y - 11) / 70 - (x - X) / 40, x, y));
  for (const s of [-1, 1]) { bookX2Dot(c, X + s * 8, 42, R[6]); bookX2Dot(c, X + s * 11, 30, R[6]); bookX2Dot(c, X + s * 12, 20, R[6]); }
  Pix.rect(c, X - 5, 43, 11, 1, R[0]);
  for (const s of [-1, 1]) { bookX2Dot(c, X + s * 4, 42, B[5]); bookX2Dot(c, X + s * 4, 41, B[4]); }   // tusks over the lip
  // ears under the horns
  for (const s of [-1, 1]) bookX2Poly(c, [[X + s * 12, 15], [X + s * 20, 17], [X + s * 21, 19.5], [X + s * 13, 21]], (x, y) => (y > 17.5 && Math.abs(x - X) < 19 && Math.abs(x - X) > 14 ? R[1] : iron(0.45, x, y)));
  // horns: out of the skull, sweeping out, round and up; ridged near the base
  for (const s of [-1, 1]) {
    const broken = st.broken && s < 0;
    bookX2Curve(c, [X + s * 9, 13], [X + s * 22, 17], [X + s * 34, 9], [X + s * 30, 1], 36, k => 3.9 - k * 3.1, (x, y, nx, ny, k) => {
      if (broken && k > 0.4) return null;
      const v = 0.72 - ny * 0.45 - nx * s * 0.12 - k * 0.04 + (k < 0.35 && Math.floor(k * 40) % 4 === 0 ? -0.28 : 0);
      return bookX2Ramp(B, v, x, y);
    });
    if (broken) for (const [dx, dy] of [[0, -2], [1, -1], [0, 0], [1, 1], [0, 2]]) bookX2Dot(c, X + s * (22 + dx), 15 + dy, dx ? B[1] : B[0]);
  }
  // the shaggy forelock between the horns
  for (let x = X - 9; x <= X + 9; x++) { const h = 3 + ((x * 7) % 3); for (let y = 7; y < 7 + h; y++) bookX2Dot(c, x, y, y === 7 ? R[2] : (x * 3 + y) % 4 ? R[2] : R[4]); }
  // the skull: a bull's, bleached, worn as a mask; dark sockets for the eyes, the long snout
  const skull = [[X - 10, 11], [X - 6, 9.5], [X + 6, 9.5], [X + 10, 11], [X + 11, 15], [X + 9.5, 22], [X + 6, 26], [X + 5, 33], [X + 5.5, 37.5], [X + 3, 40.5], [X - 3, 40.5], [X - 5.5, 37.5], [X - 5, 33], [X - 6, 26], [X - 9.5, 22], [X - 11, 15]];
  bookX2Poly(c, skull, (x, y) => bookX2Ramp(B, 1.02 - (y - 10) / 48 - (x - X) / 26 - (Math.abs(x - X) > 7 && y > 14 ? 0.15 : 0), x, y));
  for (const [x, y] of [[-3, 12], [-2, 13], [-2, 14], [-3, 15], [2, 28], [3, 29], [1, 24]]) bookX2Dot(c, X + x, y, B[2]);   // cracks in the old bone
  for (let y = 25; y < 33; y++) bookX2Dot(c, X, y, B[3]);
  // the nose: two dark holes at the end of the snout
  for (const s of [-1, 1]) { Pix.rect(c, X + s * 2 - (s < 0 ? 1 : 0), 34, 2, 3, R[0]); bookX2Dot(c, X + s * 2, 33, B[2]); }
  // eyes: sockets, an angry brow over each, the light inside
  for (const s of [-1, 1]) {
    bookX2Ell(c, X + s * 5.5, 19.5, 3.4, 2.6, R[0]);
    for (let k = 0; k < 7; k++) bookX2Dot(c, X + s * (2 + k), 15 + Math.floor(k / 2.5), B[6]);
    for (let k = 0; k < 7; k++) bookX2Dot(c, X + s * (2 + k), 16 + Math.floor(k / 2.5), B[2]);
    const ex = X + s * 5 - (s < 0 ? 1 : 0);
    if (st.x) for (const [dx, dy] of [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]]) bookX2Dot(c, ex + dx + (s < 0 ? 1 : 0), 19.5 + dy, B[3]);
    else {
      const E = st.eye === 2 ? ['#F8F8F8', '#F83800', '#A80000'] : st.eye === 1 ? ['#F8F8F8', '#F8F838', '#F83800'] : ['#F8F838', '#F8B800', '#A82000'];
      Pix.rect(c, ex - 1, 19, 4, 1, E[1]); Pix.rect(c, ex, 18, 2, 1, E[1]); Pix.rect(c, ex - 1, 20, 4, 1, E[2]);
      bookX2Dot(c, ex + (s < 0 ? 1 : 0), 19, E[0]);
    }
  }
  if (st.x) { Pix.rect(c, X + 1, 44, 3, 4, '#D83860'); Pix.rect(c, X + 2, 48, 2, 1, '#D83860'); Pix.rect(c, X + 1, 44, 1, 3, '#F87898'); }   // its tongue out
  c.restore();
  bookX2Outline(cv, R[0]);
  // the gold nose ring (it hangs outside the outline)
  const rx = X + Math.round((st.ring || 0) * 1.5), ry = st.hd || 0;
  for (const [dx, dy] of [[-2, 39], [2, 39], [-3, 40], [3, 40], [-3, 41], [3, 41], [-2, 42], [2, 42], [-1, 43], [0, 43], [1, 43]]) bookX2Dot(c, rx + dx, dy + ry, dy > 41 ? B[2] : B[5]);
  return cv;
}

// the lair: a torch-lit arena wall with the beast's gate, flagstones, a ring of old stains (still parts, kept)
function bookX2Lair(open) {
  return bookX2Once('lair' + (open ? 1 : 0), INTRO_W, INTRO_H, c => {
    const S = BOOK_X2_STONE, torches = [[12, 15], [100, 15]];
    const lit = (x, y) => { let l = 0; for (const [tx, ty] of torches) l += Math.max(0, 1 - Math.hypot(x - tx, (y - ty) * 1.2) / 30); return l; };
    // the wall: big blocks, darker up high, lit round the torches
    for (let y = 0; y < 34; y++) for (let x = 0; x < INTRO_W; x++) {
      const row = Math.floor(y / 6), bx = (x + (row & 1) * 5) % 10, by = y % 6;
      const mortar = by === 5 || bx === 9, v = 0.18 + lit(x, y) * 0.65 + y / 160 + (by === 0 || bx === 0 ? 0.08 : 0) + (seeded(row * 31 + Math.floor((x + (row & 1) * 5) / 10))() - 0.5) * 0.12;
      bookX2Dot(c, x, y, mortar ? S[0] : bookX2Ramp(S.slice(1, 7), v, x, y));
    }
    // cracks and moss
    for (const [x, y] of [[26, 3], [27, 4], [27, 5], [86, 20], [87, 21], [87, 22], [88, 23], [6, 28], [7, 29]]) bookX2Dot(c, x, y, S[0]);
    // the gate: a great arch of dressed stone, dark inside (or open onto the exit's light)
    const ax = 56, aw = 21, top = 6;
    const inArch = (x, y, r) => y >= top + r && Math.abs(x + 0.5 - ax) <= r || Math.hypot(x + 0.5 - ax, y + 0.5 - (top + r)) <= r;
    for (let y = 0; y < 34; y++) for (let x = ax - aw - 4; x <= ax + aw + 4; x++) {
      if (inArch(x, y, aw)) {
        if (!open) bookX2Dot(c, x, y, y > 26 ? ((x + y) & 1 ? '#1C0408' : '#0C0204') : '#050203');
        else {
          // a tunnel going away to the light of the way out: its arches smaller and smaller, lit from the far end
          let k = 1;
          for (let q = 0.04; q <= 1; q += 0.02) if (inArch(56 + (x - 56) / q, 14 + (y - 14) / q, aw)) { k = q; break; }
          if (k <= 0.24) bookX2Dot(c, x, y, bookX2Ramp(['#F8D878', '#FCF0C0', '#FFFFFF'], 1.1 - k * 3, x, y));
          else bookX2Dot(c, x, y, Math.floor(Math.log(k) * 7) !== Math.floor(Math.log(k + 0.02) * 7) ? '#0C0604' : bookX2Ramp(['#140A06', '#2C1C10', '#4C3418', '#7C5C2C', '#B89048'], 1.05 - k * 1.05 + (y > 14 + (y - 14) * 0 && y > 26 ? 0.08 : 0), x, y));
        }
      } else if (inArch(x, y, aw + 4)) {
        const a = Math.atan2(y - (top + aw), x - ax), seam = y < top + aw ? Math.floor((a + Math.PI) * 5) % 2 : Math.floor(y / 4) % 2;
        bookX2Dot(c, x, y, bookX2Ramp(S.slice(2), 0.45 + lit(x, y) * 0.4 - (x - ax) / 120 + seam * 0.12, x, y));
      }
    }
    // the portcullis, raised: its teeth along the top of the arch
    if (!open) for (let x = ax - 16; x <= ax + 16; x += 4) { Pix.rect(c, x, top + 2, 1, 4 + (x % 8 ? 0 : 1), '#3C3C44'); bookX2Dot(c, x, top + 6 + (x % 8 ? 0 : 1), '#7C7C88'); }
    // chains and shackles beside the gate
    for (const cx of [27, 85]) { for (let y = 2; y < 18; y += 2) { bookX2Dot(c, cx, y, '#4C4C54'); bookX2Dot(c, cx, y + 1, '#7C7C88'); } Pix.rect(c, cx - 1, 18, 3, 2, '#5C5C64'); }
    // the floor: flagstones going away from you, the stains in a ring, bones
    for (let y = 34; y < INTRO_H; y++) for (let x = 0; x < INTRO_W; x++) {
      const z = (y - 30) / 34, u = (x - 56) / (0.4 + z * 0.9);
      const seam = [35, 37, 40, 44, 49, 55, 62].includes(y) || Math.abs(((u + 400) % 14) - 7) > 6.4;
      const v = 0.12 + lit(x, y - 4) * 0.35 + z * 0.12 + (open ? Math.max(0, 0.45 - Math.hypot((x - 56) / 40, (y - 34) / 18) * 0.45) : 0);
      bookX2Dot(c, x, y, seam ? S[0] : bookX2Ramp(S.slice(1, 6), v, x, y));
    }
    Pix.rect(c, 0, 34, INTRO_W, 1, S[0]);
    for (let a = 0; a < 70; a++) {
      const th = a / 70 * Math.PI * 2, x = Math.round(56 + Math.cos(th) * 50), y = Math.round(55 + Math.sin(th) * 7);
      if (y > 34) Pix.rect(c, x, y, 2, 1, a & 1 ? '#4C1C14' : '#3C140C');
    }
    // bones: a ribcage, a skull, a few long bones
    const bone = '#C8BCA0', boneD = '#7C705C';
    for (let k = 0; k < 4; k++) { Pix.rect(c, 90 + k * 2, 56 - (k === 1 || k === 2 ? 1 : 0), 1, 4, bone); }
    Pix.rect(c, 89, 59, 9, 1, boneD);
    Pix.rect(c, 17, 56, 4, 3, bone); Pix.rect(c, 18, 59, 2, 1, bone); bookX2Dot(c, 18, 57, '#1C1814'); bookX2Dot(c, 20, 57, '#1C1814');
    Pix.line(c, 26, 61, 32, 59, bone); bookX2Dot(c, 25, 61, bone); bookX2Dot(c, 33, 58, bone);
    Pix.line(c, 76, 62, 81, 62, boneD);
  });
}
// a torch on the wall (its bracket, the flame and the light it throws)
function bookX2Torch(c, x, y, t, k = 0) {
  const fl = ((t >> 2) + k * 3) % 4, r = 9 + (fl & 1);
  bookX2Glow(c, x, y - 2, r + 4, r, '#4C2410', t >> 3);
  bookX2Glow(c, x, y - 2, r - 3, r - 4, '#7C3814', (t >> 3) + 1);
  Pix.rect(c, x - 1, y, 3, 5, '#3C2410'); Pix.rect(c, x - 2, y - 1, 5, 2, '#7C5428'); Pix.rect(c, x - 2, y + 4, 5, 1, '#2C1808');
  Pix.rect(c, x - 2, y - 5, 5, 4, '#F83800');
  Pix.rect(c, x - 1 + (fl & 1), y - 7 - (fl === 0 ? 1 : 0), 3, 4, '#F8B800');
  Pix.rect(c, x, y - 4, 1, 2, '#FCFCA8');
  if (fl === 2) bookX2Dot(c, x + 1, y - 9, '#F87830');
}

// stones shaken down from the walls, lying about the floor (kept)
function bookX2Stones() {
  return bookX2Once('stones', INTRO_W, INTRO_H, c => {
    const S = BOOK_X2_STONE;
    for (const [x, y, w, h, v] of [[22, 50, 6, 4, 0.5], [27, 54, 5, 3, 0.3], [18, 58, 7, 4, 0.6], [80, 52, 5, 3, 0.4], [86, 57, 6, 4, 0.55], [33, 60, 4, 3, 0.35], [74, 60, 5, 3, 0.45]]) {
      Pix.rect(c, x - 1, y - 1, w + 2, h + 2, S[0]);
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) bookX2Dot(c, x + i, y + j, bookX2Ramp(S.slice(2), j === 0 ? v + 0.3 : i === w - 1 ? v - 0.2 : v, x + i, y + j));
    }
    // cracks run out from under it
    for (const [x0, y0, x1, y1] of [[30, 58, 20, 63], [76, 57, 90, 63], [44, 62, 40, 64], [66, 61, 70, 64]]) Pix.line(c, x0, y0, x1, y1, S[0]);
  });
}

const BOOK_X2_MINO_PIC = {
  intro(c, t) {
    c.drawImage(bookX2Lair(false), 0, 0);
    bookX2Torch(c, 12, 15, t, 0); bookX2Torch(c, 100, 15, t, 1);
    // a stomp now and then: the floor jumps, dust falls, a ring runs out over the stones
    const sp = t % 150, stomp = sp < 26, shake = stomp && sp < 10 ? (sp & 2 ? 1 : -1) : 0;
    for (let y = 58; y < 64; y++) { const w = Math.round(38 * Math.sqrt(Math.max(0, 1 - ((y - 61) / 3.5) ** 2))); Art.dith(c, 56 - w, y, w * 2, 1, '#050203', y & 1); }
    if (stomp) {
      const rr = 26 + sp * 2;
      for (let a = 0; a < 48; a++) { const th = a / 48 * Math.PI * 2, y = Math.round(60 + Math.sin(th) * rr * 0.16); if (y > 35 && y < 64 && (a + sp) & 1) Pix.rect(c, Math.round(56 + Math.cos(th) * rr), y, 2, 1, sp < 14 ? '#C8B898' : '#766E64'); }
    }
    // the beast: breathing (the head rises and sinks), its eyes flaring on the stomp
    const br = Math.round(Math.sin(t / 22) * 0.6), by = br + (stomp && sp < 6 ? 1 : 0);
    c.drawImage(bookX2Mino({ f: (t >> 3) & 3, eye: stomp ? 2 : (t % 90) < 8 ? 1 : 0, ring: Math.sin(t / 9) * (stomp ? 1 : 0.5) }), 20 + shake, by);
    // hot breath snorted from its nose, out and down
    const bp = t % 64;
    if (bp < 36) for (const s of [-1, 1]) for (let k = 0; k < 3; k++) {
      const p = (bp - k * 6) / 30;
      if (p < 0 || p > 1) continue;
      const x = Math.round(56 + shake + s * (4 + p * 12)), y = Math.round(37 + by + p * 5), r = Math.round(p * 2);
      bookX2Glow(c, x, y, r + 1, r, p < 0.5 ? '#F8F8F8' : '#A8A8A8', (t >> 1) + k);
      if (p < 0.4) bookX2Dot(c, x, y, '#F8F8F8');
    }
    // dust from the ceiling on the stomp
    if (stomp) for (let k = 0; k < 12; k++) { const x = (k * 37 + 11) % INTRO_W, y = Math.round(sp * (1.4 + (k % 3) * 0.5) - (k * 13) % 9); if (y >= 0 && y < 64) Pix.rect(c, x, y, 1, 1 + (k & 1), k % 3 ? '#968E82' : '#544C44'); }
    // your tank, braced on the edge of the ring
    Art.tank(c, 3, 53, 0, false, t >> 3);
  },
  outro(c, t) {
    c.drawImage(bookX2Lair(true), 0, 0);
    // the way out is open: its light pours over the floor
    for (let k = 0; k < 6; k++) { const x0 = 56 + (k - 2.5) * 5, x1 = 56 + (k - 2.5) * 22 + Math.sin(t / 25 + k) * 2; for (let y = 34; y < 64; y++) if ((y + k + (t >> 3)) & 1) bookX2Dot(c, Math.round(x0 + (x1 - x0) * (y - 34) / 30), y, '#C8A858'); }
    bookX2Torch(c, 12, 15, t, 0); bookX2Torch(c, 100, 15, t, 1);
    for (let y = 57; y < 64; y++) { const w = Math.round(40 * Math.sqrt(Math.max(0, 1 - ((y - 61) / 4) ** 2))); Art.dith(c, 56 - w, y, w * 2, 1, '#050203', y & 1); }
    c.drawImage(bookX2Stones(), 0, 0);
    // down for good: sunk on its broken treads, its head on the floor, a horn snapped off, its lights out
    const rq = Math.round(Math.sin(t / 14) * 0.6 * 1.5);
    c.drawImage(bookX2Once('minodown' + rq, INTRO_W, INTRO_H, g => GxArt.rot(g, bookX2Mino({ x: true, broken: true, bd: 4, hd: 13, ring: rq / 1.5 }), 56, 32, -0.05)), 0, 0);
    Art.stars(c, 56, 19, t);
    Art.smoke(c, 28, 30, t, 4, 3, true); Art.smoke(c, 84, 31, t, 4, 5, true);
    Art.fire(c, 80, 33, 5, t);
    Art.sparks(c, 31, 37, t, 5);
    // the snapped horn on the stones
    Art.rot(c, 14, 8, g => { bookX2Curve(g, [1, 6], [5, 7], [10, 6], [12, 1], 16, k => 2.4 - k * 1.8, (x, y, nx, ny) => bookX2Ramp(BOOK_X2_BONE, 0.7 - ny * 0.4, x, y)); bookX2Outline(g.canvas, BOOK_X2_IRON[0]); }, 11, 52, -0.25);
    // its hoard: coins jumping out, a pile glinting
    Art.debris(c, 66, 52, t, 5, '#F8D800', 0.7);
    for (let k = 0; k < 10; k++) { const x = 64 + (k * 7) % 16, y = 60 + (k * 5) % 4; Pix.rect(c, x, y, 2, 1, k & 1 ? '#D8A830' : '#F8D800'); if ((t + k * 13) % 50 < 4) bookX2Dot(c, x, y - 1, '#F8F8F8'); }
    // you, and your flag
    Art.tank(c, 94, 55, 0, true, t >> 3);
    Art.tank(c, 88, 45, 1, true, t >> 3); Art.flag(c, 97, 35, t);
  },
};

BOOK_EXTRA_ART.maze_minotaur = {
  name: 'THE MINOTAUR', mode: 'MAZE', pts: 3000, desc: 'THE BEAST OF THE LAIR',
  draw(ctx, t, outro) {
    bookX2Screen(ctx, t, outro, {
      name: 'THE MINOTAUR', warn: 'WARNING! BOSS APPROACHING', won: 'BOSS DEFEATED!', pts: 3000,
      tale: { intro: ['IT SLEEPS AT THE LAIR\'S HEART', 'MAKE IT CHARGE INTO A WALL'], outro: ['THE LAIR FALLS SILENT', ''] },
      intro: BOOK_X2_MINO_PIC.intro, outro: BOOK_X2_MINO_PIC.outro,
    });
  },
};

// =================================================================== BARON KRAGG (TANK RALLY: the champion race)
// his colours (rallycareer.js): a gold and red tank, a long purple face, slit red eyes, bone horns, fangs, a gold cape
const BOOK_X2_GOLD = ['#3C2800', '#6C4C00', '#AC7C00', '#D89C00', '#F8B800', '#F8D878', '#FCF0C0'];
const BOOK_X2_RED = ['#280000', '#500000', '#880800', '#B81800', '#D82800', '#F85830'];
const BOOK_X2_SKIN = ['#1C1430', '#2C2048', '#584880', '#7C68A8', '#8C78B8', '#B8A8E0'];
const BOOK_X2_HORN = ['#5C5040', '#8C8070', '#B8A890', '#D8CCB0', '#F8E8C8'];

// his tank, side on, facing left (80 x 48; the hull's top left at 8, 12): a battering ram of gold, a long gun, a crown
// on the turret, bone horns, a rally wing and twin exhausts. st: { f (the tracks), wreck: dented, the wing and a wheel gone }
function bookX2KraggTank(st) {
  return bookX2Once('ktank' + ((st.f || 0) & 3) + (st.wreck ? 'w' : ''), 80, 48, (c, cv) => bookX2KraggTankPaint(c, cv, st));
}
function bookX2KraggTankPaint(c, cv, st) {
  const G = BOOK_X2_GOLD, R = BOOK_X2_RED, f = st.f || 0, W = !!st.wreck;
  c.save(); c.translate(8, 12);
  // the rally wing on its struts, at the back
  if (!W) {
    Pix.rect(c, 60, 4, 2, 10, '#3C3C3C'); Pix.rect(c, 66, 4, 2, 10, '#3C3C3C');
    bookX2Poly(c, [[56, 2], [71, 1], [71, 5], [56, 5]], (x, y) => (y < 3 ? R[5] : y < 4 ? R[4] : R[2]));
    Pix.rect(c, 70, -1, 2, 7, G[4]); Pix.rect(c, 71, -1, 1, 7, G[2]);
  } else { Pix.rect(c, 60, 9, 2, 5, '#3C3C3C'); bookX2Poly(c, [[57, 7], [64, 4], [65, 6], [58, 9]], R[2]); }
  // exhausts, up and back
  for (const k of [0, 1]) bookX2Poly(c, [[60 + k * 3, 14], [63 + k * 3, 14], [67 + k * 3, 8], [64 + k * 3, 7]], (x, y) => (x + y) % 3 ? '#9C9C9C' : '#E0E0E0');
  // the tracks: a long belt round a sprocket, an idler and road wheels
  bookX2Poly(c, [[6, 26], [64, 26], [68, 30], [64, 35], [6, 35], [2, 30]], '#202020');
  for (let k = 0; k < 17; k++) { const x = 4 + ((k * 4 + f) % 64); Pix.rect(c, x, 26, 2, 1, '#5C5C5C'); Pix.rect(c, x, 34, 2, 1, '#5C5C5C'); }
  Art.wheel(c, 7, 30, 4, '#7C7C7C', '#BCBCBC'); Art.wheel(c, 63, 30, 4, '#7C7C7C', '#BCBCBC');
  for (let k = 0; k < 6; k++) if (!(W && k === 4)) { Art.wheel(c, 15 + k * 8, 31, 3, '#6C6C6C', '#A8A8A8'); bookX2Dot(c, 15 + k * 8, 31, G[4]); }
  // the skirt over them: red, a gold rail, the champion's number
  bookX2Poly(c, [[5, 21], [66, 21], [66, 27], [62, 29], [8, 29], [4, 26]], (x, y) => bookX2Ramp(R.slice(1), 0.9 - (y - 21) / 9, x, y));
  for (let x = 5; x < 66; x++) bookX2Dot(c, x, 21, G[5]);
  for (let x = 10; x < 62; x += 6) bookX2Dot(c, x, 27, R[0]);
  for (let k = 0; k < 3; k++) bookX2Poly(c, [[48 + k * 4, 22], [51 + k * 4, 22], [49 + k * 4, 25], [51 + k * 4, 28], [48 + k * 4, 28], [46 + k * 4, 25]], G[4]);   // speed chevrons
  bookX2Ell(c, 33, 25, 4.5, 3.6, '#F8F8F8'); bookX2Tiny(c, '1', 32, 23, '#100808');
  // the hull: gold on top, a red band
  bookX2Poly(c, [[3, 21], [11, 13], [60, 13], [64, 17], [66, 21]], (x, y) => bookX2Ramp(G.slice(1), 1 - (y - 13) / 10 - (x < 11 ? 0.15 : 0), x, y));
  for (let x = 9; x < 63; x++) { bookX2Dot(c, x, 17, R[4]); bookX2Dot(c, x, 18, R[2]); }
  for (let x = 14; x < 60; x += 5) bookX2Dot(c, x, 15, G[6]);
  // the battering ram: a gold blade, teeth forward
  bookX2Poly(c, [[-4, 15], [3, 13], [5, 15], [5, 33], [2, 35], [-4, 33]], (x, y) => bookX2Ramp(G.slice(1), 0.95 - (x + 4) / 12 - (y - 13) / 60, x, y));
  for (let k = 0; k < 6; k++) bookX2Poly(c, [[-4, 15 + k * 3.2], [-8, 16.5 + k * 3.2], [-4, 18 + k * 3.2]], k & 1 ? G[3] : G[5]);
  if (W) { bookX2Poly(c, [[-4, 22], [-1, 24], [-4, 27]], '#202020'); bookX2Dot(c, 1, 20, G[0]); }
  for (let y = 17; y < 33; y += 4) bookX2Dot(c, 2, y, G[1]);
  // the turret: rounded, a red band, his crown on its side
  bookX2Poly(c, [[19, 13], [21, 7], [27, 3], [44, 3], [49, 7], [49, 13]], (x, y) => bookX2Ramp(G.slice(1), 1.05 - (y - 3) / 12 - (x - 19) / 90, x, y));
  for (let x = 21; x < 49; x++) bookX2Dot(c, x, 10, R[3]);
  bookX2Poly(c, [[32, 9], [33, 6], [34.5, 7.5], [36, 5], [37.5, 7.5], [39, 6], [40, 9]], G[6]);
  bookX2Dot(c, 36, 8, R[4]);
  for (let x = 23; x < 48; x += 4) bookX2Dot(c, x, 12, G[2]);
  // the gun: long, a muzzle brake at its end
  const gl = W ? 18 : 30;
  Pix.rect(c, 19 - gl, 7, gl, 3, '#7C7C7C'); Pix.rect(c, 19 - gl, 7, gl, 1, '#C8C8C8'); Pix.rect(c, 19 - gl, 9, gl, 1, '#4C4C4C');
  Pix.rect(c, 15 - gl, 6, 5, 5, W ? '#3C3C3C' : '#9C9C9C'); Pix.rect(c, 15 - gl, 6, 5, 1, '#E0E0E0'); Pix.rect(c, 17 - gl, 8, 1, 1, '#202020');
  for (let k = 0; k < 3; k++) Pix.rect(c, 4 + k * 4, 7, 1, 3, G[3]);
  // a bone horn sweeping forward off the turret's brow
  bookX2Curve(c, [24, 6], [20, 4], [16, 2], [14, -2], 14, k => 1.8 - k * 1.2, (x, y, nx, ny) => bookX2Ramp(BOOK_X2_HORN, 0.7 - ny * 0.5, x, y));
  if (W) for (const [x, y] of [[30, 5], [31, 6], [42, 11], [12, 19], [56, 15], [40, 20], [41, 19], [25, 18]]) bookX2Dot(c, x, y, '#202020');   // dents and scorch
  c.restore();
  return bookX2Outline(cv, '#100808');
}

// the Baron himself: (x, y) = the middle of his chest; pose 'hatch' (standing in it, pointing at you) or 'sit' (on the
// track, his crown gone); t moves his cape
function bookX2Kragg(c, x, y, t, pose) {
  const cv = bookX2Scratch('kragg', 40, 44), g = cv.getContext('2d'), X = 20, Y = 30, G = BOOK_X2_GOLD, R = BOOK_X2_RED, S = BOOK_X2_SKIN, H = BOOK_X2_HORN;
  const sit = pose === 'sit';
  // the cape, flowing back (to the right) in the wind, a red lining under it; or lying in a heap behind him
  if (!sit) {
    const wv = k => Math.sin(t / 5 - k * 0.9) * (k * 0.4), top = [], bot = [];
    for (let k = 0; k <= 7; k++) { top.push([X + 2 + k * 2.2, Y - 9 + k * 0.6 + wv(k)]); bot.push([X + 2 + k * 2.2, Y + 3 + k * 0.5 + wv(k)]); }
    bookX2Poly(g, top.concat(bot.slice().reverse().map(([px, py]) => [px, py + 1])), R[1]);
    bookX2Poly(g, top.concat(bot.slice().reverse()), (px, py) => bookX2Ramp(G.slice(1), 0.8 - (py - Y + 9) / 16 + (Math.floor((px - X + Math.sin(t / 5) * 2) / 3) & 1 ? -0.15 : 0.05), px, py));
  } else bookX2Poly(g, [[X + 2, Y - 8], [X + 10, Y + 3], [X + 12, Y + 9], [X - 7, Y + 9], [X - 5, Y + 3]], (px, py) => bookX2Ramp(G.slice(1), 0.6 - (py - Y) / 16 + ((px >> 1) & 1 ? -0.12 : 0.05), px, py));
  // the body in his racing suit, a spiked gold collar, a belt
  bookX2Poly(g, [[X - 4, Y - 10], [X + 4, Y - 10], [X + 5, Y + (sit ? 3 : 4)], [X - 5, Y + (sit ? 3 : 4)]], (px, py) => bookX2Ramp(R.slice(1), 0.9 - (px - X + 4) / 11, px, py));
  for (let k = 0; k < 6; k++) bookX2Dot(g, X - 3 + k, Y - 4 + (k & 1), R[5]);
  Pix.rect(g, X - 5, Y - 11, 11, 2, G[5]); Pix.rect(g, X - 5, Y - 10, 11, 1, G[3]);
  for (const k of [-5, -2, 2, 5]) bookX2Dot(g, X + k, Y - 12, G[4]);
  Pix.rect(g, X - 4, Y - 1, 9, 1, G[2]); Pix.rect(g, X - 1, Y - 1, 2, 1, G[6]);
  if (sit) {   // legs out in front, boots; an arm propping him up
    Pix.rect(g, X - 11, Y + 3, 11, 3, R[3]); Pix.rect(g, X - 11, Y + 3, 11, 1, R[4]); Pix.rect(g, X - 14, Y + 1, 3, 5, '#202020'); bookX2Dot(g, X - 14, Y + 1, '#5C5C5C');
    Pix.rect(g, X - 7, Y - 8, 2, 8, R[3]); Pix.rect(g, X - 8, Y, 3, 2, G[4]);
  } else {   // an arm out, pointing at you (it shakes a little)
    const a = Math.round(Math.sin(t / 7) * 0.6);
    Pix.line(g, X - 4, Y - 8, X - 10, Y - 11 + a, R[4], 2); Pix.rect(g, X - 12, Y - 12 + a, 3, 3, G[4]); Pix.rect(g, X - 15, Y - 12 + a, 3, 1, G[5]);
  }
  // the head: long, purple, turned toward you (left): a jutting chin, slit red eyes, fangs
  const hx = X, hy = sit ? Y - 16 : Y - 18;
  if (sit) Pix.rect(g, hx - 1, hy + 6, 3, 2, S[2]);
  bookX2Poly(g, [[hx - 4, hy - 6], [hx + 3, hy - 6], [hx + 4.5, hy - 3], [hx + 4.5, hy + 3], [hx + 2, hy + 6.5], [hx - 3, hy + 7.5], [hx - 5.5, hy + 6], [hx - 5.5, hy + 2], [hx - 5, hy - 3]], (px, py) => bookX2Ramp(S.slice(2), 0.95 - (px - hx + 4) / 10 - (py - hy) / 28, px, py));
  Pix.line(g, hx - 6, hy - 3, hx - 2, hy - 1, '#140820'); Pix.line(g, hx + 3, hy - 3, hx + 1, hy - 1, '#140820');   // brows down
  if (!sit) {
    Pix.rect(g, hx - 5, hy, 3, 1, '#F83800'); bookX2Dot(g, hx - 4, hy, '#000000');
    Pix.rect(g, hx, hy, 3, 1, '#F83800'); bookX2Dot(g, hx + 1, hy, '#000000');
  } else { Pix.rect(g, hx - 5, hy, 3, 1, '#2C2048'); Pix.rect(g, hx, hy, 3, 1, '#2C2048'); }   // eyes shut, seeing stars
  Pix.rect(g, hx - 1, hy + 1, 1, 2, S[1]);
  Pix.rect(g, hx - 4, hy + 4, 5, 1, '#280000'); bookX2Dot(g, hx - 4, hy + 5, '#F8F8F8'); bookX2Dot(g, hx, hy + 5, '#F8F8F8');
  // the horns, and the crown between them (gone when he's lost)
  bookX2Curve(g, [hx - 3, hy - 6], [hx - 6, hy - 8], [hx - 9, hy - 9], [hx - 9, hy - 14], 14, k => 1.7 - k * 1.1, (px, py, nx) => bookX2Ramp(H, 0.85 - nx * 0.4, px, py));
  bookX2Curve(g, [hx + 2, hy - 6], [hx + 5, hy - 8], [hx + 8, hy - 9], [hx + 8, hy - 14], 14, k => 1.7 - k * 1.1, (px, py, nx) => bookX2Ramp(H, 0.55 - nx * 0.4, px, py));
  if (!sit) bookX2Crown(g, hx - 0.5, hy - 6, (t >> 3) % 5 === 0);
  bookX2Outline(cv, '#100808');
  if (sit) { Pix.rect(g, hx - 2, hy - 4, 2, 1, '#3C3C3C'); bookX2Dot(g, hx + 2, hy + 2, '#3C3C3C'); }   // soot
  c.drawImage(cv, Math.round(x - X), Math.round(y - Y));
}

// his face, big, on the stadium's screen (w x h at x, y): laughing (or not), eyes ablaze
function bookX2KraggFace(c, x, y, w, h, t, mood) {
  c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip();
  const cx = x + (w >> 1), G = BOOK_X2_GOLD, S = BOOK_X2_SKIN, H = BOOK_X2_HORN;
  Pix.rect(c, x, y, w, h, '#200008');
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if ((i + j + (t >> 3)) % 8 < 2) bookX2Dot(c, x + i, y + j, '#300814');
  // the gold cape's collar and his shoulders
  bookX2Ell(c, cx, y + h + 3, 16, 8, (px, py, nx) => bookX2Ramp(BOOK_X2_RED.slice(1), 0.6 - nx * 0.3, px, py));
  for (const s of [-1, 1]) bookX2Poly(c, [[cx + s * 4, y + h - 6], [cx + s * 15, y + h - 9], [cx + s * 13, y + h], [cx + s * 5, y + h]], (px, py) => bookX2Ramp(G.slice(1), 0.85 - (py - y - h + 9) / 12 - (s > 0 ? 0.2 : 0), px, py));
  Pix.rect(c, cx - 3, y + h - 8, 6, 6, S[2]);
  // the head
  bookX2Ell(c, cx, y + 13, 7, 10.5, (px, py, nx, ny) => bookX2Ramp(S.slice(1), 0.85 - nx * 0.45 - ny * 0.2, px, py));
  for (const s of [-1, 1]) for (let k = 0; k < 4; k++) bookX2Dot(c, cx + s * (5 - (k >> 1)), y + 14 + k, S[1]);   // cheekbones
  // horns, sweeping out and up off the top of the screen, and the crown
  for (const s of [-1, 1]) bookX2Curve(c, [cx + s * 5, y + 5], [cx + s * 10, y + 4], [cx + s * 13, y + 1], [cx + s * 12, y - 5], 18, k => 2 - k * 1.2, (px, py, nx, ny) => bookX2Ramp(H, 0.75 - ny * 0.3 - nx * s * 0.3, px, py));
  bookX2Poly(c, [[cx - 5, y + 5], [cx - 5, y], [cx - 3, y + 2], [cx, y - 2], [cx + 3, y + 2], [cx + 5, y], [cx + 5, y + 5]], (px, py) => bookX2Ramp(G.slice(2), 0.95 - (px - cx + 5) / 14, px, py));
  bookX2Dot(c, cx, y + 3, BOOK_X2_RED[4]); bookX2Dot(c, cx - 3, y + 4, '#3CBCFC'); bookX2Dot(c, cx + 3, y + 4, '#58D854');
  // brows down, slit eyes burning red
  for (const s of [-1, 1]) {
    Pix.line(c, cx + s * 1, y + 10, cx + s * 5, y + 8, '#140820');
    Pix.rect(c, cx + (s < 0 ? -5 : 2), y + 11, 4, 2, (t >> 2) % 6 ? '#F83800' : '#F8B800');
    Pix.rect(c, cx + (s < 0 ? -3 : 3), y + 11, 1, 2, '#000000');
  }
  for (let k = 0; k < 4; k++) bookX2Dot(c, cx, y + 13 + k, S[4]);
  bookX2Dot(c, cx - 1, y + 17, S[1]); bookX2Dot(c, cx + 1, y + 17, S[1]);
  // the mouth: a laugh (open, fangs) or a snarl
  if (mood === 'laugh' && (t >> 3) & 1) { Pix.rect(c, cx - 3, y + 19, 7, 3, '#300000'); Pix.rect(c, cx - 2, y + 21, 5, 1, '#A82000'); bookX2Dot(c, cx - 2, y + 19, '#F8F8F8'); bookX2Dot(c, cx + 2, y + 19, '#F8F8F8'); }
  else { Pix.rect(c, cx - 3, y + 19, 7, 1, '#300000'); bookX2Dot(c, cx - 2, y + 20, '#F8F8F8'); bookX2Dot(c, cx + 2, y + 20, '#F8F8F8'); }
  // the screen: scanlines, a bar of light rolling down, a flicker now and then
  c.globalAlpha = 0.22; c.fillStyle = '#000000';
  for (let j = 1; j < h; j += 2) c.fillRect(x, y + j, w, 1);
  c.globalAlpha = 0.12; c.fillStyle = '#F8F8F8'; c.fillRect(x, y + ((t >> 1) % (h + 8)) - 4, w, 3);
  c.globalAlpha = 1;
  if (t % 97 < 3) for (let j = 0; j < h; j += 3) Pix.rect(c, x + ((j * 7 + t) % 9) - 4, y + j, w, 1, j & 1 ? '#5C5C5C' : '#9C9C9C');
  c.restore();
}

// the stadium of CIRCUIT ZERO in the dead city at night (still parts, kept): towers, the stand, the sign, the track
function bookX2Stadium() {
  return bookX2Once('stadium', INTRO_W, INTRO_H, c => {
    Pix.bands(c, 0, 26, ['#06020E', '#0C0420', '#140830', '#200C40', '#2C1048']);
    Pix.stars(c, 18, 21, 0, 16);
    // the dead city: towers, a few lit windows
    const r = seeded(9);
    for (let x = 30; x < INTRO_W;) {
      const w = 6 + Math.floor(r() * 9), h = 8 + Math.floor(r() * 16), top = 26 - h;
      Pix.rect(c, x, top, w, h, r() < 0.5 ? '#141420' : '#1A1A2A'); Pix.rect(c, x, top, 1, h, '#24243A');
      if (r() < 0.3) Pix.rect(c, x + (w >> 1), top - 4, 1, 4, '#24243A');
      for (let y = top + 2; y < 24; y += 3) for (let xx = x + 1; xx < x + w - 1; xx += 2) if (r() < 0.22) bookX2Dot(c, xx, y, ['#38F8F8', '#F838A8', '#F8D838', '#585870'][Math.floor(r() * 4)]);
      x += w + Math.floor(r() * 3);
    }
    // the grandstand: its roof, its tiers (the crowd goes on them, moving), a wall in front
    bookX2Poly(c, [[44, 22], [112, 22], [112, 25], [42, 25]], '#2C2C3C'); Pix.rect(c, 42, 25, 70, 1, '#4C4C64');
    for (let y = 26; y < 37; y++) Pix.rect(c, 40 - (y - 26) * 0.3, y, 80, 1, y % 3 === 0 ? '#1C1C28' : '#141420');
    for (const x of [48, 70, 92]) Pix.rect(c, x, 22, 1, 15, '#3C3C50');
    Pix.rect(c, 0, 36, INTRO_W, 3, '#24243A'); Pix.rect(c, 0, 36, INTRO_W, 1, '#38F8F8');   // the wall, a cyan strip of light
    // the floodlight towers
    for (const x of [44, 108]) { Pix.rect(c, x, 4, 1, 32, '#3C3C50'); Pix.rect(c, x - 3, 2, 7, 3, '#4C4C64'); for (let k = 0; k < 3; k++) Pix.rect(c, x - 2 + k * 2, 3, 1, 1, '#F8F8D8'); }
    // the track: a red and white kerb, the asphalt, the start line, a grid box
    for (let x = 0; x < INTRO_W; x += 4) Pix.rect(c, x, 39, 4, 2, (x >> 2) & 1 ? '#F8F8F8' : '#D82800');
    for (let y = 41; y < INTRO_H; y++) for (let x = 0; x < INTRO_W; x++) bookX2Dot(c, x, y, bookX2Ramp(['#1C1C22', '#24242C', '#2C2C34', '#34343C'], 0.25 + (y - 41) / 50 + (seeded(x * 97 + y * 13)() - 0.5) * 0.35, x, y));
    for (let x = 0; x < INTRO_W; x += 10) Pix.rect(c, x, 52, 5, 1, '#F8D838');
    for (let y = 41; y < INTRO_H; y += 2) for (let x = 30; x < 36; x += 2) Pix.rect(c, x, y, 2, 2, ((x + y) >> 1) & 1 ? '#F8F8F8' : '#141414');
    Pix.rect(c, 4, 46, 1, 12, '#F8F8F8'); Pix.rect(c, 4, 46, 8, 1, '#F8F8F8'); Pix.rect(c, 4, 57, 8, 1, '#F8F8F8');
  });
}
// the crowd on the stand: jumping (more when they cheer), waving flags, cameras flashing
function bookX2Crowd(c, t, cheer) {
  const r = seeded(31);
  for (let row = 0; row < 4; row++) for (let x = 41 + row; x < 111; x += 3) {
    const y = 28 + row * 2.6, ph = r(), jump = cheer ? ((t >> 2) + Math.floor(ph * 8)) % 6 < 2 : ((t >> 3) + Math.floor(ph * 16)) % 14 === 0;
    const col = ['#A87858', '#7C4C30', '#3C8C38', '#7C6898', '#A89058', '#7C7C7C'][Math.floor(r() * 6)], shirt = ['#7C1400', '#886400', '#1C5C88', '#881C5C', '#3C3C48'][Math.floor(r() * 5)];
    const yy = Math.round(y - (jump ? 1 : 0));
    Pix.rect(c, x, yy + 1, 2, 2, shirt); bookX2Dot(c, x, yy, col); bookX2Dot(c, x + 1, yy, col);
    if (jump && ph > 0.6) { bookX2Dot(c, x - 1, yy - 1, col); bookX2Dot(c, x + 2, yy - 1, col); }
  }
  for (const [x, k] of [[52, 0], [80, 1], [100, 2]]) { const w = Math.round(Math.sin(t / 6 + k)); Pix.rect(c, x, 24, 1, 6, '#BCBCBC'); Pix.rect(c, x + 1, 24 + w * 0.5, 4, 2, k === 1 ? '#3CBCFC' : '#D82800'); Pix.rect(c, x + 1, 26 + w * 0.5, 4, 1, k === 1 ? '#F8F8F8' : '#F8B800'); }
  for (let k = 0; k < 3; k++) {
    const q = (t + k * 23) % 40;
    if (q >= 3) continue;
    const x = 44 + ((k * 31 + Math.floor((t + k * 23) / 40) * 17) % 64), y = 27 + ((k * 7 + Math.floor(t / 40)) % 9);
    bookX2Dot(c, x, y, '#FFFFFF');
    if (q < 2) for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) bookX2Dot(c, x + dx, y + dy, '#F8F8F8');
  }
}
// a neon sign, its letters buzzing on and off now and then
function bookX2Neon(c, t, text, x, y, col, dim) {
  for (let i = 0; i < text.length; i++) {
    const k = BOOK_X2_TINY[text[i]], lx = x + i * 4, off = (Math.floor(t / 6) * 7 + i * 13) % 53 === 0;
    if (!k) continue;
    for (let q = 0; q < 15; q++) if (k[q] === '1') { const px = lx + (q % 3), py = y + Math.floor(q / 3); for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) bookX2Dot(c, px + dx, py + dy, dim); }
    for (let q = 0; q < 15; q++) if (k[q] === '1') bookX2Dot(c, lx + (q % 3), y + Math.floor(q / 3), off ? dim : col);
  }
}
// the stadium's big screen on its pylon (x 2..39): the frame, and a picture in it
function bookX2Jumbo(c, t, draw) {
  Pix.rect(c, 19, 30, 4, 10, '#3C3C50'); Pix.rect(c, 19, 30, 1, 10, '#5C5C78');
  Pix.rect(c, 2, 1, 38, 31, '#3C3C50'); Pix.rect(c, 2, 1, 38, 1, '#7C7C98'); Pix.rect(c, 3, 2, 36, 29, '#101018');
  for (let k = 0; k < 9; k++) bookX2Dot(c, 4 + k * 4, 31, ((t >> 3) + k) & 1 ? '#F8D838' : '#7C6C20');   // chaser lights
  draw(4, 3, 34, 27);
}
// a little gold crown (the champion's), x the middle, y its base
function bookX2Crown(c, x, y, glint) {
  bookX2Poly(c, [[x - 4, y], [x - 4, y - 4], [x - 2, y - 2], [x, y - 5], [x + 2, y - 2], [x + 4, y - 4], [x + 4, y]], (px, py) => (glint && py < y - 3 ? '#FCF0C0' : px < x ? '#F8D878' : '#F8B800'));
  Pix.rect(c, x - 4, y - 1, 8, 1, '#AC7C00'); bookX2Dot(c, x, y - 2, '#D82800');
}

const BOOK_X2_KRAGG_PIC = {
  intro(c, t) {
    c.drawImage(bookX2Stadium(), 0, 0);
    // searchlights sweeping the sky
    for (const [x0, ph] of [[60, 0], [96, 2]]) { const a = Math.sin(t / 50 + ph) * 0.5; for (let k = 4; k < 30; k++) Art.dith(c, Math.round(x0 + Math.sin(a) * k * 1.4), Math.round(22 - k * 0.8), 2, 1, '#585880', k + (t >> 2)); }
    for (let k = 0; k < 4; k++) bookX2Neon(c, t + k * 17, 'ZERO'[k], 101, 4 + k * 6, '#F8A8E0', '#9C1870');
    bookX2Crowd(c, t, false);
    bookX2Jumbo(c, t, (x, y, w, h) => bookX2KraggFace(c, x, y, w, h, t, 'laugh'));
    if ((t >> 4) & 1) Pix.rect(c, 5, 4, 2, 2, '#F83800');
    // your tank on the grid, small; his, revving: it rocks on its tracks, flames from its pipes
    Art.tank(c, 7, 49, 0, false, t >> 3);
    const rev = (t % 60) < 30, bx = 34, by = 18 + (rev && (t & 2) ? 1 : 0);
    for (let y = 58; y < 62; y++) Art.dith(c, bx + 8, y, 72, 1, '#0C0C10', y & 1);
    c.drawImage(bookX2KraggTank({ f: t >> 1 }), bx, by);
    for (let k = 0; k < 2; k++) { const fl = rev ? 3 + ((t + k * 3) >> 1) % 3 : 1; for (let j = 0; j < fl; j++) Pix.rect(c, bx + 76 + k * 3 + j, by + 18 - j, 2, 2, j < 1 ? '#F8F8F8' : j < 3 ? '#F8B800' : '#F83800'); }
    Art.smoke(c, bx + 82, by + 14, t, 4, 7, true);
    bookX2Kragg(c, bx + 46, by + 11, t, 'hatch');
  },
  outro(c, t) {
    c.drawImage(bookX2Stadium(), 0, 0);
    // fireworks over the city
    for (let k = 0; k < 4; k++) { const q = (t + k * 37) % 90; if (q < 60) bookX2Firework(c, 52 + ((k * 29 + Math.floor((t + k * 37) / 90) * 23) % 56), 5 + (k * 5) % 10, q / 60, ['#F838A8', '#38F8F8', '#F8D838', '#58F858'][k]); }
    bookX2Neon(c, t, 'CIRCUIT ZERO', 56, 16, '#F8A8E0', '#9C1870');
    bookX2Crowd(c, t, true);
    // the screen shows the winner: you, with his crown
    bookX2Jumbo(c, t, (x, y, w, h) => {
      Pix.rect(c, x, y, w, h, '#000C28');
      for (let k = 0; k < 6; k++) { const a = t / 30 + k * Math.PI / 3; Pix.line(c, x + 17, y + 17, Math.round(x + 17 + Math.cos(a) * 22), Math.round(y + 17 + Math.sin(a) * 22), '#0C2050'); }
      c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip();
      if ((t >> 4) & 1) bookX2Tiny(c, 'WINNER', x + 6, y + 2, '#F8D838');
      Art.tank(c, x + 9, y + 15, 0, false, t >> 3);
      bookX2Crown(c, x + 17, y + 14 + Math.round(Math.sin(t / 8)), (t >> 3) % 4 === 0);
      c.globalAlpha = 0.2; c.fillStyle = '#000000'; for (let j = 1; j < h; j += 2) c.fillRect(x, y + j, w, 1); c.globalAlpha = 1;
      c.restore();
    });
    // his tank on its back against the tyre wall, its tracks still spinning, smoking; a wheel rolling away
    for (let y = 58; y < 63; y++) Art.dith(c, 56, y, 56, 1, '#0C0C10', y & 1);
    for (let k = 0; k < 5; k++) for (let j = 0; j < 2; j++) { const x = 100 + j * 6, y = 59 - k * 4; Pix.rect(c, x, y, 6, 4, '#141414'); Pix.rect(c, x + 1, y + 1, 4, 1, (k + j) & 1 ? '#F8F8F8' : '#D82800'); }
    Art.flipV(c, 80, 48, g => g.drawImage(bookX2KraggTank({ wreck: true, f: t }), 0, 0), 50, 15 + Math.round(Math.sin(t / 9) * 0.4));
    Art.smoke(c, 76, 40, t, 5, 3, true); Art.smoke(c, 96, 38, t, 4, 8, true); Art.fire(c, 84, 47, 6, t); Art.sparks(c, 70, 50, t, 6);
    Art.wheel(c, Math.round(42 + ((t % 120) / 120) * 8), 59, 3, '#6C6C6C', '#A8A8A8');
    // the Baron on the asphalt, seeing stars
    bookX2Kragg(c, 54, 53, t, 'sit');
    Art.stars(c, 53, 37, t);
    // you on the podium, his crown on your turret, the chequered flag waving
    Pix.rect(c, 8, 52, 24, 12, '#C8C8C8'); Pix.rect(c, 8, 52, 24, 1, '#F8F8F8'); Pix.rect(c, 2, 56, 7, 8, '#9C9C9C'); bookX2Tiny(c, '1', 19, 56, '#D82800');
    Art.tank(c, 12, 43, 0, false, t >> 3);
    bookX2Crown(c, 21, 43 + Math.round(Math.sin(t / 10)), (t >> 3) % 4 === 0);
    Pix.rect(c, 33, 34, 1, 30, '#BCBCBC');
    for (let i = 0; i < 8; i++) for (let j = 0; j < 6; j++) Pix.rect(c, 34 + i, 34 + j + Math.round(Math.sin(t / 5 + i * 0.7) * 1.2), 1, 1, ((i >> 1) + (j >> 1)) & 1 ? '#141414' : '#F8F8F8');
    bookX2Confetti(c, t, 22, 5, ['#F838A8', '#38F8F8', '#F8D838', '#58F858', '#F8F8F8']);
  },
  bubble(t, outro) {
    const q = t % 260;
    if (!outro) return q > 40 && q < 120 ? { text: 'KNEEL!', x: 42, y: 8 } : q > 150 && q < 230 ? { text: 'ROOKIE!', x: 38, y: 8 } : null;
    return q > 80 && q < 220 ? { text: 'MY CROWN!', x: 50, y: 20, tail: 4 } : null;
  },
};

BOOK_EXTRA_ART.rally_kragg = {
  name: 'BARON KRAGG', mode: 'TANK RALLY', pts: 0, desc: 'THE UNBEATEN CHAMPION',
  draw(ctx, t, outro) {
    bookX2Screen(ctx, t, outro, {
      name: 'BARON KRAGG', warn: 'WARNING! FINAL BOSS', won: 'YOU ARE THE CHAMPION!',
      tale: { intro: ['THE CHAMPION. NEVER BEATEN.', 'ONLY A WIN TAKES HIS CROWN'], outro: ['BARON KRAGG IS DETHRONED', 'THE CROWN IS YOURS!'] },
      intro: BOOK_X2_KRAGG_PIC.intro, outro: BOOK_X2_KRAGG_PIC.outro, bubble: BOOK_X2_KRAGG_PIC.bubble,
    });
  },
};

// =================================================================== THE REGENT (DESERT DOMINION: the last mission)
// his colours (rtscampaign.js's portrait): pale violet skin, long black hair, a silver crown with purple stones, the great
// fan collar, purple robes, gold; his PRAETORIANS (rtsart_units.js): gold helmets crested in his purple, cream armour
const BOOK_X2_PURPLE = ['#100418', '#280C40', '#481C70', '#7038A8', '#A070D8', '#D0B0F8'];
const BOOK_X2_SILVER = ['#303040', '#606078', '#9898B0', '#D0D0E0', '#FFFFFF'];
const BOOK_X2_PALE = ['#2C2030', '#5C4C60', '#8C7C90', '#B8A8BC', '#DCD0E0', '#F4F0F8'];
const BOOK_X2_RGOLD = ['#4C3000', '#8C6410', '#C89828', '#F0C850', '#FCECA8'];
const BOOK_X2_HALL = ['#0C0814', '#1C1628', '#2C2438', '#4C4058', '#786C80', '#A89CA8', '#D8D0C8'];
const BOOK_X2_ARMOUR = ['#3C2804', '#6C4C08', '#986C10', '#C89C30', '#E0B848', '#F8E8A0', '#F8F0D0'];

// a praetorian standing guard, from the front (20 x 40 canvas, feet at the bottom): his gun held upright at his side;
// side 1 = the gun on his left (mirrored); glow: the eyes in his visor lit
function bookX2Praetorian(t, side, glow, k = 0) {
  const cv = bookX2Scratch('prae' + k, 20, 40), c = cv.getContext('2d'), A = BOOK_X2_ARMOUR, P = BOOK_X2_PURPLE, X = 10;
  if (side) { c.save(); c.translate(20, 0); c.scale(-1, 1); }
  const br = Math.round(Math.sin(t / 30 + k) * 0.5);
  // the cape behind him
  bookX2Poly(c, [[X - 6, 14 + br], [X + 6, 14 + br], [X + 7, 36], [X - 7, 36]], (x, y) => bookX2Ramp(P.slice(1, 4), 0.6 - (y - 14) / 40 - (x - X) / 30, x, y));
  // legs: gold greaves, dark boots
  for (const s of [-1, 1]) { Pix.rect(c, X + s * 2 - 1, 30, 3, 6, A[s < 0 ? 4 : 3]); Pix.rect(c, X + s * 2 - 1, 30, 1, 6, A[5]); Pix.rect(c, X + s * 2 - 2, 36, 4, 2, '#181010'); }
  // a kilt of strips, a belt
  for (let x = X - 5; x < X + 5; x++) Pix.rect(c, x, 25 + br, 1, 5, (x & 1) ? P[3] : A[4]);
  Pix.rect(c, X - 5, 24 + br, 10, 2, A[3]); bookX2Dot(c, X - 1, 24 + br, A[6]); bookX2Dot(c, X, 24 + br, A[6]);
  // the breastplate, the tabard with his crown on it
  bookX2Poly(c, [[X - 5, 13 + br], [X + 5, 13 + br], [X + 5, 24 + br], [X - 5, 24 + br]], (x, y) => bookX2Ramp(A.slice(2), 0.95 - (x - X + 5) / 12 - (y - 13) / 40, x, y));
  Pix.rect(c, X - 2, 17 + br, 4, 9, P[3]); Pix.rect(c, X - 2, 17 + br, 1, 9, P[4]);
  Pix.rect(c, X - 1, 19 + br, 2, 1, A[5]); bookX2Dot(c, X - 1, 18 + br, A[5]); bookX2Dot(c, X, 18 + br, A[4]);
  // great shoulder plates
  for (const s of [-1, 1]) bookX2Ell(c, X + s * 6, 14.5 + br, 3, 2.5, (x, y, nx, ny) => bookX2Ramp(A.slice(2), 0.85 - ny * 0.4 - nx * 0.2, x, y));
  // arms: one at his side, a gauntlet; the other holds the gun upright
  Pix.rect(c, X - 8, 16 + br, 2, 8, A[3]); Pix.rect(c, X - 8, 23 + br, 2, 2, A[2]);
  Pix.rect(c, X + 6, 16 + br, 2, 5, A[3]); Pix.rect(c, X + 7, 20 + br, 3, 3, A[2]);
  // the gun: a long rocket tube, its head up by his crest
  Pix.rect(c, X + 7, 1, 3, 34, '#585860'); Pix.rect(c, X + 7, 1, 1, 34, '#9C9CA8'); Pix.rect(c, X + 9, 1, 1, 34, '#303038');
  Pix.rect(c, X + 6, 0, 5, 4, '#6C6C78'); Pix.rect(c, X + 6, 0, 5, 1, '#BCBCC8'); bookX2Dot(c, X + 8, 1, '#101014');
  Pix.rect(c, X + 6, 12, 5, 2, A[3]);
  // the helmet: gold, a T-shaped visor, a purple crest from front to back, cheek guards
  bookX2Ell(c, X, 8 + br, 4.5, 5, (x, y, nx, ny) => bookX2Ramp(A.slice(2), 0.9 - nx * 0.35 - ny * 0.3, x, y));
  Pix.rect(c, X - 4, 9 + br, 2, 4, A[3]); Pix.rect(c, X + 2, 9 + br, 2, 4, A[2]);
  Pix.rect(c, X - 3, 8 + br, 6, 1, '#100808'); Pix.rect(c, X - 1, 8 + br, 2, 4, '#100808');
  if (glow) { bookX2Dot(c, X - 2, 8 + br, '#E0C0F8'); bookX2Dot(c, X + 1, 8 + br, '#E0C0F8'); }
  for (let y = 0; y < 6; y++) { const w = y < 2 ? 1 : 2; Pix.rect(c, X - w + 1, 1 + y + br - (y < 1 ? 0 : 0), w * 2 - 1 + (y > 1 ? 1 : 0), 1, y < 2 ? P[5] : P[4]); }
  for (let y = 0; y < 5; y++) bookX2Dot(c, X - 1 + ((y + (t >> 3)) & 1), 1 + y + br, P[5]);
  Pix.rect(c, X - 1, 12 + br, 2, 1, A[1]);
  if (side) c.restore();
  return bookX2Outline(cv, '#08040C');
}

// the throne (still, kept): a tall golden back with a crown on top, purple velvet, lion-clawed arms
function bookX2Throne() {
  return bookX2Once('throne', INTRO_W, INTRO_H, c => {
    const G = BOOK_X2_RGOLD, P = BOOK_X2_PURPLE, back = [[40, 41], [40, 13], [44, 8], [50, 5], [56, 2], [62, 5], [68, 8], [72, 13], [72, 41]];
    bookX2Poly(c, back, (x, y) => bookX2Ramp(G, 0.9 - (x - 40) / 40 - y / 120, x, y));
    bookX2Poly(c, [[43, 41], [43, 14], [46, 10], [51, 8], [56, 5.5], [61, 8], [66, 10], [69, 14], [69, 41]], (x, y) => bookX2Ramp(['#08040C', '#140A1C', '#20142C', '#2C1C3C'], 0.6 - (y - 5) / 70 + (Math.floor(x / 3) & 1 ? 0.08 : -0.04), x, y));
    for (let y = 16; y < 40; y += 6) for (const x of [41, 71]) bookX2Dot(c, x, y, '#E0C0F8');
    bookX2Crown(c, 56, 4, false); Pix.rect(c, 52, 3, 8, 1, '#AC7C00');
    // the seat and the arms
    Pix.rect(c, 42, 37, 28, 4, G[2]); Pix.rect(c, 42, 37, 28, 1, G[4]);
    for (const [x, s] of [[36, -1], [68, 1]]) {
      bookX2Poly(c, [[x, 31], [x + 8, 31], [x + 8, 36], [x, 36]], (px, py) => bookX2Ramp(G, 0.85 - (py - 31) / 8 - (px - x) / 30, px, py));
      Pix.rect(c, x, 31, 8, 1, G[4]);
      for (let k = 0; k < 3; k++) bookX2Dot(c, x + (s < 0 ? 0 : 7), 32 + k * 2, G[0]);
      Pix.rect(c, x + 1, 36, 6, 5, P[2]); Pix.rect(c, x + 1, 36, 1, 5, P[3]);
    }
    Pix.rect(c, 42, 41, 3, 3, G[2]); Pix.rect(c, 67, 41, 3, 3, G[1]);
    bookX2Outline(c.canvas, '#08040C');
  });
}

// the Regent: pose 'throne' (sitting, his sceptre, the collar spread) or 'kneel' (head bowed, crownless, on the sand)
function bookX2Regent(c, x, y, t, pose) {
  const cv = bookX2Scratch('regent', 40, 46), g = cv.getContext('2d'), X = 20, P = BOOK_X2_PURPLE, S = BOOK_X2_PALE, G = BOOK_X2_RGOLD, HAIR = ['#080810', '#181828', '#303048', '#484868'];
  if (pose === 'kneel') {
    // the collar, drooping behind his shoulders
    bookX2Ell(g, X, 30, 11, 8, (px, py, nx, ny) => {
      if (ny > 0) return null;
      const r = Math.sqrt(nx * nx + ny * ny), ray = Math.floor((Math.atan2(ny, nx) + 4) * 5) & 1;
      return r > 0.88 ? G[2] : ray ? P[2] : P[4];
    });
    // his robes pooled on the sand round his knees, gold at the hem
    bookX2Poly(g, [[X - 9, 37], [X + 9, 37], [X + 12, 43], [X + 11, 45], [X - 11, 45], [X - 12, 43]], (px, py) => bookX2Ramp(P.slice(1), 0.6 - (px - X) / 40 + (Math.floor((px - X) / 3) & 1 ? 0.06 : -0.06), px, py));
    for (let px = X - 11; px <= X + 11; px++) bookX2Dot(g, px, 44, (px & 1) ? G[3] : G[2]);
    // the body, bent forward; the gold line down his front
    bookX2Poly(g, [[X - 6, 30], [X + 6, 30], [X + 7, 38], [X - 7, 38]], (px, py) => bookX2Ramp(P.slice(1), 0.75 - (px - X + 6) / 18 - (py - 30) / 30, px, py));
    Pix.rect(g, X, 33, 1, 6, G[3]);
    // his arms down in pale sleeves, his hands flat on the sand
    for (const s of [-1, 1]) { Pix.line(g, X + s * 6, 30, X + s * 10, 39, s < 0 ? P[5] : P[4], 2); Pix.rect(g, X + s * 10 - (s < 0 ? 1 : 0), 40, 3, 2, S[4]); bookX2Dot(g, X + s * 10 - (s < 0 ? 1 : 0), 41, S[2]); }
    // the head bowed: the black hair parted on top, falling either side of a pale face, eyes shut; the crown gone
    bookX2Ell(g, X, 31, 4.2, 5, (px, py, nx, ny) => bookX2Ramp(S.slice(1), 0.8 - nx * 0.35 - ny * 0.1, px, py));
    bookX2Ell(g, X, 28.5, 4.6, 3, (px, py, nx, ny) => (ny > 0.4 ? null : bookX2Ramp(HAIR, 0.7 - nx * 0.4 - ny * 0.3, px, py)));
    for (const s of [-1, 1]) Pix.rect(g, X + s * 4 - (s < 0 ? 0 : 1), 29, 1, 8, HAIR[1]);
    bookX2Dot(g, X, 27, HAIR[3]);
    Pix.rect(g, X - 3, 31, 2, 1, '#2C2030'); Pix.rect(g, X + 1, 31, 2, 1, '#2C2030');
    Pix.rect(g, X - 1, 34, 3, 1, '#502040');
  } else {
    // the great fan collar behind his head: purple rays, a gold rim
    bookX2Ell(g, X, 21, 16, 15, (px, py, nx, ny) => {
      if (ny > 0.35) return null;
      const r = Math.sqrt(nx * nx + ny * ny);
      const ray = Math.floor((Math.atan2(ny, nx) + 4) * 5) & 1;
      return r > 0.9 ? G[r > 0.96 ? 2 : 3] : r > 0.8 ? (ray ? G[1] : G[2]) : ray ? bookX2Ramp(P.slice(1, 4), 0.7 - ny * 0.3, px, py) : bookX2Ramp(P.slice(3), 0.75 + ny * 0.4, px, py);
    });
    // long black hair, down to his shoulders
    bookX2Ell(g, X, 17, 7, 9, (px, py, nx) => bookX2Ramp(HAIR, 0.55 - nx * 0.4, px, py));
    // robes: wide shoulders, a gold line down the middle, falling over the seat
    bookX2Poly(g, [[X - 9, 26], [X + 9, 26], [X + 11, 33], [X + 11, 40], [X - 11, 40], [X - 11, 33]], (px, py) => bookX2Ramp(P.slice(1), 0.85 - (px - X + 9) / 26 - (py - 26) / 40, px, py));
    bookX2Poly(g, [[X - 10, 36], [X + 10, 36], [X + 9, 45], [X - 9, 45]], (px, py) => bookX2Ramp(P.slice(1), 0.7 - (px - X + 10) / 30 - (py - 36) / 30 + (Math.floor((px - X) / 3) & 1 ? 0.05 : -0.05), px, py));
    Pix.rect(g, X, 26, 1, 20, G[3]); Pix.rect(g, X - 4, 26, 9, 1, G[3]); bookX2Dot(g, X, 27, '#C8A0F8');
    // hands: one on the arm of the throne, the other round his sceptre
    Pix.line(g, X - 8, 28, X - 11, 33, P[3], 2); Pix.rect(g, X - 13, 33, 3, 2, S[3]);
    Pix.line(g, X + 8, 28, X + 10, 31, P[2], 2);
    Pix.rect(g, X + 11, 7, 1, 32, G[3]); Pix.rect(g, X + 12, 7, 1, 32, G[1]);
    Pix.rect(g, X + 10, 30, 3, 2, S[3]);
    Pix.rect(g, X + 10, 7, 4, 1, G[3]);
    // the face: long, pale; narrow eyes; a thin, cold mouth
    bookX2Ell(g, X, 16.5, 4.6, 6.5, (px, py, nx, ny) => bookX2Ramp(S.slice(1), 0.85 - nx * 0.35 - ny * 0.2, px, py));
    Pix.rect(g, X - 1, 22, 3, 3, S[2]);   // the neck
    for (const s of [-1, 1]) { Pix.rect(g, X + (s < 0 ? -4 : 2), 14, 3, 1, '#181020'); Pix.rect(g, X + (s < 0 ? -4 : 2), 15, 3, 1, (t >> 2) % 40 < 2 ? '#F0E0FF' : '#B080F0'); bookX2Dot(g, X + (s < 0 ? -3 : 3), 15, '#100418'); }
    for (let k = 0; k < 4; k++) bookX2Dot(g, X, 15 + k, S[4]);
    Pix.rect(g, X - 2, 20, 5, 1, '#502040');
    for (const s of [-1, 1]) Pix.rect(g, X + s * 5 - (s < 0 ? 0 : 1), 13, 1, 10, HAIR[1]);   // hair either side of the face
    // the crown: silver, three points, purple stones
    bookX2Poly(g, [[X - 5, 11], [X - 5, 6], [X - 3, 8], [X, 3], [X + 3, 8], [X + 5, 6], [X + 5, 11]], (px, py) => bookX2Ramp(BOOK_X2_SILVER, 0.95 - (px - X + 5) / 13 - (py - 3) / 20, px, py));
    Pix.rect(g, X - 5, 10, 11, 1, BOOK_X2_SILVER[1]);
    bookX2Dot(g, X, 6, '#C8A0F8'); bookX2Dot(g, X - 4, 8, '#9858D8'); bookX2Dot(g, X + 4, 8, '#9858D8');
  }
  bookX2Outline(cv, '#08040C');
  // over the outline: the sceptre's orb glowing, the crown's glint
  if (pose !== 'kneel') {
    const p = 0.5 + 0.5 * Math.sin(t / 12), orb = (t % 200) < 24;
    if (orb) for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4 + t / 10, d = 4 + ((t >> 1) & 1); bookX2Dot(g, Math.round(X + 12 + Math.cos(a) * d), Math.round(4.5 + Math.sin(a) * d), k & 1 ? '#C8A0F8' : '#F0E0FF'); }
    bookX2Ell(g, X + 12, 4.5, 2.6, 2.6, (px, py, nx, ny) => bookX2Ramp(['#401060', '#7038A8', '#B080F0', '#F0E0FF'], 0.55 + p * 0.3 - nx * 0.3 - ny * 0.3, px, py));
    if ((t >> 3) % 9 === 0) { Pix.rect(g, X, 1, 1, 5, '#FFFFFF'); Pix.rect(g, X - 2, 3, 5, 1, '#FFFFFF'); }
  }
  c.drawImage(cv, Math.round(x - X), Math.round(y));
}

// the throne room (still parts, kept): pale stone in violet shadow, pillars, his banners, the rose window, the dais
function bookX2Hall() {
  return bookX2Once('hall', INTRO_W, INTRO_H, c => {
    const H = BOOK_X2_HALL, P = BOOK_X2_PURPLE, G = BOOK_X2_RGOLD;
    // the back wall: big blocks, darker up high
    for (let y = 0; y < 44; y++) for (let x = 0; x < INTRO_W; x++) {
      const row = Math.floor(y / 5), bx = (x + (row & 1) * 4) % 8, mortar = y % 5 === 4 || bx === 7;
      bookX2Dot(c, x, y, mortar ? H[0] : bookX2Ramp(H.slice(1, 5), 0.2 + y / 90 + Math.max(0, 0.3 - Math.abs(x - 56) / 80), x, y));
    }
    // the rose window behind the throne: rings of coloured glass in gold leading
    for (let y = 0; y < 30; y++) for (let x = 36; x < 77; x++) {
      const dx = x + 0.5 - 56, dy = y + 0.5 - 14, r = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
      if (r > 19) continue;
      if (r > 17.5) { bookX2Dot(c, x, y, G[2]); continue; }
      const seg = Math.floor((a + Math.PI) / (Math.PI * 2) * (r < 7 ? 8 : 16)), ring = r < 7 ? 0 : r < 12 ? 1 : 2;
      const lead = Math.abs(r - 7) < 0.6 || Math.abs(r - 12) < 0.6 || Math.abs(((a + Math.PI) / (Math.PI * 2) * (r < 7 ? 8 : 16)) % 1) < 0.08 * (r < 7 ? 2 : 1) * (10 / Math.max(r, 3));
      const glass = [['#F0C850', '#C89828'], ['#7038A8', '#A070D8'], ['#2C58B8', '#7038A8']][ring][(seg + ring) & 1];
      bookX2Dot(c, x, y, lead ? '#201810' : glass);
    }
    // pillars: pale stone, fluted, gold capitals and feet
    for (const px of [5, 29, 83, 107]) {
      for (let y = 0; y < 46; y++) for (let x = px - 4; x <= px + 4; x++) bookX2Dot(c, x, y, (x - px + 8) % 3 === 0 ? H[2] : bookX2Ramp(H.slice(2), 0.85 - Math.abs(x - px + 1.5) / 5 - (px > 56 ? 0.08 : 0), x, y));
      Pix.rect(c, px - 5, 2, 11, 2, G[3]); Pix.rect(c, px - 5, 4, 11, 1, G[1]);
      Pix.rect(c, px - 5, 42, 11, 2, G[2]); Pix.rect(c, px - 5, 42, 11, 1, G[4]);
    }
    // his banners, purple, a gold border and crown, hanging between the pillars
    for (const bx of [12, 90]) {
      bookX2Poly(c, [[bx, 5], [bx + 11, 5], [bx + 11, 30], [bx + 5.5, 35], [bx, 30]], (x, y) => (x === bx || x === bx + 10 ? G[2] : bookX2Ramp(P.slice(1, 5), 0.65 - (y - 5) / 50 + (x - bx < 3 ? 0.1 : 0), x, y)));
      Pix.rect(c, bx - 1, 4, 13, 2, G[3]);
      bookX2Crown(c, bx + 5.5, 18, false);
      for (let k = 0; k < 3; k++) bookX2Dot(c, bx + 3 + k * 2, 24, G[3]);
    }
    // the floor: dark marble squares, the dais and its steps, a purple carpet down the middle
    for (let y = 44; y < INTRO_H; y++) for (let x = 0; x < INTRO_W; x++) {
      const z = (y - 40) / 24, u = (x - 56) / (0.5 + z), sq = (Math.floor(u / 8 + 100) + Math.floor((y - 44) / (2 + z * 4))) & 1;
      bookX2Dot(c, x, y, sq ? bookX2Ramp(['#140C1C', '#24182C', '#342840'], 0.3 + z * 0.4, x, y) : bookX2Ramp(['#08040C', '#100818', '#1C1028'], 0.3 + z * 0.4, x, y));
    }
    for (const [y, x0, x1] of [[40, 32, 80], [43, 28, 84], [46, 24, 88]]) { Pix.rect(c, x0, y, x1 - x0, 3, H[3]); Pix.rect(c, x0, y, x1 - x0, 1, H[5]); Pix.rect(c, x0, y + 2, x1 - x0, 1, H[1]); }
    for (let y = 40; y < INTRO_H; y++) { const w = 7 + (y - 40) * 0.45; Pix.rect(c, 56 - w, y, w * 2, 1, (y & 1) && y < 49 ? P[2] : P[3]); bookX2Dot(c, Math.round(56 - w), y, G[3]); bookX2Dot(c, Math.round(56 + w) - 1, y, G[3]); }
  });
}
// a brazier: a gold bowl on a stand, its fire
function bookX2Brazier(c, x, y, t, k) {
  bookX2Glow(c, x, y - 4, 9, 7, '#5C2810', (t >> 3) + k);
  Pix.rect(c, x - 1, y, 3, 6, '#8C6410'); Pix.rect(c, x - 3, y + 6, 7, 1, '#8C6410');
  Pix.rect(c, x - 4, y - 2, 9, 3, '#C89828'); Pix.rect(c, x - 3, y + 1, 7, 1, '#8C6410'); Pix.rect(c, x - 4, y - 2, 9, 1, '#F0C850');
  Art.fire(c, x - 3, y - 2, 7, t + k * 7);
}

// the palace outside (still parts, kept): the Regent's domes, broken and burning, on the desert at dusk
function bookX2Palace() {
  return bookX2Once('palace', INTRO_W, INTRO_H, c => {
    const S = ['#4C4434', '#786C58', '#A49880', '#CCC0A4', '#E8E0CC', '#FCF8EC'], P = BOOK_X2_PURPLE, G = BOOK_X2_RGOLD;
    Pix.bands(c, 0, 42, ['#180828', '#301040', '#582050', '#904058', '#D06850', '#F0A058']);
    Pix.stars(c, 14, 3, 0, 14);
    GxArt.ball(c, 95, 11, 7, 7, ['#F8E8D0', '#E0B898', '#B88070', '#804858', '#482840']);
    // far dunes, the sand
    artHills(c, 42, '#9C5838', 2, 11, 2);
    for (let y = 46; y < INTRO_H; y++) for (let x = 0; x < INTRO_W; x++) bookX2Dot(c, x, y, bookX2Ramp(['#A86838', '#C88848', '#E0A860', '#F0C880'], 0.5 + Math.sin(x / 7 + y * 0.9) * 0.18 + (y - 46) / 50, x, y));
    // the terrace and the hall with its columns
    Pix.rect(c, 14, 44, 84, 4, S[2]); Pix.rect(c, 14, 44, 84, 1, S[4]); Pix.rect(c, 14, 47, 84, 1, S[0]);
    bookX2Poly(c, [[22, 30], [90, 30], [90, 44], [22, 44]], (x, y) => bookX2Ramp(S, 0.75 - (x - 22) / 150 - (y - 30) / 60, x, y));
    for (let x = 25; x < 88; x += 5) { Pix.rect(c, x, 33, 2, 11, S[4]); Pix.rect(c, x + 1, 33, 1, 11, S[2]); Pix.rect(c, x + 2, 33, 2, 11, S[1]); }
    Pix.rect(c, 22, 31, 68, 1, G[3]); Pix.rect(c, 22, 32, 68, 1, G[1]);
    // the great dome on its drum: purple, a hole smashed in it
    Pix.rect(c, 40, 24, 32, 7, S[3]); Pix.rect(c, 40, 24, 32, 1, S[5]); for (let x = 42; x < 71; x += 4) Pix.rect(c, x, 26, 2, 3, '#2C2014');
    bookX2Ell(c, 56, 24, 15, 14, (x, y, nx, ny) => (ny > 0 ? null : bookX2Ramp(P.slice(1), 0.75 - nx * 0.45 - ny * 0.25 + (Math.abs(nx * 4 - Math.round(nx * 4)) < 0.12 ? -0.2 : 0), x, y)));
    bookX2Poly(c, [[60, 12], [66, 11], [70, 15], [68, 19], [63, 18], [61, 15]], '#140608');
    for (const [x0, y0, x1, y1] of [[59, 13, 54, 16], [54, 16, 52, 21], [68, 19, 66, 23], [61, 15, 58, 18]]) Pix.line(c, x0, y0, x1, y1, P[0]);
    // its finial, bent
    Pix.line(c, 55, 10, 51, 4, G[3]); bookX2Dot(c, 50, 3, G[4]); bookX2Dot(c, 51, 3, G[2]);
    // the spires: the left one whole, the right one broken off
    for (const [sx, broke] of [[16, 0], [96, 1]]) {
      const top = broke ? 24 : 14;
      Pix.rect(c, sx - 4, top, 9, 44 - top, S[3]); Pix.rect(c, sx - 4, top, 2, 44 - top, S[4]); Pix.rect(c, sx + 3, top, 2, 44 - top, S[1]);
      for (const wy of [20, 30, 38]) if (wy > top + 2) Pix.rect(c, sx - 1, wy, 3, 4, '#2C2014');
      if (!broke) { bookX2Ell(c, sx + 0.5, 14, 5, 6, (x, y, nx, ny) => (ny > 0 ? null : bookX2Ramp(P.slice(1), 0.75 - nx * 0.45 - ny * 0.2, x, y))); Pix.rect(c, sx, 5, 1, 4, G[3]); }
      else for (const [x, y] of [[-4, -1], [-3, -2], [-1, -1], [0, -3], [2, -2], [4, -1]]) Pix.rect(c, sx + x, top + y, 1, 1 - y, S[3]);
    }
    // the gate
    Pix.rect(c, 52, 36, 9, 8, '#200C08'); bookX2Ell(c, 56.5, 36, 4.5, 3, (x, y, nx, ny) => (ny < 0 ? '#200C08' : null));
    // his banners, torn, either side of the gate
    for (const bx of [40, 68]) { Pix.rect(c, bx, 33, 5, 7, P[3]); Pix.rect(c, bx + 4, 33, 1, 7, P[2]); bookX2Dot(c, bx + 1, 40, P[3]); bookX2Dot(c, bx + 3, 41, P[2]); Pix.rect(c, bx + 2, 35, 1, 1, G[3]); }
    // rubble from the spire on the terrace
    for (const [x, y, w] of [[88, 42, 4], [92, 43, 3], [100, 45, 5], [84, 43, 2]]) { Pix.rect(c, x, y, w, 2, S[3]); Pix.rect(c, x, y, w, 1, S[4]); }
  });
}

const BOOK_X2_REGENT_PIC = {
  intro(c, t) {
    c.drawImage(bookX2Hall(), 0, 0);
    // light through the rose window: shafts falling on the dais, motes drifting in them
    for (let k = 0; k < 5; k++) {
      const x0 = 44 + k * 6, sh = Math.sin(t / 40 + k) > 0.2;
      for (let y = 22; y < 50; y++) if ((y + k + (t >> 2)) & 1 && (sh || y & 2)) bookX2Dot(c, Math.round(x0 + (y - 22) * (k - 2) * 0.35), y, '#7C68A0');
    }
    for (let k = 0; k < 8; k++) { const p = ((t * 0.3 + k * 37) % 60) / 60, x = Math.round(42 + (k * 13) % 28 + Math.sin(t / 30 + k) * 2), y = Math.round(20 + p * 26); if ((t + k * 7) % 40 < 30) bookX2Dot(c, x, y, '#E0D0F8'); }
    c.drawImage(bookX2Throne(), 0, 0);
    bookX2Regent(c, 56, 1, t, 'throne');
    bookX2Brazier(c, 34, 33, t, 0); bookX2Brazier(c, 78, 33, t, 1);
    // his praetorians, either side, at the foot of the steps
    const gl = (t % 160) < 20;
    c.drawImage(bookX2Praetorian(t, 0, gl, 0), 8, 24);
    c.drawImage(bookX2Praetorian(t, 1, gl, 1), 84, 24);
    // their shadows on the marble
    for (const x of [18, 94]) Art.dith(c, x - 7, 62, 14, 2, '#000000', 0);
  },
  outro(c, t) {
    c.drawImage(bookX2Palace(), 0, 0);
    // fireworks over the desert
    for (let k = 0; k < 3; k++) { const q = (t + k * 41) % 100; if (q < 64) bookX2Firework(c, 14 + ((k * 37 + Math.floor((t + k * 41) / 100) * 29) % 84), 4 + (k * 7) % 12, q / 64, ['#F8D838', '#C8A0F8', '#58F858'][k], 12, 10); }
    // the palace burns: fire in the dome and the broken spire, the windows glowing, smoke rising
    for (const [x, y] of [[26, 38], [36, 38], [76, 38], [86, 38]]) Pix.rect(c, x, y, 2, 3, (t + x) % 24 < 12 ? '#F8B800' : '#F87800');
    Art.fire(c, 61, 17, 8, t); Art.fire(c, 92, 24, 9, t + 9); Art.fire(c, 53, 44, 7, t + 3);
    Art.smoke(c, 64, 12, t, 6, 4, true); Art.smoke(c, 96, 20, t, 6, 6, true); Art.smoke(c, 30, 30, t, 3, 2, true);
    // the Regent on his knees in the sand; his crown before him
    for (let y = 58; y < 62; y++) Art.dith(c, 34, y, 22, 1, '#7C4828', y & 1);
    bookX2Regent(c, 45, 16, t, 'kneel');
    const cg = (t >> 3) % 6 === 0;
    Art.rot(c, 14, 10, g => { bookX2Poly(g, [[1, 9], [1, 3], [4, 5], [7, 1], [10, 5], [13, 3], [13, 9]], (px, py) => bookX2Ramp(BOOK_X2_SILVER, 1 - px / 16 - py / 24, px, py)); Pix.rect(g, 1, 8, 12, 1, BOOK_X2_SILVER[1]); bookX2Dot(g, 7, 5, '#C8A0F8'); bookX2Dot(g, 3, 6, '#9858D8'); bookX2Dot(g, 11, 6, '#9858D8'); bookX2Outline(g.canvas, '#08040C'); }, 62, 57, 0.45);
    if (cg) { Pix.rect(c, 62, 50, 1, 5, '#FFFFFF'); Pix.rect(c, 60, 52, 5, 1, '#FFFFFF'); }
    // a praetorian's helmet in the sand, its crest; his gun, broken
    bookX2Ell(c, 80, 58, 3.5, 3, (x, y, nx, ny) => bookX2Ramp(BOOK_X2_ARMOUR.slice(2), 0.8 - nx * 0.3 - ny * 0.3, x, y));
    Pix.rect(c, 78, 58, 4, 1, '#100808'); Pix.rect(c, 76, 55, 8, 1, '#A070D8'); Pix.rect(c, 77, 54, 6, 1, '#D0B0F8');
    Pix.line(c, 84, 61, 92, 59, '#585860'); Pix.line(c, 84, 62, 92, 60, '#303038');
    // your tanks and your flag
    Art.tank(c, 4, 52, 0, false, t >> 3); Art.tank(c, 18, 56, 1, false, t >> 3);
    Art.tank(c, 94, 53, 0, true, t >> 3); Art.flag(c, 102, 43, t);
  },
  bubble(t, outro) {
    const q = t % 300;
    if (!outro) return q > 60 && q < 140 ? { text: 'NO RULES.', x: 68, y: 3, tail: 4 } : q > 170 && q < 250 ? { text: 'NO BORDERS.', x: 64, y: 3, tail: 4 } : null;
    return q > 90 && q < 200 ? { text: 'MERCY...', x: 44, y: 34, tail: 4 } : null;
  },
};

BOOK_EXTRA_ART.rts_regent = {
  name: 'THE REGENT', mode: 'DESERT DOMINION', pts: 0, desc: 'THE OVERLORD OF KHARRA',
  draw(ctx, t, outro) {
    bookX2Screen(ctx, t, outro, {
      name: 'THE REGENT', warn: 'WARNING! FINAL BOSS', won: 'THE CONTEST IS WON!',
      tale: { intro: ['HE BROKE HIS OWN DECREE', 'DESTROY HIS PALACE AND GUARD'], outro: ['THE REGENT KNEELS', 'KHARRA IS YOURS!'] },
      intro: BOOK_X2_REGENT_PIC.intro, outro: BOOK_X2_REGENT_PIC.outro, bubble: BOOK_X2_REGENT_PIC.bubble,
    });
  },
};
