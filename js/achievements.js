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
  ],
  bonus: { 1: 1.1 },
  has(id) { return player.achievements.includes(id); },
  count() { return player.achievements.length; },
  mult() {
    let m = D(1);
    for (const a of this.list) if (this.has(a.id)) m = m.mul(this.bonus[a.chapter] || 1);
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
