'use strict';
// =====================================================================
//  First-meet cards: the first time you meet each enemy, boss and power-up, a one-line card slides up at the
//  top of the field: "NEW: JAMMER - SLOWS YOUR SHELLS NEARBY". What you have met is remembered between games
//  (Settings -> FIRST-MEET CARDS turns them off; SHOW ALL CARDS AGAIN forgets). A line too long for the field
//  scrolls along once.
// =====================================================================

const SEEN_KEY = 'tank1990_seen', CARD_HOLD = 240, CARD_LEAD = 50, CARD_TAIL = 80, CARD_SPEED = 1.5;

const Seen = {
  keys: null,
  load() { if (!this.keys) this.keys = new Set(STORE.get(SEEN_KEY, [])); return this.keys; },
  has(k) { return this.load().has(k); },
  add(k) { this.load().add(k); STORE.set(SEEN_KEY, [...this.keys]); },
  reset() { this.keys = new Set(); STORE.set(SEEN_KEY, []); },
};

// "NEW: <name> - <what it does>" for e<type>, b<boss>, p<power-up>, t<tile> (biomes.js)
function cardText(key) {
  const i = +key.slice(1);
  const src = key[0] === 'e' ? ENEMY[i] : key[0] === 'b' ? BOSSES[i] : key[0] === 't' ? BIO_CARDS[i] : POWERUPS[i];
  if (!src) return null;
  const name = key[0] === 'e' && i < 4 ? src.name + ' TANK' : key[0] === 'b' ? 'BOSS ' + src.name : src.name;
  return 'NEW: ' + name + (src.desc ? ' - ' + src.desc : '');
}

// frames a card stays up: a short one holds still, a long one waits, scrolls to its end and waits again
function cardLife(text) {
  const over = text.length * 8 - (VIEW_W - 12);
  return over <= 0 ? CARD_HOLD : CARD_LEAD + Math.ceil(over / CARD_SPEED) + CARD_TAIL;
}

Object.assign(Stage.prototype, {
  // something appeared: a card for it, if it's the first time ever (the online host decides)
  encounter(key) {
    if (Net.role === 'client' || !Config.on('newCards') || Seen.has(key)) return;
    const text = cardText(key);
    if (!text) return;
    Seen.add(key);
    (this.cardQueue || (this.cardQueue = [])).push(text);
  },

  updateCards() {
    if (this.card && ++this.card.t >= this.card.life) this.card = null;
    if (!this.card && this.cardQueue && this.cardQueue.length) {
      const text = this.cardQueue.shift();
      this.card = { text, t: 0, life: cardLife(text) };
    }
  },

  // a dark strip sliding down from the top of the field window (screen coordinates); the eagle stays in view
  renderCard(ctx) {
    const c = this.card;
    if (!c) return;
    const h = 12, rise = Math.min(1, c.t / 8, (c.life - c.t) / 8), y = Math.round(h * rise) - h + 2;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.8)';
    ctx.fillRect(0, y - 2, VIEW_W, h + 2);
    ctx.beginPath();
    ctx.rect(4, y - 2, VIEW_W - 8, h + 2);
    ctx.clip();
    const w = c.text.length * 8, over = w - (VIEW_W - 12);
    const x = over <= 0 ? Math.round((VIEW_W - w) / 2) : 6 - Math.round(Math.min(over, Math.max(0, c.t - CARD_LEAD) * CARD_SPEED));
    // "NEW:" in gold, the rest in white
    Font.draw(ctx, 'NEW:', x, y, COL.gold);
    Font.draw(ctx, c.text.slice(4), x + 32, y, COL.white);
    ctx.restore();
  },
});
