'use strict';
// =====================================================================
//  The SYNTHWAVE soundtrack (Settings → MUSIC STYLE: ROCK, SYNTHWAVE or CHIPTUNE): 80s synthwave, outrun and
//  darksynth versions of every tune, written for this game — sunset pads for the calm modes, outrun drive for the
//  racing ones, darksynth for the tense modes and the bosses. Where it fits the lead plays the game's own chiptune
//  themes (Korobeiniki and Shchedryk too).
//  Sound: Web Audio, the wiring made once per audio context:
//    pad    a chord on three detuned saws a note (left, right, middle) with a slow attack, through a low-pass that
//           opens and closes with the parts, and a stereo chorus (two short delays wobbled by slow LFOs)
//    arp    the arpeggiator: a thin pulse plucked through a resonant low-pass, into the echo
//    bass   an analog bass: saw + square through a filter that snaps shut on every note (octave bounces, 16th
//           pulses); the darksynth songs drive it through a waveshaper
//    lead   two detuned saws (or squares), gliding between tied notes, vibrato on long ones, a ping-pong echo
//    bell   an FM bell: a sine modulated by a sine 3.5 times as fast, its brightness dying away
//    stab   brass stabs: the chord on saws through a filter snapping shut
//    drums  808/Linn kick, snare and clap through a gated reverb (a convolver whose impulse is a third of a second
//           of noise cut off dead), closed and open hats, gated toms for the fills, a crash, a noise riser
//  The pads, bass and arp duck on every kick (sidechain pumping). A hall reverb (one generated impulse) sits behind
//  the pads, lead and bells. Every voice is a one-shot, started and stopped at once (nothing long-lived feeds it, so
//  the browser frees it); a cap drops pads, arps and bells when too many oscillators would ring at once.
//  A song is parts of a few bars (I intro, V verse, C chorus, B breakdown, L lead break) played in its `form`.
//  Each part: ch (the chord degree of each bar; '4^' makes it major, '3s' a sus4), pad (one bar: P a held chord,
//  S a brass stab, - hold, . silence; none: the chord held all bar, tied over bars of the same chord), arp (0-6 the
//  chord's notes upwards from its root, . rest; ao: octaves up), bs (the bass: r root, o octave, f fifth, R O F
//  accented, - hold, . rest), dr (a drum pattern: K kick, S snare, C clap, X snare + clap, Z all three, h hat,
//  o open hat, T t toms), lead (the melody, as the chiptune songs write it: scale degrees from the key, 0-9 A B C,
//  z y below; - hold, . rest), harm (a second lead that many degrees above), bell (a melody on the FM bell),
//  solo (a lead break over the chords), f (the pad filter: a cutoff, or [from, to] across the part), rise (a riser
//  over the last bar). lead or bell '@key' borrows a chiptune song's melody (and its chords); from: just its chords.
//  Patterns shorter than the bar repeat. Song: root (midi), bpm, scale, sev (sevenths on the pads), dirt (driven
//  bass), pump (how deep the duck), sq (a square lead), lo (the lead an octave down: -12), att (pad attack).
// =====================================================================

const SYNTH_SCALES = { minor: [0, 2, 3, 5, 7, 8, 10], phryg: [0, 1, 3, 5, 7, 8, 10], harm: [0, 2, 3, 5, 7, 8, 11], dorian: [0, 2, 3, 5, 7, 9, 10],
  major: [0, 2, 4, 5, 7, 9, 11], mixo: [0, 2, 4, 5, 7, 9, 10], lydian: [0, 2, 4, 6, 7, 9, 11] };
