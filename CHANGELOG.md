# Changelog

The version lives in `js/version.js` and is shown on the title screen as `tanb4iki_v<version>`.
`node tools/build.js` writes the single-file game to `dist/tanb4iki_v<version>.html`.

## 0.65

- **New mode: DESERT DOMINION** — a full tribute to Dune II, the first modern real-time strategy game, with its rules
  and an original world: the desert planet KHARRA, its GLIMMER and SANDWYRMS, three Houses (AQUILA, DRAKON, SERPENS)
  and THE REGENT. Every building (construction yard, vapor traps, refineries, silos, radar, barracks, trooper hall,
  light / heavy / high-tech factories, repair pad, research lab, starport, palace, walls, gun and rocket turrets,
  concrete) and every unit (soldiers, troopers, trikes, raiders, quads, combat / missile / siege tanks, harvesters,
  MCVs, skylifters, gunwings, the frigate; the House specials SONIC TANK, JUGGERNAUT and CONVERTER; the palace powers
  NOMAD WARRIORS, the DOOMFIST and the SABOTEUR; PRAETORIANS), factory upgrades, power, storage, concrete and decay,
  repair, selling, capturing, the starport's market, blooms, sandwyrms, the shroud and fog of war, radar.
  - A campaign of nine missions per House: the intro, the advisors (COUNSELLOR MIREN, OVERSEER KASK, FACTOR VELL)
    with their briefings, the region map of KHARRA, the score screen with ranks, an ending for each House; saved.
  - Skirmish against 1-3 computer Houses (allied or each alone) on generated maps of four styles.
  - Computer commanders that scout instead of seeing everything, five levels.
  - Mouse (classic or modern orders, box select, groups and hotkeys), keyboard and gamepad (a cursor), touch.
  - Saving a battle, online co-commanders, its own title picture.
  - 17 new tunes in all three music styles (peace and battle tunes that switch with the fighting, a theme for each
    House, the intro, menu, map, briefing, victory, defeat, score and the Regent's march) and 11 announcement jingles.
  (rtsdata.js, rts.js, rtsunit.js, rtsai.js, rtsai_army.js, rtsui.js, rtsdraw.js, rtssave.js, rtsart_units.js,
  rtsart_world.js, rtsmaps.js, rtscampaign.js, rtsmusic.js, rtsmusic2.js, rtsart_title.js)

## 0.64.1

- **Online play checked in every mode** (two browsers connected by codes, the guest driving player II):
  - **Tank Rally and Astro Tanks now work online** (netstream.js). They drew nothing for the guest (who waited forever)
    and threw errors on the host. The host now sends its screen as pictures, 20 a second, with its sounds and music;
    the guest's keys drive player II.
  - **Fixed: Fortress** — the guest's stage curtain threw an error (it didn't know the map).
  - **Fixed: Custom levels** — starting it online with no levels made crashed; the lobby now says so, as the title does.

## 0.64

- **New mode: ASTRO TANKS** — a tribute to Asteroids (astro.js, astroup.js, astroboss.js, astromusic.js, astroart.js).
  Your tank in open space on a wrap-round screen: smooth turning, thrust and drift, brakes, hyperspace; rocks that split
  in five kinds (stone, crystal, iron, ice, magma), saucers that shoot back, the heartbeat pulse, pickups. Crystals buy
  upgrades in the hangar between waves (17, with levels, most of them showing on the tank). A mini boss every fifth
  wave: CINDER COLOSSUS, VOID MATRIARCH, COMET WYRM, coming back stronger. 1-2 players. Four new tunes in all three
  music styles and the mode's own title picture.

## 0.63

- **Counter-Strike: neutral tanks** (csneutral.js). A NEUTRAL TANKS row on the team screen (OFF / FEW / SOME / MANY:
  0, 4, 8 or 12) puts grey tanks of nobody's side round the map (BASIC, FAST, POWER, ARMOR). They wait out the buy
  time, then hunt whoever's nearest on either team; one destroyed pays $150 and comes back ten seconds later out of
  sight. Hidden in the fog like the other side, grey dots on the minimap once seen; the bots fight them up close.

## 0.62

- **Counter-Strike: take over bot after bot.** Out, B takes over the bot you're watching; out again, the next one, as
  long as your team has a bot left (it was once a round).
- **The tank you take over stays as it was** (its type and look), not yours.
- **Bots get a random tank type** at the start of a match (any of the player tanks or the enemies'), kept all match.
- **Reloading** (csreload.js): every gun has a magazine (cannon 6, machine gun 40, flamethrower 2.5 s, mortar 3,
  tesla 4, missiles 2, laser 3); empty, the tank reloads for 1.7-2.5 s; R reloads early (player II: 7). The magazine
  in the side panel, a bar under your tank while it reloads; bots reload in quiet moments. Sent to online guests.

## 0.61

- **New mode: TANK RALLY** — a tribute to Rock n' Roll Racing with tanks (rallytracks.js, rally.js, rallycareer.js,
  rallymusic.js, rallyart.js). Four-tank races on twenty circuits across five alien worlds: driving with momentum and
  sliding corners, jumps over chasms and lava, ice, mud, boost pads; a forward weapon, a rear drop and boost, charges
  filled up every lap; wrecks and respawns; three computer rivals with their own faces, styles and taunts. Between
  races a career: money for places and kills, a shop (engine, tracks, armour, suspension, charges, four tanks to buy),
  divisions to climb, a final against the champion. 1-2 players. Original tracks, rivals and music in all three styles
  (no songs from the real game: its soundtrack is licensed music).

## 0.60.1

- **Fixed: BIG MAPS factories you couldn't destroy** with some weapons, so the stage couldn't be finished. Missiles only
  chased tanks (and the factories keep making them), the tesla and the flamethrower never touched buildings, and the
  mortar never aimed at one. Now missiles fired at a factory (or the VS CPU HQ) straight ahead go for it, and home on one
  when no tank is near; the mortar lands on one lined up ahead, the tesla zaps one in reach, the flamethrower burns it.

## 0.60

- **Counter-Strike: pick your tank** on the team screen (a TANK row for each player; online friends use up/down):
  your own, one of the four player tanks or any enemy's, in your team's colours. The look only; remembered.
- **Counter-Strike: no more "can't shoot".** A tank has one shell in the air at a time (two with two stars), and on
  these open maps a miss flew on for a whole screen and more, up to 1.7 s, while FIRE did nothing. Now a shell flies at
  most 10 tiles, the plain shell is quicker (3.5, was 2.5; a star still makes it 4.5), and FIRE pressed while your shell
  is still out isn't lost: it fires the moment it can (within a quarter of a second). Pressing away: 13 shots in 10 s
  without a star (was 6), 16 with one (was 11).
- **The stage-start fanfare in your MUSIC STYLE:** with ROCK or SYNTHWAVE the tune before every round (classic and
  every mode that plays it) is a rock or a synthwave version of it; CHIPTUNE keeps the original.

## 0.59

- **CONTROLS page** instead of the line of keys under the game: in the pause menu (the keys of the players in this
  game and what the mode adds) and in Settings → SCREEN → SHOW CONTROLS (every layout, 1, 2 or 3-4 players). It shows
  the keys in use, set-ups of your own included.
- **Counter-Strike: take over a bot** when you're out: watching a bot of your team, B takes its tank, its gear and the
  bomb if it has it (once a round).
- **Counter-Strike: your whole team out**, the round going on: no fog, the arrows move the camera round the map,
  FIRE follows the next tank still in it.
- **The engine hum is your own tank's**: bots driving player tanks (Counter-Strike, deathmatch, kill race) no
  longer keep it roaring all the time.

## 0.58

- **Counter-Strike: three new maps**, each laid out after the real one: **DE_AZTEC** (the rope bridge over the
  ravine, the water and the overpass, the double doors, temples on both sites), **DE_TRAIN** (yards of train cars on
  rails at both sites, ivy, popdog, heaven and hell, the B halls) and **DE_MIRAGE** (palace, mid window, connector,
  apartments, the market, mosaic sites). Choose the MAP on the team screen, or RANDOM. Online friends get the host's.
- **Flashbangs** ($200, two at most): B throws one up to six tiles; a moment later it bangs and blinds every tank that
  can see it within about seven tiles, for up to 3 s (longer when near and looking at it, the thrower too). Your
  screen goes white; bots hold their fire. Grenades go in the order you bought them. Bots buy and throw them (into a
  site before going in, round a corner when hunting, onto the site on a retake).
- **Free gear every round:** each counter-terrorist gets a **star and an armour plate**, each terrorist a plate; the
  bomb ticks 36 s (was 40). (The defenders' gear alone made them win 9 rounds in 10; with the terrorists' plate and
  the shorter fuse bot matches come out about even.)
