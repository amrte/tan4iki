'use strict';
// =====================================================================
//  Secrets, the way an old platformer hides them
//    HIDDEN POWER-UPS  a few brick blocks on a stage hide a power-up: break most of the block and it pops out.
//                      Watch for the odd glint on a wall.
//    ? BLOCKS          a golden question block takes the place of a brick block now and then. It's solid; shoot it:
//                      COIN      every hit pops a coin (200 points), up to 8, then it's an empty block
//                      MUSHROOM  one hit and a mushroom grows out, walks to your eagle and guards it (running round it to put
//                                itself between the eagle and the enemy, soaking up the shells aimed at it) until
//                                the end of the stage, bouncing every shell aimed at the eagle
//  In the modes where they make sense: the classic game, any side, big maps, survival, time attack, maze, kill race,
//  custom levels and VS CPU (no mushrooms where there's no eagle). Not in versus, fortress or boss stages.
//  Settings -> GAME -> SECRETS.
// =====================================================================

const QB_COINS = 8, QB_COIN_PTS = 200, MUSH_SPEED = 0.5;
const MUSH_GUARD_SPEED = 1.6, MUSH_RING = 22;   // on guard: how fast it shuffles round the eagle, and how far out
// the ? block (16 x 16): gold with a darker rim and the question mark; the used block is plain brown
const QBLOCK_ROWS = ['DDDDDDDDDDDDDDDD', 'DGGGGGGGGGGGGGGD', 'DGRGGGGGGGGGGRGD', 'DGGGGWWWWWGGGGGD', 'DGGGWWDDDWWGGGGD', 'DGGGWWDGGWWDGGGD',
  'DGGGGDDGGWWDGGGD', 'DGGGGGGGWWDDGGGD', 'DGGGGGGWWDDGGGGD', 'DGGGGGGWWDGGGGGD', 'DGGGGGGGDDGGGGGD', 'DGGGGGGWWGGGGGGD',
  'DGGGGGGWWDGGGGGD', 'DGRGGGGGDDGGGGRD', 'DGGGGGGGGGGGGGGD', 'DDDDDDDDDDDDDDDD'];
const MUSHROOM_ROWS = ['.....RRRRRR.....', '...RRWWRRRRRR...', '..RWWWWRRRWWRR..', '.RWWWWRRRRWWWRR.', '.RRWWRRRRRRWWRR.', 'RRRRRRRWWRRRRRRR',
  'RRWWRRWWWWRRRWWR', 'RWWWWRRWWRRRWWWR', 'RWWWWRRRRRRRWWWR', '.RRRDDDDDDDDRRR.', '...DWWWWWWWWD...', '...DWWDWWDWWD...',
  '...DWWDWWDWWD...', '...DWWWWWWWWD...', '....DWWWWWWD....', '.....DDDDDD.....'];
const COIN_ROWS = ['..DDDD..', '.DYYYYD.', 'DYYWYYYD', 'DYWYYYYD', 'DYWYYYYD', 'DYYYYYYD', '.DYYYYD.', '..DDDD..'];

let secretSprites = null;
function secretSprite(name) {
  if (!secretSprites) {
    const pal = { D: '#7C3C00', G: '#F8B800', R: '#7C3C00', W: '#F8F8F8', Y: '#F8D040' };
    secretSprites = {
      qblock: [0, 1].map(f => paintRows(QBLOCK_ROWS, Object.assign({}, pal, { W: f ? '#F8D878' : '#F8F8F8' }))),
      // the used block: plain brown with its four rivets
      used: paintRows(QBLOCK_ROWS.map((r, j) => r.split('').map((c, i) => (i === 0 || j === 0 || i === 15 || j === 15 ? 'D' : (i === 2 || i === 13) && (j === 2 || j === 13) ? 'D' : 'G')).join('')), { D: '#3C1C00', G: '#9C5C1C' }),
      mushroom: paintRows(MUSHROOM_ROWS, { R: '#D82800', W: '#F8F8F8', D: '#3C1C00' }),
      coin: [0, 1, 2, 3].map(f => {
        // a spinning coin: full, narrower, edge-on, narrower
        const w = [8, 6, 2, 6][f], c = makeCanvas(8, 8), x = c.getContext('2d');
        x.drawImage(paintRows(COIN_ROWS, { D: '#A86C00', Y: '#F8D040', W: '#F8F8F8' }), 0, 0, 8, 8, (8 - w) / 2, 0, w, 8);
        return c;
      }),
    };
  }
  return secretSprites[name];
}

