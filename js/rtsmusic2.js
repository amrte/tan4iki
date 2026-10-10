'use strict';
// =====================================================================
//  DESERT DOMINION's front-end music and its announcement stingers, in all three MUSIC STYLEs (chiptune: SONGS,
//  rock: ROCK_SONGS, synthwave: SYNTH_SONGS). The sound of an early-90s strategy game on an FM sound card: desert
//  epic in the old Middle-Eastern modes, a pulsing bass, hand-drum rhythms (baladi, maqsum) under marches.
//  Every melody here is written for this game.
//    rtsIntro   the opening: epic                      D phrygian dominant (hijaz), slow and grand
//    rtsMenu    the mode's menu: martial, confident     E harmonic minor, a galloping maqsum
//    rtsMap     choosing a region of KHARRA: mysterious B double harmonic, sparse
//    rtsBrief   the advisor's briefing: calm, ominous   A harmonic minor, slow, under the words
//    rtsWin     victory (loops)                         D harmonic major: a fanfare with a desert accent
//    rtsLose    defeat (loops)                          F# harmonic minor, a lament
//    rtsScore   the score screen: the tally             A "ukrainian dorian" (minor with a raised fourth), bouncy
//    rtsRegent  the final mission against THE REGENT    C hungarian minor, a dark imperial march
//  'rts' (the mode's title screen) plays rtsIntro, unless the engine has given the mode a tune of its own.
//  rtsSting(kind): the original's spoken announcements become short jingles (see RTS_M2_STINGS), in the style
//  chosen, through the sound effects' volume (Sound.master), silent when the sound is muted.
//  Formats: music.js (chiptune), rock.js and synthwave.js explain theirs. The rock and synthwave verses borrow the
//  chiptune melodies ('@rtsIntro') so a tune is the same tune in every style; each style's scale is the chiptune's.
// =====================================================================

const RTS_M2 = (...bars) => bars.join('');

// the modes these tunes are in (semitones from the root), for all three players
const RTS_M2_SCALES = {
  m2hijaz: [0, 1, 4, 5, 7, 8, 10],     // phrygian dominant: the flat second, the major third (the augmented second between)
  m2dblharm: [0, 1, 4, 5, 7, 8, 11],   // double harmonic: two augmented seconds
  m2harmmaj: [0, 2, 4, 5, 7, 8, 11],   // harmonic major: major with a flat sixth
  m2ukrdor: [0, 2, 3, 6, 7, 9, 10],    // dorian with a raised fourth
  m2hungmin: [0, 2, 3, 6, 7, 8, 11],   // hungarian minor: harmonic minor with a raised fourth
};
Object.assign(ROCK_SCALES, RTS_M2_SCALES);
Object.assign(SYNTH_SCALES, RTS_M2_SCALES);

// ------------------------------------------------------------------ chiptune
// drums: baladi (k.k...s.) and maqsum (k.s...s.) are the desert hand-drum rhythms, on the NES kit
Object.assign(GROOVES, {
  m2intro: { drums: 'k.k...s.k...s.k.', bass: 'r.r.r.r.r.r.o.r.' },
  m2menu: { drums: 'k.s.h.s.k.h.s.hh', bass: 'r.r.o.r.r.r.f.o.' },
  m2map: { drums: 'k.......h..k..h.', bass: 'r-----r-o-------' },
  m2brief: { drums: 'k...........h...', bass: 'r-------r---f---' },
  m2win: { drums: 'k.k.s...k.k.s.ss', bass: 'r.o.r.o.f.o.r.o.' },
  m2lose: { drums: 'k...............', bass: 'r-------f-------' },
  m2score: { drums: 'k.h.s.hkk.h.s.h.', bass: 'r.o.f.o.r.o.t.o.' },
  m2regent: { drums: 'k..sk.s.k..sk.ss', bass: 'r..rr.r.r..rf.o.' },
});