const SYNTH_DRUMS = {
  four: 'K.hoZ.hoK.hoZ.ho',   // four on the floor, snare and clap on 2 and 4, open hats between: outrun
  beat: 'K.h.X.h.K.hKX.h.',   // the 80s backbeat
  drive: 'K.hhX.hhK.hhX.hh',
  push: 'K.hKX.hKK.hKX.hK',   // darksynth: kicks pushing the off-beats
  half: 'K.h.h.h.X.h.h.h.',   // half time: the snare on 3
  halfd: 'K..hK.h.X..hK.hh',  // a darker half time
  march: 'K.hhX.hhK.hhX.XX',
  kicks: 'K...K...K...K...',  // intros: the kick and its pump
  hats: '..h...h...h...h.',
  tick: 'h.h.h.h.h.h.h.h.',   // a clock ticking
  odd14: 'K.hoX.hK.hoX.h', waltz12: 'K.hoX.hoX.ho', glitch15: 'K.hX.hK.KX.hK.X',
};
const NL = (...bars) => bars.join('');
const SYNTH_SONGS = {
  // ------------------------------------------------------------ the tank game
  classic: { name: 'NEON EAGLE', root: 45, bpm: 112, scale: 'minor', sev: 1, form: 'IVCVCBLC', parts: {   // classic outrun
    I: { ch: [0, 5, 2, 6], arp: '0123', f: [500, 2200], dr: 'hats', rise: 1 },
    V: { lead: '@classic', bs: 'r.o.', arp: '0.1.2.1.', dr: 'beat', f: 1800 },
    C: { ch: [0, 5, 2, 6], bs: 'ro', arp: '0123', dr: 'four', f: 2600, lead: NL('7---7-9-B-9-7---', '5---5-7-9-7-5-4-', '4---4-6-9-8-6---', '6---8---6-5-4---') },
    B: { ch: [5, 6, 0, 0], bs: 'r---------------', f: 1000, rise: 1, bell: NL('9-------7-------', '8-------6-------', '7---4---7---9---', 'B-----------9---') },
    L: { ch: [0, 5, 2, 6], bs: 'ro', arp: '0123', dr: 'four', solo: 1, f: 2400 } } },
  custom: { name: 'GRID BUILDER', root: 50, bpm: 108, scale: 'dorian', sev: 1, form: 'IVCBVC', parts: {   // bouncy, bright
    I: { ch: [0, 3, 0, 3], arp: '0213', bs: 'r.r.', dr: 'kicks', f: [700, 2000] },
    V: { lead: '@custom', pad: 'S..S..S...S..S..', bs: 'r.o.', dr: 'beat' },
    C: { ch: [2, 3, 0, 6], bs: 'ro', arp: '0123', dr: 'four', f: 2600, lead: NL('7---7-6-4---2-4-', '5---5-4-3---4-5-', '7---9-7-4---2---', '6---4---3-2-1---') },
    B: { ch: [0, 3, 0, 3], bell: '@custom', bs: 'r---------------', dr: 'hats', f: 1200, rise: 1 } } },
  survival: { name: 'NIGHT SIEGE', root: 40, bpm: 120, scale: 'phryg', dirt: 1, pump: 0.25, f: 1500, form: 'IVCVCBC', parts: {   // darksynth
    I: { ch: [0, 0, 1, 0], bs: 'r', dr: 'kicks', f: [400, 1200], rise: 1 },
    V: { ch: [0, 0, 1, 0], bs: 'rrrrrrrorrrrrrro', dr: 'push', lead: NL('0-0-1-0-3---1-0-', '0-0-1-0-4---3-1-', '1-1-2-1-4---3-1-', '0---------------') },
    C: { ch: [5, 6, 0, 0], bs: 'rrorrror', arp: '0102', dr: 'four', f: 2000, lead: NL('7---8---7-5-4---', '6---5---4---3-1-', '0---1---3---4---', '7-------8---7---') },
    B: { ch: [0, 1, 0, 1], pad: 'S...S...S..S.S..', bs: 'r-------r---R---', dr: 'halfd', f: 900, bell: NL('7-------8-------', '7---5---4-------', '7-------8-------', 'A---8---7-------') } } },
  timeattack: { name: 'OVERDRIVE 88', root: 42, bpm: 132, scale: 'minor', form: 'IVCVCLC', parts: {   // flat-out outrun
    I: { ch: [0, 5, 2, 6], arp: '0123', ao: 1, bs: 'r.o.', dr: 'kicks', f: [600, 2400], rise: 1 },
    V: { lead: '@timeattack', ch: [0, 6, 2, 4], bs: 'ro', dr: 'drive' },
    C: { ch: [5, 6, 0, 0], bs: 'ro', arp: '0123', dr: 'four', f: 2800, lead: NL('7---9---B---9-7-', '8---9---B---C-B-', '9---7---4---7---', '7-----------z---') },
    L: { ch: [0, 5, 2, 6], bs: 'ro', arp: '0123', dr: 'four', solo: 1 } } },
  bigmaps: { name: 'HORIZON LINE', root: 41, bpm: 96, scale: 'major', sev: 1, att: 0.6, form: 'IVCBVC', parts: {   // a sunset, wide
    I: { ch: [0, 3, 5, 4], arp: '0.2.3.2.', bs: 'r-------r-------', f: [500, 1600], rise: 1 },
    V: { lead: '@bigmaps', arp: '0123', bs: 'r--r--r-r--r--r-', dr: 'half' },
    C: { ch: [3, 4, 2, 5], bs: 'r.o.', arp: '0123', dr: 'beat', f: 2200, lead: NL('9---A---9---7---', '8---7---6---4---', '6---7---9---B---', '9-------7---5---') },
    B: { ch: [3, 4, 3, 4], bs: 'r---------------', f: 1100, rise: 1, bell: NL('9---7---4-------', '8---7---4-------', '9---A---B---9---', '8---------------') } } },
  sides: { name: 'MIRROR CITY', root: 43, bpm: 116, scale: 'minor', steps: 14, form: 'IVCVC', parts: {   // 7/8, restless
    I: { ch: [0, 0, 5, 4], arp: '01230123012301', bs: 'r.r.r.r.r.r.r.', dr: 'kicks', f: [600, 2000], rise: 1 },
    V: { lead: '@sides', bs: 'r.o.r.o.r.o.r.', dr: 'odd14' },
    C: { ch: [5, 6, 0, 0], bs: 'ro', arp: '01230123012301', dr: 'odd14', f: 2500, lead: NL('9---7---5-4-5-', 'A---8---6-5-6-', '9---7---4---7-', '7-------z---0-') } } },
  corridor: { name: 'SKYLINE ASCENT', root: 38, bpm: 118, scale: 'minor', sev: 1, form: 'IVCVCLC', parts: {   // climbing outrun
    I: { ch: [0, 5, 6, 0], arp: '0123456543210123', bs: 'r.o.', dr: 'kicks', f: [600, 2400], rise: 1 },
    V: { lead: '@corridor', bs: 'ro', dr: 'drive' },
    C: { ch: [5, 6, 0, 0], bs: 'ro', arp: '0123', dr: 'four', f: 2800, lead: NL('7---9---C---B---', '9---8---6---A---', 'B---9---7---9---', 'B-----------C-B-') },
    L: { ch: [0, 5, 6, 4], bs: 'ro', arp: '0123', dr: 'four', solo: 1 } } },
  maze: { name: 'VHS LABYRINTH', root: 47, bpm: 90, scale: 'harm', lo: -12, pump: 0.3, f: 1200, form: 'IVCBVC', parts: {   // eerie, half time
    I: { ch: [0, 0, 5, 4], bs: 'r---------------', f: [400, 900], bell: NL('7-------8-------', '7-------6-------', '9-------7-------', '6-------8-------') },
    V: { lead: '@maze', arp: '0.2.1.3.', bs: 'r...r...r..rr...', dr: 'halfd' },
    C: { ch: [5, 3, 4, 0], bs: 'r.r.', arp: '0123', dr: 'half', f: 1500, lead: NL('9---7---5---4---', '7---5---3---2---', '6---8---6---4---', '7---------------') },
    B: { ch: [0, 5, 0, 4], bell: '@maze', bs: 'r---------------', f: 800, rise: 1 } } },
  world: { name: 'ENDLESS HIGHWAY', root: 46, bpm: 100, scale: 'mixo', sev: 1, att: 0.5, form: 'IVCVCBC', parts: {   // a road trip at dusk
    I: { ch: [0, 6, 3, 0], arp: '0.2.3.2.', bs: 'r---------------', f: [600, 1800], rise: 1 },
    V: { ch: [0, 6, 3, 0], arp: '0123', bs: 'r.o.', dr: 'beat', lead: NL('4---4-5-7---4---', '6---6-5-3---1---', '2---3---4---5---', '4-------2---0---') },
    C: { ch: [3, 4, 0, 6], bs: 'ro', arp: '0123', dr: 'four', f: 2400, lead: NL('A---9---7---5---', 'B---9---8---B---', '9---7---4---7---', '8-------6-------') },
    B: { ch: [3, 4, 0, 0], bs: 'r---------------', f: 1000, rise: 1, bell: NL('A---9---7-------', 'B---9---8-------', '9---7---4---7---', '9---------------') } } },
  fortress: { name: 'LASER WALLS', root: 38, bpm: 114, scale: 'minor', form: 'IVCVCLC', parts: {   // a heroic siege
    I: { ch: [0, 5, 3, '4^'], pad: 'S.S...S.S.S...S.', bs: 'r.r.', dr: 'march', f: 1800 },
    V: { lead: '@fortress', bs: 'r.o.', arp: '0123', dr: 'beat' },
    C: { ch: [5, 6, 0, 0], bs: 'ro', arp: '0123', dr: 'four', f: 2600, lead: NL('7---7-9-C---9-7-', '8---6---4---6---', '7---7-9-B---C-B-', '9-------7-------') },
    L: { ch: [0, 5, 3, '4^'], bs: 'ro', arp: '0123', dr: 'four', solo: 1 } } },
  race: { name: 'TURBO SUNSET', root: 40, bpm: 128, scale: 'mixo', sev: 1, form: 'IVCVCLC', parts: {   // bright outrun
    I: { ch: [0, 6, 3, 0], arp: '0123', ao: 1, bs: 'r.o.', dr: 'kicks', f: [700, 2600], rise: 1 },
    V: { lead: '@race', bs: 'ro', dr: 'drive' },
    C: { ch: [3, 6, 0, 0], bs: 'ro', arp: '0123', dr: 'four', f: 3000, lead: NL('A---9---7---9---', 'A---8---6---8---', '9---B---C---B---', '9-------7-------') },
    L: { ch: [0, 6, 3, 0], bs: 'ro', arp: '0123', dr: 'four', solo: 1 } } },
  eagles: { name: 'TWIN NEON', root: 38, bpm: 110, scale: 'minor', form: 'IVCVC', parts: {   // a stand-off
    I: { ch: [0, 0, 5, 4], bell: '@eagles', bs: 'r--r--r-', f: [600, 1500], rise: 1 },
    V: { lead: '@eagles', bs: 'r..r..r.r.o..o..', dr: 'beat' },
    C: { ch: [5, 6, 0, 0], bs: 'r.o.', arp: '0123', dr: 'four', f: 2400, lead: NL('9---7---C---9---', 'A---8---6---8---', 'B---9---7---4---', '7-----------z---') } } },
  dm: { name: 'CHROME AND BLOOD', root: 40, bpm: 126, scale: 'phryg', dirt: 1, pump: 0.25, f: 1400, form: 'IVCVCBC', parts: {   // darksynth
    I: { ch: [0, 0, 0, 1], pad: 'S.....S.....S...', bs: 'r', dr: 'kicks', f: [400, 1000], rise: 1 },
    V: { ch: [0, 0, 1, 0], bs: 'rrRrrrRrrrRrrrRr', arp: '0102', dr: 'push' },
    C: { lead: '@dm', bs: 'rrorrror', dr: 'four', f: 2000 },
    B: { ch: [0, 0, 0, 0], pad: 'S...S...S..S.S..', bs: 'R-------R---R-R-', dr: 'halfd', f: 900 } } },
  ctf: { name: 'CAPTURE THE NIGHT', root: 43, bpm: 116, scale: 'major', form: 'IVCVCLC', parts: {   // a heroic run
    I: { ch: [0, 3, 0, 4], pad: 'S..S..S...S.S...', bs: 'r.r.', dr: 'march', f: 2000 },
    V: { lead: '@ctf', bs: 'r.o.', arp: '0123', dr: 'beat' },
    C: { ch: [5, 3, 0, 4], bs: 'ro', arp: '0123', dr: 'four', f: 2800, lead: NL('9---9-A-B---9-7-', 'A---9---7---4---', '7---9---B---C---', 'B-------8-------') },
    L: { ch: [0, 3, 0, 4], bs: 'ro', arp: '0123', dr: 'four', solo: 1 } } },
  cpu: { name: 'MACHINE DREAMS', root: 45, bpm: 112, scale: 'minor', sq: 1, form: 'IVCVC', parts: {   // robots in love
    I: { ch: [0, 0, 5, 4], arp: '03', bs: 'ro', dr: 'kicks', f: [500, 1600], rise: 1 },
    V: { lead: '@cpu', bs: 'r.rr', dr: 'beat' },
    C: { ch: [5, 6, 0, 0], bs: 'ro', arp: '0123', dr: 'four', f: 2400, lead: NL('9---7---9---B---', 'A---8---6---8---', 'B---9---7---9---', '7-------4-------') } } },
  cs: { name: 'DUST AFTER DARK', root: 37, bpm: 104, scale: 'phryg', dirt: 1, pump: 0.3, f: 1200, form: 'IVCBVC', parts: {   // darksynth, the bomb ticking
    I: { ch: [0, 0, 1, 0], bs: 'r-------r-------', dr: 'tick', f: [350, 900], bell: NL('7-------8-------', '7-------5-------', '8-------A-------', '7---------------') },
    V: { ch: [0, 0, 1, 0], bs: 'r..r..r.r..r.rr.', dr: 'halfd', lead: NL('7---8---7---4---', '5---4---2---1---', '1---3---5---3---', '2-----1-0-------') },
    C: { ch: [5, 6, 0, 0], bs: 'rrorrror', arp: '0102', dr: 'push', f: 1800, lead: NL('9---7---5---4---', 'A---8---6---8---', '9---B---C---B---', '9-------7-------') },
    B: { ch: [0, 1, 0, 1], pad: 'S...........S...', bs: 'r---------------', dr: 'tick', f: 700, rise: 1 } } },
  victory: { name: 'SUNRISE VICTORY', root: 43, bpm: 120, scale: 'major', sev: 1, form: 'IC', parts: {
    I: { lead: '@victory', bs: 'r.o.', arp: '0123', dr: 'four', f: 2600 },
    C: { lead: '@victory', harm: 2, bs: 'ro', arp: '0123', dr: 'four', f: 3000 } } },
  ending: { name: 'NEW DAWN', root: 40, bpm: 92, scale: 'major', sev: 1, att: 0.7, form: 'IVCVC', parts: {   // the anthem at sunrise
    I: { ch: [0, 3, 4, 0], bell: '@ending', bs: 'r---------------', f: [500, 1800], rise: 1 },
    V: { lead: '@ending', arp: '0123', bs: 'r.o.', dr: 'half' },
    C: { ch: [5, 3, 0, 4], bs: 'ro', arp: '0123', dr: 'four', f: 2400, lead: NL('9---9-A-B---9-7-', 'A---9---7---4---', '7---9---B---C---', 'B-------8-------') } } },
  // ------------------------------------------------------------ the tank bosses
  bossWarn: { name: 'RED ALERT', root: 45, bpm: 116, scale: 'minor', dirt: 1, pump: 0.3, form: 'I', parts: {
    I: { lead: '@bossWarn', bs: 'r', arp: '0303', dr: 'push', f: 1600 } } },
  bossIron: { name: 'STEEL TERMINATOR', root: 40, bpm: 100, scale: 'minor', dirt: 1, pump: 0.25, f: 1400, form: 'IVCVCB', parts: {   // half-time darksynth
    I: { ch: [0, 0, 5, '4^'], pad: 'S..S..S.S.......', bs: 'R..R..R.R...R.R.', dr: 'halfd', f: 900 },
    V: { lead: '@bossIron', bs: 'r', dr: 'half' },
    C: { ch: [5, 3, 0, '4^'], bs: 'rrorrror', arp: '0102', dr: 'push', f: 2000, lead: NL('7---9---B---9---', 'A---9---7---5---', '7---6---7---9---', '8-------B---8---') },
    B: { ch: [0, 0, 0, 0], pad: 'S...S...S..S.S..', bs: 'R-------R---R-R-', dr: 'kicks', f: 800, rise: 1, bell: NL('7-------8-------', '7---5---4-------') } } },
  bossDeep: { name: 'ABYSSAL GRID', root: 38, bpm: 84, scale: 'minor', sev: 1, att: 0.8, pump: 0.35, f: 1100, form: 'IVCV', parts: {   // slow, deep, menacing
    I: { ch: [0, 1, 0, 4], bs: 'r---------------', f: [300, 900], rise: 1, bell: NL('7-------8-------', '7-------4-------') },
    V: { lead: '@bossDeep', arp: '0.1.2.1.', bs: 'r...r..r....r...', dr: 'halfd' },
    C: { ch: [5, 3, 0, 0], bs: 'r.o.', arp: '0123', dr: 'half', f: 1600, lead: NL('9-------7-------', 'A---9---7---5---', '4---5---7---9---', '7---------------') } } },
  bossWar: { name: 'ARMORED PROTOCOL', root: 43, bpm: 108, scale: 'minor', dirt: 1, pump: 0.3, form: 'IVCVC', parts: {   // a half-time war march
    I: { ch: [0, 0, 5, 6], pad: 'S...S.S.S...S.S.', bs: 'r...r.r.r...r.r.', dr: 'march', f: 1200 },
    V: { lead: '@bossWar', bs: 'r.o.', arp: '0123', dr: 'march' },
    C: { ch: [5, 6, 0, 0], bs: 'rrorrror', arp: '0123', dr: 'push', f: 2200, lead: NL('9---7---5---7---', 'A---8---6---8---', 'B---9---7---9---', 'B-------7-------') } } },
  bossUfo: { name: 'SIGNAL FROM BEYOND', root: 40, bpm: 100, scale: 'lydian', sev: 1, sq: 1, form: 'IVCV', parts: {   // eerie, spacey
    I: { ch: [0, 1, 0, 1], bell: '@bossUfo', bs: 'r---------------', f: [500, 1400], rise: 1 },
    V: { lead: '@bossUfo', bs: 'r.o.', arp: '0123', dr: 'beat' },
    C: { ch: [0, 1, 5, 4], bs: 'ro', arp: '0123', dr: 'four', f: 2400, lead: NL('7---9---B---9---', '8---A---C---A---', 'C---9---7---9---', 'B-------8-------') } } },
  galya: { name: 'CAROL OF THE NEON BELLS', root: 43, bpm: 120, scale: 'minor', steps: 12, sev: 1, form: 'IVL', parts: {
    I: { bell: '@galya', bs: 'r-----------', f: [500, 1800], rise: 1 },
    V: { lead: '@galya', bs: 'r.....o.o...', arp: '012321', dr: 'waltz12' },
    L: { from: 'galya', bs: 'r.o.r.o.r.o.', arp: '012321', dr: 'waltz12', solo: 1 } } },
  // ------------------------------------------------------------ GALAXY
  galaxy: { name: 'STARFIGHTER 1986', root: 40, bpm: 128, scale: 'minor', sq: 1, form: 'IVVLV', parts: {
    I: { from: 'galaxy', arp: '0123', ao: 1, bs: 'r.o.', dr: 'kicks', f: [600, 2400], rise: 1 },
    V: { lead: '@galaxy', bs: 'ro', arp: '0123', dr: 'four', f: 2600 },
    L: { from: 'galaxy', bs: 'ro', arp: '0123', dr: 'four', solo: 1 } } },
  galaxyBoss: { name: 'OVERLORD PROTOCOL', root: 45, bpm: 110, scale: 'minor', dirt: 1, pump: 0.25, f: 1400, form: 'IVBV', parts: {
    I: { from: 'galaxyBoss', pad: 'S..S..S.S.......', bs: 'r', dr: 'halfd', f: 1000 },
    V: { lead: '@galaxyBoss', bs: 'rrorrror', dr: 'push' },
    B: { from: 'galaxyBoss', bell: '@galaxyBoss', bs: 'R-------R---R-R-', dr: 'half', f: 900, rise: 1 } } },
  galaxy2: { name: 'HYPERSPACE HIGHWAY', root: 38, bpm: 136, scale: 'minor', sev: 1, form: 'IVVLV', parts: {
    I: { from: 'galaxy2', arp: '0123', ao: 1, bs: 'r.o.', dr: 'kicks', f: [600, 2600], rise: 1 },
    V: { lead: '@galaxy2', bs: 'ro', arp: '0123', dr: 'four', f: 2800 },
    L: { from: 'galaxy2', bs: 'ro', arp: '0123', dr: 'four', solo: 1 } } },
  galaxyBoss2: { name: 'ALL YOUR BASE ARE NEON', root: 43, bpm: 116, scale: 'phryg', dirt: 1, pump: 0.25, f: 1400, form: 'IVBV', parts: {
    I: { from: 'galaxyBoss2', pad: 'S.....S.....S...', bs: 'r', dr: 'kicks', f: [400, 1100], rise: 1 },
    V: { lead: '@galaxyBoss2', bs: 'rrorrror', dr: 'push' },
    B: { from: 'galaxyBoss2', bs: 'R-------R---R-R-', arp: '0102', dr: 'halfd', f: 900 } } },
  galaxyWell: { name: 'KOROBEINIKI 1984', root: 45, bpm: 120, scale: 'minor', form: 'IVLV', parts: {   // the music box, then the synthpop
    I: { bell: '@galaxyWell', ch: [0, '4^', '4^', 0, 3, 2, '4^', 0], bs: 'r-------', f: [600, 1800], rise: 1 },
    V: { lead: '@galaxyWell', ch: [0, '4^', '4^', 0, 3, 2, '4^', 0], bs: 'r.o.', arp: '0123', dr: 'four' },
    L: { ch: [0, '4^', '4^', 0, 3, 2, '4^', 0], bs: 'ro', arp: '0123', dr: 'four', solo: 1 } } },
  galaxyBossWell: { name: 'LEVEL 9 OVERDRIVE', root: 40, bpm: 140, scale: 'harm', dirt: 1, pump: 0.3, form: 'VLV', parts: {
    V: { lead: '@galaxyBossWell', bs: 'rrorrror', arp: '0123', dr: 'push', f: 2200 },
    L: { from: 'galaxyBossWell', bs: 'ro', arp: '0123', dr: 'four', solo: 1 } } },
  galaxySlop: { name: 'CORPORATE SUNSET 4', root: 41, bpm: 92, scale: 'major', sev: 1, sq: 1, att: 0.6, form: 'IVV', parts: {   // slowed down, vapor
    I: { bell: '@galaxySlop', bs: 'r-------', f: [600, 1600] },
    V: { lead: '@galaxySlop', bs: 'r.o.', arp: '0.2.3.2.', dr: 'beat', f: 2000 } } },
  galaxyBossSlop: { name: 'CORRUPTED.VHS', root: 40, bpm: 124, scale: 'lydian', steps: 15, sev: 1, dirt: 1, form: 'IV', parts: {
    I: { bell: '@galaxyBossSlop', pad: 'S..S..S..S..S..', bs: 'r.o', dr: 'glitch15', f: 1400 },
    V: { lead: '@galaxyBossSlop', bs: 'ro', arp: '012', dr: 'glitch15', f: 2200 } } },
};
// modes that share a tune (others fall back to the rock ones' aliases)
const SYNTH_ALIAS = { coop: 'cpu', galaxyRush: 'galaxy' };
// a lead break: scale steps from the chord, 8ths and long notes (null: hold); the last bar climbs and holds
const SYNTH_LICKS = [
  [7, null, 9, null, 11, null, null, null, 9, null, 7, null, 4, null, null, null], [4, null, 7, null, 9, null, 11, null, 14, null, null, null, 11, null, 9, null],
  [9, null, null, 7, null, null, 4, null, 7, null, 9, null, 7, null, null, null], [11, null, 9, null, 7, 9, 11, null, null, null, 9, null, 7, null, null, null],
];
const SYNTH_LAST_LICK = [7, null, null, null, 9, null, null, null, 11, null, null, null, null, null, null, null];
const SYNTH_LEVEL = 1.0;   // as loud as the rock and the chiptunes
const SYNTH_VOICES = 72;   // oscillators ringing at once

