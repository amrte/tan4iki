'use strict';
// =====================================================================
//  TANK RALLY's soundtrack, in all three MUSIC STYLEs (chiptune: SONGS, rock: ROCK_SONGS, synthwave: SYNTH_SONGS).
//  Driving music in the manner of 70s and 80s hard rock and blues-rock: boogie shuffles, chugging power chords, a
//  spy-film surf groove for the garage, a stomping anthem for the final. Every tune here is written for this game:
//  the blues forms and the common rock chord changes are the genre's, the melodies and riffs are our own.
//    rally      the race (three tunes: rally, rally2, rally3; each track plays one of them, see below)
//    rallyBoss  the season final, the championship race ('rallyBoss+' a notch faster, e.g. for the last lap)
//    rallyShop  the garage: the shop and the standings
//    rallyWin   the podium, a short loop
//  The race tune follows the track: Music.want('rally') during a race plays rally, rally2 or rally3, by the track's
//  place in RALLY_TRACKS (the track is noted when Game.rallyStartRace is called); rallyRaceSong(track) says which.
//  Formats: music.js (chiptune), rock.js and synthwave.js explain theirs. Rock and synthwave parts borrow the
//  chiptune melodies ('@rally') so a tune is the same tune in every style.
// =====================================================================

const RM = (...bars) => bars.join('');

// ------------------------------------------------------------------ chiptune
Object.assign(GROOVES, {
  boogie: { drums: 'k.h.s.h.k.hks.h.', bass: 'r.t.f.s.o.s.f.t.' },   // a walking boogie bass under a shuffle
  piston: { drums: 'k.h.s.hkk.h.s.hh', bass: 'r.r.r.r.r.r.o.r.' },   // straight 8ths, flat out
  highway: { drums: 'k.hhs.h.k.hhs.hk', bass: 'r.r.f.r.o.r.f.s.' },
  stompy: { drums: 'k..ks...k..ks.s.', bass: 'r..r....r..rf.o.' },   // the final: heavy and slow-footed
  spy: { drums: 'k..hs.h.k..hs.hh', bass: 'r..r..f.o.s.f.t.' },      // the garage: a sly walking line
  podium: { drums: 'k...s.h.k.k.s.hh', bass: 'r-o-f-o-r-o-f-o-' },
});

Object.assign(SONGS, {
  // a fast 12-bar boogie in E: a shout up high, answered lower down, a turnaround on V
  rally: { name: 'GRAVEL BOOGIE', root: 64, bpm: 164, groove: 'boogie', swing: 0.64, prog: [0, 0, 0, 0, 3, 3, 0, 0, 4, 3, 0, 4],
    mel: RM('7---7-6-7-9-7---', '6-4-6-4-2---0---', '7---7-6-7-9-A---', '9-7-6-7-9-------',
      'A---A-9-A-C-A---', '9-7-9-7-5---3---', '7---7-6-7-9-7---', '6-4-2-0-z-0-----',
      '8-8-8-8-9-8-6-4-', '7-7-7-7-8-7-5-3-', '4-6-7-6-4-2-0-2-', '4---2---1---z---') },
  // straight-8th hard rock in A: syncopated stabs over i - bVI - bVII - i
  rally2: { name: 'PISTON HEAD', root: 57, bpm: 156, groove: 'piston', prog: [0, 5, 6, 0],
    mel: RM('7..7..6.7---4-5-', '5..5..4.5---2-3-', '6..6..5.6---8-9-', '7-------..4-6-7.') },
  // a road song in G: I - bVII - IV - I, then up to V
  rally3: { name: 'RED DUST HIGHWAY', root: 67, bpm: 144, groove: 'highway', prog: [0, 6, 3, 0, 0, 6, 3, 4],
    mel: RM('0-2-4---4-5-4-2-', '6---6-5-4-------', '3-4-5---5-4-3-2-', '4-----------2-0-',
      '7-7-7-6-7---9-7-', '6-6-6-5-6---8-6-', '5---4---3---5---', '4-------6---z---') },
  // the final: a big slow chant over a stomp
  rallyBoss: { name: 'THE FINAL FLAG', root: 64, bpm: 138, groove: 'stompy', prog: [0, 0, 5, 4, 0, 0, 3, 4],
    mel: RM('0---0---4---3-2-', '3---4---7-------', '8---7---5---7---', '6-------4-------',
      '7---7---9---7-6-', '7---9---A-------', 'A---9---7---5---', '6---5---4---z---') },
  // the garage: a spy-film line in C minor (its leading note raised), sly and sparse; the same mood at every skill
  rallyShop: { name: 'BACKROOM DEALS', root: 60, bpm: 126, groove: 'spy', prog: [0, 0, 3, 0, 5, 4, 0, 0], scale: [0, 2, 3, 5, 7, 8, 11],
    mel: RM('4...4.5.4...2.3.', '4.......z...0...', '3...3.4.3...1.2.', '4.......6-5-4---',
      '5...5.6.7...9...', '6...4...6...8-7-', '7.6.5.4.3.2.1.z.', '0-------........') },
  // the podium: a fanfare in G major, round and round
  rallyWin: { name: 'CHECKERED GLORY', root: 67, bpm: 148, groove: 'podium', prog: [0, 3, 4, 0], scale: [0, 2, 4, 5, 7, 9, 11],
    mel: RM('7---7-9-B---9-7-', 'A---A-9-A---C---', 'B---B-A-B---8---', 'B---9---7-------') },
});

