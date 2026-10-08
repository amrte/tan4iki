# Changelog

The version lives in `js/version.js` and is shown on the title screen as `tanb4iki_v<version>`.
`node tools/build.js` writes the single-file game to `dist/tanb4iki_v<version>.html`.

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