- **A SYNTHWAVE soundtrack** (Settings → MUSIC STYLE: ROCK, SYNTHWAVE, CHIPTUNE): every tune of the game as 80s
  synthwave / outrun / darksynth (synthwave.js) — 31 tracks from NEON EAGLE (classic) and DUST AFTER DARK
  (Counter-Strike) to STARFIGHTER 1986 (galaxy) and CAROL OF THE NEON BELLS. Detuned saw pads, arpeggios, a pumping
  bass, an echoing lead, gated-reverb drums. Changing MUSIC STYLE mid-game now swaps the tune at once.
- Counter-Strike round starts no longer stall (the map was drawn from scratch each round: 300-600 ms; now once per
  map); bots carry on past a teammate they sidestep instead of turning back into it.

## 0.57

- **Counter-Strike: orders to the bots** (csorders.js): **1 FOLLOW ME**, **2 HOLD HERE** (stay round where you are
  and defend it), **3 GO ON** (their own plan again). Q, a stick click on a gamepad or the ORDER button on a touch
  screen goes round them; player II has 8 9 0; online friends order their own team. Shown at the bottom of the field.
- **You start with the bomb** when you play a terrorist (a bot only has it when no player is on that side), and the
  terrorist bots go where you go: the site you head for, in once you're close to it.
