'use strict';
// =====================================================================
//  BOSS GALLERY: the bosses of the other modes (bossbook.js keeps the tank and galaxy ones)
//    ASTRO TANKS      CINDER COLOSSUS, VOID MATRIARCH, COMET WYRM (astroboss.js): met when one arrives after its
//                     warning, beaten when it falls
//    MAZE             THE MINOTAUR of the lair (every 5th maze, mazefoes.js): met when it wakes, beaten when it falls
//    TANK RALLY       BARON KRAGG (rallycareer.js): met when the champion race starts, beaten when you win it
//    DESERT DOMINION  THE REGENT (rtscampaign.js): met when campaign mission 9 starts, beaten when it's won
//  Their pictures are BOOK_EXTRA_ART[key] = { name, mode, pts, desc, draw(ctx, t, outro) }: a whole boss screen like
//  drawBossScreen's (the WARNING picture, outro false; the VICTORY picture, outro true). The three ASTRO ones are
//  here; the other three are js/bookextra2.js's. A boss whose picture isn't loaded isn't listed.
//  The book keeps them as kind 'x' (BossBook.mark('x', key, 'seen' | 'beaten')), filled in from the records the first
//  time (an astro best wave past a boss's, a maze best of 5 or a lair's stars, a rally career won, a campaign won).
//  ASTRO TANKS also shows the boss's WARNING picture as its wave begins (Settings -> GAME -> BOSS SCREENS), before
//  the field's own warning, which then runs as it always does.
// =====================================================================

window.BOOK_EXTRA_ART = window.BOOK_EXTRA_ART || {};

// the pages, in the gallery's order (after the tank and galaxy bosses); tag: the mode's name in the gallery's top line
const BOOK_X_PAGES = [
  { key: 'astro_golem', tag: 'ASTRO TANKS' },
  { key: 'astro_mother', tag: 'ASTRO TANKS' },
  { key: 'astro_wyrm', tag: 'ASTRO TANKS' },
  { key: 'maze_minotaur', tag: 'MAZE' },
  { key: 'rally_kragg', tag: 'TANK RALLY' },
  { key: 'rts_regent', tag: 'DESERT DOMINION' },
];
const BOOK_X_ASTRO = { golem: 'astro_golem', mother: 'astro_mother', wyrm: 'astro_wyrm' };
const BOOK_X_PIC_TIME = 300;   // frames the ASTRO TANKS warning picture stays up (fire or Enter moves on sooner)

const bookXArt = key => { const a = BOOK_EXTRA_ART[key]; return a && typeof a.draw === 'function' ? a : null; };
const bookXMark = (key, what) => { try { BossBook.mark('x', key, what); } catch (e) { console.error(e); } };

// ------------------------------------------------------------------ the book: kind 'x', seeded from the records
function bookXSeed(d) {
  const set = (key, beaten) => { const e = d.x[key] || (d.x[key] = {}); e.seen = 1; if (beaten) e.beaten = 1; };
  const tryIt = f => { try { f(); } catch (e) { /* an odd record: nothing from it */ } };
  // ASTRO TANKS: the best wave reached; a boss wave reached is a boss met, a wave past it a boss beaten
  tryIt(() => {
    const w = (STORE.get('tank1990_astro', {}) || {}).wave | 0;
    [['astro_golem', 5], ['astro_mother', 10], ['astro_wyrm', 15]].forEach(([k, at]) => { if (w >= at) set(k, w > at); });
  });
  // MAZE: 5 mazes escaped (the 5th is the first lair, sealed until its beast is dead), or stars for a lair
  tryIt(() => {
    const rec = STORE.get(MODE_KEY, {}) || {}, esc = (rec.maze && rec.maze.escaped) | 0;
    if (esc >= 5 || Object.keys(rec.mazeStars || {}).some(n => +n > 0 && +n % 5 === 0 && rec.mazeStars[n] > 0)) set('maze_minotaur', true);
  });
  // TANK RALLY: a career won (the save says done, or counts champions)
  tryIt(() => {
    const s = STORE.get('tank1990_rally', null);
    if (s && (s.done || (s.champs | 0) > 0)) set('rally_kragg', true);
  });
  // DESERT DOMINION: a campaign won (done, or a House in the hall)
  tryIt(() => {
    const s = STORE.get('tank1990_rts', null);
    if (s && (s.done || Object.keys(s.hall || {}).length)) set('rts_regent', true);
  });
}

(() => {
  const load = BossBook.load;
  BossBook.load = function () {
    const d = load.apply(this, arguments);
    if (!d.x || typeof d.x !== 'object') d.x = {};
    if (!d.xSeeded) { bookXSeed(d); d.xSeeded = true; STORE.set(BOOK_KEY, d); }
    return d;
  };
  // the other modes' bosses after the tank and galaxy ones, those met whose picture is loaded
  const pages = BossBook.pages;
  BossBook.pages = function () {
    const out = pages.apply(this, arguments), d = this.load();
    for (const p of BOOK_X_PAGES) { const e = d.x[p.key]; if (e && e.seen && bookXArt(p.key)) out.push({ kind: 'x', key: p.key, beaten: !!e.beaten }); }
    return out;
  };

  // their page: the boss's own screen, with the gallery's words over its first and last lines (as bossbook.js does)
  const render = Game.renderBossBook;
  Game.renderBossBook = function (ctx) {
    const pages = BossBook.pages(), bk = this.book;
    if (!pages.length || !bk) return render.apply(this, arguments);
    if (bk.page >= pages.length) bk.page = 0;
    const pg = pages[bk.page];
    if (pg.kind !== 'x') return render.apply(this, arguments);
    const outro = bk.outro && pg.beaten, art = bookXArt(pg.key), tag = (BOOK_X_PAGES.find(p => p.key === pg.key) || {}).tag || art.mode || '';
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    try { art.draw(ctx, this.t, outro); } catch (e) { console.error(e); ctx.fillStyle = COL.black; ctx.fillRect(0, 0, SW, SH); }
    ctx.restore();
    ctx.fillStyle = COL.black;
    ctx.fillRect(0, 0, SW, 11);
    const n = (bk.page + 1) + '/' + pages.length;
    let top = 'BOSS GALLERY ' + n + '  ' + tag;
    if (top.length * 8 > SW - 4) top = 'GALLERY ' + n + '  ' + tag;
    if (top.length * 8 > SW - 4) top = n + '  ' + tag;
    Font.drawCenter(ctx, top, SW / 2, 2, COL.gold);
    const y = INTRO_Y + INTRO_H * 2 + 8 + 22;
    ctx.fillRect(0, y, SW, SH - y);
    Font.drawCenter(ctx, pg.beaten ? '< > MORE  FIRE: ' + (outro ? 'BEFORE' : 'AFTER') : '< > MORE  ESC: BACK', SW / 2, y + 1, COL.lgrey);
    if (!pg.beaten && (this.t >> 5) & 1) Font.drawCenter(ctx, 'BEAT IT FOR ITS LAST PICTURE', SW / 2, y + 12, '#7C7C7C');
  };
})();

// ------------------------------------------------------------------ the hooks: met and beaten, in each mode
const bookXWrap = (obj, name, make) => {
  const f = obj && obj[name];
  if (typeof f !== 'function') return;
  const w = make(f);
  for (const k of Object.keys(f)) w[k] = f[k];   // flags the modes check (rtsui.js: .stub, .core)
  obj[name] = w;
};

