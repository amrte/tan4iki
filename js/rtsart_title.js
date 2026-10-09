'use strict';
// =====================================================================
//  DESERT DOMINION's title picture (intro.js shows it, for the mode key 'rts'; the helpers are introart.js's):
//  KHARRA under its twin suns, a ringed giant low in the amber sky. An AQUILA harvester works an orange glowing
//  glimmer field in front, scooping and spraying; on a rock ridge to the left a tank of each House (AQUILA blue,
//  DRAKON red, SERPENS green) watches; on a rock plateau to the right stands a base (construction yard, a vapor
//  trap turning, a refinery, a radar, the eagle banner). Every eight seconds wormsign: a ripple runs through the
//  dunes, a sandwyrm bursts out behind the harvester, gapes, takes the tanks' shells and sinks; then a skylifter
//  swoops in low over the harvester and away. Heat haze on the horizon, sand blowing off the crests, dust.
//  Everything repeats every RtsTitleArt.P frames, so it loops without a seam.
// =====================================================================

const RtsTitleArt = {
  P: 480,                  // frames in one loop (the title screen's 8 seconds)
  WX: 146,                 // where the wyrm comes up
  HX: 92, HY: 123,         // the harvester: its middle, the ground under its tracks
  // the Houses' colours [light, mid, dark] (rtsdata.js's RTS_HOUSE_PAL when it's there)
  houses: { aquila: ['#78B8F8', '#3C78F8', '#1838A0'], drakon: ['#F87858', '#D82800', '#801000'], serpens: ['#88E888', '#38B838', '#186818'] },
  pal(h) { const P = typeof RTS_HOUSE_PAL !== 'undefined' && RTS_HOUSE_PAL[h]; return [null].concat(P || this.houses[h]); },
  clamp: v => Math.max(0, Math.min(1, v)),
  smooth(v) { v = this.clamp(v); return v * v * (3 - 2 * v); },
  // the land's outlines: the far and near dune crests, the plateau's top and its left cliff, the ridge, the
  // foreground's edge (y of the top at x)
  farShape(x) { return 71 - 6 * (1 - Math.abs(Math.sin(x * 0.034 + 0.7))) ** 1.5; },
  nearShape(x) { return 90 - 8 * (1 - Math.abs(Math.sin(x * 0.026 + 0.4))) ** 1.5 - 4 * Math.exp(-(((x - 146) / 18) ** 2)); },
  duneFar(x) { return this.farShape(x) - 1.5 * IA.noise(x / 9, 3); },
  duneNear(x) { return this.nearShape(x) - 1.2 * IA.noise(x / 7, 5); },
  plateauTop(x) { return 50 + (x < 176 ? Math.round((176 - x) * 0.06) : 0) + (IA.hash(x >> 2, 9) < 0.25 ? 1 : 0); },
  plateauLeft(y) { return 160 - (y - 50) * 0.55 + 2 * IA.noise(y / 3, 7); },
  ridgeTop(x) { return x < 84 ? 80 + 3 * Math.sin(x * 0.09) + 2 * IA.noise(x / 4, 11) - (x < 10 ? (10 - x) * 0.8 : 0) : 80 + (x - 84) * 0.75 + 2 * IA.noise(x / 4, 11); },
  fgTop(x) { return 99 + 2 * Math.sin(x * 0.05 + 2) + 1.5 * IA.noise(x / 6, 13); },

  // the wyrm's height out of the sand at a frame of the loop, and what it is doing
  wyrm(f) {
    if (f < 120) return { h: 0, sign: f >= 50 ? (f - 50) / 70 : -1 };
    if (f < 150) return { h: 52 * this.smooth((f - 120) / 30) * (1 + 0.08 * Math.sin((f - 120) / 30 * Math.PI)), rise: (f - 120) / 30 };
    if (f < 232) return { h: 52 + 2 * Math.sin((f - 150) / 82 * Math.PI * 2), up: (f - 150) / 82 };
    if (f < 272) return { h: 52 * (1 - this.smooth((f - 232) / 40)), dive: (f - 232) / 40 };
    return { h: 0, after: f < 340 ? (f - 272) / 68 : -1 };
  },
  // the centre line of the wyrm at s px up its body (0 at the sand) when it stands h tall at frame f
  spine(s, h, f) {
    const k = h ? s / h : 0;
    return { x: this.WX + Math.sin(s / 11 + f / 15) * 3.5 * k - 12 * k * k, y: this.duneNear(this.WX) + 3 - s, r: 9.5 - 2 * k + (s % 6 < 2 ? 0.6 : 0) };
  },
  // the tanks on the ridge: house, middle, ground, facing; when each fires at the wyrm
  tanks: [['aquila', 18, 0], ['drakon', 44, 1], ['serpens', 70, 2]],
  shots(i) { return [154 + i * 13, 188 + i * 11]; },

  // ---- the parts that don't move
  sky(b) {
    const W = IPW;
    IA.grad(b, 0, 0, W, 72, ['#140828', '#24103C', '#3C1650', '#601E54', '#8C2C50', '#B84648', '#D8683C', '#EC8C40', '#F8B05C']);
    Pix.stars(b, 26, 61, 0, 26, W);
    // the ringed giant, lit from the suns on the right, its ring tilted, the near half of the ring in front
    const cx = 46, cy = 34, R = 21, th = -0.32, cs = Math.cos(th), sn = Math.sin(th);
    const body = ['#E0ECE0', '#B0D0C8', '#80A8A8', '#54787C', '#304858', '#1C2C40'], ring = ['#F8E8C8', '#D8C0A0', '#A89078', '#786050'];
    IA.paint(b, cx - 40, cy - 22, 81, 45, (x, y) => {
      const dx = x + 0.5 - cx, dy = y + 0.5 - cy, d = (dx * dx + dy * dy) / (R * R);
      const u = dx * cs + dy * sn, v = -dx * sn + dy * cs, e = Math.hypot(u / 1, v / 0.24);
      const inRing = e > 27 && e < 38 && !(e > 31 && e < 32.2), near = v > 0;
      if (inRing && (near || d > 1)) {
        if (!near && d < 1.25 && bayer(x, y) < 0.5) return body[5];   // the giant's shadow on the far ring
        const k = e < 29 ? 3 : e < 31 ? 1 : e < 35 ? 0 : 2;
        return ring[Math.min(3, k + (near ? 0 : 1))];
      }
      if (d > 1) return null;
      const nx = dx / R, ny = dy / R;
      let l = nx * 0.55 - ny * 0.35 + Math.sqrt(1 - d) * 0.6 + (bayer(x, y) - 0.5) * 0.22 + 0.13 * Math.sin(v * 0.75 + 1) + 0.06 * Math.sin(v * 2.1);
      if (v < 0 && v > -6 && Math.abs(u) < 34 && e < 30 && bayer(x, y) < 0.55) l -= 0.5;   // the ring's shadow across it
      return body[l > 0.95 ? 0 : l > 0.6 ? 1 : l > 0.25 ? 2 : l > -0.1 ? 3 : l > -0.45 ? 4 : 5];
    });
    // a small moon
    IA.ball(b, 226, 9, 3, 3, ['#F8F0E0', '#D8C8C0', '#A89898', '#706068', '#403040']);
    // the twin suns, their glow
    for (const [x, y, r, g, cols] of [[112, 15, 8, 17, ['#FFFFF0', '#F8F0B8', '#F8D888', '#F8B868']], [135, 27, 4, 10, ['#FFF0D0', '#F8C878', '#F8A050', '#F08840']]]) {
      IA.paint(b, x - g, y - g, g * 2 + 1, g * 2 + 1, (i, j) => { const d = Math.hypot(i - x, j - y); return d > g || d <= r ? null : bayer(i, j) < 0.55 * (1 - (d - r) / (g - r)) ** 1.4 ? cols[3] : null; });
      IA.paint(b, x - r - 3, y - r - 3, r * 2 + 7, r * 2 + 7, (i, j) => { const d = Math.hypot(i - x, j - y); return d > r + 2 ? null : d > r ? (bayer(i, j) < 0.5 ? cols[2] : null) : d > r - 1.5 ? cols[1] : cols[0]; });
    }
    // far mesas, then nearer buttes, all in the haze
    IA.ridge(b, 64, 11, 31, ['#A0505C', '#7C3C50', '#5C2C44'], { jag: 0.7, f: 1.3, bottom: 76 });
    IA.ridge(b, 70, 7, 47, ['#B8644C', '#904838', '#6C342C'], { jag: 0.5, f: 2.1, bottom: 78 });
  },
  plateau(b) {
    // the rock plateau: its top lit by the suns, the cliff in strata, cracks, the left face in shade
    IA.paint(b, 128, 46, IPW - 128, 40, (x, y) => {
      const top = this.plateauTop(x), left = this.plateauLeft(y);
      if (y < top || x < left) return null;
      const n = IA.hash(x >> 1, y >> 1, 21);
      if (y - top < 2) return n < 0.3 ? '#E8B080' : '#D89C6C';
      if (x - left < 2.5) return y & 1 ? '#5C3024' : '#4C2820';
      const band = Math.floor((y - top) / 5 + IA.noise(x / 9, 4) * 0.8), crack = IA.hash(x >> 1, band, 23) < 0.08;
      if (crack) return '#4C2820';
      if ((y - top) % 5 === 0 && n < 0.7) return '#7C4430';
      return band & 1 ? (n < 0.2 ? '#A8603C' : '#9C5838') : (n < 0.2 ? '#B87048' : '#AC6840');
    });
    // concrete slabs on top; the base sits on them
    for (let x = 164; x < 240; x += 8) { Pix.rect(b, x, 49, 7, 2, '#B8B0A0'); Pix.rect(b, x, 49, 7, 1, '#D8D0C0'); }
    const G = 49, P = this.pal('aquila');
    const box = (x, y, w, h, cols) => { Pix.rect(b, x, y, w, h, cols[1]); Pix.rect(b, x, y, w, 1, cols[0]); Pix.rect(b, x + w - 2, y + 1, 2, h - 1, cols[0]); Pix.rect(b, x, y + 1, 1, h - 1, cols[2]); };
    const metal = ['#E0D8C8', '#B0A890', '#787060'];
    // the construction yard: a squat hall, a crane, the House's stripe
    box(166, G - 14, 26, 14, metal); Pix.rect(b, 166, G - 7, 26, 2, P[2]); Pix.rect(b, 166, G - 7, 26, 1, P[1]);
    for (let x = 170; x < 188; x += 6) Pix.rect(b, x, G - 12, 3, 3, '#3C3830');
    Pix.rect(b, 172, G - 4, 8, 4, '#2C2820'); Pix.rect(b, 172, G - 4, 8, 1, '#5C5448');
    Pix.rect(b, 186, G - 26, 2, 12, '#C89838'); Pix.line(b, 187, G - 26, 168, G - 22, '#C89838'); Pix.line(b, 187, G - 25, 170, G - 21, '#806020');
    Pix.rect(b, 169, G - 21, 1, 5, '#3C3830'); Pix.rect(b, 168, G - 17, 3, 2, '#787060');
    // the vapor trap: a tall drum, its cooling fins, the rotor housing on top (the rotor turns: see below)
    box(196, G - 22, 12, 22, ['#D8E0E0', '#A0B0B4', '#6C7C84']);
    for (let y = G - 19; y < G - 2; y += 3) Pix.rect(b, 197, y, 10, 1, '#8090A0');
    Pix.rect(b, 194, G - 25, 16, 3, '#787060'); Pix.rect(b, 194, G - 25, 16, 1, '#B0A890');
    Pix.rect(b, 192, G - 8, 4, 8, '#A0B0B4'); Pix.rect(b, 208, G - 8, 4, 8, '#A0B0B4'); Pix.rect(b, 192, G - 8, 4, 1, '#D8E0E0'); Pix.rect(b, 208, G - 8, 4, 1, '#D8E0E0');
    Pix.rect(b, 199, G - 14, 6, 2, P[1]);
    // the refinery: a long hall, a dome, a tall silo, pipes
    box(212, G - 10, 28, 10, metal); Pix.rect(b, 212, G - 5, 28, 1, P[1]);
    IA.ball(b, 224, G - 10, 7, 6, ['#F0E8D8', '#C8C0A8', '#A09880', '#787060', '#504838']);
    Pix.rect(b, 216, G - 10, 16, 1, '#787060');
    box(233, G - 26, 7, 16, metal); Pix.rect(b, 233, G - 27, 7, 1, '#E0D8C8');
    Pix.rect(b, 214, G - 3, 5, 3, '#2C2820');
    Pix.line(b, 231, G - 18, 233, G - 18, '#787060'); Pix.line(b, 218, G - 14, 218, G - 10, '#787060');
    // the radar mast on the yard (the dish turns: see below); the banner's pole
    Pix.rect(b, 179, G - 22, 1, 8, '#5C5448');
    Pix.rect(b, 162, G - 30, 1, 30, '#C8C0B0'); Pix.rect(b, 161, G - 31, 3, 1, '#F8D838');
  },
  dunes(b, near) {
    // the dunes: a crest line each, the faces turned to the suns lit, the others in shade; the near row alone (it
    // goes in front of the wyrm's hole)
    const fill = (x, y) => {
      const rows = near ? [[this.duneNear.bind(this), this.nearShape.bind(this), 0]] : [[this.duneNear.bind(this), this.nearShape.bind(this), 0], [this.duneFar.bind(this), this.farShape.bind(this), 1]];
      for (const [crest, shape, far] of rows) {
        const cy = crest(x);
        if (y < cy) continue;
        // which way the face turns: the slope of the smooth crest; the shade deepens towards the foot
        const d = y - cy, sx = x - d * (far ? 1.1 : 0.9), slope = shape(sx + 2) - shape(sx - 2), k = Math.max(-1, Math.min(1, slope * 1.2)) + (d > 7 ? -0.25 : 0) - (bayer(x, y) - 0.5) * 0.35;
        const n = IA.hash(x, y, 17);
        if (far) {
          if (d < 1) return '#F0C8A0';
          return k > 0.35 ? '#E8B488' : k > -0.1 ? '#D8A07C' : k > -0.5 ? '#C88C70' : '#B87864';
        }
        if (d < 1) return '#F8E0B0';
        if (k > 0.45) return n < 0.04 ? '#E0A868' : '#F4C888';
        if (k > 0) return '#E8B070';
        if (k > -0.45) return '#D49858';
        return d < 2 ? '#A86438' : '#BC7844';
      }
      return null;
    };
    IA.paint(b, 0, 60, IPW, 46, (x, y) => fill(x, y));
  },
  ridge(b) {
    // the rock ridge on the left, where the tanks stand
    IA.paint(b, 0, 70, 116, 34, (x, y) => {
      const top = this.ridgeTop(x);
      if (y < top || top > 102) return null;
      const n = IA.hash(x >> 1, y >> 1, 29), slope = this.ridgeTop(x + 1) - this.ridgeTop(x - 1);
      if (y - top < 1.5) return slope > 0.3 ? '#A86440' : '#D8986C';
      if (y - top < 3) return '#B8784C';
      const band = Math.floor((y - top + IA.noise(x / 5, 2) * 3) / 4);
      if (IA.hash(x >> 1, band, 31) < 0.07) return '#3C2018';
      return band & 1 ? (n < 0.25 ? '#8C4C30' : '#7C4028') : (n < 0.25 ? '#9C5838' : '#8C4C30');
    });
    // a few boulders
    for (const [x, y, r] of [[6, 84, 3], [92, 92, 3], [104, 100, 2], [33, 83, 2]]) { Pix.disc(b, x, y, r, '#4C2820'); Pix.disc(b, x + 1, y - 1, r - 1, '#B07048'); }
  },
  ground(b) {
    // the foreground: rippled sand and the glimmer field, the strip the harvester has already gathered, rocks
    const { HX, HY } = this;
    IA.paint(b, 0, 92, IPW, IPH - 92, (x, y) => {
      if (y < this.fgTop(x)) return null;
      const dTop = y - this.fgTop(x);
      // the field: noise inside a broad oval round the harvester, thick in its heart
      const e = Math.hypot((x - 118) / 104, (y - 121) / 22), g = IA.noise2(x / 9, y / 4, 41) * 0.75 + IA.noise2(x / 3, y / 2, 43) * 0.25 + 0.42 - e * 0.5;
      const gathered = x > HX + 18 && x < 232 && Math.abs(y - (HY - 1)) < 5;
      if (gathered) {
        if ((y === HY - 4 || y === HY + 2) && (x >> 1) % 2 === 0) return '#A86838';   // tread marks
        return bayer(x, y) < 0.3 ? '#C88850' : '#D49858';
      }
      if (g > 0.68 && e < 1.1) return IA.hash(x, y, 47) < 0.1 ? '#F8D860' : bayer(x, y) < 0.5 ? '#E86820' : '#F07C28';   // thick
      if (g > 0.57 && e < 1.15) return IA.hash(x, y, 49) < 0.07 ? '#F8C050' : IA.hash(x, y, 50) < 0.12 ? '#E0A060' : bayer(x, y) < 0.5 ? '#F08C38' : '#EC9844';  // light
      if (g > 0.51 && e < 1.2) return bayer(x, y) < (g - 0.51) * 10 ? '#F0A050' : '#E8A868';   // its glow on the sand
      if (dTop < 1) return '#F8D8A8';
      const rip = Math.sin(x * 0.42 + y * 1.3 + IA.noise(y / 3, 51) * 6);
      if (rip > 0.93) return '#C08048';
      if (rip > 0.75) return '#F0C080';
      return IA.hash(x, y, 53) < 0.04 ? '#C88850' : bayer(x, y) < 0.35 ? '#E8B070' : '#E0A868';
    });
    for (const [x, y, r] of [[12, 128, 4], [226, 112, 3], [234, 130, 5], [40, 104, 2], [200, 104, 2]]) { Pix.disc(b, x, y, r, '#5C3424'); Pix.disc(b, x - 1, y - 1, r - 1, '#9C6040'); Pix.rect(b, x - 2, y - r + 1, 2, 1, '#C88C60'); }
  },

  // ---- the machines (each frame drawn once and kept)
  imgs: new Map(),
  img(key, w, h, draw) {
    let im = this.imgs.get(key);
    if (!im) { im = makeCanvas(w, h); const x = im.getContext('2d'); x.imageSmoothingEnabled = false; draw(x); this.imgs.set(key, im); }
    return im;
  },
  // the harvester seen from the side, front to the left: tracks, cab, ribbed hopper, the scoop's drum turning (f 0-2)
  harvester(f) {
    const P = this.pal('aquila');
    return this.img('harv' + f + P.join(), 54, 30, x => {
      const R = (a, b2, w, h, col) => { x.fillStyle = col; x.fillRect(a, b2, w, h); };
      // tracks and wheels
      R(6, 21, 44, 8, '#2C2820'); R(5, 22, 1, 6, '#2C2820'); R(50, 22, 1, 6, '#2C2820');
      for (let k = 6; k < 50; k++) if ((k + f) % 3 === 0) { R(k, 21, 1, 1, '#6C645C'); R(k, 28, 1, 1, '#5C544C'); }
      for (const wx of [10, 18, 26, 34, 42, 47]) { Pix.disc(x, wx, 25, 2, '#4C4840'); R(wx, 25, 1, 1, '#9C948C'); }
      // the hopper: ribbed, the stripe, a hatch
      R(18, 6, 32, 15, '#A89878'); R(18, 6, 32, 1, '#E0D0B0'); R(49, 7, 1, 14, '#706048'); R(18, 20, 32, 1, '#605038');
      for (let k = 21; k < 48; k += 5) { R(k, 8, 1, 11, '#C8B898'); R(k + 1, 8, 1, 11, '#807050'); }
      R(18, 15, 32, 2, P[2]); R(18, 15, 32, 1, P[1]);
      R(24, 4, 18, 2, '#807050'); R(24, 4, 18, 1, '#C8B898');   // the hopper's mouth, glowing glimmer heaped in it
      R(26, 3, 14, 1, '#F87818'); R(28, 2, 9, 1, '#F8B030');
      // the cab
      R(6, 9, 13, 12, '#B8A888'); R(6, 9, 13, 1, '#E8D8B8'); R(6, 10, 1, 10, '#E8D8B8'); R(18, 10, 1, 11, '#706048');
      R(8, 11, 7, 4, '#2C4C6C'); R(8, 11, 3, 1, '#A8D8F8'); R(9, 12, 1, 1, '#58A8D8');
      R(7, 17, 11, 1, P[1]);
      R(10, 6, 5, 3, '#706048'); R(10, 6, 5, 1, '#A89878');   // the cab's roof, a beacon (lit in the scene)
      // the exhaust stack
      R(44, 0, 3, 6, '#5C5448'); R(44, 0, 3, 1, '#2C2820');
      // the scoop: an arm down to a drum with blades, turning
      R(2, 19, 6, 3, '#807050'); R(1, 20, 2, 6, '#605038');
      Pix.disc(x, 4, 25, 3, '#3C3830');
      for (let k = 0; k < 3; k++) { const a = (f * 40 + k * 120) * Math.PI / 180; R(4 + Math.round(Math.cos(a) * 3), 25 + Math.round(Math.sin(a) * 3), 1, 1, '#C8C0B0'); }
      R(4, 25, 1, 1, '#E0D8C8');
    });
  },
  // a House's tank on the ridge, seen from the side facing right (far off, so small): tracks, a hull in the House's
  // colours, a turret, the gun (pulled back r px when it fires); 22x11
  tank(house, r) {
    const P = this.pal(house);
    return this.img('tank' + house + r + P.join(), 22, 11, x => {
      const R = (a, b2, w, h, col) => { x.fillStyle = col; x.fillRect(a, b2, w, h); };
      R(2, 7, 14, 4, '#2C2820'); R(1, 8, 1, 2, '#2C2820'); R(16, 8, 1, 2, '#2C2820');
      for (const wx of [3, 6, 9, 12, 15]) R(wx, 8, 1, 1, '#7C746C');
      R(2, 4, 14, 3, P[2]); R(2, 4, 13, 1, P[1]); R(15, 5, 2, 2, P[2]); R(16, 5, 1, 1, P[1]); R(2, 6, 14, 1, P[3]);
      R(5, 1, 7, 3, P[2]); R(6, 1, 5, 1, P[1]); R(5, 2, 1, 2, P[1]); R(11, 2, 1, 2, P[3]);
      R(7, 0, 2, 1, '#5C5C5C');
      R(12 - r, 2, 9, 1, '#C8C8C8'); R(12 - r, 3, 9, 1, '#5C5C5C'); R(20 - r, 1, 2, 3, '#4C4C4C');
    });
  },
  // the skylifter seen from the side, flying right: fuselage, cockpit, twin engines with their jets (f 0-1),
  // the clamp under it
  skylifter(f) {
    const P = this.pal('aquila');
    return this.img('lift' + f + P.join(), 40, 18, x => {
      const R = (a, b2, w, h, col) => { x.fillStyle = col; x.fillRect(a, b2, w, h); };
      R(6, 5, 26, 6, '#B8B8C4'); R(6, 5, 26, 1, '#E8E8F0'); R(6, 10, 26, 1, '#6C6C7C');
      R(32, 6, 4, 4, '#B8B8C4'); R(36, 7, 2, 2, '#9C9CAC'); R(32, 6, 4, 1, '#E8E8F0');
      R(30, 6, 5, 2, '#58A8D8'); R(31, 6, 2, 1, '#C8F0F8');
      R(2, 3, 6, 3, '#9C9CAC'); R(2, 3, 6, 1, '#D8D8E0'); R(1, 1, 3, 3, '#7C7C8C');   // the tail fin
      R(8, 7, 22, 1, P[1]); R(8, 8, 22, 1, P[2]);
      // the engines on stubby wings
      for (const ex of [11, 22]) {
        R(ex, 10, 8, 3, '#8C8C9C'); R(ex, 10, 8, 1, '#C8C8D4'); R(ex, 12, 8, 1, '#4C4C5C');
        R(ex - 1, 13, 2, 1 + f, '#F8D838'); R(ex - 1, 13, 1, 2 + f, '#F87818'); R(ex + 7, 13, 1, 1 + f, '#F8D838');
      }
      // the clamp
      R(17, 11, 1, 4, '#5C5C6C'); R(14, 15, 7, 1, '#5C5C6C'); R(14, 15, 1, 2, '#5C5C6C'); R(20, 15, 1, 2, '#5C5C6C');
    });
  },
  // the wyrm: a ringed body from the sand up to its open mouth (h tall), sand pouring off it
  drawWyrm(c, h, f, gape) {
    const top = Math.round(h);
    for (let s = 0; s <= top; s++) {
      const p = this.spine(s, h, f), y = Math.round(p.y), r = p.r, ring = (s + Math.round(f / 6)) % 6 === 0;
      for (let dx = -Math.ceil(r); dx <= Math.ceil(r); dx++) {
        const n = dx / r;
        if (Math.abs(n) > 1) continue;
        let col = n > 0.45 ? '#E8C898' : n > -0.15 ? '#C49C6C' : n > -0.6 ? '#94704C' : n > -0.88 ? '#5C4430' : '#3C2C20';
        if (ring) col = n > 0.45 ? '#B8946C' : n > -0.15 ? '#8C6C48' : '#5C4430';
        else if ((s + dx * 3) % 11 === 0 && Math.abs(n) < 0.8) col = '#7C5C3C';   // bristles
        Pix.rect(c, Math.round(p.x + dx), y, 1, 1, col);
      }
    }
    if (h < 6) return;
    // the head: a wide maw opening up and to the left, rings of teeth inside, its throat glowing
    const H = this.spine(top, h, f), hx = Math.round(H.x), hy = Math.round(H.y), rx = 11, ry = Math.max(2, Math.round(3 + 4 * gape));
    IA.paint(c, hx - rx - 1, hy - ry - 2, rx * 2 + 3, ry * 2 + 4, (x, y) => {
      const u = (x + 0.5 - hx) / rx, v = (y + 0.5 - hy) / ry, d = u * u + v * v;
      if (d > 1) return null;
      if (d > 0.72) return v < 0 ? '#F0D0A0' : '#C49C6C';   // the lip
      if (d > 0.5) return Math.floor(Math.atan2(v, u) * 5) & 1 ? '#F8F0D8' : '#8C1C0C';   // teeth all round
      if (d > 0.3) return Math.floor(Math.atan2(v, u) * 4 + 1) & 1 ? '#E8D8B8' : '#5C0C04';
      return d < 0.12 && gape > 0.5 ? (bayer(x, y) < 0.5 ? '#F87818' : '#A82800') : '#2C0400';
    });
    return { x: hx, y: hy };
  },

  // ---- one frame
  draw(c, t) {
    const W = IPW, f = ((t % this.P) + this.P) % this.P, A = this;
    // the sky, the land far off, shimmering in the heat over the horizon
    const sky = IA.layer('rts-sky', b => A.sky(b));
    c.drawImage(sky, 0, 0, W, 54, 0, 0, W, 54);
    for (let y = 54; y < 80; y++) {
      const off = Math.round(Math.sin(y * 0.9 + f * Math.PI * 2 / 40) * (y > 62 && y < 74 ? 1 : 0.6));
      c.drawImage(sky, 0, y, W, 1, off, y, W, 1);
      if (off > 0) c.drawImage(sky, 0, y, 1, 1, 0, y, 1, 1);
      else if (off < 0) c.drawImage(sky, W - 1, y, 1, 1, W - 1, y, 1, 1);
    }
    c.drawImage(sky, 0, 80, W, IPH - 80, 0, 80, W, IPH - 80);
    // the base on its plateau, and what moves there: the vapor trap's rotor, the radar dish, lights, the banner
    c.drawImage(IA.layer('rts-plateau', b => A.plateau(b)), 0, 0);
    const G = 49, P = this.pal('aquila'), rot = f * Math.PI * 2 * 24 / this.P;
    for (let k = 0; k < 3; k++) {
      const a = rot + k * Math.PI * 2 / 3, x = Math.round(202 + Math.cos(a) * 7), y = G - 27 + Math.round(Math.sin(a) * 1.5);
      Pix.line(c, 202, G - 27, x, y, Math.sin(a) > 0 ? '#E8F0F0' : '#8090A0');
    }
    Pix.rect(c, 201, G - 28, 2, 2, '#5C5448');
    if ((f % 40) < 10) for (let k = 0; k < 3; k++) { const q = (f % 40) / 10; Pix.rect(c, 203 + k * 3 + q * 4, G - 30 - q * 5 - k, 1, 1, '#F8F8F8'); }   // a breath of vapor
    const da = f * Math.PI * 2 * 4 / this.P, dw = Math.round(Math.cos(da) * 4);
    Pix.rect(c, 179 - Math.abs(dw), G - 25, Math.abs(dw) * 2 + 1, 2, dw > 0 ? '#E0D8C8' : '#A09880'); Pix.rect(c, 179, G - 26, 1, 1, '#F8F8F8');
    if ((f % 60) < 30) Pix.rect(c, 236, G - 28, 1, 1, '#F83800');
    if (((f + 20) % 60) < 30) Pix.rect(c, 213, G - 11, 1, 1, '#58F858');
    for (let i = 0; i < 12; i++) {   // the eagle banner flapping
      const dy = Math.round(Math.sin(f * Math.PI * 2 * 6 / this.P - i * 0.6) * (0.5 + i * 0.12));
      for (let j = 0; j < 7; j++) Pix.rect(c, 163 + i, G - 29 + j + dy, 1, 1, j === 0 || j === 6 ? P[2] : (i >= 4 && i <= 7 && j >= 2 && j <= 4) ? '#F8F8F8' : P[1]);
    }
    // the dunes, and the wyrm in among them
    c.drawImage(IA.layer('rts-dunes', b => A.dunes(b, false)), 0, 0);
    const Wy = this.wyrm(f), base = this.duneNear(this.WX) + 3;
    let head = null;
    if (Wy.h > 0) {
      const gape = Wy.up !== undefined ? 0.6 + 0.4 * Math.sin(Wy.up * Math.PI * 3) : Wy.rise !== undefined ? Wy.rise : 1 - (Wy.dive || 0);
      head = this.drawWyrm(c, Wy.h, f, Math.max(0, gape));
      // sand pouring off it
      for (let k = 0; k < 10; k++) {
        const q = ((f + k * 11) % 24) / 24, s = Wy.h * (0.4 + 0.6 * IA.hash(k, 3)), p = this.spine(s, Wy.h, f), side = k & 1 ? 1 : -1;
        Pix.rect(c, p.x + side * (p.r + q * 3), p.y + q * q * (base - p.y), 1, 2, k % 3 ? '#F0C080' : '#C88850');
      }
    }
    if (Wy.rise !== undefined || (Wy.after >= 0 && Wy.after < 0.5) || (Wy.dive !== undefined && Wy.dive > 0.5)) {   // the sand bursting
      const q = Wy.rise !== undefined ? Wy.rise : Wy.dive !== undefined ? (Wy.dive - 0.5) * 2 : 1 + Wy.after * 2, n = Math.floor(q * 40);
      if (q < 1) IA.debris(c, this.WX, base, q, 14, ['#F0C080', '#C88850', '#F8E0B0'], 5, 1.3);
      const fade = q > 1 ? 1 - (q - 1) : 1;
      for (let k = 0; k < 6; k++) IA.puff(c, this.WX - 14 + k * 5.5, base - 2 - (n % 7) * (k & 1) * 0.5 - q * 5 * IA.hash(k, 2), (2 + q * 2 + (k % 3)) * fade, 3);
    }
    c.drawImage(IA.layer('rts-dunes-near', b => A.dunes(b, true)), 0, 0, W, IPH, 0, 0, W, IPH);
    if (Wy.sign >= 0) {   // wormsign: a mound running through the sand towards the hole, a wake of ripples behind it
      const mx = Math.round(236 - (236 - this.WX) * this.smooth(Wy.sign)), my = Math.round(this.duneNear(mx) + 5);
      for (let k = 1; k < 8; k++) {
        const wx = mx + 3 + k * 5 + ((f >> 1) % 5), spread = 2 + k * 1.6;
        for (const side of [-1, 1]) { Pix.rect(c, wx, my + side * spread * 0.45, 3, 1, '#B87040'); Pix.rect(c, wx, my + side * spread * 0.45 - 1, 3, 1, '#F8E0B0'); }
      }
      IA.paint(c, mx - 8, my - 4, 17, 8, (x, y) => {
        const u = (x + 0.5 - mx) / 8, v = (y + 0.5 - my) / 3, d = u * u + v * v;
        return d > 1 ? null : v < -0.4 ? '#F8E0B0' : v < 0.3 ? '#F0C080' : '#B87040';
      });
      for (let k = 0; k < 3; k++) { const q = ((f + k * 6) % 18) / 18; IA.veil(c, mx - 2 + q * 8, my - 4 - q * 6, 3 + q * 4, 2 + q * 2, '#F8E0B0', 0.7 * (1 - q)); }
    }
    // spindrift off the near crests
    for (const cx of [38, 108, 196, 228]) {
      const cy = this.duneNear(cx);
      for (let k = 0; k < 4; k++) { const q = ((f * 3 + k * 8) % 32) / 32; Pix.rect(c, cx + q * 18, cy - 1 - q * 3 + k * 0.5, 1, 1, q < 0.5 ? '#F8E0B0' : '#E8C090'); }
    }
    // the ridge and the Houses' tanks on it, firing at the wyrm while it's up
    c.drawImage(IA.layer('rts-ridge', b => A.ridge(b)), 0, 0);
    this.tanks.forEach(([house, x], i) => {
      const gy = Math.round(this.ridgeTop(x)) + 1, fires = this.shots(i), since = Math.min(...fires.map(s => (f - s >= 0 ? f - s : 999)));
      const rc = since < 6 ? [3, 2, 1, 1, 0, 0][since] : 0, img = this.tank(house, rc);
      c.drawImage(img, x - 10, gy - 11);
      const m = { x: x + 12 - rc, y: gy - 9 };
      if (since < 4) IA.flash(c, m.x, m.y, 1, 0, since + 1);
      for (const s of fires) {
        const q = (f - s) / 14;
        if (q < 0 || q > 1.6) continue;
        const tg = this.spine(Math.max(8, (Wy.h || 0) * (0.45 + i * 0.12)), Wy.h || 1, f);
        if (q <= 1) {
          const sx = m.x + (tg.x - tg.r - m.x) * q, sy = m.y + (tg.y - m.y) * q - Math.sin(q * Math.PI) * 8;
          IA.shell(c, sx, sy, 1, 0, '#F8F8F8');
        } else if (Wy.h > 8) IA.sparks(c, tg.x - tg.r + 2, tg.y, (q - 1) / 0.6, 9, s + i);
      }
    });
    // the glimmer field and the harvester working it
    c.drawImage(IA.layer('rts-ground', b => A.ground(b)), 0, 0);
    for (let k = 0; k < 46; k++) {   // glimmer glinting
      const x = Math.floor(30 + IA.hash(k, 61) * 180), y = Math.floor(104 + IA.hash(k, 63) * 30), ph = Math.floor(IA.hash(k, 65) * 48), q = (f + ph) % 48;
      if (Math.hypot((x - 118) / 104, (y - 121) / 22) > 1 || q > 7) continue;
      Pix.rect(c, x, y, 1, 1, q < 3 ? '#FFFFE0' : '#F8D850');
      if (q < 2) { Pix.rect(c, x - 1, y, 3, 1, '#F8E890'); Pix.rect(c, x, y - 1, 1, 3, '#F8E890'); }
    }
    const { HX, HY } = this, hv = this.harvester((f >> 2) % 3), bob = (f >> 3) & 1 ? 0 : 1;
    // dust and its own exhaust behind it; glimmer sprayed up from the scoop into the hopper
    for (let k = 0; k < 4; k++) { const q = ((f + k * 8) % 32) / 32; IA.veil(c, HX + 24 + q * 26 - q * 4, HY - 4 - q * 12, 3 + q * 8, 2 + q * 5, k & 1 ? '#F8E0B0' : '#E8C090', 0.6 * (1 - q)); }
    c.drawImage(hv, HX - 27, HY - 29 + bob);
    for (let k = 0; k < 9; k++) {
      const q = ((f + k * 5) % 22) / 22, sx = HX - 23 + q * 20 + k % 3, sy = HY - 5 - Math.sin(q * Math.PI) * 16 - q * 8;
      Pix.rect(c, sx, sy + bob, 1, 1, k % 3 === 0 ? '#F8D850' : '#F87818');
    }
    if ((f % 32) < 16) Pix.rect(c, HX - 15, HY - 24 + bob, 3, 1, '#F87818'); else Pix.rect(c, HX - 14, HY - 24 + bob, 1, 1, '#F8B030');
    IA.smoke(c, HX + 18, HY - 30 + bob, f, { n: 4, h: 14, size: 2, wind: 10, tone: 0, life: 96 });
    // the skylifter swooping in over the harvester and away, its shadow on the sand
    const L = (f - 280) / 200;
    if (L >= 0 && L <= 1) {
      const lx = -40 + (W + 50) * L, ly = 22 + 44 * Math.sin(L * Math.PI) ** 2 - 6 * Math.sin(L * Math.PI * 2), img = this.skylifter((f >> 1) & 1);
      const sh = this.clamp(1 - (HY - 6 - ly) / 110);
      IA.veil(c, lx + 8 - sh * 4, HY + 4, 22 + sh * 8, 3, '#7C4020', 0.25 + sh * 0.35);
      c.drawImage(img, Math.round(lx), Math.round(ly));
      for (let k = 0; k < 3; k++) { const q = ((f + k * 4) % 12) / 12; Pix.rect(c, lx + 9 - q * 10, ly + 14 + q * 4, 1, 1, '#F8D8A0'); Pix.rect(c, lx + 20 - q * 10, ly + 14 + q * 4, 1, 1, '#F8D8A0'); }
    }
    // dust on the wind
    for (let k = 0; k < 22; k++) {
      const n = 1 + (k % 3), x = ((IA.hash(k, 71) * (W + 40) + (W + 40) * n * f / this.P) % (W + 40)) - 20, y = 40 + IA.hash(k, 73) * 92 + Math.sin(f * Math.PI * 2 * 2 / this.P + k) * 3;
      Pix.rect(c, x, y, n, 1, k & 1 ? '#F8E0B0' : '#E8C090');
    }
    for (let k = 0; k < 3; k++) {   // a few big wisps low down
      const x = ((IA.hash(k, 75) * (W + 80) + (W + 80) * f / this.P) % (W + 80)) - 40, y = 100 + k * 11;
      IA.veil(c, x, y, 34, 2, '#F8E0B0', 0.3);
    }
    return head;
  },
};

INTRO_SCENES.rts = function (c, t) { RtsTitleArt.draw(c, t); };
