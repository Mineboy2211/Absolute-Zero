# Absolute Zero — Design Document

> Status: **Milestone 1 implemented, then reworked (v2)**: slower pacing (~4×), automatic Degrees, Tickspeed renamed Draft, new visual identity. Sections 1 and 4.1–4.3 reflect the tuned values in the code.

## 0. Identity (how this differs from Incremental Mass Rewritten)

- **Degrees are automatic**: they follow your Temperature with no button and no reset. Only Grade and Order are resets ("tempering").
- **Draft** (airflow) replaces a generic tickspeed, as part of the furnace metaphor.
- **The Hearth**: buyables are machine tiles with fill meters showing how close you are to affording them (log scale).
- **Thermometer gauge** in the header always shows log-scale progress toward your next goal (next layer, then next Degree).
- Warm forge palette, Chakra Petch display font, heat glow rising from the bottom of the screen and tinted by temperature.
- **Magma flows** between resets (time matters), and Chapter rules (Gravity, Universes) change how the game is played. Numbers marked *(tune)* are starting values; they get tuned in a pacing simulation during Milestone 1/2. Chapters 2 and 3 are specified at a coarser level and will be detailed before each one is built.

## 1. Core loop

- Main stat: **Temperature `T`** in Kelvin, starts at `0 K`, grows by `dT/dt = gain` every tick.
- All numbers are `Decimal` (break_eternity.js). Every formula below is written in plain math; implementation uses `Decimal` methods.
- Notation in this doc: `log` = log10, `slog` = super-log, `1e40` = 10^40, `ee6` = 10^(10^6).
- Game tick: `requestAnimationFrame`-independent `setInterval(50ms)`, `dt` in seconds × dev speed multiplier.

### 1.1 Heat gain (per second)

```
base      = 1 + Kindling × kindlingPower                      kindlingPower = 1 (+ upgrades, ranks, challenge 1)
bellowsMul= bellowsPower ^ Bellows                             bellowsPower = 1.3 + 0.012 × Furnace (+ upgrades)
draftMul  = draftPower ^ Draft                                  draftPower = 1.12 (+ ranks, upgrades, Pressure, challenge 3)
raw       = base × bellowsMul × tickMul × rankMul × layerMuls × achievementMul
gain      = heatLoss(raw)                                      see 1.3
```

`kindlingPower = 1` at start (raised by Degree milestones and Ember upgrades).

### 1.2 Buyables (cost in K, spent from Temperature)

| Buyable  | Cost formula (n = owned)       | Unlock              |
|----------|--------------------------------|---------------------|
| Kindling | `10 × 1.35^n`                  | start               |
| Bellows  | `200 × 2.8^n`                  | Degree 1            |
| Furnace  | `1e5 × 8^(n^1.1)`              | Degree 3            |
| Draft    | `2e3 × 4^n`                    | Degree 2            |

Pacing rule of thumb: a multiplicative buyable with power `p` and cost ratio `r` makes heat grow like `T^(log p / log r)`. Keeping the sum of these exponents below 1 before Heat Loss is what stops runaway growth.

- At the very start, Kindling 0 still gives `1 K/s` (the `1 +` in `base`), so there is no dead-start.
- **Cost scaling** (IMR-style "scaled" levels): past level 100 (Kindling/Bellows), 25 (Furnace) or 50 (Draft) the exponent `n` is replaced by `n × (n/100)^0.5`. Shown in the UI as "Scaled". Later upgrades push the threshold back.
- "Buy max" uses the inverse cost formula (closed form; numeric bisection for scaled ranges).

### 1.3 Heat Loss (softcaps)

Applied to `raw` gain in log space, shown in a dedicated panel on the Main tab ("Heat Loss I: gain above 1e12 K/s is raised to ^0.5", with current effective penalty):

| # | Starts at (K/s) | Effect on excess            | Weakened by |
|---|-----------------|-----------------------------|-------------|
| I | `1e15`          | `^0.5`                      | Ember upg 11, Pressure upg 4, Magma upg 5, challenge 2, later Elements |
| II| `1e60`          | `^0.4`                      | Plasma Photons, Elements, Planck |
| III| `1e500`        | `^0.2`                      | Stardust tree, Planck |
| IV| `ee4`           | log-softcap: `log(x)^0.9`   | Planck Break, Chapter 3 |
| V | `ee50`          | `slog`-softcap              | Absolutes |

Formula for a power softcap at start `S` with power `p`: `x > S ? S × (x/S)^p : x`. "Weaken" upgrades raise `p` or multiply `S`.

### 1.4 Ranks (Degree is automatic; Grade/Order reset Temperature, buyables and lower ranks)

