'use strict';
// =====================================================================
//  WORLD: drawing (world.js runs it)
//    - the terrain layers are painted a chunk at a time, pixel by pixel, each cell in the textures of its own biome
//      (a house roof or ruin stone where the land says so); the ground under them too: the biome's colour frayed
//      into its neighbour's at the border, specks and flowers, sand ripples, glowing cracks, roads, cobbles,
//      flagstones. When the window moves the layers slide along and only the new chunks are painted (one a frame,
//      out of sight); a shot brick is redrawn on its own, as elsewhere
//    - water in each biome's colours, drawn where you can see it; lava and the rest only near the screen
//    - the day: dusk and dawn tint the land, and at night it's dark round your lights
//    - villages' eagles, chests, supplies; the minimap of what you've explored; the compass, day and villages in
//      the side panel; the news low on the screen
// =====================================================================

// each land's water as a fill (the textures repeat every 8 pixels, from the field's corner, as the blocks do)
const wdWaterPats = {};

Object.assign(Stage.prototype, {
  // ------------------------------------------------------------ the layers
  // (instead of buildLayers) new layers painted whole, or the old ones brought up to date
  wdLayers() {
    const W = this.world, NX = W.NX, NY = W.NY;
    if (!this.bgLayer || this.bgLayer.width !== FW || this.bgLayer.height !== FH || !this.layerOf || this.layerOf.length !== GW * GH || !this.wdGround) {
      this.bgLayer = makeCanvas(FW, FH); this.forestLayer = makeCanvas(FW, FH); this.wdGround = makeCanvas(FW, FH);
      this.layerOf = new Uint8Array(GW * GH);
      this.wdPending = new Set(); this.wdPart = new Map();
      for (let s = 0; s < NX * NY; s++) this.wdPending.add(s);
      this.wdPaintSome(Infinity);
    } else {
      const C = WD_CC, pend = this.wdPending;
      this.dirtyCells = [];
      for (let i = 0; i < GW * GH; i++) {
        if (this.terrain[i] === this.layerOf[i]) continue;
        if (pend.size && pend.has(((((i / GW) | 0) / C) | 0) * NX + (((i % GW) / C) | 0))) continue;
        this.dirtyCells.push(i);
      }
      if (this.dirtyCells.length) this.wdRedraw();
    }
    this.wdLists();
    this.dirty = false;
  },

  // paint the chunks still waiting, a third of one at a time (up to n thirds; but all of any on screen)
  wdPaintSome(n) {
    const pend = this.wdPending;
    if (!pend || !pend.size || !this.bgLayer) return;
    const NX = this.world.NX, cx = this.camX === undefined ? FW / 2 : this.camX, cy = this.camY === undefined ? FH / 2 : this.camY;
    const seen = s => overlap((s % NX) * WD_PX, ((s / NX) | 0) * WD_PX, WD_PX, WD_PX, cx - 16, cy - 16, VIEW_W + 32, VIEW_H + 32);
    const part = this.wdPart || (this.wdPart = new Map());
    for (const s of [...pend].sort((a, b) => seen(b) - seen(a))) {
      if (n <= 0 && !seen(s)) break;
      for (let k = part.get(s) || 0; k < 3 && (n > 0 || seen(s)); k++, n--) { this.wdPaint(s % NX, (s / NX) | 0, k); part.set(s, k + 1); }
      if ((part.get(s) || 0) >= 3) { pend.delete(s); part.delete(s); }
    }
  },

  // one chunk of the window onto the three layers: part 0 and 1 the ground's top and bottom halves, 2 the tiles
  wdPaint(i, j, part) {
    if (part === undefined) { for (let k = 0; k < 3; k++) this.wdPaint(i, j, k); return; }
    const n = WD_PX, C = WD_CC, BW = GW >> 1, x0 = i * n, y0 = j * n;
    const img = this.wdImgs || (this.wdImgs = [new ImageData(n, n), new ImageData(n, n), new ImageData(n, n)]);
    if (part < 2) {
      this.wdPaintGround(i, j, new Uint32Array(img[0].data.buffer), part * (n >> 1), (part + 1) * (n >> 1));
      this.wdGround.getContext('2d').putImageData(img[0], x0, y0, 0, part * (n >> 1), n, n >> 1);
      return;
    }
    const bg = new Uint32Array(img[1].data.buffer), fo = new Uint32Array(img[2].data.buffer);
    bg.fill(0); fo.fill(0);
    for (let cy = 0; cy < C; cy++) for (let cx = 0; cx < C; cx++) {
      const gx = i * C + cx, gy = j * C + cy, idx = gy * GW + gx, v = this.terrain[idx];
      this.layerOf[idx] = v;
      const key = v && wdKeyOf(v, this.wdDeco[idx]);
      if (!key) continue;
      const theme = WD_THEMES[this.wdBio[(gy >> 1) * BW + (gx >> 1)]], tx = wdTexOf(theme, key), tw = tx.w, m = tw >> 2;
      const ox = (gx % m) * 4, oy = (gy % m) * 4, out = wdOnForest(v) ? fo : bg, o0 = cy * 4 * n + cx * 4;
      for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { const p = tx.d[(oy + y) * tw + ox + x]; if (p >>> 24) out[o0 + y * n + x] = p; }
      // snow (or ash) on the top edge of walls and trees
      const caps = THEMES[theme].snowCaps;
      if (caps && wdCapSolid(v) && !(gy > 0 && wdCapSolid(this.terrain[idx - GW]))) {
        const c = wdColor(caps);
        for (let x = 0; x < 4; x++) out[o0 + x] = c;
        if ((gx + gy) % 3 === 0) { out[o0 + n + 1] = c; out[o0 + n + 2] = c; }
      }
    }
    this.bgLayer.getContext('2d').putImageData(img[1], x0, y0);
    this.forestLayer.getContext('2d').putImageData(img[2], x0, y0);
  },

  // the ground of one chunk: the biome's colour (frayed into the next one's at the border), its specks and
  // details, and the roads, cobbles, flagstones and scorch the land puts there
  wdPaintGround(i, j, out, r0 = 0, r1 = WD_PX) {
    const W = this.world, n = WD_PX, B = WD_CB, BW = GW >> 1, gx0 = (W.ox + i) * n, gy0 = (W.oy + j) * n, seed = W.seed;
    // the chunk's biomes and ground kinds with a block's margin all round (from the next chunks, built already)
    const P = B + 2, bio = new Uint8Array(P * P), gnd = new Uint8Array(P * P);
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
      const g = wdGen(seed, W.ox + i + di, W.oy + j + dj);
      for (let y = 0; y < B; y++) {
        const py = y + dj * B + 1;
        if (py < 0 || py >= P) continue;
        for (let x = 0; x < B; x++) {
          const px = x + di * B + 1;
          if (px < 0 || px >= P) continue;
          bio[py * P + px] = g.bio[y * B + x]; gnd[py * P + px] = g.gnd[y * B + x];
        }
      }
    }
    const G = WD_BIOMES_ALL.map(wdGroundOf), ROAD = WG.ROAD;
    // the volcano's cracks and the swamp's wet patches follow noise: sampled every 4 pixels and blended between
    const NG = n / 4 + 1, crack = new Float32Array(NG * NG), wet = new Float32Array(NG * NG);
    const has = b => { for (let k = 0; k < bio.length; k++) if (bio[k] === b) return true; return false; };
    const g0 = r0 >> 2, g1 = Math.min(NG - 1, (r1 >> 2) + 1);
    if (has(WDB.VOLCANO)) for (let y = g0; y <= g1; y++) for (let x = 0; x < NG; x++) crack[y * NG + x] = Math.abs(wdNoise(seed + 201, (gx0 + x * 4) / 9, (gy0 + y * 4) / 9) - 0.5);
    if (has(WDB.SWAMP)) for (let y = g0; y <= g1; y++) for (let x = 0; x < NG; x++) wet[y * NG + x] = wdNoise(seed + 203, (gx0 + x * 4) / 14, (gy0 + y * 4) / 14);
    const at = (a, px, py) => {
      const x = px >> 2, y = py >> 2, fx = (px & 3) / 4, fy = (py & 3) / 4, k = y * NG + x;
      return (a[k] * (1 - fx) + a[k + 1] * fx) * (1 - fy) + (a[k + NG] * (1 - fx) + a[k + NG + 1] * fx) * fy;
    };
    for (let py = r0; py < r1; py++) {
      const wy = gy0 + py, by = (py >> 3) + 1, ly = py & 7;
      for (let px = 0; px < n; px++) {
        const wx = gx0 + px, bx = (px >> 3) + 1, b0 = by * P + bx, kind = gnd[b0];
        let h = Math.imul(wx, 0x27d4eb2d) ^ Math.imul(wy, 0x165667b1);
        h = Math.imul(h ^ (h >>> 15), 0x85ebca6b); h = (h ^ (h >>> 13)) >>> 0;
        let c;
        if (kind === ROAD) {
          const g = G[bio[b0]], lx = px & 7, horiz = gnd[b0 - 1] === ROAD || gnd[b0 + 1] === ROAD;
          if ((lx === 0 && gnd[b0 - 1] !== ROAD) || (lx === 7 && gnd[b0 + 1] !== ROAD) || (ly === 0 && gnd[b0 - P] !== ROAD) || (ly === 7 && gnd[b0 + P] !== ROAD)) c = g.roadEdge;
          else if ((h & 31) === 0) c = g.pebble;
          else if (g.lane !== g.road) c = (horiz ? (wy & 15) === 8 && (wx % 12) < 5 : (wx & 15) === 8 && (wy % 12) < 5) ? g.lane : g.road;
          else c = (horiz ? (wy & 7) === 2 || (wy & 7) === 5 : (wx & 7) === 2 || (wx & 7) === 5) && (h & 3) ? g.roadEdge : g.road;
        } else if (kind === WG.COBBLE) {
          const g = G[bio[b0]];
          c = (wy & 3) === 0 || ((wx + ((wy >> 2) & 1) * 2) & 3) === 0 || (h & 15) === 0 ? g.cobLine : g.cobble;
        } else if (kind === WG.FLAG) {
          const g = G[bio[b0]];
          c = (wy & 7) === 0 || ((wx + ((wy >> 3) & 1) * 4) & 7) === 0 ? ((h & 7) === 0 ? g.moss : g.flagLine) : (h & 63) === 0 ? g.moss : g.flag;
        } else if (kind === WG.SCORCH) {
          const g = G[bio[b0]];
          c = (h & 63) < 2 ? g.ember : (h & 15) === 3 ? g.ash : g.scorch;
        } else {
          // frayed: each 2x2 pixels look a few pixels off for their biome
          let h2 = Math.imul(wx >> 1, 0x27d4eb2d) ^ Math.imul(wy >> 1, 0x165667b1);
          h2 = Math.imul(h2 ^ (h2 >>> 15), 0x85ebca6b) >>> 0;
          const bb = bio[(((py + ((h2 >>> 3) & 7) - 4) >> 3) + 1) * P + ((px + (h2 & 7) - 4) >> 3) + 1], g = G[bb], d = (h >>> 12) & 1023;
          c = (h & 63) < 2 ? g.specks[(h >>> 6) % g.specks.length] : g.base;
          switch (bb) {
            case WDB.GRASS: if (d < 3) c = g.det[d]; break;
            case WDB.FOREST: if (d < 12) c = g.det[d & 1]; break;
            case WDB.AUTUMN: if (d < 9) c = g.det[d % 3]; break;
            case WDB.SNOW: if (d < 8) c = g.det[d & 1]; break;
            case WDB.DESERT: if ((wy * 3 + (wx >> 2) + (h2 & 1)) % 13 === 0) c = g.det[(h >>> 22) & 1]; break;
            case WDB.VOLCANO: if (at(crack, px, py) < 0.018) c = g.det[(h & 7) === 0 ? 1 : 0]; break;
            case WDB.SWAMP: if (d < 6) c = g.det[1]; else if (at(wet, px, py) > 0.7) c = g.det[0]; break;
            case WDB.CITY: if (d < 5) c = g.det[d & 1]; break;
            case WDB.WASTE: if (d < 14) c = g.det[d & 1]; break;
          }
        }
        out[py * n + px] = c;
      }
    }
  },

  // (instead of redrawCells) just the cells that changed, in their own biome's textures
  wdRedraw() {
    const bg = this.bgLayer.getContext('2d'), fo = this.forestLayer.getContext('2d'), BW = GW >> 1, C = WD_CC, NX = this.world.NX, pend = this.wdPending;
    const done = new Set();
    for (const i0 of this.dirtyCells) for (const i of [i0, i0 + GW]) {
      if (i >= GW * GH || done.has(i)) continue;
      done.add(i);
      const cx = i % GW, cy = (i / GW) | 0;
      if (pend && pend.size && pend.has(((cy / C) | 0) * NX + ((cx / C) | 0))) continue;   // its chunk gets painted whole
      const t = this.terrain[i], dx = cx * 4, dy = cy * 4, theme = WD_THEMES[this.wdBio[(cy >> 1) * BW + (cx >> 1)]];
      bg.clearRect(dx, dy, 4, 4); fo.clearRect(dx, dy, 4, 4);
      const key = t && wdKeyOf(t, this.wdDeco[i]);
      if (key) {
        const im = wdTexCanvas(theme, key), m = im.width >> 2;
        (wdOnForest(t) ? fo : bg).drawImage(im, (cx % m) * 4, (cy % m) * 4, 4, 4, dx, dy, 4, 4);
      }
      const caps = THEMES[theme].snowCaps;
      if (caps && wdCapSolid(t) && !(cy > 0 && wdCapSolid(this.terrain[i - GW]))) {
        const ctx = t === T_FOREST ? fo : bg;
        ctx.fillStyle = caps;
        ctx.fillRect(dx, dy, 4, 1);
        if ((cx + cy) % 3 === 0) ctx.fillRect(dx + 1, dy + 1, 2, 1);
      }
      this.layerOf[i] = t;
    }
    this.dirtyCells = [];
  },

  // what's drawn every frame: water (by block where it's all water), and the terrain types' moving tiles
  wdLists() {
    const BW = GW >> 1, T = this.terrain, wB = [], wC = [], L = { lava: [], vent: [], gas: [], lamp: [], bog: [] };
    const one = k => {
      const v = T[k];
      if (v === T_WATER) wC.push(k);
      else if (v === T_LAVA) L.lava.push(k);
      else if (v === T_VENT) L.vent.push(k);
      else if (v === T_GAS) L.gas.push(k);
      else if (v === T_LAMP) L.lamp.push(k);
      else if (v === T_BOG) L.bog.push(k);
    };
    for (let by = 0; by < GH >> 1; by++) {
      let run = null;   // all-water blocks of one biome side by side: one stretch of water, one fill
      for (let bx = 0; bx < BW; bx++) {
        const i = by * 2 * GW + bx * 2, a = T[i], b = T[i + 1], c = T[i + GW], d = T[i + GW + 1];
        if (a === T_WATER && b === T_WATER && c === T_WATER && d === T_WATER) {
          const th = this.wdBio[by * BW + bx];
          if (run && run[3] === th && run[0] + run[2] === bx * 8) run[2] += 8;
          else wB.push(run = [bx * 8, by * 8, 8, th]);
          continue;
        }
        run = null;
        if (a < T_WATER && b < T_WATER && c < T_WATER && d < T_WATER) continue;   // nothing that moves
        one(i); one(i + 1); one(i + GW); one(i + GW + 1);
      }
    }
    this.wdWaterB = wB; this.wdWaterC = wC; this.waterCells = []; this.beltCells = [];
    this.wdBioAll = L; this.bioL = L;
    this.wdListVer = (this.wdListVer || 0) + 1; this.wdCull = null;
  },

  // the moving tiles near the screen only (the rest of the window needn't be drawn)
  wdCulled(camX, camY) {
    const k = (camX >> 4) + ',' + (camY >> 4) + ',' + this.wdListVer;
    if (this.wdCull && this.wdCull.k === k) return this.wdCull.L;
    const x0 = (camX >> 2) - 8, y0 = (camY >> 2) - 8, x1 = ((camX + VIEW_W) >> 2) + 8, y1 = ((camY + VIEW_H) >> 2) + 8, A = this.wdBioAll, L = {};
    for (const n in A) L[n] = A[n].filter(i => { const x = i % GW, y = (i / GW) | 0; return x >= x0 && y >= y0 && x <= x1 && y <= y1; });
    this.wdCull = { k, L };
    return L;
  },

  // the layers slide with the land (what slides off goes; the gap is painted later)
  wdScrollLayers(dx, dy) {
    for (const c of [this.bgLayer, this.forestLayer, this.wdGround]) {
      if (!c) continue;
      const x = c.getContext('2d');
      x.globalCompositeOperation = 'copy';
      x.drawImage(c, dx, dy);
      x.globalCompositeOperation = 'source-over';
    }
    this.ground = null;
  },

  // water in each biome's colours, where you can see it
  wdWater(ctx) {
    const BW = GW >> 1, cx = Math.round(this.camX || 0), cy = Math.round(this.camY || 0), w = (this.frame >> 5) & 1 ? 'water1' : 'water0';
    const x0 = cx - 8, y0 = cy - 8, x1 = cx + VIEW_W, y1 = cy + VIEW_H;
    const pats = wdWaterPats[w] || (wdWaterPats[w] = {});
    for (const [x, y, rw, th] of this.wdWaterB || []) {
      if (x + rw < x0 || y < y0 || x > x1 || y > y1) continue;
      ctx.fillStyle = pats[th] || (pats[th] = ctx.createPattern(themeTex(WD_THEMES[th])[w], 'repeat'));
      ctx.fillRect(x, y, rw, 8);
    }
    for (const i of this.wdWaterC || []) {
      const gx = i % GW, gy = (i / GW) | 0, x = gx * 4, y = gy * 4;
      if (x < x0 || y < y0 || x > x1 || y > y1) continue;
      ctx.drawImage(themeTex(WD_THEMES[this.wdBio[(gy >> 1) * BW + (gx >> 1)]])[w], (gx & 1) * 4, (gy & 1) * 4, 4, 4, x, y, 4, 4);
    }
  },

  // ------------------------------------------------------------ on the ground (under the tanks)
  wdRenderObjects(ctx) {
    const f = this.frame;
    for (const v of this.wdVillages || []) {
      const s = v.st.s;
      if (s === 'siege') {
        // an outpost now (bigmap.js draws its eagle): how many hits it can still take; its houses smoke
        if (v.st.hitT > 0) v.st.hitT--;
        for (let k = 0; k < 3; k++) { ctx.fillStyle = k < (v.st.ehp || 0) ? (v.st.hitT > 0 && (f >> 1) & 1 ? COL.white : '#58F8F8') : '#3C3C3C'; ctx.fillRect(v.x + 2 + k * 5, v.y - 5, 3, 2); }
        for (const [tx, ty] of v.f.houses || []) {
          const hx = v.x - 96 + tx * 16 + 6, hy = v.y - 96 + ty * 16 + 4;
          if (this.get(hx >> 2, hy >> 2) !== T_BRICK || (tx + ty) % 2) continue;
          for (let k = 0; k < 4; k++) { const p = ((f + k * 20 + tx * 13) % 80) / 80; ctx.fillStyle = p < 0.2 ? '#F87800' : p < 0.5 ? '#4C4C4C' : '#7C7C7C'; ctx.fillRect(Math.round(hx + Math.sin(p * 5 + k) * 3), Math.round(hy - p * 20), p > 0.4 ? 3 : 2, p > 0.4 ? 3 : 2); }
        }
        continue;
      }
      if (s === 'lost') { ctx.drawImage(Sprites.eagleDead, v.x, v.y); continue; }
      const col = v.home ? COL.gold : s === 'saved' || s === 'friend' ? '#58D854' : '#BCBCBC';
      ctx.drawImage(Sprites.outline(Sprites.eagle, col), v.x - 1, v.y - 1);
      ctx.drawImage(Sprites.eagle, v.x, v.y);
      // its flag, and smoke from the chimneys
      const fx = v.x + 22, fy = v.y - 14;
      ctx.fillStyle = '#E8E8E8'; ctx.fillRect(fx, fy, 1, 12);
      ctx.fillStyle = col;
      for (let k = 0; k < 6; k++) ctx.fillRect(fx + 1 + k, fy + Math.round(Math.sin(f / 7 - k * 0.7)), 1, 4);
      ctx.fillStyle = 'rgba(200,200,200,0.55)';
      for (const [tx, ty] of v.f.houses || []) {
        const hx = v.x - 96 + tx * 16 + 13, hy = v.y - 96 + ty * 16 + 1;
        if (this.get(hx >> 2, (hy + 2) >> 2) !== T_BRICK) continue;
        for (let k = 0; k < 3; k++) { const p = ((f + k * 30 + tx * 17) % 90) / 90; ctx.fillRect(Math.round(hx + Math.sin(p * 6 + k) * 2), Math.round(hy - p * 14), p > 0.6 ? 2 : 1, p > 0.6 ? 2 : 1); }
      }
    }
    for (const c of this.wdChests || []) {
      ctx.drawImage(wdChestSprite(c.kind === 'big'), c.x, c.y);
      const g = (f + c.x * 3) % 96;
      if (g < 12) ctx.drawImage(Sprites.sparkle[[0, 1, 2, 3, 2, 1][g >> 1]], c.x + 4, c.y - 4, 8, 8);
    }
    for (const d of this.wdDrops || []) {
      if (d.t > WD_DROP_LIFE - 180 && (d.t >> 3) & 1) continue;
      drawPowerup(ctx, d, d.x, d.y);
    }
  },

  // ------------------------------------------------------------ the day and the dark
  // (instead of renderDarkness) dusk and dawn tint everything; at night (and in a blizzard or a blackout) only
  // what's lit shows; drawn over the screen's part of the field only
  wdDarkness(ctx, camX, camY) {
    const k = this.wdDark(), wo = this.whiteout ? this.whiteout() : 0, out = this.lightsOut(), p = (this.world.clock % WD_DAY) / WD_DAY;
    // the warm light of dusk and dawn
    const dk = WD_DUSK - 0.04, dn = WD_DAWN - 0.02, warm = p > dk && p < WD_NIGHT + 0.02 ? Math.sin((p - dk) / (WD_NIGHT + 0.02 - dk) * Math.PI) : p > dn ? Math.sin((p - dn) / (1 - dn) * Math.PI) : 0;
    if (warm > 0.05) { ctx.fillStyle = 'rgba(248,96,32,' + (0.2 * warm).toFixed(3) + ')'; ctx.fillRect(camX, camY, VIEW_W, VIEW_H); }
    let a = 0.93 * k, col = '0,0,14', mul = 1;
    if (wo > 0) { a = Math.max(a, 0.92 * wo); col = '232,238,250'; mul = 1.15; }
    else if (out) a = 0.95;
    if (a < 0.03) return;
    if (!wo && k > 0.5 && this.nightVision > 0 && !(this.nightVision < 120 && (this.frame >> 2) & 1)) {
      ctx.fillStyle = 'rgba(40,255,90,0.13)'; ctx.fillRect(camX, camY, VIEW_W, VIEW_H);
      return;
    }
    if (!this.darkLayer || this.darkLayer.width !== VIEW_W || this.darkLayer.height !== VIEW_H) this.darkLayer = makeCanvas(VIEW_W, VIEW_H);
    const d = this.darkLayer.getContext('2d');
    d.globalCompositeOperation = 'source-over';
    d.clearRect(0, 0, VIEW_W, VIEW_H);
    d.fillStyle = 'rgba(' + col + ',' + a.toFixed(3) + ')';
    d.fillRect(0, 0, VIEW_W, VIEW_H);
    d.globalCompositeOperation = 'destination-out';
    const light = (x, y, r) => {
      r *= mul; x -= camX; y -= camY;
      if (x < -r || y < -r || x > VIEW_W + r || y > VIEW_H + r) return;
      const g = d.createRadialGradient(x, y, r * 0.35, x, y, r);
      g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      d.fillStyle = g; d.fillRect(x - r, y - r, r * 2, r * 2);
    };
    for (const t of this.tanks) {
      if (!t.alive) continue;
      if (t.isPlayer) light(t.x + 8, t.y + 8, t.ally ? 40 : 56);
      else if (t.reveal > 0) light(t.x + 8, t.y + 8, 18);
    }
    for (const b of this.bullets) light(b.x + 2, b.y + 2, 12);
    for (const f of this.fx) if (f.tick >= 0) light(f.x, f.y, 28);
    for (const f of this.flames) light(f.x + f.w / 2, f.y + f.h / 2, 30);
    for (const s of this.spawns) light(s.x + 8, s.y + 8, 16);
    for (const tu of this.turrets) if (!tu.enemy) light(tu.x + 8, tu.y + 8, 24);
    for (const c of this.claudes) light(c.x + 8, c.y + 8, 36);
    for (const s of this.strikes) light(s.x + 8, s.y + 8, 22);
    if (this.powerup && (this.frame >> 4) & 1) light(this.powerup.x + 8, this.powerup.y + 8, 16);
    // villages keep their lamps lit; treasure glints
    for (const v of this.wdVillages || []) if (v.st.s !== 'lost') light(v.x + 8, v.y + 8, v.st.s === 'saved' || v.st.s === 'friend' ? 64 : 40);
    for (const c of this.wdChests || []) if ((this.frame >> 4) & 1) light(c.x + 8, c.y + 8, 14);
    for (const f of this.factories || []) if (f.hp > 0) light(f.x + 16, f.y + 22, 20);
    for (const [i, fl] of this.fires || []) if (fl.tree) light((i % GW) * 4 + 2, ((i / GW) | 0) * 4 + 2, 10);
    this.bioLights(light);
    d.globalCompositeOperation = 'source-over';
    ctx.drawImage(this.darkLayer, camX, camY);
  },

  // ------------------------------------------------------------ the minimap: what you've explored round you
  wdMinimap(ctx, camX, camY) {
    if (!Config.on('minimap')) return;
    const W = this.world, mw = 64, mh = 48, x0 = VIEW_W - mw - 3, y0 = 3;
    const [cx, cy] = this.wdCenter(), tx = Math.round((W.ox * WD_PX + cx) / 16 - mw / 2), ty = Math.round((W.oy * WD_PX + cy) / 16 - mh / 2);
    if (!this.wdMini || this.frame - this.wdMiniAt >= 15 || this.wdMiniAt > this.frame || this.wdMiniK !== tx + ',' + ty) {
      this.wdMini = this.wdMini || makeCanvas(mw, mh);
      this.wdMiniAt = this.frame; this.wdMiniK = tx + ',' + ty;
      const c = this.wdMini.getContext('2d'), img = c.createImageData(mw, mh), d = img.data;
      for (let k = 3; k < d.length; k += 4) d[k] = 170;   // the unknown: dark
      const c0 = Math.floor(tx / WD_CH), c1 = Math.floor((tx + mw - 1) / WD_CH), r0 = Math.floor(ty / WD_CH), r1 = Math.floor((ty + mh - 1) / WD_CH);
      for (let ccy = r0; ccy <= r1; ccy++) for (let ccx = c0; ccx <= c1; ccx++) {
        const r = W.chunks.get(wdKey(ccx, ccy));
        if (!r || !r.seen || !r.thumb) continue;
        for (let y = 0; y < WD_CH; y++) {
          const py = ccy * WD_CH + y - ty;
          if (py < 0 || py >= mh) continue;
          for (let x = 0; x < WD_CH; x++) {
            const px = ccx * WD_CH + x - tx;
            if (px < 0 || px >= mw) continue;
            const o = (py * mw + px) * 4, s = (y * WD_CH + x) * 3;
            d[o] = r.thumb[s]; d[o + 1] = r.thumb[s + 1]; d[o + 2] = r.thumb[s + 2]; d[o + 3] = 235;
          }
        }
      }
      c.putImageData(img, 0, 0);
      // places you've found
      this.wdMiniMarks = [];
      for (let ccy = r0; ccy <= r1; ccy++) for (let ccx = c0; ccx <= c1; ccx++) {
        const r = W.chunks.get(wdKey(ccx, ccy)), f = r && r.seen && wdFeatureOf(W.seed, ccx, ccy);
        if (!f) continue;
        const st = W.feats.get(wdKey(ccx, ccy)) || {}, mx = ccx * WD_CH + 6 - tx, my = ccy * WD_CH + 6 - ty;
        let col = null;
        if (f.kind === 'home') col = COL.gold;
        else if (f.kind === 'village') col = st.s === 'saved' || st.s === 'friend' ? '#58D854' : st.s === 'lost' ? '#5C5C5C' : st.s === 'siege' ? 'siege' : '#F8F8F8';
        else if (f.kind === 'ruin') col = st.done ? '#7C6C3C' : '#F8B800';
        else if (f.kind === 'nest') col = st.dead ? null : '#F83800';
        if (col) this.wdMiniMarks.push([mx, my, col]);
      }
    }
    const under = this.tanks.some(t => t.isPlayer && t.alive && overlap(t.x - camX, t.y - camY, 16, 16, x0 - 4, y0 - 4, mw + 8, mh + 8));
    ctx.globalAlpha = under ? 0.3 : 0.9;
    ctx.fillStyle = '#7C7C7C'; ctx.fillRect(x0 - 1, y0 - 1, mw + 2, mh + 2);
    ctx.fillStyle = '#000000'; ctx.fillRect(x0, y0, mw, mh);
    ctx.drawImage(this.wdMini, x0, y0);
    for (const [mx, my, col] of this.wdMiniMarks || []) {
      if (mx < 1 || my < 1 || mx > mw - 2 || my > mh - 2) continue;
      ctx.fillStyle = col === 'siege' ? ((this.frame >> 3) & 1 ? '#F83800' : '#F8F8F8') : col;
      ctx.fillRect(x0 + mx - 1, y0 + my - 1, 3, 3);
    }
    // the screen you see, the enemy you can see, you
    const s = 1 / 16, ox = W.ox * WD_CH - tx, oy = W.oy * WD_CH - ty;
    ctx.fillStyle = '#F8F8F8';
    const vx = Math.round(x0 + ox + camX * s), vy = Math.round(y0 + oy + camY * s), vw = Math.round(VIEW_W * s), vh = Math.round(VIEW_H * s);
    ctx.fillRect(vx, vy, vw, 1); ctx.fillRect(vx, vy + vh - 1, vw, 1); ctx.fillRect(vx, vy, 1, vh); ctx.fillRect(vx + vw - 1, vy, 1, vh);
    const dot = (x, y, col) => { const px = Math.round(x0 + ox + x * s), py = Math.round(y0 + oy + y * s); if (px >= x0 && py >= y0 && px < x0 + mw && py < y0 + mh) { ctx.fillStyle = col; ctx.fillRect(px, py, 2, 2); } };
    for (const t of this.tanks) if (this.enemySeen(t)) dot(t.x + 8, t.y + 8, '#F83800');
    for (const t of this.tanks) if (t.alive && t.isPlayer) dot(t.x + 8, t.y + 8, t.ally ? '#BCBCBC' : PALS[Config.playerPal(t.player ? t.player.i : 0)][1]);
    ctx.globalAlpha = 1;
  },

  // ------------------------------------------------------------ the side panel and the line above the field
  // the compass, the day and the villages saved, where the queue of tanks would be (the rest is as usual)
  wdRenderHud(ctx, H) {
    const W = this.world, cp = this.wdCompass, f = this.frame;
    if (this.bossIdx !== undefined) return;   // a guardian's fight: its health bar has the panel
    // the compass: a dial, its needle to the nearest place still to visit, how far in tiles under it
    const cx = H + 11, cy = 33;
    ctx.fillStyle = '#000000'; ctx.fillRect(cx - 9, cy - 11, 19, 23); ctx.fillRect(cx - 11, cy - 9, 23, 19);
    ctx.fillStyle = '#BCBCBC'; ctx.fillRect(cx - 8, cy - 10, 17, 21); ctx.fillRect(cx - 10, cy - 8, 21, 17);
    ctx.fillStyle = '#E8E8E8'; ctx.fillRect(cx - 7, cy - 9, 15, 19); ctx.fillRect(cx - 9, cy - 7, 19, 15);
    ctx.fillStyle = '#7C7C7C';
    for (const [x, y] of [[0, -9], [0, 9], [-9, 0], [9, 0]]) ctx.fillRect(cx + x, cy + y, 1, 1);
    ctx.fillStyle = '#A80000'; ctx.fillRect(cx, cy - 9, 1, 2);   // north
    const me = this.tanks.find(t => t.isPlayer && t.alive && t.player && (Net.role !== 'client' || t.player.i === Net.slot)) || null;
    if (cp) {
      const [px, py] = me ? [me.x + 8, me.y + 8] : this.wdCenter(), wx = W.ox * WD_PX + px, wy = W.oy * WD_PX + py;
      const a = Math.atan2(cp.wy - wy, cp.wx - wx), dist = Math.round(Math.hypot(cp.wx - wx, cp.wy - wy) / 16);
      const tip = cp.siege ? ((f >> 3) & 1 ? '#F83800' : '#F8B800') : cp.kind === 'ruin' ? '#F8B800' : '#D82800';
      for (let r = -5; r <= 7; r++) { ctx.fillStyle = r > 0 ? tip : '#3C3C3C'; ctx.fillRect(Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r), 1, 1); }
      ctx.fillStyle = '#000000'; ctx.fillRect(cx, cy, 1, 1);
      Font.drawCenter(ctx, String(Math.min(999, dist)), H + 12, 47, '#000000');
    } else Font.drawCenter(ctx, '-', H + 12, 47, '#000000');
    // the day: a sun or a moon, and its number
    const k = this.wdDark(), y = 60;
    if (k < 0.5) { ctx.fillStyle = '#F8B800'; ctx.fillRect(H + 1, y + 1, 5, 5); ctx.fillRect(H + 2, y, 3, 7); ctx.fillRect(H, y + 2, 7, 3); ctx.fillStyle = '#F8F878'; ctx.fillRect(H + 2, y + 2, 2, 2); }
    else { ctx.fillStyle = '#F8F8F8'; ctx.fillRect(H + 2, y, 3, 7); ctx.fillRect(H + 1, y + 1, 2, 5); ctx.fillStyle = '#636363'; ctx.fillRect(H + 3, y + 1, 2, 5); }
    Font.draw(ctx, String(Math.min(99, W.day)), H + 8, y, '#000000');
    // villages saved: a little house
    const hy = 74;
    ctx.fillStyle = '#A03808'; ctx.fillRect(H + 1, hy + 1, 5, 2); ctx.fillRect(H + 2, hy, 3, 1);
    ctx.fillStyle = '#F8F8F8'; ctx.fillRect(H + 1, hy + 3, 5, 4); ctx.fillStyle = '#000000'; ctx.fillRect(H + 3, hy + 5, 1, 2);
    Font.draw(ctx, String(Math.min(99, W.saved)), H + 8, hy, '#000000');
    // ruins looted: a chest
    const ry = 88;
    ctx.fillStyle = '#8C5418'; ctx.fillRect(H + 1, ry + 2, 6, 4); ctx.fillStyle = '#F8B800'; ctx.fillRect(H + 1, ry + 3, 6, 1); ctx.fillRect(H + 3, ry + 3, 2, 2);
    Font.draw(ctx, String(Math.min(99, W.looted || 0)), H + 8, ry, '#000000');
  },

  // above the field: how far out you are, and your best; a village to defend comes first
  wdLine(ctx) {
    const W = this.world, siege = (this.wdVillages || []).find(v => v.st.s === 'siege' && this.wdNearest(v.x, v.y) < Math.max(VIEW_W, VIEW_H) * 1.5);
    const text = siege ? 'DEFEND THE VILLAGE  WAVE ' + (siege.st.wave || 1) + '/' + (siege.st.waves || 1)
      : Math.round(this.wdDistNow()) + ' M OUT  FARTHEST ' + W.dist + ' M';
    Font.drawCenter(ctx, text, FX + VIEW_W / 2, 0, COL.black);
  },

  // news low on the screen: the land you're entering, villages, ruins, the night
  wdBanner(ctx) {
    const W = this.world, n = W.notes[W.notes.length - 1];
    if (!n) return;
    const life = n.life || WD_NOTE, a = Math.min(1, n.t / 8, (life - n.t) / 20);
    if (a <= 0) return;
    const y = VIEW_H - (n.sub ? 30 : 20);
    ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, y - 3, VIEW_W, n.sub ? 23 : 13);
    Font.drawCenter(ctx, n.text, VIEW_W / 2, y, n.color || COL.white);
    if (n.sub) Font.drawCenter(ctx, n.sub, VIEW_W / 2, y + 10, COL.lgrey);
    ctx.globalAlpha = 1;
  },
});