- **Smarter bots.** The terrorists no longer sit at their gathering points for most of a minute (the "everyone's
  there" check never came true, so they only went in on a late timer): they go in after 6-18 seconds. The
  counter-terrorists no longer just stand on their posts: the two nearest go after a terrorist seen or heard near
  them, and in quiet spells each takes a turn looking out further up its way in. Bots make way for a player pushing
  past them. Bots against bots, the sides now win about as often as each other (was 2 to 1 for the terrorists), with
  twice the fighting before the bomb is down.

## 0.56.2

- **Fixed: Counter-Strike lagging badly and going black.** The map's picture was being redrawn from scratch on every
  frame (about 250 ms a frame, 4 fps on the buy screen), making thousands of little canvases a second until the
  browser gave up and the field went black after the countdown. It's drawn once again (about 1 ms a frame). The same
  slip could cost Corridor and Endless World time too; it's fixed for every mode at once.

## 0.56.1

- **Galaxy: the Frost Queen is no pushover any more** (gxfrost.js): more life (560, was 446), she follows you faster
  as she weakens, and new attacks: volleys of icicles dropping in the columns round you, a BLIZZARD WALL coming down
  with one gap to find (two in her last phase), three freezing beams at once and three more in the gaps, frost novas
  (double rings of shards), and a blink: gone in a flurry of snow, back right over you.

## 0.56

- **New mode: COUNTER-STRIKE** (cs*.js), on a top-down DUST 2: the T and CT spawns, long A with its doors and pit,
  catwalk, mid and the xbox, the B tunnels, both bombsites — sandstone walls that never break, wooden crates and doors
  that do. Pick a side, 3v3 to 5v5 with bots filling the teams, first to 5, 8 or 13 rounds, sides swap at half time.
  - *A round:* 10 s to buy (armour plates, stars, smoke, mines, a defuse kit, the guns), then 1:55. One T carries
    the bomb (it drops where he falls); plant it on A or B (hold B still for 3 s), 40 s to go off; the CTs defuse it
    (10 s, 5 with a kit). Rounds end as in the original: a team wiped out, the bomb going off, defused, or time out.
  - *Money* as in the original: pay per kill by weapon, round wins, loss streak bonus, plant and defuse.
  - *Fog of war:* you see only what your team sees — walls, crates and smoke block sight; explored ground stays dim,
    enemies there are hidden; unexplored ground is black.
  - *Bots* buy, take routes (long, catwalk, tunnels, the lurk), plant, hold, rotate, retake and defuse.
  - Tab shows the scoreboard; records: matches and rounds won. 1-4 players, online too (each guest sees their own
    team's fog).
- **The mushroom guard moves:** it runs back and forth round the eagle to stay between it and the danger and soaks up
  the shells aimed at it (BLOCKED!) — but a shot that gets past it now hits the eagle.

## 0.55

- **New mode: ENDLESS WORLD** (world*.js): a land without end, made as you drive — the same land every time for its
  seed, a new one every run. Nine biomes from the seasons and terrain types with smooth borders between them, rivers,
  lakes, roads and city streets; whatever you break stays broken.
  - *Villages* come under siege: hold them off the attack and a saved village becomes your safe spot (you come back
    there, and it's the checkpoint).
  - *Ruins* with chests and their guards; some hide a vault with a classic boss on a big chest.
  - *Nests* turn out tanks until destroyed; patrols drive the roads; the further from home, the tougher the enemy, and
    each biome has its own.
  - *Day and night:* a 7-minute day, mostly daylight, with a short night at the end.
  - A compass to the nearest village or ruin, the day, villages saved and chests looted on the side panel, a minimap
    of what you've explored; records: the farthest distance and the villages saved. 1-4 players, online too.

## 0.54.1

- **Every weapon breaks brick now**, so none leaves you stuck behind a wall (in the corridor above all): the laser
  cuts a tank-wide gap from MK I (a block deep per shot at MK I), bricks crumble in the flamethrower's heat, the mortar
  aims at the first brick wall ahead when nobody's lined up, and the tesla and missiles, with nothing to hit, blow a
  hole a tank fits through in the wall ahead.
- **The corridor is as wide as the team:** 13 tiles alone, 17 for two, 21 for three or four (a narrower screen
  scrolls sideways).
- **Darkness, rarer still:** night and fog stages one in eighteen (night on 9, 45, 81 ..., fog on 27, 63 ...); city
  blackouts half as often and shorter; the corridor's dark tunnel once in the first round of set pieces, then one
  time in three; survival's night and fog twists half as likely.

## 0.54

- **Corridor, reworked** (corridor2.js):
  - *A rising hazard:* a flood, a wall of fire or lava creeps up from below, faster the higher you are (gentler on the
    easy skills); fall into it and you lose a tank. The bottom edge glows and counts down how close it is.
  - *Climb combo:* keep climbing to fill the meter in the left border: x2, then x3 points; stop and it drains.
  - *Bands every 100 m:* city, forest, snow and ice, volcano (lava down both sides), sky fortress (steel walkways over
    a drop — fall off and you lose a tank), each with its own look, twist, enemy and music.
  - *Set pieces:* a bridge under fire, a convoy crossing, a minefield, a gate that opens when its 3 turrets are down, a
    conveyor climb, a dark tunnel; and splits into a FAST route (more enemies, more loot) and a SAFE one.
  - *Supply depots every 250 m* repair you, give a tank to anyone without one, bring back the fallen — and are the
    checkpoint. *A boss gate every 500 m:* the classic bosses, one after the other, block the way.
  - *Medals* at 300, 600 and 1000 m (on the title), and a ghost marking where your best run ended.

## 0.53

- **Any side, reworked** (sides2.js):
  - The eagle's edge goes round all four sides in turn (the bottom too), one per stage.
  - *Twists* on a five-stage cycle: TWO FRONTS (waves alternate between the far edge and a flank, with a siren and
    arrows before each new direction), THE EAGLE MOVES (mid-stage a truck carries the eagle along a road to a new fort;
    enemies go for the truck; lose it and the eagle is lost), WIND (shells drift; a wind sock shows which way), an ICE
    SLOPE (tanks on ice slide toward the eagle's edge), and every 5th stage a MIRROR stage: two eagles on opposite
    edges, both must survive.
  - *Side maps:* 12 new hand-made maps, three for each edge (River Bank, Glacier, Canyon, Cliff Top, Ice Shelf, City
    Blocks, Delta, Frozen Bay, Woods, The Dam, Ice Rink, Trenches), mixed in with the turned classic ones.
  - *Defences:* 10 s before each stage to put down sandbags or a turret facing the attack (FIRE puts, B swaps, ENTER
    starts).
  - *Streak:* clear all four sides in a row for a bonus (5000, then 10000, up to 20000); losing an eagle resets it.
  - *Curtain preview:* a little map of the coming stage: where your eagle is, where they come in, the twist.

## 0.52

- **The maze, reworked** (maze2.js, with its enemies in mazefoes.js):
  - *Keys and gates:* red, blue and yellow gates on the way out (more in deeper mazes), each key behind the gate
    before it — always solvable. Keys are the team's (shown on the side panel); a LOCKSMITH can steal one.
  - *The sealed exit:* collect 3 power cells first. *Rivers* cut some mazes in two: find the BRIDGE crate.
    *Pressure plates* open a door elsewhere for 20 s (ticking, with a marker pointing to it).
  - *Moving walls* slide or swing every 15 s (rumble and dust first; never onto a tank, never cutting you off),
    *cracked floor* falls in behind you, *belts* and *teleporters* make shortcuts and traps.
  - *Darkness:* your lamp lights the way, explored passages stay dim, pitch-black stretches have torches that stay lit
    once passed. The lamp burns down over about 3 minutes — fuel cans in the side passages refill it.
  - *The minimap* shows only what you've seen; drop up to 5 markers on it (I-player: Q / E). A MAP SCROLL shows the
    whole maze for 15 s.
  - *The collapse:* once every key and cell is taken the maze starts to fall in behind you; get out before the clock
    runs down (or lose a tank and the clock restarts, shorter).
  - *Par times and stars* (★ to ★★★), the best kept per maze; *treasure rooms* (coins, weapon crates, lives),
    *vaults* opened by beating the Minotaur, *secret exits* behind a wall that only looks like steel (skip a maze).
  - *Depths:* stone dungeon (mazes 1-4), sewer (5-9), ice caverns (10-14), machine (15+), each with its own look; every
    5th maze is a LAIR with the Minotaur as its boss in a central arena (the exit stays sealed until it falls).
  - *Its enemies:* the MINOTAUR, CRAWLERS, SENTRIES, the LOCKSMITH, MIRROR tanks in open rooms, and the MOSSLUMP.

## 0.51.5

- **Block look** (Settings → SCREEN → LOOK: CLASSIC / BLOCKS, also in the pause menu): a texture pack in a chunky
  voxel-block style for all terrain, in every season and terrain type — cobblestone instead of brick (mossy in spring,
  snowy-pale in winter, sandstone in the desert ...), obsidian plates instead of steel, leaf blocks for trees, blocky
  water and lava, packed ice, plank bridges, chests for crates, portal blocks for pads, block floors for the ground.
  Walls stay easy to tell apart; tanks, shells and power-ups keep their classic look; galaxy is untouched. Switch it
  any time; online it's each player's own choice.

## 0.51.4

- **Boss gallery** (Settings → ART → BOSS GALLERY): the picture of every boss you've met, tank bosses and galaxy
  bosses, as shown before the fight; once you've beaten one, FIRE turns to the picture from after it. Bosses you
  haven't met aren't in it at all, not even their names: the gallery only counts what you've found (< > turn the
  pages). Bosses met before this version are filled in from your records.
- **Maze: new enemies** (the first part of the maze overhaul; the rest — keys, gates, themes, lairs — is coming): the
  MINOTAUR (a huge hunter you hear before you see, from maze 3), CRAWLERS hiding in brick walls, twin-barrelled
  SENTRIES at junctions, the LOCKSMITH, a fast tank that will steal keys once the keys arrive, and the MOSSLUMP: a
  silent, mossy lump that never fires, creeps up, flashes white and blows a crater in the walls (and in you) —
  shoot it while it flashes and it goes off early, or get away and it calms down.

## 0.51.3

- **The title menu holds still** while you go through the modes: CONTINUE (shown for a mode with a save) keeps its
  own row, left empty when there's nothing to continue, so the title and the other rows no longer jump up and down.

## 0.51.2

- **Saving when the browser won't store it.** If the browser refuses to keep a save (its storage for the page is
  full, or blocked — some browsers and private windows block storage for embedded pages), SAVE GAME no longer just
  says SAVE FAILED: the save is kept in memory for as long as the page is open (CONTINUE and loading work as usual)
  and the message says why: NOT KEPT: STORAGE FULL or NOT KEPT: STORAGE BLOCKED.

## 0.51.1

- **Survival: revivals get dearer.** With no shop in survival your whole score was there to spend, so LAST CHANCE
  could bring you back again and again. Now each paid revival costs twice the one before (7500, 15000, 30000 ...,
  from the REVIVE COST setting), and the line above the field shows the points you have to spend and what the next
  revival costs. Free ones (the REVIVE power-up, SPARE TANKS) don't raise the price.

## 0.51

- **Construction, upgraded:** five pages (MAP, MARKERS, LEVEL, ENEMIES, POWER-UPS; Tab switches).
  - *Map size* from 13x13 up to 40x30: the editor scrolls with the cursor, and O zooms out to the whole map.
  - *Markers:* the eagle anywhere (its fortress moves with it), starts for players I-IV, 1-8 enemy entry points,
    up to 12 power-up spots, where the boss appears.
  - *Level:* season, weather (auto / clear / night / fog), eagle on or off (off: the enemy hunts you), goal
    (destroy all, or hold out until the clock runs down), time limit, lives.
  - *Enemies:* the usual line-up or your own: up to 10 groups, each with count, type (any enemy, the seasons' and
    terrains' own too), rank (normal / veteran / elite), hits and speed; mixed or in turn; how many at once and how
    often; a boss (any of the 10) with its HP from 25% to 500%.
  - *Power-ups:* the usual ones or your choice, and timed drops every 10-90 s; they land on your power-up spots.
  - A random level fills a big map too. Old levels load and play exactly as before; CUSTOM LEVELS, play from the
    editor, saves and online play all use the new settings. Walled-in entry points get a way opened, as everywhere.
- **New mode title pictures:** every mode's picture is redrawn at 240x136 (it was 112x64 at double size), one
  detailed animated scene each (shown at 2x or 4x on big screens): the classic fortress at dusk, the blueprint on a
  desk, survival's last stand from above with its twists, a dawn race, an aerial big map with platoons and clouds,
  the turning war-room table, the climb through the sky, the lamp-lit maze, the tower meadow, deep space, the
  floodlit stadium, two forts in a thunderstorm, the steel arena, the flag run over the river, the machine's
  fortress.

## 0.50.1

- **Fix: enemies walled in at their entry point.** Some maps (wider fields mirrored from a classic one, lava, water,
  steel and basalt, in any mode) shut an entry point in completely: a tank that came in there could never get out,
  and without a weapon to break the wall the stage could not be won. Now when a stage is built, every walled-in entry
  point gets a way through to the players (the shortest one through as little wall as possible: steel cleared, water
  bridged). And an enemy that still ends up somewhere with no way to anyone (rebuilt walls, a jump, a teleporter)
  comes in again at an open entry point after 10 seconds.

## 0.50

- **Survival, reworked: hold out for 100 waves.** No eagle any more: you start in the middle of one map, 4 tiles
  bigger each way than the screen (it scrolls), the same map for the whole run (a random one, in a random season),
  and the enemy comes in from entry points all round the edge and hunts you. Waves grow only to 28 tanks; after that
  they get tougher instead (more armour, more hunters, 4 rising to 8 on the field at once, faster spawns, the newer
  types, veterans and elites). A **twist** every third wave, announced a wave ahead: night, fog, a swarm of fast light
  tanks, an armoured column, sappers, a double-speed blitz, rocket rain from the sky, a shield wall, shadows, a snake
  pit; wave 100 is THE LAST WAVE. Between waves 10-60% of the wrecked terrain is rebuilt and a few power-ups are
  dropped around the map; a **perfect wave** (no tank lost) pays 1000 + 100 per wave and a power-up each; every 5
  waves **pick 1 of 3 perks** for the team (12 of them: plates, reload, shell speed, a twin gun, engine, spare tanks,
  more drops, longer power-ups, stars, bounty, AP shells, spawn shield). Co-op makes waves bigger and busier. The
  wave checkpoint keeps the map, terrain, twists and perks; holding all 100 waves is a victory of its own.
- **Three new terrain types: VOLCANIC, SWAMP, CITY RUINS** (seasons now cycle through nine), each with tiles, a twist
  and an enemy of its own:
  - *Volcanic*: lava lakes (deadly to drive into), basalt instead of steel (a power shell cracks it, a second breaks
    it), fire vents that erupt every 5 s; twist LAVA BOMBS (marked spots, a blast and burning ground); enemy MAGMA (3
    hits, crosses lava, leaves burning ground).
  - *Swamp*: bog that slows you and sinks you if you stand still (a hit after 3 s), reeds that hide tanks and burn,
    pockets of swamp gas that a shell sets off; twist MARSH GAS (new gas bubbles up); enemy GATOR (hides underwater,
    surfaces and bites).
  - *City ruins*: concrete (3 hits, then rubble), fuel drums, linked manholes, street lamps that light the dark;
    twist BLACKOUT (12 s in the dark, lamps out); enemy ROCKET TRUCK (three rockets at a marked spot).
- **New elements in any stage:** supply crates (points or a power-up), explosive barrels (chain reactions) and
  deflectors that turn shells 90°. The weapons, AI, first-meet cards, online play and the editor (a second palette
  page) all know the new tiles.
- **Night and fog stages are rarer:** one stage in nine (night on 9, 27, 45 ..., fog on 13, 31, 49 ...) instead of
  one in three. Settings → GAME → NIGHT AND FOG: MANY brings back the old rate.
- Fix: saves and online play keep conveyor belts right (two belt directions were written wrongly).

## 0.49.3

- **Title menu:** one PLAYERS row (left/right: 1-4) instead of 1 PLAYER and 2 PLAYERS, and a new order: CONTINUE,
  PLAYERS, MODE, SKILL, SETTINGS, DAILY CHALLENGE, ONLINE, CONSTRUCTION.
- **Settings:** music has its own section (MUSIC, MUSIC STYLE, MUSIC VOLUME); VOLUME and ENGINE SOUND are under SOUND.

## 0.49.2

- The title screen: the brick TANЬ4IKI sits halfway between the score row and the menu (it moves with the menu when
  CONTINUE appears).

## 0.49.1

- **Fix: a black screen at start-up** when GALAXY was the last mode you picked (the title asked the galaxy code for
  its run type before that code had loaded, and start-up stopped). The title no longer depends on it, and the game
  now starts only once every script has loaded.

## 0.49

- **A hard rock and heavy metal soundtrack** (Settings → MUSIC STYLE: ROCK, the default, or CHIPTUNE): 30 tunes in
  the manner of 80s and 90s rock and metal, all written for this game — galloping riffs, palm-muted chugs, power
  chords, twin-guitar harmony leads, double kick, shred solos — for every mode, every boss, every galaxy sector and
  the warning, victory and ending themes. Two distorted rhythm guitars, a lead guitar with bends, vibrato and echo, a
  bass and a full drum kit, synthesised live. Thrash for Survival, speed metal for Time Attack, doom for the Maze,
  prog in 7/8 for Any Side, boogie for Kill Race, metal versions of the galaxy themes, Korobeiniki and Shchedryk.

## 0.48

- **Galaxy: two new sectors before the last one** (14 sectors now; CATS is still the final boss):
  - *12 THE WELL* (Tetris): a well with falling pieces; new waves GARBAGE (grey rows rising from below, each with a
    gap; red arrows warn), LINE CLEAR (a row fills across your zone, flashes, then lasers along its line — shoot it
    open first), T-SPIN (turning T pieces firing three ways), LANCES (I-pieces that aim, then drop); a themed challenge
    stage. Boss THE STACK: a living Tetris stack with a scowling face, NEXT box and LV panel; hard drops, line-clear
    lasers, TETRIS! (four rows), garbage, T-spins, faster every level. Music: Korobeiniki.
  - *13 THE SLOP FEED* (AI slop): a pastel haze, melting stars, drifting watermarks; new waves SIX FINGERS (hands that
    lunge), CHAT BUBBLES (they type "...", then burst into letters), GLITCH CLONES, ENGAGEMENT BAIT (likes and hearts
    that home in). Boss THE SLOP MACHINE: a beaming chatbot in pastel goo — hallucinated copies of earlier bosses,
    walls of text, a six-finger slap, REGENERATING... (shoot the bar in time or it heals), MODEL COLLAPSE in phase 3.
    "CERTAINLY! HERE IS YOUR BOSS FIGHT." Music: upbeat corporate stock music.
- **Galaxy boss pictures:** every galaxy boss (all 14) has a WARNING picture before its fight and a picture of its
  defeat after it, like the tank bosses (BOSS SCREENS setting; ENTER skips; online too).
- **Galaxy bosses back at their old sizes** with the new detail and the extra health kept ("beefier" meant tougher).
- **Fix:** a galaxy boss stalled (its attacks and timers paused) for half of each sway near the top of the screen —
  every boss now keeps up the pressure the whole fight, so they're tougher.
- **Fix:** other modes' stage curtains showed the tank bosses' names on stages 10, 20, 30... (only classic has them).

## 0.47

- **Saving in every mode.** Each mode (and each galaxy run type) has its own slot. Classic and big maps still save
  exactly where you are; every other mode saves a checkpoint at the start of the stage, round, wave, corridor section,
  fortress build phase or galaxy sector (after the hangar), with scores, lives, upgrades, perks and credits. SAVE
  GAME in the pause menu says where you'll resume; autosave at every checkpoint; CONTINUE on the title loads the
  selected mode's save and shows where. Not online, not in the daily challenge, not in player-vs-player matches.
- **Galaxy is much harder on the harder skills.** NIGHTMARE!: enemies and bosses 1.85x hit points, 2.5x fire rate,
  faster shots, more shots on screen, 65% of the small fry's shots aimed at you, 30% less loot (ULTRA-VIOLENCE in
  between). Extra lives every 250K in galaxy when set to EVERY.
- **Galaxy's hangar takes credits**, not points: coins (10), gems (40), a little per kill and boss bounties. Upgrades
  cost more (a full set ~18500 credits, around sector 10) and firepower and rapid fire have 7 levels.
- **Galaxy bosses redrawn**: about 30% bigger, far more detailed (shading, panels, lights, animated parts), with
  visible damage each phase, ~35% more hit points and an extra attack in phase 3. The giant head's hands too.

## 0.46

- **Galaxy: a gameplay overhaul.**
  - *Controls:* tap B to swap between your two weapons, hold B for FOCUS (half speed, your hitbox shown), double-tap
    B for a bomb. A hint shows in sector 1.
  - *Two weapons* carried at once; gift boxes fill the second slot first.
  - *Heat:* about 8 s of nonstop fire overheats the gun; *charge blast:* stop firing for half a second and the gun
    charges a big piercing blast for your next shot.
  - *Team combo* up to x8, *grazing* (points and a bomb meter), screen shake, hit-stop, slow motion when you're hit.
  - *Softer losses:* the two power levels you lose drop as cells you can grab back.
  - *Perks* after waves 2 and 4: pick 1 of 3 capsules (12 kinds: firepower, rapid, engine, magnet, drone, armour,
    bombs, power, crit, luck, start shield, life).
  - *Wave 4* of every sector is a *mini-boss* (gunship, carrier, turret ring, warden) or, in sectors 3/6/9/12, a
    Galaga-style *challenge stage* (40 harmless enemies, PERFECT bonus).
  - *The captor* can steal your ship with a tractor beam; shoot it to get it back as a *twin fighter* that takes a
    hit for you.
  - *Medals* after each wave: NO HIT, SPEED, PERFECT.
  - *Co-op:* your kills' loot is yours for 3 s; a player out of ships leaves an escape pod a teammate can rescue.
  - *New runs:* boss rush, endless and daily, each with its own record (pick them with left/right on the galaxy title
    screen or the first curtain).

## 0.45

- **Galaxy: twelve sectors** (was six): Earth Orbit, Time Vortex, Saturn Rings, Cyberspace, Dark Star and The Last
  Base, each with its own sky (a swirling time tunnel, a ringed planet, a green grid with falling code, a dark sun,
  the walls of a base) and a new boss after a flying thing from a 90s film or game:
  - **City Killer**: a shielded city-sized saucer. Catch the floppy disk to upload a virus, or hit it while it charges
    its city-levelling beam.
  - **Time Car**: 88 MPH, two trails of fire down the screen, then a jump through time. Fans, lightning.
  - **Martian Saucer**: a brain in a dome, four wingmen, ray guns, a tractor beam. ACK ACK! Bombs (the yodel) hurt it
    three times as much.
  - **The Cube**: adapts to the weapon that hurts it most; switch guns. Tractor and cutting beams, hunting cubes.
  - **Giant Head**: hands that slam down at you and shield it, breathes you in, spits tiles; a brain in phase 3.
  - **CATS**: ALL YOUR BASE ARE BELONG TO US. Time bombs to shoot down, MAIN SCREEN TURN ON, fighters.
  - They talk (in a box under them), and the later sectors have their own music: HYPERSPACE, and ALL YOUR BASE for
    the bosses.
- **Seven new waves**, also mixed into sectors 1-6: flying toasters, the bouncing DVD logo (hit a corner for 2000 and
  gems), rush-hour traffic of flying taxis and police cars (arrows warn of each), hunting sentinels, cows flung up
  from below, marching invaders with a mystery ship, falling blocks. New enemies in the later sectors' formations:
  alien fighters, martian saucers, sentinels.
- **Every time round** the sectors' waves are shuffled with a couple of surprises, so the second loop isn't the first
  again. Sectors 7-12 get harder more gently than 1-6.
- When a boss is hit it flickers white instead of staying white under constant fire; a shield's hits don't flash.

## 0.44

- **Galaxy: the boss's loot is yours.** The sector no longer ends while the boss's coins, gems, power cells and
  extra life are still falling. A second after the boss goes down, all of it flies to your ships, faster and
  faster, and the sector ends once it's all picked up (15 s at most). Power cells are shared out one per ship;
  the rest goes to whoever is nearest.

## 0.43

- **Galaxy: every gun has a sound.** The guns were silent (only lightning made a noise). Now: a pew for the blaster,
  a buzzy fan for the spread, a steady hum while the laser is on, a fat throb for plasma, a crackle for lightning, a
  rocket hiss for missiles and a tick for the wingman drones. Hits plink and small ships pop. With 3-4 ships the
  extra players' guns sound every other burst, so it isn't deafening.
- **Galaxy: enemy shots stand out from the loot.** Everything that hurts now glows red with a breathing halo, throbs
  red-magenta and trails smoke behind it: round shots (bigger), rotten eggs, ice shards. Loot twinkles with a gold
  star instead, and gift boxes are blue crates with a ribbon in their weapon's colour (no more red crates).
- **Tank weapons:** the machine gun rattles and missiles hiss off the rack (they used the cannon and mortar sounds).

## 0.42

- **New mode: GALAXY**, a shoot-'em-up in the spirit of the space arcade classics, for 1-4 players (here or online).
  - Your tanks fly at the bottom of a starfield and shoot up at alien waves; B drops a bomb.
  - Six sectors (then round again, tougher), each with six waves and a boss.
  - Waves: formations that dive at you, swarms, asteroid showers, kamikaze drones, bombers and escorts.
  - Weapons with 8 power levels each: blaster, spread, laser, plasma, lightning and missiles. Gift boxes, power
    cells, coins, gems, shields, bombs and extra lives drop.
  - Bosses: Mothership, War Crab, Rock Titan, Frost Queen, Elder Eye and Overmind, three phases each.
  - The hangar between sectors sells firepower, rapid fire, engine, shield, magnet, wingman drones, armour, bombs,
    power, weapons and lives.
  - Its own title picture and music (STARFIGHTER, ALIEN OVERLORD for the bosses); the best sector is kept.

## 0.41

- **Finding the enemy on big maps** (big maps, the corridor, the maze):
  - Arrows at the edge of the screen point to every enemy out of sight (a big gold one for a boss).
  - A minimap in the corner shows the whole map, where you're looking, your team, the enemies, the eagle and the
    objectives. It fades while you drive under it; the maze's has no walls. Settings → SCREEN → MINIMAP.
  - Hidden enemies get no arrow or dot: underground, cloaked, mirages, or in the dark.
- **Enemies left:** the side panel now shows how many enemies are left to beat in all, the ones on the field included,
  by a red target under the reserve icons (in every mode with enemies to count).
- **Baba Galya is Ukrainian.** She grumbles in Ukrainian:
  - "KUDY PO POMYTOMU?!" (where are you going on my clean floor?!)
  - "KHULIHANY!" (hooligans!), "OY LYSHENKO!" (oh, the misery!)
  - "HET ZVIDSY!" (get out of here!), "BODAI TOBI!" (curse you!)
  - "ZACHYNENO! HASHU SVITLO!" (closed! lights out!)
  - "VSE! PIDU DODOMU!" (that's it, I'm going home!)

  She wears an embroidered vyshyvanka collar, keeps a sunflower on the windowsill, and her theme is now SHCHEDRYK,
  Leontovych's Ukrainian carol (Carol of the Bells), in 3/4.

## 0.40

- **Surprise: the UFO is not the last boss.** (Spoilers.) On the stage after it (101 with a boss every 10 stages)
  waits **BABA GALYA**, the old janitor, never happy and always swearing (#@%*!), in a school corridor:
  - **ON DUTY:** she mops as she goes, and the wet floor is as slippery as ice until it dries. Drive on her clean
    floor ("NOT ON MY CLEAN FLOOR!") and a homing slipper comes flying, which you can shoot down. Come too close and
    she swings her mop. Now and then a wall of dirty water from her bucket.
  - **FURIOUS:** two slippers at a time, and she kicks her bucket at you; it rolls, smashing bricks, and spills.
  - **CLOSING TIME:** "WE'RE CLOSED! LIGHTS OUT!": the lights go off, only her glasses glint, and three slippers fly
    at a time.
  - She doesn't blow up: beaten, she goes home ("FINE! I'M GOING HOME!"), and you have beaten the game.
  - Her own screens: the intro reads "THE REAL FINAL BOSS"; the victory screen shows her with a glass of tea:
    "SHE'LL BE BACK ON MONDAY".
  - Her own music, faster in her last phase.
  - The stage curtain only says "BOSS: ???".
- The font gets # and @.

## 0.39

- **Boss screens.** Before every boss there's a picture of it in its own scenery: the Iron Bear smashing through a
  wall at sunset, the Mole drilling up under your tank, the Harvester racing through wheat, the Hydra in a storm,
  the Gunship over a night city, the Phantom in a foggy forest, the Armored Train out of a tunnel, the Scorpion in the
  desert, the Dreadnought under a burning sky, the UFO beaming up a tank. Each has its name and two lines on how it
  fights. After it falls there's a victory picture: the wreck, your tank with a flag, the points (the UFO's pilot
  waves a white flag). Settings → GAME → BOSS SCREENS.
- **Boss music:** WARNING! on the boss picture; IRON FIST (Iron Bear, Mole, Harvester, Train), DEEP WATERS (Hydra,
  Phantom, Scorpion), WAR MACHINE (Gunship, Dreadnought) and CLOSE ENCOUNTER (UFO) during the fights, 15% faster in a
  boss's last phase; THE EARTH IS SAVED after the UFO.
- The Harvester's and UFO's arenas have brick cover over the eagle (a tank could drive straight down and shoot it).

## 0.38

- **Boss phases.** Every boss now has three phases by the HP it has left (marked on the HP bar). At each change it
  reels, the phase is named ("IRON BEAR: BERSERK"), its hull shows the damage (scorched, holed, parts torn off, smoke,
  then fire) and it fights differently:
  - **Iron Bear:** charges twice in a row, then loses its ram plate and stomps out rings of shells.
  - **Mole:** pops up twice, then its drill snaps and the ground bursts up under you.
  - **Hydra:** regrows a lost head once, then its bare core swings wide firing lasers.
  - **Phantom:** its decoys fire, then the cloak breaks and it blinks to spots lined up with you, firing three at once.
  - **Dreadnought:** loses a cannon, then the hatch blows and the reactor shows.
- **The bosses are redrawn** with much more detail: outlines, lights, rivets, exhausts, grilles, claws, scales.
- **Five new bosses** (ten in all; the UFO comes on stage 100 by default):
  - **Harvester:** a racing combine harvester that rams, mows trees and bricks and drops hay bales, then flings sheaves,
    then burns.
  - **Gunship:** a helicopter that flies over everything, with gun bursts and rockets, then paratroopers, then a burning
    carpet-bombing run.
  - **Armored Train:** runs on two tracks with signals and a whistle; cannon, rocket and troop wagons; once the wagons
    are wrecked the engine jumps the rails.
  - **Scorpion:** walks over walls and water; its sting lobs shells at you from afar; it pinches with its claws and
    leaves venom pools.
  - **UFO, the final boss:** plasma rings and a tractor beam that abducts tanks, then a force field and drones. It
    crash-lands and the alien pilot climbs out with a ray gun.
- New sounds: the phase change, rotor blades, the train whistle, the saucer's warble and the tractor beam.
- Bosses that aim at you (gunship, UFO, alien) don't fire through your eagle.

## 0.37

- **Weapons.** Six new player weapons, each with four levels (MK I – IV): **machine gun** (hold fire: a stream of
  bullets, twin from MK III), **laser** (an instant beam through every tank in line that burns shells, cuts brick from
  MK II, wide and endless at MK IV), **flamethrower** (a cone of fire that burns tanks, trees and shells), **mortar**
  (shells over walls, a blast; steel at MK IV), **tesla** (lightning to the nearest enemy, jumping on to more) and
  **missiles** (homing, over walls, up to 3 at once). They come from the new WEAPON crate power-up (the letter on it
  says which; the weapon you have raises its level) and from the shop, where the cannon is free to take back. The
  weapon in hand shows in the left border. Losing a tank costs a level.
- **Balance:** measured with a bot over whole stages, MK I is about the bare cannon and MK IV about a 3-star cannon,
  so the difficulty curve holds; the laser and the flamethrower stop enemy shells (as cannon shells do).
- **RESTART ROUND** in the pause menu (press twice): the stage again, with score, lives and weapons as they were at its
  start. Fortress: **RESTART WAVE**, back to the build phase before the current wave.

## 0.36

- **Secrets, platformer style.** A few brick blocks on each stage hide a power-up (break most of the block and it pops
  out; a wall hiding something glints now and then). Now and then a golden **? block** takes a brick block's place:
  shoot it for coins (200 each, up to 8, then it's an empty block), or, from a mushroom block, a **mushroom** that
  grows out, walks to your eagle and guards it to the end of the stage, bouncing every shell aimed at it. With the
  coin and power-up sounds you'd expect. In the classic game and the modes where it makes sense (not versus,
  Fortress or boss stages); Settings → GAME → SECRETS.

## 0.35

- **FORTRESS is much harder.** Tanks that reach the fortress ram it and blow up (1-6 eagle HP); heavy tanks stop to
  shell towers lined up with them; BOSS waves bring titans (huge armored tanks, immune to stuns, half-immune to
  slowing); waves are bigger (up to 60, swarms 80), toughen faster and speed up; gold is tighter (less per kill and
  per wave, 3% interest up to 25, 200 to start on Hurt me plenty). Easier skills keep more gold and weaker tanks.
- **More upgrade levels:** combat towers have 4 levels, then a specialisation with 3 tiers (7 steps); tier III adds a
  trick (armor shred, critical hits, stunning blasts, 8 bomblets, 16 chains, longer stuns, freezing, triple damage,
  afterburn, wider napalm, 6-rocket salvos, buster blasts). Radar and gold mine have 5 levels. The range circle
  previews the next upgrade.
- **More levels:** a campaign of 8 maps (Meadow, Canyon, Spiral, River, Islands, Crossroads, Twin Gates, Gauntlet),
  25 to 50 waves each, each with its own season; winning a map opens the next.
- A tank wedged somewhere for 20 s goes back to an entry point, so a wave can't stall.

## 0.34

- **New mode: FORTRESS (tower defense).** Hold your eagle through 30 waves on one of four maps (Meadow, River,
  Canyon, Crossroads). Your tank builds: B opens a menu for the tile in front of you. 8 towers (gun, cannon, tesla,
  frost, flamer, rockets, radar, gold mine), 3 levels each, and 2 specialisations at the top for 6 of them (gatling /
  sniper, howitzer / cluster, storm / EMP, blizzard / shatter, inferno / napalm, swarm / buster). Brick and steel
  walls to reroute the enemy (never shutting the way), targeting (first / last / strong / close), repair and sell,
  air strike and wingman abilities, gold for kills, waves, interest and calling waves early, themed and boss waves,
  a next-wave preview, entries that open as the waves go on, eagle HP and 1-3 stars per map, 1x/2x/3x speed in the
  pause menu. Its own title screen and tune (Hold the Line). 1-4 players together, online too.
- **New mode: CO-OP VS CPU:** up to four players together against the enemy HQ.

## 0.33

- **Maze walls can't be broken:** in MAZE the steel walls now stop everything (power shells, rockets, piercing
  shells, blasts and air strikes); only the odd brick stretch can still be shot through as a shortcut.
- **Bigger mazes, more enemies:** 17 x 11 cells to start (was 11 x 7), growing by 3 x 2 each maze up to 34 x 22 (was
  24 x 16); 26 enemies in the first maze and 6 more each time, up to 100 (was 13 and 3 more), half of them waiting
  from the start and up to 5 more on the field at once.
- **Music in the pause menu:** MUSIC (on/off) and MUSIC VOL rows, changed with left/right; the music keeps playing
  while one of them is selected so you can hear the change.
- Faster terrain drawing: a broken brick (or any single change) now redraws just its cells instead of the whole
  map, which matters on the big maps and mazes.

## 0.32

- **Seasons with their own rules and enemies.** Every season now has a twist and an enemy found nowhere else:
  - Spring: **showers** leave puddles of mud for a while; the **Hopper** jumps over thin walls and water.
  - Summer: **wildfire**: explosions (and the heat) set trees ablaze, fire spreads and burns tanks; the **Firebug**'s
    shells start fires and it can't burn.
  - Autumn: **gusts** shove every tank one way for a few seconds; the **Guster**'s fan blows you backwards.
  - Winter: **blizzards** (whiteouts, the enemy fires less); the **Frost** tank's shells freeze you solid, and a
    second hit shatters you.
  - Nuclear winter: radioactive **hot spots** fill your Geiger counter until your tank goes; the **Ghoul** rises from
    its wreck unless you shoot it.
  - Desert: **mirages**, phantom tanks that vanish at a touch; the **Burrower** dives under the sand and surfaces
    elsewhere to fire.
  The stage curtain names the twist. Radiation and fire are gentler on easier skills. Settings → GAME → SEASON
  EFFECTS (on/off); each new enemy has its own page in ENEMY TYPES. Works in every mode and online.

## 0.31

- **Turrets where you want them:** the TURRET power-up no longer drops its turret on the spot; it goes into the
  turrets you carry, and **B** puts it down wherever you are.
- **Fix: not being able to shoot in the corridor.** When the corridor dropped its bottom section, any shell down
  there was thrown away without being handed back to its tank, so the tank counted it as still flying and could never
  fire again. Also, on any map bigger than the screen (corridor, big maps, maze) a shell now goes no further than
  about a screen's length, instead of flying on out of sight until it hits something far away.

## 0.30

- **New mode: MAZE.** A huge labyrinth, generated fresh every stage and bigger each time. Start in the bottom-left
  corner and find the one exit, a chequered gate on the far edge. Steel walls with a few brick stretches to shoot
  through, trees and ice in some passages; enemy patrols along the way that come for you when you get close, and more
  turning up out of sight. Lost for too long and the exit sends a signal (a marker at the edge of the screen). Getting
  out pays 2000 plus a time bonus and clears the maze of enemies; then the tally, the shop and a bigger maze. Lost
  tanks come back where they were a few seconds before. Its own title screen and tune (Lost in the Labyrinth).
- Fix: in modes without an eagle (kill race, deathmatch, maze) the free repair crew of the easier skills could
  rebuild the eagle's fortress walls out of nowhere.

## 0.29

- **Shop trimmed:** SMOKE and BRIDGE KIT are gone from the shop (both are still power-ups on the field), and the RADAR
  base upgrade is gone.
- **Eagle gun toned down:** it fires every 3 s at level 1 down to every 1.3 s at level 5 (was 1.8 s → 0.6 s), reaches
  4 → 8 tiles (was 6 → 15), its shells are slower, steel-breaking shells come only at level 5 and the exploding shells
  are gone. Prices 6000 – 20000 (were 5000 – 16000). The enemy HQ's gun in VS CPU is unchanged.
- **Skip the score tally:** Enter (or fire) after a stage shows the whole tally at once; press it again to go straight
  on. Left alone it runs as before. The VS round result can be skipped sooner too.
- **Victory music:** beat a boss and VICTORY!, a fanfare in a major key, plays on through the score tally (each skill
  plays it at its own tempo and with its own band).

## 0.28

- **Mode title screens:** starting a game shows a pixel-art picture for its mode before the first stage: the eagle's
  fortress under attack (classic), a blueprint with tiles going down (custom levels), waves closing in under a red
  sky (survival), a stopwatch and the chequered line (time attack), a scrolling map under a radar sweep (big maps),
  a field with an eagle on every edge (any side), the map rolling past a climbing tank (corridor), four tanks racing
  for the cup (kill race), eagle against eagle with lightning (VS eagles), a skull and crossed cannons (deathmatch),
  a flag being run home (flags) and an old computer with a face (VS CPU). Enter moves on, Esc goes back; it moves on
  by itself after 8 s. Not in the daily challenge or when testing a level. Settings → GAME → MODE TITLE SCREENS.
- **Soundtrack:** a chiptune for every mode (two pulse leads, triangle bass, noise drums), each with its own melody,
  key, tempo and groove, in a version for every skill: major and unhurried on I'M TOO YOUNG TO DIE, mixolydian with
  a harmony, dorian with full drums, harmonic minor with racing arpeggios, phrygian dominant at full speed with a
  shadow voice and double kicks on NIGHTMARE!. It plays on the title screen and during stages (after the start
  jingle), pauses with the game, follows AUTO as it moves, and goes round a four-part cycle (the tune, a drum fill,
  an answer phrase, the tune an octave up). Settings → GAME → MUSIC and MUSIC VOLUME.

## 0.27

- **Seasons:** every stage has one of six: spring (blossom, petals), summer (deep green, fireflies), autumn (orange
  trees, falling leaves), winter (snow on everything, snowfall, most lakes frozen to ice), nuclear winter (ash, dead
  trees, toxic water, some lakes frozen) and desert (sand, sandstone, cacti, ponds dried into mud). A new one every
  stage by default; Settings → GAME → SEASONS for random, off or a fixed one.
- **Level editor upgraded:** a clickable palette with every terrain (now with bridges), drag painting, a **random
  level** generator (symmetric, checked so every entry point and both players can reach the eagle), 8 save slots,
  a season per level, and a help screen.
- **Custom levels mode:** plays every filled editor slot in turn, as a full game.
- **Any side mode:** the eagle sits on the left, right or top edge (a new one each stage), players start beside it,
  enemies come from the edge across; base upgrades, minefield, eagle gun and supply drops turn with it.
- Air strikes no longer assume the eagle is at the bottom.

## 0.26

- **Skill during the game:** the side panel shows the current skill (ITY / NTR / HMP / UV / NM, coloured; on AUTO the
  level it's at under a small AUTO), and the pause menu has a SKILL row to change it on the spot (not in the daily
  challenge).
- **Settings in submenus:** the long settings list is now a short top level of sections (PLAYER, XP AND LEVELS,
  ENEMIES, ENEMY TYPES, POWER-UPS, WHO CAN COLLECT, BOSSES, SHOP, SCREEN, GAME, RESET, BACK); each opens as its own
  page, and ENEMY TYPES opens a page per enemy. Esc / left / BACK go up a level.
- Fix: the settings footer crashed drawing the four classic tanks' pictures.

## 0.25

- **Fix: enemy tanks getting stuck,** often nose to nose. Slow tanks only step every other frame, and on the frames in
  between they counted as "not blocked", so they never got round to turning away. Now a blocked tank turns only to a
  way that's open, and when two tanks block each other one of them steps aside and lets the other pass. In a
  measurement over ~2.7 hours of enemy driving, stuck tanks went from about 200 cases to 3.
- **Fix: the base minefield on ice.** Mines were only laid on open ground or trees, never on ice (or mud, bridges and
  belts); now any drivable ground works, with a third row of spots. Your own mines are drawn over trees too.
- **Night vision:** on night stages every second power-up is NIGHT VISION (goggles): the whole team sees the whole
  field for 20 s. Players only; off with the rest in the power-up settings.
- **Short-range enemies are tougher:** the flamer takes 6 hits (was 2) and the snake 16 (was 10). Tough enemies show
  a small health bar once hit. Saved settings still on the old defaults move to the new ones.
- Rebalanced to go with the unstuck tanks: NOT TOO ROUGH gets a faster free repair crew and fewer eagle-hunters.

## 0.24

- **Kill race:** enemy tanks now appear at random free spots all over the map (open ground, never within 4 tiles of a
  player, never on a teleporter pad) instead of only along the top.

## 0.23

- **Difficulty rebalance**, measured with simulated games (how long an undefended eagle lasts, and how a computer
  player fares). The biggest problem: enemies lined up with the eagle or with you fired on purpose from *any*
  distance, so on maps with an open centre the eagle could fall in 5-20 seconds even on the easiest skill. Now each
  skill has a sight range (easiest 4 tiles for you / 2½ for the eagle, default 11 / 7, the two hardest unlimited).
  Undefended, the eagle now lasts about 2½-4 minutes on the easiest skill, 1-2½ on NOT TOO ROUGH and ½-2 on the default.
- Easy skills also get: a free repair crew for the fortress, more eagle armour (3 / 2), a longer spawn shield, fewer
  tanks that rush the eagle, enemies that can't take power-ups (easiest) or the grenade, clock and shovel (NOT TOO
  ROUGH), slower bosses, and a slower-growing enemy HQ in VS CPU. Corridor and kill race enemies wander more on easy
  skills. AUTO blends all of it.
