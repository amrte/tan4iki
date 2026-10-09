'use strict';
// =====================================================================
//  TANK RALLY's worlds and tracks: five planets, a season of the career each, four circuits on every one (rally.js
//  races on them, rallycareer.js runs the seasons through them). A track is rows of tile characters (16 px a tile):
//    #  barrier (tyre walls, blocks, fences: unbreakable)       .  track            ,  rough ground (slow)
//    =  kerb (track, red and white on the corners)              i  ice (slides)     m  mud (slow)
//    ~  pit / water / chasm (drive in: wrecked)                 l  lava (hurts)
//    ^ > v <  jump ramp that way (flies over the next 2-3 tiles: the pits after a ramp are 2 deep)
//    b  boost pad      $  money spot      +  repair spot      x  crate (cover; shells break it)
//    s  the start/finish line, across the track through the pole tile      ' '  scenery (solid)
//  The circuits are not typed in tile by tile: each is a racing line of corner points ([x, y, width, corner radius],
//  in tiles), rounded off at the corners and swept with the track's width (rallyBuild); the barriers ring what that
//  sweeps; then the extras go on by where they sit along the line: jumps, boosts, pickups, crates, patches of
//  ice / mud / rough, pools, other ways round (forks). The racing line becomes the track's path (points 4 tiles
//  apart, from the start/finish line round), and the line's corners its kerbs.
//  rallyGroundArt(g, ch, tx, ty, world, R, track) draws a tile at 0,0 of g (translate g to place it); it looks at
//  the tile's neighbours on the track last fetched with rallyTrack (or the one passed). A crate tile draws the
//  crate on its floor: redraw it as '.' once the crate is shot away.
// =====================================================================

// the five worlds, in the order of the career; pal: the art's colours (see rallyGroundArt), theme: the season slot
const RALLY_WORLDS = [
  { key: 'desert', name: 'DUST BOWL', desc: 'RED CANYONS, SAND AND SUN', hazard: 'CHASMS',
    theme: { name: 'DUST BOWL', ground: '#B07040', specks: ['#C08050', '#A06030'] },
    pal: {
      road: ['#BC8A58', '#A87648', '#CC9C68', '#8C5C34', '#704828'], out: ['#D89C58', '#E8B470', '#C08448', '#A06830', '#F0C888'],
      rock: ['#A84C28', '#C86838', '#782C18', '#E0884C', '#4C1C0C'], wall: ['#2C2C2C', '#4C4C4C', '#787878', '#F8F8F8', '#D82800', '#141414'],
      block: ['#C8B8A0', '#A89880', '#E8D8C0', '#786850'], rough: ['#B08048', '#986830', '#C89858', '#7C5428'],
      pit: ['#1C0C08', '#3C1C10', '#5C2C18', '#8C4C28'], edge: '#F8E8C8', boost: ['#F8B800', '#E45C10', '#FCE4A0'],
      ramp: ['#8C6438', '#B08048', '#D8B070', '#5C3C1C'], crate: ['#B87C34', '#8C5820', '#5C3810', '#D8A458'],
      spot: '#F8D878', heal: '#58D854',
    } },
  { key: 'swamp', name: 'GLOOMWATER', desc: 'A TOXIC JUNGLE MOON', hazard: 'MUD AND ACID POOLS',
    theme: { name: 'GLOOMWATER', ground: '#2C4420', specks: ['#3C5428', '#1C3418'] },
    pal: {
      road: ['#7C6A48', '#6A5A3C', '#8C7C58', '#54462C', '#403420'], out: ['#1C3818', '#2C5024', '#3C6C2C', '#122410', '#58882C'],
      rock: ['#3C4C2C', '#54683C', '#283420', '#6C8048', '#141C10'], wall: ['#5C3C1C', '#7C5428', '#9C7038', '#C8A060', '#3C2410', '#241408'],
      block: ['#6C7458', '#545C44', '#8C9474', '#3C4430'], rough: ['#5C6C30', '#4C5C24', '#7C8C40', '#3C4818'],
      pit: ['#183C10', '#2C6018', '#4C8C20', '#A8E040'], edge: '#D8E8A0', boost: ['#A8E040', '#38A800', '#E8F8A0'],
      ramp: ['#6C4C28', '#8C6438', '#AC8448', '#3C2814'], crate: ['#7C5C2C', '#5C401C', '#38240C', '#A08048'],
      mud: ['#4C3820', '#3C2C18', '#5C4828', '#6C6438', '#2C2010'],
      spot: '#F8D878', heal: '#F87858',
    } },
  { key: 'ice', name: 'CRYOSPIRE', desc: 'A FROZEN PLANET OF GLASS', hazard: 'ICE AND CREVASSES',
    theme: { name: 'CRYOSPIRE', ground: '#C8D8E8', specks: ['#E0E8F0', '#B0C4D8'] },
    pal: {
      road: ['#B4C0CC', '#A0ACBC', '#C8D2DC', '#8490A4', '#68748C'], out: ['#E0ECF8', '#F8FCFF', '#C4D4E8', '#A0B4CC', '#FFFFFF'],
      rock: ['#4C5C78', '#68789C', '#34405C', '#8C9CC0', '#1C2438'], wall: ['#5C94FC', '#A8D8FC', '#E8F8FF', '#3C64B8', '#D82800', '#1C3C80'],
      block: ['#94C4EC', '#6CA0D4', '#E0F4FF', '#2C5494'], rough: ['#E8F0F8', '#D0DCEC', '#FFFFFF', '#B0C0D8'],
      pit: ['#08142C', '#14284C', '#24447C', '#88B8E8'], edge: '#3C5C9C', boost: ['#58F8F8', '#0088F8', '#E0FCFF'],
      ramp: ['#7C8CA8', '#A0B0C8', '#C8D4E4', '#4C5870'], crate: ['#6C8CB0', '#4C6C94', '#2C4468', '#A0BCD8'],
      ice: ['#8CCCF0', '#B8E4FC', '#68A8E0', '#E8FCFF', '#4C88C8'],
      spot: '#F8B800', heal: '#D82800',
    } },
  { key: 'lava', name: 'CINDERFALL', desc: 'A WORLD OF ASH AND FIRE', hazard: 'LAVA',
    theme: { name: 'CINDERFALL', ground: '#2C2428', specks: ['#3C3034', '#C83000'] },
    pal: {
      road: ['#5C5458', '#4C4448', '#6C6468', '#3C3438', '#2C2428'], out: ['#2C2428', '#3C3034', '#4C4044', '#1C1418', '#5C5054'],
      rock: ['#3C3034', '#544448', '#241C20', '#6C5C5C', '#100C0C'], wall: ['#686070', '#888090', '#A8A0B0', '#F8B800', '#141414', '#40384C'],
      block: ['#787080', '#5C5464', '#9C94A4', '#3C3444'], rough: ['#4C4044', '#3C3034', '#5C5054', '#C83000'],
      pit: ['#100404', '#300808', '#5C0C00', '#C83000'], edge: '#F8D878', boost: ['#F87800', '#C82800', '#FCE4A0'],
      ramp: ['#5C5464', '#7C7484', '#A49CAC', '#2C2830'], crate: ['#7C6C5C', '#5C4C3C', '#3C2C20', '#A09080'],
      lava: ['#F86800', '#F8B800', '#C82800', '#FCE4A0', '#781800'],
      spot: '#F8D878', heal: '#58D854',
    } },
  { key: 'neon', name: 'NEON WRECK', desc: 'A DEAD CITY THAT NEVER SLEEPS', hazard: 'BROKEN ROADS',
    theme: { name: 'NEON WRECK', ground: '#1C1C2C', specks: ['#282840', '#141420'] },
    pal: {
      road: ['#34343C', '#2C2C34', '#3E3E48', '#24242C', '#1C1C22'], out: ['#1C1C2C', '#282840', '#34344C', '#101018', '#44445C'],
      rock: ['#3C3C54', '#50506C', '#2C2C40', '#686888', '#141420'], wall: ['#9C9CA8', '#C8C8D0', '#E8E8F0', '#F838A8', '#38F8F8', '#5C5C6C'],
      block: ['#8C8C98', '#6C6C78', '#B0B0BC', '#4C4C58'], rough: ['#484854', '#3C3C48', '#5C5C68', '#2C2C34'],
      pit: ['#04040A', '#0C0C18', '#1C1C2C', '#585868'], edge: '#E8E8F0', boost: ['#F838A8', '#8C00C8', '#FCC8F0'],
      ramp: ['#585868', '#7C7C8C', '#A8A8B8', '#2C2C38'], crate: ['#4C6C8C', '#34506C', '#1C3048', '#7CA0C0'],
      paint: '#F8D838', glow: ['#F838A8', '#38F8F8', '#F8D838', '#58F858'],
      spot: '#F8D838', heal: '#58F858',
    } },
];
const RALLY_TRACKS = [];
// the legend; what a tank can drive on (lava too, but it burns); what stops it
const RALLY_LEGEND = '#.,=im~l^>v<b$+xs ';
const RALLY_DRIVE = '.,=im^>v<b$+s';
const RALLY_SOLID = '# x';
// colours for the minimaps
const RALLY_THUMB_COL = {
  '#': '#F8F8F8', ' ': '#000000', '.': '#7C7C7C', ',': '#8C7C4C', '=': '#D82800', i: '#88C8F0', m: '#5C4428',
  '~': '#0C1C3C', l: '#F86800', '^': '#F8B800', '>': '#F8B800', v: '#F8B800', '<': '#F8B800', b: '#F838A8',
  $: '#F8D878', '+': '#58D854', x: '#B87C34', s: '#FFFFFF',
};

const rallyWorld = key => RALLY_WORLDS.find(w => w.key === key) || RALLY_WORLDS[0];
const rallyTracksOf = world => RALLY_TRACKS.filter(t => t.world === (world && world.key || world));
// fetch a track (and make it the one the tile art looks round on)
let RALLY_ART_TRACK = null;
function rallyTrack(key) {
  const t = RALLY_TRACKS.find(k => k.key === key) || null;
  if (t) RALLY_ART_TRACK = t;
  return t;
}

// ------------------------------------------------------------------ building a track from its racing line
// a corner point list -> the line with its corners rounded off: [{ x, y, w, arc }] (arc: which corner, -1 on a straight)
function rallyRound(pts, closed) {
  const n = pts.length, out = [];
  for (let i = 0; i < n; i++) {
    const [x, y, w, r = 4] = pts[i];
    if (!closed && (i === 0 || i === n - 1)) { out.push({ x, y, w, arc: -1 }); continue; }
    const a = pts[(i - 1 + n) % n], b = pts[(i + 1) % n];
    let ux = x - a[0], uy = y - a[1]; const l1 = Math.hypot(ux, uy); ux /= l1; uy /= l1;
    let vx = b[0] - x, vy = b[1] - y; const l2 = Math.hypot(vx, vy); vx /= l2; vy /= l2;
    const th = Math.acos(Math.max(-1, Math.min(1, ux * vx + uy * vy)));
    if (th < 0.01 || !r) { out.push({ x, y, w, arc: -1 }); continue; }
    const t = Math.min(r * Math.tan(th / 2), l1 * 0.5, l2 * 0.5), rr = t / Math.tan(th / 2);
    const cr = ux * vy - uy * vx > 0 ? 1 : -1;
    const ax = x - ux * t, ay = y - uy * t, cx = ax - uy * rr * cr, cy = ay + ux * rr * cr;
    const a0 = Math.atan2(ay - cy, ax - cx), steps = Math.max(2, Math.ceil(th * rr / 0.4));
    for (let k = 0; k <= steps; k++) {
      const an = a0 + cr * th * k / steps;
      out.push({ x: cx + rr * Math.cos(an), y: cy + rr * Math.sin(an), w, arc: i, rr });
    }
  }
  return out;
}

