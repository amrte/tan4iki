'use strict';
// =====================================================================
//  TANK RALLY: the career between the races (the races are rally.js, the tracks rallytracks.js)
//    - your tank: one of four chassis (RALLY_CHASSIS) and its upgrades (RALLY_UPGRADES): engine, tracks, armour and
//      suspension (levels 0-3), and the charges a lap of the forward weapon, the rear drop and the boost.
//      rallyLoadout(racer) turns them into the numbers a race runs on. A new chassis comes with no upgrades.
//    - the rivals (RALLY_RIVALS): eight drivers with a face, a style and a tank of their own that gets better the
//      further you go. Three race against you (two with a 2nd player).
//    - the career: every world (RALLY_WORLDS) has a division B and a division A of 4 races on its tracks. Points
//      4-2-1-0 a race; enough of them moves you up, else you race the division again (a bad division A drops you
//      to B). Division A of the last world leads to the champion race against the reigning champion.
//    - money for the place, every kill and what you pick up on the track, spent in the shop.
//    - screens: CONTINUE / NEW CAREER, the start (colour and first tank), the division, the shop, the rivals before
//      a race, the results (podium, payouts), the end of a division, the champion.
//  Saved after every race and shop visit (STORE 'tank1990_rally'). 2 players at one computer share the career, each
//  with their own tank, money and points.
// =====================================================================

const RALLY_KEY = 'tank1990_rally';
const RALLY_POINTS = [4, 2, 1, 0];
const RALLY_PAY = [6000, 3500, 2000, 800];   // money by place, x the division's pay factor
const RALLY_KILL_PAY = 750;
const RALLY_RACES = 4;   // races in a division (the champion race is one)
const RALLY_START_MONEY = 3000;
const RALLY_STUB_TIME = 150;   // the stand-in race (no engine loaded) lasts this long
// the dollar sign the font lacks (Font.init reads it at boot)
if (!FONT_SRC.$) FONT_SRC.$ = ['..X..', '.XXXX', 'X.X..', '.XXX.', '..X.X', 'XXXX.', '..X..'];

// ------------------------------------------------------------------ tanks
// speedUp / accelUp: what each engine level adds; from: the world it's on sale from; upPrice: what its upgrades cost
const RALLY_CHASSIS = {
  scout: { name: 'SCOUT', spec: 'e1', price: 5000, start: true, from: 0, upPrice: 800, desc: 'LIGHT AND QUICK, THIN SKIN',
    topSpeed: 1.35, accel: 0.055, grip: 0.55, armor: 2, susp: 0, speedUp: 0.13, accelUp: 0.007,
    fwd: { kind: 'cannon', charges: 2, dmg: 1 }, drop: { kind: 'oil', charges: 1 }, boost: 2 },
  brawler: { name: 'BRAWLER', spec: 'p2', price: 7000, start: true, from: 0, upPrice: 1000, desc: 'MISSILES AND MINES',
    topSpeed: 1.2, accel: 0.048, grip: 0.62, armor: 3, susp: 0, speedUp: 0.12, accelUp: 0.006,
    fwd: { kind: 'missile', charges: 2, dmg: 2 }, drop: { kind: 'mine', charges: 2 }, boost: 1 },
  heavy: { name: 'BULWARK', spec: 'e3', price: 30000, from: 0, upPrice: 2400, desc: 'THICK ARMOUR, A BIG GUN',
    topSpeed: 1.3, accel: 0.042, grip: 0.7, armor: 5, susp: 1, speedUp: 0.14, accelUp: 0.006,
    fwd: { kind: 'cannon', charges: 3, dmg: 2 }, drop: { kind: 'mine', charges: 2 }, boost: 1 },
  hover: { name: 'HOVER', spec: 'e10', price: 75000, from: 2, upPrice: 5000, desc: 'FLOATS OVER THE ROUGH',
    topSpeed: 1.65, accel: 0.062, grip: 0.45, armor: 4, susp: 2, speedUp: 0.18, accelUp: 0.008,
    fwd: { kind: 'laser', charges: 3, dmg: 2 }, drop: { kind: 'smoke', charges: 2 }, boost: 2 },
};
const RALLY_CHASSIS_ORDER = ['scout', 'brawler', 'heavy', 'hover'];
// cost: x the chassis' upPrice, x RALLY_LV_COST for the level bought; gear: charges a lap
const RALLY_UPGRADES = {
  engine: { name: 'ENGINE', cost: 1.4, desc: 'TOP SPEED AND PICK-UP' },
  tracks: { name: 'TRACKS', cost: 1, desc: 'GRIP: LESS SLIDE IN CORNERS' },
  armor: { name: 'ARMOUR', cost: 1.2, desc: 'ONE MORE HIT TO WRECK YOU' },
  susp: { name: 'SUSPENSION', cost: 0.8, desc: 'ROUGH GROUND AND LANDINGS' },
  fwd: { name: 'WEAPON', cost: 0.6, gear: true, desc: '+1 SHOT EVERY LAP' },
  drop: { name: 'DROP', cost: 0.45, gear: true, desc: '+1 DROP EVERY LAP' },
  boost: { name: 'BOOST', cost: 0.5, gear: true, desc: '+1 BOOST EVERY LAP' },
};
const RALLY_UP_KEYS = Object.keys(RALLY_UPGRADES);
const RALLY_LV_COST = [1, 2, 3.5];
const RALLY_SHORT_NAME = { cannon: 'CANNON', missile: 'MISSILE', laser: 'LASER', mine: 'MINES', oil: 'OIL', smoke: 'SMOKE' };
const RALLY_KIND_NAME = { cannon: 'CANNON', missile: 'MISSILES', laser: 'LASER', mine: 'MINES', oil: 'OIL SLICK', smoke: 'SMOKE' };
const rallyBlankUp = () => ({ engine: 0, tracks: 0, armor: 0, susp: 0, fwd: 0, drop: 0, boost: 0 });
// the most levels a part can take on a chassis (suspension tops out at 3 in all)
const rallyMaxLv = (chassis, key) => (key === 'susp' ? 3 - (RALLY_CHASSIS[chassis] || RALLY_CHASSIS.scout).susp : 3);

