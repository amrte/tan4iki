'use strict';
// =====================================================================
//  The ROCK soundtrack (Settings → MUSIC STYLE: ROCK or CHIPTUNE): hard rock and heavy metal in the manner of the
//  80s and 90s, every tune written for this game — galloping riffs, palm-muted chugs, power chords, twin
//  harmony leads, double-kick drums, shred solos. Where it fits the lead plays the game's own chiptune themes, and
//  the two folk tunes it uses (Korobeiniki, Shchedryk) get metal versions.
//  Sound: Web Audio — two distorted rhythm guitars panned left and right (power chords: root, fifth, octave, each
//  on two detuned saws through a waveshaper and a "cabinet" filter), palm mutes through a darker filter, a lead
//  guitar with bends, vibrato and an echo, a bass, and a drum kit (kick, snare, hats, ride, crash, toms).
//  A song is parts of a few bars each (I intro, V verse, C chorus, S solo, B breakdown) played in its `form`.
//  Each part: ch (the chord degree of each bar), riff (one bar, 16 steps: X a ringing power chord, x a short one,
//  p a palm-muted chug on the root, P an accented one, 0-9/z/y a single note: that many scale steps from the chord,
//  - hold, . rest), dr (a drum pattern), lead (the melody, as the chiptune songs write it: scale degrees from the
//  key, 0-9 A B C, z y below; - hold, . rest), harm (a second lead that many degrees above: twin guitars),
//  solo (a shredded solo over the chords). A part can borrow a chiptune song's melody and chords: lead '@key'.
// =====================================================================

const ROCK_SCALES = { minor: [0, 2, 3, 5, 7, 8, 10], phryg: [0, 1, 3, 5, 7, 8, 10], harm: [0, 2, 3, 5, 7, 8, 11], dorian: [0, 2, 3, 5, 7, 9, 10],
  major: [0, 2, 4, 5, 7, 9, 11], mixo: [0, 2, 4, 5, 7, 9, 10], lydian: [0, 2, 4, 6, 7, 9, 11] };
