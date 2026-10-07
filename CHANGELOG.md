# Changelog

The version lives in `js/version.js` and is shown on the title screen as `tanb4iki_v<version>`.
`node tools/build.js` writes the single-file game to `dist/tanb4iki_v<version>.html`.

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
