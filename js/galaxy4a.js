'use strict';
// =====================================================================
//  GALAXY, two more sectors before THE LAST BASE (CATS stays the last), each with its own sky, enemies, waves, boss
//  and music (the way galaxy3.js added THE WELL and THE SLOP FEED).
//    RAINBOW RIFT  a candy-coloured nebula: pastel clouds, rainbow streams, candy planets, glitter falling
//       enemies sparkle sprites (the drones here), cotton-candy clouds that split in two puffs, glitter mines that
//               arm when you come near and burst, star-ponies that gallop in leaps (a rainbow behind them), dark stars
//       waves   COTTON CANDY (clouds raining sugar), PONY STAMPEDE (herds leaping over the top, then stampedes along
//               lanes through your zone: get off the lane), RAINBOW ROAD (striped bands sweep down and across the
//               screen: fly through their gaps), GLITTER STORM (mines blown about by the wind), WISHING STARS
//               (catch the gold ones, shoot the dark ones)
//       gimmick a wishing star drifts down now and then: catch it (every 4th one grants a wish)
//       boss    COSMIC UNICORN: gallops across the screen leaving a solid rainbow you can't cross (RAINBOW DASH),
//               sweeps its horn laser, HORN CHARGE (a sparkle line, then it charges along it), summons star-ponies,
//               stars; then sparkly hearts that hurt; in phase 3 NIGHTMARE: dark, faster, a mane of fire, rainbow
//               beams in a fan
//    DISCO MOON    the moon turned into a dance floor: tiles lit to the beat, spotlights sweeping, a glitter ball's glints
//       enemies dancing drones (the drones here), boogie bots that step to the beat, platform-shoe stompers, conga
//               dancers, the soul train's cars, spotlight rigs, speaker stacks
//       waves   CONGA LINE (lines of dancers looping), DANCE FLOOR (tiles light in patterns and zap on the 4th beat:
//               stand on the dark ones), SPOTLIGHTS (they chase you and zap on the beat), SOUL TRAIN (a train that
//               winds down row by row; shoot a car out and it splits in two), BASS DROP (speakers count in, then a
//               shockwave ring with gaps in it)
//       gimmick everything here moves to the music's beat (the boss song's tempo for the boss); a kill on the beat
//               scores double (ON BEAT!)
//       boss    THE MIRRORBALL: swings on its chain to the beat; rotating mirror lasers, bouncing glitter, BASS DROP
//               rings, DANCE OFF (the floor lights: stand on the dark tiles), spotlights, rings of notes; in phase 3
//               it splits: small mirrorballs bounce about firing on the beat
//  The boss pictures (WARNING / VICTORY) go into GX_BOSS_ART and GX_BOSS_TALES once gxbossart.js has loaded.
// =====================================================================

// ------------------------------------------------------------------ two more sectors, before THE LAST BASE
const GX4A_NONE = ['#000000', '#000000', '#000000'];
const GX4A_RAINBOW = { name: 'RAINBOW RIFT', sky: '#120826', dust: '#7C5CA8', planet: GX4A_NONE, noPlanet: true, bg: (c, f, g) => gx4aBgRainbow(c, f, g),
  swap: { drone: 'gx4aSparkle' }, song: 'gx4aRainbow', bossSong: 'gx4aBossRainbow' };
const GX4A_DISCO = { name: 'DISCO MOON', sky: '#07040C', dust: '#4C3C64', planet: GX4A_NONE, noPlanet: true, bg: (c, f, g) => gx4aBgDisco(c, f, g),
  swap: { drone: 'gx4aDancer' }, song: 'gx4aDisco', bossSong: 'gx4aBossDisco' };
{
  const at = GX_SECTORS.findIndex(s => s.name === 'THE LAST BASE');
  const i = at < 0 ? GX_SECTORS.length : at;
  GX_SECTORS.splice(i, 0, GX4A_RAINBOW, GX4A_DISCO);
  GX_PLAN.splice(i, 0,
    ['gx4aCandy', 'gx4aStampede', 'gx4aRoad', 'gx4aStorm', 'gx4aWishes', 'formation'],
    ['gx4aConga', 'gx4aFloor', 'gx4aSpots', 'gx4aSoul', 'gx4aDrop', 'formation'],
  );
}
Object.assign(GX_WAVE_NAMES, { gx4aCandy: 'COTTON CANDY', gx4aStampede: 'PONY STAMPEDE', gx4aRoad: 'RAINBOW ROAD', gx4aStorm: 'GLITTER STORM',
  gx4aWishes: 'WISHING STARS', gx4aConga: 'CONGA LINE', gx4aFloor: 'DANCE FLOOR', gx4aSpots: 'SPOTLIGHTS', gx4aSoul: 'SOUL TRAIN', gx4aDrop: 'BASS DROP' });
GX_ALL_WAVES.push('gx4aCandy', 'gx4aStampede', 'gx4aRoad', 'gx4aStorm', 'gx4aWishes', 'gx4aConga', 'gx4aFloor', 'gx4aSpots', 'gx4aSoul', 'gx4aDrop');
const gx4aIs = (g, s) => !!g && GX_SECTORS[g.sec] === s;
const gx4aPick = a => a[rnd(a.length)];
const gx4aClamp = (v, a, b) => Math.max(a, Math.min(b, v));
// room for one more of their shots (the same cap the core keeps)
const gx4aRoom = g => g.bullets.length < (14 + 2 * (g.d ?? g.sec) + 6 * g.loop) * (g.capMul || 1);
const GX4A_RAINBOW_COLS = ['#F83850', '#F8A030', '#F8E840', '#58D868', '#48A8F8', '#A060F0'];
const GX4A_DISCO_COLS = ['#F858C0', '#58E8F8', '#F8E058', '#A878F8', '#58F888', '#F89848'];

// ------------------------------------------------------------------ the beat
// DISCO MOON moves to its music. The clock follows the song that's playing (its tempo and where it is, from the audio
// clock) and counts on by itself at the song's tempo when there's no music (music off, the audio not started yet).
// g.gx4aB: n beats so far, k how far into this one (0-1), hit true on the frame a beat lands, fpb frames a beat.
function gx4aSongKey(g) { const s = GX_SECTORS[g.sec] || {}; return (g.boss ? s.bossSong : s.song) || 'gx4aDisco'; }
const gx4aTrackIs = (tr, key) => !!tr && String(tr.key || '').split('/')[0].replace('+', '') === key;
function gx4aMusicBeats(key) {
  const tr = Music.track, c = Sound.ctx;
  if (!tr || !Music.timer || Music.paused || Sound.muted || !c || c.state !== 'running' || !tr.stepDur || !gx4aTrackIs(tr, key)) return null;
  return (Music.step - (Music.nextT - c.currentTime) / tr.stepDur) / 4;
}
function gx4aFpb(key) {
  const tr = Music.track;
  if (tr && tr.stepDur && gx4aTrackIs(tr, key)) return Math.max(12, tr.stepDur * 4 * 60);
  return 3600 / ((SONGS[key] && SONGS[key].bpm) || 120);
}
function gx4aBeatTick(g) {
  const B = g.gx4aB || (g.gx4aB = { n: 0, k: 0, acc: 0, src: -1, mus: false, hit: false, last: null, still: 0, fpb: 30 });
  const key = gx4aSongKey(g);
  B.hit = false;
  B.fpb = gx4aFpb(key);
  B.acc += 1 / B.fpb;
  let m = gx4aMusicBeats(key);
  if (m !== null) { B.still = B.last !== null && Math.abs(m - B.last) < 1e-6 ? B.still + 1 : 0; B.last = m; if (B.still > 6) m = null; }
  const mus = m !== null, pos = mus ? m : B.acc, src = Math.floor(pos);
  if (mus !== B.mus || B.src < 0) { B.mus = mus; B.src = src; }   // a new clock: carry on from it, no beat skipped or doubled
  else if (src > B.src) { B.n++; B.hit = true; B.src = src; }
  B.k = Math.max(0, Math.min(0.999, pos - src));
  return B;
}
// the beat as seen by a drawing (an online guest has no clock of its own: it counts the frames at 120 a minute)
const gx4aBeatPos = (g, f) => (g && g.gx4aB ? g.gx4aB.n + g.gx4aB.k : f / 30);

// ------------------------------------------------------------------ the new enemies
Object.assign(GX_TYPES, {
  gx4aSparkle: { w: 12, h: 12, hp: 1, pts: 60, from: 13, special: true },
  gx4aCloud: { w: 22, h: 14, hp: 4, pts: 200, from: 13, special: true, noFire: true },
  gx4aPuff: { w: 12, h: 9, hp: 1.5, pts: 80, from: 13, special: true },
  gx4aMine: { w: 12, h: 12, hp: 2, pts: 120, from: 13, special: true, noFire: true },
  gx4aPony: { w: 16, h: 12, hp: 3, pts: 220, from: 13, special: true, noFire: true },
  gx4aDark: { w: 12, h: 12, hp: 2, pts: 150, from: 13, special: true, noFire: true },
  gx4aBand: { w: 1, h: 1, hp: 1e9, pts: 0, from: 99, special: true, noFire: true },
  gx4aWishC: { w: 1, h: 1, hp: 1e9, pts: 0, from: 99, special: true, noFire: true },
  gx4aDancer: { w: 12, h: 12, hp: 1, pts: 60, from: 14, special: true },
  gx4aBoogie: { w: 14, h: 14, hp: 3, pts: 220, from: 14, special: true, noFire: true },
  gx4aShoe: { w: 16, h: 18, hp: 6, pts: 300, from: 14, special: true, noFire: true },
  gx4aConga: { w: 10, h: 12, hp: 1.5, pts: 100, from: 14, special: true, noFire: true },
  gx4aCar: { w: 14, h: 12, hp: 2, pts: 120, from: 14, special: true, noFire: true },
  gx4aRig: { w: 16, h: 10, hp: 6, pts: 300, from: 14, special: true, noFire: true },
  gx4aSpeaker: { w: 18, h: 20, hp: 9, pts: 400, from: 14, special: true, noFire: true },
  gx4aFloorC: { w: 1, h: 1, hp: 1e9, pts: 0, from: 99, special: true, noFire: true },
  gx4aRing: { w: 1, h: 1, hp: 1e9, pts: 0, from: 99, special: true, noFire: true },
  gx4aMini: { w: 14, h: 14, hp: 14, pts: 600, from: 99, special: true, noFire: true },
  gx4aChBall: { w: 10, h: 10, hp: 1, pts: 100, from: 99, special: true, chal: true },
});
Object.assign(GX_PALS, {
  gx4aSparkle: [null, '#FFF8C8', '#F8D848', '#C88820', '#FFFFFF', '#F870B8', '#58D8F8', '#201008'],
  gx4aCloud: [null, '#F8D0F0', '#F0A0D8', '#C068B0', '#FFF4FC', '#F870A8', '#A8D8F8', '#280818'],
  gx4aPuff: [null, '#F8D0F0', '#F0A0D8', '#C068B0', '#FFF4FC', '#F870A8', '#A8D8F8', '#280818'],
  gx4aMine: [null, '#E8E0F8', '#A890D0', '#584878', '#FFFFFF', '#F870C8', '#70E8F8', '#140C20'],
  gx4aPony: [null, '#F4F8FF', '#C8D8F8', '#7890C8', '#FFFFFF', '#F8D040', '#F8A0D0', '#100C24'],
  gx4aDark: [null, '#8C68C8', '#5C3890', '#2C1650', '#D0B0F8', '#F83850', '#F8D800', '#0C0418'],
  gx4aDancer: [null, '#F0E8F8', '#B098E0', '#604C98', '#FFFFFF', '#F858C0', '#58E8F8', '#140C20'],
  gx4aBoogie: [null, '#E0E0F0', '#A0A0C0', '#585878', '#FFFFFF', '#F848B0', '#58E8F8', '#100C18', '#F8A030'],
  gx4aShoe: [null, '#F8B0E8', '#E060C8', '#902888', '#FFFFFF', '#F8D850', '#58C8F8', '#180818', '#C09020'],
  gx4aConga: [null, '#F8E0B0', '#E0A050', '#985C20', '#FFFFFF', '#58D868', '#F85878', '#180C08'],
  gx4aCar: [null, '#F8C8F0', '#D868C0', '#7C2878', '#FFFFFF', '#F8D848', '#58E8F8', '#140818'],
  gx4aRig: [null, '#D0D0E0', '#9090A8', '#4C4C60', '#FFFFFF', '#F8E060', '#F8F8C0', '#100C14'],
  gx4aSpeaker: [null, '#7C7088', '#4C4458', '#2A2434', '#FFFFFF', '#F858C0', '#58E8F8', '#0C0810', '#BCB0C8'],
  gx4aMini: [null, '#F8F8F8', '#C8D0E0', '#8890A8', '#FFFFFF', '#F878C8', '#58E8F8', '#100818'],
  gx4aChBall: [null, '#F8F8F8', '#C8D0E0', '#8890A8', '#FFFFFF', '#F878C8', '#58E8F8', '#100818'],
});

// a filled star (n points) in colour c
function gx4aStarShape(P, cx, cy, R, r, rot, c, n = 5) {
  const pts = [];
  for (let i = 0; i < n * 2; i++) { const a = rot + i * Math.PI / n, d = i % 2 ? r : R; pts.push([cx + Math.cos(a) * d, cy + Math.sin(a) * d]); }
  const h = P.g.length, w = P.g[0].length;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let inside = false;
    const px = x + 0.5, py = y + 0.5;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i], [xj, yj] = pts[j];
      if ((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi) + xi) inside = !inside;
    }
    if (inside) P.px(x, y, c);
  }
}
// a little mirrorball: facets in a checker, lit from the top left, a glint (s: its size)
function gx4aBallSmall(P, cx, cy, r, f) {
  for (let y = 0; y < P.g.length; y++) for (let x = 0; x < P.g[0].length; x++) {
    const dx = x + 0.5 - cx, dy = y + 0.5 - cy, d = Math.hypot(dx, dy);
    if (d > r) continue;
    const l = (-dx * 0.55 - dy * 0.65) / r + Math.sqrt(Math.max(0, 1 - (d / r) ** 2)) * 0.6, chk = ((x + f) >> 1) + (y >> 1);
    P.px(x, y, l > 0.85 ? 4 : chk & 1 ? (l > 0.3 ? 1 : 3) : (l > 0.1 ? 2 : 3));
    if (chk % 5 === 0 && l > 0.2) P.px(x, y, (x + y + f) % 2 ? 5 : 6);
  }
}

Object.assign(GX_DRAW, {
  // a four-pointed star with a little face, twinkling
  gx4aSparkle(f) {
    const P = bossPainter(12, 12), L = f ? 0 : 1;
    P.rect(5, L, 6, 11 - L, 2); P.rect(L, 5, 11 - L, 6, 2);
    P.rect(4, 3, 7, 8, 2); P.rect(3, 4, 8, 7, 2); P.rect(4, 4, 7, 6, 1); P.px(5, 3, 1);
    if (f) for (const [x, y] of [[2, 2], [9, 2], [2, 9], [9, 9]]) P.px(x, y, 4);
    P.px(4, 5, 7); P.px(7, 5, 7); P.px(4, 4, 4);
    P.px(3, 6, 5); P.px(8, 6, 5); P.px(5, 7, 3); P.px(6, 7, 3);
    P.outline(); return P.g;
  },
  // a cotton-candy cloud with a sleepy face, a blue swirl in its pink
  gx4aCloud(f) {
    const P = bossPainter(22, 14);
    for (const [x, y, r] of [[6, 8, 5], [11, 6, 6], [16, 8, 5], [9, 10, 4], [14, 10, 4]]) gxBall(P, x, y, r, r * 0.85, [4, 1, 2, 3, 3]);
    gxBall(P, 16, 5, 3, 2.6, [4, 6, 6, 3, 3]); gxBall(P, 5, 6, 2, 1.8, [4, 6, 6, 3, 3]);
    if (f) { P.px(8, 7, 7); P.px(13, 7, 7); } else { P.rect(8, 7, 8, 8, 7); P.rect(13, 7, 13, 8, 7); P.px(8, 7, 4); P.px(13, 7, 4); }
    P.px(10, 9, 7); P.px(11, 10, 7); P.px(12, 9, 7); P.px(7, 9, 5); P.px(14, 9, 5);
    P.outline(); return P.g;
  },
  gx4aPuff(f) {
    const P = bossPainter(12, 9);
    for (const [x, y, r] of [[4, 5, 3.5], [7.5, 4, 3.8], [8, 6, 3]]) gxBall(P, x, y, r, r * 0.85, [4, 1, 2, 3, 3]);
    gxBall(P, 8, 3, 1.8, 1.5, [4, 6, 6, 3, 3]);
    P.px(5, 5, 7); P.px(8, 5, 7); if (f) P.px(6, 7, 7);
    P.outline(); return P.g;
  },
  // a glitter mine: a faceted ball with sparkling spikes
  gx4aMine(f) {
    const P = bossPainter(12, 12);
    gx4aBallSmall(P, 6, 6, 4.2, f);
    for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4 + (f ? 0.2 : 0); P.px(6 + Math.cos(a) * 5.4, 6 + Math.sin(a) * 5.4, k % 2 ? 5 : 6); }
    P.outline(); return P.g;
  },
  // a star-pony, galloping (facing right): a white body, a golden mane and tail, a star on its flank
  gx4aPony(f) {
    const P = bossPainter(16, 12);
    P.line(1, 4, 3, 5, 5); P.line(0, 6 + f, 3, 6, 5); P.px(1, 5, 6);
    const legs = f ? [[4, 8, 2, 11], [6, 8, 5, 11], [9, 8, 11, 11], [11, 8, 13, 10]] : [[4, 8, 5, 11], [5, 8, 3, 11], [9, 8, 9, 11], [11, 8, 12, 11]];
    for (const [x0, y0, x1, y1] of legs) { P.line(x0, y0, x1, y1, 2); P.px(x1, y1, 5); }
    gxBall(P, 7.5, 6, 4.8, 2.9, [4, 1, 2, 3, 3]);
    P.line(10, 5, 12, 2, 1); P.line(11, 5, 13, 2, 2); gxBall(P, 13, 2.5, 2.2, 1.8, [4, 1, 2, 3, 3]); P.px(15, 3, 1); P.px(15, 2, 1);
    P.px(12, 0, 2); P.px(10, 3, 5); P.px(11, 2, 5); P.px(11, 1, 5); P.px(9, 4, 5);
    P.px(13, 2, 7); P.px(14, 4, 6);
    P.px(7, 5, 5); P.px(6, 6, 5); P.px(7, 6, 4); P.px(8, 6, 5); P.px(7, 7, 5);
    P.outline(); return P.g;
  },
  // a dark star: five points, glaring red eyes
  gx4aDark(f) {
    const P = bossPainter(12, 12);
    gx4aStarShape(P, 6, 6.4, 6, 2.6, -Math.PI / 2 + (f ? 0.12 : 0), 2);
    gx4aStarShape(P, 5.6, 6, 4, 1.8, -Math.PI / 2 + (f ? 0.12 : 0), 1);
    P.px(4, 6, 5); P.px(7, 6, 5); P.px(4, 5, 7); P.px(7, 5, 7); P.px(5, 8, 7); P.px(6, 8, 7);
    P.outline(); return P.g;
  },
  // a dancing drone: a round robot in bell-bottoms, pointing up one side and then the other
  gx4aDancer(f) {
    const P = bossPainter(12, 12);
    if (f) { P.line(2, 5, 0, 1, 2); P.line(9, 5, 11, 8, 2); } else { P.line(2, 5, 0, 8, 2); P.line(9, 5, 11, 1, 2); }
    P.line(4, 8, 3, 11, 2); P.line(7, 8, 8, 11, 2); P.rect(2, 11, 4, 11, 3); P.rect(7, 11, 9, 11, 3);
    gxBall(P, 5.5, 5, 4.2, 4, [4, 1, 2, 3, 3]);
    P.rect(3, 4, 8, 5, 6); P.px(4, 4, 4); P.rect(5, 7, 6, 7, f ? 5 : 4);
    P.outline(); return P.g;
  },
  // a boogie bot: chrome, a rainbow afro, shades; f: its pose (four of them, one a beat)
  gx4aBoogie(f) {
    const P = bossPainter(14, 14), p = f & 3;
    const arms = [[[3, 8, 0, 3], [10, 8, 13, 3]], [[3, 8, 1, 11], [10, 8, 13, 2]], [[3, 8, 0, 8], [10, 8, 13, 8]], [[3, 8, 0, 2], [10, 8, 12, 11]]][p];
    const legs = [[[6, 11, 4, 13], [8, 11, 10, 13]], [[6, 11, 5, 13], [8, 11, 11, 12]], [[6, 11, 6, 13], [8, 11, 8, 13]], [[6, 11, 3, 12], [8, 11, 9, 13]]][p];
    for (const [x0, y0, x1, y1] of arms.concat(legs)) { P.line(x0, y0, x1, y1, 2); P.px(x1, y1, 4); }
    P.rect(4, 8, 9, 11, 2); P.rect(4, 8, 9, 8, 1); P.rect(6, 9, 7, 10, 5);
    gxBall(P, 7, 4, 6, 4, [8, 5, 5, 3, 3]);
    for (let y = 0; y < 8; y++) for (let x = 0; x < 14; x++) if (P.g[y][x] === 5 && (x * 3 + y * 5) % 4 === 0) P.g[y][x] = 8;
    P.rect(4, 4, 9, 7, 1); P.rect(4, 5, 9, 5, 6); P.px(5, 5, 4); P.px(8, 5, 4); P.rect(6, 7, 7, 7, 3);
    P.outline(); return P.g;
  },
  // a giant platform shoe (a flared trouser leg in it), glittering
  gx4aShoe(f) {
    const P = bossPainter(16, 18);
    for (let y = 0; y <= 4; y++) { const w = 2 + Math.round(y * 0.7); P.rect(5 - w, y, 6 + w, y, y < 1 ? 1 : 6); }   // the trouser's flare
    P.px(5, 1, 1); P.px(5, 3, 1);
    P.rect(3, 5, 8, 9, 2); P.rect(3, 5, 3, 9, 1); P.rect(8, 5, 8, 8, 3);   // the boot
    P.rect(3, 9, 13, 12, 2); P.rect(14, 10, 14, 12, 2); P.rect(9, 9, 13, 9, 1); P.px(14, 10, 1); P.rect(3, 12, 14, 12, 3);   // its foot, a round toe
    gx4aStarShape(P, 5.5, 8.4, 2.4, 1.1, -Math.PI / 2, 5);
    P.rect(2, 13, 15, 15, 5); P.rect(2, 13, 15, 13, 4); P.rect(2, 15, 15, 15, 8);   // the platform
    P.rect(2, 16, 6, 17, 5); P.rect(2, 17, 6, 17, 8); P.rect(10, 16, 15, 16, 8);   // the heel, the front
    for (const [x, y] of [[4, 7], [11, 10], [7, 11], [9, 14], [4, 16]]) if ((x + y + f) % 2) P.px(x, y, 4);
    P.outline(); return P.g;
  },
  // a conga dancer: a frilly shirt, hands on the one in front, hips this way and that
  gx4aConga(f) {
    const P = bossPainter(10, 12);
    P.line(4, 9, 3 - f, 11, 3); P.line(6, 9, 7 - f, 11, 3);
    P.rect(3, 6, 6, 9, 5); P.px(2, 6, 6); P.px(7, 6, 6); P.px(2, 8, 6); P.px(7, 8, 6); P.px(4 + f, 7, 4);
    P.line(6, 6, 9, 5, 2); P.line(3, 6, 0, 5 + f, 2);
    gxBall(P, 5, 3, 2.7, 2.6, [4, 1, 2, 3, 3]);
    P.px(4, 3, 7); P.px(6, 3, 7); P.rect(3, 0, 6, 0, 3);
    P.outline(); return P.g;
  },
  // the soul train: a carriage with lit windows and a dancer on top (f 0-1); the engine (f 2-3) with a mirrorball lamp
  gx4aCar(f) {
    const P = bossPainter(14, 12), head = f >= 2, w = f & 1;
    if (head) {
      P.rect(0, 4, 10, 9, 2); P.rect(10, 5, 12, 9, 2); P.rect(0, 4, 12, 4, 1); P.px(11, 4, 1); P.px(12, 5, 1);
      P.rect(2, 1, 3, 3, 3); P.px(2, 0, w ? 4 : 1);
      P.rect(5, 2, 8, 4, 3); P.rect(6, 3, 7, 3, 6);
      P.disc(12.5, 7, 1.6, 4); P.px(12, 7, w ? 5 : 6);
      P.rect(1, 6, 9, 6, 5);
    } else {
      P.rect(0, 4, 13, 9, 2); P.rect(0, 4, 13, 4, 1);
      for (const x of [2, 6, 10]) P.rect(x, 5, x + 1, 6, (x + w * 4) % 8 < 4 ? 6 : 5);
      P.rect(0, 8, 13, 8, 3);
      P.px(6, 3, 4); P.rect(6, 1, 7, 2, 5); P.px(5 + w * 3, 0, 5);
    }
    for (const x of [2, 10]) { P.rect(x - 1, 10, x + 1, 11, 3); P.px(x + (w ? 1 : -1), 10, 4); }
    P.outline(); return P.g;
  },
  // a spotlight on its truss, pointing down
  gx4aRig(f) {
    const P = bossPainter(16, 10);
    P.rect(0, 0, 15, 1, 3); for (let x = 0; x < 16; x += 3) P.px(x, 0, 2);
    P.rect(7, 2, 8, 2, 2);
    P.rect(4, 3, 11, 7, 2); P.rect(4, 3, 11, 3, 1); P.rect(4, 3, 4, 7, 1); P.rect(11, 4, 11, 7, 3);
    P.rect(5, 8, 10, 9, f ? 6 : 5); P.px(6, 8, 4);
    P.outline(); return P.g;
  },
  // a speaker stack: two woofers; f: pumping
  gx4aSpeaker(f) {
    const P = bossPainter(18, 20);
    P.rect(1, 0, 16, 19, 2); P.rect(1, 0, 16, 0, 1); P.rect(1, 0, 1, 19, 1); P.rect(16, 1, 16, 19, 3); P.rect(1, 19, 16, 19, 3);
    for (const [cx, cy, r] of [[8.5, 5, 3.4], [8.5, 13, 5.2]]) {
      P.disc(cx, cy, r + 0.4, 7); P.disc(cx, cy, r - 0.5, 8); P.disc(cx, cy, r - 1.3 + (f ? 0.6 : 0), 3); P.disc(cx, cy, 1.4 + f * 0.5, f ? 4 : 1);
      P.px(cx - r * 0.5, cy - r * 0.5, 4);
    }
    P.px(3, 2, f ? 5 : 6); P.px(14, 2, f ? 6 : 5);
    P.outline(); return P.g;
  },
  gx4aMini(f) {
    const P = bossPainter(14, 14);
    P.rect(6, 0, 7, 1, 2);
    gx4aBallSmall(P, 7, 7.5, 5.8, f);
    P.outline(); return P.g;
  },
  gx4aChBall(f) {
    const P = bossPainter(10, 10);
    gx4aBallSmall(P, 5, 5, 3.8, f);
    P.px(1, 5 - f, 6); P.px(8, 5 - f, 5);
    P.outline(); return P.g;
  },
});

