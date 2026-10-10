# TANЬ4IKI (tanb4iki) — Tank 1990 browser replica

**Current version: 0.6** (see [CHANGELOG.md](CHANGELOG.md)). The title screen shows the name **TANЬ4IKI** and the version as `tanb4iki_v0.6`.

A from-scratch browser remake of **Tank 1990**, the NES/Famicom variant of Battle City.
It's plain HTML5 Canvas and JavaScript with no dependencies and no build step. Sprites are
stored as 16×16 palette bitmaps in code, matching the NES originals. Sound comes from a small 2A03-style synth
(pulse waves and 1-bit LFSR noise), tuned against the original effects for pitch, timing and noise rate.

## Play

Open `index.html` in any modern browser. Double-clicking the file works too, because no server is needed.
You can also serve the folder (`python3 -m http.server`) or publish it with GitHub Pages.

**Single-file download:** [`dist/tanb4iki_v0.6.html`](dist/tanb4iki_v0.6.html) is the whole game in one HTML file,
which you can save anywhere and open offline. To regenerate it after changing the code, run `node tools/build.js`;
the file is named after the version in `js/version.js`.

### Controls

| | Player 1 | Player 2 |
|---|---|---|
| 1-player game | Arrows **or** WASD, fire with Space / Z / X / J / K / F, **B** button: B / C / N / Left Shift | — |
| 2-player game | WASD, fire with Space / F / G / V, **B** button: B / C / H | Arrows, fire with Right Ctrl / Right Shift / Numpad 0 / L / `/`, **B** button: Numpad 1 / K / `;` |
| Start / pause | Enter / P / Esc opens the pause menu (CONTINUE / SKILL / MUSIC / MUSIC VOL / SAVE GAME / QUIT; left/right change skill, music and its volume, and the music keeps playing while you set it); P or Esc resumes | |
| Fullscreen | double-click the game, or Settings → SCREEN | |
| Mute | M | |

| 3-4 players | P1 WASD, fire Space/V, mines C/B · P2 arrows, fire right Shift/Ctrl/Option or `/` `.`, mines `'` `;` · P3 IJKL, fire U, mines O · P4 TFGH or numpad 8/4/5/6, fire R or numpad 0, mines Y | |

Pick 2, 3 or 4 players on the title screen with left/right on the player row. Players III and IV start in the bottom corners.

In the maze, each player can drop markers on the map: player I **Q** or **E**, player II **]**, **\\**, numpad 2 or numpad +,
player III **8** or **9**, player IV **5** or **6**, or either stick button (L3 / R3) on a gamepad (see *Maze*).

**Gamepads** (USB or Bluetooth) work in every mode: pad 1 controls player I, pad 2 player II, and so on
(in a 1-player game every pad controls player I). Press any button on a pad once so the browser reports it.
A notice appears when a pad connects or disconnects, and pads that support it rumble when you're hit.

**See the keys:** the **CONTROLS** page, in the pause menu (the keys of the players in the game, and what the mode
adds: Counter-Strike's orders and scoreboard, Galaxy's bomb, what B does) and in Settings → SCREEN → **SHOW CONTROLS**
(every layout: left/right for one player, two, or three and four). It reads the keys in use, your own set-ups too.

**Change any key or button:** Settings → SCREEN → **SET UP KEYS AND PADS**. Choose a player, select a slot, press A,
then press the new key (or a gamepad button for the pad rows). Each action has two key slots; Delete clears a slot; Esc cancels.
A key can only do one thing, so assigning it takes it away from wherever it was. Custom keys for a player apply in every mode.

**On a Mac** (Settings → SCREEN → CONTROLS, picked automatically on Apple devices) player 2 fires with **right ⌥ Option**,
right ⇧ Shift, `/`, `.` or `,` and drops mines with `;`, `'` or `L`, because MacBooks have no right Ctrl or numpad.
Return pauses, ⌃⌘F or a double-click toggles fullscreen, and fn+delete clears the map in Construction.

The **B** button drops a mine while you carry mines; otherwise it fires, like on the NES.
The game supports up to two gamepads (standard mapping). On phones and tablets, a D-pad and
fire buttons appear on screen.

## Features

- **Title screen** with brick lettering, a saved hi-score and the menu: CONTINUE (when the picked mode has a save),
  PLAYERS (left/right: 1-4), MODE, SKILL, SETTINGS, DAILY CHALLENGE, ONLINE, CONSTRUCTION.
- **35 stages**. Stage 1 recreates the classic Tank 1990 field. After stage 35 the game loops
  with tougher enemy line-ups. Before the first stage you can pick any stage on the grey "STAGE" curtain.
- **Terrain:** bricks break away in 4 px strips, steel needs a star-3 tank, water needs the ship,
  forest hides tanks, and tanks slide on ice.
- **Player upgrades (stars):** fast shells → two shells → steel-breaking shells. A star at max level also
  lets you cut down forest.
- **All Tank 1990 power-ups:**
  helmet (shield), clock (freeze enemies), shovel (steel fortress around the eagle, which flashes
  before it reverts), star, grenade (destroy every enemy on screen), tank (extra life),
  **gun** (instant max level plus tree cutting) and **ship** (cross water, and the boat absorbs one hit).
- **Enemies can grab power-ups**, as in Tank 1990. They get shields, freeze you, strip
  the eagle's walls, armor up, gain steel-breaking shells, take to the water, or set off a grenade on you.
- **4 enemy types:** basic, fast, power (fast shells) and armor (4 hits, changes color
  as it's damaged). The 4th, 11th and 18th enemies flash red and drop a power-up when hit.
- 20 enemies per stage, with at most 4 on screen (6 in 2-player). The enemy reserve is shown in the side panel (an
  icon per tank still to come), and under it, by a red target, how many enemies are left to beat in all, the ones on
  the field included.
- **2-player co-op:** friendly fire briefly freezes your partner, and the player with more kills
  in a stage earns a 1000-point bonus.
- Spawn sparkles, shields, explosions, score pop-ups, the rising "GAME OVER", the tallied score screen
  and the big brick "GAME OVER" screen.
- An extra life at 20,000 points.
- **Construction mode** (the level editor): see *Construction and custom levels* below.
- Chiptune sound effects, engine hum and a soundtrack for every mode and skill, made with Web Audio; a pixel-art title screen for every mode.

## XP and levels

Every player earns XP and climbs 10 ranks during a game. Levels are never lost (stars still are, on death), and they
are saved with the game. XP comes from:

| Source | XP |
|---|---|
| Destroying a basic / fast / power / armor tank | 10 / 15 / 20 / 30 (+5 for a flashing tank) |
| Picking up a power-up | 5 |
| Clearing a stage (players still in the game) | 25 |
| Hitting a boss | 2 per point of damage |
| Destroying a boss | 200 for the final blow, 100 for everyone else |

| Level | Rank | Total XP | Perk | Look |
|---|---|---|---|---|
| 1 | Recruit | 0 | — | stock tank |
| 2 | Private | 100 | engine +10% | one white stripe on the engine deck |
| 3 | Corporal | 250 | faster reload when holding fire | two stripes |
| 4 | Sergeant | 480 | shells 20% faster | radio antenna |
| 5 | Lieutenant | 800 | **armor plate**: soaks one hit, renewed every life | riveted steel skirts (they vanish when the plate breaks) |
| 6 | Captain | 1200 | engine +20% | stripes turn gold |
| 7 | Major | 1700 | every life starts with at least one star | gold star on the turret |
| 8 | Colonel | 2300 | rapid reload | gold-trimmed skirts |
| 9 | General | 3000 | double armor plate | second antenna |
| 10 | Marshal | 3800 | a broken plate grows back after 30 s | all-gold skirts and a golden glow |

A promotion plays a fanfare, flashes the tank and shows the new rank and perk at the top of the field; it also
comes with fresh plates. The side panel shows each player's level (`L5`) with an XP bar beside the lives, and the
score tally shows the level and the XP earned in the stage. Settings → XP AND LEVELS: on/off, XP rate, perks on or
*looks only*, start level, XP lost on death (0% by default; only progress towards the next level, never a level)
and *show ranks and perks*, a screen with every rank's tank.

## Game modes

Pick a mode on the title screen's **MODE** row (left/right), then start on the PLAYERS row (left/right picks 1-4; versus needs 2-4,
on one keyboard, with pads, or online; VS eagles, deathmatch and kill race can also be played alone, against the computer).
Survival, time attack, corridor, maze, endless world, VS CPU and Counter-Strike keep their best results; there is no shop outside Classic, Big maps,
Maze and VS CPU, and no saving outside Classic, Big maps and Desert Dominion.

| Mode | Players | How it works |
|---|---|---|
| **Classic** | 1-4 | the game as always |
| **Survival** | 1-4 | hold out for 100 waves on one map, with no eagle: you start in the middle and the enemy comes in from every edge to hunt you down. Waves grow to 28 tanks, then get tougher instead; a twist every third wave; terrain rebuilt and power-ups dropped between waves; a perk every 5 waves (see below) |
| **Any side** | 1-4 | the classic stages with the map turned round, and maps made for each edge: your eagle is on the left, top, right or bottom edge (the next one in turn every stage), you start beside it and the enemy comes in from the edge across. Most stages have a twist: two fronts, the eagle moving to a new fort mid-stage, wind or an ice slope, and every 5th a mirror stage with two eagles. Before each stage you can put down sandbags or a turret; clearing all four sides in a row pays a bonus. Base upgrades, the minefield, the eagle gun and supply drops all face the right way. Shop as in Classic (see *Any side* below) |
| **Custom levels** | 1-4 | your levels from CONSTRUCTION, every filled slot in turn (see below); shop as in Classic |
| **Big maps** | 1-4 | every stage is a big scrolling map (see below); shop and saves work as in Classic |
| **Corridor** | 1-4 | as wide as the team (13 tiles alone, 17 for two, 21 for three or four; a narrower screen scrolls sideways), endless height: no eagle, just climb. The world is three map sections stacked (random classic maps, mirrored outwards on wider fields); once the whole team has climbed out of the bottom section it drops away and a fresh section appears on top, so the climb never ends and nobody gets left behind. Enemies keep arriving just above the screen, faster and tougher the higher you get (the flag shows the level: one per section climbed). The enemy grows slowly with the climb: only basic tanks at first, then fast (10 tiles), power (26) and armor (45), then the newer types one at a time every 20 tiles from 52 (rocket first), each starting rare and taking 40 tiles to reach its full share; veterans from about 100 tiles and elites from 230. A gold *NAME AHEAD!* tells you when a new kind joins; ones left far below drop out. Every 5 sections everyone gets a tank. And it's a race: a hazard (lava, a flood or a wall of fire) rises from below, faster the higher you are; a climb combo pays x2 and x3 points; every 100 m a new biome (city, forest, snow and ice, volcano, sky fortress); set pieces, splits, supply depots every 250 m (the checkpoint), a boss gate every 500 m, medals at 300, 600 and 1000 m and a ghost where your best run ended (see *Corridor* below). The border above the field shows how far you've climbed (in metres, a tile each) and your best, the left border the climb meter; ends when everyone is out |
| **Maze** | 1-4 | a huge labyrinth, a new one every stage and bigger each time (17 x 11 cells at first, growing by 3 x 2 a stage up to 34 x 22; a cell is a 2-tile passage), always solvable. You start in the bottom-left corner; the one way out, a chequered **EXIT** gate, is on the outer edge as far from the start as the maze allows, and it stays sealed until the team has the maze's 3 **power cells**. On the way: coloured **gates** whose keys lie deeper in, one behind the other; rivers to bridge; pressure plates and steel doors; moving walls; cracked floor; belts and teleporters; treasure rooms, vaults and secret exits. It's dark: your lamp lights the way (and burns down; fuel cans refill it), what you've seen stays dim, and the minimap shows only that. Once every key and cell is in, the maze starts to **collapse**: a clock runs to the exit. Mazes 1-4 are a stone dungeon, 5-9 the sewers, 10-14 ice caverns, 15 on the machine, and every 5th is a **lair** with a beast in its arena (see *Maze* below). The walls are steel that nothing can break, with the odd stretch of brick you can shoot through for a shortcut. Enemy tanks (26 in the first maze, 6 more each maze, up to 100) patrol along the way, half of them from the start (none near the start), and come for you once you get close or shoot them; more turn up out of sight as you go (the side panel counts them). Lost for too long (1 minute on the easiest skill, 3 on the hardest) and the exit sends a signal: a blinking green marker at the edge of the screen. Reaching the exit is worth 2000 plus a time bonus, and every enemy left goes up in smoke; then the tally (with the time and its stars), the shop and the next maze. A destroyed tank comes back where it was a few seconds before. The border shows the maze number and the time; the best run (mazes escaped) and the best stars for each maze are kept |
| **Endless world** | 1-4 | a land without end, made as you drive: nine biomes (grassland, forest, autumn woods, snowfields, desert, volcano, swamp, city ruins, wasteland) with their own look, twist and enemy; rivers, lakes and roads; villages to save from attack (then a safe place where the game is saved), ruins with chests and the odd guardian boss, enemy nests; more enemies the further out you go; mostly day, with a short night (7 minutes a day). The record is how far you got from home, then villages saved (see *World* below) |
| **Fortress** | 1-4 | tower defense: hold your eagle through 30 waves (see *Fortress* below) |
| **Galaxy** | 1-4 | a space shoot-'em-up: your tanks against alien waves, sector after sector (see *Galaxy* below) |
| **Time attack** | 1-4 | clear stages 1-5 as fast as you can; enemies arrive twice as fast, no tally between stages, the clock runs in the border above the field; best time is kept |
| **Kill race** | 1-4 | no eagles, just the enemy: each round is a normal stage of enemy tanks (they appear at random free spots all over the map, never within 4 tiles of a player, instead of along the top), and whoever destroys the most of them wins the round and scores 1 point (a tie on kills goes to whoever scored more with them; still tied, nobody scores). How many points win the game is picked on the first round's curtain with left/right (1, 2, 3, 5, 7 or 10; also Settings → GAME → RACE: FIRST TO). A destroyed tank comes back after a moment, no lives lost; a grenade's kills count for whoever took it; the shovel does nothing without an eagle. The side panel shows each player's kills this round and their points as gold pips; the round result shows kills and points. Alone, you race 3 bots that hunt the enemy tanks. No shop |
| **VS CPU** | 1 | VS eagles with one player: you against the computer. Their HQ (an eagle with a red glow, in its own fortress) is at the top centre, yours at the bottom; their tanks keep coming until the HQ falls. Destroy it (2000 + 500 per round) to win the round: every enemy tank goes up with it, then the tally, the shop and the next round on a new map. Their HQ grows a little stronger each round, as yours does in the shop: round 2 repair crew, 3 walls and armor (the top border shows the armor left), 4 eagle gun (shoots you when you line up with it), 5 minefield, 6 tesla coil, 7 tank traps, then each grows to level 5. The round curtain lists what they added. The way in from below always stays brick. Ends when your eagle falls or you're out of tanks; the most rounds won is kept |
| **Co-op VS CPU** | 1-4 | VS CPU for the whole team: up to four players together against the enemy HQ, round after round, with the shop in between (alone it's plain VS CPU) |
| **VS eagles** | 2-4 | everyone has an eagle and a fortress (I bottom, II top, III left, IV right). Your shells, rockets and mines now destroy other players; you respawn while your eagle stands, and your own shells can't hurt it. Lose your eagle and you're out; the last eagle standing wins the round. Best of 3 |
| **Deathmatch** | 1-4 | no eagles; players start in the corners and respawn; first to 10 kills, or the most kills after 3 minutes (the clock is in the side panel). Alone, you play against 3 computer bots (BOT II-IV): they hunt the nearest rival (each other too), take a moment to aim (quicker on harder skills), grab nearby power-ups and shoot through bricks. Bots never set the high score |
| **Flags** | 2-4 | each player has a flag at home (marked by a square). Drive over another player's flag to grab it and bring it to your own home flag (yours must be at home) to score. Destroying a carrier drops the flag where it fell; touching your own dropped flag sends it home. First to 3 captures |
| **Counter-Strike** | 1-4 | two teams of five tanks on DE_DUST2, DE_AZTEC, DE_TRAIN or DE_MIRAGE, bots filling them up: the terrorists plant the bomb on site A or B, the counter-terrorists stop them or defuse it. Rounds with a buy time and money, no respawns, sides switched at half time, first to 8; a fog of war shows only what your team can see (see *Counter-Strike* below) |
| **Tank Rally** | 1-2 | a tribute to Rock n' Roll Racing with tanks: four-tank races on twenty circuits across five alien worlds, laps, weapons, mines and boost, money for places and kills, a shop between races, divisions to climb and a champion to beat (see *Tank Rally* below) |
| **Astro Tanks** | 1-2 | a tribute to Asteroids: your tank in open space on a screen that wraps round, turning and thrusting with momentum, blasting rocks that split, saucers that shoot back, the heartbeat that speeds up; crystals buy upgrades in the hangar between waves, and a mini boss every fifth wave (see *Astro Tanks* below) |
| **Desert Dominion** | 1 | a tribute to Dune II, the first real-time strategy game: build a base on the rock of the desert planet KHARRA, harvest the glowing GLIMMER for credits while the SANDWYRMS hunt on the open sand, build an army through your House's tech tree and destroy the rival Houses; a campaign of nine missions for each of three Houses, and skirmishes against 1-3 computer Houses (see *Desert Dominion* below) |

In versus, power-ups drop every 15 seconds (only ones that make sense between players), there are no enemy tanks, and
the side panel shows each player's wins, kills or captures. Round and match results show who won.

## Counter-Strike

Two teams of tanks on a classic map seen from above, its layout tile by tile: **DE_DUST2**, **DE_AZTEC**, **DE_TRAIN**
or **DE_MIRAGE** (MAP on the team screen, or RANDOM). On Dust 2 the terrorists start in the south (T spawn) and the
counter-terrorists in the north (CT spawn, between the two bombsites).

- **DE_AZTEC** (60 x 62, jungle and grey-green Mayan stone): T spawn in the south west; long up the west side to the
  river bank and the narrow **rope bridge** over the ravine to the A ramp and **bombsite A** (a dig round a stepped
  pyramid) in the north west; the T ramp down to the **water**, a shallow canal east under the **overpass** to the B
  ramp and **bombsite B** (a temple with big stairs above a deep pool) in the east; the T tunnel to the **double
  doors**, the lower ramp and the overpass to the courtyard; CT spawn in the north east, with the CT hall to A, the CT
  path to B and the connector down to the courtyard. Deep water stops tanks but not shells or sight.
- **DE_TRAIN** (66 x 68, concrete and rails): T spawn in the north west; alley, pigeons and **ivy** into the A yard,
  the T connector to A main, showers and **popdog** under A up by the E box; **bombsite A**, a big yard of five tracks
  with red, green, blue and black **train cars** (unbreakable; the lanes between them are the way through), heaven
  behind its windows and hell and the ladder room below to CT spawn in the east; the T stairs down to the **B halls**,
  upper and lower B and the B ramp to **bombsite B** in the south (two tracks of trains), back of B round from CT spawn;
  the Z connector between the sites.
- **DE_MIRAGE** (69 x 57, ochre plaster, terracotta and blue-green mosaics, laid out over the game's own radar):
  T spawn in the east; T ramp, **palace** and tetris to **bombsite A** in the south (firebox, triple, ninja,
  sandwich, stairs, jungle, ticket booth, CT); top mid, **mid** with the **window** and the connector, short and the
  underpass; T apartments, the balcony and B short to **bombsite B** in the north west (the van, the bench, kitchen,
  the **market** with its stalls and window, the arches); CT spawn in the south west between the sites. Palms in
  clay pots are cover that breaks.

- **The map** (64 x 60 tiles; the screen scrolls, with the minimap in the corner): **long A** up the east side (outside
  long, the long doors, the pit, long A with the blue container and the long corner, the car at the top by the ramp)
  to **bombsite A** in the north east (the goose corner behind its boxes, the boxes on the plat, the CT ramp from CT
  spawn); **mid** up the middle (top mid, the xbox, the mid doors to CT mid), with the **catwalk** (A short) climbing
  from mid into A; the **B tunnels** up the west side (outside tunnels, the upper tunnels, the lower tunnels that come
  out in mid) to **bombsite B** in the north west (back plat, the double stack, the B car, the B doors to CT and the
  window beside them). The sites have a big painted letter and a dashed line round them. Sandstone walls never break
  (not even for star 3, mortars or the bomb); wooden crates and door leaves are cover that shells break bit by bit;
  the window lets shells and sight through but no tank.
- **Teams:** 1-4 players, on one keyboard and pads or online. Before the match, the team screen: left/right picks your
  side, up/down and left/right set the MAP (or RANDOM), ROUNDS TO WIN (5, 8, 13) and TEAM SIZE (3 v 3, 4 v 4, 5 v 5), FIRE says you're
  ready (Esc: back to the title); the choices are remembered. Players at one computer pick together and play on the
  same team, since they share the screen and its fog of war; each online friend picks a side of their own. Bots (ALEX,
  BORIS ...) fill both teams up to the size.
- **A round:** the first 10 seconds are the **buy time**: the tanks hold still in their spawn and the buy menu is up
  (up/down to choose, FIRE to buy, READY to start early; with several players at one computer each has a cursor of
  their own). Then 1:55 on the clock (the line above the field). One terrorist carries the **bomb**: a player, when there's one on that side, else a bot (his team sees it
  over his tank, in the side panel and on the minimap); it drops where he's destroyed and any terrorist picks it up by
  driving over it. On a bombsite, **hold B and keep still for 3 seconds** to plant it (moving or letting go starts
  over). Planted, it beeps faster and faster for 36 seconds; a counter-terrorist on it holds B still for **10 seconds
  to defuse** it (**5** with a defuse kit), starting over if he moves. The bomb's blast destroys every tank within five
  tiles, armour or not, and the crates round it.
- **A round ends** when one team is wiped out (with the bomb down, the counter-terrorists must still defuse it), the
  bomb goes off (TERRORISTS WIN, TARGET BOMBED), it's defused (COUNTER-TERRORISTS WIN, BOMB DEFUSED) or the clock runs
  out with no bomb down (TARGET SAVED). There are no respawns: a destroyed player watches a teammate (FIRE: the next
  one) and can **take over a bot** they're watching with **B**: its tank (as it looks), its gear, its magazine and the
  bomb if it has it (the bot is out); out again, they can take over the next one, as long as a bot of the team is left. With the **whole team out** while the round goes on (the bomb down, the other side to
  defuse it) the fog lifts: the arrows move the camera round the map and FIRE follows the next tank still in it. The banner names the winners, how, and the round's MVP (the planter of a bomb that went off, the defuser, else
  the most kills on the winning side), with the scoreboard under it; then the next round on the map as new.
