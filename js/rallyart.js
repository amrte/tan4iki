'use strict';
// =====================================================================
//  TANK RALLY's title picture (intro.js shows it; the helpers are introart.js's): a race on an alien world at
//  dusk. A ringed planet and two moons over purple spires, floodlights, a grandstand full of a jumping crowd with
//  cameras flashing. The track is an oval seen from up in the stands: four tanks race round it (you lead), jostle
//  side by side with sparks flying, take a ramp and jump a lava chasm, cross the checkered line under a waving
//  flag; the last one drops a mine that goes off behind it. A wreck burns in the infield among the crystals.
//  The oval: centre (RA_CX, RA_CY), radii RA_RX x RA_RY; θ goes round it, the racers run with θ going down (left
//  to right along the front straight). Far things are smaller: the track narrows and the tanks shrink up the hill.
// =====================================================================

const RA_CX = 120, RA_CY = 88, RA_RX = 104, RA_RY = 34;
const RA_RAMP = Math.PI / 2 + 0.3, RA_JUMP = 0.42, RA_LINE = Math.PI / 2 - 0.62, RA_MINE = Math.PI - 0.5;
const RA_LAP = 480;   // frames a lap

const RallyArt = {
  // half the track's width at a height on the picture (narrower far away)
  hw(y) { return 4 + (y - 50) * 0.12; },
  // a point of the oval at θ, lane (-1 inside .. 1 outside); its heading when θ goes down
  at(th, lane = 0) {
    const x = RA_CX + RA_RX * Math.cos(th), y = RA_CY + RA_RY * Math.sin(th);
    let nx = Math.cos(th) / RA_RX, ny = Math.sin(th) / RA_RY;
    const n = Math.hypot(nx, ny), w = this.hw(y) * lane * 0.7;
    nx /= n; ny /= n;
    return { x: x + nx * w, y: y + ny * w, hx: RA_RX * Math.sin(th), hy: -RA_RY * Math.cos(th), s: 0.5 + 0.5 * Math.max(0, (y - 54) / 68) };
  },
  // where a pixel is relative to the track: its distance out from the middle line, and its θ
  where(x, y) {
    const nx = (x - RA_CX) / RA_RX, ny = (y - RA_CY) / RA_RY, d = Math.hypot(nx, ny), th = Math.atan2(ny, nx);
    return { d: (d - 1) * Math.hypot(RA_RX * Math.cos(th), RA_RY * Math.sin(th)), th };
  },
  // a top-down tank (introart.js's, gun up) turned to any heading and drawn size px across: sampled pixel by
  // pixel so it stays crisp; 32 headings, cached
  src: new Map(),
  turned: new Map(),
  tank(pal, ang, f, size) {
    const a32 = ((Math.round(ang / (Math.PI * 2) * 32) % 32) + 32) % 32, key = pal + a32 + '/' + (f & 1) + '/' + size;
    let img = this.turned.get(key);
    if (img) return img;
    let src = this.src.get(pal + (f & 1));
    if (!src) {
      const cv = makeCanvas(28, 28), x = cv.getContext('2d');
      IA.topTank(x, 14, 14, 0, pal, f & 1);
      src = x.getImageData(0, 0, 28, 28).data;
      this.src.set(pal + (f & 1), src);
    }
    const O = Math.ceil(size * 1.2) + 2, a = a32 * Math.PI / 16, ca = Math.cos(a), sa = Math.sin(a), k = 28 / size;
    img = makeCanvas(O, O);
    const ic = img.getContext('2d'), id = ic.createImageData(O, O), d = id.data;
    for (let j = 0; j < O; j++) for (let i = 0; i < O; i++) {
      const ox = i + 0.5 - O / 2, oy = j + 0.5 - O / 2;
      const sx = Math.floor((ca * ox + sa * oy) * k + 14), sy = Math.floor((-sa * ox + ca * oy) * k + 14);
      if (sx < 0 || sy < 0 || sx > 27 || sy > 27) continue;
      const s = (sy * 28 + sx) * 4, o = (j * O + i) * 4;
      if (src[s + 3] < 128) continue;
      d[o] = src[s]; d[o + 1] = src[s + 1]; d[o + 2] = src[s + 2]; d[o + 3] = 255;
    }
    ic.putImageData(id, 0, 0);
    this.turned.set(key, img);
    return img;
  },
  // see-through col over a little box (an ordered dither), cheaper than IA.veil for small things every frame
  dots(c, x, y, w, h, col, a) {
    x = Math.round(x); y = Math.round(y);
    c.fillStyle = col;
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (bayer(i, j) < a) c.fillRect(i, j, 1, 1);
  },
  // a few glowing crystals standing on (x, y)
  crystal(c, x, y, h, cols = ['#A4E4FC', '#3CBCFC', '#0078B8', '#004058']) {
    for (const [dx, hh, w] of [[0, h, 2], [-3, h * 0.6, 2], [3, h * 0.7, 2]]) {
      const top = Math.round(y - hh);
      Pix.rect(c, x + dx, top + 1, w, Math.round(hh), cols[1]); Pix.rect(c, x + dx + 1, top + 1, 1, Math.round(hh), cols[2]);
      Pix.rect(c, x + dx, top, 1, 1, cols[0]); Pix.rect(c, x + dx, top + 1, 1, Math.max(1, Math.round(hh / 3)), cols[0]);
    }
    Pix.rect(c, x - 4, y, 10, 1, cols[3]);
  },
};

