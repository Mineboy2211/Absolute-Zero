// Chapter 3, layer 1: Big Bang -> Universes. Before each Big Bang you arm cosmic constants:
// laws of physics you break for the next universe. Each one is a penalty that multiplies Universe gain.

// `mult` is the Universe gain multiplier while the constant is active.
const COSMIC_CONSTANTS = [
  { id: 'thin', name: 'Thin Vacuum', desc: 'Heat gain exponent ×0.95.', mult: 2 },
  { id: 'frozen', name: 'Frozen Stars', desc: 'Stardust gain ^0.5.', mult: 1.5 },
  { id: 'dim', name: 'Dim Light', desc: 'Jets recharge 5× slower and have 2 less power.', mult: 1.5 },
  { id: 'short', name: 'Short Memory', desc: 'Every Chapter 1 currency gain ^0.5.', mult: 1.5 },
  { id: 'heavy', name: 'Heavy Vacuum', desc: 'Hawking radiation ^0.5.', mult: 1.5 },
  { id: 'cold', name: 'Cold Start', desc: 'Heat Loss IV power −0.03.', mult: 2.5 },
  { id: 'false', name: 'False Vacuum', desc: 'Heat gain exponent ×0.9.', mult: 4, unlocked: () => hasUpg('bigbang', 4) },
  { id: 'decay', name: 'Fast Decay', desc: 'Disorder rises 3× faster.', mult: 2, unlocked: () => typeof Layers.map.entropy !== 'undefined' && Layers.isUnlocked('entropy') },
];

const Cosmos = {
  data() { return player.layers.bigbang; },
  // A constant is active when the current universe was created with it.
  has(id) { const d = this.data(); return !!d && d.active.includes(id); },
  armed(id) { const d = this.data(); return !!d && d.armed.includes(id); },
  isUnlocked(c) { return !c.unlocked || c.unlocked(); },
  toggle(id) {
    const d = this.data();
    if (!d) return;
    const i = d.armed.indexOf(id);
    if (i >= 0) d.armed.splice(i, 1);
    else d.armed.push(id);
  },
  // Universe gain multiplier from a list of constants (the active ones by default).
  constMult(list) {
    const ids = list || this.data().active;
    let m = D(1);
    for (const c of COSMIC_CONSTANTS) if (ids.includes(c.id)) m = m.mul(c.mult);
    if (hasUpg('bigbang', 3)) m = m.pow(1.25);
    return m;
  },
  universes() { return this.data() ? layerPts('bigbang') : D(0); },
  // Multiplier on the heat gain exponent from Universes, upgrades and constants.
  heatExp() {
    if (!this.data()) return 1;
    let e = 1 + (hasUpg('absolute', 4) ? 0.06 : hasUpg('bigbang', 9) ? 0.045 : 0.03) * this.universes().add(1).log10().toNumber();
    if (hasUpg('bigbang', 2)) e *= 1.02;
    if (hasUpg('bigbang', 8)) e *= 1.03;
    if (Layers.ms('bigbang', 2)) e *= 1.01;
    if (this.has('thin')) e *= 0.95;
    if (this.has('false')) e *= 0.9;
    return e;
  },
  chapter2Mult() {
    if (!this.data()) return D(1);
    let m = this.universes().add(1).pow(2);
    if (Layers.ms('bigbang', 1)) m = m.mul(1e10);
    return m;
  },
  // Applied to every layer's currency gain.
  gainMod(def, g) {
    if (!this.data() || player.chapters.unlocked < 3) return g;
    if (def.chapter === 1 && this.has('short')) g = g.pow(0.5);
    // Jets and Planck Shards are left out: Planck Levels turn any multiplier into an exponent.
    if (['supernova', 'collapse', 'singularity'].includes(def.id)) {
      g = g.mul(this.chapter2Mult());
      if ((def.id === 'supernova' || def.id === 'singularity') && hasUpg('bigbang', 1)) g = g.mul(this.universes().add(1).pow(2));
      if (def.id === 'supernova' && this.has('frozen')) g = g.pow(0.5);
    }
    return g;
  },
  hl4Power() { return (hasUpg('bigbang', 5) ? 0.02 : 0) - (this.has('cold') ? 0.03 : 0); },
  hl4StartMult() { return hasUpg('bigbang', 10) ? 1.1 : 1; },
  slingCap() { return hasUpg('bigbang', 6) ? 0.05 : 0; },
};

