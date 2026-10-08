// Chapter 3, layer 3: Entropy -> Entropy. Disorder rises on its own and weakens heat gain.
// Heat Engines (bought with Entropy) turn Disorder into Work, which is a lasting bonus.
// Holding Entropy makes Disorder rise faster, so spending it on Engines is a real choice.

const Thermo = {
  data() { return player.layers.entropy; },
  active() { return !!this.data() && Layers.ms('entropy', 1); },
  disorder() { return this.data() ? this.data().disorder : D(0); },
  work() { return this.data() ? this.data().work : D(0); },
  engines() { return this.data() ? this.data().engines : 0; },
  // Disorder per second: the square root of your Entropy, growing with the time since the last Entropy reset.
  disorderRate() {
    if (!this.active()) return D(0);
    let r = layerPts('entropy').add(1).pow(0.5).mul(1 + this.data().time / 600);
    if (typeof Cosmos !== 'undefined' && Cosmos.has('decay')) r = r.mul(3);
    if (Layers.ms('heatdeath', 5)) r = r.mul(0.5);
    return r;
  },
  // Disorder the Engines can process per second.
  capacity(n = this.engines()) { return Decimal.pow(3, n).sub(1); },
  efficiency() {
    let e = D(1);
    if (hasUpg('entropy', 1)) e = e.mul(2);
    if (Layers.ms('entropy', 10)) e = e.mul(2);
    return e;
  },
  engineRatio: () => (hasUpg('entropy', 5) ? 6 : 8),
  engineCost(n = this.engines()) { return Decimal.pow(this.engineRatio(), n); },
  canBuyEngine() { return Layers.isUnlocked('entropy') && layerPts('entropy').gte(this.engineCost()); },
  buyEngine() {
    if (!this.canBuyEngine()) return false;
    const d = this.data();
    d.points = d.points.sub(this.engineCost());
    d.engines += 1;
    return true;
  },
  buyMaxEngines() { let n = 0; while (this.canBuyEngine() && n < 1000) { this.buyEngine(); n++; } return n > 0; },
  // Heat gain exponent penalty from unprocessed Disorder.
  penalty() {
    const D0 = this.disorder();
    if (D0.lte(0)) return 1;
    const k = hasUpg('entropy', 3) ? 0.01 : 0.02;
    // Never worse than ×0.96, so Disorder alone cannot lock you out of an Entropy reset.
    return Math.max(0.96, 1 / (1 + k * D0.add(1).log10().toNumber()));
  },
  // Heat gain exponent bonus from Work.
  workExp() { return 1 + (hasUpg('absolute', 6) ? 0.015 : 0.01) * this.work().add(1).log10().toNumber(); },
  heatExp() {
    if (!this.data()) return 1;
    let e = this.workExp() * this.penalty();
    if (hasUpg('entropy', 4)) e *= 1.03;
    if (hasUpg('entropy', 10)) e *= 1.04;
    return e;
  },
  tick(dt) {
    const d = this.data();
    if (!this.active()) return;
    d.disorder = d.disorder.add(this.disorderRate().mul(dt));
    const used = Decimal.min(d.disorder, this.capacity().mul(dt));
    d.disorder = d.disorder.sub(used);
    d.work = d.work.add(used.mul(this.efficiency()));
  },
};

Layers.register({
  id: 'entropy',
  chapter: 3,
  order: 3,
  name: 'Entropy',
  currency: 'Entropy',
  verb: 'Let entropy win',
  color: '#a3a8d6',
  extraData: () => ({ disorder: D(0), work: D(0), engines: 0 }),
  unlocked: () => Layers.ms('inflation', 1) && player.bestT.gte('1e7900'),
  req: () => D('1e8000'),
  gain() {
    let g = player.T.log10().sub(8000).div(300).add(1).pow(2);
    g = g.mul(layerPts('inflation').add(1).log10().add(1));
    // Unprocessed Disorder is turned into Entropy.
    g = g.mul(Thermo.disorder().add(1).log10().add(1));
    if (Layers.ms('entropy', 10)) g = g.mul(2);
    if (Layers.map.heatdeath) g = g.mul(Layers.map.heatdeath.entropyMult());
    if (hasUpg('negkelvin', 5)) g = g.mul(upgEff('negkelvin', 5));
    if (typeof Achievements.universeMult === 'function') g = g.mul(Achievements.universeMult());
    return g;
  },
  tick: (dt) => Thermo.tick(dt),
  // Resetting turns your Disorder into Entropy.
  onReset() { player.layers.entropy.disorder = D(0); },
  onResetBy(by, keep) {
    const d = player.layers.entropy;
    d.disorder = D(0);
    const kept = by.chapter > 3 ? !!keep.engines : Layers.ms('heatdeath', 3);
    if (!kept) { d.engines = 0; d.work = D(0); }
  },
  keep: () => ({ upgrades: Layers.ms('heatdeath', 1) }),
  autoReset: () => Layers.ms('heatdeath', 3),
  expansionMult: () => (hasUpg('entropy', 2) ? Thermo.work().add(1).pow(0.25) : D(1)),
  universeMult: () => (hasUpg('entropy', 8) ? Thermo.work().add(1).pow(0.2) : D(1)),
  effectText() {
    return `Work raises the heat gain exponent ×${format(Thermo.workExp(), 3)}. Disorder lowers it ×${format(Thermo.penalty(), 3)}, but multiplies Entropy gain by ${formatMult(Thermo.disorder().add(1).log10().add(1))}.`;
  },
  passive: () => (Layers.ms('entropy', 25) ? 0.1 : Layers.ms('entropy', 5) ? 0.01 : 0),
  upgrades: [
    { cost: D(1), desc: 'Engines are twice as efficient: double Work.' },
    {
      cost: D(11),
      desc: 'Work multiplies Expansion gain.',
      effect: () => Thermo.work().add(1).pow(0.25),
      effectText: (e) => formatMult(e),
    },
    { cost: D(120), desc: 'Disorder hurts half as much.' },
    { cost: D(1800), desc: 'Heat gain exponent ×1.03.' },
    { cost: D(3.2e4), desc: 'Engines are cheaper: cost ratio 8 → 6.' },
    { cost: D(1e6), desc: 'Heat Loss IV is weaker: power +0.01.' },
    { cost: D(3.2e7), desc: 'Stretch power +0.005 per level.' },
    {
      cost: D(1e9),
      desc: 'Work multiplies Universe gain.',
      effect: () => Thermo.work().add(1).pow(0.2),
      effectText: (e) => formatMult(e),
    },
    { cost: D(3.2e10), desc: 'Heat Loss IV starts 5% later (in orders of magnitude).' },
    { cost: D(1e12), desc: 'Heat gain exponent ×1.04.' },
  ],
  milestones: [
    { req: 1, desc: 'Disorder starts rising. Keep Inflation upgrades on Entropy.' },
    { req: 2, desc: 'Unlock the Inflation autobuyer.' },
    { req: 3, desc: 'Unlock the Stretch autobuyer.' },
    { req: 5, desc: 'Gain 1% of pending Entropy every second. Keep Stretch levels on Entropy.' },
    { req: 10, desc: 'Entropy gain ×2 and Work ×2.' },
    { req: 25, desc: 'Gain 10% of pending Entropy every second.' },
  ],
});

Automation.register({
  id: 'auto_engine',
  name: 'Heat Engines',
  chapter: 3,
  group: 'entropy',
  unlocked: () => Layers.ms('heatdeath', 2),
  run: () => Thermo.buyMaxEngines(),
});
