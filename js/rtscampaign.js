'use strict';
// =====================================================================
//  DESERT DOMINION: the campaign front end (the battles are rts.js; the maps rtsmaps.js)
//    - Game.rtsMenu(): CAMPAIGN / SKIRMISH (Game.rtsSkirmishSetup, CORE's) / CONTINUE / BACK
//    - the intro (KHARRA, GLIMMER, the REGENT's decree, three Houses), skippable
//    - choose your House: AQUILA, DRAKON or SERPENS, each introduced by its advisor (COUNSELLOR MIREN, OVERSEER
//      KASK, FACTOR VELL: big procedural pixel portraits that blink and talk)
//    - nine missions a House: the briefing (the advisor, the text typed out, the objective), the battle through
//      Game.rtsStartMission(opts), Game.rtsMissionOver(result) -> victory / defeat, the SCORE screen (score, time,
//      glimmer, units and buildings destroyed by you and by the enemy, a RANK from a ladder of twelve), then the
//      REGION MAP of KHARRA: the region you took changes colour, the rival Houses move, and you pick the next of
//      2-3 regions (whose owner is the House you'll fight). Lose: try again (or pick another region).
//    - mission 8 sets two Houses on you at once; mission 9 is the REGENT's palace with his PRAETORIANS and both
//      rivals. AQUILA fights alongside the NOMADS from mission 7 on.
//    - the ending (a short epilogue for each House) and the credits.
//  Progress is saved (STORE 'tank1990_rts') after every step: CONTINUE picks it up.
//  Until the engine is in (Game.rtsStartMission missing), a stand-in battle screen returns a result on a key.
// =====================================================================

const RTS_C_KEY = 'tank1990_rts';
const RTS_C_PALS = { aquila: ['#78B8F8', '#3C78F8', '#1838A0'], drakon: ['#F87858', '#D82800', '#801000'], serpens: ['#88E888', '#38B838', '#186818'],
  regent: ['#C8A0F8', '#9858D8', '#582888'], nomad: ['#E8C898', '#C89858', '#806030'] };
const rtsCPal = h => (typeof RTS_HOUSE_PAL !== 'undefined' && RTS_HOUSE_PAL && RTS_HOUSE_PAL[h]) || RTS_C_PALS[h] || RTS_C_PALS.nomad;
const RTS_C_ORDER = ['aquila', 'drakon', 'serpens'];
const RTS_C_HOUSES = {
  aquila: { name: 'AQUILA', advisor: 'COUNSELLOR MIREN', adv: 'miren', theme: 'rtsAquila', tag: 'THE NOBLE', sym: 'eagle',
    desc: ['HONOUR, DISCIPLINE, LOYALTY.', 'SONIC TANKS, GUNWINGS AND', 'THE NOMADS OF THE DEEP SAND.'],
    intro: 'HOUSE AQUILA, THE EAGLE OF THE NORTHERN WORLDS. WE ARE OLD, WE ARE PROUD, AND WE KEEP OUR WORD. OUR SOLDIERS FIGHT FOR EACH OTHER, NOT FOR PAY. ON KHARRA YOU WILL COMMAND SONIC TANKS AND GUNWINGS, AND THE NOMADS OF THE DEEP DESERT WILL CALL YOU FRIEND. WILL YOU LEAD US, COMMANDER?',
    win: 'WELL DONE, COMMANDER. {REGION} IS OURS, AND IT WAS WON WITH HONOUR. REST NOW. TOMORROW WE MARCH AGAIN.',
    lose: 'WE HAVE LOST {REGION}, COMMANDER. THERE IS NO SHAME IN A HARD FIGHT. GATHER YOUR STRENGTH, AND WE WILL TRY AGAIN.' },
  drakon: { name: 'DRAKON', advisor: 'OVERSEER KASK', adv: 'kask', theme: 'rtsDrakon', tag: 'THE CRUEL', sym: 'ram',
    desc: ['ARMOUR, ROCKETS AND FIRE.', 'JUGGERNAUTS, CHEAP TROOPERS', 'AND THE DOOMFIST MISSILE.'],
    intro: 'HOUSE DRAKON. WE DON\'T DO SPEECHES. WE DO ARMOUR, ROCKETS AND FIRE. THE OTHER HOUSES TALK ABOUT HONOUR AND PROFIT WHILE WE TAKE THEIR SAND. YOU GET THE BIGGEST GUNS ON KHARRA: THE JUGGERNAUT, THE DOOMFIST, AND TROOPERS BY THE TRUCKLOAD. YOU WANT IN, OR ARE YOU WASTING MY TIME?',
    win: 'NOT BAD. YOU ONLY WASTED HALF MY TANKS. {REGION} IS OURS NOW. DON\'T LET IT GO TO YOUR HEAD.',
    lose: 'YOU LOST {REGION}. TO {FOE}. I\'M WRITING THAT IN YOUR FILE, IN RED. NOW GET BACK OUT THERE.' },
  serpens: { name: 'SERPENS', advisor: 'FACTOR VELL', adv: 'vell', theme: 'rtsSerpens', tag: 'THE CUNNING', sym: 'serpent',
    desc: ['TRADE, SPEED AND TRICKERY.', 'RAIDERS, SABOTEURS AND THE', 'CONVERTER THAT STEALS TANKS.'],
    intro: 'HOUSE SERPENS WELCOMES YOU. WE ARE TRADERS, AND EVERYTHING HAS A PRICE - EVEN A PLANET. OUR RAIDERS ARE THE FASTEST ON KHARRA, OUR SABOTEURS THE QUIETEST, AND OUR CONVERTER TURNS AN ENEMY\'S TANKS INTO OUR OWN. SHALL WE SIGN THE CONTRACT, COMMANDER?',
    win: 'SPLENDID. {REGION} IS ON OUR BOOKS NOW. I SHALL MAKE A NOTE OF YOUR... EFFICIENCY.',
    lose: 'A LOSS IN {REGION}. HOW VERY... EXPENSIVE. LET US NOT MAKE A HABIT OF IT, COMMANDER.' },
};
const RTS_C_NAMES = { aquila: 'AQUILA', drakon: 'DRAKON', serpens: 'SERPENS', regent: 'THE REGENT', nomad: 'NOMADS' };
const rtsCRivals = h => RTS_C_ORDER.filter(k => k !== h);

// the objective of each mission level
const RTS_C_HARVEST = [1000, 2700];
function rtsCObjective(level, foes) {
  if (level <= 2) return 'HARVEST ' + RTS_C_HARVEST[level - 1] + ' CREDITS OF GLIMMER';
  if (level === 9) return 'CRUSH THE REGENT AND HIS ALLIES';
  if (level === 8) return 'DESTROY ' + RTS_C_NAMES[foes[0]] + ' AND ' + RTS_C_NAMES[foes[1]];
  return 'DESTROY THE ' + RTS_C_NAMES[foes[0]] + ' BASE';
}

// the briefings, in each advisor's voice: {REGION}, {FOE}, {FOE2} filled in
const RTS_C_BRIEF = {
  aquila: [
    'WELCOME TO KHARRA, COMMANDER. I AM MIREN, AND I HAVE SERVED HOUSE AQUILA FOR FORTY YEARS. THE REGENT\'S CONTEST BEGINS HERE, IN {REGION}. BUILD A REFINERY ON THE ROCK AND SEND YOUR HARVESTER INTO THE GLIMMER FIELDS. GATHER 1000 CREDITS. LAY CONCRETE BEFORE YOU BUILD, AND LISTEN FOR THE WYRMS: THEY HEAR EVERY FOOTSTEP ON THE OPEN SAND.',
    'YOU HAVE MADE A GOOD BEGINNING. {REGION} IS RICHER, AND HOUSE {FOE} KNOWS IT: THEIR SCOUTS ARE ALREADY PROBING OUR LINES. RAISE A BARRACKS, BUILD SILOS FOR WHAT THE REFINERY CANNOT HOLD, AND HARVEST 2700 CREDITS. DEFEND WHAT IS OURS, COMMANDER, BUT DO NOT GO LOOKING FOR A FIGHT. NOT YET.',
    'HOUSE {FOE} HAS RAISED AN OUTPOST IN {REGION}, ON LAND THE REGENT GRANTED TO NO ONE. THEY WILL NOT LEAVE BECAUSE WE ASK. YOU MAY NOW RAISE A HEAVY FACTORY, AND WITH IT BUILD THE COMBAT TANK. FIND THEIR OUTPOST AND DESTROY IT. FIGHT CLEANLY: WE TAKE NO PLEASURE IN THIS, ONLY THE GROUND WE NEED.',
    '{FOE} HAS ANSWERED OUR VICTORY WITH A FORTIFIED BASE IN {REGION}. THEY HAVE TURRETS NOW, AND WALLS. WALLS CAN BE CLIMBED, COMMANDER, AND TURRETS CAN BE OUTFLANKED. OUR MISSILE TANKS NOW REACH OVER ANY WALL, AND A REPAIR PAD WILL KEEP YOUR ARMOUR IN THE FIELD. STRIKE THEIR BASE FROM THE SIDE THEY DO NOT WATCH, AND DESTROY EVERY BUILDING.',
    'UPGRADE YOUR HEAVY FACTORY, COMMANDER: THE SIEGE TANK IS OURS NOW, AND THE STARPORT WILL SELL US WHAT WE CANNOT BUILD. GOOD - YOU WILL NEED BOTH. {FOE} HOLDS {REGION} WITH ARMOUR OF ITS OWN. TAKE THE REGION, DESTROY THEIR BASE, AND SPARE THOSE WHO SURRENDER.',
    'OUR SPIES SAY THE REGENT HAS BEEN SELLING WEAPONS TO HOUSE {FOE}. I HOPE THEY ARE WRONG. EITHER WAY, {FOE} STANDS BETWEEN US AND THE HEART OF KHARRA, IN {REGION}. THE HIGH-TECH FACTORY CAN NOW BUILD GUNWINGS TO GUARD YOUR HARVESTERS, AND A RESEARCH LAB IS WITHIN OUR REACH. DESTROY THE {FOE} BASE.',
    'THE NOMADS OF THE DEEP DESERT HAVE COME TO US. THEY HAVE NO LOVE FOR {FOE}, WHO HUNTS THEM FOR SPORT, AND THEY WILL FIGHT AT YOUR SIDE IN {REGION}. HONOUR THEM, COMMANDER - THEY KNOW THE SAND AS NO ONE ELSE. WITH YOUR RESEARCH LAB, THE SONIC TANK IS OURS. DESTROY THE {FOE} FORTRESS.',
    'IT IS AS I FEARED. THE REGENT HAS ARMED BOTH {FOE} AND {FOE2} AND SET THEM ON US TOGETHER. HE WANTS NO WINNER, ONLY OBEDIENT HOUSES. IN {REGION} YOU WILL FACE BOTH AT ONCE. BUILD YOUR PALACE, AND THE NOMADS WILL ANSWER ITS CALL. DESTROY BOTH BASES, AND THE REGENT WILL HAVE NO ONE LEFT TO HIDE BEHIND.',
    'THIS IS THE LAST DAY OF THE CONTEST. THE REGENT WAITS IN {REGION} BEHIND HIS PRAETORIANS, AND WHAT IS LEFT OF {FOE} AND {FOE2} STANDS WITH HIM. HE BROKE HIS OWN DECREE. WE WILL NOT BREAK OURS. DESTROY HIS PALACE AND EVERY BASE ON THE MAP, AND KHARRA WILL BE RULED WITH HONOUR. IT HAS BEEN AN HONOUR TO SERVE WITH YOU, COMMANDER.',
  ],
  drakon: [
    'SO YOU\'RE THE NEW MEAT. I\'M KASK. I RUN THINGS FOR HOUSE DRAKON, AND I HATE WASTE. THIS DUST HEAP IS {REGION}. BUILD A REFINERY, DIG UP 1000 CREDITS OF GLIMMER, AND DON\'T FEED YOUR HARVESTER TO A WYRM. FAIL ME, AND I\'LL FIND OUT HOW MUCH GLIMMER YOU\'RE WORTH. BY WEIGHT.',
    '1000 CREDITS. A CHILD COULD DO IT, AND I\'VE HAD CHILDREN DO IT. NOW BRING ME 2700 FROM {REGION}. {FOE} VERMIN ARE CRAWLING ROUND THE FIELDS - BUILD A BARRACKS AND SHOOT ANYTHING THAT ISN\'T RED. SILOS ARE CHEAP. COMMANDERS ARE CHEAPER.',
    '{FOE} BUILT AN OUTPOST IN {REGION}. ON OUR SAND. I WANT IT FLAT, I WANT IT BURNING, AND I WANT THE SURVIVORS... NO. ON SECOND THOUGHT, I DON\'T WANT SURVIVORS. BUILD A HEAVY FACTORY. TANKS, COMMANDER. REAL WEAPONS AT LAST. GO AND HAVE FUN.',
    'THOSE {FOE} WORMS HAVE BUILT WALLS IN {REGION}. WALLS! AS IF THAT WILL HELP. TROOPERS COME CHEAP FOR US - BUILD A TROOPER HALL AND SEND THEM IN BY THE HUNDRED. ROCKETS SOLVE MOST PROBLEMS. MORE ROCKETS - MISSILE TANKS, NOW - SOLVE THE REST. DESTROY EVERY BUILDING THEY HAVE.',
    'SIEGE TANKS, COMMANDER. TWO BARRELS, NO MANNERS. AND THE STARPORT SELLS ANYTHING WE CAN\'T BUILD FAST ENOUGH. {FOE} HAS DUG INTO {REGION} AND THINKS IT\'S SAFE. SHOW THEM HOW WRONG THEY ARE. ROLL OVER THEIR INFANTRY, SHELL THEIR REFINERY, AND BRING ME BACK SOMETHING SHINY FROM THE WRECKAGE.',
    'THE REGENT SENT ME A LETTER. HE SAYS WE\'RE EXCESSIVE. I\'VE HAD IT FRAMED. MEANWHILE {FOE} SQUATS IN {REGION} WITH A HIGH-TECH FACTORY AND DELUSIONS. WE DON\'T FLY GUNWINGS - REAL SOLDIERS DON\'T NEED WINGS - BUT MISSILE TANKS REACH THE SKY JUST FINE. WIPE THEM OUT.',
    '{REGION}. THE {FOE} FORTRESS. TURRETS, WALLS, ROCKETS, AND A COMMANDER WHO THINKS HE\'S CLEVER. THE RESEARCH LAB HAS BUILT ME A PRESENT: THE JUGGERNAUT. TWIN PLASMA CANNONS, AND WHEN IT DIES IT TAKES EVERYTHING NEAR IT ALONG. I LIKE IT. YOU\'LL LIKE IT. THEY WON\'T.',
    'WELL, WELL. THE REGENT HAS BEEN SLIPPING WEAPONS TO {FOE} AND {FOE2} BOTH, AND NOW THEY COME FOR US TOGETHER IN {REGION}. TWO HOUSES. HOW FLATTERING. BUILD THE PALACE AND I\'LL GIVE YOU THE DOOMFIST: A MISSILE THE SIZE OF A HOUSE. IT CAN\'T AIM. IT DOESN\'T NEED TO.',
    'THE REGENT HAS LOCKED HIMSELF IN {REGION} WITH HIS PRETTY PRAETORIANS AND THE LEFTOVERS OF {FOE} AND {FOE2}. HE PLAYED US ALL. NOW HE PAYS. BURN THE PALACE, BREAK THE PRAETORIANS, AND BRING ME HIS CROWN. I\'LL WEAR IT. IT\'LL SUIT ME BETTER.',
  ],
  serpens: [
    'AH, THE NEW COMMANDER. DELIGHTED. I AM FACTOR VELL, AND HOUSE SERPENS IS, ABOVE ALL, A BUSINESS. KHARRA IS A MARKET AND GLIMMER ITS CURRENCY. OUR FIRST INVESTMENT IS {REGION}. BUILD A REFINERY AND RETURN 1000 CREDITS. DO MIND THE WYRMS, COMMANDER. THEY EAT PROFITS.',
    'A MODEST RETURN, BUT PROMISING. {REGION} SHOULD YIELD 2700 CREDITS, IF {FOE} CAN BE PERSUADED NOT TO INTERFERE. THEY WILL NOT BE PERSUADED, OF COURSE. BUILD A BARRACKS, KEEP YOUR SILOS FULL AND YOUR HARVESTERS BUSY. TIME IS MONEY, COMMANDER. QUITE LITERALLY.',
    '{FOE} HAS OPENED AN OUTPOST IN {REGION}. COMPETITION IS HEALTHY - FOR US, WHEN IT ENDS. A HEAVY FACTORY IS NOW WITHIN OUR BUDGET, AND THE COMBAT TANK WITH IT. EXPENSIVE, BUT SOME ARGUMENTS ARE BEST MADE IN ARMOUR. CLOSE THEIR OUTPOST. PERMANENTLY.',
    'THE {FOE} BASE IN {REGION} HAS TURRETS AND WALLS. A WALL IS ONLY A COST THAT SOMEONE ELSE HAS PAID. STRIKE THEIR HARVESTERS FIRST: A BASE WITHOUT INCOME IS A BASE WITHOUT A FUTURE. A REPAIR PAD COSTS LESS THAN A NEW TANK - DO REMEMBER THAT. THEN DESTROY EVERY BUILDING, AND WE SHALL DISCUSS YOUR BONUS.',
    'THE STARPORT IS OPEN FOR BUSINESS: OFF-WORLD TANKS, AT PRICES THAT CHANGE BY THE HOUR. BUY LOW, COMMANDER. {FOE} HAS INVESTED HEAVILY IN {REGION}. LET US LIQUIDATE THAT INVESTMENT. SIEGE TANKS MAKE EXCELLENT AUDITORS. DESTROY THEIR BASE.',
    'A LITTLE BIRD TELLS ME THE REGENT IS SELLING ARMS TO {FOE}. HOW... ENTERPRISING. I SHALL REMEMBER IT. FOR NOW {FOE} HOLDS {REGION}, AND OUR HIGH-TECH FACTORY CAN BUILD GUNWINGS TO RAIN ON THEIR PARADE. DESTROY THEIR BASE, AND DO TRY TO SPARE THE REFINERY. ONE HATES WASTE.',
    'THE RESEARCH LAB HAS DELIVERED SOMETHING EXQUISITE: THE CONVERTER. ITS GAS PERSUADES ENEMY VEHICLES TO WORK FOR US, FOR A WHILE. HOSTILE TAKEOVERS ARE OUR SPECIALITY. USE IT ON THE {FOE} FORTRESS IN {REGION}. DESTROY THEM, AND KEEP THE RECEIPTS.',
    'OUR DEAR REGENT HAS SOLD WEAPONS TO {FOE} AND {FOE2} BOTH, AND SENT THEM AGAINST US AS PARTNERS. A MERGER. HOW TOUCHING. IN {REGION} YOU WILL FACE THEM BOTH. BUILD YOUR PALACE: OUR SABOTEURS ARE NEVER SEEN UNTIL THE BILL ARRIVES. DESTROY BOTH BASES.',
    'THE REGENT HAS BROKEN HIS CONTRACT, AND IN BUSINESS THAT HAS ONLY ONE REMEDY. HE HIDES IN {REGION} WITH HIS PRAETORIANS AND THE REMAINS OF {FOE} AND {FOE2}. DESTROY THE PALACE, DESTROY THEM ALL, AND KHARRA WILL BE UNDER NEW MANAGEMENT. OURS, COMMANDER. OURS.',
  ],
};
const RTS_C_EPILOGUE = {
  aquila: 'THE REGENT\'S PALACE HAS FALLEN, AND HOUSE AQUILA RULES KHARRA - NOT BY CRUELTY, BUT BY RIGHT. THE GLIMMER FLOWS TO EVERY WORLD THAT TRADES IN GOOD FAITH, AND THE NOMADS KEEP THEIR DEEP SANDS FOREVER. IN THE EAGLE\'S HALL, COUNSELLOR MIREN LIGHTS A SINGLE LAMP, CLOSES HIS MAPS, AND FOR THE FIRST TIME IN FORTY YEARS SLEEPS THROUGH THE NIGHT.',
  drakon: 'THE REGENT KNELT. THEN THE PALACE BURNED. KHARRA BELONGS TO HOUSE DRAKON NOW - EVERY DUNE, EVERY FIELD, EVERY GRAIN OF GLIMMER. THE FACTORIES NEVER SLEEP AND THE FURNACES NEVER COOL. OVERSEER KASK SITS ON A NEW THRONE, WELDED FROM THE OLD ONE AND A FEW PRAETORIAN HELMETS, AND FOR ONCE HE IS ALMOST SMILING.',
  serpens: 'EVERY EMPIRE HAS ITS PRICE, AND HOUSE SERPENS HAS PAID THIS ONE IN FULL. THE REGENT\'S PALACE IS A COUNTING HOUSE NOW. THE GLIMMER FLOWS, THE CREDITS FLOW, AND ALL OF KHARRA SIGNS ITS CONTRACTS IN GREEN INK. BEHIND HIS GOLDEN MASK, FACTOR VELL ALLOWS HIMSELF ONE SMALL, EXPENSIVE SMILE.',
};
const RTS_C_RANKS = [
  ['DUST MITE', 0], ['SAND HOPPER', 500], ['DUNE RUNNER', 1200], ['GLIMMER SCOUT', 2200], ['RIDGE TROOPER', 3500], ['SQUAD CAPTAIN', 5000],
  ['OUTPOST WARDEN', 7000], ['BASE MARSHAL', 9500], ['WAR CHIEF', 12500], ['HIGH WARLORD', 16000], ['LORD OF THE SANDS', 21000], ['MASTER OF KHARRA', 28000],
];
const rtsCRank = total => { let r = 0; RTS_C_RANKS.forEach(([, min], i) => { if (total >= min) r = i; }); return r; };

