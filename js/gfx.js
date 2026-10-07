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

// tank palettes (light, mid, dark) as on the NES
const PALS = {
  p1: [null, '#E8F860', '#F8A848', '#708800'],
  p2: [null, '#B8F8D8', '#00A844', '#005800'],
  silver: [null, '#F8F8F8', '#C0C0C0', '#007880'],
  red: [null, '#F8F8F8', '#E04030', '#B00088'],
  green: [null, '#66FFE1', '#00B56E', '#008E06'],
  gold: [null, '#EAFC66', '#FEAC4E', '#778900'],
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


// ------------------------------------------------------------------ bitmap helpers
// rows of palette-index characters ('1'..'9', '.' transparent) -> numeric grid
function parseGrid(rows) {
  return rows.map(r => r.split('').map(ch => (ch === '.' ? 0 : +ch)));
}

function rotatedCanvas(rows, dir, pal) {
  let g = parseGrid(rows);
  for (let i = 0; i < dir; i++) g = rotGrid(g);
  return gridCanvas(g, pal);
}

function seeded(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

const PU_NAMES = ['HELMET', 'CLOCK', 'SHOVEL', 'STAR', 'GRENADE', 'TANK', 'GUN', 'SHIP'];
const EXPLOSION_PAL = [null, '#F8F8F8', '#E04030', '#B00088'];
const POWERUP_PAL = [null, '#F8F8F8', '#C0C0C0', '#007880'];

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
  return rotatedCanvas(['..1.', '.111', '.111', '.111'], dir, [null, '#C6C6C6']);
}

// ------------------------------------------------------------------ sprite registry
const Sprites = {
  cache: new Map(),
  tex: {},
  init() {
    Font.init();
    for (const k in TEX_SRC) this.tex[k] = paintRows(TEX_SRC[k].rows, TEX_SRC[k].colors);
    const g = (rows, pal) => gridCanvas(parseGrid(rows), pal);
    this.eagle = g(EAGLE_GRID, [null, '#808080', '#BB1C0E']);
    this.eagleDead = g(EAGLE_DEAD_GRID, [null, '#808080', '#B76506']);
    this.sparkle = SPARKLE_GRIDS.map(r => g(r, [null, '#F8F8F8']));
    this.shield = SHIELD_GRIDS.map(r => g(r, [null, '#F8F8F8']));
    this.smallExp = EXPLOSION_GRIDS.map(r => g(r, EXPLOSION_PAL));
    this.bigExp = BIG_EXPLOSION_GRIDS.map(r => g(r, EXPLOSION_PAL));
    this.powerups = POWERUP_GRIDS.map(r => g(r, POWERUP_PAL));
    this.hull = [0, 1, 2, 3].map(genHull);
    this.bullet = [0, 1, 2, 3].map(genBullet);
    this.enemyIcon = g(ENEMY_ICON_GRID, [null, '#000000']);
    this.lifeIcon = g(LIFE_ICON_GRID, [null, '#B76506']);
    this.flag = g(FLAG_GRID, [null, '#B76506', '#000000']);
    this.brickPattern = null;
  },
  tank(spec, frame, dir, pal) {
    const k = spec + frame + dir + pal;
    let c = this.cache.get(k);
    if (!c) {
      c = rotatedCanvas(TANK_GRIDS[spec][frame], dir, PALS[pal]);
      this.cache.set(k, c);
    }
    return c;
  },
  // score pop-up ("100" ... "500")
  mini(text) {
    const k = 'mini' + text;
    let c = this.cache.get(k);
    if (!c) {
      c = makeCanvas(text.length * 5 - 1, 7);
      const x = c.getContext('2d');
      x.fillStyle = '#F8F8F8';
      for (let i = 0; i < text.length; i++) {
        const d = POPUP_DIGITS[text[i]];
        if (!d) continue;
        for (let r = 0; r < 7; r++) for (let q = 0; q < 4; q++) if (d[r][q] === '1') x.fillRect(i * 5 + q, r, 1, 1);
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
