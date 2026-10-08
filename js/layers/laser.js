// Chapter 4, layer 1: Laser -> Coherence. Beams link two older currencies: the source boosts the target's gain.

const Beams = {
  data() { return player.layers.laser; },
  slots() {
    let n = 1;
    if (hasUpg('laser', 2)) n++;
    if (hasUpg('laser', 5)) n++;
    if (hasUpg('laser', 8)) n++;
    if (Layers.ms('laser', 5)) n++;
    return n;
  },
  power() { return 1 + (hasUpg('laser', 4) ? 0.5 : 0) + (hasUpg('laser', 9) ? 0.5 : 0) + (hasUpg('beyond', 3) ? 1 : 0); },
  // Layers a beam can start or end at: everything unlocked from Chapters 1 to 3.
  choices() { return Layers.list.filter((l) => l.chapter <= 3 && Layers.isUnlocked(l.id)); },
  active() {
    const d = this.data();
    return d ? d.beams.slice(0, this.slots()).filter((b) => b.from && b.to && b.from !== b.to) : [];
  },
  // Multiplier on a layer's currency gain from every beam aimed at it. Logarithmic in the source, so it cannot run away.
  mult(id) {
    if (!this.data() || player.chapters.unlocked < 4) return D(1);
    let m = D(1);
    for (const b of this.active()) {
      if (b.to !== id || !player.layers[b.from]) continue;
      m = m.mul(layerPts(b.from).add(1).log10().add(1).pow(this.power()).mul(this.coherenceBoost()));
    }
    return m;
  },
  coherenceBoost: () => (hasUpg('laser', 6) ? layerPts('laser').add(1).log10().add(1) : D(1)),
  set(i, field, value) {
    const d = this.data();
    while (d.beams.length <= i) d.beams.push({ from: '', to: '' });
    d.beams[i][field] = value;
  },
};

Layers.register({
  id: 'laser',
  chapter: 4,
  order: 1,
  name: 'Laser',
  currency: 'Coherence',
  verb: 'Fire the laser',
  color: '#ff5c8a',
  extraData: () => ({ beams: [] }),
  unlocked: () => player.chapters.unlocked >= 4,
  req: () => D('1e60000'),
  gain() {
    let g = player.T.log10().sub(60000).div(5000).add(1).pow(2);
    g = g.mul(layerPts('absolute').add(1).log10().add(1));
    if (Layers.ms('laser', 10)) g = g.mul(2);
    for (const def of Layers.list) if (def.coherenceMult) g = g.mul(def.coherenceMult());
    if (typeof Achievements.inversionMult === 'function') g = g.mul(Achievements.inversionMult());
    return g;
  },
  // Chapter 4 currencies boost each other logarithmically: power-law chains between them run away.
  invMult: () => layerPts('laser').add(1).log10().add(1).pow(2).mul(hasUpg('laser', 3) ? 10 : 1),
  universeMult: () => D(1),
  heatExp() {
    if (!player.layers.laser) return 1;
    let e = 1 + 0.01 * layerPts('laser').add(1).log10().toNumber();
    if (hasUpg('laser', 1)) e *= 1.02;
    if (hasUpg('laser', 10)) e *= 1.03;
    return e;
  },
  effectText() {
    return `Coherence multiplies Inverted Temperature gain by ${formatMult(this.invMult())} and raises the heat gain exponent ×${format(this.heatExp(), 3)}.`;
  },
  passive: () => (Layers.ms('laser', 25) ? 0.1 : Layers.ms('laser', 5) ? 0.01 : 0),
  keep: () => ({ upgrades: Layers.ms('spin', 1) }),
  autoReset: () => Layers.ms('spin', 2),
  onResetBy() {
    if (Layers.ms('spin', 3)) Layers.addPoints('laser', D(100).sub(layerPts('laser')).max(0));
  },
  upgrades: [
    { cost: D(10), desc: 'Heat gain exponent ×1.02.' },
    { cost: D(50), desc: 'A second beam.' },
    { cost: D(320), desc: 'Inverted Temperature gain ×10.' },
    { cost: D(1600), desc: 'Beam power +0.5.' },
    { cost: D(1e4), desc: 'A third beam.' },
    { cost: D(5.2e4), desc: 'Coherence focuses every beam.', effect: () => layerPts('laser').add(1).log10().add(1), effectText: (e) => formatMult(e) },
    { cost: D(3.2e5), desc: 'Heat Loss IV starts 5% later (in orders of magnitude).' },
    { cost: D(1.6e6), desc: 'A fourth beam.' },
    { cost: D(1e7), desc: 'Beam power +0.5.' },
    { cost: D(5.2e7), desc: 'Heat gain exponent ×1.03.' },
  ],
  milestones: [
    { req: 1, desc: 'Chapter 4 resets keep every upgrade of Chapters 1 to 3, the Magma flow, Plasma split, compressor records, black hole, Planck Levels and challenge completions.' },
    { req: 2, desc: 'Chapter 4 resets keep Stretch levels, Heat Engines, Work, Void and Coolers.' },
    { req: 5, desc: 'A fifth beam. Gain 1% of pending Coherence every second.' },
    { req: 10, desc: 'Coherence gain ×2.' },
    { req: 25, desc: 'Gain 10% of pending Coherence every second.' },
  ],
});
