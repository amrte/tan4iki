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
  // new enemy tanks
  rocket: [null, '#FCE4A0', '#E46818', '#7C1C00'],
  shieldE: [null, '#D8F0FC', '#5C94FC', '#0028A0'],
  sapper: [null, '#F8E8A0', '#AC9C3C', '#4C3C00'],
  shade: [null, '#E8D0FC', '#9064D8', '#381870'],
  // from the new-enemies design canvas
  mason: [null, '#F8B800', '#3880D8', '#101820'],
  mortar: [null, '#F0D090', '#8C6C44', '#141414'],
  skimmer: [null, '#B8F0F8', '#2C8CB8', '#0C1420'],
  flamer: [null, '#F8B848', '#C83C20', '#1C0C08'],
  splitter: [null, '#E8F8F8', '#58A0C8', '#101018'],
  medic: [null, '#D82800', '#E8E8E0', '#181418'],
  jammer: [null, '#F8F8F8', '#686878', '#101018'],
  spotter: [null, '#F83800', '#C87C28', '#18100C'],
  snake: [null, '#B8F818', '#38A800', '#004000', '#F83800'],
};

// round scaly body segment for the snake (d = diameter)
function snakeSegment(d) {
  const g = [], c = d / 2;
  for (let y = 0; y < d; y++) {
    const row = [];
    for (let x = 0; x < d; x++) {
      const r = Math.hypot(x + 0.5 - c, y + 0.5 - c);
      row.push(r > c ? 0 : r > c - 1.1 ? 3 : (x + y * 2) % 4 === 0 ? 1 : 2);
    }
    g.push(row);
  }
  return g;
}

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

// build a framed 16x16 power-up icon from a 12x11 shape mask
function framedIcon(mask) {
  const inside = (x, y) => y >= 0 && y < 11 && x >= 0 && x < 12 && mask[y][x] === 'X';
  const rows = ['................', '.11111111111112.', '1.............13'];
  for (let y = 0; y < 11; y++) {
    let r = '';
    for (let x = 0; x < 12; x++) {
      if (inside(x, y)) r += (inside(x + 1, y) && inside(x, y + 1)) ? '1' : '2';
      else r += inside(x - 1, y - 1) || inside(x - 1, y) || inside(x, y - 1) ? '.' : '3';
    }
    rows.push('1.' + r + '13');
  }
  rows.push('2111111111111123', '.33333333333333.');
  return rows;
}
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

// ------------------------------------------------------------------ rank (XP level) looks
// Extra palette entries used by the rank decorations; 1-3 stay the player's own colours.
const RANK_INK = { 4: '#F8F8F8', 5: '#BCBCBC', 6: '#6C6C6C', 7: '#F8D030', 8: '#000000' };

// Paint rank details onto a tank grid (facing up), level 1-10:
//   2-3 white stripes on the engine deck · 4+ radio antenna · 5+ armour skirts while the plate holds
//   6+ stripes turn gold · 7+ star on the turret · 8+ gold-trimmed skirts · 9+ second antenna
//   10 all-gold skirts (and an animated glow, drawn in Stage.drawTank)
function decorateTank(rows, level, plate) {
  const g = parseGrid(rows);
  let minX = 16, maxX = -1, minY = 16, maxY = -1;
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if (g[y][x]) {
    minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  }
  const ink = level >= 6 ? 7 : 4, K = 8;
  // engine-deck stripes: short bars across the back of the hull, with black gaps so they read on any colour
  let rear = maxY;
  while (rear > minY && !(g[rear][7] && g[rear][8])) rear--;
  const stripes = Math.min(2, level - 1);
  for (let s = 0; s < stripes; s++) {
    for (let x = 6; x <= 9; x++) {
      if (g[rear - s * 2][x]) g[rear - s * 2][x] = ink;
      if (g[rear - s * 2 - 1][x]) g[rear - s * 2 - 1][x] = K;
    }
  }
  // star on the turret: a small black-edged diamond
  if (level >= 7) {
    const cy = Math.round((minY + maxY) / 2) - 1;
    ['.KK.', 'KSSK', 'KSSK', '.KK.'].forEach((r, j) => {
      for (let i = 0; i < 4; i++) if (r[i] !== '.') g[cy + j][6 + i] = r[i] === 'K' ? K : 7;
    });
  }
  // armour skirts: a riveted steel plate outside each track
  const skirt = plate && (level >= 5 || plate === 2);   // 2: a plate below level 5 (the easiest skill's free plate)
  if (skirt) {
    for (const x of [minX - 1, maxX + 1]) {
      if (x < 0 || x > 15) continue;
      for (let y = minY + 1; y <= maxY - 1; y++) {
        const edge = y === minY + 1 || y === maxY - 1;
        const rivet = (y - minY) % 3 === 0;
        g[y][x] = level >= 10 ? (rivet ? 8 : 7) : level >= 8 && edge ? 7 : rivet ? 6 : 5;
      }
    }
  }
  // radio antennas at the rear corners
  const whip = x => { g[Math.min(15, maxY)][x] = 4; if (maxY < 15) g[maxY + 1][x] = 4; };
  if (level >= 4) whip(Math.max(0, minX - (skirt ? 1 : 0)));
  if (level >= 9) whip(Math.min(15, maxX + (skirt ? 1 : 0)));
  return g;
}