INTRO_SCENES.rally = function (c, t) {
  const W = IPW, R = RallyArt;
  c.drawImage(IA.layer('rally', b => {
    // an alien dusk: the sky, stars, a ringed planet and two moons
    IA.grad(b, 0, 0, W, 46, ['#0C0418', '#1C0838', '#3C1058', '#6C1C68', '#A43C60', '#D8704C', '#F0A050']);
    Pix.stars(b, 30, 41, 0, 18, W);
    IA.ball(b, 178, 15, 11, 11, ['#F8D8A8', '#E8A060', '#C06838', '#7C3820', '#3C1810'], (x, y) => (Math.floor((y - 4) / 3) & 1 ? 0.12 : -0.05));
    for (let a = 0; a < Math.PI * 2; a += 0.02) {
      const x = Math.round(178 + Math.cos(a) * 20), y = Math.round(15 + Math.sin(a) * 4 - Math.cos(a) * 2);
      if (Math.sin(a) < 0 && Math.hypot(x - 178, y - 15) < 11) continue;   // the ring's far side, behind the planet
      Pix.rect(b, x, y, 1, 1, Math.sin(a) > 0 ? '#F8E8C8' : '#B8A088');
    }
    IA.ball(b, 34, 10, 4, 4, ['#F8F8F8', '#D8D8E8', '#A8A8C8', '#6C6C8C', '#3C3C58']);
    IA.ball(b, 56, 21, 2, 2, ['#F8F8F8', '#F8D8D8', '#C89898', '#7C5C5C', '#3C2C2C']);
    // spires and mesas far off
    IA.ridge(b, 46, 12, 21, ['#7C3C78', '#4C2058', '#2C1038'], { jag: 0.5, f: 1.4, bottom: 50 });
    for (const [x, h, w] of [[6, 30, 5], [16, 20, 3], [214, 26, 4], [229, 34, 6], [200, 16, 3]]) {
      for (let j = 0; j < h; j++) { const ww = Math.max(1, Math.round(w * (0.5 + 0.5 * j / h) + (j % 7 === 3 ? 1 : 0))); Pix.rect(b, x - (ww >> 1), 46 - h + j, ww, 1, '#2C1038'); Pix.rect(b, x - (ww >> 1), 46 - h + j, 1, 1, '#5C2C68'); }
      Pix.rect(b, x - w, 46 - h, w * 2, 2, '#2C1038');
    }
    // the floodlight towers, and their light falling on the track
    for (const x of [26, 214]) {
      IA.paint(b, 0, 44, W, 92, (xx, yy) => { const dx = xx - x, dy = yy - 6, a = Math.abs(Math.atan2(dx, dy) - (x < 120 ? -0.5 : 0.5)); return a < 0.3 && bayer(xx, yy) < 0.1 * (1 - a / 0.3) + 0.02 ? '#F8F0C8' : null; });
    }
    // the grandstand behind the far straight: tiers, a roof on posts, a scoreboard
    Pix.rect(b, 36, 24, 168, 22, '#2C2C3C');
    for (let y = 27; y < 45; y += 4) { Pix.rect(b, 38, y, 164, 4, (y >> 2) & 1 ? '#3C3C4C' : '#34344C'); Pix.rect(b, 38, y + 3, 164, 1, '#1C1C28'); }
    Pix.rect(b, 32, 20, 176, 4, '#5C5C6C'); Pix.rect(b, 32, 20, 176, 1, '#9C9CAC'); Pix.rect(b, 32, 23, 176, 1, '#2C2C34');
    for (let x = 40; x < 206; x += 32) Pix.rect(b, x, 24, 2, 21, '#4C4C5C');
    Pix.rect(b, 104, 9, 32, 12, '#9C9CAC'); Pix.rect(b, 105, 10, 30, 10, '#080810'); Pix.rect(b, 118, 21, 4, 3, '#5C5C6C');
    // the wall in front of it: red and white blocks
    for (let x = 0; x < W; x += 6) Pix.rect(b, x, 45, 6, 3, (x / 6) & 1 ? '#F8F8F8' : '#D82800');
    Pix.rect(b, 0, 48, W, 1, '#3C1810');
    // the ground (rust red), the track with its kerbs, the infield, the ramp, the chasm, the line
    IA.paint(b, 0, 49, W, IPH - 49, (x, y) => {
      const { d, th } = R.where(x, y), hw = R.hw(y), kw = hw > 8 ? 2 : 1, n = IA.hash(x >> 1, y >> 1, 4);
      if (Math.abs(d) <= hw) {
        if (Math.abs(d) > hw - kw) return Math.floor((th + 7) / 0.11) & 1 ? '#F8F8F8' : '#D82800';
        const front = y > 100;
        if (front && x >= 103 && x <= 124) {   // the chasm: its far wall, the dark, the glow of the lava below
          const top = RA_CY + RA_RY - hw + 2 + (IA.hash(x, 7) < 0.4 ? 1 : 0), dep = (y - top) / (hw * 2 - 4);
          if (y < top) return '#4C2C24';
          if (y < top + 3) return bayer(x, y) < 0.5 ? '#6C2C14' : '#4C1C0C';
          return dep > 0.75 ? (bayer(x, y) < (dep - 0.75) * 4 ? '#A82800' : '#3C0804') : dep > 0.45 ? (bayer(x, y) < (dep - 0.45) * 3 ? '#3C0804' : '#140404') : '#140404';
        }
        if (front && x >= 89 && x < 103) return (x - 89 + Math.abs(y - (RA_CY + RA_RY)) * 0.6) % 5 < 1.5 ? '#F8B800' : x === 102 ? '#3C3C3C' : bayer(x, y) < 0.3 ? '#A0A0B0' : '#7C7C8C';   // the ramp
        if (front && x > 124 && x <= 128) return '#7C7C8C';
        const lx = Math.round(RA_CX + RA_RX * Math.cos(RA_LINE));
        if (x >= lx && x < lx + 4) return ((x >> 1) + (y >> 1)) & 1 ? '#F8F8F8' : '#101010';
        if (Math.abs(d - hw * 0.35) < 0.6 && n < 0.5) return '#2C2830';   // tread marks
        return n < 0.12 ? '#5C5864' : bayer(x, y) < 0.25 ? '#4C4854' : '#423E4C';
      }
      if (d < 0) return n < 0.08 ? '#9C4C24' : bayer(x, y) < 0.3 ? '#6C2C18' : '#5C2414';   // the infield
      return n < 0.07 ? '#C86C38' : n > 0.93 ? '#6C2C14' : bayer(x, y) < 0.35 ? '#9C4C24' : '#8C4020';
    });
    // the chasm's sides, lit by the lava below
    for (let x = 103; x <= 124; x++) { Pix.rect(b, x, RA_CY + RA_RY - R.hw(122) + 3, 1, 1, '#7C2C10'); }
    // infield: crystals, a crater, boulders
    for (const [x, y, h] of [[60, 80, 7], [84, 70, 5], [150, 74, 6], [176, 84, 8], [196, 72, 5], [44, 92, 5], [118, 66, 4]]) R.crystal(b, x, y, h);
    IA.paint(b, 112, 80, 40, 18, (x, y) => {
      const d = Math.hypot((x - 132) / 18, (y - 88) / 7) + (IA.noise(x / 3, 8) - 0.5) * 0.2;
      return d > 1.15 ? null : d > 0.95 ? (bayer(x, y) < 0.6 ? '#2C0C08' : '#4C1C10') : d > 0.8 ? '#A82800' : bayer(x, y) < (0.8 - d) * 1.5 ? '#F8B800' : '#F83800';
    });
    for (const [x, y, h] of [[94, 90, 9], [170, 100, 7], [52, 72, 6], [206, 90, 8]]) {
      Pix.line(b, x, y, x + 1, y - h, '#3C6C28'); Pix.line(b, x + 1, y, x + 2, y - h + 2, '#1C3C14');
      Pix.disc(b, x + 1, y - h - 1, 2, '#9C1C8C'); Pix.rect(b, x, y - h - 2, 2, 1, '#F878F8');
    }
    for (const [x, y, r] of [[100, 78, 3], [160, 96, 2], [72, 98, 2]]) { Pix.disc(b, x, y, r, '#3C1C14'); Pix.disc(b, x - 1, y - 1, r - 1, '#7C4834'); }
    // outside: rocks in the foreground
    for (const [x, y, r] of [[8, 130, 4], [232, 128, 5], [6, 64, 3], [234, 70, 3]]) { Pix.disc(b, x, y, r, '#4C1C10'); Pix.disc(b, x - 1, y - 1, r - 1, '#B85C30'); }
    // the burnt-out wreck in the infield
    IA.scorch(b, 66, 98, 7);
    Pix.rect(b, 60, 94, 12, 8, '#2C2C2C'); Pix.rect(b, 61, 95, 10, 6, '#484848'); Pix.rect(b, 64, 96, 5, 4, '#1C1C1C'); Pix.line(b, 66, 96, 74, 91, '#3C3C3C');
  }), 0, 0);

  // the crowd on its feet, cameras flashing
  c.drawImage(IA.layer('rally-crowd' + ((t >> 3) & 1), b => {
    const r = seeded(19), f = (t >> 3) & 1;
    for (let y = 28; y < 44; y += 4) for (let x = 39; x < 201; x += 3) {
      if (r() < 0.1) continue;
      const up = f && r() < 0.5 ? 1 : 0, shirt = ['#D82800', '#F8B800', '#0058F8', '#00A844', '#F8F8F8', '#F878B8', '#3CBCFC'][Math.floor(r() * 7)];
      Pix.rect(b, x, y - up, 2, 1, ['#F8C8A0', '#78C878', '#9C8CF8'][Math.floor(r() * 3)]); Pix.rect(b, x, y + 1 - up, 2, 2, shirt);
      if (up && r() < 0.3) Pix.rect(b, x + 1, y - 2, 1, 1, '#F8C8A0');
    }
  }), 0, 0);
  for (let k = 0; k < 3; k++) { const r = seeded((t >> 2) * 5 + k); if (r() < 0.45) { const x = 40 + Math.floor(r() * 160), y = 28 + Math.floor(r() * 15); Pix.rect(c, x - 1, y, 3, 1, '#F8F8F8'); Pix.rect(c, x, y - 1, 1, 3, '#F8F8F8'); } }
  // the floodlights' lamps, the board: the race order
  for (const x of [26, 214]) {
    Pix.rect(c, x - 1, 6, 3, 42, '#5C5C6C'); Pix.rect(c, x - 1, 6, 1, 42, '#9C9CAC');
    Pix.rect(c, x - 6, 1, 13, 7, '#2C2C34'); for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) Pix.rect(c, x - 5 + i * 4, 2 + j * 3, 3, 2, (t + i * 7 + j * 11) % 90 < 3 ? '#F8D838' : '#F8F8E0');
  }
  // the lava in the chasm, bubbling
  for (let x = 104; x < 124; x += 2) { const h = (x * 7 + (t >> 3)) % 5 < 2 ? 2 : 1; Pix.rect(c, x, RA_CY + RA_RY + R.hw(122) - 4 - h, 2, h, (x + (t >> 2)) % 6 < 3 ? '#F83800' : '#F8B800'); }
  if ((t >> 4) % 3 === 0) Pix.rect(c, 108 + ((t >> 6) % 12), RA_CY + RA_RY + 2, 1, 1, '#F8D838');
  // the lava pool's bubbles
  for (let k = 0; k < 4; k++) { const q = (t + k * 23) % 60; if (q < 10) Pix.rect(c, 120 + k * 7, 86 + (k & 1) * 3 - (q >> 3), q < 7 ? 2 : 1, 1, q < 7 ? '#F8D838' : '#F8F8F8'); }
  // the wreck still burns
  IA.smoke(c, 67, 92, t, { n: 6, h: 34, size: 5, wind: 14, tone: 2 });
  for (let k = 0; k < 3; k++) Pix.rect(c, 63 + k * 3, 92 - ((t + k * 5) >> 2) % 3, 2, 2, (t + k) % 6 < 3 ? '#F87818' : '#F8D838');

  // the racers: where each is along the lap (slower on the near half, so the action stays close) (the gaps between them breathe, two of them side by side now and then)
  const om = Math.PI * 2 / RA_LAP, pals = [Config.playerPal(0), 'c_RED', 'c_CYAN', 'c_PURPLE'];
  const gaps = [0, 0.34 + 0.1 * Math.sin(t / 60), 0.48 + 0.18 * Math.sin(t / 47 + 1), 0.9 + 0.08 * Math.sin(t / 33)];
  const lanes = [-0.2, -0.55 + 0.2 * Math.sin(t / 40), 0.55, 0.1 * Math.sin(t / 25)];
  const prog = gaps.map(g => t * om - g + 0.4), th0 = RA_RAMP + 1.2;
  const mod = v => ((v % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  const racers = prog.map((p, i) => {
    const ph = th0 - p, th = ph + 0.45 * Math.cos(ph), P = R.at(th, lanes[i]), into = mod(RA_RAMP - th), air = into < RA_JUMP ? into / RA_JUMP : -1;
    return Object.assign(P, { i, th, air, pal: pals[i] });
  });
  // the mine: dropped by the third, it goes off just behind the last one
  const past = i => mod(RA_MINE - racers.find(r => r.i === i).th), m3 = past(2), m4 = past(3), M = R.at(RA_MINE, 0.4);
  if (m3 < m4) { Pix.disc(c, M.x, M.y, 2, '#2C2C2C'); Pix.rect(c, M.x, M.y - 1, 1, 1, (t >> 3) & 1 ? '#F83800' : '#5C1000'); }
  const bf = (m4 - 0.14) / (om * (1 - 0.45 * Math.sin(RA_MINE)));   // frames since it went off
  if (m4 > 0.14 && bf < 40) { IA.boom(c, M.x, M.y - 4, Math.floor(bf), 14, 5); IA.debris(c, M.x, M.y - 2, bf / 40, 10, ['#3C3C3C', '#8C4020', '#C86C38'], 4); }
  // dust behind them, sparks where two rub side by side
  for (const r of racers) if (r.air < 0 && r.s > 0.7) {
    const hl = Math.hypot(r.hx, r.hy);
    for (let k = 1; k <= 3; k++) {
      const q = (t + k * 3 + r.i * 5) % 9, dx = r.x - r.hx / hl * (9 + k * 5 + q) * r.s, dy = r.y - r.hy / hl * (9 + k * 5 + q) * r.s + 3 - (q >> 2);
      R.dots(c, dx - k, dy - k, 2 * k + 1, 2 * k, k > 1 ? '#C86C38' : '#E8A070', 0.6 - k * 0.15);
    }
  }
  for (let i = 1; i < 3; i++) {
    const a = racers[i], b2 = racers[i + 1], d = Math.hypot(a.x - b2.x, a.y - b2.y);
    if (d < 20 * a.s && a.air < 0 && b2.air < 0) IA.sparks(c, (a.x + b2.x) / 2, (a.y + b2.y) / 2, (t % 12) / 12, 8, t >> 3);
  }
  // the checkered flag at the line, waving
  const fx = Math.round(RA_CX + RA_RX * Math.cos(RA_LINE)) + 2, fy = 92;
  Pix.rect(c, fx, fy, 1, 22, '#C8C8C8'); Pix.rect(c, fx - 2, fy + 21, 5, 2, '#3C3C3C');
  for (let i = 0; i < 18; i++) {
    const dy = Math.round(Math.sin(t / 5 - i * 0.5) * (1 + i * 0.12));
    for (let j = 0; j < 12; j++) Pix.rect(c, fx + 1 + i, fy + j + dy, 1, 1, ((i >> 2) + (j >> 2)) & 1 ? '#101010' : '#F8F8F8');
  }
  // the tanks, far ones first; one in the air: its shadow on the ground, it bigger, higher
  racers.sort((a, b2) => (a.air >= 0) - (b2.air >= 0) || a.y - b2.y);
  for (const r of racers) {
    const up = r.air >= 0 ? Math.sin(r.air * Math.PI) : 0, size = Math.round(24 * r.s * (1 + up * 0.3)) & ~1;
    const img = R.tank(r.pal, Math.atan2(r.hx, -r.hy) + (r.air >= 0 ? Math.sin(r.air * Math.PI * 2) * 0.15 : 0), (t >> 2) + r.i, size);
    if (up > 0) R.dots(c, r.x - 9 * r.s, r.y - 3, 18 * r.s, 7, '#000000', 0.5 * (1 - up * 0.5));
    const y = r.y - up * 18 - (r.s > 0.7 ? 2 : 1);
    c.drawImage(img, Math.round(r.x - img.width / 2), Math.round(y - img.height / 2));
    // landing: a shower of sparks; the leader's boost flame
    if (r.air > 0.88) IA.sparks(c, r.x, r.y, (r.air - 0.88) / 0.12, 10, r.i);
    if (r.i === 0 && (t % 240) < 70) {
      const hl = Math.hypot(r.hx, r.hy), bx = r.x - r.hx / hl * 13 * r.s, by = y - r.hy / hl * 13 * r.s;
      Pix.disc(c, Math.round(bx), Math.round(by), Math.max(1, Math.round(3 * r.s)), '#F87818'); Pix.disc(c, Math.round(bx), Math.round(by), Math.max(1, Math.round(2 * r.s)), (t >> 1) & 1 ? '#F8D838' : '#F8F8F8');
    }
  }
  // the board: the order, by colour
  prog.map((p, i) => [p, i]).sort((a, b2) => b2[0] - a[0]).forEach(([, i], n) => {
    const x = 106 + n * 7;
    IA.digits(c, n + 1, x, 12, '#F8F8F8'); Pix.rect(c, x + 4, 12, 2, 5, PALS[pals[i]][2]); Pix.rect(c, x + 4, 12, 2, 1, PALS[pals[i]][1]);
  });
  // the lap, and you in front
  IA.tag(c, 'LAP 4/4', 6, 126, '#F8F8F8');
  if ((t >> 4) & 1) IA.tag(c, '1ST', 204, 126, '#F8D838');
};
