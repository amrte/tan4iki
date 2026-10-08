'use strict';
// =====================================================================
//  Boss pictures: a "WARNING" picture before each boss and a victory picture after it, in the style of the mode
//  title screens (112x64, shown at double size). The bosses are drawn side-on here, in their own scenery, and
//  move a little (t = frames since the picture opened). The intro comes after the stage curtain, the victory
//  picture after the boss's last explosions, before the score tally; Enter or fire moves on, and after a few
//  seconds it moves on by itself. Its music: WARNING! before, VICTORY! after (THE EARTH IS SAVED after the UFO).
//  Settings -> GAME -> BOSS SCREENS.
// =====================================================================

const BOSS_SCREEN_TIME = 420;
let bossArtCanvas = null;

// helpers on top of Pix (intro.js)
const Art = {
  // a checkerboard of one colour (see-through things: fog, glass, beams)
  dith(c, x, y, w, h, col, ph = 0) {
    c.fillStyle = col;
    for (let yy = 0; yy < h; yy++) for (let xx = (yy + ph) & 1; xx < w; xx += 2) c.fillRect(x + xx, y + yy, 1, 1);
  },
  // rising smoke
  smoke(c, x, y, t, n = 4, seed = 0, dark = false) {
    for (let k = 0; k < n; k++) {
      const p = ((t + k * Math.floor(60 / n) + seed * 13) % 60) / 60, r = 1 + Math.round(p * 3);
      Pix.disc(c, Math.round(x + Math.sin(k * 2.3 + seed) * 2 + p * 5), Math.round(y - p * 20), r, dark ? (p < 0.5 ? '#3C3C3C' : '#202020') : (p < 0.4 ? '#BCBCBC' : p < 0.75 ? '#7C7C7C' : '#4C4C4C'));
    }
  },
  // a row of flickering flames standing on y
  fire(c, x, y, w, t) {
    for (let k = 0; k < w; k++) {
      const h = 2 + ((k * 7 + (t >> 2) * 3 + k * k) % 5);
      Pix.rect(c, x + k, y - h, 1, h, '#D82800');
      Pix.rect(c, x + k, y - h + 1, 1, Math.max(1, h - 2), k % 2 ? '#F8B800' : '#F87830');
      if (h > 4 && (k + (t >> 2)) % 3 === 0) Pix.rect(c, x + k, y - 2, 1, 1, '#F8F8F8');
    }
  },
  // a player tank seen from the side (16x9), facing right (or left)
  tank(c, x, y, i = 0, flip = false, f = 0) {
    const pal = PALS[Config.playerPal(i)];
    const X = dx => (flip ? x + 15 - dx : x + dx);
    const R = (dx, dy, w, h, col) => Pix.rect(c, flip ? x + 16 - dx - w : x + dx, y + dy, w, h, col);
    R(5, 0, 6, 3, pal[2]); R(5, 0, 6, 1, pal[1]); R(11, 1, 5, 1, pal[1]);
    R(1, 3, 14, 3, pal[2]); R(1, 3, 14, 1, pal[1]); R(1, 5, 14, 1, pal[3]);
    R(0, 6, 16, 3, '#202020');
    for (let k = 0; k < 5; k++) Pix.rect(c, X(2 + k * 3 + (f & 1)), y + 7, 1, 1, pal[1]);
  },
  // a little flag on a pole, waving
  flag(c, x, y, t, col = '#F8F8F8') {
    Pix.rect(c, x, y, 1, 10, '#BCBCBC');
    for (let k = 0; k < 6; k++) Pix.rect(c, x + 1 + k, y + Math.round(Math.sin(t / 6 + k * 0.8)), 1, 4, col);
  },
  // sparks flying out of a point (a spray that repeats)
  sparks(c, x, y, t, n = 6, col = '#F8D800') {
    for (let k = 0; k < n; k++) {
      const p = ((t + k * 11) % 24) / 24, a = k * 2.4;
      Pix.rect(c, Math.round(x + Math.cos(a) * p * 10), Math.round(y - Math.abs(Math.sin(a)) * p * 10 + p * p * 8), 1, 1, p < 0.5 ? '#F8F8F8' : col);
    }
  },
  // dazed stars going round
  stars(c, x, y, t) {
    for (let k = 0; k < 3; k++) { const a = t / 8 + k * 2.1; Pix.rect(c, Math.round(x + Math.cos(a) * 7), Math.round(y + Math.sin(a) * 2), 1, 1, '#F8D800'); }
  },
  // draw something (into its own w x h canvas) and put it down turned by ang, centred on (cx, cy), pixel-sharp
  rot(c, w, h, draw, cx, cy, ang) {
    const src = makeCanvas(w, h), sc = src.getContext('2d');
    draw(sc);
    const sd = sc.getImageData(0, 0, w, h).data, R = Math.ceil(Math.hypot(w, h)) + 2;
    const dst = makeCanvas(R, R), dc = dst.getContext('2d'), out = dc.createImageData(R, R), cs = Math.cos(ang), sn = Math.sin(ang);
    for (let y = 0; y < R; y++) for (let x = 0; x < R; x++) {
      const rx = x + 0.5 - R / 2, ry = y + 0.5 - R / 2, sx = Math.floor(rx * cs + ry * sn + w / 2), sy = Math.floor(-rx * sn + ry * cs + h / 2);
      if (sx < 0 || sy < 0 || sx >= w || sy >= h) continue;
      const i = (sy * w + sx) * 4;
      if (sd[i + 3] < 128) continue;
      const o = (y * R + x) * 4;
      out.data[o] = sd[i]; out.data[o + 1] = sd[i + 1]; out.data[o + 2] = sd[i + 2]; out.data[o + 3] = 255;
    }
    dc.putImageData(out, 0, 0);
    c.drawImage(dst, Math.round(cx - R / 2), Math.round(cy - R / 2));
  },
  // the same, mirrored top to bottom (on its back)
  flipV(c, w, h, draw, x, y) {
    const src = makeCanvas(w, h), sc = src.getContext('2d');
    draw(sc);
    c.save(); c.translate(x, y + h); c.scale(1, -1); c.drawImage(src, 0, 0); c.restore();
  },
  ring(c, cx, cy, r, col, n = 24, ph = 0) { for (let k = 0; k < n; k++) { const a = ph + k / n * Math.PI * 2; Pix.rect(c, Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r), 1, 1, col); } },
  // a road wheel
  wheel(c, x, y, r, rim, hub) { Pix.disc(c, x, y, r, rim); Pix.disc(c, x, y, Math.max(0, r - 2), hub); Pix.rect(c, x, y, 1, 1, rim); },
  // fly a few chunks of rubble along an arc
  debris(c, x, y, t, n, col, spread = 1) {
    for (let k = 0; k < n; k++) {
      const p = ((t + k * 9) % 36) / 36, vx = (k % 2 ? -1 : 1) * (6 + k * 3) * spread;
      Pix.rect(c, Math.round(x + vx * p), Math.round(y - 14 * p + 18 * p * p), 2, 2, col);
    }
  },
};

