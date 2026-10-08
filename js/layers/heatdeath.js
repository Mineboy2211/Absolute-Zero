// Chapter 3, layer 4: Heat Death -> Void. A reverse run: your Temperature stops rising and you cool
// toward absolute zero instead. The further you fall (in orders of magnitude), the more Void you get.

const HeatDeath = {
  data() { return player.layers.heatdeath; },
  running() { const d = this.data(); return !!d && d.running; },
  // Orders of magnitude cooled per second, before the slowdown.
  baseRate() {
    let r = D(10).mul(Decimal.pow(1.5, this.data().coolers));
    if (hasUpg('heatdeath', 1)) r = r.mul(3);
    if (hasUpg('heatdeath', 8)) r = r.mul(Thermo.work().add(1).log10().add(1).pow(0.5));
    if (hasUpg('absolute', 11)) r = r.mul(10);
    if (typeof Achievements.universeMult === 'function') r = r.mul(Achievements.universeMult());
    return r;
  },
  // Cooling gets harder the deeper you go.
  slowScale: () => (hasUpg('heatdeath', 5) ? 2000 : 1000),
  rate() {
    const d = this.data();
    return this.baseRate().div(Math.pow(1 + d.depth / this.slowScale(), 2));
  },
  // log10 of the current Temperature during a run.
  currentLog() { const d = this.data(); return d.startLog - d.depth; },
  belowOne() { return this.running() && this.currentLog() < 0; },
  canStart() { return Layers.isUnlocked('heatdeath') && !this.running() && player.T.gte(Layers.map.heatdeath.req()) && !player.challenges.active; },
  start() {
    if (!this.canStart()) return false;
    const L = player.T.log10().toNumber();
    Layers.doReset('heatdeath', { force: true, noGain: true });
    const d = this.data();
    d.running = true;
    d.startLog = L;
    d.depth = 0;
    d.time = 0;
    player.T = Decimal.pow(10, L);
    return true;
  },
  pending() {
    const d = this.data();
    if (!this.running() || d.depth <= 0) return D(0);
    let g = D(d.depth / 500).pow(2);
    if (this.belowOne()) g = g.mul(hasUpg('heatdeath', 6) ? 30 : 10);
    if (Layers.ms('heatdeath', 10)) g = g.mul(2);
    if (Layers.map.absolute) g = g.mul(Layers.map.absolute.voidMult());
    return g.floor();
  },
  end() {
    if (!this.running()) return false;
    const d = this.data();
    const g = this.pending();
    const deepest = this.currentLog();
    d.running = false;
    d.bestLow = Math.min(d.bestLow, deepest);
    if (g.gt(0)) {
      Layers.addPoints('heatdeath', g);
      d.resets += 1;
    }
    Layers.resetBelow(Layers.map.heatdeath);
    d.time = 0;
    return true;
  },
  coolerRatio: () => (hasUpg('heatdeath', 4) ? 3.5 : 4),
  coolerCost() { return Decimal.pow(this.coolerRatio(), this.data().coolers); },
  canBuyCooler() { return Layers.isUnlocked('heatdeath') && layerPts('heatdeath').gte(this.coolerCost()); },
  buyCooler() {
    if (!this.canBuyCooler()) return false;
    const d = this.data();
    d.points = d.points.sub(this.coolerCost());
    d.coolers += 1;
    return true;
  },
  buyMaxCoolers() { let n = 0; while (this.canBuyCooler() && n < 1000) { this.buyCooler(); n++; } return n > 0; },
  tick(dt) {
    if (!this.running()) return;
    const d = this.data();
    // Exact solution of d(depth)/dt = R / (1 + depth/s)², so big ticks cannot overshoot.
    const s = this.slowScale();
    const x = Math.pow(1 + d.depth / s, 3) + 3 * this.baseRate().toNumber() * dt / s;
    d.depth = s * (Math.cbrt(x) - 1);
    player.T = Decimal.pow(10, this.currentLog());
  },
  // Effects of Void.
  // Heat Loss IV is very sensitive to its power, so Void weakens it slowly and only up to +0.02.
  hl4Power() { return this.data() ? Math.min(0.02, 0.003 * layerPts('heatdeath').add(1).log10().toNumber()) : 0; },
  heatExp() {
    if (!this.data()) return 1;
    let e = 1 + 0.01 * layerPts('heatdeath').add(1).log10().toNumber();
    if (hasUpg('heatdeath', 3)) e *= 1.03;
    if (hasUpg('heatdeath', 10)) e *= 1.04;
    return e;
  },
};

Layers.register({
  id: 'heatdeath',
  chapter: 3,
  order: 4,
  name: 'Heat Death',
  currency: 'Void',
  verb: 'Begin the Heat Death',
  color: '#7f8fb8',
  manual: true,
  extraData: () => ({ running: false, startLog: 0, depth: 0, coolers: 0, bestLow: 1e9 }),
  unlocked: () => Layers.ms('entropy', 1) && player.bestT.gte('1e14500'),
  req: () => D('1e15000'),
  gain: () => HeatDeath.pending(),
  tick: (dt) => HeatDeath.tick(dt),
  keep: () => ({ points: Layers.ms('absolute', 3), upgrades: Layers.ms('absolute', 1) }),
  onResetBy() {
    if (!Layers.ms('absolute', 3)) player.layers.heatdeath.coolers = 0;
  },
  entropyMult: () => (hasUpg('heatdeath', 2) ? layerPts('heatdeath').add(1).log10().add(1).pow(2) : D(1)),
  effectText() {
    return `Void weakens Heat Loss IV (power +${format(HeatDeath.hl4Power(), 3)}) and raises the heat gain exponent ×${format(HeatDeath.heatExp(), 3)}.`;
  },
  upgrades: [
    { cost: D(1), desc: 'Cooling ×3.' },
    {
      cost: D(3),
      desc: 'Void multiplies Entropy gain.',
      effect: () => layerPts('heatdeath').add(1).log10().add(1).pow(2),
      effectText: (e) => formatMult(e),
    },
    { cost: D(10), desc: 'Heat gain exponent ×1.03.' },
    { cost: D(30), desc: 'Coolers are cheaper: cost ratio 4 → 3.5.' },
    { cost: D(100), desc: 'Cooling slows down half as fast as you go deeper.' },
    { cost: D(300), desc: 'Ending a Heat Death below 1 K gives ×30 Void instead of ×10.' },
    { cost: D(1e3), desc: 'Heat Loss IV is weaker: power +0.01.' },
    {
      cost: D(3e3),
      desc: 'Work speeds up cooling.',
      effect: () => Thermo.work().add(1).log10().add(1).pow(0.5),
      effectText: (e) => formatMult(e),
    },
    { cost: D(1e4), desc: 'Heat Loss IV starts 5% later (in orders of magnitude).' },
    { cost: D(5e4), desc: 'Heat gain exponent ×1.04.' },
  ],
  milestones: [
    { req: 1, desc: 'Keep Entropy upgrades on Heat Death.' },
    { req: 2, desc: 'Unlock the Heat Engine autobuyer.' },
    { req: 3, desc: 'Unlock the Entropy autobuyer. Keep Heat Engines and Work on Heat Death.' },
    { req: 5, desc: 'Disorder rises half as fast.' },
    { req: 10, desc: 'Void gain ×2.' },
  ],
});

Automation.register({
  id: 'auto_cooler',
  name: 'Coolers',
  chapter: 3,
  group: 'heatdeath',
  unlocked: () => Layers.ms('absolute', 2),
  run: () => HeatDeath.buyMaxCoolers(),
});
