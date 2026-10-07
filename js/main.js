'use strict';
// =====================================================================
//  Game flow: title → stage curtain → play → score tally → next / over
// =====================================================================

// Menus (title, settings, shop, score) are drawn in a classic 256x224 frame, centred on the
// play screen, whose size follows the field size (SCREEN_W x SCREEN_H, see setFieldSize).
const SW = 256, SH = 224;
const SAVE_KEY = 'tank1990_save';
const menuOX = () => (SCREEN_W - SW) >> 1;
const menuOY = () => (SCREEN_H - SH) >> 1;
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
  return {
    i, score: 0, lives: Config.startLives(), level: Config.get('startStars'), ship: false, cutter: false,
    kills: [0, 0, 0, 0], out: false, extraGiven: false, extraCount: 0, mines: 0, tank: null,
    kit: null, shopShovel: false,
  };
}

function defaultCustomMap() {
  const rows = [];
  for (let y = 0; y < 26; y++) rows.push('.'.repeat(26).split(''));
  for (const [bx, by] of BASE_WALL) rows[by][bx] = '#';
  return rows.map(r => r.join(''));
}

const TITLE_MENU_Y = 126;
const PAUSE_MENU = ['CONTINUE', 'SAVE GAME', 'QUIT'];
const SETTINGS_ROWS = 15, SETTINGS_TOP = 24, SETTINGS_ROW_H = 12;

// Between-stage shop: score buys upgrades. price is in points at 100% "SHOP PRICES".
// Kit items (helmet, turbo, ...) take effect when your tank first appears in the next stage.
const SHOP_ITEMS = [
  { id: 'life', name: 'EXTRA LIFE', price: 5000, icon: PU.TANK, desc: 'ONE MORE TANK' },
  { id: 'star', name: 'STAR', price: 3000, icon: PU.STAR, desc: 'UPGRADE YOUR TANK 1 LEVEL' },
  { id: 'gun', name: 'GUN', price: 8000, icon: PU.GUN, desc: 'MAX LEVEL + CUTS TREES' },
  { id: 'ship', name: 'SHIP', price: 3000, icon: PU.SHIP, desc: 'CROSS WATER, SOAKS A HIT' },
  { id: 'mines', name: 'MINES', price: 1500, icon: PU.MINES, desc: 'MINES FOR THE B BUTTON' },
  { id: 'shovel', name: 'SHOVEL', price: 2000, icon: PU.SHOVEL, desc: 'STEEL EAGLE WALLS AT START' },
  { id: 'helmet', name: 'HELMET', price: 1000, icon: PU.HELMET, desc: 'SHIELD AT STAGE START' },
  { id: 'turbo', name: 'TURBO', price: 1500, icon: PU.TURBO, desc: 'FAST TANK AT STAGE START' },
  { id: 'rapid', name: 'RAPID', price: 2000, icon: PU.RAPID, desc: 'RAPID FIRE AT STAGE START' },
  { id: 'spread', name: 'SPREAD', price: 2000, icon: PU.SPREAD, desc: '3-WAY FIRE AT STAGE START' },
  { id: 'rocket', name: 'ROCKET', price: 3000, icon: PU.ROCKET, desc: 'ROCKETS AT STAGE START' },
  { id: 'pierce', name: 'PIERCE', price: 3000, icon: PU.PIERCE, desc: 'PIERCING SHELLS AT START' },
  { id: 'done', name: 'START STAGE' },
];
const SHOP_ROWS = 9, SHOP_TOP = 40, SHOP_ROW_H = 16;

function shopPrice(item) {
  return Math.round((item.price * Config.scale('shopPrices')) / 100) * 100;
}

