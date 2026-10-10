'use strict';
// =====================================================================
//  GALAXY: two more sectors before THE LAST BASE (CATS stays the finale), each with its own enemies, waves, gimmick,
//  boss, sky and music (chiptune, rock and synthwave).
//    MARS HIGHWAY  a neon highway to Mars floating in red dust: lane markings racing by, billboards, Mars ahead with
//                  rockets taking off from and landing on its pads
//       enemies  ROBOTAXIS (they change lanes without signalling: a wobble and a red lidar, then they're over),
//                TRAFFIC CONES (on the road, they come at you at road speed), DELIVERY DRONES (the sector's drones:
//                they drop parcels), BOOSTERS (they drop back from space and land upright where the pad shows)
//       waves    MARS RUSH HOUR (rows of robotaxis, a gap in each; sometimes a car slips into the gap and opens
//                its own lane), CONE ZONE (a slalom of cone walls from alternate sides), BOOSTER LANDING (landing
//                pads round you, then boosters come down on them), RECALL NOTICE (parked robotaxis get recalled
//                one by one: reversing lights, then they reverse at speed down their column), TUNNEL (a dark
//                boring tunnel squeezes the screen and sways; traffic and cones in it)
//       gimmick  SPEEDERS: now and then a hot rod tears down a lane (its lane flashes first, a honk)
//       boss     ELON ON THE CYBERCAB: a rocket billionaire in a black T-shirt hunched over the wheel of a boxy
//                steel robotaxi that can't drive itself, so he drives it himself. It swerves lane to lane. HONK
//                (a cone of sound waves), POSTS (speech bubbles that burst into their letters), SWERVE (it cuts
//                across the road dropping a line of cones with a gap), NOT A FLAMETHROWER (fire columns);
//                phase 2 FULL SELF-DRIVING BETA (hands off the wheel: it careens about the top half) and MINI
//                ROCKETS (up, then down on the crosshairs); phase 3 PLAID MODE (a steel wedge on rocket boosters
//                that dashes down your lane). Beaten, the cab breaks down and he calls a tow
//    THE DESKTOP   a 1995 desktop in space: a teal backdrop, desktop icons, a taskbar with a START button, the
//                  busy hourglass wandering about, a pipes screensaver growing in the background
//       enemies  ERROR DIALOGS (only the OK button can be shot: the rest stops your shots), CURSORS (the sector's
//                drones: they dive), HOURGLASSES (their sand freezes you for a moment), the HELPER (a paperclip
//                with eyes that hovers over you, in the way of your shots, and gives tips), FLOPPY DISKS
//       waves    POP-UP STORM (dialogs pop up faster and faster), SCREENSAVER: PIPES (pipes grow across the screen
//                as moving walls), DEFRAG (a grid of blocks rearranging itself; bad sectors drop on you),
//                MINESWEEPER (a field of tiles comes down: shoot a way through; numbers say how many mines are
//                next to a tile; a mine you shoot bursts), DIAL-UP (a noisy connection: everything slows down,
//                you too)
//       gimmick  SELECT AND DELETE: a cursor drags a selection box round you... then DELETE (get out of it)
//       boss     WINDOWS 95: a giant window with a waving four-colour flag and a START button, dragged about
//                by a cursor. START MENU (it unfolds and every item fires), CASCADE WINDOWS (windows stack
//                diagonally across your zone as walls), BLUE SCREEN (screen-wide walls with a gap), SOLITAIRE
//                VICTORY (bouncing cards leaving trails), ERROR (dialogs); phase 3 it lags: NOT RESPONDING
//                (frozen, then everything at once). Beaten: IT IS NOW SAFE TO TURN OFF YOUR COMPUTER.
//  Parody only: no logos copied, no real sounds or tunes: every melody here is new.
// =====================================================================

// ------------------------------------------------------------------ two more sectors, before THE LAST BASE
const GX4C_NONE = ['#000000', '#000000', '#000000'];
const GX4C_MARS = { name: 'MARS HIGHWAY', sky: '#0C0408', dust: '#7C3C24', planet: GX4C_NONE, noPlanet: true, bg: (c, f, g) => gx4cBgMars(c, f, g),
  swap: { drone: 'gx4cDel' }, song: 'gx4cMars', bossSong: 'gx4cBossMars' };
const GX4C_DESK = { name: 'THE DESKTOP', sky: '#007474', dust: '#3CA8A8', planet: GX4C_NONE, noPlanet: true, bg: (c, f, g) => gx4cBgDesk(c, f, g),
  swap: { drone: 'gx4cCur' }, song: 'gx4cDesk', bossSong: 'gx4cBossDesk' };
// where they go: just before THE LAST BASE, wherever that is by now (the other new sectors load first)
const GX4C_AT = (() => { const i = GX_SECTORS.findIndex(s => s.name === 'THE LAST BASE'); return i < 0 ? GX_SECTORS.length : i; })();
GX_SECTORS.splice(GX4C_AT, 0, GX4C_MARS, GX4C_DESK);
GX_PLAN.splice(GX4C_AT, 0,
  ['gx4cCones', 'gx4cRush', 'formation', 'gx4cLanding', 'gx4cRecall', 'gx4cTunnel'],
  ['gx4cPopups', 'formation', 'gx4cPipes', 'gx4cMines', 'gx4cDefrag', 'gx4cDialup'],
);
Object.assign(GX_WAVE_NAMES, { gx4cRush: 'MARS RUSH HOUR', gx4cCones: 'CONE ZONE', gx4cLanding: 'BOOSTER LANDING', gx4cRecall: 'RECALL NOTICE', gx4cTunnel: 'TUNNEL',
  gx4cPopups: 'POP-UP STORM', gx4cPipes: 'SCREENSAVER: PIPES', gx4cDefrag: 'DEFRAG', gx4cMines: 'MINESWEEPER', gx4cDialup: 'DIAL-UP' });
GX_ALL_WAVES.push('gx4cRush', 'gx4cCones', 'gx4cLanding', 'gx4cRecall', 'gx4cTunnel', 'gx4cPopups', 'gx4cPipes', 'gx4cDefrag', 'gx4cMines', 'gx4cDialup');
const gx4cIs = (g, s) => !!g && GX_SECTORS[g.sec] === s;
// the flash and hurt palettes reach the bigger palettes' slots too (8-19), so nothing goes see-through when hit
for (const k of ['f', 'r']) { const P = BOSS_PALS[k]; while (P.length < 20) P.push(k === 'f' ? '#FFFFFF' : P[2]); }

// ------------------------------------------------------------------ sounds (Sound.play('gx4c...'): they follow the volume, mute, and reach online guests)
function gx4cSfx(S, name, t) {
  switch (name) {
    // MARS HIGHWAY
    case 'gx4cHonk': for (const d of [0, 0.26]) { S.note(64, t + d, 0.2, { vol: 0.1, flat: true, wave: 'p25' }); S.note(68, t + d, 0.2, { vol: 0.07, flat: true, wave: 'p50' }); S.note(71, t + d, 0.2, { vol: 0.05, flat: true, wave: 'p12' }); } break;
    case 'gx4cScreech': S.noise(9000, t, [[0, 0.1], [0.25, 0.07], [0.32, 0]], 6000); S.note(2600, t, 0.3, { vol: 0.03, slideTo: 1900, wave: 'p12', flat: true }); break;
    case 'gx4cBoost': S.noise(1200, t, [[0, 0.04], [0.3, 0.25], [0.7, 0.2], [0.9, 0]], 500); break;
    case 'gx4cLand': S.note(45, t, 0.25, { vol: 0.2, slideTo: 50, wave: 'tri' }); S.noise(3000, t, [[0, 0.35], [0.45, 0]], 700); break;
    case 'gx4cFlame': S.noise(2200, t, [[0, 0.22], [0.55, 0.18], [0.75, 0]], 1300); break;
    case 'gx4cPost': S.seq([84, 91, 96], 0.045, t, { vol: 0.06, wave: 'p25', decayTo: 0.5 }); break;
    case 'gx4cFsd': S.seq([76, 72, 76, 72, 79], 0.08, t, { vol: 0.08, wave: 'p50', decayTo: 0.6 }); break;
    case 'gx4cRocket': S.note(400, t, 0.4, { slideTo: 1600, vol: 0.06, wave: 'p25' }); S.noise(6000, t, [[0, 0.15], [0.4, 0]], 2000); break;
    case 'gx4cBoom': S.noise(1500, t, [[0, 0.5], [0.25, 0.2], [0.4, 0]], 300); S.note(50, t, 0.2, { vol: 0.12, slideTo: 40, wave: 'tri' }); break;
    case 'gx4cTow': S.seq([88, 84, 88, 84, 88, 84, 0, 0, 88, 84, 88, 84, 88, 84], 0.045, t, { vol: 0.05, wave: 'p50', flat: true }); break;
    case 'gx4cCone': S.note(900, t, 0.07, { slideTo: 450, vol: 0.06, wave: 'p25' }); break;
    case 'gx4cRecall': S.seq([83, 0, 83, 0, 83, 0, 83], 0.08, t, { vol: 0.06, wave: 'p50', flat: true }); break;
    case 'gx4cPlaid': S.note(200, t, 0.9, { slideTo: 2200, vol: 0.09, wave: 'p25' }); S.noise(2000, t, [[0, 0.05], [0.8, 0.3], [1.0, 0]], 9000); break;
    case 'gx4cRev': S.note(90, t, 0.35, { slideTo: 260, vol: 0.08, wave: 'p50' }); S.noise(1800, t, [[0, 0.12], [0.35, 0]], 3000); break;
    // THE DESKTOP
    case 'gx4cDing': S.seq([79, 74], 0.12, t, { vol: 0.1, wave: 'p50', decayTo: 0.5 }); S.note(91, t, 0.12, { vol: 0.03, wave: 'p12', decayTo: 0.4 }); break;
    case 'gx4cClick': S.noise(16000, t, [[0, 0.16], [0.015, 0]]); S.noise(16000, t + 0.09, [[0, 0.16], [0.015, 0]]); break;
    case 'gx4cPop': S.note(600, t, 0.05, { slideTo: 1300, vol: 0.05, wave: 'p25' }); break;
    case 'gx4cFreeze': S.note(1500, t, 0.3, { slideTo: 300, vol: 0.06, wave: 'p12' }); S.noise(12000, t, [[0, 0.08], [0.3, 0]]); break;
    case 'gx4cModem':
      S.seq([84, 88, 81, 86, 90, 83, 87, 80], 0.06, t, { vol: 0.05, wave: 'p50', flat: true });
      S.note(1750, t + 0.55, 0.35, { vol: 0.05, slideTo: 2300, wave: 'p50', flat: true });
      S.noise(11000, t + 0.95, [[0, 0.1], [0.25, 0.04], [0.3, 0.1], [0.55, 0.05], [0.7, 0]]);
      S.note(980, t + 0.95, 0.7, { vol: 0.04, slideTo: 1400, wave: 'p25', flat: true }); S.note(2900, t + 1.2, 0.45, { vol: 0.025, slideTo: 2500, wave: 'p12', flat: true });
      break;
    case 'gx4cMine': S.noise(800, t, [[0, 0.55], [0.3, 0.2], [0.5, 0]], 200); S.note(45, t, 0.3, { vol: 0.16, slideTo: 35, wave: 'tri' }); break;
    case 'gx4cReveal': S.note(1500 + rnd(400), t, 0.03, { vol: 0.04, wave: 'p12', flat: true }); break;
    case 'gx4cPipe': S.note(70 + rnd(6), t, 0.08, { vol: 0.05, wave: 'tri', decayTo: 0.5 }); break;
    case 'gx4cBsod': S.note(40, t, 0.45, { vol: 0.12, wave: 'p50', flat: true }); S.noise(5000, t, [[0, 0.1], [0.4, 0.05], [0.45, 0]]); break;
    case 'gx4cCard': S.noise(8000, t, [[0, 0.1], [0.03, 0]]); S.note(1400 + rnd(300), t, 0.05, { vol: 0.04, wave: 'p25' }); break;
    case 'gx4cStart': S.seq([72, 76, 79, 84], 0.04, t, { vol: 0.07, wave: 'p25', decayTo: 0.5 }); break;
    case 'gx4cShut': S.seq([79, 76, 72, 67, 64, 60], 0.12, t, { vol: 0.1, wave: 'p50', decayTo: 0.6 }); S.note(48, t + 0.72, 0.6, { vol: 0.12, wave: 'tri', decayTo: 0.4 }); break;
    case 'gx4cDrag': S.noise(5000, t, [[0, 0.05], [0.2, 0]], 9000); break;
    case 'gx4cDelete': S.noise(2500, t, [[0, 0.3], [0.15, 0.1], [0.25, 0]], 700); S.note(300, t, 0.2, { slideTo: 80, vol: 0.08, wave: 'p25' }); break;
    case 'gx4cHelp': S.note(500, t, 0.12, { slideTo: 900, vol: 0.07, wave: 'p25' }); S.note(900, t + 0.13, 0.1, { slideTo: 700, vol: 0.06, wave: 'p25' }); break;
    case 'gx4cHang': S.seq([60, 60, 60, 60], 0.1, t, { vol: 0.07, wave: 'p50', flat: true }); break;
    case 'gx4cBurst': S.seq([96, 84, 96, 79], 0.03, t, { vol: 0.06, wave: 'p12', flat: true }); S.noise(3000, t, [[0, 0.3], [0.3, 0]], 600); break;
    case 'gx4cDisk': S.noise(4000, t, [[0, 0.1], [0.04, 0], [0.08, 0.1], [0.12, 0]]); break;
  }
}
{
  const play0 = Sound.play;
  Sound.play = function (name) {
    if (typeof name === 'string' && name.startsWith('gx4c') && Sound.ctx && !Sound.muted && Sound.master.gain.value > 0) gx4cSfx(Sound, name, Sound.ctx.currentTime + 0.005);
    return play0.apply(this, arguments);
  };
}

// ------------------------------------------------------------------ helpers
const GX4C_ROAD = 0.9;   // how fast the road (and what stands on it) goes by, pixels a frame: the lane markings too
const gx4cLanes = () => Math.max(6, Math.round(FW / 26));
const gx4cLaneW = () => FW / gx4cLanes();
const gx4cLaneX = i => (i + 0.5) * gx4cLaneW();
const gx4cLaneOf = x => Math.max(0, Math.min(gx4cLanes() - 1, Math.floor(x / gx4cLaneW())));
const gx4cClamp = (x, m) => Math.max(m, Math.min(FW - m, x));
const gx4cPick = a => a[rnd(a.length)];
const gx4cLetter = ch => (GX_BULLET_DRAW['t' + ch] ? 't' + ch : 'tX');
const gx4cSay = (st, x, y, text, color = '#F8F8F8', life = 50) => st.popups.push({ x, y, text, label: true, color, t: 0, delay: 0, life });
// a sector's own state, kept on the galaxy (and sent to online guests): the tunnel, the dial-up lag, a selection box
const gx4cS = g => g.gx4c || (g.gx4c = { tun: 0, tt: 0, lag: 0, sel: null, selT: 600, spT: 500 });
// the tunnel: how far it's closed (0 open .. 1), its middle, its half width
const gx4cTunCx = g => FW / 2 + Math.sin(((g.gx4c && g.gx4c.tt) || 0) / 150) * Math.min(30, FW * 0.14) * Math.min(1, ((g.gx4c && g.gx4c.tun) || 0) * 1.5);
const gx4cTunHw = g => FW / 2 - (FW / 2 - 50) * (((g.gx4c && g.gx4c.tun) || 0));
// the tiny 3x5 font (galaxy_prog.js) wants a few more marks here: ? . : ' ( ) / , _
const GX4C_TINY_MORE = { '?': '61202', '.': '00002', ':': '02020', "'": '22000', '(': '12221', ')': '42224', '/': '11244', ',': '00024', '_': '00007' };
const gx4cTiny = (c, text, cx, y, col, sh = null) => {
  if (typeof gxTiny !== 'function') return;
  if (typeof GX_TINY !== 'undefined' && !GX_TINY['?']) for (const k in GX4C_TINY_MORE) if (!GX_TINY[k]) GX_TINY[k] = GX4C_TINY_MORE[k];
  gxTiny(c, text, cx, y, col, sh);
};
// and the big font a few: ( ) $ (FULL SELF-DRIVING (SUPERVISED), $99)
Object.assign(FONT_SRC, Object.fromEntries(Object.entries({
  '(': ['...X.', '..X..', '.X...', '.X...', '.X...', '..X..', '...X.'],
  ')': ['.X...', '..X..', '...X.', '...X.', '...X.', '..X..', '.X...'],
  '$': ['..X..', '.XXXX', 'X.X..', '.XXX.', '..X.X', 'XXXX.', '..X..'],
}).filter(([k]) => !FONT_SRC[k])));
// pixel art: rows of characters, each looked up in a palette (a missing one is see-through)
function gx4cBits(ctx, rows, x, y, pal, s = 1) {
  for (let j = 0; j < rows.length; j++) for (let i = 0; i < rows[j].length; i++) { const c = pal[rows[j][i]]; if (c) { ctx.fillStyle = c; ctx.fillRect(x + i * s, y + j * s, s, s); } }
}
// a 3D-ish bevelled box (the old desktop's buttons and windows): out (raised) or pressed in
function gx4cBevel(ctx, x, y, w, h, face = '#C0C0C0', inset = false) {
  ctx.fillStyle = face; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = inset ? '#404040' : '#F8F8F8'; ctx.fillRect(x, y, w, 1); ctx.fillRect(x, y, 1, h);
  ctx.fillStyle = inset ? '#F8F8F8' : '#404040'; ctx.fillRect(x, y + h - 1, w, 1); ctx.fillRect(x + w - 1, y, 1, h);
  if (w > 4 && h > 4) { ctx.fillStyle = inset ? '#808080' : '#808080'; if (inset) { ctx.fillRect(x + 1, y + 1, w - 2, 1); ctx.fillRect(x + 1, y + 1, 1, h - 2); } else { ctx.fillRect(x + 1, y + h - 2, w - 2, 1); ctx.fillRect(x + w - 2, y + 1, 1, h - 2); } }
}
// a little window: a frame, a navy title bar with a title and a close box, its inside (fill)
function gx4cWindow(ctx, x, y, w, h, title, fill = '#F8F8F8', active = true) {
  gx4cBevel(ctx, x, y, w, h);
  ctx.fillStyle = active ? '#000080' : '#808080'; ctx.fillRect(x + 2, y + 2, w - 4, 7);
  if (active) { ctx.fillStyle = '#1084D0'; for (let i = Math.floor((w - 4) / 2); i < w - 4; i += 2) ctx.fillRect(x + 2 + i, y + 2 + ((i >> 1) & 1), 1, 1); }
  if (title) gx4cTiny(ctx, title, x + 3 + title.length * 2, y + 3, '#F8F8F8');
  gx4cBevel(ctx, x + w - 9, y + 3, 6, 5); ctx.fillStyle = '#000000'; ctx.fillRect(x + w - 8, y + 4, 1, 1); ctx.fillRect(x + w - 5, y + 4, 1, 1); ctx.fillRect(x + w - 7, y + 5, 2, 1); ctx.fillRect(x + w - 8, y + 6, 1, 1); ctx.fillRect(x + w - 5, y + 6, 1, 1);
  if (fill) { ctx.fillStyle = fill; ctx.fillRect(x + 2, y + 10, w - 4, h - 12); }
}
// the parody flag: four panes (red, green, blue, yellow) waving, in a w x h box at (x, y); t: the wave
function gx4cFlag(ctx, x, y, w, h, t, trail = true) {
  const cols = ['#F83800', '#38B838', '#2850F8', '#F8D800'], hw = Math.floor(w / 2) - 1, hh = Math.floor(h / 2) - 1;
  for (let i = 0; i < w; i++) {
    const dy = Math.round(Math.sin(i * 0.28 - t / 7) * 2 + i * 0.08);
    for (const [k, y0] of [[0, 0], [2, hh + 2]]) {
      const col = cols[k + (i > hw ? 1 : 0)];
      if (i === hw || i === hw + 1) continue;
      ctx.fillStyle = col; ctx.fillRect(x + i, y + y0 + dy, 1, hh);
    }
  }
  if (trail) for (let k = 0; k < 4; k++) { const tx = x - 4 - k * 3, ty = y + 2 + k * 2 + Math.round(Math.sin(k - t / 7) * 2); ctx.fillStyle = cols[k]; ctx.fillRect(tx, ty, 2, 2); ctx.fillRect(tx - 1, ty + hh, 2, 2); }
}

// ------------------------------------------------------------------ the new enemies
{
  const A = GX4C_AT, B = GX4C_AT + 1;
  Object.assign(GX_TYPES, {
    // MARS HIGHWAY
    gx4cDel: { w: 12, h: 10, hp: 1, pts: 60, from: A, special: true },                 // a delivery drone (the sector's drones)
    gx4cRobo: { w: 14, h: 22, hp: 3, pts: 150, from: A, special: true },               // a robotaxi
    gx4cCone: { w: 8, h: 10, hp: 1, pts: 40, from: A, special: true, noFire: true },   // a traffic cone, on the road
    gx4cBoost: { w: 10, h: 30, hp: 7, pts: 300, from: A, special: true, noFire: true },
    gx4cSpeed: { w: 12, h: 22, hp: 5, pts: 250, from: 99, special: true, noFire: true },
    gx4cPost: { w: 26, h: 16, hp: 3, pts: 200, from: 99, special: true, noFire: true },
    gx4cMiniR: { w: 6, h: 12, hp: 2, pts: 100, from: 99, special: true, noFire: true },
    gx4cWreck: { w: 1, h: 1, hp: 1e9, pts: 0, from: 99, special: true, noFire: true },
    gx4cChCar: { w: 12, h: 10, hp: 1, pts: 100, from: 99, special: true, chal: true },
    // THE DESKTOP
    gx4cCur: { w: 10, h: 12, hp: 1, pts: 60, from: B, special: true },                 // a mouse cursor (the sector's drones)
    gx4cErr: { w: 12, h: 7, hp: 2, pts: 200, from: B, special: true },                 // an error dialog: this is its OK button
    gx4cHour: { w: 10, h: 14, hp: 3, pts: 150, from: B, special: true },
    gx4cClip: { w: 12, h: 18, hp: 6, pts: 300, from: B, special: true },
    gx4cFlop: { w: 12, h: 12, hp: 2, pts: 100, from: B, special: true },
    gx4cPipe: { w: 1, h: 1, hp: 1e9, pts: 0, from: 99, special: true, noFire: true },
    gx4cBlk: { w: 14, h: 10, hp: 2, pts: 60, from: 99, special: true },
    gx4cField: { w: 1, h: 1, hp: 1e9, pts: 0, from: 99, special: true, noFire: true },
    gx4cWin: { w: 44, h: 30, hp: 8, pts: 300, from: 99, special: true, noFire: true },
    gx4cSafe: { w: 1, h: 1, hp: 1e9, pts: 0, from: 99, special: true, noFire: true },
    gx4cChFlop: { w: 12, h: 12, hp: 1, pts: 100, from: 99, special: true, chal: true },
  });
}
Object.assign(GX_PALS, {
  gx4cDel: [null, '#E8E8E8', '#A8A8B8', '#585868', '#F8F8F8', '#F83800', '#C8884C', '#100C10', '#8C5824'],
  gx4cRobo: [null, '#F8F8F8', '#D0D4DC', '#8088A0', '#F8F8F8', '#F8F8B8', '#182030', '#080810', '#F83800', '#58F8F8', '#3C5070'],
  gx4cSpeed: [null, '#F89878', '#D82800', '#7C0800', '#F8F8F8', '#F8F8B8', '#182030', '#100404', '#F8D800', '#F87800'],
  gx4cChCar: [null, '#F8F8F8', '#D0D4DC', '#8088A0', '#F8F8F8', '#F8F8B8', '#182030', '#080810', '#F83800', '#58F8F8', '#3C5070'],
  gx4cCur: [null, '#F8F8F8', '#F8F8F8', '#BCBCBC', '#F8F8F8', '#F83800', '#000000', '#000000'],
  gx4cHour: [null, '#F8E0A0', '#C8A050', '#7C5420', '#F8F8F8', '#F8D878', '#A8D8F8', '#100808'],
  gx4cClip: [null, '#F8F8F8', '#C8CCD8', '#7C8098', '#F8F8F8', '#000000', '#F8F8D8', '#100810', '#F83800'],
  gx4cFlop: [null, '#5C78E8', '#2C3CA8', '#141C5C', '#F8F8F8', '#C8C8C8', '#7C7C7C', '#04040C', '#F8D800'],
  gx4cChFlop: [null, '#E85C78', '#A82C48', '#5C1420', '#F8F8F8', '#C8C8C8', '#7C7C7C', '#0C0404', '#F8D800'],
});
Object.assign(GX_DRAW, {
  // a quadcopter with a parcel hanging under it (f: the rotors turning)
  gx4cDel(f) {
    const P = bossPainter(12, 10);
    P.line(2, 1, 9, 7, 3); P.line(9, 1, 2, 7, 3);
    for (const [x, y] of [[1, 1], [10, 1], [1, 7], [10, 7]]) { if (f) P.line(x - 1, y, x + 1, y, 1); else P.line(x, y - 1, x, y + 1, 1); P.px(x, y, 4); }
    P.rect(4, 2, 7, 4, 2); P.px(4, 2, 1); P.px(5, 3, 5); P.px(6, 3, 5);
    P.rect(4, 6, 7, 9, 6); P.line(5, 6, 5, 9, 8); P.px(6, 7, 1);
    P.outline(); return P.g;
  },
  // a boxy robotaxi seen from above, driving down at you: a glass canopy, a lidar spinning on its roof
  gx4cRobo(f) {
    const P = bossPainter(14, 22);
    P.rect(1, 3, 12, 18, 2); P.rect(2, 1, 11, 2, 2); P.rect(2, 19, 11, 20, 2);
    P.rect(1, 3, 1, 18, 1); P.rect(2, 1, 11, 1, 1); P.rect(12, 3, 12, 18, 3); P.rect(2, 20, 11, 20, 3);
    P.rect(3, 5, 10, 16, 6); P.rect(3, 16, 10, 16, 10); P.px(4, 6, 10); P.px(5, 6, 10); P.px(4, 7, 10); P.line(9, 6, 6, 9, 10);
    P.rect(5, 9, 8, 12, 3); P.rect(6, 10, 7, 11, 2); P.px(f ? 5 : 8, f ? 10 : 11, 9); P.px(f ? 8 : 5, f ? 11 : 10, 9);
    P.rect(2, 20, 4, 20, 5); P.rect(9, 20, 11, 20, 5); P.rect(2, 1, 3, 1, 8); P.rect(10, 1, 11, 1, 8);
    for (const [x, y] of [[0, 4], [13, 4], [0, 15], [13, 15]]) P.rect(x, y, x, y + 2, 7);
    P.outline(); return P.g;
  },
  // a hot rod: red, flames up its bonnet, fat tyres
  gx4cSpeed(f) {
    const P = bossPainter(12, 22);
    P.rect(1, 2, 10, 20, 2); P.rect(2, 1, 9, 1, 2); P.rect(2, 21, 9, 21, 3);
    P.rect(1, 2, 1, 20, 1); P.rect(10, 2, 10, 20, 3);
    P.rect(3, 4, 8, 9, 6); P.px(4, 5, 4);
    for (let y = 11; y < 21; y++) { const w = Math.round(2 + Math.sin(y * 1.3 + f) * 1.5); P.rect(6 - w, y, 5 + w, y, y % 3 ? 8 : 9); }
    P.rect(2, 21, 3, 21, 5); P.rect(8, 21, 9, 21, 5);
    for (const [x, y] of [[0, 3], [11, 3], [0, 15], [11, 15]]) P.rect(x, y, x, y + 3, 7);
    P.outline(); return P.g;
  },
  // a little robotaxi for the challenge stage
  gx4cChCar(f) {
    const P = bossPainter(12, 10);
    P.rect(1, 1, 10, 8, 2); P.rect(1, 1, 10, 1, 1); P.rect(1, 8, 10, 8, 3); P.rect(3, 3, 8, 6, 6); P.px(f ? 4 : 7, 4, 9);
    P.px(1, 2, 5); P.px(10, 2, 5); P.px(1, 7, 8); P.px(10, 7, 8);
    P.outline(); return P.g;
  },
  // THE DESKTOP: an arrow cursor (f: a click, the tip flashing)
  gx4cCur(f) {
    const rows = ['X.........', 'XX........', 'X1X.......', 'X11X......', 'X111X.....', 'X1111X....', 'X11111X...', 'X111111X..', 'X1111XXXX.', 'X11X11X...', 'XX.X11X...', 'X...X11X..'];
    const P = bossPainter(10, 12);
    rows.forEach((r, y) => [...r].forEach((ch, x) => { if (ch === 'X') P.px(x, y, 6); else if (ch === '1') P.px(x, y, f && y < 4 ? 5 : 1); }));
    return P.g;
  },
  // an hourglass, its sand running (f)
  gx4cHour(f) {
    const P = bossPainter(10, 14);
    P.rect(0, 0, 9, 1, 3); P.rect(0, 12, 9, 13, 3); P.rect(0, 0, 9, 0, 1); P.rect(0, 12, 9, 12, 1);
    for (let y = 2; y < 12; y++) { const w = Math.round(1 + Math.abs(y - 6.5) * 0.75); P.rect(5 - w, y, 4 + w, y, 6); }
    for (let y = 3 + f; y < 6; y++) { const w = Math.max(0, Math.round(Math.abs(y - 6.5) * 0.75) - 1); P.rect(5 - w, y, 4 + w, y, 5); }
    for (let y = 9 - f; y < 12; y++) { const w = Math.round(Math.abs(y - 6.5) * 0.75); P.rect(5 - w, y, 4 + w, y, 2); }
    P.px(4, 7, 5); P.px(5, 8, 5); P.px(2, 3, 4);
    return P.g;
  },
  // the helper: a bent wire clip with big round eyes and raised brows (a generic one)
  gx4cClip(f) {
    const P = bossPainter(12, 18);
    const path = [[3, 16], [3, 4], [5, 2], [8, 2], [10, 4], [10, 14], [8, 16], [6, 14], [6, 6]];
    for (let k = 1; k < path.length; k++) P.line(path[k - 1][0], path[k - 1][1], path[k][0], path[k][1], 2);
    for (let k = 1; k < 4; k++) P.line(path[k - 1][0] - 1, path[k - 1][1], path[k][0] - 1, path[k][1], 1);
    for (const [x, y] of [[2, 8], [9, 7]]) { P.rect(x - 1, y - 1, x + 1, y + 1, 6); P.px(x + (f ? 0 : 1), y + (f ? 1 : 0), 5); }
    P.line(0, 5 - f, 3, 5, 5); P.line(8, 4, 11, 4 - f, 5);
    P.outline(); return P.g;
  },
  // a floppy disk turning over (f: which face)
  gx4cFlop(f) {
    const P = bossPainter(12, 12);
    P.rect(0, 0, 11, 11, 2); P.rect(0, 0, 11, 0, 1); P.rect(0, 0, 0, 11, 1); P.px(11, 0, 3); P.px(0, 11, 3);
    if (!f) { P.rect(3, 0, 8, 4, 5); P.rect(6, 1, 7, 3, 6); P.rect(2, 6, 9, 11, 4); P.line(3, 8, 8, 8, 6); P.line(3, 10, 7, 10, 6); }
    else { P.rect(3, 0, 8, 4, 5); P.rect(4, 1, 5, 3, 6); P.disc(6, 7.5, 2.2, 3); P.px(6, 7, 6); P.px(1, 10, 8); }
    P.outline(); return P.g;
  },
  gx4cChFlop(f) { return GX_DRAW.gx4cFlop(f); },
});
// the challenge stages here: little robotaxis on the highway, floppy disks on the desktop
for (const k of ['gx4cChCar', 'gx4cChFlop']) {
  GX_COLLIDE[k] = () => false;
  GX_ON_KILL[k] = function (e, p, g) { return GX_ON_KILL.chA ? GX_ON_KILL.chA.call(this, e, p, g) : false; };
  GX_FIRE[k] = () => 1e9;
}
{
  const next0 = Stage.prototype.gxNextWave;
  Stage.prototype.gxNextWave = function () {
    const r = next0.apply(this, arguments), g = this.galaxy;
    const t = gx4cIs(g, GX4C_MARS) ? 'gx4cChCar' : gx4cIs(g, GX4C_DESK) ? 'gx4cChFlop' : null;
    if (t && g.phase === 'wave' && g.kind === 'challenge') for (const q of g.spawnQ) if (GX_TYPES[q.type] && GX_TYPES[q.type].chal) q.type = t;
    return r;
  };
}

