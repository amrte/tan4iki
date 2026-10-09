'use strict';
// =====================================================================
//  Construction: the level editor, and the levels you make with it.
//    8 save slots, each a level and its season (AUTO: whatever the stage would have); every change is saved at once.
//    A tile palette on the right (every terrain: brick, steel, water, trees, ice, mud, bridges, belts, teleporters, and
//    the terrain types' tiles: lava, basalt, vents, bog, reeds, gas, concrete, rubble, lamps, barrels, crates,
//    deflectors, manholes),
//    and a random level generator: a symmetric map like the classic ones, checked so every entry point and both
//    players can reach the eagle.
//    Five pages (Tab, or the page button on the panel): TERRAIN (painting), MARKERS (the eagle, the players' starts,
//    entry points, power-up spots, the boss), and LEVEL, ENEMIES and POWER-UPS (menus; editor2.js, with the level's
//    data and how it plays). A map bigger than the window scrolls with the cursor; O shows all of it at once.
//    CUSTOM LEVELS (on the title screen's MODE row) plays the slots you've filled, one after another, as a normal game
//    with tally, shop and all.
//  Keys: arrows move · A / Space place (again on the same spot: the next tile) · B place the previous tile (markers:
//        take it off) · Q / E pick a tile or marker · Tab next page · O see it all · R random level · T season
//        1-8 or PgUp / PgDn slot · Del clear · H help · Enter play it · Esc back. Walking the cursor off the right edge
//        reaches the panel: the palette, then the buttons (for gamepads). Mouse / touch: tap the palette, tap or drag on the field; tap the
//        panel's buttons; on the menu pages tap a row, then its left or right part.
// =====================================================================

const CUSTOM_KEY = 'tank1990_customs', CUSTOM_SLOTS = 8;
const EDIT_THEMES = ['auto', 'classic'].concat(THEME_ORDER);
const EDIT_THEME_TAGS = { auto: 'ANY', classic: 'BLK', spring: 'SPR', summer: 'SUM', autumn: 'AUT', winter: 'WIN', nuclear: 'NUC', desert: 'DES',
  volcanic: 'VOL', swamp: 'SWP', city: 'CTY' };

// the palette: the 14 patterns of the original editor (as 2x2 blocks), then the newer terrain
const CONSTRUCT_PATS = [
  ['.#', '.#'], ['..', '##'], ['#.', '#.'], ['##', '..'], ['##', '##'],
  ['.@', '.@'], ['..', '@@'], ['@.', '@.'], ['@@', '..'], ['@@', '@@'],
  ['~~', '~~'], ['%%', '%%'], ['__', '__'],
  // mud, a bridge, conveyor belts (up, right, down, left) and a teleporter pad (pads pair up in the order placed)
  ['mm', 'mm'], ['==', '=='], ['^^', '^^'], ['>>', '>>'], ['vv', 'vv'], ['<<', '<<'], ['TT', 'TT'],
  ['..', '..'],
  // the second page, the terrain types' (biomes.js): lava, basalt, a fire vent, bog, reeds, swamp gas, concrete, rubble,
  // a street lamp, barrels, a crate, deflectors (/ and \) and a manhole (they pair up like pads)
  ['ll', 'll'], ['kk', 'kk'], ['ff', 'ff'], ['bb', 'bb'], ['rr', 'rr'], ['gg', 'gg'], ['cc', 'cc'], ['uu', 'uu'], ['i.', '..'],
  ['dd', 'dd'], ['xx', 'xx'], ['./', '/.'], ['\\.', '.\\'], ['OO', 'OO'],
];
const PAT_BRICK = 4;

// the saved levels
const Customs = {
  data: null,
  load() {
    if (this.data) return this.data;
    let d = STORE.get(CUSTOM_KEY, null);
    if (!d || !Array.isArray(d.levels)) {
      d = { slot: 0, levels: [] };
      const old = STORE.get('tank1990_custom', null);   // the single level of older versions goes into slot 1
      if (Array.isArray(old) && old.length === 26) d.levels[0] = { blocks: old, theme: 'auto' };
    }
    for (let i = 0; i < CUSTOM_SLOTS; i++) {
      const l = d.levels[i];
      if (!l || !clFits(l)) d.levels[i] = { blocks: defaultCustomMap(), theme: 'auto' };   // its own size: editor2.js
      else if (!EDIT_THEMES.includes(l.theme)) l.theme = 'auto';
    }
    if (!(d.slot >= 0 && d.slot < CUSTOM_SLOTS)) d.slot = 0;
    this.data = d;
    return d;
  },
  save() { STORE.set(CUSTOM_KEY, this.data); },
  level(i) { return this.load().levels[i]; },
  // slots with something in them (tiles, or any of the newer settings)
  used() {
    const blank = defaultCustomMap().join('');
    return this.load().levels.map((l, i) => i).filter(i => this.data.levels[i].blocks.join('') !== blank || clCustomized(this.data.levels[i]));
  },
};