| Rank   | Requirement for next          | Resets              |
|--------|-------------------------------|---------------------|
| Degree | `T ≥ 10 × 5^(d^1.2)`, automatic | nothing           |
| Grade  | `Degree ≥ 5 + 2g`             | T, buyables, Degree |
| Order  | `Grade ≥ 3 + o^1.3` (rounded) | + Grade             |

Milestone rewards (listed in the Ranks tab, greyed until reached):

- **Degree 1** unlock Bellows, heat ×2 · **2** unlock Draft · **3** unlock Furnace, heat ×2 · **4** Kindling power ×2 · **6** heat ×(Degree+1) · **10** Bellows cost ÷ 10 · **15** Draft power +0.01 · **25** Kindling scaling starts 25 levels later
- **Grade 1** heat ×3 · **2** Grade no longer resets Kindling · **3** Kindling autobuyer · **5** Draft power +0.02 · **8** heat ×(Grade²) · **12** Furnace exponent +0.05
- **Order 1** heat ×10 · **2** Degree req exponent 1.2 → 1.15 · **4** Order no longer resets Degree · **6** Bellows power +0.05 · **10** heat ×1.5^Order

## 2. Architecture (data-driven)

```
index.html
css/style.css
js/format.js     number formatting (scientific / standard / engineering), time formatting
js/state.js      default player object
js/save.js       save/load/migrations, export/import (base64 JSON), hard reset, NaN guard
js/game.js       one game tick (pure logic) + time simulation used for offline progress
js/core.js       heat gain, buyables, heat loss, tickspeed, automation registry
js/ranks.js      Degree / Grade / Order
js/chapters.js   chapter registry, goals, chapter unlock screen
js/layers/layer.js   generic layer engine (reset, gain, upgrades, milestones, automation)
js/layers/ignition.js meltdown.js vaporize.js ionize.js fusion.js      (Chapter 1)
js/layers/supernova.js collapse.js singularity.js quasar.js planck.js  (Chapter 2)
js/layers/bigbang.js inflation.js entropy.js heatdeath.js absolute.js  (Chapter 3)
js/challenges.js achievements.js stats.js options.js
js/ui.js         tab system, DOM updates (only visible tab updated per frame)
js/main.js       game loop, init
```

A layer is a plain object registered with `Layers.register({...})`:

```js
{
  id: 'ignition', chapter: 1, order: 1,
  name: 'Ignition', currency: 'Embers', color: '#ff7a3d',
  unlocked: () => player.best.T.gte(1e5),
  canReset: () => player.T.gte(1e6),
  gain: () => player.T.div(1e6).pow(0.5).mul(Layers.mult('ignition')).floor(),
  onReset: () => {...},          // what this layer itself gives besides currency
  resets: ['core', 'ranks'],     // explicit list; engine adds every lower layer in the same chapter, and all earlier chapters for later-chapter layers unless `keeps` says otherwise
  upgrades: [{id, cost, currency, desc, effect: () => ..., effectDisplay, unlocked}],
  milestones: [{req: () => ..., desc}],
  automation: [{id, desc, unlocked, run(dt)}],
  tab: { render(el), update(el) }  // custom panels (Plasma split, Element grid, ...)
}
```

Chapters are `{id, name, rule, layers:[...], goals:[{id, desc, check()}], intro: 'text'}`. Adding a chapter = new file + `Chapters.register`.

### Save
- `localStorage['absoluteZero']`, autosave every 30 s + on tab close.
- Save contains `version`. `migrations[v]` upgrade old saves step by step; unknown/missing fields are filled from the default state (deep merge), so every older save keeps loading.
- `Decimal` fields are serialised as strings and revived by walking the default-state template.
- Every load runs a **NaN guard**: any non-finite Decimal is reset to its default and logged to console.
- Export/import: base64 of JSON, copy to clipboard + textarea fallback. Hard reset asks for typed confirmation ("absolute zero").
- **Offline progress**: on load, `Δt = now − lastSave` (cap 24 h, raised by upgrades), simulated in ≤ 1000 ticks of `Δt/1000` with automation running, then a summary popup ("You were away 3h 12m: +1e45 K, +2e9 Embers").

### Options
Notation (Named default: 12.3 Million / Short: 12.3 M / Letters / Scientific / Engineering / Logarithm; -illion names go up to 10^3003, then `10^4,500` style), temperature unit (K or Kelvin), autosave toggle, offline toggle, tab-hide confirmations, theme accent lock, **Debug: dev speed ×1/×10/×100/×1000** (hidden behind a toggle, flagged in the save so stats show it was used).

## 3. Pacing targets

