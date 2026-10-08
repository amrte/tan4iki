'use strict';
// =====================================================================
//  Mode title screens: when a game starts, its mode shows a pixel-art picture of its own before the first stage,
//  with the mode's name, what it is about, and the tune that goes with it (music.js plays it, in the version for
//  your skill). Enter or fire moves on, Escape goes back to the title, and after a few seconds it moves on by itself.
//  Not shown for the daily challenge or when testing a level from the editor. Settings -> GAME -> MODE TITLE SCREENS.
//  The pictures are drawn at 112x64 and shown at double size, so every pixel is a chunky 2x2 block.
// =====================================================================

const INTRO_W = 112, INTRO_H = 64, INTRO_X = 16, INTRO_Y = 38, INTRO_TIME = 480, MUSIC_DELAY = 150;

// little drawing helpers (in the picture's own 112x64 pixels)
const Pix = {
  rect(c, x, y, w, h, col) { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), w, h); },
  // a filled circle, row by row
  disc(c, cx, cy, r, col) {
    c.fillStyle = col;
    for (let dy = -r; dy <= r; dy++) {
      const w = Math.floor(Math.sqrt(r * r - dy * dy) + 0.3);
      c.fillRect(cx - w, cy + dy, 2 * w + 1, 1);
    }
  },
  line(c, x0, y0, x1, y1, col, w = 1) {
    c.fillStyle = col;
    const n = Math.max(1, Math.abs(x1 - x0), Math.abs(y1 - y0));
    for (let k = 0; k <= n; k++) c.fillRect(Math.round(x0 + (x1 - x0) * k / n), Math.round(y0 + (y1 - y0) * k / n), w, w);
  },
  // a texture (8x8) tiled over a rectangle
  tiles(c, tex, x, y, w, h) {
    for (let yy = 0; yy < h; yy += 8) for (let xx = 0; xx < w; xx += 8) {
      const tw = Math.min(8, w - xx), th = Math.min(8, h - yy);
      c.drawImage(tex, 0, 0, tw, th, x + xx, y + yy, tw, th);
    }
  },
  spr(c, img, x, y, flip) {
    if (!flip) { c.drawImage(img, Math.round(x), Math.round(y)); return; }
    c.save(); c.translate(Math.round(x) + img.width, Math.round(y)); c.scale(-1, 1); c.drawImage(img, 0, 0); c.restore();
  },
  // horizontal colour bands with a dithered seam between them (an NES sky)
  bands(c, y, h, cols) {
    const bh = h / cols.length;
    cols.forEach((col, i) => {
      Pix.rect(c, 0, y + Math.round(i * bh), INTRO_W, Math.ceil(bh), col);
      if (i) { c.fillStyle = cols[i - 1]; for (let x = i % 2; x < INTRO_W; x += 2) c.fillRect(x, y + Math.round(i * bh), 1, 1); }
    });
  },
  stars(c, n, seed, t, h) {
    const r = seeded(seed);
    for (let k = 0; k < n; k++) {
      const x = Math.floor(r() * INTRO_W), y = Math.floor(r() * h), ph = Math.floor(r() * 64);
      if ((t + ph) % 64 < 6) continue;
      Pix.rect(c, x, y, 1, 1, (t + ph) % 64 < 12 ? '#7C7C7C' : '#F8F8F8');
    }
  },
  // a pixel grid ('.' empty, other characters looked up in pal)
  grid(c, rows, x, y, pal, s = 1) {
    rows.forEach((row, j) => { for (let i = 0; i < row.length; i++) if (pal[row[i]]) Pix.rect(c, x + i * s, y + j * s, s, s, pal[row[i]]); });
  },
  boom(c, x, y, f) {
    const e = f < 4 ? Sprites.smallExp[Math.min(Sprites.smallExp.length - 1, f)] : Sprites.bigExp[Math.min(Sprites.bigExp.length - 1, (f - 4) >> 1)];
    c.drawImage(e, Math.round(x + 8 - e.width / 2), Math.round(y + 8 - e.height / 2));
  },
};

const SKULL = ['....XXXXXXXX....', '..XXXXXXXXXXXX..', '.XXXXXXXXXXXXXX.', '.XXXXXXXXXXXXXX.', 'XXX...XXXX...XXX', 'XX.....XX.....XX',
  'XX..r..XX..r..XX', 'XXX...XXXX...XXX', '.XXXXXX..XXXXXX.', '..XXXXX..XXXXX..', '...XXXXXXXXXX...', '...X.X.XX.X.X...', '...XXXXXXXXXX...', '....XXXXXXXX....'];
const TROPHY = ['YYYYYYYYYYYY', 'yYYWYYYYYYYy', 'y.YWYYYYYY.y', 'y.YYYYYYYY.y', '.yYYYYYYYYy.', '..YYYYYYYY..', '...YYYYYY...', '....YYYY....',
  '.....YY.....', '.....YY.....', '....dddd....', '...dddddd...'];
const PENCIL = ['......pp', '.....pPP', '....YyPp', '...YyY..', '..YyY...', '.YyY....', 'kwY.....', 'kk......'];
const TOWER = ['ss.bbbb.ss', 's..b..b..s', '..ffbbff..', 'ww.b..b.ww', 'ww.bbbb.ww', '..i....i..'];

