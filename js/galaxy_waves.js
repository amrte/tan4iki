'use strict';
// =====================================================================
//  GALAXY, structure: mini-bosses, challenge stages, the captor and the twin fighter, wave medals.
//    wave 4  every sector gets one more wave after the 3rd (seven in all): in sectors 3, 6, 9, 12 a CHALLENGE STAGE
//            (40 harmless bugs fly through in five groups of 8; 100 a hit, 40/40 PERFECT! 10000), elsewhere a
//            MINI-BOSS: GUNSHIP (sweeps, bursts, fans, wing guns), CARRIER (launches drones from its bays), TURRET
//            RING (four guns round a core, spraying a spiral), WARDEN (dashes over you, drops a curtain with a gap)
//    captor  from sector 2 a big two-hit bug sits in the formation's top row; now and then it stops halfway down and
//            projects a tractor beam: a ship caught in it is taken (lost, as if shot) and carried, red, on top of
//            the captor. Shoot the captor and the ship comes back to its owner and docks: a TWIN with its own guns,
//            which takes a hit for you
//    medals  after a wave: NO HIT (nobody got hit) 1000, SPEED (cleared under par) 500, PERFECT (challenge 40/40)
// =====================================================================

// ------------------------------------------------------------------ the plan: a 4th wave after the 3rd
GX_WAVE_NAMES.miniboss = 'MINI-BOSS';
GX_WAVE_NAMES.challenge = 'CHALLENGE STAGE';
{
  const plan0 = gxPlan;
  gxPlan = function (sec, loop, level) {
    const plan = plan0(sec, loop, level);
    if (plan.length >= 6) plan.splice(3, 0, sec % 3 === 2 ? 'challenge' : 'miniboss');
    return plan;
  };
}

// ------------------------------------------------------------------ the new kinds
Object.assign(GX_TYPES, {
  mbGunship: { w: 40, h: 22, hp: 70, pts: 3000, from: 99, special: true, mini: 'GUNSHIP' },
  mbCarrier: { w: 44, h: 28, hp: 90, pts: 3500, from: 99, special: true, mini: 'CARRIER' },
  mbRing: { w: 22, h: 22, hp: 60, pts: 4000, from: 99, special: true, mini: 'TURRET RING' },
  mbPod: { w: 12, h: 12, hp: 10, pts: 300, from: 99, special: true },
  mbWarden: { w: 32, h: 26, hp: 75, pts: 3500, from: 99, special: true, mini: 'WARDEN' },
  captor: { w: 16, h: 14, hp: 2, pts: 400, from: 99, special: true },
  chA: { w: 12, h: 10, hp: 1, pts: 100, from: 99, special: true, chal: true },
  chB: { w: 12, h: 12, hp: 1, pts: 100, from: 99, special: true, chal: true },
  chC: { w: 14, h: 10, hp: 1, pts: 100, from: 99, special: true, chal: true },
  chD: { w: 12, h: 10, hp: 1, pts: 100, from: 99, special: true, chal: true },
  chE: { w: 12, h: 12, hp: 1, pts: 100, from: 99, special: true, chal: true },
});
const GX_MINI_KEYS = ['mbGunship', 'mbCarrier', 'mbRing', 'mbWarden'];
const GX_CH_TYPES = ['chA', 'chB', 'chC', 'chD', 'chE'];

Object.assign(GX_PALS, {
  mbGunship: [null, '#B8D8F8', '#5888C8', '#283C6C', '#F8F8F8', '#F8D800', '#58F8F8', '#080C18'],
  mbCarrier: [null, '#D8D0A0', '#9C9460', '#4C482C', '#F8F8F8', '#F8B800', '#58D854', '#100C04'],
  mbRing: [null, '#F8C8F8', '#B058D8', '#582878', '#F8F8F8', '#58F8F8', '#F8F878', '#100418'],
  mbPod: [null, '#E0E0F0', '#8C8CA8', '#3C3C54', '#F8F8F8', '#58F8F8', '#B058D8', '#08080C'],
  mbWarden: [null, '#F8E8A8', '#D0A040', '#6C4C10', '#F8F8F8', '#58F8F8', '#A8F8F8', '#140C00'],
  captor: [null, '#B8F8B8', '#38B838', '#106010', '#F8F8F8', '#F8D800', '#3C7CF8', '#041004'],
  captor2: [null, '#E8B8F8', '#A050E0', '#501878', '#F8F8F8', '#F8D800', '#58C8F8', '#100418'],
  chA: [null, '#F8F878', '#F8D800', '#8C6C00', '#F8F8F8', '#3C5CF8', '#C8F0F8', '#141000'],
  chB: [null, '#F8C8F8', '#F878F8', '#A0209C', '#F8F8F8', '#F8F878', '#58F8F8', '#180418'],
  chC: [null, '#B8F8B8', '#58D854', '#1C7C1C', '#F8F8F8', '#3CBCFC', '#A8F8F8', '#041004'],
  chD: [null, '#A8E8F8', '#3CBCFC', '#1C5C9C', '#F8F8F8', '#F8F8F8', '#F8F878', '#040C18'],
  chE: [null, '#B8F8F8', '#58C8F8', '#2C6CA0', '#F8F8F8', '#F878F8', '#F8D800', '#041018'],
});

// recolour everything drawn so far
const gxPaint = (P, c) => { for (const r of P.g) for (let x = 0; x < r.length; x++) if (r[x]) r[x] = c; };
const gxChBee = f => {
  const P = bossPainter(12, 10);
  P.ellipse(3, 3 + f, 3, 2.2); P.ellipse(9, 3 + f, 3, 2.2); gxPaint(P, 6);   // wings
  P.ellipse(6, 5.5, 3, 4.2);
  for (const y of [5, 7]) P.rect(3, y, 9, y, 5);
  P.px(5, 2, 4); P.px(7, 2, 4); P.line(5, 1, 4, 0, 3); P.line(7, 1, 8, 0, 3);
  P.outline(); return P.g;
};
// a picture from rows of digits (the palette's colours, . for none)
const gxRows = (P, rows) => rows.forEach((r, y) => [...r].forEach((ch, x) => { if (ch !== '.') P.px(x, y, +ch); }));
const GX_FLY = [
  ['....3..3....', '.112.33.211.', '1252.33.2521', '2222.33.2222', '.222.33.222.', '..22.33.22..', '.166.33.661.', '6656.33.6566', '.666.33.666.', '..6..33..6..', '.....33.....'],
  ['....3..3....', '..12.33.21..', '.152.33.251.', '.222.33.222.', '..22.33.22..', '...2.33.2...', '..16.33.61..', '.656.33.656.', '..66.33.66..', '...6.33.6...', '.....33.....'],
];
const gxChFly = f => { const P = bossPainter(12, 12); gxRows(P, GX_FLY[f]); P.px(5, 1, 4); P.px(6, 1, 4); P.outline(); return P.g; };
const gxChDragon = f => {
  const P = bossPainter(14, 10);
  for (const y of f ? [2, 6] : [3, 5]) { P.rect(0, y, 5, y, 6); P.rect(8, y, 13, y, 6); }   // two pairs of long wings
  P.rect(6, 1, 7, 9, 2); P.rect(6, 1, 7, 2, 1); P.px(6, 1, 4); P.px(7, 1, 5); P.px(6, 9, 3); P.px(7, 9, 3);
  P.outline(); return P.g;
};

