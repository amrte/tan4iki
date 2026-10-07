# Tank 1990 — browser replica

A from-scratch browser remake of **Tank 1990**, the NES/Famicom variant of Battle City.
It's plain HTML5 Canvas and JavaScript with no dependencies and no build step. Sprites are
stored as 16×16 palette bitmaps in code, matching the NES originals. Sound comes from a small 2A03-style synth
(pulse waves and 1-bit LFSR noise), tuned against the original effects for pitch, timing and noise rate.

## Play

Open `index.html` in any modern browser. Double-clicking the file works too, because no server is needed.
You can also serve the folder (`python3 -m http.server`) or publish it with GitHub Pages.

**Single-file download:** [`dist/tank1990.html`](dist/tank1990.html) is the whole game in one HTML file,
which you can save anywhere and open offline. To regenerate it after changing the code, run `node tools/build.js`.

### Controls

| | Player 1 | Player 2 |
|---|---|---|
| 1-player game | Arrows **or** WASD, fire with Space / Z / X / J / K / F | — |
| 2-player game | WASD, fire with Space / F / G / V | Arrows, fire with Right Ctrl / Right Shift / Numpad 0 / L / `/` |
| Start / pause | Enter / P / Esc (Esc while paused quits to the title) | |
| Mute | M | |

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

## Settings

Choose **SETTINGS** on the title screen. Use up/down to pick a row and left/right (or A/B) to change it;
on desktop you can also click and use the mouse wheel. Changed values are shown in gold. Settings are saved
in the browser, and **RESET TO DEFAULTS** restores the classic game.

| Section | Settings (default) |
|---|---|
| Player | lives (3, or infinite), I-player / II-player tank color (yellow / green, 12 colors), tank speed (100%), shell speed (100%), start stars (0), keep stars on death (off), spawn shield (3 s), extra life at 20K (once / every / off), friendly fire (freeze / off) |
| Enemies | tanks per stage (20), max on screen (4, +2 in 2P), spawn rate, fire rate, base hunting (all 100%), flashing bonus tanks (on), enemy power-up pickups (on) |
| Basic / fast / power / armor tank | speed (100%), shell speed (100%), hits to destroy (1 / 1 / 1 / 4) |
| Power-ups | helmet time (10 s), clock time (10 s), shovel time (20 s) |
| Game | game speed (100%), volume (100%), engine sound (on) |

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
js/stage.js       gameplay: terrain, movement, AI, bullets, power-ups, rendering
js/main.js        state machine (title, settings, curtain, play, score, game over, construction) + loop
tools/build.js    bundles everything into dist/tank1990.html
```

Stage maps in `js/data.js` are easy to edit. Each one is 13×13 tile codes (or 26×26 half-tile blocks),
and the legend is at the top of the list.
