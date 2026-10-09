'use strict';
// =====================================================================
//  Player weapons. Every tank starts with the CANNON (the classic shell, made better by stars). Six more, each with
//  four levels (MK I - IV), come from WEAPON crates (the letter on the crate says which) or from the shop:
//    M  MACHINE GUN   hold fire: a stream of light bullets (half a hit each at first); MK III a twin stream
//    L  LASER         an instant beam that goes through every tank in line and burns shells in its way; cuts brick
//                     from MK II, wide and endless at MK IV
//    F  FLAMETHROWER  hold fire: a short cone of fire that burns tanks, trees and shells
//    G  MORTAR        lobs a shell over walls onto the first tank ahead (or as far as it reaches); a blast that
//                     breaks brick, and steel at MK IV
//    T  TESLA         lightning to the nearest enemy in reach (no need to aim, walls don't stop it), jumping on
//                     to more of them at higher levels
//    H  MISSILES      homing missiles that fly over walls and pick their own targets; 2 at MK III, 3 at MK IV
//  A crate with the weapon you have raises its level; another weapon swaps to it (each one remembers its level).
//  Losing a tank costs a level of the weapon in hand (at MK I, back to the cannon) unless KEEP STARS ON DEATH is on.
//  Balance: measured with a bot that holds fire through whole stages, each MK I does about as well as the bare cannon
//  (a sidegrade with its own trick) and each MK IV about as well as a 3-star cannon, so the difficulty curve holds.
// =====================================================================

const WEAPON_MAX = 4, MK = ['I', 'II', 'III', 'IV'];
const WEAPONS = {
  cannon: { name: 'CANNON', letter: 'C', color: '#ADADAD' },
  mg: { name: 'MACHINE GUN', letter: 'M', color: '#F8B800', desc: 'HOLD FIRE: A STREAM OF BULLETS',
    lv: [{ cd: 8, dmg: 0.5, max: 4 }, { cd: 6, dmg: 0.5, max: 5 }, { cd: 7, dmg: 0.4, max: 6, twin: true }, { cd: 6, dmg: 0.45, max: 8, twin: true }] },
  laser: { name: 'LASER', letter: 'L', color: '#F83800', desc: 'A BEAM THROUGH TANKS IN LINE',
    lv: [{ cd: 30, dmg: 1, len: 96, cut: true }, { cd: 28, dmg: 1, len: 128, cut: true }, { cd: 30, dmg: 1.5, len: 160, cut: true }, { cd: 22, dmg: 2, len: 999, cut: true, wide: true }] },
  flame: { name: 'FLAMETHROWER', letter: 'F', color: '#F87830', desc: 'HOLD FIRE: A BURNING CONE',
    lv: [{ len: 24, dmg: 0.25 }, { len: 30, dmg: 0.3 }, { len: 36, dmg: 0.38 }, { len: 44, dmg: 0.48 }] },
  mortar: { name: 'MORTAR', letter: 'G', color: '#BCBCBC', desc: 'SHELLS OVER WALLS, A BLAST',
    lv: [{ cd: 40, dist: 72, r: 12, dmg: 2 }, { cd: 36, dist: 88, r: 14, dmg: 2 }, { cd: 34, dist: 104, r: 16, dmg: 3 }, { cd: 32, dist: 120, r: 18, dmg: 3, steel: true }] },
  tesla: { name: 'TESLA', letter: 'T', color: '#7CB8F8', desc: 'LIGHTNING FINDS THE NEAREST',
    lv: [{ cd: 45, range: 60, chain: 0, dmg: 1 }, { cd: 44, range: 68, chain: 1, dmg: 1 }, { cd: 44, range: 76, chain: 2, dmg: 1.5 }, { cd: 50, range: 84, chain: 3, dmg: 2 }] },
  missile: { name: 'MISSILES', letter: 'H', color: '#58D854', desc: 'HOMING, OVER WALLS',
    lv: [{ cd: 60, n: 1, dmg: 1 }, { cd: 64, n: 1, dmg: 2 }, { cd: 72, n: 2, dmg: 1 }, { cd: 90, n: 3, dmg: 1 }] },
};
const WEAPON_KEYS = ['mg', 'laser', 'flame', 'mortar', 'tesla', 'missile'];
// shop prices for MK I - IV
const WEAPON_PRICES = { mg: [2000, 1500, 2500, 3500], laser: [3000, 2000, 3000, 4500], flame: [2000, 1500, 2500, 3500],
  mortar: [2500, 2000, 3000, 4000], tesla: [3000, 2000, 3000, 4500], missile: [3500, 2500, 3500, 5000] };