// the bosses, side-on: (x, y) is the top left; d = 0 whole, 1 wrecked
const BossSide = {
  // IRON BEAR, facing left: a heavy tank, toothed ram, two round "ears" on the turret, red eyes
  bear(c, x, y, t, d = 0) {
    const g1 = '#B8E890', g2 = '#5C9C34', g3 = '#1C3C0C';
    Pix.rect(c, x + 4, y + 20, 50, 9, '#202020');
    for (let k = 0; k < 6; k++) Art.wheel(c, x + 9 + k * 8, y + 24, 3, '#7C7C7C', '#BCBCBC');
    for (let k = 0; k < 13; k++) Pix.rect(c, x + 5 + ((k * 4 + (d ? 0 : t)) % 49), y + 20, 2, 1, '#4C4C4C');
    Pix.rect(c, x + 6, y + 12, 46, 9, g2); Pix.rect(c, x + 6, y + 12, 46, 1, g1); Pix.rect(c, x + 6, y + 20, 46, 1, g3);
    Pix.rect(c, x + 46, y + 9, 6, 4, g2); Pix.rect(c, x + 47, y + 6, 2, 4, '#3C3C3C');   // exhaust stack
    for (let k = 0; k < 5; k++) Pix.rect(c, x + 12 + k * 7, y + 15, 3, 1, g3);              // armour seams
    if (!d) {
      Pix.rect(c, x, y + 10, 6, 17, '#C8C8C8'); Pix.rect(c, x + 5, y + 10, 1, 17, '#7C7C7C');   // the ram
      for (let k = 0; k < 6; k++) { Pix.rect(c, x - 2, y + 11 + k * 3, 2, 1, '#F8F8F8'); Pix.rect(c, x - 1, y + 12 + k * 3, 1, 1, '#BCBCBC'); }
    } else for (let k = 0; k < 3; k++) Pix.rect(c, x + 4, y + 12 + k * 5, 2, 2, '#4C4C4C');
    // the turret and its ears
    Pix.rect(c, x + 18, y + 4, 22, 9, g2); Pix.rect(c, x + 18, y + 4, 22, 1, g1); Pix.rect(c, x + 17, y + 6, 1, 6, g2); Pix.rect(c, x + 40, y + 6, 1, 6, g3);
    Pix.disc(c, x + 22, y + 3, 2, g2); Pix.rect(c, x + 22, y + 3, 1, 1, g3);
    if (!d) { Pix.disc(c, x + 36, y + 3, 2, g2); Pix.rect(c, x + 36, y + 3, 1, 1, g3); }
    Pix.rect(c, x + 28, y + 2, 5, 2, '#BCBCBC'); Pix.rect(c, x + 29, y + 1, 3, 1, '#E0E0E0');   // hatch
    Pix.line(c, x + 38, y + 4, x + 41, y - 7, '#3C3C3C');                                        // antenna
    Pix.rect(c, x + 30, y + 7, 3, 3, '#E04030'); Pix.rect(c, x + 29, y + 8, 5, 1, '#E04030');   // emblem
    for (let k = 0; k < 11; k++) Pix.rect(c, x + 8 + k * 4, y + 18, 1, 1, g3);                 // skirt bolts
    Pix.line(c, x + 6, y + 13, x + 12, y + 19, g3);
    if (!d) { Pix.rect(c, x - 6, y + 7, 24, 3, '#9C9C9C'); Pix.rect(c, x - 6, y + 7, 24, 1, '#E0E0E0'); Pix.rect(c, x - 9, y + 6, 4, 5, '#7C7C7C'); }
    else { Pix.line(c, x + 18, y + 8, x + 6, y + 15, '#7C7C7C', 2); }   // the barrel bent down
    // eyes
    const glow = d ? '#3C3C3C' : (t >> 3) & 1 ? '#F83800' : '#F8D800';
    Pix.rect(c, x + 8, y + 14, 3, 2, glow); Pix.rect(c, x + 14, y + 14, 3, 2, glow);
  },

  // MOLE, nose up-left: a drill, a round cabin, claws, treads
  mole(c, x, y, t, d = 0) {
    const m1 = '#F0C080', m2 = '#B06828', m3 = '#4C2800';
    Pix.rect(c, x + 14, y + 16, 30, 8, '#202020');
    for (let k = 0; k < 4; k++) Art.wheel(c, x + 18 + k * 8, y + 20, 3, '#7C7C7C', '#BCBCBC');
    Pix.rect(c, x + 14, y + 6, 30, 11, m2); Pix.rect(c, x + 14, y + 6, 30, 1, m1); Pix.rect(c, x + 14, y + 16, 30, 1, m3);
    Pix.disc(c, x + 32, y + 6, 6, m2); Pix.disc(c, x + 32, y + 6, 4, '#58F8F8'); Pix.rect(c, x + 30, y + 3, 2, 2, '#F8F8F8');   // cabin dome
    Pix.rect(c, x + 40, y + 10, 4, 4, m3); for (let k = 0; k < 3; k++) Pix.rect(c, x + 41, y + 11 + k, 2, 1, (k + (t >> 2)) & 1 ? '#7C7C7C' : m1);   // dirt hopper
    // the drill: a cone pointing left, its spiral turning
    const len = d ? 7 : 16;
    for (let k = 0; k < len; k++) {
      const h = Math.max(1, Math.round((16 - k) * 0.55)), cx = x + 13 - k;
      for (let j = -h; j <= h; j++) Pix.rect(c, cx, y + 11 + j, 1, 1, ((k + j + (d ? 0 : t >> 1)) & 3) < 2 ? '#E0E0E0' : '#7C7C7C');
    }
    if (d) { Pix.rect(c, x + 5, y + 9, 2, 5, (t >> 2) & 1 ? '#F83800' : '#F8B800'); }
    // claws
    Pix.line(c, x + 16, y + 6, x + 10, y + 1, '#8C8C8C', 2); Pix.line(c, x + 16, y + 17, x + 10, y + 22, '#8C8C8C', 2);
    Pix.rect(c, x + 22, y + 9, 2, 2, '#F8D800');
  },

  // HARVESTER, facing left: the reel at the front, the cab, the grain tank, a big rear wheel, the unloading auger
  harvester(c, x, y, t, d = 0) {
    const y1 = '#F8F878', y2 = '#D8A800', y3 = '#7C5000', gr = '#3C9C1C';
    // header and reel
    Pix.rect(c, x, y + 22, 18, 4, '#7C7C7C'); Pix.rect(c, x, y + 22, 18, 1, '#BCBCBC');
    for (let k = 0; k < 6; k++) Pix.rect(c, x + 1 + k * 3, y + 26, 1, 2, '#BCBCBC');   // cutter teeth
    const rx = x + 9, ry = y + 14;
    if (!d) {
      // the reel: a big turning drum of bats with tines
      Art.ring(c, rx, ry, 8, gr, 32, t / 10);
      for (let k = 0; k < 6; k++) {
        const a = t / 10 + k * Math.PI / 3, bx = rx + Math.round(Math.cos(a) * 8), by = ry + Math.round(Math.sin(a) * 8);
        Pix.line(c, rx, ry, bx, by, '#2C7C14');
        Pix.rect(c, bx - 1, by - 1, 3, 3, y1); Pix.rect(c, bx + Math.round(Math.cos(a + 1.6) * 2), by + Math.round(Math.sin(a + 1.6) * 2), 1, 1, '#BCBCBC');
      }
    } else { Pix.line(c, rx, ry, rx - 7, ry + 5, gr); Pix.line(c, rx, ry, rx + 3, ry - 8, gr); Pix.line(c, rx, ry, rx + 8, ry + 2, gr); Art.ring(c, rx, ry, 8, gr, 12); }
    Pix.disc(c, rx, ry, 2, '#7C7C7C'); Pix.rect(c, rx, ry, 1, 1, y1);
    Pix.line(c, x + 18, y + 22, x + 22, y + 14, y3, 2);                     // feeder
    // body
    Pix.rect(c, x + 20, y + 10, 34, 16, y2); Pix.rect(c, x + 20, y + 10, 34, 1, y1); Pix.rect(c, x + 20, y + 25, 34, 1, y3);
    Pix.rect(c, x + 22, y + 0, 14, 11, y2); Pix.rect(c, x + 22, y + 0, 14, 1, y1);                        // cab
    Pix.rect(c, x + 23, y + 2, 12, 7, '#A8E8F8'); Pix.rect(c, x + 24, y + 3, 3, 1, '#F8F8F8');           // glass
    if (d) { Pix.line(c, x + 26, y + 2, x + 31, y + 8, '#202020'); Pix.line(c, x + 29, y + 3, x + 33, y + 5, '#202020'); }
    Pix.rect(c, x + 38, y + 3, 15, 8, gr); Pix.rect(c, x + 38, y + 3, 15, 1, '#78D858');                 // grain tank
    for (let k = 0; k < 7; k++) Pix.rect(c, x + 39 + k * 2, y + 2, 1, 1, y1);
    Pix.rect(c, x + 46, y - 3, 2, 6, '#3C3C3C');                                                          // exhaust
    if (!d) Pix.line(c, x + 53, y + 4, x + 62, y - 1, '#BCBCBC', 2);                                      // auger
    for (let k = 0; k < 4; k++) Pix.rect(c, x + 22 + k * 8, y + 18, 5, 1, y3);
    Art.wheel(c, x + 44, y + 26, 7, '#202020', '#7C7C7C'); Pix.disc(c, x + 44, y + 26, 2, y2);
    Art.wheel(c, x + 27, y + 28, 4, '#202020', '#7C7C7C');
    for (let k = 0; k < 6; k++) { const a = k * 1.05 + (d ? 0 : t / 6); Pix.rect(c, x + 44 + Math.round(Math.cos(a) * 6), y + 26 + Math.round(Math.sin(a) * 6), 1, 1, '#4C4C4C'); }
    Pix.rect(c, x + 20, y + 13, 2, 2, (t >> 3) & 1 && !d ? '#F8F8F8' : '#F8D800');                      // headlamp
  },

  // the HYDRA's fortress: an armoured hull in the sea, three long necks, a turret on each
  hydra(c, x, y, t, d = 0) {
    const h1 = '#B8F0E8', h2 = '#2C9C9C', h3 = '#0C3C44';
    Pix.rect(c, x, y + 30, 66, 12, h2); Pix.rect(c, x, y + 30, 66, 1, h1); Pix.rect(c, x + 2, y + 40, 62, 2, h3);
    for (let k = 0; k < 10; k++) Pix.rect(c, x + 3 + k * 6 + ((k & 1) * 2), y + 33, 2, 1, h1);
    for (let k = 0; k < 4; k++) Pix.rect(c, x + 8 + k * 15, y + 36, 6, 2, h3);
    // necks and heads (wrecked: drooping into the sea)
    const heads = [[12, 'gat'], [33, 'laser'], [54, 'rocket']];
    heads.forEach(([hx, kind], k) => {
      const sway = d ? 0 : Math.round(Math.sin(t / 14 + k * 2) * 2), top = d ? 26 + k * 3 : 6 + (k === 1 ? -4 : 0);
      const tx = x + hx + sway + (d ? (k - 1) * 10 : 0);
      for (let s = 0; s <= 10; s++) { const yy = y + 30 - Math.round((30 - top) * s / 10), xx = Math.round(x + hx + (tx - x - hx) * s / 10 + Math.sin(s / 2 + k) * (d ? 0 : 1.5)); Pix.rect(c, xx - 2, yy, 5, 2, s & 1 ? h2 : h1); }
      Pix.disc(c, tx, y + top, 4, h2); Pix.rect(c, tx - 3, y + top - 3, 3, 1, h1);
      Pix.rect(c, tx - 2, y + top - 1, 1, 1, d ? '#202020' : '#F83800'); Pix.rect(c, tx + 1, y + top - 1, 1, 1, d ? '#202020' : '#F83800');
      if (d) return;
      if (kind === 'gat') { Pix.rect(c, tx - 9, y + top, 6, 1, '#E0E0E0'); Pix.rect(c, tx - 9, y + top + 2, 6, 1, '#E0E0E0'); }
      if (kind === 'laser') { Pix.rect(c, tx - 1, y + top - 9, 2, 6, '#E0E0E0'); Pix.rect(c, tx - 1, y + top - 10, 2, 1, '#F83800'); }
      if (kind === 'rocket') { Pix.rect(c, tx + 3, y + top - 2, 5, 4, '#7C7C7C'); Pix.rect(c, tx + 8, y + top - 1, 1, 2, '#F83800'); }
    });
  },

  // GUNSHIP, nose left: the fuselage, the glass, stub wings with rocket pods, the tail boom, rotors
  gunship(c, x, y, t, d = 0) {
    const o1 = '#B8C878', o2 = '#6C7C38', o3 = '#2C3410';
    Pix.rect(c, x + 26, y + 11, 30, 3, o2); Pix.rect(c, x + 26, y + 11, 30, 1, o1);                          // tail boom
    Pix.rect(c, x + 54, y + 4, 3, 10, o2); Pix.rect(c, x + 54, y + 4, 1, 10, o1);                            // tail fin
    if (!d) { const a = t * 0.7; Pix.line(c, x + 55, y + 8, x + 55 + Math.round(Math.cos(a) * 5), y + 8 + Math.round(Math.sin(a) * 5), '#BCBCBC'); }   // tail rotor
    // fuselage
    for (let yy = 0; yy < 13; yy++) { const w = 30 - Math.abs(yy - 6) * 2; Pix.rect(c, x + 2 + Math.abs(yy - 6), y + 6 + yy, w, 1, yy < 2 ? o1 : yy > 10 ? o3 : o2); }
    Pix.rect(c, x + 4, y + 8, 8, 4, '#78D8F8'); Pix.rect(c, x + 13, y + 7, 7, 4, '#78D8F8'); Pix.rect(c, x + 5, y + 8, 2, 1, '#F8F8F8');   // tandem cockpits
    Pix.rect(c, x + 1, y + 15, 5, 2, '#3C3C3C'); Pix.rect(c, x - 4, y + 16, 6, 1, '#BCBCBC');                // chin gun
    Pix.rect(c, x + 16, y + 14, 16, 2, o3);                                                                   // stub wing
    Pix.rect(c, x + 15, y + 16, 7, 3, '#4C4C4C'); Pix.rect(c, x + 26, y + 16, 7, 3, '#4C4C4C');              // rocket pods
    Pix.rect(c, x + 14, y + 17, 1, 1, '#F83800'); Pix.rect(c, x + 25, y + 17, 1, 1, '#F83800');
    Pix.rect(c, x + 8, y + 21, 26, 1, '#3C3C3C'); Pix.rect(c, x + 12, y + 19, 1, 2, '#3C3C3C'); Pix.rect(c, x + 28, y + 19, 1, 2, '#3C3C3C');   // skids
    Pix.rect(c, x + 18, y + 3, 6, 3, o2); Pix.rect(c, x + 20, y + 1, 2, 2, '#3C3C3C');                       // rotor mast
    // main rotor: a blur
    if (!d) { const w = 26 + Math.round(Math.abs(Math.sin(t / 3)) * 8); Art.dith(c, x + 21 - w, y, w * 2, 1, '#3C3C3C', t & 1); Pix.rect(c, x + 21 - w + ((t * 7) % (w * 2)), y, 6, 1, '#202020'); }
    else { Pix.line(c, x + 21, y + 1, x + 4, y + 8, '#3C3C3C'); Pix.line(c, x + 21, y + 1, x + 34, y - 3, '#3C3C3C'); }
    Pix.rect(c, x + 34, y + 9, 1, 1, (t >> 3) & 1 ? '#F83800' : '#3C3C3C');                                  // beacon
  },

  // PHANTOM, facing left: a sleek wedge, a glowing visor slit; drawn see-through unless revealed
  phantom(c, x, y, t, d = 0) {
    const p1 = '#F8F8FF', p2 = d ? '#9C88E8' : '#C8B8F8', p3 = d ? '#6050B8' : '#8C78D8';
    const draw = (col, xx, yy, w, h) => { if (d) Pix.rect(c, xx, yy, w, h, col); else { Pix.rect(c, xx, yy, w, h, '#3C3478'); Art.dith(c, xx, yy, w, h, col, t >> 3); } };
    draw('#202040', x + 2, y + 17, 46, 6);
    for (let yy = 0; yy < 10; yy++) draw(yy < 2 ? p1 : yy < 7 ? p2 : p3, x + 10 - yy, y + 7 + yy, 38 + yy, 1);
    for (let yy = 0; yy < 5; yy++) draw(yy < 1 ? p1 : p2, x + 20 + yy, y + 2 + yy, 18 - yy, 1);
    draw(p2, x - 6, y + 9, 16, 1);
    const v = d ? '#3C3C3C' : (t >> 2) & 1 ? '#58F8F8' : '#F8F8F8';
    Pix.rect(c, x + 22, y + 4, 10, 2, v);                                                // the visor glows through the cloak
    if (!d) { Pix.rect(c, x + 20, y + 3, 14, 1, '#285C7C'); Pix.rect(c, x + 20, y + 6, 14, 1, '#285C7C'); }
    if (!d) { Pix.rect(c, x + 6, y + 18, 2, 2, '#58F8F8'); Pix.rect(c, x + 40, y + 18, 2, 2, '#58F8F8'); }
  },

  // ARMORED TRAIN, engine facing left: cowcatcher, boiler, smokestack, cab; then a cannon wagon and a rocket wagon
  train(c, x, y, t, d = 0) {
    const r1 = '#A8A8C0', r2 = '#5C5C78', r3 = '#2C2C3C', red = '#C82800';
    // the engine
    for (let k = 0; k < 6; k++) Pix.rect(c, x + k, y + 22 - k, 1, k + 1, '#BCBCBC');                    // cowcatcher
    Pix.rect(c, x + 5, y + 8, 28, 13, r2); Pix.rect(c, x + 5, y + 8, 28, 2, r1); Pix.rect(c, x + 5, y + 19, 28, 2, r3);   // boiler
    for (let k = 0; k < 4; k++) Pix.rect(c, x + 9 + k * 7, y + 8, 1, 13, r3);
    Pix.rect(c, x + 10, y + 1, 5, 7, r3); Pix.rect(c, x + 9, y + 0, 7, 2, '#202020');                    // smokestack
    Pix.rect(c, x + 19, y + 4, 4, 4, r1);                                                                 // dome
    Pix.rect(c, x + 33, y + 2, 12, 19, r2); Pix.rect(c, x + 32, y + 1, 14, 2, red); Pix.rect(c, x + 36, y + 6, 6, 5, '#F8F878');   // cab
    Pix.rect(c, x + 4, y + 11, 2, 3, (t >> 3) & 1 ? '#F8F878' : '#F8F8F8');                              // headlamp
    Pix.rect(c, x + 5, y + 20, 40, 2, red);
    for (let k = 0; k < 4; k++) { Art.wheel(c, x + 11 + k * 9, y + 24, 4, '#202020', '#7C7C7C'); }
    const ph = (t / 3) % (Math.PI * 2);
    Pix.line(c, x + 11 + Math.round(Math.cos(ph) * 2), y + 24 + Math.round(Math.sin(ph) * 2), x + 38 + Math.round(Math.cos(ph) * 2), y + 24 + Math.round(Math.sin(ph) * 2), '#C8C8C8');   // side rod
    // wagons
    const wag = (wx, kind) => {
      Pix.rect(c, wx, y + 10, 26, 11, r2); Pix.rect(c, wx, y + 10, 26, 1, r1); Pix.rect(c, wx, y + 20, 26, 1, r3);
      for (let k = 0; k < 4; k++) Pix.rect(c, wx + 2 + k * 6, y + 12, 1, 7, r3);
      Art.wheel(c, wx + 6, y + 24, 3, '#202020', '#7C7C7C'); Art.wheel(c, wx + 20, y + 24, 3, '#202020', '#7C7C7C');
      if (kind === 'cannon') { Pix.disc(c, wx + 13, y + 8, 4, r1); Pix.rect(c, wx - 2, y + 6, 13, 2, '#9C9C9C'); }
      if (kind === 'rocket') { Pix.rect(c, wx + 6, y + 4, 14, 6, r3); for (let k = 0; k < 3; k++) { Pix.rect(c, wx + 7 + k * 4, y + 3, 3, 2, red); } }
      Pix.rect(c, wx - 2, y + 17, 2, 1, '#202020');
    };
    wag(x + 48, 'cannon'); wag(x + 76, 'rocket');
  },

  // SCORPION, facing left: a dark bronze machine: segmented body, eight legs, two big claws, the tail arching
  // over its back with a glowing sting; d = 1: a limp tail, claws open (drawn upside down when it's beaten)
  scorpion(c, x, y, t, d = 0) {
    const ol = '#140C04', dk = '#3C2814', md = '#8C5C24', lt = '#D89C48', glow = (t >> 2) & 1 ? '#F83800' : '#F8B800';
    // far legs, darker, then the near ones (stepping)
    for (const [far, col] of [[1, '#2C1C0C'], [0, '#5C3C18']]) for (let k = 0; k < 4; k++) {
      const bx = x + 20 + k * 8 + far * 3, up = d ? 0 : ((k + far + (t >> 3)) & 1 ? 2 : 0), ky = y + 30 - up - far * 2;
      Pix.line(c, bx, y + 27 - far * 2, bx - 3, ky, col, 2); Pix.line(c, bx - 3, ky, bx - 6, y + 37 - far * 2, col, 2);
      Pix.rect(c, bx - 7, y + 37 - far * 2, 2, 1, ol);
    }
    // the abdomen: armour plates
    for (let k = 0; k < 5; k++) {
      const px = x + 20 + k * 7;
      Pix.rect(c, px - 1, y + 17, 9, 12, ol); Pix.rect(c, px, y + 18, 7, 10, md); Pix.rect(c, px, y + 18, 7, 2, lt); Pix.rect(c, px, y + 26, 7, 2, dk);
      Pix.rect(c, px + 3, y + 21, 1, 1, lt);
    }
    // the head, eyes
    Pix.rect(c, x + 8, y + 18, 14, 11, ol); Pix.rect(c, x + 9, y + 19, 12, 9, md); Pix.rect(c, x + 9, y + 19, 12, 2, lt); Pix.rect(c, x + 9, y + 26, 12, 2, dk);
    Pix.rect(c, x + 11, y + 21, 2, 2, d ? dk : glow); Pix.rect(c, x + 15, y + 21, 2, 2, d ? dk : glow);
    // the claws: an arm forward to a pincer that opens and shuts
    const open = d ? 3 : (t >> 4) & 1 ? 3 : 1;
    for (const [dy, col, hi] of [[-4, dk, md], [0, md, lt]]) {
      Pix.line(c, x + 10, y + 24 + dy, x + 3, y + 18 + dy, ol, 3); Pix.line(c, x + 10, y + 24 + dy, x + 3, y + 18 + dy, col, 2);
      Pix.disc(c, x + 1, y + 17 + dy, 3, col); Pix.rect(c, x, y + 15 + dy, 2, 1, hi);
      Pix.rect(c, x - 9, y + 15 + dy - open, 8, 2, col); Pix.rect(c, x - 9, y + 15 + dy - open, 8, 1, hi); Pix.rect(c, x - 10, y + 16 + dy - open, 2, 2, col);   // upper jaw
      Pix.rect(c, x - 8, y + 18 + dy + open, 7, 2, col); Pix.rect(c, x - 9, y + 17 + dy + open, 2, 2, col);                                                   // lower jaw
    }
    // the tail: up and over the back, the sting pointing forward (lying flat behind it when beaten)
    const pts = d ? [[52, 22], [58, 23], [64, 24], [70, 25], [76, 26]] : [[53, 18], [58, 11], [59, 3], [55, -3], [48, -6]];
    pts.forEach(([px, py], k) => { const r = 4 - (k > 2 ? 1 : 0); Pix.disc(c, x + px, y + py, r + 1, ol); Pix.disc(c, x + px, y + py, r, md); Pix.rect(c, x + px - 1, y + py - r + 1, 3, 1, lt); });
    const [sx, sy] = d ? [80, 26] : [42, -5];
    Pix.disc(c, x + sx, y + sy, 3, ol); Pix.disc(c, x + sx, y + sy, 2, d ? dk : glow);
    if (!d) { Pix.line(c, x + 39, y - 4, x + 35, y + 1, ol, 2); Pix.rect(c, x + 35, y + 1, 1, 1, '#F8F8F8'); }
  },

  // DREADNOUGHT, facing left: a fortress on tracks: twin cannons, a command tower, smokestacks, a reactor hatch
  dread(c, x, y, t, d = 0) {
    const g1 = '#D8D8E8', g2 = '#7C7C98', g3 = '#282838', g4 = '#54546C';
    Pix.rect(c, x + 2, y + 30, 88, 12, '#202020');
    for (let k = 0; k < 10; k++) Art.wheel(c, x + 7 + k * 9, y + 36, 4, '#7C7C7C', '#BCBCBC');
    for (let k = 0; k < 22; k++) Pix.rect(c, x + 3 + ((k * 4 + (d ? 0 : t)) % 86), y + 30, 2, 1, '#4C4C4C');
    Pix.rect(c, x + 4, y + 18, 84, 13, g2); Pix.rect(c, x + 4, y + 18, 84, 1, g1); Pix.rect(c, x + 4, y + 30, 84, 1, g3);
    for (let k = 0; k < 14; k++) Pix.rect(c, x + 6 + k * 6, y + 21, 1, 1, g1);                                        // rivets
    Pix.rect(c, x + 20, y + 6, 40, 13, g4); Pix.rect(c, x + 20, y + 6, 40, 1, g1);                                     // superstructure
    Pix.rect(c, x + 34, y - 4, 14, 11, g2); Pix.rect(c, x + 34, y - 4, 14, 1, g1);                                     // command tower
    for (let k = 0; k < 3; k++) Pix.rect(c, x + 36 + k * 4, y - 1, 2, 2, (t >> 3) + k & 1 ? '#F8D800' : '#7C5000');   // windows
    Pix.rect(c, x + 62, y - 2, 5, 12, g3); Pix.rect(c, x + 70, y + 0, 5, 10, g3);                                      // smokestacks
    // turrets and the twin cannons
    for (const [tx, ty, len] of [[10, 12, 18], [22, 2, 16]]) {
      Pix.rect(c, x + tx, y + ty, 12, 7, g2); Pix.rect(c, x + tx, y + ty, 12, 1, g1);
      if (d && tx === 22) { Pix.line(c, x + tx, y + ty + 3, x + tx - 6, y + ty + 9, '#4C4C4C', 2); continue; }
      Pix.rect(c, x + tx - len, y + ty + 2, len, 2, '#9C9C9C'); Pix.rect(c, x + tx - len, y + ty + 2, len, 1, '#E0E0E0');
      Pix.rect(c, x + tx - len - 2, y + ty + 1, 3, 4, '#7C7C7C');
    }
    // the reactor hatch (open and glowing when wrecked)
    if (d) { Pix.rect(c, x + 46, y + 8, 12, 9, '#202020'); Pix.disc(c, x + 52, y + 12, 3, (t >> 2) & 1 ? '#F8D800' : '#F83800'); }
    else { Pix.rect(c, x + 46, y + 9, 12, 7, g3); Pix.rect(c, x + 47, y + 10, 10, 5, g2); }
    Pix.rect(c, x + 80, y + 20, 6, 3, '#E04030');
  },

  // the UFO: a saucer with a glass dome, its pilot inside, lights going round the rim
  ufo(c, x, y, t, d = 0) {
    const u1 = '#E8E8F8', u2 = '#9898B8', u3 = '#48486C';
    // dome and pilot
    Pix.disc(c, x + 24, y + 10, 9, '#A8F8F8'); Pix.rect(c, x + 15, y + 10, 19, 4, '#A8F8F8');
    if (!d) {
      const bob = (t >> 4) & 1;
      Pix.disc(c, x + 24, y + 7 + bob, 3, '#58D854'); Pix.rect(c, x + 22, y + 10 + bob, 5, 4, '#58D854');
      Pix.rect(c, x + 22, y + 6 + bob, 2, 2, '#081808'); Pix.rect(c, x + 25, y + 6 + bob, 2, 2, '#081808');
      Pix.rect(c, x + 22, y + 2 + bob, 1, 2, '#58D854'); Pix.rect(c, x + 26, y + 2 + bob, 1, 2, '#58D854');
    }
    Pix.rect(c, x + 18, y + 4, 3, 1, '#F8F8F8'); Pix.rect(c, x + 17, y + 5, 1, 2, '#F8F8F8');
    // the saucer
    for (let yy = 0; yy < 9; yy++) { const w = 48 - Math.abs(yy - 3) * 5; Pix.rect(c, x + 24 - w / 2, y + 13 + yy, w, 1, yy < 2 ? u1 : yy < 5 ? u2 : u3); }
    for (let k = 0; k < 9; k++) { const on = (k + (t >> 3)) % 3; Pix.rect(c, x + 3 + k * 5, y + 17, 2, 2, d ? '#3C3C3C' : on === 0 ? '#F8F8F8' : on === 1 ? '#58D854' : '#A8F8F8'); }
    Pix.rect(c, x + 18, y + 22, 12, 2, u3); Pix.rect(c, x + 20, y + 23, 8, 1, d ? '#202020' : '#A8F8A8');   // the hatch underneath
  },
};