// ------------------------------------------------------------------ the regions of KHARRA
// 27 regions; x, y: the region's heart on the map (0..1); style: the battlefield's kind (rtsMapGen)
const RTS_C_REGIONS = [
  ['THE GLASS FLATS', 0.06, 0.1, 'open'], ['CINDER REACH', 0.2, 0.09, 'canyons'], ['HOLLOW CROWN', 0.35, 0.12, 'basin'], ['THE RUST SEA', 0.5, 0.08, 'islands'],
  ['SALT GALLERY', 0.65, 0.12, 'open'], ['EMBER GATE', 0.8, 0.09, 'canyons'], ['NORTHWIND SCAR', 0.94, 0.11, 'islands'],
  ['VULTURE RIDGE', 0.14, 0.31, 'canyons'], ['BONEWATER', 0.31, 0.3, 'islands'], ['THE THRONE STEPS', 0.5, 0.29, 'canyons'], ['MIRAGE BASIN', 0.69, 0.3, 'basin'],
  ['IRONWIND', 0.86, 0.31, 'open'],
  ['EAGLE\'S REST', 0.06, 0.52, 'open'], ['DUSKMARCH', 0.27, 0.5, 'open'], ['THE REGENT\'S SEAT', 0.5, 0.51, 'basin'], ['SCORPION WELLS', 0.73, 0.5, 'islands'],
  ['FURNACE HOLD', 0.94, 0.52, 'canyons'],
  ['SHATTERED PLAIN', 0.15, 0.71, 'islands'], ['WHISPERING DEEP', 0.32, 0.7, 'basin'], ['OLD WYRM ROAD', 0.5, 0.72, 'open'], ['COPPER DUNES', 0.68, 0.71, 'canyons'],
  ['GLIMMERFALL', 0.85, 0.7, 'basin'],
  ['RED VEIL', 0.08, 0.9, 'canyons'], ['SUNKEN MARKET', 0.28, 0.91, 'open'], ['COIL OASIS', 0.5, 0.9, 'islands'], ['ASHEN STAIR', 0.72, 0.91, 'basin'],
  ['THE LONG SILENCE', 0.92, 0.9, 'open'],
].map(([name, x, y, style], i) => ({ i, name, x, y, style }));
const RTS_C_HOME = { aquila: 12, drakon: 16, serpens: 24 };
const RTS_C_REGENT_LAND = [14, 9];

// ------------------------------------------------------------------ little drawing helpers
const RTS_C_BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + 0.5) / 16);
const rtsCB = (x, y) => RTS_C_BAYER[(y & 3) * 4 + (x & 3)];
// a colour from a ramp (dark -> light) for a level 0..1, ordered-dithered between its steps
function rtsCRamp(ramp, v, x, y) {
  const n = ramp.length - 1, f = Math.max(0, Math.min(1, v)) * n, i = Math.floor(f);
  return ramp[Math.min(n, i + (f - i > rtsCB(x, y) ? 1 : 0))];
}
const rtsCHash = (a, b, s) => rtsMapHash(a, b, s || 0);
function rtsCWrap(s, n) {
  const out = [];
  let cur = '';
  for (const w of String(s).split(' ')) { if (cur && (cur + ' ' + w).length > n) { out.push(cur); cur = w; } else cur = cur ? cur + ' ' + w : w; }
  if (cur) out.push(cur);
  return out;
}
const rtsCFill = (s, v) => String(s).replace(/\{(\w+)\}/g, (_, k) => (v[k] !== undefined ? v[k] : ''));
function rtsCBox(ctx, x, y, w, h, fill, edge) {
  ctx.fillStyle = fill; ctx.fillRect(x, y, w, h);
  if (edge) { ctx.fillStyle = edge; ctx.fillRect(x, y, w, 1); ctx.fillRect(x, y + h - 1, w, 1); ctx.fillRect(x, y, 1, h); ctx.fillRect(x + w - 1, y, 1, h); }
}
// a frame with a bevel in a House's colours
function rtsCFrame(ctx, x, y, w, h, pal) {
  ctx.fillStyle = '#000000'; ctx.fillRect(x - 3, y - 3, w + 6, h + 6);
  ctx.fillStyle = pal[2]; ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
  ctx.fillStyle = pal[0]; ctx.fillRect(x - 2, y - 2, w + 4, 1); ctx.fillRect(x - 2, y - 2, 1, h + 4);
  ctx.fillStyle = '#000000'; ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
  for (const [cx, cy] of [[x - 3, y - 3], [x + w, y - 3], [x - 3, y + h], [x + w, y + h]]) { ctx.fillStyle = '#F0BC3C'; ctx.fillRect(cx, cy, 3, 3); }
}

// a pixel painter: a w x h grid of colours, shapes shaded by a light from the top left, then a canvas with an outline
function rtsCPaint(w, h) {
  const px = new Array(w * h).fill(null);
  const P = {
    w, h, px,
    set(x, y, c) { x = Math.round(x); y = Math.round(y); if (c && x >= 0 && y >= 0 && x < w && y < h) px[y * w + x] = c; },
    get(x, y) { return x >= 0 && y >= 0 && x < w && y < h ? px[y * w + x] : null; },
    rect(x, y, rw, rh, c) { for (let j = 0; j < rh; j++) for (let i = 0; i < rw; i++) P.set(x + i, y + j, typeof c === 'function' ? c(x + i, y + j) : c); },
    // fn(x, y, nx, ny, nz) -> colour, for every pixel inside the ellipse
    ell(cx, cy, rx, ry, fn) {
      for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const nx = (x + 0.5 - cx) / rx, ny = (y + 0.5 - cy) / ry, r2 = nx * nx + ny * ny;
        if (r2 <= 1) P.set(x, y, typeof fn === 'function' ? fn(x, y, nx, ny, Math.sqrt(1 - r2)) : fn);
      }
    },
    // a lit ball: ramp dark -> light; bias lifts or drops it; clip(x, y) -> false skips a pixel
    ball(cx, cy, rx, ry, ramp, bias = 0, clip) {
      P.ell(cx, cy, rx, ry, (x, y, nx, ny, nz) => (clip && !clip(x, y) ? null : rtsCRamp(ramp, 0.12 + 0.88 * Math.max(0, -0.42 * nx - 0.5 * ny + 0.76 * nz) + bias, x, y)));
    },
    line(x0, y0, x1, y1, c, wd = 1) {
      const n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 1.5));
      for (let k = 0; k <= n; k++) {
        const x = x0 + (x1 - x0) * k / n, y = y0 + (y1 - y0) * k / n;
        if (wd <= 1) P.set(x, y, c); else P.ell(x, y, wd / 2, wd / 2, c);
      }
    },
    // a filled polygon; c a colour or fn(x, y)
    poly(pts, c) {
      let y0 = 1e9, y1 = -1e9, x0 = 1e9, x1 = -1e9;
      for (const [x, y] of pts) { y0 = Math.min(y0, y); y1 = Math.max(y1, y); x0 = Math.min(x0, x); x1 = Math.max(x1, x); }
      for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) for (let x = Math.floor(x0); x <= Math.ceil(x1); x++) {
        let ins = false;
        for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
          const [xi, yi] = pts[i], [xj, yj] = pts[j];
          if ((yi > y + 0.5) !== (yj > y + 0.5) && x + 0.5 < (xj - xi) * (y + 0.5 - yi) / (yj - yi) + xi) ins = !ins;
        }
        if (ins) P.set(x, y, typeof c === 'function' ? c(x, y) : c);
      }
    },
    canvas(outline = '#000000') {
      const c = makeCanvas(w, h), g = c.getContext('2d'), img = g.createImageData(w, h), d = img.data;
      const put = (i, col) => { const v = parseInt(col.slice(1), 16); d[i * 4] = v >> 16; d[i * 4 + 1] = (v >> 8) & 255; d[i * 4 + 2] = v & 255; d[i * 4 + 3] = 255; };
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (px[i]) { put(i, px[i]); continue; }
        if (outline && ((x > 0 && px[i - 1]) || (x < w - 1 && px[i + 1]) || (y > 0 && px[i - w]) || (y < h - 1 && px[i + w]))) put(i, outline);
      }
      g.putImageData(img, 0, 0);
      return c;
    },
  };
  return P;
}

// ------------------------------------------------------------------ the House crests
const RTS_C_CREST = {};
function rtsCCrest(sym, S, house) {
  const k = sym + S + (house || '');
  if (RTS_C_CREST[k]) return RTS_C_CREST[k];
  const pal = rtsCPal(house || { eagle: 'aquila', ram: 'drakon', serpent: 'serpens', crown: 'regent', sun: 'nomad' }[sym]);
  const P = rtsCPaint(S, S), u = S / 48, cx = S / 2;
  const GOLD = ['#5C3C00', '#A87818', '#F0C048', '#FCE8A0'], BONE = ['#504030', '#988870', '#D8C8A8', '#F8F0E0'];
  const field = [pal[2], pal[2], pal[1]], light = [pal[1], pal[0], '#F8F8F8'];
  // the shield
  const shield = [[3 * u, 3 * u], [S - 3 * u, 3 * u], [S - 3 * u, S * 0.55], [cx, S - 2 * u], [3 * u, S * 0.55]];
  P.poly(shield, (x, y) => rtsCRamp(field, 1 - y / S * 0.9 + (x < cx ? 0.1 : 0), x, y));
  for (let k = 0; k < shield.length; k++) { const [a, b] = [shield[k], shield[(k + 1) % shield.length]]; P.line(a[0], a[1], b[0], b[1], GOLD[2], Math.max(1, 2 * u)); }
  P.line(4 * u, 4 * u, S - 4 * u, 4 * u, GOLD[3], Math.max(1, u));
  const stamp = (x, y, r, ramp, b = 0) => P.ball(x, y, Math.max(0.6, r), Math.max(0.6, r), ramp, b);
  if (sym === 'eagle') {
    // a heraldic eagle, wings raised and spread, the head turned to the side
    const wing = [[21, 21], [15, 13], [7, 7], [4, 10], [6, 14], [4, 17], [8, 19], [6, 23], [11, 24], [10, 28], [15, 27], [16, 31], [21, 29]];
    const WL = [pal[2], pal[1], pal[0], '#F8F8F8'];
    for (const s of [-1, 1]) {
      P.poly(wing.map(([x, y]) => [cx + s * (24 - x) * u, y * u]), (x, y) => rtsCRamp(WL, 0.95 - (y / u - 7) / 30 - (s > 0 ? 0.12 : 0), x, y));
      for (let f = 0; f < 4; f++) P.line(cx + s * 4 * u, (21 + f) * u, cx + s * (16 - f * 1.5) * u, (11 + f * 4.5) * u, pal[2]);
    }
    P.poly([[cx - 4 * u, 33 * u], [cx + 4 * u, 33 * u], [cx + 7 * u, 42 * u], [cx, 39 * u], [cx - 7 * u, 42 * u]], (x, y) => rtsCRamp(WL, 0.8 - (y / u - 33) / 14, x, y));
    P.ball(cx, 26 * u, 5 * u, 9 * u, WL);
    for (let y = 22; y < 34; y += 3) for (let x = -3; x <= 3; x += 3) P.set(cx + (x + (y % 2)) * u, y * u, pal[1]);
    P.ball(cx, 14 * u, 3.8 * u, 4 * u, ['#B0B0B8', '#E0E0E8', '#FFFFFF']);
    P.poly([[cx + 2 * u, 12.5 * u], [cx + 7 * u, 14 * u], [cx + 5 * u, 17 * u], [cx + 3 * u, 16 * u]], (x, y) => rtsCRamp(GOLD, 0.9 - (y / u - 12) / 6, x, y));
    P.set(cx + 1 * u, 13 * u, '#000000');
    for (const s of [-1, 1]) { P.line(cx + s * 2 * u, 34 * u, cx + s * 4 * u, 37 * u, GOLD[2], Math.max(1, u)); P.line(cx + s * 4 * u, 37 * u, cx + s * 6 * u, 37 * u, GOLD[2]); }
  } else if (sym === 'ram') {
    // horns curling out and down, the skull, dark eye sockets and nose
    for (const s of [-1, 1]) for (let k = 0; k <= 40; k++) {
      const a = -1.9 + k * 0.105, r = (9 - k * 0.12) * u, hx = cx + s * (8 * u + Math.cos(a) * r * 0.9 + 4 * u), hy = 18 * u + Math.sin(a) * r;
      stamp(hx, hy, (3.6 - k * 0.06) * u, BONE, -0.05 + (k % 6 < 2 ? -0.18 : 0));
    }
    P.ball(cx, 21 * u, 9.5 * u, 9 * u, BONE);
    P.poly([[cx - 7 * u, 24 * u], [cx + 7 * u, 24 * u], [cx + 4 * u, 38 * u], [cx - 4 * u, 38 * u]], (x, y) => rtsCRamp(BONE, 0.85 - (y / S) * 0.6 - (x > cx ? 0.15 : 0), x, y));
    for (const s of [-1, 1]) P.ball(cx + s * 4 * u, 22 * u, 2.6 * u, 2.2 * u, ['#000000', '#200000']);
    for (const s of [-1, 1]) P.set(cx + s * 4 * u, 22 * u, '#F83800');
    P.poly([[cx - 1.5 * u, 29 * u], [cx + 1.5 * u, 29 * u], [cx, 32 * u]], '#000000');
    for (let x = -3; x <= 3; x += 2) P.line(cx + x * u, 35 * u, cx + x * u, 37 * u, '#504030');
  } else if (sym === 'serpent') {
    // a coil from the middle outwards, then the neck rising to the head, eye and forked tongue
    const pts = [];
    for (let k = 0; k <= 64; k++) { const th = 0.6 + k * 0.17, r = (1.2 + th * 1.3) * u; pts.push([cx - 1 * u + Math.cos(th) * r, 29 * u + Math.sin(th) * r * 0.78]); }
    const [ex, ey] = pts[pts.length - 1];
    for (let k = 0; k <= 12; k++) pts.push([ex + (cx + 2 * u - ex) * k / 12, ey + (14 * u - ey) * k / 12 - Math.sin(k / 12 * Math.PI) * 3 * u]);
    pts.forEach(([x, y], k) => stamp(x, y, Math.min(3.4, 1 + k * 0.04) * u, light, k % 5 === 0 ? -0.25 : 0));
    P.ball(cx + 3 * u, 12 * u, 5 * u, 3.6 * u, light);
    P.set(cx + 4 * u, 11 * u, '#F8D800'); P.set(cx + 5 * u, 11 * u, '#000000');
    P.line(cx + 8 * u, 13 * u, cx + 11 * u, 13 * u, '#F83800'); P.line(cx + 11 * u, 13 * u, cx + 12.5 * u, 11.5 * u, '#F83800'); P.line(cx + 11 * u, 13 * u, cx + 12.5 * u, 14.5 * u, '#F83800');
  } else if (sym === 'crown') {
    P.poly([[cx - 12 * u, 30 * u], [cx + 12 * u, 30 * u], [cx + 13 * u, 14 * u], [cx + 6 * u, 22 * u], [cx, 10 * u], [cx - 6 * u, 22 * u], [cx - 13 * u, 14 * u]], (x, y) => rtsCRamp(['#606070', '#A8A8B8', '#E0E0F0', '#FFFFFF'], 1 - y / S - (x > cx ? 0.2 : 0), x, y));
    P.rect(cx - 12 * u, 30 * u, 24 * u, 4 * u, (x, y) => rtsCRamp(GOLD, 0.7 - (x - cx) / S, x, y));
    for (const gx of [-13, 0, 13]) P.ball(cx + gx * u, (gx ? 14 : 10) * u, 2 * u, 2 * u, ['#401060', '#9858D8', '#E0C0F8']);
    P.ball(cx, 26 * u, 2.5 * u, 2.5 * u, ['#401060', '#C8A0F8', '#F8F0FF']);
    for (let k = 0; k < 9; k++) { const a = Math.PI * (0.15 + k * 0.0875); P.line(cx + Math.cos(a) * 6 * u, 37 * u + Math.sin(a) * 2 * u, cx + Math.cos(a) * 10 * u, 37 * u + Math.sin(a) * 5 * u, GOLD[2]); }
  } else {   // the NOMADS' sun over the dunes
    P.ball(cx, 20 * u, 7 * u, 7 * u, ['#A85000', '#F8A030', '#FCE8A0']);
    for (let k = 0; k < 12; k++) { const a = k * Math.PI / 6; P.line(cx + Math.cos(a) * 9 * u, 20 * u + Math.sin(a) * 9 * u, cx + Math.cos(a) * 12 * u, 20 * u + Math.sin(a) * 12 * u, '#F8C048', Math.max(1, u)); }
    for (const [dy, c] of [[31, BONE[2]], [36, BONE[1]]]) for (let x = 5 * u; x < S - 5 * u; x++) { const y = dy * u + Math.sin(x / S * 7 + dy) * 2 * u; P.rect(x, y, 1, S - y, c); }
    // inside the shield only
    const keep = rtsCPaint(S, S);
    keep.poly(shield, '#000000');
    for (let i = 0; i < S * S; i++) if (!keep.px[i]) P.px[i] = null;
    for (let k = 0; k < shield.length; k++) { const [a, b] = [shield[k], shield[(k + 1) % shield.length]]; P.line(a[0], a[1], b[0], b[1], GOLD[2], Math.max(1, 2 * u)); }
  }
  return (RTS_C_CREST[k] = P.canvas('#000000'));
}
const RTS_C_SYM = { aquila: 'eagle', drakon: 'ram', serpens: 'serpent', regent: 'crown', nomad: 'sun' };
const rtsCHouseCrest = (h, S) => rtsCCrest(RTS_C_SYM[h] || 'sun', S, h);

