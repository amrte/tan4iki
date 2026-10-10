'use strict';
// =====================================================================
//  DESERT DOMINION: the screen and the controls.
//    The screen: a status bar on top (MENU, the latest message, the rolling credits counter), the map view, and a
//    sidebar on the right: the radar minimap (needs a radar outpost and power), the power bar, the factory tabs, the
//    build icons (progress, READY, queue counts; starport prices and stock), and the selection panel (portrait,
//    health, the command buttons: ATTACK MOVE RETREAT GUARD, DEPLOY, HARVEST, SELF-DESTRUCT, REPAIR SELL UPGRADE ...).
//    Mouse: left click selects, drag a box for several; with units selected a left click on the ground moves, on an
//    enemy attacks (CLASSIC; MODERN: the right button orders), right click deselects / cancels; Ctrl+click forces
//    fire; double-click selects all of a kind on screen; the screen's edge, the arrow keys and WASD scroll; the
//    minimap jumps. Keyboard + gamepad without a mouse: the d-pad moves a cursor (faster as you hold it; at the edge it
//    scrolls), FIRE clicks, B cancels (B + d-pad pans), TAB / pad X jumps the cursor between map and sidebar, pad Y
//    home, LB/RB the factory tabs. Touch: tap = click, drag = pan, two fingers = deselect, hold a finger still then
//    drag = a selection box; on the build icons a drag scrolls them and a long press cancels (the right button).
//    Hotkeys: H home, G guard, S stop, A attack-move, R repair, DEL sell, CTRL/SHIFT+1..9 make a group, 1..9 pick it
//    (twice: go there).
//    Plus Game.rtsSkirmishSetup (the skirmish setup screen), the stand-in Game.rtsMenu / Game.rtsMissionOver (until
//    the campaign's are loaded), and the mode's hooks into the game (title, curtain, pause, restart, music).
// =====================================================================

const RTS_SETUP_KEY = 'tank1990_rts_setup';
const RTS_SKILLS = ['EASY', 'NORMAL', 'HARD', 'VERY HARD', 'BRUTAL'];
const RTS_SIZES = [48, 64, 80, 96];
const RTS_STYLES = ['open', 'canyons', 'islands', 'basin'];
const RTS_CREDITS = [1000, 1500, 2500, 5000, 10000];
const RTS_KEYS_DIR = { up: ['ArrowUp'], down: ['ArrowDown'], left: ['ArrowLeft'], right: ['ArrowRight'] };
const RTS_FIRE_KEYS = ['Space', 'KeyJ', 'KeyK', 'KeyZ', 'KeyX', 'KeyF', 'TFire'];
const RTS_KEYMODS = { ctrl: false, shift: false };
const RTS_CO_COL = ['#F8F8F8', '#F8D878', '#78F8F8', '#F878F8'];   // online guests' cursors and selections

// the set-up rows' height: ten pixels, closer when there are many
function rtsSetupRowH(n) { return Math.max(8, Math.min(10, Math.floor((SH - 40) / Math.max(1, n)))); }
function rtsSetupPrefs() {
  const d = { house: 'aquila', foes: [{ house: 'drakon', ai: 1 }, { house: 'serpens', ai: 1 }, { house: 'regent', ai: 1 }], nfoes: 1, size: 1, style: 0,
    credits: 1, tech: 9, worms: 1, fog: false, clicks: 'CLASSIC', speed: 1, ffa: false };
  const s = STORE.get(RTS_SETUP_KEY, null);
  if (s && typeof s === 'object') {
    for (const k in d) if (s[k] !== undefined && typeof s[k] === typeof d[k]) d[k] = s[k];
    if (!Array.isArray(d.foes) || d.foes.length < 3) d.foes = [{ house: 'drakon', ai: 1 }, { house: 'serpens', ai: 1 }, { house: 'regent', ai: 1 }];
  }
  return d;
}

