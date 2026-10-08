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

The game was made about 3× longer and harder (strict resets, steeper costs). Times below are from the headless bot (`tools/sim.js`), a perfect active player; casual ≈ 2× these. Cumulative from a new game.

| Milestone | Required T | Bot time |
|-----------|-----------|----------|
| **First Ignition** | `1e7 K` | **16 min** |
| First Meltdown | `1e22 K` | 3h 50m |
| First Vaporize | `1e48 K` | 11h |
| First Ionize | `1e84 K` | 1d 12h |
| First Fusion | `1e125 K` | 2d 15h |
| **Chapter 1 complete** | `1e500 K` + goals | **8d 11h** |
| First Supernova | `1e480` | 7d 21h |
| First Collapse | `1e556` | 16d 8h |
| First Quasar | `1e690` | 21d 22h |
| First Planck Break | `1e815` | 26d 22h |
| **Chapter 2 complete** | `1e2500` + goals | **~27d** |
| First Big Bang | `1e2700` | ~27d |
| First Inflation | `1e4000` | 34d 23h |
| First Entropy | `1e8000` | 37d 14h |
| First Heat Death run | `1e15000` | ~46d |
| First Absolute | `1e25500` | 48d 4h |
| **Chapter 3 complete** | `1e70000` + goals | **59d 13h** (≈ 4 months casual) |

### Reset rule (IMR style)
Every reset wipes **everything** below it: currencies, upgrades, Elements, buyables, ranks, Plasma split, Magma flow, challenge completions, compressor records, the black hole, Planck Levels, Stretch levels, Heat Engines, Work, Coolers and Void. A reset from a later chapter ignores the earlier chapter's own keep rules entirely. The only way to keep something is a milestone or upgrade of the layer doing the reset (Supernova milestones for Chapter 2 resets, Big Bang milestones for Chapter 3 resets, and so on). Finished chapters do **not** run on their own: their passive gain and autobuyers come only from milestones and upgrades, which a later reset can take away.

## 4. Chapter 1 — Combustion

Upgrade costs listed in the code are the source of truth: when the game was made harder, Ember and Magma upgrade costs were raised to ^1.3 and Pressure and Plasma costs to ^1.28 of their original values, Chapter 2 upgrade costs to ^1.2, and Chapter 3 upgrade costs (except Big Bang) to ^1.5.

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
- **Elements**: 26 one-time upgrades from H to Fe, bought in order, shown as a periodic table (compact grid on phones). Element k (0-based) costs `3 × 10^(0.35k + 0.008k²)` Nucleons, from 1 (H) to ~6e13 (Fe).
  - Highlights: H heat ×total Nucleons · Ne 100% passive Embers/Magma/Pressure · Na/S unlock challenges 7/8 · C, Al weaken Heat Loss I/II · Ca delays Heat Loss III · Fe raw heat gain ^1.05.
- Milestones: 1 keep Plasma upgrades and split · 2 Ionize autobuyer · 3 Plasma auto-split (last ratio) · 5 start with 10 Plasma · 10 gain 10% pending Plasma/s · 25 Nucleons ×2.
- Challenges 7 (Thin Air: Bellows stuck at ×1.1 → Bellows power +0.05/completion) and 8 (Plasma Storm: pools do nothing → Plasma ×(1+c)²) reset at the Ionize level.

### Chapter 1 goals (complete all → Chapter 1 complete screen; Chapter 2 unlocks once it exists)
1. Reach `1e500 K` (Heat Loss III starts at `1e500`, so this is the edge of Chapter 1).
2. Complete every challenge (1–8) at least 4 times.
3. Own 20 Elements.
4. Reach Order 10.
5. Have 1 Million Electrons, Ions and Photons at the same time.
6. Synthesize Iron (Fe).

## 5. Chapter 2 — Stellar (implemented in v2.0)

**Unlock:** complete the 6 Chapter 1 goals. Players who finished Chapter 1 before Chapter 2 existed unlock it on their next load.

**Starting Chapter 2:**
- Grade and Order no longer reset anything (with the rank autobuyers on, they used to wipe Temperature every tick).
- Every Chapter 2 reset wipes Chapter 1 completely, except what Supernova milestones keep: 2 resets keep Ember and Magma upgrades, 3 keep Pressure and Plasma upgrades, the Plasma split and Chapter 1 challenge completions, 5 keep the Magma flow and the first 10 Elements, 10 keep every Element.
- The header only shows the newest chapter's currencies.

