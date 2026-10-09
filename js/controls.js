'use strict';
// =====================================================================
//  CONTROLS: the keys on a page of the game's own (it used to be a line of text under the game). From the pause menu
//  it shows the players of the game in hand and what this mode adds; from Settings it shows every layout (left/right:
//  one player, two, three or four). Read from the bindings in use, so keys set up in SET UP KEYS AND PADS show too.
// =====================================================================

// a set of four keys that reads better by its name
const CTL_DIRS = [['ARROWS', ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']], ['WASD', ['KeyW', 'KeyS', 'KeyA', 'KeyD']],
  ['IJKL', ['KeyI', 'KeyK', 'KeyJ', 'KeyL']], ['TFGH', ['KeyT', 'KeyG', 'KeyF', 'KeyH']], ['NUM 8 5 4 6', ['Numpad8', 'Numpad5', 'Numpad4', 'Numpad6']]];
const CTL_W = 22;   // characters a value may take

// what B does in each mode (the stage's own B otherwise: mines and turrets when you have them, else a shot)
const CTL_ALT = { cs: 'GRENADE/MINE', galaxy: 'SWAP / FOCUS', fortress: 'BUILD MENU', rally: 'DROP: MINE/OIL/SMOKE', rts: 'CANCEL / DESELECT' };
// what a mode adds to the keys
const CTL_EXTRA = {
  cs: n => [['B STILL', 'PLANT/DEFUSE'], [n > 1 ? '123 / 890' : '1 2 3', 'BOT ORDERS'], ['Q', 'NEXT ORDER'], [n > 2 ? 'EMPTY' : n > 1 ? 'R / 7' : 'R', 'RELOAD'], ['TAB', 'SCOREBOARD']],
  galaxy: () => [['B TWICE', 'BOMB']],
  rally: () => [['FIRE', 'FORWARD WEAPON'], ['FIRE + B', 'BOOST']],
  rts: () => [['MOUSE', 'CLICK SELECT, ORDER'], ['DRAG', 'SELECT A GROUP'], ['RIGHT CLICK', 'DESELECT / CANCEL'], ['ARROWS EDGE', 'SCROLL THE MAP'],
    ['FIRE', 'CLICK AT THE CURSOR'], ['B + MOVE', 'PAN'], ['TAB / PAD X', 'CURSOR TO SIDEBAR'], ['H', 'HOME'], ['G S A', 'GUARD STOP ATT-MOVE'],
    ['CTRL+1-9', 'MAKE GROUP, 1-9 PICK'], ['DEL / R', 'SELL / REPAIR']],
};

// the keys a player uses with n players at the keyboard (as Input.player reads them)
function ctlMap(i, n) {
  const K = Input.keys();
  return Keymap.inputMap(i) || (n >= 3 ? KEYS_MULTI[i] : n === 2 ? (i ? K.p2 : K.p1) : K.solo);
}
function ctlKeys(list) {
  const ks = list.filter(c => !TOUCH_CODES.has(c)).map(keyLabel);
  for (let k = Math.min(3, ks.length); k > 0; k--) { const s = ks.slice(0, k).join(' / '); if (s.length <= CTL_W) return s; }
  return '-';
}
function ctlMove(map) {
  const has = (d, c) => map[d].includes(c), sets = [];
  for (const [name, [u, dn, l, r]] of CTL_DIRS) if (has(0, u) && has(2, dn) && has(3, l) && has(1, r)) sets.push(name);
  if (sets.length) return sets.slice(0, 2).join(' / ');
  return [0, 2, 3, 1].map(d => keyLabel(map[d].filter(c => !TOUCH_CODES.has(c))[0])).join(' ');
}

// the page's lines: [label, value, colour] (a label alone is a heading)
function controlsLines(n, mode) {
  const L = [], compact = mode && n > 2;
  for (let i = 0; i < n; i++) {
    const m = ctlMap(i, n);
    L.push([n > 1 ? ROMAN[i] + '-PLAYER' : 'PLAYER', null, COL.gold]);
    L.push(['MOVE', ctlMove(m)], ['FIRE', ctlKeys(m.fire)], [mode ? 'B' : 'B MINES', ctlKeys(m.alt)]);
  }
  // in a game: what B does in this mode, and the mode's own keys
  if (mode) {
    L.push([modeInfo(mode).name.slice(0, 26), null, COL.gold]);
    L.push(['B', CTL_ALT[mode] || 'MINES'], ...(CTL_EXTRA[mode] ? CTL_EXTRA[mode](n) : []));
  }
  if (compact) return L;   // three or four players: their keys and the mode's only (the page would overflow)
  const pm = Keymap.padMap(), pads = l => l.slice(0, 2).map(padLabel).join(' / ');
  L.push(['GAMEPADS', null, COL.gold]);
  L.push(['MOVE', 'D-PAD / STICK'], ['FIRE / B', pads(pm.fire) + ', ' + pads(pm.alt)], ['PAUSE', padLabel(pm.start[0])]);
  L.push(['ANY TIME', null, COL.gold]);
  L.push([Input.scheme() === 'MAC' ? 'RETURN / P' : 'ENTER / P', 'PAUSE'], ['M', 'MUTE'],
    ['DBL-CLICK', Input.scheme() === 'MAC' ? 'FULLSCREEN, CTRL CMD F' : 'FULLSCREEN']);
  return L;
}

// draw the lines in a box (x, y, w, h); rows of 9 px, or 8 when they wouldn't fit
function drawControls(ctx, lines, x, y, w, h) {
  const rh = lines.length * 9 <= h ? 9 : 8, col2 = x + 84;
  lines.forEach(([label, val, col], k) => {
    const ly = y + k * rh;
    if (ly + 7 > y + h) return;
    if (val === null || val === undefined) Font.draw(ctx, label, x, ly, col || COL.gold);
    else { Font.draw(ctx, label.slice(0, 10), x + 4, ly, COL.lgrey); Font.draw(ctx, String(val).slice(0, Math.floor((x + w - col2) / 8)), col2, ly, COL.white); }
  });
}

Object.assign(Game, {
  // from Settings: every layout, one player count at a time
  toControls() {
    this.ctl = { n: Math.max(1, Math.min(3, Input.localCount ? Input.localCount() || 1 : 1)) };
    this.setState('controls');
    Sound.play('select');
  },
  updateControls() {
    const m = Input.menu();
    if (m.left || m.right) { this.ctl.n = m.right ? this.ctl.n % 3 + 1 : (this.ctl.n + 1) % 3 + 1; Sound.play('select'); }
    else if (m.back || m.ok || m.start) { this.setState('settings'); Sound.play('select'); }
  },
  renderControls(ctx) {
    ctx.fillStyle = COL.black; ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
    const ox = (SCREEN_W - SW) >> 1, oy = (SCREEN_H - SH) >> 1, n = this.ctl.n;
    ctx.save(); ctx.translate(ox, oy);
    Font.drawCenter(ctx, 'CONTROLS', SW / 2, 6, COL.red);
    Font.drawCenter(ctx, '< ' + (n === 1 ? '1 PLAYER' : n === 2 ? '2 PLAYERS' : '3-4 PLAYERS') + ' >', SW / 2, 18, COL.white);
    drawControls(ctx, controlsLines(n === 3 ? 4 : n, ''), 16, 32, SW - 24, SH - 46);
    Font.drawCenter(ctx, 'ESC: BACK', SW / 2, SH - 10, COL.lgrey);
    ctx.restore();
  },
});

// ------------------------------------------------------------------ in the pause menu: a page over the field
(() => {
  const G = Game;
  const action = G.pauseAction;
  G.pauseAction = function (a) {
    if (a === 'CONTROLS') { this.pauseCtl = true; Sound.play('select'); return; }
    return action.apply(this, arguments);
  };
  const updatePlay = G.updatePlay;
  G.updatePlay = function () {
    if (this.paused && this.pauseCtl) {
      const m = Input.menu();
      if (m.ok || m.back || m.start || Input.anyJust(['KeyP'])) { this.pauseCtl = false; Sound.play('select'); }
      return;
    }
    if (!this.paused) this.pauseCtl = false;
    return updatePlay.apply(this, arguments);
  };
  const renderPlay = G.renderPlay;
  G.renderPlay = function (ctx) {
    if (!(this.paused && this.pauseCtl)) return renderPlay.apply(this, arguments);
    const paused = this.paused;
    this.paused = false;   // the field without the pause box
    try { renderPlay.apply(this, arguments); } finally { this.paused = paused; }
    const n = Math.max(1, Input.localCount()), lines = controlsLines(Math.min(4, n), this.mode);
    const w = Math.min(VIEW_W - 4, 240), h = Math.min(VIEW_H - 4, 26 + lines.length * 9), x = FX + ((VIEW_W - w) >> 1), y = FY + ((VIEW_H - h) >> 1);
    ctx.fillStyle = COL.black; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = COL.lgrey; ctx.fillRect(x, y, w, 1); ctx.fillRect(x, y + h - 1, w, 1); ctx.fillRect(x, y, 1, h); ctx.fillRect(x + w - 1, y, 1, h);
    Font.drawCenter(ctx, 'CONTROLS', x + w / 2, y + 5, COL.orange);
    drawControls(ctx, lines, x + 6, y + 17, w - 10, h - 21);
  };
})();
