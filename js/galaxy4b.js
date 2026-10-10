'use strict';
// =====================================================================
//  GALAXY, two more sectors before THE LAST BASE (CATS stays the last), each with its own enemies, waves, gimmick,
//  boss, sky and music.
//    THE GHOST SEA  a cold, dark sea of space: a ghostly moon, phosphorescent waves rolling by, icebergs adrift,
//                   fog banks, wreckage and bubbles. Its CURRENT now and then sweeps your ship sideways (warned)
//       enemies  will-o'-wisps (its drones), phantom lifeboats rowed by hooded ghosts with lanterns, drowned
//                deckchairs tumbling and bouncing on the swell, ice floes that crack into shards, icebergs
//       waves    LIFEBOAT FLOTILLA (boats rowing across, lane by lane), ICEBERG FIELD (big bergs drift through: steer
//                between them; shot, they crack into floes, and floes into shards), OVERBOARD! (deckchairs),
//                FOGBANK (the fog closes in: you see only what your lantern shows, wisps lunge out of it), SOS FLARES
//                (warned at the bottom, flares shoot up through your zone and burst into falling sparks)
//       boss     GHOST OF THE TITANIC: a huge see-through liner gliding across the top, bow first; at the end of its
//                run it fades into the fog and comes back out of it at the other side. Deck-gun portholes fire in
//                rows (two volleys with gaps), its four funnels puff ghost smoke that drifts down as wisps, the ghost
//                band plays a slow waltz (notes that sway, and the music bends your shots), it summons an iceberg
//                and rams it (shoot the berg first or it bursts into shards), distress rockets rain sparks; in
//                phase 3 it breaks in two: the stern keeps fighting while the bow plunges down at you. It sinks
//                bow first.
//    NORTH POLE     a starry polar night: the aurora, snow falling, a candy-cane workshop on a floating ice cap, a
//                   cottage with its chimney smoking. FROST: sit still too long and your ship ices up (slower)
//       enemies  elf drones (its drones), marching toy soldiers, nutcracker turrets, snowmen that lob snowballs,
//                gift boxes that open (a jack-in-the-box, a bomb, or a present: the wrapping tells), homing coal,
//                the naughty list itself
//       waves    PRESENT DROP, TOY PARADE (rows march, stop, present arms... and fire a volley), SNOWBALL FIGHT,
//                AURORA CURTAIN (a shimmering curtain across the sky reflects your shots: shoot through its gaps),
//                NAUGHTY LIST (a scroll with your name on it lobs homing coal until you tear it up)
//       boss     SANTA ON HIS SLEDGE: he flies loops with his reindeer team, a chain that follows his path. Present
//                bombs, HO HO HO (three shockwave rings), a sack full of elves, the red nose's laser, a coal
//                shotgun, the team sweeping down through your zone (its path shown first); phase 3: a turbo sledge
//                with rocket boosters, and a blizzard. Beaten, he tips you a present and flies off.
//  Their songs (chiptune, rock, synthwave) are at the end, the WARNING/VICTORY pictures too.
// =====================================================================

// ------------------------------------------------------------------ two more sectors, before THE LAST BASE
const GX4B_NONE = ['#000000', '#000000', '#000000'];
const GX4B_SEA = { name: 'THE GHOST SEA', sky: '#03070F', dust: '#1C3C48', planet: GX4B_NONE, noPlanet: true, bg: (c, f, g) => gx4bBgSea(c, f, g),
  swap: { drone: 'gx4bWisp' }, song: 'gx4bSea', bossSong: 'gx4bBossSea' };
const GX4B_POLE = { name: 'NORTH POLE', sky: '#050A1E', dust: '#2C3C6C', planet: GX4B_NONE, noPlanet: true, bg: (c, f, g) => gx4bBgPole(c, f, g),
  swap: { drone: 'gx4bElf' }, song: 'gx4bPole', bossSong: 'gx4bBossPole' };
{
  const at = GX_SECTORS.findIndex(s => s.name === 'THE LAST BASE');
  GX_SECTORS.splice(at, 0, GX4B_SEA, GX4B_POLE);
  GX_PLAN.splice(at, 0,
    ['gx4bFlotilla', 'gx4bBergs', 'gx4bChairs', 'gx4bFog', 'gx4bFlares', 'kamikaze'],
    ['gx4bPresents', 'gx4bParade', 'gx4bSnowball', 'gx4bAurora', 'gx4bNaughty', 'formation'],
  );
}
Object.assign(GX_WAVE_NAMES, { gx4bFlotilla: 'LIFEBOAT FLOTILLA', gx4bBergs: 'ICEBERG FIELD', gx4bChairs: 'OVERBOARD!', gx4bFog: 'FOGBANK', gx4bFlares: 'SOS FLARES',
  gx4bPresents: 'PRESENT DROP', gx4bParade: 'TOY PARADE', gx4bSnowball: 'SNOWBALL FIGHT', gx4bAurora: 'AURORA CURTAIN', gx4bNaughty: 'NAUGHTY LIST' });
GX_ALL_WAVES.push('gx4bFlotilla', 'gx4bBergs', 'gx4bChairs', 'gx4bFog', 'gx4bFlares', 'gx4bPresents', 'gx4bParade', 'gx4bSnowball', 'gx4bAurora', 'gx4bNaughty');
const gx4bIs = (g, s) => !!g && GX_SECTORS[g.sec] === s;
const gx4bClamp = (x, m) => Math.max(m, Math.min(FW - m, x));
const gx4bPick = a => a[rnd(a.length)];
const gx4bR = n => Math.round(n * 10) / 10;

// ------------------------------------------------------------------ the new enemies
// (the controllers, the wreck and the sledge flying off sit far below the field: nothing can hit them)
const GX4B_GHOST_T = { w: 1, h: 1, hp: 1e9, pts: 0, from: 99, special: true, noFire: true };
Object.assign(GX_TYPES, {
  gx4bWisp: { w: 10, h: 12, hp: 1, pts: 60, from: 99, special: true },
  gx4bBoat: { w: 22, h: 14, hp: 3, pts: 200, from: 99, special: true },
  gx4bChair: { w: 14, h: 14, hp: 2, pts: 150, from: 99, special: true, noFire: true },
  gx4bFloe: { w: 20, h: 10, hp: 4, pts: 120, from: 99, special: true, noFire: true },
  gx4bBerg: { w: 34, h: 30, hp: 16, pts: 400, from: 99, special: true, noFire: true },
  gx4bFlare: { w: 6, h: 12, hp: 1.5, pts: 100, from: 99, special: true, noFire: true },
  gx4bElf: { w: 12, h: 12, hp: 1, pts: 60, from: 99, special: true },
  gx4bSoldier: { w: 10, h: 16, hp: 3, pts: 150, from: 99, special: true },
  gx4bNut: { w: 14, h: 22, hp: 8, pts: 300, from: 99, special: true },
  gx4bGift: { w: 14, h: 14, hp: 3, pts: 150, from: 99, special: true },
  gx4bSnowman: { w: 16, h: 20, hp: 6, pts: 250, from: 99, special: true },
  gx4bCoal: { w: 8, h: 8, hp: 1, pts: 50, from: 99, special: true, noFire: true },
  gx4bList: { w: 66, h: 50, hp: 30, pts: 1000, from: 99, special: true, noFire: true },
  gx4bPBomb: { w: 12, h: 12, hp: 2, pts: 100, from: 99, special: true, noFire: true },
  gx4bFogC: GX4B_GHOST_T, gx4bAur: GX4B_GHOST_T, gx4bWreck: GX4B_GHOST_T, gx4bBye: GX4B_GHOST_T,
});
Object.assign(GX_PALS, {
  gx4bWisp: [null, '#D8F8F0', '#68E0C8', '#1C8C80', '#F8F8F8', '#A8F8F8', '#3CBCB8', '#031414'],
  gx4bBoat: [null, '#D8F8F0', '#7CB8B0', '#2C5C60', '#F8F8F8', '#A8F8C8', '#F8D878', '#041418'],
  gx4bChair: [null, '#D8E8D8', '#4C94A8', '#5C4428', '#F8F8F8', '#3C9C48', '#A88C5C', '#081008'],
  gx4bFloe: [null, '#E8F8F8', '#B0DCF0', '#3C78A8', '#F8F8F8', '#6CA8D8', '#88C0E0', '#081828'],
  gx4bBerg: [null, '#E8F4F8', '#9CC8E0', '#5480A8', '#F8F8F8', '#58F8D8', 'rgba(64,128,192,0.5)', '#06121C'],
  gx4bElf: [null, '#F8D8B0', '#3CB848', '#1C6C28', '#F8F8F8', '#F83800', '#9C9CA8', '#100808'],
  gx4bSoldier: [null, '#F8D0A8', '#E02818', '#202028', '#F8F8F8', '#F8D800', '#2840B8', '#080808'],
  gx4bNut: [null, '#F8D0A8', '#C82020', '#202028', '#F8F8F8', '#F8D800', '#3050C8', '#080808'],
  gx4bSnowman: [null, '#F8F8F8', '#C8D8F0', '#8CA0C8', '#202028', '#F87830', '#D02828', '#101018'],
  gx4bCoal: [null, '#F8B800', '#F87830', '#3C3C44', '#202028', '#F83800', '#5C5C68', '#080808'],
  gx4bPBomb: [null, '#F87858', '#D82818', '#5C3818', '#F8F8F8', '#F8D800', '#F8F8F8', '#100808'],
  gx4bGift: [null, '#D8A0F0', '#A050D8', '#582878', '#F8F8F8', '#F8D800', '#F8E878', '#100818'],
});
// a gift box's wrapping tells what's inside: purple (a jack-in-the-box), black and red (a bomb), gold (a present)
const GX4B_GIFT_PALS = {
  jack: GX_PALS.gx4bGift,
  bomb: [null, '#605868', '#383040', '#18141C', '#F8F8F8', '#F83800', '#F87858', '#080808'],
  power: [null, '#F8E8A0', '#F0C030', '#A07810', '#F8F8F8', '#F8F8F8', '#F8F8F8', '#181000'],
};
// a deckchair (faded striped canvas sagging in its wooden frame, weed dripping off it)
function gx4bChairGrid() {
  const P = bossPainter(14, 14);
  P.rect(2, 0, 2, 13, 3); P.rect(11, 0, 11, 13, 3); P.rect(3, 0, 10, 0, 6); P.rect(3, 9, 10, 9, 6);   // the frame
  for (let x = 3; x <= 10; x++) for (let y = 1; y <= (x > 4 && x < 9 ? 9 : 8); y++) P.px(x, y, ((x - 3) >> 1) % 2 ? 1 : 2);   // the canvas, striped, sagging
  P.rect(0, 5, 1, 5, 6); P.rect(12, 5, 13, 5, 6); P.px(1, 12, 3); P.px(12, 12, 3); P.px(0, 13, 3); P.px(13, 13, 3);   // armrests, splayed legs
  for (const [x, y, n] of [[4, 10, 2], [9, 10, 3], [12, 1, 2], [6, 1, 1]]) P.line(x, y, x, y + n, 5);   // seaweed
  P.outline(); return P.g;
}
// an iceberg: jagged peaks over a glowing waterline, the bulk of it under it, dim
const GX4B_PEAKS = [[0, 1], [4, 7], [8, 5], [13, 16], [16, 13], [19, 15], [24, 8], [28, 10], [33, 1]];
function gx4bPeak(x) {
  for (let i = 1; i < GX4B_PEAKS.length; i++) { const [x0, h0] = GX4B_PEAKS[i - 1], [x1, h1] = GX4B_PEAKS[i]; if (x <= x1) return h0 + (h1 - h0) * (x - x0) / (x1 - x0); }
  return 1;
}
Object.assign(GX_DRAW, {
  // a will-o'-wisp: a flame of cold fire with a face, its tip flickering
  gx4bWisp(f) {
    const P = bossPainter(10, 12), sw = f ? 1 : -1, hw = [0.6, 1, 1.5, 2, 2.6, 3.2, 3.7, 4.2, 4.5, 4.3, 3.6, 2.4];
    for (let y = 0; y < 12; y++) {
      const cx = 5 + (y < 6 ? sw * (6 - y) * 0.25 : 0);
      for (let x = 0; x < 10; x++) { const d = Math.abs(x + 0.5 - cx) / hw[y]; if (d <= 1) P.px(x, y, d > 0.72 ? 3 : d > 0.38 ? 2 : 1); }
    }
    P.px(5 + sw, 2, 4); P.px(3, 5, 4);
    P.rect(3, 6, 3, 7, 7); P.rect(6, 6, 6, 7, 7); P.rect(4, 9, 5, 9 + f, 7);   // eyes, a wailing mouth
    P.outline(); return P.g;
  },
  // a lifeboat, side on: a hooded ghost rowing (f: the stroke), a lantern on a pole at the bow
  gx4bBoat(f) {
    const P = bossPainter(22, 14);
    for (let x = 1; x <= 20; x++) {
      const top = Math.round(8 - (x > 16 ? (x - 16) * 0.7 : 0) - (x < 4 ? (4 - x) * 0.4 : 0)), bot = x > 3 && x < 18 ? 12 : 11;
      for (let y = top; y <= bot; y++) P.px(x, y, y === top ? 1 : y >= bot ? 3 : 2);
    }
    for (let x = 3; x < 19; x++) if (x % 5) P.px(x, 10, 3);   // its planks
    gxBall(P, 10, 5, 2.8, 3.4, [4, 1, 1, 2, 3]);   // the hood
    P.rect(9, 4, 11, 6, 7); P.px(9, 5, 5); P.px(11, 5, 5);   // no face in it: two green eyes
    P.rect(8, 7, 12, 8, 1);
    if (f) { P.line(11, 7, 6, 13, 3); P.px(5, 13, 2); } else { P.line(11, 7, 15, 13, 3); P.px(16, 13, 2); }   // the oar
    P.line(18, 1, 18, 7, 3); P.rect(19, 2, 20, 4, 6); P.px(19, 2, 4);   // the lantern
    P.outline(); return P.g;
  },
  // a deckchair, turned f quarters (it tumbles)
  gx4bChair(f) { let g = gx4bChairGrid(); for (let k = 0; k < (f & 3); k++) g = rotGrid(g); return g; },
  // an ice floe: a slab, its edge showing, cracked
  gx4bFloe(f) {
    const P = bossPainter(20, 10);
    gxBall(P, 10, 4, 9.6, 3.9, [4, 1, 1, 2, 6]);
    for (let x = 0; x < 20; x++) for (let y = 9; y > 0; y--) if (P.g[y - 1][x] && !P.g[y][x]) { P.px(x, y, 5); if (y < 9) P.px(x, y + 1, 3); break; }
    for (const [x, y] of [[0, 3], [19, 4], [3, 1], [16, 1], [8, 0]]) P.px(x, y, 0);   // its jagged edge
    P.line(6, 2, 9, 5, 6); P.line(9, 5, 8, 7, 6); P.line(13, 2, 15, 5, 6);   // cracks
    P.px(4 + f * 8, 2, 4);
    P.outline(); return P.g;
  },
  gx4bBerg(f) {
    const P = bossPainter(34, 30);
    for (let x = 0; x < 34; x++) {
      const h = gx4bPeak(x), top = Math.round(19 - h), lit = gx4bPeak(x + 1) - gx4bPeak(x - 1) > 0.2;
      for (let y = top; y <= 18; y++) P.px(x, y, y === top ? 4 : (x * 7 + y * 3) % 13 === 0 && y > top + 2 ? 3 : lit ? 1 : 2);
    }
    for (let y = 20; y < 30; y++) for (let x = Math.round(2 + (y - 20) * 0.7); x <= Math.round(31 - (y - 20) * 0.5); x++) P.px(x, y, (x + y) % 5 ? 6 : 3);
    for (let x = 1; x < 33; x++) P.px(x, 19, (x + f * 3) % 7 ? 5 : 4);   // the waterline glows
    P.line(13, 5, 12, 12, 3); P.line(24, 13, 26, 17, 3);
    P.outline(); return P.g;
  },
  // an elf on a little drone: a pointy hat with a bobble, pointy ears, rotors spinning (f)
  gx4bElf(f) {
    const P = bossPainter(12, 12);
    P.rect(2, 8, 9, 9, 6); P.px(3, 10, 6); P.px(8, 10, 6); P.px(3, 11, 3); P.px(8, 11, 3);
    if (f) { P.rect(0, 7, 3, 7, 4); P.rect(8, 7, 11, 7, 4); } else { P.rect(1, 7, 2, 7, 3); P.rect(9, 7, 10, 7, 3); }
    P.disc(6, 5.5, 2.5, 1); P.px(2, 4, 1); P.px(3, 5, 1); P.px(9, 4, 1); P.px(8, 5, 1);   // face, ears
    P.px(5, 5, 7); P.px(7, 5, 7); P.px(6, 7, 5);
    P.rect(4, 2, 8, 2, 2); P.rect(5, 1, 8, 1, 2); P.rect(7, 0, 9, 0, 2); P.rect(3, 3, 9, 3, 5);   // the hat and its band
    P.px(10, 1 - f, 4); P.px(10, 2 - f, 4);
    P.outline(); return P.g;
  },
  // a toy soldier (f 0/1: marching, 2: presenting arms)
  gx4bSoldier(f) {
    const P = bossPainter(10, 16);
    P.rect(3, 0, 6, 4, 3); P.rect(4, 3, 5, 3, 5);   // the bearskin
    P.rect(3, 5, 6, 6, 1); P.px(4, 5, 3); P.px(5, 5, 3); P.px(3, 6, 2); P.px(6, 6, 2);
    P.rect(2, 7, 7, 11, 2); P.rect(2, 10, 7, 10, 4); P.line(3, 7, 6, 9, 4); P.px(2, 7, 5); P.px(7, 7, 5); P.px(5, 8, 5);
    P.rect(1, 7, 1, 10, 2); P.rect(8, 7, 8, 10, 2);
    P.rect(3, 12, 4, f === 1 ? 14 : 15, 6); P.rect(5, 12, 6, f === 0 ? 14 : 15, 6);
    if (f === 2) { P.line(1, 12, 8, 6, 3); P.px(9, 5, 4); P.px(9, 4, 4); }
    else { P.line(9, 3, 9, 11, 3); P.px(9, 1, 4); P.px(9, 2, 4); }
    P.outline(); return P.g;
  },
  // a nutcracker (f: its jaw open)
  gx4bNut(f) {
    const P = bossPainter(14, 22);
    P.rect(3, 0, 10, 5, 3); P.rect(3, 4, 10, 4, 2); P.rect(6, 1, 7, 2, 5);   // its tall hat
    P.rect(3, 6, 10, 11, 1);
    P.rect(4, 6, 5, 6, 3); P.rect(8, 6, 9, 6, 3); P.rect(4, 7, 5, 7, 4); P.px(5, 7, 3); P.rect(8, 7, 9, 7, 4); P.px(8, 7, 3);
    P.rect(6, 8, 7, 9, 2); P.rect(4, 10, 9, 10, 4);   // its nose, a moustache
    if (f) { P.rect(5, 11, 8, 13, 3); P.rect(5, 11, 8, 11, 4); } else P.rect(5, 11, 8, 11, 3);
    P.rect(3, 12 + f, 10, 13 + f, 4); P.px(3, 11, 4); P.px(10, 11, 4);   // the beard on its jaw
    P.rect(2, 14 + f, 11, 18, 2); P.rect(2, 17, 11, 17, 4); P.px(6, 15 + f, 5); P.px(7, 16, 5);
    P.rect(0, 14, 1, 18, 2); P.rect(12, 14, 13, 18, 2); P.px(0, 19, 4); P.px(13, 19, 4);
    P.rect(3, 19, 5, 20, 6); P.rect(8, 19, 10, 20, 6); P.rect(3, 21, 5, 21, 3); P.rect(8, 21, 10, 21, 3);
    P.outline(); return P.g;
  },
  // a snowman (f 0/1: a wobble, 2: winding up a throw)
  gx4bSnowman(f) {
    const P = bossPainter(16, 20), w = f === 1 ? 1 : 0;
    gxBall(P, 8, 16, 6, 4, [1, 1, 2, 3, 3]); gxBall(P, 8 + w * 0.5, 10.8, 4.4, 3.4, [1, 1, 2, 3, 3]); gxBall(P, 8 + w, 5.5, 3.2, 3, [1, 1, 2, 3, 3]);
    P.rect(6 + w, 0, 10 + w, 2, 4); P.rect(5 + w, 2, 11 + w, 2, 4); P.rect(6 + w, 1, 10 + w, 1, 6);   // the hat
    P.px(7 + w, 5, 4); P.px(9 + w, 5, 4); P.rect(8 + w, 6, 10 + w, 6, 5); P.px(7 + w, 8, 4); P.px(9 + w, 8, 4); P.px(8 + w, 8, 4);
    P.rect(5, 8, 11, 9, 6); P.rect(10, 9, 11, 11, 6); P.px(7, 8, 1); P.px(10, 10, 1);   // the scarf
    for (const y of [11, 13, 16]) P.px(8, y, 4);
    P.line(4, 11, 1, 9 + w, 4);
    if (f === 2) { P.line(12, 10, 14, 5, 4); P.rect(13, 2, 15, 4, 1); } else P.line(12, 11, 15, 9 + w, 4);
    P.outline(); return P.g;
  },
  // a lump of coal, glowing in its cracks
  gx4bCoal(f) {
    const P = bossPainter(8, 8);
    gxBall(P, 4, 4, 3.6, 3.3, [6, 6, 3, 4, 4]); P.px(1, 2, 0); P.px(6, 6, 0);
    if (f) { P.px(3, 4, 1); P.px(4, 5, 2); P.px(5, 3, 5); } else { P.px(4, 3, 2); P.px(5, 4, 1); P.px(2, 5, 5); }
    P.outline(); return P.g;
  },
  // Santa's present bomb: a striped box, a fuse burning on top (f)
  gx4bPBomb(f) {
    const P = bossPainter(12, 12);
    P.rect(1, 4, 10, 11, 2); P.rect(1, 4, 2, 11, 1); P.rect(9, 5, 10, 11, 3);
    for (let k = 0; k < 4; k++) P.line(1 + k * 3, 11, 3 + k * 3, 4, 4);
    P.rect(5, 4, 6, 11, 5); P.rect(1, 7, 10, 7, 5);
    P.line(6, 3, 7, 1, 3); P.px(7 + f, 0, f ? 4 : 5); P.px(8, 1 - f, 5);
    P.outline(); return P.g;
  },
  // a gift box (f: its lid jumps), and the same opened
  gx4bGift(f) {
    const P = bossPainter(14, 14);
    P.rect(1, 6, 12, 13, 2); P.rect(1, 6, 2, 13, 1); P.rect(11, 6, 12, 13, 3); P.rect(1, 13, 12, 13, 3);
    P.rect(6, 6, 7, 13, 5); P.rect(1, 9, 12, 9, 5);
    P.rect(0, 3 - f, 13, 5 - f, 1); P.rect(0, 5 - f, 13, 5 - f, 3); P.rect(6, 3 - f, 7, 5 - f, 5);
    P.rect(3, 1 - f, 5, 2 - f, 6); P.rect(8, 1 - f, 10, 2 - f, 6); P.rect(6, 2 - f, 7, 2 - f, 5);
    P.outline(); return P.g;
  },
  gx4bGiftOpen() {
    const P = bossPainter(14, 14);
    P.rect(1, 6, 12, 13, 2); P.rect(1, 6, 2, 13, 1); P.rect(11, 6, 12, 13, 3); P.rect(1, 13, 12, 13, 3);
    P.rect(2, 6, 11, 7, 7); P.rect(6, 8, 7, 13, 5); P.rect(1, 9, 12, 9, 5);
    P.outline(); return P.g;
  },
});
// a sprite in a palette of its own (gift boxes)
const GX4B_IMG = new Map();
function gx4bImg(key, grid, pal) {
  let c = GX4B_IMG.get(key);
  if (!c) { c = gridCanvas(typeof grid === 'function' ? grid() : grid, pal); GX4B_IMG.set(key, c); }
  return c;
}
const gx4bMirror = g => g.map(r => r.slice().reverse());