Object.assign(SONGS, {
  // a horn call over the dunes: up to the fifth, round the flat sixth, the augmented second (b2 - 3) answering
  rtsIntro: { name: 'THE SANDS OF KHARRA', root: 62, bpm: 92, groove: 'm2intro', prog: [0, 1, 0, 0, 3, 1, 6, 0], scale: RTS_M2_SCALES.m2hijaz,
    mel: RTS_M2('0---4---5-4-2---', '5-------3-1-3---', '4---7---9-8-7---', '4-----5-4---2---',
      '3---5---7-5-3---', '1-2-1-0-1---5---', '6---3---1---6-5-', '4---2---0-------') },
  // the menu: a march of the three Houses, the raised seventh pulling home
  rtsMenu: { name: 'BANNERS OF THE HOUSES', root: 64, bpm: 116, groove: 'm2menu', prog: [0, 5, 3, 4, 0, 5, 4, 0], scale: [0, 2, 3, 5, 7, 8, 11],
    mel: RTS_M2('0-0-2-3-4---3-2-', '2---0---5-------', '3-3-5-3-7-5-3---', 'z-------1---z---',
      '4-4-7-4-9-7-4-2-', '5---7---9---7---', '6---4---6-7-8-6-', '7-------........') },
  // the map: long notes falling through two augmented seconds, the silence between them
  rtsMap: { name: 'WHERE THE WYRMS SLEEP', root: 59, bpm: 84, groove: 'm2map', prog: [0, 1, 0, 1, 3, 1, 0, 0], scale: RTS_M2_SCALES.m2dblharm,
    mel: RTS_M2('7-----6-7---4---', '5-------1-------', '2---1---2---4---', '3-------........',
      '3---5---6---7---', '8-------7-6-5---', '4---5---4---2-1-', '0-------........') },
  // the briefing: low and patient, ending on the leading note (it never quite settles)
  rtsBrief: { name: 'THE ADVISOR SPEAKS', root: 57, bpm: 76, groove: 'm2brief', prog: [0, 0, 3, 3, 5, 5, 4, 4], scale: [0, 2, 3, 5, 7, 8, 11],
    mel: RTS_M2('0-------2---3---', '4-------3-2-----', '3-------5---3---', '0-------........',
      '5-------7---5---', '7-------5-------', '6---4---6---8---', '6-------........') },
  // victory: a fanfare in major, its fourth chord minor (the flat sixth), round and round
  rtsWin: { name: 'THE SANDS ARE OURS', root: 62, bpm: 132, groove: 'm2win', prog: [0, 0, 3, 4, 0, 3, 4, 0], scale: RTS_M2_SCALES.m2harmmaj,
    mel: RTS_M2('4-2-0-2-4---7---', '9---7---4-2-4---', '7-7-5-3-5---3---', '4---6---8---6---',
      '7-7-7-B-9---7-9-', 'A---9-8-7---5---', '6-7-8-6-4---6---', '7-------7-..7-..') },
  // defeat: a slow lament, falling, the leading note left hanging at the end
  rtsLose: { name: 'BURIED IN SAND', root: 66, bpm: 70, groove: 'm2lose', prog: [0, 0, 5, 5, 3, 3, 4, 4], scale: [0, 2, 3, 5, 7, 8, 11],
    mel: RTS_M2('7-------6-5-4---', '2-------0-------', '7---5---2---0---', '2-------........',
      '3---5---7---5---', '5---3---0-------', '1-------z-------', '4-------........') },
  // the tally: bouncing up and down the scale, the raised fourth winking
  rtsScore: { name: 'COUNTING THE GLIMMER', root: 69, bpm: 120, groove: 'm2score', prog: [0, 1, 0, 1, 2, 4, 1, 0], scale: RTS_M2_SCALES.m2ukrdor,
    mel: RTS_M2('0..2.4..2.3.4.0.', '1.3.5.3.8---5---', '0..2.4..2.3.7.6.', '5---4---3---1---',
      '2..4.6..4.7.6.4.', '4---6---8---6---', '8-7-5-3-1---3---', '4---2---0-------') },
  // the Regent: a march to the throne, the raised fourth and the raised seventh darkening the minor
  rtsRegent: { name: 'THE REGENT\'S THRONE', root: 60, bpm: 100, groove: 'm2regent', prog: [0, 5, 0, 4, 0, 5, 4, 0], scale: RTS_M2_SCALES.m2hungmin,
    mel: RTS_M2('0-------4-3-4---', '5---4-3-2-------', '7---7-7-6-5-4---', '6-------4-------',
      '2---3---4---7---', '7---5---2---0---', '1---4---6---8---', '7-------0-------') },
});

