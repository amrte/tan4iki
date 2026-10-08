'use strict';
// =====================================================================
//  The five newer bosses (bosses.js has the framework, the phases and the first five):
//    HARVESTER      a racing combine harvester: rams you, mows trees and bricks, drops hay bales behind it;
//                   OVERDRIVE throws sheaves to the sides; ON FIRE it races flat out leaving burning ground
//    GUNSHIP        a helicopter: flies over everything, lines up with you for gun bursts, fires rocket pairs;
//                   AIR ASSAULT drops paratroopers; GOING DOWN it carpet-bombs the ground as it reels about
//    ARMORED TRAIN  runs along two tracks, a whistle and flashing signals first: a cannon wagon, a rocket wagon and
//                   a troop wagon (troops get off in phase 2); the engine is armored until the wagons are wrecked,
//                   then it jumps the rails and hunts you (DERAILED)
//    SCORPION       walks over bricks, steel and water; its stinger lobs shells at you from afar (more of them each
//                   phase), its claws pinch a tank in front of it; VENOM pools poison you if you stand in them
//    UFO            the last boss (the 10th: stage 100 by default): rings of plasma, a tractor beam that pulls
//                   tanks up into it; a FORCE FIELD that only drops when it attacks, drones, blinking about; then it
//                   CRASH-LANDS and its pilot, a little alien with a ray gun, climbs out to finish the job
// =====================================================================

// ------------------------------------------------------------------ sprites (facing up; f = frame, ph = phase)
Object.assign(BOSS_DRAW, {
  harvester(f, ph) {
    const P = bossPainter(32, 32);
    P.treads(1, 6, 19, 30, f); P.treads(25, 30, 19, 30, f);   // big rear wheels
    P.treads(4, 7, 10, 15, f); P.treads(24, 27, 10, 15, f);   // small front ones
    P.box(7, 9, 24, 29);
    // the reel across the front: turning bars and tines
    for (let y = 1; y <= 6; y++) for (let x = 2; x <= 29; x++) P.px(x, y, (y + f * 2) % 3 === 0 ? 3 : y === 1 ? 1 : 4);
    for (let x = 3; x <= 28; x += 3) P.px(x, 0, 4);
    P.rect(0, 1, 1, 6, 6); P.rect(30, 1, 31, 6, 6); P.rect(0, 7, 31, 7, 6);
    P.rect(13, 8, 18, 9, 3);                                   // feeder
    P.rect(10, 10, 21, 16, 3); P.rect(11, 11, 20, 15, 5); P.line(12, 14, 15, 11, 1);   // the cab's glass
    if (ph === 3) { P.line(16, 11, 19, 15, 7); P.line(17, 13, 20, 12, 7); }
    P.rect(9, 18, 22, 26, 6); P.rect(9, 18, 22, 18, 1);        // grain tank, full of grain
    for (let y = 20; y <= 25; y++) for (let x = 10 + (y & 1); x <= 21; x += 2) P.px(x, y, 1);
    P.disc(22.5, 17, 1.7, 7); P.px(22, 16, 4);                // exhaust
    for (let x = 10; x <= 21; x += 2) P.rect(x, 27, x, 28, 3); // engine grille
    P.px(8, 9, 1); P.px(23, 9, 1);
    P.wear(ph, 6); P.outline();
    return P.g;
  },
  gunship(f, ph) {
    const P = bossPainter(32, 32);
    P.rect(5, 13, 26, 16, 2); P.rect(5, 13, 26, 13, 1); P.rect(5, 16, 26, 16, 3);   // stub wings
    for (const x of [4, 24]) { P.rect(x, 11, x + 3, 19, 3); P.rect(x, 11, x + 3, 11, 4); P.px(x + 1, 10, 6); P.px(x + 2, 10, 6); }   // rocket pods
    P.rect(15, 22, 16, 31, 2); P.rect(16, 22, 16, 31, 3); P.rect(12, 29, 19, 30, 2); P.rect(12, 30, 19, 30, 3);   // tail boom, tail plane
    if (f & 1) P.rect(18, 25, 18, 31, 4); else P.rect(17, 28, 20, 28, 4);           // tail rotor
    P.ellipse(16, 13, 5.5, 10);                                                       // fuselage
    P.disc(16, 7, 3.2, 5); P.disc(16, 12, 2.6, 5); P.px(15, 6, 1); P.px(15, 11, 1);   // the two cockpits
    P.rect(15, 0, 16, 3, 4); P.disc(16, 3.5, 1.6, 3);                                 // chin gun
    P.px(13, 18, 7); P.px(18, 18, 7);                                                 // exhausts
    P.px(16, 20, 6);
    P.wear(ph, 7); P.outline();
    return P.g;
  },
  // the train's cars: 16 wide, 32 long, the front at the top
  trainLoco(f, ph) {
    const P = bossPainter(16, 32);
    for (let y = 6; y <= 24; y++) for (let x = 3; x <= 12; x++) P.px(x, y, x <= 4 ? 1 : x >= 10 ? 3 : 2);   // the boiler
    for (const y of [10, 16, 22]) P.rect(3, y, 12, y, 3);
    P.disc(8, 9, 2.6, 7); P.ring(8, 9, 2.6, 3);                                       // smokestack
    P.disc(8, 15.5, 2, 4); P.px(7, 15, 1);                                           // steam dome
    P.box(1, 24, 14, 31); P.rect(2, 25, 13, 30, 6); P.rect(2, 25, 13, 25, 1);         // cab, red roof
    P.rect(1, 4, 14, 5, 6);                                                           // buffer beam
    for (let y = 0; y <= 3; y++) P.rect(7 - y * 2, y, 8 + y * 2, y, y & 1 ? 3 : 4);  // cowcatcher
    P.px(7, 5, 5); P.px(8, 5, 5);                                                     // headlamp
    for (let y = 7; y <= 23; y += 2) { const c = (y + f * 2) % 4 < 2 ? 4 : 7; P.px(0, y, c); P.px(15, y, c); }   // wheels
    P.wear(ph, 8); P.outline();
    return P.g;
  },
  trainCannon(f, ph) {
    const P = bossPainter(16, 32);
    P.box(1, 1, 14, 30);
    for (let y = 3; y <= 28; y += 3) P.rect(2, y, 13, y, 3);
    P.ring(8, 16, 6, 6);                                                              // sandbags
    P.circle(8, 16, 4.5); P.disc(8, 16, 1.5, 4);
    P.rect(0, 15, 3, 16, 4); P.rect(12, 15, 15, 16, 4);                              // a barrel to each side
    P.wear(ph, 9); P.outline();
    return P.g;
  },
  trainRocket(f, ph) {
    const P = bossPainter(16, 32);
    P.box(1, 1, 14, 30);
    P.rect(3, 8, 12, 23, 3);
    for (let k = 0; k < 3; k++) for (const x of [5.5, 10.5]) { P.disc(x, 11 + k * 5, 1.8, 7); P.px(Math.floor(x), 11 + k * 5, 6); }   // tubes, red warheads
    P.wear(ph, 10); P.outline();
    return P.g;
  },
  trainTroop(f, ph) {
    const P = bossPainter(16, 32);
    P.box(1, 1, 14, 30);
    for (let y = 4; y <= 27; y += 4) P.rect(2, y, 13, y, 3);                          // roof ribs
    P.rect(7, 2, 8, 29, 1); P.rect(8, 2, 8, 29, 3);                                   // roof ridge
    P.rect(5, 13, 10, 18, 6); P.rect(5, 13, 10, 13, 1);                               // hatch
    P.wear(ph, 11); P.outline();
    return P.g;
  },
  trainWreck(f) {
    const P = bossPainter(16, 32);
    P.rect(1, 1, 14, 30, 3);
    for (let y = 2; y <= 29; y++) for (let x = 2; x <= 13; x++) if ((x * 7 + y * 13) % 9 === 0) P.px(x, y, 7);
    for (const [x, y] of [[4, 6], [10, 14], [6, 22], [11, 27]]) P.px(x, y, f & 1 ? 5 : 6);   // embers
    P.outline();
    return P.g;
  },
  scorpion(f, ph) {
    const P = bossPainter(32, 32);
    // eight legs, stepping in turn
    for (let i = 0; i < 4; i++) {
      const y = 12 + i * 4, k = (i + f) & 1 ? 1 : -1;
      P.line(11, y, 4, y - 2 + k * 2, 6); P.line(4, y - 2 + k * 2, 1, y + 2 + k * 2, 6);
      P.line(20, y, 27, y - 2 - k * 2, 6); P.line(27, y - 2 - k * 2, 30, y + 2 - k * 2, 6);
    }
    P.ellipse(16, 13, 6.5, 6); P.ellipse(16, 21.5, 5.5, 5.5);   // head and body
    P.rect(11, 17, 20, 17, 3);
    P.px(14, 9, 5); P.px(17, 9, 5); P.px(13, 10, 5); P.px(18, 10, 5);   // eyes
    // claws: arms reaching forward, pincers opening and shutting (one torn off in phase 3)
    for (const s of [-1, 1]) {
      const ax = 16 + s * 5;
      if (ph === 3 && s === 1) { P.line(ax, 9, ax + 3, 6, 6); continue; }
      P.line(ax, 9, ax + s * 4, 5, 2); P.line(ax + s, 9, ax + s * 5, 5, 2);
      const cx = 16 + s * 10;
      P.ellipse(cx, 3.5, 3.3, 3.5);
      P.rect(cx - (s < 0 ? 0 : 1), 0, cx - (s < 0 ? 0 : 1), f & 1 ? 3 : 1, 0);   // the jaws
    }
    // the tail curls over its back, the sting pointing forward
    for (const [y, r] of [[30, 2.2], [27, 2.4], [24, 2.5], [21, 2.5], [18, 2.3]]) P.ellipse(16, y, r, 1.8);
    P.rect(15, 13, 16, 15, 5); P.px(15, 12, 7); P.px(16, 12, 7);
    P.wear(ph, 12); P.outline();
    return P.g;
  },
  // seen from above, never turned; f = the rim lights' chase step (0-2)
  ufo(f, ph) {
    const P = bossPainter(48, 48);
    P.ellipse(24, 24, 22.5, 22.5);
    P.ring(24, 24, 15.5, 3);
    for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4 + 0.39; P.line(24 + Math.cos(a) * 11, 24 + Math.sin(a) * 11, 24 + Math.cos(a) * 15, 24 + Math.sin(a) * 15, 3); }
    for (let k = 0; k < 12; k++) { const a = k * Math.PI / 6; P.disc(24 + Math.cos(a) * 19, 24 + Math.sin(a) * 19, 1.3, (k + f) % 3 === 0 ? 4 : (k + f) % 3 === 1 ? 5 : 6); }
    // the glass dome, and the pilot under it
    P.disc(24, 24, 9.5, 5);
    P.ellipse(24, 22, 3.6, 4.2); for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) if (P.g[y][x] >= 1 && P.g[y][x] <= 3 && Math.hypot(x + 0.5 - 24, y + 0.5 - 22) < 4.4) P.g[y][x] = 6;
    P.rect(22, 21, 22, 23, 7); P.rect(26, 21, 26, 23, 7); P.px(21, 22, 7); P.px(27, 22, 7);   // big black eyes
    P.disc(24, 28, 2.2, 6); P.px(24, 16, 6); P.px(24, 17, 6);
    P.px(19, 19, 4); P.px(20, 18, 4); P.px(18, 20, 4);   // glint on the glass
    P.wear(ph, 13); P.outline();
    return P.g;
  },
  alien(f) {
    const P = bossPainter(16, 16);
    P.rect(5, 11 + (f & 1), 6, 15, 3); P.rect(9, 12 - (f & 1), 10, 15, 3);   // legs
    P.ellipse(8, 10.5, 3, 3);
    P.ellipse(8, 6, 5, 4.6);                                                   // the big head
    P.rect(5, 5, 6, 7, 7); P.rect(9, 5, 10, 7, 7); P.px(5, 5, 1); P.px(9, 5, 1);
    P.px(6, 1, 2); P.px(10, 1, 2); P.px(6, 0, 6); P.px(10, 0, 6);            // feelers
    P.rect(12, 2, 13, 9, 4); P.px(12, 1, 5); P.px(13, 1, 5);                  // ray gun
    P.outline();
    return P.g;
  },
});

