# Changelog

The version lives in `js/version.js` and is shown on the title screen as `tanb4iki_v<version>`.
`node tools/build.js` writes the single-file game to `dist/tanb4iki_v<version>.html`.

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
