'use strict';
// =====================================================================
//  ASTRO TANKS: the upgrades and the HANGAR between waves (the game itself is astro.js).
//    - crystals picked up in the waves buy upgrades with levels; each player shops for their own tank.
//    - the hangar offers four upgrades at a time, at random from those not maxed (a player who's out of tanks always
//      gets SPARE TANK first: buy one to come back in). REROLL deals four new ones (the first each visit is free);
//      after a boss the first buy is free. FIRE buys, B (or picking READY) says you're done, ENTER starts the wave.
//    - what you buy shows on the tank: guns and barrels, armour skirts (they come off as plates are lost), the rear
//      gun, exhaust pipes, a radar dish, antennas, fins, the bomb rack, the warp core.
// =====================================================================

// icons: 8x8, '1' main colour, '2' dark, '3' white
const ASTRO_UPS = [
  { key: 'guns', name: 'CANNONS', max: 3, base: 20, step: 26, col: '#F8D030', w: 1.3,
    lv: ['TWIN CANNON', 'TRIPLE SPREAD', 'QUAD BATTERY'], desc: ['TWO SHELLS SIDE BY SIDE', 'THREE SHELLS IN A FAN', 'TWIN GUNS PLUS A WIDE FAN'],
    icon: ['..1..1..', '..1..1..', '..1..1..', '.222222.', '.211112.', '.211112.', '.222222.', '........'] },
  { key: 'rapid', name: 'AUTOLOADER', max: 4, base: 12, step: 12, col: '#F89800',
    desc: ['FASTER RELOAD, ONE MORE SHELL IN THE AIR'], icon: ['.1...1..', '.1...1..', '111.111.', '........', '...1...1', '...1...1', '..111.111', '........'] },
  { key: 'shells', name: 'HOT SHELLS', max: 3, base: 10, step: 11, col: '#F83800',
    desc: ['SHELLS FLY FASTER AND FURTHER'], icon: ['........', '.....1..', '...1111.', '2211113.', '...1111.', '.....1..', '........', '........'] },
  { key: 'pierce', name: 'AP ROUNDS', max: 3, base: 16, step: 16, col: '#58F8F8',
    desc: ['SHELLS GO THROUGH A ROCK', 'SHELLS GO THROUGH 2 ROCKS', 'SHELLS GO THROUGH 3 ROCKS'], icon: ['...2....', '..222...', '...2....', '11111113', '...2....', '..222...', '...2....', '........'] },
  { key: 'rear', name: 'REAR GUN', max: 2, base: 14, step: 18, col: '#BCBCBC',
    desc: ['A GUN FIRES BEHIND YOU', 'TWO REAR GUNS, SPREAD'], icon: ['..1111..', '..1221..', '..1221..', '..1111..', '...11...', '...11...', '...11...', '...33...'] },
  { key: 'homing', name: 'SEEKERS', max: 3, base: 18, step: 18, col: '#F878F8',
    desc: ['SHELLS CURVE TOWARDS TARGETS'], icon: ['......3.', '.....1..', '....1...', '...1....', '..1.....', '.1...22.', '1....22.', '........'] },
  { key: 'engine', name: 'ENGINE', max: 4, base: 10, step: 10, col: '#F87800',
    desc: ['MORE THRUST, HIGHER TOP SPEED'], icon: ['..1111..', '.122221.', '.122221.', '..1111..', '...11...', '..3333..', '.333333.', '..3..3..'] },
  { key: 'handling', name: 'HANDLING', max: 3, base: 8, step: 9, col: '#58D854',
    desc: ['TURNS FASTER AND SNAPPIER'], icon: ['..1111..', '.1....1.', '1......1', '1...3..1', '1......1', '.1....12', '..1111.2', '......22'] },
  { key: 'brakes', name: 'BRAKES', max: 2, base: 8, step: 12, col: '#ADADAD',
    desc: ['DOWN STOPS YOU HARDER', 'HARD BRAKES, THEN REVERSE THRUST'], icon: ['.111111.', '1222222.', '12....2.', '12....2.', '12....2.', '1222222.', '.111111.', '........'] },
  { key: 'plates', name: 'ARMOUR', max: 3, base: 14, step: 15, col: '#BCBCBC', w: 1.2,
    desc: ['A PLATE SOAKS A HIT; REFITTED EACH WAVE'], icon: ['11111111', '13.13.11', '11111111', '1.13.131', '11111111', '13.13.11', '11111111', '........'] },
  { key: 'regen', name: 'SHIELD GEN', max: 3, base: 22, step: 20, col: '#58F8F8',
    desc: ['A SHIELD THAT COMES BACK IN 25 S', 'THE SHIELD COMES BACK IN 17 S', 'THE SHIELD COMES BACK IN 12 S'], icon: ['..1111..', '.1....1.', '1..33..1', '1.3223.1', '1.3223.1', '1..33..1', '.1....1.', '..1111..'] },
  { key: 'magnet', name: 'MAGNET', max: 3, base: 8, step: 10, col: '#F83800',
    desc: ['PULLS CRYSTALS IN FROM AFAR'], icon: ['11....11', '11....11', '11....11', '11....11', '.1....1.', '.11..11.', '..1111..', '33....33'] },
  { key: 'salvage', name: 'SALVAGE', max: 3, base: 15, step: 20, col: '#58F8F8',
    desc: ['ROCKS DROP 30% MORE CRYSTALS'], icon: ['...3....', '..313...', '.31113..', '3111113.', '.31113..', '..313...', '...3....', '........'] },
  { key: 'bombs', name: 'BOMB RACK', max: 3, base: 16, step: 16, col: '#F83800',
    desc: ['1 BOMB EACH WAVE: HOLD B', '2 BOMBS EACH WAVE: HOLD B', '3 BOMBS EACH WAVE: HOLD B'], icon: ['.....3..', '....3...', '..111...', '.11111..', '.11311..', '.11111..', '..111...', '........'] },
  { key: 'warp', name: 'WARP DRIVE', max: 2, base: 12, step: 18, col: '#C878F8',
    desc: ['B JUMPS TO A SAFE SPOT', 'QUICKER WARPS, A SHOCKWAVE WHERE YOU LAND'], icon: ['1.1.1.1.', '........', '1.3333.1', '..3223..', '1.3223.1', '..3333..', '1......1', '.1.1.1..'] },
  { key: 'drone', name: 'GUN DRONE', max: 2, base: 30, step: 35, col: '#BCBCBC',
    desc: ['A DRONE CIRCLES YOU AND SHOOTS', 'TWO DRONES, FASTER FIRE'], icon: ['........', '..2222..', '.211112.', '22133122', '.211112.', '..2222..', '...22...', '........'] },
  { key: 'life', name: 'SPARE TANK', max: 9, base: 25, step: 15, col: '#58D854', w: 0.7,
    desc: ['ONE MORE LIFE'], icon: ['...1....', '...1....', '.1.1.1..', '.11111..', '.12221..', '.12221..', '.11111..', '.1...1..'] },
];
const ASTRO_UP = Object.fromEntries(ASTRO_UPS.map(u => [u.key, u]));