Times are for an active-ish player; "casual" ≈ 2× these. Times are cumulative from a new game.

| Milestone | Required T | Target time |
|-----------|-----------|-------------|
| First Degree | 10 K | 10 s |
| First Grade | Degree 5 | ~6 min |
| **First Ignition** | `1e7 K` | **15–20 min** (sim: 17 min) |
| First Order | Grade 3 | ~1 h |
| **First Meltdown** | `1e22 K` | **~1h45** (sim: 1h41) |
| **First Vaporize** | `1e48 K` | **4–6 h** (sim: 4h32) |
| All 6 challenges tier 1 | | ~6h30 (sim) |
| First Ionize | `1e84 K` | ~15 h (sim: 14.5 h) |
| First Fusion | `1e125 K` | ~1.5 days (sim: 1d 6h) |
| All 26 Elements | | sim: ~2d 9h |
| **Chapter 1 complete** | `1e500 K` + goals | **~1 week casual** (sim, perfect bot: ~3.5 days) |
| Supernova | `1e3000` | +0.5 day |
| Collapse | `e1e4` | day 6 |
| Singularity | `e1e5` | day 8 |
| Quasar | `e1e6` | day 10 |
| Planck Break | `e1e8` | day 13 |
| **Chapter 2 complete** | ~`ee10` | **~2 weeks** |
| Big Bang | `ee12` | day 16 |
| Inflation | `ee25` | day 19 |
| Entropy | `ee60` | day 22 |
| Heat Death | `ee150` | day 26 |
| Absolute | `eee3` | day 30 |
| **Game end** (all Absolutes) | `eee10`-ish | **~5–6 weeks** |

Each layer is balanced so that the *first* reset of a new layer comes after the previous layer has run its course (~3–5 resets of the layer below), and its first upgrades make re-reaching the previous point ~5× faster.

## 4. Chapter 1 — Combustion

**Rule introduced:** none (the base game). Ranks, buyables, heat loss.

### Layer 1 · Ignition → Embers
- Unlock: best T ≥ `1e6`. Reset at `T ≥ 1e7`.
- Gain: `E = floor( (T/1e7)^0.5 × emberMul )`
- Resets: Temperature, buyables, ranks.
- Upgrades (12, 3×4 grid), costs in Embers:

| # | Cost | Effect |
|---|------|--------|
| 1 | 1 | Heat ×3 |
| 2 | 2 | Auto-buy Kindling |
| 3 | 5 | Embers boost heat: ×(1+E)^0.5 |
| 4 | 15 | Kindling power +1 |
| 5 | 40 | Auto-buy Bellows |
| 6 | 100 | Grade and Order do not reset buyables |
| 7 | 300 | Draft power +0.02 |
| 8 | 1e3 | Auto-buy Draft + Furnace |
| 9 | 5e3 | Ember gain ×(Degree+1)^0.75 |
| 10 | 2e4 | Auto Grade |
| 11 | 1e6 | Heat Loss I starts ×1e3 later |
| 12 | 1e8 | Embers gain ×log(T) |

- Milestones (by total Ignitions): 1 Bellows/Furnace/Draft stay unlocked · 3 start each run with 5 Kindling · 10 Kindling cost ÷2 · 25 heat ×2.

### Layer 2 · Meltdown → Magma
- Unlock: best T ≥ `1e19`. Reset at `T ≥ 1e22`.
- On reset: `Magma += (T/1e22)^0.1 × (1 + log(1+Embers)) × magmaMul` and **Flow** `+= sqrt(that gain)`.
- **Passive growth:** `dMagma/dt = Flow × flowMul`. Flow survives Meltdowns and is only reset by Vaporize (until a Pressure upgrade/milestone keeps it). This is the "magma grows by itself" mechanic: idle time between resets matters.
- Effect: heat ×`(1 + Magma)^0.5`, Embers ×`(1+Magma)^0.25`.
- Resets: everything of Ignition (Embers, Ember upgrades except those kept by milestones).
- 10 upgrades (costs 1 → 1e7 Magma, spread so there is always one to save for): Flow ×2, Flow ×log(Embers), Furnace +0.006 power, Magma boosts Draft power, Heat Loss I power 0.5→0.55, Grade^0.5 boosts Flow, auto Order, Magma effect exponent 0.5→0.6, Ember upg 3 ^0.5→^0.55, Flow boosts Magma gain.
- Milestones: 1 keep Ember upgrades 1–6 · 3 gain 10% of pending Embers/s · 10 keep all Ember upgrades · 25 Flow ×2.