// ------------------------------------------------------------------ set-up (this = Stage)
Object.assign(BOSS_INIT, {
  harvester(b, def, hp) {
    b.hp = b.maxHp = hp(def.hp);
    b.mode = 'drive'; b.dir = 2; b.baleT = 60; b.sheafT = 0; b.bales = []; b.fires = [];
  },
  gunship(b, def, hp) {
    b.hp = b.maxHp = hp(def.hp);
    b.y = 8; b.dir = 2; b.cd = 60; b.burst = 0; b.rocketT = 120; b.dropT = 0; b.bombT = 0; b.bombs = []; b.wp = null;
  },
  train(b, def, hp) {
    b.cars = [['Loco', def.locoHp], ['Cannon', def.carHp], ['Rocket', def.carHp], ['Troop', def.carHp]].map(([k, n], i) => ({ k, hp: hp(n), max: hp(n), cd: 40 + i * 30 }));
    b.hp = b.maxHp = b.cars.reduce((a, c) => a + c.hp, 0);
    b.tracks = this.layTracks();
    b.w = 32 * b.cars.length; b.h = 16;
    b.mode = 'wait'; b.t = 0; b.wait = 150; b.track = 0; b.y = b.tracks[0]; b.dir = 1; b.x = -b.w;
  },
  scorpion(b, def, hp) {
    b.hp = b.maxHp = hp(def.hp);
    b.y = 8; b.dir = 2; b.mode = 'walk'; b.stingT = 90; b.stings = []; b.pools = []; b.clawT = 0; b.pinch = 0;
  },
  ufo(b, def, hp) {
    b.hp = b.maxHp = hp(def.hp);
    b.y = 8; b.dir = 2; b.ringT = 90; b.beamT = 0; b.beam = null; b.droneT = 0; b.blinkT = 0; b.open = 0; b.wp = null; b.mode = 'fly';
  },
});