// the rounded line -> samples every 0.2 tiles: { x, y, w, ang, corner (radius, 0 on a straight), s (distance along) }
function rallySample(line, closed, out) {
  const n = line.length, list = [];
  let s = 0;
  for (let i = 0; i < (closed ? n : n - 1); i++) {
    const a = line[i], b = line[(i + 1) % n], len = Math.hypot(b.x - a.x, b.y - a.y);
    if (len < 1e-6) continue;
    const ang = Math.atan2(b.y - a.y, b.x - a.x), corner = a.arc >= 0 && a.arc === b.arc ? a.rr : 0;
    const k = Math.max(1, Math.ceil(len / 0.2));
    for (let j = 0; j < k; j++) {
      const f = j / k;
      list.push({ x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, w: a.w + (b.w - a.w) * f, ang, corner, s: s + len * f });
    }
    s += len;
  }
  if (!closed) { const b = line[n - 1], l = list[list.length - 1]; list.push({ x: b.x, y: b.y, w: b.w, ang: l.ang, corner: 0, s }); }
  out.len = s;
  return list;
}

// where a thing sits on a corner point list: [seg, f, lat] -> { x, y (continuous), tx, ty, dir (0 up 1 right 2 down 3 left) }
function rallyAt(pts, seg, f, lat = 0) {
  const n = pts.length, A = pts[seg % n], B = pts[(seg + 1) % n];
  let ux = B[0] - A[0], uy = B[1] - A[1]; const l = Math.hypot(ux, uy); ux /= l; uy /= l;
  const x = A[0] + (B[0] - A[0]) * f - uy * lat, y = A[1] + (B[1] - A[1]) * f + ux * lat;
  const dir = Math.abs(ux) >= Math.abs(uy) ? (ux > 0 ? 1 : 3) : (uy > 0 ? 2 : 0);
  return { x, y, tx: Math.floor(x), ty: Math.floor(y), dir, w: A[2] + (B[2] - A[2]) * f };
}
const RALLY_DX = [0, 1, 0, -1], RALLY_DY = [-1, 0, 1, 0];

// a track spec -> the track: { key, name, world, laps, rows, start, path, lap, w, h, meta } (see the header)
//   line   the racing line's corner points [x, y, width, radius], a closed loop; line[0] is the start/finish, on a
//          straight that runs on along the axis of the first segment (the grid lines up behind it)
//   forks  other ways round: { line: [...] (open, from and back to the main line), feats }
//   cut    tiles taken out of the swept track: [x, y, w, h] (islands that split a wide section)
//   zones  [ch, x, y, w, h]: ice / mud / rough / lava / pit over the track tiles in that box (ch '~' and 'l' also
//          over the barriers round it when the 6th value is 1)
//   feats  on the main line, each at [seg, f (0-1 along it), lat (tiles to the right of the line)]:
//          ['jump', seg, f, pit ('~' or 'l'), out (tiles the chasm runs on past the track), span (0: all across)],
//          ['ramp', seg, f, span], ['b', seg, f, lat, long, wide], ['$' | '+' | 'x', seg, f, lat],
//          [',' | 'i' | 'm' | '~' | 'l', seg, f, lat, w, h] (a patch round that spot)
function rallyBuild(T) {
  const [W, H] = T.size, N = W * H, grid = new Array(N).fill(' ');
  const best = new Float32Array(N).fill(1e9), near = new Int32Array(N).fill(-1);
  const at = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? ' ' : grid[y * W + x]);
  const set = (x, y, c) => { if (x >= 0 && y >= 0 && x < W && y < H) grid[y * W + x] = c; };
  const isTrack = c => c !== ' ' && c !== '#';
  // sweep the main line and the forks
  const main = {}, samples = rallySample(rallyRound(T.line, true), true, main);
  const all = samples.slice();
  for (const fk of T.forks || []) for (const s of rallySample(rallyRound(fk.line, false), false, {})) { s.fork = 1; all.push(s); }
  all.forEach((s, k) => {
    const r = s.w / 2;
    for (let ty = Math.floor(s.y - r - 1); ty <= s.y + r + 1; ty++) for (let tx = Math.floor(s.x - r - 1); tx <= s.x + r + 1; tx++) {
      if (tx < 1 || ty < 1 || tx >= W - 1 || ty >= H - 1) continue;
      const d = Math.hypot(tx + 0.5 - s.x, ty + 0.5 - s.y), i = ty * W + tx;
      if (d < r - 1e-6) grid[i] = '.';
      if (d < best[i]) { best[i] = d; near[i] = k; }
    }
  });
  for (const [x, y, w, h] of T.cut || []) for (let ty = y; ty < y + h; ty++) for (let tx = x; tx < x + w; tx++) set(tx, ty, ' ');
  // the barriers: round everything swept
  for (let ty = 0; ty < H; ty++) for (let tx = 0; tx < W; tx++) {
    if (at(tx, ty) !== ' ') continue;
    let by = false;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (at(tx + dx, ty + dy) === '.') by = true;
    if (by) set(tx, ty, '#');
  }
  // kerbs: the edge tiles on the corners
  for (let ty = 0; ty < H; ty++) for (let tx = 0; tx < W; tx++) {
    const i = ty * W + tx;
    if (grid[i] !== '.' || near[i] < 0) continue;
    const s = all[near[i]];
    if (!s.corner || s.corner > 14) continue;
    if (at(tx - 1, ty) === '#' || at(tx + 1, ty) === '#' || at(tx, ty - 1) === '#' || at(tx, ty + 1) === '#') grid[i] = '=';
  }
  // patches of ground
  for (const [ch, x, y, w, h, wide] of T.zones || []) for (let ty = y; ty < y + h; ty++) for (let tx = x; tx < x + w; tx++) {
    const c = at(tx, ty);
    if (c === '.' || c === '=' || c === ',' || c === 'i' || c === 'm' || (wide && c === '#')) set(tx, ty, ch);
  }
  // the extras, on the main line and on the forks
  const lines = [[T.line, T.feats || []], ...(T.forks || []).map(f => [f.line, f.feats || []])];
  for (const [pts, feats] of lines) for (const ft of feats) {
    const k = ft[0];
    if (k === 'jump' || k === 'ramp') {
      const [, seg, f, pit = '~', out = 0, span = 0] = k === 'jump' ? ft : [ft[0], ft[1], ft[2], null, 0, ft[3] || 0];
      const p = rallyAt(pts, seg, f), d = p.dir, px = -RALLY_DY[d], py = RALLY_DX[d];
      const rows = k === 'jump' ? 4 : 2, reach = Math.ceil(p.w / 2) + 1;
      for (let j = 0; j < rows; j++) {
        const cx = p.tx + RALLY_DX[d] * j, cy = p.ty + RALLY_DY[d] * j, ch = j < 2 ? '^>v<'[d] : pit;
        if (span) {
          // a part of the way across: drive round it or jump it
          for (let o = -(span >> 1); o < span - (span >> 1); o++) if (isTrack(at(cx + px * o, cy + py * o))) set(cx + px * o, cy + py * o, ch);
          continue;
        }
        for (const sd of [1, -1]) {
          for (let o = sd > 0 ? 0 : 1, past = 0; ; o++) {
            const x = cx + px * o * sd, y = cy + py * o * sd, c = at(x, y);
            if (isTrack(c) && o <= reach) set(x, y, ch);
            else if (j >= 2 && past < out && (c === '#' || c === ' ')) { set(x, y, ch); past++; }
            else break;
          }
        }
      }
    } else if (k === 'b') {
      const [, seg, f, lat = 0, long = 2, wide = 2] = ft, p = rallyAt(pts, seg, f, lat), d = p.dir;
      const px = -RALLY_DY[d], py = RALLY_DX[d];
      for (let j = 0; j < long; j++) for (let o = 0; o < wide; o++) {
        const x = p.tx + RALLY_DX[d] * j + px * (o - (wide >> 1)), y = p.ty + RALLY_DY[d] * j + py * (o - (wide >> 1));
        if (at(x, y) === '.' || at(x, y) === '=') set(x, y, 'b');
      }
    } else if (',im~l'.includes(k)) {
      // a patch of ground (a pool, a puddle) w x h tiles round the spot
      const [, seg, f, lat = 0, w = 2, h = 2] = ft, p = rallyAt(pts, seg, f, lat);
      for (let y = p.ty - ((h - 1) >> 1); y < p.ty - ((h - 1) >> 1) + h; y++) for (let x = p.tx - ((w - 1) >> 1); x < p.tx - ((w - 1) >> 1) + w; x++) {
        if ('.=,im'.includes(at(x, y))) set(x, y, k);
      }
    } else {
      const [, seg, f, lat = 0] = ft, p = rallyAt(pts, seg, f, lat);
      if (isTrack(at(p.tx, p.ty))) set(p.tx, p.ty, k);
    }
  }
  // a crate one tile off a barrier would leave a gap no tank fits: push it against the barrier
  const hard = c => c === '#' || c === ' ';
  for (let pass = 0; pass < 3; pass++) for (let ty = 1; ty < H - 1; ty++) for (let tx = 1; tx < W - 1; tx++) {
    if (!'.=,'.includes(at(tx, ty))) continue;
    for (const [dx, dy] of [[1, 0], [0, 1]]) {
      const a = at(tx - dx, ty - dy), b = at(tx + dx, ty + dy);
      if (a === 'x' && hard(b)) { set(tx - dx, ty - dy, '.'); set(tx, ty, 'x'); }
      else if (b === 'x' && hard(a)) { set(tx + dx, ty + dy, '.'); set(tx, ty, 'x'); }
    }
  }
  // the start/finish line, across the track through the pole tile
  const st = rallyAt(T.line, 0, 0), sd = st.dir, spx = -RALLY_DY[sd], spy = RALLY_DX[sd];
  for (const s of [1, -1]) for (let o = s > 0 ? 0 : 1; ; o++) {
    const x = st.tx + spx * o * s, y = st.ty + spy * o * s;
    if (!isTrack(at(x, y)) || o > Math.ceil(st.w / 2) + 1) break;
    set(x, y, 's');
  }
  // the path: a point every 4 tiles along the main line, on ground a tank can be on
  const path = [[st.tx, st.ty]], ok = (x, y) => RALLY_DRIVE.includes(at(x, y));
  let last = 0;
  for (const s of samples) {
    if (s.s - last < 4 || s.s > main.len - 2.5) continue;
    const x = Math.floor(s.x), y = Math.floor(s.y), p = path[path.length - 1];
    if (!ok(x, y) || (x === p[0] && y === p[1])) continue;
    path.push([x, y]); last = s.s;
  }
  let lap = 0;
  for (let i = 0; i < path.length; i++) { const a = path[i], b = path[(i + 1) % path.length]; lap += Math.hypot(b[0] - a[0], b[1] - a[1]); }
  // what the art wants to know of each track tile: which way the race goes, how far off the line, on a corner?
  const meta = { dir: new Int8Array(N).fill(-1), lat: new Float32Array(N), half: new Float32Array(N), corner: new Uint8Array(N), axis: new Uint8Array(N) };
  for (let i = 0; i < N; i++) {
    if (near[i] < 0) continue;
    const s = all[near[i]], c = Math.cos(s.ang), sn = Math.sin(s.ang), tx = i % W + 0.5, ty = Math.floor(i / W) + 0.5;
    meta.dir[i] = Math.abs(c) >= Math.abs(sn) ? (c > 0 ? 1 : 3) : (sn > 0 ? 2 : 0);
    meta.lat[i] = (tx - s.x) * -sn + (ty - s.y) * c;
    meta.half[i] = s.w / 2;
    meta.corner[i] = s.corner ? Math.min(255, Math.round(s.corner)) : 0;
    meta.axis[i] = Math.max(Math.abs(c), Math.abs(sn)) > 0.98 ? 1 : 0;
  }
  const rows = [];
  for (let y = 0; y < H; y++) rows.push(grid.slice(y * W, y * W + W).join(''));
  return { key: T.key, name: T.name, world: T.world, laps: T.laps || 4, diff: T.diff || 1, desc: T.desc || '',
    rows, start: { x: st.tx, y: st.ty, dir: sd }, path, lap: Math.round(lap), w: W, h: H, meta };
}