// the alien pilot, standing (16x16), facing right; flag: waving a white flag
function artAlien(c, x, y, t, flag) {
  const g = '#58D854', g3 = '#1C7C1C';
  Pix.rect(c, x + 5, y + 12, 2, 4, g3); Pix.rect(c, x + 9, y + 12, 2, 4, g3);
  Pix.rect(c, x + 5, y + 8, 6, 5, g);
  Pix.disc(c, x + 8, y + 4, 4, g);
  Pix.rect(c, x + 5, y + 3, 2, 3, '#081808'); Pix.rect(c, x + 9, y + 3, 2, 3, '#081808'); Pix.rect(c, x + 5, y + 3, 1, 1, '#F8F8F8'); Pix.rect(c, x + 9, y + 3, 1, 1, '#F8F8F8');
  Pix.rect(c, x + 6, y - 2, 1, 2, g); Pix.rect(c, x + 10, y - 2, 1, 2, g);
  if (flag) { Pix.rect(c, x + 12, y - 4, 1, 14, '#BCBCBC'); for (let k = 0; k < 5; k++) Pix.rect(c, x + 13 + k, y - 4 + Math.round(Math.sin(t / 5 + k)), 1, 4, '#F8F8F8'); Pix.rect(c, x + 11, y + 8, 2, 1, g); }
  else { Pix.rect(c, x + 11, y + 8, 4, 2, '#C8C8C8'); Pix.rect(c, x + 15, y + 8, 1, 2, '#F858F8'); }
}

