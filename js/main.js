'use strict';
// =====================================================================
//  Game flow: title → stage curtain → play → score tally → next / over
// =====================================================================

const SW = 256, SH = 224;
const STORE = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } },
};

// construction palette: the 14 patterns of the original editor (as 2x2 blocks)
const CONSTRUCT_PATS = [
  ['.#', '.#'], ['..', '##'], ['#.', '#.'], ['##', '..'], ['##', '##'],
  ['.@', '.@'], ['..', '@@'], ['@.', '@.'], ['@@', '..'], ['@@', '@@'],
  ['~~', '~~'], ['%%', '%%'], ['__', '__'], ['..', '..'],
];

function newPlayer(i) {
  return { i, score: 0, lives: 2, level: 0, ship: false, cutter: false, kills: [0, 0, 0, 0], out: false, extraGiven: false, tank: null };
}

function defaultCustomMap() {
  const rows = [];
  for (let y = 0; y < 26; y++) rows.push('.'.repeat(26).split(''));
  for (const [bx, by] of BASE_WALL) rows[by][bx] = '#';
  return rows.map(r => r.join(''));
}

const Game = {
  state: 'title',
  t: 0,
  hi: 20000,
  players: [],
  twoP: false,
  stageNum: 1,
  stage: null,
  paused: false,
  lastScores: [0, 0],
  menuIdx: 0,
  titleY: SH,
  custom: null,
  customPending: false,

  init() {
    this.hi = STORE.get('tank1990_hi', 20000);
    const c = STORE.get('tank1990_custom', null);
    this.custom = Array.isArray(c) && c.length === 26 ? c : defaultCustomMap();
    this.toTitle();
  },

  setState(s) { this.state = s; this.t = 0; },

  saveHi() {
    for (const p of this.players) if (p.score > this.hi) this.hi = p.score;
    STORE.set('tank1990_hi', this.hi);
  },

  // ---------------------------------------------------------------- title
  toTitle() {
    Sound.setEngine(0);
    this.titleY = SH;
    this.setState('title');
  },

  updateTitle() {
    const m = Input.menu();
    if (this.titleY > 0) {
      this.titleY = Math.max(0, this.titleY - 2);
      if (m.any) this.titleY = 0;
      return;
    }
    if (m.up) { this.menuIdx = (this.menuIdx + 2) % 3; Sound.play('select'); }
    if (m.down || m.select) { this.menuIdx = (this.menuIdx + 1) % 3; Sound.play('select'); }
    if (m.ok) {
      if (this.menuIdx === 2) this.toConstruct();
      else this.newGame(this.menuIdx === 1, false);
    }
  },

  renderTitle(ctx) {
    ctx.fillStyle = COL.black;
    ctx.fillRect(0, 0, SW, SH);
    ctx.save();
    ctx.translate(0, this.titleY);
    Font.draw(ctx, 'I-', 16, 16, COL.white);
    Font.drawRight(ctx, this.lastScores[0] ? this.lastScores[0] : '00', 88, 16, COL.white);
    Font.draw(ctx, 'HI-', 112, 16, COL.white);
    Font.drawRight(ctx, this.hi, 176, 16, COL.white);
    if (this.lastScores[1]) {
      Font.draw(ctx, 'II-', 184, 16, COL.white);
      Font.drawRight(ctx, this.lastScores[1], 248, 16, COL.white);
    }
    const pat = Sprites.bricks(ctx);
    Font.big(ctx, 'TANK', (SW - Font.bigWidth('TANK', 4)) >> 1, 40, 4, pat);
    Font.big(ctx, '1990', (SW - Font.bigWidth('1990', 4)) >> 1, 80, 4, pat);
    const items = ['1 PLAYER', '2 PLAYERS', 'CONSTRUCTION'];
    items.forEach((s, i) => Font.draw(ctx, s, 88, 132 + i * 16, COL.white));
    if (this.titleY === 0) {
      const anim = (this.t >> 2) & 1;
      ctx.drawImage(Sprites.tank('p0', anim, 1, 'p1'), 64, 128 + this.menuIdx * 16);
    }
    Font.drawCenter(ctx, 'NES TANK 1990 TRIBUTE', SW / 2, 192, COL.lgrey);
    Font.drawCenter(ctx, 'ENTER START  M MUTE', SW / 2, 206, COL.lgrey);
    ctx.restore();
  },

  // ---------------------------------------------------------------- new game / curtain
  newGame(twoP, custom) {
    this.twoP = twoP;
    Input.twoP = twoP;
    this.players = [newPlayer(0)];
    if (twoP) this.players.push(newPlayer(1));
    this.stageNum = 1;
    this.customPending = custom;
    this.toCurtain(!custom);
  },

  toCurtain(selectable) {
    Sound.setEngine(0);
    this.curtain = { selectable, h: 0, phase: 'close' };
    this.setState('curtain');
  },

  updateCurtain() {
    const c = this.curtain;
    if (c.phase === 'close') {
      c.h = Math.min(SH / 2, c.h + 8);
      if (c.h >= SH / 2) { c.phase = 'show'; this.t = 0; }
      return;
    }
    const m = Input.menu();
    if (c.selectable) {
      const n = LEVELS.length;
      if (m.up || m.right) { this.stageNum = this.stageNum % n + 1; Sound.play('select'); }
      if (m.down || m.left) { this.stageNum = (this.stageNum + n - 2) % n + 1; Sound.play('select'); }
      if (m.ok) this.beginStage();
      if (m.back) this.toTitle();
    } else if (this.t >= 100 || (this.t > 20 && m.ok)) {
      this.beginStage();
    }
  },

  renderCurtain(ctx) {
    const c = this.curtain;
    if (c.phase === 'close' && this.stage) this.stage.render(ctx);
    else if (c.phase === 'close') { ctx.fillStyle = COL.black; ctx.fillRect(0, 0, SW, SH); }
    ctx.fillStyle = COL.bg;
    ctx.fillRect(0, 0, SW, c.h);
    ctx.fillRect(0, SH - c.h, SW, c.h);
    if (c.phase === 'show') {
      Font.draw(ctx, 'STAGE', 96, 104, COL.black);
      Font.drawRight(ctx, this.stageNum, 160, 104, COL.black);
      if (c.selectable && (this.t >> 4) & 1) Font.drawCenter(ctx, '< SELECT >', SW / 2, 124, '#3C3C3C');
    }
  },

  beginStage() {
    let map, custom = false;
    if (this.customPending) { map = this.custom; custom = true; this.customPending = false; }
    else map = LEVELS[(this.stageNum - 1) % LEVELS.length];
    this.stage = new Stage(this.stageNum, map, this.players, { custom });
    this.paused = false;
    this.openH = SH / 2;
    this.setState('play');
    Sound.play('start');
  },

  // ---------------------------------------------------------------- play
  updatePlay() {
    const m = Input.menu();
    if ((m.start || (m.back && !this.paused)) && !this.stage.over) {
      this.paused = !this.paused;
      if (this.paused) { Sound.play('pause'); Sound.setEngine(0); }
    } else if (m.back && this.paused) {
      // Esc while paused quits to the title screen
      this.saveHi();
      this.lastScores = this.players.map(p => p.score);
      this.stage = null;
      this.toTitle();
      return;
    }
    if (this.openH > 0) this.openH = Math.max(0, this.openH - 8);
    if (this.paused) return;
    this.stage.update();
    if (this.stage.result) {
      this.saveHi();
      this.toScore(this.stage.result === 'gameover');
    }
  },

  renderPlay(ctx) {
    this.stage.render(ctx);
    if (this.paused && ((this.t >> 4) & 1) === 0) Font.drawCenter(ctx, 'PAUSE', FX + FS / 2, FY + 100, COL.orange);
    if (this.openH > 0) {
      ctx.fillStyle = COL.bg;
      ctx.fillRect(0, 0, SW, this.openH);
      ctx.fillRect(0, SH - this.openH, SW, this.openH);
    }
  },

  // ---------------------------------------------------------------- score tally
  toScore(gameOver) {
    Sound.setEngine(0);
    this.sc = { gameOver, row: 0, n: 0, wait: 30, phase: 'rows', bonus: -1 };
    this.setState('score');
  },

  updateScore() {
    const sc = this.sc;
    if (sc.wait > 0) { sc.wait--; return; }
    if (sc.phase === 'rows') {
      const maxK = Math.max(...this.players.map(p => p.kills[sc.row]));
      if (sc.n < maxK) {
        sc.n++;
        Sound.play('tick');
        sc.wait = 9;
      } else {
        sc.row++;
        sc.n = 0;
        sc.wait = 20;
        if (sc.row >= 4) { sc.phase = 'total'; sc.wait = 30; }
      }
    } else if (sc.phase === 'total') {
      if (this.twoP && !sc.gameOver) {
        const k = this.players.map(p => p.kills.reduce((a, b) => a + b, 0));
        if (k[0] !== k[1]) {
          sc.bonus = k[0] > k[1] ? 0 : 1;
          const p = this.players[sc.bonus];
          p.score += 1000;
          if (!p.extraGiven && p.score >= 20000) { p.extraGiven = true; p.lives++; }
          Sound.play('bonus');
          this.saveHi();
        }
      }
      sc.phase = 'done';
      sc.wait = 150;
    } else {
      this.lastScores = this.players.map(p => p.score);
      if (sc.gameOver) this.toBigOver();
      else {
        this.stageNum++;
        this.toCurtain(false);
      }
    }
  },

  renderScore(ctx) {
    const sc = this.sc;
    ctx.fillStyle = COL.black;
    ctx.fillRect(0, 0, SW, SH);
    Font.draw(ctx, 'HI-SCORE', 64, 16, COL.red);
    Font.drawRight(ctx, this.hi, 200, 16, COL.gold);
    Font.draw(ctx, 'STAGE', 96, 36, COL.white);
    Font.drawRight(ctx, this.stageNum, 160, 36, COL.white);
    const P = this.players;
    Font.draw(ctx, 'I-PLAYER', 16, 56, COL.red);
    Font.drawRight(ctx, P[0].score, 96, 72, COL.gold);
    if (this.twoP) {
      Font.draw(ctx, 'II-PLAYER', 168, 56, COL.red);
      Font.drawRight(ctx, P[1].score, 240, 72, COL.gold);
    }
    const shown = (p, row) => row < sc.row || sc.phase !== 'rows' ? p.kills[row] : (row === sc.row ? Math.min(sc.n, p.kills[row]) : -1);
    for (let row = 0; row < 4; row++) {
      const y = 96 + row * 22;
      ctx.drawImage(Sprites.tank('e' + row, 0, 0, 'silver'), 120, y - 4);
      const k1 = shown(P[0], row);
      if (k1 >= 0) {
        Font.drawRight(ctx, k1 * ENEMY[row].pts, 56, y, COL.white);
        Font.draw(ctx, 'PTS', 64, y, COL.white);
        Font.drawRight(ctx, k1, 102, y, COL.white);
      }
      Font.draw(ctx, '<', 107, y, COL.white);
      if (this.twoP) {
        Font.draw(ctx, '>', 138, y, COL.white);
        const k2 = shown(P[1], row);
        if (k2 >= 0) {
          Font.drawRight(ctx, k2, 162, y, COL.white);
          Font.drawRight(ctx, k2 * ENEMY[row].pts, 208, y, COL.white);
          Font.draw(ctx, 'PTS', 216, y, COL.white);
        }
      }
    }
    ctx.fillStyle = COL.white;
    ctx.fillRect(96, 182, 64, 2);
    if (sc.phase !== 'rows') {
      Font.draw(ctx, 'TOTAL', 40, 190, COL.white);
      Font.drawRight(ctx, P[0].kills.reduce((a, b) => a + b, 0), 102, 190, COL.white);
      if (this.twoP) Font.drawRight(ctx, P[1].kills.reduce((a, b) => a + b, 0), 162, 190, COL.white);
      if (sc.bonus >= 0) {
        const x = sc.bonus === 0 ? 24 : 160;
        Font.draw(ctx, 'BONUS!', x, 203, COL.red);
        Font.draw(ctx, '1000 PTS', x, 213, COL.white);
      }
    }
  },

  // ---------------------------------------------------------------- big game over
  toBigOver() {
    this.saveHi();
    Sound.play('gameover');
    this.setState('bigover');
  },

  updateBigOver() {
    if (this.t > 260 || (this.t > 60 && Input.menu().ok)) {
      this.stage = null;
      this.toTitle();
    }
  },

  renderBigOver(ctx) {
    ctx.fillStyle = COL.black;
    ctx.fillRect(0, 0, SW, SH);
    const pat = Sprites.bricks(ctx);
    const rise = Math.max(0, 60 - this.t * 2);
    ctx.save();
    ctx.translate(0, rise);
    Font.big(ctx, 'GAME', (SW - Font.bigWidth('GAME', 4)) >> 1, 56, 4, pat);
    Font.big(ctx, 'OVER', (SW - Font.bigWidth('OVER', 4)) >> 1, 104, 4, pat);
    ctx.restore();
  },

  // ---------------------------------------------------------------- construction
  toConstruct() {
    this.ed = {
      tx: 0, ty: 0, pat: -1, last: null, rep: 0,
      stage: new Stage(1, this.custom, [], { custom: true }),
    };
    this.setState('construct');
  },

  editTile(tx, ty, patIdx) {
    if (tx === 6 && ty === 12) return; // the eagle itself
    const p = CONSTRUCT_PATS[patIdx];
    const rows = this.custom.map(r => r.split(''));
    for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) {
      const bx = tx * 2 + x, by = ty * 2 + y;
      rows[by][bx] = p[y][x];
      this.ed.stage.setBlock(bx, by, BLOCK_TYPE[p[y][x]]);
    }
    this.custom = rows.map(r => r.join(''));
    STORE.set('tank1990_custom', this.custom);
    Sound.play('build');
  },

  updateConstruct() {
    const ed = this.ed, m = Input.menu();
    const moveCursor = d => {
      ed.tx = Math.max(0, Math.min(12, ed.tx + DXY[d][0]));
      ed.ty = Math.max(0, Math.min(12, ed.ty + DXY[d][1]));
    };
    const tapped = m.up ? 0 : m.right ? 1 : m.down ? 2 : m.left ? 3 : -1;
    if (tapped >= 0) {
      moveCursor(tapped);
      ed.rep = 14; // auto-repeat after a short delay
    } else {
      const held = Input.heldDir();
      if (held >= 0 && --ed.rep <= 0) { moveCursor(held); ed.rep = 5; }
    }

    const here = ed.tx + ',' + ed.ty;
    if (m.fire && !m.start) {
      if (ed.pat < 0) ed.pat = 0;
      else if (ed.last === here) ed.pat = (ed.pat + 1) % CONSTRUCT_PATS.length;
      ed.last = here;
      this.editTile(ed.tx, ed.ty, ed.pat);
    } else if (m.alt) {
      ed.pat = ed.pat < 0 ? CONSTRUCT_PATS.length - 1 : (ed.pat + CONSTRUCT_PATS.length - 1) % CONSTRUCT_PATS.length;
      ed.last = here;
      this.editTile(ed.tx, ed.ty, ed.pat);
    }
    if (m.start) this.newGame(false, true);
    else if (m.back) this.toTitle();
    else if (Input.just.has('Delete')) { this.custom = defaultCustomMap(); STORE.set('tank1990_custom', this.custom); this.toConstruct(); }
  },

  renderConstruct(ctx) {
    const st = this.ed.stage;
    ctx.fillStyle = COL.bg;
    ctx.fillRect(0, 0, SW, SH);
    ctx.fillStyle = COL.black;
    ctx.fillRect(FX, FY, FS, FS);
    if (st.dirty) st.buildLayers();
    ctx.save();
    ctx.translate(FX, FY);
    ctx.drawImage(st.bgLayer, 0, 0);
    for (const i of st.waterCells) {
      const cx = i % GN, cy = (i / GN) | 0;
      ctx.drawImage(Sprites.tex.water0, (cx & 1) * 4, (cy & 1) * 4, 4, 4, cx * 4, cy * 4, 4, 4);
    }
    ctx.drawImage(Sprites.eagle, BASE_X, BASE_Y);
    ctx.drawImage(st.forestLayer, 0, 0);
    if (((this.t >> 3) & 1) === 0) ctx.drawImage(Sprites.tank('p0', 0, 0, 'p1'), this.ed.tx * 16, this.ed.ty * 16);
    ctx.restore();
    // current pattern preview
    Font.draw(ctx, 'PAT', 228, 16, COL.black);
    ctx.fillStyle = COL.black;
    ctx.fillRect(231, 26, 18, 18);
    if (this.ed.pat >= 0) {
      const p = CONSTRUCT_PATS[this.ed.pat];
      const tex = { '#': 'brick', '@': 'steel', '~': 'water0', '%': 'forest', '_': 'ice' };
      for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) {
        const k = tex[p[y][x]];
        if (k) ctx.drawImage(Sprites.tex[k], 232 + x * 8, 27 + y * 8);
      }
    }
    Font.draw(ctx, 'A', 228, 60, COL.black); Font.draw(ctx, '+', 236, 60, COL.black);
    Font.draw(ctx, 'B', 228, 72, COL.black); Font.draw(ctx, '-', 236, 72, COL.black);
    Font.draw(ctx, 'GO', 228, 180, COL.black);
    Font.draw(ctx, 'ENT', 228, 190, COL.black);
  },

  // ---------------------------------------------------------------- dispatch
  update() {
    this.t++;
    switch (this.state) {
      case 'title': this.updateTitle(); break;
      case 'curtain': this.updateCurtain(); break;
      case 'play': this.updatePlay(); break;
      case 'score': this.updateScore(); break;
      case 'bigover': this.updateBigOver(); break;
      case 'construct': this.updateConstruct(); break;
    }
  },

  render(ctx) {
    switch (this.state) {
      case 'title': this.renderTitle(ctx); break;
      case 'curtain': this.renderCurtain(ctx); break;
      case 'play': this.renderPlay(ctx); break;
      case 'score': this.renderScore(ctx); break;
      case 'bigover': this.renderBigOver(ctx); break;
      case 'construct': this.renderConstruct(ctx); break;
    }
  },
};

// =====================================================================
//  Boot & main loop (fixed 60 Hz simulation)
// =====================================================================
(function boot() {
  const canvas = document.getElementById('screen');
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  Sprites.init();
  Input.init();
  Game.init();

  function resize() {
    const wrap = document.getElementById('wrap');
    const w = wrap.clientWidth, h = wrap.clientHeight;
    let s = Math.min(w / SW, h / SH);
    if (s >= 1) s = Math.floor(s);
    s = Math.max(0.5, s);
    canvas.style.width = Math.round(SW * s) + 'px';
    canvas.style.height = Math.round(SH * s) + 'px';
  }
  window.addEventListener('resize', resize);
  resize();

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && Game.state === 'play' && !Game.paused && !Game.stage.over) {
      Game.paused = true;
      Sound.setEngine(0);
    }
  });

  const STEP = 1000 / 60;
  let last = performance.now(), acc = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    acc += now - last;
    last = now;
    if (acc > 200) acc = 200;
    while (acc >= STEP) {
      Input.poll();
      Game.update();
      Input.endFrame();
      acc -= STEP;
    }
    Game.render(ctx);
  }
  requestAnimationFrame(frame);
})();
