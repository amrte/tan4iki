'use strict';
// =====================================================================
//  Input: keyboard, gamepads and on-screen touch controls
// =====================================================================

const KEYS = {
  solo: {
    0: ['ArrowUp', 'KeyW', 'TUp'],
    1: ['ArrowRight', 'KeyD', 'TRight'],
    2: ['ArrowDown', 'KeyS', 'TDown'],
    3: ['ArrowLeft', 'KeyA', 'TLeft'],
    fire: ['Space', 'KeyJ', 'KeyK', 'KeyZ', 'KeyX', 'KeyF', 'TFire'],
    alt: ['KeyB', 'KeyC', 'KeyN', 'ShiftLeft', 'TFire2'],
  },
  p1: {
    0: ['KeyW', 'TUp'], 1: ['KeyD', 'TRight'], 2: ['KeyS', 'TDown'], 3: ['KeyA', 'TLeft'],
    fire: ['Space', 'KeyF', 'KeyG', 'KeyV', 'TFire'],
    alt: ['KeyB', 'KeyC', 'KeyH', 'TFire2'],
  },
  p2: {
    0: ['ArrowUp'], 1: ['ArrowRight'], 2: ['ArrowDown'], 3: ['ArrowLeft'],
    fire: ['ControlRight', 'ShiftRight', 'Numpad0', 'Slash', 'Period', 'KeyL', 'Comma'],
    alt: ['Numpad1', 'NumpadDecimal', 'Semicolon', 'Quote', 'KeyK'],
  },
  start: ['Enter', 'NumpadEnter', 'KeyP', 'TStart'],
  back: ['Escape', 'Backspace'],
  alt: ['KeyB', 'KeyC', 'TFire2'],
};

// Mac keyboards (MacBook) have no right Ctrl or numpad: player 2 fires with right Option / right Shift / , . /
// and drops mines with ; ' L. Cmd combos are left alone because the browser uses them.
const KEYS_MAC = Object.assign({}, KEYS, {
  p2: {
    0: ['ArrowUp'], 1: ['ArrowRight'], 2: ['ArrowDown'], 3: ['ArrowLeft'],
    fire: ['AltRight', 'ShiftRight', 'Slash', 'Period', 'Comma'],
    alt: ['Semicolon', 'Quote', 'KeyL'],
  },
});

// 3-4 players on one keyboard (same on PC and Mac); gamepads are the comfy option
const KEYS_MULTI = [
  { 0: ['KeyW', 'TUp'], 1: ['KeyD', 'TRight'], 2: ['KeyS', 'TDown'], 3: ['KeyA', 'TLeft'], fire: ['Space', 'KeyV', 'TFire'], alt: ['KeyC', 'KeyB', 'TFire2'] },
  { 0: ['ArrowUp'], 1: ['ArrowRight'], 2: ['ArrowDown'], 3: ['ArrowLeft'], fire: ['ShiftRight', 'ControlRight', 'AltRight', 'Slash', 'Period'], alt: ['Quote', 'Semicolon'] },
  { 0: ['KeyI'], 1: ['KeyL'], 2: ['KeyK'], 3: ['KeyJ'], fire: ['KeyU'], alt: ['KeyO'] },
  { 0: ['KeyT', 'Numpad8'], 1: ['KeyH', 'Numpad6'], 2: ['KeyG', 'Numpad5'], 3: ['KeyF', 'Numpad4'], fire: ['KeyR', 'Numpad0'], alt: ['KeyY', 'NumpadDecimal'] },
];

const IS_MAC = /Mac|iPhone|iPad|iPod/.test([navigator.userAgentData && navigator.userAgentData.platform, navigator.platform, navigator.userAgent].join(' '));

// help line under the game, per control scheme
const HELP = {
  PC: '<b>1P</b> Arrows/WASD move · Space/Z/J fire · B/C/Left Shift mines &nbsp;|&nbsp; '
    + '<b>2P</b> P1 WASD + Space/F, mines C/B · P2 Arrows + Right Ctrl/Numpad0/L, mines Numpad1/K/; &nbsp;|&nbsp; '
    + '<b>3-4P</b> P3 IJKL fire U mines O · P4 TFGH/numpad fire R mines Y &nbsp;|&nbsp; '
    + '<b>Enter</b> pause · <b>M</b> mute · <b>double-click</b> fullscreen · gamepads supported',
  MAC: '<b>1P</b> ←↑↓→ or WASD move · Space/Z/J fire · B/C/⇧ mines &nbsp;|&nbsp; '
    + '<b>2P</b> P1 WASD + Space/F, mines C/B · P2 ←↑↓→ + right ⌥ option / right ⇧ / slash fire, mines ; or \' &nbsp;|&nbsp; '
    + '<b>3-4P</b> P3 IJKL fire U mines O · P4 TFGH fire R mines Y &nbsp;|&nbsp; '
    + '<b>return</b> pause · <b>M</b> mute · <b>double-click</b> or ⌃⌘F fullscreen · <b>fn+delete</b> clears a map in Construction',
};