Object.assign(Stage.prototype, {
  setupSecrets(opts) {
    this.secrets = []; this.qblocks = []; this.coinPops = []; this.mushroom = null;
    const m = Game.mode, allowed = ['classic', 'sides', 'bigmaps', 'survival', 'timeattack', 'maze', 'race', 'custom', 'cpu'];
    if (Net.role === 'client' || !Config.on('secrets') || opts.boss || opts.editor || opts.snapshot || opts.vs || opts.fortress || opts.corridor || !allowed.includes(m)) return;
    // brick blocks (16px, all brick) away from the eagle and the entry points
    const near = (x, y, list, d) => list.some(([px, py]) => Math.abs(px - x) < d && Math.abs(py - y) < d);
    const cands = [];
    for (let y = 0; y <= FH - 16; y += 16) for (let x = 0; x <= FW - 16; x += 16) {
      let brick = true;
      for (let cy = y >> 2; cy < (y + 16) >> 2 && brick; cy++) for (let cx = x >> 2; cx < (x + 16) >> 2; cx++) if (this.get(cx, cy) !== T_BRICK) { brick = false; break; }
      if (!brick || near(x, y, [[BASE_X, BASE_Y]], 40) || near(x, y, PLAYER_SPAWN.concat(ENEMY_SPAWNS, this.vsSpawn || []), 24)) continue;
      cands.push([x, y]);
    }
    for (let i = cands.length - 1; i > 0; i--) { const j = rnd(i + 1); [cands[i], cands[j]] = [cands[j], cands[i]]; }
    const area = Math.max(1, FW * FH / (208 * 208));
    const hidden = Math.min(cands.length, Math.round((1 + rnd(3)) * Math.sqrt(area)));
    for (let k = 0; k < hidden; k++) { const [x, y] = cands.shift(); this.secrets.push({ x, y, found: false, glint: rnd(300) }); }
    // question blocks: none, one or two (more on big maps)
    const r = Math.random(), nq = Math.min(cands.length, Math.round((r < 0.62 ? 0 : r < 0.92 ? 1 : 2) * Math.sqrt(area)));
    let mush = 0;
    for (let k = 0; k < nq; k++) {
      const [x, y] = cands.shift();
      for (let cy = y >> 2; cy < (y + 16) >> 2; cy++) for (let cx = x >> 2; cx < (x + 16) >> 2; cx++) this.set(cx, cy, T_EMPTY);
      const kind = !this.noBase && !mush && Math.random() < 0.3 ? 'mushroom' : 'coin';
      if (kind === 'mushroom') mush++;
      this.qblocks.push({ x, y, kind, left: kind === 'coin' ? QB_COINS : 1, bump: 0 });
    }
    if (this.qblocks.length) { this.origTerrain = this.terrain.slice(); this.navCost = {}; this.navBaseF = {}; }
  },

  updateSecrets() {
    // a hidden power-up comes out once most of its block is gone
    for (const s of this.secrets) {
      if (s.found || this.frame % 6) continue;
      let left = 0;
      for (let cy = s.y >> 2; cy < (s.y + 16) >> 2; cy++) for (let cx = s.x >> 2; cx < (s.x + 16) >> 2; cx++) if (this.get(cx, cy) === T_BRICK) left++;
      if (left > 6) continue;
      s.found = true;
      this.spawnPowerup();
      if (this.powerup) { this.powerup.x = s.x; this.powerup.y = s.y; }
      this.popups.push({ x: s.x + 8, y: s.y - 2, text: 'SECRET!', label: true, color: COL.gold, t: 0, delay: 0, life: 70 });
      Sound.play('secret');
    }
    for (const q of this.qblocks) if (q.bump > 0) q.bump--;
    for (const c of this.coinPops) c.t++;
    this.coinPops = this.coinPops.filter(c => c.t < 30);
    if (this.mushroom) this.updateMushroom();
  },

  // a shell meets a ? block (true: it stopped there)
  bulletQBlock(b) {
    const q = this.qblocks.find(o => overlap(b.x, b.y, 4, 4, o.x, o.y, 16, 16));
    if (!q) return false;
    this.killBullet(b, false);
    if (!b.isPlayer || q.left <= 0) { Sound.play('steel'); return true; }
    q.bump = 8;
    q.left--;
    Sound.play('bump');
    if (q.kind === 'coin') {
      this.coinPops.push({ x: q.x + 4, y: q.y - 8, t: 0 });
      const p = b.owner && b.owner.player;
      if (p) { this.addScore(p, QB_COIN_PTS); this.popups.push({ x: q.x + 8, y: q.y - 6, text: String(QB_COIN_PTS), t: 0, delay: 12 }); }
      Sound.play('coin');
    } else {
      this.mushroom = { x: q.x, y: q.y, rise: 16, state: 'rise', dir: 0, hop: 0, bounce: 0 };
      Sound.play('mushroom');
    }
    return true;
  },

  qblockAt(x, y, w, h) { return this.qblocks.length && this.qblocks.some(q => overlap(x, y, w, h, q.x, q.y, 16, 16)); },

  // the mushroom: grows out of its block, walks the route to the eagle, then stands guard beside it
  updateMushroom() {
    const m = this.mushroom;
    if (m.bounce > 0) m.bounce--;
    if (m.state === 'rise') {
      if (--m.rise <= 0) { m.state = 'walk'; m.y -= 16; this.popups.push({ x: m.x + 8, y: m.y - 4, text: 'TO THE EAGLE!', label: true, color: '#F83800', t: 0, delay: 0, life: 70 }); }
      return;
    }
    if (m.state === 'guard') { this.mushroomPatrol(m); return; }
    if (m.state !== 'walk' || !this.baseAlive) return;
    const ex = BASE_X, ey = BASE_Y;
    if (Math.abs(m.x - ex) + Math.abs(m.y - ey) <= 20) {
      // in place beside the eagle (on whichever side is clear)
      m.state = 'guard';
      this.popups.push({ x: ex + 8, y: ey - 12, text: 'EAGLE GUARDED', label: true, color: COL.gold, t: 0, delay: 0, life: 90 });
      Sound.play('pickup');
      return;
    }
    // follow the route field downhill, a node at a time
    if (!m.to || (Math.abs(m.x - m.to[0]) < MUSH_SPEED && Math.abs(m.y - m.to[1]) < MUSH_SPEED)) {
      if (m.to) { m.x = m.to[0]; m.y = m.to[1]; }
      const dist = this.navBase(''), NX = COLS * 2 - 1, NY = ROWS * 2 - 1;
      const bx = Math.max(0, Math.min(NX - 1, Math.round(m.x / 8))), by = Math.max(0, Math.min(NY - 1, Math.round(m.y / 8)));
      let best = null, bv = dist[by * NX + bx];
      for (let d = 0; d < 4; d++) {
        const nx = bx + DXY[d][0], ny = by + DXY[d][1];
        if (nx < 0 || ny < 0 || nx >= NX || ny >= NY) continue;
        const v = dist[ny * NX + nx];
        if (v < bv) { bv = v; best = [nx * 8, ny * 8, d]; }
      }
      // no way along the field (walled off): just head for the eagle
      if (!best) { const dx = ex - m.x, dy = ey - m.y; best = Math.abs(dx) > Math.abs(dy) ? [m.x + Math.sign(dx) * 8, m.y, dx > 0 ? 1 : 3] : [m.x, m.y + Math.sign(dy) * 8, dy > 0 ? 2 : 0]; }
      m.to = best; m.dir = best[2];
    }
    m.x += Math.sign(m.to[0] - m.x) * Math.min(MUSH_SPEED, Math.abs(m.to[0] - m.x));
    m.y += Math.sign(m.to[1] - m.y) * Math.min(MUSH_SPEED, Math.abs(m.to[1] - m.y));
    m.hop = (m.hop + 1) % 16;
  },

  // On guard: it runs round the eagle (a ring just outside the fort, over the walls) to stand between the eagle and
  // the danger: a shell flying at the eagle first, otherwise the nearest enemy. Enemy shells that hit it bounce off it.
  mushroomPatrol(m) {
    if (!this.baseAlive) return;
    const ecx = BASE_X + 8, ecy = BASE_Y + 8;
    let tx = null, ty = null, best = Infinity;
    for (const b of this.bullets) {
      if (!b.alive || b.isPlayer) continue;
      const [dx, dy] = DXY[b.dir], rx = ecx - (b.x + 2), ry = ecy - (b.y + 2), ahead = rx * dx + ry * dy, side = Math.abs(dx ? ry : rx);
      if (ahead > 0 && side < 14 && ahead < best) { best = ahead; tx = b.x + 2; ty = b.y + 2; }   // coming straight for the eagle
    }
    if (tx === null) {
      for (const t of this.tanks) {
        if (!t.alive || t.isPlayer || t.mirage) continue;
        const d = Math.hypot(t.x + 8 - ecx, t.y + 8 - ecy);
        if (d < best && d < 220) { best = d; tx = t.x + 8; ty = t.y + 8; }
      }
    }
    // the spot on the ring towards the danger (the ring is square, like the fort round the eagle)
    const ddx = tx === null ? m.gx || 0 : tx - ecx, ddy = tx === null ? m.gy || -1 : ty - ecy, k = MUSH_RING / (Math.max(Math.abs(ddx), Math.abs(ddy)) || 1);
    m.gx = ddx; m.gy = ddy;
    const gx = Math.max(0, Math.min(FW - 16, ecx + ddx * k - 8)), gy = Math.max(0, Math.min(FH - 16, ecy + ddy * k - 8));
    const mx = gx - m.x, my = gy - m.y, d = Math.hypot(mx, my);
    if (d > 0.5) {
      // round the ring, not through the eagle: go along one side first when the way across would cross it
      const step = Math.min(MUSH_GUARD_SPEED, d);
      if (Math.abs(mx) > Math.abs(my) && Math.abs(m.y + 8 - ecy) < 12 && Math.sign(mx) !== Math.sign(m.x + 8 - ecx) && Math.abs(m.x + 8 - ecx) < MUSH_RING + 2) m.y += (m.y + 8 <= ecy ? -1 : 1) * step;
      else if (Math.abs(my) >= Math.abs(mx) && Math.abs(m.x + 8 - ecx) < 12 && Math.sign(my) !== Math.sign(m.y + 8 - ecy) && Math.abs(m.y + 8 - ecy) < MUSH_RING + 2) m.x += (m.x + 8 <= ecx ? -1 : 1) * step;
      else { m.x += mx / d * step; m.y += my / d * step; }
      m.hop = (m.hop + 1) % 16;
      m.dir = Math.abs(mx) > Math.abs(my) ? (mx > 0 ? 1 : 3) : (my > 0 ? 2 : 0);
    }
    m.x = Math.max(0, Math.min(FW - 16, m.x)); m.y = Math.max(0, Math.min(FH - 16, m.y));
    // enemy shells that hit it are soaked up (a rocket too: it doesn't get to go off)
    for (const b of this.bullets) {
      if (!b.alive || b.isPlayer || !overlap(b.x, b.y, 4, 4, m.x, m.y, 16, 16)) continue;
      b.alive = false;
      m.bounce = 12;
      m.saved = (m.saved || 0) + 1;
      Sound.play('boing');
      this.popups.push({ x: m.x + 8, y: m.y - 2, text: 'BLOCKED', label: true, color: COL.gold, t: 0, delay: 0, life: 40 });
    }
  },

  // a hit on the eagle itself: the mushroom doesn't make it untouchable any more (it has to be in the way)
  mushroomGuards() { return false; },

  // ------------------------------------------------------------ drawing
  renderSecrets(ctx) {
    const f = this.frame;
    // a glint now and then on a wall hiding something
    for (const s of this.secrets || []) {
      if (s.found || (f + s.glint) % 300 > 10) continue;
      const k = (f + s.glint) % 300;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(s.x + 4 + k, s.y + 4, 1, 1);
      if (k > 3 && k < 8) ctx.fillRect(s.x + 3 + k, s.y + 5, 3, 1);
    }
    for (const q of this.qblocks || []) {
      const lift = q.bump > 0 ? Math.round(Math.sin(Math.PI * q.bump / 8) * 4) : 0;
      ctx.drawImage(q.left > 0 ? secretSprite('qblock')[(f >> 4) % 3 === 2 ? 1 : 0] : secretSprite('used'), q.x, q.y - lift);
    }
    const m = this.mushroom;
    if (m) {
      if (m.state === 'rise') {
        // growing up out of the top of its block
        const h = 16 - m.rise;
        ctx.drawImage(secretSprite('mushroom'), 0, 0, 16, h, m.x, m.y - h, 16, h);
      } else {
        const squash = m.bounce > 0 ? Math.round(Math.sin(Math.PI * m.bounce / 12) * 3) : 0, hop = m.state !== 'rise' && m.hop < 8 ? 1 : 0;
        ctx.drawImage(secretSprite('mushroom'), m.x - squash, m.y + squash - hop, 16 + squash * 2, 16 - squash);
        if (m.state === 'guard' && (f >> 4) & 1) { ctx.fillStyle = COL.gold; ctx.fillRect(m.x + 7, m.y - 4, 2, 2); }
      }
    }
    for (const c of this.coinPops || []) {
      const y = c.y - Math.sin(Math.PI * c.t / 30) * 20;
      ctx.drawImage(secretSprite('coin')[(c.t >> 2) % 4], c.x, Math.round(y));
    }
  },
});
