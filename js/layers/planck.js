// Chapter 2, layer 5: Planck Break -> Planck Shards. Break the Heat Losses and buy Planck Levels.

const Planck = {
  level() { return player.layers.planck ? player.layers.planck.level : D(0); },
  costBase: () => (hasUpg('planck', 7) ? 2.5 : 3),
  // Shards needed for the next level: 5 × 3^level.
  cost(lvl = this.level()) { return Decimal.pow(this.costBase(), lvl).mul(5); },
  canBuy() { return Layers.isUnlocked('planck') && layerPts('planck').gte(this.cost()); },
  buy() {
    if (!this.canBuy()) return false;
    const d = player.layers.planck;
    d.points = d.points.sub(this.cost());
    d.level = d.level.add(1);
    return true;
  },
  buyMax() { let n = 0; while (this.canBuy() && n < 1000) { this.buy(); n++; } return n > 0; },
  heatExp() {
    let e = 1 + 0.02 * this.level().toNumber();
    if (hasUpg('planck', 10)) e *= 1.05;
    return e;
  },
  stardustMult() { return hasUpg('planck', 4) ? Decimal.pow(10, this.level()) : D(1); },
  broken(n) { return hasUpg('planck', n); },
};

Layers.register({
  id: 'planck',
  chapter: 2,
  order: 5,
  name: 'Planck Break',
  currency: 'Planck Shards',
  verb: 'Break the Planck limit',
  color: '#f72585',
  extraData: () => ({ level: D(0) }),
  unlocked: () => Layers.ms('quasar', 1) && player.bestT.gte('1e800'),
  req: () => D('1e815'),
  gain() {
    // Polynomial in log(T), so breaking the limits cannot snowball forever.
    let g = player.T.log10().sub(815).div(50).add(1).pow(2).mul(layerPts('quasar').add(1).log10().add(1));
    if (Layers.ms('planck', 25)) g = g.mul(2);
    return g;
  },
  effectText() {
    return `Planck Level ${formatWhole(Planck.level())} raises heat gain to the power ${format(Planck.heatExp(), 3)} (+0.02 per level).`;
  },
  jetMult: () => (hasUpg('planck', 5) ? layerPts('planck').add(1).log10().add(1) : D(1)),
  upgrades: [
    { cost: D(1), desc: 'Break Heat Loss I: it no longer exists.' },
    { cost: D(20), desc: 'Break Heat Loss II: it no longer exists.' },
    { cost: D(500), desc: 'Break Heat Loss III: its power +0.3.' },
    { cost: D(1e3), desc: 'Every Planck Level multiplies Stardust gain by 10.' },
    { cost: D(3e3), desc: 'Planck Shards boost Jet gain.', effect: () => layerPts('planck').add(1).log10().add(1), effectText: (e) => formatMult(e) },
    { cost: D(8e3), desc: 'Gravity weight ×0.7.' },
    { cost: D(2e4), desc: 'Planck Levels cost ×2.5 more each instead of ×3.' },
    { cost: D(5e4), desc: 'Heat Loss III starts 1e100× later.' },
    { cost: D(1e5), desc: 'Jet power +2.' },
    { cost: D(2e5), desc: 'Planck time: heat gain ^1.05.' },
  ],
  milestones: [
    { req: 1, desc: 'Keep Jet upgrades on Planck Break.' },
    { req: 2, desc: 'Unlock the Quasar autobuyer.' },
    { req: 3, desc: 'Start every Planck Break with 10 Jets.' },
    { req: 5, desc: 'Gain 10% of pending Jets every second.' },
    { req: 10, desc: 'Unlock the Planck Level autobuyer.' },
    { req: 25, desc: 'Planck Shard gain ×2.' },
  ],
});

Automation.register({
  id: 'buy_planck',
  name: 'Planck Levels',
  chapter: 2,
  group: 'planck',
  unlocked: () => Layers.ms('planck', 10),
  run: () => Planck.buyMax(),
});
