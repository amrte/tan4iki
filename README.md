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

**Gamepads** (USB or Bluetooth) work in every mode: pad 1 controls player I, pad 2 player II, and so on
(in a 1-player game every pad controls player I). Press any button on a pad once so the browser reports it.
A notice appears when a pad connects or disconnects, and pads that support it rumble when you're hit.

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
Survival, time attack, corridor, maze and VS CPU keep their best results; there is no shop outside Classic, Big maps,
Maze and VS CPU, and no saving outside Classic and Big maps.

| Mode | Players | How it works |
|---|---|---|
| **Classic** | 1-4 | the game as always |
| **Survival** | 1-4 | hold out for 100 waves on one map, with no eagle: you start in the middle and the enemy comes in from every edge to hunt you down. Waves grow to 28 tanks, then get tougher instead; a twist every third wave; terrain rebuilt and power-ups dropped between waves; a perk every 5 waves (see below) |
| **Any side** | 1-4 | the classic stages with the map turned round: your eagle is on the left, right or top edge (a new one every stage; the curtain says which), you start beside it and the enemy comes in from the edge across. Base upgrades, the minefield, the eagle gun and supply drops all face the right way. Shop as in Classic |
| **Custom levels** | 1-4 | your levels from CONSTRUCTION, every filled slot in turn (see below); shop as in Classic |
| **Big maps** | 1-4 | every stage is a big scrolling map (see below); shop and saves work as in Classic |
| **Corridor** | 1-4 | the usual width, endless height: no eagle, just climb. The world is three map sections stacked (random classic maps, mirrored outwards on wider fields); once the whole team has climbed out of the bottom section it drops away and a fresh section appears on top, so the climb never ends and nobody gets left behind. Enemies keep arriving just above the screen, faster and tougher the higher you get (the flag shows the level: one per section climbed). The enemy grows slowly with the climb: only basic tanks at first, then fast (10 tiles), power (26) and armor (45), then the newer types one at a time every 20 tiles from 52 (rocket first), each starting rare and taking 40 tiles to reach its full share; veterans from about 100 tiles and elites from 230. A gold *NAME AHEAD!* tells you when a new kind joins; ones left far below drop out. A destroyed tank comes back at the bottom of the screen; every 5 sections everyone gets a tank. The border above the field shows how far you've climbed (in tiles) and your best; ends when everyone is out |
| **Maze** | 1-4 | a huge labyrinth, a new one every stage and bigger each time (17 x 11 cells at first, growing by 3 x 2 a stage up to 34 x 22; a cell is a 2-tile passage). You start in the bottom-left corner; the one way out, a chequered **EXIT** gate, is on the outer edge as far from the start as the maze allows. The walls are steel that nothing can break (not power shells, rockets or blasts), with the odd stretch of brick you can shoot through for a shortcut; trees and ice fill some passages. Enemy tanks (26 in the first maze, 6 more each maze, up to 100) patrol along the way, half of them from the start (none near the start), and come for you once you get close or shoot them; more turn up out of sight as you go (the side panel counts them). Lost for too long (1 minute on the easiest skill, 3 on the hardest) and the exit sends a signal: a blinking green marker at the edge of the screen. Reaching the exit is worth 2000 plus a time bonus, and every enemy left goes up in smoke; then the tally, the shop and the next maze. A destroyed tank comes back where it was a few seconds before. The border shows the maze number and the time; the best run (mazes escaped) is kept |
| **Fortress** | 1-4 | tower defense: hold your eagle through 30 waves (see *Fortress* below) |
| **Galaxy** | 1-4 | a space shoot-'em-up: your tanks against alien waves, sector after sector (see *Galaxy* below) |
| **Time attack** | 1-4 | clear stages 1-5 as fast as you can; enemies arrive twice as fast, no tally between stages, the clock runs in the border above the field; best time is kept |
| **Kill race** | 1-4 | no eagles, just the enemy: each round is a normal stage of enemy tanks (they appear at random free spots all over the map, never within 4 tiles of a player, instead of along the top), and whoever destroys the most of them wins the round and scores 1 point (a tie on kills goes to whoever scored more with them; still tied, nobody scores). How many points win the game is picked on the first round's curtain with left/right (1, 2, 3, 5, 7 or 10; also Settings → GAME → RACE: FIRST TO). A destroyed tank comes back after a moment, no lives lost; a grenade's kills count for whoever took it; the shovel does nothing without an eagle. The side panel shows each player's kills this round and their points as gold pips; the round result shows kills and points. Alone, you race 3 bots that hunt the enemy tanks. No shop |
| **VS CPU** | 1 | VS eagles with one player: you against the computer. Their HQ (an eagle with a red glow, in its own fortress) is at the top centre, yours at the bottom; their tanks keep coming until the HQ falls. Destroy it (2000 + 500 per round) to win the round: every enemy tank goes up with it, then the tally, the shop and the next round on a new map. Their HQ grows a little stronger each round, as yours does in the shop: round 2 repair crew, 3 walls and armor (the top border shows the armor left), 4 eagle gun (shoots you when you line up with it), 5 minefield, 6 tesla coil, 7 tank traps, then each grows to level 5. The round curtain lists what they added. The way in from below always stays brick. Ends when your eagle falls or you're out of tanks; the most rounds won is kept |
| **Co-op VS CPU** | 1-4 | VS CPU for the whole team: up to four players together against the enemy HQ, round after round, with the shop in between (alone it's plain VS CPU) |
| **VS eagles** | 2-4 | everyone has an eagle and a fortress (I bottom, II top, III left, IV right). Your shells, rockets and mines now destroy other players; you respawn while your eagle stands, and your own shells can't hurt it. Lose your eagle and you're out; the last eagle standing wins the round. Best of 3 |
| **Deathmatch** | 1-4 | no eagles; players start in the corners and respawn; first to 10 kills, or the most kills after 3 minutes (the clock is in the side panel). Alone, you play against 3 computer bots (BOT II-IV): they hunt the nearest rival (each other too), take a moment to aim (quicker on harder skills), grab nearby power-ups and shoot through bricks. Bots never set the high score |
| **Flags** | 2-4 | each player has a flag at home (marked by a square). Drive over another player's flag to grab it and bring it to your own home flag (yours must be at home) to score. Destroying a carrier drops the flag where it fell; touching your own dropped flag sends it home. First to 3 captures |

In versus, power-ups drop every 15 seconds (only ones that make sense between players), there are no enemy tanks, and
the side panel shows each player's wins, kills or captures. Round and match results show who won.

## Big scrolling maps

A big stage stitches several classic maps together (3 across and 2 down, more on wide screens). Your screen keeps its
usual field size and follows your tanks (online, each guest's view follows their own tank). Blinking squares at the
edge point to objectives off screen (gold: your HQ, cyan: outposts, red: factories), and the border above the field
shows how the objective stands.

Finding the enemy on a map bigger than the screen (big maps, the corridor, the maze):

- **Arrows** at the edge of the screen point to every enemy out of sight (darker red when it's far, a big gold one
  for a boss).
- **A minimap** in the top right corner shows the whole map: walls, water and trees, the part you're looking at
  (white frame), you and your team, the enemies (red), the eagle and the objectives. It fades while you drive under
  it. In the maze it shows no walls, since finding the way is the point. Settings → SCREEN → MINIMAP.
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

MAZE mode has five enemies of its own, found nowhere else (each has a page under ENEMY TYPES; NEW ENEMY TYPES
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

## Online play

Play with friends over the internet, peer-to-peer: the game data goes directly between your computers, with no
game server. Everyone needs the **same version** of the game file (send them `tanb4iki_v0.6.html`).
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

## Save and load

Every mode can be saved (except online games, the daily challenge and the player-against-player matches: VS
EAGLES for 2-4, DEATHMATCH, FLAGS). Each mode has its own save slot (and each GALAXY run type: campaign, boss rush,
endless, daily — a daily run's save only lasts its day).

- **Classic and big maps:** pause (Enter, P or Esc) and choose **SAVE GAME** to save exactly where you are: the stage,
  terrain, tanks, scores, lives, upgrades and mines.
- **Every other mode** saves a *checkpoint*: the start of the current stage, round, wave, corridor section, fortress
  build phase or galaxy sector (after the hangar, so what you bought is kept), with everyone's score, lives, upgrades,
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
| **L** Laser | an instant beam through every tank in line; it burns enemy shells in its way while it shows | cuts brick from MK II, more damage and through front shields from MK III; wide and endless at MK IV |
| **F** Flamethrower | hold fire: a short cone of fire that burns tanks, trees (sets them alight in summer) and shells | longer and hotter |
| **G** Mortar | lobs a shell over walls onto the first tank lined up ahead (or as far as it reaches); a blast that breaks brick | further, bigger blasts; breaks steel at MK IV |
| **T** Tesla | lightning to the nearest enemy in reach: no aiming, walls don't stop it | longer reach, jumps on to 1 / 2 / 3 more tanks |
| **H** Missiles | homing missiles that fly over walls, pick their own targets and blow up | more damage; 2 at once at MK III, 3 at MK IV |

A crate with the weapon you have raises its level; a different one swaps to it (each weapon remembers its level, so
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
you painted; boss arenas, the corridor, the maze and the fortress only take the look). Each has a twist and an enemy
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
  - **Frost Queen**: shards, a freezing beam that stops you, an ice storm
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
- **Fortress**: towers along a winding road cut down the column marching on your eagle; every wreck pays gold.
- **Galaxy**: a ringed planet, nebulae, stars streaming by; your tank flies up at the alien formation.
- **Kill race**: a stadium under the floodlights; four tanks, four lanes, and the big board counting the kills.
- **VS eagles**: two forts and their eagles in a thunderstorm, the two tanks trading shells.
- **Deathmatch**: a steel arena, red beacons, a skull on the floor, shells meeting in the middle, the kill feed.
- **Flags**: your tank runs their flag home over the bridge, theirs on its tail.
- **VS CPU** (and co-op): the machine's fortress, a face on its screen; its HQ blinks red at its foot.

**The soundtrack** comes in two styles (Settings → MUSIC STYLE):

- **ROCK** (the default): hard rock and heavy metal in the manner of the 80s and 90s, every tune written for this
  game — galloping riffs, palm-muted chugs, power chords, twin-guitar harmony leads, double-kick drums and shred
  solos, arranged in intros, verses, choruses, solos and breakdowns. Two distorted rhythm guitars left and right, a
  lead guitar with bends, vibrato and an echo, a bass and a full kit (crashes, rides, tom fills), all synthesised
  live. Where it fits the lead plays the chiptune's theme (re-arranged), and the folk tunes Korobeiniki and Shchedryk
  get metal versions. Classic: STEEL EAGLE (a galloping anthem); Survival: LAST MAN STANDING (thrash); Time Attack:
  RED LINE (speed metal); Big Maps: WIDE FRONT (a hard rock shuffle); Any Side: TURNED AROUND (prog metal in 7/8);
  Corridor: THE CLIMB (power metal); Maze: LABYRINTH OF STEEL (doom); Fortress: HOLD THE WALLS; Kill Race: NITRO
  (boogie); VS CPU and Co-op: MACHINE WAR (industrial); Eagles: EAGLE DUEL; Deathmatch: NO MERCY; Flags: BRING IT
  HOME; Custom levels: BRICK BY BRICK; the tank bosses: IRON FIST, DEEP WATERS, WAR MACHINE, CLOSE ENCOUNTER; Baba
  Galya: SHCHEDRYK (METAL); Galaxy: STARFIGHTER, ALIEN OVERLORD, HYPERSPACE, ALL YOUR BASE, KOROBEINIKI, LEVEL 9,
  UPBEAT CORPORATE ROCK 4 and STOCK MUSIC.EXE in metal; plus WARNING!, VICTORY! and THE EARTH IS SAVED. A boss's
  last phase plays faster; the easier skills play lighter drums and a touch slower.
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
| Fortress | Hold the Line | a siege march |
| Kill race | Kill Race Shuffle | swing |
| VS eagles | Eagle Duel | a stand-off |
| Deathmatch | No Mercy | aggressive |
| Flags | Bring It Home | a fanfare |
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
  - **mushroom block**: one hit and a mushroom grows out of it, walks the route to your eagle and stands guard beside
    it until the end of the stage, bouncing every shell aimed at the eagle (only where there is an eagle)
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
- **Night stages** (stages 9, 27, 45 ...: every 18th from 9) are dark except around your tanks, the eagle, shells, explosions, spawns,
  pads, street lamps, lava and erupting vents; an enemy shows only in your light or when it fires (enemies fire a bit less at night too). Every second
  power-up on a night stage is NIGHT VISION: 20 s of seeing the whole field.
  **Fog stages** (13, 31, 49 ...) are the same in grey with a wider view. Never on boss stages. The stage curtain
  says NIGHT or FOG. Settings → GAME → NIGHT AND FOG: some (default: one stage in nine), many (one in three, from
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
swamp gas, concrete, barrels, crates, deflectors, manholes), a one-line card slides down at the top of the field, such as
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
| Minotaur, crawler, sentry, locksmith, mirror (the maze's own) | speed (100%; not the sentry or mirror), hits to destroy (12 / 2 / 4 / 2 / 2), appears (on) |
| Basic / fast / power / armor tank | speed (100%), shell speed (100%), hits to destroy (1 / 1 / 1 / 4) |
| Power-ups | helmet time (10 s), clock time (10 s), shovel time (20 s), new power-up time (15 s), mines per pickup (3) |
| Who can collect | for each of the 16 power-ups: **ANYONE** (you and enemies, default), **PLAYER** (only you) or **OFF** (never appears). Presets: *classic power-ups only* and *all power-ups on*. The selected power-up's icon and effect are shown at the bottom of the screen. |
| Shop | shop after stages (on), shop prices (100%), base upgrades (on) |
| Players | III / IV-PLAYER COLOR (blue / pink), gamepad rumble (on), key and pad setup |
| Bosses | boss rounds (on), boss every (10 stages), boss HP (100%) |
| Screen | field width (13), field height (13), FIT, scaling (sharp / fill), minimap (on), controls (auto / PC / Mac), *fit to my screen*, toggle fullscreen |
| Game | game mode (classic), skill (hurt me plenty), kill race first to (3 points), mud, belts, pads (on), seasons (cycle), season effects (on), secrets (on), fortress speed (1x), big map stages (off), night and fog (some), game speed (100%), volume (100%), engine sound (on), music (on), music volume (50%), mode title screens (on), boss screens (on), first-meet cards (on), *show all cards again* |

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
js/editor.js      construction: the level editor (terrain and markers pages), random levels, save slots
js/editor2.js     construction: a level's size, markers and rules (data, the LEVEL / ENEMIES / POWER-UPS pages), playing it
js/intro.js       mode title screens: the layout, Enter/Esc, what music plays when
js/introart.js    the mode title pictures, one animated scene per mode
js/bossart.js     boss screens: a picture before each boss and one after it
js/galya.js       a secret (no spoilers)
js/modes.js       game modes: time attack, versus eagles, deathmatch, capture the flag
js/survival.js    SURVIVAL: 100 waves, entry points all round, twists, perks, drops, terrain rebuilds
js/reach.js       no dead ends: a way opened from every walled-in entry point; stuck enemies come in again
js/bigmap.js      big scrolling maps: stitched worlds, camera, outposts and factories
js/corridor.js    corridor mode: the endless climb, sections added on top as you go
js/maze.js        maze mode: the maze generator, patrols, reinforcements, the exit
js/mazefoes.js    maze mode's own enemies: the minotaur (and the lair's boss), crawlers, sentries, locksmiths, mirrors
js/fortress.js    fortress mode (tower defense): towers, upgrades and specialisations, waves, gold, the build menu, maps
js/galaxy.js      galaxy mode (a shoot-'em-up): sectors, waves, weapons, pickups, the hangar, its bosses
js/galaxy2.js     galaxy sectors 7-11 and 14: their bosses, the newer enemies and waves, skies and music
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