// ------------------------------------------------------------------ the advisors' portraits (96 x 112)
// rtsCPortrait(who, blink 0-2, mouth 0-2) -> a canvas (cached); the background is drawn under it each frame
// (rtsCPortraitBg) and a few live things over it (rtsCPortraitFx): the eye that glows, the gem that glints.
const RTS_C_PW = 96, RTS_C_PH = 112;
const RTS_C_PORT = {};
const RTS_C_GOLD = ['#4C3000', '#8C6410', '#C89828', '#F0C850', '#FCECA8'];
function rtsCPortrait(who, blink, mouth) {
  const key = who + blink + mouth;
  if (RTS_C_PORT[key]) return RTS_C_PORT[key];
  const P = rtsCPaint(RTS_C_PW, RTS_C_PH), H = rtsCHash;
  const eyeWhite = '#E8E0D8';
  // an eye: (cx, cy) its middle, iris colour; lid: the skin's colour for the lid; lash: the line over it
  const eye = (cx, cy, iris, lid, lash, narrow) => {
    if (blink === 2) { P.rect(cx - 3, cy - 1, 7, 2, lid); P.rect(cx - 3, cy, 7, 1, lash); return; }
    P.rect(cx - 3, cy - (narrow ? 0 : 1), 7, narrow ? 1 : 2, eyeWhite);
    P.rect(cx - 1, cy - (narrow ? 0 : 1), 2, narrow ? 1 : 2, iris);
    P.set(cx, cy, '#080808');
    if (!narrow) P.set(cx - 1, cy - 1, '#FFFFFF');
    if (blink === 1) P.rect(cx - 3, cy - 1, 7, 1, lid);
    P.rect(cx - 3, cy - (narrow ? 1 : 2), 7, 1, lash);
  };
  if (who === 'miren') {
    const skin = ['#4C2418', '#8C5038', '#B87850', '#DCA078', '#F4C8A0', '#FCE4C8'];
    const hair = ['#585868', '#8C8C9C', '#B8B8C4', '#DCDCE4', '#F8F8FC'];
    const robe = ['#080C30', '#101C64', '#1C3494', '#2C54C8', '#5C88F0'];
    P.ball(48, 60, 26, 32, hair, -0.15, (x, y) => y > 34);                      // long hair behind
    P.ball(48, 128, 52, 44, robe);                                             // the robe
    for (const s of [-1, 1]) {                                                 // the high collar
      P.poly([[48 + s * 26, 112], [48 + s * 18, 82], [48 + s * 10, 72], [48 + s * 9, 90], [48 + s * 12, 112]], (x, y) => rtsCRamp(robe, 0.55 + (s < 0 ? 0.25 : 0) - (y - 72) / 160, x, y));
      P.line(48 + s * 10, 72, 48 + s * 9, 92, RTS_C_GOLD[3]); P.line(48 + s * 9, 92, 48 + s * 12, 112, RTS_C_GOLD[2]);
    }
    for (let k = 0; k < 6; k++) P.line(20 + k * 3, 96 + k, 18 + k * 4, 112, robe[0]);   // folds
    P.ball(48, 72, 9, 14, skin, -0.25);                                         // neck
    P.ball(48, 44, 18.5, 24, skin);                                             // head
    P.ball(29.5, 46, 3, 6, skin, -0.1); P.ball(66.5, 46, 3, 6, skin, -0.25);   // ears
    P.ball(31, 44, 4.5, 12, hair, 0, (x, y) => y > 33); P.ball(65, 44, 4.5, 12, hair, -0.1, (x, y) => y > 33);
    P.ball(31, 58, 4, 10, hair); P.ball(65, 58, 4, 10, hair, -0.1);            // sideburns
    for (const y of [26, 29, 32]) for (let x = 39; x <= 57; x++) if (H(x, y, 3) > 0.3) P.set(x, y + Math.round(((x - 48) / 9) ** 2), skin[1]);   // forehead lines
    for (const s of [-1, 1]) {                                                 // bushy brows, kind and drooping outwards
      for (let k = 0; k <= 10; k++) { const x = 48 + s * (3 + k), y = 37 + (k > 6 ? (k - 6) * 0.5 : 0); P.rect(x, y - 1, 1, 2 + (k > 2 && k < 9 ? 1 : 0), k % 3 ? hair[3] : hair[4]); }
      P.set(48 + s * 14, 39, hair[2]); P.set(48 + s * 15, 40, hair[2]);
    }
    eye(40, 43, '#5878A0', skin[2], skin[1]); eye(56, 43, '#5878A0', skin[2], skin[1]);
    for (const s of [-1, 1]) {
      for (let x = 37; x <= 43; x += 2) P.set(s < 0 ? x : 96 - x, 46, skin[1]);   // tired bags under the eyes
      P.line(48 + s * 12, 42, 48 + s * 14, 41, skin[1]); P.line(48 + s * 12, 44, 48 + s * 14, 45, skin[1]);   // crow's feet
      P.line(48 + s * 4, 56, 48 + s * 8, 63, skin[1]);                          // the lines from nose to mouth
    }
    for (let y = 40; y <= 53; y++) { P.set(48, y, skin[4]); if (y > 44) P.set(51, y, y & 1 ? skin[1] : skin[2]); }
    P.ball(48, 55, 4, 3, skin, 0.05); P.set(45, 57, skin[0]); P.set(51, 57, skin[0]);
    // the mouth, then the moustache over it and the long beard below
    const m = '#3C1810';
    if (mouth === 0) { P.rect(44, 64, 9, 1, m); P.rect(45, 65, 7, 1, skin[3]); }
    else if (mouth === 1) { P.rect(44, 64, 9, 2, m); P.rect(45, 66, 7, 1, skin[3]); }
    else { P.rect(44, 63, 9, 4, m); P.rect(46, 63, 5, 1, '#E8E0D0'); P.rect(45, 67, 7, 1, skin[3]); }
    P.ball(48, 81, 17, 21, hair, 0, (x, y) => y >= 68 + (mouth === 2 ? 1 : 0) || ((x < 43 || x > 53) && y >= 57));
    P.ball(48, 98, 9, 8, hair, -0.05);
    for (let x = 33; x < 64; x += 3) for (let y = 68; y < 106; y++) if (hair.includes(P.get(x, y)) && H(x, y >> 2, 9) > 0.45) P.set(x, y, hair[1]);
    P.ball(43, 61, 6, 2.6, hair); P.ball(53, 61, 6, 2.6, hair, -0.05);
    P.line(38, 61, 37, 68, hair[2], 2); P.line(58, 61, 59, 68, hair[2], 2);
    // the eagle clasp
    P.ball(48, 108, 4, 3, RTS_C_GOLD); P.line(41, 106, 45, 108, RTS_C_GOLD[3]); P.line(55, 106, 51, 108, RTS_C_GOLD[3]);
  } else if (who === 'kask') {
    const skin = ['#2C1008', '#5C2410', '#8C4020', '#B86438', '#D88C5C', '#F0B488'];
    const iron = ['#0C0808', '#201818', '#382C2C', '#584848', '#887474', '#B8A8A8'];
    const red = ['#3C0800', '#7C1000', '#B82000', '#E84020', '#F88060'];
    const bone = ['#504030', '#988870', '#D8C8A8', '#F8F0E0'];
    P.ball(48, 124, 36, 32, iron);                                             // the breastplate
    for (const s of [-1, 1]) {                                                 // the spiked pauldrons
      const px = 48 + s * 33;
      P.poly([[px - 6, 86], [px + 6, 86], [px + s * 14, 62]], (x, y) => rtsCRamp(bone, 0.9 - (y - 62) / 40 - (s > 0 ? 0.2 : 0), x, y));
      P.poly([[px + s * 6, 90], [px + s * 16, 90], [px + s * 24, 74]], (x, y) => rtsCRamp(bone, 0.8 - (y - 74) / 30 - (s > 0 ? 0.2 : 0), x, y));
      P.ball(px, 98, 22, 17, red);
      P.ball(px, 101, 21, 15, iron, s > 0 ? -0.1 : 0);
      for (let k = -2; k <= 2; k++) P.ball(px + k * 7, 92 + Math.abs(k), 1.5, 1.5, iron.slice(3));
    }
    P.ball(48, 106, 6, 5, bone); P.ball(45.5, 106, 1.5, 1.5, '#000000'); P.ball(50.5, 106, 1.5, 1.5, '#000000');   // the ram skull
    for (const s of [-1, 1]) for (let k = 0; k < 10; k++) { const a = -2 + k * 0.4; P.ball(48 + s * (6 + Math.cos(a) * 4), 104 + Math.sin(a) * 4, 1.4, 1.4, bone); }
    P.ball(48, 74, 16, 16, skin, -0.22);                                        // the bull neck
    P.ball(48, 43, 21, 24, skin);                                               // the head, bald
    P.ball(48, 57, 20, 14, skin, -0.04);                                        // the jaw
    P.ball(26.5, 47, 3, 6, skin, -0.1); P.ball(69.5, 47, 3, 6, skin, -0.3);
    P.ball(26, 54, 1.6, 1.6, RTS_C_GOLD);                                        // an ear ring
    P.line(37, 22, 43, 29, '#C87060'); P.line(38, 22, 44, 29, '#803028');     // an old scalp scar
    for (let y = 54; y <= 72; y++) for (let x = 28; x <= 68; x++) {             // stubble
      const c = P.get(x, y);
      if (c && skin.includes(c) && H(x, y, 21) < 0.3) P.set(x, y, skin[1]);
    }
    P.ball(40, 37, 8, 3, skin, 0.12); P.ball(56, 37, 8, 3, skin, 0.05);         // the heavy brow
    P.line(32, 35, 45, 39, '#1C0804', 2); P.line(51, 39, 64, 35, '#1C0804', 2); // brows down in a scowl
    eye(40, 42, '#C88000', skin[2], skin[0], true);
    // the cybernetic plate over the right eye
    P.poly([[50, 36], [64, 34], [66, 47], [52, 49]], (x, y) => rtsCRamp(iron, 0.85 - (x - 50) / 30 - (y - 34) / 40, x, y));
    for (const [bx, by] of [[52, 38], [63, 36], [64, 45], [53, 47]]) P.set(bx, by, iron[5]);
    P.ball(57.5, 41.5, 3.2, 3.2, red);
    P.line(35, 29, 44, 55, '#E09088', 2); P.line(34, 30, 43, 56, '#903838');   // the scar over the good eye
    P.ball(48, 52, 5, 5, skin, 0.05); P.set(45, 55, skin[0]); P.set(51, 55, skin[0]); P.set(46, 56, skin[1]); P.set(50, 56, skin[1]);
    for (let y = 41; y <= 49; y++) P.set(47 + (y > 46 ? 1 : 0), y, skin[4]);
    // the sneer: the right side of the lip pulled up
    const D = '#200800';
    if (mouth === 0) { P.line(41, 63, 55, 61, D); P.line(42, 64, 54, 63, skin[3]); }
    else if (mouth === 1) { P.line(41, 63, 55, 61, D); P.rect(49, 62, 6, 1, D); P.rect(50, 61, 5, 1, '#E8E0C8'); P.line(42, 64, 54, 63, skin[3]); }
    else { P.poly([[40, 63], [56, 59], [56, 65], [42, 66]], D); P.rect(45, 61, 10, 1, '#E8E0C8'); P.set(52, 61, RTS_C_GOLD[3]); P.set(53, 61, RTS_C_GOLD[2]); P.line(42, 67, 54, 66, skin[3]); }
    P.line(55, 61, 57, 59, skin[1]);
    P.set(48, 68, skin[1]); P.set(48, 69, skin[1]);
  } else if (who === 'vell') {
    const skin = ['#2C1808', '#5C3818', '#8C5C34', '#B88456', '#D8A87C', '#F0CCA4'];
    const green = ['#041808', '#0C3410', '#185C20', '#2C8834', '#50B850', '#98E890'];
    const hood = ['#020C04', '#082008', '#103818', '#1C5424', '#307030', '#489048'];
    P.ball(48, 52, 34, 44, hood, -0.02);                                        // the hood
    P.ball(48, 126, 48, 40, green, -0.22);                                      // the silk robe, in folds
    for (let k = 0; k < 9; k++) { const fx = 12 + k * 9 + (k > 4 ? 4 : 0); P.line(fx, 96 + Math.abs(k - 4) * 2, fx + (k - 4) * 2, 112, k % 2 ? green[1] : green[3]); }
    for (const s of [-1, 1]) { P.line(48 + s * 14, 86, 48, 106, RTS_C_GOLD[3], 2); P.line(48 + s * 18, 88, 48 + s * 6, 112, RTS_C_GOLD[1]); }
    P.ball(48, 106, 3.5, 3.5, ['#003010', '#00A040', '#80F8A0']);
    P.ell(48, 48, 22, 30, (x, y, nx, ny) => rtsCRamp(['#000000', '#041008', '#0C2010'], 0.6 - ny * 0.4, x, y));   // shadow inside the hood
    P.ball(48, 74, 7, 14, skin, -0.3);
    P.ball(48, 46, 16.5, 22, skin);
    P.ball(48, 60, 11, 9, skin, -0.05);
    // the golden mask over the upper face, with scales engraved and a gem
    const mask = [[28, 38], [33, 31], [41, 26], [48, 25], [55, 26], [63, 31], [68, 38], [66, 46], [58, 50], [52, 48], [48, 53], [44, 48], [38, 50], [30, 46]];
    P.poly(mask, (x, y) => {
      const nx = (x - 48) / 21, ny = (y - 40) / 16, nz = Math.sqrt(Math.max(0, 1 - nx * nx * 0.8 - ny * ny * 0.6));
      const v = 0.15 + 0.85 * Math.max(0, -0.42 * nx - 0.5 * ny + 0.76 * nz);
      return (x * 2 + y * 3) % 9 === 0 && y < 46 ? RTS_C_GOLD[1] : rtsCRamp(RTS_C_GOLD, v, x, y);
    });
    for (const s of [-1, 1]) { P.line(48 + s * 18, 37, 48 + s * 21, 33, RTS_C_GOLD[4]); P.line(48 + s * 21, 33, 48 + s * 19, 30, RTS_C_GOLD[3]); }
    P.ball(48, 31, 2.6, 2.6, ['#003010', '#00A040', '#80F8A0', '#E0FFE8']);
    for (const s of [-1, 1]) {
      const ex = 48 + s * 8;
      P.poly([[ex - 5, 42], [ex, 39.5], [ex + 5, 42], [ex, 44.5]], '#000000');
      if (blink < 2) { P.rect(ex - 1, 41 + (blink ? 1 : 0), 2, blink ? 1 : 2, '#B8E030'); P.set(ex - (s < 0 ? 0 : 1), 42, '#000000'); if (!blink) P.set(ex - 1, 41, '#F8FFC0'); }
    }
    P.ball(48, 54, 3, 2, skin, 0.05); P.set(47, 56, skin[0]); P.set(49, 56, skin[0]);
    const K = '#100808';
    P.line(41, 58, 47, 57, K); P.line(49, 57, 55, 58, K); P.set(40, 57, K); P.set(39, 56, K); P.set(56, 57, K); P.set(57, 56, K);
    const L = '#501C18';
    if (mouth === 0) { P.line(43, 61, 53, 60, L); P.set(54, 59, L); P.rect(45, 62, 7, 1, skin[3]); }
    else if (mouth === 1) { P.line(43, 61, 53, 60, L); P.rect(45, 61, 8, 1, '#200808'); P.set(54, 59, L); P.rect(45, 62, 7, 1, skin[3]); }
    else { P.rect(44, 60, 10, 3, '#200808'); P.rect(46, 60, 6, 1, '#E8E0D0'); P.set(54, 59, L); P.rect(45, 63, 7, 1, skin[3]); }
    P.poly([[45.5, 65], [50.5, 65], [48, 74]], K);
  } else {   // the REGENT
    const skin = ['#2C2030', '#5C4C60', '#8C7C90', '#B8A8BC', '#DCD0E0', '#F4F0F8'];
    const purple = ['#100418', '#280C40', '#481C70', '#7038A8', '#A070D8', '#D0B0F8'];
    const silver = ['#303040', '#606078', '#9898B0', '#D0D0E0', '#FFFFFF'];
    P.ell(48, 80, 44, 50, (x, y, nx, ny) => {                                  // the great fan collar
      const a = Math.atan2(ny, nx), r = Math.sqrt(nx * nx + ny * ny);
      if (r > 0.93) return rtsCRamp(RTS_C_GOLD, 0.8 - ny * 0.3, x, y);
      return Math.floor((a + 4) * 5) % 2 ? purple[2] : rtsCRamp(purple, 0.5 - ny * 0.3, x, y);
    });
    P.ball(48, 46, 21, 26, ['#080810', '#181828', '#303048', '#484868'], 0, (x, y) => y < 60 || Math.abs(x - 48) > 14);   // long black hair
    P.ball(48, 126, 46, 38, purple, -0.25);
    for (let k = 0; k < 7; k++) { const fx = 18 + k * 10; P.line(fx, 96 + Math.abs(k - 3) * 3, fx + (k - 3) * 3, 112, k % 2 ? purple[1] : purple[3]); }
    P.line(48, 92, 48, 112, RTS_C_GOLD[2], 2);
    P.ball(48, 72, 8, 14, skin, -0.3);
    P.ball(48, 46, 16, 23, skin);
    P.line(36, 52, 40, 60, skin[1]); P.line(60, 52, 56, 60, skin[1]);
    // the crown
    P.rect(30, 24, 37, 5, (x, y) => rtsCRamp(silver, 0.9 - (x - 30) / 50 - (y - 24) / 12, x, y));
    for (const [sx, top] of [[36, 12], [48, 6], [60, 12]]) P.poly([[sx - 5, 25], [sx + 5, 25], [sx, top]], (x, y) => rtsCRamp(silver, 0.95 - (x - sx + 5) / 14, x, y));
    for (const sx of [36, 60]) P.ball(sx, 20, 1.6, 1.6, ['#401060', '#9858D8', '#E0C0F8']);
    P.ball(48, 18, 2.6, 2.6, ['#401060', '#B080F0', '#F0E0FF']);
    P.line(38, 38, 45, 39, '#181020'); P.line(51, 39, 58, 38, '#181020');
    eye(41, 42, '#B080F0', skin[2], skin[1], true); eye(55, 42, '#B080F0', skin[2], skin[1], true);
    for (let y = 40; y <= 54; y++) { P.set(48, y, skin[4]); if (y > 44) P.set(50, y, skin[2]); }
    P.set(46, 56, skin[0]); P.set(50, 56, skin[0]);
    const L = '#502040';
    if (mouth === 0) P.rect(43, 62, 11, 1, L);
    else if (mouth === 1) { P.rect(43, 62, 11, 1, L); P.rect(45, 63, 7, 1, '#200818'); }
    else { P.rect(43, 61, 11, 3, '#200818'); P.rect(45, 61, 7, 1, '#E0D8E0'); }
    P.rect(45, 64, 7, 1, skin[3]);
  }
  return (RTS_C_PORT[key] = P.canvas('#000000'));
}