- Deathmatch and kill-race bots never shoot towards their own eagle or into its fortress.

## 0.22

- **Kill race mode:** no eagles; each round the player who destroys the most enemy tanks scores a point (ties go to
  points scored, then nobody). The points needed to win are picked on the first round's curtain (1-10). Players
  respawn instead of losing lives. Alone you race 3 bots that hunt the enemy tanks. Online too.
- Enemies never pick the "rush the eagle" personality where there's no eagle (kill race, corridor), and the shovel no
  longer builds walls around a missing eagle.

## 0.21

- **VS EAGLES against the computer:** start VS EAGLES with 1 player to play VS CPU. Their HQ is at the top, its tanks
  keep coming until you destroy it; that wins the round (tally, shop, next round on a new map). The enemy HQ upgrades a
  little every round: repair crew, walls, armor, eagle gun, minefield, tesla coil, tank traps, each up to level 5,
  listed on the round curtain. Best rounds won is kept.
- **Deathmatch against bots:** start DEATHMATCH with 1 player to fight 3 computer bots that path-find, aim, grab
  power-ups and fight each other too.
- **Fix:** mines were nearly invisible on ice (their grey spikes matched the ice); they now have a black edge.

## 0.20

- **Claude upgrades:** CLAUDE LEVEL in the shop (5 levels, team-wide, kept between stages and in saves): stays
  longer, moves faster, bigger bites, spits sparks at lined-up tanks, and at level 5 comes to every stage by itself.
  Upgraded Claudes show level pips and a golden glow.
