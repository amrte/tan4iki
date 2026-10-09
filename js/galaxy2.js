'use strict';
// =====================================================================
//  GALAXY, sectors 7-12: six more sectors with bosses after flying things from the films and games of the 90s,
//  and new enemies and waves (also mixed into sectors 1-6, and shuffled each time round).
//    sectors 7 EARTH ORBIT    boss CITY KILLER: a giant saucer behind a shield; catch the floppy disk it drops
//                             to upload a virus and bring the shield down; it charges a beam that levels cities
//            8 TIME VORTEX    boss TIME CAR: hits 88 MPH, streaks down the screen leaving two trails of fire,
//                             jumps through time; flux-capacitor fans, clock-tower lightning
//            9 SATURN RINGS   boss MARTIAN SAUCER: a big brain in a glass dome, wingmen saucers, ray guns, a
//                             tractor beam; ACK ACK! A bomb (the yodel) hurts it three times as much
//           10 CYBERSPACE     boss THE CUBE: resistance is futile; it adapts to the weapon that hurts it most,
//                             so switch guns; tractor beam, cutting beam, little cubes that hunt you
//           11 DARK STAR      boss GIANT HEAD: a huge floating face with two hands that slam down at you; it
//                             breathes you in and spits tiles; under the face, a brain
//           12 THE LAST BASE  boss CATS: ALL YOUR BASE ARE BELONG TO US. Time bombs (shoot them), the main
//                             screen's beam, fighters
//    enemies flying toasters (from the old screensaver), the bouncing DVD logo (hit a corner!), flying taxis and
//            police cars in traffic lanes, squid-like sentinels that hunt you, cows flung up from below (holy
//            cow!), marching invaders with a mystery ship, falling blocks, alien fighters, martian saucers
// =====================================================================

// ------------------------------------------------------------------ six more sectors
GX_SECTORS.push(
  { name: 'EARTH ORBIT', sky: '#000814', dust: '#1C2C4C', planet: ['#58B8F8', '#2C7CC8', '#1C8C3C'], swap: { drone: 'attacker' } },
  { name: 'TIME VORTEX', sky: '#04001C', dust: '#3C3CB8', planet: ['#000000', '#000000', '#000000'], noPlanet: true, bg: (c, f) => gxBgVortex(c, f) },
  { name: 'SATURN RINGS', sky: '#0C0804', dust: '#4C3C1C', planet: ['#000000', '#000000', '#000000'], noPlanet: true, bg: (c, f) => gxBgSaturn(c, f), swap: { drone: 'msaucer' } },
  { name: 'CYBERSPACE', sky: '#000800', dust: '#0C4C0C', planet: ['#000000', '#000000', '#000000'], noPlanet: true, bg: (c, f) => gxBgGrid(c, f), swap: { bug: 'sentinel' } },
  { name: 'DARK STAR', sky: '#080000', dust: '#3C0C0C', planet: ['#000000', '#000000', '#000000'], noPlanet: true, bg: (c, f) => gxBgDarkStar(c, f) },
  { name: 'THE LAST BASE', sky: '#06060A', dust: '#2C2C3C', planet: ['#000000', '#000000', '#000000'], noPlanet: true, bg: (c, f) => gxBgBase(c, f) },
);
// the first six get some of the new waves too
GX_PLAN[0] = ['formation', 'swarm', 'invaders', 'rocks', 'swarm', 'formation'];
GX_PLAN[1] = ['formation', 'kamikaze', 'toasters', 'formation', 'bombers', 'formation'];
GX_PLAN[2] = ['rocks', 'formation', 'blocks', 'cows', 'kamikaze', 'formation'];
GX_PLAN[3] = ['formation', 'bombers', 'swarm', 'bounce', 'kamikaze', 'escort'];
GX_PLAN[4] = ['swarm', 'traffic', 'escort', 'rocks', 'bombers', 'formation'];
GX_PLAN[5] = ['escort', 'sentinels', 'formation', 'kamikaze', 'bombers', 'escort'];
GX_PLAN.push(
  ['formation', 'traffic', 'invaders', 'escort', 'kamikaze', 'formation'],
  ['swarm', 'traffic', 'rocks', 'cows', 'formation', 'toasters'],
  ['formation', 'rocks', 'invaders', 'bombers', 'escort', 'formation'],
  ['sentinels', 'blocks', 'toasters', 'bounce', 'sentinels', 'formation'],
  ['escort', 'swarm', 'kamikaze', 'sentinels', 'bombers', 'formation'],
  ['invaders', 'traffic', 'escort', 'blocks', 'sentinels', 'formation'],
);
const GX_ALL_WAVES = ['formation', 'swarm', 'rocks', 'kamikaze', 'bombers', 'escort', 'toasters', 'bounce', 'traffic', 'sentinels', 'cows', 'invaders', 'blocks'];
// the waves of a sector: as planned the first time; each time round after, shuffled with a couple of surprises
function gxPlan(sec, loop, level) {
  const base = GX_PLAN[sec % GX_PLAN.length].slice();
  if (!loop) return base;
  const r = seeded(level * 7919 + 13);
  for (let i = base.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [base[i], base[j]] = [base[j], base[i]]; }
  for (let k = 0; k < 2; k++) base[Math.floor(r() * (base.length - 1))] = GX_ALL_WAVES[Math.floor(r() * GX_ALL_WAVES.length)];
  return base;
}
Object.assign(GX_WAVE_NAMES, { toasters: 'FLYING TOASTERS', bounce: 'SCREENSAVER', traffic: 'RUSH HOUR', sentinels: 'SENTINELS',
  cows: 'HOLY COW!', invaders: 'INVADERS', blocks: 'FALLING BLOCKS' });

// ------------------------------------------------------------------ the new enemies
Object.assign(GX_TYPES, {
  attacker: { w: 14, h: 10, hp: 1, pts: 60, from: 6 },
  msaucer: { w: 14, h: 8, hp: 2, pts: 120, from: 8 },
  toaster: { w: 16, h: 12, hp: 2, pts: 150, from: 1, special: true },
  dvd: { w: 24, h: 12, hp: 8, pts: 500, from: 3, special: true, noFire: true },
  taxi: { w: 20, h: 10, hp: 3, pts: 200, from: 4, special: true, noFire: true },
  police: { w: 20, h: 10, hp: 4, pts: 300, from: 4, special: true },
  sentinel: { w: 14, h: 14, hp: 3, pts: 250, from: 5, special: true, noFire: true },
  cow: { w: 16, h: 12, hp: 2, pts: 300, from: 2, special: true, noFire: true },
  invA: { w: 8, h: 8, hp: 1, pts: 30, from: 0, special: true },
  invB: { w: 11, h: 8, hp: 1, pts: 40, from: 0, special: true },
  invC: { w: 12, h: 8, hp: 2, pts: 60, from: 0, special: true },
  mystery: { w: 16, h: 7, hp: 2, pts: 0, from: 0, special: true, noFire: true },
  tetro: { w: 18, h: 12, hp: 6, pts: 250, from: 2, special: true, noFire: true },
  cubelet: { w: 8, h: 8, hp: 2, pts: 100, from: 9, special: true, noFire: true },
  tbomb: { w: 12, h: 12, hp: 5, pts: 300, from: 11, special: true, noFire: true },
});
Object.assign(GX_PALS, {
  attacker: [null, '#C8D0C8', '#7C8C7C', '#3C4C3C', '#F8F8F8', '#58F8F8', '#F8D800', '#081008'],
  msaucer: [null, '#E8E8F8', '#9898B8', '#48486C', '#F8F8F8', '#F8A8C8', '#78F878', '#0C0C18'],
  toaster: [null, '#F0F0F8', '#A8A8BC', '#5C5C70', '#F8F8F8', '#E8B860', '#8C4C10', '#101014'],
  taxi: [null, '#F8F878', '#F8D800', '#AC7C00', '#F8F8F8', '#F87830', '#A8E8F8', '#181000'],
  police: [null, '#F8F8F8', '#3C5CF8', '#1C1C8C', '#F8F8F8', '#F83800', '#3CBCFC', '#000018'],
  sentinel: [null, '#9898B8', '#5C5C7C', '#2C2C3C', '#F8F8F8', '#F83800', '#F8B800', '#08080C'],
  cow: [null, '#F8F8F8', '#E8E8E8', '#A8A8A8', '#F8F8F8', '#F8A8B8', '#202020', '#101010'],
  invA: [null, '#58F858', '#58F858', '#58F858', '#F8F8F8', '#F8F8F8', '#F8F8F8', '#041004'],
  invB: [null, '#58F8F8', '#58F8F8', '#58F8F8', '#F8F8F8', '#F8F8F8', '#F8F8F8', '#041010'],
  invC: [null, '#F878F8', '#F878F8', '#F878F8', '#F8F8F8', '#F8F8F8', '#F8F8F8', '#100410'],
  mystery: [null, '#F8B8B8', '#F85878', '#A81838', '#F8F8F8', '#F8F878', '#58F8F8', '#100004'],
  cubelet: [null, '#9C9C9C', '#5C5C5C', '#2C2C2C', '#F8F8F8', '#58F858', '#205C20', '#080808'],
});
// bit pictures: X is the body
const gxBits = (P, rows, c = 2) => rows.forEach((r, y) => [...r].forEach((ch, x) => { if (ch === 'X') P.px(x, y, c); }));
const GX_INVADERS = {
  invA: [['...XX...', '..XXXX..', '.XXXXXX.', 'XX.XX.XX', 'XXXXXXXX', '..X..X..', '.X.XX.X.', 'X.X..X.X'],
    ['...XX...', '..XXXX..', '.XXXXXX.', 'XX.XX.XX', 'XXXXXXXX', '.X.XX.X.', 'X......X', '.X....X.']],
  invB: [['..X.....X..', '...X...X...', '..XXXXXXX..', '.XX.XXX.XX.', 'XXXXXXXXXXX', 'X.XXXXXXX.X', 'X.X.....X.X', '...XX.XX...'],
    ['..X.....X..', 'X..X...X..X', 'X.XXXXXXX.X', 'XXX.XXX.XXX', 'XXXXXXXXXXX', '.XXXXXXXXX.', '..X.....X..', '.X.......X.']],
  invC: [['....XXXX....', '.XXXXXXXXXX.', 'XXXXXXXXXXXX', 'XXX..XX..XXX', 'XXXXXXXXXXXX', '...XX..XX...', '..XX.XX.XX..', 'XX........XX'],
    ['....XXXX....', '.XXXXXXXXXX.', 'XXXXXXXXXXXX', 'XXX..XX..XXX', 'XXXXXXXXXXXX', '..XXX..XXX..', '.XX..XX..XX.', '..XX....XX..']],
};
Object.assign(GX_DRAW, {
  // a boomerang fighter with a glowing cockpit
  attacker(f) {
    const P = bossPainter(14, 10);
    for (let x = 0; x < 14; x++) { const y = Math.round(Math.abs(x - 6.5) * 0.7); P.rect(x, y + 1, x, y + 3, x < 7 ? 1 : 2); P.px(x, y + 4, 3); }
    P.rect(5, 3, 8, 6, 2); P.rect(6, 4, 7, 5, f ? 5 : 4); P.px(0, 5, 6); P.px(13, 5, 6);
    P.outline(); return P.g;
  },
  // a little martian saucer: a glass dome, a brain in it
  msaucer(f) {
    const P = bossPainter(14, 8);
    P.disc(7, 3, 3.2, 6); P.px(6, 2, 5); P.px(7, 2, 5); P.px(7, 3, 5);
    P.ellipse(7, 5.5, 7, 2.5);
    for (const x of [2, 5, 8, 11]) P.px(x, 6, (x + f * 3) % 2 ? 4 : 6);
    P.outline(); return P.g;
  },
  // a chrome toaster on white wings, two slices of toast sticking out
  toaster(f) {
    const P = bossPainter(16, 12);
    for (const [s, x0] of [[-1, 3], [1, 12]]) {   // wings: three feathers each side, up or down
      for (let k = 0; k < 3; k++) { const x = x0 + s * k; if (f) P.line(x, 7, x + s, 10 - k, 4); else P.line(x, 6, x + s, 2 + k, 4); }
    }
    P.rect(5, 0, 6, 3, 5); P.rect(9, 1, 10, 3, 5); P.rect(5, 0, 6, 0, 6); P.rect(9, 1, 10, 1, 6);   // the toast
    P.rect(4, 4, 11, 10, 2); P.rect(4, 4, 11, 4, 1); P.rect(4, 5, 4, 9, 1); P.rect(11, 5, 11, 10, 3); P.rect(4, 10, 11, 10, 3);
    P.rect(5, 4, 6, 4, 7); P.rect(9, 4, 10, 4, 7);   // slots
    P.px(6, 6, 4); P.px(5, 7, 4);   // a shine
    P.rect(12, 6, 12, 7, 3);   // the lever
    P.outline(); return P.g;
  },
  // a flying taxi from the side (facing right): a sign on the roof, thrusters below
  taxi(f) {
    const P = bossPainter(20, 10);
    P.rect(1, 4, 18, 7, 2); P.rect(1, 4, 18, 4, 1); P.rect(1, 7, 18, 7, 3); P.rect(5, 1, 14, 4, 2); P.rect(5, 1, 14, 1, 1);
    P.rect(6, 2, 9, 3, 6); P.rect(11, 2, 13, 3, 6); P.rect(8, 0, 10, 0, 5); P.px(18, 5, 4); P.px(1, 5, 5);
    for (let x = 3; x < 17; x += 3) P.px(x, 6, 3);
    P.px(4, 8, f ? 5 : 4); P.px(15, 8, f ? 4 : 5); P.px(4, 9, 5); P.px(15, 9, 5);
    P.outline(); return P.g;
  },
  police(f) {
    const P = bossPainter(20, 10);
    P.rect(1, 4, 18, 7, 2); P.rect(1, 4, 18, 4, 1); P.rect(1, 7, 18, 7, 3); P.rect(5, 1, 14, 4, 1);
    P.rect(6, 2, 9, 3, 6); P.rect(11, 2, 13, 3, 6); P.rect(8, 0, 9, 0, f ? 5 : 6); P.rect(10, 0, 11, 0, f ? 6 : 5);
    P.rect(4, 5, 15, 6, 1); P.px(18, 5, 4);
    P.px(4, 8, 5); P.px(15, 8, 5); P.px(4, 9, f ? 5 : 4);
    P.outline(); return P.g;
  },
  // a squid machine: a head full of red eyes, tentacles trailing
  sentinel(f) {
    const P = bossPainter(14, 14);
    for (let k = 0; k < 5; k++) { const x0 = 3 + k * 2, sw = ((k + f) % 2 ? 1 : -1); P.line(x0, 6, x0 + sw, 9, 3); P.line(x0 + sw, 9, x0 - sw, 13, 3); }
    P.ellipse(7, 4, 5, 4);
    for (const [x, y] of [[4, 4], [6, 3], [8, 3], [10, 4], [5, 5], [7, 5], [9, 5]]) P.px(x, y, (x + y + f) % 3 ? 5 : 6);
    P.outline(); return P.g;
  },
  // a cow, legs out, flying
  cow(f) {
    const P = bossPainter(16, 12);
    for (const x of [4, 7, 10]) P.line(x, 7, x + (f ? -2 : 1), f ? 11 : 10, 3);
    P.ellipse(7, 5, 6, 3.5);
    P.rect(4, 3, 5, 4, 6); P.rect(8, 5, 9, 6, 6); P.px(3, 6, 6);
    P.rect(12, 2, 15, 6, 1); P.rect(14, 5, 15, 6, 5); P.px(13, 3, 7); P.px(12, 1, 3); P.px(15, 1, 3);   // head, nose, horns
    P.line(1, 4, 0, f ? 2 : 6, 3);   // tail
    P.outline(); return P.g;
  },
  invA(f) { const P = bossPainter(8, 8); gxBits(P, GX_INVADERS.invA[f]); return P.g; },
  invB(f) { const P = bossPainter(11, 8); gxBits(P, GX_INVADERS.invB[f]); return P.g; },
  invC(f) { const P = bossPainter(12, 8); gxBits(P, GX_INVADERS.invC[f]); return P.g; },
  mystery(f) {
    const P = bossPainter(16, 7);
    P.ellipse(8, 2.5, 4, 2.5); P.ellipse(8, 4, 8, 2.5);
    for (const x of [3, 6, 9, 12]) P.px(x, 4, (x + f * 3) % 2 ? 5 : 6);
    P.outline(); return P.g;
  },
  cubelet(f) {
    const P = bossPainter(8, 8);
    P.rect(0, 2, 5, 7, 2); P.rect(2, 0, 7, 1, 1); P.rect(1, 1, 6, 1, 1); P.rect(6, 1, 7, 5, 3);
    P.px(2, 4, f ? 5 : 6); P.px(4, 5, f ? 6 : 5); P.line(1, 3, 4, 3, 6);
    return P.g;
  },
});