// ASTRO TANKS: the boss arrives after the field's warning; it's beaten when updateBoss clears it away
if (typeof AstroWorld === 'function') {
  const P = AstroWorld.prototype, keyOf = A => A.bossDef && BOOK_X_ASTRO[A.bossDef.key];
  bookXWrap(P, 'bossArrives', f => function () {
    const r = f.apply(this, arguments), k = keyOf(this);
    if (k && this.boss) bookXMark(k, 'seen');
    return r;
  });
  bookXWrap(P, 'updateBoss', f => function () {
    const had = this.boss, k = keyOf(this), r = f.apply(this, arguments);
    if (had && !this.boss && this.bossBeaten && k) bookXMark(k, 'beaten');
    return r;
  });
  // a boss wave begins: its WARNING picture (once a run per wave: RESTART ROUND doesn't show it again)
  bookXWrap(P, 'startWave', f => function (w) {
    const r = f.apply(this, arguments), k = keyOf(this);
    if (this.phase === 'warn' && k) {
      const shown = this.bookXShown || (this.bookXShown = {});
      if (!shown[w]) { shown[w] = true; this.bookXPic = k; }
    }
    return r;
  });
}

// MAZE: the lair's minotaur wakes; it falls to you (not swept away with the maze)
if (typeof Stage === 'function') {
  const P = Stage.prototype;
  bookXWrap(P, 'mfWake', f => function (t) {
    const was = t && t.mfDormant, r = f.apply(this, arguments);
    if (was && t.lairBoss && !t.mfDormant) bookXMark('maze_minotaur', 'seen');
    return r;
  });
  bookXWrap(P, 'mfSlain', f => function (t, by, award) {
    const r = f.apply(this, arguments);
    if (t && t.lairBoss && (award || (by && by.isPlayer))) bookXMark('maze_minotaur', 'beaten');
    return r;
  });
}

// TANK RALLY: the champion race (division 2) starts; won, it makes you champion
bookXWrap(Game, 'rallyGo', f => function () {
  const C = this.rally;
  if (C && C.div === 2) bookXMark('rally_kragg', 'seen');
  return f.apply(this, arguments);
});
bookXWrap(Game, 'rallyRaceOver', f => function () {
  const C = this.rally, fin = !!(C && C.div === 2), r = f.apply(this, arguments);
  if (fin && C.champion) bookXMark('rally_kragg', 'beaten');
  return r;
});

// DESERT DOMINION: campaign mission 9 (the Regent's palace) starts / is won
const bookXRegent = mi => !!(mi && mi.campaign && (mi.level | 0) >= 9);
bookXWrap(Game, 'rtsStartMission', f => function (opts) {
  if (bookXRegent(opts && opts.mission)) bookXMark('rts_regent', 'seen');
  return f.apply(this, arguments);
});
bookXWrap(Game, 'rtsMissionOver', f => function (result) {
  const won = !!(result && result.win && !result.quit && bookXRegent(result.mission)), r = f.apply(this, arguments);
  if (won) bookXMark('rts_regent', 'beaten');
  return r;
});

// ------------------------------------------------------------------ ASTRO TANKS: the WARNING picture as a boss wave begins
// The wave is set up and waits behind the picture (the field doesn't move); then the field's own warning runs.
(() => {
  const updatePlay = Game.updatePlay, updateScreen = Game.updateBossScreen, renderScreen = Game.renderBossScreen;
  Game.updatePlay = function () {
    const r = updatePlay.apply(this, arguments), A = this.stage;
    if (!A || !A.astro || !A.bookXPic) return r;
    const key = A.bookXPic;
    if (this.state !== 'play' || this.paused) return r;
    A.bookXPic = null;
    if (A.over || A.phase !== 'warn' || !this.bossScreensWanted() || !bookXArt(key)) return r;
    this.bossScreen = { bx: key, outro: false };
    this.setState('bossIntro');
    return r;
  };
  Game.updateBossScreen = function () {
    const b = this.bossScreen;
    if (!b || !b.bx) return updateScreen.apply(this, arguments);
    const m = Input.menu(), guest = Object.values(Input.remote).some(r => r.menu && r.menu.ok);
    if (this.t < BOSS_SCREEN_TIME && this.t < BOOK_X_PIC_TIME && !(this.t > 20 && (m.ok || m.back || guest))) return;
    if (this.t < BOOK_X_PIC_TIME) Sound.play('select');
    this.setState('play');
    this.openH = SCREEN_H / 2;
  };
  Game.renderBossScreen = function (ctx) {
    const b = this.bossScreen;
    if (!b || !b.bx) return renderScreen.apply(this, arguments);
    if (!b.booked) { b.booked = true; bookXMark(b.bx, b.outro ? 'beaten' : 'seen'); }
    const art = bookXArt(b.bx);
    if (art) { ctx.save(); ctx.imageSmoothingEnabled = false; art.draw(ctx, this.t, !!b.outro); ctx.restore(); }
    else { ctx.fillStyle = COL.black; ctx.fillRect(0, 0, SW, SH); }
  };
})();

// =====================================================================
//  the ASTRO TANKS pictures (112 x 64, shown at double size, framed as every boss screen is)
// =====================================================================
let bookXCanvas = null;
// the whole screen: the warning or the victory line, the name in bricks, the frame, the picture, its words
function bookXScreen(ctx, t, outro, o, paint) {
  const pc = bookXCanvas || (bookXCanvas = makeCanvas(INTRO_W, INTRO_H)), c = pc.getContext('2d');
  c.clearRect(0, 0, INTRO_W, INTRO_H);
  c.imageSmoothingEnabled = false;
  c.save(); paint(c, t); c.restore();
  ctx.fillStyle = COL.black; ctx.fillRect(0, 0, SW, SH);
  if (!outro) { if ((t >> 3) & 1 || t < 8) Font.drawCenter(ctx, 'WARNING! BOSS APPROACHING', SW / 2, 2, COL.red); }
  else Font.drawCenter(ctx, 'BOSS DEFEATED!', SW / 2, 2, COL.gold);
  let s = 3;
  while (s > 1 && Font.bigWidth(o.name, s) > SW - 16) s--;
  Font.big(ctx, o.name, (SW - Font.bigWidth(o.name, s)) >> 1, 23 - (7 * s >> 1), s, Sprites.bricks(ctx));
  ctx.fillStyle = outro ? '#F8D800' : '#F83800'; ctx.fillRect(INTRO_X - 4, INTRO_Y - 4, INTRO_W * 2 + 8, INTRO_H * 2 + 8);
  ctx.fillStyle = COL.black; ctx.fillRect(INTRO_X - 3, INTRO_Y - 3, INTRO_W * 2 + 6, INTRO_H * 2 + 6);
  ctx.fillStyle = '#7C7C7C'; ctx.fillRect(INTRO_X - 2, INTRO_Y - 2, INTRO_W * 2 + 4, INTRO_H * 2 + 4);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(pc, INTRO_X, INTRO_Y, INTRO_W * 2, INTRO_H * 2);
  const y = INTRO_Y + INTRO_H * 2 + 8;
  if (!outro) {
    Font.drawCenter(ctx, o.intro[0], SW / 2, y, '#F8F8F8');
    Font.drawCenter(ctx, o.intro[1], SW / 2, y + 11, '#BCBCBC');
  } else {
    Font.drawCenter(ctx, o.outro, SW / 2, y, '#F8F8F8');
    if (o.pts) Font.drawCenter(ctx, '+' + o.pts + ' PTS', SW / 2, y + 11, COL.gold);
  }
  if ((t >> 4) & 1 || t < 20) Font.drawCenter(ctx, 'PRESS ENTER', SW / 2, y + 23, COL.red);
}