// ------------------------------------------------------------------ how hits land (false: no damage)
Object.assign(BOSS_DAMAGE, {
  train(bo, dmg, hx) {
    if (bo.derailed) {
      const loco = bo.cars[0];
      loco.hp = Math.max(0, loco.hp - dmg * (bo.mode === 'dazed' ? 2 : 1));
      bo.hp = loco.hp;
      return true;
    }
    const cars = this.trainCars(bo), at = hx === undefined ? bo.x + bo.w / 2 : hx;
    let car = cars.find(c => at >= c.x && at < c.x + 32);
    if (!car) car = cars.reduce((a, c) => (Math.abs(c.x + 16 - at) < Math.abs(a.x + 16 - at) ? c : a));
    const wagonsLeft = bo.cars.some(c => c.k !== 'Loco' && c.hp > 0);
    if (car.c.hp <= 0 || (car.c.k === 'Loco' && wagonsLeft)) {
      // a wreck takes nothing; the engine is armored while any wagon still stands
      Sound.play('steel');
      if (car.c.k === 'Loco' && !(bo.armorNote > 0)) { bo.armorNote = 90; this.popups.push({ x: car.x + 16, y: car.y - 6, text: 'ARMORED', label: true, color: COL.lgrey, t: 0, delay: 0, life: 50 }); }
      return false;
    }
    car.c.hp = Math.max(0, car.c.hp - dmg);
    if (car.c.hp === 0) {
      this.addFx(car.x + 16, car.y + 8, BIG_EXPLOSION(), 5);
      Sound.play('explode');
    }
    bo.hp = bo.cars.reduce((a, c) => a + c.hp, 0);
    if (!bo.cars.some(c => c.k !== 'Loco' && c.hp > 0)) bo.forcePhase = 3;   // every wagon wrecked: off the rails
    return true;
  },
  ufo(bo, dmg) {
    // the force field (phase 2) stops everything, except just after it attacks
    if (!bo.crashed && bo.phase === 2 && !(bo.open > 0)) {
      bo.shieldHit = 8;
      Sound.play('steel');
      return false;
    }
    bo.hp -= dmg;
    return true;
  },
});

// ------------------------------------------------------------------ phase changes
Object.assign(BOSS_PHASE, {
  harvester(b, ph) { if (ph === 3) { this.addFx(b.x + 16, b.y + 26, BIG_EXPLOSION(), 4); Sound.play('explode'); } },
  gunship(b, ph) { if (ph === 3) { b.wobble = 0; Sound.play('explode'); } },
  train(b, ph) {
    if (ph === 2) this.popups.push({ x: b.x + b.w / 2, y: b.y - 6, text: 'TROOPS OUT!', label: true, color: COL.gold, t: 0, delay: 0, life: 90 });
    if (ph !== 3 || b.derailed) return;
    // every wagon goes up, and the engine jumps the rails
    const cars = this.trainCars(b), loco = cars.find(c => c.c.k === 'Loco');
    cars.forEach((c, i) => { if (c.c.k !== 'Loco') this.fx.push({ x: c.x + 16, y: c.y + 8, frames: BIG_EXPLOSION(), per: 5, tick: -i * 6 }); });
    b.cars = [loco.c];
    b.x = Math.max(0, Math.min(FW - 32, Math.round(loco.x / 4) * 4)); b.w = 32; b.h = 16;
    b.derailed = true; b.mode = 'charge'; b.t = 0; b.cd = 0;
    b.hp = loco.c.hp;
    Sound.play('explode');
  },
  scorpion(b, ph) { if (ph === 3) { this.addFx(b.x + 26, b.y + 4, BIG_EXPLOSION(), 4); Sound.play('explode'); } },   // a claw comes off
  ufo(b, ph) {
    if (ph === 2) { b.open = 0; Sound.play('teleport'); }
    if (ph !== 3 || b.crashed) return;
    // CRASH-LANDED: the saucer comes down in flames and the pilot climbs out
    b.wreck = { x: b.x, y: b.y };
    for (let i = 0; i < 8; i++) this.fx.push({ x: b.x + 6 + rnd(36), y: b.y + 6 + rnd(36), frames: BIG_EXPLOSION(), per: 5, tick: -i * 6 });
    Sound.play('bossDie');
    const [cx, cy] = this.bossCenter(b), spot = this.alienSpot(cx, cy);
    b.crashed = true; b.beam = null; b.open = 0;
    b.w = b.h = 16; [b.x, b.y] = spot;
    b.dir = 2; b.cd = 60; b.blinkT = 0; b.acc = 0; b.mode = 'roam'; b.stagger = 70; b.animTick = 0;
    this.popups.push({ x: cx, y: cy - 30, text: 'THE PILOT ESCAPES!', label: true, color: '#58D854', t: 0, delay: 30, life: 120 });
  },
});

// smoke from the engine, not just anywhere on the hull
Object.assign(BOSS_SMOKE, {
  harvester(b) { return [b.x + 16 + DXY[(b.dir + 2) % 4][0] * 12 + rnd(5) - 2, b.y + 16 + DXY[(b.dir + 2) % 4][1] * 12 + rnd(5) - 2]; },
  train(b) { const c = this.trainCars(b)[0]; return [c.x + 8 + rnd(16), c.y + 4 + rnd(8)]; },
  ufo(b) { return b.crashed && b.wreck ? [b.wreck.x + 8 + rnd(32), b.wreck.y + 8 + rnd(32)] : [b.x + 6 + rnd(36), b.y + 10 + rnd(28)]; },
});

