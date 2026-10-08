// Chapter 1, layer 2: Meltdown -> Magma. Magma keeps flowing between resets.

Layers.register({
  id: 'meltdown',
  chapter: 1,
  order: 2,
  name: 'Meltdown',
  currency: 'Magma',
  verb: 'Melt down',
  color: '#ff4b2b',
  extraData: () => ({ flow: D(0) }),
  unlocked: () => player.bestT.gte(1e19),
  req: () => D(1e22),
  gain() {
    let g = player.T.div(1e22).pow(0.1).mul(layerPts('ignition').add(1).log10().add(1));
    if (hasUpg('meltdown', 10)) g = g.mul(upgEff('meltdown', 10));
    g = g.mul(Layers.map.vaporize.effect().magma);
    return g;
  },
  // Each Meltdown also adds to the passive Magma flow.
  flowFromGain: (g) => g.pow(0.5),
  onReset(g) {
    const d = player.layers.meltdown;
    d.flow = d.flow.add(this.flowFromGain(g));
  },
  flowMult() {
    let m = D(1);
    if (hasUpg('meltdown', 1)) m = m.mul(2);
    if (hasUpg('meltdown', 2)) m = m.mul(upgEff('meltdown', 2));
    if (hasUpg('meltdown', 6)) m = m.mul(upgEff('meltdown', 6));
    if (hasUpg('vaporize', 2)) m = m.mul(upgEff('vaporize', 2));
    if (Layers.ms('meltdown', 25)) m = m.mul(2);
    m = m.mul(Challenges.reward(5));
    m = m.mul(Layers.map.ionize.poolEffects().flow);
    if (typeof BlackHole !== 'undefined') m = m.mul(BlackHole.flowMult());
    return m;
  },
  flowRate() {
    if (inChal(5)) return D(0);
    let r = player.layers.meltdown.flow.mul(this.flowMult());
    if (hasUpg('fusion', 7)) r = r.pow(1.1);
    return r;
  },
  tick(dt) {
    const r = this.flowRate();
    if (r.gt(0)) Layers.addPoints('meltdown', r.mul(dt));
  },
  heatExp: () => (hasUpg('meltdown', 8) ? 0.6 : 0.5),
  heatMult() { return layerPts('meltdown').add(1).pow(this.heatExp()); },
  emberMult() { return layerPts('meltdown').add(1).pow(0.25); },
  effectText() {
    return `Magma multiplies heat gain by ${formatMult(this.heatMult())} and Ember gain by ${formatMult(this.emberMult())}.`;
  },
  passive: () => (hasUpg('fusion', 10) ? 1 : Layers.ms('vaporize', 20) ? 0.1 : 0),
  keep() {
    if (Layers.ms('vaporize', 5)) return { upgrades: true };
    return {};
  },
  onResetBy(by, keep) {
    const keepFlow = by.chapter > 1 ? !!keep.flow : hasUpg('vaporize', 1) || Layers.ms('vaporize', 10);
    if (!keepFlow) player.layers.meltdown.flow = D(0);
  },
  autoReset: () => Layers.ms('vaporize', 2),
  upgrades: [
    { cost: D(1), desc: 'Magma flow ×2.' },
    {
      cost: D(6),
      desc: 'Embers boost Magma flow.',
      effect: () => layerPts('ignition').add(1).log10().add(1),
      effectText: (e) => formatMult(e),
    },
    { cost: D(49), desc: 'Each Furnace gives +0.006 more Bellows power.' },
    {
      cost: D(400),
      desc: 'Magma raises Draft power.',
      effect: () => layerPts('meltdown').add(1).log10().mul(0.004),
      effectText: (e) => '+' + format(e, 3),
    },
    { cost: D(5900), desc: 'Heat Loss I is weaker: power 0.5 → 0.55.' },
    {
      cost: D(6.4e4),
      desc: 'Grade boosts Magma flow.',
      effect: () => player.ranks.grade.add(1).pow(0.5),
      effectText: (e) => formatMult(e),
    },
    { cost: D(6.6e5), desc: 'Unlock the Order autobuyer.' },
    { cost: D(7.8e6), desc: 'Magma heat effect exponent 0.5 → 0.6.' },
    { cost: D(1.1e8), desc: 'The 3rd Ember upgrade uses ^0.55 instead of ^0.5.' },
    {
      cost: D(1.3e9),
      desc: 'Magma flow boosts Magma gained on Meltdown.',
      effect: () => player.layers.meltdown.flow.add(1).pow(0.25),
      effectText: (e) => formatMult(e),
    },
  ],
  milestones: [
    { req: 1, desc: 'Keep the first 6 Ember upgrades on Meltdown.' },
    { req: 3, desc: 'Gain 10% of pending Embers every second.' },
    { req: 10, desc: 'Keep all Ember upgrades on Meltdown.' },
    { req: 25, desc: 'Magma flow ×2.' },
  ],
});
