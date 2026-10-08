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
| Start / pause | Enter / P / Esc opens the pause menu (CONTINUE / SAVE GAME / QUIT); P or Esc resumes | |
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

- **Title screen** with brick lettering, **1 PLAYER / 2 PLAYERS / CONSTRUCTION** menu and a saved hi-score.
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
- 20 enemies per stage, with at most 4 on screen (6 in 2-player). The enemy reserve is shown in the side panel.
- **2-player co-op:** friendly fire briefly freezes your partner, and the player with more kills
  in a stage earns a 1000-point bonus.
- Spawn sparkles, shields, explosions, score pop-ups, the rising "GAME OVER", the tallied score screen
  and the big brick "GAME OVER" screen.
- An extra life at 20,000 points.
- **Construction mode:** move the cursor and press **A** (fire) to place or cycle 14 tile patterns, or **B** to cycle backwards.
  Press **Delete** to clear the map and **Enter** to play your map. Custom maps are saved in the browser.
- Chiptune sound effects and engine hum, made with Web Audio.

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

Pick a mode on the title screen's **MODE** row (left/right), then start with 1 PLAYER or N PLAYERS (versus needs 2-4,
on one keyboard, with pads, or online; VS eagles, deathmatch and kill race can also be played alone, against the computer).
Survival, time attack, corridor and VS CPU keep their best results; there is no shop outside Classic, Big maps and VS
CPU, and no saving outside Classic and Big maps.

| Mode | Players | How it works |
|---|---|---|
| **Classic** | 1-4 | the game as always |
| **Survival** | 1-4 | endless waves on one map; wave *n* brings 6 + 2*n* tanks and later waves bring the newer, tougher enemies. After each wave a 4-second breather, the fortress walls are patched, and every 5 waves everyone gets a tank. The side panel's flag shows the wave. Ends when the eagle falls or everyone is out; best wave and score are kept |
| **Big maps** | 1-4 | every stage is a big scrolling map (see below); shop and saves work as in Classic |
| **Corridor** | 1-4 | the usual width, endless height: no eagle, just climb. The world is three map sections stacked (random classic maps, mirrored outwards on wider fields); once the whole team has climbed out of the bottom section it drops away and a fresh section appears on top, so the climb never ends and nobody gets left behind. Enemies keep arriving just above the screen, faster and tougher the higher you get (the flag shows the level: one per section climbed). The enemy grows slowly with the climb: only basic tanks at first, then fast (10 tiles), power (26) and armor (45), then the newer types one at a time every 20 tiles from 52 (rocket first), each starting rare and taking 40 tiles to reach its full share; veterans from about 100 tiles and elites from 230. A gold *NAME AHEAD!* tells you when a new kind joins; ones left far below drop out. A destroyed tank comes back at the bottom of the screen; every 5 sections everyone gets a tank. The border above the field shows how far you've climbed (in tiles) and your best; ends when everyone is out |
| **Time attack** | 1-4 | clear stages 1-5 as fast as you can; enemies arrive twice as fast, no tally between stages, the clock runs in the border above the field; best time is kept |
| **Kill race** | 1-4 | no eagles, just the enemy: each round is a normal stage of enemy tanks, and whoever destroys the most of them wins the round and scores 1 point (a tie on kills goes to whoever scored more with them; still tied, nobody scores). How many points win the game is picked on the first round's curtain with left/right (1, 2, 3, 5, 7 or 10; also Settings → GAME → RACE: FIRST TO). A destroyed tank comes back after a moment, no lives lost; a grenade's kills count for whoever took it; the shovel does nothing without an eagle. The side panel shows each player's kills this round and their points as gold pips; the round result shows kills and points. Alone, you race 3 bots that hunt the enemy tanks. No shop |
| **VS CPU** | 1 | VS eagles with one player: you against the computer. Their HQ (an eagle with a red glow, in its own fortress) is at the top centre, yours at the bottom; their tanks keep coming until the HQ falls. Destroy it (2000 + 500 per round) to win the round: every enemy tank goes up with it, then the tally, the shop and the next round on a new map. Their HQ grows a little stronger each round, as yours does in the shop: round 2 repair crew, 3 walls and armor (the top border shows the armor left), 4 eagle gun (shoots you when you line up with it), 5 minefield, 6 tesla coil, 7 tank traps, then each grows to level 5. The round curtain lists what they added. The way in from below always stays brick. Ends when your eagle falls or you're out of tanks; the most rounds won is kept |
| **VS eagles** | 2-4 | everyone has an eagle and a fortress (I bottom, II top, III left, IV right). Your shells, rockets and mines now destroy other players; you respawn while your eagle stands, and your own shells can't hurt it. Lose your eagle and you're out; the last eagle standing wins the round. Best of 3 |
| **Deathmatch** | 1-4 | no eagles; players start in the corners and respawn; first to 10 kills, or the most kills after 3 minutes (the clock is in the side panel). Alone, you play against 3 computer bots (BOT II-IV): they hunt the nearest rival (each other too), take a moment to aim (quicker on harder skills), grab nearby power-ups and shoot through bricks. Bots never set the high score |
| **Flags** | 2-4 | each player has a flag at home (marked by a square). Drive over another player's flag to grab it and bring it to your own home flag (yours must be at home) to score. Destroying a carrier drops the flag where it fell; touching your own dropped flag sends it home. First to 3 captures |