- **The match:** first to 8 rounds (or 5, 13); after the 7th round (half the most there can be) it's **half time**:
  the sides switch and the money and the guns start over. The result screen shows the score and each player's kills,
  deaths and MVPs. The title screen keeps your record: matches won and rounds won (not for a match of bots only).
  No saving in a match (like versus); RESTART ROUND in the pause menu plays the round again.
- **Scoreboard:** hold **Tab** (it's also up at the end of every round): both teams, kills, deaths, MVP stars and your
  own team's money.
- **Orders to the bots** on your team: **1 FOLLOW ME** (they come along behind you), **2 HOLD HERE** (they take up
  places round where you stand and defend them, looking the way you look), **3 GO ON** (back to their own plan).
  **Q**, a stick click on a gamepad or the **ORDER** button on a touch screen goes round the three; player II on the
  same keyboard has **8 9 0**; online friends order their own team's bots. An order lasts the round, or until the one
  who gave it is out; it shows at the bottom of the field. A bot under orders still plants when it's on a site with
  the bomb, and defuses the bomb it's on.
- **The bots:** the terrorists gather short of a site, then go in together (sooner than before), plant and hold round
  the bomb; when a player carries the bomb they go where the player goes: the site the player is heading for, in once
  the player is close to it. The counter-terrorists hold posts round both sites, the two nearest going after any
  terrorist seen or heard near them; in a quiet spell each takes a turn looking out further up its way in, and they
  rotate to a site the terrorists show up at. Bots make way for a teammate (a player too) pushing past them.
- **Your tank:** a TANK row for each player on the team screen (online friends: up/down) picks the tank you drive:
  your own (it changes with its stars, as everywhere), one of the four player tanks, or any of the enemies' (BASIC to
  MOSSLUMP), always in your team's colours. Only the look: every tank drives, shoots and takes hits alike. Remembered.
  The bots get a tank each at random at the start of a match and keep it.
- **Reloading:** every gun has a magazine — cannon 6 shells, machine gun 40, flamethrower 2.5 s of flame, mortar 3,
  tesla 4, missiles 2 volleys, laser 3 — and when it's empty the tank reloads (1.7-2.5 s) and can't fire. **R** reloads
  early (player II on the same keyboard: **7**; with three or four at one keyboard only an empty magazine reloads). The
  magazine shows in the side panel (yellow while reloading), with a bar under your tank and RELOADING over the field.
  Bots reload when there's nobody to fight and their magazine is half gone.
- **Neutral tanks:** a NEUTRAL TANKS row on the team screen (OFF / FEW 4 / SOME 8 / MANY 12) puts grey tanks of
  nobody's side round the map: BASIC, FAST, POWER and ARMOR, all in grey. They wait out the buy time, then roam and shoot
  whoever's nearest, terrorist or counter-terrorist. Destroying one pays $150; it comes back ten seconds later somewhere
  nobody can see. They hide in the fog like the other side (grey dots on the minimap once seen), and the bots fight
  them when they come close. Remembered with the other match settings.
- **Combat** as in versus: a hit destroys a tank, an armour plate soaks one; friendly fire is off (a teammate's shell
  stops on you and does nothing); one shell in the air at a time (two with two stars), flying at most 10 tiles, and a FIRE
  pressed while it's still out fires the moment it can; no power-ups on the map (everything is bought); every tank drives and reloads alike
  (no XP perks in a match). **B** throws a grenade if you have one (smoke or flashbang, in the order you bought them), else drops a mine, else fires; on a site with
  the bomb, or on a planted bomb as a counter-terrorist, B plants or defuses instead.

**Free each round:** every counter-terrorist starts the round with a **star and an armour plate**, every terrorist with an
**armour plate** (a tank that kept one from the last round gets nothing more; a second of each can still be bought).

**Money:** everyone starts with $800 (and again at half time), at most $16000.

| For | Money |
|---|---|
| a kill | $300 with the cannon, mortar, tesla or missiles; $600 machine gun; $900 flamethrower; $100 laser |
| winning a round | $3250; $3500 when the bomb went off or was defused |
| losing a round | $1400, $500 more for each loss in a row before it, up to $3400 |
| planting the bomb | $300 to the planter; and $800 to every terrorist if the round is lost anyway |
| defusing it | $300 |

| Buy | Price | |
|---|---|---|
| Armour plate | $650 | soaks a hit; two at most; kept if you survive the round |
| Star | $600 | faster shells, then two in the air at once (two stars at most) |
| Smoke | $300 | B: a cloud up to three tiles ahead (short of a wall) that nobody sees through for 15 s; two at most |
| Flashbang | $200 | B: thrown up to six tiles ahead, it bangs a moment later and blinds every tank that can see the bang within about seven tiles, for up to 3 s (longer the nearer, and the more it was looking that way; the thrower too). A blinded player's screen goes white; a blinded bot holds its fire. Two at most |
| Mines x3 | $400 | B drops one; they go off only under the other team, and only your team sees them |
| Defuse kit | $400 | counter-terrorists only: defuse in 5 s |
| Flamethrower MK II, machine gun MK II, mortar MK II, tesla MK I, missiles MK II, laser MK II | $1200, $1500, $2000, $2500, $3100, $4750 | the weapons (see *Weapons*), one in hand |

What you buy stays while your tank lives; a destroyed tank loses its gun, plates, stars, smoke, mines and kit.

**Fog of war:** you see only what your team sees: line of sight from every living tank of your team, 9 tiles round
it, stopped by walls, crates (until they're shot away) and smoke. Ground your team has never seen is black; ground it
has seen before but can't see now is dim and shows no enemies (and no shells). Where an enemy was last seen a fading
outline with a question mark stays a few seconds; shots fired out of sight near your team show as a flash where they
came from. The minimap shows only what has been explored, the sites, your team, the enemies in sight and (for the
terrorists) the bomb; when the bomb is planted the counter-terrorists see which site it's on. The weapons that find
their own targets (tesla, missiles, mortar) only go for enemies your team can see. Each team has its own fog (what it
has explored is kept for the whole match); online, each friend sees their own team's.

**The bots** buy as players do (armour, the best gun they can afford with one sniper laser a team, a kit for the
counter-terrorists, smoke for the terrorists; a poor round they save). The terrorists pick a site each round and a way
in for each of them (A by long or the catwalk, B through the tunnels, a lurker through mid and the lower tunnels),
gather short of it, go in together (some rounds they rush), plant, then hold the ways in while one guards the bomb;
one of them fetches a dropped bomb. The counter-terrorists hold the car at A, A site, CT mid, B site and the B window,
facing the way in; they rotate when the enemy is seen or heard at a site, and once the bomb is down the nearest goes
for it while the rest come round. In a fight a bot takes the enemy it can hit (in line, no wall or teammate between),
lines up with one that's close, and takes a moment to aim: longer on the move, shorter holding its post, quicker on
harder skills.

## Tank Rally

A tribute to the SNES classic Rock n' Roll Racing, with tanks: top-down track racing, four tanks a race (you and three
computer rivals, or two players and two rivals), money, upgrades and a career. Everything in it is original: the
worlds, tracks, rivals, tanks and music (no names, characters or songs from the real game).

- **Driving:** the tank moves in four directions but with momentum: it speeds up to its top speed, coasts and brakes,
  and a 90° turn at speed keeps it sliding sideways for a moment (a little on road, a long way on ice), so corners take
  skill. Walls stop you (clip a corner and you slide past it); racers that meet push each other and both slow down.
  Rough ground and mud slow you (less with suspension upgrades), ice slides, lava burns armour; ramps launch you over
  the chasm, creek or lava gap after them (bigger, with a shadow, over pits, mines and shells); drive into a pit and
  you're wrecked. Boost pads give a burst of speed.
- **Keys:** FIRE the forward weapon (cannon, homing missiles or laser), **B** the rear drop (mines, an oil slick that
  spins whoever hits it, or smoke), **FIRE and B together** BOOST. Each has a few charges a lap, filled up again when you
  cross the line. Hits take armour; at none you're WRECKED (whoever did it gets a kill and money) and back on the
  racing line two seconds later. `$` pickups pay, `+` pickups repair and refill.
- **The race:** a countdown, 3-4 laps, live positions, a minimap, the race clock and best lap, WRONG WAY if you turn
  round, laps only counted the right way round (no shortcuts), commentary for the lead changes, wrecks and the last
  lap. Two players share the screen: the camera follows the leader and the one left behind catches up on the leader's
  track. Each track has one of three race tunes.
- **The worlds:** DUST BOWL (desert mesas), GLOOMWATER (a toxic jungle with acid creeks and mud), CRYOSPIRE (an ice
  planet), CINDERFALL (volcanic, with lava rivers to jump) and NEON WRECK (a ruined city at night), four tracks each,
  harder and longer as you go: ovals, figure-8s with jumps at the crossing, hairpins, chicanes, split sections, jumps
  over chasms.
- **The career:** each world has division B then A (four races each) — points 4 / 2 / 1 for 1st / 2nd / 3rd, enough of
  them to move up, too few in A and you drop back to B; the last world ends with a one-race final against the champion,
  BARON KRAGG, which you must win. Money for your place and your kills (and what you pick up) goes on the **shop**:
  ENGINE (top speed and pick-up), TRACKS (grip), ARMOUR, SUSPENSION (rough ground), more weapon, drop and boost
  charges, and new tanks — SCOUT (fast, light), BRAWLER (missiles and mines), BULWARK (heavy, $30000) and HOVER
  (a laser, from the third world, $75000); a new tank starts without upgrades. The rivals (VEX ORRIN, DUKE RUSTOV, MIRA
  FLINT, GRUNDLE, ZEP-9, KAT VOLTA, SKITTER), each with a face, a style (aggressive, clean or dirty) and taunts, get
  better and buy better tanks as the career goes on. The career is saved after every race (CONTINUE on the mode's
  screen).
- **Music** (in all three MUSIC STYLES): HOT TREAD BOOGIE, PISTONS AND THUNDER and RED DUST HIGHWAY for the races,
  BACKROOM DEALS in the shop, CHAMPION'S STOMP for the final, CHECKERED GLORY on the podium (the rock names; chiptune
  and synthwave versions have names of their own).

## Astro Tanks

A tribute to the arcade classic Asteroids, with a tank, upgrades and mini bosses. Everything is original: the bosses,
the art and the music.

- **Flying:** LEFT/RIGHT turn smoothly (a tap nudges, holding turns a full circle in about 1.5 s), UP thrusts (with
  momentum: you keep drifting), DOWN brakes hard. The screen wraps round at every edge, for you, the rocks and the
  shots. FIRE shoots (tap for the fastest rate, hold for auto-fire; up to 4 volleys in the air). **B** jumps to
  hyperspace, a random spot (a little risky); with the WARP DRIVE it picks the safest one; **hold B** to drop a bomb
  when you have one (it clears the small rocks round you, splits the big ones and hurts a boss). On touch the d-pad
  points the way to face, and pushed far out it thrusts too.
- **Rocks:** big ones split into two medium, medium into two small. Five kinds, each arriving with a banner: STONE,
  CRYSTAL (pays three times the crystals; wave 2), IRON (takes several hits and knocks back; wave 3), ICE (splits in
  three; wave 4) and MAGMA (bursts into fireballs; wave 6). More and faster rocks every wave.
- **Saucers** from wave 2: the big one shoots at random (200), the small one aims and leads you, better every wave
  (1000); up to two at once from wave 6, three from wave 12, and they come sooner if you dawdle.
- **The heartbeat:** two low notes under the music that beat faster as the rocks thin out.
- **Pickups** in the waves: SHIELD, RAPID FIRE, TRIPLE SHOT, TIME SLOW, a BOMB, a rare extra tank. 3 tanks to start
  (more on the easy skills), one more every 10000 points; a bonus for clearing each wave and for a wave without a hit.
- **The hangar** between waves: the crystals you picked up (they drift; MAGNET pulls them in) buy upgrades. Four
  offers each visit, one free reroll, and a free pick after each boss. 17 upgrades with levels, most of them showing
  on the tank: CANNONS (twin, triple, quad), AUTOLOADER, HOT SHELLS, AP ROUNDS (they go through), REAR GUN, SEEKERS,
  ENGINE, HANDLING, BRAKES (level 2: reverse thrust), ARMOUR (plates that take a hit each), SHIELD GEN, MAGNET,
  SALVAGE, BOMB RACK, WARP DRIVE, GUN DRONE and SPARE TANK. Two players each shop for their own tank.
- **Mini bosses** every fifth wave, after a WARNING, with a health bar and phases (at two thirds and a third):
  - **CINDER COLOSSUS** (wave 5): a molten asteroid armoured in iron plates; shoot the plates off to reach the core.
    It rolls after you, charges (watch for the dotted line), sheds rocks, then vents magma and finally cracks open.
  - **VOID MATRIARCH** (wave 10): a mothership behind a shield bubble held up by pylons (shoot those first), with
    turrets firing bursts, fans and spirals, small saucers from its bay and a sweeping tractor beam.
  - **COMET WYRM** (wave 15): a serpent of rock and iron segments that wraps across the edges, lunges and coils round
    you; hit the head (twice as hard while its jaws are open) or the comet tail.
  Then they come again, stronger (CINDER COLOSSUS II at wave 20 and so on).
- **Records:** the best score and the furthest wave are kept and shown on the GAME OVER screen.
- **Music** (in all three MUSIC STYLES): COLD ORBIT and METEOR STORM for the waves, TITAN OF THE VOID for the bosses,
  HANGAR BAY 9 in the hangar (the chiptune names; rock and synthwave versions have names of their own). The mode has
  its own title picture.

## Desert Dominion

A tribute to Dune II: The Building of a Dynasty (1992), the first modern real-time strategy game. Its rules are
faithful; everything else is original: the planet, the Houses, the advisors, the units' names, the pictures and the
music (no names, characters, text or tunes from the real game or the books).

- **The world:** KHARRA, a desert planet. Its resource is GLIMMER, an orange glowing sand in light and thick fields
  (and GLIMMER BLOOMS, buried bulbs that burst into a new field when touched or shot); harvesters gather it and
  refineries turn it into CREDITS. The SANDWYRMS roam the open sand, home in on noise (moving, digging, firing) and
  swallow whatever is on the sand whole; they can't cross rock. Three Houses fight over it at THE REGENT's bidding:
  **AQUILA** (blue, the eagle; noble — advisor COUNSELLOR MIREN), **DRAKON** (red, the ram's skull; brutal —
  OVERSEER KASK) and **SERPENS** (green, the serpent; cunning — FACTOR VELL). THE REGENT (purple) and his PRAETORIANS
  are the last enemy; the NOMADS of the deep desert (tan) fight beside AQUILA.
- **The screen:** the map on the left, the sidebar on the right: the radar (needs a RADAR OUTPOST and power), the
  power bar (green what's made, the white line what's used), a tab for each kind of factory you have (BLD, INF, TRP,
  LT, HV, AIR, PRT), the build icons (price and power in the top bar under the pointer; progress over the icon, a
  count for each queued, PLACE when a building is done) and the selection panel (picture, health, what it's doing,
  and its command buttons). The credits counter rolls; the top bar says what's happening (CONSTRUCTION COMPLETE, UNIT
  READY, OUR BASE IS UNDER ATTACK, WYRM SIGN ...), each with a little stinger.
- **Building:** the CONSTRUCTION YARD builds buildings one at a time, paying as it goes; a finished one waits to be
  placed next to your own buildings or concrete, on rock. On bare rock it starts damaged and slowly decays: lay
  CONCRETE SLABS first. VAPOR TRAPS make power; short of it, everything builds slower and the radar and rocket turrets
  go off. Refineries and SILOS store the credits (past that, harvested glimmer is lost). Factories queue units (up
  to 9), roll them out of their doors to the rally point, and can be UPGRADED for more units; select a building to
  REPAIR it (it costs as it goes), SELL it (half back) or set its RALLY point. Damaged enemy buildings can be
  CAPTURED by soldiers and troopers; destroyed ones leave their ruins.
- **Units:** SOLDIER, TROOPER (rockets), TRIKE (AQUILA) or RAIDER (SERPENS), QUAD, COMBAT TANK, MISSILE TANK (not
  SERPENS), SIEGE TANK, HARVESTER (700 credits a load; it finds the nearest field and unloads on the refinery's
  hopper), MCV (deploys into a construction yard), SKYLIFTER (flies harvesters to the fields and back, and damaged
  vehicles to the REPAIR PAD, by itself), GUNWING (not DRAKON); with a RESEARCH LAB each House's special: the SONIC
  TANK (AQUILA: a wave that hurts everything in its path, friend and foe), the JUGGERNAUT (DRAKON: twin plasma, can
  self-destruct) and the CONVERTER (SERPENS: gas that turns enemy vehicles to your side for a while). The STARPORT
  sells units at prices that change, delivered by FRIGATE. The PALACE charges its House's power: NOMAD WARRIORS who
  rise from the sand (AQUILA), the DOOMFIST missile that falls anywhere on the map, not very accurately (DRAKON) or a
  SABOTEUR, invisible when still, who blows up a building (SERPENS). Defences: WALL, GUN TURRET, ROCKET TURRET.