// ------------------------------------------------------------------ Claude
// The Claude sparkle: an orange starburst of uneven rays. frame 0/1 nudges the rays (a little walk wobble).
const CLAUDE_INK = [null, '#F0A080', '#D97757', '#A8503A'];
function claudeGrid(n, frame) {
  const rays = 12, len = [1, 0.7, 0.92, 0.64, 0.97, 0.76, 1, 0.68, 0.9, 0.6, 0.95, 0.74], c = n / 2, R = n / 2 - 0.2;
  const phase = frame ? 0.2 : 0;
  const g = [];
  for (let y = 0; y < n; y++) {
    const row = [];
    for (let x = 0; x < n; x++) {
      const dx = x + 0.5 - c, dy = y + 0.5 - c, r = Math.hypot(dx, dy);
      let a = Math.atan2(dy, dx) / (Math.PI * 2) * rays - phase;
      const k = ((Math.round(a) % rays) + rays) % rays, d = (a - Math.round(a)) * (Math.PI * 2 / rays);
      const ray = Math.abs(r * Math.sin(d)) < (n > 12 ? 0.75 : 0.62) && Math.cos(d) > 0 && r < len[k] * R;
      row.push(r < 1.5 || ray ? (r < 1 ? 1 : 2) : 0);
    }
    g.push(row);
  }
  return g;
}

// enemy factory for big maps: 32px block with a chimney, windows and a door at the bottom
function factoryGrid() {
  const g = [];
  for (let y = 0; y < 32; y++) {
    const row = [];
    for (let x = 0; x < 32; x++) {
      let v = 0;
      if (y >= 6) {
        const edge = x === 0 || x === 31 || y === 6 || y === 31;
        v = edge ? 3 : 2;
        if (!edge && y < 10) v = (x + y) % 4 < 2 ? 1 : 2;                       // roof stripes
        if (y >= 12 && y <= 15 && x % 7 >= 2 && x % 7 <= 4) v = 3;              // windows
        if (y >= 22 && x >= 8 && x <= 23) v = (y - 22) % 3 === 2 ? 3 : 1;       // roller door
      }
      if (x >= 23 && x <= 27 && y < 7) v = x === 23 || x === 27 ? 3 : 2;        // chimney
      row.push(v);
    }
    g.push(row);
  }
  return g;
}

