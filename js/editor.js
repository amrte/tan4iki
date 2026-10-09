'use strict';
// =====================================================================
//  Construction: the level editor, and the levels you make with it.
//    8 save slots, each a level and its season (AUTO: whatever the stage would have); every change is saved at once.
//    A tile palette on the right (every terrain: brick, steel, water, trees, ice, mud, bridges, belts, teleporters, and
//    the terrain types' tiles: lava, basalt, vents, bog, reeds, gas, concrete, rubble, lamps, barrels, crates,
//    deflectors, manholes),
//    and a random level generator: a symmetric map like the classic ones, checked so every entry point and both
//    players can reach the eagle.
//    CUSTOM LEVELS (on the title screen's MODE row) plays the slots you've filled, one after another, as a normal game
//    with tally, shop and all.
//  Keys: arrows move · A / Space place (again on the same spot: the next tile) · B place the previous tile
//        Q / E pick a tile · R random level · T season · 1-8 or PgUp / PgDn slot · Del clear · H help
//        Enter play it · Esc back. Mouse / touch: tap the palette, tap or drag on the field; tap RND, the season or the
//        slot on the side panel.
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
      if (!l || !Array.isArray(l.blocks) || l.blocks.length !== 26) d.levels[i] = { blocks: defaultCustomMap(), theme: 'auto' };
      else if (!EDIT_THEMES.includes(l.theme)) l.theme = 'auto';
    }
    if (!(d.slot >= 0 && d.slot < CUSTOM_SLOTS)) d.slot = 0;
    this.data = d;
    return d;
  },
  save() { STORE.set(CUSTOM_KEY, this.data); },
  level(i) { return this.load().levels[i]; },
  // slots with something in them
  used() {
    const blank = defaultCustomMap().join('');
    return this.load().levels.map((l, i) => i).filter(i => this.data.levels[i].blocks.join('') !== blank);
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
const ED_ROWS = { rnd: 122, theme: 136, slot: 150, help: 192, go: 206 };

Object.assign(Game, {
  toConstruct() {
    this.applyLayout(13, 13);   // the editor works on the classic 13x13 field
    const d = Customs.load();
    this.ed = { tx: 6, ty: 6, pat: PAT_BRICK, last: null, rep: 0, help: !STORE.get('tank1990_edhelp', false) };
    STORE.set('tank1990_edhelp', true);
    this.loadSlot(d.slot);
    this.setState('construct');
  },

  loadSlot(i) {
    const d = Customs.load();
    d.slot = i;
    Customs.save();
    const lv = d.levels[i];
    this.custom = lv.blocks.slice();
    this.customTheme = lv.theme;
    this.rebuildEdStage();
  },

  rebuildEdStage() {
    const th = this.customTheme === 'auto' ? 'classic' : this.customTheme;
    this.ed.stage = new Stage(1, this.custom, [], { custom: true, theme: th, editor: true });
  },

  saveSlot() {
    const lv = Customs.level(Customs.load().slot);
    lv.blocks = this.custom.slice();
    lv.theme = this.customTheme;
    Customs.save();
    STORE.set('tank1990_custom', this.custom);   // older versions' single level
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
    this.ed.stage.pads = padsFromBlocks(this.custom);
    this.saveSlot();
    Sound.play('build');
  },

  edRandom() {
    this.custom = randomLevel();
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

  updateConstruct() {
    const ed = this.ed, m = Input.menu(), just = k => Input.just.has(k);
    if (ed.help) { if (m.ok || m.back || m.fire || just('KeyH')) { ed.help = false; Sound.play('select'); } return; }
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
    if (just('KeyR')) this.edRandom();
    if (just('KeyT')) this.edTheme(1);
    if (just('KeyH')) { ed.help = true; Sound.play('select'); }
    if (just('PageUp')) this.edSlot(Customs.load().slot - 1);
    if (just('PageDown')) this.edSlot(Customs.load().slot + 1);
    for (let k = 1; k <= CUSTOM_SLOTS; k++) if (just('Digit' + k)) this.edSlot(k - 1);
    if (m.start) { this.saveSlot(); this.newGame(1, true); }
    else if (m.back) { this.saveSlot(); this.toTitle(); }
    else if (just('Delete')) { this.custom = defaultCustomMap(); this.saveSlot(); this.rebuildEdStage(); Sound.play('steel'); }
  },

  // mouse / touch: the palette, the side panel's buttons, or paint on the field (drag: true while moving)
  constructPointer(x, y, drag) {
    const ed = this.ed, px = ED_PANEL_X();
    if (ed.help) { if (!drag) ed.help = false; return; }
    if (x >= FX && y >= FY && x < FX + 208 && y < FY + 208) {
      const tx = Math.floor((x - FX) / 16), ty = Math.floor((y - FY) / 16);
      if (drag && ed.tx === tx && ed.ty === ty) return;
      ed.tx = tx; ed.ty = ty; ed.last = tx + ',' + ty;
      this.editTile(tx, ty, ed.pat);
      return;
    }
    if (drag || x < px - 2) return;
    const k = Math.floor((y - ED_PAL_Y) / ED_PAL_STEP) * 2 + (x >= px + 12 ? 1 : 0), i = edPage(ed.pat) * ED_PAGE + k;
    if (y >= ED_PAL_Y && k === ED_PAGE) { ed.pat = edPage(ed.pat) ? 0 : ED_PAGE; ed.last = null; Sound.play('select'); return; }
    if (y >= ED_PAL_Y && k >= 0 && k < ED_PAGE && i < CONSTRUCT_PATS.length) { ed.pat = i; ed.last = null; Sound.play('select'); return; }
    const near = r => Math.abs(y - (r + 3)) <= 6;
    if (near(ED_ROWS.rnd)) this.edRandom();
    else if (near(ED_ROWS.theme)) this.edTheme(1);
    else if (near(ED_ROWS.slot)) this.edSlot(Customs.load().slot + 1);
    else if (near(ED_ROWS.help)) { ed.help = true; Sound.play('select'); }
    else if (near(ED_ROWS.go)) { this.saveSlot(); this.newGame(1, true); }
  },

  renderConstruct(ctx) {
    const ed = this.ed, st = ed.stage, th = st.theme;
    ctx.fillStyle = COL.bg;
    ctx.fillRect(0, 0, SW, SH);
    if (st.dirty) st.buildLayers();
    ctx.save();
    ctx.translate(FX, FY);
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
    ctx.drawImage(Sprites.eagle, BASE_X, BASE_Y);
    ctx.drawImage(st.forestLayer, 0, 0);
    if (((this.t >> 3) & 1) === 0) ctx.drawImage(Sprites.tank('p0', 0, 0, Config.playerPal(0)), ed.tx * 16, ed.ty * 16);
    ctx.restore();
    // the side panel: palette, then RND, the season, the slot, help and play
    const px = ED_PANEL_X();
    const page = edPage(ed.pat);
    for (let k = 0; k < ED_PAGE && page * ED_PAGE + k < CONSTRUCT_PATS.length; k++) {
      const i = page * ED_PAGE + k, x = px + (k & 1) * 12, y = ED_PAL_Y + (k >> 1) * ED_PAL_STEP;
      drawPattern(ctx, CONSTRUCT_PATS[i], x, y, 4, th);
      if (i === ed.pat) { ctx.strokeStyle = (this.t >> 3) & 1 ? COL.white : COL.gold; ctx.strokeRect(x - 0.5, y - 0.5, 9, 9); }
    }
    Font.draw(ctx, page ? '<' : '>', px + 12, ED_PAL_Y + (ED_PAGE >> 1) * ED_PAL_STEP, COL.gold);   // the page turner
    Font.draw(ctx, 'RND', px, ED_ROWS.rnd, COL.gold);
    const tt = THEMES[this.customTheme] || {};
    Font.draw(ctx, EDIT_THEME_TAGS[this.customTheme], px, ED_ROWS.theme, this.customTheme === 'auto' ? COL.black : tt.color || COL.white);
    Font.draw(ctx, 'S' + (Customs.load().slot + 1), px, ED_ROWS.slot, COL.black);
    Font.draw(ctx, 'H?', px + 4, ED_ROWS.help, COL.black);
    Font.draw(ctx, 'GO', px + 4, ED_ROWS.go, COL.black);
    if (ed.help) this.renderConstructHelp(ctx);
  },

  renderConstructHelp(ctx) {
    const x = FX + 4, y = FY + 4, w = 200, lines = [
      ['ARROWS', 'MOVE'], ['A SPACE', 'PLACE TILE'], ['', 'AGAIN: NEXT ONE'], ['B', 'PREVIOUS TILE'], ['Q E', 'PICK A TILE'],
      ['R', 'RANDOM LEVEL'], ['T', 'SEASON'], ['1-8', 'SAVE SLOT'], ['DEL', 'CLEAR'], ['ENTER', 'PLAY IT'], ['ESC', 'BACK'],
      ['MOUSE', 'PICK, PAINT'],
    ];
    ctx.fillStyle = 'rgba(0,0,0,0.88)';
    ctx.fillRect(x, y, w, 200);
    Font.drawCenter(ctx, 'CONSTRUCTION', x + w / 2, y + 6, COL.orange);
    lines.forEach(([k, v], i) => { Font.draw(ctx, k, x + 6, y + 22 + i * 13, COL.gold); Font.draw(ctx, v, x + 70, y + 22 + i * 13, COL.white); });
    Font.drawCenter(ctx, 'SAVED AS YOU GO', x + w / 2, y + 186, '#7C7C7C');
  },
});