// what the player already has; `max` means it can't be bought again
function shopStatus(item, p) {
  switch (item.id) {
    case 'life': return Config.infiniteLives() ? { text: 'INF', max: true } : { text: 'X' + p.lives, max: p.lives >= 99 };
    case 'star': return { text: 'LV' + p.level, max: p.level >= 3 };
    case 'gun': return p.level >= 3 && p.cutter ? { text: 'OWNED', max: true } : { text: '' };
    case 'ship': return p.ship ? { text: 'OWNED', max: true } : { text: '' };
    case 'mines': return { text: 'X' + (p.mines || 0), max: (p.mines || 0) >= 99 };
    case 'shovel': return p.shopShovel ? { text: 'READY', max: true } : { text: '' };
    case 'done': return { text: '' };
    default: return p.kit && p.kit[item.id] ? { text: 'READY', max: true } : { text: '' };
  }
}

function shopApply(item, p) {
  switch (item.id) {
    case 'life': p.lives++; break;
    case 'star': p.level++; break;
    case 'gun': p.level = 3; p.cutter = true; break;
    case 'ship': p.ship = true; break;
    case 'mines': p.mines = (p.mines || 0) + Config.get('mineCount'); break;
    case 'shovel': p.shopShovel = true; break;
    default: p.kit = p.kit || {}; p.kit[item.id] = true;
  }
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
  pauseIdx: 0,
  pauseMsg: '',
  pauseMsgT: 0,
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

  // ---------------------------------------------------------------- screen layout
  // field size from the settings; FIT matches the window's shape
  desiredField() {
    let w = Config.get('fieldW'), h = Config.get('fieldH');
    const wrap = document.getElementById('wrap');
    const aspect = wrap && wrap.clientHeight ? wrap.clientWidth / wrap.clientHeight : 16 / 10;
    if (w === 'FIT' && h === 'FIT') h = 13;
    if (w === 'FIT') w = Math.max(13, Math.min(60, Math.round((aspect * (h * 16 + 16) - 48) / 16)));
    if (h === 'FIT') h = Math.max(13, Math.min(40, Math.round(((w * 16 + 48) / aspect - 16) / 16)));
    return [w, h];
  },

  applyLayout(cols, rows) {
    if (cols === undefined) [cols, rows] = this.desiredField();
    setFieldSize(cols, rows);
  },

  // ---------------------------------------------------------------- title
  toTitle() {
    Sound.setEngine(0);
    this.applyLayout();
    this.titleY = SH;
    this.setState('title');
    if (this.menuIdx >= this.titleMenu().length) this.menuIdx = 0;
  },

  hasSave() { return !!STORE.get(SAVE_KEY, null); },

  titleMenu() {
    const m = [];
    if (this.hasSave()) m.push({ label: 'CONTINUE', act: () => this.loadGame() });
    m.push({ label: '1 PLAYER', act: () => this.newGame(false, false) });
    m.push({ label: '2 PLAYERS', act: () => this.newGame(true, false) });
    m.push({ label: 'CONSTRUCTION', act: () => this.toConstruct() });
    m.push({ label: 'SETTINGS', act: () => this.toSettings() });
    return m;
  },

  updateTitle() {
    const m = Input.menu();
    if (this.titleY > 0) {
      this.titleY = Math.max(0, this.titleY - 2);
      if (m.any) this.titleY = 0;
      return;
    }
    const n = this.titleMenu().length;
    if (m.up) { this.menuIdx = (this.menuIdx + n - 1) % n; Sound.play('select'); }
    if (m.down || m.select) { this.menuIdx = (this.menuIdx + 1) % n; Sound.play('select'); }
    if (m.ok) this.chooseMenu(this.menuIdx);
  },

  chooseMenu(i) {
    const item = this.titleMenu()[i];
    if (item) item.act();
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
    const menu = this.titleMenu(), top = this.titleMenuY();
    menu.forEach((it, i) => Font.draw(ctx, it.label, 88, top + i * 14, COL.white));
    if (this.titleY === 0) {
      const anim = (this.t >> 2) & 1;
      ctx.drawImage(Sprites.tank('p0', anim, 1, Config.playerPal(0)), 64, top - 4 + this.menuIdx * 14);
    }
    Font.drawCenter(ctx, APP_TITLE, SW / 2, 192, COL.lgrey);
    Font.drawCenter(ctx, 'ENTER START  M MUTE', SW / 2, 206, COL.lgrey);
    ctx.restore();
  },

  titleMenuY() { return TITLE_MENU_Y - (this.titleMenu().length - 4) * 7; },

  // ---------------------------------------------------------------- save / load
  // One save slot: written by SAVE GAME in the pause menu and automatically at every stage start.
  saveGame() {
    if (!this.stage || this.stage.over) return false;
    const data = {
      app: APP_VERSION, time: Date.now(), twoP: this.twoP, stageNum: this.stageNum, lastScores: this.lastScores,
      players: this.players.map(p => { const o = Object.assign({}, p); delete o.tank; return o; }),
      stage: this.stage.snapshot(),
    };
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); return true; } catch (e) { return false; }
  },

  loadGame() {
    const s = STORE.get(SAVE_KEY, null);
    if (!s || !s.stage) return;
    this.twoP = s.twoP;
    Input.twoP = s.twoP;
    this.players = s.players.map(p => Object.assign(newPlayer(p.i), p, { tank: null }));
    this.stageNum = s.stageNum;
    this.lastScores = s.lastScores || [0, 0];
    this.customPending = false;
    // the saved terrain only fits the field size it was saved with
    this.applyLayout(s.stage.cols, s.stage.rows);
    this.stage = new Stage(this.stageNum, LEVELS[(this.stageNum - 1) % LEVELS.length], this.players, { snapshot: s.stage });
    this.paused = true;
    this.pauseIdx = 0;
    this.pauseMsg = 'GAME LOADED';
    this.pauseMsgT = 120;
    this.openH = SCREEN_H / 2;
    this.setState('play');
  },

  // ---------------------------------------------------------------- new game / curtain
  newGame(twoP, custom) {
    this.applyLayout();
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
      c.h = Math.min(SCREEN_H / 2, c.h + 8);
      if (c.h >= SCREEN_H / 2) { c.phase = 'show'; this.t = 0; }
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
    else if (c.phase === 'close') { ctx.fillStyle = COL.black; ctx.fillRect(0, 0, SCREEN_W, SCREEN_H); }
    ctx.fillStyle = COL.bg;
    ctx.fillRect(0, 0, SCREEN_W, c.h);
    ctx.fillRect(0, SCREEN_H - c.h, SCREEN_W, c.h);
    if (c.phase === 'show') {
      const cx = SCREEN_W / 2, cy = SCREEN_H / 2;
      Font.draw(ctx, 'STAGE', cx - 32, cy - 8, COL.black);
      Font.drawRight(ctx, this.stageNum, cx + 32, cy - 8, COL.black);
      if (c.selectable && (this.t >> 4) & 1) Font.drawCenter(ctx, '< SELECT >', cx, cy + 12, '#3C3C3C');
    }
  },

  beginStage() {
    let map, custom = false;
    if (this.customPending) { map = this.custom; custom = true; this.customPending = false; }
    else map = LEVELS[(this.stageNum - 1) % LEVELS.length];
    this.stage = new Stage(this.stageNum, map, this.players, { custom });
    this.paused = false;
    this.openH = SCREEN_H / 2;
    this.setState('play');
    Sound.play('start');
    this.saveGame(); // autosave at every stage start
  },

  // ---------------------------------------------------------------- play
  updatePlay() {
    const m = Input.menu();
    if (this.pauseMsgT > 0) this.pauseMsgT--;
    if (this.openH > 0) this.openH = Math.max(0, this.openH - 8);
    if (!this.paused) {
      if ((m.start || m.back) && !this.stage.over) {
        this.paused = true;
        this.pauseIdx = 0;
        Sound.play('pause');
        Sound.setEngine(0);
      }
    } else {
      // pause menu: continue / save / quit (P or Esc resumes)
      if (m.up) { this.pauseIdx = (this.pauseIdx + PAUSE_MENU.length - 1) % PAUSE_MENU.length; Sound.play('select'); }
      if (m.down) { this.pauseIdx = (this.pauseIdx + 1) % PAUSE_MENU.length; Sound.play('select'); }
      if (Input.anyJust(['KeyP', 'Escape'])) this.paused = false;
      else if (m.ok) this.pauseAction(PAUSE_MENU[this.pauseIdx]);
      return;
    }
    this.stage.update();
    if (this.stage.result) {
      this.saveHi();
      this.toScore(this.stage.result === 'gameover');
    }
  },

  pauseAction(action) {
    if (action === 'CONTINUE') this.paused = false;
    else if (action === 'SAVE GAME') {
      const ok = this.saveGame();
      this.pauseMsg = ok ? 'GAME SAVED' : 'SAVE FAILED';
      this.pauseMsgT = 120;
      Sound.play(ok ? 'pickup' : 'steel');
    } else if (action === 'QUIT') {
      this.saveHi();
      this.lastScores = this.players.map(p => p.score);
      this.stage = null;
      this.toTitle();
    }
  },

  renderPlay(ctx) {
    this.stage.render(ctx);
    if (this.paused) {
      const w = 112, h = 70, x = FX + ((FW - w) >> 1), y = FY + ((FH - h) >> 1);
      ctx.fillStyle = COL.black;
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = COL.lgrey;
      ctx.fillRect(x, y, w, 1); ctx.fillRect(x, y + h - 1, w, 1); ctx.fillRect(x, y, 1, h); ctx.fillRect(x + w - 1, y, 1, h);
      Font.drawCenter(ctx, 'PAUSE', x + w / 2, y + 6, COL.orange);
      PAUSE_MENU.forEach((label, i) => {
        Font.draw(ctx, label, x + 24, y + 22 + i * 12, COL.white);
        if (i === this.pauseIdx) Font.draw(ctx, '>', x + 12, y + 22 + i * 12, COL.gold);
      });
      if (this.pauseMsgT > 0) Font.drawCenter(ctx, this.pauseMsg, x + w / 2, y + h + 4, COL.gold);
    }
    if (this.openH > 0) {
      ctx.fillStyle = COL.bg;
      ctx.fillRect(0, 0, SCREEN_W, this.openH);
      ctx.fillRect(0, SCREEN_H - this.openH, SCREEN_W, this.openH);
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
          checkExtraLife(p);
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
        if (Config.on('shop') && this.players.some(p => !p.out)) this.toShop();
        else this.toCurtain(false);
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
    this.applyLayout(13, 13); // the editor works on the classic 13x13 field
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
    ctx.fillRect(FX, FY, FW, FH);
    if (st.dirty) st.buildLayers();
    ctx.save();
    ctx.translate(FX, FY);
    ctx.drawImage(st.bgLayer, 0, 0);
    for (const i of st.waterCells) {
      const cx = i % GW, cy = (i / GW) | 0;
      ctx.drawImage(Sprites.tex.water0, (cx & 1) * 4, (cy & 1) * 4, 4, 4, cx * 4, cy * 4, 4, 4);
    }
    ctx.drawImage(Sprites.eagle, BASE_X, BASE_Y);
    ctx.drawImage(st.forestLayer, 0, 0);
    if (((this.t >> 3) & 1) === 0) ctx.drawImage(Sprites.tank('p0', 0, 0, Config.playerPal(0)), this.ed.tx * 16, this.ed.ty * 16);
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

  // ---------------------------------------------------------------- shop
  toShop() {
    Sound.setEngine(0);
    this.shop = { order: this.players.filter(p => !p.out), turn: 0, idx: 0, scroll: 0, rep: 0, msg: '', msgT: 0 };
    this.setState('shop');
  },

  shopMove(dir) {
    const sh = this.shop, n = SHOP_ITEMS.length;
    sh.idx = (sh.idx + dir + n) % n;
    if (sh.idx < sh.scroll) sh.scroll = sh.idx;
    if (sh.idx >= sh.scroll + SHOP_ROWS) sh.scroll = sh.idx - SHOP_ROWS + 1;
  },

  shopBuy() {
    const sh = this.shop, p = sh.order[sh.turn], item = SHOP_ITEMS[sh.idx];
    if (item.id === 'done') { this.shopNext(); return; }
    const price = shopPrice(item), st = shopStatus(item, p);
    if (st.max) { sh.msg = 'YOU ALREADY HAVE IT'; sh.msgT = 90; Sound.play('steel'); return; }
    if (p.score < price) { sh.msg = 'NOT ENOUGH POINTS'; sh.msgT = 90; Sound.play('steel'); return; }
    p.score -= price;
    shopApply(item, p);
    sh.msg = 'BOUGHT ' + item.name;
    sh.msgT = 60;
    Sound.play(item.id === 'life' ? 'life' : 'pickup');
  },

  // next player's turn, or on to the stage
  shopNext() {
    const sh = this.shop;
    sh.turn++;
    sh.idx = 0; sh.scroll = 0; sh.msgT = 0;
    if (sh.turn >= sh.order.length) {
      this.lastScores = this.players.map(p => p.score);
      this.toCurtain(false);
    } else Sound.play('select');
  },

  updateShop() {
    const m = Input.menu(), sh = this.shop;
    if (sh.msgT > 0) sh.msgT--;
    let d = 0;
    if (m.up) { d = -1; sh.rep = 16; } else if (m.down) { d = 1; sh.rep = 16; }
    else {
      const held = Input.heldDir();
      if ((held === 0 || held === 2) && --sh.rep <= 0) { d = held === 0 ? -1 : 1; sh.rep = 4; }
    }
    if (d) { this.shopMove(d); Sound.play('select'); }
    if (m.ok) this.shopBuy();
    else if (m.back) this.shopNext();
  },

  renderShop(ctx) {
    const sh = this.shop, p = sh.order[sh.turn];
    ctx.fillStyle = COL.black;
    ctx.fillRect(0, 0, SW, SH);
    Font.drawCenter(ctx, 'SHOP', SW / 2, 6, COL.red);
    ctx.drawImage(Sprites.tank('p' + p.level, (this.t >> 3) & 1, 1, Config.playerPal(p.i)), 6, 15);
    Font.draw(ctx, p.i === 0 ? 'I-PLAYER' : 'II-PLAYER', 26, 20, COL.red);
    Font.drawRight(ctx, p.score, 214, 20, COL.gold);
    Font.draw(ctx, 'PTS', 220, 20, COL.white);
    for (let r = 0; r < SHOP_ROWS; r++) {
      const i = sh.scroll + r, item = SHOP_ITEMS[i];
      if (!item) break;
      const y = SHOP_TOP + r * SHOP_ROW_H;
      if (i === sh.idx) { ctx.fillStyle = '#20206C'; ctx.fillRect(4, y - 4, SW - 8, SHOP_ROW_H); }
      if (item.id === 'done') {
        Font.draw(ctx, item.name + ' ' + this.stageNum, 34, y, COL.white);
        continue;
      }
      ctx.drawImage(Sprites.powerups[item.icon], 12, y - 4);
      const price = shopPrice(item), st = shopStatus(item, p);
      Font.draw(ctx, item.name, 34, y, st.max ? COL.lgrey : COL.white);
      if (!st.max) Font.drawRight(ctx, price, 190, y, p.score >= price ? COL.gold : '#7C3C3C');
      Font.drawRight(ctx, st.text, 250, y, COL.lgrey);
    }
    ctx.fillStyle = COL.lgrey;
    if (sh.scroll > 0) for (let k = 0; k < 4; k++) ctx.fillRect(SW / 2 - k, 30 + k, 1 + 2 * k, 1);
    if (sh.scroll + SHOP_ROWS < SHOP_ITEMS.length) for (let k = 0; k < 4; k++) ctx.fillRect(SW / 2 - 3 + k, SHOP_TOP + SHOP_ROWS * SHOP_ROW_H - 3 + k, 7 - 2 * k, 1);
    const item = SHOP_ITEMS[sh.idx];
    if (sh.msgT > 0) Font.drawCenter(ctx, sh.msg, SW / 2, 192, sh.msg.startsWith('BOUGHT') ? COL.gold : COL.red);
    else if (item.desc) {
      const desc = item.id === 'mines' ? '+' + Config.get('mineCount') + ' ' + item.desc : item.desc;
      Font.drawCenter(ctx, desc, SW / 2, 192, COL.white);
    }
    Font.drawCenter(ctx, 'A BUY   ESC DONE', SW / 2, 208, COL.lgrey);
  },

  // ---------------------------------------------------------------- settings
  toSettings() {
    this.st = { idx: 1, scroll: 0, rep: 0 };
    this.setState('settings');
  },

  settingsMove(dir) {
    const n = SETTINGS_DEF.length, st = this.st;
    let i = st.idx;
    do { i = (i + dir + n) % n; } while (SETTINGS_DEF[i].section);
    st.idx = i;
    // keep the cursor (and the section header above it) on screen
    if (st.idx < st.scroll + 1) st.scroll = Math.max(0, st.idx - 1);
    if (st.idx >= st.scroll + SETTINGS_ROWS) st.scroll = st.idx - SETTINGS_ROWS + 1;
    if (dir > 0 && st.idx < st.scroll) st.scroll = 0;
  },

  settingsActivate(dir) {
    const row = SETTINGS_DEF[this.st.idx];
    if (row.key) {
      Config.step(row.key, dir);
      Sound.play('select');
    } else if (row.action === 'reset') {
      Config.reset();
      Sound.play('pickup');
    } else if (row.action === 'classicPU') {
      Config.setPowerups(pu => (pu.isNew ? 'OFF' : 'ANYONE'));
      Sound.play('pickup');
    } else if (row.action === 'allPU') {
      Config.setPowerups(() => 'ANYONE');
      Sound.play('pickup');
    } else if (row.action === 'fitScreen') {
      // one click: field sized to the screen shape, scaled to fill it, fullscreen
      Config.values.fieldW = 'FIT';
      Config.values.fieldH = 13;
      Config.values.scaling = 'FILL';
      Config.save();
      if (!(document.fullscreenElement || document.webkitFullscreenElement)) toggleFullscreen();
      this.applyLayout();
      Config.apply();
      Sound.play('pickup');
    } else if (row.action === 'fullscreen') {
      toggleFullscreen();
    } else if (row.action === 'back') {
      this.leaveSettings();
    }
  },

  leaveSettings() {
    this.toTitle();
    this.titleY = 0;
    this.menuIdx = 3;
  },

  updateSettings() {
    const m = Input.menu(), st = this.st;
    const tapped = m.up ? 0 : m.right ? 1 : m.down ? 2 : m.left ? 3 : -1;
    let d = -1;
    if (tapped >= 0) { d = tapped; st.rep = 16; }
    else {
      const held = Input.heldDir();
      if (held >= 0 && --st.rep <= 0) { d = held; st.rep = 4; }
    }
    if (d === 0) { this.settingsMove(-1); Sound.play('select'); }
    if (d === 2) { this.settingsMove(1); Sound.play('select'); }
    if (d === 1 || d === 3) {
      if (SETTINGS_DEF[st.idx].key) this.settingsActivate(d === 1 ? 1 : -1);
    }
    if (m.ok) this.settingsActivate(1);
    else if (m.alt) { if (SETTINGS_DEF[st.idx].key) this.settingsActivate(-1); }
    else if (m.back) this.leaveSettings();
  },

  renderSettings(ctx) {
    const st = this.st;
    ctx.fillStyle = COL.black;
    ctx.fillRect(0, 0, SW, SH);
    Font.drawCenter(ctx, 'SETTINGS', SW / 2, 8, COL.red);
    Font.drawRight(ctx, 'V' + APP_VERSION, 250, 8, '#505050');
    for (let r = 0; r < SETTINGS_ROWS; r++) {
      const i = st.scroll + r, row = SETTINGS_DEF[i];
      if (!row) break;
      const y = SETTINGS_TOP + r * SETTINGS_ROW_H;
      if (row.section) {
        Font.draw(ctx, row.section, 8, y, COL.orange);
        ctx.fillStyle = COL.orange;
        ctx.fillRect(8 + row.section.length * 8 + 2, y + 3, 216 - row.section.length * 8, 1);
        if (row.enemy !== undefined) ctx.drawImage(Sprites.tank('e' + row.enemy, 0, 3, 'silver'), 232, y - 5);
        if (row.section === 'WHO CAN COLLECT') {
          ctx.fillStyle = COL.black;
          ctx.fillRect(184, y, 64, 8);
          Font.draw(ctx, '* NEW', 200, y, COL.gold);
        }
        continue;
      }
      const sel = i === st.idx;
      if (sel) {
        ctx.fillStyle = '#20206C';
        ctx.fillRect(4, y - 2, SW - 8, 11);
      }
      if (row.action) {
        Font.draw(ctx, row.label, 16, y, row.action === 'reset' ? COL.red : row.action === 'back' ? COL.white : COL.gold);
        continue;
      }
      Font.draw(ctx, row.label, 16, y, COL.white);
      const val = Config.format(row.key);
      Font.drawRight(ctx, val, 238, y, Config.isDefault(row.key) ? COL.lgrey : COL.gold);
      if (sel) {
        Font.draw(ctx, '<', 238 - val.length * 8 - 9, y, COL.white);
        Font.draw(ctx, '>', 241, y, COL.white);
      }
      if (row.color) {
        const c = TANK_COLORS[Config.get(row.key)];
        c.forEach((col, k) => { ctx.fillStyle = col; ctx.fillRect(160 - 18 + k * 5, y, 5, 7); });
      }
    }
    // scroll hints
    ctx.fillStyle = COL.lgrey;
    if (st.scroll > 0) for (let k = 0; k < 4; k++) ctx.fillRect(SW / 2 - k, 19 + k - 3, 1 + 2 * k, 1);
    if (st.scroll + SETTINGS_ROWS < SETTINGS_DEF.length) for (let k = 0; k < 4; k++) ctx.fillRect(SW / 2 - 3 + k, 205 + k, 7 - 2 * k, 1);
    // footer: what the selected power-up does, otherwise the controls
    const cur = SETTINGS_DEF[st.idx];
    if (cur.powerup !== undefined) {
      ctx.drawImage(Sprites.powerups[cur.powerup], 8, 207);
      Font.draw(ctx, POWERUPS[cur.powerup].desc, 28, 212, COL.white);
    } else {
      Font.drawCenter(ctx, '<> CHANGE   ESC BACK', SW / 2, 212, COL.lgrey);
    }
  },

  // mouse / touch on the canvas (in screen pixels)
  pointer(x, y) {
    Sound.unlock();
    if (this.state === 'title' || this.state === 'settings' || this.state === 'shop') { x -= menuOX(); y -= menuOY(); }
    if (this.state === 'shop') {
      const r = Math.floor((y - SHOP_TOP + 4) / SHOP_ROW_H), i = this.shop.scroll + r;
      if (r < 0 || r >= SHOP_ROWS || !SHOP_ITEMS[i]) return;
      if (i === this.shop.idx) this.shopBuy();
      else { this.shop.idx = i; Sound.play('select'); }
      return;
    }
    if (this.state === 'title' && this.titleY === 0) {
      const i = Math.floor((y - this.titleMenuY() + 4) / 14);
      if (i >= 0 && i < this.titleMenu().length && x > 56 && x < 200) {
        if (i === this.menuIdx) this.chooseMenu(i);
        else { this.menuIdx = i; Sound.play('select'); }
      }
    } else if (this.state === 'settings') {
      const r = Math.floor((y - SETTINGS_TOP + 2) / SETTINGS_ROW_H);
      if (y < 20) { this.settingsMove(-1); return; }
      if (y > 204) { this.settingsMove(1); return; }
      const i = this.st.scroll + r, row = SETTINGS_DEF[i];
      if (r < 0 || r >= SETTINGS_ROWS || !row || row.section) return;
      if (i !== this.st.idx && !row.action) { this.st.idx = i; Sound.play('select'); return; }
      this.st.idx = i;
      if (row.key) this.settingsActivate(x < 196 ? -1 : 1);
      else this.settingsActivate(1);
    }
  },

  wheel(dy) {
    if (this.state === 'settings') this.settingsMove(dy > 0 ? 1 : -1);
    if (this.state === 'shop') this.shopMove(dy > 0 ? 1 : -1);
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
      case 'settings': this.updateSettings(); break;
      case 'shop': this.updateShop(); break;
    }
  },

  render(ctx) {
    // the canvas follows the field size; menus sit in a centred 256x224 frame
    const c = ctx.canvas;
    if (c.width !== SCREEN_W || c.height !== SCREEN_H) {
      c.width = SCREEN_W;
      c.height = SCREEN_H;
      ctx.imageSmoothingEnabled = false;
      Sprites.brickPattern = null;
      if (this.onResize) this.onResize();
    }
    const full = this.state === 'play' || this.state === 'curtain' || this.state === 'construct';
    if (!full) {
      ctx.fillStyle = COL.black;
      ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
      ctx.save();
      ctx.translate(menuOX(), menuOY());
    }
    this.renderState(ctx);
    if (!full) ctx.restore();
  },

  renderState(ctx) {
    switch (this.state) {
      case 'title': this.renderTitle(ctx); break;
      case 'curtain': this.renderCurtain(ctx); break;
      case 'play': this.renderPlay(ctx); break;
      case 'score': this.renderScore(ctx); break;
      case 'bigover': this.renderBigOver(ctx); break;
      case 'construct': this.renderConstruct(ctx); break;
      case 'settings': this.renderSettings(ctx); break;
      case 'shop': this.renderShop(ctx); break;
    }
  },
};

