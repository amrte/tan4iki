'use strict';
// =====================================================================
//  KILL RACE: no eagles, just the enemy. Each round is a normal stage of enemy tanks; whoever destroys the most of
//  them wins the round and scores 1 point (a tie on kills goes to whoever scored more points with them; still tied,
//  nobody scores). First to the target wins the game; the target is picked on the first round's curtain (or in
//  Settings -> GAME). Destroyed players come back after a moment instead of losing lives. Alone, you race 3 bots.
//  Enemy tanks appear at random free spots all over the map (never right next to a player), not just along the top.
// =====================================================================

const RACE_TARGETS = [1, 2, 3, 5, 7, 10], RACE_RESPAWN = 90, RACE_SPAWN_GAP = 64;

// one player's round: kills, and the points they were worth (the tie-break)
function raceTally(p) {
  const kills = p.kills.reduce((a, n) => a + n, 0);
  const pts = p.kills.reduce((a, n, k) => a + n * (ENEMY[k] ? ENEMY[k].pts : 0), 0);
  return { kills, pts };
}

// the round's winner (index into players), or -1 for a draw / nobody scored
function raceWinner(players) {
  const rows = players.map(raceTally);
  const best = Math.max(...rows.map(r => r.kills));
  if (best <= 0) return -1;
  let lead = rows.map((r, i) => i).filter(i => rows[i].kills === best);
  if (lead.length > 1) {
    const top = Math.max(...lead.map(i => rows[i].pts));
    lead = lead.filter(i => rows[i].pts === top);
  }
  return lead.length === 1 ? lead[0] : -1;
}

Object.assign(Stage.prototype, {
  setupRace(target, round) {
    this.race = { target, round };
    this.noBase = true;
    this.setBaseWalls(T_EMPTY);
    this.clearArea(BASE_X - 8, BASE_Y - 8, 32, 24);
  },

  // a random 16px spot an enemy can appear on: open ground (trees, ice, mud, bridges are fine), nobody there or
  // about to be, no teleporter pad, and at least 4 tiles from every player
  raceSpawnSpot() {
    const busy = (x, y) => this.tanks.some(t => t.alive && overlap(t.x, t.y, 16, 16, x, y, 16, 16))
      || this.spawns.some(s => overlap(s.x, s.y, 16, 16, x, y, 16, 16))
      || (this.pads || []).some(p => overlap(p.x, p.y, 16, 16, x, y, 16, 16))
      || this.tanks.some(t => t.alive && t.isPlayer && Math.abs(t.x - x) < RACE_SPAWN_GAP && Math.abs(t.y - y) < RACE_SPAWN_GAP)
      || this.spawns.some(s => s.player && Math.abs(s.x - x) < RACE_SPAWN_GAP && Math.abs(s.y - y) < RACE_SPAWN_GAP);
    for (let k = 0; k < 40; k++) {
      const x = rnd(COLS * 2 - 1) * 8, y = rnd(ROWS * 2 - 1) * 8;
      let solid = false;
      for (let cy = y >> 2; cy < (y + 16) >> 2 && !solid; cy++) for (let cx = x >> 2; cx < (x + 16) >> 2; cx++) {
        const v = this.get(cx, cy);
        if (v === T_BRICK || v === T_STEEL || v === T_WATER) { solid = true; break; }
      }
      if (!solid && !busy(x, y)) return [x, y];
    }
    return null;
  },

  // the side panel: per player, kills this round and points (gold pips out of the target)
  renderRaceHud(ctx, H) {
    const n = Math.min(20, this.queue.length);
    for (let i = 0; i < n; i++) ctx.drawImage(Sprites.enemyIcon, H + (i % 2) * 8, 24 + (i >> 1) * 8);
    const target = this.race.target;
    this.players.forEach((p, i) => {
      const y = 112 + i * 22;
      ctx.drawImage(Sprites.playerIcon(Config.playerPal(p.i)), H, y);
      Font.draw(ctx, String(Math.min(99, raceTally(p).kills)), H + 8, y, COL.black);
      for (let k = 0; k < Math.min(10, target); k++) {
        ctx.fillStyle = k < (p.racePts || 0) ? COL.gold : '#3C3C3C';
        ctx.fillRect(H + (k % 5) * 3, y + 9 + (k >= 5 ? 3 : 0), 2, 2);
      }
    });
  },

  renderRaceLine(ctx) {
    Font.drawCenter(ctx, 'ROUND ' + this.race.round + '  FIRST TO ' + this.race.target, FX + VIEW_W / 2, 0, COL.black);
  },
});