// the maze picture's maze (made once): 18 x 10 cells, a block to a pixel
let introMazeCache = null;
function introMaze() {
  if (introMazeCache) return introMazeCache;
  const m = mazeLayout(18, 10, seeded(1987)), r = seeded(42);
  m.patrol = [];
  for (let k = 0; k < 7; k++) m.patrol.push([1 + Math.floor(r() * 16), Math.floor(r() * 9)]);
  introMazeCache = m;
  return m;
}

// the bigmaps world (made once): value noise turned into water, forest, bricks and steel
let introWorld = null;
function introWorldMap() {
  if (introWorld) return introWorld;
  const W = 224, H = 64, r = seeded(1990), g = [];
  for (let k = 0; k < (W / 8 + 2) * (H / 8 + 2); k++) g.push(r());
  const at = (i, j) => g[j * (W / 8 + 2) + i];
  const noise = (x, y) => {
    const i = Math.floor(x / 8), j = Math.floor(y / 8), fx = (x % 8) / 8, fy = (y % 8) / 8;
    return at(i, j) * (1 - fx) * (1 - fy) + at(i + 1, j) * fx * (1 - fy) + at(i, j + 1) * (1 - fx) * fy + at(i + 1, j + 1) * fx * fy;
  };
  const c = makeCanvas(W, H), x = c.getContext('2d');
  for (let yy = 0; yy < H; yy++) for (let xx = 0; xx < W; xx++) {
    const n = noise(xx, yy), q = r();
    x.fillStyle = n < 0.28 ? (q < 0.15 ? '#3C64F8' : '#2038C8') : n > 0.72 ? (q < 0.3 ? '#005800' : '#00A800')
      : n > 0.6 && q < 0.4 ? '#A44400' : n > 0.4 && n < 0.44 && q < 0.5 ? '#BCBCBC' : q < 0.03 ? '#1C1C1C' : '#000000';
    x.fillRect(xx, yy, 1, 1);
  }
  introWorld = c;
  return c;
}