// ---------------------------------------------------------- user bindings
// Keyboard: two keys per action for each player (null = the scheme's defaults).
// Gamepad: one set of buttons shared by all pads (standard mapping indices).
const ACTIONS = ['up', 'down', 'left', 'right', 'fire', 'alt'];
const PAD_ACTIONS = ['fire', 'alt', 'start', 'back'];
const PAD_DEFAULT = { fire: [0, 2, 5, 7], alt: [1, 3, 4, 6], start: [9], back: [8] };
const TOUCH_CODES = new Set(['TUp', 'TRight', 'TDown', 'TLeft', 'TFire', 'TFire2', 'TStart', 'TRadio']);

const Keymap = {
  players: [null, null, null, null],
  pad: null,
  load() {
    try {
      const d = JSON.parse(localStorage.getItem('tank1990_keys') || 'null');
      if (d && Array.isArray(d.players)) { this.players = d.players.slice(0, 4); this.pad = d.pad || null; }
    } catch (e) { /* storage unavailable */ }
    while (this.players.length < 4) this.players.push(null);
  },
  save() {
    try { localStorage.setItem('tank1990_keys', JSON.stringify({ players: this.players, pad: this.pad })); } catch (e) { /* storage unavailable */ }
  },
  // the scheme's keys for player i, as the editor shows them (first two per action)
  defaults(i) {
    const K = Input.keys(), src = i === 0 ? K.p1 : i === 1 ? K.p2 : KEYS_MULTI[i];
    const pick = list => list.filter(c => !TOUCH_CODES.has(c)).slice(0, 2);
    return { up: pick(src[0]), down: pick(src[2]), left: pick(src[3]), right: pick(src[1]), fire: pick(src.fire), alt: pick(src.alt) };
  },
  get(i) { return this.players[i] || this.defaults(i); },
  custom(i) { return !!this.players[i]; },
  padMap() { return this.pad || PAD_DEFAULT; },
  // map in the format Input.player uses, or null when the player still has the defaults
  inputMap(i) {
    const b = this.players[i];
    if (!b) return null;
    const t = i === 0 ? c => [c] : () => [];
    return { 0: b.up.concat(t('TUp')), 1: b.right.concat(t('TRight')), 2: b.down.concat(t('TDown')), 3: b.left.concat(t('TLeft')),
      fire: b.fire.concat(t('TFire')), alt: b.alt.concat(t('TFire2')) };
  },
  // a key does one thing only: take it away from every other action and player first
  setKey(i, action, slot, code) {
    for (let p = 0; p < 4; p++) {
      const cur = this.get(p);
      if (!ACTIONS.some(a => cur[a].includes(code))) continue;
      const copy = JSON.parse(JSON.stringify(cur));
      for (const a of ACTIONS) copy[a] = copy[a].filter(c => c !== code);
      this.players[p] = copy;
    }
    if (!this.players[i]) this.players[i] = JSON.parse(JSON.stringify(this.defaults(i)));
    const arr = this.players[i][action].slice(0, 2);
    arr[Math.min(slot, arr.length)] = code;
    this.players[i][action] = arr.filter(Boolean);
    this.save();
  },
  clearKey(i, action, slot) {
    if (!this.players[i]) this.players[i] = JSON.parse(JSON.stringify(this.defaults(i)));
    this.players[i][action] = this.players[i][action].filter((_, k) => k !== slot);
    this.save();
  },
  setPad(action, slot, button) {
    const pm = JSON.parse(JSON.stringify(this.padMap()));
    for (const a of PAD_ACTIONS) pm[a] = pm[a].filter(n => n !== button);
    const arr = pm[action].slice(0, 2);
    arr[Math.min(slot, arr.length)] = button;
    pm[action] = arr.filter(n => n !== undefined);
    this.pad = pm;
    this.save();
  },
  clearPad(action, slot) {
    const pm = JSON.parse(JSON.stringify(this.padMap()));
    pm[action] = pm[action].filter((_, k) => k !== slot);
    this.pad = pm;
    this.save();
  },
  resetPlayer(i) { this.players[i] = null; this.save(); },
  resetAll() { this.players = [null, null, null, null]; this.pad = null; this.save(); },
};

