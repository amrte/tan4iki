'use strict';
// =====================================================================
//  BOSS GALLERY (Settings -> ART): the pictures of every boss you've met, tanks and galaxy alike — the warning picture
//  from before the fight and, once it's beaten, the one from after it. A boss you haven't met isn't in the book at all,
//  not even its name: the gallery only counts what you've found.
//  The book is kept in the browser; a boss goes in when its fight starts (or its picture is shown), and is marked
//  beaten when it falls. Bosses met before the book existed are filled in from the first-meet cards and the records.
// =====================================================================

const BOOK_KEY = 'tank1990_bossbook';

const BossBook = {
  load() {
    if (this.d) return this.d;
    const d = this.d = STORE.get(BOOK_KEY, null) || { t: {}, g: {}, seeded: false };
    d.t = d.t || {}; d.g = d.g || {};
    if (!d.seeded) {
      // what we already know: tank bosses whose card was shown, classic stages already passed, galaxy sectors reached
      for (const k of STORE.get(SEEN_KEY, [])) if (/^b\d+$/.test(k) && BOSSES[+k.slice(1)]) (d.t[+k.slice(1)] = d.t[+k.slice(1)] || {}).seen = 1;
      const best = Math.min(300, STORE.get('tank1990_bestStage', 1) | 0);
      for (let n = 1; n < best; n++) { const b = bossForStage(n); if (b) Object.assign(d.t[b.idx] = d.t[b.idx] || {}, { seen: 1, beaten: 1 }); }
      const gx = (STORE.get(MODE_KEY, {}) || {}).galaxy;
      if (gx && gx.level > 1) for (let s = 0; s < Math.min(gx.level - 1, GX_BOSSES.length); s++) Object.assign(d.g[GX_BOSSES[s].key] = d.g[GX_BOSSES[s].key] || {}, { seen: 1, beaten: 1 });
      d.seeded = true;
      STORE.set(BOOK_KEY, d);
    }
    return d;
  },
  // kind 't' (a BOSSES index) or 'g' (a galaxy boss key); what: 'seen' or 'beaten' (beaten means seen too)
  mark(kind, id, what) {
    if (id === undefined || id === null) return;
    const d = this.load(), e = d[kind][id] || (d[kind][id] = {});
    if (e[what] && e.seen) return;
    e.seen = 1; e[what] = 1;
    STORE.set(BOOK_KEY, d);
  },
  // the pages, in the game's order: the tank bosses, then the galaxy's
  pages() {
    const d = this.load(), out = [];
    BOSSES.forEach((b, i) => { const e = d.t[i]; if (e && e.seen && BOSS_ART[b.kind]) out.push({ kind: 't', idx: i, beaten: !!e.beaten }); });
    GX_BOSSES.forEach(b => { const e = d.g[b.key]; if (e && e.seen && GX_BOSS_ART[b.key]) out.push({ kind: 'g', key: b.key, beaten: !!e.beaten }); });
    return out;
  },
};

// ------------------------------------------------------------------ filling the book
(() => {
  const P = Stage.prototype;
  const initBoss = P.initBoss;
  P.initBoss = function (info) {
    const r = initBoss.apply(this, arguments);
    if (info) BossBook.mark('t', info.idx, 'seen');
    return r;
  };
  const killBoss = P.killBoss;
  P.killBoss = function (bo) {
    const r = killBoss.apply(this, arguments);
    if (this.bossDefeated && this.bossIdx !== undefined) BossBook.mark('t', this.bossIdx, 'beaten');
    return r;
  };
  const gxStart = P.gxBossStart;
  P.gxBossStart = function () {
    const r = gxStart.apply(this, arguments), g = this.galaxy;
    if (g && g.boss) BossBook.mark('g', g.boss.key, 'seen');
    return r;
  };
  const gxKill = P.gxBossKill;
  P.gxBossKill = function () {
    const g = this.galaxy, key = g && g.boss && g.boss.key;
    const r = gxKill.apply(this, arguments);
    if (key) BossBook.mark('g', key, 'beaten');
    return r;
  };
  // a boss screen on an online guest's side counts too (its own game doesn't run the fight)
  const screen = Game.renderBossScreen;
  Game.renderBossScreen = function (ctx) {
    const b = this.bossScreen;
    if (b && !b.booked) { b.booked = true; if (b.gx) BossBook.mark('g', b.gx, b.outro ? 'beaten' : 'seen'); else if (b.idx !== undefined) BossBook.mark('t', b.idx, b.outro ? 'beaten' : 'seen'); }
    return screen.apply(this, arguments);
  };
})();