// ------------------------------------------------------------------ how they move
// what's left in the wave, apart from the controllers (a fog bank or a curtain stays while anything does)
const gx4bOthers = (g, e) => g.spawnQ.length > 0 || g.list.some(o => o !== e && GX_TYPES[o.type] !== GX4B_GHOST_T);
// an aurora curtain's segment at x: 0 open, 1 flickering (about to open or shut), 2 solid
const GX4B_SEGS = 8;
function gx4bSeg(t, k) { const p = ((t + k * 53 + (k % 3) * 29) % 230) / 230; return p < 0.6 ? 2 : p < 0.7 ? 1 : p < 0.94 ? 0 : 1; }
Object.assign(GX_MOVES, {
  // lifeboats: rowing across (a pull on the oars, a glide), a lane further down each time they turn
  gx4bRow: Object.assign(function (e, g) {
    const sp = Math.min(1.35, 0.75 + 0.25 * g.shotSpd), pull = Math.sin(e.t / 11 + e.ph);
    e.x += e.dirX * 0.6 * sp * (0.35 + 0.9 * Math.max(0, pull));
    e.y += (e.ty - e.y) * 0.05 + Math.sin(e.t / 23) * 0.08;
    if (e.x < -16 || e.x > FW + 16) { e.dirX = -e.dirX; e.lane = (e.lane + 1) % 4; e.ty = 18 + e.lane * 16; }
    e.v = { fl: e.dirX < 0 ? 1 : 0, o: pull > 0 ? 1 : 0 };
  }, { init(e) { e.dirX = e.dirX || 1; e.x = e.dirX > 0 ? -14 : FW + 14; e.lane = e.lane || 0; e.ty = 18 + e.lane * 16; e.y = e.ty; e.ph = rnd(10); e.fireT = 140 + rnd(200); e.v = { fl: e.dirX < 0 ? 1 : 0, o: 0 }; } }),
  // icebergs and floes: drifting down, swaying, off the sides
  gx4bDrift: Object.assign(function (e) {
    e.x += e.vx + Math.sin(e.t / 80 + e.ph) * 0.12; e.y += e.vy;
    if (e.x < e.w / 2) e.vx = Math.abs(e.vx); else if (e.x > FW - e.w / 2) e.vx = -Math.abs(e.vx);
    if (e.y > FH + 24) gxGone(e);
  }, { init(e, g) {
    e.x = e.px !== undefined ? e.px : 20 + rnd(FW - 40); e.y = e.py !== undefined ? e.py : -16; e.ph = rnd(10); e.fireT = 1e9;
    if (e.vx === undefined) e.vx = (Math.random() - 0.5) * 0.3;
    if (e.vy === undefined) e.vy = (e.type === 'gx4bBerg' ? 0.3 : 0.42) * Math.min(1.3, g.shotSpd);
  } }),
  // the ghost ship's own iceberg: it rises out of the fog where it's told to, and waits to be rammed
  gx4bRise: Object.assign(function (e) {
    e.grow = Math.min(1, e.grow + 1 / 40); e.y = e.py + Math.sin(e.t / 20) * 1;
    e.v = { g: gx4bR(e.grow) };
    if (e.t > 600) gxGone(e);
  }, { init(e) { e.x = e.px; e.y = e.py; e.grow = 0; e.fireT = 1e9; e.v = { g: 0 }; } }),
  // deckchairs: tossed in, tumbling, bouncing off the swell (twice), then gone under
  gx4bTumble: Object.assign(function (e, g) {
    e.vy = Math.min(1.5, e.vy + 0.02 * Math.min(1.3, g.shotSpd)); e.x += e.vx; e.y += e.vy;
    if (e.x < 7 || e.x > FW - 7) e.vx = -e.vx;
    if (e.bounces > 0 && e.vy > 0 && e.y > e.sy) { e.vy = -(1.2 + Math.random() * 0.4); e.bounces--; e.sy += 14; gx4bRipple(g, e.x, e.y + 6); if (this.frame % 2 === 0) Sound.play('gx4bSplash'); }
    e.ang += e.vx * 0.13;
    e.v = { r: ((Math.round(e.ang / (Math.PI / 2)) % 4) + 4) % 4 };
    if (e.y > FH + 12) gxGone(e);
  }, { init(e) { e.x = 16 + rnd(FW - 32); e.y = -10; e.vx = (rnd(2) ? 1 : -1) * (0.4 + Math.random() * 0.5); e.vy = 0.5; e.sy = FH * (0.45 + Math.random() * 0.3); e.bounces = 2; e.ang = 0; e.fireT = 1e9; e.v = { r: 0 }; } }),
  // wisps in the fog: drifting about; now and then one flares up (warned) and lunges at where you were
  gx4bLurk: Object.assign(function (e, g, near) {
    if (e.k === 0) {
      if (e.t % 140 === 0) { e.tx = 14 + rnd(FW - 28); e.ty = 14 + rnd(Math.round(FH * 0.42)); }
      e.x += (e.tx - e.x) * 0.02 + Math.sin(e.t / 30 + e.ph) * 0.3; e.y += (e.ty - e.y) * 0.02;
      const tg = near(e.x, e.y);
      if (tg && e.t > e.lungeAt && !g.list.some(o => o.st === 'gx4bLurk' && o.k === 1)) { e.k = 1; e.t1 = 0; e.gx = tg.x + 8; e.gy = tg.y + 8; Sound.play('gx4bWisp'); }
    } else if (e.k === 1) {
      if (++e.t1 >= 36) { const d = Math.hypot(e.gx - e.x, e.gy - e.y) || 1, sp = 2.1 * Math.min(1.3, g.shotSpd); e.k = 2; e.vx = (e.gx - e.x) / d * sp; e.vy = (e.gy - e.y) / d * sp; }
    } else { e.x += e.vx; e.y += e.vy; if (e.y > FH + 14 || e.y < -14 || e.x < -14 || e.x > FW + 14) gxGone(e); }
    e.v = { k: e.k };
  }, { init(e) { e.x = 12 + rnd(FW - 24); e.y = -10; e.tx = e.x; e.ty = 16 + rnd(Math.round(FH * 0.4)); e.ph = rnd(10); e.k = 0; e.lungeAt = 120 + rnd(360); e.fireT = 200 + rnd(200); e.v = { k: 0 }; } }),
  // an SOS flare: warned at the bottom, it shoots up through your zone and bursts into sparks at the top
  gx4bFlareUp: Object.assign(function (e, g) {
    if (e.warnT > 0) { if (--e.warnT === 0 && e.lead) Sound.play('gx4bFlare'); return; }
    e.y += e.vy; e.vy += 0.05; e.x += Math.sin(e.t / 6) * 0.15;
    e.v = { s: Math.round(-e.vy * 3) };
    if (e.vy > -0.35) this.gx4bBurst(e, 10, 0.85);
  }, { init(e) { e.x = e.px !== undefined ? e.px : 14 + rnd(FW - 28); e.y = FH + 8; e.warnT = 60; e.vy = -(3.5 + Math.random() * 0.5); e.fireT = 1e9; e.v = { s: 0 }; } }),
  // a fog bank: it rolls in, stays while anything's left of the wave, then thins out
  gx4bFogC: Object.assign(function (e, g) {
    e.a = gx4bOthers(g, e) || e.t < 60 ? Math.min(1, e.a + 1 / 90) : e.a - 1 / 40;
    if (e.a <= 0) gxGone(e);
    e.v = { a: gx4bR(Math.max(0, e.a)) };
  }, { init(e) { e.x = FW / 2; e.y = FH + 1000; e.a = 0; e.fireT = 1e9; e.v = { a: 0 }; } }),
  // the aurora curtain: its segments shimmer solid and open in turn
  gx4bAur: Object.assign(function (e, g) {
    e.a = gx4bOthers(g, e) || e.t < 60 ? Math.min(1, e.a + 1 / 60) : e.a - 1 / 40;
    if (e.a <= 0) gxGone(e);
    let s = '';
    for (let k = 0; k < GX4B_SEGS; k++) s += gx4bSeg(e.t, k);
    e.segs = s; e.v = { a: gx4bR(Math.max(0, e.a)), y: e.cy, s };
  }, { init(e) { e.x = FW / 2; e.y = FH + 1000; e.cy = Math.round(FH * 0.31); e.a = 0; e.fireT = 1e9; e.segs = '22222222'; e.v = { a: 0, y: e.cy, s: e.segs }; } }),
  // gift boxes: they float down on a little parachute, stop, shake... and open
  gx4bGiftFall: Object.assign(function (e) {
    if (e.k === 0) { e.y += 0.55; e.x += Math.sin(e.t / 25 + e.ph) * 0.25; if (e.y >= e.oy) { e.k = 1; e.t1 = 0; } }
    else if (e.k === 1) { if (++e.t1 >= 40) this.gx4bOpen(e); }
    else if (e.k === 2) { if (e.t1++ > 520) e.k = 4; }
    else if (e.k === 3) { if (--e.fuse <= 0) { this.gx4bBoom(e, 12, 1.05); return; } }
    else { e.y += 0.8; if (e.y > FH + 12) gxGone(e); }
    e.v = { k: e.k, c: e.kind, u: e.k === 3 ? Math.round(e.fuse / 9) : e.k === 2 ? e.t1 % 64 : e.k === 1 ? e.t1 : 0 };
  }, { init(e) { e.x = e.px !== undefined ? e.px : 16 + rnd(FW - 32); e.y = -12; e.oy = Math.round(FH * (0.14 + Math.random() * 0.22)); e.k = 0; e.kind = e.kind || 'jack'; e.ph = rnd(10); e.fireT = 30; e.v = { k: 0, c: e.kind, u: 0 }; } }),
  // toy soldiers: a row marches in step; every so often the row halts, presents arms, and fires a volley straight down
  gx4bMarch: Object.assign(function (e, g) {
    const tt = (g.t + e.row * 150) % 300, on = e.x > 4 && e.x < FW - 4, sp = Math.min(1.3, 0.8 + 0.2 * g.shotSpd);
    if (tt < 46 && e.t > 60) {
      e.k = 1;
      if (tt === 0 && e.lead) Sound.play('gx4bDrum');
      if (tt === 45 && on && g.bullets.length < 70) g.bullets.push({ x: e.x, y: e.y + 8, vx: 0, vy: 1.35 * g.shotSpd, k: 'gx4bCork' });
    } else {
      e.k = 0;
      if (e.t % 8 < 4) e.x += e.dirX * 0.95 * sp;
      if ((e.dirX > 0 && e.x > FW + 10) || (e.dirX < 0 && e.x < -10)) { e.dirX = -e.dirX; e.ty = Math.min(Math.round(FH * 0.42), e.ty + 10); }
    }
    e.y += (e.ty - e.y) * 0.1;
    e.v = { k: e.k, s: (e.t >> 3) & 1 };
  }, { init(e) { e.dirX = e.row % 2 ? -1 : 1; e.x = e.dirX > 0 ? -10 - e.i * 16 : FW + 10 + e.i * 16; e.ty = 22 + e.row * 22; e.y = e.ty; e.k = 0; e.fireT = 1e9; e.v = { k: 0, s: 0 }; } }),
  // nutcrackers: in to a spot, standing guard, chomping; later they march off
  gx4bStand: Object.assign(function (e, g, near) {
    if (e.t > 1500) e.ty = FH + 40;
    e.y += (e.ty - e.y) * 0.04; e.x += Math.sin(e.t / 60) * 0.2;
    if (e.jaw > 0 && --e.jaw === 0) {
      const t = near(e.x, e.y);
      if (t) for (const sp of [-0.28, 0, 0.28]) { const a = Math.atan2(t.y + 8 - e.y, t.x + 8 - e.x) + sp; g.bullets.push({ x: e.x, y: e.y + 6, vx: Math.cos(a) * 1.3 * g.shotSpd, vy: Math.sin(a) * 1.3 * g.shotSpd, k: 'gx4bNutB' }); }
      Sound.play('gx4bClack');
    }
    if (e.y > FH + 20) gxGone(e);
    e.v = { k: e.jaw > 0 ? 1 : 0 };
  }, { init(e) { e.x = e.px; e.y = -14; e.ty = e.py; e.jaw = 0; e.fireT = 90 + rnd(80); e.v = { k: 0 }; } }),
  // snowmen: slide in to a spot on the ice, sway about, wind up and lob snowballs
  gx4bSlide: Object.assign(function (e, g, near) {
    if (e.t > 1500) e.ty = FH + 40;
    e.y += (e.ty - e.y) * 0.04; e.x = e.tx + Math.sin(e.t / 50 + e.ph) * 7;
    if (e.wind > 0 && --e.wind === 0) this.gx4bLob(e, near(e.x, e.y));
    if (e.y > FH + 20) gxGone(e);
    e.v = { k: e.wind > 0 ? 2 : (e.t >> 4) & 1 };
  }, { init(e) { e.x = e.tx; e.y = -22; e.ph = rnd(10); e.wind = 0; e.fireT = 100 + rnd(140); e.v = { k: 0 }; } }),
  // the naughty list: it unrolls at the top, sways, and lobs coal at you until it's torn up (or rolls up and goes)
  gx4bUnroll: Object.assign(function (e, g) {
    const done = e.t > 1700;
    e.len = done ? e.len - 1 : Math.min(50, e.len + 0.8); e.h = Math.max(4, e.len);
    e.y = 14 + e.len / 2; e.x = FW / 2 + Math.sin(e.t / 120) * 34;
    if (!done && e.len >= 50 && --e.coalT <= 0) {
      for (let k = 0; k < (g.loop || g.d > 10 ? 3 : 2); k++) { const c = this.gxSpawn({ type: 'gx4bCoal', st: 'gx4bHome', px: e.x - 14 + k * 14, py: e.y + 26, vx: (k - 0.5) * 0.9 }); c.t = -k * 6; }
      e.coalT = Math.round((100 + rnd(40)) / Math.max(0.5, g.fireMul)); Sound.play('gx4bCoalShot');
    }
    if (done && e.len <= 2) gxGone(e);
    e.v = { len: Math.round(e.len), d: Math.min(3, Math.floor((1 - e.hp / e.max) * 4)), c: e.coalT < 24 ? 1 : 0 };
  }, { init(e) { e.x = FW / 2; e.len = 2; e.y = 15; e.coalT = 60; e.fireT = 1e9; e.v = { len: 2, d: 0, c: 0 }; } }),
  // coal: thrown out, then homing in on you for a while, then it drops away
  gx4bHome: Object.assign(function (e, g, near) {
    if (e.t < 0) return;
    const tg = near(e.x, e.y), cap = 0.95 * Math.min(1.35, g.shotSpd);
    if (e.t < 26) { e.x += e.vx; e.y += e.vy; e.vy += 0.02; return; }
    if (e.t > 320 || !tg) { e.vy = Math.min(2, e.vy + 0.05); e.x += e.vx; e.y += e.vy; if (e.y > FH + 10) gxGone(e); return; }
    const dx = tg.x + 8 - e.x, dy = tg.y + 8 - e.y, d = Math.hypot(dx, dy) || 1;
    e.vx += dx / d * 0.06; e.vy += dy / d * 0.06;
    const v = Math.hypot(e.vx, e.vy); if (v > cap) { e.vx *= cap / v; e.vy *= cap / v; }
    e.x += e.vx; e.y += e.vy;
  }, { init(e) { e.x = e.px; e.y = e.py; e.vx = e.vx || 0; e.vy = 0.5; e.fireT = 1e9; } }),
  // Santa's present bombs: tossed out of the sledge, falling, the fuse burning down
  gx4bToss: Object.assign(function (e) {
    e.vy = Math.min(1.1, e.vy + 0.045); e.x += e.vx; e.y += e.vy; e.vx *= 0.99;
    if (e.x < 6 || e.x > FW - 6) e.vx = -e.vx;
    if (--e.fuse <= 0) { this.gx4bBoom(e, 8, 1.1); return; }
    if (e.y > FH + 12) gxGone(e);
    e.v = { u: e.fuse < 30 ? 1 : 0 };
  }, { init(e) { e.x = e.px; e.y = e.py; e.vx = e.vx || 0; e.vy = e.vy === undefined ? -1.2 : e.vy; e.fuse = 100 + rnd(20); e.fireT = 1e9; e.v = { u: 0 }; } }),
  // the ghost ship going down (see gx4bSinkStep), and Santa flying off
  gx4bSink: Object.assign(function (e) { gx4bSinkStep(e.v); if (e.v.t > 300) gxGone(e); }, { init(e) { e.x = FW / 2; e.y = FH + 1000; e.fireT = 1e9; } }),
  gx4bFlyOff: Object.assign(function (e) {
    const v = e.v; v.t++; v.x = gx4bR(v.x + v.d * 1.25); v.y = gx4bR(v.y + 0.6 - v.t * 0.013);
    if (v.t === 20 || v.t === 90) Sound.play('gx4bJingle');
    if (v.t > 260) gxGone(e);
  }, { init(e) { e.x = FW / 2; e.y = FH + 1000; e.fireT = 1e9; } }),
});

// ------------------------------------------------------------------ how they shoot
Object.assign(GX_FIRE, {
  gx4bBoat(e, g, near) { this.gxAimed(e, near(e.x, e.y), 1.15); return Math.round((240 + rnd(160)) / Math.max(0.4, g.fireMul)); },
  gx4bSoldier: () => 1e9,
  gx4bNut(e, g) { e.jaw = 26; return Math.round((160 + rnd(90)) / Math.max(0.4, g.fireMul)); },
  gx4bSnowman(e, g) { e.wind = 26; return Math.round((170 + rnd(110)) / Math.max(0.4, g.fireMul)); },
  // a jack-in-the-box, out: three shots at you now and then
  gx4bGift(e, g, near) {
    if (e.k !== 2) return 30;
    for (const sp of [-0.22, 0, 0.22]) this.gxAimed(e, near(e.x, e.y - 8), 1.2, sp);
    Sound.play('gx4bBoing');
    return Math.round((130 + rnd(70)) / Math.max(0.4, g.fireMul));
  },
  gx4bFogC: () => 1e9, gx4bAur: () => 1e9, gx4bWreck: () => 1e9, gx4bBye: () => 1e9,
});

// what touching them does
Object.assign(GX_COLLIDE, {
  gx4bFogC: () => false, gx4bAur: () => false, gx4bWreck: () => false, gx4bBye: () => false,
  gx4bBerg(e, t) { if (e.st === 'gx4bRise' && e.grow < 1) return false; const px = t.x + 8, py = t.y + 9; return Math.abs(px - e.x) < 16 && py > e.y - 13 && py < e.y + 9; },
});

// shot down
Object.assign(GX_ON_KILL, {
  gx4bFogC: () => false, gx4bAur: () => false, gx4bWreck: () => false, gx4bBye: () => false,
  // an iceberg cracks into two floes, a floe into shards flying every way
  gx4bBerg(e, p, g) {
    for (const s of [-1, 1]) this.gxSpawn({ type: 'gx4bFloe', st: 'gx4bDrift', px: e.x + s * 8, py: e.y, vx: s * (0.45 + Math.random() * 0.3), vy: 0.35 });
    this.popups.push({ x: e.x, y: e.y - 10, text: 'CRACK!', label: true, color: '#A8E8F8', t: 0, delay: 0, life: 40 });
    Sound.play('gx4bCrack'); gx4bRipple(g, e.x, e.y + 6);
  },
  gx4bFloe(e, p, g) {
    if (!p) return;
    const a0 = Math.random() * Math.PI / 3;
    for (let k = 0; k < 6; k++) { const a = a0 + k * Math.PI / 3; g.bullets.push({ x: e.x, y: e.y, vx: Math.cos(a) * 0.95 * g.shotSpd, vy: Math.sin(a) * 0.95 * g.shotSpd, k: 'shard', slow: true }); }
    Sound.play('gx4bCrack');
  },
  gx4bFlare(e) { this.popups.push({ x: e.x, y: e.y - 8, text: 'FIZZLE', label: true, color: '#A8E8F8', t: 0, delay: 0, life: 36 }); },
  gx4bGift(e) {
    const oops = e.kind === 'power' && e.k < 2, say = oops ? 'OOPS!' : e.k === 3 ? 'DEFUSED!' : null;
    if (say) this.popups.push({ x: e.x, y: e.y - 10, text: say, label: true, color: oops ? '#F8B8B8' : '#A8E8F8', t: 0, delay: 0, life: 45 });
  },
  gx4bList(e, p, g) {
    this.popups.push({ x: e.x, y: e.y, text: 'TORN UP!', label: true, color: COL.gold, t: 0, delay: 0, life: 70 });
    for (let k = 0; k < 4; k++) this.fx.push({ x: e.x - 20 + rnd(40), y: e.y - 14 + rnd(28), frames: Sprites.bigExp, per: 3, tick: -k * 4 });
    for (let k = 0; k < 3; k++) this.gxDrop(e.x - 16 + k * 16, e.y, 'gem');
    if (typeof gxShake === 'function') gxShake(g, 8, 2);
  },
});