// ------------------------------------------------------------------ helpers
const BOOK_X_FX = {
  cv: {},
  // a scratch canvas of its own for each use
  scratch(k, w, h) { let c = this.cv[k]; if (!c || c.width !== w || c.height !== h) c = this.cv[k] = makeCanvas(w, h); const x = c.getContext('2d'); x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1; x.clearRect(0, 0, w, h); x.imageSmoothingEnabled = false; return c; },
  // your tank as in ASTRO TANKS (seen from above; ang 0 = up, clockwise), its flame when it thrusts
  tank(c, x, y, ang, t, thrust, i = 0, size = 20) {
    const hx = Math.sin(ang), hy = -Math.cos(ang);
    if (thrust) {
      const L = 4 + ((t >> 1) & 1) * 2 + ((t * 7) % 3 === 0 ? 1 : 0);
      for (let k = 0; k < L; k++) {
        const col = k < 1 ? '#F8F8F8' : k < 3 ? '#F8D838' : k < L - 1 ? '#F87818' : '#D82800';
        Pix.rect(c, x - hx * (size * 0.5 + 1 + k), y - hy * (size * 0.5 + 1 + k), k < 3 ? 2 : 1, k < 3 ? 2 : 1, col);
      }
    }
    const img = AstroArt.tank(Config.playerPal(i), ang, thrust ? t >> 2 : 0, size);
    c.drawImage(img, Math.round(x - img.width / 2), Math.round(y - img.height / 2));
  },
  // a shot from (x0, y0) to (x1, y1), p of the way (0..1)
  shot(c, x0, y0, x1, y1, p, cols) {
    const d = Math.hypot(x1 - x0, y1 - y0) || 1;
    AstroArt.shot(c, x0 + (x1 - x0) * p, y0 + (y1 - y0) * p, (x1 - x0) / d, (y1 - y0) / d, cols);
  },
  // dots along a line (the bosses' telegraphs: where it's about to go)
  dash(c, x, y, ang, len, col, ph, gap = 6) {
    const dx = Math.sin(ang), dy = -Math.cos(ang);
    for (let s = 6 + (ph % gap); s < len; s += gap) Pix.rect(c, x + dx * s, y + dy * s, 1, 1, col);
  },
  // a crystal, turning (it flashes now and then)
  gem(c, x, y, t, big = true, ph = 0) {
    const img = astroGemArt(big, ((t + ph) >> 3) & 1);
    c.drawImage(img, Math.round(x - img.width / 2), Math.round(y - img.height / 2));
    if ((t + ph) % 48 < 4) { Pix.rect(c, x - 3, y, 7, 1, '#F8F8F8'); Pix.rect(c, x, y - 3, 1, 7, '#F8F8F8'); }
  },
  // fireworks in space: a burst every so often round (x, y), its sparks flying out, trailing, fading out
  firework(c, x, y, t, seed, spread = 20) {
    const P = 64, q = (t + seed * 23) % P, n = Math.floor((t + seed * 23) / P), r = seeded(seed * 97 + n * 13 + 5);
    const cx = Math.round(x + (r() - 0.5) * spread * 2), cy = Math.round(y + (r() - 0.5) * spread);
    const cols = [['#F8F8F8', '#F8D838', '#F87818'], ['#F8F8F8', '#58F8F8', '#3CBCFC'], ['#F8F8F8', '#F878F8', '#D800CC'], ['#F8F8F8', '#B8F818', '#58D854']][Math.floor(r() * 4)];
    if (q < 3) { Pix.disc(c, cx, cy, 2 - (q >> 1), q ? cols[1] : '#F8F8F8'); return; }
    if (q > 46) return;
    const N = 12, rad = 11 * (1 - Math.pow(1 - Math.min(1, q / 24), 2)) + (seed % 3), fall = q > 20 ? (q - 20) * 0.12 : 0;
    for (let k = 0; k < N; k++) {
      const a = k / N * Math.PI * 2 + n * 0.7, ca = Math.cos(a), sa = Math.sin(a), px = cx + ca * rad, py = cy + sa * rad + fall;
      if (q > 34 && (k + q) & 1) continue;
      const col = cols[q < 12 ? 0 : q < 26 ? 1 : 2];
      Pix.rect(c, px, py, q < 14 ? 2 : 1, q < 14 ? 2 : 1, col);
      if (q < 30) { Pix.rect(c, cx + ca * rad * 0.75, cy + sa * rad * 0.75 + fall * 0.8, 1, 1, cols[1]); Pix.rect(c, cx + ca * rad * 0.5, cy + sa * rad * 0.5 + fall * 0.6, 1, 1, cols[2]); }
    }
  },
  // a glow (heat, an aura): rings of dithered colour, the outer ones thinner
  halo(c, cx, cy, r, cols, ph = 0) {
    cols.forEach((col, i) => { const rr = r - i * 3; if (rr > 0) GxArt.glow(c, cx, cy, rr, rr, col, ph + i); });
  },
  // blasts popping over a box, one after another
  booms(c, x, y, w, h, t, n, seed, s = 1) {
    for (let k = 0; k < n; k++) {
      const q = t + k * Math.floor(40 / n) + seed * 7, p = q % 40, r = seeded(seed * 31 + k * 7 + Math.floor(q / 40) * 3 + 1);
      IA.boom(c, x + r() * w, y + r() * h, p, Math.round(10 * s * (0.7 + r() * 0.5)), seed + k);
    }
  },
  // stars that slide past (layers at speeds), for a sense of flight
  streak(c, t, seed, n, v, col, len = 1) {
    const r = seeded(seed);
    for (let k = 0; k < n; k++) {
      const y = Math.floor(r() * INTRO_H), x = ((r() * 200 - t * v) % 200 + 200) % 200 - 40;
      if (x < -len || x > INTRO_W) continue;
      Pix.rect(c, x, y, len, 1, col);
    }
  },
};

// =====================================================================
//  CINDER COLOSSUS: the molten rock rolls in, its iron plates turning, magma between them
// =====================================================================
// the rock put together as in the fight (astroboss.js's art): lava (or the cracked shell), plates, the light over it
// plates: 8 of 'iron' | 'cracked' | 'crust' | 'hot' | null (gone)
function bookXGolemBody(rot, plates, shell, glow) {
  const art = astroBossGolemArt(), cv = BOOK_X_FX.scratch('golem', 96, 96), c = cv.getContext('2d');
  if (!shell) art.lava.draw(c, 48, 48, rot);
  else { art.shell.draw(c, 48, 48, rot); if (glow > 0) { c.globalAlpha = Math.min(1, glow); art.glow.draw(c, 48, 48, rot); c.globalAlpha = 1; } }
  plates.forEach((p, i) => { if (p) art[p].draw(c, 48, 48, rot + i * Math.PI / 4); });
  c.globalCompositeOperation = 'source-atop'; c.drawImage(art.shade, 0, 0); c.globalCompositeOperation = 'source-over';
  return cv;
}
// the far side of the sky: a red nebula, a small hot sun, the asteroid belt's dust
const bookXGolemSky = () => GxArt.once('bxGolemSky', c => {
  Pix.rect(c, 0, 0, INTRO_W, INTRO_H, '#06020A');
  GxArt.cloud(c, 82, 18, 46, 20, ['#1C0408', '#300810', '#4C1014', '#6C1C10'], 3);
  GxArt.cloud(c, 18, 56, 30, 10, ['#140408', '#240810', '#3C0C10'], 5);
  GxArt.cloud(c, 100, 52, 18, 8, ['#180808', '#2C0C08'], 8);
  Pix.stars(c, 46, 31, 3, INTRO_H);
  GxArt.ball(c, 14, 12, 5, 5, ['#F8F8F8', '#F8F878', '#F8D800', '#F87800', '#A82800']);
  GxArt.glow(c, 14, 12, 8, 8, '#7C2800', 0);
  GxArt.ball(c, 14, 12, 5, 5, ['#F8F8F8', '#F8F878', '#F8D800', '#F87800', '#A82800']);
});

