// Chapters: groups of 5 layers. Completing every goal of a chapter unlocks the next one (no reset).

const Chapters = {
  list: [],
  register(def) { this.list.push(def); this.list.sort((a, b) => a.id - b.id); },
  get(id) { return this.list.find((c) => c.id === id); },
  current() { return this.get(player.chapters.unlocked); },
  goalsDone(ch) { return ch.goals.filter((g) => g.check()).length; },
  isComplete(ch) { return ch.goals.every((g) => g.check()); },
  // True once the player has moved past chapter `id` (its layers are then fully automated).
  passed(id) { return player.chapters.unlocked > id; },
  // What a reset from chapter byDef.chapter keeps of an earlier-chapter layer `def`.
  crossKeep(def, byDef) {
    const ch = this.get(byDef.chapter);
    return (ch && ch.keep && ch.keep(def)) || {};
  },
  tick() {
    const ch = this.current();
    if (!ch || !this.isComplete(ch)) return;
    const next = this.get(ch.id + 1);
    const firstTime = player.chapters.completed < ch.id;
    player.chapters.completed = Math.max(player.chapters.completed, ch.id);
    if (next) {
      this.unlock(next);
    } else if (firstTime && typeof UI !== 'undefined') {
      UI.showChapterComplete(ch);
    }
  },
  unlock(ch) {
    player.chapters.unlocked = ch.id;
    if (typeof UI !== 'undefined') UI.showChapterIntro(ch);
  },
};

Chapters.register({
  id: 1,
  name: 'Combustion',
  rule: 'Heat things up. Ranks, buyables and the first five reset layers.',
  intro: [
    'The universe is still. Nothing moves, nothing glows.',
    'Everything rests at 0 K: absolute zero.',
    'Then, somewhere, a single spark.',
    'Feed it. Fan it. Make it burn hotter than anything has ever burned.',
  ],
  goals: [
    { desc: 'Reach 1e500 K.', check: () => player.bestT.gte('1e500') },
    { desc: 'Complete every Chapter 1 challenge at least 3 times.', check: () => Challenges.list.filter((c) => c.chapter === 1).every((c) => chalComps(c.id) >= 3) },
    { desc: 'Own 20 Elements.', check: () => Elements.count() >= 20 },
    { desc: 'Reach Order 10.', check: () => player.ranks.order.gte(10) },
    { desc: 'Have 1 Million Electrons, Ions and Photons at once.', check: () => ['e', 'i', 'p'].every((k) => Layers.map.ionize.pool(k).gte(1e6)) },
    { desc: 'Synthesize Iron (Fe).', check: () => hasUpg('fusion', 26) },
  ],
  complete: [
    'Iron. The heaviest thing a star can forge before it dies.',
    'Your fire has burned through every layer of combustion.',
  ],
});

Chapters.register({
  id: 2,
  name: 'Stellar',
  rule: 'Gravity. It grows with your temperature and pulls your heat gain down, until you learn to use it.',
  // What Chapter 2 resets keep of Chapter 1 (Supernova milestones).
  keep(def) {
    const m = (n) => Layers.ms('supernova', n);
    switch (def.id) {
      case 'ignition': return { upgrades: m(2) };
      case 'meltdown': return { upgrades: m(2), flow: m(5) };
      case 'vaporize': return { upgrades: m(3) };
      case 'ionize': return { upgrades: m(3), split: m(3) };
      case 'fusion': return { upgrades: m(10) ? true : m(5) ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] : [] };
      default: return {};
    }
  },
  intro: [
    'Iron. The fire has nothing left to fuse.',
    'So it falls inward, under its own weight.',
    'Gravity is no longer something you can ignore: the hotter you burn, the harder it pulls.',
    'Grade and Order no longer reset anything. But every Chapter 2 reset wipes Chapter 1 clean, until Supernova milestones teach you what to keep.',
  ],
  goals: [
    { desc: 'Reach 1e2500 K.', check: () => player.bestT.gte('1e2500') },
    { desc: 'Learn Slingshot (Gravity becomes a bonus).', check: () => hasUpg('supernova', 10) },
    { desc: 'Complete every Stellar challenge at least 3 times.', check: () => Challenges.list.filter((c) => c.chapter === 2).every((c) => chalComps(c.id) >= 3) },
    { desc: 'Grow the black hole to 1,000 solar masses.', check: () => !!player.layers.singularity && !!player.layers.singularity.mass && player.layers.singularity.mass.gte(1000) },
    { desc: 'Fire 500 Jets.', check: () => !!player.layers.quasar && player.layers.quasar.fired >= 500 },
    { desc: 'Break all three Heat Losses.', check: () => !!player.layers.planck && [1, 2, 3].every((n) => hasUpg('planck', n)) },
  ],
  complete: [
    'Stars, remnants, a black hole, a quasar. And then the Planck limit itself, broken.',
    'Only the universe is left to heat.',
  ],
});

Chapters.register({
  id: 3,
  name: 'Cosmic',
  rule: 'Cosmic constants. Before each Big Bang, choose which laws of physics to break. Every broken law makes the next universe richer in Universes.',
  // What Chapter 3 resets keep of Chapters 1 and 2 (Big Bang milestones).
  keep(def) {
    const m = (n) => Layers.ms('bigbang', n);
    if (def.chapter === 1) return { upgrades: m(1), flow: m(1), split: m(1) };
    switch (def.id) {
      case 'supernova': return { upgrades: m(2) };
      case 'collapse': return { upgrades: m(3), records: m(5) };
      case 'singularity': return { upgrades: m(3), mass: m(5) };
      case 'quasar': return { upgrades: m(3) };
      case 'planck': return { upgrades: m(3), levels: m(10) };
      default: return {};
    }
  },
  intro: [
    'The Planck limit is broken. There is nothing left inside this universe to burn.',
    'So you burn the universe itself.',
    'A Big Bang starts everything over with new laws of physics, and you get to choose them.',
    'Every Chapter 3 reset wipes Chapters 1 and 2 clean, until Big Bang milestones teach you what to keep. The black hole now feeds without taking your Temperature.',
  ],
  goals: [
    { desc: 'Reach 1e70000 K.', check: () => player.bestT.gte('1e70000') },
    { desc: 'Start a universe with at least 5 cosmic constants active.', check: () => !!player.layers.bigbang && player.layers.bigbang.active.length >= 5 },
    { desc: 'Stretch every group to level 20.', check: () => !!player.layers.inflation && Object.values(player.layers.inflation.stretch).every((l) => l >= 20) },
    { desc: 'Produce 1e10 Work.', check: () => !!player.layers.entropy && player.layers.entropy.work.gte(1e10) },
    { desc: 'Cool below 1 K in a Heat Death.', check: () => !!player.layers.heatdeath && player.layers.heatdeath.bestLow < 0 },
    { desc: 'Own the Absolute Zero node.', check: () => hasUpg('absolute', 12) },
  ],
  complete: [
    'Universes, inflation, entropy, and finally the cold at the end of everything.',
    'You have seen absolute zero from both sides.',
  ],
});
