'use strict';
// =====================================================================
//  ENDLESS WORLD's title picture (intro.js shows it, introart.js has the helpers): the land streams by as your tank
//  drives along the road, one land after the next (home's village, autumn woods, snowfields, the desert with its
//  ruins and a chest glinting, a ruined city, a volcano smoking far off), while a whole day goes by overhead: the sun
//  crosses the sky, dusk, a night of stars and lit windows and your headlight, and dawn. Enemy tanks come down the
//  road and you see them off. The day and the distance count up in the corner; the compass swings to the next place.
//  The land is drawn once in three lights (day, dusk, night) and slid along; the sky in five.
// =====================================================================

const WA_FAR = 480, WA_MID = 600, WA_NEAR = 480;
// a whole day goes by in 480 frames: which light, and how far through the day (0 sunrise .. 1 the next)
function waDay(t) { return (t % 480) / 480; }
function waLight(u) { return u < 0.5 || u >= 0.96 ? 0 : u < 0.56 ? 1 : u < 0.64 ? 2 : u < 0.88 ? 3 : 4; }   // day, gold, dusk, night, dawn (mostly day)

const WA = {
  // a smooth wave that comes round to where it started every w pixels (so the land joins up as it loops)
  wave(x, w, parts) { let h = 0; for (const [k, a, p] of parts) h += a * Math.sin(2 * Math.PI * k * x / w + p); return h; },

  // the sky in each light: a dithered gradient (and the stars, at night)
  sky(k) {
    return IA.layer('wa-sky' + k, b => {
      const cols = [['#2C6CE0', '#3C88E8', '#5CA0F0', '#88BCF8', '#B8D8F8'], ['#3C64C8', '#6C88D0', '#B89C98', '#F0B870', '#F8D898'],
        ['#1C1450', '#3C1C68', '#7C2470', '#C83C50', '#F0703C'], ['#000010', '#04082C', '#0C1440', '#141C50', '#1C2C60'],
        ['#1C2C6C', '#4C4C8C', '#9C6C9C', '#F0A070', '#F8D098']][k];
      IA.grad(b, 0, 0, IPW, 76, cols);
      if (k === 3) Pix.stars(b, 70, 11, 0, 60, IPW);
    }, IPW, 76);
  },

  // far off: snowy mountains, and a volcano with its glow
  far(light) {
    return IA.layer('wa-far' + light, b => {
      const base = IA.layer('wa-far', c => {
        for (let x = 0; x < WA_FAR; x++) {
          const h = 22 + WA.wave(x, WA_FAR, [[1, 7, 0.4], [3, 5, 1.7], [7, 3, 0.2], [13, 1.5, 2.2]]), top = Math.round(68 - h), slope = h - (22 + WA.wave(x - 1, WA_FAR, [[1, 7, 0.4], [3, 5, 1.7], [7, 3, 0.2], [13, 1.5, 2.2]]));
          Pix.rect(c, x, top, 1, 104 - top, '#4C4C7C');
          const lit = slope > 0;
          for (let j = 0; j < 4; j++) if (lit || (x + j) & 1) Pix.rect(c, x, top + j, 1, 1, lit ? '#7C7CAC' : '#3C3C64');
          if (h > 24) { const s = Math.round((h - 24) * 0.7) + 1; for (let j = 0; j < s; j++) if (j < s - 1 || x & 1) Pix.rect(c, x, top + j, 1, 1, lit ? '#F8F8F8' : '#BCBCDC'); }
        }
        // the volcano: a cone, its crater glowing
        for (let x = 300; x < 420; x++) {
          const d = Math.abs(x - 360), h = Math.max(0, 44 - d * 0.72), top = Math.round(70 - h);
          if (h <= 0) continue;
          Pix.rect(c, x, top, 1, 104 - top, x < 360 ? '#5C3C38' : '#3C2420');
          if (d < 9) Pix.rect(c, x, top, 1, 2, '#F87800');
          if (d < 20 && (x * 7) % 5 === 0) Pix.rect(c, x, top + 6 + (x % 9), 1, 3 + (x % 5), '#A83008');
        }
      }, WA_FAR, 104);
      if (light === 0) b.drawImage(base, 0, 0);
      else IA.dimmed(b, base, light === 1 ? 0.75 : 0.4, light === 1 ? 0 : 24);
    }, WA_FAR, 104);
  },

  // the hills: home's village, autumn woods, snowfields, the desert and its ruins, a ruined city, and home again
  mid(light) {
    return IA.layer('wa-mid' + light, b => {
      const base = IA.layer('wa-mid', c => {
        const W = WA_MID, seg = x => (x < 140 ? 0 : x < 260 ? 1 : x < 380 ? 2 : x < 490 ? 3 : 4);
        const ground = [['#58A838', '#3C8C28', '#2C6C1C'], ['#A86C28', '#7C4C18', '#5C3410'], ['#F8F8F8', '#C8D8E8', '#9CB0C8'], ['#F0C878', '#D8A858', '#B08040'], ['#8C8C8C', '#6C6C6C', '#4C4C4C']];
        for (let x = 0; x < W; x++) {
          const h = 12 + WA.wave(x, W, [[2, 4, 0.3], [5, 2.5, 1.1], [11, 1, 0.7]]), top = Math.round(50 - h), g = ground[seg(x)];
          Pix.rect(c, x, top, 1, 60 - top, g[1]);
          Pix.rect(c, x, top, 1, 2, g[0]);
          if ((x * 13) % 7 < 2) Pix.rect(c, x, top + 3 + (x % 5), 1, 1, g[2]);
        }
        const yAt = x => Math.round(50 - (12 + WA.wave(x, W, [[2, 4, 0.3], [5, 2.5, 1.1], [11, 1, 0.7]])));
        // home's village: houses with red roofs, smoke rising (drawn live), the flag on its pole
        for (const [x, w] of [[22, 14], [44, 12], [64, 16], [92, 12], [112, 14]]) {
          const y = yAt(x + w / 2);
          Pix.rect(c, x, y - 8, w, 8, '#E8D8B8'); Pix.rect(c, x + w - 3, y - 8, 3, 8, '#B8A888');
          for (let j = 0; j < 6; j++) Pix.rect(c, x - 1 + j, y - 9 - j, w + 2 - j * 2, 1, j < 2 ? '#A83010' : '#D84C20');
          Pix.rect(c, x + 3, y - 5, 2, 2, '#3C2C1C'); Pix.rect(c, x + w - 6, y - 5, 2, 2, '#3C2C1C'); Pix.rect(c, x + (w >> 1) - 1, y - 4, 3, 4, '#5C3C1C');
        }
        Pix.rect(c, 82, yAt(82) - 22, 1, 22, '#E8E8E8');
        // autumn woods
        for (let k = 0; k < 9; k++) { const x = 150 + k * 12 + (k % 3) * 2; IA.tree(c, x, yAt(x) - 7 - (k % 2) * 2, 6 + (k % 3), 40 + k, ['#F8B800', '#F08000', '#B03000', '#601800'], 5); }
        // snowfields: snowy firs, a frozen pond
        for (let x = 300; x < 344; x++) Pix.rect(c, x, yAt(x) + 3, 1, 3, (x & 3) ? '#A8D8F8' : '#F8F8F8');
        for (let k = 0; k < 7; k++) { const x = 266 + k * 17 - (k > 2 ? 0 : 0); if (x > 296 && x < 348) continue; IA.pine(c, x, yAt(x) + 1, 14 + (k % 3) * 3, ['#E8F0F8', '#8CA8C0', '#4C6C8C']); }
        // the desert: dunes, cacti, ruins with a chest glinting (drawn live)
        for (const x of [392, 418, 466]) { const y = yAt(x); Pix.rect(c, x, y - 10, 3, 10, '#3C8C28'); Pix.rect(c, x - 3, y - 7, 2, 2, '#3C8C28'); Pix.rect(c, x - 3, y - 9, 1, 3, '#3C8C28'); Pix.rect(c, x + 4, y - 6, 2, 2, '#3C8C28'); Pix.rect(c, x + 5, y - 9, 1, 4, '#3C8C28'); Pix.rect(c, x, y - 10, 1, 10, '#58B038'); }
        for (const [x, h] of [[432, 18], [442, 12], [452, 20], [462, 8]]) { const y = yAt(x); IA.paint(c, x, y - h, 6, h, (i, j) => (i === x || (j - (y - h)) % 6 === 0 ? '#E8C890' : i === x + 5 ? '#987048' : '#C8A068')); }
        Pix.rect(c, 432, yAt(436) - 20, 26, 3, '#C8A068'); Pix.rect(c, 432, yAt(436) - 20, 26, 1, '#E8C890');
        // a ruined city: broken blocks, dark windows
        for (const [x, w, h] of [[500, 14, 26], [516, 10, 18], [528, 16, 32], [546, 12, 14], [560, 14, 22], [576, 10, 12]]) {
          const y = yAt(x + w / 2) + 2;
          Pix.rect(c, x, y - h, w, h, '#7C7C84'); Pix.rect(c, x + w - 2, y - h, 2, h, '#5C5C64'); Pix.rect(c, x, y - h, w, 1, '#A8A8B0');
          for (let wy = y - h + 3; wy < y - 3; wy += 4) for (let wx = x + 2; wx < x + w - 3; wx += 4) Pix.rect(c, wx, wy, 2, 2, (wx + wy) % 3 ? '#2C2C34' : '#44444C');
          for (let k = 0; k < w; k += 3) Pix.rect(c, x + k, y - h - (k * 7 % 4), 2, (k * 7 % 4), '#7C7C84');   // broken tops
        }
      }, WA_MID, 60);
      if (light === 0) b.drawImage(base, 0, 0);
      else IA.dimmed(b, base, light === 1 ? 0.72 : 0.36, light === 1 ? 0 : 26);
      // windows lit at night (in the village and a few in the city)
      if (light === 2) {
        const yAt = x => Math.round(50 - (12 + WA.wave(x, WA_MID, [[2, 4, 0.3], [5, 2.5, 1.1], [11, 1, 0.7]])));
        for (const [x, w] of [[22, 14], [44, 12], [64, 16], [92, 12], [112, 14]]) { const y = yAt(x + w / 2); Pix.rect(b, x + 3, y - 5, 2, 2, '#F8D878'); Pix.rect(b, x + w - 6, y - 5, 2, 2, '#F8B800'); }
        for (const [x, y] of [[504, 6], [532, 10], [564, 8]]) Pix.rect(b, x, yAt(x) + 2 - y - 8, 2, 2, '#F8D878');
      }
    }, WA_MID, 60);
  },

  // up close: the road, its verges, fence posts, stones, a signpost
  near(light) {
    return IA.layer('wa-near' + light, b => {
      const base = IA.layer('wa-near', c => {
        IA.grad(c, 0, 0, WA_NEAR, 8, ['#3C7C24', '#2C5C1C']);
        IA.paint(c, 0, 8, WA_NEAR, 14, (x, y) => { const q = IA.hash(x >> 1, y, 5); return (y === 8 || y === 21) ? '#5C4424' : q < 0.08 ? '#9C7C48' : q < 0.2 ? '#6C5430' : '#7C6438'; });
        for (let x = 0; x < WA_NEAR; x += 3) { Pix.rect(c, x, 11 + ((x >> 3) & 1), 2, 1, '#5C4828'); Pix.rect(c, x + 1, 18 - ((x >> 4) & 1), 2, 1, '#5C4828'); }
        IA.grad(c, 0, 22, WA_NEAR, 10, ['#2C5C1C', '#1C3C10']);
        for (let x = 0; x < WA_NEAR; x++) { const h = 1 + Math.round(IA.noise(x / 3, 8) * 4); if (x & 1) Pix.rect(c, x, 8 - h + 1, 1, h, '#58A838'); if ((x & 3) === 1) Pix.rect(c, x, 32 - h, 1, h, '#3C7C24'); }
        // fence posts, a stone, a signpost
        for (let x = 6; x < 200; x += 14) { Pix.rect(c, x, -2 + 4, 2, 6, '#7C5C30'); Pix.rect(c, x, 4, 1, 6, '#A87C48'); }
        Pix.rect(c, 4, 6, 196, 1, '#A87C48');
        for (const x of [240, 352, 430]) { Pix.disc(c, x, 27, 3, '#7C7C7C'); Pix.rect(c, x - 2, 25, 2, 1, '#B8B8B8'); }
        Pix.rect(c, 300, 0, 2, 9, '#7C5C30'); Pix.rect(c, 290, -1 + 1, 22, 5, '#C8A060'); Pix.rect(c, 290, 1, 22, 1, '#E8C890');
      }, WA_NEAR, 32);
      if (light === 0) b.drawImage(base, 0, 0);
      else IA.dimmed(b, base, light === 1 ? 0.75 : 0.42, light === 1 ? 0 : 20);
    }, WA_NEAR, 32);
  },

  sun() { return IA.layer('wa-sun', b => IA.ball(b, 8, 8, 7, 7, ['#F8F8E0', '#F8F0A8', '#F8D878', '#F8B048', '#F09040']), 17, 17); },
  moon() { return IA.layer('wa-moon', b => { IA.ball(b, 7, 7, 6, 6, ['#F8F8F8', '#E8E8F0', '#C8C8D8', '#A8A8C0', '#8C8CA8']); Pix.disc(b, 5, 8, 1, '#A8A8C0'); Pix.disc(b, 9, 5, 1, '#B8B8C8'); }, 15, 15); },
  beam() { return IA.layer('wa-beam', b => IA.paint(b, 0, 0, 60, 20, (x, y) => { const s = Math.abs(y - 10) / (2 + x * 0.14); return s < 1 && bayer(x, y) < (1 - x / 60) * (1 - s) * 0.9 ? '#F8F0B8' : null; }), 60, 20); },
};