function bookXGolemIntro(c, t) {
  c.drawImage(bookXGolemSky(), 0, 0);
  Pix.stars(c, 16, 37, t, INTRO_H);
  // the belt: rocks drifting past behind it
  for (const [kind, R, seed, y, v, ph] of [['stone', 4, 3, 8, 0.18, 0], ['magma', 6, 4, 50, 0.12, 60], ['stone', 3, 5, 30, 0.25, 120], ['iron', 5, 6, 58, 0.15, 30], ['stone', 3, 7, 4, 0.2, 90]]) {
    const x = 124 - ((t * v + ph) % 150);
    AstroArt.drawRock(c, kind, R, seed, t * 0.02 * (seed & 1 ? 1 : -1), x, y);
  }
  // its cycle: rolling about, then winding up (the line to you), the charge, back; a vent blowing now and then
  const P = 200, q = t % P, wind = q >= 90 && q < 140, charge = q >= 140 && q < 156;
  const lunge = charge ? (q - 140) / 16 : q >= 156 && q < 190 ? 1 - (q - 156) / 34 : 0;
  const tx = 20, ty = 42, gx0 = 78, gy0 = 31 + Math.sin(t / 22) * 1.5, aim = Math.atan2(tx - gx0, -(ty - gy0));
  const gx = gx0 + Math.sin(aim) * 14 * lunge + (wind ? ((t >> 1) & 1) - 0.5 : 0), gy = gy0 - Math.cos(aim) * 14 * lunge;
  // it turns faster as it charges (kept smooth from cycle to cycle); the vent that blows is the plate facing up and left
  const n = Math.floor(t / P), rot = t * 0.025 + (n * 16 + Math.max(0, Math.min(16, q - 140))) * 0.065, hot = q >= 30 && q < 70;
  const rotV = (n * P + 70) * 0.025 + n * 16 * 0.065, vent = ((Math.round((-1.25 - rotV) / (Math.PI / 4)) % 8) + 8) % 8;
  // the heat round it
  BOOK_X_FX.halo(c, gx, gy, 36, ['#300800', '#4C1000'], (t >> 3) & 1);
  if (wind) BOOK_X_FX.dash(c, gx, gy, aim, 64, (t >> 1) & 1 ? '#F8F8F8' : '#F83800', t >> 1, 6);
  // sparks and embers torn off as it rolls
  for (let k = 0; k < 10; k++) {
    const p = ((t * 0.8 + k * 17) % 60) / 60, a = k * 2.39 + rot * 0.5, d = 28 + p * 18;
    if (p < 0.85 || (t + k) & 1) Pix.rect(c, gx + Math.sin(a) * d + p * 8, gy - Math.cos(a) * d, 1, 1, p < 0.3 ? '#F8F878' : p < 0.6 ? '#F8B800' : '#A81000');
  }
  const plates = Array.from({ length: 8 }, (_, i) => (i === vent && hot ? ((t >> 2) & 1 ? 'hot' : 'iron') : i === (vent + 3) % 8 ? 'cracked' : 'iron'));
  c.drawImage(bookXGolemBody(rot, plates, false), Math.round(gx - 48), Math.round(gy - 48));
  // the vent blows: magma spat out through the gap
  if (q >= 70 && q < 100) {
    const a = rot + vent * Math.PI / 4, e = q - 70;
    for (let k = 0; k < 11; k++) {
      const s = e * (0.6 + (k % 4) * 0.22), sp = (k - 5) * 0.07, d = 26 + s;
      if (e > 20 && (k + t) & 1) continue;
      Pix.disc(c, Math.round(gx + Math.sin(a + sp) * d), Math.round(gy - Math.cos(a + sp) * d), k % 3 ? 1 : 2, k % 2 ? '#F8B800' : '#F83800');
      Pix.rect(c, gx + Math.sin(a + sp) * d, gy - Math.cos(a + sp) * d, 1, 1, '#F8F878');
    }
  }
  // you, holding your ground and firing: the shots ring off the iron
  const tang = Math.atan2(gx - tx, -(gy - ty)) + Math.sin(t / 16) * 0.05;
  for (let k = 0; k < 3; k++) {
    const p = ((t + k * 12) % 36) / 36, hit = p > 0.82;
    const ex = gx - Math.sin(tang) * 28, ey = gy + Math.cos(tang) * 28;
    if (!hit) BOOK_X_FX.shot(c, tx + Math.sin(tang) * 9, ty - Math.cos(tang) * 9, ex, ey, p / 0.82);
    else Art.sparks(c, Math.round(ex), Math.round(ey), t + k * 7, 4, '#F8F8F8');
  }
  BOOK_X_FX.tank(c, tx - (charge ? Math.sin(tang) * 2 : 0), ty, tang, t, false);
  // the screen glows as it charges
  if (charge && (t & 2)) Art.dith(c, 0, 0, INTRO_W, INTRO_H, '#581000', t & 1);
}

function bookXGolemOutro(c, t) {
  c.drawImage(bookXGolemSky(), 0, 0);
  Pix.stars(c, 16, 37, t, INTRO_H);
  const p = Math.min(1, t / 140), e = 1 - (1 - p) * (1 - p), cx = 56, cy = 32;
  // the blast's ring opening out, the first time round
  if (t < 40) { for (let k = 0; k < 3; k++) { const r = t * 1.6 - k * 7; if (r > 4) Art.ring(c, cx, cy, r, k ? '#F87800' : '#F8F8F8', Math.round(r * 3), t / 9); } }
  // its iron plates flung away, tumbling
  const art = astroBossGolemArt();
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4 + 0.4, d = 22 + e * 56 + (i % 3) * 6 * e, spin = a + t * 0.05 * (i & 1 ? 1 : -1) * (0.5 + (i % 3) * 0.3);
    const px = cx + Math.sin(a) * d * 1.2, py = cy - Math.cos(a) * d * 0.8;
    if (px < -20 || px > INTRO_W + 20 || py < -20 || py > INTRO_H + 20) continue;
    art[i % 3 === 1 ? 'cracked' : 'iron'].draw(c, px - Math.sin(spin) * 20, py + Math.cos(spin) * 20, spin);
  }
  // the shell, cracked open and cooling, in two halves drifting apart, glowing less and less
  const body = bookXGolemBody(0.4, [null, null, null, null, null, null, null, null], true, Math.max(0, 0.9 - p * 0.9) + 0.25 * ((t >> 3) & 1) * (1 - p));
  const split = 2 + e * 8;
  Art.rot(c, 48, 96, sc => sc.drawImage(body, 0, 0, 48, 96, 0, 0, 48, 96), cx - 24 - split, cy + e * 4, -e * 0.3);
  Art.rot(c, 48, 96, sc => sc.drawImage(body, 48, 0, 48, 96, 0, 0, 48, 96), cx + 24 + split, cy - e * 3, e * 0.25);
  // the molten heart spilling out of the gap in blobs that cool from yellow to grey
  for (let k = 0; k < 16; k++) {
    const q = ((t * 0.6 + k * 11) % 80) / 80, a = k * 2.4, d = 2 + q * 34;
    const col = q < 0.25 ? '#F8F878' : q < 0.5 ? '#F8B800' : q < 0.75 ? '#A81000' : '#585858';
    if (q > 0.85 && (t + k) & 1) continue;
    Pix.rect(c, cx + Math.cos(a) * d * 0.35, cy + Math.sin(a) * d, q < 0.5 ? 2 : 1, q < 0.5 ? 2 : 1, col);
  }
  // smoke off the halves, little blasts still going off
  Art.smoke(c, cx - 26 - split, cy - 16, t, 4, 1, true); Art.smoke(c, cx + 22 + split, cy - 18, t + 20, 4, 3, true);
  if (t < 160) BOOK_X_FX.booms(c, cx - 28, cy - 22, 56, 44, t, 3, 4, 0.8);
  // the crystals it leaves, drifting out of the gap
  for (let k = 0; k < 9; k++) {
    const a = k * 2.3 + 0.3, d = 4 + e * (8 + (k % 4) * 4);
    BOOK_X_FX.gem(c, cx + Math.cos(a) * d * 0.7, cy + Math.sin(a) * d * 1.3 + Math.sin(t / 10 + k), t, k % 3 !== 0, k * 11);
  }
  // you weave up through the gap; fireworks
  const fy = (t * 0.6) % 120;
  BOOK_X_FX.tank(c, cx + Math.sin(t / 14) * 3, 78 - fy, Math.cos(t / 14) * 0.25, t, true);
  BOOK_X_FX.firework(c, 18, 16, t, 1, 12); BOOK_X_FX.firework(c, 98, 14, t, 2, 10); BOOK_X_FX.firework(c, 96, 50, t + 30, 3, 8);
}