// ------------------------------------------------------------------ behaviour (this = Stage)
Object.assign(BOSS_AI, {
  // HARVESTER: races along, steering for the nearest player at every crossing, crushing tanks and bricks and
  // mowing trees; slams into steel and stalls (double damage). Drops hay bales behind it.
  harvester(b) {
    b.t++;
    const ph = b.phase || 1;
    this.harvesterFires(b);
    if (b.mode === 'stall') { if (b.t >= 70) { b.mode = 'drive'; b.t = 0; b.turnNow = true; } return; }
    if (b.t % 14 === 0) Sound.play('charge');
    if ((b.x & 7) === 0 && (b.y & 7) === 0 && (b.turnNow || b.t % 24 === 0)) { b.turnNow = false; b.dir = this.harvesterSteer(b, false); }
    const r = this.bossMove(b, b.dir, [1.4, 1.8, 2.3][ph - 1], true);
    // trees in its way are mown down
    for (let cy = b.y >> 2; cy <= (b.y + b.h - 1) >> 2; cy++) for (let cx = b.x >> 2; cx <= (b.x + b.w - 1) >> 2; cx++) if (this.get(cx, cy) === T_FOREST) this.set(cx, cy, T_EMPTY);
    if (r) {
      if (r === 'steel') {
        b.mode = 'stall'; b.t = 0;
        this.addFx(b.x + 16 + DXY[b.dir][0] * 16, b.y + 16 + DXY[b.dir][1] * 16, Sprites.smallExp, 3);
        Sound.play('steel');
      }
      b.dir = this.harvesterSteer(b, true);
    }
    if (--b.baleT <= 0) { b.baleT = ph === 1 ? 150 : 110; this.dropBale(b); }
    // OVERDRIVE: sheaves flung out to both sides
    if (ph >= 2 && ++b.sheafT >= 45) {
      b.sheafT = 0;
      const [cx, cy] = this.bossCenter(b);
      for (const d of [(b.dir + 1) % 4, (b.dir + 3) % 4]) this.bossFire(b, cx + DXY[d][0] * 18, cy + DXY[d][1] * 18, d, { speed: 2.5 });
    }
    // ON FIRE: burning ground behind it
    if (ph === 3 && b.t % 10 === 0 && b.mode === 'drive') {
      const d = (b.dir + 2) % 4;
      b.fires.push({ x: Math.round(b.x + 16 + DXY[d][0] * 14 - 6), y: Math.round(b.y + 16 + DXY[d][1] * 14 - 6), t: 300 });
      if (b.fires.length > 40) b.fires.shift();
    }
  },

  // GUNSHIP: flies to a spot lined up with you and opens up with its gun; a pair of rockets now and then.
  // AIR ASSAULT: drops paratroopers. GOING DOWN: reels about dropping a carpet of bombs.
  gunship(b) {
    b.t++; b.animTick++;
    const ph = b.phase || 1;
    if (b.t % 24 === 0) Sound.play('rotor');
    for (const bm of b.bombs) {
      if (++bm.t < 24) continue;
      bm.done = true;
      this.blast(bm.x, bm.y, 10, false, null);
      this.addFx(bm.x, bm.y, Sprites.bigExp, 4);
      Sound.play('explode');
    }
    b.bombs = b.bombs.filter(bm => !bm.done);
    const [cx, cy] = this.bossCenter(b), [tx, ty] = this.bossTarget(b);
    if (!b.wp || Math.hypot(b.wp[0] - b.x, b.wp[1] - b.y) < 2 || b.t % 240 === 0) b.wp = this.gunshipWaypoint(tx, ty);
    let [wx, wy] = b.wp;
    if (ph === 3) { wx += Math.sin(b.t / 9) * 24; wy += Math.cos(b.t / 13) * 16; }   // it can hardly keep straight
    const dx = wx - b.x, dy = wy - b.y, d = Math.hypot(dx, dy), sp = [0.8, 1, 1.15][ph - 1] * b.speedMul;
    if (d > 0.5) { b.x += dx / d * Math.min(sp, d); b.y += dy / d * Math.min(sp, d); }
    b.x = Math.max(0, Math.min(FW - b.w, b.x)); b.y = Math.max(0, Math.min(FH - b.h, b.y));
    b.dir = this.dirToward(cx, cy, tx, ty);
    const lined = Math.abs(tx - cx) < 10 || Math.abs(ty - cy) < 10;
    if (--b.cd <= 0 && lined) { b.burst = [3, 4, 5][ph - 1]; b.cd = [100, 85, 75][ph - 1]; }
    if (b.burst > 0 && b.t % 6 === 0) {
      b.burst--;
      const [x, y] = this.bossMuzzle(b, b.dir);
      if (!this.shotHitsEagle(x, y, b.dir)) this.bossFire(b, x, y, b.dir, { speed: 3.2 });
    }
    if (++b.rocketT >= [300, 240, 200][ph - 1] && !this.shotHitsEagle(cx, cy, b.dir)) {
      b.rocketT = 0;
      for (const off of [-10, 10]) { const [x, y] = this.bossMuzzle(b, b.dir, off); this.bossFire(b, x, y, b.dir, { speed: 2.2, rocket: true }); }
      Sound.play('mortar');
    }
    if (ph >= 2 && ++b.dropT >= 420) {
      b.dropT = 0;
      if (this.summonAt(rnd(2), cx, cy)) this.popups.push({ x: cx, y: cy - 20, text: 'PARATROOPERS!', label: true, color: COL.gold, t: 0, delay: 0, life: 70 });
    }
    // bombs, but never on the eagle's own doorstep
    if (ph === 3 && ++b.bombT >= 16) {
      b.bombT = 0;
      if (Math.hypot(cx - BASE_X - 8, cy - BASE_Y - 8) > 36) b.bombs.push({ x: Math.round(cx), y: Math.round(cy), t: 0 });
    }
  },

  // ARMORED TRAIN: along a track and off the far side, then (after the signals flash) back along one of the two
  train(b) {
    b.t++;
    if (b.armorNote > 0) b.armorNote--;
    if (b.derailed) { this.trainDerailed(b); return; }
    const ph = b.phase || 1;
    if (b.mode === 'wait') {
      if (b.t === b.wait - 70) Sound.play('whistle');
      if (b.t >= b.wait) { b.mode = 'run'; b.t = 0; }
      return;
    }
    b.x += (b.dir === 1 ? 1 : -1) * [1.2, 1.6, 2][ph - 1] * b.speedMul;
    if (b.t % 20 === 0) Sound.play('charge');
    const cars = this.trainCars(b);
    for (const car of cars) {
      if (car.x + 32 <= 0 || car.x >= FW) continue;
      this.trainCrush(car);
      if (car.c.hp <= 0) continue;
      const cx = car.x + 16, cy = car.y + 8;
      if (car.c.k === 'Loco') { if (b.t % 6 === 0) this.puffs.push({ x: car.x + (b.dir === 1 ? 22 : 9), y: car.y + 6, t: 30, vx: (b.dir === 1 ? -0.4 : 0.4) }); continue; }
      if (--car.c.cd > 0) continue;
      const tg = this.tanks.filter(t => t.isPlayer && t.alive && !t.boost.smoke);
      if (car.c.k === 'Cannon') {
        // fires up or down at a tank level with it, else both ways now and then
        const p = tg.find(t => Math.abs(t.x + 8 - cx) < 20);
        if (p) { const d = p.y < car.y ? 0 : 2; this.bossFire(b, cx, cy + DXY[d][1] * 12, d, { speed: 3 }); car.c.cd = 50; }
        else if (car.c.cd < -70) { for (const d of [0, 2]) this.bossFire(b, cx, cy + DXY[d][1] * 12, d, { speed: 2.5 }); car.c.cd = 40; }
      } else if (car.c.k === 'Rocket') {
        if (tg.length) {
          const p = tg.reduce((a, t) => (Math.hypot(t.x - cx, t.y - cy) < Math.hypot(a.x - cx, a.y - cy) ? t : a)), d = this.dirToward(cx, cy, p.x + 8, p.y + 8);
          this.bossFire(b, cx + DXY[d][0] * 20, cy + DXY[d][1] * 12, d, { speed: 2.2, rocket: true });
          Sound.play('mortar');
        }
        car.c.cd = 150;
      } else if (car.c.k === 'Troop') {
        // TROOPS OUT (phase 2 on): a tank jumps down beside the track
        if (ph >= 2 && cx > 16 && cx < FW - 16) this.summonAt(rnd(2) ? 0 : 3, cx, cy + (rnd(2) ? 24 : -24));
        car.c.cd = 240;
      }
    }
    if ((b.dir === 1 && b.x > FW) || (b.dir === 3 && b.x + b.w < 0)) {
      b.mode = 'wait'; b.t = 0; b.wait = [110, 90, 70][ph - 1] + rnd(40);
      b.track = rnd(b.tracks.length); b.y = b.tracks[b.track];
      b.dir = rnd(2) ? 1 : 3; b.x = b.dir === 1 ? -b.w : FW;
    }
  },

  // SCORPION: walks straight over walls and water towards you; the sting lobs shells from afar (a red cross marks
  // where); the claws pinch a tank right in front of it (they snap open first: get away).
  scorpion(b) {
    b.t++;
    const ph = b.phase || 1;
    this.scorpionStings(b);
    // claws
    const fr = this.clawZone(b), victim = this.tanks.find(t => t.alive && t.isPlayer && overlap(t.x, t.y, 16, 16, fr[0], fr[1], fr[2], fr[3]));
    if (b.pinch > 0) {
      if (--b.pinch === 0) {
        if (victim) this.hitPlayer(victim);
        Sound.play('chomp');
        b.clawCd = 50;
      }
      return;
    }
    if (b.clawCd > 0) b.clawCd--;
    else if (victim) { b.pinch = 24; Sound.play('mark'); return; }
    this.scorpionWalk(b, [0.45, 0.6, 0.85][ph - 1]);
    if (--b.stingT <= 0) {
      b.stingT = [170, 135, 110][ph - 1];
      const [cx, cy] = this.bossCenter(b);
      for (const [tx, ty] of this.stingTargets(b, ph)) b.stings.push({ x0: cx, y0: cy - 4, x: cx, y: cy, tx, ty, p: 0 });
      Sound.play('mortar');
    }
    // FRENZY: the claws shoot too
    if (ph === 3 && ++b.clawT >= 60) {
      b.clawT = 0;
      for (const off of [-10, 10]) { const [x, y] = this.bossMuzzle(b, b.dir, off); this.bossFire(b, x, y, b.dir, { speed: 2.8 }); }
    }
  },

  // UFO: drifts about firing rings of plasma; now and then it lines up over a tank and pulls it up in a tractor
  // beam (walls hold you back; drive out sideways). FORCE FIELD: hits bounce off except just after it attacks;
  // drones; it blinks about. CRASH-LANDED: the alien pilot fights on, small, quick, with a ray gun.
  ufo(b) {
    b.t++; b.animTick++;
    if (b.crashed) { this.alienAct(b); return; }
    const ph = b.phase || 1;
    if (b.open > 0) b.open--;
    if (b.shieldHit > 0) b.shieldHit--;
    if (b.t % 48 === 0) Sound.play('ufo');
    if (b.beam) { this.ufoBeam(b); return; }
    const [cx, cy] = this.bossCenter(b);
    if (++b.beamT >= 420 && !b.hunt) {
      const pl = this.tanks.filter(t => t.isPlayer && t.alive && !t.boost.smoke);
      if (pl.length) { const p = pl[rnd(pl.length)]; b.hunt = 200; b.wp = [Math.max(0, Math.min(FW - 48, p.x + 8 - 24)), Math.max(0, p.y - 80)]; }
      b.beamT = 0;
    }
    if (b.hunt > 0) {
      b.hunt--;
      if (Math.abs(b.wp[0] - b.x) < 1.5 && Math.abs(b.wp[1] - b.y) < 1.5) { b.beam = { t: 0 }; b.hunt = 0; return; }
      if (b.hunt === 0) b.wp = null;
    }
    if (!b.wp || (!b.hunt && Math.hypot(b.wp[0] - b.x, b.wp[1] - b.y) < 2)) b.wp = this.ufoWaypoint();
    const dx = b.wp[0] - b.x, dy = b.wp[1] - b.y, d = Math.hypot(dx, dy), sp = (b.hunt ? 1.2 : [0.6, 0.8][ph - 1]) * b.speedMul;
    if (d > 0.3) { b.x += dx / d * Math.min(sp, d); b.y += dy / d * Math.min(sp, d); }
    if (--b.ringT <= 0) {
      for (const dd of [0, 1, 2, 3]) for (const off of [-12, 12]) {
        if (this.shotHitsEagle(cx + (DXY[dd][1] ? off : 0), cy + (DXY[dd][0] ? off : 0), dd)) continue;
        this.bossFire(b, cx + DXY[dd][0] * 26 + (DXY[dd][1] ? off : 0), cy + DXY[dd][1] * 26 + (DXY[dd][0] ? off : 0), dd, { speed: 2.2 });
      }
      b.ringT = [110, 90][ph - 1]; b.open = 50;
      Sound.play('zap');
    }
    if (ph >= 2) {
      if (++b.droneT >= 420) { b.droneT = 0; if (this.summonAt(1, cx, cy + 32)) b.open = 50; }
      if (++b.blinkT >= 360 && !b.hunt) {
        b.blinkT = 0;
        b.x = rnd(Math.max(1, (FW - 48) / 8 + 1)) * 8; b.y = rnd(Math.max(1, Math.floor((FH * 0.5 - 48) / 8))) * 8; b.wp = null;
        Sound.play('teleport');
      }
    }
  },
});