const Synth = {
  ctx: null,
  // the instruments' wiring, made once per audio context (an offline render makes its own)
  setup(out) {
    const c = Sound.ctx;
    if (this.ctx === c && this.out === out) return;
    if (this.ctx === c && this.trim) this.trim.disconnect();
    this.ctx = c; this.out = out; this.live = []; this.tr = null; this.hushed = false;
    const gain = v => { const g = c.createGain(); g.gain.value = v; return g; };
    const filt = (type, f, q = 0.7) => { const b = c.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; return b; };
    const pan = p => { if (!c.createStereoPanner) return gain(1); const s = c.createStereoPanner(); s.pan.value = p; return s; };
    const chain = (...nodes) => { for (let i = 0; i < nodes.length - 1; i++) nodes[i].connect(nodes[i + 1]); return nodes[0]; };
    // everything into one bus, a gentle compressor to glue it (and keep the kicks from peaking), then the level
    this.trim = gain(SYNTH_LEVEL); this.trim.connect(out);
    const comp = c.createDynamicsCompressor();
    comp.threshold.value = -14; comp.knee.value = 10; comp.ratio.value = 2.5; comp.attack.value = 0.005; comp.release.value = 0.2;
    const bus = chain(gain(0.35), comp, this.trim);
    this.duck = chain(gain(1), bus);   // the sidechain: pads, bass and arp pump on the kick
    // the reverbs: a hall (2.4 s of decaying noise) and the gated one (a third of a second, flat, then cut off dead)
    const impulse = (len, gated) => {
      const n = Math.floor(c.sampleRate * len), b = c.createBuffer(2, n, c.sampleRate), cut = c.sampleRate * 0.008;
      for (let ch = 0; ch < 2; ch++) {
        const d = b.getChannelData(ch);
        for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (gated ? (1 - 0.35 * i / n) * Math.min(1, (n - i) / cut) : Math.exp(-6 * i / n));
      }
      return b;
    };
    const hall = c.createConvolver(); hall.buffer = impulse(2.4, false); chain(hall, gain(0.45), bus);
    const gate = c.createConvolver(); gate.buffer = impulse(0.32, true); chain(gate, gain(0.9), bus);
    this.hallIn = chain(gain(1), hall); this.gateIn = chain(gain(1), gate);
    // the ping-pong echo (a dotted 8th, set per song)
    this.echoIn = gain(1);
    this.dl = c.createDelay(1.5); this.dr = c.createDelay(1.5);
    const fb = gain(0.4), wet = chain(filt('lowpass', 3200), gain(0.55), bus);
    this.echoIn.connect(this.dl); chain(this.dl, pan(-0.8), wet); this.dl.connect(this.dr); chain(this.dr, pan(0.8), wet); chain(this.dr, fb, this.dl);
    // the pads: the left and right saws through the filter, then a chorus (two short delays wobbled by slow LFOs)
    this.padF = filt('lowpass', 1800, 0.9);
    this.padL = chain(gain(1), pan(-0.7), this.padF); this.padR = chain(gain(1), pan(0.7), this.padF);
    const padOut = gain(1); this.padF.connect(padOut); padOut.connect(this.duck); chain(padOut, gain(0.35), this.hallIn);
    for (const [d, rate, p] of [[0.012, 0.43, -1], [0.019, 0.61, 1]]) {
      const dly = c.createDelay(0.05), lfo = c.createOscillator(), depth = gain(0.003);
      dly.delayTime.value = d; lfo.frequency.value = rate; lfo.connect(depth); depth.connect(dly.delayTime); lfo.start();
      chain(this.padF, dly, pan(p), gain(0.7), padOut);
    }
    // the arp, the bass (clean, or driven for darksynth), the stabs: all pumping
    this.arpIn = chain(gain(1), filt('lowpass', 3600, 4), this.duck);
    chain(this.arpIn, gain(0.3), this.echoIn);
    this.bassClean = chain(gain(1), this.duck);
    const sh = c.createWaveShaper(), n = 512, curve = new Float32Array(n);
    for (let i = 0; i < n; i++) { const x = i / (n / 2) - 1; curve[i] = Math.tanh(3 * x) / Math.tanh(3); }
    sh.curve = curve;
    this.bassDirt = chain(gain(1.3), sh, filt('lowpass', 2600), gain(0.32), this.duck);
    this.stabIn = chain(gain(1), this.duck); chain(this.stabIn, gain(0.3), this.hallIn);
    // the lead and the bells: dry, the echo and the hall
    this.leadIn = chain(gain(1), filt('highpass', 160), filt('lowpass', 6500), bus);
    this.leadIn.connect(this.echoIn); chain(this.leadIn, gain(0.25), this.hallIn);
    this.bellIn = chain(gain(1), pan(0.2), bus);
    chain(this.bellIn, gain(0.5), this.echoIn); chain(this.bellIn, gain(0.6), this.hallIn);
    // drums (hats a little to the right)
    this.drums = chain(gain(1), bus);
    this.hats = chain(pan(0.3), this.drums);
    // one second of white noise for the kit and the risers; the pulse waves
    const len = c.sampleRate, buf = c.createBuffer(1, len, c.sampleRate), dd = buf.getChannelData(0);
    for (let i = 0; i < len; i++) dd[i] = Math.random() * 2 - 1;
    this.noise = buf;
    this.sq = Sound.pulseWave(0.5); this.p25 = Sound.pulseWave(0.25);
    this.padInL = null; this.cutPads();
  },
  // new inputs for the pads; the old ones fade out with whatever chords still ring through them (a new track, a pause)
  cutPads() {
    const c = this.ctx, now = c.currentTime;
    for (const g of [this.padInL, this.padInR]) if (g) { g.gain.cancelScheduledValues(now); g.gain.setTargetAtTime(0, now, 0.04); }
    this.padInL = c.createGain(); this.padInL.connect(this.padL);
    this.padInR = c.createGain(); this.padInR.connect(this.padR);
  },

  // a new track: the echo follows its tempo
  begin(tr) {
    if (this.tr) this.cutPads();
    this.tr = tr; this.lastLead = null; this.fresh = true;
    const t = this.ctx.currentTime, d = Math.min(1.4, tr.stepDur * 3);
    this.dl.delayTime.setValueAtTime(d, t); this.dr.delayTime.setValueAtTime(d, t);
    this.depth = tr.song.pump || 0.4;
  },
  // paused, muted, another style or nothing playing: the synths go quiet at once (their long pads and echoes too)
  quiet(q) {
    if (!this.ctx || this.hushed === q) return;
    this.hushed = q;
    if (q) this.cutPads(); else this.fresh = true;   // back: the chord that should be ringing comes in again
    const p = this.trim.gain, now = this.ctx.currentTime;
    p.cancelScheduledValues(now); p.setTargetAtTime(q ? 0 : SYNTH_LEVEL, now, q ? 0.04 : 0.015);
  },

  // the voice cap: is there room for n more oscillators from t to end? (must: play anyway, but count them)
  room(t, end, n, must) {
    const L = this.live;
    let used = 0, k = 0;
    for (let i = 0; i < L.length; i += 2) if (L[i] > t) { L[k++] = L[i]; L[k++] = L[i + 1]; used += L[i + 1]; }
    L.length = k;
    if (!must && used + n > SYNTH_VOICES) return false;
    L.push(end, n);
    return true;
  },
  osc(type, midi, t, end, dest, det = 0, from) {
    const o = this.ctx.createOscillator();
    if (type === 'sq') o.setPeriodicWave(this.sq); else if (type === 'p25') o.setPeriodicWave(this.p25); else o.type = type;
    o.frequency.setValueAtTime(Sound.midi(from === undefined ? midi : from), t);
    if (from !== undefined) o.frequency.exponentialRampToValueAtTime(Sound.midi(midi), t + 0.06);   // portamento
    if (det) o.detune.value = det;
    o.connect(dest); o.start(t); o.stop(end + 0.02);
    return o;
  },
  // attack a, decay toward sus (a fraction) with time constant d, release r after end
  env(dest, t, end, vol, a, r, sus = 1, d = 0.3) {
    const g = this.ctx.createGain(), p = g.gain;
    end = Math.max(end, t + a + 0.01);
    p.setValueAtTime(0, t); p.linearRampToValueAtTime(vol, t + a);
    if (sus < 1) p.setTargetAtTime(vol * sus, t + a, d);
    p.setTargetAtTime(0, end, r / 5);
    g.connect(dest);
    return g;
  },

  // a held chord: three saws a note, spread left and right
  pad(notes, t, dur, att) {
    const end = t + dur, rel = 0.45;
    if (!this.room(t, end + rel, notes.length * 3)) return;
    const a = Math.min(att, dur * 0.5), gl = this.env(this.padInL, t, end, 0.05, a, rel, 0.85, 0.6), gr = this.env(this.padInR, t, end, 0.05, a, rel, 0.85, 0.6);
    for (const m of notes) {
      this.osc('sawtooth', m, t, end + rel, gl, -12); this.osc('sawtooth', m, t, end + rel, gr, 12);
      this.osc('sawtooth', m, t, end + rel, gl, 4).connect(gr);
    }
  },
  // a brass stab: the chord on saws through a filter snapping shut
  stab(notes, t, dur) {
    const c = this.ctx, end = t + dur;
    if (!this.room(t, end + 0.1, notes.length * 2)) return;
    const f = c.createBiquadFilter(), g = this.env(this.stabIn, t, end, 0.14, 0.006, 0.1, 0.5, 0.12);
    f.type = 'lowpass'; f.Q.value = 2; f.frequency.setValueAtTime(4500, t); f.frequency.setTargetAtTime(600, t + 0.01, 0.09);
    f.connect(g);
    for (const m of notes) { this.osc('sawtooth', m, t, end + 0.1, f, -9); this.osc('sawtooth', m, t, end + 0.1, f, 9); }
  },
  arpNote(m, t, dur, vol) {
    const end = t + dur;
    if (!this.room(t, end + 0.06, 1)) return;
    this.osc('p25', m, t, end + 0.06, this.env(this.arpIn, t, end, vol, 0.003, 0.06, 0.5, dur * 0.5));
  },
  // the bass: saw + square, the filter plucking shut; dirt: through the waveshaper
  bassNote(m, t, dur, vol, dirt) {
    const c = this.ctx, end = t + dur, f = c.createBiquadFilter();
    this.room(t, end + 0.05, 2, true);
    f.type = 'lowpass'; f.Q.value = 3;
    f.frequency.setValueAtTime(dirt ? 2600 : 2000, t); f.frequency.setTargetAtTime(dirt ? 420 : 300, t + 0.004, 0.06);
    f.connect(this.env(dirt ? this.bassDirt : this.bassClean, t, end, vol, 0.004, 0.04, 0.75, 0.15));
    this.osc('sawtooth', m, t, end + 0.05, f, -5); this.osc('sq', m, t, end + 0.05, f, 5);
  },
  // the lead: slides from a long note into the next one close by, vibrato as it rings; k: the harmony (no slide)
  leadNote(m, t, dur, vol, sq, k) {
    const c = this.ctx, end = t + dur, rel = 0.15;
    this.room(t, end + rel, 2, true);
    const g = this.env(this.leadIn, t, end, vol, 0.012, rel, 0.75, 0.4), prev = k ? null : this.lastLead;
    const from = prev && Math.abs(prev.end - t) < 0.03 && prev.dur > 0.25 && prev.m !== m && Math.abs(prev.m - m) <= 5 ? prev.m : undefined;
    if (!k) this.lastLead = { m, end, dur };
    const os = (sq ? [['sq', -6], ['p25', 6]] : [['sawtooth', -8], ['sawtooth', 8]]).map(([w, d]) => this.osc(w, m, t, end + rel, g, d, from));
    if (dur > 0.3) {
      const lfo = c.createOscillator(), lg = c.createGain();
      lfo.frequency.value = 5.5; lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(0, t + 0.18); lg.gain.linearRampToValueAtTime(20, t + 0.45);
      lfo.connect(lg); for (const o of os) lg.connect(o.detune);
      lfo.start(t); lfo.stop(end + rel + 0.02);
    }
  },
  // an FM bell: a sine modulated by a sine 3.5 times as fast, the brightness dying away
  bell(m, t, dur, vol) {
    const c = this.ctx, f = Sound.midi(m), end = t + Math.max(0.5, dur) + 0.6;
    if (!this.room(t, end, 2)) return;
    const car = c.createOscillator(), mod = c.createOscillator(), mg = c.createGain(), g = c.createGain();
    car.frequency.value = f; mod.frequency.value = f * 3.5;
    mg.gain.setValueAtTime(f * 2.4, t); mg.gain.exponentialRampToValueAtTime(f * 0.08, t + 0.9);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.004); g.gain.exponentialRampToValueAtTime(0.001, end);
    mod.connect(mg); mg.connect(car.frequency); car.connect(g); g.connect(this.bellIn);
    car.start(t); mod.start(t); car.stop(end + 0.02); mod.stop(end + 0.02);
  },
  // the kick ducks the pads, bass and arp
  pump(t) {
    const p = this.duck.gain;
    p.setTargetAtTime(this.depth, t, 0.005); p.setTargetAtTime(1, t + 0.035, 0.09);
  },
  // a noise sweep rising over a bar into the next part
  riser(t, dur) {
    const c = this.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    if (!this.room(t, t + dur, 1)) return;
    s.buffer = this.noise; s.loop = true; f.type = 'bandpass'; f.Q.value = 1.5;
    f.frequency.setValueAtTime(300, t); f.frequency.exponentialRampToValueAtTime(7000, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.1, t + dur); g.gain.linearRampToValueAtTime(0, t + dur + 0.03);
    s.connect(f); f.connect(g); g.connect(this.trim); g.connect(this.hallIn);
    s.start(t); s.stop(t + dur + 0.05);
  },
  hit(kind, t) {
    const c = this.ctx;
    this.room(t, t + 0.3, 2, true);
    const nz = (dest, len, vol, hp, lp, gated) => {
      const s = c.createBufferSource(), g = c.createGain(), f1 = c.createBiquadFilter(), f2 = c.createBiquadFilter();
      s.buffer = this.noise; f1.type = 'highpass'; f1.frequency.value = hp; f2.type = 'lowpass'; f2.frequency.value = lp;
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + len);
      s.connect(f1); f1.connect(f2); f2.connect(g); g.connect(dest); if (gated) g.connect(this.gateIn);
      s.start(t, Math.random() * 0.5); s.stop(t + len + 0.02);
      return g;
    };
    const tone = (f0, f1, sweep, len, vol, type, gated) => {
      const o = c.createOscillator(), g = c.createGain(); o.type = type;
      o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + sweep);
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + len);
      o.connect(g); g.connect(this.drums); if (gated) g.connect(this.gateIn);
      o.start(t); o.stop(t + len + 0.02);
    };
    const clap = () => {
      const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(), p = g.gain;
      s.buffer = this.noise; f.type = 'bandpass'; f.frequency.value = 1300; f.Q.value = 1.1;
      p.setValueAtTime(0, t);
      for (let k = 0; k < 3; k++) { p.setValueAtTime(0.8, t + k * 0.011); p.exponentialRampToValueAtTime(0.08, t + k * 0.011 + 0.009); }
      p.setValueAtTime(0.7, t + 0.033); p.exponentialRampToValueAtTime(0.001, t + 0.22);
      s.connect(f); f.connect(g); g.connect(this.drums); g.connect(this.gateIn);
      s.start(t, Math.random() * 0.5); s.stop(t + 0.25);
    };
    const snare = () => { nz(this.drums, 0.2, 0.75, 1800, 11000, true); tone(200, 165, 0.05, 0.11, 0.45, 'triangle', true); };
    const kick = () => { tone(165, 48, 0.08, 0.4, 0.8, 'sine'); nz(this.drums, 0.012, 0.25, 2500, 9000); this.pump(t); };
    if (kind === 'K') kick();
    else if (kind === 'S') snare();
    else if (kind === 'C') clap();
    else if (kind === 'X') { snare(); clap(); }
    else if (kind === 'Z') { kick(); snare(); clap(); }
    else if (kind === 'h') nz(this.hats, 0.035, 0.38, 8000, 16000);
    else if (kind === 'o') nz(this.hats, 0.22, 0.22, 7000, 15000);
    else if (kind === 'T') tone(220, 130, 0.25, 0.32, 0.65, 'sine', true);
    else if (kind === 't') tone(155, 90, 0.28, 0.36, 0.7, 'sine', true);
    else if (kind === 'c') nz(this.drums, 1.6, 0.2, 4500, 13000);
  },
};