// ------------------------------------------------------------------ helpers: hazards shared by the waves and the bosses
// distance from (px, py) to the segment (x0, y0)-(x1, y1)
function gx4aSegDist(px, py, x0, y0, x1, y1) {
  const dx = x1 - x0, dy = y1 - y0, L = dx * dx + dy * dy, k = L ? Math.max(0, Math.min(1, ((px - x0) * dx + (py - y0) * dy) / L)) : 0;
  return Math.hypot(px - x0 - dx * k, py - y0 - dy * k);
}
// a ray from (ox, oy) at angle a: does it pass within w of (px, py), further out than d0?
function gx4aRayHit(px, py, ox, oy, a, w, d0 = 0) {
  const dx = px - ox, dy = py - oy, c = Math.cos(a), s = Math.sin(a), along = dx * c + dy * s;
  return along > d0 && Math.abs(-dx * s + dy * c) < w;
}
const gx4aAngDiff = (a, b) => { let d = (a - b) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return Math.abs(d); };

// THE DANCE FLOOR: tiles over your zone (6 by 4); a pattern lights them: three beats getting brighter, the fourth a zap
function gx4aTiles() { const y0 = Math.floor(FH * 0.35) + 2, C = 6, R = 4; return { y0, C, R, tw: FW / C, th: (FH - y0) / R }; }
function gx4aLit(p, c, r, C, R, seed) {
  switch (p) {
    case 0: return (c + r) % 2 === 0;
    case 1: return (c + r) % 2 === 1;
    case 2: return c % 2 === 0;
    case 3: return c % 2 === 1;
    case 4: return r % 2 === 0;
    case 5: return c === 0 || c === C - 1 || r === 0 || r === R - 1;
    case 6: return !(c === 0 || c === C - 1 || r === 0 || r === R - 1);
    case 7: return c < C / 2;
    case 8: return c >= C / 2;
    case 9: return (c + r * 2) % 3 !== 0;
    default: return ((c * 7 + r * 13 + seed * 5) % 5) < 3;
  }
}
const gx4aNextPat = p => { let q; do q = rnd(11); while (q === p); return q; };
// a beat on the floor F ({p, s, z, n, seed}): s 0-2 lit, 3 the zap
function gx4aFloorBeat(F) {
  F.s++;
  if (F.s > 3) { F.s = 0; F.n++; F.p = gx4aNextPat(F.p); F.seed = rnd(99); }
  if (F.s === 3) { F.z = 10; Sound.play('gx4aZap'); }
  else if (F.s === 0) Sound.play('gx4aTick');
}
function gx4aFloorZap(st, F) {
  if (!(F.z > 0)) return;
  F.z--;
  const T = gx4aTiles();
  for (const t of st.gxPlayers()) {
    const px = t.x + 8, py = t.y + 9, c = Math.floor(px / T.tw), r = Math.floor((py - T.y0) / T.th);
    if (c < 0 || c >= T.C || r < 0 || r >= T.R || !gx4aLit(F.p, c, r, T.C, T.R, F.seed)) continue;
    const ix = px - c * T.tw, iy = py - T.y0 - r * T.th;
    if (ix > 3 && ix < T.tw - 3 && iy > 3 && iy < T.th - 3) st.hitPlayer(t);
  }
}
function gx4aFloorDraw(ctx, F, f) {
  if (!F || F.s < 0) return;
  const T = gx4aTiles(), zap = F.z > 0;
  for (let r = 0; r < T.R; r++) for (let c = 0; c < T.C; c++) {
    const x = Math.round(c * T.tw), y = Math.round(T.y0 + r * T.th), w = Math.round((c + 1) * T.tw) - x, h = Math.round(T.y0 + (r + 1) * T.th) - y;
    const lit = gx4aLit(F.p, c, r, T.C, T.R, F.seed), col = GX4A_DISCO_COLS[(c * 2 + r * 3 + F.n) % GX4A_DISCO_COLS.length];
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(x + 1, y + 1, w - 2, 1); ctx.fillRect(x + 1, y + h - 2, w - 2, 1);
    if (!lit) { ctx.fillStyle = 'rgba(40,24,64,0.35)'; ctx.fillRect(x + 2, y + 2, w - 4, h - 4); continue; }
    if (zap) {
      ctx.fillStyle = (f >> 1) & 1 ? '#F8F8F8' : col; ctx.globalAlpha = 0.75; ctx.fillRect(x + 1, y + 1, w - 2, h - 2); ctx.globalAlpha = 1;
      ctx.fillStyle = '#F83800'; for (let k = 0; k < 4; k++) ctx.fillRect(x + 3 + ((k * 7 + f * 3) % (w - 6)), y + 3 + ((k * 11 + f * 5) % (h - 6)), 2, 2);
      continue;
    }
    if (F.s === 3) { ctx.globalAlpha = 0.12; ctx.fillStyle = col; ctx.fillRect(x + 2, y + 2, w - 4, h - 4); ctx.globalAlpha = 1; continue; }
    ctx.globalAlpha = [0.16, 0.3, 0.46][F.s] * (F.s === 2 && (f >> 2) & 1 ? 1.4 : 1);
    ctx.fillStyle = col; ctx.fillRect(x + 2, y + 2, w - 4, h - 4);
    ctx.globalAlpha = 1;
    ctx.fillStyle = F.s === 2 ? '#F83800' : col; ctx.fillRect(x + 2, y + 2, w - 4, 1); ctx.fillRect(x + 2, y + h - 3, w - 4, 1); ctx.fillRect(x + 2, y + 2, 1, h - 4); ctx.fillRect(x + w - 3, y + 2, 1, h - 4);
    if (F.s === 2) Font.drawCenter(ctx, '!', x + w / 2, y + h / 2 - 3, '#F8F8F8');
  }
}

// a shockwave ring (BASS DROP): {x, y, r, gp: the gaps' angles, gw: their width, sp}
function gx4aRingStep(st, R) {
  R.r += R.sp;
  if (R.r < 14) return;
  for (const t of st.gxPlayers()) {
    const dx = t.x + 8 - R.x, dy = t.y + 9 - R.y;
    if (Math.abs(Math.hypot(dx, dy) - R.r) > 4) continue;
    const a = Math.atan2(dy, dx);
    if (!R.gp.some(g => gx4aAngDiff(a, g) < R.gw / 2 - 0.04)) st.hitPlayer(t);
  }
}
function gx4aRingDraw(ctx, R, f) {
  const gaps = R.gp.map(g => [g - R.gw / 2, g + R.gw / 2]).sort((a, b) => a[0] - b[0]);
  const arcs = [];
  for (let i = 0; i < gaps.length; i++) { const a0 = gaps[i][1], a1 = (i + 1 < gaps.length ? gaps[i + 1][0] : gaps[0][0] + Math.PI * 2); if (a1 > a0) arcs.push([a0, a1]); }
  ctx.save();
  for (const [lw, col] of [[7, 'rgba(248,56,0,0.35)'], [4, (f >> 1) & 1 ? '#F858C0' : '#58E8F8'], [1, '#F8F8F8']]) {
    ctx.lineWidth = lw; ctx.strokeStyle = col;
    for (const [a0, a1] of arcs) { ctx.beginPath(); ctx.arc(R.x, R.y, R.r, a0, a1); ctx.stroke(); }
  }
  ctx.restore();
}
// the gaps of a ring to come, shown from (x, y): dotted rays along their edges, out to the edge of the screen
function gx4aGapRays(ctx, x, y, gp, gw, f, r0 = 12) {
  ctx.fillStyle = (f >> 2) & 1 ? '#58F8F8' : '#F8F8F8';
  for (const g of gp) for (const s of [-1, 1]) {
    const a = g + s * gw / 2;
    for (let d = r0; d < 320; d += 5) { const px = x + Math.cos(a) * d, py = y + Math.sin(a) * d; if (px < -2 || px > FW + 2 || py > FH + 2 || py < -2) break; ctx.fillRect(Math.round(px), Math.round(py), 2, 2); }
  }
}

// a spotlight: {x, y, s: 0 chasing, 1 locked (about to zap), 2 zapping, z}
function gx4aSpotDraw(ctx, S, ox, oy, f) {
  const r = 16, x = Math.round(S.x), y = Math.round(S.y);
  ctx.save();
  ctx.globalAlpha = S.s === 2 ? 0.32 : 0.12;
  ctx.fillStyle = S.s === 2 ? '#F8F8F8' : '#F8F0C0';
  ctx.beginPath(); ctx.moveTo(ox - 3, oy); ctx.lineTo(ox + 3, oy); ctx.lineTo(x + r, y); ctx.lineTo(x - r, y); ctx.closePath(); ctx.fill();
  ctx.globalAlpha = S.s === 2 ? 0.8 : S.s === 1 ? ((f >> 2) & 1 ? 0.55 : 0.25) : 0.28;
  ctx.fillStyle = S.s === 2 ? ((f >> 1) & 1 ? '#F8F8F8' : '#F83800') : S.s === 1 ? '#F87830' : '#F8F0C0';
  ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.8, 0, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = S.s >= 1 ? '#F83800' : '#F8E8A0'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.8, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}
function gx4aSpotChase(st, S, sp) {
  const pl = st.gxPlayers();
  if (S.s === 0 && pl.length) {
    const t = pl.reduce((a, q) => (Math.hypot(q.x + 8 - S.x, q.y + 9 - S.y) < Math.hypot(a.x + 8 - S.x, a.y + 9 - S.y) ? q : a));
    const dx = t.x + 8 - S.x, dy = t.y + 9 - S.y, d = Math.hypot(dx, dy) || 1, v = Math.min(d, sp);
    S.x += dx / d * v; S.y += dy / d * v;
  }
  S.y = Math.max(FH * 0.35 + 6, S.y);
  if (S.z > 0) { S.z--; for (const t of pl) if (Math.hypot((t.x + 8 - S.x) / 1, (t.y + 9 - S.y) / 0.8) < 13) st.hitPlayer(t); if (!S.z) S.s = 0; }
}
// a spot's beat: two beats chasing, one locked, one zapping
function gx4aSpotBeat(S) {
  S.cb = (S.cb + 1) % 4;
  if (S.cb === 2) { S.s = 1; Sound.play('gx4aSpot'); } else if (S.cb === 3) { S.s = 2; S.z = 10; Sound.play('gx4aZap'); } else S.s = 0;
}

