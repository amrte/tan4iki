'use strict';
// =====================================================================
//  COUNTER-STRIKE's title picture (intro.js shows it; the helpers are introart.js's): DE_DUST2 at noon. A sandstone
//  wall with the long doors and a big red A sprayed on it, crates, the town's roofs and domes beyond. A terrorist
//  tank drives out of the doors and plants the bomb by the A; a counter-terrorist comes in from the right behind a
//  smoke grenade and defuses it, or (every other time) is shot and the bomb goes off. The score and the bomb's clock
//  at the top; the round's winner in the corner.
// =====================================================================

INTRO_SCENES.cs = function (c, t) {
  const W = IPW, GY = 122, P = 600, cyc = t % P, boom = Math.floor(t / P) & 1, TP = PALS.csT, CTP = PALS.csCT;
  c.drawImage(IA.layer('cs', b => {
    // a hazy hot sky and the sun
    IA.grad(b, 0, 0, W, 66, ['#58A0E0', '#78B8EC', '#A0CCF0', '#C8DCE8', '#E8DCC0']);
    Pix.disc(b, 38, 17, 11, '#F8F0C8'); Pix.disc(b, 38, 17, 9, '#FFFCE8');
    // the town beyond: flat roofs, domes, a minaret
    const R = seeded(77);
    for (let x = -4; x < W; x += 10 + Math.floor(R() * 14)) {
      const w = 12 + Math.floor(R() * 16), h = 8 + Math.floor(R() * 12);
      Pix.rect(b, x, 62 - h, w, h + 4, '#D8C4A0'); Pix.rect(b, x + w - 3, 62 - h, 3, h + 4, '#BCA47C'); Pix.rect(b, x, 62 - h, w, 1, '#ECDCBC');
      if (R() < 0.4) Pix.rect(b, x + 3, 62 - h + 4, 2, 3, '#7C6848');
      if (R() < 0.25) { Pix.disc(b, x + (w >> 1), 62 - h, 5, '#D0BC98'); Pix.rect(b, x + (w >> 1) - 5, 62 - h, 11, 1, '#BCA47C'); Pix.rect(b, x + (w >> 1), 62 - h - 7, 1, 2, '#BCA47C'); }
    }
    Pix.rect(b, 196, 22, 6, 40, '#D0BC98'); Pix.rect(b, 200, 22, 2, 40, '#B49C74'); Pix.rect(b, 194, 30, 10, 2, '#BCA47C'); Pix.disc(b, 199, 21, 3, '#D0BC98'); Pix.rect(b, 199, 15, 1, 4, '#B49C74');
    // the wall: sandstone blocks, a parapet, its foot in shadow
    IA.paint(b, 0, 58, W, 40, (x, y) => {
      const row = Math.floor((y - 58) / 6), off = row & 1 ? 7 : 0, bx = Math.floor((x + off) / 14), h = IA.hash(bx, row, 5);
      if ((y - 58) % 6 === 5 || (x + off) % 14 === 13) return '#A88454';
      return h < 0.2 ? '#CCA670' : h > 0.85 ? '#E8C894' : bayer(x, y) < 0.08 ? '#C49C64' : '#DCB880';
    });
    Pix.rect(b, 0, 56, W, 3, '#F0D8A8'); Pix.rect(b, 0, 59, W, 1, '#B89464');
    for (let x = 0; x < W; x += 12) Pix.rect(b, x, 53, 6, 3, '#E8CC98');
    // the long doors in an arch, one leaf open: the dark way through
    IA.paint(b, 14, 64, 44, 34, (x, y) => { const dx = (x - 36) / 22, dy = (y - 80) / 18; return dy < 0 && dx * dx + dy * dy > 1 ? null : '#2C2014'; });
    IA.paint(b, 12, 62, 48, 4, (x, y) => (Math.abs(x - 36) > 17 + (y - 62) * 1.5 ? null : '#C8A06C'));
    for (const [x0, w, k] of [[16, 18, 0], [44, 12, 1]]) {
      Pix.rect(b, x0, 70, w, 28, '#3C6C80'); Pix.rect(b, x0, 70, w, 1, '#6C9CB0');
      for (let x = x0 + 3; x < x0 + w; x += 4) Pix.rect(b, x, 71, 1, 27, '#2C5464');
      Pix.rect(b, x0 + 1, 76, w - 2, 1, '#1C2C34'); Pix.rect(b, x0 + 1, 90, w - 2, 1, '#1C2C34');
      Pix.rect(b, k ? x0 + 1 : x0 + w - 3, 82, 2, 2, '#C8B060');
    }
    // the bombsite's letter, sprayed in red with runs of paint
    Font.big(b, 'A', 148, 64, 3, '#B82C10');
    for (const [x, l] of [[150, 6], [158, 4], [163, 7]]) Pix.rect(b, x, 85, 1, l, '#A02810');
    // the ground: sand, the site's stone slabs, the shadow at the wall's foot
    IA.paint(b, 0, 98, W, 38, (x, y) => {
      const slab = x > 108 && x < 196 && ((x - 108) % 22 === 0 || (y - 98) % 9 === 8);
      if (y < 101) return bayer(x, y) < 0.7 ? '#8C6C40' : '#A48054';
      if (slab) return '#A88C64';
      if (x > 108 && x < 196) return IA.hash(x >> 2, y >> 2, 3) < 0.15 ? '#BCA27A' : '#C8AE84';
      const n = IA.hash(x, y, 9);
      return n < 0.06 ? '#A88450' : n > 0.94 ? '#DCC090' : bayer(x, y) < 0.3 ? '#C09C64' : '#C8A46C';
    });
    // crates: a stack on the right, one by the doors
    const crate = (x, y, s) => {
      Pix.rect(b, x, y, s, s, '#5C3810'); Pix.rect(b, x + 1, y + 1, s - 2, s - 2, '#B87C34');
      for (let k = 4; k < s - 1; k += 4) Pix.rect(b, x + 1, y + k, s - 2, 1, '#8C5820');
      Pix.line(b, x + 1, y + 1, x + s - 2, y + s - 2, '#6C4418'); Pix.line(b, x + s - 2, y + 1, x + 1, y + s - 2, '#6C4418');
      Pix.rect(b, x + 1, y + 1, s - 2, 1, '#D8A458');
    };
    IA.veil(b, 200, 116, 40, 6, '#000000', 0.22);
    crate(204, 98, 18); crate(222, 98, 18); crate(213, 80, 18);
    IA.veil(b, 62, 120, 22, 4, '#000000', 0.22);
    crate(64, 104, 18);
  }), 0, 0);
  // drifting sand
  for (let k = 0; k < 14; k++) { const x = (k * 53 + t * (1.5 + (k & 3) * 0.4)) % (W + 20) - 10, y = 70 + (k * 37) % 60; Pix.rect(c, x, y, 3, 1, k & 1 ? '#E8D0A0' : '#D8B880'); }

  // the round: where the tanks are, the bomb, the smoke, who wins
  const ease = (a, b2, p) => a + (b2 - a) * Math.max(0, Math.min(1, p));
  const tx = cyc < 60 ? ease(30, 100, cyc / 60) : cyc < 200 ? 100 : ease(100, 84, (cyc - 200) / 40);
  const tMoving = cyc < 60 || (cyc >= 200 && cyc < 240), tBack = cyc >= 200;
  const ctx0 = cyc < 260 ? 260 : cyc < 330 ? ease(260, 160, (cyc - 260) / 70) : 160;
  const ctMoving = cyc >= 260 && cyc < 330, ctDead = boom && cyc >= 445, tDead = false;
  const planted = cyc >= 200, bombX = 126, endT = boom ? 520 : 480, over = cyc >= endT;
  const defusing = cyc >= 335 && (!boom ? cyc < 480 : cyc < 445);
  // the bomb on the ground, its light blinking faster and faster
  if (cyc >= 70 && !(boom && cyc >= 520)) {
    const lit = planted && !(over && !boom) && ((cyc - 200) % Math.max(6, 40 - Math.floor((cyc - 200) / 10)) < 4);
    Pix.rect(c, bombX - 6, GY - 7, 12, 7, '#101010'); Pix.rect(c, bombX - 5, GY - 6, 10, 5, '#B89C5C'); Pix.rect(c, bombX - 5, GY - 4, 10, 1, '#7C6834');
    Pix.rect(c, bombX - 3, GY - 6, 4, 3, '#3C3C3C'); Pix.rect(c, bombX - 2, GY - 5, 2, 1, '#78C878');
    Pix.rect(c, bombX + 2, GY - 6, 2, 2, lit ? '#F83800' : '#5C1000');
    if (lit) for (let r = 4; r < 9; r += 2) { Pix.rect(c, bombX + 3 - r, GY - 5, 1, 1, '#F8B8A8'); Pix.rect(c, bombX + 3 + r, GY - 5, 1, 1, '#F8B8A8'); }
  }
  // the terrorist: out of the doors, plants, backs off behind the crate's cover
  if (!tDead) {
    IA.sideTank(c, tx, GY, TP, { f: tMoving ? t >> 2 : 0, L: 34, flip: false, sway: tMoving ? Math.sin(t / 4) * 2 : 0, recoil: boom && cyc >= 430 && cyc < 434 ? 2 : 0 });
    if (cyc >= 70 && cyc < 200) { Pix.rect(c, tx - 13, GY - 40, 26, 4, '#101010'); Pix.rect(c, tx - 12, GY - 39, Math.round(24 * (cyc - 70) / 130), 2, '#F88838'); }
  }
  // the counter-terrorist: in from the right, a smoke grenade ahead of it, then on the bomb
  if (!ctDead) {
    IA.sideTank(c, ctx0, GY, CTP, { f: ctMoving ? t >> 2 : 0, L: 34, flip: true, sway: ctMoving ? Math.sin(t / 4) * 2 : 0 });
    if (defusing) { const p = (cyc - 335) / (boom ? 145 : 145); Pix.rect(c, ctx0 - 13, GY - 40, 26, 4, '#101010'); Pix.rect(c, ctx0 - 12, GY - 39, Math.round(24 * Math.min(1, p)), 2, '#58A8F8'); }
  }
  // the smoke between them, rolling and thinning
  if (cyc >= 280 && cyc < 560) {
    const age = cyc - 280, k = Math.min(1, age / 30, (280 - age) / 60);
    for (let j = 0; j < 7; j++) IA.puff(c, 96 + Math.sin(j * 1.7 + t / 40) * 12 + j * 3, GY - 12 - Math.cos(j * 2.3 + t / 50) * 6 - j, Math.round(10 * k * (0.6 + (j % 3) * 0.2)), j & 1 ? 0 : 1);
  }
  // the duel: the terrorist fires out of the smoke at the defuser
  if (boom && cyc >= 430 && cyc < 446) {
    const q = cyc - 430;
    if (q < 4) IA.flash(c, tx + 30, GY - 18, 1, 0, q);
    const sx = tx + 32 + q * 5;
    if (sx < ctx0 - 14) IA.shell(c, sx, GY - 18, 1, 0);
  }
  if (boom && cyc >= 445 && cyc < 485) { IA.boom(c, ctx0, GY - 12, cyc - 445, 16, 3); IA.debris(c, ctx0, GY - 12, (cyc - 445) / 40, 10, ['#3C3C3C', CTP[2], CTP[3]], 5); }
  // the bomb goes off
  if (boom && cyc >= 520) {
    const f = cyc - 520;
    if (f < 3) { c.fillStyle = 'rgba(255,250,230,' + (0.8 - f * 0.25) + ')'; c.fillRect(0, 0, W, IPH); }
    for (let k = 0; k < 5; k++) IA.boom(c, bombX + (k - 2) * 14, GY - 10 - (k & 1) * 10, f - k * 4, 22, k + 11);
    IA.debris(c, bombX, GY - 8, Math.min(1, f / 45), 18, ['#5C3810', '#B87C34', '#3C3C3C', '#DCB880'], 9, 1.6);
  }
  // the top: the score and the clock (the bomb's once it's down)
  Pix.rect(c, 82, 3, 76, 12, '#000000');
  Font.draw(c, 'T 7', 85, 6, CS_COL.T);
  Font.drawRight(c, '6 CT', 157, 6, CS_COL.CT);
  const secs = planted ? Math.max(0, 40 - Math.floor((cyc - 200) / 8)) : Math.max(0, 55 - (cyc >> 4));
  if (!over && !(planted && (cyc >> 3) & 1 && secs < 10)) Font.drawCenter(c, '0:' + String(secs).padStart(2, '0'), 120, 18, planted ? '#F83800' : '#F8F8F8');
  if (planted && cyc < 260) Font.drawCenter(c, 'BOMB PLANTED', 120, 30, (cyc >> 3) & 1 ? '#F83800' : '#F8D838');
  if (over) {
    const win = boom ? 'TERRORISTS WIN' : 'COUNTER-TERRORISTS WIN', col = boom ? CS_COL.T : CS_COL.CT;
    Pix.rect(c, 120 - win.length * 4 - 4, 26, win.length * 8 + 6, 12, '#000000');
    Font.drawCenter(c, win, 120, 28, col);
    if (cyc < endT + 70 && (cyc >> 3) & 1) Font.drawCenter(c, boom ? 'TARGET BOMBED' : 'BOMB DEFUSED', 120, 40, '#F8F8F8');
  }
};
