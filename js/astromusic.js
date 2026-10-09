'use strict';
// =====================================================================
//  ASTRO TANKS' soundtrack, in all three MUSIC STYLEs (chiptune: SONGS, rock: ROCK_SONGS, synthwave: SYNTH_SONGS),
//  and the heartbeat. Every tune here is written for this game (the mode is a tribute: no music from the original).
//    astro      the waves (1-4 and the odd blocks after): moody and driving, a low bass pulsing two notes apart
//               like the arcade heartbeat, a lonely ping of a lead over it
//    astro2     the later waves: faster, a falling sequence over pumping octaves
//    astroBoss  the mini bosses: heavy and slow, a flat second in a scale with a raised seventh ('astroBoss+'
//               a notch faster, e.g. for a boss's last phase; music.js does that for any key)
//    astroShop  the hangar between waves: a laid-back swung groove in D dorian that loops round and round
//  Formats: music.js (chiptune), rock.js and synthwave.js explain theirs. The rock and synthwave parts borrow the
//  chiptune melodies ('@astro') so a tune is the same tune in every style; each style names it its own way.
//  astroBeat(k): the heartbeat, k 0 or 1, the two low thumps that alternate (a sound effect, see the end).
// =====================================================================

const astroMusicBars = (...bars) => bars.join('');

// the choruses and breaks that the rock and synthwave versions share
const ASTRO_MUSIC = {
  // over VI VII i i VI VII iv v
  chorus: astroMusicBars('9.9.9---7-A-----', '8.8.8---6-A-----', '7.7.7---4-9---7-', 'B-------9.7.4---',
    '9.9.9---7-A-----', '8.8.8---A-C-----', 'A.A.A---9-7---5-', '6-----4-----z---'),
  // over VI VII i i: high, then falling back into the verse
  chorus2: astroMusicBars('C-B-A-9-C---A---', 'A-8-6-8-A---B---', '9-7-4-7-9-B-C-B-', '9-----7-----4---'),
  // over bVI bII i i
  chorusBoss: astroMusicBars('7--8--A-8---7---', '8--6--5-3---1---', '0--1--3-1---0---', '1-----0-----z---'),
  // over VII VII IV IV VII IV v i
  chorusShop: astroMusicBars('..8.A.8-6-......', '8-----6-5-------', '..7.9.7-5-......', '7-----5-3-------',
    '..8.A.C-A-8-....', '7-------5-3-----', '4.6.8-..6.4.2-..', '2---1---0-------'),
};

// ------------------------------------------------------------------ chiptune
Object.assign(GROOVES, {
  astroPulse: { drums: 'k..h.hk.s..h.hk.', bass: 'r.r.r.r.t.t.t.t.' },    // two low notes, back and forth: the heartbeat
  astroRush: { drums: 'k.hks.hkk.hks.hk', bass: 'r.ror.ror.ror.ro' },     // pumping octaves, kicks pushing
  astroTitan: { drums: 'k..k..s.kk....s.', bass: 'r-.r-.r.r-.r-.o.' },    // heavy-footed
  astroHangar: { drums: 'k...h.h.s.h.k.h.', bass: 'r--.r.f.o--.f.t.' },   // lazy, swung
});

Object.assign(SONGS, {
  // A minor-ish (the skill sets the mode): a ping up high, answered lower, over i i VI iv / i i VI v
  astro: { name: 'COLD ORBIT', root: 57, bpm: 126, groove: 'astroPulse', prog: [0, 0, 5, 3, 0, 0, 5, 4],
    mel: astroMusicBars('7-------7.4.7.9.', '8-------7---4---', '5-------5.3.5.7.', '6-5-3---....5.6.',
      '7-------7.4.7.9.', 'A---9---7-4-----', '8-7-5-----4-5---', '4-----------....') },
  // B: a motif stepping down through i VI VII i, then i VI iv v climbing back up
  astro2: { name: 'METEOR STORM', root: 59, bpm: 152, groove: 'astroRush', prog: [0, 5, 6, 0, 0, 5, 3, 4],
    mel: astroMusicBars('7.7.9.7-4-2-4---', '5.5.7.5-2-0-2---', '6.6.8.6-3-1-3---', '4-2-0-2-4---7---',
      '7.7.9.7-4-2-4---', '5.5.7.5-2-0-2---', '3.3.5.3-0-z-0---', '4---6---8---7-6-') },
  // E, a flat second and a raised seventh whatever the skill: i i bII i, i i bVI V
  astroBoss: { name: 'TITAN OF THE VOID', root: 52, bpm: 120, groove: 'astroTitan', prog: [0, 0, 1, 0, 0, 0, 5, 4],
    scale: [0, 1, 3, 5, 7, 8, 11],
    mel: astroMusicBars('0-0-1-0-z---0---', '3--1--0---------', '1-1-3-1-0---1---', '0-------7---6---',
      '7-7-8-7-6---7---', 'A--8--7-----z---', '8-8-7-5-3---5---', '6-------4---z---') },
  // D dorian, the same easy mood at every skill: i IV i IV, bVII IV v i
  astroShop: { name: 'HANGAR BAY 9', root: 62, bpm: 104, groove: 'astroHangar', swing: 0.58, prog: [0, 3, 0, 3, 6, 3, 4, 0],
    scale: [0, 2, 3, 5, 7, 9, 10],
    mel: astroMusicBars('..4.5.7-....5.4.', '5-----3-....2...', '..4.5.7-....9.7.', '8-----7-5-------',
      '..6.8.A-....8.6.', '7-----5-3-------', '4.6.8...6...4.2.', '2---0-----------') },
});

