'use strict';
// =====================================================================
//  Mode title screens: when a game starts, its mode shows a pixel-art picture of its own before the first stage,
//  with the mode's name, what it is about, and the tune that goes with it (music.js plays it, in the version for
//  your skill). Enter or fire moves on, Escape goes back to the title, and after a few seconds it moves on by itself.
//  Not shown for the daily challenge or when testing a level from the editor. Settings -> GAME -> MODE TITLE SCREENS.
//  The pictures (introart.js) are 240x136, a pixel to a pixel; a screen big enough shows them at 2x, 3x ...
// =====================================================================

// INTRO_*: the boss pictures' size and place (bossart.js: 112x64 at double size); MODE_PIC_*: the mode pictures'
const INTRO_W = 112, INTRO_H = 64, INTRO_X = 16, INTRO_Y = 38, INTRO_TIME = 480, MUSIC_DELAY = 150;
const MODE_PIC_W = 240, MODE_PIC_H = 136;

// little drawing helpers (in a picture's own pixels)
const Pix = {
  rect(c, x, y, w, h, col) { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), w, h); },
  // a filled circle, row by row
  disc(c, cx, cy, r, col) {
    c.fillStyle = col;
    for (let dy = -r; dy <= r; dy++) {
      const w = Math.floor(Math.sqrt(r * r - dy * dy) + 0.3);
      c.fillRect(cx - w, cy + dy, 2 * w + 1, 1);
    }
  },
  line(c, x0, y0, x1, y1, col, w = 1) {
    c.fillStyle = col;
    const n = Math.max(1, Math.abs(x1 - x0), Math.abs(y1 - y0));
    for (let k = 0; k <= n; k++) c.fillRect(Math.round(x0 + (x1 - x0) * k / n), Math.round(y0 + (y1 - y0) * k / n), w, w);
  },
  // a texture (8x8) tiled over a rectangle
  tiles(c, tex, x, y, w, h) {
    for (let yy = 0; yy < h; yy += 8) for (let xx = 0; xx < w; xx += 8) {
      const tw = Math.min(8, w - xx), th = Math.min(8, h - yy);
      c.drawImage(tex, 0, 0, tw, th, x + xx, y + yy, tw, th);
    }
  },
  spr(c, img, x, y, flip) {
    if (!flip) { c.drawImage(img, Math.round(x), Math.round(y)); return; }
    c.save(); c.translate(Math.round(x) + img.width, Math.round(y)); c.scale(-1, 1); c.drawImage(img, 0, 0); c.restore();
  },
  // horizontal colour bands with a dithered seam between them (an NES sky)
  bands(c, y, h, cols, w = INTRO_W) {
    const bh = h / cols.length;
    cols.forEach((col, i) => {
      Pix.rect(c, 0, y + Math.round(i * bh), w, Math.ceil(bh), col);
      if (i) { c.fillStyle = cols[i - 1]; for (let x = i % 2; x < w; x += 2) c.fillRect(x, y + Math.round(i * bh), 1, 1); }
    });
  },
  stars(c, n, seed, t, h, w = INTRO_W) {
    const r = seeded(seed);
    for (let k = 0; k < n; k++) {
      const x = Math.floor(r() * w), y = Math.floor(r() * h), ph = Math.floor(r() * 64);
      if ((t + ph) % 64 < 6) continue;
      Pix.rect(c, x, y, 1, 1, (t + ph) % 64 < 12 ? '#7C7C7C' : '#F8F8F8');
    }
  },
  // a pixel grid ('.' empty, other characters looked up in pal)
  grid(c, rows, x, y, pal, s = 1) {
    rows.forEach((row, j) => { for (let i = 0; i < row.length; i++) if (pal[row[i]]) Pix.rect(c, x + i * s, y + j * s, s, s, pal[row[i]]); });
  },
  boom(c, x, y, f) {
    const e = f < 4 ? Sprites.smallExp[Math.min(Sprites.smallExp.length - 1, f)] : Sprites.bigExp[Math.min(Sprites.bigExp.length - 1, (f - 4) >> 1)];
    c.drawImage(e, Math.round(x + 8 - e.width / 2), Math.round(y + 8 - e.height / 2));
  },
};

// one picture per mode (introart.js; GALAXY's too): draw(c, t) on the 240x136 canvas, t = frames since the screen opened
const INTRO_SCENES = {};

// where things go on a mode's title screen, in whole-screen pixels: the picture at the biggest whole scale that
// fits with the name above it and five lines of words below, all of it centred
// (head: room for the name above the frame, s: the name's brick size)
function introLayout() {
  const k = Math.max(1, Math.min(Math.floor((SCREEN_W - 16) / MODE_PIC_W), Math.floor((SCREEN_H - 80) / (MODE_PIC_H + 8))));
  const head = 24 + 8 * k, w = MODE_PIC_W * k, h = MODE_PIC_H * k, top = Math.max(0, (SCREEN_H - h - head - 56) >> 1), y = top + head;
  return { k, w, h, x: (SCREEN_W - w) >> 1, y, top, head, s: 2 + k, cx: SCREEN_W >> 1, ty: y + h + 8 };
}

