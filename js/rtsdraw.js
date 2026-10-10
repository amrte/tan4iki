'use strict';
// =====================================================================
//  DESERT DOMINION: drawing the map view. The terrain is prerendered into 16x16-tile chunks (only the tiles that
//  change are redrawn: glimmer dug, craters, concrete, rubble), the shroud into a second set of chunks over
//  everything; buildings, wrecks, units (sorted by depth), shots, effects, aircraft with shadows, sandwyrms, then
//  the shroud, selection marks, the placement ghost and the cursor.
//  The pictures come from the art helpers (rtsart_units.js: rtsUnitArt ...; rtsart_world.js: rtsTileArt ...) when
//  they're loaded; until then (or if one fails) simple shapes drawn here stand in. A tiny 3x5 font for the sidebar.
// =====================================================================

// ------------------------------------------------------------------ the tiny font (3x5, 4 px a letter)
const RTS_TINY_SRC = {
  0: '111101101101111', 1: '010110010010111', 2: '111001111100111', 3: '111001011001111', 4: '101101111001001', 5: '111100111001111',
  6: '111100111101111', 7: '111001010010010', 8: '111101111101111', 9: '111101111001111',
  A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110', E: '111100110100111', F: '111100110100100',
  G: '011100101101011', H: '101101111101101', I: '111010010010111', J: '001001001101010', K: '101101110101101', L: '100100100100111',
  M: '101111111101101', N: '110101101101101', O: '010101101101010', P: '110101110100100', Q: '010101101110011', R: '110101110101101',
  S: '011100010001110', T: '111010010010010', U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101',
  Y: '101101010010010', Z: '111001010100111', ' ': '000000000000000', '.': '000000000000010', ',': '000000000010100', ':': '000010000010000',
  '-': '000000111000000', '+': '000010111010000', '/': '001001010100100', '!': '010010010000010', '?': '110001010000010', '%': '101001010100101',
  '$': '011110010011110', '(': '001010010010001', ')': '100010010010100', "'": '010010000000000', '>': '100010001010100', '<': '001010100010001',
  '=': '000111000111000', '#': '101111101111101', '*': '000101010101000', '^': '010101000000000', '_': '000000000000111', '|': '010010010010010',
};
const RTS_TINY_CACHE = new Map();
function rtsTinyWidth(s) { return String(s).length * 4 - 1; }
// a line of tiny text (cached per text and colour)
function rtsTiny(ctx, s, x, y, color) {
  s = String(s).toUpperCase();
  const k = color + '|' + s;
  let c = RTS_TINY_CACHE.get(k);
  if (!c) {
    if (RTS_TINY_CACHE.size > 800) RTS_TINY_CACHE.clear();
    c = makeCanvas(Math.max(1, s.length * 4), 5);
    const g = c.getContext('2d');
    g.fillStyle = color;
    for (let i = 0; i < s.length; i++) {
      const b = RTS_TINY_SRC[s[i]] || RTS_TINY_SRC['?'];
      for (let p = 0; p < 15; p++) if (b[p] === '1') g.fillRect(i * 4 + (p % 3), (p / 3) | 0, 1, 1);
    }
    RTS_TINY_CACHE.set(k, c);
  }
  ctx.drawImage(c, x | 0, y | 0);
}
function rtsTinyCenter(ctx, s, cx, y, color) { rtsTiny(ctx, s, Math.round(cx - rtsTinyWidth(s) / 2), y, color); }
function rtsTinyRight(ctx, s, xr, y, color) { rtsTiny(ctx, s, xr - rtsTinyWidth(s), y, color); }

// ------------------------------------------------------------------ the art helpers, or the stand-ins
const RTS_ART_BAD = {};
function rtsArtFail(name, e) { if (!RTS_ART_BAD[name]) { RTS_ART_BAD[name] = true; console.error('DESERT DOMINION art: ' + name, e); } }
const RTS_DEF_CACHE = new Map();
function rtsDefCached(key, w, h, draw) {
  let c = RTS_DEF_CACHE.get(key);
  if (!c) { c = makeCanvas(w, h); const g = c.getContext('2d'); draw(g); RTS_DEF_CACHE.set(key, c); }
  return c;
}
const rtsPal = h => RTS_HOUSE_PAL[h] || RTS_HOUSE_PAL.nomad;
function rtsHash(x, y) { let n = (x * 374761393 + y * 668265263) | 0; n = (n ^ (n >>> 13)) * 1274126177; return (n ^ (n >>> 16)) >>> 0; }

const RTS_TILE_COL = ['#D49A50', '#C68A46', '#8E6E52', '#5A4434', '#D49A50', '#D49A50', '#D49A50', '#9C9A92', '#C88E48', '#866650', '#7E6A58'];
function rtsDefTile(kind, mask, variant) {
  return rtsDefCached('t' + kind + ',' + mask + ',' + variant, 16, 16, g => {
    const r = rtsRng(kind * 977 + variant * 131 + 7);
    const base = RTS_TILE_COL[kind] || '#D49A50';
    g.fillStyle = base; g.fillRect(0, 0, 16, 16);
    const dots = (n, cols, sz) => { for (let k = 0; k < n; k++) { g.fillStyle = cols[(r() * cols.length) | 0]; g.fillRect((r() * 16) | 0, (r() * 16) | 0, sz || 1, sz || 1); } };
    switch (kind) {
      case 0: case 4: case 5: case 6: case 8: dots(22, ['#C48A44', '#E2AE66', '#CC944C']); break;
      case 1: for (let y = 0; y < 16; y += 4) { g.fillStyle = '#B07838'; g.fillRect(0, y + ((variant + y) & 3), 16, 1); g.fillStyle = '#DCA460'; g.fillRect(0, y + 1 + ((variant + y) & 3), 16, 1); } break;
      case 2: case 9: case 10: dots(26, ['#7C5E46', '#A07E60', '#86684C']); if (variant & 1) { g.fillStyle = '#6C5040'; g.fillRect(3 + variant, 5, 5, 1); g.fillRect(7 + variant, 6, 1, 3); } break;
      case 3: dots(30, ['#6C5240', '#40302A', '#7A5E48'], 2); g.fillStyle = '#7E6250'; g.fillRect(2 + variant, 2, 6, 2); g.fillStyle = '#2E221C'; g.fillRect(4, 11 - variant, 8, 2); break;
      case 7: g.fillStyle = '#86847C'; g.fillRect(0, 15, 16, 1); g.fillRect(15, 0, 1, 16); g.fillStyle = '#B0AEA6'; g.fillRect(0, 0, 16, 1); g.fillRect(0, 0, 1, 16); dots(8, ['#8E8C84', '#A8A69E']); break;
    }
    if (kind === 4 || kind === 5) dots(kind === 5 ? 70 : 28, kind === 5 ? ['#E86810', '#F89838', '#C85008', '#F8B858'] : ['#E87818', '#F0A040', '#D06010'], kind === 5 ? 2 : 1);
    if (kind === 6) { g.fillStyle = '#8C4C20'; g.beginPath(); g.arc(8, 9, 5, 0, 7); g.fill(); g.fillStyle = '#E88828'; g.beginPath(); g.arc(8, 8, 3, 0, 7); g.fill(); g.fillStyle = '#F8D068'; g.fillRect(7, 6, 2, 2); }
    if (kind === 8 || kind === 9) { g.fillStyle = 'rgba(40,24,12,0.55)'; g.beginPath(); g.ellipse(8, 8, 6, 5, 0, 0, 7); g.fill(); g.fillStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.ellipse(8, 9, 3, 2.5, 0, 0, 7); g.fill(); }
    if (kind === 10) dots(10, ['#5A5048', '#9A8C7C', '#3E362E'], 3);
    // edges against other families (the art's mask: 1 up, 2 right, 4 down, 8 left = same family)
    if (kind === 2 || kind === 3 || kind === 7 || kind === 9 || kind === 10) {
      g.fillStyle = kind === 3 ? '#2A1E16' : '#5E4836';
      if (!(mask & 1)) g.fillRect(0, 0, 16, 1);
      if (!(mask & 2)) g.fillRect(15, 0, 1, 16);
      if (!(mask & 4)) { g.fillRect(0, 15, 16, 1); g.fillStyle = 'rgba(60,40,24,0.5)'; g.fillRect(0, 14, 16, 1); }
      if (!(mask & 8)) g.fillRect(0, 0, 1, 16);
    }
  });
}
function rtsTile(kind, mask, variant) {
  if (typeof rtsTileArt === 'function' && !RTS_ART_BAD.tile) { try { const c = rtsTileArt(kind, mask, variant); if (c) return c; } catch (e) { rtsArtFail('tile', e); } }
  return rtsDefTile(kind, mask, variant);
}
function rtsShroudTile(g, x, y, mask) {
  if (typeof rtsDrawShroud === 'function' && !RTS_ART_BAD.shroud) { try { rtsDrawShroud(g, x, y, mask); return; } catch (e) { rtsArtFail('shroud', e); } }
  g.fillStyle = '#000'; g.fillRect(x, y, 16, 16);
  if (!mask) return;
  // a dithered fringe on the sides that face explored ground
  g.fillStyle = 'rgba(0,0,0,0)';
  g.save(); g.globalCompositeOperation = 'destination-out'; g.fillStyle = '#000';
  for (let k = 0; k < 16; k += 2) {
    if (mask & 1) { g.fillRect(x + k, y, 1, 1); g.fillRect(x + k + 1, y + 1, 1, 1); g.fillRect(x + k, y + 2, 1, 1); }
    if (mask & 4) { g.fillRect(x + k, y + 15, 1, 1); g.fillRect(x + k + 1, y + 14, 1, 1); g.fillRect(x + k, y + 13, 1, 1); }
    if (mask & 8) { g.fillRect(x, y + k, 1, 1); g.fillRect(x + 1, y + k + 1, 1, 1); g.fillRect(x + 2, y + k, 1, 1); }
    if (mask & 2) { g.fillRect(x + 15, y + k, 1, 1); g.fillRect(x + 14, y + k + 1, 1, 1); g.fillRect(x + 13, y + k, 1, 1); }
  }
  g.restore();
}