// the room behind each advisor (still parts cached, the rest moves)
const RTS_C_BG = {};
function rtsCPortraitBg(ctx, who, x0, y0, t) {
  const W = RTS_C_PW, H = RTS_C_PH;
  if (!RTS_C_BG[who]) {
    const P = rtsCPaint(W, H);
    if (who === 'miren') {
      P.rect(0, 0, W, H, (x, y) => rtsCRamp(['#04061A', '#0A1030', '#141C44'], y / H, x, y));
      P.rect(54, 6, 36, 52, '#2C2418'); P.ell(72, 22, 16, 16, '#2C2418');
      P.rect(57, 9, 30, 46, (x, y) => rtsCRamp(['#000210', '#02082A', '#0C1840'], y / 60, x, y)); P.ell(72, 22, 13, 13, (x, y) => (y < 22 ? rtsCRamp(['#000210', '#02082A'], y / 30, x, y) : null));
      P.ball(80, 20, 6, 6, ['#806850', '#C8B898', '#F0E8D0']); P.ball(64, 34, 3, 3, ['#604030', '#A87858', '#D8A888']);
      P.rect(71, 9, 2, 46, '#2C2418'); P.rect(57, 30, 30, 2, '#2C2418');
      for (let y = 18; y < 84; y += 13) { P.rect(2, y + 11, 26, 2, '#3C2C1C'); for (let x = 4; x < 26; x += 3) { const c = ['#5C1818', '#183C5C', '#4C4018', '#2C4C2C', '#5C3C1C'][Math.floor(rtsCHash(x, y, 2) * 5)]; P.rect(x, y + 2 + Math.floor(rtsCHash(x, y, 3) * 3), 2, 9 - Math.floor(rtsCHash(x, y, 3) * 3), c); } }
      P.rect(6, 94, 7, 14, '#D8D0B8'); P.rect(4, 106, 11, 3, '#806040');
    } else if (who === 'kask') {
      P.rect(0, 0, W, H, (x, y) => rtsCRamp(['#080202', '#180404', '#300806'], y / H * 0.9, x, y));
      for (let x = 0; x < W; x += 12) P.rect(x, 0, 2, H, '#140404');
      for (let y = 10; y < H; y += 16) P.rect(0, y, W, 1, '#200606');
      for (const cx of [10, 86]) for (let y = 0; y < 70; y += 5) P.ell(cx, y + 2, 2, 3, (x, yy, nx, ny) => (Math.abs(nx) > 0.45 || Math.abs(ny) > 0.6 ? '#504040' : null));
    } else if (who === 'vell') {
      P.rect(0, 0, W, H, (x, y) => (Math.floor((x + 2) / 8) % 2 ? rtsCRamp(['#021008', '#06201A', '#0C3024'], 1 - y / H, x, y) : rtsCRamp(['#010804', '#04140E', '#082018'], 1 - y / H, x, y)));
      for (let x = 0; x < W; x++) { P.set(x, 4, RTS_C_GOLD[2]); if (x % 4 < 2) P.set(x, 5 + (x % 8 < 4 ? 1 : 0), RTS_C_GOLD[1]); }
      for (let k = 0; k < 7; k++) P.ball(8 + k * 13, 104, 4, 2, RTS_C_GOLD);
    } else {
      P.rect(0, 0, W, H, (x, y) => rtsCRamp(['#06020C', '#120620', '#200C34'], y / H, x, y));
      for (const cx of [8, 88]) P.rect(cx - 5, 0, 11, H, (x, y) => rtsCRamp(['#180C24', '#302040', '#504060'], 1 - Math.abs(x - cx) / 6, x, y));
      for (const cx of [26, 70]) { P.rect(cx - 7, 0, 14, 40, (x, y) => rtsCRamp(['#300C50', '#582090', '#7838A8'], 0.7 - y / 80, x, y)); P.poly([[cx - 7, 40], [cx + 7, 40], [cx, 47]], '#582090'); P.ball(cx, 22, 3, 3, RTS_C_GOLD); }
    }
    RTS_C_BG[who] = P.canvas(null);
  }
  ctx.drawImage(RTS_C_BG[who], x0, y0);
  // what moves
  const R = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x0 + Math.round(x), y0 + Math.round(y), w, h); };
  if (who === 'miren') {
    for (let k = 0; k < 14; k++) {
      const sx = 58 + Math.floor(rtsCHash(k, 1, 5) * 28), sy = 10 + Math.floor(rtsCHash(k, 2, 5) * 40);
      if ((sx - 80) ** 2 + (sy - 20) ** 2 < 50 || (sx > 70 && sx < 74) || (sy > 29 && sy < 33)) continue;
      if ((t + k * 37) % 120 > 12) R(sx, sy, 1, 1, k % 3 ? '#C8C8F8' : '#FFFFFF');
    }
    const fl = [0, 1, 0, -1][(t >> 3) & 3], fh = 4 + ((t >> 4) & 1);
    for (let r = 10; r > 2; r -= 3) { ctx.fillStyle = 'rgba(248,184,64,' + (0.05 + (10 - r) * 0.012).toFixed(3) + ')'; ctx.fillRect(x0 + 9 - r, y0 + 90 - r, r * 2 + 1, r * 2); }
    R(9 + fl, 93 - fh, 1, fh, '#F8D878'); R(8, 91, 3, 3, '#F8A030'); R(9, 92, 1, 2, '#FFF8D0');
  } else if (who === 'kask') {
    for (let y = 70; y < H; y += 2) { const a = (y - 70) / 42 * (0.35 + 0.1 * Math.sin(t / 7 + y)); ctx.fillStyle = 'rgba(248,' + (80 + (y & 7) * 6) + ',16,' + a.toFixed(3) + ')'; ctx.fillRect(x0, y0 + y, W, 2); }
    for (let k = 0; k < 10; k++) { const ph = (t * (0.6 + rtsCHash(k, 3, 7) * 0.8) + k * 31) % 112, sx = rtsCHash(k, 4, 7) * 92 + Math.sin((t + k * 20) / 15) * 4; R(sx, 111 - ph, 1, 1, ph < 60 ? '#F8D040' : '#C84010'); }
  } else if (who === 'vell') {
    for (const [lx, ly, ph] of [[13, 10, 0], [83, 16, 2]]) {
      const sw = Math.round(Math.sin(t / 40 + ph) * 2);
      R(lx + sw / 2, 0, 1, ly, RTS_C_GOLD[1]);
      ctx.fillStyle = 'rgba(248,216,96,0.12)'; ctx.fillRect(x0 + lx + sw - 9, y0 + ly - 2, 19, 20);
      R(lx + sw - 3, ly, 7, 9, RTS_C_GOLD[2]); R(lx + sw - 2, ly + 1, 5, 7, (t >> 3) & 1 ? '#F8E070' : '#F8D040'); R(lx + sw - 1, ly + 9, 3, 1, RTS_C_GOLD[1]);
    }
    for (let k = 0; k < 24; k++) { const y = 100 - k * 3.5, x = 6 + Math.sin((t / 20) + k * 0.5) * (2 + k * 0.25); if ((k + (t >> 4)) % 6) R(x, y, 1, 2, k < 10 ? '#5C7C6C' : '#304C40'); }
  } else {
    const g = 0.06 + 0.04 * Math.sin(t / 30);
    ctx.fillStyle = 'rgba(200,160,248,' + g.toFixed(3) + ')';
    for (let k = 0; k < 3; k++) ctx.fillRect(x0 + 34 + k * 10, y0, 6, H);
  }
}
// live things over the portrait
function rtsCPortraitFx(ctx, who, x0, y0, t) {
  if (who === 'kask') {
    const p = 0.5 + 0.5 * Math.sin(t / 9);
    ctx.fillStyle = 'rgba(248,64,16,' + (0.25 + 0.3 * p).toFixed(3) + ')'; ctx.fillRect(x0 + 53, y0 + 37, 9, 9);
    ctx.fillStyle = p > 0.5 ? '#FFC8A0' : '#F86040'; ctx.fillRect(x0 + 57, y0 + 41, 1, 1);
  } else if (who === 'regent') {
    if ((t >> 3) % 8 === 0) { ctx.fillStyle = '#FFFFFF'; ctx.fillRect(x0 + 48, y0 + 15, 1, 6); ctx.fillRect(x0 + 45, y0 + 18, 7, 1); }
  } else if (who === 'vell') {
    if ((t % 200) < 6) { ctx.fillStyle = '#FFFFFF'; ctx.fillRect(x0 + 47, y0 + 30, 1, 1); ctx.fillRect(x0 + 48, y0 + 29, 1, 3); }
  }
}
// an advisor in his frame: blinking now and then, the mouth moving while talking
function rtsCDrawAdvisor(ctx, who, x, y, t, talking, pal) {
  if (pal) rtsCFrame(ctx, x, y, RTS_C_PW, RTS_C_PH, pal);
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, RTS_C_PW, RTS_C_PH); ctx.clip();
  rtsCPortraitBg(ctx, who, x, y, t);
  const bp = (t + who.length * 53) % 230, blink = bp < 4 ? 1 : bp < 9 ? 2 : bp < 12 ? 1 : 0;
  const mouth = talking ? [0, 1, 2, 1, 2, 0, 1][(t >> 2) % 7] : 0;
  const bob = Math.round(Math.sin(t / 50) * 0.6);   // a breath
  ctx.drawImage(rtsCPortrait(who, blink, mouth), x, y + bob);
  rtsCPortraitFx(ctx, who, x, y + bob, t);
  ctx.restore();
}

// ------------------------------------------------------------------ pictures: stars, the planet, the desert
function rtsCStars(ctx, x0, y0, w, h, t, n = 70) {
  for (let k = 0; k < n; k++) {
    const x = Math.floor(rtsCHash(k, 11, 1) * w), y = Math.floor(rtsCHash(k, 12, 1) * h), b = rtsCHash(k, 13, 1);
    if ((t + k * 29) % (90 + k) < 6) continue;
    ctx.fillStyle = b > 0.85 ? '#FFFFFF' : b > 0.5 ? '#A8A8D8' : '#585880';
    ctx.fillRect(x0 + x, y0 + y, 1, 1);
  }
}
// KHARRA turning: a sphere textured with its deserts, lit from the left, a dusty glow round its rim
const RTS_C_PLANET = { tex: null, cv: null };
function rtsCPlanet(ctx, cx, cy, r, rot) {
  const TW = 160, TH = 80;
  if (!RTS_C_PLANET.tex) {
    const tex = new Array(TW * TH);
    for (let y = 0; y < TH; y++) for (let x = 0; x < TW; x++) {
      const nx = Math.cos(x / TW * Math.PI * 2) * 3, nz = Math.sin(x / TW * Math.PI * 2) * 3;   // wraps round
      const v = rtsMapFbm(nx + 10, y / 14 + nz, 5, 4), v2 = rtsMapFbm(nx * 2 + 30, y / 7 + nz * 2, 9, 3);
      let c = rtsCRamp(['#7C4818', '#B87028', '#D89848', '#F0C070'], v * 1.2 - 0.1, x, y);
      if (v > 0.62) c = rtsCRamp(['#3C2410', '#604020', '#806040'], (v - 0.62) * 5, x, y);
      if (v2 > 0.7 && v < 0.55) c = v2 > 0.76 ? '#F86818' : '#E08830';
      if (y < 4 || y > TH - 5) c = '#E8D8C0';
      tex[y * TW + x] = parseInt(c.slice(1), 16);
    }
    RTS_C_PLANET.tex = tex;
  }
  const S = r * 2 + 4;
  let cv = RTS_C_PLANET.cv;
  if (!cv || cv.width !== S) { cv = RTS_C_PLANET.cv = makeCanvas(S, S); }
  const g = cv.getContext('2d'), img = g.createImageData(S, S), d = img.data, tex = RTS_C_PLANET.tex;
  for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
    const dx = (i - S / 2 + 0.5) / r, dy = (j - S / 2 + 0.5) / r, q = dx * dx + dy * dy, o = (j * S + i) * 4;
    if (q > 1.09) continue;
    if (q > 1) {   // the haze
      if (rtsCB(i, j) < (1.09 - q) * 7 * Math.max(0, 0.4 - dx * 0.6)) { d[o] = 248; d[o + 1] = 168; d[o + 2] = 88; d[o + 3] = 255; }
      continue;
    }
    const z = Math.sqrt(1 - q), lat = Math.asin(dy), lon = Math.atan2(dx, z) + rot;
    const u = ((Math.floor((lon / (Math.PI * 2)) * TW) % TW) + TW) % TW, v = Math.max(0, Math.min(TH - 1, Math.floor((lat / Math.PI + 0.5) * TH)));
    let c = tex[v * TW + u];
    const L = -0.82 * dx - 0.25 * dy + 0.5 * z;
    let k = L < 0 ? 0.06 : 0.22 + L * 0.95;
    if (L < 0.12 && L > -0.1 && rtsCB(i, j) > (L + 0.1) * 4.5) k = 0.08;
    if (q > 0.86 && dx < 0) k += 0.25;
    k = Math.min(1.15, k);
    d[o] = Math.min(255, ((c >> 16) & 255) * k); d[o + 1] = Math.min(255, ((c >> 8) & 255) * k); d[o + 2] = Math.min(255, (c & 255) * k); d[o + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  ctx.drawImage(cv, Math.round(cx - S / 2), Math.round(cy - S / 2));
}
// the open desert: a dusk (or night) sky, far mesas, three bands of dunes drifting slowly (each a strip that
// tiles round, shaded once), glimmer sparkling, and now and then a sandwyrm bursting out (wyrm: 0..1 through its
// rise and dive, or -1 for none)
const RTS_C_DESERT = {};
const RTS_C_DUNE_TW = 512;
function rtsCDesert(ctx, x0, y0, w, h, t, o = {}) {
  const key = w + 'x' + h + (o.night ? 'n' : '');
  if (!RTS_C_DESERT[key]) {
    const P = rtsCPaint(w, h), hz = Math.round(h * 0.42);
    const sky = o.night ? ['#000008', '#080418', '#200C28', '#502030'] : ['#281030', '#682838', '#B84830', '#F08838', '#F8C068'];
    P.rect(0, 0, w, hz + 8, (x, y) => rtsCRamp(sky, y / (hz + 8), x, y));
    if (!o.night) P.ball(w * 0.72, hz - 6, 14, 14, ['#F8A040', '#F8D070', '#FFF0C0'], 0.4, (x, y) => y < hz);
    for (let x = 0; x < w; x++) {   // far mesas, then nearer ridges
      const m = hz - Math.max(0, (rtsMapFbm(x / 30, 1, 41, 3) - 0.45) * 60) * (rtsMapNoise(x / 60, 3, 42) > 0.45 ? 1 : 0.2);
      P.rect(x, Math.round(m), 1, hz - Math.round(m) + 2, o.night ? '#140814' : '#5C2C34');
      if (!o.night && Math.round(m) < hz - 1) P.set(x, Math.round(m), '#8C4C44');
      const r2 = hz + 4 - Math.max(0, (rtsMapFbm(x / 16, 2, 43, 3) - 0.4) * 22);
      P.rect(x, Math.round(r2), 1, hz + 6 - Math.round(r2), o.night ? '#201018' : '#7C3C30');
    }
    // the dune strips
    const TW = RTS_C_DUNE_TW, ramps = o.night ? [['#180C18', '#24121E', '#301828', '#402030'], ['#24121E', '#341A28', '#462434', '#5C3040'], ['#2C1622', '#44222E', '#5C3040', '#7C4450']]
      : [['#6C3420', '#8C4828', '#A85C30', '#C07038'], ['#9C5428', '#B86C34', '#D08844', '#E0A058'], ['#B06830', '#C88040', '#E0A050', '#F8C878', '#FCE0A8']];
    const bands = ramps.map((ramp, b) => {
      const base = hz + 4 + b * (h - hz) / 3.4, amp = 3 + b * 4, k1 = [5, 3, 2][b], k2 = [17, 13, 9][b], ph = b * 1.7;
      const top = x => base + Math.sin(x / TW * Math.PI * 2 * k1 + ph) * amp + Math.sin(x / TW * Math.PI * 2 * k2) * (1 + b * 0.6);
      const bh = h - Math.floor(base - amp - 3), oy = Math.floor(base - amp - 3), B = rtsCPaint(TW, bh);
      for (let x = 0; x < TW; x++) {
        const yt = top(x), sl = (top(x + 1) - top(x - 1)) / 2;
        for (let y = Math.ceil(yt) - oy; y < bh; y++) {
          const d = y + oy - yt;
          let v = 0.55 - sl * 0.35 - d * 0.006 + (d < 1.2 && sl < 0.1 ? 0.25 : 0);
          if (b === 2 && Math.sin((x * 0.7 + (y + oy) * 2.6) * 0.9 + Math.sin(x / 23) * 3) > 0.9) v -= 0.18;
          let c = rtsCRamp(ramp, v, x, y);
          if (b === 2 && rtsCHash(x >> 1, (y + oy) >> 1, 31) > 0.985 && d > 3) c = rtsCHash(x, y, 32) > 0.5 ? '#E86018' : '#F89030';
          B.set(x, y, c);
        }
      }
      return { cv: B.canvas(null), oy, sp: 0.04 + b * 0.08 };
    });
    RTS_C_DESERT[key] = { cv: P.canvas(null), hz, bands };
  }
  const D = RTS_C_DESERT[key], TW = RTS_C_DUNE_TW;
  ctx.drawImage(D.cv, x0, y0);
  D.bands.forEach((B, b) => {
    const off = Math.floor((t * B.sp) % TW);
    ctx.drawImage(B.cv, x0 - off, y0 + B.oy);
    if (TW - off < w) ctx.drawImage(B.cv, x0 - off + TW, y0 + B.oy);
    if (b === 1 && o.wyrm >= 0 && o.wyrm <= 1) rtsCWyrm(ctx, x0 + w * 0.3, y0 + D.hz + (h - D.hz) * 0.5, o.wyrm, t);
  });
  for (let k = 0; k < 14; k++) {   // glints on the near dunes
    const sx = (rtsCHash(k, 1, 13) * w + t * D.bands[2].sp) % w, sy = D.bands[2].oy + 14 + rtsCHash(k, 2, 13) * (h - D.bands[2].oy - 16);
    if ((t + k * 23) % 50 < 4) { ctx.fillStyle = '#FFF0A0'; ctx.fillRect(x0 + Math.round(w - sx), y0 + Math.round(sy), 1, 1); }
  }
}
// a sandwyrm bursting out of the sand at (bx, by) and diving back: p 0..1
function rtsCWyrm(ctx, bx, by, p, t) {
  const up = p < 0.35 ? p / 0.35 : p < 0.7 ? 1 : Math.max(0, (1 - p) / 0.3), H = 64 * Math.sin(up * Math.PI / 2), n = Math.ceil(H / 2);
  const ramp = ['#2C2018', '#54402C', '#806444', '#A88C68', '#D0B890'];
  const sway = k => Math.sin(k * 0.09 + t / 25) * 4 * (k / Math.max(1, n)) + (p > 0.7 ? (p - 0.7) * 40 * (k / Math.max(1, n)) : 0);
  for (let k = 0; k <= n; k++) {   // the body, ring by ring from the sand up
    const y = by - k * 2, cx = bx + sway(k), r = 9 - k / Math.max(1, n) * 2.5;
    for (let i = -Math.ceil(r); i <= Math.ceil(r); i++) {
      const nx = i / r;
      if (Math.abs(nx) > 1) continue;
      const v = 0.75 - nx * 0.45 - ((k % 4 === 0) ? 0.3 : 0);
      ctx.fillStyle = rtsCRamp(ramp, v, i + 64, k);
      ctx.fillRect(Math.round(cx + i), Math.round(y), 1, 2);
    }
  }
  if (H > 6) {   // the head: a round open maw ringed with teeth
    const hx = bx + sway(n), hy = by - n * 2 - 3;
    ctx.fillStyle = '#3C2C20'; ctx.beginPath(); ctx.ellipse(hx, hy, 11, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#A88C68'; ctx.beginPath(); ctx.ellipse(hx, hy - 1, 10, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#200404'; ctx.beginPath(); ctx.ellipse(hx, hy - 1, 7.5, 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#802010'; ctx.beginPath(); ctx.ellipse(hx, hy - 0.5, 4, 1.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#F8F0D8';
    for (let a = 0; a < 14; a++) { const an = a / 14 * Math.PI * 2; ctx.fillRect(Math.round(hx + Math.cos(an) * 7.5), Math.round(hy - 1 + Math.sin(an) * 3), 1, 1); }
  }
  // sand thrown up round it
  for (let k = 0; k < 24; k++) {
    const a = rtsCHash(k, 3, 17) * Math.PI, sp = 10 + rtsCHash(k, 4, 17) * 22, q = ((p * 3 + rtsCHash(k, 5, 17)) % 1);
    const x = bx + Math.cos(a) * sp * q * (k & 1 ? 1 : -1), y = by - Math.sin(a) * sp * 1.4 * q + q * q * 30;
    if (y > by + 2) continue;
    ctx.fillStyle = k % 3 ? '#D8A060' : '#F0C080'; ctx.fillRect(Math.round(x), Math.round(y), 2, 1);
  }
  ctx.fillStyle = '#8C5428'; ctx.fillRect(Math.round(bx - 13), Math.round(by), 27, 2);
}

// ------------------------------------------------------------------ the region map of KHARRA
const RTS_C_MW = 240, RTS_C_MH = 136;
let rtsCMapData = null;
function rtsCMapBuild() {
  if (rtsCMapData) return rtsCMapData;
  const W = RTS_C_MW, H = RTS_C_MH, id = new Uint8Array(W * H), n = RTS_C_REGIONS.length;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const wx = x + (rtsMapFbm(x / 22, y / 22, 11, 3) - 0.5) * 30, wy = y + (rtsMapFbm(x / 22, y / 22, 23, 3) - 0.5) * 24;
    let best = 0, bd = 1e9;
    for (const R of RTS_C_REGIONS) { const d = (wx - R.x * W) ** 2 + ((wy - R.y * H) * 1.15) ** 2; if (d < bd) { bd = d; best = R.i; } }
    id[y * W + x] = best;
  }
  const adj = RTS_C_REGIONS.map(() => new Set()), sx = new Array(n).fill(0), sy = new Array(n).fill(0), cnt = new Array(n).fill(0), pix = RTS_C_REGIONS.map(() => []);
  const edge = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, a = id[i];
    sx[a] += x; sy[a] += y; cnt[a]++; pix[a].push(i);
    if (x < W - 1 && id[i + 1] !== a) { adj[a].add(id[i + 1]); adj[id[i + 1]].add(a); edge[i] = 1; }
    if (y < H - 1 && id[i + W] !== a) { adj[a].add(id[i + W]); adj[id[i + W]].add(a); edge[i] = 1; }
  }
  // the land: sand in two tones, dunes, rock and mountains, glimmer fields, a few craters
  const land = new Uint32Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const v = rtsMapFbm(x / 24, y / 24, 5, 4), s = rtsMapFbm(x / 7, y / 7, 6, 2), gl = rtsMapFbm(x / 9, y / 9, 77, 3);
    let c = rtsCRamp(['#9C6830', '#B88040', '#D09C58', '#E0B470'], s * 1.1 - 0.05, x, y);
    if (Math.abs(Math.sin((x * 0.8 + y * 0.6) / 3 + s * 6)) > 0.93 && v < 0.55) c = '#A87038';
    if (v > 0.6) c = rtsCRamp(['#4C3420', '#6C4C30', '#8C6844'], 0.3 + s * 0.6, x, y);
    if (v > 0.69) c = rtsCRamp(['#2C1C10', '#4C3020', '#7C5838', '#A88058'], (rtsMapFbm(x / 5, y / 5, 8, 2) - 0.3) * 2, x, y);
    if (gl > 0.7 && v < 0.58) c = gl > 0.75 ? '#E05818' : '#D88038';
    land[y * W + x] = parseInt(c.slice(1), 16);
  }
  const cent = RTS_C_REGIONS.map((R, i) => {
    // the pixel of the region nearest its heart (the arrow and the label go there)
    let bx = Math.round(sx[i] / cnt[i]), by = Math.round(sy[i] / cnt[i]);
    if (id[by * W + bx] !== i) { let bd = 1e9; for (const p of pix[i]) { const px = p % W, py = (p - px) / W, d = (px - bx) ** 2 + (py - by) ** 2; if (d < bd) { bd = d; bx = px; by = py; } } }
    return [bx, by];
  });
  rtsCMapData = { id, adj: adj.map(s => [...s]), cent, pix, edge, land, cv: makeCanvas(W, H), stamp: '' };
  return rtsCMapData;
}
// graph distances from a set of regions
function rtsCDist(from) {
  const M = rtsCMapBuild(), d = RTS_C_REGIONS.map(() => 99), q = [].concat(from);
  for (const f of q) d[f] = 0;
  while (q.length) { const a = q.shift(); for (const b of M.adj[a]) if (d[b] > d[a] + 1) { d[b] = d[a] + 1; q.push(b); } }
  return d;
}
// who owns what at the start: each House the land nearest its home (the player's own goes to the rivals: you start
// with your home region only), the Regent the middle of the world
function rtsCInitOwners(house, seed) {
  const own = [], dist = {};
  for (const h of RTS_C_ORDER) dist[h] = rtsCDist([RTS_C_HOME[h]]);
  RTS_C_REGIONS.forEach((R, i) => {
    let best = null, bd = 1e9;
    for (const h of RTS_C_ORDER) { const d = dist[h][i] + rtsCHash(i, RTS_C_ORDER.indexOf(h), seed) * 0.9; if (d < bd) { bd = d; best = h; } }
    if (best === house && i !== RTS_C_HOME[house]) {
      const [r1, r2] = rtsCRivals(house);
      best = dist[r1][i] + rtsCHash(i, 7, seed) < dist[r2][i] + rtsCHash(i, 8, seed) ? r1 : r2;
    }
    own.push(best);
  });
  for (const i of RTS_C_REGENT_LAND) own[i] = 'regent';
  return own;
}
// the regions you may attack next: rival land next to yours (the Regent's land only for the last mission)
function rtsCCandidates(C) {
  if (C.level <= 1) return [RTS_C_HOME[C.house]];
  const M = rtsCMapBuild(), mine = new Set(), rivals = rtsCRivals(C.house);
  C.owners.forEach((o, i) => { if (o === C.house) mine.add(i); });
  if (C.level >= 9) return RTS_C_REGENT_LAND.filter(i => C.owners[i] !== C.house);
  const d = rtsCDist([...mine]), home = rtsCDist([RTS_C_HOME[C.house]]);
  let c = RTS_C_REGIONS.map(R => R.i).filter(i => rivals.includes(C.owners[i]) && d[i] === 1);
  if (!c.length) c = RTS_C_REGIONS.map(R => R.i).filter(i => rivals.includes(C.owners[i]));
  c.sort((a, b) => home[a] - home[b] || rtsCHash(a, C.level, C.seed) - rtsCHash(b, C.level, C.seed));
  // the nearest of each rival's (so you choose whom to fight), then the next nearest
  const out = [];
  for (const h of rivals) { const r = c.find(x => C.owners[x] === h); if (r !== undefined) out.push(r); }
  for (const r of c) { if (out.length >= 3) break; if (!out.includes(r)) out.push(r); }
  return out.sort((a, b) => home[a] - home[b] || a - b);
}
// the Houses you fight in a region: its owner (the other rival as well from mission 8; at 9 the Regent and both)
function rtsCFoes(C, region) {
  const rivals = rtsCRivals(C.house);
  let main = C.owners[region];
  if (!rivals.includes(main)) main = rivals[(region + C.level) % 2];
  if (C.level >= 9) return ['regent'].concat(rivals);
  if (C.level === 8) return [main, rivals.find(r => r !== main)];
  return [main];
}
// between missions the rivals fight each other too: each may take a region from the other (never from you, nor
// the Regent's) -> the changes, applied to C.owners
function rtsCRivalMoves(C) {
  const M = rtsCMapBuild(), moves = [], rivals = rtsCRivals(C.house), R = rtsMapRng(C.seed + C.level * 131);
  for (const h of rivals) {
    if (R() < 0.35) continue;
    const other = rivals.find(r => r !== h), opts = [];
    C.owners.forEach((o, i) => { if (o === other && i !== RTS_C_HOME[other] && M.adj[i].some(j => C.owners[j] === h)) opts.push(i); });
    if (!opts.length) continue;
    const r = opts[Math.floor(R() * opts.length)];
    moves.push({ region: r, from: other, to: h });
    C.owners[r] = h;
  }
  return moves;
}
// draws the map: the land, the owners' colours (anim: a region changing hands, k 0..1), borders, the
// highlighted region (sel), the candidates' arrows
function rtsCPaintMap(ctx, x0, y0, C, t, o = {}) {
  const M = rtsCMapBuild(), W = RTS_C_MW, H = RTS_C_MH, an = o.anim, own = o.owners || C.owners;
  const stamp = own.join(',') + '|' + (an ? an.region + ':' + Math.floor(an.k * 40) : '') + '|' + (o.sel === undefined ? '' : o.sel + ':' + ((t >> 4) & 1)) + '|' + (o.cands || []).join(',');
  if (stamp !== M.stamp) {
    M.stamp = stamp;
    const g = M.cv.getContext('2d'), img = g.createImageData(W, H), d = img.data;
    const rgb = {};
    const colOf = h => rgb[h] || (rgb[h] = parseInt(rtsCPal(h)[h === C.house ? 0 : 1].slice(1), 16));
    for (let i = 0; i < W * H; i++) {
      const x = i % W, y = (i - x) / W, r = M.id[i];
      let owner = own[r];
      if (an && an.region === r) owner = rtsCHash(x, y, 77) * 0.6 + rtsCB(x, y) * 0.4 < an.k ? an.to : an.from;
      let c = M.land[i];
      const strong = owner === C.house ? 0.62 : owner === 'regent' ? 0.5 : 0.45;
      if (owner && rtsCB(x, y) < strong) c = colOf(owner);
      if (M.edge[i]) c = 0x180C04;
      if (o.sel === r && M.edge[i] && ((t >> 4) & 1)) c = 0xFFFFFF;
      else if (o.cands && o.cands.includes(r) && M.edge[i]) c = 0xF0BC3C;
      if (an && an.region === r && Math.abs(rtsCHash(x, y, 77) * 0.6 + rtsCB(x, y) * 0.4 - an.k) < 0.03 && an.k < 1) c = 0xFFFFE0;
      d[i * 4] = c >> 16; d[i * 4 + 1] = (c >> 8) & 255; d[i * 4 + 2] = c & 255; d[i * 4 + 3] = 255;
    }
    g.putImageData(img, 0, 0);
  }
  ctx.fillStyle = '#000000'; ctx.fillRect(x0 - 3, y0 - 3, W + 6, H + 6);
  ctx.fillStyle = '#8C6410'; ctx.fillRect(x0 - 2, y0 - 2, W + 4, H + 4);
  ctx.fillStyle = '#F0C850'; ctx.fillRect(x0 - 2, y0 - 2, W + 4, 1); ctx.fillRect(x0 - 2, y0 - 2, 1, H + 4);
  ctx.drawImage(M.cv, x0, y0);
  // the homes: a little crest on each House's home; the Regent's palace
  for (const h of RTS_C_ORDER) { const [cx, cy] = M.cent[RTS_C_HOME[h]]; if (own[RTS_C_HOME[h]] === h) ctx.drawImage(rtsCHouseCrest(h, 16), x0 + cx - 8, y0 + cy - 8); }
  if (own[RTS_C_REGENT_LAND[0]] === 'regent') { const [cx, cy] = M.cent[RTS_C_REGENT_LAND[0]]; ctx.drawImage(rtsCHouseCrest('regent', 16), x0 + cx - 8, y0 + cy - 8); }
  // arrows over the regions on offer
  (o.cands || []).forEach((r, k) => {
    const [cx, cy] = M.cent[r], bob = ((t >> 3) + k) & 1, on = r === o.sel;
    const ax = x0 + cx, ay = Math.max(y0 + 22, y0 + cy - 10) - bob;
    ctx.fillStyle = '#000000'; ctx.fillRect(ax - 4, ay - 6, 9, 5); ctx.fillRect(ax - 3, ay - 1, 7, 2); ctx.fillRect(ax - 2, ay + 1, 5, 2); ctx.fillRect(ax - 1, ay + 3, 3, 1);
    ctx.fillStyle = on ? '#FFFFFF' : '#F0BC3C'; ctx.fillRect(ax - 3, ay - 5, 7, 4); ctx.fillRect(ax - 2, ay - 1, 5, 2); ctx.fillRect(ax - 1, ay + 1, 3, 2);
    ctx.fillStyle = '#000000'; Font.draw(ctx, String(k + 1), ax - 3, ay - 13, '#000000');
    Font.draw(ctx, String(k + 1), ax - 4, ay - 14, on ? '#FFFFFF' : '#F0BC3C');
  });
}
// the Regent's palace, now flying a House's colours (128 x 64, standing on its bottom edge)
const RTS_C_PALACE = {};
function rtsCPalace(h) {
  if (RTS_C_PALACE[h]) return RTS_C_PALACE[h];
  const P = rtsCPaint(128, 64), pal = rtsCPal(h), stone = ['#0C060C', '#1C1020', '#2C1C34', '#40304C', '#5C4868'];
  P.poly([[30, 64], [98, 64], [90, 57], [38, 57]], (x, y) => rtsCRamp(stone, 0.5 - (y - 57) / 20 + ((y & 1) ? 0 : -0.15), x, y));
  P.rect(24, 34, 80, 24, (x, y) => rtsCRamp(stone, 0.55 - (x - 24) / 160 - (y - 34) / 60, x, y));
  for (let x = 24; x < 104; x += 5) P.rect(x, 31, 3, 3, stone[2]);
  for (let y = 38; y < 58; y += 5) for (let x = 26 + (y % 10 ? 2 : 0); x < 102; x += 8) P.set(x, y, stone[1]);
  P.ball(64, 34, 19, 19, [stone[0], pal[2], pal[1], pal[0]], -0.15, (x, y) => y <= 34);
  P.line(64, 15, 64, 6, RTS_C_GOLD[3]); P.ball(64, 6, 1.6, 1.6, RTS_C_GOLD);
  for (const tx of [16, 111]) {
    P.rect(tx - 5, 20, 10, 38, (x, y) => rtsCRamp(stone, 0.6 - (x - tx + 5) / 14, x, y));
    P.poly([[tx - 6, 21], [tx + 6, 21], [tx, 10]], (x, y) => rtsCRamp([stone[0], pal[2], pal[1]], 0.8 - (x - tx + 6) / 14, x, y));
    P.rect(tx - 1, 0, 2, 11, '#806850');
    P.rect(tx - 1, 28, 2, 4, '#F0A040'); P.rect(tx - 1, 40, 2, 4, '#F0A040');
  }
  P.poly([[58, 58], [70, 58], [70, 49], [64, 45], [58, 49]], (x, y) => rtsCRamp(['#200804', '#602010', '#C06020', '#F8B048'], (y - 45) / 14, x, y));
  const cr = rtsCHouseCrest(h, 16), g = makeCanvas(128, 64), gc = g.getContext('2d');
  gc.drawImage(P.canvas('#000000'), 0, 0);
  gc.drawImage(cr, 56, 20);
  return (RTS_C_PALACE[h] = g);
}
const RTS_C_STYLE_NAME = { open: 'OPEN SANDS', canyons: 'CANYONS', islands: 'ROCK ISLANDS', basin: 'GREAT BASIN' };