function astroNewKit() { return { up: {}, gems: 0, bombs: 0, v: 0 }; }
function astroLv(kit, k) { return (kit && kit.up && kit.up[k]) | 0; }
function astroCost(kit, k) { const d = ASTRO_UP[k]; return d ? d.base + d.step * astroLv(kit, k) : 999; }
function astroUpName(k, lv) { const d = ASTRO_UP[k]; return d.lv && lv > 0 ? d.lv[Math.min(d.lv.length, lv) - 1] : d.name; }
function astroUpDesc(k, lv) { const d = ASTRO_UP[k]; return d.desc[Math.min(d.desc.length - 1, Math.max(0, lv))]; }

// what the levels make of the tank (kept on the kit until something changes)
function astroStats(kit) {
  if (kit._s && kit._sv === (kit.v | 0)) return kit._s;
  const L = k => astroLv(kit, k);
  const rapid = L('rapid'), shells = L('shells'), eng = L('engine'), hand = L('handling');
  const s = {
    guns: Math.min(3, L('guns')),
    cool: [7, 6, 5, 4, 3][rapid], hold: [13, 11, 9, 8, 6][rapid], maxShots: ASTRO.maxShots + rapid,
    shotSpeed: ASTRO.shotSpeed + 0.55 * shells, shotLife: ASTRO.shotLife + 7 * shells,
    pierce: L('pierce'), rear: L('rear'), homing: [0, 0.035, 0.06, 0.09][L('homing')],
    thrust: ASTRO.thrust * (1 + 0.18 * eng), top: ASTRO.top * (1 + 0.11 * eng), engineLv: eng,
    turn: ASTRO.turn * (1 + 0.15 * hand), turnAcc: ASTRO.turnAcc * (1 + 0.35 * hand),
    brake: [ASTRO.brake, 0.84, 0.78][L('brakes')], reverse: L('brakes') >= 2,
    plates: L('plates'), regen: [0, 1500, 1050, 720][L('regen')], magnet: [0, 48, 78, 120][L('magnet')],
    bombs: L('bombs'), warp: L('warp'), drones: L('drone'), salvage: 1 + 0.3 * L('salvage'),
  };
  kit._s = s; kit._sv = kit.v | 0;
  return s;
}

