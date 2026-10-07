// Chapter 1, layer 3: Vaporize -> Pressure. Unlocks Challenges.

Layers.register({
  id: 'vaporize',
  chapter: 1,
  order: 3,
  name: 'Vaporize',
  currency: 'Pressure',
  verb: 'Vaporize',
  color: '#9fd8ff',
  unlocked: () => player.bestT.gte(1e42),
  req: () => D(1e48),
  gain() {
    let g = player.T.log10().div(48).pow(4).mul(layerPts('meltdown').add(1).log10().add(1));
    if (hasUpg('vaporize', 8)) g = g.mul(upgEff('vaporize', 8));
    if (hasUpg('ionize', 1)) g = g.mul(3);
    if (hasUpg('fusion', 4)) g = g.mul(2);
    g = g.mul(Layers.map.ionize.poolEffects().pressure);
    return g;
  },
  effect() {
    const p = layerPts('vaporize');
    return {
      tick: p.pow(0.5).mul(0.01).min(this.tickCap()),
      embers: p.add(1),
      magma: p.add(1).pow(0.5),
    };
  },
  tickCap: () => (hasUpg('fusion', 15) ? 0.3 : 0.2),
  effectText() {
    const e = this.effect();
    return `Pressure adds +${format(e.tick, 3)} Draft power (max +${this.tickCap()}), multiplies Ember gain by ${formatMult(e.embers)} and Magma gain by ${formatMult(e.magma)}.`;
  },
  upgrades: [
    { cost: D(1), desc: 'Magma flow is no longer reset by Vaporize.' },
    {
      cost: D(2),
      desc: 'Pressure boosts Magma flow.',
      effect: () => layerPts('vaporize').add(1),
      effectText: (e) => formatMult(e),
    },
    { cost: D(4), desc: 'Unlock Challenge 5: Cold Core.' },
    {
      cost: D(8),
      desc: 'Pressure makes Heat Loss I start later.',
      effect: () => layerPts('vaporize').add(1).pow(5),
      effectText: (e) => formatMult(e),
    },
    { cost: D(15), desc: 'Unlock Challenge 6: No Ranks.' },
    { cost: D(30), desc: 'Grade and Order requirements −1.' },
    { cost: D(60), desc: 'Kindling and Bellows cost scaling starts 50 levels later.' },
    {
      cost: D(120),
      desc: 'Order boosts Pressure gain.',
      effect: () => player.ranks.order.add(1).pow(0.5),
      effectText: (e) => formatMult(e),
    },
    { cost: D(300), desc: 'Buyables no longer spend Temperature.' },
    {
      cost: D(1e3),
      desc: 'Challenge completions boost heat gain.',
      effect: () => Decimal.pow(2, Challenges.totalComps()),
      effectText: (e) => formatMult(e),
    },
  ],
  heatMult: () => (hasUpg('vaporize', 10) ? upgEff('vaporize', 10) : D(1)),
  passive: () => (hasUpg('fusion', 10) ? 1 : Layers.ms('ionize', 10) ? 0.1 : 0),
  autoReset: () => Layers.ms('ionize', 2),
  keep() {
    if (Layers.ms('ionize', 5) || hasUpg('ionize', 4)) return { upgrades: true };
    if (Layers.ms('ionize', 1)) return { upgrades: [1, 3, 5] };
    return {};
  },
  onResetBy() {
    if (Layers.ms('ionize', 1)) Layers.addPoints('vaporize', D(5).sub(layerPts('vaporize')).max(0));
  },
  milestones: [
    { req: 1, desc: 'Keep all Ember upgrades.' },
    { req: 2, desc: 'Unlock the Meltdown autobuyer.' },
    { req: 3, desc: 'Start every run with 100 Embers.' },
    { req: 5, desc: 'Keep Magma upgrades.' },
    { req: 10, desc: 'Magma flow is never reset by Vaporize.' },
    { req: 20, desc: 'Gain 10% of pending Magma every second.' },
  ],
});
