# Absolute Zero

An incremental game about heating up forever. You start at 0 K with a single spark, then feed the Hearth with Kindling, Bellows, Furnaces and Draft, earn Degrees as the fire climbs, temper it into Grades and Orders, and break through layer after layer of resets: Ignition, Meltdown, Vaporize and beyond. The temperature goes to absurd numbers.

**Play it:** https://mineboy2211.github.io/Absolute-Zero/

## Status

- Base game: the Hearth (Kindling, Bellows, Furnace, Draft), automatic Degrees, Grade and Order, Heat Loss softcaps
- Chapter 1: Combustion, complete: Ignition (Embers), Meltdown (Magma), Vaporize (Pressure), Ionize (Plasma split), Fusion (Elements H to Fe), 8 challenges and 6 chapter goals
- Chapter 2: Stellar, complete: the Gravity rule, Supernova (Stardust tree), Collapse (compressors), Singularity (black hole), Quasar (Jets) and Planck Break, 4 Stellar challenges and 6 chapter goals
- Chapter 3: Cosmic, complete: the cosmic constants rule, Big Bang (Universes), Inflation (Stretch), Entropy (Disorder and Heat Engines), Heat Death (cooling runs for Void) and Absolute (the final tree), and 6 chapter goals
- Chapter 4: Inversion, complete: the Inverted Temperature rule and Heat Loss V, Laser (beams), Spin Lattice (a flip puzzle), Negative Kelvin (Pumps and Cavities), Tachyon (time bank and Warp) and Beyond (the final tree)

See [DESIGN.md](DESIGN.md) for formulas, layer plans and pacing targets.

## Running locally

`index.html` (the published page) loads one sealed, obfuscated bundle, `dist/game.js`. While developing, open `dev.html` instead: it loads the readable source files from `js/`.

After changing anything in `js/`, rebuild the bundle before publishing:

```bash
npm install javascript-obfuscator
node tools/build.js
```

The bundle hides the game state from the browser console and signs saves with a key kept in `tools/.save-key`, which is never committed (it is created on the first build). The source folder, tools and `dev.html` are not served by GitHub Pages (`_config.yml`).

Numbers use [break_eternity.js](https://github.com/Patashu/break_eternity.js), loaded from a CDN, so you need an internet connection the first time.

## Cloud saves

Players can create an account (username and password) in Options and carry their save between devices. It runs on Firebase (free tier):

1. Create a project at https://console.firebase.google.com and add a **Web app**.
2. **Authentication → Sign-in method:** enable **Email/Password** (usernames are turned into made-up addresses, no email is ever sent).
3. **Authentication → Settings → Authorized domains:** add `mineboy2211.github.io`.
4. **Firestore Database:** create it, then paste `firestore.rules` into its **Rules** tab and publish.
5. Paste the web app's `firebaseConfig` object into `js/cloud-config.js`, rebuild (`node tools/build.js`) and push.

Until step 5, the game shows "Cloud saves are not available yet".

## Pacing simulator

`tools/sim.js` plays the game headlessly with a greedy bot and prints when each milestone is reached:

```bash
npm install break_eternity.js
node tools/sim.js 3
```

The argument is the number of in-game hours to simulate. Useful environment variables: `STEP=6` (seconds per tick), `LOAD=save.txt` (start from an exported save), `SAVE_OUT=out.txt`, `STOP_CHAPTER=2`, `PRE='code'` (run code before the bot starts), `BOT_CONSTS=frozen,dim` (cosmic constants the bot arms), `HD_HOURS=2` (length of the bot's Heat Death runs). The bot itself lives in `tools/sim-bot.js`.

## Display

Numbers default to named notation (12.3 Million K). Options also offers short suffixes, letters, scientific, engineering and logarithm, and the temperature unit can be K or Kelvin. The layout adapts to phones (portrait and landscape), tablets and desktops.

## Developer mode

A hidden developer mode (Konami code, or 7 taps on the version line) lets you speed up game time (×2 up to ×1000) to test pacing. Saves remember if it was used. On desktop, the right-click menu and the developer-tools shortcuts are blocked as a light deterrent against editing the game from the console.