const ROCK_DRUMS = {
  rock: 'K.h.S.h.K.KhS.h.', drive: 'K.h.S.h.K.h.S.h.', gallop: 'K.KKS.KKK.KKS.KK', double: 'KKKKSKKKKKKKSKKK',
  thrash: 'K.S.K.S.K.S.K.S.', half: 'K.h.h.h.S.h.h.h.', shuffle: 'K..hS..hK.KhS..h', ride: 'K.r.S.r.K.r.S.rK',
  odd14: 'K.hK.hS.K.hS.h', waltz12: 'K.hS.hK.hS.h', glitch15: 'K.hS.hK.KS.hK.S', waltz: 'K..S..K..S..',
};
const L = (...bars) => bars.join('');
const ROCK_SONGS = {
  // ------------------------------------------------------------ the tank game
  classic: { name: 'STEEL EAGLE', root: 40, bpm: 138, scale: 'minor', form: 'IVVCVVCSIC', parts: {
    I: { ch: [0, 0, 5, 6], riff: 'p.ppp.ppp.ppX---', dr: 'gallop', harm: 2, lead: L('7-7-9-7-A---9-7-', '5-5-7-5-9---7-5-', '3-3-5-3-7---5-3-', '2-3-4-5-6---z---') },
    V: { ch: [0, 0, 3, 4], riff: 'p.ppp.ppX-p.X-p.', dr: 'gallop' },
    C: { ch: [5, 3, 0, 4], riff: 'X-------X---X-x-', dr: 'rock', harm: 2, lead: L('7---7-9-A---9-7-', '5---5-7-8---7-5-', '4---4-5-7---5-4-', '6---4---2-------') },
    S: { ch: [0, 5, 3, 4], riff: 'p.ppp.ppp.ppp.pp', dr: 'double', solo: true } } },
  custom: { name: 'BRICK BY BRICK', root: 45, bpm: 128, scale: 'mixo', form: 'IVCVCSC', parts: {
    I: { ch: [0, 0, 3, 0], riff: '0.2.0.3.0.2.0.z.', dr: 'drive' },
    V: { ch: [0, 3, 0, 4], riff: '0.2.0.3.0.2.0.z.', dr: 'drive', lead: L('4.4.4.5.4-2-0---', '3.3.3.4.3-1-z---', '4.4.4.5.6-5-4-2-', '4-2-1-z-0-------') },
    C: { ch: [3, 0, 4, 3], riff: 'X---X---X-X-X---', dr: 'rock', harm: 2, lead: L('7---7-9-7---4---', '6---6-7-6---4---', '7---9---B---9---', '7-------4-------') },
    S: { ch: [0, 3, 4, 0], riff: 'X-x.x.X-x.x.X-x.', dr: 'rock', solo: true } } },
  survival: { name: 'LAST MAN STANDING', root: 40, bpm: 176, scale: 'phryg', form: 'IVCVCBSC', parts: {
    I: { ch: [0, 0, 0, 1], riff: '0.0.0.0.1.0.3.0.', dr: 'thrash' },
    V: { ch: [0, 0, 1, 0], riff: 'p.ppp.pp1-p.ppp.', dr: 'thrash' },
    C: { ch: [3, 1, 0, 0], riff: 'X---X---X-X-X---', dr: 'double', harm: 2, lead: L('7---8---7-5-3---', '8---7---5---3-1-', '0---1---3---5---', '7-------8---7---') },
    B: { ch: [0, 0, 0, 0], riff: 'X--.X--.X-.X-.X.', dr: 'half' },
    S: { ch: [0, 3, 1, 0], riff: 'pppppppppppppppp', dr: 'double', solo: true } } },
  timeattack: { name: 'RED LINE', root: 45, bpm: 192, scale: 'minor', form: 'IVCVCSC', parts: {
    I: { ch: [0, 0, 5, 6], riff: 'p.p.p.p.p.p.X-x-', dr: 'thrash' },
    V: { ch: [0, 5, 3, 4], riff: 'p.ppp.ppp.ppX-X-', dr: 'double', harm: 2, lead: L('0.2.4.7.4.2.0.2.', '0.2.4.5.4.2.0.z.', '0.2.3.5.3.2.0.2.', '4.5.6.7.6.5.4.2.') },
    C: { ch: [5, 6, 0, 0], riff: 'X---X---X---X---', dr: 'double', harm: 2, lead: L('7---6---7---9---', 'A---9---8---6---', '7---4---7---9---', '7-----------z---') },
    S: { ch: [0, 5, 6, 4], riff: 'pppppppppppppppp', dr: 'double', solo: true } } },
  bigmaps: { name: 'WIDE FRONT', root: 38, bpm: 118, scale: 'mixo', swing: 0.6, form: 'IVCVCSC', parts: {
    I: { ch: [0, 6, 3, 0], riff: 'X-----x.X-----x.', dr: 'shuffle' },
    V: { ch: [0, 0, 3, 0], riff: '0.0.2.0.3.2.0.z.', dr: 'shuffle', lead: L('0-------4-------', '3-------2---1---', '0-------4---5---', '7-----------6-4-') },
    C: { ch: [3, 6, 0, 0], riff: 'X---X---X---X-x-', dr: 'rock', harm: 2, lead: L('4---4-5-7---5-4-', '2---2-4-6---4-2-', '0---2---4---5---', '4-------2-------') },
    S: { ch: [0, 3, 6, 0], riff: 'X-x.x.X-x.x.X-x.', dr: 'rock', solo: true } } },
  sides: { name: 'TURNED AROUND', root: 43, bpm: 132, scale: 'minor', steps: 14, form: 'IVCVCSC', parts: {
    I: { ch: [0, 0, 5, 4], riff: 'p.pp.pp.ppX-x.', dr: 'odd14' },
    V: { ch: [0, 0, 3, 4], riff: 'X-.X-.X-.Xx.x.', dr: 'odd14', lead: L('0-2-4-0-2-4-5-', '4-2-0-4-2-0-z-', '0-2-4-6-5-4-2-', '1-2-3-1-0-----') },
    C: { ch: [5, 3, 0, 4], riff: 'X-----X-----x.', dr: 'odd14', harm: 2, lead: L('7---6---5-4-2-', '3---4---5-----', '7---9---A---9-', '7-------------') },
    S: { ch: [0, 5, 3, 4], riff: 'p.pp.pp.pp.pp.', dr: 'odd14', solo: true } } },
  corridor: { name: 'THE CLIMB', root: 38, bpm: 168, scale: 'minor', form: 'IVCVCSC', parts: {
    I: { ch: [0, 5, 6, 0], riff: 'X---X---X---X-x-', dr: 'double', harm: 2, lead: L('0---2---4---7---', '5---4---5---9---', '6---5---6---A---', '9---7---4-------') },
    V: { ch: [0, 1, 2, 4], riff: 'p.ppp.ppp.ppp.pp', dr: 'gallop', lead: L('0.2.4.7.2.4.7.9.', '1.3.5.8.3.5.8.A.', '2.4.6.9.4.6.9.B.', '4-3-4-5-7-------') },
    C: { ch: [5, 6, 0, 4], riff: 'X-------X-------', dr: 'double', harm: 2, lead: L('7---9---A---C---', 'B---9---8---6---', '7---9---A---9---', 'B---------------') },
    S: { ch: [0, 5, 6, 4], riff: 'pppppppppppppppp', dr: 'double', solo: true } } },
  maze: { name: 'LABYRINTH OF STEEL', root: 40, bpm: 76, scale: 'phryg', form: 'IVCBVC', parts: {
    I: { ch: [0, 0, 1, 0], riff: 'X-----------X-1-', dr: 'half' },
    V: { ch: [0, 0, 1, 6], riff: 'X-----X-----X---', dr: 'half', lead: L('7-------8-------', '7-------5-------', '4-----5-3-------', '1---------------') },
    C: { ch: [3, 1, 0, 0], riff: 'X---------------', dr: 'half', harm: 2, lead: L('A-------8-------', '7---5---3-------', '4-------3-------', '1-----0---------') },
    B: { ch: [0, 1, 0, 6], riff: 'p.p.p.p.X---X---', dr: 'rock' } } },
  fortress: { name: 'HOLD THE WALLS', root: 38, bpm: 136, scale: 'minor', form: 'IVCVCSC', parts: {
    I: { ch: [0, 5, 3, 4], riff: 'X---X---X---X-x-', dr: 'rock', harm: 2, lead: L('0-0-4-0-7---5-4-', '5-5-4-2-0---z---', '3-3-4-5-7---9-7-', '5-4-2-4-0-------') },
    V: { ch: [0, 0, 5, 4], riff: 'p.ppp.ppX---X---', dr: 'gallop' },
    C: { ch: [3, 4, 0, 0], riff: 'X-------X---X---', dr: 'rock', harm: 2, lead: L('7---7-9-A---9-7-', '8---7---6---4---', '7---7-9-A---C---', 'A---9---7-------') },
    S: { ch: [0, 5, 3, 4], riff: 'p.ppp.ppp.ppp.pp', dr: 'double', solo: true } } },
  race: { name: 'NITRO', root: 40, bpm: 150, scale: 'mixo', swing: 0.6, form: 'IVCVCSC', parts: {
    I: { ch: [0, 0, 0, 0], riff: '0.0.1.0.2.0.1.0.', dr: 'shuffle' },
    V: { ch: [0, 0, 3, 0], riff: '0.0.1.0.2.0.1.0.', dr: 'shuffle', lead: L('4---4-5-4-2-0---', '4---4-5-6-5-4---', '4---4-5-4-2-0---', '2-3-4-2-0-------') },
    C: { ch: [3, 6, 0, 0], riff: 'X---X---X---x-x-', dr: 'rock', harm: 2, lead: L('7---7-6-7---4---', '6---6-5-6---3---', '7---6---4---2---', '4-------0-------') },
    S: { ch: [0, 3, 6, 0], riff: 'X-x.x.X-x.x.X-x.', dr: 'rock', solo: true } } },
  eagles: { name: 'EAGLE DUEL', root: 38, bpm: 136, scale: 'minor', form: 'IVCVCSC', parts: {
    I: { ch: [0, 0, 5, 4], riff: 'X--X--X-X--X--x-', dr: 'rock', harm: 2, lead: L('0--0--4-3--2--1-', '0--0--4-5--4--2-', '7--7--5-6--5--4-', '3-2-1-z-0-------') },
    V: { ch: [0, 0, 3, 0], riff: 'p.ppp.ppX--X--X-', dr: 'gallop' },
    C: { ch: [5, 6, 0, 0], riff: 'X-------X-------', dr: 'rock', harm: 2, lead: L('7---7---9---7---', '6---6---8---6---', '7---9---A---9---', '7---------------') },
    S: { ch: [0, 5, 6, 4], riff: 'p.ppp.ppp.ppp.pp', dr: 'double', solo: true } } },
  dm: { name: 'NO MERCY', root: 40, bpm: 172, scale: 'phryg', form: 'IVCVCBSC', parts: {
    I: { ch: [0, 0, 0, 1], riff: 'p.p.p.p.X-X-1-0-', dr: 'thrash' },
    V: { ch: [0, 0, 1, 0], riff: '0.00.00.1.00.00.', dr: 'thrash' },
    C: { ch: [3, 1, 0, 0], riff: 'X---X---X-X-X---', dr: 'double', lead: L('0.0.0.3.0.0.4.3.', '0.0.0.3.0.0.5.4.', '7.7.6.5.4.4.3.2.', '1.1.2.3.4---z---') },
    B: { ch: [0, 0, 0, 0], riff: 'X--.X--.X-.X-.X.', dr: 'half' },
    S: { ch: [0, 3, 1, 0], riff: 'pppppppppppppppp', dr: 'double', solo: true } } },
  ctf: { name: 'BRING IT HOME', root: 43, bpm: 126, scale: 'major', form: 'IVCVCSC', parts: {
    I: { ch: [0, 3, 0, 4], riff: 'X---X-x-X---X-x-', dr: 'drive', harm: 2, lead: L('0-4-7---7-9-7---', '5-4-3-4-5-------', '4-5-7-4-3-4-2-0-', '1-2-3-1-4-------') },
    V: { ch: [0, 0, 3, 4], riff: 'X-x.x.X-x.x.X-x.', dr: 'drive' },
    C: { ch: [3, 4, 0, 0], riff: 'X-------X-------', dr: 'rock', harm: 2, lead: L('7---7---9---7---', '8---8---9---A---', 'B---A---9---7---', '9-------7-------') },
    S: { ch: [0, 3, 4, 0], riff: 'X-x.x.X-x.x.X-x.', dr: 'rock', solo: true } } },
  cpu: { name: 'MACHINE WAR', root: 45, bpm: 124, scale: 'minor', form: 'IVCVCSC', parts: {
    I: { ch: [0, 0, 5, 4], riff: 'PpppPppPpPppPppP', dr: 'double' },
    V: { ch: [0, 3, 5, 4], riff: 'P.pPp.pPP.pPp.pP', dr: 'rock', lead: L('0707070704040404', '3A3A3A3A29292929', '5C5C5C5C4B4B4B4B', '0-0-z-z-0-------') },
    C: { ch: [5, 6, 0, 0], riff: 'X-------X---X---', dr: 'rock', harm: 2, lead: L('7---7---9---A---', '9---8---6---4---', '7---9---A---C---', 'B---------------') },
    S: { ch: [0, 3, 5, 4], riff: 'PpppPppPpPppPppP', dr: 'double', solo: true } } },
  victory: { name: 'VICTORY!', root: 43, bpm: 144, scale: 'major', form: 'I', parts: {
    I: { ch: [0, 3, 4, 0], riff: 'X---X---X---X---', dr: 'rock', harm: 2, lead: L('0-0-0-4---3-4-5-', '5-5-5-7---6-5-4-', '4-5-7-9-7-5-4-2-', '0-4-7-9-A-----.-') } } },
  ending: { name: 'THE EARTH IS SAVED', root: 40, bpm: 112, scale: 'major', form: 'ICCSC', parts: {
    I: { ch: [0, 3, 4, 0], riff: 'X-------X-------', dr: 'half', harm: 2, lead: L('0---4---7---4-5-', '7---9---7-------', '5---4---3---2-3-', '4---2---0-------') },
    C: { ch: [5, 3, 0, 4], riff: 'X---X---X---X-x-', dr: 'rock', harm: 2, lead: L('7---7-9-B---9-7-', '5---5-7-9---7-5-', '4---4-5-7---9-B-', '9-------7-------') },
    S: { ch: [0, 5, 3, 4], riff: 'X---X---X---X---', dr: 'rock', solo: true } } },
  // ------------------------------------------------------------ the tank bosses
  bossWarn: { name: 'WARNING!', root: 45, bpm: 132, scale: 'minor', form: 'I', parts: {
    I: { ch: [0, 0, 1, 1], riff: 'X-.X-.X-.X-.X-X-', dr: 'double', harm: 2, lead: L('4-3-4-3-4-3-4-3-', '5-4-5-4-5-4-5-4-', '6-5-6-5-6-5-6-5-', '7---6---5---4---') } } },
  bossIron: { name: 'IRON FIST', root: 40, bpm: 148, scale: 'minor', form: 'IVCVCSC', parts: {
    I: { ch: [0, 0, 5, 4], riff: 'X-.X-.X-p.p.X---', dr: 'rock' },
    V: { ch: [0, 0, 5, 4], riff: 'p.ppp.ppp.ppX-X-', dr: 'gallop', harm: 2, lead: L('0-z-0-2-3---2-0-', '0-z-0-2-4---3-2-', '7-6-5-4-3-4-5-3-', '4-4-3-2-0---z---') },
    C: { ch: [3, 5, 0, 4], riff: 'X-------X---X---', dr: 'double', harm: 2, lead: L('7---7-6-7---9---', 'A---9---8---7---', '7---6---5---4---', '3-------4-------') },
    S: { ch: [0, 5, 3, 4], riff: 'p.ppp.ppp.ppp.pp', dr: 'double', solo: true } } },
  bossDeep: { name: 'DEEP WATERS', root: 38, bpm: 84, scale: 'minor', form: 'IVCVC', parts: {
    I: { ch: [0, 0, 1, 0], riff: 'X-------X-------', dr: 'half' },
    V: { ch: [0, 1, 0, 6], riff: 'X-----X-----X---', dr: 'half', harm: 2, lead: L('0---1---0---z---', '0---2---1---0---', '3---4---3---1---', '2---1---z-------') },
    C: { ch: [3, 1, 0, 0], riff: 'p.p.p.p.X---X---', dr: 'rock', lead: L('7-------8-------', '7---5---3-------', '5-------3-------', '1-------0-------') } } },
  bossWar: { name: 'WAR MACHINE', root: 43, bpm: 150, scale: 'minor', form: 'IVCVCSC', parts: {
    I: { ch: [0, 0, 5, 6], riff: 'P.ppP.ppP.ppX-X-', dr: 'gallop' },
    V: { ch: [0, 5, 3, 4], riff: 'p.ppp.ppX-p.X-p.', dr: 'gallop', harm: 2, lead: L('0---0-0-2---0---', '3-2-1-0-z---0---', '4---4-4-5---4---', '3-4-5-6-7-------') },
    C: { ch: [5, 6, 0, 0], riff: 'X---X---X-X-X---', dr: 'double', harm: 2, lead: L('7---7-9-A---9---', '8---8-9-A---C---', 'B---A---9---7---', '6-------7-------') },
    S: { ch: [0, 5, 6, 4], riff: 'pppppppppppppppp', dr: 'double', solo: true } } },
  bossUfo: { name: 'CLOSE ENCOUNTER', root: 40, bpm: 150, scale: 'lydian', form: 'IVCVCSC', parts: {
    I: { ch: [0, 1, 5, 4], riff: 'X---x.x.X---x.x.', dr: 'drive', harm: 2, lead: L('0.2.4.6.8.6.4.2.', '1.3.5.7.9.7.5.3.', '0---6---4---2---', '7-6-5-4-3-2-1-0-') },
    V: { ch: [0, 1, 0, 1], riff: 'p.ppp.ppp.ppp.pp', dr: 'double' },
    C: { ch: [5, 4, 0, 0], riff: 'X-------X-------', dr: 'rock', harm: 2, lead: L('7---9---B---9---', '8---7---6---4---', '7---9---B---C---', 'B---------------') },
    S: { ch: [0, 1, 5, 4], riff: 'pppppppppppppppp', dr: 'double', solo: true } } },
  galya: { name: 'SHCHEDRYK (METAL)', root: 43, bpm: 150, scale: 'minor', steps: 12, form: 'IS', parts: {
    I: { lead: '@galya', riff: 'X-.p.pX-.p.p', dr: 'waltz12', harm: 2 },
    S: { lead: null, from: 'galya', riff: 'pppppppppppp', dr: 'waltz12', solo: true } } },
  // ------------------------------------------------------------ GALAXY
  galaxy: { name: 'STARFIGHTER (METAL)', root: 40, bpm: 168, scale: 'minor', form: 'IVISI', parts: {
    I: { lead: '@galaxy', riff: 'X---X---X---X-x-', dr: 'double', harm: 2 },
    V: { from: 'galaxy', riff: 'p.ppp.ppp.ppX---', dr: 'gallop' },
    S: { from: 'galaxy', riff: 'pppppppppppppppp', dr: 'double', solo: true } } },
  galaxyBoss: { name: 'ALIEN OVERLORD (METAL)', root: 45, bpm: 150, scale: 'minor', form: 'IVIS', parts: {
    I: { lead: '@galaxyBoss', riff: 'P.ppP.ppP.ppX-X-', dr: 'double', harm: 2 },
    V: { from: 'galaxyBoss', riff: 'X--.X--.X-.X-.X.', dr: 'half' },
    S: { from: 'galaxyBoss', riff: 'pppppppppppppppp', dr: 'double', solo: true } } },
  galaxy2: { name: 'HYPERSPACE (METAL)', root: 38, bpm: 172, scale: 'minor', form: 'IVIS', parts: {
    I: { lead: '@galaxy2', riff: 'X---X---X---X-x-', dr: 'double', harm: 2 },
    V: { from: 'galaxy2', riff: 'p.ppp.ppp.ppp.pp', dr: 'gallop' },
    S: { from: 'galaxy2', riff: 'pppppppppppppppp', dr: 'double', solo: true } } },
  galaxyBoss2: { name: 'ALL YOUR BASE (METAL)', root: 43, bpm: 156, scale: 'phryg', form: 'IVIS', parts: {
    I: { lead: '@galaxyBoss2', riff: 'p.p.p.p.X-X-1-0-', dr: 'thrash', harm: 2 },
    V: { from: 'galaxyBoss2', riff: '0.00.00.1.00.00.', dr: 'thrash' },
    S: { from: 'galaxyBoss2', riff: 'pppppppppppppppp', dr: 'double', solo: true } } },
  galaxyWell: { name: 'KOROBEINIKI (METAL)', root: 45, bpm: 150, scale: 'minor', form: 'IVIS', parts: {
    I: { lead: '@galaxyWell', riff: 'X---x.x.X---x.x.', dr: 'drive', harm: 2 },
    V: { from: 'galaxyWell', riff: 'p.ppp.ppp.ppp.pp', dr: 'gallop' },
    S: { from: 'galaxyWell', riff: 'pppppppppppppppp', dr: 'double', solo: true } } },
  galaxyBossWell: { name: 'KOROBEINIKI: LEVEL 9 (METAL)', root: 40, bpm: 184, scale: 'harm', form: 'IS', parts: {
    I: { lead: '@galaxyBossWell', riff: 'p.ppp.ppp.ppX---', dr: 'double', harm: 2 },
    S: { from: 'galaxyBossWell', riff: 'pppppppppppppppp', dr: 'double', solo: true } } },
  galaxySlop: { name: 'UPBEAT CORPORATE ROCK 4', root: 40, bpm: 120, scale: 'major', form: 'IVI', parts: {
    I: { lead: '@galaxySlop', riff: 'X---X---X---X---', dr: 'drive' },
    V: { from: 'galaxySlop', riff: 'x.x.x.x.x.x.x.x.', dr: 'drive' } } },
  galaxyBossSlop: { name: 'STOCK MUSIC.EXE (METAL)', root: 40, bpm: 140, scale: 'lydian', steps: 15, form: 'IS', parts: {
    I: { lead: '@galaxyBossSlop', riff: 'P.pp.P.pp.X-x-.', dr: 'glitch15', harm: 2 },
    S: { from: 'galaxyBossSlop', riff: 'ppppppppppppppp', dr: 'glitch15', solo: true } } },
};
// modes that share a tune
const ROCK_ALIAS = { coop: 'cpu', galaxyRush: 'galaxy' };
// a shredded solo: 16 notes a bar from these shapes (scale steps from the chord); the last bar bends and holds
const ROCK_LICKS = [
  [0, 2, 4, 7, 4, 2, 0, 2, 4, 7, 9, 11, 9, 7, 4, 7], [7, 6, 4, 2, 4, 2, 0, -1, 0, 2, 4, 2, 4, 6, 7, 9],
  [0, 1, 2, 3, 4, 3, 2, 1, 2, 3, 4, 5, 7, 5, 4, 2], [9, 7, 4, 7, 9, 11, 9, 7, 11, 9, 7, 4, 7, 4, 2, 0],
];
const ROCK_LAST_LICK = [7, 9, 11, 14, null, null, null, null, 11, null, 9, null, 7, null, null, null];

