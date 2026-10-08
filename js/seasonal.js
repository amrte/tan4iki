'use strict';
// =====================================================================
//  What makes each season its own, besides the look (seasons.js): a twist in the rules and an enemy found nowhere else.
//    SPRING   SHOWERS   now and then it rains; puddles of mud form on open ground and dry up a while after
//             HOPPER    a light tank on springs: when a thin wall or water blocks it, it jumps over
//    SUMMER   WILDFIRE  explosions set trees ablaze (and the heat starts the odd fire by itself); fire spreads from
//                       tree to tree, burns them away and burns any tank inside
//             FIREBUG   its shells set fire to trees and ground where they land; it doesn't burn itself
//    AUTUMN   GUSTS     a gust of wind every so often shoves every tank one way for a few seconds
//             GUSTER    a big fan up front: blows you backwards when you're in front of it
//    WINTER   BLIZZARD  now and then a whiteout: you see only what is close (and so do they, they fire less)
//             FROST     its shells freeze you solid for a moment instead of destroying you; a second hit
//                       while frozen shatters you. They freeze water they fly over, too
//    NUCLEAR  HOT SPOTS glowing radioactive patches: stay in one and your Geiger counter fills; when it's
//                       full your tank is gone. Out of them it clicks back down
//             GHOUL     destroyed, it leaves a glowing wreck that rises again 4 s later, unless you shoot it
//    DESERT   MIRAGES   phantom tanks shimmer into view: their shells can't hurt, a shot or a touch and
//                       they're gone (no points)
//             BURROWER  dives under the sand (shells pass over it), runs, and surfaces somewhere else to fire
//  Settings -> GAME -> SEASON EFFECTS turns the twists off; the enemies each have APPEARS in ENEMY TYPES.
// =====================================================================

const SEASON_ENEMY = { spring: 18, summer: 19, autumn: 20, winter: 21, nuclear: 22, desert: 23 };
const SEASON_FX_NAME = { spring: 'SHOWERS', summer: 'WILDFIRE', autumn: 'GUSTS', winter: 'BLIZZARDS', nuclear: 'HOT SPOTS', desert: 'MIRAGES' };
const HOP_TIME = 24, FROST_TIME = 150, GHOUL_RISE = 240, GUST_RANGE = 96, RAD_MAX = 180, MIRAGE_LIFE = 900;
const SHOWER_TIME = 720, BLIZZARD_TIME = 600, GUST_TIME = 240;
// easier skills are gentler with you: how long the Geiger counter takes to fill, how long you can stand in flames
const RAD_SKILL = [2, 1.6, 1.25, 1, 0.85], BURN_GRACE = [60, 40, 25, 15, 8];
const seasonSkill = () => { const s = Config.get('skill'); return s === AUTO_SKILL ? Math.max(0, Math.min(4, Math.round(AutoSkill.rating))) : s; };

// ------------------------------------------------------------------ the six tanks
Object.assign(PALS, {
  hopper: [null, '#F8B8F8', '#58D854', '#004800'],
  firebug: [null, '#F8D878', '#E45C10', '#300800'],
  guster: [null, '#F8D8A8', '#AC7C00', '#3C1800'],
  frost: [null, '#F8F8F8', '#7CC8F8', '#00287C'],
  ghoul: [null, '#B8F818', '#4C6C3C', '#101810'],
  ghoulDead: [null, '#38581C', '#1C2C14', '#080C08'],
  burrower: [null, '#FCE0A8', '#C8903C', '#4C2C00'],
});
// HOPPER: a light frame on big coil springs
TANK_GRIDS.e18 = canvasEnemyGrids(['........', '.......1', '.......1', '111...11', '131.1122', '111.1222', '131.1232', '111.1222',
  '131.1222', '111.1232', '131.1222', '111.1122', '131..111', '111.....', '........', '........']);
// FIREBUG: a beetle shell with feelers, no tracks
TANK_GRIDS.e19 = canvasEnemyGrids(['.....1..', '......1.', '.......1', '...11111', '..122222', '.1223333', '11222322', '12222222',
  '12233222', '12222222', '11222322', '.1222222', '..122222', '...11111', '........', '........'], false);
// GUSTER: a great round fan in front of the hull
TANK_GRIDS.e20 = canvasEnemyGrids(['..111111', '.1233333', '.1232222', '.1233333', '..111111', '111..1..', '13111111', '11112222',
  '13112222', '11112332', '13112222', '11112222', '13111111', '111.....', '........', '........']);