// ------------------------------------------------------------------ how they move
const gxGone = e => { e.st = 'gone'; };
Object.assign(GX_MOVES, {
  // toasters: down and to the left, like the old screensaver
  diag: Object.assign(function (e, g) {
    const sp = Math.min(1.4, 0.8 + g.shotSpd * 0.25);
    e.x += e.vx * sp; e.y += e.vy * sp;
    if (e.x < -16 || e.y > FH + 14) gxGone(e);
  }, { init(e) { if (e.lane % 2) { e.x = FW + 12; e.y = 6 + rnd(Math.round(FH * 0.3)); } else { e.x = Math.round(FW * 0.3) + rnd(Math.round(FW * 0.75)); e.y = -10; } e.vx = -(0.8 + Math.random() * 0.25); e.vy = 0.5 + Math.random() * 0.15; } }),
  // the DVD logo: bounces off every edge, a new colour each time; a corner is worth a lot
  bounce: Object.assign(function (e, g) {
    const sp = Math.min(1.3, 0.85 + g.shotSpd * 0.2);
    e.x += e.vx * sp; e.y += e.vy * sp;
    let bx = false, by = false;
    if (e.x < e.w / 2) { e.x = e.w / 2; e.vx = Math.abs(e.vx); bx = true; }
    if (e.x > FW - e.w / 2) { e.x = FW - e.w / 2; e.vx = -Math.abs(e.vx); bx = true; }
    if (e.t > 40 && e.t < 1500 && e.y < e.h / 2) { e.y = e.h / 2; e.vy = Math.abs(e.vy); by = true; }
    if (e.y > FH - e.h / 2) { e.y = FH - e.h / 2; e.vy = -Math.abs(e.vy); by = true; }
    if (bx) e.lastBx = e.t;
    if (by) e.lastBy = e.t;
    if (bx || by) {
      e.v = { c: (e.v.c + 1) % 6 };
      if ((bx && e.t - (e.lastBy ?? -99) < 5) || (by && e.t - (e.lastBx ?? -99) < 5)) this.gxCorner(e);
    }
    if (e.y < -20) gxGone(e);
  }, { init(e) { e.x = 20 + rnd(FW - 40); e.y = -6; e.vx = Math.random() < 0.5 ? -1 : 1; e.vy = 0.75; e.v = { c: rnd(6) }; } }),
  // traffic: a warning arrow at the edge first, then the car zooms across its lane
  lane: Object.assign(function (e) {
    if (e.warnT > 0) { if (--e.warnT === 0) Sound.play('honk'); return; }
    e.x += e.dir * e.spd;
    if ((e.dir > 0 && e.x > FW + 24) || (e.dir < 0 && e.x < -24)) gxGone(e);
  }, { init(e, g) {
    const ys = [0.15, 0.27, 0.42, 0.58, 0.74];
    e.y = Math.round(FH * ys[e.lane]); e.dir = e.lane % 2 ? -1 : 1; e.x = e.dir > 0 ? -22 : FW + 22;
    e.spd = (e.lane >= 2 ? 1.5 : 2.1) + Math.random() * 0.7 * Math.min(1.5, g.shotSpd); e.warnT = 55; e.v = { fl: e.dir < 0 ? 1 : 0 }; e.fireT = 30 + rnd(40);
  } }),
  // sentinels and little cubes: they hunt you down for a while, then leave
  hunt: Object.assign(function (e, g, near) {
    const tg = near(e.x, e.y), cap = (e.type === 'cubelet' ? 1.25 : 1.05) * Math.min(1.35, g.shotSpd);
    if (e.t > 480 || !tg) { e.vy -= 0.07; e.y += e.vy; e.x += e.vx; if (e.y < -20) gxGone(e); return; }
    const dx = tg.x + 8 - e.x, dy = tg.y + 8 - e.y, d = Math.hypot(dx, dy) || 1;
    e.vx += dx / d * 0.06; e.vy += dy / d * 0.06;
    const v = Math.hypot(e.vx, e.vy); if (v > cap) { e.vx *= cap / v; e.vy *= cap / v; }
    e.x += e.vx + Math.sin(e.t / 9) * 0.4; e.y += e.vy;
  }, { init(e) { if (e.x === 0) { e.x = 10 + rnd(FW - 20); e.y = -10; } e.vx = 0; e.vy = 0.6; } }),
  // cows: a warning at the bottom, then up they fly... and down they come
  launch: Object.assign(function (e) {
    if (e.warnT > 0) { if (--e.warnT === 0) Sound.play('moo'); return; }
    e.x += e.vx; e.y += e.vy; e.vy += 0.045;
    e.v = { fl: e.vx < 0 ? 1 : 0 };
    if (e.vy > 0 && e.y > FH + 14) gxGone(e);
  }, { init(e) { e.x = 14 + rnd(FW - 28); e.y = FH + 12; e.vy = -(3.3 + Math.random() * 0.5); e.vx = (Math.random() - 0.5) * 0.9; e.warnT = 50; e.v = { fl: 0 }; } }),
  // invaders march together (see the frame hook below)
  march: Object.assign(function (e, g) {
    const m = g.march;
    if (!m) { e.st = 'dive'; e.t = 0; e.sx = e.x; e.sy = e.y; e.tx = e.x; e.shot = true; return; }
    e.x = e.gx + m.x; e.y = e.gy + m.y;
    if (e.y > FH + 8) gxGone(e);
  }, { init(e, g) { e.x = e.gx + (g.march ? g.march.x : 0); e.y = e.gy + (g.march ? g.march.y : -60); e.fireT = 80 + rnd(300); } }),
  // the mystery ship across the top
  fly: Object.assign(function (e) { e.x += e.dir * 1.1; if (e.x < -20 || e.x > FW + 20) gxGone(e); },
    { init(e) { e.dir = Math.random() < 0.5 ? 1 : -1; e.x = e.dir > 0 ? -16 : FW + 16; e.y = 9; e.v = { fl: e.dir < 0 ? 1 : 0 }; } }),
  // falling blocks: down a step at a time, turning now and then
  drop: Object.assign(function (e, g) {
    if (e.t % Math.max(8, Math.round(18 / Math.min(1.6, g.shotSpd))) === 0) {
      e.y += 6; e.steps = (e.steps || 0) + 1;
      if (e.steps % 3 === 0) { e.v = Object.assign({}, e.v, { r: (e.v.r + 1) % 4 }); gxTetroSize(e); }
      if (e.steps % 4 === 2) { const nx = e.x + (Math.random() < 0.5 ? -6 : 6); if (nx > e.w / 2 + 2 && nx < FW - e.w / 2 - 2) e.x = nx; }
    }
    e.v.n = Math.max(1, Math.ceil(4 * e.hp / e.max));
    if (e.y > FH + 20) gxGone(e);
  }, { init(e) { e.v = { s: rnd(7), r: rnd(4), n: 4 }; gxTetroSize(e); e.x = 6 * (2 + rnd(Math.floor(FW / 6) - 4)); e.y = -14; } }),
  // martian wingmen keep station by their leader's side
  wing: function (e, g) {
    const b = g.boss;
    if (!b) { e.st = 'kami'; e.vy = 0.6; return; }
    const tx = b.x + [-34, 34, -22, 22][e.slot % 4], ty = b.y + [8, 8, 28, 28][e.slot % 4] + Math.sin((this.frame + e.slot * 20) / 20) * 3;
    e.x += (tx - e.x) * 0.1; e.y += (ty - e.y) * 0.1;
  },
  // a time bomb: floats to its spot and counts down
  tbomb: Object.assign(function (e, g) {
    const dx = e.tx - e.x, dy = e.ty - e.y, d = Math.hypot(dx, dy);
    if (d > 1.5) { e.x += dx / d * 1.4; e.y += dy / d * 1.4; }
    e.fuse--;
    e.v = { n: Math.ceil(e.fuse / 70) };
    if (e.fuse % 70 === 0 && e.fuse > 0) Sound.play('tick');
    if (e.fuse <= 0) this.gxBombGoesOff(e);
  }, { init(e) { e.fuse = 230; e.v = { n: 3 }; } }),
});

