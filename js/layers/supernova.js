// Chapter 2, layer 1: Supernova -> Stardust. Stardust is spent on a skill tree with four branches.

const TREE_BRANCHES = ['Heat', 'Gravity', 'Memory', 'Trials'];

// Upgrade ids follow this order (1-based). `req` lists the node(s) that must be owned first.
const STARDUST_TREE = [
  // Heat
  { name: 'Stellar Wind', branch: 0, row: 1, cost: 1, desc: 'Heat gain ^1.02.' },
  { name: 'Red Giant', branch: 0, row: 2, cost: 84, req: [1], desc: 'Stardust multiplies heat gain again.', effect: () => layerPts('supernova').add(1).pow(3) },
  { name: 'Fusion Shells', branch: 0, row: 3, cost: 1.5e4, req: [2], desc: 'Heat Loss III is weaker: power +0.1.' },
  { name: 'Hypergiant', branch: 0, row: 4, cost: 2.3e6, req: [3], desc: 'Bellows power +0.25.' },
  { name: 'Core Ignition', branch: 0, row: 5, cost: 5.8e8, req: [4], desc: 'Heat gain ^1.03.' },
  // Gravity
  { name: 'Orbital Mechanics', branch: 1, row: 1, cost: 2, desc: 'Gravity weight ×0.75.' },
  { name: 'Gravity Well', branch: 1, row: 2, cost: 190, req: [6], desc: 'Gravity multiplies heat gain.', effect: () => Decimal.pow(10, Gravity.amount().pow(hasUpg('collapse', 8) ? 0.7 : 0.6)) },
  { name: 'Escape Velocity', branch: 1, row: 3, cost: 3.4e4, req: [7], desc: 'Gravity weight ×0.75 again.' },
  { name: 'Tidal Forces', branch: 1, row: 4, cost: 5.3e6, req: [8], desc: 'Gravity multiplies Stardust gain.', effect: () => Gravity.amount().add(1) },
  { name: 'Slingshot', branch: 1, row: 5, cost: 1.7e9, extra: [['vaporize', D(1e12)]], req: [9], desc: 'Gravity stops pulling and starts pushing: heat gain ^(1 + G·w/2), up to ^1.15.' },
  // Memory
  { name: 'Afterglow', branch: 2, row: 1, cost: 1, desc: 'Every Chapter 1 currency gain ×10.' },
  { name: 'Stellar Memory', branch: 2, row: 2, cost: 48, req: [11], desc: 'Chapter 2 resets keep your Grade and Order.' },
  { name: 'Remnant', branch: 2, row: 3, cost: 6500, req: [12], desc: 'Chapter 2 resets keep 1% of every Chapter 1 currency.' },
  { name: 'Stellar Nursery', branch: 2, row: 4, cost: 1e6, req: [13], desc: 'Stardust gain ×3.' },
  { name: 'Pulsar', branch: 2, row: 5, cost: 2.5e8, req: [14], desc: 'Gain 1% of pending Stardust every second.' },
  // Trials
  { name: 'Stellar Trials', branch: 3, row: 1, cost: 7, extra: [['vaporize', D(1e12)]], desc: 'Unlock Challenge 9: Dense Core.' },
  { name: 'Red Dwarf', branch: 3, row: 2, cost: 410, req: [16], desc: 'Unlock Challenge 10: Red Dwarf.' },
  { name: 'Burnout', branch: 3, row: 3, cost: 6.3e4, req: [17], desc: 'Unlock Challenge 11: Burnout.' },
  { name: 'Event Horizon', branch: 3, row: 4, cost: 1.6e7, req: [18], desc: 'Unlock Challenge 12: Event Horizon.' },
  { name: 'Trial Mastery', branch: 3, row: 5, cost: 4e9, req: [19], desc: 'Stardust ×1.25 per Stellar challenge completion.', effect: () => Decimal.pow(1.25, Challenges.list.filter((c) => c.chapter === 2).reduce((s, c) => s + chalComps(c.id), 0)) },
];

