'use strict';
// =====================================================================
//  MAZE mode: a huge labyrinth, a new one every stage and bigger each time. You start in the bottom-left corner; there
//  is exactly one way out, the EXIT gate, as far from the start as the maze allows. Find it. The walls are steel,
//  with the odd stretch of brick that can be shot through for a shortcut; trees and ice fill some passages.
//  Enemy tanks wait along the way: they patrol where they are until you come close, then they come for you, and
//  more turn up out of sight as you go (the side panel counts them down). Get lost for too long and the exit sends
//  a signal: a blinking marker at the edge of the screen points the way (sooner on easier skills).
//  Reach the exit and every enemy left in the maze goes up in smoke; the tally and the shop, then the next maze.
//  Destroyed players come back where they were a few seconds before. Game over when everyone is out of tanks.
// =====================================================================

const MAZE_PITCH = 3;                                   // tiles per cell: a 2-tile passage and a 1-tile wall
const MAZE_HINT = [60, 90, 120, 150, 180];              // seconds before the exit signal, per skill
const MAZE_WAKE = 112;                                  // a patrolling enemy comes for you inside this range (px)
const MAZE_BONUS = 2000;                                // for getting out, plus a time bonus

// maze size (in cells) for stage n: bigger every time, never smaller than 1.5 screens either way
function mazeCells(n, vc, vr) {
  const w = Math.min(24, 9 + 2 * n), h = Math.min(16, 6 + n);
  return [Math.max(w, Math.ceil(vc * 1.5 / MAZE_PITCH)), Math.max(h, Math.ceil(vr * 1.5 / MAZE_PITCH))];
}

// a random maze of MW x MH cells, as a block map, with its start, exit and the way between them
function mazeLayout(MW, MH, rand = Math.random) {
  const right = [], down = [];
  for (let j = 0; j < MH; j++) { right.push(new Array(MW).fill(true)); down.push(new Array(MW).fill(true)); }
  const open = (i, j, k) => {   // knock down the wall between cell (i, j) and its neighbour in direction k
    if (k === 0) down[j - 1][i] = false; else if (k === 1) right[j][i] = false;
    else if (k === 2) down[j][i] = false; else right[j][i - 1] = false;
  };
  const wallTo = (i, j, k) => (k === 0 ? j > 0 && down[j - 1][i] : k === 1 ? i < MW - 1 && right[j][i] : k === 2 ? j < MH - 1 && down[j][i] : i > 0 && right[j][i - 1]);
  // depth-first carving from the start corner: long winding passages
  const start = [0, MH - 1], seen = new Uint8Array(MW * MH), stack = [start];
  seen[start[1] * MW + start[0]] = 1;
  while (stack.length) {
    const [i, j] = stack[stack.length - 1];
    const next = [];
    for (let k = 0; k < 4; k++) {
      const x = i + DXY[k][0], y = j + DXY[k][1];
      if (x >= 0 && y >= 0 && x < MW && y < MH && !seen[y * MW + x]) next.push([x, y, k]);
    }
    if (!next.length) { stack.pop(); continue; }
    const [x, y, k] = next[Math.floor(rand() * next.length)];
    open(i, j, k);
    seen[y * MW + x] = 1;
    stack.push([x, y]);
  }
  // a few extra openings, so there's more than one way round (and fewer endless dead ends)
  for (let n = Math.floor(MW * MH * 0.05); n > 0; n--) {
    const i = Math.floor(rand() * MW), j = Math.floor(rand() * MH), k = Math.floor(rand() * 4);
    if (wallTo(i, j, k)) open(i, j, k);
  }
  // distances from the start; the exit is the farthest cell on the outer edge
  const dist = new Int32Array(MW * MH).fill(-1), from = new Int32Array(MW * MH).fill(-1), q = [start[1] * MW + start[0]];
  dist[q[0]] = 0;
  for (let h = 0; h < q.length; h++) {
    const c = q[h], i = c % MW, j = (c / MW) | 0;
    for (let k = 0; k < 4; k++) {
      if (wallTo(i, j, k)) continue;
      const x = i + DXY[k][0], y = j + DXY[k][1];
      if (x < 0 || y < 0 || x >= MW || y >= MH) continue;
      const n = y * MW + x;
      if (dist[n] >= 0) continue;
      dist[n] = dist[c] + 1; from[n] = c; q.push(n);
    }
  }
  let exit = null, best = -1;
  for (let j = 0; j < MH; j++) for (let i = 0; i < MW; i++) {
    if (i && j && i < MW - 1 && j < MH - 1) continue;
    if (dist[j * MW + i] > best) { best = dist[j * MW + i]; exit = [i, j]; }
  }
  const path = [];
  for (let c = exit[1] * MW + exit[0]; c >= 0; c = from[c]) path.push([c % MW, (c / MW) | 0]);
  path.reverse();
  // the blocks (8px): steel walls and pillars, a little brick, trees and ice in some passages
  const BW = (MW * MAZE_PITCH + 1) * 2, BH = (MH * MAZE_PITCH + 1) * 2;
  const g = [];
  for (let y = 0; y < BH; y++) g.push(new Array(BW).fill('.'));
  const fill = (tx, ty, tw, th, ch) => { for (let y = ty * 2; y < (ty + th) * 2; y++) for (let x = tx * 2; x < (tx + tw) * 2; x++) g[y][x] = ch; };
  const wall = (tx, ty, tw, th, outer) => fill(tx, ty, tw, th, !outer && rand() < 0.1 ? '#' : '@');
  for (let j = 0; j <= MH; j++) for (let i = 0; i <= MW; i++) fill(i * 3, j * 3, 1, 1, '@');   // pillars
  for (let i = 0; i < MW; i++) { wall(i * 3 + 1, 0, 2, 1, true); wall(i * 3 + 1, MH * 3, 2, 1, true); }
  for (let j = 0; j < MH; j++) { wall(0, j * 3 + 1, 1, 2, true); wall(MW * 3, j * 3 + 1, 1, 2, true); }
  for (let j = 0; j < MH; j++) for (let i = 0; i < MW; i++) {
    if (i < MW - 1 && right[j][i]) wall(i * 3 + 3, j * 3 + 1, 1, 2);
    if (j < MH - 1 && down[j][i]) wall(i * 3 + 1, j * 3 + 3, 2, 1);
    const key = (i === start[0] && j === start[1]) || (i === exit[0] && j === exit[1]);
    const r = rand();
    if (!key && r < 0.07) fill(i * 3 + 1, j * 3 + 1, 2, 2, '%');
    else if (!key && r < 0.1) fill(i * 3 + 1, j * 3 + 1, 2, 2, '_');
  }
  return { MW, MH, start, exit, path, dist: Array.from(dist), blocks: g.map(r => r.join('')) };
}