BOOK_EXTRA_ART.astro_golem = {
  name: 'CINDER COLOSSUS', mode: 'ASTRO TANKS', pts: 2500, desc: 'A MOLTEN ROCK IN IRON PLATES',
  draw(ctx, t, outro) {
    bookXScreen(ctx, t, outro, { name: this.name, intro: ['A MOLTEN ROCK IN IRON PLATES', 'SHOOT THE PLATES OFF FIRST'], outro: 'THE FIRE HAS GONE OUT', pts: this.pts },
      outro ? bookXGolemOutro : bookXGolemIntro);
  },
};

// =====================================================================
//  VOID MATRIARCH: the mothership looms over you, pylons round its shield, its beam reaching for you
// =====================================================================
// the mothership as in the fight (astroboss.js's art), centred on (X, Y): pyA its pylons' turn (null: none),
// ring its turrets' turn, look where its eye looks, dead its eye put out
function bookXMother(c, X, Y, t, o) {
  const art = astroBossMotherArt(), TAU = Math.PI * 2;
  X = Math.round(X); Y = Math.round(Y);
  if (o.pyA !== null && o.pyA !== undefined) for (let k = 0; k < 3; k++) {
    const a = o.pyA + k * TAU / 3;
    for (let s = 28; s < 36; s++) Pix.rect(c, X + Math.sin(a) * s - 1, Y - Math.cos(a) * s - 1, 2, 2, '#585858');
    art.pylon.draw(c, X + Math.sin(a) * 38, Y - Math.cos(a) * 38, a, false);
    if ((t + k * 9) % 30 < 4) Pix.rect(c, X + Math.sin(a) * 41, Y - Math.cos(a) * 41, 1, 1, '#F8F8F8');
  }
  c.drawImage(art.hull, X - 36, Y - 36);
  const lc = o.dead ? '#383838' : o.lights || '#3CBCFC';
  for (let i = 0; i < 16; i++) {
    if ((i + (t >> 3)) % 4 && !o.dead) continue;
    const a = i / 16 * TAU + 0.2;
    if (Math.abs(astroBossAngDiff(a, Math.PI)) < 0.3) continue;
    Pix.rect(c, X + Math.sin(a) * 27.5 - 1, Y - Math.cos(a) * 27.5 - 1, 2, 2, lc);
  }
  if (o.bay && (t >> 2) & 1) Pix.rect(c, X - 3, Y + 18, 6, 10, '#F8F8F8');
  for (let i = 0; i < 4; i++) { const a = o.ring + i * TAU / 4; art.turret.draw(c, X + Math.sin(a) * 20, Y - Math.cos(a) * 20, o.dead ? a + 0.6 : a, !o.dead && o.gun === i && (t & 2)); }
  Pix.disc(c, X, Y, 9, '#4428BC');
  Pix.rect(c, X - 6, Y - 6, 3, 2, '#6844FC'); Pix.rect(c, X - 7, Y - 4, 2, 2, '#6844FC');
  if (o.dead) {
    // the eye put out: shut, and crossed
    Pix.rect(c, X - 4, Y, 8, 1, '#202020');
    for (let k = -3; k <= 3; k++) { Pix.rect(c, X + k, Y + k, 1, 1, '#F83800'); Pix.rect(c, X + k, Y - k, 1, 1, '#F83800'); }
  } else {
    const blink = t % 180 < 6, ex = Math.round(X + Math.sin(o.look) * 2), ey = Math.round(Y - Math.cos(o.look) * 2);
    if (blink) Pix.rect(c, ex - 4, ey, 8, 1, '#9878F8');
    else {
      Pix.rect(c, ex - 4, ey - 2, 8, 5, '#F8F8F8'); Pix.rect(c, ex - 3, ey - 3, 6, 7, '#F8F8F8');
      Pix.rect(c, Math.round(ex + Math.sin(o.look) * 1.5) - 1, Math.round(ey - Math.cos(o.look) * 1.5) - 1, 3, 3, o.angry ? '#A81000' : '#101010');
    }
    Pix.rect(c, X - 5, Y - 7, 2, 1, '#F8F8F8');
  }
  if (o.shield) for (let k = 0; k < 90; k++) {
    const ph = (k + (t >> 2)) % 6;
    if (ph === 5) continue;
    const a = k / 90 * TAU;
    Pix.rect(c, X + Math.sin(a) * 34, Y - Math.cos(a) * 34, 1, 1, ph === 0 ? '#F8F8F8' : (k & 1) ? '#3CBCFC' : '#0078F8');
  }
}
// a small saucer of its brood (9 x 5), its lights going round
function bookXSaucer(c, x, y, t, dead) {
  x = Math.round(x) - 4; y = Math.round(y) - 2;
  Pix.rect(c, x + 3, y, 3, 1, dead ? '#585858' : '#A4E4FC'); Pix.rect(c, x + 2, y + 1, 5, 1, dead ? '#383838' : '#3CBCFC');
  Pix.rect(c, x, y + 2, 9, 1, dead ? '#7C7C7C' : '#BCBCBC'); Pix.rect(c, x + 1, y + 3, 7, 1, '#585858'); Pix.rect(c, x + 3, y + 4, 3, 1, '#383838');
  if (!dead) Pix.rect(c, x + 1 + ((t >> 2) % 4) * 2, y + 2, 1, 1, (t >> 3) & 1 ? '#F83800' : '#F8D838');
}
const bookXMotherSky = () => GxArt.once('bxMotherSky', c => {
  Pix.rect(c, 0, 0, INTRO_W, INTRO_H, '#04001C');
  GxArt.cloud(c, 30, 20, 40, 16, ['#0C0430', '#140840', '#200C54'], 2);
  GxArt.cloud(c, 96, 8, 26, 9, ['#0C0430', '#180C48'], 6);
  Pix.stars(c, 44, 17, 3, INTRO_H);
  // a blue world far below, its night side towards us
  GxArt.ball(c, 4, 86, 42, 42, ['#78D8F8', '#2C8CD8', '#1C4CA8', '#102878', '#060C38'], (x, y) => Math.sin(y / 2.6 + x / 9) * 0.1);
  for (let x = 0; x < 46; x++) { const y = Math.round(86 - Math.sqrt(Math.max(0, 44 * 44 - (x - 4) ** 2))); if (y >= 0 && y < INTRO_H) Pix.rect(c, x, y, 1, 1, x & 1 ? '#3CBCFC' : '#A4E4FC'); }
  for (let k = 0; k < 6; k++) Pix.rect(c, 3 + k * 5, 52 + (k % 3) * 3, 3, 1, '#F8F8F8');
});