// ------------------------------------------------------------------ the look
// the tank model (astro.js: astroTankBase) with what's bought on it: f(lx, ly) gives a colour index (1-3 the player's
// colours, 4+ ASTRO_INK) in sprite pixels from the tank's middle, facing up.
// s: the ship in play (its plates and bombs show), or null (the hangar: everything as bought)
const ASTRO_LOOKS = new Map();
function astroTankLook(kit, s, frame) {
  const L = k => astroLv(kit, k);
  const plates = s ? s.plates : L('plates'), bombs = Math.min(3, (kit.bombs | 0));
  const guns = Math.min(3, L('guns')), rear = L('rear'), eng = L('engine'), hom = L('homing'), mag = L('magnet'), hand = L('handling');
  const warp = L('warp'), salv = L('salvage'), pierce = L('pierce') > 0;
  const key = [guns, plates, rear, eng, hom, mag, hand, pierce ? 1 : 0, warp, bombs, salv, frame & 1].join('');
  let look = ASTRO_LOOKS.get(key);
  if (look) return look;
  const heavy = guns >= 3, tw = heavy ? 7.5 : 6.5, tip = pierce ? 9 : 4, fr = frame & 1;
  const f = (x, y) => {
    const ax = Math.abs(x);
    // the guns
    if (guns === 0 && pierce && ax < 0.5 && y >= -6.5 && y < -5.5) return 9;
    if (guns === 1 && Math.abs(ax - 1.5) < 0.5 && y >= -7.5 && y < -1.5) return y < -6.5 ? tip : 1;
    if (guns === 2) {
      if (ax < 0.5 && y >= -8.5 && y < -1.5) return y < -7.5 ? tip : 1;
      if (ax < 1.5 && y >= -7.5 && y < -6.5) return 5;   // the muzzle brake
      if (x * Math.sign(x) > 0.5 && astroSeg(ax, y, 1.5, -1.5, 3.6, -6.2) < 0.55) return y < -5.4 ? tip : 1;
    }
    if (heavy) {
      if (Math.abs(ax - 1) < 0.6 && y >= -8.5 && y < -1.5) return y < -7.5 ? tip : 1;
      if (astroSeg(ax, y, 2.6, -1.5, 4.8, -6.4) < 0.55) return y < -5.6 ? tip : 5;
    }
    // on the hull: the radar dish, the warp core, the bomb rack
    if (hom && Math.hypot(ax - 2.4, y + 2) < 1.25 && x > 0) return Math.hypot(ax - 2.4, y + 2) < 0.5 ? (hom >= 3 ? 9 : 5) : 4;
    if (warp && Math.hypot(x, y - 1) < 0.95) return 14;
    if (warp >= 2 && Math.hypot(x, y - 1) < 1.5) return 13;
    for (let k = 0; k < bombs; k++) if (Math.hypot(x - (-1.5 + 1.5 * k), y - 3.8) < 0.6) return 11;
    const b = astroTankBase(x, y, fr, heavy);
    if (b) return b;
    // round the hull: armour skirts (riveted), the front plate, fins, exhaust pipes, the rear gun, antennas, a claw
    if (plates > 0 && ax > tw && ax <= tw + 1) {
      const y0 = plates >= 2 ? -4.5 : -1.5, y1 = plates >= 2 ? 6.5 : 3.5;
      if (y >= y0 && y <= y1) return ((Math.floor(y) + 21) % 3) === 0 ? (plates >= 3 ? 7 : 6) : 5;
    }
    if (plates >= 3 && y >= -5.5 && y < -4.5 && ax >= 2.5 && ax <= tw) return (Math.floor(ax) & 1) ? 5 : 6;
    if (hand && ax > tw && ax <= tw + 1.2 && y >= -5.5 && y < (hand >= 2 ? -3.5 : -4.5)) return 11;
    if (hand >= 3 && ax > tw + 1.2 && ax <= tw + 2.2 && y >= -5.5 && y < -4.5) return 10;
    if (eng && Math.abs(ax - 2) < (eng >= 3 ? 1 : 0.5) && y > 5.5 && y <= 6.5) return 12;
    if (eng >= 2 && Math.abs(ax - 2) < (eng >= 3 ? 1 : 0.5) && y > 6.5 && y <= 7.5) return eng >= 4 ? 9 : 10;
    if (rear === 1 && ax < 0.5 && y > 5.5 && y <= 9.5) return y > 8.5 ? 4 : 5;
    if (rear >= 2 && y > 5.5 && astroSeg(ax, y, 1, 5.5, 3, 9.6) < 0.55) return y > 8.6 ? 4 : 5;
    if (mag && x < 0 && astroSeg(x, y, -5, 6, -7, 9.6) < 0.5) return Math.hypot(x + 7, y - 9.6) < 0.8 && mag >= 2 ? 7 : 4;
    if (mag >= 3 && x > 0 && astroSeg(x, y, 5, 6, 7, 9.6) < 0.5) return Math.hypot(x - 7, y - 9.6) < 0.8 ? 7 : 4;
    if (salv && x > 3.5 && x <= 6.5 && y > 6.5 && y <= 7.5) return 7;
    if (salv >= 2 && x > 5.5 && x <= 6.5 && y > 7.5 && y <= 8.5) return 7;
    return 0;
  };
  look = { key: 'L' + key, f };
  ASTRO_LOOKS.set(key, look);
  return look;
}