Object.assign(GX_DRAW, {
  chA: gxChBee, chD: gxChBee, chB: gxChFly, chE: gxChFly, chC: gxChDragon,
  // the captor: a big two-winged bug, a crest on its head
  captor(f) {
    const P = bossPainter(16, 14);
    P.ellipse(3.5, 6 + f, 3.5, 4.5); P.ellipse(12.5, 6 + f, 3.5, 4.5); gxPaint(P, 6);
    for (const x of [2, 13]) P.line(x, 4 + f, x, 8 + f, 1);
    P.ellipse(8, 7, 4, 6.5);
    P.rect(6, 1, 9, 2, 5); P.px(7, 0, 5); P.px(8, 0, 5);
    P.px(6, 6, 4); P.px(9, 6, 4); P.px(6, 7, 7); P.px(9, 7, 7);
    P.rect(7, 9, 8, 10, 5);
    P.line(6, 12, 5, 13, 3); P.line(9, 12, 10, 13, 3);
    P.outline(); return P.g;
  },
  // a gunship, nose down at you: swept wings, engine pods at the back, cannons at the wingtips
  mbGunship(f) {
    const P = bossPainter(40, 22);
    for (let y = 4; y < 14; y++) {   // swept wings: a lit leading edge, a dark trailing one
      const hw = 6 + (y - 4) * 1.4, x0 = Math.round(20 - hw), x1 = Math.round(19 + hw);
      P.rect(x0, y, x1, y, y < 6 ? 1 : y > 11 ? 3 : 2); P.rect(x0, y, x0 + 1, y, 1); P.rect(x1 - 1, y, x1, y, 3);
    }
    for (const x of [13, 26]) P.line(x, 6, x + (x < 20 ? -6 : 6), 12, 3);   // panel lines
    for (const x of [10, 29]) { P.rect(x - 3, 0, x + 2, 9, 2); P.rect(x - 3, 0, x - 3, 9, 1); P.rect(x + 2, 0, x + 2, 9, 3); P.rect(x - 2, 0, x + 1, 1, f ? 5 : 4); }
    for (const x of [3, 36]) { P.rect(x - 1, 10, x + 1, 17, 3); P.rect(x, 11, x, 16, 2); P.rect(x - 1, 18, x + 1, 18, 4); }
    P.ellipse(20, 11, 6, 10.5);
    P.rect(19, 18, 20, 21, 3); P.px(19, 21, 4);
    P.disc(20, 9, 2.8, 6); P.px(19, 8, 4); P.px(20, 7, 4);
    P.line(8, 11, 13, 11, 5); P.line(26, 11, 31, 11, 5);
    for (const x of [6, 15, 24, 33]) P.px(x, 9, 3);
    P.rect(17, 14, 22, 15, 3); P.px(19, 14, f ? 6 : 5); P.px(20, 14, f ? 5 : 6);
    P.outline(); return P.g;
  },
  // a carrier: a long hull, a bridge tower, two hangar bays (f: open, lit)
  mbCarrier(f) {
    const P = bossPainter(44, 28);
    for (let y = 3; y < 26; y++) { const hw = 21 - Math.max(0, Math.abs(y - 14) - 8) * 1.6; P.rect(Math.round(22 - hw), y, Math.round(21 + hw), y, y < 5 ? 1 : y > 23 ? 3 : 2); }
    P.rect(2, 5, 2, 22, 1); P.rect(41, 5, 41, 22, 3);
    P.rect(17, 0, 26, 7, 2); P.rect(17, 0, 26, 0, 1); P.rect(26, 1, 26, 7, 3); P.rect(18, 2, 25, 3, 6); P.px(19, 2, 4);
    P.line(21, 0, 21, -2, 3);
    for (const x0 of [6, 26]) {
      P.rect(x0, 11, x0 + 11, 22, 3);
      if (f) { P.rect(x0 + 1, 12, x0 + 10, 21, 7); for (const y of [13, 16, 19]) { P.px(x0 + 1, y, 5); P.px(x0 + 10, y, 5); } P.rect(x0 + 4, 20, x0 + 7, 21, 6); }
      else { P.rect(x0 + 1, 12, x0 + 10, 21, 2); P.line(x0 + 5, 12, x0 + 5, 21, 3); P.line(x0 + 6, 12, x0 + 6, 21, 1); for (const y of [14, 18]) { P.px(x0 + 2, y, 4); P.px(x0 + 9, y, 4); } }
    }
    for (let x = 5; x < 40; x += 4) P.px(x, 8, 5);
    P.rect(19, 24, 24, 26, 3); P.px(21, 26, 4); P.px(22, 26, 4);
    P.outline(); return P.g;
  },
  // the turret ring's core: armoured plates round a glowing eye
  mbRing(f) {
    const P = bossPainter(22, 22);
    P.ellipse(11, 11, 10.5, 10.5);
    for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + Math.PI / 4; P.line(11 + Math.cos(a) * 5, 11 + Math.sin(a) * 5, 11 + Math.cos(a) * 10, 11 + Math.sin(a) * 10, 3); }
    P.disc(11, 11, 6, 7); P.disc(11, 11, 4.6, f ? 5 : 6); P.disc(11, 11, 2.2, f ? 4 : 5); P.px(9, 9, 4);
    for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; P.px(11 + Math.cos(a) * 8.5, 11 + Math.sin(a) * 8.5, k % 2 ? 6 : 4); }
    P.outline(); return P.g;
  },
  mbPod(f) {
    const P = bossPainter(12, 12);
    P.ellipse(6, 6, 5.5, 5.5); P.disc(6, 6, 3, 3); P.disc(6, 6, 1.8, f ? 5 : 6); P.px(5, 5, 4);
    P.outline(); return P.g;
  },
  // the warden: a horned shield of a ship, a burning visor
  mbWarden(f) {
    const P = bossPainter(32, 26);
    P.line(5, 7, 1, 0, 1); P.line(6, 7, 2, 0, 1); P.line(26, 7, 30, 0, 3); P.line(25, 7, 29, 0, 3);   // horns
    for (let y = 4; y < 26; y++) {   // a shield, pointed at the bottom, lit from the left
      const hw = y < 15 ? 12 : 12 - (y - 15) * 1.15;
      for (let x = Math.round(16 - hw); x <= Math.round(15 + hw); x++) P.px(x, y, y < 6 ? 1 : x < 16 - hw * 0.55 ? 1 : x > 15 + hw * 0.55 ? 3 : 2);
    }
    P.ellipse(4.5, 9, 4.5, 5); P.ellipse(27.5, 9, 4.5, 5);   // shoulders
    P.rect(8, 10, 23, 12, 7); P.rect(9, 11, 22, 11, f ? 5 : 6); P.px(10 + ((f * 7) % 12), 11, 4);   // the visor
    P.line(16, 4, 16, 9, 1); P.disc(16, 18, 3.2, 5); P.disc(16, 18, 1.5, 4);
    for (const x of [8, 23]) P.line(x, 14, x + (x < 16 ? 3 : -3), 21, 3);
    P.outline(); return P.g;
  },
});
GX_DRAW.captor2 = GX_DRAW.captor;