// a tetromino: its cells (6 pixels each) turned r times, and its size
const GX_TETROS = [
  [[0, 1], [1, 1], [2, 1], [3, 1]], [[1, 0], [2, 0], [1, 1], [2, 1]], [[0, 1], [1, 1], [2, 1], [1, 0]], [[1, 0], [2, 0], [0, 1], [1, 1]],
  [[0, 0], [1, 0], [1, 1], [2, 1]], [[0, 0], [0, 1], [1, 1], [2, 1]], [[2, 0], [0, 1], [1, 1], [2, 1]],
];
const GX_TETRO_COLS = [['#58F8F8', '#1C8C8C'], ['#F8F858', '#8C8C1C'], ['#C878F8', '#5C2C8C'], ['#58F858', '#1C7C1C'], ['#F87858', '#8C2C1C'], ['#5878F8', '#1C2C8C'], ['#F8A838', '#8C5C0C']];
function gxTetroCells(v) {
  let cells = GX_TETROS[v.s];
  for (let k = 0; k < v.r; k++) cells = cells.map(([x, y]) => [3 - y, x]);
  const mx = Math.min(...cells.map(c => c[0])), my = Math.min(...cells.map(c => c[1]));
  return cells.map(([x, y]) => [x - mx, y - my]);
}
function gxTetroSize(e) {
  const c = gxTetroCells(e.v);
  e.w = (Math.max(...c.map(q => q[0])) + 1) * 6; e.h = (Math.max(...c.map(q => q[1])) + 1) * 6;
}

// invaders: the whole block steps sideways, then down a row at the edge, faster as they thin out
GX_FRAME.push(function (g) {
  const m = g.march;
  if (!m || this.freezeE > 0) return;
  const band = g.list.filter(e => e.st === 'march');
  if (!band.length) { if (!g.spawnQ.some(q => q.st === 'march')) g.march = null; return; }
  if (m.y < m.y0) { m.y += 1; return; }
  if (--m.stepT > 0) return;
  m.stepT = Math.max(3, Math.round(band.length * 0.6 / Math.min(1.5, g.shotSpd)));
  const minX = Math.min(...band.map(e => e.gx - e.w / 2)) + m.x, maxX = Math.max(...band.map(e => e.gx + e.w / 2)) + m.x;
  if ((m.dir > 0 && maxX + 3 > FW - 2) || (m.dir < 0 && minX - 3 < 2)) { m.y += 6; m.dir = -m.dir; } else m.x += m.dir * 3;
  Sound.play('march' + (m.k++ % 4));
});

// ------------------------------------------------------------------ how they shoot
const gxFireDown = (g, e, k, spd = 1.4) => g.bullets.push({ x: e.x, y: e.y + e.h / 2, vx: 0, vy: spd * g.shotSpd, k });
Object.assign(GX_FIRE, {
  toaster(e, g) { gxFireDown(g, e, 'toast', 1.2); },
  police(e, g, near) { if (e.warnT > 0 || e.x < 8 || e.x > FW - 8) return 6; this.gxAimed(e, near(e.x, e.y), 1.7); return 9999; },   // one shot as it passes
  msaucer(e, g, near) { const t = near(e.x, e.y); if (t) { const a = Math.atan2(t.y + 8 - e.y, t.x + 8 - e.x); g.bullets.push({ x: e.x, y: e.y + 3, vx: Math.cos(a) * 2.1 * g.shotSpd, vy: Math.sin(a) * 2.1 * g.shotSpd, k: 'ray' }); } },
  attacker(e, g, near) { this.gxAimed(e, near(e.x, e.y), 1.5); },
});
for (const k of ['invA', 'invB', 'invC']) GX_FIRE[k] = function (e, g) {
  // only the one at the bottom of its column fires
  if (g.list.some(o => o !== e && o.st === 'march' && Math.abs(o.gx - e.gx) < 2 && o.gy > e.gy)) return 60 + rnd(120);
  if (g.march && g.march.y < g.march.y0) return 30;
  gxFireDown(g, e, 'zig', 1.5);
  return Math.round((160 + rnd(300)) / Math.max(0.4, g.fireMul));
};

// what touching them does: blocks by their cells; bombs don't go off when you touch them
Object.assign(GX_COLLIDE, {
  tetro(e, t) {
    const c = gxTetroCells(e.v).slice(0, e.v.n), x0 = e.x - e.w / 2, y0 = e.y - e.h / 2, px = t.x + 8, py = t.y + 8;
    return c.some(([cx, cy]) => overlap(px - 5, py - 5, 10, 10, x0 + cx * 6, y0 + cy * 6, 6, 6));
  },
  tbomb() { return false; },
});

// shot down
Object.assign(GX_ON_KILL, {
  mystery(e, p) { const pts = [300, 500, 1000, 1500][rnd(4)] * (1 + this.galaxy.loop); if (p) this.addScore(p, pts); this.popups.push({ x: e.x, y: e.y, text: String(pts), t: 0, delay: 0 }); this.gxDrop(e.x, e.y, 'gem'); return false; },
  cow(e) { this.popups.push({ x: e.x, y: e.y - 6, text: 'MOO!', label: true, color: '#F8F8F8', t: 0, delay: 0, life: 40 }); Sound.play('moo'); },
  tbomb(e) { this.popups.push({ x: e.x, y: e.y - 6, text: 'DEFUSED', label: true, color: '#58F858', t: 0, delay: 0, life: 50 }); return false; },
  dvd(e) { for (let k = 0; k < 3; k++) this.gxDrop(e.x - 6 + k * 6, e.y, 'coin'); },
});

Object.assign(Stage.prototype, {
  // the logo hit a corner exactly: everyone cheers
  gxCorner(e) {
    for (const q of this.players) if (!q.out) this.addScore(q, 2000);
    this.popups.push({ x: e.x, y: e.y, text: 'CORNER!', label: true, color: '#F8D800', t: 0, delay: 0, life: 70 });
    for (let k = 0; k < 3; k++) this.gxDrop(e.x, e.y, 'gem');
    Sound.play('secret');
  },

  // a time bomb goes off: a blast around it and a ring of shots
  gxBombGoesOff(e) {
    const g = this.galaxy;
    g.list = g.list.filter(o => o !== e);
    this.fx.push({ x: e.x, y: e.y, frames: BIG_EXPLOSION(), per: 4, tick: 0 });
    for (let k = 0; k < 12; k++) { const a = k * Math.PI / 6; g.bullets.push({ x: e.x, y: e.y, vx: Math.cos(a) * 1.3 * g.shotSpd, vy: Math.sin(a) * 1.3 * g.shotSpd, k: 'shot' }); }
    for (const t of this.gxPlayers()) if (Math.hypot(t.x + 8 - e.x, t.y + 8 - e.y) < 22) this.hitPlayer(t);
    Sound.play('explode');
  },
});

// ------------------------------------------------------------------ the new waves
Object.assign(GX_WAVE_KINDS, {
  toasters(g, add, types, more) {
    const n = Math.round(12 * more);
    for (let k = 0; k < n; k++) add('toaster', { st: 'diag', lane: k % 3, delay: Math.floor(k / 3) * 55 + (k % 3) * 12 });
  },
  bounce(g, add, types, more) {
    const n = more > 1.25 ? 3 : 2;
    for (let k = 0; k < n; k++) add('dvd', { st: 'bounce', delay: k * 220 });
    for (let k = 0; k < 8; k++) add(k % 2 && types.includes('bug') ? 'bug' : 'drone', { st: 'enter', slot: [FW / 2 - 70 + k * 20, 26], from: k < 4 ? -1 : 1, delay: 30 + k * 8 });
  },
  traffic(g, add, types, more) {
    const n = Math.round(14 * more);
    for (let k = 0; k < n; k++) add(k % 5 === 4 ? 'police' : 'taxi', { st: 'lane', lane: (k * 3 + rnd(2)) % 5, delay: k * 30 });
    for (let k = 0; k < 4; k++) add('drone', { st: 'enter', slot: [FW / 2 - 30 + k * 20, 14], from: k < 2 ? -1 : 1, delay: 20 + k * 10 });
  },
  sentinels(g, add, types, more) {
    const n = Math.round(10 * more);
    for (let k = 0; k < n; k++) add('sentinel', { st: 'hunt', delay: Math.floor(k / 2) * 60 + (k % 2) * 12 });
  },
  cows(g, add, types, more) {
    const n = Math.round(9 * more);
    for (let k = 0; k < n; k++) add('cow', { st: 'launch', delay: 40 + k * 50 });
    for (let k = 0; k < 6; k++) add(types.includes('bug') ? 'bug' : 'drone', { st: 'enter', slot: [FW / 2 - 50 + k * 20, 24], from: k < 3 ? -1 : 1, delay: k * 8 });
  },
  invaders(g, add) {
    const cols = Math.min(8, Math.floor((FW - 40) / 16)), x0 = (FW - (cols - 1) * 16) / 2;
    g.march = { x: 0, y: -64, y0: 22, dir: 1, stepT: 20, k: 0 };
    for (let r = 0; r < 5; r++) for (let c = 0; c < cols; c++) add(r === 0 ? 'invC' : r < 3 ? 'invB' : 'invA', { st: 'march', gx: x0 + c * 16, gy: r * 13, delay: 0 });
    add('mystery', { st: 'fly', delay: 360 }); add('mystery', { st: 'fly', delay: 1100 });
  },
  blocks(g, add, types, more) {
    const n = Math.round(12 * more);
    for (let k = 0; k < n; k++) add('tetro', { st: 'drop', delay: k * 42 });
    for (let k = 0; k < 6; k++) add('drone', { st: 'enter', slot: [FW / 2 - 50 + k * 20, 20], from: k < 3 ? -1 : 1, delay: k * 8 });
  },
});

