'use strict';
// =====================================================================
//  The FROST QUEEN, harder: she was the galaxy's easy boss (slow shards, one freeze beam, a soft ice storm).
//  Now she has more life, follows you faster, and new attacks that need real dodging:
//    ICICLES       a volley of fast icicles drops from the top in the columns round you, glinting first
//    BLIZZARD WALL a wall of ice across the screen comes down with one gap in it: find the gap
//    FROST NOVA    two rings of shards burst out of her, the second turned half a step
//    TRIPLE BEAM   three freeze beams at once (yours in the middle), a second set right after in the gaps
//    BLINK         she vanishes in a flurry of snow and comes back over you
// =====================================================================

const GXF_HP = 560;   // was 446

{
  const def = GX_BOSSES.find(d => d.key === 'frost');
  def.hp = GXF_HP;
  def.phases = [
    ['shards', 'icicles', 'fan7', 'icicles'],
    ['tripleBeam', 'shards', 'blizzardWall', 'icicles', 'blink', 'aimed5'],
    ['frostNova', 'tripleBeam', 'blizzardWall', 'blink', 'icestorm', 'icicles', 'spiral'],
  ];
  // she follows you faster, the more she's hurt
  def.update = function (b, g, near) {
    if (b.hold || b.charge) return false;
    const tx = near ? near.x + 8 : FW / 2, sp = 0.8 + 0.35 * (b.ph - 1);
    b.x += Math.max(-sp, Math.min(sp, tx - b.x));
    b.y = 14 + Math.sin(b.t / 40) * 3;
    b.x = Math.max(b.w / 2 + 2, Math.min(FW - b.w / 2 - 2, b.x));
    return true;
  };
}

Object.assign(GX_BOSS_ACTS, {
  // a volley of icicles straight down in the columns round you (two waves, the second in between)
  icicles(b, a, c) {
    const s = c.s, px = c.near ? c.near.x + 8 : b.x;
    if (a.t === 1 || a.t === 26) {
      const off = a.t === 1 ? 0 : 12;
      for (let k = -2; k <= 2; k++) {
        const x = Math.max(4, Math.min(FW - 4, px + k * 24 + off));
        c.g.bullets.push({ x, y: -8, vx: 0, vy: 2.6 * s, k: 'shard' });
      }
      Sound.play('mortar');
    }
    if (a.t >= 40) c.done(45);
  },
  // a wall of shards across the whole screen, with one gap a tank fits through
  blizzardWall(b, a, c) {
    const s = c.s;
    if (a.t === 1 || (b.ph >= 3 && a.t === 50)) {
      const gap = 24 + rnd(FW - 72), w = 26;
      for (let x = 4; x < FW - 4; x += 9) if (x < gap || x > gap + w) c.g.bullets.push({ x, y: -6, vx: 0, vy: 1.05 * s, k: 'shard' });
      this.gxSay(b, a.t === 1 ? 'KNEEL.' : 'AGAIN.', 50);
      Sound.play('mortar');
    }
    if (a.t >= (b.ph >= 3 ? 90 : 50)) c.done(60);
  },
  // two rings of shards, the second turned half a step (they slow as they fall, like her shards)
  frostNova(b, a, c) {
    const n = 18, y = b.y + b.h / 2;
    if (a.t === 1 || a.t === 18) for (let i = 0; i < n; i++) c.shoot(b.x, y, (i + (a.t === 18 ? 0.5 : 0)) * Math.PI * 2 / n, 1.3, 'shard', { slow: true });
    if (a.t === 1) Sound.play('charge');
    if (a.t >= 18) c.done(70);
  },
  // three freeze beams at once, yours in the middle; then three more in the gaps
  tripleBeam(b, a, c) {
    const px = c.near ? c.near.x + 8 : b.x;
    if (a.t === 1) for (const dx of [-30, 0, 30]) b.beams.push({ x: Math.max(6, Math.min(FW - 6, px + dx)), t: 0, warn: 40, dur: 26, kind: 'ice' });
    if (a.t === 40) for (const dx of [-15, 15, 45]) b.beams.push({ x: Math.max(6, Math.min(FW - 6, px + dx - (rnd(2) ? 30 : 0))), t: 0, warn: 30, dur: 22, kind: 'ice' });
    if (a.t >= 100) c.done(50);
  },
  // gone in a flurry of snow, back over you a moment later
  blink(b, a, c) {
    if (a.t === 1) {
      b.hold = true;
      for (let k = 0; k < 6; k++) this.addFx(b.x - 16 + rnd(32), b.y + rnd(b.h), [Sprites.sparkle[0], Sprites.sparkle[1], Sprites.sparkle[2], Sprites.sparkle[3]], 4);
      Sound.play('teleport');
    }
    if (a.t === 14) {
      b.x = Math.max(b.w / 2 + 2, Math.min(FW - b.w / 2 - 2, c.near ? c.near.x + 8 : FW / 2));
      for (let k = 0; k < 6; k++) this.addFx(b.x - 16 + rnd(32), b.y + rnd(b.h), [Sprites.sparkle[3], Sprites.sparkle[2], Sprites.sparkle[1], Sprites.sparkle[0]], 4);
      c.shoot(b.x, b.y + b.h - 4, Math.PI / 2, 1.8, 'shard');   // and a shard at once, straight down
    }
    if (a.t >= 24) { b.hold = false; c.done(30); }
  },
});