function toggleFullscreen() {
  const el = document.getElementById('wrap');
  const fsEl = document.fullscreenElement || document.webkitFullscreenElement;
  try {
    if (fsEl) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    else {
      const req = el.requestFullscreen || el.webkitRequestFullscreen;
      const r = req && req.call(el);
      if (r && r.catch) r.catch(() => {});
    }
  } catch (e) { /* fullscreen not available here */ }
}

// =====================================================================
//  Boot & main loop (fixed 60 Hz simulation)
// =====================================================================
(function boot() {
  const canvas = document.getElementById('screen');
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  document.title = APP_TITLE;
  Sprites.init();
  Config.init();
  Input.init();
  Game.init();

  const toScreen = e => {
    const r = canvas.getBoundingClientRect();
    return [(e.clientX - r.left) * canvas.width / r.width, (e.clientY - r.top) * canvas.height / r.height];
  };
  canvas.addEventListener('pointerdown', e => { const [x, y] = toScreen(e); Game.pointer(x, y); });
  canvas.addEventListener('wheel', e => {
    if (Game.state !== 'settings' && Game.state !== 'shop') return;
    e.preventDefault();
    Game.wheel(e.deltaY);
  }, { passive: false });

  // SHARP scales by whole pixels; FILL uses all the space it can
  function resize() {
    const wrap = document.getElementById('wrap');
    const cs = getComputedStyle(wrap);
    const w = wrap.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const h = wrap.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    let s = Math.min(w / canvas.width, h / canvas.height);
    if (s >= 1 && Config.get('scaling') === 'SHARP') s = Math.floor(s);
    s = Math.max(0.25, s);
    canvas.style.width = Math.round(canvas.width * s) + 'px';
    canvas.style.height = Math.round(canvas.height * s) + 'px';
  }
  Game.onResize = resize;
  const relayout = () => {
    // outside a game, FIT field sizes follow the window shape
    if (Game.state === 'title' || Game.state === 'settings') Game.applyLayout();
    resize();
  };
  window.addEventListener('resize', relayout);
  document.addEventListener('fullscreenchange', relayout);
  document.addEventListener('webkitfullscreenchange', relayout);
  canvas.addEventListener('dblclick', toggleFullscreen);
  resize();

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && Game.state === 'play' && !Game.paused && !Game.stage.over) {
      Game.paused = true;
      Game.pauseIdx = 0;
      Sound.setEngine(0);
    }
  });

  const BASE_STEP = 1000 / 60;
  let last = performance.now(), acc = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    acc += now - last;
    last = now;
    if (acc > 200) acc = 200;
    const STEP = BASE_STEP / Config.scale('gameSpeed');
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