// ------------------------------------------------------------------ helpers (this = Stage)
Object.assign(Stage.prototype, {
  // --- harvester
  // towards the nearest player, mostly; after a bump, one of the two ways to the side (else back)
  harvesterSteer(b, bumped) {
    const [cx, cy] = this.bossCenter(b), [tx, ty] = this.bossTarget(b), dx = tx - cx, dy = ty - cy;
    const want = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : (dy > 0 ? 2 : 0);
    const other = Math.abs(dx) > Math.abs(dy) ? (dy > 0 ? 2 : 0) : (dx > 0 ? 1 : 3);
    if (!bumped) return Math.random() < 0.8 && want !== (b.dir + 2) % 4 ? want : b.dir;
    const sides = [(b.dir + 1) % 4, (b.dir + 3) % 4].sort((p, q) => (q === want || q === other) - (p === want || p === other));
    for (const d of sides) if (this.bossCanGo(b, d)) return d;
    return (b.dir + 2) % 4;
  },

  // could a boss take a step that way (bricks don't count: it smashes them)
  bossCanGo(b, d) {
    const nx = b.x + DXY[d][0] * 4, ny = b.y + DXY[d][1] * 4;
    if (nx < 0 || ny < 0 || nx + b.w > FW || ny + b.h > FH) return false;
    for (let cy = ny >> 2; cy <= (ny + b.h - 1) >> 2; cy++) for (let cx = nx >> 2; cx <= (nx + b.w - 1) >> 2; cx++) {
      const t = this.get(cx, cy);
      if (t === T_STEEL || t === T_WATER) return false;
    }
    return true;
  },

  // a hay bale (an 8x8 brick block) out the back
  dropBale(b) {
    const d = (b.dir + 2) % 4, x = Math.round((b.x + 16 + DXY[d][0] * 22 - 4) / 8) * 8, y = Math.round((b.y + 16 + DXY[d][1] * 22 - 4) / 8) * 8;
    if (x < 0 || y < 0 || x > FW - 8 || y > FH - 8 || overlap(x, y, 8, 8, BASE_X - 16, BASE_Y - 16, 48, 32)) return;
    for (let cy = y >> 2; cy < (y + 8) >> 2; cy++) for (let cx = x >> 2; cx < (x + 8) >> 2; cx++) if (this.get(cx, cy) !== T_EMPTY) return;
    if (this.tanks.some(t => t.alive && overlap(x, y, 8, 8, t.x, t.y, 16, 16))) return;
    for (let cy = y >> 2; cy < (y + 8) >> 2; cy++) for (let cx = x >> 2; cx < (x + 8) >> 2; cx++) this.set(cx, cy, T_BRICK);
    b.bales.push({ x, y });
    if (b.bales.length > 30) b.bales.shift();
    Sound.play('build');
  },

  // burning ground (phase 3): a player standing in it is hit every half second
  harvesterFires(b) {
    for (const f of b.fires) f.t--;
    b.fires = b.fires.filter(f => f.t > 0);
    if (!b.fires.length || this.frame % 30) return;
    for (const t of this.tanks) if (t.alive && t.isPlayer && b.fires.some(f => overlap(t.x + 2, t.y + 2, 12, 12, f.x, f.y, 12, 12))) this.hitPlayer(t);
  },

  // would a shot from (x, y) going that way run into the eagle? (bosses that aim at you don't fire through it)
  shotHitsEagle(x, y, d) {
    if (this.noBase) return false;
    const ex = BASE_X + 8, ey = BASE_Y + 8, [dx, dy] = DXY[d];
    return dx ? Math.abs(y - ey) < 12 && (ex - x) * dx > 0 : Math.abs(x - ex) < 12 && (ey - y) * dy > 0;
  },

  // --- gunship: a spot lined up with the target, 56-88 px from it
  gunshipWaypoint(tx, ty) {
    const d = rnd(4), dist = 56 + rnd(33);
    return [Math.max(0, Math.min(FW - 32, tx - DXY[d][0] * dist - 16)), Math.max(0, Math.min(FH - 32, ty - DXY[d][1] * dist - 16))];
  },

  // --- train
  // two tracks across the field (a quarter and a half of the way down), cleared of everything
  layTracks() {
    const ys = [3, 7].map(r => Math.min(FH - 48, Math.round(FH * r / 13 / 16) * 16));
    for (const y of ys) for (let cy = y >> 2; cy < (y + 16) >> 2; cy++) for (let cx = 0; cx < GW; cx++) {
      if (this.get(cx, cy) !== T_EMPTY) this.set(cx, cy, T_EMPTY);
      if (this.origTerrain) this.origTerrain[cy * GW + cx] = T_EMPTY;
    }
    return ys;
  },

  // the cars in order from the front, where each one is now
  trainCars(b) {
    const n = b.cars.length;
    return b.cars.map((c, i) => ({ c, x: b.dir === 1 ? b.x + (n - 1 - i) * 32 : b.x + i * 32, y: b.y }));
  },

  // anything on the track goes under the wheels
  trainCrush(car) {
    for (let cy = car.y >> 2; cy < (car.y + 16) >> 2; cy++) for (let cx = Math.max(0, car.x >> 2); cx < Math.min(GW, (car.x + 32) >> 2); cx++) {
      const t = this.get(cx, cy);
      if (t === T_BRICK || t === T_FOREST) this.set(cx, cy, T_EMPTY);
    }
    for (const t of this.tanks) {
      if (!t.alive || !overlap(t.x, t.y, 16, 16, car.x, car.y, 32, 16)) continue;
      if (t.isPlayer) this.hitPlayer(t); else this.killEnemy(t, null, false);
    }
  },

  // DERAILED: the engine on its own, charging about like the bear, its cannon firing ahead
  trainDerailed(b) {
    if (b.mode === 'dazed') { if (b.t >= 60) { b.mode = 'charge'; b.t = 0; this.trainTurn(b); } return; }
    const r = this.bossMove(b, b.dir, 2.2, true);
    if (b.t % 10 === 0) Sound.play('charge');
    if (r) {
      if (r === 'steel' || r === 'water' || r === 'edge' || r === 'eagle') { b.mode = 'dazed'; b.t = 0; Sound.play('explode'); }
      else this.trainTurn(b);
    } else if ((b.x & 7) === 0 && (b.y & 7) === 0 && b.t % 40 === 0) this.trainTurn(b);
    if (++b.cd >= 50) { b.cd = 0; const [x, y] = this.bossMuzzle(b, b.dir); this.bossFire(b, x, y, b.dir, { speed: 3 }); }
    if (b.t % 6 === 0) { const [cx, cy] = this.bossCenter(b); this.puffs.push({ x: cx, y: cy, t: 30 }); }
  },

  // turn the runaway engine towards the target (a quarter turn swaps its length and width, if there's room)
  trainTurn(b) {
    const [cx, cy] = this.bossCenter(b), [tx, ty] = this.bossTarget(b);
    let d = this.dirToward(cx, cy, tx, ty);
    if (d === b.dir) return;
    const vert = !(d & 1), w = vert ? 16 : 32, h = vert ? 32 : 16;
    const nx = Math.round((cx - w / 2) / 4) * 4, ny = Math.round((cy - h / 2) / 4) * 4;
    if (nx < 0 || ny < 0 || nx + w > FW || ny + h > FH || overlap(nx, ny, w, h, BASE_X, BASE_Y, 16, 16)) return;
    for (let y = ny >> 2; y < (ny + h) >> 2; y++) for (let x = nx >> 2; x < (nx + w) >> 2; x++) {
      const t = this.get(x, y);
      if (t === T_STEEL || t === T_WATER) return;
    }
    b.dir = d; b.x = nx; b.y = ny; b.w = w; b.h = h; b.acc = 0;
  },

  // --- scorpion
  clawZone(b) {
    return [[b.x, b.y - 10, 32, 12], [b.x + b.w - 2, b.y, 12, 32], [b.x, b.y + b.h - 2, 32, 12], [b.x - 10, b.y, 12, 32]][b.dir];
  },

  // legs: over bricks, steel and water alike; only the field's edge, the eagle's fortress and tanks stop it
  scorpionWalk(b, speed) {
    b.acc += speed * b.speedMul;
    let blocked = false;
    while (b.acc >= 1) {
      b.acc -= 1;
      const nx = b.x + DXY[b.dir][0], ny = b.y + DXY[b.dir][1];
      if (nx < 0 || ny < 0 || nx + b.w > FW || ny + b.h > FH || overlap(nx, ny, b.w, b.h, BASE_X - 16, BASE_Y - 16, 48, 32)
        || this.tanks.some(t => t.alive && overlap(nx, ny, b.w, b.h, t.x, t.y, 16, 16) && !overlap(b.x, b.y, b.w, b.h, t.x, t.y, 16, 16))) { blocked = true; b.acc = 0; break; }
      b.x = nx; b.y = ny; b.animTick++;
    }
    if (blocked || ((b.x & 7) === 0 && (b.y & 7) === 0 && b.t % 30 === 0)) {
      const [cx, cy] = this.bossCenter(b), [tx, ty] = this.bossTarget(b);
      let d = Math.random() < 0.7 ? this.dirToward(cx, cy, tx, ty) : rnd(4);
      if (blocked && d === b.dir) d = (d + 1 + rnd(3)) % 4;
      b.dir = d;
    }
  },

  // where the stings land: you (phase 1), you and a second spot (phase 2), three in a row across you (phase 3);
  // never right on the eagle
  stingTargets(b, ph) {
    const pl = this.tanks.filter(t => t.isPlayer && t.alive && !t.boost.smoke).map(t => [t.x + 8, t.y + 8]);
    const main = pl.length ? pl[rnd(pl.length)] : [BASE_X + 8, BASE_Y - 40];
    let out = [main];
    if (ph === 2) out.push(pl.length > 1 ? pl.find(q => q !== main) : [main[0] + (rnd(2) ? 32 : -32), main[1]]);
    if (ph === 3) { const side = rnd(2) ? [28, 0] : [0, 28]; out.push([main[0] + side[0], main[1] + side[1]], [main[0] - side[0], main[1] - side[1]]); }
    return out.map(([x, y]) => {
      x = Math.max(4, Math.min(FW - 4, x)); y = Math.max(4, Math.min(FH - 4, y));
      if (Math.hypot(x - BASE_X - 8, y - BASE_Y - 8) < 30) y = BASE_Y - 24;
      return [x, y];
    });
  },

  scorpionStings(b) {
    const ph = b.phase || 1;
    for (const s of b.stings) {
      s.p += 1 / 50;
      s.x = s.x0 + (s.tx - s.x0) * Math.min(1, s.p); s.y = s.y0 + (s.ty - s.y0) * Math.min(1, s.p);
      if (s.p < 1) continue;
      s.done = true;
      this.blast(s.tx, s.ty, ph === 1 ? 10 : 12, false, null);
      this.addFx(s.tx, s.ty, Sprites.bigExp, 4);
      Sound.play('explode');
      if (ph >= 2) b.pools.push({ x: s.tx - 10, y: s.ty - 10, t: 300 });   // VENOM: a poison pool where it lands
    }
    b.stings = b.stings.filter(s => !s.done);
    for (const pool of b.pools) pool.t--;
    b.pools = b.pools.filter(pool => pool.t > 0);
    // standing in venom: poisoned after a moment
    for (const t of this.tanks) {
      if (!t.alive || !t.isPlayer) continue;
      if (b.pools.some(pool => overlap(t.x + 3, t.y + 3, 10, 10, pool.x, pool.y, 20, 20))) {
        t.venom = (t.venom || 0) + 1;
        if (t.venom >= 50) { t.venom = 0; this.hitPlayer(t); }
      } else t.venom = Math.max(0, (t.venom || 0) - 2);
    }
  },

  // --- UFO
  ufoWaypoint() {
    return [rnd(Math.max(1, (FW - 48) / 8 + 1)) * 8, rnd(Math.max(1, Math.floor((FH * 0.55 - 48) / 8))) * 8];
  },

  // the tractor beam: a light comes on under it, then every tank in the column is pulled up; one that reaches the
  // saucer is gone ("ABDUCTED!"). Walls hold you back; drive out sideways.
  ufoBeam(b) {
    const bm = b.beam;
    bm.t++;
    b.open = 30;   // its field is down while it beams
    if (bm.t === 1) Sound.play('beam');
    if (bm.t < 30) return;
    if (bm.t >= 210) { b.beam = null; return; }
    const bx = b.x + 24, top = b.y + 40, bottom = Math.min(FH, b.y + 48 + 96);
    for (const t of this.tanks) {
      if (!t.alive || Math.abs(t.x + 8 - bx) > 9 || t.y + 16 < top || t.y > bottom) continue;
      t.pull = (t.pull || 0) + 0.8;
      while (t.pull >= 1) { t.pull -= 1; if (this.canStep(t, 0)) t.y -= 1; }
      if (t.y > b.y + 32) continue;
      if (t.isPlayer) {
        if (t.shield > 0) continue;
        this.popups.push({ x: t.x + 8, y: t.y, text: 'ABDUCTED!', label: true, color: '#58D854', t: 0, delay: 0, life: 70 });
        this.hitPlayer(t);
      } else this.killEnemy(t, null, false, true);
    }
  },

  // where the pilot climbs out: a free 16x16 spot near the crash
  alienSpot(cx, cy) {
    for (let r = 0; r <= 64; r += 8) for (let k = 0; k < 8; k++) {
      const a = k * Math.PI / 4, x = Math.round((cx + Math.cos(a) * r - 8) / 8) * 8, y = Math.round((cy + Math.sin(a) * r - 8) / 8) * 8;
      if (x < 0 || y < 0 || x > FW - 16 || y > FH - 16 || overlap(x, y, 16, 16, BASE_X - 16, BASE_Y - 16, 48, 32)) continue;
      let ok = true;
      for (let yy = y >> 2; yy < (y + 16) >> 2 && ok; yy++) for (let xx = x >> 2; xx < (x + 16) >> 2; xx++) {
        const t = this.get(xx, yy);
        if (t === T_BRICK || t === T_STEEL || t === T_WATER) { ok = false; break; }
      }
      if (ok && !this.tanks.some(t => t.alive && overlap(x, y, 16, 16, t.x, t.y, 16, 16))) return [x, y];
    }
    return [Math.max(0, Math.min(FW - 16, Math.round((cx - 8) / 8) * 8)), Math.max(0, Math.min(FH - 16, Math.round((cy - 8) / 8) * 8))];
  },

  // the alien pilot: runs about, zaps you with its ray gun when you line up, blinks a short way now and then
  alienAct(b) {
    this.bossRoam(b, 1.1, 0.7);
    const [cx, cy] = this.bossCenter(b), [tx, ty] = this.bossTarget(b);
    const lined = (Math.abs(tx - cx) < 6 || Math.abs(ty - cy) < 6) && Math.hypot(tx - cx, ty - cy) < 140 && this.clearLine(cx, cy, tx, ty);
    if (--b.cd <= 0 && lined) {
      b.dir = this.dirToward(cx, cy, tx, ty);
      const [x, y] = this.bossMuzzle(b, b.dir);
      this.bossFire(b, x, y, b.dir, { speed: 4 });
      b.cd = 30;
      Sound.play('zap');
    } else if (b.cd <= -60) {
      const [x, y] = this.bossMuzzle(b, b.dir);
      if (!this.shotHitsEagle(x, y, b.dir)) this.bossFire(b, x, y, b.dir, { speed: 4 });
      b.cd = 40;
    }
    if (++b.blinkT >= 240) {
      b.blinkT = 0;
      const [x, y] = this.alienSpot(cx + rnd(97) - 48, cy + rnd(97) - 48);
      b.x = x; b.y = y; b.acc = 0;
      Sound.play('teleport');
    }
  },
});

