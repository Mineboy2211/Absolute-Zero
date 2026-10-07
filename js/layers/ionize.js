// Chapter 1, layer 4: Ionize -> Plasma. Plasma is split between Electrons, Ions and Photons.

const PLASMA_POOLS = {
  e: { name: 'Electrons', color: '#7fd1ff' },
  i: { name: 'Ions', color: '#ff9f43' },
  p: { name: 'Photons', color: '#fff27a' },
};

Layers.register({
  id: 'ionize',
  chapter: 1,
  order: 4,
  name: 'Ionize',
  currency: 'Plasma',
  verb: 'Ionize',
  color: '#c77dff',
  extraData: () => ({ alloc: { e: D(0), i: D(0), p: D(0) }, weights: { e: 1, i: 1, p: 1 } }),
  unlocked: () => player.bestT.gte(1e76),
  req: () => D(1e84),
  gain() {
    let g = Decimal.pow(10, player.T.log10().sub(84).div(15)).mul(layerPts('vaporize').add(1).log10().add(1));
    if (hasUpg('ionize', 5)) g = g.mul(upgEff('ionize', 5));
    if (hasUpg('ionize', 6)) g = g.mul(upgEff('ionize', 6));
    if (hasUpg('fusion', 5)) g = g.mul(10);
    if (hasUpg('fusion', 12)) g = g.mul(Elements.eff(12));
    if (hasUpg('fusion', 25)) g = g.mul(Elements.eff(25));
    g = g.mul(Challenges.reward(8));
    return g;
  },
  data: () => player.layers.ionize,
  pool(k) { return player.layers.ionize.alloc[k]; },
  allocated() { const a = player.layers.ionize.alloc; return a.e.add(a.i).add(a.p); },
  totalPlasma() { return layerPts('ionize').add(this.allocated()); },
  // Move a fraction of unallocated Plasma into a pool.
  allocate(k, frac) {
    const d = player.layers.ionize;
    const amt = frac >= 1 ? d.points : d.points.mul(frac).floor();
    if (amt.lte(0)) return;
    d.points = d.points.sub(amt);
    d.alloc[k] = d.alloc[k].add(amt);
    const tot = this.allocated();
    if (tot.gt(0)) for (const p of Object.keys(PLASMA_POOLS)) d.weights[p] = d.alloc[p].div(tot).toNumber();
  },
  // Split all unallocated Plasma using the last allocation ratio.
  autoSplit() {
    const d = player.layers.ionize;
    if (d.points.lte(0)) return;
    const amt = d.points;
    const w = d.weights;
    const sum = w.e + w.i + w.p;
    for (const k of Object.keys(PLASMA_POOLS)) d.alloc[k] = d.alloc[k].add(amt.mul(sum > 0 ? w[k] / sum : 1 / 3));
    d.points = D(0);
  },
  respec() {
    const d = player.layers.ionize;
    d.points = d.points.add(this.allocated());
    for (const k of Object.keys(PLASMA_POOLS)) d.alloc[k] = D(0);
    if (!Layers.ms('ionize', 25)) Layers.doReset('ionize', { force: true, noGain: true });
  },
  poolExp() { return hasUpg('fusion', 18) ? 1.1 : 1; },
  poolEffects() {
    const off = inChal(8);
    const x = this.poolExp();
    const e = off ? D(0) : this.pool('e'), i = off ? D(0) : this.pool('i'), p = off ? D(0) : this.pool('p');
    return {
      heat: e.add(1).pow((hasUpg('ionize', 7) ? 1.75 : 1.5) * x),
      flow: i.add(1).pow(x),
      pressure: i.add(1).log10().add(1).pow(x),
      lossStart: p.add(1).pow(2 * x),
      draft: p.add(1).log10().mul(0.005 * x),
    };
  },
  heatMult() {
    let m = this.poolEffects().heat;
    if (hasUpg('ionize', 10)) m = m.mul(upgEff('ionize', 10));
    return m;
  },
  effectText() {
    return `You have ${format(this.totalPlasma())} Plasma in total (${format(this.allocated())} split). Split it below to power up.`;
  },
  passive: () => (Layers.ms('fusion', 10) ? 0.1 : 0),
  keep() {
    return {
      upgrades: Layers.ms('fusion', 1),
      points: false,
    };
  },
  onResetBy(by) {
    const keepSplit = by.chapter > 1 ? Layers.ms('supernova', 2) : Layers.ms('fusion', 1);
    if (!keepSplit) {
      for (const k of Object.keys(PLASMA_POOLS)) player.layers.ionize.alloc[k] = D(0);
    }
    if (Layers.ms('fusion', 5)) Layers.addPoints('ionize', D(10));
  },
  autoReset: () => Layers.ms('fusion', 2),
  upgrades: [
    { cost: D(1), desc: 'Pressure gain ×3.' },
    {
      cost: D(3),
      desc: 'Electrons also boost Ember gain.',
      effect: () => Layers.map.ionize.pool('e').add(1).pow(0.5),
      effectText: (e) => formatMult(e),
    },
    { cost: D(8), desc: 'Heat Loss II is weaker: power +0.05.' },
    { cost: D(20), desc: 'Keep all Pressure upgrades on Ionize.' },
    {
      cost: D(50),
      desc: 'Ions boost Plasma gain.',
      effect: () => Layers.map.ionize.pool('i').add(1).log10().add(1),
      effectText: (e) => formatMult(e),
    },
    {
      cost: D(150),
      desc: 'Plasma gain ×1.1 per challenge completion.',
      effect: () => Decimal.pow(1.1, Challenges.totalComps()),
      effectText: (e) => formatMult(e),
    },
    { cost: D(500), desc: 'Electron effect exponent 1.5 → 1.75.' },
    { cost: D(2e3), desc: 'Bellows power +0.1.' },
    { cost: D(1e4), desc: 'Draft cost scaling starts 50 levels later.' },
    {
      cost: D(5e4),
      desc: 'Your total Plasma multiplies heat gain.',
      effect: () => Layers.map.ionize.totalPlasma().add(1).pow(0.5),
      effectText: (e) => formatMult(e),
    },
  ],
  milestones: [
    { req: 1, desc: 'Keep Pressure upgrades 1, 3 and 5, and start every run with 5 Pressure.' },
    { req: 2, desc: 'Unlock the Vaporize autobuyer.' },
    { req: 5, desc: 'Keep all Pressure upgrades.' },
    { req: 10, desc: 'Gain 10% of pending Pressure every second.' },
    { req: 25, desc: 'Respec no longer forces an Ionize reset.' },
  ],
});

Automation.register({
  id: 'split_plasma',
  name: 'Plasma split',
  group: 'ionize',
  unlocked: () => Layers.ms('fusion', 3),
  run: () => Layers.map.ionize.autoSplit(),
});