// what's wrong with a track (an empty list: nothing): the shape of the rows, the start, the path
function rallyCheck(t) {
  const bad = [], W = t.rows[0].length, H = t.rows.length;
  const at = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? ' ' : t.rows[y][x]);
  const drive = (x, y) => RALLY_DRIVE.includes(at(x, y));
  if (!t.rows.every(r => r.length === W)) bad.push('rows of different lengths');
  const odd = [...new Set(t.rows.join(''))].filter(c => !RALLY_LEGEND.includes(c));
  if (odd.length) bad.push('unknown tiles ' + odd.join(''));
  for (let x = 0; x < W; x++) if (!RALLY_SOLID.includes(at(x, 0)) || !RALLY_SOLID.includes(at(x, H - 1))) { bad.push('open at the top or bottom'); break; }
  for (let y = 0; y < H; y++) if (!RALLY_SOLID.includes(at(0, y)) || !RALLY_SOLID.includes(at(W - 1, y))) { bad.push('open at a side'); break; }
  const s = t.start;
  if (at(s.x, s.y) !== 's') bad.push('the pole is not on the start line');
  for (let k = 0; k <= 4; k++) for (const o of [-1, 0, 1]) {
    const x = s.x - RALLY_DX[s.dir] * k - RALLY_DY[s.dir] * o, y = s.y - RALLY_DY[s.dir] * k + RALLY_DX[s.dir] * o;
    if (!drive(x, y) || at(x, y) === 'b' || '^>v<'.includes(at(x, y))) { bad.push('grid slot ' + x + ',' + y + ' not clear'); break; }
  }
  const p = t.path;
  if (!p.length || p[0][0] !== s.x || p[0][1] !== s.y) bad.push('the path does not begin at the pole');
  p.forEach(([x, y], i) => {
    if (!drive(x, y)) bad.push('path point ' + i + ' (' + x + ',' + y + ') off the track');
    const [nx, ny] = p[(i + 1) % p.length];
    if (Math.hypot(nx - x, ny - y) > 8) bad.push('path points ' + i + '-' + ((i + 1) % p.length) + ' too far apart');
  });
  return bad;
}

// ------------------------------------------------------------------ the tracks
function rallyAdd(T) { RALLY_TRACKS.push(rallyBuild(T)); }

// DUST BOWL: wide, sandy, forgiving; the canyon opens up by the last race
rallyAdd({ key: 'dust1', name: 'SANDTRAP LOOP', world: 'desert', laps: 4, diff: 1, desc: 'A WIDE OVAL IN THE DUNES',
  size: [56, 37],
  line: [[24, 6, 6], [50, 6, 6, 9], [50, 31, 6, 9], [6, 31, 6, 9], [6, 6, 6, 9]],
  feats: [['b', 0, 0.55, 0, 3, 2], ['$', 1, 0.5, 1.5], ['+', 2, 0.5, 0], ['$', 2, 0.25, -2], ['$', 3, 0.5, 2], ['x', 2, 0.65, 2.5], ['x', 3, 0.35, -2.5]],
});
rallyAdd({ key: 'dust2', name: 'MESA RUN', world: 'desert', laps: 4, diff: 2, desc: 'A LONG STRAIGHT AND A DIP ROUND THE MESA',
  size: [64, 44],
  line: [[16, 38, 6], [57, 38, 6, 7], [57, 7, 6, 7], [41, 7, 4, 5], [41, 23, 4, 5], [28, 23, 4, 5], [28, 7, 4, 5], [6, 7, 6, 7], [6, 38, 6, 7]],
  zones: [[',', 2, 2, 7, 4], [',', 59, 2, 4, 6], [',', 37, 24, 8, 3], [',', 2, 38, 4, 5]],
  feats: [['b', 0, 0.62, 0, 3, 2], ['$', 1, 0.3, 2], ['+', 4, 0.5, 0], ['$', 3, 0.5, -1], ['$', 7, 0.5, 2], ['x', 7, 0.3, -2.5], ['x', 1, 0.7, -2.5], ['x', 0, 0.85, 2.5]],
});
rallyAdd({ key: 'dust3', name: 'RATTLER S', world: 'desert', laps: 4, diff: 3, desc: 'A CHICANE AND THE SNAKING SIDES',
  size: [70, 46],
  line: [[20, 6, 6], [38, 6, 5, 4], [43, 11, 4, 4], [51, 11, 4, 4], [56, 6, 5, 4], [64, 6, 6, 6], [64, 40, 6, 6], [49, 40, 5, 5],
    [43, 29, 4, 5], [35, 29, 4, 5], [29, 40, 5, 5], [6, 40, 6, 6], [6, 29, 5, 5], [15, 21, 4, 5], [15, 15, 4, 5], [6, 6, 6, 5]],
  zones: [[',', 41, 31, 4, 4], [',', 34, 31, 3, 4], [',', 60, 2, 8, 3]],
  feats: [['b', 5, 0.45, 0, 3, 2], ['$', 3, 0.5, 0], ['+', 9, 0.5, 0], ['$', 11, 0.5, -2], ['$', 13, 0.5, 0], ['x', 5, 0.7, 2.5], ['x', 10, 0.5, -2.5], ['x', 0, 0.7, -2.5]],
});
rallyAdd({ key: 'dust4', name: 'CANYON LEAP', world: 'desert', laps: 4, diff: 4, desc: 'A FIGURE EIGHT, A RAMP AND A CANYON',
  size: [72, 50],
  line: [[14, 44, 6], [38, 44, 6, 6], [38, 9, 4, 6], [64, 9, 6, 6], [64, 27, 4, 6], [6, 27, 4, 6], [6, 44, 6, 6]],
  zones: [[',', 2, 22, 3, 5], [',', 66, 4, 4, 4]],
  feats: [['ramp', 1, 0.3857], ['jump', 2, 0.46, '~', 4], ['b', 4, 0.12, 0, 3, 2], ['$', 3, 0.5, 2], ['+', 5, 0.75, 0], ['$', 6, 0.5, 0], ['$', 1, 0.8, 0], ['$', 0, 0.6, 2], ['x', 0, 0.75, -2.5], ['x', 3, 0.2, 2.5]],
});

// GLOOMWATER: mud that drags, acid creeks to jump, the jungle closing in
rallyAdd({ key: 'bog1', name: 'BOGGY OVAL', world: 'swamp', laps: 4, diff: 1, desc: 'THROUGH THE MUD OR ROUND IT',
  size: [60, 40],
  line: [[22, 6, 6], [54, 6, 6, 8], [54, 33, 6, 8], [43, 33, 5, 4], [38, 25, 4, 4], [22, 25, 4, 4], [17, 33, 5, 4], [6, 33, 6, 8], [6, 6, 6, 8]],
  forks: [{ line: [[46, 33, 6], [14, 33, 6]], feats: [['$', 0, 0.5, 0]] }],
  zones: [['m', 20, 30, 20, 6], ['m', 53, 15, 3, 7]],
  feats: [['b', 0, 0.55, 0, 3, 2], ['$', 1, 0.3, -2], ['+', 7, 0.5, 0], ['$', 4, 0.5, 0], ['$', 0, 0.85, 2], ['x', 1, 0.75, 2.5], ['x', 7, 0.25, 2.5]],
});
rallyAdd({ key: 'bog2', name: 'GATOR BEND', world: 'swamp', laps: 4, diff: 2, desc: 'TWO ACID CREEKS TO JUMP',
  size: [70, 50],
  line: [[20, 44, 6], [52, 44, 6, 8], [62, 32, 5, 6], [62, 9, 5, 7], [44, 9, 5, 6], [38, 19, 4, 5], [28, 19, 4, 5], [22, 9, 5, 5], [8, 9, 5, 6], [8, 44, 6, 6]],
  zones: [['m', 29, 19, 8, 2], ['m', 52, 40, 8, 6], [',', 4, 4, 5, 3]],
  feats: [['jump', 8, 0.48, '~', 3], ['jump', 2, 0.5, '~', 3], ['b', 0, 0.5, 0, 3, 2], ['$', 3, 0.5, 1], ['+', 5, 0.5, 0], ['$', 7, 0.5, 0], ['$', 9, 0.6, 2], ['$', 0, 0.85, -2],
    ['x', 3, 0.25, -2], ['x', 8, 0.2, -2], ['x', 0, 0.3, 2.5]],
});
rallyAdd({ key: 'bog3', name: 'ROTWOOD EIGHT', world: 'swamp', laps: 4, diff: 3, desc: 'A FIGURE EIGHT: MIND THE CROSSING',
  size: [78, 52],
  line: [[21, 8, 5], [30, 8, 5, 6], [46, 44, 4, 6], [68, 44, 5, 7], [68, 8, 5, 7], [46, 8, 5, 6], [30, 44, 4, 6], [8, 44, 5, 7], [8, 8, 5, 6]],
  zones: [['m', 4, 20, 3, 10], ['m', 69, 26, 3, 8], ['~', 6, 40, 2, 3], [',', 66, 4, 6, 3]],
  feats: [['jump', 3, 0.72, '~', 3], ['b', 4, 0.5, 0, 3, 2], ['b', 7, 0.5, 0, 3, 2], ['$', 1, 0.5, 0], ['$', 5, 0.25, 0], ['+', 2, 0.5, 0], ['+', 6, 0.5, 0], ['$', 7, 0.8, 1], ['$', 3, 0.3, -1],
    ['x', 0, 0.9, -2], ['x', 2, 0.3, -2], ['x', 6, 0.3, 2]],
});
rallyAdd({ key: 'bog4', name: 'SPORE MAZE', world: 'swamp', laps: 3, diff: 4, desc: 'HAIRPINS, A SPLIT AND THE BOG',
  size: [76, 56],
  line: [[18, 50, 5], [66, 50, 6, 6], [66, 8, 5, 6], [54, 8, 4, 5], [54, 36, 4, 5], [42, 36, 4, 5], [42, 8, 4, 5], [8, 8, 5, 6], [8, 22, 4, 4], [15, 29, 4, 4], [15, 35, 4, 4], [8, 42, 4, 4], [8, 50, 5, 5]],
  forks: [{ line: [[37, 8, 4], [32, 17, 4, 3], [22, 17, 4, 3], [17, 8, 4]], feats: [['$', 1, 0.5, 0]] }],
  zones: [['m', 50, 32, 9, 6], ['m', 38, 4, 8, 6], ['m', 22, 4, 12, 6], [',', 62, 4, 7, 4], [',', 3, 36, 4, 8]],
  feats: [['jump', 2, 0.5, '~', 3], ['jump', 0, 0.62, '~', 0, 2], ['b', 1, 0.15, 0, 3, 2], ['b', 7, 0.1, 0, 2, 2], ['$', 4, 0.5, 0], ['+', 7, 0.5, 0], ['$', 12, 0.5, 0], ['+', 5, 0.5, 0], ['$', 2, 0.2, 1],
    ['x', 0, 0.35, -1.5], ['x', 6, 0.5, 1.5], ['x', 2, 0.8, -2]],
});