Object.assign(Game, {
  // newGame: the mode's title screen, then the curtain it would have shown
  introWanted(custom) {
    return Config.on('modeIntro') && !custom && !this.daily && Net.role !== 'client' && !!INTRO_SCENES[this.mode];
  },

  toModeIntro() {
    this.introNext = this.curtain;
    this.setState('modeIntro');
  },

  updateModeIntro() {
    const m = Input.menu();
    if (m.back) { this.toTitle(); return; }
    if (this.t >= INTRO_TIME || (this.t > 20 && m.ok)) {
      if (m.ok) Sound.play('select');
      this.curtain = Object.assign(this.introNext || { selectable: false }, { h: SCREEN_H / 2, phase: 'show' });
      this.setState('curtain');
    }
  },

  renderModeIntro(ctx) {
    const mode = this.mode, info = modeInfo(mode), t = this.t, L = introLayout();
    if (!this.introCanvas) this.introCanvas = makeCanvas(MODE_PIC_W, MODE_PIC_H);
    const pc = this.introCanvas, c = pc.getContext('2d');
    c.save();
    c.imageSmoothingEnabled = false;
    (INTRO_SCENES[mode] || INTRO_SCENES.classic)(c, t);
    c.restore();
    // the whole screen (not the menus' 256x224 frame), so a big screen gets a big picture
    ctx.save();
    ctx.translate(-menuOX(), -menuOY());
    ctx.fillStyle = COL.black;
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
    // the name, in bricks, as big as fits
    const name = info.name;
    let s = L.s;
    while (s > 1 && Font.bigWidth(name, s) > SCREEN_W - 16) s--;
    Font.big(ctx, name, (SCREEN_W - Font.bigWidth(name, s)) >> 1, L.top + ((L.head - 4 - 7 * s) >> 1), s, Sprites.bricks(ctx));
    // the picture in a double frame
    ctx.fillStyle = '#F8F8F8'; ctx.fillRect(L.x - 4, L.y - 4, L.w + 8, L.h + 8);
    ctx.fillStyle = COL.black; ctx.fillRect(L.x - 3, L.y - 3, L.w + 6, L.h + 6);
    ctx.fillStyle = '#7C7C7C'; ctx.fillRect(L.x - 2, L.y - 2, L.w + 4, L.h + 4);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(pc, L.x, L.y, L.w, L.h);
    // fade in, NES style (in steps)
    if (t < 16) { ctx.fillStyle = 'rgba(0,0,0,' + [0.75, 0.5, 0.25, 0][t >> 2] + ')'; ctx.fillRect(L.x, L.y, L.w, L.h); }
    const y = L.ty;
    Font.drawCenter(ctx, info.desc, L.cx, y, '#F8F8F8');
    const lv = Music.skillLevel();
    Font.drawCenter(ctx, 'MUSIC: ' + musicName(mode), L.cx, y + 11, SKILL_TAGS[lv][1]);
    if ((t >> 4) & 1 || t < 20) Font.drawCenter(ctx, 'PRESS ENTER', L.cx, y + 23, COL.red);
    ctx.restore();
  },

  // what should be playing right now (every frame, also for online guests): the mode's tune on its title screen
  // and during a stage (once the start jingle is over), nothing anywhere else
  musicFrame() {
    const st = this.stage, s = this.state;
    let mode = null;
    if (s === 'modeIntro') mode = this.mode;
    else if (s === 'bossIntro') mode = 'bossWarn';   // a boss's picture (bossart.js)
    else if (st && st.bossDefeated && (s === 'play' || s === 'score' || s === 'bossOutro')) mode = BOSSES[st.bossIdx] && ['ufo', 'galya'].includes(BOSSES[st.bossIdx].kind) ? 'ending' : 'victory';   // a boss beaten: celebrate
    else if (s === 'play' && st && !st.over && st.frame > MUSIC_DELAY) {
      mode = this.mode;
      // a boss stage: the boss's own theme, faster in its last phase
      const b = st.bossIdx !== undefined && st.mainBoss && st.mainBoss();
      if (b && BOSS_SONGS[b.kind]) mode = BOSS_SONGS[b.kind] + (b.phase === 3 ? '+' : '');
      if (st.galaxy) {   // galaxy.js: sectors 7 on have their own tunes; a sector may name its own (galaxy3.js)
        const sec = GX_SECTORS[st.galaxy.sec] || {}, later = st.galaxy.sec >= 6 ? '2' : '';
        mode = st.galaxy.boss ? (sec.bossSong || 'galaxyBoss' + later) + (st.galaxy.boss.ph === 3 ? '+' : '') : sec.song || 'galaxy' + later;
      }
    }
    // paused: the music pauses too, except while you're setting its volume in the pause menu (so you can hear it)
    const tuning = s === 'play' && this.paused && ['MUSIC', 'MUSIC VOL'].includes(pauseMenu()[this.pauseIdx]);
    Music.want(mode, Music.skillLevel(), s === 'play' && this.paused && !tuning);
  },
});
