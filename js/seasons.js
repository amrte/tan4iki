'use strict';
// =====================================================================
//  Seasons: every stage has a look of its own. The ground, bricks, trees and water take the season's colours, and
//  something drifts across the screen. A little of it changes the game too:
//    SPRING          blossom on the trees, petals in the air
//    SUMMER          deep green, fireflies
//    AUTUMN          orange and red trees, falling leaves
//    WINTER          snow on everything, snowfall; most lakes are frozen over (ice)
//    NUCLEAR WINTER  dead trees, grey bricks, toxic green water, falling ash; some lakes frozen
//    DESERT          sand, sandstone bricks, cacti, drifting sand; many ponds have dried into mud (it slows you)
//  Settings -> GAME -> SEASONS: CYCLE (a new one every stage, default), RANDOM, OFF (the classic black), or one of them.
// =====================================================================

const THEME_ORDER = ['spring', 'summer', 'autumn', 'winter', 'nuclear', 'desert'];
const THEMES = {
  classic: { name: '', ground: '#000000' },
  spring: {
    name: 'SPRING', color: '#F878B8', ground: '#0C1C08', specks: ['#14280C', '#1C3010'],
    tex: { forest: { colors: { g: '#8CD050', G: '#2C7418', p: '#F8A8D0' }, rows: ['.gGp.gg.', 'ggpgGgGg', 'Gg.gggp.', 'gpgGg.gG', '.gggpgGg', 'gGg.Gggp', 'gpggg.Gg', '.Gg.gp..'] } },
    particles: { kind: 'drift', n: 18, colors: ['#F8B8D8', '#FFFFFF', '#F890C0'], w: 2, h: 1, fall: [0.15, 0.35], sway: 0.6 },
  },
  summer: {
    name: 'SUMMER', color: '#58D854', ground: '#0C1808', specks: ['#122410', '#0E1E0A'],
    tex: { forest: { colors: { g: '#58B000', G: '#085400' } } },
    particles: { kind: 'firefly', n: 10, colors: ['#E8F858', '#B8F818'], w: 1, h: 1 },
  },
  autumn: {
    name: 'AUTUMN', color: '#F87800', ground: '#1C1006', specks: ['#2A1A0A', '#24140A'],
    tex: { forest: { colors: { g: '#F08800', G: '#B03000' } }, water0: { colors: { b: '#204098' } }, water1: { colors: { b: '#204098' } } },
    particles: { kind: 'drift', n: 18, colors: ['#F87800', '#C83000', '#F8B800'], w: 2, h: 2, fall: [0.25, 0.55], sway: 1 },
  },
  winter: {
    name: 'WINTER', color: '#B8D8F8', ground: '#3C4858', specks: ['#4C5868', '#566476', '#6C7C90'], snowCaps: '#F8F8FF',
    tex: { forest: { colors: { g: '#D8E8F0', G: '#2C5C48' } }, brick: { colors: { R: '#A83C28', H: '#D87860', D: '#682010' } },
      water0: { colors: { b: '#1C3C98' } }, water1: { colors: { b: '#1C3C98' } } },
    particles: { kind: 'drift', n: 46, colors: ['#FFFFFF', '#E0E8F8'], w: 1, h: 1, big: 0.3, fall: [0.3, 0.8], sway: 0.5 },
    freeze: 0.75,
  },
  nuclear: {
    name: 'NUCLEAR WINTER', color: '#A8D820', ground: '#24241C', specks: ['#30302A', '#2A2A20', '#38382C'], snowCaps: '#8C8C80', tint: 'rgba(140,170,40,0.07)',
    tex: { forest: { colors: { g: '#7C7458', G: '#3C3428' } }, brick: { colors: { R: '#6C5C50', H: '#8C7C6C', D: '#3C3028', M: '#7C7C70' } },
      steel: { colors: { W: '#C8C8B8', G: '#8C8C80' } },
      water0: { colors: { b: '#2C6C18', w: '#A8E040' } }, water1: { colors: { b: '#2C6C18', w: '#A8E040' } }, ice: { colors: { W: '#C8C8B0', G: '#8C8C78' } } },
    particles: { kind: 'drift', n: 40, colors: ['#9C9C90', '#6C6C64', '#B0B0A0'], w: 1, h: 1, big: 0.3, fall: [0.15, 0.4], sway: 0.3 },
    freeze: 0.4,
  },
  desert: {
    name: 'DESERT', color: '#F8B858', ground: '#5C4420', specks: ['#6C5028', '#4C3818', '#7C5C2C'],
    tex: { brick: { colors: { R: '#C08840', H: '#E8B868', D: '#805418', M: '#B8A070' } },
      forest: { colors: { g: '#58A838', G: '#1C5818', y: '#F8D878' }, rows: ['..G..g..', '.GG..gg.', '.gG.Gg..', 'GgG.gGy.', '.gGGg...', '..gG..G.', '..gG.gG.', '..Gg..g.'] },
      water0: { colors: { b: '#1880C0' } }, water1: { colors: { b: '#1880C0' } } },
    particles: { kind: 'sand', n: 14, colors: ['#C8A060', '#E0C080'], w: 3, h: 1 },
    dry: 0.6,
  },
};

// which season stage num is in (opts.theme: a custom level's own choice)
function stageTheme(num, opts = {}) {
  if (opts.theme && THEMES[opts.theme]) return opts.theme;
  const s = typeof Config !== 'undefined' ? Config.get('seasons') : 'CYCLE';
  if (s === 'OFF') return 'classic';
  if (s === 'RANDOM') return THEME_ORDER[Math.floor(Math.random() * THEME_ORDER.length)];
  if (s && s !== 'CYCLE') return s.toLowerCase();
  return THEME_ORDER[(Math.max(1, num) - 1) % THEME_ORDER.length];
}