// CRYOSPIRE: ice that slides you wide, crevasses to leap
rallyAdd({ key: 'ice1', name: 'FROST RING', world: 'ice', laps: 4, diff: 1, desc: 'A FAST RING WITH ICY BENDS',
  size: [60, 42],
  line: [[24, 36, 6], [46, 36, 6, 10], [53, 20, 5, 10], [40, 6, 5, 10], [8, 6, 6, 8], [8, 36, 6, 8]],
  zones: [['i', 44, 24, 14, 16], ['i', 2, 2, 10, 10]],
  feats: [['b', 4, 0.45, 0, 3, 2], ['$', 1, 0.5, 0], ['+', 3, 0.5, 0], ['$', 3, 0.15, -2], ['$', 4, 0.8, 2], ['x', 0, 0.7, 2.5], ['x', 3, 0.7, 2.5]],
});
rallyAdd({ key: 'ice2', name: 'GLACIER DASH', world: 'ice', laps: 4, diff: 2, desc: 'FLAT OUT AND OVER THE CREVASSE',
  size: [84, 42],
  line: [[20, 36, 6], [76, 36, 6, 8], [76, 8, 5, 8], [58, 8, 5, 6], [52, 18, 4, 5], [34, 18, 4, 5], [28, 8, 5, 6], [8, 8, 5, 8], [8, 36, 6, 8]],
  zones: [['i', 33, 14, 20, 8], ['i', 70, 2, 12, 12], ['i', 2, 2, 10, 10]],
  feats: [['b', 0, 0.35, 0, 3, 2], ['jump', 0, 0.72, '~', 2], ['b', 7, 0.5, 0, 3, 2], ['$', 1, 0.5, 0], ['+', 4, 0.5, 0], ['$', 6, 0.5, 0], ['$', 2, 0.3, -1], ['$', 0, 0.9, 2],
    ['x', 1, 0.2, -2], ['x', 6, 0.3, 2], ['x', 2, 0.7, 2]],
});
rallyAdd({ key: 'ice3', name: 'CRYO CROSS', world: 'ice', laps: 4, diff: 3, desc: 'A FIGURE EIGHT, A RAMP OVER THE CROSSING',
  size: [76, 56],
  line: [[16, 50, 6], [44, 50, 6, 7], [44, 8, 4, 6], [70, 8, 5, 6], [70, 30, 5, 6], [8, 30, 4, 6], [8, 50, 6, 6]],
  forks: [{ line: [[50, 8, 4], [54, 16, 4, 3], [62, 16, 4, 3], [66, 8, 4]], feats: [['$', 1, 0.5, 0]] }],
  zones: [['i', 64, 2, 10, 10], ['i', 2, 44, 10, 10], ['i', 49, 4, 18, 7], ['i', 66, 22, 8, 12]],
  feats: [['ramp', 4, 0.3629], ['b', 0, 0.7, 0, 3, 2], ['jump', 5, 0.45, '~', 3], ['$', 1, 0.25, 0], ['+', 3, 0.5, 0], ['$', 4, 0.15, -1], ['$', 6, 0.5, 0], ['+', 1, 0.85, 0],
    ['x', 0, 0.3, -2.5], ['x', 4, 0.6, -1.5]],
});
rallyAdd({ key: 'ice4', name: 'SHATTER PASS', world: 'ice', laps: 3, diff: 4, desc: 'HAIRPINS ON GLASS, TWO CREVASSES',
  size: [76, 56],
  line: [[20, 50, 5], [48, 50, 5, 5], [56, 42, 4, 4], [70, 42, 5, 6], [70, 8, 5, 6], [56, 8, 4, 4], [56, 30, 4, 4], [44, 30, 4, 4], [44, 8, 4, 5], [8, 8, 5, 6],
    [8, 26, 4, 4], [16, 33, 4, 4], [8, 40, 4, 4], [8, 50, 5, 5]],
  forks: [{ line: [[38, 8, 4], [34, 16, 4, 3], [20, 16, 4, 3], [16, 8, 4]] }],
  zones: [['i', 40, 26, 20, 8], ['i', 2, 22, 18, 20], ['i', 46, 38, 14, 16], ['i', 64, 2, 10, 8]],
  feats: [['jump', 8, 0.5, '~', 3], ['jump', 3, 0.5, '~', 2], ['b', 0, 0.5, 0, 3, 2], ['$', 6, 0.5, 0], ['+', 9, 0.15, 0], ['$', 11, 0.5, 0], ['$', 3, 0.5, 0], ['+', 1, 0.5, 0],
    ['x', 5, 0.5, 1.5], ['x', 7, 0.5, -1.5], ['x', 0, 0.3, -2]],
});

// CINDERFALL: lava to jump or skirt, ash that drags
rallyAdd({ key: 'lava1', name: 'EMBER OVAL', world: 'lava', laps: 4, diff: 1, desc: 'AN OCTAGON ROUND A LAVA LAKE',
  size: [60, 42],
  line: [[24, 36, 6], [46, 36, 6, 4], [54, 28, 5, 4], [54, 14, 5, 4], [46, 6, 6, 4], [14, 6, 6, 4], [6, 14, 5, 4], [6, 28, 5, 4], [14, 36, 6, 4]],
  zones: [[',', 50, 18, 7, 6]],
  feats: [['l', 1, 0.5, 2.2, 2, 2], ['l', 3, 0.5, 2.2, 2, 2], ['l', 5, 0.5, 2.2, 2, 2], ['l', 7, 0.5, 2.2, 2, 2], ['jump', 4, 0.5, 'l', 0, 2], ['b', 0, 0.75, 0, 3, 2], ['$', 2, 0.5, 0], ['+', 6, 0.5, 0], ['$', 4, 0.25, 2], ['$', 4, 0.75, -2], ['x', 0, 0.3, 2.5], ['x', 4, 0.85, 2.5]],
});
rallyAdd({ key: 'lava2', name: 'ASH ALLEY', world: 'lava', laps: 3, diff: 2, desc: 'A SWITCHBACK AND A RIVER OF FIRE',
  size: [80, 50],
  line: [[20, 42, 6], [70, 42, 6, 7], [70, 8, 5, 6], [52, 8, 5, 4], [48, 14, 4, 4], [40, 14, 4, 4], [36, 8, 5, 4], [8, 8, 5, 6], [8, 22, 4, 4], [28, 22, 4, 4], [28, 32, 4, 4], [8, 32, 4, 4], [8, 42, 5, 4]],
  zones: [[',', 66, 2, 8, 5], [',', 4, 18, 4, 8], [',', 26, 26, 6, 4], ['l', 72, 20, 2, 4], ['l', 66, 30, 2, 3]],
  feats: [['jump', 0, 0.62, 'l', 3], ['jump', 1, 0.5, 'l', 0, 2], ['b', 0, 0.3, 0, 3, 2], ['b', 6, 0.5, 0, 3, 2], ['$', 4, 0.5, 0], ['+', 9, 0.5, 0], ['$', 11, 0.5, 0], ['$', 1, 0.8, 1], ['+', 7, 0.5, 0],
    ['x', 6, 0.25, 2], ['x', 8, 0.5, 1.5], ['x', 0, 0.85, -2.5]],
});
rallyAdd({ key: 'lava3', name: 'MAGMA EIGHT', world: 'lava', laps: 4, diff: 3, desc: 'A BOW TIE OVER BURNING GROUND',
  size: [74, 50],
  line: [[17, 10, 5], [26, 10, 5, 6], [52, 38, 4, 6], [66, 38, 5, 7], [66, 10, 5, 7], [52, 10, 4, 6], [26, 38, 4, 6], [8, 38, 5, 7], [8, 10, 5, 6]],
  zones: [['l', 64, 40, 3, 4], ['l', 6, 40, 3, 4], [',', 68, 6, 4, 4], [',', 4, 20, 3, 8]],
  feats: [['jump', 3, 0.5, 'l', 3], ['jump', 7, 0.55, 'l', 3], ['b', 4, 0.5, 0, 3, 2], ['$', 1, 0.2, 0], ['$', 5, 0.8, 0], ['+', 2, 0.5, 0], ['+', 6, 0.5, 0], ['$', 0, 0.9, 1], ['$', 4, 0.15, 0],
    ['x', 2, 0.3, -2], ['x', 6, 0.7, 2], ['x', 0, 0.5, -2]],
});
rallyAdd({ key: 'lava4', name: 'CALDERA LEAP', world: 'lava', laps: 3, diff: 4, desc: 'ROUND THE CALDERA: LEAP THE LAVA OR GO ROUND',
  size: [86, 62],
  line: [[24, 56, 6], [64, 56, 6, 8], [80, 40, 5, 8], [80, 18, 5, 6], [68, 6, 5, 6], [44, 6, 4, 5], [44, 24, 4, 4], [32, 24, 4, 4], [32, 6, 4, 5], [8, 6, 5, 6], [8, 56, 5, 6]],
  forks: [{ line: [[8, 22, 4], [16, 27, 4, 3], [16, 37, 4, 3], [8, 42, 4]], feats: [['+', 1, 0.5, 0]] }],
  zones: [[',', 40, 20, 8, 7], [',', 28, 20, 8, 7], ['l', 82, 26, 2, 6], ['l', 60, 58, 6, 2], [',', 4, 2, 6, 6]],
  feats: [['jump', 9, 0.5, 'l', 0], ['jump', 0, 0.6, 'l', 0, 3], ['jump', 2, 0.5, 'l', 3], ['b', 1, 0.5, 0, 3, 2], ['b', 4, 0.5, 0, 3, 2], ['$', 3, 0.5, 0], ['$', 6, 0.5, 0], ['+', 5, 0.5, 0], ['$', 8, 0.5, 0], ['$', 0, 0.9, 2],
    ['x', 1, 0.2, 2], ['x', 5, 0.3, 1.5], ['x', 9, 0.2, -2]],
});

// NEON WRECK: a city's streets at night, the roads falling in
rallyAdd({ key: 'neon1', name: 'NEON STRIP', world: 'neon', laps: 4, diff: 1, desc: 'ROUND THE BLOCK UNDER THE SIGNS',
  size: [64, 44],
  line: [[20, 38, 6], [58, 38, 6, 4], [58, 6, 5, 4], [38, 6, 5, 4], [38, 18, 5, 4], [24, 18, 5, 4], [24, 6, 5, 4], [6, 6, 5, 4], [6, 38, 6, 4]],
  zones: [[',', 2, 2, 5, 4], [',', 57, 2, 5, 4]],
  feats: [['b', 0, 0.55, 0, 3, 2], ['b', 8, 0.5, 0, 3, 2], ['$', 1, 0.5, 0], ['+', 4, 0.5, 0], ['$', 2, 0.5, 0], ['$', 7, 0.3, 0], ['x', 0, 0.8, 2.5], ['x', 1, 0.2, 2]],
});
rallyAdd({ key: 'neon2', name: 'BLACKOUT BLVD', world: 'neon', laps: 4, diff: 2, desc: 'SQUARE CORNERS AND HOLES IN THE ROAD',
  size: [80, 56],
  line: [[20, 50, 5], [60, 50, 5, 4], [60, 38, 5, 4], [74, 38, 5, 4], [74, 8, 5, 4], [50, 8, 5, 4], [50, 26, 4, 4], [34, 26, 4, 4], [34, 8, 4, 4], [8, 8, 5, 4], [8, 50, 5, 4]],
  zones: [[',', 70, 3, 7, 3], [',', 30, 22, 4, 6]],
  feats: [['jump', 9, 0.5, '~', 2], ['jump', 4, 0.4, '~', 0, 2], ['b', 3, 0.6, 0, 3, 2], ['b', 0, 0.6, 0, 3, 2], ['$', 6, 0.5, 0], ['+', 2, 0.5, 0], ['$', 8, 0.5, 0], ['$', 5, 0.5, 1], ['+', 9, 0.15, 0],
    ['x', 4, 0.75, -1.5], ['x', 7, 0.5, -1.5], ['x', 1, 0.3, 1.5]],
});
rallyAdd({ key: 'neon3', name: 'RUST FLYOVER', world: 'neon', laps: 4, diff: 3, desc: 'A FIGURE EIGHT WITH A FLYOVER RAMP',
  size: [80, 60],
  line: [[58, 8, 5], [40, 8, 5, 6], [40, 52, 4, 6], [31, 52, 4, 4], [27, 46, 4, 4], [21, 46, 4, 4], [17, 52, 4, 4], [10, 52, 5, 6], [10, 30, 4, 6], [72, 30, 4, 6], [72, 8, 5, 6]],
  zones: [[',', 68, 3, 7, 3], [',', 5, 52, 4, 4]],
  feats: [['ramp', 8, 0.4274], ['jump', 9, 0.5, '~', 2], ['jump', 1, 0.3, '~', 0, 2], ['b', 8, 0.75, 0, 3, 2], ['b', 1, 0.75, 0, 2, 2], ['$', 1, 0.3, 0], ['+', 4, 0.5, 0], ['$', 7, 0.5, 0], ['$', 9, 0.75, 1], ['+', 0, 0.6, -1.5],
    ['x', 1, 0.6, 1.5], ['x', 7, 0.3, -1.5]],
});
rallyAdd({ key: 'neon4', name: 'CIRCUIT ZERO', world: 'neon', laps: 3, diff: 4, desc: 'THE FINAL: EVERYTHING THE CITY HAS',
  size: [88, 64],
  line: [[20, 58, 6], [66, 58, 6, 6], [82, 44, 5, 8], [82, 8, 5, 6], [64, 8, 4, 4], [64, 34, 4, 4], [52, 34, 4, 4], [52, 8, 4, 4], [30, 8, 4, 4], [20, 18, 4, 4], [30, 27, 4, 4], [20, 36, 4, 4], [8, 36, 4, 4], [8, 58, 5, 6]],
  forks: [{ line: [[8, 40, 4], [16, 44, 4, 3], [16, 52, 4, 3], [8, 56, 4]], feats: [['$', 1, 0.5, 0]] }],
  zones: [[',', 78, 2, 8, 4], [',', 48, 30, 6, 6], [',', 60, 30, 6, 6]],
  feats: [['jump', 3, 0.5, '~', 2], ['jump', 0, 0.62, '~', 0, 2], ['jump', 12, 0.5, '~', 0], ['b', 0, 0.35, 0, 3, 2], ['b', 7, 0.5, 0, 3, 2], ['b', 1, 0.6, 0, 2, 2], ['$', 5, 0.5, 0], ['+', 9, 0.5, 0], ['$', 11, 0.5, 0],
    ['+', 2, 0.5, 0], ['$', 4, 0.5, 0], ['x', 3, 0.25, -2], ['x', 7, 0.3, 1.5], ['x', 1, 0.3, 2.5]],
});