// ------------------------------------------------------------------ rock
Object.assign(ROCK_DRUMS, {
  boogie: 'K..hS..hK.KhS.hh',   // a shuffle with a push into the backbeat
  stomp: 'K..KS...K.K.S..h',
});
Object.assign(ROCK_SONGS, {
  // palm-muted boogie (root, fifth, sixth, fifth: the old rock'n'roll comp) under the 12-bar tune; a stop-time chorus
  rally: { name: 'HOT TREAD BOOGIE', root: 40, bpm: 164, scale: 'mixo', swing: 0.64, form: 'IVCVSV', parts: {
    I: { ch: [0, 0, 0, 0], riff: '0.0.4.4.5.5.4.4.', dr: 'boogie' },
    V: { lead: '@rally', riff: '0.0.4.4.5.5.4.4.', dr: 'boogie' },
    C: { ch: [3, 3, 0, 0, 4, 3, 0, 4], riff: 'X-----x.X-----x.', dr: 'rock', harm: 2,
      lead: RM('A---A-9-A---8-7-', '8---7---5---3---', '7---7-6-7---9-7-', '6---4---2---0---',
        'B---A---9---8---', 'A---9---8---7---', '7-6-4-6-7-9-7---', '8-------6---4---') },
    S: { ch: [0, 0, 0, 0, 3, 3, 0, 0, 4, 3, 0, 4], riff: 'X-x.x.X-x.x.X-x.', dr: 'boogie', solo: true } } },
  rally2: { name: 'PISTONS AND THUNDER', root: 45, bpm: 156, scale: 'minor', form: 'IVCVCSC', parts: {
    I: { ch: [0, 0, 5, 6], riff: 'P.p.pP.ppP.p3-2-', dr: 'drive' },
    V: { lead: '@rally2', riff: 'p.p.P.p.pp.pX---', dr: 'rock' },
    C: { ch: [5, 6, 3, 4], riff: 'X---X-x.X---X-x.', dr: 'double', harm: 2,
      lead: RM('9---8---7---5---', 'A---9---8---6---', '7---8---9---A---', 'B-----A-9---7---') },
    S: { ch: [0, 5, 6, 0], riff: 'pppppppppppppppp', dr: 'double', solo: true } } },
  rally3: { name: 'RED DUST HIGHWAY', root: 43, bpm: 144, scale: 'mixo', form: 'IVCVCSC', parts: {
    I: { ch: [0, 6, 3, 0], riff: 'X---x.x.X---x-x.', dr: 'drive', harm: 2,
      lead: RM('7---6-7-9---7---', '6---4-6-8---6---', '5---4-5-7---5---', '4-------2-------') },
    V: { lead: '@rally3', riff: 'X-x.0.0.X-x.0.2.', dr: 'rock' },
    C: { ch: [3, 0, 6, 4], riff: 'X-------X---X-x-', dr: 'rock', harm: 2,
      lead: RM('A---A-9-8---7---', '9---9-8-7---4---', '8---8-7-6---8---', '9-------B---9---') },
    S: { ch: [0, 6, 3, 0], riff: 'X-x.x.X-x.x.X-x.', dr: 'rock', solo: true } } },
  rallyBoss: { name: 'CHAMPION\'S STOMP', root: 40, bpm: 138, scale: 'harm', form: 'IVCVCBSC', parts: {
    I: { ch: [0, 0, 5, 4], riff: 'X-----X-X-----x.', dr: 'half' },
    V: { lead: '@rallyBoss', riff: 'P..pP..pP.p.X---', dr: 'stomp' },
    C: { ch: [3, 5, 4, 0], riff: 'X-------X---X---', dr: 'double', harm: 2,
      lead: RM('A-------9---7---', '8-------A---8---', '6---7---8---9---', '7---------------') },
    B: { ch: [0, 0, 0, 0], riff: 'X..X..X.p.p.X---', dr: 'half' },
    S: { ch: [0, 5, 3, 4], riff: 'p.ppp.ppp.ppp.pp', dr: 'double', solo: true } } },
  // the garage: a twangy walking line on single notes (root, root, fifth, the raised seventh, octave ...), a ride beat
  rallyShop: { name: 'BACKROOM DEALS', root: 40, bpm: 128, scale: 'harm', form: 'IVCV', parts: {
    I: { ch: [0, 0, 0, 0], riff: '0..0..4.6.7.6.4.', dr: 'ride' },
    V: { lead: '@rallyShop', riff: '0..0..4.6.7.6.4.', dr: 'ride' },
    C: { ch: [5, 5, 4, 4, 0, 3, 4, 0], riff: 'X-----x.X-----..', dr: 'rock', harm: 2,
      lead: RM('9-----8-7-------', '8...7...5-------', '8-----7-6-------', '6...4...2-------',
        '4-5-6-7-8---7---', '5---7---8---A---', '9---8---6---4---', '7---------------') } } },
  rallyWin: { name: 'CHECKERED GLORY', root: 43, bpm: 148, scale: 'major', form: 'IC', parts: {
    I: { lead: '@rallyWin', riff: 'X---X-x-X---X-x-', dr: 'rock', harm: 2 },
    C: { ch: [3, 4, 0, 0], riff: 'X-x.x.X-x.x.X---', dr: 'rock', harm: 2,
      lead: RM('A---9---A---C---', 'B---A---B---8---', '7-9-B-9-7-9-B---', '9-A-B-C-B-------') } } },
});
// ------------------------------------------------------------------ synthwave
Object.assign(SYNTH_SONGS, {
  // the boogie in neon: a shuffling octave bass, the blues' V made major ('4^')
  rally: { name: 'NEON BOOGIE', root: 40, bpm: 150, scale: 'mixo', swing: 0.6, sev: 1, form: 'IVCVLV', parts: {
    I: { ch: [0, 0, 0, 0], arp: '0123', bs: 'r.o.', dr: 'kicks', f: [600, 2400], rise: 1 },
    V: { lead: '@rally', ch: [0, 0, 0, 0, 3, 3, 0, 0, '4^', 3, 0, '4^'], bs: 'r.f.o.f.', arp: '0123', dr: 'drive', f: 2400 },
    C: { ch: [3, 3, 0, 0, '4^', 3, 0, '4^'], bs: 'ro', arp: '0123', dr: 'four', f: 2800,
      lead: RM('A---A-9-A---8-7-', '8---7---5---3---', '7---7-6-7---9-7-', '6---4---2---0---',
        'B---A---9---8---', 'A---9---8---7---', '7-6-4-6-7-9-7---', '8-------6---4---') },
    L: { ch: [0, 0, 0, 0, 3, 3, 0, 0, '4^', 3, 0, '4^'], bs: 'ro', arp: '0123', dr: 'four', solo: 1 } } },
  rally2: { name: 'CHROME PISTONS', root: 45, bpm: 132, scale: 'minor', dirt: 1, pump: 0.3, form: 'IVCVCLC', parts: {
    I: { ch: [0, 0, 5, 6], pad: 'S.S..S..S.S..S..', bs: 'rrorrror', dr: 'kicks', f: [500, 1800], rise: 1 },
    V: { lead: '@rally2', bs: 'rrorrror', arp: '0102', dr: 'push', f: 2000 },
    C: { ch: [5, 6, 3, '4^'], bs: 'ro', arp: '0123', dr: 'four', f: 2800,
      lead: RM('9---8---7---5---', 'A---9---8---6---', '7---8---9---A---', 'B-----A-9---7---') },
    L: { ch: [0, 5, 6, 0], bs: 'ro', arp: '0123', dr: 'four', solo: 1 } } },
  rally3: { name: 'DUSK HIGHWAY', root: 43, bpm: 124, scale: 'mixo', sev: 1, form: 'IVCVCBC', parts: {
    I: { ch: [0, 6, 3, 0], arp: '0123', ao: 1, bs: 'r.o.', dr: 'kicks', f: [700, 2600], rise: 1,
      lead: RM('7---6-7-9---7---', '6---4-6-8---6---', '5---4-5-7---5---', '4-------2-------') },
    V: { lead: '@rally3', ch: [0, 6, 3, 0, 0, 6, 3, '4^'], bs: 'ro', dr: 'drive' },
    C: { ch: [3, 0, 6, '4^'], bs: 'ro', arp: '0123', dr: 'four', f: 3000,
      lead: RM('A---A-9-8---7---', '9---9-8-7---4---', '8---8-7-6---8---', '9-------B---9---') },
    B: { ch: [3, 0, 6, 6], bs: 'r---------------', f: 1100, rise: 1,
      bell: RM('A-------9-------', '7-------4-------', '6---8---A---8---', '9---------------') } } },
  rallyBoss: { name: 'FINAL LAP PROTOCOL', root: 40, bpm: 120, scale: 'harm', dirt: 1, pump: 0.25, f: 1500, form: 'IVCVCBC', parts: {
    I: { ch: [0, 0, 5, 4], pad: 'S..S..S.S.......', bs: 'R..R..R.R...R.R.', dr: 'halfd', f: 1000, rise: 1 },
    V: { lead: '@rallyBoss', bs: 'rrorrror', dr: 'push', f: 1800 },
    C: { ch: [3, 5, 4, 0], bs: 'ro', arp: '0123', dr: 'four', f: 2600, harm: 2,
      lead: RM('A-------9---7---', '8-------A---8---', '6---7---8---9---', '7---------------') },
    B: { ch: [0, 0, 0, 0], pad: 'S...S..S..S.S...', bs: 'R-------R--R-R--', dr: 'halfd', f: 900,
      bell: RM('7-------8-------', '7---6---4-------') } } },
  rallyShop: { name: 'MIDNIGHT GARAGE', root: 40, bpm: 108, scale: 'harm', sq: 1, pump: 0.3, f: 1400, form: 'IVCV', parts: {
    I: { ch: [0, 0, 0, 0], bs: 'r..r..f.o.f.r...', dr: 'hats', f: [500, 1200], bell: RM('7-------6-------', '4-------........') },
    V: { lead: '@rallyShop', bs: 'r..r..f.o.f.r...', arp: '0.2.1.3.', dr: 'beat' },
    C: { ch: [5, 5, 4, 4, 0, 3, 4, 0], bs: 'r.o.', arp: '0123', dr: 'four', f: 2000,
      lead: RM('9-----8-7-------', '8...7...5-------', '8-----7-6-------', '6...4...2-------',
        '4-5-6-7-8---7---', '5---7---8---A---', '9---8---6---4---', '7---------------') } } },
  rallyWin: { name: 'NEON PODIUM', root: 43, bpm: 124, scale: 'major', sev: 1, form: 'IC', parts: {
    I: { lead: '@rallyWin', bs: 'r.o.', arp: '0123', dr: 'four', f: 2600 },
    C: { lead: '@rallyWin', harm: 2, bs: 'ro', arp: '0123', dr: 'four', f: 3000 } } },
});

