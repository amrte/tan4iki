'use strict';
// =====================================================================
//  Graphics: procedural NES-style pixel art, font, sprite caches
// =====================================================================

const COL = {
  bg: '#636363',
  black: '#000000',
  white: '#FFFFFF',
  red: '#D82800',
  orange: '#E45C10',
  gold: '#F0BC3C',
  lgrey: '#ADADAD',
};

const PALS = {
  p1: [null, '#F8E098', '#E0A010', '#6C4800'],
  p2: [null, '#C8F8A0', '#40B830', '#004800'],
  silver: [null, '#FFFFFF', '#ADADAD', '#00505C'],
  red: [null, '#FFFFFF', '#E04020', '#600000'],
  green: [null, '#D8F8B8', '#58B848', '#00402C'],
  gold: [null, '#FFF0B0', '#D8A038', '#604000'],
  steel: [null, '#E0E0E0', '#8C8C8C', '#1C2C3C'],
};

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function paintRows(rows, cmap) {
  const h = rows.length, w = rows[0].length;
  const c = makeCanvas(w, h), x = c.getContext('2d');
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const col = cmap[rows[j][i]];
      if (col) { x.fillStyle = col; x.fillRect(i, j, 1, 1); }
    }
  }
  return c;
}

function gridCanvas(grid, pal) {
  const h = grid.length, w = grid[0].length;
  const c = makeCanvas(w, h), x = c.getContext('2d');
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const v = grid[j][i];
      if (v && pal[v]) { x.fillStyle = pal[v]; x.fillRect(i, j, 1, 1); }
    }
  }
  return c;
}

function newGrid(n) {
  const g = [];
  for (let y = 0; y < n; y++) g.push(new Array(n).fill(0));
  return g;
}

// rotate square grid 90° clockwise
function rotGrid(g) {
  const n = g.length, r = newGrid(n);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) r[y][x] = g[n - 1 - x][y];
  return r;
}

// ------------------------------------------------------------------ font
const Font = {
  bits: {},
  cache: {},
  init() {
    for (const ch in FONT_SRC) {
      this.bits[ch] = FONT_SRC[ch].map(r => {
        let v = 0;
        for (let i = 0; i < 5; i++) if (r[i] !== '.') v |= 1 << (4 - i);
        return (v << 1) | v; // bold
      });
    }
  },
  glyph(ch, color) {
    const k = ch + color;
    let c = this.cache[k];
    if (!c) {
      c = makeCanvas(8, 8);
      const x = c.getContext('2d');
      x.fillStyle = color;
      const b = this.bits[ch];
      for (let r = 0; r < 7; r++) for (let i = 0; i < 6; i++) if (b[r] & (1 << (5 - i))) x.fillRect(i, r, 1, 1);
      this.cache[k] = c;
    }
    return c;
  },
  draw(ctx, s, x, y, color) {
    s = String(s).toUpperCase();
    for (let i = 0; i < s.length; i++) {
      const ch = s[i];
      if (this.bits[ch]) ctx.drawImage(this.glyph(ch, color), x + i * 8, y);
    }
  },
  drawRight(ctx, s, xRight, y, color) {
    s = String(s);
    this.draw(ctx, s, xRight - s.length * 8, y, color);
  },
  drawCenter(ctx, s, cx, y, color) {
    s = String(s);
    this.draw(ctx, s, Math.round(cx - (s.length * 8 - 2) / 2), y, color);
  },
  // huge letters made of bricks (title / game over)
  big(ctx, s, x, y, scale, fill) {
    s = String(s).toUpperCase();
    ctx.fillStyle = fill;
    for (let i = 0; i < s.length; i++) {
      const b = this.bits[s[i]];
      if (!b) continue;
      const ox = x + i * 8 * scale;
      for (let r = 0; r < 7; r++) for (let c = 0; c < 6; c++) {
        if (b[r] & (1 << (5 - c))) ctx.fillRect(ox + c * scale, y + r * scale, scale, scale);
      }
    }
  },
  bigWidth(s, scale) { return s.length * 8 * scale - 2 * scale; },
};