// a palette for a tank sprite in three colours (an enemy sprite's own accent colours past three are kept)
function rallyPal(spec, cols) {
  const key = 'rally_' + spec + '_' + cols.join('').replace(/#/g, '');
  if (!PALS[key]) {
    const e = spec[0] === 'e' && ENEMY[+spec.slice(1)], own = PALS[(e && e.pal) || 'silver'] || [];
    PALS[key] = [null].concat(cols, own.slice(4));
  }
  return key;
}

// what a race runs on: a career racer ({ chassis, up, color } or a rival's { chassis, up, cols }) -> the loadout
function rallyLoadout(racer) {
  racer = racer || {};
  if (racer.loadout && !racer.chassis) return racer.loadout;
  const key = RALLY_CHASSIS[racer.chassis] ? racer.chassis : 'scout', ch = RALLY_CHASSIS[key], up = racer.up || {};
  const lv = k => Math.max(0, Math.min(rallyMaxLv(key, k), up[k] | 0));
  const cols = racer.cols || TANK_COLORS[racer.color] || TANK_COLORS.YELLOW;
  const r3 = v => Math.round(v * 1000) / 1000;
  return {
    chassis: key, name: ch.name, spec: ch.spec, pal: rallyPal(ch.spec, cols),
    topSpeed: r3(ch.topSpeed + ch.speedUp * lv('engine')),
    accel: r3(ch.accel + ch.accelUp * lv('engine')),
    grip: r3(Math.min(1, ch.grip + 0.1 * lv('tracks'))),
    armor: ch.armor + lv('armor'),
    susp: Math.min(3, ch.susp + lv('susp')),
    fwd: { kind: ch.fwd.kind, charges: ch.fwd.charges + lv('fwd'), dmg: ch.fwd.dmg },
    drop: { kind: ch.drop.kind, charges: ch.drop.charges + lv('drop') },
    boost: ch.boost + lv('boost'),
  };
}

// ------------------------------------------------------------------ the rivals
// plan: the chassis from that share of the career on; focus: the parts they upgrade first (+) or last (-);
// skill: 0-4 at the start (it rises to the end); kind: what they are, on the rival screen
const RALLY_RIVALS = [
  { id: 'vex', name: 'VEX ORRIN', kind: 'ALIEN', style: 'aggressive', skill: 1, cols: ['#B8F818', '#38A800', '#004000'],
    plan: [[0, 'scout'], [0.4, 'brawler'], [0.75, 'hover']], focus: { engine: 1, armor: -1 },
    face: { bg: '#0C2C00', skin: '#58D854', shade: '#00A800', shape: 'dome', eyes: 'three', eyeCol: '#F83800', top: 'crest', topCol: '#F8B800', mouth: 'grin' },
    taunts: ['THREE EYES ON THE ROAD AND ONE ON YOU', 'I EAT ROOKIES FOR BREAKFAST', 'STAY IN MY MIRRORS, KID'] },
  { id: 'duke', name: 'DUKE RUSTOV', kind: 'HUMAN', style: 'dirty', skill: 1, cols: ['#F8D878', '#AC7C00', '#503000'],
    plan: [[0, 'brawler'], [0.55, 'heavy']], focus: { armor: 1, fwd: 1 },
    face: { bg: '#3C1800', skin: '#F8B890', shade: '#C87850', shape: 'square', eyes: 'patch', eyeCol: '#0058F8', top: 'bald', hairCol: '#7C3800', mouth: 'smirk', extra: ['mustache', 'scar'], ears: true },
    taunts: ['MY MINES ALREADY KNOW YOUR NAME', 'A LITTLE OIL NEVER HURT ANYBODY. MUCH.', 'RULES? I SOLD THEM FOR SCRAP'] },
  { id: 'mira', name: 'MIRA FLINT', kind: 'HUMAN', style: 'clean', skill: 2, cols: ['#F8F8F8', '#3CBCFC', '#0058F8'],
    plan: [[0, 'scout'], [0.6, 'hover']], focus: { tracks: 1, engine: 1, fwd: -1 },
    face: { bg: '#00205C', skin: '#FCD8A8', shade: '#D89C70', shape: 'round', eyes: 'two', eyeCol: '#008888', top: 'helmet', topCol: '#F8F8F8', topShade: '#BCBCBC', stripe: '#0078F8', mouth: 'smile' },
    taunts: ['MAY THE BEST TANK WIN. THAT WILL BE ME.', 'CLEAN LINES, FAST TIMES', 'SEE YOU AT THE FINISH. FROM AHEAD.'] },
  { id: 'grundle', name: 'GRUNDLE', kind: 'ALIEN', style: 'dirty', skill: 0, cols: ['#E8C8FC', '#9C54FC', '#4428BC'],
    plan: [[0, 'brawler'], [0.3, 'heavy']], focus: { armor: 2, engine: -1 },
    face: { bg: '#2C0C3C', skin: '#B898D8', shade: '#7C5CA0', shape: 'wide', eyes: 'slit', eyeCol: '#F8D800', top: 'bumps', mouth: 'tusks' },
    taunts: ['GRUNDLE SMASH SHINY TANK!', 'GRUNDLE NOT NEED BRAKES', 'YOU SMALL. GRUNDLE BIG. YOU GO BOOM.'] },
  { id: 'zep', name: 'ZEP-9', kind: 'ROBOT', style: 'clean', skill: 2, cols: ['#C0FCFC', '#00C8D8', '#005860'],
    plan: [[0, 'scout'], [0.45, 'heavy'], [0.8, 'hover']], focus: { tracks: 1, susp: 1 },
    face: { bg: '#00303C', skin: '#BCBCBC', shade: '#7C7C7C', shape: 'square', eyes: 'led', eyeCol: '#3CFCFC', top: 'antenna', mouth: 'grill' },
    taunts: ['YOUR DEFEAT IS 97.6% LIKELY', 'OPTIMAL RACING LINE LOADED', 'I DO NOT SWEAT. I DO NOT LOSE.'] },
  { id: 'kat', name: 'KAT VOLTA', kind: 'HUMAN', style: 'aggressive', skill: 1, cols: ['#FCD0F0', '#F878C8', '#940084'],
    plan: [[0, 'scout'], [0.5, 'brawler'], [0.85, 'hover']], focus: { engine: 2, boost: 1, armor: -1 },
    face: { bg: '#4C0018', skin: '#F0B088', shade: '#B87048', shape: 'long', eyes: 'two', eyeCol: '#58D854', top: 'mohawk', topCol: '#F83800', mouth: 'grin', extra: ['goggles'], ears: true },
    taunts: ['OUT OF MY WAY OR UNDER MY TRACKS!', 'BRAKES ARE FOR QUITTERS', 'THE LAST ONE WHO PASSED ME IS STILL SPINNING'] },
  { id: 'skitter', name: 'SKITTER', kind: 'ALIEN', style: 'dirty', skill: 1, cols: ['#F8E8A0', '#C8A830', '#4C3C00'],
    plan: [[0, 'scout'], [0.5, 'brawler']], focus: { drop: 2, susp: 1 },
    face: { bg: '#1C2800', skin: '#C8A830', shade: '#886C10', shape: 'long', eyes: 'bug', eyeCol: '#D82800', eyeShade: '#880000', top: 'antennae', mouth: 'mandible' },
    taunts: ['CLICK CLICK... BOOM', 'SKITTER LEAVES LITTLE GIFTS BEHIND', 'THE TRACK IS MY WEB'] },
  // the reigning champion: only in the champion race
  { id: 'kragg', name: 'BARON KRAGG', kind: 'CHAMPION', style: 'aggressive', skill: 2, boss: true, cols: ['#F8B800', '#D82800', '#500000'],
    plan: [[0, 'heavy'], [0.5, 'hover']], focus: { engine: 2, armor: 2, tracks: 2 },
    face: { bg: '#200008', skin: '#8C78B8', shade: '#584880', shape: 'long', eyes: 'slit', eyeCol: '#F83800', top: 'horns', topCol: '#F8E8C8', topShade: '#B8A890', mouth: 'fangs', extra: ['cape'] },
    taunts: ['NO ONE HAS EVER TAKEN MY CROWN', 'KNEEL NOW AND SAVE YOUR ARMOUR', 'YOU CAME A LONG WAY TO LOSE'] },
];
const rallyRival = id => RALLY_RIVALS.find(r => r.id === id);
const RALLY_STYLE_COL = { aggressive: '#F83800', clean: '#3CBCFC', dirty: '#C8A830' };

// a rival's tank at a point of the career (frac 0..1): the chassis of their plan, upgrades as far as they've got
function rallyRivalCar(r, frac) {
  let chassis = r.plan[0][1], since = 0;
  for (const [f, c] of r.plan) if (frac >= f) { chassis = c; since = f; }
  const up = rallyBlankUp(), base = Math.floor((frac - since) * 5 + frac * 2);
  for (const k of RALLY_UP_KEYS) up[k] = Math.max(0, Math.min(rallyMaxLv(chassis, k), base + ((r.focus || {})[k] || 0)));
  return { chassis, up, cols: r.cols };
}
const rallyRivalSkill = (r, frac) => Math.max(0, Math.min(4, Math.round(r.skill + frac * 2.5)));

// a rival's portrait (32x32): a head on shoulders in the racing suit, drawn from the face's parts
const RALLY_FACES = {};
function rallyFace(r) {
  if (RALLY_FACES[r.id]) return RALLY_FACES[r.id];
  const f = r.face, S = 32, G = [];
  for (let y = 0; y < S; y++) G.push(new Array(S).fill(null));
  const put = (x, y, c) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < S && y < S) G[y][x] = c; };
  const box = (x, y, w, h, c) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) put(x + i, y + j, c); };
  const oval = (cx, cy, rx, ry, c, sh, yMax = S) => {
    for (let y = 0; y < Math.min(S, yMax); y++) for (let x = 0; x < S; x++) {
      const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
      if (dx * dx + dy * dy <= 1) put(x, y, sh && dx > 0.4 ? sh : c);
    }
  };
  const line = (x0, y0, x1, y1, c) => { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1); for (let k = 0; k <= n; k++) put(x0 + (x1 - x0) * k / n, y0 + (y1 - y0) * k / n, c); };
  const [c1, c2, c3] = r.cols, ex = f.extra || [];
  // shoulders in the racing suit, a collar, the neck
  oval(16, 33, 14, 9, c2, c3);
  box(11, 24, 10, 2, c1);
  box(13, 19, 6, 5, f.shade);
  if (ex.includes('cape')) { for (let k = 0; k < 5; k++) { box(5 + k, 22 - k, 2, 4, '#F8B800'); box(25 - k, 22 - k, 2, 4, '#AC7C00'); } box(10, 24, 12, 2, '#F8B800'); }
  // the head; ey / my: where the eyes and the mouth go
  const SH = { round: [8, 12, 18], long: [7, 11, 18], wide: [10.5, 13, 18], dome: [9.5, 12, 17], square: [8, 10, 16] }[f.shape];
  const [rx, ey, my] = SH;
  if (f.shape === 'round') oval(16, 13, 8, 9, f.skin, f.shade);
  else if (f.shape === 'long') oval(16, 12.5, 7, 10.5, f.skin, f.shade);
  else if (f.shape === 'wide') oval(16, 14, 10.5, 8, f.skin, f.shade);
  else if (f.shape === 'dome') { oval(16, 10.5, 9.5, 8.5, f.skin, f.shade); oval(16, 15.5, 6.5, 5.5, f.skin, f.shade); }
  else { box(8, 3, 16, 17, f.skin); box(20, 3, 4, 17, f.shade); for (const [x, y] of [[8, 3], [23, 3], [8, 19], [23, 19]]) put(x, y, null); }
  if (f.ears) { box(16 - rx - 1, ey, 2, 4, f.skin); box(16 + rx - 1, ey, 2, 4, f.shade); }
  // on top
  const tc = f.topCol, ts = f.topShade || tc;
  if (f.top === 'crest') { box(15, 0, 2, 6, tc); box(14, 1, 1, 5, tc); box(17, 2, 1, 4, tc); box(13, 3, 1, 3, tc); box(18, 4, 1, 2, tc); }
  else if (f.top === 'helmet') {
    oval(16, 11, 10, 10, tc, ts, ey - 1);
    box(15, 1, 2, ey - 2, f.stripe); box(6, ey - 2, 20, 1, '#505050');
    box(7, ey - 1, 2, 7, tc); box(23, ey - 1, 2, 7, ts);
  } else if (f.top === 'mohawk') { box(14, 0, 4, 4, tc); box(15, 0, 2, 1, '#F8B800'); box(13, 1, 1, 2, tc); box(18, 1, 1, 2, tc); }
  else if (f.top === 'antenna') { box(16, 0, 1, 3, '#7C7C7C'); box(15, 0, 3, 1, f.eyeCol); box(11, 3, 10, 1, f.shade); }
  else if (f.top === 'antennae') { line(13, 3, 9, 0, f.shade); line(19, 3, 23, 0, f.shade); box(8, 0, 2, 2, f.eyeCol); box(23, 0, 2, 2, f.eyeCol); }
  else if (f.top === 'horns') {
    for (const [x, y] of [[9, 4], [8, 3], [7, 2], [7, 1], [6, 0]]) { box(x, y, 2, 1, tc); box(31 - x - 1, y, 2, 1, ts); }
    box(8, 5, 3, 1, tc); box(21, 5, 3, 1, ts);
  } else if (f.top === 'bumps') { box(12, 8, 2, 1, f.shade); box(18, 8, 2, 1, f.shade); box(15, 7, 2, 1, f.shade); }
  // eyes
  const W = '#F8F8F8', ec = f.eyeCol;
  if (f.eyes === 'two') { box(11, ey, 3, 2, W); box(13, ey, 1, 2, ec); box(18, ey, 3, 2, W); box(18, ey, 1, 2, ec); box(11, ey - 2, 3, 1, '#502800'); box(18, ey - 2, 3, 1, '#502800'); }
  else if (f.eyes === 'patch') { box(10, ey - 1, 5, 3, '#101010'); line(14, ey - 1, 23, ey - 5, '#101010'); box(18, ey, 3, 2, W); box(18, ey, 1, 2, ec); box(17, ey - 2, 4, 1, f.hairCol); }
  else if (f.eyes === 'three') { for (const [x, y] of [[10, ey], [15, ey - 2], [20, ey]]) { box(x, y, 2, 2, ec); put(x, y, W); } }
  else if (f.eyes === 'slit') { box(11, ey, 4, 2, ec); box(17, ey, 4, 2, ec); box(13, ey, 1, 2, '#000000'); box(18, ey, 1, 2, '#000000'); line(10, ey - 3, 14, ey - 1, '#200020'); line(21, ey - 3, 17, ey - 1, '#200020'); }
  else if (f.eyes === 'bug') {
    oval(12, ey + 1, 3.5, 4, ec, f.eyeShade); oval(20, ey + 1, 3.5, 4, ec, f.eyeShade);
    for (let y = ey - 2; y < ey + 5; y += 2) for (let x = 9; x < 24; x += 2) if (G[y][x] === ec) put(x, y, f.eyeShade);
    put(11, ey - 1, W); put(19, ey - 1, W);
  } else if (f.eyes === 'led') { box(10, ey, 4, 2, ec); box(18, ey, 4, 2, ec); put(11, ey, W); put(19, ey, W); }
  // mouth
  const D = '#300000';
  if (f.mouth === 'grin') { box(13, my, 6, 2, D); box(14, my, 4, 1, W); put(12, my - 1, D); put(19, my - 1, D); }
  else if (f.mouth === 'smile') { box(14, my, 4, 1, '#A82000'); put(13, my - 1, '#A82000'); put(18, my - 1, '#A82000'); }
  else if (f.mouth === 'smirk') { box(14, my, 4, 1, D); put(18, my - 1, D); }
  else if (f.mouth === 'tusks') { box(11, my, 10, 1, '#200000'); box(11, my - 2, 1, 2, '#F8F8D8'); box(20, my - 2, 1, 2, '#F8F8D8'); }
  else if (f.mouth === 'grill') { box(11, my - 1, 10, 3, '#505050'); for (let x = 12; x < 21; x += 2) box(x, my - 1, 1, 3, '#202020'); }
  else if (f.mouth === 'mandible') { box(12, my, 2, 3, '#4C3000'); box(18, my, 2, 3, '#4C3000'); put(14, my + 3, '#4C3000'); put(17, my + 3, '#4C3000'); }
  else if (f.mouth === 'fangs') { box(13, my, 6, 1, '#200000'); put(14, my + 1, W); put(17, my + 1, W); }
  if (ex.includes('mustache')) { box(11, my - 2, 10, 2, f.hairCol); put(11, my, f.hairCol); put(20, my, f.hairCol); }
  if (ex.includes('scar')) line(19, ey + 3, 22, my - 3, '#C83C3C');
  if (ex.includes('goggles')) { box(10, ey - 5, 5, 3, '#505050'); box(17, ey - 5, 5, 3, '#505050'); box(11, ey - 4, 3, 1, '#3CBCFC'); box(18, ey - 4, 3, 1, '#3CBCFC'); }
  // a dark outline round it all, on a striped backdrop
  const c = makeCanvas(S, S), g = c.getContext('2d');
  g.fillStyle = f.bg; g.fillRect(0, 0, S, S);
  g.fillStyle = 'rgba(255,255,255,0.08)';
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) if ((x + y) % 8 < 3) g.fillRect(x, y, 1, 1);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    if (G[y][x]) { g.fillStyle = G[y][x]; g.fillRect(x, y, 1, 1); continue; }
    if ((x > 0 && G[y][x - 1]) || (x < S - 1 && G[y][x + 1]) || (y > 0 && G[y - 1][x]) || (y < S - 1 && G[y + 1][x])) { g.fillStyle = '#000000'; g.fillRect(x, y, 1, 1); }
  }
  RALLY_FACES[r.id] = c;
  return c;
}