Object.assign(INTRO_SCENES, {
  // ENDLESS WORLD: see the top
  world(c, t) {
    const u = waDay(t), light = waLight(u), land = light === 0 ? 0 : light === 3 ? 2 : 1;
    // build every layer at once (the first frame), so later frames only copy
    if (!IA.cache.has('wa-near2')) for (let k = 0; k < 5; k++) { WA.sky(k); if (k < 3) { WA.far(k); WA.mid(k); WA.near(k); } }
    c.drawImage(WA.sky(light), 0, 0);
    // the sun by day, the moon by night, along an arc
    const s = u < 0.64 ? (u + 0.06) / 0.7 : u >= 0.94 ? (u - 0.94) / 0.7 : (u - 0.64) / 0.3;
    const cx = Math.round(-12 + s * 264), cy = Math.round(62 - Math.sin(s * Math.PI) * 50);
    c.drawImage(u < 0.64 || u >= 0.94 ? WA.sun() : WA.moon(), cx - 8, cy - 8);
    const scroll = (img, W, sp, y) => { const o = Math.floor(t * sp) % W; c.drawImage(img, -o, y); if (W - o < IPW) c.drawImage(img, W - o, y); };
    scroll(WA.far(land), WA_FAR, 0.08, 0);
    // the volcano's smoke
    const vo = Math.floor(t * 0.08) % WA_FAR, vx = 360 - vo + (360 - vo < -40 ? WA_FAR : 0);
    if (vx > -20 && vx < IPW + 20) IA.smoke(c, vx, 24, t, { n: 5, h: 26, size: 4, seed: 3, wind: 14, tone: land === 2 ? 2 : 1 });
    scroll(WA.mid(land), WA_MID, 0.3, 56);
    // chimney smoke in the village, the flag, a chest glinting in the ruins
    const mo = Math.floor(t * 0.3) % WA_MID, at = x => { let p = x - mo; if (p < -40) p += WA_MID; return p; };
    for (const hx of [32, 72, 120]) { const x = at(hx); if (x > -10 && x < IPW + 10) IA.smoke(c, x, 90, t, { n: 3, h: 12, size: 2, seed: hx, wind: 6, tone: 0 }); }
    const fx = at(82), fy = 56 + Math.round(50 - (12 + WA.wave(82, WA_MID, [[2, 4, 0.3], [5, 2.5, 1.1], [11, 1, 0.7]]))) - 22;
    if (fx > -10 && fx < IPW) for (let k = 0; k < 8; k++) { const yy = fy + Math.round(Math.sin(t / 6 - k * 0.7)); Pix.rect(c, fx + 1 + k, yy, 1, 5, k > 5 ? '#A88800' : COL.gold); }
    const gx = at(446);
    if (gx > -10 && gx < IPW && (t % 50) < 14) c.drawImage(Sprites.sparkle[[0, 1, 2, 3, 2, 1, 0][Math.min(6, (t % 50) >> 1)]], gx - 4, 56 + Math.round(50 - (12 + WA.wave(446, WA_MID, [[2, 4, 0.3], [5, 2.5, 1.1], [11, 1, 0.7]]))) - 14, 8, 8);
    scroll(WA.near(land), WA_NEAR, 0.9, 104);
    // you, on the road; an enemy tank comes down it now and then: it fires (the shell bursts on your armour), you
    // fire back, and it goes up; its wreck smokes as you leave it behind
    const P = 230, cyc = t % P, n = Math.floor(t / P), tx = 70, gy = 124, ex = c2 => 270 - Math.min(c2, 80) * 1.2 - Math.max(0, c2 - 80) * 0.9;
    if (cyc < 80) {
      const m = IA.sideTank(c, ex(cyc), gy, n & 1 ? 'red' : 'silver', { flip: true, f: t >> 2, L: 34, star: '#D82800', sway: Math.sin(t / 5) * 2 });
      const q = cyc - 40;
      if (q >= 0 && q < 4) IA.flash(c, m.x, m.y, -1, 0, q);
      if (q >= 0 && m.x - q * 3 > tx + 22) IA.shell(c, m.x - q * 3, m.y, -1, 0);
      else if (q > 0 && q < 46) IA.sparks(c, tx + 20, gy - 12, Math.min(1, (q - 20) / 12), 8, n);
    } else if (cyc < 120) {
      IA.boom(c, ex(cyc), gy - 10, cyc - 80, 14, n);
      IA.debris(c, ex(cyc), gy - 8, (cyc - 80) / 30, 8, ['#3C3C3C', '#C0C0C0', '#F8F8F8'], n);
    }
    if (cyc >= 86 && cyc < 200) IA.smoke(c, ex(cyc), gy - 4, t, { n: 5, h: 30, size: 4, seed: n });
    const fire = cyc - 62, rc = fire >= 0 && fire < 6 ? 2 - (fire >> 1) : 0;
    const me = IA.sideTank(c, tx, gy, Config.playerPal(0), { f: t >> 1, L: 36, recoil: Math.max(0, rc), star: '#F8F8F8', sway: -2 - ((t >> 2) & 1) });
    if (fire >= 0 && fire < 4) IA.flash(c, me.x, me.y, 1, 0, fire);
    if (fire >= 0 && me.x + fire * 4.2 < ex(cyc) - 16) IA.shell(c, me.x + fire * 4.2, me.y, 1, 0);
    // at night: your headlight down the road, fireflies in the verge
    if (land === 2) {
      c.globalAlpha = 0.5; c.drawImage(WA.beam(), me.x + 2, me.y - 9); c.globalAlpha = 1;
      for (let k = 0; k < 6; k++) { const x = (k * 53 + t * 0.4) % IPW, y = 104 + ((k * 29) % 8) + Math.round(Math.sin(t / 20 + k) * 2); if ((t + k * 13) % 40 < 24) Pix.rect(c, Math.round(x), y, 1, 1, '#E8F858'); }
    }
    // the day, how far you've come, the compass swinging to the next place
    const day = 3 + Math.floor(t / 480), dist = 214 + Math.floor(t * 0.25);
    Pix.rect(c, 3, 3, 72, 22, '#000000'); Pix.rect(c, 4, 4, 70, 20, '#0C1C2C');
    if (u < 0.64 || u >= 0.94) { Pix.disc(c, 10, 9, 3, '#F8B800'); Pix.rect(c, 9, 8, 2, 2, '#F8F878'); } else { Pix.disc(c, 10, 9, 3, '#F8F8F8'); Pix.disc(c, 12, 8, 2, '#0C1C2C'); }
    Font.draw(c, 'DAY ' + day, 17, 6, COL.gold);
    Font.draw(c, dist + ' M', 8, 15, '#BCC8E8');
    const CX = IPW - 18, CY = 18;
    Pix.disc(c, CX + 1, CY + 1, 14, '#000000'); Pix.disc(c, CX, CY, 14, '#BC9C5C'); Pix.disc(c, CX, CY, 12, '#F8F0D0');
    for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; Pix.rect(c, Math.round(CX + Math.cos(a) * 10), Math.round(CY + Math.sin(a) * 10), 1, 1, '#7C6440'); }
    Font.draw(c, 'N', CX - 3, CY - 11, '#A01800');
    const a = -0.6 + Math.sin(t / 40) * 0.35 + Math.sin(t / 7) * 0.05;
    for (let j = -6; j <= 9; j++) Pix.rect(c, Math.round(CX + Math.cos(a) * j), Math.round(CY + Math.sin(a) * j), 1, 1, j > 0 ? '#D82800' : '#3C3C3C');
    Pix.rect(c, CX, CY, 1, 1, '#F8F8F8');
  },
});
