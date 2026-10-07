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

const PREVENT = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Enter', 'Tab', 'Slash', 'Backspace']);

const Input = {
  down: new Set(),
  just: new Set(),
  stamp: {},
  seq: 0,
  twoP: false,
  pads: [],
  padPrev: [],

  init() {
    window.addEventListener('keydown', e => {
      if (PREVENT.has(e.code)) e.preventDefault();
      Sound.unlock();
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

  anyJust(codes) { return codes.some(c => this.just.has(c)); },
  anyDown(codes) { return codes.some(c => this.down.has(c)); },

  // ---------------------------------------------------------- gamepads
  poll() {
    const list = navigator.getGamepads ? navigator.getGamepads() : [];
    const pads = [];
    for (const gp of list) if (gp && gp.connected) pads.push(gp);
    this.pads = pads.map((gp, i) => {
      const b = n => !!(gp.buttons[n] && gp.buttons[n].pressed);
      const ax = gp.axes[0] || 0, ay = gp.axes[1] || 0;
      const st = {
        0: b(12) || ay < -0.5,
        2: b(13) || ay > 0.5,
        3: b(14) || ax < -0.5,
        1: b(15) || ax > 0.5,
        fire: b(0) || b(2) || b(5) || b(7),
        alt: b(1) || b(3) || b(4) || b(6),
        start: b(9),
        back: b(8),
      };
      const prev = this.padPrev[i] || {};
      st.justFire = st.fire && !prev.fire;
      st.justAlt = st.alt && !prev.alt;
      st.justStart = st.start && !prev.start;
      st.justBack = st.back && !prev.back;
      for (const d of [0, 1, 2, 3]) {
        st['just' + d] = st[d] && !prev[d];
        if (st['just' + d]) st['stamp' + d] = ++this.seq; else st['stamp' + d] = prev['stamp' + d] || 0;
      }
      if (st.fire || st.start || st[0] || st[1] || st[2] || st[3]) Sound.unlock();
      return st;
    });
    this.padPrev = this.pads;
  },

  padsFor(i) {
    if (!this.twoP) return this.pads;
    return this.pads[i] ? [this.pads[i]] : [];
  },

  // ---------------------------------------------------------- per-player state
  player(i) {
    const map = this.twoP ? (i === 0 ? KEYS.p1 : KEYS.p2) : KEYS.solo;
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
      fire: this.anyJust(all.fire) || this.anyJust(KEYS.p2.fire) || this.anyJust(['TFire2']),
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
      for (const code of KEYS.solo[d].concat(KEYS.p2[d])) {
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
