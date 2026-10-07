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
  ],
  bonus: { 1: 1.1 },
  // Chapter 2 achievements boost Stardust instead of heat.
  stardustMult() { return Decimal.pow(1.1, this.list.filter((a) => a.chapter === 2 && this.has(a.id)).length); },
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
