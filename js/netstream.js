'use strict';
// =====================================================================
//  ONLINE for the modes that draw themselves (TANK RALLY, ASTRO TANKS, DESERT DOMINION): instead of sending the
//  game's state for the guest to draw (as the tank modes do, net.js), the host sends its screen. Every third frame
//  the host's canvas goes out as a small WebP picture over the data channel (only one in the works at a time, and a
//  guest that's falling behind gets fewer); the guest shows the latest one, hears the host's sounds and music, and
//  its keys drive its player on the host as always (Input.remote). Loaded after the modes so its wrappers are the
//  outermost.
// =====================================================================

const NET_STREAM_MODES = new Set(['rally', 'astro', 'rts']);
const NET_STREAM_EVERY = 3;            // frames between pictures (20 a second)
const NET_STREAM_QUALITY = 0.72;

const NetStream = {
  busy: false, n: 0,
  img: null, decoding: false, pending: null, size: [0, 0],
  // the host is in one of those modes (past the title)
  on() {
    return Net.role === 'host' && Net.inGame && NET_STREAM_MODES.has(Game.mode) && Game.state !== 'title';
  },
  // host: the next picture, when it's time and the last one's gone
  send() {
    if (this.busy || ++this.n % NET_STREAM_EVERY) return;
    const open = Net.openPeers().filter(p => p.ch.bufferedAmount < 4e5);
    if (!open.length) return;
    const cv = document.getElementById('screen');
    if (!cv || !cv.toBlob) return;
    this.busy = true;
    cv.toBlob(b => {
      this.busy = false;
      if (!b) return;
      b.arrayBuffer().then(buf => {
        for (const p of Net.openPeers()) {
          if (p.ch.bufferedAmount > 6e5) continue;   // a slow guest skips pictures instead of lagging behind
          try { p.ch.send(buf); } catch (e) { /* closing */ }
        }
      });
    }, 'image/webp', NET_STREAM_QUALITY);
  },
  // guest: a picture arrived (decode the newest; drop any that came in meanwhile but the last)
  got(buf) {
    if (this.decoding) { this.pending = buf; return; }
    this.decoding = true;
    createImageBitmap(new Blob([buf], { type: 'image/webp' })).then(bm => {
      if (this.img && this.img.close) this.img.close();
      this.img = bm;
    }).catch(() => {}).finally(() => {
      this.decoding = false;
      if (this.pending) { const b = this.pending; this.pending = null; this.got(b); }
    });
  },
};

(() => {
  // the host: the music it's playing (whatever chose it), for the guests to play too
  const want = Music.want;
  Music.want = function (mode, skill, paused) { this.lastWant = [mode || null, skill, !!paused]; return want.apply(this, arguments); };

  // the host: pictures instead of the stage for these modes; sounds in every state of them
  const hostTick = Net.hostTick;
  Net.hostTick = function () {
    hostTick.apply(this, arguments);
    if (NetStream.on()) NetStream.send();
  };
  const buildView = Net.buildView;
  Net.buildView = function (full) {
    if (!NetStream.on()) return buildView.apply(this, arguments);
    const G = Game, cv = document.getElementById('screen');
    return {
      t: 'v', s: 'stream', gt: G.t, mode: G.mode, hi: G.hi, stn: G.stageNum,
      pl: G.players.map(p => ({ i: p.i, score: p.score, lives: p.lives, out: p.out })),
      snd: this.sndQueue.splice(0), mw: Music.lastWant || null, cw: cv ? cv.width : SCREEN_W, chh: cv ? cv.height : SCREEN_H,
    };
  };
  const play = Sound.play;
  Sound.play = function (name) {
    const r = play.apply(this, arguments);
    // net.js forwards the tank modes' sounds in their states; these modes' screens are all game
    if (NetStream.on() && !NET_SOUND_STATES.has(Game.state)) Net.sndQueue.push(name);
    return r;
  };

  // the guest: pictures come as binary messages
  const wireClient = Net.wireClient;
  Net.wireClient = function (ch) {
    ch.binaryType = 'arraybuffer';
    wireClient.apply(this, arguments);
    const onmessage = ch.onmessage;
    ch.onmessage = e => { if (e.data instanceof ArrayBuffer) NetStream.got(e.data); else onmessage(e); };
  };
  const applyView = Net.applyView;
  Net.applyView = function (v) {
    if (v.s !== 'stream') { if (Game.state === 'netstream') NetStream.img = null; return applyView.apply(this, arguments); }
    const G = Game;
    G.mode = v.mode; G.hi = v.hi; G.stageNum = v.stn; G.t = v.gt;
    G.players = v.pl.map((o, k) => Object.assign(G.players[k] && G.players[k].i === o.i ? G.players[k] : newPlayer(o.i), o, { tank: null }));
    G.stage = null;
    G.state = 'netstream';
    NetStream.size = [v.cw, v.chh];
    NetStream.mw = v.mw;
    for (const s of v.snd || []) Sound.play(s);
    Sound.setEngine(0);
  };

  // the guest's screen: the host's picture, the canvas the host's size
  const update = Game.update;
  Game.update = function () {
    if (this.state === 'netstream' && Net.role === 'client') {
      const [w, h] = NetStream.size;
      if (w && h && (SCREEN_W !== w || SCREEN_H !== h)) { SCREEN_W = w; SCREEN_H = h; }
    }
    return update.apply(this, arguments);
  };
  const renderState = Game.renderState;
  Game.renderState = function (ctx) {
    if (this.state !== 'netstream') return renderState.apply(this, arguments);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = COL.black; ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    if (NetStream.img) ctx.drawImage(NetStream.img, 0, 0, ctx.canvas.width, ctx.canvas.height);
    else Font.drawCenter(ctx, 'CONNECTING TO THE HOST...', ctx.canvas.width / 2, ctx.canvas.height / 2, COL.lgrey);
    ctx.restore();
  };
  const musicFrame = Game.musicFrame;
  Game.musicFrame = function () {
    if (this.state !== 'netstream') return musicFrame.apply(this, arguments);
    const w = NetStream.mw;
    Music.want(w ? w[0] : null, w ? w[1] : Music.skillLevel(), w ? w[2] : false);
  };
})();