// ------------------------------------------------------------------ a song, laid out bar by bar
function synthBuild(key, skill) {
  const S = SYNTH_SONGS[key], n = S.steps || 16, sc = SYNTH_SCALES[S.scale] || SYNTH_SCALES.minor, bars = [];
  const pitch = d => sc[((d % 7) + 7) % 7] + 12 * Math.floor(d / 7);
  const partOf = id => {
    const P = S.parts[id], at = v => typeof v === 'string' && v[0] === '@';
    const src = at(P.lead) ? SONGS[P.lead.slice(1)] : at(P.bell) ? SONGS[P.bell.slice(1)] : P.from ? SONGS[P.from] : null;
    const mel = v => (at(v) ? (SONGS[v.slice(1)] || {}).mel || null : v || null);
    return Object.assign({}, P, { ch: P.ch || (src ? src.prog : [0, 0, 0, 0]), lead: mel(P.lead), bell: mel(P.bell), id });
  };
  // a chord: its root for the bass, a closed voicing for the pads (and the root under it), its notes for the arp
  let bassLo = S.root - 12;
  while (bassLo < 30) bassLo += 12;
  const voicing = (c, P) => {
    const d = typeof c === 'number' ? c : parseInt(c, 10), q = String(c), r = pitch(d);
    let third = pitch(d + 2) - r;
    const fifth = pitch(d + 4) - r;
    if (q.includes('^') && third === 3) third = 4;
    if (q.includes('s')) third = pitch(d + 3) - r;
    const iv = [0, third, fifth].concat(S.sev ? [pitch(d + 6) - r] : []), root = S.root + r, lo = S.root + 12;
    let bass = root;
    while (bass >= bassLo + 12) bass -= 12;
    while (bass < bassLo) bass += 12;
    const pad = iv.map(x => { let m = root + x; while (m < lo) m += 12; while (m >= lo + 12) m -= 12; return m; }).concat([bass + 12]);
    let a = root;
    const alo = S.root + 12 + 12 * (P.ao || 0);
    while (a < alo) a += 12;
    while (a >= alo + 12) a -= 12;
    return { bass, five: fifth, pad, arp: [a, a + third, a + fifth, a + 12, a + 12 + third, a + 12 + fifth, a + 24] };
  };
  for (const id of S.form) {
    const P = partOf(id), beat = /[SXZC]/.test(SYNTH_DRUMS[P.dr] || '');
    P.ch.forEach((c, b) => bars.push(Object.assign({ P, c, b, first: b === 0, last: b === P.ch.length - 1, beat }, voicing(c, P))));
  }
  // a held chord carries on over the next bar when that's the same chord (ties: how many bars more it rings)
  for (let k = 1; k < bars.length; k++) bars[k].tie = !bars[k - 1].P.pad && !bars[k].P.pad && String(bars[k - 1].c) === String(bars[k].c);
  for (let k = bars.length - 1; k >= 0; k--) bars[k].ties = k + 1 < bars.length && bars[k + 1].tie ? bars[k + 1].ties + 1 : 0;
  const tempo = [0.92, 0.96, 1, 1.04, 1.08][skill] || 1;
  return { synth: true, song: S, sc, steps: n, bars, skill, whole: 'P' + '-'.repeat(n - 1), total: bars.length * n,
    stepDur: 60 / (S.bpm * tempo) / 4, key: key + '/' + skill };
}

