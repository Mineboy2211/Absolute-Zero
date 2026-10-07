// Chapter 1, layer 1: Ignition -> Embers.

Layers.register({
  id: 'ignition',
  chapter: 1,
  order: 1,
  name: 'Ignition',
  currency: 'Embers',
  verb: 'Ignite',
  color: '#ff7a3d',
  unlocked: () => player.bestT.gte(1e6),
  req: () => D(1e7),
  gain() {
    let g = player.T.div(1e7).pow(0.5);
    g = g.mul(this.gainMult());
    if (inChal(4)) g = g.pow(0.5);
    return g;
  },
  gainMult() {
    let m = D(1);
    if (hasUpg('ignition', 9)) m = m.mul(upgEff('ignition', 9));
    if (hasUpg('ignition', 12)) m = m.mul(upgEff('ignition', 12));
    m = m.mul(Layers.map.meltdown.emberMult());
    m = m.mul(Layers.map.vaporize.effect().embers);
    m = m.mul(Challenges.reward(4));
    return m;
  },
  heatMult() {
    let m = D(1);
    if (hasUpg('ignition', 1)) m = m.mul(3);
    if (hasUpg('ignition', 3)) m = m.mul(upgEff('ignition', 3));
    if (Layers.ms('ignition', 25)) m = m.mul(2);
    return m;
  },
  effectText: () => `Your Ember upgrades multiply heat gain by ${formatMult(Layers.map.ignition.heatMult())}.`,
  passive: () => (Layers.ms('meltdown', 3) ? 0.1 : 0),
  keep(by) {
    if (Layers.ms('vaporize', 1) || Layers.ms('meltdown', 10)) return { upgrades: true };
    if (Layers.ms('meltdown', 1)) return { upgrades: [1, 2, 3, 4, 5, 6] };
    return {};
  },
  onResetBy() {
    if (Layers.ms('vaporize', 3)) Layers.addPoints('ignition', D(100).sub(layerPts('ignition')).max(0));
  },
  upgrades: [
    { cost: D(1), desc: 'Heat gain ×3.' },
    { cost: D(2), desc: 'Unlock the Kindling autobuyer.' },
    {
      cost: D(5),
      desc: 'Embers multiply heat gain.',
      effect: () => layerPts('ignition').add(1).pow(hasUpg('meltdown', 9) ? 0.55 : 0.5),
      effectText: (e) => formatMult(e),
    },
    { cost: D(15), desc: 'Kindling power +1.' },
    { cost: D(40), desc: 'Unlock the Bellows autobuyer.' },
    { cost: D(100), desc: 'Grade and Order no longer reset buyables.' },
    { cost: D(300), desc: 'Draft power +0.02.' },
    { cost: D(1e3), desc: 'Unlock the Furnace and Draft autobuyers.' },
    {
      cost: D(5e3),
      desc: 'Ember gain is multiplied by Degree.',
      effect: () => player.ranks.degree.add(1).pow(0.75),
      effectText: (e) => formatMult(e),
    },
    { cost: D(2e4), desc: 'Unlock the Grade autobuyer.' },
    { cost: D(1e6), desc: 'Heat Loss I starts 1,000× later.' },
    {
      cost: D(1e8),
      desc: 'Ember gain is multiplied by log(Temperature).',
      effect: () => player.T.add(10).log10().max(1),
      effectText: (e) => formatMult(e),
    },
  ],
  milestones: [
    { req: 1, desc: 'Bellows, Furnace and Draft stay unlocked.' },
    { req: 3, desc: 'Start every run with 5 Kindling.' },
    { req: 10, desc: 'Kindling is 2× cheaper.' },
    { req: 25, desc: 'Heat gain ×2.' },
  ],
});