// units: a body turned to dir8 (vehicles), a little person (infantry), a plane
const RTS_DEF_SIZE = { harvester: 20, mcv: 20, juggernaut: 20, gunwing: 20, skylifter: 24, frigate: 40, siege: 18 };
function rtsDefUnit(key, h, dir, frame) {
  const d = RTS_UNITS[key] || { cls: 'veh' };
  const S = d.cls === 'inf' ? 16 : RTS_DEF_SIZE[key] || 16;
  const inf = d.cls === 'inf';
  return rtsDefCached('u' + key + h + dir + ',' + (inf ? frame & 7 : frame & 1), S, S, g => {
    const P = rtsPal(h), c = S / 2;
    if (inf) {
      const legs = (frame & 1) ? 1 : 0;
      g.fillStyle = '#2C2418'; g.fillRect(c - 2 + legs, c + 3, 1, 3); g.fillRect(c + 1 - legs, c + 3, 1, 3);
      g.fillStyle = P[1]; g.fillRect(c - 2, c - 1, 4, 5);
      g.fillStyle = P[2]; g.fillRect(c - 2, c + 2, 4, 1);
      g.fillStyle = key === 'nomad' ? '#C8A070' : key === 'saboteur' ? '#303030' : '#E8B890'; g.fillRect(c - 1, c - 4, 3, 3);
      if (key === 'praetorian') { g.fillStyle = '#E8D048'; g.fillRect(c - 1, c - 5, 3, 1); }
      // the gun, toward dir
      g.fillStyle = '#202020';
      const gx = RTS_DX8[dir], gy = RTS_DY8[dir];
      if (key !== 'saboteur') for (let k = 1; k <= (key === 'trooper' || key === 'praetorian' ? 4 : 3); k++) g.fillRect(c + gx * k, c + gy * k, 1, 1);
      if (frame === 5) { g.fillStyle = '#F8E858'; g.fillRect(c + gx * 5, c + gy * 5, 1, 1); }
      return;
    }
    g.translate(c, c); g.rotate(dir * Math.PI / 4);
    if (d.cls === 'air') {
      if (key === 'frigate') {
        g.fillStyle = '#6C6C74'; g.beginPath(); g.ellipse(0, 0, 11, 18, 0, 0, 7); g.fill();
        g.fillStyle = '#A0A0A8'; g.fillRect(-17, -2, 34, 6); g.fillStyle = P[1]; g.fillRect(-5, -10, 10, 14); g.fillStyle = '#F8D060'; g.fillRect(-2, -16, 4, 3);
      } else if (key === 'skylifter') {
        g.fillStyle = '#8C8C90'; g.fillRect(-3, -10, 6, 20); g.fillRect(-11, -4, 22, 5); g.fillStyle = P[1]; g.fillRect(-3, -3, 6, 6);
        g.fillStyle = '#404048'; g.fillRect(-11, -5, 4, 7); g.fillRect(7, -5, 4, 7);
        if (frame >= 4) { g.fillStyle = '#E0C040'; g.fillRect(-4, 8, 8, 2); }
      } else if (key === 'doomfist') {
        g.fillStyle = '#E8E8E8'; g.fillRect(-2, -7, 4, 13); g.fillStyle = '#D82800'; g.fillRect(-2, -7, 4, 3); g.fillRect(-4, 4, 8, 2);
      } else {
        g.fillStyle = '#9090A0'; g.beginPath(); g.moveTo(0, -9); g.lineTo(8, 6); g.lineTo(0, 3); g.lineTo(-8, 6); g.closePath(); g.fill();
        g.fillStyle = P[1]; g.fillRect(-1, -6, 3, 9);
      }
      return;
    }
    const big = S > 16, L = big ? 8 : 6, Wd = big ? 7 : key === 'trike' || key === 'raider' ? 4 : 5;
    // treads / wheels
    g.fillStyle = '#2E2A26';
    if (d.move === 'wheel') { g.fillRect(-Wd - 1, -L + 1, 2, 3); g.fillRect(Wd - 1, -L + 1, 2, 3); g.fillRect(-Wd - 1, L - 4, 2, 3); g.fillRect(Wd - 1, L - 4, 2, 3); }
    else { g.fillRect(-Wd - 1, -L, 2, L * 2); g.fillRect(Wd - 1, -L, 2, L * 2); g.fillStyle = (frame & 1) ? '#4A443E' : '#38342E'; for (let y = -L; y < L; y += 2) { g.fillRect(-Wd - 1, y, 2, 1); g.fillRect(Wd - 1, y, 2, 1); } }
    // the hull
    g.fillStyle = '#A8A49A'; g.fillRect(-Wd + 1, -L + 1, Wd * 2 - 2, L * 2 - 2);
    g.fillStyle = P[1]; g.fillRect(-Wd + 2, -L + 2, Wd * 2 - 4, 3);
    g.fillStyle = P[2]; g.fillRect(-Wd + 1, L - 2, Wd * 2 - 2, 1);
    if (key === 'harvester') { g.fillStyle = '#6E6A60'; g.fillRect(-Wd + 1, -L - 1, Wd * 2 - 2, 3); g.fillStyle = frame >= 4 && (frame & 1) ? '#F08020' : '#C8A040'; g.fillRect(-3, 0, 6, 5); }
    if (key === 'mcv') { g.fillStyle = '#E0C048'; g.fillRect(-2, -L + 1, 4, 10); g.fillStyle = P[0]; g.fillRect(-4, 2, 8, 4); }
    if (key === 'trike' || key === 'raider' || key === 'quad') { g.fillStyle = '#202020'; g.fillRect(-1, -L - 1, 2, 3); if (key === 'quad') g.fillRect(-3, -L - 1, 1, 3); }
  });
}
function rtsDefTurret(key, h, dir, firing) {
  return rtsDefCached('tu' + key + h + dir + (firing ? 1 : 0), 16, 16, g => {
    const P = rtsPal(h);
    g.translate(8, 8); g.rotate(dir * Math.PI / 4);
    const len = key === 'siege' || key === 'juggernaut' ? 8 : key === 'missile' ? 0 : 7;
    g.fillStyle = '#2C2C2C';
    if (key === 'siege' || key === 'juggernaut') { g.fillRect(-3, -len, 2, len); g.fillRect(1, -len, 2, len); }
    else if (len) g.fillRect(-1, -len, 2, len);
    if (key === 'missile') { g.fillStyle = '#E0E0D8'; g.fillRect(-4, -5, 3, 6); g.fillRect(1, -5, 3, 6); g.fillStyle = '#D04020'; g.fillRect(-4, -5, 3, 1); g.fillRect(1, -5, 3, 1); }
    g.fillStyle = key === 'sonic' ? '#5898F0' : key === 'converter' ? '#58C058' : '#8A8680';
    g.beginPath(); g.arc(0, 0, key === 'juggernaut' ? 4.5 : 3.5, 0, 7); g.fill();
    g.fillStyle = P[0]; g.fillRect(-1, -1, 2, 2);
    if (firing) { g.fillStyle = '#F8E060'; g.fillRect(-1, -len - 2, 2, 2); }
  });
}
// a picture's white silhouette (a unit hit), made once per picture
const RTS_WHITE = new WeakMap();
function rtsWhiteOf(c) {
  let w = RTS_WHITE.get(c);
  if (!w) {
    w = makeCanvas(c.width, c.height);
    const g = w.getContext('2d');
    g.drawImage(c, 0, 0); g.globalCompositeOperation = 'source-atop'; g.fillStyle = '#FFFFFF'; g.fillRect(0, 0, c.width, c.height);
    RTS_WHITE.set(c, w);
  }
  return w;
}
// a unit's picture size (the art's own, else the stand-in's)
function rtsUnitSize(key) { return (typeof RTS_U_SIZE !== 'undefined' && RTS_U_SIZE[key]) || RTS_DEF_SIZE[key] || 16; }
function rtsPicUnit(key, h, dir, frame) {
  if (typeof rtsUnitArt === 'function' && !RTS_ART_BAD.unit) { try { const c = rtsUnitArt(key, h, dir, frame); if (c) return c; } catch (e) { rtsArtFail('unit', e); } }
  return rtsDefUnit(key, h, dir, frame);
}
function rtsTurretPic(key, h, dir, firing) {
  if (typeof rtsTurretArt === 'function' && !RTS_ART_BAD.turret) { try { return rtsTurretArt(key, h, dir, firing); } catch (e) { rtsArtFail('turret', e); } }
  return RTS_UNITS[key] && RTS_UNITS[key].turret ? rtsDefTurret(key, h, dir, firing) : null;
}
function rtsDeathPic(key, h, f) {
  if (typeof rtsInfantryDeathArt === 'function' && !RTS_ART_BAD.death) { try { const c = rtsInfantryDeathArt(key, h, f); if (c) return c; } catch (e) { rtsArtFail('death', e); } }
  return rtsDefCached('dead' + h + Math.min(5, f), 16, 16, g => {
    g.fillStyle = '#8C1C10'; g.fillRect(6, 9, 4 + Math.min(3, f), 2);
    if (f < 5) { g.fillStyle = rtsPal(h)[1]; g.fillRect(6, 7 + Math.min(2, f), 4, 3); }
  });
}
function rtsPicWreck(key, f, dir) {
  if (typeof rtsWreckArt === 'function' && !RTS_ART_BAD.wreck) { try { const c = rtsWreckArt(key, f, dir); if (c) return c; } catch (e) { rtsArtFail('wreck', e); } }
  return rtsDefCached('wr' + (RTS_DEF_SIZE[key] || 16) + (f & 3), 20, 20, g => {
    g.fillStyle = '#2A2420'; g.fillRect(4, 5, 12, 10); g.fillStyle = '#463C34'; g.fillRect(6, 7, 7, 5);
    g.fillStyle = (f & 1) ? '#F07818' : '#F8C040'; g.fillRect(8 + (f & 1), 6, 2, 2);
  });
}
const RTS_SHOT_COL = { bullet: '#F8E870', shell: '#F8A040', heavy: '#F87830', rocket: '#F8F8F8', missile: '#F8F8F8', plasma: '#A8D8F8', sonic: '#88B8F8', gas: '#78E058', doomfist: '#F84020' };
function rtsShotPic(kind, dir, f) {
  if (typeof rtsShotArt === 'function' && !RTS_ART_BAD.shot) { try { const c = rtsShotArt(kind, dir, f); if (c) return c; } catch (e) { rtsArtFail('shot', e); } }
  return rtsDefCached('sh' + kind + dir + (f & 1), 12, 12, g => {
    g.translate(6, 6); g.rotate(dir * Math.PI / 4);
    g.fillStyle = RTS_SHOT_COL[kind] || '#FFF';
    if (kind === 'bullet') g.fillRect(-0.5, -1.5, 1.5, 3);
    else if (kind === 'rocket' || kind === 'missile') { g.fillRect(-1, -3, 2, 5); g.fillStyle = (f & 1) ? '#F8B030' : '#F86020'; g.fillRect(-1, 2, 2, 2); }
    else if (kind === 'plasma') { g.beginPath(); g.arc(0, 0, 2.5, 0, 7); g.fill(); g.fillStyle = '#FFF'; g.fillRect(-1, -1, 2, 2); }
    else if (kind === 'sonic') { g.strokeStyle = 'rgba(136,184,248,0.8)'; g.beginPath(); g.arc(0, 3, 5, -2.4, -0.7); g.stroke(); }
    else if (kind === 'gas') { g.beginPath(); g.arc(0, 0, 2.5, 0, 7); g.fill(); }
    else if (kind === 'doomfist') { g.fillStyle = '#E8E8E8'; g.fillRect(-2, -5, 4, 9); g.fillStyle = '#D82800'; g.fillRect(-2, -5, 4, 2); g.fillStyle = '#F8C040'; g.fillRect(-1, 4, 2, 2); }
    else { const s = kind === 'heavy' ? 3 : 2; g.fillRect(-s / 2, -s / 2, s, s); }
  });
}
function rtsFxPic(kind, f) {
  if (typeof rtsFxArt === 'function' && !RTS_ART_BAD.fx) { try { const c = rtsFxArt(kind, f); if (c) return c; } catch (e) { rtsArtFail('fx', e); } }
  const n = { hit: 3, boom: 6, bigboom: 8, smoke: 5, fire: 6, sand: 4, muzzle: 2, gasCloud: 8, sonicWave: 4, glimmerBurst: 8 }[kind] || 4;
  const S = kind === 'bigboom' ? 48 : kind === 'boom' || kind === 'glimmerBurst' || kind === 'gasCloud' ? 24 : 12;
  return rtsDefCached('fx' + kind + f, S, S, g => {
    const k = (f + 1) / n, c = S / 2;
    if (kind === 'boom' || kind === 'bigboom') {
      g.fillStyle = k < 0.5 ? '#F8F0A0' : '#F87818'; g.globalAlpha = 1 - k * 0.6;
      g.beginPath(); g.arc(c, c, c * (0.3 + k * 0.7), 0, 7); g.fill();
      g.fillStyle = '#C83010'; g.beginPath(); g.arc(c, c, c * k * 0.6, 0, 7); g.fill();
    } else if (kind === 'hit' || kind === 'muzzle') { g.fillStyle = '#F8E870'; g.fillRect(c - 1, c - 3 + f, 2, 6 - 2 * f); g.fillRect(c - 3 + f, c - 1, 6 - 2 * f, 2); }
    else if (kind === 'smoke') { g.fillStyle = 'rgba(90,90,90,' + (0.6 - k * 0.5) + ')'; g.beginPath(); g.arc(c, c, 2 + k * 4, 0, 7); g.fill(); }
    else if (kind === 'fire') { g.fillStyle = f & 1 ? '#F8A030' : '#F86018'; g.beginPath(); g.moveTo(c - 3, c + 4); g.lineTo(c, c - 4 - (f % 3)); g.lineTo(c + 3, c + 4); g.fill(); }
    else if (kind === 'sand') { g.fillStyle = 'rgba(214,170,110,' + (0.8 - k * 0.6) + ')'; g.beginPath(); g.arc(c, c, 2 + k * 4, 0, 7); g.fill(); }
    else if (kind === 'gasCloud') { g.fillStyle = 'rgba(110,220,90,' + (0.6 - k * 0.5) + ')'; g.beginPath(); g.arc(c, c, 4 + k * 7, 0, 7); g.fill(); }
    else if (kind === 'sonicWave') { g.strokeStyle = 'rgba(136,184,248,' + (0.8 - k * 0.6) + ')'; g.beginPath(); g.arc(c, c, 2 + k * 4, 0, 7); g.stroke(); }
    else if (kind === 'glimmerBurst') { g.fillStyle = 'rgba(248,140,40,' + (0.9 - k * 0.7) + ')'; g.beginPath(); g.arc(c, c, 3 + k * 9, 0, 7); g.fill(); g.fillStyle = '#F8D060'; g.fillRect(c - 1, c - 1 - k * 8, 2, 2); }
  });
}
function rtsPicUnitIcon(key, h) {
  if (typeof rtsUnitIcon === 'function' && !RTS_ART_BAD.uicon) { try { const c = rtsUnitIcon(key, h); if (c) return c; } catch (e) { rtsArtFail('uicon', e); } }
  return rtsDefCached('ui' + key + h, 32, 24, g => {
    g.fillStyle = '#3A3028'; g.fillRect(0, 0, 32, 24); g.fillStyle = '#5C4C3C'; g.fillRect(1, 1, 30, 22);
    const p = rtsDefUnit(key, h, 3, 0);
    g.drawImage(p, 16 - p.width / 2 + (p.width > 16 ? 0 : 0), 11 - p.height / 2);
    rtsTiny(g, rtsNameOf(key).split(' ')[0].slice(0, 7), 2, 18, '#F0E0C0');
  });
}
function rtsBuildingIconPic(key, h) {
  if (typeof rtsBuildingIcon === 'function' && !RTS_ART_BAD.bicon) { try { const c = rtsBuildingIcon(key, h); if (c) return c; } catch (e) { rtsArtFail('bicon', e); } }
  return rtsDefCached('bi' + key + h, 32, 24, g => {
    g.fillStyle = '#3A3028'; g.fillRect(0, 0, 32, 24); g.fillStyle = '#6C5C48'; g.fillRect(1, 1, 30, 22);
    const d = RTS_BUILDINGS[key], b = rtsDefBuilding(key, h, { dmg: 0, frame: 0, build: 1 });
    const s = Math.min(28 / b.width, 16 / b.height, 1);
    g.drawImage(b, 16 - b.width * s / 2, 9 - b.height * s / 2, b.width * s, b.height * s);
    rtsTiny(g, (d ? d.name : key).split(' ')[0].slice(0, 7), 2, 18, '#F0E0C0');
  });
}
function rtsIconOf(key, h) { return key === '_upg' ? rtsDefCached('upgicon', 32, 24, g => { g.fillStyle = '#304030'; g.fillRect(0, 0, 32, 24); rtsTinyCenter(g, 'UPGRADE', 16, 10, '#C0F0C0'); }) : RTS_BUILDINGS[key] ? rtsBuildingIconPic(key, h) : rtsPicUnitIcon(key, h); }

