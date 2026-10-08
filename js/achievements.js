// Achievements: one-time unlocks, each a small permanent boost.

const Achievements = {
  list: [
    // Chapter 1 — each gives heat gain ×1.1
    { id: 11, chapter: 1, name: 'Spark', desc: 'Reach 10 K.', check: () => player.T.gte(10) },
    { id: 12, chapter: 1, name: 'Kindled', desc: 'Own 10 Kindling.', check: () => player.buyables.kindling.gte(10) },
    { id: 13, chapter: 1, name: 'By Degrees', desc: 'Reach Degree 1.', check: () => player.ranks.degree.gte(1) },
    { id: 14, chapter: 1, name: 'Sun Surface', desc: 'Reach 5,778 K.', check: () => player.T.gte(5778) },
    { id: 15, chapter: 1, name: 'Top Grade', desc: 'Reach Grade 1.', check: () => player.ranks.grade.gte(1) },
    { id: 16, chapter: 1, name: 'First Light', desc: 'Ignite for the first time.', check: () => player.layers.ignition.resets > 0 },
    { id: 17, chapter: 1, name: 'Solar Core', desc: 'Reach 15,700,000 K.', check: () => player.T.gte(1.57e7) },
    { id: 18, chapter: 1, name: 'Law and Order', desc: 'Reach Order 1.', check: () => player.ranks.order.gte(1) },
    { id: 19, chapter: 1, name: 'Molten', desc: 'Melt down for the first time.', check: () => player.layers.meltdown.resets > 0 },
    { id: 20, chapter: 1, name: 'Lava Lamp', desc: 'Have 10,000 Magma.', check: () => layerPts('meltdown').gte(1e4) },
    { id: 21, chapter: 1, name: 'Planck Temperature', desc: 'Reach 1.42e32 K, the hottest temperature physics allows. Allegedly.', check: () => player.T.gte(1.42e32) },
    { id: 22, chapter: 1, name: 'Under Pressure', desc: 'Vaporize for the first time.', check: () => player.layers.vaporize.resets > 0 },
    { id: 23, chapter: 1, name: 'Challenger', desc: 'Complete any challenge.', check: () => Challenges.totalComps() >= 1 },
    { id: 24, chapter: 1, name: 'Ionized', desc: 'Ionize for the first time.', check: () => !!player.layers.ionize && player.layers.ionize.resets > 0 },
    { id: 25, chapter: 1, name: 'Star Forge', desc: 'Fuse for the first time.', check: () => !!player.layers.fusion && player.layers.fusion.resets > 0 },
    // Chapter 2 — each gives Stardust gain ×1.1
    { id: 31, chapter: 2, name: 'Fallen Star', desc: 'Go supernova for the first time.', check: () => Layers.ms('supernova', 1) },
    { id: 32, chapter: 2, name: 'Heavy', desc: 'Have 5 Gravity.', check: () => Gravity.amount().gte(5) },
    { id: 33, chapter: 2, name: 'Slingshot', desc: 'Learn Slingshot.', check: () => hasUpg('supernova', 10) },
    { id: 34, chapter: 2, name: 'Stellar Graduate', desc: 'Complete any Stellar challenge.', check: () => Challenges.list.some((c) => c.chapter === 2 && chalComps(c.id) > 0) },
    { id: 35, chapter: 2, name: 'Neutron Star', desc: 'Collapse for the first time.', check: () => Layers.ms('collapse', 1) },
    { id: 36, chapter: 2, name: 'Pressed Embers', desc: 'Reach a compressed Embers record of 300.', check: () => typeof Compressors !== 'undefined' && Compressors.record('embers').gte(300) },
    { id: 37, chapter: 2, name: 'Event Horizon', desc: 'Feed the black hole.', check: () => !!player.layers.singularity && player.layers.singularity.feeds > 0 },
    { id: 38, chapter: 2, name: 'Supermassive', desc: 'Grow the black hole to 100 solar masses.', check: () => typeof BlackHole !== 'undefined' && BlackHole.mass().gte(100) },
    { id: 39, chapter: 2, name: 'Light Show', desc: 'Fire a Jet.', check: () => !!player.layers.quasar && player.layers.quasar.fired > 0 },
    { id: 40, chapter: 2, name: 'Rapid Fire', desc: 'Fire 100 Jets.', check: () => !!player.layers.quasar && player.layers.quasar.fired >= 100 },
    { id: 41, chapter: 2, name: 'Planck Scale', desc: 'Break the Planck limit for the first time.', check: () => Layers.ms('planck', 1) },
    { id: 42, chapter: 2, name: 'Limit Breaker', desc: 'Break all three Heat Losses.', check: () => [1, 2, 3].every((n) => hasUpg('planck', n)) },
    { id: 43, chapter: 2, name: 'Four Digits', desc: 'Reach 1e1000 K.', check: () => player.bestT.gte('1e1000') },
    { id: 44, chapter: 2, name: 'Full Tree', desc: 'Own all 20 Stardust nodes.', check: () => !!player.layers.supernova && player.layers.supernova.upgrades.length >= 20 },
    { id: 45, chapter: 2, name: 'Stellar Perfection', desc: 'Max every Stellar challenge.', check: () => Challenges.list.filter((c) => c.chapter === 2).every((c) => chalComps(c.id) >= Challenges.maxComps) },
    // Chapter 3 — each gives Universes, Expansion, Entropy, Absolutes and cooling speed ×1.1
    { id: 51, chapter: 3, name: 'Let There Be Heat', desc: 'Start a new universe.', check: () => Layers.ms('bigbang', 1) },
    { id: 52, chapter: 3, name: 'Lawbreaker', desc: 'Have 3 cosmic constants active at once.', check: () => !!player.layers.bigbang && player.layers.bigbang.active.length >= 3 },
    { id: 53, chapter: 3, name: 'Multiverse', desc: 'Have 1 Million Universes.', check: () => !!player.layers.bigbang && layerPts('bigbang').gte(1e6) },
    { id: 54, chapter: 3, name: 'Inflated', desc: 'Inflate for the first time.', check: () => Layers.ms('inflation', 1) },
    { id: 55, chapter: 3, name: 'Stretched Thin', desc: 'Reach Stretch level 10 in any group.', check: () => !!player.layers.inflation && Object.values(player.layers.inflation.stretch).some((l) => l >= 10) },
    { id: 56, chapter: 3, name: 'Ten Thousand Digits', desc: 'Reach 1e10000 K.', check: () => player.bestT.gte('1e10000') },
    { id: 57, chapter: 3, name: 'It Only Goes Up', desc: 'Let entropy win for the first time.', check: () => Layers.ms('entropy', 1) },
    { id: 58, chapter: 3, name: 'Perpetual Motion', desc: 'Build 10 Heat Engines.', check: () => !!player.layers.entropy && player.layers.entropy.engines >= 10 },
    { id: 59, chapter: 3, name: 'Hard Work', desc: 'Produce 1e9 Work.', check: () => !!player.layers.entropy && player.layers.entropy.work.gte(1e9) },
    { id: 60, chapter: 3, name: 'The Long Night', desc: 'Begin a Heat Death.', check: () => typeof HeatDeath !== 'undefined' && (HeatDeath.running() || Layers.ms('heatdeath', 1)) },
    { id: 61, chapter: 3, name: 'Colder Than Space', desc: 'Cool below 2.7 K, the cosmic background.', check: () => typeof HeatDeath !== 'undefined' && (Math.min(player.layers.heatdeath.bestLow, HeatDeath.running() ? HeatDeath.currentLog() : 1e9) < Math.log10(2.725)) },
    { id: 62, chapter: 3, name: 'Quantum Chill', desc: 'Cool below 1e-100 K.', check: () => typeof HeatDeath !== 'undefined' && (Math.min(player.layers.heatdeath.bestLow, HeatDeath.running() ? HeatDeath.currentLog() : 1e9) < -100) },
    { id: 63, chapter: 3, name: 'Absolute', desc: 'Become absolute for the first time.', check: () => Layers.ms('absolute', 1) },
    { id: 64, chapter: 3, name: 'Every Law Broken', desc: 'Start a universe with every cosmic constant active.', check: () => !!player.layers.bigbang && player.layers.bigbang.active.length >= COSMIC_CONSTANTS.length },
    { id: 65, chapter: 3, name: 'Absolute Zero', desc: 'Own the Absolute Zero node.', check: () => hasUpg('absolute', 12) },
    // Chapter 4 — each gives every Chapter 4 currency and Inverted Temperature gain ×1.1
    { id: 71, chapter: 4, name: 'Population Inversion', desc: 'Fire the laser for the first time.', check: () => Layers.ms('laser', 1) },
    { id: 72, chapter: 4, name: 'Below Zero, Above Infinity', desc: 'Reach −1,000 K of Inverted Temperature.', check: () => player.inv.best.gte(1e3) },
    { id: 73, chapter: 4, name: 'Crossed Beams', desc: 'Run 2 beams at once.', check: () => typeof Beams !== 'undefined' && Beams.active().length >= 2 },
    { id: 74, chapter: 4, name: 'Aligned', desc: 'Align the lattice for the first time.', check: () => Layers.ms('spin', 1) },
    { id: 75, chapter: 4, name: 'Frustrated', desc: 'Satisfy 80% of the bonds of the 5×5 lattice.', check: () => typeof Lattice !== 'undefined' && Lattice.size() >= 5 && Lattice.order() >= 0.8 },
    { id: 76, chapter: 4, name: 'Inverted', desc: 'Invert for the first time.', check: () => Layers.ms('negkelvin', 1) },
    { id: 77, chapter: 4, name: 'Pumped', desc: 'Own 10 Pumps.', check: () => !!player.layers.negkelvin && player.layers.negkelvin.pump >= 10 },
    { id: 78, chapter: 4, name: 'One Hundred Thousand', desc: 'Reach 1e100000 K.', check: () => player.bestT.gte('1e100000') },
    { id: 79, chapter: 4, name: 'Faster Than Light', desc: 'Break causality for the first time.', check: () => Layers.ms('tachyon', 1) },
    { id: 80, chapter: 4, name: 'Time Skip', desc: 'Warp for the first time.', check: () => !!player.layers.tachyon && player.layers.tachyon.warped > 0 },
    { id: 81, chapter: 4, name: 'Hotter Than Hot', desc: 'Reach −1e15 K of Inverted Temperature.', check: () => player.inv.best.gte(1e15) },
    { id: 82, chapter: 4, name: 'Beyond Belief', desc: 'Go beyond for the first time.', check: () => Layers.ms('beyond', 1) },
    { id: 83, chapter: 4, name: 'Laser Show', desc: 'Run 5 beams at once.', check: () => typeof Beams !== 'undefined' && Beams.active().length >= 5 },
    { id: 84, chapter: 4, name: 'Ground State', desc: 'Satisfy 90% of the bonds of the 6×6 lattice.', check: () => typeof Lattice !== 'undefined' && Lattice.size() >= 6 && Lattice.order() >= 0.9 },
    { id: 85, chapter: 4, name: 'There Is No Hotter', desc: 'Own the Beyond node.', check: () => hasUpg('beyond', 12) },
  ],
  bonus: { 1: 1.1 },
  // Chapter 2 achievements boost Stardust instead of heat.
  stardustMult() { return Decimal.pow(1.1, this.list.filter((a) => a.chapter === 2 && this.has(a.id)).length); },
  // Chapter 3 achievements boost every Chapter 3 currency and cooling speed.
  universeMult() { return Decimal.pow(1.1, this.list.filter((a) => a.chapter === 3 && this.has(a.id)).length); },
  // Chapter 4 achievements boost every Chapter 4 currency and Inverted Temperature.
  inversionMult() { return Decimal.pow(1.1, this.list.filter((a) => a.chapter === 4 && this.has(a.id)).length); },
  has(id) { return player.achievements.includes(id); },
  count() { return player.achievements.length; },
  mult() {
    let m = D(1);
    for (const a of this.list) if (this.has(a.id) && this.bonus[a.chapter]) m = m.mul(this.bonus[a.chapter]);
    return m;
  },
  tick() {
    for (const a of this.list) {
      if (!this.has(a.id) && a.check()) {
        player.achievements.push(a.id);
        notify(`Achievement unlocked: ${a.name}`);
      }
    }
  },
};