// textures in a season's colours (cached per season)
const themeTexCache = {};
function themeTex(theme) {
  if (themeTexCache[theme]) return themeTexCache[theme];
  const t = THEMES[theme] || THEMES.classic, out = {};
  for (const k in TEX_SRC) {
    const o = (t.tex || {})[k] || {};
    out[k] = paintRows(o.rows || TEX_SRC[k].rows, Object.assign({}, TEX_SRC[k].colors, o.colors || {}));
  }
  themeTexCache[theme] = out;
  return out;
}

Object.assign(Stage.prototype, {
  // the season's mark on the map: frozen lakes in winter, dried ponds in the desert
  applyThemeTerrain(num) {
    const t = THEMES[this.theme] || {}, p = t.freeze || t.dry;
    if (!p) return;
    const r = seeded(num * 4241 + 7), seen = new Uint8Array(GW * GH);
    for (let i = 0; i < GW * GH; i++) {
      if (seen[i] || this.terrain[i] !== T_WATER) continue;
      // one lake at a time: it freezes (or dries up) as a whole, or stays
      const lake = [i]; seen[i] = 1;
      for (let k = 0; k < lake.length; k++) {
        const c = lake[k], cx = c % GW, cy = (c / GW) | 0;
        for (const [dx, dy] of DXY) {
          const nx = cx + dx, ny = cy + dy, n = ny * GW + nx;
          if (nx < 0 || ny < 0 || nx >= GW || ny >= GH || seen[n] || this.terrain[n] !== T_WATER) continue;
          seen[n] = 1; lake.push(n);
        }
      }
      if (r() < p) for (const c of lake) this.terrain[c] = t.freeze ? T_ICE : T_MUD;
    }
  },

  // the ground: the season's colour with a scatter of specks (the same every time for a stage)
  groundLayer() {
    const t = THEMES[this.theme] || THEMES.classic;
    if (this.ground && this.ground.width === FW && this.ground.height === FH && this.groundFor === this.theme) return this.ground;
    const c = makeCanvas(FW, FH), x = c.getContext('2d');
    x.fillStyle = t.ground; x.fillRect(0, 0, FW, FH);
    if (t.specks) {
      const r = seeded(this.num * 977 + FW);
      for (let k = 0; k < FW * FH / 40; k++) {
        x.fillStyle = t.specks[Math.floor(r() * t.specks.length)];
        x.fillRect(Math.floor(r() * FW), Math.floor(r() * FH), 1 + (r() < 0.3 ? 1 : 0), 1);
      }
    }
    this.ground = c; this.groundFor = this.theme;
    return c;
  },

  // snow (or ash) along the top edges of bricks, steel and trees
  themeCaps(bg, fo) {
    const t = THEMES[this.theme];
    if (!t || !t.snowCaps) return;
    const solid = v => v === T_BRICK || v === T_STEEL || v === T_FOREST;
    for (let cy = 0; cy < GH; cy++) for (let cx = 0; cx < GW; cx++) {
      const v = this.terrain[cy * GW + cx];
      if (!solid(v) || (cy > 0 && solid(this.terrain[(cy - 1) * GW + cx]))) continue;
      const ctx = v === T_FOREST ? fo : bg;
      ctx.fillStyle = t.snowCaps;
      ctx.fillRect(cx * 4, cy * 4, 4, 1);
      if ((cx + cy) % 3 === 0) ctx.fillRect(cx * 4 + 1, cy * 4 + 1, 2, 1);
    }
  },

  // what drifts across the screen (purely for looks: it runs in the drawing, so online guests see their own)
  renderSeason(ctx, camX, camY) {
    const t = THEMES[this.theme];
    if (!t) return;
    if (t.tint) { ctx.fillStyle = t.tint; ctx.fillRect(camX, camY, VIEW_W, VIEW_H); }
    const P = t.particles;
    if (!P) return;
    if (!this.parts || this.partsFor !== this.theme) {
      this.partsFor = this.theme;
      this.parts = [];
      for (let k = 0; k < P.n; k++) this.parts.push({ x: Math.random() * VIEW_W, y: Math.random() * VIEW_H, v: Math.random(), ph: Math.random() * 6.28 });
    }
    const f = this.frame || 0;
    for (const p of this.parts) {
      if (P.kind === 'drift') {
        p.y += P.fall[0] + (P.fall[1] - P.fall[0]) * p.v;
        p.x += Math.sin(f / 40 + p.ph) * P.sway * 0.3;
      } else if (P.kind === 'sand') {
        p.x += 1.5 + 2 * p.v; p.y += Math.sin(f / 20 + p.ph) * 0.2;
      } else {   // fireflies wander and blink
        p.x += Math.sin(f / 50 + p.ph) * 0.3; p.y += Math.cos(f / 60 + p.ph * 2) * 0.25;
        if ((f + Math.floor(p.ph * 40)) % 90 > 50) continue;
      }
      if (p.y > VIEW_H) { p.y = -2; p.x = Math.random() * VIEW_W; }
      if (p.x > VIEW_W) { p.x = -3; p.y = Math.random() * VIEW_H; }
      if (p.x < -3) p.x = VIEW_W;
      const big = P.big && p.v < P.big;
      ctx.fillStyle = P.colors[Math.floor(p.v * P.colors.length)];
      ctx.fillRect(Math.round(camX + p.x), Math.round(camY + p.y), P.w + (big ? 1 : 0), P.h + (big ? 1 : 0));
    }
  },
});