- **Corridor:** enemy variety now grows slowly with the climb: basic tanks first, the classic four by 45 tiles, then the
  newer types one at a time every 20 tiles, each starting rare; veterans and elites higher up. "NAME AHEAD!" announces
  each newcomer. (Before, every enemy in a section was the same type and the newer types never appeared.)
- **Points for wrecking things:** bricks (10 a shot), steel (50 a block), trees (20), enemy turrets (300) and enemy
  shells shot down (20).
- **Late power-ups carry over:** timed power-ups picked up in the last 10 seconds of a stage come with you to the next
  one, twice as long.
- **Fix:** the ESC pause menu was drawn off screen in corridor and big-map stages.

## 0.19

- **First-meet cards:** the first time each enemy, boss or power-up appears, a one-line card slides down at the top of
  the field ("NEW: JAMMER - SLOWS YOUR SHELLS NEARBY"); long lines scroll. Remembered between games; can be turned off
  or reset in Settings → GAME; online guests see them too.
- **Fix: shopping lowered your high score.** Spending in the shop (and paying for revivals) now comes out of a separate
  "points to spend" amount; your score keeps every point earned, so buying a wingman no longer costs you the high
  score. Older saves load fine.
- **Fix: BOSS RUSH often did nothing.** A boss rush daily now starts one stage before a boss stage, so its 3 stages
  always include a boss.