// ------------------------------------------------------------------ tanks
// Each tank is generated facing up, then rotated. Palette index: 1 light, 2 mid, 3 dark.
const TANK_SPECS = {
  // player upgrade levels
  p0: { tT: 2, tB: 14, tL: 1, bL: 4, bR: 11, bT: 5, bB: 13, cy: 9.5, r: 3.0, barT: 2, feat: [] },
  p1: { tT: 1, tB: 14, tL: 1, bL: 4, bR: 11, bT: 4, bB: 13, cy: 9.0, r: 3.2, barT: 1, feat: ['stripe'] },
  p2: { tT: 1, tB: 15, tL: 1, bL: 3, bR: 12, bT: 4, bB: 14, cy: 9.5, r: 3.6, barT: 0, feat: ['plates'] },
  p3: { tT: 0, tB: 15, tL: 0, bL: 3, bR: 12, bT: 3, bB: 14, cy: 9.0, r: 4.0, barT: 0, feat: ['plates', 'muzzle'] },
  // enemies: basic, fast, power, armor
  e0: { tT: 2, tB: 14, tL: 1, bL: 4, bR: 11, bT: 5, bB: 13, cy: 9.5, r: 3.0, barT: 1, feat: ['rear'] },
  e1: { tT: 1, tB: 15, tL: 1, bL: 5, bR: 10, bT: 3, bB: 14, cy: 10, r: 2.6, barT: 0, feat: ['slant', 'stripe'] },
  e2: { tT: 1, tB: 14, tL: 1, bL: 4, bR: 11, bT: 4, bB: 13, cy: 9.0, r: 3.4, barT: 0, feat: ['muzzle', 'rear'] },
  e3: { tT: 0, tB: 15, tL: 0, bL: 3, bR: 12, bT: 2, bB: 15, cy: 9.0, r: 4.2, barT: 0, feat: ['plates', 'rear'] },
};

function genTankGrid(s, frame) {
  const g = newGrid(16);
  const set = (x, y, c) => { if (x >= 0 && x < 16 && y >= 0 && y < 16) g[y][x] = c; };
  const f = s.feat || [];
  // treads
  const L = s.tL, R = 15 - s.tL;
  for (let y = s.tT; y <= s.tB; y++) {
    if (y === s.tT || y === s.tB) {
      set(L + 1, y, 3); set(L + 2, y, 3); set(R - 1, y, 3); set(R - 2, y, 3);
      continue;
    }
    const st = ((y + frame) & 1) === 0;
    set(L, y, st ? 1 : 3); set(L + 1, y, st ? 1 : 2); set(L + 2, y, st ? 2 : 3);
    set(R, y, st ? 2 : 3); set(R - 1, y, st ? 1 : 2); set(R - 2, y, st ? 1 : 3);
  }
  // hull
  for (let y = s.bT; y <= s.bB; y++) {
    for (let x = s.bL; x <= s.bR; x++) {
      let c = 2;
      if (x === s.bL || y === s.bT) c = 1;
      if (x === s.bR || y === s.bB) c = 3;
      set(x, y, c);
    }
  }
  if (f.includes('slant')) {
    set(s.bL, s.bT, 0); set(s.bR, s.bT, 0);
    set(s.bL, s.bT + 1, 1); set(s.bR, s.bT + 1, 3);
  }
  if (f.includes('plates')) {
    for (const yy of [s.bT + 2, s.bB - 2]) for (let x = s.bL + 1; x < s.bR; x++) set(x, yy, 3);
  }
  if (f.includes('rear')) { set(s.bL + 1, s.bB - 1, 3); set(s.bR - 1, s.bB - 1, 3); set(s.bL + 2, s.bB - 1, 3); set(s.bR - 2, s.bB - 1, 3); }
  if (f.includes('stripe')) {
    for (let y = Math.ceil(s.cy + s.r); y < s.bB; y++) { set(7, y, 3); set(8, y, 1); }
  }
  // turret
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const dx = x + 0.5 - 8, dy = y + 0.5 - s.cy, d = Math.hypot(dx, dy);
      if (d <= s.r) {
        let c;
        if (d > s.r - 1) c = (dx + dy < 0) ? 1 : 3;
        else c = (dx + dy < -1.2) ? 1 : 2;
        set(x, y, c);
      }
    }
  }
  // barrel
  for (let y = s.barT; y <= Math.floor(s.cy); y++) { set(7, y, 1); set(8, y, 2); }
  set(7, s.barT, 1); set(8, s.barT, 1);
  if (f.includes('muzzle')) { set(6, s.barT + 1, 1); set(9, s.barT + 1, 3); }
  return g;
}