// ------------------------------------------------------------------ the campaign's state
function rtsCNew(house) {
  const seed = 1 + Math.floor(Math.random() * 1e6);
  return { v: 1, house, level: 1, region: RTS_C_HOME[house], owners: rtsCInitOwners(house, seed), scores: [], times: [], total: 0, rank: 0,
    seed, phase: 'brief', losses: 0, started: Date.now() };
}
function rtsCSave(C) {
  if (!C) return;
  const old = STORE.get(RTS_C_KEY, null) || {};
  STORE.set(RTS_C_KEY, Object.assign({}, C, { hall: old.hall || {} }));
}
function rtsCLoad() {
  const s = STORE.get(RTS_C_KEY, null);
  if (!s || typeof s !== 'object' || s.v !== 1) return null;
  if (!RTS_C_HOUSES[s.house] || !Array.isArray(s.owners) || s.owners.length !== RTS_C_REGIONS.length) return Object.assign({ hall: s.hall || {} }, { invalid: true });
  s.level = Math.max(1, Math.min(9, s.level | 0));
  s.scores = Array.isArray(s.scores) ? s.scores : [];
  s.total = s.scores.reduce((a, b) => a + (b | 0), 0);
  if (!['brief', 'map', 'ending'].includes(s.phase)) s.phase = 'map';
  if (s.phase === 'brief' && !(s.region >= 0 && s.region < RTS_C_REGIONS.length)) s.phase = 'map';
  return s;
}
// the hall: the best campaign score of each House that has been won
function rtsCHall() { const s = STORE.get(RTS_C_KEY, null); return (s && s.hall) || {}; }
function rtsCFinish(C) {
  const hall = rtsCHall();
  hall[C.house] = Math.max(hall[C.house] || 0, C.total);
  STORE.set(RTS_C_KEY, { v: 1, done: true, house: C.house, total: C.total, hall });
}

// a mission's score from its result: the campaign's own reckoning (the rank ladder is tuned to it), whatever the
// engine's own score says
function rtsCScoreOf(r, level) {
  const min = (r.time || 0) / 3600, par = 10 + level * 4;
  const s = (r.harvested || 0) / 10 + (r.unitsKilled || 0) * 20 + (r.buildingsKilled || 0) * 45 - (r.unitsLost || 0) * 6 - (r.buildingsLost || 0) * 15
    + (r.win ? 300 + level * 150 + Math.max(0, par - min) * 12 : 0);
  return Math.max(0, Math.round(s));
}
const rtsCTime = f => { const s = Math.floor((f || 0) / 60), h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60; return h + 'H ' + String(m).padStart(2, '0') + 'M ' + String(s % 60).padStart(2, '0') + 'S'; };

// what Game.rtsStartMission gets for the campaign's next mission
function rtsCMissionOpts(C) {
  const L = C.level, R = RTS_C_REGIONS[C.region], foes = rtsCFoes(C, C.region);
  const allies = C.house === 'aquila' && L >= 7 ? ['nomad'] : [];
  const style = L === 1 ? 'open' : R.style;
  const setup = rtsMapMission({ level: L, house: C.house, foes, allies, seed: rtsMapSeed('kharra', C.house, L, C.region, C.seed), style });
  const map = setup.map;
  delete map.occ;
  const ai = L <= 2 ? 0 : L <= 4 ? 1 : L <= 6 ? 2 : L <= 8 ? 3 : 4;
  const foeCredits = L <= 2 ? 0 : 600 + L * 300;
  const s0 = map.starts[0];
  return {
    map,
    player: Object.assign({ start: { x: s0.x, y: s0.y } }, setup.player),
    foes: setup.foes.map(f => ({ house: f.house, credits: f.house === 'regent' ? foeCredits * 2 : foeCredits, ai: f.house === 'regent' ? 4 : ai, base: f.base, units: f.units, noMcv: f.noMcv, start: f.start })),
    // the NOMADS have no base and no computer player of their own: they roam and hunt (rtsCNomads, at the start)
    allies: setup.allies.map(a => ({ house: a.house, credits: 0, ai: null, base: a.base, units: a.units, noMcv: true, start: a.start })),
    onStart: rtsCNomads,
    tech: L,
    objectives: L <= 2 ? { harvest: RTS_C_HARVEST[L - 1] } : { destroy: true },
    reinforcements: setup.reinforcements,
    worms: setup.worms + (style === 'islands' ? 1 : 0),
    music: true,
    mission: { campaign: true, house: C.house, level: L, region: C.region, regionName: R.name, foes, style },
    title: 'MISSION ' + L + ': ' + R.name,
    objectiveText: rtsCObjective(L, foes),
  };
}

// at a mission's start: the NOMADS among the player's allies are the engine's roaming nomad band (they hunt)
function rtsCNomads(R) {
  const Hs = R && R.houses && R.houses.nomad;
  if (Hs && !Hs.human) { Hs.nomads = true; Hs.brain = null; }
}

// ------------------------------------------------------------------ typed text (the advisors talk)
function rtsCTalk(text, cols = 30, rows = 7) {
  const lines = rtsCWrap(text, cols), pages = [];
  for (let i = 0; i < lines.length; i += rows) pages.push(lines.slice(i, i + rows));
  return { pages: pages.length ? pages : [['']], page: 0, shown: 0, rate: 0.9, n: 0 };
}
const rtsCTalkLen = T => T.pages[T.page].join(' ').length;
const rtsCTalkFull = T => T.shown >= rtsCTalkLen(T);
const rtsCTalkDone = T => T.page >= T.pages.length - 1 && rtsCTalkFull(T);
function rtsCTalkTick(T) {
  if (rtsCTalkFull(T)) return;
  const before = Math.floor(T.shown);
  T.shown = Math.min(rtsCTalkLen(T), T.shown + T.rate);
  if (Math.floor(T.shown) !== before && (T.n++ % 3) === 0) rtsCBlip(T.voice || 0);
}
// A: the page at once, or the next page; true when there's nothing more
function rtsCTalkOk(T) {
  if (!rtsCTalkFull(T)) { T.shown = rtsCTalkLen(T); return false; }
  if (T.page < T.pages.length - 1) { T.page++; T.shown = 0; return false; }
  return true;
}
function rtsCTalkSkip(T) { T.page = T.pages.length - 1; T.shown = rtsCTalkLen(T); }
function rtsCTalkDraw(ctx, T, x, y, col = '#F8E8C8', lh = 9) {
  let left = Math.floor(T.shown);
  T.pages[T.page].forEach((ln, k) => {
    if (left <= 0) return;
    Font.draw(ctx, ln.slice(0, left), x, y + k * lh, col);
    left -= ln.length + 1;
  });
  if (rtsCTalkFull(T) && T.page < T.pages.length - 1 && ((Game.t >> 4) & 1)) Font.draw(ctx, '>', x + 30 * 8 - 8, y + (T.pages[T.page].length - 1) * lh, COL.gold);
}
// a voice: a tiny blip per few letters, pitched for each advisor
function rtsCBlip(v) {
  try {
    if (!Sound.ctx || Sound.muted || !Sound.master || Sound.master.gain.value === 0) return;
    const base = [64, 50, 70, 57][v] || 64;
    Sound.note(base + Math.floor(Math.random() * 5), Sound.ctx.currentTime + 0.005, 0.03, { vol: 0.035, wave: 'p25', flat: true });
  } catch (e) { /* no sound */ }
}
const RTS_C_VOICE = { miren: 0, kask: 1, vell: 2, regent: 3 };