// buildings: a block with a roof in the House colour and a detail for each kind
function rtsDefBuilding(key, h, st) {
  const d = RTS_BUILDINGS[key];
  const W = d.w * 16, H = d.h * 16;
  const frame = (st.frame | 0) & 3, dmg = st.dmg | 0, door = st.door | 0;
  const kf = key === 'vapor' || key === 'radar' || key === 'refinery' || key === 'starport' ? frame : 0;
  return rtsDefCached('b' + key + h + kf + dmg + (door ? 1 : 0) + (key === 'turret' || key === 'rturret' ? 'd' + (st.dir8 | 0) + (st.firing ? 1 : 0) : ''), W, H, g => {
    const P = rtsPal(h);
    if (key === 'turret' || key === 'rturret') {
      g.fillStyle = '#5C5850'; g.fillRect(1, 1, 14, 14); g.fillStyle = '#7C786E'; g.fillRect(2, 2, 12, 12);
      g.fillStyle = P[1]; g.fillRect(3, 3, 10, 2);
      g.translate(8, 8); g.rotate((st.dir8 | 0) * Math.PI / 4);
      g.fillStyle = '#2C2C2C';
      if (key === 'turret') g.fillRect(-1, -8, 2, 8); else { g.fillStyle = '#E0E0D8'; g.fillRect(-4, -6, 3, 6); g.fillRect(1, -6, 3, 6); }
      g.fillStyle = '#9A968C'; g.beginPath(); g.arc(0, 0, 4, 0, 7); g.fill();
      if (st.firing) { g.fillStyle = '#F8E060'; g.fillRect(-1, -10, 2, 2); }
      return;
    }
    if (key === 'wall') { g.fillStyle = '#6A665E'; g.fillRect(0, 0, 16, 16); g.fillStyle = '#8E8A80'; g.fillRect(1, 1, 14, 6); g.fillRect(1, 9, 6, 6); g.fillRect(9, 9, 6, 6); return; }
    // walls and roof
    g.fillStyle = '#4A443C'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#8A8478'; g.fillRect(1, 1, W - 2, H - 2);
    g.fillStyle = '#A8A294'; g.fillRect(2, 2, W - 4, H - 8);
    g.fillStyle = P[1]; g.fillRect(2, 2, W - 4, 3); g.fillStyle = P[2]; g.fillRect(2, 5, W - 4, 1);
    g.fillStyle = '#5E584E'; g.fillRect(1, H - 6, W - 2, 5);
    const cx = W / 2;
    switch (key) {
      case 'yard': g.fillStyle = '#E0C048'; g.fillRect(cx - 1, 7, 2, 12); g.fillRect(cx - 8, 7, 16, 2); g.fillStyle = P[0]; g.fillRect(4, 12, 8, 6); break;
      case 'vapor': g.fillStyle = '#6E6A62'; g.beginPath(); g.arc(cx, 15, 9, 0, 7); g.fill(); g.strokeStyle = P[0]; g.lineWidth = 2; g.beginPath(); g.arc(cx, 15, 6, frame * 1.57, frame * 1.57 + 3); g.stroke(); break;
      case 'refinery': g.fillStyle = '#7A746A'; for (let k = 0; k < 3; k++) { g.beginPath(); g.arc(8 + k * 12, 14, 5, 0, 7); g.fill(); } g.fillStyle = frame & 1 ? '#F08020' : '#C86818'; g.fillRect(4, 22, 12, 4); break;
      case 'silo': g.fillStyle = '#B0A890'; g.beginPath(); g.arc(cx, 15, 9, 0, 7); g.fill(); g.fillStyle = '#E88828'; g.beginPath(); g.arc(cx, 15, 4, 0, 7); g.fill(); break;
      case 'radar': g.strokeStyle = '#D0D0C8'; g.lineWidth = 2; g.beginPath(); g.arc(cx, 16, 8, frame * 1.57, frame * 1.57 + 2.2); g.stroke(); g.fillStyle = '#404040'; g.fillRect(cx - 1, 14, 2, 8); break;
      case 'palace': g.fillStyle = '#C8C0A8'; g.beginPath(); g.arc(cx, 26, 15, Math.PI, 0); g.fill(); g.fillStyle = P[1]; g.fillRect(cx - 2, 6, 4, 6); g.fillStyle = '#E8D048'; g.fillRect(cx - 1, 4, 2, 2); break;
      case 'starport': g.fillStyle = '#5A564E'; g.fillRect(6, 9, W - 12, H - 18); g.fillStyle = frame & 1 ? '#F8E060' : '#806020'; for (let k = 0; k < 4; k++) g.fillRect(8 + k * 9, 10 + (k & 1) * 22, 2, 2); break;
      case 'lab': g.fillStyle = '#80C8E8'; g.beginPath(); g.arc(cx, 16, 7, 0, 7); g.fill(); break;
      case 'repair': g.fillStyle = '#5A564E'; g.fillRect(6, 8, W - 12, H - 14); g.fillStyle = '#E0C048'; g.fillRect(cx - 5, 15, 10, 2); g.fillRect(cx - 1, 11, 2, 10); break;
    }
    if (d.fac && key !== 'yard') { g.fillStyle = door ? '#100C08' : '#36302A'; g.fillRect(cx - 5, H - 9, 10, 8); g.fillStyle = '#E0C048'; g.fillRect(cx - 5, H - 10, 10, 1); }
    if (dmg) { g.fillStyle = 'rgba(20,12,8,0.45)'; for (let k = 0; k < dmg * 4; k++) { const r = rtsHash(k, W) ; g.fillRect(r % (W - 4), (r >> 8) % (H - 4), 4, 3); } }
  });
}
function rtsBuildingPic(key, h, st) {
  if (key === 'wall' && typeof rtsWallArt === 'function' && !RTS_ART_BAD.wall) { try { const c = rtsWallArt(h, st.mask | 0); if (c) return c; } catch (e) { rtsArtFail('wall', e); } }
  if (typeof rtsBuildingArt === 'function' && !RTS_ART_BAD.bld) { try { const c = rtsBuildingArt(key, h, st); if (c) return c; } catch (e) { rtsArtFail('bld', e); } }
  return rtsDefBuilding(key, h, st);
}
function rtsPicWorm(phase, f, dir) {
  if (typeof rtsWormArt === 'function' && !RTS_ART_BAD.worm) { try { const c = rtsWormArt(phase, f, dir); if (c) return c; } catch (e) { rtsArtFail('worm', e); } }
  return rtsDefCached('wm' + phase + f, 32, 32, g => {
    if (phase === 'under') {
      g.strokeStyle = 'rgba(150,100,50,0.7)'; g.lineWidth = 1;
      for (let k = 0; k < 3; k++) { g.beginPath(); g.ellipse(16, 16, 4 + k * 3 + (f & 1), 3 + k * 2, 0, 0, 7); g.stroke(); }
      return;
    }
    const open = phase === 'rise' ? Math.min(1, (f + 1) / 4) : phase === 'eat' ? 0.6 : Math.max(0, 1 - f / 4);
    g.fillStyle = '#8C6040'; g.beginPath(); g.arc(16, 18, 7 + open * 6, 0, 7); g.fill();
    g.fillStyle = '#5A3820'; g.beginPath(); g.arc(16, 18, 4 + open * 5, 0, 7); g.fill();
    g.fillStyle = '#1C0C04'; g.beginPath(); g.arc(16, 18, 2 + open * 4, 0, 7); g.fill();
    g.fillStyle = '#E8E0C8'; for (let k = 0; k < 8; k++) { const a = k * 0.785; g.fillRect(16 + Math.cos(a) * (3 + open * 4), 18 + Math.sin(a) * (3 + open * 4), 1, 1); }
  });
}
function rtsHotOfCursor(kind, c) {
  if (typeof RTS_W_CURSOR_HOT !== 'undefined' && RTS_W_CURSOR_HOT[kind] && typeof rtsCursorArt === 'function' && !RTS_ART_BAD.cursor) return RTS_W_CURSOR_HOT[kind];
  return kind === 'normal' ? [0, 0] : [c.width >> 1, c.height >> 1];
}
function rtsPicCursor(kind, frame) {
  if (typeof rtsCursorArt === 'function' && !RTS_ART_BAD.cursor) { try { const c = rtsCursorArt(kind, frame | 0); if (c) return c; } catch (e) { rtsArtFail('cursor', e); } }
  return rtsDefCached('cur' + kind, 16, 16, g => {
    const ln = (col, pts) => { g.fillStyle = col; for (const [x, y, w, h] of pts) g.fillRect(x, y, w, h); };
    if (kind === 'normal') {
      g.fillStyle = '#000'; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, 12); g.lineTo(3, 9); g.lineTo(6, 14); g.lineTo(8, 13); g.lineTo(5, 8); g.lineTo(9, 8); g.closePath(); g.fill();
      g.fillStyle = '#FFF'; g.beginPath(); g.moveTo(1, 2); g.lineTo(1, 10); g.lineTo(3, 8); g.lineTo(6, 12); g.lineTo(6.5, 11.5); g.lineTo(4, 7); g.lineTo(7, 7); g.closePath(); g.fill();
    } else if (kind === 'select') ln('#FFF', [[1, 1, 4, 1], [1, 1, 1, 4], [11, 1, 4, 1], [14, 1, 1, 4], [1, 14, 4, 1], [1, 11, 1, 4], [11, 14, 4, 1], [14, 11, 1, 4]]);
    else if (kind === 'move') { ln('#000', [[6, 1, 4, 14], [1, 6, 14, 4]]); ln('#58F858', [[7, 2, 2, 12], [2, 7, 12, 2]]); }
    else if (kind === 'attack') { g.strokeStyle = '#F83818'; g.beginPath(); g.arc(8, 8, 5, 0, 7); g.stroke(); ln('#F83818', [[7.5, 0, 1, 5], [7.5, 11, 1, 5], [0, 7.5, 5, 1], [11, 7.5, 5, 1]]); }
    else if (kind === 'nomove') { g.strokeStyle = '#F83818'; g.lineWidth = 2; g.beginPath(); g.arc(8, 8, 5, 0, 7); g.moveTo(4, 4); g.lineTo(12, 12); g.stroke(); }
    else if (kind === 'deploy') { ln('#78B8F8', [[2, 2, 12, 2], [2, 12, 12, 2], [2, 2, 2, 12], [12, 2, 2, 12]]); }
    else if (kind === 'harvest') { ln('#000', [[5, 3, 6, 10]]); ln('#F89030', [[6, 4, 4, 8], [3, 6, 10, 4]]); }
    else if (kind === 'repair') { ln('#000', [[5, 1, 6, 14], [1, 5, 14, 6]]); ln('#F8E048', [[6, 2, 4, 12], [2, 6, 12, 4]]); }
    else if (kind === 'capture') { ln('#000', [[3, 1, 3, 14]]); ln('#58F858', [[4, 2, 1, 12], [5, 2, 8, 5]]); }
    else if (kind === 'place') ln('#FFF', [[7, 3, 2, 10], [3, 7, 10, 2]]);
  });
}