// ------------------------------------------------------------------ worlds and tracks
const RALLY_FALLBACK_WORLDS = [
  { key: 'desert', name: 'DUST BOWL' }, { key: 'ice', name: 'FROST RIDGE' }, { key: 'swamp', name: 'BOG COUNTRY' }, { key: 'lava', name: 'MAGMA RIM' },
];
const rallyWorlds = () => (typeof RALLY_WORLDS !== 'undefined' && Array.isArray(RALLY_WORLDS) && RALLY_WORLDS.length ? RALLY_WORLDS : RALLY_FALLBACK_WORLDS);
const rallyAllTracks = () => (typeof RALLY_TRACKS !== 'undefined' && Array.isArray(RALLY_TRACKS) ? RALLY_TRACKS : []);

// a world's tracks: rallyTracksOf (rallytracks.js), else RALLY_TRACKS by world, else all of them, else made up here
function rallyWorldTracks(w) {
  const W = rallyWorlds()[w] || {};
  let list = null;
  try { if (typeof rallyTracksOf === 'function') list = rallyTracksOf(W.key); } catch (e) { list = null; }
  if (Array.isArray(list)) list = list.map(t => (typeof t === 'string' ? rallyAllTracks().find(k => k.key === t) : t)).filter(t => t && t.rows);
  if (!list || !list.length) { list = rallyAllTracks().filter(t => t.world === W.key); if (!list.length) list = rallyAllTracks(); }
  return list.length ? list : rallyFallbackTracks(w);
}

// stand-in tracks (no rallytracks.js): a loop round an island, a bit bigger every time
const RALLY_FB_TRACKS = {};
function rallyFallbackTracks(w) {
  if (RALLY_FB_TRACKS[w]) return RALLY_FB_TRACKS[w];
  const W = rallyWorlds()[w] || RALLY_FALLBACK_WORLDS[0], list = [];
  for (let k = 0; k < 3; k++) {
    const cw = 44 + k * 6, chh = 30 + k * 2, T = 5, rows = [];
    for (let y = 0; y < chh; y++) {
      let s = '';
      for (let x = 0; x < cw; x++) {
        const ring = (x0, y0, x1, y1) => x >= x0 && y >= y0 && x <= x1 && y <= y1;
        const track = ring(2, 2, cw - 3, chh - 3) && !ring(2 + T, 2 + T, cw - 3 - T, chh - 3 - T);
        const near = ring(1, 1, cw - 2, chh - 2) && !ring(3 + T, 3 + T, cw - 4 - T, chh - 4 - T);
        let ch = track ? '.' : near ? '#' : ' ';
        if (track && (x === 2 || y === 2 || x === cw - 3 || y === chh - 3)) ch = '=';
        if (track && x === 12 && y <= 2 + T - 1) ch = 's';
        if (track && y >= chh - 2 - T && x > 14 && x < 20) ch = w % 4 === 1 ? 'i' : w % 4 === 2 ? 'm' : ',';
        if (track && x > cw - 3 - T && (y === 12 || y === 13) && x === cw - 5) ch = 'b';
        if (track && ((x === 24 && y === 4) || (x === 8 && y === chh - 5))) ch = '$';
        if (track && x === 4 && y === 14) ch = '+';
        s += ch;
      }
      rows.push(s);
    }
    const c = 4, pts = [[12, c], [cw - 1 - c, c], [cw - 1 - c, chh - 1 - c], [c, chh - 1 - c], [c, c], [12, c]], path = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, ay] = pts[i], [bx, by] = pts[i + 1], n = Math.ceil(Math.max(Math.abs(bx - ax), Math.abs(by - ay)) / 8);
      for (let j = 0; j < n; j++) path.push([Math.round(ax + (bx - ax) * j / n), Math.round(ay + (by - ay) * j / n)]);
    }
    list.push({ key: 'rcfb_' + W.key + k, name: W.name.split(' ')[0] + ' LOOP ' + ROMAN[k], world: W.key, laps: 3 + k, rows, start: { x: 13, y: 4, dir: 1 }, path, fallback: true });
  }
  return (RALLY_FB_TRACKS[w] = list);
}

// a track's little map: one pixel a tile in its minimap colours
const RALLY_THUMB_FALLBACK = { '#': '#7C7C7C', '.': '#BCBCBC', ',': '#AC7C00', '=': '#F83800', i: '#A4E4FC', m: '#6C4818', '~': '#0058F8', l: '#F87858',
  '^': '#F8B800', '>': '#F8B800', v: '#F8B800', '<': '#F8B800', b: '#58D854', $: '#F8D878', '+': '#F8F8F8', x: '#AC7C00', s: '#FFFFFF' };
const RALLY_THUMBS = {};
function rallyThumb(tr) {
  const k = tr.key || tr.name;
  if (RALLY_THUMBS[k]) return RALLY_THUMBS[k];
  const rows = tr.rows || ['#'], h = rows.length, w = Math.max(...rows.map(r => r.length));
  const c = makeCanvas(w, h), g = c.getContext('2d'), tc = typeof RALLY_THUMB_COL !== 'undefined' && RALLY_THUMB_COL ? RALLY_THUMB_COL : {};
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const ch = rows[y][x] || ' ', col = tc[ch] || RALLY_THUMB_FALLBACK[ch];
    if (col) { g.fillStyle = col; g.fillRect(x, y, 1, 1); }
  }
  return (RALLY_THUMBS[k] = c);
}
// the map in a box, as big as whole pixels allow, centred
function rallyDrawThumb(ctx, tr, x, y, bw, bh) {
  const c = rallyThumb(tr), s0 = Math.min(bw / c.width, bh / c.height), s = s0 >= 2 ? Math.floor(s0) : s0;
  const w = Math.round(c.width * s), h = Math.round(c.height * s), ox = x + ((bw - w) >> 1), oy = y + ((bh - h) >> 1);
  ctx.drawImage(c, ox, oy, w, h);
  return { ox, oy, s };
}

// ------------------------------------------------------------------ the career
// tiers: division B, A of every world in turn, then the champion race; frac: how far along the career that is
const rallyTier = C => C.world * 2 + C.div;
const rallyTierFrac = C => Math.min(1, rallyTier(C) / (rallyWorlds().length * 2));
const rallyPayFactor = C => 1 + 0.6 * rallyTier(C);
const rallyPriceFactor = C => 1 + 0.1 * (C ? C.world : 0);
const rallyDivName = div => ['DIVISION B', 'DIVISION A', 'CHAMPION RACE'][div];
const rallyRacesIn = C => (C.div === 2 ? 1 : RALLY_RACES);
// the points a division asks for to move up (the champion race: a win)
const rallyNeed = C => (C.div === 2 ? 4 : 8 + Math.min(C.world, 3) + C.div);
const rallyRound = v => Math.round(v / 100) * 100;

function rallyUpPrice(C, p, key) {
  const lv = p.up[key] | 0;
  if (lv >= rallyMaxLv(p.chassis, key)) return 0;
  return rallyRound(RALLY_CHASSIS[p.chassis].upPrice * RALLY_UPGRADES[key].cost * RALLY_LV_COST[lv] * rallyPriceFactor(C));
}

// a purchase: { ok, msg } (the money goes, the level goes up)
function rallyBuyUpgrade(C, p, key) {
  const up = RALLY_UPGRADES[key];
  if (!up) return { ok: false, msg: 'NOTHING TO BUY' };
  if ((p.up[key] | 0) >= rallyMaxLv(p.chassis, key)) return { ok: false, msg: 'FULLY UPGRADED' };
  const price = rallyUpPrice(C, p, key);
  if (p.money < price) return { ok: false, msg: 'NOT ENOUGH MONEY' };
  p.money -= price;
  p.up[key] = (p.up[key] | 0) + 1;
  return { ok: true, msg: 'BOUGHT ' + rallyUpName(p, key) + ' L' + p.up[key] };
}
// a new chassis: the upgrades and the charges bought for the old one are lost
function rallyCanBuyChassis(C, p, key) {
  const ch = RALLY_CHASSIS[key];
  if (!ch) return { ok: false, msg: 'NO SUCH TANK' };
  if (p.chassis === key) return { ok: false, msg: 'YOU DRIVE ONE ALREADY' };
  const from = Math.min(ch.from, rallyWorlds().length - 1);
  if (C.world < from) return { ok: false, msg: 'ON SALE FROM ' + (rallyWorlds()[from] || {}).name };
  if (p.money < ch.price) return { ok: false, msg: 'NOT ENOUGH MONEY' };
  return { ok: true };
}
function rallyBuyChassis(C, p, key) {
  const can = rallyCanBuyChassis(C, p, key);
  if (!can.ok) return can;
  p.money -= RALLY_CHASSIS[key].price;
  p.chassis = key;
  p.up = rallyBlankUp();
  return { ok: true, msg: 'NEW TANK: ' + RALLY_CHASSIS[key].name };
}
const rallyUpName = (p, key) => {
  const lo = rallyLoadout(p);
  return key === 'fwd' ? RALLY_KIND_NAME[lo.fwd.kind] : key === 'drop' ? RALLY_KIND_NAME[lo.drop.kind] : RALLY_UPGRADES[key].name;
};