### New rule — Gravity
- `G = ((log(T) − 450) / 50)^0.8` above `1e450 K` (×3 in Dense Core).
- Weight `w = 0.05`, reduced by Orbital Mechanics and Escape Velocity (×0.75 each), Hawking upgrade 7, Quasar upgrade 8 (×0.8 each), Planck upgrade 6 (×0.7), compressed Plasma (÷(1 + cP/200)) and challenge 9 (−5% per completion).
- Penalty: heat gain (before Heat Loss) ^`1 / (1 + G·w)`. After *Slingshot*: ^`1 + min(G·w/2, 0.15)`.
- Main tab Gravity panel shows G, w and the exponent.

### Heat Loss IV (new)
`1e1000 K/s`, logarithmic: above it the *exponent* of the gain is raised to ^0.5. Planck Break cannot break it. It guarantees that no combination of multipliers can run away (every Chapter 1/2 currency scales exponentially with log T, and without it their feedback exceeds 1).

### Layer 6 · Supernova → Stardust
- Unlocks with Chapter 2. Reset at `1e480`. `SD = 10^((log T − 480)/40) × (1 + log(1+Nucleons)) × mults`.
- Stardust: heat ×(1+SD)², Nucleons ×(1+SD).
- **Tree** (20 nodes, 4 branches, row costs ≈ 1 / 80 / 2e4 / 3e6 / 1e9 Stardust, Gravity and Trials branches also cost Pressure): Heat (Stellar Wind ^1.02, Red Giant ×SD³, Fusion Shells HL III +0.1, Hypergiant Bellows +0.25, Core Ignition ^1.03), Gravity (Orbital Mechanics, Gravity Well ×10^(G^0.6), Escape Velocity, Tidal Forces ×(1+G) Stardust, Slingshot), Memory (Afterglow Ch1 ×10, Stellar Memory keeps ranks, Remnant keeps 1%, Stellar Nursery ×3, Pulsar 1%/s), Trials (unlock challenges 9–12, Trial Mastery ×1.25 per Stellar completion).
- **Stellar challenges** (Supernova-level reset): 9 Dense Core (Gravity ×3 → weight −5%/c), 10 Red Dwarf (Ch1 gains ^0.5 → Stardust ×(1+c)), 11 Burnout (HL I–III start 1e100× earlier → HL III +0.02/c), 12 Event Horizon (heat ^0.75 → heat ^(1+0.01c)). Goals from 1e482 to 1e740.

### Layer 7 · Collapse → Neutronium
- Reset at `1e556`. `NT = 10^((log T − 556)/25) × (1 + log(1+SD))`.
- **Compressors** sacrifice all Embers / Magma / Plasma and keep the best log10 ever sacrificed, forever: heat ×10^(cE^0.6→0.7), Stardust ×(1+cM/10) (squared with an upgrade), Gravity weight ÷(1 + cP/200 or /100). Auto-compress fires when a record would grow tenfold.
- Neutronium: Stardust ×(1+NT)^0.5; upgrade 2: Chapter 1 gains ×(1+NT)^0.25.

### Layer 8 · Singularity → Hawking Heat
- Reset at `1e584`. `HH = 10^((log T − 584)/25) × (1 + log(1+NT)) × (1 + log(1+mass))`.
- **Black hole:** Feed (sets T to 0) adds `(log T / 1000)²` solar masses; radiation `20 × mass^1.5` Hawking Heat/s. Auto-feed every 10 s with an upgrade.
- Hawking Heat: heat ×(1+HH)^3 (^4 with an upgrade; an exponential effect here ran away), Magma flow ×(1+HH), Stardust ×(1 + log(1+HH)).

### Layer 9 · Quasar → Jets
- Reset at `1e690`. Jets stay scarce: `((log T − 690)/20 + 1)² × sqrt(1 + log(1+HH))`. One free Jet every 10 min (faster with upgrades).
- **Fire** (1 Jet): for 60 s (+30 with an upgrade) the target's gain is ×10^power (power 2, up to 8); aimed at Heat it is ×10^(20 × power), doubled by an upgrade. 30 s cooldown (15 with an upgrade). Auto-fire at the chosen target.

### Layer 10 · Planck Break → Planck Shards
- Reset at `1e815`. Shards are polynomial in log T: `((log T − 815)/50 + 1)² × (1 + log(1+Jets))`, so breaking the limits cannot snowball.
- Upgrades 1–3 (1 / 20 / 500 Shards) break Heat Loss I and II and give HL III +0.3. Others: Stardust ×10 per Planck Level, Shards boost Jets, Gravity weight ×0.7, cheaper levels, HL III 1e100× later, Jet power +2, heat ^1.05.
- **Planck Levels:** cost `5 × 3^level` Shards (×2.5 with an upgrade), each adds +0.02 to the heat exponent.