// ------------------------------------------------------------------ a few helpers
const gxShoot = (g, x, y, ang, spd, k = 'shot') => { if (g.bullets.length < 70) g.bullets.push({ x, y, vx: Math.cos(ang) * spd * g.shotSpd, vy: Math.sin(ang) * spd * g.shotSpd, k }); };
const gxToward = (e, x, y, t) => (t ? Math.atan2(t.y + 8 - y, t.x + 8 - x) : Math.PI / 2);
// where the twin flies: to your right, or your left near the edge
const gxTwinX = t => (t.x + 30 > FW ? t.x - 14 : t.x + 14);
const gxSlotXY = (st, e) => [e.slot[0] + Math.sin(st.frame / 70) * Math.min(12, (FW - 180) / 2 + 10), e.slot[1] + Math.sin(st.frame / 45) * (e.slot[1] - 20) * 0.08];
const gxNearest = (pl, x, y) => pl.reduce((a, t) => (!a || Math.hypot(t.x + 8 - x, t.y + 8 - y) < Math.hypot(a.x + 8 - x, a.y + 8 - y) ? t : a), null);
const gxSay2 = (st, x, y, text, color, life = 60) => st.popups.push({ x, y, text, label: true, color, t: 0, delay: 0, life });

// ------------------------------------------------------------------ mini-bosses
// each: where it hovers (y0) and how it moves and attacks (update), an act at a time from its list
const GX_MINI = {
  // sweeps side to side: aimed bursts, double fans, its wing guns
  mbGunship: { y0: 30, acts: ['burst', 'fan', 'guns', 'burst', 'fan'],
    move(e) { e.x = FW / 2 + Math.sin(e.mt / 80) * (FW / 2 - 24); e.y = 30 + Math.sin(e.mt / 37) * 4; },
    act(e, a, g, near) {
      const nx = e.x, ny = e.y + 10;
      if (a.k === 'burst') { if (a.t % 6 === 1) gxShoot(g, nx, ny, gxToward(e, nx, ny, near), 2); if (a.t >= 6 * (5 + Math.min(3, g.loop))) return 50; }
      else if (a.k === 'fan') { if (a.t === 1 || a.t === 22) { const c = gxToward(e, nx, ny, near) + (a.t > 1 ? 0.09 : 0); for (let i = 0; i < 7; i++) gxShoot(g, nx, ny, c + (i - 3) * 0.18, 1.4); Sound.play('mortar'); } if (a.t >= 22) return 60; }
      else if (a.k === 'guns') { if (a.t % 9 === 1) for (const dx of [-17, 17]) { gxShoot(g, e.x + dx, e.y + 8, Math.PI / 2, 1.8); gxShoot(g, e.x + dx, e.y + 8, Math.PI / 2 + Math.sign(dx) * 0.25, 1.6); } if (a.t >= 36) return 45; }
      return 0;
    } },
  // slow; opens its bays and lets drones out, flak and rings between
  mbCarrier: { y0: 32, acts: ['launch', 'flak', 'launch', 'ring'],
    move(e) { e.x = FW / 2 + Math.sin(e.mt / 150) * (FW / 2 - 30); e.y = 32 + Math.sin(e.mt / 60) * 2; },
    act(e, a, g, near) {
      if (a.k === 'launch') {
        e.bay = a.t < 56 ? 1 : 0;
        if ((a.t === 20 || a.t === 40) && g.list.length < 18) for (const dx of [-11, 11]) {
          const d = this.gxSpawn({ type: g.sec >= 2 && dx > 0 ? 'bug' : 'drone', st: 'dive' });
          d.x = e.x + dx; d.y = e.y + 12; d.sx = d.x; d.sy = d.y; d.t = 0; d.tx = near ? near.x + 8 + rnd(41) - 20 : FW / 2; d.shot = false; d.hp = d.max = d.max * 0.6;
        }
        if (a.t === 20) Sound.play('teleport');
        if (a.t >= 60) return 50;
      } else if (a.k === 'flak') { if (a.t % 10 === 1) for (const dx of [-18, 18]) gxShoot(g, e.x + dx, e.y + 8, gxToward(e, e.x + dx, e.y + 8, near), 1.6); if (a.t >= 40) return 50; }
      else if (a.k === 'ring') { if (a.t === 1 || a.t === 26) { for (let i = 0; i < 12; i++) gxShoot(g, e.x, e.y + 4, i * Math.PI / 6 + a.t * 0.13, 1.05); Sound.play('mortar'); } if (a.t >= 26) return 70; }
      return 0;
    } },
  // four guns turn round the core spraying a spiral; with fewer guns it turns faster and aims at you
  mbRing: { y0: 48, acts: ['spiral', 'aim', 'spiral', 'spiral'],
    move(e, g) {
      e.x = FW / 2 + Math.sin(e.mt / 120) * (FW / 2 - 40); e.y = 48 + Math.sin(e.mt / 50) * 3;
      const pods = g.list.filter(o => o.type === 'mbPod' && o.parent === e.id).length;
      e.ang = (e.ang || 0) + 0.018 + 0.008 * (4 - pods);
    },
    act(e, a, g, near) {
      const pods = g.list.filter(o => o.type === 'mbPod' && o.parent === e.id);
      if (a.k === 'spiral') {
        if (a.t % 11 === 1) { for (const o of pods) { const an = e.ang + o.k * Math.PI / 2; gxShoot(g, o.x + Math.cos(an) * 6, o.y + Math.sin(an) * 6, an, 1.0); } if (pods.length) Sound.play('gxPop'); }
        if (!pods.length && a.t % 8 === 1) gxShoot(g, e.x, e.y + 8, gxToward(e, e.x, e.y, near) + (a.t % 16 ? 0.2 : -0.2), 1.6);
        if (a.t >= 77) return 60;
      } else if (a.k === 'aim') { if (a.t % 7 === 1) for (const sp of [-0.22, 0, 0.22]) gxShoot(g, e.x, e.y + 8, gxToward(e, e.x, e.y, near) + sp, 1.5); if (a.t >= 22) return 50; }
      return 0;
    } },
  // dashes over you, then drops a curtain of shots with a gap in it
  mbWarden: { y0: 28, acts: ['dash', 'aim', 'dash', 'dash', 'aim'],
    move(e) { if (!e.dashing) { e.x += Math.sin(e.mt / 45) * 0.5; e.y = 28 + Math.sin(e.mt / 30) * 3; } e.x = Math.max(18, Math.min(FW - 18, e.x)); },
    act(e, a, g, near) {
      if (a.k === 'dash') {
        if (a.t === 1) { e.dx = Math.max(18, Math.min(FW - 18, near ? near.x + 8 : FW / 2)); e.dashing = 1; Sound.play('charge'); }
        if (a.t < 30) e.x += (e.dx - e.x) * 0.14;
        if (a.t === 30 || (a.t === 56 && g.loop + g.sec >= 4)) {
          // a row across the field; the gap is somewhere you can reach
          const n = Math.floor((FW - 8) / 12), w = 3 + (g.loop ? 0 : 1), gap = rnd(n - w + 1);
          for (let i = 0; i < n; i++) if (i < gap || i >= gap + w) gxShoot(g, 6 + i * 12 + (a.t > 30 ? 6 : 0), e.y + 14, Math.PI / 2, 0.95);
          Sound.play('mortar');
        }
        if (a.t >= 60) { e.dashing = 0; return 40; }
      } else if (a.k === 'aim') { if (a.t % 10 === 1) for (const sp of [-0.3, 0, 0.3]) gxShoot(g, e.x, e.y + 12, gxToward(e, e.x, e.y, near) + sp, 1.6); if (a.t >= 30) return 50; }
      return 0;
    } },
};