// ------------------------------------------------------------------ random levels
// tiles a tank can't get through (brick can be shot away)
const LEVEL_WALL = { '@': 1, '~': 1 };

// can a tank get from every entry point and both player starts to the eagle? (2x2-block footprint, 1 block steps)
function levelReachable(g) {
  const ok = (x, y) => x >= 0 && y >= 0 && x < 25 && y < 25 && !LEVEL_WALL[g[y][x]] && !LEVEL_WALL[g[y][x + 1]] && !LEVEL_WALL[g[y + 1][x]] && !LEVEL_WALL[g[y + 1][x + 1]];
  const seen = new Uint8Array(25 * 25), q = [[12, 24]];
  seen[24 * 25 + 12] = 1;
  while (q.length) {
    const [x, y] = q.pop();
    for (const [dx, dy] of DXY) {
      const nx = x + dx, ny = y + dy;
      if (!ok(nx, ny) || seen[ny * 25 + nx]) continue;
      seen[ny * 25 + nx] = 1;
      q.push([nx, ny]);
    }
  }
  return [[0, 0], [12, 0], [24, 0], [8, 24], [16, 24]].every(([x, y]) => seen[y * 25 + x]);
}

// a random level: built on the left half and mirrored, like the classic maps
function randomLevel(rnd01 = Math.random) {
  const ri = n => Math.floor(rnd01() * n);
  for (let attempt = 0; attempt < 60; attempt++) {
    const g = Array.from({ length: 26 }, () => Array(26).fill('.'));
    const put = (bx, by, c) => { if (bx >= 0 && by >= 0 && bx < 13 && by < 26) g[by][bx] = c; };
    // a rectangle in 16px tiles (tx 0-6: the left half and the middle column)
    const rect = (tx, ty, tw, th, c) => { for (let y = ty * 2; y < (ty + th) * 2; y++) for (let x = tx * 2; x < (tx + tw) * 2; x++) put(x, y, c); };
    const dens = 0.7 + rnd01() * 0.8;
    // walls: brick mostly, some steel; full tiles or half-thick lines
    for (let k = 0, n = 5 + ri(6 * dens); k < n; k++) {
      const tx = ri(7), ty = 1 + ri(10), horiz = rnd01() < 0.5, len = 1 + ri(4), mat = rnd01() < 0.82 ? '#' : '@';
      const half = rnd01() < 0.35 ? ri(2) : -1;
      for (let i = 0; i < len; i++) {
        const x = horiz ? tx + i : tx, y = horiz ? ty : ty + i;
        if (x > 6 || y > 11) break;
        for (let by = y * 2; by < y * 2 + 2; by++) for (let bx = x * 2; bx < x * 2 + 2; bx++) {
          if (half >= 0 && (horiz ? by - y * 2 : bx - x * 2) !== half) continue;
          put(bx, by, mat);
        }
      }
    }
    // ponds, trees, ice and the odd patch of mud
    if (rnd01() < 0.7) for (let k = 0, n = 1 + ri(3); k < n; k++) rect(ri(6), 2 + ri(8), 1 + ri(3), 1 + ri(2), '~');
    for (let k = 0, n = 1 + ri(3); k < n; k++) rect(ri(7), 1 + ri(10), 1 + ri(3), 1 + ri(3), '%');
    if (rnd01() < 0.4) rect(ri(6), 2 + ri(8), 1 + ri(3), 1 + ri(2), '_');
    if (rnd01() < 0.35) rect(ri(6), 2 + ri(8), 1 + ri(2), 1 + ri(2), 'm');
    // a bridge across a pond now and then
    if (rnd01() < 0.25) { const tx = ri(6), ty = 2 + ri(8); rect(tx, ty, 2, 1, '~'); rect(tx + ri(2), ty, 1, 1, '='); }
    // a conveyor belt, a teleporter pair (its twin comes from the mirror)
    if (rnd01() < 0.25) {
      const horiz = rnd01() < 0.5, tx = ri(5), ty = 2 + ri(8), len = 2 + ri(3), c = horiz ? (rnd01() < 0.5 ? '>' : '<') : (rnd01() < 0.5 ? '^' : 'v');
      for (let i = 0; i < len; i++) rect(horiz ? Math.min(6, tx + i) : tx, horiz ? ty : Math.min(10, ty + i), 1, 1, c);
    }
    if (rnd01() < 0.25) rect(ri(5), 2 + ri(8), 1, 1, 'T');
    // the right half mirrors the left (belts turn round too)
    const flip = { '<': '>', '>': '<' };
    for (let by = 0; by < 26; by++) for (let bx = 0; bx < 13; bx++) g[by][25 - bx] = flip[g[by][bx]] || g[by][bx];
    // entry points, player starts and the eagle stay clear; the fortress goes round the eagle
    const clear = (x0, y0, w, h) => { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) g[y][x] = '.'; };
    clear(0, 0, 2, 2); clear(12, 0, 2, 2); clear(24, 0, 2, 2);
    clear(8, 24, 2, 2); clear(16, 24, 2, 2); clear(10, 21, 6, 5);
    for (const [bx, by] of [[11, 23], [12, 23], [13, 23], [14, 23], [11, 24], [14, 24], [11, 25], [14, 25]]) g[by][bx] = '#';
    if (levelReachable(g)) return g.map(r => r.join(''));
  }
  return defaultCustomMap();
}