// ------------------------------------------------------------------ the intro
const RTS_C_INTRO = [
  { scene: 'space', lines: ['THE PLANET KHARRA.', 'A WORLD OF SAND, WIND AND SILENCE AT THE EDGE OF THE KNOWN STARS.'] },
  { scene: 'desert', lines: ['BENEATH ITS DUNES LIES GLIMMER: A GLOWING SAND THAT FUELS EVERY ENGINE OF THE EMPIRE.', 'AND IN THE DEEP SAND, THE WYRMS ARE WAITING.'] },
  { scene: 'regent', who: 'regent', lines: ['I AM THE REGENT OF KHARRA. HEAR MY DECREE.', 'THE HOUSE THAT HARVESTS THE MOST GLIMMER ON KHARRA SHALL RULE IT, IN MY NAME.', 'THERE ARE NO RULES. THERE ARE NO BORDERS. THERE IS ONLY THE HARVEST.'] },
  { scene: 'houses', lines: ['THREE GREAT HOUSES ANSWER HIS CALL.', 'AQUILA, THE NOBLE. DRAKON, THE CRUEL. SERPENS, THE CUNNING.'] },
  { scene: 'title', lines: ['THREE HOUSES. ONE PLANET.', 'ONLY ONE WILL RULE THE SANDS.'] },
];
const RTS_C_CREDITS = [
  ['DESERT DOMINION', 'gold'], ['', ''], ['A TRIBUTE TO THE EARLY', 'grey'], ['REAL-TIME STRATEGY GAMES', 'grey'], ['', ''],
  ['THE PLANET', 'grey'], ['KHARRA', 'white'], ['', ''], ['THE HOUSES', 'grey'], ['AQUILA', 'aquila'], ['DRAKON', 'drakon'], ['SERPENS', 'serpens'], ['', ''],
  ['THE ADVISORS', 'grey'], ['COUNSELLOR MIREN', 'white'], ['OVERSEER KASK', 'white'], ['FACTOR VELL', 'white'], ['', ''],
  ['AND', 'grey'], ['THE REGENT', 'regent'], ['HIS PRAETORIANS', 'regent'], ['THE NOMADS OF THE DEEP SAND', 'nomad'], ['THE SANDWYRMS', 'white'], ['', ''],
  ['MADE FOR TANB4IKI', 'grey'], ['', ''], ['YOUR RANK', 'grey'], ['{RANK}', 'gold'], ['CAMPAIGN SCORE', 'grey'], ['{SCORE}', 'gold'], ['', ''], ['', ''],
  ['THANK YOU FOR PLAYING', 'white'],
];

// ================================================================= the screens (Game)
const RTS_C_SCREENS = {
  rtsCMenu: ['rtsCUpdMenu', 'rtsCDrawMenu', 'rtsCPtrMenu'],
  rtsCIntro: ['rtsCUpdIntro', 'rtsCDrawIntro', 'rtsCPtrIntro'],
  rtsCHouse: ['rtsCUpdHouse', 'rtsCDrawHouse', 'rtsCPtrHouse'],
  rtsCHouseIntro: ['rtsCUpdHouseIntro', 'rtsCDrawHouseIntro', 'rtsCPtrHouseIntro'],
  rtsCBrief: ['rtsCUpdBrief', 'rtsCDrawBrief', 'rtsCPtrBrief'],
  rtsCMap: ['rtsCUpdMap', 'rtsCDrawMap', 'rtsCPtrMap'],
  rtsCStub: ['rtsCUpdStub', 'rtsCDrawStub', 'rtsCPtrStub'],
  rtsCResult: ['rtsCUpdResult', 'rtsCDrawResult', 'rtsCPtrResult'],
  rtsCScore: ['rtsCUpdScore', 'rtsCDrawScore', 'rtsCPtrScore'],
  rtsCEnding: ['rtsCUpdEnding', 'rtsCDrawEnding', 'rtsCPtrEnding'],
  rtsCCredits: ['rtsCUpdCredits', 'rtsCDrawCredits', 'rtsCPtrCredits'],
};
// menu input with B (alt) as a second back
function rtsCInput() { const m = Input.menu(); m.cancel = m.back || m.alt; return m; }
const rtsCHC = h => rtsCPal(h)[0];