Layers.register({
  id: 'supernova',
  chapter: 2,
  order: 1,
  name: 'Supernova',
  currency: 'Stardust',
  verb: 'Go supernova',
  color: '#ffd166',
  upgradeGrid: false,
  unlocked: () => Gravity.active(),
  req: () => D('1e480'),
  gain() {
    let g = Decimal.pow(10, player.T.log10().sub(480).div(40)).mul(layerPts('fusion').add(1).log10().add(1));
    g = g.mul(this.stardustMult());
    return g;
  },
  stardustMult() {
    let m = D(1);
    if (hasUpg('supernova', 9)) m = m.mul(upgEff('supernova', 9));
    if (hasUpg('supernova', 14)) m = m.mul(3);
    if (hasUpg('supernova', 20)) m = m.mul(upgEff('supernova', 20));
    if (Layers.ms('supernova', 10)) m = m.mul(2);
    m = m.mul(Challenges.reward(10));
    if (Layers.map.collapse) m = m.mul(Layers.map.collapse.supernovaMult());
    if (typeof Compressors !== 'undefined') m = m.mul(Compressors.stardustMult());
    if (typeof BlackHole !== 'undefined') m = m.mul(BlackHole.stardustMult());
    if (typeof Planck !== 'undefined') m = m.mul(Planck.stardustMult());
    m = m.mul(Achievements.stardustMult());
    return m;
  },
  heatMult() {
    let m = layerPts('supernova').add(1).pow(2);
    if (hasUpg('supernova', 2)) m = m.mul(upgEff('supernova', 2));
    if (hasUpg('supernova', 7)) m = m.mul(upgEff('supernova', 7));
    return m;
  },
  nucleonMult: () => layerPts('supernova').add(1),
  effectText() {
    return `Stardust multiplies heat gain by ${formatMult(layerPts('supernova').add(1).pow(2))} and Nucleon gain by ${formatMult(this.nucleonMult())}.`;
  },
  passive: () => (Layers.ms('supernova', 25) || Layers.ms('collapse', 5) ? 0.1 : hasUpg('supernova', 15) ? 0.01 : 0),
  onResetBy() {
    if (Layers.ms('collapse', 3)) Layers.addPoints('supernova', D(1e4).sub(layerPts('supernova')).max(0));
  },
  autoReset: () => hasUpg('collapse', 102),
  keep: () => ({ upgrades: hasUpg('collapse', 101) }),
  upgrades: STARDUST_TREE.map((n, idx) => ({
    name: n.name,
    branch: n.branch,
    row: n.row,
    req: n.req || [],
    desc: n.desc,
    cost: D(n.cost),
    extra: n.extra,
    effect: n.effect,
    effectText: n.effect ? (e) => formatMult(e) : undefined,
    unlocked: () => (n.req || []).every((r) => hasUpg('supernova', r)),
  })),
  // Autobuyers and keeps are upgrades, never milestones.
  qol: [
    { cost: D(30), desc: 'Chapter 2 resets keep Ember and Magma upgrades.' },
    { cost: D(60), desc: 'Chapter 2 resets keep Pressure and Plasma upgrades.' },
    { cost: D(90), desc: 'Chapter 2 resets keep the first 10 Elements.' },
    { cost: D(400), desc: 'Chapter 2 resets keep every Element.' },
  ],
  milestones: [
    { req: 1, desc: 'Every Chapter 1 currency gain ×10.' },
    { req: 3, desc: 'Chapter 2 resets keep your Plasma split and Chapter 1 challenge completions, and leave you with at least Grade 5 and Order 3.' },
    { req: 5, desc: 'Chapter 2 resets keep your Magma flow.' },
    { req: 10, desc: 'Stardust gain ×2.' },
    { req: 25, desc: 'Gain 10% of pending Stardust every second.' },
  ],
});