// a pattern drawn small (palette) or large (preview): s = size of one block
function drawPattern(ctx, p, x, y, s, theme) {
  const tex = themeTex(theme || 'classic');
  const src = { '#': tex.brick, '@': tex.steel, '~': tex.water0, '%': tex.forest, '_': tex.ice, m: Sprites.mudTex, '=': Sprites.bridgeTex,
    l: tex.lava0, k: tex.basalt, b: tex.bog, r: tex.reeds, g: tex.bog, c: tex.conc, u: tex.rubble, i: tex.lamp, d: tex.drum, '/': tex.defl, '\\': tex.defl2 };
  ctx.fillStyle = COL.black;
  ctx.fillRect(x, y, s * 2, s * 2);
  for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) {
    const c = p[j][i], im = src[c];
    if (im) ctx.drawImage(im, 0, 0, 8, 8, x + i * s, y + j * s, s, s);
  }
  // 16px pictures: a vent, a crate; gas bubbles on its bog; a manhole
  const big = { f: tex.vent, x: tex.crate, O: manholeSprite() }[p[0][0]];
  if (big) ctx.drawImage(big, x, y, s * 2, s * 2);
  if (p[0][0] === 'g') { ctx.fillStyle = '#88D848'; for (const [i, j] of [[0.3, 0.4], [1.1, 0.2], [0.8, 1.1], [1.4, 1.3]]) ctx.fillRect(Math.round(x + i * s), Math.round(y + j * s), Math.max(1, s >> 1), Math.max(1, s >> 1)); }
  const arrow = { '^': [0, -1], '>': [1, 0], v: [0, 1], '<': [-1, 0] }[p[0][0]];
  if (arrow) {
    ctx.fillStyle = '#383838'; ctx.fillRect(x, y, s * 2, s * 2);
    ctx.fillStyle = '#9C9C9C';
    const cx = x + s, cy = y + s;
    for (let k = -1; k <= 1; k++) ctx.fillRect(cx + arrow[0] * k * s / 3 - 1, cy + arrow[1] * k * s / 3 - 1, 2, 2);
    ctx.fillRect(cx + arrow[0] * s * 0.6 - 1, cy + arrow[1] * s * 0.6 - 1, 2, 2);
  }
  if (p[0][0] === 'T') { ctx.strokeStyle = PAD_COLORS[0]; ctx.strokeRect(x + s * 0.3 + 0.5, y + s * 0.3 + 0.5, s * 1.4 - 1, s * 1.4 - 1); }
}

