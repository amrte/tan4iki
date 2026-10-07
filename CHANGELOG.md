# Changelog

The version lives in `js/version.js` and is shown on the title screen as `tanb4iki_v<version>`.
`node tools/build.js` writes the single-file game to `dist/tanb4iki_v<version>.html`.

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