// ------------------------------------------------------------------ MARS HIGHWAY: how they move
Object.assign(GX_MOVES, {
  // a robotaxi down its lane; now and then it changes lane without signalling (a wobble and a red lidar first);
  // in the tunnel it keeps to the tunnel (off: from its middle)
  gx4cLane: Object.assign(function (e, g) {
    e.y += e.spd;
    if (e.k === 0 && e.y > 4 && ((e.swY !== undefined && e.y >= e.swY) || (e.swAt !== undefined && e.t >= e.swAt))) {
      e.swY = e.swAt = undefined;
      const lw = gx4cLaneW();
      const cand = e.want !== undefined ? [e.want] : e.tun ? [e.off - lw, e.off + lw].filter(o => Math.abs(o) <= lw + 1)
        : [e.off - lw, e.off + lw].filter(o => o > 4 && o < FW - 4 && !g.list.some(q => q !== e && q.type === 'gx4cRobo' && Math.abs(q.off - o) < 4 && Math.abs(q.y - e.y) < 34));
      if (cand.length) { e.toOff = gx4cPick(cand); e.k = 1; e.kT = 0; }
    }
    if (e.k === 1 && ++e.kT >= 22) { e.k = 2; Sound.play('gx4cScreech'); if (!rnd(3)) gx4cSay(this, e.x, e.y - 14, gx4cPick(['NO SIGNAL!', 'OOPS', 'BEEP BOOP', 'MY LANE NOW']), '#F8D800', 45); }
    if (e.k === 2) { const d = e.toOff - e.off; if (Math.abs(d) <= 1.9) { e.off = e.toOff; e.k = 0; e.toOff = undefined; } else e.off += Math.sign(d) * 1.9; }
    e.x = (e.tun ? gx4cTunCx(g) : 0) + e.off + (e.k === 1 ? ((e.kT >> 1) & 1 ? 1 : -1) : 0);
    e.v = { k: e.k, d: e.toOff !== undefined ? Math.sign(e.toOff - e.off) : 0 };
    if (e.y > FH + 16) gxGone(e);
  }, { init(e, g) {
    if (e.off === undefined) e.off = gx4cLaneX(e.lane || 0);
    e.x = (e.tun ? gx4cTunCx(g) : 0) + e.off; e.y = -14; e.spd = e.spd || (0.95 + 0.2 * Math.min(1.5, g.shotSpd)); e.fireT = 1e9; e.k = 0; e.v = { k: 0 };
  } }),
  // parked in a row at the top, hazard lights on; recalled (k 1): the high beams flash, then it speeds off down its column
  gx4cPark: Object.assign(function (e) {
    if (e.k === 0) { e.x += (e.px - e.x) * 0.08; e.y += (e.py - e.y) * 0.08; if (Math.abs(e.py - e.y) < 1) e.parked = 1; }
    else if (e.k === 1) { if (++e.kT >= 50) { e.k = 2; e.vy = 1; Sound.play('gx4cRev'); } }
    else { e.vy = Math.min(3.8, e.vy + 0.14); e.y += e.vy; if (e.y > FH + 16) gxGone(e); }
    e.v = { k: e.k === 0 ? (e.parked ? 3 : 0) : e.k === 1 ? 4 : 5 };
  }, { init(e) { e.x = e.px; e.y = -14; e.k = 0; e.fireT = 90 + rnd(160); e.v = { k: 0 }; } }),
  // on the road: it comes at you at road speed (in the tunnel, with the tunnel)
  gx4cRoad: Object.assign(function (e, g) {
    e.y += GX4C_ROAD;
    if (e.tun) e.x = gx4cTunCx(g) + e.off;
    if (e.y > FH + 12) gxGone(e);
  }, { init(e, g) { if (e.tun) e.x = gx4cTunCx(g) + e.off; e.y = e.sy !== undefined ? e.sy : -8; e.fireT = 1e9; } }),
  // a booster: its landing pad shows (k 0), it drops (1), relights its engine and settles on the pad, a blast as it
  // lands (2), then it stands on the road and goes by (3)
  gx4cLand: Object.assign(function (e, g) {
    const v = e.v;
    if (v.k === 0) { if (++e.kT >= e.warn) { v.k = 1; e.kT = 0; e.x = v.tx; e.y = -20; e.vy = 4.2; Sound.play('gx4cBoost'); } return; }
    if (v.k === 1) {
      const land = v.ty - 14;
      if (land - e.y < 64) { v.b = 1; e.vy = Math.max(0.9, e.vy - 0.13); }
      e.y += e.vy;
      if (e.y >= land) { e.y = land; v.k = 2; e.kT = 0; v.b = 0; Sound.play('gx4cLand'); this.addFx(e.x, v.ty, Sprites.smallExp, 3); if (typeof gxShake === 'function') gxShake(g, 6, 1); }
    } else if (v.k === 2) {
      if (++e.kT < 12) for (const t of this.gxPlayers()) if (Math.hypot(t.x + 8 - e.x, t.y + 9 - v.ty) < 17) this.hitPlayer(t);
      if (e.kT >= 14) v.k = 3;
    } else { e.y += GX4C_ROAD * 0.75; v.ty += GX4C_ROAD * 0.75; }
    if (e.y > FH + 20) gxGone(e);
  }, { init(e, g) {
    const pl = this.gxPlayers(), t = pl.length ? pl[rnd(pl.length)] : null;
    const tx = Math.round(gx4cClamp((t ? t.x + 8 : FW / 2) + rnd(61) - 30, 12)), ty = Math.round(Math.max(FH * 0.45, Math.min(FH - 16, (t ? t.y + 9 : FH * 0.7) + rnd(31) - 15)));
    e.x = tx; e.y = -60; e.kT = 0; e.warn = e.warn || 72; e.fireT = 1e9; e.v = { k: 0, tx, ty, b: 0 };
  } }),
  // a speeding hot rod: its lane flashes at the top, a honk, then it tears down the lane
  gx4cSpeed: Object.assign(function (e) {
    if (e.warnT > 0) { if (--e.warnT === 0) Sound.play('gx4cHonk'); return; }
    e.y += 4.2; if (e.y > FH + 20) gxGone(e);
  }, { init(e) { e.x = gx4cLaneX(e.lane); e.y = -16; e.warnT = 56; e.fireT = 1e9; } }),
  // a post from the boss: out to its spot, then it bursts into its letters
  gx4cPostM: Object.assign(function (e) {
    if (e.t < 40) { e.x += (e.tx - e.x) * 0.08; e.y += (e.ty - e.y) * 0.08; } else e.y += Math.sin(e.t / 20) * 0.15;
    const left = e.life - e.t;
    e.v = { w: e.v.w, n: e.v.n, k: left < 45 ? 1 : 0 };
    if (left <= 0) this.gx4cPostBurst(e);
  }, { init(e) { e.x = e.sx ?? FW / 2; e.y = e.sy ?? 20; e.life = 150 + rnd(40); e.fireT = 1e9; } }),
  // a mini rocket: up and away (k 0), its crosshair on the ground (1), then down on it (2)
  gx4cMiniM: Object.assign(function (e) {
    const v = e.v;
    if (v.k === 0) { e.y -= 3.2; e.x += e.vx; if (e.y < -24) { v.k = 1; e.kT = 0; e.y = -40; } }
    else if (v.k === 1) { if (++e.kT >= 48) { v.k = 2; e.x = v.tx; e.y = -14; e.vy = 2; Sound.play('gx4cRocket'); } }
    else { e.vy = Math.min(5, e.vy + 0.25); e.y += e.vy; if (e.y >= v.ty) this.gx4cRocketBoom(e); }
  }, { init(e) { e.v = { k: 0, tx: e.tx, ty: e.ty }; e.fireT = 1e9; e.kT = 0; } }),
  // the broken-down cab: it smokes, he gets out and phones for a tow, a tow drone lifts it (him on the roof) away
  gx4cWreckM: function (e) {
    const v = e.v;
    v.t++;
    if (v.t === 40) Sound.play('gx4cTow');
    if (v.t > 190) v.y -= Math.min(2.4, (v.t - 190) * 0.05);
    if (v.t > 330 || v.y < -90) gxGone(e);
  },
});

// ------------------------------------------------------------------ how they shoot, touch, die
Object.assign(GX_FIRE, {
  // parcels, straight down: same-day delivery
  gx4cDel(e, g) { g.bullets.push({ x: e.x, y: e.y + 6, vx: 0, vy: 1.15 * g.shotSpd, k: 'gx4cBox' }); return Math.round((280 + rnd(260)) / Math.max(0.4, g.fireMul)); },
  // robotaxis only shoot while parked (a lidar ping at you)
  gx4cRobo(e, g, near) {
    if (e.st !== 'gx4cPark' || e.k !== 0 || !e.parked) return 1e9;
    this.gxAimed(e, near(e.x, e.y), 1.3);
    return Math.round((260 + rnd(240)) / Math.max(0.4, g.fireMul));
  },
  gx4cWreck: () => 1e9, gx4cPipe: () => 1e9, gx4cField: () => 1e9, gx4cSafe: () => 1e9,
});
const gx4cNear = (t, x, y, rx, ry) => Math.abs(t.x + 8 - x) < rx + 4 && Math.abs(t.y + 9 - y) < ry + 5;
Object.assign(GX_COLLIDE, {
  gx4cRobo: (e, t) => gx4cNear(t, e.x, e.y, 6, 10),
  gx4cSpeed: (e, t) => gx4cNear(t, e.x, e.y, 5, 10),
  gx4cCone: (e, t) => gx4cNear(t, e.x, e.y, 3, 4),
  gx4cBoost: (e, t) => !!e.v && e.v.k >= 1 && gx4cNear(t, e.x, e.y, 4, 14),
  gx4cMiniR: (e, t) => !!e.v && e.v.k === 2 && gx4cNear(t, e.x, e.y, 2, 5),
  gx4cPost: (e, t) => gx4cNear(t, e.x, e.y, 11, 6),
  gx4cWreck: () => false,
});
Object.assign(GX_ON_KILL, {
  gx4cCone(e) { this.addFx(e.x, e.y, Sprites.smallExp, 2); Sound.play('gx4cCone'); if (Math.random() < 0.08) this.gxDrop(e.x, e.y, 'coin'); return false; },
  gx4cBoost(e) { for (let k = 0; k < 3; k++) this.fx.push({ x: e.x + rnd(9) - 4, y: e.y - 12 + k * 12, frames: Sprites.bigExp, per: 4, tick: -k * 4 }); Sound.play('gx4cBoom'); },
  gx4cRobo(e) { if (!rnd(4)) gx4cSay(this, e.x, e.y - 12, gx4cPick(['RIDE CANCELLED', '1 STAR', 'REROUTING']), '#58F8F8', 45); },
  gx4cPost(e) { gx4cSay(this, e.x, e.y - 8, 'DELETED', '#A8E8F8', 45); },
  gx4cMiniR(e) { this.addFx(e.x, e.y, Sprites.smallExp, 3); Sound.play('gxPop'); return false; },
});
const GX4C_POSTS = ['LOL', 'SOON', '100%', 'WOW', 'TRUE!', '!!', 'HMM', 'NICE', 'EXACTLY', 'YES'];
Object.assign(Stage.prototype, {
  // a post bursts: its letters fly out every way
  gx4cPostBurst(e) {
    const g = this.galaxy, word = GX4C_POSTS[(e.v && e.v.w) || 0] + '!', n = 8, a0 = Math.random() * Math.PI / 4;
    g.list = g.list.filter(o => o !== e); e.dead = true;
    for (let i = 0; i < n; i++) { const a = a0 + i * Math.PI * 2 / n, ch = word[i % word.length]; g.bullets.push({ x: e.x, y: e.y, vx: Math.cos(a) * 1.1 * g.shotSpd, vy: Math.sin(a) * 1.1 * g.shotSpd, k: gx4cLetter(ch === ' ' ? '!' : ch) }); }
    this.addFx(e.x, e.y, Sprites.smallExp, 3);
    Sound.play('gx4cPost');
  },
  // a mini rocket comes down: a blast where its crosshair was (and, in the last phase, a few shots)
  gx4cRocketBoom(e) {
    const g = this.galaxy, b = g.boss;
    g.list = g.list.filter(o => o !== e); e.dead = true;
    for (const t of this.gxPlayers()) if (Math.hypot(t.x + 8 - e.x, t.y + 9 - e.v.ty) < 14) this.hitPlayer(t);
    this.fx.push({ x: e.x, y: e.v.ty, frames: BIG_EXPLOSION(), per: 3, tick: 0 });
    if (b && b.ph >= 3) for (let i = 0; i < 4; i++) { const a = Math.PI / 4 + i * Math.PI / 2; g.bullets.push({ x: e.x, y: e.v.ty, vx: Math.cos(a) * 0.9 * g.shotSpd, vy: Math.sin(a) * 0.9 * g.shotSpd, k: 'shot' }); }
    Sound.play('gx4cBoom');
    if (typeof gxShake === 'function') gxShake(g, 5, 1);
  },
});

// ------------------------------------------------------------------ MARS HIGHWAY: the waves
Object.assign(GX_WAVE_KINDS, {
  // rows of robotaxis in every lane but one; every other row a car next to the gap slips into it early on (its own
  // lane opens instead). The gap never moves far from the last one's
  gx4cRush(g, add, types, more) {
    const n = gx4cLanes(), rows = Math.round(6 * Math.min(1.5, more)), spd = 1.0 + 0.15 * Math.min(1.5, g.shotSpd);
    let gap = rnd(n);
    for (let r = 0; r < rows; r++) {
      gap = Math.max(0, Math.min(n - 1, gap - 2 + rnd(5)));
      const from = r % 2 ? (gap > 0 && (gap === n - 1 || rnd(2)) ? gap - 1 : gap + 1) : -1;
      for (let l = 0; l < n; l++) {
        if (l === gap) continue;
        add('gx4cRobo', { st: 'gx4cLane', lane: l, off: gx4cLaneX(l), spd, delay: 20 + r * 80, want: l === from ? gx4cLaneX(gap) : undefined, swY: l === from ? Math.round(FH * 0.05) : undefined });
      }
      if (from >= 0) gap = from;
    }
    for (let k = 0; k < 4; k++) add('drone', { st: 'enter', slot: [FW / 2 - 30 + k * 20, 14], from: k < 2 ? -1 : 1, delay: 30 + k * 10 });
  },
  // walls of cones from alternate sides: a slalom (or shoot your way through); robotaxis weaving about
  gx4cCones(g, add, types, more) {
    const walls = Math.round(7 * Math.min(1.5, more)), sp = 14;
    for (let w = 0; w < walls; w++) {
      const left = w % 2 === 0, len = Math.round(FW * (0.5 + 0.05 * (w % 3)) / sp);
      for (let i = 0; i < len; i++) add('gx4cCone', { st: 'gx4cRoad', x: left ? 7 + i * sp : FW - 7 - i * sp, delay: 10 + w * 72 });
    }
    for (let k = 0; k < 6; k++) add('drone', { st: 'enter', slot: [FW / 2 - 50 + k * 20, 18], from: k < 3 ? -1 : 1, delay: k * 8 });
    for (let k = 0; k < 4; k++) add('gx4cRobo', { st: 'gx4cLane', lane: rnd(gx4cLanes()), delay: 200 + k * 150, swAt: 50 + rnd(60) });
  },
  // boosters come back down on pads round you; delivery drones overhead
  gx4cLanding(g, add, types, more) {
    const n = Math.round(7 * more);
    for (let k = 0; k < n; k++) add('gx4cBoost', { st: 'gx4cLand', delay: 40 + k * 78 - (k % 3 === 2 ? 30 : 0) });
    for (let k = 0; k < 6; k++) add('drone', { st: 'enter', slot: [FW / 2 - 50 + k * 20, 20], from: k < 3 ? -1 : 1, delay: k * 8 });
  },
  // robotaxis park in rows; one by one they're recalled and speed off down their column
  gx4cRecall(g, add, types, more) {
    const cols = Math.max(4, Math.min(6, Math.floor((FW - 30) / 30))), x0 = (FW - (cols - 1) * 30) / 2, rows = more > 1.2 ? 3 : 2;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) add('gx4cRobo', { st: 'gx4cPark', px: x0 + c * 30, py: 18 + r * 26, delay: r * 40 + c * 10 });
    gx4cS(g).recT = 170;
  },
  // a boring tunnel closes in and sways; traffic and cones in it
  gx4cTunnel(g, add, types, more) {
    const n = Math.round(11 * more), lw = gx4cLaneW();
    for (let k = 0; k < n; k++) add('gx4cRobo', { st: 'gx4cLane', tun: 1, off: (k % 3 - 1) * lw, spd: 1.15, delay: 140 + k * 56, swAt: k % 3 === 1 ? 40 + rnd(50) : undefined });
    for (let k = 0; k < Math.round(8 * more); k++) add('gx4cCone', { st: 'gx4cRoad', tun: 1, off: ((k * 2) % 3 - 1) * lw + (k % 2 ? 7 : -7), delay: 168 + k * 70 });
    for (let k = 0; k < 4; k++) add('drone', { st: 'enter', slot: [FW / 2 - 30 + k * 20, 16], from: k < 2 ? -1 : 1, delay: 40 + k * 10 });
  },
});

