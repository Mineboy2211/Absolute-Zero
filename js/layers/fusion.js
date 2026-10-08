// Chapter 1, layer 5: Fusion -> Nucleons, spent to synthesize Elements (one-time upgrades, in order).

// [symbol, name, periodic row, periodic column, (unused), description, effect?]
const ELEMENT_DATA = [
  ['H', 'Hydrogen', 1, 1, 1, 'Heat gain is multiplied by your total Nucleons.', () => player.layers.fusion.total.add(1)],
  ['He', 'Helium', 1, 18, 2, 'Ember gain ^1.05.'],
  ['Li', 'Lithium', 2, 1, 4, 'Kindling cost scaling starts 100 levels later.'],
  ['Be', 'Beryllium', 2, 2, 8, 'Pressure gain ×2.'],
  ['B', 'Boron', 2, 13, 15, 'Plasma gain ×10.'],
  ['C', 'Carbon', 2, 14, 30, 'Heat Loss I is weaker: power +0.05.'],
  ['N', 'Nitrogen', 2, 15, 60, 'Magma flow ^1.1.'],
  ['O', 'Oxygen', 2, 16, 120, 'Draft power +0.05.'],
  ['F', 'Fluorine', 2, 17, 250, 'Goals of challenges 1 to 6 are lower (^0.9).'],
  ['Ne', 'Neon', 2, 18, 500, 'Gain 100% of pending Embers, Magma and Pressure every second.'],
  ['Na', 'Sodium', 3, 1, 1e3, 'Unlock Challenge 7: Thin Air.'],
  ['Mg', 'Magnesium', 3, 2, 2e3, 'Plasma gain is multiplied by the number of Elements you own.', () => D(Elements.count() + 1)],
  ['Al', 'Aluminium', 3, 13, 4e3, 'Heat Loss II is weaker: power +0.1.'],
  ['Si', 'Silicon', 3, 14, 8e3, 'Bellows power +0.1.'],
  ['P', 'Phosphorus', 3, 15, 1.6e4, 'Pressure can add up to +0.3 Draft power instead of +0.2.'],
  ['S', 'Sulfur', 3, 16, 3.2e4, 'Unlock Challenge 8: Plasma Storm.'],
  ['Cl', 'Chlorine', 3, 17, 6.4e4, 'Nucleon gain ×2.'],
  ['Ar', 'Argon', 3, 18, 1.3e5, 'Electron, Ion and Photon effects ^1.1.'],
  ['K', 'Potassium', 4, 1, 2.6e5, 'Furnace cost scaling starts 25 levels later.'],
  ['Ca', 'Calcium', 4, 2, 5.2e5, 'Heat Loss III starts 1e25× later.'],
  ['Sc', 'Scandium', 4, 3, 1e6, 'Degree requirement exponent −0.02.'],
  ['Ti', 'Titanium', 4, 4, 2e6, 'Grade and Order requirements −1 more.'],
  ['V', 'Vanadium', 4, 5, 4e6, 'Order boosts Nucleon gain.', () => player.ranks.order.add(1).pow(0.5)],
  ['Cr', 'Chromium', 4, 6, 8e6, 'Nucleon gain ×1.05 per challenge completion.', () => Decimal.pow(1.05, Challenges.totalComps())],
  ['Mn', 'Manganese', 4, 7, 1.6e7, 'Embers boost Plasma gain.', () => layerPts('ignition').add(1).log10().add(1).pow(0.5)],
  ['Fe', 'Iron', 4, 8, 3.2e7, 'Stars die when they make iron. Heat gain ^1.05 (before Heat Loss).'],
];

const Elements = {
  count() { return player.layers.fusion.upgrades.length; },
  eff(n) { return Layers.map.fusion.upgMap[n].effect(); },
};

Layers.register({
  id: 'fusion',
  chapter: 1,
  order: 5,
  name: 'Fusion',
  currency: 'Nucleons',
  verb: 'Fuse',
  color: '#5cffc8',
  upgradeGrid: false,
  unlocked: () => player.bestT.gte(1e110),
  req: () => D(1e125),
  gain() {
    let g = Decimal.pow(10, player.T.log10().sub(125).div(30)).mul(Layers.map.ionize.totalPlasma().add(1).log10().add(1).pow(1.5));
    if (hasUpg('fusion', 17)) g = g.mul(2);
    if (hasUpg('fusion', 23)) g = g.mul(Elements.eff(23));
    if (hasUpg('fusion', 24)) g = g.mul(Elements.eff(24));
    if (Layers.ms('fusion', 25)) g = g.mul(2);
    if (Layers.map.supernova) g = g.mul(Layers.map.supernova.nucleonMult());
    return g;
  },
  heatMult: () => (hasUpg('fusion', 1) ? Elements.eff(1) : D(1)),
  effectText() {
    return `Spend Nucleons to synthesize Elements, in order. You own ${Elements.count()} / ${ELEMENT_DATA.length}.`;
  },
  // Element k (0-based) costs 10^(0.35k + 0.008k²): from 1 Nucleon (H) to ~6e13 (Fe).
  upgrades: ELEMENT_DATA.map(([sym, name, row, col, , desc, effect], idx) => ({
    sym, name, row, col, desc,
    cost: Decimal.pow(10, 0.35 * idx + 0.008 * idx * idx).mul(3).round(),
    unlocked: () => idx === 0 || hasUpg('fusion', idx),
    effect,
    effectText: effect ? (e) => formatMult(e) : undefined,
  })),
  milestones: [
    { req: 1, desc: 'Keep Plasma upgrades and your Plasma split on Fusion.' },
    { req: 2, desc: 'Unlock the Ionize autobuyer.' },
    { req: 3, desc: 'Unlock the Plasma auto-split (uses your last split ratio).' },
    { req: 5, desc: 'Start every run with 10 Plasma.' },
    { req: 10, desc: 'Gain 10% of pending Plasma every second.' },
    { req: 25, desc: 'Nucleon gain ×2.' },
  ],
});
