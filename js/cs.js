'use strict';
// =====================================================================
//  COUNTER-STRIKE: two teams of tanks on DE_DUST2 (csmap.js). The terrorists plant the bomb on site A or B, the
//  counter-terrorists stop them or defuse it.
//    - 1-4 players (on one computer or online) pick a side on the team screen; bots fill both teams up to 5 v 5
//      (3 v 3 and 4 v 4 too). Players at one computer are always on the same team: it's their fog of war.
//    - a round: 10 s to buy in the spawn (tanks hold still), then 1:55 on the clock. One terrorist carries the bomb
//      (dropped where he dies, any terrorist picks it up); on a site, hold B still for 3 s to plant it. Then 40 s,
//      beeping faster and faster; a counter-terrorist holds B still on it for 10 s (5 s with a defuse kit) to defuse.
//      A round ends when a team is wiped out (with the bomb down the CTs still have to defuse it), the bomb goes off,
//      it's defused, or time runs out with no bomb down. No respawns: the fallen watch a teammate (FIRE: the next).
//    - first to 8 rounds (5 or 13 on the team screen); the sides switch at half time and the money starts over.
//    - money for kills, round wins, losses in a row, the plant and the defuse; spent on the buy menu (CS_BUY).
//    - fog of war: you see what your team sees (line of sight from every living teammate, 9 tiles, walls, crates
//      and smoke block it); never seen is black, seen before is dim and shows no enemies (only where they were).
//    - no power-ups on the map, friendly fire off, armour plates soak a hit each, the walls never break.
//  The bots are in csbots.js, the title picture in csart.js.
// =====================================================================

const CS_BUY_TIME = 600, CS_ROUND_TIME = 115 * 60, CS_END_TIME = 330, CS_BOMB_TIME = 36 * 60;
// a flashbang: thrown up to six tiles, it bangs after a moment and blinds every tank that can see the bang within its
// reach (the longer the nearer, and the more it was looking that way)
const CS_FLASH_R = 120, CS_FLASH_FUSE = 24, CS_FLASH_TIME = 200, CS_FLASH_THROW = 96;
const CS_PLANT_TIME = 180, CS_DEFUSE_TIME = 600, CS_KIT_TIME = 300, CS_BOMB_R = 76, CS_SMOKE_TIME = 900, CS_SMOKE_R = 26;
const CS_VIS_R = 18, CS_VIS_EVERY = 6, CS_HEAR = 200, CS_KEY = 'tank1990_cs';
const CS_MONEY = { start: 800, max: 16000, win: 3250, winBomb: 3500, lose: 1400, loseStep: 500, loseMax: 3400, plant: 300, plantTeam: 800, defuse: 300 };
// a kill pays by the weapon it was made with (as in the game: the big guns pay least)
const CS_KILL_PAY = { cannon: 300, mg: 600, flame: 900, mortar: 300, tesla: 300, missile: 300, laser: 100 };
// the buy menu: armour, the star (faster shells, then two at once), smoke, mines, the kit, the weapons (weapons.js) at
// the MK they come in
const CS_BUY = [
  { id: 'armor', name: 'ARMOUR PLATE', price: 650, desc: 'SOAKS ONE HIT, UP TO 2' },
  { id: 'star', name: 'STAR', price: 600, desc: 'FASTER SHELLS, THEN TWO' },
  { id: 'smoke', name: 'SMOKE', price: 300, desc: 'B: A WALL OF SMOKE' },
  { id: 'flash', name: 'FLASHBANG', price: 200, desc: 'B: BLINDS ALL WHO SEE IT' },
  { id: 'mines', name: 'MINES X3', price: 400, desc: 'B: DROP ONE' },
  { id: 'kit', name: 'DEFUSE KIT', price: 400, desc: 'DEFUSE IN 5 S, NOT 10', ct: true },
  { id: 'flame', weapon: 'flame', mk: 2, name: 'FLAMETHROWER', price: 1200, desc: 'CLOSE AND DEADLY' },
  { id: 'mg', weapon: 'mg', mk: 2, name: 'MACHINE GUN', price: 1500, desc: 'HOLD FIRE: A STREAM' },
  { id: 'mortar', weapon: 'mortar', mk: 2, name: 'MORTAR', price: 2000, desc: 'OVER WALLS, A BLAST' },
  { id: 'tesla', weapon: 'tesla', mk: 1, name: 'TESLA', price: 2500, desc: 'ZAPS THE NEAREST FOE' },
  { id: 'missile', weapon: 'missile', mk: 2, name: 'MISSILES', price: 3100, desc: 'HOMING, OVER WALLS' },
  { id: 'laser', weapon: 'laser', mk: 2, name: 'LASER', price: 4750, desc: 'A SNIPER BEAM' },
  { id: 'go', name: 'READY', desc: 'DONE BUYING' },
];
const CS_WHY = { bomb: 'TARGET BOMBED', defuse: 'BOMB DEFUSED', elim: 'ENEMY ELIMINATED', time: 'TARGET SAVED' };
const CS_BOT_NAMES = ['ALEX', 'BORIS', 'CHUCK', 'DIMA', 'EDDIE', 'FINN', 'GUS', 'HANK', 'IGOR', 'JAKE', 'KURT', 'LEON'];
PALS.csT = [null, '#FCD8A8', '#D86018', '#6C1C00'];
PALS.csCT = [null, '#C0E0FC', '#3078E8', '#0C2878'];
const CS_COL = { T: '#F88838', CT: '#58A8F8', Tdk: '#A84810', CTdk: '#1C58B8' };
const csSide = (squad, half) => ((squad ^ half) === 0 ? 'T' : 'CT');
const csOther = team => (team === 'T' ? 'CT' : 'T');
const csName = p => (p ? p.csName || ROMAN[p.i] + '-PLAYER' : '');
const csPalKey = p => (p && p.csTeam === 'CT' ? 'csCT' : 'csT');
// money on screen: a little dollar sign (the font has none) and the number
function csMoneyText(ctx, n, x, y, col, narrow) {
  if (narrow && n >= 10000) { ctx.drawImage(Sprites.mini(String(n)), x, y); return; }
  ctx.fillStyle = col;
  for (const [i, j] of [[1, 0], [0, 1], [2, 1], [0, 2], [1, 3], [2, 4], [0, 5], [2, 5], [1, 6], [1, 2], [1, 4], [1, 1], [1, 5]]) ctx.fillRect(x + i, y + j, 1, 1);
  ctx.fillRect(x, y + 1, 3, 1); ctx.fillRect(x, y + 3, 3, 1); ctx.fillRect(x, y + 5, 3, 1);
  ctx.drawImage(Sprites.mini(String(n)), x + 5, y);
}

// ================================================================= the match (Game)
Object.assign(Game, {
  // newGame: the team screen comes first (in the curtain, so online guests see it and pick too)
  csNewGame() {
    const o = STORE.get(CS_KEY, {});
    this.csMatch = null; this.csSeen = {};
    // the players at this computer pick together; each online guest for themselves
    const local = this.players.filter(p => !Input.remote[p.i]).map(p => p.i), groups = [];
    if (local.length) groups.push({ members: local, side: o.side === 'CT' ? 'CT' : 'T', ready: false, local: true });
    for (const p of this.players) if (Input.remote[p.i]) groups.push({ members: [p.i], side: groups.length % 2 ? 'CT' : 'T', ready: false });
    this.curtain.cs = { groups, row: 0, target: [5, 8, 13].includes(o.target) ? o.target : 8, size: [3, 4, 5].includes(o.size) ? o.size : 5,
      map: CS_MAP_ORDER.includes(o.map) || o.map === 'random' ? o.map : 'dust2' };
  },

  csTeamsUpdate() {
    const C = this.curtain.cs, m = Input.menu();
    for (const g of C.groups) {
      const r = g.local ? m : (Input.remote[g.members[0]] || {}).menu || {};
      if (g.local && m.back) { this.toTitle(); return; }
      if (g.local && (m.up || m.down)) { C.row = (C.row + (m.down ? 1 : 3)) % 4; Sound.play('select'); }
      const dir = r.left ? -1 : r.right ? 1 : 0;
      if (dir && !g.ready) {
        if (!g.local || C.row === 0) g.side = csOther(g.side);
        else if (C.row === 1) { const all = CS_MAP_ORDER.concat('random'); C.map = all[(all.indexOf(C.map) + dir + all.length) % all.length]; }
        else if (C.row === 2) C.target = [5, 8, 13][([5, 8, 13].indexOf(C.target) + dir + 3) % 3];
        else C.size = 3 + ((C.size - 3 + dir + 3) % 3);
        Sound.play('select');
      }
      if (r.ok && this.t > 15) { g.ready = !g.ready; Sound.play(g.ready ? 'pickup' : 'select'); }
    }
    if (C.groups.length && C.groups.every(g => g.ready)) this.csStartMatch();
  },

  // the teams: the players' squads (0 starts as the terrorists), bots to fill them up
  csStartMatch() {
    const C = this.curtain.cs, humans = this.players.filter(p => !p.bot);
    const side = {};
    for (const g of C.groups) for (const i of g.members) side[i] = g.side;
    const n0 = humans.filter(p => side[p.i] !== 'CT').length, size = Math.max(C.size, n0, humans.length - n0);
    const local = C.groups.find(g => g.local);
    STORE.set(CS_KEY, { target: C.target, size: C.size, side: local ? local.side : 'T', map: C.map || 'dust2' });
    const map = C.map === 'random' ? CS_MAP_ORDER[rnd(CS_MAP_ORDER.length)] : CS_MAPS[C.map] ? C.map : 'dust2';
    this.csMatch = { target: C.target, size, round: 1, half: 0, score: [0, 0], streak: [0, 0], hist: [], id: 1 + rnd(1e6), map };
    this.csSeen = {};
    for (const p of humans) p.csSquad = side[p.i] === 'CT' ? 1 : 0;
    let k = 0;
    for (const sq of [0, 1]) {
      const have = this.players.filter(p => p.csSquad === sq).length;
      for (let j = have; j < size; j++) this.players.push(Object.assign(newPlayer(this.players.length), { bot: true, csSquad: sq, csName: CS_BOT_NAMES[k++ % CS_BOT_NAMES.length] }));
    }
    for (const p of this.players) this.csResetGear(p, true);
    this.round = 1;
    this.beginStage();
  },

  // everything bought goes (on death, and at half time with the money)
  csResetGear(p, money) {
    Object.assign(p, { weapon: 'cannon', wlv: {}, level: 0, mines: 0, turrets: 0, bridges: 0, csArmor: 0, csSmokes: 0, csFlashes: 0, csNades: [], csKit: false, csBlind: 0 });
    if (money) Object.assign(p, { csMoney: CS_MONEY.start, csK: 0, csD: 0, csMvp: 0 });
  },

  // a round: the map as new, everyone at their spawn with what they kept or bought
  csBeginRound() {
    const M = this.csMatch, keep = o => JSON.parse(JSON.stringify(o));
    // what RESTART ROUND (pause menu) goes back to: the players and the match as the round began
    this.roundSave = { players: this.players.map(p => keep(Object.assign({}, p, { tank: null }))), base: keep(this.base), customPending: false, taFrames: 0, taCleared: 0, resume: null, csM: keep(M) };
    this.ck = null;
    const [vc, vr] = this.desiredField();
    csUseMap(M.map);
    setFieldSize(CS_W, CS_H, Math.min(vc, CS_W), Math.min(vr, CS_H));
    this.stageNum = M.round;
    const st = new Stage(M.round, LEVELS[0], [], { blocks: csMapBlocks(), custom: true, theme: 'cs_' + CS_MAPKEY, base: newBase() });
    st.csSetup(this.players, M);
    this.stage = st;
    this.paused = false;
    this.openH = SCREEN_H / 2;
    this.setState('play');
    Sound.play(M.round === 1 ? 'start' : 'csRound');
  },

  // the round's over (its result screen was the banner): the next one, half time, or the end of the match
  csNextRound() {
    const M = this.csMatch;
    if (M.score[0] >= M.target || M.score[1] >= M.target) { this.csMatchEnd(); return; }
    M.round++;
    if (M.round === M.target && !M.half) {
      // half time: switch sides, the money and the guns start over
      M.half = 1; M.streak = [0, 0];
      for (const p of this.players) { this.csResetGear(p, false); p.csMoney = CS_MONEY.start; }
    }
    this.beginStage();
  },

  csMatchEnd() {
    const M = this.csMatch, w = M.score[0] >= M.target ? 0 : 1, humans = this.players.filter(p => !p.bot);
    const mine = humans.length ? humans[0].csSquad : -1;
    const res = { mode: 'cs', final: true, round: M.round, squad: w, side: csSide(w, M.half), score: M.score.slice(), mine, half: M.half,
      rows: this.players.map(p => ({ i: p.i, bot: !!p.bot, name: csName(p), squad: p.csSquad, k: p.csK, d: p.csD, mvp: p.csMvp })) };
    if (mine >= 0 && Net.role !== 'client') {
      const rec = STORE.get(MODE_KEY, {}), c = rec.cs || { played: 0, won: 0, rounds: 0, roundsWon: 0 };
      c.played++; if (w === mine) c.won++;
      c.rounds += M.score[0] + M.score[1]; c.roundsWon += M.score[mine];
      rec.cs = c; STORE.set(MODE_KEY, rec);
      res.rec = c; res.won = w === mine;
    }
    this.vsRes = res;
    Sound.setEngine(0);
    Sound.play(res.won ? 'bonus' : res.mine >= 0 ? 'gameover' : 'csWin');
    this.setState('vsResult');
  },
});

