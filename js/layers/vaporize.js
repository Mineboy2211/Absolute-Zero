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
    { cost: D(6), desc: 'Unlock Challenge 5: Cold Core.' },
    {
      cost: D(14),
      desc: 'Pressure makes Heat Loss I start later.',
      effect: () => layerPts('vaporize').add(1).pow(5),
      effectText: (e) => formatMult(e),
    },
    { cost: D(32), desc: 'Unlock Challenge 6: No Ranks.' },
    { cost: D(78), desc: 'Grade and Order requirements −1.' },
    { cost: D(190), desc: 'Kindling and Bellows cost scaling starts 50 levels later.' },
    {
      cost: D(460),
      desc: 'Order boosts Pressure gain.',
      effect: () => player.ranks.order.add(1).pow(0.5),
      effectText: (e) => formatMult(e),
    },
    { cost: D(1500), desc: 'Buyables no longer spend Temperature.' },
    {
      cost: D(6900),
      desc: 'Challenge completions boost heat gain.',
      effect: () => Decimal.pow(2, Challenges.totalComps()),
      effectText: (e) => formatMult(e),
    },
  ],
  heatMult: () => (hasUpg('vaporize', 10) ? upgEff('vaporize', 10) : D(1)),
  passive: () => (hasUpg('fusion', 10) ? 1 : Layers.ms('ionize', 10) ? 0.1 : 0),
  autoReset: () => hasUpg('ionize', 102),
  keep(by) {
    if (by.id === 'fusion') return { upgrades: hasUpg('fusion', 101) };
    if (hasUpg('ionize', 4)) return { upgrades: true };
    if (hasUpg('ionize', 101)) return { upgrades: [1, 3, 5] };
    return {};
  },
  onResetBy() {
    if (Layers.ms('ionize', 1)) Layers.addPoints('vaporize', D(5).sub(layerPts('vaporize')).max(0));
  },
  // Autobuyers and keeps are upgrades, never milestones.
  qol: [
    { cost: D(2), desc: 'Vaporize keeps every Ember upgrade.' },
    { cost: D(6), desc: 'Unlock the Meltdown autobuyer.' },
    { cost: D(20), desc: 'Vaporize keeps Magma upgrades.' },
  ],
  milestones: [
    { req: 3, desc: 'Start every run with 100 Embers.' },
    { req: 20, desc: 'Gain 10% of pending Magma every second.' },
  ],
});