- **Mouse:** left click selects (a unit or building), drag a box for several, double-click selects all of a kind on
  the screen; with units selected a left click moves, attacks (the cursor shows which: move, attack, capture,
  harvest, repair, deploy, can't go), a click on the MCV deploys it; right click deselects or cancels (ORDERS:
  CLASSIC). ORDERS: MODERN gives the orders with the right button instead. Ctrl+click forces fire. The screen's
  edge, the arrow keys and WASD scroll; a click on the radar jumps there; the wheel scrolls the build icons.
- **Hotkeys:** H home (the construction yard, again for the next), G guard, S stop, A attack-move, R repair the
  selected building, DEL twice sells it, Ctrl+1..9 (or Shift) makes a group, 1..9 picks it (twice: goes there).
- **Keyboard or gamepad alone:** the arrows / d-pad move a cursor (faster as you hold it; it scrolls at the edge),
  FIRE (Space, J, K or pad A) clicks, held it drags a box; B (or pad B) cancels (on a build icon: takes one off its
  queue), B held with the d-pad pans; TAB or pad X jumps the cursor between the map and the sidebar; pad Y goes
  home, LB/RB change the factory tab, the right stick pans.
- **Touch:** tap clicks (select, order, build), a drag pans the map, two fingers deselect; hold a finger still a
  moment and then drag to draw a selection box (lift without dragging: every unit of that kind on the screen). On
  the build icons a drag scrolls them and a long press cancels one (as the right button does). MENU in the top-left
  corner pauses.
