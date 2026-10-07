# Absolute Zero

An incremental game about heating up forever. You start at 0 K with a single spark, then feed the Hearth with Kindling, Bellows, Furnaces and Draft, earn Degrees as the fire climbs, temper it into Grades and Orders, and break through layer after layer of resets: Ignition, Meltdown, Vaporize and beyond. The temperature goes to absurd numbers.

**Play it:** https://mineboy2211.github.io/Absolute-Zero/

## Status

- Base game: the Hearth (Kindling, Bellows, Furnace, Draft), automatic Degrees, Grade and Order, Heat Loss softcaps
- Chapter 1: Combustion, layers 1 to 3 (Ignition, Meltdown, Vaporize) and 6 challenges
- Coming next: Ionize, Fusion, chapter goals, then Chapters 2 and 3

See [DESIGN.md](DESIGN.md) for formulas, layer plans and pacing targets.

## Running locally

Open `index.html` in a browser. No build step. Numbers use [break_eternity.js](https://github.com/Patashu/break_eternity.js), loaded from a CDN, so you need an internet connection the first time.

## Pacing simulator

`tools/sim.js` plays the game headlessly with a greedy bot and prints when each milestone is reached:

```bash
npm install break_eternity.js
node tools/sim.js 3
```

The argument is the number of in-game hours to simulate.

## Display

Numbers default to named notation (12.3 Million K). Options also offers short suffixes, letters, scientific, engineering and logarithm, and the temperature unit can be K or Kelvin. The layout adapts to phones (portrait and landscape), tablets and desktops.

## Developer mode

Options → Debug → Developer mode lets you speed up game time (×2 up to ×1000) to test pacing. Saves remember if it was used.