// ------------------------------------------------------------------ the map view
Object.assign(RtsGame.prototype, {
  // tile families for the art's edge masks
  tileMask(x, y) {
    if (typeof rtsWTileMask === 'function' && !RTS_ART_BAD.wmask) { try { return rtsWTileMask(this.map.t, this.W, this.H, x, y); } catch (e) { rtsArtFail('wmask', e); } }
    const t = this.map.t, W = this.W, f = RTS_FAMILY[t[y * W + x]];
    let m = 0;
    const same = (xx, yy) => !this.inMap(xx, yy) || RTS_FAMILY[t[yy * W + xx]] === f;
    if (same(x, y - 1)) m |= 1;
    if (same(x + 1, y)) m |= 2;
    if (same(x, y + 1)) m |= 4;
    if (same(x - 1, y)) m |= 8;
    return m;
  },
  chunkInit() {
    const cw = this.chW = Math.ceil(this.W / 16), ch = this.chH = Math.ceil(this.H / 16);
    this.chunks = [];
    for (let i = 0; i < cw * ch; i++) this.chunks.push({ t: makeCanvas(256, 256), s: makeCanvas(256, 256), sEmpty: false });
    this.mm = makeCanvas(this.W, this.H);
    this.mmCtx = this.mm.getContext('2d');
    this.mmImg = this.mmCtx.createImageData(this.W, this.H);
    this.allDirty = true;
  },
  drawTileAt(i) {
    const W = this.W, x = i % W, y = (i / W) | 0;
    const ck = this.chunks[((y >> 4) * this.chW) + (x >> 4)];
    const g = ck.t.getContext('2d');
    const k = this.map.t[i];
    const pic = rtsTile(k, this.tileMask(x, y), rtsHash(x, y) & 3);
    g.drawImage(pic, (x & 15) * 16, (y & 15) * 16, 16, 16);
    // rubble: its piece of the ruin of the building that stood there
    if (k === RTS_T.RUBBLE && this.ruins && typeof rtsRubbleArt === 'function' && !RTS_ART_BAD.rubble) {
      for (let n = this.ruins.length - 1; n >= 0; n--) {
        const r = this.ruins[n];
        if (x < r.x || y < r.y || x >= r.x + r.w || y >= r.y + r.h) continue;
        try { g.drawImage(rtsRubbleArt(r.w, r.h, r.seed), (x - r.x) * 16, (y - r.y) * 16, 16, 16, (x & 15) * 16, (y & 15) * 16, 16, 16); } catch (e) { rtsArtFail('rubble', e); }
        break;
      }
    }
    this.mmPixel(i);
  },
  drawShroudAt(i) {
    const W = this.W, x = i % W, y = (i / W) | 0;
    const ck = this.chunks[((y >> 4) * this.chW) + (x >> 4)];
    const g = ck.s.getContext('2d'), px = (x & 15) * 16, py = (y & 15) * 16;
    g.clearRect(px, py, 16, 16);
    const exp = this.P.exp;
    if (!exp[i]) {
      let m = 0;
      if (y > 0 && exp[i - W]) m |= 1;
      if (x < W - 1 && exp[i + 1]) m |= 2;
      if (y < this.H - 1 && exp[i + W]) m |= 4;
      if (x > 0 && exp[i - 1]) m |= 8;
      rtsShroudTile(g, px, py, m);
    }
    this.mmPixel(i);
  },
  mmPixel(i) {
    const d = this.mmImg.data, k = this.map.t[i], o = i * 4;
    if (!this.P.exp[i]) { d[o] = d[o + 1] = d[o + 2] = 0; d[o + 3] = 255; this.mmDirty = true; return; }
    const c = RTS_MM_COL[k] || RTS_MM_COL[0];
    d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = 255;
    this.mmDirty = true;
  },
  flushDirty() {
    if (!this.chunks) this.chunkInit();
    if (this.allDirty) {
      this.allDirty = false;
      for (let i = 0; i < this.N; i++) { this.drawTileAt(i); this.drawShroudAt(i); }
      this.dirtyT.clear(); this.dirtyS.clear();
    } else {
      if (this.dirtyT.size) { for (const i of this.dirtyT) this.drawTileAt(i); this.dirtyT.clear(); }
      if (this.dirtyS.size) { for (const i of this.dirtyS) this.drawShroudAt(i); this.dirtyS.clear(); }
    }
    if (this.mmDirty) { this.mmCtx.putImageData(this.mmImg, 0, 0); this.mmDirty = false; }
  },
  // is a unit of another House hidden from the player (shroud, fog, stealth)?
  hiddenFromPlayer(u) {
    if (u.h === this.player || this.team(u.h) === this.P.team) return false;
    if (!this.playerSees(u.tx, u.ty)) return true;
    if (u.d.stealth && u.still > 60) {
      let near = false;
      this.unitsNear(u.x, u.y, 24, v => { if (v.h === this.player) near = true; });
      return !near;
    }
    return false;
  },
  bldVisible(b) {
    const exp = this.P.exp;
    for (let y = b.y; y < b.y + b.hh; y++) for (let x = b.x; x < b.x + b.w; x++) if (exp[y * this.W + x]) return true;
    return false;
  },
  wallMask(b) {
    let m = 0;
    const w = (x, y) => { if (!this.inMap(x, y)) return false; const o = this.bAt[y * this.W + x]; return !!(o && o.d.wall); };
    if (w(b.x, b.y - 1)) m |= 1;
    if (w(b.x + 1, b.y)) m |= 2;
    if (w(b.x, b.y + 1)) m |= 4;
    if (w(b.x - 1, b.y)) m |= 8;
    return m;
  },
  unitFrame(u) {
    if (u.d.cls === 'inf') {
      if (u.firing > 4) return 5;
      if (u.mv) return (u.anim >> 3) & 3;
      if (u.tgt || u.order.k === 'attack') return 4;
      return 0;
    }
    if (u.d.harvester && u.hs === 'dig' && !u.mv) return 4 + ((u.anim >> 3) & 3);
    if (u.d.lifter) return (u.job && u.job.phase === 'carry' ? 4 : 0) + ((u.anim >> 2) & 3);
    if (u.d.cls === 'air') return (u.anim >> 2) & 3;
    return u.mv ? (u.anim >> 2) & 3 : 0;
  },
  // the map view, inside the rectangle L.mx, L.my, L.mw, L.mh
  renderMap(ctx) {
    const L = this.L, cam = this.cam;
    this.flushDirty();
    let sx = 0, sy = 0;
    if (this.shake > 0) { sx = ((this.frame * 7) % 5) - 2; sy = ((this.frame * 3) % 5) - 2; }
    const cx = Math.round(cam.x) + sx, cy = Math.round(cam.y) + sy;
    ctx.save();
    ctx.beginPath(); ctx.rect(L.mx, L.my, L.mw, L.mh); ctx.clip();
    ctx.fillStyle = '#000'; ctx.fillRect(L.mx, L.my, L.mw, L.mh);
    ctx.translate(L.mx - cx, L.my - cy);
    const x0 = cx, y0 = cy, x1 = cx + L.mw, y1 = cy + L.mh;
    const inView = (x, y, m) => x > x0 - m && x < x1 + m && y > y0 - m && y < y1 + m;
    // terrain chunks
    for (let ky = Math.max(0, (y0 / 256) | 0); ky <= Math.min(this.chH - 1, (y1 / 256) | 0); ky++)
      for (let kx = Math.max(0, (x0 / 256) | 0); kx <= Math.min(this.chW - 1, (x1 / 256) | 0); kx++) ctx.drawImage(this.chunks[ky * this.chW + kx].t, kx * 256, ky * 256);
    // animated blooms
    if (typeof rtsBloomArt === 'function' && !RTS_ART_BAD.bloom) {
      for (const [bx, by] of this.map.blooms) {
        if (!inView(bx * 16, by * 16, 16) || !this.P.exp[by * this.W + bx]) continue;
        try { const c = rtsBloomArt((this.frame >> 3) & 7); if (c) ctx.drawImage(c, bx * 16 + 8 - c.width / 2, by * 16 + 8 - c.height / 2); } catch (e) { rtsArtFail('bloom', e); }
      }
    }
    // the rally line of the selected factory
    const sb = this.ui.selB;
    if (sb && !sb.dead && sb.rally && sb.h === this.player) {
      ctx.strokeStyle = 'rgba(248,248,200,0.6)'; ctx.setLineDash([2, 2]); ctx.beginPath();
      ctx.moveTo(sb.cx, sb.cy); ctx.lineTo(sb.rally.x * 16 + 8, sb.rally.y * 16 + 8); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = '#F8F8C8'; ctx.fillRect(sb.rally.x * 16 + 6, sb.rally.y * 16 + 6, 4, 4);
    }
    // buildings
    const blds = this.buildings.filter(b => inView(b.x * 16, b.y * 16, b.w * 16 + 16) && this.bldVisible(b)).sort((a, b) => a.y + a.hh - b.y - b.hh);
    for (const b of blds) this.drawBuilding(ctx, b);
    // wrecks and the fallen
    for (const w of this.wrecks) {
      if (!inView(w.x, w.y, 16) || !this.playerSees((w.x / 16) | 0, (w.y / 16) | 0)) continue;
      const c = rtsPicWreck(w.key, w.t >> 3, w.dir);
      if (w.t > w.life - 60) ctx.globalAlpha = Math.max(0, (w.life - w.t) / 60);
      ctx.drawImage(c, Math.round(w.x - c.width / 2), Math.round(w.y - c.height / 2));
      ctx.globalAlpha = 1;
    }
    for (const c0 of this.corpses) {
      if (!inView(c0.x, c0.y, 16) || !this.playerSees((c0.x / 16) | 0, (c0.y / 16) | 0)) continue;
      const c = rtsDeathPic(c0.key, c0.h, c0.crushed ? 5 : Math.min(5, c0.t >> 3));
      if (c0.t > 240) ctx.globalAlpha = Math.max(0, (300 - c0.t) / 60);
      ctx.drawImage(c, Math.round(c0.x - c.width / 2), Math.round(c0.y - c.height / 2));
      ctx.globalAlpha = 1;
    }
    // sandwyrms under the sand (ripples), risen ones over everything on the ground
    const risen = [];
    for (const w of this.worms) {
      if (w.phase === 'away' || !inView(w.x, w.y, 32)) continue;
      const tx = (w.x / 16) | 0, ty = (w.y / 16) | 0;
      if (!this.playerSees(tx, ty)) continue;
      if (w.phase === 'roam' || w.phase === 'hunt') { const c = rtsPicWorm('under', (w.f >> 3) & 3, w.dir); ctx.drawImage(c, Math.round(w.x - c.width / 2), Math.round(w.y - c.height / 2)); }
      else risen.push(w);
    }
    // ground units, by depth
    const ground = [], air = [];
    for (const u of this.units) {
      if (u.dead || u.carried || !inView(u.x, u.y, 24)) continue;
      if (this.hiddenFromPlayer(u)) continue;
      (u.d.cls === 'air' ? air : ground).push(u);
    }
    ground.sort((a, b) => a.y - b.y);
    for (const u of ground) this.drawUnit(ctx, u);
    for (const w of risen) {
      const ph = w.phase === 'rise' ? (w.t < 16 ? 'rise' : 'eat') : 'dive';
      const f = ph === 'rise' ? Math.min(5, (w.t * 6 / 16) | 0) : ph === 'eat' ? ((w.t - 16) >> 3) & 3 : Math.min(5, w.t / 5 | 0);
      const c = rtsPicWorm(ph, f, w.dir);
      ctx.drawImage(c, Math.round(w.ex - c.width / 2), Math.round(w.ey - c.height / 2));
    }
    // shots and effects
    for (const s of this.shots) {
      if (!inView(s.x, s.y, 140)) continue;
      let y = s.y;
      if (s.k === 'doomfist') {
        // its shadow on the ground, closing in as it comes down
        const p = 1 - s.n / s.n0, hgt = Math.sin(p * Math.PI);
        y -= hgt * s.arc;
        ctx.fillStyle = 'rgba(0,0,0,' + (0.18 + 0.2 * (1 - hgt)).toFixed(2) + ')';
        ctx.beginPath(); ctx.ellipse(s.x + hgt * 10, s.y + hgt * 6, 3 + 3 * (1 - hgt), 2 + 1.5 * (1 - hgt), 0, 0, 7); ctx.fill();
      }
      const tx = (s.x / 16) | 0, ty = (y / 16) | 0;
      if (this.inMap(tx, ty) && !this.playerSees(tx, ty) && s.k !== 'doomfist') continue;
      let dir = s.dir;
      if (s.k === 'doomfist') { const p = 1 - s.n / s.n0; dir = rtsDir8(s.vx, s.vy - Math.cos(p * Math.PI) * s.arc * Math.PI / s.n0); }
      const c = rtsShotPic(s.k, dir, s.f >> 2);
      ctx.drawImage(c, Math.round(s.x - c.width / 2), Math.round(y - c.height / 2));
    }
    for (const e of this.fx) {
      if (e.f < 0 || !inView(e.x, e.y, 30)) continue;
      const n = this.fxFrames(e.k), sp = e.k === 'smoke' ? 6 : e.k === 'fire' ? 5 : 3;
      const c = rtsFxPic(e.k, Math.min(n - 1, (e.f / sp) | 0));
      const rise = e.k === 'smoke' ? e.f * 0.15 : 0;
      ctx.drawImage(c, Math.round(e.x - c.width / 2), Math.round(e.y - rise - c.height / 2));
    }
    // aircraft, with their shadows
    for (const u of air) {
      const h = (u.alt || 1) * 10;
      ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(u.x + h * 0.4, u.y + h * 0.3, u.key === 'frigate' ? 14 : 6, u.key === 'frigate' ? 8 : 3, 0, 0, 7); ctx.fill();
      if (u.job && u.job.phase === 'carry' && u.job.unit) {
        const v = u.job.unit, c = rtsPicUnit(v.key, v.h, u.dir, 0);
        ctx.drawImage(c, Math.round(u.x - c.width / 2), Math.round(u.y - h + 6 - c.height / 2));
      }
      const c = rtsPicUnit(u.key, u.h, u.dir, this.unitFrame(u));
      ctx.drawImage(c, Math.round(u.x - c.width / 2), Math.round(u.y - h - c.height / 2));
    }
    // fog: what was seen but isn't now goes dim (a pixel a tile, drawn smoothed: soft edges)
    if (this.fog) {
      const P = this.P, key = this.frame - this.frame % 10;
      if (!this.fogC) { this.fogC = makeCanvas(this.W, this.H); this.fogImg = this.fogC.getContext('2d').createImageData(this.W, this.H); this.fogKey = -1; }
      if (this.fogKey !== key) {
        this.fogKey = key;
        const d = this.fogImg.data;
        for (let i = 0; i < this.N; i++) d[i * 4 + 3] = P.exp[i] && !P.see[i] ? 97 : 0;
        this.fogC.getContext('2d').putImageData(this.fogImg, 0, 0);
      }
      const sm = ctx.imageSmoothingEnabled;
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(this.fogC, 0, 0, this.W * 16, this.H * 16);
      ctx.imageSmoothingEnabled = sm;
    }
    // the shroud
    for (let ky = Math.max(0, (y0 / 256) | 0); ky <= Math.min(this.chH - 1, (y1 / 256) | 0); ky++)
      for (let kx = Math.max(0, (x0 / 256) | 0); kx <= Math.min(this.chW - 1, (x1 / 256) | 0); kx++) ctx.drawImage(this.chunks[ky * this.chW + kx].s, kx * 256, ky * 256);
    // marks: selection, health, the order marker
    this.drawMarks(ctx, ground.concat(air), blds);
    this.drawGhost(ctx);
    ctx.restore();
  },
  drawBuilding(ctx, b) {
    const dmg = b.hp < b.max * 0.25 ? 2 : b.hp < b.max * 0.5 ? 1 : 0;
    let st;
    if (b.d.wpn) st = { dir8: b.tdir, firing: b.firing > 4, dmg, build: b.rise, flash: b.flash > 3 };
    else {
      const Hs = this.houses[b.h], q = b.d.fac && Hs && Hs.prod[b.d.fac];
      const active = !!b.working || !!(q && q.queue.length && !q.ready && this.factoryOf(Hs, b.d.fac) === b);
      st = { dmg, frame: b.anim >> 3, door: b.door ? Math.min(3, (40 - b.doorT) >> 2, b.doorT >> 2) : 0, build: b.rise, flash: b.flash > 3, working: active, active,
        fill: b.key === 'silo' || b.key === 'refinery' ? Math.max(0, Math.min(1, Hs ? Hs.credits / Math.max(1, Hs.storage) : 0)) : 0, mask: b.d.wall ? this.wallMask(b) : 0 };
    }
    const c = rtsBuildingPic(b.key, b.h, st);
    const px = b.x * 16, py = b.y * 16, W = b.w * 16, H = b.hh * 16;
    if (b.rise < 1 && !(typeof rtsBuildingArt === 'function' && !RTS_ART_BAD.bld)) {
      // rising out of the scaffolding (the stand-in draws it in from the bottom)
      const h = Math.max(1, Math.round(H * b.rise));
      ctx.drawImage(c, 0, H - h, W, h, px, py + H - h, W, h);
      ctx.strokeStyle = '#C8A048'; ctx.strokeRect(px + 0.5, py + 0.5, W - 1, H - 1);
    } else ctx.drawImage(c, px + (W - c.width) / 2, py + (H - c.height) / 2);
    // a hit: the art flashes white itself; the stand-in gets a pale wash
    if (b.flash > 3 && (typeof rtsBuildingArt !== 'function' || RTS_ART_BAD.bld)) { ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(px, py, W, H); }
    // burning when badly hurt
    if (dmg && !b.d.wall) {
      const n = dmg === 2 ? 2 : 1;
      for (let k = 0; k < n; k++) {
        const r = rtsHash(b.id, k), fx = px + 4 + (r % Math.max(1, W - 8)), fy = py + 4 + ((r >> 8) % Math.max(1, H - 8));
        const nf = this.fxFrames('fire');
        const c2 = rtsFxPic('fire', ((this.frame >> 3) + k) % nf);
        ctx.drawImage(c2, Math.round(fx - c2.width / 2), Math.round(fy - c2.height / 2));
      }
    }
    if (b.repairing && b.h === this.player && (this.frame >> 4) & 1) {
      ctx.fillStyle = '#000'; ctx.fillRect(px + W / 2 - 5, py + H / 2 - 4, 11, 9);
      rtsTiny(ctx, 'R', px + W / 2 - 1, py + H / 2 - 2, '#F8E048');
    }
  },
  // where a unit is drawn: where it is, or (docked) on its building's bay, sliding there and back
  unitXY(u) {
    const b = u.dockB;
    if (!(u.dockK > 0) || !b || b.dead || !RTS_DOCK_AT[b.key]) return { x: u.x, y: u.y };
    const a = RTS_DOCK_AT[b.key], k = u.dockK * u.dockK * (3 - 2 * u.dockK), px = b.x * 16 + a[0], py = b.y * 16 + a[1];
    return { x: u.x + (px - u.x) * k, y: u.y + (py - u.y) * k, dir: k > 0.6 ? a[2] : u.dir };
  },
  drawUnit(ctx, u) {
    const fr = this.unitFrame(u);
    const at = this.unitXY(u), x = Math.round(at.x), y = Math.round(at.y);
    const c = rtsPicUnit(u.key, u.h, at.dir === undefined ? u.dir : at.dir, fr);
    if (u.d.stealth && u.still > 60) ctx.globalAlpha = u.h === this.player || this.team(u.h) === this.P.team ? 0.55 : 0.35;
    ctx.drawImage(c, x - c.width / 2, y - c.height / 2);
    const t = u.d.turret ? rtsTurretPic(u.key, u.h, u.tdir, u.firing > 4) : null;
    if (t) ctx.drawImage(t, x - t.width / 2, y - t.height / 2);
    ctx.globalAlpha = 1;
    if (u.flash > 1 && u.d.cls !== 'inf') { const wc = rtsWhiteOf(c); ctx.globalAlpha = 0.55; ctx.drawImage(wc, x - wc.width / 2, y - wc.height / 2); if (t) ctx.drawImage(rtsWhiteOf(t), x - t.width / 2, y - t.height / 2); ctx.globalAlpha = 1; }
    if (u.conv && (this.frame >> 3) & 1) { ctx.fillStyle = 'rgba(120,224,88,0.5)'; ctx.fillRect(x - 2, y - 9, 4, 2); }
    if (u.order.k === 'boom') { ctx.fillStyle = (this.frame >> 2) & 1 ? '#F83818' : '#F8E048'; ctx.fillRect(x - 1, y - 12, 3, 3); }
  },
  drawMarks(ctx, units, blds) {
    const ui = this.ui, sel = new Set(ui.sel);
    const bar = (x, y, w, k) => {
      ctx.fillStyle = '#000'; ctx.fillRect(x - 1, y - 1, w + 2, 3);
      ctx.fillStyle = k > 0.5 ? '#38D838' : k > 0.25 ? '#F8D038' : '#F83818';
      ctx.fillRect(x, y, Math.max(1, Math.round(w * k)), 1);
    };
    for (const u of units) {
      const isSel = sel.has(u), hov = ui.hover === u;
      // your harvesters always show their load (it's what's paid when they get home)
      const load = u.d.harvester && u.h === this.player && u.cargo > 0;
      if (!isSel && !hov && !load) continue;
      const r = u.d.cls === 'inf' ? 4 : u.key === 'frigate' ? 16 : rtsUnitSize(u.key) / 2 - 1;
      const at = this.unitXY(u), x = Math.round(at.x), y = Math.round(at.y - (u.d.cls === 'air' ? (u.alt || 1) * 10 : 0));
      if (isSel) {
        ctx.fillStyle = '#FFF';
        const k = 2;
        ctx.fillRect(x - r, y - r, k, 1); ctx.fillRect(x - r, y - r, 1, k); ctx.fillRect(x + r - k + 1, y - r, k, 1); ctx.fillRect(x + r, y - r, 1, k);
        ctx.fillRect(x - r, y + r, k, 1); ctx.fillRect(x - r, y + r - k + 1, 1, k); ctx.fillRect(x + r - k + 1, y + r, k, 1); ctx.fillRect(x + r, y + r - k + 1, 1, k);
      }
      if (isSel || hov) bar(x - r, y - r - 3, r * 2, u.hp / u.max);
      if ((isSel || load) && u.d.harvester) { ctx.fillStyle = '#000'; ctx.fillRect(x - r - 1, y + r + 2, r * 2 + 2, 3); ctx.fillStyle = '#F89030'; ctx.fillRect(x - r, y + r + 3, Math.round(r * 2 * u.cargo / (u.d.cap || 700)), 1); }
    }
    for (const b of blds) {
      if (b !== ui.selB && ui.hover !== b) continue;
      const px = b.x * 16, py = b.y * 16, W = b.w * 16, H = b.hh * 16;
      if (b === ui.selB) { ctx.strokeStyle = '#FFF'; ctx.setLineDash([3, 3]); ctx.strokeRect(px + 0.5, py + 0.5, W - 1, H - 1); ctx.setLineDash([]); }
      bar(px + 2, py - 3, W - 4, b.hp / b.max);
    }
    // online guests' selections: their colour's corners
    for (const co of this.coList ? this.coList() : []) {
      ctx.fillStyle = RTS_CO_COL[co.who % 4];
      for (const u of co.sel) {
        if (u.dead || u.carried || !units.includes(u)) continue;
        const r = u.d.cls === 'inf' ? 5 : rtsUnitSize(u.key) / 2;
        const at = this.unitXY(u), x = Math.round(at.x), y = Math.round(at.y - (u.d.cls === 'air' ? (u.alt || 1) * 10 : 0));
        ctx.fillRect(x - r, y + r, 3, 1); ctx.fillRect(x + r - 2, y + r, 3, 1); ctx.fillRect(x - r, y - r, 1, 2); ctx.fillRect(x + r, y - r, 1, 2);
      }
      const b = co.selB;
      if (b && !b.dead) { ctx.strokeStyle = RTS_CO_COL[co.who % 4]; ctx.strokeRect(b.x * 16 + 1.5, b.y * 16 + 1.5, b.w * 16 - 3, b.hh * 16 - 3); }
      if (co.drag && co.drag.active) { ctx.strokeStyle = RTS_CO_COL[co.who % 4]; const w0 = co.drag, w1 = this.toWorld(co.mx, co.my); ctx.strokeRect(Math.min(w0.wx0, w1.x) + 0.5, Math.min(w0.wy0, w1.y) + 0.5, Math.abs(w1.x - w0.wx0), Math.abs(w1.y - w0.wy0)); }
    }
    // where the last order went
    for (const m of [ui.mark].concat(this.coList ? this.coList().map(c => c.mark) : [])) {
      if (!m || this.frame - m.t >= 24) continue;
      const k = (this.frame - m.t) / 24, r = 2 + k * 6;
      ctx.strokeStyle = m.attack ? '#F83818' : '#58F858';
      ctx.strokeRect(m.x - r + 0.5, m.y - r + 0.5, r * 2, r * 2);
    }
  },
  drawGhost(ctx) {
    this.drawGhostOf(ctx, this.ui);
    for (const co of this.coList ? this.coList() : []) { const host = this.ui; this.ui = co; try { this.drawGhostOf(ctx, co); } finally { this.ui = host; } }
  },
  drawGhostOf(ctx, ui) {
    if (ui.mode !== 'place' || !ui.placeKey || !ui.overMap) return;
    const d = RTS_BUILDINGS[ui.placeKey], p = this.ghostPos();
    if (!p) return;
    const ok = this.canPlace(this.player, ui.placeKey, p.x, p.y);
    ctx.globalAlpha = 0.6;
    if (!d.slab) { const c = rtsBuildingPic(ui.placeKey, this.player, { dmg: 0, frame: 0, build: 1, dir8: 4 }); ctx.drawImage(c, p.x * 16, p.y * 16); }
    ctx.globalAlpha = 1;
    for (let y = 0; y < d.h; y++) for (let x = 0; x < d.w; x++) {
      const tx = p.x + x, ty = p.y + y;
      const good = ok || (this.inMap(tx, ty) && RTS_BUILDABLE[this.map.t[ty * this.W + tx]] && !this.bAt[ty * this.W + tx]);
      ctx.fillStyle = ok ? 'rgba(56,216,56,0.35)' : good ? 'rgba(248,200,56,0.3)' : 'rgba(248,56,24,0.45)';
      ctx.fillRect(tx * 16, ty * 16, 16, 16);
    }
    ctx.strokeStyle = ok ? '#58F858' : '#F83818';
    ctx.strokeRect(p.x * 16 + 0.5, p.y * 16 + 0.5, d.w * 16 - 1, d.h * 16 - 1);
  },
});
const RTS_MM_COL = [[212, 154, 80], [190, 134, 70], [128, 104, 80], [72, 54, 42], [232, 120, 24], [248, 152, 48], [248, 200, 96], [160, 158, 150], [180, 132, 72], [112, 92, 76], [112, 98, 86]];