function rallyNewState(picks) {
  const C = { v: 1, seed: 1 + Math.floor(Math.random() * 1e6), world: 0, div: 0, race: 0, n: picks.length, rivals: {}, field: [], last: null, champion: false,
    players: picks.map((pk, i) => ({ id: 'p' + i, i, name: ROMAN[i] + '-PLAYER', color: pk.color, chassis: pk.chassis, up: rallyBlankUp(),
      money: RALLY_START_MONEY, pts: 0, total: 0, wins: 0, kills: 0, races: 0, earned: 0 })) };
  rallyBeginDivision(C);
  return C;
}

// a division starts: who races in it, all points back to nothing
function rallyBeginDivision(C) {
  C.race = 0;
  const r = seeded(C.seed + rallyTier(C) * 101), pool = RALLY_RIVALS.filter(x => !x.boss).map(x => x.id);
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  C.field = C.div === 2 ? ['kragg'].concat(pool.slice(0, 2)) : pool.slice(0, 3);
  C.rivals = {};
  for (const id of C.field) C.rivals[id] = { pts: 0 };
  for (const p of C.players) p.pts = 0;
  C.lastPts = {};
}

// the track of the next race
function rallyNextTrack(C) {
  const list = rallyWorldTracks(C.world);
  if (C.div === 2) return list.find(t => t.final || t.boss) || list[list.length - 1];
  return list[(C.div * 2 + C.race) % list.length];
}

// the rivals in the next race: all three, or two with a 2nd player (one sits out in turn)
function rallyRaceRivals(C) {
  if (C.n < 2) return C.field.slice();
  const out = C.div === 2 ? 2 : C.race % C.field.length;
  return C.field.filter((_, k) => k !== out);
}

// the starting grid, as the race engine wants it
function rallyLineup(C) {
  const frac = rallyTierFrac(C), racers = [];
  for (const p of C.players) racers.push({ id: p.id, name: p.name, human: true, player: p.i, loadout: rallyLoadout(p), color: (TANK_COLORS[p.color] || TANK_COLORS.YELLOW)[1] });
  for (const id of rallyRaceRivals(C)) {
    const r = rallyRival(id);
    racers.push({ id, name: r.name, human: false, skill: rallyRivalSkill(r, frac), style: r.style, loadout: rallyLoadout(rallyRivalCar(r, frac)), color: r.cols[1] });
  }
  return racers;
}

// the table of the division: players and rivals by points
function rallyStandings(C) {
  const rows = C.players.map(p => ({ id: p.id, name: p.name, pts: p.pts, human: true, col: (TANK_COLORS[p.color] || TANK_COLORS.YELLOW)[1] }))
    .concat(C.field.map(id => ({ id, name: rallyRival(id).name, pts: (C.rivals[id] || {}).pts || 0, human: false, col: rallyRival(id).cols[1] })));
  return rows.sort((a, b) => b.pts - a.pts || (b.human ? 1 : 0) - (a.human ? 1 : 0));
}

// a race is over: points, money, and maybe the end of the division. Returns the summary the results screen shows.
function rallyApplyResults(C, results) {
  const pf = rallyPayFactor(C), tr = rallyNextTrack(C), rows = [];
  const sorted = results.slice().sort((a, b) => (a.place || 99) - (b.place || 99));
  C.lastPts = {};
  sorted.forEach((r, k) => {
    const place = r.place || k + 1, pts = RALLY_POINTS[place - 1] || 0, p = C.players.find(q => q.id === r.id), rv = C.rivals[r.id];
    if (!p && !rv) return;
    const row = { id: r.id, place, pts, kills: r.kills | 0, time: r.time | 0, bestLap: r.bestLap | 0, wrecks: r.wrecks | 0, human: !!p,
      name: p ? p.name : rallyRival(r.id).name };
    C.lastPts[r.id] = pts;
    if (p) {
      row.pay = rallyRound(RALLY_PAY[place - 1] * pf) || 0;
      row.killPay = row.kills * Math.round(RALLY_KILL_PAY * pf / 50) * 50;
      row.pick = Math.max(0, r.money | 0);
      row.total = row.pay + row.killPay + row.pick;
      p.money += row.total; p.earned += row.total;
      p.pts += pts; p.total += pts; p.kills += row.kills; p.races++;
      if (place === 1) p.wins++;
    } else rv.pts += pts;
    rows.push(row);
  });
  C.race++;
  const last = { track: tr.name, trackKey: tr.key, world: C.world, div: C.div, rows, end: null };
  if (C.race >= rallyRacesIn(C)) last.end = rallyEndDivision(C, sorted);
  C.last = last;
  return last;
}

// the division's last race is run: up, again, or down
function rallyEndDivision(C, sorted) {
  const worlds = rallyWorlds(), need = rallyNeed(C), best = Math.max(...C.players.map(p => p.pts));
  const end = { world: C.world, div: C.div, need, best, standings: rallyStandings(C) };
  const won = C.div === 2 ? sorted.length && C.players.some(p => p.id === sorted[0].id) : best >= need;
  if (won) {
    if (C.div === 0) { C.div = 1; Object.assign(end, { kind: 'up', big: 'PROMOTED', text: 'ON TO DIVISION A' }); }
    else if (C.div === 1 && C.world < worlds.length - 1) { C.world++; C.div = 0; Object.assign(end, { kind: 'world', big: 'PROMOTED', text: 'ON TO ' + worlds[C.world].name }); }
    else if (C.div === 1) { C.div = 2; Object.assign(end, { kind: 'final', big: 'PROMOTED', text: 'THE CHAMPION RACE AWAITS' }); }
    else { C.champion = true; Object.assign(end, { kind: 'champ', big: 'CHAMPION', text: 'THE CROWN IS YOURS' }); }
  } else if (C.div === 1 && best * 3 < need) { C.div = 0; Object.assign(end, { kind: 'down', big: 'DEMOTED', text: 'BACK TO DIVISION B' }); }
  else Object.assign(end, { kind: 'again', big: 'TRY AGAIN', text: C.div === 2 ? 'ONLY A WIN TAKES THE CROWN' : 'RACE ' + rallyDivName(C.div) + ' AGAIN' });
  if (!C.champion) rallyBeginDivision(C);
  return end;
}

function rallySave(C) {
  if (!C) return;
  if (C.champion) { const o = STORE.get(RALLY_KEY, null); STORE.set(RALLY_KEY, { done: true, champs: ((o && o.champs) || 0) + 1 }); return; }
  C.champs = C.champs || 0;
  STORE.set(RALLY_KEY, C);
}
// the saved career (null: none; { done } once a career is won)
function rallyLoad() {
  const s = STORE.get(RALLY_KEY, null);
  if (!s || typeof s !== 'object') return null;
  if (s.done) return s;
  if (s.v !== 1 || !Array.isArray(s.players) || !s.players.length || !Array.isArray(s.field)) return null;
  s.world = Math.max(0, Math.min(rallyWorlds().length - 1, s.world | 0));
  s.div = Math.max(0, Math.min(2, s.div | 0));
  for (const p of s.players) { if (!RALLY_CHASSIS[p.chassis]) p.chassis = 'scout'; p.up = Object.assign(rallyBlankUp(), p.up || {}); if (!TANK_COLORS[p.color]) p.color = 'YELLOW'; }
  s.field = s.field.filter(id => rallyRival(id));
  for (const id of s.field) if (!s.rivals || !s.rivals[id]) { s.rivals = s.rivals || {}; s.rivals[id] = { pts: 0 }; }
  s.n = s.players.length;
  return s;
}

// ------------------------------------------------------------------ the stand-in race (no race engine loaded)
function rallyStubRace(opts) {
  Game.rallyStub = { opts, track: opts.trackData || rallyNextTrack(Game.rally) };
  Game.setState('rallyStub');
}
// made-up results: the better tank and the better driver are likelier to win
function rallyFakeResults(opts) {
  const sc = opts.racers.map(r => ({ r, s: r.loadout.topSpeed * 2 + r.loadout.grip + r.loadout.armor * 0.1 + (r.human ? 0.9 : r.skill * 0.3) + Math.random() * 1.8 }));
  sc.sort((a, b) => b.s - a.s);
  const base = 60 * 60 * 1.6;
  return sc.map((o, k) => ({ id: o.r.id, place: k + 1, time: Math.round(base * (1 + k * 0.03 + Math.random() * 0.01)), bestLap: Math.round(base / (opts.laps || 4) * (0.95 + Math.random() * 0.1)),
    kills: rnd(3), wrecks: rnd(2), money: o.r.human ? rnd(5) * 250 : 0 }));
}