### Chapter 2 goals
1. Reach `1e2500 K`. 2. Learn Slingshot. 3. Complete every Stellar challenge 3 times. 4. Grow the black hole to 1,000 solar masses. 5. Fire 500 Jets. 6. Break all three Heat Losses.

### Pacing
See section 3.

## 6. Chapter 3 — Cosmic (implemented in v3.0)

**Unlock:** complete the 6 Chapter 2 goals. Feeding the black hole no longer costs Temperature. Every Chapter 3 reset wipes Chapters 1 and 2 except what Big Bang milestones keep (1: all of Chapter 1; 2: the Stardust tree and Stellar challenges; 3: Neutronium, Hawking, Jet and Planck upgrades; 5: compressor records and the black hole; 10: Planck Levels).

### New rule — cosmic constants
Before each Big Bang you *arm* constants (laws you break). Armed constants become active at the next Big Bang and stay until the one after. Each active constant multiplies Universe gain:
Thin Vacuum (heat exponent ×0.95, ×2), Frozen Stars (Stardust ^0.8, ×1.5), Dim Light (Jets 5× slower recharge, −2 power, ×1.5), Short Memory (Chapter 1 gains ^0.8, ×1.5), Heavy Vacuum (Hawking radiation ^0.8, ×1.5), Cold Start (Heat Loss IV power −0.03, ×2.5), False Vacuum (Big Bang upgrade 4: heat exponent ×0.9, ×4), Fast Decay (with Entropy: Disorder ×3, ×2).

### Heat Loss IV in Chapter 3
Most Chapter 3 layers weaken Heat Loss IV a little (power +0.01 to +0.02, or start +5–10% in orders of magnitude). With the log softcap the equilibrium is roughly `L = S·(e·c)^(p/(1−p))` (S = start in orders of magnitude, e = heat exponent, c = sum of log-multipliers per order of magnitude), so the power `p` is by far the strongest lever. It is capped at **0.6**.

### Layer 11 · Big Bang → Universes
- Reset at `1e2700`. `U = (log T / 1000)^4 / 10 × constants × mults` (polynomial, so penalties stay affordable).
- Universes: heat exponent ×(1 + 0.03·log(1+U)) (0.045, 0.06 with upgrades); Stardust, Neutronium and Hawking Heat ×(1+U)² (Jets and Planck Shards are left out on purpose: Planck Levels turn any multiplier into an exponent).
- 10 upgrades (1 → 2e7 Universes), milestones 1/2/5/10/25.

### Layer 12 · Inflation → Expansion
- Reset at `1e4000`. `E = ((log T − 4000)/200 + 1)² × sqrt(1 + log U)`.
- **Stretch:** three groups of heat multipliers (Fire = Bellows + Draft; Ash = Ranks + Chapter 1 currencies; Stars = Chapter 2 currencies). Each level raises every multiplier of its group to +0.02 power (up to +0.04 with upgrades). Cost `base × 6^level` Expansion (5^level with an upgrade). Wiped by Entropy and later resets unless Entropy has 5 resets. Never reset.
- Expansion speeds up Jet recharge and Hawking radiation ×sqrt(1+E).

### Layer 13 · Entropy → Entropy
- Reset at `1e8000`. `S = ((log T − 8000)/300 + 1)² × (1 + log E) × (1 + log Disorder)`.
- **Disorder** rises at `sqrt(1+S) × (1 + t/600)` per second (t = time in this Entropy run) and lowers the heat exponent ×1/(1 + 0.02·log D), never below ×0.96. **Heat Engines** (cost `8^n` Entropy, later 6^n) process `3^n − 1` Disorder/s into **Work** (never lost): heat exponent ×(1 + 0.01·log W).

### Layer 14 · Heat Death → Void
- Begin at `1e15000`: resets everything below, then Temperature only falls. Depth grows as `d(depth)/dt = R / (1 + depth/1000)²` (solved exactly each tick), `R = 10 × 1.5^Coolers × mults` orders of magnitude per second.
- End any time: `Void = (depth/500)²`, ×10 if you ended below 1 K (×30 with an upgrade). Coolers cost `6^n` Void (5^n with an upgrade). Void and Coolers are wiped by Absolute unless it has 3 resets.
- Void: Heat Loss IV power +0.003·log V (max +0.02), heat exponent ×(1 + 0.01·log V).