// an upgrade's icon (8x8), scale s
const ASTRO_ICONS = new Map();
function astroIcon(k, dim) {
  const ck = k + (dim ? 'd' : '');
  let c = ASTRO_ICONS.get(ck);
  if (c) return c;
  const d = ASTRO_UP[k];
  c = makeCanvas(8, 8);
  const x = c.getContext('2d'), pal = { 1: dim ? '#5C5C5C' : d.col, 2: dim ? '#3C3C3C' : '#3C3C3C', 3: dim ? '#7C7C7C' : '#FFFFFF' };
  d.icon.forEach((r, j) => { for (let i = 0; i < 8; i++) if (pal[r[i]]) { x.fillStyle = pal[r[i]]; x.fillRect(i, j, 1, 1); } });
  ASTRO_ICONS.set(ck, c);
  return c;
}

// ------------------------------------------------------------------ the hangar
const ASTRO_ROW_H = 18;

function astroOffers(p, keep) {
  const kit = p.astro, out = [];
  if (p.out) out.push('life');
  const pool = ASTRO_UPS.filter(d => astroLv(kit, d.key) < d.max && !out.includes(d.key) && !(keep || []).includes(d.key));
  while (out.length < 4 && pool.length) {
    let sum = 0;
    for (const d of pool) sum += d.w || 1;
    let r = Math.random() * sum, i = 0;
    for (; i < pool.length - 1; i++) { r -= pool[i].w || 1; if (r <= 0) break; }
    out.push(pool.splice(i, 1)[0].key);
  }
  return out;
}

