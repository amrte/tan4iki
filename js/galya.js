'use strict';
// =====================================================================
//  BABA GALYA: the real last boss, a secret. She waits on the stage after the UFO (stage 101 with a boss every 10
//  stages). An old Ukrainian janitor, never happy, always grumbling (in Ukrainian) and swearing (#@%*!):
//    ON DUTY       she mops the floor as she goes (the wet floor is as slippery as ice and dries after a while);
//                  drive on her clean floor and a slipper comes flying (it homes in; you can shoot it down); come
//                  too close and she swings her mop; a wall of dirty water from her bucket now and then
//    FURIOUS       two slippers at a time, and she kicks her bucket at you (it rolls, smashing bricks, and spills)
//    CLOSING TIME  "WE'RE CLOSED!": she turns the lights off (night), faster, three slippers at a time
//  She doesn't blow up: beaten, she gives up and goes home. Then the game is properly beaten.
// =====================================================================

const GALYA = BOSSES.length;   // her index in BOSSES (after the ten)
BOSSES.push({ kind: 'galya', name: 'BABA GALYA', hp: 100, pts: 50000, w: 32, h: 32, escorts: [0, 1, 0, 2, 0, 1, 3, 1], desc: 'THE JANITOR. EVERYONE FEARS HER',
  phases: ['ON DUTY', 'FURIOUS', 'CLOSING TIME'] });
// a school corridor: lockers (brick), radiators (steel), a stand of plants; cover over the eagle
BOSS_ARENAS.push([
  '.............',
  '.##.##.##.##.',
  '.............',
  '..@.......@..',
  '.....%.%.....',
  '.#.........#.',
  '.#..##.##..#.',
  '.............',
  '..@..#.#..@..',
  '.............',
  '.....###.....',
  '.............',
  '.............',
]);

// the secret stage: the one right after the tenth boss
const galyaStage = () => Config.get('bossEvery') * BOSS_ORDER.length + 1;
const bossForStageTen = bossForStage;
bossForStage = function (num) {   // eslint-disable-line no-func-assign
  if (Config.on('bossRounds') && num === galyaStage()) return { idx: GALYA, loop: 0 };
  return bossForStageTen(num);
};

// what she says, in Ukrainian (in Latin letters; the font has no rude words, only #@%*!):
//   SHO TSE TAKE = what's this, KHULIHANY = hooligans, OY LYSHENKO = oh, the misery, HOSPODY = Lord,
//   MATERI VASHII SKAZHU = I'll tell your mother, BODAI VAM = curse you, YA Z RANKU MYLA = I've been mopping since
//   morning, OT ZHE BANDA = what a gang, ZACHYNENO = closed, HET VSI DODOMU = everybody out, home, HASHU SVITLO =
//   I'm turning off the light, YA VAS BACHU = I see you, KUDY PO POMYTOMU = where are you going on my clean floor,
//   NE TOPCHY = don't tread, VYTRY NOHY = wipe your feet, KYSH = shoo, HET ZVIDSY = get out of here,
//   OT YA TOBI = I'll show you, SPYNA = my back, KOLINA = my knees
const GALYA_SAYS = {
  grumble: [['SHO TSE TAKE?!', 'KHULIHANY!', 'OY LYSHENKO!', 'HOSPODY, SHO ZA LYUDY!', 'MATERI VASHII SKAZHU!'],
    ['#@%*!!', 'BODAI VAM! #@%*!', 'YA Z RANKU MYLA!', 'OT ZHE BANDA!', 'NU VSE! #@%*!'],
    ['ZACHYNENO!', 'HET VSI DODOMU!', 'HASHU SVITLO!', '#@%*! #@%*!!', 'YA VAS BACHU!']],
  floor: ['KUDY PO POMYTOMU?!', 'NE TOPCHY!', 'VYTRY NOHY!', 'YA Z RANKU MYLA!'],
  near: ['KYSH! KYSH!', 'HET ZVIDSY!', 'OT YA TOBI!', 'A NU HET!'],
  hurt: ['OY!', 'OY, SPYNA!', 'OY, KOLINA!', 'OY-OY-OY!', 'BODAI TOBI!'],
};
const galyaPick = a => a[rnd(a.length)];

