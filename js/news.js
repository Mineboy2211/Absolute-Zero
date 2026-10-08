// Release notes. Only major updates get an entry here; small fixes are not listed.

const GAME_VERSION = '4.0';

const News = {
  list: [
    {
      version: '4.0',
      title: 'Inversion',
      date: '2026-10-09',
      notes: [
        'Chapter 4 is here: five new layers, from Laser to Beyond.',
        'New rule, Inversion: your heat pumps a negative temperature, hotter than any positive one. It pushes Heat Loss IV further away.',
        'Laser: fire beams that let one old currency boost another.',
        'Spin Lattice: flip spins to satisfy as many bonds as you can. Some bonds always fight back.',
        'Negative Kelvin: turn Inverted Temperature into Inversions, and build Pumps and Cavities.',
        'Tachyon: bank time while you play and Warp it forward.',
        'Beyond: the final tree, priced in both temperatures. 15 new achievements.',
      ],
    },
    {
      version: '3.0',
      title: 'Cosmic',
      date: '2026-10-08',
      notes: [
        'Chapter 3 is here: five new layers, from Big Bang to Absolute.',
        'New rule, cosmic constants: before each Big Bang, choose which laws of physics to break. Every broken law makes the next universe richer.',
        'Inflation: spend Expansion to Stretch whole groups of heat multipliers.',
        'Entropy: Disorder rises on its own. Build Heat Engines to turn it into Work.',
        'Heat Death: turn the fire around and cool toward absolute zero, and below 1 K, for Void.',
        'Absolute: the final tree of the chapter, priced in currencies from every layer.',
        'Heat Loss IV can now be weakened. Every Chapter 2 layer runs on its own once Chapter 3 begins. 15 new achievements.',
      ],
    },
    {
      version: '2.0',
      title: 'Stellar',
      date: '2026-10-07',
      notes: [
        'Chapter 2 is here: five new layers, from Supernova to Planck Break.',
        'New rule, Gravity: it grows with your Temperature and pulls your heat down, until you learn to sling it.',
        'Supernova: a 20-node Stardust tree and four Stellar challenges.',
        'Collapse: compress your Embers, Magma and Plasma into permanent records.',
        'Singularity: feed your Temperature to a black hole and bathe in its Hawking radiation.',
        'Quasar: fire Jets at Heat or any layer to supercharge it.',
        'Planck Break: break the Heat Losses and climb Planck Levels.',
        'Every Chapter 1 layer now runs on its own once Chapter 2 begins. 15 new achievements.',
      ],
    },
    {
      version: '1.5',
      title: 'Ionized',
      date: '2026-10-07',
      notes: [
        'Chapter 1 is complete: two new layers, Ionize and Fusion.',
        'Ionize gives Plasma, which you split between Electrons, Ions and Photons. Respec any time.',
        'Fusion gives Nucleons, spent to synthesize the first 26 Elements, from Hydrogen to Iron.',
        'Two new challenges: Thin Air and Plasma Storm.',
        'The Chapter tab now tracks the 6 goals of Chapter 1.',
        'New News tab, nicer switches in Options.',
      ],
    },
    {
      version: '1.0',
      title: 'The First Spark',
      date: '2026-10-07',
      notes: [
        'The Hearth: Kindling, Bellows, Furnace and Draft.',
        'Degrees climb on their own; Grade and Order temper the fire.',
        'Chapter 1 layers: Ignition (Embers), Meltdown (Magma that keeps flowing) and Vaporize (Pressure).',
        'Six challenges with five tiers each.',
        'Heat Loss, achievements, offline progress, named number notation and a mobile layout.',
      ],
    },
  ],
  hasUnread() { return player.options.newsSeen !== GAME_VERSION; },
  markRead() { player.options.newsSeen = GAME_VERSION; },
};