// ------------------------------------------------------------------ how they move
const gx4aWind = g => Math.sin(g.t / 160) * 0.9 + Math.sin(g.t / 47) * 0.25;
Object.assign(GX_MOVES, {
  // cotton candy: in to a spot, then drifting from side to side, raining sugar; at last it sinks away
  gx4aDrift: Object.assign(function (e, g) {
    if (e.t < 60) { e.x += (e.tx - e.x) * 0.06; e.y += (e.ty - e.y) * 0.06; return; }
    e.x += e.vx; if (e.x < 14 || e.x > FW - 14) { e.vx = -e.vx; e.x = gx4aClamp(e.x, 14, FW - 14); }
    if (e.t > e.life) e.ty += 0.5;
    e.y = e.ty + Math.sin(e.t / 40 + e.ph) * 4;
    if (e.y > FH + 14) { gxGone(e); return; }
    if (--e.rainT <= 0 && gx4aRoom(g)) { g.bullets.push({ x: e.x + rnd(9) - 4, y: e.y + 6, vx: 0, vy: 0.9 * g.shotSpd, k: 'gx4aSugar' }); e.rainT = Math.round((100 + rnd(120)) / Math.max(0.5, g.fireMul)); }
  }, { init(e) { e.x = e.tx; e.y = -12; e.vx = (rnd(2) ? 1 : -1) * 0.35; e.ph = rnd(10); e.rainT = 80 + rnd(80); e.life = 900 + rnd(300); e.fireT = 1e9; } }),
  // a puff from a split cloud: floats down, bouncing off the sides
  gx4aPuffM: Object.assign(function (e) {
    e.x += e.vx; e.y += 0.45 + Math.sin(e.t / 20) * 0.2;
    if (e.x < 6 || e.x > FW - 6) e.vx = -e.vx;
    if (e.y > FH + 10) gxGone(e);
  }, { init(e) { e.vx = e.vx || 0.5; e.fireT = 90 + rnd(120); } }),
  // glitter mines: blown about by the wind; near you they arm (a ring tightening) and burst
  gx4aWind: Object.assign(function (e, g, near) {
    if (e.k === 0) {
      e.vx += (gx4aWind(g) - e.vx) * 0.02; e.x += e.vx; e.y += e.vy;
      if (e.x < 6 || e.x > FW - 6) { e.vx = -e.vx * 0.6; e.x = gx4aClamp(e.x, 6, FW - 6); }
      const tg = near(e.x, e.y);
      if (e.y > 0 && ((tg && Math.hypot(tg.x + 8 - e.x, tg.y + 9 - e.y) < 38) || e.y > FH * 0.86)) { e.k = 1; e.t = 0; Sound.play('gx4aArm'); }
      if (e.y > FH + 10) gxGone(e);
    } else {
      e.y += 0.12;
      if (e.t >= 42) {
        const g2 = this.galaxy;
        g2.list = g2.list.filter(o => o !== e); e.dead = true; e.warnT = 1;
        for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 + 0.2; g2.bullets.push({ x: e.x, y: e.y, vx: Math.cos(a) * 1.05 * g2.shotSpd, vy: Math.sin(a) * 1.05 * g2.shotSpd, k: 'gx4aGlit' }); }
        this.addFx(e.x, e.y, Sprites.smallExp, 2);
        Sound.play('gx4aBurst');
      }
    }
    e.v = { k: e.k, t: e.k ? Math.min(42, e.t) : 0, w: Math.round((e.vx || 0) * 10) / 10 };
  }, { init(e) { e.x = e.x || 12 + rnd(FW - 24); e.y = -10; e.vx = 0; e.vy = 0.45 + Math.random() * 0.25; e.k = 0; e.fireT = 1e9; e.v = { k: 0, t: 0 }; } }),
  // star-ponies: leaping across the top in arcs, a star thrown from the top of a leap now and then; three passes, lower each time
  gx4aGallop: Object.assign(function (e, g, near) {
    const sp = Math.min(1.35, 0.85 + g.shotSpd * 0.22);
    e.x += e.dirX * 1.15 * sp;
    const q = ((e.t + (e.ph0 || 0)) % e.hopT) / e.hopT;
    e.y = e.base - Math.sin(q * Math.PI) * e.hopH;
    if (Math.abs(q - 0.5) < 0.5 / e.hopT && e.x > 8 && e.x < FW - 8 && !rnd(3) && gx4aRoom(g)) {
      const t = near(e.x, e.y);
      if (t) { const a = Math.atan2(t.y + 9 - e.y, t.x + 8 - e.x); g.bullets.push({ x: e.x, y: e.y + 3, vx: Math.cos(a) * 1.35 * g.shotSpd, vy: Math.sin(a) * 1.35 * g.shotSpd, k: 'gx4aStar' }); }
    }
    if (e.x < -18 || e.x > FW + 18) {
      if (++e.pass >= 3) { gxGone(e); return; }
      e.dirX = -e.dirX; e.base = Math.min(FH * 0.3, e.base + 14);
    }
    e.v = { fl: e.dirX < 0 ? 1 : 0, l: (e.t >> 3) & 1 };
  }, { init(e) { e.x = e.dirX > 0 ? -14 : FW + 14; e.base = e.base || 30; e.y = e.base; e.hopT = 48; e.hopH = 14; e.pass = 0; e.fireT = 1e9; e.v = { fl: e.dirX < 0 ? 1 : 0, l: 0 }; } }),
  // a stampede: a lane through your zone is shown, then they come galloping along it
  gx4aRush: Object.assign(function (e, g) {
    if (e.warnT > 0) { if (--e.warnT === 0 && e.ld) Sound.play('gx4aGallop'); e.v = { fl: e.dirX < 0 ? 1 : 0, l: 0, ld: e.ld ? 1 : 0, y: e.ly }; return; }
    e.x += e.dirX * 2.3 * Math.min(1.3, 0.8 + g.shotSpd * 0.25);
    e.y = e.ly - Math.abs(Math.sin(e.t / 5)) * 3;
    if (e.t % 10 === 0 && e.ld && e.x > 0 && e.x < FW) Sound.play('gx4aGallop');
    if ((e.dirX > 0 && e.x > FW + 18) || (e.dirX < 0 && e.x < -18)) gxGone(e);
    e.v = { fl: e.dirX < 0 ? 1 : 0, l: (e.t >> 2) & 1, ld: 0, y: e.ly };
  }, { init(e) { e.x = e.dirX > 0 ? -14 : FW + 14; e.y = e.ly; e.warnT = e.warn || 80; e.fireT = 1e9; e.v = { fl: e.dirX < 0 ? 1 : 0, l: 0, ld: e.ld ? 1 : 0, y: e.ly }; } }),
  // dark stars: they drop in, hunt you a while, then fall away
  gx4aDarkM: Object.assign(function (e, g, near) {
    const tg = near(e.x, e.y), cap = 1.05 * Math.min(1.35, g.shotSpd);
    if (e.t < 40) { e.y += 0.9; return; }
    if (e.t > 380 || !tg) { e.vy = Math.min(2.2, e.vy + 0.05); e.x += e.vx; e.y += e.vy; if (e.y > FH + 14) gxGone(e); return; }
    const dx = tg.x + 8 - e.x, dy = tg.y + 9 - e.y, d = Math.hypot(dx, dy) || 1;
    e.vx += dx / d * 0.05; e.vy += dy / d * 0.05;
    const v = Math.hypot(e.vx, e.vy); if (v > cap) { e.vx *= cap / v; e.vy *= cap / v; }
    e.x += e.vx; e.y += e.vy;
  }, { init(e) { e.x = 12 + rnd(FW - 24); e.y = -10; e.vx = 0; e.vy = 0.6; e.fireT = 1e9; } }),
  // RAINBOW ROAD: a striped band sweeping down ('h') or across ('v'), two gaps in it to fly through
  gx4aBandM: Object.assign(function (e, g) {
    const V = e.v;
    if (V.w > 0) { if (--V.w === 0) Sound.play('gx4aBeam'); return; }
    V.p += V.d * (V.o === 'h' ? 0.85 : 1.05) * Math.min(1.3, 0.85 + g.shotSpd * 0.2);
    for (const t of this.gxPlayers()) {
      const px = t.x + 8, py = t.y + 9, on = V.o === 'h' ? Math.abs(py - V.p) < V.th / 2 + 2 : Math.abs(px - V.p) < V.th / 2 + 2, q = V.o === 'h' ? px : py;
      if (on && !V.gaps.some(([a, b]) => q > a + 3 && q < b - 3)) this.hitPlayer(t);
    }
    const end = V.o === 'h' ? FH : FW;
    if ((V.d > 0 && V.p > end + 16) || (V.d < 0 && V.p < -16)) gxGone(e);
  }, { init(e) {
    const o = e.o || 'h', d = o === 'h' ? 1 : (e.d || 1), gw = 34;
    let gaps;
    if (o === 'h') { const a = 4 + rnd(FW - 2 * gw - 70), b = Math.min(FW - gw - 4, a + gw + 50 + rnd(Math.max(1, FW - a - 2 * gw - 50))); gaps = [[a, a + gw], [b, b + gw]]; }
    else { const top = Math.floor(FH * 0.35) + 6, span = FH - 6 - top - 2 * gw - 20, a = top + rnd(Math.max(1, span)), b = a + gw + 20 + rnd(Math.max(1, FH - 6 - gw - (a + gw + 20))); gaps = [[a, a + gw], [b, b + gw]]; }
    e.x = FW / 2; e.y = FH + 1000; e.fireT = 1e9;
    e.v = { o, d, p: d > 0 ? -16 : (o === 'h' ? FH : FW) + 16, th: 12, gaps, w: o === 'v' ? 80 : 30 };
  } }),
  // WISHING STARS: drops the gold wishes, one after another
  gx4aWishCM: Object.assign(function (e) {
    if (e.t % 54 === 20) { this.gxDrop(16 + rnd(FW - 32), -8, 'gx4aWish'); const u = this.galaxy.pickups[this.galaxy.pickups.length - 1]; if (u) u.vy = 0.8; if (--e.n <= 0) gxGone(e); }
  }, { init(e) { e.x = FW / 2; e.y = FH + 1000; e.fireT = 1e9; e.n = e.n || 10; } }),

  // ---- DISCO MOON
  // boogie bots: in to a spot, then a step on every beat (a little routine), three notes on every fourth
  gx4aBoogieM: Object.assign(function (e, g, near) {
    if (e.t < 60) { e.y += (e.hy - e.y) * 0.08; e.x += (e.hx - e.x) * 0.08; return; }
    const B = g.gx4aB;
    if (B && B.hit) {
      e.p = (e.p + 1) % 8;
      if (e.p % 4 === 0 && e.y > 0 && gx4aRoom(g)) { const t = near(e.x, e.y), a0 = t ? Math.atan2(t.y + 9 - e.y, t.x + 8 - e.x) : Math.PI / 2; for (const d of [-0.3, 0, 0.3]) g.bullets.push({ x: e.x, y: e.y + 5, vx: Math.cos(a0 + d) * 1.2 * g.shotSpd, vy: Math.sin(a0 + d) * 1.2 * g.shotSpd, k: 'gx4aNote' }); }
    }
    if (e.t > e.life) e.hy += 0.8;
    const st = [[0, 0], [-8, 2], [0, 0], [8, 2], [0, -5], [-5, 0], [5, 0], [0, 3]][e.p];
    e.x += (e.hx + st[0] - e.x) * 0.3; e.y += (e.hy + st[1] - e.y) * 0.3;
    if (e.y > FH + 14) gxGone(e);
    e.v = { p: e.p % 4 };
  }, { init(e) { e.hx = e.tx; e.hy = e.ty; e.x = e.tx; e.y = -14; e.p = 0; e.life = 1100 + rnd(300); e.fireT = 1e9; e.v = { p: 0 }; } }),
  // platform shoes: hover over you, lock on (two beats), stomp down where you were, a shockwave, back up; three stomps
  gx4aShoeM: Object.assign(function (e, g, near) {
    const B = g.gx4aB, hit = B && B.hit;
    if (e.k === 0) {
      e.y += (30 - e.y) * 0.06;
      const t = near(e.x, e.y); if (t) e.x += gx4aClamp(t.x + 8 - e.x, -0.9, 0.9);
      if (hit && e.t > 50 && ++e.cb >= 4) {
        if (e.n >= 3) { e.k = 5; } else if (t) { e.k = 1; e.cb = 0; e.gx = gx4aClamp(t.x + 8, 10, FW - 10); e.gy = t.y + 9; Sound.play('gx4aArm'); }
      }
    } else if (e.k === 1) {
      e.x += (e.gx - e.x) * 0.25;
      if (hit && ++e.cb >= 2) { e.k = 2; Sound.play('gx4aDash'); }
    } else if (e.k === 2) {
      e.y += 7;
      if (e.y >= e.gy - 4) {
        e.y = e.gy - 4; e.k = 3; e.t = 0; e.n++;
        Sound.play('gx4aStomp'); if (typeof gxShake === 'function') gxShake(g, 8, 2);
        if (gx4aRoom(g)) for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5; g.bullets.push({ x: e.x, y: e.y + 8, vx: Math.cos(a) * 1.0 * g.shotSpd, vy: Math.sin(a) * 1.0 * g.shotSpd, k: 'gx4aGlit' }); }
      }
    } else if (e.k === 3) { if (e.t >= 22) e.k = 4; }
    else if (e.k === 4) { e.y -= 3; if (e.y <= 30) { e.k = 0; e.cb = 0; } }
    else { e.y -= 2.5; if (e.y < -24) gxGone(e); }
    e.v = { k: e.k, gx: e.k === 1 || e.k === 2 ? Math.round(e.gx) : 0, gy: e.k === 1 || e.k === 2 ? Math.round(e.gy) : 0 };
  }, { init(e) { e.x = e.tx || 20 + rnd(FW - 40); e.y = -20; e.k = 0; e.cb = 0; e.n = 0; e.fireT = 1e9; e.v = { k: 0 }; } }),
  // a conga line: every dancer on the same looping path, each a little behind the one in front
  gx4aCongaM: Object.assign(function (e, g, near) {
    const P = e.P, t = e.t - e.d, [x, y] = gx4aCongaAt(P, t);
    e.x = x; e.y = y;
    if (t > 60 + P.L + 30 && (y > FH + 14 || x < -20 || x > FW + 20)) { gxGone(e); return; }
    const B = g.gx4aB;
    if (B && B.hit) {
      e.p = (e.p + 1) & 1;
      if (e.ld && B.n % 4 === 0 && y > 0 && gx4aRoom(g)) { const tg = near(e.x, e.y), a0 = tg ? Math.atan2(tg.y + 9 - e.y, tg.x + 8 - e.x) : Math.PI / 2; for (const d of [-0.25, 0, 0.25]) g.bullets.push({ x: e.x, y: e.y + 5, vx: Math.cos(a0 + d) * 1.25 * g.shotSpd, vy: Math.sin(a0 + d) * 1.25 * g.shotSpd, k: 'gx4aNote' }); Sound.play('gx4aShake'); }
      else if (!e.ld && B.n % 8 === (e.d / 11) % 8 && y > 0 && gx4aRoom(g)) g.bullets.push({ x: e.x, y: e.y + 5, vx: 0, vy: 1.2 * g.shotSpd, k: 'gx4aNote' });
    }
    e.v = { p: e.p, ld: e.ld ? 1 : 0 };
  }, { init(e) { const [x, y] = gx4aCongaAt(e.P, -e.d); e.x = x; e.y = y; e.p = 0; e.fireT = 1e9; e.v = { p: 0, ld: e.ld ? 1 : 0 }; } }),
  // the soul train: every car keeps to the same rule (along the row; at the edge down a row and back), so they all
  // follow the engine's path; shoot one out and the cars behind it carry on as a train of their own
  gx4aTrain: Object.assign(function (e, g, near) {
    const sp = 1.15 * Math.min(1.35, 0.85 + g.shotSpd * 0.2);
    if (e.dsc > 0) { const s = Math.min(e.dsc, sp); e.y += s * e.vd; e.dsc -= s; }
    else {
      e.x += e.dir * sp;
      if ((e.dir > 0 && e.x > FW - 8) || (e.dir < 0 && e.x < 8)) {
        e.x = gx4aClamp(e.x, 8, FW - 8); e.dir = -e.dir; e.dsc = 12;
        if (e.y + 12 > FH - 10) e.vd = -1; else if (e.y - 12 < 12 && e.vd < 0) e.vd = 1;
      }
    }
    const head = !g.list.some(o => o.type === 'gx4aCar' && o !== e && !o.dead && Math.abs(o.y - e.y) < 4 && (o.x - e.x) * e.dir > 0 && Math.abs(o.x - e.x) < 18);
    const B = g.gx4aB;
    if (B && B.hit && B.n % 4 === 0 && e.x > 4 && e.x < FW - 4 && gx4aRoom(g)) {
      if (head) { const t = near(e.x, e.y); if (t) { const a = Math.atan2(t.y + 9 - e.y, t.x + 8 - e.x); g.bullets.push({ x: e.x, y: e.y + 4, vx: Math.cos(a) * 1.3 * g.shotSpd, vy: Math.sin(a) * 1.3 * g.shotSpd, k: 'gx4aNote' }); } }
      else if ((e.k + (B.n >> 2)) % 4 === 0) g.bullets.push({ x: e.x, y: e.y + 4, vx: 0, vy: 1.15 * g.shotSpd, k: 'gx4aNote' });
    }
    if (e.t > 3000) gxGone(e);
    e.v = { h: head ? 1 : 0, fl: e.dir < 0 ? 1 : 0, w: (e.t >> 3) & 1 };
  }, { init(e) { e.x = e.dir > 0 ? -12 - e.k * 15 : FW + 12 + e.k * 15; e.y = 14; e.dsc = 0; e.vd = 1; e.fireT = 1e9; e.v = { h: e.k === 0 ? 1 : 0, fl: e.dir < 0 ? 1 : 0, w: 0 }; } }),
  // spotlight rigs: along a rail at the top; each throws a spot that chases you and zaps on the beat
  gx4aRigM: Object.assign(function (e, g) {
    e.y += (16 - e.y) * 0.08;
    e.x = e.hx + Math.sin(e.t / 90 + e.off) * 20;
    const S = e.S;
    if (e.t > 50) {
      if (g.gx4aB && g.gx4aB.hit) gx4aSpotBeat(S);
      gx4aSpotChase(this, S, 0.75 * Math.min(1.3, 0.8 + g.shotSpd * 0.2));
    }
    e.v = { sx: Math.round(S.x), sy: Math.round(S.y), s: e.t > 50 ? S.s : -1 };
  }, { init(e) { e.hx = e.tx; e.x = e.tx; e.y = -12; e.fireT = 1e9; e.S = { x: e.tx, y: FH * 0.6, s: 0, z: 0, cb: (e.off || 0) % 4 }; e.v = { s: -1 }; } }),
  // speaker stacks: four beats pumping, three counting in (the ring's gaps shown), then the drop: a shockwave ring
  gx4aSpkM: Object.assign(function (e, g) {
    e.y += (e.hy - e.y) * 0.06;
    const B = g.gx4aB;
    if (e.t > 60 && B && B.hit) {
      e.cb = (e.cb + 1) % 8;
      if (e.cb === 4) { const down = Math.PI / 2 + (Math.random() - 0.5) * 1.5; e.gp = [down, down + Math.PI * (0.65 + Math.random() * 0.7)]; Sound.play('gx4aRiser'); }
      if (e.cb === 7 && e.gp) {
        this.gxSpawn({ type: 'gx4aRing', st: 'gx4aRingM', rx: e.x, ry: e.y + 4, gp: e.gp.slice(), gw: 0.66 });
        Sound.play('gx4aDrop'); if (typeof gxShake === 'function') gxShake(g, 10, 3);
        e.gp = null;
        if (++e.n >= 4) e.hy = -40;
      }
    }
    if (e.hy < 0 && e.y < -20) gxGone(e);
    e.v = { p: B && B.k < 0.25 && e.cb < 4 ? 1 : 0, c: e.cb >= 4 && e.cb < 7 ? 7 - e.cb : 0, gp: e.gp ? e.gp.map(a => Math.round(a * 100) / 100) : 0 };
  }, { init(e) { e.hy = e.ty || 30; e.x = e.tx; e.y = -20; e.cb = (e.off || 0) % 8; e.n = 0; e.gp = null; e.fireT = 1e9; e.v = { p: 0, c: 0, gp: 0 }; } }),
  // a shockwave ring (not an enemy you can see: it draws the ring, and hurts where there's no gap)
  gx4aRingM: Object.assign(function (e, g) {
    const R = e.v;
    R.sp = 2.3 * Math.min(1.3, 0.85 + g.shotSpd * 0.2);
    gx4aRingStep(this, R);
    if (R.r > 340) gxGone(e);
  }, { init(e) { e.x = FW / 2; e.y = FH + 1000; e.fireT = 1e9; e.v = { x: e.rx, y: e.ry, r: 10, gp: e.gp, gw: e.gw || 0.66, sp: 2.3 }; } }),
  // DANCE FLOOR: the tiles over your zone; it carries on while anything else of the wave is left (four bars at least)
  gx4aFloorM: Object.assign(function (e, g) {
    const F = e.v, B = g.gx4aB;
    if (B && B.hit) {
      const left = g.list.some(o => o !== e && o.type !== 'gx4aFloorC') || g.spawnQ.length;
      if (F.s === 3 && F.n >= 3 && !left) { gxGone(e); return; }
      gx4aFloorBeat(F);
    }
    gx4aFloorZap(this, F);
  }, { init(e) { e.x = FW / 2; e.y = FH + 1000; e.fireT = 1e9; e.v = { p: rnd(11), s: -1, z: 0, n: 0, seed: rnd(99) }; } }),
  // the mirrorball's little ones: bouncing about the top of the screen, a flash of light at you every other beat
  gx4aMiniM: Object.assign(function (e, g, near) {
    e.x += e.vx; e.y += e.vy;
    if (e.x < 8 || e.x > FW - 8) { e.vx = -e.vx; e.x = gx4aClamp(e.x, 8, FW - 8); }
    if ((e.y < 12 && e.vy < 0) || (e.y > FH * 0.58 && e.vy > 0)) e.vy = -e.vy;
    const B = g.gx4aB;
    if (B && B.hit && (B.n + e.k) % 2 === 0 && gx4aRoom(g)) {
      const t = near(e.x, e.y);
      if (t) { const a = Math.atan2(t.y + 9 - e.y, t.x + 8 - e.x); g.bullets.push({ x: e.x, y: e.y, vx: Math.cos(a) * 1.5 * g.shotSpd, vy: Math.sin(a) * 1.5 * g.shotSpd, k: 'gx4aLight' }); }
    }
  }, { init(e) { e.fireT = 1e9; e.k = e.k || 0; } }),
});
// a conga line's path P: in from a side, figure-eights for a while, then away down the screen
function gx4aCongaAt(P, t) {
  const sx = P.s < 0 ? -12 : FW + 12, sy = 16;
  if (t < 0) return [sx, sy];
  if (t < 60) { const k = t / 60, q = k * k * (3 - 2 * k); return [sx + (P.cx - sx) * q, sy + (P.cy - sy) * q]; }
  const u = t - 60, x = P.cx + P.rx * Math.sin(P.w * u) * -P.s, y = P.cy + P.ry * Math.sin(2 * P.w * u);
  return [x, y + Math.max(0, u - P.L) * 1.1];
}

// ------------------------------------------------------------------ how they shoot
Object.assign(GX_FIRE, {
  gx4aSparkle(e, g, near) {
    if (Math.random() < Math.max(0.25, g.aim || 0)) { const t = near(e.x, e.y); if (t) { const a = Math.atan2(t.y + 9 - e.y, t.x + 8 - e.x); g.bullets.push({ x: e.x, y: e.y + 4, vx: Math.cos(a) * 1.35 * g.shotSpd, vy: Math.sin(a) * 1.35 * g.shotSpd, k: 'gx4aStar' }); } }
    else g.bullets.push({ x: e.x, y: e.y + 5, vx: 0, vy: 1.3 * g.shotSpd, k: 'gx4aStar' });
    return Math.round((e.st === 'cross' ? 150 + rnd(90) : 320 + rnd(400)) / Math.max(0.4, g.fireMul));
  },
  gx4aDancer(e, g, near) {
    if (Math.random() < (g.aim || 0)) { const t = near(e.x, e.y); if (t) { const a = Math.atan2(t.y + 9 - e.y, t.x + 8 - e.x); g.bullets.push({ x: e.x, y: e.y + 4, vx: Math.cos(a) * 1.35 * g.shotSpd, vy: Math.sin(a) * 1.35 * g.shotSpd, k: 'gx4aNote' }); } }
    else g.bullets.push({ x: e.x, y: e.y + 5, vx: 0, vy: 1.3 * g.shotSpd, k: 'gx4aNote' });
    return Math.round((e.st === 'cross' ? 150 + rnd(90) : 320 + rnd(400)) / Math.max(0.4, g.fireMul));
  },
  gx4aPuff(e, g) { g.bullets.push({ x: e.x, y: e.y + 4, vx: 0, vy: 0.95 * g.shotSpd, k: 'gx4aSugar' }); return Math.round((180 + rnd(160)) / Math.max(0.4, g.fireMul)); },
});

// what touching them does
const gx4aNoTouch = () => false;
Object.assign(GX_COLLIDE, {
  gx4aBand: gx4aNoTouch, gx4aWishC: gx4aNoTouch, gx4aFloorC: gx4aNoTouch, gx4aRing: gx4aNoTouch, gx4aChBall: gx4aNoTouch,
  gx4aRush(e, t) { return Math.abs(t.x + 8 - e.x) < 8 + 3 && Math.abs(t.y + 9 - e.y) < 5 + 4; },
  gx4aPony(e, t) { return Math.abs(t.x + 8 - e.x) < 7 + 4 && Math.abs(t.y + 9 - e.y) < 5 + 4; },
  gx4aShoe(e, t) { return Math.abs(t.x + 8 - e.x) < 7 + 3 && Math.abs(t.y + 9 - e.y) < 8 + 4; },
});

// shot down
Object.assign(GX_ON_KILL, {
  gx4aBand: () => false, gx4aWishC: () => false, gx4aFloorC: () => false, gx4aRing: () => false,
  // a cloud splits into two puffs
  gx4aCloud(e, p, g) {
    for (const s of [-1, 1]) { const o = this.gxSpawn({ type: 'gx4aPuff', st: 'gx4aPuffM', vx: s * 0.55 }); o.x = e.x + s * 5; o.y = e.y; }
    this.addFx(e.x, e.y, gx4aPoof(), 3);
    if (p && Math.random() < 0.4) this.gxDrop(e.x, e.y, Math.random() < 0.3 ? 'gem' : 'coin');
    Sound.play('gx4aPop');
    return false;
  },
  gx4aPuff(e) { this.addFx(e.x, e.y, gx4aPoof(), 2); if (this.frame % 2 === 0) Sound.play('gx4aPop'); return false; },
  // a mine shot before it bursts: a harmless puff of glitter
  gx4aMine(e) { this.addFx(e.x, e.y, gx4aGlitterFx(), 2); Sound.play('gx4aSparkle'); },
  gx4aDark(e) { if (Math.random() < 0.3) this.popups.push({ x: e.x, y: e.y - 6, text: 'BEGONE!', label: true, color: '#F8D848', t: 0, delay: 0, life: 40 }); },
  gx4aMini(e) { this.addFx(e.x, e.y, gx4aGlitterFx(), 3); this.addFx(e.x, e.y, Sprites.bigExp, 3); Sound.play('gx4aShatter'); return false; },
  gx4aChBall(e, p, g) { return GX_ON_KILL.chA ? GX_ON_KILL.chA.call(this, e, p, g) : false; },
});

Object.assign(Stage.prototype, {
  gx4aTalk(b, text, t = 110, snd = 'gx4aChat') { this.gxSay(b, text, t); Sound.play(snd); },
});