Object.assign(Game, {
  // ---------------------------------------------------------------- the mode's menu
  rtsMenu() {
    this.mode = 'rts';
    Sound.setEngine(0);
    this.applyLayout();
    const sv = rtsCLoad();
    this.rtsCM = { idx: 0, sv: sv && !sv.done && !sv.invalid ? sv : null, hall: rtsCHall(), confirm: 0 };
    if (this.rtsCM.sv) this.rtsCM.idx = 2;
    this.setState('rtsCMenu');
  },
  rtsCMenuItems() {
    return [{ k: 'campaign', label: 'CAMPAIGN' }, { k: 'skirmish', label: 'SKIRMISH', off: typeof this.rtsSkirmishSetup !== 'function' },
      { k: 'continue', label: 'CONTINUE', off: !this.rtsCM.sv }, { k: 'back', label: 'BACK' }];
  },
  rtsCMenuAct(i) {
    const M = this.rtsCM, it = this.rtsCMenuItems()[i];
    if (!it) return;
    if (it.off) { Sound.play('steel'); if (it.k === 'skirmish') this.toast('SKIRMISH IS NOT READY'); return; }
    Sound.play('select');
    if (it.k === 'campaign') {
      if (M.sv && !M.confirm) { M.confirm = 120; return; }
      this.rtsC = null;
      this.rtsCToIntro();
    } else if (it.k === 'skirmish') this.rtsSkirmishSetup();
    else if (it.k === 'continue') this.rtsCContinue(M.sv);
    else { this.toTitle(); this.titleY = 0; }
  },
  rtsCUpdMenu() {
    const M = this.rtsCM, m = rtsCInput(), n = this.rtsCMenuItems().length;
    if (M.confirm) M.confirm--;
    if (m.up || m.down) { M.idx = (M.idx + (m.up ? -1 : 1) + n) % n; M.confirm = 0; Sound.play('select'); }
    if (m.cancel && this.t > 8) { this.toTitle(); this.titleY = 0; return; }
    if (m.ok && this.t > 8) this.rtsCMenuAct(M.idx);
  },
  rtsCDrawMenu(ctx) {
    const M = this.rtsCM, t = this.t;
    ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, SW, SH);
    rtsCDesert(ctx, 0, 0, SW, SH, t, { wyrm: ((t % 900) - 500) / 240 });
    rtsCPlanet(ctx, 60, 30, 18, t / 900);
    const big = (s, y, sc) => { const x = (SW - Font.bigWidth(s, sc)) >> 1; Font.big(ctx, s, x + 2, y + 2, sc, '#200800'); Font.big(ctx, s, x, y, sc, '#F0BC3C'); Font.big(ctx, s, x, y, sc, (t >> 5) % 6 === 0 ? '#FCE8A0' : '#F0BC3C'); };
    big('DESERT', 54, 3); big('DOMINION', 80, 3);
    rtsCBox(ctx, 4, 105, SW - 8, 13, 'rgba(0,0,0,0.55)');
    Font.drawCenter(ctx, 'BUILD, HARVEST, RULE THE SANDS', SW / 2, 108, '#FCE8A0');
    rtsCBox(ctx, 56, 124, 144, 62, 'rgba(0,0,0,0.6)', '#8C6410');
    this.rtsCMenuItems().forEach((it, i) => {
      const y = 130 + i * 14, on = i === M.idx;
      if (on) { ctx.fillStyle = '#5C2C10'; ctx.fillRect(58, y - 3, 140, 13); }
      Font.drawCenter(ctx, it.label, SW / 2, y, it.off ? '#606060' : on ? COL.white : COL.lgrey);
    });
    let note = '';
    if (M.confirm) note = 'THIS ENDS THE SAVED CAMPAIGN';
    else if (M.idx === 2 && M.sv) note = 'HOUSE ' + RTS_C_HOUSES[M.sv.house].name + ' - MISSION ' + M.sv.level + ' OF 9';
    else if (M.idx === 0) { const h = Object.keys(M.hall); note = h.length ? 'KHARRA WON BY ' + h.map(k => RTS_C_HOUSES[k].name).join(', ') : 'NINE MISSIONS FOR EACH HOUSE'; }
    else if (M.idx === 1) note = M.confirm ? '' : 'YOU AGAINST 1-3 COMPUTER HOUSES';
    rtsCBox(ctx, 0, 193, SW, 31, 'rgba(0,0,0,0.7)');
    Font.drawCenter(ctx, note.slice(0, 32), SW / 2, 197, M.confirm ? COL.orange : COL.gold);
    Font.drawCenter(ctx, M.confirm ? 'A AGAIN TO START A NEW ONE' : 'ARROWS  A SELECT  B BACK', SW / 2, 211, M.confirm ? COL.orange : '#A08868');
  },
  rtsCPtrMenu(x, y) {
    const i = Math.floor((y - 127) / 14);
    if (i < 0 || i >= this.rtsCMenuItems().length || x < 56 || x > 200) return;
    if (i === this.rtsCM.idx) this.rtsCMenuAct(i); else { this.rtsCM.idx = i; this.rtsCM.confirm = 0; Sound.play('select'); }
  },

  rtsCContinue(sv) {
    const C = this.rtsC = sv;
    if (C.phase === 'ending') this.rtsCToEnding();
    else if (C.phase === 'brief') this.rtsCToBrief();
    else this.rtsCToMap();
  },

  // ---------------------------------------------------------------- the intro
  rtsCToIntro() {
    this.rtsCI = { scene: 0, line: 0, hold: 0, st: 0 };
    this.rtsCIntroLine();
    this.setState('rtsCIntro');
  },
  rtsCIntroLine() {
    const I = this.rtsCI, S = RTS_C_INTRO[I.scene];
    I.talk = rtsCTalk(S.lines[I.line], 30, 3);
    I.talk.voice = S.who ? RTS_C_VOICE[S.who] : 0;
    I.talk.rate = 0.7;
    I.hold = 0;
  },
  rtsCIntroNext() {
    const I = this.rtsCI;
    I.line++;
    if (I.line >= RTS_C_INTRO[I.scene].lines.length) { I.scene++; I.line = 0; I.st = 0; if (I.scene >= RTS_C_INTRO.length) { this.rtsCToHouse(); return; } }
    this.rtsCIntroLine();
  },
  rtsCUpdIntro() {
    const I = this.rtsCI, m = rtsCInput();
    I.st++;
    if (m.cancel && this.t > 6) { Sound.play('select'); this.rtsCToHouse(); return; }
    if (I.st < 20) return;
    rtsCTalkTick(I.talk);
    if (rtsCTalkFull(I.talk)) I.hold++;
    if (m.ok) { if (!rtsCTalkFull(I.talk)) rtsCTalkSkip(I.talk); else this.rtsCIntroNext(); }
    else if (I.hold > 120) this.rtsCIntroNext();
  },
  rtsCPtrIntro() { const I = this.rtsCI; if (!rtsCTalkFull(I.talk)) rtsCTalkSkip(I.talk); else this.rtsCIntroNext(); },
  rtsCDrawIntro(ctx) {
    const I = this.rtsCI, S = RTS_C_INTRO[I.scene], st = I.st, t = this.t;
    ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, SW, SH);
    if (S.scene === 'space') {
      rtsCStars(ctx, 0, 0, SW, SH, t, 110);
      rtsCPlanet(ctx, 128, 92, 58, st / 500);
      ctx.fillStyle = '#C8B8A0'; ctx.beginPath(); ctx.arc(208 - st * 0.05, 40, 5, 0, 7); ctx.fill();
      ctx.fillStyle = '#806858'; ctx.beginPath(); ctx.arc(40 + st * 0.03, 150, 3, 0, 7); ctx.fill();
    } else if (S.scene === 'desert') {
      const wy = I.line === 1 ? (st - (I.wyStart || (I.wyStart = st))) / 170 : -1;
      if (I.line === 0) I.wyStart = 0;
      rtsCDesert(ctx, 0, 0, SW, 176, st, { wyrm: wy });
    } else if (S.scene === 'regent') {
      rtsCPortraitBg(ctx, 'regent', 0, 0, t); rtsCPortraitBg(ctx, 'regent', 160, 0, t);
      ctx.fillStyle = '#100418'; ctx.fillRect(96, 0, 64, 176);
      for (let k = 0; k < 8; k++) { ctx.fillStyle = k & 1 ? '#200C34' : '#180828'; ctx.fillRect(96 + k * 8, 0, 8, 176); }
      rtsCDrawAdvisor(ctx, 'regent', 80, 26, t, !rtsCTalkFull(I.talk), rtsCPal('regent'));
      Font.drawCenter(ctx, 'THE REGENT OF KHARRA', SW / 2, 8, '#C8A0F8');
      ctx.drawImage(rtsCHouseCrest('regent', 24), 20, 140); ctx.drawImage(rtsCHouseCrest('regent', 24), 212, 140);
    } else if (S.scene === 'houses') {
      rtsCDesert(ctx, 0, 0, SW, 176, st, { night: true });
      rtsCStars(ctx, 0, 0, SW, 50, t, 40);
      RTS_C_ORDER.forEach((h, k) => {
        const appear = I.line === 0 ? st - 40 - k * 40 : 999;
        if (appear < 0) return;
        const x = 32 + k * 80, y = 34 + Math.max(0, 20 - appear) * 2;
        ctx.drawImage(rtsCHouseCrest(h, 64), x - 8, y);
        Font.drawCenter(ctx, RTS_C_HOUSES[h].name, x + 24, y + 70, rtsCHC(h));
        if (I.line === 1) Font.drawCenter(ctx, RTS_C_HOUSES[h].tag.replace('THE ', ''), x + 24, y + 82, COL.lgrey);
      });
    } else {
      rtsCStars(ctx, 0, 0, SW, SH, t, 120);
      rtsCPlanet(ctx, 128, 230, 110, st / 1400);
      const k = Math.min(1, st / 80);
      const draw = (s, y, sc) => { const x = (SW - Font.bigWidth(s, sc)) >> 1; Font.big(ctx, s, x + 2, y + 2, sc, '#200800'); Font.big(ctx, s, x, y, sc, k < 1 && (st & 4) ? '#FCE8A0' : '#F0BC3C'); };
      if (st > 10) draw('DESERT', 30, 4);
      if (st > 40) draw('DOMINION', 66, 4);
    }
    // the words, typed into a box at the bottom
    if (st >= 20) {
      rtsCBox(ctx, 4, 178, SW - 8, 34, 'rgba(0,0,0,0.75)', '#5C3C10');
      rtsCTalkDraw(ctx, I.talk, 10, 183, S.who ? '#C8A0F8' : '#F8E0B0', 10);
    }
    if (st < 16) { ctx.fillStyle = 'rgba(0,0,0,' + (1 - st / 16).toFixed(2) + ')'; ctx.fillRect(0, 0, SW, SH); }
    Font.drawRight(ctx, 'B SKIP', SW - 4, 214, '#585858');
  },

  // ---------------------------------------------------------------- choose your House
  rtsCToHouse() {
    this.rtsCH = { idx: this.rtsCH ? this.rtsCH.idx : 0 };
    this.setState('rtsCHouse');
  },
  rtsCUpdHouse() {
    const H = this.rtsCH, m = rtsCInput();
    if (m.left || m.right) { H.idx = (H.idx + (m.left ? 2 : 1)) % 3; Sound.play('select'); }
    if (m.cancel && this.t > 8) { Sound.play('select'); this.rtsMenu(); return; }
    if (m.ok && this.t > 8) this.rtsCToHouseIntro(RTS_C_ORDER[H.idx]);
  },
  rtsCPtrHouse(x, y) {
    if (y < 24 || y > 130) return;
    const i = Math.max(0, Math.min(2, Math.floor(x / 85)));
    if (i === this.rtsCH.idx) this.rtsCToHouseIntro(RTS_C_ORDER[i]); else { this.rtsCH.idx = i; Sound.play('select'); }
  },
  rtsCDrawHouse(ctx) {
    const H = this.rtsCH, t = this.t;
    ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, SW, SH);
    rtsCDesert(ctx, 0, 0, SW, SH, t, { night: true });
    rtsCStars(ctx, 0, 0, SW, 60, t, 50);
    Font.drawCenter(ctx, 'CHOOSE YOUR HOUSE', SW / 2, 8, '#F0BC3C');
    RTS_C_ORDER.forEach((h, k) => {
      const on = k === H.idx, x = 10 + k * 82, pal = rtsCPal(h);
      if (on) { rtsCBox(ctx, x, 22, 72, 108, 'rgba(0,0,0,0.55)', (t >> 3) & 1 ? pal[0] : pal[1]); }
      const bob = on ? Math.round(Math.sin(t / 10) * 2) : 0;
      ctx.drawImage(rtsCHouseCrest(h, 64), x + 4, 28 + bob);
      if (!on) { ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(x + 4, 28, 64, 64); }
      Font.drawCenter(ctx, RTS_C_HOUSES[h].name, x + 36, 100, on ? pal[0] : '#808080');
      Font.drawCenter(ctx, RTS_C_HOUSES[h].tag.replace('THE ', ''), x + 36, 112, on ? COL.white : '#606060');
    });
    const h = RTS_C_ORDER[H.idx], D = RTS_C_HOUSES[h];
    rtsCBox(ctx, 8, 138, SW - 16, 56, 'rgba(0,0,0,0.7)', rtsCPal(h)[2]);
    Font.drawCenter(ctx, 'ADVISOR: ' + D.advisor, SW / 2, 144, '#F0BC3C');
    D.desc.forEach((s, k) => Font.drawCenter(ctx, s, SW / 2, 157 + k * 11, COL.white));
    const hall = rtsCHall();
    if (hall[h]) Font.drawCenter(ctx, 'KHARRA WON  SCORE ' + hall[h], SW / 2, 200, '#58D854');
    Font.drawCenter(ctx, 'ARROWS  A CHOOSE  B BACK', SW / 2, 213, '#C8A878');
  },

  // ---------------------------------------------------------------- the advisor introduces his House
  rtsCToHouseIntro(h) {
    Sound.play('select');
    const D = RTS_C_HOUSES[h], T = rtsCTalk(D.intro, 30, 6);
    T.voice = RTS_C_VOICE[D.adv];
    this.rtsCHI = { house: h, talk: T, choice: 0 };
    this.setState('rtsCHouseIntro');
  },
  rtsCHouseIntroPick(yes) {
    const I = this.rtsCHI;
    if (!yes) { Sound.play('select'); this.rtsCToHouse(); return; }
    Sound.play('pickup');
    this.rtsC = rtsCNew(I.house);
    rtsCSave(this.rtsC);
    this.rtsCToBrief();
  },
  rtsCUpdHouseIntro() {
    const I = this.rtsCHI, m = rtsCInput();
    rtsCTalkTick(I.talk);
    if (m.cancel && this.t > 8) { this.rtsCHouseIntroPick(false); return; }
    if (rtsCTalkDone(I.talk) && (m.left || m.right || m.up || m.down)) { I.choice ^= 1; Sound.play('select'); }
    if (m.ok && this.t > 8) { if (rtsCTalkOk(I.talk) && this.t > 8) this.rtsCHouseIntroPick(I.choice === 0); }
  },
  rtsCPtrHouseIntro(x, y) {
    const I = this.rtsCHI;
    if (!rtsCTalkDone(I.talk)) { rtsCTalkOk(I.talk); return; }
    if (y > 196) { const c = x < SW / 2 ? 0 : 1; if (c === I.choice) this.rtsCHouseIntroPick(c === 0); else { I.choice = c; Sound.play('select'); } }
  },
  rtsCDrawHouseIntro(ctx) {
    const I = this.rtsCHI, h = I.house, D = RTS_C_HOUSES[h], pal = rtsCPal(h), t = this.t;
    this.rtsCDrawPanel(ctx, h);
    rtsCDrawAdvisor(ctx, D.adv, 10, 18, t, !rtsCTalkFull(I.talk), pal);
    ctx.drawImage(rtsCHouseCrest(h, 64), 150, 18);
    Font.drawCenter(ctx, 'HOUSE ' + D.name, 182, 88, pal[0]);
    Font.drawCenter(ctx, D.advisor, 182, 100, '#F0BC3C');
    Font.drawCenter(ctx, D.tag, 182, 112, COL.lgrey);
    rtsCBox(ctx, 4, 136, SW - 8, 58, '#000000', pal[2]);
    rtsCTalkDraw(ctx, I.talk, 9, 140);
    if (rtsCTalkDone(I.talk)) {
      Font.drawCenter(ctx, 'SERVE HOUSE ' + D.name + '?', SW / 2, 198, COL.white);
      ['YES', 'NO'].forEach((s, k) => {
        const x = k ? 168 : 88, on = k === I.choice;
        if (on) { ctx.fillStyle = pal[2]; ctx.fillRect(x - 22, 208, 44, 11); }
        Font.drawCenter(ctx, s, x, 210, on ? COL.white : COL.lgrey);
      });
    } else Font.drawCenter(ctx, 'A NEXT  B BACK', SW / 2, 210, '#606060');
  },
  // the dark backdrop with a House's colour along the edges (the advisor screens)
  rtsCDrawPanel(ctx, h, tint) {
    const pal = rtsCPal(h);
    ctx.fillStyle = tint || '#080808'; ctx.fillRect(0, 0, SW, SH);
    for (let y = 0; y < SH; y += 2) { ctx.fillStyle = y % 4 ? '#0C0C0C' : '#101010'; if (!tint) ctx.fillRect(0, y, SW, 1); }
    ctx.fillStyle = pal[2]; ctx.fillRect(0, 0, SW, 2); ctx.fillRect(0, SH - 2, SW, 2);
  },

  // ---------------------------------------------------------------- the briefing
  rtsCToBrief() {
    const C = this.rtsC;
    if (!(C.region >= 0)) { this.rtsCToMap(); return; }
    C.phase = 'brief';
    rtsCSave(C);
    const foes = rtsCFoes(C, C.region), names = foes.filter(f => f !== 'regent').map(f => RTS_C_NAMES[f]);
    const text = rtsCFill(RTS_C_BRIEF[C.house][C.level - 1], { REGION: RTS_C_REGIONS[C.region].name, FOE: names[0] || 'THE ENEMY', FOE2: names[1] || names[0] || 'THE ENEMY' });
    const T = rtsCTalk(text, 30, 7);
    T.voice = RTS_C_VOICE[RTS_C_HOUSES[C.house].adv];
    this.rtsCBr = { talk: T, sel: 0, foes };
    this.setState('rtsCBrief');
  },
  rtsCBriefAct(i) {
    const B = this.rtsCBr;
    if (i === 0) { Sound.play('pickup'); this.rtsCLaunch(); }
    else if (i === 1) { Sound.play('select'); B.talk.page = 0; B.talk.shown = 0; }
    else { Sound.play('select'); rtsCSave(this.rtsC); this.rtsMenu(); }
  },
  rtsCUpdBrief() {
    const B = this.rtsCBr, m = rtsCInput();
    rtsCTalkTick(B.talk);
    if (m.cancel && this.t > 8) { if (!rtsCTalkDone(B.talk)) { rtsCTalkSkip(B.talk); Sound.play('select'); } else this.rtsCBriefAct(2); return; }
    if (rtsCTalkDone(B.talk) && (m.left || m.right)) { B.sel = (B.sel + (m.left ? 2 : 1)) % 3; Sound.play('select'); }
    if (m.ok && this.t > 8) { if (rtsCTalkDone(B.talk)) this.rtsCBriefAct(B.sel); else rtsCTalkOk(B.talk); }
  },
  rtsCPtrBrief(x, y) {
    const B = this.rtsCBr;
    if (!rtsCTalkDone(B.talk)) { rtsCTalkOk(B.talk); return; }
    if (y > 200) { const i = Math.max(0, Math.min(2, Math.floor((x - 8) / 80))); if (i === B.sel) this.rtsCBriefAct(i); else { B.sel = i; Sound.play('select'); } }
  },
  rtsCDrawBrief(ctx) {
    const C = this.rtsC, B = this.rtsCBr, h = C.house, D = RTS_C_HOUSES[h], pal = rtsCPal(h), t = this.t, R = RTS_C_REGIONS[C.region];
    this.rtsCDrawPanel(ctx, h);
    Font.draw(ctx, 'HOUSE ' + D.name, 6, 5, pal[0]);
    Font.drawRight(ctx, 'MISSION ' + C.level + ' OF 9', SW - 6, 5, '#F0BC3C');
    rtsCDrawAdvisor(ctx, D.adv, 10, 20, t, !rtsCTalkFull(B.talk), pal);
    // the column beside the advisor: the region, the enemy (and the NOMADS with you), the objective
    const x = 116;
    let y = 63;
    Font.draw(ctx, D.advisor, x, 20, '#F0BC3C');
    Font.draw(ctx, R.name.slice(0, 17), x, 33, COL.white);
    Font.draw(ctx, RTS_C_STYLE_NAME[C.level === 1 ? 'open' : R.style], x, 43, '#A08868');
    Font.draw(ctx, B.foes.length > 1 ? 'ENEMIES' : 'ENEMY', x, 54, '#808080');
    if (B.foes.length < 3) B.foes.forEach(f => { ctx.drawImage(rtsCHouseCrest(f, 16), x, y); Font.draw(ctx, RTS_C_NAMES[f], x + 20, y + 4, rtsCPal(f)[0]); y += 15; });
    else { B.foes.forEach((f, k) => ctx.drawImage(rtsCHouseCrest(f, 24), x + k * 28, y)); Font.draw(ctx, 'ALL', x + 88, y + 8, '#C8A0F8'); y += 26; }
    if (C.house === 'aquila' && C.level >= 7) { ctx.drawImage(rtsCHouseCrest('nomad', 16), x, y); Font.draw(ctx, 'NOMADS', x + 20, y + 4, rtsCPal('nomad')[0]); Font.draw(ctx, 'ALLY', x + 76, y + 4, '#808080'); y += 15; }
    y += 3;
    Font.draw(ctx, 'OBJECTIVE', x, y, '#808080');
    rtsCWrap(rtsCObjective(C.level, B.foes), 16).forEach((s, k) => Font.draw(ctx, s, x, y + 10 + k * 9, '#58D854'));
    rtsCBox(ctx, 4, 140, SW - 8, 64, '#000000', pal[2]);
    rtsCTalkDraw(ctx, B.talk, 9, 143);
    if (rtsCTalkDone(B.talk)) {
      ['START', 'REPEAT', 'MENU'].forEach((s, k) => {
        const bx = 8 + k * 80, on = k === B.sel;
        rtsCBox(ctx, bx, 207, 76, 13, on ? pal[2] : '#181818', on ? pal[0] : '#383838');
        Font.drawCenter(ctx, s, bx + 38, 210, on ? COL.white : COL.lgrey);
      });
    } else Font.drawCenter(ctx, 'A NEXT  B SKIP', SW / 2, 210, '#606060');
  },

  // the battle: CORE's engine (or the stand-in while it isn't loaded)
  rtsCLaunch() {
    const C = this.rtsC;
    C.phase = 'brief';
    rtsCSave(C);
    const opts = rtsCMissionOpts(C);
    this.rtsCLast = opts;
    Game.rtsStartMission(opts);
  },

  // ---------------------------------------------------------------- the end of a battle (CORE calls this)
  rtsMissionOver(result) {
    Sound.setEngine(0);
    this.mode = 'rts';
    this.applyLayout();
    const r = Object.assign({ win: false, time: 0, harvested: 0, unitsKilled: 0, unitsLost: 0, buildingsKilled: 0, buildingsLost: 0 }, result || {});
    if (r.quit) r.win = false;   // QUIT from the pause menu: the mission is lost (RETRY is offered)
    // what the enemy harvested (the engine reports each foe)
    if (r.enemyHarvested === undefined && Array.isArray(r.foes)) r.enemyHarvested = r.foes.reduce((a, f) => a + ((f && f.harvested) | 0), 0);
    const mi = r.mission || {}, C = this.rtsC;
    const camp = !!(mi.campaign && C && mi.level === C.level && mi.house === C.house);
    const level = camp ? C.level : mi.level || 5, score = rtsCScoreOf(r, level);
    let rankBefore = 0, rankAfter = 0, region = mi.region;
    if (camp) {
      rankBefore = rtsCRank(C.total);
      if (r.win) {
        C.scores[C.level - 1] = Math.max(C.scores[C.level - 1] || 0, score);
        C.times[C.level - 1] = r.time;
        C.total = C.scores.reduce((a, b) => a + (b | 0), 0);
        C.rank = rtsCRank(C.total);
        const from = C.owners[C.region], anim = [];
        if (from !== C.house) anim.push({ region: C.region, from, to: C.house });
        C.owners[C.region] = C.house;
        if (C.level >= 9) {
          // the whole world turns to you
          const d = rtsCDist([C.region]);
          RTS_C_REGIONS.map(R => R.i).filter(i => C.owners[i] !== C.house).sort((a, b) => d[a] - d[b]).forEach(i => { anim.push({ region: i, from: C.owners[i], to: C.house, dur: 14 }); C.owners[i] = C.house; });
          C.phase = 'ending';
        } else {
          C.level++;
          anim.push(...rtsCRivalMoves(C));
          C.phase = 'map';
          C.region = -1;
        }
        C.anim = anim;
      } else { C.losses = (C.losses | 0) + 1; C.phase = 'brief'; }
      rankAfter = rtsCRank(C.total);
      rtsCSave(C);
    }
    // a skirmish: the House and the foes of the battle that was played (CORE keeps its opts for RESTART)
    const so = !camp && this.rtsOpts ? this.rtsOpts : null;
    const H = camp ? C.house : (so && so.player && so.player.house) || mi.house || 'aquila';
    const D = RTS_C_HOUSES[H] || RTS_C_HOUSES.aquila;
    const foes = mi.foes || (so && so.foes ? so.foes.map(f => f.house) : Array.isArray(r.foes) ? r.foes.map(f => f.house) : []);
    const foeName = RTS_C_NAMES[foes.find(f => f !== 'regent') || foes[0]] || 'THE ENEMY';
    const T = rtsCTalk(rtsCFill(r.win ? D.win : D.lose, { REGION: mi.regionName || (RTS_C_REGIONS[region] || {}).name || 'THE REGION', FOE: foeName }), 30, 4);
    T.voice = RTS_C_VOICE[D.adv];
    this.rtsCR = { r, camp, score, house: H, foes, level, regionName: mi.regionName || '', rankBefore, rankAfter, talk: T, sel: 0, again: so };
    // the stinger (the engine's own end banner has played it already)
    const banner = this.stage && this.stage.rts && this.stage.done;
    if (!banner && !r.quit) { try { if (typeof rtsSting === 'function') rtsSting(r.win ? 'missionWon' : 'missionLost'); } catch (e) { /* no stinger */ } }
    this.setState('rtsCResult');
  },
  rtsCUpdResult() {
    const Q = this.rtsCR, m = rtsCInput();
    if (this.t > 40) rtsCTalkTick(Q.talk);
    if ((m.ok || m.cancel) && this.t > 30) { if (!rtsCTalkDone(Q.talk) && m.ok && Q.camp) rtsCTalkOk(Q.talk); else this.rtsCToScore(); }
  },
  rtsCPtrResult() { if (this.t > 30) { const Q = this.rtsCR; if (!rtsCTalkDone(Q.talk) && Q.camp) rtsCTalkOk(Q.talk); else this.rtsCToScore(); } },
  rtsCDrawResult(ctx) {
    const Q = this.rtsCR, t = this.t, win = Q.r.win, pal = rtsCPal(Q.house), D = RTS_C_HOUSES[Q.house];
    ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, SW, SH);
    if (win) {
      rtsCDesert(ctx, 0, 0, SW, SH, t);
      for (let k = 0; k < 5; k++) {   // fireworks in the House's colours
        const ph = (t + k * 37) % 90, fx = 30 + rtsCHash(k, Math.floor((t + k * 37) / 90), 3) * 196, fy = 20 + rtsCHash(k, Math.floor((t + k * 37) / 90), 4) * 40;
        if (ph > 60) continue;
        for (let a = 0; a < 10; a++) { ctx.fillStyle = pal[a % 3]; ctx.fillRect(Math.round(fx + Math.cos(a * 0.63) * ph * 0.5), Math.round(fy + Math.sin(a * 0.63) * ph * 0.5 + ph * ph / 400), 2, 2); }
      }
    } else {
      rtsCDesert(ctx, 0, 0, SW, SH, t, { night: true });
      ctx.fillStyle = 'rgba(80,0,0,0.35)'; ctx.fillRect(0, 0, SW, SH);
      for (let k = 0; k < 30; k++) { const ph = (t * 0.8 + k * 13) % 80, fx = 128 + (rtsCHash(k, 2, 5) - 0.5) * 120 + Math.sin((t + k * 9) / 12) * 3; ctx.fillStyle = ph < 30 ? '#F8D040' : ph < 55 ? '#E05010' : '#602010'; ctx.fillRect(Math.round(fx), Math.round(150 - ph), 2, 2); }
    }
    const big = win ? 'VICTORY' : Q.r.quit ? 'RETREAT' : 'DEFEAT', sc = 4, pop = Math.min(1, t / 20);
    if (pop >= 1 || (t & 2)) { const x = (SW - Font.bigWidth(big, sc)) >> 1; Font.big(ctx, big, x + 2, 10, sc, '#000000'); Font.big(ctx, big, x, 8, sc, win ? '#F0BC3C' : '#F83800'); }
    if (Q.camp) {
      rtsCDrawAdvisor(ctx, D.adv, 14, 46, t, !rtsCTalkFull(Q.talk) && t > 40, pal);
      ctx.drawImage(rtsCHouseCrest(Q.house, 64), 152, 50 + (win ? Math.round(Math.sin(t / 12) * 2) : 6));
      if (!win) { ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(152, 56, 64, 64); }
      Font.drawCenter(ctx, 'MISSION ' + Q.level, 184, 124, COL.white);
      Font.drawCenter(ctx, Q.regionName.slice(0, 17), 184, 136, '#F0BC3C');
      rtsCBox(ctx, 4, 166, SW - 8, 42, 'rgba(0,0,0,0.85)', pal[2]);
      if (t > 40) rtsCTalkDraw(ctx, Q.talk, 9, 170);
    } else {
      ctx.drawImage(rtsCHouseCrest(Q.house, 64), 96, 60);
      Font.drawCenter(ctx, win ? 'THE SANDS ARE YOURS' : Q.r.quit ? 'YOU LEFT THE BATTLEFIELD' : 'YOUR BASE HAS FALLEN', SW / 2, 140, COL.white);
    }
    if (t > 30 && (t >> 4) & 1) Font.drawCenter(ctx, 'PRESS A', SW / 2, 212, COL.lgrey);
  },

  // ---------------------------------------------------------------- the score
  rtsCToScore() {
    Sound.play('select');
    this.rtsCS = { k: 0, sel: 0 };
    this.setState('rtsCScore');
  },
  rtsCScoreOptions() {
    const Q = this.rtsCR;
    if (!Q.camp) return Q.again ? ['AGAIN', 'MENU'] : ['CONTINUE'];
    if (Q.r.win) return ['CONTINUE'];
    return Q.level >= 2 && Q.level <= 8 ? ['RETRY', 'NEW REGION', 'MENU'] : ['RETRY', 'MENU'];
  },
  rtsCScoreAct(i) {
    const Q = this.rtsCR, it = this.rtsCScoreOptions()[i], C = this.rtsC;
    Sound.play('select');
    if (!Q.camp) { if (it === 'AGAIN') Game.rtsStartMission(Q.again); else this.rtsMenu(); return; }
    if (it === 'CONTINUE') this.rtsCToMap();
    else if (it === 'RETRY') this.rtsCToBrief();
    else if (it === 'NEW REGION') { C.region = -1; C.phase = 'map'; rtsCSave(C); this.rtsCToMap(); }
    else { rtsCSave(C); this.rtsMenu(); }
  },
  rtsCUpdScore() {
    const S = this.rtsCS, m = rtsCInput(), n = this.rtsCScoreOptions().length;
    const before = Math.floor(S.k * 12);
    if (S.k < 4) S.k = Math.min(4, S.k + 1 / 70);
    if (Math.floor(S.k * 12) !== before && S.k < 4) Sound.play('tick');
    if ((m.left || m.right) && n > 1) { S.sel = (S.sel + (m.left ? n - 1 : 1)) % n; Sound.play('select'); }
    if (m.ok && this.t > 10) { if (S.k < 4) S.k = 4; else this.rtsCScoreAct(S.sel); }
    if (m.cancel && this.t > 10 && S.k >= 4) this.rtsCScoreAct(n - 1);
  },
  rtsCPtrScore(x, y) {
    const S = this.rtsCS, n = this.rtsCScoreOptions().length;
    if (S.k < 4) { S.k = 4; return; }
    if (y < 196) return;
    const i = Math.max(0, Math.min(n - 1, Math.floor(x / (SW / n))));
    if (i === S.sel) this.rtsCScoreAct(i); else { S.sel = i; Sound.play('select'); }
  },
  rtsCDrawScore(ctx) {
    const Q = this.rtsCR, S = this.rtsCS, r = Q.r, pal = rtsCPal(Q.house), t = this.t;
    const foe = Q.foes.find(f => f !== 'nomad') || 'drakon', fpal = rtsCPal(foe);
    ctx.fillStyle = '#0C0806'; ctx.fillRect(0, 0, SW, SH);
    for (let y = 0; y < SH; y += 4) { ctx.fillStyle = '#120C08'; ctx.fillRect(0, y, SW, 2); }
    ctx.fillStyle = pal[2]; ctx.fillRect(0, 0, SW, 2); ctx.fillRect(0, SH - 2, SW, 2);
    Font.drawCenter(ctx, Q.camp ? 'MISSION ' + Q.level + ' - ' + Q.regionName.slice(0, 18) : 'SKIRMISH', SW / 2, 6, pal[0]);
    const k0 = Math.min(1, S.k);
    Font.draw(ctx, 'SCORE', 8, 20, '#808080'); Font.draw(ctx, String(Math.round(Q.score * k0)), 56, 20, '#F0BC3C');
    Font.drawRight(ctx, rtsCTime(r.time), SW - 8, 20, COL.white);
    const C = this.rtsC, total = Q.camp && C ? C.total : Q.score, rk = Q.camp ? Q.rankAfter : rtsCRank(Q.score * 4);
    Font.draw(ctx, 'RANK', 8, 32, '#808080');
    Font.draw(ctx, RTS_C_RANKS[rk][0], 56, 32, COL.white);
    if (Q.camp && Q.rankAfter > Q.rankBefore && S.k >= 1 && (t >> 4) & 1) Font.drawRight(ctx, 'PROMOTED!', SW - 8, 32, '#58D854');
    const fh = r.enemyHarvested !== undefined ? r.enemyHarvested : r.foeHarvested;
    const rows = [['GLIMMER HARVESTED', r.harvested, fh], ['UNITS DESTROYED', r.unitsKilled, r.unitsLost], ['BUILDINGS DESTROYED', r.buildingsKilled, r.buildingsLost]];
    rows.forEach(([label, you, them], i) => {
      const y = 50 + i * 42, p = Math.max(0, Math.min(1, S.k - i));
      const max = Math.max(1, you | 0, them | 0);
      Font.draw(ctx, label, 8, y, '#F0BC3C');
      const bar = (yy, who, v, col, dark) => {
        Font.draw(ctx, who, 8, yy, '#A0A0A0');
        const w = Math.round(150 * Math.min(1, (v || 0) / max) * p);
        ctx.fillStyle = '#1C1C1C'; ctx.fillRect(56, yy, 150, 7);
        ctx.fillStyle = col; ctx.fillRect(56, yy, w, 7); ctx.fillStyle = dark; ctx.fillRect(56, yy + 5, w, 2);
        Font.drawRight(ctx, v === undefined || v === null ? '-' : String(Math.round(v * p)), SW - 8, yy, COL.white);
      };
      bar(y + 12, 'YOU', you, pal[1], pal[2]);
      bar(y + 23, 'ENEMY', them, fpal[1], fpal[2]);
    });
    if (Q.camp && C) { Font.draw(ctx, 'CAMPAIGN SCORE', 8, 178, '#808080'); Font.drawRight(ctx, String(total), SW - 8, 178, '#F0BC3C'); }
    const opts = this.rtsCScoreOptions();
    if (S.k >= 4) {
      if (opts.length === 1) { if ((t >> 4) & 1) Font.drawCenter(ctx, 'PRESS A', SW / 2, 206, COL.lgrey); }
      else opts.forEach((s, k) => {
        const w = SW / opts.length, bx = k * w + 4, on = k === S.sel;
        rtsCBox(ctx, bx, 202, w - 8, 14, on ? pal[2] : '#181818', on ? pal[0] : '#383838');
        Font.drawCenter(ctx, s, bx + (w - 8) / 2, 206, on ? COL.white : COL.lgrey);
      });
    }
  },

  // ---------------------------------------------------------------- the region map
  rtsCToMap() {
    const C = this.rtsC, anim = (C.anim || []).slice();
    delete C.anim;
    rtsCSave(C);
    const P = { anim, step: 0, k: 0, cands: [], sel: 0, final: C.phase === 'ending', wait: 0 };
    // until a step has played, its region still shows its old owner
    P.owners = () => { const o = C.owners.slice(); for (let i = anim.length - 1; i >= P.step; i--) o[anim[i].region] = anim[i].from; return o; };
    if (!anim.length) this.rtsCMapPick(P);
    this.rtsCMp = P;
    this.setState('rtsCMap');
  },
  rtsCMapPick(P) {
    const C = this.rtsC;
    if (P.final) { P.done = true; return; }
    P.cands = rtsCCandidates(C);
    P.sel = 0;
    P.picking = true;
  },
  rtsCMapConfirm() {
    const P = this.rtsCMp, C = this.rtsC, r = P.cands[P.sel];
    if (r === undefined) return;
    Sound.play('pickup');
    C.region = r;
    this.rtsCToBrief();
  },
  rtsCUpdMap() {
    const P = this.rtsCMp, m = rtsCInput();
    if (P.step < P.anim.length) {
      const a = P.anim[P.step], dur = a.dur || 70;
      P.k += 1 / dur;
      if (this.t % 6 === 0) Sound.play('tick');
      if (P.k >= 1 || (m.ok && this.t > 10)) { P.k = 0; P.step++; Sound.play(a.to === this.rtsC.house ? 'pickup' : 'select'); if (P.step >= P.anim.length) this.rtsCMapPick(P); }
      return;
    }
    if (P.done) { P.wait++; if ((m.ok && P.wait > 20) || P.wait > 240) this.rtsCToEnding(); return; }
    const n = P.cands.length;
    if (n && (m.left || m.up)) { P.sel = (P.sel + n - 1) % n; Sound.play('select'); }
    if (n && (m.right || m.down)) { P.sel = (P.sel + 1) % n; Sound.play('select'); }
    if (m.cancel && this.t > 8) { Sound.play('select'); rtsCSave(this.rtsC); this.rtsMenu(); return; }
    if (m.ok && this.t > 8) this.rtsCMapConfirm();
  },
  rtsCPtrMap(x, y) {
    const P = this.rtsCMp;
    if (P.step < P.anim.length) { P.k = 1; return; }
    if (P.done) { this.rtsCToEnding(); return; }
    const mx = x - 8, my = y - 18;
    if (mx < 0 || my < 0 || mx >= RTS_C_MW || my >= RTS_C_MH) return;
    const r = rtsCMapBuild().id[my * RTS_C_MW + mx], i = P.cands.indexOf(r);
    if (i < 0) return;
    if (i === P.sel) this.rtsCMapConfirm(); else { P.sel = i; Sound.play('select'); }
  },
  rtsCDrawMap(ctx) {
    const P = this.rtsCMp, C = this.rtsC, t = this.t, pal = rtsCPal(C.house), animating = P.step < P.anim.length;
    ctx.fillStyle = '#080604'; ctx.fillRect(0, 0, SW, SH);
    Font.draw(ctx, 'KHARRA', 8, 5, '#F0BC3C');
    Font.drawRight(ctx, P.final ? 'THE CONTEST IS OVER' : 'MISSION ' + C.level + ' OF 9', SW - 8, 5, pal[0]);
    const an = animating ? Object.assign({ k: P.k }, P.anim[P.step]) : null;
    rtsCPaintMap(ctx, 8, 18, C, t, { owners: P.owners(), anim: an, cands: animating ? [] : P.cands, sel: animating || P.done ? undefined : P.cands[P.sel] });
    // the legend: who holds how much
    const own = P.owners(), houses = [C.house].concat(rtsCRivals(C.house), ['regent']);
    houses.forEach((h, k) => {
      const n = own.filter(o => o === h).length, x = 14 + k * 62;
      ctx.drawImage(rtsCHouseCrest(h, 16), x, 157);
      ctx.fillStyle = rtsCPal(h)[h === C.house ? 0 : 1]; ctx.fillRect(x + 19, 161, 7, 7);
      Font.draw(ctx, 'X' + n, x + 29, 161, h === C.house ? COL.white : '#A0A0A0');
    });
    rtsCBox(ctx, 4, 174, SW - 8, 46, '#000000', pal[2]);
    if (animating) {
      const a = P.anim[P.step], R = RTS_C_REGIONS[a.region];
      Font.drawCenter(ctx, R.name, SW / 2, 180, '#F0BC3C');
      Font.drawCenter(ctx, (a.to === C.house ? 'TAKEN BY ' : 'SEIZED BY ') + (a.to === 'regent' ? 'THE REGENT' : 'HOUSE ' + RTS_C_NAMES[a.to]), SW / 2, 192, rtsCPal(a.to)[0]);
    } else if (P.done) {
      Font.drawCenter(ctx, 'KHARRA IS YOURS', SW / 2, 182, '#F0BC3C');
      Font.drawCenter(ctx, 'HOUSE ' + RTS_C_NAMES[C.house] + ' RULES THE SANDS', SW / 2, 196, pal[0]);
    } else if (P.cands.length) {
      const r = P.cands[P.sel], R = RTS_C_REGIONS[r], foes = rtsCFoes(C, r);
      Font.drawCenter(ctx, C.level === 1 ? 'YOUR HOME REGION' : 'SELECT YOUR NEXT REGION', SW / 2, 178, '#808080');
      Font.drawCenter(ctx, (P.sel + 1) + '. ' + R.name, SW / 2, 188, COL.white);
      const held = C.owners[r] === 'regent' ? 'THE REGENT' : RTS_C_NAMES[C.owners[r]];
      Font.drawCenter(ctx, held + ' - ' + RTS_C_STYLE_NAME[R.style], SW / 2, 198, rtsCPal(C.owners[r])[0]);
      if (foes.length > 1 && (t >> 5) & 1) Font.drawCenter(ctx, foes.length > 2 ? 'THE REGENT AND BOTH HOUSES' : 'BOTH HOUSES AT ONCE', SW / 2, 209, '#F87858');
      else Font.drawCenter(ctx, 'ARROWS  A ATTACK  B MENU', SW / 2, 209, '#686868');
    }
  },

  // ---------------------------------------------------------------- the ending and the credits
  rtsCToEnding() {
    const C = this.rtsC;
    C.phase = 'ending';
    rtsCSave(C);
    const T = rtsCTalk(RTS_C_EPILOGUE[C.house], 30, 6);
    T.voice = RTS_C_VOICE[RTS_C_HOUSES[C.house].adv];
    T.rate = 0.6;
    this.rtsCE = { talk: T };
    this.setState('rtsCEnding');
  },
  rtsCUpdEnding() {
    const E = this.rtsCE, m = rtsCInput();
    rtsCTalkTick(E.talk);
    if (m.cancel && this.t > 20) { this.rtsCToCredits(); return; }
    if (m.ok && this.t > 20 && rtsCTalkOk(E.talk)) this.rtsCToCredits();
  },
  rtsCPtrEnding() { if (this.t > 20 && rtsCTalkOk(this.rtsCE.talk)) this.rtsCToCredits(); },
  rtsCDrawEnding(ctx) {
    const C = this.rtsC, E = this.rtsCE, t = this.t, h = C.house, pal = rtsCPal(h);
    ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, SW, SH);
    rtsCDesert(ctx, 0, 0, SW, 124, t, { night: true });
    rtsCStars(ctx, 0, 0, SW, 40, t, 40);
    // the palace on the skyline, the House's banners on its towers
    const px = 128, py = 92;
    ctx.drawImage(rtsCPalace(h), px - 64, py - 64);
    for (let k = 0; k < 8; k++) if ((t + k * 41) % 160 > 20) { ctx.fillStyle = k % 3 ? '#F8D070' : '#F0A040'; ctx.fillRect(px - 34 + k * 9 + (k > 3 ? 4 : 0), py - 22, 2, 3); }
    for (const tx of [px - 48, px + 47]) for (let k = 0; k < 14; k++) { ctx.fillStyle = pal[k % 3 === 0 ? 0 : 1]; ctx.fillRect(tx + 1 + k, py - 62 + Math.round(Math.sin(t / 8 + k * 0.5) * 1.5), 1, 8); }
    if (h === 'drakon') {
      for (let k = 0; k < 40; k++) { const ph = (t * 0.7 + k * 11) % 60, fx = px - 60 + rtsCHash(k, 5, 2) * 120; ctx.fillStyle = ph < 20 ? '#F8D040' : ph < 40 ? '#E05010' : '#401010'; ctx.fillRect(Math.round(fx + Math.sin((t + k) / 9) * 2), Math.round(py + 6 - ph * 0.8), 2, 2); }
    } else {
      for (let k = 0; k < 6; k++) {
        const ph = (t + k * 31) % 100, fx = 30 + rtsCHash(k, Math.floor((t + k * 31) / 100), 6) * 196, fy = 12 + rtsCHash(k, Math.floor((t + k * 31) / 100), 7) * 30;
        if (ph > 70) continue;
        for (let a = 0; a < 12; a++) { ctx.fillStyle = a % 2 ? pal[0] : '#F0BC3C'; ctx.fillRect(Math.round(fx + Math.cos(a * 0.52) * ph * 0.4), Math.round(fy + Math.sin(a * 0.52) * ph * 0.4 + ph * ph / 500), 1, 1); }
      }
    }
    Font.drawCenter(ctx, 'HOUSE ' + RTS_C_NAMES[h] + ' RULES KHARRA', SW / 2, 128, pal[0]);
    rtsCBox(ctx, 4, 140, SW - 8, 62, '#000000', pal[2]);
    rtsCTalkDraw(ctx, E.talk, 9, 144);
    if (rtsCTalkDone(E.talk) && (t >> 4) & 1) Font.drawCenter(ctx, 'PRESS A', SW / 2, 210, COL.lgrey);
  },
  rtsCToCredits() {
    const C = this.rtsC;
    if (C && C.phase === 'ending') rtsCFinish(C);
    Sound.play('select');
    this.rtsCCr = { y: SH + 4, house: C ? C.house : 'aquila', total: C ? C.total : 0 };
    this.setState('rtsCCredits');
  },
  rtsCCreditsEnd() { this.rtsC = null; this.rtsMenu(); },
  rtsCUpdCredits() {
    const K = this.rtsCCr, m = rtsCInput();
    K.y -= (Input.heldDir && Input.heldDir() === 2) || m.ok ? 3 : 0.35;
    if (m.cancel && this.t > 20) { this.rtsCCreditsEnd(); return; }
    if (K.y < -RTS_C_CREDITS.length * 14 - 20) this.rtsCCreditsEnd();
  },
  rtsCPtrCredits() { if (this.t > 30) this.rtsCCreditsEnd(); },
  rtsCDrawCredits(ctx) {
    const K = this.rtsCCr, t = this.t;
    ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, SW, SH);
    rtsCStars(ctx, 0, 0, SW, SH, t, 120);
    rtsCPlanet(ctx, 238, 208, 36, t / 1200);
    const cols = { gold: '#F0BC3C', grey: '#909090', white: COL.white };
    RTS_C_CREDITS.forEach(([s, c], k) => {
      const y = Math.round(K.y + k * 14);
      if (y < -8 || y > SH) return;
      const txt = s.replace('{RANK}', RTS_C_RANKS[rtsCRank(K.total)][0]).replace('{SCORE}', String(K.total));
      Font.drawCenter(ctx, txt, SW / 2, y, cols[c] || rtsCPal(c)[0]);
      if (RTS_C_HOUSES[s.toLowerCase()]) { ctx.drawImage(rtsCHouseCrest(s.toLowerCase(), 16), 60, y - 4); ctx.drawImage(rtsCHouseCrest(s.toLowerCase(), 16), 180, y - 4); }
    });
  },

  // ---------------------------------------------------------------- the stand-in battle (no engine yet)
  rtsCStubStart(opts) {
    opts = Object.assign({ player: { house: 'aquila' }, foes: [], allies: [], reinforcements: [], tech: 9, worms: 1 }, opts || {});
    if (!opts.map) opts.map = rtsMapGen(Object.assign({ w: 64, h: 64, players: 1 + opts.foes.length, seed: 1, style: 'open' }, opts.mapOpts || {}));
    this.rtsCSt = { opts, thumb: rtsMapThumb(opts.map, 1) };
    this.setState('rtsCStub');
  },
  rtsCStubEnd(win) {
    const o = this.rtsCSt.opts, lv = (o.mission && o.mission.level) || 5, R = Math.random;
    const foeB = (o.foes || []).reduce((a, f) => a + (f.base || []).length, 0);
    const res = { win, mission: o.mission, time: Math.round((8 + lv * 3 + R() * 10) * 3600),
      harvested: win && o.objectives && o.objectives.harvest ? o.objectives.harvest + Math.round(R() * 400) : Math.round(800 + R() * 3000 * lv),
      enemyHarvested: Math.round(500 + R() * 2500 * lv), unitsKilled: win ? 4 + lv * 4 + Math.floor(R() * 8) : Math.floor(R() * 6),
      unitsLost: Math.floor(R() * (4 + lv * 2)) + (win ? 0 : 6), buildingsKilled: win ? Math.max(foeB, Math.floor(R() * 3)) : Math.floor(R() * 3),
      buildingsLost: win ? Math.floor(R() * 3) : 3 + Math.floor(R() * 6) };
    this.rtsMissionOver(res);
  },
  rtsCUpdStub() {
    const m = rtsCInput();
    if (this.t < 20) return;
    if (m.ok) this.rtsCStubEnd(true);
    else if (m.cancel) this.rtsCStubEnd(false);
  },
  rtsCPtrStub(x) { if (this.t > 20) this.rtsCStubEnd(x < SW / 2); },
  rtsCDrawStub(ctx) {
    const S = this.rtsCSt, o = S.opts, map = o.map, t = this.t;
    ctx.fillStyle = '#100C08'; ctx.fillRect(0, 0, SW, SH);
    Font.drawCenter(ctx, 'BATTLE SIMULATION', SW / 2, 4, '#F0BC3C');
    Font.drawCenter(ctx, (o.title || 'SKIRMISH').slice(0, 31), SW / 2, 14, COL.white);
    const sc = Math.max(1, Math.floor(112 / Math.max(map.w, map.h)));
    const mx = 8, my = 28;
    ctx.drawImage(S.thumb, mx, my, map.w * sc, map.h * sc);
    const dot = (side) => {
      if (!side) return;
      const c = rtsCPal(side.house)[0];
      for (const b of side.base || []) { const [w, h] = rtsMapBSize(b.key); ctx.fillStyle = '#000000'; ctx.fillRect(mx + b.x * sc - 1, my + b.y * sc - 1, w * sc + 2, h * sc + 2); ctx.fillStyle = c; ctx.fillRect(mx + b.x * sc, my + b.y * sc, w * sc, h * sc); }
      for (const u of side.units || []) { ctx.fillStyle = (t >> 3) & 1 ? '#FFFFFF' : c; ctx.fillRect(mx + u.x * sc, my + u.y * sc, sc, sc); }
    };
    dot(o.player); (o.foes || []).forEach(dot); (o.allies || []).forEach(dot);
    const x = 8 + map.w * sc + 8;
    let y = 30;
    const line = (s, c) => { Font.draw(ctx, String(s).slice(0, Math.floor((SW - x) / 8)), x, y, c || COL.lgrey); y += 10; };
    line('MAP ' + map.w + 'X' + map.h, COL.white);
    line((RTS_C_STYLE_NAME[map.style] || map.style || '').slice(0, 14));
    line('TECH ' + o.tech + ' WYRMS ' + o.worms);
    const nm = h => (RTS_C_NAMES[h] || String(h).toUpperCase()).replace('THE ', '').slice(0, 7);
    line('YOU ' + (o.player.base || []).length + 'B ' + (o.player.units || []).length + 'U', rtsCPal(o.player.house)[0]);
    for (const f of o.foes || []) line(nm(f.house) + ' ' + (f.base || []).length + 'B ' + (f.units || []).length + 'U', rtsCPal(f.house)[0]);
    for (const f of o.foes || []) line(nm(f.house) + ' AI ' + (f.ai === undefined ? '-' : f.ai), rtsCPal(f.house)[1]);
    for (const a of o.allies || []) line('ALLY ' + nm(a.house), rtsCPal(a.house)[0]);
    line((o.reinforcements || []).length + ' REINF.');
    Font.drawCenter(ctx, (o.objectiveText || 'DESTROY THE ENEMY').slice(0, 31), SW / 2, 158, '#58D854');
    Font.drawCenter(ctx, 'THE BATTLE ENGINE IS NOT LOADED', SW / 2, 174, '#808080');
    Font.drawCenter(ctx, 'A: WIN THE BATTLE', SW / 2, 192, (t >> 4) & 1 ? COL.white : COL.lgrey);
    Font.drawCenter(ctx, 'B: LOSE IT', SW / 2, 204, COL.lgrey);
  },
});