// ------------------------------------------------------------------ her sprite: front view, 32x32, never turned
BOSS_PALS.galya = [null, '#F8C8A0', '#D89870', '#D82800', '#F8F8F8', '#3C6CD8', '#1C3C8C', '#100808', '#A8A8A8', '#8C5C24', '#9C9CAC', '#F878A8'];
BOSS_PALS.f = BOSS_PALS.f.concat(['#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF']);
BOSS_PALS.r = BOSS_PALS.r.concat(['#F87858', '#B02818', '#E04030', '#FFC0B0']);
// f: walking step (0/1), ph: phase (2: steaming red face, 3: hair coming loose); mood 2 = shouting is drawn by f + 2
BOSS_DRAW.galya = function (f, ph) {
  const P = bossPainter(32, 32), step = f & 1, shout = f >= 2;
  // the mop, held on her right: a handle and a grey-white head
  P.line(26, 2, 27, 27, 9); P.line(27, 2, 28, 27, 9);
  for (let k = 0; k < 7; k++) P.line(24 + k, 27, 23 + k + (step ? 1 : 0), 31, k & 1 ? 4 : 10);
  // legs in thick stockings, pink slippers
  P.rect(12, 27 - step, 14, 29 - step, 9); P.rect(17, 27 - (1 - step), 19, 29 - (1 - step), 9);
  P.rect(11, 30 - step, 15, 31 - step, 11); P.rect(16, 30 - (1 - step), 20, 31 - (1 - step), 11);
  // the blue work coat: a trapezoid, darker at the sides, white buttons, a pocket with a rag
  for (let y = 15; y <= 27; y++) { const hw = 6 + (y - 15) * 0.35; for (let x = Math.round(16 - hw); x <= Math.round(15 + hw); x++) P.px(x, y, x <= 16 - hw + 1.5 || x >= 15 + hw - 1.5 ? 6 : 5); }
  for (const y of [17, 20, 23]) P.px(16, y, 4);
  P.rect(18, 22, 20, 24, 6); P.px(19, 21, 4); P.px(20, 21, 10);
  P.rect(13, 15, 19, 15, 4); P.px(14, 15, 3); P.px(16, 15, 3); P.px(18, 15, 3);   // the embroidered collar (a vyshyvanka)
  // arms: the right one on the mop, the left one shaking a fist when she shouts
  P.rect(22, 17, 25, 19, 5); P.rect(25, 17, 26, 19, 1);
  if (shout) { P.rect(7, 12, 9, 17, 5); P.rect(6, 10, 9, 12, 1); } else { P.rect(7, 17, 9, 22, 5); P.rect(7, 22, 9, 23, 1); }
  // the head: grey hair at the sides, the face, glasses, angry eyebrows
  P.ellipse(16, 10, 6, 5.5);
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) if (P.g[y][x] >= 1 && P.g[y][x] <= 3 && Math.hypot(x + 0.5 - 16, y + 0.5 - 10) < 6.2) P.g[y][x] = (x + y) % 5 ? 1 : 2;
  P.px(9, 10, 8); P.px(22, 10, 8); P.px(9, 11, 8); P.px(22, 11, 8);
  if (ph === 3) { P.px(8, 7, 8); P.px(23, 6, 8); P.px(24, 8, 8); }   // hair coming loose
  P.rect(12, 9, 14, 11, 7); P.rect(17, 9, 19, 11, 7); P.px(13, 10, 4); P.px(18, 10, 4); P.px(15, 10, 7); P.px(16, 10, 7);   // glasses
  P.line(11, 7, 14, 8, 7); P.line(20, 7, 17, 8, 7);                                                                   // eyebrows
  if (shout) { P.rect(14, 13, 17, 14, 7); P.px(15, 14, 3); } else { P.rect(14, 13, 17, 13, 7); P.px(13, 14, 7); P.px(18, 14, 7); }
  if (ph >= 2) { P.px(10, 12, 3); P.px(21, 12, 3); }   // red cheeks: furious
  // the headscarf: red with white dots, tied under the chin
  for (let y = 1; y <= 9; y++) { const hw = Math.sqrt(Math.max(0, 49 - (y - 7) * (y - 7) * 1.4)); for (let x = Math.round(16 - hw); x <= Math.round(15 + hw); x++) if (y < 7 || x <= 11 || x >= 20) P.px(x, y, (x * 3 + y * 5) % 7 === 0 ? 4 : 3); }
  P.rect(14, 15, 17, 16, 3); P.px(13, 17, 3); P.px(18, 17, 3);
  P.outline();
  return P.g;
};

// ------------------------------------------------------------------ set-up, phases, hits
BOSS_INIT.galya = function (b, def, hp) {
  b.hp = b.maxHp = hp(def.hp);
  b.y = 16; b.dir = 2; b.face = 1; b.mode = 'walk';
  b.wet = []; b.slippers = []; b.bucket = null; b.hasBucket = true; b.say = null;
  b.talkT = 90; b.slipT = 150; b.waveT = 260; b.swing = 0; b.swingCd = 0; b.angryT = 0; b.hurtT = 0;
};