function bookXMotherIntro(c, t) {
  c.drawImage(bookXMotherSky(), 0, 0);
  Pix.stars(c, 14, 19, t, INTRO_H);
  const X = 70, Y = 22 + Math.round(Math.sin(t / 30) * 1.5), tx = 24, ty = 50;
  // the tractor beam reaching for you, sweeping across; caught in it, you're drawn in
  const P = 240, q = t % P, on = q >= 60 && q < 190, aim = Math.atan2(tx - X, -(ty - Y)), sweep = on ? Math.max(0, 1 - (q - 60) / 50) * 0.7 : 0.7;
  const ba = aim + sweep, W = 0.2, L = 66, pull = on && q > 110 ? Math.min(1, (q - 110) / 80) : 0;
  if (q >= 40 && q < 60) BOOK_X_FX.dash(c, X, Y, aim + 0.7, L, (t >> 2) & 1 ? '#A4E4FC' : '#3CBCFC', t >> 1, 5);
  if (on) {
    for (let s = 26; s < L; s++) {
      const hw = Math.round(s * Math.tan(W));
      for (let j = -hw; j <= hw; j++) {
        const x = X + Math.sin(ba) * s + Math.cos(ba) * j, y = Y - Math.cos(ba) * s + Math.sin(ba) * j;
        if (((Math.round(x) + Math.round(y)) & 1) === ((t >> 2) & 1)) Pix.rect(c, x, y, 1, 1, '#1C5CA8');
      }
    }
    for (let s = L - ((t * 1.5) % 14); s > 28; s -= 14) for (let j = -s * W; j <= s * W; j += 1) Pix.rect(c, X + Math.sin(ba) * s + Math.cos(ba) * j, Y - Math.cos(ba) * s + Math.sin(ba) * j, 1, 1, '#A4E4FC');
    for (const e of [-W, W]) Pix.line(c, Math.round(X + Math.sin(ba + e) * 26), Math.round(Y - Math.cos(ba + e) * 26), Math.round(X + Math.sin(ba + e) * L), Math.round(Y - Math.cos(ba + e) * L), '#F8F8F8');
  }
  const px = tx + (X - tx) * pull * 0.18 + (pull ? ((t >> 1) & 1) - 0.5 : 0), py = ty + (Y - ty) * pull * 0.18;
  // the brood: saucers out of the bay, peeling off left and right
  for (let k = 0; k < 4; k++) {
    const p = ((t + k * 45) % 180) / 180, side = k & 1 ? 1 : -1;
    const sx = X + side * p * p * 70 + Math.sin(p * 9 + k) * 3, sy = Y + 30 + p * 22 - p * p * 34 * (k % 3 === 0 ? 1 : 0.4);
    if (p > 0.05) bookXSaucer(c, sx, sy, t + k * 7);
    if (p > 0.3 && (t + k * 13) % 50 < 12) BOOK_X_FX.shot(c, sx, sy, sx + (px - sx) * 0.5, sy + (py - sy) * 0.5, ((t + k * 13) % 50) / 12, ['#F8F8F8', '#F878F8', '#D800CC', '#7C0868']);
  }
  bookXMother(c, X, Y, t, { pyA: t / 120, ring: -t / 60, look: Math.atan2(px - X, -(py - Y)), shield: true, bay: (t % 45) < 12, gun: (t >> 5) & 3 });
  // you, caught or about to be: a ring closing in when the beam has you
  const tang = Math.atan2(X - px, -(Y - py)) + Math.sin(t / 9) * (pull ? 0.25 : 0.05);
  BOOK_X_FX.tank(c, px, py, tang, t, !pull && (t >> 4) & 1);
  if (pull > 0.2) Art.ring(c, Math.round(px), Math.round(py), Math.round(13 - pull * 5), (t >> 1) & 1 ? '#F83800' : '#F8F8F8', 18, t / 10);
  // your shots ring off her shield
  if (!on) for (let k = 0; k < 2; k++) {
    const p = ((t + k * 18) % 36) / 36, a = Math.atan2(px - X, -(py - Y)) + (k - 0.5) * 0.12, hx = X + Math.sin(a) * 34, hy = Y - Math.cos(a) * 34;
    if (p < 0.8) BOOK_X_FX.shot(c, px + Math.sin(tang) * 9, py - Math.cos(tang) * 9, hx, hy, p / 0.8);
    else for (let j = -3; j <= 3; j++) Pix.rect(c, X + Math.sin(a + j * 0.06) * 35, Y - Math.cos(a + j * 0.06) * 35, 1, 1, '#F8F8F8');
  }
}

function bookXMotherOutro(c, t) {
  c.drawImage(bookXMotherSky(), 0, 0);
  Pix.stars(c, 14, 19, t, INTRO_H);
  const p = Math.min(1, t / 150), e = 1 - (1 - p) * (1 - p), X = 54, Y = 28;
  // the mothership, broken in two along a jagged crack (round its dead eye), the halves drifting apart, burning
  const full = BOOK_X_FX.scratch('motherFull', 100, 100);
  bookXMother(full.getContext('2d'), 50, 50, t, { pyA: null, ring: 0.3, look: 0, shield: false, dead: true });
  const crack = [[46, 0], [49, 16], [41, 28], [39, 42], [41, 56], [47, 68], [43, 84], [48, 100]];
  const half = (left, k) => {
    const h = BOOK_X_FX.scratch(k, 100, 100), hc = h.getContext('2d');
    hc.save(); hc.beginPath(); hc.moveTo(left ? 0 : 100, 0); for (const [x, y] of crack) hc.lineTo(x, y); hc.lineTo(left ? 0 : 100, 100); hc.closePath(); hc.clip();
    hc.drawImage(full, 0, 0); hc.restore();
    // the break glows and burns
    for (let k = 1; k < crack.length - 1; k++) {
      const [x, y] = crack[k], ox = left ? -2 : 2;
      if (y < 20 || y > 80) continue;
      Pix.rect(hc, x + ox - 1, y - 3, 2, 6, (t + k) & 4 ? '#F8B800' : '#F83800');
      if ((k + (left ? 0 : 1)) % 2) Art.fire(hc, x + ox - 3, y + 1, 6, t + k * 5 + (left ? 0 : 9));
    }
    return h;
  };
  const L = half(true, 'motherL'), R = half(false, 'motherR');
  Art.rot(c, 100, 100, sc => sc.drawImage(L, 0, 0), X - 4 - e * 14, Y + e * 4, -e * 0.3);
  Art.rot(c, 100, 100, sc => sc.drawImage(R, 0, 0), X + 4 + e * 14, Y - e * 3, e * 0.22);
  // smoke streaming off the halves, blasts while it comes apart
  Art.smoke(c, X - 14 - e * 14, Y - 6, t, 3, 1, true); Art.smoke(c, X + 8 + e * 14, Y - 10, t + 25, 3, 4, true);
  if (t < 220) BOOK_X_FX.booms(c, X - 30, Y - 22, 60, 44, t, 3, 2, 0.8);
  // its pylons tumbling away, dead
  const art = astroBossMotherArt();
  for (let k = 0; k < 3; k++) {
    const a = k * 2.1 + 0.9, d = 30 + e * 14;
    art.pylon.draw(c, X + Math.sin(a) * d * 1.45, Y - Math.cos(a) * d * 0.75, a + t * 0.05 * (k & 1 ? 1 : -1));
  }
  // its brood falls with it, smoking
  for (let k = 0; k < 2; k++) {
    const q = ((t * 0.45 + k * 60) % 120) / 120, sx = 8 + k * 92 + q * 6 * (k ? -1 : 1), sy = -4 + q * 72;
    bookXSaucer(c, sx, sy, t, true); Art.smoke(c, sx - 1, sy - 2, t + k * 10, 2, k, true);
  }
  // the crystals spill out of the gap, and you and your wingman fly up through it; fireworks over it all
  for (let k = 0; k < 7; k++) { const a = k * 0.9 + 0.4, d = 4 + e * (6 + k * 3); BOOK_X_FX.gem(c, X + Math.cos(a) * d * 0.6, Y + 6 + Math.sin(a) * d * 1.1, t, k % 2 === 0, k * 7); }
  const fly = (t * 0.6) % 120;
  BOOK_X_FX.tank(c, X - 1, 76 - fly, 0, t, true, 0);
  BOOK_X_FX.tank(c, X + 3, 98 - fly, 0, t, true, 1);
  BOOK_X_FX.firework(c, 18, 14, t, 4); BOOK_X_FX.firework(c, 96, 18, t, 5, 12); BOOK_X_FX.firework(c, 94, 52, t + 20, 6, 8);
}