Object.assign(GX_MOVES, {
  mini: Object.assign(function (e, g, near) {
    const M = GX_MINI[e.type], tg = near(e.x, e.y);
    e.mt = (e.mt || 0) + 1;
    if (!e.in) { e.y += 0.7; if (e.y >= M.y0) { e.in = true; e.mt = 0; } }
    else {
      M.move.call(this, e, g);
      if (e.act) { e.act.t++; const gap = M.act.call(this, e, e.act, g, tg); if (gap) { e.act = null; e.cd = Math.round(gap / Math.max(0.6, g.fireMul)); } }
      else if (--e.cd <= 0) e.act = { k: M.acts[e.step++ % M.acts.length], t: 0 };
    }
    e.v = { h: Math.round(Math.max(0, e.hp) / e.max * 100) / 100, b: e.bay || 0, d: e.dashing || 0, a: Math.round((e.ang || 0) * 100) / 100 };
  }, { init(e, g) {
    e.x = FW / 2; e.y = -e.h; e.cd = 60; e.step = 0; e.fireT = 1e9;
    e.hp = e.max = e.max * (1 + 0.35 * (this.players.length - 1));
    e.v = { h: 1 };
    g.banner = { text: 'WARNING! ' + GX_TYPES[e.type].mini, t: 110, warn: true };
    Sound.play('bossWarn');
  } }),
  // the ring's guns: round the core
  pod: function (e, g) {
    const par = g.list.find(o => o.id === e.parent);
    if (!par) { e.st = 'kami'; e.vy = 0.6; return; }
    const an = (par.ang || 0) + e.k * Math.PI / 2;
    e.x = par.x + Math.cos(an) * 24; e.y = par.y + Math.sin(an) * 20;
    e.v = { a: Math.round(an * 100) / 100 };
  },
});
for (const k of [...GX_MINI_KEYS, 'mbPod', ...GX_CH_TYPES]) GX_FIRE[k] = () => 1e9;   // they fire on their own (or never)

GX_WAVE_KINDS.miniboss = function (g, add, types) {
  const sec = g.sec, kind = g.miniKind || GX_MINI_KEYS[(sec - Math.floor((sec + 1) / 3) + g.loop) % GX_MINI_KEYS.length], id = 'mini' + g.wave;
  add(kind, { st: 'mini', id, delay: 70 });
  const esc = types.includes('wasp') ? 'wasp' : 'drone';
  if (kind === 'mbRing') for (let k = 0; k < 4; k++) add('mbPod', { st: 'pod', parent: id, k, delay: 70 });
  if (kind === 'mbWarden') for (let j = 0; j < 4; j++) add(esc, { st: 'orbit', parent: id, ang: j * Math.PI / 2, delay: 150 + j * 6 });
  else {
    const n = kind === 'mbGunship' ? 6 : 4, y = kind === 'mbRing' ? 88 : 66;
    for (let k = 0; k < n; k++) add(k % 2 && types.includes('bug') ? 'bug' : esc, { st: 'enter', slot: [FW / 2 + (k - (n - 1) / 2) * 22, y], from: k < n / 2 ? -1 : 1, delay: 10 + k * 8 });
  }
};

// ------------------------------------------------------------------ the challenge stage: five groups of eight fly through
// a path: where it starts (x as a part of the width), its heading, then [frames, turn a frame] pieces; mirrored for the right
const GX_CH_PATHS = {
  swoop: { x: 0.3, y: -8, a: Math.PI / 2, segs: [[36, 0], [90, -Math.PI * 2 / 90], [20, 0], [40, -Math.PI * 0.75 / 40]] },
  side: { x: -0.04, y: 78, a: -0.15, segs: [[40, 0], [100, -Math.PI * 2 / 100], [25, 0], [30, 0.5 / 30]] },
  dive: { x: 0.42, y: -8, a: Math.PI / 2, segs: [[55, 0], [55, Math.PI / 55], [25, 0], [40, -Math.PI / 2 / 40]] },
};
const GX_CH_GROUPS = [['swoop', 1], ['swoop', -1], ['side', 1], ['side', -1], ['dive', 0]];   // 0: the group splits, every other one mirrored
GX_WAVE_KINDS.challenge = function (g, add) {
  g.chal = { hits: 0, n: 40, grp: [0, 0, 0, 0, 0] };
  GX_CH_GROUPS.forEach(([path, side], k) => {
    for (let j = 0; j < 8; j++) add(GX_CH_TYPES[k], { st: 'chal', grp: k, path, side: side || (j % 2 ? -1 : 1), delay: 70 + k * 150 + (side ? j : j >> 1) * 9 });
  });
  Sound.play('gxChallenge');
};
GX_MOVES.chal = Object.assign(function (e, g) {
  const P = GX_CH_PATHS[e.path], seg = P.segs[e.seg], v = 1.7 + 0.15 * Math.min(2, g.loop);
  if (seg) { e.a += seg[1] * e.side; if (++e.segT >= seg[0]) { e.seg++; e.segT = 0; } }
  e.x += Math.cos(e.a) * v; e.y += Math.sin(e.a) * v;
  if ((e.t > 40 && (e.x < -18 || e.x > FW + 18 || e.y < -18 || e.y > FH + 18)) || e.t > 1200) e.st = 'gone';
}, { init(e) {
  const P = GX_CH_PATHS[e.path];
  e.x = e.side > 0 ? P.x * FW : FW - P.x * FW; e.y = P.y; e.a = e.side > 0 ? P.a : Math.PI - P.a; e.seg = 0; e.segT = 0; e.fireT = 1e9;
} });
for (const k of GX_CH_TYPES) {
  GX_COLLIDE[k] = () => false;   // harmless to touch
  GX_ON_KILL[k] = function (e, p, g) {
    this.addFx(e.x, e.y, Sprites.smallExp, 3);
    if (this.frame % 2 === 0) Sound.play('gxPop');
    const c = g.chal;
    if (!c || !p) return false;
    c.hits++;
    // a whole group of eight shot down: a group bonus
    if (++c.grp[e.grp] === 8) { const pts = 1000 * (1 + g.loop); this.addScore(p, pts); this.popups.push({ x: e.x, y: e.y, text: String(pts), t: 0, delay: 0 }); Sound.play('bonus'); }
    return false;
  };
}