// ------------------------------------------------------------------ rock
Object.assign(ROCK_DRUMS, {
  m2baladi: 'K.K...S.K...S.h.',   // the hand drum's doum-doum-tek on the kit
  m2maqsum: 'K.S...S.K...S.hh',
  m2march: 'K..SK.S.K..SK.SS',
});
Object.assign(ROCK_SONGS, {
  rtsIntro: { name: 'KHARRA RISING', root: 38, bpm: 92, scale: 'm2hijaz', form: 'IVCVCSC', parts: {
    I: { ch: [0, 1, 0, 1], riff: 'X-------X---1-0-', dr: 'half',
      lead: RTS_M2('7-------9---8-7-', '8-------5---3---', '7-------B---9---', 'A-------8-------') },
    V: { lead: '@rtsIntro', riff: 'p.ppp.ppX---X---', dr: 'm2baladi' },
    C: { ch: [3, 1, 6, 0], riff: 'X-------X---X-x-', dr: 'double', harm: 2,
      lead: RTS_M2('A---C---A---7---', 'C-------A---8---', '6---8---A---8---', '9-------7-------') },
    S: { ch: [0, 1, 3, 0], riff: 'p.ppp.ppp.ppp.pp', dr: 'double', solo: true } } },
  rtsMenu: { name: 'WAR OF THE HOUSES', root: 40, bpm: 120, scale: 'harm', form: 'IVCVCSC', parts: {
    I: { ch: [0, 0, 5, 4], riff: 'P.ppP.ppP.p.X---', dr: 'gallop' },
    V: { lead: '@rtsMenu', riff: 'p.ppp.ppX-p.X-p.', dr: 'm2maqsum' },
    C: { ch: [5, 3, 4, 0], riff: 'X---X---X-X-X---', dr: 'double', harm: 2,
      lead: RTS_M2('7---7-8-9---8-7-', 'A---7---5---3---', '6---6-7-8---7-6-', '7---------------') },
    S: { ch: [0, 5, 3, 4], riff: 'p.ppp.ppp.ppp.pp', dr: 'double', solo: true } } },
  // the map: single notes picked over slow half-time, a heavy chorus
  rtsMap: { name: 'DEEP DESERT', root: 47, bpm: 84, scale: 'm2dblharm', form: 'IVCV', parts: {
    I: { ch: [0, 1, 0, 1], riff: 'X-.2..4.7-.4..2.', dr: 'half' },
    V: { lead: '@rtsMap', riff: 'X-.2..4.7-.4..2.', dr: 'half' },
    C: { ch: [3, 1, 0, 0], riff: 'X-------X-------', dr: 'rock', harm: 2,
      lead: RTS_M2('7-------5---3---', '8-------5---3---', '7---6---4---2---', '0---------------') } } },
  rtsBrief: { name: 'ORDERS FROM ABOVE', root: 45, bpm: 76, scale: 'harm', form: 'IVBV', parts: {
    I: { ch: [0, 0, 3, 4], riff: 'X---------------', dr: 'half' },
    V: { lead: '@rtsBrief', riff: '0...2...4...2...', dr: 'ride' },
    B: { ch: [5, 3, 4, 4], riff: 'X-------x.x.X---', dr: 'half', harm: 2,
      lead: RTS_M2('7-------5-------', '5-------3-------', '4---6---8---6---', '6---------------') } } },
  rtsWin: { name: 'CONQUERORS OF THE DUNES', root: 38, bpm: 132, scale: 'm2harmmaj', form: 'IVCSC', parts: {
    I: { ch: [0, 3, 4, 0], riff: 'X---X-x-X---X-x-', dr: 'rock', harm: 2,
      lead: RTS_M2('7---7-8-9---7---', '7---5---7---3---', '6---6-7-8---6---', '7---------------') },
    V: { lead: '@rtsWin', riff: 'X-x.x.X-x.x.X-x.', dr: 'drive' },
    C: { ch: [3, 4, 0, 0], riff: 'X-------X---X---', dr: 'double', harm: 2,
      lead: RTS_M2('A---C---A---7---', 'B---D---B---8---', '9---7---9---B---', '7---------------') },
    S: { ch: [0, 3, 4, 0], riff: 'X-x.x.X-x.x.X-x.', dr: 'rock', solo: true } } },
  rtsLose: { name: 'FALLEN HOUSE', root: 42, bpm: 70, scale: 'harm', form: 'IVBV', parts: {
    I: { ch: [0, 0, 5, 4], riff: 'X---------------', dr: 'half' },
    V: { lead: '@rtsLose', riff: 'X-------X-------', dr: 'half' },
    B: { ch: [3, 0, 4, 0], riff: 'p.p.p.p.X-------', dr: 'half', harm: 2,
      lead: RTS_M2('7-------5-------', '4---2---0---2---', '1---4---6---8---', '7---------------') } } },
  rtsScore: { name: 'SPOILS OF WAR', root: 45, bpm: 120, scale: 'm2ukrdor', form: 'IVCV', parts: {
    I: { ch: [0, 1, 0, 1], riff: '0.0.2.0.3.0.2.0.', dr: 'drive' },
    V: { lead: '@rtsScore', riff: '0.0.2.0.3.0.2.0.', dr: 'drive' },
    C: { ch: [2, 4, 1, 0], riff: 'X---x.x.X---x.x.', dr: 'rock', harm: 2,
      lead: RTS_M2('9---B---9---6---', '8---B---8---6---', '5---8---A---8---', '7---------------') } } },
  rtsRegent: { name: 'PRAETORIAN MARCH', root: 36, bpm: 100, scale: 'm2hungmin', form: 'IVCVCBSC', parts: {
    I: { ch: [0, 0, 5, 4], riff: 'X--x--X-x.x.X---', dr: 'm2march' },
    V: { lead: '@rtsRegent', riff: 'P..pP..pP.p.P.p.', dr: 'gallop' },
    C: { ch: [5, 4, 0, 0], riff: 'X-------X---X---', dr: 'double', harm: 2,
      lead: RTS_M2('9---7---5---7---', '6---8---B---8---', '9---7---B---9---', 'B-------7-------') },
    B: { ch: [0, 0, 0, 0], riff: 'X..X..X.p.p.X---', dr: 'half' },
    S: { ch: [0, 5, 4, 0], riff: 'pppppppppppppppp', dr: 'double', solo: true } } },
});