Object.assign(Stage.prototype, {
  // a flare (or anything) bursts into sparks that fall like fireworks
  gx4bBurst(e, n, spd) {
    const g = this.galaxy;
    g.list = g.list.filter(o => o !== e); e.dead = true;
    const a0 = Math.random() * Math.PI;
    for (let k = 0; k < n; k++) { const a = a0 + k * Math.PI * 2 / n; g.bullets.push({ x: e.x, y: e.y, vx: Math.cos(a) * spd * g.shotSpd, vy: Math.sin(a) * spd * g.shotSpd, k: 'gx4bSpark', grav: 0.012, vmax: 1.3 }); }
    this.fx.push({ x: e.x, y: e.y, frames: Sprites.smallExp, per: 3, tick: 0 });
    Sound.play('gx4bPop');
  },
  // a bomb goes off: a ring of shots
  gx4bBoom(e, n, spd) {
    const g = this.galaxy;
    g.list = g.list.filter(o => o !== e); e.dead = true;
    const a0 = Math.random() * Math.PI;
    for (let k = 0; k < n; k++) { const a = a0 + k * Math.PI * 2 / n; g.bullets.push({ x: e.x, y: e.y, vx: Math.cos(a) * spd * g.shotSpd, vy: Math.sin(a) * spd * g.shotSpd, k: 'shot' }); }
    this.addFx(e.x, e.y, Sprites.bigExp, 3);
    Sound.play('explode');
  },
  // a gift box opens: a jack-in-the-box springs out, a bomb's fuse is lit, or a present pops out for you
  gx4bOpen(e) {
    const g = this.galaxy;
    Sound.play('gx4bBoing');
    if (e.kind === 'jack') { e.k = 2; e.t1 = 0; e.fireT = 40; return; }
    if (e.kind === 'bomb') { e.k = 3; e.fuse = 100; Sound.play('gx4bFuse'); return; }
    g.list = g.list.filter(o => o !== e); e.dead = true;
    this.gxDrop(e.x, e.y, gx4bPick(['cell', 'cell', 'box', 'shield', 'bomb', 'gem']));
    this.popups.push({ x: e.x, y: e.y - 10, text: 'A PRESENT!', label: true, color: COL.gold, t: 0, delay: 0, life: 50 });
    this.fx.push({ x: e.x, y: e.y, frames: Sprites.smallExp, per: 2, tick: 0 });
  },
  // a snowball lobbed to land where you are: it flies up and comes down (it falls under its own weight)
  gx4bLob(e, t) {
    if (!t) return;
    const g = this.galaxy, s = Math.min(1.35, g.shotSpd), G = 0.028 * s * s, vy = -1.1 * s, x0 = e.x + 6, y0 = e.y - 6;
    const T = Math.max(20, (-vy + Math.sqrt(vy * vy + 2 * G * Math.max(0, t.y + 9 - y0))) / G), vx = Math.max(-1.8, Math.min(1.8, (t.x + 8 - x0) / T));
    g.bullets.push({ x: x0, y: y0, vx, vy, k: 'gx4bSnowball', grav: G, vmax: 5 });
    Sound.play('gx4bThrow');
  },
});
// the sectors' own state: THE GHOST SEA's current, NORTH POLE's blizzard, splashes (guests get it too)
const gx4bState = g => g.gx4b || (g.gx4b = { cur: 0, curT: 600, curD: 1, curOn: 0, rip: [], bliz: 0, blizD: 1 });
// a splash on the swell: a ring spreading out
function gx4bRipple(g, x, y) { const G4 = gx4bState(g); if (G4.rip.length < 10) G4.rip.push([Math.round(x), Math.round(y), 0]); }

// ------------------------------------------------------------------ the new waves
Object.assign(GX_WAVE_KINDS, {
  // lifeboats rowing across, lane by lane; wisps dropping at you later
  gx4bFlotilla(g, add, types, more) {
    const n = Math.round(12 * more);
    for (let k = 0; k < n; k++) add('gx4bBoat', { st: 'gx4bRow', dirX: k % 2 ? -1 : 1, lane: (k >> 1) % 3, delay: Math.floor(k / 2) * 46 });
    for (let k = 0; k < 6; k++) add('drone', { st: 'kami', lane: k % 3, delay: 320 + k * 55 });
  },
  // icebergs drifting through: steer between them (shot, they crack); a few floes; wisps above
  gx4bBergs(g, add, types, more) {
    const n = Math.round(6 * more), lanes = [0.2, 0.7, 0.45, 0.85, 0.3, 0.6, 0.15, 0.8];
    for (let k = 0; k < n; k++) add('gx4bBerg', { st: 'gx4bDrift', px: Math.round(FW * lanes[k % lanes.length]), delay: 20 + k * 120 });
    for (let k = 0; k < 4; k++) add('gx4bFloe', { st: 'gx4bDrift', delay: 80 + k * 170 });
    for (let k = 0; k < 6; k++) add('drone', { st: 'enter', slot: [FW / 2 - 50 + k * 20, 22], from: k < 3 ? -1 : 1, delay: k * 8 });
  },
  // OVERBOARD!: deckchairs tumbling in; wisps streaming across
  gx4bChairs(g, add, types, more) {
    const n = Math.round(11 * more);
    for (let k = 0; k < n; k++) add('gx4bChair', { st: 'gx4bTumble', delay: 20 + k * 42 });
    for (let k = 0; k < 8; k++) add('drone', { st: 'stream', dirX: k % 2 ? -1 : 1, lane: (k >> 1) % 3, delay: 40 + Math.floor(k / 2) * 30 });
  },
  // the fog closes in: wisps lurk and lunge, lifeboats and their lanterns go by
  gx4bFog(g, add, types, more) {
    add('gx4bFogC', { st: 'gx4bFogC', delay: 0 });
    const n = Math.round(10 * more);
    for (let k = 0; k < n; k++) add('gx4bWisp', { st: 'gx4bLurk', delay: 60 + k * 45 });
    for (let k = 0; k < 4; k++) add('gx4bBoat', { st: 'gx4bRow', dirX: k % 2 ? -1 : 1, lane: k % 3, delay: 120 + k * 90 });
  },
  // SOS: flares shoot up from below (warned) and burst; the lifeboats that fire them cross the top
  gx4bFlares(g, add, types, more) {
    const n = Math.round(10 * more);
    let last = -99;
    for (let k = 0; k < n; k++) { let x; do x = 14 + rnd(FW - 28); while (Math.abs(x - last) < 40); last = x; add('gx4bFlare', { st: 'gx4bFlareUp', px: x, lead: true, delay: 50 + k * 66 }); }
    for (let k = 0; k < 4; k++) add('gx4bBoat', { st: 'gx4bRow', dirX: k % 2 ? -1 : 1, lane: k % 2, delay: k * 60 });
    for (let k = 0; k < 4; k++) add('drone', { st: 'enter', slot: [FW / 2 - 30 + k * 20, 60], from: k < 2 ? -1 : 1, delay: 30 + k * 8 });
  },
  // presents float down and open: jacks-in-the-box, bombs, and presents for you (the wrapping tells which)
  gx4bPresents(g, add, types, more) {
    const n = Math.round(9 * more), kinds = ['jack', 'bomb', 'power', 'jack', 'bomb', 'jack', 'power', 'bomb'];
    for (let k = 0; k < n; k++) add('gx4bGift', { st: 'gx4bGiftFall', px: 18 + ((k * 67) % (FW - 36)), kind: kinds[k % kinds.length], delay: 30 + k * 70 });
    for (let k = 0; k < 6; k++) add('drone', { st: 'enter', slot: [FW / 2 - 50 + k * 20, 20], from: k < 3 ? -1 : 1, delay: k * 8 });
  },
  // two rows of toy soldiers marching (and halting to fire volleys), nutcrackers standing guard
  gx4bParade(g, add, types, more) {
    const n = Math.min(9, Math.round(6 * more));
    for (let r = 0; r < 2; r++) for (let i = 0; i < n; i++) add('gx4bSoldier', { st: 'gx4bMarch', row: r, i, lead: i === 0, delay: r * 140 });
    for (let k = 0; k < 2; k++) add('gx4bNut', { st: 'gx4bStand', px: Math.round(FW * (k ? 0.82 : 0.18)), py: 70, delay: 200 + k * 30 });
  },
  // snowmen on the ice, lobbing snowballs; elves dropping at you
  gx4bSnowball(g, add, types, more) {
    const n = Math.round(6 * more);
    for (let k = 0; k < n; k++) add('gx4bSnowman', { st: 'gx4bSlide', tx: 20 + ((k * 53) % (FW - 40)), ty: 22 + (k % 3) * 20, delay: k * 50 });
    for (let k = 0; k < 6; k++) add('drone', { st: 'kami', lane: k % 3, delay: 260 + k * 60 });
  },
  // the aurora curtain hangs across the sky: elves and snowmen behind it, your shots bounce off it but for its gaps
  gx4bAurora(g, add, types, more) {
    add('gx4bAur', { st: 'gx4bAur', delay: 0 });
    const cols = 6, sx = Math.min(24, (FW - 40) / (cols - 1)), x0 = (FW - sx * (cols - 1)) / 2;
    for (let r = 0; r < 2; r++) for (let c = 0; c < cols; c++) add('drone', { st: 'enter', slot: [x0 + c * sx, 18 + r * 16], from: c < cols / 2 ? -1 : 1, delay: 40 + r * 40 + c * 6 });
    for (let k = 0; k < Math.round(3 * more); k++) add('gx4bSnowman', { st: 'gx4bSlide', tx: Math.round(FW * (0.2 + (k % 3) * 0.3)), ty: 46, delay: 160 + k * 40 });
  },
  // the naughty list: your name on it; it lobs coal until you tear it up
  gx4bNaughty(g, add, types, more) {
    add('gx4bList', { st: 'gx4bUnroll', delay: 10 });
    for (let k = 0; k < 8; k++) add('drone', { st: 'stream', dirX: k % 2 ? -1 : 1, lane: (k >> 1) % 3, delay: 100 + Math.floor(k / 2) * 40 });
    if (more > 1.3) for (let k = 0; k < 2; k++) add('gx4bNut', { st: 'gx4bStand', px: Math.round(FW * (k ? 0.85 : 0.15)), py: 64, delay: 300 });
  },
});

// ------------------------------------------------------------------ every frame: shots that fall, sway and burst; the current, the frost, the curtain
GX_FRAME.push(function (g) {
  const G4 = gx4bState(g), pl = this.gxPlayers();
  G4.rip = G4.rip.filter(r => ++r[2] < 32);
  if (this.freezeE > 0) return;
  // their shots: snowballs and sparks fall, ghost smoke sways, notes waltz, flakes flutter, rockets burst
  let pop = null;
  for (const b of g.bullets) {
    if (b.grav) b.vy = Math.min(b.vmax || 2, b.vy + b.grav);
    if (b.k === 'gx4bSmoke') { b.age = (b.age || 0) + 1; b.vx = Math.sin(b.age / 24 + (b.ph || 0)) * 0.45 + (b.dx || 0); }
    else if (b.k === 'gx4bNote') {
      b.age = (b.age || 0) + 1;
      const a = Math.cos(b.age / 18 + (b.ph || 0)) * 0.02 * (b.bend || 1), c = Math.cos(a), s = Math.sin(a), vx = b.vx;
      b.vx = vx * c - b.vy * s; b.vy = vx * s + b.vy * c;
    } else if (b.k === 'gx4bFlake') { b.age = (b.age || 0) + 1; b.vy = Math.sin(b.age / 9 + (b.ph || 0)) * 0.4; }
    else if (b.k === 'gx4bRocket') { b.vy += 0.05; if (b.vy > -0.25) { b.dead = true; (pop || (pop = [])).push(b); } }
  }
  if (pop) {
    g.bullets = g.bullets.filter(b => !b.dead);
    for (const r of pop) for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4 + 0.2; g.bullets.push({ x: r.x, y: r.y, vx: Math.cos(a) * 0.8 * g.shotSpd, vy: Math.sin(a) * 0.8 * g.shotSpd, k: 'gx4bSpark', grav: 0.014, vmax: 1.3 }); }
    Sound.play('gx4bPop');
  }
  // the ghost band's waltz bends your shots
  const bo = g.boss;
  if (bo && bo.band > 0) for (const s of g.shots) if (s.k !== 'm') s.vx = Math.max(-1.6, Math.min(1.6, s.vx + Math.cos((s.y + g.t * 2) / 16) * 0.16));
  // the aurora curtain bounces your shots back down, but for its gaps
  const au = g.list.find(e => e.type === 'gx4bAur');
  if (au && au.a > 0.5) for (const s of g.shots) {
    if (s.vy >= 0 || Math.abs(s.y - au.cy) > 5) continue;
    if (au.segs[Math.max(0, Math.min(GX4B_SEGS - 1, Math.floor(s.x / (FW / GX4B_SEGS))))] === '0') continue;
    s.vy = Math.abs(s.vy) * 0.55; s.vx = -s.vx * 0.5 + (Math.random() - 0.5) * 0.8; s.y = au.cy + 6;
    if (this.frame % 4 === 0) Sound.play('gx4bTing');
  }
  // THE GHOST SEA: now and then a current (warned) sweeps your ship sideways for a while
  if (gx4bIs(g, GX4B_SEA) && (g.phase === 'wave' || g.phase === 'between')) {
    if (--G4.curT <= 0) {
      if (!G4.curOn) { G4.curOn = 1; G4.curD = rnd(2) ? 1 : -1; G4.curT = 330; g.banner = { text: G4.curD > 0 ? 'CURRENT  >>>' : '<<<  CURRENT', t: 100, warn: true }; Sound.play('gx4bSwell'); }
      else { G4.curOn = 0; G4.curT = 700 + rnd(500); }
    }
  } else G4.curOn = 0;
  G4.cur += ((G4.curOn && G4.curT < 250 ? G4.curD : 0) - G4.cur) * 0.03;
  if (Math.abs(G4.cur) < 0.01) G4.cur = 0;
  if (G4.cur) for (const t of pl) t.x = Math.max(0, Math.min(FW - 16, t.x + G4.cur * 0.42));
  // Santa's blizzard: the wind pushes too
  if (G4.bliz > 0 && --G4.bliz < 220) for (const t of pl) t.x = Math.max(0, Math.min(FW - 16, t.x + G4.blizD * 0.3));
  // NORTH POLE: a ship that sits still ices up, and is slow until it's shaken it off
  const pole = gx4bIs(g, GX4B_POLE) && (g.phase === 'wave' || g.phase === 'between');
  for (const t of pl) {
    const gp = gxPlayer(t.player);
    if (!pole) { if (gp.frost) gp.frost = 0; t.gx4bStill = 0; continue; }
    if (t.moving) {
      t.gx4bStill = 0;
      if (gp.frost > 0) { t.acc = (t.acc || 0) - 0.6 * Math.min(1, gp.frost * 2); gp.frost = Math.max(0, gx4bR2(gp.frost - 1 / 60)); }
    } else if (++t.gx4bStill > 150) {
      const was = gp.frost || 0;
      gp.frost = Math.min(1, gx4bR2(was + 1 / 90));
      if (was < 1 && gp.frost >= 1) { this.popups.push({ x: t.x + 8, y: t.y - 4, text: 'FROZEN! MOVE!', label: true, color: '#A8E8F8', t: 0, delay: 0, life: 70 }); Sound.play('gx4bFreeze'); }
    }
  }
});
const gx4bR2 = n => Math.round(n * 1000) / 1000;