// ------------------------------------------------------------------ drawing them
const GX_DVD_COLS = ['#F8F8F8', '#F83800', '#58D854', '#3CBCFC', '#F8D800', '#F878F8'];
const gxSprite = (ctx, e, f) => {
  const T = GX_TYPES[e.type], img = GxGfx.get(e.type, (f >> 3) & 1, e.flash > 0 ? 'f' : 'n');
  if (e.v && e.v.fl) { ctx.save(); ctx.translate(Math.round(e.x), 0); ctx.scale(-1, 1); ctx.drawImage(img, -Math.round(T.w / 2), Math.round(e.y - T.h / 2)); ctx.restore(); }
  else ctx.drawImage(img, Math.round(e.x - T.w / 2), Math.round(e.y - T.h / 2));
};
Object.assign(GX_RENDER, {
  dvd(ctx, e) {
    const x = Math.round(e.x), y = Math.round(e.y), c = e.flash > 0 ? '#F8F8F8' : GX_DVD_COLS[(e.v && e.v.c) || 0];
    ctx.fillStyle = '#000000'; ctx.fillRect(x - 13, y - 7, 26, 15);
    Font.draw(ctx, 'DVD', x - 12, y - 6, c);
    ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(x, y + 4, 11, 2.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#000000'; ctx.beginPath(); ctx.ellipse(x, y + 4, 4, 1, 0, 0, Math.PI * 2); ctx.fill();
  },
  tetro(ctx, e) {
    const v = e.v || { s: 0, r: 0, n: 4 }, cells = gxTetroCells(v).slice(0, v.n), [c1, c2] = GX_TETRO_COLS[v.s];
    const w = (Math.max(...gxTetroCells(v).map(q => q[0])) + 1) * 6, h = (Math.max(...gxTetroCells(v).map(q => q[1])) + 1) * 6;
    const x0 = Math.round(e.x - w / 2), y0 = Math.round(e.y - h / 2);
    for (const [cx, cy] of cells) {
      const x = x0 + cx * 6, y = y0 + cy * 6;
      ctx.fillStyle = e.flash > 0 ? '#F8F8F8' : c2; ctx.fillRect(x, y, 6, 6);
      ctx.fillStyle = e.flash > 0 ? '#F8F8F8' : c1; ctx.fillRect(x, y, 5, 5);
      ctx.fillStyle = '#F8F8F8'; ctx.fillRect(x + 1, y + 1, 2, 1);
    }
  },
  taxi(ctx, e, f) { if (e.warnT > 0) gxLaneWarn(ctx, e, f); else gxSprite(ctx, e, f); },
  police(ctx, e, f) { if (e.warnT > 0) gxLaneWarn(ctx, e, f); else gxSprite(ctx, e, f); },
  cow(ctx, e, f) {
    if (e.warnT > 0) { if ((f >> 2) & 1) { const x = Math.round(e.x); ctx.fillStyle = '#F83800'; ctx.fillRect(x - 6, FH - 12, 12, 11); Font.draw(ctx, '!', x - 3, FH - 11, '#F8F8F8'); } return; }
    gxSprite(ctx, e, f);
  },
  tbomb(ctx, e, f) {
    const x = Math.round(e.x), y = Math.round(e.y), n = (e.v && e.v.n) || 3, hurry = n <= 1;
    if (hurry && (f >> 1) & 1) { ctx.fillStyle = 'rgba(248,56,0,0.35)'; ctx.beginPath(); ctx.arc(x, y, 22, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = '#100808'; ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = e.flash > 0 ? '#F8F8F8' : '#3C3C4C'; ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#7C7C8C'; ctx.fillRect(x - 3, y - 4, 2, 2);
    ctx.fillStyle = '#BCBCBC'; ctx.fillRect(x - 1, y - 9, 2, 3); ctx.fillStyle = (f >> 1) & 1 ? '#F8D800' : '#F83800'; ctx.fillRect(x - 1, y - 11, 2, 2);
    Font.draw(ctx, String(n), x - 3, y - 3, hurry ? '#F83800' : '#F8F8F8');
  },
});
// a car's coming: a flashing arrow at the edge of its lane
function gxLaneWarn(ctx, e, f) {
  if (!((f >> 2) & 1)) return;
  const y = Math.round(e.y), left = e.x < 0 || (e.v && !e.v.fl);
  const x = left ? 1 : FW - 13;
  ctx.fillStyle = e.type === 'police' ? '#3C5CF8' : '#F8D800'; ctx.fillRect(x, y - 5, 12, 10);
  Font.draw(ctx, left ? '>' : '<', x + 2, y - 4, '#100808');
}

// their shots: toast, zigzags, rays, tiles (all with the red danger glow drawn first)
Object.assign(GX_BULLET_DRAW, {
  toast(ctx, x, y) { ctx.fillStyle = '#7C4C14'; ctx.fillRect(x - 3, y - 3, 6, 6); ctx.fillStyle = '#E0A848'; ctx.fillRect(x - 2, y - 2, 4, 4); ctx.fillStyle = '#F8E0A8'; ctx.fillRect(x - 1, y - 1, 2, 2); },
  zig(ctx, x, y, f) { ctx.fillStyle = '#F8F8F8'; const o = (f >> 2) & 1 ? 1 : -1; for (let k = 0; k < 4; k++) ctx.fillRect(x + (k % 2 ? o : -o) - 1, y - 4 + k * 2, 2, 2); },
  ray(ctx, x, y, f, hot, b) {
    const v = Math.hypot(b.vx || 0, b.vy || 1) || 1, ux = (b.vx || 0) / v, uy = (b.vy || 1) / v;
    for (let k = -3; k <= 3; k++) { ctx.fillStyle = Math.abs(k) < 2 ? '#F8F8F8' : '#58F858'; ctx.fillRect(Math.round(x + ux * k) - 1, Math.round(y + uy * k) - 1, 2, 2); }
  },
  tile(ctx, x, y, f) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(f / 6);
    ctx.fillStyle = '#100808'; ctx.fillRect(-4, -4, 8, 8); ctx.fillStyle = '#788C68'; ctx.fillRect(-3, -3, 6, 6); ctx.fillStyle = '#F8D800'; ctx.fillRect(-1, -1, 2, 2);
    ctx.restore();
  },
});

// ------------------------------------------------------------------ the floppy disk (the City Killer's undoing)
GX_PICKUPS.disk = {
  draw(ctx, x, y, t, R) {
    R(-6, -6, 12, 12, '#100808'); R(-5, -5, 10, 10, '#2038C8'); R(-2, -5, 5, 4, '#BCBCBC'); R(0, -4, 1, 2, '#2038C8');
    R(-3, 1, 7, 4, '#F8F8F8'); R(-2, 2, 5, 1, '#3CBCFC');
  },
  collect(t, u) {
    const g = this.galaxy, b = g.boss;
    if (b && b.key === 'city') {
      b.virusT = 540;
      g.banner = { text: 'VIRUS UPLOADED!', t: 120 };
      this.gxSay(b, 'SHIELDS... FAILING...', 120);
      Sound.play('secret');
    } else { this.addScore(t.player, 500); Sound.play('coin'); }
  },
};

// ------------------------------------------------------------------ the six new bosses
const gxDive = (st, type, b, n, near, gap = 16) => {
  for (let i = 0; i < n; i++) {
    const e = st.gxSpawn({ type, st: 'dive' });
    e.x = b.x + (i - (n - 1) / 2) * gap; e.y = b.y + b.h - 4; e.sx = e.x; e.sy = e.y; e.t = -i * 8; e.tx = near ? near.x + 8 : FW / 2; e.shot = false;
  }
};
GX_BOSSES.push(
  // a city-sized saucer: shielded until a floppy disk uploads a virus, or while its dish is open to fire
  { key: 'city', name: 'CITY KILLER', w: 88, h: 30, hp: 486, pts: 36000, move: 'sway',
    phases: [['fighters', 'turrets', 'cityBeam', 'fan5'], ['turrets', 'fighters', 'cityBeam', 'ring12', 'aimed5'], ['cityBeam', 'spiral', 'fighters', 'turrets', 'cityBeam', 'ring16']],
    init(b) { b.virusT = 0; b.diskT = 240; b.dish = 0; },
    update(b, g) {
      if (b.virusT > 0) b.virusT--;
      if (--b.diskT <= 0) {
        if (!g.pickups.some(u => u.k === 'disk')) { this.gxDrop(b.x - 30 + rnd(60), b.y + b.h, 'disk'); g.pickups[g.pickups.length - 1].vy = 0.45; }
        b.diskT = 780 - 120 * b.ph;
      }
      return false;
    },
    damage(b, dmg, p, bomb) {
      if (bomb || b.dish) return dmg;
      if (b.virusT > 0) return dmg * 1.5;
      if (this.frame % 6 === 0) Sound.play('steel');
      b.noFlash = true;
      return dmg * 0.12;   // the shield takes nearly all of it
    },
    frame: (b, fr) => (b.dish ? 1 : 0) + 2 * ((fr >> 3) & 1),
    drawOver(ctx, b) {
      const f = this.frame;
      if (b.virusT > 0) {   // the virus at work: glitches
        for (let k = 0; k < 5; k++) { ctx.fillStyle = (k + f) % 3 ? '#58F858' : '#F8F8F8'; ctx.fillRect(Math.round(b.x - b.w / 2 + ((f * 7 + k * 31) % b.w)), Math.round(b.y + ((f * 3 + k * 11) % b.h)), 6 + (k % 3) * 4, 1); }
      } else if (!b.dish) {   // the shield
        ctx.strokeStyle = 'rgba(60,188,252,' + (0.35 + 0.25 * Math.sin(f / 5)).toFixed(2) + ')'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.ellipse(b.x, b.y + b.h / 2, b.w / 2 + 3, b.h / 2 + 4, 0, 0, Math.PI * 2); ctx.stroke();
      }
    },
  },
  // the time car: 88 mph, two trails of fire, gone in a flash
  { key: 'delorean', name: 'TIME CAR', w: 36, h: 22, hp: 405, pts: 38400, move: 'swayFast',
    phases: [['timeJump', 'flux', 'fan5'], ['timeJump', 'flux', 'bolt', 'aimed5'], ['timeJump', 'bolt', 'flux', 'timeJump', 'spiral', 'fan7']],
    init(b) { b.dash = 0; },
    update(b) {
      if (!b.dash) return false;
      b.y += 7;
      if (b.y > FH + 10) {   // through time: back at the top somewhere else
        b.dash = 0; b.in = false; b.y = -b.h - 2; b.x = b.w / 2 + 4 + rnd(FW - b.w - 8);
        this.fx.push({ x: b.x, y: 6, frames: Sprites.bigExp, per: 3, tick: 0 });
        Sound.play('teleport');
      }
      return true;
    },
    onPhase(b, g, ph) { this.gxSay(b, ph === 3 ? 'GREAT SCOTT!' : '1.21 GIGAWATTS!', 110); },
    frame: (b, fr) => (fr >> 2) & 1,
    drawUnder(ctx, b) {
      if (!b.dash) return;
      for (const dx of [-7, 7]) for (let y = Math.max(0, Math.round(b.y) - 40); y < b.y + 4; y += 2) { ctx.fillStyle = (y + this.frame) % 4 ? '#F8B800' : '#F83800'; ctx.fillRect(Math.round(b.x + dx) - 1, y, 3, 2); }
    },
  },
  // the martian saucer: a big brain in a dome and four wingmen; a bomb (the yodel) hurts it three times as much
  { key: 'martian', name: 'MARTIAN SAUCER', w: 44, h: 26, hp: 520, pts: 40800, move: 'sway',
    phases: [['rays', 'wingFire', 'fan5'], ['rays', 'abduct', 'wingFire', 'ring12'], ['rays', 'spiral', 'abduct', 'wingFire', 'fan9', 'aimed5']],
    init(b) { this.gxWingmen(b); this.gxSay(b, 'ACK ACK!', 90); b.ackT = 220; },
    update(b) {
      if (--b.ackT <= 0) { this.gxSay(b, ['ACK ACK!', 'ACK! ACK ACK!', 'ACK?', 'ACK ACK ACK!'][rnd(4)], 70); Sound.play('ack'); b.ackT = 220 + rnd(200); }
      return false;
    },
    damage(b, dmg, p, bomb) {
      if (!bomb) return dmg;
      this.galaxy.banner = { text: 'THE YODEL! ACK... ACK...', t: 110 };
      Sound.play('yodel');
      return dmg * 3;
    },
    onPhase(b) { this.gxWingmen(b); this.gxDrop(b.x, b.y + b.h, 'bomb'); },
  },
  // the cube: it adapts to the weapon that hurts it most (switch guns!)
  { key: 'cube', name: 'THE CUBE', w: 48, h: 46, hp: 470, pts: 43200, move: 'slow',
    phases: [['grid', 'cutter', 'assimilate'], ['tractorCut', 'grid', 'assimilate', 'aimed5'], ['tractorCut', 'grid', 'spiral2', 'assimilate', 'cutter', 'ring12']],
    init(b) { b.adapt = {}; b.immune = []; b.boxT = 480; this.gxSay(b, 'RESISTANCE IS FUTILE.', 160); },
    update(b, g) {
      if (--b.boxT <= 0) {   // a weapon it hasn't adapted to drifts down now and then
        const free = GX_WEAPON_KEYS.filter(k => !b.immune.includes(k));
        this.gxDrop(16 + rnd(FW - 32), b.y + b.h, 'box'); g.pickups[g.pickups.length - 1].w = free[rnd(free.length)];
        b.boxT = 600;
      }
      if (!b.hold) { b.x = FW / 2 + Math.sin(b.t / 160) * (FW / 2 - b.w / 2 - 6); b.y = 14 + Math.sin(b.t / 60) * 2; }
      return true;
    },
    damage(b, dmg, p, bomb) {
      if (bomb || !p) return dmg;
      const k = gxPlayer(p).weapon;
      if (b.immune.includes(k)) { if (this.frame % 6 === 0) Sound.play('steel'); b.noFlash = true; return dmg * 0.1; }
      b.adapt[k] = (b.adapt[k] || 0) + dmg;
      if (b.adapt[k] > b.max * 0.12) {
        b.immune.push(k);
        if (b.immune.length > 2) b.adapt[b.immune.shift()] = 0;   // it can only hold two at once
        this.galaxy.banner = { text: 'ADAPTED TO ' + GX_WEAPONS[k].name + '!', t: 110, warn: true };
        this.gxSay(b, 'YOUR ' + GX_WEAPONS[k].name + ' IS IRRELEVANT.', 130);
        Sound.play('adapt');
      }
      return dmg;
    },
    onPhase(b) { b.adapt = {}; b.immune = []; this.gxSay(b, 'WE WILL ADAPT.', 110); },
    frame: (b, fr) => (fr >> 4) & 1,
    drawOver(ctx, b) {
      // the weapons it has adapted to, crossed out, beside it
      const right = b.x + b.w / 2 + 14 < FW, x = right ? Math.round(b.x + b.w / 2 + 2) : Math.round(b.x - b.w / 2 - 12);
      b.immune.forEach((k, i) => {
        const y = Math.round(b.y + 2 + i * 13);
        ctx.fillStyle = '#100808'; ctx.fillRect(x, y, 11, 11); Font.draw(ctx, GX_WEAPONS[k].letter, x + 2, y + 2, GX_WEAPONS[k].color);
        ctx.fillStyle = '#F83800'; for (let j = 0; j < 11; j++) { ctx.fillRect(x + j, y + j, 1, 1); ctx.fillRect(x + 10 - j, y + j, 1, 1); }
      });
    },
  },
  // the giant head: two hands that slam down at you; it breathes you in and spits tiles
  { key: 'head', name: 'GIANT HEAD', w: 52, h: 44, hp: 648, pts: 45600, move: 'hover',
    phases: [['slam', 'tiles', 'fan5'], ['slam', 'inhale', 'tiles', 'slam'], ['slam', 'inhale', 'spiral', 'tiles', 'slam', 'fan7']],
    init(b, g) {
      b.hands = [-1, 1].map(s => ({ s, hp: 50 * g.hpMul, max: 50 * g.hpMul, st: 'idle', t: 0, x: b.x + s * 38, y: b.y + 30, tx: 0, flash: 0 }));
      b.mouth = 0; b.slamK = 0;
      this.gxSay(b, 'COME CLOSER, LITTLE TANKS!', 140);
    },
    update(b, g, near, pl) {
      for (const hd of b.hands) {
        if (hd.hp <= 0) continue;
        if (hd.flash > 0) hd.flash--;
        const homeX = b.x + hd.s * 38, homeY = b.y + b.h - 12 + Math.sin((b.t + hd.s * 30) / 25) * 3;
        hd.t++;
        if (hd.st === 'idle') { hd.x += (homeX - hd.x) * 0.15; hd.y += (homeY - hd.y) * 0.15; }
        else if (hd.st === 'aim') { hd.x += (hd.tx - hd.x) * 0.12; hd.y += (b.y + b.h - hd.y) * 0.12; if (hd.t >= 40) { hd.st = 'down'; hd.t = 0; } }
        else if (hd.st === 'down') { hd.y += 6; if (hd.y >= FH - 12) { hd.y = FH - 12; hd.st = 'stay'; hd.t = 0; Sound.play('bump'); this.fx.push({ x: hd.x, y: hd.y + 6, frames: Sprites.smallExp, per: 3, tick: 0 }); } }
        else if (hd.st === 'stay') { if (hd.t >= 24) { hd.st = 'up'; hd.t = 0; } }
        else if (hd.st === 'up') { hd.y -= 3; if (hd.y <= homeY) { hd.st = 'idle'; hd.t = 0; } }
        for (const t of pl) if (overlap(t.x + 3, t.y + 3, 10, 10, hd.x - 10, hd.y - 8, 20, 16)) this.hitPlayer(t);
      }
      return false;
    },
    hitParts(b, x, y, w, h, dmg, p) {
      for (const hd of b.hands) {
        if (hd.hp <= 0 || !overlap(x, y, w, h, hd.x - 10, hd.y - 8, 20, 16)) continue;
        hd.hp -= dmg; hd.flash = 3;
        if (hd.hp <= 0) { this.fx.push({ x: hd.x, y: hd.y, frames: BIG_EXPLOSION(), per: 4, tick: 0 }); Sound.play('explode'); if (p) this.addScore(p, 1500); this.gxSay(b, 'MY HAND!', 80); }
        return true;
      }
      return false;
    },
    damage(b, dmg) { return b.hands.some(hd => hd.hp > 0) ? dmg * 0.4 : dmg; },
    onPhase(b, g, ph) {
      const dead = b.hands.find(hd => hd.hp <= 0);
      if (dead) { dead.hp = dead.max * 0.6; dead.st = 'idle'; dead.x = b.x + dead.s * 38; dead.y = b.y + b.h; }
      b.mouth = 0;
      this.gxSay(b, ph === 3 ? 'NOW YOU SEE MY TRUE FORM!' : 'YOU BRAT!', 120);
    },
    frame: (b, fr) => (b.mouth ? 1 : 0) + 2 * ((fr >> 4) & 1),
    drawOver(ctx, b) {
      const f = this.frame;
      if (b.mouth) for (let k = 0; k < 10; k++) {   // air rushing into its mouth
        const a = k * 0.63, d = 70 - ((f * 3 + k * 17) % 70), mx = b.x, my = b.y + 34;
        ctx.fillStyle = '#A8E8F8'; ctx.fillRect(Math.round(mx + Math.cos(a) * d), Math.round(my + Math.sin(a) * d * 0.8 + 10), 3, 1);
      }
      for (const hd of b.hands) {
        if (hd.hp <= 0) continue;
        if (hd.st === 'aim' && (f >> 2) & 1) {   // where it'll land
          ctx.fillStyle = '#F83800'; const tx = Math.round(hd.tx);
          ctx.fillRect(tx - 9, FH - 6, 18, 1); ctx.fillRect(tx, FH - 14, 1, 14); ctx.fillRect(tx - 6, FH - 12, 12, 1);
        }
        ctx.drawImage(GxGfx.hand(hd.flash > 0, hd.s), Math.round(hd.x - 10), Math.round(hd.y - 8));
      }
    },
  },
  // CATS: all your base are belong to us
  { key: 'cats', name: 'CATS', w: 64, h: 40, hp: 1026, pts: 60000, move: 'sway',
    phases: [['timeBomb', 'launch', 'fan7'], ['mainScreen', 'timeBomb', 'launch', 'ring16'], ['mainScreen', 'timeBomb', 'spiral2', 'launch', 'timeBomb', 'ring16']],
    init(b) { b.talk = ['HOW ARE YOU GENTLEMEN !!', 'ALL YOUR BASE ARE BELONG TO US.']; b.bombSaid = 0; b.screen = 0; },
    update(b) {
      if (!b.say && b.talk.length) { this.gxSay(b, b.talk.shift(), 150); Sound.play('talk'); }
      return false;
    },
    onPhase(b, g, ph) {
      if (ph === 2) b.talk.push('YOU ARE ON THE WAY TO DESTRUCTION.');
      if (ph === 3) {
        g.banner = { text: 'FOR GREAT JUSTICE.', t: 150 };
        b.talk.push('YOU HAVE NO CHANCE TO SURVIVE MAKE YOUR TIME.', 'HA HA HA HA ....');
        for (const t of this.gxPlayers()) t.shield = Math.max(t.shield || 0, 150);
      }
    },
    onKill(b, g) { g.banner = { text: 'ALL YOUR BASE ARE YOURS!', t: 240 }; },
    frame: (b, fr) => (b.say ? (fr >> 3) & 1 : 0) + 2 * ((fr >> 4) & 1),
    drawOver(ctx, b) {
      if (!b.screen) return;   // MAIN SCREEN TURN ON
      ctx.fillStyle = (this.frame >> 1) & 1 ? 'rgba(248,248,248,0.7)' : 'rgba(88,248,88,0.5)';
      ctx.fillRect(Math.round(b.x - b.w / 2 + 22), Math.round(b.y + 12), 20, 18);
    },
  },
);

Object.assign(Stage.prototype, {
  // the martian's four wingmen (back up to four)
  gxWingmen(b) {
    const g = this.galaxy, have = g.list.filter(e => e.st === 'wing').map(e => e.slot);
    for (let k = 0; k < 4; k++) if (!have.includes(k)) { const e = this.gxSpawn({ type: 'msaucer', st: 'wing', slot: k }); e.x = b.x; e.y = b.y + 10; }
  },
});

Object.assign(GX_BOSS_ACTS, {
  // CITY KILLER
  fighters(b, a, c) { if (c.g.list.length < 14) gxDive(this, 'attacker', b, 4, c.near); Sound.play('teleport'); c.done(60); },
  turrets(b, a, c) {
    if (a.t % 12 === 1) for (const dx of [-36, -20, 20, 36]) { const x = b.x + dx, y = b.y + b.h - 6; c.shoot(x, y, c.toward(x, y), 1.5); }
    if (a.t >= 36) c.done(50);
  },
  cityBeam(b, a, c) {
    if (a.t === 1) {
      b.hold = true; b.dish = 1;
      b.beams.push({ kind: 'city', x: b.x, w: 26, top: b.y + b.h, t: 0, warn: 80, dur: 45, snd: 'cityBlast' });
      this.gxSay(b, 'PRIMARY WEAPON CHARGING', 80);
      Sound.play('beam');
    }
    if (a.t >= 130) { b.hold = false; b.dish = 0; c.done(60); }
  },
  // TIME CAR
  timeJump(b, a, c) {
    if (a.t === 1) {
      b.jx = Math.max(b.w / 2 + 2, Math.min(FW - b.w / 2 - 2, c.near ? c.near.x + 8 : b.x)); b.hold = true;
      for (const dx of [-7, 7]) b.beams.push({ kind: 'fire', x: b.jx + dx, w: 4, top: 0, t: 0, warn: 45, dur: 110, snd: 'flame' });
      this.gxSay(b, '88 MPH!', 60);
      Sound.play('mph');
    }
    if (a.t < 45) b.x += (b.jx - b.x) * 0.15;
    if (a.t === 45) { b.x = b.jx; b.hold = false; b.dash = 1; }
    if (a.t > 45 && !b.dash) c.done(50);
  },
  flux(b, a, c) {
    if (a.t % 6 === 1) { for (let i = 0; i < 3; i++) c.shoot(c.cx, c.cy, b.spin + i * Math.PI * 2 / 3, 1.4); b.spin += 0.3; }
    if (a.t >= 36) c.done(50);
  },
  bolt(b, a, c) {
    if (a.t === 1) b.beams.push({ kind: 'bolt', x: c.near ? c.near.x + 8 : b.x, w: 10, top: 0, t: 0, warn: 50, dur: 14, snd: 'zap' });
    if (a.t >= 70) c.done(40);
  },
  // MARTIAN SAUCER
  rays(b, a, c) {
    if (a.t % 6 === 1) { c.shoot(c.cx, c.cy, c.toward(c.cx, c.cy), 2.4, 'ray'); Sound.play('ray'); }
    if (a.t >= 30) c.done(50);
  },
  wingFire(b, a, c) {
    for (const e of c.g.list) if (e.st === 'wing') c.shoot(e.x, e.y + 3, c.toward(e.x, e.y), 2.1, 'ray');
    Sound.play('ray'); c.done(40);
  },
  abduct(b, a, c) {
    if (a.t === 1) { b.abX = c.near ? c.near.x + 8 : b.x; b.beams.push({ kind: 'tractor', x: b.abX, w: 28, top: b.y + b.h, t: 0, warn: 20, dur: 150 }); b.hold = true; Sound.play('beam'); }
    b.x += (b.abX - b.x) * 0.05;
    if (a.t > 20 && a.t % 24 === 0) c.shoot(b.x, c.cy, c.toward(b.x, c.cy), 2.2, 'ray');
    if (a.t >= 175) { b.hold = false; c.done(50); }
  },
  // THE CUBE
  grid(b, a, c) {
    if (a.t === 1 || a.t === 40) {
      const n = Math.floor((FW - 8) / 16), gap = rnd(Math.max(1, n - 3));
      for (let i = 0; i < n; i++) if (i < gap || i > gap + 2) c.shoot(8 + i * 16, b.y + b.h, Math.PI / 2, 0.9);
      Sound.play('mortar');
    }
    if (a.t >= 40) c.done(70);
  },
  cutter(b, a, c) {
    if (a.t === 1) { const tx = c.near ? c.near.x + 8 : b.x, ty = c.near ? c.near.y + 8 : FH; b.beams.push({ x: b.x, y0: b.y + b.h / 2, tx, ty, t: 0, warn: 40, dur: 24, kind: 'stare', col: '#58F858' }); Sound.play('charge'); }
    if (a.t > 64) c.done(30);
  },
  assimilate(b, a, c) {
    if (c.g.list.length < 12) for (let i = 0; i < 3; i++) { const e = this.gxSpawn({ type: 'cubelet', st: 'hunt' }); e.x = b.x + (i - 1) * 14; e.y = b.y + b.h; }
    Sound.play('teleport'); c.done(60);
  },
  tractorCut(b, a, c) {
    if (a.t === 1) { b.cutX = c.near ? c.near.x + 8 : b.x; b.beams.push({ kind: 'tractor', x: b.cutX, w: 30, top: b.y + b.h, t: 0, warn: 20, dur: 120 }); Sound.play('beam'); }
    if (a.t === 70) b.beams.push({ kind: 'cut', x: b.cutX, w: 6, top: b.y + b.h, t: 0, warn: 30, dur: 20 });
    if (a.t >= 125) c.done(50);
  },
  // GIANT HEAD
  slam(b, a, c) {
    if (a.t === 1) {
      const alive = b.hands.filter(hd => hd.hp > 0);
      if (!alive.length) { c.done(10); return; }
      const hd = alive[b.slamK++ % alive.length];
      hd.st = 'aim'; hd.t = 0; hd.tx = Math.max(10, Math.min(FW - 10, c.near ? c.near.x + 8 : FW / 2)); a.hand = b.hands.indexOf(hd);
      return;
    }
    const hd = b.hands[a.hand];
    if (!hd || hd.hp <= 0 || (hd.st === 'idle' && a.t > 2) || a.t > 220) c.done(30);
  },
  tiles(b, a, c) { const t0 = c.toward(b.x, b.y + 34); for (let i = 0; i < 5; i++) c.shoot(b.x, b.y + 34, t0 + (i - 2) * 0.25, 1.3, 'tile'); Sound.play('mortar'); c.done(60); },
  inhale(b, a, c) {
    if (a.t === 1) { b.mouth = 1; Sound.play('plane'); }
    if (a.t < 110) for (const t of this.gxPlayers()) { t.y = Math.max(Math.round(FH * 0.35), t.y - 0.45); t.x += Math.sign(b.x - (t.x + 8)) * 0.45; }
    if (a.t === 110) { for (let i = 0; i < 10; i++) c.shoot(b.x, b.y + 34, i * Math.PI / 5 + 0.3, 1.2, 'tile'); b.mouth = 0; Sound.play('mortar'); c.done(60); }
  },
  // CATS
  timeBomb(b, a, c) {
    if (!b.bombSaid) { b.bombSaid = 1; b.talk.unshift('SOMEBODY SET UP US THE BOMB.'); }
    if (c.g.list.filter(e => e.type === 'tbomb').length < 4) for (let i = 0; i < (b.ph >= 3 ? 3 : 2); i++) {
      const e = this.gxSpawn({ type: 'tbomb', st: 'tbomb', tx: 16 + rnd(FW - 32), ty: Math.round(FH * 0.45) + rnd(Math.round(FH * 0.4)) });
      e.x = b.x + (i - 1) * 16; e.y = b.y + b.h;
    }
    Sound.play('mortar'); c.done(90);
  },
  launch(b, a, c) { if (c.g.list.length < 14) gxDive(this, 'attacker', b, 4, c.near); Sound.play('teleport'); c.done(60); },
  mainScreen(b, a, c) {
    if (a.t === 1) { this.gxSay(b, 'MAIN SCREEN TURN ON.', 80); b.hold = true; b.screen = 1; Sound.play('talk'); }
    if (a.t === 30) {
      b.beams.push({ kind: 'city', x: b.x, w: 20, top: b.y + b.h, t: 0, warn: 60, dur: 40, snd: 'cityBlast' });
      if (b.ph >= 3 && c.near) for (const dx of [-24, 24]) b.beams.push({ x: b.x + dx, y0: b.y + b.h, tx: c.near.x + 8 + dx, ty: c.near.y + 8, t: 0, warn: 60, dur: 24, kind: 'stare' });
    }
    if (a.t >= 135) { b.hold = false; b.screen = 0; c.done(50); }
  },
});

// ------------------------------------------------------------------ their pictures
Object.assign(GX_BOSS_PALS, {
  city: [null, '#B8B8C8', '#6C6C7C', '#3C3C4C', '#F8F8F8', '#58F8F8', '#204C6C', '#08080C'],
  delorean: [null, '#E8E8E8', '#A8A8B0', '#5C5C68', '#F8F8F8', '#3CBCFC', '#1C3C8C', '#0C0C14'],
  martian: [null, '#E0E0F0', '#9898B0', '#4C4C6C', '#F8F8E8', '#F8A8C8', '#A8F8D8', '#0C0C18'],
  cube: [null, '#6C6C6C', '#3C3C3C', '#1C1C1C', '#D8F8D8', '#58F858', '#206C20', '#040404'],
  head: [null, '#B8C8A8', '#788C68', '#3C4C30', '#F8F8F8', '#F8D800', '#F8A8B8', '#0C1008'],
  cats: [null, '#BCBCBC', '#7C7C7C', '#3C3C3C', '#F8D8B8', '#F83800', '#0C2C0C', '#080808'],
});
Object.assign(GX_BOSS_DRAW, {
  // f bit 0: its dish open; bit 1: the lights' chase. A city on its back, rings and spokes under it, four turrets
  city(f, ph) {
    const P = bossPainter(88, 30), dish = f & 1, a = f >> 1;
    for (const [x0, x1, top] of [[21, 25, 5], [27, 30, 2], [32, 36, 6], [39, 41, 1], [43, 48, 3], [50, 53, 1], [55, 59, 4], [61, 65, 6]]) {   // the city on top
      P.rect(x0, top, x1, 9, 2); P.rect(x0, top, x0, 9, 1); P.rect(x1, top, x1, 9, 3); P.rect(x0, top, x1, top, 1);
      for (let y = top + 2; y < 9; y += 2) for (let x = x0 + 1; x < x1; x += 2) if ((x * 3 + y * 5 + a) % 4 === 0) P.px(x, y, (x + y) % 3 ? 5 : 4);
    }
    P.px(40, 0, a ? 5 : 4);
    gxBall(P, 44, 16, 43.5, 10, [4, 1, 2, 3, 3]);   // the saucer
    for (let y = 6; y < 16; y++) for (let x = 0; x < 88; x++) if (P.g[y][x] === 4 && (x + y) % 3) P.g[y][x] = 1;
    const ring = (rx, ry, c, hi) => { for (let k = 0; k < 360; k++) { const t = k * Math.PI / 180, x = Math.round(44 + Math.cos(t) * rx), y = Math.round(16 + Math.sin(t) * ry); P.px(x, y, c); if (hi && Math.sin(t) > 0.2) P.px(x, y + 1, hi); } };
    ring(39, 8.3, 3, 1); ring(29, 6, 3, 2); ring(18, 3.8, 3, 0);
    for (let k = 0; k < 20; k++) { const t = k * Math.PI / 10 + 0.15; if (Math.sin(t) < -0.3) continue; P.line(44 + Math.cos(t) * 19, 16 + Math.sin(t) * 4, 44 + Math.cos(t) * 28, 16 + Math.sin(t) * 5.8, 3); P.line(44 + Math.cos(t) * 30, 16 + Math.sin(t) * 6.2, 44 + Math.cos(t) * 38, 16 + Math.sin(t) * 8, 2); }   // spokes
    for (let k = 0; k < 24; k++) { const t = k * Math.PI / 12, x = Math.round(44 + Math.cos(t) * 34), y = Math.round(16 + Math.sin(t) * 7.2); if (Math.sin(t) > -0.5) P.px(x, y, (k + a * 2) % 4 < 2 ? 5 : 4); }   // lights
    for (let x = 3; x < 85; x += 4) { const y = Math.round(16 + 9.6 * Math.sqrt(Math.max(0, 1 - ((x - 44) / 43.5) ** 2))); if (Math.abs(x - 44) > 9) { P.px(x, y - 1, 7); P.px(x, y - 2, 3); } }   // bays round its rim
    for (const dx of [-36, -20, 20, 36]) { const x = 44 + dx, y = dx * dx > 900 ? 21 : 23; gxBall(P, x, y, 2.5, 2, [4, 1, 2, 3, 7]); P.rect(x, y + 1, x, y + 3, 3); P.px(x, y + 3, a ? 5 : 6); }   // turrets
    // the primary weapon: an iris shut over it, or open and blazing
    P.disc(44, 22, 7, 7); P.disc(44, 22, 6, 3); P.ring(44, 22, 5.5, 2);
    if (dish) { P.disc(44, 22, 4.6, 5); P.disc(44, 22, 3, a ? 4 : 5); P.disc(44, 22, 1.5, 4); for (let k = 0; k < 8; k++) { const t = k * Math.PI / 4 + a * 0.4; P.px(44 + Math.cos(t) * 4, 22 + Math.sin(t) * 4, 4); } }
    else { P.disc(44, 22, 4.6, 6); for (let k = 0; k < 6; k++) { const t = k * Math.PI / 3; P.line(44 + Math.cos(t) * 4.5, 22 + Math.sin(t) * 4.5, 44 + Math.cos(t + 2) * 1.2, 22 + Math.sin(t + 2) * 1.2, 3); } P.px(44, 22, 5); }
    P.wear(ph, 31); gxScars(P, ph, 31, 4, 5, a, (x, y) => y > 9 && Math.hypot(x - 44, y - 22) > 8);
    P.outline(); return P.g;
  },
  // seen from above, nose down at you: four hover wheels glowing, gull-wing doors, the louvres, the flux capacitor
  delorean(f, ph) {
    const P = bossPainter(36, 22);
    for (const [x, y] of [[4, 4], [31, 4], [4, 17], [31, 17]]) { gxBall(P, x + 0.5, y + 0.5, 3.8, 3.8, [2, 2, 3, 3, 7]); P.disc(x + 0.5, y + 0.5, 2.5, f ? 5 : 6); P.px(x, y, f ? 4 : 5); P.px(x - 1, y - 1, 3); }   // the wheels, folded flat, glowing
    for (let y = 0; y <= 21; y++) { const in_ = y > 19 ? y - 19 : y < 1 ? 1 : 0; for (let x = 8 + in_; x <= 27 - in_; x++) P.px(x, y, x === 8 + in_ ? 1 : x === 27 - in_ ? 3 : x % 3 === 0 ? 1 : 2); }   // brushed steel
    P.rect(10, 1, 25, 2, 3); P.rect(15, 0, 20, 2, 1); P.disc(17.5, 1.5, 1.6, 4); P.px(17, 1, 1);   // the rear: Mr Fusion on the deck
    for (const x of [10, 24]) P.rect(x, 1, x + 1, 1, f ? 5 : 6);   // vents
    for (let y = 3; y <= 6; y++) P.rect(11, y, 24, y, y % 2 ? 7 : 3);   // the louvres over the back window
    P.line(9, 2, 9, 7, 5); P.line(26, 2, 26, 7, 5);   // the time circuits' cables
    P.rect(11, 7, 24, 11, 1); P.rect(11, 11, 24, 11, 2); P.line(17, 7, 17, 11, 3); P.line(18, 7, 18, 11, 2);   // the roof, gull-wing seam
    for (const [x0, y0, x1, y1] of [[14, 8, 17, 9], [21, 8, 18, 9], [17.5, 9, 17.5, 11]]) P.line(x0, y0, x1, y1, f ? 4 : 5);   // the flux capacitor's Y glowing through
    for (let y = 12; y <= 15; y++) P.rect(10 + (y - 12) * 0.5, y, 25 - (y - 12) * 0.5, y, 6);   // the windshield
    P.line(12, 13, 14, 13, 4); P.px(13, 14, 5);
    P.line(17.5, 16, 17.5, 18, 3);   // the hood's seam
    for (const x of [10, 24]) { P.rect(x, 19, x + 1, 20, 4); P.px(x + (x < 17 ? 1 : 0), 20, f ? 1 : 4); }   // headlights
    P.rect(14, 20, 21, 20, 7); for (let x = 14; x <= 21; x += 2) P.px(x, 20, 3);   // the grille
    P.px(7, 11, 2); P.px(28, 11, 2);   // mirrors
    P.wear(ph, 33); gxScars(P, ph, 33, 2, 5, f, (x, y) => x > 8 && x < 27);
    P.outline(); return P.g;
  },
  // a silver saucer, ring lights chasing; in the glass dome a martian: a huge brain, a grinning skull face
  martian(f, ph) {
    const P = bossPainter(44, 26);
    gxBall(P, 22, 21, 13, 3.5, [0, 2, 2, 3, 7]); P.disc(22, 22.5, 2, 3); P.disc(22, 22.5, 1.1, f ? 6 : 4);   // the underside, its ray gun
    gxBall(P, 22, 18.5, 21.5, 5.5, [4, 1, 1, 2, 3]);   // the saucer
    P.rect(1, 18, 42, 19, 2); P.rect(1, 18, 42, 18, 1); P.rect(2, 20, 41, 20, 3);
    for (let k = 0; k < 9; k++) { const x = Math.round(3 + k * 4.6); P.rect(x, 18, x + 1, 19, (k + f) % 2 ? 6 : 4); P.px(x + 1, 19, (k + f) % 2 ? 1 : 6); }   // lights
    for (const x of [8, 35]) P.line(x, 15, x + (x < 22 ? 2 : -2), 14, 3);
    gxBall(P, 22, 10, 10.5, 10, [4, 6, 6, 6, 1]);   // the glass dome
    // the martian: brain, skull, eyes, grin
    gxBall(P, 22, 7, 7.5, 5.8, [4, 5, 5, 5, 2]);
    for (const [x0, y0, x1, y1] of [[17, 5, 19, 3], [19, 3, 20, 6], [22, 1, 22, 7], [24, 4, 26, 3], [25, 6, 27, 5], [16, 8, 19, 7], [24, 8, 26, 9]]) P.line(x0, y0, x1, y1, 2);
    P.disc(22, 12.5, 5, 4); P.rect(18, 10, 26, 11, 4); P.ring(22, 12.5, 5, 1);
    for (const s of [-1, 1]) { P.disc(22 + s * 2.4, 12, 1.7, 7); P.px(22 + s * 2.4 + (s < 0 ? 0 : -1), 12, f ? 5 : 7); }   // eye sockets, a glint in them
    P.px(22, 14, 7); P.rect(19, 16, 25, 16, 7); for (let x = 19; x <= 25; x += 2) P.px(x, 16, 4); P.px(18, 15, 7); P.px(26, 15, 7);   // nose hole, the grin
    P.rect(19, 18, 25, 18, 3); P.px(22, 18, 6);   // its collar
    P.line(14, 4, 16, 2, 4); P.line(13, 6, 13, 7, 4); P.px(28, 2, 1);   // glints on the glass
    P.rect(21, 0, 23, 0, f ? 6 : 4);
    P.wear(ph, 35); gxScars(P, ph, 35, 2, 6, f, (x, y) => y > 17);
    if (ph >= 3) { P.line(28, 4, 30, 9, 7); P.line(30, 9, 29, 12, 7); P.line(12, 8, 14, 11, 1); }   // the dome cracked
    P.outline(); return P.g;
  },
  // three faces of greebles: panels, pipes, conduits, green lights that blink (f)
  cube(f, ph) {
    const P = bossPainter(48, 46), r = seeded(77);
    for (let y = 0; y < 9; y++) P.rect(9 - y, y, 47 - y, y, 1);   // the top
    P.rect(0, 9, 38, 45, 2);   // the front
    for (let x = 39; x < 48; x++) P.rect(x, 9 - (x - 38), x, 45 - (x - 38), 3);   // the side
    const front = (x, y) => x >= 1 && x <= 37 && y >= 10 && y <= 44;
    for (let k = 0; k < 26; k++) {   // panels, raised or sunk
      const x = 1 + Math.floor(r() * 31), y = 10 + Math.floor(r() * 31), w = 2 + Math.floor(r() * 7), h = 2 + Math.floor(r() * 5), up = r() < 0.6;
      for (let j = y; j <= Math.min(44, y + h); j++) for (let i = x; i <= Math.min(37, x + w); i++) P.px(i, j, j === y || i === x ? (up ? 1 : 3) : j === Math.min(44, y + h) || i === Math.min(37, x + w) ? (up ? 3 : 1) : up ? 2 : 3);
    }
    for (let k = 0; k < 7; k++) { const y = 12 + Math.floor(r() * 32); P.line(1, y, 37, y, 3); P.line(1, y - 1, 37, y - 1, 1); }   // pipes across
    for (let k = 0; k < 12; k++) {   // conduits, a light at each end
      const x = 2 + Math.floor(r() * 34), y = 11 + Math.floor(r() * 33), len = 3 + Math.floor(r() * 7);
      if (k % 2) P.line(x, y, Math.min(36, x + len), y, 6); else P.line(x, y, x, Math.min(44, y + len), 6);
      P.px(x, y, (k + f) % 3 ? 5 : 4);
    }
    for (let k = 0; k < 9; k++) { const x = 10 + Math.floor(r() * 36), y = 1 + Math.floor(r() * 7); P.line(x - y, y, x - y + 4, y, 2); if (k % 3 === 0) P.px(x - y, y, 6); }   // top greebles
    for (let k = 0; k < 11; k++) { const x = 39 + Math.floor(r() * 8), y = 12 + Math.floor(r() * 31) - (x - 38); P.line(x, y, x, y + 3, k % 2 ? 2 : 7); if (k % 4 === 0) P.px(x, y + 1, (k + f) % 2 ? 6 : 5); }   // the side's
    for (const [x, y] of [[18, 26], [7, 16], [30, 37]]) { P.rect(x - 2, y - 2, x + 2, y + 2, 7); P.rect(x - 1, y - 1, x + 1, y + 1, f ? 5 : 6); P.px(x, y, f ? 4 : 5); }   // vents glowing green
    P.line(0, 9, 38, 9, 1); P.line(38, 9, 47, 0, 1); P.line(38, 10, 38, 45, 7);   // edges
    P.wear(ph, 37); gxScars(P, ph, 37, 4, 5, f, front);
    P.outline(); return P.g;
  },
  // f bit 0: its mouth open; bit 1: its eyes' glow. A huge stern face; phase 3 shows the brain
  head(f, ph) {
    const P = bossPainter(52, 44), m = f & 1, a = f >> 1;
    for (const s of [-1, 1]) { gxBall(P, 26 + s * 23, 24, 3, 5.5, [1, 1, 2, 3, 3]); P.line(26 + s * 23, 21, 26 + s * 23, 27, 3); }   // ears
    gxBall(P, 26, 23, 23, 21, [4, 1, 2, 3, 3]);
    for (let y = 0; y < 44; y++) for (let x = 0; x < 52; x++) if (P.g[y][x] === 4) P.g[y][x] = 1;
    const rim = x => Math.round(11 + Math.sin(x * 1.3) * 1.2 + ((x * 7) % 3));
    if (ph >= 3) {   // the skull open: the brain
      for (let x = 7; x < 46; x++) { const top = rim(x); for (let y = 0; y < top; y++) if (P.g[y][x]) P.g[y][x] = 0; if (P.g[top][x]) { P.px(x, top, 4); P.px(x, top + 1, 1); } }
      gxBall(P, 26, 8, 16, 8, [4, 6, 6, 6, 3]);
      for (const [x0, y0, x1, y1] of [[14, 6, 19, 4], [19, 4, 21, 8], [26, 1, 26, 12], [31, 5, 35, 3], [32, 8, 37, 9], [16, 10, 21, 10], [22, 2, 24, 6], [29, 10, 30, 7]]) P.line(x0, y0, x1, y1, 3);
      for (let x = 10; x < 43; x++) if (P.g[rim(x)][x] === 4 && (x + rim(x)) % 4 === 0) P.px(x, rim(x) - 1, 4);
    } else for (const y of [7, 10]) for (let x = 16; x < 37; x++) P.px(x, y + Math.round(Math.abs(x - 26) * 0.12), x < 26 ? 3 : 2);   // a frowning forehead
    // brows, the eyes in deep sockets, the nose, cheekbones
    for (const s of [-1, 1]) {
      for (let k = 0; k <= 10; k++) { const x = 26 + s * (2 + k), y = 15 - Math.round(k * 0.35); P.px(x, y, 3); P.px(x, y + 1, 3); P.px(x, y - 1, 1); }
      const ex = 26 + s * 8; P.disc(ex + 0.5, 20, 4, 7); P.disc(ex + 0.5, 20, 2.9, 5); P.disc(ex + 0.5, 20, 1.4, a ? 4 : 5); P.rect(ex, 19, ex, 21, 7); P.px(ex - s, 19, 4);
      P.line(26 + s * 14, 24, 26 + s * 11, 32, 3); P.line(26 + s * 13, 24, 26 + s * 10, 31, 1);   // cheekbones
      P.line(26 + s * 5, 39, 26 + s * 2, 41, 2);   // the jaw
    }
    P.line(25, 18, 24, 27, 1); P.line(27, 18, 28, 27, 2); P.line(28, 21, 29, 27, 3); P.rect(23, 28, 29, 29, 2); P.px(24, 29, 7); P.px(28, 29, 7); P.line(25, 30, 27, 30, 3);   // the nose
    if (m) { P.disc(26, 35, 6, 7); for (let x = 21; x <= 31; x += 2) { P.px(x, 30, 4); P.px(x, 31, 4); } P.disc(26, 38.5, 3, 6); P.line(24, 38, 28, 38, 4); for (let x = 23; x <= 29; x += 2) P.px(x, 40, 4); }   // open: teeth, tongue
    else { P.line(18, 35, 20, 33, 3); P.line(20, 33, 32, 33, 7); P.line(32, 33, 34, 35, 3); P.line(20, 34, 32, 34, 2); P.line(21, 36, 31, 36, 1); P.line(26, 39, 26, 41, 3); }   // shut: a grim line, a cleft chin
    gxScars(P, ph, 41, 3, 5, a, (x, y) => y > 12 && Math.hypot(x - 26, y - 35) > 7 && Math.abs(y - 20) > 4);
    if (ph >= 2) { P.line(10, 13, 15, 19, 7); P.line(15, 19, 14, 22, 7); P.line(41, 24, 44, 19, 7); }
    P.outline(); return P.g;
  },
  // f bit 0: its mouth on the screen while it talks; bit 1: lights. A battleship, CATS's face on its main screen
  cats(f, ph) {
    const P = bossPainter(64, 40), m = f & 1, a = f >> 1, hw = y => 24 - Math.max(0, Math.abs(y - 19.5) - 9) * 1.3;
    for (const s of [-1, 1]) { P.line(31.5 + s * 12.5, 1, 31.5 + s * 12.5, 5, 3); P.px(31.5 + s * 12.5, 0, (a + (s > 0)) % 2 ? 5 : 3); }   // masts
    for (const x of [7, 20, 43, 56]) { P.rect(x - 1, 31, x + 1, 37, 3); P.rect(x - 1, 31, x - 1, 37, 2); P.rect(x - 1, 38, x + 1, 38, 7); P.px(x, 38, a ? 5 : 7); }   // cannons
    for (let y = 5; y <= 34; y++) P.rect(Math.round(31.5 - hw(y)), y, Math.round(31.5 + hw(y)), y, y < 9 ? 1 : y > 30 ? 3 : 2);   // the hull
    P.rect(20, 2, 43, 5, 2); P.rect(20, 2, 43, 2, 1); P.rect(23, 0, 40, 1, 1); P.rect(23, 0, 40, 0, 4);   // the bridge
    for (let x = 25; x <= 38; x += 3) P.px(x, 3, (x + a * 3) % 6 < 3 ? 5 : 3);
    for (const y of [9, 30]) { P.line(Math.round(32.5 - hw(y)), y, Math.round(30.5 + hw(y)), y, 3); P.line(Math.round(32.5 - hw(y)), y + 1, Math.round(30.5 + hw(y)), y + 1, 1); }   // armour seams
    for (const x of [16, 47]) { P.line(x, 10, x, 29, 3); P.line(x + 1, 11, x + 1, 28, 1); }
    for (let x = 10; x < 55; x += 3) if (x < 19 || x > 44) { P.px(x, 12, 1); P.px(x, 27, 3); }   // rivets
    for (const [x0, y0] of [[12, 14], [12, 21], [49, 14], [49, 21]]) { P.rect(x0, y0, x0 + 2, y0 + 3, 3); P.rect(x0 + 1, y0 + 1, x0 + 1, y0 + 2, 5); if (a) P.px(x0 + 1, y0 + 1, 4); }   // red lights
    for (const s of [-1, 1]) {   // engine pods, burning
      const x = 31.5 + s * 24.5; gxBall(P, x, 19.5, 4.5, 9.5, [4, 1, 2, 3, 3]);
      for (let y = 13; y <= 25; y += 3) P.line(x - 2.5, y, x + 2.5, y, 3);
      P.rect(x - 1.5, 28, x + 1.5, 30, 7); P.rect(x - 0.5, 29, x + 0.5, 30, a ? 5 : 4);
    }
    // the main screen: scanlines, CATS (half a face, half machine) on it
    P.rect(20, 10, 43, 31, 7); P.rect(21, 10, 42, 10, 1); P.rect(21, 11, 42, 30, 3);
    for (let y = 12; y <= 29; y++) P.rect(22, y, 41, y, y % 2 ? 6 : 7);
    for (let y = 13; y <= 28; y++) for (let x = 24; x <= 39; x++) {
      const d = Math.hypot((x + 0.5 - 31.5) / 6.5, (y + 0.5 - 20.5) / 7.5);
      if (d <= 1) P.px(x, y, x < 32 ? (d > 0.85 || x < 27 && y > 21 ? 3 : 4) : d > 0.85 ? 3 : (x + y) % 5 ? 1 : 2);
    }
    P.line(32, 13, 32, 27, 3); for (let y = 15; y <= 27; y += 4) P.px(34, y, 3);   // the seam, rivets on the metal half
    P.rect(27, 15, 31, 15, 3); P.line(33, 15, 37, 16, 2);   // brows
    P.rect(27, 18, 29, 19, 7); P.px(28, 18, 4);   // its eye
    P.rect(34, 17, 37, 19, 7); P.rect(35, 18, 36, 18, 5); P.px(35, 18, a ? 4 : 5);   // the red eye
    P.line(31, 20, 30, 23, 3);
    P.rect(28, 25, 35, m ? 26 : 25, 7); if (m) P.rect(29, 25, 34, 25, 4);   // the mouth
    for (const x of [26, 37]) P.line(x, 27, x + (x < 31 ? -2 : 2), 29, 2);   // tubes from its neck
    P.wear(ph, 39); gxScars(P, ph, 39, 3, 5, a, (x, y) => (x < 20 || x > 43 || y < 10 || y > 31) && y > 2);
    P.outline(); return P.g;
  },
});
// an open hand, palm down, fingers spread at you (s: -1 the left hand, 1 the right one, the thumb inside)
GxGfx.hand = function (flash, s = -1) {
  const k = 'hand' + (flash ? 'f' : 'n') + s;
  let c = this.cache.get(k);
  if (!c) {
    const P = bossPainter(20, 16);
    for (let y = 2; y <= 8; y++) { const x0 = 5 - Math.floor((y - 2) / 2), x1 = 15 + Math.floor((y - 2) / 3); for (let x = x0; x <= x1; x++) P.px(x, y, x === x0 || (y < 5 && x < 11) ? 1 : x === x1 || y === 8 ? 3 : 2); }   // the back of the hand
    for (const [x0, x1] of [[8, 6], [10, 10], [12, 13]]) P.line(x0, 3, x1, 6, x0 < 10 ? 2 : 3);   // tendons
    for (const [x, len] of [[4, 5], [8, 6], [12, 6], [16, 4]]) {   // fingers: knuckles, joints, nails
      for (let y = 8; y <= 7 + len; y++) { P.px(x, y, 1); P.px(x + 1, y, 2); P.px(x + 2, y, 3); }
      P.px(x + 1, 8 + Math.round(len * 0.45), 3);
      P.rect(x, 7 + len, x + 1, 7 + len, 4); P.px(x, 7, 4); P.px(x + 1, 7, 1);
    }
    for (const [x, y] of [[3, 4], [2, 5], [1, 6], [0, 7], [0, 8]]) { P.px(x, y, 1); P.px(x + 1, y, 2); P.px(x + 2, y, 3); }   // the thumb
    P.rect(0, 9, 1, 9, 4);
    P.rect(5, 0, 15, 1, 5); P.rect(5, 0, 15, 0, 4); P.rect(5, 1, 15, 1, 3); P.rect(9, 0, 11, 1, 6); P.px(9, 0, 4);   // a gold cuff, a jewel
    P.outline();
    const g = s < 0 ? P.g.map(r => r.slice().reverse()) : P.g;
    c = gridCanvas(g, flash ? BOSS_PALS.f : GX_BOSS_PALS.head); this.cache.set(k, c);
  }
  return c;
};

// ------------------------------------------------------------------ beams down a column, speech
function gxDrawColumn(ctx, bm, on, f) {
  const top = Math.max(0, Math.round(bm.top || 0)), x0 = Math.round(bm.x - bm.w / 2), h = VIEW_H - top;
  const warnCol = { city: '#58F8F8', cut: '#58F858', fire: '#F87830', bolt: '#F8F878', tractor: '#58F858' }[bm.kind] || '#F83800';
  if (!on) {   // the warning: its edges, dotted
    ctx.fillStyle = warnCol;
    for (let y = top; y < VIEW_H; y += 4) { ctx.fillRect(x0, y, 1, 2); if (bm.w > 4) ctx.fillRect(x0 + bm.w - 1, y, 1, 2); }
    return;
  }
  if (bm.kind === 'tractor') {
    ctx.fillStyle = 'rgba(88,248,88,0.18)'; ctx.fillRect(x0, top, bm.w, h);
    ctx.fillStyle = 'rgba(168,248,168,0.35)'; for (let y = top + ((-f * 2) % 10 + 10) % 10; y < VIEW_H; y += 10) ctx.fillRect(x0, y, bm.w, 2);
    return;
  }
  if (bm.kind === 'fire') {
    for (let y = top; y < VIEW_H; y += 2) { ctx.fillStyle = (y + f) % 6 < 2 ? '#F8F878' : (y + f) % 6 < 4 ? '#F8B800' : '#F83800'; ctx.fillRect(x0 + ((y * 7 + f) % 3) - 1, y, bm.w, 2); }
    return;
  }
  if (bm.kind === 'bolt') {
    let x = bm.x;
    for (let y = top; y < VIEW_H; y += 4) { x = bm.x + (((y * 13 + f * 7) % 9) - 4); ctx.fillStyle = (f >> 1) & 1 ? '#F8F8F8' : '#F8F878'; ctx.fillRect(Math.round(x) - 2, y, 4, 4); }
    return;
  }
  const outer = bm.kind === 'cut' ? '#58F858' : (f >> 1) & 1 ? '#3CBCFC' : '#A8F8F8';
  ctx.fillStyle = outer; ctx.fillRect(x0, top, bm.w, h);
  ctx.fillStyle = '#F8F8F8'; ctx.fillRect(Math.round(bm.x - bm.w / 6), top, Math.max(2, Math.round(bm.w / 3)), h);
}

function gxSpeech(ctx, text, x, y) {
  const words = text.split(' '), lines = [];
  let cur = '';
  for (const w of words) { if ((cur + ' ' + w).trim().length > 22 && cur) { lines.push(cur); cur = w; } else cur = (cur + ' ' + w).trim(); }
  if (cur) lines.push(cur);
  const w = Math.max(...lines.map(l => l.length)) * 8 + 6, h = lines.length * 9 + 4;
  const bx = Math.max(1, Math.min(VIEW_W - w - 1, Math.round(x - w / 2))), by = Math.max(1, Math.min(VIEW_H - h - 1, Math.round(y)));
  ctx.fillStyle = 'rgba(0,0,0,0.78)'; ctx.fillRect(bx, by, w, h);
  ctx.fillStyle = '#F8F8F8'; ctx.fillRect(bx, by, w, 1); ctx.fillRect(bx, by + h - 1, w, 1); ctx.fillRect(bx, by, 1, h); ctx.fillRect(bx + w - 1, by, 1, h);
  lines.forEach((l, i) => Font.draw(ctx, l, bx + 3, by + 3 + i * 9, '#F8F8F8'));
}

// ------------------------------------------------------------------ the later sectors' skies
function gxBgVortex(c, f) {
  const cx = VIEW_W / 2, cy = VIEW_H * 0.3;
  c.lineWidth = 2;
  for (let k = 0; k < 7; k++) {
    const r = (f * 0.8 + k * 32) % 224;
    c.strokeStyle = k % 2 ? 'rgba(60,92,248,0.35)' : 'rgba(168,232,248,0.22)';
    c.beginPath(); c.ellipse(cx, cy, r, r * 0.6, 0, 0, Math.PI * 2); c.stroke();
  }
  c.fillStyle = 'rgba(248,248,248,0.5)';
  for (let k = 0; k < 18; k++) { const a = k * 0.35 + f * 0.004, d = (f * 2 + k * 23) % 160; c.fillRect(Math.round(cx + Math.cos(a) * d), Math.round(cy + Math.sin(a) * d * 0.6), 2, 1); }
}
function gxBgSaturn(c, f) {
  const px = VIEW_W * 0.75, py = ((f * 0.04) % (VIEW_H + 200)) - 100;
  c.globalAlpha = 0.6;
  c.fillStyle = '#C8A878'; c.beginPath(); c.arc(px, py, 30, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#A88858'; for (const dy of [-14, -4, 8]) c.fillRect(Math.round(px - 28), Math.round(py + dy), 56, 4);
  c.strokeStyle = '#E8D8B8'; c.lineWidth = 3; c.beginPath(); c.ellipse(px, py, 56, 12, -0.2, 0, Math.PI * 2); c.stroke();
  c.strokeStyle = '#8C6C3C'; c.lineWidth = 1; c.beginPath(); c.ellipse(px, py, 62, 14, -0.2, 0, Math.PI * 2); c.stroke();
  c.globalAlpha = 1;
}
function gxBgGrid(c, f) {
  const hz = Math.round(VIEW_H * 0.25);
  c.fillStyle = '#0C3C0C';
  for (let k = 0; k < 10; k++) { const q = (k + (f * 0.02) % 1) / 10, y = Math.round(hz + (VIEW_H - hz) * q * q); c.fillRect(0, y, VIEW_W, 1); }
  c.strokeStyle = '#0C3C0C'; c.lineWidth = 1;
  for (let i = -6; i <= 6; i++) { c.beginPath(); c.moveTo(VIEW_W / 2 + i * 6, hz); c.lineTo(VIEW_W / 2 + i * 44, VIEW_H); c.stroke(); }
  for (let k = 0; k < 13; k++) { const x = k * 17 + 5, y = Math.round((f * (1 + (k % 3) * 0.4) + k * 37) % VIEW_H); c.fillStyle = '#1C7C1C'; c.fillRect(x, y, 1, 3); c.fillStyle = '#58F858'; c.fillRect(x, y + 3, 1, 1); }
}
function gxBgDarkStar(c, f) {
  const x = VIEW_W * 0.3, y = 44;
  for (let r = 54; r > 18; r -= 6) { c.fillStyle = 'rgba(200,40,0,' + (0.05 + (54 - r) * 0.004).toFixed(3) + ')'; c.beginPath(); c.arc(x, y, r + Math.sin(f / 20 + r) * 1.5, 0, Math.PI * 2); c.fill(); }
  c.fillStyle = '#000000'; c.beginPath(); c.arc(x, y, 18, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#F87830'; for (let k = 0; k < 10; k++) { const a = k * 0.63 + f * 0.01; c.fillRect(Math.round(x + Math.cos(a) * 19), Math.round(y + Math.sin(a) * 19), 1, 1); }
}
function gxBgBase(c, f) {
  for (const x0 of [0, VIEW_W - 12]) {
    c.fillStyle = '#1C1C28'; c.fillRect(x0, 0, 12, VIEW_H);
    c.fillStyle = '#2C2C3C';
    for (let y = -24 + Math.round(f * 0.6) % 24; y < VIEW_H; y += 24) { c.fillRect(x0 + 1, y, 10, 22); c.fillStyle = '#4C4C5C'; c.fillRect(x0 + 2, y + 2, 1, 1); c.fillRect(x0 + 9, y + 19, 1, 1); c.fillStyle = '#2C2C3C'; }
  }
  c.fillStyle = 'rgba(60,60,80,0.25)'; for (let y = Math.round(f * 0.3) % 40; y < VIEW_H; y += 40) c.fillRect(12, y, VIEW_W - 24, 1);
}

// ------------------------------------------------------------------ the later sectors' music
SONGS.galaxy2 = { name: 'HYPERSPACE', root: 62, bpm: 158, groove: 'starfield', prog: [0, 3, 5, 4],
  mel: '0.2.4.7.4.2.0.2.' + '3.5.7.A.7.5.3.5.' + '5.7.9.C.9.7.5.4.' + '4-2-4-5-7---z---' };
SONGS.galaxyBoss2 = { name: 'ALL YOUR BASE', root: 55, bpm: 146, groove: 'aggro', prog: [0, 5, 6, 4],
  mel: '0-0-3-0-5-0-6-5-' + '0-0-3-0-7-6-5-3-' + '5-5-6-7-8-7-6-5-' + '4-3-2-1-0---z---' };