BOSS_PHASE.galya = function (b, ph) {
  if (ph === 2) this.galyaSay(b, '#@%*!! NU VSE, DOSYT!', 150);   // that's it, enough!
  if (ph === 3) {
    // closing time: the lights go off
    b.oldWeather = this.weather || null;
    this.weather = 'night';
    this.galyaSay(b, 'ZACHYNENO! HASHU SVITLO!', 160);   // closed! lights out!
    Sound.play('bossWarn');
  }
};

BOSS_DAMAGE.galya = function (bo, dmg) {
  bo.hp -= dmg * (bo.mode === 'dazed' ? 2 : 1);
  if (!(bo.hurtT > 0) && Math.random() < 0.35) { this.galyaSay(bo, galyaPick(GALYA_SAYS.hurt), 50); bo.hurtT = 120; }
  return true;
};

// she's a person: she doesn't blow up, she gives up and goes home (and the lights come back on)
BOSS_SMOKE.galya = b => [b.x + 16 + rnd(9) - 4, b.y + 2];   // steam off her head

// ------------------------------------------------------------------ behaviour
BOSS_AI.galya = function (b) {
  b.t++;
  const ph = b.phase || 1;
  if (b.say && --b.say.t <= 0) b.say = null;
  if (b.hurtT > 0) b.hurtT--;
  this.galyaFloor(b); this.galyaSlippers(b); this.galyaBucket(b);
  const [cx, cy] = this.bossCenter(b), players = this.tanks.filter(t => t.isPlayer && t.alive && !t.ally);
  // the mop: a tank right by her gets a swing (she raises it first: get away)
  if (b.swing > 0) {
    if (--b.swing === 0) {
      for (const t of players) if (Math.hypot(t.x + 8 - cx, t.y + 8 - cy) < 30) this.hitPlayer(t);
      for (let cy2 = (b.y - 4) >> 2; cy2 <= (b.y + 36) >> 2; cy2++) for (let cx2 = (b.x - 4) >> 2; cx2 <= (b.x + 36) >> 2; cx2++) if (this.get(cx2, cy2) === T_BRICK) this.set(cx2, cy2, T_EMPTY);
      this.addFx(cx + b.face * 14, cy + 6, Sprites.smallExp, 3);
      Sound.play('charge');
      b.swingCd = 50;
    }
    return;
  }
  if (b.swingCd > 0) b.swingCd--;
  else if (players.some(t => Math.hypot(t.x + 8 - cx, t.y + 8 - cy) < 28)) { b.swing = 22; this.galyaSay(b, galyaPick(GALYA_SAYS.near), 60); return; }
  // about her rounds, mopping as she goes
  this.bossRoam(b, [0.45, 0.55, 0.75][ph - 1] * b.speedMul, 0.6);
  if (b.dir & 1) b.face = b.dir === 1 ? 1 : -1;
  b.animTick++;
  if (b.t % 3 === 0) this.galyaMop(b);
  // a tank on her clean floor: a slipper at it
  if (b.t >= b.angryT) {
    const t = players.find(p => this.get((p.x + 8) >> 2, (p.y + 8) >> 2) === T_ICE && b.wet.length);
    if (t) { this.galyaThrow(b, t); this.galyaSay(b, galyaPick(GALYA_SAYS.floor), 80); b.angryT = b.t + [110, 90, 70][ph - 1]; }
  }
  if (--b.slipT <= 0) {
    for (let k = 0; k < ph; k++) if (players.length) this.galyaThrow(b, players[k % players.length], (k - (ph - 1) / 2) * 0.6);
    b.slipT = [170, 130, 100][ph - 1];
  }
  // the bucket: dirty water ahead (ON DUTY, CLOSING TIME), or kicked at you (FURIOUS)
  if (--b.waveT <= 0) {
    const [tx, ty] = this.bossTarget(b), d = this.dirToward(cx, cy, tx, ty);
    if (ph === 2 && b.hasBucket) this.galyaKick(b, d);
    else if (b.hasBucket) {
      for (const off of [-12, -4, 4, 12]) { const [x, y] = this.bossMuzzle(b, d, off); this.bossFire(b, x, y, d, { speed: 2.2 }); }
      this.galyaSay(b, 'NA, POMYISYA!', 60);   // here, have a wash!
      Sound.play('splash');
    }
    b.waveT = [300, 240, 200][ph - 1];
  }
  if (--b.talkT <= 0) { if (!b.say) this.galyaSay(b, galyaPick(GALYA_SAYS.grumble[ph - 1]), 90); b.talkT = 150 + rnd(150); }
};