// ------------------------------------------------------------------ synthwave
Object.assign(SYNTH_DRUMS, {
  m2baladi: 'K.K.h.X.K.h.X.h.',
  m2maqsum: 'K.X.h.X.K.h.X.hh',
});
Object.assign(SYNTH_SONGS, {
  rtsIntro: { name: 'TWIN SUNS RISING', root: 38, bpm: 92, scale: 'm2hijaz', att: 0.6, form: 'IVCBVC', parts: {
    I: { ch: [0, 1, 0, 1], bs: 'r-------r-------', f: [400, 1600], rise: 1, bell: RTS_M2('7-------9-------', '8-------5-------') },
    V: { lead: '@rtsIntro', bs: 'r.r.r.r.r.r.o.r.', arp: '0.1.2.1.', dr: 'm2baladi', f: 1800 },
    C: { ch: [3, 1, 6, 0], bs: 'ro', arp: '0123', dr: 'beat', f: 2400,
      lead: RTS_M2('A---C---A---7---', 'C-------A---8---', '6---8---A---8---', '9-------7-------') },
    B: { ch: [0, 1, 0, 1], pad: 'S...S...S..S.S..', bs: 'R-------R---R-R-', dr: 'halfd', f: 900,
      bell: RTS_M2('4-------2-------', '5---3---1-------') } } },
  rtsMenu: { name: 'GLIMMER LIGHTS', root: 40, bpm: 116, scale: 'harm', form: 'IVCVCLC', parts: {
    I: { ch: [0, 0, 5, 4], pad: 'S.S...S.S.S...S.', bs: 'r.r.', dr: 'march', f: 1800 },
    V: { lead: '@rtsMenu', bs: 'r.o.', arp: '0123', dr: 'm2maqsum' },
    C: { ch: [5, 3, 4, 0], bs: 'ro', arp: '0123', dr: 'four', f: 2600,
      lead: RTS_M2('7---7-8-9---8-7-', 'A---7---5---3---', '6---6-7-8---7-6-', '7---------------') },
    L: { ch: [0, 5, 3, 4], bs: 'ro', arp: '0123', dr: 'four', solo: 1 } } },
  rtsMap: { name: 'SANDS OF MEMORY', root: 47, bpm: 84, scale: 'm2dblharm', sq: 1, pump: 0.3, f: 1200, form: 'IVCV', parts: {
    I: { ch: [0, 1, 0, 1], bs: 'r---------------', f: [300, 1000], bell: RTS_M2('7-------4-------', '5-------3-------', '2-------4-------', '3-------1-------') },
    V: { lead: '@rtsMap', arp: '0.2.1.3.', bs: 'r...r...r..rr...', dr: 'halfd' },
    C: { ch: [3, 1, 0, 0], bs: 'r.r.', arp: '0123', dr: 'half', f: 1500,
      lead: RTS_M2('7-------5---3---', '8-------5---3---', '7---6---4---2---', '0---------------') } } },
  rtsBrief: { name: 'COUNCIL CHAMBER', root: 45, bpm: 76, scale: 'harm', att: 0.8, pump: 0.3, f: 1000, form: 'IVBV', parts: {
    I: { ch: [0, 0, 3, 4], bs: 'r---------------', f: [300, 900], bell: RTS_M2('4-------2-------', '0-------........', '3-------5-------', '6-------4-------') },
    V: { lead: '@rtsBrief', arp: '0.2.1.2.', bs: 'r-------r-----r-', dr: 'hats' },
    B: { ch: [5, 3, 4, 4], bs: 'r---------------', f: 1100, rise: 1,
      bell: RTS_M2('7-------5-------', '5-------3-------', '4---6---8---6---', '6---------------') } } },
  rtsWin: { name: 'GOLDEN DAWN OF KHARRA', root: 38, bpm: 120, scale: 'm2harmmaj', form: 'IVCV', parts: {
    I: { ch: [0, 3, 4, 0], pad: 'S..S..S...S.S...', bs: 'r.r.', dr: 'march', f: 2000 },
    V: { lead: '@rtsWin', bs: 'r.o.', arp: '0123', dr: 'four', f: 2600 },
    C: { ch: [3, 4, 0, 0], bs: 'ro', arp: '0123', dr: 'four', f: 3000, harm: 2,
      lead: RTS_M2('A---C---A---7---', 'B---D---B---8---', '9---7---9---B---', '7---------------') } } },
  rtsLose: { name: 'ASHES ON THE WIND', root: 42, bpm: 70, scale: 'harm', att: 1, pump: 0.35, f: 900, form: 'IVBV', parts: {
    I: { ch: [0, 0, 5, 4], bs: 'r---------------', f: [300, 800], bell: RTS_M2('7-------4-------', '2-------0-------', '7-------5-------', '6-------4-------') },
    V: { lead: '@rtsLose', bs: 'r-------r-------', dr: 'half' },
    B: { ch: [3, 0, 4, 0], bs: 'r---------------', f: 900,
      bell: RTS_M2('7-------5-------', '4---2---0---2---', '1---4---6---8---', '7---------------') } } },
  rtsScore: { name: 'CREDITS ROLL IN', root: 45, bpm: 116, scale: 'm2ukrdor', sq: 1, form: 'IVCV', parts: {
    I: { ch: [0, 1, 0, 1], arp: '0123', bs: 'r.o.', dr: 'kicks', f: [600, 2000], rise: 1 },
    V: { lead: '@rtsScore', bs: 'r.o.', arp: '0213', dr: 'beat' },
    C: { ch: [2, 4, 1, 0], bs: 'ro', arp: '0123', dr: 'four', f: 2600,
      lead: RTS_M2('9---B---9---6---', '8---B---8---6---', '5---8---A---8---', '7---------------') } } },
  rtsRegent: { name: 'THE PURPLE THRONE', root: 36, bpm: 96, scale: 'm2hungmin', dirt: 1, pump: 0.25, f: 1400, form: 'IVCVCBC', parts: {
    I: { ch: [0, 0, 5, 4], pad: 'S..S..S.S.......', bs: 'R..R..R.R...R.R.', dr: 'halfd', f: 900 },
    V: { lead: '@rtsRegent', bs: 'rrorrror', dr: 'push', f: 1800 },
    C: { ch: [5, 4, 0, 0], bs: 'ro', arp: '0123', dr: 'four', f: 2400, harm: 2,
      lead: RTS_M2('9---7---5---7---', '6---8---B---8---', '9---7---B---9---', 'B-------7-------') },
    B: { ch: [0, 0, 0, 0], pad: 'S...S...S..S.S..', bs: 'R-------R---R-R-', dr: 'halfd', f: 800,
      bell: RTS_M2('7-------9-------', '6---4---2-------') } } },
});