// ------------------------------------------------------------------ the new waves
Object.assign(GX_WAVE_KINDS, {
  // clouds of cotton candy drifting, raining sugar; shot, they split
  gx4aCandy(g, add, types, more) {
    const n = Math.round(7 * more);
    for (let k = 0; k < n; k++) add('gx4aCloud', { st: 'gx4aDrift', tx: 24 + ((k * 53) % (FW - 48)), ty: 18 + (k % 3) * 18, delay: k * 50 });
    for (let k = 0; k < 4; k++) add('drone', { st: 'enter', slot: [FW / 2 - 30 + k * 20, 80], from: k < 2 ? -1 : 1, delay: 100 + k * 8 });
  },
  // herds leaping over the top; then stampedes along lanes through your zone
  gx4aStampede(g, add, types, more) {
    const herds = Math.round(3 * Math.min(1.4, more));
    for (let h = 0; h < herds; h++) for (let k = 0; k < 4; k++) add('gx4aPony', { st: 'gx4aGallop', dirX: h % 2 ? -1 : 1, base: 26 + (h % 3) * 14, ph0: k * 9, delay: h * 150 + k * 16 });
    const lanes = [0.55, 0.82, 0.68, 0.9, 0.6].map(q => Math.round(FH * q)), nl = Math.round(3 * Math.min(1.5, more));
    for (let l = 0; l < nl; l++) for (let k = 0; k < 3; k++) add('gx4aPony', { st: 'gx4aRush', dirX: l % 2 ? -1 : 1, ly: lanes[l % lanes.length], warn: 80 + k * 16, ld: k === 0, delay: 320 + l * 230 });
  },
  // rainbow bands sweeping down and across, two gaps in each; sparkles at the top
  gx4aRoad(g, add, types, more) {
    const n = Math.round(4 * Math.min(1.5, more));
    for (let k = 0; k < n; k++) add('gx4aBand', { st: 'gx4aBandM', o: k % 2 ? 'v' : 'h', d: (k >> 1) % 2 ? -1 : 1, delay: 40 + k * 220 });
    for (let k = 0; k < 6; k++) add('drone', { st: 'enter', slot: [FW / 2 - 50 + k * 20, 22], from: k < 3 ? -1 : 1, delay: k * 8 });
  },
  // glitter mines blown about by the wind; a couple of clouds
  gx4aStorm(g, add, types, more) {
    const n = Math.round(14 * more);
    for (let k = 0; k < n; k++) add('gx4aMine', { st: 'gx4aWind', x: 14 + ((k * 47) % (FW - 28)), delay: 20 + Math.floor(k / 2) * 48 + (k % 2) * 14 });
    for (let k = 0; k < 2; k++) add('gx4aCloud', { st: 'gx4aDrift', tx: FW * (k + 1) / 3, ty: 22, delay: 60 + k * 30 });
  },
  // gold wishes to catch, dark stars to shoot
  gx4aWishes(g, add, types, more) {
    add('gx4aWishC', { st: 'gx4aWishCM', n: 10, delay: 10 });
    const n = Math.round(10 * more);
    for (let k = 0; k < n; k++) add('gx4aDark', { st: 'gx4aDarkM', delay: 60 + k * 52 });
    for (let k = 0; k < 4; k++) add('drone', { st: 'enter', slot: [FW / 2 - 30 + k * 20, 20], from: k < 2 ? -1 : 1, delay: k * 8 });
  },
  // lines of conga dancers looping figure-eights
  gx4aConga(g, add, types, more) {
    const lines = Math.round(3 * Math.min(1.4, more));
    for (let l = 0; l < lines; l++) {
      const P = { s: l % 2 ? -1 : 1, cx: FW / 2 + (l % 2 ? 16 : -16), cy: 42 + (l % 3) * 16, rx: FW / 2 - 24, ry: 16 + (l % 2) * 6, w: 0.021 + l * 0.002, L: 520 };
      for (let k = 0; k < 7; k++) add('gx4aConga', { st: 'gx4aCongaM', P, d: k * 11, ld: k === 0, delay: l * 170 });
    }
  },
  // the floor lights up under you; boogie bots dance over it
  gx4aFloor(g, add, types, more) {
    add('gx4aFloorC', { st: 'gx4aFloorM', delay: 5 });
    const n = Math.round(6 * Math.min(1.4, more));
    for (let k = 0; k < n; k++) add('gx4aBoogie', { st: 'gx4aBoogieM', tx: 24 + k * ((FW - 48) / Math.max(1, n - 1)), ty: 22 + (k % 2) * 16, delay: 40 + k * 20 });
    for (let k = 0; k < 4; k++) add('drone', { st: 'enter', slot: [FW / 2 - 30 + k * 20, 60], from: k < 2 ? -1 : 1, delay: 160 + k * 8 });
  },
  // spotlight rigs on a rail at the top; platform shoes
  gx4aSpots(g, add, types, more) {
    const n = FW > 230 ? 4 : 3;
    for (let k = 0; k < n; k++) add('gx4aRig', { st: 'gx4aRigM', tx: FW * (k + 1) / (n + 1), off: k, delay: k * 30 });
    for (let k = 0; k < Math.round(2 * Math.min(1.5, more)); k++) add('gx4aShoe', { st: 'gx4aShoeM', tx: FW * (k + 1) / 3, delay: 200 + k * 160 });
    for (let k = 0; k < 6; k++) add('drone', { st: 'enter', slot: [FW / 2 - 50 + k * 20, 36], from: k < 3 ? -1 : 1, delay: 60 + k * 8 });
  },
  // the soul train winding down the screen, row by row
  gx4aSoul(g, add, types, more) {
    const trains = Math.round(2 * Math.min(1.5, more));
    for (let tr = 0; tr < trains; tr++) for (let k = 0; k < 10; k++) add('gx4aCar', { st: 'gx4aTrain', dir: tr % 2 ? -1 : 1, k, delay: tr * 300 });
    add('gx4aShoe', { st: 'gx4aShoeM', tx: FW / 2, delay: 420 });
  },
  // speaker stacks counting in to the drop; dancers
  gx4aDrop(g, add, types, more) {
    for (let k = 0; k < 2; k++) add('gx4aSpeaker', { st: 'gx4aSpkM', tx: FW * (k + 1) / 3, ty: 26 + k * 6, off: k * 4, delay: k * 20 });
    const n = Math.round(6 * more);
    for (let k = 0; k < n; k++) add('drone', { st: 'enter', slot: [FW / 2 - 50 + (k % 6) * 20, 60 + Math.floor(k / 6) * 14], from: k % 2 ? 1 : -1, delay: 40 + k * 8 });
    add('gx4aBoogie', { st: 'gx4aBoogieM', tx: FW / 2, ty: 24, delay: 200 });
  },
});

// DISCO MOON's challenge stage: little mirrorballs fly through instead of the bugs
{
  const next0 = Stage.prototype.gxNextWave;
  Stage.prototype.gxNextWave = function () {
    const r = next0.apply(this, arguments), g = this.galaxy;
    if (g && g.phase === 'wave' && g.kind === 'challenge' && gx4aIs(g, GX4A_DISCO)) for (const q of g.spawnQ) if (GX_TYPES[q.type] && GX_TYPES[q.type].chal) q.type = 'gx4aChBall';
    return r;
  };
}

// ------------------------------------------------------------------ every frame: the beat, the bullets that bounce and burst,
// the wishing stars of RAINBOW RIFT
GX_FRAME.push(function (g) {
  gx4aBeatTick(g);
  if (this.freezeE > 0) return;
  let pop = false;
  for (const b of g.bullets) {
    if (b.gr) {   // glitter that falls and bounces off the floor
      b.vy += b.gr;
      if (b.vy > 0 && b.y > FH - 6 && b.bn > 0) { b.vy = -Math.abs(b.vy) * 0.62; b.bn--; }
    }
    if (b.k === 'gx4aHeart') {   // a big heart drifts down, wobbling, then bursts into little ones
      b.vy = Math.min(1.1, b.vy + 0.01); b.x += Math.sin((b.y + (b.wob || 0) * 9) / 14) * 0.35;
      if (b.y >= b.pop) {
        b.dead = true; pop = true;
        for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 + 0.5; g.bullets.push({ x: b.x, y: b.y, vx: Math.cos(a) * 1.05 * g.shotSpd, vy: Math.sin(a) * 1.05 * g.shotSpd, k: 'gx4aHeartS' }); }
      }
    }
  }
  if (pop) { g.bullets = g.bullets.filter(b => !b.dead); Sound.play('gx4aHeart'); }
  // RAINBOW RIFT: now and then a wishing star drifts down (the WISHING STARS wave brings its own)
  if (gx4aIs(g, GX4A_RAINBOW) && g.phase === 'wave' && g.kind !== 'gx4aWishes' && g.t % 720 === 360) {
    this.gxDrop(20 + rnd(FW - 40), -8, 'gx4aWish');
    const u = g.pickups[g.pickups.length - 1]; if (u) u.vy = 0.7;
  }
  if (g.gx4aOnBeatT > 0) g.gx4aOnBeatT--;
});

// DISCO MOON: a kill on the beat scores double
{
  const kill0 = Stage.prototype.gxKill;
  Stage.prototype.gxKill = function (e, p) {
    const g = this.galaxy, B = g && g.gx4aB, T = GX_TYPES[e.type];
    if (p && !e.dead && T && T.pts > 0 && gx4aIs(g, GX4A_DISCO) && B && (B.k < 0.16 || B.k > 0.9)) {
      this.addScore(p, T.pts * (1 + g.loop));
      if (!(g.gx4aOnBeatT > 0)) { this.popups.push({ x: e.x, y: e.y - 10, text: 'ON BEAT!', label: true, color: gx4aPick(GX4A_DISCO_COLS), t: 0, delay: 0, life: 40 }); g.gx4aOnBeatT = 24; }
    }
    return kill0.apply(this, arguments);
  };
}

// a wishing star: catch it (points, credits); every 4th grants a wish
GX_PICKUPS.gx4aWish = {
  draw(ctx, x, y, t) {
    const R = 5.5 + ((t >> 3) & 1) * 0.6, a0 = -Math.PI / 2 + Math.sin(t / 20) * 0.2;
    ctx.fillStyle = 'rgba(248,232,120,0.25)'; ctx.beginPath(); ctx.arc(x, y, 9, 0, Math.PI * 2); ctx.fill();
    for (let k = 1; k <= 3; k++) { ctx.fillStyle = GX4A_RAINBOW_COLS[(k + (t >> 2)) % 6]; ctx.fillRect(x - 1, y - 6 - k * 3, 2, 2); }
    ctx.beginPath();
    for (let i = 0; i < 10; i++) { const a = a0 + i * Math.PI / 5, d = i % 2 ? R * 0.45 : R; ctx.lineTo(x + Math.cos(a) * d, y + Math.sin(a) * d); }
    ctx.closePath(); ctx.fillStyle = '#7C5000'; ctx.lineWidth = 2; ctx.strokeStyle = '#7C5000'; ctx.stroke(); ctx.fillStyle = '#F8D848'; ctx.fill();
    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(x - 2, y - 2, 2, 2);
  },
  collect(t, u) {
    const g = this.galaxy, p = t.player, gp = gxPlayer(p), say = (text, color) => this.popups.push({ x: t.x + 8, y: t.y - 4, text, label: true, color, t: 0, delay: 0, life: 60 });
    this.addScore(p, 500 * (1 + g.loop));
    if (typeof gxCash === 'function') gxCash(p, 25);
    g.gx4aWishN = (g.gx4aWishN || 0) + 1;
    if (g.gx4aWishN % 4) { say('WISH ' + (g.gx4aWishN % 4) + '/4', '#F8D848'); Sound.play('gx4aWish'); return; }
    const w = gx4aPick(['power', 'shield', 'bomb', gp.power < GX_POWER_MAX ? 'power' : 'shield']);
    if (w === 'power' && gp.power < GX_POWER_MAX) { gp.power++; say('WISH: POWER ' + gp.power, '#58D854'); }
    else if (w === 'bomb' && gp.bombs < 5) { gp.bombs++; say('WISH: A BOMB', '#F87830'); }
    else { t.shield = Math.max(t.shield || 0, 480); say('WISH: A SHIELD', '#58C8F8'); }
    Sound.play('bonus');
  },
};

// ------------------------------------------------------------------ drawing them
const gx4aSpr = (ctx, e, f, fr) => {
  const T = GX_TYPES[e.type], img = GxGfx.get(e.type, fr, e.flash > 0 ? 'f' : 'n');
  if (e.v && e.v.fl) { ctx.save(); ctx.translate(Math.round(e.x), 0); ctx.scale(-1, 1); ctx.drawImage(img, -Math.round(T.w / 2), Math.round(e.y - T.h / 2)); ctx.restore(); }
  else ctx.drawImage(img, Math.round(e.x - T.w / 2), Math.round(e.y - T.h / 2));
};
// rainbow stripes, a band of them (thickness th) along x from x0 to x1 at y (or along y, vertical)
function gx4aStripes(ctx, a0, a1, c, th, vert, alpha = 1) {
  const n = GX4A_RAINBOW_COLS.length, s = th / n;
  ctx.globalAlpha = alpha;
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = GX4A_RAINBOW_COLS[i];
    const p = Math.round(c - th / 2 + i * s), q = Math.max(1, Math.round(c - th / 2 + (i + 1) * s) - p);
    if (vert) ctx.fillRect(p, Math.round(a0), q, Math.round(a1 - a0)); else ctx.fillRect(Math.round(a0), p, Math.round(a1 - a0), q);
  }
  ctx.globalAlpha = 1;
}
Object.assign(GX_RENDER, {
  gx4aWishC() {},
  gx4aMine(ctx, e, f) {
    const v = e.v || {};
    if (v.k === 1) {   // armed: a ring closing in on it, it flashes
      const r = 22 - (v.t / 42) * 14;
      ctx.strokeStyle = (f >> 1) & 1 ? '#F83800' : '#F8F8F8'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(Math.round(e.x), Math.round(e.y), r, 0, Math.PI * 2); ctx.stroke();
      if ((f >> 1) & 1) { ctx.drawImage(gx3RedImg('gx4aMine', 0), Math.round(e.x - 6), Math.round(e.y - 6)); return; }
    }
    else for (let k = 1; k <= 4; k++) {   // glitter streaming off it in the wind
      const w = v.w || 0, x = Math.round(e.x - w * k * 5 + Math.sin(f / 5 + k) * 1.5), y = Math.round(e.y - 3 - k * 3);
      ctx.fillStyle = (k + (f >> 2)) % 3 ? GX4A_DISCO_COLS[(k + (f >> 3)) % 6] : '#FFFFFF'; ctx.fillRect(x, y, 1, 1);
    }
    gx4aSpr(ctx, e, f, (f >> 3) & 1);
  },
  gx4aPony(ctx, e, f) {
    const v = e.v || {}, dir = v.fl ? -1 : 1;
    if (v.y !== undefined && e.warnT > 0) {   // a stampede coming: its lane flashes, arrows at the side it comes from
      if (v.ld) {
        const y = Math.round(v.y), on = (f >> 2) & 1;
        ctx.globalAlpha = on ? 0.2 : 0.1; ctx.fillStyle = '#F8D848'; ctx.fillRect(0, y - 9, FW, 18); ctx.globalAlpha = 1;
        ctx.fillStyle = on ? '#F83800' : '#F8D848'; for (let x = (f * dir >> 1) % 6 + 6; x < FW + 6; x += 6) { ctx.fillRect(x - 6, y - 10, 3, 1); ctx.fillRect(x - 6, y + 9, 3, 1); }
        const ax = dir > 0 ? 2 : FW - 14;
        if (on) { ctx.fillStyle = '#F8D848'; ctx.fillRect(ax, y - 5, 12, 10); Font.draw(ctx, dir > 0 ? '>' : '<', ax + 2, y - 4, '#100808'); }
      }
      return;
    }
    // a little rainbow behind it
    for (let i = 0; i < 3; i++) { ctx.globalAlpha = 0.7 - i * 0.2; for (let s = 0; s < 3; s++) { ctx.fillStyle = GX4A_RAINBOW_COLS[s * 2]; ctx.fillRect(Math.round(e.x - dir * (9 + i * 5)) - 2, Math.round(e.y - 2 + s * 2 + Math.sin((f + i * 3) / 4)), 5, 2); } }
    ctx.globalAlpha = 1;
    gx4aSpr(ctx, e, f, v.l | 0);
  },
  gx4aBand(ctx, e, f) {
    const V = e.v; if (!V) return;
    const H = V.o === 'h', end = H ? FW : FH, gaps = V.gaps.slice().sort((a, b) => a[0] - b[0]);
    if (V.w > 0) {   // a band about to sweep across: its gaps shown at the side it comes from
      if (!((f >> 2) & 1)) return;
      const at = V.d > 0 ? 2 : (H ? FH : FW) - 4;
      let a = H ? 0 : Math.floor(FH * 0.35);
      for (const [g0, g1] of gaps.concat([[end, end]])) { gx4aStripes(ctx, a, g0, at, 4, !H); a = g1; }
      ctx.fillStyle = '#F8F8F8'; for (const [g0, g1] of gaps) { if (H) { ctx.fillRect(g0, at - 4, 1, 8); ctx.fillRect(g1 - 1, at - 4, 1, 8); } else { ctx.fillRect(at - 4, g0, 8, 1); ctx.fillRect(at - 4, g1 - 1, 8, 1); } }
      if (!H) Font.draw(ctx, V.d > 0 ? '>' : '<', V.d > 0 ? 8 : FW - 16, Math.round(FH * 0.35) - 10, '#F8D848');
      return;
    }
    let a = 0;
    for (const [g0, g1] of gaps.concat([[end, end]])) { if (g0 > a) gx4aStripes(ctx, a, g0, V.p, V.th, !H); a = g1; }
    // sparkles along its edges, and markers at the gaps
    ctx.fillStyle = '#FFFFFF';
    for (let k = 0; k < 10; k++) { const q = (k * 37 + f * 3) % end, s = V.p + ((k & 1) ? V.th / 2 : -V.th / 2); if (!gaps.some(([g0, g1]) => q > g0 && q < g1)) { if (H) ctx.fillRect(q, Math.round(s), 1, 1); else ctx.fillRect(Math.round(s), q, 1, 1); } }
    ctx.fillStyle = (f >> 2) & 1 ? '#F8F8F8' : '#F8D848';
    for (const [g0, g1] of gaps) for (const q of [g0, g1 - 1]) { if (H) ctx.fillRect(q, Math.round(V.p - V.th / 2) - 2, 1, V.th + 4); else ctx.fillRect(Math.round(V.p - V.th / 2) - 2, q, V.th + 4, 1); }
  },
  gx4aDancer(ctx, e, f) {
    const g = this.galaxy, n = g && g.gx4aB ? g.gx4aB.n : Math.floor(f / 30);
    gx4aSpr(ctx, e, f, n & 1);
  },
  gx4aBoogie(ctx, e, f) { gx4aSpr(ctx, e, f, (e.v && e.v.p) | 0); },
  gx4aConga(ctx, e, f) {
    const v = e.v || {};
    if (v.ld) { ctx.fillStyle = (f >> 2) & 1 ? '#F8D848' : '#F858C0'; ctx.fillRect(Math.round(e.x) - 7, Math.round(e.y) - 2 - v.p * 2, 2, 3); ctx.fillRect(Math.round(e.x) + 5, Math.round(e.y) - 4 + v.p * 2, 2, 3); }
    gx4aSpr(ctx, e, f, v.p | 0);
  },
  gx4aCar(ctx, e, f) { const v = e.v || {}; gx4aSpr(ctx, e, f, (v.h ? 2 : 0) + (v.w | 0)); },
  gx4aShoe(ctx, e, f) {
    const v = e.v || {};
    if ((v.k === 1 || v.k === 2) && v.gy) {   // where it'll land: a shadow and a target
      const x = v.gx, y = v.gy;
      ctx.globalAlpha = 0.35; ctx.fillStyle = '#000000'; ctx.beginPath(); ctx.ellipse(x, y + 6, 11, 4, 0, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
      if ((f >> 2) & 1) { ctx.fillStyle = '#F83800'; ctx.fillRect(x - 10, y, 6, 1); ctx.fillRect(x + 5, y, 6, 1); ctx.fillRect(x, y - 9, 1, 6); ctx.fillRect(x, y + 4, 1, 6); ctx.fillRect(x - 1, y - 1, 3, 3); }
    }
    const shake = v.k === 1 ? ((f >> 1) & 1 ? 1 : -1) : 0;
    const img = GxGfx.get('gx4aShoe', (f >> 3) & 1, e.flash > 0 ? 'f' : 'n');
    ctx.drawImage(img, Math.round(e.x - 8 + shake), Math.round(e.y - 9));
  },
  gx4aRig(ctx, e, f) {
    const v = e.v || {};
    if (v.s >= 0 && v.sy) gx4aSpotDraw(ctx, { x: v.sx, y: v.sy, s: v.s }, Math.round(e.x), Math.round(e.y + 5), f);
    gx4aSpr(ctx, e, f, v.s === 2 ? 1 : 0);
  },
  gx4aSpeaker(ctx, e, f) {
    const v = e.v || {};
    if (v.gp) {   // counting in: the ring's gaps, and the count
      gx4aGapRays(ctx, Math.round(e.x), Math.round(e.y + 4), v.gp, 0.66, f, 14);
      if (v.c) Font.drawCenter(ctx, String(v.c), Math.round(e.x), Math.round(e.y) + 13, (f >> 2) & 1 ? '#F8D848' : '#F8F8F8');
    }
    const shake = v.p ? 1 : 0;
    ctx.drawImage(GxGfx.get('gx4aSpeaker', v.p ? 1 : 0, e.flash > 0 ? 'f' : 'n'), Math.round(e.x - 9), Math.round(e.y - 10 - shake));
  },
  gx4aRing(ctx, e, f) { if (e.v) gx4aRingDraw(ctx, e.v, f); },
  gx4aFloorC(ctx, e, f) { gx4aFloorDraw(ctx, e.v, f); },
  gx4aMini(ctx, e, f) {
    ctx.globalAlpha = 0.25; ctx.fillStyle = '#F8F8F8'; ctx.beginPath(); ctx.arc(Math.round(e.x), Math.round(e.y), 9, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
    gx4aSpr(ctx, e, f, (f >> 2) & 1);
  },
});

// their shots (the red danger glow is drawn under each)
const gx4aStarPath = (ctx, x, y, R, rot) => { ctx.beginPath(); for (let i = 0; i < 10; i++) { const a = rot + i * Math.PI / 5, d = i % 2 ? R * 0.45 : R; ctx.lineTo(x + Math.cos(a) * d, y + Math.sin(a) * d); } ctx.closePath(); };
const GX4A_HEART = ['.XX.XX.', 'XXXXXXX', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...'];
const GX4A_NOTE = ['..XX', '..XX', '..X.', '..X.', 'XXX.', 'XXX.'];
function gx4aBits(ctx, rows, x, y, col, edge) {
  if (edge) { ctx.fillStyle = edge; rows.forEach((r, j) => [...r].forEach((ch, i) => { if (ch === 'X') ctx.fillRect(x + i - 1, y + j - 1, 3, 3); })); }
  ctx.fillStyle = col; rows.forEach((r, j) => [...r].forEach((ch, i) => { if (ch === 'X') ctx.fillRect(x + i, y + j, 1, 1); }));
}
Object.assign(GX_BULLET_DRAW, {
  gx4aStar(ctx, x, y, f, hot) {
    gx4aStarPath(ctx, x, y, 5, f / 8); ctx.fillStyle = hot; ctx.fill();
    gx4aStarPath(ctx, x, y, 3.6, f / 8); ctx.fillStyle = '#F8E840'; ctx.fill();
    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(x - 1, y - 1, 2, 2);
  },
  gx4aGlit(ctx, x, y, f, hot) {
    ctx.fillStyle = hot; ctx.fillRect(x - 3, y - 1, 7, 3); ctx.fillRect(x - 1, y - 3, 3, 7);
    ctx.fillStyle = GX4A_DISCO_COLS[((f >> 2) + x) % 6 | 0]; ctx.fillRect(x - 2, y, 5, 1); ctx.fillRect(x, y - 2, 1, 5);
    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(x, y, 1, 1);
  },
  gx4aBounce(ctx, x, y, f, hot) {
    ctx.fillStyle = hot; ctx.fillRect(x - 3, y - 3, 7, 7);
    ctx.fillStyle = GX4A_DISCO_COLS[((f >> 2) + (x >> 2)) % 6 | 0]; ctx.fillRect(x - 2, y - 2, 5, 5);
    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(x - 2, y - 2, 2, 2); if ((f >> 1) & 1) { ctx.fillRect(x + 3, y - 4, 1, 1); ctx.fillRect(x - 4, y + 3, 1, 1); }
  },
  gx4aSugar(ctx, x, y, f, hot) {
    ctx.fillStyle = hot; ctx.fillRect(x - 3, y - 3, 6, 7);
    ctx.fillStyle = '#F8A8D8'; ctx.fillRect(x - 2, y - 1, 4, 4); ctx.fillRect(x - 1, y - 3, 2, 2);
    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(x - 1, y - 1, 1, 1);
  },
  gx4aHeart(ctx, x, y, f, hot) { gx4aBits(ctx, GX4A_HEART, x - 3, y - 3, (f >> 2) & 1 ? '#F8589C' : '#F898C8', hot); ctx.fillStyle = '#FFFFFF'; ctx.fillRect(x - 2, y - 2, 1, 1); if ((f >> 3) & 1) { ctx.fillRect(x + 5, y - 5, 1, 1); ctx.fillRect(x - 6, y + 2, 1, 1); } },
  gx4aHeartS(ctx, x, y, f, hot) { ctx.fillStyle = hot; ctx.fillRect(x - 3, y - 2, 6, 5); ctx.fillStyle = '#F8589C'; ctx.fillRect(x - 2, y - 1, 2, 2); ctx.fillRect(x + 1 - 1, y - 1, 2, 2); ctx.fillRect(x - 1, y, 2, 2); },
  gx4aNote(ctx, x, y, f, hot) { gx4aBits(ctx, GX4A_NOTE, x - 2, y - 3, (f >> 3) & 1 ? '#58E8F8' : '#F858C0', hot); },
  gx4aLight(ctx, x, y, f, hot, b) {
    const v = Math.hypot(b.vx || 0, b.vy || 1) || 1, ux = (b.vx || 0) / v, uy = (b.vy || 1) / v;
    for (let k = -3; k <= 3; k++) { ctx.fillStyle = Math.abs(k) < 2 ? '#FFFFFF' : '#58E8F8'; ctx.fillRect(Math.round(x + ux * k) - 1, Math.round(y + uy * k) - 1, 2, 2); }
  },
});

// effects: a poof of candy, a burst of glitter, a rainbow ring (frames for this.fx)
const GX4A_FX = {};
function gx4aFxFrames(key, n, size, draw) {
  if (GX4A_FX[key]) return GX4A_FX[key];
  const out = [];
  for (let i = 0; i < n; i++) { const c = makeCanvas(size, size), x = c.getContext('2d'); draw(x, i / (n - 1), size / 2); out.push(c); }
  return (GX4A_FX[key] = out);
}
const gx4aPoof = () => gx4aFxFrames('poof', 6, 20, (c, k, h) => {
  for (let i = 0; i < 7; i++) { const a = i * 0.9, d = 3 + k * 6; c.fillStyle = i % 2 ? '#F8C8E8' : '#A8D8F8'; c.globalAlpha = 1 - k * 0.8; c.beginPath(); c.arc(h + Math.cos(a) * d, h + Math.sin(a) * d, 3.5 - k * 2.5, 0, Math.PI * 2); c.fill(); }
});
const gx4aGlitterFx = () => gx4aFxFrames('glit', 7, 28, (c, k, h) => {
  for (let i = 0; i < 12; i++) { const a = i * 0.52 + (i % 3) * 0.2, d = 2 + k * 12 * (0.6 + (i % 4) * 0.15); c.fillStyle = (i + Math.floor(k * 6)) % 3 ? GX4A_DISCO_COLS[i % 6] : '#FFFFFF'; c.fillRect(Math.round(h + Math.cos(a) * d), Math.round(h + Math.sin(a) * d), k < 0.6 ? 2 : 1, k < 0.6 ? 2 : 1); }
});
const gx4aRainbowFx = () => gx4aFxFrames('rainbow', 10, 64, (c, k, h) => {
  for (let i = 0; i < 6; i++) { c.strokeStyle = GX4A_RAINBOW_COLS[i]; c.lineWidth = 2; c.globalAlpha = 1 - k * 0.7; c.beginPath(); c.arc(h, h, 4 + k * 26 + i * 2, 0, Math.PI * 2); c.stroke(); }
  c.globalAlpha = 1; c.fillStyle = '#FFFFFF'; for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, d = 6 + k * 28; c.fillRect(Math.round(h + Math.cos(a) * d), Math.round(h + Math.sin(a) * d), 2, 2); }
});
const gx4aShardFx = () => gx4aFxFrames('shards', 12, 72, (c, k, h) => {
  const r = seeded(77);
  for (let i = 0; i < 26; i++) {
    const a = r() * Math.PI * 2, d = (6 + r() * 30) * k, s = 2 + Math.floor(r() * 3), x = h + Math.cos(a) * d, y = h + Math.sin(a) * d + k * k * 10;
    c.fillStyle = (i + Math.floor(k * 8)) % 4 === 0 ? '#FFFFFF' : i % 3 ? '#C8D0E0' : GX4A_DISCO_COLS[i % 6];
    c.globalAlpha = k > 0.75 ? (1 - k) * 4 : 1; c.fillRect(Math.round(x), Math.round(y), s, s);
  }
});

// ------------------------------------------------------------------ the bosses
// the unicorn's horn tip, where its beams come from
const gx4aHornTip = b => [b.x + (b.face < 0 ? -1 : 1) * 27, b.y + 2];
// the dash's line: its height at x
const gx4aRunY = (R, x) => R.y1 + (R.y2 - R.y1) * (R.d > 0 ? x / FW : 1 - x / FW);
// a box swept along a straight line: the outline of all it passes over (for the HORN CHARGE's warning)
function gx4aSweep(x0, y0, x1, y1, hw, hh) {
  const pts = [];
  for (const [cx, cy] of [[x0, y0], [x1, y1]]) for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) pts.push([cx + sx * hw, cy + sy * hh]);
  pts.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]), lo = [], up = [];
  for (const p of pts) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
  for (let i = pts.length - 1; i >= 0; i--) { const p = pts[i]; while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
  return lo.slice(0, -1).concat(up.slice(0, -1)).map(([x, y]) => [Math.round(x), Math.round(y)]);
}