- **Fix: daily twists cancelling out.** Twists that set the same thing differently (NIGHT SHIFT / EASY RIDER, LIGHTS
  OUT / PEA SOUP, GLASS CANNON / EASY RIDER) are no longer drawn together.
- Corridor: power-ups appear on screen instead of anywhere in the stacked world.

## 0.18

- **Corridor mode:** the usual width, endless height. Climb as far as you can while enemies keep arriving from above,
  faster and tougher the higher you get. Sections drop away below and fresh ones (random classic maps) appear on top
  once the whole team has moved up; every 5 sections everyone gets a tank. No eagle; the best climb is kept and shown on
  the title screen. Works with 1-4 players, locally or online.

## 0.17

- **AUTO skill:** a sixth skill that adjusts enemy strength to how you play. A rating from 0 to 4 rises with kills and
  cleared stages (more for clean ones) and falls with lost tanks, eagle hits and game overs; the enemies' numbers blend
  between the two nearest skills. Remembered between games; shown on the title screen and stage curtain.

## 0.16

- **Big scrolling maps:** several classic maps stitched into one world (3 x 2 or more) that scrolls with your tanks, with
  twice the enemies and an objective: hold two **outposts** beside your HQ (bonus for each one standing), or destroy
  three enemy **factories** that keep producing tanks. Edge arrows point to off-screen objectives. New mode BIG MAPS
  (every stage big), and a Classic setting BIG MAP STAGES (every 4th stage; off by default). Saves and online play
  keep the scrolling view.