// the title screen's line about the mode
function csTitleLine(rec) {
  const c = rec.cs;
  return c ? 'MATCHES WON ' + c.won + '/' + c.played + '  ROUNDS ' + c.roundsWon + '/' + c.rounds : '1-4 PLAYERS, BOTS FILL THE TEAMS';
}

// ================================================================= a round (Stage)
Object.assign(Stage.prototype, {
  csSetup(players, M) {
    this.players = players; this.twoP = true;
    this.vs = 'cs'; this.noBase = true; this.baseAlive = false; this.hardSteel = true;
    this.queue = []; this.total = 0; this.weather = null; this.pads = []; this.powerup = null; this.secrets = []; this.qblocks = [];
    // the map exactly as drawn (the stage's own setup put a fortress in and cleared entry points)
    const blocks = csMapBlocks();
    for (let by = 0; by < blocks.length; by++) for (let bx = 0; bx < blocks[by].length; bx++) this.setBlock(bx, by, BLOCK_TYPE[blocks[by][bx]] || T_EMPTY);
    this.netDiff = []; this.dirty = true; this.origTerrain = this.terrain.slice(); this.terrainVer = (this.terrainVer || 0) + 1;
    this.csM = M;
    this.cs = { phase: 'buy', t: 0, clock: CS_ROUND_TIME, bomb: null, feed: [], smokes: [], flashes: [], notes: [], buy: {}, noise: [], vis: {}, ghosts: { T: [], CT: [] },
      winner: null, why: '', mvp: -1, round: M.round, half: M.half, score: M.score.slice(), target: M.target, id: M.id, flash: 0 };
    const starts = { T: CS_STARTS.T.at.slice(), CT: CS_STARTS.CT.at.slice() };
    this.vsSpawn = [];
    for (const p of players) {
      p.csTeam = csSide(p.csSquad, M.half);
      p.out = false; p.tank = null; p.kills = zeroKills(); p.csRoundK = 0; p.csSpec = -1; p.csBlind = 0; p.csTook = false;
      // the defenders get a star and an armour plate every round, free; the terrorists a plate (without it the
      // defenders, two hits each, won nine rounds in ten)
      if (p.csTeam === 'CT') p.level = Math.max(p.level || 0, 1);
      p.csArmor = Math.max(p.csArmor || 0, 1);
      const at = starts[p.csTeam].shift() || CS_STARTS[p.csTeam].at[rnd(5)];
      const t = new Tank({ x: at[0] * 16, y: at[1] * 16, dir: CS_STARTS[p.csTeam].dir, isPlayer: true, player: p });
      t.applyLevel();
      t.plates = p.csArmor || 0;
      p.tank = t;
      this.vsSpawn[p.i] = [t.x, t.y];
      this.tanks.push(t);
    }
    // the bomb goes to one of the terrorists: a player's if there's one on the side (the bots go where it goes)
    const ts = players.filter(p => p.csTeam === 'T'), hs = ts.filter(p => !p.bot), from = hs.length ? hs : ts;
    const carrier = from.length ? from[rnd(from.length)] : null;
    this.cs.bomb = { state: carrier ? 'carried' : 'none', carrier: carrier ? carrier.i : -1, x: 0, y: 0, site: '', timer: 0, plant: 0, planter: -1, defuse: 0, defuser: -1, beep: 0 };
    for (const p of players) if (p.bot) this.csBotBuy(p);   // csbots.js
    // the half's last round, match point, half time
    const left = M.target - 1;
    if (M.round === M.target && M.half) this.csNote('HALF TIME: SIDES SWITCHED', COL.gold, 240);
    else if (M.round === left && !M.half) this.csNote('LAST ROUND OF THE HALF', COL.white, 200);
    if (M.score[0] === M.target - 1 || M.score[1] === M.target - 1) this.csNote('MATCH POINT', COL.red, 200);
    if (M.round > 1) this.frame = MUSIC_DELAY + 1;   // the music plays on from round to round
  },

  csNote(text, color, life = 180, team = null) { this.cs.notes.push({ text, color, t: 0, life, team }); },
  csP(i) { return this.players.find(p => p.i === i) || null; },
  csAlive(team) { return this.tanks.filter(t => t.alive && t.player && t.player.csTeam === team); },
  csHumans() { return this.players.filter(p => !p.bot); },
  // whose eyes the screen uses: an online guest's own team, the players at this computer's team (null: everything,
  // a match of bots only)
  csViewer() {
    let team, ps;
    if (Net.role === 'client') { const p = this.csP(Net.slot); team = p ? p.csTeam : null; ps = p ? [p] : []; }
    else { ps = this.players.filter(p => !p.bot && !Input.remote[p.i]); team = ps.length ? ps[0].csTeam : null; }
    // your whole team out (and the round still on): no fog, the camera is yours to move round the map
    const out = !!team && this.cs.phase !== 'buy' && !this.tanks.some(t => t.alive && t.player && t.player.csTeam === team);
    return { team: out ? null : team, ps, out };
  },

  // ------------------------------------------------------------ every frame (instead of updateVersus)
  csUpdate() {
    const C = this.cs, B = C.bomb;
    C.t++;
    if (C.flash > 0) C.flash--;
    if (this.frame % CS_VIS_EVERY === 0) { this.csVision('T', true); this.csVision('CT', true); }
    for (const a of [C.feed, C.notes, C.noise]) for (const n of a) n.t++;
    C.feed = C.feed.filter(f => f.t < 360); C.notes = C.notes.filter(n => n.t < n.life); C.noise = C.noise.filter(n => n.t < 40);
    for (const s of C.smokes) s.t++;
    C.smokes = C.smokes.filter(s => s.t < CS_SMOKE_TIME);
    this.csFlashTick();
    if (B.state === 'carried') { const c = this.csP(B.carrier); if (c && c.tank) { B.x = c.tank.x + 8; B.y = c.tank.y + 8; } }
    this.csSpectate();
    if (C.phase === 'buy') {
      this.csBuyTick();
      const hs = this.csHumans().filter(p => p.tank);
      if (C.t >= CS_BUY_TIME || (hs.length ? hs.every(p => C.buy[p.i] && C.buy[p.i].ready) && C.t > 30 : C.t > 60)) {
        C.phase = 'live'; C.t = 0;
        Sound.play('csGo');
      }
      return;
    }
    this.csBombTick();
    if (C.phase === 'live') {
      if (B.state !== 'planted') C.clock = Math.max(0, C.clock - 1);
      this.csCheckEnd();
    } else if (C.phase === 'end' && C.t >= CS_END_TIME) C.next = true;   // Game.updatePlay starts the next round
  },

  csCheckEnd() {
    const B = this.cs.bomb, t = this.csAlive('T').length, ct = this.csAlive('CT').length;
    if (ct === 0) this.csEnd('T', 'elim');
    else if (t === 0 && B.state !== 'planted') this.csEnd('CT', 'elim');
    else if (this.cs.clock <= 0 && B.state !== 'planted') this.csEnd('CT', 'time');
  },

  // the round's won: the score, the MVP, the money
  csEnd(team, why) {
    const C = this.cs, M = this.csM, B = C.bomb;
    if (C.phase === 'end') return;
    C.phase = 'end'; C.t = 0; C.winner = team; C.why = why;
    const wsq = this.players.find(p => p.csTeam === team), sq = wsq ? wsq.csSquad : (team === 'T' ? M.half : 1 - M.half);
    M.score[sq]++; M.streak[sq] = 0; M.streak[1 - sq]++;
    M.hist.push({ w: team, why });
    C.score = M.score.slice();
    // the MVP: the planter of a bomb that went off, the defuser, else the most kills on the winning side
    let mvp = why === 'bomb' ? this.csP(B.planter) : why === 'defuse' ? this.csP(B.defuser) : null;
    if (!mvp) for (const p of this.players) if (p.csTeam === team && (!mvp || p.csRoundK > mvp.csRoundK)) mvp = p;
    if (mvp) { mvp.csMvp = (mvp.csMvp || 0) + 1; C.mvp = mvp.i; }
    const lose = Math.min(CS_MONEY.loseMax, CS_MONEY.lose + CS_MONEY.loseStep * Math.max(0, M.streak[1 - sq] - 1));
    for (const p of this.players) {
      const won = p.csTeam === team;
      let pay = won ? (why === 'bomb' || why === 'defuse' ? CS_MONEY.winBomb : CS_MONEY.win) : lose;
      if (!won && p.csTeam === 'T' && (B.state === 'planted' || B.state === 'defused')) pay += CS_MONEY.plantTeam;
      this.csPay(p, pay);
      if (p.tank && p.tank.alive) p.csArmor = p.tank.plates;   // the survivors keep what they have
    }
    Sound.play(team === 'T' ? 'csWinT' : 'csWinCT');
  },

  csPay(p, n) { p.csMoney = Math.max(0, Math.min(CS_MONEY.max, (p.csMoney || 0) + n)); },

  // ------------------------------------------------------------ the bomb
  csBombTick() {
    const C = this.cs, B = C.bomb;
    if (B.state === 'dropped' && C.phase !== 'end') {
      // any terrorist who drives over it takes it
      const t = this.tanks.find(o => o.alive && o.player && o.player.csTeam === 'T' && overlap(o.x, o.y, 16, 16, B.x - 6, B.y - 6, 12, 12));
      if (t) { B.state = 'carried'; B.carrier = t.player.i; Sound.play('csPick'); }
    }
    if (B.state === 'carried' && C.phase === 'live') {
      const p = this.csP(B.carrier), t = p && p.tank;
      const site = t ? this.csSiteAt(t.x + 8, t.y + 8) : '';
      if (site && t.csAlt && t.csDir < 0) {
        if (B.plant === 0) Sound.play('csArm');
        if (++B.plant % 30 === 0) Sound.play('csBeep');
        if (B.plant >= CS_PLANT_TIME) {
          Object.assign(B, { state: 'planted', site, x: t.x + 8, y: t.y + 8, timer: CS_BOMB_TIME, planter: p.i, carrier: -1, plant: 0, beep: 0 });
          this.csPay(p, CS_MONEY.plant);
          this.csNote('THE BOMB HAS BEEN PLANTED', COL.red, 200);
          Sound.play('csPlanted');
        }
      } else B.plant = 0;
    }
    if (B.state !== 'planted') return;
    // beeping, faster and faster
    B.timer--;
    const every = Math.max(6, Math.round(8 + 52 * B.timer / CS_BOMB_TIME));
    if (++B.beep >= every) { B.beep = 0; Sound.play('csBeep'); C.flash = 4; }
    if (B.timer <= 0) { this.csExplode(); return; }
    // a counter-terrorist on it, holding B still: defusing (one at a time)
    const on = this.tanks.filter(o => o.alive && o.player && o.player.csTeam === 'CT' && Math.hypot(o.x + 8 - B.x, o.y + 8 - B.y) < 16);
    const d = on.find(o => o.player.i === B.defuser && o.csAlt && o.csDir < 0) || on.find(o => o.csAlt && o.csDir < 0);
    if (d && C.phase !== 'end') {
      if (B.defuser !== d.player.i) { B.defuser = d.player.i; B.defuse = 0; }
      if (B.defuse === 0) Sound.play('csArm');
      if (++B.defuse % 30 === 0) Sound.play('csDefuse');
      if (B.defuse >= (d.player.csKit ? CS_KIT_TIME : CS_DEFUSE_TIME)) {
        B.state = 'defused'; B.timer = 0;
        this.csPay(d.player, CS_MONEY.defuse);
        Sound.play('csDefused');
        this.csEnd('CT', 'defuse');
      }
    } else B.defuse = 0;
  },

  csSiteAt(x, y) { return csInZone('A', x, y) ? 'A' : csInZone('B', x, y) ? 'B' : ''; },

  csExplode() {
    const C = this.cs, B = C.bomb;
    B.state = 'exploded';
    for (const t of this.tanks) if (t.alive && Math.hypot(t.x + 8 - B.x, t.y + 8 - B.y) < CS_BOMB_R) { t.plates = 0; t.shield = 0; t.ship = false; }
    this.blast(B.x, B.y, CS_BOMB_R, false, null, false);
    for (let k = 0; k < 14; k++) {
      const a = k * 0.9, r = 10 + (k * 23) % 56;
      this.fx.push({ x: B.x + Math.cos(a) * r, y: B.y + Math.sin(a) * r, frames: BIG_EXPLOSION(), per: 5, tick: -k * 3 });
    }
    Sound.play('csBoom');
    if (C.phase !== 'end') this.csEnd('T', 'bomb');
  },

  // ------------------------------------------------------------ buying (the first seconds of a round)
  csBuyTick() {
    const C = this.cs;
    for (const p of this.csHumans()) {
      if (!p.tank) continue;
      const b = C.buy[p.i] || (C.buy[p.i] = { idx: 0, ready: false, ld: -1, hold: 0 });
      const inp = Input.player(p.i), d = inp.dir;
      let step = 0;
      if (d === 0 || d === 2) {
        if (b.ld !== d) { step = d === 0 ? -1 : 1; b.hold = 0; } else if (++b.hold > 18 && b.hold % 5 === 0) step = d === 0 ? -1 : 1;
      }
      b.ld = d;
      if (step) { b.idx = (b.idx + step + CS_BUY.length) % CS_BUY.length; Sound.play('select'); }
      if (inp.firePressed) {
        const it = CS_BUY[b.idx];
        if (it.id === 'go') { b.ready = !b.ready; Sound.play(b.ready ? 'pickup' : 'select'); }
        else { const why = this.csBuy(p, it); b.msg = why || ''; b.msgT = 60; Sound.play(why ? 'steel' : 'csBuy'); }
      }
      if (b.msgT > 0) b.msgT--;
    }
  },

  // what an item would cost p now, and why it can't be bought ('' if it can)
  csBuyStatus(p, it) {
    if (it.id === 'go') return '';
    if (it.ct && p.csTeam !== 'CT') return 'CT ONLY';
    const own = { armor: (p.csArmor || 0) >= 2, star: (p.level || 0) >= 2, smoke: (p.csSmokes || 0) >= 2, flash: (p.csFlashes || 0) >= 2, mines: (p.mines || 0) >= 6, kit: !!p.csKit }[it.id];
    if (own || (it.weapon && p.weapon === it.weapon)) return 'HAVE IT';
    if ((p.csMoney || 0) < it.price) return 'NO MONEY';
    return '';
  },

  csBuy(p, it) {
    const why = this.csBuyStatus(p, it);
    if (why) return why;
    this.csPay(p, -it.price);
    const t = p.tank;
    switch (it.id) {
      case 'armor': p.csArmor = (p.csArmor || 0) + 1; if (t) t.plates = p.csArmor; break;
      case 'star': p.level = (p.level || 0) + 1; if (t) t.applyLevel(); break;
      case 'smoke': p.csSmokes = (p.csSmokes || 0) + 1; (p.csNades || (p.csNades = [])).push('smoke'); break;
      case 'flash': p.csFlashes = (p.csFlashes || 0) + 1; (p.csNades || (p.csNades = [])).push('flash'); break;
      case 'mines': p.mines = (p.mines || 0) + 3; break;
      case 'kit': p.csKit = true; break;
      default: p.weapon = it.weapon; p.wlv = { [it.weapon]: it.mk }; if (t) t.wcool = 0;
    }
    return '';
  },

  // ------------------------------------------------------------ B: plant, defuse, smoke (before the stage sees it)
  // inp: what the tank's driver presses this frame; B near the bomb (or on a site with it) is for that, not for a shot
  csInput(p, inp) {
    const t = p.tank, C = this.cs;
    if (!t) return inp;
    t.csAlt = !!inp.alt; t.csDir = inp.dir;
    if (C.phase === 'buy') return inp;
    const B = C.bomb;
    const busy = (B.state === 'carried' && B.carrier === p.i && this.csSiteAt(t.x + 8, t.y + 8))
      || (B.state === 'planted' && p.csTeam === 'CT' && Math.hypot(t.x + 8 - B.x, t.y + 8 - B.y) < 16);
    if (busy) return Object.assign({}, inp, { alt: false, altPressed: false, fire: inp.dir < 0 && inp.alt ? false : inp.fire });
    if (inp.altPressed && (p.csSmokes > 0 || p.csFlashes > 0)) {
      this.csThrowNade(p, t, inp.nade && (inp.nade === 'flash' ? p.csFlashes > 0 : p.csSmokes > 0) ? inp.nade : null);
      return Object.assign({}, inp, { alt: false, altPressed: false });
    }
    return inp;
  },

  // B with grenades: the one bought first goes first
  csThrowNade(p, t, kind) {
    const q = p.csNades || (p.csNades = []);
    while (q.length && !(q[0] === 'flash' ? p.csFlashes > 0 : p.csSmokes > 0)) q.shift();
    if (kind) q.splice(q.indexOf(kind) >>> 0, 1); else kind = q.shift() || (p.csSmokes > 0 ? 'smoke' : 'flash');
    if (kind === 'flash') { p.csFlashes--; this.csThrowFlash(t); } else { p.csSmokes--; this.csThrowSmoke(t); }
  },

  // a flashbang flies up to six tiles ahead (short of a wall) and bangs a moment later
  csThrowFlash(t) {
    const [dx, dy] = DXY[t.dir];
    let x = t.x + 8, y = t.y + 8;
    for (let k = 0; k < CS_FLASH_THROW; k += 4) {
      const v = this.get((x + dx * 4) >> 2, (y + dy * 4) >> 2);
      if (v === T_STEEL || v === T_BRICK || v === -1) break;
      x += dx * 4; y += dy * 4;
    }
    this.cs.flashes.push({ x, y, t: 0, team: t.player ? t.player.csTeam : '' });
    Sound.play('csSmoke');
  },

  // the bang: who sees it is blinded (players: the screen goes white; bots: can't aim) for a while
  csFlashTick() {
    const C = this.cs;
    for (const p of this.players) if (p.csBlind > 0) p.csBlind--;
    for (const f of C.flashes) {
      if (++f.t !== CS_FLASH_FUSE) continue;
      Sound.play('csFlash');
      for (const o of this.tanks) {
        if (!o.alive || !o.player) continue;
        const cx = o.x + 8, cy = o.y + 8, d = Math.hypot(f.x - cx, f.y - cy);
        if (d >= CS_FLASH_R || (d > 10 && !this.clearLine(cx, cy, f.x, f.y))) continue;
        // looking at it: all of it; side on: half; away: a little
        const [fx, fy] = DXY[o.dir], dot = d > 1 ? ((f.x - cx) * fx + (f.y - cy) * fy) / d : 1;
        const face = dot > 0.4 ? 1 : dot > -0.4 ? 0.5 : 0.22;
        o.player.csBlind = Math.max(o.player.csBlind || 0, Math.round(CS_FLASH_TIME * face * (1 - 0.6 * d / CS_FLASH_R)));
      }
    }
    C.flashes = C.flashes.filter(f => f.t < CS_FLASH_FUSE + 20);
  },

  // a smoke grenade lands up to three tiles ahead (short of a wall) and blooms into a cloud
  csThrowSmoke(t) {
    const [dx, dy] = DXY[t.dir];
    let x = t.x + 8, y = t.y + 8;
    for (let k = 0; k < 48; k += 4) {
      const v = this.get((x + dx * 4) >> 2, (y + dy * 4) >> 2);
      if (v === T_STEEL || v === T_BRICK || v === -1) break;
      x += dx * 4; y += dy * 4;
    }
    this.cs.smokes.push({ x, y, t: 0 });
    Sound.play('csSmoke');
  },

  // ------------------------------------------------------------ deaths (instead of vsDeath: nobody comes back)
  csDeath(t, by) {
    const p = t.player, killer = by && by.player, C = this.cs, B = C.bomb;
    p.out = true; p.tank = null; p.csD = (p.csD || 0) + 1;
    if (B.state === 'carried' && B.carrier === p.i) {
      Object.assign(B, { state: 'dropped', carrier: -1, x: t.x + 8, y: t.y + 8, plant: 0 });
      this.csNote('THE BOMB IS DOWN', CS_COL.T, 150, 'T');
    }
    const w = killer ? killer.weapon || 'cannon' : '';
    if (killer && killer !== p && killer.csTeam !== p.csTeam) {
      killer.csK = (killer.csK || 0) + 1; killer.csRoundK = (killer.csRoundK || 0) + 1;
      this.csPay(killer, CS_KILL_PAY[w] || 300);
    }
    C.feed.unshift({ k: killer && killer !== p ? killer.i : -1, v: p.i, w: killer ? (WEAPONS[w] || WEAPONS.cannon).letter : '*', t: 0 });
    C.feed.length = Math.min(C.feed.length, 5);
    Game.csResetGear(p, false);
    if (!p.bot) { const mate = this.csAlive(p.csTeam)[0]; p.csSpec = mate ? mate.player.i : -1; }
  },

  // the fallen watch a teammate; FIRE moves on to the next one
  csSpectate() {
    for (const p of this.csHumans()) {
      if (p.tank) continue;
      const mates = this.csAlive(p.csTeam).map(t => t.player.i);
      if (!mates.length) { p.csSpec = -1; continue; }
      let k = mates.indexOf(p.csSpec);
      const inp = Input.player(p.i);
      if (k < 0) k = 0;
      else if (inp.firePressed) k = (k + 1) % mates.length;
      p.csSpec = mates[k];
      // B: take over the bot you're watching (once a round)
      const b = this.csP(p.csSpec);
      if (inp.altPressed && b && b.bot && !p.csTook && this.cs.phase === 'live') this.csTakeOver(p, b);
    }
  },

  // a fallen player drives a living bot of the team from here on: its tank, its gear, the bomb if it has it; the bot
  // is out of the round
  csTakeOver(p, b) {
    const t = this.csTankOf(b), B = this.cs.bomb;
    if (!t) return;
    for (const k of ['weapon', 'wlv', 'level', 'mines', 'turrets', 'csArmor', 'csSmokes', 'csFlashes', 'csNades', 'csKit']) p[k] = b[k] === undefined ? b[k] : JSON.parse(JSON.stringify(b[k]));
    Game.csResetGear(b, false);
    b.out = true; b.tank = null;
    t.player = p; t.csAi = null;
    Object.assign(p, { tank: t, out: false, csTook: true, csSpec: -1, csBlind: Math.max(p.csBlind || 0, b.csBlind || 0) });
    if (B.carrier === b.i) B.carrier = p.i;
    if (B.defuser === b.i) { B.defuser = -1; B.defuse = 0; }
    this.csNote(csName(p) + ' TAKES OVER ' + csName(b), CS_COL[p.csTeam], 150, p.csTeam);
    Sound.play('select');
  },

  // ------------------------------------------------------------ fog of war
  // the 8 px blocks sight can't pass: a block with half its cells wall or crate (a crate shot to bits lets it through)
  csOpaque() {
    const BW = COLS * 2, BH = ROWS * 2, C = this.cs;
    if (C.opq && C.opqVer === this.terrainVer) return C.opq;
    const o = C.opq && C.opq.length === BW * BH ? C.opq : new Uint8Array(BW * BH);
    for (let by = 0; by < BH; by++) for (let bx = 0; bx < BW; bx++) {
      let n = 0;
      for (let k = 0; k < 4; k++) { const v = this.terrain[(by * 2 + (k >> 1)) * GW + bx * 2 + (k & 1)]; if (v === T_STEEL || v === T_BRICK) n++; }
      o[by * BW + bx] = n >= 2 ? 1 : 0;
    }
    C.opq = o; C.opqVer = this.terrainVer;
    return o;
  },

  // what explored: the blocks a team has ever seen (kept for the whole match, per squad)
  csSeenOf(team) {
    const BW = COLS * 2, BH = ROWS * 2, p = this.players.find(q => q.csTeam === team);
    const key = 'q' + (p ? p.csSquad : team) + ':' + this.cs.id, all = Game.csSeen || (Game.csSeen = {});
    if (!all[key] || all[key].length !== BW * BH) all[key] = new Uint8Array(BW * BH);
    return all[key];
  },

  // what a team sees right now: rays from every living tank of it (a few times a second)
  csVision(team, force) {
    const C = this.cs, BW = COLS * 2, BH = ROWS * 2;
    const v = C.vis[team] || (C.vis[team] = { grid: new Uint8Array(BW * BH), at: -99, shown: new Set() });
    if (!force && this.frame - v.at < CS_VIS_EVERY && this.frame >= v.at) return v.grid;
    v.at = this.frame;
    const g = v.grid, opq = this.csOpaque(), R = CS_VIS_R;
    g.fill(0);
    // smoke clouds block sight too
    let smoke = null;
    if (C.smokes.length) {
      smoke = new Uint8Array(BW * BH);
      for (const s of C.smokes) {
        const r = CS_SMOKE_R * Math.min(1, s.t / 40, (CS_SMOKE_TIME - s.t) / 90) / 8;
        for (let by = Math.floor(s.y / 8 - r); by <= s.y / 8 + r; by++) for (let bx = Math.floor(s.x / 8 - r); bx <= s.x / 8 + r; bx++) {
          if (bx >= 0 && by >= 0 && bx < BW && by < BH && Math.hypot(bx + 0.5 - s.x / 8, by + 0.5 - s.y / 8) < r) smoke[by * BW + bx] = 1;
        }
      }
    }
    for (const t of this.tanks) {
      if (!t.alive || !t.player || t.player.csTeam !== team) continue;
      const cx = (t.x + 8) / 8, cy = (t.y + 8) / 8;
      for (let k = 0; k < 8 * R; k++) {
        // a ray to every block on the edge of the square around the tank
        const side = Math.floor(k / (2 * R)), j = k % (2 * R);
        const ex = side === 0 ? -R + j : side === 1 ? R : side === 2 ? R - j : -R;
        const ey = side === 0 ? -R : side === 1 ? -R + j : side === 2 ? R : R - j;
        const len = Math.hypot(ex, ey), n = Math.ceil(len * 2), sx = ex / n, sy = ey / n, lim = Math.min(n, Math.ceil(R / len * n));
        let x = cx, y = cy;
        for (let s = 0; s <= lim; s++) {
          const bx = Math.floor(x), by = Math.floor(y);
          if (bx < 0 || by < 0 || bx >= BW || by >= BH) break;
          const i = by * BW + bx;
          g[i] = 1;
          if (opq[i] || (smoke && smoke[i] && s > 2)) break;
          x += sx; y += sy;
        }
      }
    }
    const seen = this.csSeenOf(team);
    for (let i = 0; i < g.length; i++) if (g[i]) seen[i] = 1;
    // enemies that just went out of sight leave a marker where they were last seen
    const now = new Set(), gh = C.ghosts[team] || (C.ghosts[team] = []);
    for (const t of this.tanks) if (t.alive && t.player && t.player.csTeam !== team && this.csSees(team, t)) now.add(t.player.i);
    for (const i of v.shown) if (!now.has(i)) { const p = this.csP(i); if (p && p.tank) gh.push({ i, x: p.tank.x, y: p.tank.y, dir: p.tank.dir, at: this.frame }); }
    C.ghosts[team] = gh.filter(m => !now.has(m.i) && this.frame - m.at < 240 && this.frame >= m.at && this.csP(m.i) && !this.csP(m.i).out);
    v.shown = now;
    return g;
  },

  // is the block under (x, y) in sight of the team?
  csSeesAt(team, x, y) {
    const g = this.csVision(team), BW = COLS * 2, bx = x >> 3, by = y >> 3;
    return bx >= 0 && by >= 0 && bx < BW && by < ROWS * 2 && !!g[by * BW + bx];
  },
  // a tank is seen when any corner of it is
  csSees(team, t) {
    const g = this.cs.vis[team] && this.cs.vis[team].grid;
    if (!g) return false;
    const BW = COLS * 2;
    for (const [dx, dy] of [[2, 2], [13, 2], [2, 13], [13, 13]]) { const bx = (t.x + dx) >> 3, by = (t.y + dy) >> 3; if (g[by * BW + bx]) return true; }
    return false;
  },
  // can the viewer's screen show this tank?
  csShown(t) {
    const V = this.csViewer();
    return !V.team || !t.player || t.player.csTeam === V.team || (this.csVision(V.team), this.csSees(V.team, t));
  },
});