- **The campaign:** an intro, then pick your House (each advisor introduces it). Nine missions, each with a briefing
  from your advisor, a battle, the result, a SCORE screen with your rank (from DUST MITE up to MASTER OF KHARRA) and
  the REGION MAP of KHARRA, where the rival Houses take land too and you choose the next of two or three regions to
  attack (the region's owner is who you fight). Missions 1-2 ask for a harvest (1000 and 2700 credits), 3-7 for
  the enemy base destroyed, 8 sets two Houses on you at once, 9 is the REGENT's palace with his Praetorians and both
  rivals; each mission opens up more of the tech tree, as in the original. AQUILA fights beside the NOMADS from
  mission 7. Lose and you try again. Then an epilogue for your House and the credits. Progress is saved after every
  step (CONTINUE on the mode's menu).
- **Skirmish:** your House, 1-3 computer opponents (each its House, including THE REGENT, and its skill from EASY to
  BRUTAL; allied or each for itself), the map's size (48 to 96 tiles square) and style (OPEN, CANYONS, ISLANDS,
  BASIN), starting credits, tech level, sandwyrms (0-3), fog of war, the orders scheme and the game speed.
- **Online:** friends join the host's battle as co-commanders of the same House, each with a cursor of their own
  (see *Online play*).
- **Saving:** SAVE GAME in the pause menu keeps the battle as it is; CONTINUE on the title (with the mode picked)
  goes on with it. RESTART ROUND plays the mission again from the start.
- **Music** (in all three MUSIC STYLES; the chiptune names, rock and synthwave versions have names of their own):
  DUSK OVER KHARRA, THE GLIMMER FIELDS and CARAVAN OF STARS while you build and harvest, STEEL ON SAND, THE BURNING
  FRONT and SEVEN DUNES when fighting comes near, and a theme for each House (BANNERS OF AQUILA, THE IRON RAM,
  SERPENT'S BARGAIN); THE SANDS OF KHARRA for the intro, BANNERS OF THE HOUSES on the menu, WHERE THE WYRMS SLEEP on
  the region map, THE ADVISOR SPEAKS for briefings, THE REGENT'S THRONE for the last one, THE SANDS ARE OURS and
  BURIED IN SAND after a battle, COUNTING THE GLIMMER on the score screen. The mode has its own title picture.

## Big scrolling maps

A big stage stitches several classic maps together (3 across and 2 down, more on wide screens). Your screen keeps its
usual field size and follows your tanks (online, each guest's view follows their own tank). Blinking squares at the
edge point to objectives off screen (gold: your HQ, cyan: outposts, red: factories), and the border above the field
shows how the objective stands.

Finding the enemy on a map bigger than the screen (big maps, the corridor, the maze, the endless world):

- **Arrows** at the edge of the screen point to every enemy out of sight (darker red when it's far, a big gold one
  for a boss).
- **A minimap** in the top right corner shows the whole map: walls, water and trees, the part you're looking at
  (white frame), you and your team, the enemies (red), the eagle and the objectives. It fades while you drive under
  it. In the maze it shows only what your team has seen, one dot a cell (see *Maze*); in the endless world it shows
  what you've explored round you (see *World*). Settings → SCREEN → MINIMAP.
- Enemies you couldn't see anyway get no arrow or dot: underground, cloaked, mirages, or hidden in the dark. Big stages bring twice the tanks and two more on screen at once. Each has an objective,
taking turns:

- **Outposts**: two more eagles with fortresses stand beside your HQ. Enemies go for whichever eagle is nearest.
  Only losing the HQ ends the game; every outpost still standing when the stage is cleared is worth 2000 to each player.
  Your own shells can't hurt them.
- **Factories**: three enemy factories in the far half keep turning out tanks until destroyed (8 hits, star-3 shells
  count double, rockets and mines too; 1000 points each). The stage is clear only when every factory is down and the
  last tank is gone.

Play them in the **BIG MAPS** mode (every stage), or in Classic with Settings → GAME → **BIG MAP STAGES: SOME**
(every 4th stage that isn't a boss stage; off by default).

## Maze

Every maze is generated afresh, bigger each time, and it can always be solved: before you get it, a solver drives
through it with its moving walls in every position and all its cracked floor already fallen in, and checks that every
key, crate and power cell can be reached in turn, and then the exit (if not, the maze is made again, in the end with
fewer things in it).

- **Depths**: mazes 1-4 are a **stone dungeon** (cobwebs, old brick), 5-9 **the sewers** (mossy walls, rivers to
  bridge, sludge that slows you, drips), 10-14 **ice caverns** (ice walls, a third of the floor slippery ice, more
  cracked floor and moving walls, snow), 15 on **the machine** (riveted plates, moving walls everywhere, conveyor
  belts, teleporters, sparks). The curtain names the depth.
- **Lairs**: every 5th maze is a lair: a smaller maze with an arena in the middle where its beast waits (a Minotaur,
  from the maze's enemies). Its exit stays sealed until the beast is dead (and the cells are in).
- **Keys and gates**: red, blue and yellow gates (bars with a lock plate in the key's colour) stand on the way out: one
  in the first mazes, two from maze 4, three from maze 8 when the way is long enough. Each key lies on the near side of
  its gate, behind the gate before it (the blue key behind the red gate, the yellow behind the blue), usually in a dead
  end off the way, sometimes with a guard beside it. Keys belong to the whole team (the side panel shows this maze's
  key colours, lit once you hold them) and open every gate of their colour: just drive into it. A key stolen and never
  brought back turns up again where it first lay after 45 s.
- **Power cells**: three in every maze, spread along the way. The **EXIT** is sealed (red bars, a lock and three
  lights) until the team has all 3 (side panel: n/3); THE EXIT IS OPEN! when it opens.
- **Rivers**: in the sewers (and now and then from maze 3) a river cuts the maze in two, the exit on the far side. A
  **BRIDGE** crate lies in a dead end on your side: take it (a brown dot in the side panel) and drive into the river at
  a gap in the bank to lay a bridge across. A kit lost or used up with no bridge to show for it: a new crate turns up
  where the first one lay. The ship power-up crosses too.
- **Pressure plates and doors**: drive onto a plate and a steel door (yellow and black, its ends in the plate's colour)
  opens somewhere else; it stays open while anyone is on the plate, then for **20 s**, ticking (faster at the end), with
  the seconds over the doorway and a blinking marker at the edge of the screen pointing to it. It never shuts on a
  tank. In co-op one of you can hold the plate. Some doors are on the way out (the plate a short drive before them),
  others guard treasure.
- **Moving walls**: from maze 3 (5-8 of them in the machine), a wall beside a pillar with a hub on it slides or swings
  every 15 s, opening one way and closing another. It warns you 2 s before (a rumble, dust, the wall shaking, amber
  lights) and never closes on a tank; whichever way they stand, nothing is ever cut off.
- **Cracked floor**: from maze 2 (more in the ice), a cracked cell gives way once you've driven over it, as soon as
  everyone is off it: a one-way route. Never one the maze can't do without.
- **Conveyor belts and teleporters**: now and then from maze 4 (teleporters) and 6 (belts), lots in the machine: belts in
  the corridors carry you (mostly towards the exit), pads in pairs take you across the maze, now and then into a dead
  end. Settings → GAME → MUD, BELTS, PADS leaves them out.
- **Darkness**: the maze is lit only by your lamp (walls block its light). What you've seen stays dim behind you; some
  parts are **pitch black** even once explored, with **torches** on their walls that light up as you pass and stay lit,
  so you can find your way back. Muzzle flashes, explosions and shells light things up for a moment, the exit glows
  faintly, keys and cells glint. An enemy in the dark shows only as two red eyes, and gets no arrow and no dot on the
  map.
- **Lamp fuel**: each lamp burns down over about 3 minutes to a tile's worth of light; **fuel cans** in the side
  passages fill it up again (side panel: a bar per player, blinking below 20%; LAMP LOW). Every maze starts with full
  lamps.
- **The map**: the minimap shows only what the team has seen, walls included, one dot a cell (and one a wall): gates
  and doors in their colours, rivers and bridges, fallen floor and rubble; the exit once seen (or signalled), keys and
  cells you've spotted, a door whose clock is running. A **MAP SCROLL** shows the whole maze for 15 s (gold frame).
- **Markers**: each player can drop markers for the team, up to 5 (the oldest goes): a chalk cross on the floor and on
  the map, in the player's colour. Player I **Q** or **E**, player II **]**, **\\**, numpad 2 or numpad +, player III
  **8** or **9**, player IV **5** or **6**; on a gamepad either stick button (L3 / R3). The same key on the same spot takes
  the marker away. Online guests use Q, E or a stick button.
- **The collapse**: once the team has every key and power cell (and has bridged its rivers), the exit opens and the
  maze starts to cave in. A clock runs in big digits (and in the border and the side panel): 60 s, or more when the
  exit is far (20 s plus 1.6 s for every cell between the farthest of you and the exit; half as much again on the
  easiest skill, a little less on the hardest). Rubble falls into the passages behind the team (never on a tank, never
  in anyone's way out), the screen shakes, every gate springs open, the doors jam open and the moving walls stop.
  **Too slow**: the ceiling comes down. Everyone still inside loses a tank (back a moment later, as usual) and the clock
  starts again with two thirds of its time (at least 30 s), until you're out or out of tanks.
- **Par times and stars**: every maze has two par times, from the shortest tour that picks up its keys, crates and
  cells (and steps on its plates) on the way to the exit: inside the shorter one is three stars, inside the longer
  two, getting out at all one. The tally after a maze shows the time, the stars and both pars; the best stars for each
  maze number are kept with the mode's records (the curtain shows them for the maze ahead, the title screen and the
  run's result the total).
- **Treasure**: dead ends walled off by bricks (shoot your way in), a gate or a plate door hold coins, a weapon crate
  or an extra life. From maze 3 some mazes have a **vault**: a sealed room with gold trim and padlocks that opens when
  a Minotaur dies: three coins, a weapon crate and an extra life.
- **Secret exits**: some mazes (from maze 2, never a lair) hide an exit in a dead end behind a wall that only looks
  like steel (a hairline crack, a glint now and then). Shoot it down and drive in: you're out at once, with three
  stars, and the next maze is skipped.
- A destroyed tank comes back where it was a few seconds before, never into rubble or a fallen floor. SAVE GAME keeps
  a checkpoint at the start of the maze: loading plays that maze number again, freshly made. Online, guests get the
  whole world from the host and see by their own lamp; the map is the team's.

## Survival

Hold out for **100 waves**. There is no eagle: you start in the middle of one map, a little bigger than the screen (4
tiles more each way; it scrolls, with the minimap in the corner), and it stays the same map for the whole run — a
random classic map in a random season (with seasons on CYCLE), its crates, barrels, mud, belts and teleporters
included. Enemies come in at entry points all round the edge (3 tiles apart, kept clear), away from you if they can,
and most of them hunt you.

- **The waves:** wave *n* has 4 + 2*n* tanks, up to 28 (wave 12). After that they get tougher instead: more armour
  (an extra hit for up to 3 in 4 tanks, a second one from wave 40), more hunters and fewer wanderers, more of them on
  the field at once (4, rising to 8 by wave 73), spawns that come faster (every 2.5 s at first, under a second at the
  end), the newer enemy types, veterans and elites. Wave 100 is THE LAST WAVE: 39 tanks, all elite.
- **Twists** every third wave, the same for the whole run (they're picked when it starts, never the same twice in a
  row), announced a wave ahead (*NEXT WAVE: BLITZ*) and again in the breather before it:
  NIGHT WAVE (dark), SWARM (half again as many fast light tanks, more at once, quicker), ARMOURED COLUMN (armour
  only, veterans), SAPPERS, BLITZ (double-speed enemies), ROCKET RAIN (rocket tanks, and shells from the sky: a
  shadow marks each spot near you before it lands), FOG, SHIELD WALL, SHADOWS (shades) and SNAKE PIT. A twist whose
  enemy is switched off in the settings is left out.
- **Between waves** a 5-second breather: a random 10-60% of the wrecked terrain is rebuilt (never under a tank, a
  mine or a power-up; the screen says how much), and 2-3 power-ups are dropped around the map (one more per extra
  player). They stay 30 seconds; only you can take them. Every 10 waves everyone gets a tank.
- **Perfect wave** (nobody lost a tank): 1000 + 100 per wave to each of you, and a power-up beside each tank.
- **Perks:** after every 5th wave the game waits while you pick 1 of 3 (up/down, FIRE) for the whole team, for the
  rest of the run: ARMOUR PLATE (a plate on every tank, regrown each wave; up to 3), QUICK RELOAD, HOT SHELLS, TWIN
  GUN (one more shell in the air), BIG ENGINE, SPARE TANKS (two lives now; brings back anyone who is out), SCAVENGER
  (one more drop each wave), LONG FUSE (timed power-ups and the helmet last 50% longer), VETERAN CREW (respawn with a
  star more), BOUNTY (25% more points), AP SHELLS (break steel), FIELD SHIELD (longer spawn shield). No shop.
- **Co-op:** each extra player makes the waves 35% bigger, puts one more tank on the field at once, makes them come a
  little faster and adds a drop.
- **Revival:** when everyone is out you still get LAST CHANCE (FIRE pays for a revival out of your points, as in
  the other modes), but in survival each paid revival costs twice the one before (7500, 15000, 30000 ... with the
  default REVIVE COST). The line above the field shows your points to spend and the next revival's price.
- **Saving:** the checkpoint is the start of each wave: the same map, terrain, twists and perks when you load it.
- The side panel's flag shows the wave. It ends when everyone is out or all 100 waves are held; the best wave and
  score are kept (holding all 100 beats reaching the last one).

## Any side

The eagle's edge goes round, a new one every stage: **left, top, right, bottom**, and again (where a run starts in
that circle is random), so any four stages in a row bring all four. You start beside the eagle and the enemy comes in
from the edge across.

- **The maps:** about half the stages are the classic maps turned round; the rest are maps made for one edge, three
  per edge: RIVER BANK (a river along the fort's edge, three bridges over it), GLACIER and CANYON on the left; CLIFF
  TOP (the fort on a cliff, three muddy ramps up), ICE SHELF and CITY BLOCKS at the top; DELTA, FROZEN BAY and WOODS
  on the right; THE DAM, ICE RINK and TRENCHES at the bottom. Seasons, terrain types, secrets and the rest work on
  them as on any stage, and an entry point that ends up walled in is opened up as everywhere.
- **The twists** (the same ones each time a run reaches that stage):

| Stages | Twist | What happens |
|---|---|---|
| 2, 7, 12 ... | **Two fronts** | the far edge and a flank take turns, a wave each (4 tanks, one more for each extra player). Before every wave from a new edge the game holds back the next tank for a couple of seconds: a klaxon, red arrows flashing where they'll come in and ATTACK FROM THE LEFT! (or wherever) |
| 3, 8, 13 ... | **The eagle moves** | a dirt road runs from your fort to a new fort's site in the middle of an edge beside it (marked out in gold, with a flag). Once a third of the enemy is beaten (or after 45 s) a truck pulls in, takes the eagle and drives it down the road; most of the enemy go for the truck. It waits for any tank in its way (a horn if it waits long) and breaks through whatever was put on the road. Eagle armour soaks hits first, then the truck takes 3 (pips above it); your own shells don't hurt it. Lose the truck and the eagle is lost. When it arrives the fort is built round it to your BASE WALLS level, a new minefield is laid, you respawn beside it, and the enemy now comes from across the new edge (with a warning). The stage isn't won until the truck has arrived |
| 4, 14, 24 ... | **Wind** | the wind blows across the field: every shell flying across it (theirs, yours, the eagle gun's) drifts with it, up to half a tank over a long shot. A wind sock in the left border shows which way and how hard (one to three pips); gusts change the strength now and then, and once in a while the wind turns right round |
| 9, 19, 29 ... | **Ice slope** | an icy map, tilted towards the eagle: any tank on the ice slides that way (you climb away from it slower, they come down faster). The left border shows the slope |
| 5, 10, 15 ... | **Mirror stage** | two eagles on opposite edges, each in its own fort, and the enemy in from both flanks, a wave from each in turn, half of them going for each eagle. Lose either eagle and the game is over. II and IV start by the second eagle |

- **Defences before the stage:** once the curtain opens you have 10 seconds to put down 2 pieces each (1 each with
  3-4 players), with a cursor: arrows move it, **FIRE** puts a piece down, **B** swaps between a **sandbag** wall
  and a **turret** (at most one turret). A sandbag wall faces the nearest edge they come in from: tanks can't drive
  through it and enemy shells stop on it (4 hits; rockets take 2), while your shells fly over it. The turret is the
  usual one. Pieces can't go on a fort, a start, next to an entry point or on the road. Red arrows show where the
  enemy will come in. **ENTER** starts the stage at once (Esc still pauses); the stage also starts when everyone's
  done or the time is up. Nothing moves meanwhile, but your tanks roll in.
- **The streak:** every stage cleared adds one; clearing all four sides in a row pays **5000** to each of you, 10000
  the next time round, up to 20000. Losing the eagle (or the truck, or either eagle in a mirror stage) ends the
  streak, and going on from the checkpoint doesn't bring it back. The line above the field shows the streak and the
  four sides as letters (cleared ones white, this one red).
- **The curtain** shows the next stage in miniature: the map, the eagle (both, in a mirror stage) in gold, red arrows
  where they come in (yellow for the flank), the road and the new fort, the wind or the slope; and beside it the
  twist, the map's name and the streak.
- Base upgrades work on every edge and in every twist: the walls' steel corners, the minefield, the supply drops and
  the eagle gun face the right way at a moved fort too, and a mirror stage's second eagle gets the walls, the armour,
  the minefield, the repair crew and an eagle gun of its own (one eagle's gun never hits the other). A shovel steels
  both forts; a decoy eagle fools everyone.
- Saving: the checkpoint is the start of each stage, with the run's twists, the edge and the streak.

## Corridor

The corridor is an endless climb (the world is three sections of 13 tiles stacked; the bottom one drops away and a
new one appears on top as you go, so the climb never ends). How high you are is counted in metres, a tile each.
The climb is planned from the run's seed: every section has its place in it, so a checkpoint brings back the same one.

- **The hazard.** Something rises from below: a flood in the city and the snow, a wall of fire in the forest and up
  in the sky fortress, lava in the volcano. It waits a few seconds at the start, then creeps up, faster the higher you
  are (a tile every 3 s at the bottom, about every 1.3 s from 800 m on HURT ME PLENTY; half that speed on I'M TOO YOUNG
  TO DIE, 70% on HEY, NOT TOO ROUGH, 15% and 30% faster on ULTRA-VIOLENCE and NIGHTMARE!), and it never falls more
  than a screen and a bit behind the last of you. Fall behind into it and that tank is lost, whatever shield, plates
  or boat it had (SWEPT AWAY!, BURNED!, MELTED!); it comes back above it, on open ground on the screen. Enemies that
  fall in are gone (no points). When it's close the bottom edge of the screen glows, its distance shows in both
  corners (and *LAVA RISING!* when it's very close), tanks near it flash red and it rumbles; the climb meter shows it
  too. It holds still during a boss fight and falls back a screen when you reach a depot.
- **The climb combo.** Every new metre fills the combo meter (the left border); stop for more than a second and a
  half and it drains, faster after four seconds. A third full is **x2**, two thirds **x3**: every point is doubled or
  tripled (the climb itself pays 10 a metre to each of you). Losing a tank empties it.
- **The climb meter** (the left border): the combo (X1 / X2 / X3) and its bar, then the climb from 20 m below you to
  60 m above: the bands in their colours, depots (a green cross), boss gates (red), the medal heights, your best (a
  white line), the hazard rising from the bottom, and you (the yellow arrow).
- **Biome bands.** Every 100 m the corridor changes, and so do its rules, round and round:

| Band | From | Ground and tiles | Twist | Its enemy | Hazard | Music |
|---|---|---|---|---|---|---|
| City | 0 m | asphalt, concrete walls, rubble, street lamps, fuel drums | blackouts | rocket truck | flood | The Climb |
| Forest | 100 m | deep green, the woods grow thicker | wildfire | firebug | wall of fire | Wide Front |
| Snow and ice | 200 m | snow, most lakes frozen, ice patches | blizzards | frost | flood | Turned Around |
| Volcano | 300 m | black rock, basalt for steel, fire vents, most lakes lava, lava running down both sides | lava bombs | magma | lava | The Last Stand |
| Sky fortress | 400 m | steel walkways over a long drop: off the edge is a tank lost (FELL!); landings right across where sections and bands meet; no water up there | gusts (they never blow you off an edge, or into lava) | guster | wall of fire | Starfighter |

  The band changes when the front-runner reaches it: its name comes up with its twist, and the look, weather,
  enemy and music follow (the tunes are other modes' own; with MUSIC STYLE: ROCK or SYNTHWAVE, their rock or synthwave versions). Where two bands meet, their ground blends over a few pixels. The band's own enemy comes
  more often than a season's would.
- **Set pieces**, every third section (each of the six once in every 18 sections, in the run's own order; the name
  comes up as it scrolls into view):
  - **Bridge under fire**: a river right across (lava or the drop up high) with one narrow bridge (two tiles over lava
    or the drop), and turrets on the far bank, one of them guarding the bridge's end.
  - **Convoy crossing**: a road right across between two low walls with a few gaps; tanks drive along it left to right,
    turning to fire at a tank lined up with them, then drive on and off the far side. Cross between them, or wreck one.
  - **Minefield**: open ground sown with mines, taped off with warning signs; one winding way through is clear. A
    shell that meets a mine sets it off (50 points): shoot your way through from far enough away.
  - **Turret gate**: a steel wall right across; its gate opens only when the three turrets in front of it are wrecked
    (a light on the gate for each: red while it stands, green once it's down).
  - **Conveyor climb**: lanes of belts, most of them running down against you, a few running up (a chevron on each belt
    shows which way: green up, red down, yellow across), and belts across that shift you between lanes.
  - **Dark tunnel**: solid rock with a winding way through, dark inside but for your lamp (a pool of light round your
    tank and a beam ahead); enemies show only in it or when they fire. The maze's tune plays inside.
- **Splits.** Now and then a steel wall runs up the middle of a section: one side is **FAST** (open, two supply crates,
  more enemies coming at you there, and a power-up the first time you go in), the other **SAFE** (a slow zigzag).
  The signs at the fork say which is which.
- **Supply depots** every 250 m (just past the gate at 500, 1000 ...): drive onto the pad and every tank is patched up
  (an armour plate at least, a short shield), anyone with no tanks left gets one, and anyone who was out comes back.
  The depot is the **checkpoint**: SAVE GAME (and the autosave) keep the climb from there (*SAVED: CLIMB 250 M*), and
  CONTINUE starts you on that depot's section with the same climb ahead. An older corridor save goes on from the
  section it had reached.
- **Boss gates** every 500 m: the gatehouse (towers, banners, a portcullis) holds the way; nothing more appears above
  it until it falls. Climb into its arena and the boss comes out with its escorts: the ten classic bosses in their
  order (IRON BEAR at 500 m, MOLE at 1000 m ...), each in its own arena, tougher the higher (25% more HP and 7.5% more
  speed per gate, half again the points), with its own music. It keeps to its arena. Beat it and the gate opens (the
  victory tune plays a moment), and the climb goes on.
- **Medals**: bronze at 300 m, silver at 600, gold at 1000. Each comes up as you reach it and is kept for good; the
  title shows them beside the best climb, the result screen with the run's. **The ghost**: a dashed line and a ghostly
  tank mark where your best run ended (NEW RECORD! as you pass it).

## World

**ENDLESS WORLD** is a land without end, made as you drive, the same every time for its seed (a new one every run).
It comes in chunks of 13 x 13 tiles, a classic map's size; the field is a window of chunks round the team (3 x 3 on
the usual screen, more on a wide one) that moves on a chunk at a time as you cross into the next, the land and
everything on it moving with it, so it never ends. What you change stays changed: broken walls are still broken when
you come back, even from far away.

- **Biomes** cover the land in big regions with frayed borders: grassland (home is always grassland), forest, autumn
  woods, snowfields (frozen lakes and rivers), desert (dried-up ponds, cacti, oases), volcano (lava lakes and rivers,
  basalt, fire vents), swamp (bog, reeds, swamp gas), city ruins (concrete, rubble, street lamps, fuel drums, streets)
  and wasteland (hot spots, crumbling walls). Each has its ground, its colours and textures (the seasons' and the
  terrain types'), and while you're in it, its twist (showers, wildfire, gusts, blizzards, hot spots, mirages, lava
  bombs, marsh gas, blackouts) and its own enemy among the others. Crossing into one names it at the bottom of the
  screen.
- **The land:** rivers and lakes run across chunks, woods stand about, and pieces of the 35 classic maps stand here and
  there as old walls. Roads link the chunks (long ones every 4 chunks, every village on one), bridged over water and
  lava. Every chunk is open: you (and the enemy) can always get from one chunk to the next; a pocket walled in by
  steel, water or lava gets a way cut in.
- **Villages** (an eagle in its brick ring, houses round a square): most are attacked as you come near (*VILLAGE UNDER
  ATTACK!*: the first attackers are already at the gate). Hold off 2-4 waves (more further out; the line above the
  field counts them) and it's saved: a tank for everyone, points and supplies on the ground. Lose its eagle and it
  burns. Some are friendly from the start (a gift). A saved or friendly village is a **safe place**: no enemy comes
  in near it, nothing hurts you in its square, its walls mend, a fallen player comes back there when it's close, and
  the game is saved there (each time you come back to a different one too).
- **Ruins:** a walled compound with a chest in each room (points, a star, a weapon crate, or something rare: the gun,
  a tank, a turret, Claude, an airstrike, the ship). Come near and its guards come out, tougher than the rest. Some
  ruins have a steel vault: reach its door and the guardian wakes, one of the bosses (Iron Bear, Harvester, Scorpion
  or Gunship) with its own tune; it goes back in if you run off. Beat it for the big treasure (a tank for everyone,
  the gun and plenty of points).
- **Enemy nests** (factories) turn out tanks while you're near until you destroy them (more hits further out; they
  stay destroyed). Enemies also come in just out of sight, from places that can reach you, and now and then a patrol
  comes down a road. The further from home, the more of them at once and the tougher (the newer types join one by one
  as in the corridor, then veterans and elites); the flag in the side panel shows the danger level. Enemies left far
  behind wander off.
- **Day and night:** a whole day is 7 minutes, mostly daylight: a gentle dusk, a short night (about a fifth of the
  day) and dawn. At night it's dark except round your lights, villages, lamps, lava and gunfire; enemies see less, and
  NIGHT VISION power-ups come. The night brings no more enemies than the day.
- **The side panel:** a compass pointing to the nearest village or ruin still to visit (how far, in tiles, under it),
  the day, villages saved and ruins looted (all their chests open). **The minimap** shows the land you've explored
  round you (the rest stays dark), villages (green when safe, flashing red under attack), ruins (gold), nests (red).
- **Co-op:** the window follows the whole team; anyone left behind when it moves on is brought along.
- **Saving:** the checkpoint is the last safe village: the world (its seed, what you've changed, every village, ruin
  and nest as you left them, what you've explored), the day and your records. RESTART ROUND goes back there too.
- The run ends when everyone is out; its record is how far you got from home (in tiles, M), then villages saved.

## Skill levels

Pick the skill on the title screen (the coloured row; left/right changes it), or change it any time during a game
from the pause menu's **SKILL** row (left/right; not in the daily challenge). The top of the side panel shows the
current skill as DOOM players call them: ITY, NTR, HMP, UV, NM (on AUTO, the level it's at, under a small AUTO).
The names come from DOOM:

| Skill | What changes |
|---|---|
| I'M TOO YOUNG TO DIE | 3 extra tanks; every life starts with an armour plate (like DOOM's half damage) and a spawn shield twice as long; the eagle has 3 free armour each stage and a free repair crew (a fortress block every 5 s); one enemy fewer on screen; enemies mostly wander, rarely make for the eagle, fire about a third as often and move and shoot slower; they only take aim at you within 4 tiles and at the eagle within 2½ (further off they fire at random); they never pick up power-ups; new enemy types come 15 stages later and rarely; no veterans; bosses 50% HP and 40% slower; in VS CPU their HQ upgrades at half pace |
| HEY, NOT TOO ROUGH | 2 extra tanks; spawn shield 50% longer; the eagle has 2 free armour and a repair crew (every 10 s); enemies gentler, mostly wander, take aim within 6½ tiles (the eagle 4); they can't take a grenade, clock or shovel; new types 6 stages later and less often; veterans 15 stages later; bosses 75% HP and 20% slower; VS CPU HQ at ¾ pace |
| HURT ME PLENTY | the default: the full mix of enemies; they take aim at you within 11 tiles and at the eagle within 7 |
| ULTRA-VIOLENCE | one more enemy on screen; enemies fire 30% more, move and shoot faster, arrive sooner, rush and hunt more, and see you and the eagle at any range; more new types; veterans 5 stages earlier; bosses 125% HP; VS CPU HQ upgrades faster |
| NIGHTMARE! | two more on screen and all of that and more (fire +60%, bosses 150% HP, veterans 10 stages earlier), and as in DOOM, enemies you destroy may come back (about 1 in 3) |

**AUTO** (the sixth choice, in blue) adjusts the enemies to how you play. It keeps a rating from 0
(I'M TOO YOUNG TO DIE) to 4 (NIGHTMARE!) and blends every number in the table between the two nearest skills, including
the easy skills' free plates, eagle armour and repair crew. Each destroyed enemy nudges it up, a cleared stage moves it up more
(even more without losing a tank); losing a tank, a hit on the eagle or a lost outpost pull it down, and a game over
pulls it down further. Enemy fire adapts at once; speed, shells and the rest follow with the next tanks and stages.
The rating is remembered between games (a new game starts no lower than 0.5 and no higher than 3.5); the title screen
shows where it stands now and the stage curtain shows the current level, e.g. AUTO: ULTRA-VIOLENCE. Versus games don't
count.

The skill is saved with your settings (also Settings → GAME → SKILL), shown on the stage curtain when it isn't
HURT ME PLENTY, and the host's skill applies to online games. It works on top of all the other settings.

## Smarter and tougher enemies

**Personalities.** In the original every enemy drives at random. Here each tank gets a personality when it
appears. Tanks find their way with a path map that knows they can shoot through bricks but not steel or water.

**No dead ends.** Every entry point has a way to the players: if a map walls one in (steel, water, lava, basalt —
it happens on wider fields mirrored from a classic map), a way through is opened when the stage is built, through
as little wall as possible (steel cleared, water bridged). An enemy that still ends up with no way to anyone or the
eagle for 10 seconds comes in again at an open entry point.

| Personality | What it does |
|---|---|
| Wander | the classic random drive (with the original's pull towards the eagle) |
| Rush | heads for the eagle along the cheapest route and shoots through any bricks in the way |
| Hunt | chases the nearest player |
| Snipe | keeps its distance, lines up with a player (sometimes the eagle) and stops to shell from range; backs off if you get close |

Which personality a tank gets depends on its type, and later stages have fewer wanderers. Settings → ENEMIES →
AI PERSONALITIES: MIXED (default), CLASSIC (all wander) or all RUSH / HUNT / SNIPE. SHOW AI TYPE puts a coloured
dot on each tank: red rush, yellow hunt, blue snipe.

**New enemy tanks** join gradually (marked * in settings, each with its own speed, shell speed and hits):

| Tank | From stage | Look | Ability | Points / XP |
|---|---|---|---|---|
| Rocket | 4 | orange, twin missile pod | slow rockets that blow up bricks and tanks around them; usually a sniper | 500 / 25 |
| Sapper | 7 | khaki, toothed dozer blade | drives straight through bricks, crushing them, and lays mines; usually rushes the eagle | 400 / 20 |
| Shield | 11 | blue, curved front plate | shells hitting the front bounce off (star-3, pierce and rocket shells get through); hit it from the side or back; 2 hits | 500 / 30 |
| Shade | 15 | violet, sleek stealth hull | almost invisible; shows itself when it fires, gets hit or comes near you; usually hunts you | 600 / 35 |

Eight more come from the *Tank 1990 New Enemies* design canvas (the variant used is in brackets):

| Tank | From stage | Look | Ability | Hits / Points / XP |
|---|---|---|---|---|
| Skimmer (Hover) | 6 | blue hovercraft with a skirt ring, no tracks | glides over water; paths straight across rivers | 1 / 300 / 15 |
| Flamer (Torch) | 9 | red, fuel cylinders on the back | a 2-tile flame jet instead of shells: can't be shot down, burns trees, hurts every tank it touches (its own side too); short range, so it's built tough | 6 / 400 / 25 |
| Mason (Crane) | 12 | blue chassis under a yellow gantry | rebuilds an 8px block of shot-away brick every 3 s within 6 tiles (never over a tank); likes to rush the eagle and patch its walls | 2 / 400 / 25 |
| Splitter (Twin Hull) | 14 | two half-hulls along a seam | on its last hit splits into two fast minis (1 hit, 100 points) that rush the eagle; a rocket, mine or grenade destroys it whole | 1 / 300 / 15 |
| Medic (Field Ambulance) | 17 | white with a red cross | every 4 s repairs one hit on a damaged enemy nearby (a beam shows it); tanks that appear near it get a shield | 2 / 500 / 30 |
| Mortar (Long Tom) | 19 | bronze howitzer | stops and lobs a shell over walls at you; a crosshair marks the spot 1.5 s before it lands; can't hit closer than 3 tiles | 2 / 400 / 25 |
| Jammer (Dish) | 21 | grey with a radar dish | inside its 3-tile ring your shells fly at half speed and timed power-ups stop counting down | 1 / 400 / 25 |
| Snake | 13 | a long green snake with red eyes and a flicking tongue | fast, never shoots, slithers through brick (not steel); only its head can be hurt (16 hits, its body stops shells); it hunts you and eats your tank if it reaches you, growing a segment each time; a shield or armour plate makes it recoil | 16 / 800 / 50 |
| Spotter (Sky Eye) | 23 | orange with a red-eyed mast | marks a player it can see along a row or column (steel, brick and trees block its view); while marked, every enemy hunts that player and fires more; the mark fades 5 s after it loses sight, or when the spotters die | 1 / 500 / 30 |

They take a bigger share of each stage as the game goes on (about 1 in 4 tanks by stage 20, about half by stage 35); from stage 23 all 12 types are in the mix. Each season also brings an enemy of its own (see Seasons).
NEW ENEMY TYPES: OFF / FEW / NORMAL / MANY. The score tally adds a NEW row for them.

**Veterans and elites.** From stage 10 some enemies are veterans (2 white stripes: +1 hit, shells 30% faster,
a bit faster, fire more, 1.5× XP), and from stage 20 some are elites (gold stripes and a turret star: +2 hits,
shells 50% faster, 20% faster, fire more, 2× XP). Both grow more common in later stages. VETERANS + ELITES: on / off.

### Maze enemies

MAZE mode has six enemies of its own, found nowhere else (each has a page under ENEMY TYPES; NEW ENEMY TYPES
FEW / MANY / OFF and the skill change how many there are, and so does the number of players). None of them is ever
right by the start.

| Enemy | From | Look | What it does | Hits / Points |
|---|---|---|---|---|
| **Minotaur** | maze 3, in some mazes (more often in the dungeon) | a huge horned war machine, twice a tank's size | slow, but it never stops hunting the nearest of you, along the passages and straight through brick walls; its bulk crushes any tank it touches and it fires heavy shells down the corridor; it comes faster when it sees you. You hear it before you see it: footfalls, louder as it nears, a snort, a roar; while it's close but out of sight the edge of the screen it's behind glows red: *IT'S COMING...* A grenade or Claude only wounds it. Destroyed, it opens the maze's vault. A destroyed tank never comes back right under its nose | 12 (+3 a player; fewer on easier skills, more on harder) / 5000 |
| **Minotaur, the lair's boss** | every 5th maze | crimson and gold, a bar of its own at the bottom of the screen | asleep in its arena until you come in; tougher; straight down a clear line it paws the ground (a *!*) and charges, flattening bricks and anything in the way (its own side too); into a wall and it reels, *DAZED!*, taking double damage. Get close and it rears up (a ring shows how far) and stomps: everyone in the ring is hit and the screen shakes. Beat it and everyone gets 3000 | 24 (+6 a player) / 5000 |
| **Crawler** | maze 2 (most in the dungeon) | a red beetle with mandibles | hides inside brick walls: a glint now and then, red eyes when you're near. Pass close and the bricks shiver, then it bursts out and fights; after a while (or once hurt) it slips back into another wall. Shells hit the brick, not it: shoot its wall away and out it comes. No arrow or minimap dot while it hides | 2 / 500 |
| **Sentry** | maze 2 (most in the machine works) | a twin-barrelled turret on a hazard-striped plate | stands in a corner of a junction and swings to each open way in turn, takes aim (a dotted line down the corridor, its muzzles blinking faster) and fires twice down both lanes, then rests: time your dash. It only wakes when someone is near | 4 / 600 |
| **Locksmith** | maze 3 | a slim fast tank with a big key for a gun and a swag bag | patrols, then hunts you; touching you it steals one of the team's keys (*KEY STOLEN!*) and runs, always away from you (a key in its colour at the edge of the screen shows where it went); destroy it and the key drops. With no key to take it's a fast hunter | 2 / 700 |
| **Mirror** | maze 2, in open rooms | your own tank in glass | copies the nearest of you in its room, left for right, a moment late; fires when you fire, so its shells meet yours head on. Catch it out of step, or meet it in the middle and fire first: a hit makes it reel | 2 / 800 |
| **Mosslump** | maze 2 (most in the dungeon and the sewers) | a dull, scruffy, moss-grown block on four stubby legs | creeps after you without a sound and never fires; it shows no arrow or minimap dot until it's within 3 cells. Right by you it hisses and flashes white, faster and faster, and 1.5 s later it blows up: a crater in the brick (steel holds), and every tank in reach is hit, its own side too. Shoot it while it hisses and it goes up there and then (the points are yours); get out of reach in time and it calms down and creeps after you again | 2 / 600 |

## Online play

Play with friends over the internet, peer-to-peer: the game data goes directly between your computers, with no
game server. Everyone needs the **same version** of the game file (send them the same `tanb4iki_v….html` file you have).
It works in the downloaded file or a hosted copy (e.g. GitHub Pages) in Chrome, Safari, Firefox or Edge;
the claude.ai preview link blocks these connections.

1. **Host:** title screen → **ONLINE: HOST** (left/right on that row switches HOST / JOIN). In the lobby, add
   **+ Online friend** for each friend (and **+ Player on this keyboard** for anyone next to you), up to 4 players.
2. Press **Create invite code** for a friend, then **Copy** and send it to them (any chat app or email).
3. **Friend:** title screen → **ONLINE: JOIN**, paste the invite code, press **Create reply code**, then **Copy** and send the reply back.
4. **Host:** paste the reply under that friend and press **Connect**. After a few seconds it shows *connected ✓*.
5. Repeat for each friend, then press **Start game**, pick a stage and play.

The host's computer runs the game and the host's settings apply. Friends use their usual keys or gamepad and see the
host's game, with its sounds. Each friend chooses their own items in the shop; the host controls stages, pausing and saving.
If a friend drops out, their tank waits; the host can send a new invite from the pause menu → **ONLINE PLAYERS**.
A friend leaves with Esc → **Leave game**. Codes work once; if a page is reloaded, make new ones.

Every mode plays online. **Tank Rally**, **Astro Tanks** and **Desert Dominion** (which draw their own screens) send
the host's screen to the friends as pictures, 20 a second (about 120-270 KB/s each), with its sounds and music; the
friend's keys drive their tank as in the other modes. The host runs the career and hangar menus there. In Desert
Dominion the friends are co-commanders of the host's House: each moves a cursor of their own (numbered, in its own
colour) with the d-pad, FIRE clicks and B cancels, with a selection of their own.

**If it says "couldn't connect":** some networks (offices, schools, some mobile hotspots) block direct connections
between computers. Try another network (e.g. a home Wi-Fi), or this would need a relay server.

## Boss rounds

Every 10th stage is a boss stage: the boss plus a smaller group of escort tanks (8 by default). Destroy the boss to clear
the stage; its escorts blow up with it. There are ten bosses, so with the default setting the last one, the UFO, comes
on stage 100. After that they come round again with +50% HP each time. In 2-player games boss HP is 50% higher.
Beating a boss scores 5,000–20,000 points and gives 25% off in the next shop. A power-up drops at 75%, 50% and 25% HP.

*The UFO is the final boss... or is it? Beat it and keep going.*

**Boss screens.** Before each boss there's a picture of it in its own scenery ("WARNING! BOSS APPROACHING", its
name, two lines on how it fights) and after it falls a victory picture (the wreck, your tank with a flag, a last
word and the points). Enter or fire moves on; they move on by themselves after 7 seconds. They don't come up again
when you restart the round. Settings → GAME → BOSS SCREENS.

**Phases.** Every boss has three: above 2/3 of its HP, above 1/3, and the rest. Marks on the HP bar show where they
change, and the bar turns orange, then flashing red and yellow. At each change the boss reels for a moment, the new phase's
name comes up ("IRON BEAR: BERSERK"), its hull shows the damage (scorched plates, then holes, missing parts, smoke and
then fire), and it fights differently from then on. Every big attack still flashes a warning first.

| Stage | Boss | Phase 1 | Phase 2 | Phase 3 | How to beat it |
|---|---|---|---|---|---|
| 10 | **Iron Bear** | ARMORED: 3-shell volleys; flashes red, then charges in a straight line crushing bricks | RAGING: faster; calls 2 escorts; after a charge it turns and charges again | BERSERK: the ram plate is torn off; 5-shell volleys, almost no wind-up, a ring of shells when it shakes off a daze | it's dazed after a charge (longer if it hit steel) and takes double damage |
| 20 | **Mole** | DIGGING: moves underground, surfaces after a dust swirl, fires 8 shells in a cross | FRENZIED: pops up twice in a row and leaves mines | TREMORS: the drill snaps; while it's under, the ground bursts up under each player (a swirl warns first) | hit it while it's up; keep moving in phase 3 |
| 30 | **Harvester** | HARVEST: a combine harvester racing for you, ramming tanks, smashing bricks and mowing trees, dropping hay bales | OVERDRIVE: faster, flings sheaves to both sides | ON FIRE: flat out, leaving burning ground | lure it into steel: it stalls and takes double damage |
| 40 | **Hydra** | THREE HEADS: gatling, laser beam and rocket turrets on an island | REGROWING: a lost head grows back once | BARE CORE: swings wide, the core fires faster and shoots laser beams | a ship is provided; break the heads, then the core |
| 50 | **Gunship** | PATROL: a helicopter flying over everything, lining up with you for gun bursts, rocket pairs | AIR ASSAULT: drops paratroopers | GOING DOWN: reels about dropping a carpet of bombs (red crosses mark where) | keep out of its lines; it never fires through your eagle |
| 60 | **Phantom** | CLOAKED: nearly invisible, shows itself only when firing; teleports and leaves decoys | HAUNTING: the decoys fire too | UNMASKED: the cloak is broken; it blinks to a spot lined up with you and fires three at once | decoys pop in one hit; only the real one leaves tracks on the ice |
| 70 | **Armored Train** | FULL STEAM: runs along one of two tracks (signals flash and it whistles first), crushing whatever's on the track; cannon and rocket wagons | TROOPS OUT: tanks jump off the troop wagon | DERAILED: the wagons blow up and the engine jumps the rails and hunts you | the engine is armored until all three wagons are wrecked |
| 80 | **Scorpion** | STALKING: walks over bricks, steel and water; its sting lobs shells at you (a red cross marks where); its claws pinch a tank in front of it | VENOM: two stings at a time; each leaves a poison pool that gets you if you stay in it | FRENZY: a claw is gone; faster, three stings in a row, the claws fire shells | when the claws snap open, get out of the way |
| 90 | **Dreadnought** | BATTLESHIP: cannons that break steel, a hatch that releases armor tanks | MINELAYER: the left cannon is shot off; mine lines and spread volleys | MELTDOWN: the hatch blows, the reactor shows; it crawls toward the eagle firing laser beams | dig through its steel with star-3 or rocket shells; stay mobile in phase 3 |
| 100 | **UFO** (final boss) | INVASION: rings of plasma; a tractor beam that pulls a tank up into it ("ABDUCTED!") | FORCE FIELD: hits bounce off except just after it attacks; drones; it blinks about | CRASH-LANDED: the saucer comes down in flames and its pilot, a little alien with a ray gun, climbs out | walls hold you back from the beam, so drive out sideways; shoot it right after it fires |

Settings → BOSSES: boss rounds on/off, boss every 5–30 stages, boss HP 25%–300%.

**Boss gallery** (Settings → ART → BOSS GALLERY): every boss you've met, tanks and galaxy alike, with its picture from
before the fight, and once beaten the one from after it (FIRE turns it over; < > turn the pages). A boss you haven't
met isn't shown at all, not even its name. The book is kept in the browser.

## Save and load

Every mode can be saved (except online games, the daily challenge and the player-against-player matches: VS
EAGLES for 2-4, DEATHMATCH, FLAGS). Each mode has its own save slot (and each GALAXY run type: campaign, boss rush,
endless, daily — a daily run's save only lasts its day).

- **Classic and big maps:** pause (Enter, P or Esc) and choose **SAVE GAME** to save exactly where you are: the stage,
  terrain, tanks, scores, lives, upgrades and mines.
- **Every other mode** saves a *checkpoint*: the start of the current stage, round, wave, the corridor's last supply depot, fortress
  build phase or galaxy sector (after the hangar, so what you bought is kept), or the endless world's last safe village, with everyone's score, lives, upgrades,
  weapons, perks and credits as they were then. SAVE GAME says where you'll resume ("SAVED: START OF SECTOR 5").
- The game also saves automatically at the start of every stage (and at each of those checkpoints).

**RESTART ROUND** in the pause menu (press it twice) starts the stage over, with everyone's score, lives, stars and
weapons as they were when it began. In Fortress it's **RESTART WAVE**: back to the build phase before the current wave,
with the towers, gold and eagle HP you had then. Not in the daily challenge.
Choose **CONTINUE** on the title screen to resume the save of the mode that's selected (it shows where, e.g.
"CONTINUE SECTOR 5"); the game opens paused so you can get ready. Saves are kept in the browser; a save from an older
version that can't be used any more is dropped with "SAVE TOO OLD".

The stage picker at the start of a new game remembers the stage you last played. You can pick any of the
35 maps, or any stage up to the furthest one you have reached (up to 99).

If the browser won't store a save (its storage for the page is full, or blocked — some browsers and private windows
block storage for pages embedded in another site), the save is kept in memory until the page is closed, and the
message says so: NOT KEPT: STORAGE FULL or NOT KEPT: STORAGE BLOCKED. Playing the downloaded single file, or in a
normal window, usually fixes it.

## Field size and full screen

The classic field is 13×13 tiles. In Settings → SCREEN you can set **FIELD WIDTH** (13–60) and **FIELD HEIGHT** (13–40),
or choose **FIT** to match the window's shape. Bigger fields extend each stage by mirroring it outwards, with the
eagle kept at the bottom centre. **FIT TO MY SCREEN** sets everything at once for a laptop such as a 13" MacBook:
FIT width, FILL scaling and fullscreen. On a 16:10 MacBook screen in fullscreen that gives a 19×13 field.
**SCALING** is SHARP (whole-pixel scaling, crispest) or FILL (uses all the space).

## Shop

After each cleared stage, once the score tally finishes (Enter shows it all at once, and again goes straight on), the shop opens. The points you've earned are your money,
but spending them never lowers your score: the shop shows what you have left to spend, while your score (and the
high score) keeps every point you earned. In 2-player games player I shops first, then player II. Use up/down to pick,
**A** (fire/Enter) to buy, and **Esc** when you're done.

| Item | Price | Effect |
|---|---|---|
| Revive | 7500 | bring a fallen player back with one tank (theirs or a teammate's turn) |
| Extra life | 5000 | one more tank |
| Star | 3000 | upgrade your tank one star (up to 3) |
| Gun | 8000 | max level and tree cutting |
| Ship | 3000 | cross water; the boat soaks one hit |
| Mines | 1500 | adds mines (3 by default) for the B button |
| Shovel | 2000 | steel walls around the eagle at the start of the next stage |
| Helmet, turbo, rapid, spread, rocket, pierce | 1000–3000 | that effect is active when your tank first appears in the next stage |
| Cannon, machine gun, laser, flamethrower, mortar, tesla, missiles | 0 / 1500–5000 | the next MK of that weapon, in hand (see [Weapons](#weapons)); the cannon, and a weapon you have at MK IV, are free to take back |
| Turret | 4000 | one turret to place with **B** |
| Claude | 6000 | Claude joins you at the start of the next stage |
| Wingman | 5000 | an AI tank fights beside you next stage |
| Decoy eagle | 3000 | a fake eagle lures rushing enemies next stage |

Upgrades you buy are kept until you lose a tank, as with ones picked up during play. In Settings → SHOP you can turn the shop off or
scale all prices (25%–300%). There is no shop after a game over.

**Base upgrades** (orange icons, at the end of the list) improve the eagle's fortress. They belong to the whole team:
any player can buy the next level, and they stay from stage to stage until the game is over (they are kept in saves).
The status column shows the level you have (`L2/5`) and the line below says what the next level adds.

| Upgrade | Levels | Price per level |
|---|---|---|
| Base walls | extra brick ring / steel inner corners / steel inner ring / steel outer corners / all-steel fortress | 4000 – 18000 |
| Eagle armor | the eagle survives 1 – 5 hits each stage (cyan outline, gold from 3) | 3000 – 15000 |
| Repair crew | rebuilds one missing fortress block every 10 / 7 / 5 / 3 / 2 s | 2500 – 10000 |
| Eagle gun | a turret on the eagle shoots enemies lined up above or beside it: every 3 s and 4 tiles at level 1, up to every 1.3 s and 8 tiles at level 5, where its shells also break steel. Its shells pass through your tanks and never break the fortress; its kills earn no points | 6000 – 20000 |
| Minefield | 2 / 4 / 6 / 8 / 10 armed mines in front of the fortress at the start of each stage (on any ground a tank can drive on: open, trees, ice, mud, bridges, belts; your mines always show, even under trees) | 2000 – 6000 |
| Tesla coil | zaps every enemy within 2 → 4 tiles of the eagle, every 3 s → every second | 6000 – 16000 |
| Tank traps | enemies near the eagle (2.5 → 4.5 tiles) move 30% → 70% slower; a dotted arc marks the zone | 2500 – 9000 |
| Supply drop | a power-up lands just in front of the fortress every 60 / 45 / 35 / 25 / 20 s | 4000 – 12000 |

After a shovel runs out, the walls go back to their upgraded state, not plain brick. Settings → SHOP → BASE UPGRADES
turns them off.

## New power-ups

These 16 were not in the original game. They're marked with `*` in Settings and can be switched off there.

| Power-up | You get | If an enemy grabs it |
|---|---|---|
| **Turbo** (lightning) | 1.75× tank speed for 15 s | that tank speeds up |
| **Rapid** (three shells) | up to 4 shells on screen and quick fire for 15 s | that tank fires much more often |
| **Spread** (arrows) | every shot also fires left and right for 15 s | that tank fires 3-way |
| **Pierce** (arrow through wall) | shells pass through tanks, enemy shells and bricks for 15 s | its shells pierce too |
| **Rocket** | shells explode, breaking bricks and damaging nearby tanks, for 15 s | its shells explode (and can hurt the eagle) |
| **Mines** | 3 mines; drop one with **B**; it arms after a moment and blows up the next enemy that drives over it | that tank lays mines for you |
| **Ghost** | drive through bricks and water for 15 s | that tank drives through walls |
| **Coin** | 1000 bonus points | it steals 1000 points from each player |
| **Turret** (tripod) | adds a turret to the ones you carry: **B** puts it down wherever you are. It swings round to the nearest enemy within 8 tiles and fires once lined up; 3 hits; never fires across your eagle; its kills score for you | a red turret that shoots you |
| **Claude** (the orange Claude sparkle) | Claude walks the field for 20 s, chirping, and eats every enemy tank (armor included) and enemy shell it bumps into; it nibbles bosses; points are yours | "NOPE!": Claude doesn't work for them (only players can collect it by default) |
| **Revive** (heart) | every fallen teammate comes back with one tank; if nobody is down, an extra life | 2 more enemy tanks join the stage |
| **Bridge** (planks) | 2 bridge kits: drive into water to lay a bridge | that tank can cross water |
| **Smoke** (cloud) | enemies lose track of you for 15 s | that tank fades into smoke |
| **Night vision** (goggles) | night stages only, as every second power-up there: the whole team sees the whole field (in green) for 20 s, flickering back to dark in the last 2 s | can't take it |
| **Airstrike** (plane) | a plane flies along the row with the most enemies (never the rows by your eagle) and bombs it | the plane bombs your row |
| **Weapon** (a crate with a letter) | the weapon on the crate, or its next MK if it's the one in hand (see [Weapons](#weapons)) | can't take it |

## Weapons

Every tank starts with the classic **cannon** (made better by stars, as always). Six more weapons come from **WEAPON
crates** (a power-up with the weapon's letter on it; half the time it's the one a player has in hand, so it can level
up) and from the shop. Each has four levels, **MK I – MK IV**. Fire (A, or B when you carry no mines or turrets) uses
the weapon in hand; its letter and level pips show in the left border, in your colour.

| Weapon | How it works | Higher MKs |
|---|---|---|
| **M** Machine gun | hold fire: a stream of light bullets, half a hit each | faster, more bullets; a twin stream from MK III |
| **L** Laser | an instant beam through every tank in line; it burns enemy shells in its way while it shows | cuts a tank-wide gap through brick (a block deep per shot at MK I, all the way from MK II), more damage and through front shields from MK III; wide and endless at MK IV |
| **F** Flamethrower | hold fire: a short cone of fire that burns tanks, trees (sets them alight in summer) and shells; bricks crumble in it, slowly | longer and hotter |
| **G** Mortar | lobs a shell over walls onto the first tank lined up ahead (or, with none, the first brick wall ahead); a blast that breaks brick | further, bigger blasts; breaks steel at MK IV |
| **T** Tesla | lightning to the nearest enemy in reach: no aiming, walls don't stop it; with nobody in reach it bursts the wall ahead | longer reach, jumps on to 1 / 2 / 3 more tanks |
| **H** Missiles | homing missiles that fly over walls, pick their own targets and blow up; fired at a building straight ahead (a BIG MAPS factory, the CPU's HQ) they go for it, not the tanks round it; with no target they blow a hole in the first wall they meet | more damage; 2 at once at MK III, 3 at MK IV |

Every weapon hurts the enemy's buildings too: the BIG MAPS factories and the CPU's HQ (the mortar lands on one lined up ahead, the tesla zaps one in reach, the flamethrower burns it, missiles home on it when no tank is near).

Every weapon can break its way through brick, so none leaves you stuck behind a wall. A crate with the weapon you have raises its level; a different one swaps to it (each weapon remembers its level, so
you can buy or find your way back). Losing a tank costs a level of the weapon in hand, and at MK I you're back to the
cannon (unless KEEP STARS ON DEATH is on). Weapons hurt bosses, the enemy HQ and factories too, and in versus the other
players (lighter weapons add up: two machine-gun bullets make a hit).

Balance: with a bot that plays whole stages holding fire, each MK I does about as well as the bare cannon (a sidegrade
with its own trick) and each MK IV about as well as a 3-star cannon, so the difficulty curve and the skill levels
still mean what they did.

## Wingman, decoy eagle, smoke and bridges

- **Wingman** (shop, 5000): a white AI tank with a blue dot joins you at the start of the next stage. It hunts the
  nearest enemy, shoots through bricks in its way, never fires across your eagle, survives one hit and its kills score
  for you. Losing it costs no life.
- **Decoy eagle** (shop, 3000): a fake eagle (straw-coloured outline) stands in the middle of the field. Rushing
  enemies, base hunters and snipers go for it first; it takes 2 hits.
- **Smoke** (power-up): for 15 s enemies, their turrets, spotters and
  bosses lose track of you (they still bump into you). An enemy that grabs it fades into smoke.
- **Bridge kit** (the power-up gives 2): drive into water and a bridge is laid straight across it; it
  stays for the stage and anyone can use it. Carried kits show as brown dots in the side panel. An enemy that grabs
  the power-up can cross water.

## Construction and custom levels

CONSTRUCTION on the title screen opens the level editor (a help screen shows the keys the first time; **H** brings
it back). It has five pages: **TERRAIN** (painting), **MARKERS**, and the menus **LEVEL**, **ENEMIES** and
**POWER-UPS**. **Tab** goes to the next page; so does the page button on the panel (MAP, MRK, LVL, ENM, PWR), and on
the menu pages the page names on the panel and the page title (left / right on it) take you anywhere. Esc on a menu
page goes back to the map. With a gamepad, walk the cursor off the right edge of the map to reach the panel: the
palette first (the arrows pick a tile or marker, A goes back to the map), and down off it the buttons (up / down, A
presses, left goes back).

- **Tiles:** the palette on the right has every terrain: brick and steel (whole and half tiles), water, trees, ice,
  mud, a bridge, conveyor belts in four directions, a teleporter pad (pads pair up in the order you place them) and
  empty ground; its second page (the arrow in its bottom corner turns it, and Q / E go on to it) has the terrain
  types' tiles and the elements: lava, basalt, a fire vent, bog, reeds, swamp gas, concrete, rubble, a street lamp,
  barrels, a supply crate, deflectors (/ and \\) and a manhole (manholes pair up like pads). Pick one with **Q / E**
  or a click; **A** / Space places it at the cursor (again on the same spot: the next tile), **B** the previous one.
  With a mouse, click or drag on the field to paint. A custom level keeps exactly what you painted: the terrain types
  add their own features only to the normal stages.
- **Markers** (the MARKERS page; the palette shows them, Q / E or a click picks one, A puts it at the cursor):
  the **eagle** (anywhere; its brick fortress moves with it, and nobody paints over it), the **starts** of players
  I-IV, up to 8 **enemy entry points** (numbered: they're used in turn; tanks come in facing the eagle), up to 12
  **power-up spots** and where the **boss** starts. A again on an entry point, spot or the boss's spot takes it off,
  as do **B** and ERASE; the eagle and the starts only move (a start put on another player's swaps with it). Every
  page of the map shows the markers.
- **Map size** (LEVEL → WIDTH, HEIGHT): from 13 x 13 up to 40 x 30 tiles. What you painted (and the markers) stays
  where it fits, from the top left. A map bigger than the window scrolls with the cursor; **O** (or ZM on the panel)
  shows all of it at once, and you can paint and place markers on that too. The status line above the map says the
  size and where the cursor is.
- **LEVEL** also has the **season**, the **weather** (AUTO: as the settings say; CLEAR, NIGHT, FOG), the **EAGLE**
  (OFF: no eagle and no fortress, and the enemy hunts you instead), the **GOAL** (DESTROY ALL; or HOLD OUT: the
  line-up comes round again and again until the clock runs out, then whatever is left goes), a **TIME LIMIT** (1-30
  minutes: run out of it while destroying them all and it's game over; holding out takes 3 unless you say) and
  **LIVES** (the tanks each player has on this level). The clock shows above the field.
- **ENEMIES:** the **LINE-UP** is AUTO (the stage's usual tanks) or CUSTOM: up to 10 groups, each a count (1-50), a
  type (every enemy, the seasons' and terrain types' own too), a rank (NRM, VET, ELI), hits (-- is the type's
  usual) and a speed (50-200%). Left / right change the field, A / B move between the fields, a count down to 0 or
  Delete removes a group, **+ ADD TANKS** adds one. The **ORDER** is MIXED (shuffled, the same every time) or IN
  TURN (group after group). Then how many are on the field **AT ONCE**, a new one **EVERY** so many seconds, and a
  **BOSS** (any of the ten) with its **HP** (25-500%, on top of the BOSS HP setting). With a custom line-up the boss
  comes as well as the line-up, and the level is clear when both are beaten; with AUTO it brings its own escorts,
  as on a boss stage.
- **POWER-UPS:** USUAL (as in the settings) or CHOSEN (switch each one on or off; ALL ON / ALL OFF), and **TIMED
  DROPS** (one every 10-90 seconds while none is out). With power-up spots marked, the level's power-ups (from bonus
  tanks, timed drops, the boss) land on one of them; hidden ones, crates and supply drops keep their own place.
- On the menu pages: up / down pick a row, left / right change it (A and B too); with a mouse, click a row, then
  its left or right part (the wheel scrolls). The line above the page says what the row does.
- **R** (or RND on the panel) makes a **random level**: a symmetric map in the classic style (walls, steel, ponds,
  trees, ice, mud, sometimes a bridge, a belt or a pair of teleporters), checked so that every enemy entry point and
  both players can reach the eagle. On a level with its own size or markers, classic-style maps are laid side by
  side to fill it, the markers are kept clear and the fortress goes round the eagle, checked the same way.
- **T** (or the three letters on the panel) sets the level's **season**: ANY (the stage's usual one), BLK (classic
  black), one of the six or one of the terrain types (VOL, SWP, CTY).
- **8 slots** (1-8, PgUp / PgDn, or the S1 on the panel): each holds a level and its settings, saved as you go.
  Delete (on the map pages) clears the slot back to a blank 13 x 13 level.
- **Enter** plays the level you're editing; Esc goes back to the title.
- **CUSTOM LEVELS** (on the title screen's MODE row) plays every slot you've filled, one after another, as a normal
  game: tally, shop, base upgrades, the stage number (and the enemy) going up as you go round again. The curtain
  names a level's boss, weather and goal. Each level plays on its own field (scrolling, with the minimap, when it's
  bigger than the screen), and saves work as in the other modes (a checkpoint at the start of each level; a level
  played from the editor saves exactly). Levels made before any of these settings existed play exactly as they did:
  13 x 13, the eagle at the bottom, the classic entry points.

## Seasons

Every stage has a season, with its own ground, colours and something drifting across the screen (Settings → GAME →
SEASONS: CYCLE, a new one every stage (default); RANDOM; OFF, the classic black; or always the same one). After the
six seasons come three **terrain types** with tiles of their own (see below), so CYCLE goes spring, summer, autumn,
winter, nuclear winter, desert, volcanic, swamp, city ruins and round again. The stage curtain names it and its twist. Each season also changes the rules a little and has an enemy of its own that you
meet nowhere else (3 or more per stage, more later on; FEW / MANY in NEW ENEMY TYPES apply). Settings → GAME →
SEASON EFFECTS turns the twists off; each seasonal enemy has its own APPEARS switch under ENEMY TYPES. Boss stages
keep the look but not the twist.

| Season | Look | Twist | Its own enemy |
|---|---|---|---|
| Spring | dark green ground, blossom on the trees, petals in the air | **Showers**: now and then it rains for 12 s and puddles of mud (slow going) form on open ground; they dry up a while later | **Hopper** (green and pink, on springs): when a thin wall or water blocks it, it jumps over; shells fly under it mid-jump. 1 hit, 300 |
| Summer | deep green, fireflies at dusk | **Wildfire**: explosions set nearby trees on fire, and the heat starts the odd fire by itself; fire spreads from tree to tree and burns them away; a tank in the flames burns (you get a moment to drive out, longer on easier skills) | **Firebug** (an orange beetle): its shells set fire to trees as they pass and to the ground where they land; it never burns itself. 2 hits, 400 |
| Autumn | brown ground, orange and red trees, falling leaves, darker water | **Gusts**: every so often a 4-second gust shoves every tank one way (the border shows which) | **Guster** (a big fan up front): blows you backwards while you're in front of it (up to 6 tiles, walls block it); fires less. 3 hits, 400 |
| Winter | snowy blue-grey ground, snow on the bricks, steel and trees, snowfall | most lakes are frozen over (ice: slippery, but you can drive across). **Blizzards**: now and then a 10-second whiteout: you only see what's close, and the enemy fires less | **Frost** (pale blue, icicles): its shells freeze you solid for 2.5 s instead of destroying you; a second hit while frozen shatters you. Its shells freeze the water they fly over. 2 hits, 400 |
| Nuclear winter | ash-grey ground, scorched bricks, dead trees, toxic green water, falling ash, a sickly tint | some lakes are frozen. **Hot spots**: glowing radioactive patches (3 or more, never at the start points); stand in one and your Geiger counter fills (a bar over your tank, clicking faster); full, and your tank is gone (3 s on Ultra-violence, twice that on the easiest skill). Out of them it drains away. A shield protects you | **Ghoul** (skull turret): destroyed, it leaves a glowing wreck that rises again 4 s later with full strength, once, unless you shoot the wreck (100). The stage isn't clear while a wreck lies there. 2 hits, 500 |
| Desert | sand, sandstone bricks, cacti, drifting sand | many ponds have dried into mud (it slows you). **Mirages**: phantom tanks shimmer into view now and then; their shells can't hurt, and a shot or a touch makes them vanish (no points); they never hold up the end of a stage | **Burrower** (a drill nose): dives under the sand for a few seconds (a moving mound; shells fly over it, it can't fire), runs faster down there and surfaces somewhere else to fire. 2 hits, 500 |

### Terrain types: volcanic, swamp, city ruins

The three terrain types change the map too: in the normal stages each brings tiles of its own, placed the same way
every time a stage is played and never next to the eagle or on the start and entry points (custom levels keep what
you painted; boss arenas, the maze and the fortress only take the look; the corridor's bands have tiles of their own). Each has a twist and an enemy
of its own, like the seasons.

| Terrain | Look | Its tiles | Twist | Its own enemy |
|---|---|---|---|---|
| Volcanic | black rock with glowing cracks, scorched bricks, charred trees, rising embers, a red glow | most lakes are **lava**: drive in (your tank's middle over it) and you're gone, a life, whatever shield or armour you had; a glowing rim and a red outline on your tank warn you at the edge. Shells fly over it, enemies keep out of it. Steel is **basalt**: shells bounce off, a power shell cracks it and a second one breaks it. **Fire vents** (dark craters): every 5 s they bubble for a second, then a column of fire: any tank on one is hit | **Lava bombs**: now and then the volcano spits 3-5 bombs, one aimed near each of you; a growing shadow (and a red cross at the end) marks each spot for 2 s; where one lands, tanks are hit (both sides), bricks break and the ground burns a while | **Magma** (a rock hull with glowing seams): crosses lava, fireproof (vents and fire don't hurt it), leaves a trail of burning ground. 3 hits, 500 |
| Swamp | dark marsh, mossy bricks, murky green water, fireflies, drifting mist | mud is **bog**: slower than mud, and stand still in it and you sink (the bog closes over your tank, bubbles, SINKING!); sunk after 3 s, you take a hit; drive and you work your way back up. **Reeds** along the shores: they hide tanks like trees and burn fast (a flame, a fire, a blast). **Swamp gas** (green bubbles on the bog): a shell through it, a flame or a blast lights it: a hiss and 0.4 s later the whole pocket blows up, block after block (hurts every tank near, breaks bricks) | **Marsh gas**: now and then new gas bubbles up out of the bog | **Gator** (a long snout, legs): swims under the water (only its eyes show; shells pass over it), and when a tank comes in line within 4 tiles it surfaces, opens its jaws (a warning) and lunges: a bite is a hit. It never fires. 2 hits, 400 |
| City ruins | asphalt with lane markings, red bricks, drifting dust | many walls are **concrete**: 3 hits to break (2 with power shells), cracking each time, then it's rubble. **Rubble** slows you a little; shells pass. **Fuel drums** (blue barrels, see below). **Manholes**, in linked pairs: drive onto one and you come up out of the other (shells roll over them). **Street lamps** light up the dark round them (city stages are often night or fog); a shot knocks one down | **Blackout**: a 12-second power cut: dark (if it wasn't), the street lamps out too; only tanks, shots and fire give light | **Rocket truck** (a cab and a rack of four rockets): keeps its distance; when it sees you (up to 11 tiles away; walls and trees block its view) it sends three rockets at that spot, marked with yellow corners for 1.3 s (red as they come in): move and they miss. Never at the eagle. 2 hits, 500 |

## Galaxy (a shoot-'em-up)

Your tanks fly at the bottom of a starfield (left/right/up/down within the lower part of the screen) and fire straight
up. 1-4 players together, here or online.

- **Controls:** hold FIRE to fire. **Tap B** to swap to your other weapon, **hold B** for FOCUS (half speed, your tiny
  hitbox shown as a dot), **double-tap B** for a bomb (damage to everything on screen, their shots gone).
- **Runs** (GALAXY RUN, picked with left/right on the galaxy title screen or the first curtain, or in Settings → GAME):
  - *Campaign*: the fourteen sectors, then round again.
  - *Boss rush*: the fourteen bosses back to back, from power 4 and 3 bombs; the hangar after every third boss; the
    clock runs. Best: most bosses, then the fastest full clear.
  - *Endless*: random waves forever, getting harder every wave; a boss every 6 waves, the hangar every 12, a new sky
    each boss. Best: the furthest wave.
  - *Daily*: the campaign with today's shuffled waves, the same for everyone that day; its own record for the day.
- **Heat and the charge blast:** firing heats the gun (about 8 s of nonstop fire overheats it: no fire for a moment).
  Stop firing for half a second and it charges instead (a glow round your ship); the next press of FIRE lets go a big
  charge blast that goes through everything. Rapid fire upgrades run cooler.
- **Two weapons:** you carry two. A gift box of a new weapon goes in hand (the old one to the other slot, or replacing
  the one in hand when both are full); the weapon in hand again: +1 power; the other one: switch to it, +1 power.
  Both are in the side panel, with the heat bar under them.
- **Team combo:** kills in a row (each within 2 s, 3 s in co-op) build a multiplier up to x8 (every 8 hits), shown top
  right. Any hit that costs something (a plate, a ship) breaks it.
- **Grazing:** an enemy shot that passes close to your ship without hitting it gives points and fills a bomb meter
  (a bomb every 25 grazes).
- **Losing a ship** costs two power levels, but they drop as two power cells you can grab back (only you for 6 s).
- **Perks:** after waves 2 and 4, three perk capsules float in: fly into one (one each in co-op; the wave waits up to
  10 s): firepower, rapid fire, engine, magnet, a drone, armour, bombs, power, crit (10% double damage a level),
  luck (more drops), a shield at every wave start, or (rarely) a life.
- **Wave 4** of every sector is a **mini-boss** (gunship, carrier, turret ring or warden, each with its own
  attacks and an HP bar) or, in sectors 3, 6, 9 and 12, a **challenge stage**: 40 harmless enemies looping through in
  five groups; points for each hit and each whole group, and 10000 for a PERFECT.
- **Medals** after each wave: NO HIT, SPEED, PERFECT, with points for everyone.
- **The captor** (in formations from sector 2) sometimes stops and beams a tractor cone down: a ship caught in it is
  captured (a ship lost) and carried off. Shoot that captor and your ship comes back as a **twin fighter** beside
  you, firing with you and taking the next hit for you.
- **Co-op:** loot from your kills is yours for 3 s (a small mark in your colour); when a player loses their last
  ship an escape pod drifts about for 25 s: hover over it for 1.5 s to bring them back.
- Big kills shake the screen and freeze it for a moment; losing a ship slows time down.
- **The skill** goes much further here than in the tank game: on ULTRA-VIOLENCE and NIGHTMARE! enemies and bosses have
  1.4x / 1.85x the hit points, fire 1.7x / 2.5x as often with faster shots, more of their shots are up at once, the
  small fry aim at you (40% / 65% of their shots) and less loot drops. I'M TOO YOUNG TO DIE is gentler than before.
  With EXTRA LIFE set to EVERY, galaxy gives a life every 250K (its scores run much higher).
- **The bosses** are bigger and more detailed, show their damage phase by phase (cracks, sparks, holes, broken
  parts), and have about a third more hit points and one more attack in their last phase.

- **Sectors:** fourteen, each with six waves and a boss: Moon Orbit, Red Planet, Asteroid Belt, Ice Giant, Nebula,
  The Core, Earth Orbit, Time Vortex (a swirling tunnel), Saturn Rings, Cyberspace (a green grid and falling code),
  Dark Star, The Well (a Tetris well: a faint grid, brick walls, tetrominoes falling in the dark, lines flashing as
  they clear), The Slop Feed (an uncanny pastel haze, melting stars, garbled watermarks drifting by, sparkles and
  glitches) and The Last Base. Then round again, tougher, with each sector's waves shuffled and a couple of surprises.
- **Waves:**
  - *formation*: they fly in to a grid, sway, and break off to dive at you
  - *swarm*: streams weaving across the screen
  - *rocks*: an asteroid shower; big rocks split, then split again
  - *kamikaze*: drones dropping straight at you
  - *bombers*: laying bombs as they cross the top
  - *escort*: armoured ships circled by drones that dive when their ship goes down
  - *flying toasters*: chrome toasters on white wings drifting down and across, like the old screensaver, dropping
    toast
  - *screensaver*: the DVD logo bouncing off every edge, a new colour each time; if it hits a corner exactly,
    everyone gets 2000 points and gems
  - *rush hour*: flying taxis and police cars zooming along traffic lanes, your part of the screen included; a
    flashing arrow at the edge warns of each car
  - *sentinels*: squid-like machines that hunt you down for a while
  - *holy cow!*: cows flung up from below (a red ! marks where) that fly up and fall back
  - *invaders*: a marching block that steps across, drops a row at each edge and speeds up as it thins out; only the
    bottom of each column shoots; a mystery ship crosses the top for 300-1500
  - *falling blocks*: tetrominoes coming down a step at a time, turning as they go, losing a block with each hit
  - *garbage*: grey rows rising from below through your part of the screen, each with a gap: fly through it (red
    arrows along the bottom show where a row comes up, and where its gap is)
  - *line clear*: blocks drop into a row across your zone; once it's full it flashes and fires a laser along it. Shoot
    a block out of it to keep it from filling (run it out of blocks: BLOCKED!), or get off that line
  - *T-spin*: T pieces turning a quarter at a time and spraying shots out of their three arms
  - *lances*: I pieces follow you along the top, stop and take aim (a red line down their column), then drop
  - *six fingers*: a waving swarm of six-fingered hands; now and then one turns red, a dotted line shows where it's
    reaching, and it grabs
  - *chat bubbles*: they float in typing "..." and burst into a spray of letters (red !!! just before): shoot them first
  - *glitch clones*: jittering, wrong-coloured copies of the enemies you've met, split into colours
  - *engagement bait*: likes and hearts with a notification badge that home in on you
- **Enemies:** drones, bugs, wasps, brutes (aimed shots), splitters, egg-laying bombers, mines that burst into a ring
  of shots, and armoured tankers. Later sectors have their own: alien fighters in Earth Orbit, martian saucers with
  ray guns at Saturn, sentinels in Cyberspace, little blocks with angry faces in The Well, melting smileys in The Slop
  Feed.
- **Weapons**, each with 8 power levels:
  - **Blaster**: more streams with more power
  - **Spread**: a fan of 3 to 9
  - **Laser**: hold fire for a beam through everything in line
  - **Plasma**: big orbs that go through several enemies
  - **Lightning**: jumps from enemy to enemy
  - **Missiles**: homing missiles beside your gun
  - Each gun has its own sound: a pew, a buzzy fan, a hum, a fat throb, a crackle, a rocket hiss.
- **Telling them apart:** everything that can hurt you glows red, throbs red-magenta and leaves a smoky trail
  (round shots, rotten eggs, ice shards). Loot never does: it twinkles with a little gold star, and gift boxes are
  blue crates tied with a ribbon in their weapon's colour.
- **Pickups:**
  - A *gift box* gives its weapon (its letter is on it); the same weapon again adds a power level.
  - A green *power cell* adds a power level.
  - *Coins* and *gems* are points and the hangar's money: credits (a coin 10, a gem 40; the enemy you shoot down pays
    a little, every boss pays everyone a bounty).
  - Also *shields*, *bombs* and *extra lives*.
  - Losing a ship costs two power levels.
  - When a boss goes down, all its loot flies to your ships before the sector ends (a power cell for each ship).
- **Bosses**, each with three phases (a bar at the top marks them):
  - **Mothership**: fans, rings and spirals of shots, drones
  - **War Crab**: claw shots, charges down at you
  - **Rock Titan**: throws asteroids
  - **Frost Queen**: shards; volleys of icicles dropping in the columns round you; a blizzard wall coming down with one gap to slip through; three freezing beams at once (one on you), then three more in the gaps; frost novas (two rings of shards); she blinks away in a flurry of snow and comes back over you; an ice storm. She follows you faster the more she's hurt
  - **Elder Eye**: hit it only while it's open; it stares a beam at you
  - **Overmind**: four orbiting orbs shield it until they're shot down; spirals
  - The bosses of sectors 7-11 and 14 are after flying things from 90s films and games:
    - **City Killer** (sector 7): a saucer the size of a city behind a shield that soaks up nearly all damage. Catch
      the floppy disk it drops to upload a virus (9 s without a shield, and it takes extra damage), or hit it while
      its dish is open charging the beam that levels cities. Also fighters and rim turrets.
    - **Time Car** (sector 8): revs to 88 MPH and streaks down the screen leaving two trails of fire, then jumps
      through time to somewhere else. Flux-capacitor fans of shots, clock-tower lightning.
    - **Martian Saucer** (sector 9): a big brain in a glass dome, four wingman saucers, ray guns and a tractor beam
      that drags you. ACK ACK! A bomb (the yodel) hurts it three times as much, and it drops one each phase.
    - **The Cube** (sector 10): resistance is futile. It adapts to whatever hurts it most: after a while that weapon
      does a tenth of the damage (crossed out beside it; it holds two at once). Switch guns; it drops weapon crates
      it hasn't adapted to. Tractor beam then a cutting beam, a cage of shots, little cubes that hunt you.
    - **Giant Head** (sector 11): two hands slam down where you are (a red mark shows where) and shield the head
      while they're alive. It breathes you in and spits tiles. In its last phase, its brain shows.
    - **CATS** (sector 14, the last): "HOW ARE YOU GENTLEMEN !!" "ALL YOUR BASE ARE BELONG TO US." Time bombs counting down
      from 3 (shoot them to defuse), "MAIN SCREEN TURN ON." and its beam, fighters. FOR GREAT JUSTICE.
  - Sectors 12 and 13 have bosses of their own:
    - **The Stack** (sector 12): a living Tetris playfield, a scowling face in its blocks, a NEXT box showing the piece
      it'll drop on you next. Big pieces hard-dropped at you (their columns dotted red first), line-clear lasers
      across your zone (on your line: move off it), TETRIS! (four at once, each with a gap), garbage pushed up from
      below, T-spin barrages. Each phase is a speed level (LEVEL 5!, LEVEL 9!): its stack grows and it all comes
      faster. "READY?" "NEXT!" "GAME OVER?" Its tune is Korobeiniki.
    - **The Slop Machine** (sector 13): a beaming chatbot on an old monitor, sunk in a melting heap of pastel goo
      with far too many eyes and six-fingered hands. It HALLUCINATES blurry little copies of earlier bosses that
      fire the plainest patterns, writes WALLS OF TEXT (rows of letters, a gap in each), SIX-FINGER SLAPS (a hand
      hovers over you, a target under it, then it slams) and REGENERATES its response: a loading bar appears on
      it; shoot the bar (or bomb it) within 4 s or it heals some of its health back. In its last phase, MODEL
      COLLAPSE: it jitters, glitches into the wrong colours, scrambles its words and sprays letters every way.
      "CERTAINLY! HERE IS YOUR BOSS FIGHT." "YOU'RE ABSOLUTELY RIGHT!"
- **The hangar** between sectors (the shop), per player, paid in credits (CR), not points — combos, medals and
  grazing raise your score but don't buy anything. A full set of upgrades costs about 18500 credits, around sector 10:
  - firepower (+15% damage a level, 7 levels), rapid fire (7), engine (3)
  - shield (a shield at every start, 3), magnet (pulls pickups in, 3)
  - wingman drones (little guns at your sides, 2), armour (plates that soak a hit, 2)
  - bombs, power, any weapon, extra lives and revivals

The side panel shows each player's lives, weapon, power and bombs; the border above shows the sector and wave. The
best sector reached is kept.

## Fortress (tower defense)

Pick **FORTRESS** on the MODE row (1-4 players together). It's a campaign of 8 maps: win a map (any stars) to open the
next. The first curtain picks the map with left/right; each has its own season, and later maps have more waves and
tougher tanks.

| # | Map | Difficulty | Waves | What it's like |
|---|---|---|---|---|
| 1 | Meadow | easy | 25 | open grass, one entry at the top |
| 2 | Canyon | normal | 30 | a long winding steel canyon from the top left |
| 3 | Spiral | normal | 35 | a steel zig-zag down the whole map (radioactive hot spots) |
| 4 | River | hard | 30 | a river with two bridges; two entries |
| 5 | Islands | hard | 35 | three bands of water with narrow land crossings |
| 6 | Crossroads | very hard | 35 | three entries: top, then both top corners |
| 7 | Twin Gates | very hard | 40 | entries in both top corners, a steel wall with two gates before the eagle |
| 8 | Gauntlet | insane | 50 | three entries, broken walls, ice and water |

Maps with several entries open them one at a time, a new one every 5 waves (marked on the map; closed ones show the
wave they open on). The eagle has HP (30 / 25 / 20 / 15 / 10 by skill). **The enemy fights back**: a tank that
reaches the fortress rams it and blows up (1 HP, 2 for armor, shield and flamer tanks, 4 for a snake, 6 for a titan),
heavy tanks (power, armor, rocket, shield, mortar, titans, and some others) stop and shell any tower lined up with
them, and every 10th wave is a BOSS wave with snakes and **titans** (huge armored tanks that glow red, shrug off
stuns and half of any slowing). Waves grow (up to 60 tanks, 80 in a swarm), toughen fast and speed up.

**Building.** Your tank is the builder. Drive up and press **B**: a menu opens for the tile in front of you (left/right
choose, fire builds, B closes; the tank stays put meanwhile). On one of your towers the menu upgrades it, picks its
specialisation, sets what it aims at (FIRST, LAST, STRONG, CLOSE), repairs it or sells it (70% back). You still fight
with your tank, and a destroyed tank comes back after 2 seconds. Range circles show what a tower covers (and what
the next upgrade will).

**Upgrades.** Every combat tower has **4 levels**; at level 4 it specialises one of two ways, and each specialisation
has **3 tiers** (more damage, range and speed each tier; tier III adds a trick): 7 steps in all. Radar and gold mine
have 5 levels.

| Tower | Price | What it does | Specialisations (tier III trick) |
|---|---|---|---|
| Gun tower | 60 | quick shots at one tank | **Gatling**, a hail of bullets (shreds armor: +30% damage taken) · **Sniper**, huge range and damage, sees stealth (1 shot in 5 hits for x4) |
| Cannon | 90 | lobbed shells with splash; can't hit too close | **Howitzer**, huge blasts from afar (blasts stun) · **Cluster**, bursts into bomblets (8 of them) |
| Tesla | 110 | lightning that jumps from tank to tank | **Storm**, chains to 9 (16) · **EMP**, stuns what it hits (longer stuns) |
| Frost | 80 | slows every tank around it | **Blizzard**, slower still and it hurts (freezes tanks solid) · **Shatter**, chilled tanks take double damage (triple) |
| Flamer | 100 | burns everything in a short cone | **Inferno**, twice the heat (they keep burning) · **Napalm**, leaves the ground burning (wider fires) |
| Rockets | 130 | far, homing, good against armor | **Swarm**, 4 rockets at once (6) · **Buster**, one huge hit that pierces shield plates (a big blast) |
| Radar | 70 | shows stealth tanks (shades) to every tower, +12% to +32% range for towers within 3 tiles | |
| Gold mine | 100 | 20 / 40 / 65 / 95 / 130 gold after every wave | |

A tower has HP too: enemy shells and blasts wear it down (an HP bar shows) and it's lost at 0. **Walls**: a brick wall
(5) makes them stop and shoot through it; a steel wall (20) makes them go round. Towers and steel reroute the enemy,
but you can never shut every way to the eagle (the build is refused). **Abilities**: AIR STRIKE (150, every 30 s) and
WINGMAN (100, every 45 s).

**Gold** is tight: start with 200 (up to 400 on easier skills), a little for every kill (more on easier skills), 20 + 2
per wave for every wave held, 3% interest on what you've saved (up to 25), gold mines, and a bonus for calling a wave
early (SEND WAVE in the menu, or **Tab**). The side panel shows what the next wave brings; counter-picks matter:
skimmers cross water, shades hide from towers without a radar, shield tanks take a quarter from the front, sappers
crush brick walls, medics heal, splitters split. **Pause menu → SPEED** runs the game at 1x, 2x or 3x. Hold every wave
for 1-3 stars (by the eagle's HP left); the best per map is kept, and the title screen shows your stars and maps open.

## Mode title screens and music

Starting a game shows its mode's own pixel-art title screen before the first stage (Enter to go on, Esc back to the
title; Settings → GAME → MODE TITLE SCREENS). Each mode has a picture of its own, 240×136 and drawn a pixel to a pixel
(a bigger screen shows it at 2×, 3× ... when it fits), a little animated scene of what the mode is about, with depth,
light, tanks driving and firing, smoke, sparks and explosions:

- **Classic**: dusk; your tank holds the road in front of the eagle's brick fortress and shoots the enemy tanks as they
  come out of their spawn stars, the counter of tanks still to come going down.
- **Custom levels**: a blueprint on the desk; the pencil puts a level down tile by tile from the palette, a tank tries
  it out and it gets its SAVED stamp.
- **Survival**: you alone in the middle of the map, the enemy pouring in from every edge; wave after wave, with
  their twists (night, rocket rain, a swarm, a blitz).
- **Time attack**: flat out at dawn, the land streaming by, a checkpoint flashing past, the stopwatch and the LCD.
- **Big maps**: a whole war seen from high up, sliding by under the clouds, with platoons, factories, outposts and a
  minimap.
- **Any side**: the map on the war-room table turns, so the eagle ends up left, at the top, on the right.
- **Corridor**: a road of blocks climbing through the sky above the clouds, the height going up past your best.
- **Maze**: only your lamp lights the way; what you've seen stays dim, red eyes wait in the dark, the exit glows.
- **Endless world**: your tank drives the road past home's village, autumn woods, snowfields, the desert's ruins (a
  chest glinting) and a ruined city, a volcano smoking far off, while a whole day goes by: sunset, a night of stars,
  lit windows and your headlight, dawn; enemy tanks come down the road; the day and the distance count up, the
  compass swings.
- **Fortress**: towers along a winding road cut down the column marching on your eagle; every wreck pays gold.
- **Galaxy**: a ringed planet, nebulae, stars streaming by; your tank flies up at the alien formation.
- **Kill race**: a stadium under the floodlights; four tanks, four lanes, and the big board counting the kills.
- **VS eagles**: two forts and their eagles in a thunderstorm, the two tanks trading shells.
- **Deathmatch**: a steel arena, red beacons, a skull on the floor, shells meeting in the middle, the kill feed.
- **Flags**: your tank runs their flag home over the bridge, theirs on its tail.
- **VS CPU** (and co-op): the machine's fortress, a face on its screen; its HQ blinks red at its foot.
- **Counter-Strike**: noon on Dust 2: the long doors and a red A on the wall; a terrorist plants the bomb, a
  counter-terrorist comes in behind smoke to defuse it, or (every other time) is shot and the bomb goes off.
- **Desert Dominion**: KHARRA under its twin suns and a ringed giant; a harvester scoops a glowing glimmer field, a
  tank of each House watches from a ridge, a base stands on the plateau; every few seconds wormsign, and a sandwyrm
  bursts out of the dunes behind the harvester, takes the tanks' shells and sinks; a skylifter swoops in low.

**The soundtrack** comes in three styles (Settings → MUSIC STYLE). The stage-start fanfare before every round plays in
the style chosen too: the NES original, a rock version (twin lead guitars, chugging power chords, a tom fill into the
final hits) or a synthwave one (a saw lead over pads, a pumping octave bass, gated drums, a bell on the last chord).

- **ROCK** (the default): hard rock and heavy metal in the manner of the 80s and 90s, every tune written for this
  game — galloping riffs, palm-muted chugs, power chords, twin-guitar harmony leads, double-kick drums and shred
  solos, arranged in intros, verses, choruses, solos and breakdowns. Two distorted rhythm guitars left and right, a
  lead guitar with bends, vibrato and an echo, a bass and a full kit (crashes, rides, tom fills), all synthesised
  live. Where it fits the lead plays the chiptune's theme (re-arranged), and the folk tunes Korobeiniki and Shchedryk
  get metal versions. Classic: STEEL EAGLE (a galloping anthem); Survival: LAST MAN STANDING (thrash); Time Attack:
  RED LINE (speed metal); Big Maps: WIDE FRONT (a hard rock shuffle); Any Side: TURNED AROUND (prog metal in 7/8);
  Corridor: THE CLIMB (power metal); Maze: LABYRINTH OF STEEL (doom); Endless world: WIDE FRONT (as Big Maps); Fortress: HOLD THE WALLS; Kill Race: NITRO
  (boogie); VS CPU and Co-op: MACHINE WAR (industrial); Eagles: EAGLE DUEL; Deathmatch: NO MERCY; Flags: BRING IT
  HOME; Custom levels: BRICK BY BRICK; Counter-Strike: WAR MACHINE (the military march); the tank bosses: IRON FIST, DEEP WATERS, WAR MACHINE, CLOSE ENCOUNTER; Baba
  Galya: SHCHEDRYK (METAL); Galaxy: STARFIGHTER, ALIEN OVERLORD, HYPERSPACE, ALL YOUR BASE, KOROBEINIKI, LEVEL 9,
  UPBEAT CORPORATE ROCK 4 and STOCK MUSIC.EXE in metal; plus WARNING!, VICTORY! and THE EARTH IS SAVED. A boss's
  last phase plays faster; the easier skills play lighter drums and a touch slower.
- **SYNTHWAVE**: 80s synthwave, outrun and darksynth versions of every tune, written for this game: sunset pads for
  the calm modes, outrun drive for the racing ones, darksynth for the tense modes and the bosses, in intros, verses,
  choruses, breakdowns (with risers) and lead breaks. Big detuned saw pads through a filter that opens with the song,
  with a stereo chorus; a pulsing arpeggiator and an octave-bouncing analog bass, both pumping with the kick
  (sidechain); a bright lead with slides, vibrato and a ping-pong echo; FM bells and brass stabs; a LinnDrum/808 kit
  with a gated-reverb snare and clap, gated tom fills and a hall reverb, all synthesised live. Where it fits the lead
  (or the bells) plays the chiptune's theme, Korobeiniki and Shchedryk included. A boss's last phase plays faster; the
  easier skills play lighter hats and arps and a touch slower:

| Mode | Synthwave tune | Feel |
|---|---|---|
| Classic | Neon Eagle | classic outrun, the chiptune march as its verse |
| Custom levels | Grid Builder | bouncy, brass stabs, dorian |
| Survival | Night Siege | darksynth, a driven 16th bass |
| Time attack | Overdrive 88 | flat-out outrun |
| Big maps | Horizon Line | a slow, wide sunset |
| Any side | Mirror City | restless, in 7/8 |
| Corridor | Skyline Ascent | climbing arpeggios |
| Maze | VHS Labyrinth | eerie bells, half time, harmonic minor |
| Endless world | Endless Highway | a road trip at dusk |
| Fortress | Laser Walls | a heroic siege |
| Kill race | Turbo Sunset | bright outrun |
| VS eagles | Twin Neon | a stand-off |
| Deathmatch | Chrome and Blood | darksynth |
| Flags | Capture the Night | a heroic run |
| Counter-Strike | Dust After Dark | darksynth, the bomb ticking |
| VS CPU and Co-op | Machine Dreams | robots in love |
| Galaxy | Starfighter 1986 (bosses: Overlord Protocol); sectors 7-11 and 14: Hyperspace Highway (bosses: All Your Base Are Neon); The Well: Korobeiniki 1984 (the Stack: Level 9 Overdrive); The Slop Feed: Corporate Sunset 4 (the Slop Machine: Corrupted.vhs) | outrun; darksynth for the bosses |
| a boss's picture | Red Alert | an alarm |
| Iron Bear, Mole, Harvester, Armored Train | Steel Terminator | half-time darksynth |
| Hydra, Phantom, Scorpion | Abyssal Grid | slow, deep, menacing |
| Gunship, Dreadnought | Armored Protocol | a half-time war march |
| UFO | Signal from Beyond | eerie, lydian |
| ??? | Carol of the Neon Bells | an old folk song on FM bells |
| a boss beaten / the UFO beaten | Sunrise Victory / New Dawn | the fanfare, the anthem at sunrise |

- **CHIPTUNE**: every mode's own chiptune, played on an NES-style band of two pulse leads, a triangle bass and noise
  drums, and every skill plays it differently:

| Mode | Tune | Feel |
|---|---|---|
| Classic | March of the Eagle | a march |
| Custom levels | Builder's Bounce | bouncy |
| Survival | The Last Stand | driving |
| Time attack | Against the Clock | gallop |
| Big maps | Wide Front | slow and wide |
| Any side | Turned Around | 7/8, off balance |
| Corridor | The Climb | rising arpeggios |
| Maze | Lost in the Labyrinth | slow and creeping |
| Endless world | Wide Front (as Big maps) | slow and wide |
| Fortress | Hold the Line | a siege march |
| Kill race | Kill Race Shuffle | swing |
| VS eagles | Eagle Duel | a stand-off |
| Deathmatch | No Mercy | aggressive |
| Flags | Bring It Home | a fanfare |
| Counter-Strike | War Machine | a military march |
| VS CPU | Machine War | robotic octaves |
| Galaxy | Starfighter (bosses: Alien Overlord); sectors 7-11 and 14: Hyperspace (bosses: All Your Base); The Well: Korobeiniki (the Stack: Korobeiniki: Level 9); The Slop Feed: Upbeat Corporate 4 (the Slop Machine: Stock Music.exe) | racing arpeggios |

| Skill | Scale | Tempo | Band |
|---|---|---|---|
| I'm too young to die | major | 80% | a soft round lead, light drums |
| Hey, not too rough | mixolydian | 90% | a harmony line underneath |
| Hurt me plenty | dorian | 100% | full drums, lower bass |
| Ultra-violence | harmonic minor | 110% | a thin lead over racing arpeggios, busier drums |
| Nightmare! | phrygian dominant | 122% | a shadow voice a tritone below, double kicks and crashes |

Boss stages have their own music:

| When | Tune | Feel |
|---|---|---|
| a boss's picture, before the fight | Warning! | a siren |
| Iron Bear, Mole, Harvester, Armored Train | Iron Fist | a heavy driving riff |
| Hydra, Phantom, Scorpion | Deep Waters | slow, creeping menace |
| Gunship, Dreadnought | War Machine | a military march |
| UFO | Close Encounter | eerie, in a sci-fi scale |
| a boss beaten | Victory! | a fanfare (always major) |
| the UFO beaten | The Earth Is Saved | an anthem |
| ??? | ??? | an old folk song |

A boss's theme plays in the skill's mood like the others, and speeds up 15% in its last phase. The victory tune plays
on through the boss's victory picture and the score tally.

The music starts after the stage's start jingle, pauses with the game and stops on game over; on AUTO it follows the
level AUTO is at. Settings → MUSIC: MUSIC (on/off), MUSIC STYLE and MUSIC VOLUME (50%); Settings → SOUND: VOLUME and ENGINE SOUND.

## Secrets: hidden power-ups and ? blocks

In the classic game, Any side, Big maps, Survival, Time attack, Maze, Kill race, Custom levels and VS CPU:

- **Hidden power-ups**: a few brick blocks on every stage hide a power-up. Break most of the block and it pops out
  ("SECRET!"). A wall hiding something gives the odd glint.
- **? blocks**: now and then (about one stage in three) a golden question block takes a brick block's place. It's
  solid; shoot it:
  - **coin block**: every hit pops a spinning coin (200 points), up to 8; then it's an empty brown block
  - **mushroom block**: one hit and a mushroom grows out of it and walks the route to your eagle. There it stands
    guard until the end of the stage, running back and forth round the eagle (over the walls, on a ring just outside
    the fort) to stay between the eagle and the danger: a shell flying at the eagle first, otherwise the nearest enemy.
    Enemy shells (rockets too) that hit it are soaked up — BLOCKED!. It doesn't make the eagle untouchable: a shot that
    gets past it hits the eagle as usual (only where there is an eagle)
  Enemy shells just stop on a ? block.

Not in versus, Fortress or boss stages. Settings → GAME → SECRETS turns them off.

## Terrain: mud, conveyor belts, teleporters, crates, barrels, deflectors; night and fog

- **Mud** (brown, lumpy): any tank on it moves at half speed; shells pass over it; hovering skimmers glide across.
- **Conveyor belts** (grey with moving stripes): carry any tank along the belt, even one standing still.
- **Teleporter pads** (coloured squares, in linked pairs of the same colour): drive onto one and you come out of its
  twin; shells that enter a pad leave its twin too (once each).
- **Supply crates** (wooden, a 16px tile): shoot one open for points (100-500) or, 2 times in 5, a power-up right
  where it stood (enemy shells just break it).
- **Barrels** (red; blue fuel drums in the city): a shot, a flame or a blast sets one off: it blows up a moment later,
  hurting every tank near it (both sides: whoever's shot it was gets the points), breaking bricks, cracking concrete,
  and setting off the barrels and gas next to it in a chain. Near the eagle one can take it too.
- **Deflectors** (diagonal steel, / or \\): tanks can't pass; a shell that meets one turns 90 degrees (yours and
  theirs alike), so you can shoot round corners.
- They appear in the normal stages, placed the same way every time a stage is played: mud from stage 3,
  teleporters in most stages from 5, crates in most from 4, barrels in about half from 6, conveyor belts in some from
  8, deflectors in about half from 10, never next to the eagle or on entry points. Bigger fields get more. Settings →
  GAME → MUD, BELTS, PADS turns them off. In CONSTRUCTION they are among the patterns of the palette (pads pair up in
  the order you place them).
- **Night stages** (stages 9, 45, 81 ...: every 36th from 9) are dark except around your tanks, the eagle, shells, explosions, spawns,
  pads, street lamps, lava and erupting vents; an enemy shows only in your light or when it fires (enemies fire a bit less at night too). Every second
  power-up on a night stage is NIGHT VISION: 20 s of seeing the whole field.
  **Fog stages** (27, 63, 99 ...) are the same in grey with a wider view. Never on boss stages. The stage curtain
  says NIGHT or FOG. Settings → GAME → NIGHT AND FOG: some (default: one stage in eighteen), many (one in three, from
  stage 6), off, all night, all fog.

## Daily challenge

DAILY CHALLENGE on the title screen: the same 3 stages and 2 twists for everyone on a given day (the starting stage and
the twists come from the date), 1 player, no shop and no saves. The title shows today's twists and your best score;
after the run (3 stages or game over) you see your score and today's best. Twists: double trouble, glass cannon,
speed demons, no power-ups, new breed, rocket party, iron hides, wide open, night shift, easy rider, turbo tank,
boss rush, lights out (all night) and pea soup (all fog). Two twists that set the same thing differently (night
shift and easy rider both pick the skill; lights out and pea soup; glass cannon and easy rider pick the lives) are
never drawn together. A boss rush day starts one stage before a boss stage, so the run always meets a boss. Your own
settings come back afterwards.

## First-meet cards

The first time you meet each enemy, boss and power-up (and each new kind of ground: lava, basalt, vents, bog, reeds,
swamp gas, concrete, barrels, crates, deflectors, manholes; and the maze's gates, keys, power cells, plates, moving
walls, cracked floor, torches, lamp fuel, map scrolls, bridge crates, rivers, the sealed exit, vaults and lairs), a one-line card slides down at the top of the field, such as
**NEW: JAMMER - SLOWS YOUR SHELLS NEARBY** (a line too long for the field scrolls along once). Several new things
queue up and show one after another. What you've met is remembered between games. Settings → GAME → FIRST-MEET CARDS
turns them off, and SHOW ALL CARDS AGAIN brings them all back. Online, guests see the host's cards.

## Points for wrecking things

Besides tanks, you score a little for what you destroy: 10 for a shell that breaks bricks (however many), 50 per steel
block (power shells), 20 per tree (with the GUN), 300 for an enemy turret and 20 for shooting down an enemy shell.

## Late power-ups carry over

A timed power-up (helmet, clock, shovel, turbo, rapid, spread, pierce, rocket, ghost, smoke) picked up in the last 10
seconds before a stage is cleared, or while it is being cleared, isn't wasted: "TURBO x2 NEXT STAGE" pops up, and you
start the next stage with it for twice as long. Not after a game over.

## Turrets, Claude and revival

- **Turrets** come from the power-up or the shop (4000 each) and are carried: **B** places one where you stand, so drive
  to the spot you want it and press **B** (turrets come
  before mines, mines before firing). Up to 3 of yours stand at once; a 4th replaces the oldest. They block tanks,
  your shells fly over them, enemy shells chip them. Carried turrets show as yellow dots in the side panel (mines grey).
- **Claude** can be bought in the shop (6000): it joins you at the start of the next stage.
- **CLAUDE LEVEL** (shop, 4000 / 6000 / 8000 / 11000 / 14000) makes every Claude better, for the whole team, and is kept
  like the base upgrades: **1** stays 50% longer · **2** moves 50% faster · **3** bigger bites (a wider reach that also
  catches enemy shells, double damage to bosses) · **4** spits sparks at enemy tanks lined up with it · **5** comes to
  every stage by itself. An upgraded Claude has a pip per level underneath, and a golden glow from level 3.
- **Revival** costs 7500 points (Settings → PLAYER → REVIVE COST: off / 2500 / 5000 / 7500 / 10000).
  - During play, a fallen player presses **FIRE** to come back with one tank. Their own points pay, or else the richest
    teammate's (revival spends points like the shop: your score stays). The prompt shows at the bottom of the field.
  - When the last tank falls and someone can afford it, there is a 5-second **LAST CHANCE** before GAME OVER (this works
    in 1-player games too).
  - Between stages, fallen players get a shop turn where they can buy **REVIVE** (and nothing else); a teammate can
    buy it for them too.

## Settings

Choose **SETTINGS** on the title screen. The top level lists the sections below; Enter (or right, or a click) opens
one, Esc (or left, or the BACK row) goes back up. The per-enemy settings are one level further down, under **ENEMY
TYPES**, one page per enemy with its picture. On a page, use up/down to pick a row and left/right (or A/B) to change
it; on desktop you can also click and use the mouse wheel. Changed values are shown in gold. Settings are saved in
the browser, and **RESET TO DEFAULTS** (top level) restores the classic game.

| Section | Settings (default) |
|---|---|
| Player | lives (3, or infinite), I-player / II-player tank color (yellow / green, 12 colors), tank speed (100%), shell speed (100%), start stars (0), keep stars on death (off), spawn shield (3 s), extra life at 20K (once / every / off), friendly fire (freeze / off), revive cost (7500) |
| XP and levels | XP and levels (on), XP rate (100%), level perks (on / looks only), start level (1), XP lost on death (0%), *show ranks and perks* |
| Enemies | tanks per stage (20, from 1 to 99), max on screen (4, up to 20, +2 in 2P), spawn rate, fire rate, base hunting (all 100%), flashing bonus tanks (on), AI personalities (mixed), show AI type (off), new enemy types (normal), veterans + elites (on) |
| Rocket / shield / sapper / shade tank | speed (100%), shell speed (100%), hits to destroy (1 / 2 / 1 / 1), appears (on) |
| Mason, mortar, skimmer, flamer, splitter, medic, jammer, spotter, snake | speed (100%), hits to destroy, appears (on) |
| Minotaur, crawler, sentry, locksmith, mirror, mosslump (the maze's own) | speed (100%; not the sentry or mirror), hits to destroy (12 / 2 / 4 / 2 / 2 / 2), appears (on) |
| Basic / fast / power / armor tank | speed (100%), shell speed (100%), hits to destroy (1 / 1 / 1 / 4) |
| Power-ups | helmet time (10 s), clock time (10 s), shovel time (20 s), new power-up time (15 s), mines per pickup (3) |
| Who can collect | for each of the 16 power-ups: **ANYONE** (you and enemies, default), **PLAYER** (only you) or **OFF** (never appears). Presets: *classic power-ups only* and *all power-ups on*. The selected power-up's icon and effect are shown at the bottom of the screen. |
| Shop | shop after stages (on), shop prices (100%), base upgrades (on) |
| Players | III / IV-PLAYER COLOR (blue / pink), gamepad rumble (on), key and pad setup |
| Bosses | boss rounds (on), boss every (10 stages), boss HP (100%) |
| Screen | field width (13), field height (13), FIT, scaling (sharp / fill), minimap (on), look (classic / blocks), controls (auto / PC / Mac), *fit to my screen*, toggle fullscreen |
| Game | game mode (classic), skill (hurt me plenty), kill race first to (3 points), mud, belts, pads (on), seasons (cycle), season effects (on), secrets (on), fortress speed (1x), big map stages (off), night and fog (some), game speed (100%), volume (100%), engine sound (on), music (on), music volume (50%), mode title screens (on), boss screens (on), first-meet cards (on), *show all cards again* |

### Block look

Settings → SCREEN → **LOOK: BLOCKS** (also in the pause menu, any time) draws the battlefield as chunky voxel-style
blocks: 16px blocks with per-pixel noise, darker edges and light from the top left. Bricks become cobblestone (mossy
in spring and the swamp, sandstone bricks in the desert, dark red bricks in the volcano, clay bricks in the city), steel
becomes obsidian plates (near black with a lit purple bevel), concrete a smooth pale slab that cracks and chips; trees
are leaf blocks with gaps (cacti in the desert), water and lava flow, ice is packed ice, mud and bog are wet blocks,
bridges are planks, crates are chests, pads are portals, and the ground is a floor of dark blocks (grass, leaf
litter, snow, ash, sand, rock, marsh or paving). Each season keeps its colours. Brick, steel and concrete stay easy to
tell apart, and shot-off bits of a wall still go 4px at a time. Only the terrain changes: tanks, shells, explosions
and power-ups, the galaxy, the title and boss pictures keep their classic look, and the rules are the same. Online
each player picks their own (the setting isn't sent).

## Code layout

```
index.html        page shell + touch controls
css/style.css     layout, pixel-perfect scaling
js/data.js        font, terrain textures, 35 stage maps, enemy line-ups
js/sprites.js     sprite bitmaps (tanks, power-ups, eagle, effects, HUD icons)
js/gfx.js         palettes, font, sprite rendering and caching
js/config.js      settings: definitions, defaults, saving, tank color presets
js/audio.js       NES-style Web Audio synth (SFX, jingles, engine)
js/music.js       the soundtrack: a song per mode, a version per skill, and the sequencer that plays it
js/rock.js        the ROCK soundtrack: hard rock and metal versions of every tune, and the guitars, bass and drums that play them
js/synthwave.js   the SYNTHWAVE soundtrack: synthwave, outrun and darksynth versions of every tune, and the synths and drum machine that play them
js/jingles.js     the stage-start fanfare in the ROCK and SYNTHWAVE styles
js/input.js       keyboard / gamepad / touch
js/stage.js       gameplay: terrain, movement, enemy types, bullets, power-ups, XP, rendering
js/ai.js          enemy personalities (wander / rush / hunt / snipe) and path finding
js/enemies.js     abilities of the enemies from the design canvas (mason, mortar, flamer, medic, ...)
js/base.js        base upgrades: fortress walls, eagle armor, repair crew, eagle gun, minefield
js/extras.js      turrets, Claude, airstrikes, revival, wingman, decoy eagle, smoke, bridges
js/terrain.js     mud, conveyor belts, teleporter pads, night and fog stages
js/seasons.js     seasons: themed ground, textures and particles; frozen lakes, dried ponds
js/secrets.js     hidden power-ups in walls, ? blocks (coins, the guardian mushroom)
js/weapons.js     player weapons: machine gun, laser, flamethrower, mortar, tesla, missiles (MK I-IV), crates
js/seasonal.js    each season's twist (showers, wildfire, gusts, blizzards, hot spots, mirages) and its own enemy
js/biomes.js      the terrain types (volcanic, swamp, city ruins): their tiles, twists and enemies; crates, barrels, deflectors
js/blocks.js      the BLOCKS look: voxel-style terrain textures for every tile and season, the block ground, pads and manholes
js/editor.js      construction: the level editor (terrain and markers pages), random levels, save slots
js/editor2.js     construction: a level's size, markers and rules (data, the LEVEL / ENEMIES / POWER-UPS pages), playing it
js/intro.js       mode title screens: the layout, Enter/Esc, what music plays when
js/introart.js    the mode title pictures, one animated scene per mode
js/bossart.js     boss screens: a picture before each boss and one after it
js/bossbook.js    the boss gallery (Settings -> ART): the bosses you've met, and only those
js/galya.js       a secret (no spoilers)
js/modes.js       game modes: time attack, versus eagles, deathmatch, capture the flag
js/survival.js    SURVIVAL: 100 waves, entry points all round, twists, perks, drops, terrain rebuilds
js/sides2.js      ANY SIDE's twists: the edges in turn, two fronts, the moving eagle, wind, ice slope, mirror stage, side maps, sandbags, the streak, the curtain preview
js/worldgen.js    ENDLESS WORLD's land: chunks from the seed (biomes, rivers, roads, old walls), villages, ruins, nests, open ways
js/world.js       ENDLESS WORLD: the moving window, villages and sieges, ruins and guardians, nests, the enemy, day and night,
                  checkpoints, the online view
js/worlddraw.js   ENDLESS WORLD's drawing: chunks painted in their biomes, water, the dark, the minimap, the side panel
js/worldart.js    ENDLESS WORLD's title picture
js/csmap.js       COUNTER-STRIKE's map: DE_DUST2 tile by tile, its zones and call-outs, its look (sand, sandstone, crates)
js/cs.js          COUNTER-STRIKE: the team screen, rounds, the bomb, buying and money, the fog of war, its HUD, online
js/csbots.js      COUNTER-STRIKE's bots: buying, the terrorists' and counter-terrorists' plans, routes, fighting
js/csorders.js    COUNTER-STRIKE's orders to the bots: FOLLOW ME, HOLD HERE, GO ON (keys, pads, touch, online)
js/csreload.js    COUNTER-STRIKE's magazines and reloading (R)
js/csneutral.js   COUNTER-STRIKE's neutral tanks: grey tanks of nobody's side, $150 a kill
js/controls.js    the CONTROLS page (pause menu and Settings): the keys in use, per player and mode
js/csmap_aztec.js  COUNTER-STRIKE's DE_AZTEC (jungle stone, the river, the rope bridge, temples)
js/csmap_train.js  COUNTER-STRIKE's DE_TRAIN (train cars on rails, concrete halls)
js/csmap_mirage.js COUNTER-STRIKE's DE_MIRAGE (plaster, terracotta, mosaics, the market)
js/rallytracks.js TANK RALLY's worlds and tracks (built from racing lines) and their ground art
js/rally.js       TANK RALLY's race: driving with momentum, laps and positions, weapons, rivals, HUD, camera
js/rallycareer.js TANK RALLY's career: tanks and upgrades, rivals, divisions and worlds, shop and race screens
js/rallymusic.js  TANK RALLY's songs in all three music styles (a race tune per track)
js/rallyart.js    TANK RALLY's title picture
js/astro.js       ASTRO TANKS: flying, rocks, saucers, pickups, waves, bosses' arrival, HUD, records
js/astroup.js     ASTRO TANKS's upgrades, the tank's look with them, the hangar between waves
js/astroboss.js   ASTRO TANKS's mini bosses: CINDER COLOSSUS, VOID MATRIARCH, COMET WYRM
js/astromusic.js  ASTRO TANKS's songs in all three music styles and the heartbeat
js/astroart.js    ASTRO TANKS's title picture
js/rtsdata.js     DESERT DOMINION's numbers: units, buildings, weapons and armour, Houses, tech levels, starport, palace powers
js/rts.js         DESERT DOMINION's simulation: the map, Houses, power and storage, buildings, production, starport, palace,
                  reinforcements, the end of a battle; Game.rtsStartMission; the stand-in map generator
js/rtsunit.js     DESERT DOMINION's units: moving and paths, combat and shots, harvesting and docking, aircraft and frigates,
                  the doomfist, sandwyrms, blooms, captures; the command API
js/rtsai.js       DESERT DOMINION's computer player
js/rtsui.js       DESERT DOMINION's screen and controls (mouse, keys, pads, touch), the sidebar, the skirmish set-up, its music
js/rtsdraw.js     DESERT DOMINION's map view: prerendered terrain and shroud, buildings, units, shots, effects, marks, the ghost
js/rtssave.js     DESERT DOMINION's SAVE GAME and CONTINUE
js/rtsart_units.js DESERT DOMINION's units in every House's colours: vehicles, turrets, infantry, wrecks, shots, effects, icons
js/rtsart_world.js DESERT DOMINION's terrain, buildings in all their states, walls, ruins, the sandwyrm, blooms, cursors, icons
js/rtsmaps.js     DESERT DOMINION's map generator and the campaign's mission maps
js/rtscampaign.js DESERT DOMINION's campaign: menu, intro, Houses and advisors, briefings, region map, results, score, ending
js/rtsmusic.js    DESERT DOMINION's in-game songs (peace, battle, the Houses) in all three music styles
js/rtsmusic2.js   DESERT DOMINION's front-end songs and announcement stingers in all three music styles
js/rtsart_title.js DESERT DOMINION's title picture
js/netstream.js   online for the modes that draw themselves (Tank Rally, Astro Tanks, Desert Dominion): the host's screen as pictures
js/csart.js       COUNTER-STRIKE's title picture
js/reach.js       no dead ends: a way opened from every walled-in entry point; stuck enemies come in again
js/bigmap.js      big scrolling maps: stitched worlds, camera, outposts and factories
js/corridor.js    corridor mode: the endless climb, sections added on top as you go
js/corridor2.js   corridor: the rising hazard, the climb combo, biome bands, set pieces, splits, depots, boss gates, medals
js/maze.js        maze mode: the maze generator, patrols, reinforcements, the exit
js/maze2.js       the maze's world: keys and gates, power cells and the sealed exit, rivers, plates and doors, moving walls,
                  cracked floor, belts and pads, darkness and torches, lamp fuel, the map and markers, the collapse,
                  par times and stars, treasure, vaults, secret exits, the four depths and the lairs; the solver
js/mazefoes.js    maze mode's own enemies: the minotaur (and the lair's boss), crawlers, sentries, locksmiths, mirrors, mosslumps
js/fortress.js    fortress mode (tower defense): towers, upgrades and specialisations, waves, gold, the build menu, maps
js/galaxy.js      galaxy mode (a shoot-'em-up): sectors, waves, weapons, pickups, the hangar, its bosses
js/galaxy2.js     galaxy sectors 7-11 and 14: their bosses, the newer enemies and waves, skies and music
js/gxfrost.js     galaxy: the Frost Queen's harder set of attacks (icicles, blizzard walls, triple beams, novas, blink)
js/galaxy3.js     galaxy sectors The Well and The Slop Feed (12 and 13): their enemies, waves, bosses, skies and music
js/galaxy_feel.js galaxy controls and feel: B gestures, focus, two weapons, heat and the charge blast, combo, grazing, shake
js/galaxy_prog.js galaxy progression and co-op: power cells back after a loss, perks, fair loot, escape pods
js/galaxy_waves.js galaxy structure: mini-bosses, challenge stages, the captor and the twin fighter, medals
js/galaxy_modes.js galaxy runs: campaign, boss rush, endless, daily
js/cards.js       first-meet cards for new enemies, bosses and power-ups
js/cpuvs.js       VS EAGLES against the computer: the enemy HQ and its upgrades round by round
js/bots.js        deathmatch and kill-race bots: computer-driven players
js/race.js        kill race: most kills per round scores a point
js/bosses.js      boss rounds: the boss order, arenas, phases, sprites; the first five bosses
js/bosses2.js     the five newer bosses: harvester, gunship, armored train, scorpion, UFO
js/net.js         online play: WebRTC connection, codes, host streaming, guest view, lobby panels
js/main.js        state machine (title, settings, curtain, play, score, game over, construction) + loop
js/version.js     app name and version (single source of truth)
tools/build.js    bundles everything into dist/tanb4iki_v<version>.html
```

Stage maps in `js/data.js` are easy to edit. Each one is 13×13 tile codes (or 26×26 half-tile blocks),
and the legend is at the top of the list.