// ------------------------------------------------------------------ drawing helpers
const RALLY_DARK = '#20206C';
function rallyMoney(ctx, n, x, y, col, right) {
  const s = '$' + Math.max(0, Math.round(n));
  if (right) Font.drawRight(ctx, s, x, y, col); else Font.draw(ctx, s, x, y, col);
}
// a stat bar; then: what it would be (green: more, red: less)
function rallyBar(ctx, x, y, w, frac, then) {
  const f = Math.max(0, Math.min(1, frac)), t = then === undefined ? f : Math.max(0, Math.min(1, then));
  ctx.fillStyle = '#282828'; ctx.fillRect(x, y, w, 5);
  ctx.fillStyle = COL.gold; ctx.fillRect(x, y, Math.round(w * Math.min(f, t)), 5);
  if (t > f) { ctx.fillStyle = '#58D854'; ctx.fillRect(x + Math.round(w * f), y, Math.round(w * t) - Math.round(w * f), 5); }
  if (t < f) { ctx.fillStyle = '#A81000'; ctx.fillRect(x + Math.round(w * t), y, Math.round(w * f) - Math.round(w * t), 5); }
  ctx.fillStyle = '#000000';
  for (let k = 1; k < 10; k++) ctx.fillRect(x + Math.round(w * k / 10), y, 1, 5);
  ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(x, y, Math.round(w * Math.max(f, t)), 1);
}
const RALLY_STATS = [
  { label: 'SPEED', short: 'SPD', f: lo => (lo.topSpeed - 0.9) / 1.3 },
  { label: 'GRIP', short: 'GRP', f: lo => lo.grip },
  { label: 'ARMOUR', short: 'ARM', f: lo => lo.armor / 8 },
  { label: 'SUSP', short: 'SUS', f: lo => lo.susp / 3 },
];
function rallyStatBars(ctx, lo, x, y, w, then, short) {
  RALLY_STATS.forEach((s, k) => {
    Font.draw(ctx, short ? s.short : s.label, x, y + k * 10, COL.lgrey);
    rallyBar(ctx, x + (short ? 28 : 56), y + k * 10 + 1, w, s.f(lo), then ? s.f(then) : undefined);
  });
}
// a tank sprite, 1x / 2x / 3x
function rallyTank(ctx, lo, x, y, scale, dir, frame) {
  const img = Sprites.tank(lo.spec, frame || 0, dir === undefined ? 0 : dir, lo.pal);
  ctx.drawImage(img, Math.round(x), Math.round(y), 16 * scale, 16 * scale);
}
// level pips: lit for the levels owned, dim for the ones still to buy
function rallyPips(ctx, x, y, lv, max) {
  for (let k = 0; k < 3; k++) {
    ctx.fillStyle = k < lv ? COL.gold : k < max ? '#3C3C3C' : '#141414';
    ctx.fillRect(x + k * 7, y + 1, 5, 5);
  }
}
// a chequered strip (the rally screens' top and bottom)
function rallyChecker(ctx, y, h, t) {
  for (let x = 0; x < SW; x += 4) for (let j = 0; j < h; j += 4) { ctx.fillStyle = ((x >> 2) + (j >> 2) + (t >> 4)) & 1 ? '#F8F8F8' : '#141414'; ctx.fillRect(x, y + j, 4, Math.min(4, h - j)); }
}
// text in lines of at most n characters
function rallyWrap(s, n) {
  const out = [];
  let cur = '';
  for (const w of s.split(' ')) { if (cur && (cur + ' ' + w).length > n) { out.push(cur); cur = w; } else cur = cur ? cur + ' ' + w : w; }
  if (cur) out.push(cur);
  return out;
}
const rallyTime = f => { if (!f) return '--'; const s = f / 60, m = Math.floor(s / 60); return m + ':' + String(Math.floor(s % 60)).padStart(2, '0') + '.' + Math.floor((s * 10) % 10); };
const RALLY_PLACE = ['1ST', '2ND', '3RD', '4TH', '5TH', '6TH'];

// ================================================================= the screens (Game)
const RALLY_SCREENS = {
  rallyMenu: ['updateRallyMenu', 'renderRallyMenu', 'rallyMenuPointer'],
  rallyHub: ['updateRallyHub', 'renderRallyHub', 'rallyHubPointer'],
  rallyShop: ['updateRallyShop', 'renderRallyShop', 'rallyShopPointer'],
  rallyIntro: ['updateRallyIntro', 'renderRallyIntro', 'rallyIntroPointer'],
  rallyStub: ['updateRallyStub', 'renderRallyStub', null],
  rallyResults: ['updateRallyResults', 'renderRallyResults', 'rallyResultsPointer'],
  rallyChamp: ['updateRallyChamp', 'renderRallyChamp', 'rallyChampPointer'],
};
const RALLY_HUB_MENU = ['RACE', 'SHOP', 'QUIT'];