// ================================================================= drawing
// the bomb: a brick of explosive with a keypad, its light blinking (faster once it's armed)
function csDrawBomb(ctx, x, y, lit) {
  x = Math.round(x) - 5; y = Math.round(y) - 4;
  ctx.fillStyle = '#101010'; ctx.fillRect(x - 1, y - 1, 12, 9);
  ctx.fillStyle = '#B89C5C'; ctx.fillRect(x, y, 10, 7);
  ctx.fillStyle = '#7C6834'; ctx.fillRect(x, y + 2, 10, 1); ctx.fillRect(x, y + 5, 10, 1);
  ctx.fillStyle = '#3C3C3C'; ctx.fillRect(x + 2, y + 1, 5, 4);
  ctx.fillStyle = '#78C878'; ctx.fillRect(x + 3, y + 2, 3, 1);
  ctx.fillStyle = lit ? '#F83800' : '#5C1000'; ctx.fillRect(x + 8, y + 1, 2, 2);
}
const CS_MARK = [COL.gold, '#58D854', '#3CBCFC', '#F878C8'];
// a site's letter for the minimap (3 x 5, with a shadow)
const CS_LETTERS = { A: ['.X.', 'X.X', 'XXX', 'X.X', 'X.X'], B: ['XX.', 'X.X', 'XX.', 'X.X', 'XX.'] };
function csMiniLetter(k) {
  const key = 'csL' + k;
  let c = Sprites.cache.get(key);
  if (!c) {
    c = makeCanvas(4, 6);
    const x = c.getContext('2d');
    CS_LETTERS[k].forEach((r, j) => { for (let i = 0; i < 3; i++) if (r[i] === 'X') { x.fillStyle = '#000000'; x.fillRect(i + 1, j + 1, 1, 1); x.fillStyle = '#F83800'; x.fillRect(i, j, 1, 1); } });
    Sprites.cache.set(key, c);
  }
  return c;
}