// one picture per mode: draw(c, t) on the 112x64 canvas, t = frames since the screen opened
const INTRO_SCENES = {
  // the classic: your tank by the eagle's brick fortress, shooting the enemy tanks as they come down
  classic(c, t) {
    const tex = Sprites.tex;
    Pix.rect(c, 0, 0, INTRO_W, INTRO_H, '#000000');
    Pix.tiles(c, tex.brick, 8, 0, 8, 24); Pix.tiles(c, tex.brick, 88, 0, 8, 24); Pix.tiles(c, tex.brick, 72, 16, 8, 16);
    Pix.tiles(c, tex.steel, 56, 16, 8, 8);
    Pix.tiles(c, (t >> 5) & 1 ? tex.water1 : tex.water0, 0, 40, 16, 24);
    Pix.tiles(c, tex.brick, 40, 40, 32, 8); Pix.tiles(c, tex.brick, 40, 48, 8, 16); Pix.tiles(c, tex.brick, 64, 48, 8, 16);
    c.drawImage(Sprites.eagle, 48, 48);
    const cyc = t % 120, ey = Math.min(18, -16 + cyc * 0.7);
    c.drawImage(Sprites.tank('p0', (t >> 2) & 1, 0, Config.playerPal(0)), 24, 40);
    if (cyc < 56) c.drawImage(Sprites.tank('e0', (t >> 2) & 1, 2, 'silver'), 24, ey);
    if (cyc >= 34 && cyc < 56) c.drawImage(Sprites.bullet[0], 30, 38 - (cyc - 34) * 1.4);
    if (cyc >= 56 && cyc < 76) Pix.boom(c, 24, 18, (cyc - 56) >> 1);
    // a second one rolls down on the right, sparkles where the next one will appear
    c.drawImage(Sprites.tank('e2', (t >> 3) & 1, 2, (t >> 3) & 1 ? 'red' : 'silver'), 96, ((t >> 1) % 90) - 20);
    const sp = Sprites.sparkle[(t >> 2) % Sprites.sparkle.length];
    c.drawImage(sp, 56, 0);
  },

  // your own levels: a blueprint, tiles going down one by one, a pencil, the palette
  custom(c, t) {
    Pix.rect(c, 0, 0, INTRO_W, INTRO_H, '#0C2C74');
    for (let x = 0; x < INTRO_W; x += 8) Pix.rect(c, x, 0, 1, INTRO_H, x % 16 ? '#183C90' : '#2C5CC0');
    for (let y = 0; y < INTRO_H; y += 8) Pix.rect(c, 0, y, INTRO_W, 1, y % 16 ? '#183C90' : '#2C5CC0');
    const tex = Sprites.tex, kind = { b: tex.brick, s: tex.steel, f: tex.forest, w: (t >> 5) & 1 ? tex.water1 : tex.water0, i: tex.ice };
    const cells = [];
    TOWER.forEach((row, j) => { for (let i = 0; i < row.length; i++) if (kind[row[i]]) cells.push([i, j, row[i]]); });
    const n = Math.floor((t % (cells.length * 7 + 90)) / 7);
    cells.forEach(([i, j, k], q) => { if (q < n) c.drawImage(kind[k], 8 + i * 8, 8 + j * 8); });
    // the palette on the right, the next tile's kind lit up
    const next = cells[Math.min(n, cells.length - 1)][2], pal = ['b', 's', 'f', 'w', 'i'];
    pal.forEach((k, q) => {
      Pix.rect(c, 95, 3 + q * 12, 12, 12, k === next && n < cells.length ? '#F8F8F8' : '#081C4C');
      c.drawImage(kind[k], 97, 5 + q * 12);
    });
    // the pencil, at the next tile
    if (n < cells.length) {
      const [i, j] = cells[n];
      Pix.grid(c, PENCIL, 8 + i * 8 + 4, 8 + j * 8 - 4 + ((t >> 3) & 1), { p: '#F878B8', P: '#B8588C', Y: '#F8B800', y: '#C07000', w: '#F8E8C0', k: '#000000' });
    }
  },

  // the last stand: your eagle behind steel, wave after wave closing in under a red sky
  survival(c, t) {
    Pix.bands(c, 0, INTRO_H, ['#280000', '#3C0800', '#501000', '#3C0800', '#280000']);
    const r = seeded(7);
    for (let k = 0; k < 40; k++) Pix.rect(c, Math.floor(r() * INTRO_W), Math.floor(r() * INTRO_H), 2, 1, '#180000');
    const tex = Sprites.tex;
    Pix.tiles(c, tex.steel, 40, 12, 32, 8); Pix.tiles(c, tex.steel, 40, 44, 32, 8);
    Pix.tiles(c, tex.steel, 40, 20, 8, 24); Pix.tiles(c, tex.steel, 64, 20, 8, 24);
    c.drawImage(Sprites.eagle, 48, 24);
    // eight tanks close in from all sides; each wave is a little nearer before it goes up in smoke
    const cyc = t % 150, wave = 1 + Math.floor(t / 150);
    for (let k = 0; k < 8; k++) {
      const a = k * Math.PI / 4 + 0.39, rr = 64 - Math.min(cyc, 110) * 0.3;
      const x = 56 + Math.cos(a) * rr * 1.2 - 8, y = 32 + Math.sin(a) * rr * 0.75 - 8;
      const dir = Math.abs(Math.cos(a) * 1.2) > Math.abs(Math.sin(a) * 0.75) ? (Math.cos(a) > 0 ? 3 : 1) : (Math.sin(a) > 0 ? 0 : 2);
      if (cyc < 112) c.drawImage(Sprites.tank('e' + (k % 4), (t >> 2) & 1, dir, k % 3 ? 'silver' : 'red'), x, y);
      else if (cyc < 130) Pix.boom(c, x, y, (cyc - 112) >> 1);
    }
    c.fillStyle = 'rgba(248,56,0,' + (0.08 + 0.06 * Math.sin(t / 10)) + ')';
    c.fillRect(0, 0, INTRO_W, INTRO_H);
    Pix.rect(c, 0, 0, 58, 10, '#000000');
    Font.draw(c, 'WAVE ' + wave, 1, 1, COL.gold);
  },

  // against the clock: a stopwatch, a tank flat out, the chequered line
  timeattack(c, t) {
    Pix.rect(c, 0, 0, INTRO_W, INTRO_H, '#08083C');
    const r = seeded(3);
    for (let k = 0; k < 16; k++) {
      const y = Math.floor(r() * INTRO_H), len = 6 + Math.floor(r() * 14), v = 1 + r() * 3;
      Pix.rect(c, INTRO_W - ((t * v + r() * 200) % (INTRO_W + len)), y, len, 1, k % 3 ? '#2838A0' : '#5C7CF8');
    }
    // the watch
    const cx = 30, cy = 34;
    Pix.rect(c, cx - 3, cy - 27, 7, 4, '#BCBCBC'); Pix.rect(c, cx - 1, cy - 24, 3, 2, '#7C7C7C');
    Pix.disc(c, cx, cy, 22, '#BCBCBC'); Pix.disc(c, cx, cy, 20, '#7C7C7C'); Pix.disc(c, cx, cy, 18, '#F8F8F8');
    for (let k = 0; k < 12; k++) {
      const a = k * Math.PI / 6, l = k % 3 ? 2 : 4;
      Pix.line(c, cx + Math.cos(a) * (17 - l), cy + Math.sin(a) * (17 - l), cx + Math.cos(a) * 16, cy + Math.sin(a) * 16, '#000000');
    }
    const a = t * Math.PI / 30 - Math.PI / 2;
    Pix.line(c, cx, cy, cx + Math.cos(a) * 14, cy + Math.sin(a) * 14, '#D82800');
    const b = t * Math.PI / 1800 - Math.PI / 2;
    Pix.line(c, cx, cy, cx + Math.cos(b) * 9, cy + Math.sin(b) * 9, '#000000');
    Pix.disc(c, cx, cy, 1, '#D82800');
    // the finish line and the tank racing for it
    for (let y = 0; y < INTRO_H; y += 4) for (let x = 0; x < 8; x += 4) Pix.rect(c, 100 + x, y, 4, 4, ((x + y) >> 2) & 1 ? '#F8F8F8' : '#000000');
    const tx = 54 + (t % 100) * 0.3;
    for (let k = 0; k < 3; k++) Pix.rect(c, tx - 4 - k * 5 - ((t >> 1) % 3), 34 + k * 4, 4, 1, '#ADADAD');
    c.drawImage(Sprites.tank('p0', (t >> 1) & 1, 1, Config.playerPal(0)), tx, 30);
    const s = Math.floor(t / 60), cs = Math.floor((t % 60) * 100 / 60);
    Pix.rect(c, 56, 52, 44, 10, '#000000');
    Font.draw(c, String(s % 60).padStart(2, '0') + '.', 58, 53, '#58F898');
    Font.draw(c, String(cs).padStart(2, '0'), 80, 53, '#00A844');
  },

  // a huge battlefield seen from above: the map scrolls by under a radar sweep
  bigmaps(c, t) {
    const w = introWorldMap(), off = Math.floor(t / 3) % w.width;
    c.drawImage(w, -off, 0); c.drawImage(w, w.width - off, 0);
    for (let x = 0; x < INTRO_W; x += 16) Pix.rect(c, x - (off % 16) + 15, 0, 1, INTRO_H, 'rgba(88,248,152,0.15)');
    for (let y = 0; y < INTRO_H; y += 16) Pix.rect(c, 0, y + 15, INTRO_W, 1, 'rgba(88,248,152,0.15)');
    // factories (red) and outposts (gold flags) on the map
    for (let k = 0; k < 6; k++) {
      const x = ((k * 41 + 13) % w.width) - off, xx = x < -8 ? x + w.width : x, y = 8 + (k * 23) % 46;
      if (k % 2) { Pix.rect(c, xx, y, 5, 4, (t >> 4) & 1 ? '#F83800' : '#A80000'); Pix.rect(c, xx + 3, y - 2, 1, 2, '#7C7C7C'); }
      else { Pix.rect(c, xx, y - 4, 1, 6, '#ADADAD'); Pix.rect(c, xx + 1, y - 4, 3, 2, COL.gold); }
    }
    // the radar sweep, centred on you
    const cx = 56, cy = 32;
    for (let k = 0; k < 6; k++) {
      const a = t * 0.06 - k * 0.07;
      Pix.line(c, cx, cy, cx + Math.cos(a) * 40, cy + Math.sin(a) * 40, k ? 'rgba(88,248,152,' + (0.4 - k * 0.06) + ')' : '#58F898');
    }
    Pix.rect(c, cx - 1, cy - 1, 3, 3, (t >> 3) & 1 ? COL.gold : '#F8F8F8');
    Pix.rect(c, 0, 0, INTRO_W, 1, '#58F898'); Pix.rect(c, 0, INTRO_H - 1, INTRO_W, 1, '#58F898');
  },

  // the eagle may be on any edge: a field with an eagle on each side and the spotlight moving round them
  sides(c, t) {
    Pix.rect(c, 0, 0, INTRO_W, INTRO_H, '#101010');
    Pix.stars(c, 24, 11, t, INTRO_H);
    const fx = 28, fy = 4, fw = 56, fh = 56;
    Pix.tiles(c, Sprites.tex.steel, fx - 4, fy - 4, fw + 8, 4); Pix.tiles(c, Sprites.tex.steel, fx - 4, fy + fh, fw + 8, 4);
    Pix.tiles(c, Sprites.tex.steel, fx - 4, fy, 4, fh); Pix.tiles(c, Sprites.tex.steel, fx + fw, fy, 4, fh);
    Pix.rect(c, fx, fy, fw, fh, '#000000');
    const spots = { top: [fx + 20, fy + 1], right: [fx + fw - 17, fy + 20], left: [fx + 1, fy + 20], bottom: [fx + 20, fy + fh - 17] };
    const order = ['left', 'top', 'right'], on = order[Math.floor(t / 50) % 3];
    for (const k in spots) {
      const [x, y] = spots[k];
      if (k === on) {
        c.drawImage(Sprites.eagle, x, y);
        c.drawImage(Sprites.outline(Sprites.eagle, (t >> 2) & 1 ? COL.gold : '#F8F8F8'), x - 1, y - 1);
      } else if (k === 'bottom') {
        Pix.line(c, x + 2, y + 2, x + 13, y + 13, '#D82800', 2); Pix.line(c, x + 13, y + 2, x + 2, y + 13, '#D82800', 2);
      } else Font.draw(c, '?', x + 4, y + 4, '#5C5C5C');
    }
    // a tank turning to face the new front
    c.drawImage(Sprites.tank('p0', 0, { left: 3, top: 0, right: 1 }[on], Config.playerPal(0)), fx + 20, fy + 20);
    // arrows going round the outside
    for (let k = 0; k < 4; k++) {
      const a = t * 0.04 + k * Math.PI / 2, x = 56 + Math.cos(a) * 50, y = 32 + Math.sin(a) * 28;
      const tx = -Math.sin(a), ty = Math.cos(a);
      Pix.line(c, x - tx * 4, y - ty * 4, x + tx * 3, y + ty * 3, COL.gold, 2);
      Pix.rect(c, x + tx * 4 - 1, y + ty * 4 - 1, 3, 3, COL.orange);
    }
  },

  // the endless climb: the map rolls down past your tank, the height counter keeps going up
  corridor(c, t) {
    const tex = Sprites.tex, off = t * 0.5, top = Math.floor(off / 8);
    Pix.rect(c, 0, 0, INTRO_W, INTRO_H, '#000000');
    for (let k = -1; k < 10; k++) {
      const row = top + k, y = 56 - k * 8 + (off % 8), r = seeded(row * 31 + 7);
      Pix.tiles(c, tex.steel, 16, y, 8, 8); Pix.tiles(c, tex.steel, 88, y, 8, 8);
      for (let i = 0; i < 8; i++) {
        const x = 24 + i * 8, q = r();
        if (i === 3 || i === 4) continue;   // the lane you drive up
        if (row % 14 === 6 && i < 6 && i > 0) c.drawImage((t >> 5) & 1 ? tex.water1 : tex.water0, x, y);
        else if (q < 0.28) c.drawImage(tex.brick, x, y);
        else if (q < 0.34) c.drawImage(tex.steel, x, y);
        else if (q < 0.44) c.drawImage(tex.forest, x, y);
      }
    }
    Pix.rect(c, 0, 0, 16, INTRO_H, '#1C1C1C'); Pix.rect(c, 96, 0, 16, INTRO_H, '#1C1C1C');
    for (let y = 0; y < INTRO_H; y += 8) Pix.rect(c, 98, (y + Math.floor(off)) % INTRO_H, 12, 1, '#3C3C3C');
    c.drawImage(Sprites.tank('p0', (t >> 2) & 1, 0, Config.playerPal(0)), 48 + Math.round(Math.sin(t / 30) * 2), 40);
    if (t % 160 < 100) c.drawImage(Sprites.tank('e1', (t >> 2) & 1, 2, 'silver'), 48, (t % 160) * 0.9 - 16 - 16);
    // height
    const h = Math.floor(off / 8);
    Pix.rect(c, 0, 0, 16, 64, '#000000');
    for (let k = 0; k < 7; k++) Pix.rect(c, 4, 4 + k * 8 + ((Math.floor(off) % 8)), 8, 1, '#7C7C7C');
    Pix.rect(c, 2, 28, 12, 9, '#000000');
    Font.draw(c, String(h % 100).padStart(2, '0'), 0, 29, COL.gold);
  },

  // the maze from above: a dot finds its way through, leaving a trail, red dots on patrol, the exit blinking
  maze(c, t) {
    const m = introMaze(), pal = { '@': '#9C9C9C', '#': '#B04C20', '%': '#00A800', '_': '#7CB8F8' };
    Pix.rect(c, 0, 0, INTRO_W, INTRO_H, '#000000');
    m.blocks.forEach((row, y) => { for (let x = 0; x < row.length; x++) if (pal[row[x]]) Pix.rect(c, x + 1, y + 1, 1, 1, pal[row[x]]); });
    const ctr = ([i, j]) => [i * 6 + 4 + 1, j * 6 + 4 + 1];
    const [ex, ey] = ctr(m.exit);
    if ((t >> 3) & 1) Pix.rect(c, ex - 2, ey - 2, 4, 4, '#58F898');
    // the way so far, and the dot on it
    const run = m.path.length - 1, pos = Math.min(run, (t % (run * 6 + 90)) / 6), k = Math.floor(pos);
    for (let q = 0; q < k; q++) Pix.line(c, ...ctr(m.path[q]), ...ctr(m.path[q + 1]), '#C07000');
    const [ax, ay] = ctr(m.path[k]), [bx, by] = ctr(m.path[Math.min(run, k + 1)]), f = pos - k;
    Pix.rect(c, Math.round(ax + (bx - ax) * f) - 1, Math.round(ay + (by - ay) * f) - 1, 3, 3, COL.gold);
    // patrols, pacing up and down their passages
    m.patrol.forEach(([i, j], n) => {
      const [x, y] = ctr([i, j]), d = Math.round(Math.sin(t / 20 + n) * 1.5);
      Pix.rect(c, x - 1 + (n & 1 ? d : 0), y - 1 + (n & 1 ? 0 : d), 3, 3, (t + n * 7) % 40 < 34 ? '#F83800' : '#7C0800');
    });
    if (pos >= run && (t >> 3) & 1) { Pix.rect(c, 30, 26, 52, 11, '#000000'); Font.draw(c, 'ESCAPED', 29, 28, COL.gold); }
  },

  // the fortress: towers along a winding road, tanks marching on the eagle, shells and lightning flying
  fortress(c, t) {
    Pix.rect(c, 0, 0, INTRO_W, INTRO_H, '#14280C');
    const r = seeded(31);
    for (let k = 0; k < 50; k++) Pix.rect(c, Math.floor(r() * INTRO_W), Math.floor(r() * INTRO_H), 1, 1, '#1C3814');
    // the road: in from the left, down, and on to the eagle
    const road = [[-16, 8], [52, 8], [52, 40], [100, 40]];
    for (let k = 1; k < road.length; k++) {
      const [x0, y0] = road[k - 1], [x1, y1] = road[k];
      Pix.rect(c, Math.min(x0, x1), Math.min(y0, y1), Math.abs(x1 - x0) + 16, Math.abs(y1 - y0) + 16, '#4C3C1C');
    }
    Pix.tiles(c, Sprites.tex.brick, 92, 32, 20, 4); Pix.tiles(c, Sprites.tex.brick, 92, 36, 4, 28);
    c.drawImage(Sprites.eagle, 96, 44);
    const fake = { frame: t, towers: [] }, tower = (kind, x, y, ang, spec) => Stage.prototype.drawTower.call(fake, c, { kind, lv: 3, spec, ang, hp: 1, max: 1, busy: true }, x, y);
    // tanks along the road
    const pos = s => {
      let left = s;
      for (let k = 1; k < road.length; k++) {
        const [x0, y0] = road[k - 1], [x1, y1] = road[k], len = Math.abs(x1 - x0) + Math.abs(y1 - y0);
        if (left <= len) { const f = left / len; return [x0 + (x1 - x0) * f, y0 + (y1 - y0) * f, x1 > x0 ? 1 : y1 > y0 ? 2 : 3]; }
        left -= len;
      }
      return null;
    };
    const tanks = [];
    for (let k = 0; k < 4; k++) {
      const s = ((t * 0.35 + k * 34) % 150), p = pos(s);
      if (!p) continue;
      tanks.push(p);
      c.drawImage(Sprites.tank('e' + [0, 1, 3, 2][k], (t >> 2) & 1, p[2], k === 2 ? 'green' : 'silver'), Math.round(p[0]), Math.round(p[1]));
    }
    const near = (x, y) => tanks.reduce((b, p) => (!b || Math.hypot(p[0] - x, p[1] - y) < Math.hypot(b[0] - x, b[1] - y) ? p : b), null);
    // the towers and what they fire
    const T = [['gun', 30, 28, 0], ['tesla', 72, 18], ['cannon', 30, 46], ['frost', 72, 58 - 8], ['rocket', 4, 30, 1]];
    for (const [kind, x, y, spec] of T) {
      const p = near(x, y), ang = p ? Math.atan2(p[1] - y, p[0] - x) : 0;
      tower(kind, x, y, ang, spec);
      if (!p) continue;
      if (kind === 'tesla' && (t >> 2) % 6 < 2) Pix.line(c, x + 8, y + 2, p[0] + 8, p[1] + 8, (t & 2) ? '#F8F8A0' : '#FFFFFF');
      if (kind === 'gun' && (t >> 1) % 8 < 4) { const f = ((t >> 1) % 8) / 4; Pix.rect(c, x + 8 + (p[0] - x) * f, y + 8 + (p[1] - y) * f, 2, 2, '#F8F8F8'); }
      if (kind === 'frost') for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2 + t * 0.02; Pix.rect(c, x + 8 + Math.cos(a) * 18, y + 8 + Math.sin(a) * 18, 1, 1, '#7CC8F8'); }
    }
    // gold
    if ((t >> 3) & 1) { Pix.rect(c, 1, 1, 34, 9, '#000000'); Font.draw(c, '$' + (120 + (t >> 4) * 5), 2, 2, COL.gold); }
  },

  // the race: a chequered finish line, the cup, four tanks flat out for it
  race(c, t) {
    Pix.rect(c, 0, 0, INTRO_W, INTRO_H, '#3C3C3C');
    for (let x = 27; x < INTRO_W; x += 24) for (let y = 26 + ((t >> 1) % 8); y < INTRO_H; y += 8) Pix.rect(c, x, y, 1, 4, '#ADADAD');
    for (let x = 0; x < INTRO_W; x += 4) for (let y = 18; y < 26; y += 4) Pix.rect(c, x, y, 4, 4, ((x + y) >> 2) & 1 ? '#F8F8F8' : '#000000');
    Pix.rect(c, 0, 0, INTRO_W, 18, '#0C1C3C');
    Pix.stars(c, 10, 21, t, 18);
    Pix.grid(c, TROPHY, 50, 2, { Y: '#F8B800', y: '#C07000', W: '#F8F8F8', d: '#7C4C00' }, 1);
    // waving flags beside the cup
    for (const [fx, flip] of [[16, false], [80, true]]) {
      Pix.rect(c, fx + (flip ? 16 : 0), 1, 1, 17, '#ADADAD');
      for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) {
        const x = flip ? fx + 12 - i * 4 : fx + 1 + i * 4, y = 2 + j * 4 + Math.round(Math.sin(t / 6 + i) * 1.2);
        Pix.rect(c, x, y, 4, 4, (i + j) & 1 ? '#000000' : '#F8F8F8');
      }
    }
    const cyc = t % 200, speeds = [0.27, 0.25, 0.29, 0.23];
    for (let i = 0; i < 4; i++) {
      const y = Math.max(22, 48 - cyc * speeds[(i + Math.floor(t / 200)) % 4]);
      c.drawImage(Sprites.tank('p' + i, (t >> 1) & 1, 0, Config.playerPal(i)), 4 + i * 28, y);
      if (y <= 22 && (t >> 3) & 1) Pix.rect(c, 4 + i * 28 + 6, 44, 4, 4, COL.gold);
    }
  },

  // eagle against eagle, lightning between them
  eagles(c, t) {
    const p1 = PALS[Config.playerPal(0)], p2 = PALS[Config.playerPal(1)];
    Pix.bands(c, 0, 44, ['#000000', '#08081C', '#101030']);
    Pix.stars(c, 20, 9, t, 40);
    Pix.bands(c, 44, 20, ['#1C1C1C', '#0C0C0C']);
    for (const [x, pal, flip] of [[4, p1, false], [76, p2, true]]) {
      Pix.rect(c, x, 8, 32, 40, pal[3]);
      Pix.rect(c, x + 2, 10, 28, 36, '#000000');
      c.save(); c.translate(x + 16, 28); c.scale(flip ? -2 : 2, 2); c.drawImage(Sprites.eagle, -8, -8); c.restore();
      Pix.tiles(c, Sprites.tex.brick, x, 48, 32, 8);
    }
    // lightning: a new crooked bolt every few frames
    if ((t >> 1) % 6 < 4) {
      const r = seeded(Math.floor(t / 4) + 5);
      let x = 38, y = 26 + Math.floor(r() * 6);
      const col = (t >> 1) & 1 ? '#F8F8F8' : '#F8D878';
      while (x < 74) {
        const nx = Math.min(74, x + 4 + Math.floor(r() * 5)), ny = 20 + Math.floor(r() * 16);
        Pix.line(c, x, y, nx, ny, col, 2);
        x = nx; y = ny;
      }
    }
    Font.draw(c, 'VS', 49, 50, (t >> 4) & 1 ? COL.gold : COL.red);
  },

  // no mercy: a skull, crossed cannons, a tank in every corner firing
  dm(c, t) {
    Pix.bands(c, 0, INTRO_H, ['#180000', '#280000', '#380000', '#280000', '#180000']);
    Pix.line(c, 26, 6, 86, 58, '#3C3C3C', 5); Pix.line(c, 86, 6, 26, 58, '#3C3C3C', 5);
    Pix.line(c, 26, 6, 86, 58, '#7C7C7C', 2); Pix.line(c, 86, 6, 26, 58, '#7C7C7C', 2);
    Pix.grid(c, SKULL, 40, 4, { X: '#F8F8F8', r: (t >> 3) & 1 ? '#F83800' : '#000000' }, 2);
    const corners = [[2, 2, 1], [94, 2, 3], [2, 46, 1], [94, 46, 3]];
    corners.forEach(([x, y, dir], i) => {
      c.drawImage(Sprites.tank('p' + i, (t >> 3) & 1, dir, Config.playerPal(i)), x, y);
      const ph = (t + i * 20) % 80;
      if (ph < 3) Pix.disc(c, dir === 1 ? x + 17 : x - 2, y + 7, 2, COL.gold);
      if (ph < 24) c.drawImage(Sprites.bullet[dir], dir === 1 ? x + 17 + ph * 1.5 : x - 5 - ph * 1.5, y + 6);
      else if (ph < 32) Pix.boom(c, dir === 1 ? x + 10 + 36 : x - 36 - 10, y, (ph - 24) >> 1);
    });
  },

  // capture the flag: a tank runs the enemy flag home, the other gives chase
  ctf(c, t) {
    Pix.rect(c, 0, 0, INTRO_W, INTRO_H, '#1C3C10');
    const r = seeded(17);
    for (let k = 0; k < 60; k++) Pix.rect(c, Math.floor(r() * INTRO_W), Math.floor(r() * INTRO_H), 1, 2, r() < 0.5 ? '#2C5C18' : '#102808');
    Pix.rect(c, 0, 30, INTRO_W, 12, '#4C3C1C');
    for (let x = 0; x < INTRO_W; x += 8) Pix.rect(c, x + 2, 35, 4, 1, '#6C5428');
    const pal1 = Config.playerPal(0), pal2 = Config.playerPal(1), cyc = t % 240, carry = cyc < 180;
    const caps = Math.floor(t / 240) % 4;
    // the two bases
    Pix.tiles(c, Sprites.tex.steel, 0, 8, 20, 4); Pix.tiles(c, Sprites.tex.steel, 92, 8, 20, 4);
    c.drawImage(Sprites.vsFlag(pal1), 2, 12 + ((t >> 4) & 1));
    if (!carry) c.drawImage(Sprites.vsFlag(pal2), 94, 12 + ((t >> 4) & 1));
    // the runner, with their flag, and the chaser behind
    const x = carry ? 86 - cyc * 0.42 : 10;
    c.drawImage(Sprites.tank('p0', (t >> 2) & 1, 3, pal1), x, 28);
    if (carry) c.drawImage(Sprites.vsFlag(pal2), x + 4, 14 + ((t >> 3) & 1));
    else if ((t >> 3) & 1) Font.draw(c, 'CAPTURE!', 26, 50, COL.gold);
    if (carry) c.drawImage(Sprites.tank('p1', (t >> 2) & 1, 3, pal2), Math.min(96, x + 30 + Math.sin(t / 20) * 4), 28);
    Pix.rect(c, 40, 0, 32, 10, '#000000');
    Font.draw(c, caps + (carry ? 0 : 1) + '-0', 44, 1, '#F8F8F8');
  },

  // the computer: an old monitor with a face, the enemy HQ outlined in red
  cpu(c, t) {
    Pix.rect(c, 0, 0, INTRO_W, INTRO_H, '#0C0C1C');
    for (let y = 0; y < INTRO_H; y += 4) Pix.rect(c, 0, y, INTRO_W, 1, '#141428');
    // the monitor
    Pix.rect(c, 6, 4, 54, 44, '#C8B890'); Pix.rect(c, 6, 4, 54, 1, '#E8D8B0'); Pix.rect(c, 59, 4, 1, 44, '#887850');
    Pix.rect(c, 10, 8, 46, 32, '#081808');
    for (let y = 8; y < 40; y += 2) Pix.rect(c, 10, y, 46, 1, '#0C240C');
    const r = seeded(Math.floor(t / 6));
    for (let k = 0; k < 10; k++) Pix.rect(c, 12 + Math.floor(r() * 42), 10 + Math.floor(r() * 28), 1, 1, '#1C501C');
    const blink = t % 100 > 94, g = '#38F838';
    for (const ex of [20, 38]) Pix.rect(c, ex, blink ? 19 : 16, 7, blink ? 1 : 5, g);
    const mw = 10 + Math.round(Math.abs(Math.sin(t / 5)) * 8);
    Pix.rect(c, 33 - mw / 2, 30, mw, 2, g);
    Pix.rect(c, 50, 43, 3, 2, (t >> 4) & 1 ? '#F83800' : '#500000');
    Pix.rect(c, 14, 43, 20, 2, '#887850');
    Pix.rect(c, 24, 48, 18, 4, '#A89870'); Pix.rect(c, 16, 52, 34, 4, '#C8B890');
    Font.draw(c, 'VS', 64, 26, (t >> 4) & 1 ? COL.gold : '#F8F8F8');
    // the enemy HQ
    Pix.tiles(c, Sprites.tex.steel, 82, 16, 28, 4); Pix.tiles(c, Sprites.tex.steel, 82, 40, 28, 4);
    Pix.tiles(c, Sprites.tex.steel, 82, 20, 4, 20); Pix.tiles(c, Sprites.tex.steel, 106, 20, 4, 20);
    c.drawImage(Sprites.eagle, 88, 22);
    c.drawImage(Sprites.outline(Sprites.eagle, (t >> 3) & 1 ? '#F83800' : '#A80000'), 87, 21);
  },
};