// ------------------------------------------------------------------ drawing them
const gx4bImgOf = (type, f, e) => GxGfx.get(type, f, e.flash > 0 ? 'f' : 'n');
// an image centred on (x, y), mirrored if fl, turned by a (pixel-sharp)
function gx4bPut(ctx, img, x, y, fl, a) {
  if (!fl && !a) { ctx.drawImage(img, Math.round(x - img.width / 2), Math.round(y - img.height / 2)); return; }
  ctx.save(); ctx.translate(Math.round(x), Math.round(y)); if (a) ctx.rotate(a); if (fl) ctx.scale(-1, 1);
  ctx.drawImage(img, -Math.round(img.width / 2), -Math.round(img.height / 2)); ctx.restore();
}
// a soft glow (a lantern, a wisp, an ember)
function gx4bGlow(ctx, x, y, r, col, a) { ctx.globalAlpha = a; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(Math.round(x), Math.round(y), r, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; }
// a straight line of pixels
function gx4bLine(ctx, x0, y0, x1, y1, col, step = 1) {
  ctx.fillStyle = col;
  const n = Math.max(1, Math.round(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
  for (let i = 0; i <= n; i += step) ctx.fillRect(Math.round(x0 + (x1 - x0) * i / n), Math.round(y0 + (y1 - y0) * i / n), 1, 1);
}
Object.assign(GX_RENDER, {
  gx4bWisp(ctx, e, f) {
    const v = e.v || {}, k = v.k | 0, x = e.x + (k === 1 ? ((f >> 1) & 1 ? 1 : -1) : 0);
    gx4bGlow(ctx, x, e.y + 1, k === 1 ? 9 + (f & 3) : 7, k === 1 ? '#C8F8F0' : '#3CBCB8', k === 1 ? 0.45 : 0.22 + 0.08 * Math.sin(f / 5 + e.x));
    ctx.drawImage(gx4bImgOf('gx4bWisp', (f >> 3) & 1, e), Math.round(x - 5), Math.round(e.y - 6));
  },
  gx4bBoat(ctx, e, f) {
    const v = e.v || {}, s = v.fl ? -1 : 1;
    gx4bGlow(ctx, e.x + s * 8.5, e.y - 4, 4 + ((f >> 3) & 1), '#F8D878', 0.3);
    gx4bPut(ctx, gx4bImgOf('gx4bBoat', v.o | 0, e), e.x, e.y, v.fl);
  },
  gx4bChair(ctx, e) { ctx.drawImage(gx4bImgOf('gx4bChair', (e.v && e.v.r) | 0, e), Math.round(e.x - 7), Math.round(e.y - 7)); },
  gx4bBerg(ctx, e, f) {
    const gr = e.v && e.v.g !== undefined ? e.v.g : 1, img = gx4bImgOf('gx4bBerg', (f >> 4) & 1, e);
    if (gr < 1) {   // the ram's iceberg, rising out of the fog: its tip first
      const h = Math.max(1, Math.round(img.height * gr));
      ctx.globalAlpha = 0.4 + 0.6 * gr; ctx.drawImage(img, 0, 0, img.width, h, Math.round(e.x - 17), Math.round(e.y - 15 + img.height - h), img.width, h); ctx.globalAlpha = 1;
      gx4bGlow(ctx, e.x, e.y + 15, 18, '#58F8D8', 0.12);
      return;
    }
    ctx.drawImage(img, Math.round(e.x - 17), Math.round(e.y - 15));
  },
  // an SOS flare: its warning at the bottom, then a red star going up on a trail of smoke
  gx4bFlare(ctx, e, f) {
    const x = Math.round(e.x), y = Math.round(e.y);
    if (e.warnT > 0) {
      if ((f >> 2) & 1) { ctx.fillStyle = '#F83800'; ctx.fillRect(x - 4, FH - 4, 9, 3); Font.draw(ctx, '^', x - 3, FH - 13, '#F83800'); }
      if (e.warnT < 30) { ctx.fillStyle = 'rgba(248,56,0,0.35)'; for (let yy = FH - 20; yy > FH * 0.3; yy -= 8) ctx.fillRect(x, yy, 1, 3); }
      return;
    }
    const n = (e.v && e.v.s) | 0;
    for (let i = 0; i < n + 3; i++) { ctx.globalAlpha = Math.max(0, 0.5 - i * 0.04); ctx.fillStyle = i < 2 ? '#F8B800' : '#BCBCBC'; ctx.fillRect(x - (i > 3 ? 1 : 0) + ((i * 7 + f) % 3 === 0 ? 1 : 0), y + 5 + i * 3, i > 3 ? 2 : 1, 3); }
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#7C7C7C'; ctx.fillRect(x, y - 1, 1, 6);
    gx4bGlow(ctx, x, y - 2, 4 + (f & 1), '#F83800', 0.4);
    ctx.fillStyle = e.flash > 0 ? '#F8F8F8' : '#F83800'; ctx.fillRect(x - 1, y - 4, 3, 4); ctx.fillStyle = '#F8F8F8'; ctx.fillRect(x, y - 4, 1, 1);
  },
  gx4bFogC() {}, gx4bAur() {},
  gx4bSoldier(ctx, e) { const v = e.v || {}; ctx.drawImage(gx4bImgOf('gx4bSoldier', v.k ? 2 : v.s | 0, e), Math.round(e.x - 5), Math.round(e.y - 8)); },
  gx4bNut(ctx, e) { ctx.drawImage(gx4bImgOf('gx4bNut', (e.v && e.v.k) | 0, e), Math.round(e.x - 7), Math.round(e.y - 11)); },
  gx4bSnowman(ctx, e) { ctx.drawImage(gx4bImgOf('gx4bSnowman', (e.v && e.v.k) | 0, e), Math.round(e.x - 8), Math.round(e.y - 10)); },
  gx4bCoal(ctx, e, f) {
    gx4bGlow(ctx, e.x, e.y, 5 + ((f >> 2) & 1), '#F87830', 0.3);
    ctx.drawImage(gx4bImgOf('gx4bCoal', (f >> 2) & 1, e), Math.round(e.x - 4), Math.round(e.y - 4));
  },
  gx4bPBomb(ctx, e, f) {
    if (e.v && e.v.u && (f >> 2) & 1) gx4bGlow(ctx, e.x, e.y, 9, '#F83800', 0.35);
    ctx.drawImage(gx4bImgOf('gx4bPBomb', (f >> 2) & 1, e), Math.round(e.x - 6), Math.round(e.y - 6));
  },
  // a gift box: on its parachute, shaking, then open (a jack-in-the-box bouncing on its spring, or a bomb's fuse burning)
  gx4bGift(ctx, e, f) {
    const v = e.v || { k: 0, c: 'jack', u: 0 }, c = GX4B_GIFT_PALS[v.c] ? v.c : 'jack', fl = e.flash > 0, x = Math.round(e.x), y = Math.round(e.y);
    const pal = fl ? BOSS_PALS.f : GX4B_GIFT_PALS[c];
    if (v.k === 0) {   // the parachute
      ctx.fillStyle = '#100808'; ctx.fillRect(x - 8, y - 20, 17, 5);
      for (let i = 0; i < 15; i++) { ctx.fillStyle = (i >> 2) & 1 ? '#F8F8F8' : c === 'bomb' ? '#383040' : '#58B8F8'; ctx.fillRect(x - 7 + i, y - 19 + (i < 2 || i > 12 ? 1 : 0), 1, i < 2 || i > 12 ? 2 : 3); }
      gx4bLine(ctx, x - 7, y - 16, x - 5, y - 7, '#BCBCBC'); gx4bLine(ctx, x + 7, y - 16, x + 5, y - 7, '#BCBCBC');
    }
    if (v.k <= 1) {
      const sh = v.k === 1 ? ((f >> 1) & 1 ? 1 : -1) : 0, hop = v.k === 1 && (v.u >> 3) & 1 ? 1 : 0;
      ctx.drawImage(gx4bImg('gift' + c + hop + fl, () => GX_DRAW.gx4bGift(hop), pal), x - 7 + sh, y - 7);
      if (c === 'power' && (f >> 3) % 3 === 0) { ctx.fillStyle = '#F8F8F8'; ctx.fillRect(x + 5, y - 9, 1, 3); ctx.fillRect(x + 4, y - 8, 3, 1); }
      return;
    }
    ctx.drawImage(gx4bImg('giftO' + c + fl, () => GX_DRAW.gx4bGiftOpen(), pal), x - 7, y - 7);
    if (v.k === 3) {   // the bomb in it, its fuse burning down (blinking red at the end)
      const hot = v.u < 4 && (f >> 1) & 1;
      ctx.fillStyle = '#100808'; ctx.beginPath(); ctx.arc(x, y - 6, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = hot ? '#F83800' : '#383040'; ctx.beginPath(); ctx.arc(x, y - 6, 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#F8F8F8'; ctx.fillRect(x - 2, y - 8, 1, 1);
      const fx = x + 3 + Math.min(4, v.u >> 1), fy = y - 10 - Math.min(3, v.u >> 2);
      gx4bLine(ctx, x + 2, y - 9, fx, fy, '#C8A870');
      ctx.fillStyle = f & 1 ? '#F8F8F8' : '#F8B800'; ctx.fillRect(fx - 1, fy - 1, 2, 2); ctx.fillStyle = '#F83800'; ctx.fillRect(fx + ((f >> 1) & 1), fy - 2, 1, 1);
      return;
    }
    // the jack: a spring, bouncing, a jester's head on it
    const up = v.k === 4 ? 2 : 4 + Math.round(Math.abs(Math.sin(v.u / 64 * Math.PI * 4)) * 7), hy = y - 6 - up;
    for (let i = 0; i < up; i += 2) { ctx.fillStyle = '#BCBCBC'; ctx.fillRect(x - 2 + ((i >> 1) & 1) * 2, y - 6 - i, 3, 1); }
    ctx.fillStyle = '#100808'; ctx.fillRect(x - 5, hy - 5, 11, 10);
    ctx.fillStyle = fl ? '#F8F8F8' : '#F8E8D8'; ctx.fillRect(x - 4, hy - 4, 9, 8);
    ctx.fillStyle = fl ? '#F8F8F8' : '#A050D8'; ctx.fillRect(x - 6, hy - 8, 6, 4); ctx.fillStyle = fl ? '#F8F8F8' : '#F8D800'; ctx.fillRect(x + 1, hy - 8, 6, 4);   // its jester's hat
    ctx.fillStyle = '#F8D800'; ctx.fillRect(x - 7, hy - 9, 2, 2); ctx.fillStyle = '#A050D8'; ctx.fillRect(x + 6, hy - 9, 2, 2);
    ctx.fillStyle = '#100808'; ctx.fillRect(x - 2, hy - 2, 1, 2); ctx.fillRect(x + 2, hy - 2, 1, 2); ctx.fillRect(x - 2, hy + 2, 5, 1);
    ctx.fillStyle = '#F83800'; ctx.fillRect(x, hy, 1, 1);
  },
  // the naughty list: a scroll unrolled from a rod, YOU on it (more than once)
  gx4bList(ctx, e, f) {
    const v = e.v || { len: 50, d: 0, c: 0 }, x0 = Math.round(e.x - 33), y0 = 14, len = Math.max(2, v.len), fl = e.flash > 0;
    ctx.fillStyle = '#100808'; ctx.fillRect(x0 + 1, y0, 64, len + 2);
    ctx.fillStyle = fl ? '#F8F8F8' : '#F0E0B0'; ctx.fillRect(x0 + 2, y0, 62, len);
    ctx.fillStyle = '#C8A870'; ctx.fillRect(x0 + 2, y0, 1, len); ctx.fillRect(x0 + 63, y0, 1, len);
    if (len > 12 && !fl) {
      Font.draw(ctx, 'NAUGHTY', x0 + 5, y0 + 2, '#C82020');
      if (typeof gxTiny === 'function') {
        gxTiny(ctx, 'LIST', e.x, y0 + 11, '#C82020', null);
        const names = ['YOU', 'P1 TANK', 'YOU AGAIN', 'STILL YOU', 'UFO'];
        for (let i = 0; i < names.length && y0 + 19 + i * 7 < y0 + len - 5; i++) {
          gxTiny(ctx, names[i], x0 + 8 + names[i].length * 2, y0 + 19 + i * 7, '#3C2C1C', null);
          ctx.fillStyle = '#C82020'; ctx.fillRect(x0 + 55, y0 + 20 + i * 7, 3, 1); ctx.fillRect(x0 + 56, y0 + 19 + i * 7, 1, 3);
        }
      }
    }
    for (let k = 0; k < v.d; k++) { const tx = x0 + 9 + ((k * 19) % 46), ty = y0 + 10 + ((k * 13) % Math.max(4, len - 14)); ctx.fillStyle = '#100808'; ctx.fillRect(tx, ty, 3, 2); ctx.fillRect(tx + 1, ty + 2, 2, 2); }   // torn
    for (const yy of [y0 - 2, y0 + len]) { ctx.fillStyle = '#100808'; ctx.fillRect(x0 - 1, yy - 1, 68, 5); ctx.fillStyle = '#7C4C20'; ctx.fillRect(x0, yy, 66, 3); ctx.fillStyle = '#A8743C'; ctx.fillRect(x0, yy, 66, 1); ctx.fillStyle = '#F8D800'; ctx.fillRect(x0 - 1, yy, 2, 3); ctx.fillRect(x0 + 65, yy, 2, 3); }
    if (v.c && len >= 46) for (let k = 0; k < 3; k++) gx4bGlow(ctx, x0 + 19 + k * 14, y0 + len + 3, 3 + ((f >> 1) & 1), '#F87830', 0.5);
  },
  gx4bWreck(ctx, e) { gx4bDrawWreck(ctx, e.v); },
  gx4bBye(ctx, e, f) { gx4bDrawBye(ctx, e.v, f); },
});

// their shots (the red danger glow is drawn first by the core)
Object.assign(GX_BULLET_DRAW, {
  // ghost smoke: a little wailing wisp
  gx4bSmoke(ctx, x, y, f, hot) {
    ctx.fillStyle = hot; ctx.fillRect(x - 4, y - 4, 9, 8); ctx.fillRect(x - 3, y + 3, 6, 2);
    ctx.fillStyle = '#B8E8E0'; ctx.fillRect(x - 3, y - 3, 7, 5); ctx.fillRect(x - 2 + ((f >> 3) & 1), y + 2, 4, 2);
    ctx.fillStyle = '#F8F8F8'; ctx.fillRect(x - 2, y - 3, 2, 1);
    ctx.fillStyle = '#103030'; ctx.fillRect(x - 2, y - 1, 1, 2); ctx.fillRect(x + 1, y - 1, 1, 2); ctx.fillRect(x - 1, y + 1, 2, 1);
  },
  // a note of the ghost band's waltz
  gx4bNote(ctx, x, y, f, hot) {
    ctx.fillStyle = hot; ctx.fillRect(x - 4, y - 5, 9, 10);
    ctx.fillStyle = '#A8F8C8'; ctx.fillRect(x - 3, y + 1, 4, 3); ctx.fillRect(x, y - 4, 1, 5); ctx.fillRect(x + 1, y - 4, 2, 1); ctx.fillRect(x + 2, y - 3, 1, 2);
    ctx.fillStyle = '#F8F8F8'; ctx.fillRect(x - 2, y + 1, 1, 1);
  },
  // sparks of a burst flare
  gx4bSpark(ctx, x, y, f, hot) {
    ctx.fillStyle = hot; ctx.fillRect(x - 3, y - 1, 7, 3); ctx.fillRect(x - 1, y - 3, 3, 7);
    ctx.fillStyle = (f >> 1) & 1 ? '#F8D878' : '#F87858'; ctx.fillRect(x - 2, y, 5, 1); ctx.fillRect(x, y - 2, 1, 5);
    ctx.fillStyle = '#F8F8F8'; ctx.fillRect(x, y, 1, 1);
  },
  // a distress rocket going up
  gx4bRocket(ctx, x, y, f, hot) {
    ctx.fillStyle = hot; ctx.fillRect(x - 2, y - 3, 5, 9);
    ctx.fillStyle = '#BCBCBC'; ctx.fillRect(x, y, 1, 5); ctx.fillStyle = '#F83800'; ctx.fillRect(x - 1, y - 2, 3, 3); ctx.fillStyle = '#F8F8F8'; ctx.fillRect(x, y - 2, 1, 1);
    ctx.fillStyle = (f >> 1) & 1 ? '#F8D800' : '#F87830'; ctx.fillRect(x, y + 5, 1, 2);
  },
  // a toy soldier's cork
  gx4bCork(ctx, x, y, f, hot) {
    ctx.fillStyle = hot; ctx.fillRect(x - 3, y - 4, 7, 8);
    ctx.fillStyle = '#C89058'; ctx.fillRect(x - 2, y - 3, 5, 6); ctx.fillStyle = '#E8B878'; ctx.fillRect(x - 2, y - 3, 5, 1); ctx.fillStyle = '#7C5428'; ctx.fillRect(x - 1, y, 1, 1); ctx.fillRect(x + 1, y + 1, 1, 1);
  },
  // a nut
  gx4bNutB(ctx, x, y, f, hot) {
    ctx.fillStyle = hot; ctx.fillRect(x - 3, y - 4, 7, 8);
    ctx.fillStyle = '#A06030'; ctx.fillRect(x - 2, y - 1, 5, 4); ctx.fillStyle = '#D8A060'; ctx.fillRect(x - 2, y - 3, 5, 2); ctx.fillStyle = '#F8D8A8'; ctx.fillRect(x - 1, y - 3, 1, 1);
  },
  gx4bSnowball(ctx, x, y, f, hot) {
    ctx.fillStyle = hot; ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#C8D8F0'; ctx.beginPath(); ctx.arc(x, y, 3.6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#F8F8F8'; ctx.fillRect(x - 2, y - 2, 3, 3);
  },
  gx4bCoalB(ctx, x, y, f, hot) {
    ctx.fillStyle = hot; ctx.fillRect(x - 3, y - 3, 7, 7);
    ctx.fillStyle = '#282830'; ctx.fillRect(x - 2, y - 2, 5, 5); ctx.fillStyle = (f >> 1) & 1 ? '#F87830' : '#F8B800'; ctx.fillRect(x, y - 1, 1, 2); ctx.fillStyle = '#5C5C68'; ctx.fillRect(x - 2, y - 2, 1, 1);
  },
  // HO HO HO: peppermints, every way
  gx4bHo(ctx, x, y, f, hot) {
    ctx.fillStyle = hot; ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#F8F8F8'; ctx.beginPath(); ctx.arc(x, y, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#E02818'; const r = (f >> 2) & 1; ctx.fillRect(x - 2, y - 2 + r, 2, 1); ctx.fillRect(x + 1 - r, y - 2, 1, 2); ctx.fillRect(x, y + 1 - r, 2, 1); ctx.fillRect(x - 2 + r, y, 1, 2);
  },
  gx4bFlake(ctx, x, y, f, hot) {
    ctx.fillStyle = hot; ctx.fillRect(x - 3, y - 3, 7, 7);
    ctx.fillStyle = '#F8F8F8'; ctx.fillRect(x - 3, y, 7, 1); ctx.fillRect(x, y - 3, 1, 7); ctx.fillRect(x - 2, y - 2, 1, 1); ctx.fillRect(x + 2, y - 2, 1, 1); ctx.fillRect(x - 2, y + 2, 1, 1); ctx.fillRect(x + 2, y + 2, 1, 1);
    ctx.fillStyle = '#A8E8F8'; ctx.fillRect(x, y, 1, 1);
  },
});

// Santa's present for you: a green box, a gold ribbon. A power level, a bomb, points and credits
GX_PICKUPS.gx4bGift = {
  collect(t, u) {
    const p = t.player, gp = gxPlayer(p);
    if (gp.power < GX_POWER_MAX) gp.power++;
    gp.bombs = Math.min(5, gp.bombs + 1);
    this.addScore(p, 5000);
    if (typeof gxCash === 'function') gxCash(p, 150);
    this.popups.push({ x: t.x + 8, y: t.y - 4, text: 'A PRESENT! +5000', label: true, color: COL.gold, t: 0, delay: 0, life: 80 });
    Sound.play('bonus'); Sound.play('gx4bJingle');
  },
  draw(ctx, x, y, t, R) {
    R(-7, -6, 14, 13, '#100808'); R(-6, -5, 12, 11, '#38A848'); R(-6, -5, 12, 1, '#78E888'); R(-1, -5, 2, 11, '#F8C838'); R(-6, -1, 12, 2, '#F8C838');
    R(-5, -9, 4, 3, '#F8C838'); R(1, -9, 4, 3, '#F8C838'); R(-1, -8, 2, 2, '#F8E878');
    if ((t >> 3) & 1) { R(6, -9, 1, 3, '#F8F8F8'); R(5, -8, 3, 1, '#F8F8F8'); }
  },
};

// ------------------------------------------------------------------ over the field: splashes, the curtain, the fog, the blizzard, the current, frost
let GX4B_FOG = null;
function gx4bOver(ctx, g) {
  const f = this.frame, G4 = g.gx4b, W = VIEW_W, H = VIEW_H;
  if (G4) for (const [x, y, t] of G4.rip) {   // splashes: a ring spreading out on the swell
    ctx.globalAlpha = Math.max(0, 0.6 * (1 - t / 32)); ctx.strokeStyle = '#A8F8E8'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(x, y, 3 + t * 0.6, 1 + t * 0.2, 0, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
  }
  const au = g.list.find(e => e.type === 'gx4bAur'), fog = g.list.find(e => e.type === 'gx4bFogC');
  if (au && au.v && au.v.a > 0) gx4bDrawCurtain(ctx, au.v, f);
  if (fog && fog.v && fog.v.a > 0) gx4bDrawFog.call(this, ctx, g, fog.v.a, f);
  // the current: streaks rushing sideways across your zone
  if (G4 && G4.cur && Math.abs(G4.cur) > 0.04) {
    const k = Math.abs(G4.cur), d = Math.sign(G4.cur);
    for (let i = 0; i < 14; i++) { const y = Math.round(H * 0.38 + ((i * 41) % Math.round(H * 0.6))), x = ((i * 67 + f * 3 * d) % (W + 30) + W + 30) % (W + 30) - 15; ctx.fillStyle = 'rgba(168,248,232,' + (0.3 * k).toFixed(2) + ')'; ctx.fillRect(Math.round(x), y, 10 + (i % 3) * 4, 1); }
  }
  // the blizzard: a white haze, snow streaking along on the wind
  if (G4 && G4.bliz > 0) {
    const k = Math.min(1, (260 - G4.bliz) / 40, G4.bliz / 30), d = G4.blizD || 1;
    ctx.fillStyle = 'rgba(220,232,248,' + (0.12 * k).toFixed(2) + ')'; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 46; i++) { const y = Math.round((i * 37 + f * 1.3 + (i % 5) * 11) % H), x = ((i * 53 + f * 6 * d) % (W + 40) + W + 40) % (W + 40) - 20; ctx.fillStyle = 'rgba(248,248,248,' + ((0.3 + (i % 3) * 0.15) * k).toFixed(2) + ')'; ctx.fillRect(Math.round(x), y, 6 + (i % 4) * 3, 1); }
  }
  // frost on a ship that's sat still
  for (const t of this.tanks) {
    const fr = t.alive && t.isPlayer && t.player && t.player.gx ? t.player.gx.frost || 0 : 0;
    if (fr <= 0) continue;
    const x = Math.round(t.x), y = Math.round(t.y), n = Math.round(2 + fr * 7);
    if (fr >= 1) {   // a block of ice
      ctx.fillStyle = 'rgba(168,232,248,0.45)'; ctx.fillRect(x - 2, y - 2, 20, 20);
      ctx.fillStyle = '#E8F8F8'; ctx.fillRect(x - 2, y - 2, 20, 1); ctx.fillRect(x - 2, y - 2, 1, 20); ctx.fillStyle = '#88C8E8'; ctx.fillRect(x - 2, y + 17, 20, 1); ctx.fillRect(x + 17, y - 2, 1, 20);
      ctx.fillStyle = 'rgba(248,248,248,0.7)'; for (let i = 0; i < 6; i++) ctx.fillRect(x + 2 + i, y + 8 - i, 1, 1);
    }
    ctx.fillStyle = '#E0F8F8';   // frost creeping in from its corners
    for (const [cx, cy, sx, sy] of [[x - 1, y - 1, 1, 1], [x + 16, y - 1, -1, 1], [x - 1, y + 16, 1, -1], [x + 16, y + 16, -1, -1]]) { ctx.fillRect(sx > 0 ? cx : cx - n + 1, cy, n, 1); ctx.fillRect(cx, sy > 0 ? cy : cy - n + 1, 1, n); ctx.fillRect(cx + sx * 2, cy + sy * 2, 1, 1); }
  }
}
// the curtain: ribbons of green, teal and pink light, rippling; its gaps dotted; a segment about to change flickers
function gx4bDrawCurtain(ctx, v, f) {
  const y = v.y, sw = FW / GX4B_SEGS, s = v.s || '';
  for (let k = 0; k < GX4B_SEGS; k++) {
    const st = +s[k], x0 = Math.round(k * sw), x1 = Math.round((k + 1) * sw);
    if (st === 0) { ctx.fillStyle = 'rgba(88,248,168,' + (0.25 * v.a).toFixed(2) + ')'; for (let x = x0; x < x1; x += 3) { ctx.fillRect(x, y - 7, 1, 1); ctx.fillRect(x, y + 6, 1, 1); } continue; }
    const a = v.a * (st === 1 ? ((f >> 2) & 1 ? 0.75 : 0.3) : 1);
    for (let x = x0; x < x1; x++) {
      const w = Math.round(Math.sin((x + f * 0.7) / 9 + k) * 2), fold = 0.55 + 0.45 * Math.sin(x / 2.5 + f / 9 + k), col = ['88,248,168', '88,216,248', '248,120,200'][Math.floor((x + f * 0.5) / 13) % 3];
      ctx.fillStyle = 'rgba(' + col + ',' + (0.12 * a * fold).toFixed(3) + ')'; ctx.fillRect(x, y - 14 + w, 1, 6);
      ctx.fillStyle = 'rgba(' + col + ',' + (0.3 * a * fold).toFixed(3) + ')'; ctx.fillRect(x, y - 8 + w, 1, 4);
      ctx.fillStyle = 'rgba(' + col + ',' + (0.6 * a * fold).toFixed(3) + ')'; ctx.fillRect(x, y - 4 + w, 1, 8);
      ctx.fillStyle = 'rgba(' + col + ',' + (0.2 * a).toFixed(3) + ')'; ctx.fillRect(x, y + 4 + w, 1, 3);
      if ((x + f) % 11 === 0) { ctx.fillStyle = 'rgba(248,248,248,' + (0.6 * a).toFixed(2) + ')'; ctx.fillRect(x, y - 5 + w, 1, 7); }
    }
  }
}
// the fog: thick everywhere but round your ship (your lantern), the wisps and the boats' lanterns; their shots glow through it
function gx4bDrawFog(ctx, g, a, f) {
  const W = VIEW_W, H = VIEW_H;
  if (!GX4B_FOG || GX4B_FOG.width !== W || GX4B_FOG.height !== H) GX4B_FOG = makeCanvas(W, H);
  const c = GX4B_FOG.getContext('2d');
  c.globalCompositeOperation = 'source-over'; c.clearRect(0, 0, W, H);
  c.fillStyle = 'rgba(10,24,30,' + (0.93 * a).toFixed(3) + ')'; c.fillRect(0, 0, W, H);
  for (let k = 0; k < 7; k++) { c.fillStyle = 'rgba(70,104,110,' + (0.1 * a).toFixed(3) + ')'; c.beginPath(); c.ellipse(((k * 61 + f * (0.15 + k * 0.03)) % (W + 80)) - 40, (k * 37) % H, 46, 14, 0, 0, Math.PI * 2); c.fill(); }
  c.globalCompositeOperation = 'destination-out';
  const hole = (x, y, r0, r1) => { const gr = c.createRadialGradient(x, y, r0, x, y, r1); gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = gr; c.fillRect(x - r1, y - r1, r1 * 2, r1 * 2); };
  for (const t of this.tanks) if (t.alive && t.isPlayer) hole(t.x + 8, t.y + 8, 14 + ((f >> 4) & 1), 46);
  for (const e of g.list) {
    if (e.type === 'gx4bWisp') hole(e.x, e.y, 3, 15);
    else if (e.type === 'gx4bBoat') hole(e.x + (e.v && e.v.fl ? -8 : 8), e.y - 4, 2, 12);
  }
  for (const u of g.pickups) hole(u.x, u.y, 2, 9);
  c.globalCompositeOperation = 'source-over';
  ctx.drawImage(GX4B_FOG, 0, 0);
  for (const b of g.bullets) { gx4bGlow(ctx, b.x, b.y, 3, '#F83800', 0.55 * a); ctx.fillStyle = '#F8F8F8'; ctx.fillRect(Math.round(b.x) - 1, Math.round(b.y) - 1, 2, 2); }
  if (g.banner && (!g.banner.warn || (g.banner.t >> 3) & 1)) {
    const y = H / 2 - 20;
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, y - 3, W, 14);
    Font.drawCenter(ctx, g.banner.text, W / 2, y, g.banner.warn ? COL.red : COL.gold);
  }
}
{
  const render0 = Stage.prototype.renderGalaxy;
  Stage.prototype.renderGalaxy = function (ctx) {
    const r = render0.apply(this, arguments), g = this.galaxy;
    if (!g) return r;
    ctx.save(); ctx.translate(FX, FY); ctx.beginPath(); ctx.rect(0, 0, VIEW_W, VIEW_H); ctx.clip();
    gx4bOver.call(this, ctx, g);
    ctx.restore();
    return r;
  };
  // online: the current, the blizzard, the splashes (the fog and the curtain come with their enemies, frost with p.gx)
  const view0 = Stage.prototype.galaxyView, apply0 = Stage.prototype.applyGalaxyView;
  Stage.prototype.galaxyView = function () {
    const v = view0.call(this), G4 = this.galaxy.gx4b;
    if (G4) v.g4b = { c: gx4bR2(G4.cur), b: G4.bliz, d: G4.blizD, r: G4.rip };
    return v;
  };
  Stage.prototype.applyGalaxyView = function (v) {
    const r = apply0.call(this, v);
    if (v.g4b && this.galaxy) { const G4 = gx4bState(this.galaxy); G4.cur = v.g4b.c; G4.bliz = v.g4b.b; G4.blizD = v.g4b.d; G4.rip = v.g4b.r || []; }
    return r;
  };
}

// ------------------------------------------------------------------ the bosses
// GHOST OF THE TITANIC, side on, bow to the right: a see-through liner, its black hull fading into the fog at the
// waterline, two rows of portholes glowing green, nine deck-gun ports (warm), the white decks with their lit windows,
// the bridge forward, lifeboats on the boat deck, four buff funnels with black tops raked back, two masts and the
// aerial between them. In phase 3 it's broken in two at x 50: the stern (the boss) and the bow (b.bow)
const GX4B_TW = 112, GX4B_BRK = 50, GX4B_FUN = [24, 38, 56, 70], GX4B_PORTS = [14, 24, 34, 44, 60, 70, 80, 90, 100];
function gx4bShip(f, ph) {
  const P = bossPainter(GX4B_TW, 44), an = f & 1;
  P.line(13, 3, 13, 23, 3); P.line(99, 1, 99, 22, 3); P.rect(98, 7, 100, 7, 2);   // the masts, a crow's nest
  for (let x = 14; x < 99; x += 2) P.px(x, Math.round(2.5 + Math.sin((x - 13) / 86 * Math.PI) * 1.5), 9);   // the aerial
  for (let i = 1; i <= 10; i++) P.px(99 + i, 1 + i * 2, 9);   // the forestay
  for (let x = 4; x <= 109; x++) {   // the hull: a rounded stern, the bow raked and rising
    let top = 23, bot = 38;
    if (x < 12) bot = 38 - Math.round((12 - x) * 0.9);
    if (x > 100) { bot = 38 - Math.round((x - 100) * 1.7); top = 23 - Math.round((x - 100) * 0.3); }
    for (let y = top; y <= bot; y++) P.px(x, y, y <= top + 1 ? 1 : y === top + 2 ? 2 : 3);
  }
  for (let x = 8; x < 102; x += 3) { if (P.g[27][x]) P.px(x, 27, (x * 7 + an * 5) % 13 ? 5 : 2); if (x % 2 && P.g[32][x]) P.px(x, 32, ph >= 2 && x % 5 === 0 ? 3 : 5); }   // portholes
  for (const x of GX4B_PORTS) P.rect(x - 1, 29, x, 30, 6);   // the deck-gun ports
  P.rect(18, 17, 94, 22, 1); P.rect(18, 17, 94, 17, 4); P.rect(18, 22, 94, 22, 2);   // the decks, the windows lit
  for (let x = 19; x < 94; x += 2) P.px(x, 19, (x + an * 3) % 11 && !(ph >= 2 && x % 7 === 0) ? 5 : 2);
  for (let x = 20; x < 93; x += 4) P.px(x, 21, 2);
  P.rect(88, 13, 96, 22, 1); P.rect(88, 13, 96, 13, 4); for (let x = 89; x < 96; x += 2) P.px(x, 15, 5);   // the bridge
  for (const x of [19, 29, 45, 61, 77]) { P.rect(x, 15, x + 4, 16, 2); P.rect(x, 15, x + 4, 15, 4); }   // lifeboats
  for (const fx of GX4B_FUN) for (let y = 2; y <= 16; y++) {   // the funnels
    const s = Math.round((16 - y) * 0.18);
    for (let x = fx - s; x <= fx + 5 - s; x++) P.px(x, y, y <= 4 ? 3 : y === 5 ? 2 : x === fx - s ? 4 : x === fx + 5 - s ? 2 : 8);
  }
  gxScars(P, ph, 71, 4, 5, f, (x, y) => y > 17 && y < 34);
  P.outline();
  for (let y = 34; y < 44; y++) for (let x = 0; x < GX4B_TW; x++) if (P.g[y][x] && ((x + y) & 1 || (y >= 37 && (x + 2 * y) % 3))) P.g[y][x] = 0;   // into the fog
  return P.g;
}
// fading into the fog (and out of it): lv 1-3, fewer and fewer of its pixels
function gx4bFade(g, lv) {
  if (!lv) return g;
  for (let y = 0; y < g.length; y++) for (let x = 0; x < g[y].length; x++) if (!(lv === 1 ? (x + 2 * y) % 4 : lv === 2 ? (x + y) % 2 === 0 : x % 2 === 0 && y % 2 === 0)) g[y][x] = 0;
  return g;
}
// broken in two: its stern or its bow, the break jagged, glowing
function gx4bHalf(g, part) {
  return g.map((r, y) => {
    const cut = (y * 5 + (y >> 2) * 3) % 4;
    if (part === 'stern') { const row = r.slice(0, GX4B_BRK), e = GX4B_BRK - 1 - cut; for (let x = e + 1; x < GX4B_BRK; x++) row[x] = 0; if (row[e]) row[e] = (y + e) % 3 ? 5 : 7; return row; }
    const row = r.slice(GX4B_BRK), e = 3 - cut; for (let x = 0; x < e; x++) row[x] = 0; if (row[e]) row[e] = (y + e) % 3 ? 5 : 7; return row;
  });
}
const gx4bBowImg = (f, flash) => gx4bImg('bow' + f + (flash ? 'f' : 'n'), () => gx4bHalf(gx4bShip(f, 3), 'bow'), flash ? BOSS_PALS.f : GX_BOSS_PALS.gx4bTitanic);
// a point of the bow's picture (px, py) on the field, as the bow is turned
function gx4bBowPt(w, px, py) {
  const lx = px - (GX4B_TW - GX4B_BRK) / 2, ly = py - 22, c = Math.cos(w.a), s = Math.sin(w.a);
  return [w.x + lx * c - ly * s, w.y + 22 + lx * s + ly * c];
}
// the tops of its funnels, and its deck-gun ports, on the field
function gx4bFunnels(b) {
  const x0 = b.x - b.w / 2, out = [];
  for (const fx of GX4B_FUN) if (!b.bow) out.push([x0 + fx + 1, b.y + 2]); else if (fx < GX4B_BRK) out.push([x0 + fx + 1, b.y + 2]); else out.push(gx4bBowPt(b.bow, fx + 1 - GX4B_BRK, 2));
  return out;
}
function gx4bPorts(b) {
  const x0 = b.x - b.w / 2, out = [];
  for (const px of GX4B_PORTS) if (!b.bow) out.push([x0 + px, b.y + 31]); else if (px < GX4B_BRK) out.push([x0 + px, b.y + 31]); else out.push(gx4bBowPt(b.bow, px - GX4B_BRK, 31));
  return out;
}
// the bow's body, along its keel: points to hit (and to be hit by)
function gx4bBowAxis(w) { const out = []; for (let d = -26; d <= 26; d += 10) out.push(gx4bBowPt(w, (GX4B_TW - GX4B_BRK) / 2 + d, 27)); return out; }

// SANTA ON HIS SLEDGE, side on, facing right (mirrored to fly left): a red sledge with gold trim and curling
// runners, the big sack behind him with presents peeking out, Santa at the reins (beard, rosy nose, the hat flopping
// back, its bobble bouncing). Phase 3: rocket boosters under the sack. The reindeer are their own pictures
const GX4B_DEER = 6, GX4B_GAP = 13;
function gx4bSledge(f, ph) {
  const P = bossPainter(56, 32), an = f & 1;
  gxBall(P, 12, 9, 9, 8, [8, 8, 8, 9, 9]);   // the sack
  P.rect(9, 1, 12, 4, 10); P.rect(10, 1, 10, 4, 5); P.rect(9, 2, 12, 2, 5); P.rect(14, 0, 17, 3, 11); P.rect(15, 0, 15, 3, 4);   // presents in it
  P.line(5, 3, 7, 1, 4); P.px(5, 4, 2); P.px(6, 2, 2);   // a candy cane
  P.rect(11, 15, 13, 16, 9); P.line(8, 12, 12, 9, 9);
  gxBall(P, 31, 12, 6, 6, [1, 1, 2, 3, 3]);   // Santa: his coat
  P.rect(26, 13, 37, 14, 7); P.rect(30, 13, 32, 14, 5);   // belt, buckle
  P.line(35, 10, 41, 12, 2); P.line(35, 11, 41, 13, 3); P.rect(40, 11, 41, 13, 4); P.rect(42, 11, 43, 13, 10);   // an arm out, the reins in his mitten
  P.disc(33, 5.5, 2.7, 6); P.disc(33.5, 9, 3.6, 4); P.rect(32, 8, 36, 8, 4); P.px(36, 7, 1); P.px(35, 4, 7); P.px(36, 6, 1);   // face, beard, nose
  P.rect(29, 3, 37, 3, 4); P.rect(30, 1, 36, 2, 2); P.rect(27, 0, 33, 1, 2); P.rect(24, 1, 27, 2, 3); P.rect(22, 2 + an, 23, 3 + an, 4);   // the hat, flopping back, its bobble
  for (let x = 4; x <= 51; x++) {   // the sledge
    const top = x <= 11 ? 9 : x >= 40 ? Math.round(15 - (x - 40) * 0.8) : 15, bot = x >= 44 ? Math.round(25 - (x - 44) * 1.3) : 25;
    for (let y = top; y <= bot; y++) P.px(x, y, y === top ? 1 : y === bot ? 3 : x <= 6 ? 3 : 2);
    if (x > 11 && x < 40) P.px(x, top + 1, 5);
  }
  P.rect(3, 7, 5, 9, 2); P.px(4, 8, 5); P.rect(50, 5, 52, 7, 2); P.px(51, 6, 5);   // its scrolls
  for (const [x0, y0, x1, y1] of [[17, 21, 23, 18], [23, 18, 29, 21], [29, 21, 35, 18], [35, 18, 39, 20]]) P.line(x0, y0, x1, y1, 5);   // a gold swirl along its side
  for (const x of [12, 26, 39]) P.rect(x, 26, x, 28, 5);   // struts
  P.line(4, 29, 47, 29, 5); P.line(5, 30, 46, 30, 3); P.line(47, 29, 52, 25, 5); P.line(52, 25, 53, 21, 5); P.line(53, 21, 51, 20, 5); P.px(3, 28, 5);   // the runners, curling up
  P.px(10 + an * 22, 29, 4);
  if (ph >= 3) for (const y of [17, 22]) { P.rect(0, y, 10, y + 3, 4); P.rect(0, y + 3, 10, y + 3, 1); P.rect(4, y, 5, y + 3, 2); P.rect(0, y, 1, y + 3, 7); P.px(1, y + 1, 3); P.px(7, y - 1, 2); P.px(7, y + 4, 2); P.px(8, y - 1, 2); }   // turbo boosters: white rockets, red bands
  gxScars(P, ph, 81, 3, 5, f, (x, y) => y > 15 && y < 26 && x > 8);
  P.outline();
  return f & 2 ? gx4bMirror(P.g) : P.g;
}
// a reindeer, side on, facing right: galloping (f), the lead one with its red nose
function gx4bDeerGrid(f, lead) {
  const P = bossPainter(18, 14);
  for (const [x0, x1] of f ? [[5, 2], [7, 6], [11, 12], [13, 16]] : [[5, 4], [7, 9], [11, 10], [13, 13]]) { P.line(x0, 10, x1, 13, 3); P.px(x1, 13, 7); }
  gxBall(P, 9, 8.5, 6, 2.9, [1, 1, 2, 3, 3]);
  P.px(2, 7, 4); P.px(3, 7, 4); P.px(3, 6, 4);   // its tail
  P.line(13, 7, 15, 4, 2); P.line(14, 7, 16, 4, 1);
  gxBall(P, 15.5, 4, 2.2, 1.6, [1, 1, 2, 3, 3]); P.rect(16, 4, 17, 5, 2); P.px(17, 5, lead ? 5 : 3); if (lead) P.px(17, 4, 5);
  P.px(15, 3, 7);
  P.line(14, 2, 12, 0, 6); P.px(13, 0, 6); P.line(15, 2, 16, 0, 6); P.px(17, 0, 6); P.px(12, 2, 6);   // antlers
  P.line(6, 7, 13, 7, 5);   // its harness
  P.outline(); return P.g;
}
const gx4bDeerImg = (f, lead, fl) => gx4bImg('deer' + f + (lead ? 1 : 0) + (fl ? 1 : 0), () => (fl ? gx4bMirror(gx4bDeerGrid(f, lead)) : gx4bDeerGrid(f, lead)), GX4B_DEER_PAL);
const GX4B_DEER_PAL = [null, '#C8905C', '#9C6434', '#5C3818', '#F8F8F8', '#F83800', '#E8D8B0', '#100808'];
// the point d pixels back along a trail (newest first): [x, y, facing]
function gx4bAlong(tr, d) {
  for (let i = 1; i < tr.length; i++) {
    const [x0, y0] = tr[i - 1], [x1, y1] = tr[i], L = Math.hypot(x1 - x0, y1 - y0);
    if (d <= L || i === tr.length - 1) { const k = L ? Math.min(1, d / L) : 0; return [x0 + (x1 - x0) * k, y0 + (y1 - y0) * k, x0 > x1 + 0.05 ? 1 : x0 < x1 - 0.05 ? -1 : 0]; }
    d -= L;
  }
  return [tr[0][0], tr[0][1], 0];
}

{
  const at = GX_BOSSES.findIndex(b => b.key === 'cats');
  GX_BOSSES.splice(at < 0 ? GX_BOSSES.length : at, 0,
    { key: 'gx4bTitanic', name: 'GHOST OF THE TITANIC', w: GX4B_TW, h: 44, hp: 800, pts: 54000, move: 'sway',
      phases: [['gx4bBroadside', 'gx4bSmoke', 'gx4bSpirits', 'gx4bBand', 'aimed5'], ['gx4bRamBerg', 'gx4bBroadside', 'gx4bSpirits', 'gx4bSmoke', 'gx4bRockets', 'gx4bBand', 'fan5'],
        ['gx4bBowRam', 'gx4bBroadside', 'gx4bSmoke', 'gx4bSpirits', 'gx4bBand', 'gx4bRockets', 'gx4bBowRam', 'fan7']],
      init(b) { b.fade = 0; b.fadeT = 0; b.puffs = []; b.band = 0; b.ports = null; b.bow = null; b.talk = ['ALL ABOARD...', 'THE SEA GIVES NOTHING BACK.']; Sound.play('gx4bHorn'); },
      update(b, g, near, pl) { gx4bTitanicUpdate.call(this, b, g, near, pl); return true; },
      // the bow, broken off, is hit on its own (the hits count against the whole ship)
      hitParts(b, x, y, w, h, dmg, p) {
        if (!b.bow) return false;
        if (!gx4bBowAxis(b.bow).some(([px, py]) => overlap(x, y, w, h, px - 9, py - 12, 18, 22))) return false;
        b.bow.flash = 3; b.noFlash = true;
        this.gxBossDamage(dmg, p, false);
        return true;
      },
      onPhase(b, g, ph) {
        b.fadeT = 0; b.fade = 0; b.ports = null;
        if (ph === 2) { this.gxSay(b, 'ALL HANDS! ALL HANDS!', 110); Sound.play('gx4bBell'); return; }
        // she breaks in two
        const x0 = b.x - GX4B_TW / 2;
        b.w = GX4B_BRK; b.x = x0 + GX4B_BRK / 2;
        b.bow = { x: x0 + GX4B_BRK + (GX4B_TW - GX4B_BRK) / 2, y: b.y, a: 0, st: 'float', t: 0, flash: 0, tx: 0 };
        g.banner = { text: 'SHE IS BREAKING UP!', t: 150, warn: true };
        for (let k = 0; k < 6; k++) this.fx.push({ x: x0 + GX4B_BRK + rnd(5) - 2, y: b.y + 8 + k * 5, frames: BIG_EXPLOSION(), per: 4, tick: -k * 5 });
        if (typeof gxShake === 'function') gxShake(g, 30, 3);
        Sound.play('gx4bCreak');
      },
      // she sinks, bow first
      onKill(b, g) {
        const e = this.gxSpawn({ type: 'gx4bWreck', st: 'gx4bSink' });
        e.v = b.bow ? { w: 0, sx: gx4bR(b.x), sy: gx4bR(b.y + 22), a1: 0, bx: gx4bR(b.bow.x), by: gx4bR(b.bow.y + 22), a2: gx4bR(b.bow.a), t: 0, al: 1 }
          : { w: 1, sx: gx4bR(b.x), sy: gx4bR(b.y + 22), a1: 0, t: 0, al: 1 };
        g.banner = { text: 'AT REST AT LAST', t: 240 };
        Sound.play('gx4bHorn');
      },
      frame: (b, fr) => ((fr >> 4) & 1) | ((b.fade || 0) << 1),
      drawUnder(ctx, b) { gx4bTitanicUnder.call(this, ctx, b); },
      drawOver(ctx, b) { gx4bTitanicOver.call(this, ctx, b); },
    },
    { key: 'gx4bSanta', name: 'SANTA ON HIS SLEDGE', w: 56, h: 32, hp: 760, pts: 55200, move: 'sway',
      phases: [['gx4bPresentBombs', 'gx4bHoHoHo', 'gx4bSack', 'fan5'], ['gx4bRedNose', 'gx4bPresentBombs', 'gx4bSweep', 'gx4bCoalShot', 'gx4bHoHoHo', 'gx4bSack'],
        ['gx4bBlizzard', 'gx4bSweep', 'gx4bRedNose', 'gx4bCoalShot', 'gx4bPresentBombs', 'gx4bHoHoHo', 'gx4bSack']],
      init(b) {
        b.in = true; b.hx = FW / 2 + 30; b.hy = -20; b.ha = Math.PI / 2; b.wp = [FW / 2 - 40, 50]; b.loopT = 0; b.loopD = 1; b.loopAt = 260; b.face = 1;
        b.trail = []; for (let i = 0; i < 70; i++) b.trail.push([b.hx, b.hy - i * 2]);
        b.deer = []; b.rings = []; b.smk = []; b.path = null; b.nose = 0; b.turbo = 0; b.chatT = 400;
        gx4bChain(b);
        this.gxSay(b, 'HO HO HO! WHO HAS BEEN NAUGHTY?', 150); Sound.play('gx4bJingle');
      },
      update(b, g, near, pl) { gx4bSantaUpdate.call(this, b, g, near, pl); return true; },
      onPhase(b, g, ph) {
        b.path = null; b.nose = 0;
        if (ph === 2) { this.gxSay(b, "YOU'RE ON THE NAUGHTY LIST NOW!", 130); Sound.play('gx4bHoho'); return; }
        b.turbo = 1; g.banner = { text: 'TURBO SLEDGE!', t: 130, warn: true };
        this.gxSay(b, 'TURBO BOOST! HO HO HO!', 120); Sound.play('gx4bRocket');
      },
      // beaten, he tips you a present and flies off
      onKill(b, g) {
        const e = this.gxSpawn({ type: 'gx4bBye', st: 'gx4bFlyOff' });
        e.v = { x: gx4bR(b.x), y: gx4bR(Math.max(24, b.y + 16)), d: b.x < FW / 2 ? 1 : -1, t: 0 };
        this.gxDrop(b.x, b.y + 18, 'gx4bGift');
        gx4bState(g).bliz = 0;
        g.banner = { text: 'HAPPY CHRISTMAS TO ALL!', t: 240 };
        Sound.play('gx4bHoho');
      },
      frame: (b, fr) => ((fr >> 3) & 1) | (b.face < 0 ? 2 : 0),
      drawUnder(ctx, b) { gx4bSantaUnder.call(this, ctx, b); },
      drawOver(ctx, b) { gx4bSantaOver.call(this, ctx, b); },
    },
  );
}
Object.assign(GX_BOSS_PALS, {
  gx4bTitanic: [null, 'rgba(208,244,236,0.9)', 'rgba(112,184,184,0.86)', 'rgba(28,64,76,0.9)', 'rgba(248,248,248,0.95)', '#A8F8C8', '#F8D878', 'rgba(4,14,20,0.9)',
    'rgba(224,208,160,0.9)', 'rgba(150,220,220,0.5)', '#F8F8F8', '#58D8A8'],
  gx4bSanta: [null, '#F87858', '#D82818', '#7C0C08', '#F8F8F8', '#F8C838', '#F8C8A0', '#100808', '#C08850', '#7C5028', '#38A848', '#3C7CF8'],
});
Object.assign(GX_BOSS_DRAW, {
  gx4bTitanic: (f, ph) => (ph >= 3 ? gx4bHalf(gx4bShip(f, ph), 'stern') : gx4bFade(gx4bShip(f, ph), (f >> 1) & 3)),
  gx4bSanta: (f, ph) => gx4bSledge(f, ph),
});

// ------------------------------------------------------------------ the ghost ship, every frame
function gx4bTitanicUpdate(b, g, near, pl) {
  if (b.band > 0) b.band--;
  if (!b.say && b.talk.length && b.t > 60) this.gxSay(b, b.talk.shift(), 110);
  // ghost smoke rising off its funnels (just a look: the harmful kind is an attack)
  if (b.t % 14 === 0 && b.puffs.length < 30) for (const [x, y] of gx4bFunnels(b)) b.puffs.push([gx4bR(x), gx4bR(y), 0]);
  for (const q of b.puffs) { q[2]++; q[0] = gx4bR(q[0] - 0.25); q[1] = gx4bR(q[1] - 0.3); }
  b.puffs = b.puffs.filter(q => q[2] < 40);
  if (b.ports) gx4bPortsStep.call(this, b, g, near);
  if (b.ph < 3) {
    // gliding across, bow first; at the end of its run it fades into the fog and comes back out at the other side
    if (!b.hold) {
      if (b.fadeT > 0) { const k = --b.fadeT; b.fade = k > 30 ? Math.min(3, Math.ceil((60 - k) / 8)) : Math.min(3, Math.ceil(k / 8)); if (k === 30) b.x = b.w / 2 + 2; }
      else { b.fade = 0; if (b.x < FW - b.w / 2 - 2) b.x += 0.26 + 0.1 * (b.ph - 1); else if (!b.act) { b.fadeT = 60; Sound.play('gx4bHorn'); } }
      b.y = 14 + Math.sin(b.t / 45) * 2;
    }
    return;
  }
  // broken: the stern rolls on the left, the bow drifts on the right... and plunges at you
  if (!b.hold) { b.x = 44 + Math.sin(b.t / 80) * 12; b.y = 15 + Math.sin(b.t / 37) * 3; }
  const w = b.bow;
  if (!w) return;
  w.t++; if (w.flash > 0) w.flash--;
  const hx = FW - 50 + Math.sin(b.t / 70) * 10, hy = 16 + Math.sin(b.t / 41) * 3;
  if (w.st === 'float') { w.x += (hx - w.x) * 0.05; w.y += (hy - w.y) * 0.08; w.a += (Math.sin(b.t / 55) * 0.06 - w.a) * 0.1; }
  else if (w.st === 'tilt') { w.x += Math.max(-2.4, Math.min(2.4, w.tx - 12 - w.x)); w.a += (1.15 - w.a) * 0.08; w.y += (hy - w.y) * 0.1; if (w.t >= 46) { w.st = 'dive'; w.t = 0; Sound.play('gx4bCreak'); } }
  else if (w.st === 'dive') { w.y += 4.2; if (w.y > FH - 66 || w.t > 40) { w.st = 'stay'; w.t = 0; gx4bRipple(g, w.x + 12, FH - 14); Sound.play('gx4bSplash'); if (typeof gxShake === 'function') gxShake(g, 10, 2); } }
  else if (w.st === 'stay') { if (w.t >= 18) { w.st = 'rise'; w.t = 0; } }
  else { w.y -= 2.2; w.a += -w.a * 0.05; if (w.y <= hy + 1) { w.st = 'float'; w.t = 0; } }
  w.x = gx4bR(w.x); w.y = gx4bR(w.y); w.a = Math.round(w.a * 1000) / 1000;
  for (const t of pl) if (gx4bBowAxis(w).some(([px, py]) => Math.abs(t.x + 8 - px) < 9 && Math.abs(t.y + 9 - py) < 9)) this.hitPlayer(t);
}
// its deck guns: lit one after another (stern to bow), then two volleys straight down (every other port: weave
// between them), then one angled in at you (from phase 2 two)
function gx4bPortsStep(b, g, near) {
  const P = b.ports, pts = gx4bPorts(b);
  P.t++;
  const volley = (odd, aim) => {
    pts.forEach(([x, y], i) => {
      if (i % 2 !== odd) return;
      const a = aim && near ? Math.atan2(near.y + 8 - y, near.x + 8 - x) * 0.5 + Math.PI / 4 : Math.PI / 2;
      g.bullets.push({ x, y, vx: Math.cos(a) * 1.35 * g.shotSpd, vy: Math.sin(a) * 1.35 * g.shotSpd, k: 'shot' });
    });
    Sound.play('gx4bCannon');
  };
  if (P.t === 1) { let bi = 0, bd = 1e9; pts.forEach(([x], i) => { const d = near ? Math.abs(near.x + 8 - x) : 0; if (d < bd) { bd = d; bi = i; } }); P.p = bi % 2; }
  if (P.t === 44) volley(P.p); else if (P.t === 66) volley(1 - P.p); else if (P.t === 88) volley(P.p, true); else if (P.t === 104 && b.ph >= 2) volley(1 - P.p, true);
  if (P.t >= 112) b.ports = null;
}

// ------------------------------------------------------------------ Santa, every frame
function gx4bSantaUpdate(b, g, near, pl) {
  const sp = [1.25, 1.5, 2.0][b.ph - 1];
  if (b.chatT > 0 && --b.chatT === 0) { if (!b.say) this.gxSay(b, gx4bPick(['HO HO HO!', 'ON, DASHER! ON, DANCER!', 'NOW DASH AWAY ALL!', 'I SEE YOU DOWN THERE!', 'NO COOKIES FOR YOU!']), 90); b.chatT = 360 + rnd(300); }
  if (!b.hold) {
    if (b.path) {   // a set path (the sweep): first to its start, waiting there while it's shown, then along it
      const P = b.path, [tx, ty] = P.pts[P.i], d = Math.hypot(tx - b.hx, ty - b.hy), v = P.i === 0 ? 2.2 : P.v;
      if (P.warn > 0) P.warn--;
      if (d <= v) { b.hx = tx; b.hy = ty; if (P.i > 0 || P.warn <= 0) { P.i++; if (P.i >= P.pts.length) b.path = null; } }
      else { b.ha = Math.atan2(ty - b.hy, tx - b.hx); b.hx += (tx - b.hx) / d * v; b.hy += (ty - b.hy) / d * v; }
    } else {
      if (b.loopT > 0) { b.loopT--; b.ha += 0.085 * b.loopD; }   // a loop-the-loop
      else {
        const [wx, wy] = b.wp, want = Math.atan2(wy - b.hy, wx - b.hx);
        let d = want - b.ha; d = Math.atan2(Math.sin(d), Math.cos(d));
        b.ha += Math.max(-0.05, Math.min(0.05, d));
        if (Math.hypot(wx - b.hx, wy - b.hy) < 18 || b.hx < -30 || b.hx > FW + 30 || b.hy > FH * 0.55) b.wp = [26 + rnd(FW - 52), 22 + rnd(54)];
        if (--b.loopAt <= 0 && b.hy > 34 && b.hy < 70 && b.hx > 50 && b.hx < FW - 50) { b.loopD = Math.cos(b.ha) >= 0 ? -1 : 1; b.loopT = Math.round(Math.PI * 2 / 0.085); b.loopAt = 380 + rnd(260); Sound.play('gx4bJingle'); }
      }
      b.hx += Math.cos(b.ha) * sp; b.hy += Math.sin(b.ha) * sp;
    }
    const [x0, y0] = b.trail[0];
    if (Math.hypot(b.hx - x0, b.hy - y0) >= 1.5) {
      b.trail.unshift([gx4bR(b.hx), gx4bR(b.hy)]);
      let L = 0;
      for (let i = 1; i < b.trail.length; i++) { L += Math.hypot(b.trail[i][0] - b.trail[i - 1][0], b.trail[i][1] - b.trail[i - 1][1]); if (L > (GX4B_DEER - 1) * GX4B_GAP + 40) { b.trail.length = i + 1; break; } }
    }
  }
  gx4bChain(b);
  // the reindeer are solid
  for (const t of pl) for (const [x, y] of b.deer) if (Math.abs(t.x + 8 - x) < 9 && Math.abs(t.y + 9 - y) < 7) { this.hitPlayer(t); break; }
  // HO HO HO's rings, the boosters' smoke (just looks)
  for (const r of b.rings) r[2]++;
  b.rings = b.rings.filter(r => r[2] < 40);
  if (b.turbo && b.t % 3 === 0) b.smk.push([gx4bR(b.x - b.face * 28), gx4bR(b.y + 21), 0]);
  for (const q of b.smk) q[2]++;
  b.smk = b.smk.filter(q => q[2] < 24);
}
// the reindeer along the trail, the sledge at its end
function gx4bChain(b) {
  b.deer = [];
  for (let k = 0; k < GX4B_DEER; k++) { const [x, y, f] = gx4bAlong(b.trail, k * GX4B_GAP); b.deer.push([gx4bR(x), gx4bR(y), f || (b.deer[k - 1] ? b.deer[k - 1][2] : 1)]); }
  const [sx, sy, sf] = gx4bAlong(b.trail, (GX4B_DEER - 1) * GX4B_GAP + 30);
  if (sf) b.face = sf;
  b.x = sx; b.y = sy - 18;
}

// ------------------------------------------------------------------ their attacks
// (the ghost ship holds an attack while it's faded into the fog)
const gx4bShipAct = fn => function (b, a, c) { if (b.fadeT > 0) { a.t = 0; return; } fn.call(this, b, a, c); };
Object.assign(GX_BOSS_ACTS, {
  // THE GHOST OF THE TITANIC: its deck guns (see gx4bPortsStep)
  gx4bBroadside: gx4bShipAct(function (b, a, c) {
    if (a.t === 1) { b.ports = { t: 0 }; Sound.play('gx4bBell'); }
    if (!b.ports || a.t > 200) c.done(50);
  }),
  // ghost smoke: each funnel in turn puffs out wisps that drift down, swaying
  gx4bSmoke: gx4bShipAct(function (b, a, c) {
    const fun = gx4bFunnels(b);
    if (a.t % 12 === 1 && a.t < fun.length * 12) {
      const [x, y] = fun[Math.floor(a.t / 12)];
      for (let k = 0; k < (b.ph >= 2 ? 4 : 3); k++) c.g.bullets.push({ x: x + rnd(5) - 2, y: y + 2, vx: 0, vy: (0.45 + Math.random() * 0.25) * c.s, k: 'gx4bSmoke', ph: Math.random() * 6, dx: (c.near ? Math.max(-0.5, Math.min(0.5, (c.near.x + 8 - x) / 160)) : 0) + (Math.random() - 0.5) * 0.25 });
      b.puffs.push([gx4bR(x), gx4bR(y), 0]);
      Sound.play('gx4bPuff');
    }
    if (a.t >= fun.length * 12 + 20) c.done(60);
  }),
  // the ghost band plays a slow waltz: notes sway down at you, and the tune bends your shots
  gx4bBand: gx4bShipAct(function (b, a, c) {
    if (a.t === 1) { b.band = 220; this.gxSay(b, 'THE BAND PLAYS ON...', 110); Sound.play('gx4bBand'); }
    if (a.t >= 30 && a.t <= 190 && (a.t - 30) % 14 === 0) {
      const beat = (a.t - 30) / 14, x = b.x - b.w / 2 + 22, y = b.y + 18, base = c.toward(x, y) * 0.8 + Math.PI / 2 * 0.2;
      for (const d of beat % 3 === 0 ? [-0.35, 0, 0.35] : b.ph >= 2 ? [-0.18, 0.18] : [beat % 3 === 1 ? -0.2 : 0.2]) c.shoot(x, y, base + d, 1.1, 'gx4bNote', { ph: Math.random() * 6, bend: b.ph >= 2 ? 1.4 : 1 });
      if (beat % 3 === 0) Sound.play('gx4bPluck');
    }
    if (a.t >= 200) c.done(60);
  }),
  // its ghosts: will-o'-wisps come off its decks, drift about, and lunge at you (each flares up first)
  gx4bSpirits: gx4bShipAct(function (b, a, c) {
    if (c.g.list.filter(e => e.type === 'gx4bWisp').length < 8) for (let i = 0; i < (b.ph >= 2 ? 5 : 4); i++) {
      const e = this.gxSpawn({ type: 'gx4bWisp', st: 'gx4bLurk' });
      e.x = b.x - b.w / 2 + 14 + i * (b.w - 28) / 4; e.y = b.y + 16; e.tx = gx4bClamp(e.x + rnd(41) - 20, 12); e.ty = 52 + rnd(40); e.lungeAt = 70 + i * 40 + rnd(60);
    }
    this.gxSay(b, gx4bPick(['ALL HANDS ON DECK...', 'COME ABOARD...', 'JOIN US...']), 80); Sound.play('gx4bWisp'); c.done(70);
  }),
  // ICEBERG, RIGHT AHEAD!: it summons a berg ahead of its bow and rams it; if the berg's still there, it bursts
  // into shards (shoot it first!)
  gx4bRamBerg: gx4bShipAct(function (b, a, c) {
    if (a.t === 1) {
      b.hold = true; a.x0 = b.x; a.y0 = b.y;
      const px = Math.max(20, Math.min(FW - 20, b.x + 46));
      a.dx = px - (b.x + 46); a.id = 'gx4bRam' + c.g.t;
      this.gxSpawn({ type: 'gx4bBerg', st: 'gx4bRise', px, py: b.y + 60, id: a.id });
      this.gxSay(b, 'ICEBERG, RIGHT AHEAD!', 100); Sound.play('gx4bBell');
    }
    if (a.t > 50 && a.t <= 70) { b.x += a.dx / 20; b.y += 26 / 20; }
    if (a.t === 70) {
      const e = c.g.list.find(o => o.id === a.id);
      if (e && !e.dead) {
        c.g.list = c.g.list.filter(o => o !== e); e.dead = true;
        for (let k = 0; k < 14; k++) { const an = 0.15 + k * (Math.PI - 0.3) / 13; c.shoot(e.x, e.y, an, 1 + (k % 2) * 0.25, 'shard', { slow: true }); }
        for (const s of [-1, 1]) this.gxSpawn({ type: 'gx4bFloe', st: 'gx4bDrift', px: e.x + s * 10, py: e.y, vx: s * 0.6, vy: 0.4 });
        b.hp = Math.max(b.max * 0.34, b.hp - b.max * 0.02);   // that hurt it too
        this.popups.push({ x: e.x, y: e.y - 10, text: 'CRUNCH!', label: true, color: '#A8E8F8', t: 0, delay: 0, life: 50 });
        this.fx.push({ x: e.x, y: e.y, frames: BIG_EXPLOSION(), per: 4, tick: 0 });
        if (typeof gxShake === 'function') gxShake(c.g, 16, 3);
        Sound.play('gx4bCrack'); Sound.play('explode');
      } else this.gxSay(b, 'WHERE DID IT GO?', 80);
    }
    if (a.t > 72 && a.t <= 112) { b.x -= a.dx / 40; b.y -= 26 / 40; }
    if (a.t > 112) { b.hold = false; c.done(60); }
  }),
  // distress rockets off its deck: they burst high up and rain sparks
  gx4bRockets: gx4bShipAct(function (b, a, c) {
    const n = b.ph >= 3 ? 4 : 3;
    if (a.t === 1) this.gxSay(b, 'S.O.S... S.O.S...', 80);
    if (a.t % 10 === 1 && a.t < n * 10) {
      const x = b.x - b.w / 2 + 16 + ((a.t / 10) | 0) * (b.w - 32) / Math.max(1, n - 1);
      c.g.bullets.push({ x, y: b.y + 14, vx: (x < FW / 2 ? -1 : 1) * (0.4 + Math.random() * 0.8), vy: -1.6, k: 'gx4bRocket' });
      Sound.play('gx4bFlare');
    }
    if (a.t >= n * 10 + 30) c.done(60);
  }),
  // the bow, broken off, tips nose-down over you and plunges (its column shown first)
  gx4bBowRam(b, a, c) {
    if (!b.bow) { c.done(30); return; }
    if (a.t === 1) { Object.assign(b.bow, { st: 'tilt', t: 0, tx: Math.max(30, Math.min(FW - 30, c.near ? c.near.x + 8 : FW / 2)) }); Sound.play('gx4bCreak'); }
    if ((a.t > 5 && b.bow.st === 'float') || a.t > 400) c.done(50);
  },
  // SANTA: present bombs, tossed out of the sack
  gx4bPresentBombs(b, a, c) {
    const n = b.ph >= 2 ? 4 : 3;
    if (a.t === 1) {
      if (c.g.list.length < 16) for (let i = 0; i < n; i++) this.gxSpawn({ type: 'gx4bPBomb', st: 'gx4bToss', px: b.x - b.face * 14, py: b.y + 8, vx: (i - (n - 1) / 2) * 0.75 + (Math.random() - 0.5) * 0.3, vy: -1.2 - Math.random() * 0.4 });
      this.gxSay(b, gx4bPick(['PRESENTS!', 'SPECIAL DELIVERY!', "DON'T SHAKE THEM!"]), 70); Sound.play('gx4bThrow');
    }
    if (a.t >= 30) c.done(70);
  },
  // HO HO HO: three rings of peppermints, a gap in each
  gx4bHoHoHo(b, a, c) {
    if (a.t === 1 || a.t === 24 || a.t === 47) {
      const n = b.ph >= 3 ? 24 : 20, gap = rnd(n), cx = b.x, cy = b.y + 14;
      for (let i = 0; i < n; i++) { if ((i - gap + n) % n < 3) continue; c.shoot(cx, cy, i * Math.PI * 2 / n + a.t * 0.05, 1.0, 'gx4bHo'); }
      b.rings.push([gx4bR(cx), gx4bR(cy), 0]);
      this.popups.push({ x: cx, y: b.y - 2, text: 'HO!', label: true, color: '#F8F8F8', t: 0, delay: 0, life: 26 });
      Sound.play('gx4bHoho');
    }
    if (a.t >= 60) c.done(60);
  },
  // the sack opens: elves pour out and dive at you
  gx4bSack(b, a, c) {
    if (c.g.list.length < 14) for (let i = 0; i < 5; i++) {
      const e = this.gxSpawn({ type: 'gx4bElf', st: 'dive' });
      e.x = b.x - b.face * 14 + (i - 2) * 5; e.y = b.y + 6; e.sx = e.x; e.sy = e.y; e.t = -i * 8; e.tx = c.near ? c.near.x + 8 : FW / 2; e.shot = false;
    }
    this.gxSay(b, 'ELVES, GO GO GO!', 70); Sound.play('gx4bJingle'); c.done(60);
  },
  // the red nose: a line to you first, then a laser along it (twice in phase 3); the team holds still meanwhile
  gx4bRedNose(b, a, c) {
    const beam = () => {
      const d = b.deer[0] || [b.x, b.y, 1], nx = d[0] + d[2] * 8, ny = d[1] - 2, tx = c.near ? c.near.x + 8 : FW / 2, ty = c.near ? c.near.y + 9 : FH - 20;
      b.beams.push({ x: nx, y0: ny, tx, ty, t: 0, warn: 44, dur: 24, kind: 'nose', col: '#F83800', snd: 'gx4bLaser' });
    };
    if (a.t === 1) { b.hold = true; b.nose = 1; beam(); this.gxSay(b, 'RED NOSE: ENGAGE!', 80); Sound.play('charge'); }
    if (a.t === 36 && b.ph >= 3) beam();
    if (a.t >= (b.ph >= 3 ? 112 : 76)) { b.hold = false; b.nose = 0; c.done(50); }
  },
  // a coal shotgun: a cone of coal at you (twice in phase 3)
  gx4bCoalShot(b, a, c) {
    if (a.t === 1) { this.gxSay(b, 'NAUGHTY!', 60); Sound.play('gx4bPump'); }
    if (a.t === 24 || (a.t === 46 && b.ph >= 3)) {
      const x = b.x + b.face * 12, y = b.y + 12, base = c.toward(x, y);
      for (let i = 0; i < 9; i++) c.shoot(x, y, base + (i - 4) * 0.11, 1.3 + Math.random() * 0.6, 'gx4bCoalB');
      Sound.play('gx4bCoalShot');
    }
    if (a.t >= (b.ph >= 3 ? 60 : 40)) c.done(50);
  },
  // the team sweeps down through your zone in a U (shown first), the sledge last
  gx4bSweep(b, a, c) {
    if (a.t === 1) {
      const dir = rnd(2) ? 1 : -1, xs = dir > 0 ? 24 : FW - 24, xe = FW - xs, ty = Math.max(Math.round(FH * 0.5), Math.min(FH - 22, c.near ? c.near.y + 9 : FH - 30)), r = 22, pts = [[xs, 36]];
      for (let k = 0; k <= 6; k++) { const an = Math.PI - k * Math.PI / 12; pts.push([xs + dir * (r + r * Math.cos(an)), ty - r + r * Math.sin(an)]); }
      for (let k = 0; k <= 6; k++) { const an = Math.PI / 2 - k * Math.PI / 12; pts.push([xe - dir * (r - r * Math.cos(an)), ty - r + r * Math.sin(an)]); }
      pts.push([xe, 30]);
      b.path = { pts: pts.map(p => [gx4bR(p[0]), gx4bR(p[1])]), i: 0, warn: 70, v: b.ph >= 3 ? 3 : 2.4 };
      this.gxSay(b, 'ON, DASHER! ON, DANCER!', 90); Sound.play('gx4bJingle');
    }
    if (!b.path) { a.w = (a.w || 0) + 1; if (a.w > 40) c.done(40); }
    if (a.t > 700) { b.path = null; c.done(40); }
  },
  // phase 3: a blizzard: the wind blows snow across your zone (a gap in it, drifting) and pushes your ship
  gx4bBlizzard(b, a, c) {
    const G4 = gx4bState(c.g);
    if (a.t === 1) { G4.bliz = 260; G4.blizD = c.near && c.near.x + 8 > FW / 2 ? -1 : 1; c.g.banner = { text: 'BLIZZARD!', t: 90, warn: true }; this.gxSay(b, 'BRRR! WRAP UP WARM!', 90); Sound.play('gx4bWind'); }
    if (a.t >= 40 && a.t <= 220 && a.t % 5 === 0) {
      const gy = FH * 0.62 + Math.sin(a.t / 40) * FH * 0.2, y = FH * 0.3 + rnd(Math.round(FH * 0.68));
      if (Math.abs(y - gy) > 15) c.g.bullets.push({ x: G4.blizD > 0 ? -6 : FW + 6, y, vx: G4.blizD * 1.5 * c.s, vy: 0, k: 'gx4bFlake', ph: Math.random() * 6 });
    }
    if (a.t >= 230) c.done(60);
  },
});

// ------------------------------------------------------------------ drawing them
// the ghost ship: a cold glow round it; over it its ghost smoke, the deck guns lighting, the band on the aft deck,
// the fog lapping at its waterline, its broken-off bow
function gx4bTitanicUnder(ctx, b) {
  const f = this.frame;
  const aura = (x, y, rx, a) => { ctx.globalAlpha = a; ctx.fillStyle = '#58F8C8'; ctx.beginPath(); ctx.ellipse(Math.round(x), Math.round(y), rx, 22, 0, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; };
  aura(b.x, b.y + 24, b.w / 2 + 8, b.fade ? 0.03 : 0.06 + 0.02 * Math.sin(f / 20));
  if (b.bow) aura(b.bow.x, b.bow.y + 24, 38, 0.06);
}
function gx4bTitanicOver(ctx, b) {
  const f = this.frame, fade = (b.fade || 0) / 3;
  for (const [x, y, t] of b.puffs || []) { ctx.globalAlpha = (1 - t / 40) * 0.4 * (1 - fade); ctx.fillStyle = '#C8F0E8'; ctx.beginPath(); ctx.arc(x, y, 2 + t / 9, 0, Math.PI * 2); ctx.fill(); }
  ctx.globalAlpha = 1;
  if (b.bow) {   // the bow, broken off (its column marked while it tips over you)
    const w = b.bow;
    if (w.st === 'tilt' && (f >> 2) & 1) { ctx.fillStyle = '#F83800'; for (let y = Math.round(w.y + 46); y < FH; y += 6) { ctx.fillRect(Math.round(w.tx) - 9, y, 1, 3); ctx.fillRect(Math.round(w.tx) + 9, y, 1, 3); } }
    gx4bPut(ctx, gx4bBowImg((f >> 4) & 1, w.flash > 0 && (f >> 1) & 1), w.x, w.y + 22, false, w.a);
  }
  if (b.ports) for (const [i, [x, y]] of gx4bPorts(b).entries()) {   // the deck guns lighting up, one after another
    if (b.ports.t < i * 4) continue;
    const hot = b.ports.t > 36;
    gx4bGlow(ctx, x, y, hot ? 4 : 3, '#F8D878', hot ? 0.5 : 0.3);
    ctx.fillStyle = hot && (f >> 1) & 1 ? '#F8F8F8' : '#F8D878'; ctx.fillRect(Math.round(x) - 1, Math.round(y) - 2, 3, 3);
  }
  if (b.band > 0) {   // the band, ghosts on the aft deck, playing; notes rising
    const x0 = Math.round(b.x - b.w / 2), y0 = Math.round(b.y);
    for (let k = 0; k < 4; k++) {
      const x = x0 + 8 + k * 7, y = y0 + 11 + (((f >> 3) + k) & 1);
      ctx.fillStyle = 'rgba(200,248,232,0.75)'; ctx.fillRect(x, y, 3, 5); ctx.fillRect(x + 1, y - 2, 2, 2);
      ctx.fillStyle = '#F8D878'; ctx.fillRect(x + 3, y + 1 + (k & 1), 2, 1);
      const p = ((f + k * 13) % 40) / 40;
      ctx.globalAlpha = 1 - p; ctx.fillStyle = '#A8F8C8'; ctx.fillRect(x + 1 + Math.round(Math.sin(p * 6 + k) * 2), y - 4 - Math.round(p * 14), 2, 2); ctx.fillRect(x + 2 + Math.round(Math.sin(p * 6 + k) * 2), y - 7 - Math.round(p * 14), 1, 3); ctx.globalAlpha = 1;
    }
  }
  // the fog lapping at its waterline
  const x0 = b.x - b.w / 2;
  for (let x = Math.round(x0) - 6; x < x0 + b.w + 6; x += 5) { const y = b.y + 37 + Math.sin(x / 7 + f / 15) * 1.5; ctx.fillStyle = 'rgba(150,210,210,0.12)'; ctx.beginPath(); ctx.ellipse(x, y, 6, 2.5, 0, 0, Math.PI * 2); ctx.fill(); }
}
// the wreck going down: bow first, then the stern stands up and follows; bubbles, a last ripple
function gx4bSinkStep(v) {
  const t = ++v.t, r3 = n => Math.round(n * 1000) / 1000;
  if (v.w) { v.a1 = r3(Math.min(0.7, t * 0.008)); v.sy = gx4bR(v.sy + 0.2 + t * 0.004); v.sx = gx4bR(v.sx + 0.15); }
  else {
    v.a2 = r3(v.a2 + (1.3 - v.a2) * 0.03); v.by = gx4bR(v.by + (t < 30 ? 0.2 : 0.5 + (t - 30) * 0.006));
    if (t < 100) { v.a1 = r3(v.a1 + (1.25 - v.a1) * 0.02); v.sy = gx4bR(v.sy + 0.08); }
    else v.sy = gx4bR(v.sy + 0.4 + (t - 100) * 0.007);
  }
  v.al = Math.round(Math.max(0, t > 160 ? 1 - (t - 160) / 130 : 1) * 100) / 100;
}
function gx4bDrawWreck(ctx, v) {
  if (!v) return;
  const t = v.t;
  ctx.globalAlpha = v.al;
  if (v.w) gx4bPut(ctx, GxGfx.boss('gx4bTitanic', 0, 'n', 2), v.sx, v.sy, false, v.a1);
  else { gx4bPut(ctx, GxGfx.boss('gx4bTitanic', 0, 'n', 3), v.sx, v.sy, false, v.a1); gx4bPut(ctx, gx4bBowImg(0, false), v.bx, v.by, false, v.a2); }
  ctx.globalAlpha = 1;
  for (const [px, py] of v.w ? [[v.sx, v.sy]] : [[v.sx, v.sy], [v.bx, v.by]]) for (let k = 0; k < 10; k++) {   // bubbles
    const q = (t * 0.8 + k * 17) % 60, x = Math.round(px - 16 + (k * 7) % 32 + Math.sin(k + t / 10) * 3), y = Math.round(py + 20 - q);
    ctx.globalAlpha = Math.max(0, 0.7 * (1 - q / 60)) * Math.min(1, v.al + 0.3); ctx.strokeStyle = '#A8F8E8'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y, 1 + (k % 2), 0, Math.PI * 2); ctx.stroke();
  }
  ctx.globalAlpha = 1;
  if (t > 170) { const q = t - 170, x = v.w ? v.sx : (v.sx + v.bx) / 2; ctx.globalAlpha = Math.max(0, 0.6 - q / 130); ctx.strokeStyle = '#A8F8E8'; ctx.beginPath(); ctx.ellipse(x, Math.min(FH - 10, v.sy + 10), 8 + q * 0.6, 2 + q * 0.15, 0, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1; }
}

// Santa: the reins and the reindeer (under the sledge), the sweep's path, HO HO HO's rings; over him the boosters
function gx4bSantaUnder(ctx, b) {
  const f = this.frame;
  if (b.path && b.path.pts) {   // the sweep, shown before it comes
    const pts = b.path.pts, blink = (f >> 2) & 1;
    ctx.fillStyle = b.path.warn > 0 ? (blink ? '#F83800' : '#F8B8B8') : 'rgba(248,56,0,0.5)';
    for (let i = Math.max(1, b.path.i); i < pts.length; i++) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], n = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0) / 5)); for (let k = 0; k < n; k++) ctx.fillRect(Math.round(x0 + (x1 - x0) * k / n), Math.round(y0 + (y1 - y0) * k / n), 2, 2); }
  }
  for (const [x, y, t] of b.rings || []) { ctx.globalAlpha = Math.max(0, 0.7 - t / 40); ctx.strokeStyle = t % 4 < 2 ? '#F8F8F8' : '#F83800'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y, 6 + t * 1.6, 0, Math.PI * 2); ctx.stroke(); }
  ctx.globalAlpha = 1;
  gx4bTeam(ctx, b.deer || [], b.x + b.face * 15, b.y + 12, f, b.nose);
}
// the reins from the sledge to each reindeer in turn, then the reindeer (the lead one's nose aglow)
function gx4bTeam(ctx, deer, hx, hy, f, nose) {
  let px = hx, py = hy;
  for (let k = deer.length - 1; k >= 0; k--) { const [x, y, d] = deer[k]; gx4bLine(ctx, px, py, x - d * 4, y, '#F8C838'); px = x - d * 4; py = y; }
  deer.forEach(([x, y, d], k) => {
    const gal = ((f >> 2) + k) & 1;
    gx4bPut(ctx, gx4bDeerImg(gal, k === 0, d < 0), x, y - 2);
    if (k === 0) { gx4bGlow(ctx, x + d * 8, y - 1, nose ? 4 + (f & 3) : 2 + ((f >> 3) & 1), '#F83800', nose ? 0.55 : 0.35); }
  });
}
function gx4bSantaOver(ctx, b) {
  const f = this.frame;
  for (const [x, y, t] of b.smk || []) { ctx.globalAlpha = Math.max(0, 0.5 - t / 48); ctx.fillStyle = '#C8C8D8'; ctx.beginPath(); ctx.arc(x - b.face * t * 0.8, y - t * 0.2, 2 + t / 6, 0, Math.PI * 2); ctx.fill(); }
  ctx.globalAlpha = 1;
  if (b.ph >= 3) for (const dy of [18, 23]) {   // the boosters' flames
    const x = Math.round(b.x - b.face * 28), y = Math.round(b.y + dy), n = 4 + ((f + dy) & 3);
    ctx.fillStyle = '#F83800'; ctx.fillRect(b.face > 0 ? x - n : x, y - 1, n, 3); ctx.fillStyle = '#F8D800'; ctx.fillRect(b.face > 0 ? x - n + 2 : x, y, n - 2, 1);
  }
}
// Santa flying off, waving, and what he says
function gx4bDrawBye(ctx, v, f) {
  if (!v) return;
  const d = v.d || 1, ux = d * 1.25, uy = 0.6 - v.t * 0.013, L = Math.hypot(ux, uy), dx = ux / L, dy = uy / L, deer = [];
  for (let k = 0; k < GX4B_DEER; k++) { const s = 30 + (GX4B_DEER - 1 - k) * GX4B_GAP; deer.push([v.x + dx * s, v.y + dy * s, d]); }
  gx4bTeam(ctx, deer, v.x + d * 15, v.y - 4, f, 0);
  gx4bPut(ctx, GxGfx.boss('gx4bSanta', ((f >> 3) & 1) | (d < 0 ? 2 : 0), 'n', 3), v.x, v.y, false, Math.atan2(dy, Math.abs(dx)) * 0.4 * d);
  for (const dy2 of [2, 7]) { const n = 4 + ((f + dy2) & 3), x = Math.round(v.x - d * 28); ctx.fillStyle = '#F83800'; ctx.fillRect(d > 0 ? x - n : x, Math.round(v.y + dy2) - 1, n, 3); ctx.fillStyle = '#F8D800'; ctx.fillRect(d > 0 ? x - n + 2 : x, Math.round(v.y + dy2), n - 2, 1); }   // the boosters
  if (v.t < 190) gxSpeech(ctx, 'HO HO HO! A PRESENT FOR YOU!', Math.max(60, Math.min(FW - 60, v.x)), Math.max(4, Math.min(FH / 2 - 46, v.y + 20)));
}