Object.assign(Stage.prototype, {
  csTankOf(p) { return p ? this.tanks.find(t => t.alive && t.player === p) || null : null; },

  // under the tanks: the bomb on the ground, where the viewer's team can see it (everywhere, with no fog)
  csRenderWorld(ctx) {
    const C = this.cs, V = this.csViewer(), B = C.bomb;
    if (!B || !['dropped', 'planted', 'defused'].includes(B.state) || (V.team && !this.csSeesAt(V.team, B.x, B.y))) return;
    if (B.state === 'planted') {
      const pr = (this.frame % 40) / 40;
      ctx.strokeStyle = 'rgba(248,56,0,' + (0.6 * (1 - pr)).toFixed(2) + ')';
      ctx.strokeRect(B.x - 6 - pr * 10 + 0.5, B.y - 6 - pr * 10 + 0.5, 12 + pr * 20, 12 + pr * 20);
    }
    csDrawBomb(ctx, B.x, B.y, B.state === 'planted' ? C.flash > 0 : B.state === 'dropped' && (this.frame >> 4) & 1);
  },

  // smoke clouds: grey puffs rolling in place, thinning out at the end
  csRenderSmokes(ctx) {
    for (const f of this.cs.flashes || []) {
      if (f.t < CS_FLASH_FUSE) {
        // the grenade on the ground, its fuse blinking
        ctx.fillStyle = '#3C3C3C'; ctx.fillRect(Math.round(f.x) - 2, Math.round(f.y) - 2, 5, 5);
        ctx.fillStyle = (f.t >> 2) & 1 ? '#F8F8F8' : '#7C7C7C'; ctx.fillRect(Math.round(f.x) - 1, Math.round(f.y) - 1, 3, 3);
      } else {
        // the bang: a white burst, gone in a third of a second
        const k = (f.t - CS_FLASH_FUSE) / 20, r = 6 + k * 30;
        ctx.fillStyle = 'rgba(255,255,240,' + (0.9 * (1 - k)).toFixed(2) + ')';
        ctx.beginPath(); ctx.arc(f.x, f.y, r, 0, Math.PI * 2); ctx.fill();
      }
    }
    for (const s of this.cs.smokes) {
      const k = Math.min(1, s.t / 40, (CS_SMOKE_TIME - s.t) / 90), r = CS_SMOKE_R * k;
      if (r < 2) continue;
      for (let j = 0; j < 9; j++) {
        const a = j * 0.7 + s.t * 0.01, d = j ? r * 0.55 : 0, rr = Math.max(2, Math.round(r * (j ? 0.55 : 0.7)));
        const cx = Math.round(s.x + Math.cos(a) * d), cy = Math.round(s.y + Math.sin(a) * d * 0.8);
        ctx.fillStyle = j & 1 ? 'rgba(196,196,188,0.9)' : 'rgba(168,168,160,0.9)';
        for (let dy = -rr; dy <= rr; dy++) { const w = Math.floor(Math.sqrt(rr * rr - dy * dy)); ctx.fillRect(cx - w, cy + dy, 2 * w + 1, 1); }
      }
    }
  },

  // the fog of war, over the field (in the place of night and fog): unexplored black, explored dim
  csRenderFog(ctx) {
    const C = this.cs, V = this.csViewer(), camX = Math.round(this.camX || 0), camY = Math.round(this.camY || 0);
    this.csRenderSmokes(ctx);
    if (V.team) {
      const g = this.csVision(V.team), seen = this.csSeenOf(V.team), BW = COLS * 2, BH = ROWS * 2;
      if (!C.fogC || C.fogC.width !== BW || C.fogC.height !== BH) { C.fogC = makeCanvas(BW, BH); C.fogImg = C.fogC.getContext('2d').createImageData(BW, BH); C.fogStamp = null; }
      const stamp = V.team + C.vis[V.team].at;
      if (C.fogStamp !== stamp) {
        const d = C.fogImg.data;
        for (let i = 0; i < g.length; i++) {
          const o = i * 4, a = g[i] ? 0 : seen[i] ? 150 : 255;
          d[o] = a === 255 ? 0 : 14; d[o + 1] = a === 255 ? 0 : 9; d[o + 2] = a === 255 ? 0 : 4; d[o + 3] = a;
        }
        C.fogC.getContext('2d').putImageData(C.fogImg, 0, 0);
        C.fogStamp = stamp;
      }
      const x0 = Math.max(0, (camX >> 3) - 2), y0 = Math.max(0, (camY >> 3) - 2), w = Math.min(BW - x0, (VIEW_W >> 3) + 5), h = Math.min(BH - y0, (VIEW_H >> 3) + 5);
      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(C.fogC, x0, y0, w, h, x0 * 8, y0 * 8, w * 8, h * 8);
      ctx.restore();
      // where enemies were last seen, fading; shots heard where nobody can see
      for (const m of C.ghosts[V.team] || []) {
        const p = this.csP(m.i), age = this.frame - m.at;
        if (!p) continue;
        ctx.globalAlpha = Math.max(0, 0.7 - age / 340);
        ctx.drawImage(Sprites.outline(Sprites.tank('p0', 0, m.dir, csPalKey(p)), CS_COL[p.csTeam]), m.x - 1, m.y - 1);
        ctx.globalAlpha = 1;
        if ((this.frame >> 4) & 1) Font.draw(ctx, '?', m.x + 5, m.y + 4, CS_COL[p.csTeam]);
      }
      for (const n of C.noise) {
        if (n.team === V.team || this.csSeesAt(V.team, n.x, n.y)) continue;
        if (!this.tanks.some(t => t.alive && t.player && t.player.csTeam === V.team && Math.hypot(t.x + 8 - n.x, t.y + 8 - n.y) < CS_HEAR)) continue;
        const r = 2 + (n.t >> 2);
        ctx.fillStyle = n.t & 4 ? '#F8D838' : '#F83800';
        ctx.fillRect(n.x - r, n.y, r * 2 + 1, 1); ctx.fillRect(n.x, n.y - r, 1, r * 2 + 1);
      }
    }
    // the bomb out of sight: the terrorists always know where it is (where it can be seen it's drawn under the tanks)
    const B = C.bomb;
    if (B && V.team === 'T' && (B.state === 'dropped' || B.state === 'planted') && !this.csSeesAt('T', B.x, B.y)) csDrawBomb(ctx, B.x, B.y, B.state === 'planted' ? C.flash > 0 : (this.frame >> 4) & 1);
    // over the tanks you can see: the players' numbers, the bomb on its carrier (for the terrorists), plant and defuse bars
    for (const t of this.tanks) {
      const p = t.player;
      if (!t.alive || !p) continue;
      if (!p.bot && ROMAN[p.i]) Font.draw(ctx, ROMAN[p.i], t.x + 8 - ROMAN[p.i].length * 4 + 1, t.y - 9, COL.white);
      if (B && B.state === 'carried' && B.carrier === p.i && V.team !== 'CT') csDrawBomb(ctx, t.x + 8, t.y + (p.bot ? -5 : -15), false);
      const prog = B && B.state === 'carried' && B.carrier === p.i && B.plant ? B.plant / CS_PLANT_TIME
        : B && B.state === 'planted' && B.defuser === p.i && B.defuse ? B.defuse / (p.csKit ? CS_KIT_TIME : CS_DEFUSE_TIME) : 0;
      if (prog) {
        ctx.fillStyle = COL.black; ctx.fillRect(t.x - 1, t.y + 17, 18, 4);
        ctx.fillStyle = B.state === 'planted' ? CS_COL.CT : CS_COL.T; ctx.fillRect(t.x, t.y + 18, Math.round(16 * prog), 2);
      }
    }
  },

  // the minimap: what the team has explored, the sites, the team, the enemies in sight, where the bomb is
  csMinimap(ctx, camX, camY) {
    if (!Config.on('minimap')) return;
    const C = this.cs, V = this.csViewer(), mw = CS_W, mh = CS_H, x0 = VIEW_W - mw - 3, y0 = 3, BW = COLS * 2, MC = CS_MAPS[CS_MAPKEY].mini;
    if (!C.mini || this.frame - C.miniAt >= 12 || this.frame < C.miniAt) {
      C.miniAt = this.frame;
      if (!C.mini) { C.mini = makeCanvas(mw, mh); C.miniImg = C.mini.getContext('2d').createImageData(mw, mh); }
      const d = C.miniImg.data, g = V.team ? this.csVision(V.team) : null, seen = V.team ? this.csSeenOf(V.team) : null;
      for (let ty = 0; ty < mh; ty++) for (let tx = 0; tx < mw; tx++) {
        const o = (ty * mw + tx) * 4, b = (ty * 2) * BW + tx * 2, v = this.terrain[(ty * 4 + 1) * GW + tx * 4 + 1];
        let col = v === T_STEEL ? [92, 72, 44] : v === T_BRICK ? [150, 96, 40] : v === T_WATER ? [40, 60, 90]
          : csInZone('A', tx * 16 + 8, ty * 16 + 8) || csInZone('B', tx * 16 + 8, ty * 16 + 8) ? MC.site : MC.floor;
        if (seen && !seen[b] && !seen[b + 1] && !seen[b + BW] && !seen[b + BW + 1]) col = [0, 0, 0];
        else if (g && !g[b] && !g[b + 1] && !g[b + BW] && !g[b + BW + 1]) col = col.map(c => c * 0.55);
        d[o] = col[0]; d[o + 1] = col[1]; d[o + 2] = col[2]; d[o + 3] = 235;
      }
      C.mini.getContext('2d').putImageData(C.miniImg, 0, 0);
    }
    const under = this.tanks.some(t => t.alive && t.player && (!V.team || t.player.csTeam === V.team) && overlap(t.x - camX, t.y - camY, 16, 16, x0 - 4, y0 - 4, mw + 8, mh + 8));
    ctx.globalAlpha = under ? 0.35 : 0.92;
    ctx.fillStyle = '#7C7C7C'; ctx.fillRect(x0 - 1, y0 - 1, mw + 2, mh + 2);
    ctx.drawImage(C.mini, x0, y0);
    const s = 1 / 16, dot = (wx, wy, col, r = 1) => { ctx.fillStyle = col; ctx.fillRect(Math.round(x0 + wx * s) - (r >> 1), Math.round(y0 + wy * s) - (r >> 1), r + 1, r + 1); };
    for (const k of ['A', 'B']) { const [zx, zy, zw, zh] = CS_ZONES[k]; ctx.drawImage(csMiniLetter(k), Math.round(x0 + zx + zw / 2 - 2), Math.round(y0 + zy + zh / 2 - 3)); }
    ctx.fillStyle = '#F8F8F8';
    const vx = Math.round(x0 + camX * s), vy = Math.round(y0 + camY * s), vw = Math.round(VIEW_W * s), vh = Math.round(VIEW_H * s);
    ctx.fillRect(vx, vy, vw, 1); ctx.fillRect(vx, vy + vh - 1, vw, 1); ctx.fillRect(vx, vy, 1, vh); ctx.fillRect(vx + vw - 1, vy, 1, vh);
    for (const m of C.ghosts[V.team] || []) if ((this.frame >> 3) & 1) dot(m.x + 8, m.y + 8, '#9C9C9C');
    const B = C.bomb;
    if (B && B.state !== 'none' && B.state !== 'exploded' && (V.team !== 'CT' || (B.state !== 'carried' && this.csSeesAt('CT', B.x, B.y))) && (this.frame >> 3) & 1) dot(B.x, B.y, '#F83800', 2);
    if (B && B.state === 'planted' && V.team === 'CT' && (this.frame >> 4) & 1) {
      const [zx, zy, zw, zh] = CS_ZONES[B.site];
      ctx.strokeStyle = '#F83800'; ctx.strokeRect(x0 + zx + 0.5, y0 + zy + 0.5, zw - 1, zh - 1);
    }
    for (const t of this.tanks) {
      if (!t.alive || !t.player) continue;
      const mine = !V.team || t.player.csTeam === V.team, pal = PALS[csPalKey(t.player)];
      if (mine || this.csSees(V.team, t)) dot(t.x + 8, t.y + 8, mine && V.team ? (V.ps.includes(t.player) ? '#F8F8F8' : pal[1]) : pal[2]);
    }
    ctx.globalAlpha = 1;
  },

  // the side panel: who's left on each side, the bomb, your money and kit; the score and the clock above the field
  csRenderHud(ctx, H) {
    const C = this.cs, V = this.csViewer(), B = C.bomb;
    const sq = team => { const p = this.players.find(q => q.csTeam === team); return p ? C.score[p.csSquad] : 0; };
    Font.draw(ctx, 'T ' + sq('T'), FX, 0, CS_COL.Tdk);
    Font.drawRight(ctx, sq('CT') + ' CT', FX + VIEW_W, 0, CS_COL.CTdk);
    const secs = Math.ceil(C.clock / 60), clock = Math.floor(secs / 60) + ':' + String(secs % 60).padStart(2, '0');
    const mid = C.phase === 'buy' ? 'BUY ' + Math.ceil((CS_BUY_TIME - C.t) / 60) : C.phase === 'end' ? (C.winner === 'T' ? 'T WIN' : 'CT WIN')
      : B.state === 'planted' ? ((this.frame >> 3) & 1 ? 'BOMB' : '') : clock;
    Font.drawCenter(ctx, mid, FX + VIEW_W / 2, 0, C.phase === 'live' && (B.state === 'planted' || secs <= 10) ? '#A00000' : COL.black);
    Font.draw(ctx, 'T', H, 24, CS_COL.Tdk); Font.drawRight(ctx, this.csAlive('T').length, H + 24, 24, COL.black);
    Font.draw(ctx, 'CT', H, 34, CS_COL.CTdk); Font.drawRight(ctx, this.csAlive('CT').length, H + 24, 34, COL.black);
    // the bomb, for the terrorists: carried (blinking, steady when it's yours), down or planted
    if (V.team !== 'CT' && ['carried', 'dropped', 'planted'].includes(B.state) && (B.state !== 'carried' || (this.frame >> 4) & 1 || V.ps.some(p => p.i === B.carrier))) csDrawBomb(ctx, H + 8, 52, B.state === 'planted' && C.flash > 0);
    if (V.team === 'CT' && B.state === 'planted' && (this.frame >> 4) & 1) Font.draw(ctx, B.site, H + 8, 48, '#A00000');
    // each of your players: money, then plates, kit, smoke and mines as dots
    V.ps.slice(0, 4).forEach((p, k) => {
      const y = 62 + k * 28, t = this.csTankOf(p);
      Font.draw(ctx, ROMAN[p.i], H, y, t ? COL.black : '#3C3C3C');
      csMoneyText(ctx, p.csMoney || 0, H - 1, y + 9, '#004800', true);
      const kit = [];
      for (let j = 0; j < (t ? t.plates : 0); j++) kit.push('#BCBCBC');
      if (p.csKit) kit.push('#3CBCFC');
      for (let j = 0; j < (p.csSmokes || 0); j++) kit.push('#F8F8F8');
      for (let j = 0; j < (p.csFlashes || 0); j++) kit.push('#F8D838');
      for (let j = 0; j < Math.min(4, p.mines || 0); j++) kit.push('#3C3C3C');
      kit.slice(0, 8).forEach((c, j) => { ctx.fillStyle = COL.black; ctx.fillRect(H + j * 3, y + 18, 3, 4); ctx.fillStyle = c; ctx.fillRect(H + j * 3, y + 18, 2, 3); });
    });
    ctx.drawImage(Sprites.flag, H, 184);
    Font.drawRight(ctx, String(C.round), H + 16, 200, COL.black);
  },

  // words over the field: the kill feed, the round's news, what B does here, the buy menu, the end of the round
  csRenderBanner(ctx) {
    const C = this.cs, V = this.csViewer(), B = C.bomb, cx = VIEW_W >> 1;
    // flashed: the field goes white, fading back over the last second
    const blind = Math.max(0, ...V.ps.filter(p => this.csTankOf(p)).map(p => p.csBlind || 0));
    if (blind > 0) { ctx.fillStyle = 'rgba(255,255,248,' + Math.min(1, blind / 60).toFixed(2) + ')'; ctx.fillRect(0, 0, VIEW_W, VIEW_H); }
    C.feed.forEach((f, k) => {
      const kp = this.csP(f.k), vp = this.csP(f.v), y = 4 + k * 10, a = kp ? csName(kp) : '', b = csName(vp);
      const w = (a.length + b.length + (a ? 3 : 2)) * 8 + 2;
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(2, y - 1, w, 9);
      if (kp) Font.draw(ctx, a, 4, y, CS_COL[kp.csTeam]);
      Font.draw(ctx, f.w, 4 + (a ? a.length + 1 : 0) * 8, y, COL.white);
      if (vp) Font.draw(ctx, b, 4 + (a ? a.length + 3 : 2) * 8, y, CS_COL[vp.csTeam]);
    });
    let y = 70;
    for (const n of C.notes) {
      if (n.team && V.team && n.team !== V.team) continue;
      if (n.t < n.life - 30 || (n.t >> 2) & 1) Font.drawCenter(ctx, n.text, cx, y, n.color);
      y += 11;
    }
    // what B does for you here
    const me = V.ps.map(p => this.csTankOf(p)).find(t => t);
    if (me && C.phase === 'live') {
      const p = me.player;
      let hint = '';
      if (B.state === 'carried' && B.carrier === p.i) hint = this.csSiteAt(me.x + 8, me.y + 8) ? (B.plant ? 'PLANTING...' : 'HOLD B STILL TO PLANT') : '';
      else if (B.state === 'planted' && p.csTeam === 'CT' && Math.hypot(me.x + 8 - B.x, me.y + 8 - B.y) < 16) hint = B.defuser === p.i && B.defuse ? 'DEFUSING...' : 'HOLD B STILL TO DEFUSE';
      if (hint) Font.drawCenter(ctx, hint, cx, VIEW_H - 24, COL.gold);
    }
    // the fallen watch a teammate
    const dead = V.ps.find(p => !this.csTankOf(p));
    if (dead && !me && C.phase !== 'buy') {
      const sp = this.csP(dead.csSpec);
      if (V.out) {
        Font.drawCenter(ctx, 'YOUR TEAM IS OUT', cx, VIEW_H - 22, COL.white);
        if ((this.frame >> 5) & 1) Font.drawCenter(ctx, 'ARROWS: LOOK  FIRE: NEXT TANK', cx, VIEW_H - 12, COL.lgrey);
      } else {
        Font.drawCenter(ctx, sp && this.csTankOf(sp) ? 'WATCHING ' + csName(sp) : 'YOUR TEAM IS OUT', cx, VIEW_H - 12, COL.white);
        const take = sp && sp.bot && !dead.csTook && C.phase === 'live';
        if (sp && (this.frame >> 5) & 1) Font.drawCenter(ctx, take ? 'FIRE: NEXT  B: TAKE OVER' : 'FIRE: NEXT', cx, VIEW_H - 22, take ? COL.gold : COL.lgrey);
      }
    }
    if (C.phase === 'buy' && V.ps.some(p => this.csTankOf(p))) this.csRenderBuy(ctx);
    if (C.phase === 'end') this.csRenderEnd(ctx);
    else if (Input.down.has('Tab')) this.csRenderBoard(ctx, 24);
  },

  csRenderBuy(ctx) {
    const C = this.cs, V = this.csViewer(), w = Math.min(VIEW_W - 6, 208), x = (VIEW_W - w) >> 1, y = 4, rh = 10, h = 34 + CS_BUY.length * rh + 12;
    const ps = V.ps.filter(p => this.csTankOf(p)), me = ps[0];
    ctx.fillStyle = 'rgba(0,0,0,0.82)'; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = CS_COL[me.csTeam]; ctx.fillRect(x, y, w, 1); ctx.fillRect(x, y + h - 1, w, 1);
    Font.draw(ctx, 'BUY', x + 4, y + 4, COL.gold);
    Font.drawRight(ctx, '0:' + String(Math.max(0, Math.ceil((CS_BUY_TIME - C.t) / 60))).padStart(2, '0'), x + w - 4, y + 4, COL.lgrey);
    ps.forEach((p, k) => {
      const bx = x + 4 + k * 50;
      Font.draw(ctx, ROMAN[p.i], bx, y + 15, CS_MARK[k]);
      csMoneyText(ctx, p.csMoney, bx + ROMAN[p.i].length * 8 + 2, y + 15, '#58D854');
      if (C.buy[p.i] && C.buy[p.i].ready) Font.draw(ctx, '!', bx + 42, y + 15, '#58D854');
    });
    CS_BUY.forEach((it, j) => {
      const ry = y + 28 + j * rh, why = this.csBuyStatus(me, it), here = ps.filter(p => (C.buy[p.i] || { idx: 0 }).idx === j);
      if (here.length) { ctx.fillStyle = 'rgba(248,248,248,0.14)'; ctx.fillRect(x + 1, ry - 1, w - 2, rh - 1); }
      here.forEach(p => { const k = ps.indexOf(p); Font.draw(ctx, '>', x + 2 + k * 4, ry, CS_MARK[k]); });
      const col = it.id === 'go' ? '#58D854' : why ? '#6C6C6C' : COL.white;
      Font.draw(ctx, it.id === 'go' && C.buy[me.i] && C.buy[me.i].ready ? 'READY!' : it.name, x + 20, ry, col);
      if (it.price) csMoneyText(ctx, it.price, x + w - 30, ry, why === 'NO MONEY' ? '#A83800' : why ? '#6C6C6C' : '#F8D878');
    });
    const b = C.buy[me.i] || { idx: 0 }, it = CS_BUY[b.idx], msg = b.msgT > 0 && b.msg ? b.msg : this.csBuyStatus(me, it);
    Font.drawCenter(ctx, msg && it.id !== 'go' ? msg : it.desc, x + w / 2, y + h - 11, msg && it.id !== 'go' ? '#F87858' : COL.lgrey);
  },

  // the end of the round: who won and how, the MVP, and the scoreboard under it
  csRenderEnd(ctx) {
    const C = this.cs, cx = VIEW_W >> 1, y = 6;
    ctx.fillStyle = 'rgba(0,0,0,0.78)'; ctx.fillRect(0, y, VIEW_W, 40);
    if (C.t > 8 || (C.t >> 1) & 1) Font.drawCenter(ctx, C.winner === 'T' ? 'TERRORISTS WIN' : 'COUNTER-TERRORISTS WIN', cx, y + 4, CS_COL[C.winner]);
    Font.drawCenter(ctx, CS_WHY[C.why] || '', cx, y + 15, COL.white);
    const mvp = this.csP(C.mvp);
    if (mvp) Font.drawCenter(ctx, 'MVP: ' + csName(mvp) + (mvp.csRoundK ? ', ' + mvp.csRoundK + (mvp.csRoundK > 1 ? ' KILLS' : ' KILL') : ''), cx, y + 27, COL.gold);
    if (C.t > 50) this.csRenderBoard(ctx, y + 44);
  },

  // the scoreboard: both teams, kills, deaths, MVPs, and your own team's money
  csRenderBoard(ctx, y) {
    const C = this.cs, V = this.csViewer(), w = Math.min(VIEW_W - 4, 204), x = (VIEW_W - w) >> 1;
    const teams = ['T', 'CT'].map(team => this.players.filter(p => p.csTeam === team).sort((a, b) => (b.csK || 0) - (a.csK || 0) || (a.csD || 0) - (b.csD || 0)));
    const h = 16 + teams.reduce((a, l) => a + 12 + l.length * 9, 0);
    ctx.fillStyle = 'rgba(0,0,0,0.84)'; ctx.fillRect(x, y, w, h);
    Font.draw(ctx, 'ROUND ' + C.round, x + 4, y + 3, COL.lgrey);
    Font.draw(ctx, 'K', x + w - 104, y + 3, COL.lgrey); Font.draw(ctx, 'D', x + w - 80, y + 3, COL.lgrey); Font.draw(ctx, '*', x + w - 56, y + 3, COL.gold);
    let yy = y + 15;
    ['T', 'CT'].forEach((team, k) => {
      const sq = (teams[k][0] || {}).csSquad;
      Font.draw(ctx, team === 'T' ? 'TERRORISTS' : 'COUNTER-T.', x + 4, yy, CS_COL[team]);
      Font.drawRight(ctx, sq === undefined ? 0 : C.score[sq], x + w - 4, yy, CS_COL[team]);
      yy += 11;
      for (const p of teams[k]) {
        const dead = !this.csTankOf(p), col = dead ? '#6C6C6C' : p.bot ? COL.white : COL.gold;
        Font.draw(ctx, csName(p).slice(0, 8), x + 8, yy, col);
        Font.drawRight(ctx, p.csK || 0, x + w - 96, yy, col);
        Font.drawRight(ctx, p.csD || 0, x + w - 72, yy, col);
        if (p.csMvp) Font.drawRight(ctx, p.csMvp, x + w - 48, yy, COL.gold);
        if (!V.team || team === V.team) csMoneyText(ctx, p.csMoney || 0, x + w - 36, yy, dead ? '#3C6C3C' : '#58D854');
        yy += 9;
      }
      yy += 1;
    });
  },

  // the screen follows your tank; once it's gone, the teammate you watch (a match of bots only: the bomb)
  csCamera() {
    const V = this.csViewer();
    if (V.out && this.cs.phase === 'live') return this.csFreeCamera(V);
    let ts = V.ps.map(p => this.csTankOf(p)).filter(Boolean);
    if (ts.length > 1) {
      const xs = ts.map(t => t.x), ys = ts.map(t => t.y);
      if (Math.max(...xs) - Math.min(...xs) > VIEW_W - 48 || Math.max(...ys) - Math.min(...ys) > VIEW_H - 48) ts = [ts[0]];
    }
    if (!ts.length) for (const p of V.ps) { const t = this.csTankOf(this.csP(p.csSpec)); if (t) { ts = [t]; break; } }
    if (!ts.length && !V.ps.length) {
      const B = this.cs.bomb, c = this.csTankOf(this.csP(B.carrier)) || (B.state === 'planted' || B.state === 'dropped' ? { x: B.x - 8, y: B.y - 8 } : this.tanks.find(t => t.alive));
      if (c) ts = [c];
    }
    let fx, fy;
    if (ts.length) { fx = ts.reduce((a, t) => a + t.x + 8, 0) / ts.length; fy = ts.reduce((a, t) => a + t.y + 8, 0) / ts.length; }
    else if (this.camX !== undefined) return [Math.round(this.camX), Math.round(this.camY)];
    else { const [zx, zy, zw, zh] = CS_ZONES[V.team || 'T']; fx = (zx + zw / 2) * 16; fy = (zy + zh / 2) * 16; }
    const tx = Math.max(0, Math.min(FW - VIEW_W, fx - VIEW_W / 2)), ty = Math.max(0, Math.min(FH - VIEW_H, fy - VIEW_H / 2));
    if (this.camX === undefined) { this.camX = tx; this.camY = ty; }
    const far = Math.hypot(tx - this.camX, ty - this.camY) > VIEW_W;
    this.camX += (tx - this.camX) * (far ? 0.35 : 0.2);
    this.camY += (ty - this.camY) * (far ? 0.35 : 0.2);
    return [Math.round(this.camX), Math.round(this.camY)];
  },

  // the team's out: arrows move the camera round the map, FIRE jumps to the next tank still in it (and follows it
  // till the arrows take over again); read here so an online guest's own keys work too
  csFreeCamera(V) {
    const C = this.cs, me = V.ps[0], inp = Net.role === 'client' ? Input.player(0) : me ? Input.player(me.i) : null;
    const F = C.free || (C.free = { x: this.camX || 0, y: this.camY || 0, follow: -1, fire: false });
    if (inp) {
      if (inp.dir >= 0) { F.follow = -1; F.x += DXY[inp.dir][0] * 4; F.y += DXY[inp.dir][1] * 4; }
      if (inp.fire && !F.fire) {
        const alive = this.tanks.filter(t => t.alive && t.player);
        if (alive.length) { const k = alive.findIndex(t => t.player.i === F.follow); F.follow = alive[(k + 1) % alive.length].player.i; }
      }
      F.fire = !!inp.fire;
    }
    const ft = F.follow >= 0 ? this.csTankOf(this.csP(F.follow)) : null;
    if (ft) { F.x += (ft.x + 8 - VIEW_W / 2 - F.x) * 0.2; F.y += (ft.y + 8 - VIEW_H / 2 - F.y) * 0.2; }
    F.x = Math.max(0, Math.min(FW - VIEW_W, F.x)); F.y = Math.max(0, Math.min(FH - VIEW_H, F.y));
    this.camX = F.x; this.camY = F.y;
    return [Math.round(F.x), Math.round(F.y)];
  },

  // online: what a guest needs on top of the stage view (tanks, shells and terrain come with it)
  csView() {
    const C = this.cs, B = C.bomb;
    return { mp: CS_MAPKEY, ph: C.phase, t: C.t, ck: C.clock, fl: C.flash, w: C.winner, why: C.why, mvp: C.mvp, rd: C.round, hf: C.half, sc: C.score, tg: C.target, id: C.id,
      b: [B.state, B.carrier, Math.round(B.x), Math.round(B.y), B.site, B.timer, B.plant, B.planter, B.defuse, B.defuser],
      fd: C.feed, nt: C.notes, sm: C.smokes.map(s => [Math.round(s.x), Math.round(s.y), s.t]), nz: C.noise.map(n => [n.x, n.y, n.team, n.t]),
      by: Object.keys(C.buy).map(i => [+i, C.buy[i].idx, C.buy[i].ready ? 1 : 0, C.buy[i].msgT > 0 ? C.buy[i].msg : '']),
      mt: this.mines.map(m => (m.owner && m.owner.player ? m.owner.player.csTeam : '')),
      pl: this.players.map(p => [p.i, p.csTeam, p.csSquad, p.csMoney, p.csK, p.csD, p.csMvp, p.csKit ? 1 : 0, p.csSmokes || 0, p.csName || '', p.csRoundK || 0, p.csSpec, p.mines || 0, p.csFlashes || 0, p.csBlind || 0]),
      fb: (C.flashes || []).map(f => [Math.round(f.x), Math.round(f.y), f.t]) };
  },
  applyCsView(v) {
    const C = this.cs || (this.cs = { vis: {}, ghosts: { T: [], CT: [] } });
    if (v.mp) csUseMap(v.mp);
    Object.assign(C, { phase: v.ph, t: v.t, clock: v.ck, flash: v.fl, winner: v.w, why: v.why, mvp: v.mvp, round: v.rd, half: v.hf, score: v.sc, target: v.tg, id: v.id,
      feed: v.fd, notes: v.nt, smokes: v.sm.map(a => ({ x: a[0], y: a[1], t: a[2] })), flashes: (v.fb || []).map(a => ({ x: a[0], y: a[1], t: a[2] })), noise: v.nz.map(a => ({ x: a[0], y: a[1], team: a[2], t: a[3] })) });
    const b = v.b;
    C.bomb = { state: b[0], carrier: b[1], x: b[2], y: b[3], site: b[4], timer: b[5], plant: b[6], planter: b[7], defuse: b[8], defuser: b[9] };
    C.buy = {};
    for (const a of v.by) C.buy[a[0]] = { idx: a[1], ready: !!a[2], msg: a[3], msgT: a[3] ? 1 : 0 };
    this.mines.forEach((m, k) => { m.team = v.mt[k] || ''; });
    for (const a of v.pl) {
      const p = this.players.find(q => q.i === a[0]);
      if (p) Object.assign(p, { csTeam: a[1], csSquad: a[2], csMoney: a[3], csK: a[4], csD: a[5], csMvp: a[6], csKit: !!a[7], csSmokes: a[8], csName: a[9] || undefined, csRoundK: a[10], csSpec: a[11], mines: a[12], csFlashes: a[13] || 0, csBlind: a[14] || 0 });
    }
    this.vs = 'cs'; this.noBase = true; this.hardSteel = true; this.weather = null;
  },
});