// ------------------------------------------------------------------ the art
// every tile is painted pixel by pixel into a 16 x 16 buffer, then drawn at 0,0 of the caller's canvas; the ground
// round the track (dunes, jungle, ice, ash, the city) runs on from tile to tile (noise over the whole map)
const RALLY_RGB = {};
const rallyRGB = c => RALLY_RGB[c] || (RALLY_RGB[c] = [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)]);
const rallyHash = (x, y, s) => {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul((s | 0) + 1, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
function rallyNoise(x, y, s) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = rallyHash(xi, yi, s), b = rallyHash(xi + 1, yi, s), c = rallyHash(xi, yi + 1, s), d = rallyHash(xi + 1, yi + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
const rallyFbm = (x, y, s) => rallyNoise(x, y, s) * 0.65 + rallyNoise(x * 2.3 + 17, y * 2.3 + 5, s + 7) * 0.35;

// the 16 x 16 buffer and what paints on it
let RALLY_PB = null;
function rallyPainter() {
  if (!RALLY_PB) { const c = makeCanvas(16, 16), g = c.getContext('2d'); RALLY_PB = { c, g, img: g.createImageData(16, 16) }; }
  const B = RALLY_PB, d = B.img.data;
  const P = {
    set(x, y, col) {
      if (x < 0 || y < 0 || x > 15 || y > 15 || !col) return;
      const c = rallyRGB(col), i = (y * 16 + x) * 4;
      d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255;
    },
    rect(x, y, w, h, col) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) P.set(i, j, col); },
    // darken (f < 1) or lighten (f > 1) what's there
    shade(x, y, f) {
      if (x < 0 || y < 0 || x > 15 || y > 15) return;
      const i = (y * 16 + x) * 4;
      for (let k = 0; k < 3; k++) d[i + k] = Math.min(255, d[i + k] * f);
    },
    shadeRect(x, y, w, h, f) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) P.shade(i, j, f); },
    // mix a colour over what's there
    tint(x, y, col, a) {
      if (x < 0 || y < 0 || x > 15 || y > 15) return;
      const c = rallyRGB(col), i = (y * 16 + x) * 4;
      for (let k = 0; k < 3; k++) d[i + k] = d[i + k] + (c[k] - d[i + k]) * a;
    },
    done(g) { B.g.putImageData(B.img, 0, 0); g.drawImage(B.c, 0, 0); },
  };
  return P;
}
// a point of a picture drawn facing up, turned to face d (0 up 1 right 2 down 3 left)
const rallyRot = (d, x, y) => (d === 0 ? [x, y] : d === 1 ? [15 - y, x] : d === 2 ? [15 - x, 15 - y] : [y, 15 - x]);

const rallyRoadCh = c => c !== '#' && c !== ' ';
const rallyFloorCh = c => '.,=imb$+sx^>v<'.includes(c);

// the tile's surroundings: neighbours, the race's way through it, the world's colours
function rallyArtCtx(ch, tx, ty, world, track) {
  const T = track || RALLY_ART_TRACK, W = typeof world === 'string' ? rallyWorld(world) : world || rallyWorld(T && T.world);
  const rows = T && T.rows, H = rows ? rows.length : 0, Wd = rows ? rows[0].length : 0;
  const at = (dx, dy) => {
    if (!rows) return dx || dy ? (ch === '#' ? ' ' : ch) : ch;
    const x = tx + dx, y = ty + dy;
    return x < 0 || y < 0 || x >= Wd || y >= H ? ' ' : rows[y][x];
  };
  const i = ty * Wd + tx, M = T && T.meta && rows ? T.meta : null;
  const metaAt = (dx, dy) => {
    const x = tx + dx, y = ty + dy;
    if (!M || x < 0 || y < 0 || x >= Wd || y >= H) return null;
    const k = y * Wd + x;
    return { dir: M.dir[k], lat: M.lat[k], half: M.half[k], corner: M.corner[k], axis: M.axis[k] };
  };
  const m = metaAt(0, 0);
  return { ch, tx, ty, X0: tx * 16, Y0: ty * 16, T, W, key: W.key, pal: W.pal, at, metaAt,
    dir: m && m.dir >= 0 ? m.dir : (T && T.start ? T.start.dir : 1), lat: m ? m.lat : 0, half: m ? m.half : 3, corner: m ? m.corner : 0, axis: m ? m.axis : 1, idx: i };
}

// ---- the ground round the track, one world each: fn(P, C) paints the whole tile
const RALLY_OUT = {
  // red mesas in rippled dunes; a cactus, a rock, bones
  desert(P, C) {
    const p = C.pal, o = p.out, r = p.rock, th = 0.64;
    const mesa = (X, Y) => rallyNoise(X / 64, Y / 64, 9) * 0.82 + rallyNoise(X / 13, Y / 13, 10) * 0.18;
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const X = C.X0 + x, Y = C.Y0 + y, m = mesa(X, Y);
      if (m > th) {
        // the mesa: a flat top in terraces, a lit rim, its cliff face to the south in bands of rock
        if (mesa(X, Y + 9) <= th) {
          const below = mesa(X, Y + 3) <= th;
          P.set(x, y, below ? r[4] : ((Y >> 1) & 1) ? r[2] : (rallyHash(X >> 1, Y >> 1, 3) < 0.3 ? r[4] : r[0]));
        } else if (mesa(X - 2, Y - 2) <= th) P.set(x, y, r[3]);
        else {
          const t = (m - th) * 26, n = rallyHash(X, Y, 4);
          P.set(x, y, t - Math.floor(t) < 0.1 ? r[2] : n < 0.08 ? r[1] : n > 0.96 ? r[3] : r[0]);
        }
        continue;
      }
      const v = rallyFbm(X / 48, Y / 48, 3), ph = (Y + X * 0.35) / 6 + v * 7, f = ph - Math.floor(ph);
      P.set(x, y, f < 0.09 ? o[4] : f < 0.24 ? o[2] : rallyHash(X, Y, 1) < 0.06 ? o[1] : o[0]);
      if (mesa(X - 6, Y - 6) > th) P.shade(x, y, 0.72);
    }
    const h = rallyHash(C.tx, C.ty, 77);
    if (mesa(C.X0 + 8, C.Y0 + 8) > th - 0.03) return;
    if (h < 0.05) {
      // a cactus
      P.rect(7, 4, 2, 9, '#38A800'); P.rect(4, 6, 1, 4, '#38A800'); P.rect(5, 9, 2, 1, '#38A800'); P.rect(11, 5, 1, 4, '#38A800'); P.rect(9, 8, 2, 1, '#38A800');
      P.rect(7, 4, 1, 9, '#80D010'); P.rect(6, 13, 4, 1, '#985C28');
    } else if (h < 0.11) {
      P.rect(5, 8, 5, 3, r[2]); P.rect(5, 8, 4, 2, r[0]); P.rect(6, 8, 2, 1, r[3]); P.rect(6, 11, 5, 1, o[3]);
    } else if (h < 0.13) {
      P.rect(4, 9, 7, 1, '#F8F0E0'); P.set(4, 8, '#F8F0E0'); P.set(4, 10, '#F8F0E0'); P.set(10, 8, '#F8F0E0'); P.set(10, 10, '#F8F0E0');
    }
  },
  // the jungle canopy, glowing acid pools between the trees, toadstools
  swamp(P, C) {
    const p = C.pal, o = p.out, a = p.pit;
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const X = C.X0 + x, Y = C.Y0 + y, pool = rallyFbm(X / 44, Y / 44, 33);
      if (pool < 0.3) {
        const w = Math.sin((X + Y * 0.5) / 3 + rallyNoise(X / 9, Y / 9, 2) * 6);
        P.set(x, y, pool > 0.28 ? a[3] : pool > 0.26 ? o[0] : w > 0.92 ? a[2] : rallyHash(X, Y, 5) < 0.01 ? a[3] : a[1]);
        continue;
      }
      const c = rallyFbm(X / 11, Y / 11, 21), lit = c - rallyFbm((X + 2) / 11, (Y + 2) / 11, 21);
      let col = c > 0.62 ? (lit > 0.015 ? o[4] : o[2]) : c > 0.5 ? (lit > 0.02 ? o[2] : o[1]) : c > 0.4 ? o[0] : o[3];
      if (rallyHash(X, Y, 6) < 0.05 && c > 0.5) col = o[c > 0.62 ? 2 : 0];
      P.set(x, y, col);
      if (pool < 0.34) P.shade(x, y, 0.8);
    }
    const h = rallyHash(C.tx, C.ty, 78);
    if (rallyFbm((C.X0 + 8) / 44, (C.Y0 + 8) / 44, 33) < 0.34) return;
    if (h < 0.06) {
      // glowing toadstools
      for (const [x, y] of [[4, 6], [9, 9], [11, 4]]) { P.rect(x, y, 3, 2, '#F838A8'); P.set(x + 1, y, '#FCC8F0'); P.rect(x + 1, y + 2, 1, 2, '#E8E8D0'); }
    } else if (h < 0.1) {
      for (let k = 0; k < 5; k++) P.rect(3 + k * 2, 5 + (k & 1) * 2, 1, 7, k & 1 ? '#7C8C40' : '#A8C060');
    }
  },
  // a snowfield with drifts and spires of blue ice
  ice(P, C) {
    const p = C.pal, o = p.out, ic = p.ice, th = 0.62;
    const sp = (X, Y) => rallyFbm(X / 30, Y / 30, 41);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const X = C.X0 + x, Y = C.Y0 + y, m = sp(X, Y);
      if (m > th) {
        const gx = sp(X + 2, Y) - sp(X - 2, Y), gy = sp(X, Y + 2) - sp(X, Y - 2), lit = -(gx + gy);
        let col = lit > 0.01 ? ic[1] : lit < -0.01 ? ic[4] : ic[0];
        if (m > th + 0.08) col = lit > 0 ? ic[3] : ic[2];
        if (Math.abs(m - th - 0.05) < 0.004) col = '#FFFFFF';
        P.set(x, y, col);
        continue;
      }
      const v = rallyFbm(X / 26, Y / 26, 44), dr = v - rallyFbm((X + 3) / 26, (Y + 3) / 26, 44);
      P.set(x, y, dr > 0.02 ? o[1] : dr < -0.02 ? o[2] : rallyHash(X, Y, 8) < 0.04 ? o[3] : o[0]);
      if (m > th - 0.08 && sp(X - 4, Y - 4) > th) P.tint(x, y, '#7894B8', 0.45);
    }
    const h = rallyHash(C.tx, C.ty, 79);
    if (sp(C.X0 + 8, C.Y0 + 8) > th - 0.04) return;
    if (h < 0.05) {
      // a dark rock poking out of the snow
      P.rect(5, 8, 6, 3, p.rock[0]); P.rect(6, 7, 3, 1, p.rock[1]); P.rect(5, 8, 2, 1, p.rock[3]); P.rect(5, 11, 7, 1, o[3]); P.rect(6, 7, 3, 1, '#FFFFFF');
    } else if (h < 0.09) {
      // a small ice shard
      for (let k = 0; k < 6; k++) { P.rect(8 - (k >> 1), 4 + k, 1 + (k >> 1) * 2, 1, k < 3 ? ic[3] : ic[0]); }
      P.rect(6, 10, 5, 1, ic[4]);
    }
  },
  // black rock, ash plains, rivers of lava in the cracks
  lava(P, C) {
    const p = C.pal, o = p.out, L = p.lava;
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const X = C.X0 + x, Y = C.Y0 + y, rv = Math.abs(rallyFbm(X / 64, Y / 64, 51) - 0.5) + Math.max(0, 0.5 - rallyNoise(X / 110, Y / 110, 54)) * 0.25;
      if (rv < 0.018) { P.set(x, y, rv < 0.008 ? L[1] : (rallyHash(X >> 1, Y >> 1, 9) < 0.3 ? L[2] : L[0])); continue; }
      const ash = rallyFbm(X / 36, Y / 36, 52), n = rallyNoise(X / 3, Y / 3, 53);
      let col = ash > 0.62 ? (n > 0.6 ? o[4] : o[2]) : n > 0.75 ? o[1] : n < 0.2 ? o[3] : o[0];
      if (rallyHash(X, Y, 10) < 0.008) col = L[2];
      P.set(x, y, col);
      if (rv < 0.03) P.tint(x, y, L[4], 0.7 - (rv - 0.018) * 40);
    }
    const h = rallyHash(C.tx, C.ty, 80);
    if (h < 0.05) {
      // a smoking vent
      P.rect(5, 6, 6, 5, o[3]); P.rect(6, 7, 4, 3, L[4]); P.rect(7, 8, 2, 1, L[0]); P.rect(5, 6, 6, 1, o[4]);
    } else if (h < 0.1) {
      P.rect(4, 8, 6, 4, p.rock[0]); P.rect(4, 8, 5, 1, p.rock[3]); P.rect(4, 12, 7, 1, o[3]);
    }
  },
  // the city: blocks of dark roofs, lit windows on the south faces, neon on the tops, the odd ruin
  neon(P, C) {
    const p = C.pal, o = p.out, G = p.glow;
    const bx = Math.floor(C.tx / 5), by = Math.floor(C.ty / 4), lx = C.tx - bx * 5, ly = C.ty - by * 4;
    const hb = rallyHash(bx, by, 81), ruin = hb < 0.18;
    const roof = [['#2C2C44', '#383854', '#20203A'], ['#34283C', '#44344C', '#241C2C'], ['#203038', '#2C404C', '#141C24']][Math.floor(hb * 3)];
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const X = C.X0 + x, Y = C.Y0 + y, n = rallyHash(X, Y, 12);
      // the alleys between the blocks
      if (lx === 4 || ly === 3) {
        P.set(x, y, n < 0.08 ? o[2] : o[3]);
        continue;
      }
      if (ruin) {
        const r = rallyNoise(X / 4, Y / 4, 13);
        P.set(x, y, r > 0.66 ? p.rock[3] : r > 0.45 ? p.rock[1] : r > 0.3 ? p.rock[0] : o[3]);
        continue;
      }
      // the roof; its south face (windows) along the block's last row; a lit rim
      const face = ly === 2 && y >= 9;
      if (face) {
        const wx = X % 4, wy = y % 3;
        let col = '#16161E';
        if (wx > 0 && wx < 3 && wy === 1) col = rallyHash(X >> 2, Y, 14) < 0.45 ? (hb > 0.6 ? G[1] : '#F8D878') : '#2C2C3C';
        P.set(x, y, y === 9 ? roof[1] : col);
        continue;
      }
      let col = roof[0];
      if ((lx === 0 && x === 0) || (ly === 0 && y === 0)) col = roof[1];
      if ((lx === 3 && x === 15)) col = roof[2];
      if (n < 0.03) col = roof[2];
      P.set(x, y, col);
    }
    if (ruin || lx === 4 || ly === 3) return;
    const h = rallyHash(C.tx, C.ty, 82);
    // a neon sign along the roof's edge, or a vent, or an aerial
    if (ly === 0 && h < 0.35) { const c = G[Math.floor(rallyHash(bx, by, 83) * 4)]; P.rect(2, 3, 12, 2, c); P.rect(2, 5, 12, 1, '#101018'); P.rect(3, 3, 3, 1, '#FFFFFF'); }
    else if (h < 0.5 && ly < 2) { P.rect(5, 5, 6, 5, '#6C6C78'); P.rect(5, 5, 6, 1, '#9C9CA8'); P.rect(6, 7, 4, 1, '#3C3C48'); P.rect(5, 10, 7, 1, '#101018'); }
    else if (h < 0.58 && ly < 2) { P.rect(8, 2, 1, 9, '#9C9CA8'); P.rect(6, 4, 5, 1, '#9C9CA8'); P.set(8, 1, '#F83800'); }
  },
};