const GX4A_BOSSES = [
  // COSMIC UNICORN: a white unicorn made of starlight, its mane and tail rainbows that ripple as it gallops, a golden
  // spiral horn, big sparkly eyes. Sweet as sugar and full of itself: BELIEVE IN MAGIC! SPARKLE SPARKLE! It gallops
  // across the screen leaving a solid rainbow, sweeps its horn's laser, charges horn-first, calls star-ponies, throws
  // stars; then hearts that hurt. In phase 3 the dream turns NIGHTMARE: dark as space, red eyes, a mane of fire,
  // rainbow beams in a fan, faster.
  { key: 'gx4aUni', name: 'COSMIC UNICORN', w: 64, h: 48, hp: 860, pts: 54000, move: 'sway',
    phases: [['gx4aDash', 'gx4aStars', 'gx4aHorn', 'gx4aPonies', 'gx4aCharge', 'gx4aStars'],
      ['gx4aDash', 'gx4aHorn', 'gx4aHearts', 'gx4aCharge', 'gx4aStars', 'gx4aPonies', 'gx4aHorn'],
      ['gx4aFan', 'gx4aDash', 'gx4aHearts', 'gx4aCharge', 'gx4aFan', 'gx4aPonies', 'gx4aHorn', 'gx4aStars']],
    init(b) { b.face = 1; b.leg = 0; b.lx = b.x; b.trails = []; b.run = null; b.horn = null; b.beam = null; b.fan = null; b.vis = 1; b.talkT = 360; this.gx4aTalk(b, 'BELIEVE IN MAGIC!', 120, 'gx4aNeigh'); },
    update(b, g, near, pl) {
      if (!b.say && --b.talkT <= 0) {
        this.gx4aTalk(b, b.ph >= 3 ? gx4aPick(['NO MORE MR NICE PONY!', 'SWEET DREAMS ARE OVER.', 'FEAR THE HORN!', 'MY RAINBOW, MY RULES!'])
          : gx4aPick(['SPARKLE SPARKLE!', 'NEIGH-SAYER!', 'CATCH ME IF YOU CAN!', 'MY RAINBOW, MY RULES!', 'GLITTER IN YOUR EYES!', 'YOU CANNOT CROSS A RAINBOW!']), 110, 'gx4aNeigh');
        b.talkT = 420 + rnd(300);
      }
      // its rainbows: solid while they last (blinking before they go)
      for (const tr of b.trails) {
        tr.t++;
        if (tr.done && --tr.left <= 0) continue;
        if (tr.t > 4 && Math.abs(tr.x1 - tr.x0) > 2) for (const t of pl) if (gx4aSegDist(t.x + 8, t.y + 9, tr.x0, tr.y0, tr.x1, tr.y1) < 5) this.hitPlayer(t);
      }
      b.trails = b.trails.filter(tr => !tr.done || tr.left > 0);
      // the horn's beam and the fan, while they're on
      this.gx4aUniBeams(b, pl);
      // moving: a dash, a charge, standing its ground for a beam, or prancing about the top
      const R = b.run, H = b.horn, sp = b.ph >= 3 ? 1.5 : 1;
      if (R) this.gx4aRun(b, R, near);
      else if (H && H.st !== 'aim') this.gx4aChargeMove(b, H);
      else if (b.beam || b.fan || H) { b.y += (14 - b.y) * 0.1; if (H && H.tx !== undefined) b.face = H.tx < b.x ? -1 : 1; }
      else {
        const tx = FW / 2 + Math.sin(b.t / (b.ph >= 3 ? 55 : 80)) * (FW / 2 - b.w / 2 - 6), ty = 16 + Math.sin(b.t / 31) * 4;
        b.x += gx4aClamp((tx - b.x) * 0.2, -2.2 * sp, 2.2 * sp); b.y += (ty - b.y) * 0.1;
      }
      const dx = b.x - (b.lx ?? b.x);
      if (Math.abs(dx) > 0.08 && !b.beam && !b.fan && !H && !(R && R.st !== 'go')) b.face = dx > 0 ? 1 : -1;
      b.leg = (b.leg || 0) + 0.07 + Math.min(0.25, Math.abs(dx) * 0.08) + (b.ph >= 3 ? 0.04 : 0);
      b.lx = b.x;
      return true;
    },
    onPhase(b, g, ph) {
      b.run = null; b.horn = null; b.beam = null; b.fan = null; b.vis = 1;
      for (const tr of b.trails) if (!tr.done) { tr.done = true; tr.left = 90; }
      if (ph === 2) this.gx4aTalk(b, 'YOU POPPED MY BUBBLE!', 120, 'gx4aNeigh');
      else { g.banner = { text: 'NIGHTMARE MODE!', t: 150, warn: true }; this.gx4aTalk(b, 'WELCOME TO THE NIGHTMARE!', 150, 'gx4aNightmare'); }
    },
    onKill(b, g) {
      g.banner = { text: 'THE MAGIC FADES...', t: 220 };
      for (let k = 0; k < 6; k++) this.fx.push({ x: b.x - 24 + rnd(48), y: b.y + 6 + rnd(b.h - 8), frames: gx4aRainbowFx(), per: 3, tick: -k * 7 });
      for (let k = 0; k < 8; k++) this.fx.push({ x: b.x - 30 + rnd(60), y: b.y + rnd(b.h), frames: gx4aGlitterFx(), per: 4, tick: -k * 5 });
      Sound.play('gx4aNeigh');
    },
    // f: legs 0-3, +4 facing left; 8: not there (between a dash's two places)
    frame: b => (b.vis === 0 ? 8 : (Math.floor(b.leg || 0) & 3) + (b.face < 0 ? 4 : 0)),
    drawUnder(ctx, b) { gx4aUniUnder.call(this, ctx, b); },
    drawOver(ctx, b) { gx4aUniOver.call(this, ctx, b); },
  },
  // THE MIRRORBALL: a mirrored sphere as big as a house hanging over the moon's dance floor on a chain, spinning,
  // swinging to the beat; facets glinting, colours sliding over them. A host who never stops: GET DOWN! FEEL THE
  // BEAT! Everything it does lands on the beat of its song: mirror lasers swaying, glitter bouncing, the BASS DROP,
  // the DANCE OFF, spotlights. In phase 3 it cracks open and little mirrorballs fly out.
  { key: 'gx4aBall', name: 'THE MIRRORBALL', w: 64, h: 60, hp: 900, pts: 56400, move: 'sway',
    phases: [['gx4aLasers', 'gx4aGlitter', 'gx4aBeatRing', 'gx4aDanceOff', 'gx4aSpot'],
      ['gx4aLasers', 'gx4aBassDrop', 'gx4aGlitter', 'gx4aDanceOff', 'gx4aSpot', 'gx4aBeatRing'],
      ['gx4aBassDrop', 'gx4aLasers', 'gx4aSplit', 'gx4aDanceOff', 'gx4aGlitter', 'gx4aSpot', 'gx4aBeatRing']],
    init(b) { b.lasers = null; b.drop = null; b.floor = null; b.spots = []; b.rings = []; b.beat = 0; b.bk = 0; b.hitB = false; b.talkT = 420; this.gx4aTalk(b, 'WELCOME TO THE MOON DISCO!', 130, 'gx4aMirror'); },
    update(b, g, near, pl) {
      const B = g.gx4aB || { n: 0, k: 0, hit: false };
      b.beat = B.n; b.bk = B.k; b.hitB = B.hit;
      if (!b.say && --b.talkT <= 0) { this.gx4aTalk(b, gx4aPick(['GET DOWN!', 'FEEL THE BEAT!', 'MIRROR, MIRROR, ON THE MOON...', "YOU'RE STEPPING ON MY LIGHTS!", 'NOBODY LEAVES THE DANCE FLOOR!', 'ONE MORE TIME, FROM THE TOP!']), 110, 'gx4aMirror'); b.talkT = 420 + rnd(300); }
      // it swings on its chain to the beat (still while its lasers are on), and bobs on every beat
      const pos = B.n + B.k, A = FW / 2 - b.w / 2 - 8;
      if (!b.lasers) b.x += gx4aClamp(FW / 2 + Math.sin(pos / (b.ph >= 3 ? 4 : 8) * Math.PI * 2) * A - b.x, -1.6, 1.6);
      b.y = 14 + Math.round(3 * Math.pow(1 - B.k, 3));
      // its lasers, rings, spots and the floor
      const L = b.lasers;
      if (L) {
        L.ang = L.a0 + L.A * Math.sin((pos - L.b0) / 8 * Math.PI * 2) * L.dir;
        if (L.st === 1) for (const t of pl) for (let i = 0; i < L.n; i++) if (gx4aRayHit(t.x + 8, t.y + 9, b.x, b.y + 33, L.ang + i * Math.PI * 2 / L.n, 4, 28)) { this.hitPlayer(t); break; }
      }
      for (const R of b.rings) { R.sp = 2.3 * Math.min(1.3, 0.85 + g.shotSpd * 0.2); gx4aRingStep(this, R); }
      b.rings = b.rings.filter(R => R.r < 340);
      for (const S of b.spots) gx4aSpotChase(this, S, b.ph >= 3 ? 1.0 : 0.8);
      if (b.floor) gx4aFloorZap(this, b.floor);
      return true;
    },
    onPhase(b, g, ph) {
      b.lasers = null; b.drop = null; b.floor = null; b.spots = [];
      if (ph === 2) this.gx4aTalk(b, "OOH, YOU'VE GOT MOVES. SO HAVE I!", 130, 'gx4aMirror');
      else { g.banner = { text: 'MIRRORBALL SPLIT!', t: 140, warn: true }; this.gx4aTalk(b, 'SHATTERED... BUT STILL SHINING!', 140, 'gx4aShatter'); this.gx4aMinis(b, 4); }
    },
    onKill(b, g) {
      g.banner = { text: 'THE PARTY IS OVER!', t: 220 };
      for (let k = 0; k < 4; k++) this.fx.push({ x: b.x - 12 + rnd(24), y: b.y + 20 + rnd(20), frames: gx4aShardFx(), per: 4, tick: -k * 9 });
      for (let k = 0; k < 8; k++) this.fx.push({ x: b.x - 30 + rnd(60), y: b.y + rnd(b.h), frames: gx4aGlitterFx(), per: 4, tick: -k * 6 });
      Sound.play('gx4aShatter');
    },
    frame: (b, fr) => (fr >> 2) & 7,
    drawUnder(ctx, b) { gx4aBallUnder.call(this, ctx, b); },
    drawOver(ctx, b) { gx4aBallOver.call(this, ctx, b); },
  },
];
{
  const at = GX_BOSSES.findIndex(d => d.key === 'cats');
  GX_BOSSES.splice(at < 0 ? GX_BOSSES.length : at, 0, ...GX4A_BOSSES);
}