// short names for the key setup screen (the NES font has capitals, digits and a few symbols)
function keyLabel(code) {
  if (!code) return '-';
  const mac = Input.scheme() === 'MAC';
  const named = {
    ArrowUp: 'UP', ArrowDown: 'DOWN', ArrowLeft: 'LEFT', ArrowRight: 'RIGHT', Space: 'SPACE', Enter: 'ENTER',
    ShiftLeft: 'LSHIFT', ShiftRight: 'RSHIFT', ControlLeft: 'LCTRL', ControlRight: 'RCTRL',
    AltLeft: mac ? 'LOPT' : 'LALT', AltRight: mac ? 'ROPT' : 'RALT', MetaLeft: mac ? 'LCMD' : 'LWIN', MetaRight: mac ? 'RCMD' : 'RWIN',
    Slash: '/', Period: '.', Comma: ',', Semicolon: ';', Quote: "'", Minus: '-', Equal: '=', Backquote: "'",
    BracketLeft: '<', BracketRight: '>', Backslash: '/', Tab: 'TAB', CapsLock: 'CAPS', Backspace: 'BKSP', Delete: 'DEL',
    NumpadEnter: 'NENTER', NumpadDecimal: 'NUM.', NumpadAdd: 'NUM+', NumpadSubtract: 'NUM-',
  };
  if (named[code]) return named[code];
  if (/^Key[A-Z]$/.test(code)) return code[3];
  if (/^Digit\d$/.test(code)) return code[5];
  if (/^Numpad\d$/.test(code)) return 'NUM' + code[6];
  return code.toUpperCase().slice(0, 7);
}

function padLabel(n) {
  if (n === undefined || n === null) return '-';
  return ['A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT', 'SELECT', 'START', 'LSTICK', 'RSTICK', 'DUP', 'DDOWN', 'DLEFT', 'DRIGHT', 'HOME'][n] || 'BTN' + n;
}

const PREVENT = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Enter', 'Tab', 'Slash', 'Backspace', 'AltRight', 'AltLeft', 'Quote']);