// ------------------------------------------------------------------ rock
Object.assign(ROCK_DRUMS, {
  astroHeart: 'K.......K.....h.',   // the intro: a lone kick under the heartbeat riff
  astroStomp: 'KK..S..hKK..S.K.',
  astroLazy: 'K..r..S.K.r.r.S.',    // a ride, laid back (the song swings it)
});
Object.assign(ROCK_SONGS, {
  // palm-muted thumps a step apart (dum ... dah ...), then the band; twin leads in the chorus
  astro: { name: 'ORBITAL DEBRIS', root: 45, bpm: 126, scale: 'minor', form: 'IVCVCSC', parts: {
    I: { ch: [0, 0, 5, 3], riff: 'P...z...P...z...', dr: 'astroHeart' },
    V: { lead: '@astro', riff: 'P..pp.p.P..pp.X-', dr: 'rock' },
    C: { ch: [5, 6, 0, 0, 5, 6, 3, 4], riff: 'X---X---X---x.x.', dr: 'rock', harm: 2, lead: ASTRO_MUSIC.chorus },
    S: { ch: [0, 5, 6, 0], riff: 'pppppppppppppppp', dr: 'double', solo: true } } },
  astro2: { name: 'IMPACT VELOCITY', root: 47, bpm: 160, scale: 'minor', form: 'IVCVCBSC', parts: {
    I: { ch: [0, 0, 5, 6], riff: 'P.pP.pP.pP.pX-x-', dr: 'gallop' },
    V: { lead: '@astro2', riff: 'p.pPp.pPp.pPX---', dr: 'double' },
    C: { ch: [5, 6, 0, 0], riff: 'X---X---X-X-X---', dr: 'double', harm: 2, lead: ASTRO_MUSIC.chorus2 },
    B: { ch: [0, 0, 5, 6], riff: 'P...P..PP...X---', dr: 'half' },
    S: { ch: [0, 5, 6, 4], riff: 'pppppppppppppppp', dr: 'double', solo: true } } },
  astroBoss: { name: 'VOID TITAN', root: 40, bpm: 132, scale: 'phryg', form: 'IVCVBSC', parts: {
    I: { ch: [0, 0, 1, 0], riff: 'X-----X-----1-0-', dr: 'half' },
    V: { lead: '@astroBoss', riff: 'P..pP..p1.p.P...', dr: 'astroStomp' },
    C: { ch: [5, 1, 0, 0], riff: 'X-------X---X---', dr: 'double', harm: 2, lead: ASTRO_MUSIC.chorusBoss },
    B: { ch: [0, 0, 1, 0], riff: 'P.P.P...X-----..', dr: 'half' },
    S: { ch: [0, 1, 5, 0], riff: 'p.ppp.ppp.ppp.pp', dr: 'double', solo: true } } },
  // the hangar: single notes walking up and back on a swung ride
  astroShop: { name: 'GREASE AND STARLIGHT', root: 38, bpm: 104, scale: 'dorian', swing: 0.58, form: 'IVCV', parts: {
    I: { ch: [0, 3, 0, 3], riff: '0..2..4.0...2.4.', dr: 'astroLazy' },
    V: { lead: '@astroShop', riff: '0..2..4.0...2.4.', dr: 'astroLazy' },
    C: { ch: [6, 6, 3, 3, 6, 3, 4, 0], riff: 'X-----x.X-----..', dr: 'ride', harm: 2, lead: ASTRO_MUSIC.chorusShop } } },
});