// ------------------------------------------------------------------ the gallery screen
Object.assign(Game, {
  toBossBook() {
    this.book = { page: 0, outro: false };
    this.setState('bossbook');
  },

  bookFlip(d) {
    const n = BossBook.pages().length;
    if (!n) return;
    this.book.page = (this.book.page + d + n) % n;
    this.book.outro = false;
    this.t = 0;
    Sound.play('select');
  },

  bookToggle() {
    const pg = BossBook.pages()[this.book.page];
    if (!pg || !pg.beaten) return;
    this.book.outro = !this.book.outro;
    this.t = 0;
    Sound.play('select');
  },

  updateBossBook() {
    const m = Input.menu();
    if (m.back || m.start) { this.setState('settings'); Sound.play('select'); return; }
    if (m.left || m.up) this.bookFlip(-1);
    else if (m.right || m.down) this.bookFlip(1);
    else if (m.fire) this.bookToggle();
  },

  // a click: the left third goes back a page, the right third on, the middle turns the picture over
  bookPointer(x) {
    if (!BossBook.pages().length) { this.setState('settings'); return; }
    if (x < SW / 3) this.bookFlip(-1); else if (x > SW * 2 / 3) this.bookFlip(1); else this.bookToggle();
  },

  renderBossBook(ctx) {
    const pages = BossBook.pages(), bk = this.book;
    if (!pages.length) {
      ctx.fillStyle = COL.black; ctx.fillRect(0, 0, SW, SH);
      Font.drawCenter(ctx, 'BOSS GALLERY', SW / 2, 40, COL.red);
      Font.drawCenter(ctx, 'NO BOSSES FOUND YET', SW / 2, SH / 2 - 10, COL.white);
      Font.drawCenter(ctx, 'MEET THEM IN THE GAME', SW / 2, SH / 2 + 4, COL.lgrey);
      Font.drawCenter(ctx, 'ESC: BACK', SW / 2, SH - 24, COL.lgrey);
      return;
    }
    if (bk.page >= pages.length) bk.page = 0;
    const pg = pages[bk.page], outro = bk.outro && pg.beaten;
    // the boss's own screen, as in the game, with the gallery's words over its first and last lines
    if (pg.kind === 't') drawBossScreen(ctx, pg.idx, this.t, outro, BOSSES[pg.idx].pts);
    else drawGxBossScreen(ctx, { gx: pg.key, outro, pts: (GX_BOSSES.find(d => d.key === pg.key) || {}).pts }, this.t);
    ctx.fillStyle = COL.black;
    ctx.fillRect(0, 0, SW, 11);
    Font.drawCenter(ctx, 'BOSS GALLERY ' + (bk.page + 1) + '/' + pages.length + (pg.kind === 'g' ? '  GALAXY' : ''), SW / 2, 2, COL.gold);
    const y = INTRO_Y + INTRO_H * 2 + 8 + 22;
    ctx.fillRect(0, y, SW, SH - y);
    Font.drawCenter(ctx, pg.beaten ? '< > MORE  FIRE: ' + (outro ? 'BEFORE' : 'AFTER') : '< > MORE  ESC: BACK', SW / 2, y + 1, COL.lgrey);
    if (!pg.beaten && (this.t >> 5) & 1) Font.drawCenter(ctx, 'BEAT IT FOR ITS LAST PICTURE', SW / 2, y + 12, '#7C7C7C');
  },
});