Object.assign(RtsGame.prototype, {
  // ================================================================ set-up
  uiInit() {
    const prefs = rtsSetupPrefs();
    this.ui = this.newUi(this.opts.clicks || prefs.clicks || 'CLASSIC');
    this.coUis = {};   // online: a guest's own cursor and selection (they command the same House)
    this.cam = { x: 0, y: 0 };
    rtsInstallInput();
  },
  newUi(clicks) {
    return { sel: [], selB: null, mode: null, placeKey: null, tab: 'yard', scroll: 0, groups: {}, mx: -99, my: -99, mIn: false, kbd: false,
      cx: 100, cy: 100, overMap: false, hover: null, cursor: 'normal', cred: 0, drag: null, touches: new Map(), pan: null, mark: null,
      lastGroup: { n: -1, t: -99 }, sellArm: null, mmDrag: false, clicks: clicks || 'CLASSIC', holdT: 0, side: false, tip: '' };
  },
  uiStart() {
    this.uiLayout();
    const P = this.P;
    const b = P.buildings[0], u = P.units.find(q => q.d.deploys) || P.units[0];
    const at = b ? { x: b.cx, y: b.cy } : u ? { x: u.x, y: u.y } : { x: P.start.x * 16, y: P.start.y * 16 };
    this.centerOn(at.x, at.y);
    this.ui.cred = P.credits;
    this.ui.cx = this.L.mx + this.L.mw / 2; this.ui.cy = this.L.my + this.L.mh / 2;
    if (u && u.d.deploys) { this.ui.sel = [u]; this.say('DEPLOY THE MCV ON ROCK TO BUILD YOUR BASE'); }
    if (this.opts.objectiveText) this.say(String(this.opts.objectiveText).toUpperCase());
    else if (this.objectives.harvest) this.say('HARVEST ' + this.objectives.harvest + ' CREDITS OF GLIMMER');
    this.onDeployed = (yard) => { this.ui.sel = []; this.ui.selB = yard; this.ui.tab = 'yard'; };
  },
  uiLayout() {
    const W = SCREEN_W, H = SCREEN_H;
    if (this.L && this.L.W === W && this.L.H === H) return;
    const side = 88, top = 10, sx = W - side;
    const panelH = 44, py = H - panelH;
    const gridY = top + 103, rows = Math.max(2, Math.floor((py - 2 - gridY) / 27));
    this.L = { W, H, side, top, sx, mx: 0, my: top, mw: W - side, mh: H - top,
      mm: { x: sx + 4, y: top + 2, w: 80, h: 80 },
      pwr: { x: sx + 4, y: top + 84, w: 80, h: 7 },
      tabs: { x: sx, y: top + 93, w: side, h: 9 },
      grid: { x: sx + 1, y: gridY, cols: 2, rows, cw: 40, ch: 27 },
      panel: { x: sx, y: py, w: side, h: panelH } };
    this.clampCam();
  },
  centerOn(x, y) { this.cam.x = x - this.L.mw / 2; this.cam.y = y - this.L.mh / 2; this.clampCam(); },
  clampCam() {
    if (!this.L) return;
    this.cam.x = Math.max(0, Math.min(this.W * 16 - this.L.mw, this.cam.x));
    this.cam.y = Math.max(0, Math.min(this.H * 16 - this.L.mh, this.cam.y));
    if (this.W * 16 < this.L.mw) this.cam.x = (this.W * 16 - this.L.mw) / 2;
    if (this.H * 16 < this.L.mh) this.cam.y = (this.H * 16 - this.L.mh) / 2;
  },
  // is (x, y) on the player's screen? (sounds play only for what you can see)
  uiNear(x, y) {
    if (!this.L) return true;
    return x > this.cam.x - 48 && x < this.cam.x + this.L.mw + 48 && y > this.cam.y - 48 && y < this.cam.y + this.L.mh + 48;
  },
  toWorld(x, y) { return { x: x - this.L.mx + this.cam.x, y: y - this.L.my + this.cam.y }; },
  inMapView(x, y) { const L = this.L; return x >= L.mx && x < L.mx + L.mw && y >= L.my && y < L.my + L.mh; },
  inRect(x, y, r) { return x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h; },

  // ================================================================ what's under the pointer
  pick(wx, wy, ownFirst) {
    let best = null, bd = 1e9;
    for (const u of this.units) {
      if (u.dead || u.carried || u.key === 'frigate' || u.key === 'doomfist') continue;
      const at = this.unitXY(u), uy = at.y - (u.d.cls === 'air' ? (u.alt || 1) * 10 : 0);
      const r = u.d.cls === 'inf' ? 5 : rtsUnitSize(u.key) / 2;
      const d = Math.max(Math.abs(at.x - wx), Math.abs(uy - wy));
      if (d > r) continue;
      if (this.hiddenFromPlayer(u)) continue;
      const sc = d - (ownFirst && u.h === this.player ? 4 : 0) - (u.d.cls === 'air' ? 2 : 0);
      if (sc < bd) { bd = sc; best = u; }
    }
    if (best) return best;
    const tx = Math.floor(wx / 16), ty = Math.floor(wy / 16);
    if (!this.inMap(tx, ty)) return null;
    const b = this.bAt[ty * this.W + tx];
    if (b && this.P.exp[ty * this.W + tx]) return b;
    return null;
  },
  mine(o) { return o && !o.dead && o.h === this.player; },
  selUnits() { return this.ui.sel.filter(u => !u.dead && u.h === this.player && !u.carried); },
  orderable() { return this.selUnits().filter(u => !u.d.lifter); },
  ghostPos() {
    const ui = this.ui, d = RTS_BUILDINGS[ui.placeKey];
    if (!d) return null;
    const w = this.toWorld(ui.mx, ui.my);
    return { x: Math.round(w.x / 16 - d.w / 2), y: Math.round(w.y / 16 - d.h / 2) };
  },
  // the cursor that says what a click would do
  cursorKind() {
    const ui = this.ui;
    if (!ui.overMap) return 'normal';
    if (ui.mode === 'place') return 'place';
    if (ui.mode === 'attack' || ui.mode === 'amove' || ui.mode === 'palace' || ui.mode === 'sabotage') return 'attack';
    if (ui.mode === 'capture') return 'capture';
    if (ui.mode === 'move' || ui.mode === 'rally') return 'move';
    if (ui.mode === 'harvest') return 'harvest';
    const w = this.toWorld(ui.mx, ui.my), t = ui.hover, sel = this.orderable();
    const tx = Math.floor(w.x / 16), ty = Math.floor(w.y / 16);
    if (!sel.length) {
      if (ui.selB && this.mine(ui.selB) && ui.selB.d.fac && ui.selB.key !== 'yard' && !t) return 'move';
      return t ? 'select' : 'normal';
    }
    if (t && this.isEnemy(this.player, t.h)) {
      if (t.isB && sel.some(u => u.d.capture) && t.hp <= t.max * 0.5 && !t.d.wall) return 'capture';
      return sel.some(u => u.d.wpn || u.d.saboteur) ? 'attack' : 'nomove';
    }
    if (t && t.isB && t.h === this.player) {
      if (t.key === 'refinery' && sel.some(u => u.d.harvester)) return 'repair';
      if (t.d.repairPad && sel.some(u => u.d.cls === 'veh')) return 'repair';
      return 'select';
    }
    if (t && t.isU) {
      if (t.d.deploys && sel.length === 1 && sel[0] === t) return 'deploy';
      return 'select';
    }
    if (!this.inMap(tx, ty)) return 'nomove';
    const i = ty * this.W + tx;
    if (sel.every(u => u.d.harvester) && this.map.g[i] > 0) return 'harvest';
    if (this.P.exp[i] && !sel.some(u => u.d.cls === 'air' || this.passStatic(u.d.move, i))) return 'nomove';
    return 'move';
  },

  // ================================================================ the pointer (mouse, pen, touch)
  ptr(kind, x, y, e) {
    const ui = this.ui;
    this.uiLayout();
    if (kind === 'move') {
      if (e && e.pointerType === 'touch') this.touchMove(x, y, e);
      ui.rx = x; ui.ry = y; ui.inWin = !e || e.pointerType === 'mouse';
      ui.mIn = x >= 0 && y >= 0 && x < this.L.W && y < this.L.H; ui.kbd = false;
      ui.mx = Math.max(0, Math.min(this.L.W - 1, x)); ui.my = Math.max(0, Math.min(this.L.H - 1, y));
      if (ui.mmDrag) this.minimapJump(x, y);
      return;
    }
    if (kind === 'wheel') {
      if (x >= this.L.sx) this.scrollGrid(e.deltaY > 0 ? 1 : -1);
      return;
    }
    if (e && e.pointerType === 'touch') { this.touchEvent(kind, x, y, e); return; }
    ui.mx = x; ui.my = y; ui.kbd = false;
    if (e) { RTS_KEYMODS.ctrl = e.ctrlKey || e.metaKey; RTS_KEYMODS.shift = e.shiftKey; }
    const btn = e ? e.button : 0;
    if (kind === 'down') this.pressAt(x, y, btn);
    else if (kind === 'up' || kind === 'cancel') this.releaseAt(x, y, btn, kind === 'cancel');
    else if (kind === 'dbl') this.dblAt(x, y);
  },
  pressAt(x, y, btn) {
    const ui = this.ui, L = this.L;
    if (y < L.top) { if (x < 30 && !this.coActive) this.openMenu(); return; }
    if (x >= L.sx) { this.sideClick(x, y, btn); return; }
    if (!this.inMapView(x, y)) return;
    if (btn === 2) { this.mapClick(x, y, 2); return; }
    if (btn !== 0) return;
    const w = this.toWorld(x, y);
    ui.drag = { x0: x, y0: y, wx0: w.x, wy0: w.y, active: false };
  },
  releaseAt(x, y, btn, cancelled) {
    const ui = this.ui;
    ui.mmDrag = false;
    if (btn !== 0 || !ui.drag) return;
    const d = ui.drag;
    ui.drag = null;
    if (cancelled) return;
    if (d.active && !ui.mode) { this.boxSelect(d.wx0, d.wy0, this.toWorld(x, y)); return; }
    this.mapClick(d.x0, d.y0, 0);
  },
  dblAt(x, y) {
    if (!this.inMapView(x, y) || this.ui.mode) return;
    const w = this.toWorld(x, y), t = this.pick(w.x, w.y, true);
    if (!t || !t.isU || t.h !== this.player) return;
    const L = this.L, c = this.cam;
    this.ui.sel = this.P.units.filter(u => !u.dead && !u.carried && u.key === t.key && u.x >= c.x && u.x < c.x + L.mw && u.y >= c.y && u.y < c.y + L.mh);
    this.ui.selB = null;
  },
  // touch: tap clicks, a drag pans, two fingers deselect; a finger held still a moment on the map starts a selection
  // box (drag it out and lift: what's in it is selected; lifted without dragging: all of that kind on the screen)
  touchEvent(kind, x, y, e) {
    const ui = this.ui, T = ui.touches;
    if (kind === 'down') {
      T.set(e.pointerId, { x0: x, y0: y, x, y, moved: false, t0: performance.now() });
      if (T.size >= 2) { ui.twoFinger = true; if (ui.drag && ui.drag.touch) ui.drag = null; }
      ui.mx = x; ui.my = y;
      if (T.size === 1 && x >= this.L.sx) {
        const G = this.L.grid, t = T.get(e.pointerId);
        t.side = true;
        // the build icons wait for the lift: a drag scrolls them, a long press cancels (the right button's job)
        if (y >= G.y && y < G.y + G.rows * G.ch) { t.grid = true; t.sy = y; } else this.sideClick(x, y, 0);
      }
      return;
    }
    const t = T.get(e.pointerId);
    if (!t) return;
    T.delete(e.pointerId);
    if (t.box) {
      const d = ui.drag;
      ui.drag = null;
      if (kind === 'cancel' || ui.twoFinger || !d) { if (!T.size) ui.twoFinger = false; return; }
      if (Math.hypot(x - t.x0, y - t.y0) > 6) this.boxSelect(d.wx0, d.wy0, this.toWorld(x, y)); else this.dblAt(t.x0, t.y0);
      return;
    }
    if (kind === 'cancel') { if (!T.size) ui.twoFinger = false; return; }
    if (ui.twoFinger) { if (!T.size) { ui.twoFinger = false; this.cancel(); } return; }
    if (t.grid) {
      if (kind === 'up' && !t.moved && !ui.twoFinger) {
        const G = this.L.grid, c = Math.floor((t.x0 - G.x) / G.cw), r = Math.floor((t.y0 - G.y) / G.ch);
        const key = this.sideItems(ui.tab)[(r + ui.scroll) * G.cols + c];
        if (performance.now() - t.t0 > 450 && key && c >= 0 && c < G.cols) this.itemClick(ui.tab, key, 2); else this.sideClick(t.x0, t.y0, 0);
      }
      return;
    }
    if (t.side) { ui.mmDrag = false; return; }
    if (!t.moved && this.inMapView(t.x0, t.y0)) { ui.mx = t.x0; ui.my = t.y0; this.mapClick(t.x0, t.y0, 0); }
    else if (!t.moved && t.y0 < this.L.top && t.x0 < 30) this.openMenu();
  },
  touchMove(x, y, e) {
    const t = this.ui.touches.get(e.pointerId);
    if (t && t.grid) {
      if (!t.moved && Math.abs(y - t.y0) > 6) t.moved = true;
      if (t.moved) { const ch = this.L.grid.ch; while (y - t.sy <= -ch / 2) { this.scrollGrid(1); t.sy -= ch / 2; } while (y - t.sy >= ch / 2) { this.scrollGrid(-1); t.sy += ch / 2; } }
      return;
    }
    if (!t || t.side || this.ui.touches.size > 1) return;
    if (t.box) { t.x = x; t.y = y; return; }
    if (!t.moved && Math.hypot(x - t.x0, y - t.y0) > 6) t.moved = true;
    if (t.moved) {
      if (this.ui.mode === 'place') return;
      this.cam.x -= x - t.x; this.cam.y -= y - t.y; this.clampCam();
    }
    t.x = x; t.y = y;
  },
  openMenu() { Game.paused = true; Game.pauseIdx = 0; if (typeof Sound !== 'undefined') Sound.play('pause'); },
  // right click (CLASSIC) / B: cancel what's armed, else deselect
  cancel() {
    const ui = this.ui;
    if (ui.mode) { ui.mode = null; ui.placeKey = null; return; }
    ui.sel = []; ui.selB = null; ui.sellArm = null;
  },
  boxSelect(wx0, wy0, w1) {
    const x0 = Math.min(wx0, w1.x), x1 = Math.max(wx0, w1.x), y0 = Math.min(wy0, w1.y), y1 = Math.max(wy0, w1.y);
    const got = this.P.units.filter(u => !u.dead && !u.carried && u.x >= x0 - 3 && u.x <= x1 + 3 && u.y - (u.d.cls === 'air' ? 10 : 0) >= y0 - 3 && u.y <= y1 + 3);
    if (RTS_KEYMODS.shift) { for (const u of got) if (!this.ui.sel.includes(u)) this.ui.sel.push(u); }
    else this.ui.sel = got;
    if (got.length) { this.ui.selB = null; if (typeof Sound !== 'undefined') Sound.play('select'); }
  },
  mapClick(x, y, btn) {
    const ui = this.ui, w = this.toWorld(x, y);
    const tx = Math.floor(w.x / 16), ty = Math.floor(w.y / 16);
    const modern = ui.clicks === 'MODERN';
    if (ui.mode === 'place') {
      if (btn === 0) this.tryPlace();
      else ui.mode = null;
      return;
    }
    if (btn === 2 && !modern) { this.cancel(); return; }
    const t = this.pick(w.x, w.y, true);
    if (ui.mode) {
      if (btn === 0 || modern) this.doMode(ui.mode, t, tx, ty, w);
      return;
    }
    const sel = this.orderable();
    const orderBtn = modern ? 2 : 0;
    if (btn === orderBtn) {
      const fb = ui.selB && this.mine(ui.selB) ? ui.selB : null;
      if (sel.length) {
        // CLASSIC: a click on one of your own units selects it instead (except an MCV deploying, or a refinery / pad)
        const own = t && t.h === this.player;
        const special = own && ((t.isB && (t.key === 'refinery' || t.d.repairPad)) || (t.isU && t.d.deploys && sel.length === 1 && sel[0] === t));
        if (modern || !own || special || RTS_KEYMODS.ctrl) { this.order(sel, t, tx, ty, w); return; }
      } else if (fb && fb.d.fac && fb.key !== 'yard' && !t && this.inMap(tx, ty)) {
        this.setRally(this.player, fb, tx, ty);
        ui.mark = { x: tx * 16 + 8, y: ty * 16 + 8, t: this.frame };
        return;
      } else if (modern && btn === 2) return;
    }
    if (btn !== 0) return;
    this.selectThing(t);
  },
  selectThing(t) {
    const ui = this.ui;
    ui.sellArm = null;
    if (!t) { if (!RTS_KEYMODS.shift) { ui.sel = []; ui.selB = null; } return; }
    if (t.isB) {
      ui.sel = []; ui.selB = t;
      if (t.h === this.player) {
        if (t.d.fac) this.ui.tab = t.d.fac;
        if (t.d.fac && t.d.fac !== 'starport') this.setPrimary(this.player, t);
        if (typeof Sound !== 'undefined') Sound.play('select');
      }
      return;
    }
    if (RTS_KEYMODS.shift && t.h === this.player) {
      const k = ui.sel.indexOf(t);
      if (k >= 0) ui.sel.splice(k, 1); else ui.sel.push(t);
    } else ui.sel = [t];
    ui.selB = null;
    if (t.h === this.player && typeof Sound !== 'undefined') Sound.play('select');
  },
  // what a click with units selected means: attack, capture, harvest, unload, repair, deploy, or go there
  order(sel, t, tx, ty, w) {
    const ui = this.ui;
    let attack = false;
    if (RTS_KEYMODS.ctrl) {
      for (const u of sel) if (u.d.wpn) this.cmdAttack(u, t && t !== u ? t : { x: tx, y: ty });
      attack = true;
    } else if (t && this.isEnemy(this.player, t.h)) {
      attack = true;
      for (const u of sel) {
        if (u.d.saboteur && t.isB) this.cmdSabotage(u, t);
        else if (u.d.capture && t.isB && t.hp <= t.max * 0.5 && !t.d.wall) this.cmdCapture(u, t);
        else if (u.d.wpn) this.cmdAttack(u, t);
        else this.cmdMove(u, tx, ty);
      }
    } else if (t && t.isB && t.h === this.player && t.key === 'refinery' && sel.some(u => u.d.harvester)) {
      for (const u of sel) if (u.d.harvester) this.cmdReturn(u); else this.cmdMove(u, tx, ty);
    } else if (t && t.isB && t.h === this.player && t.d.repairPad) {
      for (const u of sel) if (!this.cmdRepair(u, t)) this.cmdMove(u, tx, ty);
    } else if (t && t.isU && t.d.deploys && sel.length === 1 && sel[0] === t) {
      this.cmdDeploy(t);
      return;
    } else {
      const harv = sel.filter(u => u.d.harvester), rest = sel.filter(u => !u.d.harvester);
      const i = this.inMap(tx, ty) ? ty * this.W + tx : -1;
      for (const u of harv) { if (i >= 0 && this.map.g[i] > 0) this.cmdHarvest(u, tx, ty); else rest.push(u); }
      if (rest.length) this.cmdMoveGroup(rest, tx, ty);
    }
    ui.mark = { x: tx * 16 + 8, y: ty * 16 + 8, t: this.frame, attack };
    if (typeof Sound !== 'undefined') Sound.play(attack ? 'mark' : 'tick');
  },
  // the armed command (a button or a hotkey) meets its click
  doMode(mode, t, tx, ty) {
    const ui = this.ui, sel = this.orderable();
    ui.mode = null;
    if (!this.inMap(tx, ty)) return;
    const attack = mode === 'attack' || mode === 'amove' || mode === 'palace' || mode === 'sabotage';
    if (mode === 'attack') { for (const u of sel) if (u.d.wpn) this.cmdAttack(u, t && t !== u ? t : { x: tx, y: ty }); else if (u.d.saboteur && t && t.isB) this.cmdSabotage(u, t); }
    else if (mode === 'amove') this.cmdMoveGroup(sel, tx, ty, 'amove');
    else if (mode === 'move') this.cmdMoveGroup(sel, tx, ty);
    else if (mode === 'capture') { if (t && t.isB) for (const u of sel) if (!this.cmdCapture(u, t) && u.d.wpn) this.cmdAttack(u, t); }
    else if (mode === 'sabotage') { if (t && t.isB) for (const u of sel) this.cmdSabotage(u, t); }
    else if (mode === 'harvest') { for (const u of sel) if (u.d.harvester) this.cmdHarvest(u, tx, ty); }
    else if (mode === 'rally') { if (ui.selB) this.setRally(this.player, ui.selB, tx, ty); }
    else if (mode === 'palace') { if (!this.palacePower(this.player, t && this.isEnemy(this.player, t.h) ? t : { x: tx, y: ty })) this.say('THE PALACE IS NOT READY'); }
    ui.mark = { x: tx * 16 + 8, y: ty * 16 + 8, t: this.frame, attack };
    if (typeof Sound !== 'undefined') Sound.play(attack ? 'mark' : 'tick');
  },
  tryPlace() {
    const ui = this.ui, p = this.ghostPos();
    if (!p) return;
    const key = ui.placeKey;
    if (this.place(this.player, key, p.x, p.y)) {
      ui.mode = null; ui.placeKey = null;
      // more slabs of the same kind queued: stay in placing when the next is done
    } else if (typeof Sound !== 'undefined') Sound.play('steel');
  },

  // ================================================================ the sidebar
  sideTabs() {
    const P = this.P, out = [];
    for (const k of RTS_FACTORIES) if (P.buildings.some(b => b.d.fac === k)) out.push(k);
    if ((P.count.starport || 0) > 0) out.push('starport');
    return out;
  },
  sideItems(tab) {
    const list = this.buildList(this.player, tab);
    return list;
  },
  scrollGrid(d) {
    const G = this.L.grid, n = this.sideItems(this.ui.tab).length, rows = Math.ceil(n / G.cols);
    this.ui.scroll = Math.max(0, Math.min(Math.max(0, rows - G.rows), this.ui.scroll + d));
  },
  minimapJump(x, y) {
    const m = this.mmRect();
    const wx = (x - m.x) / m.s * 16, wy = (y - m.y) / m.s * 16;
    this.centerOn(wx, wy);
  },
  mmRect() {
    const L = this.L, s = Math.min(L.mm.w / this.W, L.mm.h / this.H);
    return { s, x: L.mm.x + Math.floor((L.mm.w - this.W * s) / 2), y: L.mm.y + Math.floor((L.mm.h - this.H * s) / 2), w: this.W * s, h: this.H * s };
  },
  sideClick(x, y, btn) {
    const L = this.L, ui = this.ui;
    if (this.inRect(x, y, L.mm)) {
      if (!this.hasRadar(this.P)) return;
      const m = this.mmRect();
      if (btn === 0 || ui.clicks === 'CLASSIC') { if (btn === 0) { ui.mmDrag = true; this.minimapJump(x, y); } else this.cancel(); }
      else { const sel = this.orderable(); if (sel.length) this.cmdMoveGroup(sel, (x - m.x) / m.s, (y - m.y) / m.s); }
      return;
    }
    if (this.inRect(x, y, L.tabs)) {
      const tabs = this.sideTabs();
      if (!tabs.length) return;
      const k = Math.floor((x - L.tabs.x) / (L.tabs.w / tabs.length));
      if (tabs[k]) { ui.tab = tabs[k]; ui.scroll = 0; if (typeof Sound !== 'undefined') Sound.play('select'); }
      return;
    }
    const G = L.grid;
    if (y >= G.y && y < G.y + G.rows * G.ch) {
      if (x >= G.x + G.cols * G.cw) { this.scrollGrid(y < G.y + G.rows * G.ch / 2 ? -1 : 1); return; }
      const c = Math.floor((x - G.x) / G.cw), r = Math.floor((y - G.y) / G.ch);
      const items = this.sideItems(ui.tab), k = (r + ui.scroll) * G.cols + c;
      if (c < 0 || c >= G.cols || !items[k]) return;
      this.itemClick(ui.tab, items[k], btn);
      return;
    }
    if (this.inRect(x, y, L.panel)) {
      const P = L.panel;
      if (y < P.y + 26 && x < P.x + 36) { this.focusSelection(); return; }
      for (const b of this.panelButtons()) {
        if (this.inRect(x, y, b.r)) { if (!b.dis) { b.act(); if (typeof Sound !== 'undefined') Sound.play('select'); } else if (typeof Sound !== 'undefined') Sound.play('steel'); return; }
      }
    }
  },
  itemClick(kind, key, btn) {
    const ui = this.ui, h = this.player, P = this.P;
    if (kind === 'starport') {
      if (btn === 2) this.starportCancel(h, key); else this.starportBuy(h, key);
      return;
    }
    const q = P.prod[kind];
    if (btn === 2) { this.cancelBuild(h, kind, key); if (ui.placeKey === key && !q.ready) { ui.mode = null; ui.placeKey = null; } if (typeof Sound !== 'undefined') Sound.play('tick'); return; }
    if (kind === 'yard' && q.ready === key) { ui.mode = 'place'; ui.placeKey = key; ui.sel = []; return; }
    if (kind === 'yard' && q.ready) { this.say('PLACE THE ' + rtsNameOf(q.ready) + ' FIRST'); ui.mode = 'place'; ui.placeKey = q.ready; return; }
    if (!this.startBuild(h, kind, key)) { if (typeof Sound !== 'undefined') Sound.play('steel'); return; }
    if (typeof Sound !== 'undefined') Sound.play('tick');
  },
  focusSelection() {
    const s = this.selUnits()[0] || this.ui.selB;
    if (s) this.centerOn(s.isB ? s.cx : s.x, s.isB ? s.cy : s.y);
  },
  // the selection panel's buttons (2 x 2): label, what it does, whether it's lit or unavailable
  panelButtons() {
    const L = this.L, P = L.panel, ui = this.ui, out = [];
    const slot = (k, label, act, o) => out.push(Object.assign({ label, act, r: { x: P.x + 1 + (k & 1) * 43, y: P.y + 28 + (k >> 1) * 8, w: 42, h: 7 } }, o || {}));
    const sel = this.orderable(), b = ui.selB && this.mine(ui.selB) ? ui.selB : null;
    if (sel.length) {
      const u = sel[0];
      const armed = sel.some(v => v.d.wpn);
      if (u.d.deploys) {
        slot(0, 'DEPLOY', () => { for (const v of sel) if (v.d.deploys) this.cmdDeploy(v); });
        slot(1, 'MOVE', () => { ui.mode = 'move'; }, { on: ui.mode === 'move' });
        slot(2, 'RETREAT', () => { for (const v of sel) this.cmdReturn(v); });
        slot(3, 'GUARD', () => { for (const v of sel) this.cmdGuard(v); });
      } else if (u.d.harvester) {
        slot(0, 'HARVEST', () => { for (const v of sel) if (v.d.harvester) this.cmdHarvest(v); });
        slot(1, 'RETURN', () => { for (const v of sel) this.cmdReturn(v); });
        slot(2, 'MOVE', () => { ui.mode = 'move'; }, { on: ui.mode === 'move' });
        slot(3, 'REPAIR', () => { for (const v of sel) this.cmdRepair(v); }, { dis: !this.P.count.repair });
      } else if (u.d.saboteur) {
        slot(0, 'SABOTAGE', () => { ui.mode = 'sabotage'; }, { on: ui.mode === 'sabotage' });
        slot(1, 'MOVE', () => { ui.mode = 'move'; }, { on: ui.mode === 'move' });
        slot(2, 'RETREAT', () => { for (const v of sel) this.cmdReturn(v); });
        slot(3, 'GUARD', () => { for (const v of sel) this.cmdGuard(v); });
      } else {
        slot(0, 'ATTACK', () => { ui.mode = 'attack'; }, { on: ui.mode === 'attack', dis: !armed });
        slot(1, 'MOVE', () => { ui.mode = 'move'; }, { on: ui.mode === 'move' });
        if (u.d.selfDestruct) slot(2, 'DESTRUCT', () => { for (const v of sel) this.cmdSelfDestruct(v); }, { warn: true });
        else if (u.d.capture) slot(2, 'CAPTURE', () => { ui.mode = 'capture'; }, { on: ui.mode === 'capture' });
        else slot(2, 'RETREAT', () => { for (const v of sel) this.cmdReturn(v); });
        slot(3, 'GUARD', () => { for (const v of sel) this.cmdGuard(v); });
      }
      return out;
    }
    if (b) {
      slot(0, b.repairing ? 'REPAIRING' : 'REPAIR', () => this.repairBuilding(this.player, b), { on: b.repairing, dis: b.hp >= b.max && !b.repairing });
      const armed = ui.sellArm && ui.sellArm.b === b && this.frame - ui.sellArm.t < 150;
      slot(1, armed ? 'SURE?' : 'SELL', () => {
        if (armed) { this.sell(this.player, b); ui.selB = null; ui.sellArm = null; } else ui.sellArm = { b, t: this.frame };
      }, { warn: armed });
      if (b.d.upgrades) {
        const up = this.nextUpgrade(b), q = this.P.prod[b.d.fac], busy = q && q.queue[0] === '_upg';
        slot(2, busy ? 'UPG ' + Math.floor(this.progress(this.player, b.d.fac) * 100) + '%' : up ? 'UPG $' + up.cost : 'NO UPGRADE', () => {
          if (busy) this.cancelBuild(this.player, b.d.fac, '_upg'); else if (!this.upgrade(this.player, b)) this.say('CAN\'T UPGRADE NOW');
        }, { dis: !up && !busy, on: busy });
      }
      if (b.d.fac && b.key !== 'yard') slot(3, 'RALLY', () => { ui.mode = 'rally'; }, { on: ui.mode === 'rally' });
      if (b.d.palace) {
        const k = this.palaceKind(this.player), ready = this.palaceReady(this.player);
        slot(2, ready ? 'FIRE!' : Math.floor(this.palaceCharge(this.player) * 100) + '%', () => {
          if (!ready) return;
          if (RTS_PALACE[k].target) ui.mode = 'palace'; else this.palacePower(this.player, null);
        }, { dis: !ready, on: ui.mode === 'palace', warn: ready });
      }
    }
    return out;
  },

  // ================================================================ every frame: keys, pads, scrolling, hover
  uiUpdate() {
    const ui = this.ui;
    this.uiLayout();
    const L = this.L;
    if (Game.paused) return;
    // keyboard
    const down = c => Input.down.has(c), just = c => Input.just.has(c);
    const anyD = l => l.some(down), anyJ = l => l.some(just);
    const pads = Input.pads || [];
    const pr = n => pads.some(p => p.raw && p.raw[n]);
    const prJ = n => pads.some((p, i) => p.raw && p.raw[n] && !(ui.padPrev && ui.padPrev[i] && ui.padPrev[i][n]));
    const shift = down('ShiftLeft') || down('ShiftRight'), ctrl = down('ControlLeft') || down('ControlRight') || down('MetaLeft') || down('MetaRight');
    const selOwn = this.orderable();
    // directions: arrows always; WASD unless they're hotkeys right now
    const hotA = !ui.kbd && selOwn.length && !ctrl, wasd = !ctrl;
    let dx = 0, dy = 0;
    if (anyD(RTS_KEYS_DIR.left) || (wasd && !hotA && down('KeyA')) || down('TLeft')) dx--;
    if (anyD(RTS_KEYS_DIR.right) || (wasd && down('KeyD')) || down('TRight')) dx++;
    if (anyD(RTS_KEYS_DIR.up) || (wasd && down('KeyW')) || down('TUp')) dy--;
    if (anyD(RTS_KEYS_DIR.down) || (wasd && !hotA && down('KeyS')) || down('TDown')) dy++;
    let pdx = 0, pdy = 0;
    for (const p of pads) { if (p[3]) pdx = -1; if (p[1]) pdx = 1; if (p[0]) pdy = -1; if (p[2]) pdy = 1; }
    if (pdx || pdy || pads.some(p => p.raw && (p.raw[0] || p.raw[1]))) ui.kbd = true;
    const fireJ = anyJ(RTS_FIRE_KEYS) || prJ(0), fireD = anyD(RTS_FIRE_KEYS) || pr(0);
    if (fireJ && !ui.kbd) { ui.kbd = true; ui.cx = ui.mIn ? ui.mx : L.mx + L.mw / 2; ui.cy = ui.mIn ? ui.my : L.my + L.mh / 2; }
    const cancelD = down('KeyB') || down('KeyC') || pr(1) || (ui.kbd && down('ShiftLeft'));
    const cancelJ = just('KeyB') || just('KeyC') || prJ(1) || (ui.kbd && just('ShiftLeft'));
    if (ui.kbd) {
      this.cursorStep({ mx: dx || pdx, my: dy || pdy, fireJ, fireD, cancelJ, cancelD });
      if (just('Tab') || prJ(2)) {
        ui.side = !ui.side;
        if (ui.side) { ui.mapCur = { x: ui.cx, y: ui.cy }; ui.cx = L.grid.x + 20; ui.cy = L.grid.y + 12; }
        else { const m = ui.mapCur || { x: L.mx + L.mw / 2, y: L.my + L.mh / 2 }; ui.cx = m.x; ui.cy = m.y; }
      }
    } else {
      // mouse: the arrow keys and WASD scroll, so does the screen's edge
      this.cam.x += dx * 6; this.cam.y += dy * 6;
      // the screen's edge (or past it, where the canvas doesn't fill the window) scrolls
      if (ui.inWin && !ui.drag && ui.rx !== undefined) {
        const e = 1.5;
        if (ui.rx < e) this.cam.x -= 6; else if (ui.rx > L.W - e) this.cam.x += 6;
        if (ui.ry < e) this.cam.y -= 6; else if (ui.ry > L.H - e) this.cam.y += 6;
      }
      if (cancelJ) this.cancel();
    }
    // the right stick pans
    for (const p of pads) {
      const ax = (p.gp && p.gp.axes[2]) || 0, ay = (p.gp && p.gp.axes[3]) || 0;
      if (Math.abs(ax) > 0.3) this.cam.x += ax * 8;
      if (Math.abs(ay) > 0.3) this.cam.y += ay * 8;
    }
    ui.fireWas = fireD; ui.cancelWas = cancelD;
    ui.padPrev = pads.map(p => p.raw ? p.raw.slice() : []);
    this.coUpdate();
    if (prJ(3)) this.goHome();
    if (prJ(4) || prJ(5)) { const tabs = this.sideTabs(); if (tabs.length) { const k = tabs.indexOf(ui.tab); ui.tab = tabs[(k + (prJ(5) ? 1 : tabs.length - 1)) % tabs.length]; ui.scroll = 0; } }
    // hotkeys
    if (just('KeyH')) this.goHome();
    if (just('KeyG')) for (const u of selOwn) this.cmdGuard(u);
    if (hotA && just('KeyS')) for (const u of selOwn) this.cmdStop(u);
    if (hotA && just('KeyA') && selOwn.some(u => u.d.wpn)) ui.mode = 'amove';
    if (just('KeyR') && ui.selB && this.mine(ui.selB)) this.repairBuilding(this.player, ui.selB);
    if ((just('Delete') || just('NumpadDecimal')) && ui.selB && this.mine(ui.selB)) {
      const b = ui.selB;
      if (ui.sellArm && ui.sellArm.b === b && this.frame - ui.sellArm.t < 150) { this.sell(this.player, b); ui.selB = null; ui.sellArm = null; }
      else { ui.sellArm = { b, t: this.frame }; this.say('PRESS DEL AGAIN TO SELL THE ' + b.d.name); }
    }
    for (let n = 1; n <= 9; n++) {
      if (!just('Digit' + n)) continue;
      const ld = RTS_KEYMODS.digit;
      if (ctrl || shift || (ld && ld.code === 'Digit' + n && ld.mod)) { ui.groups[n] = this.selUnits().map(u => u.id); this.say('GROUP ' + n + ' SET'); continue; }
      const ids = ui.groups[n] || [];
      const units = ids.map(id => this.byId.get(id)).filter(u => u && u.isU && !u.dead && u.h === this.player);
      if (!units.length) continue;
      ui.sel = units; ui.selB = null;
      if (ui.lastGroup.n === n && this.frame - ui.lastGroup.t < 25) { const u = units[0]; this.centerOn(u.x, u.y); }
      ui.lastGroup = { n, t: this.frame };
    }
    this.clampCam();
    // touch: a finger held still on the map starts a selection box
    if (ui.touches.size === 1 && !ui.twoFinger && !ui.mode) {
      const t = ui.touches.values().next().value;
      if (!t.side && !t.moved && !t.box && this.inMapView(t.x0, t.y0) && performance.now() - t.t0 > 400) {
        const w = this.toWorld(t.x0, t.y0);
        t.box = true; ui.drag = { x0: t.x0, y0: t.y0, wx0: w.x, wy0: w.y, active: true, touch: true };
        ui.mx = t.x; ui.my = t.y;
        if (typeof Sound !== 'undefined') Sound.play('tick');
        try { if (navigator.vibrate) navigator.vibrate(12); } catch (er) { /* no buzz */ }
      }
    }
    // the box drag
    if (ui.drag && !ui.drag.active && Math.hypot(ui.mx - ui.drag.x0, ui.my - ui.drag.y0) > 4 && !ui.mode) ui.drag.active = true;
    // the selection keeps only what's still yours and alive
    if (ui.sel.length) ui.sel = ui.sel.filter(u => u && u.isU && !u.dead && (u.h === this.player || ui.sel.length === 1) && !u.carried);
    if (ui.selB && ui.selB.dead) ui.selB = null;
    if (ui.mode === 'place' && !this.P.prod.yard.ready) { ui.mode = null; ui.placeKey = null; }
    // what's under the pointer
    ui.overMap = ui.mIn && this.inMapView(ui.mx, ui.my);
    if (ui.overMap) { const w = this.toWorld(ui.mx, ui.my); ui.hover = this.pick(w.x, w.y, true); }
    else ui.hover = null;
    ui.cursor = this.cursorKind();
    ui.tip = ui.mIn && ui.mx >= L.sx ? this.sideTip(ui.mx, ui.my) : '';
    // the credits counter rolls toward the real figure
    const c = Math.floor(this.P.credits), dc = c - ui.cred;
    if (Math.abs(dc) < 1) ui.cred = c;
    else ui.cred += Math.sign(dc) * Math.min(Math.abs(dc), Math.max(1, Math.abs(dc) * 0.06));
  },
  // the keyboard / pad cursor of this.ui: the d-pad moves it (faster the longer it's held); B held pans instead; at
  // the edge it scrolls; FIRE clicks (held: drags a box), B cancels
  cursorStep(inp) {
    const ui = this.ui, L = this.L, mx = inp.mx, my = inp.my;
    if (mx || my) ui.holdT++; else ui.holdT = 0;
    const sp = Math.min(6, 1.2 + ui.holdT * 0.12);
    if (inp.cancelD && (mx || my)) { this.cam.x += mx * 8; this.cam.y += my * 8; ui.panned = true; }
    else {
      ui.cx = Math.max(0, Math.min(L.W - 1, ui.cx + mx * sp)); ui.cy = Math.max(0, Math.min(L.H - 1, ui.cy + my * sp));
      if (ui.cx < L.mw) {
        if (ui.cx < L.mx + 6 && mx < 0) this.cam.x -= 5;
        if (ui.cx > L.mx + L.mw - 6 && mx > 0) this.cam.x += 5;
        if (ui.cy < L.my + 6 && my < 0) this.cam.y -= 5;
        if (ui.cy > L.my + L.mh - 6 && my > 0) this.cam.y += 5;
      }
    }
    ui.mx = ui.cx; ui.my = ui.cy; ui.mIn = true;
    if (inp.fireJ) this.pressAt(ui.cx, ui.cy, 0);
    if (!inp.fireD && (ui.fireWas || inp.fireJ)) this.releaseAt(ui.cx, ui.cy, 0, false);
    if (inp.cancelJ) ui.panned = false;
    if (!inp.cancelD && (ui.cancelWas || inp.cancelJ) && !ui.panned) {
      // B on a build icon takes one off its queue (the right button's job), anywhere else cancels / deselects
      const G = L.grid;
      if (ui.cx >= G.x && ui.cx < G.x + G.cols * G.cw && ui.cy >= G.y && ui.cy < G.y + G.rows * G.ch) this.sideClick(ui.cx, ui.cy, 2);
      else this.cancel();
    }
  },
  // online: each guest moves a cursor of their own over the host's screen (the d-pad, FIRE clicks, B cancels) and
  // commands the same House with its own selection
  coUpdate() {
    const keys = typeof Net !== 'undefined' && Net.role === 'host' ? Object.keys(Input.remote || {}) : [];
    for (const k in this.coUis) if (!keys.includes(k)) delete this.coUis[k];
    if (!keys.length) return;
    const host = this.ui;
    for (const k of keys) {
      let co = this.coUis[k];
      if (!co) { co = this.coUis[k] = this.newUi(host.clicks); co.kbd = true; co.cx = this.L.mx + this.L.mw / 2 + 12 * k; co.cy = this.L.my + this.L.mh / 2; co.who = +k; co.tab = host.tab; }
      const pl = Input.player(+k), d = pl.dir;
      this.ui = co; this.coActive = true;
      try {
        this.cursorStep({ mx: d === 1 ? 1 : d === 3 ? -1 : 0, my: d === 0 ? -1 : d === 2 ? 1 : 0, fireJ: pl.firePressed, fireD: pl.fire, cancelJ: pl.altPressed, cancelD: pl.alt });
        co.fireWas = pl.fire; co.cancelWas = pl.alt;
        if (co.drag && !co.drag.active && Math.hypot(co.mx - co.drag.x0, co.my - co.drag.y0) > 4 && !co.mode) co.drag.active = true;
        co.sel = co.sel.filter(u => u && u.isU && !u.dead && u.h === this.player && !u.carried);
        if (co.selB && co.selB.dead) co.selB = null;
        if (co.mode === 'place' && !this.P.prod.yard.ready) { co.mode = null; co.placeKey = null; }
        co.overMap = this.inMapView(co.mx, co.my);
        if (co.overMap) { const w = this.toWorld(co.mx, co.my); co.hover = this.pick(w.x, w.y, true); } else co.hover = null;
        co.cursor = this.cursorKind();
      } finally { this.ui = host; this.coActive = false; }
    }
  },
  coList() { return Object.values(this.coUis || {}); },
  goHome() {
    const yards = this.P.buildings.filter(b => b.key === 'yard');
    const list = yards.length ? yards : this.P.buildings.length ? this.P.buildings : this.P.units;
    if (!list.length) return;
    this.ui.homeK = ((this.ui.homeK | 0) + 1) % list.length;
    const o = list[this.ui.homeK];
    this.centerOn(o.isB ? o.cx : o.x, o.isB ? o.cy : o.y);
  },
  sideTip(x, y) {
    const L = this.L, G = L.grid, ui = this.ui;
    if (y >= G.y && y < G.y + G.rows * G.ch && x < G.x + G.cols * G.cw) {
      const c = Math.floor((x - G.x) / G.cw), r = Math.floor((y - G.y) / G.ch);
      const key = this.sideItems(ui.tab)[(r + ui.scroll) * G.cols + c];
      if (!key) return '';
      const d = rtsDefOf(key);
      const price = ui.tab === 'starport' ? this.P.port.price[key] : rtsPriceOf(this.player, key);
      return d.name + ' $' + price + (d.power < 0 ? ' PWR ' + (-d.power) : d.power > 0 ? ' +' + d.power + ' PWR' : '');
    }
    if (this.inRect(x, y, L.pwr)) return 'POWER ' + this.P.powerOut + ' MADE, ' + this.P.powerUse + ' USED';
    if (this.inRect(x, y, L.mm)) return this.hasRadar(this.P) ? 'RADAR: CLICK TO LOOK THERE' : 'NO RADAR: BUILD A RADAR OUTPOST';
    return '';
  },

  // ================================================================ drawing the whole screen
  render(ctx) {
    this.uiLayout();
    const L = this.L, ui = this.ui;
    this.renderMap(ctx);
    // the drag box
    if (ui.drag && ui.drag.active) {
      ctx.strokeStyle = '#FFF';
      const x = Math.min(ui.drag.x0, ui.mx), y = Math.min(ui.drag.y0, ui.my);
      ctx.strokeRect(Math.round(x) + 0.5, Math.round(y) + 0.5, Math.round(Math.abs(ui.mx - ui.drag.x0)), Math.round(Math.abs(ui.my - ui.drag.y0)));
      if (ui.drag.touch) { const c = rtsPicCursor('select', 0), hot = rtsHotOfCursor('select', c); ctx.drawImage(c, Math.round(ui.drag.x0) - hot[0], Math.round(ui.drag.y0) - hot[1]); }
    }
    this.renderTop(ctx);
    this.renderSide(ctx);
    if (this.done) this.renderBanner(ctx);
    else if (this.frame < 330 && (this.opts.title || this.opts.objectiveText)) this.renderIntro(ctx);
    // the guests' cursors (online), each with its number
    for (const co of this.coList()) {
      const kind = co.overMap ? co.cursor : 'normal';
      if (co.mode === 'place' && co.overMap) continue;
      const c = rtsPicCursor(kind, (this.frame >> 4) & 1), hot = rtsHotOfCursor(kind, c);
      const x = Math.round(co.mx) - hot[0], y = Math.round(co.my) - hot[1];
      ctx.drawImage(c, x, y);
      ctx.fillStyle = '#000'; ctx.fillRect(x + c.width - 2, y + c.height - 3, 6, 7);
      rtsTiny(ctx, String(co.who + 1), x + c.width - 1, y + c.height - 2, RTS_CO_COL[co.who % 4]);
    }
    // the cursor
    if (ui.mIn || ui.kbd) {
      const kind = ui.overMap ? ui.cursor : 'normal';
      if (kind !== 'place' || !ui.overMap) {
        const c = rtsPicCursor(kind, (this.frame >> 4) & 1);
        const hot = rtsHotOfCursor(kind, c);
        ctx.drawImage(c, Math.round(ui.mx) - hot[0], Math.round(ui.my) - hot[1]);
      }
    }
  },
  renderTop(ctx) {
    const L = this.L, ui = this.ui;
    ctx.fillStyle = '#1C1610'; ctx.fillRect(0, 0, L.W, L.top);
    ctx.fillStyle = '#4C3C2C'; ctx.fillRect(0, L.top - 1, L.W, 1);
    ctx.fillStyle = '#3C3024'; ctx.fillRect(1, 1, 26, 7);
    rtsTiny(ctx, 'MENU', 6, 2, '#E8D8B0');
    // the latest message (or the sidebar's tip, or what's being placed)
    let text = '', col = '#F0E0B0';
    if (ui.tip) { text = ui.tip; col = '#B8D8F8'; }
    else if (ui.mode === 'place') { text = 'PLACE THE ' + rtsNameOf(ui.placeKey) + ' NEXT TO YOUR BASE'; col = '#B8F8B8'; }
    else if (ui.mode) { text = { attack: 'ATTACK: PICK A TARGET', amove: 'ATTACK-MOVE: PICK A PLACE', move: 'MOVE: PICK A PLACE', capture: 'CAPTURE: PICK A DAMAGED ENEMY BUILDING',
      sabotage: 'SABOTAGE: PICK AN ENEMY BUILDING', harvest: 'HARVEST: PICK GLIMMER', rally: 'RALLY POINT: PICK A PLACE', palace: 'PALACE: PICK A TARGET' }[ui.mode] || ''; col = '#F8E8A0'; }
    else {
      const m = this.msgs[this.msgs.length - 1];
      if (m && this.frame - m.t < 300) text = m.text;
      else if (ui.tab === 'starport' && this.portEta()) { text = this.portEta(); col = '#C8F8C8'; }
    }
    const maxc = Math.floor((L.sx - 34) / 4);
    if (text) rtsTiny(ctx, text.slice(0, maxc), 32, 2, col);
    // the credits, rolling digits
    this.renderCredits(ctx, L.sx + 18, 1);
  },
  renderCredits(ctx, x, y) {
    const v = Math.max(0, this.ui.cred), n = 6;
    ctx.fillStyle = '#000'; ctx.fillRect(x - 2, y, n * 8 + 14, 9);
    Font.draw(ctx, '$', x, y + 1, '#F8B838');
    ctx.save(); ctx.beginPath(); ctx.rect(x + 9, y, n * 8 + 2, 9); ctx.clip();
    for (let k = 0; k < n; k++) {
      const p = Math.pow(10, n - 1 - k), dv = v / p;
      const digit = Math.floor(dv) % 10;
      // the digit rolls only as the ones below it pass 9 -> 0
      const below = v - Math.floor(v / p) * p, roll = p === 1 ? dv - Math.floor(dv) : Math.max(0, (below - (p - 1)) );
      const off = Math.round(Math.min(1, roll) * 8);
      const dx = x + 10 + k * 8;
      Font.draw(ctx, String(digit), dx, y + 1 - off, '#F8D878');
      if (off) Font.draw(ctx, String((digit + 1) % 10), dx, y + 9 - off, '#F8D878');
    }
    ctx.restore();
  },
  renderSide(ctx) {
    const L = this.L, ui = this.ui, P = this.P;
    ctx.fillStyle = '#2A2016'; ctx.fillRect(L.sx, L.top, L.side, L.H - L.top);
    ctx.fillStyle = '#5C4A34'; ctx.fillRect(L.sx, L.top, 1, L.H - L.top);
    // the radar
    const mm = L.mm;
    ctx.fillStyle = '#000'; ctx.fillRect(mm.x - 1, mm.y - 1, mm.w + 2, mm.h + 2);
    if (this.hasRadar(P)) this.renderMinimap(ctx);
    else {
      if (!this.noiseC || this.frame % 4 === 0) {
        this.noiseC = this.noiseC || makeCanvas(40, 40);
        const g = this.noiseC.getContext('2d'), id = g.createImageData(40, 40);
        for (let i = 0; i < 1600; i++) { const v = (Math.random() * 60) | 0; id.data[i * 4] = v + 20; id.data[i * 4 + 1] = v + 14; id.data[i * 4 + 2] = v; id.data[i * 4 + 3] = 255; }
        g.putImageData(id, 0, 0);
      }
      ctx.drawImage(this.noiseC, mm.x, mm.y, mm.w, mm.h);
      const H = RTS_HOUSES[this.player];
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(mm.x + 4, mm.y + 30, mm.w - 8, 20);
      rtsTinyCenter(ctx, H ? H.name : '', mm.x + mm.w / 2, mm.y + 33, H ? RTS_HOUSE_PAL[this.player][0] : '#FFF');
      rtsTinyCenter(ctx, (P.count.radar ? 'LOW POWER' : 'NO RADAR'), mm.x + mm.w / 2, mm.y + 41, '#C8B898');
    }
    // the power bar: green what's made, the line what's used
    const pw = L.pwr, top = Math.max(100, P.powerOut, P.powerUse) * 1.1;
    ctx.fillStyle = '#000'; ctx.fillRect(pw.x, pw.y, pw.w, pw.h);
    const low = this.lowPower(P);
    ctx.fillStyle = low ? ((this.frame >> 4) & 1 ? '#F83818' : '#A02010') : '#38B838';
    ctx.fillRect(pw.x + 1, pw.y + 1, Math.round((pw.w - 2) * P.powerOut / top), pw.h - 2);
    ctx.fillStyle = '#F8F8F8'; ctx.fillRect(pw.x + 1 + Math.round((pw.w - 2) * P.powerUse / top), pw.y, 1, pw.h);
    // the label: dark on the bar, light where the bar doesn't reach it
    rtsTiny(ctx, 'PWR', pw.x + 2, pw.y + 1, (pw.w - 2) * P.powerOut / top > 13 ? '#000' : '#C8B898');
    // the tabs
    const tabs = this.sideTabs(), T = L.tabs;
    if (tabs.length && !tabs.includes(ui.tab)) ui.tab = tabs[0];
    if (tabs.length) {
      const tw = T.w / tabs.length;
      tabs.forEach((k, i) => {
        const x = Math.round(T.x + i * tw), on = k === ui.tab, q = P.prod[k];
        ctx.fillStyle = on ? '#6C5638' : '#3A2E20'; ctx.fillRect(x + 1, T.y, Math.round(tw) - 1, T.h);
        const ready = q && q.ready && k === 'yard';
        rtsTinyCenter(ctx, tabs.length > 5 ? RTS_FAC_TAB2[k] : RTS_FAC_TAB[k], x + tw / 2, T.y + 2, ready && (this.frame >> 4) & 1 ? '#78F878' : on ? '#F8E8C0' : '#A89878');
      });
    }
    this.renderGrid(ctx, tabs);
    this.renderPanel(ctx);
  },
  renderMinimap(ctx) {
    const m = this.mmRect(), P = this.P;
    ctx.drawImage(this.mm, m.x, m.y, m.w, m.h);
    const s = m.s, ds = Math.max(1, Math.round(s));
    for (const b of this.buildings) {
      if (!this.bldVisible(b)) continue;
      ctx.fillStyle = b.h === this.player ? '#F8F8F8' : RTS_HOUSE_PAL[b.h] ? RTS_HOUSE_PAL[b.h][0] : '#FFF';
      ctx.fillRect(m.x + b.x * s, m.y + b.y * s, Math.max(1, b.w * s), Math.max(1, b.hh * s));
    }
    for (const u of this.units) {
      if (u.dead || u.carried || u.key === 'frigate' || this.hiddenFromPlayer(u)) continue;
      ctx.fillStyle = RTS_HOUSE_PAL[u.h] ? RTS_HOUSE_PAL[u.h][u.h === this.player ? 0 : 1] : '#FFF';
      ctx.fillRect(Math.floor(m.x + u.x / 16 * s), Math.floor(m.y + u.y / 16 * s), ds, ds);
    }
    for (const w of this.worms) {
      if ((w.phase === 'away') || !this.playerSees((w.x / 16) | 0, (w.y / 16) | 0)) continue;
      ctx.fillStyle = (this.frame >> 3) & 1 ? '#F8F8F8' : '#804020';
      ctx.fillRect(Math.floor(m.x + w.x / 16 * s), Math.floor(m.y + w.y / 16 * s), ds + 1, ds + 1);
    }
    const L = this.L;
    ctx.strokeStyle = '#F8F8F8';
    ctx.strokeRect(Math.round(m.x + this.cam.x / 16 * s) + 0.5, Math.round(m.y + this.cam.y / 16 * s) + 0.5, Math.round(L.mw / 16 * s), Math.round(L.mh / 16 * s));
    void P;
  },
  renderGrid(ctx, tabs) {
    const L = this.L, G = L.grid, ui = this.ui, P = this.P, h = this.player;
    if (!tabs.length) {
      const u = P.units.find(q => q.d.deploys);
      rtsTinyCenter(ctx, u ? 'DEPLOY THE MCV' : 'NO FACTORIES', L.sx + L.side / 2, G.y + 30, '#C8B898');
      rtsTinyCenter(ctx, u ? 'ON CLEAR ROCK' : '', L.sx + L.side / 2, G.y + 38, '#C8B898');
      return;
    }
    const kind = ui.tab, items = this.sideItems(kind);
    const rows = Math.ceil(items.length / G.cols);
    ui.scroll = Math.max(0, Math.min(Math.max(0, rows - G.rows), ui.scroll));
    const q = P.prod[kind];
    for (let r = 0; r < G.rows; r++) for (let c = 0; c < G.cols; c++) {
      const k = (r + ui.scroll) * G.cols + c, key = items[k];
      const x = G.x + c * G.cw, y = G.y + r * G.ch;
      ctx.fillStyle = '#18120C'; ctx.fillRect(x + 1, y + 1, G.cw - 2, G.ch - 2);
      if (!key) continue;
      const icon = rtsIconOf(key, h);
      ctx.drawImage(icon, x + 4, y + 2, 32, 24);
      if (kind === 'starport') {
        const stock = P.port.stock[key] | 0, ordered = P.port.order.filter(o => o.key === key).length;
        ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillRect(x + 4, y + 2, 32, 6);
        rtsTiny(ctx, '$' + P.port.price[key], x + 5, y + 2, P.credits >= P.port.price[key] ? '#F8D878' : '#C86848');
        rtsTinyRight(ctx, String(stock), x + 36, y + 2, stock ? '#C8F8C8' : '#F86848');
        if (ordered) { ctx.fillStyle = '#285828'; ctx.fillRect(x + 26, y + 18, 10, 7); rtsTinyCenter(ctx, 'X' + ordered, x + 31, y + 19, '#C8F8C8'); }
        if (!stock) { ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(x + 4, y + 8, 32, 18); }
        continue;
      }
      const n = q.queue.filter(z => z === key).length;
      if (q.queue[0] === key) {
        if (q.ready) {
          ctx.fillStyle = 'rgba(0,40,0,0.55)'; ctx.fillRect(x + 4, y + 2, 32, 24);
          if ((this.frame >> 4) & 1 || kind !== 'yard') rtsTinyCenter(ctx, kind === 'yard' ? 'PLACE' : 'WAIT', x + 20, y + 10, '#78F878');
        } else {
          const p = this.progress(h, kind);
          ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(x + 4, y + 2, 32, Math.round(24 * (1 - p)));
          rtsTinyCenter(ctx, Math.floor(p * 100) + '%', x + 20, y + 10, q.broke ? '#F86848' : '#F8F8F8');
        }
      }
      if (n > 1 || (n === 1 && q.queue[0] !== key)) { ctx.fillStyle = '#5C2A10'; ctx.fillRect(x + 27, y + 18, 9, 7); rtsTinyCenter(ctx, String(n), x + 31, y + 19, '#F8E8C0'); }
      if (P.credits < rtsPriceOf(h, key) && q.queue[0] !== key) { ctx.fillStyle = 'rgba(40,0,0,0.35)'; ctx.fillRect(x + 4, y + 2, 32, 24); }
    }
    // scroll arrows
    if (rows > G.rows) {
      const ax = G.x + G.cols * G.cw + 1;
      ctx.fillStyle = '#3A2E20'; ctx.fillRect(ax, G.y + 1, 5, G.rows * G.ch - 2);
      rtsTiny(ctx, '^', ax + 1, G.y + 3, ui.scroll > 0 ? '#F8E8C0' : '#5C4C3C');
      rtsTiny(ctx, 'V', ax + 1, G.y + G.rows * G.ch - 8, ui.scroll < rows - G.rows ? '#F8E8C0' : '#5C4C3C');
    }
  },
  // the starport's frigate: on its way, or coming once ordered ('' when nothing is ordered)
  portEta() {
    const P = this.P.port;
    if (!P || (!P.order.length && !P.frigate)) return '';
    return P.frigate ? 'FRIGATE INBOUND' : 'FRIGATE IN ' + Math.max(0, Math.ceil((P.eta - this.frame) / 60)) + 'S';
  },
  renderPanel(ctx) {
    const L = this.L, P = L.panel, ui = this.ui, Hs = this.P;
    ctx.fillStyle = '#3A2E20'; ctx.fillRect(P.x + 1, P.y, P.w - 1, P.h);
    ctx.fillStyle = '#5C4A34'; ctx.fillRect(P.x, P.y, P.w, 1);
    const sel = this.selUnits(), other = ui.sel.length === 1 && ui.sel[0].h !== this.player ? ui.sel[0] : null;
    const bar = (x, y, w, k) => { ctx.fillStyle = '#000'; ctx.fillRect(x, y, w, 3); ctx.fillStyle = k > 0.5 ? '#38D838' : k > 0.25 ? '#F8D038' : '#F83818'; ctx.fillRect(x + 1, y + 1, Math.max(1, Math.round((w - 2) * k)), 1); };
    const subject = sel[0] || other || ui.selB;
    if (!subject) {
      const o = this.objectives;
      if (o.harvest) rtsTiny(ctx, 'GOAL ' + Math.floor(Hs.stats.harvested) + '/' + o.harvest, P.x + 4, P.y + 3, '#F8B838');
      else if (o.survive) { const r = Math.max(0, Math.ceil((o.survive - this.frame) / 60)); rtsTiny(ctx, 'HOLD ' + Math.floor(r / 60) + ':' + String(r % 60).padStart(2, '0'), P.x + 4, P.y + 3, '#F8B838'); }
      else rtsTiny(ctx, (RTS_HOUSES[this.player] || {}).name || '', P.x + 4, P.y + 3, RTS_HOUSE_PAL[this.player][0]);
      rtsTiny(ctx, 'STORAGE ' + Math.floor(Hs.credits) + '/' + Hs.storage, P.x + 4, P.y + 11, Hs.credits > Hs.storage ? '#F8B838' : '#C8B898');
      rtsTiny(ctx, 'POWER ' + Hs.powerOut + '/' + Hs.powerUse, P.x + 4, P.y + 18, this.lowPower(Hs) ? '#F86848' : '#C8B898');
      rtsTiny(ctx, 'UNITS ' + Hs.units.length + ' BLDGS ' + Hs.buildings.length, P.x + 4, P.y + 25, '#A89878');
      const t = Math.floor(this.frame / 60);
      rtsTiny(ctx, 'TIME ' + Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0'), P.x + 4, P.y + 33, '#A89878');
      return;
    }
    const icon = rtsIconOf(subject.key, subject.h);
    ctx.drawImage(icon, P.x + 2, P.y + 2);
    const name = subject.d.name;
    rtsTiny(ctx, name.length > 12 ? name.split(' ')[0] : name, P.x + 36, P.y + 3, subject.h === this.player ? '#F8E8C0' : '#F89878');
    bar(P.x + 36, P.y + 10, 49, Math.max(0, subject.hp / subject.max));
    let info = '', info2 = '';
    if (sel.length > 1) info = 'X' + sel.length + ' UNITS';
    else if (subject.isU) {
      if (subject.d.harvester) info = 'LOAD ' + Math.round(subject.cargo / (subject.d.cap || 700) * 100) + '%';
      else if (subject.d.lifter) info = subject.job ? 'CARRYING' : 'AUTOMATIC';
      else info = (RTS_HOUSES[subject.h] || {}).name || '';
      info2 = { idle: 'IDLE', guard: 'GUARD', move: 'MOVING', attack: 'ATTACKING', amove: 'ATTACK-MOVE', hunt: 'HUNTING', harvest: 'HARVESTING', retreat: 'RETREATING',
        repair: 'TO REPAIR', capture: 'CAPTURING', sabotage: 'SABOTAGE', deploy: 'DEPLOYING', boom: 'SELF-DESTRUCT' }[subject.order.k] || '';
      if (subject.conv) info2 = 'CONVERTED';
    } else {
      const b = subject;
      if (b.h !== this.player) info = (RTS_HOUSES[b.h] || {}).name || '';
      else if (b.d.power > 0) info = 'POWER +' + Math.round(b.d.power * b.hp / b.max);
      else if (b.d.storage) info = 'STORES ' + b.d.storage;
      else if (b.d.fac && b.d.fac !== 'starport') {
        const q = Hs.prod[b.d.fac], first = q.queue.length ? rtsNameOf(q.queue[0]).split(' ')[0] : '';
        info = !q.queue.length ? 'LEVEL ' + (this.upgLevel(Hs, b.d.fac) + 1) : q.ready ? first : first.slice(0, 8) + ' ' + Math.floor(this.progress(this.player, b.d.fac) * 100) + '%';
        if (q.ready) info2 = b.d.fac === 'yard' ? 'READY: PLACE' : 'NO ROOM: WAIT';
      }
      else if (b.d.palace) { const k = this.palaceKind(this.player), n = RTS_PALACE[k] ? RTS_PALACE[k].name : ''; info = n.length <= 13 ? n : k.toUpperCase(); }
      else if (b.key === 'starport' && b.h === this.player) info = this.portEta().replace('FRIGATE ', '') || 'NO ORDERS';
      if (b.h === this.player && b.d.power < 0 && !info2) info2 = 'USES ' + (-b.d.power) + ' PWR';
      if (b.bare && b.h === this.player && !b.d.wall && !info2.startsWith('READY') && !info2.startsWith('NO ROOM')) info2 = 'ON BARE ROCK';
    }
    if (info) rtsTiny(ctx, info.slice(0, 13), P.x + 36, P.y + 15, '#C8B898');
    if (info2) rtsTiny(ctx, info2.slice(0, 13), P.x + 36, P.y + 21, info2.startsWith('READY') && (this.frame >> 4) & 1 ? '#78F878' : '#A89878');
    for (const b of this.panelButtons()) {
      const r = b.r;
      ctx.fillStyle = b.dis ? '#2A2218' : b.on ? '#7C6430' : b.warn ? '#7C2818' : '#5A4830';
      ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.fillStyle = b.dis ? '#2A2218' : '#8C7450'; ctx.fillRect(r.x, r.y, r.w, 1);
      rtsTinyCenter(ctx, b.label, r.x + r.w / 2, r.y + 1, b.dis ? '#5C4C3C' : '#F8E8C0');
    }
  },
  // the mission's name and objective over the map for its first seconds
  renderIntro(ctx) {
    const L = this.L, a = Math.min(1, (330 - this.frame) / 40);
    const lines = [];
    const cols = Math.floor((L.mw - 24) / 8);
    if (this.opts.title) for (const ln of this.wrapText(String(this.opts.title).toUpperCase(), cols)) lines.push([ln, '#F8C838']);
    if (this.opts.objectiveText) for (const ln of this.wrapText(String(this.opts.objectiveText).toUpperCase(), cols)) lines.push([ln, '#F0E0B0']);
    const h = lines.length * 10 + 10, y = L.my + 18;
    ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillRect(L.mx + 8, y - 5, L.mw - 16, h);
    lines.forEach(([t, c], k) => Font.drawCenter(ctx, t, L.mx + L.mw / 2, y + k * 10, c));
    ctx.globalAlpha = 1;
  },
  wrapText(t, n) {
    const out = [];
    let line = '';
    for (const w of t.split(' ')) {
      if (line && (line + ' ' + w).length > n) { out.push(line); line = w; } else line = line ? line + ' ' + w : w;
    }
    if (line) out.push(line);
    return out;
  },
  renderBanner(ctx) {
    const L = this.L, win = this.resultData && this.resultData.win;
    const text = win ? 'MISSION ACCOMPLISHED' : 'MISSION FAILED';
    let s = 3;
    while (s > 1 && Font.bigWidth(text, s) > L.mw - 16) s--;
    const w = Font.bigWidth(text, s), x = L.mx + ((L.mw - w) >> 1), y = L.my + (L.mh >> 1) - 20;
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(L.mx, y - 8, L.mw, 7 * s + 30);
    Font.big(ctx, text, x, y, s, win ? '#F8C838' : '#D82800');
    if (this.endT > 60) Font.drawCenter(ctx, 'CLICK OR PRESS ENTER', L.mx + L.mw / 2, y + 7 * s + 8, '#ADADAD');
  },
});

// ================================================================== the pointer, once for the page
function rtsInstallInput() {
  if (rtsInstallInput.done) return;
  rtsInstallInput.done = true;
  const cv = document.getElementById('screen');
  if (!cv) return;
  const pos = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * cv.width / r.width, (e.clientY - r.top) * cv.height / r.height]; };
  const live = () => Game.state === 'play' && Game.stage && Game.stage.rts && !Game.paused;
  const send = (kind, e) => {
    const st = Game.stage;
    if (st && st.done && kind === 'down') { st.skipEnd = true; return; }
    const [x, y] = pos(e);
    st.ptr(kind, x, y, e);
  };
  cv.addEventListener('pointerdown', e => { if (!live()) return; e.preventDefault(); try { cv.setPointerCapture(e.pointerId); } catch (er) { /* fine */ } send('down', e); });
  window.addEventListener('pointermove', e => { if (live()) send('move', e); });
  window.addEventListener('pointerup', e => { if (live()) send('up', e); });
  window.addEventListener('pointercancel', e => { if (live()) send('cancel', e); });
  cv.addEventListener('pointerleave', e => { if (live() && e.pointerType === 'mouse' && Game.stage.ui) Game.stage.ui.mIn = false; });
  // the pointer leaving the window stops the edge scrolling
  document.addEventListener('mouseout', e => { if (!e.relatedTarget && Game.stage && Game.stage.ui) Game.stage.ui.inWin = false; });
  window.addEventListener('blur', () => { if (Game.stage && Game.stage.ui) Game.stage.ui.inWin = false; });
  cv.addEventListener('contextmenu', e => { if (Game.mode === 'rts') e.preventDefault(); });
  cv.addEventListener('wheel', e => { if (!live()) return; e.preventDefault(); send('wheel', e); }, { passive: false });
  // a double click selects all of a kind (not fullscreen, here)
  window.addEventListener('dblclick', e => { if (live() && e.target === cv) { e.stopPropagation(); send('dbl', e); } }, true);
  // Ctrl+1..9 makes a group (the browser would switch tabs)
  window.addEventListener('keydown', e => {
    RTS_KEYMODS.ctrl = e.ctrlKey || e.metaKey; RTS_KEYMODS.shift = e.shiftKey;
    if (/^Digit[1-9]$/.test(e.code)) RTS_KEYMODS.digit = { code: e.code, mod: e.ctrlKey || e.metaKey || e.shiftKey };
    if (Game.mode === 'rts' && Game.state === 'play' && (e.ctrlKey || e.metaKey) && /^Digit[1-9]$/.test(e.code)) e.preventDefault();
    if (Game.mode === 'rts' && Game.state === 'play' && e.code === 'Tab') e.preventDefault();
  }, true);
  window.addEventListener('keyup', e => { RTS_KEYMODS.ctrl = e.ctrlKey || e.metaKey; RTS_KEYMODS.shift = e.shiftKey; }, true);
}