function genBullet(dir, color = '#C6C6C6') {
  return rotatedCanvas(['..1.', '.111', '.111', '.111'], dir, [null, color]);
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
    this.powerups = POWERUP_GRIDS.concat(NEW_POWERUP_MASKS.map(framedIcon)).map(r => g(r, POWERUP_PAL));
    this.baseIcons = BASE_ICON_MASKS.map(m => g(framedIcon(m), [null, '#FCE4A0', '#E45C10', '#7C1C00']));
    // power-ups 16-19: turret, Claude (an orange sparkle in the usual teal frame), revive, airstrike
    const claudeMask = claudeGrid(11, 0).map(r => '.' + r.map(v => (v ? 'X' : '.')).join('')).map(r => r.slice(0, 12));
    const claudeIcon = parseGrid(framedIcon(claudeMask));
    for (let y = 0; y < 11; y++) for (let x = 0; x < 12; x++) if (claudeMask[y][x] === 'X') claudeIcon[y + 3][x + 2] = claudeIcon[y + 3][x + 2] === 1 ? 5 : 4;
    this.powerups.push(
      g(framedIcon(EXTRA_POWERUP_MASKS.turret), POWERUP_PAL),
      gridCanvas(claudeIcon, POWERUP_PAL.concat(['#D97757', '#F0A080'])),
      g(framedIcon(EXTRA_POWERUP_MASKS.revive), POWERUP_PAL),
      g(framedIcon(EXTRA_POWERUP_MASKS.airstrike), POWERUP_PAL),
      g(framedIcon(EXTRA_POWERUP_MASKS.bridge), POWERUP_PAL),
      g(framedIcon(EXTRA_POWERUP_MASKS.smoke), POWERUP_PAL),
      g(framedIcon(EXTRA_POWERUP_MASKS.night), POWERUP_PAL));
    // wooden planks laid over water (8px pattern, drawn in 4px cells like the other terrain)
    this.mudTex = paintRows(['22122322', '21222232', '22232212', '32222122', '22122223', '22322122', '12222322', '22212232'],
      { 1: '#9C7038', 2: '#6C4818', 3: '#4C3008' });
    this.bridgeTex = paintRows(['33333333', '11111111', '22222222', '22222222', '33333333', '11111111', '22222222', '22222222'],
      { 1: '#E8A048', 2: '#B76506', 3: '#5C2C00' });
    this.claude = [0, 1].map(f => gridCanvas(claudeGrid(16, f), CLAUDE_INK));
    this.factory = [gridCanvas(factoryGrid(), [null, '#BCBCBC', '#7C7C7C', '#3C3C3C']), gridCanvas(factoryGrid(), [null, '#F8F8F8', '#F8B800', '#F83800'])];
    this.snakeSeg = [12, 8].map(d => gridCanvas(snakeSegment(d), PALS.snake));
    this.snakeSegHit = [12, 8].map(d => gridCanvas(snakeSegment(d), PALS.silver));
    this.turretBase = g(TURRET_BASE_GRID, [null, '#BCBCBC', '#7C7C7C', '#3C3C3C']);
    this.plane = [0, 1, 2, 3].map(d => rotatedCanvas(PLANE_GRID, (d + 3) % 4, [null, '#F8F8F8', '#ADADAD', '#505050']));
    this.mine = [g(MINE_GRID, [null, '#ADADAD', '#505050', '#E04030']), g(MINE_GRID, [null, '#ADADAD', '#505050', '#600000'])];
    this.hull = [0, 1, 2, 3].map(genHull);
    this.bullet = [0, 1, 2, 3].map(d => genBullet(d));
    this.bulletPierce = [0, 1, 2, 3].map(d => genBullet(d, '#58F8F8'));
    this.bulletRocket = [0, 1, 2, 3].map(d => genBullet(d, '#F87830'));
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
  // a capture-the-flag flag in a player's colour
  vsFlag(pal) {
    const k = 'vsflag' + pal;
    let c = this.cache.get(k);
    if (!c) { c = gridCanvas(parseGrid(FLAG_GRID), [null, PALS[pal][2], '#ADADAD']); this.cache.set(k, c); }
    return c;
  },
  // turret gun in a palette, aimed in dir
  turretGun(dir, pal) {
    const k = 'tg' + dir + pal;
    let c = this.cache.get(k);
    if (!c) { c = rotatedCanvas(TURRET_GUN_GRID, dir, PALS[pal]); this.cache.set(k, c); }
    return c;
  },
  // a player tank wearing its rank (XP level); plate = armour plate still intact
  rankTank(spec, frame, dir, pal, level, plate) {
    if (level <= 1 && !plate) return this.tank(spec, frame, dir, pal);
    const k = 'r' + spec + frame + dir + pal + level + 'p' + (plate || 0);
    let c = this.cache.get(k);
    if (!c) {
      let g = decorateTank(TANK_GRIDS[spec][frame], level, plate);
      for (let i = 0; i < dir; i++) g = rotGrid(g);
      c = gridCanvas(g, Object.assign([], PALS[pal], RANK_INK));
      this.cache.set(k, c);
    }
    return c;
  },
  // 1px outline around a sprite (level-10 glow)
  outline(src, color) {
    const k = src;
    let c = this.outlines && this.outlines.get(k);
    if (!this.outlines) this.outlines = new WeakMap();
    if (c && c.color === color) return c.canvas;
    const w = src.width, h = src.height, d = src.getContext('2d').getImageData(0, 0, w, h).data;
    const out = makeCanvas(w + 2, h + 2), x = out.getContext('2d');
    x.fillStyle = color;
    const on = (i, j) => i >= 0 && j >= 0 && i < w && j < h && d[(j * w + i) * 4 + 3] > 0;
    for (let j = -1; j <= h; j++) for (let i = -1; i <= w; i++) {
      if (on(i, j)) continue;
      if (on(i - 1, j) || on(i + 1, j) || on(i, j - 1) || on(i, j + 1)) x.fillRect(i + 1, j + 1, 1, 1);
    }
    this.outlines.set(k, { color, canvas: out });
    return out;
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
  // small tank icon in a player's colour (side panel with 3-4 players)
  playerIcon(pal) {
    const k = 'picon' + pal;
    let c = this.cache.get(k);
    if (!c) { c = gridCanvas(parseGrid(LIFE_ICON_GRID), [null, PALS[pal][2]]); this.cache.set(k, c); }
    return c;
  },
  bricks(ctx) {
    if (!this.brickPattern) this.brickPattern = ctx.createPattern(this.tex.brick, 'repeat');
    return this.brickPattern;
  },
};