// ------------------------------------------------------------------ synthwave
Object.assign(SYNTH_SONGS, {
  // darkwave under the stars: the heartbeat on the bass alone, then the arp and the ping
  astro: { name: 'ORBIT AT MIDNIGHT', root: 45, bpm: 112, scale: 'minor', sev: 1, form: 'IVCVCBC', parts: {
    I: { ch: [0, 0, 5, 3], bs: 'R...f...R...f...', arp: '0.1.2.1.', dr: 'kicks', f: [500, 2000], rise: 1 },
    V: { lead: '@astro', bs: 'r.r.r.r.f.f.f.f.', arp: '0123', dr: 'beat', f: 1800 },
    C: { ch: [5, 6, 0, 0, 5, 6, 3, 4], bs: 'ro', arp: '0123', dr: 'four', f: 2600, lead: ASTRO_MUSIC.chorus },
    B: { ch: [5, 6, 5, 6], bs: 'r---------------', f: 1000, rise: 1,
      bell: astroMusicBars('9-------7-------', '8-------A-------', '9---7-----5-----', '8---------------') } } },
  astro2: { name: 'STARFALL OVERDRIVE', root: 47, bpm: 136, scale: 'minor', dirt: 1, pump: 0.25, form: 'IVCVCLC', parts: {
    I: { ch: [0, 0, 5, 6], bs: 'rrorrror', arp: '0123', ao: 1, dr: 'kicks', f: [600, 2400], rise: 1 },
    V: { lead: '@astro2', bs: 'rrorrror', arp: '0102', dr: 'push', f: 2200 },
    C: { ch: [5, 6, 0, 0], bs: 'ro', arp: '0123', dr: 'four', f: 2800, lead: ASTRO_MUSIC.chorus2 },
    L: { ch: [0, 5, 6, 0], bs: 'ro', arp: '0123', dr: 'four', solo: 1 } } },
  astroBoss: { name: 'GRAVITY WELL', root: 40, bpm: 116, scale: 'phryg', dirt: 1, pump: 0.3, f: 1400, form: 'IVCVBC', parts: {
    I: { ch: [0, 0, 1, 0], pad: 'S.....S.....S.S.', bs: 'R-----R-----R-R-', dr: 'halfd', f: 1000, rise: 1 },
    V: { lead: '@astroBoss', bs: 'rrorrror', dr: 'push', f: 1800 },
    C: { ch: [5, 1, 0, 0], bs: 'ro', arp: '0123', dr: 'four', f: 2400, harm: 2, lead: ASTRO_MUSIC.chorusBoss },
    B: { ch: [0, 1, 0, 1], pad: 'S..S..S.........', bs: 'R---R---R-R-R---', dr: 'half', f: 900,
      bell: astroMusicBars('7-------8-------', 'A-----8-7---5---') } } },
  astroShop: { name: 'DOCKING LIGHTS', root: 50, bpm: 96, scale: 'dorian', swing: 0.56, sev: 1, sq: 1, att: 0.5, pump: 0.2, f: 1500, form: 'IVCV', parts: {
    I: { ch: [0, 3, 0, 3], bs: 'r-------r-------', arp: '0.2.1.3.', dr: 'hats', f: [500, 1400],
      bell: astroMusicBars('4-------5-------', '4-------2-------') },
    V: { lead: '@astroShop', bs: 'r..r..o.r..r..o.', arp: '0123', dr: 'beat', f: 1800 },
    C: { ch: [6, 6, 3, 3, 6, 3, 4, 0], bs: 'r.o.', arp: '0.2.1.3.', dr: 'beat', f: 2200, lead: ASTRO_MUSIC.chorusShop } } },
});

// ------------------------------------------------------------------ the heartbeat
// astroBeat(k): one of the two low thumps (k 0: the lower, 1: the higher) that alternate through a wave, faster as
// the rocks thin out (the engine times them). A sound effect: Sound.play('astroBeat0' / 'astroBeat1'), so it follows
// the game's volume and mute, and an online host's guests hear it too.
function astroBeat(k) { Sound.play(k ? 'astroBeat1' : 'astroBeat0'); }

{
  const play = Sound.play;
  Sound.play = function (name) {
    if ((name === 'astroBeat0' || name === 'astroBeat1') && Sound.ctx && !Sound.muted && Sound.master.gain.value > 0) {
      const S = Sound, t = S.ctx.currentTime + 0.005, hi = name === 'astroBeat1', n = hi ? 40 : 37;   // E2, C#2
      // the body: a triangle dropping in pitch; a square an octave up so small speakers hear it; a soft knock
      S.note(n, t, 0.16, { wave: 'tri', vol: 0.45, slideTo: S.midi(n) * 0.72, flat: true });
      S.note(n + 12, t, 0.07, { wave: 'p50', vol: 0.07, slideTo: S.midi(n + 12) * 0.6, decayTo: 0.1 });
      S.noise(700, t, [[0, 0.22], [0.03, 0.05], [0.06, 0]]);
    }
    return play.apply(this, arguments);
  };
}