// ------------------------------------------------------------------ drawing
Object.assign(BOSS_RENDER, {
  train(ctx, b, variant, frame, ph) {
    if (b.derailed) { ctx.drawImage(BossGfx.get('trainLoco', frame, b.dir, variant, ph), b.x, b.y); return; }
    if (b.mode !== 'run') return;
    for (const car of this.trainCars(b)) {
      ctx.drawImage(BossGfx.get('train' + (car.c.hp > 0 ? car.c.k : 'Wreck'), (b.animTick >> 1) & 1, b.dir, car.c.hp > 0 ? variant : 'n', ph), car.x, car.y);
    }
  },
  harvester(ctx, b, variant, frame, ph) { ctx.drawImage(BossGfx.get('harvester', (b.animTick >> 1) & 1, b.dir, variant, ph), b.x, b.y); },
  gunship(ctx, b, variant, frame, ph) {
    ctx.drawImage(BossGfx.get('gunship', (this.frame >> 1) & 1, b.dir, variant, ph), Math.round(b.x), Math.round(b.y));
    // the main rotor: two long blades, a blur
    const [ox, oy] = [[0, -3], [3, 0], [0, 3], [-3, 0]][b.dir], cx = b.x + 16 + ox, cy = b.y + 16 + oy;
    ctx.fillStyle = 'rgba(30,30,30,0.7)';
    for (const a0 of [0, Math.PI / 2]) {
      const a = this.frame * 0.55 + a0;
      for (let i = -17; i <= 17; i++) ctx.fillRect(Math.round(cx + Math.cos(a) * i), Math.round(cy + Math.sin(a) * i), 1, 1);
    }
    ctx.fillStyle = '#0C1004'; ctx.fillRect(Math.round(cx) - 1, Math.round(cy) - 1, 2, 2);
  },
  scorpion(ctx, b, variant, frame, ph) {
    ctx.drawImage(BossGfx.get('scorpion', b.pinch > 0 ? (b.pinch > 8 ? 1 : 0) : (b.animTick >> 2) & 1, b.dir, variant, ph), b.x, b.y);
  },
  ufo(ctx, b, variant, frame, ph) {
    if (b.crashed) { ctx.drawImage(BossGfx.get('alien', (b.animTick >> 2) & 1, b.dir, variant), b.x, b.y); return; }
    const bob = Math.round(Math.sin(this.frame / 15) * 1.5), x = Math.round(b.x), y = Math.round(b.y) + bob;
    if (b.beam) {
      // the tractor beam: a flicker while it warms up, then a wide shaft of light
      const top = y + 40, bottom = Math.min(FH, b.y + 48 + 96), on = b.beam.t >= 30;
      if (on || (b.beam.t >> 2) & 1) {
        ctx.fillStyle = on ? 'rgba(168,248,168,' + (0.25 + ((this.frame >> 2) & 1) * 0.1) + ')' : 'rgba(168,248,168,0.2)';
        for (let yy = top; yy < bottom; yy++) { const hw = 6 + (yy - top) / 16; ctx.fillRect(Math.round(x + 24 - hw), yy, Math.round(hw * 2), 1); }
        if (on) { ctx.fillStyle = '#F8F8F8'; for (let k = 0; k < 6; k++) ctx.fillRect(x + 18 + ((k * 5 + this.frame) % 12), bottom - ((this.frame * 2 + k * 23) % (bottom - top)), 1, 2); }
      }
    }
    ctx.drawImage(BossGfx.get('ufo', (this.frame >> 3) % 3, 0, variant, ph), x, y);
    // the force field: a shimmering ring (down while it attacks)
    if (ph === 2 && !(b.open > 0)) {
      ctx.fillStyle = b.shieldHit > 0 ? '#FFFFFF' : (this.frame >> 2) & 1 ? '#A8F8F8' : '#58A8F8';
      for (let k = 0; k < 40; k++) { const a = k * Math.PI / 20 + this.frame * 0.05; ctx.fillRect(Math.round(x + 24 + Math.cos(a) * 26), Math.round(y + 24 + Math.sin(a) * 26), 2, 2); }
    }
  },
});