// ------------------------------------------------------------------ the captor and its tractor beam
const GX_BEAM_WARN = 36, GX_BEAM_ON = 130;
// the cone under a captor at (x, y): its top, how far down it reaches now, its half width d pixels down
const gxCone = (e, k, t) => ({ y0: e.y + 7, len: k ? Math.min(1, t / 20) * (FH - e.y - 7) : FH - e.y - 7, hw: d => 4 + d * 0.28 });
GX_MOVES.tract = function (e, g) {
  e.fireT = 999;
  const ty = Math.round(FH * 0.45);
  if (e.tk === 'go') {
    const dx = e.tx - e.x, dy = ty - e.y, d = Math.hypot(dx, dy), sp = 1.8;
    if (d <= sp) { e.x = e.tx; e.y = ty; e.tk = 'warn'; e.bt = 0; Sound.play('gxTractor'); } else { e.x += dx / d * sp; e.y += dy / d * sp; }
  } else if (e.tk === 'warn') { if (++e.bt >= GX_BEAM_WARN) { e.tk = 'beam'; e.bt = 0; e.cone = {}; } }
  else if (e.tk === 'beam') {
    e.bt++;
    if (e.bt % 32 === 1) Sound.play('gxTractor');
    const c = gxCone(e, 1, e.bt);
    for (const t of this.gxPlayers()) {
      const px = t.x + 8, py = t.y + 9, d = py - c.y0, k = t.player.i;
      const inside = !(t.shield > 0) && d > 0 && d < c.len && Math.abs(px - e.x) < c.hw(d) - 2;
      e.cone[k] = inside ? (e.cone[k] || 0) + 1 : 0;
      if (e.cone[k] >= 6 && this.gxCapture(t, e)) { e.tk = 'hold'; e.bt = 0; break; }
    }
    if (e.tk === 'beam' && e.bt >= GX_BEAM_ON) e.tk = 'up';
  } else if (e.tk === 'hold') { if (++e.bt > 200) e.tk = 'up'; }   // waits while the ship comes up to it
  else {
    const [sx, sy] = e.slot ? gxSlotXY(this, e) : [e.x, 30], dx = sx - e.x, dy = sy - e.y, d = Math.hypot(dx, dy);
    if (d < 2) { e.x = sx; e.y = sy; e.st = e.slot ? 'form' : 'kami'; e.tk = null; e.capT = 500 + rnd(400); e.fireT = 120 + rnd(200); }
    else { e.x += dx / d * Math.min(d, 1.6); e.y += dy / d * Math.min(d, 1.6); }
  }
};

Object.assign(Stage.prototype, {
  // caught in the beam: a twin goes first; otherwise the ship is lost the usual way (lives, respawn) and carried off
  gxCapture(t, e) {
    const g = this.galaxy, p = t.player, gp = gxPlayer(p), lv = p.level || 0;
    if (g.wS) g.wS.hit = true;
    if (gp.twin) {
      gp.twin = false;
      g.tows.push({ x: gxTwinX(t) + 8, y: t.y + 8, cid: e.id, o: p.i, lv, t: 0 });
      t.shield = Math.max(t.shield || 0, 60);
      gxSay2(this, t.x + 8, t.y - 4, 'TWIN CAPTURED', '#F83800');
      Sound.play('gxCaptured');
      return true;
    }
    const n = this.fx.length, x = t.x, y = t.y;
    t.plates = 0; t.ship = false; t.shield = 0;
    this.gxCapturing = true;
    try { this.hitPlayer(t); } finally { this.gxCapturing = false; }
    if (t.alive) return false;
    // taken, not blown up: no explosion
    for (let k = this.fx.length - 1; k >= n; k--) if (this.fx[k].x === x + 8 && this.fx[k].y === y + 8) this.fx.splice(k, 1);
    g.tows.push({ x: x + 8, y: y + 8, cid: e.id, o: p.i, lv, t: 0 });
    gxSay2(this, x + 8, y - 4, 'FIGHTER CAPTURED', '#F83800', 80);
    Sound.play('gxCaptured');
    return true;
  },

  // a captor carrying a ship is shot: the ship comes back to its owner (flies off if they're not there)
  gxFreeShip(e) { const c = e.cap; e.cap = null; this.gxFreeAt(e.x, e.y - 14, c); },
  gxFreeAt(x, y, c) {
    const g = this.galaxy, t = this.tanks.find(o => o.isPlayer && o.alive && !o.ally && o.player.i === c.o), ok = t && !gxPlayer(t.player).twin;
    g.frees.push({ x, y, o: c.o, lv: c.lv, t: 0, st: ok ? 'dock' : 'off' });
    gxSay2(this, x, y - 4, ok ? 'RESCUED!' : 'FIGHTER RESCUED', '#58F8F8', 70);
    if (!ok) { const p = this.players.find(q => q.i === c.o); if (p && !p.out) this.addScore(p, 1000 * (1 + g.loop)); }
    Sound.play('gxRescue');
  },

  // the captured and freed ships in flight, the medals' timer
  gxWavesTick(g) {
    for (const w of g.tows) {
      w.t++;
      const e = g.list.find(o => o.id === w.cid);
      if (!e) { w.dead = true; this.gxFreeAt(w.x, w.y, w); continue; }
      const tx = e.x, ty = e.y - 14, dx = tx - w.x, dy = ty - w.y, d = Math.hypot(dx, dy), sp = Math.min(d, 0.6 + w.t * 0.03);
      if (d < 1.5) { w.dead = true; e.cap = { o: w.o, lv: w.lv }; e.tk = 'up'; continue; }
      w.x += dx / d * sp; w.y += dy / d * sp;
    }
    g.tows = g.tows.filter(w => !w.dead);
    for (const f of g.frees) {
      f.t++;
      const t = this.tanks.find(o => o.isPlayer && o.alive && !o.ally && o.player.i === f.o);
      if (f.st === 'dock' && (!t || gxPlayer(t.player).twin)) f.st = 'off';
      if (f.st === 'off') { f.y -= 2; f.x += Math.sin(f.t / 8); if (f.y < -20) f.dead = true; continue; }
      const tx = gxTwinX(t) + 8, ty = t.y + 8, dx = tx - f.x, dy = ty - f.y, d = Math.hypot(dx, dy), sp = Math.min(d, 2.2);
      if (d < 2.5) {
        f.dead = true; gxPlayer(t.player).twin = true;
        gxSay2(this, t.x + 8, t.y - 4, 'TWIN FIGHTER!', COL.gold, 70);
        Sound.play('bonus');
        continue;
      }
      f.x += dx / d * sp; f.y += dy / d * sp;
    }
    g.frees = g.frees.filter(f => !f.dead);
    if (g.medalShow && --g.medalShow.t <= 0) g.medalShow = null;
    g.chalShow = g.kind === 'challenge' && g.phase === 'wave' && g.chal ? g.chal.hits : -1;
    // a wave's just over: its medals (and a challenge stage's result)
    if (g.phase === 'between' && g.wS && g.wS.w === g.wave && !g.wS.done) { g.wS.done = true; this.gxWaveDone(g); }
  },

  gxWaveDone(g) {
    const live = this.players.filter(q => !q.out), m = 1 + g.loop, list = [];
    const give = (k, text, pts, medal = true) => {
      list.push([k, text]);
      for (const q of live) { if (pts) this.addScore(q, pts); if (medal) gxPlayer(q).medals = (gxPlayer(q).medals || 0) + 1; }
    };
    if (g.kind === 'challenge' && g.chal) {
      const c = g.chal;
      if (c.hits >= c.n) {
        g.banner = { text: 'PERFECT! ' + c.hits + '/' + c.n, t: 160 };
        give('perfect', 'PERFECT ' + 10000 * m, 10000 * m);
        for (let k = 0; k < 14; k++) { this.gxDrop(12 + rnd(FW - 24), -8 - rnd(60), 'gem'); g.pickups[g.pickups.length - 1].vy = 0.7 + Math.random() * 0.3; }
        Sound.play('gxPerfect');
      } else {
        g.banner = { text: 'CHALLENGE ' + c.hits + '/' + c.n, t: 160 };
        if (c.hits) give('bonus', 'BONUS ' + 100 * c.hits * m, 100 * c.hits * m, false);
        Sound.play('gxMedal');
      }
      g.t = -50;   // a longer look at the result
    } else {
      if (!g.wS.hit) give('nohit', 'NO HIT ' + 1000 * m, 1000 * m);
      if (this.frame - g.wS.t0 <= g.wS.par) give('speed', 'SPEED 500', 500);
      if (list.length) Sound.play('gxMedal');
    }
    if (list.length) g.medalShow = { list, t: 100 };
  },
});

