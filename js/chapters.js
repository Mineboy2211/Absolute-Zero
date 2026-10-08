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
    // Starting a chapter switches on the previous chapters' autobuyers. Auto-resets stay off:
    // those layers now earn their currency passively, and resetting them would only cost Temperature.
    for (const a of Automation.list) {
      if ((a.chapter || 1) >= ch.id) continue;
      if (a.id.startsWith('reset_')) player.auto[a.id].on = false;
      else player.auto[a.id].on = true;
    }
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
  intro: [
    'Iron. The fire has nothing left to fuse.',
    'So it falls inward, under its own weight.',
    'Gravity is no longer something you can ignore: the hotter you burn, the harder it pulls.',
    'Every Chapter 1 layer now runs on its own, and Grade and Order no longer reset anything. Your job is the stars.',
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
  intro: [
    'The Planck limit is broken. There is nothing left inside this universe to burn.',
    'So you burn the universe itself.',
    'A Big Bang starts everything over with new laws of physics, and you get to choose them.',
    'Every Chapter 2 layer now runs on its own. The black hole feeds without taking your Temperature.',
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