const Input = {
  down: new Set(),
  just: new Set(),
  stamp: {},
  seq: 0,
  numPlayers: 1,
  remote: {},       // host of an online game: player index -> that guest's buttons
  pads: [],
  padPrev: [],

  init() {
    window.addEventListener('keydown', e => {
      // the online panel needs normal typing and pasting
      if (typeof Net !== 'undefined' && Net.panelOpen) {
        if (e.code === 'Escape') Net.closePanel();
        return;
      }
      if (PREVENT.has(e.code)) e.preventDefault();
      Sound.unlock();
      // waiting for a new key on the key setup screen
      if (this.capture) {
        e.preventDefault();
        if (!e.repeat) { const cb = this.capture; this.capture = null; cb({ kind: 'key', code: e.code }); }
        return;
      }
      if (e.repeat) return;
      this.press(e.code);
      if (e.code === 'KeyM') Sound.toggleMute();
    });
    window.addEventListener('keyup', e => this.release(e.code));
    window.addEventListener('blur', () => this.down.clear());
    this.initTouch();
  },

  press(code) {
    if (!this.down.has(code)) {
      this.just.add(code);
      this.stamp[code] = ++this.seq;
    }
    this.down.add(code);
  },
  release(code) { this.down.delete(code); },

  endFrame() { this.just.clear(); },

  // short controller vibration for player i (if the pad supports it and it's switched on)
  rumble(i, strength = 0.6, ms = 200) {
    if (typeof Config === 'undefined' || !Config.on('rumble')) return;
    for (const p of this.padsFor(i)) {
      const act = p.gp && p.gp.vibrationActuator;
      if (act && act.playEffect) {
        try { const r = act.playEffect('dual-rumble', { duration: ms, strongMagnitude: strength, weakMagnitude: strength * 0.6 }); if (r && r.catch) r.catch(() => {}); } catch (e) { /* not supported */ }
      }
    }
  },

  // active control scheme: PC or MAC (AUTO picks MAC on Apple devices)
  scheme() {
    const v = typeof Config !== 'undefined' ? Config.get('controls') : 'AUTO';
    return v === 'AUTO' || !v ? (IS_MAC ? 'MAC' : 'PC') : v;
  },
  keys() { return this.scheme() === 'MAC' ? KEYS_MAC : KEYS; },
  updateHelp() {
    const el = document.getElementById('help');
    if (el) el.innerHTML = HELP[this.scheme()];
  },

  anyJust(codes) { return codes.some(c => this.just.has(c)); },
  anyDown(codes) { return codes.some(c => this.down.has(c)); },

  // ---------------------------------------------------------- gamepads
  poll() {
    const list = navigator.getGamepads ? navigator.getGamepads() : [];
    const pads = [];
    for (const gp of list) if (gp && gp.connected) pads.push(gp);
    const pm = Keymap.padMap();
    this.pads = pads.map((gp, i) => {
      const b = n => !!(gp.buttons[n] && gp.buttons[n].pressed);
      const any = list => list.some(b);
      const ax = gp.axes[0] || 0, ay = gp.axes[1] || 0;
      // D-pad: standard buttons 12-15, the left stick, and the layouts non-standard pads use
      let hu = false, hd = false, hl = false, hr = false;
      if (gp.mapping !== 'standard') {
        const a6 = gp.axes[6] || 0, a7 = gp.axes[7] || 0;
        hl = a6 < -0.5; hr = a6 > 0.5; hu = a7 < -0.5; hd = a7 > 0.5;
        const h = gp.axes[9];
        if (h !== undefined && h >= -1.05 && h <= 1.05) {
          const k = Math.round((h + 1) / 2 * 7) & 7; // 0 up, 2 right, 4 down, 6 left
          hu = hu || [7, 0, 1].includes(k); hr = hr || [1, 2, 3].includes(k);
          hd = hd || [3, 4, 5].includes(k); hl = hl || [5, 6, 7].includes(k);
        }
      }
      const st = {
        gp,
        0: b(12) || ay < -0.5 || hu,
        2: b(13) || ay > 0.5 || hd,
        3: b(14) || ax < -0.5 || hl,
        1: b(15) || ax > 0.5 || hr,
        fire: any(pm.fire),
        alt: any(pm.alt),
        start: any(pm.start),
        back: any(pm.back),
        raw: gp.buttons.map(x => !!(x && x.pressed)),
      };
      const prev = this.padPrev[i] || {};
      // waiting for a new button on the key setup screen
      if (this.capture && prev.raw) {
        const n = st.raw.findIndex((on, k) => on && !prev.raw[k]);
        if (n >= 0) { const cb = this.capture; this.capture = null; cb({ kind: 'pad', button: n }); st.swallow = true; }
      }
      st.justFire = st.fire && !prev.fire && !st.swallow;
      st.justAlt = st.alt && !prev.alt && !st.swallow;
      st.justStart = st.start && !prev.start && !st.swallow;
      st.justBack = st.back && !prev.back && !st.swallow;
      for (const d of [0, 1, 2, 3]) {
        st['just' + d] = st[d] && !prev[d];
        if (st['just' + d]) st['stamp' + d] = ++this.seq; else st['stamp' + d] = prev['stamp' + d] || 0;
      }
      if (st.fire || st.start || st[0] || st[1] || st[2] || st[3]) Sound.unlock();
      return st;
    });
    this.padPrev = this.pads;
    // online guests: turn their press counters into this frame's edges
    for (const k in this.remote) {
      const r = this.remote[k];
      const edge = name => { const v = r[name] || 0, seen = r['_' + name]; r['_' + name] = v; return seen !== undefined && v !== seen; };
      r.firePressed = edge('fp');
      r.altPressed = edge('ap');
      r.menu = { up: edge('cu'), down: edge('cd'), left: edge('cl'), right: edge('cr'), ok: edge('ok'), back: edge('bk'), start: edge('stt') };
    }
  },

  // players at this computer (not online guests)
  localCount() { return this.numPlayers - Object.keys(this.remote).length; },

  padsFor(i) {
    if (this.numPlayers <= 1 || this.localCount() === 1) return this.pads;
    return this.pads[i] ? [this.pads[i]] : [];
  },

  // ---------------------------------------------------------- per-player state
  player(i) {
    const K = this.keys();
    const r = this.remote[i];
    if (r) return { dir: r.d === undefined ? -1 : r.d, fire: !!r.f, firePressed: !!r.firePressed, alt: !!r.a, altPressed: !!r.altPressed };
    // a single player at this computer gets the full one-player layout
    const n = this.localCount() === 1 ? 1 : this.numPlayers;
    const map = Keymap.inputMap(i) || (n >= 3 ? KEYS_MULTI[i] : n === 2 ? (i === 0 ? K.p1 : K.p2) : K.solo);
    let best = -1, bestStamp = -1;
    for (const d of [0, 1, 2, 3]) {
      for (const code of map[d]) {
        if (this.down.has(code) && this.stamp[code] > bestStamp) { best = d; bestStamp = this.stamp[code]; }
      }
    }
    let fire = this.anyDown(map.fire), firePressed = this.anyJust(map.fire);
    let alt = this.anyDown(map.alt), altPressed = this.anyJust(map.alt);
    for (const p of this.padsFor(i)) {
      alt = alt || p.alt;
      altPressed = altPressed || p.justAlt;
      for (const d of [0, 1, 2, 3]) if (p[d] && p['stamp' + d] > bestStamp) { best = d; bestStamp = p['stamp' + d]; }
      fire = fire || p.fire;
      firePressed = firePressed || p.justFire;
    }
    return { dir: best, fire, firePressed, alt, altPressed };
  },

  // ---------------------------------------------------------- menus
  menu() {
    const all = KEYS.solo;
    const m = {
      up: this.anyJust(all[0]),
      right: this.anyJust(all[1]),
      down: this.anyJust(all[2]),
      left: this.anyJust(all[3]),
      fire: this.anyJust(all.fire) || this.anyJust(this.keys().p2.fire) || this.anyJust(['TFire2']),
      alt: this.anyJust(KEYS.alt),
      start: this.anyJust(KEYS.start),
      back: this.anyJust(KEYS.back),
      select: this.anyJust(['Tab', 'ShiftLeft']),
    };
    for (const p of this.pads) {
      m.up = m.up || p.just0; m.right = m.right || p.just1; m.down = m.down || p.just2; m.left = m.left || p.just3;
      m.fire = m.fire || p.justFire; m.alt = m.alt || p.justAlt;
      m.start = m.start || p.justStart; m.back = m.back || p.justBack;
    }
    m.ok = m.fire || m.start;
    m.any = m.ok || m.up || m.down || m.left || m.right || m.back;
    return m;
  },

  // held directions for menus with auto-repeat (construction cursor)
  heldDir() {
    let best = -1, bestStamp = -1;
    for (const d of [0, 1, 2, 3]) {
      for (const code of KEYS.solo[d].concat(this.keys().p2[d])) {
        if (this.down.has(code) && this.stamp[code] > bestStamp) { best = d; bestStamp = this.stamp[code]; }
      }
      for (const p of this.pads) if (p[d] && p['stamp' + d] > bestStamp) { best = d; bestStamp = p['stamp' + d]; }
    }
    return best;
  },

  // ---------------------------------------------------------- touch
  initTouch() {
    const root = document.getElementById('touch');
    if (!root) return;
    const coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    if (coarse || 'ontouchstart' in window) document.body.classList.add('touch');

    const dpad = document.getElementById('dpad');
    const dirCodes = ['TUp', 'TRight', 'TDown', 'TLeft'];
    let dpadPointer = null;
    const setDir = d => {
      dirCodes.forEach((c, i) => { if (i !== d) this.release(c); });
      if (d >= 0) this.press(dirCodes[d]);
      dpad.dataset.dir = d;
    };
    const dirFrom = e => {
      const r = dpad.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
      if (Math.hypot(dx, dy) < r.width * 0.12) return -1;
      if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 1 : 3;
      return dy > 0 ? 2 : 0;
    };
    dpad.addEventListener('pointerdown', e => {
      e.preventDefault(); Sound.unlock();
      dpadPointer = e.pointerId;
      dpad.setPointerCapture(e.pointerId);
      setDir(dirFrom(e));
    });
    dpad.addEventListener('pointermove', e => { if (e.pointerId === dpadPointer) setDir(dirFrom(e)); });
    const end = e => { if (e.pointerId === dpadPointer) { dpadPointer = null; setDir(-1); } };
    dpad.addEventListener('pointerup', end);
    dpad.addEventListener('pointercancel', end);

    for (const btn of root.querySelectorAll('[data-code]')) {
      const code = btn.dataset.code;
      btn.addEventListener('pointerdown', e => { e.preventDefault(); Sound.unlock(); btn.setPointerCapture(e.pointerId); this.press(code); btn.classList.add('on'); });
      const up = () => { this.release(code); btn.classList.remove('on'); };
      btn.addEventListener('pointerup', up);
      btn.addEventListener('pointercancel', up);
    }
  },
};
