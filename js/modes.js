'use strict';
// =====================================================================
//  Game modes (picked on the title screen's MODE row)
//    CLASSIC      the game as always
//    SURVIVAL     100 waves on one map with no eagle; enemies from every edge hunt you (survival.js)
//    TIME ATTACK  clear stages 1-5 as fast as you can (the clock runs from the first stage)
//    BIG MAPS     every stage is a big scrolling map with outposts to hold or factories to destroy (bigmap.js)
//    VS EAGLES    2-4 players, each with an eagle: defend yours, destroy theirs; best of 3 rounds
//    DEATHMATCH   2-4 players, no eagles: first to 10 kills, or the most kills after 3 minutes
//    FLAGS        capture the flag: bring another player's flag home to your own; first to 3
// =====================================================================

const MODES = [
  { key: 'classic', name: 'CLASSIC', desc: 'THE GAME AS ALWAYS' },
  { key: 'custom', name: 'CUSTOM LEVELS', desc: 'YOUR OWN LEVELS, IN TURN' },   // editor.js
  { key: 'survival', name: 'SURVIVAL', desc: 'HOLD OUT FOR 100 WAVES' },
  { key: 'timeattack', name: 'TIME ATTACK', desc: 'CLEAR 5 STAGES FAST' },
  { key: 'bigmaps', name: 'BIG MAPS', desc: 'HUGE SCROLLING BATTLEFIELDS' },
  { key: 'sides', name: 'ANY SIDE', desc: 'YOUR EAGLE ON ANOTHER EDGE' },   // the map turned: eagle left, right or top
  { key: 'corridor', name: 'CORRIDOR', desc: 'ENDLESS CLIMB, HOW FAR?' },
  { key: 'maze', name: 'MAZE', desc: 'FIND THE ONE WAY OUT' },   // maze.js
  { key: 'world', name: 'ENDLESS WORLD', desc: 'EXPLORE A WORLD WITHOUT END' },   // world.js: villages, ruins, day and night
  { key: 'fortress', name: 'FORTRESS', desc: 'BUILD TOWERS, HOLD 30 WAVES' },   // fortress.js: tower defense
  { key: 'galaxy', name: 'GALAXY', desc: 'BLAST ALIEN WAVES IN SPACE' },   // galaxy.js: a shoot-em-up
  { key: 'race', name: 'KILL RACE', cpu: true, desc: 'MOST KILLS WINS THE ROUND' },   // race.js; 1 player races bots
  { key: 'coop', name: 'CO-OP VS CPU', desc: 'TEAM UP AGAINST THE CPU' },   // VS CPU (cpuvs.js) for 1-4 players together
  { key: 'eagles', name: 'VS EAGLES', vs: true, cpu: true, desc: 'GUARD YOURS, HIT THEIRS' },   // cpu: 1 player plays the computer
  { key: 'dm', name: 'DEATHMATCH', vs: true, cpu: true, desc: 'FIRST TO 10 KILLS' },   // 1 player: against bots
  { key: 'ctf', name: 'FLAGS', vs: true, desc: 'BRING THEIR FLAG HOME' },
  { key: 'cs', name: 'COUNTER-STRIKE', desc: 'PLANT THE BOMB OR DEFUSE IT' },   // cs.js: two teams on DE_DUST2, bots fill them
  { key: 'rally', name: 'TANK RALLY', desc: 'RACE, BLAST, UPGRADE, WIN' },   // rally.js: 1-2 players race 3 rivals; the career in rallycareer.js
  { key: 'astro', name: 'ASTRO TANKS', desc: 'BLAST ROCKS, UPGRADE, SURVIVE' },   // astro.js: rocks, saucers, the hangar (astroup.js), mini bosses (astroboss.js)
  { key: 'rts', name: 'DESERT DOMINION', desc: 'BUILD, HARVEST, RULE THE SANDS' },   // rts*.js: real-time strategy on the desert planet KHARRA
  // not on the MODE row: VS EAGLES with one player becomes this (cpuvs.js)
  { key: 'cpu', name: 'VS CPU', desc: 'DESTROY THE ENEMY HQ' },
];
const modeInfo = key => MODES.find(m => m.key === key) || MODES[0];
const TA_STAGES = 5, VS_ROUNDS = 2, DM_FRAGS = 10, DM_TIME = 3 * 60 * 60, CTF_CAPS = 3;
const VS_RESPAWN = 90, VS_PU_EVERY = 900, WAVE_BREAK = 240;
// power-ups that make sense between players
const VS_POWERUPS = [PU.HELMET, PU.STAR, PU.SHIP, PU.TURBO, PU.RAPID, PU.SPREAD, PU.PIERCE, PU.ROCKET, PU.MINES, PU.GHOST, PU.SMOKE, PU.GUN, PU.WEAPON];