// ------------------------------------------------------------------ THE DESKTOP: how they move
const GX4C_ERRS = [['ERROR', 'ERROR!'], ['WARNING', 'LOW MEMORY'], ['SYSTEM', 'ARE YOU SURE?'], ['EXPLORER', 'NOT FOUND'], ['DRIVE A:', 'ABORT RETRY'], ['SETUP', 'PLEASE WAIT'], ['ALERT', 'DISK FULL'], ['OOPS', 'IT CRASHED']];
const GX4C_TIPS = [['IT LOOKS LIKE', "YOU'RE DODGING."], ['NEED HELP', 'SHOOTING?'], ['TIP: TRY NOT', 'TO GET HIT.'], ['WOULD YOU', 'LIKE TO SAVE?'], ['DID YOU KNOW', 'I CAN HELP?'], ['WRITING A', 'LETTER?']];
const GX4C_PIPE_COLS = [['#F84838', '#A01808', '#F8B8A8'], ['#38C838', '#086808', '#B8F8B8'], ['#3868F8', '#0C2898', '#B8C8F8'], ['#F8C838', '#987008', '#F8F0B8'], ['#C8C8D0', '#686870', '#F8F8F8']];
Object.assign(GX_MOVES, {
  // an error dialog: it pops up where it's put, drifts down a little; after a while it falls away
  gx4cPop: Object.assign(function (e) {
    e.y += e.t > e.life ? 1.2 : 0.08;
    e.v = { m: e.v.m, p: Math.min(10, e.t) };
    if (e.y > FH + 30) gxGone(e);
  }, { init(e) { e.x = e.tx; e.y = e.ty; e.life = e.life || 640 + rnd(200); e.fireT = 60 + rnd(90); e.v = { m: e.m ?? rnd(GX4C_ERRS.length), p: 0 }; Sound.play('gx4cDing'); } }),
  // an hourglass: in over you, turning over now and then: its sand at you (it freezes you for a moment)
  gx4cHourM: Object.assign(function (e, g, near) {
    const tg = near(e.x, e.y);
    if (e.t < 60) { e.x += (e.tx - e.x) * 0.06; e.y += (e.ty - e.y) * 0.06; }
    else if (e.t > e.life) { e.y -= 1; if (e.y < -16) gxGone(e); }
    else if (tg) e.x += Math.max(-0.35, Math.min(0.35, tg.x + 8 - e.x));
    e.flipT--;
    if (e.flipT === 12) Sound.play('gx4cFreeze');
    if (e.flipT <= 0) {
      e.flipT = Math.round((150 + rnd(70)) / Math.min(1.6, Math.max(0.6, g.fireMul)));
      if (tg && e.t < e.life) { const a = Math.atan2(tg.y + 8 - e.y, tg.x + 8 - e.x); g.bullets.push({ x: e.x, y: e.y + 6, vx: Math.cos(a) * 1.05 * g.shotSpd, vy: Math.sin(a) * 1.05 * g.shotSpd, k: 'gx4cSand' }); }
    }
    e.v = { r: e.flipT < 12 ? 12 - e.flipT : 0 };
  }, { init(e) { e.x = e.tx ?? 20 + rnd(FW - 40); e.y = -14; e.tx = e.x; e.ty = e.ty ?? 30 + rnd(30); e.flipT = 80 + rnd(60); e.life = 820; e.fireT = 1e9; e.v = { r: 0 }; } }),
  // the helper: it comes to hover just over you, in the way of your shots, and gives tips (then '?'s at you)
  gx4cHelp: Object.assign(function (e, g, near) {
    const tg = near(e.x, e.y);
    if (e.t > e.life || !tg) {
      if (e.t === e.life + 1) gx4cSay(this, e.x, e.y - 14, 'GOODBYE!', '#F8F8D8', 45);
      e.y -= 1.4; if (e.y < -20) gxGone(e);
    } else {
      const tx = tg.x + 8 + Math.sin(e.t / 25) * 10, ty = Math.max(24, tg.y - 26 + Math.sin(e.t / 13) * 3);
      e.x += (tx - e.x) * 0.045; e.y += (ty - e.y) * 0.045;
      if (++e.tipT === 150) { e.tip = rnd(GX4C_TIPS.length); Sound.play('gx4cHelp'); }
      if (e.tipT >= 230) {
        e.tipT = 0; e.tip = -1;
        const a = Math.atan2(tg.y + 8 - e.y, tg.x + 8 - e.x);
        for (const d of [-0.32, 0, 0.32]) g.bullets.push({ x: e.x, y: e.y + 8, vx: Math.cos(a + d) * 0.9 * g.shotSpd, vy: Math.sin(a + d) * 0.9 * g.shotSpd, k: gx4cLetter('?') });
      }
    }
    e.v = { tip: e.tip, k: e.tipT > 150 ? 1 : 0 };
  }, { init(e) { e.x = 20 + rnd(FW - 40); e.y = -18; e.life = 760; e.tipT = 40; e.tip = -1; e.fireT = 1e9; Sound.play('gx4cHelp'); } }),
  // a pipe of the screensaver: it grows out of an edge along a 16 pixel grid, turning now and then; it's only so
  // long (its tail follows), and after a while it heads off the screen. Drawn and touched from its path (v.p)
  gx4cSnake: Object.assign(function (e, g, near) {
    if (e.warnT > 0) { e.warnT--; e.v = { p: e.path.flat(), c: e.c, w: 1 }; return; }
    const sp = 1.25 * Math.min(1.3, Math.max(0.8, g.shotSpd)), head = e.path[e.path.length - 1];
    let grow = 0;
    if (!e.out) {
      head[0] += e.dir[0] * sp; head[1] += e.dir[1] * sp; grow = sp; e.trav += sp;
      e.seg += sp;
      if (e.seg >= 16) {   // at a grid point: maybe turn
        e.seg -= 16;
        head[0] = Math.round((head[0] - 8) / 16) * 16 + 8; head[1] = Math.round((head[1] - 8) / 16) * 16 + 8;
        const inX = x => x >= 8 && x <= FW - 8, inY = y => y >= 8 && y <= FH - 8, ahead = [head[0] + e.dir[0] * 16, head[1] + e.dir[1] * 16];
        const leaving = e.trav > e.limit, mustTurn = !leaving && (!inX(ahead[0]) || !inY(ahead[1])) && inX(head[0]) && inY(head[1]);
        if (!leaving && (mustTurn || Math.random() < 0.3)) {
          const opts = (e.dir[0] ? [[0, 1], [0, -1]] : [[1, 0], [-1, 0]]).filter(d => inX(head[0] + d[0] * 32) && inY(head[1] + d[1] * 32));
          if (opts.length) {
            const tg = near(head[0], head[1]);
            const d = tg && Math.random() < 0.5 ? opts.reduce((a, b) => (Math.hypot(head[0] + b[0] * 16 - tg.x - 8, head[1] + b[1] * 16 - tg.y - 8) < Math.hypot(head[0] + a[0] * 16 - tg.x - 8, head[1] + a[1] * 16 - tg.y - 8) ? b : a)) : gx4cPick(opts);
            e.dir = d; e.path.push([head[0], head[1]]);
            if (this.frame % 3 === 0) Sound.play('gx4cPipe');
          }
        }
      }
      if (head[0] < -24 || head[0] > FW + 24 || head[1] < -24 || head[1] > FH + 24) e.out = 1;
    }
    // the tail follows once it's long enough (or when the head is gone)
    e.len += grow;
    let cut = e.out ? 2.2 : Math.max(0, e.len - e.max);
    e.len -= cut;
    while (cut > 0 && e.path.length > 1) {
      const a = e.path[0], b = e.path[1], d = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (d <= cut) { cut -= d; e.path.shift(); } else { a[0] += (b[0] - a[0]) / d * cut; a[1] += (b[1] - a[1]) / d * cut; cut = 0; }
    }
    if (e.len <= 1 || e.path.length < 2) { gxGone(e); return; }
    e.v = { p: e.path.flat().map(n => Math.round(n)), c: e.c, w: 0 };
  }, { init(e) {
    const side = e.side ?? rnd(3), gx = n => 8 + 16 * n, cols = Math.floor((FW - 16) / 16), rows = Math.floor((FH - 16) / 16);
    let p, dir;
    if (side === 0) { p = [-8, gx(2 + rnd(rows - 3))]; dir = [1, 0]; }
    else if (side === 1) { p = [FW + 8, gx(2 + rnd(rows - 3))]; dir = [-1, 0]; }
    else { p = [gx(1 + rnd(cols - 1)), -8]; dir = [0, 1]; }
    e.path = [p.slice(), p.slice()]; e.dir = dir; e.seg = 8; e.len = 0; e.trav = 0; e.limit = e.limit || 520 + rnd(200); e.max = e.max || 150;
    e.c = rnd(GX4C_PIPE_COLS.length); e.warnT = 45; e.x = FW / 2; e.y = FH + 1000; e.fireT = 1e9;
    e.v = { p: e.path.flat(), c: e.c, w: 1 };
  } }),
  // a block of the defrag grid: it eases into its cell (the grid moves them about: see the frame hook)
  gx4cDfm: Object.assign(function (e) {
    const tx = e.gx0 + e.cx * 16, ty = e.gy0 + e.cy * 12;
    e.x += (tx - e.x) * 0.2; e.y += (ty - e.y) * 0.2;
    if (e.mv > 0) e.mv--;
    e.v = { c: e.c, m: e.mv > 0 ? 1 : 0, n: e.n0 };
  }, { init(e) { e.x = e.gx0 + e.cx * 16; e.y = -10 - (5 - e.cy) * 12; e.mv = 0; e.fireT = 120 + rnd(300); e.v = { c: e.c, m: 0, n: e.n0 }; } }),
  // a bad sector breaks loose: it blinks, then drops at you
  gx4cBad: function (e, g, near) {
    if (++e.kT < 32) { e.v = { c: 2, m: (e.kT >> 2) & 1, n: e.n0 }; return; }
    const tg = near(e.x, e.y);
    e.vy = Math.min(3, (e.vy || 0.5) + 0.08); e.y += e.vy;
    if (tg) e.x += Math.max(-0.4, Math.min(0.4, tg.x + 8 - e.x));
    e.v = { c: 2, m: 0, n: e.n0 };
    if (e.y > FH + 10) gxGone(e);
  },
  // the minesweeper field: it comes down slowly; your shots uncover tiles (see gx4cReveal)
  gx4cMineM: Object.assign(function (e, g) {
    const v = e.v;
    v.y += e.spd;
    // shots: a hidden tile stops one and is uncovered
    for (const s of g.shots) {
      if (s.dead) continue;
      const c = Math.floor((s.x - v.x0) / 16), r = Math.floor((s.y - v.y) / 16);
      if (c < 0 || r < 0 || c >= v.c || r >= v.r) continue;
      if (v.s[r * v.c + c] !== 'h') continue;
      s.dead = true;
      this.gx4cReveal(e, r * v.c + c, this.players[s.o] || this.players[0]);
    }
    // lightning uncovers the tile over the ship that fired it
    for (const z of g.zaps) {
      if (z.t !== 6 || z.gx4c) continue;
      z.gx4c = 1;
      const [zx, zy] = z.pts[0], c = Math.floor((zx - v.x0) / 16);
      if (c >= 0 && c < v.c) for (let r = v.r - 1; r >= 0; r--) if (v.s[r * v.c + c] === 'h' && v.y + r * 16 + 16 < zy) { this.gx4cReveal(e, r * v.c + c, this.players[0]); break; }
    }
    // a laser burns its way up a column
    if (this.frame % 8 === 0) for (const bm of g.beams) {
      const c = Math.floor((bm.x - v.x0) / 16);
      if (c < 0 || c >= v.c) continue;
      for (let r = v.r - 1; r >= 0; r--) if (v.s[r * v.c + c] === 'h' && v.y + r * 16 + 16 < bm.y) { this.gx4cReveal(e, r * v.c + c, this.players[bm.o] || this.players[0]); break; }
    }
    g.shots = g.shots.filter(s => !s.dead);
    if (v.y > FH + 4) gxGone(e);
  }, { init(e, g) {
    const c = Math.floor(FW / 16), r = 7, n = c * r, mines = new Set(), want = Math.min(n - 20, 11 + 2 * g.loop + (g.sec >= 0 ? 0 : 0));
    while (mines.size < want) { const i = rnd(n); if (Math.floor(i / c) < r - 1 || mines.size < want - 2) mines.add(i); }
    e.mines = mines; e.spd = 0.27 * Math.min(1.3, Math.max(0.8, g.shotSpd)); e.fireT = 1e9; e.x = FW / 2; e.y = FH + 1000;
    e.v = { x0: Math.floor((FW - c * 16) / 2), y: -r * 16 - 4, c, r, s: 'h'.repeat(n), done: 0 };
  } }),
  // a window of the boss's cascade: its outline first (k 0), then it's there, solid (1), then it minimises (2)
  gx4cWinM: Object.assign(function (e) {
    const v = e.v;
    if (v.k === 0) { if (--e.warnT <= 0) { v.k = 1; e.w = 44; e.h = 30; e.kT = 0; Sound.play('gx4cPop'); } }
    else if (v.k === 1) { if (++e.kT >= e.stay) { v.k = 2; e.kT = 0; e.w = 0.1; e.h = 0.1; } }
    else { v.s = Math.max(0, 1 - ++e.kT / 18); e.y += 3; if (e.kT >= 18) gxGone(e); }
  }, { init(e) { e.x = e.tx; e.y = e.ty; e.w = 0.1; e.h = 0.1; e.warnT = e.warn || 45; e.stay = e.stay || 260; e.fireT = 1e9; e.v = { k: 0, n: e.n || 0, s: 1 }; } }),
  // IT IS NOW SAFE TO TURN OFF YOUR COMPUTER: the screen shrinks to a line, then the words
  gx4cSafeM: function (e) { e.v.t++; if (e.v.t > 300) gxGone(e); },
});
Object.assign(GX_FIRE, {
  // the dialog's X: two at you
  gx4cErr(e, g, near) {
    if (e.t < 20 || e.t > e.life) return 30;
    const t = near(e.x, e.y); if (!t) return 60;
    const a = Math.atan2(t.y + 8 - e.y, t.x + 8 - e.x);
    for (const d of [-0.14, 0.14]) g.bullets.push({ x: e.x, y: e.y - 8, vx: Math.cos(a + d) * 1.15 * g.shotSpd, vy: Math.sin(a + d) * 1.15 * g.shotSpd, k: gx4cLetter('X') });
    return Math.round((220 + rnd(160)) / Math.max(0.4, g.fireMul));
  },
  gx4cCur(e, g) { g.bullets.push({ x: e.x, y: e.y + 6, vx: 0, vy: 1.3 * g.shotSpd, k: 'gx4cClick' }); return Math.round((320 + rnd(400)) / Math.max(0.4, g.fireMul)); },
  gx4cFlop(e, g) { g.bullets.push({ x: e.x, y: e.y + 6, vx: 0, vy: 1.2 * g.shotSpd, k: gx4cLetter(rnd(2) ? '1' : '0') }); return Math.round((260 + rnd(300)) / Math.max(0.4, g.fireMul)); },
  gx4cBlk(e, g) {
    if (e.st !== 'gx4cDfm' || g.list.some(o => o.type === 'gx4cBlk' && o.st === 'gx4cDfm' && o.cx === e.cx && o.cy > e.cy)) return 120 + rnd(200);
    g.bullets.push({ x: e.x, y: e.y + 5, vx: 0, vy: 1.2 * g.shotSpd, k: gx4cLetter(rnd(2) ? '1' : '0') });
    return Math.round((320 + rnd(320)) / Math.max(0.4, g.fireMul));
  },
  gx4cHour: () => 1e9, gx4cClip: () => 1e9, gx4cWin: () => 1e9,
});
// an error dialog round its OK button (e.x, e.y): x, y, w, h
const gx4cDlg = e => [e.x - 27, e.y - 21, 54, 26];
// a pipe's path as segments
const gx4cSegs = p => { const out = []; for (let i = 2; i < p.length; i += 2) out.push([p[i - 2], p[i - 1], p[i], p[i + 1]]); return out; };
Object.assign(GX_COLLIDE, {
  gx4cErr(e, t) { const [x, y, w, h] = gx4cDlg(e); return e.t >= 8 && overlap(t.x + 5, t.y + 5, 6, 8, x, y, w, h); },
  gx4cHour: (e, t) => gx4cNear(t, e.x, e.y, 4, 6),
  gx4cClip: (e, t) => gx4cNear(t, e.x, e.y, 4, 7),
  gx4cCur: (e, t) => gx4cNear(t, e.x - 2, e.y, 3, 5),
  gx4cPipe(e, t) {
    if (!e.v || e.v.w) return false;
    const px = t.x + 8, py = t.y + 9;
    return gx4cSegs(e.v.p).some(([x0, y0, x1, y1]) => px > Math.min(x0, x1) - 7 && px < Math.max(x0, x1) + 7 && py > Math.min(y0, y1) - 8 && py < Math.max(y0, y1) + 8);
  },
  gx4cField(e, t) {
    const v = e.v, px = t.x + 8, py = t.y + 9;
    for (const [dx, dy] of [[-3, -4], [3, -4], [-3, 4], [3, 4]]) {
      const c = Math.floor((px + dx - v.x0) / 16), r = Math.floor((py + dy - v.y) / 16);
      if (c >= 0 && r >= 0 && c < v.c && r < v.r && v.s[r * v.c + c] === 'h') return true;
    }
    return false;
  },
  gx4cWin: (e, t) => e.v && e.v.k === 1 && gx4cNear(t, e.x, e.y, 21, 14),
  gx4cSafe: () => false,
});
Object.assign(GX_ON_KILL, {
  gx4cErr(e) { gx4cSay(this, e.x, e.y - 16, 'OK', '#F8F8F8', 30); Sound.play('gx4cPop'); },
  gx4cClip(e) { gx4cSay(this, e.x, e.y - 12, 'HELPER DISMISSED', '#F8F8D8', 50); },
  gx4cFlop(e) { if (this.frame % 2 === 0) Sound.play('gx4cDisk'); },
  gx4cWin(e) { gx4cSay(this, e.x, e.y - 8, 'CLOSED', '#F8F8F8', 40); },
  gx4cBlk(e) { this.addFx(e.x, e.y, Sprites.smallExp, 2); if (this.frame % 2 === 0) Sound.play('gxPop'); if (Math.random() < 0.1) this.gxDrop(e.x, e.y, 'coin'); return false; },
});
Object.assign(Stage.prototype, {
  // a minesweeper tile uncovered: a mine bursts; a number shows how many mines are round it (0: its neighbours too)
  gx4cReveal(e, i, p) {
    const v = e.v, g = this.galaxy, a = v.s.split(''), c = v.c;
    if (e.mines.has(i)) {
      a[i] = 'x'; e.mines.delete(i);
      const x = v.x0 + (i % c) * 16 + 8, y = v.y + Math.floor(i / c) * 16 + 8;
      for (let k = 0; k < 8; k++) { const an = k * Math.PI / 4 + Math.PI / 8; g.bullets.push({ x, y, vx: Math.cos(an) * 1.0 * g.shotSpd, vy: Math.sin(an) * 1.0 * g.shotSpd, k: 'shot' }); }
      this.fx.push({ x, y, frames: BIG_EXPLOSION(), per: 3, tick: 0 });
      Sound.play('gx4cMine');
    } else {
      const q = [i];
      while (q.length) {
        const j = q.pop(); if (a[j] !== 'h') continue;
        const r = Math.floor(j / c), cc = j % c, nb = [];
        for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) { const rr = r + dr, c2 = cc + dc; if ((dr || dc) && rr >= 0 && rr < v.r && c2 >= 0 && c2 < c) nb.push(rr * c + c2); }
        const n = nb.filter(k => e.mines.has(k)).length;
        a[j] = String(n);
        if (p) this.addScore(p, 10);
        if (n === 0) for (const k of nb) if (a[k] === 'h' && !e.mines.has(k)) q.push(k);
      }
      Sound.play('gx4cReveal');
    }
    // every safe tile uncovered: the field is cleared, the mines are flagged
    if (!v.done && a.every((ch, k) => ch !== 'h' || e.mines.has(k))) {
      v.done = 1;
      for (const k of e.mines) a[k] = 'f';
      e.mines.clear();
      const pts = 2000 * (1 + g.loop);
      for (const q2 of this.players) if (!q2.out) this.addScore(q2, pts);
      gx4cSay(this, FW / 2, Math.max(20, v.y + v.r * 8), 'CLEARED! ' + pts, COL.gold, 90);
      Sound.play('bonus');
    }
    v.s = a.join('');
  },
});

// ------------------------------------------------------------------ THE DESKTOP: the waves
Object.assign(GX_WAVE_KINDS, {
  // dialogs pop up, faster and faster; cursors dive at you; the helper turns up
  gx4cPopups(g, add, types, more) {
    const n = Math.round(12 * more);
    let d = 30;
    for (let k = 0; k < n; k++) { add('gx4cErr', { st: 'gx4cPop', tx: 26 + rnd(FW - 52), ty: 26 + rnd(Math.round(FH * 0.3)), delay: d }); d += Math.max(22, 80 - k * 6); }
    for (let k = 0; k < 6; k++) add('drone', { st: 'kami', lane: k % 3, delay: 160 + k * 70 });
    add('gx4cClip', { st: 'gx4cHelp', delay: 260 });
  },
  // pipes grow across the screen; floppy disks stream by; an hourglass or two
  gx4cPipes(g, add, types, more) {
    const n = Math.round(5 * Math.min(1.4, more));
    for (let k = 0; k < n; k++) add('gx4cPipe', { st: 'gx4cSnake', side: k % 3, delay: 20 + k * 150 });
    for (let k = 0; k < Math.round(10 * more); k++) add('gx4cFlop', { st: 'stream', dirX: k % 2 ? -1 : 1, lane: (k >> 1) % 3, delay: 60 + Math.floor(k / 2) * 40 });
    add('gx4cHour', { st: 'gx4cHourM', delay: 200 }); add('gx4cHour', { st: 'gx4cHourM', delay: 500 });
  },
  // a grid of blocks, rearranging itself; bad sectors break loose and drop on you
  gx4cDefrag(g, add, types, more) {
    const cols = Math.min(12, Math.floor((FW - 16) / 16)), rows = 5, gx0 = Math.round((FW - (cols - 1) * 16) / 2), cells = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) cells.push([c, r]);
    for (let i = cells.length - 1; i > 0; i--) { const j = rnd(i + 1); [cells[i], cells[j]] = [cells[j], cells[i]]; }
    const n = Math.min(cells.length, Math.round(34 * Math.min(1.3, more)));
    for (let k = 0; k < n; k++) add('gx4cBlk', { st: 'gx4cDfm', cx: cells[k][0], cy: cells[k][1], gx0, gy0: 22, c: k % 7 === 0 ? 2 : k % 3 === 0 ? 1 : 0, n0: n, delay: 10 + (rows - cells[k][1]) * 6 });
    add('gx4cHour', { st: 'gx4cHourM', ty: 90, delay: 300 });
    gx4cS(g).badT = 200;
  },
  // a minesweeper field comes down: shoot a way through it (mind the numbers)
  gx4cMines(g, add, types, more) {
    add('gx4cField', { st: 'gx4cMineM', delay: 10 });
    for (let k = 0; k < 4; k++) add('drone', { st: 'kami', lane: k % 3, delay: 240 + k * 140 });
    add('gx4cHour', { st: 'gx4cHourM', ty: 24, delay: 420 });
  },
  // a noisy connection: everything slows down (you too); a formation of disks and cursors, dialogs, the helper
  gx4cDialup(g, add, types, more) {
    const cols = Math.max(4, Math.min(8, Math.floor((FW - 24) / 22))), sx = Math.min(22, (FW - 32) / (cols - 1)), x0 = (FW - sx * (cols - 1)) / 2;
    for (let r = 0; r < 3; r++) for (let c = 0; c < cols; c++) add(r === 1 ? 'gx4cFlop' : 'drone', { st: 'enter', slot: [x0 + c * sx, 22 + r * 18], from: c < cols / 2 ? -1 : 1, delay: 90 + r * 30 + c * 6 });
    for (let k = 0; k < 3; k++) add('gx4cErr', { st: 'gx4cPop', tx: 30 + k * (FW - 60) / 2, ty: 86, delay: 300 + k * 90 });
    add('gx4cHour', { st: 'gx4cHourM', delay: 200 });
    add('gx4cClip', { st: 'gx4cHelp', delay: 420 });
  },
});

// ------------------------------------------------------------------ every frame: the sectors' gimmicks and wave machinery
GX_FRAME.push(function (g) {
  const S = gx4cS(g), wave = g.phase === 'wave';
  // the tunnel closes while its wave is on, and opens after
  const want = wave && g.kind === 'gx4cTunnel' ? 1 : 0;
  S.tun = Math.max(0, Math.min(1, S.tun + Math.max(-1 / 80, Math.min(1 / 110, want - S.tun))));
  S.tt = S.tun > 0 ? S.tt + 1 : 0;
  // DIAL-UP: the connection
  const lag = wave && g.kind === 'gx4cDialup' ? 1 : 0;
  if (lag && !S.lag) { S.lagT = 0; Sound.play('gx4cModem'); }
  S.lag = lag; if (lag) S.lagT++;
  // RECALL NOTICE: one parked car after another is recalled (the one over you, more often than not)
  if (wave && g.kind === 'gx4cRecall' && --S.recT <= 0) {
    const parked = g.list.filter(e => e.st === 'gx4cPark' && e.k === 0 && e.parked), pl = this.gxPlayers();
    if (parked.length) {
      const t = pl.length ? pl[rnd(pl.length)] : null;
      const e = t && rnd(10) < 7 ? parked.reduce((a, b) => (Math.abs(b.x - t.x - 8) < Math.abs(a.x - t.x - 8) ? b : a)) : gx4cPick(parked);
      e.k = 1; e.kT = 0; Sound.play('gx4cRecall');
      gx4cSay(this, e.x, e.y - 14, 'RECALLED!', '#F83800', 50);
    }
    S.recT = Math.max(50, 92 - 10 * g.loop);
  }
  // DEFRAG: every so often a block moves up or left into a free cell; now and then a bad sector breaks loose
  const blks = g.list.filter(e => e.type === 'gx4cBlk' && e.st === 'gx4cDfm');
  if (blks.length && this.frame % 16 === 0) {
    const occ = new Set(blks.map(e => e.cx + ',' + e.cy)), e = gx4cPick(blks);
    const opts = [[e.cx - 1, e.cy], [e.cx, e.cy - 1]].filter(([c, r]) => c >= 0 && r >= 0 && !occ.has(c + ',' + r));
    if (opts.length) { const [c, r] = gx4cPick(opts); e.cx = c; e.cy = r; e.mv = 14; }
  }
  if (blks.length && --S.badT <= 0) {
    S.badT = Math.max(70, 130 - 15 * g.loop);
    let bad = blks.filter(e => e.c === 2);
    if (!bad.length) { const e = gx4cPick(blks); e.c = 2; gx4cSay(this, e.x, e.y - 10, 'BAD SECTOR!', '#F83800', 50); bad = [e]; }
    const e = gx4cPick(bad); e.st = 'gx4cBad'; e.kT = 0; Sound.play('gx4cDing');
  }
  // MARS HIGHWAY: a speeder now and then
  if (gx4cIs(g, GX4C_MARS) && wave && !['challenge', 'miniboss', 'gx4cTunnel'].includes(g.kind) && --S.spT <= 0) {
    S.spT = 540 + rnd(360);
    const pl = this.gxPlayers(), t = pl.length && rnd(3) ? pl[rnd(pl.length)] : null;
    this.gxSpawn({ type: 'gx4cSpeed', st: 'gx4cSpeed', lane: t ? gx4cLaneOf(t.x + 8) : rnd(gx4cLanes()) });
  }
  // THE DESKTOP: select... and delete
  if (gx4cIs(g, GX4C_DESK) && wave && !['challenge', 'miniboss', 'gx4cMines'].includes(g.kind) && !S.sel && --S.selT <= 0) {
    S.selT = 660 + rnd(300);
    const pl = this.gxPlayers(), t = pl.length ? pl[rnd(pl.length)] : null;
    if (t) {
      const w = 64 + rnd(20), h = 46 + rnd(10), x = Math.round(gx4cClamp(t.x + 8 - w / 2 + rnd(21) - 10, w / 2 + 2) ), y = Math.round(Math.max(FH * 0.36, Math.min(FH - h - 2, t.y + 9 - h / 2 + rnd(13) - 6)));
      S.sel = { x: Math.max(2, Math.min(FW - w - 2, x)), y, w, h, t: 0, c: rnd(4) };
      Sound.play('gx4cDrag');
    }
  }
  if (S.sel) {
    const s = S.sel;
    s.t++;
    if (s.t === 80) Sound.play('gx4cDelete');
    if (s.t >= 80 && s.t < 90) {
      for (const t of this.gxPlayers()) if (overlap(t.x + 5, t.y + 5, 6, 8, s.x, s.y, s.w, s.h)) this.hitPlayer(t);
      if (s.t === 80) for (const e of g.list.slice()) if (GX_TYPES[e.type].hp < 1e6 && !GX_TYPES[e.type].mini && e.x > s.x && e.x < s.x + s.w && e.y > s.y && e.y < s.y + s.h) this.gxKill(e, null);
    }
    if (s.t > 104) S.sel = null;
  }
  // error dialogs: shots that hit them anywhere but on the OK button stop there
  const dl = g.list.filter(e => e.type === 'gx4cErr' && e.t >= 8);
  if (dl.length) {
    let n = 0;
    for (const s of g.shots) for (const e of dl) {
      const [x, y, w, h] = gx4cDlg(e);
      if (s.x > x && s.x < x + w && s.y > y && s.y < y + h - 7 && !(Math.abs(s.x - e.x) < 7 && Math.abs(s.y - e.y) < 5)) { s.dead = true; n++; if (n < 3) this.fx.push({ x: s.x, y: s.y, frames: [Sprites.smallExp[0]], per: 3, tick: 0 }); break; }
    }
    if (n) { g.shots = g.shots.filter(s => !s.dead); if (this.frame % 5 === 0) Sound.play('steel'); }
  }
});

