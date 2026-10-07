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
    { desc: 'Reach 1e4000 K.', check: () => player.bestT.gte('1e4000') },
    { desc: 'Learn Slingshot (Gravity becomes a bonus).', check: () => hasUpg('supernova', 10) },
    { desc: 'Complete every Stellar challenge at least 3 times.', check: () => Challenges.list.filter((c) => c.chapter === 2).every((c) => chalComps(c.id) >= 3) },
    { desc: 'Grow the black hole to 1,000 solar masses.', check: () => !!player.layers.singularity && !!player.layers.singularity.mass && player.layers.singularity.mass.gte(1000) },
    { desc: 'Fire 50 Jets.', check: () => !!player.layers.quasar && player.layers.quasar.fired >= 50 },
    { desc: 'Break all three Heat Losses.', check: () => !!player.layers.planck && [1, 2, 3].every((n) => hasUpg('planck', n)) },
  ],
});
