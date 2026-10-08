// Chapter 3, layer 2: Inflation -> Expansion. Spend Expansion to stretch whole groups of heat multipliers:
// each Stretch level raises every multiplier in its group to a higher power.

const STRETCH_GROUPS = {
  fire: { name: 'Fire', desc: 'Bellows and Draft', base: 1, ratio: 6, color: '#ff7a3d' },
  ash: { name: 'Ash', desc: 'Ranks and every Chapter 1 currency', base: 2, ratio: 6, color: '#c77dff' },
  stars: { name: 'Stars', desc: 'every Chapter 2 currency', base: 3, ratio: 6, color: '#ffd166' },
};

const Stretch = {
  data() { return player.layers.inflation; },
  level(k) { return this.data() ? this.data().stretch[k] : 0; },
  perLevel() {
    let p = 0.02;
    if (hasUpg('inflation', 5)) p = 0.025;
    if (hasUpg('entropy', 7)) p += 0.005;
    if (hasUpg('absolute', 5)) p += 0.01;
    return p;
  },
  ratio(k) { return STRETCH_GROUPS[k].ratio - (hasUpg('inflation', 2) ? 1 : 0); },
  cost(k, lvl = this.level(k)) { return Decimal.pow(this.ratio(k), lvl).mul(STRETCH_GROUPS[k].base); },
  canBuy(k) { return !!this.data() && Layers.isUnlocked('inflation') && layerPts('inflation').gte(this.cost(k)); },
  buy(k) {
    if (!this.canBuy(k)) return false;
    const d = this.data();
    d.points = d.points.sub(this.cost(k));
    d.stretch[k] += 1;
    return true;
  },
  buyMax(k) { let n = 0; while (this.canBuy(k) && n < 1000) { this.buy(k); n++; } return n > 0; },
  // Power applied to every heat multiplier of the group.
  power(k) { return 1 + this.perLevel() * this.level(k); },
  // Which group a heat multiplier (by its Stats name) belongs to.
  groupOf(name, def) {
    if (name === 'Bellows' || name === 'Draft') return 'fire';
    if (name === 'Ranks' || (def && def.chapter === 1)) return 'ash';
    if (def && def.chapter === 2) return 'stars';
    return null;
  },
  apply(name, def, v) {
    const k = this.groupOf(name, def);
    if (!k || !this.data()) return v;
    const p = this.power(k);
    return p === 1 ? v : v.pow(p);
  },
};

Layers.register({
  id: 'inflation',
  chapter: 3,
  order: 2,
  name: 'Inflation',
  currency: 'Expansion',
  verb: 'Inflate',
  color: '#80ffdb',
  extraData: () => ({ stretch: { fire: 0, ash: 0, stars: 0 } }),
  unlocked: () => Layers.ms('bigbang', 1) && player.bestT.gte('1e3950'),
  req: () => D('1e4000'),
  gain() {
    let g = player.T.log10().sub(4000).div(200).add(1).pow(2);
    g = g.mul(layerPts('bigbang').add(1).log10().add(1).pow(0.5));
    if (Layers.ms('inflation', 10)) g = g.mul(2);
    if (Layers.map.entropy) g = g.mul(Layers.map.entropy.expansionMult());
    if (hasUpg('spin', 4)) g = g.mul(upgEff('spin', 4));
    if (typeof Achievements.universeMult === 'function') g = g.mul(Achievements.universeMult());
    return g;
  },
  // Expansion speeds up time-based Chapter 2 machinery (Jet recharge and Hawking radiation).
  speed() { return layerPts('inflation').add(1).pow(0.5); },
  effectText() {
    return `Expansion speeds up Jet recharge and Hawking radiation by ${formatMult(this.speed())}.`;
  },
  passive: () => (Layers.ms('inflation', 25) ? 0.1 : Layers.ms('inflation', 5) ? 0.01 : 0),
  keep: () => ({ upgrades: Layers.ms('entropy', 1) }),
  onResetBy(by, keep) {
    const kept = by.chapter > 3 ? !!keep.stretch : Layers.ms('entropy', 5);
    if (!kept) player.layers.inflation.stretch = { fire: 0, ash: 0, stars: 0 };
  },
  autoReset: () => Layers.ms('entropy', 2),
  upgrades: [
    {
      cost: D(3),
      desc: 'Expansion multiplies Universe gain.',
      effect: () => layerPts('inflation').add(1).pow(0.5),
      effectText: (e) => formatMult(e),
    },
    { cost: D(11), desc: 'Stretch levels are cheaper: cost ratio 6 → 5.' },
    { cost: D(58), desc: 'Start every Inflation with 1,000 Universes.' },
    { cost: D(250), desc: 'Heat gain exponent ×1.03.' },
    { cost: D(1000), desc: 'Stretch is stronger: +0.025 power per level instead of +0.02.' },
    { cost: D(5200), desc: 'Heat Loss IV is weaker: power +0.01.' },
    {
      cost: D(3.2e4),
      desc: 'Expansion multiplies Neutronium gain.',
      effect: () => layerPts('inflation').add(1),
      effectText: (e) => formatMult(e),
    },
    { cost: D(1.6e5), desc: 'Slingshot cap +0.03.' },
    { cost: D(1e6), desc: 'Heat Loss IV starts 5% later (in orders of magnitude).' },
    { cost: D(1.1e7), desc: 'Heat gain exponent ×1.04.' },
  ],
  milestones: [
    { req: 1, desc: 'Keep Big Bang upgrades on Inflation.' },
    { req: 2, desc: 'Unlock the Big Bang autobuyer.' },
    { req: 3, desc: 'Universe gain ×3.' },
    { req: 5, desc: 'Gain 1% of pending Expansion every second.' },
    { req: 10, desc: 'Expansion gain ×2.' },
    { req: 25, desc: 'Gain 10% of pending Expansion every second.' },
  ],
});

Automation.register({
  id: 'auto_stretch',
  name: 'Stretch',
  chapter: 3,
  group: 'inflation',
  unlocked: () => Layers.ms('entropy', 3),
  run: () => { for (const k of Object.keys(STRETCH_GROUPS)) Stretch.buyMax(k); },
});