// ================================================================== the skirmish setup screen
const RTS_SCREENS = { rtsSetup: ['rtsSetupUpdate', 'rtsSetupRender', 'rtsSetupPointer'], rtsResult: ['rtsResultUpdate', 'rtsResultRender', 'rtsResultPointer'] };

Object.assign(Game, {
  // SKIRMISH: you against 1-3 computer Houses on a fresh map
  rtsSkirmishSetup() {
    this.mode = 'rts';
    this.rtsSet = rtsSetupPrefs();
    this.rtsSetIdx = 0;
    this.applyLayout();
    this.setState('rtsSetup');
  },
  rtsSetupRows() {
    const s = this.rtsSet, rows = [];
    const houseName = h => (RTS_HOUSES[h] || {}).name || h;
    rows.push({ label: 'YOUR HOUSE', val: houseName(s.house), col: RTS_HOUSES[s.house].color, adj: d => { const i = RTS_PLAYABLE.indexOf(s.house); s.house = RTS_PLAYABLE[(i + d + 3) % 3]; this.rtsFixFoes(); },
      tip: RTS_HOUSES[s.house].motto });
    rows.push({ label: 'OPPONENTS', val: String(s.nfoes), adj: d => { s.nfoes = (s.nfoes - 1 + d + 3) % 3 + 1; this.rtsFixFoes(); } });
    for (let i = 0; i < s.nfoes; i++) {
      const f = s.foes[i];
      rows.push({ label: 'FOE ' + (i + 1), val: houseName(f.house), col: RTS_HOUSES[f.house].color, adj: d => this.rtsStepFoe(i, d) });
      rows.push({ label: '  SKILL', val: RTS_SKILLS[f.ai], adj: d => { f.ai = Math.max(0, Math.min(4, f.ai + d)); } });
    }
    if (s.nfoes > 1) rows.push({ label: 'FOES', val: s.ffa ? 'EACH ALONE' : 'ALLIED', adj: () => { s.ffa = !s.ffa; }, tip: s.ffa ? 'THE COMPUTER\'S HOUSES FIGHT EACH OTHER TOO' : 'THE COMPUTER\'S HOUSES STAND TOGETHER' });
    rows.push({ label: 'MAP SIZE', val: RTS_SIZES[s.size] + 'X' + RTS_SIZES[s.size], adj: d => { s.size = (s.size + d + RTS_SIZES.length) % RTS_SIZES.length; } });
    rows.push({ label: 'MAP STYLE', val: RTS_STYLES[s.style].toUpperCase(), adj: d => { s.style = (s.style + d + RTS_STYLES.length) % RTS_STYLES.length; } });
    rows.push({ label: 'CREDITS', val: String(RTS_CREDITS[s.credits]), adj: d => { s.credits = (s.credits + d + RTS_CREDITS.length) % RTS_CREDITS.length; } });
    rows.push({ label: 'TECH LEVEL', val: String(s.tech), adj: d => { s.tech = (s.tech - 1 + d + 9) % 9 + 1; }, tip: 'WHAT CAN BE BUILT: 1 THE BASICS, 9 EVERYTHING' });
    rows.push({ label: 'SANDWYRMS', val: s.worms ? String(s.worms) : 'OFF', adj: d => { s.worms = (s.worms + d + 4) % 4; } });
    rows.push({ label: 'FOG OF WAR', val: s.fog ? 'ON' : 'OFF', adj: () => { s.fog = !s.fog; }, tip: 'OFF: ONLY THE SHROUD, AS IN THE ORIGINAL' });
    rows.push({ label: 'ORDERS', val: s.clicks, adj: () => { s.clicks = s.clicks === 'CLASSIC' ? 'MODERN' : 'CLASSIC'; },
      tip: s.clicks === 'CLASSIC' ? 'LEFT CLICK SELECTS AND ORDERS' : 'LEFT SELECTS, RIGHT CLICK ORDERS' });
    rows.push({ label: 'GAME SPEED', val: s.speed === 2 ? 'FAST' : 'NORMAL', adj: () => { s.speed = s.speed === 2 ? 1 : 2; } });
    rows.push({ label: 'START', start: true, act: () => this.rtsStartSkirmish() });
    rows.push({ label: 'BACK', act: () => this.rtsSetupBack() });
    return rows;
  },
  rtsFixFoes() {
    const s = this.rtsSet, used = new Set([s.house]);
    for (let i = 0; i < 3; i++) {
      const f = s.foes[i];
      if (used.has(f.house)) f.house = RTS_FOES.find(h => !used.has(h));
      used.add(f.house);
    }
  },
  rtsStepFoe(i, d) {
    const s = this.rtsSet, f = s.foes[i];
    const taken = new Set([s.house].concat(s.foes.filter((g, k) => k !== i && k < s.nfoes).map(g => g.house)));
    let k = RTS_FOES.indexOf(f.house);
    for (let n = 0; n < 4; n++) { k = (k + d + 4) % 4; if (!taken.has(RTS_FOES[k])) { f.house = RTS_FOES[k]; break; } }
    this.rtsFixFoes();
  },
  rtsSetupBack() {
    STORE.set(RTS_SETUP_KEY, this.rtsSet);
    if (typeof this.rtsMenu === 'function' && !this.rtsMenu.core) this.rtsMenu(); else this.toTitle();
  },
  rtsSetupUpdate() {
    const m = Input.menu(), rows = this.rtsSetupRows(), n = rows.length;
    if (this.rtsSetIdx >= n) this.rtsSetIdx = n - 1;
    if (m.up) { this.rtsSetIdx = (this.rtsSetIdx + n - 1) % n; Sound.play('select'); }
    if (m.down) { this.rtsSetIdx = (this.rtsSetIdx + 1) % n; Sound.play('select'); }
    const row = rows[this.rtsSetIdx];
    if (row.adj && (m.left || m.right)) { row.adj(m.right ? 1 : -1); Sound.play('select'); }
    if (m.ok && this.t > 8) { if (row.act) row.act(); else if (row.adj) { row.adj(1); Sound.play('select'); } }
    if (m.back) this.rtsSetupBack();
  },
  rtsSetupPointer(x, y) {
    const rows = this.rtsSetupRows(), i = Math.floor((y - 29) / rtsSetupRowH(rows.length));
    if (i < 0 || i >= rows.length) return;
    const row = rows[i];
    if (i !== this.rtsSetIdx) { this.rtsSetIdx = i; Sound.play('select'); if (!row.act) return; }
    if (row.act) row.act();
    else if (row.adj) { row.adj(x < 170 ? -1 : 1); Sound.play('select'); }
  },
  rtsSetupRender(ctx) {
    const s = this.rtsSet, rows = this.rtsSetupRows();
    ctx.fillStyle = '#140E08'; ctx.fillRect(0, 0, SW, SH);
    // a strip of dunes along the bottom
    ctx.fillStyle = '#3A2614';
    for (let x = 0; x < SW; x++) ctx.fillRect(x, SH - 10 - Math.round(4 + 3 * Math.sin(x / 13) + 2 * Math.sin(x / 5.3)), 1, 20);
    Font.drawCenter(ctx, 'DESERT DOMINION', SW / 2, 6, '#F8B838');
    Font.drawCenter(ctx, 'SKIRMISH', SW / 2, 17, '#C8A878');
    rows.forEach((r, i) => {
      const rh = rtsSetupRowH(rows.length), y = 30 + i * rh, sel = i === this.rtsSetIdx;
      if (sel) { ctx.fillStyle = '#3A2A18'; ctx.fillRect(8, y - 1 - (rh > 9 ? 1 : 0), SW - 16, rh); }
      if (r.start || !r.adj && r.act) Font.drawCenter(ctx, r.label, SW / 2, y, sel ? '#F8D878' : r.start ? '#78D878' : '#ADADAD');
      else {
        Font.draw(ctx, r.label, 14, y, sel ? '#F8F8F8' : '#ADADAD');
        const v = r.val || '';
        Font.drawRight(ctx, v, SW - 22, y, r.col || (sel ? '#F8D878' : '#F0BC3C'));
        if (sel) { Font.draw(ctx, '<', SW - 22 - v.length * 8 - 9, y, '#FFF'); Font.draw(ctx, '>', SW - 19, y, '#FFF'); }
      }
    });
    const row = rows[this.rtsSetIdx];
    if (row && row.tip) rtsTinyCenter(ctx, row.tip, SW / 2, SH - 8, '#C8B898');
    void s;
  },
  rtsStartSkirmish() {
    const s = this.rtsSet;
    STORE.set(RTS_SETUP_KEY, s);
    const size = RTS_SIZES[s.size], seed = Math.floor(Math.random() * 1e9);
    const nf = s.nfoes;
    const mo = { w: size, h: size, players: 1 + nf, seed, style: RTS_STYLES[s.style] };
    let map = null;
    if (typeof rtsMapGen === 'function') { try { map = rtsMapGen(mo); } catch (e) { console.error('rtsMapGen', e); } }
    if (!map || !map.starts || map.starts.length < 1 + nf) map = rtsGenMap(mo);
    const escort = h => {
      const lv = { aquila: 'trike', serpens: 'raider', drakon: 'quad', regent: 'trike' }[h] || 'trike';
      return [{ key: 'mcv' }, { key: 'soldier' }, { key: 'soldier' }, { key: s.tech >= 2 || h !== 'drakon' ? lv : 'soldier' }];
    };
    const credits = RTS_CREDITS[s.credits];
    this.rtsStartMission({
      map, seed, tech: s.tech, worms: s.worms, fog: s.fog, speed: s.speed, clicks: s.clicks,
      player: { house: s.house, credits, units: escort(s.house) },
      foes: s.foes.slice(0, nf).map((f, i) => ({ house: f.house, credits, ai: f.ai, units: escort(f.house), team: s.ffa ? i + 1 : 1 })),
      objectives: { destroy: true }, music: true, skirmish: true,
    });
  },
  // until the campaign's own: a results screen, then the title
  rtsCoreMissionOver(result) {
    this.rtsRes = result || {};
    this.setState('rtsResult');
  },
  rtsResultUpdate() {
    if (this.t > 30 && (Input.menu().ok || Input.menu().back || this.t > 3600)) { this.stage = null; this.rts = null; this.toTitle(); this.titleY = 0; }
  },
  rtsResultPointer() { if (this.t > 30) { this.stage = null; this.rts = null; this.toTitle(); this.titleY = 0; } },
  rtsResultRender(ctx) {
    const r = this.rtsRes || {};
    ctx.fillStyle = '#140E08'; ctx.fillRect(0, 0, SW, SH);
    const title = r.win ? 'VICTORY' : 'DEFEAT';
    Font.big(ctx, title, (SW - Font.bigWidth(title, 3)) >> 1, 14, 3, r.win ? '#F8C838' : '#D82800');
    const t = Math.floor((r.time || 0) / 60);
    const lines = [['TIME', Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0')], ['GLIMMER HARVESTED', r.harvested | 0], ['UNITS DESTROYED', r.unitsKilled | 0],
      ['UNITS LOST', r.unitsLost | 0], ['BUILDINGS DESTROYED', r.buildingsKilled | 0], ['BUILDINGS LOST', r.buildingsLost | 0], ['SCORE', r.score | 0]];
    lines.forEach(([k, v], i) => {
      const y = 52 + i * 14;
      if (this.t < 10 + i * 10) return;
      Font.draw(ctx, k, 20, y, '#ADADAD');
      Font.drawRight(ctx, String(v), SW - 20, y, i === lines.length - 1 ? '#F8D878' : '#FFFFFF');
    });
    if (this.t > 90 && (this.t >> 4) & 1) Font.drawCenter(ctx, 'PRESS ENTER', SW / 2, 196, '#ADADAD');
  },
  // DESERT DOMINION picked on the title: the campaign's menu, or straight to the skirmish set-up
  rtsEnter() {
    if (typeof this.rtsMenu === 'function') this.rtsMenu(); else this.rtsSkirmishSetup();
  },
  // the in-game tune: the House's theme to open, then the peace tunes in turn while you build and harvest; battle
  // tunes once fighting comes near your things, and back to peace after a quiet spell (each change holds a while)
  rtsMusic(st) {
    const has = k => typeof SONGS !== 'undefined' && !!SONGS[k];
    if (st.done) { const k = st.resultData && st.resultData.win ? 'rtsWin' : 'rtsLose'; return has(k) ? k : st.resultData && st.resultData.win && has('victory') ? 'victory' : null; }
    const m = st.mus || (st.mus = { battle: false, since: -9999, peace: 0, battles: 0, peaceT: 0 });
    const hot = st.frame - st.battleT < 120 && st.frame > 120;
    if (!m.battle && hot && st.frame - m.since > 300) { m.battle = true; m.since = st.frame; m.battles++; }
    else if (m.battle && st.frame - st.battleT > 900 && st.frame - m.since > 1200) { m.battle = false; m.since = st.frame; m.peace++; m.peaceT = st.frame; }
    if (m.battle) {
      const list = ['rtsBattle1', 'rtsBattle2', 'rtsBattle3'].filter(has);
      return list.length ? list[(m.battles - 1) % list.length] : has('cpu') ? 'cpu' : null;
    }
    // a peace tune plays about three minutes before the next one
    if (st.frame - m.peaceT > 10800) { m.peace++; m.peaceT = st.frame; }
    // the opening theme: the House's own, or in the campaign's last mission the REGENT's
    const mi = st.opts.mission, th = mi && mi.campaign && mi.level === 9 && has('rtsRegent') ? 'rtsRegent' : (RTS_HOUSES[st.player] || {}).theme;
    const list = [th].concat(['rtsPeace1', 'rtsPeace2', 'rtsPeace3']).filter(k => k && has(k));
    return list.length ? list[m.peace % list.length] : has('fortress') ? 'fortress' : null;
  },
});
const rtsKernelStart = Game.rtsStartMission, rtsKernelSetup = Game.rtsSkirmishSetup;

// ================================================================== hooks into the game
(() => {
  const G = Game;
  // one player
  const startGame = G.startGame;
  G.startGame = function (n) {
    if (Config.get('gameMode') === 'rts' && n > 1) { this.toast('DESERT DOMINION: ONE PLAYER'); n = 1; }
    return startGame.call(this, n);
  };
  // the curtain (after the mode's title screen) hands over to the menu
  const newGame = G.newGame;
  G.newGame = function () {
    newGame.apply(this, arguments);
    if (this.mode === 'rts') {
      if (this.curtain) this.curtain.rts = true;
      if (this.introNext) this.introNext.rts = true;
    }
  };
  const updateCurtain = G.updateCurtain;
  G.updateCurtain = function () {
    const c = this.curtain;
    if (c && c.rts && c.phase === 'show') { c.rts = false; this.rtsEnter(); return; }
    updateCurtain.call(this);
  };
  const renderCurtain = G.renderCurtain;
  G.renderCurtain = function (ctx) {
    const c = this.curtain;
    if (c && c.rts && c.phase === 'show') { ctx.fillStyle = COL.black; ctx.fillRect(0, 0, SCREEN_W, SCREEN_H); return; }
    renderCurtain.call(this, ctx);
  };
  // the mission's over: the banner, then the result
  const updatePlay = G.updatePlay;
  G.updatePlay = function () {
    const st = this.stage;
    if (this.state === 'play' && st && st.rts && st.done && !this.paused) {
      if (Input.menu().ok && st.endT > 60) st.skipEnd = true;
      if (!st.reported && (st.endT > 300 || (st.skipEnd && st.endT > 60))) {
        st.reported = true;
        const fn = typeof this.rtsMissionOver === 'function' ? this.rtsMissionOver : this.rtsCoreMissionOver;
        fn.call(this, st.resultData);
        return;
      }
    }
    updatePlay.apply(this, arguments);
  };
  // QUIT in a campaign mission: back to the campaign (it hears of it as a result with quit: true)
  const pauseAction = G.pauseAction;
  G.pauseAction = function (a) {
    const st = this.stage;
    if (a === 'QUIT' && this.mode === 'rts' && st && st.rts && st.opts.mission && typeof this.rtsMissionOver === 'function' && !this.rtsMissionOver.core) {
      this.paused = false;
      const res = st.resultOf(false, true);
      st.reported = true;
      this.rtsMissionOver(res);
      return;
    }
    return pauseAction.apply(this, arguments);
  };
  // RESTART ROUND: the same mission (and map) from the start
  const restartRound = G.restartRound;
  G.restartRound = function () {
    if (this.mode === 'rts' && this.stage && this.stage.rts) { this.paused = false; this.rtsStartMission(this.stage.opts); return; }
    restartRound.apply(this, arguments);
  };
  // the screens of our own
  const update = G.update, renderState = G.renderState, pointer = G.pointer, musicFrame = G.musicFrame, render = G.render;
  G.update = function () {
    const f = RTS_SCREENS[this.state];
    if (f && Net.role !== 'client') { this.t++; this[f[0]](); return; }
    return update.apply(this, arguments);
  };
  G.renderState = function (ctx) {
    const f = RTS_SCREENS[this.state];
    if (f) { this[f[1]](ctx); return; }
    return renderState.apply(this, arguments);
  };
  G.pointer = function (x, y) {
    const f = RTS_SCREENS[this.state];
    if (f) { Sound.unlock(); this[f[2]](x - menuOX(), y - menuOY()); return; }
    return pointer.apply(this, arguments);
  };
  // the music: peace while you build, battle when fighting is near (and a while after), the House's tune on the setup
  G.musicFrame = function () {
    const s = this.state, st = this.stage, has = k => typeof SONGS !== 'undefined' && !!SONGS[k];
    if (s === 'rtsSetup') {
      const th = this.rtsSet && RTS_HOUSES[this.rtsSet.house] ? RTS_HOUSES[this.rtsSet.house].theme : null;
      Music.want(th && has(th) ? th : has('rtsMenu') ? 'rtsMenu' : null, Music.skillLevel(), false);
      return;
    }
    if (s === 'rtsResult') { const k = this.rtsRes && this.rtsRes.win ? 'rtsWin' : 'rtsLose'; Music.want(has(k) ? k : null, Music.skillLevel(), false); return; }
    if (s === 'play' && st && st.rts) {
      const tuning = this.paused && ['MUSIC', 'MUSIC VOL'].includes(pauseMenu()[this.pauseIdx]);
      Music.want(st.opts.music === false ? null : this.rtsMusic(st), Music.skillLevel(), this.paused && !tuning);
      return;
    }
    if (musicFrame) return musicFrame.apply(this, arguments);
  };
  // our own cursor over the map; the touch pad out of the way while playing
  let cursorWas = null, touchWas = null;
  G.render = function (ctx) {
    render.apply(this, arguments);
    const on = this.state === 'play' && this.mode === 'rts' && this.stage && this.stage.rts;
    const cur = on && !this.paused ? 'none' : '';
    if (cur !== cursorWas) { cursorWas = cur; const cv = document.getElementById('screen'); if (cv) cv.style.cursor = cur; }
    const th = on && !this.paused ? 'none' : '';
    if (th !== touchWas) { touchWas = th; const t = document.getElementById('touch'); if (t) t.style.display = th; }
  };
})();

// once every script is in: the contract's CORE entry points are these; the campaign's own menu and results replace
// the stand-ins (a campaign stub for rtsStartMission is put back to this one)
function rtsKernelHook() {
  if (Game.rtsStartMission !== rtsKernelStart && (!Game.rtsStartMission || Game.rtsStartMission.stub)) Game.rtsStartMission = rtsKernelStart;
  if (Game.rtsSkirmishSetup !== rtsKernelSetup && (!Game.rtsSkirmishSetup || Game.rtsSkirmishSetup.stub)) Game.rtsSkirmishSetup = rtsKernelSetup;
  if (typeof Game.rtsMenu !== 'function') { Game.rtsMenu = function () { this.rtsSkirmishSetup(); }; Game.rtsMenu.core = true; }
  if (typeof Game.rtsMissionOver !== 'function') { Game.rtsMissionOver = Game.rtsCoreMissionOver; Game.rtsMissionOver.core = true; }
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', rtsKernelHook); else setTimeout(rtsKernelHook, 0);