// ------------------------------------------------------------------ wrappers: the tunnel walls, the lag, sand and cards
{
  const up0 = Stage.prototype.gxUpdatePlayer;
  Stage.prototype.gxUpdatePlayer = function (t) {
    const g = this.galaxy, S = g && g.gx4c;
    let fz;
    if (S && S.lag && this.frame % 2) { fz = t.frozen || 0; t.frozen = fz + 2; }   // DIAL-UP: every other frame the ship can't move
    const r = up0.call(this, t);
    if (fz !== undefined) t.frozen = Math.max(0, fz - 1);
    if (S && S.tun > 0.02 && t.alive) { const cx = gx4cTunCx(g), hw = gx4cTunHw(g); t.x = Math.max(Math.round(cx - hw + 3), Math.min(Math.round(cx + hw - 19), t.x)); }
    return r;
  };
  const en0 = Stage.prototype.gxUpdateEnemies;
  Stage.prototype.gxUpdateEnemies = function () {
    const S = this.galaxy && this.galaxy.gx4c;
    if (S && S.lag && this.frame % 2) return;
    return en0.apply(this, arguments);
  };
  const bu0 = Stage.prototype.gxUpdateBullets;
  Stage.prototype.gxUpdateBullets = function () {
    const g = this.galaxy, S = g.gx4c;
    if (S && S.lag && this.frame % 2) return;
    // the hourglass's sand freezes you (no harm); solitaire cards fall and bounce
    const sand = g.bullets.filter(b => b.k === 'gx4cSand');
    if (sand.length) g.bullets = g.bullets.filter(b => b.k !== 'gx4cSand');
    const frozen = this.freezeE > 0;
    for (const b of g.bullets) if (b.k === 'gx4cCard' && !frozen) {
      b.vy += 0.055;
      if (b.y > FH - 6 && b.vy > 0 && (b.bn || 0) < 3) { b.vy = -b.vy * 0.86; b.bn = (b.bn || 0) + 1; Sound.play('gx4cCard'); }
      if (g.boss && (this.frame + (b.s | 0)) % 3 === 0) { const tr = g.boss.ctr || (g.boss.ctr = []); tr.push([Math.round(b.x), Math.round(b.y), b.s | 0, 0]); if (tr.length > 160) tr.shift(); }
    }
    const r = bu0.apply(this, arguments);
    for (const b of sand) {
      if (!frozen) { b.x += b.vx; b.y += b.vy; }
      if (b.y > FH + 8 || b.y < -16 || b.x < -8 || b.x > FW + 8) continue;
      const t = this.gxPlayers().find(q => Math.abs(q.x + 8 - b.x) < 5 && Math.abs(q.y + 9 - b.y) < 6);
      if (t) { if (!(t.shield > 0)) { t.frozen = Math.max(t.frozen || 0, 40); t.gx4cBusy = 40; Sound.play('gx4cFreeze'); } continue; }
      g.bullets.push(b);
    }
    return r;
  };
  // a bomb clears a minesweeper field (its mines defused)
  const bomb0 = Stage.prototype.gxBomb;
  Stage.prototype.gxBomb = function (t, p) {
    const r = bomb0.apply(this, arguments), g = this.galaxy;
    for (const e of g.list) if (e.type === 'gx4cField' && !e.v.done) {
      const a = e.v.s.split('');
      for (let i = 0; i < a.length; i++) if (a[i] === 'h') a[i] = e.mines.has(i) ? 'f' : '0';
      e.mines.clear(); e.v.s = a.join(''); e.v.done = 1;
    }
    return r;
  };
  // a boss's death scene (the tow, IT IS NOW SAFE...) plays out before the sector ends
  const ug0 = Stage.prototype.updateGalaxy;
  Stage.prototype.updateGalaxy = function () {
    const r = ug0.apply(this, arguments), g = this.galaxy;
    if (this.result === 'clear' && g && g.phase === 'clear' && g.t < 900 && g.list.some(e => e.type === 'gx4cWreck' || e.type === 'gx4cSafe')) this.result = null;
    return r;
  };
  // online guests: the tunnel, the lag, the selection box
  const view0 = Stage.prototype.galaxyView;
  Stage.prototype.galaxyView = function () { const v = view0.apply(this, arguments), g = this.galaxy; if (g.gx4c) v.g4c = g.gx4c; return v; };
  const apply0 = Stage.prototype.applyGalaxyView;
  Stage.prototype.applyGalaxyView = function (v) { const r = apply0.apply(this, arguments); if (v.g4c) this.galaxy.gx4c = v.g4c; return r; };
}

