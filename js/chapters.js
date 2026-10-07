// Chapters: groups of 5 layers. Completing every goal of a chapter unlocks the next one (no reset).

const Chapters = {
  list: [],
  register(def) { this.list.push(def); this.list.sort((a, b) => a.id - b.id); },
  get(id) { return this.list.find((c) => c.id === id); },
  current() { return this.get(player.chapters.unlocked); },
  goalsDone(ch) { return ch.goals.filter((g) => g.check()).length; },
  isComplete(ch) { return ch.goals.every((g) => g.check()); },
  tick() {
    const ch = this.current();
    if (!ch || !this.isComplete(ch)) return;
    const next = this.get(ch.id + 1);
    if (!next) return;
    player.chapters.unlocked = next.id;
    if (typeof UI !== 'undefined') UI.showChapterIntro(next);
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
    { desc: 'Reach 1e1000 K.', check: () => player.bestT.gte('1e1000') },
    { desc: 'Complete every Pressure challenge at least 3 times.', check: () => Challenges.list.every((c) => chalComps(c.id) >= 3) },
    { desc: 'Own 20 Elements.', check: () => false },
    { desc: 'Reach Order 10.', check: () => player.ranks.order.gte(10) },
    { desc: 'Have 1e6 Electrons, Ions and Photons at once.', check: () => false },
    { desc: 'Synthesize Iron (Fe).', check: () => false },
  ],
});