// a cell's top-left corner in pixels (its passage is 32 x 32)
const mazeCellPx = (i, j) => [(i * MAZE_PITCH + 1) * 16, (j * MAZE_PITCH + 1) * 16];

Object.assign(Stage.prototype, {
  setupMaze(mz) {
    const [sx, sy] = mazeCellPx(...mz.start), [ex, ey] = mazeCellPx(...mz.exit);
    const sk = Config.get('skill'), lv = sk === AUTO_SKILL ? Math.max(0, Math.min(4, Math.round(AutoSkill.rating))) : sk;
    this.maze = { MW: mz.MW, MH: mz.MH, sx, sy, ex, ey, hintAt: MAZE_HINT[lv] * 60, escaped: false, spawnCd: 300, woke: 0 };
    this.noBase = true;
    // everyone starts in the corner cell, one 16px slot each
    const slot = (x, y, i) => [x + (i & 1) * 16, y + (i >> 1) * 16];
    this.vsSpawn = [0, 1, 2, 3].map(i => slot(sx, sy, i));
    this.mazeSlot = slot;
    // the enemy: some waiting along the way out, some in other passages, the rest turn up later
    const n = Math.min(60, Math.round((10 + 3 * this.num) * Config.get('enemyCount') / 20));
    this.queue = buildQueue(this.num, n);
    for (const q of this.queue) q.ai = AI.WANDER;
    // none near the start: at least 4 cells away along the passages, and 3 as the crow flies (walls don't stop them waking)
    const far = c => mz.dist[c[1] * mz.MW + c[0]] >= 4 && Math.abs(c[0] - mz.start[0]) + Math.abs(c[1] - mz.start[1]) >= 3;
    const onPath = mz.path.filter(far), cells = [];
    for (let j = 0; j < mz.MH; j++) for (let i = 0; i < mz.MW; i++) if (far([i, j])) cells.push([i, j]);
    const first = Math.min(this.queue.length, Math.round(n * 0.4)), used = new Set();
    for (let k = 0; k < first; k++) {
      const pool = k % 2 === 0 && onPath.length ? onPath : cells;
      let c = null;
      for (let t = 0; t < 20 && (!c || used.has(c.join())); t++) c = k % 2 === 0 ? pool[Math.floor((k / first) * pool.length + Math.random() * 3) % pool.length] : pool[rnd(pool.length)];
      if (!c || used.has(c.join())) continue;
      used.add(c.join());
      const [x, y] = mazeCellPx(...c);
      this.spawns.push({ x: x + rnd(2) * 16, y: y + rnd(2) * 16, t: SPARKLE_TIME, enemy: this.queue.shift() });
    }
    this.total = n;
  },

  // where a destroyed player comes back: where they were a few seconds ago
  mazeSpawnPoint(p) {
    const at = p.mazeBack || [this.maze.sx, this.maze.sy];
    return this.mazeSlot(at[0], at[1], p.i);
  },

  // the cell (as its corner in px) a point is in
  mazeCellAt(x, y) {
    const i = Math.max(0, Math.min(this.maze.MW - 1, Math.floor((x - 16) / 48))), j = Math.max(0, Math.min(this.maze.MH - 1, Math.floor((y - 16) / 48)));
    return mazeCellPx(i, j);
  },

  updateMaze() {
    const m = this.maze, ps = this.tanks.filter(t => t.isPlayer && !t.ally && t.alive);
    // remember where everyone was, a step behind (that's where they come back)
    if (this.frame % 90 === 0) for (const t of ps) { t.player.mazeBack = t.player.mazeNow; t.player.mazeNow = this.mazeCellAt(t.x + 8, t.y + 8); }
    // patrols wake up when you come close (or shoot at them), and then they hunt
    for (const t of this.tanks) {
      if (t.isPlayer || !t.alive || t.ai !== AI.WANDER || t.mazeAwake) continue;
      if ((t.maxHp && t.hp < t.maxHp) || ps.some(o => Math.abs(o.x - t.x) + Math.abs(o.y - t.y) < MAZE_WAKE)) { t.mazeAwake = true; t.ai = Math.random() < 0.3 ? AI.SNIPE : AI.HUNT; m.woke++; }
    }
    // more of them turn up, out of sight but not too far ahead
    if (this.queue.length && --m.spawnCd <= 0 && this.freezeE <= 0 && ps.length) {
      m.spawnCd = Math.round(this.spawnInterval * 1.6);
      const onField = this.tanks.filter(t => !t.isPlayer).length + this.spawns.filter(s => s.enemy).length;
      if (onField < this.maxEnemies + 2) {
        const [camX, camY] = [this.camX || 0, this.camY || 0];
        for (let k = 0; k < 30; k++) {
          const o = ps[rnd(ps.length)], [x, y] = this.mazeCellAt(o.x + (rnd(17) - 8) * 48, o.y + (rnd(13) - 6) * 48);
          const seen = x + 32 > camX - 16 && x < camX + VIEW_W + 16 && y + 32 > camY - 16 && y < camY + VIEW_H + 16;
          if (seen || this.tanks.some(t => t.alive && overlap(t.x, t.y, 16, 16, x - 16, y - 16, 64, 64))) continue;
          if (overlap(x, y, 32, 32, m.ex - 32, m.ey - 32, 96, 96)) continue;
          this.spawns.push({ x: x + rnd(2) * 16, y: y + rnd(2) * 16, t: SPARKLE_TIME, enemy: this.queue.shift() });
          break;
        }
      }
    }
    if (this.frame === m.hintAt) this.popups.push({ x: FW / 2, y: (this.camY || 0) + 40, text: 'EXIT SIGNAL!', label: true, color: '#58F898', t: 0, delay: 0, life: 120 });
    // out!
    const out = ps.find(t => overlap(t.x, t.y, 16, 16, m.ex + 8, m.ey + 8, 16, 16));
    if (out) this.mazeEscape(out);
  },

  mazeEscape(t) {
    const m = this.maze;
    m.escaped = true;
    const secs = Math.floor(this.frame / 60), bonus = MAZE_BONUS + Math.max(0, 30 - Math.floor(secs / 10)) * 100;
    this.addScore(t.player, bonus);
    for (const p of this.players) if (!p.out) this.addXp(p, 50);
    this.popups.push({ x: m.ex + 16, y: m.ey, text: 'ESCAPED! +' + bonus, label: true, color: COL.gold, t: 0, delay: 0, life: 150 });
    // whatever is left of the enemy goes up with the maze behind you
    for (const o of this.tanks) if (!o.isPlayer && o.alive) this.killEnemy(o, null, false, true);
    this.queue = [];
    this.spawns = this.spawns.filter(s => !s.enemy);
    Sound.play('bonus');
  },

  // the exit gate: a chequered pad with a green frame, pulsing
  renderMazeExit(ctx) {
    const m = this.maze;
    if (!m) return;
    const { ex: x, ey: y } = m, f = this.frame;
    for (let j = 0; j < 8; j++) for (let i = 0; i < 8; i++) {
      ctx.fillStyle = (i + j + (f >> 4)) & 1 ? '#F8F8F8' : '#1C1C1C';
      ctx.fillRect(x + i * 4, y + j * 4, 4, 4);
    }
    const g = (f >> 3) & 1 ? '#58F898' : '#00A844';
    ctx.fillStyle = g;
    ctx.fillRect(x, y, 32, 2); ctx.fillRect(x, y + 30, 32, 2); ctx.fillRect(x, y, 2, 32); ctx.fillRect(x + 30, y, 2, 32);
    ctx.fillStyle = COL.black;
    ctx.fillRect(x + 2, y + 11, 28, 10);
    Font.drawCenter(ctx, 'EXIT', x + 16, y + 12, g);
  },

  renderMazeLine(ctx) {
    const m = this.maze, t = fmtTime(this.frame).replace(/\.\d$/, '');
    Font.drawCenter(ctx, 'MAZE ' + this.num + '  ' + t + (this.frame >= m.hintAt && !m.escaped ? '  SIGNAL' : ''), FX + VIEW_W / 2, 0, COL.black);
  },
});