Object.assign(Game, {
  // entry from the title (TANK RALLY): CONTINUE / NEW CAREER if there's a saved one, else straight to the start
  rallyNewCareer(players) {
    const n = Math.max(1, Math.min(2, Array.isArray(players) ? players.filter(p => !p.bot).length || 1 : +players || 1));
    this.mode = 'rally';
    this.rally = null;
    Sound.setEngine(0);
    this.applyLayout();
    const sv = rallyLoad();
    this.rm = { phase: sv && !sv.done ? 'menu' : 'setup', idx: 0, rep: 0, n, sv, champs: sv ? sv.champs || 0 : 0 };
    if (this.rm.phase === 'setup') this.rallySetupInit();
    this.setState('rallyMenu');
  },

  rallySetupInit() {
    const R = this.rm;
    R.phase = 'setup'; R.idx = 0;
    R.picks = [];
    for (let i = 0; i < R.n; i++) {
      const c = Config.get('p' + (i + 1) + 'Color');
      R.picks.push({ color: TANK_COLORS[c] ? c : Object.keys(TANK_COLORS)[i], chassis: i ? 'brawler' : 'scout' });
    }
  },

  rallyMenuItems() {
    const R = this.rm;
    if (R.phase === 'menu') return ['CONTINUE', 'NEW CAREER', 'BACK'];
    const rows = [];
    R.picks.forEach((_, i) => rows.push({ i, what: 'color' }, { i, what: 'chassis' }));
    rows.push({ what: 'start' });
    return rows;
  },

  rallyMenuAct(dir) {
    const R = this.rm, items = this.rallyMenuItems(), it = items[R.idx];
    if (R.phase === 'menu') {
      if (!dir) return;
      if (it === 'CONTINUE') { this.rally = R.sv; this.rallyToHub(); Sound.play('pickup'); }
      else if (it === 'NEW CAREER') { this.rallySetupInit(); Sound.play('select'); }
      else this.rallyQuit();
      return;
    }
    if (it.what === 'start') {
      if (!dir) return;
      this.rally = rallyNewState(R.picks);
      rallySave(this.rally);
      Sound.play('pickup');
      this.rallyToHub();
      return;
    }
    const pk = R.picks[it.i], d = dir || 1;
    if (it.what === 'color') { const all = Object.keys(TANK_COLORS); pk.color = all[(all.indexOf(pk.color) + d + all.length) % all.length]; }
    else { const st = RALLY_CHASSIS_ORDER.filter(k => RALLY_CHASSIS[k].start); pk.chassis = st[(st.indexOf(pk.chassis) + d + st.length) % st.length]; }
    Sound.play('select');
  },

  rallyNav(st, n) {
    const m = Input.menu();
    let d = 0;
    if (m.up) { d = -1; st.rep = 16; } else if (m.down) { d = 1; st.rep = 16; }
    else { const h = Input.heldDir(); if ((h === 0 || h === 2) && --st.rep <= 0) { d = h === 0 ? -1 : 1; st.rep = 4; } }
    if (d && n) { st.idx = (st.idx + d + n) % n; Sound.play('select'); }
    return m;
  },

  rallyQuit() {
    if (this.rally && !this.rally.champion) rallySave(this.rally);
    Sound.setEngine(0);
    this.toTitle();
    this.titleY = 0;
  },

  updateRallyMenu() {
    const R = this.rm, m = this.rallyNav(R, this.rallyMenuItems().length);
    if (m.back) { if (R.phase === 'setup' && R.sv && !R.sv.done) { R.phase = 'menu'; R.idx = 0; Sound.play('select'); } else this.rallyQuit(); return; }
    if (this.t < 8) return;
    if (R.phase === 'setup' && (m.left || m.right)) {
      const it = this.rallyMenuItems()[R.idx];
      if (it.what !== 'start') this.rallyMenuAct(m.left ? -1 : 1);
    } else if (m.ok) this.rallyMenuAct(1);
  },

  renderRallyMenu(ctx) {
    const R = this.rm, items = this.rallyMenuItems();
    ctx.fillStyle = COL.black; ctx.fillRect(0, 0, SW, SH);
    rallyChecker(ctx, 0, 8, this.t);
    if (R.phase === 'menu') {
      Font.big(ctx, 'TANK', (SW - Font.bigWidth('TANK', 4)) >> 1, 22, 4, Sprites.bricks(ctx));
      Font.big(ctx, 'RALLY', (SW - Font.bigWidth('RALLY', 4)) >> 1, 58, 4, COL.gold);
      // the four tanks on the line
      RALLY_CHASSIS_ORDER.forEach((k, i) => rallyTank(ctx, rallyLoadout({ chassis: k, color: ['YELLOW', 'GREEN', 'RED', 'CYAN'][i] }), 40 + i * 48, 96, 2, 1, (this.t >> 3) & 1));
      const sv = R.sv, W = rallyWorlds();
      items.forEach((s, i) => {
        const y = 144 + i * 16;
        if (i === R.idx) { ctx.fillStyle = RALLY_DARK; ctx.fillRect(48, y - 4, 160, 15); }
        Font.drawCenter(ctx, s, SW / 2, y, i === R.idx ? COL.white : COL.lgrey);
      });
      const note = R.idx === 0 ? (W[sv.world] || {}).name + '  ' + rallyDivName(sv.div) + (sv.div < 2 ? ' ' + (sv.race + 1) + '/' + RALLY_RACES : '') + (sv.n > 1 ? '  2P' : '')
        : R.idx === 1 ? 'THE SAVED CAREER IS LOST' : '';
      Font.drawCenter(ctx, note, SW / 2, 196, R.idx === 1 ? COL.orange : COL.gold);
      rallyChecker(ctx, SH - 8, 8, this.t);
      return;
    }
    // the start: colour and first tank for each player
    Font.drawCenter(ctx, 'NEW CAREER', SW / 2, 14, COL.red);
    if (R.champs) Font.drawCenter(ctx, 'CHAMPION X' + R.champs, SW / 2, 24, COL.gold);
    const cw = SW / R.n;
    R.picks.forEach((pk, i) => {
      const cx = cw * i + cw / 2, lo = rallyLoadout(pk), ch = RALLY_CHASSIS[pk.chassis];
      Font.drawCenter(ctx, ROMAN[i] + '-PLAYER', cx, 34, COL.white);
      ctx.fillStyle = '#141414'; ctx.fillRect(cx - 22, 45, 44, 42);
      rallyTank(ctx, lo, cx - 16, 50, 2, 0, (this.t >> 3) & 1);
      Font.drawCenter(ctx, ch.name, cx, 92, COL.gold);
      const bx = R.n > 1 ? cx - 56 : cx - 76, bw = R.n > 1 ? 78 : 96;
      rallyStatBars(ctx, lo, bx, 100, bw, undefined, R.n > 1);
      Font.drawCenter(ctx, R.n > 1 ? RALLY_SHORT_NAME[lo.fwd.kind] + '/' + RALLY_SHORT_NAME[lo.drop.kind] : RALLY_KIND_NAME[lo.fwd.kind] + ' + ' + RALLY_KIND_NAME[lo.drop.kind], cx, 141, COL.lgrey);
    });
    items.forEach((it, k) => {
      const y = 160 + k * 10 - (R.n > 1 ? 10 : 0);
      if (k === R.idx) { ctx.fillStyle = RALLY_DARK; ctx.fillRect(16, y - 2, SW - 32, 10); }
      if (it.what === 'start') { Font.drawCenter(ctx, 'START CAREER', SW / 2, y, k === R.idx ? COL.white : COL.lgrey); return; }
      const pk = R.picks[it.i], val = it.what === 'color' ? pk.color : RALLY_CHASSIS[pk.chassis].name;
      Font.draw(ctx, (R.n > 1 ? ROMAN[it.i] + ' ' : '') + (it.what === 'color' ? 'COLOUR' : 'TANK'), 24, y, k === R.idx ? COL.white : COL.lgrey);
      Font.drawCenter(ctx, '< ' + val + ' >', 176, y, k === R.idx ? COL.gold : COL.lgrey);
      if (it.what === 'color') { ctx.fillStyle = TANK_COLORS[pk.color][1]; ctx.fillRect(228, y, 7, 7); }
    });
    Font.drawCenter(ctx, 'ARROWS PICK  A OK  ESC BACK', SW / 2, 208, COL.lgrey);
  },

  rallyMenuPointer(x, y) {
    const R = this.rm, items = this.rallyMenuItems();
    if (R.phase === 'menu') {
      const i = Math.floor((y - 140) / 16);
      if (i < 0 || i >= items.length || x < 48 || x > 208) return;
      if (i === R.idx) this.rallyMenuAct(1); else { R.idx = i; Sound.play('select'); }
      return;
    }
    const k = Math.floor((y - 158 + (R.n > 1 ? 10 : 0)) / 10);
    if (k < 0 || k >= items.length) return;
    if (items[k].what === 'start') { if (k === R.idx) this.rallyMenuAct(1); else { R.idx = k; Sound.play('select'); } return; }
    R.idx = k;
    this.rallyMenuAct(x < 176 ? -1 : 1);
  },

  // ---------------------------------------------------------------- the division overview
  rallyToHub() {
    Sound.setEngine(0);
    this.applyLayout();
    this.rh = { idx: 0 };
    this.setState('rallyHub');
  },

  rallyHubAct(i) {
    const it = RALLY_HUB_MENU[i];
    if (it === 'RACE') this.rallyToIntro();
    else if (it === 'SHOP') this.rallyToShop();
    else this.rallyQuit();
    Sound.play('select');
  },

  updateRallyHub() {
    const H = this.rh, m = Input.menu();
    if (m.back) { this.rallyQuit(); return; }
    const d = m.left || m.up ? -1 : m.right || m.down ? 1 : 0;
    if (d) { H.idx = (H.idx + d + RALLY_HUB_MENU.length) % RALLY_HUB_MENU.length; Sound.play('select'); }
    if (m.ok && this.t > 8) this.rallyHubAct(H.idx);
  },

  renderRallyHub(ctx) {
    const C = this.rally, H = this.rh, W = rallyWorlds(), tr = rallyNextTrack(C);
    ctx.fillStyle = COL.black; ctx.fillRect(0, 0, SW, SH);
    rallyChecker(ctx, 0, 4, 0);
    Font.drawCenter(ctx, (W[C.world] || {}).name || 'WORLD', SW / 2, 8, COL.red);
    Font.drawCenter(ctx, rallyDivName(C.div) + (C.div < 2 ? '  RACE ' + (C.race + 1) + ' OF ' + RALLY_RACES : ''), SW / 2, 18, COL.gold);
    // the standings
    Font.draw(ctx, 'STANDINGS', 12, 32, COL.lgrey);
    Font.drawRight(ctx, 'PTS', 214, 32, COL.lgrey);
    rallyStandings(C).forEach((s, k) => {
      const y = 44 + k * 11;
      if (s.human) { ctx.fillStyle = '#1C1C40'; ctx.fillRect(8, y - 2, SW - 16, 11); }
      Font.draw(ctx, k + 1 + '', 12, y, COL.lgrey);
      ctx.fillStyle = s.col; ctx.fillRect(26, y, 7, 7);
      Font.draw(ctx, s.name, 40, y, s.human ? COL.white : COL.lgrey);
      Font.drawRight(ctx, s.pts, 214, y, COL.gold);
      const lp = (C.lastPts || {})[s.id];
      if (lp && C.race > 0) Font.draw(ctx, '+' + lp, 222, y, '#58D854');
    });
    const need = rallyNeed(C), best = Math.max(...C.players.map(p => p.pts)), left = rallyRacesIn(C) - C.race;
    const needTxt = C.div === 2 ? 'WIN IT TO BE CHAMPION' : best >= need ? 'PROMOTION SECURED!' : 'NEED ' + need + ' PTS  ' + left + (left === 1 ? ' RACE' : ' RACES') + ' LEFT';
    Font.drawCenter(ctx, needTxt, SW / 2, 104, best >= need && C.div < 2 ? '#58D854' : COL.orange);
    // the next track
    ctx.fillStyle = '#141414'; ctx.fillRect(6, 118, 108, 76);
    ctx.strokeStyle = '#505050'; ctx.strokeRect(6.5, 118.5, 107, 75);
    rallyDrawThumb(ctx, tr, 8, 120, 104, 72);
    Font.draw(ctx, C.div === 2 ? 'FINAL RACE' : 'NEXT RACE', 122, 120, COL.lgrey);
    rallyWrap(tr.name || '', 16).slice(0, 2).forEach((s, k) => Font.draw(ctx, s, 122, 131 + k * 9, COL.white));
    Font.draw(ctx, (tr.laps || 4) + ' LAPS', 122, 149, COL.lgrey);
    C.players.forEach((p, k) => {
      const y = (C.players.length > 1 ? 165 : 172) + k * 16, lo = rallyLoadout(p);
      ctx.drawImage(Sprites.tank(lo.spec, 0, 1, lo.pal), 120, y - 5);
      Font.draw(ctx, ROMAN[p.i], 138, y, COL.white);
      rallyMoney(ctx, p.money, 250, y, COL.gold, true);
    });
    // the menu
    RALLY_HUB_MENU.forEach((s, i) => {
      const x = 18 + i * 76;
      ctx.fillStyle = i === H.idx ? RALLY_DARK : '#141414'; ctx.fillRect(x, 198, 68, 14);
      if (i === H.idx) { ctx.strokeStyle = COL.gold; ctx.strokeRect(x + 0.5, 198.5, 67, 13); }
      Font.drawCenter(ctx, s, x + 34, 202, i === H.idx ? COL.white : COL.lgrey);
    });
  },

  rallyHubPointer(x, y) {
    if (y < 194) return;
    const i = Math.floor((x - 18) / 76);
    if (i < 0 || i >= RALLY_HUB_MENU.length || x - 18 - i * 76 > 68) return;
    if (i === this.rh.idx) this.rallyHubAct(i); else { this.rh.idx = i; Sound.play('select'); }
  },

  // ---------------------------------------------------------------- the shop
  rallyToShop() {
    this.rsh = { turn: 0, idx: 0, rep: 0, phase: 'parts', msg: '', msgT: 0, confirm: null };
    this.setState('rallyShop');
  },

  rallyShopItems() {
    return this.rsh.phase === 'tanks' ? RALLY_CHASSIS_ORDER.concat('back') : RALLY_UP_KEYS.concat('tank', 'done');
  },

  rallyShopSay(msg, good) {
    const S = this.rsh;
    S.msg = msg; S.msgT = 100; S.good = good;
    Sound.play(good ? 'pickup' : 'steel');
  },

  rallyShopBuy() {
    const S = this.rsh, C = this.rally, p = C.players[S.turn], it = this.rallyShopItems()[S.idx];
    if (S.phase === 'tanks') {
      if (it === 'back') { S.phase = 'parts'; S.idx = RALLY_UP_KEYS.length; S.confirm = null; Sound.play('select'); return; }
      const can = rallyCanBuyChassis(C, p, it);
      if (!can.ok) { this.rallyShopSay(can.msg); return; }
      // the upgrades go with the old tank: ask first
      if (S.confirm !== it && RALLY_UP_KEYS.some(k => p.up[k])) { S.confirm = it; S.msg = 'A AGAIN: YOUR UPGRADES GO'; S.msgT = 160; S.good = false; Sound.play('select'); return; }
      const r = rallyBuyChassis(C, p, it);
      S.confirm = null;
      this.rallyShopSay(r.msg, r.ok);
      if (r.ok) { S.phase = 'parts'; S.idx = 0; rallySave(C); }
      return;
    }
    if (it === 'tank') { S.phase = 'tanks'; S.idx = Math.max(0, RALLY_CHASSIS_ORDER.indexOf(p.chassis)); S.confirm = null; S.msgT = 0; Sound.play('select'); return; }
    if (it === 'done') { this.rallyShopNext(); return; }
    const r = rallyBuyUpgrade(C, p, it);
    this.rallyShopSay(r.msg, r.ok);
  },

  rallyShopNext() {
    const S = this.rsh, C = this.rally;
    rallySave(C);
    if (S.turn + 1 < C.players.length) { S.turn++; S.idx = 0; S.phase = 'parts'; S.msgT = 0; S.confirm = null; Sound.play('select'); }
    else this.rallyToHub();
  },

  updateRallyShop() {
    const S = this.rsh, n = this.rallyShopItems().length, before = S.idx, m = this.rallyNav(S, n);
    if (S.idx !== before) S.confirm = null;
    if (S.msgT > 0) S.msgT--;
    if (m.back) { if (S.phase === 'tanks') { S.phase = 'parts'; S.idx = RALLY_UP_KEYS.length; Sound.play('select'); } else this.rallyShopNext(); return; }
    if (m.ok && this.t > 6) this.rallyShopBuy();
  },

  renderRallyShop(ctx) {
    const S = this.rsh, C = this.rally, p = C.players[S.turn], lo = rallyLoadout(p), items = this.rallyShopItems(), it = items[S.idx];
    ctx.fillStyle = COL.black; ctx.fillRect(0, 0, SW, SH);
    Font.draw(ctx, S.phase === 'tanks' ? 'TANK DEALER' : 'SHOP', 8, 5, COL.red);
    Font.drawCenter(ctx, p.name, 138, 5, COL.white);
    rallyMoney(ctx, p.money, 250, 5, COL.gold, true);
    // what the highlighted item would make of the tank
    let then = null;
    if (S.phase === 'tanks' && RALLY_CHASSIS[it]) then = rallyLoadout({ chassis: it, color: p.color });
    else if (RALLY_UPGRADES[it] && (p.up[it] | 0) < rallyMaxLv(p.chassis, it)) then = rallyLoadout(Object.assign({}, p, { up: Object.assign({}, p.up, { [it]: (p.up[it] | 0) + 1 }) }));
    const show = S.phase === 'tanks' && then ? then : lo;
    ctx.fillStyle = '#141414'; ctx.fillRect(4, 17, 56, 52);
    rallyTank(ctx, show, 16, 22, 2, 0, (this.t >> 3) & 1);
    Font.drawCenter(ctx, RALLY_CHASSIS[show.chassis].name, 32, 58, COL.gold);
    rallyStatBars(ctx, lo, 66, 20, 128, then || undefined);
    // the charges a lap: now, or what they'd be
    const charges = o => [o.fwd.charges, o.drop.charges, o.boost];
    ['fwd', 'drop', 'boost'].forEach((k, j) => {
      const nm = k === 'boost' ? 'BOOST' : RALLY_SHORT_NAME[show[k].kind], v = charges(lo)[j], w = then ? charges(then)[j] : v;
      Font.draw(ctx, nm, 8 + j * 84, 74, COL.lgrey);
      Font.draw(ctx, 'X' + w, 12 + j * 84 + nm.length * 8, 74, w > v ? '#58D854' : w < v ? '#F83800' : COL.white);
    });
    ctx.fillStyle = '#3C3C3C'; ctx.fillRect(4, 85, SW - 8, 1);
    // the rows
    const top = 92;
    items.forEach((k, r) => {
      const y = top + r * (S.phase === 'tanks' ? 17 : 11);
      if (r === S.idx) { ctx.fillStyle = S.confirm === k ? '#5C1C00' : RALLY_DARK; ctx.fillRect(4, y - 2 - (S.phase === 'tanks' ? 4 : 0), SW - 8, S.phase === 'tanks' ? 17 : 11); }
      const sel = r === S.idx;
      if (S.phase === 'tanks') {
        if (k === 'back') { Font.draw(ctx, 'BACK', 32, y, sel ? COL.white : COL.lgrey); return; }
        const ch = RALLY_CHASSIS[k], can = rallyCanBuyChassis(C, p, k);
        rallyTank(ctx, rallyLoadout({ chassis: k, color: p.color }), 10, y - 5, 1, 1, sel ? (this.t >> 3) & 1 : 0);
        Font.draw(ctx, ch.name, 32, y, p.chassis === k ? COL.gold : sel ? COL.white : COL.lgrey);
        if (p.chassis === k) Font.drawRight(ctx, 'YOURS', 250, y, COL.gold);
        else if (/^ON SALE/.test(can.msg || '')) Font.drawRight(ctx, 'LATER', 250, y, '#7C3C3C');
        else rallyMoney(ctx, ch.price, 250, y, p.money >= ch.price ? COL.gold : '#7C3C3C', true);
        return;
      }
      if (k === 'tank') { Font.draw(ctx, 'NEW TANK...', 12, y, sel ? COL.white : COL.lgrey); return; }
      if (k === 'done') { Font.draw(ctx, S.turn + 1 < C.players.length ? 'DONE: ' + C.players[S.turn + 1].name + "'S TURN" : 'DONE', 12, y, sel ? COL.white : COL.lgrey); return; }
      const lv = p.up[k] | 0, max = rallyMaxLv(p.chassis, k), price = rallyUpPrice(C, p, k);
      Font.draw(ctx, rallyUpName(p, k), 12, y, sel ? COL.white : COL.lgrey);
      rallyPips(ctx, 138, y - 1, lv, max);
      if (lv >= max) Font.drawRight(ctx, 'MAX', 250, y, '#58D854');
      else rallyMoney(ctx, price, 250, y, p.money >= price ? COL.gold : '#7C3C3C', true);
    });
    // what it does, or what just happened
    let line = '', col = COL.white;
    if (S.msgT > 0) { line = S.msg; col = S.good ? COL.gold : COL.orange; }
    else if (S.phase === 'tanks' && RALLY_CHASSIS[it]) line = RALLY_CHASSIS[it].desc;
    else if (RALLY_UPGRADES[it]) line = RALLY_UPGRADES[it].desc;
    else if (it === 'tank') line = 'A NEW TANK STARTS WITH NO UPGRADES';
    Font.drawCenter(ctx, line, SW / 2, 196, col);
    Font.drawCenter(ctx, S.phase === 'tanks' ? 'A BUY   ESC BACK' : 'A BUY   ESC DONE', SW / 2, 210, COL.lgrey);
  },

  rallyShopPointer(x, y) {
    const S = this.rsh, items = this.rallyShopItems(), h = S.phase === 'tanks' ? 17 : 11;
    const r = Math.floor((y - 92 + 2 + (S.phase === 'tanks' ? 4 : 0)) / h);
    if (r < 0 || r >= items.length) return;
    if (r === S.idx) this.rallyShopBuy();
    else { S.idx = r; S.confirm = null; Sound.play('select'); }
  },

  // ---------------------------------------------------------------- the rivals before a race
  rallyToIntro() {
    const C = this.rally;
    this.ri = { lineup: rallyLineup(C), track: rallyNextTrack(C) };
    this.setState('rallyIntro');
  },

  rallyGo() {
    const C = this.rally, tr = this.ri.track, W = rallyWorlds()[C.world] || {};
    const opts = { track: tr.key, laps: tr.laps || 4, racers: this.ri.lineup, world: W.key, final: C.div === 2, music: C.div === 2 ? 'rallyBoss' : 'rally', trackData: tr };
    this.rallyLastStart = opts;
    rallySave(C);
    const start = typeof this.rallyStartRace === 'function' ? this.rallyStartRace : rallyStubRace;
    start.call(this, opts);
  },

  updateRallyIntro() {
    const m = Input.menu();
    if (m.back) { this.rallyToHub(); Sound.play('select'); return; }
    if (m.ok && this.t > 12) this.rallyGo();
  },

  renderRallyIntro(ctx) {
    const C = this.rally, I = this.ri, rv = I.lineup.filter(r => !r.human);
    ctx.fillStyle = COL.black; ctx.fillRect(0, 0, SW, SH);
    rallyChecker(ctx, 0, 4, this.t);
    Font.drawCenter(ctx, C.div === 2 ? 'THE CHAMPION RACE' : 'RACE ' + (C.race + 1) + ': ' + (I.track.name || ''), SW / 2, 8, COL.red);
    Font.drawCenter(ctx, 'YOUR RIVALS', SW / 2, 19, COL.lgrey);
    const step = 56, y0 = 32 + ((3 - rv.length) * step >> 1);
    rv.forEach((r, k) => {
      const R = rallyRival(r.id), y = y0 + k * step, slide = Math.max(0, 40 - (this.t - k * 10) * 4);
      ctx.save(); ctx.translate(-slide * 2, 0);
      ctx.fillStyle = R.cols[1]; ctx.fillRect(6, y - 2, 36, 36);
      ctx.fillStyle = '#000000'; ctx.fillRect(7, y - 1, 34, 34);
      ctx.drawImage(rallyFace(R), 8, y);
      ctx.restore();
      Font.draw(ctx, R.name, 50, y, R.boss ? COL.gold : COL.white);
      Font.draw(ctx, R.style.toUpperCase(), 50, y + 10, RALLY_STYLE_COL[R.style]);
      Font.draw(ctx, R.kind, 50 + (R.style.length + 1) * 8, y + 10, '#7C7C7C');
      for (let s = 0; s < 5; s++) { ctx.fillStyle = s <= r.skill ? COL.red : '#3C3C3C'; ctx.fillRect(176 + s * 6, y + 1, 4, 5); }
      rallyTank(ctx, r.loadout, 216, y - 2, 2, 3, (this.t >> 3) & 1);
      // the taunt, typed out
      let left = Math.max(0, (this.t - 20 - k * 25) >> 1);
      rallyWrap(R.taunts[(C.race + C.world * 3 + k) % R.taunts.length], 20).slice(0, 2).forEach((s, j) => {
        Font.draw(ctx, s.slice(0, left), 50, y + 21 + j * 9, COL.gold);
        left = Math.max(0, left - s.length - 1);
      });
    });
    ctx.fillStyle = '#141414'; ctx.fillRect(8, 198, 72, 14); ctx.fillStyle = RALLY_DARK; ctx.fillRect(96, 198, 152, 14);
    Font.drawCenter(ctx, 'BACK', 44, 202, COL.lgrey);
    Font.drawCenter(ctx, 'A: START RACE', 172, 202, (this.t >> 4) & 1 ? COL.white : COL.gold);
  },

  rallyIntroPointer(x, y) {
    if (this.t < 12) return;
    if (y > 194 && x < 84) { this.rallyToHub(); Sound.play('select'); return; }
    this.rallyGo();
  },

  // ---------------------------------------------------------------- the stand-in race
  updateRallyStub() {
    const m = Input.menu();
    if (this.t >= RALLY_STUB_TIME || (m.ok && this.t > 20)) this.rallyRaceOver(rallyFakeResults(this.rallyStub.opts));
  },

  renderRallyStub(ctx) {
    const R = this.rallyStub, tr = R.track;
    ctx.fillStyle = COL.black; ctx.fillRect(0, 0, SW, SH);
    Font.drawCenter(ctx, tr.name || 'RACE', SW / 2, 12, COL.red);
    const th = rallyDrawThumb(ctx, tr, 28, 32, 200, 140), path = tr.path || [];
    R.opts.racers.forEach((r, k) => {
      if (!path.length) return;
      const pos = (this.t * (0.15 + r.loadout.topSpeed * 0.05) + k * 0.3) % path.length, i = Math.floor(pos), a = path[i], b = path[(i + 1) % path.length], f = pos - i;
      const px = th.ox + ((a[0] + (b[0] - a[0]) * f) + 0.5) * th.s, py = th.oy + ((a[1] + (b[1] - a[1]) * f) + 0.5) * th.s;
      ctx.fillStyle = '#000000'; ctx.fillRect(Math.round(px) - 3, Math.round(py) - 3, 6, 6);
      ctx.fillStyle = r.color; ctx.fillRect(Math.round(px) - 2, Math.round(py) - 2, 4, 4);
    });
    Font.drawCenter(ctx, 'RACING...', SW / 2, 184, COL.white);
    Font.drawCenter(ctx, 'A QUICK SIMULATED RACE', SW / 2, 196, COL.lgrey);
  },

  // ---------------------------------------------------------------- after the race
  // back from a race (rally.js calls it with the results in finishing order)
  rallyRaceOver(results) {
    const C = this.rally;
    Sound.setEngine(0);
    this.applyLayout();
    if (!C) { this.toTitle(); return; }
    rallyApplyResults(C, Array.isArray(results) ? results : []);
    rallySave(C);
    this.rr = { page: 0 };
    this.setState('rallyResults');
    Sound.play(C.last.rows.some(r => r.human && r.place === 1) ? 'bonus' : 'levelUp');
  },

  rallyResultsNext() {
    const C = this.rally, R = this.rr;
    if (R.page === 0 && C.last.end) { R.page = 1; this.t = 0; Sound.play(C.last.end.kind === 'down' || C.last.end.kind === 'again' ? 'steel' : 'life'); return; }
    if (C.champion) { this.setState('rallyChamp'); Sound.play('bonus'); return; }
    this.rallyToHub();
  },

  updateRallyResults() {
    const m = Input.menu();
    if ((m.ok || m.back) && this.t > 30) this.rallyResultsNext();
  },

  renderRallyResults(ctx) {
    const C = this.rally, L = C.last;
    ctx.fillStyle = COL.black; ctx.fillRect(0, 0, SW, SH);
    if (this.rr.page === 1) { this.renderRallyDivEnd(ctx); return; }
    rallyChecker(ctx, 0, 4, this.t);
    Font.drawCenter(ctx, 'RACE RESULTS', SW / 2, 8, COL.red);
    Font.drawCenter(ctx, L.track || '', SW / 2, 18, COL.lgrey);
    // the podium: 2nd, 1st, 3rd
    const lineup = (this.rallyLastStart || {}).racers || [], byId = id => lineup.find(r => r.id === id);
    const pod = [[2, 72, 22], [1, 108, 32], [3, 144, 14]], base = 92;
    for (const [pl, x, h] of pod) {
      const row = L.rows.find(r => r.place === pl);
      ctx.fillStyle = pl === 1 ? '#AC7C00' : pl === 2 ? '#7C7C7C' : '#7C3C00'; ctx.fillRect(x, base - h, 40, h);
      ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(x, base - h, 40, 2);
      Font.drawCenter(ctx, pl + '', x + 20, base - h + 5, COL.white);
      if (!row) continue;
      const rc = byId(row.id), lo = rc ? rc.loadout : row.human ? rallyLoadout(C.players.find(p => p.id === row.id)) : rallyLoadout(rallyRivalCar(rallyRival(row.id), rallyTierFrac(C)));
      const hop = pl === 1 && (this.t >> 4) & 1 ? 2 : 0;
      if (lo) rallyTank(ctx, lo, x + 4, base - h - 32 - hop, 2, 2, (this.t >> 3) & 1);
    }
    ctx.fillStyle = '#3C3C3C'; ctx.fillRect(40, base, 176, 2);
    // the order
    L.rows.forEach((r, k) => {
      const y = 100 + k * 10;
      if (r.human) { ctx.fillStyle = '#1C1C40'; ctx.fillRect(8, y - 2, SW - 16, 10); }
      Font.draw(ctx, RALLY_PLACE[r.place - 1] || r.place + 'TH', 12, y, r.place === 1 ? COL.gold : COL.lgrey);
      Font.draw(ctx, r.name, 48, y, r.human ? COL.white : COL.lgrey);
      Font.drawRight(ctx, rallyTime(r.time), 212, y, '#7C7C7C');
      Font.drawRight(ctx, '+' + r.pts, 250, y, r.pts ? '#58D854' : '#505050');
    });
    // the money: counted up
    const hum = L.rows.filter(r => r.human), cw = SW / Math.max(1, hum.length), k0 = Math.min(1, Math.max(0, (this.t - 30) / 60));
    hum.forEach((r, j) => {
      const x = j * cw + 10, R = x + cw - 20, y = 146;
      if (hum.length > 1) Font.draw(ctx, r.name, x, y, COL.white);
      const lines = [['PLACE', r.pay], ['KILLS X' + r.kills, r.killPay], ['PICKUPS', r.pick]];
      lines.forEach(([s, v], i) => { Font.draw(ctx, s, x, y + (hum.length > 1 ? 10 : 0) + i * 10, COL.lgrey); rallyMoney(ctx, v * k0, R, y + (hum.length > 1 ? 10 : 0) + i * 10, COL.white, true); });
      const ty = y + (hum.length > 1 ? 10 : 0) + 32;
      ctx.fillStyle = '#505050'; ctx.fillRect(R - 64, ty - 3, 64, 1);
      Font.draw(ctx, 'TOTAL', x, ty, COL.gold);
      rallyMoney(ctx, r.total * k0, R, ty, COL.gold, true);
    });
    if (this.t > 30 && (this.t >> 4) & 1) Font.drawCenter(ctx, 'PRESS A', SW / 2, 214, COL.lgrey);
  },

  // the division is over: the final table and what comes next
  renderRallyDivEnd(ctx) {
    const C = this.rally, E = C.last.end, W = rallyWorlds();
    rallyChecker(ctx, 0, 4, this.t);
    Font.drawCenter(ctx, (W[E.world] || {}).name + '  ' + rallyDivName(E.div), SW / 2, 8, COL.red);
    Font.drawCenter(ctx, E.div === 2 ? 'FINAL RESULT' : 'FINAL STANDINGS', SW / 2, 20, COL.lgrey);
    E.standings.forEach((s, k) => {
      const y = 34 + k * 11;
      if (s.human) { ctx.fillStyle = '#1C1C40'; ctx.fillRect(24, y - 2, SW - 48, 11); }
      Font.draw(ctx, k + 1 + '', 30, y, COL.lgrey);
      ctx.fillStyle = s.col; ctx.fillRect(44, y, 7, 7);
      Font.draw(ctx, s.name, 58, y, s.human ? COL.white : COL.lgrey);
      if (E.div < 2) Font.drawRight(ctx, s.pts, 226, y, COL.gold);
    });
    if (E.div < 2) Font.drawCenter(ctx, 'NEEDED ' + E.need + '  BEST ' + E.best, SW / 2, 96, COL.lgrey);
    const good = E.kind !== 'down' && E.kind !== 'again', big = E.big, sc = big.length > 8 ? 2 : 3;
    const pop = Math.min(1, this.t / 20);
    if (pop >= 1 || (this.t & 2)) Font.big(ctx, big, (SW - Font.bigWidth(big, sc)) >> 1, 120, sc, good ? (E.kind === 'champ' ? COL.gold : '#58D854') : COL.red);
    Font.drawCenter(ctx, E.text, SW / 2, 160, COL.white);
    if (E.kind === 'world') Font.drawCenter(ctx, 'NEW TRACKS, TOUGHER RIVALS', SW / 2, 172, COL.lgrey);
    if (E.kind === 'final') Font.drawCenter(ctx, 'BARON KRAGG IS WAITING', SW / 2, 172, COL.gold);
    if (E.kind === 'down' || E.kind === 'again') Font.drawCenter(ctx, 'THE SHOP CAN HELP', SW / 2, 172, COL.lgrey);
    if (this.t > 30 && (this.t >> 4) & 1) Font.drawCenter(ctx, 'PRESS A', SW / 2, 210, COL.lgrey);
  },

  rallyResultsPointer() {
    if (this.t > 30) this.rallyResultsNext();
  },

  // ---------------------------------------------------------------- the champion
  updateRallyChamp() {
    const m = Input.menu();
    if ((m.ok || m.back) && this.t > 90) { this.rally = null; this.toTitle(); this.titleY = 0; }
  },

  renderRallyChamp(ctx) {
    const C = this.rally, t = this.t;
    ctx.fillStyle = COL.black; ctx.fillRect(0, 0, SW, SH);
    // fireworks
    for (let k = 0; k < 6; k++) {
      const r = seeded(k * 77 + Math.floor((t + k * 23) / 70)), cx = 20 + r() * 216, cy = 20 + r() * 70, ph = (t + k * 23) % 70, cols = ['#F8B800', '#F83800', '#3CBCFC', '#58D854', '#F878C8', '#F8F8F8'];
      for (let a = 0; a < 12; a++) {
        const ang = a * Math.PI / 6, d = ph * 0.6;
        if (ph < 50) { ctx.fillStyle = cols[(k + a) % cols.length]; ctx.fillRect(Math.round(cx + Math.cos(ang) * d), Math.round(cy + Math.sin(ang) * d + ph * ph / 300), 2, 2); }
      }
    }
    Font.big(ctx, 'CHAMPION', (SW - Font.bigWidth('CHAMPION', 3)) >> 1, 18, 3, COL.gold);
    Font.drawCenter(ctx, 'OF THE TANK RALLY', SW / 2, 46, COL.white);
    const n = C.players.length;
    C.players.forEach((p, k) => {
      const cx = SW / (n + 1) * (k + 1);
      ctx.fillStyle = '#AC7C00'; ctx.fillRect(cx - 28, 110, 56, 8);
      rallyTank(ctx, rallyLoadout(p), cx - 24, 62 + ((t >> 4) & 1), 3, 0, (t >> 3) & 1);
      Font.drawCenter(ctx, p.name, cx, 124, COL.white);
      Font.drawCenter(ctx, 'WINS ' + p.wins + '/' + p.races, cx, 136, COL.lgrey);
      Font.drawCenter(ctx, 'KILLS ' + p.kills, cx, 146, COL.lgrey);
      Font.drawCenter(ctx, '$' + p.earned + ' WON', cx, 156, COL.gold);
    });
    ctx.fillStyle = '#000000'; ctx.fillRect(4, 172, 36, 36);
    ctx.drawImage(rallyFace(rallyRival('kragg')), 6, 174);
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(6, 174, 32, 32);
    Font.draw(ctx, 'BARON KRAGG IS DETHRONED.', 46, 178, COL.lgrey);
    Font.draw(ctx, 'NEXT SEASON, CHALLENGER.', 46, 190, COL.gold);
    if (t > 90 && (t >> 4) & 1) Font.drawCenter(ctx, 'PRESS A', SW / 2, 212, COL.lgrey);
  },

  rallyChampPointer() {
    if (this.t > 90) { this.rally = null; this.toTitle(); this.titleY = 0; }
  },
});