// ---- the track's own surface: road grit, the tyre marks of the racing line, an edge line, wall shadows
function rallyRoad(P, C) {
  const p = C.pal, R = p.road, k = C.key;
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const X = C.X0 + x, Y = C.Y0 + y, n = rallyNoise(X / 2.5, Y / 2.5, 11), wear = rallyFbm(X / 22, Y / 22, 5);
    let col = n > 0.74 ? R[2] : n < 0.24 ? R[1] : R[0];
    if (wear > 0.64 && n < 0.5) col = R[1];
    if (rallyHash(X, Y, 15) < 0.012) col = R[3];
    P.set(x, y, col);
  }
  // the world's grit
  const h = rallyHash(C.tx, C.ty, 16);
  if (k === 'neon') {
    if (h < 0.12) for (let j = 0; j < 7; j++) P.set(3 + j + (j >> 1), 4 + j, R[4]);
    if (h > 0.9) { P.rect(4, 9, 7, 3, '#1C1C2C'); P.set(5, 10, p.glow[(C.tx + C.ty) & 3]); P.set(8, 10, p.glow[(C.tx + 1) & 3]); }
  } else if (k === 'lava') {
    if (h < 0.1) { for (let j = 0; j < 8; j++) P.set(4 + j, 6 + (j * 3 >> 2), p.lava[4]); P.set(7, 8, p.lava[2]); }
  } else if (k === 'swamp') {
    if (h < 0.1) { P.rect(5, 6, 6, 3, p.mud[3]); P.rect(6, 7, 3, 1, p.pit[2]); }
  } else if (k === 'ice') {
    if (h < 0.15) { P.set(6, 5, '#FFFFFF'); P.set(10, 11, '#FFFFFF'); P.set(11, 11, R[2]); }
  }
  // tyre marks along the racing line (on the straights), skid marks on the corners
  const d = C.dir, horiz = d === 1 || d === 3;
  if (Math.abs(C.lat) < C.half - 1) {
    if (!C.corner && C.axis) {
      for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
        const X = C.X0 + x, Y = C.Y0 + y, along = horiz ? X : Y, across = (horiz ? Y : X) + Math.round(rallyNoise(along / 40, 0, 17) * 4);
        const lane = ((across % 22) + 22) % 22;
        if ((lane === 3 || lane === 9) && rallyNoise(along / 14, across / 22, 18) > 0.42) P.shade(x, y, k === 'ice' ? 0.86 : 0.82);
      }
    } else if (h > 0.55) {
      const [ax, ay] = rallyRot(d, 4, 12), [bx, by] = rallyRot(d, 11, 2);
      for (let j = 0; j <= 10; j++) { const x = Math.round(ax + (bx - ax) * j / 10), y = Math.round(ay + (by - ay) * j / 10); P.shade(x, y, 0.78); P.shade(x + 1, y, 0.85); }
    }
  }
  // neon: the dashed lane line down the middle of the straights
  if (k === 'neon' && !C.corner && C.axis && Math.abs(C.lat) < 1) {
    const off = d === 1 ? 8 - C.lat * 16 : d === 3 ? 8 + C.lat * 16 : d === 2 ? 8 + C.lat * 16 : 8 - C.lat * 16, c = Math.round(off) - 1;
    if (c >= -1 && c < 16) for (let a = 0; a < 16; a++) {
      const along = (horiz ? C.X0 : C.Y0) + a;
      if (along % 16 < 8) { if (horiz) P.rect(a, c, 1, 2, p.paint); else P.rect(c, a, 2, 1, p.paint); }
    }
  }
}
// the edge of the track by a barrier: a gutter, a painted line; the barrier's shadow (light from the top left)
function rallyEdges(P, C, paint) {
  const p = C.pal, wall = (dx, dy) => C.at(dx, dy) === '#' || C.at(dx, dy) === ' ';
  const N = wall(0, -1), S = wall(0, 1), E = wall(1, 0), Wt = wall(-1, 0);
  if (paint) {
    const line = C.key === 'neon' ? '#E8E8F0' : C.key === 'ice' ? '#3C64B8' : p.edge;
    if (N) { P.rect(0, 0, 16, 1, p.road[4]); P.rect(0, 2, 16, 1, line); }
    if (S) { P.rect(0, 15, 16, 1, p.road[4]); P.rect(0, 13, 16, 1, line); }
    if (Wt) { P.rect(0, 0, 1, 16, p.road[4]); P.rect(2, 0, 1, 16, line); }
    if (E) { P.rect(15, 0, 1, 16, p.road[4]); P.rect(13, 0, 1, 16, line); }
  }
  if (C.at(0, -1) === '#') P.shadeRect(0, 0, 16, 3, 0.7);
  if (C.at(-1, 0) === '#') P.shadeRect(0, C.at(0, -1) === '#' ? 3 : 0, 2, 16, 0.72);
  if (C.at(-1, -1) === '#' && C.at(0, -1) !== '#' && C.at(-1, 0) !== '#') P.shadeRect(0, 0, 2, 3, 0.72);
}

