// Challenges: restricted runs with permanent tiered rewards.
// Entering or leaving a challenge performs a reset of its layer (no currency gained).
// A tier is completed as soon as Temperature reaches its goal inside the challenge.

const Challenges = {
  // Every challenge belongs to chapter 1 unless it says otherwise.
  list: [
    {
      id: 1,
      name: 'Damp Wood',
      layer: 'vaporize',
      desc: 'Kindling does nothing. Your base heat is 1 + Bellows owned.',
      goals: ['1e15', '1e20', '1e26', '1e33', '1e42'],
      unlocked: () => player.layers.vaporize.resets > 0,
      reward: (c) => D(1 + c),
      rewardText: (r) => `Kindling power ${formatMult(r)}`,
    },
    {
      id: 2,
      name: 'Leaky Pipe',
      layer: 'vaporize',
      desc: 'Heat Loss I starts at 1e6 K/s.',
      goals: ['1e14', '1e18', '1e24', '1e30', '1e38'],
      unlocked: () => player.layers.vaporize.resets > 0,
      reward: (c) => 0.03 * c,
      rewardText: (r) => `Heat Loss I power +${format(r, 2)}`,
    },
    {
      id: 3,
      name: 'Stagnant Air',
      layer: 'vaporize',
      desc: 'Draft does nothing.',
      goals: ['1e18', '1e24', '1e30', '1e38', '1e48'],
      unlocked: () => player.layers.vaporize.resets > 0,
      reward: (c) => 0.01 * c,
      rewardText: (r) => `Draft power +${format(r, 2)}`,
    },
    {
      id: 4,
      name: 'Wet Embers',
      layer: 'vaporize',
      desc: 'Ember gain is square-rooted.',
      goals: ['1e30', '1e36', '1e44', '1e52', '1e64'],
      unlocked: () => player.layers.vaporize.resets > 0,
      reward: (c) => Decimal.pow(10, c),
      rewardText: (r) => `Ember gain ${formatMult(r)}`,
    },
    {
      id: 5,
      name: 'Cold Core',
      layer: 'vaporize',
      desc: 'Magma does not flow.',
      goals: ['1e35', '1e42', '1e50', '1e60', '1e72'],
      unlocked: () => hasUpg('vaporize', 3),
      reward: (c) => D(1 + c).pow(2),
      rewardText: (r) => `Magma flow ${formatMult(r)}`,
    },
    {
      id: 6,
      name: 'No Ranks',
      layer: 'vaporize',
      desc: 'Rank rewards do nothing.',
      goals: ['1e30', '1e38', '1e46', '1e56', '1e70'],
      unlocked: () => hasUpg('vaporize', 5),
      reward: (c) => 0.01 * c,
      rewardText: (r) => `Degree requirement exponent −${format(r, 2)}`,
    },
    {
      id: 7,
      name: 'Thin Air',
      layer: 'ionize',
      desc: 'Bellows power is stuck at ×1.1. Entering resets like an Ionize.',
      goals: ['1e70', '1e90', '1e115', '1e145', '1e180'],
      unlocked: () => hasUpg('fusion', 11),
      reward: (c) => 0.05 * c,
      rewardText: (r) => `Bellows power +${format(r, 2)}`,
    },
    {
      id: 8,
      name: 'Plasma Storm',
      layer: 'ionize',
      desc: 'Electrons, Ions and Photons do nothing. Entering resets like an Ionize.',
      goals: ['1e95', '1e120', '1e150', '1e190', '1e240'],
      unlocked: () => hasUpg('fusion', 16),
      reward: (c) => D(1 + c).pow(2),
      rewardText: (r) => `Plasma gain ${formatMult(r)}`,
    },
    // Chapter 2: Stellar challenges, unlocked by the Trials branch of the Stardust tree.
    {
      id: 9,
      chapter: 2,
      name: 'Dense Core',
      layer: 'supernova',
      desc: 'Gravity is 3× stronger. Entering resets like a Supernova.',
      goals: ['1e485', '1e510', '1e550', '1e610', '1e700'],
      unlocked: () => hasUpg('supernova', 16),
      reward: (c) => 0.05 * c,
      rewardText: (r) => `Gravity weight −${format(r * 100, 0)}%`,
    },
    {
      id: 10,
      chapter: 2,
      name: 'Red Dwarf',
      layer: 'supernova',
      desc: 'Every Chapter 1 currency gain is square-rooted.',
      goals: ['1e490', '1e520', '1e570', '1e640', '1e740'],
      unlocked: () => hasUpg('supernova', 17),
      reward: (c) => D(1 + c),
      rewardText: (r) => `Stardust gain ${formatMult(r)}`,
    },
    {
      id: 11,
      chapter: 2,
      name: 'Burnout',
      layer: 'supernova',
      desc: 'Heat Loss I, II and III start 1e100 times earlier.',
      goals: ['1e482', '1e505', '1e545', '1e600', '1e680'],
      unlocked: () => hasUpg('supernova', 18),
      reward: (c) => 0.02 * c,
      rewardText: (r) => `Heat Loss III power +${format(r, 2)}`,
    },
    {
      id: 12,
      chapter: 2,
      name: 'Event Horizon',
      layer: 'supernova',
      desc: 'Heat gain ^0.75.',
      goals: ['1e485', '1e515', '1e560', '1e630', '1e720'],
      unlocked: () => hasUpg('supernova', 19),
      reward: (c) => 0.01 * c,
      rewardText: (r) => `Heat gain ^${format(1 + r, 2)}`,
    },
  ],
  maxComps: 5,
  init() { for (const c of this.list) c.chapter = c.chapter || 1; },
  get(id) { return this.list.find((c) => c.id === id); },
  isUnlocked(id) { return this.get(id).unlocked(); },
  anyUnlocked() { return this.list.some((c) => c.unlocked()); },
  goal(id) {
    const c = this.get(id);
    const n = chalComps(id);
    if (n >= this.maxComps) return null;
    const g = D(c.goals[n]);
    return hasUpg('fusion', 9) && id <= 6 ? g.pow(0.9) : g;
  },
  reward(id) {
    const c = this.get(id);
    return c ? c.reward(chalComps(id)) : 0;
  },
  totalComps() { return this.list.reduce((s, c) => s + chalComps(c.id), 0); },
  enter(id) {
    if (!this.isUnlocked(id) || inChal(id)) return;
    if (typeof HeatDeath !== 'undefined' && HeatDeath.running()) return;
    player.challenges.active = 0;
    Layers.doReset(this.get(id).layer, { force: true, noGain: true });
    player.challenges.active = id;
  },
  // A later chapter's reset wipes earlier chapters' challenge completions unless its milestones keep them.
  resetEarlier(byDef) {
    const kept = (ch) => (byDef.chapter === 2 ? Layers.ms('supernova', 3)
      : byDef.chapter === 3 ? Layers.ms('bigbang', ch === 1 ? 1 : 2) : false);
    for (const c of this.list) {
      if (c.chapter < byDef.chapter && !kept(c.chapter)) delete player.challenges.comps[c.id];
    }
  },
  exit() {
    const id = player.challenges.active;
    if (!id) return;
    player.challenges.active = 0;
    Layers.doReset(this.get(id).layer, { force: true, noGain: true });
  },
  tick() {
    const id = player.challenges.active;
    if (!id) return;
    let goal = this.goal(id);
    while (goal && player.T.gte(goal)) {
      player.challenges.comps[id] = chalComps(id) + 1;
      notify(`${this.get(id).name} completed (${chalComps(id)}/${this.maxComps})!`);
      goal = this.goal(id);
    }
  },
};

Challenges.init();