// ================================================================= the team screen and the match's end (Game)
Object.assign(Game, {
  // DE_DUST2 small (a pixel a tile), for the team screen
  csThumb() {
    const all = this.csThumbs || (this.csThumbs = {});
    if (all[CS_MAPKEY]) return all[CS_MAPKEY];
    const c = makeCanvas(CS_W, CS_H), g = c.getContext('2d');
    for (let ty = 0; ty < CS_H; ty++) for (let tx = 0; tx < CS_W; tx++) {
      const ch = CS_MAP[ty][tx], x = tx * 16 + 8, y = ty * 16 + 8;
      g.fillStyle = CS_THUMB_COL[ch] || ch === '#' ? CS_THUMB_COL[ch] || '#3C2C18' : ch === 'x' || ch === 'd' ? '#8C5820' : csInZone('A', x, y) || csInZone('B', x, y) ? '#D89870' : csInZone('T', x, y) ? '#C8A060' : csInZone('CT', x, y) ? '#A8B0B8' : 'rgb(' + CS_MAPS[CS_MAPKEY].mini.floor + ')';
      g.fillRect(tx, ty, 1, 1);
    }
    for (const k of ['A', 'B']) { const [zx, zy, zw, zh] = CS_ZONES[k]; g.drawImage(csMiniLetter(k), zx + zw / 2 - 2, zy + zh / 2 - 3); }
    return (all[CS_MAPKEY] = c);
  },

  csTeamsRender(ctx) {
    const C = this.curtain.cs, ox = (SCREEN_W - SW) >> 1, oy = (SCREEN_H - SH) >> 1, t = this.t;
    ctx.fillStyle = '#140E08'; ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
    ctx.save(); ctx.translate(ox, oy);
    Font.drawCenter(ctx, 'COUNTER-STRIKE', SW / 2, 8, COL.gold);
    const rand = C.map === 'random';
    if (!rand) csUseMap(C.map);
    Font.drawCenter(ctx, rand ? 'A MAP AT RANDOM' : CS_MAPS[CS_MAPKEY].label, SW / 2, 19, COL.lgrey);
    // the map between the two teams
    const mx = 96 + ((64 - (rand ? 64 : CS_W)) >> 1);
    ctx.fillStyle = '#5C4428'; ctx.fillRect(mx - 1, 37, (rand ? 64 : CS_W) + 2, (rand ? 60 : CS_H) + 2);
    if (rand) { ctx.fillStyle = '#2C2014'; ctx.fillRect(mx, 38, 64, 60); Font.big(ctx, '?', mx + 24, 56, 2, COL.gold); }
    else ctx.drawImage(this.csThumb(), mx, 38);
    const guest = Net.role === 'client' ? Net.slot : -1;
    ['T', 'CT'].forEach((side, k) => {
      const x = k ? 168 : 8, col = CS_COL[side];
      Font.draw(ctx, side === 'T' ? 'TERRORISTS' : 'COUNTER-', x, 36, col);
      if (side === 'CT') Font.draw(ctx, 'TERRORISTS', x, 45, col);
      Font.draw(ctx, side === 'T' ? 'PLANT' : 'DEFUSE', x, side === 'T' ? 46 : 55, '#7C7C7C');
      const humans = [];
      for (const g of C.groups) if (g.side === side) for (const i of g.members) humans.push([i, g.ready]);
      const size = Math.max(C.size, humans.length);
      for (let s = 0; s < size; s++) {
        const y = 66 + s * 15, h = humans[s];
        ctx.drawImage(Sprites.tank('p0', (t >> 3) & 1 && h ? 1 : 0, k ? 3 : 1, side === 'T' ? 'csT' : 'csCT'), x, y - 4);
        if (h) {
          const me = h[0] === guest || (guest < 0 && !Input.remote[h[0]]);
          Font.draw(ctx, ROMAN[h[0]] + (h[0] === guest ? ' YOU' : ''), x + 20, y, h[1] ? '#58D854' : me && (t >> 4) & 1 ? COL.white : COL.gold);
          if (h[1]) Font.draw(ctx, '!', x + 72, y, '#58D854');
        } else Font.draw(ctx, 'BOT', x + 20, y, '#6C6C6C');
      }
    });
    // the options (the players at the host's computer set them)
    const local = C.groups.find(g => g.local);
    const rows = [['SIDE', local ? (local.side === 'T' ? 'TERRORISTS' : 'COUNTER-T.') : '-'], ['MAP', rand ? 'RANDOM' : CS_MAPS[CS_MAPKEY].name],
      ['ROUNDS TO WIN', String(C.target)], ['TEAM SIZE', C.size + ' V ' + C.size]];
    rows.forEach(([label, val], r) => {
      const y = 142 + r * 12, sel = guest < 0 && r === C.row;
      if (sel) Font.draw(ctx, '>', 24, y, COL.gold);
      Font.draw(ctx, label, 36, y, COL.white);
      Font.draw(ctx, (sel ? '<' : ' ') + val + (sel ? '>' : ''), 148, y, r === 0 && local ? CS_COL[local.side] : COL.gold);
    });
    const wait = C.groups.filter(g => !g.ready).map(g => ROMAN[g.members[0]]);
    Font.drawCenter(ctx, guest >= 0 ? 'LEFT/RIGHT: SIDE  FIRE: READY' : 'ARROWS: CHANGE  FIRE: READY', SW / 2, 192, COL.lgrey);
    if (C.groups.length > 1 && wait.length && (t >> 5) & 1) Font.drawCenter(ctx, 'WAITING FOR ' + wait.join(' '), SW / 2, 204, '#7C7C7C');
    ctx.restore();
  },

  // the match is over: the score, both teams' kills, deaths and MVPs, your record
  csRenderResult(ctx) {
    const r = this.vsRes, t = this.t, w = r.squad;
    ctx.fillStyle = COL.black; ctx.fillRect(0, 0, SW, SH);
    Font.drawCenter(ctx, 'COUNTER-STRIKE', SW / 2, 12, COL.red);
    const head = r.mine >= 0 ? (r.won ? 'YOUR TEAM WINS THE MATCH!' : 'YOUR TEAM LOST THE MATCH') : (r.side === 'T' ? 'TERRORISTS' : 'COUNTER-TERRORISTS') + ' WIN';
    if ((t >> 4) & 1 || t > 90) Font.drawCenter(ctx, head, SW / 2, 30, r.mine < 0 || r.won ? COL.gold : COL.white);
    Font.big(ctx, r.score[w] + ':' + r.score[1 - w], (SW - Font.bigWidth(r.score[w] + ':' + r.score[1 - w], 2)) >> 1, 44, 2, CS_COL[r.side]);
    Font.draw(ctx, 'K', 160, 66, COL.lgrey); Font.draw(ctx, 'D', 184, 66, COL.lgrey); Font.draw(ctx, '*', 208, 66, COL.gold);
    let y = 66;
    for (const sq of [w, 1 - w]) {
      const side = csSide(sq, r.half);
      Font.draw(ctx, sq === w ? 'WINNERS' : 'LOSERS', 16, y, CS_COL[side]);
      y += 11;
      for (const row of r.rows.filter(q => q.squad === sq).sort((a, b) => b.k - a.k)) {
        Font.draw(ctx, row.name.slice(0, 10), 24, y, row.bot ? COL.white : COL.gold);
        Font.drawRight(ctx, row.k, 168, y, COL.white); Font.drawRight(ctx, row.d, 192, y, COL.white);
        if (row.mvp) Font.drawRight(ctx, row.mvp, 216, y, COL.gold);
        y += 9;
      }
      y += 3;
    }
    if (r.rec) Font.drawCenter(ctx, csTitleLine({ cs: r.rec }), SW / 2, 196, COL.lgrey);
    if (t > 90) Font.drawCenter(ctx, 'PRESS ENTER', SW / 2, 210, COL.lgrey);
  },
});