// ---- the barriers: tyre walls, logs, ice blocks, steel, concrete with neon; red and white on the corners
function rallyWall(P, C) {
  const p = C.pal, Wc = p.wall, B = p.block, k = C.key;
  const road = (dx, dy) => rallyRoadCh(C.at(dx, dy));
  const n = road(0, -1), s = road(0, 1), e = road(1, 0), w = road(-1, 0);
  // on a corner? (a track tile round it on a bend)
  let corner = false;
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const m = C.metaAt(dx, dy); if (m && m.corner && rallyRoadCh(C.at(dx, dy))) corner = true; }
  const horiz = (n || s) && !(e || w) ? true : (e || w) && !(n || s) ? false : null;
  RALLY_OUT[k](P, C);
  if (k === 'desert') {
    // stacked tyres, 2 x 2 a tile; painted red and white on the bends
    for (let cy = 0; cy < 2; cy++) for (let cx = 0; cx < 2; cx++) {
      const gx = C.tx * 2 + cx, gy = C.ty * 2 + cy, paint = corner ? ((gx + gy) & 1 ? Wc[4] : Wc[3]) : null;
      for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
        const r = Math.hypot(x - 3.5, y - 3.5);
        if (r > 4) continue;
        let col = r > 3.2 ? Wc[5] : r > 1.6 ? (paint && r > 2.3 ? paint : (x + y < 6 ? Wc[1] : Wc[0])) : Wc[5];
        if (r > 1.6 && r < 2.3 && x + y < 6) col = paint ? '#FFFFFF' : Wc[2];
        P.set(cx * 8 + x, cy * 8 + y, col);
      }
    }
  } else if (k === 'swamp') {
    // logs lashed along the track; a stump where the fence turns
    if (horiz === null) {
      for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
        const r = Math.hypot(x - 7.5, y - 7.5);
        if (r > 7.6) continue;
        P.set(x, y, r > 6.5 ? Wc[4] : Math.floor(r) % 2 ? Wc[2] : Wc[1]);
      }
      P.rect(7, 7, 2, 2, Wc[5]);
    } else {
      for (let a = 0; a < 16; a++) for (let b = 0; b < 16; b++) {
        const lb = b % 8, X = horiz ? a : b, Y = horiz ? b : a, along = (horiz ? C.X0 : C.Y0) + a;
        let col = lb === 0 ? Wc[5] : lb === 1 ? Wc[3] : lb === 7 ? Wc[4] : lb === 6 ? Wc[0] : Wc[1];
        if (lb > 1 && lb < 6 && rallyHash(along >> 2, (horiz ? C.Y0 : C.X0) + b, 19) < 0.18) col = Wc[0];
        if (along % 24 === 0 && lb > 0) col = Wc[5];
        P.set(X, Y, col);
      }
      // the lashings
      for (let b = 0; b < 16; b++) { const along = 8; if (horiz) P.set(along, b, Wc[3]); else P.set(b, along, Wc[3]); }
    }
  } else {
    // blocks: ice, steel or concrete
    const top = B[0], mid = B[1], hi = B[2], lo = B[3];
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const X = C.X0 + x, Y = C.Y0 + y;
      let col = top;
      if (k === 'ice') { const f = rallyNoise(X / 5, Y / 5, 20); col = f > 0.7 ? hi : f < 0.3 ? mid : top; }
      else if (rallyHash(X, Y, 21) < 0.08) col = mid;
      P.set(x, y, col);
    }
    // joints between the blocks along the barrier
    if (horiz !== false) { P.rect(0, 0, 16, 1, hi); P.rect(((C.tx & 1) ? 0 : 8), 1, 1, 14, lo); }
    if (horiz !== true) { P.rect(0, 0, 1, 16, hi); P.rect(1, ((C.ty & 1) ? 0 : 8), 14, 1, lo); }
    // a dark outline where the barrier meets the track or the ground
    if (C.at(0, -1) !== '#') P.rect(0, 0, 16, 1, lo);
    if (C.at(-1, 0) !== '#') P.rect(0, 0, 1, 16, lo);
    if (C.at(1, 0) !== '#') P.rect(15, 0, 1, 16, lo);
    if (C.at(0, 1) !== '#') P.rect(0, 15, 16, 1, lo);
    if (k === 'lava') {
      // bolts; hazard stripes on the bends
      for (const [x, y] of [[3, 3], [12, 3], [3, 12], [12, 12]]) { P.set(x, y, lo); P.set(x - 1, y - 1, hi); }
      if (corner) for (let y = 4; y < 12; y++) for (let x = 1; x < 15; x++) P.set(x, y, ((C.X0 + x + C.Y0 + y) >> 2) & 1 ? Wc[3] : Wc[4]);
    } else if (k === 'neon') {
      // a neon strip along the barrier's top
      const glow = corner ? Wc[3] : Wc[4];
      if (horiz !== false) { P.rect(0, 6, 16, 3, Wc[5]); P.rect(0, 7, 16, 1, glow); }
      if (horiz !== true) { P.rect(6, 0, 3, 16, Wc[5]); P.rect(7, 0, 1, 16, glow); }
      if (horiz === null) P.rect(6, 6, 3, 3, glow);
    } else if (k === 'ice') {
      // frost on the top; red and white poles on the bends
      for (let x = 1; x < 15; x += 3) P.set(x, 1 + (x % 2), '#FFFFFF');
      if (corner) { P.rect(6, 2, 4, 12, Wc[2]); for (let y = 2; y < 14; y += 4) P.rect(6, y, 4, 2, Wc[4]); P.rect(6, 2, 1, 12, '#FFFFFF'); }
    }
  }
  // the barrier's face, seen a little from the south; a lit top edge
  if (!rallyRoadCh(C.at(0, 1)) && C.at(0, 1) === '#') return;
  if (k !== 'desert' && horiz !== false) {
    const face = k === 'swamp' ? Wc[5] : B[3];
    P.shadeRect(0, 12, 16, 4, 0.7); P.rect(0, 15, 16, 1, face);
  } else if (k === 'desert') P.shadeRect(0, 14, 16, 2, 0.75);
}

// ---- the start/finish: a chequered band across the track; the grid's slots behind it
function rallyStart(P, C) {
  const T = C.T, d = T && T.start ? T.start.dir : 1, horiz = d === 1 || d === 3;
  for (let a = 0; a < 16; a++) for (let b = 4; b < 12; b++) {
    const along = (horiz ? C.Y0 : C.X0) + a, ch = ((along >> 2) + (b >> 2)) & 1;
    if (horiz) P.set(b, a, ch ? '#F8F8F8' : '#101010'); else P.set(a, b, ch ? '#F8F8F8' : '#101010');
  }
  if (horiz) { P.rect(3, 0, 1, 16, '#F8F8F8'); P.rect(12, 0, 1, 16, '#F8F8F8'); } else { P.rect(0, 3, 16, 1, '#F8F8F8'); P.rect(0, 12, 16, 1, '#F8F8F8'); }
}
function rallyGridMark(P, C) {
  const T = C.T;
  if (!T || !T.start) return;
  const s = T.start, d = s.dir, dx = [0, 1, 0, -1][d], dy = [-1, 0, 1, 0][d];
  const back = (s.x - C.tx) * dx + (s.y - C.ty) * dy, side = (C.tx - s.x) * -dy + (C.ty - s.y) * dx;
  if (back < 1 || back > 4 || Math.abs(side) > 1) return;
  if (!T.rows[C.ty + dy * back] || T.rows[C.ty + dy * back][C.tx + dx * back] !== 's') return;
  if ((back + side) & 1) return;
  // a box open at the back: the slot's front line and its sides
  for (let j = 2; j < 14; j++) {
    const [x1, y1] = rallyRot(d, j, 1), [x2, y2] = rallyRot(d, 2, j), [x3, y3] = rallyRot(d, 13, j);
    P.set(x1, y1, '#E8E8E8');
    if (j < 7) { P.set(x2, y2, '#E8E8E8'); P.set(x3, y3, '#E8E8E8'); }
  }
}

// ---- a jump ramp facing d: planks across, rising to the lip, arrows up the middle, rails at the sides
function rallyRamp(P, C, d) {
  const p = C.pal, R = p.ramp, dx = [0, 1, 0, -1][d], dy = [-1, 0, 1, 0][d], c = '^>v<'[d];
  const lip = C.at(dx, dy) !== c, foot = C.at(-dx, -dy) !== c;
  const sideL = C.at(-dy, dx) !== c, sideR = C.at(dy, -dx) !== c;
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    // y = 0 is the front (the way the ramp faces); the ramp climbs from its foot to its lip
    const hgt = (lip ? 16 : 0) + (16 - y), col = (y % 4 === 3) ? R[3] : hgt > 22 ? R[2] : hgt > 10 ? R[1] : R[0];
    const [X, Y] = rallyRot(d, x, y);
    P.set(X, Y, col);
  }
  // the arrows
  const arrow = p.boost[0];
  for (let k = 0; k < 2; k++) for (let j = 0; j < 4; j++) {
    const y = 3 + k * 7 + j;
    for (const x of [7 - j, 8 + j]) { const [X, Y] = rallyRot(d, x, y); P.set(X, Y, arrow); const [X2, Y2] = rallyRot(d, x, y + 1); P.set(X2, Y2, R[3]); }
  }
  // rails, the lip's bright edge, the foot's dark seam
  for (let y = 0; y < 16; y++) {
    if (sideL) { const [X, Y] = rallyRot(d, 0, y); P.set(X, Y, R[3]); const [X2, Y2] = rallyRot(d, 1, y); P.set(X2, Y2, '#F8F8F8'); }
    if (sideR) { const [X, Y] = rallyRot(d, 15, y); P.set(X, Y, R[3]); const [X2, Y2] = rallyRot(d, 14, y); P.set(X2, Y2, R[0]); }
  }
  for (let x = 0; x < 16; x++) {
    if (lip) { const [X, Y] = rallyRot(d, x, 0); P.set(X, Y, '#F8F8F8'); const [X2, Y2] = rallyRot(d, x, 1); P.set(X2, Y2, (x >> 2) & 1 ? '#F8D838' : '#101010'); }
    if (foot) { const [X, Y] = rallyRot(d, x, 15); P.set(X, Y, R[3]); }
  }
}

// ---- a pit: the far wall of the chasm, its depth, its lips; in the swamp, acid water
function rallyPit(P, C) {
  const p = C.pal, A = p.pit, k = C.key, pit = (dx, dy) => C.at(dx, dy) === '~';
  const N = !pit(0, -1), S = !pit(0, 1), E = !pit(1, 0), Wt = !pit(-1, 0);
  if (k === 'swamp') {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const X = C.X0 + x, Y = C.Y0 + y, w = Math.sin((X * 0.7 + Y) / 2.6 + rallyNoise(X / 7, Y / 7, 22) * 5);
      P.set(x, y, w > 0.93 ? A[3] : w > 0.6 ? A[2] : A[1]);
      if (rallyHash(X, Y, 23) < 0.01) P.set(x, y, '#E8F8A0');
    }
    // the muddy banks
    if (N) { P.rect(0, 0, 16, 3, p.mud[0]); P.rect(0, 3, 16, 1, A[3]); }
    if (S) { P.rect(0, 14, 16, 2, p.mud[2]); P.rect(0, 13, 16, 1, A[3]); }
    if (Wt) { P.rect(0, 0, 2, 16, p.mud[0]); P.rect(2, N ? 3 : 0, 1, 16, A[3]); }
    if (E) { P.rect(14, 0, 2, 16, p.mud[2]); P.rect(13, N ? 3 : 0, 1, 16, A[3]); }
    return;
  }
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const X = C.X0 + x, Y = C.Y0 + y, n = rallyHash(X, Y, 24);
    let col = n < 0.04 ? A[1] : A[0];
    if (k === 'lava' && rallyNoise(X / 6, Y / 6, 25) > 0.72) col = n < 0.5 ? A[2] : A[3];
    if (k === 'ice' && rallyNoise(X / 5, Y / 5, 25) > 0.75) col = A[1];
    if (k === 'neon' && n > 0.995) col = p.glow[(X + Y) & 3];
    P.set(x, y, col);
  }
  // the far (north) wall seen from above: strata going down into the dark
  if (N) {
    const face = k === 'ice' ? [p.ice[0], p.ice[2], p.ice[4], A[2]] : k === 'neon' ? ['#686878', '#4C4C58', '#34343C', A[2]] : [p.rock[3], p.rock[0], p.rock[2], A[2]];
    for (let x = 0; x < 16; x++) {
      const X = C.X0 + x, deep = 5 + (rallyHash(X >> 1, C.ty, 26) < 0.4 ? 1 : 0);
      for (let y = 0; y < deep; y++) P.set(x, y, face[Math.min(3, Math.floor(y * 4 / deep))]);
      if (k === 'neon' && (X % 5 === 0)) { P.set(x, deep, '#8C5C34'); P.set(x, deep + 1, '#8C5C34'); }
    }
    P.rect(0, 0, 16, 1, p.edge);
  }
  // the side walls and the near lip
  const side = k === 'ice' ? [p.ice[1], p.ice[0], p.ice[4]] : k === 'neon' ? ['#7C7C8C', '#585868', '#34343C'] : [p.rock[3], p.rock[0], p.rock[2]];
  for (let y = 0; y < 16; y++) {
    const j = rallyHash(C.tx, C.Y0 + y >> 1, 27) < 0.4 ? 1 : 0;
    if (Wt) { P.set(0, y, p.edge); P.set(1, y, side[1]); P.set(2, y, side[2]); if (j) P.set(3, y, side[2]); }
    if (E) { P.set(15, y, side[2]); P.set(14, y, A[1]); }
  }
  if (S) { P.rect(0, 13, 16, 1, A[1]); P.rect(0, 14, 16, 1, side[0]); P.rect(0, 15, 16, 1, side[1]); }
}