Object.assign(Stage.prototype, {
  // a new dash: across the screen at your height (on a slant from phase 2), from one side or the other
  gx4aNewRun(b, near, n) {
    const lo = Math.round(FH * 0.47), hi = FH - 22, py = near ? near.y + 9 : FH * 0.7;
    const y1 = gx4aClamp(py + rnd(17) - 8, lo, hi), y2 = b.ph >= 2 ? gx4aClamp(y1 + (rnd(2) ? 1 : -1) * (30 + rnd(30)), lo, hi) : y1;
    const d = near ? (near.x + 8 < FW / 2 ? 1 : -1) * (rnd(3) ? 1 : -1) : (rnd(2) ? 1 : -1);
    return { st: 'tele', t: 0, d, y1, y2, n, warn: b.ph >= 3 ? 48 : b.ph >= 2 ? 54 : 62, v: [3.0, 3.4, 3.9][b.ph - 1], tr: null };
  },
  gx4aRun(b, R, near) {
    R.t++;
    if (R.st === 'tele') { b.y += (12 - b.y) * 0.1; b.face = R.d; if (R.t >= R.warn) { R.st = 'out'; R.t = 0; Sound.play('gx4aSparkle'); this.addFx(b.x, b.y + b.h / 2, gx4aGlitterFx(), 3); } return; }
    if (R.st === 'out') {
      b.vis = 0;
      if (R.t >= 12) {
        R.st = 'in'; R.t = 0;
        b.x = R.d > 0 ? b.w / 2 + 2 : FW - b.w / 2 - 2; b.y = gx4aRunY(R, b.x) - b.h / 2; b.face = R.d;
        const x0 = R.d > 0 ? 0 : FW;
        R.tr = { x0, y0: gx4aRunY(R, x0), x1: x0, y1: gx4aRunY(R, x0), t: 0, done: false, left: 0 };
        b.trails.push(R.tr);
        this.addFx(b.x, b.y + b.h / 2, gx4aGlitterFx(), 3);
      }
      return;
    }
    if (R.st === 'in') { b.vis = (R.t >> 1) & 1; if (R.t >= 12) { R.st = 'go'; R.t = 0; b.vis = 1; Sound.play('gx4aNeigh'); } return; }
    if (R.st === 'go') {
      b.vis = 1;
      b.x += R.d * R.v; b.y = gx4aRunY(R, b.x) - b.h / 2;
      const tail = b.x - R.d * (b.w / 2 - 6);
      R.tr.x1 = tail; R.tr.y1 = gx4aRunY(R, tail);
      if (R.t % 9 === 0) Sound.play('gx4aGallop');
      if ((R.d > 0 && b.x >= FW - b.w / 2 - 2) || (R.d < 0 && b.x <= b.w / 2 + 2)) {
        R.st = 'up'; R.t = 0; R.tr.x1 = R.d > 0 ? FW : 0; R.tr.y1 = gx4aRunY(R, R.tr.x1); R.tr.done = true; R.tr.left = 170; R.sx = b.x; R.sy = b.y;
      }
      return;
    }
    // up again in a leap, back to the top
    const k = Math.min(1, R.t / 45);
    b.x = R.sx + (FW / 2 - R.sx) * k * 0.5; b.y = R.sy + (14 - R.sy) * (1 - (1 - k) * (1 - k));
    if (k >= 1) b.run = R.n > 1 ? this.gx4aNewRun(b, near, R.n - 1) : null;
  },
  // the horn charge: along the line it showed, then back up
  gx4aChargeMove(b, H) {
    H.t++;
    if (H.st === 'go') {
      const cx = b.x, cy = b.y + b.h / 2, dx = H.ex - cx, dy = H.ey - cy, d = Math.hypot(dx, dy), v = b.ph >= 3 ? 6.5 : 5.5;
      if (H.t % 8 === 0) Sound.play('gx4aGallop');
      if (d <= v) { b.x = H.ex; b.y = H.ey - b.h / 2; H.st = 'back'; H.t = 0; H.sx = b.x; H.sy = b.y; if (typeof gxShake === 'function') gxShake(this.galaxy, 6, 2); }
      else { b.x += dx / d * v; b.y += dy / d * v; }
      return;
    }
    const k = Math.min(1, H.t / 50);
    b.x = H.sx + (FW / 2 - H.sx) * k * 0.4; b.y = H.sy + (14 - H.sy) * (1 - (1 - k) * (1 - k));
    if (k >= 1) b.horn = null;
  },
  // the horn's laser sweeping, and the nightmare's fan of beams: they hurt while they're on
  gx4aUniBeams(b, pl) {
    const [hx, hy] = gx4aHornTip(b), Bm = b.beam, F = b.fan;
    if (Bm && Bm.st === 1) for (const t of pl) if (gx4aRayHit(t.x + 8, t.y + 9, hx, hy, Bm.a, 4.5, 6)) this.hitPlayer(t);
    if (F && (F.st === 1 || F.st === 3)) for (const t of pl) for (let i = 0; i < F.n; i++) if (gx4aRayHit(t.x + 8, t.y + 9, hx, hy, F.base + (i - (F.n - 1) / 2) * F.sp + F.off, 4, 6)) { this.hitPlayer(t); break; }
  },
  // the mirrorball's little ones
  gx4aMinis(b, n) {
    const have = this.galaxy.list.filter(e => e.type === 'gx4aMini').length;
    for (let i = 0; i < Math.min(n, 4 - have); i++) {
      const a = i * Math.PI / 2 + Math.PI / 4, e = this.gxSpawn({ type: 'gx4aMini', st: 'gx4aMiniM', k: i, vx: Math.cos(a) * 1.1, vy: Math.sin(a) * 0.9 });
      e.x = b.x; e.y = b.y + 33;
    }
    this.addFx(b.x, b.y + 40, gx4aShardFx(), 3);
    Sound.play('gx4aShatter');
  },
});

Object.assign(GX_BOSS_ACTS, {
  // ---- COSMIC UNICORN
  // RAINBOW DASH: its path and the band it sweeps are shown; it vanishes, comes in at the side, gallops across and
  // leaves a solid rainbow behind (two dashes in phase 3, the second at your new height)
  gx4aDash(b, a, c) {
    if (a.t === 1) { b.run = this.gx4aNewRun(b, c.near, b.ph >= 3 ? 2 : 1); this.gx4aTalk(b, gx4aPick(['RAINBOW DASH!', 'MIND THE RAINBOW!', 'GIDDY-UP!']), 70, 'gx4aNeigh'); }
    if (!b.run || a.t > 900) { b.run = null; b.vis = 1; c.done(50); }
  },
  // its horn's laser: the arc it'll sweep shown, then it sweeps it (and back again from phase 2)
  gx4aHorn(b, a, c) {
    if (a.t === 1) {
      const s = c.near ? (c.near.x + 8 < b.x ? -1 : 1) : (rnd(2) ? 1 : -1);
      b.face = s;
      b.beam = { st: 0, t: 0, s, a0: Math.PI / 2 + s * 0.12, a1: Math.PI / 2 - s * 1.42, a: Math.PI / 2 + s * 0.12, back: b.ph >= 2 ? 1 : 0 };
      this.gx4aTalk(b, 'HORN BEAM!', 70, 'gx4aSparkle');
    }
    const B = b.beam;
    if (!B) { c.done(40); return; }
    B.t++;
    if (B.st === 0) { if (B.t >= 44) { B.st = 1; B.t = 0; Sound.play('gx4aBeam'); } return; }
    const T = 56, k = Math.min(1, B.t / T), e = k * k * (3 - 2 * k);
    if (B.t <= T) B.a = B.a0 + (B.a1 - B.a0) * e;
    else if (B.back && B.t <= 2 * T) { const k2 = (B.t - T) / T, e2 = k2 * k2 * (3 - 2 * k2); B.a = B.a1 + (B.a0 - B.a1) * e2; }
    else { b.beam = null; c.done(50); }
  },
  // HORN CHARGE: a sparkle line to you (it follows you, then holds), the sweep of its body shown; then it charges
  gx4aCharge(b, a, c) {
    if (a.t === 1) { b.horn = { st: 'aim', t: 0 }; this.gx4aTalk(b, 'HORN CHARGE!', 70, 'gx4aNeigh'); Sound.play('gx4aArm'); }
    const H = b.horn;
    if (!H) { c.done(50); return; }
    if (H.st === 'aim') {
      H.t++;
      if (H.t < 32 && c.near) { H.tx = gx4aClamp(c.near.x + 8, 6, FW - 6); H.ty = c.near.y + 9; }
      if (H.tx === undefined) { H.tx = b.x; H.ty = FH * 0.75; }
      b.face = H.tx < b.x ? -1 : 1;
      if (H.t === 32) {   // locked: where its body will go
        const [hx, hy] = gx4aHornTip(b), ox = hx - b.x, oy = hy - (b.y + b.h / 2), sx = b.x, sy = b.y + b.h / 2;
        let ex = H.tx - ox, ey = H.ty - oy;
        const dx = ex - sx, dy = ey - sy, d = Math.hypot(dx, dy) || 1;
        ex += dx / d * 30; ey += dy / d * 30;
        H.ex = gx4aClamp(ex, b.w / 2 + 2, FW - b.w / 2 - 2); H.ey = gx4aClamp(ey, b.h / 2 + 10, FH - b.h / 2 + 6);
        H.sx0 = sx; H.sy0 = sy; H.poly = gx4aSweep(sx, sy, H.ex, H.ey, b.w / 2 + 4, b.h / 2 + 2);
        Sound.play('gx4aArm');
      }
      if (H.t >= 56) { H.st = 'go'; H.t = 0; Sound.play('gx4aDash'); }
      return;
    }
    if (a.t > 600) { b.horn = null; c.done(40); }
  },
  // star-ponies out of the boss, galloping off in leaps
  gx4aPonies(b, a, c) {
    if (c.g.list.length < 12) for (let i = 0; i < 3; i++) { const e = this.gxSpawn({ type: 'gx4aPony', st: 'gx4aGallop', dirX: i % 2 ? -1 : 1, base: 30 + i * 12, ph0: i * 13 }); e.x = b.x + (i - 1) * 16; e.y = b.y + b.h / 2; }
    this.gx4aTalk(b, 'COME, MY LITTLE PONIES!', 80, 'gx4aNeigh');
    Sound.play('teleport'); c.done(60);
  },
  // stars from its horn: three fans of five at you
  gx4aStars(b, a, c) {
    const [hx, hy] = gx4aHornTip(b);
    if (a.t === 1 || a.t === 14 || a.t === 27) { const base = c.toward(hx, hy); for (let i = 0; i < 5; i++) c.shoot(hx, hy, base + (i - 2) * 0.22, 1.45, 'gx4aStar'); Sound.play('gx4aSparkle'); }
    if (a.t >= 36) c.done(60);
  },
  // sparkly hearts: they drift down, wobbling, and burst
  gx4aHearts(b, a, c) {
    const [hx, hy] = gx4aHornTip(b), n = b.ph >= 3 ? 6 : 4;
    for (let i = 0; i < n; i++) c.g.bullets.push({ x: hx, y: hy + 4, vx: (i - (n - 1) / 2) * 0.55, vy: 0.45 + Math.random() * 0.3, k: 'gx4aHeart', pop: Math.round(FH * 0.42) + rnd(Math.round(FH * 0.28)), wob: rnd(10) });
    this.gx4aTalk(b, b.ph >= 3 ? 'HEARTS FOR YOU. THEY HURT.' : 'I LOVE YOU! CATCH!', 90, 'gx4aHeart');
    c.done(70);
  },
  // NIGHTMARE: rainbow beams in a fan from its horn (you're on the middle one), then a second fan in the gaps
  gx4aFan(b, a, c) {
    if (a.t === 1) { const [hx, hy] = gx4aHornTip(b); b.fan = { st: 0, t: 0, base: c.toward(hx, hy), n: 5, sp: 0.36, off: 0 }; Sound.play('gx4aArm'); }
    const F = b.fan;
    if (!F) { c.done(40); return; }
    F.t++;
    if ((F.st === 0 && F.t >= 40) || (F.st === 2 && F.t >= 30)) { F.st++; F.t = 0; Sound.play('gx4aBeam'); }
    else if (F.st === 1 && F.t >= 24) { F.st = 2; F.t = 0; F.off = F.sp / 2; }
    else if (F.st === 3 && F.t >= 24) { b.fan = null; c.done(60); }
  },

  // ---- THE MIRRORBALL (everything on the beat)
  // mirror lasers: beams reflected out of it, swaying to the beat (two bars a sway); two beats of warning, eight on
  gx4aLasers(b, a, c) {
    const B = c.g.gx4aB || { n: 0, k: 0 };
    if (a.t === 1) { b.lasers = { n: [3, 4, 5][b.ph - 1], st: 0, bt: 0, a0: Math.random() * Math.PI * 2, A: b.ph >= 3 ? 0.42 : 0.5, dir: rnd(2) ? 1 : -1, b0: B.n + B.k, ang: 0 }; this.gx4aTalk(b, 'MIRROR LASERS!', 70, 'gx4aMirror'); }
    const L = b.lasers;
    if (!L) { c.done(40); return; }
    if (b.hitB) { L.bt++; if (L.st === 0 && L.bt >= 2) { L.st = 1; Sound.play('gx4aBeam'); } else if (L.st === 1 && L.bt >= 10) { b.lasers = null; c.done(50); return; } }
    if (a.t > 1200) { b.lasers = null; c.done(40); }
  },
  // glitter thrown up on every beat for four beats: it falls and bounces off the floor
  gx4aGlitter(b, a, c) {
    if (b.hitB) {
      a.n = (a.n || 0) + 1;
      if (a.n <= 4) { for (let k = 0; k < (b.ph >= 2 ? 4 : 3); k++) c.g.bullets.push({ x: b.x + rnd(17) - 8, y: b.y + b.h - 8, vx: (Math.random() - 0.5) * 3.2, vy: -0.7 - Math.random() * 1.1, k: 'gx4aBounce', gr: 0.045, bn: b.ph >= 3 ? 2 : 1 }); Sound.play('gx4aSparkle'); }
      else { c.done(40); return; }
    }
    if (a.t > 600) c.done(40);
  },
  // a ring of notes on each of four beats, every other one turned half a step
  gx4aBeatRing(b, a, c) {
    if (b.hitB) {
      a.n = (a.n || 0) + 1;
      if (a.n > 4) { c.done(50); return; }
      const n = 8 + 2 * b.ph;
      for (let i = 0; i < n; i++) c.shoot(b.x, b.y + 33, i * Math.PI * 2 / n + (a.n % 2) * Math.PI / n, 0.95, 'gx4aNote');
      Sound.play('gx4aTick');
    }
    if (a.t > 600) c.done(40);
  },
  // BASS DROP: it counts in (3, 2, 1: the ring's gaps shown), then the drop: a shockwave ring; twice in phase 3
  gx4aBassDrop(b, a, c) {
    if (a.t === 1) {
      const down = Math.PI / 2 + (Math.random() - 0.5) * 1.4;
      b.drop = { k: 4, n: b.ph >= 3 ? 2 : 1, gp: [down, down + Math.PI * (0.65 + Math.random() * 0.7)], gw: 0.66 };
      this.gx4aTalk(b, 'THE BEAT IS ABOUT TO DROP...', 90, 'gx4aRiser');
      Sound.play('gx4aRiser');
    }
    const D = b.drop;
    if (!D) { c.done(40); return; }
    if (b.hitB) {
      if (--D.k > 0) { Sound.play('gx4aTick'); return; }
      b.rings.push({ x: b.x, y: b.y + 33, r: 28, gp: D.gp.slice(), gw: D.gw, sp: 2.3 });
      Sound.play('gx4aDrop'); if (typeof gxShake === 'function') gxShake(c.g, 12, 3);
      this.gxSay(b, 'DROP!', 40);
      if (--D.n > 0) { D.k = 1; D.gp = D.gp.map(x => x + (rnd(2) ? 0.5 : -0.5)); } else { b.drop = null; c.done(60); }
    }
    if (a.t > 900) { b.drop = null; c.done(40); }
  },
  // DANCE OFF: the floor lights in patterns; stand on the dark tiles when the fourth beat zaps
  gx4aDanceOff(b, a, c) {
    if (a.t === 1) { b.floor = { p: rnd(11), s: -1, z: 0, n: 0, seed: rnd(99), max: b.ph >= 2 ? 3 : 2 }; c.g.banner = { text: 'DANCE OFF!', t: 90, warn: true }; this.gx4aTalk(b, 'DANCE OFF! STAND ON THE DARK TILES!', 110, 'gx4aMirror'); }
    const F = b.floor;
    if (!F) { c.done(40); return; }
    if (b.hitB) { if (F.s === 3 && F.n + 1 >= F.max) { b.floor = null; c.done(50); return; } gx4aFloorBeat(F); }
    if (a.t > 1200) { b.floor = null; c.done(40); }
  },
  // spotlights: they chase you; two beats chasing, one locked, one zapping (two of them from phase 2, out of step)
  gx4aSpot(b, a, c) {
    if (a.t === 1) { b.spots = []; for (let k = 0; k < (b.ph >= 2 ? 2 : 1); k++) b.spots.push({ x: b.x + (k ? 20 : -20), y: FH * 0.5, s: 0, z: 0, cb: k * 2 }); a.n = 0; this.gx4aTalk(b, "YOU'RE IN THE SPOTLIGHT!", 80, 'gx4aSpot'); }
    if (b.hitB) { a.n++; for (const S of b.spots) gx4aSpotBeat(S); if (a.n >= 10) { b.spots = []; c.done(50); return; } }
    if (a.t > 900) { b.spots = []; c.done(40); }
  },
  // phase 3: little mirrorballs out of it again, if there are fewer than two
  gx4aSplit(b, a, c) {
    if (c.g.list.filter(e => e.type === 'gx4aMini').length < 2) { this.gx4aMinis(b, 4); this.gx4aTalk(b, 'MINI ME! MINI ME!', 80, 'gx4aMirror'); }
    c.done(50);
  },
});

// ------------------------------------------------------------------ their pictures
Object.assign(GX_BOSS_PALS, {
  gx4aUni: [null, '#FCF4FF', '#E0D0F0', '#A890C8', '#FFFFFF', '#F8D860', '#C89020', '#1C0C2C', '#F83850', '#F8A030', '#F8E840', '#58D868', '#48A8F8', '#A060F0', '#3C78F8', '#F898C8',
    '#3C2C60', '#281A44', '#140A26', '#F83800', '#F88800', '#F8D800', '#F80000', '#7C2CB8', '#383070', '#1C6C3C', '#8C1028', '#A0501C', '#A08C1C'],
  gx4aBall: [null, '#F8F8F8', '#C8D0E0', '#8890A8', '#FFFFFF', '#585C78', '#30304A', '#100818', '#F878C8', '#58E8F8', '#F8E858', '#A878F8', '#B8B8C0', '#606070', '#F83800'],
});
// the unicorn, side on, facing right (f: legs 0-3, +4 facing left, 8: an empty picture)
const GX4A_LEGS = [
  { fr: [[44, 36], [49, 40]], hi: [[14, 36], [9, 41]] },
  { fr: [[42, 38], [40, 44]], hi: [[19, 38], [16, 44]] },
  { fr: [[39, 39], [35, 44]], hi: [[25, 38], [28, 44]] },
  { fr: [[44, 37], [46, 44]], hi: [[17, 38], [12, 43]] },
];
GX_BOSS_DRAW.gx4aUni = function (f, ph) {
  const P = bossPainter(64, 48);
  if (f >= 8) return P.g;
  const leg = f & 3, wv = leg * Math.PI / 2;
  // the legs: the far pair first (darker), then the near pair
  const drawLeg = (hip, L, far) => {
    const [[kx, ky], [fx, fy]] = L, c1 = far ? 3 : 2, c2 = far ? 3 : 1;
    P.line(hip[0], hip[1], kx, ky, c1); P.line(hip[0] + 1, hip[1], kx + 1, ky, far ? 3 : 2); P.line(hip[0] - 1, hip[1], kx - 1, ky, c1);
    P.line(kx, ky, fx, fy, c2); P.line(kx + 1, ky, fx + 1, fy, far ? 3 : 2);
    P.rect(fx - 1, fy, fx + 1, fy + 1, far ? 6 : 5);
  };
  const farL = GX4A_LEGS[(leg + 2) & 3], nearL = GX4A_LEGS[leg];
  drawLeg([38, 30], farL.fr.map(([x, y]) => [x - 3, y]), true); drawLeg([21, 30], farL.hi.map(([x, y]) => [x - 3, y]), true);
  // the tail: six strands from the rump, rippling
  for (let i = 0; i < 6; i++) for (let x = 1; x <= 17; x++) {
    const t = (17 - x) / 16, y = 19 + i * (1.1 + t * 0.9) + Math.sin(x / 2.6 + wv + i * 0.35) * 2.2 * t + t * t * 7;
    P.px(x, Math.round(y), 8 + i); P.px(x, Math.round(y) + 1, 8 + i);
  }
  // the body, the neck, the head
  gxBall(P, 30, 25, 15, 9, [4, 1, 2, 3, 3]);
  for (let k = 0; k <= 12; k++) { const t = k / 12, x = 41 + t * 9, y = 24 - t * 14, r = 5.6 - t * 1.6; P.disc(x, y, r, 2); P.disc(x - 0.9, y - 0.9, r - 1.2, 1); }
  gxBall(P, 52, 9, 6.5, 4.6, [4, 1, 2, 3, 3]);
  gxBall(P, 57.5, 11.5, 4.2, 3.2, [0, 1, 2, 3, 3]);
  P.px(60, 11, 3); P.px(59, 14, 3); P.px(58, 14, 3);
  P.line(49, 5, 50, 1, 2); P.line(50, 5, 51, 2, 1); P.px(50, 0, 1);   // an ear
  // the horn: a golden spiral
  for (let k = 0; k <= 8; k++) { const x = 52 + k, y = Math.round(4 - k * 0.5); P.px(x, y, k % 2 ? 6 : 5); if (k < 6) P.px(x, y + 1, k % 2 ? 5 : 6); }
  P.px(60, 0, 4);
  // a big sparkly eye, lashes, a blush
  P.rect(52, 7, 54, 9, 4); P.rect(53, 8, 54, 9, 14); P.px(53, 8, 4); P.line(51, 6, 55, 6, 7); P.px(56, 5, 7); P.px(52, 10, 7);
  P.px(55, 11, 15); P.px(56, 11, 15);
  // the near legs over the body
  drawLeg([38, 30], nearL.fr, false); drawLeg([21, 30], nearL.hi, false);
  // the mane: six strands from the neck, flowing back
  for (let i = 0; i < 6; i++) {
    const ax = 49 - i * 1.8, ay = 4 + i * 2.6;
    for (let s = 0; s <= 10; s++) { const x = ax - s * 1.15, y = ay + s * 0.55 + Math.sin(s / 2.4 + wv + i) * 1.3; P.px(x, y, 8 + i); P.px(x, y + 1, 8 + i); }
  }
  P.px(50, 4, 8); P.px(51, 4, 9); P.px(51, 5, 10);   // a forelock
  // stars on its flank
  for (const [x, y, n] of [[26, 22, 2], [34, 27, 1]]) { P.line(x - n, y, x + n, y, 15); P.line(x, y - n, x, y + n, 15); P.px(x, y, 4); }
  P.px(40, 20, 4); P.px(19, 21, 4);
  gxScars(P, ph, 41, 3, 10, leg & 1, (x, y) => x > 18 && x < 46 && y > 17 && y < 33);
  P.outline();
  if (ph >= 3) {   // NIGHTMARE: dark as space, a mane of fire, the tail a dark rainbow, red eyes
    const M = { 1: 16, 2: 17, 3: 18, 15: 19, 14: 22, 5: 21, 6: 19 }, mane = { 8: 19, 9: 20, 10: 21, 11: 20, 12: 19, 13: 21 }, tail = { 8: 26, 9: 27, 10: 28, 11: 25, 12: 24, 13: 23 };
    for (let y = 0; y < 48; y++) for (let x = 0; x < 64; x++) { const v = P.g[y][x]; if (v >= 8 && v <= 13) P.g[y][x] = (x < 18 ? tail : mane)[v]; else if (M[v]) P.g[y][x] = M[v]; }
  }
  if (f & 4) for (const row of P.g) row.reverse();
  return P.g;
};
// the mirrorball: facets on a sphere, lit from the top left, turning (8 frames: two facets' turn); coloured
// reflections slide over it; cracks in phase 2, a hole broken out of its bottom in phase 3
function gx4aBallGrid(f, ph, W, H, R) {
  const P = bossPainter(W, H), cx = W / 2, cy = H - R - 1.5, spin = (f & 7) * Math.PI / 40, cols = Math.PI / 10, rows = Math.PI / 14;
  const lx = -0.5, ly = -0.6, lz = 0.62;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const dx = x + 0.5 - cx, dy = y + 0.5 - cy, d2 = dx * dx + dy * dy;
    if (d2 > R * R) continue;
    const z = Math.sqrt(R * R - d2), lat = Math.asin(Math.max(-1, Math.min(1, dy / R))), lon = Math.atan2(dx, z) + spin;
    const col = Math.floor(lon / cols), row = Math.floor((lat + Math.PI / 2) / rows);
    const fu = lon / cols - col, fv = (lat + Math.PI / 2) / rows - row;
    if (fu < 0.13 || fv < 0.15) { P.px(x, y, 6); continue; }
    const lc = (col + 0.5) * cols - spin, la = (row + 0.5) * rows - Math.PI / 2;
    const nx = Math.sin(lc) * Math.cos(la), ny = Math.sin(la), nz = Math.cos(lc) * Math.cos(la);
    const l = nx * lx + ny * ly + nz * lz + ((col + row) & 1 ? 0.13 : -0.13) + ((row % 3) - 1) * 0.07;
    let c = l > 0.92 ? 4 : l > 0.62 ? 1 : l > 0.3 ? 2 : l > 0.0 ? 3 : 5;
    const tint = (row * 3 + (col & 1) * 5) % 11;
    if (c === 2 && tint < 3) c = [8, 9, 10][tint];
    else if (c === 3 && tint === 6) c = 11;
    P.px(x, y, c);
  }
  // the cap and its ring
  const top = Math.round(cy - R);
  P.rect(cx - 5, top - 2, cx + 4, top + 1, 12); P.rect(cx - 5, top - 2, cx + 4, top - 2, 4); P.rect(cx - 5, top + 1, cx + 4, top + 1, 13);
  P.rect(cx - 2, top - 5, cx + 1, top - 3, 13); P.px(cx - 1, top - 5, 12);
  gxScars(P, ph, 52, 3, 14, f & 1, (x, y) => y > top + 3);
  if (ph >= 3) {   // the bottom broken out: jagged, something glowing inside
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const dx = x + 0.5 - cx, dy = y + 0.5 - cy, edge = R * 0.45 + Math.sin(x * 1.7) * 2 + Math.sin(x * 0.6 + 1) * 2;
      if (dy > edge && dx * dx + dy * dy <= R * R) P.px(x, y, dy > edge + 2 ? 0 : (x + f) % 3 ? 7 : 14);
    }
  }
  P.outline();
  return P.g;
}
GX_BOSS_DRAW.gx4aBall = (f, ph) => gx4aBallGrid(f, ph, 64, 60, 25.5);
GX_BOSS_DRAW.gx4aBallS = (f, ph) => gx4aBallGrid(f, ph, 40, 40, 16.5);   // a smaller one, for its pictures
GX_BOSS_PALS.gx4aBallS = GX_BOSS_PALS.gx4aBall;