// until the race engine is in, a stand-in race (fake results after a moment)
if (typeof Game.rallyStartRace !== 'function') { Game.rallyStartRace = rallyStubRace; Game.rallyStartRace.stub = true; }

// the rally screens in the game's dispatch: update, draw (in the menus' 256x224 frame), mouse / touch, music
(() => {
  const update = Game.update, renderState = Game.renderState, pointer = Game.pointer, musicFrame = Game.musicFrame;
  Game.update = function () {
    const f = RALLY_SCREENS[this.state];
    if (f && Net.role !== 'client') { this.t++; this[f[0]](); return; }
    return update.apply(this, arguments);
  };
  Game.renderState = function (ctx) {
    const f = RALLY_SCREENS[this.state];
    if (f) { this[f[1]](ctx); return; }
    return renderState.apply(this, arguments);
  };
  Game.pointer = function (x, y) {
    const f = RALLY_SCREENS[this.state];
    if (f) { Sound.unlock(); if (f[2]) this[f[2]](x - menuOX(), y - menuOY()); return; }
    return pointer.apply(this, arguments);
  };
  // the shop's tune between the races, the winner's on the podium and for the champion (only if they exist)
  Game.musicFrame = function () {
    const s = this.state;
    if (RALLY_SCREENS[s]) {
      const want = s === 'rallyStub' ? 'rally' : s === 'rallyChamp' || (s === 'rallyResults' && this.rr && this.rr.page === 0) ? 'rallyWin' : 'rallyShop';
      Music.want(typeof SONGS !== 'undefined' && SONGS[want] ? want : null, Music.skillLevel(), false);
      return;
    }
    if (musicFrame) return musicFrame.apply(this, arguments);
  };
})();
