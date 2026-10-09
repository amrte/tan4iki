'use strict';
// =====================================================================
//  More terrain, and dark stages
//    MUD        tanks crawl at half speed (shells pass over it)
//    BELTS      conveyor belts push any tank along their arrow
//    PADS       teleporter pads in linked pairs: a tank or shell entering one comes out of its twin
//    NIGHT/FOG  some stages are dark: you see only what your tanks, the eagle, shots and explosions light up
//  They appear in the normal stages (mud from stage 3, teleporters from 5, belts from 8), placed the same way each
//  time a stage is played, and can be painted in CONSTRUCTION.
// =====================================================================

const PAD_COLORS = ['#3CBCFC', '#F878F8', '#58D854', '#F8B800'];
const BELT_SPEED = 0.6, MUD_SLOW = 0.5;
const NIGHT_VISION_TIME = 20 * 60;   // the NIGHT VISION power-up lights up a night stage for the team for 20 s
const isBelt = t => t >= T_BELT && t < T_BELT + 4;

// teleporter pads painted in construction ('T' in a 26x26 block map: the top-left block of each 2x2 tile), and
// manholes ('O', biomes.js): pads that pair up among themselves
function padsFromBlocks(blocks) {
  const pads = [], holes = [];
  for (let by = 0; by < blocks.length; by += 2) for (let bx = 0; bx < blocks[by].length; bx += 2) {
    if (blocks[by][bx] === 'T') pads.push({ x: bx * 8, y: by * 8 });
    else if (blocks[by][bx] === 'O') holes.push({ x: bx * 8, y: by * 8, kind: 'hole' });
  }
  pads.forEach((p, i) => { p.pair = i ^ 1; p.color = PAD_COLORS[(i >> 1) % PAD_COLORS.length]; });
  if (pads.length & 1) pads.pop();   // an odd pad out has no twin
  if (holes.length & 1) holes.pop();
  holes.forEach((h, i) => { h.pair = pads.length + (i ^ 1); });
  return pads.concat(holes);
}

// night, fog or neither for a stage number
function stageWeather(num, boss) {
  const mode = Config.get('darkStages');
  if (mode === 'OFF' || boss) return null;
  if (mode === 'ALWAYS NIGHT') return 'night';
  if (mode === 'ALWAYS FOG') return 'fog';
  // MANY: a dark stage every third stage (as it used to be); SOME: one in nine, night on stages 9, 27, 45 ... (city
  // ruins, where the lamps are), fog on 13, 31, 49 ...
  if (mode === 'MANY') return num >= 6 && num % 6 === 0 ? 'night' : num >= 9 && num % 6 === 3 ? 'fog' : null;
  if (num % 18 === 9) return 'night';
  if (num % 18 === 13) return 'fog';
  return null;
}