function synthPitch(tr, deg, base) { const sc = tr.sc, o = Math.floor(deg / 7), d = ((deg % 7) + 7) % 7; return base + sc[d] + 12 * o; }

// one 16th of the song
function synthStep(tr, i, t) {
  const S = tr.song, n = tr.steps, bi = Math.floor(i / n), s = i % n, B = tr.bars[bi], P = B.P, sd = tr.stepDur, X = Synth, sk = tr.skill;
  const inBar = (str, at) => { let k = 1; while (at + k < n && str[(at + k) % str.length] === '-') k++; return k; };
  const along = (str, at) => { let k = 1; while (str[(at + k) % str.length] === '-' && k < 32) k++; return k; };
  // a bar begins: the pad filter moves to the part's setting; a crash where a part with drums comes in; a riser
  if (s === 0) {
    const f = Array.isArray(P.f) ? P.f[0] + (P.f[1] - P.f[0]) * B.b / Math.max(1, P.ch.length - 1) : P.f || S.f || 2200;
    X.padF.frequency.setTargetAtTime(f, t, sd * 4);
    if (B.first && B.beat && bi > 0) X.hit('c', t);
    if (B.last && P.rise) X.riser(t, n * sd);
  }
  // pads and stabs (back from a pause, or a new track mid-chord: the chord comes in again)
  const pp = P.pad || tr.whole, pc = pp[s % pp.length];
  const tail = len => len + (s + len >= n ? B.ties * n : 0);
  if (pc === 'P' && !(s === 0 && B.tie)) X.pad(B.pad, t, tail(inBar(pp, s)) * sd, S.att || 0.3);
  else if (X.fresh && (pc === 'P' || pc === '-')) {
    let a = s;
    while (a > 0 && pp[a % pp.length] === '-') a--;
    if (pp[a % pp.length] === 'P') X.pad(B.pad, t, tail(inBar(pp, s)) * sd, 0.15);
  } else if (pc === 'S') X.stab(B.pad, t, Math.min(2, inBar(pp, s)) * sd);
  X.fresh = false;
  // bass
  const bc = P.bs && P.bs[s % P.bs.length];
  if (bc && bc !== '-' && bc !== '.') {
    const off = { r: 0, R: 0, o: 12, O: 12, f: B.five, F: B.five }[bc] || 0, acc = bc === 'R' || bc === 'O' || bc === 'F';
    X.bassNote(B.bass + off, t, inBar(P.bs, s) * sd * 0.9, acc ? 0.36 : 0.3, S.dirt);
  }
  // the arpeggiator (8ths only on the easiest skill)
  if (P.arp && (sk > 0 || s % 2 === 0)) {
    const a = P.arp[s % P.arp.length];
    if (a >= '0' && a <= '6') X.arpNote(B.arp[+a], t, sd * 0.85, 0.32);
  }
  // the lead: a melody (with its harmony), or a lead break; the bells
  const leadBase = S.root + 24 + (S.lo || 0);
  if (P.solo) {
    const lick = B.last ? SYNTH_LAST_LICK : SYNTH_LICKS[(B.b + (parseInt(B.c, 10) & 1)) % SYNTH_LICKS.length], v = lick[s];
    if (v !== null && v !== undefined) {
      let len = 1;
      while (s + len < Math.min(16, n) && lick[s + len] === null) len++;
      X.leadNote(synthPitch(tr, parseInt(B.c, 10) + v, leadBase - 12), t, sd * len, 0.24, S.sq);
    }
  } else if (P.lead) {
    const k = B.b * n + s, ch = P.lead[k % P.lead.length], deg = ROCK_DEG(ch);
    if (deg !== undefined) {
      const len = along(P.lead, k % P.lead.length) * sd;
      X.leadNote(synthPitch(tr, deg, leadBase), t, len, 0.26, S.sq);
      if (P.harm) X.leadNote(synthPitch(tr, deg + P.harm, leadBase), t, len, 0.13, S.sq, 1);
    }
  }
  if (P.bell) {
    const k = B.b * n + s, deg = ROCK_DEG(P.bell[k % P.bell.length]);
    if (deg !== undefined) X.bell(synthPitch(tr, deg, leadBase), t, along(P.bell, k % P.bell.length) * sd, 0.4);
  }
  // drums: lighter on the easy skills, busier hats on the hard ones, gated toms into the next part
  if (P.dr) {
    const D = SYNTH_DRUMS[P.dr] || SYNTH_DRUMS.beat;
    let d = D[s % D.length];
    if (sk <= 1 && d === 'h' && s % 2) d = '.';
    if (sk >= 3 && d === '.' && s % 2 && B.beat) d = 'h';
    if (B.beat && B.last && s >= n - 4) d = ['T', 'T', 't', 't'][s - (n - 4)];
    if (d !== '.') X.hit(d, t);
  }
}