// a player's up or down pressed this frame (keys, pads, a guest online): -1, 1 or 0
function astroHangarTap(i) {
  const r = Input.remote[i];
  if (r) return r.menu && r.menu.up ? -1 : r.menu && r.menu.down ? 1 : 0;
  const K = Input.keys(), n = Input.localCount() === 1 ? 1 : Input.numPlayers;
  const map = Keymap.inputMap(i) || (n >= 3 ? KEYS_MULTI[i] : n === 2 ? (i === 0 ? K.p1 : K.p2) : K.solo);
  let up = Input.anyJust(map[0]), dn = Input.anyJust(map[2]);
  for (const p of Input.padsFor(i)) { up = up || p.just0; dn = dn || p.just2; }
  return up ? -1 : dn ? 1 : 0;
}

Object.assign(Game, {
  astroToHangar() {
    const A = this.astro;
    this.ah = {
      wave: A.wave, boss: A.wave % 5 === 4, msgT: 0, quitT: 0,
      panels: this.players.map((p, i) => ({ i, idx: 0, offers: astroOffers(p), rolls: 0, free: A.bossBeaten ? 1 : 0, ready: false, msg: '', msgT: 0, good: false, prev: -1, rep: 0 })),
    };
    this.setState('astroHangar');
  },

  astroHangarRows(P) { return P.offers.concat(['reroll', 'ready']); },

  astroHangarSay(P, msg, good) { P.msg = msg; P.msgT = 110; P.good = good; Sound.play(good ? 'pickup' : 'steel'); },

  astroHangarAct(P) {
    const p = this.players[P.i], kit = p.astro, it = this.astroHangarRows(P)[P.idx];
    if (it === 'ready') { P.ready = !P.ready; Sound.play(P.ready ? 'bonus' : 'select'); return; }
    P.ready = false;
    if (it === 'reroll') {
      const cost = P.rolls === 0 ? 0 : 3 * P.rolls;
      if (kit.gems < cost) { this.astroHangarSay(P, 'NEED ' + (cost - kit.gems) + ' MORE', false); return; }
      kit.gems -= cost; P.rolls++;
      P.offers = astroOffers(p, P.offers.length >= 4 && ASTRO_UPS.filter(d => astroLv(kit, d.key) < d.max).length > 6 ? P.offers : null);
      P.idx = Math.min(P.idx, this.astroHangarRows(P).length - 1);
      this.astroHangarSay(P, 'NEW OFFERS', true);
      return;
    }
    const d = ASTRO_UP[it], lv = astroLv(kit, it);
    if (lv >= d.max) { this.astroHangarSay(P, 'ALREADY MAXED', false); return; }
    const cost = P.free ? 0 : astroCost(kit, it);
    if (kit.gems < cost) { this.astroHangarSay(P, 'NEED ' + (cost - kit.gems) + ' MORE', false); return; }
    kit.gems -= cost;
    if (P.free) P.free = 0;
    kit.up[it] = lv + 1; kit.v = (kit.v | 0) + 1;
    if (it === 'life') { p.lives = p.out ? 0 : p.lives + 1; p.out = false; }
    if (it === 'bombs') kit.bombs = Math.max(kit.bombs | 0, kit.up.bombs);
    this.astroHangarSay(P, it === 'life' ? (lv === 0 && p.lives === 0 ? 'BACK IN THE FIGHT!' : 'SPARE TANK!') : astroUpName(it, lv + 1) + (d.max > 1 ? ' LV ' + (lv + 1) : '') + '!', true);
    Sound.play('levelUp');
    // maxed: another one takes its place
    if (lv + 1 >= d.max) {
      const more = astroOffers(Object.assign({}, p, { out: false }), P.offers).filter(k => !P.offers.includes(k));
      P.offers[P.offers.indexOf(it)] = more[0] || null;
      P.offers = P.offers.filter(k => k);
      P.idx = Math.min(P.idx, this.astroHangarRows(P).length - 1);
    }
  },

  updateAstroHangar() {
    const H = this.ah, m = Input.menu();
    if (!H) { this.astroNextWave(); return; }
    if (H.quitT > 0) H.quitT--;
    if (m.back) {
      if (H.quitT > 0) { if (this.astro) this.astro.record(); this.stage = null; this.astro = null; this.toTitle(); return; }
      H.quitT = 120; Sound.play('select');
    }
    if (this.t < 12) return;
    for (const P of H.panels) {
      if (P.msgT > 0) P.msgT--;
      const inp = Input.player(P.i), rows = this.astroHangarRows(P);
      // up/down: each press (however short), and held, a repeat
      const dir = inp.dir, tap = astroHangarTap(P.i);
      let step = tap;
      if (!tap && dir === P.prev && (dir === 0 || dir === 2)) { if (++P.rep > 16 && P.rep % 5 === 0) step = dir === 0 ? -1 : 1; }
      if (dir !== P.prev || tap) P.rep = 0;
      P.prev = dir;
      if (step) { P.idx = (P.idx + step + rows.length) % rows.length; Sound.play('select'); }
      if (inp.firePressed) this.astroHangarAct(P);
      else if (inp.altPressed) { P.ready = !P.ready; P.idx = rows.length - 1; Sound.play(P.ready ? 'bonus' : 'select'); }
    }
    if (m.start) for (const P of H.panels) P.ready = true;
    if (H.panels.every(P => P.ready)) { this.ah = null; this.astroNextWave(); }
  },

  // where things are on the hangar screen (the whole screen, not the menus' frame)
  astroHangarLayout() {
    const n = this.ah.panels.length, pw = n > 1 ? Math.floor((SCREEN_W - 12) / 2) : Math.min(SCREEN_W - 16, 300);
    return { n, pw, x0: n > 1 ? 4 : (SCREEN_W - pw) >> 1, top: 36, ph: SCREEN_H - 36 - 14 };
  },

  renderAstroHangar(ctx) {
    const H = this.ah;
    if (!H) return;
    ctx.save();
    ctx.translate(-menuOX(), -menuOY());
    ctx.fillStyle = COL.black; ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
    const sky = astroSky(VIEW_W, VIEW_H);
    ctx.globalAlpha = 0.5; ctx.drawImage(sky.c, 0, 0, SCREEN_W, SCREEN_H); ctx.globalAlpha = 1;
    Font.big(ctx, 'HANGAR', (SCREEN_W - Font.bigWidth('HANGAR', 2)) >> 1, 4, 2, Sprites.bricks(ctx));
    const next = H.wave + 1, sub = 'WAVE ' + H.wave + ' CLEAR  -  NEXT: ' + (next % 5 === 0 ? 'BOSS WAVE ' + next + '!' : 'WAVE ' + next);
    Font.drawCenter(ctx, sub.length * 8 <= SCREEN_W - 8 ? sub : 'NEXT: ' + (next % 5 === 0 ? 'BOSS!' : 'WAVE ' + next), SCREEN_W / 2, 22, next % 5 === 0 ? '#F83800' : COL.lgrey);
    const Lay = this.astroHangarLayout();
    H.panels.forEach((P, k) => this.astroHangarPanel(ctx, P, Lay.x0 + k * (Lay.pw + 4), Lay.top, Lay.pw, Lay.ph));
    const foot = H.quitT > 0 ? 'ESC AGAIN: QUIT TO TITLE' : SCREEN_W >= 330 ? 'FIRE: BUY   B: READY   ENTER: GO   ESC: QUIT' : 'FIRE:BUY B:READY ENTER:GO';
    Font.drawCenter(ctx, foot, SCREEN_W / 2, SCREEN_H - 10, H.quitT > 0 ? COL.gold : '#7C7C7C');
    ctx.restore();
  },

  astroHangarPanel(ctx, P, x, y, w, h) {
    const p = this.players[P.i], kit = p.astro, pal = Config.playerPal(P.i), pc = PALS[pal] || PALS.p1, t = this.t;
    const rows = this.astroHangarRows(P), it = rows[P.idx], two = this.ah.panels.length > 1;
    ctx.fillStyle = '#0C0C18'; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = P.ready ? '#58D854' : pc[2]; ctx.fillRect(x, y, w, 1); ctx.fillRect(x, y + h - 1, w, 1); ctx.fillRect(x, y, 1, h); ctx.fillRect(x + w - 1, y, 1, h);
    // who, and their crystals
    Font.draw(ctx, two ? ROMAN[P.i] + '-PLAYER' : 'YOUR TANK', x + 4, y + 4, pc[1]);
    const gs = String(kit.gems | 0);
    Font.drawRight(ctx, gs, x + w - 4, y + 4, '#58F8F8');
    ctx.drawImage(astroGemArt(true, (t >> 4) & 1), x + w - 6 - gs.length * 8 - 7, y + 4);
    // the tank, turning: with the highlighted upgrade on it every other second
    const try1 = ASTRO_UP[it] && astroLv(kit, it) < ASTRO_UP[it].max && (t >> 6) & 1;
    const show = try1 ? Object.assign({}, kit, { up: Object.assign({}, kit.up, { [it]: astroLv(kit, it) + 1 }) }) : kit;
    ctx.fillStyle = '#000000'; ctx.fillRect(x + 4, y + 14, 60, 60);
    ctx.fillStyle = '#1C1C2C'; ctx.fillRect(x + 4, y + 73, 60, 1);
    const img = astroShipImg(show, null, pal, (t >> 3) & 1, t * 0.025);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, x + 4, y + 14, 60, 60);
    if (try1) Font.drawCenter(ctx, 'NEW', x + 34, y + 64, (t >> 3) & 1 ? COL.gold : '#F8F8F8');
    // what's owned: icons with their levels
    const ox = x + 70, cols = Math.max(1, Math.floor((w - 74) / 22));
    Font.draw(ctx, p.out ? 'OUT OF TANKS' : 'LIVES ' + (Config.infiniteLives() ? '~' : p.lives) + (kit.bombs ? '  B' + kit.bombs : ''), ox, y + 16, p.out ? '#F83800' : COL.lgrey);
    let n = 0;
    for (const d of ASTRO_UPS) {
      const lv = astroLv(kit, d.key);
      if (!lv || d.key === 'life') continue;
      const cx = ox + (n % cols) * 22, cy = y + 28 + Math.floor(n / cols) * 11;
      if (cy < y + 72) { ctx.drawImage(astroIcon(d.key), cx, cy); ctx.drawImage(Sprites.mini(String(lv)), cx + 10, cy + 1); }
      n++;
    }
    if (!n) Font.draw(ctx, 'NO UPGRADES', ox, y + 30, '#5C5C5C');
    if (P.free) Font.draw(ctx, (t >> 4) & 1 ? 'FREE PICK!' : '', ox, y + 62, COL.gold);
    // the rows
    const top = y + 78;
    rows.forEach((k, r) => {
      const ry = top + r * ASTRO_ROW_H, sel = r === P.idx;
      if (sel) { ctx.fillStyle = '#1C2C5C'; ctx.fillRect(x + 2, ry - 1, w - 4, ASTRO_ROW_H - 1); ctx.fillStyle = COL.gold; ctx.fillRect(x + 2, ry - 1, 2, ASTRO_ROW_H - 1); }
      if (k === 'reroll') {
        const cost = P.rolls === 0 ? 0 : 3 * P.rolls;
        Font.draw(ctx, 'REROLL', x + 18, ry + 4, sel ? COL.white : COL.lgrey);
        Font.drawRight(ctx, cost ? String(cost) : 'FREE', x + w - 6, ry + 4, cost && kit.gems < cost ? '#7C3C3C' : '#58F8F8');
        return;
      }
      if (k === 'ready') {
        Font.draw(ctx, P.ready ? 'READY!' : 'READY', x + 18, ry + 4, P.ready ? '#58D854' : sel ? COL.white : COL.lgrey);
        if (P.ready && two) Font.drawRight(ctx, 'WAITING', x + w - 6, ry + 4, '#5C5C5C');
        return;
      }
      const d = ASTRO_UP[k], lv = astroLv(kit, k), cost = P.free ? 0 : astroCost(kit, k), can = kit.gems >= cost;
      ctx.drawImage(astroIcon(k, !can), x + 7, ry + 1);
      const nm = astroUpName(k, lv + 1), room = Math.floor((w - 24 - 8) / 8);
      Font.draw(ctx, nm.slice(0, room), x + 18, ry, sel ? COL.white : can ? COL.lgrey : '#6C6C6C');
      // the level pips: owned, the next one blinking
      for (let q = 0; q < d.max && q < 9; q++) {
        ctx.fillStyle = q < lv ? d.col : q === lv && (t >> 3) & 1 ? '#F8F8F8' : '#3C3C3C';
        ctx.fillRect(x + 18 + q * 5, ry + 10, 4, 4);
      }
      Font.drawRight(ctx, cost ? String(cost) : 'FREE', x + w - 6, ry + 8, cost === 0 ? COL.gold : can ? '#58F8F8' : '#7C3C3C');
    });
    // what it does, or what just happened
    const ly = top + rows.length * ASTRO_ROW_H + 3, chars = Math.floor((w - 8) / 8);
    let line = '', col = COL.white;
    if (P.msgT > 0) { line = P.msg; col = P.good ? COL.gold : '#F87858'; }
    else if (ASTRO_UP[it]) line = astroUpDesc(it, astroLv(kit, it));
    else if (it === 'reroll') line = 'FOUR NEW OFFERS';
    else if (it === 'ready') line = P.ready ? 'FIRE: BACK TO SHOPPING' : 'ON TO THE NEXT WAVE';
    const words = line.split(' '), lines = [''];
    for (const wd of words) { const c = lines[lines.length - 1]; if ((c + (c ? ' ' : '') + wd).length > chars) lines.push(wd); else lines[lines.length - 1] = c + (c ? ' ' : '') + wd; }
    lines.slice(0, 3).forEach((l, j) => { if (ly + j * 10 + 8 < y + h) Font.draw(ctx, l, x + 4, ly + j * 10, col); });
  },

  // mouse / touch on the hangar: pick a row, pick it again to buy it
  astroHangarPointer(x, y) {
    const H = this.ah;
    if (!H) return;
    x += menuOX(); y += menuOY();
    const Lay = this.astroHangarLayout();
    H.panels.forEach((P, k) => {
      const px = Lay.x0 + k * (Lay.pw + 4);
      if (x < px || x > px + Lay.pw) return;
      const r = Math.floor((y - (Lay.top + 78) + 1) / ASTRO_ROW_H), rows = this.astroHangarRows(P);
      if (r < 0 || r >= rows.length) return;
      if (r === P.idx) this.astroHangarAct(P); else { P.idx = r; Sound.play('select'); }
    });
  },
});

ASTRO_SCREENS.astroHangar = ['updateAstroHangar', 'renderAstroHangar', 'astroHangarPointer'];
