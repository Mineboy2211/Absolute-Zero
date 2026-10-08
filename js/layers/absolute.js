// Chapter 3, layer 5: Absolute -> Absolutes. The final tree of Chapter 3: every node costs Absolutes
// plus a mix of currencies from every layer of the game.

const Absolute = {
  data() { return player.layers.absolute; },
  points() { return this.data() ? layerPts('absolute') : D(0); },
  heatExp() {
    if (!this.data()) return 1;
    let e = 1 + 0.02 * this.points().add(1).log10().toNumber();
    if (hasUpg('absolute', 1)) e *= 1.05;
    if (hasUpg('absolute', 9)) e *= 1.05;
    return e;
  },
  hl4Power() { return (hasUpg('absolute', 2) ? 0.01 : 0) + (hasUpg('absolute', 12) ? 0.01 : 0); },
  hl4StartMult() { return hasUpg('absolute', 10) ? 1.1 : 1; },
};

Layers.register({
  id: 'absolute',
  chapter: 3,
  order: 5,
  name: 'Absolute',
  currency: 'Absolutes',
  verb: 'Become absolute',
  color: '#e6e9ff',
  unlocked: () => Layers.ms('heatdeath', 1) && player.bestT.gte('1e25000'),
  req: () => D('1e25500'),
  gain() {
    let g = player.T.log10().sub(25500).div(2000).add(1).pow(1.5);
    g = g.mul(layerPts('heatdeath').add(1).log10().add(1));
    if (Layers.ms('absolute', 10)) g = g.mul(2);
    if (hasUpg('tachyon', 8)) g = g.mul(upgEff('tachyon', 8));
    if (typeof Achievements.universeMult === 'function') g = g.mul(Achievements.universeMult());
    return g;
  },
  voidMult: () => (hasUpg('absolute', 3) ? D(3) : D(1)),
  effectText() {
    return `Absolutes raise the heat gain exponent ×${format(Absolute.heatExp(), 3)}.`;
  },
  passive: () => (Layers.ms('absolute', 25) ? 0.1 : Layers.ms('absolute', 5) ? 0.01 : 0),
  upgrades: [
    { name: 'Absolute Heat', cost: D(1), extra: [['ignition', D('1e2000')]], desc: 'Heat gain exponent ×1.05.' },
    { name: 'Absolute Pressure', cost: D(5), extra: [['vaporize', D('1e35')], ['meltdown', D('1e350')]], desc: 'Heat Loss IV is weaker: power +0.01.' },
    { name: 'Absolute Cold', cost: D(32), extra: [['heatdeath', D(100)]], desc: 'Void gain ×3.' },
    { name: 'Absolute Order', cost: D(160), extra: [['bigbang', D(1e15)]], desc: 'Universes raise the heat gain exponent more: 0.045 → 0.06 per order of magnitude.' },
    { name: 'Absolute Expansion', cost: D(1000), extra: [['inflation', D(1e9)]], desc: 'Stretch power +0.01 per level.' },
    { name: 'Absolute Engine', cost: D(5200), extra: [['entropy', D(1e7)], ['meltdown', D('1e370')]], desc: 'Work raises the heat gain exponent more: 0.01 → 0.015 per order of magnitude.' },
    { name: 'Absolute Gravity', cost: D(3.2e4), extra: [['supernova', D('1e150')], ['collapse', D('1e200')]], desc: 'Slingshot cap +0.05.' },
    { name: 'Absolute Planck', cost: D(1.6e5), extra: [['planck', D(1e10)], ['quasar', D(1e12)]], desc: 'Each Planck Level adds +0.025 to the heat exponent instead of +0.02.' },
    { name: 'Absolute Stars', cost: D(1e6), extra: [['singularity', D('1e200')], ['fusion', D('1e300')]], desc: 'Heat gain exponent ×1.05.' },
    { name: 'Absolute Limit', cost: D(1e6), extra: [['bigbang', D(1e17)], ['inflation', D(1e10)]], desc: 'Heat Loss IV starts 10% later (in orders of magnitude).' },
    { name: 'Absolute Void', cost: D(2e6), extra: [['heatdeath', D(1e4)], ['entropy', D(1e8)]], desc: 'Cooling ×10.' },
    { name: 'Absolute Zero', cost: D(5e6), extra: [['ignition', D('1e2500')], ['supernova', D('1e160')], ['bigbang', D(1e18)], ['heatdeath', D(1e5)]], desc: 'Heat Loss IV is weaker: power +0.01. You have touched absolute zero.' },
  ],
  milestones: [
    { req: 1, desc: 'Keep Heat Death upgrades on Absolute.' },
    { req: 2, desc: 'Unlock the Cooler autobuyer.' },
    { req: 3, desc: 'Keep Void and Coolers on Absolute.' },
    { req: 5, desc: 'Gain 1% of pending Absolutes every second.' },
    { req: 10, desc: 'Absolute gain ×2.' },
    { req: 25, desc: 'Gain 10% of pending Absolutes every second.' },
  ],
});