### Layer 3 · Vaporize → Pressure
- Unlock: best T ≥ `1e42`. Reset at `T ≥ 1e48`.
- Gain: `P = floor( (log(T)/48)^4 × (1+log(1+Magma)) × pressureMul )` — logarithmic in T, so Pressure grows slowly and steadily.
- Effect: Draft power `+0.01 × P^0.5` (max +0.2), Embers ×`(1+P)`, Magma ×`(1+P)^0.5`.
- **Unlocks Challenges** (Challenges tab). Entering a challenge does a Vaporize reset; completing at its goal gives a permanent tiered reward. Each has 5 tiers (goal rises).

| Ch | Name | Restriction | Reward (per completion) |
|----|------|-------------|-------------------------|
| 1 | Damp Wood | Kindling does nothing; base is 1 + Bellows | Kindling power ×(1+comps) |
| 2 | Leaky Pipe | Heat Loss I starts at 1e6 | Heat Loss I power +0.03 |
| 3 | Stagnant Air | Draft disabled | Draft power +0.01 |
| 4 | Wet Embers | Ember gain ^0.5 | Embers ×10 |
| 5 | Cold Core | Magma Flow disabled | Flow ^1.05 |
| 6 | No Ranks | Ranks give no rewards | Degree req exponent −0.01 |
(Ch 5–6 unlock with Pressure upgrades. Goals per tier are listed in `js/challenges.js`.)

- 10 upgrades: keep Magma Flow, Pressure boosts Flow, unlock Ch5, Heat Loss I start ×(1+P)^5, unlock Ch6, Grade/Order req −1, buyable scaling +50 levels, Order boosts Pressure, buyables stop spending T, heat ×2^(challenge completions).
- Milestones: 1 keep all Ember upgrades · 2 auto Meltdown · 3 start with 100 Embers · 5 keep Magma upgrades · 10 Flow kept · 20 gain 10% pending Magma/s.

### Layer 4 · Ionize → Plasma
- Unlock: best T ≥ `1e76`. Reset at `T ≥ 1e84`.
- Gain: `Pl = floor( 10^((log(T) − 84)/15) × (1 + log(1+Pressure)) × plasmaMul )`.
- **Split**: Plasma is moved (not spent) into 3 pools with +10% / +50% / All buttons. Upgrades are paid with unsplit Plasma. Respec returns everything and forces an Ionize reset (until milestone 25).
  - Electrons `e`: heat ×`(1+e)^1.5` (^1.75 with upgrade 7)
  - Ions `i`: Magma flow ×`(1+i)`, Pressure ×`(1 + log(1+i))`
  - Photons `γ`: Heat Loss I and II start ×`(1+γ)^2`, Draft power `+0.005 × log(1+γ)`
- 10 upgrades (1 → 5e4 Plasma): Pressure ×3, Electrons boost Embers, Heat Loss II +0.05, keep Pressure upgrades, Ions boost Plasma, Plasma ×1.1^completions, Electron exponent 1.75, Bellows +0.1, Draft scaling +50, total Plasma boosts heat.
- Milestones: 1 keep Pressure upgrades 1/3/5 and start with 5 Pressure · 2 Vaporize autobuyer · 5 keep all Pressure upgrades · 10 gain 10% pending Pressure/s · 25 respec without reset.

### Layer 5 · Fusion → Nucleons (spent on Elements)
- Unlock: best T ≥ `1e110`. Reset at `T ≥ 1e125`.
- Gain: `N = floor( 10^((log(T) − 125)/30) × (1 + log(1+totalPlasma))^1.5 × nucleonMul )`.
- **Elements**: 26 one-time upgrades from H to Fe, bought in order, shown as a periodic table (compact grid on phones). Element k (0-based) costs `10^(0.35k + 0.008k²)` Nucleons, from 1 (H) to ~6e13 (Fe).
  - Highlights: H heat ×total Nucleons · Ne 100% passive Embers/Magma/Pressure · Na/S unlock challenges 7/8 · C, Al weaken Heat Loss I/II · Ca delays Heat Loss III · Fe raw heat gain ^1.05.
- Milestones: 1 keep Plasma upgrades and split · 2 Ionize autobuyer · 3 Plasma auto-split (last ratio) · 5 start with 10 Plasma · 10 gain 10% pending Plasma/s · 25 Nucleons ×2.
- Challenges 7 (Thin Air: Bellows stuck at ×1.1 → Bellows power +0.05/completion) and 8 (Plasma Storm: pools do nothing → Plasma ×(1+c)²) reset at the Ionize level.