// the mode's title screen plays the opening (unless the engine gave 'rts' a tune of its own)
if (!SONGS.rts) SONGS.rts = SONGS.rtsIntro;
if (!ROCK_ALIAS.rts && !ROCK_SONGS.rts) ROCK_ALIAS.rts = 'rtsIntro';
if (!SYNTH_ALIAS.rts && !SYNTH_SONGS.rts) SYNTH_ALIAS.rts = 'rtsIntro';

// ------------------------------------------------------------------ stingers
//  Each is a little score of events, played by whichever band the MUSIC STYLE picks (the NES pulses and noise,
//  the rock rig, the synths), all of it in D:
//    ['L', t, midi, dur, vol]   a lead note         ['C', t, [midi...], dur, mute]   a chord (rock: a power chord)
//    ['B', t, midi, dur]        a bass note         ['D', t, kind]  a drum: K kick, S snare, s ghost, h hat, c crash, T t toms
//    ['W', t, from, to, dur]    a sliding lead (siren, power-down)     ['R', t, dur]   a low rumble under the sand
//    ['E', t, midi, dur]        a bell / sparkle
const RTS_M2_STINGS = {
  // construction complete: up the D major arpeggio to the octave, a bell on top
  built: { len: 0.8, ev: [['L', 0, 62, 0.09], ['L', 0.09, 66, 0.09], ['L', 0.18, 69, 0.09], ['L', 0.27, 74, 0.5], ['C', 0.27, [62, 66, 69], 0.5],
    ['B', 0.27, 38, 0.5], ['E', 0.27, 86, 0.5], ['D', 0, 'h'], ['D', 0.09, 'h'], ['D', 0.18, 'h'], ['D', 0.27, 'K'], ['D', 0.27, 'S']] },
  // unit ready: a two-note horn call, a fourth up, a snare pickup
  unitReady: { len: 0.65, ev: [['L', 0, 69, 0.12], ['L', 0.15, 74, 0.45], ['L', 0.15, 69, 0.45, 0.5], ['C', 0.15, [62, 69], 0.45], ['B', 0.15, 50, 0.45],
    ['D', 0, 'S'], ['D', 0.075, 's'], ['D', 0.15, 'K']] },
  // under attack: a tritone alarm, hammered three times
  underAttack: { len: 0.95, ev: [['L', 0, 76, 0.12], ['L', 0.15, 70, 0.12], ['L', 0.3, 76, 0.12], ['L', 0.45, 70, 0.12], ['L', 0.6, 76, 0.3],
    ['C', 0, [40], 0.12, 1], ['C', 0.15, [40], 0.12, 1], ['C', 0.3, [40], 0.12, 1], ['C', 0.45, [40], 0.12, 1], ['C', 0.6, [40], 0.3],
    ['B', 0, 40, 0.12], ['B', 0.3, 40, 0.12], ['B', 0.6, 40, 0.3],
    ['D', 0, 'K'], ['D', 0.15, 'S'], ['D', 0.3, 'K'], ['D', 0.45, 'S'], ['D', 0.6, 'K'], ['D', 0.6, 'c']] },
  // harvester attacked: a nagging flat second down low over the toms, then it sinks
  harvesterAttacked: { len: 1.05, ev: [['L', 0, 65, 0.1], ['L', 0.12, 64, 0.1], ['L', 0.24, 65, 0.1], ['L', 0.36, 64, 0.32], ['W', 0.7, 64, 52, 0.32],
    ['B', 0, 40, 0.1], ['B', 0.12, 40, 0.1], ['B', 0.24, 41, 0.1], ['B', 0.36, 40, 0.6],
    ['D', 0, 'T'], ['D', 0.12, 't'], ['D', 0.24, 'T'], ['D', 0.36, 'K']] },
  // wormsign: a rumble under the sand, a deep slide down, a snake of a melody high above
  wormSign: { len: 1.62, ev: [['R', 0, 1.6], ['W', 0.05, 50, 36, 1.5], ['L', 0.15, 74, 0.35, 0.8], ['L', 0.5, 75, 0.35, 0.8], ['L', 0.85, 73, 0.75, 0.8],
    ['D', 0, 'K'], ['D', 0.85, 'T']] },
  // the base under attack: a siren, up and down twice, the band hitting under it
  baseUnderAttack: { len: 1.4, ev: [['W', 0, 64, 76, 0.45], ['W', 0.45, 76, 64, 0.2], ['W', 0.65, 64, 76, 0.45], ['W', 1.1, 76, 62, 0.28],
    ['C', 0, [38], 0.3], ['C', 0.65, [38], 0.3], ['B', 0, 38, 0.3], ['B', 0.65, 38, 0.3],
    ['D', 0, 'K'], ['D', 0, 'c'], ['D', 0.32, 'S'], ['D', 0.65, 'K'], ['D', 0.97, 'S']] },
  // low power: falling down the chord as the lights go out
  lowPower: { len: 1.1, ev: [['L', 0, 69, 0.22], ['L', 0.25, 66, 0.22], ['L', 0.5, 62, 0.22], ['W', 0.75, 61, 49, 0.32], ['B', 0, 38, 0.95], ['D', 0, 'K']] },
  // insufficient funds: "uh-uh", two low notes a semitone apart
  insufficient: { len: 0.55, ev: [['L', 0, 58, 0.18], ['L', 0.24, 57, 0.28], ['C', 0, [46], 0.18, 1], ['C', 0.24, [45], 0.28, 1], ['B', 0, 34, 0.18], ['B', 0.24, 33, 0.28],
    ['D', 0, 'k'], ['D', 0.24, 'k']] },
  // can't place it here: a sour buzz, twice (bzz-bzzt)
  cantPlace: { len: 0.45, ev: [['C', 0, [55, 56, 61], 0.14], ['L', 0, 61, 0.14, 0.6], ['B', 0, 31, 0.14], ['D', 0, 'h'], ['D', 0, 'k'],
    ['C', 0.2, [55, 56, 61], 0.22], ['L', 0.2, 61, 0.22, 0.6], ['B', 0.2, 31, 0.22], ['D', 0.2, 'h']] },
  // mission won: up the arpeggio, then I - iv - V - I (the minor fourth chord: the desert's), a crash
  missionWon: { len: 1.9, ev: [['L', 0, 62, 0.12], ['L', 0.13, 66, 0.12], ['L', 0.26, 69, 0.12], ['L', 0.39, 74, 0.33], ['C', 0.39, [62, 66, 69], 0.33], ['B', 0.39, 38, 0.33],
    ['L', 0.75, 74, 0.12], ['L', 0.88, 70, 0.15], ['C', 0.88, [67, 70, 74], 0.15], ['B', 0.88, 43, 0.15],
    ['L', 1.05, 73, 0.22], ['C', 1.05, [69, 73, 76], 0.22], ['B', 1.05, 45, 0.22],
    ['L', 1.3, 74, 0.6], ['L', 1.3, 78, 0.6, 0.5], ['C', 1.3, [62, 66, 69, 74], 0.6], ['B', 1.3, 38, 0.6], ['E', 1.3, 86, 0.6],
    ['D', 0, 'K'], ['D', 0.39, 'K'], ['D', 0.39, 'S'], ['D', 0.6, 's'], ['D', 0.66, 's'], ['D', 0.72, 'S'], ['D', 0.88, 'K'], ['D', 1.05, 'S'], ['D', 1.3, 'K'], ['D', 1.3, 'c']] },
  // mission lost: down the phrygian scale to the flat second, and home to the minor, slow
  missionLost: { len: 1.95, ev: [['L', 0, 74, 0.28], ['L', 0.3, 72, 0.28], ['L', 0.6, 70, 0.28], ['L', 0.9, 69, 0.28], ['L', 1.2, 63, 0.28], ['L', 1.5, 62, 0.45],
    ['C', 0, [62, 65, 69], 0.58], ['C', 0.6, [58, 62, 65], 0.58], ['C', 1.2, [63, 67, 70], 0.28], ['C', 1.5, [62, 65, 69], 0.45],
    ['B', 0, 38, 0.58], ['B', 0.6, 34, 0.58], ['B', 1.2, 39, 0.28], ['B', 1.5, 38, 0.45],
    ['D', 0, 'K'], ['D', 0.6, 'K'], ['D', 1.2, 'T'], ['D', 1.35, 't'], ['D', 1.5, 'K'], ['D', 1.5, 'c']] },
};
// the alarms don't repeat too often (the status bar's text still says each one)
const RTS_M2_STING_GAP = { underAttack: 4, harvesterAttacked: 4, baseUnderAttack: 4, wormSign: 3, lowPower: 4 };
const RTS_M2_STING_TOP = { missionWon: 1, missionLost: 1 };