// ------------------------------------------------------------------ drawing them
// a lane's warning at the top of the screen: a flashing box with an arrow, the lane's edges dotted
function gx4cLaneWarn(ctx, x, f, col = '#F8D800', w = 16) {
  if (!((f >> 2) & 1)) return;
  x = Math.round(x);
  ctx.fillStyle = col;
  for (let y = 14; y < FH; y += 6) { ctx.fillRect(x - w / 2, y, 1, 3); ctx.fillRect(x + w / 2 - 1, y, 1, 3); }
  ctx.fillRect(x - 6, 1, 12, 11); Font.draw(ctx, 'V', x - 4, 3, '#100808');
}
// a crosshair on the ground (a landing pad, a rocket's target)
function gx4cCross(ctx, x, y, r, f, col = '#F83800') {
  x = Math.round(x); y = Math.round(y);
  ctx.fillStyle = (f >> 2) & 1 ? col : '#F8F8F8';
  for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2 + f / 30; ctx.fillRect(Math.round(x + Math.cos(a) * r), Math.round(y + Math.sin(a) * r * 0.6), 1, 1); }
  ctx.fillRect(x - r - 3, y, 5, 1); ctx.fillRect(x + r - 1, y, 5, 1); ctx.fillRect(x, y - Math.round(r * 0.6) - 3, 1, 4); ctx.fillRect(x, y + Math.round(r * 0.6), 1, 4);
}
Object.assign(GX_RENDER, {
  gx4cRobo(ctx, e, f) {
    const v = e.v || {}, img = GxGfx.get('gx4cRobo', (f >> 2) & 1, e.flash > 0 ? 'f' : 'n'), x = Math.round(e.x - 7), y = Math.round(e.y - 11);
    if (v.k === 5) { ctx.fillStyle = 'rgba(248,248,248,0.35)'; for (let k = 0; k < 4; k++) ctx.fillRect(x + 2 + k * 3, y - 6 - ((f + k * 3) % 8), 1, 5); }   // speeding off
    if (v.k === 4 && (f >> 2) & 1) { ctx.fillStyle = '#F83800'; const px = Math.round(e.x); for (let yy = y + 26; yy < FH; yy += 6) { ctx.fillRect(px - 9, yy, 1, 3); ctx.fillRect(px + 8, yy, 1, 3); } }
    if (v.k === 2) { ctx.fillStyle = 'rgba(200,200,200,0.5)'; ctx.fillRect(x + (v.d > 0 ? -2 : 14), y + 4 + ((f >> 1) & 3), 2, 2); ctx.fillRect(x + (v.d > 0 ? -3 : 15), y + 16 - ((f >> 1) & 3), 2, 2); }
    ctx.drawImage(img, x, y);
    if (e.flash > 0) return;
    if (v.k === 1) { ctx.fillStyle = (f >> 1) & 1 ? '#F83800' : '#F8D800'; ctx.fillRect(x + 6, y + 10, 2, 2); }   // the lidar goes red: it's about to swerve
    if (v.k === 3 && (f >> 4) & 1) { ctx.fillStyle = '#F8B800'; ctx.fillRect(x + 1, y + 1, 2, 2); ctx.fillRect(x + 11, y + 1, 2, 2); ctx.fillRect(x + 1, y + 19, 2, 2); ctx.fillRect(x + 11, y + 19, 2, 2); }   // hazards
    if (v.k === 4) {   // RECALL: high beams, a red tag
      if ((f >> 1) & 1) { ctx.fillStyle = 'rgba(248,248,200,0.6)'; ctx.fillRect(x + 1, y + 22, 4, 6); ctx.fillRect(x + 9, y + 22, 4, 6); }
      gx4cTiny(ctx, 'RECALL', e.x, y - 7, (f >> 2) & 1 ? '#F83800' : '#F8F8F8', '#100808');
    }
  },
  gx4cSpeed(ctx, e, f) { if (e.warnT > 0) gx4cLaneWarn(ctx, e.x, f, '#F83800'); else gxSprite(ctx, e, f); },
  gx4cCone(ctx, e) {
    const x = Math.round(e.x), y = Math.round(e.y), fl = e.flash > 0;
    ctx.fillStyle = '#100808'; ctx.fillRect(x - 5, y + 2, 11, 4); for (let j = 0; j < 8; j++) { const w = 1 + Math.floor(j * 0.6); ctx.fillRect(x - w - 1, y - 6 + j, 2 * w + 3, 1); }
    for (let j = 0; j < 8; j++) { const w = Math.floor(j * 0.6); ctx.fillStyle = fl ? '#F8F8F8' : j === 3 || j === 4 ? '#F8F8F8' : j < 1 ? '#F8A050' : '#F87800'; ctx.fillRect(x - w, y - 5 + j, 2 * w + 1, 1); }
    ctx.fillStyle = fl ? '#F8F8F8' : '#C85000'; ctx.fillRect(x - 4, y + 3, 9, 2); ctx.fillStyle = '#F8A050'; ctx.fillRect(x - 4, y + 3, 9, 1);
  },
  gx4cBoost(ctx, e, f) {
    const v = e.v || {};
    if (v.k === 0) {   // the pad and the line it'll come down
      gx4cCross(ctx, v.tx, v.ty, 12, f);
      ctx.fillStyle = 'rgba(248,56,0,0.6)'; for (let yy = (f >> 1) % 6; yy < v.ty - 10; yy += 6) ctx.fillRect(Math.round(v.tx), yy, 1, 3);
      if ((f >> 3) & 1) gx4cTiny(ctx, 'LZ', v.tx, v.ty - 3, '#F8F8F8', '#100808');
      return;
    }
    const x = Math.round(e.x), y = Math.round(e.y), fl = e.flash > 0;
    if (v.k >= 2) { ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(x, Math.round(v.ty), 9, 3, 0, 0, Math.PI * 2); ctx.fill(); }
    if (v.b || v.k === 2) {   // the engine burning (relit to land; the blast as it touches down)
      const big = v.k === 2 ? 3 : 1;
      for (let k = 0; k < 6 * big; k++) { const a = Math.random() * Math.PI, d = Math.random() * 8 * big; ctx.fillStyle = k % 3 ? '#F8B800' : '#F8F8F8'; ctx.fillRect(Math.round(x + Math.cos(a) * d * (v.k === 2 ? 1.6 : 0.4)), Math.round(y + 15 + Math.sin(a) * d * (v.k === 2 ? 0.5 : 1.4)), 2, 2); }
    }
    ctx.fillStyle = '#100808'; ctx.fillRect(x - 5, y - 16, 11, 32);
    ctx.fillStyle = fl ? '#F8F8F8' : '#E8E8F0'; ctx.fillRect(x - 4, y - 15, 9, 29);
    if (!fl) {
      ctx.fillStyle = '#A8A8B8'; ctx.fillRect(x + 2, y - 15, 3, 29);
      ctx.fillStyle = '#3C3C48'; ctx.fillRect(x - 4, y - 15, 9, 3); ctx.fillRect(x - 4, y + 4, 9, 2);   // the cap, a band
      ctx.fillStyle = '#58585C'; ctx.fillRect(x - 3, y + 8, 2, 4); ctx.fillRect(x + 1, y + 10, 3, 3);   // soot
      ctx.fillStyle = '#7C7C88'; ctx.fillRect(x - 7, y - 13, 2, 3); ctx.fillRect(x + 6, y - 13, 2, 3);   // grid fins
      ctx.fillStyle = '#3C3C48'; ctx.fillRect(x - 2, y + 14, 5, 2);   // the engine bell
      if (v.k >= 2 || (v.b && v.ty - 14 - e.y < 24)) { ctx.fillStyle = '#58585C'; ctx.fillRect(x - 8, y + 12, 3, 1); ctx.fillRect(x - 9, y + 13, 2, 3); ctx.fillRect(x + 6, y + 12, 3, 1); ctx.fillRect(x + 8, y + 13, 2, 3); }   // legs out
    }
  },
  gx4cPost(ctx, e, f) {
    const v = e.v || {}, x = Math.round(e.x - 13), y = Math.round(e.y - 8), hot = v.k === 1, edge = hot && (f >> 2) & 1 ? '#F83800' : '#100808';
    ctx.fillStyle = edge; ctx.fillRect(x, y, 26, 15); ctx.fillRect(x + 4, y + 15, 4, 2);
    ctx.fillStyle = e.flash > 0 ? '#C8C8C8' : '#F8F8F8'; ctx.fillRect(x + 1, y + 1, 24, 13); ctx.fillRect(x + 5, y + 14, 2, 1);
    ctx.fillStyle = '#3C8CF8'; ctx.fillRect(x + 2, y + 2, 4, 4); ctx.fillStyle = '#F8F8F8'; ctx.fillRect(x + 3, y + 3, 2, 2);   // the avatar
    gx4cTiny(ctx, GX4C_POSTS[v.w || 0], x + 16, y + 2, hot && (f >> 2) & 1 ? '#F83800' : '#100808');
    ctx.fillStyle = '#F83800'; ctx.fillRect(x + 3, y + 9, 1, 2); ctx.fillRect(x + 5, y + 9, 1, 2); ctx.fillRect(x + 3, y + 10, 3, 2); ctx.fillRect(x + 4, y + 12, 1, 1);   // a heart
    gx4cTiny(ctx, (v.n || 1) + '00K', x + 15, y + 8, '#585868');
  },
  gx4cMiniR(ctx, e, f) {
    const v = e.v || {};
    if (v.k === 1) { gx4cCross(ctx, v.tx, v.ty, 10, f); return; }
    if (v.k === 2) { gx4cCross(ctx, v.tx, v.ty, 10, f); ctx.fillStyle = 'rgba(248,56,0,0.5)'; for (let yy = Math.round(e.y) + 8; yy < v.ty - 6; yy += 4) ctx.fillRect(Math.round(v.tx), yy, 1, 2); }
    const x = Math.round(e.x), y = Math.round(e.y), up = v.k === 0, fl = e.flash > 0;
    ctx.fillStyle = (f >> 1) & 1 ? '#F8B800' : '#F83800'; ctx.fillRect(x - 1, up ? y + 5 : y - 9, 3, 4);
    ctx.fillStyle = '#100808'; ctx.fillRect(x - 2, y - 6, 5, 12);
    ctx.fillStyle = fl ? '#F8F8F8' : '#E8E8F0'; ctx.fillRect(x - 1, y - 5, 3, 10);
    ctx.fillStyle = '#F83800'; ctx.fillRect(x - 1, up ? y - 5 : y + 3, 3, 2);
  },
  // the broken-down cab: smoke, hazard lights; he gets out, phones; the tow drone takes it away
  gx4cWreck(ctx, e, f) {
    const v = e.v || {}, t = v.t || 0, x = Math.round(v.x), y = Math.round(v.y), img = GxGfx.boss('gx4cElon', 4 + ((f >> 3) & 1), 'n', 1);
    const lift = t > 190, man = t > 24 && !lift;
    // the tow drone and its cable
    if (t > 120) {
      const dy = lift ? y - 30 : Math.min(y - 30, -20 + (t - 120) * 1.4);
      ctx.fillStyle = '#7C7C88'; ctx.fillRect(x, Math.round(dy) + 6, 1, Math.max(0, y + 4 - Math.round(dy) - 6));
      gx4cTowDrone(ctx, x, Math.round(dy), f);
    }
    ctx.drawImage(img, x - 32, y);
    if ((f >> 3) & 1) { ctx.fillStyle = '#F8B800'; ctx.fillRect(x - 28, y + 28, 3, 3); ctx.fillRect(x + 25, y + 28, 3, 3); }
    for (let k = 0; k < 8; k++) { const q = ((t * 1.5 + k * 13) % 60) / 60; ctx.fillStyle = q < 0.5 ? 'rgba(120,120,128,0.9)' : 'rgba(170,170,180,0.6)'; ctx.fillRect(Math.round(x - 4 + Math.sin(k * 2 + q * 4) * 4 + q * 6), Math.round(y + 26 - q * 30), 3 + Math.round(q * 3), 3 + Math.round(q * 3)); }
    if (man) {
      const side = x > FW / 2 ? -1 : 1, mx = x + side * (30 + Math.min(10, Math.max(0, t - 24) / 3)), my = y + 46;
      gx4cElonMan(ctx, Math.round(mx), my, f, t > 40 && t < 170 ? 'phone' : 'stand');
      if (t > 46 && t < 170) gxSpeech(ctx, t < 110 ? 'HELLO? TOW TRUCK?' : 'YES... IT DRIVES ITSELF.', mx, my - 36);
    }
    if (lift) gx4cElonMan(ctx, x + 8, y + 6, f, 'wave');
  },
  // THE DESKTOP
  gx4cErr(ctx, e, f) {
    const v = e.v || {}, [x, y, w, h] = gx4cDlg(e), p = Math.min(1, (v.p ?? 10) / 10), m = GX4C_ERRS[v.m || 0];
    if (p < 1) { ctx.fillStyle = '#F8F8F8'; const ww = Math.round(w * p), hh = Math.round(h * p); ctx.fillRect(Math.round(e.x - ww / 2), Math.round(y + h / 2 - hh / 2), ww, 1); ctx.fillRect(Math.round(e.x - ww / 2), Math.round(y + h / 2 + hh / 2), ww, 1); ctx.fillRect(Math.round(e.x - ww / 2), Math.round(y + h / 2 - hh / 2), 1, hh); ctx.fillRect(Math.round(e.x + ww / 2), Math.round(y + h / 2 - hh / 2), 1, hh); return; }
    const X = Math.round(x), Y = Math.round(y);
    ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(X + 2, Y + 2, w, h);
    gx4cWindow(ctx, X, Y, w, h, m[0], '#C0C0C0');
    ctx.fillStyle = '#F80000'; ctx.beginPath(); ctx.arc(X + 7, Y + 14, 3.5, 0, Math.PI * 2); ctx.fill();   // the red X sign
    ctx.fillStyle = '#F8F8F8'; ctx.fillRect(X + 5, Y + 12, 1, 1); ctx.fillRect(X + 6, Y + 13, 3, 1); ctx.fillRect(X + 7, Y + 12, 1, 5); ctx.fillRect(X + 9, Y + 12, 1, 1); ctx.fillRect(X + 5, Y + 16, 1, 1); ctx.fillRect(X + 9, Y + 16, 1, 1); ctx.fillRect(X + 6, Y + 15, 3, 1);
    gx4cTiny(ctx, m[1], X + 32, Y + 11, '#000000');
    gx4cBevel(ctx, Math.round(e.x - 7), Math.round(e.y - 4), 14, 8, e.flash > 0 ? '#F8F8F8' : '#C0C0C0');   // OK: the one place to hit it
    ctx.fillStyle = '#000000'; ctx.fillRect(Math.round(e.x - 7), Math.round(e.y - 4), 14, 1);
    gx4cTiny(ctx, 'OK', e.x, Math.round(e.y - 2), (f >> 3) & 1 ? '#000000' : '#000080');
  },
  gx4cCur(ctx, e, f) { gxSprite(ctx, e, f); },
  gx4cHour(ctx, e, f) {
    const v = e.v || {}, img = GxGfx.get('gx4cHour', (f >> 4) & 1, e.flash > 0 ? 'f' : 'n');
    if (v.r) { ctx.save(); ctx.translate(Math.round(e.x), Math.round(e.y)); ctx.rotate(v.r / 12 * Math.PI); ctx.drawImage(img, -5, -7); ctx.restore(); }
    else ctx.drawImage(img, Math.round(e.x - 5), Math.round(e.y - 7));
  },
  gx4cClip(ctx, e, f) {
    const v = e.v || {};
    gxSprite(ctx, e, f);
    if (v.tip >= 0 && GX4C_TIPS[v.tip]) {   // a tooltip of a tip
      const [a, b] = GX4C_TIPS[v.tip], w = Math.max(a.length, b.length) * 4 + 6, x = Math.round(Math.max(1, Math.min(FW - w - 1, e.x - w / 2))), y = Math.round(Math.max(1, e.y - 32));
      ctx.fillStyle = '#100808'; ctx.fillRect(x - 1, y - 1, w + 2, 17); ctx.fillStyle = v.k && (f >> 2) & 1 ? '#F8D8B0' : '#F8F8C8'; ctx.fillRect(x, y, w, 15);
      ctx.fillRect(Math.round(e.x) - 1, y + 15, 3, 3);
      gx4cTiny(ctx, a, x + w / 2, y + 2, '#000000'); gx4cTiny(ctx, b, x + w / 2, y + 8, '#000000');
    }
  },
  gx4cFlop(ctx, e, f) { gxSprite(ctx, e, f); },
  gx4cPipe(ctx, e, f) {
    const v = e.v; if (!v || !v.p || v.p.length < 4) return;
    const [c1, c2, c3] = GX4C_PIPE_COLS[v.c || 0];
    if (v.w) {   // where it'll come in: a flashing joint at the edge
      if ((f >> 2) & 1) { const x = Math.max(4, Math.min(FW - 4, v.p[0])), y = Math.max(4, Math.min(FH - 4, v.p[1])); ctx.fillStyle = c1; ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#F8F8F8'; ctx.fillRect(x - 1, y - 1, 2, 2); }
      return;
    }
    const segs = gx4cSegs(v.p);
    for (const [x0, y0, x1, y1] of segs) {   // each run: dark edges, the colour, a shine along it
      const hz = y0 === y1, x = Math.min(x0, x1), y = Math.min(y0, y1), L = hz ? Math.abs(x1 - x0) : Math.abs(y1 - y0);
      if (hz) { ctx.fillStyle = '#100808'; ctx.fillRect(x, y - 4, L, 9); ctx.fillStyle = c2; ctx.fillRect(x, y - 3, L, 7); ctx.fillStyle = c1; ctx.fillRect(x, y - 2, L, 4); ctx.fillStyle = c3; ctx.fillRect(x, y - 2, L, 1); }
      else { ctx.fillStyle = '#100808'; ctx.fillRect(x - 4, y, 9, L); ctx.fillStyle = c2; ctx.fillRect(x - 3, y, 7, L); ctx.fillStyle = c1; ctx.fillRect(x - 2, y, 4, L); ctx.fillStyle = c3; ctx.fillRect(x - 2, y, 1, L); }
    }
    for (let i = 2; i < v.p.length; i += 2) {   // the joints, balls; the head one bright
      const x = v.p[i], y = v.p[i + 1], head = i === v.p.length - 2;
      ctx.fillStyle = '#100808'; ctx.beginPath(); ctx.arc(x, y, 5.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = head && (f >> 2) & 1 ? c3 : c1; ctx.beginPath(); ctx.arc(x, y, 4.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = c3; ctx.fillRect(x - 2, y - 3, 2, 2);
    }
  },
  gx4cBlk(ctx, e, f) {
    const v = e.v || {}, x = Math.round(e.x - 7), y = Math.round(e.y - 5), cols = [['#3C5CF8', '#1C2C98'], ['#58D8F8', '#1C7C98'], ['#F83800', '#881800']][v.c || 0];
    ctx.fillStyle = '#000000'; ctx.fillRect(x - 1, y - 1, 16, 12);
    ctx.fillStyle = e.flash > 0 || v.m ? '#F8F8F8' : cols[0]; ctx.fillRect(x, y, 14, 10);
    if (e.flash > 0) return;
    ctx.fillStyle = cols[1]; ctx.fillRect(x, y + 8, 14, 2); ctx.fillRect(x + 12, y, 2, 10);
    ctx.fillStyle = 'rgba(248,248,248,0.5)'; ctx.fillRect(x + 1, y + 1, 10, 1);
    if (v.c === 2) { ctx.fillStyle = '#F8F8F8'; ctx.fillRect(x + 4, y + 2, 1, 1); ctx.fillRect(x + 8, y + 2, 1, 1); ctx.fillRect(x + 4, y + 6, 5, 1); }   // a bad one frowns
  },
  gx4cField(ctx, e, f) {
    const v = e.v; if (!v) return;
    const nc = ['', '#0000F8', '#008000', '#F80000', '#000080', '#800000', '#008080', '#000000', '#808080'];
    for (let r = 0; r < v.r; r++) for (let c = 0; c < v.c; c++) {
      const ch = v.s[r * v.c + c], x = v.x0 + c * 16, y = Math.round(v.y) + r * 16;
      if (y > FH || y < -16) continue;
      if (ch === 'h') { gx4cBevel(ctx, x, y, 16, 16); ctx.fillStyle = '#808080'; ctx.fillRect(x + 1, y + 14, 14, 1); ctx.fillRect(x + 14, y + 1, 1, 14); continue; }
      ctx.fillStyle = 'rgba(192,192,192,0.45)'; ctx.fillRect(x, y, 16, 16); ctx.fillStyle = 'rgba(128,128,128,0.6)'; ctx.fillRect(x, y, 16, 1); ctx.fillRect(x, y, 1, 16);
      if (ch >= '1' && ch <= '8') { ctx.fillStyle = 'rgba(232,232,232,0.85)'; ctx.fillRect(x + 3, y + 3, 10, 10); Font.draw(ctx, ch, x + 5, y + 5, nc[+ch]); }
      else if (ch === 'x') { ctx.fillStyle = 'rgba(248,0,0,0.5)'; ctx.fillRect(x + 1, y + 1, 15, 15); ctx.fillStyle = '#000000'; ctx.beginPath(); ctx.arc(x + 8, y + 8, 3, 0, Math.PI * 2); ctx.fill(); }
      else if (ch === 'f') { ctx.fillStyle = '#000000'; ctx.fillRect(x + 7, y + 4, 1, 9); ctx.fillRect(x + 5, y + 12, 6, 1); ctx.fillStyle = '#F80000'; ctx.fillRect(x + 4, y + 4, 4, 4); }
    }
  },
  gx4cWin(ctx, e, f) {
    const v = e.v || {}, x = Math.round(e.x - 22), y = Math.round(e.y - 15), titles = ['MY TANK', 'README.TXT', 'CONTROL', 'PAINT', 'CALCULATOR', 'NOTEPAD'];
    if (v.k === 0) { if ((f >> 2) & 1) { ctx.fillStyle = '#F8F8F8'; for (let i = 0; i < 44; i += 3) { ctx.fillRect(x + i, y, 2, 1); ctx.fillRect(x + i, y + 29, 2, 1); } for (let j = 0; j < 30; j += 3) { ctx.fillRect(x, y + j, 1, 2); ctx.fillRect(x + 43, y + j, 1, 2); } } return; }
    if (v.k === 2) { const s = v.s ?? 0, w = Math.max(2, Math.round(44 * s)), h = Math.max(2, Math.round(30 * s)); ctx.fillStyle = '#F8F8F8'; ctx.fillRect(Math.round(e.x - w / 2), Math.round(e.y - h / 2), w, 1); ctx.fillRect(Math.round(e.x - w / 2), Math.round(e.y + h / 2), w, 1); ctx.fillRect(Math.round(e.x - w / 2), Math.round(e.y - h / 2), 1, h); ctx.fillRect(Math.round(e.x + w / 2), Math.round(e.y - h / 2), 1, h); return; }
    gx4cWindow(ctx, x, y, 44, 30, titles[(v.n || 0) % titles.length], e.flash > 0 ? '#E8E8E8' : '#F8F8F8');
    ctx.fillStyle = '#C0C0C0'; for (let j = 0; j < 3; j++) ctx.fillRect(x + 4, y + 13 + j * 4, 20 + ((j * 7 + (v.n || 0) * 5) % 14), 1);
  },
  gx4cSafe(ctx, e, f) {
    const t = (e.v && e.v.t) || 0;
    if (t < 26) {   // the old screen switching off: down to a line, then to a dot
      const k = t / 26, w = Math.round(FW * (k < 0.6 ? 1 : 1 - (k - 0.6) / 0.4)), h = Math.max(1, Math.round(FH * 0.6 * (1 - Math.min(1, k / 0.6))));
      ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(0, 0, FW, FH);
      ctx.fillStyle = '#F8F8F8'; ctx.fillRect(Math.round(FW / 2 - w / 2), Math.round(FH * 0.4 - h / 2), Math.max(1, w), h);
      return;
    }
    const a = t > 260 ? Math.max(0, 1 - (t - 260) / 40) : 1, y = Math.round(FH * 0.16);
    ctx.globalAlpha = a;
    ctx.fillStyle = '#000000'; ctx.fillRect(4, y - 6, FW - 8, 38);
    Font.drawCenter(ctx, 'IT IS NOW SAFE TO', FW / 2, y, '#F8A030');
    Font.drawCenter(ctx, 'TURN OFF YOUR', FW / 2, y + 10, '#F8A030');
    Font.drawCenter(ctx, 'COMPUTER.', FW / 2, y + 20, '#F8A030');
    ctx.globalAlpha = 1;
  },
  gx4cChCar(ctx, e, f) { gxSprite(ctx, e, f); },
  gx4cChFlop(ctx, e, f) { gxSprite(ctx, e, f); },
});
// a tow drone: four rotors, a hook on a cable
function gx4cTowDrone(ctx, x, y, f) {
  ctx.fillStyle = '#100808'; ctx.fillRect(x - 12, y - 2, 25, 8);
  ctx.fillStyle = '#F8B800'; ctx.fillRect(x - 11, y - 1, 23, 6); ctx.fillStyle = '#100808'; for (let i = -10; i < 12; i += 4) ctx.fillRect(x + i, y + 1, 2, 2);
  ctx.fillStyle = (f >> 1) & 1 ? '#F83800' : '#F8F8F8'; ctx.fillRect(x - 1, y - 4, 3, 2);
  ctx.fillStyle = '#BCBCBC'; for (const dx of [-16, 12]) ctx.fillRect(x + dx + ((f >> 1) & 1 ? 0 : 2), y - 3, (f >> 1) & 1 ? 6 : 2, 1);
  gx4cTiny(ctx, 'TOW', x, y, '#100808');
}
// him, a little figure (x: his middle, y: his feet): dark hair, a black T-shirt, jeans; on the phone, waving, standing
function gx4cElonMan(ctx, x, y, f, pose) {
  const pal = { h: '#3C2818', s: '#F0B890', k: '#C07858', t: '#181818', j: '#283858', b: '#100808', p: '#A8A8B8', w: '#F8F8F8' };
  const body = ['..hhh..', '.hhhhh.', '.hssss.', '.skssk.', '..sss..', '...s...', '.ttttt.', 'ttttttt', 'ttttttt', '.ttttt.', '.jjjjj.', '.jj.jj.', '.jj.jj.', '.jj.jj.', 'bbb.bbb'];
  const rows = body.slice();
  if (pose === 'phone') { rows[2] = '.hsssps'; rows[3] = '.skssps'; rows[4] = '..sss.s'; rows[5] = '...s..t'; rows[7] = 'tttttt.'; rows[8] = 'stttt..'; }
  else if (pose === 'wave') { const up = (f >> 3) & 1; rows[1] = up ? '.hhhhh.s' : '.hhhhhs.'; rows[2] = up ? '.hsssss.' : '.hsssss'; rows[6] = '.tttttt'; rows[8] = 'sttttt.'; }
  else { rows[8] = 'stttts.'.slice(0, 7); }
  for (let j = 0; j < rows.length; j++) for (let i = 0; i < rows[j].length; i++) { const c = pal[rows[j][i]]; if (c) { ctx.fillStyle = c; ctx.fillRect(x - 3 + i, y - 15 + j, 1, 1); } }
  ctx.fillStyle = '#100808'; ctx.fillRect(x - 1, y - 12, 1, 1); ctx.fillRect(x + 1, y - 12, 1, 1);   // eyes
}

// their shots (all with the red danger glow drawn first)
Object.assign(GX_BULLET_DRAW, {
  gx4cBox(ctx, x, y, f, hot) { ctx.fillStyle = hot; ctx.fillRect(x - 4, y - 4, 9, 8); ctx.fillStyle = '#8C5824'; ctx.fillRect(x - 3, y - 3, 7, 6); ctx.fillStyle = '#C8884C'; ctx.fillRect(x - 3, y - 3, 7, 2); ctx.fillStyle = '#F8F0C8'; ctx.fillRect(x, y - 3, 1, 6); },
  gx4cWave(ctx, x, y, f, hot, b) {
    const v = Math.hypot(b.vx || 0, b.vy || 1) || 1, nx = -(b.vy || 1) / v, ny = (b.vx || 0) / v, ux = (b.vx || 0) / v, uy = (b.vy || 1) / v;
    for (let k = -3; k <= 3; k++) { const bend = (k * k) * 0.25; ctx.fillStyle = Math.abs(k) < 2 ? '#F8F8F8' : '#F8D800'; ctx.fillRect(Math.round(x + nx * k - ux * bend) - 1, Math.round(y + ny * k - uy * bend) - 1, 2, 2); }
  },
  gx4cSand(ctx, x, y, f) { ctx.fillStyle = '#A8D8F8'; ctx.fillRect(x - 3, y - 3, 7, 7); ctx.fillStyle = '#F8D878'; ctx.fillRect(x - 2, y - 2, 5, 5); ctx.fillStyle = '#C8A050'; ctx.fillRect(x - 1 + ((f >> 2) & 1), y, 2, 2); ctx.fillStyle = '#F8F8F8'; ctx.fillRect(x - 2, y - 2, 1, 1); },
  gx4cClick(ctx, x, y, f, hot) { ctx.fillStyle = hot; ctx.fillRect(x - 3, y - 4, 7, 9); gx4cBits(ctx, ['X....', 'XX...', 'X1X..', 'X11X.', 'X1XXX', 'XX...'], x - 2, y - 3, { X: '#000000', 1: '#F8F8F8' }); },
  gx4cCard(ctx, x, y, f, hot, b) { gx4cCardImg(ctx, x - 4, y - 5, (b && b.s) | 0, hot); },
});
// a playing card, 9x11: white, a red or black suit mark
function gx4cCardImg(ctx, x, y, s, edge = '#100808') {
  ctx.fillStyle = edge; ctx.fillRect(x - 1, y - 1, 11, 13);
  ctx.fillStyle = '#F8F8F8'; ctx.fillRect(x, y, 9, 11);
  const red = s % 2 === 0, col = red ? '#F80000' : '#000000';
  const marks = [['.X.X.', 'XXXXX', '.XXX.', '..X..'], ['..X..', '.XXX.', 'XXXXX', '..X..'], ['.X.', 'XXX', '.X.', 'XXX'], ['..X..', 'XXXXX', '..X..', '.XXX.']][s % 4];
  gx4cBits(ctx, marks, x + 2, y + 4, { X: col });
  ctx.fillStyle = col; ctx.fillRect(x + 1, y + 1, 2, 1); ctx.fillRect(x + 6, y + 9, 2, 1);
}

// ------------------------------------------------------------------ the skies
const GX4C_BOARDS = [['MARS', '42 KM'], ['EXIT', 'PHOBOS'], ['DEIMOS', 'DINER'], ['ROBOTAXI', 'SOON'], ['TUNNEL', 'AHEAD'], ['NO', 'SIGNAL'], ['RED DUST', 'NEXT 9 KM'], ['VALLES', 'MARINERIS']];
function gx4cBgMars(c, f, g) {
  const W = VIEW_W, H = VIEW_H;
  // red dust thickening towards the bottom
  const gr = c.createLinearGradient(0, 0, 0, H);
  gr.addColorStop(0, 'rgba(60,8,20,0)'); gr.addColorStop(0.5, 'rgba(120,36,20,0.18)'); gr.addColorStop(1, 'rgba(168,64,24,0.3)');
  c.fillStyle = gr; c.fillRect(0, 0, W, H);
  // Mars ahead: its limb across the top, craters, pads where rockets take off and boosters come home
  const R = Math.max(150, W * 0.75), cx = W / 2 + Math.sin(f / 900) * 6, cy = -R + 46;
  const pg = c.createRadialGradient(cx - R * 0.2, cy + R * 0.6, R * 0.2, cx, cy, R);
  pg.addColorStop(0, '#E07040'); pg.addColorStop(0.7, '#A83C1C'); pg.addColorStop(1, '#5C1408');
  c.fillStyle = pg; c.beginPath(); c.arc(cx, cy, R, 0, Math.PI * 2); c.fill();
  c.fillStyle = 'rgba(248,160,120,0.25)'; c.fillRect(0, Math.round(cy + R - 3), W, 1);
  const rr = seeded(404);
  for (let k = 0; k < 9; k++) { const x = rr() * W, d = rr() * 34, y = cy + Math.sqrt(Math.max(0, R * R - (x - cx) ** 2)) - 6 - d; c.fillStyle = 'rgba(80,16,8,0.45)'; c.beginPath(); c.ellipse(x, y, 3 + rr() * 5, 1.5 + rr() * 2, 0, 0, Math.PI * 2); c.fill(); }
  const limb = x => cy + Math.sqrt(Math.max(0, R * R - (x - cx) ** 2));
  for (let k = 0; k < 4; k++) {
    const px = W * (0.14 + k * 0.24) + Math.sin(k) * 6, py = limb(px) - 2;
    c.fillStyle = '#3C1408'; c.fillRect(Math.round(px - 5), Math.round(py), 11, 2); c.fillStyle = '#887068'; c.fillRect(Math.round(px + 4), Math.round(py - 7), 1, 7);   // a pad, its tower
    if ((f >> 4) & 1) { c.fillStyle = '#F83800'; c.fillRect(Math.round(px + 4), Math.round(py - 8), 1, 1); }
    // its rocket's cycle: up it goes; a while later a booster comes back down on the pad
    const per = 520 + k * 130, q = (f + k * 211) % per;
    if (q < 160) { const y = py - 4 - (q * q) / 300; if (y > -10) { c.fillStyle = '#F8F8F8'; c.fillRect(Math.round(px), Math.round(y), 1, 4); c.fillStyle = (f >> 1) & 1 ? '#F8D800' : '#F87800'; c.fillRect(Math.round(px), Math.round(y + 4), 1, 2 + ((f >> 2) & 1)); c.fillStyle = 'rgba(200,200,200,0.3)'; c.fillRect(Math.round(px), Math.round(y + 6), 1, Math.round(Math.min(30, py - y))); } }
    else if (q > per - 140) { const k2 = (per - q) / 140, y = py - 4 - k2 * k2 * 60; c.fillStyle = '#E8E8E8'; c.fillRect(Math.round(px - 1), Math.round(y), 1, 4); if ((f >> 1) & 1) { c.fillStyle = '#F8B800'; c.fillRect(Math.round(px - 1), Math.round(y + 4), 1, 2); } }
  }
  // dust drifting by (two layers)
  for (let k = 0; k < 7; k++) {
    const sp = k < 4 ? 0.25 : 0.55, x = ((k * 71 + Math.sin(f / 300 + k) * 20) % W + W) % W, y = ((k * 53 + f * sp) % (H + 80)) - 40;
    c.fillStyle = 'rgba(184,80,40,' + (k < 4 ? 0.07 : 0.1) + ')'; c.beginPath(); c.ellipse(x, y, 30 + k * 4, 12 + k * 2, 0, 0, Math.PI * 2); c.fill();
  }
  // the highway: translucent, neon edges, lane markings racing by (at road speed: what's on the road keeps pace with them)
  const top = 50, n = gx4cLanes(), lw = W / n, off = (f * GX4C_ROAD) % 24;
  const rg = c.createLinearGradient(0, top - 10, 0, top + 40);
  rg.addColorStop(0, 'rgba(20,10,28,0)'); rg.addColorStop(1, 'rgba(20,10,28,0.62)');
  c.fillStyle = rg; c.fillRect(3, top - 10, W - 6, H - top + 10);
  for (let i = 1; i < n; i++) {
    const x = Math.round(i * lw);
    c.fillStyle = 'rgba(232,232,248,0.45)';
    for (let y = top - 24 + off; y < H; y += 24) if (y + 10 > top) c.fillRect(x, Math.max(top, Math.round(y)), 1, Math.round(Math.min(10, y + 10 - top)));
  }
  for (const [x, col] of [[3, '88,248,248'], [W - 4, '248,88,200']]) {
    c.fillStyle = 'rgba(' + col + ',0.18)'; c.fillRect(x - 2, top, 5, H - top);
    c.fillStyle = 'rgba(' + col + ',0.85)'; c.fillRect(x, top, 1, H - top);
    for (let y = top - 32 + (f * GX4C_ROAD) % 32; y < H; y += 32) if (y > top) { c.fillStyle = 'rgba(' + col + ',1)'; c.fillRect(x - 1, Math.round(y), 3, 2); }
  }
  // billboards going by on the shoulders
  for (let k = 0; k < 2; k++) {
    const per = 700, q = (f * GX4C_ROAD * 1.15 + k * 350) % per, y = Math.round(q - 60), b = GX4C_BOARDS[(Math.floor((f * GX4C_ROAD * 1.15 + k * 350) / per) * 3 + k * 5) % GX4C_BOARDS.length];
    if (y > H + 10) continue;
    const x = k ? W - 44 : 4, col = k ? '#C838A8' : '#28A8B8';
    c.globalAlpha = 0.6;
    c.fillStyle = '#585868'; c.fillRect(x + 8, y + 20, 2, 10); c.fillRect(x + 30, y + 20, 2, 10);
    c.fillStyle = '#100810'; c.fillRect(x - 1, y - 1, 42, 22); c.fillStyle = col; c.fillRect(x, y, 40, 20);
    c.fillStyle = 'rgba(248,248,248,0.25)'; c.fillRect(x, y, 40, 1);
    gx4cTiny(c, b[0], x + 20, y + 4, '#F8F8F8', '#100808'); gx4cTiny(c, b[1], x + 20, y + 11, (f >> 4) & 1 ? '#F8F878' : '#F8F8F8', '#100808');
    c.globalAlpha = 1;
  }
  // the tunnel: its walls close in from both sides, rings of concrete, lamps along the edges
  const S = g && g.gx4c;
  if (S && S.tun > 0) {
    const tcx = gx4cTunCx(g), hw = gx4cTunHw(g), L = Math.round(tcx - hw), Rx = Math.round(tcx + hw), ro = (f * GX4C_ROAD) % 24;
    c.fillStyle = 'rgba(0,0,0,' + (0.35 * S.tun).toFixed(2) + ')'; c.fillRect(L, 0, Rx - L, H);   // dim inside
    for (const [x0, x1, s] of [[0, L, 1], [Rx, W, -1]]) {
      if (x1 - x0 < 1) continue;
      c.fillStyle = '#26222C'; c.fillRect(x0, 0, x1 - x0, H);
      c.fillStyle = '#3A3440'; for (let y = -24 + ro; y < H; y += 24) c.fillRect(x0, Math.round(y), x1 - x0, 3);
      c.fillStyle = '#16121A'; for (let y = -24 + ro; y < H; y += 24) c.fillRect(x0, Math.round(y) + 3, x1 - x0, 1);
      const edge = s > 0 ? x1 - 3 : x0;
      c.fillStyle = '#100C14'; c.fillRect(edge, 0, 3, H);
      for (let y = -24 + ro + 10; y < H; y += 24) { c.fillStyle = 'rgba(248,184,64,0.25)'; c.fillRect(edge - (s > 0 ? 6 : -1), Math.round(y) - 2, 8, 6); c.fillStyle = '#F8C858'; c.fillRect(edge + (s > 0 ? 0 : 1), Math.round(y), 2, 2); }
    }
  }
}

// the desktop: icons, a pipes screensaver at the back, the busy cursor wandering, the taskbar
const GX4C_ICONS = [['MY TANK', 'pc'], ['RECYCLE BIN', 'bin'], ['INBOX', 'mail'], ['NETWORK', 'net'], ['README.TXT', 'txt'], ['GAMES', 'cards'], ['MY BRIEFCASE', 'case'], ['MARS.BMP', 'pic']];
function gx4cIcon(c, kind, x, y) {
  const R = (dx, dy, w, h, col) => { c.fillStyle = col; c.fillRect(x + dx, y + dy, w, h); };
  if (kind === 'pc') { R(1, 0, 14, 11, '#000000'); R(2, 1, 12, 9, '#C0C0C0'); R(3, 2, 10, 7, '#000080'); R(4, 3, 3, 1, '#58A8F8'); R(4, 12, 8, 3, '#C0C0C0'); R(4, 14, 8, 1, '#808080'); }
  else if (kind === 'bin') { R(3, 2, 10, 2, '#808080'); R(4, 4, 8, 11, '#C0C0C0'); for (let i = 5; i < 12; i += 2) R(i, 5, 1, 9, '#808080'); R(6, 0, 4, 2, '#808080'); }
  else if (kind === 'mail') { R(1, 4, 14, 10, '#F8F8F8'); R(1, 4, 14, 1, '#808080'); for (let i = 0; i < 7; i++) { R(1 + i, 5 + i * 0.6, 1, 1, '#808080'); R(14 - i, 5 + i * 0.6, 1, 1, '#808080'); } R(10, 9, 3, 3, '#F80000'); }
  else if (kind === 'net') { c.fillStyle = '#2850F8'; c.beginPath(); c.arc(x + 8, y + 8, 7, 0, Math.PI * 2); c.fill(); R(4, 4, 4, 3, '#38B838'); R(9, 8, 4, 4, '#38B838'); R(3, 10, 3, 2, '#38B838'); }
  else if (kind === 'txt') { R(3, 0, 10, 15, '#F8F8F8'); R(3, 0, 10, 1, '#808080'); for (let i = 3; i < 13; i += 2) R(5, i, 6, 1, '#000080'); }
  else if (kind === 'cards') { gx4cCardImg(c, x + 2, y + 2, 1); gx4cCardImg(c, x + 6, y + 4, 0); }
  else if (kind === 'case') { R(1, 4, 14, 10, '#A87830'); R(1, 4, 14, 1, '#D8A858'); R(5, 1, 6, 3, '#784818'); R(6, 2, 4, 2, '#007474'); R(7, 8, 2, 2, '#F8D800'); }
  else { R(1, 2, 14, 12, '#F8F8F8'); R(2, 3, 12, 10, '#000000'); R(2, 9, 12, 4, '#A83C1C'); c.fillStyle = '#E07040'; c.beginPath(); c.arc(x + 8, y + 9, 4, Math.PI, 0); c.fill(); }
}
function gx4cBgDesk(c, f, g) {
  const W = VIEW_W, H = VIEW_H;
  // a faint dither so the teal isn't flat, and a vignette
  c.fillStyle = 'rgba(0,0,0,0.05)'; for (let y = 0; y < H; y += 2) c.fillRect(0, y, W, 1);
  const vg = c.createRadialGradient(W / 2, H / 2, W * 0.3, W / 2, H / 2, W * 0.8); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.25)');
  c.fillStyle = vg; c.fillRect(0, 0, W, H);
  // the pipes screensaver, far behind, growing and starting over
  const per = 1100, cyc = Math.floor(f / per), q = f % per, r = seeded(cyc * 31 + 7);
  c.globalAlpha = 0.08 * Math.min(1, q / 60, (per - q) / 60);
  for (let k = 0; k < 3; k++) {
    const col = GX4C_PIPE_COLS[(cyc + k) % GX4C_PIPE_COLS.length];
    let x = 12 + Math.floor(r() * (W - 24) / 12) * 12, y = 12 + Math.floor(r() * (H - 24) / 12) * 12, dir = Math.floor(r() * 4), left = q * 0.9 - k * 120;
    for (let s = 0; s < 40 && left > 0; s++) {
      const len = Math.min(left, 12 * (1 + Math.floor(r() * 4))), dx = [0, 1, 0, -1][dir], dy = [-1, 0, 1, 0][dir];
      const nx = Math.max(6, Math.min(W - 6, x + dx * len)), ny = Math.max(6, Math.min(H - 6, y + dy * len));
      c.fillStyle = col[1]; c.fillRect(Math.min(x, nx) - 3, Math.min(y, ny) - 3, Math.abs(nx - x) + 7, Math.abs(ny - y) + 7);
      c.fillStyle = col[0]; c.fillRect(Math.min(x, nx) - 2, Math.min(y, ny) - 2, Math.abs(nx - x) + 4, Math.abs(ny - y) + 4);
      c.fillStyle = col[2]; c.beginPath(); c.arc(nx, ny, 4, 0, Math.PI * 2); c.fill();
      x = nx; y = ny; left -= len; dir = (dir + (r() < 0.5 ? 1 : 3)) % 4;
    }
  }
  c.globalAlpha = 1;
  // desktop icons: the ground going by, slowly (two columns at the sides, a few in between)
  const sp = 0.3, gapY = 44;
  for (let col = 0; col < 3; col++) {
    const x = col === 0 ? 6 : col === 1 ? W - 24 : W / 2 - 9;
    for (let k = -1; k < H / gapY + 1; k++) {
      const idx = Math.floor((f * sp) / gapY) - k, y = Math.round(((f * sp) % gapY) + k * gapY);
      const pick = ((idx * 7 + col * 13) % 11 + 11) % 11;
      if (col === 2 && pick > 2) continue;
      if (pick > 7) continue;
      const [name, kind] = GX4C_ICONS[(pick + col * 3) % GX4C_ICONS.length];
      c.globalAlpha = 0.75;
      gx4cIcon(c, kind, x + 1, y);
      gx4cTiny(c, name, x + 9, y + 18, '#F8F8F8', '#003C3C');
      c.globalAlpha = 1;
    }
  }
  // the busy cursor wanders about the desktop
  const bx = W / 2 + Math.sin(f / 170) * W * 0.36, by = H * 0.5 + Math.sin(f / 230 + 1) * H * 0.3;
  c.globalAlpha = 0.45;
  gx4cBits(c, ['X.......', 'XX......', 'X1X.....', 'X11X....', 'X111X...', 'X1111X..', 'X11XXXX.', 'XX......'], Math.round(bx), Math.round(by), { X: '#000000', 1: '#F8F8F8' });
  gx4cBits(c, ['XXXXX', 'X111X', '.X1X.', '..X..', '.X1X.', 'X111X', 'XXXXX'], Math.round(bx) + 6, Math.round(by) + 5, { X: '#000000', 1: (f >> 4) & 1 ? '#F8F8F8' : '#F8D878' });
  c.globalAlpha = 1;
  // the taskbar: START, a few windows, the clock
  const ty = H - 12;
  c.fillStyle = '#C0C0C0'; c.fillRect(0, ty, W, 12); c.fillStyle = '#F8F8F8'; c.fillRect(0, ty, W, 1); c.fillStyle = '#DCDCDC'; c.fillRect(0, ty + 1, W, 1);
  gx4cBevel(c, 2, ty + 2, 32, 9);
  gx4cFlag(c, 5, ty + 3, 7, 6, f, false);
  gx4cTiny(c, 'START', 23, ty + 4, '#000000');
  for (const [x, w, t] of [[37, 40, 'TANK.EXE'], [79, 36, 'MARS.BMP']]) { gx4cBevel(c, x, ty + 2, w, 9, '#C0C0C0', t === 'TANK.EXE'); gx4cTiny(c, t, x + w / 2, ty + 4, '#000000'); }
  gx4cBevel(c, W - 30, ty + 2, 28, 9, '#C0C0C0', true);
  const mins = Math.floor(f / 60) % 720, hh = (Math.floor(mins / 60) % 12) || 12;
  gx4cTiny(c, hh + ((f >> 5) & 1 ? ':' : ' ') + String(mins % 60).padStart(2, '0'), W - 16, ty + 4, '#000000');
}

// ------------------------------------------------------------------ over the field: frozen ships, the selection, the connection, the defrag
function gx4cRenderOver(ctx, st) {
  const g = st.galaxy, f = st.frame, S = g.gx4c;
  for (const t of st.tanks) if (t.alive && t.isPlayer && t.gx4cBusy > 0) {   // frozen by sand: the busy hourglass over the ship
    if (t.frozen > 0) gx4cBits(ctx, ['XXXXX', 'X111X', '.X1X.', '..X..', '.X1X.', 'X111X', 'XXXXX'], t.x + 5, t.y - 9, { X: '#000000', 1: (f >> 2) & 1 ? '#F8F8F8' : '#F8D878' });
    t.gx4cBusy--;
  }
  if (S && S.sel) {   // SELECT... DELETE
    const s = S.sel, k = Math.min(1, s.t / 40), corners = [[0, 0], [1, 0], [0, 1], [1, 1]], [ax, ay] = corners[s.c || 0];
    const x0 = s.x + ax * s.w, y0 = s.y + ay * s.h, x1 = x0 + (s.x + (1 - ax) * s.w - x0) * k, y1 = y0 + (s.y + (1 - ay) * s.h - y0) * k;
    const L = Math.round(Math.min(x0, x1)), T = Math.round(Math.min(y0, y1)), w = Math.round(Math.abs(x1 - x0)), h = Math.round(Math.abs(y1 - y0));
    if (s.t >= 80) { if (s.t < 92) { ctx.fillStyle = (f >> 1) & 1 ? 'rgba(248,248,248,0.8)' : 'rgba(0,0,128,0.7)'; ctx.fillRect(L, T, w, h); } }
    else {
      if (s.t >= 40) { ctx.fillStyle = (f >> 2) & 1 ? 'rgba(0,0,128,0.35)' : 'rgba(0,0,128,0.18)'; ctx.fillRect(L, T, w, h); }
      ctx.fillStyle = s.t >= 40 && (f >> 2) & 1 ? '#F83800' : '#F8F8F8';
      for (let i = (f >> 1) % 4; i < w; i += 4) { ctx.fillRect(L + i, T, 2, 1); ctx.fillRect(L + w - 1 - i, T + h - 1, 2, 1); }
      for (let j = (f >> 1) % 4; j < h; j += 4) { ctx.fillRect(L, T + h - 1 - j, 1, 2); ctx.fillRect(L + w - 1, T + j, 1, 2); }
      gx4cBits(ctx, ['X.......', 'XX......', 'X1X.....', 'X11X....', 'X111X...', 'X1111X..', 'X11XXXX.', 'XX......'], Math.round(x1), Math.round(y1), { X: '#000000', 1: '#F8F8F8' });
      if (s.t >= 40) { const tw = 7 * 8 + 4; ctx.fillStyle = '#C0C0C0'; ctx.fillRect(L + w / 2 - tw / 2, T - 12, tw, 11); Font.drawCenter(ctx, 'DELETE?', L + w / 2, T - 10, (f >> 3) & 1 ? '#F80000' : '#000000'); }
    }
  }
  if (S && S.lag) {   // DIAL-UP: the connection box
    const t = S.lagT || 0, x = 6, y = FH - 38, done = t > 150;
    gx4cWindow(ctx, x, y, 92, 24, 'DIAL-UP', '#C0C0C0');
    gx4cTiny(ctx, done ? 'CONNECTED 14400' : 'DIALING' + '...'.slice(0, (t >> 4) % 4), x + 46, y + 12, '#000000');
    const pg = done ? (((t - 150) * 0.6) % 84) : t / 150 * 84;
    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(x + 4, y + 18, 84, 3); ctx.fillStyle = '#000080'; for (let i = 0; i < pg; i += 4) ctx.fillRect(x + 4 + i, y + 18, 3, 3);
    if (done && (t >> 5) % 5 === 0) { ctx.fillStyle = 'rgba(0,0,0,0.12)'; for (let yy = (t * 3) % 8; yy < FH; yy += 8) ctx.fillRect(0, yy, FW, 2); }   // line noise
  }
  const blks = g.list.filter(e => e.type === 'gx4cBlk');
  if (blks.length) {   // DEFRAG: how far it's got
    const n0 = (blks[0].v && blks[0].v.n) || blks.length, pc = Math.max(0, Math.min(99, Math.round((1 - blks.length / n0) * 100)));
    gx4cWindow(ctx, FW - 98, FH - 38, 92, 24, 'DEFRAG', '#C0C0C0');
    gx4cTiny(ctx, pc + '% COMPLETE', FW - 52, FH - 26, '#000000');
    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(FW - 94, FH - 20, 84, 3); ctx.fillStyle = '#000080'; ctx.fillRect(FW - 94, FH - 20, Math.round(84 * pc / 100), 3);
  }
}
{
  const r0 = Stage.prototype.renderGalaxy;
  Stage.prototype.renderGalaxy = function (ctx) {
    const r = r0.apply(this, arguments);
    if (!this.galaxy) return r;
    ctx.save(); ctx.translate(FX, FY); ctx.beginPath(); ctx.rect(0, 0, VIEW_W, VIEW_H); ctx.clip();
    try { gx4cRenderOver(ctx, this); if (typeof gx4cFsdOver === 'function') gx4cFsdOver(ctx, this); } finally { ctx.restore(); }
    return r;
  };
}

// ------------------------------------------------------------------ the bosses
const GX4C_ELON_TALK = ["I'LL JUST DRIVE IT MYSELF.", 'NEXT YEAR. DEFINITELY.', 'BEST CAB EVER MADE.', "IT'S A FEATURE, NOT A BUG.", 'MARS OR BUST!', 'SELF-DRIVING IS BASICALLY SOLVED.', 'WHO NEEDS A STEERING WHEEL?', 'FIRST PRINCIPLES!', 'RATIO.'];
const GX4C_WIN_TALK = ['PLEASE WAIT...', 'IT LOOKS LIKE YOU ARE LOSING.', 'PLUG AND PRAY!', 'CLICK START TO STOP.', 'GENERAL PROTECTION FAULT!', 'DEFRAGMENTING YOUR TANK...', 'YOU HAVE PERFORMED AN ILLEGAL OPERATION.', 'INSERT DISK 14 OF 13.', 'SAVE YOUR WORK. OFTEN.'];
const GX4C_MENU = ['PROGRAMS', 'DOCUMENTS', 'SETTINGS', 'FIND', 'HELP', 'RUN...', 'SHUT DOWN...'];
{
  const at = GX_BOSSES.findIndex(d => d.key === 'cats');
  GX_BOSSES.splice(at < 0 ? GX4C_AT : at, 0,
    // ELON ON THE CYBERCAB: a boxy steel robotaxi seen head-on, its light bar right across the front, and in it a
    // rocket billionaire in a black T-shirt hunched over the wheel (it can't drive itself, so he drives it). He
    // swerves lane to lane, honks, posts, cuts across the road dropping cones, and swears it's not a flamethrower;
    // in phase 2 he lets go of the wheel (FULL SELF-DRIVING - BETA) and launches mini rockets; in phase 3 the cab
    // turns into a tartan steel wedge on rocket boosters (PLAID MODE) and dashes down your lane. Beaten, it breaks
    // down; he climbs out and phones for a tow.
    { key: 'gx4cElon', name: 'ELON ON THE CYBERCAB', w: 64, h: 48, hp: 840, pts: 54000, move: 'sway',
      phases: [['gx4cHonk', 'gx4cPosts', 'fan5', 'gx4cSwerve', 'gx4cFlame', 'aimed5'],
        ['gx4cFsd', 'gx4cPosts', 'gx4cRockets', 'gx4cHonk', 'gx4cFlame', 'gx4cSwerve', 'fan7'],
        ['gx4cPlaid', 'gx4cRockets', 'gx4cHonk', 'gx4cFsd', 'gx4cPlaid', 'gx4cPosts', 'gx4cFlame', 'spiral']],
      init(b) { b.lx = FW / 2; b.swT = 140; b.talkT = 420; b.skid = 0; this.gxSay(b, "IT CAN'T DRIVE ITSELF YET, SO I'LL DRIVE.", 170); Sound.play('gx4cHonk'); },
      update(b, g, near) {
        if (b.skid > 0) b.skid--;
        if (!b.say && --b.talkT <= 0) { this.gxSay(b, gx4cPick(GX4C_ELON_TALK), 110); b.talkT = 480 + rnd(300); }
        const xl = b.w / 2 + 2, xr = FW - b.w / 2 - 2;
        // PLAID MODE: lined up on your lane, the boosters roar, down the lane it goes and round again from the top
        const D = b.pd;
        if (D) {
          D.t++;
          if (D.st === 0) { b.x += (D.x - b.x) * 0.12; b.y += (16 - b.y) * 0.1; if (D.t >= 34) { D.st = 1; D.t = 0; Sound.play('gx4cPlaid'); } }
          else if (D.st === 1) { if (D.t >= 42) { D.st = 2; D.t = 0; D.vy = 1; } }
          else if (D.st === 2) { D.vy = Math.min(7, D.vy + 0.45); b.y += D.vy; if (b.y > FH + 10) { D.st = 3; b.y = -b.h - 16; b.x = gx4cClamp(FW / 2 + rnd(81) - 40, xl); } }
          else { b.y += Math.max(0.6, (16 - b.y) * 0.08); if (b.y >= 16) { b.y = 16; b.pd = null; } }
          return true;
        }
        // FULL SELF-DRIVING: hands up... then it careens about the top half on its own
        const F = b.fsd;
        if (F) {
          F.t++;
          if (F.t > 40) {
            if (F.t % 28 === 13) { const a = Math.random() * Math.PI * 2; F.vx = Math.cos(a) * (1.6 + 0.2 * b.ph); F.vy = Math.sin(a) * 1.2; Sound.play('gx4cScreech'); b.skid = 14; }
            b.x += F.vx; b.y += F.vy;
            const yb = Math.round(FH * 0.56) - b.h;
            if (b.x < xl) { b.x = xl; F.vx = Math.abs(F.vx); } if (b.x > xr) { b.x = xr; F.vx = -Math.abs(F.vx); }
            if (b.y < 12) { b.y = 12; F.vy = Math.abs(F.vy); } if (b.y > yb) { b.y = yb; F.vy = -Math.abs(F.vy); }
          }
          if (F.t >= F.dur) { b.fsd = null; b.lx = b.x; this.gxSay(b, 'OK, OK. I\'LL DRIVE.', 80); }
          return true;
        }
        // driving: lane to lane, a quick swerve each time (towards you more often than not)
        if (!b.hold) {
          if (--b.swT <= 0) {
            b.lx = gx4cClamp(near && rnd(3) ? near.x + 8 + rnd(81) - 40 : xl + rnd(Math.max(1, xr - xl)), xl);
            b.swT = 90 + rnd(80) - 15 * b.ph;
            if (Math.abs(b.lx - b.x) > 20) { Sound.play('gx4cScreech'); b.skid = 18; }
          }
          const d = b.lx - b.x; b.x += Math.sign(d) * Math.min(Math.abs(d), 1.3 + 0.4 * b.ph);
        }
        b.y += (16 + Math.sin(b.t / 50) * 2 - b.y) * 0.1;
        return true;
      },
      onPhase(b, g, ph) {
        b.fsd = null; b.honk = null; b.hold = false;
        if (b.pd || b.y > 40) { b.pd = null; b.y = -b.h; }
        if (ph === 2) this.gxSay(b, 'FINE. FULL SELF-DRIVING, ENGAGE!', 120);
        else { g.banner = { text: 'PLAID MODE!', t: 140, warn: true }; this.gxSay(b, 'PLAID MODE! HOLD MY COFFEE.', 120); Sound.play('gx4cPlaid'); }
      },
      onKill(b, g) {
        g.banner = { text: 'CAB BROKE DOWN!', t: 200 };
        this.gxSpawn({ type: 'gx4cWreck', st: 'gx4cWreckM', x: FW / 2, y: FH + 1000, v: { x: Math.round(b.x), y: Math.round(Math.max(10, Math.min(FH * 0.4, b.y))), t: 0 } });
      },
      frame: (b, fr) => ((fr >> 3) & 1) + 2 * (b.fsd && b.fsd.t > 16 ? 1 : 0),
      drawOver(ctx, b) { gx4cElonOver.call(this, ctx, b); },
    },
    // WINDOWS 95: a giant window, its title bar, its buttons; a teal desktop in it with a four-colour flag waving
    // (and glaring at you); a taskbar along its bottom with START. A cursor drags it about. START MENU, CASCADE
    // WINDOWS, ERROR dialogs; phase 2 BLUE SCREEN walls and SOLITAIRE VICTORY cards; phase 3 it lags: NOT
    // RESPONDING (frozen, then everything at once) and it smears as it's dragged. Beaten: it shuts down.
    { key: 'gx4cWin', name: 'WINDOWS 95', w: 96, h: 60, hp: 800, pts: 56400, move: 'sway',
      phases: [['gx4cStart', 'fan5', 'gx4cCascade', 'gx4cErrs', 'aimed5'],
        ['gx4cBsod', 'gx4cStart', 'gx4cCards', 'gx4cCascade', 'gx4cErrs', 'fan7'],
        ['gx4cHang', 'gx4cBsod', 'gx4cCards', 'gx4cStart', 'gx4cHang', 'gx4cCascade', 'ring16']],
      init(b) { b.drag = null; b.dragT = 140; b.talkT = 400; b.bsod = []; b.ctr = []; b.smear = []; b.menu = null; b.hang = null; b.gap = -1; this.gxSay(b, 'STARTING UP... PLEASE WAIT.', 150); Sound.play('gx4cStart'); },
      update(b, g, near, pl) {
        if (!b.say && --b.talkT <= 0) { this.gxSay(b, gx4cPick(GX4C_WIN_TALK), 110); b.talkT = 480 + rnd(300); }
        for (const tr of b.ctr) tr[3]++;
        b.ctr = b.ctr.filter(tr => tr[3] < 110);
        if (b.smear.length && (!b.drag || b.ph < 3) && b.t % 4 === 0) b.smear.shift();
        // BLUE SCREEN walls: outlined first, then they come down; a gap in each
        for (const r of b.bsod) {
          r.t++;
          if (r.t === r.warn) Sound.play('gx4cBsod');
          if (r.t < r.warn) continue;
          r.y += r.vy;
          for (const t of pl) { const px = t.x + 8, py = t.y + 9; if (py > r.y - 3 && py < r.y + r.h + 3 && !(Math.abs(px - r.gx) < r.gw / 2 - 5)) this.hitPlayer(t); }
        }
        b.bsod = b.bsod.filter(r => r.y < FH + 20);
        // NOT RESPONDING: frozen where it is (shaking at the end)
        if (b.hang) { b.hang.t++; if (b.hang.t > b.hang.dur - 22) b.x += (b.hang.t & 2 ? 1 : -1); return true; }
        // dragged about by a cursor on its title bar (lagging, in the last phase: it jumps)
        if (!b.hold) {
          if (b.drag) {
            const D = b.drag; D.t++;
            const k = Math.min(1, D.t / D.dur), e = k * k * (3 - 2 * k);
            if (b.ph < 3 || D.t % 6 === 0 || k >= 1) b.x = D.x0 + (D.x1 - D.x0) * e;
            if (b.ph >= 3 && D.t % 2 === 0) { b.smear.push([Math.round(b.x), Math.round(b.y)]); if (b.smear.length > 14) b.smear.shift(); }
            if (k >= 1) b.drag = null;
          } else if (--b.dragT <= 0) {
            const xl = b.w / 2 + 2, xr = FW - b.w / 2 - 2;
            b.drag = { x0: b.x, x1: gx4cClamp(near && rnd(2) ? near.x + 8 : xl + rnd(Math.max(1, xr - xl)), xl), t: 0, dur: 46 };
            b.dragT = 100 + rnd(80) - 20 * b.ph; Sound.play('gx4cDrag');
          }
        }
        b.y += (16 - b.y) * 0.1;
        return true;
      },
      onPhase(b, g, ph) {
        b.menu = null; b.hang = null; b.hold = false;
        if (ph === 2) this.gxSay(b, 'WINDOWS IS SHUTTING DOWN... JUST KIDDING.', 130);
        else { g.banner = { text: 'NOT RESPONDING!', t: 140, warn: true }; this.gxSay(b, 'PLEASE WAIT... PLEASE WAIT...', 120); Sound.play('gx4cHang'); }
      },
      onKill(b, g) {
        g.banner = { text: 'SHUTTING DOWN...', t: 200 };
        b.bsod = []; b.menu = null;
        this.gxSpawn({ type: 'gx4cSafe', st: 'gx4cSafeM', x: FW / 2, y: FH + 1000, v: { t: 0 } });
        const S = gx4cS(g); S.bsod = { t: -50 };   // the blue screen first (see the game's frame below)
        Sound.play('gx4cShut');
      },
      frame: (b, fr) => (b.hang ? 2 : (fr >> 3) & 1),
      drawUnder(ctx, b) {   // the last phase: the window smears as it's dragged (copies of its frame left behind)
        for (const [x, y] of b.smear || []) { const X = x - b.w / 2; gx4cBevel(ctx, X, y, b.w, b.h); ctx.fillStyle = '#000080'; ctx.fillRect(X + 3, y + 3, b.w - 6, 9); ctx.fillStyle = '#008080'; ctx.fillRect(X + 3, y + 13, b.w - 6, 35); }
      },
      drawOver(ctx, b) { gx4cWinOver.call(this, ctx, b); },
    },
  );
}

Object.assign(GX_BOSS_ACTS, {
  // ELON: HONK: his headlights flash and the cone shows, then three waves of sound down it (twice in the last phase)
  gx4cHonk(b, a, c) {
    if (a.t === 1) { a.n = 0; b.hold = true; b.honk = { t: 0, a: c.toward(b.x, b.y + b.h - 4), warn: 40 }; this.gxSay(b, gx4cPick(['HONK HONK!', 'OUT OF MY LANE!', 'BEEP BEEP!', 'MOVE IT!']), 60); }
    const H = b.honk;
    if (H) {
      H.t++;
      if (H.t === H.warn) Sound.play('gx4cHonk');
      if (H.t >= H.warn && (H.t - H.warn) % 9 === 0 && H.t - H.warn < 27) for (let i = -4; i <= 4; i++) c.shoot(b.x, b.y + b.h - 4, H.a + i * 0.08, 1.5, 'gx4cWave');
      if (H.t >= H.warn + 30) { a.n++; b.honk = b.ph >= 3 && a.n < 2 ? { t: 0, a: c.toward(b.x, b.y + b.h - 4), warn: 28 } : null; }
    }
    if (!b.honk) { b.hold = false; c.done(50); }
  },
  // POSTS: speech bubbles out over the road, which burst into their letters
  gx4cPosts(b, a, c) {
    const n = b.ph >= 3 ? 5 : b.ph >= 2 ? 4 : 3;
    if (c.g.list.filter(e => e.type === 'gx4cPost').length < 6) for (let i = 0; i < n; i++) {
      this.gxSpawn({ type: 'gx4cPost', st: 'gx4cPostM', sx: b.x, sy: b.y + b.h - 8, tx: gx4cClamp(20 + i * (FW - 40) / (n - 1) + rnd(11) - 5, 16), ty: 40 + (i % 2) * 16 + rnd(6), v: { w: rnd(GX4C_POSTS.length), n: 1 + rnd(9), k: 0 } });
    }
    this.gxSay(b, gx4cPick(['POSTING...', 'THIS IS HUGE.', 'CONCERNING.', 'INTERESTING.']), 70);
    Sound.play('gx4cPost'); c.done(70);
  },
  // SWERVE: over to one side, then right across the road, dropping a line of cones (a gap in it somewhere)
  gx4cSwerve(b, a, c) {
    const xl = b.w / 2 + 2, xr = FW - b.w / 2 - 2;
    if (a.t === 1) { b.hold = true; a.st = 0; a.dir = b.x < FW / 2 ? 1 : -1; a.gap = 30 + rnd(FW - 60); this.gxSay(b, 'SHORTCUT!', 60); }
    if (a.st === 0) { const tx = a.dir > 0 ? xl : xr; b.x += Math.sign(tx - b.x) * Math.min(Math.abs(tx - b.x), 3); if (Math.abs(tx - b.x) < 1) { a.st = 1; a.last = a.dir > 0 ? -7 : FW + 7; Sound.play('gx4cScreech'); b.skid = 30; } return; }
    b.x += a.dir * 3.4;
    // the cones come out from under it as it goes (all the way to the edge once it's across)
    const end = a.dir > 0 ? b.x >= xr : b.x <= xl, lim = end ? (a.dir > 0 ? FW - 6 : 6) : b.x;
    while (a.dir > 0 ? a.last + 14 <= lim : a.last - 14 >= lim) {
      a.last += a.dir * 14;
      if (Math.abs(a.last - a.gap) > 22) this.gxSpawn({ type: 'gx4cCone', st: 'gx4cRoad', x: a.last, sy: b.y + b.h - 6 });
    }
    if (end) { b.x = a.dir > 0 ? xr : xl; b.lx = b.x; b.hold = false; c.done(50); }
  },
  // NOT A FLAMETHROWER: it pulls over you and a column of fire comes down under it (twice, later)
  gx4cFlame(b, a, c) {
    const n = b.ph >= 2 ? 2 : 1;
    if (a.t === 1) { b.hold = true; a.cnt = 0; a.st = 0; a.tx = gx4cClamp(c.near ? c.near.x + 8 : b.x, b.w / 2 + 2); this.gxSay(b, "IT'S NOT A FLAMETHROWER!", 90); }
    if (a.st === 0) {
      b.x += Math.sign(a.tx - b.x) * Math.min(Math.abs(a.tx - b.x), 2.4);
      if (Math.abs(a.tx - b.x) < 1) { a.st = 1; a.t0 = a.t; b.beams.push({ x: b.x, w: 14, top: b.y + b.h - 6, t: 0, warn: 40, dur: 48, kind: 'fire', snd: 'gx4cFlame' }); }
    } else if (a.t - a.t0 >= 40 + 48) {
      if (++a.cnt < n) { a.st = 0; a.tx = gx4cClamp(c.near ? c.near.x + 8 : FW - b.x, b.w / 2 + 2); }
      else { b.hold = false; b.lx = b.x; c.done(50); }
    }
  },
  // FULL SELF-DRIVING - BETA: hands off the wheel; it careens about, the light bar spraying shots
  gx4cFsd(b, a, c) {
    if (a.t === 1) { b.fsd = { t: 0, dur: b.ph >= 3 ? 280 : 220, vx: 0, vy: 0 }; c.g.banner = { text: 'FULL SELF-DRIVING (BETA)', t: 120, warn: true }; this.gxSay(b, 'LOOK, NO HANDS!', 90); Sound.play('gx4cFsd'); }
    if (b.fsd && b.fsd.t > 40 && a.t % (b.ph >= 3 ? 9 : 12) === 0) c.shoot(b.x + rnd(41) - 20, b.y + b.h - 4, Math.PI / 2 + (Math.random() - 0.5) * 1.6, 1.25);
    if (!b.fsd) c.done(50);
  },
  // MINI ROCKETS: up they go, crosshairs round you, down they come
  gx4cRockets(b, a, c) {
    if (a.t === 1) {
      const n = b.ph >= 3 ? 5 : 3, px = c.near ? c.near.x + 8 : FW / 2, py = c.near ? c.near.y + 9 : FH * 0.7;
      for (let i = 0; i < n; i++) {
        const tx = Math.round(gx4cClamp(px + (i - (n - 1) / 2) * 34, 10)), ty = Math.round(Math.min(FH - 14, Math.max(FH * 0.45, py + (i % 2 ? 14 : -10))));
        const e = this.gxSpawn({ type: 'gx4cMiniR', st: 'gx4cMiniM', tx, ty });
        e.x = b.x + (i - (n - 1) / 2) * 8; e.y = b.y + 8; e.vx = (tx - e.x) / 60;
      }
      this.gxSay(b, 'TO MARS! AND BACK!', 80); Sound.play('gx4cRocket');
    }
    if (a.t >= 40) c.done(80);
  },
  // PLAID MODE: it lines up on your lane and dashes down it
  gx4cPlaid(b, a, c) {
    if (a.t === 1) { b.pd = { st: 0, t: 0, x: gx4cClamp(c.near ? c.near.x + 8 : FW / 2, b.w / 2 + 2) }; this.gxSay(b, gx4cPick(['PLAID!', 'LUDICROUS SPEED!', 'ZERO TO SIXTY!']), 60); }
    if (!b.pd) c.done(50);
    else if (a.t > 600) { b.pd = null; b.y = 16; c.done(40); }
  },
  // WINDOWS 95: START MENU: it unfolds under the START button, every item lit in turn fires its own pattern
  gx4cStart(b, a, c) {
    const n = b.ph >= 2 ? 7 : 5, items = n === 7 ? [0, 1, 2, 3, 4, 5, 6] : [0, 1, 2, 4, 6], open = n * 4;
    if (a.t === 1) { b.menu = { t: 0, items, k: -1 }; Sound.play('gx4cStart'); this.gxSay(b, 'START!', 50); }
    const M = b.menu; if (!M) { c.done(30); return; }
    M.t++;
    const step = Math.max(12, 18 - 2 * b.ph), i = Math.floor((M.t - open - 10) / step);
    if (M.t > open + 10 && i < items.length) {
      M.k = i;
      if ((M.t - open - 10) % step === 8) {
        const it = items[i], mx = b.x - b.w / 2 + 64, my = b.y + b.h + 6 + i * 9, to = c.toward(mx, my);
        if (it === 0) for (let k = -2; k <= 2; k++) c.shoot(mx, my, to + k * 0.2, 1.4);
        else if (it === 1) for (const d of [-0.2, 0, 0.2]) c.shoot(mx, my, to + d, 1.3, 'gx4cDoc');
        else if (it === 2) for (let k = 0; k < 10; k++) c.shoot(mx, my, k * Math.PI / 5 + M.t * 0.1, 1.1);
        else if (it === 3) { c.shoot(mx, my, to, 2.2); c.shoot(mx, my, to, 1.7); }
        else if (it === 4) for (const d of [-0.35, 0, 0.35]) c.shoot(mx, my, Math.PI / 2 + d, 1.2, gx4cLetter('?'));
        else if (it === 5) 'RUN'.split('').forEach((ch, k) => c.shoot(mx, my, to + (k - 1) * 0.12, 1.3 + k * 0.15, gx4cLetter(ch)));
        else for (let k = -3; k <= 3; k++) c.shoot(mx, my, Math.PI / 2 + k * 0.22, 1.25);
        Sound.play('gx4cClick');
      }
    }
    if (M.t > open + 10 + items.length * step + 10) { b.menu = null; c.done(50); }
  },
  // CASCADE WINDOWS: windows stack diagonally across your zone, as walls (their outlines show first)
  gx4cCascade(b, a, c) {
    const n = 3 + b.ph, dir = rnd(2) ? 1 : -1, x0 = dir > 0 ? 30 + rnd(30) : FW - 30 - rnd(30), y0 = Math.round(FH * 0.4);
    for (let i = 0; i < n; i++) this.gxSpawn({ type: 'gx4cWin', st: 'gx4cWinM', tx: gx4cClamp(x0 + dir * i * 21, 24), ty: Math.min(FH - 18, y0 + i * 14), warn: 44 + i * 6, stay: 180, n: rnd(6) });
    this.gxSay(b, 'CASCADE!', 60); Sound.play('gx4cDrag');
    c.done(90);
  },
  // ERROR: dialogs pop up below it
  gx4cErrs(b, a, c) {
    const n = b.ph >= 2 ? 3 : 2;
    // off to the sides of it (they'd only shield it), and they don't stay long
    if (c.g.list.filter(e => e.type === 'gx4cErr').length < 4) for (let i = 0; i < n; i++) {
      const side = i % 2 ? 1 : -1, x = b.x + side * (54 + rnd(30) + (i >> 1) * 40);
      this.gxSpawn({ type: 'gx4cErr', st: 'gx4cPop', tx: Math.round(gx4cClamp(x < 28 || x > FW - 28 ? b.x - side * (54 + rnd(30)) : x, 28)), ty: 70 + rnd(18), life: 380 });
    }
    this.gxSay(b, gx4cPick(['ERROR!', 'ARE YOU SURE?', 'ABORT, RETRY, FAIL?']), 70);
    c.done(70);
  },
  // BLUE SCREEN: screen-wide walls come down from it, a gap in each
  gx4cBsod(b, a, c) {
    const n = b.ph >= 3 ? 3 : 2;
    if (a.t === 1) this.gxSay(b, gx4cPick(['FATAL EXCEPTION!', 'A BLUE SCREEN FOR YOU.', 'PRESS ANY KEY... TO DIE.']), 80);
    if (a.t % 52 === 1 && a.t < n * 52) {
      b.gap = b.gap < 0 ? 30 + rnd(FW - 60) : gx4cClamp(b.gap + (rnd(2) ? 1 : -1) * (24 + rnd(40)), 26);
      b.bsod.push({ y: Math.round(b.y + b.h + 4), h: 14, gx: Math.round(b.gap), gw: 38, t: 0, warn: 36, vy: 0.75 * Math.min(1.4, c.s), m: rnd(3) });
    }
    if (a.t >= n * 52) c.done(60);
  },
  // SOLITAIRE VICTORY: cards fly off its top corners and bounce down the screen, leaving trails
  gx4cCards(b, a, c) {
    const n = b.ph >= 3 ? 6 : 4;
    if (a.t === 1) this.gxSay(b, 'YOU WIN! NOT REALLY.', 80);
    if (a.t % 18 === 1 && a.t < n * 18) {
      const k = Math.floor(a.t / 18), sd = k % 2 ? 1 : -1;
      c.g.bullets.push({ x: b.x + sd * 40, y: b.y + 12, vx: sd * (0.6 + Math.random() * 0.6) * c.s, vy: -(0.4 + Math.random() * 0.9), k: 'gx4cCard', s: k % 4 });
      Sound.play('gx4cCard');
    }
    if (a.t >= n * 18 + 40) c.done(60);
  },
  // NOT RESPONDING: it freezes (the hourglass), then does everything it was holding at once
  gx4cHang(b, a, c) {
    if (a.t === 1) { b.hang = { t: 0, dur: 80 + rnd(30) }; b.drag = null; Sound.play('gx4cHang'); }
    const H = b.hang;
    if (!H) { c.done(30); return; }
    if (H.t >= H.dur) {
      b.hang = null;
      for (let k = 0; k < 14; k++) c.shoot(b.x, b.y + b.h / 2, k * Math.PI / 7, 1.1);
      const to = c.toward(c.cx, c.cy);
      for (let k = -2; k <= 2; k++) c.shoot(c.cx, c.cy, to + k * 0.18, 1.6);
      this.gxSay(b, 'RESPONDING!', 60); Sound.play('gx4cBurst');
      if (typeof gxShake === 'function') gxShake(c.g, 8, 2);
      c.done(50);
    }
  },
});
GX_BULLET_DRAW.gx4cDoc = function (ctx, x, y, f, hot) {
  ctx.fillStyle = hot; ctx.fillRect(x - 4, y - 5, 9, 11);
  ctx.fillStyle = '#F8F8F8'; ctx.fillRect(x - 3, y - 4, 7, 9); ctx.fillStyle = '#000080'; ctx.fillRect(x - 2, y - 2, 5, 1); ctx.fillRect(x - 2, y, 5, 1); ctx.fillRect(x - 2, y + 2, 3, 1);
};

// ------------------------------------------------------------------ their pictures
Object.assign(GX_BOSS_PALS, {
  gx4cElon: [null, '#E8ECF0', '#A8B0BC', '#5C6470', '#F8F8F8', '#F8F8D0', '#1C2840', '#08080C', '#F0B890', '#3C2818', '#181818', '#F83800', '#202024', '#C81830', '#F8B800', '#3C5070', '#C07858'],
  gx4cWin: [null, '#F8F8F8', '#C0C0C0', '#808080', '#404040', '#000080', '#008080', '#000000', '#F83800', '#38B838', '#2850F8', '#F8D800', '#1084D0', '#005C5C'],
});
Object.assign(GX_BOSS_DRAW, {
  // f: bit 0 the animation, f >> 1 his pose (0 at the wheel, 1 hands up, 2 nobody: broken down); ph 3: PLAID MODE
  gx4cElon(f, ph) {
    const P = bossPainter(64, 48), a = f & 1, pose = f >> 1, plaid = ph >= 3;
    if (plaid) for (const x0 of [0, 56]) { P.rect(x0, 6, x0 + 7, 25, 2); P.rect(x0, 6, x0, 25, 1); P.rect(x0 + 7, 6, x0 + 7, 25, 3); P.rect(x0 + 1, 2, x0 + 6, 5, 3); P.rect(x0 + 2, 0, x0 + 5, 1, 12); P.rect(x0 + 1, 12, x0 + 6, 13, 13); P.rect(x0 + 1, 18, x0 + 6, 19, 13); }
    for (const x0 of [1, 55]) { P.rect(x0, 31, x0 + 7, 46, 12); for (let y = 32 + a; y < 46; y += 3) P.rect(x0 + 1, y, x0 + 6, y, 3); }
    P.rect(4, 26, 59, 41, 2); P.rect(4, 26, 59, 26, 1); P.rect(4, 27, 4, 41, 1); P.rect(59, 27, 59, 41, 3); P.rect(5, 40, 58, 41, 3); P.rect(6, 42, 57, 43, 12);
    // the cabin: glass in a steel frame, a trapezoid (in plaid mode a sharp wedge)
    for (let y = 4; y < 27; y++) {
      const k = (y - 4) / 22, half = plaid ? 5 + k * 23 : 15 + k * 13, x0 = Math.round(32 - half), x1 = Math.round(31 + half);
      P.rect(x0, y, x1, y, 2); P.px(x0, y, 1); P.px(x1, y, 3);
      if (y > 5 && y < 26) P.rect(x0 + 2, y, x1 - 2, y, 6);
    }
    P.rect(Math.round(32 - (plaid ? 5 : 15)), 4, Math.round(31 + (plaid ? 5 : 15)), 4, 1);
    if (pose < 2) {
      const hy = 13;
      for (let y = 19; y < 26; y++) { const w = 7 + Math.min(4, y - 19); P.rect(32 - w, y, 31 + w, y, 10); }   // the black T-shirt, shoulders hunched
      P.rect(30, 17, 33, 18, 16);
      P.disc(32, hy, 4.6, 8); for (let y = hy - 4; y <= hy + 4; y++) for (let x = 34; x <= 37; x++) if (P.g[y][x] === 8) P.px(x, y, 16);
      P.rect(28, hy - 5, 36, hy - 3, 9); P.rect(28, hy - 6, 34, hy - 6, 9); P.px(27, hy - 2, 9); P.px(37, hy - 2, 9); P.px(27, hy - 1, 9);
      if (pose === 0) { P.px(30, hy, 7); P.px(34, hy, 7); P.line(29, hy - 1, 31, hy - 1, 9); P.line(33, hy - 2, 35, hy - 2, 9); P.line(30, hy + 3, 34, hy + 3, 7); P.px(35, hy + 2, 7); }   // a smirk, one brow up
      else { P.rect(30, hy - 1, 30, hy, 7); P.rect(34, hy - 1, 34, hy, 7); P.rect(31, hy + 2, 33, hy + 4, 7); P.px(32, hy + 3, 11); }   // wheee
      P.rect(25, 23, 39, 23, 3); P.rect(24, 24, 40, 24, 7); P.px(25, 22, 3); P.px(39, 22, 3); P.rect(31, 24, 33, 25, 3);   // the wheel
      if (pose === 0) { P.line(22, 21, 26, 23, 8); P.line(42, 21, 38, 23, 8); P.rect(25, 22, 27, 23, 8); P.rect(37, 22, 39, 23, 8); }   // hands on it
      else { P.line(22, 20, 19, 9 - a, 8); P.line(42, 20, 45, 9 - a, 8); P.rect(18, 7 - a, 20, 9 - a, 8); P.rect(44, 7 - a, 46, 9 - a, 8); }   // LOOK, NO HANDS
    } else {
      P.rect(25, 23, 39, 23, 3); P.rect(24, 24, 40, 24, 7);
      for (const [dx, dy] of [[-8, -6], [6, -8], [9, 4], [-7, 5], [1, 9]]) P.line(30, 14, 30 + dx, 14 + dy, 4);   // a cracked windscreen, nobody at the wheel
    }
    for (let i = 0; i < 9; i++) for (const d of [0, 1]) { const x = 37 + i + d, y = 7 + i * 2; if (P.g[y] && P.g[y][x] === 6) P.px(x, y, 15); }   // a glint on the glass
    if (plaid) for (let y = 27; y < 40; y++) for (let x = 5; x < 59; x++) { if (y === 29 || y === 30) continue; const vx = (x - 5) % 8 < 2, hy2 = (y - 27) % 8 < 2; if (vx || hy2) P.px(x, y, vx && hy2 ? 11 : 13); }   // tartan
    for (let x = 8; x <= 55; x++) P.px(x, 29, (x + a * 2) % 4 < 2 ? 5 : 4);   // the light bar, chasing
    P.rect(8, 30, 55, 30, 3);
    for (const x0 of [12, 40]) for (let y = 33; y < 39; y += 2) P.rect(x0, y, x0 + 11, y, 3);
    P.rect(28, 34, 35, 37, 4); P.rect(29, 35, 34, 36, 1);
    P.rect(1, 22, 4, 25, 2); P.px(1, 22, 1); P.rect(59, 22, 62, 25, 2); P.px(62, 25, 3);
    gxScars(P, ph, 71, 3, 11, a, (x, y) => y > 31 && y < 41 && x > 6 && x < 57);
    P.outline(); return P.g;
  },
  // f: bit 0 the flag's wave, 2: hung (the title greyed, the flag still)
  gx4cWin(f, ph) {
    const P = bossPainter(96, 60), a = f & 1, hang = f === 2;
    P.rect(0, 0, 95, 59, 2); P.rect(0, 0, 95, 0, 1); P.rect(0, 0, 0, 59, 1); P.rect(95, 0, 95, 59, 4); P.rect(0, 59, 95, 59, 4); P.rect(94, 1, 94, 58, 3); P.rect(1, 58, 94, 58, 3);
    for (let x = 3; x < 93; x++) { const k = (x - 3) / 90; for (let y = 3; y < 12; y++) P.px(x, y, k < 0.45 || (k < 0.75 && (x + y) % 2) ? (hang ? 3 : 5) : (hang ? 2 : 12)); }
    [66, 75, 85].forEach((x0, i) => {
      P.rect(x0, 4, x0 + 7, 10, 2); P.rect(x0, 4, x0 + 7, 4, 1); P.rect(x0, 4, x0, 10, 1); P.rect(x0 + 7, 4, x0 + 7, 10, 4); P.rect(x0, 10, x0 + 7, 10, 4);
      if (i === 0) P.rect(x0 + 2, 8, x0 + 4, 8, 7); else if (i === 1) { P.rect(x0 + 2, 5, x0 + 5, 8, 7); P.rect(x0 + 3, 7, x0 + 4, 7, 2); } else { P.line(x0 + 2, 5, x0 + 5, 8, 7); P.line(x0 + 5, 5, x0 + 2, 8, 7); }
    });
    P.rect(3, 13, 92, 48, 6); P.rect(3, 13, 92, 13, 3); P.rect(3, 13, 3, 48, 3);
    // the flag, waving: four panes, glaring eyes on its top two
    const dyAt = i => Math.round(Math.sin(i * 0.25 + (hang ? 0 : a * 1.5)) * 2 + i * 0.06);
    for (let i = 0; i < 36; i++) {
      if (i === 17 || i === 18) continue;
      const x = 32 + i, dy = dyAt(i);
      for (let y = 0; y < 26; y++) { if (y === 12 || y === 13) continue; P.px(x, 18 + y + dy, [8, 9, 10, 11][(i > 17 ? 1 : 0) + (y > 13 ? 2 : 0)]); }
    }
    for (let k = 0; k < 4; k++) { const tx = 26 - k * 5, ty = 20 + k * 3 + (a && !hang ? 1 : 0); P.rect(tx, ty, tx + 2, ty + 2, [8, 9, 10, 11][k]); P.rect(tx - 1, ty + 12, tx + 1, ty + 14, [10, 11, 8, 9][k]); }
    for (const [ex, i] of [[40, 8], [58, 26]]) {
      const ey = 22 + dyAt(i);
      P.rect(ex - 3, ey, ex + 3, ey + 5, 1); P.rect(ex - 1 + (ex < 50 ? 1 : 0), ey + 2, ex + (ex < 50 ? 1 : 0), ey + 4, 7);
      const s = ex < 50 ? 1 : -1;
      for (let j = 0; j < 7; j++) P.px(ex - 3 + j, ey - 2 + Math.round((s > 0 ? j : 6 - j) * (ph >= 2 ? 0.45 : 0.2)), 7);
    }
    if (ph >= 2) for (let i = 0; i < 9; i++) P.px(45 + i, 37 + dyAt(13 + i) + (i === 0 || i === 8 ? -1 : 0), 7);   // a grimace across the bottom panes
    // the taskbar: START, a clock
    P.rect(3, 49, 92, 56, 2); P.rect(3, 49, 92, 49, 1);
    P.rect(5, 50, 31, 55, 2); P.rect(5, 50, 31, 50, 1); P.rect(5, 50, 5, 55, 1); P.rect(31, 50, 31, 55, 4); P.rect(5, 55, 31, 55, 4);
    P.rect(7, 51, 8, 52, 8); P.rect(9, 51, 10, 52, 9); P.rect(7, 53, 8, 54, 10); P.rect(9, 53, 10, 54, 11);
    P.rect(70, 50, 90, 55, 2); P.rect(70, 50, 90, 50, 3); P.rect(70, 50, 70, 55, 3); P.rect(90, 50, 90, 55, 1); P.rect(70, 55, 90, 55, 1);
    if (ph >= 3) for (const [x0, y0, dx, dy] of [[14, 20, 8, 10], [80, 16, -7, 12], [20, 40, 10, -6]]) P.line(x0, y0, x0 + dx, y0 + dy, 1);
    gxScars(P, ph, 95, 3, 8, a, (x, y) => y > 13 && y < 48 && (x < 24 || x > 72));
    P.outline(); return P.g;
  },
});

// ELON, over his picture: tyre smoke, hazards, the honk's cone, the boosters, the plaid lane, the flamethrower's nozzle
function gx4cElonOver(ctx, b) {
  const f = this.frame, x0 = Math.round(b.x - b.w / 2), y0 = Math.round(b.y);
  if (b.skid > 0) for (let k = 0; k < 8; k++) { const q = ((f + k * 5) % 20) / 20; ctx.fillStyle = 'rgba(200,200,210,' + (0.6 * (1 - q)).toFixed(2) + ')'; ctx.fillRect(x0 + (k % 2 ? 58 : 2) + Math.round(Math.sin(k) * 3), y0 + 44 - Math.round(q * 18), 3 + Math.round(q * 3), 3); }
  if (b.fsd && (f >> 3) & 1) { ctx.fillStyle = '#F8B800'; ctx.fillRect(x0 + 5, y0 + 28, 3, 3); ctx.fillRect(x0 + 56, y0 + 28, 3, 3); }
  if (b.fsd && b.fsd.t < 60) gx4cTiny(ctx, 'BETA', b.x, y0 - 7, (f >> 2) & 1 ? '#F8D800' : '#F83800', '#100808');
  const H = b.honk;
  if (H && H.t < H.warn && (f >> 2) & 1) {   // the cone it's about to honk down
    ctx.fillStyle = '#F8D800';
    for (const s of [-0.36, 0.36]) for (let d = 10; d < 260; d += 5) { const x = b.x + Math.cos(H.a + s) * d, y = y0 + b.h - 4 + Math.sin(H.a + s) * d; if (y > FH || x < 0 || x > FW) break; ctx.fillRect(Math.round(x), Math.round(y), 2, 2); }
    ctx.fillStyle = '#F8F8D0'; ctx.fillRect(x0 + 8, y0 + 28, 48, 3);
  }
  if (b.ph >= 3) {   // the boosters
    const D = b.pd, big = D && D.st >= 1;
    for (const bx of [x0 + 3, x0 + 59]) for (let k = 0; k < (big ? 8 : 3); k++) { const q = ((f + k * 3) % 9) / 9; ctx.fillStyle = q < 0.3 ? '#F8F8F8' : q < 0.6 ? '#F8D800' : '#F83800'; ctx.fillRect(bx + (k % 3) - 1, y0 - 2 - Math.round(q * (big ? 18 : 7)), 2, 2); }
    if (D && D.st === 1) {   // the lane it's about to dash down
      const L = x0 - 2, R = x0 + b.w + 1;
      if ((f >> 2) & 1) { ctx.fillStyle = 'rgba(248,56,0,0.18)'; ctx.fillRect(L, y0 + b.h, R - L, FH - y0 - b.h); }
      ctx.fillStyle = (f >> 1) & 1 ? '#F83800' : '#F8F8F8';
      for (let y = y0 + b.h + ((f >> 1) % 6); y < FH; y += 6) { ctx.fillRect(L, y, 2, 3); ctx.fillRect(R - 1, y, 2, 3); }
    }
  }
  if (b.beams.some(bm => bm.kind === 'fire' && bm.t >= bm.warn)) { ctx.fillStyle = (f >> 1) & 1 ? '#F8D800' : '#F87800'; ctx.fillRect(Math.round(b.x) - 5, y0 + b.h - 6, 11, 4); }
}

// WINDOWS 95, over its picture: its words, the cursor that drags it, NOT RESPONDING, the blue screens, the menu, card trails
function gx4cWinOver(ctx, b) {
  const f = this.frame, x0 = Math.round(b.x - b.w / 2), y0 = Math.round(b.y);
  gx4cTiny(ctx, b.hang ? 'NOT RESPONDING' : 'WINDOWS 95', x0 + (b.hang ? 34 : 26), y0 + 5, '#F8F8F8', null);
  gx4cTiny(ctx, 'START', x0 + 22, y0 + 51, '#000000', null);
  gx4cTiny(ctx, (b.ph >= 3 && (f >> 4) & 1 ? '88:88' : '9:5' + ((f >> 6) % 10)), x0 + 80, y0 + 51, '#000000', null);
  if (b.hang) {
    ctx.fillStyle = 'rgba(248,248,248,0.3)'; ctx.fillRect(x0 + 3, y0 + 13, b.w - 6, 36);
    gx4cBits(ctx, ['XXXXXXX', 'X11111X', '.X111X.', '..X1X..', '.X1.1X.', 'X1.1.1X', 'XXXXXXX'], Math.round(b.x) - 3, y0 + 26, { X: '#000000', 1: (f >> 3) & 1 ? '#F8F8F8' : '#F8D878' });
  }
  if (b.drag) gx4cBits(ctx, ['X.......', 'XX......', 'X1X.....', 'X11X....', 'X111X...', 'X1111X..', 'X11XXXX.', 'XX......'], x0 + 40, y0 + 6, { X: '#000000', 1: '#F8F8F8' });
  for (const [x, y, s, age] of b.ctr || []) { ctx.globalAlpha = Math.max(0, 0.75 - age / 150); gx4cCardImg(ctx, x - 4, y - 5, s); }
  ctx.globalAlpha = 1;
  for (const r of b.bsod || []) {
    const y = Math.round(r.y), gl = r.gx - r.gw / 2, gr = r.gx + r.gw / 2, on = r.t >= r.warn;
    if (!on) {
      if ((r.t >> 2) & 1) { ctx.fillStyle = '#5858F8'; for (let x = 0; x < FW; x += 4) if (x < gl - 2 || x > gr) { ctx.fillRect(x, y, 2, 1); ctx.fillRect(x, y + r.h - 1, 2, 1); } ctx.fillStyle = '#F8F8F8'; ctx.fillRect(gl, y - 2, 1, r.h + 4); ctx.fillRect(gr, y - 2, 1, r.h + 4); }
      continue;
    }
    const msg = ['A FATAL EXCEPTION 0E HAS OCCURRED  ', 'PRESS ANY KEY TO CONTINUE  ', 'TANK.EXE IS NOT RESPONDING  '][r.m || 0];
    for (const [a, w] of [[0, Math.max(0, gl)], [gr, FW - gr]]) {
      if (w <= 0) continue;
      ctx.fillStyle = '#F8F8F8'; ctx.fillRect(a, y - 1, w, r.h + 2);
      ctx.fillStyle = '#0000A8'; ctx.fillRect(a, y, w, r.h);
      ctx.save(); ctx.beginPath(); ctx.rect(a, y, w, r.h); ctx.clip();
      const off = Math.round(r.t * 0.5) % (msg.length * 4);
      for (let k = -1; k < FW / (msg.length * 4) + 1; k++) gx4cTiny(ctx, msg, k * msg.length * 4 - off + msg.length * 2, y + 5, '#F8F8F8', null);
      ctx.restore();
    }
  }
  const M = b.menu;
  if (M) {
    const items = M.items, shown = Math.min(items.length, Math.floor(M.t / 4) + 1), mx = x0 + 2, my = y0 + b.h + 1, w = 64, h = shown * 9 + 4;
    gx4cBevel(ctx, mx, my, w, h);
    ctx.fillStyle = '#808080'; ctx.fillRect(mx + 2, my + 2, 7, h - 4); ctx.fillStyle = '#000080'; ctx.fillRect(mx + 3, my + 2, 5, h - 4);
    for (let i = 0; i < shown; i++) {
      const y = my + 2 + i * 9, lit = i === M.k;
      if (lit) { ctx.fillStyle = '#000080'; ctx.fillRect(mx + 10, y, w - 12, 9); }
      if (items[i] === 6) { ctx.fillStyle = '#808080'; ctx.fillRect(mx + 10, y - 1, w - 12, 1); }
      gx4cTiny(ctx, GX4C_MENU[items[i]], mx + 12 + GX4C_MENU[items[i]].length * 2, y + 2, lit ? '#F8F8F8' : '#000000', null);
      if (lit && (f >> 1) & 1) { ctx.fillStyle = '#F83800'; ctx.fillRect(mx + w - 4, y + 3, 3, 3); }
    }
  }
}

// ------------------------------------------------------------------ the boss screens (gxbossart.js loads later: these go in once it has)
const gx4cRoad = (c, t, cols = ['#140C1C', '#1C1028']) => {   // a highway going off towards Mars, its lanes racing
  for (let y = 22; y < INTRO_H; y++) {
    const k = (y - 22) / (INTRO_H - 22), half = 8 + k * 64, x0 = Math.round(56 - half), x1 = Math.round(56 + half);
    Pix.rect(c, x0, y, x1 - x0, 1, cols[y % 2]);
    Pix.rect(c, x0, y, 1, 1, '#58F8F8'); Pix.rect(c, x1 - 1, y, 1, 1, '#F858C8');
    for (const l of [-0.5, 0, 0.5]) if (((y * 1.5 + k * 30 - t * 0.8) % 10 + 10) % 10 < 5) Pix.rect(c, Math.round(56 + l * half), y, 1, 1, '#B8B8C8');
  }
};
const gx4cMarsSky = (c, t) => {
  Pix.bands(c, 0, 24, ['#0C0408', '#1C0810', '#3C1410']);
  Pix.stars(c, 20, 44, t, 20);
  GxArt.ball(c, 86, 2, 22, 18, ['#F8B080', '#E07040', '#A83C1C', '#7C2410', '#4C1408']);
  if (t % 160 < 70) { const q = t % 160, y = 20 - q * 0.3; Pix.rect(c, 70, Math.round(y), 1, 3, '#F8F8F8'); Pix.rect(c, 70, Math.round(y) + 3, 1, 2, (t >> 1) & 1 ? '#F8D800' : '#F87800'); }
};
const GX4C_ART = {
  gx4cElon: {
    intro(c, t) {
      gx4cMarsSky(c, t); gx4cRoad(c, t);
      const B = GxArt.boss('gx4cElon', (t >> 3) & 1, 1), x = 22 + Math.round(Math.sin(t / 40) * 6);
      c.drawImage(B, x, 8 + ((t >> 2) & 1));
      for (let k = 0; k < 5; k++) { const q = ((t * 2 + k * 9) % 40); Pix.rect(c, 4 + k * 22, 30 + q, 1, 4, 'rgba(248,248,248,0.5)'); }
      GxArt.ship(c, 92, 44 + Math.round(Math.sin(t / 14) * 2), t);
    },
    outro(c, t) {
      gx4cMarsSky(c, t); gx4cRoad(c, t * 0.1);
      const B = GxArt.boss('gx4cElon', 4 + ((t >> 3) & 1), 3);
      c.drawImage(B, 6, 16);
      Art.smoke(c, 36, 22, t, 5, 3, true);
      if ((t >> 3) & 1) { Pix.rect(c, 10, 44, 3, 3, '#F8B800'); Pix.rect(c, 61, 44, 3, 3, '#F8B800'); }
      gx4cElonMan(c, 78, 62, t, 'phone');
      const dy = Math.min(14, -14 + t * 0.4);
      Pix.rect(c, 38, Math.round(dy) + 6, 1, Math.max(0, 16 - Math.round(dy) - 6), '#7C7C88');
      gx4cTowDrone(c, 38, Math.round(dy), t);
      GxArt.ship(c, 92, 50 - ((t * 0.6) % 80), t);
    },
    bubble(t, outro) { return outro ? (t % 200 > 20 ? gxaSay(t % 400 < 200 ? 'HELLO? TOW, PLEASE.' : 'IT DRIVES ITSELF. MOSTLY.', 2, 2) : null) : t > 8 ? gxaSay(t % 240 < 120 ? "I'LL DRIVE IT MYSELF." : 'HOLD MY COFFEE.', 2, 2) : null; },
  },
  gx4cWin: {
    intro(c, t) {
      Pix.rect(c, 0, 0, INTRO_W, INTRO_H, '#008080');
      for (const [k, y] of [[0, 2], [1, 22]]) gx4cIcon(c, GX4C_ICONS[k][1], 1, y);
      const B = GxArt.boss('gx4cWin', (t >> 3) & 1, 1), x = 18 + Math.round(Math.sin(t / 50) * 2);
      c.drawImage(B, x, 2);
      gx4cBits(c, ['X.......', 'XX......', 'X1X.....', 'X11X....', 'X111X...', 'X1111X..', 'X11XXXX.', 'XX......'], x + 40, 6, { X: '#000000', 1: '#F8F8F8' });
      gx4cTiny(c, 'WINDOWS 95', x + 26, 7, '#F8F8F8', null); gx4cTiny(c, 'START', x + 22, 53, '#000000', null);
      GxArt.ship(c, 1, 45 + Math.round(Math.sin(t / 14) * 2), t);
    },
    outro(c, t) {
      Pix.rect(c, 0, 0, INTRO_W, INTRO_H, '#000000');
      // the old monitor: its blue screen
      Pix.rect(c, 6, 6, 52, 42, '#C8C0A8'); Pix.rect(c, 6, 6, 52, 1, '#F0E8D0'); Pix.rect(c, 57, 6, 1, 42, '#8C8470');
      Pix.rect(c, 10, 9, 44, 32, '#0000A8');
      Pix.rect(c, 22, 10, 20, 7, '#C0C0C0'); gx4cTiny(c, 'TANK', 32, 11, '#0000A8', null);
      ['FATAL', 'EXCEPTION', '0E AT', 'TANK:1995'].forEach((s, k) => gx4cTiny(c, s, 32, 18 + k * 6, '#F8F8F8', null));
      if ((t >> 4) & 1) Pix.rect(c, 48, 36, 3, 1, '#F8F8F8');
      Pix.rect(c, 26, 48, 12, 4, '#A8A090'); Pix.rect(c, 18, 52, 28, 3, '#C8C0A8');
      Pix.rect(c, 52, 44, 2, 1, (t >> 5) & 1 ? '#58F858' : '#185818');
      // and on the right: the words
      ['IT IS NOW', 'SAFE TO', 'TURN OFF', 'YOUR', 'COMPUTER.'].forEach((s, k) => gx4cTiny(c, s, 86, 6 + k * 7, t > k * 12 ? '#F8A030' : '#000000', null));
      GxArt.ship(c, 78 + Math.round(Math.sin(t / 30) * 10), 44 + Math.round(Math.sin(t / 14) * 2), t);
    },
    bubble(t, outro) { return outro ? (t > 30 && t % 220 > 20 ? gxaSay('IT IS NOW SAFE...', 2, 54) : null) : t > 8 ? gxaSay(t % 240 < 120 ? 'STARTING UP...' : 'PLEASE WAIT...', 2, 2) : null; },
  },
};
const GX4C_TALES = {
  gx4cElon: { intro: ['IT CANNOT DRIVE ITSELF YET', 'SO HE DRIVES IT HIMSELF'], outro: 'HELLO? IS THIS THE TOW TRUCK?' },
  gx4cWin: { intro: ['IT LOOKS LIKE YOU ARE FIGHTING', 'SHOOT THE OK BUTTONS'], outro: 'IT IS NOW SAFE TO TURN IT OFF' },
};

// ------------------------------------------------------------------ the blue screen, after WINDOWS 95 (the whole screen; the music stops; a key goes on)
const GX4C_BSOD_TEXT = ['A FATAL EXCEPTION 0E HAS', 'OCCURRED AT TANK:0001995 IN', 'BOSS WIN95(01) + 0000DEAD.', 'THE BOSS HAS BEEN TERMINATED.', '',
  '* PRESS ANY KEY TO COLLECT', '  YOUR LOOT.', '* PRESS CTRL+ALT+DEL TO DO', '  NOTHING AT ALL. YOU WILL', '  LOSE NO PROGRESS.', '', '  PRESS ANY KEY TO CONTINUE'];
const gx4cBsodOn = () => { const st = Game.stage, S = st && st.galaxy && st.galaxy.gx4c; return Game.state === 'play' && S && S.bsod && S.bsod.t >= 0 ? S.bsod : null; };
function gx4cDrawBsod(ctx, B) {
  const W = SCREEN_W, H = SCREEN_H, x0 = Math.max(4, Math.round((W - 30 * 8) / 2)), y0 = Math.max(6, Math.round((H - 15 * 11) / 2));
  ctx.fillStyle = '#0000A8'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#C0C0C0'; ctx.fillRect(Math.round(W / 2 - 40), y0, 80, 9); Font.drawCenter(ctx, 'TANK OS', W / 2, y0 + 1, '#0000A8');
  GX4C_BSOD_TEXT.forEach((s, k) => Font.draw(ctx, s, x0, y0 + 20 + k * 11, '#F8F8F8'));
  if ((B.t >> 4) & 1) Font.draw(ctx, '_', x0 + GX4C_BSOD_TEXT[GX4C_BSOD_TEXT.length - 1].length * 8 + 8, y0 + 20 + (GX4C_BSOD_TEXT.length - 1) * 11, '#F8F8F8');
}

// ------------------------------------------------------------------ FSD SUBSCRIPTION: an autopilot for the ELON fight, sold in the hangar before MARS HIGHWAY
// Each player buys their own ($99 in credits). In the fight with ELON ON THE CYBERCAB the ship flies and shoots by itself:
// it looks ahead at every shot and hazard (the honk's cone, the fire columns, the plaid lane, rockets' crosshairs, the
// careening cab), picks the safest spot near a firing line under the boss and goes there, and bombs if a hit can't
// be dodged. A direction pressed takes over; FSD comes back after a second of no input. It runs on the host.
const GX4C_FSD_ITEM = { id: 'gx4c_fsd', gxShop: 'fsd', name: 'FSD SUBSCRIPTION', desc: 'FULL SELF-DRIVING (SUPERVISED)', icon: 'gx4cFsd' };
GX_PICKUPS.gx4cFsd = {   // its icon (a steering wheel); never dropped
  draw(ctx, x, y, t, R) { ctx.fillStyle = '#100808'; ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#A8B0BC'; ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#100808'; ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill(); R(-5, -1, 11, 2, '#A8B0BC'); R(-1, 0, 2, 6, '#A8B0BC'); R(-1, -1, 2, 2, '#58F8F8'); },
  collect() {},
};
// is MARS HIGHWAY the next (or the current) stage's sector?
function gx4cFsdNext() {
  if (Game.mode !== 'galaxy') return false;
  const n = Game.stageNum, mars = GX_SECTORS.indexOf(GX4C_MARS), run = Game.gxRun || 'campaign';
  if (run === 'endless') return typeof gxdEndlessSec === 'function' && [gxdEndlessSec(2 * (n - 1)), gxdEndlessSec(2 * (n - 1) + 1)].includes(mars);
  return (n - 1) % GX_SECTORS.length === mars;
}
function gx4cFsdShopSync() {
  const i = GX_SHOP.indexOf(GX4C_FSD_ITEM);
  if (i >= 0) GX_SHOP.splice(i, 1);
  if (gx4cFsdNext()) { const d = GX_SHOP.findIndex(it => it && it.id === 'done'); GX_SHOP.splice(d < 0 ? GX_SHOP.length : d, 0, GX4C_FSD_ITEM); }
}
const GX4C_AI = {};
const GX4C_PREV = new WeakMap();
// the autopilot's input for player i this frame (null: not driving)
function gx4cAutopilot(i, raw) {
  if (Game.mode !== 'galaxy' || Game.state !== 'play') return null;
  const st = Game.stage, g = st && st.galaxy, b = g && g.boss;
  if (!b || b.key !== 'gx4cElon' || g.phase !== 'boss' || st.over) return null;
  const p = Game.players[i]; if (!p || !p.gx || !p.gx.fsd) return null;
  const A = GX4C_AI[i] || (GX4C_AI[i] = { human: -999, f: -1, out: null, bombCd: 0 });
  if (raw && raw.dir >= 0) { A.human = st.frame; A.on = false; return null; }
  if (st.frame - A.human < 60) { A.on = false; return null; }
  const t = st.tanks.find(q => q.isPlayer && q.alive && q.player === p);
  if (!t) return null;
  if (A.f !== st.frame) { A.f = st.frame; A.out = gx4cPlan(st, g, b, t, p, A); }
  A.on = true;
  return A.out;
}
function gx4cPlan(st, g, b, t, p, A) {
  const H = 34, step = 2, sp = 1.4 + 0.3 * gxUp(p, 'engine'), ymin = Math.round(FH * 0.35), ymax = FH - 16, f = st.frame;
  const vel = o => { const q = GX4C_PREV.get(o), r = q && f > q.f ? [(o.x - q.x) / (f - q.f), (o.y - q.y) / (f - q.f)] : [0, 0]; GX4C_PREV.set(o, { x: o.x, y: o.y, f }); return r; };
  // the threats: moving points (shots), moving boxes (things), zones (columns, circles, the honk's cone) with when they bite
  const pts = g.bullets.map(q => ({ x: q.x, y: q.y, vx: q.vx || 0, vy: q.vy || 0, ay: q.k === 'gx4cCard' ? 0.055 : 0, frz: q.k === 'gx4cSand' }));
  const boxes = [], zones = [];
  for (const e of g.list) {
    if (['gx4cWreck', 'gx4cSafe', 'gx4cPipe', 'gx4cField'].includes(e.type)) continue;
    const T = GX_TYPES[e.type], v = e.v || {};
    // when they bite: a rocket on its crosshair, a post bursting, a booster landing on its pad
    if (e.type === 'gx4cMiniR') { const fall = Math.max(0, (v.ty - Math.max(-14, e.y)) / 4.5); zones.push({ k: 'c', x: v.tx, y: v.ty, r: 20, from: (v.k === 0 ? (e.y + 24) / 3.2 + 48 : v.k === 1 ? 48 - (e.kT || 0) : 0) + fall - 8, to: 1e9 }); if (v.k !== 2) continue; }
    if (e.type === 'gx4cPost' && v.k === 1) zones.push({ k: 'c', x: e.x, y: e.y, r: 34, from: (e.life || 0) - e.t - 4, to: 1e9 });
    if (e.type === 'gx4cBoost' && v.k === 0) { zones.push({ k: 'c', x: v.tx, y: v.ty, r: 22, from: (e.warn || 72) - (e.kT || 0) + 10, to: 1e9 }); continue; }
    const [vx, vy] = vel(e);
    boxes.push({ x: e.x, y: e.y, vx, vy, hw: (e.w || T.w) / 2 + 6, hh: (e.h || T.h) / 2 + 7 });
  }
  // the cab itself (its own velocity while it careens), the plaid lane, the honk cone, the fire columns
  const [bvx, bvy] = b.fsd ? [b.fsd.vx || 0, b.fsd.vy || 0] : vel(b);
  boxes.push({ x: b.x, y: b.y + b.h / 2, vx: bvx, vy: bvy, hw: b.w / 2 + 8, hh: b.h / 2 + 8 });
  if (b.pd && b.pd.st <= 2) { const D = b.pd, run = Math.max(0, (t.y - b.y - b.h) / 6); zones.push({ k: 'col', x: D.st === 0 ? D.x : b.x, hw: b.w / 2 + 10, top: 0, from: (D.st === 0 ? 34 - D.t + 42 : D.st === 1 ? 42 - D.t : 0) + run - 10, to: 1e9 }); }
  if (b.honk) { const T0 = b.honk.warn - b.honk.t; zones.push({ k: 'cone', x: b.x, y: b.y + b.h - 4, a: b.honk.a, te: [T0, T0 + 9, T0 + 18], spd: 1.5 * g.shotSpd, from: 0, to: 1e9 }); }
  for (const bm of b.beams) if (bm.w) zones.push({ k: 'col', x: bm.x, hw: bm.w / 2 + 7, top: bm.top || 0, from: bm.warn - bm.t - 6, to: bm.warn + bm.dur - bm.t });
  const shielded = t.shield > H;
  // danger at a point at frame k (0 none; otherwise how bad)
  const LH = 110;   // how far ahead the slow, sure things are looked at (zones); shots and things only H frames
  const hit = (px, py, k) => {
    if (shielded) return false;
    if (k <= H) for (const q of pts) { const x = q.x + q.vx * k, y = q.y + q.vy * k + 0.5 * q.ay * k * k; if (Math.abs(x - px) < 6.5 && Math.abs(y - py) < 7.5) return true; }
    if (k <= H) for (const o of boxes) { const x = o.x + o.vx * k, y = o.y + o.vy * k; if (Math.abs(x - px) < o.hw && Math.abs(y - py) < o.hh) return true; }
    for (const z of zones) {
      if (k < z.from || k > z.to) continue;
      if (z.k === 'c' && Math.hypot(px - z.x, py - z.y) < z.r) return true;
      if (z.k === 'col' && Math.abs(px - z.x) < z.hw && py > z.top) return true;
      if (z.k === 'cone') {   // the honk's waves: arcs going out down the cone, one after another
        let d = Math.atan2(py - z.y, px - z.x) - z.a; d = Math.atan2(Math.sin(d), Math.cos(d));
        if (Math.abs(d) > 0.42) continue;
        const dist = Math.hypot(px - z.x, py - z.y);
        for (const te of z.te) if (k >= te && Math.abs(dist - z.spd * (k - te)) < 10) return true;
      }
    }
    return false;
  };
  const clear = (px, py, k) => { let m = 60; for (const q of pts) { const d = Math.hypot(q.x + q.vx * k - px, q.y + q.vy * k - py); if (d < m) m = d; } return m; };
  let best = null;
  for (let dx = -64; dx <= 64; dx += 8) for (let dy = -48; dy <= 48; dy += 8) {
    const tx = Math.max(0, Math.min(FW - 16, t.x + dx)), ty = Math.max(ymin, Math.min(ymax, t.y + dy));
    let x = t.x, y = t.y, kc = -1, nc = 0, cl = 60;
    for (let k = 1; k <= LH; k++) {
      // the way the ship moves there: the longer way first, one axis at a time
      let m = sp;
      while (m > 0) { const ex = tx - x, ey = ty - y; if (Math.abs(ex) < 0.5 && Math.abs(ey) < 0.5) break; const s2 = Math.min(m, Math.abs(ex) >= Math.abs(ey) ? Math.abs(ex) : Math.abs(ey)); if (Math.abs(ex) >= Math.abs(ey)) x += Math.sign(ex) * s2; else y += Math.sign(ey) * s2; m -= s2; }
      if (k % (k <= H ? step : 4)) continue;
      if (hit(x + 8, y + 9, k)) { if (kc < 0) kc = k; nc++; if (nc > 6) break; }
      if (k <= 16) cl = Math.min(cl, clear(x + 8, y + 9, k));
      if (k > H && !zones.length) break;
    }
    const cx = tx + 8;
    let cost = kc >= 0 ? 10000 + (LH - kc) * 100 + nc * 500 : 0;
    cost += Math.max(0, Math.abs(cx - b.x) - 14) * 1.1;   // under the boss, to hit it
    cost += Math.abs(ty + 9 - FH * 0.8) * 0.35;            // low down: more time to see things coming
    cost += Math.hypot(dx, dy) * 0.12 + (A.tx !== undefined ? Math.hypot(tx - A.tx, ty - A.ty) * 0.06 : 0);
    cost -= Math.min(30, cl) * 1.5;
    if (!best || cost < best.cost) best = { cost, tx, ty, kc };
  }
  A.tx = best.tx; A.ty = best.ty; A.kc = best.kc;
  // a hit that can't be dodged: a bomb (if there is one)
  if (A.bombCd > 0) A.bombCd--;
  if (best.kc >= 0 && best.kc <= 6 && !(t.shield > 0) && (p.gx.bombs || 0) > 0 && A.bombCd <= 0) { A.bomb = true; A.bombCd = 90; }
  const ex = best.tx - t.x, ey = best.ty - t.y;
  const dir = Math.abs(ex) >= Math.abs(ey) && Math.abs(ex) > 0.5 ? (ex > 0 ? 1 : 3) : Math.abs(ey) > 0.5 ? (ey > 0 ? 2 : 0) : -1;
  return { dir, fire: true, firePressed: (f & 15) === 0 };
}
{
  const ip0 = Input.player;
  Input.player = function (i) {
    const r = ip0.apply(this, arguments);
    const ai = gx4cAutopilot(i, r);
    return ai ? Object.assign({}, r, ai) : r;
  };
}
GX_FRAME.push(function (g) {   // the autopilot's bombs
  for (const p of this.players) {
    const A = GX4C_AI[p.i];
    if (!A || !A.bomb) continue;
    A.bomb = false;
    const t = this.tanks.find(q => q.isPlayer && q.alive && q.player === p), gp = gxPlayer(p);
    if (t && gp.bombs > 0) { this.gxBomb(t, p); gx4cSay(this, t.x + 8, t.y - 6, 'FSD: EVASIVE BOMB', '#58F8F8', 50); }
  }
});
// FSD ENGAGED, over the field
function gx4cFsdOver(ctx, st) {
  const g = st.galaxy, b = g.boss;
  if (!b || b.key !== 'gx4cElon' || g.phase !== 'boss') return;
  let line = 0;
  for (const p of st.players) {
    if (!p.gx || !p.gx.fsd) continue;
    const t = st.tanks.find(q => q.isPlayer && q.alive && q.player === p), A = GX4C_AI[p.i], on = !!t && (Net.role === 'client' || !!(A && A.on)), f = st.frame;
    const text = (st.players.length > 1 ? ROMAN[p.i] + ' ' : '') + (on ? 'FSD ENGAGED' : t ? 'FSD: YOU DRIVE' : 'FSD: STANDBY');
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(4, 18 + line * 11, text.length * 8 + 4, 10);
    Font.draw(ctx, text, 6, 19 + line * 11, on ? ((f >> 4) & 1 ? '#58F8F8' : '#F8F8F8') : '#F8D800');
    line++;
    if (on) gx4cTiny(ctx, 'FSD', t.x + 8, t.y - 7, '#58F8F8', '#100808');
  }
}

// ------------------------------------------------------------------ once every file is in: the boss screens, the hangar, the blue screen
function gx4cInstall() {
  if (gx4cInstall.done) return;
  gx4cInstall.done = true;
  if (typeof GX_BOSS_ART !== 'undefined') Object.assign(GX_BOSS_ART, GX4C_ART);
  if (typeof GX_BOSS_TALES !== 'undefined') Object.assign(GX_BOSS_TALES, GX4C_TALES);
  // the hangar: the FSD item (galaxy_tune.js and galaxy_feel.js replace these, so they're wrapped now)
  const price0 = gxShopPrice, status0 = gxShopStatus, apply0 = gxShopApply;
  gxShopPrice = function (item, p) { return item && item.gxShop === 'fsd' ? 99 : price0.apply(this, arguments); };
  gxShopStatus = function (item, p) { if (!item || item.gxShop !== 'fsd') return status0.apply(this, arguments); if (p.out) return { text: '', max: true }; return gxPlayer(p).fsd ? { text: 'ACTIVE', max: true } : { text: '' }; };
  gxShopApply = function (item, p) { if (item && item.gxShop === 'fsd') { gxPlayer(p).fsd = 1; return; } return apply0.apply(this, arguments); };
  const G = Game, toShop0 = G.toShop, renderShop0 = G.renderShop, updatePlay0 = G.updatePlay, musicFrame0 = G.musicFrame, render0 = G.render;
  G.toShop = function () { if (this.mode === 'galaxy') gx4cFsdShopSync(); return toShop0.apply(this, arguments); };
  // its price shows as $99
  G.renderShop = function (ctx) {
    const r = renderShop0.apply(this, arguments), sh = this.shop;
    if (this.mode !== 'galaxy' || !sh) return r;
    const i = GX_SHOP.indexOf(GX4C_FSD_ITEM), row = i - sh.scroll, p = sh.order[sh.turn];
    if (i < 0 || row < 0 || row >= SHOP_ROWS || !p) return r;
    const y = SHOP_TOP + row * SHOP_ROW_H, st = gxShopStatus(GX4C_FSD_ITEM, p);
    if (st.max) return r;
    ctx.fillStyle = i === sh.idx ? '#20206C' : COL.black; ctx.fillRect(164, y - 1, 27, 9);
    Font.drawRight(ctx, '$99', 190, y, wallet(p) >= 99 ? COL.gold : '#7C3C3C');
    return r;
  };
  // the blue screen: after the boss's last explosions, it holds the game; the music stops; a key (or a few seconds) goes on
  G.updatePlay = function () {
    const st = this.stage, S = st && st.galaxy && st.galaxy.gx4c;
    if (this.mode === 'galaxy' && S && S.bsod) {
      const B = S.bsod;
      B.t++;
      if (B.t === 0) Sound.play('gx4cBsod');
      if (B.t >= 0) {
        const m = Input.menu(), guest = Object.values(Input.remote || {}).some(q => q.menu && (q.menu.ok || q.menu.back));
        if ((B.t > 40 && (m.ok || m.back || m.fire || m.up || m.down || m.left || m.right || guest)) || B.t > 480) { S.bsod = null; Sound.play('select'); }
        return;
      }
    }
    return updatePlay0.apply(this, arguments);
  };
  G.musicFrame = function () { if (gx4cBsodOn()) { Music.want(null, 0, false); return; } return musicFrame0.apply(this, arguments); };
  G.render = function (ctx) { const r = render0.apply(this, arguments), B = gx4cBsodOn(); if (B) gx4cDrawBsod(ctx, B); return r; };
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', gx4cInstall); else setTimeout(gx4cInstall, 0);

// ------------------------------------------------------------------ their music (every melody new)
// MARS HIGHWAY: a driving synth-highway tune in A minor (Am G F E, round and round); the boss: a cocky, swaggering
// mixolydian strut. THE DESKTOP: a lo-fi General-MIDI-ish lounge tune, swung; the boss: frantic, glitchy, 15 steps a bar
SONGS.gx4cMars = { name: 'FREEWAY TO MARS', root: 57, bpm: 150, groove: 'gx4cHwy', prog: [0, 6, 5, 4, 0, 6, 5, 4], scale: [0, 2, 3, 5, 7, 8, 10],
  mel: '4---4-2-0---2-4-' + '3---3-1-z---1-3-' + '2---2-0-5---7-9-' + '8-------6---4---' + '7---7-9-B---9-7-' + '6---6-8-A---8-6-' + '5-7-9-7-5-7-9-B-' + '8---6---4---.-1-' };
SONGS.gx4cBossMars = { name: 'PLAID MODE', root: 52, bpm: 164, groove: 'gx4cSwag', prog: [0, 0, 6, 3, 0, 0, 5, 4], scale: [0, 2, 4, 5, 7, 9, 10],
  mel: '0-0-2-4-.-4-2-4-' + '7-6-4-2-4---.-0-' + '6-6-4-6-8-6-4-3-' + '3-4-6-7-A---7---' + '0-0-2-4-.-4-2-4-' + '7-6-4-2-4---.-7-' + '9-9-7-5-7-9-A-9-' + '8-7-6-4-B---.---' };
SONGS.gx4cDesk = { name: 'DESKTOP.MID', root: 60, bpm: 96, groove: 'gx4cMidi', prog: [0, 5, 1, 4, 0, 5, 1, 4], scale: [0, 2, 4, 5, 7, 9, 11], swing: 0.58,
  mel: '4---2-4-7---6-4-' + '5---4-2-0---.-2-' + '3---1-3-5---4-3-' + '4-------.-z-1-2-' + '7---9-7-4---2-4-' + '5---4-2-5---7-9-' + '8---7-5-3---1-3-' + '4---.-2-1---0---' };
SONGS.gx4cBossDesk = { name: 'FATAL EXCEPTION 0E', root: 57, bpm: 172, groove: 'gx4cCrash', steps: 15, prog: [0, 1, 0, 6], scale: [0, 1, 4, 5, 7, 8, 10],
  mel: '0.0.1.0.4-3-1-0' + '1.1.2.1.5-4-2-1' + '0.0.1.0.7-6-4-3' + '6-5-4-3-2-1-0-.' };
Object.assign(GROOVES, {
  gx4cHwy: { drums: 'k.hhs.hhk.hhs.hk', bass: 'rororororororoor' },
  gx4cSwag: { drums: 'k..hs.hkk.h.s.hh', bass: 'r.ro.rf.r.ro.f.o' },
  gx4cMidi: { drums: 'k...h.h.s..kh.h.', bass: 'r..r..f.o..o.f..' },
  gx4cCrash: { drums: 'kkhs.hk.sk.hssh', bass: 'rr.o.rr.f.rr.oo' },
});
Object.assign(ROCK_SONGS, {
  gx4cMars: { name: 'FREEWAY TO MARS (METAL)', root: 45, bpm: 160, scale: 'minor', form: 'IVIS', parts: {
    I: { lead: '@gx4cMars', riff: 'p.ppp.ppX---p.p.', dr: 'drive', harm: 2 },
    V: { from: 'gx4cMars', riff: 'p.ppp.ppp.ppX-x-', dr: 'gallop' },
    S: { from: 'gx4cMars', riff: 'pppppppppppppppp', dr: 'double', solo: true } } },
  gx4cBossMars: { name: 'PLAID MODE (METAL)', root: 40, bpm: 168, scale: 'mixo', form: 'IVIS', parts: {
    I: { lead: '@gx4cBossMars', riff: 'X--.x.X--.x.X-x-', dr: 'shuffle', harm: 2 },
    V: { from: 'gx4cBossMars', riff: 'P.pp.pP.pp.pX---', dr: 'drive' },
    S: { from: 'gx4cBossMars', riff: 'pppppppppppppppp', dr: 'double', solo: true } } },
  gx4cDesk: { name: 'DESKTOP.MID (ROCK)', root: 48, bpm: 104, scale: 'major', form: 'IVI', parts: {
    I: { lead: '@gx4cDesk', riff: 'X---x.x.X---x.x.', dr: 'shuffle' },
    V: { from: 'gx4cDesk', riff: 'x.x.x.x.x.x.x.x.', dr: 'rock' } } },
  gx4cBossDesk: { name: 'FATAL EXCEPTION 0E (METAL)', root: 40, bpm: 180, scale: 'phryg', steps: 15, form: 'IS', parts: {
    I: { lead: '@gx4cBossDesk', riff: 'P.pp.P.pp.X-x-.', dr: 'glitch15', harm: 2 },
    S: { from: 'gx4cBossDesk', riff: 'ppppppppppppppp', dr: 'glitch15', solo: true } } },
});
Object.assign(SYNTH_SONGS, {
  gx4cMars: { name: 'NEON FREEWAY TO MARS', root: 45, bpm: 124, scale: 'minor', sev: 1, form: 'IVLV', parts: {   // outrun: the arp, the four-on-the-floor
    I: { from: 'gx4cMars', arp: '0123', ao: 1, bs: 'r.o.', dr: 'kicks', f: [600, 2400], rise: 1 },
    V: { lead: '@gx4cMars', bs: 'ro', arp: '0123', dr: 'four', f: 2600 },
    L: { from: 'gx4cMars', bs: 'ro', arp: '0123', dr: 'four', solo: 1 } } },
  gx4cBossMars: { name: 'PLAID MODE 2049', root: 40, bpm: 128, scale: 'mixo', dirt: 1, pump: 0.3, f: 1400, form: 'IVBV', parts: {
    I: { from: 'gx4cBossMars', pad: 'S..S..S.S.......', bs: 'r', dr: 'halfd', f: 1100 },
    V: { lead: '@gx4cBossMars', bs: 'rrorrror', dr: 'push', harm: 2 },
    B: { from: 'gx4cBossMars', bell: '@gx4cBossMars', bs: 'R-------R---R-R-', dr: 'half', f: 900, rise: 1 } } },
  gx4cDesk: { name: 'DESKTOP.MID 1995', root: 48, bpm: 92, scale: 'major', sev: 1, sq: 1, att: 0.5, form: 'IVV', parts: {   // a slow, warm sunset
    I: { bell: '@gx4cDesk', bs: 'r-------', f: [600, 1600] },
    V: { lead: '@gx4cDesk', bs: 'r..r..f.', arp: '0.2.3.2.', dr: 'beat', f: 2000 } } },
  gx4cBossDesk: { name: 'BLUE SCREEN BLUES', root: 40, bpm: 132, scale: 'phryg', steps: 15, sev: 1, dirt: 1, form: 'IV', parts: {
    I: { bell: '@gx4cBossDesk', pad: 'S..S..S..S..S..', bs: 'r.o', dr: 'glitch15', f: 1400 },
    V: { lead: '@gx4cBossDesk', bs: 'ro', arp: '012', dr: 'glitch15', f: 2200 } } },
});