Object.assign(Stage.prototype, {
  // ------------------------------------------------------------ generated features for the normal stages
  addTerrainExtras(num) {
    const r = seeded(num * 131 + 7), area = (COLS * ROWS) / 169;
    const tileFree = (tx, ty) => {
      const x = tx * 16, y = ty * 16;
      if (y < 32 || y > FH - 48) return false;   // keep the entry rows and the bottom row clear
      if (Math.hypot(x + 8 - BASE_X - 8, y + 8 - BASE_Y - 8) < 56) return false;
      if (PLAYER_SPAWN.some(([sx, sy]) => overlap(x, y, 16, 16, sx - 8, sy - 8, 32, 32))) return false;
      for (let cy = ty * 4; cy < ty * 4 + 4; cy++) for (let cx = tx * 4; cx < tx * 4 + 4; cx++) if (this.get(cx, cy) !== T_EMPTY) return false;
      return true;
    };
    const pickFree = () => {
      for (let k = 0; k < 80; k++) {
        const tx = Math.floor(r() * COLS), ty = Math.floor(r() * ROWS);
        if (tileFree(tx, ty)) return [tx, ty];
      }
      return null;
    };
    // mud: a few round patches
    if (num >= 3) {
      const n = Math.round((2 + (num > 10 ? 1 : 0)) * area);
      for (let k = 0; k < n; k++) {
        const t = pickFree();
        if (!t) break;
        const cx = t[0] * 4 + 2, cy = t[1] * 4 + 2, rad = 3 + r() * 2;
        for (let y = Math.floor(cy - rad); y <= cy + rad; y++) for (let x = Math.floor(cx - rad); x <= cx + rad; x++) {
          if (Math.hypot(x + 0.5 - cx, y + 0.5 - cy) > rad || this.get(x, y) !== T_EMPTY) continue;
          if (Math.hypot(x * 4 - BASE_X - 8, y * 4 - BASE_Y - 8) < 40 || y < 8) continue;
          this.set(x, y, this.theme === 'swamp' ? T_BOG : T_MUD);   // in the swamp it's bog (biomes.js)
        }
      }
    }
    // a teleporter pair: one pad on each side of the field
    if (num >= 5 && r() < 0.65) {
      const pairs = area > 2 ? 2 : 1;
      for (let k = 0; k < pairs; k++) {
        let a = null, b = null;
        for (let i = 0; i < 80 && !(a && b); i++) {
          const tx = Math.floor(r() * COLS), ty = Math.floor(r() * ROWS);
          if (!tileFree(tx, ty)) continue;
          if (!a && tx < COLS / 2 - 1) a = [tx, ty];
          else if (!b && tx > COLS / 2) b = [tx, ty];
        }
        if (a && b) {
          const i = this.pads.length;
          this.pads.push({ x: a[0] * 16, y: a[1] * 16, pair: i + 1, color: PAD_COLORS[(i >> 1) % 4] },
            { x: b[0] * 16, y: b[1] * 16, pair: i, color: PAD_COLORS[(i >> 1) % 4] });
        }
      }
    }
    // a conveyor belt: a straight run of free tiles, horizontal or vertical
    if (num >= 8 && r() < 0.6) {
      const n = Math.max(1, Math.round(area));
      for (let k = 0; k < n; k++) {
        const vertical = r() < 0.35, len = 4 + Math.floor(r() * 4);
        for (let tries = 0; tries < 60; tries++) {
          const tx = Math.floor(r() * COLS), ty = Math.floor(r() * ROWS);
          const tiles = [];
          for (let i = 0; i < len; i++) tiles.push(vertical ? [tx, ty + i] : [tx + i, ty]);
          if (!tiles.every(([x, y]) => x < COLS && y < ROWS && tileFree(x, y) && !this.pads.some(p => p.x === x * 16 && p.y === y * 16))) continue;
          const dir = vertical ? (r() < 0.5 ? 0 : 2) : (r() < 0.5 ? 1 : 3);
          for (const [x, y] of tiles) for (let cy = y * 4; cy < y * 4 + 4; cy++) for (let cx = x * 4; cx < x * 4 + 4; cx++) this.set(cx, cy, T_BELT + dir);
          break;
        }
      }
    }
    this.addBioExtras(num, r, area);   // crates, barrels, deflectors (biomes.js)
  },

  // ------------------------------------------------------------ every frame
  cellUnder(t) { return this.get((t.x + 8) >> 2, (t.y + 8) >> 2); },

  // mud, bog (slower still the deeper you've sunk) and rubble (biomes.js)
  mudFactor(t) {
    if (t.hover || t.boost.ghost) return 1;
    const c = this.cellUnder(t);
    return c === T_MUD ? MUD_SLOW : c === T_BOG ? BOG_SLOW * (1 - 0.4 * (t.sink || 0) / SINK_MAX) : c === T_RUBBLE ? RUBBLE_SLOW : 1;
  },

  updateTerrainFx() {
    for (const t of this.tanks) {
      if (!t.alive) continue;
      // conveyor belts carry tanks along (frozen ones too)
      const c = this.cellUnder(t);
      if (isBelt(c) && !t.hover) {
        const d = c - T_BELT;
        t.beltAcc = (t.beltAcc || 0) + BELT_SPEED;
        while (t.beltAcc >= 1) {
          t.beltAcc--;
          if (!this.canStep(t, d)) { t.beltAcc = 0; break; }
          t.x += DXY[d][0]; t.y += DXY[d][1];
          if (t.trail) t.trail.unshift([t.x + 8, t.y + 8]);
        }
      } else t.beltAcc = 0;
      // teleporter pads
      if (t.tpCool > 0) { t.tpCool--; continue; }
      for (const p of this.pads) {
        if (Math.abs(t.x - p.x) > 2 || Math.abs(t.y - p.y) > 2) continue;
        const q = this.pads[p.pair];
        if (!q || this.tanks.some(o => o !== t && o.alive && overlap(o.x, o.y, 16, 16, q.x, q.y, 16, 16))) break;
        this.addFx(t.x + 8, t.y + 8, [Sprites.sparkle[3], Sprites.sparkle[2], Sprites.sparkle[1]], 3);
        t.x = q.x; t.y = q.y; t.acc = 0;
        if (t.trail) t.trail.length = 0;
        t.tpCool = 90;
        this.addFx(t.x + 8, t.y + 8, [Sprites.sparkle[1], Sprites.sparkle[2], Sprites.sparkle[3]], 3);
        Sound.play(p.kind === 'hole' ? 'manhole' : 'teleport');
        break;
      }
    }
  },

  // a shell entering a pad comes out of its twin, once
  bulletPad(b) {
    if (b.tp || !this.pads.length) return;
    for (const p of this.pads) {
      if (p.kind || !overlap(b.x, b.y, 4, 4, p.x + 4, p.y + 4, 8, 8)) continue;   // shells roll over manholes
      const q = this.pads[p.pair];
      if (!q) return;
      b.x = q.x + 6 + DXY[b.dir][0] * 6; b.y = q.y + 6 + DXY[b.dir][1] * 6;
      b.tp = true;
      return;
    }
  },

  // ------------------------------------------------------------ drawing
  renderBelts(ctx) {
    if (!this.beltCells || !this.beltCells.length) return;
    const ph = (this.frame >> 2) & 3;
    for (const i of this.beltCells) {
      const cx = i % GW, cy = (i / GW) | 0, d = this.terrain[i] - T_BELT, x = cx * 4, y = cy * 4;
      ctx.fillStyle = '#383838';
      ctx.fillRect(x, y, 4, 4);
      ctx.fillStyle = '#9C9C9C';
      // a moving stripe across each cell, travelling with the belt
      const along = d & 1 ? cx : cy, sign = d === 1 || d === 2 ? 1 : -1;
      const k = (((ph * sign) - along * 4) % 4 + 4) % 4;
      if (d & 1) ctx.fillRect(x + (sign > 0 ? k : 3 - k), y, 1, 4);
      else ctx.fillRect(x, y + (sign > 0 ? k : 3 - k), 4, 1);
    }
  },

  renderPads(ctx) {
    for (const p of this.pads) {
      if (p.kind === 'hole') { ctx.drawImage(manholeSprite(), p.x, p.y); continue; }   // a manhole (biomes.js)
      const pulse = (this.frame >> 3) & 1;
      ctx.fillStyle = '#202020';
      ctx.fillRect(p.x + 1, p.y + 1, 14, 14);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x + 2, p.y + 2, 12, 1); ctx.fillRect(p.x + 2, p.y + 13, 12, 1);
      ctx.fillRect(p.x + 2, p.y + 2, 1, 12); ctx.fillRect(p.x + 13, p.y + 2, 1, 12);
      ctx.fillRect(p.x + 6 - pulse, p.y + 6 - pulse, 4 + pulse * 2, 4 + pulse * 2);
    }
  },

  // night and fog: a dark layer with holes where something gives light
  renderDarkness(ctx) {
    const wo = this.whiteout ? this.whiteout() : 0;   // a winter blizzard (seasonal.js)
    const w = this.weather || (wo > 0 ? 'blizzard' : null) || (this.lightsOut() ? 'night' : null);   // a city blackout (biomes.js)
    if (!w) return;
    // night vision: the whole field in green, flickering back to dark in its last two seconds
    if (w === 'night' && this.nightVision > 0 && !(this.nightVision < 120 && (this.frame >> 2) & 1)) {
      ctx.fillStyle = 'rgba(40,255,90,0.13)';
      ctx.fillRect(0, 0, FW, FH);
      return;
    }
    if (!this.darkLayer || this.darkLayer.width !== FW || this.darkLayer.height !== FH) this.darkLayer = makeCanvas(FW, FH);
    const d = this.darkLayer.getContext('2d'), k = w === 'fog' ? 1.4 : w === 'blizzard' ? 1.15 : 1;
    d.globalCompositeOperation = 'source-over';
    d.clearRect(0, 0, FW, FH);
    d.fillStyle = w === 'fog' ? 'rgba(150,150,160,0.86)' : w === 'blizzard' ? 'rgba(232,238,250,' + (0.92 * wo).toFixed(2) + ')' : 'rgba(0,0,14,0.95)';
    d.fillRect(0, 0, FW, FH);
    d.globalCompositeOperation = 'destination-out';
    const light = (x, y, r) => {
      r *= k;
      const g = d.createRadialGradient(x, y, r * 0.35, x, y, r);
      g.addColorStop(0, 'rgba(0,0,0,1)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      d.fillStyle = g;
      d.fillRect(x - r, y - r, r * 2, r * 2);
    };
    for (const t of this.tanks) {
      if (!t.alive) continue;
      if (t.isPlayer) light(t.x + 8, t.y + 8, t.ally ? 40 : 56);
      else if (t.reveal > 0) light(t.x + 8, t.y + 8, 18);   // a muzzle flash gives an enemy away
    }
    if (this.baseAlive) light(BASE_X + 8, BASE_Y + 8, 30);
    for (const b of this.bullets) light(b.x + 2, b.y + 2, 12);
    for (const f of this.fx) if (f.tick >= 0) light(f.x, f.y, 28);
    for (const f of this.flames) light(f.x + f.w / 2, f.y + f.h / 2, 30);
    for (const s of this.spawns) light(s.x + 8, s.y + 8, 16);
    for (const p of this.pads) if (!p.kind) light(p.x + 8, p.y + 8, 12);
    for (const tu of this.turrets) if (!tu.enemy) light(tu.x + 8, tu.y + 8, 24);
    for (const c of this.claudes) light(c.x + 8, c.y + 8, 36);
    for (const s of this.strikes) light(s.x + 8, s.y + 8, 22);
    if (this.powerup && (this.frame >> 4) & 1) light(this.powerup.x + 8, this.powerup.y + 8, 16);
    this.bioLights(light);   // lamps, lava, vents (biomes.js)
    d.globalCompositeOperation = 'source-over';
    ctx.drawImage(this.darkLayer, 0, 0);
  },
});