Object.assign(Stage.prototype, {
  galyaSay(b, text, t = 90) { b.say = { text, t }; if (text.includes('#')) Sound.play('grawlix'); },

  // the floor under her gets mopped: open floor turns wet (slippery, like ice) and dries after 10 s
  galyaMop(b) {
    for (let cy = (b.y + 16) >> 2; cy < (b.y + 32) >> 2; cy++) for (let cx = b.x >> 2; cx < (b.x + 32) >> 2; cx++) {
      if (this.get(cx, cy) !== T_EMPTY) continue;
      this.set(cx, cy, T_ICE);
      b.wet.push({ i: cy * GW + cx, t: 600 });
    }
  },

  galyaFloor(b) {
    for (const w of b.wet) w.t--;
    for (let k = 0; k < b.wet.length - 200; k++) b.wet[k].t = 0;   // too much floor: the oldest dries first
    for (const w of b.wet) if (w.t <= 0 && this.terrain[w.i] === T_ICE) this.set(w.i % GW, (w.i / GW) | 0, T_EMPTY);
    b.wet = b.wet.filter(w => w.t > 0);
  },

  // a slipper, thrown at a tank; it homes in, flies over walls, and can be shot down
  galyaThrow(b, t, spread = 0) {
    const [cx, cy] = this.bossCenter(b), a = Math.atan2(t.y + 8 - cy, t.x + 8 - cx) + spread;
    b.slippers.push({ x: cx - 8 * b.face, y: cy - 6, vx: Math.cos(a) * 1.3, vy: Math.sin(a) * 1.3, life: 220, spin: rnd(4) });
    Sound.play('slipper');
  },

  galyaSlippers(b) {
    const ph = b.phase || 1, cap = [1.5, 1.8, 2.1][ph - 1];
    for (const s of b.slippers) {
      s.life--; s.spin++;
      let best = null, bd = 1e9;
      for (const t of this.tanks) { if (!t.isPlayer || !t.alive || t.ally) continue; const d = Math.hypot(t.x + 8 - s.x, t.y + 8 - s.y); if (d < bd) { bd = d; best = t; } }
      if (best) { s.vx += (best.x + 8 - s.x) / (bd || 1) * 0.1; s.vy += (best.y + 8 - s.y) / (bd || 1) * 0.1; }
      const v = Math.hypot(s.vx, s.vy);
      if (v > cap) { s.vx *= cap / v; s.vy *= cap / v; }
      s.x += s.vx; s.y += s.vy;
      if (best && overlap(s.x - 3, s.y - 2, 6, 4, best.x + 1, best.y + 1, 14, 14)) { s.life = 0; this.hitPlayer(best); Sound.play('bump'); continue; }
      for (const bl of this.bullets) {
        if (!bl.alive || !bl.isPlayer || !overlap(s.x - 4, s.y - 3, 8, 6, bl.x, bl.y, 4, 4)) continue;
        s.life = 0; this.killBullet(bl, true);
        if (bl.owner && bl.owner.player) this.addScore(bl.owner.player, OBJ_PTS.shell);
        break;
      }
      if (s.x < -8 || s.y < -8 || s.x > FW + 8 || s.y > FH + 8) s.life = 0;
    }
    b.slippers = b.slippers.filter(s => s.life > 0);
  },

  // FURIOUS: she kicks the bucket at you: it rolls, smashing bricks and tanks, and spills when it stops
  galyaKick(b, d) {
    const [cx, cy] = this.bossCenter(b);
    b.bucket = { x: Math.round(cx - 5 + DXY[d][0] * 20), y: Math.round(cy - 5 + DXY[d][1] * 20), d, t: 0 };
    b.hasBucket = false;
    this.galyaSay(b, 'LOVY! #@%*!', 70);   // catch!
    Sound.play('charge');
  },

  galyaBucket(b) {
    const k = b.bucket;
    if (!k) { if (!b.hasBucket && ++b.fetchT > 300) { b.hasBucket = true; b.fetchT = 0; } return; }
    k.t++;
    for (let n = 0; n < 2; n++) {
      const nx = k.x + DXY[k.d][0], ny = k.y + DXY[k.d][1];
      let stop = nx < 0 || ny < 0 || nx > FW - 10 || ny > FH - 10 || overlap(nx, ny, 10, 10, BASE_X - 4, BASE_Y - 4, 24, 24);
      for (let cy = ny >> 2; cy <= (ny + 9) >> 2 && !stop; cy++) for (let cx = nx >> 2; cx <= (nx + 9) >> 2; cx++) {
        const v = this.get(cx, cy);
        if (v === T_STEEL || v === T_WATER) stop = true;
        else if (v === T_BRICK) { this.set(cx, cy, T_EMPTY); if (this.frame % 4 === 0) Sound.play('brick'); }
      }
      if (stop || k.t > 240) {
        // it spills: a big wet patch where it stops
        for (let cy = (k.y - 8) >> 2; cy <= (k.y + 18) >> 2; cy++) for (let cx = (k.x - 8) >> 2; cx <= (k.x + 18) >> 2; cx++) {
          if (cx < 0 || cy < 0 || cx >= GW || cy >= GH || this.get(cx, cy) !== T_EMPTY) continue;
          this.set(cx, cy, T_ICE); b.wet.push({ i: cy * GW + cx, t: 600 });
        }
        Sound.play('splash');
        b.bucket = null; b.fetchT = 0;
        return;
      }
      k.x = nx; k.y = ny;
      for (const t of this.tanks) {
        if (!t.alive || !overlap(k.x, k.y, 10, 10, t.x, t.y, 16, 16)) continue;
        if (t.isPlayer) this.hitPlayer(t); else this.killEnemy(t, null, false);
      }
    }
  },

  // drawn after the darkness, so you always see her slippers and hear her (speech bubbles)
  renderBossTalk(ctx) {
    for (const b of this.bosses) {
      if (!b.alive || b.kind !== 'galya') continue;
      for (const s of b.slippers || []) {
        const r = (s.spin >> 2) & 3, horiz = !(r & 1);
        ctx.fillStyle = '#100808'; ctx.fillRect(Math.round(s.x) - (horiz ? 4 : 3), Math.round(s.y) - (horiz ? 3 : 4), horiz ? 8 : 6, horiz ? 6 : 8);
        ctx.fillStyle = '#F878A8'; ctx.fillRect(Math.round(s.x) - (horiz ? 3 : 2), Math.round(s.y) - (horiz ? 2 : 3), horiz ? 6 : 4, horiz ? 4 : 6);
        ctx.fillStyle = '#F8F8F8'; ctx.fillRect(Math.round(s.x) + (r < 2 ? 1 : -2), Math.round(s.y) - 1, 1, 1);   // the pompom
      }
      // in the dark, her glasses glint
      if (this.weather === 'night' && (this.frame >> 4) % 3 !== 0) { ctx.fillStyle = '#F8F8F8'; const gx = b.face < 0 ? 32 - 19 - 1 : 13; ctx.fillRect(b.x + gx, b.y + 10, 1, 1); ctx.fillRect(b.x + gx + 5, b.y + 10, 1, 1); }
      if (!b.say) continue;
      const text = b.say.text, w = text.length * 8 + 6, cx = b.x + 16;
      const x = Math.max(0, Math.min(FW - w, Math.round(cx - w / 2))), y = b.y > 20 ? b.y - 16 : b.y + b.h + 6;
      ctx.fillStyle = '#100808'; ctx.fillRect(x - 1, y - 1, w + 2, 13);
      ctx.fillStyle = '#F8F8F8'; ctx.fillRect(x, y, w, 11);
      const tx = Math.max(x + 2, Math.min(x + w - 4, cx - 1));
      if (b.y > 20) { ctx.fillRect(tx, y + 11, 3, 2); ctx.fillRect(tx + 1, y + 13, 1, 1); } else { ctx.fillRect(tx, y - 2, 3, 2); ctx.fillRect(tx + 1, y - 3, 1, 1); }
      Font.draw(ctx, text, x + 3, y + 2, text.includes('#') ? '#D82800' : '#100808');
    }
  },
});