// ================================================================= hooks into the stage and the game
(() => {
  const P = Stage.prototype;
  // the round instead of the versus rules; deaths are for good
  const updateVersus = P.updateVersus;
  P.updateVersus = function () { if (this.cs) this.csUpdate(); else updateVersus.call(this); };
  const vsDeath = P.vsDeath;
  P.vsDeath = function (t, by) { if (this.cs) this.csDeath(t, by); else vsDeath.call(this, t, by); };
  // friendly fire is off: a teammate's shell stops on you and does nothing
  const hitPlayer = P.hitPlayer;
  P.hitPlayer = function (t, by) {
    if (this.cs && by && by.player && t.player && by.player !== t.player && by.player.csTeam === t.player.csTeam) return;
    if (this.cs && this.cs.phase === 'buy') return;
    return hitPlayer.call(this, t, by);
  };
  // the weapons pick their targets among the enemies your team can see
  const weaponFoes = P.weaponFoes;
  P.weaponFoes = function (att) {
    const foes = weaponFoes.call(this, att);
    if (!this.cs || !att || !att.player) return foes;
    const team = att.player.csTeam;
    return foes.filter(o => o.player && o.player.csTeam !== team && this.csSees(team, o));
  };
  // shots are heard (the other side sees where in the fog, if one of them is near enough)
  const fire = P.fire;
  P.fire = function (t) {
    const ok = fire.call(this, t);
    if (this.cs && ok && t.player) this.cs.noise.push({ x: t.x + 8, y: t.y + 8, team: t.player.csTeam, t: 0 });
    return ok;
  };
  const fireWeapon = P.fireWeapon;
  P.fireWeapon = function (t, p, pressed, held) {
    const cd = t.wcool;
    fireWeapon.call(this, t, p, pressed, held);
    if (this.cs && (t.wcool > cd || t.flame)) this.cs.noise.push({ x: t.x + 8, y: t.y + 8, team: p.csTeam, t: 0 });
  };
  // mines go off under the other team only
  const updateMines = P.updateMines;
  P.updateMines = function () {
    if (!this.cs) return updateMines.call(this);
    for (const m of this.mines) {
      if (++m.t < MINE_ARM_TIME) continue;
      const team = m.owner && m.owner.player ? m.owner.player.csTeam : '';
      if (this.tanks.some(t => t.alive && t.player && t.player.csTeam !== team && overlap(t.x, t.y, 16, 16, m.x - 4, m.y - 4, 8, 8))) { m.done = true; this.blast(m.x, m.y, MINE_RADIUS, true, m.owner, false); }
    }
    this.mines = this.mines.filter(m => !m.done);
  };
  // the buy time: the tanks hold still while their drivers shop
  const updatePlayer = P.updatePlayer;
  P.updatePlayer = function (t) {
    if (this.cs && this.cs.phase === 'buy') { t.moving = false; return; }
    updatePlayer.call(this, t);
  };
  // the bots of this mode drive themselves (csbots.js); B is for the bomb before it's for a shot
  const botInput = P.botInput;
  P.botInput = function (t) {
    if (!this.cs) return botInput.call(this, t);
    return this.csInput(t.player, this.csBotInput(t));
  };
  const input = Input.player;
  Input.player = function (i) {
    const inp = input.call(this, i), st = Game.stage;
    if (!st || !st.cs || Game.state !== 'play' || Net.role === 'client') return inp;
    const p = st.csP(i);
    return p && !p.bot && p.tank ? st.csInput(p, inp) : inp;
  };
  // what your team can't see isn't drawn: enemy tanks, shells and missiles out of sight, their mines
  const render = P.render;
  P.render = function (ctx) {
    if (!this.cs) return render.call(this, ctx);
    const V = this.csViewer();
    if (!V.team) return render.call(this, ctx);
    const keep = [this.tanks, this.bullets, this.wshots, this.mines];
    this.csVision(V.team);
    this.tanks = keep[0].filter(t => !t.player || t.player.csTeam === V.team || this.csSees(V.team, t));
    this.bullets = keep[1].filter(b => this.csSeesAt(V.team, b.x + 2, b.y + 2));
    this.wshots = keep[2].filter(m => this.csSeesAt(V.team, m.x, m.y));
    this.mines = keep[3].filter(m => (m.owner && m.owner.player ? m.owner.player.csTeam : m.team) === V.team);
    try { render.call(this, ctx); } finally { [this.tanks, this.bullets, this.wshots, this.mines] = keep; }
  };
  const renderVs = P.renderVs;
  P.renderVs = function (ctx) { if (this.cs) this.csRenderWorld(ctx); else renderVs.call(this, ctx); };
  const darkness = P.renderDarkness;
  P.renderDarkness = function (ctx) { if (this.cs) this.csRenderFog(ctx); else darkness.call(this, ctx); };
  const minimap = P.renderMinimap;
  P.renderMinimap = function (ctx, camX, camY) { if (this.cs) this.csMinimap(ctx, camX, camY); else minimap.call(this, ctx, camX, camY); };
  const banner = P.renderModeBanner;
  P.renderModeBanner = function (ctx) { if (this.cs) this.csRenderBanner(ctx); else banner.call(this, ctx); };
  const vsHud = P.renderVsHud;
  P.renderVsHud = function (ctx, H) { if (this.cs) this.csRenderHud(ctx, H); else vsHud.call(this, ctx, H); };
  const camera = P.camera;
  P.camera = function () { return this.cs ? this.csCamera() : camera.call(this); };
  // the weapons in the left border: yours only (there are ten tanks)
  const badges = P.renderWeaponBadges;
  P.renderWeaponBadges = function (ctx) {
    if (!this.cs) return badges.call(this, ctx);
    const all = this.players;
    this.players = this.csViewer().ps.filter(p => this.csTankOf(p));
    try { badges.call(this, ctx); } finally { this.players = all; }
  };
  // every tank alike: the classic engine and reload, stars only for the shells (no XP perks in a match)
  const applyLevel = Tank.prototype.applyLevel;
  Tank.prototype.applyLevel = function () {
    applyLevel.call(this);
    if (typeof Game === 'undefined' || Game.mode !== 'cs' || !this.player) return;
    const lv = this.player.level || 0;
    this.speed = 0.75 * Config.scale('pSpeed');
    this.bulletSpeed = (lv >= 1 ? 4.5 : 2.5) * Config.scale('pShell');
    this.reload = 14;
  };
  // the teams' colours on every tank, whoever drives it
  const pal = Config.playerPal;
  Config.playerPal = function (i) {
    if (typeof Game !== 'undefined' && Game.mode === 'cs' && Game.stage && Game.stage.cs && Game.players) {
      const p = Game.players.find(q => q.i === i);
      if (p && p.csTeam) return csPalKey(p);
      if (i > 3) return 'csT';   // a bot of a match being set up (there are no colour settings past IV)
    }
    return pal.call(this, i);
  };
  const name = playerName;
  playerName = p => (p && p.csName) || name(p);   // eslint-disable-line no-global-assign

  // ------------------------------------------------------------ the game around it
  const G = Game;
  const newGame = G.newGame;
  G.newGame = function () {
    newGame.apply(this, arguments);
    if (this.mode === 'cs') this.csNewGame();
  };
  const beginStage = G.beginStage;
  G.beginStage = function () { if (this.mode === 'cs' && this.csMatch) this.csBeginRound(); else beginStage.apply(this, arguments); };
  const updateCurtain = G.updateCurtain;
  G.updateCurtain = function () {
    const c = this.curtain;
    if (c && c.cs && c.phase === 'show') this.csTeamsUpdate(); else updateCurtain.call(this);
  };
  const renderCurtain = G.renderCurtain;
  G.renderCurtain = function (ctx) {
    const c = this.curtain;
    if (c && c.cs && c.phase === 'show') this.csTeamsRender(ctx); else renderCurtain.call(this, ctx);
  };
  // a round won: on to the next (the round's own banner was its result screen)
  const updatePlay = G.updatePlay;
  G.updatePlay = function () {
    updatePlay.call(this);
    const st = this.stage;
    if (this.mode === 'cs' && this.state === 'play' && st && st.cs && st.cs.next && !this.paused) { st.cs.next = false; this.csNextRound(); }
  };
  const restartRound = G.restartRound;
  G.restartRound = function () {
    if (this.mode === 'cs' && this.roundSave && this.roundSave.csM) this.csMatch = JSON.parse(JSON.stringify(this.roundSave.csM));
    restartRound.call(this);
  };
  const updateVsResult = G.updateVsResult;
  G.updateVsResult = function () {
    if (!this.vsRes || this.vsRes.mode !== 'cs') return updateVsResult.call(this);
    if (this.t > 30 && (Input.menu().ok || this.t > 1200)) { this.stage = null; this.csMatch = null; this.toTitle(); this.titleY = 0; }
  };
  const renderVsResult = G.renderVsResult;
  G.renderVsResult = function (ctx) { if (this.vsRes && this.vsRes.mode === 'cs') this.csRenderResult(ctx); else renderVsResult.call(this, ctx); };

  // online: the round's state goes to the guests with the stage
  const stageView = Net.stageView;
  Net.stageView = function (st, full) {
    const v = stageView.call(this, st, full);
    if (st.cs) v.csx = st.csView();
    return v;
  };
  const applyStage = Net.applyStage;
  Net.applyStage = function (sv) {
    if (sv.csx && sv.csx.mp) csUseMap(sv.csx.mp);   // the map's size and look before the stage is built
    applyStage.call(this, sv);
    if (sv.csx && Game.stage) Game.stage.applyCsView(sv.csx);
    else if (Game.stage) Game.stage.cs = null;
  };

  // the tune: WAR MACHINE (the military march), chiptune and rock
  SONGS.cs = SONGS.bossWar;
  ROCK_ALIAS.cs = 'bossWar';
})();