// ------------------------------------------------------------------ the skies
// THE GHOST SEA: the deep darkening below, a veiled ghost moon, far icebergs drifting by, phosphorescent waves rolling
// down the screen, fog banks, wreckage adrift, bubbles rising
function gx4bBgSea(c, f) {
  const W = VIEW_W, H = VIEW_H;
  const gr = c.createLinearGradient(0, 0, 0, H);
  gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(8,44,52,0.55)');
  c.fillStyle = gr; c.fillRect(0, 0, W, H);
  // the moon, its halo, a veil of cloud across it
  const mx = Math.round(W * 0.76), my = Math.round(30 + Math.sin(f / 900) * 3), halo = c.createRadialGradient(mx, my, 6, mx, my, 38);
  halo.addColorStop(0, 'rgba(168,232,216,0.18)'); halo.addColorStop(1, 'rgba(168,232,216,0)');
  c.fillStyle = halo; c.fillRect(mx - 38, my - 38, 76, 76);
  c.fillStyle = '#9CB8B0'; c.beginPath(); c.arc(mx, my, 11, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#C8DCD4'; c.beginPath(); c.arc(mx - 2, my - 1, 9, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#A8C4BC'; for (const [dx, dy, r] of [[-4, -3, 2], [2, 2, 2.5], [-1, 4, 1.5], [4, -4, 1]]) { c.beginPath(); c.arc(mx + dx, my + dy, r, 0, Math.PI * 2); c.fill(); }
  c.fillStyle = 'rgba(16,36,44,0.55)'; c.fillRect(mx - 22, my + 1 + Math.round(Math.sin(f / 200) * 2), 44, 3); c.fillRect(mx - 16, my + 6, 30, 2);
  // far icebergs, drifting down slowly
  for (let k = 0; k < 3; k++) {
    const y = ((f * 0.08 + k * 130) % (H + 90)) - 60, x = [18, W - 64, W * 0.42][k], r = seeded(90 + k);
    c.fillStyle = 'rgba(52,92,112,0.5)'; c.beginPath(); c.moveTo(x, y + 24);
    for (let i = 1; i < 8; i++) c.lineTo(x + i * 5.5, y + 24 - (4 + r() * 18 * Math.sin(i / 8 * Math.PI)) * (i % 2 ? 1 : 0.45));
    c.lineTo(x + 44, y + 24); c.fill();
    c.fillStyle = 'rgba(120,200,200,0.4)'; c.fillRect(Math.round(x), Math.round(y + 24), 44, 1);
    for (let j = 1; j < 5; j++) { c.fillStyle = 'rgba(52,92,112,' + (0.3 - j * 0.06).toFixed(2) + ')'; c.fillRect(Math.round(x + 4 + j * 3), Math.round(y + 24 + j * 2), 36 - j * 6, 1); }
  }
  // phosphorescent waves rolling by, three depths; their crests glint
  for (let k = 0; k < 11; k++) {
    const L = k % 3, y0 = ((k * 23 + f * (0.18 + L * 0.16)) % (H + 20)) - 10, amp = 1.5 + L, per = 14 + L * 4, a = 0.12 + L * 0.1;
    c.fillStyle = 'rgba(' + ['40,120,130', '60,188,180', '88,248,200'][L] + ',' + a.toFixed(2) + ')';
    for (let x = 0; x < W; x += 2) c.fillRect(x, Math.round(y0 + Math.sin(x / per + k + f / 50) * amp), 2, 1);
    c.fillStyle = 'rgba(200,255,240,' + (a + 0.15).toFixed(2) + ')';
    for (let x = (k * 17 + (f >> 2)) % 31; x < W; x += 31) c.fillRect(x, Math.round(y0 + Math.sin(x / per + k + f / 50) * amp) - 1, 3, 1);
  }
  // fog banks drifting across
  for (let k = 0; k < 3; k++) {
    const y = 40 + k * 62 + Math.sin(f / 300 + k) * 10, x = ((f * 0.2 * (k % 2 ? 1 : -1) + k * 100) % (W + 220) + W + 220) % (W + 220) - 110;
    c.fillStyle = 'rgba(120,170,170,0.06)'; c.beginPath(); c.ellipse(x, y, 110, 14, 0, 0, Math.PI * 2); c.fill();
  }
  // wreckage adrift: a plank, a lifebuoy, a crate, a deckchair
  for (let k = 0; k < 4; k++) {
    const y = Math.round(((f * 0.22 + k * 61) % (H + 30)) - 15), x = Math.round(((k * 53 + 19) % (W - 30)) + 15 + Math.sin(f / 60 + k) * 4);
    if (k === 0) { c.fillStyle = 'rgba(92,72,44,0.75)'; c.fillRect(x - 5, y, 11, 2); c.fillStyle = 'rgba(140,112,72,0.75)'; c.fillRect(x - 5, y, 11, 1); }
    else if (k === 1) { c.strokeStyle = 'rgba(200,208,200,0.7)'; c.lineWidth = 2; c.beginPath(); c.arc(x, y, 3, 0, Math.PI * 2); c.stroke(); c.fillStyle = 'rgba(160,56,48,0.8)'; c.fillRect(x - 4, y, 2, 1); c.fillRect(x + 3, y, 2, 1); c.fillRect(x, y - 4, 1, 2); }
    else if (k === 2) { c.fillStyle = 'rgba(84,64,40,0.75)'; c.fillRect(x - 3, y - 3, 6, 6); c.fillStyle = 'rgba(120,96,60,0.75)'; c.fillRect(x - 3, y, 6, 1); c.fillRect(x, y - 3, 1, 6); }
    else { c.fillStyle = 'rgba(120,96,60,0.7)'; for (let i = 0; i < 5; i++) c.fillRect(x - 3 + i, y - 3 + i, 1, 1); c.fillRect(x + 2, y + 2, 4, 1); c.fillRect(x - 2, y + 3, 1, 2); }
  }
  // bubbles rising
  c.strokeStyle = 'rgba(168,248,232,0.35)'; c.lineWidth = 1;
  for (let k = 0; k < 14; k++) { const y = H - ((f * (0.3 + (k % 3) * 0.15) + k * 47) % (H + 10)), x = (k * 37) % W + Math.sin(f / 20 + k) * 2; c.beginPath(); c.arc(Math.round(x), Math.round(y), 1 + (k % 2), 0, Math.PI * 2); c.stroke(); }
}

// NORTH POLE: a deep blue night, stars, the aurora rippling across the top, two floating ice caps (the candy-cane
// workshop, a cottage) drifting by with their chimneys smoking, snow falling in three layers
let GX4B_SHOP = null, GX4B_HUT = null;
// an ice cap, w wide, its top at y: snow on top, blue ice, icicles under it
function gx4bCap(c, x0, y, w, r) {
  for (let x = x0; x < x0 + w; x++) {
    const e = Math.min(x - x0, x0 + w - 1 - x), drop = Math.min(10, e * 0.7) + (e > 3 ? r() * 4 : 0);
    Pix.rect(c, x, y, 1, 2, '#F8F8F8'); Pix.rect(c, x, y + 2, 1, 2, '#D8ECF8'); Pix.rect(c, x, y + 4, 1, Math.round(drop), x % 3 ? '#88B8E0' : '#A8D0F0');
    if (e > 4 && x % 4 === 0) Pix.rect(c, x, y + 4 + Math.round(drop), 1, 2 + Math.round(r() * 3), '#5C88B8');
  }
}
// the workshop: candy-cane pillars, red walls, warm windows, a snowy green roof with a star, two chimneys
function gx4bShopCanvas() {
  if (GX4B_SHOP) return GX4B_SHOP;
  const c = (GX4B_SHOP = makeCanvas(84, 60)).getContext('2d'), r = seeded(77);
  gx4bCap(c, 0, 40, 84, r);
  Pix.rect(c, 18, 22, 48, 18, '#B82828'); Pix.rect(c, 18, 22, 48, 1, '#E05050');
  for (let x = 20; x < 64; x += 4) Pix.rect(c, x, 23, 1, 17, '#A02020');
  for (const px of [15, 64]) for (let y = 16; y < 40; y++) Pix.rect(c, px, y, 4, 1, (y + px) % 4 < 2 ? '#F8F8F8' : '#E02818');   // candy-cane pillars
  for (let y = 0; y <= 16; y++) { const hw = Math.round((16 - y) * 2.6); Pix.rect(c, 42 - hw, 6 + y, hw * 2, 1, y < 2 ? '#F8F8F8' : '#2C6C3C'); Pix.rect(c, 42 - hw, 6 + y, 2, 1, '#F8F8F8'); Pix.rect(c, 40 + hw, 6 + y, 2, 1, '#F8F8F8'); }
  Pix.rect(c, 12, 22, 60, 2, '#F8F8F8');
  for (const cx of [27, 53]) { Pix.rect(c, cx, 6, 5, 9, '#8C3C2C'); Pix.rect(c, cx - 1, 5, 7, 2, '#F8F8F8'); }
  for (const wx of [22, 54]) { Pix.rect(c, wx, 27, 8, 7, '#F8D878'); Pix.rect(c, wx + 3, 27, 1, 7, '#B82828'); Pix.rect(c, wx, 30, 8, 1, '#B82828'); }
  Pix.rect(c, 37, 28, 10, 12, '#2C6C3C'); Pix.rect(c, 38, 29, 8, 11, '#3C8C4C'); Pix.disc(c, 42, 25, 3, '#1C5C2C'); Pix.rect(c, 42, 27, 1, 1, '#E02818');   // door, wreath
  Pix.rect(c, 41, 1, 3, 3, '#F8D800'); Pix.rect(c, 42, 0, 1, 5, '#F8D800'); Pix.rect(c, 40, 2, 5, 1, '#F8D800');   // the star
  for (const tx of [4, 76]) for (let y = 0; y < 10; y++) { const hw = y >> 1; Pix.rect(c, tx - hw, 30 + y, hw * 2 + 1, 1, y % 3 ? '#1C5C2C' : '#F8F8F8'); }
  for (const [x, y] of [[9, 38], [72, 37]]) { Pix.rect(c, x, y - 6, 1, 7, '#F8F8F8'); Pix.rect(c, x + 1, y - 7, 2, 1, '#F8F8F8'); Pix.rect(c, x + 3, y - 6, 1, 2, '#E02818'); Pix.rect(c, x, y - 4, 1, 1, '#E02818'); Pix.rect(c, x, y - 1, 1, 1, '#E02818'); }
  return GX4B_SHOP;
}
// a log cottage on its own little floe, its chimney smoking
function gx4bHutCanvas() {
  if (GX4B_HUT) return GX4B_HUT;
  const c = (GX4B_HUT = makeCanvas(44, 34)).getContext('2d'), r = seeded(78);
  gx4bCap(c, 0, 22, 44, r);
  Pix.rect(c, 10, 12, 24, 10, '#7C4C2C'); for (let y = 13; y < 22; y += 2) Pix.rect(c, 10, y, 24, 1, '#5C3418');
  for (let y = 0; y <= 8; y++) { const hw = 14 - y; Pix.rect(c, 22 - hw, 4 + y, hw * 2, 1, y < 2 ? '#F8F8F8' : y % 2 ? '#E8F4F8' : '#C8DCE8'); }
  Pix.rect(c, 27, 2, 4, 6, '#8C3C2C'); Pix.rect(c, 26, 1, 6, 2, '#F8F8F8');
  Pix.rect(c, 14, 15, 5, 4, '#F8D878'); Pix.rect(c, 16, 15, 1, 4, '#5C3418'); Pix.rect(c, 25, 15, 5, 7, '#3C2010');
  return GX4B_HUT;
}
function gx4bBgPole(c, f) {
  const W = VIEW_W, H = VIEW_H;
  const gr = c.createLinearGradient(0, 0, 0, H);
  gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(60,36,96,0.45)');
  c.fillStyle = gr; c.fillRect(0, 0, W, H);
  const r = seeded(4242);
  for (let k = 0; k < 26; k++) { const x = Math.floor(r() * W), y = Math.floor(r() * H), on = (f + k * 13) % 110 < 8; c.fillStyle = on ? '#F8F8F8' : k % 3 ? '#8C8CC8' : '#C8C878'; c.fillRect(x, y, 1, 1); if (on) { c.fillRect(x - 1, y, 3, 1); c.fillRect(x, y - 1, 1, 3); } }
  // the aurora: two curtains rippling across the top, green and violet
  for (let band = 0; band < 2; band++) for (let x = 0; x < W; x += 2) {
    const base = 18 + band * 26 + Math.sin(x / 37 + f / 160 + band * 2) * 10 + Math.sin(x / 13 + f / 70) * 3, h = 26 + Math.sin(x / 23 + f / 90 + band) * 10, a = 0.1 + 0.07 * Math.sin(x / 19 + f / 50 + band * 3), col = band ? '168,96,232' : '72,248,160';
    c.fillStyle = 'rgba(' + col + ',' + (a * 0.5).toFixed(3) + ')'; c.fillRect(x, Math.round(base - h), 2, Math.round(h * 0.5));
    c.fillStyle = 'rgba(' + col + ',' + a.toFixed(3) + ')'; c.fillRect(x, Math.round(base - h * 0.5), 2, Math.round(h * 0.5));
    c.fillStyle = 'rgba(' + col + ',' + Math.min(0.5, a * 2).toFixed(3) + ')'; c.fillRect(x, Math.round(base), 2, 2);
  }
  // the floating ice caps, drifting down; smoke from the chimneys
  const smoke = (x, y, k) => { for (let i = 0; i < 4; i++) { const p = ((f + i * 15 + k * 7) % 60) / 60; c.fillStyle = 'rgba(200,200,216,' + (0.4 * (1 - p)).toFixed(2) + ')'; c.beginPath(); c.arc(x + Math.sin(i * 2 + p * 3) * 2 + p * 6, y - p * 18, 1 + p * 3, 0, Math.PI * 2); c.fill(); } };
  const per = H + 170, ys = ((f * 0.1) % per) - 100, cyc = Math.floor((f * 0.1) / per), sx = cyc % 2 ? 6 : W - 92;
  c.globalAlpha = 0.55; c.drawImage(gx4bShopCanvas(), sx, Math.round(ys)); c.globalAlpha = 1; smoke(sx + 29, ys + 5, 0); smoke(sx + 55, ys + 5, 1);
  const yh = (((f * 0.14) + per / 2) % per) - 60, hx = Math.floor((f * 0.14 + per / 2) / per) % 2 ? W - 56 : 14;
  c.globalAlpha = 0.55; c.drawImage(gx4bHutCanvas(), hx, Math.round(yh)); c.globalAlpha = 1; smoke(hx + 29, yh + 1, 2);
  // snow, three layers
  for (let k = 0; k < 54; k++) {
    const L = k % 3, x = Math.round((r() * W + Math.sin(f / 40 + k) * 4 * (L + 1) + W) % W), y = Math.round((r() * H + f * (0.25 + L * 0.3)) % (H + 4)) - 2;
    c.fillStyle = 'rgba(248,248,248,' + (0.35 + L * 0.2).toFixed(2) + ')'; c.fillRect(x, y, L === 2 ? 2 : 1, L === 2 ? 2 : 1);
  }
}

// ------------------------------------------------------------------ their sounds (through the game's Sound: volume, mute, and an online host's guests hear them too)
const GX4B_SFX = {
  gx4bSplash(S, t) { S.noise(3000, t, [[0, 0.18], [0.12, 0.06], [0.22, 0]], 900); },
  gx4bWisp(S, t) { S.note(1200, t, 0.5, { vol: 0.05, slideTo: 500, wave: 'p25' }); S.note(1270, t, 0.5, { vol: 0.03, slideTo: 530, wave: 'p12' }); },
  gx4bFlare(S, t) { S.noise(9000, t, [[0, 0.05], [0.3, 0.14], [0.45, 0]], 3000); S.note(800, t, 0.4, { vol: 0.04, slideTo: 2400, wave: 'p12' }); },
  gx4bClack(S, t) { S.noise(4000, t, [[0, 0.25], [0.03, 0]]); S.note(70, t, 0.04, { vol: 0.1, wave: 'p25', flat: true }); },
  gx4bCoalShot(S, t) { S.noise(1200, t, [[0, 0.35], [0.15, 0.1], [0.25, 0]], 500); },
  gx4bJingle(S, t) { for (let i = 0; i < 6; i++) { S.noise(15000, t + i * 0.06, [[0, 0.1], [0.05, 0]]); S.note([2637, 3136, 2637, 3520][i % 4], t + i * 0.06, 0.05, { vol: 0.03, wave: 'p12' }); } },
  gx4bBoing(S, t) { S.note(200, t, 0.25, { vol: 0.12, slideTo: 600, wave: 'p50', decayTo: 0.3 }); },
  gx4bCrack(S, t) { S.noise(7000, t, [[0, 0.3], [0.05, 0.1], [0.12, 0.2], [0.2, 0]], 2000); },
  gx4bPop(S, t) { S.noise(5000, t, [[0, 0.2], [0.1, 0]]); S.note(1500, t, 0.08, { vol: 0.05, slideTo: 3000, wave: 'p12' }); },
  gx4bFuse(S, t) { S.noise(11000, t, [[0, 0.06], [0.6, 0.06], [0.7, 0]]); },
  gx4bThrow(S, t) { S.noise(6000, t, [[0, 0.02], [0.08, 0.1], [0.16, 0]], 2500); },
  gx4bDrum(S, t) { for (let i = 0; i < 8; i++) S.noise(4500, t + i * 0.04, [[0, 0.1 + i * 0.012], [0.03, 0]]); },
  gx4bTing(S, t) { S.note(3136, t, 0.06, { vol: 0.04, wave: 'p25', decayTo: 0.3 }); },
  gx4bSwell(S, t) { S.noise(500, t, [[0, 0.01], [0.4, 0.22], [0.9, 0]], 250); S.note(55, t, 0.9, { vol: 0.08, wave: 'tri', slideTo: 70 }); },
  gx4bFreeze(S, t) { S.seq([96, 93, 91, 88], 0.035, t, { vol: 0.05, wave: 'p12', decayTo: 0.4 }); },
  // a liner's foghorn: low and long
  gx4bHorn(S, t) { S.note(38, t, 1.1, { vol: 0.15, wave: 'p50', flat: true }); S.note(45, t, 1.1, { vol: 0.08, wave: 'p25', flat: true }); S.note(26, t, 1.1, { vol: 0.15, wave: 'tri', flat: true }); },
  gx4bBell(S, t) { for (let i = 0; i < 3; i++) { S.note(84, t + i * 0.22, 0.2, { vol: 0.08, wave: 'p25', decayTo: 0.15 }); S.note(96, t + i * 0.22, 0.12, { vol: 0.04, wave: 'p12', decayTo: 0.1 }); } },
  gx4bCreak(S, t) { S.note(110, t, 0.6, { vol: 0.12, slideTo: 70, wave: 'p12', flat: true }); S.noise(800, t, [[0, 0.1], [0.5, 0.15], [0.7, 0]], 400); },
  gx4bCannon(S, t) { S.noise(900, t, [[0, 0.4], [0.18, 0.12], [0.3, 0]], 300); S.note(45, t, 0.15, { vol: 0.12, wave: 'tri', slideTo: 40 }); },
  gx4bPuff(S, t) { S.noise(2000, t, [[0, 0.1], [0.2, 0.04], [0.3, 0]], 800); },
  // the ghost band: a waltz phrase, slowed down and sagging out of tune
  gx4bBand(S, t) { [69, 72, 76, 75, 72, 68].forEach((n, i) => { S.note(n, t + i * 0.32, 0.3, { vol: 0.06, wave: 'p25', slideTo: S.midi(n) * 0.96 }); S.note(n - 12, t + i * 0.32, 0.3, { vol: 0.04, wave: 'tri', slideTo: S.midi(n - 12) * 0.96 }); }); },
  gx4bPluck(S, t) { S.note(45, t, 0.15, { vol: 0.09, wave: 'tri' }); S.note(64, t + 0.14, 0.1, { vol: 0.04, wave: 'p25' }); S.note(64, t + 0.28, 0.1, { vol: 0.04, wave: 'p25' }); },
  gx4bHoho(S, t) { S.note(48, t, 0.18, { vol: 0.14, wave: 'p50', slideTo: S.midi(45) }); S.note(55, t, 0.18, { vol: 0.06, wave: 'p25', slideTo: S.midi(52) }); },
  gx4bRocket(S, t) { S.noise(3000, t, [[0, 0.1], [0.6, 0.3], [1, 0]], 9000); S.note(50, t, 0.9, { vol: 0.08, slideTo: 600, wave: 'p25' }); },
  gx4bLaser(S, t) { S.note(2400, t, 0.4, { vol: 0.07, slideTo: 300, wave: 'p12' }); S.noise(12000, t, [[0, 0.12], [0.4, 0]]); },
  gx4bPump(S, t) { S.noise(3000, t, [[0, 0.2], [0.04, 0]]); S.noise(2000, t + 0.12, [[0, 0.22], [0.05, 0]]); },
  gx4bWind(S, t) { S.noise(1500, t, [[0, 0.01], [0.5, 0.25], [1.4, 0.2], [2, 0]], 600); },
};
{
  const play = Sound.play;
  Sound.play = function (name) {
    const fx = GX4B_SFX[name];
    if (fx && Sound.ctx && !Sound.muted && Sound.master.gain.value > 0) fx(Sound, Sound.ctx.currentTime + 0.005);
    return play.apply(this, arguments);
  };
}

// ------------------------------------------------------------------ their music
// THE GHOST SEA: eerie, slow and stormy (natural minor; the diminished ii for the chill). The ghost ship's own: a slow
// waltz in harmonic minor, as a ghostly palm-court band would play it
SONGS.gx4bSea = { name: 'FATHOMS BELOW', root: 50, bpm: 84, groove: 'gx4bSwell', prog: [0, 5, 3, 4, 0, 5, 1, 4], scale: [0, 2, 3, 5, 7, 8, 10],
  mel: '4-------5-4-3---' + '2-------0-------' + '3---2---1---z---' + '0-----------....' + '4-------5-4-7---' + '6-------5-------' + '4---3---2---1---' + '1-------z---0---' };
SONGS.gx4bBossSea = { name: 'THE GHOST WALTZ', root: 57, bpm: 132, groove: 'gx4bWaltz', steps: 12, prog: [0, 0, 3, 4, 5, 3, 4, 0], scale: [0, 2, 3, 5, 7, 8, 11],
  mel: '4-----3-4---' + '7-------6---' + '5-----4-5---' + '6-------4---' + '3-----2-3---' + '5-------4---' + '2---1---z---' + '0-----------' };
// NORTH POLE: jingly and festive (sleigh-bell hats); Santa's: a rocking boogie in mixolydian
SONGS.gx4bPole = { name: 'JINGLE ENGINE', root: 67, bpm: 152, groove: 'gx4bSleigh', prog: [0, 3, 4, 0, 5, 3, 1, 4], scale: [0, 2, 4, 5, 7, 9, 11],
  mel: '0.2.4.7-6.4.5---' + '3.5.7.9-7.5.4---' + '4.6.8.B-A.8.7-6-' + '7---4---0-------' + '5.7.9.C-B.9.7---' + '6.5.4.3-4.5.6---' + '5.4.3.2-1.2.3-4-' + '4-2-1-z-0-------' };
SONGS.gx4bBossPole = { name: "SANTA'S SLEDGEHAMMER", root: 64, bpm: 168, groove: 'gx4bRock', prog: [0, 3, 0, 4, 3, 6, 0, 4], scale: [0, 2, 4, 5, 7, 9, 10],
  mel: '0-0-4-0-6---5-4-' + '2-2-4-2-5---4-2-' + '0-0-4-0-6---7-9-' + '7-6-5-4-2-------' + '7-7-9-7-A---9-7-' + '6-6-7-6-9---7-6-' + '4-4-5-4-7---6-4-' + '2---4---0-------' };
Object.assign(GROOVES, {
  gx4bSwell: { drums: 'k.....k.s.....oh', bass: 'r---.-r-f---t-.-' },
  gx4bWaltz: { drums: 'k...h...h...', bass: 'r...f...o...' },
  gx4bSleigh: { drums: 'k.hhs.hhk.hhs.hh', bass: 'r.f.o.f.r.f.o.f.' },
  gx4bRock: { drums: 'k.h.s.hkk.hks.h.', bass: 'r.r.o.r.f.f.o.f.' },
});
Object.assign(ROCK_SONGS, {
  gx4bSea: { name: 'FATHOMS BELOW (DOOM)', root: 38, bpm: 76, scale: 'minor', form: 'IVBV', parts: {
    I: { lead: '@gx4bSea', riff: 'X---------------', dr: 'half' },
    V: { lead: '@gx4bSea', riff: 'X-----x.X---p.p.', dr: 'half', harm: 2 },
    B: { from: 'gx4bSea', riff: 'p.p.p.p.X---X---', dr: 'rock' } } },
  gx4bBossSea: { name: 'THE GHOST WALTZ (METAL)', root: 45, bpm: 140, scale: 'harm', steps: 12, form: 'IIS', parts: {
    I: { lead: '@gx4bBossSea', riff: 'X-.p.pX-.p.p', dr: 'waltz12', harm: 2 },
    S: { from: 'gx4bBossSea', riff: 'pppppppppppp', dr: 'waltz12', solo: true } } },
  gx4bPole: { name: 'JINGLE ENGINE (ROCK)', root: 43, bpm: 152, scale: 'major', form: 'IVIS', parts: {
    I: { lead: '@gx4bPole', riff: 'X---x.x.X---x.x.', dr: 'drive', harm: 2 },
    V: { from: 'gx4bPole', riff: 'X-x.x.X-x.x.X-x.', dr: 'rock' },
    S: { from: 'gx4bPole', riff: 'X-x.x.X-x.x.X-x.', dr: 'rock', solo: true } } },
  gx4bBossPole: { name: "SANTA'S SLEDGEHAMMER (METAL)", root: 40, bpm: 172, scale: 'mixo', form: 'IVIS', parts: {
    I: { lead: '@gx4bBossPole', riff: 'P.ppP.ppX-X-X---', dr: 'double', harm: 2 },
    V: { from: 'gx4bBossPole', riff: 'p.ppp.ppp.ppX-X-', dr: 'gallop' },
    S: { from: 'gx4bBossPole', riff: 'pppppppppppppppp', dr: 'double', solo: true } } },
});
Object.assign(SYNTH_SONGS, {
  gx4bSea: { name: 'FATHOMS 1912', root: 38, bpm: 76, scale: 'minor', sev: 1, att: 0.8, form: 'IVBV', parts: {   // a dark, slow tide
    I: { bell: '@gx4bSea', bs: 'r-------', f: [400, 1200], rise: 1 },
    V: { lead: '@gx4bSea', bs: 'r.....r.', arp: '0.2.1.2.', dr: 'halfd', f: 1500 },
    B: { from: 'gx4bSea', pad: 'P-------P---P---', bs: 'r---------------', bell: '@gx4bSea', dr: 'half', f: 900, rise: 1 } } },
  gx4bBossSea: { name: 'PHANTOM BALLROOM', root: 45, bpm: 126, scale: 'harm', steps: 12, sev: 1, dirt: 1, form: 'IVL', parts: {
    I: { bell: '@gx4bBossSea', bs: 'r-----------', f: [500, 1600], rise: 1 },
    V: { lead: '@gx4bBossSea', bs: 'r...o...o...', arp: '012321', dr: 'waltz12' },
    L: { from: 'gx4bBossSea', bs: 'r.o.r.o.r.o.', arp: '012321', dr: 'waltz12', solo: 1 } } },
  gx4bPole: { name: 'NORTHERN LIGHTS 1985', root: 43, bpm: 124, scale: 'major', sev: 1, form: 'IVLV', parts: {
    I: { bell: '@gx4bPole', bs: 'r.o.', f: [600, 2000], rise: 1 },
    V: { lead: '@gx4bPole', bs: 'r.o.', arp: '0123', dr: 'four', f: 2400 },
    L: { from: 'gx4bPole', bs: 'ro', arp: '0123', dr: 'four', solo: 1 } } },
  gx4bBossPole: { name: 'TURBO SLEIGH 2000', root: 40, bpm: 140, scale: 'mixo', dirt: 1, pump: 0.3, form: 'IVLV', parts: {
    I: { from: 'gx4bBossPole', pad: 'S..S..S.S.......', bs: 'r', dr: 'kicks', f: [500, 1600], rise: 1 },
    V: { lead: '@gx4bBossPole', bs: 'rrorrror', arp: '0123', dr: 'push', f: 2400 },
    L: { from: 'gx4bBossPole', bs: 'ro', arp: '0123', dr: 'four', solo: 1 } } },
});

// ------------------------------------------------------------------ their WARNING and VICTORY pictures (gxbossart.js, 112x64)
// (GX_BOSS_ART and GX_BOSS_TALES are made in gxbossart.js, which loads after this file: they're added to once the page
// has loaded, see the end)
// the ghost sea at night: a moon, mist, glowing waves along the bottom
function gx4bArtSea(c, t) {
  Pix.bands(c, 0, INTRO_H, ['#02050C', '#040A16', '#06101E', '#081826', '#0A202C']);
  Pix.stars(c, 24, 31, t, 36);
  GxArt.glow(c, 94, 12, 11, 10, '#1C3038');
  Pix.disc(c, 94, 12, 7, '#9CB8B0'); Pix.disc(c, 93, 11, 6, '#C8DCD4'); Pix.rect(c, 91, 10, 2, 2, '#A8C4BC'); Pix.rect(c, 95, 13, 2, 1, '#A8C4BC');
  Art.dith(c, 78, 13, 32, 2, '#1C3038', (t >> 4) & 1);
}
function gx4bArtWaves(c, t, y0) {
  Pix.rect(c, 0, y0, INTRO_W, INTRO_H - y0, '#06141C');
  for (let k = 0; k < 5; k++) { const y = y0 + 1 + k * 3; for (let x = 0; x < INTRO_W; x += 2) Pix.rect(c, x, y + Math.round(Math.sin((x + t * (k + 1) * 0.4) / 6)), 2, 1, k % 2 ? '#1C5C58' : '#2C7C70'); for (let x = (k * 13 + (t >> 2)) % 23; x < INTRO_W; x += 23) Pix.rect(c, x, y - 1, 2, 1, '#58F8D8'); }
}
// the polar night: aurora, stars
function gx4bArtPole(c, t) {
  Pix.bands(c, 0, INTRO_H, ['#050A1E', '#0A1030', '#141844', '#201C54', '#2C2060']);
  Pix.stars(c, 30, 41, t, 44);
  for (let x = 0; x < INTRO_W; x++) {
    const base = Math.round(14 + Math.sin(x / 17 + t / 40) * 5), h = Math.round(10 + Math.sin(x / 9 + t / 25) * 4);
    Art.dith(c, x, base - h, 1, h, x % 7 < 4 ? '#2C8C5C' : '#6C3CA8', x & 1); Pix.rect(c, x, base, 1, 1, x % 7 < 4 ? '#58F8A8' : '#A878E8');
  }
}
const gx4bArtSnow = (c, t, n = 26) => { const r = seeded(19); for (let k = 0; k < n; k++) Pix.rect(c, Math.floor((r() * INTRO_W + Math.sin(t / 30 + k) * 3 + INTRO_W) % INTRO_W), Math.floor((r() * INTRO_H + t * (0.2 + (k % 3) * 0.15)) % INTRO_H), 1, 1, k % 3 ? '#F8F8F8' : '#A8C8F0'); };
const GX4B_SIL = [null, ...Array(11).fill('#101028')];
const GX4B_ART = {
  // the ghost liner glides out of the fog, funnels smoking, its band playing; an iceberg ahead; you below
  gx4bTitanic: {
    intro(c, t) {
      gx4bArtSea(c, t);
      const B = GxArt.boss('gx4bTitanic', (t >> 4) & 1, 1), by = 5 + Math.round(Math.sin(t / 30));
      c.drawImage(B, 0, by);
      for (const fx of GX4B_FUN) for (let k = 0; k < 3; k++) { const p = ((t + k * 20 + fx * 3) % 60) / 60; Pix.disc(c, Math.round(fx + 2 - p * 8), Math.round(by + 2 - p * 10), Math.round(1 + p * 2), p < 0.5 ? '#B8E0D8' : '#5C8C88'); }
      for (let k = 0; k < 3; k++) { const p = ((t + k * 16) % 48) / 48; GxArt.note(c, 22 + k * 9 + Math.round(Math.sin(p * 6) * 2), by + 10 - Math.round(p * 12), p < 0.6 ? '#A8F8C8' : '#3C8C78'); }
      gx4bArtWaves(c, t, 50);
      Art.dith(c, 0, 40, INTRO_W, 8, '#2C4C50', (t >> 3) & 1);
      for (let x = 0; x < 26; x++) { const h = Math.round(4 + Math.sin(x / 26 * Math.PI) * 12 + ((x * 7) % 5)); Pix.rect(c, 4 + x, 50 - h, 1, h, x < 13 ? '#E8F4F8' : '#A8D0E8'); Pix.rect(c, 4 + x, 50 - h, 1, 1, '#F8F8F8'); }
      Art.dith(c, 6, 50, 22, 6, '#4C88B8', 0);
      GxArt.ship(c, 86 + Math.round(Math.sin(t / 20) * 6), 44, t);
    },
    // gone down, bow first: the stern stands up out of the glowing sea, bubbles rising
    outro(c, t) {
      gx4bArtSea(c, t);
      const p = Math.min(1, t / 220);
      GxArt.rot(c, GxArt.boss('gx4bTitanic', 0, 3), 36, 30 + Math.round(p * 16), 0.3 + p * 0.95);
      GxArt.rot(c, gx4bBowImg(0, false), 78, 40 + Math.round(p * 22), 0.7 + p * 0.5);
      gx4bArtWaves(c, t, 46);
      for (let k = 0; k < 10; k++) { const q = (t + k * 13) % 40, x = (k < 5 ? 34 : 74) + ((k * 7) % 12) - 6; Pix.rect(c, x + Math.round(Math.sin(k + t / 8)), 60 - q, 1, 1, q < 20 ? '#A8F8E8' : '#3C8C88'); }
      if (p >= 1) GxArt.glow(c, 56, 20 - ((t >> 2) % 18), 3, 3, '#A8F8E8', t & 1);
      GxArt.ship(c, 94, 24 + Math.round(Math.sin(t / 14) * 2), t);
    },
    bubble(t, outro) { return outro ? (t % 200 > 40 ? gxaSay('GOODNIGHT...', 4, 2) : null) : t % 180 > 30 ? gxaSay(t % 360 < 180 ? 'ICEBERG, RIGHT AHEAD!' : 'ALL HANDS!', 2, 2) : null; },
  },
  // Santa sweeps over the workshop with his team, presents (bombs!) dropping; you below in the snow
  gx4bSanta: {
    intro(c, t) {
      gx4bArtPole(c, t);
      c.drawImage(gx4bHutCanvas(), 2, 32);
      Pix.rect(c, 0, 56, INTRO_W, 8, '#E8F4F8'); Pix.rect(c, 0, 56, INTRO_W, 1, '#F8F8F8'); Art.dith(c, 0, 60, INTRO_W, 4, '#A8D0E8', 0);
      const x = 14 + Math.round(Math.sin(t / 50) * 6), y = 8 + Math.round(Math.sin(t / 23) * 2), f = (t >> 3) & 1;
      for (let k = 2; k >= 0; k--) { const dx = x + 58 + k * 14, dy = y + 12 - k * 2 + ((t >> 2) + k & 1); Pix.line(c, k === 2 ? x + 44 : dx - 10, k === 2 ? y + 12 : dy + 4, dx + 2, dy + 6, '#F8C838'); c.drawImage(gx4bDeerImg(((t >> 2) + k) & 1, k === 2, false), dx, dy); }
      c.drawImage(GxArt.boss('gx4bSanta', f, 1), x, y);
      for (let k = 0; k < 2; k++) { const q = (t + k * 40) % 80; c.drawImage(GxGfx.get('gx4bPBomb', (t >> 2) & 1), x + 6 + k * 10, y + 24 + q * 0.5); }
      gx4bArtSnow(c, t);
      GxArt.ship(c, 88, 38 + Math.round(Math.sin(t / 16) * 2), t);
    },
    // off he flies across the moon, waving; a present by your tank in the snow, with your name on it
    outro(c, t) {
      Pix.bands(c, 0, INTRO_H, ['#050A1E', '#0A1030', '#141844', '#201C54']); Pix.stars(c, 26, 43, t, 40);
      GxArt.glow(c, 72, 24, 26, 24, '#1C1C40', 0);
      Pix.disc(c, 72, 24, 20, '#E8E0B8'); Pix.disc(c, 70, 22, 18, '#F8F0C8'); for (const [cx, cy, r] of [[64, 16, 3], [78, 28, 4], [70, 34, 2], [82, 16, 2]]) Pix.disc(c, cx, cy, r, '#E8DCA8');
      const q = (t * 0.45) % 170, sx = Math.round(-40 + q), sy = Math.round(40 - q * 0.22), f = (t >> 3) & 1, sled = GxArt.boss('gx4bSanta', f, 1, GX4B_SIL);
      for (let k = 0; k < 4; k++) { const dx = sx + 30 + k * 8, dy = sy + 2 - k * 2; Pix.line(c, dx - 6, dy + 4, dx, dy + 3, '#101028'); c.drawImage(gx4bImg('deerS' + (((t >> 2) + k) & 1), () => gx4bDeerGrid(((t >> 2) + k) & 1, false), GX4B_SIL), dx, dy, 9, 7); }
      c.drawImage(sled, sx, sy, 28, 16);
      Pix.rect(c, 0, 50, INTRO_W, 14, '#E8F4F8'); Pix.rect(c, 0, 50, INTRO_W, 1, '#F8F8F8'); Art.dith(c, 0, 58, INTRO_W, 6, '#A8D0E8', 1);
      Art.tank(c, 22, 42, 0, false, t >> 3);
      Pix.rect(c, 44, 42, 10, 9, '#100808'); Pix.rect(c, 45, 43, 8, 7, '#38A848'); Pix.rect(c, 48, 43, 2, 7, '#F8C838'); Pix.rect(c, 45, 46, 8, 1, '#F8C838'); Pix.rect(c, 46, 40, 3, 2, '#F8C838'); Pix.rect(c, 50, 40, 3, 2, '#F8C838');
      Pix.rect(c, 54, 44, 9, 6, '#F8F0D0'); gxTiny(c, 'P1', 59, 45, '#C82020', null);
      gx4bArtSnow(c, t, 18);
    },
    bubble(t, outro) { return outro ? (t % 200 > 30 ? gxaSay('HAPPY CHRISTMAS TO ALL!', 2, 2) : null) : t > 8 ? gxaSay(t % 240 < 120 ? 'HO HO HO!' : "YOU'RE ON MY LIST!", 4, 34) : null; },
  },
};
const GX4B_TALES = {
  gx4bTitanic: { intro: ['A LINER LOST LONG AGO', 'SHOOT THE BERG BEFORE IT RAMS'], outro: 'AT REST AT LAST' },
  gx4bSanta: { intro: ['THE BIG MAN IN RED IS HERE', 'DODGE THE REINDEER CHAIN!'], outro: 'HE LEFT YOU A PRESENT!' },
};
function gx4bArtHook() {
  if (typeof GX_BOSS_ART !== 'undefined') Object.assign(GX_BOSS_ART, GX4B_ART);
  if (typeof GX_BOSS_TALES !== 'undefined') Object.assign(GX_BOSS_TALES, GX4B_TALES);
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', gx4bArtHook); else setTimeout(gx4bArtHook, 0);