### Layer 15 · Absolute → Absolutes
- Reset at `1e25500`. `A = ((log T − 25500)/2000 + 1)^1.5 × (1 + log Void)`.
- 12 nodes, each priced in Absolutes **plus** currencies from earlier layers (Embers, Magma, Pressure, Stardust, Neutronium, Hawking Heat, Nucleons, Jets, Planck Shards, Universes, Expansion, Entropy, Void). The last one is **Absolute Zero**.

### Chapter 3 goals
1. Reach `1e70000 K`. 2. Start a universe with 5 cosmic constants active. 3. Stretch every group to level 15. 4. Produce 1e10 Work. 5. Cool below 1 K in a Heat Death. 6. Own the Absolute Zero node.

### Pacing
See section 3.

## 6b. Chapter 4 — ideas *(draft, nothing built yet)*

Chapter 3 ends near `1e67000 K` with Heat Loss IV weakened as far as it goes (power capped at 0.6). Chapter 4 should move the game into a new number regime (towards `ee6` = 1e1,000,000 and beyond) and introduce **Heat Loss V** (an `slog` softcap) as its wall. Three directions, to pick one before building:

**A. Inversion (recommended).** Real physics: a system with a population inversion has a *negative* absolute temperature, and it is hotter than any positive temperature. Having touched absolute zero from both sides, the only way further is through the far side of infinity.
- New rule — **Inversion:** Temperature gains a second, inverted track (−K). Pushing it toward −0 K counts as hotter than anything positive; the two tracks feed each other but every layer has to choose which one it boosts.
- 16 Laser → Coherence: pump energy levels; beams permanently link two older currencies (one boosts the other).
- 17 Spin Lattice → Spin: a small Ising-style grid; aligning neighbouring spins gives multipliers, frustration gives penalties (a light puzzle layer).
- 18 Negative Kelvin → Inversions: the inverted track itself, with its own buyables mirroring the Hearth.
- 19 Tachyon → Tachyons: time runs backwards; bank offline time and spend it to fast-forward any layer.
- 20 Beyond → Hyperheat: the final tree, priced in both tracks.

**B. Quantum.** New rule — **Uncertainty:** every multiplier wobbles inside a band; *Observing* locks the current roll for a while. Layers: Decoherence → Qubits, Entanglement (two currencies share their best value), Tunneling (skip a softcap for a limited time), Superposition (run two branches of the same run and keep the better), Collapse → Observations.

**C. Multiverse.** New rule — **Trade:** the Universes from Chapter 3 become separate economies with different constants; you move currencies between them at exchange rates that drift. Layers: Wormhole, Brane, Bulk, String, Omniverse.

Shared Chapter 4 plans whatever the theme: 15 achievements, 6 goals, a new challenge set (Chapter 3 has none, so Chapter 4 brings "Cosmic challenges" that run inside a constrained universe), and full automation of Chapter 3 (Heat Death runs on a timer, auto-arming of constants).

## 7. Systems shared across chapters

- **Achievements:** 15 per chapter (45 total + secret ones). Each gives ×1.05 heat (Ch1), ×1.1 a Ch2 currency, etc. Achievement bonus total shown in Stats.
- **Old currencies stay relevant:** every chapter adds upgrades priced in earlier currencies (Stardust nodes cost Pressure, Neutronium eats Embers/Magma/Plasma, Absolutes cost everything) and effects that scale with them.
- **Automation per layer:** each layer's milestones/upgrades automate the layer below. Starting a new chapter does not automate the previous one (removed when the game was made harder).
- **Accent color** = function of `log(T)`: blue (< 1e3), red (1e3–1e40), orange (1e40–1e400), white (1e400–ee6), violet (≥ ee6), smoothly interpolated.
- **Chapter unlock screen:** full-screen overlay with 3–4 lines of text and the new rule.

## 8. Quality checks after each layer

1. NaN scan (debug helper walks `player` and reports non-finite values).
2. Dead-end test: from a fresh save at dev speed ×1000, verify every layer's first reset is reachable without buying "wrong" upgrades.
3. Save compatibility: keep a `saves/` folder of exported saves from each version, load them in the new build.
4. Pacing check: headless simulation script (`node tools/sim.js <hours>`) runs a greedy bot and prints time to each milestone, compared with the table in §3.