In versus, power-ups drop every 15 seconds (only ones that make sense between players), there are no enemy tanks, and
the side panel shows each player's wins, kills or captures. Round and match results show who won.

## Big scrolling maps

A big stage stitches several classic maps together (3 across and 2 down, more on wide screens). Your screen keeps its
usual field size and follows your tanks (online, each guest's view follows their own tank). Blinking squares at the
edge point to objectives off screen (gold: your HQ, cyan: outposts, red: factories), and the border above the field
shows how the objective stands. Big stages bring twice the tanks and two more on screen at once. Each has an objective,
taking turns:

- **Outposts**: two more eagles with fortresses stand beside your HQ. Enemies go for whichever eagle is nearest.
  Only losing the HQ ends the game; every outpost still standing when the stage is cleared is worth 2000 to each player.
  Your own shells can't hurt them.
- **Factories**: three enemy factories in the far half keep turning out tanks until destroyed (8 hits, star-3 shells
  count double, rockets and mines too; 1000 points each). The stage is clear only when every factory is down and the
  last tank is gone.

Play them in the **BIG MAPS** mode (every stage), or in Classic with Settings → GAME → **BIG MAP STAGES: SOME**
(every 4th stage that isn't a boss stage; off by default).

## Skill levels

Pick the skill on the title screen (the coloured row; left/right changes it). The names come from DOOM:

| Skill | What changes |
|---|---|
| I'M TOO YOUNG TO DIE | 3 extra tanks; every life starts with an armour plate (like DOOM's half damage); the eagle has 2 free armour each stage; one enemy fewer on screen; enemies mostly wander, fire about a third as often and move and shoot slower; new enemy types come 15 stages later and rarely; no veterans; bosses 50% HP |
| HEY, NOT TOO ROUGH | 2 extra tanks; the eagle has 1 free armour; enemies gentler and mostly wander; new types 6 stages later and less often; veterans 15 stages later; bosses 75% HP |
| HURT ME PLENTY | the default: the full mix of enemies, a little less aggressive than before |
| ULTRA-VIOLENCE | one more enemy on screen; enemies fire 30% more, move and shoot faster, arrive sooner, rush and hunt more; more new types; veterans 5 stages earlier; bosses 125% HP |
| NIGHTMARE! | two more on screen and all of that and more (fire +60%, bosses 150% HP, veterans 10 stages earlier), and as in DOOM, enemies you destroy may come back (about 1 in 3) |

**AUTO** (the sixth choice, in blue) adjusts the enemies to how you play. It keeps a rating from 0
(I'M TOO YOUNG TO DIE) to 4 (NIGHTMARE!) and blends every number in the table between the two nearest skills, including
the easy skills' free plates and eagle armour. Each destroyed enemy nudges it up, a cleared stage moves it up more
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
| Flamer (Torch) | 9 | red, fuel cylinders on the back | a 2-tile flame jet instead of shells: can't be shot down, burns trees, hurts every tank it touches (its own side too) | 2 / 400 / 25 |
| Mason (Crane) | 12 | blue chassis under a yellow gantry | rebuilds an 8px block of shot-away brick every 3 s within 6 tiles (never over a tank); likes to rush the eagle and patch its walls | 2 / 400 / 25 |
| Splitter (Twin Hull) | 14 | two half-hulls along a seam | on its last hit splits into two fast minis (1 hit, 100 points) that rush the eagle; a rocket, mine or grenade destroys it whole | 1 / 300 / 15 |
| Medic (Field Ambulance) | 17 | white with a red cross | every 4 s repairs one hit on a damaged enemy nearby (a beam shows it); tanks that appear near it get a shield | 2 / 500 / 30 |
| Mortar (Long Tom) | 19 | bronze howitzer | stops and lobs a shell over walls at you; a crosshair marks the spot 1.5 s before it lands; can't hit closer than 3 tiles | 2 / 400 / 25 |
| Jammer (Dish) | 21 | grey with a radar dish | inside its 3-tile ring your shells fly at half speed and timed power-ups stop counting down | 1 / 400 / 25 |
| Snake | 13 | a long green snake with red eyes and a flicking tongue | fast, never shoots, slithers through brick (not steel); only its head can be hurt (10 hits, its body stops shells); it hunts you and eats your tank if it reaches you, growing a segment each time; a shield or armour plate makes it recoil | 10 / 800 / 50 |
| Spotter (Sky Eye) | 23 | orange with a red-eyed mast | marks a player it can see along a row or column (steel, brick and trees block its view); while marked, every enemy hunts that player and fires more; the mark fades 5 s after it loses sight, or when the spotters die | 1 / 500 / 30 |

They take a bigger share of each stage as the game goes on (about 1 in 4 tanks by stage 20, about half by stage 35); from stage 23 all 12 types are in the mix.
NEW ENEMY TYPES: OFF / FEW / NORMAL / MANY. The score tally adds a NEW row for them.

**Veterans and elites.** From stage 10 some enemies are veterans (2 white stripes: +1 hit, shells 30% faster,
a bit faster, fire more, 1.5× XP), and from stage 20 some are elites (gold stripes and a turret star: +2 hits,
shells 50% faster, 20% faster, fire more, 2× XP). Both grow more common in later stages. VETERANS + ELITES: on / off.

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
the stage; its escorts blow up with it. The side panel shows the boss's HP bar and how many escorts are left.
Every big attack flashes a warning first, each boss changes behaviour at half HP, and a power-up drops at 75%, 50% and 25% HP.
Beating a boss scores 5,000–10,000 points and gives 25% off in the next shop. After stage 50 the bosses repeat with +50% HP each loop.
In 2-player games boss HP is 50% higher.

| Stage | Boss | How it fights | How to beat it |
|---|---|---|---|
| 10 | **Iron Bear** | slow heavy tank with a ram; 3-shell volleys; flashes red, then charges in a straight line, crushing bricks and anything in the way | dodge the charge; it's dazed afterwards (longer if it hit steel) and takes double damage |
| 20 | **Mole** | moves underground (only a dust trail), surfaces near you or the eagle after a dust swirl, fires 8 shells in a cross, then burrows; breaks the steel ring in front of the eagle | hit it while it's up; at half HP it pops up twice and leaves mines |
| 30 | **Hydra** | sits on an island; left turret fires gatling bursts, right turret rockets, centre turret a laser beam down the screen | a ship is provided; destroy the turrets one by one, then the exposed core |
| 40 | **Phantom** | nearly invisible, shows itself only when firing; teleports and leaves decoys (more when angry, and then they fire) | decoys pop in one hit; only the real Phantom leaves tracks on the ice |
| 50 | **Dreadnought** | huge fortress tank; phase 1 cannons that break steel and a hatch that releases armor tanks; phase 2 mine lines and spread volleys; phase 3 crawls toward the eagle and fires laser beams at you | dig through its steel with star-3 or rocket shells; stay mobile in phase 3 |

Settings → BOSSES: boss rounds on/off, boss every 5–30 stages, boss HP 25%–300%.

## Save and load

Pause the game (Enter, P or Esc) and choose **SAVE GAME** to save exactly where you are: the stage, terrain,
tanks, scores, lives, upgrades and mines. The game also saves automatically at the start of every stage.
Choose **CONTINUE** on the title screen to resume; the game opens paused so you can get ready.
There is one save slot, kept in the browser.

The stage picker at the start of a new game remembers the stage you last played. You can pick any of the
35 maps, or any stage up to the furthest one you have reached (up to 99).

## Field size and full screen

The classic field is 13×13 tiles. In Settings → SCREEN you can set **FIELD WIDTH** (13–60) and **FIELD HEIGHT** (13–40),
or choose **FIT** to match the window's shape. Bigger fields extend each stage by mirroring it outwards, with the
eagle kept at the bottom centre. **FIT TO MY SCREEN** sets everything at once for a laptop such as a 13" MacBook:
FIT width, FILL scaling and fullscreen. On a 16:10 MacBook screen in fullscreen that gives a 19×13 field.
**SCALING** is SHARP (whole-pixel scaling, crispest) or FILL (uses all the space).

## Shop

After each cleared stage, once the score tally finishes, the shop opens. The points you've earned are your money,
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
| Turret | 4000 | one turret to place with **B** |
| Claude | 6000 | Claude joins you at the start of the next stage |
| Wingman | 5000 | an AI tank fights beside you next stage |
| Decoy eagle | 3000 | a fake eagle lures rushing enemies next stage |
| Smoke | 1500 | smoke screen when your tank first appears |
| Bridge kit | 1500 | 2 bridges: drive into water to lay one |

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
| Eagle gun | a turret on the eagle shoots enemies lined up above or beside it; range 6 → 15 tiles and faster each level; steel-breaking shells at 4, exploding shells at 5. Its shells pass through your tanks and never break the fortress; its kills earn no points | 5000 – 16000 |
| Minefield | 2 / 4 / 6 / 8 / 10 armed mines in front of the fortress at the start of each stage | 2000 – 6000 |
| Tesla coil | zaps every enemy within 2 → 4 tiles of the eagle, every 3 s → every second | 6000 – 16000 |
| Tank traps | enemies near the eagle (2.5 → 4.5 tiles) move 30% → 70% slower; a dotted arc marks the zone | 2500 – 9000 |
| Supply drop | a power-up lands just in front of the fortress every 60 / 45 / 35 / 25 / 20 s | 4000 – 12000 |
| Radar (3 levels) | stealth tanks always show / see which tank is about to appear at each entry point / spotters can't mark you | 3000 – 7000 |

After a shovel runs out, the walls go back to their upgraded state, not plain brick. Settings → SHOP → BASE UPGRADES
turns them off.

## New power-ups

These 14 were not in the original game. They're marked with `*` in Settings and can be switched off there.

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
| **Turret** (tripod) | a turret appears where you grab it: it swings round to the nearest enemy within 8 tiles and fires once lined up; 3 hits; never fires across your eagle; its kills score for you | a red turret that shoots you |
| **Claude** (the orange Claude sparkle) | Claude walks the field for 20 s, chirping, and eats every enemy tank (armor included) and enemy shell it bumps into; it nibbles bosses; points are yours | "NOPE!": Claude doesn't work for them (only players can collect it by default) |
| **Revive** (heart) | every fallen teammate comes back with one tank; if nobody is down, an extra life | 2 more enemy tanks join the stage |
| **Bridge** (planks) | 2 bridge kits: drive into water to lay a bridge | that tank can cross water |
| **Smoke** (cloud) | enemies lose track of you for 15 s | that tank fades into smoke |
| **Airstrike** (plane) | a plane flies along the row with the most enemies (never the rows by your eagle) and bombs it | the plane bombs your row |

## Wingman, decoy eagle, smoke and bridges

- **Wingman** (shop, 5000): a white AI tank with a blue dot joins you at the start of the next stage. It hunts the
  nearest enemy, shoots through bricks in its way, never fires across your eagle, survives one hit and its kills score
  for you. Losing it costs no life.
- **Decoy eagle** (shop, 3000): a fake eagle (straw-coloured outline) stands in the middle of the field. Rushing
  enemies, base hunters and snipers go for it first; it takes 2 hits.
- **Smoke** (power-up, or 1500 in the shop for the start of a stage): for 15 s enemies, their turrets, spotters and
  bosses lose track of you (they still bump into you). An enemy that grabs it fades into smoke.
- **Bridge kit** (power-up gives 2, shop 1500 for 2): drive into water and a bridge is laid straight across it; it
  stays for the stage and anyone can use it. Carried kits show as brown dots in the side panel. An enemy that grabs
  the power-up can cross water.

## Terrain: mud, conveyor belts, teleporters; night and fog

- **Mud** (brown, lumpy): any tank on it moves at half speed; shells pass over it; hovering skimmers glide across.
- **Conveyor belts** (grey with moving stripes): carry any tank along the belt, even one standing still.
- **Teleporter pads** (coloured squares, in linked pairs of the same colour): drive onto one and you come out of its
  twin; shells that enter a pad leave its twin too (once each).
- They appear in the normal stages, placed the same way every time a stage is played: mud from stage 3,
  teleporters in most stages from 5, conveyor belts in some from 8, never next to the eagle or on entry points.
  Bigger fields get more. Settings → GAME → MUD, BELTS, PADS turns them off. In CONSTRUCTION they are the last
  patterns of the palette (pads pair up in the order you place them).
- **Night stages** (every 6th stage from 6) are dark except around your tanks, the eagle, shells, explosions, spawns
  and pads; an enemy shows only in your light or when it fires (enemies fire a bit less at night too).
  **Fog stages** (every 6th from 9) are the same in grey with a wider view. Never on boss stages. The stage curtain
  says NIGHT or FOG. Settings → GAME → NIGHT AND FOG: some (default), off, all night, all fog.

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

The first time you meet each enemy, boss and power-up, a one-line card slides down at the top of the field, such as
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

- **Turrets** can also be bought in the shop (4000 each) and carried: **B** places one where you stand (turrets come
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

Choose **SETTINGS** on the title screen. Use up/down to pick a row and left/right (or A/B) to change it;
on desktop you can also click and use the mouse wheel. Changed values are shown in gold. Settings are saved
in the browser, and **RESET TO DEFAULTS** restores the classic game.

| Section | Settings (default) |
|---|---|
| Player | lives (3, or infinite), I-player / II-player tank color (yellow / green, 12 colors), tank speed (100%), shell speed (100%), start stars (0), keep stars on death (off), spawn shield (3 s), extra life at 20K (once / every / off), friendly fire (freeze / off), revive cost (7500) |
| XP and levels | XP and levels (on), XP rate (100%), level perks (on / looks only), start level (1), XP lost on death (0%), *show ranks and perks* |
| Enemies | tanks per stage (20, from 1 to 99), max on screen (4, up to 20, +2 in 2P), spawn rate, fire rate, base hunting (all 100%), flashing bonus tanks (on), AI personalities (mixed), show AI type (off), new enemy types (normal), veterans + elites (on) |
| Rocket / shield / sapper / shade tank | speed (100%), shell speed (100%), hits to destroy (1 / 2 / 1 / 1), appears (on) |
| Mason, mortar, skimmer, flamer, splitter, medic, jammer, spotter, snake | speed (100%), hits to destroy, appears (on) |
| Basic / fast / power / armor tank | speed (100%), shell speed (100%), hits to destroy (1 / 1 / 1 / 4) |
| Power-ups | helmet time (10 s), clock time (10 s), shovel time (20 s), new power-up time (15 s), mines per pickup (3) |
| Who can collect | for each of the 16 power-ups: **ANYONE** (you and enemies, default), **PLAYER** (only you) or **OFF** (never appears). Presets: *classic power-ups only* and *all power-ups on*. The selected power-up's icon and effect are shown at the bottom of the screen. |
| Shop | shop after stages (on), shop prices (100%), base upgrades (on) |
| Players | III / IV-PLAYER COLOR (blue / pink), gamepad rumble (on), key and pad setup |
| Bosses | boss rounds (on), boss every (10 stages), boss HP (100%) |
| Screen | field width (13), field height (13), FIT, scaling (sharp / fill), controls (auto / PC / Mac), *fit to my screen*, toggle fullscreen |
| Game | game mode (classic), skill (hurt me plenty), kill race first to (3 points), mud, belts, pads (on), big map stages (off), night and fog (some), game speed (100%), volume (100%), engine sound (on), first-meet cards (on), *show all cards again* |

## Code layout

```
index.html        page shell + touch controls
css/style.css     layout, pixel-perfect scaling
js/data.js        font, terrain textures, 35 stage maps, enemy line-ups
js/sprites.js     sprite bitmaps (tanks, power-ups, eagle, effects, HUD icons)
js/gfx.js         palettes, font, sprite rendering and caching
js/config.js      settings: definitions, defaults, saving, tank color presets
js/audio.js       NES-style Web Audio synth (SFX, jingles, engine)
js/input.js       keyboard / gamepad / touch
js/stage.js       gameplay: terrain, movement, enemy types, bullets, power-ups, XP, rendering
js/ai.js          enemy personalities (wander / rush / hunt / snipe) and path finding
js/enemies.js     abilities of the enemies from the design canvas (mason, mortar, flamer, medic, ...)
js/base.js        base upgrades: fortress walls, eagle armor, repair crew, eagle gun, minefield
js/extras.js      turrets, Claude, airstrikes, revival, wingman, decoy eagle, smoke, bridges
js/terrain.js     mud, conveyor belts, teleporter pads, night and fog stages
js/modes.js       game modes: survival waves, time attack, versus eagles, deathmatch, capture the flag
js/bigmap.js      big scrolling maps: stitched worlds, camera, outposts and factories
js/corridor.js    corridor mode: the endless climb, sections added on top as you go
js/cards.js       first-meet cards for new enemies, bosses and power-ups
js/cpuvs.js       VS EAGLES against the computer: the enemy HQ and its upgrades round by round
js/bots.js        deathmatch and kill-race bots: computer-driven players
js/race.js        kill race: most kills per round scores a point
js/bosses.js      boss rounds: the 5 bosses, their arenas, sprites and behaviour
js/net.js         online play: WebRTC connection, codes, host streaming, guest view, lobby panels
js/main.js        state machine (title, settings, curtain, play, score, game over, construction) + loop
js/version.js     app name and version (single source of truth)
tools/build.js    bundles everything into dist/tanb4iki_v<version>.html
```

Stage maps in `js/data.js` are easy to edit. Each one is 13×13 tile codes (or 26×26 half-tile blocks),
and the legend is at the top of the list.
