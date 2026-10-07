'use strict';
// =====================================================================
//  Online play: WebRTC peer-to-peer, connection codes swapped by copy-paste.
//  The host runs the game. Guests send their buttons and draw what the host sends
//  (about 30 times a second) with the same rendering code, so it looks identical.
// =====================================================================

const NET_ICE = [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }];
const NET_PREFIX = 'TANB4';
// host settings that change how the guests' screens look
const NET_CFG_KEYS = ['p1Color', 'p2Color', 'p3Color', 'p4Color', 'lives', 'bossRounds', 'bossEvery', 'shopPrices', 'mineCount', 'xp', 'perks', 'reviveCost', 'skill'];
// sounds are forwarded to guests only from these screens
const NET_SOUND_STATES = new Set(['play', 'curtain', 'score', 'shop', 'bigover']);

const Net = {
  role: null,         // null | 'host' | 'client'
  // host
  slots: ['local'],   // lobby: 'local' (this keyboard) or 'online' per player
  peers: {},          // slot -> { pc, ch, status, invite }
  sndQueue: [],
  frameN: 0,
  stageId: 0,
  lastStage: null,
  inGame: false,
  // client
  pc: null,
  ch: null,
  slot: -1,
  counters: { fp: 0, ap: 0, cu: 0, cd: 0, cl: 0, cr: 0, ok: 0, bk: 0, stt: 0 },
  lastSent: '',
  keep: 0,
  cfgBackup: null,
  panelOpen: false,

  // the claude.ai playable link blocks peer-to-peer connections
  supported() { return typeof RTCPeerConnection !== 'undefined' && !/claude/i.test(location.hostname); },

  // ------------------------------------------------------------ codes
  async encode(obj) {
    let bytes = new TextEncoder().encode(JSON.stringify(obj)), z = 0;
    if (window.CompressionStream) {
      try {
        const s = new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate-raw'));
        bytes = new Uint8Array(await new Response(s).arrayBuffer());
        z = 1;
      } catch (e) { /* send uncompressed */ }
    }
    let bin = '';
    for (const b of bytes) bin += String.fromCharCode(b);
    return NET_PREFIX + '-' + z + ':' + btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  },

  async decode(code) {
    const m = String(code).replace(/\s+/g, '').match(/^TANB4-([01]):([A-Za-z0-9_-]+)$/);
    if (!m) throw new Error("That doesn't look like a TANЬ4IKI code. Copy the whole code, starting with TANB4.");
    let b64 = m[2].replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    let bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    if (m[1] === '1') {
      const s = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
      bytes = new Uint8Array(await new Response(s).arrayBuffer());
    }
    return JSON.parse(new TextDecoder().decode(bytes));
  },

  // wait until the browser has found its network addresses (or give up after a few seconds)
  waitIce(pc) {
    return new Promise(resolve => {
      if (pc.iceGatheringState === 'complete') return resolve();
      const done = () => { if (pc.iceGatheringState === 'complete') { pc.removeEventListener('icegatheringstatechange', done); resolve(); } };
      pc.addEventListener('icegatheringstatechange', done);
      setTimeout(resolve, 3500);
    });
  },

  versionError(v) {
    return new Error('Different game versions: the host has v' + v + ', this game is v' + APP_VERSION + '. Use the same file on both computers.');
  },

  // ------------------------------------------------------------ host
  startHosting() {
    this.role = 'host';
    if (!this.slots.length) this.slots = ['local'];
  },

  async createInvite(slot) {
    const old = this.peers[slot];
    if (old) { try { old.pc.close(); } catch (e) { /* already closed */ } }
    const pc = new RTCPeerConnection({ iceServers: NET_ICE });
    const ch = pc.createDataChannel('game', { ordered: true });
    const peer = { pc, ch, status: 'invite', invite: '' };
    this.peers[slot] = peer;
    this.wireHost(slot, peer);
    await pc.setLocalDescription(await pc.createOffer());
    await this.waitIce(pc);
    peer.invite = await this.encode({ v: APP_VERSION, slot, sdp: pc.localDescription.sdp });
    return peer.invite;
  },

  async acceptReply(slot, code) {
    const peer = this.peers[slot];
    if (!peer) throw new Error('Create an invite code for this player first.');
    const d = await this.decode(code);
    if (d.v !== APP_VERSION) throw this.versionError(d.v);
    if (d.kind !== 'reply') throw new Error('That is an invite code. Paste the reply code your friend sends back.');
    await peer.pc.setRemoteDescription({ type: 'answer', sdp: d.sdp });
    peer.status = 'connecting';
  },

  wireHost(slot, peer) {
    const { pc, ch } = peer;
    ch.onopen = () => {
      peer.status = 'connected';
      peer.needFull = true;
      const cfg = {};
      for (const k of NET_CFG_KEYS) cfg[k] = Config.get(k);
      ch.send(JSON.stringify({ t: 'welcome', slot, v: APP_VERSION, cfg }));
      if (this.inGame) Input.remote[slot] = Input.remote[slot] || Net.idleInput();
      Game.toast(ROMAN[slot] + '-PLAYER CONNECTED');
      this.refreshPanel();
    };
    ch.onmessage = e => {
      let msg;
      try { msg = JSON.parse(e.data); } catch (err) { return; }
      if (msg.t === 'in' && this.inGame && Input.remote[slot]) Object.assign(Input.remote[slot], msg);
    };
    const lost = () => {
      if (peer.status === 'lost' || this.peers[slot] !== peer) return;
      peer.status = 'lost';
      if (Input.remote[slot]) Object.assign(Input.remote[slot], Net.idleInput());
      Game.toast(ROMAN[slot] + '-PLAYER DISCONNECTED');
      this.refreshPanel();
    };
    ch.onclose = lost;
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed') {
        if (peer.status === 'connecting') peer.error = "Couldn't connect. One of the networks blocks direct connections (see README).";
        lost();
      }
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'closed') lost();
    };
  },

  idleInput() { return { d: -1, f: 0, a: 0 }; },

  // the lobby's slots become the game's players
  applySlots() {
    Input.remote = {};
    this.slots.forEach((s, i) => { if (s === 'online') Input.remote[i] = Net.idleInput(); });
    this.inGame = true;
    this.lastStage = null;
  },

  hangUp() {
    for (const k in this.peers) { try { this.peers[k].pc.close(); } catch (e) { /* closed */ } }
    this.peers = {};
    this.slots = ['local'];
    this.role = null;
    this.inGame = false;
    Input.remote = {};
  },

  openPeers() {
    return Object.values(this.peers).filter(p => p.status === 'connected' && p.ch.readyState === 'open');
  },

  // called once per game frame on the host
  hostTick() {
    if (this.role !== 'host') return;
    const st = Game.stage;
    if (st !== this.lastStage) {
      this.lastStage = st;
      if (st) st.netId = ++this.stageId;
      for (const p of Object.values(this.peers)) p.needFull = true;
    }
    if (++this.frameN % 2) return;
    const open = this.openPeers();
    if (!open.length) { if (st) st.netDiff = []; this.sndQueue = []; return; }
    const full = open.some(p => p.needFull);
    const msg = JSON.stringify(this.buildView(full));
    for (const p of open) {
      if (p.ch.bufferedAmount > 1e6) continue; // a slow guest skips frames instead of lagging behind
      try { p.ch.send(msg); p.needFull = false; } catch (e) { /* closing */ }
    }
  },

  buildView(full) {
    const G = Game, v = { t: 'v', s: G.state, gt: G.t, c: COLS, r: ROWS, vc: VIEW_W / 16, vr: VIEW_H / 16, stn: G.stageNum, hi: G.hi, eng: Sound.engineState };
    if (!this.inGame || !['play', 'curtain', 'score', 'shop', 'bigover', 'vsResult', 'modeResult'].includes(G.state)) v.s = 'wait';
    v.as = AutoSkill.rating;
    v.mode = G.mode; v.ta = G.taFrames; v.tac = G.taCleared; v.vw = G.vsWins;
    if (v.s === 'vsResult') v.vsr = G.vsRes;
    if (v.s === 'modeResult') v.mr = G.modeRes;
    v.pl = G.players.map(p => ({
      i: p.i, score: p.score, lives: p.lives, level: p.level, mines: p.mines, kills: p.kills, out: p.out,
      ship: p.ship, cutter: p.cutter, kit: p.kit, shopShovel: p.shopShovel, xp: p.xp, rank: p.rank, stageXp: p.stageXp,
      vsKills: p.vsKills, caps: p.caps, spent: p.spent,
    }));
    v.base = G.base;
    v.snd = this.sndQueue.splice(0);
    if (G.toastT > 0) v.toast = [G.toastText, G.toastT];
    const st = G.stage;
    const needStage = v.s === 'play' || (v.s === 'curtain' && G.curtain && G.curtain.phase === 'close');
    if (st && needStage) v.st = this.stageView(st, full);
    else if (st) st.netDiff = [];
    if (v.s === 'play') v.pa = { paused: G.paused, pauseIdx: G.pauseIdx, pauseMsg: G.pauseMsg, pauseMsgT: G.pauseMsgT, openH: G.openH };
    if (v.s === 'curtain') v.cu = G.curtain;
    if (v.s === 'score') v.sc = G.sc;
    if (v.s === 'shop') {
      const sh = G.shop;
      v.sh = { order: sh.order.map(p => p.i), turn: sh.turn, idx: sh.idx, scroll: sh.scroll, msg: sh.msg, msgT: sh.msgT };
      v.disc = !!G.shopDiscount;
    }
    return v;
  },

  stageView(st, full) {
    const r = n => Math.round(n * 10) / 10;
    const fxKind = f => (f.frames.length === 3 ? 's' : f.frames.length === 2 ? 'b' : 'B');
    const sv = {
      id: st.netId, num: st.num, fr: st.frame, ov: st.over, ot: st.overTimer, ba: st.baseAlive, q: st.queue.length,
      df: st.netDiff || [],
      tk: st.tanks.filter(t => t.alive).map(t => [t.x, t.y, t.dir, t.isPlayer ? 1 : 0, t.player ? t.player.i : -1, t.type, t.hp,
        t.bonus ? 1 : 0, t.shield > 0 ? 1 : 0, t.frozen > 0 ? 1 : 0, t.ship ? 1 : 0, t.anim, t.boost.ghost ? 1 : 0, t.plates, t.glow, t.reveal, t.ai, t.vet, t.segs ? t.segs.map(p => p[0] + ',' + p[1]).join(';') : 0,
        t.ally ? 1 : 0, t.boost.smoke ? 1 : 0]),
      bu: st.bullets.filter(b => b.alive).map(b => [r(b.x), r(b.y), b.dir, b.rocket ? 1 : 0, b.pierce ? 1 : 0]),
      fx: st.fx.map(f => [r(f.x), r(f.y), fxKind(f), f.per, f.tick]),
      pp: st.popups,
      pu: st.powerup,
      mi: st.mines.map(m => [m.x, m.y, m.t]),
      sp: st.spawns.map(s => [s.x, s.y, s.t]),
      rm: st.rankMsg ? [st.rankMsg.p.i, st.rankMsg.r, st.rankMsg.t] : null,
      // new-enemy effects: flames, mortar shells, repair beams, the spotter's mark
      fl: st.flames.map(f => [f.x, f.y, f.w, f.h]),
      ar: st.shells.map(a => [a.x, a.y, a.t]),
      hl: st.heals.map(h => [h.x1, h.y1, h.x2, h.y2, h.t, h.build ? 1 : 0]),
      mk: st.mark ? st.mark.p.i : -1,
      ea: [st.eagleArmor, st.eagleFlash, st.gunDir, st.base ? st.base.gun : 0, st.teslaT, st.zaps],
      tu: st.turrets.map(t => [t.x, t.y, t.dir, t.hp, t.owner ? t.owner.i : -1, t.enemy ? 1 : 0]),
      cl: st.claudes.map(c => [c.x, c.y, c.t]),
      sk: st.strikes.map(k => [Math.round(k.x), k.y, k.dir]),
      rw: st.reviveWait,
      dc: st.decoy,
      pd: st.pads, wx: st.weather,
      md: [st.vs || null, st.noBase ? 1 : 0, st.vsTime || 0, st.vsEnd || 0, st.vsWinner, st.survival ? 1 : 0, st.wave || 0, st.waveBreak || 0],
      ve: st.vsEagles || null,
      bg: st.big ? [st.big, st.outposts, st.factories.map(f => [f.x, f.y, f.hp, f.flash])] : null,
      fg: st.flags ? st.flags.map(f => [f.i, f.hx, f.hy, f.x, f.y, f.carrier ? 1 : 0]) : null,
      cr: st.corridor ? [st.corridor.shifts, st.corridor.climbed, st.corridor.startY] : null,
      cd: st.card || null,
    };
    st.netDiff = [];
    // the corridor moved down a section: the whole terrain goes again
    if (full || st.netFull) sv.tf = Array.from(st.terrain).join('');
    st.netFull = false;
    if (st.bosses.length) {
      sv.bo = st.bosses.map(b => { const o = Object.assign({}, b); delete o.bullets; return o; });
      sv.bm = st.beams;
      sv.tr = st.tracks.map(t => [t.x, t.y, t.t]);
      sv.du = st.dust.map(d => [d.x, d.y, d.t]);
    }
    if (st.bossIdx !== undefined) { sv.bi = st.bossIdx; sv.bl = st.bossLoop; sv.bb = st.bossBanner; }
    return sv;
  },

  // ------------------------------------------------------------ client
  async join(code) {
    const d = await this.decode(code);
    if (d.v !== APP_VERSION) throw this.versionError(d.v);
    if (d.slot === undefined) throw new Error('That is a reply code. Paste the invite code the host sent you.');
    this.leave(true);
    const pc = new RTCPeerConnection({ iceServers: NET_ICE });
    this.pc = pc;
    this.slot = d.slot;
    this.status = 'connecting';
    pc.ondatachannel = e => this.wireClient(e.channel);
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed') { this.status = 'failed'; this.refreshPanel(); }
    };
    await pc.setRemoteDescription({ type: 'offer', sdp: d.sdp });
    await pc.setLocalDescription(await pc.createAnswer());
    await this.waitIce(pc);
    return this.encode({ v: APP_VERSION, kind: 'reply', sdp: pc.localDescription.sdp });
  },

  wireClient(ch) {
    this.ch = ch;
    ch.onopen = () => {
      this.role = 'client';
      this.status = 'connected';
      Input.numPlayers = 1;
      Input.remote = {};
      Game.state = 'netwait';
      Game.t = 0;
      this.refreshPanel();
      setTimeout(() => { if (this.role === 'client' && this.panelMode === 'join') this.closePanel(); }, 1500);
    };
    ch.onmessage = e => {
      let msg;
      try { msg = JSON.parse(e.data); } catch (err) { return; }
      if (msg.t === 'welcome') {
        this.slot = msg.slot;
        // show the host's colours, lives display and boss/shop rules (not saved)
        if (!this.cfgBackup) this.cfgBackup = Object.assign({}, Config.values);
        Object.assign(Config.values, msg.cfg);
        Config.apply();
      } else if (msg.t === 'v') this.applyView(msg);
    };
    ch.onclose = () => {
      if (this.role !== 'client') return;
      this.leave();
      Game.toast('THE HOST LEFT THE GAME');
    };
  },

  // leave the online game and go back to the title screen
  leave(silent) {
    if (this.pc) { try { this.pc.close(); } catch (e) { /* closed */ } }
    const wasClient = this.role === 'client';
    this.pc = null; this.ch = null;
    if (this.cfgBackup) { Config.values = this.cfgBackup; this.cfgBackup = null; Config.apply(); }
    if (this.role === 'client') this.role = null;
    if (wasClient && !silent) { Game.stage = null; Game.players = []; Game.toTitle(); }
  },

  clientUpdate() {
    const inp = Input.player(0), m = Input.menu(), c = this.counters;
    if (Input.anyJust(['Escape']) && Game.state !== 'shop') { this.openClientMenu(); return; }
    if (inp.firePressed) c.fp++;
    if (inp.altPressed) c.ap++;
    if (m.up) c.cu++;
    if (m.down) c.cd++;
    if (m.left) c.cl++;
    if (m.right) c.cr++;
    if (m.ok) c.ok++;
    if (m.back) c.bk++;
    if (m.start) c.stt++;
    const msg = JSON.stringify(Object.assign({ t: 'in', d: inp.dir, f: inp.fire ? 1 : 0, a: inp.alt ? 1 : 0 }, c));
    if (this.ch && this.ch.readyState === 'open' && (msg !== this.lastSent || ++this.keep > 30)) {
      try { this.ch.send(msg); } catch (e) { /* closing */ }
      this.lastSent = msg;
      this.keep = 0;
    }
  },

  applyView(v) {
    const G = Game;
    if (v.c !== COLS || v.r !== ROWS || v.vc * 16 !== VIEW_W || v.vr * 16 !== VIEW_H) setFieldSize(v.c, v.r, v.vc || v.c, v.vr || v.r);
    G.players = v.pl.map((o, k) => Object.assign(G.players[k] && G.players[k].i === o.i ? G.players[k] : newPlayer(o.i), o, { tank: null }));
    if (v.base) G.base = v.base;
    if (v.as !== undefined && AutoSkill.rating !== v.as) { AutoSkill.rating = v.as; AutoSkill.cache = null; }
    G.mode = v.mode; G.taFrames = v.ta; G.taCleared = v.tac; G.vsWins = v.vw || [];
    if (v.vsr) G.vsRes = v.vsr;
    if (v.mr) G.modeRes = v.mr;
    G.twoP = G.players.length > 1;
    G.stageNum = v.stn;
    G.hi = v.hi;
    G.t = v.gt;
    if (v.st) this.applyStage(v.st);
    G.state = v.s === 'wait' ? 'netwait' : v.s;
    if (v.cu) G.curtain = v.cu;
    if (v.sc) G.sc = v.sc;
    if (v.sh) {
      G.shop = Object.assign({}, v.sh, { order: v.sh.order.map(i => G.players.find(p => p.i === i)), rep: 0 });
      G.shopDiscount = v.disc;
    }
    if (v.pa) Object.assign(G, v.pa);
    for (const s of v.snd || []) Sound.play(s);
    Sound.setEngine(v.eng || 0);
    if (v.toast) { G.toastText = v.toast[0]; G.toastT = v.toast[1]; }
  },

  applyStage(sv) {
    const G = Game;
    let st = G.stage;
    if (!st || st.netId !== sv.id) {
      st = new Stage(sv.num, LEVELS[0], [], {});
      st.netId = sv.id;
      G.stage = st;
    }
    if (sv.tf) for (let i = 0; i < st.terrain.length; i++) st.terrain[i] = sv.tf.charCodeAt(i) - 48;
    for (let k = 0; k < sv.df.length; k += 2) st.terrain[sv.df[k]] = sv.df[k + 1];
    if (sv.tf || sv.df.length) st.dirty = true;
    st.num = sv.num;
    st.players = G.players;
    st.twoP = G.players.length > 1;
    st.frame = sv.fr; st.over = sv.ov; st.overTimer = sv.ot; st.baseAlive = sv.ba;
    st.queue = new Array(sv.q).fill(0);
    st.tanks = sv.tk.map(a => new Tank({
      x: a[0], y: a[1], dir: a[2], isPlayer: !!a[3], player: a[4] >= 0 ? G.players.find(p => p.i === a[4]) : null,
      type: a[5], hp: a[6], bonus: !!a[7], shield: a[8], frozen: a[9], ship: !!a[10], anim: a[11], boost: Object.assign(a[12] ? { ghost: 1 } : {}, a[20] ? { smoke: 1 } : {}),
      plates: a[13] || 0, glow: a[14] || 0, reveal: a[15] || 0, ai: a[16] || 0, vet: a[17] || 0, stealth: a[5] === 7,
      segs: a[18] ? a[18].split(';').map(p => p.split(',').map(Number)) : null, ally: !!a[19],
    }));
    if (sv.ea) { st.eagleArmor = sv.ea[0]; st.eagleFlash = sv.ea[1]; st.gunDir = sv.ea[2]; st.teslaT = sv.ea[4]; st.zaps = sv.ea[5] || []; st.base = Object.assign(newBase(), G.base || {}); }
    st.turrets = (sv.tu || []).map(a => ({ x: a[0], y: a[1], dir: a[2], hp: a[3], owner: G.players.find(p => p.i === a[4]) || null, enemy: !!a[5] }));
    st.claudes = (sv.cl || []).map(a => ({ x: a[0], y: a[1], t: a[2] }));
    st.strikes = (sv.sk || []).map(a => ({ x: a[0], y: a[1], dir: a[2] }));
    st.reviveWait = sv.rw || 0;
    st.decoy = sv.dc || null;
    st.pads = sv.pd || [];
    if (sv.md) [st.vs, st.noBase, st.vsTime, st.vsEnd, st.vsWinner, st.survival, st.wave, st.waveBreak] = [sv.md[0], !!sv.md[1], sv.md[2], sv.md[3], sv.md[4], !!sv.md[5], sv.md[6], sv.md[7]];
    st.vsEagles = sv.ve || null;
    if (sv.bg) { st.big = sv.bg[0]; st.outposts = sv.bg[1]; st.factories = sv.bg[2].map(a => ({ x: a[0], y: a[1], hp: a[2], flash: a[3] })); }
    else { st.big = null; st.outposts = []; st.factories = []; }
    st.flags = sv.fg ? sv.fg.map(a => ({ i: a[0], hx: a[1], hy: a[2], x: a[3], y: a[4], carrier: a[5] ? {} : null })) : null;
    st.weather = sv.wx || null;
    st.card = sv.cd || null;
    if (sv.cr) {
      // the host's world moved down: so does this screen's window
      if (st.corridor && sv.cr[0] > st.corridor.shifts && st.camY !== undefined) st.camY += (sv.cr[0] - st.corridor.shifts) * st.sectionPx();
      st.corridor = { shifts: sv.cr[0], climbed: sv.cr[1], startY: sv.cr[2] };
    } else st.corridor = null;
    st.flames = (sv.fl || []).map(a => ({ x: a[0], y: a[1], w: a[2], h: a[3] }));
    st.shells = (sv.ar || []).map(a => ({ x: a[0], y: a[1], t: a[2] }));
    st.heals = (sv.hl || []).map(a => ({ x1: a[0], y1: a[1], x2: a[2], y2: a[3], t: a[4], build: !!a[5] }));
    const mp = G.players.find(p => p.i === sv.mk);
    st.mark = mp ? { p: mp, t: 1 } : null;
        st.rankMsg = sv.rm ? { p: G.players.find(p => p.i === sv.rm[0]) || G.players[0], r: sv.rm[1], t: sv.rm[2] } : null;
    st.bullets = sv.bu.map(a => ({ x: a[0], y: a[1], dir: a[2], rocket: !!a[3], pierce: !!a[4], alive: true }));
    const FX = { s: () => Sprites.smallExp, b: () => Sprites.bigExp, B: BIG_EXPLOSION };
    st.fx = sv.fx.map(a => ({ x: a[0], y: a[1], frames: FX[a[2]](), per: a[3], tick: a[4] }));
    st.popups = sv.pp;
    st.powerup = sv.pu;
    st.mines = sv.mi.map(a => ({ x: a[0], y: a[1], t: a[2] }));
    st.spawns = sv.sp.map(a => ({ x: a[0], y: a[1], t: a[2] }));
    st.bosses = (sv.bo || []).map(o => new Boss(o));
    st.beams = sv.bm || [];
    st.tracks = (sv.tr || []).map(a => ({ x: a[0], y: a[1], t: a[2] }));
    st.dust = (sv.du || []).map(a => ({ x: a[0], y: a[1], t: a[2] }));
    st.bossIdx = sv.bi === undefined ? undefined : sv.bi;
    st.bossLoop = sv.bl || 0;
    st.bossBanner = sv.bb || 0;
  },

  // ------------------------------------------------------------ panels (HTML, for copy and paste)
  el(tag, attrs = {}, ...kids) {
    const e = document.createElement(tag);
    for (const k in attrs) {
      if (k === 'on') for (const ev in attrs.on) e.addEventListener(ev, attrs.on[ev]);
      else if (k === 'text') e.textContent = attrs.text;
      else e.setAttribute(k, attrs[k]);
    }
    for (const kid of kids) if (kid) e.append(kid);
    return e;
  },

  panel() {
    let p = document.getElementById('netPanel');
    if (!p) {
      p = this.el('div', { id: 'netPanel', role: 'dialog', 'aria-modal': 'true' });
      document.body.append(p);
    }
    return p;
  },

  openPanel(mode) {
    this.panelMode = mode;
    this.panelOpen = true;
    Input.down.clear();
    this.panel().hidden = false;
    this.refreshPanel();
  },

  closePanel() {
    this.panelOpen = false;
    const p = document.getElementById('netPanel');
    if (p) p.hidden = true;
    if (this.panelMode === 'lobby' && !this.inGame && this.role === 'host' && !Object.keys(this.peers).length) this.hangUp();
  },

  copyButton(getText) {
    const b = this.el('button', { type: 'button', text: 'Copy' });
    b.addEventListener('click', () => {
      const text = getText();
      const done = () => { b.textContent = 'Copied'; setTimeout(() => { b.textContent = 'Copy'; }, 1500); };
      const fallback = () => {
        const ta = b.parentElement.querySelector('textarea[readonly]');
        if (ta) { ta.focus(); ta.select(); }
        b.textContent = 'Press ⌘C / Ctrl+C';
      };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, fallback);
      else fallback();
    });
    return b;
  },

  refreshPanel() {
    if (!this.panelOpen) return;
    const p = this.panel();
    p.textContent = '';
    const box = this.el('div', { class: 'netBox' });
    p.append(box);
    if (!this.supported()) {
      box.append(this.el('h2', { text: 'Online play' }),
        this.el('p', { text: "Online play can't start here. Open the downloaded game file (tanb4iki_v" + APP_VERSION + '.html) or the GitHub Pages copy in Chrome, Safari, Firefox or Edge.' }),
        this.el('div', { class: 'netRow' }, this.el('button', { type: 'button', text: 'Close', on: { click: () => this.closePanel() } })));
      return;
    }
    if (this.panelMode === 'lobby' || this.panelMode === 'ingame') this.renderHostPanel(box);
    else if (this.panelMode === 'join') this.renderJoinPanel(box);
    else this.renderClientMenu(box);
  },

  renderHostPanel(box) {
    const lobby = this.panelMode === 'lobby';
    box.append(this.el('h2', { text: lobby ? 'Online game · host' : 'Online players' }));
    box.append(this.el('p', { class: 'hint', text: 'For each friend: create an invite code, send it to them, then paste the reply code they send back. Friends need the same game file (v' + APP_VERSION + ').' }));
    const list = this.el('ol', { class: 'netSlots' });
    this.slots.forEach((kind, i) => {
      const li = this.el('li');
      const head = this.el('div', { class: 'netSlotHead' }, this.el('b', { text: ROMAN[i] + '-player' }));
      if (kind === 'local') {
        head.append(this.el('span', { text: i === 0 ? ' · you, on this computer' : ' · on this computer' }));
        li.append(head);
      } else {
        const peer = this.peers[i];
        const status = !peer ? 'no invite yet' : peer.status === 'connected' ? 'connected ✓' : peer.status === 'lost' ? 'disconnected' : peer.status === 'connecting' ? 'connecting…' : 'waiting for reply';
        head.append(this.el('span', { class: 'netStatus ' + (peer ? peer.status : ''), text: ' · online friend · ' + status }));
        li.append(head);
        if (!peer || peer.status === 'lost' || peer.status === 'invite' || peer.status === 'connecting') {
          if (!peer || peer.status === 'lost') {
            li.append(this.el('button', { type: 'button', text: peer ? 'New invite code' : 'Create invite code', on: { click: async e => {
              e.target.disabled = true; e.target.textContent = 'Creating…';
              try { await this.createInvite(i); } catch (err) { this.peers[i] = { status: 'lost', error: String(err.message || err), pc: { close() {} } }; }
              this.refreshPanel();
            } } }));
          } else {
            const inv = this.el('textarea', { readonly: '', rows: '3', 'aria-label': 'Invite code' });
            inv.value = peer.invite;
            const reply = this.el('textarea', { rows: '3', placeholder: 'Paste the reply code here', 'aria-label': 'Reply code' });
            const err = this.el('p', { class: 'netError' });
            li.append(this.el('label', { text: '1. Send this invite code' }), inv, this.el('div', { class: 'netRow' }, this.copyButton(() => peer.invite)),
              this.el('label', { text: '2. Paste the reply code' }), reply,
              this.el('div', { class: 'netRow' }, this.el('button', { type: 'button', class: 'primary', text: 'Connect', on: { click: async () => {
                err.textContent = '';
                try { await this.acceptReply(i, reply.value); this.refreshPanel(); } catch (e2) { err.textContent = String(e2.message || e2); }
              } } })), err);
          }
        }
        if (peer && peer.error) li.append(this.el('p', { class: 'netError', text: peer.error }));
      }
      if (lobby && i > 0 && i === this.slots.length - 1) {
        li.append(this.el('div', { class: 'netRow' }, this.el('button', { type: 'button', text: 'Remove', on: { click: () => {
          const peer = this.peers[i];
          if (peer) { try { peer.pc.close(); } catch (e) { /* closed */ } delete this.peers[i]; }
          this.slots.pop();
          this.refreshPanel();
        } } })));
      }
      list.append(li);
    });
    box.append(list);
    if (lobby) {
      if (this.slots.length < 4) {
        box.append(this.el('div', { class: 'netRow' },
          this.el('button', { type: 'button', text: '+ Online friend', on: { click: () => { this.slots.push('online'); this.refreshPanel(); } } }),
          this.el('button', { type: 'button', text: '+ Player on this keyboard', on: { click: () => { this.slots.push('local'); this.refreshPanel(); } } })));
      }
      box.append(this.el('div', { class: 'netRow end' },
        this.el('button', { type: 'button', text: 'Cancel', on: { click: () => { this.hangUp(); this.closePanel(); } } }),
        this.el('button', { type: 'button', class: 'primary', text: 'Start game', on: { click: () => this.startGame() } })));
    } else {
      box.append(this.el('div', { class: 'netRow end' }, this.el('button', { type: 'button', class: 'primary', text: 'Back to game', on: { click: () => this.closePanel() } })));
    }
  },

  startGame() {
    this.closePanel();
    Game.newGame(this.slots.length, false, true);
    this.applySlots();
  },

  renderJoinPanel(box) {
    box.append(this.el('h2', { text: 'Online game · join' }));
    const inv = this.el('textarea', { rows: '4', placeholder: "Paste the host's invite code here", 'aria-label': 'Invite code' });
    inv.value = this.inviteText || '';
    box.append(this.el('label', { text: "1. Paste the host's invite code" }), inv);
    const go = this.el('button', { type: 'button', class: 'primary', text: 'Create reply code', on: { click: async () => {
      go.disabled = true; go.textContent = 'Creating…';
      this.inviteText = inv.value;
      this.joinError = '';
      try { this.replyCode = await this.join(inv.value); } catch (e) { this.joinError = String(e.message || e); this.replyCode = ''; }
      this.refreshPanel();
    } } });
    box.append(this.el('div', { class: 'netRow' }, go), this.el('p', { class: 'netError', text: this.joinError || '' }));
    if (this.replyCode) {
      const rep = this.el('textarea', { readonly: '', rows: '3', 'aria-label': 'Reply code' });
      rep.value = this.replyCode;
      box.append(this.el('label', { text: '2. Send this reply code back to the host' }), rep, this.el('div', { class: 'netRow' }, this.copyButton(() => this.replyCode)));
      const text = this.status === 'connected' ? 'Connected as ' + ROMAN[this.slot] + '-player. Waiting for the host…'
        : this.status === 'failed' ? "Couldn't connect. One of the networks blocks direct connections (see README)."
          : 'Waiting for the host to paste your reply code…';
      box.append(this.el('p', { class: 'netStatusLine ' + (this.status || ''), text }));
    }
    box.append(this.el('div', { class: 'netRow end' }, this.el('button', { type: 'button', text: this.status === 'connected' ? 'Close' : 'Cancel', on: { click: () => {
      if (this.status !== 'connected') { this.leave(true); this.replyCode = ''; this.status = ''; }
      this.closePanel();
    } } })));
  },

  openClientMenu() { this.openPanel('client'); },

  renderClientMenu(box) {
    box.append(this.el('h2', { text: 'Online game' }),
      this.el('p', { text: "You're playing as " + ROMAN[this.slot] + '-player. The host controls stages, pausing and saving.' }),
      this.el('div', { class: 'netRow end' },
        this.el('button', { type: 'button', text: 'Leave game', on: { click: () => { this.closePanel(); this.leave(); this.replyCode = ''; this.status = ''; } } }),
        this.el('button', { type: 'button', class: 'primary', text: 'Back to game', on: { click: () => this.closePanel() } })));
  },
};

// forward the host's game sounds to the guests
(() => {
  const play = Sound.play.bind(Sound);
  Sound.play = name => {
    play(name);
    if (Net.role === 'host' && Net.inGame && NET_SOUND_STATES.has(Game.state)) Net.sndQueue.push(name);
  };
})();
