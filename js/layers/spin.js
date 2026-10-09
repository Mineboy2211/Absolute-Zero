// Chapter 4, layer 2: Spin Lattice -> Spin. A small Ising-style puzzle: flip spins so neighbours agree where their
// bond wants them to agree and disagree where it wants them to disagree. Some bonds always conflict (frustration).

const Lattice = {
  data() { return player.layers.spin; },
  size() { return 4 + (hasUpg('spin', 3) ? 1 : 0) + (hasUpg('spin', 7) ? 1 : 0); },
  // Bond signs for an n×n lattice: +1 wants equal spins, −1 wants opposite spins. Fixed for each size.
  bondCache: {},
  bonds(n = this.size()) {
    if (this.bondCache[n]) return this.bondCache[n];
    let seed = 1234 + n * 7919;
    const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
    const list = [];
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        const i = r * n + c;
        if (c < n - 1) list.push([i, i + 1, rnd() < 0.3 ? -1 : 1]);
        if (r < n - 1) list.push([i, i + n, rnd() < 0.3 ? -1 : 1]);
      }
    }
    this.bondCache[n] = list;
    return list;
  },
  cells() {
    const d = this.data();
    const n = this.size();
    if (!Array.isArray(d.cells) || d.cells.length !== n * n) d.cells = new Array(n * n).fill(1);
    return d.cells;
  },
  flip(i) { const c = this.cells(); if (i >= 0 && i < c.length) c[i] = -c[i]; },
  satisfied(cells = this.cells()) {
    let s = 0;
    for (const [a, b, j] of this.bonds()) if (j * cells[a] * cells[b] > 0) s++;
    return s;
  },
  total() { return this.bonds().length; },
  // Fraction of satisfied bonds, 0 to 1.
  order() { return this.data() ? this.satisfied() / this.total() : 0; },
  // Greedy relaxation: flip any spin that satisfies more bonds, until nothing improves.
  anneal() {
    const c = this.cells();
    let improved = true, passes = 0;
    while (improved && passes++ < 50) {
      improved = false;
      for (let i = 0; i < c.length; i++) {
        const before = this.satisfied(c);
        c[i] = -c[i];
        if (this.satisfied(c) > before) improved = true;
        else c[i] = -c[i];
      }
    }
  },
};

Layers.register({
  id: 'spin',
  chapter: 4,
  order: 2,
  name: 'Spin Lattice',
  currency: 'Spin',
  verb: 'Align the lattice',
  color: '#5cf2c2',
  extraData: () => ({ cells: [] }),
  unlocked: () => Layers.ms('laser', 1) && player.bestT.gte('1e68000'),
  req: () => D('1e70000'),
  gain() {
    let g = player.T.log10().sub(70000).div(5000).add(1).pow(2);
    g = g.mul(1 + 9 * Math.pow(Lattice.order(), 4));
    g = g.mul(layerPts('laser').add(1).log10().add(1));
    if (hasUpg('spin', 8)) g = g.mul(Math.pow(1 + Lattice.order(), 5));
    if (Layers.ms('spin', 10)) g = g.mul(2);
    if (Layers.map.tachyon) g = g.mul(Layers.map.tachyon.boost());
    if (typeof Achievements.inversionMult === 'function') g = g.mul(Achievements.inversionMult());
    return g;
  },
  coherenceMult: () => (player.layers.spin ? layerPts('spin').add(1).log10().add(1).pow(2) : D(1)),
  invMult: () => (player.layers.spin ? layerPts('spin').add(1).log10().add(1).pow(2) : D(1)),
  heatExp: () => (hasUpg('spin', 1) ? 1 + 0.03 * Lattice.order() : 1) * (hasUpg('spin', 10) ? 1.03 : 1),
  effectText() {
    return `Spin multiplies Coherence gain by ${formatMult(this.coherenceMult())} and Inverted Temperature gain by ${formatMult(this.invMult())}.`;
  },
  passive: () => (Layers.ms('spin', 25) ? 0.1 : Layers.ms('spin', 5) ? 0.01 : 0),
  keep: () => ({ upgrades: hasUpg('negkelvin', 101) }),
  onResetBy() { if (!hasUpg('negkelvin', 101)) player.layers.spin.cells = []; },
  autoReset: () => hasUpg('negkelvin', 102),
  upgrades: [
    { cost: D(10), desc: 'Lattice order raises the heat gain exponent (up to ×1.03).' },
    { cost: D(50), desc: 'Unlock Anneal: relax the lattice automatically (it finds a good arrangement, not always the best).' },
    { cost: D(320), desc: 'The lattice grows to 5×5.' },
    { cost: D(1600), desc: 'Spin multiplies Expansion gain.', effect: () => layerPts('spin').add(1), effectText: (e) => formatMult(e) },
    { cost: D(1e4), desc: 'Heat Loss IV starts 5% later (in orders of magnitude).' },
    { cost: D(5.2e4), desc: 'Unlock the Anneal autobuyer.' },
    { cost: D(3.2e5), desc: 'The lattice grows to 6×6.' },
    { cost: D(1.6e6), desc: 'Spin gain ×(1 + order)^5.' },
    { cost: D(1e7), desc: 'Inverted Temperature delays Heat Loss IV more: strength +0.01.' },
    { cost: D(5.2e7), desc: 'Heat gain exponent ×1.03.' },
  ],
  // Autobuyers and keeps are upgrades, never milestones.
  qol: [
    { cost: D(30), desc: 'Spin Lattice resets keep Laser upgrades.' },
    { cost: D(80), desc: 'Unlock the Laser autobuyer.' },
  ],
  milestones: [
    { req: 3, desc: 'Start every Spin Lattice reset with 100 Coherence.' },
    { req: 5, desc: 'Gain 1% of pending Spin every second.' },
    { req: 10, desc: 'Spin gain ×2.' },
    { req: 25, desc: 'Gain 10% of pending Spin every second.' },
  ],
});

Automation.register({
  id: 'auto_anneal',
  name: 'Anneal',
  chapter: 4,
  group: 'spin',
  unlocked: () => hasUpg('spin', 6),
  run: () => { if (Lattice.order() < 1) Lattice.anneal(); },
});