Layers.register({
  id: 'bigbang',
  chapter: 3,
  order: 1,
  name: 'Big Bang',
  currency: 'Universes',
  verb: 'Start a new universe',
  color: '#ffe08a',
  extraData: () => ({ armed: [], active: [] }),
  unlocked: () => player.chapters.unlocked >= 3,
  req: () => D('1e3300'),
  gain() {
    let g = player.T.log10().div(1000).pow(4).div(10);
    g = g.mul(Cosmos.constMult());
    if (hasUpg('bigbang', 7)) g = g.mul(upgEff('bigbang', 7));
    if (Layers.ms('bigbang', 10)) g = g.mul(2);
    if (hasUpg('inflation', 1)) g = g.mul(upgEff('inflation', 1));
    if (Layers.ms('inflation', 3)) g = g.mul(3);
    if (Layers.map.entropy) g = g.mul(Layers.map.entropy.universeMult());
    if (typeof Achievements.universeMult === 'function') g = g.mul(Achievements.universeMult());
    return g;
  },
  // The constants you armed shape the next universe.
  onReset() {
    const d = player.layers.bigbang;
    d.active = d.armed.filter((id) => COSMIC_CONSTANTS.some((c) => c.id === id && Cosmos.isUnlocked(c)));
  },
  effectText() {
    return `Universes raise the heat gain exponent to ×${format(Cosmos.heatExp(), 3)} and multiply Stardust, Neutronium and Hawking Heat gain by ${formatMult(Cosmos.chapter2Mult())}.`;
  },
  passive: () => (Layers.ms('bigbang', 25) ? 0.1 : Layers.ms('bigbang', 5) ? 0.01 : 0),
  keep: () => ({ upgrades: Layers.ms('inflation', 1) }),
  onResetBy() {
    if (hasUpg('inflation', 3)) Layers.addPoints('bigbang', D(1e3).sub(layerPts('bigbang')).max(0));
  },
  autoReset: () => Layers.ms('inflation', 2),
  upgrades: [
    { cost: D(1), desc: 'Universes multiply Stardust and Hawking Heat gain again by (Universes + 1)².' },
    { cost: D(5), desc: 'Heat gain exponent ×1.02.' },
    { cost: D(25), desc: 'Cosmic constants are stronger: their Universe multiplier ^1.25.' },
    { cost: D(100), desc: 'Unlock a new cosmic constant: False Vacuum.' },
    { cost: D(500), desc: 'Heat Loss IV is weaker: power +0.02.' },
    { cost: D(3e3), desc: 'Slingshot can push harder: its cap goes from ^1.15 to ^1.20.' },
    {
      cost: D(2e4),
      desc: 'Planck Levels boost Universe gain.',
      effect: () => Planck.level().div(10).add(1),
      effectText: (e) => formatMult(e),
    },
    { cost: D(2e5), desc: 'Heat gain exponent ×1.03.' },
    { cost: D(2e6), desc: 'Universes raise the heat gain exponent 50% more (0.03 → 0.045 per order of magnitude).' },
    { cost: D(2e7), desc: 'Heat Loss IV starts 10% later (in orders of magnitude).' },
  ],
  milestones: [
    { req: 1, desc: 'Stardust, Neutronium and Hawking Heat gain ×1e10. Chapter 3 resets keep every Chapter 1 upgrade and Element, your Magma flow, Plasma split and Chapter 1 challenge completions.' },
    { req: 2, desc: 'Heat gain exponent ×1.01. Chapter 3 resets keep the Stardust tree and Stellar challenge completions.' },
    { req: 3, desc: 'Chapter 3 resets keep Neutronium, Hawking Heat, Jet and Planck upgrades.' },
    { req: 5, desc: 'Gain 1% of pending Universes every second. Chapter 3 resets keep compressor records and the black hole mass.' },
    { req: 10, desc: 'Universe gain ×2. Chapter 3 resets keep Planck Levels.' },
    { req: 25, desc: 'Gain 10% of pending Universes every second.' },
  ],
});