// side panel layout (screen coordinates)
const ED_PANEL_X = () => FX + VIEW_W + 4;
const ED_PAL_Y = 6, ED_PAL_STEP = 10;
// the palette has pages of 21 tiles; the last slot of a page (bottom right) turns it
const ED_PAGE = 21, edPage = i => Math.floor(i / ED_PAGE);
const ED_ROWS = { rnd: 122, theme: 136, slot: 150, page: 164, zoom: 178, help: 192, go: 206 };
// the panel's buttons, top to bottom, for a cursor walked off the right of the field (keyboard, gamepad): it comes
// to the palette first (ed.panel -2), then the buttons (0 and on)
const ED_BUTTONS = ['rnd', 'theme', 'slot', 'page', 'zoom', 'help', 'go'];

Object.assign(Game, {
  toConstruct() {
    const d = Customs.load();
    // page: map (terrain), marks, level, foes, pu (editor2.js); panel: the palette (-2) or a button picked from the
    // keyboard or a gamepad (-1: the map)
    this.ed = { page: 'map', tx: 6, ty: 6, pat: PAT_BRICK, mk: 0, last: null, rep: 0, camX: 0, camY: 0, zoom: false, panel: -1,
      row: 0, col: 0, scroll: 0, help: !STORE.get('tank1990_edhelp', false) };
    STORE.set('tank1990_edhelp', true);
    this.loadSlot(d.slot);
    this.setState('construct');
  },

  loadSlot(i) {
    const d = Customs.load();
    d.slot = i;
    Customs.save();
    const lv = d.levels[i];
    this.customLevel = lv;
    this.custom = lv.blocks.slice();
    this.customTheme = lv.theme;
    this.rebuildEdStage();
  },

  // the level's own field (13 rows on screen, the usual width at most; it scrolls) and its markers
  rebuildEdStage() {
    const ed = this.ed, c = ed.c = clResolve(Customs.level(Customs.load().slot)), [vc] = this.desiredField();
    setFieldSize(c.w, c.h, Math.min(c.w, vc), 13);
    clSetGlobals(c);
    ed.tx = Math.min(ed.tx, c.w - 1); ed.ty = Math.min(ed.ty, c.h - 1);
    const th = this.customTheme === 'auto' ? 'classic' : this.customTheme;
    ed.stage = new Stage(1, this.custom, [], { custom: true, theme: th, editor: true, blocks: this.custom, cl: c });
    this.edFollow();
  },

  // keep the cursor on screen, two tiles from the edge where the map goes on
  edFollow() {
    const ed = this.ed, fit = (cam, p, view, full) => Math.max(0, Math.min(full - view, Math.max(Math.min(cam, p - 32), p + 48 - view)));
    ed.camX = fit(ed.camX, ed.tx * 16, VIEW_W, FW);
    ed.camY = fit(ed.camY, ed.ty * 16, VIEW_H, FH);
  },

  saveSlot() {
    const lv = Customs.level(Customs.load().slot);
    lv.blocks = this.custom.slice();
    lv.theme = this.customTheme;
    Customs.save();
    if (this.custom.length === 26 && this.custom[0].length === 26) STORE.set('tank1990_custom', this.custom);   // older versions' single level
  },

  editTile(tx, ty, patIdx) {
    const c = this.ed.c;
    if (c && c.eagle && tx === c.eagle[0] && ty === c.eagle[1]) return; // the eagle itself
    const p = CONSTRUCT_PATS[patIdx];
    const rows = this.custom.map(r => r.split(''));
    for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) {
      const bx = tx * 2 + x, by = ty * 2 + y;
      rows[by][bx] = p[y][x];
      this.ed.stage.setBlock(bx, by, BLOCK_TYPE[p[y][x]]);
    }
    this.custom = rows.map(r => r.join(''));
    this.ed.stage.pads = padsFromBlocks(this.custom);
    this.saveSlot();
    Sound.play('build');
  },

  // a random level: the classic generator for a classic level, one of its own size round its markers otherwise
  edRandom() {
    this.custom = clCustomized(Customs.level(Customs.load().slot)) ? clRandom(this.ed.c) : randomLevel();
    this.saveSlot();
    this.rebuildEdStage();
    Sound.play('pickup');
  },

  edTheme(dir) {
    const i = EDIT_THEMES.indexOf(this.customTheme);
    this.customTheme = EDIT_THEMES[(i + dir + EDIT_THEMES.length) % EDIT_THEMES.length];
    this.saveSlot();
    this.rebuildEdStage();
    Sound.play('select');
  },

  edSlot(i) {
    this.saveSlot();
    this.loadSlot((i + CUSTOM_SLOTS) % CUSTOM_SLOTS);
    Sound.play('select');
  },

  edPick(dir) {
    const n = CONSTRUCT_PATS.length;
    this.ed.pat = (this.ed.pat + dir + n) % n;
    this.ed.last = null;
    Sound.play('select');
  },

  // Delete: a blank classic level again (the season stays)
  edClear() {
    const lv = Customs.level(Customs.load().slot);
    for (const k of CL_KEYS) delete lv[k];
    this.custom = defaultCustomMap();
    this.saveSlot();
    this.rebuildEdStage();
    Sound.play('steel');
  },

  edPlay() {
    this.saveSlot();
    this.customLevel = Customs.level(Customs.load().slot);
    this.newGame(1, true);
  },

  edButton(b) {
    if (b === 'rnd') this.edRandom();
    else if (b === 'theme') this.edTheme(1);
    else if (b === 'slot') this.edSlot(Customs.load().slot + 1);
    else if (b === 'page') this.edPageStep(1);
    else if (b === 'zoom') this.edZoom();
    else if (b === 'help') { this.ed.help = true; Sound.play('select'); }
    else if (b === 'go') this.edPlay();
  },

  updateConstruct() {
    const ed = this.ed, m = Input.menu(), just = k => Input.just.has(k);
    if (ed.help) { if (m.ok || m.back || m.fire || just('KeyH')) { ed.help = false; Sound.play('select'); } return; }
    if (just('KeyH')) { ed.help = true; Sound.play('select'); return; }
    if (just('Tab')) { this.edPageStep(1); return; }
    if (just('PageUp')) this.edSlot(Customs.load().slot - 1);
    if (just('PageDown')) this.edSlot(Customs.load().slot + 1);
    for (let k = 1; k <= CUSTOM_SLOTS; k++) if (just('Digit' + k)) this.edSlot(k - 1);
    if (m.start) { this.edPlay(); return; }
    if (this.edMenuPage()) { this.updateEdMenu(m, just); return; }   // LEVEL, ENEMIES, POWER-UPS (editor2.js)
    if (ed.panel === -2) {
      // the palette: the arrows pick (up and down a row at a time), A or B goes back to the map, down off it the buttons
      const marks = ed.page === 'marks', n = marks ? ED_MARKS.length : CONSTRUCT_PATS.length, per = marks ? n : ED_PAGE, cur = marks ? ed.mk : ed.pat;
      const pick = i => { if (marks) ed.mk = i; else { ed.pat = i; ed.last = null; } Sound.play('select'); };
      if (m.left || m.right) pick((cur + (m.right ? 1 : -1) + n) % n);
      else if (m.up && cur % per >= 2) pick(cur - 2);
      else if (m.down) { if (cur % per + 2 < per && cur + 2 < n) pick(cur + 2); else { ed.panel = 0; Sound.play('select'); } }
      else if (m.fire || m.alt || m.back) { ed.panel = -1; Sound.play('select'); }
      return;
    }
    if (ed.panel >= 0) {
      // the panel's buttons: up / down (up off the top: the palette), A presses, left goes back to the map
      const n = ED_BUTTONS.length, shown = i => ED_BUTTONS[i] !== 'zoom' || this.edCanZoom();
      if (m.up && ed.panel === 0) { ed.panel = -2; Sound.play('select'); return; }
      if (m.up || m.down) { do ed.panel = (ed.panel + (m.up ? n - 1 : 1)) % n; while (!shown(ed.panel)); Sound.play('select'); }
      if (m.left || m.back) { ed.panel = -1; Sound.play('select'); } else if (m.fire) this.edButton(ED_BUTTONS[ed.panel]);
      return;
    }
    const c = ed.c;
    const moveCursor = (d, fresh) => {
      if (d === 1 && fresh && ed.tx >= c.w - 1) { ed.panel = -2; Sound.play('select'); return; }   // off the right edge: the panel
      ed.tx = Math.max(0, Math.min(c.w - 1, ed.tx + DXY[d][0]));
      ed.ty = Math.max(0, Math.min(c.h - 1, ed.ty + DXY[d][1]));
      this.edFollow();
    };
    const tapped = m.up ? 0 : m.right ? 1 : m.down ? 2 : m.left ? 3 : -1;
    if (tapped >= 0) {
      moveCursor(tapped, true);
      ed.rep = 14; // auto-repeat after a short delay
    } else {
      const held = Input.heldDir();
      if (held >= 0 && --ed.rep <= 0) { moveCursor(held, false); ed.rep = 5; }
    }
    if (ed.panel !== -1) return;
    const here = ed.tx + ',' + ed.ty;
    if (ed.page === 'marks') {
      if (m.fire && !m.start) this.edMark(ed.tx, ed.ty, ed.mk);
      else if (m.alt) this.edUnmark(ed.tx, ed.ty);
      const dq = just('KeyQ') || just('BracketLeft') ? -1 : just('KeyE') || just('BracketRight') ? 1 : 0;
      if (dq) { ed.mk = (ed.mk + dq + ED_MARKS.length) % ED_MARKS.length; Sound.play('select'); }
    } else {
      if (m.fire && !m.start) {
        if (ed.last === here) ed.pat = (ed.pat + 1) % CONSTRUCT_PATS.length;   // again on the same spot: the next tile
        ed.last = here;
        this.editTile(ed.tx, ed.ty, ed.pat);
      } else if (m.alt) {
        ed.pat = (ed.pat + CONSTRUCT_PATS.length - 1) % CONSTRUCT_PATS.length;
        ed.last = here;
        this.editTile(ed.tx, ed.ty, ed.pat);
      }
      if (just('KeyQ') || just('BracketLeft')) this.edPick(-1);
      if (just('KeyE') || just('BracketRight')) this.edPick(1);
    }
    if (just('KeyR')) this.edRandom();
    if (just('KeyT')) this.edTheme(1);
    if (just('KeyO')) this.edZoom();
    if (m.back) { this.saveSlot(); this.toTitle(); }
    else if (just('Delete')) this.edClear();
  },

  // mouse / touch: the palette, the side panel's buttons, paint on the field (drag: true while moving) or a menu page
  constructPointer(x, y, drag) {
    const ed = this.ed, px = ED_PANEL_X();
    if (ed.help) { if (!drag) ed.help = false; return; }
    if (x >= FX && y >= FY && x < FX + VIEW_W && y < FY + VIEW_H) {
      if (this.edMenuPage()) { if (!drag) this.edMenuPointer(x, y); return; }
      const s = this.edScale(), tx = Math.floor((x - FX + (s < 1 ? 0 : ed.camX)) / (16 * s)), ty = Math.floor((y - FY + (s < 1 ? 0 : ed.camY)) / (16 * s));
      if (tx >= ed.c.w || ty >= ed.c.h) return;
      if (drag && ed.tx === tx && ed.ty === ty) return;
      ed.tx = tx; ed.ty = ty; ed.panel = -1;
      if (ed.page === 'marks') { if (!drag) this.edMark(tx, ty, ed.mk); return; }
      ed.last = tx + ',' + ty;
      this.editTile(tx, ty, ed.pat);
      return;
    }
    if (drag || x < px - 2) return;
    const k = Math.floor((y - ED_PAL_Y) / ED_PAL_STEP) * 2 + (x >= px + 12 ? 1 : 0);
    if (ed.page === 'map') {
      const i = edPage(ed.pat) * ED_PAGE + k;
      if (y >= ED_PAL_Y && k === ED_PAGE) { ed.pat = edPage(ed.pat) ? 0 : ED_PAGE; ed.last = null; Sound.play('select'); return; }
      if (y >= ED_PAL_Y && k >= 0 && k < ED_PAGE && i < CONSTRUCT_PATS.length) { ed.pat = i; ed.last = null; Sound.play('select'); return; }
    } else if (ed.page === 'marks') {
      if (y >= ED_PAL_Y && k >= 0 && k < ED_MARKS.length) { ed.mk = k; Sound.play('select'); return; }
    } else {
      const j = Math.floor((y - ED_PAL_Y + 2) / ED_TAB_STEP);
      if (y >= ED_PAL_Y - 2 && j >= 0 && j < CL_PAGES.length) { this.edSetPage(CL_PAGES[j]); return; }
    }
    const near = r => Math.abs(y - (r + 3)) <= 6;
    const b = ED_BUTTONS.find(n => near(ED_ROWS[n]));
    if (b && (b !== 'zoom' || this.edCanZoom())) this.edButton(b);
  },

  renderConstruct(ctx) {
    const ed = this.ed;
    ctx.fillStyle = COL.bg;
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
    if (this.edMenuPage()) this.renderEdMenu(ctx); else this.renderEdField(ctx);
    this.renderEdPanel(ctx);
    this.renderEdStatus(ctx);
    if (ed.help) this.renderConstructHelp(ctx);
  },

  // the map (scrolled, or all of it scaled down), its markers and the cursor
  renderEdField(ctx) {
    const ed = this.ed, st = ed.stage, th = st.theme, s = this.edScale();
    if (st.dirty) st.buildLayers();
    else if (st.dirtyCells && st.dirtyCells.length) st.redrawCells();
    ctx.save();
    ctx.beginPath();
    ctx.rect(FX, FY, VIEW_W, VIEW_H);
    ctx.clip();
    ctx.fillStyle = COL.black;
    ctx.fillRect(FX, FY, VIEW_W, VIEW_H);
    if (s < 1) { ctx.translate(FX, FY); ctx.scale(s, s); } else ctx.translate(FX - ed.camX, FY - ed.camY);
    ctx.drawImage(st.groundLayer(), 0, 0);
    ctx.drawImage(st.bgLayer, 0, 0);
    const wt = themeTex(th).water0;
    for (const i of st.waterCells) {
      const cx = i % GW, cy = (i / GW) | 0;
      ctx.drawImage(wt, (cx & 1) * 4, (cy & 1) * 4, 4, 4, cx * 4, cy * 4, 4, 4);
    }
    st.frame = this.t;
    st.renderBelts(ctx);
    st.renderBio(ctx);   // lava, vents, gas, bog (biomes.js)
    st.renderPads(ctx);
    if (ed.c.eagle) ctx.drawImage(Sprites.eagle, BASE_X, BASE_Y);
    ctx.drawImage(st.forestLayer, 0, 0);
    this.renderEdMarks(ctx);   // starts, entry points, power-up spots, the boss (editor2.js)
    const x = ed.tx * 16, y = ed.ty * 16, blink = ((this.t >> 3) & 1) === 0;
    if (ed.page === 'marks') {
      // the marker you'd put down, faint, in a blinking frame
      ctx.globalAlpha = 0.5; this.drawEdMark(ctx, ED_MARKS[ed.mk].key, x, y, 16); ctx.globalAlpha = 1;
      ctx.strokeStyle = blink ? COL.white : COL.gold;
      ctx.strokeRect(x - 0.5, y - 0.5, 17, 17);
    } else if (blink) ctx.drawImage(Sprites.tank('p0', 0, 0, Config.playerPal(0)), x, y);
    ctx.restore();
  },

  // the side panel: the palette (tiles, markers or the pages), then RND, the season, the slot, the page, zoom, help, play
  renderEdPanel(ctx) {
    const ed = this.ed, px = ED_PANEL_X(), th = ed.stage.theme, sel = (x, y) => { ctx.strokeStyle = (this.t >> 3) & 1 ? COL.white : COL.gold; ctx.strokeRect(x - 0.5, y - 0.5, 9, 9); };
    if (ed.page === 'map') {
      const page = edPage(ed.pat);
      for (let k = 0; k < ED_PAGE && page * ED_PAGE + k < CONSTRUCT_PATS.length; k++) {
        const i = page * ED_PAGE + k, x = px + (k & 1) * 12, y = ED_PAL_Y + (k >> 1) * ED_PAL_STEP;
        drawPattern(ctx, CONSTRUCT_PATS[i], x, y, 4, th);
        if (i === ed.pat) sel(x, y);
      }
      Font.draw(ctx, page ? '<' : '>', px + 12, ED_PAL_Y + (ED_PAGE >> 1) * ED_PAL_STEP, COL.gold);   // the page turner
    } else if (ed.page === 'marks') {
      ED_MARKS.forEach((mk, k) => {
        const x = px + (k & 1) * 12, y = ED_PAL_Y + (k >> 1) * ED_PAL_STEP;
        ctx.fillStyle = COL.black; ctx.fillRect(x, y, 8, 8);
        this.drawEdMark(ctx, mk.key, x, y, 8);
        if (k === ed.mk) sel(x, y);
      });
    } else CL_PAGES.forEach((p, j) => Font.draw(ctx, CL_PAGE_TAGS[p], px, ED_PAL_Y + j * ED_TAB_STEP, p === ed.page ? COL.gold : COL.black));
    Font.draw(ctx, 'RND', px, ED_ROWS.rnd, COL.gold);
    const tt = THEMES[this.customTheme] || {};
    Font.draw(ctx, EDIT_THEME_TAGS[this.customTheme], px, ED_ROWS.theme, this.customTheme === 'auto' ? COL.black : tt.color || COL.white);
    Font.draw(ctx, 'S' + (Customs.load().slot + 1), px, ED_ROWS.slot, COL.black);
    Font.draw(ctx, CL_PAGE_TAGS[ed.page], px, ED_ROWS.page, COL.white);
    if (this.edCanZoom()) Font.draw(ctx, 'ZM', px + 4, ED_ROWS.zoom, ed.zoom ? COL.gold : COL.black);
    Font.draw(ctx, 'H?', px + 4, ED_ROWS.help, COL.black);
    Font.draw(ctx, 'GO', px + 4, ED_ROWS.go, COL.black);
    if (ed.panel >= 0 && (this.t >> 3) & 1) {
      ctx.strokeStyle = COL.white;
      ctx.strokeRect(px - 2.5, ED_ROWS[ED_BUTTONS[ed.panel]] - 2.5, 28, 12);
    }
  },

  // the border above the field: the page, and what's under the cursor or picked
  renderEdStatus(ctx) {
    const ed = this.ed, c = ed.c, rows = this.edMenuPage() ? this.edRows() : null;
    let text;
    if (rows) {
      const row = rows[ed.row] || {};
      text = row.kind === 'page' ? '< > PAGE   ESC: THE MAP' : row.kind === 'group' ? ['HOW MANY', 'TYPE', 'RANK', 'HITS: -- USUAL', 'SPEED'][ed.col] + '  A B: NEXT'
        : row.hint || '< > TO CHANGE';
    } else if (ed.page === 'marks') {
      const mk = ED_MARKS[ed.mk];
      text = 'MARKERS: ' + mk.name + (mk.key === 'entry' ? ' ' + c.entries.length + '/' + CL_ENTRIES : mk.key === 'spot' ? ' ' + c.spots.length + '/' + CL_SPOTS : '');
    } else text = 'TERRAIN ' + c.w + 'X' + c.h + '  AT ' + (ed.tx + 1) + ',' + (ed.ty + 1);
    if (ed.panel >= 0) text = 'A: PRESS   LEFT: THE MAP';
    else if (ed.panel === -2) text = 'ARROWS: PICK   A: THE MAP';
    Font.drawCenter(ctx, text.slice(0, (VIEW_W >> 3) + 1), FX + VIEW_W / 2, 0, COL.black);   // short of the palette
  },

  renderConstructHelp(ctx) {
    const x = FX + ((VIEW_W - 200) >> 1), y = FY + 4, w = 200, lines = [
      ['ARROWS', 'MOVE'], ['A SPACE', 'PLACE'], ['', 'AGAIN: NEXT TILE'], ['B', 'PREVIOUS, UNMARK'], ['Q E', 'PICK'],
      ['TAB', 'NEXT PAGE'], ['O', 'SEE IT ALL'], ['R', 'RANDOM LEVEL'], ['T', 'SEASON'], ['1-8', 'SAVE SLOT'], ['DEL', 'CLEAR'],
      ['ENTER', 'PLAY IT'], ['ESC', 'BACK'], ['EDGE >', 'PANEL BUTTONS'], ['MOUSE', 'PICK, PAINT'],
    ];
    ctx.fillStyle = 'rgba(0,0,0,0.88)';
    ctx.fillRect(x, y, w, 200);
    Font.drawCenter(ctx, 'CONSTRUCTION', x + w / 2, y + 6, COL.orange);
    lines.forEach(([k, v], i) => { Font.draw(ctx, k, x + 6, y + 21 + i * 11, COL.gold); Font.draw(ctx, v, x + 70, y + 21 + i * 11, COL.white); });
    Font.drawCenter(ctx, 'SAVED AS YOU GO', x + w / 2, y + 188, '#7C7C7C');
  },
});