// the rock rig and the synths for the stingers, wired straight to the sound effects (the music's are untouched)
const RtsM2Rock = Object.assign(Object.create(Rock), { ctx: null, out: null });
const RtsM2Synth = Object.assign(Object.create(Synth), { ctx: null, out: null, trim: null });
const rtsM2Sting = { last: {}, busyUntil: 0 };

// one stinger's events from t0 in a style
function rtsM2PlaySting(kind, t0, style) {
  const S = RTS_M2_STINGS[kind];
  if (!S) return false;
  const c = Sound.ctx;
  if (style === 'ROCK') {
    const R = RtsM2Rock;
    R.setup(Sound.master);
    for (const e of S.ev) {
      const t = t0 + e[1];
      if (e[0] === 'L') R.leadNote(e[2], t, e[3], e[4] !== undefined && e[4] < 1 ? 1 : 0, e[4] || 1);
      else if (e[0] === 'C') R.power(Math.min(...e[2]), t, e[3], !!e[4], e[4] ? 1.3 : 0.9);
      else if (e[0] === 'B') R.bassNote(e[2], t, e[3]);
      else if (e[0] === 'D') R.hit(e[2], t);
      else if (e[0] === 'E') R.leadNote(e[2] - 12, t, e[3], 1, 0.45);
      else if (e[0] === 'W') {
        const g = R.env(t, e[4], 0.45, R.lead[0], false);
        for (const [type, det] of [['sawtooth', -6], ['sq', 6]]) R.osc(type, e[2], t, t + e[4], g, det).frequency.exponentialRampToValueAtTime(Sound.midi(e[3]), t + e[4]);
      } else if (e[0] === 'R') rtsM2Rumble(c, R.noise, R.drums, t, e[2], 1.4);
    }
  } else if (style === 'SYNTHWAVE') {
    const Y = RtsM2Synth;
    Y.setup(Sound.master);
    Y.depth = 0.5; Y.lastLead = null;
    for (const e of S.ev) {
      const t = t0 + e[1];
      if (e[0] === 'L') Y.leadNote(e[2], t, e[3], 0.2 * (e[4] || 1), false, e[4] !== undefined && e[4] < 1 ? 1 : 0);
      else if (e[0] === 'C') { const n = e[2].length < 3 ? e[2].concat([e[2][0] + 7, e[2][0] + 12]) : e[2]; Y.stab(n, t, e[3]); if (e[3] > 0.4) Y.pad(n, t, e[3], 0.05); }
      else if (e[0] === 'B') Y.bassNote(e[2], t, e[3], 0.3, false);
      else if (e[0] === 'D') Y.hit({ S: 'X', s: 'h', k: 'K' }[e[2]] || e[2], t);
      else if (e[0] === 'E') Y.bell(e[2], t, e[3], 0.12);
      else if (e[0] === 'W') {
        const g = Y.env(Y.leadIn, t, t + e[4], 0.2, 0.01, 0.08);
        for (const det of [-8, 8]) Y.osc('sawtooth', e[2], t, t + e[4] + 0.08, g, det).frequency.exponentialRampToValueAtTime(Sound.midi(e[3]), t + e[4]);
      } else if (e[0] === 'R') rtsM2Rumble(c, Y.noise, Y.drums, t, e[2], 1.6);
    }
  } else {
    // the NES: two pulses, the triangle, the noise
    for (const e of S.ev) {
      const t = t0 + e[1];
      if (e[0] === 'L') rtsM2Note(e[2], t, e[3], { vol: 0.16 * (e[4] || 1), wave: e[4] !== undefined && e[4] < 1 ? 'p50' : 'p25', decayTo: 0.35 });
      else if (e[0] === 'C') for (const n of e[2]) rtsM2Note(n < 48 ? n + 12 : n, t, e[3], { vol: e[4] ? 0.06 : 0.05, wave: e[4] ? 'p12' : 'p50', decayTo: 0.3 });
      else if (e[0] === 'B') rtsM2Note(e[2] < 36 ? e[2] + 12 : e[2], t, e[3], { vol: 0.22, wave: 'tri', flat: true });
      else if (e[0] === 'E') rtsM2Note(e[2], t, e[3], { vol: 0.04, wave: 'p12', decayTo: 0.05 });
      else if (e[0] === 'W') rtsM2Note(e[2], t, e[4], { vol: 0.14, wave: 'p25', slideTo: Sound.midi(e[3]), flat: true });
      else if (e[0] === 'R') rtsM2Noise(420, t, [[0, 0], [0.25, 0.2], [e[2] - 0.4, 0.17], [e[2], 0]], 260);
      else if (e[0] === 'D') {
        const k = e[2];
        if (k === 'K' || k === 'k') { rtsM2Noise(1100, t, [[0, k === 'K' ? 0.13 : 0.09], [0.06, 0.08], [0.09, 0]]); rtsM2Note(45, t, 0.11, { vol: 0.18, wave: 'tri', slideTo: 42, flat: true }); }
        else if (k === 'S') rtsM2Noise(5200, t, [[0, 0.12], [0.13, 0]]);
        else if (k === 's') rtsM2Noise(5200, t, [[0, 0.07], [0.05, 0]]);
        else if (k === 'h') rtsM2Noise(16000, t, [[0, 0.06], [0.03, 0]]);
        else if (k === 'c') rtsM2Noise(12000, t, [[0, 0.11], [0.7, 0]]);
        else if (k === 'T' || k === 't') rtsM2Note(k === 'T' ? 50 : 45, t, 0.18, { vol: 0.2, wave: 'tri', slideTo: k === 'T' ? 70 : 55, flat: true });
      }
    }
  }
  return true;
}