## 0.15

- **Game modes** on the title screen's MODE row: Survival (endless escalating waves, best wave kept), Time attack
  (clear stages 1-5 against the clock, best time kept), and three versus modes for 2-4 players, locally or online:
  VS eagles (defend your eagle, destroy theirs, best of 3 rounds), Deathmatch (first to 10 kills or most in 3 minutes)
  and Flags (capture the flag, first to 3).

## 0.14

- **New terrain:** mud (half speed), conveyor belts (carry tanks along) and teleporter pads (linked pairs; tanks and
  shells come out of the twin). They appear in the normal stages (mud from 3, teleporters from 5, belts from 8), placed
  the same way each time, and can be painted in CONSTRUCTION. Setting: MUD, BELTS, PADS.
- **Night and fog stages:** every 6th stage from 6 is a night stage, lit only around your tanks, the eagle, shots and
  explosions; every 6th from 9 is foggy. Setting: NIGHT AND FOG (some / off / all night / all fog). New daily twists:
  LIGHTS OUT and PEA SOUP.

## 0.13

- **Easier easy skills:** I'M TOO YOUNG TO DIE now gives 3 extra tanks, a free armour plate every life, 2 free eagle
  armour each stage, one enemy fewer on screen, enemies that mostly wander and rarely shoot, new enemy types much later
  and rarer, and no veterans. HEY, NOT TOO ROUGH is gentler too, and HURT ME PLENTY a little calmer.
- **Base upgrades:** 5 levels for walls, eagle armor, repair crew, eagle gun (steel-breaking, then exploding shells) and
  minefield, plus four new ones: Tesla coil, Tank traps, Supply drop and Radar. They stay from stage to stage until
  game over.
- **Wingman** (AI ally tank), **Decoy eagle**, **Smoke** screen (power-up and shop), **Bridge kits** (power-up and shop;
  drive into water to lay a bridge) and a **Daily challenge** mode on the title screen.

## 0.12