### Chapter 1 goals (complete all → Chapter 1 complete screen; Chapter 2 unlocks once it exists)
1. Reach `1e500 K` (Heat Loss III starts at `1e500`, so this is the edge of Chapter 1).
2. Complete every challenge (1–8) at least 3 times.
3. Own 20 Elements.
4. Reach Order 10.
5. Have 1 Million Electrons, Ions and Photons at the same time.
6. Synthesize Iron (Fe).

## 5. Chapter 2 — Stellar *(coarse)*

**New rule — Gravity `G`:** `G = max(0, log(T) − 2500)^0.6`, recalculated live. It applies a penalty `gain → gain^(1/(1 + G/100))`. Early Chapter 2 is about pushing against it; Stardust skills and Neutronium later let you *harvest* gravity: "Gravity Well" converts it into a multiplier `×10^(G^0.5)` and finally flips the penalty into a bonus.

Starting Chapter 2 grants: all Chapter 1 resets automated and passive, ranks fully automatic, Elements auto-buy.

| # | Layer → currency | Mechanic | Cross-chapter use |
|---|------------------|----------|-------------------|
| 6 | Supernova → Stardust | Skill tree (~30 nodes, branches: Heat / Gravity / Automation / Challenges). Harder challenges 9–12 (Stellar challenges) | Nodes cost Stardust + Pressure |
| 7 | Collapse → Neutronium | "Compress": sacrifice Embers / Magma / Plasma for permanent multipliers that scale with amount sacrificed (log-based, never reset by later layers) | Directly spends Ch1 currencies |
| 8 | Singularity → Hawking Heat | Black hole: feed it a % of T; it grows mass `M_bh`; it radiates Hawking Heat over time `∝ M_bh^0.5`, which multiplies heat exponentially | Hawking Heat boosts Magma Flow |
| 9 | Quasar → Jets | Charge a Jet over time; fire it at one chosen layer (1–8) for ×(huge) gain for 60 s; cooldown | Aimed at Ch1 layers to supercharge them |
| 10 | Planck Break → Planck Shards | Breaks Heat Loss I–III (removes or raises powers); new scaling: "Planck Levels" buyable with super-scaled cost | Shards upgrade Elements beyond max |

Goals (sketch): reach `ee10`, turn Gravity positive, complete Stellar challenges, black hole mass threshold, fire 100 Jets, break all three early heat losses.

## 6. Chapter 3 — Cosmic *(coarse)*

**New rule — Universes:** before each Big Bang run you pick modifiers (e.g. "Thin Vacuum: heat ^0.9 → Universes ×3", "Fast Decay: Entropy ×5 → ×2", …). Harder combos = more Universes. Modifiers persist across lower resets until the next Big Bang.

| # | Layer → currency | Mechanic |
|---|------------------|----------|
| 11 | Big Bang → Universes | Meta layer, permanent multipliers to every earlier currency; modifier selection screen |
| 12 | Inflation → Expansion | Global speed multiplier for Ch1–2; adds new upgrade rows to Ember/Magma/Pressure/Stardust grids and new Elements (rows 4–5) |
| 13 | Entropy → Entropy | Rises on its own and divides gain; convert with "Engines" into power at a rate set by upgrades |
| 14 | Heat Death → Void | Reverse runs: start at a huge T and cool toward 0 K by buying cooling buyables; Void gain = how close to 0 K you get in log space |
| 15 | Absolute → Absolutes | Final upgrade tree; each node costs a mix of every currency in the game |

## 7. Systems shared across chapters

- **Achievements:** 15 per chapter (45 total + secret ones). Each gives ×1.05 heat (Ch1), ×1.1 a Ch2 currency, etc. Achievement bonus total shown in Stats.
- **Old currencies stay relevant:** every chapter adds upgrades priced in earlier currencies (Stardust nodes cost Pressure, Neutronium eats Embers/Magma/Plasma, Absolutes cost everything) and effects that scale with them.
- **Automation per layer:** each layer's milestones/upgrades automate the layer below; starting a chapter fully automates the previous chapter.
- **Accent color** = function of `log(T)`: blue (< 1e3), red (1e3–1e40), orange (1e40–1e400), white (1e400–ee6), violet (≥ ee6), smoothly interpolated.
- **Chapter unlock screen:** full-screen overlay with 3–4 lines of text and the new rule.

## 8. Quality checks after each layer

1. NaN scan (debug helper walks `player` and reports non-finite values).
2. Dead-end test: from a fresh save at dev speed ×1000, verify every layer's first reset is reachable without buying "wrong" upgrades.
3. Save compatibility: keep a `saves/` folder of exported saves from each version, load them in the new build.
4. Pacing check: headless simulation script (`node tools/sim.js <hours>`) runs a greedy bot and prints time to each milestone, compared with the table in §3.