BOOK_EXTRA_ART.astro_mother = {
  name: 'VOID MATRIARCH', mode: 'ASTRO TANKS', pts: 3750, desc: 'A MOTHERSHIP AND HER BROOD',
  draw(ctx, t, outro) {
    bookXScreen(ctx, t, outro, { name: this.name, intro: ['KNOCK OUT HER SHIELD PYLONS', 'STAY OUT OF THE TRACTOR BEAM'], outro: 'THE MOTHERSHIP IS SCRAP', pts: this.pts },
      outro ? bookXMotherOutro : bookXMotherIntro);
  },
};

// =====================================================================
//  COMET WYRM: the serpent of rock and iron coils round the picture, its tail a burning comet
// =====================================================================
// points along a smooth curve through pts (Catmull-Rom), every `step` px of its length: [x, y, ang] (ang along it)
function bookXSpine(pts, step, n) {
  const dense = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let k = 0; k < 16; k++) {
      const u = k / 16, u2 = u * u, u3 = u2 * u;
      const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * u + (2 * a - 5 * b + 4 * c - d) * u2 + (-a + 3 * b - 3 * c + d) * u3);
      dense.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  dense.push(pts[pts.length - 1]);
  const out = [];
  let acc = 0, want = 0;
  for (let i = 1; i < dense.length && out.length < n; i++) {
    const [ax, ay] = dense[i - 1], [bx, by] = dense[i], d = Math.hypot(bx - ax, by - ay);
    while (acc + d >= want && out.length < n) {
      const f = d ? (want - acc) / d : 0;
      out.push([ax + (bx - ax) * f, ay + (by - ay) * f, Math.atan2(ax - bx, -(ay - by))]);   // ang: pointing back towards the head
      want += step;
    }
    acc += d;
  }
  return out;
}
// the segments behind the head: radius and kind (iron and rock by turns, smaller towards the tail)
const BOOK_X_WYRM_SEGS = [[8, 'iron'], [8, 'rock'], [7, 'iron'], [7, 'rock'], [7, 'iron'], [6, 'rock'], [6, 'iron'], [5, 'rock'], [5, 'iron'], [4, 'rock'], [4, 'iron'], [3, 'rock']];
// the comet: a white-hot core in a blue blaze, its flame streaming away (along ang)
function bookXComet(c, x, y, ang, t, len = 30, out = 0) {
  const dx = Math.sin(ang), dy = -Math.cos(ang), nx = -dy, ny = dx;
  if (out < 1) for (let k = 0; k < 60; k++) {
    const r = seeded(k * 7 + 3), q = ((t * (1.2 + r()) + r() * len) % len), w = (q / len) * 6 * (0.4 + r() * 0.6), j = (r() - 0.5) * 2 * w + Math.sin(t / 5 + k) * 0.6;
    if (q > len * (1 - out)) continue;
    Pix.rect(c, x + dx * q + nx * j, y + dy * q + ny * j, 1, 1, q < len * 0.2 ? '#F8F8F8' : q < len * 0.45 ? '#A4E4FC' : q < len * 0.75 ? '#3CBCFC' : '#0058F8');
  }
  const pulse = (t >> 2) & 1;
  if (out < 1) {
    Pix.disc(c, Math.round(x), Math.round(y), 5 + pulse, '#0078F8'); Pix.disc(c, Math.round(x), Math.round(y), 3, '#3CBCFC');
    Pix.rect(c, x - 1, y - 1, 3, 3, '#F8F8F8');
  } else { Pix.disc(c, Math.round(x), Math.round(y), 3, '#383838'); Pix.disc(c, Math.round(x), Math.round(y), 1, '#7C7C7C'); }
}
const bookXWyrmSky = () => GxArt.once('bxWyrmSky', c => {
  Pix.rect(c, 0, 0, INTRO_W, INTRO_H, '#000814');
  GxArt.cloud(c, 70, 34, 50, 22, ['#000C1C', '#04142C', '#081C3C'], 4);
  GxArt.cloud(c, 14, 10, 22, 8, ['#04101C', '#08182C'], 9);
  Pix.stars(c, 50, 23, 3, INTRO_H);
  // an icy moon at the edge
  GxArt.ball(c, 104, 60, 14, 14, ['#F8F8F8', '#C8E0F0', '#88A8C8', '#4C6888', '#1C2C44']);
  for (const [x, y, r] of [[98, 52, 2], [104, 56, 1], [96, 58, 1]]) GxArt.crater(c, x, y, r, '#88A8C8', '#E0F0F8');
});
// the wyrm along its points (from the tail to the head, so the head lies on top); hot: red-hot iron (in a rage)
function bookXWyrmDraw(c, sp, t, o) {
  const art = astroBossWyrmArt(), segs = BOOK_X_WYRM_SEGS;
  const tail = sp[segs.length + 1];
  if (tail && !o.noTail) bookXComet(c, tail[0], tail[1], tail[2] + Math.PI, t, 26);
  for (let i = segs.length - 1; i >= 0; i--) {
    const p = sp[i + 1];
    if (!p) continue;
    const [r, kind] = segs[i];
    if (kind === 'iron') (o.hot ? art.hot : art.iron)[r].draw(c, p[0], p[1], p[2]);
    else { const im = art.rock[r][i & 1]; c.drawImage(im, Math.round(p[0] - im.width / 2), Math.round(p[1] - im.height / 2)); }
  }
  const h = sp[0];
  (o.open ? (o.hot ? art.jawsHot : art.jaws) : (o.hot ? art.headHot : art.head)).draw(c, h[0], h[1], h[2]);
}