const Rock = {
  ctx: null,
  // the instruments' wiring, made once per audio context (an offline render makes its own)
  setup(out) {
    const c = Sound.ctx;
    if (this.ctx === c && this.out === out) return;
    this.ctx = c; this.out = out;
    const trim = c.createGain(); trim.gain.value = 0.55; trim.connect(out); out = trim;   // as loud as the chiptunes
    const curve = k => { const n = 1024, a = new Float32Array(n); for (let i = 0; i < n; i++) { const x = i / (n / 2) - 1; a[i] = Math.tanh(k * x) / Math.tanh(k); } return a; };
    const chain = (nodes, dest) => { for (let i = 0; i < nodes.length - 1; i++) nodes[i].connect(nodes[i + 1]); nodes[nodes.length - 1].connect(dest); return nodes[0]; };
    const shaper = k => { const s = c.createWaveShaper(); s.curve = curve(k); s.oversample = '2x'; return s; };
    const filt = (type, f, q = 0.7, db = 0) => { const b = c.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; b.gain.value = db; return b; };
    const gain = v => { const g = c.createGain(); g.gain.value = v; return g; };
    const pan = p => { if (!c.createStereoPanner) return gain(1); const s = c.createStereoPanner(); s.pan.value = p; return s; };
    // two rhythm guitars, left and right; palm mutes darker, in the middle; the lead with an echo; bass; drums
    this.gtr = [-0.6, 0.6].map(p => chain([gain(1), shaper(28), filt('lowpass', 5200), filt('highpass', 100), filt('peaking', 2600, 0.9, 5), filt('peaking', 400, 1, -3), pan(p), gain(0.19)], out));
    this.mute = chain([gain(1), shaper(30), filt('lowpass', 1100), filt('highpass', 90), filt('peaking', 120, 1, 3), gain(0.26)], out);
    const echo = c.createDelay(1); echo.delayTime.value = 0.32; const fb = gain(0.28), wet = gain(0.28);
    echo.connect(fb); fb.connect(echo); echo.connect(wet); wet.connect(out);
    this.lead = [-0.25, 0.3].map(p => { const pn = pan(p), lv = gain(0.19); pn.connect(lv); lv.connect(out); lv.connect(echo); return chain([gain(1), shaper(10), filt('lowpass', 4600), filt('highpass', 180)], pn); });
    this.bass = chain([gain(1), filt('lowpass', 750), gain(0.27)], out);
    this.drums = gain(0.66); this.drums.connect(out);
    // white noise for the kit
    const len = c.sampleRate, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noise = buf;
  },

  osc(type, midi, t, end, dest, detune = 0) {
    const c = this.ctx, o = c.createOscillator();
    if (type === 'sq') o.setPeriodicWave(Sound.waves.p50); else o.type = type;
    o.frequency.setValueAtTime(Sound.midi(midi), t); o.detune.value = detune;
    o.connect(dest); o.start(t); o.stop(end + 0.02);
    return o;
  },
  env(t, dur, vol, dest, mute) {
    const g = this.ctx.createGain(), end = t + dur;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.006);
    if (mute) g.gain.exponentialRampToValueAtTime(0.001, t + Math.min(dur, 0.13));
    else { g.gain.setValueAtTime(vol * 0.85, Math.max(t + 0.01, end - 0.03)); g.gain.linearRampToValueAtTime(0, end); }
    g.connect(dest);
    return g;
  },
  // a power chord (root, fifth, octave) on both guitars; mute: palm-muted, short and dark
  power(midi, t, dur, mute, vol = 1, single = false) {
    const notes = single ? [midi, midi + 12] : [midi, midi + 7, midi + 12];
    if (mute) { const g = this.env(t, dur, 0.5 * vol, this.mute, true); for (const n of notes) this.osc('sawtooth', n, t, t + 0.14, g); return; }
    this.gtr.forEach((bus, k) => {
      const tt = t + k * 0.005, g = this.env(tt, dur, 0.42 * vol, bus, false);
      for (const n of notes) { this.osc('sawtooth', n, tt, tt + dur, g, k ? 7 : -7); this.osc('sawtooth', n, tt, tt + dur, g, k ? -4 : 4); }
    });
  },
  // a lead note: bends up into long ones, vibrato as it rings
  leadNote(midi, t, dur, k = 0, vol = 1) {
    const c = this.ctx, g = this.env(t, dur, 0.5 * vol, this.lead[k], false), end = t + dur;
    for (const [type, det] of [['sawtooth', -5], ['sq', 6]]) {
      const o = this.osc(type, midi, t, end, g, det);
      if (dur > 0.22) {
        o.frequency.setValueAtTime(Sound.midi(midi - 1.5), t); o.frequency.linearRampToValueAtTime(Sound.midi(midi), t + 0.07);
        const lfo = c.createOscillator(), lg = c.createGain();
        lfo.frequency.value = 5.6; lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(0, t + 0.16); lg.gain.linearRampToValueAtTime(28, t + 0.4);
        lfo.connect(lg); lg.connect(o.detune); lfo.start(t); lfo.stop(end + 0.02);
      }
    }
  },
  bassNote(midi, t, dur) { const g = this.env(t, dur, 0.6, this.bass, false); this.osc('sawtooth', midi, t, t + dur, g); this.osc('triangle', midi - 12, t, t + dur, g); },
  hit(kind, t) {
    const c = this.ctx, nz = (f1, f2, len, vol) => {
      const s = c.createBufferSource(), g = c.createGain(), hp = c.createBiquadFilter(), lp = c.createBiquadFilter();
      s.buffer = this.noise; hp.type = 'highpass'; hp.frequency.value = f1; lp.type = 'lowpass'; lp.frequency.value = f2;
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + len);
      s.connect(hp); hp.connect(lp); lp.connect(g); g.connect(this.drums); s.start(t, Math.random() * 0.5); s.stop(t + len + 0.02);
    };
    const tone = (f0, f1, len, vol, type = 'sine') => {
      const o = c.createOscillator(), g = c.createGain(); o.type = type;
      o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + len);
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + len);
      o.connect(g); g.connect(this.drums); o.start(t); o.stop(t + len + 0.02);
    };
    if (kind === 'K') { tone(140, 42, 0.16, 1.1); nz(2000, 6000, 0.012, 0.35); }
    else if (kind === 'k') { tone(130, 45, 0.12, 0.8); }
    else if (kind === 'S') { nz(900, 7000, 0.17, 0.55); tone(200, 140, 0.09, 0.45, 'triangle'); }
    else if (kind === 's') nz(1200, 6000, 0.06, 0.15);
    else if (kind === 'h') nz(7000, 15000, 0.035, 0.26);
    else if (kind === 'o') nz(6000, 14000, 0.22, 0.17);
    else if (kind === 'r') { nz(5000, 12000, 0.3, 0.11); tone(3200, 3000, 0.25, 0.03); }
    else if (kind === 'c') nz(3500, 13000, 1.3, 0.3);
    else if (kind === 'T') tone(240, 150, 0.22, 0.7);
    else if (kind === 't') tone(160, 95, 0.26, 0.75);
  },
};