// THE COSMIC UNICORN, under its picture: its rainbows (and the dash to come); over it: beams, the charge's line, fire
function gx4aUniUnder(ctx, b) {
  const f = this.frame;
  for (const tr of b.trails || []) {
    if (tr.done && tr.left < 50 && (f >> 2) & 1) continue;   // about to go: it blinks
    const L = Math.hypot(tr.x1 - tr.x0, tr.y1 - tr.y0);
    if (L < 1) continue;
    ctx.save(); ctx.translate(tr.x0, tr.y0); ctx.rotate(Math.atan2(tr.y1 - tr.y0, tr.x1 - tr.x0));
    ctx.fillStyle = 'rgba(248,56,0,0.35)'; ctx.fillRect(0, -8, L, 16);
    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, -6, L, 1); ctx.fillRect(0, 5, L, 1);
    for (let i = 0; i < 6; i++) { ctx.fillStyle = GX4A_RAINBOW_COLS[i]; ctx.fillRect(0, -5 + i * 1.7, L, 2); }
    ctx.fillStyle = '#FFFFFF'; for (let k = 0; k < L; k += 9) ctx.fillRect(Math.round(k + (f * 2 + k * 3) % 9), (k / 9) & 1 ? -6 : 5, 1, 1);
    ctx.restore();
  }
  const R = b.run;
  if (R && R.st === 'tele') {   // the dash to come: its line, and the band its body sweeps (blinking)
    const hh = b.h / 2 + 2;
    ctx.globalAlpha = (R.t >> 2) & 1 ? 0.2 : 0.08; ctx.fillStyle = '#F83800';
    ctx.beginPath(); ctx.moveTo(0, gx4aRunY(R, 0) - hh); ctx.lineTo(FW, gx4aRunY(R, FW) - hh); ctx.lineTo(FW, gx4aRunY(R, FW) + hh); ctx.lineTo(0, gx4aRunY(R, 0) + hh); ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 1;
    for (let x = 0; x < FW; x += 4) { const y = Math.round(gx4aRunY(R, x)); ctx.fillStyle = GX4A_RAINBOW_COLS[((x >> 2) + (f >> 1)) % 6]; ctx.fillRect(x, y - 1, 2, 2); ctx.fillStyle = '#F83800'; ctx.fillRect(x, Math.round(y - hh), 2, 1); ctx.fillRect(x, Math.round(y + hh), 2, 1); }
    const ax = R.d > 0 ? 2 : FW - 14, ay = Math.round(gx4aRunY(R, R.d > 0 ? 8 : FW - 8));
    ctx.fillStyle = '#F8D848'; ctx.fillRect(ax, ay - 5, 12, 10); Font.draw(ctx, R.d > 0 ? '>' : '<', ax + 2, ay - 4, '#100808');
  }
}
function gx4aUniOver(ctx, b) {
  const f = this.frame, [hx, hy] = gx4aHornTip(b);
  const beam = (a, on, w) => {
    const L = 340, ex = hx + Math.cos(a) * L, ey = hy + Math.sin(a) * L;
    ctx.save(); ctx.lineCap = 'round';
    if (!on) { ctx.strokeStyle = (f >> 2) & 1 ? '#F8F8F8' : '#F8A0D0'; ctx.lineWidth = 1; ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(ex, ey); ctx.stroke(); ctx.restore(); return; }
    ctx.strokeStyle = 'rgba(248,56,0,0.35)'; ctx.lineWidth = w + 6; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(ex, ey); ctx.stroke();
    const cols = b.ph >= 3 ? ['#7C2CB8', '#F83800', '#F88800', '#F8D800'] : GX4A_RAINBOW_COLS;
    cols.forEach((col, i) => { ctx.strokeStyle = col; ctx.lineWidth = Math.max(1, w * (1 - i / cols.length)); ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(ex, ey); ctx.stroke(); });
    ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(ex, ey); ctx.stroke();
    ctx.restore();
  };
  const B = b.beam;
  if (B) {
    if (B.st === 0) {   // the arc it'll sweep: its edges, and a faint fan between them
      if ((B.t >> 2) & 1) { ctx.globalAlpha = 0.12; ctx.fillStyle = '#F83800'; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.arc(hx, hy, 320, Math.min(B.a0, B.a1), Math.max(B.a0, B.a1)); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1; }
      beam(B.a0, false); beam(B.a1, false);
    } else beam(B.a, true, 7);
  }
  const F = b.fan;
  if (F) for (let i = 0; i < F.n; i++) beam(F.base + (i - (F.n - 1) / 2) * F.sp + F.off, F.st === 1 || F.st === 3, 6);
  const H = b.horn;
  if (H && H.st === 'aim' && H.tx !== undefined) {
    if (H.poly && (H.t >> 2) & 1) { ctx.globalAlpha = 0.16; ctx.fillStyle = '#F83800'; ctx.beginPath(); H.poly.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1; ctx.strokeStyle = '#F83800'; ctx.lineWidth = 1; ctx.stroke(); }
    const dx = H.tx - hx, dy = H.ty - hy, d = Math.hypot(dx, dy) || 1;
    for (let k = 4; k < d + 30; k += 5) { ctx.fillStyle = (k + f) % 10 < 5 ? '#F8F8F8' : GX4A_RAINBOW_COLS[(k >> 2) % 6]; ctx.fillRect(Math.round(hx + dx / d * k), Math.round(hy + dy / d * k), 2, 2); }
    if (H.t >= 32 && (f >> 1) & 1) { ctx.fillStyle = '#F83800'; ctx.fillRect(H.tx - 6, H.ty, 13, 1); ctx.fillRect(H.tx, H.ty - 6, 1, 13); }
  }
  // the nightmare's mane of fire, flickering up off it
  if (b.ph >= 3 && b.vis !== 0) {
    const s = b.face < 0 ? -1 : 1;
    for (let k = 0; k < 10; k++) {
      const q = ((f * 2 + k * 17) % 30) / 30, mx = b.x + s * (16 - k * 2.2) + Math.sin(f / 5 + k) * 1.5, my = b.y + 6 + k * 2.4 - q * 12;
      ctx.fillStyle = q < 0.3 ? '#F8D800' : q < 0.65 ? '#F88800' : '#F83800'; ctx.fillRect(Math.round(mx), Math.round(my), q < 0.5 ? 2 : 1, q < 0.5 ? 2 : 1);
    }
  }
  if (b.vis === 0 || (b.run && b.run.st === 'in')) { ctx.fillStyle = (f >> 1) & 1 ? '#F8F8F8' : '#F8D848'; for (let k = 0; k < 8; k++) { const a = k * 0.8 + f * 0.2, d = 10 + (f * 2 + k * 5) % 20; ctx.fillRect(Math.round(b.x + Math.cos(a) * d), Math.round(b.y + b.h / 2 + Math.sin(a) * d * 0.7), 2, 2); } }
}