// ------------------------------------------------------------------ drawing on the field
BOSS_RENDER.galya = function (ctx, b, variant, frame, ph) {
  const shout = !!b.say || b.swing > 0, step = b.mode === 'dazed' ? 0 : (b.animTick >> 3) & 1;
  const v = b.swing > 0 && (this.frame >> 2) & 1 ? 'r' : variant, img = BossGfx.get('galya', step + (shout ? 2 : 0), 0, v, ph);
  ctx.save();
  if (b.face < 0) { ctx.translate(b.x + 32, b.y); ctx.scale(-1, 1); ctx.drawImage(img, 0, 0); } else ctx.drawImage(img, b.x, b.y);
  ctx.restore();
  // the bucket by her feet (when she has it)
  if (b.hasBucket) {
    const bx = b.face > 0 ? b.x - 4 : b.x + 26, by = b.y + 22;
    ctx.fillStyle = '#100808'; ctx.fillRect(bx - 1, by - 1, 12, 11);
    ctx.fillStyle = '#9C9CAC'; ctx.fillRect(bx, by, 10, 9); ctx.fillStyle = '#C8C8D8'; ctx.fillRect(bx, by, 10, 2);
    ctx.fillStyle = '#5C7C9C'; ctx.fillRect(bx + 1, by + 1, 8, 1);
  }
  // the mop swinging: a sweep of grey strands round her
  if (b.swing > 0 && b.swing < 8) {
    ctx.fillStyle = '#E0E0E0';
    for (let k = 0; k < 14; k++) { const a = Math.PI * (k / 14) + (b.face > 0 ? -Math.PI / 2 : Math.PI / 2); ctx.fillRect(Math.round(b.x + 16 + Math.cos(a) * 24 * b.face), Math.round(b.y + 16 + Math.sin(a) * 24), 2, 2); }
  }
};