// ------------------------------------------------------------------ a song, laid out bar by bar
function rockBuild(key, skill) {
  const S = ROCK_SONGS[key], steps = S.steps || 16, sc = ROCK_SCALES[S.scale] || ROCK_SCALES.minor, bars = [];
  const partOf = id => {
    const P = S.parts[id], src = P.lead && P.lead[0] === '@' ? SONGS[P.lead.slice(1)] : P.from ? SONGS[P.from] : null;
    const ch = P.ch || (src ? src.prog : [0, 0, 0, 0]);
    const lead = P.lead && P.lead[0] === '@' ? (src ? src.mel : null) : P.lead || null;
    return Object.assign({}, P, { ch, lead, id });
  };
  for (const id of S.form) {
    const P = partOf(id);
    P.ch.forEach((c, b) => bars.push({ P, c, b, first: b === 0, last: b === P.ch.length - 1 }));
  }
  const tempo = [0.92, 0.96, 1, 1.04, 1.08][skill] || 1;
  return { rock: true, song: S, sc, steps, bars, sk: { drums: skill }, total: bars.length * steps, stepDur: 60 / (S.bpm * tempo) / 4, key: key + '/' + skill };
}

function rockPitch(tr, deg, base) { const sc = tr.sc, o = Math.floor(deg / 7), d = ((deg % 7) + 7) % 7; return base + sc[d] + 12 * o; }
const ROCK_DEG = ch => (ch >= '0' && ch <= '9' ? +ch : { A: 10, B: 11, C: 12, D: 13, z: -1, y: -2, x: -3 }[ch]);

