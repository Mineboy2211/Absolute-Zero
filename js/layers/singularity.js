// Chapter 2, layer 3: Singularity -> Hawking Heat. A black hole eats your Temperature and radiates it back.

const BlackHole = {
  data() { return player.layers.singularity; },
  mass() { return this.data() ? this.data().mass : D(0); },
  // Solar masses a feed would add right now.
  feedGain() {
    const L = player.T.max(1).log10();
    if (L.lt(100)) return D(0);
    let m = L.div(1000).pow(2);
    if (hasUpg('singularity', 1)) m = m.mul(2);
    if (Layers.ms('singularity', 25)) m = m.mul(2);
    return m;
  },
  canFeed() { return Layers.isUnlocked('singularity') && this.feedGain().gt(0); },
  feed() {
    if (!this.canFeed()) return false;
    const d = this.data();
    d.mass = d.mass.add(this.feedGain());
    d.feeds += 1;
    // Once Chapter 2 is behind you, feeding no longer costs your Temperature.
    if (!Chapters.passed(2)) player.T = D(0);
    return true;
  },
  radiation() {
    const m = this.mass();
    if (m.lte(0)) return D(0);
    let r = m.pow(1.5).mul(20);
    if (hasUpg('singularity', 2)) r = r.mul(3);
    if (hasUpg('singularity', 6)) r = r.mul(m.pow(0.5));
    if (Layers.map.quasar) r = r.mul(Layers.map.quasar.radiationMult());
    if (typeof Cosmos !== 'undefined' && Cosmos.has('heavy')) r = r.pow(0.5);
    if (Layers.map.inflation) r = r.mul(Layers.map.inflation.speed());
    return r;
  },
  hawkingExp: () => (hasUpg('singularity', 9) ? 4 : 3),
  heatMult() {
    const hh = layerPts('singularity');
    let m = hh.add(1).pow(this.hawkingExp());
    if (hasUpg('singularity', 5)) m = m.mul(this.mass().add(1).pow(10));
    return m;
  },
  flowMult() { return this.data() ? layerPts('singularity').add(1) : D(1); },
  stardustMult() {
    if (!this.data()) return D(1);
    let m = layerPts('singularity').add(1).log10().add(1);
    if (hasUpg('singularity', 10)) m = m.mul(layerPts('singularity').add(1).pow(0.1));
    return m;
  },
};

Layers.register({
  id: 'singularity',
  chapter: 2,
  order: 3,
  name: 'Singularity',
  currency: 'Hawking Heat',
  verb: 'Collapse into a singularity',
  color: '#b388ff',
  extraData: () => ({ mass: D(0), feeds: 0, feedTimer: 0 }),
  unlocked: () => Layers.ms('collapse', 1) && player.bestT.gte('1e575'),
  req: () => D('1e584'),
  gain() {
    let g = Decimal.pow(10, player.T.log10().sub(584).div(25)).mul(layerPts('collapse').add(1).log10().add(1));
    g = g.mul(BlackHole.mass().add(1).log10().add(1));
    return g;
  },
  heatMult: () => BlackHole.heatMult(),
  neutroniumMult: () => (hasUpg('singularity', 4) ? layerPts('singularity').add(1).log10().add(1) : D(1)),
  tick(dt) {
    const r = BlackHole.radiation();
    if (r.gt(0)) Layers.addPoints('singularity', r.mul(dt));
    this.data().feedTimer += dt;
  },
  data: () => player.layers.singularity,
  effectText() {
    return `Hawking Heat multiplies heat gain by ${formatMult(BlackHole.heatMult())}, Magma flow by ${formatMult(BlackHole.flowMult())} and Stardust gain by ${formatMult(BlackHole.stardustMult())}.`;
  },
  passive: () => (Layers.ms('quasar', 5) ? 0.1 : 0),
  onResetBy(by, keep) {
    const keepMass = by.chapter > 2 ? !!keep.mass : Layers.ms('quasar', 3);
    if (!keepMass) player.layers.singularity.mass = D(0);
  },
  autoReset: () => Layers.ms('quasar', 2),
  keep: () => ({ upgrades: Layers.ms('quasar', 1) }),
  upgrades: [
    { cost: D(10), desc: 'Each feed adds twice the mass.' },
    { cost: D(50), desc: 'Hawking radiation ×3.' },
    { cost: D(200), desc: 'Unlock auto-feed: the black hole eats your Temperature every 10 seconds.' },
    {
      cost: D(1e3),
      desc: 'Hawking Heat boosts Neutronium gain.',
      effect: () => layerPts('singularity').add(1).log10().add(1),
      effectText: (e) => formatMult(e),
    },
    {
      cost: D(5e3),
      desc: 'Accretion disk: heat gain ×(mass + 1)^10.',
      effect: () => BlackHole.mass().add(1).pow(10),
      effectText: (e) => formatMult(e),
    },
    { cost: D(2e4), desc: 'Radiation is multiplied by the square root of the mass.' },
    { cost: D(1e5), desc: 'Gravity weight ×0.8.' },
    { cost: D(5e5), desc: 'Heat Loss III is weaker: power +0.05.' },
    { cost: D(2e6), desc: 'Hawking Heat heat effect exponent 3 → 4.' },
    {
      cost: D(1e7),
      desc: 'Evaporation: Hawking Heat boosts Stardust even more.',
      effect: () => layerPts('singularity').add(1).pow(0.1),
      effectText: (e) => formatMult(e),
    },
  ],
  milestones: [
    { req: 1, desc: 'Keep Neutronium upgrades on Singularity.' },
    { req: 2, desc: 'Unlock the Collapse autobuyer.' },
    { req: 3, desc: 'Start every Singularity with 100 Neutronium.' },
    { req: 5, desc: 'Gain 10% of pending Neutronium every second.' },
    { req: 25, desc: 'Each feed adds twice the mass.' },
  ],
});

Automation.register({
  id: 'auto_feed',
  name: 'Feed',
  chapter: 2,
  group: 'singularity',
  unlocked: () => hasUpg('singularity', 3),
  run: () => {
    const d = player.layers.singularity;
    if (d.feedTimer >= 10 && BlackHole.feed()) d.feedTimer = 0;
  },
});