// ------------------------------------------------------------------ wrappers
{
  const setup0 = Stage.prototype.setupGalaxy;
  Stage.prototype.setupGalaxy = function (level) {
    setup0.call(this, level);
    Object.assign(this.galaxy, { tows: [], frees: [], medalShow: null, chalShow: -1, wS: null, capN: 0 });
  };

  // a new wave: captors in a formation's top row (from sector 2), the wave's stats for the medals
  const next0 = Stage.prototype.gxNextWave;
  Stage.prototype.gxNextWave = function () {
    next0.call(this);
    const g = this.galaxy;
    if (g.phase !== 'wave') return;
    if (g.kind === 'formation' && g.sec + g.loop * GX_SECTORS.length >= 1 && Math.random() < 0.75) {
      const row = g.spawnQ.filter(q => q.st === 'enter' && q.slot), top = Math.min(...row.map(q => q.slot[1])), first = row.filter(q => q.slot[1] === top);
      const n = g.sec >= 4 || g.loop ? 2 : 1, mid = first.length >> 1;
      for (const q of n === 2 ? [first[mid - 1], first[mid]] : [first[mid - (g.wave % 2)]]) if (q) q.type = 'captor';
    }
    const n = g.spawnQ.reduce((a, q) => a + (GX_TYPES[q.type] && GX_TYPES[q.type].mini ? 25 : 1), 0), last = Math.max(0, ...g.spawnQ.map(q => q.delay));
    g.wS = { w: g.wave, t0: this.frame, par: last + 120 + 12 * n, last, n, hit: false, done: false };
  };

  const spawn0 = Stage.prototype.gxSpawn;
  Stage.prototype.gxSpawn = function (o) {
    const e = spawn0.call(this, o), g = this.galaxy;
    if (e.type === 'captor') { e.hp = e.max = 2 * Math.max(1, g.hpMul * 0.7); e.id = 'cap' + (g.capN = (g.capN || 0) + 1); e.capT = 400 + rnd(300); e.v = { c: 0, cap: 0 }; }
    if (GX_TYPES[e.type] && GX_TYPES[e.type].chal) e.hp = e.max = 0.5;   // one hit, whatever the gun
    return e;
  };

  const update0 = Stage.prototype.updateGalaxy;
  Stage.prototype.updateGalaxy = function () {
    update0.call(this);
    if (this.galaxy) this.gxWavesTick(this.galaxy);
  };

  // hit: it counts against the wave's NO HIT; a twin takes it for you
  const hit0 = Stage.prototype.hitPlayer;
  Stage.prototype.hitPlayer = function (t, by) {
    const g = this.galaxy;
    if (!g || !t || !t.isPlayer || t.ally || !t.alive || t.shield > 0) return hit0.call(this, t, by);
    if (g.wS && g.phase === 'wave') g.wS.hit = true;
    const gp = gxPlayer(t.player);
    if (gp.twin && !this.gxCapturing) {
      gp.twin = false;
      const x = gxTwinX(t) + 8;
      this.fx.push({ x, y: t.y + 8, frames: BIG_EXPLOSION(), per: 4, tick: 0 });
      t.shield = Math.max(t.shield || 0, 70);
      gxSay2(this, x, t.y - 4, 'TWIN LOST', '#F83800');
      Sound.play('explode');
      Input.rumble(t.player.i, 0.5, 150);
      return;
    }
    return hit0.call(this, t, by);
  };

  const death0 = Stage.prototype.gxOnDeath;
  Stage.prototype.gxOnDeath = function (p) { gxPlayer(p).twin = false; return death0.call(this, p); };

  // the twin fires its own straight volleys while you hold fire
  const ship0 = Stage.prototype.gxUpdatePlayer;
  Stage.prototype.gxUpdatePlayer = function (t) {
    const r = ship0.call(this, t), p = t.player, gp = gxPlayer(p);
    if (!gp.twin || this.over || !t.alive) return r;
    if (t.gxTwinCd > 0) { t.gxTwinCd--; return r; }
    if (!Input.player(p.i).fire || t.frozen > 0) return r;
    const pw = gp.power, n = pw >= 6 ? 3 : pw >= 3 ? 2 : 1, x = gxTwinX(t) + 8, dmg = this.gxDmg(p) * (0.9 + 0.08 * pw);
    for (let k = 0; k < n; k++) this.galaxy.shots.push({ x: x + (k - (n - 1) / 2) * 4, y: t.y + 1, vx: 0, vy: -5, dmg, k: 'b', o: p.i, life: 70 });
    t.gxTwinCd = Math.max(4, Math.round(10 * (1 - 0.1 * gxUp(p, 'rapid'))));
    return r;
  };

  // online: what a guest needs for all this
  const view0 = Stage.prototype.galaxyView;
  Stage.prototype.galaxyView = function () {
    const v = view0.call(this), g = this.galaxy, r = n => Math.round(n * 10) / 10;
    v.wc = { pl: g.plan, ch: g.chalShow, md: g.medalShow, tw: g.tows.map(w => [r(w.x), r(w.y), w.o, w.lv, w.t]), fr: g.frees.map(f => [r(f.x), r(f.y), f.o, f.lv, f.t]) };
    return v;
  };
  const apply0 = Stage.prototype.applyGalaxyView;
  Stage.prototype.applyGalaxyView = function (v) {
    apply0.call(this, v);
    const g = this.galaxy, c = v.wc;
    if (!c) return;
    if (c.pl) g.plan = c.pl;
    g.chalShow = c.ch; g.medalShow = c.md;
    g.tows = (c.tw || []).map(a => ({ x: a[0], y: a[1], o: a[2], lv: a[3], t: a[4] }));
    g.frees = (c.fr || []).map(a => ({ x: a[0], y: a[1], o: a[2], lv: a[3], t: a[4] }));
  };
}

