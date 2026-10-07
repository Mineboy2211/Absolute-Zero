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
    if (!ch || !this.isComplete(ch) || player.chapters.completed >= ch.id) return;
    player.chapters.completed = ch.id;
    const next = this.get(ch.id + 1);
    if (next) player.chapters.unlocked = next.id;
    if (typeof UI !== 'undefined') {
      if (next) UI.showChapterIntro(next);
      else UI.showChapterComplete(ch);
    }
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
    { desc: 'Reach 1e500 K.', check: () => player.bestT.gte('1e500'), text: () => `Reach ${formatK('1e500')}.` },
    { desc: 'Complete every challenge at least 3 times.', check: () => Challenges.list.every((c) => chalComps(c.id) >= 3) },
    { desc: 'Own 20 Elements.', check: () => Elements.count() >= 20 },
    { desc: 'Reach Order 10.', check: () => player.ranks.order.gte(10) },
    { desc: 'Have 1 Million Electrons, Ions and Photons at once.', check: () => ['e', 'i', 'p'].every((k) => Layers.map.ionize.pool(k).gte(1e6)) },
    { desc: 'Synthesize Iron (Fe).', check: () => hasUpg('fusion', 26) },
  ],
});