// until the engine is in, a stand-in battle that gives a result on a key
if (typeof Game.rtsStartMission !== 'function') { Game.rtsStartMission = function (opts) { return this.rtsCStubStart(opts); }; Game.rtsStartMission.stub = true; }

// the campaign's screens in the game's dispatch: update, draw (in the menus' 256x224 frame), mouse / touch, music
(() => {
  const update = Game.update, renderState = Game.renderState, pointer = Game.pointer, musicFrame = Game.musicFrame;
  Game.update = function () {
    const f = RTS_C_SCREENS[this.state];
    if (f && Net.role !== 'client') { this.t++; this[f[0]](); return; }
    return update.apply(this, arguments);
  };
  Game.renderState = function (ctx) {
    const f = RTS_C_SCREENS[this.state];
    if (f) { this[f[1]](ctx); return; }
    return renderState.apply(this, arguments);
  };
  Game.pointer = function (x, y) {
    const f = RTS_C_SCREENS[this.state];
    if (f) { Sound.unlock(); if (f[2]) this[f[2]](x - menuOX(), y - menuOY()); return; }
    return pointer.apply(this, arguments);
  };
  // the front end's tunes (the first of each list that exists), the House's theme where it fits
  const has = k => k && typeof SONGS !== 'undefined' && SONGS[k];
  Game.musicFrame = function () {
    const s = this.state;
    if (RTS_C_SCREENS[s]) {
      const C = this.rtsC, th = C ? RTS_C_HOUSES[C.house].theme : null, Q = this.rtsCR;
      const want = {
        rtsCMenu: ['rtsMenu', 'rtsIntro', 'bigmaps'], rtsCIntro: ['rtsIntro', 'bigmaps'], rtsCHouse: ['rtsMenu', 'bigmaps'],
        rtsCHouseIntro: [this.rtsCHI && RTS_C_HOUSES[this.rtsCHI.house].theme, 'rtsBrief', 'bigmaps'],
        rtsCBrief: [C && C.level === 9 ? 'rtsRegent' : 'rtsBrief', 'rtsBrief', th, 'maze'], rtsCMap: ['rtsMap', 'maze'],
        rtsCStub: [th, 'rtsPeace1', 'bigmaps'], rtsCResult: Q && Q.r.win ? ['rtsWin', 'victory'] : ['rtsLose', 'bossDeep'],
        rtsCScore: ['rtsScore', Q && Q.r.win ? 'rtsWin' : 'rtsLose', 'victory'], rtsCEnding: [th, 'rtsWin', 'ending'], rtsCCredits: ['rtsIntro', 'ending'],
      }[s] || [];
      Music.want(want.find(has) || null, Music.skillLevel(), false);
      return;
    }
    if (musicFrame) return musicFrame.apply(this, arguments);
  };
})();