BOSS_OVER.galya = function (ctx, b) {
  const k = b.bucket;
  if (!k) return;
  // the kicked bucket, rolling (water slopping out)
  ctx.fillStyle = '#100808'; ctx.fillRect(k.x - 1, k.y - 1, 12, 12);
  ctx.fillStyle = (k.t >> 2) & 1 ? '#9C9CAC' : '#C8C8D8'; ctx.fillRect(k.x, k.y, 10, 10);
  ctx.fillStyle = '#5C7C9C'; ctx.fillRect(k.x + 2 + ((k.t >> 1) % 6), k.y + 2, 2, 6);
  ctx.fillStyle = '#7CB8F8'; ctx.fillRect(k.x + 5 - DXY[k.d][0] * 9, k.y + 5 - DXY[k.d][1] * 9, 2, 2);
};

// ------------------------------------------------------------------ her pictures (bossart.js)
// the big Galya, front view, about 28x44: mood 0 cross, 1 shouting (fist up), 2 sitting with her tea
function artGalya(c, x, y, t, mood) {
  const skin = '#F8C8A0', skin2 = '#D89870', red = '#D82800', blue = '#3C6CD8', blue2 = '#1C3C8C', ink = '#100808';
  const sit = mood === 2;
  // the mop leaning on her (or against the wall)
  if (!sit) { Pix.line(c, x + 25, y + 2, x + 28, y + 42, '#8C5C24', 2); for (let k = 0; k < 8; k++) Pix.line(c, x + 24 + k, y + 41, x + 22 + k + ((t >> 3) & 1), y + 47, k & 1 ? '#E0E0E0' : '#9C9CAC'); }
  // legs and slippers (sitting: on the upturned bucket)
  if (sit) {
    Pix.rect(c, x + 4, y + 36, 18, 10, '#9C9CAC'); Pix.rect(c, x + 4, y + 36, 18, 2, '#C8C8D8'); Pix.rect(c, x + 3, y + 45, 20, 2, '#7C7C8C');
    Pix.rect(c, x + 6, y + 30, 5, 10, '#8C5C24'); Pix.rect(c, x + 15, y + 30, 5, 10, '#8C5C24');
    Pix.rect(c, x + 4, y + 40, 8, 3, '#F878A8'); Pix.rect(c, x + 14, y + 40, 8, 3, '#F878A8');
  } else {
    Pix.rect(c, x + 8, y + 38, 4, 6, '#8C5C24'); Pix.rect(c, x + 15, y + 38, 4, 6, '#8C5C24');
    Pix.rect(c, x + 6, y + 43, 7, 3, '#F878A8'); Pix.rect(c, x + 14, y + 43, 7, 3, '#F878A8'); Pix.rect(c, x + 7, y + 43, 2, 1, '#F8F8F8'); Pix.rect(c, x + 18, y + 43, 2, 1, '#F8F8F8');
  }
  // the coat
  const top = y + 18, bot = sit ? y + 34 : y + 39;
  for (let yy = top; yy <= bot; yy++) { const hw = 8 + (yy - top) * 0.3; Pix.rect(c, Math.round(x + 13 - hw), yy, Math.round(hw * 2), 1, blue); Pix.rect(c, Math.round(x + 13 - hw), yy, 2, 1, blue2); Pix.rect(c, Math.round(x + 11 + hw), yy, 2, 1, blue2); }
  Pix.rect(c, x + 8, top, 11, 3, '#F8F8F8'); for (let k = 0; k < 5; k++) { Pix.rect(c, x + 9 + k * 2, top + (k & 1), 1, 1, red); Pix.rect(c, x + 9 + k * 2, top + 2 - (k & 1), 1, 1, '#100808'); }   // a vyshyvanka collar
  for (const yy of [top + 4, top + 9, top + 14]) Pix.rect(c, x + 13, yy, 1, 1, '#F8F8F8');
  Pix.rect(c, x + 16, top + 10, 5, 5, blue2); Pix.rect(c, x + 17, top + 9, 3, 1, '#C8C8C8');   // pocket, a rag
  // arms
  if (mood === 1) { Pix.rect(c, x + 1, y + 10, 4, 10, blue); Pix.disc(c, x + 3, y + 8 + ((t >> 2) & 1), 3, skin); }   // shaking her fist
  else if (sit) { Pix.rect(c, x + 2, top + 2, 4, 8, blue); Pix.rect(c, x + 20, top + 2, 4, 8, blue); }
  else { Pix.rect(c, x + 2, top + 2, 4, 12, blue); Pix.disc(c, x + 4, top + 15, 2, skin); }
  if (!sit) { Pix.rect(c, x + 21, top + 2, 4, 6, blue); Pix.disc(c, x + 25, top + 8, 2, skin); }
  if (sit) {
    // a glass of tea in a metal holder, steam rising
    Pix.rect(c, x + 22, top + 6, 6, 8, '#C8A040'); Pix.rect(c, x + 22, top + 6, 6, 2, '#B87818'); Pix.rect(c, x + 21, top + 8, 1, 4, '#9C9CAC'); Pix.rect(c, x + 22, top + 12, 6, 2, '#9C9CAC');
    Pix.disc(c, x + 21, top + 10, 2, skin);
    for (let k = 0; k < 3; k++) { const p = ((t + k * 15) % 45) / 45; Art.dith(c, x + 23 + Math.round(Math.sin(p * 6 + k) * 2), Math.round(top + 4 - p * 12), 2, 2, '#F8F8F8', k); }
  }
  // head: grey hair, face, glasses, eyebrows, mouth
  Pix.disc(c, x + 13, y + 11, 8, '#A8A8A8');
  Pix.disc(c, x + 13, y + 12, 7, skin); Pix.rect(c, x + 7, y + 15, 13, 3, skin2);
  for (const gx of [9, 16]) { Pix.rect(c, x + gx, y + 9, 5, 4, ink); Pix.rect(c, x + gx + 1, y + 10, 3, 2, '#C8E8F8'); Pix.rect(c, x + gx + 1, y + 10, 1, 1, '#F8F8F8'); }
  Pix.rect(c, x + 14, y + 10, 2, 1, ink);
  Pix.line(c, x + 8, y + 6, x + 12, y + 8, ink); Pix.line(c, x + 19, y + 6, x + 15, y + 8, ink);
  if (mood === 1 && (t >> 3) & 1) { Pix.rect(c, x + 11, y + 15, 5, 3, ink); Pix.rect(c, x + 12, y + 17, 3, 1, red); }
  else { Pix.rect(c, x + 10, y + 16, 7, 1, ink); Pix.rect(c, x + 9, y + 17, 1, 1, ink); Pix.rect(c, x + 17, y + 17, 1, 1, ink); }
  Pix.rect(c, x + 7, y + 14, 2, 1, '#F87858'); Pix.rect(c, x + 18, y + 14, 2, 1, '#F87858');
  // the headscarf, red with white dots
  for (let yy = 0; yy < 9; yy++) { const hw = Math.round(Math.sqrt(Math.max(0, 81 - (yy - 8) * (yy - 8) * 1.3))); for (let xx = -hw; xx <= hw; xx++) if (yy < 6 || Math.abs(xx) > 5) Pix.rect(c, x + 13 + xx, y + 2 + yy, 1, 1, (xx * 3 + yy * 5 + 70) % 7 === 0 ? '#F8F8F8' : red); }
  Pix.rect(c, x + 11, y + 19, 5, 3, red); Pix.rect(c, x + 10, y + 21, 2, 2, red); Pix.rect(c, x + 16, y + 21, 2, 2, red);
}

