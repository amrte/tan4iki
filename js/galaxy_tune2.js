'use strict';
// =====================================================================
//  GALAXY, tuning II: longer and tougher, and leaner on credits.
//    waves      each wave comes back once more after you've cleared it (half its size, the same kind): about half
//               as long again. Not the mini-boss or the challenge stage.
//    hit points the small fry x1.5, the mini-bosses x4, the bosses (and their parts: orbs, hands, turrets ...) x1.8,
//               on top of the skill's own scaling (galaxy_tune.js)
//    credits    half as many: coins, gems, kills, boss bounties and the sectors' own gifts (gxCash, galaxy_tune.js)
//  Loaded after every galaxy file, so its wrappers are the outermost.
// =====================================================================

const GXT2 = { encore: 0.5, enemy: 1.5, mini: 4, boss: 1.8 };
const GXT2_NO_ENCORE = new Set(['miniboss', 'challenge']);

{
  const P = Stage.prototype;

  // ---- a wave cleared: the same kind once more, half the size, before the next one
  const next = P.gxNextWave;
  P.gxNextWave = function () {
    const g = this.galaxy, plan = g && (g.plan || GX_PLAN[g.sec]);
    if (this.gxt2In) return next.apply(this, arguments);   // called again from inside (a wave kind moving on): as is
    if (g && g.phase === 'between' && plan && g.wave >= 1 && g.wave <= plan.length && g.encore !== g.wave && !GXT2_NO_ENCORE.has(g.kind)) {
      const w0 = g.wave, e0 = g.encore;
      g.encore = g.wave;
      g.wave--;
      let r;
      this.gxt2In = true;
      try { r = next.apply(this, arguments); } finally { this.gxt2In = false; }
      // held back (perks on offer between waves, galaxy_prog.js): as it was, and the encore comes when it moves on
      if (g.wave === w0 - 1) { g.wave = w0; g.encore = e0; return r; }
      // the earliest half of what it sends (formations: the top rows; escorts keep their guards' parents)
      const q = g.spawnQ.slice().sort((a, b) => a.delay - b.delay), keep = q.slice(0, Math.max(1, Math.ceil(q.length * GXT2.encore)));
      const ids = new Set(keep.filter(o => o.id).map(o => o.id));
      g.spawnQ = q.length >= 4 ? keep.filter(o => !o.parent || ids.has(o.parent)) : g.spawnQ;
      if (g.banner && g.banner.text) g.banner.text += ' II';
      return r;
    }
    return next.apply(this, arguments);
  };

  // ---- hit points: the small fry and the mini-bosses
  const spawn = P.gxSpawn;
  P.gxSpawn = function (o) {
    const e = spawn.apply(this, arguments), T = e && GX_TYPES[e.type];
    if (e && T && !T.chal && e.hp > 0.5) {
      const k = T.mini ? GXT2.mini : GXT2.enemy;
      e.hp *= k; e.max *= k;
    }
    return e;
  };

  // ---- hit points: the bosses, and whatever parts they have with hit points of their own
  const scale = (o, k) => { if (o && typeof o.hp === 'number' && typeof o.max === 'number') { o.hp *= k; o.max *= k; } };
  const bossStart = P.gxBossStart;
  P.gxBossStart = function () {
    const r = bossStart.apply(this, arguments), b = this.galaxy && this.galaxy.boss;
    if (b && !b.gxt2) {
      b.gxt2 = true;
      scale(b, GXT2.boss);
      for (const key of Object.keys(b)) {
        const v = b[key];
        if (Array.isArray(v)) { for (const part of v) if (part && typeof part === 'object') scale(part, GXT2.boss); }
        else if (v && typeof v === 'object' && v !== b) scale(v, GXT2.boss);
      }
    }
    return r;
  };
}