// ------------------------------------------------------------------ which race tune a track gets
const RALLY_RACE_SONGS = ['rally', 'rally2', 'rally3'];
let rallyMusicTrack = null;   // the track of the race being run (noted when it starts)

// the race tune for a track (a key, or a RALLY_TRACKS entry): by its place in the list, else by its name
function rallyRaceSong(track) {
  const key = track && typeof track === 'object' ? track.key : track;
  if (!key) return 'rally';
  let i = typeof RALLY_TRACKS !== 'undefined' ? RALLY_TRACKS.findIndex(tr => tr.key === key) : -1;
  if (i < 0) { i = 0; for (const ch of String(key)) i = (i * 31 + ch.charCodeAt(0)) >>> 0; }
  return RALLY_RACE_SONGS[i % RALLY_RACE_SONGS.length];
}

{
  // note the track whenever a race starts (Game.rallyStartRace may be set, or replaced, after this file runs)
  const watchStart = () => {
    const G = typeof Game !== 'undefined' ? Game : null, f = G && G.rallyStartRace;
    if (!f || f.rallyMusic) return;
    G.rallyStartRace = function (opts) {
      rallyMusicTrack = opts && opts.track;
      return f.apply(this, arguments);
    };
    G.rallyStartRace.rallyMusic = true;
  };
  watchStart();
  // during a race 'rally' plays the track's own tune ('rally+' its fast version)
  const _want = Music.want;
  Music.want = function (mode, skill, paused) {
    watchStart();
    if (mode && mode.replace('+', '') === 'rally' && typeof Game !== 'undefined' && Game.state === 'play' && rallyMusicTrack)
      mode = rallyRaceSong(rallyMusicTrack) + (mode.endsWith('+') ? '+' : '');
    return _want.call(this, mode, skill, paused);
  };
}
