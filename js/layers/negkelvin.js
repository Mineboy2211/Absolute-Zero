// Chapter 4, layer 3: Negative Kelvin -> Inversions. Resetting converts your Inverted Temperature into Inversions.
// Pumps and Cavities are bought with Inverted Temperature itself.

const NK_BUYABLES = {
  pump: { name: 'Pump', desc: 'Inverted Temperature gain ×(1 + level).', base: 10, ratio: 4 },
  cavity: { name: 'Cavity', desc: 'Inverted Temperature delays Heat Loss IV more: strength +0.01 per level.', base: 1e4, ratio: 1e4 },
};

const NegKelvin = {
  data() { return player.layers.negkelvin; },
  level(k) { return this.data() ? this.data()[k] : 0; },
  ratio(k) { return NK_BUYABLES[k].ratio / (k === 'pump' && hasUpg('negkelvin', 4) ? 2 : 1); },
  cost(k, lvl = this.level(k)) { return Decimal.pow(this.ratio(k), lvl).mul(NK_BUYABLES[k].base); },
  canBuy(k) { return Layers.isUnlocked('negkelvin') && player.inv.T.gte(this.cost(k)); },
  buy(k) {
    if (!this.canBuy(k)) return false;
    player.inv.T = player.inv.T.sub(this.cost(k));
    this.data()[k] += 1;
    return true;
  },
  buyMax(k) { let n = 0; while (this.canBuy(k) && n < 1000) { this.buy(k); n++; } return n > 0; },
};

Layers.register({
  id: 'negkelvin',
  chapter: 4,
  order: 3,
  name: 'Negative Kelvin',
  currency: 'Inversions',
  verb: 'Invert',
  color: '#8f7bff',
  extraData: () => ({ pump: 0, cavity: 0 }),
  unlocked: () => Layers.ms('spin', 1) && player.bestT.gte('1e78000'),
  req: () => D('1e80000'),
  gain() {
    let g = player.inv.T.add(1).log10().div(5).pow(2);
    g = g.mul(layerPts('spin').add(1).log10().add(1));
    if (Layers.ms('negkelvin', 10)) g = g.mul(2);
    if (Layers.map.tachyon) g = g.mul(Layers.map.tachyon.boost());
    if (typeof Achievements.inversionMult === 'function') g = g.mul(Achievements.inversionMult());
    return g;
  },
  // Resetting spends the Inverted Temperature you converted.
  onReset() { player.inv.T = D(0); },
  invMult() {
    if (!player.layers.negkelvin) return D(1);
    let m = layerPts('negkelvin').add(1).log10().add(1).pow(2).mul(1 + NegKelvin.level('pump'));
    if (hasUpg('negkelvin', 2)) m = m.mul(layerPts('negkelvin').add(1).log10().add(1));
    return m;
  },
  strengthBonus: () => 0.01 * NegKelvin.level('cavity') + (hasUpg('negkelvin', 7) ? 0.02 : 0),
  heatExp() {
    if (!player.layers.negkelvin) return 1;
    let e = 1 + 0.01 * layerPts('negkelvin').add(1).log10().toNumber();
    if (hasUpg('negkelvin', 1)) e *= 1.02;
    if (hasUpg('negkelvin', 10)) e *= 1.03;
    return e;
  },
  effectText() {
    return `Inversions multiply Inverted Temperature gain by ${formatMult(this.invMult())} and raise the heat gain exponent ×${format(this.heatExp(), 3)}.`;
  },
  passive: () => (Layers.ms('negkelvin', 25) ? 0.1 : Layers.ms('negkelvin', 5) ? 0.01 : 0),
  keep: () => ({ upgrades: Layers.ms('tachyon', 1) }),
  autoReset: () => Layers.ms('tachyon', 2),
  onResetBy() {
    const d = player.layers.negkelvin;
    if (!Layers.ms('tachyon', 3)) { d.pump = 0; d.cavity = 0; }
  },
  upgrades: [
    { cost: D(10), desc: 'Heat gain exponent ×1.02.' },
    { cost: D(50), desc: 'Inversions boost Inverted Temperature gain again.' },
    { cost: D(320), desc: 'Unlock the Pump and Cavity autobuyer.' },
    { cost: D(1600), desc: 'Pumps are cheaper: cost ratio 4 → 2.' },
    { cost: D(1e4), desc: 'Inversions multiply Entropy gain.', effect: () => layerPts('negkelvin').add(1), effectText: (e) => formatMult(e) },
    { cost: D(5.2e4), desc: 'Heat Loss IV starts 5% later (in orders of magnitude).' },
    { cost: D(3.2e5), desc: 'Inverted Temperature delays Heat Loss IV more: strength +0.02.' },
    { cost: D(1.6e6), desc: 'Inversions multiply Void gain.', effect: () => layerPts('negkelvin').add(1).log10().add(1), effectText: (e) => formatMult(e) },
    { cost: D(1e7), desc: 'Heat Loss IV starts 5% later (in orders of magnitude).' },
    { cost: D(5.2e7), desc: 'Heat gain exponent ×1.03.' },
  ],
  milestones: [
    { req: 1, desc: 'Keep Spin upgrades and your lattice on Negative Kelvin resets.' },
    { req: 2, desc: 'Unlock the Spin Lattice autobuyer.' },
    { req: 3, desc: 'Inverted Temperature gain ×10.' },
    { req: 5, desc: 'Gain 1% of pending Inversions every second.' },
    { req: 10, desc: 'Inversion gain ×2.' },
    { req: 25, desc: 'Gain 10% of pending Inversions every second.' },
  ],
});

Automation.register({
  id: 'auto_pump',
  name: 'Pumps and Cavities',
  chapter: 4,
  group: 'negkelvin',
  unlocked: () => hasUpg('negkelvin', 3),
  run: () => { NegKelvin.buyMax('cavity'); NegKelvin.buyMax('pump'); },
});