// ---- lava: molten, crusted plates drifting on it, a dark rim where it meets the ground
function rallyLava(P, C) {
  const L = C.pal.lava || ['#F86800', '#F8B800', '#C82800', '#FCE4A0', '#781800'];
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const X = C.X0 + x, Y = C.Y0 + y, n = rallyFbm(X / 9, Y / 9, 27), f = rallyNoise(X / 3, Y / 5, 28);
    let col = n > 0.66 ? (n > 0.7 ? '#3C1008' : L[4]) : n < 0.32 ? (f > 0.6 ? L[3] : L[1]) : f > 0.7 ? L[1] : L[0];
    if (n > 0.6 && n <= 0.66) col = L[2];
    P.set(x, y, col);
  }
  const lv = (dx, dy) => C.at(dx, dy) === 'l';
  if (!lv(0, -1)) { P.rect(0, 0, 16, 1, '#3C1008'); P.rect(0, 1, 16, 1, L[2]); }
  if (!lv(0, 1)) { P.rect(0, 15, 16, 1, '#3C1008'); P.rect(0, 14, 16, 1, L[2]); }
  if (!lv(-1, 0)) { P.rect(0, 0, 1, 16, '#3C1008'); P.rect(1, 0, 1, 16, L[2]); }
  if (!lv(1, 0)) { P.rect(15, 0, 1, 16, '#3C1008'); P.rect(14, 0, 1, 16, L[2]); }
}

// ---- ice, mud, rough: the patch's own look, ragged where it meets the road
function rallyPatch(P, C, ch) {
  const p = C.pal, k = C.key;
  const same = (dx, dy) => C.at(dx, dy) === ch || !rallyFloorCh(C.at(dx, dy));
  const N = same(0, -1), S = same(0, 1), E = same(1, 0), Wt = same(-1, 0);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const X = C.X0 + x, Y = C.Y0 + y;
    // the ragged border: some pixels near an open side stay road
    const edge = Math.min(N ? 99 : y, S ? 99 : 15 - y, Wt ? 99 : x, E ? 99 : 15 - x);
    if (edge < 3 && rallyHash(X, Y, 29) * 3 > edge) continue;
    let col;
    if (ch === 'i') {
      const I = p.ice || ['#8CCCF0', '#B8E4FC', '#68A8E0', '#E8FCFF', '#4C88C8'], sh = (X + Y * 2 + Math.round(rallyNoise(X / 20, Y / 20, 30) * 18)) % 23;
      col = sh < 2 ? I[3] : sh < 4 ? I[1] : rallyNoise(X / 6, Y / 6, 31) > 0.7 ? I[2] : I[0];
      if (rallyHash(X, Y, 32) < 0.006) col = '#FFFFFF';
    } else if (ch === 'm') {
      const M = p.mud || ['#5C4428', '#4C3820', '#6C5434', '#7C6C44', '#3C2C18'], n = rallyFbm(X / 8, Y / 8, 33);
      col = n < 0.3 ? M[3] : n > 0.7 ? M[4] : (rallyHash(X, Y, 34) < 0.08 ? M[2] : M[0]);
      if (n < 0.27 && rallyHash(X, Y, 35) < 0.1) col = '#C8C8A0';
    } else {
      const Rg = p.rough, n = rallyNoise(X / 2, Y / 2, 36);
      col = n > 0.72 ? Rg[2] : n < 0.25 ? Rg[3] : (rallyHash(X, Y, 37) < 0.15 ? Rg[1] : Rg[0]);
      if (k === 'lava' && rallyHash(X, Y, 38) < 0.02) col = Rg[3];
    }
    P.set(x, y, col);
  }
  // ruts through the mud along the way the race goes; tufts on the rough
  if (ch === 'm') {
    const horiz = C.dir === 1 || C.dir === 3;
    for (let a = 0; a < 16; a++) for (const b of [5, 10]) { if (horiz) P.shade(a, b, 0.75); else P.shade(b, a, 0.75); }
  } else if (ch === ',') {
    const h = rallyHash(C.tx, C.ty, 39);
    const tuft = { desert: '#7C8C30', swamp: '#A8C060', ice: '#FFFFFF', lava: '#F87800', neon: '#7C7C8C' }[k];
    for (let j = 0; j < 3; j++) {
      const x = 2 + Math.floor(rallyHash(C.tx, C.ty, 40 + j) * 12), y = 3 + Math.floor(rallyHash(C.tx, C.ty, 43 + j) * 10);
      if (h < 0.7) { P.set(x, y, tuft); P.set(x + 1, y - 1, tuft); P.set(x - 1, y - 1, tuft); P.set(x, y + 1, p.rough[3]); }
    }
  }
}

// ---- a boost pad: a glowing plate with chevrons pointing the way
function rallyBoost(P, C) {
  const B = C.pal.boost, d = C.dir;
  for (let y = 1; y < 15; y++) for (let x = 1; x < 15; x++) P.set(x, y, B[1]);
  P.rect(1, 1, 14, 1, B[0]); P.rect(1, 14, 14, 1, B[0]); P.rect(1, 1, 1, 14, B[0]); P.rect(14, 1, 1, 14, B[0]);
  const along = (d === 1 || d === 3 ? C.X0 : C.Y0) >> 4;
  for (let k = 0; k < 2; k++) for (let j = 0; j < 5; j++) {
    const y = 2 + k * 6 + j, col = (k + along) & 1 ? B[2] : B[0];
    for (const x of [7 - j, 8 + j]) { const [X, Y] = rallyRot(d, x, y); P.set(X, Y, col); const [X2, Y2] = rallyRot(d, x, y + 1); P.set(X2, Y2, col); }
  }
}

// ---- a pickup spot: a painted ring (money) or a cross (repair); the pickup itself is the engine's
function rallySpot(P, C, ch) {
  const col = ch === '$' ? C.pal.spot : C.pal.heal;
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const r = Math.hypot(x - 7.5, y - 7.5);
    if (r > 5.3 && r < 6.6) P.tint(x, y, col, 0.65);
  }
  if (ch === '+') { for (let k = 4; k < 12; k++) { P.tint(k, 7, col, 0.5); P.tint(k, 8, col, 0.5); P.tint(7, k, col, 0.5); P.tint(8, k, col, 0.5); } }
  else { for (let k = 5; k < 11; k++) P.tint(7, k, col, 0.4); P.tint(6, 6, col, 0.4); P.tint(8, 9, col, 0.4); }
}

// a crate (cover, shells break it) on whatever g is: wood, ice-crusted metal, hazard steel, a container
function rallyCrateArt(g, world) {
  const W = typeof world === 'string' ? rallyWorld(world) : world || RALLY_WORLDS[0], k = W.key, Cr = W.pal.crate, P = rallyPainter();
  RALLY_PB.img.data.fill(0);
  P.rect(1, 1, 14, 14, Cr[2]); P.rect(2, 2, 12, 12, Cr[0]);
  if (k === 'desert' || k === 'swamp') {
    for (let y = 4; y < 14; y += 3) P.rect(2, y, 12, 1, Cr[1]);
    for (let j = 2; j < 14; j++) { P.set(j, j, Cr[2]); P.set(15 - j, j, Cr[2]); }
    P.rect(2, 2, 12, 1, Cr[3]); P.rect(2, 2, 1, 12, Cr[3]);
  } else if (k === 'neon') {
    for (let x = 3; x < 14; x += 2) P.rect(x, 2, 1, 12, Cr[1]);
    P.rect(2, 2, 12, 1, Cr[3]); P.rect(4, 6, 8, 4, '#F8D838'); P.rect(5, 7, 6, 2, '#101018');
  } else {
    P.rect(2, 2, 12, 1, Cr[3]); P.rect(2, 2, 1, 12, Cr[3]); P.rect(4, 4, 8, 8, Cr[1]); P.rect(5, 5, 6, 6, Cr[0]);
    for (const [x, y] of [[3, 3], [12, 3], [3, 12], [12, 12]]) P.set(x, y, Cr[3]);
    if (k === 'lava') for (let x = 5; x < 11; x++) P.set(x, 7 + ((x >> 1) & 1), '#F8B800');
    if (k === 'ice') { P.rect(2, 2, 12, 2, '#F8FCFF'); P.set(5, 4, '#F8FCFF'); P.set(10, 4, '#F8FCFF'); }
  }
  P.rect(2, 15, 14, 1, '#101010'); P.rect(15, 2, 1, 14, '#101010');
  P.done(g);
}

// ---- one tile of the ground, ch from the legend, at tile tx, ty of the track (see the header)
function rallyGroundArt(g, ch, tx, ty, world, R, track) {
  const C = rallyArtCtx(ch, tx, ty, world, track), P = rallyPainter();
  if (ch === ' ') RALLY_OUT[C.key](P, C);
  else if (ch === '#') rallyWall(P, C);
  else if (ch === '~') rallyPit(P, C);
  else if (ch === 'l') rallyLava(P, C);
  else {
    rallyRoad(P, C);
    if (ch === 'i' || ch === 'm' || ch === ',') rallyPatch(P, C, ch);
    rallyEdges(P, C, ch !== '=');
    if (ch === '=') {
      // the kerb: red and white blocks on the barrier side of the tile
      const wall = (dx, dy) => !rallyRoadCh(C.at(dx, dy));
      const sides = [wall(0, -1), wall(1, 0), wall(0, 1), wall(-1, 0)], any = sides.some(v => v);
      for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
        const inKerb = !any || (sides[0] && y < 8) || (sides[2] && y > 7) || (sides[3] && x < 8) || (sides[1] && x > 7);
        if (!inKerb) continue;
        const horiz = sides[0] || sides[2] ? true : sides[1] || sides[3] ? false : C.dir === 1 || C.dir === 3;
        const along = horiz ? C.X0 + x : C.Y0 + y, red = (along >> 2) & 1;
        let col = red ? '#D82800' : '#F8F8F8';
        const inner = (sides[0] && y === 7) || (sides[2] && y === 8) || (sides[3] && x === 7) || (sides[1] && x === 8);
        if (inner) col = red ? '#881400' : '#BCBCBC';
        P.set(x, y, col);
      }
      rallyEdges(P, C, false);
    }
    if (ch === 's') rallyStart(P, C);
    else if (ch === 'b') rallyBoost(P, C);
    else if (ch === '$' || ch === '+') rallySpot(P, C, ch);
    else if ('^>v<'.includes(ch)) rallyRamp(P, C, '^>v<'.indexOf(ch));
    else if (ch === '.') rallyGridMark(P, C);
  }
  P.done(g);
  if (ch === 'x') rallyCrateArt(g, C.W);
}

// the whole ground of a track on one canvas (W x H tiles of 16 px), kept per track
const RALLY_GROUND_CACHE = {};
function rallyGround(track) {
  const T = typeof track === 'string' ? rallyTrack(track) : track;
  if (RALLY_GROUND_CACHE[T.key]) return RALLY_GROUND_CACHE[T.key];
  const c = makeCanvas(T.w * 16, T.h * 16), g = c.getContext('2d'), R = seeded(4242);
  for (let ty = 0; ty < T.h; ty++) for (let tx = 0; tx < T.w; tx++) {
    g.save(); g.translate(tx * 16, ty * 16);
    rallyGroundArt(g, T.rows[ty][tx], tx, ty, T.world, R, T);
    g.restore();
  }
  RALLY_GROUND_CACHE[T.key] = c;
  return c;
}
// a minimap: s px a tile, the barriers and the scenery dark, the track its colours
function rallyThumb(track, s = 2) {
  const T = typeof track === 'string' ? rallyTrack(track) : track, c = makeCanvas(T.w * s, T.h * s), g = c.getContext('2d');
  for (let ty = 0; ty < T.h; ty++) for (let tx = 0; tx < T.w; tx++) {
    const ch = T.rows[ty][tx];
    if (ch === ' ') continue;
    g.fillStyle = RALLY_THUMB_COL[ch] || '#7C7C7C';
    g.fillRect(tx * s, ty * s, s, s);
  }
  return c;
}