// captors: now and then one leaves the formation to beam; their looks for the guest
GX_FRAME.push(function (g) {
  const pl = this.gxPlayers();
  const busy = g.list.some(e => e.st === 'tract' && (e.tk === 'go' || e.tk === 'warn' || e.tk === 'beam' || e.tk === 'hold')) || g.tows.length;
  for (const e of g.list) {
    if (e.type !== 'captor') continue;
    if (e.st === 'form' && !e.cap && !busy && pl.length && this.freezeE <= 0 && --e.capT <= 0) {
      const tg = gxNearest(pl, e.x, e.y);
      e.st = 'tract'; e.tk = 'go'; e.tx = Math.max(20, Math.min(FW - 20, tg.x + 8 + rnd(21) - 10)); e.t = 0;
    }
    if (e.st === 'dive' && !e.cap && !busy && e.t <= 1 && pl.length && Math.random() < 0.5) {   // picked to dive: sometimes it beams instead
      const tg = gxNearest(pl, e.x, e.y);
      e.st = 'tract'; e.tk = 'go'; e.tx = Math.max(20, Math.min(FW - 20, tg.x + 8)); e.t = 0;
    }
    e.v = { c: e.hp <= e.max / 2 ? 1 : 0, cap: e.cap ? e.cap.lv + 1 : 0, bk: e.st === 'tract' && e.tk === 'warn' ? 1 : e.st === 'tract' && e.tk === 'beam' ? 2 : 0, bt: e.bt || 0 };
  }
});

Object.assign(GX_ON_KILL, {
  captor(e) { if (e.cap) this.gxFreeShip(e); },
  // a mini-boss goes down in a string of blasts, loot all round
  ...Object.fromEntries(GX_MINI_KEYS.map(k => [k, function (e, p, g) {
    for (let i = 0; i < 6; i++) this.fx.push({ x: e.x - e.w / 2 + rnd(e.w), y: e.y - e.h / 2 + rnd(e.h), frames: i % 2 ? Sprites.bigExp : BIG_EXPLOSION(), per: 4, tick: -i * 5 });
    Sound.play('bossDie');
    g.flash = 8;
    const pts = GX_TYPES[e.type].pts * (1 + g.loop);
    this.popups.push({ x: e.x, y: e.y, text: String(pts), t: 0, delay: 30 });
    for (const o of g.list.slice()) if (o.type === 'mbPod' && o.parent === e.id) this.gxKill(o, p);
    for (let k = 0; k < 6; k++) this.gxDrop(e.x - 16 + rnd(32), e.y, k < 2 ? 'gem' : 'coin');
    this.gxDrop(e.x, e.y, 'cell');
    if (Math.random() < 0.5) this.gxDrop(e.x, e.y, Math.random() < 0.5 ? 'box' : 'bomb');
    return false;
  }])),
});

