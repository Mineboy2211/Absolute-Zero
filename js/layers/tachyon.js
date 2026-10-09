// Chapter 4, layer 4: Tachyon -> Tachyons. Time runs backwards: play banks time, and a Warp spends the bank to
// run the game forward instantly.

const Tachyons = {
  data() { return player.layers.tachyon; },
  warping: false,
  // Seconds banked per second played.
  rate() {
    let r = 0.25 * (1 + layerPts('tachyon').add(1).log10().toNumber() / 4);
    if (hasUpg('tachyon', 2)) r *= 2;
    if (hasUpg('tachyon', 7)) r *= 2;
    return Math.min(r, 2);
  },
  cap() { return 4 * 3600 * (hasUpg('tachyon', 4) ? 2 : 1) * (Layers.ms('tachyon', 10) ? 2 : 1); },
  // Each banked second becomes this many seconds when warped.
  efficiency() { return 1 + (hasUpg('tachyon', 5) ? 0.5 : 0) + (hasUpg('tachyon', 9) ? 0.5 : 0); },
  canWarp() { const d = this.data(); return !!d && Layers.isUnlocked('tachyon') && !this.warping && d.bank >= 60; },
  warp() {
    if (!this.canWarp()) return false;
    const d = this.data();
    const secs = d.bank * this.efficiency();
    d.bank = 0;
    this.warping = true;
    try { simulateTime(secs, 200, 60); } finally { this.warping = false; }
    d.warped += secs;
    return true;
  },
  tick(dt) {
    const d = this.data();
    if (!d || this.warping || !Layers.isUnlocked('tachyon')) return;
    d.bank = Math.min(this.cap(), d.bank + this.rate() * dt);
  },
};

Layers.register({
  id: 'tachyon',
  chapter: 4,
  order: 4,
  name: 'Tachyon',
  currency: 'Tachyons',
  verb: 'Break causality',
  color: '#ffe066',
  extraData: () => ({ bank: 0, warped: 0 }),
  unlocked: () => Layers.ms('negkelvin', 1) && player.bestT.gte('1e92000'),
  req: () => D('1e95000'),
  gain() {
    let g = player.T.log10().sub(95000).div(10000).add(1).pow(2);
    g = g.mul(layerPts('negkelvin').add(1).log10().add(1));
    if (Layers.ms('tachyon', 25)) g = g.mul(2);
    if (typeof Achievements.inversionMult === 'function') g = g.mul(Achievements.inversionMult());
    return g;
  },
  tick: (dt) => Tachyons.tick(dt),
  // Tachyons speed up Spin and Inversion gain.
  boost() { return player.layers.tachyon ? layerPts('tachyon').add(1).log10().add(1).pow(2) : D(1); },
  invMult: () => (player.layers.tachyon ? layerPts('tachyon').add(1).log10().add(1).pow(2) : D(1)),
  heatExp() {
    if (!player.layers.tachyon) return 1;
    let e = 1 + 0.01 * layerPts('tachyon').add(1).log10().toNumber();
    if (hasUpg('tachyon', 1)) e *= 1.02;
    if (hasUpg('tachyon', 10)) e *= 1.03;
    return e;
  },
  effectText() {
    return `Tachyons multiply Spin and Inversion gain by ${formatMult(this.boost())} and Inverted Temperature gain by ${formatMult(this.invMult())}.`;
  },
  passive: () => (Layers.ms('tachyon', 5) ? 0.01 : 0),
  keep: () => ({ upgrades: hasUpg('beyond', 101) }),
  autoReset: () => hasUpg('beyond', 102),
  upgrades: [
    { cost: D(10), desc: 'Heat gain exponent ×1.02.' },
    { cost: D(50), desc: 'Bank time twice as fast.' },
    { cost: D(320), desc: 'Unlock auto-Warp when the bank is full.' },
    { cost: D(1600), desc: 'The bank holds twice as much.' },
    { cost: D(1e4), desc: 'Warps are 50% more efficient.' },
    { cost: D(5.2e4), desc: 'Heat Loss IV starts 5% later (in orders of magnitude).' },
    { cost: D(3.2e5), desc: 'Bank time twice as fast again.' },
    { cost: D(1.6e6), desc: 'Tachyons multiply Absolute gain.', effect: () => layerPts('tachyon').add(1).log10().add(1), effectText: (e) => formatMult(e) },
    { cost: D(1e7), desc: 'Warps are 50% more efficient again.' },
    { cost: D(5.2e7), desc: 'Heat gain exponent ×1.03.' },
  ],
  // Autobuyers and keeps are upgrades, never milestones.
  qol: [
    { cost: D(8), desc: 'Tachyon resets keep Negative Kelvin upgrades.' },
    { cost: D(15), desc: 'Unlock the Negative Kelvin autobuyer.' },
  ],
  milestones: [
    { req: 3, desc: 'Keep Pumps and Cavities on Tachyon resets.' },
    { req: 5, desc: 'Gain 1% of pending Tachyons every second.' },
    { req: 10, desc: 'The bank holds twice as much.' },
    { req: 25, desc: 'Tachyon gain ×2.' },
  ],
});

Automation.register({
  id: 'auto_warp',
  name: 'Warp',
  chapter: 4,
  group: 'tachyon',
  unlocked: () => hasUpg('tachyon', 3),
  run: () => { const d = Tachyons.data(); if (d && d.bank >= Tachyons.cap() && Tachyons.canWarp()) Tachyons.warp(); },
});
