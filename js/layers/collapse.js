// Chapter 2, layer 2: Collapse -> Neutronium. Compressors turn Chapter 1 currencies into permanent records.

const COMPRESSORS = {
  embers: { name: 'Embers', layer: 'ignition', color: '#ff7a3d' },
  magma: { name: 'Magma', layer: 'meltdown', color: '#ff4b2b' },
  plasma: { name: 'Plasma', layer: 'ionize', color: '#c77dff' },
};

const Compressors = {
  record(k) { return player.layers.collapse ? player.layers.collapse.compressed[k] : D(0); },
  // How much of the currency you have right now (Plasma counts the split pools too).
  amount(k) {
    return k === 'plasma' ? Layers.map.ionize.totalPlasma() : layerPts(COMPRESSORS[k].layer);
  },
  pending(k) { return this.amount(k).add(1).log10(); },
  canCompress(k) { return Layers.isUnlocked('collapse') && this.pending(k).gt(this.record(k)); },
  // Sacrifice all of a currency; the record keeps the best log10 ever compressed.
  compress(k) {
    if (!this.canCompress(k)) return false;
    const d = player.layers.collapse;
    d.compressed[k] = this.pending(k);
    if (k === 'plasma') {
      const ion = player.layers.ionize;
      ion.points = D(0);
      for (const p of Object.keys(ion.alloc)) ion.alloc[p] = D(0);
    } else {
      player.layers[COMPRESSORS[k].layer].points = D(0);
    }
    return true;
  },
  embersExp: () => (hasUpg('collapse', 7) ? 0.7 : hasUpg('collapse', 1) ? 0.65 : 0.6),
  recordMult: () => (hasUpg('collapse', 10) ? 1.1 : 1),
  heatMult() {
    const c = this.record('embers').mul(this.recordMult());
    return c.gt(0) ? Decimal.pow(10, c.pow(this.embersExp())) : D(1);
  },
  stardustMult() {
    const m = this.record('magma').mul(this.recordMult()).div(10).add(1);
    return hasUpg('collapse', 4) ? m.pow(2) : m;
  },
  gravityDiv() {
    const c = this.record('plasma').mul(this.recordMult()).toNumber();
    return 1 + c / (hasUpg('collapse', 3) ? 100 : 200);
  },
};

Layers.register({
  id: 'collapse',
  chapter: 2,
  order: 2,
  name: 'Collapse',
  currency: 'Neutronium',
  verb: 'Collapse',
  color: '#8ecae6',
  extraData: () => ({ compressed: { embers: D(0), magma: D(0), plasma: D(0) } }),
  unlocked: () => Layers.ms('supernova', 1) && player.bestT.gte('1e540'),
  req: () => D('1e556'),
  gain() {
    let g = Decimal.pow(10, player.T.log10().sub(556).div(25)).mul(layerPts('supernova').add(1).log10().add(1));
    if (Layers.ms('collapse', 25)) g = g.mul(2);
    if (Layers.map.singularity) g = g.mul(Layers.map.singularity.neutroniumMult());
    if (hasUpg('inflation', 7)) g = g.mul(upgEff('inflation', 7));
    return g;
  },
  heatMult: () => Compressors.heatMult(),
  supernovaMult: () => layerPts('collapse').add(1).pow(0.5),
  chapter1Mult: () => (hasUpg('collapse', 2) ? layerPts('collapse').add(1).pow(0.25) : D(1)),
  effectText() {
    return `Neutronium multiplies Stardust gain by ${formatMult(this.supernovaMult())}. Compressed Embers multiply heat gain by ${formatMult(Compressors.heatMult())}.`;
  },
  passive: () => (Layers.ms('singularity', 5) ? 0.1 : 0),
  onResetBy(by, keep) {
    // Compressor records survive Chapter 2 resets, but a Big Bang wipes them unless kept.
    if (by.chapter > 2 && !keep.records) for (const k of Object.keys(COMPRESSORS)) player.layers.collapse.compressed[k] = D(0);
    if (Layers.ms('singularity', 3)) Layers.addPoints('collapse', D(100).sub(layerPts('collapse')).max(0));
  },
  autoReset: () => Layers.ms('singularity', 2),
  keep: () => ({ upgrades: Layers.ms('singularity', 1) }),
  upgrades: [
    { cost: D(1), desc: 'Compressed Embers use ^0.65 instead of ^0.6.' },
    {
      cost: D(3),
      desc: 'Neutronium multiplies every Chapter 1 currency gain.',
      effect: () => layerPts('collapse').add(1).pow(0.25),
      effectText: (e) => formatMult(e),
    },
    { cost: D(10), desc: 'Compressed Plasma divides Gravity weight twice as fast.' },
    { cost: D(30), desc: 'Compressed Magma boosts Stardust twice as much (squared).' },
    { cost: D(100), desc: 'Heat Loss III is weaker: power +0.05.' },
    { cost: D(300), desc: 'Unlock auto-compress: a compressor fires when it would raise its record tenfold.' },
    { cost: D(1e3), desc: 'Compressed Embers use ^0.7.' },
    { cost: D(3e3), desc: 'Gravity Well uses Gravity^0.7 instead of ^0.6.' },
    { cost: D(1e4), desc: 'Neutron Star: heat gain ^1.02.' },
    { cost: D(3e4), desc: 'Every compression record counts 10% more.' },
  ],
  milestones: [
    { req: 1, desc: 'Keep the Stardust tree on Collapse.' },
    { req: 2, desc: 'Unlock the Supernova autobuyer.' },
    { req: 3, desc: 'Start every Collapse with 10 Thousand Stardust.' },
    { req: 5, desc: 'Gain 10% of pending Stardust every second.' },
    { req: 25, desc: 'Neutronium gain ×2.' },
  ],
});

Automation.register({
  id: 'auto_compress',
  name: 'Compress',
  chapter: 2,
  group: 'collapse',
  unlocked: () => hasUpg('collapse', 6),
  run: () => {
    for (const k of Object.keys(COMPRESSORS)) {
      if (Compressors.pending(k).gte(Compressors.record(k).add(1))) Compressors.compress(k);
    }
  },
});