- **Skill levels named as in DOOM**, picked on the title screen: I'M TOO YOUNG TO DIE, HEY, NOT TOO ROUGH, HURT ME
  PLENTY (default, the game as before), ULTRA-VIOLENCE and NIGHTMARE! (where destroyed enemies may come back). They
  scale enemy fire, speed, shells, arrival rate, aggression, boss HP, when veterans appear, and your starting tanks.
- **Snake** (from stage 13): a long green snake that moves fast, never shoots, slithers through brick, takes 10 hits
  on the head (its body stops shells) and eats your tank if it reaches you, growing longer.

## 0.11

- **Revival:** a fallen player presses FIRE to come back for 7500 points (theirs, or a teammate's); when the last tank
  falls there's a 5-second LAST CHANCE before GAME OVER; between stages fallen players get a shop turn to buy REVIVE.
  Setting: REVIVE COST.
- **Turrets:** bought in the shop and placed anywhere with B, or dropped by the new TURRET power-up. They turn towards
  the nearest enemy and shoot; enemies who grab the power-up get a red turret.
- **Claude:** the orange Claude sparkle (power-up, or 6000 in the shop) wanders the field for 20 s, chirping, and eats
  enemy tanks and shells it bumps into.
- **New power-ups:** TURRET, CLAUDE, REVIVE (fallen players back, or an extra life) and AIRSTRIKE (a plane bombs the
  busiest row).

## 0.10

- **Base upgrades** in the between-stage shop, shared by the team and kept until game over: Base walls (extra brick
  ring / steel corners / full steel ring), Eagle armor (survives 1-3 hits per stage), Repair crew (rebuilds the
  fortress every 10 / 6 / 3 s), Eagle gun (a turret on the eagle shoots enemies lined up with it) and Minefield
  (2 / 4 / 6 mines in front of the fortress). Three levels each, with their own orange shop icons. Setting: BASE UPGRADES.

## 0.9

- **Eight more enemy tanks** from the *Tank 1990 New Enemies* design canvas, each with its own sprite: Skimmer
  (stage 6, crosses water), Flamer (9, flame jet that burns trees and hurts everything it touches), Mason (12, rebuilds
  shot-away bricks), Splitter (14, splits into two minis that rush the eagle), Medic (17, repairs and shields other
  enemies), Mortar (19, lobs shells over walls with a 1.5 s crosshair warning), Jammer (21, slows your shells and
  pauses your power-ups in its field) and Spotter (23, marks you so every enemy hunts you).
- Every new enemy type has an APPEARS on/off setting.
- The first few stages have fewer rushing and hunting enemies; the full mix arrives by stage 5.

## 0.8

- **Enemy personalities:** every enemy now wanders, rushes the eagle, hunts the nearest player or snipes from a
  distance, using a path map that knows bricks can be shot through but steel and water can't. The mix depends on the
  tank type, and later stages bring fewer wanderers. Settings: AI PERSONALITIES (mixed / classic / rush / hunt / snipe),
  SHOW AI TYPE.
- **New enemy tanks**, each with its own look and colours: Rocket (from stage 4, area-blast rockets), Sapper (7, crushes
  bricks, lays mines), Shield (11, front plate bounces shells), Shade (15, nearly invisible). They take a growing share
  of later stages. Settings: NEW ENEMY TYPES (off / few / normal / many) and speed, shell speed and hits for each.
  The score tally has a NEW row for them.
- **Veterans and elites:** from stage 10 (veterans) and 20 (elites), some enemies get extra hits and faster shells,
  movement and fire, worth more XP, and wear rank stripes. Setting: VETERANS + ELITES.
- The stage picker remembers the stage you last played and lets you pick any stage up to the furthest one you reached.

## 0.7

- **XP and levels:** players earn XP for kills, power-ups, stage clears and boss damage, and climb 10 ranks
  (Recruit → Marshal). Each rank adds a perk — faster engine, reload and shells, armor plates that soak hits,
  a free star every life, self-repairing plates — and changes the tank's look: deck stripes, antennas, steel skirts,
  gold trim, a turret star and, for a Marshal, a golden glow. Level-up fanfare and banner, level and XP bar in the side
  panel, XP per stage on the score tally. New settings section XP AND LEVELS with a ranks-and-perks screen.
  Levels are kept in saves and shown to online guests.
- Title screen: the version moved to the top row next to the hi-score; the name line at the bottom is gone.

## 0.6

- **Online play** (peer-to-peer, no game server): title → ONLINE: HOST / JOIN. The host builds the line-up
  (online friends and players on the host's keyboard, up to 4) and swaps a pair of copy-paste codes with each friend.
  The host runs the game; guests send their buttons and see the host's game redrawn about 30 times a second,
  with its sounds. Guests pick their own items in the shop; a dropped guest's tank waits and can rejoin from the
  pause menu (ONLINE PLAYERS). Codes carry the game version. Works in the downloaded file or a hosted copy,
  not on the claude.ai link.

## 0.5

- **Up to 4 players:** the title's player row picks 2, 3 or 4 with left/right. Players III and IV spawn in the
  bottom-left and bottom-right corners and have their own colours (Settings: III / IV-PLAYER COLOR).
  One-keyboard layout for 3-4 players: P1 WASD, P2 arrows, P3 IJKL (fire U, mines O), P4 TFGH or numpad (fire R, mines Y).
  The side panel, score tally (one column per player, 1000 bonus for the most kills) and shop handle 4 players;
  more enemies on screen and tougher bosses with more players. Saves keep the player count.
- **Gamepads (USB or Bluetooth):** one pad per player in order; D-pad on non-standard pads (hat switch / axes) is read
  too; on-screen notice when a pad connects or disconnects; rumble when you're hit (Settings → GAMEPAD RUMBLE).
- **Key and pad setup:** Settings → SET UP KEYS AND PADS. Two keys per action for each player (up, down, left,
  right, fire, B/mines) and the gamepad buttons for fire, B/mines, pause and back. Select a slot, press A, then press
  the new key or button; Delete clears a slot; a key can only do one thing. Saved in the browser, with resets.

## 0.4

- **Boss rounds:** every 10th stage is a boss stage with escort tanks. Five bosses, then they repeat tougher (+50% HP per loop):
  IRON BEAR (10), MOLE (20), HYDRA (30), PHANTOM (40), DREADNOUGHT (50). Each has its own arena, warning-flashed
  big attacks, an angrier second half, power-up drops at 75/50/25% HP, a big score bonus and a 25% shop discount after.
  Boss HP bar in the side panel; boss HP +50% in 2-player games.
  Settings → BOSSES: boss rounds on/off, boss every N stages, boss HP.
- **Mac control scheme:** Settings → SCREEN → CONTROLS (AUTO / PC / MAC). On a Mac, player 2 fires with right Option,
  right Shift, `/` `.` `,` and drops mines with `;` `'` `L`. The help line shows the active scheme.

## 0.3.1

- Title screen shows the game's name **TANЬ4IKI** in brick letters (was "TANK 1990"); the pixel font gained a `Ь` glyph.
- App and file name is now **tanb4iki** (download `dist/tanb4iki_v0.3.1.html`, browser tab `tanb4iki_v0.3.1`).

## 0.3

- **Field size setting:** width 13–60 and height 13–40 tiles (classic 13×13), or **FIT** to size the field to
  the window's shape. Stages are extended to bigger fields by mirroring them outwards, with the eagle kept at the bottom centre;
  wide fields get extra enemy entry points.
- **Fit to screen:** one-click *FIT TO MY SCREEN* (FIT width + FILL scaling + fullscreen), a **SCALING** setting
  (SHARP whole-pixel or FILL), and fullscreen from Settings or by double-clicking the game.
- **Save and load:** pause menu with CONTINUE / SAVE GAME / QUIT; the game also autosaves at every stage start.
  **CONTINUE** on the title screen resumes the saved game mid-stage, at the field size it was saved with.
- **Enemies per stage:** any number from 1 to 99 (max on screen up to 20). The side panel shows the count when more than 20 are waiting.
- Esc / P now resume from the pause menu; quitting is the menu's QUIT item.

## 0.2

- **Shop between stages:** spend your score on extra lives, stars, the gun, the ship, mines, a shovel charge
  (steel fortress at the start of the next stage), or a start kit: helmet, turbo, rapid, spread, rocket or pierce.
  In 2-player games each player shops in turn. Settings: shop on/off, price scale.
- **Versioning:** app name and version `tanb4iki_v0.2` on the title screen and in the browser tab; versioned download file.

## 0.1

First playable release (no version number at the time):

- Tank 1990 remake: 35 stages, 4 enemy types, 2-player co-op, construction mode, score tally, hi-score.
- Original-style sprites and an NES-style sound synth tuned against the original effects.
- Settings screen: lives, tank colors, speeds, enemy strength, power-up durations, game speed, volume.
- Power-up rules per item (anyone / player only / off) and 8 new power-ups:
  turbo, rapid, spread, pierce, rocket, mines, ghost, coin.
- Single-file HTML build.