// survival: what wave w brings
function waveQueue(w) {
  return buildQueue(Math.min(60, w * 2), Math.min(60, 6 + w * 2));
}

Object.assign(Stage.prototype, {
  // ------------------------------------------------------------ survival
  setupSurvival() {
    this.survival = true;
    this.wave = 1;
    this.queue = waveQueue(1);
    this.total = this.queue.length;
    this.waveBreak = 0;
  },

  // called instead of "stage clear" when a wave is beaten
  nextWave() {
    if (this.waveBreak > 0) {
      if (--this.waveBreak === 0) {
        this.wave++;
        this.queue = waveQueue(this.wave);
        this.seasonEnemies(this.queue);
        this.total += this.queue.length;
        this.spawnTimer = 0;
      }
      return;
    }
    this.waveBreak = WAVE_BREAK;
    // a breather: the fortress is patched, every 5 waves a tank for everyone
    this.setBaseWalls(T_BRICK);
    if ((this.wave + 1) % 5 === 0) for (const p of this.players) if (!p.out && !Config.infiniteLives()) p.lives++;
    for (const p of this.players) if (!p.out) this.addXp(p, 10 + this.wave * 2);
    Sound.play('bonus');
  },

  // ------------------------------------------------------------ versus
  setupVersus(kind) {
    this.vs = kind;
    this.queue = [];
    this.total = 0;
    this.noBase = true;
    const midY = Math.round((FH / 2 - 8) / 16) * 16;
    const homes = [[BASE_X, BASE_Y], [BASE_X, 0], [0, midY], [FW - 16, midY]];
    this.vsSpawn = kind === 'dm'
      ? [[0, FH - 16], [FW - 16, 0], [0, 0], [FW - 16, FH - 16]]
      : [[BASE_X - 32, BASE_Y], [BASE_X + 32, 0], [0, midY - 32], [FW - 16, midY + 32]];
    // clear room around everyone's home and entry point; the classic fortress goes (rebuilt below if needed)
    this.setBaseWalls(T_EMPTY);
    const clear = (x, y, r) => {
      for (let cy = (y >> 2) - r; cy < (y >> 2) + 4 + r; cy++) for (let cx = (x >> 2) - r; cx < (x >> 2) + 4 + r; cx++) {
        const t = this.get(cx, cy);
        if (t !== -1 && t !== T_EMPTY) this.set(cx, cy, T_EMPTY);
      }
    };
    this.players.forEach((p, i) => { clear(...this.vsSpawn[i], 1); if (kind !== 'dm') clear(...homes[i], 3); });
    this.pads = this.pads.filter(pd => !this.players.some((p, i) => overlap(pd.x, pd.y, 16, 16, this.vsSpawn[i][0] - 8, this.vsSpawn[i][1] - 8, 32, 32)));
    if (kind === 'eagles') {
      this.vsEagles = this.players.map((p, i) => ({ x: homes[i][0], y: homes[i][1], i, alive: true }));
      for (const e of this.vsEagles) this.fortressAround(e.x, e.y);
    }
    if (kind === 'ctf') {
      this.flags = this.players.map((p, i) => ({ i, hx: homes[i][0], hy: homes[i][1], x: homes[i][0], y: homes[i][1], carrier: null }));
    }
    for (const p of this.players) { p.vsKills = p.vsKills || 0; p.caps = 0; p.out = false; }
    this.vsTime = 0;
    this.vsPu = VS_PU_EVERY / 2;
    this.vsEnd = 0;
  },

  // a ring of 8px brick blocks around a 16px eagle (inside the field)
  fortressAround(x, y) {
    const bx = x / 8, by = y / 8;
    for (let yy = by - 1; yy <= by + 2; yy++) for (let xx = bx - 1; xx <= bx + 2; xx++) {
      const inside = xx >= bx && xx <= bx + 1 && yy >= by && yy <= by + 1;
      if (!inside && xx >= 0 && yy >= 0 && xx < COLS * 2 && yy < ROWS * 2) this.setBlock(xx, yy, T_BRICK);
    }
  },

  vsPlayerOf(tank) { return tank && tank.player ? tank.player : null; },

  // a player tank was destroyed in a versus game
  vsDeath(t, by) {
    const p = t.player, killer = this.vsPlayerOf(by);
    if (killer && killer !== p) {
      killer.vsKills++;
      this.addScore(killer, 100);
      this.popups.push({ x: t.x + 8, y: t.y, text: ROMAN[killer.i] + ' +1', label: true, color: PALS[Config.playerPal(killer.i)][2], t: 0, delay: 0 });
    }
    // a flag carrier drops the flag where it fell
    for (const f of this.flags || []) if (f.carrier === p) { f.carrier = null; f.x = t.x; f.y = t.y; }
    const eagleGone = this.vs === 'eagles' && !this.vsEagles[p.i].alive;
    if (eagleGone) p.out = true; else this.spawnPlayer(p, VS_RESPAWN);
  },

  // a shell meets an eagle (true if it stopped there)
  vsBulletEagle(b) {
    for (const e of this.vsEagles || []) {
      if (!e.alive || !overlap(b.x, b.y, 4, 4, e.x, e.y, 16, 16)) continue;
      this.killBullet(b, true);
      const owner = this.vsPlayerOf(b.owner);
      if (!owner || owner.i !== e.i) this.vsEagleDown(e);   // your own shells can't hurt your eagle
      return true;
    }
    return false;
  },

  vsEagleDown(e) {
    if (!e.alive) return;
    e.alive = false;
    this.addFx(e.x + 8, e.y + 8, BIG_EXPLOSION(), 6);
    Sound.play('baseDie');
    const p = this.players[e.i];
    p.out = true;
    if (p.tank) { p.tank.alive = false; this.addFx(p.tank.x + 8, p.tank.y + 8, BIG_EXPLOSION(), 5); p.tank = null; }
    this.spawns = this.spawns.filter(s => s.player !== p);
    this.popups.push({ x: e.x + 8, y: e.y, text: ROMAN[e.i] + ' IS OUT', label: true, color: COL.red, t: 0, delay: 0, life: 120 });
  },

  updateVersus() {
    this.vsTime++;
    // power-ups drop now and then (no bonus tanks here)
    if (!this.powerup && --this.vsPu <= 0) {
      this.vsPu = VS_PU_EVERY;
      this.spawnPowerup(VS_POWERUPS);
    }
    if (this.vs === 'ctf') this.updateFlags();
    if (this.vsEnd > 0) { if (--this.vsEnd === 0) this.result = 'vsRound'; return; }
    // has anyone won?
    let winner = null;
    if (this.vs === 'eagles') {
      const alive = this.vsEagles.filter(e => e.alive);
      if (alive.length <= 1) winner = alive.length ? alive[0].i : -1;
    } else if (this.vs === 'dm') {
      const top = this.players.find(p => p.vsKills >= DM_FRAGS);
      if (top) winner = top.i;
      else if (this.vsTime >= DM_TIME) winner = this.leader(p => p.vsKills);
    } else if (this.vs === 'ctf') {
      const top = this.players.find(p => p.caps >= CTF_CAPS);
      if (top) winner = top.i;
    }
    if (winner !== null) { this.vsWinner = winner; this.vsEnd = 150; Sound.play(winner >= 0 ? 'bonus' : 'gameover'); }
  },

  // the single best player by some count, or -1 on a tie
  leader(f) {
    const best = Math.max(...this.players.map(f));
    const top = this.players.filter(p => f(p) === best);
    return top.length === 1 ? top[0].i : -1;
  },

  updateFlags() {
    for (const f of this.flags) {
      if (f.carrier) {
        const t = f.carrier.tank;
        if (t) { f.x = t.x; f.y = t.y; }
        continue;
      }
      for (const t of this.tanks) {
        if (!t.alive || !t.isPlayer || t.ally || !overlap(t.x + 2, t.y + 2, 12, 12, f.x + 2, f.y + 2, 12, 12)) continue;
        const p = t.player;
        if (p.i === f.i) {
          // your own flag: a dropped one goes home; at home, bring a captured flag to it
          if (f.x !== f.hx || f.y !== f.hy) { f.x = f.hx; f.y = f.hy; Sound.play('pickup'); }
          const carried = this.flags.find(g => g.carrier === p);
          if (carried) {
            carried.carrier = null; carried.x = carried.hx; carried.y = carried.hy;
            p.caps++;
            this.addScore(p, 500);
            this.popups.push({ x: t.x + 8, y: t.y, text: 'CAPTURE!', label: true, color: COL.gold, t: 0, delay: 0, life: 90 });
            Sound.play('life');
          }
        } else if (!this.flags.some(g => g.carrier === p)) {
          f.carrier = p;   // grabbed someone else's flag
          Sound.play('bonus');
        }
        break;
      }
    }
  },

  // ------------------------------------------------------------ drawing
  renderVs(ctx) {
    for (const e of this.vsEagles || []) {
      if (!e.alive) { ctx.drawImage(Sprites.eagleDead, e.x, e.y); continue; }
      ctx.drawImage(Sprites.outline(Sprites.eagle, PALS[Config.playerPal(e.i)][2]), e.x - 1, e.y - 1);
      ctx.drawImage(Sprites.eagle, e.x, e.y);
    }
    for (const f of this.flags || []) {
      // home marker, then the flag itself in its owner's colour
      ctx.strokeStyle = PALS[Config.playerPal(f.i)][2];
      ctx.strokeRect(f.hx + 0.5, f.hy + 0.5, 15, 15);
      ctx.drawImage(Sprites.vsFlag(Config.playerPal(f.i)), f.x, f.y - (f.carrier ? 6 : 0));
    }
  },

  renderVsHud(ctx, H) {
    const val = p => (this.vs === 'eagles' ? (Game.vsWins[p.i] || 0) : this.vs === 'dm' ? p.vsKills : p.caps);
    Font.draw(ctx, this.vs === 'eagles' ? 'WIN' : this.vs === 'dm' ? 'KIL' : 'CAP', H - 4, 24, COL.black);
    this.players.forEach((p, i) => {
      const y = 40 + i * 20;
      ctx.drawImage(Sprites.playerIcon(Config.playerPal(i)), H, y);
      Font.draw(ctx, String(Math.min(99, val(p))), H + 8, y, p.out ? '#3C3C3C' : COL.black);
      if (this.vs === 'eagles' && !this.vsEagles[i].alive) { ctx.fillStyle = COL.red; ctx.fillRect(H, y + 3, 16, 1); }
    });
    if (this.vs === 'dm') {
      const left = Math.max(0, Math.ceil((DM_TIME - this.vsTime) / 60));
      Font.drawCenter(ctx, Math.floor(left / 60) + ':' + String(left % 60).padStart(2, '0'), H + 8, 130, COL.black);
    }
  },

  renderModeBanner(ctx) {
    if (this.survival && this.waveBreak > 0 && (this.waveBreak >> 4) & 1) {
      Font.drawCenter(ctx, 'WAVE ' + (this.wave + 1), VIEW_W / 2, VIEW_H / 2 - 4, COL.gold);
    }
    if (this.vs && this.vsEnd > 0) {
      const w = this.vsWinner;
      Font.drawCenter(ctx, w >= 0 ? playerName(this.players.find(p => p.i === w)) + ' WINS!' : 'DRAW!', VIEW_W / 2, VIEW_H / 2 - 4, COL.gold);
    }
  },
});