const randomWeapon = () => WEAPON_KEYS[rnd(WEAPON_KEYS.length)];
const weaponLevel = (p, key = p && p.weapon) => (!p || !key || key === 'cannon' ? 0 : Math.max(1, (p.wlv || {})[key] || 1));

// a power-up icon; a weapon crate shows its weapon's letter (key: the weapon, '?' when not known yet)
function drawPowerup(ctx, pu, x, y) {
  ctx.drawImage(Sprites.powerups[pu.type], x, y);
  if (pu.type !== PU.WEAPON) return;
  const W = WEAPONS[pu.weapon];
  ctx.fillStyle = COL.black; ctx.fillRect(x + 3, y + 4, 10, 9);
  Font.draw(ctx, W ? W.letter : '?', x + 5, y + 5, W ? W.color : COL.white);
}

Object.assign(Stage.prototype, {
  // a crate (or the shop): this weapon, or its next level if you have it in hand
  giveWeapon(p, key, show = true) {
    p.wlv = p.wlv || {};
    if (p.weapon === key) p.wlv[key] = Math.min(WEAPON_MAX, (p.wlv[key] || 1) + 1);
    else { p.weapon = key; p.wlv[key] = Math.max(1, p.wlv[key] || 1); }
    const t = p.tank || this.tanks.find(o => o.isPlayer && o.player === p && o.alive);
    if (show && t) this.popups.push({ x: t.x + 8, y: t.y - 4, text: WEAPONS[key].name + ' MK ' + MK[p.wlv[key] - 1], label: true, color: WEAPONS[key].color, t: 0, delay: 0, life: 90 });
  },

  // which weapon a crate holds: half the time one a player has in hand (so it can level up), else any
  crateWeapon() {
    const held = this.players.filter(p => !p.out && p.weapon && p.weapon !== 'cannon' && weaponLevel(p) < WEAPON_MAX).map(p => p.weapon);
    return held.length && Math.random() < 0.5 ? held[rnd(held.length)] : randomWeapon();
  },

  // a lost tank costs a level of the weapon in hand
  weaponOnDeath(p) {
    if (!p.weapon || p.weapon === 'cannon' || Config.on('keepStars')) return;
    const lv = weaponLevel(p) - 1;
    if (lv <= 0) { p.wlv[p.weapon] = 1; p.weapon = 'cannon'; } else p.wlv[p.weapon] = lv;
  },

  // who a player's weapon can hurt: enemy tanks, and in versus the other players
  weaponFoes(att) {
    return this.tanks.filter(o => o.alive && o !== att && !(o.burrow > 0) && !(o.hopT > 0) && !o.sub
      && (!o.isPlayer || (this.vs && !o.ally && o.player !== att.player)));
  },

  // damage from a weapon (fractions add up; a shield plate takes most of a hit from the front)
  weaponHit(att, foe, dmg, o = {}) {
    if (!foe.alive) return;
    if (foe.isPlayer) {
      foe.pAcc = (foe.pAcc || 0) + dmg;
      if (foe.pAcc >= 1) { foe.pAcc = 0; this.hitPlayer(foe, att); }
      return;
    }
    if (foe.mirage) { this.vanishMirage(foe, true); return; }
    if (foe.frontShield && !o.pierce && o.dir !== undefined && foe.dir === (o.dir + 2) % 4) dmg *= 0.25;
    foe.wAcc = (foe.wAcc || 0) + dmg;
    let n = Math.floor(foe.wAcc);
    foe.wAcc -= n;
    foe.reveal = 90;
    while (n-- > 0 && foe.alive) this.hitEnemy(foe, att, o.blast);
  },

  // enemy shells caught in a beam or a cone of fire are gone
  weaponStopsShells(att, x, y, w, h) {
    for (const b of this.bullets) {
      if (!b.alive || b.owner === att || (b.isPlayer && !(this.vs && b.owner && b.owner.player !== att.player))) continue;
      if (overlap(x, y, w, h, b.x, b.y, 4, 4)) this.killBullet(b, true);
    }
  },

  // what the weapons can aim at besides tanks: the enemy's buildings (BIG MAPS factories, the CPU's HQ); each
  // { x, y, w, h, hit(att, n) }, n hits (fractions add up)
  weaponStructs() {
    const out = [];
    for (const f of this.factories || []) if (f.hp > 0) out.push({ x: f.x, y: f.y, w: 32, h: 32, obj: f, hit: (att, n) => { f.wAcc = (f.wAcc || 0) + n; const k = Math.floor(f.wAcc); if (k > 0) { f.wAcc -= k; this.hitFactory(f, k, att); } } });
    if (this.cpu && this.cpu.alive) { const c = this.cpu; out.push({ x: c.x, y: c.y, w: 16, h: 16, obj: c, hit: (att, n) => { c.wAcc = (c.wAcc || 0) + n; if (c.wAcc >= 1) { c.wAcc = 0; this.cpuHit(att); } } }); }
    return out;
  },
  weaponStructsIn(att, x, y, w, h, dmg) { for (const st of this.weaponStructs()) if (overlap(x, y, w, h, st.x, st.y, st.w, st.h)) st.hit(att, dmg); },

  // bosses caught in a rectangle take damage too (fractions add up per boss)
  weaponBosses(att, x, y, w, h, dmg, only) {
    for (const bo of this.bosses) {
      if ((only && bo !== only) || !this.bossTangible(bo) || !overlap(x, y, w, h, bo.x, bo.y, bo.w, bo.h)) continue;
      bo.wAcc = (bo.wAcc || 0) + dmg;
      const n = Math.floor(bo.wAcc);
      if (n > 0) { bo.wAcc -= n; this.bossHit(bo, n, att, x + w / 2); }
    }
  },

  // ------------------------------------------------------------ firing (instead of the cannon)
  fireWeapon(t, p, pressed, held) {
    const key = p.weapon, s = WEAPONS[key].lv[weaponLevel(p) - 1];
    if (t.wcool > 0) t.wcool--;
    if (key === 'flame') { if (held) this.flameOn(t, s); return; }
    if (!(pressed || held) || t.wcool > 0) return;
    if (key === 'mg') this.mgFire(t, s);
    else if (key === 'laser') this.laserFire(t, s, weaponLevel(p));
    else if (key === 'mortar') this.mortarFire(t, s);
    else if (key === 'tesla') this.teslaFire(t, s);
    else if (key === 'missile') this.missileFire(t, s);
    t.reveal = 60;
  },

  mgFire(t, s) {
    if (t.bullets >= s.max) return;
    const [ox, oy] = [[6, 0], [12, 6], [6, 12], [0, 6]][t.dir], side = (t.dir & 1) ? [0, 1] : [1, 0];
    const shot = (dx, dy, free) => this.bullets.push({ x: t.x + ox + dx, y: t.y + oy + dy, dir: t.dir, speed: 5 * Config.scale('pShell'), owner: t, free,
      isPlayer: true, power: false, cutter: false, alive: true, pierce: false, rocket: false, dmg: s.dmg, light: true });
    if (s.twin) { shot(-side[0] * 3, -side[1] * 3, false); shot(side[0] * 3, side[1] * 3, true); } else shot(0, 0, false);
    t.bullets++;
    t.wcool = s.cd;
    if ((this.frame >> 1) & 1) Sound.play('mg');
  },

  laserFire(t, s, lv) {
    const [dx, dy] = DXY[t.dir], w = s.wide ? 8 : 4, cx = t.x + 8, cy = t.y + 8;
    let x = cx + dx * 8, y = cy + dy * 8, dist = 0, cut = 0;
    // run along until steel, the eagle, a block or the edge; brick is cut
    while (dist < s.len) {
      const nx = x + dx * 4, ny = y + dy * 4;
      if (nx < 0 || ny < 0 || nx > FW || ny > FH) break;
      let stop = false;
      for (let k = -w / 2; k < w / 2 && !stop; k += 4) {
        const qx = Math.floor((nx + (dy ? k : 0)) / 4), qy = Math.floor((ny + (dx ? k : 0)) / 4), v = this.get(qx, qy);
        if (v === T_STEEL) stop = true;
        else if (v === T_BRICK) { if (!s.cut) stop = true; }
        else if (v >= T_LAVA && this.bioBeam(qx, qy, v, t, s.cut)) stop = true;   // concrete, barrels, crates (biomes.js)
      }
      // brick in the way: it cuts a gap a tank can drive through (MK I only a block deep per shot)
      if (!stop && s.cut) {
        let any = false;
        for (let a = -8; a < 8; a += 4) {
          const qx = Math.floor((nx + (dy ? a : 0)) / 4), qy = Math.floor((ny + (dx ? a : 0)) / 4);
          if (this.get(qx, qy) === T_BRICK) { this.set(qx, qy, T_EMPTY); any = true; }
        }
        if (any && (cut += 4) >= 8 && lv === 1) { x = nx; y = ny; dist += 4; break; }
      }
      if (!stop && !this.noBase && overlap(nx - 2, ny - 2, 4, 4, BASE_X, BASE_Y, 16, 16)) stop = true;
      if (!stop && this.qblocks && this.qblocks.length && this.qblockAt(nx - 2, ny - 2, 4, 4)) { this.bulletQBlock({ x: nx - 2, y: ny - 2, isPlayer: true, owner: t, alive: true, free: true }); stop = true; }
      if (stop) break;
      x = nx; y = ny; dist += 4;
    }
    // the beam's box: every tank in it is hit once
    const bx = Math.min(cx + dx * 8, x) - (dy ? w / 2 : 0), by = Math.min(cy + dy * 8, y) - (dx ? w / 2 : 0);
    const bw = dy ? w : Math.max(4, Math.abs(x - cx - dx * 8)), bh = dx ? w : Math.max(4, Math.abs(y - cy - dy * 8));
    for (const foe of this.weaponFoes(t)) if (overlap(bx, by, bw, bh, foe.x, foe.y, 16, 16)) this.weaponHit(t, foe, s.dmg, { pierce: lv >= 3, dir: t.dir });
    this.weaponBosses(t, bx, by, bw, bh, s.dmg);
    this.weaponStopsShells(t, bx, by, bw, bh);
    if (this.cpu && this.cpu.alive && overlap(bx, by, bw, bh, this.cpu.x, this.cpu.y, 16, 16)) this.cpuHit(t);
    for (const f of this.factories || []) if (f.hp > 0 && overlap(bx, by, bw, bh, f.x, f.y, 32, 32)) this.hitFactory(f, 1, t);
    this.wfx.push({ kind: 'beam', pts: [[cx + dx * 8, cy + dy * 8], [x, y]], t: 10, color: WEAPONS.laser.color, w, box: [bx, by, bw, bh], owner: t });
    t.wcool = s.cd;
    Sound.play('laser');
  },

  flameOn(t, s) {
    const len = s.len, w = 14;
    const [x, y, fw, fh] = [[t.x + 1, t.y - len, w, len], [t.x + 16, t.y + 1, len, w], [t.x + 1, t.y + 16, w, len], [t.x - len, t.y + 1, len, w]][t.dir];
    t.flame = { x, y, w: fw, h: fh, t: 3 };
    this.weaponStopsShells(t, x, y, fw, fh);
    if (this.frame % 6) return;
    for (const foe of this.weaponFoes(t)) if (overlap(x, y, fw, fh, foe.x, foe.y, 16, 16)) this.weaponHit(t, foe, s.dmg, { dir: t.dir });
    this.weaponBosses(t, x, y, fw, fh, s.dmg);
    this.weaponStructsIn(t, x, y, fw, fh, s.dmg);
    // it burns trees away (and sets them alight in summer); reeds catch, gas and barrels go up (biomes.js)
    for (let cy = Math.max(0, y >> 2); cy <= (y + fh - 1) >> 2; cy++) for (let cx = Math.max(0, x >> 2); cx <= (x + fw - 1) >> 2; cx++) {
      const v = this.get(cx, cy);
      if (v === T_REEDS || v === T_GAS || v === T_DRUM) { this.bioFlame(cx, cy, v, t, true); continue; }
      // bricks crumble in the heat (slowly: a cell now and then), so the flamethrower can open a way too
      if (v === T_BRICK) { if (Math.random() < 0.12 + 0.04 * (WEAPONS.flame.lv.indexOf(s))) { this.set(cx, cy, T_EMPTY); this.lastBrickSound = this.frame; } continue; }
      if (v !== T_FOREST) continue;
      if (this.seasonFx === 'summer' && this.fires) this.ignite(cy * GW + cx, false, true); else this.set(cx, cy, T_EMPTY);
    }
    if (this.frame % 24 === 0) Sound.play('flame');
  },

  mortarFire(t, s) {
    if ((this.wshots || []).filter(m => m.owner === t && m.kind === 'mortar').length >= 2) return;
    const [dx, dy] = DXY[t.dir], cx = t.x + 8, cy = t.y + 8;
    // the first tank lined up ahead within reach, or as far as it goes
    let d = s.dist;
    for (const foe of this.weaponFoes(t)) {
      const fx = foe.x + 8 - cx, fy = foe.y + 8 - cy, ahead = fx * dx + fy * dy, side = Math.abs(dx ? fy : fx);
      if (ahead > 12 && ahead < d && side < 10) d = ahead;
    }
    // a building lined up ahead (a factory, the CPU's HQ)
    for (const st of this.weaponStructs()) {
      const fx = st.x + st.w / 2 - cx, fy = st.y + st.h / 2 - cy, ahead = fx * dx + fy * dy, side = Math.abs(dx ? fy : fx);
      if (ahead > 12 && ahead < d && side < st.w / 2 + 6) d = ahead;
    }
    // nobody lined up: the first brick wall ahead (so it breaks a way through, not something far behind it)
    if (d === s.dist) for (let k = 12; k < s.dist; k += 4) { const v = this.get((cx + dx * k) >> 2, (cy + dy * k) >> 2); if (v === T_BRICK || (v >= T_LAVA && bioSolid(v))) { d = k + 4; break; } }
    const tx = Math.max(4, Math.min(FW - 4, cx + dx * d)), ty = Math.max(4, Math.min(FH - 4, cy + dy * d));
    this.wshots.push({ kind: 'mortar', owner: t, x0: cx, y0: cy, x: cx, y: cy, tx, ty, p: 0, dp: 1 / Math.round(12 + Math.hypot(tx - cx, ty - cy) / 5), s });
    t.wcool = s.cd;
    Sound.play('mortar');
  },

  teslaFire(t, s) {
    const cx = t.x + 8, cy = t.y + 8, foes = this.weaponFoes(t);
    let first = null, bd = s.range;
    for (const foe of foes) { const d = Math.hypot(foe.x + 8 - cx, foe.y + 8 - cy); if (d < bd) { bd = d; first = foe; } }
    if (!first) {
      const bo = this.bosses.find(b => this.bossTangible(b) && Math.hypot(b.x + b.w / 2 - cx, b.y + b.h / 2 - cy) < s.range + b.w / 2);
      const bd2 = this.weaponStructs().find(b => Math.hypot(b.x + b.w / 2 - cx, b.y + b.h / 2 - cy) < s.range + b.w / 2);
      if (bo) { this.weaponBosses(t, bo.x, bo.y, bo.w, bo.h, s.dmg); this.wfx.push({ kind: 'beam', pts: [[cx, cy], [bo.x + bo.w / 2, bo.y + bo.h / 2]], t: 10, color: WEAPONS.tesla.color, w: 1, zig: true }); t.wcool = s.cd; Sound.play('zap'); }
      else if (bd2) { bd2.hit(t, s.dmg); this.wfx.push({ kind: 'beam', pts: [[cx, cy], [bd2.x + bd2.w / 2, bd2.y + bd2.h / 2]], t: 10, color: WEAPONS.tesla.color, w: 1, zig: true }); t.wcool = s.cd; Sound.play('zap'); }
      else if (!this.teslaWall(t, s)) t.wcool = 10;
      return;
    }
    const hit = [first], pts = [[cx, cy], [first.x + 8, first.y + 8]];
    while (hit.length <= s.chain) {
      const last = hit[hit.length - 1];
      let next = null, nd = 44;
      for (const foe of foes) { if (hit.includes(foe)) continue; const d = Math.hypot(foe.x - last.x, foe.y - last.y); if (d < nd) { nd = d; next = foe; } }
      if (!next) break;
      hit.push(next); pts.push([next.x + 8, next.y + 8]);
    }
    for (const foe of hit) this.weaponHit(t, foe, s.dmg, { pierce: true });
    this.wfx.push({ kind: 'beam', pts, t: 10, color: WEAPONS.tesla.color, w: 1, zig: true });
    t.wcool = s.cd;
    Sound.play('zap');
  },

  // nobody in reach: the bolt strikes the first wall ahead and bursts the bricks there (so it can open a way)
  teslaWall(t, s) {
    const [dx, dy] = DXY[t.dir], cx = t.x + 8, cy = t.y + 8;
    for (let d = 10; d <= s.range; d += 4) {
      const x = cx + dx * d, y = cy + dy * d;
      if (x < 0 || y < 0 || x >= FW || y >= FH) return false;
      const v = this.get(x >> 2, y >> 2);
      if (v === T_STEEL) return false;
      if (v !== T_BRICK && !(v >= T_LAVA && bioSolid(v))) continue;
      this.blast(x, y, 11, true, t, false);   // a hole a tank fits through
      this.wfx.push({ kind: 'beam', pts: [[cx, cy], [x, y]], t: 10, color: WEAPONS.tesla.color, w: 1, zig: true });
      t.wcool = s.cd;
      Sound.play('zap');
      return true;
    }
    return false;
  },

  missileFire(t, s) {
    const [dx, dy] = DXY[t.dir], cx = t.x + 8, cy = t.y + 8;
    // targets: the nearest tanks, those ahead first
    const foes = this.weaponFoes(t).map(f => { const fx = f.x + 8 - cx, fy = f.y + 8 - cy; return [f, Math.hypot(fx, fy) - (fx * dx + fy * dy > 0 ? 60 : 0)]; })
      .filter(q => q[1] < 160).sort((a, b) => a[1] - b[1]).map(q => q[0]);
    // a building straight ahead (a factory, the CPU's HQ): you're aiming at it, so they go for it, not the tanks round it
    const bld = t.isPlayer ? this.weaponStructs().find(b => { const fx = b.x + b.w / 2 - cx, fy = b.y + b.h / 2 - cy, ahead = fx * dx + fy * dy; return ahead > 0 && ahead < 200 && Math.abs(dx ? fy : fx) < b.w / 2 + 10; }) : null;
    for (let k = 0; k < s.n; k++) {
      const a = Math.atan2(dy, dx) + (k - (s.n - 1) / 2) * 0.5;
      this.wshots.push({ kind: 'missile', owner: t, x: cx + dx * 8, y: cy + dy * 8, vx: Math.cos(a) * 1.2, vy: Math.sin(a) * 1.2, target: bld ? null : foes.length ? foes[k % foes.length] : null, struct: bld, lock: !!bld, life: 150, s });
    }
    t.wcool = s.cd;
    Sound.play('missile');
  },

  // ------------------------------------------------------------ every frame: shells in flight, effects
  updateWeapons() {
    for (const f of this.wfx) { f.t--; if (f.box) this.weaponStopsShells(f.owner, ...f.box); }   // a beam burns shells while it shows
    this.wfx = this.wfx.filter(f => f.t > 0);
    for (const t of this.tanks) if (t.flame && --t.flame.t <= 0) t.flame = null;
    for (const m of this.wshots) {
      const att = m.owner;
      if (m.kind === 'mortar') {
        m.p += m.dp;
        m.x = m.x0 + (m.tx - m.x0) * m.p; m.y = m.y0 + (m.ty - m.y0) * m.p;
        if (m.p < 1) continue;
        m.done = true;
        this.blast(m.tx, m.ty, m.s.r, true, att, !!m.s.steel);
        for (const foe of this.weaponFoes(att)) if (Math.hypot(foe.x + 8 - m.tx, foe.y + 8 - m.ty) < m.s.r + 6) this.weaponHit(att, foe, m.s.dmg - 1, { blast: true });
        continue;
      }
      // a missile: turns towards its target (a new one if it's gone), speeds up, flies over walls
      if (m.lock && !(m.struct && (m.struct.obj.hp > 0 || m.struct.obj.alive))) m.lock = false;   // its building's down
      if (!m.lock && (!m.target || !m.target.alive)) {
        let best = null, bd = 140;
        for (const foe of this.weaponFoes(att)) { const d = Math.hypot(foe.x + 8 - m.x, foe.y + 8 - m.y); if (d < bd) { bd = d; best = foe; } }
        m.target = best;
        // no tank near: a building (a factory, the CPU's HQ) will do
        if (!best && att && att.isPlayer) {
          let bs = null, bsd = 180;
          for (const st of this.weaponStructs()) { const d = Math.hypot(st.x + st.w / 2 - m.x, st.y + st.h / 2 - m.y); if (d < bsd) { bsd = d; bs = st; } }
          m.struct = bs;
        } else m.struct = null;
      }
      const sp = Math.min(3.2, Math.hypot(m.vx, m.vy) + 0.1);
      const aim = m.target ? [m.target.x + 8, m.target.y + 8] : m.struct ? [m.struct.x + m.struct.w / 2, m.struct.y + m.struct.h / 2] : null;
      if (aim) {
        const ddx = aim[0] - m.x, ddy = aim[1] - m.y, d = Math.hypot(ddx, ddy) || 1;
        m.vx += ddx / d * 0.45; m.vy += ddy / d * 0.45;
      }
      const k = sp / (Math.hypot(m.vx, m.vy) || 1);
      m.vx *= k; m.vy *= k;
      m.x += m.vx; m.y += m.vy;
      if (this.frame % 2 === 0) this.wfx.push({ kind: 'smoke', x: m.x, y: m.y, t: 10 });
      // no target: it goes off on the first wall it meets (one fired at a wall opens it)
      const tw = this.get(Math.floor(m.x) >> 2, Math.floor(m.y) >> 2), wall = !m.target && !m.struct && m.life < 146 && (tw === T_BRICK || tw === T_STEEL || (tw >= T_LAVA && bioSolid(tw)));
      if (wall) { m.life = 0; m.wallHit = true; }
      const hit = m.target && Math.hypot(m.target.x + 8 - m.x, m.target.y + 8 - m.y) < 7;
      // a player's missile meeting a building bursts on it (the blast does the damage)
      const onBld = att && att.isPlayer && this.weaponStructs().find(b => m.x >= b.x && m.y >= b.y && m.x < b.x + b.w && m.y < b.y + b.h);
      if (onBld) onBld.hit(att, Math.max(0, m.s.dmg - 2));
      if (hit || onBld || --m.life <= 0 || m.x < 0 || m.y < 0 || m.x > FW || m.y > FH) {
        m.done = true;
        const tgt = hit ? m.target : null;
        this.blast(Math.max(2, Math.min(FW - 2, m.x)), Math.max(2, Math.min(FH - 2, m.y)), m.wallHit ? 12 : 8, true, att, false);   // into a wall: a hole a tank fits through
        if (tgt) this.weaponHit(att, tgt, m.s.dmg - 1, { blast: true });
      }
    }
    this.wshots = this.wshots.filter(m => !m.done);
  },

  // ------------------------------------------------------------ drawing
  renderWeapons(ctx) {
    const f = this.frame;
    for (const fl of this.netFlames || this.tanks.filter(t => t.flame && t.alive).map(t => t.flame)) {
      const fire = ['#F8F8F8', '#F8D878', '#F87830', '#D82800'];
      for (let k = 0; k < 16; k++) {
        ctx.fillStyle = fire[(k + (f >> 1)) & 3];
        ctx.fillRect(fl.x + ((k * 37 + f * 13) % Math.max(1, fl.w)) - 1, fl.y + ((k * 53 + f * 7) % Math.max(1, fl.h)) - 1, 3, 3);
      }
    }
    for (const fx of this.wfx) {
      if (fx.kind === 'smoke') { ctx.fillStyle = 'rgba(180,180,180,' + (fx.t / 14) + ')'; ctx.fillRect(Math.round(fx.x) - 1, Math.round(fx.y) - 1, 2, 2); continue; }
      ctx.fillStyle = (fx.t >> 1) & 1 ? '#FFFFFF' : fx.color;
      for (let k = 1; k < fx.pts.length; k++) {
        const [x0, y0] = fx.pts[k - 1], [x1, y1] = fx.pts[k];
        if (fx.zig) {
          const n = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0) / 2));
          for (let i = 0; i <= n; i++) ctx.fillRect(Math.round(x0 + (x1 - x0) * i / n + (Math.random() - 0.5) * 3), Math.round(y0 + (y1 - y0) * i / n + (Math.random() - 0.5) * 3), 1, 1);
        } else {
          const w = Math.max(1, Math.round(fx.w * fx.t / 10));
          ctx.fillRect(Math.round(Math.min(x0, x1) - (y1 !== y0 ? w / 2 : 0)), Math.round(Math.min(y0, y1) - (x1 !== x0 ? w / 2 : 0)), Math.max(w, Math.abs(x1 - x0)), Math.max(w, Math.abs(y1 - y0)));
        }
      }
    }
    for (const m of this.wshots) {
      if (m.kind === 'mortar') {
        const h = Math.sin(Math.PI * m.p) * 18;
        ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(Math.round(m.x) - 1, Math.round(m.y), 3, 2);
        ctx.fillStyle = '#7C7C7C'; ctx.fillRect(Math.round(m.x) - 2, Math.round(m.y - h) - 2, 4, 4);
        ctx.fillStyle = '#F8F8F8'; ctx.fillRect(Math.round(m.x) - 1, Math.round(m.y - h) - 1, 2, 1);
        if ((f >> 2) & 1) { ctx.fillStyle = '#F83800'; ctx.fillRect(Math.round(m.tx) - 3, Math.round(m.ty), 7, 1); ctx.fillRect(Math.round(m.tx), Math.round(m.ty) - 3, 1, 7); }
      } else { ctx.fillStyle = (f >> 1) & 1 ? '#58D854' : '#F8F8F8'; ctx.fillRect(Math.round(m.x) - 1, Math.round(m.y) - 1, 3, 3); }
    }
  },

  // each player's weapon in the left border: a bar in the player's colour, the weapon's letter, level pips
  renderWeaponBadges(ctx) {
    this.players.forEach((p, i) => {
      if (!p.weapon || p.weapon === 'cannon' || p.out) return;
      const W = WEAPONS[p.weapon], lv = weaponLevel(p), y = FY + 8 + i * 30;
      ctx.fillStyle = PALS[Config.playerPal(p.i)][2]; ctx.fillRect(2, y, 12, 2);
      ctx.fillStyle = COL.black; ctx.fillRect(2, y + 3, 12, 10);
      Font.draw(ctx, W.letter, 4, y + 5, W.color);
      for (let k = 0; k < WEAPON_MAX; k++) { ctx.fillStyle = k < lv ? W.color : '#3C3C3C'; ctx.fillRect(2 + k * 3, y + 15, 2, 3); }
    });
  },
});