// a Soviet school corridor: green paint below, white above, a tiled floor
function artCorridor(c, clean, t) {
  Pix.rect(c, 0, 0, INTRO_W, 30, '#E8E8D8'); Pix.rect(c, 0, 30, INTRO_W, 16, '#3C8C5C'); Pix.rect(c, 0, 29, INTRO_W, 1, '#2C6C44');
  for (let x = 0; x < INTRO_W; x++) for (let y = 46; y < 64; y++) Pix.rect(c, x, y, 1, 1, ((x >> 3) + (y >> 2)) & 1 ? '#C88848' : '#A86828');
  if (clean) for (let k = 0; k < 6; k++) { const sx = (k * 23 + (t >> 2)) % INTRO_W; Pix.rect(c, sx, 50 + (k * 5) % 12, 1, 1, '#F8F8F8'); Pix.rect(c, sx - 1, 51 + (k * 5) % 12, 3, 1, '#F8E8C8'); }
  // a window, a door, a portrait, a radiator
  Pix.rect(c, 6, 4, 22, 20, '#7C5C3C'); Pix.rect(c, 8, 6, 18, 16, '#A8D8F8'); Pix.rect(c, 16, 6, 2, 16, '#7C5C3C'); Pix.rect(c, 8, 13, 18, 1, '#7C5C3C');
  Pix.rect(c, 84, 8, 20, 38, '#8C5C24'); Pix.rect(c, 86, 10, 16, 14, '#A86C34'); Pix.rect(c, 86, 27, 16, 17, '#A86C34'); Pix.rect(c, 99, 28, 2, 2, '#F8D878');
  Pix.rect(c, 40, 6, 10, 12, '#C8A040'); Pix.rect(c, 41, 7, 8, 10, '#5C5C5C'); Pix.disc(c, 45, 11, 2, '#E8C8A8');
  for (let k = 0; k < 6; k++) Pix.rect(c, 58 + k * 3, 34, 2, 9, '#E8E8E8');
  // a sunflower in a pot on the windowsill
  Pix.rect(c, 29, 18, 1, 6, '#3C8C1C'); Pix.rect(c, 27, 21, 2, 1, '#58A838');
  for (let k = 0; k < 8; k++) Pix.rect(c, 29 + Math.round(Math.cos(k * 0.785) * 3), 15 + Math.round(Math.sin(k * 0.785) * 3), 1, 1, '#F8D800');
  Pix.disc(c, 29, 15, 1, '#5C3C08'); Pix.rect(c, 27, 23, 5, 3, '#B85820');
}