// FROST: angular, icicles hanging off the back
TANK_GRIDS.e21 = canvasEnemyGrids(['.......3', '.......1', '.......1', '1.1....1', '131.1111', '11112222', '13112333', '11112322',
  '13112333', '11112222', '13111111', '111.1.1.', '1.1.....', '........', '........', '........']);
// GHOUL: a skull for a turret
TANK_GRIDS.e22 = canvasEnemyGrids(['.......1', '.......1', '111.1111', '13112222', '11122222', '13123322', '11122222', '13122222',
  '11112121', '13111111', '11112222', '13112222', '11111111', '111.....', '........', '........']);
// BURROWER: a drill for a nose
TANK_GRIDS.e23 = canvasEnemyGrids(['.......1', '......11', '......12', '.....122', '....1222', '111.1232', '13111222', '11112222',
  '13112332', '11112222', '13112222', '11111111', '13111111', '111.....', '........', '........']);

Object.assign(Stage.prototype, {
  // ------------------------------------------------------------ set-up
  setupSeason(opts) {
    this.fires = new Map(); this.puddles = []; this.wrecks = []; this.zones = [];
    this.wind = null; this.blizzard = 0; this.shower = 0;
    // the twist: in the normal game and the modes, not in boss fights or the editor
    this.seasonFx = Config.on('seasonFx') && !opts.boss && !opts.editor && !opts.snapshot && THEMES[this.theme] && SEASON_FX_NAME[this.theme] ? this.theme : null;
    const s = this.seasonFx;
    this.seaT = 600 + rnd(600);   // the first shower, gust, blizzard, mirage or summer fire
    if (s === 'nuclear') this.placeHotSpots();
    if (!opts.snapshot && !this.seasoned) this.seasonEnemies(this.queue);
  },

  // the season's own enemy takes some places in a line-up (from the 3rd tank on)
  seasonEnemies(queue) {
    const type = SEASON_ENEMY[this.theme];
    if (type === undefined || !queue || queue.length < 4 || Config.get('e' + type + 'On') === 'OFF') return;
    const mult = { OFF: 0, FEW: 0.5, NORMAL: 1, MANY: 1.8 }[Config.get('newEnemies')] || 0;
    const n = Math.min(8, queue.length - 2, Math.round((3 + Math.floor(this.num / 8)) * mult));
    for (let k = 0; k < n; k++) queue[2 + Math.floor((k + 0.5) * (queue.length - 2) / n)].type = type;
  },

  // one enemy arriving one at a time (corridor, maze reinforcements): sometimes the season's own
  seasonSwap(q, chance = 0.08) {
    const type = SEASON_ENEMY[this.theme];
    if (type !== undefined && Config.get('e' + type + 'On') !== 'OFF' && Config.get('newEnemies') !== 'OFF' && Math.random() < chance) q.type = type;
    return q;
  },

  placeHotSpots() {
    const n = Math.max(3, Math.min(12, Math.round(3 * FW * FH / (208 * 208))));
    const away = (x, y, list, d) => list.every(([px, py]) => Math.abs(px + 8 - x) + Math.abs(py + 8 - y) > d);
    for (let k = 0, tries = 0; k < n && tries < 400; tries++) {
      const x = 24 + rnd((FW - 48) / 8) * 8, y = 24 + rnd((FH - 48) / 8) * 8;
      if (!away(x, y, PLAYER_SPAWN.concat(this.vsSpawn || []), 64) || !away(x, y, ENEMY_SPAWNS, 40) || !away(x, y, [[BASE_X, BASE_Y]], 64)) continue;
      if (this.zones.some(z => Math.hypot(z.x - x, z.y - y) < 56)) continue;
      if (this.get(x >> 2, y >> 2) === T_STEEL || this.get(x >> 2, y >> 2) === T_WATER) continue;
      this.zones.push({ x, y, r: 18 + rnd(3) * 3 });
      k++;
    }
  },

  // ------------------------------------------------------------ every frame
  updateSeason() {
    const s = this.seasonFx;
    if (s && !this.over && !this.clearTimer && this.freezeE <= 0 && --this.seaT <= 0) this.seasonEvent(s);
    if (this.shower > 0) this.updateShower();
    for (const pd of this.puddles) if (this.frame >= pd.dry) for (const i of pd.cells) if (this.terrain[i] === T_MUD) this.set(i % GW, (i / GW) | 0, T_EMPTY);
    this.puddles = this.puddles.filter(pd => this.frame < pd.dry);
    if (this.wind && --this.wind.t <= 0) this.wind = null;
    if (this.wind) this.updateWind();
    if (this.blizzard > 0) this.blizzard--;
    if (this.fires.size && this.frame % 4 === 0) this.updateFires();
    if (this.zones.length) this.updateRadiation();
    if (this.wrecks.length) this.updateWrecks();
    for (const t of this.tanks) {
      if (!t.alive || t.isPlayer) continue;
      if (t.mirage) { this.updateMirage(t); continue; }
      const kind = kindOf(t);
      if (kind === 'burrower') this.updateBurrower(t);
      else if (kind === 'guster' && this.freezeE <= 0) this.gusterBlow(t);
    }
  },

  // the season's next event, and when the one after it comes
  seasonEvent(s) {
    if (s === 'spring') { this.shower = SHOWER_TIME; this.seaT = SHOWER_TIME + 1500 + rnd(1200); this.seasonNote('SHOWER!', '#7CB8F8'); }
    else if (s === 'summer') {
      // the heat: a tree somewhere catches fire
      const trees = [];
      for (let i = 0; i < this.terrain.length; i += 7) if (this.terrain[i] === T_FOREST) trees.push(i);
      if (trees.length) { const i = trees[rnd(trees.length)]; this.ignite(i, false); this.seasonNote('WILDFIRE!', '#F87830', (i % GW) * 4, ((i / GW) | 0) * 4); }
      this.seaT = 1500 + rnd(1200);
    } else if (s === 'autumn') {
      const dir = Math.random() < 0.65 ? (Math.random() < 0.5 ? 1 : 3) : (Math.random() < 0.5 ? 0 : 2);
      this.wind = { dir, t: GUST_TIME };
      this.seaT = GUST_TIME + 1200 + rnd(900);
      this.seasonNote('GUST ' + ['^^^', '>>>', 'VVV', '<<<'][dir], '#F8B800');
    } else if (s === 'winter') { this.blizzard = BLIZZARD_TIME; this.seaT = BLIZZARD_TIME + 1500 + rnd(1200); this.seasonNote('BLIZZARD!', '#F8F8F8'); }
    else if (s === 'desert') {
      if (this.tanks.filter(t => t.mirage).length < 2) this.spawnMirage();
      this.seaT = 900 + rnd(700);
    } else this.seaT = 1e9;
  },

  seasonNote(text, color, x, y) {
    this.popups.push({ x: x !== undefined ? x : (this.camX || 0) + VIEW_W / 2, y: y !== undefined ? y : (this.camY || 0) + 48, text, label: true, color, t: 0, delay: 0, life: 110 });
  },

  // ------------------------------------------------------------ spring: showers and puddles
  updateShower() {
    this.shower--;
    if (this.shower % 40 !== 0 || this.puddles.length >= 8) return;
    for (let k = 0; k < 20; k++) {
      const x = rnd((FW - 16) / 8 + 1) * 8, y = rnd((FH - 16) / 8 + 1) * 8, cells = [];
      if (Math.abs(x - BASE_X) < 40 && Math.abs(y - BASE_Y) < 40) continue;
      let ok = true;
      for (let cy = y >> 2; cy < (y + 16) >> 2 && ok; cy++) for (let cx = x >> 2; cx < (x + 16) >> 2; cx++) {
        if (this.get(cx, cy) !== T_EMPTY) { ok = false; break; }
        cells.push(cy * GW + cx);
      }
      if (!ok) continue;
      // a rounded puddle: leave the corners dry
      const keep = cells.filter((i, n) => ![0, 3, 12, 15].includes(n));
      for (const i of keep) this.set(i % GW, (i / GW) | 0, T_MUD);
      this.puddles.push({ cells: keep, dry: this.frame + this.shower + 600 + rnd(600) });
      return;
    }
  },

  // ------------------------------------------------------------ summer: fire
  // set a 4px cell burning (trees burn longer and spread; open ground only flickers a moment)
  ignite(i, ground, safe) {
    if (this.fires.has(i) || this.fires.size > 500) return;
    const v = this.terrain[i];
    // safe: started by your own napalm tower, it doesn't burn you (fortress.js)
    if (v === T_FOREST) this.fires.set(i, { life: 150, tree: true, safe });
    else if (ground && (v === T_EMPTY || v === T_ICE || v === T_MUD)) this.fires.set(i, { life: 90, tree: false, safe });
  },

  igniteAt(x, y, r, ground, safe) {
    for (let cy = Math.floor((y - r) / 4); cy <= Math.floor((y + r) / 4); cy++) {
      for (let cx = Math.floor((x - r) / 4); cx <= Math.floor((x + r) / 4); cx++) {
        if (cx < 0 || cy < 0 || cx >= GW || cy >= GH || Math.hypot(cx * 4 + 2 - x, cy * 4 + 2 - y) > r) continue;
        this.ignite(cy * GW + cx, ground, safe);
      }
    }
  },

  // an explosion: in summer the trees around it catch
  explosionHeat(x, y, r) { if (this.seasonFx === 'summer') this.igniteAt(x, y, r, false); },

  updateFires() {
    const spread = [];
    for (const [i, f] of this.fires) {
      f.life -= 4;
      if (f.tree && f.life > 30 && Math.random() < 0.25) {
        const cx = i % GW, cy = (i / GW) | 0;
        const [dx, dy] = DXY[rnd(4)], nx = cx + dx, ny = cy + dy;
        if (nx >= 0 && ny >= 0 && nx < GW && ny < GH) spread.push(ny * GW + nx);
      }
      if (f.life <= 0) {
        this.fires.delete(i);
        if (f.tree && this.terrain[i] === T_FOREST) this.set(i % GW, (i / GW) | 0, T_EMPTY);   // burnt away
      }
    }
    for (const i of spread) this.ignite(i, false);
    if (!this.fires.size) return;
    // tanks in the flames get burnt (firebugs don't; something underground or in the air is safe)
    for (const t of this.tanks.slice()) {
      if (!t.alive || t.burrow > 0 || t.hopT > 0 || t.mirage || (!t.isPlayer && kindOf(t) === 'firebug')) continue;
      let hot = false;
      for (let cy = (t.y + 2) >> 2; cy <= (t.y + 13) >> 2 && !hot; cy++) for (let cx = (t.x + 2) >> 2; cx <= (t.x + 13) >> 2; cx++) { const f = this.fires.get(cy * GW + cx); if (f && !(f.safe && t.isPlayer)) { hot = true; break; } }
      if (!hot) { t.heat = 0; continue; }
      if ((t.burnAt || 0) > this.frame) continue;
      // you get a moment to drive out (longer on easier skills); enemies burn at once
      if (t.isPlayer && (t.heat = (t.heat || 0) + 4) < BURN_GRACE[seasonSkill()]) continue;
      t.burnAt = this.frame + 45; t.heat = 0;
      if (t.isPlayer) this.hitPlayer(t); else this.hitEnemy(t, null);
    }
  },

  // ------------------------------------------------------------ autumn: wind
  // push a tank one pixel in direction d, if there's room
  shove(t, d) {
    if (!this.canStep(t, d)) return false;
    t.x += DXY[d][0]; t.y += DXY[d][1];
    return true;
  },

  updateWind() {
    const w = this.wind, k = Math.min(1, w.t / 30, (GUST_TIME - w.t) / 30);   // eases in and out
    for (const t of this.tanks) {
      if (!t.alive || t.burrow > 0 || t.hopT > 0) continue;
      t.windAcc = (t.windAcc || 0) + 0.45 * k;
      while (t.windAcc >= 1) { t.windAcc--; this.shove(t, w.dir); }
    }
  },

  gusterBlow(t) {
    t.blowing = false;
    for (const o of this.tanks) {
      if (!o.alive || !o.isPlayer) continue;
      const dx = o.x - t.x, dy = o.y - t.y;
      const ahead = [-dy, dx, dy, -dx][t.dir], side = Math.abs((t.dir & 1) ? dy : dx);
      if (ahead <= 0 || ahead > GUST_RANGE || side > 10 || !this.sightLine(t.x + 8, t.y + 8, o.x + 8, o.y + 8)) continue;
      t.blowing = true;
      o.blowAcc = (o.blowAcc || 0) + 0.9;
      while (o.blowAcc >= 1) { o.blowAcc--; this.shove(o, t.dir); }
    }
  },

  // ------------------------------------------------------------ hopper
  // blocked by a thin wall (or water): jump over it, if there's room to land
  tryHop(t) {
    if (t.hopT > 0) return false;
    const [dx, dy] = DXY[t.dir], x1 = Math.round((t.x + dx * 32) / 8) * 8, y1 = Math.round((t.y + dy * 32) / 8) * 8;
    if (x1 < 0 || y1 < 0 || x1 > FW - 16 || y1 > FH - 16) return false;
    for (let cy = y1 >> 2; cy < (y1 + 16) >> 2; cy++) for (let cx = x1 >> 2; cx < (x1 + 16) >> 2; cx++) {
      const v = this.get(cx, cy);
      if (v === T_BRICK || v === T_STEEL || v === T_WATER) return false;
    }
    if (this.tanks.some(o => o.alive && o !== t && overlap(o.x, o.y, 16, 16, x1, y1, 16, 16))) return false;
    if (!this.noBase && overlap(x1, y1, 16, 16, BASE_X, BASE_Y, 16, 16)) return false;
    t.hop = [t.x, t.y, x1, y1];
    t.hopT = HOP_TIME;
    Sound.play('skid');
    return true;
  },

  hopStep(t) {
    const [x0, y0, x1, y1] = t.hop, k = 1 - --t.hopT / HOP_TIME;
    t.x = Math.round(x0 + (x1 - x0) * k); t.y = Math.round(y0 + (y1 - y0) * k);
    if (t.hopT <= 0) { t.x = x1; t.y = y1; t.hop = null; }
  },

  // ------------------------------------------------------------ frost
  frostHit(t) {
    if (t.shield > 0) return;
    if (t.frozen > 0) { this.hitPlayer(t); return; }   // frozen solid: this one shatters you
    t.frozen = FROST_TIME;
    t.iced = FROST_TIME;
    this.popups.push({ x: t.x + 8, y: t.y - 4, text: 'FROZEN!', label: true, color: '#7CC8F8', t: 0, delay: 0, life: 70 });
    Sound.play('armor');
  },

  // a frost shell freezes the water under it; a firebug's shell sets trees on fire as it passes
  specialShell(b) {
    const x0 = Math.floor(b.x / 4), y0 = Math.floor(b.y / 4);
    for (let cy = y0; cy <= y0 + 1; cy++) for (let cx = x0; cx <= x0 + 1; cx++) {
      const v = this.get(cx, cy);
      if (b.frost && v === T_WATER) this.set(cx, cy, T_ICE);
      if (b.fire && v === T_FOREST) this.ignite(cy * GW + cx, false);
    }
  },

  // ------------------------------------------------------------ ghoul
  ghoulDown(t) {
    if (t.risen || this.over || !this.wrecks) return;
    this.wrecks.push({ x: t.x, y: t.y, dir: t.dir, t: GHOUL_RISE, vet: t.vet });
  },

  updateWrecks() {
    for (const w of this.wrecks) {
      if (this.freezeE > 0 || --w.t > 0) continue;
      if (this.tanks.some(o => o.alive && overlap(o.x, o.y, 16, 16, w.x, w.y, 16, 16))) { w.t = 10; continue; }
      const st = Config.enemy(22), vr = ENEMY_RANKS[w.vet] || { hp: 0, shell: 1, speed: 1 };
      const g = new Tank({ x: w.x, y: w.y, dir: w.dir, type: 22, hp: st.hp + vr.hp, vet: w.vet, speed: st.speed * vr.speed * Config.skill().speed,
        bulletSpeed: st.bullet * vr.shell * Config.skill().shell, maxBullets: 1, ai: AI.HUNT });
      g.risen = true;
      this.tanks.push(g);
      this.enemySpawned(g);
      this.addFx(w.x + 8, w.y + 8, [Sprites.sparkle[0], Sprites.sparkle[1], Sprites.sparkle[2]], 5);
      this.popups.push({ x: w.x + 8, y: w.y - 4, text: 'IT RISES!', label: true, color: '#B8F818', t: 0, delay: 0, life: 70 });
      Sound.play('teleport');
      w.done = true;
    }
    this.wrecks = this.wrecks.filter(w => !w.done);
  },

  // a player's shell on a ghoul's wreck puts it down for good
  bulletWreck(b) {
    const w = this.wrecks.find(q => overlap(b.x, b.y, 4, 4, q.x, q.y, 16, 16));
    if (!w) return false;
    this.killBullet(b, true);
    this.wrecks.splice(this.wrecks.indexOf(w), 1);
    this.addFx(w.x + 8, w.y + 8, BIG_EXPLOSION(), 4);
    Sound.play('explode');
    if (b.owner && b.owner.player) { this.addScore(b.owner.player, 100); this.popups.push({ x: w.x + 8, y: w.y + 8, text: '100', t: 0, delay: 0 }); }
    return true;
  },

  // ------------------------------------------------------------ burrower
  updateBurrower(t) {
    if (this.freezeE > 0) return;
    if (t.burrow > 0) {
      if (--t.burrow > 0) return;
      // back up, unless someone is standing there
      if (this.tanks.some(o => o.alive && o !== t && !(o.burrow > 0) && overlap(o.x, o.y, 16, 16, t.x, t.y, 16, 16))) { t.burrow = 10; return; }
      t.speed = t.landSpeed || t.speed;
      t.cd = 200 + rnd(120);
      t.reveal = 60;
      this.addFx(t.x + 8, t.y + 8, Sprites.smallExp, 3);
      Sound.play('burrow');
      return;
    }
    if (t.cd === undefined || t.cd > 400) t.cd = 150 + rnd(120);
    if (--t.cd <= 0) {
      t.burrow = 150 + rnd(60);
      t.landSpeed = t.speed;
      t.speed *= 1.6;
      Sound.play('burrow');
    }
  },

  // ------------------------------------------------------------ desert: mirages
  spawnMirage() {
    for (let k = 0; k < 30; k++) {
      const x = rnd((FW - 16) / 16 + 1) * 16, y = rnd((FH - 16) / 16 + 1) * 16;
      if (this.tanks.some(o => o.alive && Math.abs(o.x - x) + Math.abs(o.y - y) < (o.isPlayer ? 80 : 24))) continue;
      let bad = false;
      for (let cy = y >> 2; cy < (y + 16) >> 2 && !bad; cy++) for (let cx = x >> 2; cx < (x + 16) >> 2; cx++) {
        const v = this.get(cx, cy);
        if (v === T_BRICK || v === T_STEEL || v === T_WATER) { bad = true; break; }
      }
      if (bad) continue;
      const type = rnd(4), st = Config.enemy(type);
      const m = new Tank({ x, y, dir: rnd(4), type, hp: 1, speed: st.speed, bulletSpeed: st.bullet, maxBullets: 1, ai: AI.HUNT });
      m.mirage = MIRAGE_LIFE;
      this.tanks.push(m);
      return;
    }
  },

  updateMirage(t) {
    if (--t.mirage <= 0) { this.vanishMirage(t, false); return; }
    // a touch and it's gone
    if (this.tanks.some(o => o.alive && o.isPlayer && overlap(o.x - 2, o.y - 2, 20, 20, t.x, t.y, 16, 16))) this.vanishMirage(t, true);
  },

  vanishMirage(t, seen) {
    if (!t.alive) return;
    t.alive = false;
    this.addFx(t.x + 8, t.y + 8, [Sprites.sparkle[2], Sprites.sparkle[1], Sprites.sparkle[0]], 4);
    if (seen) { this.popups.push({ x: t.x + 8, y: t.y, text: 'MIRAGE', label: true, color: '#F8D878', t: 0, delay: 0, life: 60 }); Sound.play('teleport'); }
  },

  // a mirage's shell is nothing: it fades when it meets anything
  mirageShell(b) {
    const v = this.get(Math.floor((b.x + 2) / 4), Math.floor((b.y + 2) / 4));
    if (v === T_BRICK || v === T_STEEL || this.tanks.some(t => t.alive && t.isPlayer && overlap(b.x, b.y, 4, 4, t.x, t.y, 16, 16))) b.alive = false;
    if (!b.alive && !b.free) b.owner.bullets = Math.max(0, b.owner.bullets - 1);
  },

  // ------------------------------------------------------------ nuclear: hot spots
  updateRadiation() {
    for (const t of this.tanks) {
      if (!t.alive || !t.isPlayer || t.ally) continue;
      const p = t.player, inside = this.zones.some(z => Math.hypot(t.x + 8 - z.x, t.y + 8 - z.y) < z.r);
      if (inside && t.shield <= 0) {
        p.rad = (p.rad || 0) + 1;
        if (this.frame % Math.max(4, 18 - Math.floor(p.rad / RAD_SKILL[seasonSkill()] / 12)) === 0) Sound.play('tick');
        if (p.rad >= RAD_MAX * RAD_SKILL[seasonSkill()]) {
          p.rad = 0;
          this.popups.push({ x: t.x + 8, y: t.y - 4, text: 'RADIATION!', label: true, color: '#B8F818', t: 0, delay: 0, life: 80 });
          this.hitPlayer(t);
        }
      } else if (p.rad > 0) p.rad = Math.max(0, p.rad - 0.5);
    }
  },

  // ------------------------------------------------------------ drawing
  // on the ground, under the tanks: hot spots, wrecks
  renderSeasonUnder(ctx) {
    for (const z of this.zones || []) {
      const pulse = (this.frame >> 3) & 1;
      for (let dy = -z.r; dy <= z.r; dy += 2) for (let dx = -z.r; dx <= z.r; dx += 2) {
        const d = Math.hypot(dx, dy);
        if (d > z.r || ((dx + dy) >> 1) & 1) continue;
        ctx.fillStyle = d > z.r - 3 ? (pulse ? '#B8F818' : '#58A800') : d < 5 ? '#D8F878' : 'rgba(120,220,40,0.45)';
        ctx.fillRect(z.x + dx, z.y + dy, 2, 2);
      }
    }
    for (const w of this.wrecks || []) {
      ctx.drawImage(Sprites.tank('e22', 0, w.dir, 'ghoulDead'), w.x, w.y);
      if (w.t < 90 ? (this.frame >> 1) & 1 : (this.frame >> 4) & 1) ctx.drawImage(Sprites.outline(Sprites.tank('e22', 0, w.dir, 'ghoulDead'), '#B8F818'), w.x - 1, w.y - 1);
    }
  },

  // a tank as the season sees it: up in the air, under the sand, a shimmer of heat (false: draw it as usual)
  drawSeasonTank(ctx, t) {
    if (t.burrow > 0) {
      // a mound of sand moving along
      const f = this.frame;
      ctx.fillStyle = '#A07838'; ctx.fillRect(t.x + 3, t.y + 7, 10, 5);
      ctx.fillStyle = '#C8A060'; ctx.fillRect(t.x + 5, t.y + 5, 6, 3);
      ctx.fillStyle = '#E0C080';
      for (let k = 0; k < 3; k++) ctx.fillRect(t.x + 2 + ((f + k * 5) % 12), t.y + 11 + (k & 1), 1, 1);
      return true;
    }
    if (t.hopT > 0) {
      const lift = Math.round(Math.sin(Math.PI * (1 - t.hopT / HOP_TIME)) * 10);
      ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(t.x + 3, t.y + 10, 10, 4);
      ctx.save(); ctx.translate(0, -lift); this.drawTank(ctx, t); ctx.restore();
      return true;
    }
    if (t.mirage) {
      ctx.save();
      ctx.globalAlpha = 0.45 + 0.25 * Math.sin(this.frame / 6 + t.x);
      ctx.translate(Math.round(Math.sin(this.frame / 3 + t.y) * 1.2), 0);
      this.drawTank(ctx, t);
      ctx.restore();
      return true;
    }
    return false;
  },

  // over everything on the ground: flames, frost, the guster's wind, Geiger counters, rain and whiteout
  renderSeasonOver(ctx, camX, camY) {
    const f = this.frame, fire = ['#F8F8F8', '#F8D878', '#F87830', '#D82800'];
    for (const [i, fl] of this.fires || []) {
      const cx = i % GW, cy = (i / GW) | 0, x = cx * 4, y = cy * 4, h = cx * 7 + cy * 13;
      // a red base, an orange body, a flickering yellow-white tip
      ctx.fillStyle = '#D82800'; ctx.fillRect(x, y + 2, 4, 2);
      ctx.fillStyle = fire[2 - ((h + (f >> 2)) & 1)]; ctx.fillRect(x + ((h + (f >> 1)) & 1), y + 1, 3, 2);
      if (fl.tree && ((h + (f >> 1)) % 3)) { ctx.fillStyle = fire[(h + (f >> 2)) & 1]; ctx.fillRect(x + 1 + ((h >> 1) & 1), y - ((f + h) & 1), 1, 2); }
    }
    for (const t of this.tanks) {
      if (!t.alive) continue;
      if (t.isPlayer && t.iced > 0) { t.iced--; ctx.drawImage(Sprites.outline(Sprites.rankTank('p' + t.player.level, 0, t.dir, Config.playerPal(t.player.i), 1, 0), '#7CC8F8'), t.x - 1, t.y - 1); }
      if (t.blowing) {
        ctx.fillStyle = 'rgba(248,248,248,0.7)';
        for (let k = 0; k < 6; k++) {
          const d = (f * 3 + k * 16) % GUST_RANGE, s = ((k * 5) % 12) - 6;
          const [x, y] = [[t.x + 8 + s, t.y - d], [t.x + 16 + d, t.y + 8 + s], [t.x + 8 + s, t.y + 16 + d], [t.x - d, t.y + 8 + s]][t.dir];
          ctx.fillRect(x, y, (t.dir & 1) ? 4 : 1, (t.dir & 1) ? 1 : 4);
        }
      }
      if (t.isPlayer && t.player && t.player.rad > 0) {
        const full = RAD_MAX * RAD_SKILL[seasonSkill()], w = Math.round(14 * Math.min(1, t.player.rad / full));
        ctx.fillStyle = COL.black; ctx.fillRect(t.x, t.y - 4, 16, 3);
        ctx.fillStyle = t.player.rad > full * 0.66 ? '#F83800' : '#B8F818'; ctx.fillRect(t.x + 1, t.y - 3, w, 1);
      }
    }
    if (this.shower > 0) {
      ctx.fillStyle = 'rgba(0,0,30,0.12)'; ctx.fillRect(camX, camY, VIEW_W, VIEW_H);
      ctx.fillStyle = 'rgba(160,200,248,0.7)';
      for (let k = 0; k < 70; k++) {
        const x = camX + ((k * 47 + f * 2) % (VIEW_W + 20)) - 10, y = camY + ((k * 83 + f * 7) % (VIEW_H + 20)) - 10;
        ctx.fillRect(Math.round(x), Math.round(y), 1, 4);
      }
    }
    if (this.wind) {
      ctx.fillStyle = 'rgba(248,184,0,0.8)';
      const [dx, dy] = DXY[this.wind.dir];
      for (let k = 0; k < 24; k++) {
        const along = (k * 61 + f * 5) % (dx ? VIEW_W : VIEW_H), across = (k * 97) % (dx ? VIEW_H : VIEW_W);
        const pos = dx > 0 || dy > 0 ? along : (dx ? VIEW_W : VIEW_H) - along;
        ctx.fillRect(camX + (dx ? pos : across), camY + (dx ? across : pos), dx ? 3 : 1, dx ? 1 : 3);
      }
    }
    if (this.blizzard > 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      for (let k = 0; k < 90; k++) {
        const x = camX + ((k * 53 + f * 4) % VIEW_W), y = camY + ((k * 71 + f * 2) % VIEW_H);
        ctx.fillRect(x, y, 2, 1);
      }
    }
  },

  // the blizzard's whiteout: how thick it is now (0-1), easing in and out
  whiteout() { return this.blizzard > 0 ? Math.min(1, this.blizzard / 60, (BLIZZARD_TIME - this.blizzard) / 60) : 0; },

  // the corridor moved everything down S pixels: the season's things go with it (and the new section gets hot spots)
  seasonShift(S) {
    const rows = S / 4, fires = new Map();
    for (const [i, f] of this.fires) if (i + rows * GW < GW * GH) fires.set(i + rows * GW, f);
    this.fires = fires;
    for (const pd of this.puddles) pd.cells = pd.cells.map(i => i + rows * GW).filter(i => i < GW * GH);
    for (const z of this.zones) z.y += S;
    this.zones = this.zones.filter(z => z.y < FH);
    for (const w of this.wrecks) w.y += S;
    this.wrecks = this.wrecks.filter(w => w.y < FH);
    if (this.seasonFx === 'nuclear') {
      for (let k = 0, tries = 0; k < 3 && tries < 100; tries++) {
        const x = 24 + rnd((FW - 48) / 8) * 8, y = 16 + rnd((S - 32) / 8) * 8;
        if (this.zones.some(z => Math.hypot(z.x - x, z.y - y) < 56) || this.get(x >> 2, y >> 2) === T_STEEL || this.get(x >> 2, y >> 2) === T_WATER) continue;
        this.zones.push({ x, y, r: 18 + rnd(3) * 3 });
        k++;
      }
    }
  },

  // anything still to come before the stage can be clear (a ghoul's wreck)
  seasonPending() { return (this.wrecks || []).length > 0; },
});