function bookXWyrmIntro(c, t) {
  c.drawImage(bookXWyrmSky(), 0, 0);
  Pix.stars(c, 16, 29, t, INTRO_H);
  BOOK_X_FX.streak(c, t, 41, 10, 0.6, '#1C3C6C', 3);
  // it coils round, the head rearing to strike at you: the line, then the lunge, jaws wide
  const P = 180, q = t % P, rear = q >= 70 && q < 110, strike = q >= 110 && q < 124, back = q >= 124 && q < 160;
  const lunge = strike ? (q - 110) / 14 : back ? 1 - (q - 124) / 36 : 0, open = rear ? (q >> 3) & 1 : strike || (back && q < 140);
  const tx = 11, ty = 52, w = k => Math.sin(t / 14 + k * 1.1) * 2.2;
  const hx0 = 44, hy0 = 29, hx = hx0 + (tx - hx0) * 0.36 * lunge - (rear ? 2 : 0), hy = hy0 + (ty - hy0) * 0.36 * lunge - (rear ? 2 : 0);
  const pts = [[hx, hy], [54 + w(1) * 0.5, 26 + w(1)], [66 + w(2), 37 + w(2)], [81, 47 + w(3)], [97 + w(4), 42], [104, 26 + w(5)], [95 + w(6), 12], [77, 7 + w(7)], [59 + w(8), 11], [46, 16 + w(9)], [32, 19]];
  const sp = bookXSpine(pts, 9.5, BOOK_X_WYRM_SEGS.length + 2);
  sp[0][2] = Math.atan2(tx - hx, -(ty - hy)) * 0.6 + sp[0][2] * 0.4;   // the head turns to you
  if (rear) BOOK_X_FX.dash(c, hx, hy, Math.atan2(tx - hx, -(ty - hy)), 40, (t >> 1) & 1 ? '#F8F8F8' : '#F83800', t >> 1, 5);
  // dust and grit shed from its rocks
  for (let k = 0; k < 8; k++) { const s = sp[2 + k] || sp[2], p = ((t + k * 13) % 40) / 40; Pix.rect(c, s[0] + Math.sin(k * 3) * p * 10, s[1] + p * 8, 1, 1, p < 0.5 ? '#C84C0C' : '#503000'); }
  bookXWyrmDraw(c, sp, t, { open, hot: false });
  // you back off, firing at its head
  const tang = Math.atan2(hx - tx, -(hy - ty));
  for (let k = 0; k < 2; k++) { const p = ((t + k * 15) % 30) / 30; if (p < 0.8) BOOK_X_FX.shot(c, tx + Math.sin(tang) * 9, ty - Math.cos(tang) * 9, hx, hy, p / 0.8); else Art.sparks(c, Math.round(hx - 4), Math.round(hy + 4), t + k * 5, 4, '#F8B800'); }
  BOOK_X_FX.tank(c, tx - lunge * 3, ty + lunge, tang, t, strike);
}

function bookXWyrmOutro(c, t) {
  c.drawImage(bookXWyrmSky(), 0, 0);
  Pix.stars(c, 16, 29, t, INTRO_H);
  const p = Math.min(1, t / 160), e = 1 - (1 - p) * (1 - p), cx = 62, cy = 30;
  // the coil, broken: its pieces drifting apart and tumbling, the rocks crumbling, the comet burnt out
  const pts = [[44, 29], [54, 26], [66, 37], [81, 47], [97, 42], [104, 26], [95, 12], [77, 7], [59, 11], [46, 16], [32, 19]];
  const base = bookXSpine(pts, 9.5, BOOK_X_WYRM_SEGS.length + 2), art = astroBossWyrmArt();
  const moved = base.map(([x, y, a], i) => {
    const dx = x - cx, dy = y - cy, d = Math.hypot(dx, dy) || 1, push = e * (i > BOOK_X_WYRM_SEGS.length ? 2 : 3 + (i % 3) * 2);
    return [x + dx / d * push + Math.sin(i * 1.7) * e * 2, y + dy / d * push * 0.7 + Math.sin(t / 30 + i) * e, a + e * (i & 1 ? 1 : -1) * 0.5 + t * 0.006 * (i & 1 ? 1 : -1)];
  });
  const tail = moved[BOOK_X_WYRM_SEGS.length + 1];
  if (tail) { bookXComet(c, tail[0], tail[1], tail[2] + Math.PI, t, 20, Math.min(1, t / 60)); Art.smoke(c, tail[0], tail[1] - 2, t, 4, 7, true); }
  BOOK_X_WYRM_SEGS.forEach(([r, kind], i) => {
    const s = moved[i + 1];
    if (!s) return;
    if (kind === 'iron') art.iron[r].draw(c, s[0], s[1], s[2]);
    else {
      // a rock segment falls to bits
      if (p < 0.5) { const im = art.rock[r][i & 1]; c.drawImage(im, Math.round(s[0] - im.width / 2), Math.round(s[1] - im.height / 2)); }
      for (let k = 0; k < 3; k++) { const a = k * 2.1 + i, d = p * (4 + k * 3); if (p >= 0.3) AstroArt.drawRock(c, 'magma', Math.max(2, r - 3), i * 3 + k, t * 0.05 + k, s[0] + Math.cos(a) * d, s[1] + Math.sin(a) * d); }
    }
  });
  // the head, adrift and turning slowly, jaws slack, dazed
  const h = moved[0], ha = h[2] + 0.4 + Math.sin(t / 40) * 0.3;
  const hx = h[0] - e * 4, hy = h[1] + e * 8;
  art.jaws.draw(c, hx, hy, ha);
  for (let k = 0; k < 4; k++) { const sa = t / 9 + k * Math.PI / 2; Pix.rect(c, hx + Math.cos(sa) * 9, hy - 14 + Math.sin(sa) * 3, 1, 1, '#F8D800'); if (k & 1) Pix.rect(c, hx + Math.cos(sa) * 9 - 1, hy - 14 + Math.sin(sa) * 3, 3, 1, '#F8D800'); }
  Art.smoke(c, hx + 4, hy - 6, t, 3, 2, true);
  if (t < 140) BOOK_X_FX.booms(c, cx - 30, cy - 16, 60, 36, t, 2, 6, 0.7);
  // the crystals out of its rocks, and you looping round them; fireworks
  for (let k = 0; k < 8; k++) { const s = moved[1 + k * 1.5 | 0] || moved[1], a = k * 1.3; BOOK_X_FX.gem(c, s[0] + Math.cos(a) * (4 + e * 8), s[1] + Math.sin(a) * (3 + e * 5) + 4, t, k % 3 !== 1, k * 9); }
  const a = t / 30, tx = 22 + Math.cos(a) * 11, ty = 15 + Math.sin(a) * 6;
  BOOK_X_FX.tank(c, tx, ty, a + Math.PI, t, true);
  BOOK_X_FX.firework(c, 20, 12, t, 7); BOOK_X_FX.firework(c, 94, 52, t, 8, 10); BOOK_X_FX.firework(c, 60, 8, t + 32, 9, 16);
}

BOOK_EXTRA_ART.astro_wyrm = {
  name: 'COMET WYRM', mode: 'ASTRO TANKS', pts: 5000, desc: 'A SERPENT OF ROCK AND IRON',
  draw(ctx, t, outro) {
    bookXScreen(ctx, t, outro, { name: this.name, intro: ['A SERPENT OF ROCK AND IRON', 'HIT ITS HEAD AND ITS TAIL'], outro: 'THE COMET HAS BURNED OUT', pts: this.pts },
      outro ? bookXWyrmOutro : bookXWyrmIntro);
  },
};
