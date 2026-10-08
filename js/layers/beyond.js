// Chapter 4, layer 5: Beyond -> Hyperheat. The final tree of the chapter, priced in Hyperheat, Inverted
// Temperature and currencies from all four chapters.

const Beyond = {
  data() { return player.layers.beyond; },
  heatExp() {
    if (!this.data()) return 1;
    let e = 1 + 0.02 * layerPts('beyond').add(1).log10().toNumber();
    if (hasUpg('beyond', 1)) e *= 1.04;
    if (hasUpg('beyond', 7)) e *= 1.04;
    return e;
  },
  hl4StartMult() {
    let m = 1;
    if (hasUpg('beyond', 2)) m *= 1.1;
    if (hasUpg('beyond', 6)) m *= 1.1;
    if (hasUpg('beyond', 10)) m *= 1.1;
    if (hasUpg('beyond', 12)) m *= 1.25;
    return m;
  },
};

Layers.register({
  id: 'beyond',
  chapter: 4,
  order: 5,
  name: 'Beyond',
  currency: 'Hyperheat',
  verb: 'Go beyond',
  color: '#ffffff',
  unlocked: () => Layers.ms('tachyon', 1) && player.bestT.gte('1e115000'),
  req: () => D('1e120000'),
  gain() {
    let g = player.T.log10().sub(120000).div(10000).add(1).pow(1.5);
    g = g.mul(layerPts('tachyon').add(1).log10().add(1));
    if (Layers.ms('beyond', 10)) g = g.mul(2);
    if (typeof Achievements.inversionMult === 'function') g = g.mul(Achievements.inversionMult());
    return g;
  },
  effectText() {
    return `Hyperheat raises the heat gain exponent ×${format(Beyond.heatExp(), 3)}.`;
  },
  passive: () => (Layers.ms('beyond', 25) ? 0.1 : Layers.ms('beyond', 5) ? 0.01 : 0),
  upgrades: [
    { name: 'Hyperthermia', cost: D(900), extra: [['inv', D(1e11)]], desc: 'Heat gain exponent ×1.04, and Heat Loss V starts at ^4.25.' },
    { name: 'Overdrive', cost: D(2700), extra: [['laser', D(1e5)]], desc: 'Heat Loss IV starts 10% later.' },
    { name: 'Superradiance', cost: D(9000), extra: [['inv', D(1e14)], ['spin', D(1e4)]], desc: 'Beam power +1.' },
    { name: 'Spin Glass', cost: D(2.7e4), extra: [['spin', D(1e6)], ['entropy', D(1e8)]], desc: 'Spin gain ×10.' },
    { name: 'Mirror Universe', cost: D(9e4), extra: [['negkelvin', D(1e4)], ['bigbang', D(1e16)]], desc: 'Inverted Temperature gain ×1,000.' },
    { name: 'Causal Loop', cost: D(2.7e5), extra: [['tachyon', D(1e3)], ['inv', D(1e17)]], desc: 'Heat Loss IV starts 10% later.' },
    { name: 'Hypernova', cost: D(9e5), extra: [['supernova', D('1e150')], ['absolute', D(1e6)]], desc: 'Heat gain exponent ×1.04, and Heat Loss V starts ^0.25 later.' },
    { name: 'Laser Cascade', cost: D(2.7e6), extra: [['laser', D(1e8)], ['inv', D(1e20)]], desc: 'Coherence gain ×100.' },
    { name: 'False Dawn', cost: D(9e6), extra: [['heatdeath', D(1e8)], ['negkelvin', D(1e6)]], desc: 'Inverted Temperature delays Heat Loss IV more: strength +0.05.' },
    { name: 'Tachyon Storm', cost: D(2.7e7), extra: [['tachyon', D(1e5)], ['inflation', D(1e10)]], desc: 'Heat Loss IV starts 10% later.' },
    { name: 'Eternal Flame', cost: D(9e7), extra: [['ignition', D('1e2500')], ['inv', D(1e23)]], desc: 'Every Chapter 4 currency gain ×10.' },
    { name: 'Beyond', cost: D(2.7e8), extra: [['inv', D(1e25)], ['laser', D(1e10)], ['spin', D(1e8)], ['negkelvin', D(1e8)], ['tachyon', D(1e6)]], desc: 'Heat Loss IV starts 25% later. There is no hotter.' },
  ],
  milestones: [
    { req: 1, desc: 'Keep Tachyon upgrades on Beyond resets.' },
    { req: 2, desc: 'Unlock the Tachyon autobuyer.' },
    { req: 5, desc: 'Gain 1% of pending Hyperheat every second.' },
    { req: 10, desc: 'Hyperheat gain ×2.' },
    { req: 25, desc: 'Gain 10% of pending Hyperheat every second.' },
  ],
});