// ------------------------------------------------------------------ misc sprite generators
function genEagle(destroyed) {
  const pal = { 1: '#FFFFFF', 2: '#ADADAD', 3: '#5C5C5C' };
  let rows;
  if (!destroyed) {
    const half = [
      '........',
      '2.......',
      '22....11',
      '222..113',
      '1222.111',
      '.1222111',
      '.1122211',
      '..112221',
      '...11222',
      '....1122',
      '.....122',
      '....2.11',
      '...2221.',
      '..22.222',
      '.22..222',
      '..333333',
    ];
    rows = half.map(r => r + r.split('').reverse().join(''));
  } else {
    rows = [
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '......2.........',
      '.....212..2.....',
      '....21212.12....',
      '...2121.1212.2..',
      '..21212121212.2.',
      '.2.212121.2121..',
      '..2121212121212.',
      '.21212121212121.',
      '2121212121212122',
      '3333333333333333',
    ];
  }
  return paintRows(rows, pal);
}

function genSparkle(size) {
  const g = newGrid(16);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const dx = Math.abs(x + 0.5 - 8), dy = Math.abs(y + 0.5 - 8);
    const arm = 2 * size;
    let inside = (dx <= 1 && dy <= arm) || (dy <= 1 && dx <= arm) || (dx + dy <= size + 1);
    if (inside) g[y][x] = (dx + dy < 2) ? 1 : (dx + dy < size + 1.5 ? 2 : 3);
  }
  return gridCanvas(g, [null, '#FFFFFF', '#BCD0FF', '#5878F8']);
}

function genShield(frame) {
  const g = newGrid(16);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const dx = x + 0.5 - 8, dy = y + 0.5 - 8, d = Math.hypot(dx, dy);
    if (d >= 6.3 && d <= 7.9) {
      const a = Math.atan2(dy, dx) + frame * 0.4;
      const seg = Math.floor(((a + Math.PI) / (Math.PI * 2)) * 12);
      if ((seg + frame) % 2 === 0) g[y][x] = d > 7.1 ? 1 : 2;
    }
  }
  return gridCanvas(g, [null, '#FFFFFF', '#ADADAD']);
}

function seeded(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

function genExplosion(size, R, seed) {
  const g = newGrid(size), rn = seeded(seed), c = size / 2;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const dx = x + 0.5 - c, dy = y + 0.5 - c, d = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
    const rr = R * (0.78 + 0.18 * Math.sin(a * 5 + seed) + 0.1 * Math.sin(a * 11 + seed * 3));
    const n = rn();
    if (d <= rr && n > 0.1) g[y][x] = d < rr * 0.38 ? 1 : (d < rr * 0.72 ? 2 : 3);
  }
  return gridCanvas(g, [null, '#FFFFFF', '#F83800', '#8C30E8']);
}

function pointInPoly(px, py, pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if (((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi)) inside = !inside;
  }
  return inside;
}

const PU_NAMES = ['HELMET', 'CLOCK', 'SHOVEL', 'STAR', 'GRENADE', 'TANK', 'GUN', 'SHIP'];