// a hill line along the bottom of a sky
function artHills(c, y, col, amp, period, seed) {
  for (let x = 0; x < INTRO_W; x++) { const h = Math.round(Math.sin(x / period + seed) * amp + Math.sin(x / (period / 2.7) + seed * 2) * amp / 3); Pix.rect(c, x, y - h, 1, INTRO_H - y + h, col); }
}

// ------------------------------------------------------------------ the twenty pictures
const BOSS_ART = {
  bear: {
    intro(c, t) {
      Pix.bands(c, 0, 44, ['#3C0800', '#7C1800', '#B83000', '#E45C10', '#F8A030']);
      Pix.disc(c, 92, 40, 9, '#F8D878'); Pix.rect(c, 80, 40, 24, 4, '#F8A030');
      artHills(c, 40, '#4C2000', 3, 9, 1);
      Pix.rect(c, 0, 44, INTRO_W, 20, '#5C3010'); for (let x = 0; x < INTRO_W; x += 3) Pix.rect(c, x, 44 + (x * 7) % 18, 1, 1, '#8C5828');
      // a brick wall, bursting as it charges through
      Pix.tiles(c, Sprites.tex.brick, 8, 26, 8, 22);
      Art.debris(c, 14, 30, t, 6, '#A83000', 1.2);
      const cx = 28 + Math.round(Math.sin(t / 30) * 2);
      BossSide.bear(c, cx, 18, t);
      for (let k = 0; k < 5; k++) { const p = ((t + k * 12) % 60) / 60; Pix.disc(c, Math.round(cx + 58 + p * 18), Math.round(44 - p * 8), 1 + Math.round(p * 3), p < 0.5 ? '#C89858' : '#806040'); }   // dust behind
    },
    outro(c, t) {
      Pix.bands(c, 0, 44, ['#000020', '#081040', '#183060', '#305080']);
      Art.dith(c, 0, 38, INTRO_W, 6, '#486890');
      Pix.stars(c, 14, 7, t, 30);
      Pix.rect(c, 0, 44, INTRO_W, 20, '#3C2410'); for (let x = 0; x < INTRO_W; x += 3) Pix.rect(c, x, 44 + (x * 7) % 18, 1, 1, '#5C3818');
      Art.rot(c, 70, 34, sc => BossSide.bear(sc, 10, 2, t, 1), 60, 34, 0.18);
      Pix.rect(c, 20, 47, 8, 4, '#C8C8C8'); for (let k = 0; k < 3; k++) Pix.rect(c, 19, 47 + k * 2, 1, 1, '#F8F8F8');   // the ram plate, torn off
      Art.smoke(c, 50, 26, t, 5, 1); Art.smoke(c, 80, 30, t, 4, 2, true);
      Art.fire(c, 70, 34, 6, t);
      Art.stars(c, 64, 22, t);
      Art.tank(c, 6, 52, 0, false, t >> 3); Art.flag(c, 12, 42, t);
    },
  },

  mole: {
    intro(c, t) {
      Pix.bands(c, 0, 20, ['#3CBCFC', '#68C8F8', '#A4E4FC']);
      Pix.rect(c, 0, 19, INTRO_W, 3, '#58D854'); for (let x = 0; x < INTRO_W; x += 2) Pix.rect(c, x, 18, 1, 1, '#00A800');
      Pix.rect(c, 0, 22, INTRO_W, 42, '#7C4818');
      for (const [y, col] of [[30, '#6C3C10'], [42, '#5C3008'], [54, '#4C2800']]) { Pix.rect(c, 0, y, INTRO_W, 12, col); for (let x = 0; x < INTRO_W; x += 7) Pix.rect(c, x + (y % 5), y + 3 + (x % 7), 2, 1, '#9C6838'); }
      for (const [x, y] of [[10, 34], [90, 50], [70, 30], [20, 56]]) { Pix.disc(c, x, y, 2, '#8C8C8C'); Pix.rect(c, x - 1, y - 1, 1, 1, '#BCBCBC'); }
      // its tunnel behind it
      for (let k = 0; k < 40; k++) Pix.disc(c, 100 - k * 1.2, 58 - k * 0.6, 5, '#3C1C00');
      // tilted, drilling up toward the surface
      Art.rot(c, 50, 28, sc => BossSide.mole(sc, 4, 2, t), 50, 36, -0.45);
      Art.debris(c, 30, 26, t, 6, '#B88848', 0.8);
      // above, a player tank sits unaware; the ground starts to crack under it
      Art.tank(c, 22, 10, 0, false, 0);
      if ((t >> 3) & 1) { Pix.rect(c, 26, 20, 1, 2, '#3C1C00'); Pix.rect(c, 30, 21, 2, 1, '#3C1C00'); }
    },
    outro(c, t) {
      Pix.bands(c, 0, 34, ['#3CBCFC', '#68C8F8', '#A4E4FC']);
      Pix.disc(c, 18, 10, 6, '#F8F878');
      Pix.rect(c, 0, 34, INTRO_W, 30, '#7C4818'); Pix.rect(c, 0, 33, INTRO_W, 3, '#58D854');
      Pix.disc(c, 56, 44, 16, '#3C1C00'); Pix.rect(c, 40, 34, 32, 10, '#3C1C00');                // the hole it couldn't get out of
      Art.rot(c, 50, 28, sc => BossSide.mole(sc, 4, 2, t, 1), 54, 36, -1.2);
      Art.stars(c, 58, 22, t);
      Art.smoke(c, 52, 26, t, 4, 3);
      for (const [x, y] of [[30, 31], [80, 30], [86, 32]]) Pix.rect(c, x, y, 3, 2, '#9C6838');
      Art.tank(c, 84, 25, 0, true, t >> 3); Art.flag(c, 96, 15, t);
    },
  },

  harvester: {
    intro(c, t) {
      Pix.bands(c, 0, 36, ['#F87830', '#F8A030', '#F8C860', '#F8E098']);
      Pix.disc(c, 30, 30, 10, '#F83800'); Pix.disc(c, 30, 30, 8, '#F86030');
      artHills(c, 34, '#B87830', 2, 12, 3);
      Pix.rect(c, 0, 36, INTRO_W, 28, '#D8A800');
      for (let y = 37; y < 64; y += 3) for (let x = (y % 2) * 2; x < INTRO_W; x += 4) Pix.rect(c, x, y, 1, 2, y % 6 ? '#F8D878' : '#B88800');   // wheat
      for (const [x, y] of [[96, 40], [104, 46]]) { Pix.rect(c, x, y, 7, 5, '#E8C058'); Pix.rect(c, x, y + 2, 7, 1, '#B08828'); Pix.rect(c, x + 3, y, 1, 5, '#7C5000'); }   // hay bales
      const hx = 30 + Math.round(Math.sin(t / 20));
      BossSide.harvester(c, hx, 20, t);
      // chaff flying out behind
      for (let k = 0; k < 8; k++) { const p = ((t + k * 7) % 40) / 40; Pix.rect(c, Math.round(hx + 62 + p * 30), Math.round(20 - p * 6 + p * p * 20), 1, 1, k % 2 ? '#F8F878' : '#D8A800'); }
    },
    outro(c, t) {
      Pix.bands(c, 0, 36, ['#1C1C3C', '#3C2C5C', '#7C3C5C', '#B85840']);
      Pix.stars(c, 8, 9, t, 24);
      Pix.rect(c, 0, 36, INTRO_W, 28, '#7C5000');
      for (let y = 37; y < 64; y += 3) for (let x = (y % 2) * 2; x < INTRO_W; x += 4) Pix.rect(c, x, y, 1, 2, '#5C3C00');   // stubble
      // nose-first into a haystack
      Pix.disc(c, 22, 40, 14, '#E8C058'); Pix.rect(c, 8, 40, 28, 12, '#E8C058');
      for (let k = 0; k < 12; k++) Pix.rect(c, 10 + k * 2, 30 + (k * 5) % 9, 1, 3, '#B08828');
      Art.rot(c, 66, 40, sc => BossSide.harvester(sc, 2, 4, t, 1), 52, 38, 0.12);
      Pix.disc(c, 22, 40, 8, '#E8C058');
      Art.fire(c, 60, 28, 10, t); Art.smoke(c, 64, 22, t, 6, 4, true);
      Art.tank(c, 92, 49, 0, true, t >> 3); Art.flag(c, 104, 39, t);
    },
  },

  hydra: {
    intro(c, t) {
      const flash = t % 150 < 4;
      Pix.bands(c, 0, 40, flash ? ['#F8F8F8', '#C8C8F8', '#A8A8D8'] : ['#0C0C2C', '#1C1C4C', '#2C2C5C', '#3C3C6C']);
      if (flash) Pix.line(c, 96, 0, 88, 18, '#F8F8F8', 2);
      Pix.rect(c, 0, 40, INTRO_W, 24, '#0058F8');
      for (let y = 42; y < 64; y += 4) for (let x = 0; x < INTRO_W; x += 8) Pix.rect(c, (x + y * 3 + (t >> 2)) % INTRO_W, y, 4, 1, '#3CBCFC');
      BossSide.hydra(c, 22, 4, t);
      // the laser head fires a beam down into the sea
      if ((t % 90) > 60) { Pix.rect(c, 56, 0, 2, 8, (t >> 1) & 1 ? '#F83800' : '#F8F8F8'); }
      for (let x = 20; x < 92; x += 3) Pix.rect(c, x, 45 + ((x + (t >> 2)) % 2), 2, 1, '#F8F8F8');   // surf
    },
    outro(c, t) {
      Pix.bands(c, 0, 40, ['#F87830', '#F8A030', '#F8C860']);
      Pix.disc(c, 90, 38, 8, '#F8F878');
      Pix.rect(c, 0, 40, INTRO_W, 24, '#0058F8');
      for (let y = 42; y < 64; y += 4) for (let x = 0; x < INTRO_W; x += 8) Pix.rect(c, (x + y * 3 + (t >> 3)) % INTRO_W, y, 4, 1, '#3CBCFC');
      BossSide.hydra(c, 24, 12 + Math.min(8, t >> 4), t, 1);
      Pix.rect(c, 0, 50, INTRO_W, 14, '#0058F8'); for (let y = 52; y < 64; y += 4) for (let x = 0; x < INTRO_W; x += 8) Pix.rect(c, (x + y * 5 + (t >> 3)) % INTRO_W, y, 4, 1, '#3CBCFC');
      for (let k = 0; k < 6; k++) { const p = ((t + k * 10) % 50) / 50; Pix.rect(c, 30 + k * 9, Math.round(50 - p * 8), 1, 1, '#F8F8F8'); }   // bubbles
      Art.smoke(c, 48, 40, t, 4, 5);
      // a little boat with the winner aboard
      Pix.rect(c, 4, 44, 18, 3, '#9C4800'); Pix.rect(c, 6, 47, 14, 1, '#7C3800'); Art.tank(c, 5, 35, 0, false, 0); Art.flag(c, 18, 28, t);
    },
  },

  gunship: {
    intro(c, t) {
      Pix.bands(c, 0, 64, ['#000010', '#000020', '#081030', '#101C40']);
      Pix.stars(c, 16, 11, t, 30);
      // the city
      for (const [x, w, h] of [[0, 12, 18], [12, 9, 26], [21, 14, 14], [35, 8, 30], [43, 12, 20], [55, 10, 24], [65, 14, 16], [79, 8, 32], [87, 13, 22], [100, 12, 28]]) {
        Pix.rect(c, x, 64 - h, w, h, '#181828');
        for (let yy = 64 - h + 3; yy < 62; yy += 4) for (let xx = x + 2; xx < x + w - 1; xx += 3) if ((xx * 7 + yy * 3) % 5 < 2) Pix.rect(c, xx, yy, 1, 2, '#F8D878');
      }
      const gx = 40 + Math.round(Math.sin(t / 25) * 6), gy = 8 + Math.round(Math.sin(t / 17) * 2);
      // the searchlight sweeping the streets
      const sx = gx + 20 + Math.round(Math.sin(t / 20) * 18);
      for (let y = gy + 20; y < 64; y++) { const k = (y - gy - 20) / 44, w = 2 + Math.round(k * 12); Art.dith(c, Math.round(gx + 20 + (sx - gx - 20) * k - w / 2), y, w, 1, '#F8F8A8', y); }
      BossSide.gunship(c, gx, gy, t);
      // rockets streaking off
      const p = (t % 60) / 60;
      if (p < 0.6) { const rx = gx + 14 - p * 60, ry = gy + 17 + p * 30; Pix.rect(c, Math.round(rx), Math.round(ry), 3, 1, '#F8F8F8'); Art.dith(c, Math.round(rx + 3), Math.round(ry), 10, 1, '#F87830'); }
    },
    outro(c, t) {
      Pix.bands(c, 0, 48, ['#3C2C5C', '#7C4C7C', '#C87C7C', '#F8B898']);
      Pix.disc(c, 22, 46, 8, '#F8E098');
      for (const [x, w, h] of [[0, 14, 18], [70, 12, 24], [84, 10, 16], [96, 16, 22]]) Pix.rect(c, x, 64 - h, w, h, '#28283C');
      Pix.rect(c, 0, 52, INTRO_W, 12, '#3C3C3C'); for (let x = 0; x < INTRO_W; x += 8) Pix.rect(c, x, 57, 4, 1, '#BCBCBC');   // street
      Art.rot(c, 66, 30, sc => BossSide.gunship(sc, 5, 4, t, 1), 48, 42, -0.35);
      Art.fire(c, 50, 48, 8, t); Art.smoke(c, 52, 40, t, 6, 6, true); Art.sparks(c, 34, 46, t);
      Art.tank(c, 90, 43, 0, true, t >> 3); Art.flag(c, 101, 33, t);
    },
  },

  phantom: {
    intro(c, t) {
      Pix.bands(c, 0, 64, ['#000008', '#080818', '#101028', '#181838']);
      Pix.disc(c, 92, 12, 7, '#E8E8F8'); Pix.disc(c, 95, 10, 6, '#101028');                            // the moon
      for (const [x, h] of [[4, 30], [16, 38], [80, 34], [100, 40]]) { Pix.rect(c, x + 3, 64 - h + 10, 2, h, '#101808'); Pix.disc(c, x + 4, 64 - h + 8, 7, '#0C2008'); }   // dark trees
      Pix.rect(c, 0, 52, INTRO_W, 12, '#0C1410');
      BossSide.phantom(c, 36 + Math.round(Math.sin(t / 40) * 8), 32, t);
      // fog drifting across
      for (let k = 0; k < 3; k++) Art.dith(c, ((t >> 1) + k * 40) % 140 - 30, 44 + k * 5, 40, 3, '#5C5C7C', k);
      // two decoys, fainter still
      if ((t >> 4) % 3 === 0) { Pix.rect(c, 8, 40, 6, 1, '#58F8F8'); Pix.rect(c, 98, 44, 6, 1, '#58F8F8'); }
    },
    outro(c, t) {
      Pix.bands(c, 0, 64, ['#081030', '#183060', '#305080', '#5878A8']);
      Pix.disc(c, 92, 12, 7, '#F8F8F8');
      for (const [x, h] of [[4, 30], [100, 40]]) { Pix.rect(c, x + 3, 64 - h + 10, 2, h, '#1C2C14'); Pix.disc(c, x + 4, 64 - h + 8, 7, '#1C3C14'); }
      Pix.rect(c, 0, 52, INTRO_W, 12, '#1C2C24');
      BossSide.phantom(c, 30, 32, t, 1);
      // the cloak, shattered into glittering shards
      for (let k = 0; k < 14; k++) { const p = ((t + k * 7) % 70) / 70; Pix.rect(c, Math.round(40 + Math.cos(k) * (8 + p * 30)), Math.round(38 + Math.sin(k * 1.7) * (4 + p * 12) + p * 10), 2, 1, p < 0.5 ? '#F0E8FF' : '#9C88E8'); }
      Art.smoke(c, 54, 30, t, 4, 7);
      // the winner's searchlight finds it
      for (let x = 0; x < 30; x++) Art.dith(c, 96 - x, 46 - Math.round(x * 0.3), 1, Math.round(2 + x / 4), '#F8F8A8', x);
      Art.tank(c, 92, 45, 0, true, t >> 3);
    },
  },

  train: {
    intro(c, t) {
      Pix.bands(c, 0, 40, ['#3CBCFC', '#68C8F8', '#A4E4FC']);
      artHills(c, 22, '#7C7C98', 8, 10, 2); artHills(c, 34, '#58A848', 4, 8, 5);
      Pix.rect(c, 0, 40, INTRO_W, 24, '#507030');
      // the tunnel in the mountain on the right
      Pix.rect(c, 88, 16, 24, 32, '#5C5C78'); Pix.disc(c, 100, 30, 10, '#000000'); Pix.rect(c, 90, 30, 20, 18, '#000000');
      for (let k = 0; k < 6; k++) Pix.rect(c, 88 + k * 4, 18, 3, 2, '#7C7C98');
      // tracks
      Pix.rect(c, 0, 50, INTRO_W, 2, '#8C8C9C'); for (let x = 0; x < INTRO_W; x += 4) Pix.rect(c, x, 52, 2, 2, '#5C3C18');
      const tx = 100 - (t % 200) * 0.9;
      BossSide.train(c, Math.round(tx), 24, t);
      Art.smoke(c, tx + 12, 22, t, 6, 8);
      // crossing signals flashing
      Pix.rect(c, 6, 36, 1, 14, '#BCBCBC'); Pix.rect(c, 4, 34, 2, 2, (t >> 3) & 1 ? '#F83800' : '#3C0000'); Pix.rect(c, 8, 34, 2, 2, (t >> 3) & 1 ? '#3C0000' : '#F83800');
    },
    outro(c, t) {
      Pix.bands(c, 0, 40, ['#F87830', '#F8A030', '#F8C860']);
      artHills(c, 26, '#7C5C5C', 6, 11, 2);
      Pix.rect(c, 0, 36, INTRO_W, 28, '#507030');
      Pix.rect(c, 0, 40, INTRO_W, 2, '#8C8C9C'); for (let x = 0; x < INTRO_W; x += 4) Pix.rect(c, x, 42, 2, 2, '#5C3C18');
      // off the rails, on its side down the bank; the wagons scattered
      Art.rot(c, 106, 32, sc => BossSide.train(sc, 2, 2, t, 1), 36, 50, 0.45);
      Art.smoke(c, 34, 44, t, 6, 9);
      Art.fire(c, 70, 58, 8, t); Art.smoke(c, 74, 52, t, 4, 10, true);
      Art.tank(c, 92, 31, 0, true, t >> 3); Art.flag(c, 104, 21, t);
      Pix.rect(c, 88, 40, 6, 2, '#5C3C18');
    },
  },

  scorpion: {
    intro(c, t) {
      Pix.bands(c, 0, 38, ['#F87830', '#F8A030', '#F8C860', '#F8E098']);
      Pix.disc(c, 88, 20, 10, '#F8F878');
      artHills(c, 38, '#E8A848', 4, 14, 1);
      Pix.rect(c, 0, 42, INTRO_W, 22, '#F8C870'); for (let x = 0; x < INTRO_W; x += 5) Pix.rect(c, x, 44 + (x * 3) % 18, 3, 1, '#D8A048');
      // heat shimmer
      for (let x = 0; x < INTRO_W; x += 2) Pix.rect(c, x, 40 + Math.round(Math.sin(x / 3 + t / 6)), 1, 1, '#F8E098');
      // a skull in the sand
      Pix.disc(c, 100, 54, 3, '#F8F8F8'); Pix.rect(c, 99, 53, 1, 1, '#202020'); Pix.rect(c, 101, 53, 1, 1, '#202020'); Pix.rect(c, 96, 54, 2, 1, '#F8F8F8');
      BossSide.scorpion(c, 30 + Math.round(Math.sin(t / 30) * 3), 16, t);
      // the sting lobs a shell up and over at a tank far off
      Art.tank(c, 2, 52, 0, false, 0);
      const p = (t % 80) / 80;
      if (p < 0.8) { const q = p / 0.8, sx = 66 - q * 58, sy = 10 - Math.sin(q * Math.PI) * 12 + q * 40; Pix.rect(c, Math.round(sx), Math.round(sy), 3, 3, '#3C2814'); Pix.rect(c, Math.round(sx) + 1, Math.round(sy) + 1, 1, 1, '#F83800'); }
      else Pix.boom(c, 2, 48, Math.floor((p - 0.8) * 30));
    },
    outro(c, t) {
      Pix.bands(c, 0, 38, ['#3C1C3C', '#7C3C5C', '#C8685C', '#F8A070']);
      Pix.disc(c, 20, 38, 9, '#F87830');
      artHills(c, 40, '#C88848', 4, 14, 1);
      Pix.rect(c, 0, 44, INTRO_W, 20, '#E8B868');
      Art.flipV(c, 96, 46, sc => BossSide.scorpion(sc, 12, 8, t, 1), 12, 18);   // on its back, legs in the air
      Art.smoke(c, 50, 36, t, 5, 11, true);
      // a vulture circling
      const a = t / 30, vx = 70 + Math.round(Math.cos(a) * 18), vy = 12 + Math.round(Math.sin(a) * 4);
      Pix.rect(c, vx - 3, vy + ((t >> 3) & 1), 3, 1, '#202020'); Pix.rect(c, vx, vy, 1, 1, '#202020'); Pix.rect(c, vx + 1, vy + ((t >> 3) & 1), 3, 1, '#202020');
      Art.tank(c, 90, 47, 0, true, t >> 3); Art.flag(c, 102, 37, t);
    },
  },

  dread: {
    intro(c, t) {
      const flash = t % 70 < 3;
      Pix.bands(c, 0, 48, flash ? ['#F8B800', '#F87830', '#D82800'] : ['#200000', '#401000', '#682000', '#903000']);
      Pix.rect(c, 0, 48, INTRO_W, 16, '#2C2010');
      for (let k = 0; k < 3; k++) Pix.line(c, 18 + k * 40, 48, 30 + k * 40 + Math.round(Math.sin(t / 30 + k) * 10), 0, '#F8F8A8');   // searchlights
      BossSide.dread(c, 14, 12, t);
      Art.smoke(c, 64, 8, t, 4, 12, true); Art.smoke(c, 72, 10, t, 4, 13, true);
      if (t % 70 < 8) Pix.boom(c, -12, 13, (t % 70) >> 1);   // a cannon going off
      // tiny player tanks, for scale
      Art.tank(c, 100, 55, 0, true, t >> 3);
    },
    outro(c, t) {
      Pix.bands(c, 0, 48, ['#202040', '#403060', '#704870', '#A06070']);
      Pix.rect(c, 0, 48, INTRO_W, 16, '#2C2010');
      // broken in two, the reactor out
      Art.rot(c, 70, 50, sc => BossSide.dread(sc, 20, 6, t, 1), 28, 32, -0.14);
      Art.rot(c, 44, 50, sc => BossSide.dread(sc, -48, 6, t, 1), 90, 35, 0.2);
      Art.fire(c, 56, 46, 10, t);
      Pix.disc(c, 60, 38, 4, (t >> 2) & 1 ? '#F8D800' : '#F83800'); Pix.disc(c, 60, 38, 2, '#F8F8F8');   // the reactor, thrown clear
      Art.sparks(c, 60, 36, t, 8);
      for (let k = 0; k < 3; k++) if ((t + k * 20) % 60 < 12) Pix.boom(c, 10 + k * 34, 18 + (k % 2) * 8, ((t + k * 20) % 60) >> 1);
      Art.smoke(c, 30, 20, t, 5, 14, true); Art.smoke(c, 84, 22, t, 5, 15, true);
      Art.tank(c, 2, 54, 0, false, t >> 3); Art.tank(c, 96, 54, 1, true, t >> 3); Art.flag(c, 106, 44, t);
    },
  },

  ufo: {
    intro(c, t) {
      Pix.bands(c, 0, 48, ['#000008', '#000018', '#080828', '#101838']);
      Pix.stars(c, 24, 13, t, 40);
      artHills(c, 46, '#081808', 2, 16, 4);
      Pix.rect(c, 0, 48, INTRO_W, 16, '#0C2008');
      // a farmhouse and a crop circle
      Pix.rect(c, 88, 38, 14, 10, '#3C2010'); for (let k = 0; k < 7; k++) Pix.rect(c, 88 + k, 38 - k, 14 - k * 2, 1, '#5C1C10'); Pix.rect(c, 93, 42, 3, 3, '#F8D878');
      for (let k = 0; k < 24; k++) { const a = k / 24 * Math.PI * 2; Pix.rect(c, Math.round(36 + Math.cos(a) * 14), Math.round(56 + Math.sin(a) * 4), 1, 1, '#2C5018'); }
      const ux = 12 + Math.round(Math.sin(t / 40) * 4), uy = 4 + Math.round(Math.sin(t / 15) * 1.5);
      // the tractor beam, a tank rising in it
      for (let y = uy + 24; y < 60; y++) { const w = 8 + Math.round((y - uy - 24) * 0.45); Art.dith(c, ux + 24 - (w >> 1), y, w, 1, '#A8F8A8', y + (t >> 2)); }
      const rise = (t % 140) * 0.25;
      Art.tank(c, ux + 16, Math.round(50 - rise), 0, false, 0);
      BossSide.ufo(c, ux, uy, t);
    },
    outro(c, t) {
      Pix.bands(c, 0, 44, ['#081030', '#304070', '#C87850', '#F8B860']);
      Pix.disc(c, 56, 44, 9, '#F8E098');
      Pix.rect(c, 0, 44, INTRO_W, 20, '#2C5018'); for (let x = 0; x < INTRO_W; x += 3) Pix.rect(c, x, 46 + (x * 5) % 16, 1, 1, '#4C7828');
      // the saucer, crashed in a crater
      Pix.disc(c, 40, 56, 14, '#3C2C10'); Pix.rect(c, 26, 56, 28, 8, '#3C2C10');
      Art.rot(c, 52, 28, sc => BossSide.ufo(sc, 2, 2, t, 1), 40, 45, 0.3);
      Art.smoke(c, 34, 36, t, 5, 16, true); Art.fire(c, 46, 52, 6, t);
      // the pilot gives up
      artAlien(c, 62, 42, t, true);
      Art.tank(c, 84, 50, 0, true, t >> 3); Art.tank(c, 92, 40, 1, true, t >> 3); Art.flag(c, 104, 30, t);
    },
  },
};