Object.assign(Game, {
  // newGame: the mode's title screen, then the curtain it would have shown
  introWanted(custom) {
    return Config.on('modeIntro') && !custom && !this.daily && Net.role !== 'client' && !!INTRO_SCENES[this.mode];
  },

  toModeIntro() {
    this.introNext = this.curtain;
    this.setState('modeIntro');
  },

  updateModeIntro() {
    const m = Input.menu();
    if (m.back) { this.toTitle(); return; }
    if (this.t >= INTRO_TIME || (this.t > 20 && m.ok)) {
      if (m.ok) Sound.play('select');
      this.curtain = Object.assign(this.introNext || { selectable: false }, { h: SCREEN_H / 2, phase: 'show' });
      this.setState('curtain');
    }
  },

  renderModeIntro(ctx) {
    const mode = this.mode, info = modeInfo(mode), t = this.t;
    if (!this.introCanvas) this.introCanvas = makeCanvas(INTRO_W, INTRO_H);
    const pc = this.introCanvas, c = pc.getContext('2d');
    c.save();
    c.imageSmoothingEnabled = false;
    (INTRO_SCENES[mode] || INTRO_SCENES.classic)(c, t);
    c.restore();
    ctx.fillStyle = COL.black;
    ctx.fillRect(0, 0, SW, SH);
    // the name, in bricks, as big as fits
    const name = info.name;
    let s = 3;
    while (s > 1 && Font.bigWidth(name, s) > SW - 16) s--;
    Font.big(ctx, name, (SW - Font.bigWidth(name, s)) >> 1, 18 - (7 * s >> 1), s, Sprites.bricks(ctx));
    // the picture in a double frame
    ctx.fillStyle = '#F8F8F8'; ctx.fillRect(INTRO_X - 4, INTRO_Y - 4, INTRO_W * 2 + 8, INTRO_H * 2 + 8);
    ctx.fillStyle = COL.black; ctx.fillRect(INTRO_X - 3, INTRO_Y - 3, INTRO_W * 2 + 6, INTRO_H * 2 + 6);
    ctx.fillStyle = '#7C7C7C'; ctx.fillRect(INTRO_X - 2, INTRO_Y - 2, INTRO_W * 2 + 4, INTRO_H * 2 + 4);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(pc, INTRO_X, INTRO_Y, INTRO_W * 2, INTRO_H * 2);
    // fade in, NES style (in steps)
    if (t < 16) { ctx.fillStyle = 'rgba(0,0,0,' + [0.75, 0.5, 0.25, 0][t >> 2] + ')'; ctx.fillRect(INTRO_X, INTRO_Y, INTRO_W * 2, INTRO_H * 2); }
    const y = INTRO_Y + INTRO_H * 2 + 8;
    Font.drawCenter(ctx, info.desc, SW / 2, y, '#F8F8F8');
    const lv = Music.skillLevel(), song = SONGS[mode] || SONGS.classic;
    Font.drawCenter(ctx, 'MUSIC: ' + song.name, SW / 2, y + 11, SKILL_TAGS[lv][1]);
    if ((t >> 4) & 1 || t < 20) Font.drawCenter(ctx, 'PRESS ENTER', SW / 2, y + 23, COL.red);
  },

  // what should be playing right now (every frame, also for online guests): the mode's tune on its title screen
  // and during a stage (once the start jingle is over), nothing anywhere else
  musicFrame() {
    const st = this.stage, s = this.state;
    let mode = null;
    if (s === 'modeIntro') mode = this.mode;
    else if (s === 'bossIntro') mode = 'bossWarn';   // a boss's picture (bossart.js)
    else if (st && st.bossDefeated && (s === 'play' || s === 'score' || s === 'bossOutro')) mode = BOSSES[st.bossIdx] && ['ufo', 'galya'].includes(BOSSES[st.bossIdx].kind) ? 'ending' : 'victory';   // a boss beaten: celebrate
    else if (s === 'play' && st && !st.over && st.frame > MUSIC_DELAY) {
      mode = this.mode;
      // a boss stage: the boss's own theme, faster in its last phase
      const b = st.bossIdx !== undefined && st.mainBoss && st.mainBoss();
      if (b && BOSS_SONGS[b.kind]) mode = BOSS_SONGS[b.kind] + (b.phase === 3 ? '+' : '');
      if (st.galaxy && st.galaxy.boss) mode = 'galaxyBoss' + (st.galaxy.boss.ph === 3 ? '+' : '');   // galaxy.js
    }
    // paused: the music pauses too, except while you're setting its volume in the pause menu (so you can hear it)
    const tuning = s === 'play' && this.paused && ['MUSIC', 'MUSIC VOL'].includes(pauseMenu()[this.pauseIdx]);
    Music.want(mode, Music.skillLevel(), s === 'play' && this.paused && !tuning);
  },
});