// ------------------------------------------------------------------ drawing
const gxHpBar = (ctx, x, y, w, fr) => {
  ctx.fillStyle = '#100808'; ctx.fillRect(x - 1, y - 1, w + 2, 4);
  ctx.fillStyle = '#383838'; ctx.fillRect(x, y, w, 2);
  ctx.fillStyle = fr > 0.5 ? '#58D854' : fr > 0.25 ? '#F8D800' : '#F87830'; ctx.fillRect(x, y, Math.max(0, Math.round(w * fr)), 2);
};
const gxMiniDraw = function (ctx, e, f) {
  const T = GX_TYPES[e.type], v = e.v || {}, fr = e.type === 'mbCarrier' ? v.b || 0 : (f >> 3) & 1;
  const img = GxGfx.get(e.type, fr, e.flash > 0 && (f >> 1) & 1 ? 'f' : 'n'), x = Math.round(e.x - T.w / 2), y = Math.round(e.y - T.h / 2);
  if (e.type === 'mbRing') {   // the ring: a turning band to its guns
    ctx.strokeStyle = '#582878'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(Math.round(e.x), Math.round(e.y), 24, 20, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#B058D8';
    for (let k = 0; k < 12; k++) { const a = (v.a || 0) + k * Math.PI / 6; ctx.fillRect(Math.round(e.x + Math.cos(a) * 24), Math.round(e.y + Math.sin(a) * 20), 1, 1); }
  }
  if (e.type === 'mbWarden' && v.d && (f >> 2) & 1) {   // the dash: where the curtain falls from
    ctx.fillStyle = '#F83800';
    for (let yy = Math.round(e.y + T.h / 2 + 2); yy < VIEW_H; yy += 6) ctx.fillRect(Math.round(e.x), yy, 1, 3);
  }
  if (e.type === 'mbGunship' || e.type === 'mbCarrier') {   // exhaust flames at the back
    ctx.fillStyle = (f >> 1) & 1 ? '#F8B800' : '#F87830';
    for (const dx of e.type === 'mbGunship' ? [-10, 9] : [-14, 13]) ctx.fillRect(Math.round(e.x + dx) - 1, y - 2 - ((f >> 1) & 1), 2, 2 + ((f >> 1) & 1));
  }
  ctx.drawImage(img, x, y);
  if (v.h !== undefined) gxHpBar(ctx, Math.round(e.x - T.w / 2), y + T.h + 3, T.w, v.h);
};
for (const k of GX_MINI_KEYS) GX_RENDER[k] = gxMiniDraw;
GX_RENDER.mbPod = function (ctx, e, f) {
  const a = (e.v && e.v.a) || 0, x = Math.round(e.x), y = Math.round(e.y);
  ctx.fillStyle = '#100808'; for (let k = 4; k <= 9; k++) ctx.fillRect(Math.round(x + Math.cos(a) * k) - 1, Math.round(y + Math.sin(a) * k) - 1, 3, 3);
  ctx.fillStyle = '#8C8CA8'; for (let k = 4; k <= 8; k++) ctx.fillRect(Math.round(x + Math.cos(a) * k), Math.round(y + Math.sin(a) * k), 1, 1);
  ctx.drawImage(GxGfx.get('mbPod', (f >> 3) & 1, e.flash > 0 ? 'f' : 'n'), x - 6, y - 6);
};

// the captor: its beam under it, the ship it carries above it
GX_RENDER.captor = function (ctx, e, f) {
  const v = e.v || {}, x = Math.round(e.x), y = Math.round(e.y);
  if (v.bk) {
    const c = gxCone(e, v.bk === 2, v.bt), y1 = Math.min(VIEW_H, c.y0 + c.len);
    if (v.bk === 1) {   // the warning: its edges, dotted, flashing
      if ((v.bt >> 2) & 1) { ctx.fillStyle = '#3CBCFC'; for (let d = 0; c.y0 + d < VIEW_H; d += 4) { const hw = c.hw(d) * Math.min(1, v.bt / 24); ctx.fillRect(Math.round(x - hw), Math.round(c.y0 + d), 1, 2); ctx.fillRect(Math.round(x + hw), Math.round(c.y0 + d), 1, 2); } }
    } else {
      // a widening blue cone, bands of light running down it
      for (let yy = Math.round(c.y0); yy < y1; yy++) {
        const d = yy - c.y0, hw = c.hw(d) * (0.92 + 0.08 * Math.sin(f / 3 + d / 9)), band = ((d - f * 2) % 12 + 12) % 12 < 3;
        ctx.fillStyle = band ? 'rgba(168,232,248,0.6)' : 'rgba(60,188,252,0.36)'; ctx.fillRect(Math.round(x - hw), yy, Math.round(hw * 2), 1);
        ctx.fillStyle = 'rgba(200,240,255,0.7)'; ctx.fillRect(Math.round(x - hw), yy, 1, 1); ctx.fillRect(Math.round(x + hw) - 1, yy, 1, 1);
      }
    }
  }
  if (v.cap) {
    const img = Sprites.tank('p' + (v.cap - 1), (f >> 3) & 1, 2, 'red');
    ctx.drawImage(img, x - 8, y - 22);
  }
  ctx.drawImage(GxGfx.get(v.c ? 'captor2' : 'captor', (f >> 3) & 1, e.flash > 0 ? 'f' : 'n'), x - 8, y - 7);
};

// a medal: a ribbon and a disc
function gxDrawMedal(ctx, k, x, y, f) {
  const col = { nohit: ['#3CBCFC', '#E0E0F0', '#8C8CA8'], speed: ['#58D854', '#F8D800', '#AC7C00'], perfect: ['#F878F8', '#F8F8F8', '#58F8F8'], bonus: ['#F8B800', '#F8D800', '#7C5000'] }[k] || ['#F8D800', '#F8D800', '#7C5000'];
  if (k === 'bonus') { gxDrawPickup(ctx, 'coin', x + 4, y + 5, f); return; }
  ctx.fillStyle = col[0]; ctx.fillRect(x + 1, y, 3, 4); ctx.fillStyle = '#F8F8F8'; ctx.fillRect(x + 4, y, 3, 4);
  ctx.fillStyle = '#100808'; ctx.fillRect(x, y + 3, 9, 8); ctx.fillRect(x + 1, y + 2, 7, 10);
  ctx.fillStyle = col[2]; ctx.fillRect(x + 1, y + 4, 7, 6); ctx.fillRect(x + 2, y + 3, 5, 8);
  ctx.fillStyle = col[1]; ctx.fillRect(x + 2, y + 4, 5, 6); ctx.fillRect(x + 3, y + 3, 3, 8);
  if (((f >> 3) & 3) === 0) { ctx.fillStyle = '#F8F8F8'; ctx.fillRect(x + 3, y + 5, 1, 2); }
}

{
  const render0 = Stage.prototype.renderGalaxy;
  Stage.prototype.renderGalaxy = function (ctx) {
    render0.call(this, ctx);
    const g = this.galaxy, f = this.frame;
    if (!g) return;
    ctx.save(); ctx.translate(FX, FY); ctx.beginPath(); ctx.rect(0, 0, VIEW_W, VIEW_H); ctx.clip();
    // twins beside their ships
    for (const t of this.tanks) {
      if (!t.alive || !t.isPlayer || t.ally || !t.player || !(t.player.gx && t.player.gx.twin)) continue;
      const x = gxTwinX(t), y = t.y + Math.round(Math.sin(f / 12) * 1);
      ctx.fillStyle = (f >> 1) & 1 ? '#F8B800' : '#F83800'; ctx.fillRect(x + 5, y + 16, 2, 2 + ((f >> 1) & 1)); ctx.fillRect(x + 9, y + 16, 2, 2 + ((f >> 2) & 1));
      ctx.drawImage(Sprites.tank('p' + (t.player.level || 0), t.anim || 0, 0, Config.playerPal(t.player.i)), x, y);
    }
    // a ship being carried up (red, spinning), a freed one flying home
    for (const w of g.tows) ctx.drawImage(Sprites.tank('p' + (w.lv || 0), 0, (w.t >> 3) & 3, 'red'), Math.round(w.x - 8), Math.round(w.y - 8));
    for (const fr of g.frees) if ((fr.t >> 1) & 1 || fr.t > 30) ctx.drawImage(Sprites.tank('p' + (fr.lv || 0), (fr.t >> 2) & 1, 0, Config.playerPal(fr.o)), Math.round(fr.x - 8), Math.round(fr.y - 8));
    // the challenge stage's count
    if (g.chalShow >= 0) { const s = 'HITS ' + g.chalShow; ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(VIEW_W / 2 - s.length * 4 - 2, 1, s.length * 8 + 4, 10); Font.drawCenter(ctx, s, VIEW_W / 2, 2, '#58F8F8'); }
    // the medals under the banner
    if (g.medalShow) {
      const list = g.medalShow.list, y0 = VIEW_H / 2 - 4;
      list.forEach(([k, text], i) => {
        if (100 - g.medalShow.t < i * 12) return;   // they pop up one after another
        const w = 12 + text.length * 8, x = Math.round(VIEW_W / 2 - w / 2), y = y0 + i * 14;
        ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(x - 3, y - 1, w + 6, 14);
        gxDrawMedal(ctx, k, x, y, f);
        Font.draw(ctx, text, x + 12, y + 3, k === 'nohit' ? '#A8E8F8' : k === 'speed' ? '#B8F8B8' : k === 'perfect' ? '#F8B8F8' : COL.gold);
      });
    }
    ctx.restore();
  };
}
