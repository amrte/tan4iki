'use strict';
// =====================================================================
//  KILL RACE: the champion's page, after the match's last round result (race.js, race2.js). Fireworks and confetti,
//  CHAMPION! in big gold letters, the winner's tank (big, with the crown) on the top step of a podium and the next two
//  beside it, each with their points; the victory tune. Enter (after a moment) goes back to the title. Online the
//  guests see it too (net.js sends the result with it). Everything on it is drawn from the time alone, so a guest
//  draws the same fireworks without being told.
// =====================================================================

const RACE_CHAMP_COLS = ['#F0BC3C', '#F83800', '#F8F8F8', '#3CBCFC', '#B8F818', '#F878F8'];

// a fixed pseudo-random number in [0, 1) for (a, b)
const raceHash = (a, b = 0) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };

function raceDrawChamp(ctx, r, t) {
  ctx.fillStyle = COL.black;
  ctx.fillRect(0, 0, SW, SH);
  // fireworks: bursts going up in turn across the sky
  for (let k = 0; k < 6; k++) {
    const per = 80, age = (t + k * 29) % per, n = Math.floor((t + k * 29) / per);
    const bx = 24 + raceHash(k, n) * (SW - 48), by = 20 + raceHash(n, k) * 70, col = RACE_CHAMP_COLS[(k + n) % RACE_CHAMP_COLS.length];
    if (age < 14) { ctx.fillStyle = '#F8D878'; ctx.fillRect(Math.round(bx), Math.round(by + (14 - age) * 5), 1, 3); continue; }   // the rocket going up
    const a2 = age - 14, rad = Math.min(30, a2 * 1.1), fall = a2 * a2 * 0.006;
    if (a2 > 52 && (a2 & 1)) continue;   // flickering out
    ctx.fillStyle = col;
    for (let i = 0; i < 18; i++) {
      const ang = i / 18 * Math.PI * 2;
      ctx.fillRect(Math.round(bx + Math.cos(ang) * rad), Math.round(by + Math.sin(ang) * rad + fall), 2, 2);
    }
  }
  // confetti
  for (let i = 0; i < 46; i++) {
    const x = (raceHash(i, 1) * SW + Math.sin(t / 22 + i) * 6 + SW) % SW, y = (raceHash(i, 2) * SH + t * (0.4 + raceHash(i, 3) * 0.6)) % SH;
    ctx.fillStyle = RACE_CHAMP_COLS[i % RACE_CHAMP_COLS.length];
    if ((t + i * 3) % 16 < 8) ctx.fillRect(Math.round(x), Math.round(y), 2, 1); else ctx.fillRect(Math.round(x), Math.round(y), 1, 2);
  }
  const rows = r.rows.slice().sort((a, b) => b.wins - a.wins || b.kills - a.kills);
  const win = rows.find(w => w.i === r.winner) || rows[0];
  // the words
  Font.drawCenter(ctx, 'KILL RACE', SW / 2, 12, COL.red);
  ctx.save(); ctx.scale(2, 2);
  Font.drawCenter(ctx, 'CHAMPION!', SW / 4, 12, (t >> 3) & 1 ? COL.gold : '#F8D878');
  ctx.restore();
  Font.drawCenter(ctx, playerName(win), SW / 2, 46, COL.white);
  const human = r.rows.some(w => !w.bot);
  Font.drawCenter(ctx, win.bot && human ? 'BETTER LUCK NEXT TIME!' : 'CONGRATULATIONS!', SW / 2, 58, COL.lgrey);
  // the podium: 2nd, 1st, 3rd
  const base = 176, steps = [{ x: 72, h: 24, k: 1, s: 2 }, { x: 128, h: 36, k: 0, s: 3 }, { x: 184, h: 16, k: 2, s: 2 }];
  for (const st of steps) {
    const row = rows[st.k];
    if (!row) continue;
    const top = base - st.h;
    ctx.fillStyle = '#7C7C7C'; ctx.fillRect(st.x - 24, top, 48, st.h);
    ctx.fillStyle = '#BCBCBC'; ctx.fillRect(st.x - 24, top, 48, 2);
    ctx.fillStyle = '#3C3C3C'; ctx.fillRect(st.x - 24, base - 1, 48, 1);
    Font.drawCenter(ctx, String(st.k + 1), st.x, top + 4, st.k === 0 ? COL.gold : COL.white);
    if (st.h >= 24) Font.drawCenter(ctx, row.wins + (row.wins === 1 ? ' PT' : ' PTS'), st.x, top + 14, COL.black);
    // the tank, big, its treads rolling
    const size = 16 * st.s, img = Sprites.tank('p' + (st.k === 0 ? 3 : 1), (t >> 3) & 1, 0, Config.playerPal(row.i));
    const tx = Math.round(st.x - size / 2), ty = top - size + (st.k === 0 && ((t >> 4) & 1) ? -1 : 0);
    ctx.drawImage(img, tx, ty, size, size);
    if (st.k === 0) {   // the crown, twice the size
      ctx.save(); ctx.translate(st.x - 8, ty - 13); ctx.scale(2, 2); raceDrawCrown(ctx, 0, 0, t); ctx.restore();
    } else Font.drawCenter(ctx, playerName(row), st.x, ty - 10, COL.white);
  }
  Font.drawCenter(ctx, 'FIRST TO ' + r.target + (r.target === 1 ? ' POINT' : ' POINTS') + '  ' + r.round + (r.round === 1 ? ' ROUND' : ' ROUNDS'), SW / 2, 186, COL.lgrey);
  if (t > 120 && (t >> 4) & 1) Font.drawCenter(ctx, 'PRESS ENTER', SW / 2, 204, COL.white);
}

(() => {
  const G = Game;
  // the last round's result: then the champion's page, not the title
  const vsUpd = G.updateVsResult;
  G.updateVsResult = function () {
    const r = this.vsRes;
    if (this.mode === 'race' && r && r.final && r.winner >= 0 && this.t >= 30 && (Input.menu().ok || this.t > 600)) {
      if (!Net.role) this.dropSave('race');
      this.stage = null;
      this.setState('raceChamp');
      Sound.play('bonus');
      return;
    }
    return vsUpd.apply(this, arguments);
  };
  const update = G.update;
  G.update = function () {
    if (this.state !== 'raceChamp' || Net.role === 'client') return update.apply(this, arguments);
    this.t++;
    if ((this.t > 60 && Input.menu().ok) || this.t > 60 * 40) { Sound.play('select'); this.toTitle(); this.titleY = 0; }
  };
  const renderState = G.renderState;
  G.renderState = function (ctx) { return this.state === 'raceChamp' ? raceDrawChamp(ctx, this.vsRes, this.t) : renderState.apply(this, arguments); };
  const musicFrame = G.musicFrame;
  G.musicFrame = function () { if (this.state === 'raceChamp') { Music.want('victory', Music.skillLevel(), false); return; } return musicFrame.apply(this, arguments); };
})();