// on the ground, under everything: tracks, shadows, bales, burning ground, venom, the crashed saucer
Object.assign(BOSS_UNDER, {
  train(ctx, b) {
    for (let k = 0; k < (b.tracks || []).length; k++) {
      const y = b.tracks[k];
      for (let cx = 0; cx < GW; cx++) {
        if (this.get(cx, y >> 2) !== T_EMPTY && this.get(cx, (y >> 2) + 3) !== T_EMPTY) continue;
        const x = cx * 4;
        ctx.fillStyle = '#5C3C18';
        if (cx % 2 === 0) ctx.fillRect(x, y + 1, 2, 14);   // sleepers
        ctx.fillStyle = '#8C8C9C';
        ctx.fillRect(x, y + 3, 4, 1); ctx.fillRect(x, y + 12, 4, 1);   // rails
      }
      // the signals flash before the train comes along this track
      if (!b.derailed && b.mode === 'wait' && k === b.track && b.t >= b.wait - 90 && (this.frame >> 3) & 1) {
        ctx.fillStyle = '#F83800';
        ctx.fillRect(1, y + 5, 4, 6); ctx.fillRect(FW - 5, y + 5, 4, 6);
      }
    }
  },
  harvester(ctx, b) {
    for (const bl of b.bales) {
      for (let cy = bl.y >> 2; cy < (bl.y + 8) >> 2; cy++) for (let cx = bl.x >> 2; cx < (bl.x + 8) >> 2; cx++) {
        if (this.get(cx, cy) !== T_BRICK) continue;
        ctx.fillStyle = '#E8C058'; ctx.fillRect(cx * 4, cy * 4, 4, 4);
        ctx.fillStyle = '#B08828'; ctx.fillRect(cx * 4, cy * 4 + ((cx + cy) & 1 ? 1 : 2), 4, 1);
      }
      if (this.get(bl.x >> 2, bl.y >> 2) === T_BRICK || this.get((bl.x >> 2) + 1, (bl.y >> 2) + 1) === T_BRICK) { ctx.fillStyle = '#7C5000'; ctx.fillRect(bl.x + 3, bl.y, 1, 8); }   // twine
    }
    for (const f of b.fires) {
      for (let k = 0; k < 5; k++) {
        ctx.fillStyle = ['#F8D800', '#F87830', '#D82800'][(k + (this.frame >> 2)) % 3];
        ctx.fillRect(f.x + ((k * 5 + this.frame) % 11), f.y + ((k * 7 + (this.frame >> 1)) % 11), 2, 2);
      }
    }
  },
  gunship(ctx, b) {
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(b.x + 22, b.y + 26, 11, 8, 0, 0, Math.PI * 2); ctx.fill();
    for (const bm of b.bombs) {   // where they'll land
      if ((bm.t >> 2) & 1) { ctx.fillStyle = '#F83800'; ctx.fillRect(bm.x - 3, bm.y, 7, 1); ctx.fillRect(bm.x, bm.y - 3, 1, 7); }
    }
  },
  scorpion(ctx, b) {
    for (const pool of b.pools) {
      ctx.fillStyle = pool.t < 60 && (pool.t >> 2) & 1 ? 'rgba(88,216,84,0.25)' : 'rgba(88,216,84,0.5)';
      ctx.beginPath(); ctx.ellipse(pool.x + 10, pool.y + 10, 10, 8, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#B8F8B8';
      for (let k = 0; k < 3; k++) ctx.fillRect(pool.x + 4 + ((k * 7 + (this.frame >> 3)) % 12), pool.y + 6 + ((k * 5 + (this.frame >> 2)) % 8), 1, 1);
    }
    for (const s of b.stings) {   // the cross where a sting will come down
      if ((this.frame >> 2) & 1) { ctx.fillStyle = '#F83800'; ctx.fillRect(s.tx - 4, s.ty, 9, 1); ctx.fillRect(s.tx, s.ty - 4, 1, 9); }
    }
  },
  ufo(ctx, b) {
    if (b.wreck) {
      ctx.globalAlpha = 0.6;
      ctx.drawImage(BossGfx.get('ufo', 0, 0, 'n', 3), b.wreck.x, b.wreck.y);
      ctx.globalAlpha = 1;
      for (let k = 0; k < 4; k++) {
        ctx.fillStyle = (k + (this.frame >> 2)) & 1 ? '#F8D800' : '#F83800';
        ctx.fillRect(b.wreck.x + 10 + ((k * 11) % 28), b.wreck.y + 12 + ((k * 7 + (this.frame >> 3)) % 24), 2, 3);
      }
    }
    if (!b.crashed) { ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(b.x + 30, b.y + 36, 20, 12, 0, 0, Math.PI * 2); ctx.fill(); }
  },
});

// in the air, over the trees: the scorpion's stings in flight, the gunship's bombs falling
Object.assign(BOSS_OVER, {
  scorpion(ctx, b) {
    for (const s of b.stings) {
      const h = Math.sin(Math.PI * Math.min(1, s.p)) * 26;
      ctx.fillStyle = '#5C3C08'; ctx.fillRect(Math.round(s.x) - 2, Math.round(s.y - h) - 2, 4, 4);
      ctx.fillStyle = '#F83800'; ctx.fillRect(Math.round(s.x) - 1, Math.round(s.y - h) - 1, 2, 2);
    }
  },
  gunship(ctx, b) {
    for (const bm of b.bombs) {
      const h = (24 - bm.t) * 0.8;
      ctx.fillStyle = '#2C3410'; ctx.fillRect(bm.x - 1, Math.round(bm.y - h) - 2, 3, 4);
    }
  },
});
