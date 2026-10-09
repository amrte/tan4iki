'use strict';
// =====================================================================
//  COUNTER-STRIKE neutral tanks (team screen: NEUTRAL TANKS OFF / FEW / SOME / MANY): grey tanks of nobody's side
//  roaming the map. They hunt and shoot whoever's nearest, terrorist or counter-terrorist; destroying one pays $150;
//  one that's destroyed comes back ten seconds later somewhere nobody can see. They wait out the buy time, they're
//  hidden in the fog like the other side (grey dots on the minimap once seen), and the bots fight them when they come
//  close. Only the plain tanks: BASIC, FAST, POWER and ARMOR (in grey whatever they are).
// =====================================================================

const CS_NEUTRAL_PAY = 150, CS_NEUTRAL_BACK = 600, CS_NEUTRAL_TYPES = [0, 0, 1, 1, 2, 3];
PALS.csN = [null, '#E4E4E4', '#9C9C9C', '#484848'];
const csNeutral = t => t && !t.isPlayer && !t.player;

Object.assign(Stage.prototype, {
  // a place for one: open floor a tank fits, away from both spawns and from every player's tank; unseen if asked
  csNeutralSpot(unseen) {
    const N = this.csNav(), far = (x, y, z) => { const [zx, zy, zw, zh] = CS_ZONES[z]; return Math.hypot(x + 8 - (zx + zw / 2) * 16, y + 8 - (zy + zh / 2) * 16) > 14 * 16; };
    for (let k = 0; k < 400; k++) {
      const bx = rnd(N.NX), by = rnd(N.NY);
      if (!N.pass[by * N.NX + bx]) continue;
      const x = bx * 8, y = by * 8;
      if (!far(x, y, 'T') || !far(x, y, 'CT')) continue;
      if (this.tanks.some(t => t.alive && Math.abs(t.x - x) + Math.abs(t.y - y) < (t.isPlayer ? 160 : 40))) continue;
      if (this.spawns.some(s => Math.abs(s.x - x) + Math.abs(s.y - y) < 32)) continue;
      if (unseen && (this.csSeesAt('T', x + 8, y + 8) || this.csSeesAt('CT', x + 8, y + 8))) continue;
      return [x, y];
    }
    return null;
  },
  csNeutralSpawn(unseen) {
    const at = this.csNeutralSpot(unseen);
    if (!at) return false;
    this.spawns.push({ x: at[0], y: at[1], t: 30, enemy: { type: CS_NEUTRAL_TYPES[rnd(CS_NEUTRAL_TYPES.length)], ai: noBasePersonality(), extra: { csNeutral: true } } });
    return true;
  },
  csNeutralTick() {
    const C = this.cs;
    if (!C.neutrals || C.phase === 'end') return;
    C.nBack = (C.nBack || []).filter(at => {
      if (this.frame < at) return true;
      return !this.csNeutralSpawn(true);   // nowhere unseen right now: try again next frame
    });
  },
});

(() => {
  const P = Stage.prototype;
  // a new round: the neutrals spread round the map
  const setup = P.csSetup;
  P.csSetup = function (players, M) {
    const r = setup.apply(this, arguments);
    this.cs.neutrals = M.neutrals || 0; this.cs.nBack = [];
    for (let k = 0; k < this.cs.neutrals; k++) this.csNeutralSpawn(false);
    return r;
  };
  const update = P.csUpdate;
  P.csUpdate = function () { this.csNeutralTick(); return update.apply(this, arguments); };
  // the classic waves never come in a match (a NIGHTMARE! kill would queue one at the top of the map)
  const spawning = P.updateSpawning;
  P.updateSpawning = function () { if (this.cs) { this.queue.length = 0; return; } return spawning.apply(this, arguments); };
  // they wait out the buy time like everyone
  const enemy = P.updateEnemy;
  P.updateEnemy = function (t) { if (this.cs && this.cs.phase === 'buy') return; return enemy.apply(this, arguments); };
  // destroyed: $150 to whoever did it, and another one later on
  const kill = P.killEnemy;
  P.killEnemy = function (t, by, award, silent) {
    if (!this.cs || !t.alive) return kill.apply(this, arguments);
    kill.call(this, t, by, false, silent);
    const p = by && by.player;
    if (p && award) {
      this.csPay(p, CS_NEUTRAL_PAY);
      this.popups.push({ x: t.x + 8, y: t.y + 8, text: '$' + CS_NEUTRAL_PAY, t: 0, delay: 10, color: '#58D854' });
    }
    if (this.cs.neutrals) this.cs.nBack.push(this.frame + CS_NEUTRAL_BACK);
  };
  // in the fog like the other side; grey dots on the minimap once seen
  const mini = P.csMinimap;
  P.csMinimap = function (ctx, camX, camY) {
    mini.apply(this, arguments);
    if (!Config.on('minimap')) return;
    const V = this.csViewer(), x0 = VIEW_W - CS_W - 3, y0 = 3;
    ctx.fillStyle = '#BCBCBC';
    for (const t of this.tanks) if (t.alive && csNeutral(t) && (!V.team || this.csSees(V.team, t))) ctx.fillRect(Math.round(x0 + (t.x + 8) / 16), Math.round(y0 + (t.y + 8) / 16), 2, 2);
  };
})();