// which synthwave song plays for a mode (a boss's last phase: mode + '+')
function synthKey(mode) {
  const base = mode.replace('+', ''), k = SYNTH_SONGS[base] ? base : SYNTH_ALIAS[base] || ROCK_ALIAS[base];
  return SYNTH_SONGS[k] ? k : null;
}

// ------------------------------------------------------------------ into the music player
{
  const _build = Music.build, _play = Music.playStep, _want = Music.want;
  Music.build = function (mode, skill) {
    const style = Config.get('musicStyle'), k = style === 'SYNTHWAVE' ? synthKey(mode) : null;
    let tr;
    if (k) {
      tr = synthBuild(k, skill);
      if (mode.endsWith('+')) tr.stepDur /= 1.12;   // a boss's last phase: faster
      tr.key = mode + '/' + skill;
    } else tr = _build.call(this, mode, skill);
    tr.style = style;
    return tr;
  };
  Music.playStep = function (i, t, pass = 0) {
    if (!this.track || !this.track.synth) return _play.call(this, i, t, pass);
    Synth.setup(this.gain);
    if (Synth.tr !== this.track) Synth.begin(this.track);
    synthStep(this.track, i, t);
  };
  // MUSIC STYLE changed: the tune starts again in the new style; the synths hush when paused, muted or not playing
  Music.want = function (mode, skill, paused) {
    if (this.track && this.track.style !== Config.get('musicStyle')) this.stop();
    _want.call(this, mode, skill, paused);
    Synth.quiet(!(this.track && this.track.synth && !this.paused && !Sound.muted));
  };
}
// the name on a mode's title screen: the synthwave one when that's what plays
musicName = (name => function (mode) {
  const k = Config.get('musicStyle') === 'SYNTHWAVE' ? synthKey(mode) : null;
  return k ? SYNTH_SONGS[k].name : name(mode);
})(musicName);