function genPowerupIcon(kind) {
  const ins = newGrid(16), det = newGrid(16);
  const star = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 3.1 : 7.6;
    star.push([8 + Math.cos(a) * r, 8.7 + Math.sin(a) * r]);
  }
  const tankMask = genTankGrid(TANK_SPECS.p0, 0);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const px = x + 0.5, py = y + 0.5;
    let i = false, d = false;
    switch (kind) {
      case 0: // helmet
        i = (py <= 10.5 && ((px - 8) / 6.4) ** 2 + ((py - 10.5) / 7.8) ** 2 <= 1) || (py > 10.5 && py <= 13 && px >= 1 && px <= 15);
        d = (py > 8 && py < 9.2 && px > 3 && px < 13) || (px > 7 && px < 9 && py > 3 && py < 8);
        break;
      case 1: // clock
        i = Math.hypot(px - 8, py - 9) <= 6.5 || (px >= 6 && px <= 10 && py >= 0.8 && py <= 2.8);
        d = ((x === 7 || x === 8) && y >= 5 && y <= 9) || ((y === 8 || y === 9) && x >= 8 && x <= 11) || (Math.abs(Math.hypot(px - 8, py - 9) - 5.6) < 0.45 && (x + y) % 3 === 0);
        break;
      case 2: { // shovel
        const blade = py >= 8 && py <= 15.2 && Math.abs(px - 8) <= 4.4 - Math.max(0, py - 12) * 1.3;
        i = (px >= 6.6 && px <= 9.4 && py >= 1 && py <= 9) || (px >= 4.5 && px <= 11.5 && py >= 0.8 && py <= 3.2) || blade;
        d = (px >= 6.6 && px <= 9.4 && py > 1.6 && py < 2.6) || (blade && x === 8 && y >= 10 && y <= 13);
        break;
      }
      case 3: // star
        i = pointInPoly(px, py, star);
        break;
      case 4: // grenade
        i = Math.hypot(px - 8, py - 10) <= 5.5 || (px >= 6 && px <= 10 && py >= 2.5 && py <= 5.5) || (px >= 9.5 && px <= 13.5 && py >= 2.5 && py <= 4.2);
        d = Math.hypot(px - 8, py - 10) <= 4.6 && (x === 6 || x === 9 || y === 9 || y === 12);
        break;
      case 5: // extra tank
        i = tankMask[y][x] !== 0;
        d = tankMask[y][x] === 3;
        break;
      case 6: { // gun (pistol)
        const gx = px - (py - 7.5) * 0.35;
        i = (px >= 1.5 && px <= 14.5 && py >= 4 && py <= 7.6) || (gx >= 9 && gx <= 12.6 && py >= 7.6 && py <= 14) || (px >= 2 && px <= 3.5 && py >= 2.6 && py <= 4);
        d = (py > 5.2 && py < 6.2 && px > 2 && px < 9) || (px >= 6.5 && px <= 8.5 && py >= 8 && py <= 10.5 && !(px > 7 && px < 8.2 && py < 10));
        if (px >= 6.5 && px <= 9 && py >= 7.6 && py <= 10.5) i = true;
        break;
      }
      case 7: { // ship
        const hull = py >= 9.5 && py <= 13.5 && px >= 0.8 + (py - 9.5) * 0.9 && px <= 15.2 - (py - 9.5) * 0.9;
        i = hull || (px >= 4.5 && px <= 11.5 && py >= 6 && py <= 9.5) || (px >= 7 && px <= 8.8 && py >= 1.2 && py <= 6) || (px >= 8.8 && px <= 12.2 && py >= 1.5 && py <= 4);
        d = (hull && y === 11) || (py > 7 && py < 8.4 && (x === 6 || x === 9));
        break;
      }
    }
    ins[y][x] = i ? 1 : 0;
    det[y][x] = d ? 1 : 0;
  }
  const g = newGrid(16);
  const inAt = (x, y) => x >= 0 && y >= 0 && x < 16 && y < 16 && ins[y][x];
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    if (ins[y][x]) {
      g[y][x] = det[y][x] ? 3 : ((!inAt(x + 1, y) || !inAt(x, y + 1)) ? 2 : 1);
    } else if (inAt(x - 1, y) || inAt(x + 1, y) || inAt(x, y - 1) || inAt(x, y + 1)) {
      g[y][x] = 4;
    }
  }
  return gridCanvas(g, [null, '#FFFFFF', '#ADADAD', '#101010', '#D82800']);
}