// the words on each screen: two lines before the fight, one after it
const BOSS_TALES = {
  bear: { intro: ['A TANK WITH A BATTERING RAM', 'WHEN IT FLASHES RED, MOVE!'], outro: 'THE BEAR SLEEPS FOR WINTER' },
  mole: { intro: ['IT TUNNELS UNDER YOUR WALLS', 'HIT IT WHEN IT SURFACES'], outro: 'BACK UNDERGROUND FOR GOOD' },
  harvester: { intro: ['A COMBINE HARVESTER GONE MAD', 'LURE IT INTO STEEL'], outro: 'THE HARVEST IS OVER' },
  hydra: { intro: ['THREE HEADS ON A SEA FORTRESS', 'CUT ONE OFF - IT MAY REGROW'], outro: 'NO HEADS LEFT TO REGROW' },
  gunship: { intro: ['DEATH FROM ABOVE', 'IT FLIES OVER EVERY WALL'], outro: 'GROUNDED. PERMANENTLY.' },
  phantom: { intro: ['YOU WILL NOT SEE IT COMING', 'WATCH FOR TRACKS ON THE ICE'], outro: 'NOW EVERYONE CAN SEE IT' },
  train: { intro: ['ARMORED TRAIN APPROACHING', 'WRECK THE WAGONS FIRST'], outro: 'END OF THE LINE' },
  scorpion: { intro: ['IT WALKS OVER WALLS AND WATER', 'WHEN THE CLAWS OPEN, RUN'], outro: 'ITS STING IS GONE' },
  dread: { intro: ['A FORTRESS ON TRACKS', 'WITH AN ARMY INSIDE'], outro: 'THE FORTRESS HAS FALLEN' },
  ufo: { intro: ['THEY CAME FROM OUTER SPACE', 'STAY OUT OF THE BEAM'], outro: 'THE EARTH IS SAVED!' },
};