BOSS_ART.galya = {
  intro(c, t) {
    artCorridor(c, false, t);
    // muddy track marks where your tank came in
    for (let x = 0; x < 30; x += 4) { Pix.rect(c, x, 55, 3, 2, '#5C3C18'); Pix.rect(c, x + 1, 60, 3, 2, '#5C3C18'); }
    Art.tank(c, 22, 50, 0, false, t >> 3);
    // the WET FLOOR sign
    Pix.line(c, 34, 42, 30, 56, '#F8D800', 2); Pix.line(c, 34, 42, 38, 56, '#F8D800', 2); Pix.rect(c, 31, 46, 7, 7, '#F8D800'); Pix.rect(c, 34, 47, 1, 3, '#100808'); Pix.rect(c, 34, 51, 1, 1, '#100808');
    // a bucket of dirty water
    Pix.rect(c, 44, 52, 9, 9, '#9C9CAC'); Pix.rect(c, 44, 52, 9, 2, '#C8C8D8'); Pix.rect(c, 45, 53, 7, 1, '#5C7C5C');
    artGalya(c, 58, 14 + ((t >> 4) & 1), t, 1);
  },
  outro(c, t) {
    artCorridor(c, true, t);
    artGalya(c, 40, 15, t, 2);
    Art.tank(c, 86, 50, 0, true, t >> 3); Art.flag(c, 98, 40, t);
  },
  // what she's saying in the picture (drawn at full size over it, by the screen)
  bubble(t, outro) { return outro ? { text: 'KHULIHANY...', x: 18, y: 6 } : (t >> 5) & 1 ? { text: '#@%*!!', x: 52, y: 4 } : { text: 'KUDY PO POMYTOMU?!', x: 26, y: 4 }; },
};
BOSS_TALES.galya = { intro: ['THE SCARIEST THING IN THE WORLD', "DON'T STEP ON THE WET FLOOR!"], outro: "SHE'LL BE BACK ON MONDAY" };

// ------------------------------------------------------------------ her music: SHCHEDRYK
// Mykola Leontovych's Ukrainian carol (1916; known abroad as Carol of the Bells): in 3/4, the four-note bell figure
// over and over, then a third higher, then the falling runs
SONGS.galya = { name: 'SHCHEDRYK', root: 67, bpm: 132, groove: 'waltz', steps: 12, prog: [0, 0, 0, 0, 2, 2, 2, 2, 5, 5, 3, 4], scale: [0, 2, 3, 5, 7, 8, 10],
  mel: '2---1-2-0---'.repeat(4) + '4---3-4-2---'.repeat(4) + '6---5-6-4---'.repeat(2) + '7-7-7-6-5-4-' + '3-3-3-2-1-0-' };
GROOVES.waltz = { drums: 'k...s...s...', bass: 'r...f...f...' };
BOSS_SONGS.galya = 'galya';