// the NES voices for the stingers: Sound.note and Sound.noise's, but silent until they start (a voice whose gain
// is still at its default when it starts can click at full level for a sample)
function rtsM2Note(midi, t, dur, o) {
  const c = Sound.ctx, osc = c.createOscillator(), g = c.createGain(), end = t + dur, vol = o.vol;
  if (o.wave === 'tri') osc.type = 'triangle'; else osc.setPeriodicWave(Sound.waves[o.wave]);
  osc.frequency.setValueAtTime(Sound.midi(midi), t);
  if (o.slideTo) osc.frequency.exponentialRampToValueAtTime(o.slideTo, end);
  g.gain.value = 0;
  g.gain.setValueAtTime(0, Math.max(0, t - 0.01)); g.gain.linearRampToValueAtTime(vol, t + 0.002);
  if (o.flat) g.gain.setValueAtTime(vol, end - 0.008);
  else g.gain.exponentialRampToValueAtTime(Math.max(0.0005, vol * (o.decayTo === undefined ? 0.2 : o.decayTo)), end - 0.004);
  g.gain.linearRampToValueAtTime(0, end);
  osc.connect(g); g.connect(Sound.master); osc.start(t); osc.stop(end + 0.01);
}
function rtsM2Noise(rate, t, env, rateEnd) {
  const c = Sound.ctx, s = c.createBufferSource(), g = c.createGain(), dur = env[env.length - 1][0];
  s.buffer = Sound.noiseBuffer(rate); s.loop = true;
  if (rateEnd) { s.playbackRate.setValueAtTime(1, t); s.playbackRate.exponentialRampToValueAtTime(rateEnd / rate, t + dur); }
  g.gain.value = 0;
  g.gain.setValueAtTime(0, Math.max(0, t - 0.01)); g.gain.linearRampToValueAtTime(env[0][1], t + 0.002);
  for (let i = 1; i < env.length; i++) g.gain.linearRampToValueAtTime(env[i][1], t + Math.max(0.003, env[i][0]));
  s.connect(g); g.connect(Sound.master); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.01);
}