// one 16th of the song
function rockStep(tr, i, t) {
  const S = tr.song, n = tr.steps, bi = Math.floor(i / n), s = i % n, B = tr.bars[bi], P = B.P, sd = tr.stepDur;
  const root = S.root, chordRoot = rockPitch(tr, B.c, root);
  const holdLen = (str, at) => { let k = 1; while (str[(at + k) % str.length] === '-' && k < 16) k++; return k; };
  // rhythm guitars and the bass under them
  const r = P.riff[s % P.riff.length];
  if (r && r !== '-' && r !== '.') {
    const len = holdLen(P.riff, s % P.riff.length) * sd;
    if (r === 'X' || r === 'x') { const d = r === 'X' ? len : Math.min(len, sd * 1.6); Rock.power(chordRoot, t, d, false); Rock.bassNote(chordRoot - 12, t, d); }
    else if (r === 'p' || r === 'P') { Rock.power(chordRoot, t, sd, true, r === 'P' ? 1.4 : 1); if (s % 2 === 0 || r === 'P') Rock.bassNote(chordRoot - 12, t, sd * 0.9); }
    else { const deg = ROCK_DEG(r); if (deg !== undefined) { const m = rockPitch(tr, B.c + deg, root); const short = P.riff[(s + 1) % P.riff.length] !== '-'; Rock.power(m, t, short ? sd : len, short, 1, true); Rock.bassNote(m - 12, t, Math.max(sd, len) * 0.9); } }
  }
  // the lead: a melody (with its twin), or a solo
  const leadBase = root + 24;
  if (P.solo) {
    const lick = B.last ? ROCK_LAST_LICK : ROCK_LICKS[(B.b + (B.c & 1)) % ROCK_LICKS.length], v = lick[s % 16];
    if (v !== null && v !== undefined && s < 16) {
      let len = 1; while (lick[(s + len) % 16] === null && s + len < 16) len++;
      Rock.leadNote(rockPitch(tr, B.c + v, leadBase), t, sd * len * 0.92, 0, len > 2 ? 1 : 0.8);
    }
  } else if (P.lead) {
    const k = B.b * n + s, ch = P.lead[k % P.lead.length];
    if (ch && ch !== '.' && ch !== '-') {
      const deg = ROCK_DEG(ch);
      if (deg !== undefined) {
        const len = holdLen(P.lead, k % P.lead.length), d = sd * len * 0.94;
        Rock.leadNote(rockPitch(tr, deg, leadBase), t, d, 0);
        if (P.harm) Rock.leadNote(rockPitch(tr, deg + P.harm, leadBase), t, d, 1, 0.75);
      }
    }
  }
  // drums: the part's beat, a crash where a part begins, a fill where it ends; lighter on the easy skills
  const D = ROCK_DRUMS[P.dr] || ROCK_DRUMS.rock;
  let d = D[s % D.length];
  if (tr.sk.drums <= 1 && P.dr === 'double' && d === 'K' && s % 4 !== 0) d = s % 2 ? '.' : 'h';
  if (B.first && s === 0) Rock.hit('c', t);
  if (B.last && s >= n - 4 && (bi % 2 === 1 || P.ch.length === 1)) d = ['T', 'T', 't', 't'][s - (n - 4)];
  if (d && d !== '.') Rock.hit(d, t);
  if (d === 'K' && s % 4 === 0 && P.dr !== 'double' && P.dr !== 'gallop') Rock.hit('h', t);   // a hat with the kick on the beat
  if ((P.dr === 'double' || P.dr === 'gallop' || P.dr === 'thrash') && s % 4 === 2) Rock.hit('r', t);
}

// ------------------------------------------------------------------ into the music player
{
  const _build = Music.build, _play = Music.playStep, _ready = Music.ready;
  const rockKey = mode => { const base = mode.replace('+', ''); const k = ROCK_ALIAS[base] || base; return ROCK_SONGS[k] ? k : null; };
  Music.build = function (mode, skill) {
    const k = Config.get('musicStyle') === 'ROCK' ? rockKey(mode) : null;
    if (!k) return _build.call(this, mode, skill);
    const tr = rockBuild(k, skill);
    if (mode.endsWith('+')) tr.stepDur /= 1.12;   // a boss's last phase: faster
    tr.key = mode + '/' + skill;
    return tr;
  };
  Music.playStep = function (i, t, pass = 0) {
    if (!this.track || !this.track.rock) return _play.call(this, i, t, pass);
    Rock.setup(this.gain);
    rockStep(this.track, i, t);
  };
}
// the name shown on a mode's title screen: the rock one when that's what plays
function musicName(mode) {
  const k = ROCK_ALIAS[mode] || mode;
  if (Config.get('musicStyle') === 'ROCK' && ROCK_SONGS[k]) return ROCK_SONGS[k].name;
  return (SONGS[mode] || SONGS.classic).name;
}
