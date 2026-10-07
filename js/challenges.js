// Challenges: restricted runs with permanent tiered rewards.
// Entering or leaving a challenge performs a reset of its layer (no currency gained).
// A tier is completed as soon as Temperature reaches its goal inside the challenge.

const Challenges = {
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
      desc: 'Tickspeed does nothing.',
      goals: ['1e18', '1e24', '1e30', '1e38', '1e48'],
      unlocked: () => player.layers.vaporize.resets > 0,
      reward: (c) => 0.01 * c,
      rewardText: (r) => `Tickspeed power +${format(r, 2)}`,
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
  ],
  maxComps: 5,
  get(id) { return this.list[id - 1]; },
  isUnlocked(id) { return this.get(id).unlocked(); },
  anyUnlocked() { return this.list.some((c) => c.unlocked()); },
  goal(id) {
    const c = this.get(id);
    const n = chalComps(id);
    return n >= this.maxComps ? null : D(c.goals[n]);
  },
  reward(id) { return this.get(id).reward(chalComps(id)); },
  totalComps() { return this.list.reduce((s, c) => s + chalComps(c.id), 0); },
  enter(id) {
    if (!this.isUnlocked(id) || inChal(id)) return;
    player.challenges.active = 0;
    Layers.doReset(this.get(id).layer, { force: true, noGain: true });
    player.challenges.active = id;
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