// low noise swelling and fading under the sand (rock and synth)
function rtsM2Rumble(c, noise, dest, t, dur, vol) {
  const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
  s.buffer = noise; s.loop = true; f.type = 'lowpass'; f.frequency.setValueAtTime(140, t); f.frequency.linearRampToValueAtTime(320, t + dur * 0.6); f.Q.value = 2;
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.25); g.gain.setValueAtTime(vol, t + dur - 0.4); g.gain.linearRampToValueAtTime(0, t + dur);
  s.connect(f); f.connect(g); g.connect(dest); s.start(t); s.stop(t + dur + 0.05);
}

// play an announcement's stinger now (or as soon as the one playing ends); true if it will be heard
function rtsSting(kind) {
  const S = RTS_M2_STINGS[kind];
  if (!S || !Sound.ctx || Sound.muted || !Sound.master || Sound.master.gain.value === 0) return false;
  const now = Sound.ctx.currentTime, st = rtsM2Sting, top = RTS_M2_STING_TOP[kind];
  if (st.last[kind] !== undefined && now - st.last[kind] < (RTS_M2_STING_GAP[kind] || S.len) && !top) return false;
  let t0 = now + 0.01;
  if (!top && st.busyUntil > t0) {
    if (st.busyUntil - t0 > 1.2) return false;   // too much queued: the text line will do
    t0 = st.busyUntil + 0.02;
  }
  const style = typeof Config !== 'undefined' ? Config.get('musicStyle') : 'CHIPTUNE';
  try { rtsM2PlaySting(kind, t0, style); } catch (e) { return false; }
  st.last[kind] = now;
  st.busyUntil = Math.max(top ? 0 : st.busyUntil, t0 + S.len);
  return true;
}