function genHull(dir) {
  let g = newGrid(16);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const px = x + 0.5, py = y + 0.5;
    const w = py < 5 ? (py * 1.6) : 8;
    if (Math.abs(px - 8) <= w && py <= 15.5) {
      const edge = Math.abs(px - 8) > w - 1.2 || py > 14.5;
      g[y][x] = edge ? 1 : 2;
    }
  }
  for (let i = 0; i < dir; i++) g = rotGrid(g);
  return gridCanvas(g, [null, '#E8F0FF', '#2C48F0']);
}

function genBullet(dir) {
  let g = newGrid(4);
  const rows = ['.12.', '1221', '1221', '.22.'];
  for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) g[y][x] = rows[y][x] === '.' ? 0 : +rows[y][x];
  for (let i = 0; i < dir; i++) g = rotGrid(g);
  return gridCanvas(g, [null, '#FFFFFF', '#ADADAD']);
}

// ------------------------------------------------------------------ sprite registry
const Sprites = {
  cache: new Map(),
  tex: {},
  init() {
    Font.init();
    for (const k in TEX_SRC) this.tex[k] = paintRows(TEX_SRC[k].rows, TEX_SRC[k].colors);
    this.eagle = genEagle(false);
    this.eagleDead = genEagle(true);
    this.sparkle = [1, 2, 3, 4].map(genSparkle);
    this.shield = [0, 1].map(genShield);
    this.smallExp = [genExplosion(16, 3.5, 3), genExplosion(16, 5.5, 7), genExplosion(16, 7.6, 11)];
    this.bigExp = [genExplosion(32, 11, 5), genExplosion(32, 15, 9)];
    this.powerups = [0, 1, 2, 3, 4, 5, 6, 7].map(genPowerupIcon);
    this.hull = [0, 1, 2, 3].map(genHull);
    this.bullet = [0, 1, 2, 3].map(genBullet);
    const icon = [
      '...XX...',
      'X..XX..X',
      'XXXXXXXX',
      'XXX..XXX',
      'XXX..XXX',
      'XXXXXXXX',
      'X......X',
      '........',
    ];
    this.enemyIcon = paintRows(icon, { X: '#000000' });
    this.lifeIcon = paintRows(icon, { X: '#E45C10' });
    this.flag = paintRows([
      '..3.............',
      '..3111111111....',
      '..31111111111...',
      '..311111111111..',
      '..3111111111111.',
      '..311111111111..',
      '..31111111111...',
      '..3111111111....',
      '..3.............',
      '..3.............',
      '..3.............',
      '..3.............',
      '..3.............',
      '..3.............',
      '.333............',
      '33333...........',
    ], { 1: '#E45C10', 3: '#000000' });
    this.brickPattern = null;
  },
  tank(spec, frame, dir, pal) {
    const k = spec + frame + dir + pal;
    let c = this.cache.get(k);
    if (!c) {
      let g = genTankGrid(TANK_SPECS[spec], frame);
      for (let i = 0; i < dir; i++) g = rotGrid(g);
      c = gridCanvas(g, PALS[pal]);
      this.cache.set(k, c);
    }
    return c;
  },
  mini(text) {
    const k = 'mini' + text;
    let c = this.cache.get(k);
    if (!c) {
      c = makeCanvas(text.length * 4, 5);
      const x = c.getContext('2d');
      x.fillStyle = '#FFFFFF';
      for (let i = 0; i < text.length; i++) {
        const d = MINI_DIGITS[text[i]];
        if (!d) continue;
        for (let r = 0; r < 5; r++) for (let q = 0; q < 3; q++) if (d[r][q] === 'X') x.fillRect(i * 4 + q, r, 1, 1);
      }
      this.cache.set(k, c);
    }
    return c;
  },
  bricks(ctx) {
    if (!this.brickPattern) this.brickPattern = ctx.createPattern(this.tex.brick, 'repeat');
    return this.brickPattern;
  },
};