// THE MIRRORBALL, under its picture: its chain, the light coming up to it, the floor, its lasers; over it: rings,
// spots, the count to the drop, glints
function gx4aBallUnder(ctx, b) {
  const f = this.frame, cx = Math.round(b.x), cy = Math.round(b.y + 33);
  gx4aFloorDraw(ctx, b.floor, f);
  for (let y = -4; y < b.y + 3; y += 4) { ctx.fillStyle = '#606070'; ctx.fillRect(cx - 1, y, 3, 3); ctx.fillStyle = '#B8B8C0'; ctx.fillRect(cx - 1, y, 1, 2); }
  const L = b.lasers;
  if (L) {
    // two spotlights from the floor's corners hit it; it throws them back as lasers
    ctx.save();
    ctx.globalAlpha = 0.18; ctx.fillStyle = '#F8F0C0';
    for (const sx of [0, FW]) { ctx.beginPath(); ctx.moveTo(sx, FH); ctx.lineTo(cx - 6, cy); ctx.lineTo(cx + 6, cy); ctx.closePath(); ctx.fill(); }
    ctx.globalAlpha = 1; ctx.lineCap = 'round';
    for (let i = 0; i < L.n; i++) {
      const a = L.ang + i * Math.PI * 2 / L.n, ex = cx + Math.cos(a) * 340, ey = cy + Math.sin(a) * 340, col = GX4A_DISCO_COLS[i % 6];
      if (L.st === 0) {
        ctx.strokeStyle = (f >> 2) & 1 ? col : '#F8F8F8'; ctx.lineWidth = 1; ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(ex, ey); ctx.stroke(); ctx.setLineDash([]);
        ctx.globalAlpha = 0.1; ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, 300, L.a0 + i * Math.PI * 2 / L.n - L.A, L.a0 + i * Math.PI * 2 / L.n + L.A); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
        continue;
      }
      const pulse = Math.pow(1 - (b.bk || 0), 2);
      ctx.strokeStyle = 'rgba(248,56,0,0.35)'; ctx.lineWidth = 9 + pulse * 3; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(ex, ey); ctx.stroke();
      ctx.strokeStyle = col; ctx.lineWidth = 5 + pulse * 2; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(ex, ey); ctx.stroke();
      ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(ex, ey); ctx.stroke();
    }
    ctx.restore();
  }
}
function gx4aBallOver(ctx, b) {
  const f = this.frame, cx = Math.round(b.x), cy = Math.round(b.y + 33);
  for (const R of b.rings || []) gx4aRingDraw(ctx, R, f);
  for (const S of b.spots || []) gx4aSpotDraw(ctx, S, cx, cy + 20, f);
  const D = b.drop;
  if (D) {
    gx4aGapRays(ctx, cx, cy, D.gp, D.gw, f, 30);
    ctx.globalAlpha = 0.5; ctx.strokeStyle = '#F858C0'; ctx.lineWidth = 1; ctx.setLineDash([2, 3]); ctx.beginPath(); ctx.arc(cx, cy, 30 + Math.pow(1 - (b.bk || 0), 2) * 4, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
    if (D.k <= 3) Font.drawCenter(ctx, String(D.k), cx, cy + 34, (f >> 2) & 1 ? '#F8D848' : '#F8F8F8');
  }
  // glints popping on its facets, on the beat
  const k = 1 - (b.bk || 0);
  for (let i = 0; i < 4; i++) {
    const a = (b.beat || 0) * 1.7 + i * 1.6, r = 8 + ((i * 7 + (b.beat || 0) * 3) % 16), x = Math.round(cx + Math.cos(a) * r), y = Math.round(cy + Math.sin(a) * r * 0.9), n = Math.round(3 * k);
    if (n < 1) continue;
    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(x - n, y, 2 * n + 1, 1); ctx.fillRect(x, y - n, 1, 2 * n + 1);
  }
}

// ------------------------------------------------------------------ the skies
// RAINBOW RIFT: a candy nebula drifting by, candy planets, rainbow streams, glitter falling, now and then a shooting star
const GX4A_SKY = {};
function gx4aNebula(W, H) {
  const key = W + 'x' + H;
  if (GX4A_SKY[key]) return GX4A_SKY[key];
  const c = makeCanvas(W, H * 2), x = c.getContext('2d'), r = seeded(4040), H2 = H * 2;
  const blobs = ['248,120,200', '88,200,248', '120,248,200', '200,160,248', '248,200,140', '248,140,220', '140,180,248'];
  for (let k = 0; k < 11; k++) {
    const bx = r() * W, by = r() * H2, rad = 40 + r() * 60, col = blobs[k % blobs.length];
    for (const oy of [-H2, 0, H2]) {
      const gr = x.createRadialGradient(bx, by + oy, 0, bx, by + oy, rad);
      gr.addColorStop(0, 'rgba(' + col + ',0.26)'); gr.addColorStop(0.6, 'rgba(' + col + ',0.09)'); gr.addColorStop(1, 'rgba(' + col + ',0)');
      x.fillStyle = gr; x.fillRect(0, 0, W, H2);
    }
  }
  for (let k = 0; k < 60; k++) { x.fillStyle = k % 3 ? 'rgba(255,255,255,0.35)' : 'rgba(248,200,240,0.5)'; x.fillRect(Math.floor(r() * W), Math.floor(r() * H2), 1, 1); }
  return (GX4A_SKY[key] = c);
}
function gx4aBgRainbow(c, f) {
  const W = VIEW_W, H = VIEW_H;
  const gr = c.createLinearGradient(0, 0, 0, H);
  gr.addColorStop(0, 'rgba(40,10,70,0.5)'); gr.addColorStop(1, 'rgba(90,24,100,0.45)');
  c.fillStyle = gr; c.fillRect(0, 0, W, H);
  const neb = gx4aNebula(W, H), ny = Math.floor(f * 0.1) % (H * 2);
  c.drawImage(neb, 0, ny - H * 2); c.drawImage(neb, 0, ny);
  // candy planets, slowly drifting
  for (let k = 0; k < 2; k++) {
    const per = H + 140, y = ((f * (0.12 + k * 0.05) + k * 170) % per) - 70, x = k ? W * 0.78 : W * 0.2, r = k ? 15 : 22;
    c.save(); c.globalAlpha = 0.55;
    c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.clip();
    c.fillStyle = k ? '#B8E8F8' : '#F8E0F0'; c.fillRect(x - r, y - r, r * 2, r * 2);
    c.fillStyle = k ? '#58B8E8' : '#F070B0';
    for (let s = -3; s <= 3; s++) { c.save(); c.translate(x, y); c.rotate(f / 300 + k + s * 0.9); c.fillRect(-r, -2, r * 2, 4); c.restore(); }
    c.restore();
    if (k) { c.globalAlpha = 0.4; c.strokeStyle = '#F8D848'; c.lineWidth = 2; c.beginPath(); c.ellipse(x, y, r + 9, 4, -0.3, 0, Math.PI * 2); c.stroke(); c.globalAlpha = 1; }
  }
  // rainbow streams, rippling across the sky
  for (let k = 0; k < 2; k++) {
    const per = H + 160, base = ((f * 0.22 + k * 190) % per) - 80, slope = k ? -0.35 : 0.3;
    c.globalAlpha = 0.12;
    for (let x = 0; x < W; x += 2) {
      const y = base + Math.sin(x * 0.03 + f * 0.01 + k * 2) * 12 + (x - W / 2) * slope;
      for (let i = 0; i < 6; i++) { c.fillStyle = GX4A_RAINBOW_COLS[i]; c.fillRect(x, Math.round(y + i * 2), 2, 2); }
    }
    c.globalAlpha = 1;
  }
  // glitter falling, twinkling
  const r = seeded(4141);
  for (let k = 0; k < 36; k++) {
    const sx = r() * W, sy = r() * H, sp = 0.35 + r() * 0.6, x = Math.round(sx + Math.sin(f / 50 + k) * 6), y = Math.round((sy + f * sp) % (H + 8)) - 4, tw = (f + k * 13) % 60;
    c.fillStyle = ['#F8C8F0', '#C8F0F8', '#F8F0B0', '#D8C8F8'][k % 4];
    if (tw < 6) { c.fillRect(x - 2, y, 5, 1); c.fillRect(x, y - 2, 1, 5); c.fillStyle = '#FFFFFF'; c.fillRect(x, y, 1, 1); }
    else c.fillRect(x, y, 1, 1);
  }
  // a shooting star with a rainbow tail
  const q = f % 420;
  if (q < 46) {
    const n = Math.floor(f / 420), x0 = 30 + ((n * 67) % (W - 60)), x = x0 + q * 3.2, y = 10 + ((n * 41) % 60) + q * 1.4;
    for (let i = 0; i < 6; i++) { c.globalAlpha = 0.6; c.strokeStyle = GX4A_RAINBOW_COLS[i]; c.lineWidth = 1; c.beginPath(); c.moveTo(x - 30, y - 13 + i - 3); c.lineTo(x, y + i - 3); c.stroke(); }
    c.globalAlpha = 1; c.fillStyle = '#FFFFFF'; c.fillRect(Math.round(x) - 1, Math.round(y) - 1, 3, 3);
  }
}
// DISCO MOON: a dance floor laid on the moon, its tiles lit to the beat, spotlights sweeping, a glitter ball's glints
function gx4aBgDisco(c, f, g) {
  const W = VIEW_W, H = VIEW_H, pos = gx4aBeatPos(g, f), n = Math.floor(pos), k = pos - n, T = 26, edge = 12;
  const sc = f * 0.2, row0 = Math.floor(sc / T), sy = sc - row0 * T, pulse = Math.pow(1 - k, 2);
  // the floor
  for (let r = -1; r <= Math.ceil(H / T); r++) {
    const ra = r - row0, y = Math.round(r * T + sy);
    for (let cc = 0; edge + cc * T < W - edge; cc++) {
      const x = edge + cc * T, w = Math.min(T, W - edge - x), lit = (cc + ra + n) % 3 === 0 || ((cc * 5 + ra * 3) % 7 === n % 7);
      c.fillStyle = '#100A1A'; c.fillRect(x, y, w, T);
      c.globalAlpha = lit ? 0.08 + 0.15 * pulse : 0.035;
      c.fillStyle = GX4A_DISCO_COLS[((cc * 2 + ra * 3) % 6 + 6) % 6]; c.fillRect(x + 2, y + 2, w - 4, T - 4);
      c.globalAlpha = 1;
      c.fillStyle = '#06040A'; c.fillRect(x, y, w, 1); c.fillRect(x, y, 1, T);
    }
  }
  // the moon at its edges: grey dust and craters
  for (const x0 of [0, W - edge]) {
    c.fillStyle = '#4C4C58'; c.fillRect(x0, 0, edge, H);
    const r = seeded(x0 + 9);
    for (let i = 0; i < 14; i++) { const cx = x0 + 2 + Math.floor(r() * (edge - 4)), cy = Math.round((r() * (H + 40) + sc) % (H + 40)) - 20, rr = 1 + Math.floor(r() * 3); c.fillStyle = '#34343E'; c.fillRect(cx - rr, cy - rr, rr * 2, rr * 2); c.fillStyle = '#6C6C78'; c.fillRect(cx - rr, cy + rr - 1, rr * 2, 1); }
    c.fillStyle = '#5C5C68'; c.fillRect(x0 ? x0 : edge - 1, 0, 1, H);
  }
  // two spotlights sweeping from the top corners
  c.save();
  for (let s = 0; s < 2; s++) {
    const ox = s ? W : 0, a = Math.PI / 2 + (s ? 1 : -1) * (0.45 + Math.sin(f / 110 + s * 2) * 0.35), len = H * 1.3, spread = 0.13;
    c.globalAlpha = 0.07; c.fillStyle = s ? '#F8C8F0' : '#C8F0F8';
    c.beginPath(); c.moveTo(ox, -4); c.lineTo(ox + Math.cos(a - spread) * len * (s ? 1 : 1), -4 + Math.sin(a - spread) * len); c.lineTo(ox + Math.cos(a + spread) * len, -4 + Math.sin(a + spread) * len); c.closePath(); c.fill();
  }
  c.restore();
  // the glints of a glitter ball somewhere above, sliding over everything
  for (let i = 0; i < 26; i++) {
    const a = i * 2.39 + f * 0.004, rr = 50 + ((i * 37) % 170), x = Math.round(W / 2 + Math.cos(a) * rr * 1.2), y = Math.round(-40 + Math.abs(Math.sin(a)) * rr + 30);
    if (x < 0 || x >= W || y < 0 || y >= H) continue;
    c.globalAlpha = 0.25 + 0.3 * pulse; c.fillStyle = i % 4 ? '#FFFFFF' : GX4A_DISCO_COLS[i % 6]; c.fillRect(x, y, 2, 2);
  }
  c.globalAlpha = 1;
}

// ------------------------------------------------------------------ the boss pictures (gxbossart.js: GX_BOSS_ART, GX_BOSS_TALES)
const GX4A_ART = {
  // RAINBOW RIFT: the unicorn galloping over a rainbow, its trail behind it, glitter, your ship dodging
  gx4aUni: {
    intro(c, t) {
      gx4aArtSky(c, t);
      const bx = 12 + Math.round(Math.sin(t / 40) * 4), by = 2 + Math.round(Math.abs(Math.sin(t / 8)) * -2) + 4;
      for (let i = 0; i < 6; i++) Pix.rect(c, 0, by + 21 + i * 2, bx + 14, 2, GX4A_RAINBOW_COLS[i]);
      c.drawImage(GxArt.boss('gx4aUni', (t >> 2) & 3, 1), bx, by);
      for (let k = 0; k < 6; k++) { const q = (t + k * 11) % 50, x = 90 - q * 0.4 + k * 3, y = 10 + k * 7 + q * 0.6; if (q < 30) { Pix.rect(c, x, y, 3, 1, '#F8E840'); Pix.rect(c, x + 1, y - 1, 1, 3, '#F8E840'); } }
      GxArt.ship(c, 92 + Math.round(Math.sin(t / 15) * 3), 44, t);
    },
    outro(c, t) {
      gx4aArtSky(c, t, true);
      // asleep on a cotton-candy cloud, dreaming; hearts rising
      GxArt.ball(c, 50, 58, 40, 10, ['#FFF4FC', '#F8D0F0', '#F0A0D8', '#C068B0', '#7C3870']);
      GxArt.ball(c, 24, 52, 16, 8, ['#FFF4FC', '#F8D0F0', '#F0A0D8', '#C068B0', '#7C3870']); GxArt.ball(c, 76, 53, 16, 7, ['#FFF4FC', '#B8E0F8', '#A8D8F8', '#68A0C8', '#38507C']);
      c.drawImage(GxArt.boss('gx4aUni', 2, 1, null, g => { for (let x = 52; x <= 54; x++) { g[7][x] = 1; g[8][x] = 1; g[9][x] = 7; } }, 'zz'), 18, 16 + Math.round(Math.sin(t / 30)));
      for (const [x, y, rx, ry] of [[30, 58, 14, 7], [50, 59, 14, 6], [68, 58, 12, 6]]) GxArt.ball(c, x, y, rx, ry, ['#FFF4FC', '#F8D0F0', '#F0A0D8', '#C068B0', '#7C3870']);   // its legs tucked into the cloud
      for (let k = 0; k < 3; k++) { const q = (t + k * 30) % 90; gxTiny(c, 'Z', 80 + k * 4 + Math.round(Math.sin(q / 10) * 2), 22 - q * 0.2 - k * 4, q < 70 ? '#F8F8F8' : '#7C5CA8', null); }
      for (let k = 0; k < 4; k++) { const q = (t + k * 23) % 80, x = 20 + k * 22 + Math.round(Math.sin(q / 8 + k) * 2), y = 50 - q * 0.6; if (q < 60) gx4aArtHeart(c, x, y, k % 2 ? '#F898C8' : '#F8589C'); }
      GxArt.ship(c, 94, 34 + Math.round(Math.sin(t / 14) * 2), t);
    },
    bubble(t, outro) { return outro ? (t % 200 > 30 ? gxaSay('ZZZ... SO MUCH SPARKLE...', 2, 2) : null) : t > 8 ? gxaSay(t % 240 < 120 ? 'BELIEVE IN MAGIC!' : 'NEIGH-SAYER!', 30, 2) : null; },
  },
  // DISCO MOON: the mirrorball over the dance floor, throwing light about, your ship on the floor
  gx4aBall: {
    intro(c, t) {
      gx4aArtFloor(c, t, false);
      const B = GxArt.boss('gx4aBallS', (t >> 2) & 7, 1), x = 36 + Math.round(Math.sin(t / 30) * 4);
      for (let y = 0; y < 2; y += 2) Pix.rect(c, x + 19, y, 2, 2, '#808090');
      c.save(); c.globalAlpha = 0.35;
      for (let k = 0; k < 6; k++) { const a = t / 50 + k * Math.PI / 3; Pix.line(c, x + 20, 26, x + 20 + Math.cos(a) * 80, 26 + Math.sin(a) * 60, GX4A_DISCO_COLS[k]); }
      c.restore();
      c.drawImage(B, x, 2);
      GxArt.ship(c, 70 + Math.round(Math.sin(t / 12) * 6), 46, t);
    },
    outro(c, t) {
      gx4aArtFloor(c, t, true);
      // the chain hangs empty; the ball in pieces all over the floor
      for (let y = 0; y < 14; y += 2) Pix.rect(c, 55, y, 2, 2, '#808090');
      const r = seeded(19);
      for (let k = 0; k < 26; k++) { const x = 10 + Math.floor(r() * 92), y = 36 + Math.floor(r() * 26), s = 1 + Math.floor(r() * 3); Pix.rect(c, x, y, s, s, (k + (t >> 3)) % 7 === 0 ? '#FFFFFF' : k % 3 ? '#C8D0E0' : '#8890A8'); }
      // one spotlight on your ship, dancing
      c.save(); c.globalAlpha = 0.25; c.fillStyle = '#F8F0C0'; c.beginPath(); c.moveTo(52, 0); c.lineTo(62, 0); c.lineTo(74, 60); c.lineTo(40, 60); c.closePath(); c.fill(); c.restore();
      GxArt.ship(c, 49 + ((t >> 4) & 1 ? 3 : -3), 40 - ((t >> 3) & 1), t);
      for (let k = 0; k < 3; k++) { const q = (t + k * 25) % 75; GxArt.note(c, 32 + k * 22, 34 - q * 0.4, GX4A_DISCO_COLS[k * 2]); }
    },
    bubble(t, outro) { return outro ? (t % 200 > 30 ? gxaSay('ENCORE! ENCORE!', 2, 2) : null) : t > 8 ? gxaSay(t % 240 < 120 ? 'GET DOWN!' : 'FEEL THE BEAT!', 2, 2) : null; },
  },
};
// a candy nebula for the unicorn's pictures (a big rainbow over it in the outro)
function gx4aArtSky(c, t, rainbow) {
  c.drawImage(GxArt.once('gx4aRainSky', m => {
    Pix.bands(m, 0, INTRO_H, ['#120826', '#1C0C38', '#2A1048', '#3A1450', '#4A1858']);
    GxArt.cloud(m, 24, 18, 26, 12, ['#3A1C5C', '#5C2C78', '#7C3C88'], 1); GxArt.cloud(m, 90, 40, 26, 14, ['#1C2C5C', '#2C4C7C', '#3C6C8C'], 3);
  }), 0, 0);
  Pix.stars(c, 24, 7, t, INTRO_H);
  if (rainbow) for (let i = 0; i < 6; i++) Art.ring(c, 56, 70, 52 - i * 2, GX4A_RAINBOW_COLS[i], 360, Math.PI);
  for (let k = 0; k < 8; k++) { const q = (t + k * 17) % 64, x = (k * 29) % 112, y = (k * 13 + q) % 64; if (q % 16 < 4) { Pix.rect(c, x - 1, y, 3, 1, '#F8F0F8'); Pix.rect(c, x, y - 1, 1, 3, '#F8F0F8'); } }
}
function gx4aArtHeart(c, x, y, col) { Pix.grid(c, GX4A_HEART, Math.round(x), Math.round(y), { X: col }); }
// the moon's dance floor in perspective, its tiles lit to the beat
function gx4aArtFloor(c, t, slow) {
  Pix.rect(c, 0, 0, INTRO_W, INTRO_H, '#07040C');
  Pix.stars(c, 20, 3, t, 26);
  const beat = Math.floor(t / (slow ? 45 : 28));
  for (let r = 0; r < 6; r++) {
    const y0 = 28 + r * r * 1.1 + r * 3, y1 = 28 + (r + 1) * (r + 1) * 1.1 + (r + 1) * 3, w0 = 50 + r * 12, w1 = 50 + (r + 1) * 12;
    for (let k = 0; k < 8; k++) {
      const lit = (k + r + beat) % 3 === 0, col = lit ? GX4A_DISCO_COLS[(k + r * 2) % 6] : '#1C1028';
      for (let y = Math.round(y0); y < Math.min(INTRO_H, Math.round(y1)); y++) {
        const q = (y - y0) / Math.max(1, y1 - y0), w = w0 + (w1 - w0) * q, x0 = 56 - w + k * w / 4, x1 = x0 + w / 4 - 1;
        Pix.rect(c, Math.round(x0), y, Math.max(1, Math.round(x1 - x0)), 1, col);
      }
    }
  }
}
// into gxbossart.js's tables once it has loaded (it's after the galaxy files)
function gx4aArtIn() {
  if (typeof GX_BOSS_ART === 'undefined' || typeof GX_BOSS_TALES === 'undefined' || GX_BOSS_ART.gx4aUni) return;
  Object.assign(GX_BOSS_ART, GX4A_ART);
  Object.assign(GX_BOSS_TALES, {
    gx4aUni: { intro: ['A UNICORN MADE OF STARLIGHT', 'NEVER TRY TO CROSS ITS RAINBOW'], outro: 'SWEET DREAMS, LITTLE PONY.' },
    gx4aBall: { intro: ['THE MOON BECAME A DANCE FLOOR', 'STAND ON THE DARK TILES!'], outro: 'THE PARTY IS OVER. FOR NOW.' },
  });
}
if (typeof document !== 'undefined') document.addEventListener('DOMContentLoaded', gx4aArtIn);
{
  const start0 = Stage.prototype.gxBossStart;
  Stage.prototype.gxBossStart = function () { gx4aArtIn(); return start0.apply(this, arguments); };
}

// ------------------------------------------------------------------ the sounds (through the game's Sound system)
const GX4A_SFX = {
  gx4aNeigh(S, t) { S.seq([88, 91, 89, 92, 88, 86, 84, 81], 0.035, t, { vol: 0.07, wave: 'p25', decayTo: 0.6 }); },
  gx4aNightmare(S, t) { S.seq([64, 67, 65, 68, 64, 62, 58, 55], 0.05, t, { vol: 0.1, wave: 'p12', decayTo: 0.6 }); S.noise(1200, t, [[0, 0.2], [0.4, 0]], 400); },
  gx4aSparkle(S, t) { S.seq([96, 100, 103, 108, 103], 0.03, t, { vol: 0.05, wave: 'p12', decayTo: 0.4 }); },
  gx4aGallop(S, t) { S.noise(9000, t, [[0, 0.12], [0.02, 0]]); S.noise(9000, t + 0.07, [[0, 0.09], [0.02, 0]]); S.note(64, t, 0.03, { vol: 0.08, wave: 'tri', flat: true }); },
  gx4aBeam(S, t) { S.note(300, t, 0.45, { vol: 0.07, wave: 'p25', slideTo: 1400 }); S.note(450, t, 0.45, { vol: 0.04, wave: 'p50', slideTo: 2100 }); S.noise(6000, t, [[0, 0.08], [0.45, 0]]); },
  gx4aPop(S, t) { S.note(1300, t, 0.08, { vol: 0.07, wave: 'p50', slideTo: 300 }); },
  gx4aWish(S, t) { S.seq([84, 88, 91, 96, 100], 0.05, t, { vol: 0.1, wave: 'p50', decayTo: 0.5 }); },
  gx4aHeart(S, t) { S.seq([79, 83, 86], 0.05, t, { vol: 0.06, wave: 'p50', decayTo: 0.5 }); },
  gx4aArm(S, t) { S.note(1000, t, 0.15, { vol: 0.05, wave: 'p12', slideTo: 2600 }); },
  gx4aBurst(S, t) { S.noise(12000, t, [[0, 0.22], [0.15, 0]]); S.seq([100, 96, 103], 0.025, t, { vol: 0.04, wave: 'p12', flat: true }); },
  gx4aChat(S, t) { S.seq([84 + rnd(4), 88, 86 + rnd(3)], 0.04, t, { vol: 0.06, wave: 'p50', flat: true }); },
  gx4aZap(S, t) { S.noise(16000, t, [[0, 0.3], [0.12, 0]]); S.note(1800, t, 0.1, { vol: 0.06, wave: 'p12', slideTo: 200 }); },
  gx4aTick(S, t) { S.note(2400, t, 0.02, { vol: 0.04, wave: 'p12', flat: true }); },
  gx4aDrop(S, t) { S.note(110, t, 0.5, { vol: 0.32, wave: 'tri', slideTo: 32 }); S.noise(700, t, [[0, 0.5], [0.35, 0.2], [0.5, 0]], 200); },
  gx4aRiser(S, t) { S.noise(1500, t, [[0, 0.02], [0.7, 0.12], [0.75, 0]], 12000); },
  gx4aSpot(S, t) { S.note(1600, t, 0.03, { vol: 0.06, wave: 'p12', flat: true }); S.note(1200, t + 0.05, 0.03, { vol: 0.05, wave: 'p12', flat: true }); },
  gx4aMirror(S, t) { S.seq([91, 95, 98, 103, 98, 95], 0.04, t, { vol: 0.04, wave: 'p12', decayTo: 0.5 }); },
  gx4aShatter(S, t) { S.noise(14000, t, [[0, 0.4], [0.3, 0]], 5000); S.seq([100, 96, 103, 91, 98], 0.03, t, { vol: 0.05, wave: 'p12', flat: true }); },
  gx4aStomp(S, t) { S.noise(700, t, [[0, 0.5], [0.2, 0]], 300); S.note(55, t, 0.18, { vol: 0.2, wave: 'tri', slideTo: 30 }); },
  gx4aDash(S, t) { S.noise(3000, t, [[0, 0.05], [0.2, 0.18], [0.3, 0]], 9000); },
  gx4aShake(S, t) { S.noise(10000, t, [[0, 0.1], [0.03, 0]]); S.noise(10000, t + 0.06, [[0, 0.1], [0.03, 0]]); },
};
{
  const play0 = Sound.play;
  Sound.play = function (name) {
    if (GX4A_SFX[name]) { if (this.ctx && !this.muted && this.master.gain.value > 0) GX4A_SFX[name](this, this.ctx.currentTime + 0.005); return; }
    return play0.apply(this, arguments);
  };
}

// ------------------------------------------------------------------ their music (original tunes), in all three styles
// RAINBOW RIFT: dreamy and sugary (lydian, a music box over soft drums); the unicorn's: an epic gallop
// DISCO MOON: a funky disco boogie (dorian, octave bass, four on the floor); the mirrorball's: a minor-key floor-filler
SONGS.gx4aRainbow = { name: 'SUGAR NEBULA', root: 65, bpm: 100, groove: 'gx4aDream', prog: [0, 1, 5, 4], scale: [0, 2, 4, 6, 7, 9, 11],
  mel: '4-7-B---9-7-4---' + '1-5-8---6-5-3---' + '5-7-9-B-A-9-7-5-' + '4---6---8---7.6.' };
SONGS.gx4aBossRainbow = { name: 'GALLOP OF THE COSMIC UNICORN', root: 57, bpm: 152, groove: 'gallop', prog: [0, 5, 3, 4], scale: [0, 2, 3, 5, 7, 8, 11],
  mel: '7-7-4-7-9---7---' + 'C---9-7-5---7-9-' + 'A---9-7-5-7-9-A-' + 'B---A-9-8---6---' };
SONGS.gx4aDisco = { name: 'MOONLIGHT BOOGIE', root: 62, bpm: 120, groove: 'gx4aDisco', prog: [0, 3, 0, 4], scale: [0, 2, 3, 5, 7, 9, 10],
  mel: '7..7.9.7..4.5.4.' + '6..6.5.3..2.3.5.' + '7..7.9.A..9.7.9.' + 'B.A.9.8.7---.4.6' };
SONGS.gx4aBossDisco = { name: 'MIRRORBALL MAYHEM', root: 57, bpm: 128, groove: 'gx4aFever', prog: [0, 5, 6, 4], scale: [0, 2, 3, 5, 7, 8, 10],
  mel: '7-7-7.4.7-9-A.9.' + 'C-C-C.9.C-A-9.7.' + 'A-A-A.8.A-B-A.8.' + '8-7-6-4-6---4---' };
Object.assign(GROOVES, {
  gx4aDream: { drums: 'k.....h.s.....h.', bass: 'r.f.o.f.r.f.o.f.' },
  gx4aDisco: { drums: 'k.o.s.o.k.o.s.oh', bass: 'r.o.r.o.r.o.f.o.' },
  gx4aFever: { drums: 'k.hos.hok.hos.ho', bass: 'r.o.r.o.f.o.r.oo' },
});
ROCK_DRUMS.gx4aDisco = 'K.hoS.hoK.hoS.ho';
Object.assign(ROCK_SONGS, {
  gx4aRainbow: { name: 'SUGAR NEBULA (POWER BALLAD)', root: 41, bpm: 100, scale: 'lydian', form: 'IVIS', parts: {
    I: { lead: '@gx4aRainbow', riff: 'X-------X-----x.', dr: 'half', harm: 2 },
    V: { from: 'gx4aRainbow', riff: '0.4.2.4.0.4.2.4.', dr: 'rock' },
    S: { from: 'gx4aRainbow', riff: 'X---X---X---X---', dr: 'rock', solo: true } } },
  gx4aBossRainbow: { name: 'COSMIC GALLOP (METAL)', root: 45, bpm: 160, scale: 'harm', form: 'IVIS', parts: {
    I: { lead: '@gx4aBossRainbow', riff: 'p.ppp.ppp.ppX---', dr: 'gallop', harm: 2 },
    V: { from: 'gx4aBossRainbow', riff: 'X--.X--.X-.X-.X.', dr: 'gallop' },
    S: { from: 'gx4aBossRainbow', riff: 'pppppppppppppppp', dr: 'double', solo: true } } },
  gx4aDisco: { name: 'MOONLIGHT BOOGIE (FUNK ROCK)', root: 38, bpm: 120, scale: 'dorian', form: 'IVIS', parts: {
    I: { lead: '@gx4aDisco', riff: 'x.x.0.x.x.0.x.2.', dr: 'gx4aDisco' },
    V: { from: 'gx4aDisco', riff: '0.0.2.0.3.2.0.z.', dr: 'gx4aDisco' },
    S: { from: 'gx4aDisco', riff: 'x.x.x.x.x.x.x.x.', dr: 'gx4aDisco', solo: true } } },
  gx4aBossDisco: { name: 'MIRRORBALL MAYHEM (METAL)', root: 45, bpm: 132, scale: 'minor', form: 'IVIS', parts: {
    I: { lead: '@gx4aBossDisco', riff: 'P.ppP.ppP.ppX-X-', dr: 'gx4aDisco', harm: 2 },
    V: { from: 'gx4aBossDisco', riff: 'p.ppp.ppp.ppp.pp', dr: 'gx4aDisco' },
    S: { from: 'gx4aBossDisco', riff: 'pppppppppppppppp', dr: 'double', solo: true } } },
});
Object.assign(SYNTH_SONGS, {
  gx4aRainbow: { name: 'SUGAR NEBULA 1985', root: 41, bpm: 96, scale: 'lydian', sev: 1, att: 0.6, form: 'IVBV', parts: {   // a music box in the stars
    I: { bell: '@gx4aRainbow', bs: 'r-------', arp: '0.2.3.2.', f: [600, 1800], rise: 1 },
    V: { lead: '@gx4aRainbow', bs: 'r.o.', arp: '0123', dr: 'beat', f: 2400 },
    B: { from: 'gx4aRainbow', bell: '@gx4aRainbow', bs: 'r---------------', arp: '0246', ao: 1, f: 1200 } } },
  gx4aBossRainbow: { name: 'NIGHTMARE GALLOP', root: 45, bpm: 140, scale: 'harm', dirt: 1, pump: 0.3, form: 'IVLV', parts: {   // darksynth
    I: { from: 'gx4aBossRainbow', pad: 'S..S..S.S.......', bs: 'r', dr: 'kicks', f: [500, 1400], rise: 1 },
    V: { lead: '@gx4aBossRainbow', bs: 'rrorrror', arp: '0123', dr: 'push', f: 2200 },
    L: { from: 'gx4aBossRainbow', bs: 'ro', arp: '0123', dr: 'four', solo: 1 } } },
  gx4aDisco: { name: 'DISCO MOON 1983', root: 38, bpm: 118, scale: 'dorian', sev: 1, form: 'IVCV', parts: {   // italo disco
    I: { from: 'gx4aDisco', pad: 'S..S..S...S.S...', bs: 'r.o.', dr: 'kicks', f: [700, 2000], rise: 1 },
    V: { lead: '@gx4aDisco', bs: 'r.o.', arp: '0.2.1.3.', dr: 'four', f: 2400 },
    C: { from: 'gx4aDisco', bell: '@gx4aDisco', pad: 'S..S..S...S.S...', bs: 'ro', arp: '0123', dr: 'four', f: 2800 } } },
  gx4aBossDisco: { name: 'MIRRORBALL OVERDRIVE', root: 45, bpm: 126, scale: 'minor', dirt: 1, pump: 0.3, form: 'IVBV', parts: {
    I: { from: 'gx4aBossDisco', pad: 'S..S..S.S.......', bs: 'r.o.', dr: 'kicks', f: [500, 1500], rise: 1 },
    V: { lead: '@gx4aBossDisco', bs: 'r.o.', arp: '0123', dr: 'four', f: 2600 },
    B: { from: 'gx4aBossDisco', bell: '@gx4aBossDisco', bs: 'R-------R---R-R-', arp: '0102', dr: 'push', f: 1100 } } },
});