// a whole boss screen: the picture framed like the mode title screens, the words around it
function drawBossScreen(ctx, idx, t, outro, pts) {
  const def = BOSSES[idx], art = BOSS_ART[def.kind], tale = BOSS_TALES[def.kind];
  const pc = bossArtCanvas || (bossArtCanvas = makeCanvas(INTRO_W, INTRO_H)), c = pc.getContext('2d');
  c.clearRect(0, 0, INTRO_W, INTRO_H);
  c.imageSmoothingEnabled = false;
  (outro ? art.outro : art.intro)(c, t);
  ctx.fillStyle = COL.black; ctx.fillRect(0, 0, SW, SH);
  const final = def.kind === 'ufo', last = def.kind === 'galya';
  if (!outro) {
    if ((t >> 3) & 1 || t < 8) Font.drawCenter(ctx, last ? 'WARNING! THE REAL FINAL BOSS' : final ? 'WARNING! FINAL BOSS' : 'WARNING! BOSS APPROACHING', SW / 2, 2, COL.red);
  } else Font.drawCenter(ctx, last ? 'YOU BEAT THE GAME!' : 'BOSS DEFEATED!', SW / 2, 2, COL.gold);
  let s = 3;
  while (s > 1 && Font.bigWidth(def.name, s) > SW - 16) s--;
  Font.big(ctx, def.name, (SW - Font.bigWidth(def.name, s)) >> 1, 23 - (7 * s >> 1), s, Sprites.bricks(ctx));
  ctx.fillStyle = outro ? '#F8D800' : '#F83800'; ctx.fillRect(INTRO_X - 4, INTRO_Y - 4, INTRO_W * 2 + 8, INTRO_H * 2 + 8);
  ctx.fillStyle = COL.black; ctx.fillRect(INTRO_X - 3, INTRO_Y - 3, INTRO_W * 2 + 6, INTRO_H * 2 + 6);
  ctx.fillStyle = '#7C7C7C'; ctx.fillRect(INTRO_X - 2, INTRO_Y - 2, INTRO_W * 2 + 4, INTRO_H * 2 + 4);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(pc, INTRO_X, INTRO_Y, INTRO_W * 2, INTRO_H * 2);
  // a speech bubble (BABA GALYA has a few words to say), at full size over the picture
  const bub = art.bubble && art.bubble(t, outro);
  if (bub) {
    const w = bub.text.length * 8 + 6, bx = INTRO_X + bub.x * 2, by = INTRO_Y + bub.y * 2;
    ctx.fillStyle = '#100808'; ctx.fillRect(bx - 1, by - 1, w + 2, 13);
    ctx.fillStyle = '#F8F8F8'; ctx.fillRect(bx, by, w, 11); ctx.fillRect(bx + w - 14, by + 11, 4, 3); ctx.fillRect(bx + w - 12, by + 14, 2, 2);
    Font.draw(ctx, bub.text, bx + 3, by + 2, bub.text.includes('#') ? '#D82800' : '#100808');
  }
  const y = INTRO_Y + INTRO_H * 2 + 8;
  if (!outro) {
    Font.drawCenter(ctx, tale.intro[0], SW / 2, y, '#F8F8F8');
    Font.drawCenter(ctx, tale.intro[1], SW / 2, y + 11, '#BCBCBC');
  } else {
    Font.drawCenter(ctx, tale.outro, SW / 2, y, '#F8F8F8');
    Font.drawCenter(ctx, '+' + (pts || def.pts) + ' PTS', SW / 2, y + 11, COL.gold);
  }
  if ((t >> 4) & 1 || t < 20) Font.drawCenter(ctx, 'PRESS ENTER', SW / 2, y + 23, COL.red);
}

Object.assign(Game, {
  bossScreensWanted() { return Config.on('bossScreens') && Net.role !== 'client'; },

  // the boss's picture before the fight (the stage is ready behind it, waiting)
  toBossIntro() {
    this.bossScreen = { idx: this.stage.bossIdx, outro: false };
    this.setState('bossIntro');
  },

  // and after it: then the score tally as usual
  toBossOutro() {
    const st = this.stage;
    this.bossScreen = { idx: st.bossIdx, outro: true, pts: st.bossPts || BOSSES[st.bossIdx].pts };
    this.setState('bossOutro');
  },

  updateBossScreen() {
    const m = Input.menu(), guest = Object.values(Input.remote).some(r => r.menu && r.menu.ok);
    if (this.t < BOSS_SCREEN_TIME && !(this.t > 20 && (m.ok || m.back || guest))) return;
    if (this.t < BOSS_SCREEN_TIME) Sound.play('select');
    if (this.state === 'bossIntro') {
      this.setState('play');
      this.openH = SCREEN_H / 2;
      Sound.play('start');
    } else this.toScore(false);
  },

  renderBossScreen(ctx) {
    const b = this.bossScreen;
    if (b) drawBossScreen(ctx, b.idx, this.t, b.outro, b.pts);
  },
});
